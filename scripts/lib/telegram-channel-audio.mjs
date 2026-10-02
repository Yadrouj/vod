import { createReadStream, createWriteStream, openAsBlob } from 'node:fs';
import { mkdtemp, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { openPublicMedia } from '../telegram-file-delivery.mjs';

const LIMIT = 50_000_000;
export const audioSources = event => (event.sources ?? []).filter(s => s.available !== false && /\.(mp3|m4a)(?:[?#]|$)/i.test(s.url))
  .sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

export async function prepareChannelAudio(event, { root = process.env.MELODIFY_LIBRARY_DIR, openSource = openPublicMedia, maxBytes = LIMIT } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sarvnema-channel-audio-'));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  const filename = path.join(directory, 'audio');
  const errors = [];
  for (const source of audioSources(event)) {
    try {
      const signal = AbortSignal.timeout(120_000);
      let stream;
      if (source.provider === 'melodify' && root && source.basePath) {
        const base = await realpath(root);
        if (path.basename(source.basePath) !== source.basePath || /[/\\\0]/.test(source.basePath)) throw new Error('Invalid library filename');
        const file = await realpath(path.join(base, source.basePath));
        if (path.dirname(file) !== base) throw new Error('Audio must stay in the library');
        const info = await stat(file);
        if (!info.isFile() || info.size > maxBytes) throw new Error('Audio file exceeds Telegram limit');
        stream = createReadStream(file);
      } else {
        stream = await openSource(source.url, signal);
        if (Number(stream.headers?.['content-length']) > maxBytes) { stream.destroy(); throw new Error('Audio file exceeds Telegram limit'); }
      }
      let bytes = 0;
      const limiter = new Transform({ transform(chunk, encoding, done) {
        if (!bytes && /^\s*(?:<!doctype|<html|<\?xml|\{)/i.test(chunk.toString('utf8', 0, Math.min(100, chunk.length)))) return done(new Error('Source returned a page instead of audio'));
        bytes += chunk.length;
        done(bytes > maxBytes ? new Error('Audio file exceeds Telegram limit') : null, chunk);
      } });
      await pipeline(stream, limiter, createWriteStream(filename, { flags: 'w', mode: 0o600 }), { signal });
      if (!bytes) throw new Error('Audio file is empty');
      const extension = new URL(source.url).pathname.toLowerCase().endsWith('.m4a') ? 'm4a' : 'mp3';
      return { blob: await openAsBlob(filename, { type: extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4' }), filename: `sarvnema.${extension}`, bytes, cleanup };
    } catch (error) { errors.push(error.message); }
  }
  await cleanup();
  throw new Error(`Playable audio unavailable: ${errors.join('; ') || 'no MP3/M4A source'}`);
}

export function channelMessageForm(channel, post, artwork, audio, thumbnail) {
  const body = new FormData();
  body.set('chat_id', channel);
  body.set('caption', post.caption);
  body.set('parse_mode', 'HTML');
  body.set('reply_markup', JSON.stringify(post.reply_markup));
  if (audio) {
    body.set('audio', audio.blob, audio.filename);
    body.set('title', post.title.slice(0, 100));
    if (post.artist) body.set('performer', post.artist.slice(0, 100));
    if (thumbnail) body.set('thumbnail', new Blob([new Uint8Array(thumbnail)], { type: 'image/jpeg' }), 'sarvnema.jpg');
  } else body.set('photo', new Blob([new Uint8Array(artwork)], { type: 'image/jpeg' }), 'sarvnema.jpg');
  return { method: audio ? 'sendAudio' : 'sendPhoto', body };
}
