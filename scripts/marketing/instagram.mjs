#!/usr/bin/env node
// Publish to the SarvNema Instagram account through the official Instagram API
// with Instagram Login (graph.instagram.com). No Facebook Page is needed.
//
//   node scripts/marketing/instagram.mjs check
//   node scripts/marketing/instagram.mjs reel  --video-url <https> --caption-file <path> [--cover-url <https>] [--ai-generated] [--publish]
//   node scripts/marketing/instagram.mjs image --image-url <https> --caption-file <path> [--ai-generated] [--publish]
//   node scripts/marketing/instagram.mjs refresh
//
// The token is read from INSTAGRAM_TOKEN_FILE (default ~/instagram-token.txt) and
// must stay outside the repository. Instagram downloads the media itself, so every
// video/image URL has to be a public HTTPS link; this API cannot upload local files.
// Nothing is posted without --publish.

import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const HOST = 'https://graph.instagram.com';
const VERSION = 'v27.0';
const CAPTION_LIMITS = { characters: 2200, hashtags: 30, mentions: 20 };

export function tokenFile(env = process.env) {
  return env.INSTAGRAM_TOKEN_FILE || path.join(homedir(), 'instagram-token.txt');
}

export async function readToken(file = tokenFile()) {
  let token;
  try {
    token = (await readFile(file, 'utf8')).trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(`No Instagram token file at ${file}. Save the access token there or set INSTAGRAM_TOKEN_FILE.`);
  }
  if (!token) throw new Error(`The Instagram token file is empty: ${file}`);
  return token;
}

async function parseGraphResponse(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.error) {
    const error = payload?.error ?? {};
    const detail = [error.message, error.error_user_msg].filter(Boolean).join(' — ') || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Instagram ${label} failed: ${detail}`), { code: error.code, subcode: error.error_subcode });
  }
  return payload;
}

export function createClient({ token, fetchImpl = fetch }) {
  async function call(method, resource, { query = {}, body } = {}) {
    const url = new URL(`${HOST}/${VERSION}/${resource}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    return parseGraphResponse(response, `${method} /${resource}`);
  }
  return {
    get: (resource, query) => call('GET', resource, { query }),
    post: (resource, body) => call('POST', resource, { body }),
  };
}

export async function getAccount(client) {
  const payload = await client.get('me', { fields: 'user_id,username,name,media_count,followers_count' });
  return payload.data?.[0] ?? payload;
}

export function validateCaption(caption) {
  const hashtags = caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
  const mentions = caption.match(/@[\w.]+/g)?.length ?? 0;
  if (caption.length > CAPTION_LIMITS.characters) throw new Error(`Caption has ${caption.length} characters; Instagram allows ${CAPTION_LIMITS.characters}.`);
  if (hashtags > CAPTION_LIMITS.hashtags) throw new Error(`Caption has ${hashtags} hashtags; Instagram allows ${CAPTION_LIMITS.hashtags}.`);
  if (mentions > CAPTION_LIMITS.mentions) throw new Error(`Caption has ${mentions} mentions; Instagram allows ${CAPTION_LIMITS.mentions}.`);
  return { characters: caption.length, hashtags, mentions };
}

export function buildContainer(kind, { videoUrl, imageUrl, coverUrl, caption, aiGenerated }) {
  const media = kind === 'reel'
    ? { media_type: 'REELS', video_url: videoUrl, share_to_feed: true, ...(coverUrl && { cover_url: coverUrl }) }
    : { image_url: imageUrl };
  return { ...media, caption, ...(aiGenerated && { is_ai_generated: true }) };
}

// Checks the link from this machine only; Instagram's own download can still fail.
export async function assertPublicMedia(url, fetchImpl = fetch) {
  if (!URL.canParse(url) || new URL(url).protocol !== 'https:') throw new Error(`Media must be a public https:// link, got: ${url}`);
  const response = await fetchImpl(url, { method: 'HEAD' });
  if (!response.ok) throw new Error(`Media link is not reachable (HTTP ${response.status}): ${url}`);
  return { type: response.headers.get('content-type'), bytes: Number(response.headers.get('content-length')) || null };
}

export async function publishMedia(client, igId, container, { pollMs = 20_000, timeoutMs = 300_000, sleep = delay } = {}) {
  const { id: containerId } = await client.post(`${igId}/media`, container);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { status_code: statusCode, status } = await client.get(containerId, { fields: 'status_code,status' });
    if (statusCode === 'FINISHED') break;
    if (statusCode !== 'IN_PROGRESS') throw new Error(`Instagram rejected the media (${statusCode}): ${status ?? 'no detail given'}`);
    if (Date.now() >= deadline) throw new Error(`Instagram was still processing container ${containerId} after ${timeoutMs / 1000}s; nothing was published.`);
    await sleep(pollMs);
  }
  const { id: mediaId } = await client.post(`${igId}/media_publish`, { creation_id: containerId });
  const { permalink } = await client.get(mediaId, { fields: 'permalink' });
  return { mediaId, permalink };
}

// Long-lived tokens last 60 days and can be refreshed once they are 24 hours old.
export async function refreshToken(token, fetchImpl = fetch) {
  const url = new URL(`${HOST}/refresh_access_token`);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);
  const payload = await parseGraphResponse(await fetchImpl(url), 'token refresh');
  return { token: payload.access_token, expiresInDays: Math.floor(payload.expires_in / 86_400) };
}

async function main(argv) {
  const { positionals: [command], values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'video-url': { type: 'string' },
      'image-url': { type: 'string' },
      'cover-url': { type: 'string' },
      'caption-file': { type: 'string' },
      'ai-generated': { type: 'boolean', default: false },
      publish: { type: 'boolean', default: false },
    },
  });
  const file = tokenFile();
  const token = await readToken(file);

  if (command === 'refresh') {
    const refreshed = await refreshToken(token);
    await writeFile(file, `${refreshed.token}\n`);
    console.log(`Token refreshed; valid for ${refreshed.expiresInDays} more days.`);
    return;
  }

  const client = createClient({ token });
  const account = await getAccount(client);
  console.log(`Connected to @${account.username} (${account.followers_count ?? '?'} followers, ${account.media_count ?? '?'} posts).`);
  if (command === 'check') return;
  if (command !== 'reel' && command !== 'image') throw new Error('Use one of: check, reel, image, refresh.');

  const mediaUrl = command === 'reel' ? values['video-url'] : values['image-url'];
  if (!mediaUrl || !values['caption-file']) throw new Error(`${command} needs --${command === 'reel' ? 'video' : 'image'}-url and --caption-file.`);
  const caption = (await readFile(values['caption-file'], 'utf8')).trim();
  const counts = validateCaption(caption);
  for (const url of [mediaUrl, values['cover-url']].filter(Boolean)) {
    const media = await assertPublicMedia(url);
    console.log(`Reachable: ${url} (${media.type ?? 'unknown type'}, ${media.bytes ?? '?'} bytes)`);
  }
  console.log(`Caption: ${counts.characters} characters, ${counts.hashtags} hashtags.`);

  if (!values.publish) {
    console.log('Dry run: nothing was posted. Add --publish to post.');
    return;
  }
  const container = buildContainer(command, {
    videoUrl: values['video-url'],
    imageUrl: values['image-url'],
    coverUrl: values['cover-url'],
    caption,
    aiGenerated: values['ai-generated'],
  });
  const published = await publishMedia(client, account.user_id, container);
  console.log(`Published: ${published.permalink}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
