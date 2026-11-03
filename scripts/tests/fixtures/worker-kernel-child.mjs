import { acquireWorkerLock, runWorkerCli } from '../../lib/worker-lock.mjs';
const file = process.argv[2];
const once = process.argv.includes('--once');
await runWorkerCli(file, async () => {
  const lock = await acquireWorkerLock(file);
  if (!lock) throw new Error('Kernel-owned worker incorrectly blocked by PID metadata');
  console.log(JSON.stringify({ pid: process.pid, acquired: true }));
  try { if (!once) await new Promise(resolve => setTimeout(resolve, 30000)); }
  finally { await lock.release(); }
});
