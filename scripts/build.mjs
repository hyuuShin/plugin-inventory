import {readFile,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateConfig,validateSiteData} from '../shared/contracts.mjs';
export async function buildSite({rootDir=process.cwd(),outDir=join(rootDir,'dist'),config}={}) {
  config=validateConfig(config??JSON.parse(await readFile(join(rootDir,'config/app.json'),'utf8')));
  const data=validateSiteData(JSON.parse(await readFile(join(rootDir,'data/current.json'),'utf8')));
  await rm(outDir,{recursive:true,force:true});
  await mkdir(join(outDir,'data'),{recursive:true});
  await cp(join(rootDir,'web'),outDir,{recursive:true});
  await writeFile(join(outDir,'config.json'),JSON.stringify({owner:config.owner,repository:config.repository,basePath:config.basePath,timeZone:config.timeZone,categories:config.categories},null,2)+'\n');
  await writeFile(join(outDir,'data/current.json'),JSON.stringify(data,null,2)+'\n');
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){await buildSite();console.log('정적 사이트 생성: dist/');}
