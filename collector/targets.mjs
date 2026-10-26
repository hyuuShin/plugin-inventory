export function parseGitHubUrl(input){
  if(typeof input!=='string'||input.length>2048)throw Error('GitHub 주소를 확인해 주세요');
  let url;try{url=new URL(input.trim());}catch{throw Error('GitHub 주소를 확인해 주세요');}
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.port||url.username||url.password)throw Error('공개 GitHub HTTPS 주소만 지원합니다');
  // Check the original path before URL normalization can remove traversal components.
  const raw=input.trim().replace(/^https:\/\/[^/]+/i,'').split(/[?#]/)[0];
  let rawParts;try{rawParts=raw.split('/').map(decodeURIComponent);}catch{throw Error('주소 인코딩을 확인해 주세요');}
  if(rawParts.some(p=>p==='.'||p==='..'||p.includes('\\')||p.includes('\0')))throw Error('잘못된 경로');
  const parts=url.pathname.replace(/\/+$/,'').split('/').slice(1);
  const owner=parts[0],repo=parts[1]?.replace(/\.git$/,'');
  if(!/^[A-Za-z0-9_.-]+$/.test(owner??'')||!/^[A-Za-z0-9_.-]+$/.test(repo??''))throw Error('저장소 주소가 필요합니다');
  const route=parts[2]??'';
  if(route&&!['tree','blob'].includes(route))throw Error('저장소 또는 기본 브랜치 경로를 입력해 주세요');
  return {owner,repo,route,encodedTail:parts.slice(3).join('/')};
}
export async function resolveTarget(input,client){
  const p=parseGitHubUrl(input),{data:repo}=await client.get('/repos/'+p.owner+'/'+p.repo);
  if(repo.private||!Number.isSafeInteger(repo.id))throw Error('공개 저장소만 지원합니다');
  const owner=repo.owner.login,name=repo.name,branch=repo.default_branch;
  let scopeType='repository',scopePath='';
  if(p.route){
    const tail=decodeURIComponent(p.encodedTail),prefix=branch+'/';
    if(!tail.startsWith(prefix)||tail.length<=prefix.length)throw Error('기본 브랜치의 파일 또는 폴더를 입력해 주세요');
    scopePath=tail.slice(prefix.length).replace(/\/+$/,'');
    if(scopePath.split('/').some(s=>!s||s==='.'||s==='..'||s.includes('\\')||s.includes('\0')))throw Error('잘못된 경로');
    scopeType=p.route==='blob'?'file':'directory';
  }
  const url='https://github.com/'+owner+'/'+name+(scopePath?'/'+p.route+'/'+branch.split('/').map(encodeURIComponent).join('/')+'/'+scopePath.split('/').map(encodeURIComponent).join('/'):'');
  return {repositoryId:repo.id,owner,repo:name,defaultBranch:branch,scopeType,scopePath,url};
}
