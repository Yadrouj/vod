import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const exec = promisify(execFile);
test('Linux CLI kernel lock prevents overlap and recovers after worker crash despite reused container PID metadata', { skip: process.platform !== 'linux', timeout: 20000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'editorial-kernel-lock-'));
  const file = path.join(directory, 'worker.lock');
  const fixture = path.resolve('scripts/tests/fixtures/worker-kernel-child.mjs');
  const prior = JSON.stringify({ pid: process.pid, token: 'old-container-owner' });
  await writeFile(file, prior);
  const child = spawn(process.execPath, [fixture, file], { stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise(resolve => child.once('exit', resolve));
  let workerPid;
  try {
    const first = await new Promise((resolve, reject) => {
      let text = '';
      child.once('error', reject);
      child.once('exit', code => reject(new Error(`Owner exited early: ${code}`)));
      child.stdout.on('data', chunk => { text += chunk; if (text.includes('\n')) resolve(JSON.parse(text.split('\n')[0])); });
    });
    workerPid = first.pid; assert.equal(first.acquired, true);
    await assert.rejects(exec(process.execPath, [fixture, file, '--once'], { timeout: 5000 }), error => error.code === 1 && /kernel lock/.test(error.stderr));
    process.kill(workerPid, 'SIGKILL'); workerPid = undefined;
    await exited;
    const retry = await exec(process.execPath, [fixture, file, '--once'], { timeout: 5000 });
    assert.equal(JSON.parse(retry.stdout.trim()).acquired, true);
    // Anonymous/old PID files cannot block a new one-off container on Linux.
    assert.equal(await readFile(file, 'utf8'), prior);
  } finally {
    if (workerPid) { try { process.kill(workerPid, 'SIGKILL'); } catch {} }
    child.kill('SIGTERM');
    await exited;
    await rm(directory, { recursive: true, force: true });
  }
});
