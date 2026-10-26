import * as fs from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {validateConfig,validateStoredData,createEmptyStored} from '../shared/contracts.mjs';
import {createGitHubClient} from './github.mjs';
import {resolveTarget} from './targets.mjs';
import {syncRegistrations} from './registrations.mjs';
import {collectTool} from './tools.mjs';
import {mergeObservations,retainWeeks} from './history.mjs';
import {candidateFromRepo,refreshCandidatePool,buildWeeklyReport} from './discovery.mjs';
const files=['current','history','candidates','weeks'];
export async function readStoredData(directory){
  try{await fs.access(directory);}catch(e){if(e.code!=='ENOENT')throw e;await fs.rename(directory+'.backup',directory);}
  const result={};for(const name of files)result[name]=JSON.parse(await fs.readFile(join(directory,name+'.json'),'utf8'));
  return validateStoredData(result);
}
export async function writeStoredData({directory,data,io=fs}){
  validateStoredData(data);
  const stage=join(dirname(directory),'.'+basename(directory)+'.staging-'+randomUUID()),backup=directory+'.backup';
  let moved=false;
  await io.mkdir(stage,{recursive:true});
  try{
    for(const name of files)await io.writeFile(join(stage,name+'.json'),JSON.stringify(data[name],null,2)+'\n');
    try{await io.rename(directory,backup);moved=true;}catch(e){if(e.code!=='ENOENT')throw e;}
    try{await io.rename(stage,directory);}catch(e){if(moved)await io.rename(backup,directory);moved=false;throw e;}
    if(moved)await io.rm(backup,{recursive:true,force:true});
  }finally{await io.rm(stage,{recursive:true,force:true});}
}
function toolObservations(t,now){
  const validStars=t.metadata.status==='ok',validRelease=['ok','missing'].includes(t.release.status),validActivity=['ok','missing','partial'].includes(t.activity.status);
  const base={repositoryId:t.target.repositoryId,observedAt:now,stars:validStars?t.metadata.value.stars:null,releaseId:t.release.value?.id??null,commitSha:t.activity.value?.lastCommitSha??null};
  const scoped={...base,scopePath:t.target.scopePath,valid:{stars:validStars&&t.target.scopePath==='',release:validRelease,activity:validActivity}};
  return t.target.scopePath?[scoped,{...base,scopePath:'',valid:{stars:validStars,release:validRelease,activity:false},commitSha:null}]:[scoped];
}
export async function collectAll({config,previous,client,now,weekly=false,workflowUrl=null}){
  validateConfig(config);validateStoredData(previous);
  const errors=[];let successes=0,registrations=previous.current.registrations;
  try{
    const result=await client.paginate('/repos/'+config.owner+'/'+config.repository+'/issues',{query:{state:'open',labels:'watchlist'},maxPages:10});
    if(!result.complete)throw Object.assign(Error(),{code:'issue_list_partial'});
    registrations=await syncRegistrations({issues:result.items,config,resolve:url=>resolveTarget(url,client),previous:registrations});successes++;
  }catch(e){errors.push(e.code??'issues_failed');}
  const tools=await Promise.all(registrations.filter(r=>r.validation.status==='valid').map(async registration=>{
    const t=await collectTool({registration,previous:previous.current.tools.find(t=>t.id===registration.id),client,now,commitPages:config.limits.commitPages});
    for(const name of ['metadata','release','activity'])if(t[name].status==='error')errors.push('tool_'+registration.id+'_'+name);else if(t[name].status==='partial')errors.push('tool_'+registration.id+'_'+name+'_partial');else successes++;
    return t;
  }));
  const due=weekly||!previous.current.weekly,searchNeeded=weekly||previous.candidates.length===0,found=[];
  let searchComplete=true;
  if(searchNeeded)for(const query of config.discoveryQueries){
    try{const result=await client.paginate('/search/repositories',{query:{q:query,sort:'stars',order:'desc'},maxPages:1});for(const repo of result.items)if(!repo.private)found.push(candidateFromRepo(repo,now,previous.candidates.find(c=>c.repositoryId===repo.id)));if(!result.complete)searchComplete=false;successes++;}
    catch(e){searchComplete=false;errors.push(e.code??'search_failed');}
  }
  const tracked=registrations.filter(r=>r.validation.status==='valid').map(r=>r.target.repositoryId);
  let candidates=refreshCandidatePool({previous:previous.candidates,searchResults:found,trackedRepositoryIds:tracked,config,now,reportDue:false});
  const seen=new Set(found.map(c=>c.repositoryId));
  candidates=await Promise.all(candidates.map(async candidate=>{
    if(seen.has(candidate.repositoryId))return candidate;
    try{const {data:repo}=await client.get('/repositories/'+candidate.repositoryId);if(repo.private)throw Error('private');successes++;return candidateFromRepo(repo,now,candidate);}
    catch(e){errors.push('candidate_'+candidate.repositoryId);return candidate;}
  }));
  candidates=candidates.filter(c=>!c.archived&&!c.fork);
  const incoming=tools.flatMap(t=>toolObservations(t,now));
  for(const c of candidates)if(c.lastSuccessfulAt===now)incoming.push({repositoryId:c.repositoryId,scopePath:'',observedAt:now,stars:c.stars,releaseId:null,commitSha:null,valid:{stars:true,release:false,activity:false}});
  const history=mergeObservations(previous.history,incoming,{now,days:90});
  let report=previous.current.weekly;
  if(due&&successes>0){
    report=buildWeeklyReport({candidates,observations:history,now,coverage:{searchComplete,failed:errors.length,queries:config.discoveryQueries.length}});
    candidates=refreshCandidatePool({previous:candidates,searchResults:found,trackedRepositoryIds:tracked,config,now,reportDue:true});
  }
  const current={schemaVersion:1,registrations,tools,weekly:report,run:{lastAttemptAt:now,lastSuccessfulAt:successes?now:previous.current.run.lastSuccessfulAt,lastPublishedAt:previous.current.run.lastPublishedAt??null,status:errors.length?(successes?'partial':'error'):'ok',workflowUrl,errors}};
  return validateStoredData({current,history,candidates,weeks:retainWeeks([...previous.weeks,...(report?[report]:[])],{count:52})});
}
async function main(){
  const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const mode=value('--mode','daily');if(!['daily','weekly','registration'].includes(mode))throw Error('지원하지 않는 수집 모드');
  const config=validateConfig(JSON.parse(await fs.readFile('config/app.json','utf8'))),directory=resolve(value('--data-dir','data'));
  let previous;try{previous=await readStoredData(directory);}catch(e){if(e.code==='ENOENT')previous=createEmptyStored(config);else throw e;}
  const now=new Date().toISOString(),workflowUrl=/^\d+$/.test(process.env.GITHUB_RUN_ID??'')?'https://github.com/'+config.owner+'/'+config.repository+'/actions/runs/'+process.env.GITHUB_RUN_ID:null;
  const data=await collectAll({config,previous,client:createGitHubClient({token:process.env.GH_TOKEN??process.env.GITHUB_TOKEN??'',limits:config.limits}),now,weekly:mode==='weekly',workflowUrl});
  await writeStoredData({directory,data});
  const summary='수집: '+data.current.run.status+' · 관심 '+data.current.registrations.length+'개 · 후보 '+data.candidates.length+'개 · 오류 '+data.current.run.errors.length+'개';
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
