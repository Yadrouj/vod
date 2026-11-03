import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';

const KERNEL_FLAG = '--worker-kernel-lock-held';
// Production one-off containers have different/reused PID namespaces. Kernel
// locks survive neither a process crash nor container removal, unlike PID files.
export async function runWorkerCli(lockFile, run) {
  if (process.platform !== 'linux' || process.argv.includes(KERNEL_FLAG)) return run();
  await mkdir(path.dirname(lockFile), { recursive: true });
  const child = spawn('flock', ['--nonblock', '--conflict-exit-code', '75', '--no-fork', `${lockFile}.kernel`,
    process.execPath, process.argv[1], ...process.argv.slice(2), KERNEL_FLAG], { stdio: 'inherit', windowsHide: true });
  const stop = () => child.kill('SIGTERM');
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        if (code === 75) console.error('Another worker owns the kernel lock; retry on the next trigger.');
        process.exitCode = code === 75 ? 1 : code ?? (signal ? 1 : 0);
        resolve();
      });
    });
  } finally { process.off('SIGTERM', stop); process.off('SIGINT', stop); }
}

// Single-host maintenance locks: recover only when the recorded owner is proven
// dead. Do not steal a live process, permission-denied PID or unverifiable file.
export async function acquireWorkerLock(file, { probePid = pid => process.kill(pid, 0) } = {}) {
  if (process.platform === 'linux' && process.argv.includes(KERNEL_FLAG)) return { recovered: false, release: async () => {} };
  await mkdir(path.dirname(file), { recursive: true });
  let recovered = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    let handle;
    try { handle = await open(file, 'wx'); } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (attempt > 0) return null;
      let text, owner;
      try { text = await readFile(file, 'utf8'); owner = JSON.parse(text); } catch { return null; }
      if (!Number.isSafeInteger(owner?.pid) || owner.pid <= 0) return null;
      try { probePid(owner.pid); return null; } catch (error) { if (error.code !== 'ESRCH') return null; }
      try { if (await readFile(file, 'utf8') !== text) return null; await unlink(file); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      recovered = true;
      continue;
    }
    const token = randomUUID();
    try { await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() })); await handle.sync(); }
    catch (error) { await handle.close(); await unlink(file).catch(() => {}); throw error; }
    return { recovered, async release() {
      await handle.close();
      let owner;
      try { owner = JSON.parse(await readFile(file, 'utf8')); } catch { return; }
      if (owner?.pid === process.pid && owner.token === token) await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    } };
  }
  return null;
}
