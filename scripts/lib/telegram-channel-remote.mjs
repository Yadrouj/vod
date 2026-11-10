import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import { writeJsonAtomic } from '../atomic-json.mjs';

const compress = promisify(gzip);
const digest = text => createHash('sha256').update(text).digest('hex');
const readOptional = async file => {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

/**
 * Keeps channel data on the site host while the publisher runs elsewhere.
 *
 * A post is public the moment Telegram accepts it, so losing the "sent" record
 * would mean posting it twice. State is therefore written to a local journal
 * first. The journal outranks the site until an upload succeeds, and a failed
 * upload never fails the post. Every read failure throws, which skips the cycle
 * rather than treating an outage as an empty catalogue or a first run.
 */
export function createRemoteChannelStore({ api, token, directory, fetchImpl = fetch, retryDelayMs = 2000, log = console.error }) {
  const cacheDirectory = path.join(directory, 'data-cache');
  const journal = path.join(directory, 'state.journal.json');
  let lastUploaded = null;
  // This process is the only writer, so after the first load its own copy is
  // current. Downloading the whole document every cycle cost ~27 GB a day.
  let current = null;
  const url = suffix => new URL(`/api/bot/channel/${suffix}`, api);
  const request = (suffix, init = {}, timeout = 30000) => fetchImpl(url(suffix), {
    ...init,
    headers: { 'x-bot-token': token, ...init.headers },
    signal: AbortSignal.timeout(timeout),
  });

  async function upload(document, text) {
    const response = await request(`state?document=${document}`, {
      method: 'PUT',
      body: await compress(text),
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
    }, 60000);
    if (!response.ok) throw new Error(`Channel ${document} upload returned ${response.status}`);
    await response.arrayBuffer();
  }

  async function uploadState(text) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await upload('state', text);
        lastUploaded = digest(text);
        await rm(journal, { force: true });
        return true;
      } catch (error) {
        if (attempt >= 3) { log(`Channel state kept in local journal: ${error.message}`); return false; }
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }

  return {
    async readData(name) {
      await mkdir(cacheDirectory, { recursive: true });
      const body = path.join(cacheDirectory, `${name}.json`);
      const tagFile = path.join(cacheDirectory, `${name}.etag`);
      const [cached, tag] = await Promise.all([readOptional(body), readOptional(tagFile)]);
      const response = await request(`data/${name}`, { headers: cached !== null && tag ? { 'If-None-Match': tag } : {} }, 300000);
      if (response.status === 304 && cached !== null) return JSON.parse(cached);
      if (!response.ok) throw new Error(`Channel data ${name} returned ${response.status}`);
      const text = await response.text();
      const parsed = JSON.parse(text);
      await writeJsonAtomic(body, parsed);
      const nextTag = response.headers.get('etag');
      if (nextTag) await writeFile(tagFile, nextTag);
      else await rm(tagFile, { force: true });
      return parsed;
    },

    async loadState() {
      const pending = await readOptional(journal);
      if (pending !== null) {
        const state = JSON.parse(pending);
        await uploadState(pending);
        return state;
      }
      if (current !== null) return JSON.parse(current);
      const response = await request('state?document=state');
      if (!response.ok) throw new Error(`Channel state returned ${response.status}`);
      const { document } = JSON.parse(await response.text());
      if (document) { current = JSON.stringify(document); lastUploaded = digest(current); }
      return document ?? null;
    },

    async saveState(state) {
      const text = JSON.stringify(state);
      current = text;
      if (digest(text) === lastUploaded) return;
      await writeJsonAtomic(journal, state);
      await uploadState(text);
    },

    async saveStatus(status) {
      try { await upload('status', JSON.stringify(status)); }
      catch (error) { log(`Channel status not uploaded: ${error.message}`); }
    },
  };
}
