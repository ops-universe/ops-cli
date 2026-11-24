import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {plan,init} from '../src/scaffold.mjs';
import {audit} from '../src/audit.mjs';
const template=process.argv[2];if(!template)throw new Error('Usage: node scripts/e2e.mjs TEMPLATE');
const root=await mkdtemp(join(tmpdir(),'ops-e2e-'));const dest=join(root,'evalOps');
const run=(cwd,args,env={})=>execFileSync('npm',args,{cwd,stdio:'inherit',env:{...process.env,...env}});
try{
 const options={name:'evalOps',template:resolve(template),dest};
 const preview=await plan(options);assert.equal(preview.palette,'evalops');await assert.rejects(stat(dest),{code:'ENOENT'});
 await init(options);const result=await audit(dest);console.log(JSON.stringify(result,null,2));assert.equal(result.ok,true);
 run(dest,['ci']);run(dest,['test']);
 const web=join(dest,'website-react');run(web,['ci']);run(web,['audit','--audit-level=high']);run(web,['run','build'],{VITE_BASE_PATH:'/evalOps/'});
 const html=await readFile(join(web,'dist/index.html'),'utf8');assert.match(html,/<title>evalOps \| Ops Universe<\/title>/);assert.match(html,/\/evalOps\/assets\//);assert.match(await readFile(join(web,'dist/favicon.svg'),'utf8'),/#8dbbff/);
 console.log('End-to-end scaffold verified: evalOps, registered palette, root tests, branded website build.');
}finally{await rm(root,{recursive:true,force:true});}
