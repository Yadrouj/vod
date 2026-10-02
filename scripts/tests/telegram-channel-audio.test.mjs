import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { prepareChannelAudio, channelMessageForm } from '../lib/telegram-channel-audio.mjs';

test('channel music uploads a native audio file with metadata and gated download buttons', async () => {
  const audio = await prepareChannelAudio({ sources: [{ url: 'https://media.test/song.mp3', quality: '320' }] }, { openSource: async () => Readable.from([Buffer.from('ID3 genuine mp3 fixture')]) });
  try {
    const message = channelMessageForm('@sarvnema', { title: 'Track', artist: 'Singer', caption: 'Caption', reply_markup: { inline_keyboard: [[{ text: 'Download', url: 'https://sarvnema.ir/download/continue?u=a' }]] } }, Buffer.from('cover'), audio);
    assert.equal(message.method, 'sendAudio');
    assert.equal(message.body.get('title'), 'Track');
    assert.equal(message.body.get('performer'), 'Singer');
    assert.equal(message.body.get('audio').name, 'sarvnema.mp3');
    assert.match(await message.body.get('audio').text(), /ID3/);
    assert.match(message.body.get('reply_markup'), /download\/continue/);
  } finally { await audio.cleanup(); }
});

test('failed quality falls back to another source and HTML/oversize streams never get sent', async () => {
  const event = { sources: [{ url: 'https://media.test/320.mp3', quality: '320' }, { url: 'https://media.test/128.mp3', quality: '128' }] };
  const audio = await prepareChannelAudio(event, { openSource: async url => Readable.from([Buffer.from(url.includes('320') ? '<html>blocked</html>' : 'ID3 audio')]) });
  await audio.cleanup();
  await assert.rejects(prepareChannelAudio(event, { maxBytes: 2, openSource: async () => Readable.from([Buffer.from('ID3 oversized')]) }), /limit/);
});
