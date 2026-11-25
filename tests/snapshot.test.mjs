import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capture, verify, readManifest } from '../src/snapshot.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ops-snapshot-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (name, ...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null',
    '-C', join(root, name), ...args], { stdio: 'ignore' });
  for (const name of ['alpha', 'beta']) {
    mkdirSync(join(root, name));
    git(name, 'init', '-q');
    git(name, 'config', 'user.email', 'fixture@example.invalid');
    git(name, 'config', 'user.name', 'Fixture');
    git(name, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(root, name, 'data.txt'), 'synthetic');
    git(name, 'add', 'data.txt');
    git(name, 'commit', '-qm', 'fixture');
  }
  return { root, git };
}

test('deterministic capture and exact verification', t => {
  const {root} = fixture(t);
  const snapshot = capture(root, ['beta', 'alpha']);
  assert.deepEqual(snapshot.repositories.map(r => r.name), ['alpha', 'beta']);
  assert.deepEqual(verify(root, snapshot), snapshot);
});
test('rejects modified and untracked files', t => {
  const {root} = fixture(t);
  const snapshot = capture(root, ['alpha']);
  writeFileSync(join(root, 'alpha', 'data.txt'), 'modified');
  assert.throws(() => verify(root, snapshot), /dirty/);
  writeFileSync(join(root, 'beta', 'new.txt'), 'untracked');
  assert.throws(() => capture(root, ['beta']), /dirty/);
});
test('rejects changed commit', t => {
  const {root, git} = fixture(t);
  const snapshot = capture(root, ['alpha']);
  git('alpha', 'commit', '--allow-empty', '-qm', 'new');
  assert.throws(() => verify(root, snapshot), /commit mismatch/);
});
test('rejects invalid paths, duplicates and symlinks', t => {
  const {root} = fixture(t);
  assert.throws(() => capture(root, ['../alpha']), /invalid/);
  assert.throws(() => capture(root, ['alpha', 'alpha']), /invalid/);
  symlinkSync(join(root, 'alpha'), join(root, 'alias'));
  assert.throws(() => capture(root, ['alias']), /symlink/);
});
test('rejects malformed or extra manifest fields', t => {
  const {root} = fixture(t);
  const snapshot = capture(root, ['alpha']);
  assert.throws(() => verify(root, {...snapshot, extra: true}), /invalid manifest/);
  assert.throws(() => verify(root, {...snapshot, repositories: [{name:'alpha',sha:'bad'}]}), /invalid manifest/);
  assert.throws(() => verify(root, {...snapshot, repositories: []}), /invalid manifest/);
  assert.throws(() => verify(root, {...snapshot, repositories: [...snapshot.repositories, ...snapshot.repositories]}), /invalid/);
});
test('bounded regular manifest file only', t => {
  const {root} = fixture(t);
  const file = join(root, 'snapshot.json');
  const snapshot = capture(root, ['alpha']);
  writeFileSync(file, JSON.stringify(snapshot));
  assert.deepEqual(readManifest(file), snapshot);
  symlinkSync(file, join(root, 'link'));
  assert.throws(() => readManifest(join(root, 'link')));
  assert.throws(() => readManifest(root), /invalid manifest file/);
  writeFileSync(file, Buffer.alloc(1024 * 1024 + 1));
  assert.throws(() => readManifest(file), /invalid manifest file/);
  writeFileSync(file, Buffer.from([0xff]));
  assert.throws(() => readManifest(file));
});
test('CLI create and verify round trip and nonzero failure', t => {
  const {root} = fixture(t);
  const cli = new URL('../src/cli.mjs', import.meta.url);
  const run = (...args) => execFileSync(process.execPath, [decodeURIComponent(cli.pathname), ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const manifest = run('snapshot', 'create', root, 'beta', 'alpha');
  const file = join(root, 'snapshot.json');
  writeFileSync(file, manifest);
  assert.deepEqual(JSON.parse(run('snapshot','verify',root,file)), JSON.parse(manifest));
  writeFileSync(join(root,'alpha','data.txt'),'modified');
  assert.throws(() => run('snapshot','verify',root,file), /dirty/);
});
