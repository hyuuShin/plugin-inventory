export function safeGitHubUrl(input){
  try{const u=new URL(input);return u.protocol==='https:'&&u.hostname==='github.com'&&!u.username&&!u.password&&!u.port&&u.href.length<=2048?u.href:null;}catch{return null;}
}
export const issueUrl=(config,number)=>'https://github.com/'+config.owner+'/'+config.repository+'/issues/'+number;
export const workflowUrl=config=>'https://github.com/'+config.owner+'/'+config.repository+'/actions/workflows/update-and-deploy.yml';
export function issueFormUrl({config,targetUrl='',name='',kind='',category='',memo=''}){
  const url=new URL('https://github.com/'+config.owner+'/'+config.repository+'/issues/new');
  url.searchParams.set('template','track-tool.yml');
  const source=safeGitHubUrl(targetUrl);if(source)url.searchParams.set('github-url',source);
  if(name){url.searchParams.set('title','[관심 도구] '+name.slice(0,120));url.searchParams.set('display-name',name.slice(0,120));}
  if(['Skill','MCP','Plugin'].includes(kind))url.searchParams.set('kind',kind);
  if(config.categories.includes(category))url.searchParams.set('category',category);
  if(memo&&memo.length<=500)url.searchParams.set('usage-memo',memo);
  if(url.href.length>7500)for(const key of ['usage-memo','display-name','title','category','kind'])url.searchParams.delete(key);
  if(url.href.length>7500)url.searchParams.delete('github-url');
  return url.href;
}
