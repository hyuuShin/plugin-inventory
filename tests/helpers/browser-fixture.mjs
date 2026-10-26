import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fixtureIssue,fixtureTarget} from './fixtures.mjs';
const out=resolve('.superpowers/sdd/2026-10-26-plugin-inventory/qa-site');
await mkdir(out,{recursive:true});await cp('dist',out,{recursive:true});
const now=new Date().toISOString(),good=value=>({value,status:'ok',attemptedAt:now,succeededAt:now,errorCode:null});
const registrations=[],tools=[];
for(let i=1;i<=25;i++){
  const target=fixtureTarget({repositoryId:i,repo:'qa-tool-'+i,url:'https://github.com/example/qa-tool-'+i,...(i===2?{scopeType:'file',scopePath:'skills/한글/SKILL.md'}:{})});
  registrations.push({id:String(i),issueNumber:i,issueUrl:fixtureIssue({number:i}).html_url.replace('/1','/'+i),name:i===1?'검증 도구 '+('long-name-'.repeat(9)):'검증 도구 '+String(i).padStart(2,'0'),memo:i===1?'<img src=x onerror="window.payloadExecuted=true"> 한글 메모':'사용법 검증 메모',kind:i%2?'Skill':'MCP',category:i%2?'개발':'문서',target,validation:{status:'valid',message:''}});
  tools.push({id:String(i),target,metadata:good({repositoryId:i,fullName:'example/qa-tool-'+i,description:'브라우저 확인을 위한 검증 자료입니다.',stars:100+i,archived:i===4,defaultBranch:'main',url:target.url}),release:i===3?{...good(null),status:'missing'}:good({id:i,tag:'v1.'+i,publishedAt:now,url:target.url+'/releases',scope:'repository'}),activity:good({scopeType:target.scopeType,scopePath:target.scopePath,lastCommitSha:'abc',lastCommitDate:now,lastCommitUrl:target.url+'/commits',pathExists:i!==2,bins:Array.from({length:12},(_,n)=>({start:now,count:n%4})),complete:true}),changes:{baselineAvailable:false,releaseChanged:false,commitChanged:false}});
}
tools[4].activity.status='error';tools[4].activity.errorCode='http_503';
const candidate={repositoryId:900,fullName:'example/qa-discovery',url:'https://github.com/example/qa-discovery',description:'Original description for browser QA.',topics:['mcp-server'],stars:125,pushedAt:now,archived:false,fork:false,discoveredAt:now,lastSuccessfulAt:now};
const weekly={weekId:now.slice(0,10),publishedAt:now,status:'partial',growth:[{...candidate,baselineAt:new Date(Date.parse(now)-7*86400000).toISOString(),observedAt:now,baselineStars:100,delta:25}],newcomers:[{...candidate,repositoryId:901,fullName:'example/qa-newcomer',delta:null}],coverage:{searchComplete:false}};
const current={schemaVersion:1,registrations,tools,weekly,run:{lastAttemptAt:now,lastSuccessfulAt:now,lastPublishedAt:null,status:'partial',workflowUrl:null}};
await writeFile(join(out,'data/current.json'),JSON.stringify(current));
let html=await readFile(join(out,'index.html'),'utf8');html=html.replace('<body>','<body><aside style="padding:8px 16px;background:#fff;font:13px sans-serif">검증용 임시 자료 · 실제 등록 목록이 아닙니다.</aside>');await writeFile(join(out,'index.html'),html);
console.log('검증 사이트: '+out);
