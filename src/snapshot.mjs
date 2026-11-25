// Read-only commit inventory for trusted local repositories. Not a sandbox.
import { execFileSync } from 'node:child_process';
import { realpathSync, lstatSync, openSync, fstatSync, readSync, closeSync, constants } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const safeName = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const fullSha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const MAX_REPOS = 100;
const MAX_BYTES = 1024 * 1024;
const exactKeys = (o, keys) => o !== null && typeof o === 'object' &&
  !Array.isArray(o) && Object.keys(o).length === keys.length &&
  keys.every(k => Object.hasOwn(o, k));

function git(cwd, args) {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=/dev/null', '-C', cwd, ...args], {
    encoding: 'utf8', timeout: 10000, maxBuffer: MAX_BYTES,
    env: { PATH: process.env.PATH, HOME: process.env.HOME,
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function state(root, name) {
  if (typeof name !== 'string' || !safeName.test(name)) throw Error('invalid repository name');
  const path = join(root, name);
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error(name + ': non-directory or symlink');
  const cwd = realpathSync(path);
  if (relative(root, cwd) !== name) throw Error(name + ': outside root');
  if (realpathSync(git(cwd, ['rev-parse', '--show-toplevel'])) !== cwd)
    throw Error(name + ': not a repository root');
  const sha = git(cwd, ['rev-parse', '--verify', 'HEAD^{commit}']);
  if (!fullSha.test(sha)) throw Error(name + ': invalid commit');
  if (git(cwd, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none']))
    throw Error(name + ': dirty working tree');
  if (git(cwd, ['rev-parse', '--verify', 'HEAD^{commit}']) !== sha)
    throw Error(name + ': HEAD changed during inspection');
  return { name, sha };
}

export function capture(root, names) {
  root = realpathSync(resolve(root));
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_REPOS ||
      names.some(n => typeof n !== 'string' || !safeName.test(n)) ||
      new Set(names).size !== names.length) throw Error('invalid repository list');
  return { schemaVersion: '0.1.0', repositories: [...names].sort().map(name => state(root, name)) };
}

export function verify(root, snapshot) {
  if (!exactKeys(snapshot, ['schemaVersion', 'repositories']) ||
      snapshot.schemaVersion !== '0.1.0' || !Array.isArray(snapshot.repositories) ||
      snapshot.repositories.length === 0 || snapshot.repositories.length > MAX_REPOS ||
      snapshot.repositories.some(r => !exactKeys(r, ['name', 'sha']) ||
        typeof r.name !== 'string' || !safeName.test(r.name) ||
        typeof r.sha !== 'string' || !fullSha.test(r.sha))) throw Error('invalid manifest');
  const current = capture(root, snapshot.repositories.map(r => r.name));
  const expected = [...snapshot.repositories].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (let i = 0; i < expected.length; i++) {
    if (current.repositories[i].sha !== expected[i].sha)
      throw Error(expected[i].name + ': commit mismatch');
  }
  return current;
}

export function readManifest(path) {
  // Trusted parent directories; no symlinks at final component; bounded read.
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw Error('invalid manifest file');
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const n = readSync(fd, buffer, offset, buffer.length - offset, null);
      if (n === 0) break;
      offset += n;
    }
    if (offset > MAX_BYTES) throw Error('manifest exceeds byte limit');
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, offset)));
  } finally { closeSync(fd); }
}
