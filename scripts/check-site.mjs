import {readFile,readdir,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSiteData} from '../shared/contracts.mjs';
export async function checkSite(directory=resolve('dist')) {
  const html=await readFile(join(directory,'index.html'),'utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if(!url.startsWith('./')) throw new Error('정적 URL은 상대 경로여야 합니다: '+url);
    await stat(join(directory,url));
  }
  const scan=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory()) await scan(p);else if(/\.(json|html|mjs|css)$/.test(entry.name)){const content=await readFile(p,'utf8');if(/(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|BEGIN .*PRIVATE KEY)/.test(content)) throw new Error('비밀정보가 포함되어 있습니다');}}};
  await scan(directory);validateSiteData(JSON.parse(await readFile(join(directory,'data/current.json'),'utf8')));
  return true;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){await checkSite();console.log('정적 URL·자료·비밀정보 검사 통과');}
