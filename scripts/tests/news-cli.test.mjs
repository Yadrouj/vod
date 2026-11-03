import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const exec = promisify(execFile);
test('Linux news CLI preserves default output directory across kernel-lock re-exec and publishes exactly ten fixture headlines', { skip: process.platform !== 'linux' }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'editorial-news-cli-'));
  try {
    const hook = pathToFileURL(path.resolve('scripts/tests/fixtures/news-cli-fetch.mjs')).href;
    const options = { timeout: 10000, env: { ...process.env, VOD_DATA_DIR: directory, NODE_OPTIONS: `--import=${hook}` } };
    await exec(process.execPath, [path.resolve('scripts/scrape-vod-news.mjs')], options);
    const snapshot = JSON.parse(await readFile(path.join(directory, 'vod-news.json'), 'utf8'));
    assert.equal(snapshot.daily.count, 10); assert.equal(snapshot.daily.state, 'complete');
    assert.equal(snapshot.items.length, 10);
    await exec(process.execPath, [path.resolve('scripts/scrape-vod-news.mjs')], options);
    const retry = JSON.parse(await readFile(path.join(directory, 'vod-news.json'), 'utf8'));
    assert.deepEqual(retry.items, snapshot.items); assert.equal(retry.history.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
