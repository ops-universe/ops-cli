import {cp, lstat, readdir, readFile, writeFile, mkdir, rm, realpath} from 'node:fs/promises';
import {resolve, join, relative, isAbsolute, dirname} from 'node:path';
import {selectPalette} from './palette.mjs';
import {branding,brandHtml} from './branding.mjs';
const excluded = new Set(['.git','node_modules','dist','coverage','.DS_Store']);
const skip = name => excluded.has(name) || (name === '.env' || (name.startsWith('.env.') && name !== '.env.example'));
export const required = ['README.md','AGENTS.md','ROADMAP.md','LICENSE','package.json','.ops/project.json','.github/workflows/ci.yml'];
export function validateName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9-]{1,63}$/.test(name)) throw new Error('Invalid project name');
  return name;
}
async function inspect(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error('Symlink refused: '+path);
  if (stat.isDirectory()) {
    for (const name of await readdir(path)) {
      if (!skip(name)) await inspect(join(path,name));
    }
  } else if (!stat.isFile()) throw new Error('Unsupported file: '+path);
}
export async function validate(dir) {
  const missing=[];
  for (const file of required) {
    try { const s=await lstat(join(dir,file)); if(!s.isFile() || s.isSymbolicLink()) missing.push(file); }
    catch(e) { if(e.code==='ENOENT') missing.push(file); else throw e; }
  }
  return {ok:missing.length===0,missing};
}
export async function plan({name,template,dest}) {
  validateName(name);
  const source=await realpath(template);
  const target=resolve(dest);
  const parent=await realpath(dirname(target));
  const actualTarget=join(parent,target.split(/[\\/]/).pop());
  const rel=relative(source,actualTarget);
  if(rel==='' || (!rel.startsWith('..'+(process.platform==='win32'?'\\':'/')) && rel!=='..' && !isAbsolute(rel))) throw new Error('Destination must be outside template');
  await inspect(source);
  const check=await validate(source);
  if(!check.ok) throw new Error('Incomplete template: '+check.missing.join(', '));
  try{await lstat(actualTarget);throw new Error('Destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  const files=[];
  async function walk(dir){for(const entry of (await readdir(dir)).sort()){if(skip(entry))continue;const path=join(dir,entry);const st=await lstat(path);if(st.isDirectory())await walk(path);else files.push(relative(source,path));}}
  await walk(source);
  const website=files.includes('website-react/index.html');
  if(website)brandHtml(await readFile(join(source,'website-react/index.html'),'utf8'),branding(name));
  return {source,destination:actualTarget,name,...selectPalette(name),files,generated:website?['website-react/public/favicon.svg','website-react/public/logo.svg']:[],modified:['.ops/project.json','package.json','README.md',...files.filter(f=>['package-lock.json','website-react/index.html','website-react/package.json','website-react/package-lock.json'].includes(f))],website};
}
export async function init(options) {
  const preview=await plan(options);
  const {source,destination:actualTarget,name}=preview;
  // Exclusive reservation: never overwrite.
  await mkdir(actualTarget);
  try {
    for(const entry of await readdir(source)) if(!skip(entry)) {
      await cp(join(source,entry),join(actualTarget,entry),{recursive:true,errorOnExist:true,force:false,filter:path=>!skip(path.split(/[\\/]/).pop())});
    }
    const metaPath=join(actualTarget,'.ops/project.json');
    const meta=JSON.parse(await readFile(metaPath,'utf8'));
    await writeFile(metaPath,JSON.stringify({...meta,name,...selectPalette(name)},null,2)+'\n');
    const pkgPath=join(actualTarget,'package.json');
    const pkg=JSON.parse(await readFile(pkgPath,'utf8')); pkg.name=name.toLowerCase();
    await writeFile(pkgPath,JSON.stringify(pkg,null,2)+'\n');
    const lockPath=join(actualTarget,'package-lock.json');
    try {const lock=JSON.parse(await readFile(lockPath,'utf8'));lock.name=pkg.name;if(lock.packages?.[''])lock.packages[''].name=pkg.name;await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n');}catch(e){if(e.code!=='ENOENT')throw e;}
    await writeFile(join(actualTarget,'README.md'),'# '+name+'\n\nOps Universe project — Developer Preview. Generated from a local template. Replace this introduction with the actual business problem, architecture, quick start and evidence.\n\nRun npm ci and npm test. See AGENTS.md and ROADMAP.md.\n');
    if(preview.website){
      const web=join(actualTarget,'website-react'),brand=branding(name);
      const htmlPath=join(web,'index.html');
      await writeFile(htmlPath,brandHtml(await readFile(htmlPath,'utf8'),brand));
      await mkdir(join(web,'public'),{recursive:true});
      await writeFile(join(web,'public','favicon.svg'),brand.favicon);
      await writeFile(join(web,'public','logo.svg'),brand.logo);
      for(const filename of ['package.json','package-lock.json']){
        const path=join(web,filename);
        try{const obj=JSON.parse(await readFile(path,'utf8'));obj.name=name.toLowerCase()+'-website';if(obj.packages?.[''])obj.packages[''].name=obj.name;await writeFile(path,JSON.stringify(obj,null,2)+'\n');}catch(e){if(e.code!=='ENOENT')throw e;}
      }
    }
    return {destination:actualTarget,name,...selectPalette(name),generated:preview.generated};
  } catch(e) { await rm(actualTarget,{recursive:true,force:true}); throw e; }
}
