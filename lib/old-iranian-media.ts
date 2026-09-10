import type { VodCard, VodItem } from "./types";

export type YouTubeSource = NonNullable<VodItem["youtubeVideos"]>[number];

export type OldIranianFilmMedia = {
  id: string;
  originalTitle: string;
  overview: string;
  year: number;
  persianYear: number;
  runtimeMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  metadataUrl: string;
  metadataLabel: string;
  genres: string[];
  persianGenres: string[];
  countries: string[];
  persianCountries: string[];
  languages: string[];
  persianLanguages: string[];
  credits: NonNullable<VodItem["credits"]>;
  images: NonNullable<VodItem["imdbImages"]>;
  youtubeVideos: YouTubeSource[];
};

const GHADAGHAN_ID = "old-iranian-1359002";
const GHADAGHAN_VIDEO_ID = "rtjGa3VGK-k";
const FRATRICIDE_ID = "old-iranian-1359010";
const FRATRICIDE_VIDEO_ID = "thO9Em-8ihQ";

function publicYouTubeVideo(videoId: string, title: string, channel: string, durationSeconds?: number): YouTubeSource {
  return {
    videoId,
    title,
    channel,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    checkedAt: "2026-09-10",
    playbackStatus: "not-tested",
    durationSeconds,
  };
}

