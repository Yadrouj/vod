import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { exactSubtitleTitle, subtitleEpisodeIdentity, subtitleFileLanguage, subtitleLanguage, subtitleReleaseMatches } from '../../lib/subtitle-matching';
import { selectSubtitleFile, unpackSubtitle } from '../../lib/subtitle-package';
import { findSubzoneSubtitlesUncached, parseSubtitleRows, subtitleTrackUrl } from '../../lib/subtitles';

const english = strToU8('1\n00:00:01,000 --> 00:00:04,000\nA test subtitle.\n');
const persian = strToU8('1\n00:00:01,000 --> 00:00:04,000\nاین یک زیرنویس فارسی آزمایشی برای بررسی زبان فایل است.\n');

test('only Persian and English aliases are accepted, including native regional language codes', () => {
  for (const code of ['fa', 'per', 'fas', 'fa-IR', 'Farsi/Persian', 'فارسی']) assert.equal(subtitleLanguage(code), 'fa');
  for (const code of ['en', 'eng', 'en-US', 'English', 'انگلیسی']) assert.equal(subtitleLanguage(code), 'en');
  for (const code of ['ar', 'French', 'Unknown', 'und', '']) assert.equal(subtitleLanguage(code), null);
  assert.equal(subtitleFileLanguage('Film.S01E02.fa.srt'), 'fa');
  assert.equal(subtitleFileLanguage('Film.S01E02.ru.srt'), 'other');
  for (const name of ['The.English.Patient.1996.srt', 'French.Kiss.1995.srt', 'Persian.Lessons.2020.srt']) assert.equal(subtitleFileLanguage(name), null, 'A language in a movie title is not a language tag');
  assert.equal(subtitleFileLanguage('English/Film.S01E01.srt'), 'en');
});

test('film matching requires the entire name and the correct release year, not substring similarity', () => {
  assert.equal(exactSubtitleTitle('House (1985)', 'House', { year: 1985, type: 'movie' }), true);
  for (const title of ['House (2008)', 'House of Cards (1985)', 'The House (1985)', 'House']) assert.equal(exactSubtitleTitle(title, 'House', { year: 1985, type: 'movie' }), false);
});

test('series matching keeps the correct season and excludes movies, extras and similarly named shows', () => {
  const context = { type: 'tvSeries', year: 2008, season: 1 };
  assert.equal(exactSubtitleTitle('Breaking Bad - First Season (2008)', 'Breaking Bad', context), true);
  for (const name of ['Breaking Bad - Fifth Season (2012)', 'Breaking Bad Best Moments (2013)', 'Breaking Bad: Original Minisodes - First Season (2009)', 'Breaking Bad The Movie (2017)']) assert.equal(exactSubtitleTitle(name, 'Breaking Bad', context), false);
  assert.equal(exactSubtitleTitle('Breaking Bad - Second Season (2009)', 'Breaking Bad', { ...context, season: 2 }), true, 'Later-season year is not mistaken for the first-release year');
});

test('only explicit catalog aliases expand a name; a similar title is not guessed', () => {
  assert.equal(exactSubtitleTitle('House M.D. - First Season (2004)', 'House', { type: 'series', season: 1 }), false);
  assert.equal(exactSubtitleTitle('House M.D. - First Season (2004)', 'House', { type: 'series', season: 1, aliases: ['House M.D.'] }), true);
  assert.equal(exactSubtitleTitle('House of Cards - First Season (2013)', 'House', { type: 'series', season: 1, aliases: ['House M.D.'] }), false);
});

test('episode parsing understands source filenames, Season1.E03 and 1x02, without a quality becoming an episode', () => {
  for (const name of ['Film.S01E02.1080p.mkv', 'Film.Season1.E02.srt', 'Film.1x02.srt', 'https://cdn.example/Film%20S01E02.mkv:3']) assert.deepEqual(subtitleEpisodeIdentity(name), { season: 1, episode: 2 });
  assert.deepEqual(subtitleEpisodeIdentity('Film.1080p.BluRay.srt'), { season: null, episode: null });
  assert.equal(subtitleReleaseMatches(['Film.S01E03.1080p'], { season: 1, episode: 2 }), false);
  assert.equal(subtitleReleaseMatches(['Film.S01.Complete.720p'], { season: 1, episode: 2 }), true);
});

