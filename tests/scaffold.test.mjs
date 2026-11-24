import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {init,validate,validateName,required} from '../src/scaffold.mjs';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'ops-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));const template=join(root,'template');await mkdir(template);for(const f of required){const p=join(template,f);await mkdir(dirname(p),{recursive:true});await writeFile(p,f.endsWith('.json')?'{}':'fixture');}return {root,template,dest:join(root,'generated'),name:'evalOps'};}
test('scaffolds and customizes project',async t=>{const f=await fixture(t);await init(f);assert.equal(JSON.parse(await readFile(join(f.dest,'.ops/project.json'),'utf8')).name,'evalOps');assert.equal(JSON.parse(await readFile(join(f.dest,'package.json'),'utf8')).name,'evalops');assert.equal((await validate(f.dest)).ok,true);});
test('existing destination is never overwritten',async t=>{const f=await fixture(t);await mkdir(f.dest);await writeFile(join(f.dest,'keep'),'untouched');await assert.rejects(init(f));assert.equal(await readFile(join(f.dest,'keep'),'utf8'),'untouched');});
test('invalid name denied',()=>assert.throws(()=>validateName('../escape')));
test('symlink denied',async t=>{const f=await fixture(t);await symlink(join(f.template,'README.md'),join(f.template,'link'));await assert.rejects(init(f),/Symlink/);});
test('secret and git metadata excluded',async t=>{const f=await fixture(t);await writeFile(join(f.template,'.env'),'SECRET');await mkdir(join(f.template,'.git'));await init(f);await assert.rejects(readFile(join(f.dest,'.env')),{code:'ENOENT'});await assert.rejects(readFile(join(f.dest,'.git')),{code:'ENOENT'});});
test('missing mandatory file reported',async t=>{const f=await fixture(t);await rm(join(f.template,'LICENSE'));assert.deepEqual((await validate(f.template)).missing,['LICENSE']);await assert.rejects(init(f),/Incomplete template/);});
test('nested destination denied',async t=>{const f=await fixture(t);await assert.rejects(init({...f,dest:join(f.template,'nested')}),/outside template/);});