// Exact title matches verified in the first 50-title archival research batch.
// Only public videos whose returned title names the same film are included.
const BATCH_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  // User-confirmed full-length replacement. The previous research candidate was a trailer.
  "old-iranian-1353020": [publicYouTubeVideo("mSzgo6SRnBs", "فیلم صمد آرتیست میشود", "Pars Video", 6509)],
  "old-iranian-1358034": [publicYouTubeVideo("gyFhRQJ3RtM", "فیلم مفسدین (۱۳۵۹)", "Pedram M")],
  "old-iranian-1332003": [publicYouTubeVideo("BhbP3qnOkww", "فیلم کامل گلنسا در پاریس", "Cinema Rex - سینما رکس")],
  "old-iranian-1332007": [publicYouTubeVideo("CRwDIfsNWD4", "فیلم مشهدی عباد | ۱۳۳۲", "فیلم قدیمی رنگی")],
  "old-iranian-1332019": [publicYouTubeVideo("iDFo_VjrTOk", "فیلم زیبای بی پناه - نسخه کامل و باکیفیت", "Shouka Film")],
  "old-iranian-1333004": [publicYouTubeVideo("ShDh2WjQD-w", "فیلم کامل دختری از شیراز", "Cinema Rex - سینما رکس")],
  "old-iranian-1336002": [publicYouTubeVideo("2dumOyaGN08", "فیلم کامل رستم و سهراب", "Cinema Rex - سینما رکس")],
  "old-iranian-1336008": [publicYouTubeVideo("phRtPcpQXy8", "فیلم کامل برهنه خوشحال", "Cinema Rex - سینما رکس")],
  "old-iranian-1337002": [publicYouTubeVideo("9MxOMOC8-Lk", "فیلم کامل طوفان در شهر ما", "Cinema Rex - سینما رکس")],
  "old-iranian-1337007": [publicYouTubeVideo("gIE_joOKce0", "فیلم کامل طلسم شکسته", "Cinema Rex - سینما رکس")],
  "old-iranian-1337014": [publicYouTubeVideo("jfZajeHwwFw", "فیلم سینمایی عروس فراری", "FilmNama")],
  "old-iranian-1338023": [publicYouTubeVideo("12KWZlRNC70", "فیلم کامل چشمه آب حیات", "Cinema Rex - سینما رکس")],
  "old-iranian-1339005": [publicYouTubeVideo("KUz6rumaKkM", "فیلم کامل آخرین هوس", "Cinema Rex - سینما رکس")],
  "old-iranian-1339010": [publicYouTubeVideo("Mi_InFMb1PY", "فیلم کامل عروسک پشت پرده", "Cinema Rex - سینما رکس")],
  "old-iranian-1339014": [publicYouTubeVideo("1rBLmhcHVwA", "فیلم کامل اول هیکل", "Cinema Rex - سینما رکس")],
  "old-iranian-1339021": [publicYouTubeVideo("9rbhxf5Y4r8", "فیلم کامل آرامش قبل از طوفان", "Cinema Rex - سینما رکس")],
  "old-iranian-1339027": [publicYouTubeVideo("7yFa_jru000", "فیلم کامل ماجرای جنگل", "فیلم قدیمی")],
  "old-iranian-1340001": [publicYouTubeVideo("fgYGeqGua0M", "فیلم کامل عمو نوروز", "Cinema Rex - سینما رکس")],
  "old-iranian-1340005": [publicYouTubeVideo("y6G8PkgUcJk", "فیلم کامل آهنگ دهکده", "Cinema Rex - سینما رکس")],
  "old-iranian-1340011": [publicYouTubeVideo("jeYJKl-Jtvk", "فیلم کامل فریاد نیمه شب", "Cinema Rex - سینما رکس")],
  "old-iranian-1340025": [publicYouTubeVideo("4lWkoH52WWA", "فیلم بدون حذفیات خانوم عوضی گرفتی - نسخه کامل", "Shouka Film")],
  "old-iranian-1340028": [publicYouTubeVideo("hVTgyno4FcQ", "فیلم کامل صد کیلو داماد", "Cinema Rex - سینما رکس")],
  "old-iranian-1341002": [publicYouTubeVideo("Azkg3mp-SvY", "فیلم کامل دخترها اینطور دوست دارند", "Cinema Rex - سینما رکس")],
  "old-iranian-1341007": [publicYouTubeVideo("2Jrw4hkISKI", "فیلم کامل سوداگران مرگ", "Cinema Rex - سینما رکس")],
  "old-iranian-1341017": [publicYouTubeVideo("WDJc6aCAPwI", "فیلم قدیمی - فیلم کامل اشک شوق", "فیلم قدیمی")],
  "old-iranian-1341021": [publicYouTubeVideo("YBmCQ_3dN2c", "فیلم بدون سانسور دلهره - نسخه کامل", "Shouka Film")],
  "old-iranian-1341027": [publicYouTubeVideo("PIqIE7qLjSA", "فیلم کامل زمین تلخ", "بیکی ها")],
  "old-iranian-1342002": [publicYouTubeVideo("i--soREXI94", "فیلم کامل مسافری از بهشت", "Cinema Rex - سینما رکس")],
  "old-iranian-1342008": [publicYouTubeVideo("rRj8h3qjUdY", "فیلم کامل ساحل انتظار", "فیلم قدیمی")],
  "old-iranian-1342009": [publicYouTubeVideo("N11MaZtT81M", "فیلم سینمایی زن ها فرشته اند", "FilmNama")],
  "old-iranian-1342017": [publicYouTubeVideo("JQWwbNlt6kA", "فیلم کامل تار عنکبوت", "Cinema Rex - سینما رکس")],
  "old-iranian-1342020": [publicYouTubeVideo("cp00eI7ABg0", "فیلم بدون سانسور جدال در مهتاب", "Shouka Film")],
  "old-iranian-1342021": [publicYouTubeVideo("i12MSFkyopU", "فیلم کامل فرار", "Cinema Rex - سینما رکس")],
  "old-iranian-1342028": [publicYouTubeVideo("0KAGQmx8gjk", "فیلم سینمایی آقای هفت رنگ - کامل", "FilmNama")],
  "old-iranian-1343001": [publicYouTubeVideo("zMFiz7q5b6w", "فیلم کامل آقای قرن بیستم", "Shouka Film")],
  "old-iranian-1343003": [publicYouTubeVideo("Bo_HBVz6Pj4", "فیلم کامل مسیر رودخانه", "Cinema Rex - سینما رکس")],
  "old-iranian-1343015": [publicYouTubeVideo("5rw9AwEQrZ0", "فیلم دختر ولگرد - نسخه کامل", "Shouka Film")],
  "old-iranian-1343018": [publicYouTubeVideo("s_tGs6-WrYg", "فیلم کامل افسانه دهکده", "Shouka Film")],
  "old-iranian-1343023": [publicYouTubeVideo("QdtYDyQyQSY", "فیلم کامل لذت گناه", "فیلم قدیمی رنگی")],
  "old-iranian-1343034": [publicYouTubeVideo("FOEtP3IWQgA", "فیلم کامل وسوسه", "Cinema Rex - سینما رکس")],
  "old-iranian-1344002": [publicYouTubeVideo("0VS5UZpKV1o", "فیلم کامل مرخصی اجباری", "Cinema Rex - سینما رکس")],
  "old-iranian-1344009": [publicYouTubeVideo("Z3N9zVGBB_A", "فیلم کامل افق روشن", "فیلم قدیمی")],
  "old-iranian-1344015": [publicYouTubeVideo("DOJDUR2eNQk", "فیلم کامل ایرانی چهار تا شیطون", "Persian Comedy Channel")],
  "old-iranian-1344018": [publicYouTubeVideo("lJLWxF-_TVI", "فیلم کامل عشق و انتقام", "Cinema Rex - سینما رکس")],
  "old-iranian-1344022": [publicYouTubeVideo("EBwXCGpzUrE", "فیلم ولگرد قهرمان - نسخه کامل", "Shouka Film")],
  "old-iranian-1344026": [publicYouTubeVideo("k5DXbdqH6oI", "فیلم کامل من مادرم", "Cinema Rex - سینما رکس")],
  "old-iranian-1344034": [publicYouTubeVideo("TweztnBluDg", "نسخه کامل فیلم فارسی مزد خونین", "FilmFarsi - فیلمفارسی")],
};