test('season archive selects the exact episode/language, never its first or largest file', () => {
  const zip = zipSync({ 'Film.S01E01.fa.srt': persian, 'Film.S01E02.en.srt': english, 'Film.S01E02.fa.srt': persian, 'Film.S02E02.fa.srt': persian, 'Film.S01E02.ru.srt': english });
  assert.equal(unpackSubtitle(zip, 'season.zip', { language: 'fa', season: 1, episode: 2 }).fileName, 'Film.S01E02.fa.srt');
  assert.equal(unpackSubtitle(zip, 'season.zip', { language: 'en', season: 1, episode: 2 }).fileName, 'Film.S01E02.en.srt');
  assert.throws(() => unpackSubtitle(zip, 'season.zip', { language: 'fa', season: 1, episode: 8 }), /No Persian or English/);
});

test('ambiguous episode packs and mismatched language are rejected, not silently applied', () => {
  assert.throws(() => selectSubtitleFile([['a.srt', english], ['b.srt', english]], { season: 1, episode: 2 }), /does not identify/);
  assert.throws(() => selectSubtitleFile([['Film.ru.srt', english]], { language: 'en' }), /No Persian or English/);
  assert.throws(() => selectSubtitleFile([['Film.en.srt', persian]], { language: 'en' }), /not English/);
});

test('archive limits prevent oversized cumulative decompression and hidden metadata files', () => {
  const files = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`Film.${i}.srt`, english]));
  assert.throws(() => unpackSubtitle(zipSync(files), 'too-many.zip'), /too many/);
  assert.throws(() => selectSubtitleFile([['__MACOSX/Film.srt', english]]), /No Persian or English/);
});

test('track proxy URL carries language and exact episode so cache entries cannot mix episodes', () => {
  const url = new URL(subtitleTrackUrl('https://subzone.ir/subtitles/film/english/123/download', { language: 'English', season: 1, episode: 2 }), 'https://sarvnema.ir');
  assert.equal(url.searchParams.get('language'), 'en');
  assert.equal(url.searchParams.get('season'), '1'); assert.equal(url.searchParams.get('episode'), '2');
});

test('row parser removes third languages and links belonging to another title, with both quote styles', () => {
  const row = (language: string, path: string) => `<li class="item good"><span class="language">${language}</span><ul class="scrolllist"><li>Film.S01E02</li></ul><a href="${path}" class="download icon-download"></a></li>`;
  const rows = parseSubtitleRows(row('English', '/subtitles/film/english/123') + row('French', '/subtitles/film/french/999') + row('English', '/subtitles/other/english/456'), 'https://subzone.ir/subtitles/film', 'English');
  assert.equal(rows.length, 1); assert.equal(rows[0].downloadUrl, '', 'No invented /download endpoint before checking its button');
  assert.deepEqual(parseSubtitleRows(row('French', '/subtitles/film/french/1'), 'https://subzone.ir/subtitles/film', 'French'), []);
});

test('provider resolver visits only the matching season and actual published download buttons', async () => {
  const called: string[] = [];
  const root = 'https://subzone.ir';
  const pages: Record<string, string> = {
    [`${root}/subtitles/searchbytitle?query=Breaking+Bad&l=`]: ['Fifth', 'First'].map((name, i) => `<div class="title"><a href="/subtitles/breaking-bad-${name.toLowerCase()}-season">Breaking Bad - ${name} Season (${i ? 2008 : 2012})</a></div><div class="subtle count">20 subtitles</div>`).join(''),
    [`${root}/subtitles/breaking-bad-first-season`]: '<a href="https://imdb.com/title/tt0903747">IMDb</a><a href="/subtitles/breaking-bad-first-season/english">English<span>2</span></a>',
    [`${root}/subtitles/breaking-bad-first-season/english`]: [1, 2].map(episode => `<li class='item'><span class='language'>English</span><ul class='scrolllist'><li>Breaking.Bad.S01E0${episode}</li></ul><a class='download icon-download' href='/subtitles/breaking-bad-first-season/english/${episode}'></a></li>`).join(''),
    [`${root}/subtitles/breaking-bad-first-season/english/2`]: '<a id="downloadButton" href="/subtitles/breaking-bad-first-season/english/2/download">Download</a>',
  };
  const results = await findSubzoneSubtitlesUncached('Breaking Bad', 8, ['English'], { type: 'series', season: 1, episode: 2, imdbCode: 'tt0903747' }, async url => { called.push(url); assert.ok(url in pages, url); return pages[url]; });
  assert.equal(results.length, 1); assert.ok(results[0].downloadUrl.endsWith('/english/2/download'));
  assert.ok(called.every(url => !url.includes('fifth') && !url.endsWith('/english/1')));
});
