import {cp, lstat, readdir, readFile, writeFile, mkdir, rm, realpath} from 'node:fs/promises';
import {resolve, join, relative, isAbsolute, dirname} from 'node:path';
import {selectPalette} from './palette.mjs';
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
export async function init({name,template,dest}) {
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
  // mkdir without recursive is an exclusive destination reservation; never overwrite.
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
    return {destination:actualTarget,name,...selectPalette(name)};
  } catch(e) { await rm(actualTarget,{recursive:true,force:true}); throw e; }
}