// Second 50-title review batch sourced from the community playlists. Every
// active candidate below has an exact catalogue-title match and a runtime of
// at least one hour in the playlist metadata.
const BATCH_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354001": [publicYouTubeVideo("dlZv_yfHwlA", "فیلم ایرانی - همسفر", "Pars Video", 6275)],
  "old-iranian-1356045": [publicYouTubeVideo("KtmsZEsCSU4", "فیلم ایرانی - در امتداد شب", "Pars Video", 7219)],
  "old-iranian-1355003": [publicYouTubeVideo("pMlPsbXIm5Q", "فیلم ایرانی - ماه عسل", "Pars Video", 6382)],
  "old-iranian-1351069": [publicYouTubeVideo("-iZlRDJJHNY", "فیلم ایرانی - بیتا", "Pars Video", 5722)],
  "old-iranian-1346013": [publicYouTubeVideo("ZtE5bA1tnk0", "فیلم ایرانی - چهار خواهر", "Pars Video", 4203)],
  "old-iranian-1355061": [publicYouTubeVideo("QF_nz4Peoz8", "فیلم ایرانی - نازنین", "Pars Video", 5341)],
  "old-iranian-1339024": [publicYouTubeVideo("SyCK1VNmwv0", "فیلم ایرانی - فرشته فراری", "Pars Video", 6631)],
  "old-iranian-1349007": [publicYouTubeVideo("6z91ao7lF1M", "فیلم ایرانی - طلوع", "Pars Video", 5128)],
  "old-iranian-1339002": [publicYouTubeVideo("ZegvFoRk4Cg", "فیلم ایرانی - بیم و امید", "Pars Video", 4243)],
  "old-iranian-1352033": [publicYouTubeVideo("r1TqClwwDeY", "صمد به مدرسه می رود", "Pars Video", 5490)],
  "old-iranian-1356002": [publicYouTubeVideo("JduXAguGRyw", "صمد در راه اژدها", "Pars Video", 6249)],
  "old-iranian-1354003": [publicYouTubeVideo("PbLPFotrH5E", "صمد خوشبخت می شود", "Pars Video", 5988)],
  "old-iranian-1350024": [publicYouTubeVideo("X0n4R8nTMoc", "صمد و قالیچه حضرت سلیمان", "Pars Video", 6473)],
  "old-iranian-1351003": [publicYouTubeVideo("TD5MEArIoQY", "صمد و سامی لیلا و لیلی", "Pars Video", 6086)],
  "old-iranian-1348034": [publicYouTubeVideo("Ahkqef86u4w", "فیلم ایرانی - قیصر", "Pars Video", 6031)],
  "old-iranian-1354057": [publicYouTubeVideo("Q9H_C7NN-EE", "فیلم ایرانی - گوزنها", "Pars Video", 6132)],
  "old-iranian-1350036": [publicYouTubeVideo("2IniV6u55Hw", "فیلم ایرانی - داش آکل", "Pars Video", 5681)],
  "old-iranian-1349039": [publicYouTubeVideo("Uqu4HIgUpmg", "فیلم ایرانی - طوقی", "Pars Video", 5570)],
  "old-iranian-1352070": [publicYouTubeVideo("K6TJjXMN9GM", "فیلم ایرانی - تنگسیر", "Pars Video", 6759)],
  "old-iranian-1356044": [publicYouTubeVideo("wsuLNprT1h4", "فیلم ایرانی - سوته دلان", "Pars Video", 5494)],
  "old-iranian-1344025": [publicYouTubeVideo("B2IK_pNVlh0", "فیلم ایرانی - گنج قارون (۱۳۴۴)", "Pars Video", 6332)],
  "old-iranian-1347027": [publicYouTubeVideo("0e3uiGUokLs", "فیلم ایرانی - سلطان قلبها", "Pars Video", 7693)],
  "old-iranian-1349053": [publicYouTubeVideo("v83zI6pkJUk", "فیلم ایرانی - کوچه مردها", "Pars Video", 5973)],
  "old-iranian-1346002": [publicYouTubeVideo("CxgskJCIRik", "فیلم ایرانی - طوفان نوح", "Pars Video", 4885)],
  "old-iranian-1349031": [publicYouTubeVideo("04QeK1_zKEE", "فیلم ایرانی - یاقوت سه چشم", "Pars Video", 6138)],
};

