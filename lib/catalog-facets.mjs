/** Shared by the index builders, website and bot. Never mutate source metadata. */
/** @typedef {'genre' | 'country' | 'language'} FacetKind */
const records = { genre: new Map(), country: new Map(), language: new Map() };
const aliases = { genre: new Map(), country: new Map(), language: new Map() };

function key(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670\u200c\u200d\u200e\u200f]/g, '').replace(/[’‘]/g, "'").replace(/[\s_-]+/g, ' ').trim();
}

function add(kind, value, fa, names = []) {
  records[kind].set(value, { value, fa });
  for (const name of [value, fa, ...names]) aliases[kind].set(key(name), value);
}

for (const [en, fa, ...names] of [
  ['Action', 'اکشن', 'حادثه ای'], ['Adventure', 'ماجراجویی'], ['Animation', 'انیمیشن', 'انیمیشن و کارتون', 'کارتون', 'پویانمایی'],
  ['Anime', 'انیمه'], ['Biography', 'زندگینامه', 'بیوگرافی', 'زندگی نامه'], ['Comedy', 'کمدی', 'طنز'],
  ['Crime', 'جنایی'], ['Documentary', 'مستند', 'مستند سریالی'], ['Drama', 'درام', 'drama film'], ['Family', 'خانوادگی'],
  ['Fantasy', 'فانتزی'], ['Film-Noir', 'نوآر', 'فیلم نوآر'], ['Game-Show', 'مسابقه تلویزیونی'], ['History', 'تاریخی'],
  ['Horror', 'ترسناک'], ['Music', 'موسیقی', 'موزیک'], ['Musical', 'موزیکال'], ['Mystery', 'معمایی'], ['News', 'خبری'],
  ['Reality-TV', 'واقع‌نما', 'ریالیتی شو'], ['Romance', 'عاشقانه', 'عاطفی'], ['Sci-Fi', 'علمی تخیلی', 'science-fiction', 'science fiction'],
  ['Short', 'کوتاه'], ['Sport', 'ورزشی', 'sports'], ['Talk-Show', 'گفت‌وگومحور'], ['Thriller', 'هیجان‌انگیز', 'هیجان انگیز'],
  ['War', 'جنگی'], ['Western', 'وسترن'], ['Social', 'اجتماعی'], ['Melodrama', 'ملودرام'], ['Political', 'سیاسی'],
  ['Spy', 'جاسوسی'], ['Police', 'پلیسی'], ['Medical', 'پزشکی'], ['Legal', 'حقوقی'], ['Supernatural', 'فراطبیعی'],
  ['Nature', 'طبیعت'], ['Experimental', 'تجربی'], ['Silent', 'صامت', 'silent film'], ['Sacred Defense', 'دفاع مقدس'],
]) add('genre', en, fa, names);

// ICU supplies region names in both locales. Only recognized regions are accepted;
// arbitrary provider tags (notably years and genres) cannot become countries.
const regionEn = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
const regionFa = new Intl.DisplayNames(['fa'], { type: 'region', fallback: 'none' });
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b);
  if (['ZZ', 'XX', 'EU', 'UN', 'EZ', 'QO', 'XA', 'XB'].includes(code)) continue;
  const name = regionEn.of(code);
  if (name) add('country', name, regionFa.of(code) || name, [code]);
}
for (const [en, fa, ...names] of [
  ['United States', 'آمریکا', 'US', 'USA', 'United States of America', 'ایالات متحده', 'ایالات متحده آمریکا'],
  ['United Kingdom', 'بریتانیا', 'GB', 'UK', 'انگلیس', 'انگلستان', 'Great Britain'],
  ['Turkey', 'ترکیه', 'TR', 'Türkiye', 'Turkiye'], ['South Korea', 'کره جنوبی', 'KR', 'کرهٔ جنوبی'],
  ['North Korea', 'کره شمالی', 'KP', 'کرهٔ شمالی'], ['Czech Republic', 'جمهوری چک', 'CZ', 'Czechia', 'چک'],
  ['India', 'هند', 'IN', 'هندوستان'], ['United Arab Emirates', 'امارات متحده عربی', 'AE', 'امارات', 'UAE'],
  ['Palestine', 'فلسطین', 'PS', 'Occupied Palestinian Territory', 'Palestinian Territories'],
  ['Hong Kong', 'هنگ کنگ', 'HK', 'Hong Kong SAR China'], ['Macao', 'ماکائو', 'MO', 'Macau', 'Macao SAR China'],
  ['Russia', 'روسیه', 'RU', 'Russian Federation'], ['Iran', 'ایران', 'IR', 'Iran, Islamic Republic of'],
  ['Japan', 'ژاپن', 'JP', 'ژاپنی'], ['Mexico', 'مکزیک', 'MX', 'مکریک'], ['Spain', 'اسپانیا', 'ES', 'سپانیا'],
  ['Ukraine', 'اوکراین', 'UA', 'اکراین'], ['New Zealand', 'نیوزیلند', 'NZ', 'نیوزلند'],
  ['Saudi Arabia', 'عربستان سعودی', 'SA', 'عربستان'], ['South Africa', 'آفریقای جنوبی', 'ZA'],
  ['Bosnia and Herzegovina', 'بوسنی و هرزگوین', 'BA', 'Bosnia & Herzegovina'],
  ['Myanmar', 'میانمار', 'MM', 'Myanmar (Burma)', 'Burma'], ['Saint Helena', 'سنت هلنا', 'SH', 'St. Helena'],
  // Historical production countries must not be merged into present-day states.
  ['West Germany', 'آلمان غربی', 'FRG'], ['East Germany', 'آلمان شرقی', 'GDR'],
  ['Soviet Union', 'اتحاد جماهیر شوروی', 'USSR', 'SU', 'شوروی'], ['Yugoslavia', 'یوگسلاوی', 'YU'],
  ['Federal Republic of Yugoslavia', 'جمهوری فدرال یوگسلاوی'],
  ['Serbia and Montenegro', 'صربستان و مونته‌نگرو', 'CS'], ['Czechoslovakia', 'چکسلواکی'],
]) add('country', en, fa, names);

