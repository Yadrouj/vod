import { readFile } from 'node:fs/promises';
try {
  const status = JSON.parse(await readFile(process.argv[2], 'utf8'));
  if (!Number.isFinite(Date.parse(status.checkedAt)) || Date.now() - Date.parse(status.checkedAt) > 20 * 60_000) process.exitCode = 1;
} catch { process.exitCode = 1; }