const GHADAGHAN: OldIranianFilmMedia = {
  id: GHADAGHAN_ID,
  originalTitle: "Ghadaghan",
  overview:
    "غلام همسری بلندپرواز به نام قدسی دارد؛ عبدالله نیز با پسرش محمد زندگی می‌کند و ماجراهای این شخصیت‌ها داستان فیلم را شکل می‌دهد.",
  year: 1980,
  persianYear: 1359,
  runtimeMinutes: 95,
  posterUrl: `https://i.ytimg.com/vi/${GHADAGHAN_VIDEO_ID}/hqdefault.jpg`,
  backdropUrl: `https://i.ytimg.com/vi/${GHADAGHAN_VIDEO_ID}/maxresdefault.jpg`,
  metadataUrl: "https://www.manzoom.ir/title/tt7218593/فیلم-سینمایی-قدغن-1359",
  metadataLabel: "Manzoom",
  genres: ["Iranian Cinema", "Classic", "Drama"],
  persianGenres: ["فیلم قدیمی ایرانی", "درام"],
  countries: ["Iran"],
  persianCountries: ["ایران"],
  languages: ["Persian"],
  persianLanguages: ["فارسی"],
  credits: [
    { category: "Director", name_text: "علیرضا داوودنژاد" },
    { category: "Actor", name_text: "داوود رشیدی" },
    { category: "Actor", name_text: "پرویز فنی‌زاده" },
    { category: "Actor", name_text: "مرتضی عقیلی" },
    { category: "Actor", name_text: "مهناز داوودنژاد" },
    { category: "Actor", name_text: "علی عسگری" },
    { category: "Actor", name_text: "زرینه" },
  ],
  images: [
    {
      url: `https://i.ytimg.com/vi/${GHADAGHAN_VIDEO_ID}/maxresdefault.jpg`,
      width: 1280,
      height: 720,
      caption: "قدغن؛ فیلم قدیمی ایرانی",
    },
  ],
  youtubeVideos: [
    {
      videoId: GHADAGHAN_VIDEO_ID,
      title: "فیلم قدیمی - فیلم کامل قدغن",
      channel: "لاله زار",
      sourceUrl: `https://www.youtube.com/watch?v=${GHADAGHAN_VIDEO_ID}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${GHADAGHAN_VIDEO_ID}/maxresdefault.jpg`,
    },
    {
      videoId: "z1d-ZMrKnJY",
      title: "فیلم قدغن | فیلم قدیمی",
      channel: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=z1d-ZMrKnJY",
      thumbnailUrl: "https://i.ytimg.com/vi/z1d-ZMrKnJY/maxresdefault.jpg",
    },
  ],
};