const languageFa = new Intl.DisplayNames(['fa'], { type: 'language', fallback: 'none' });
const languageEn = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });
for (let a = 97; a <= 122; a++) for (let b = 97; b <= 122; b++) {
  const code = String.fromCharCode(a, b), name = languageEn.of(code);
  if (name) add('language', name, languageFa.of(code) || name, [code]);
}
// Original provider names are explicit aliases, not fuzzy matches. Languages with
// distinct meanings (Chinese/Mandarin/Cantonese, Malay/Malayalam) stay distinct.
for (const [en, code, ...names] of [
  ['Persian', 'fa', 'Farsi', 'فارسی', 'دوبله فارسی'], ['English', 'en', 'انگلیسی'], ['Hindi', 'hi', 'هندی', 'هند'],
  ['Bengali', 'bn', 'Bangla', 'بنگالی'], ['Tamil', 'ta', 'تامیل'], ['Turkish', 'tr', 'ترکی'],
  ['Xhosa', 'xh', 'خوسا'], ['Zulu', 'zu', 'زولو'], ['Hungarian', 'hu', 'مجارستانی'], ['Albanian', 'sq', 'آلبانی'],
  ['Korean', 'ko', 'کره ای', 'کره‌ای', 'کزه ای'], ['Malay', 'ms', 'مالایی', 'مالاییایی'],
  ['Malayalam', 'ml', 'مالایالام', 'مالایایی'], ['Telugu', 'te', 'تلوگو', 'تلگو', 'تالگو'],
  ['Marathi', 'mr', 'مراتی', 'ماراتی'], ['Indonesian', 'id', 'اندونزی', 'اندونزیایی'],
  ['Filipino', 'fil', 'فیلیپینی', 'فیلیپین'], ['Tagalog', 'tl', 'تاگالوگ'], ['Czech', 'cs', 'چک', 'چکی'],
  ['Slovak', 'sk', 'اسلواکی'], ['Serbian', 'sr', 'صربی', 'صرب'], ['Romanian', 'ro', 'رومانی', 'رومانیایی'],
  ['Ukrainian', 'uk', 'اکراینی', 'اوکراینی'], ['Kazakh', 'kk', 'قزاق'], ['Maori', 'mi', 'مائوری'],
  ['Flemish', 'vls', 'فلاندری'], ['Mandarin', 'cmn', 'ماندارین'], ['Cantonese', 'yue', 'کانتونی'],
  ['Shanghainese', 'wuu', 'شانگینی'], ['Min Nan', 'nan'], ['Hokkien', 'nan', 'Min Nan'],
  ['Swiss German', 'gsw'], ['Irish Gaelic', 'ga', 'Irish'], ['Gaelic', 'gd', 'Scottish Gaelic'],
  ['Pashtu', 'ps', 'Pashto'], ['Romany', 'rom', 'Romani'], ['Ibo', 'ig', 'Igbo'], ['Greenlandic', 'kl', 'Kalaallisut'],
  ['American Sign Language', 'ase'], ['British Sign Language', 'bfi'], ['French Sign Language', 'fsl'],
  ['German Sign Language', 'gsg'], ['Japanese Sign Language', 'jsl'], ['Korean Sign Language', 'kvk'],
  ['Australian Sign Language', 'asf'], ['Brazilian Sign Language', 'bzs'], ['Indian Sign Language', 'ins'],
  ['Spanish Sign Language', 'ssp'], ['Ukrainian Sign Language', 'ukl'], ['Russian Sign Language', 'rsl'],
  ['Sign Languages', 'sgn'], ['Greek, Ancient (to 1453)', 'grc'], ['Old English', 'ang'], ['Middle English', 'enm'],
  ['Norse, Old', 'non'], ['Egyptian (Ancient)', 'egy'], ['Assyrian Neo-Aramaic', 'aii'], ['Syriac', 'syr'],
  ['Aramaic', 'arc'], ['Central Khmer', 'km', 'Khmer'], ['Aboriginal', 'aus'], ['North American Indian', 'nai'],
  ['Apache languages', 'apa'], ['Central American Indian languages', 'cai'], ['Athapascan languages', 'ath'],
  ['Acholi', 'ach'], ['Algonquin', 'alg'], ['Arapaho', 'arp'], ['Aromanian', 'rup'], ['Awadhi', 'awa'],
  ['Bable', 'ast', 'Asturian'], ['Berber languages', 'ber'],
  ['Cheyenne', 'chy'], ['Corsican', 'co'], ['Crow', 'cro'], ['Dari', 'fa-AF'], ['Dinka', 'din'], ['Dyula', 'dyu'],
  ['Fon', 'fon'], ['Haitian', 'ht', 'Haitian Creole'], ['Hakka', 'hak'], ['Haryanvi', 'bgc'], ['Hawaiian', 'haw'],
  ['Hmong', 'hmn'], ['Hopi', 'hop'], ['Kalmyk-Oirat', 'xal'], ['Klingon', 'tlh'], ['Kriolu', 'kea'],
  ['Ladino', 'lad'], ['Malinka', 'mlq'], ['Mandingo', 'man'], ['Mapudungun', 'arn'], ['Maya', 'myn', 'مایا'],
  ['Mende', 'men'], ['Micmac', 'mic'], ['Minangkabau', 'min'], ['Mixtec', 'mix'], ['Mohawk', 'moh'],
  ['More', 'mos'], ['Nahuatl', 'nah'], ['Nama', 'naq'], ['Neapolitan', 'nap'],
  ['Nyanja', 'ny', 'Chichewa'], ['Ojibwa', 'oj', 'Ojibwe'], ['Osage', 'osa'], ['Papiamento', 'pap'],
  ['Pawnee', 'paw'], ['Peul', 'ff', 'Fulah'], ['Fulah', 'ff', 'Peul'], ['Polynesian', 'poz'], ['Pular', 'fuf'],
  ['Quechua', 'qu'], ['Quenya', 'qya'], ['Ryukyuan', 'ryu'], ['Saami', 'smi'], ['Scots', 'sco'],
  ['Shoshoni', 'shh'], ['Sicilian', 'scn'], ['Sindarin', 'sjn'], ['Sioux', 'dak'], ['Songhay', 'son'],
  ['Soninke', 'snk'], ['Sotho', 'st', 'Southern Sotho'], ['Sumerian', 'sux'], ['Tamashek', 'tmh'],
  ['Tok Pisin', 'tpi'], ['Tupi', 'tup'], ['Uighur', 'ug', 'Uyghur'], ['Visayan', 'bis'], ['Washoe', 'was'],
  ['Wayuu', 'guc'], ['Wolof', 'wo'], ['Yakut', 'sah'], ['Serbo-Croatian', 'sh'], ['None', 'zxx', 'بدون گفتار'],
]) {
  // ICU aliases cmn to zh; generic Chinese is not the same catalogue facet as
  // Mandarin. Only explicit English aliases may override another language.
  const fa = code === 'cmn' ? 'چینی ماندارین' : code === 'tl' ? 'تاگالوگ' : languageFa.of(code);
  add('language', en, fa || en, [code, ...names]);
}
add('language', 'Teochew', 'چائوژو', ['Chaozhou']);
add('language', 'Nushi', 'نوشی');
// ICU may lack labels for very rare/fictional/sign languages; provide readable
// Persian labels instead of exposing codes or blending English into Persian menus.
for (const [en, fa] of [
  ['American Sign Language', 'زبان اشاره آمریکایی'], ['British Sign Language', 'زبان اشاره بریتانیایی'],
  ['French Sign Language', 'زبان اشاره فرانسوی'], ['German Sign Language', 'زبان اشاره آلمانی'],
  ['Japanese Sign Language', 'زبان اشاره ژاپنی'], ['Korean Sign Language', 'زبان اشاره کره‌ای'],
  ['Australian Sign Language', 'زبان اشاره استرالیایی'], ['Brazilian Sign Language', 'زبان اشاره برزیلی'],
  ['Indian Sign Language', 'زبان اشاره هندی'], ['Spanish Sign Language', 'زبان اشاره اسپانیایی'],
  ['Ukrainian Sign Language', 'زبان اشاره اوکراینی'], ['Russian Sign Language', 'زبان اشاره روسی'],
  ['North American Indian', 'زبان‌های بومی آمریکای شمالی'], ['Central American Indian languages', 'زبان‌های بومی آمریکای مرکزی'],
  ['Aboriginal', 'زبان‌های بومی استرالیا'], ['Apache languages', 'زبان‌های آپاچی'], ['Athapascan languages', 'زبان‌های آتاباسکی'],
  ['Nushi', 'نوشی'], ['Crow', 'کرو'], ['Haryanvi', 'هریانوی'], ['Chaozhou', 'چائوژو'], ['Teochew', 'چائوژو'],
  ['Hokkien', 'مین نان'], ['Pawnee', 'پانی'], ['Mixtec', 'میشتک'], ['Quenya', 'کوئنیا'], ['Sindarin', 'سیندارین'],
  ['Ryukyuan', 'ریوکیویی'], ['Shoshoni', 'شوشونی'], ['Wayuu', 'وایوو'], ['Washoe', 'واشو'],
  ['Malinka', 'مالینکه'], ['Pular', 'پولار'], ['Polynesian', 'زبان‌های پلی‌نزی'], ['None', 'بدون گفتار'],
  ['Algonquin', 'آلگونکوین'], ['Assyrian Neo-Aramaic', 'آرامی نو آشوری'], ['Berber languages', 'زبان‌های بربری'],
  ['Flemish', 'فلاندری'], ['Hakka', 'هاکا'], ['Hopi', 'هوپی'], ['Maya', 'مایا'], ['Nahuatl', 'ناواتل'],
  ['Saami', 'زبان‌های سامی شمال اروپا'], ['Sign Languages', 'زبان‌های اشاره'], ['Songhay', 'زبان‌های سونگهای'], ['Tupi', 'زبان‌های توپی'],
]) {
  const value = aliases.language.get(key(en));
  if (value) { records.language.get(value).fa = fa; aliases.language.set(key(fa), value); }
}

