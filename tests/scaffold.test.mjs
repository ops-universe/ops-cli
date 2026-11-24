import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {init,validate,validateName,required,plan} from '../src/scaffold.mjs';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'ops-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));const template=join(root,'template');await mkdir(template);for(const f of required){const p=join(template,f);await mkdir(dirname(p),{recursive:true});await writeFile(p,f.endsWith('.json')?'{}':'fixture');}return {root,template,dest:join(root,'generated'),name:'evalOps'};}
test('scaffolds and customizes project',async t=>{const f=await fixture(t);await init(f);assert.equal(JSON.parse(await readFile(join(f.dest,'.ops/project.json'),'utf8')).name,'evalOps');assert.equal(JSON.parse(await readFile(join(f.dest,'package.json'),'utf8')).name,'evalops');assert.equal((await validate(f.dest)).ok,true);});
test('existing destination is never overwritten',async t=>{const f=await fixture(t);await mkdir(f.dest);await writeFile(join(f.dest,'keep'),'untouched');await assert.rejects(init(f));assert.equal(await readFile(join(f.dest,'keep'),'utf8'),'untouched');});
test('invalid name denied',()=>assert.throws(()=>validateName('../escape')));
test('symlink denied',async t=>{const f=await fixture(t);await symlink(join(f.template,'README.md'),join(f.template,'link'));await assert.rejects(init(f),/Symlink/);});
test('secret and git metadata excluded',async t=>{const f=await fixture(t);await writeFile(join(f.template,'.env'),'SECRET');await mkdir(join(f.template,'.git'));await init(f);await assert.rejects(readFile(join(f.dest,'.env')),{code:'ENOENT'});await assert.rejects(readFile(join(f.dest,'.git')),{code:'ENOENT'});});
test('missing mandatory file reported',async t=>{const f=await fixture(t);await rm(join(f.template,'LICENSE'));assert.deepEqual((await validate(f.template)).missing,['LICENSE']);await assert.rejects(init(f),/Incomplete template/);});
test('nested destination denied',async t=>{const f=await fixture(t);await assert.rejects(init({...f,dest:join(f.template,'nested')}),/outside template/);});

test('registered palette selected from project name',async t=>{const f=await fixture(t);const out=await init(f);assert.equal(out.palette,'evalops');assert.equal(out.paletteStatus,'registered');const m=JSON.parse(await readFile(join(f.dest,'.ops/project.json'),'utf8'));assert.equal(m.palette,'evalops');});
test('unregistered project requires unique palette registration',async t=>{const f=await fixture(t);const out=await init({...f,name:'newOps'});assert.equal(out.palette,'newops');assert.equal(out.paletteStatus,'pending-registration');});

test('dry run lists files without creating destination',async t=>{const f=await fixture(t);const p=await plan(f);assert.ok(p.files.includes('README.md'));assert.equal(p.palette,'evalops');await assert.rejects(readFile(f.dest),{code:'ENOENT'});});
test('website branding creates project assets and metadata',async t=>{const f=await fixture(t);const web=join(f.template,'website-react');await mkdir(web);await writeFile(join(web,'index.html'),'<!doctype html><html><head><title>Starter</title><meta name="description" content="Starter"></head></html>');await writeFile(join(web,'package.json'),'{}');await init(f);const html=await readFile(join(f.dest,'website-react/index.html'),'utf8');assert.match(html,/<title>evalOps \| Ops Universe<\/title>/);assert.match(html,/favicon\.svg/);assert.match(await readFile(join(f.dest,'website-react/public/favicon.svg'),'utf8'),/#8dbbff/);assert.match(await readFile(join(f.dest,'website-react/public/logo.svg'),'utf8'),/evalOps/);assert.equal(JSON.parse(await readFile(join(f.dest,'website-react/package.json'),'utf8')).name,'evalops-website');});
test('dry run refuses existing destination',async t=>{const f=await fixture(t);await mkdir(f.dest);await assert.rejects(plan(f),/already exists/);});