// Exact title/year match on the publisher's verified FilmFarsi YouTube channel.
// Keep this as an attributed YouTube reference rather than copying a movie file.
const FRATRICIDE: OldIranianFilmMedia = {
  id: FRATRICIDE_ID,
  originalTitle: "Fratricide",
  overview: "دو خانواده به‌خاطر کینه‌ای قدیمی درگیرند و رابطهٔ یک دختر و پسر از این دو خانواده، ماجرا را به نقطهٔ بحرانی می‌رساند.",
  year: 1980,
  persianYear: 1359,
  runtimeMinutes: 89,
  posterUrl: `https://i.ytimg.com/vi/${FRATRICIDE_VIDEO_ID}/hqdefault.jpg`,
  backdropUrl: `https://i.ytimg.com/vi/${FRATRICIDE_VIDEO_ID}/maxresdefault.jpg`,
  metadataUrl: "https://cinema.iranicaonline.org/film/%D8%A8%D8%B1%D8%A7%D8%AF%D8%B1%DA%A9%D8%B4%DB%8C/",
  metadataLabel: "Cinema Iranica",
  genres: ["Iranian Cinema", "Classic", "Drama"],
  persianGenres: ["فیلم قدیمی ایرانی", "درام"],
  countries: ["Iran"],
  persianCountries: ["ایران"],
  languages: ["Persian"],
  persianLanguages: ["فارسی"],
  credits: [
    { category: "Director", name_text: "ایرج قادری" },
    { category: "Writer", name_text: "سعید مطلبی" },
  ],
  images: [{ url: `https://i.ytimg.com/vi/${FRATRICIDE_VIDEO_ID}/maxresdefault.jpg`, width: 1280, height: 720, caption: "برادرکشی؛ فیلم قدیمی ایرانی" }],
  youtubeVideos: [{
    videoId: FRATRICIDE_VIDEO_ID,
    title: "فیلم فارسی برادرکشی | فیلم قدیمی",
    channel: "FilmFarsi - فیلمفارسی",
    sourceUrl: `https://www.youtube.com/watch?v=${FRATRICIDE_VIDEO_ID}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${FRATRICIDE_VIDEO_ID}/hqdefault.jpg`,
    evidenceUrl: `https://www.youtube.com/@filmfarsichannel`,
    checkedAt: "2026-09-10",
    playbackStatus: "not-tested",
  }],
};

const MEDIA_BY_ID: Record<string, OldIranianFilmMedia> = {
  [GHADAGHAN_ID]: GHADAGHAN,
  [FRATRICIDE_ID]: FRATRICIDE,
};

export function getOldIranianFilmMedia(id: string | null | undefined) {
  return id ? MEDIA_BY_ID[id.toLowerCase()] ?? null : null;
}

export function getOldIranianYouTubeVideos(id: string | null | undefined) {
  if (!id) return null;
  return getOldIranianFilmMedia(id)?.youtubeVideos ?? BATCH_ONE_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_TWO_YOUTUBE_BY_ID[id.toLowerCase()] ?? null;
}

/**
 * Enriches legacy source-only records without manufacturing a direct file link.
 * The source remains a public page/YouTube reference and is intentionally not
 * converted into a fake playable VodLink.
 */
export function enrichOldIranianFilm(item: VodItem): VodItem {
  const media = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  const youtubeVideos = item.youtubeVideos?.length ? item.youtubeVideos : getOldIranianYouTubeVideos(item.id) ?? getOldIranianYouTubeVideos(item.imdbCode) ?? undefined;
  if (!media) return youtubeVideos ? { ...item, youtubeVideos } : item;

  return {
    ...item,
    originalTitle: item.originalTitle ?? media.originalTitle,
    year: item.year ?? media.year,
    persianYear: item.persianYear ?? media.persianYear,
    overview: item.overview ?? media.overview,
    runtimeMinutes: item.runtimeMinutes ?? media.runtimeMinutes,
    posterUrl: item.posterUrl ?? media.posterUrl,
    backdropUrl: item.backdropUrl ?? media.backdropUrl,
    genres: item.genres?.length ? item.genres : media.genres,
    persianGenres: item.persianGenres?.length ? item.persianGenres : media.persianGenres,
    countries: item.countries?.length ? item.countries : media.countries,
    persianCountries: item.persianCountries?.length ? item.persianCountries : media.persianCountries,
    languages: item.languages?.length ? item.languages : media.languages,
    persianLanguages: item.persianLanguages?.length ? item.persianLanguages : media.persianLanguages,
    credits: item.credits?.length ? item.credits : media.credits,
    imdbImages: item.imdbImages?.length ? item.imdbImages : media.images,
    youtubeVideos,
  };
}

export function enrichOldIranianCard(item: VodCard): VodCard {
  const media = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  if (!media) return item;

  return {
    ...item,
    year: item.year ?? media.year,
    overview: item.overview ?? media.overview,
    posterUrl: item.posterUrl ?? media.posterUrl,
    backdropUrl: item.backdropUrl ?? media.backdropUrl,
    genres: item.genres?.length ? item.genres : media.genres,
    persianGenres: item.persianGenres?.length ? item.persianGenres : media.persianGenres,
    countries: item.countries?.length ? item.countries : media.countries,
    persianCountries: item.persianCountries?.length ? item.persianCountries : media.persianCountries,
    languages: item.languages?.length ? item.languages : media.languages,
    persianLanguages: item.persianLanguages?.length ? item.persianLanguages : media.persianLanguages,
  };
}
