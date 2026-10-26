import {KINDS} from '../shared/contracts.mjs';
export function parseRegistrationIssue(issue,config){
  const fields=new Map();const body=String(issue.body??'');
  if(body.length>12000)return {draft:null,error:'입력 내용이 너무 깁니다'};
  const sections=body.split(/^### /m).slice(1);
  for(const section of sections){const [heading,...rest]=section.split('\n');if(fields.has(heading.trim()))return {draft:null,error:'입력 항목이 중복되었습니다'};const text=rest.join('\n').trim();fields.set(heading.trim(),text==='_No response_'?'':text);}
  const sourceUrl=fields.get('GitHub 주소')??'',name=fields.get('표시 이름')??'',kind=fields.get('유형')??'',category=fields.get('용도 분류')??'',memo=fields.get('내 사용법 메모')??'';
  const draft={id:String(issue.number),issueNumber:issue.number,issueUrl:'https://github.com/'+config.owner+'/'+config.repository+'/issues/'+issue.number,sourceUrl,name,kind,category,memo};
  if(!sourceUrl||sourceUrl.length>2048||name.length>120||memo.length>4000)return {draft,error:'GitHub 주소와 입력 길이를 확인해 주세요'};
  if(!KINDS.includes(kind)||!config.categories.includes(category))return {draft,error:'유형과 용도 분류를 확인해 주세요'};
  return {draft,error:null};
}
export async function syncRegistrations({issues,config,resolve,previous=[]}){
  const eligible=issues.filter(i=>i.state==='open'&&!i.pull_request&&i.user?.login?.toLowerCase()===config.owner.toLowerCase()&&i.labels?.some(l=>(typeof l==='string'?l:l.name)==='watchlist')).sort((a,b)=>a.number-b.number);
  const rows=[],seen=new Set();
  for(const [index,issue] of eligible.entries()){
    const parsed=parseRegistrationIssue(issue,config);
    const row={id:String(issue.number),issueNumber:issue.number,issueUrl:'https://github.com/'+config.owner+'/'+config.repository+'/issues/'+issue.number,name:'등록 #'+issue.number,memo:'',kind:'Skill',category:'기타',sourceUrl:'',...parsed.draft,target:null,validation:{status:'invalid',message:parsed.error??''}};
    if(index>=config.limits.registrations){row.validation={status:'over-limit',message:'열린 등록 '+config.limits.registrations+'개 한도를 초과했습니다'};rows.push(row);continue;}
    if(!parsed.error){
      try{
        row.target=await resolve(row.sourceUrl);
        const key=row.target.repositoryId+':'+row.target.scopePath;
        row.validation=seen.has(key)?{status:'duplicate',message:'같은 대상을 등록한 더 작은 Issue 번호가 있습니다'}:{status:'valid',message:''};
        seen.add(key);
      }catch(error){
        const old=previous.find(p=>p.id===row.id&&p.sourceUrl===row.sourceUrl&&p.target);
        if(old&&error.status!==404){row.target=old.target;row.validation={status:'valid',message:'주소 조회 실패: 직전 추적 범위를 유지합니다'};}
        else row.validation.message=error.message;
      }
    }
    rows.push(row);
  }
  return rows;
}