/** @param {FacetKind} kind @param {unknown} raw @returns {string | null} */
export function facetValue(kind, raw) {
  return aliases[kind].get(key(raw)) || null;
}

/** @param {FacetKind} kind @param {unknown[]} values @returns {string[]} */
export function facetValues(kind, values = []) {
  return [...new Set(values.flatMap(raw => {
    if (/https?:\/\/|www\.|[<>]/i.test(String(raw ?? ''))) return [];
    const direct = facetValue(kind, raw);
    if (direct) return [direct];
    if (kind === 'genre' && key(raw) === 'action comedy film') return ['Action', 'Comedy'];
    if (kind === 'genre' && key(raw) === key('کمدی خیالی')) return ['Comedy', 'Fantasy'];
    // Prefer whole names first: "Greek, Ancient (to 1453)" is one language.
    return String(raw ?? '').split(/[,،/;؛|]+/).map(part => facetValue(kind, part)).filter(Boolean);
  }))];
}

/** @param {FacetKind} kind @param {string} value @param {string} locale */
export function facetLabel(kind, value, locale = 'fa') {
  const canonical = facetValue(kind, value);
  const record = canonical && records[kind].get(canonical);
  return record ? (locale === 'fa' ? record.fa : record.value) : value;
}

/** @param {FacetKind} kind @param {string[]} values @param {string} locale */
export function facetOptions(kind, values, locale = 'fa') {
  return facetValues(kind, values).map(value => ({ value, label: facetLabel(kind, value, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** @param {FacetKind} kind @param {string[]} values @param {string} target */
export function matchesFacet(kind, values, target) {
  const canonical = facetValue(kind, target);
  return Boolean(canonical && (values.includes(canonical) || facetValues(kind, values).includes(canonical)));
}

/** @template {{ genres?: string[], countries?: string[], languages?: string[], persianGenres?: string[], persianCountries?: string[], persianLanguages?: string[] }} T @param {T} item */
export function normalizeCardFacets(item) {
  return { ...item,
    genres: facetValues('genre', [...(item.genres || []), ...(item.persianGenres || [])]),
    countries: facetValues('country', [...(item.countries || []), ...(item.persianCountries || [])]),
    languages: facetValues('language', [...(item.languages || []), ...(item.persianLanguages || [])]),
  };
}

/** @param {Array<{ genres?: string[], countries?: string[], languages?: string[] }>} items */
export function catalogFacets(items) {
  return { genres: facetOptions('genre', items.flatMap(item => item.genres || []), 'en').map(o => o.value),
    countries: facetOptions('country', items.flatMap(item => item.countries || []), 'en').map(o => o.value),
    languages: facetOptions('language', items.flatMap(item => item.languages || []), 'en').map(o => o.value) };
}
