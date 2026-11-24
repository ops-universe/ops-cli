import {lstat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {validate,validateName} from './scaffold.mjs';
import {selectPalette} from './palette.mjs';
export async function audit(dir){
 const checks=[];
 async function check(id,fn){try{const result=await fn();checks.push({id,status:result===true?'verified':'blocked',detail:result===true?'Passed':String(result)});}catch(e){checks.push({id,status:'blocked',detail:e.message});}}
 async function file(path){let current=dir;for(const segment of path.split('/')){current=join(current,segment);const s=await lstat(current);if(s.isSymbolicLink())throw new Error('Symlink refused: '+path);}if(!(await lstat(current)).isFile())throw new Error('Not a regular file: '+path);return readFile(current,'utf8');}
 const json=async path=>JSON.parse(await file(path));
 await check('structure',async()=>{const v=await validate(dir);return v.ok||v.missing.join(', ');});
 await check('community-files',async()=>{for(const p of ['CONTRIBUTING.md','SECURITY.md','CODE_OF_CONDUCT.md','SUPPORT.md','CHANGELOG.md'])if(!(await file(p)).trim())return p+' empty';return true;});
 await check('project-identity',async()=>{const m=await json('.ops/project.json');validateName(m.name);const p=selectPalette(m.name);return (m.ecosystem==='ops-universe'&&m.schemaVersion===1&&m.palette===p.palette&&p.paletteStatus==='registered'&&m.paletteStatus==='registered')||'Project metadata or palette registration incomplete';});
 await check('package-lock',async()=>{const p=await json('package.json'),l=await json('package-lock.json');return (p.name===l.name&&p.name===l.packages?.['']?.name)||'Root package names differ';});
 await check('website-branding',async()=>{const m=await json('.ops/project.json'),p=await json('website-react/package.json'),h=await file('website-react/index.html');await file('website-react/public/favicon.svg');await file('website-react/public/logo.svg');return (p.name===m.name.toLowerCase()+'-website'&&h.includes('<title>'+m.name+' | Ops Universe</title>')&&h.includes('favicon.svg')&&h.includes('og:title'))||'Website metadata mismatch';});
 await check('website-lockfile',async()=>{const p=await json('website-react/package.json'),l=await json('website-react/package-lock.json');return (p.name===l.name&&p.name===l.packages?.['']?.name)||'Website package names differ';});
 await check('pinned-shared-ui',async()=>{const p=await json('website-react/package.json');return /^git\+https:\/\/github\.com\/ops-universe\/ops-ui\.git#[0-9a-f]{40}$/.test(p.dependencies?.['@ops-universe/ui']||'')||'Shared UI must pin an immutable commit';});
 return {ok:checks.every(c=>c.status==='verified'),checks,scope:'Scaffolding baseline only; not release certification'};
}
