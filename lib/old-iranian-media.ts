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

function publicYouTubeVideo(videoId: string, title: string, channel: string, durationSeconds?: number, checkedAt = "2026-09-10", playbackStatus: YouTubeSource["playbackStatus"] = "not-tested"): YouTubeSource {
  return {
    videoId,
    title,
    channel,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    checkedAt,
    playbackStatus,
    durationSeconds,
  };
}

const OITN_SOURCE_URL = "https://www.oitn.com/copy-of-%D9%85%D8%B3%D8%AA%D9%86%D8%AF-%D9%87%D8%A7";
function publicOitnVideo(videoId: string, title: string, durationSeconds: number): YouTubeSource {
  return {
    ...publicYouTubeVideo(videoId, title, "OITN · Television Omid Iran", durationSeconds, "2026-09-26", "available"),
    evidenceUrl: OITN_SOURCE_URL,
  };
}

// 2026-09-29 research batch: exact-title, feature-length public uploads for
// previously unlinked archive entries. Short clips and ambiguous matches stay
// excluded even when the search returned a similarly named video.
const BATCH_ONE_HUNDRED_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357010": [publicYouTubeVideo("0mA75WPm2t0", "Faryadras · full film", "Beykiha", 6309, "2026-09-29")],
  "old-iranian-1355011": [publicYouTubeVideo("XT2NkIdYlLE", "Agitation · full film", "Persian Culture HD", 6239, "2026-09-29")],
  "old-iranian-1355022": [publicYouTubeVideo("FgjlWf6lmco", "Mr. Mostafa's Mother · full film", "Filmrangi", 6124, "2026-09-29")],
  "old-iranian-1354048": [publicYouTubeVideo("Oms9TQWIYCo", "Reed Bed · full film", "tiktok challenge", 6088, "2026-09-29")],
  "old-iranian-1355014": [publicYouTubeVideo("NEEIag8N10A", "Herfei · full film", "Shahre Farang", 6176, "2026-09-29")],
};

// 2026-09-29 research batch: another set of exact-title, feature-length
// uploads. The search results were checked for title identity and duration.
const BATCH_ONE_HUNDRED_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355015": [publicYouTubeVideo("iN-5s2TVLKQ", "جایزه خوشبختی · نسخه کامل", "Shouka Film", 4920, "2026-09-29")],
  "old-iranian-1355016": [publicYouTubeVideo("28lrisXkm-A", "سیاه بخت · نسخه کامل", "FilmFarsi", 5228, "2026-09-29")],
  "old-iranian-1355019": [publicYouTubeVideo("S6znukmZ9qY", "فیلم قدیمی؛ پسرک · نسخه کامل", "Filmrangi", 6259, "2026-09-29")],
  "old-iranian-1355033": [publicYouTubeVideo("zjQZzFmIhuU", "نسخه کامل فیلم فارسی پیشکسوت", "FilmFarsi", 5967, "2026-09-29")],
  "old-iranian-1355039": [publicYouTubeVideo("9StPHRfLy6E", "فیلم ایرانی قدیمی ستیز · نسخه کامل", "سینما رنگارنگ", 5393, "2026-09-29")],
  "old-iranian-1355045": [publicYouTubeVideo("k2o8NpdPxt8", "پسر ایران از مادرش بی‌خبر است · نسخه کامل", "Shouka Film", 4100, "2026-09-29")],
};

// 2026-09-29 research batch: exact Persian-title matches with a reported
// runtime of at least one hour. Similar titles, trailers and clips are omitted.
const BATCH_ONE_HUNDRED_TEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355048": [publicYouTubeVideo("TORcy5Gosn0", "اگر برگی نریزد · نسخه کامل", "FilmFarsi", 4578, "2026-09-29")],
  "old-iranian-1355052": [publicYouTubeVideo("dHnF7wPuGUY", "قاصدک · فیلم کامل · ۱۳۵۵", "FilmFarsi", 4896, "2026-09-29")],
  "old-iranian-1355053": [publicYouTubeVideo("wO-w44g-t9c", "فیلم قدیمی؛ راز · ۱۳۵۵ · نسخه کامل", "Filmrangi", 5629, "2026-09-29")],
  "old-iranian-1355059": [publicYouTubeVideo("Yt-O4YPWtIM", "فیلم کامل پشمالو", "Beykiha", 5776, "2026-09-29")],
  "old-iranian-1355060": [publicYouTubeVideo("GNTLvFRu6qI", "فیلم قدیمی ایرانی رامشگر · نسخه کامل", "FilmFarsi", 5978, "2026-09-29")],
  "old-iranian-1355062": [publicYouTubeVideo("T3OqygZrv68", "فیلم زیبای جنگی میراث · نسخه کامل", "Shouka Film", 5798, "2026-09-29")],
  "old-iranian-1355065": [publicYouTubeVideo("mR0rWlGmxFE", "فیلم کامل ولی نعمت", "FilmFarsi", 5732, "2026-09-29")],
  "old-iranian-1354052": [publicYouTubeVideo("RvydlA2HljQ", "فیلم در غربت · ۱۳۵۴ · نسخه کامل", "Persian Films Archive", 5177, "2026-09-29")],
};

// 2026-09-29 research batch: exact-title classic uploads with verified
// feature-length runtimes. Search lookalikes and short excerpts are excluded.
const BATCH_ONE_HUNDRED_ELEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354033": [publicYouTubeVideo("Er_eP6Y5UIQ", "خانه خراب · نسخه کامل", "FilmFarsi", 6071, "2026-09-29")],
  "old-iranian-1355066": [publicYouTubeVideo("pKEvZFOZjec", "فیلم قدیمی؛ سه رفیق · ۱۳۵۵", "Filmrangi", 4877, "2026-09-29")],
  "old-iranian-1354025": [publicYouTubeVideo("jjKFEj9PH3o", "فیلم ایرانی قدیمی هم قسم · ۱۳۵۴", "سینما رنگارنگ", 5010, "2026-09-29")],
  "old-iranian-1355002": [publicYouTubeVideo("xs4zGOqNyac", "قرار بزرگ · فیلم کامل ایرانی", "Global Vault TV", 5768, "2026-09-29")],
  "old-iranian-1354047": [publicYouTubeVideo("BpKcHF6J8VY", "فیلم قدیمی؛ ذبیح · ۱۳۵۴", "Filmrangi", 5241, "2026-09-29")],
  "old-iranian-1353050": [publicYouTubeVideo("TS1x-2FBlw8", "مواظب کلات باش · ۱۳۵۳ · نسخه کامل", "Cinema Rex", 6568, "2026-09-29")],
  "old-iranian-1354063": [publicYouTubeVideo("yYmGn6dPQI4", "فیلم قدیمی؛ آلوده · ۱۳۵۴", "Filmrangi", 6550, "2026-09-29")],
  "old-iranian-1354023": [publicYouTubeVideo("vDS3bak7u5g", "فیلم قدیمی؛ هم‌خون · ۱۳۵۴", "Filmrangi", 4952, "2026-09-29")],
  "old-iranian-1355067": [publicYouTubeVideo("1nACXIXt31E", "فیلم قدیمی؛ راننده سربلند · ۱۳۵۵", "Filmrangi", 4799, "2026-09-29")],
};

// 2026-09-29 research batch: exact-title full-film uploads, all longer than
// one hour and matched to the archive year/title where the source provided it.
const BATCH_ONE_HUNDRED_TWELVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354038": [publicYouTubeVideo("Gdn9oAjK4EI", "فیلم کامل عمو فوتبالی", "Beykiha", 5635, "2026-09-29")],
  "old-iranian-1354061": [publicYouTubeVideo("s-XzMxB_VS8", "فیلم قدیمی؛ بابا خالدار · ۱۳۵۴", "Filmrangi", 6746, "2026-09-29")],
  "old-iranian-1354034": [publicYouTubeVideo("MyfPhxMjjnY", "فیلم قدیمی؛ هدف · ۱۳۵۴", "Filmrangi", 6168, "2026-09-29")],
  "old-iranian-1354028": [publicYouTubeVideo("jkGGl4B4jqY", "فیلم رانده شده · ۱۳۵۴", "Persian Films Archive", 5816, "2026-09-29")],
  "old-iranian-1353049": [publicYouTubeVideo("D5UQvfRT1o8", "فیلم قدیمی؛ آقا مهدی وارد می شود · ۱۳۵۳", "Filmrangi", 4283, "2026-09-29")],
  "old-iranian-1354016": [publicYouTubeVideo("71lD0TLjnZA", "نسخه کامل فیلم فارسی قسم", "FilmFarsi", 6002, "2026-09-29")],
  "old-iranian-1354020": [publicYouTubeVideo("QV6Ni6_UV_w", "فیلم قدیمی؛ مشکی · ۱۳۵۴", "Filmrangi", 5417, "2026-09-29")],
};

// 2026-09-29 research batch: exact-title full films with a verified runtime
// over one hour. Modern films, clips and unrelated same-name results omitted.
const BATCH_ONE_HUNDRED_THIRTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354054": [publicYouTubeVideo("HK2al2rmnfg", "شاهرگ · فیلم کامل · ۱۳۵۴", "FilmFarsi", 5012, "2026-09-29")],
  "old-iranian-1354024": [publicYouTubeVideo("neRk7oMRnFM", "فیلم قدیمی؛ همت · ۱۳۵۴", "Filmrangi", 5369, "2026-09-29")],
  "old-iranian-1354056": [publicYouTubeVideo("SivepD-Tz5U", "عبور از مرز زندگی · ۱۳۵۴", "Donyayefilmfarsi", 4852, "2026-09-29")],
  "old-iranian-1354032": [publicYouTubeVideo("Jf-aKCm0liM", "فیلم زیبای مجازات · نسخه کامل", "Shouka Film", 6894, "2026-09-29")],
  "old-iranian-1354007": [publicYouTubeVideo("PvrZslImrrM", "فیلم ایرانی قدیمی هوس · ۱۳۵۴", "FARSI TOP", 6286, "2026-09-29")],
  "old-iranian-1354029": [publicYouTubeVideo("qfY-ePY1vvo", "فیلم قدیمی زیبای پررو · نسخه کامل", "Beykiha", 4256, "2026-09-29")],
  "old-iranian-1354043": [publicYouTubeVideo("m9yl9_OaW7Q", "فیلم قدیمی؛ اخم نکن سرکار · ۱۳۵۴", "Filmrangi", 5297, "2026-09-29")],
  "old-iranian-1354010": [publicYouTubeVideo("pT15jtiFgRk", "فرار از حجله · نسخه کامل", "Shouka Film", 5367, "2026-09-29")],
  "old-iranian-1354004": [publicYouTubeVideo("FYqvnfIbo6E", "فیلم سینمایی ایرانی زنبورک", "Persian Comedy Channel", 5644, "2026-09-29")],
  "old-iranian-1354005": [publicYouTubeVideo("GZWhqvbuiPI", "فیلم قدیمی؛ شبگرد · ۱۳۵۴", "Filmrangi", 5761, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title uploads with feature-length
// runtimes. Short versions and same-name modern titles are excluded.
const BATCH_ONE_HUNDRED_FOURTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354006": [publicYouTubeVideo("wa9vaMmvGr4", "فیلم قدیمی چشمان بسته · ۱۳۵۴", "FARSI TOP", 5437, "2026-09-29")],
  "old-iranian-1354009": [publicYouTubeVideo("YV7PKXbHBQo", "فیلم ایرانی قدیمی جنجال · ۱۳۵۴", "TimeTravel TV", 4566, "2026-09-29")],
  "old-iranian-1354011": [publicYouTubeVideo("5ewGztrA6Cs", "فیلم دزد سوم · ۱۳۵۴", "Persian Films Archive", 6262, "2026-09-29")],
  "old-iranian-1354013": [publicYouTubeVideo("FwzseVvDPxE", "فیلم قدیمی دفاع از ناموس · ۱۳۵۴", "Cinema Rex", 6360, "2026-09-29")],
  "old-iranian-1354022": [publicYouTubeVideo("O9vYMfDCr04", "نسخه کامل فیلم فارسی انگشت نما", "FilmFarsi", 5887, "2026-09-29")],
  "old-iranian-1354027": [publicYouTubeVideo("A6wK65mAB38", "فیلم شرف · ۱۳۵۴", "Persian Films Archive", 5720, "2026-09-29")],
  "old-iranian-1354030": [publicYouTubeVideo("T3FF0MsHgIk", "فیلم ایران قدیم فاصله · ۱۳۵۴", "سینما رنگارنگ", 5923, "2026-09-29")],
  "old-iranian-1354031": [publicYouTubeVideo("V096_3TCkMk", "فیلم فارسی بدون سانسور راننده اجباری", "FilmFarsi", 5814, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title matches with verified
// feature-length runtimes. Ambiguous same-name results and short clips are excluded.
const BATCH_ONE_HUNDRED_FIFTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354036": [publicYouTubeVideo("HZH64YsfBWY", "Farrash-bashi | 1354 | Full Movie", "Film Farsi", 7180, "2026-09-29")],
  "old-iranian-1354037": [publicYouTubeVideo("vFAT1RZOONs", "Taasob | 1354 | Full Movie", "FilmFarsi", 5302, "2026-09-29")],
  "old-iranian-1354040": [publicYouTubeVideo("meLTTixOrVs", "Raghib | 1354 | Full Movie", "Filmrangi", 6367, "2026-09-29")],
  "old-iranian-1354041": [publicYouTubeVideo("9rYtXc2NiG4", "Hichki Baba Nemisheh | 1354 | Full Movie", "Cinema Rangarang", 7025, "2026-09-29")],
  "old-iranian-1354042": [publicYouTubeVideo("EchVsNz6_vM", "Kineh | 1354 | Full Movie", "FilmFarsi", 5390, "2026-09-29")],
  "old-iranian-1354044": [publicYouTubeVideo("fK8Neo4P-fc", "Dokhtar Nagoo Bala Begoo | 1354 | Full Movie", "Mordegan Mohtaram", 5016, "2026-09-29")],
  "old-iranian-1354045": [publicYouTubeVideo("7dfwV8Hwen0", "Cheshm Entezar | 1354 | Full Movie", "Beykiha", 5594, "2026-09-29")],
  "old-iranian-1354046": [publicYouTubeVideo("RtpqqSt5XgE", "Hasrat | 1354 | Full Movie", "Beykiha", 6568, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title matches with independently
// checked feature-length runtimes. Duplicate and ambiguous year matches omitted.
const BATCH_ONE_HUNDRED_SIXTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354051": [publicYouTubeVideo("UgyQu0linbI", "Mard Na Aram | 1354 | Full Movie", "Beykiha", 5269, "2026-09-29")],
  "old-iranian-1354053": [publicYouTubeVideo("qzV7-IbzILc", "Be Omide Didar | 1354 | Full Movie", "Shouka Film", 5797, "2026-09-29")],
  "old-iranian-1354059": [publicYouTubeVideo("kizYrD1oCOw", "Do Aghaye Ba Shakhsiyat | 1354 | Full Movie", "Beykiha", 5977, "2026-09-29")],
  "old-iranian-1354062": [publicYouTubeVideo("9BIDZZ5egEk", "Madar Doostat Daram | 1354 | Full Movie", "Cinema Rex", 5890, "2026-09-29")],
  "old-iranian-1354021": [publicYouTubeVideo("vzKgy4zqY54", "Tabiate Bijan | 1354 | Full Movie", "Persian Films Archive", 5399, "2026-09-29")],
  "old-iranian-1353042": [publicYouTubeVideo("BpF8aEmrPoc", "Mosafer | 1353 | Full Movie", "Film Ghadimi Rangi", 5566, "2026-09-29")],
  "old-iranian-1352066": [publicYouTubeVideo("iV47jXhcPjo", "Saz Dahani | 1352 | Full Movie", "Amirbahador Zandi", 4406, "2026-09-29")],
  "old-iranian-1354012": [publicYouTubeVideo("dH6zlYifz3E", "Gharibeh Va Meh | 1354 | Full Movie", "Cine Persia", 7248, "2026-09-29")],
  "old-iranian-1353015": [publicYouTubeVideo("O30ckFCpWt8", "Zir-e Poost-e Shab | 1353 | Full Movie", "Rakhshan", 7160, "2026-09-29")],
};

// 2026-09-29 research batch: exact title/year-aligned full films with verified
// feature-length runtimes. Short and ambiguous same-name results are excluded.
const BATCH_ONE_HUNDRED_SEVENTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353055": [publicYouTubeVideo("5T1MBAuEcJA", "Farar Az Behesht | 1353 | Full Movie", "Global Vault TV", 6631, "2026-09-29")],
  "old-iranian-1353058": [publicYouTubeVideo("Xk9ywF5ybEk", "Maslakh | 1353 | Full Movie", "Global Vault TV", 5274, "2026-09-29")],
  "old-iranian-1353044": [publicYouTubeVideo("Pl9IDBiCO6w", "Ghafas | 1353 | Full Movie", "Persian Films Archive", 5447, "2026-09-29")],
  "old-iranian-1353028": [publicYouTubeVideo("pvnzzW_0vkU", "Sazesh | 1353 | Full Movie", "Shouka Film", 5941, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title matches with verified
// feature-length runtimes. Incomplete and same-name results are excluded.
const BATCH_ONE_HUNDRED_EIGHTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353030": [publicYouTubeVideo("uYLYkuS1SOg", "Javanmard | 1353 | Full Movie", "Cine Persia", 6440, "2026-09-29")],
  "old-iranian-1353040": [publicYouTubeVideo("RvZiNQ63-UU", "Salam Bar Eshgh | 1353 | Full Movie", "FilmFarsi", 5198, "2026-09-29")],
  "old-iranian-1353003": [publicYouTubeVideo("QsK4SiwkSoA", "Gol Pari Joon | 1353 | Full Movie", "Beykiha", 6440, "2026-09-29")],
  "old-iranian-1353010": [publicYouTubeVideo("cmuYiCqCSjo", "Gerogan | 1353 | Full Movie", "Filmrangi", 6239, "2026-09-29")],
  "old-iranian-1353014": [publicYouTubeVideo("4qyQLFB3lNo", "Hossein Ajan | 1353 | Full Movie", "Filmrangi", 5843, "2026-09-29")],
  "old-iranian-1353021": [publicYouTubeVideo("9hFT_iEd_SU", "Shohar-e Kerayei | 1353 | Full Movie", "Pars Video", 6011, "2026-09-29")],
  "old-iranian-1353012": [publicYouTubeVideo("8bK_Os6bDas", "Yavar | 1353 | Full Movie", "Beykiha", 5942, "2026-09-29")],
  "old-iranian-1353013": [publicYouTubeVideo("wSp3Oufr4_E", "Kaniz | 1353 | Full Movie", "Filmrangi", 7020, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title/year matches with verified
// feature-length runtimes. Search lookalikes and partial uploads are excluded.
const BATCH_ONE_HUNDRED_NINETEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353029": [publicYouTubeVideo("zCjRDVRurvU", "Mashin-e Mashti Mamdali | 1353 | Full Movie", "Cinema Rex", 5697, "2026-09-29")],
  "old-iranian-1353033": [publicYouTubeVideo("fbVWn0eqM5Q", "Aroos-e Pa-Berahne | 1353 | Full Movie", "Filmrangi", 6531, "2026-09-29")],
  "old-iranian-1353046": [publicYouTubeVideo("zwZyZi5wpEA", "Alaki Khosh | 1353 | Full Movie", "Filmrangi", 5942, "2026-09-29")],
  "old-iranian-1353022": [publicYouTubeVideo("1VyDDAwUBzM", "Bandeh Khoda | 1353 | Full Movie", "Filmrangi", 6300, "2026-09-29")],
  "old-iranian-1353005": [publicYouTubeVideo("YearyStuv7E", "Miram Baba Bekharam | 1353 | Full Movie", "Filmrangi", 6535, "2026-09-29")],
  "old-iranian-1353048": [publicYouTubeVideo("PaH9qCDr-HE", "Moosorkheh | 1353 | Full Movie", "Watch and Enjoy Movie", 5468, "2026-09-29")],
  "old-iranian-1353008": [publicYouTubeVideo("zC8HbSzY3bY", "Torkaman | 1353 | Full Movie", "Persian Films Archive", 6142, "2026-09-29")],
  "old-iranian-1352055": [publicYouTubeVideo("DGnw2kVAahg", "Salome | 1352 | Full Movie", "Filmrangi", 5877, "2026-09-29")],
  "old-iranian-1353039": [publicYouTubeVideo("7Ng91o94iAQ", "Hayahoo | 1353 | Full Movie", "Filmrangi", 5504, "2026-09-29")],
};

// 2026-09-29 research batch: direct, feature-length uploads matched to the
// archive title/year. Near-title variants and short excerpts are excluded.
const BATCH_ONE_HUNDRED_TWENTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353019": [publicYouTubeVideo("9jxl45C0Uc0", "Khoshgela Avazi Gereftin | 1353 | Full Movie", "Pars Film Studio", 5837, "2026-09-29")],
  "old-iranian-1353038": [publicYouTubeVideo("z9Rwn5Onu2Q", "In Dast Kaje | 1353 | Full Movie", "Filmrangi", 5104, "2026-09-29")],
  "old-iranian-1353001": [publicYouTubeVideo("hvsLZk4sPK4", "Ousta Karim Nokaretim | 1353 | Full Movie", "Pars Video", 5956, "2026-09-29")],
  "old-iranian-1353037": [publicYouTubeVideo("Og5VK8eMXZI", "Morgh-e Hamsayeh | 1353 | Full Movie", "Persian Comedy Channel", 6579, "2026-09-29")],
  "old-iranian-1352041": [publicYouTubeVideo("a8wGTmwI8fo", "Taher | 1352 | Full Movie", "FilmFarsi", 5654, "2026-09-29")],
  "old-iranian-1352079": [publicYouTubeVideo("LQE12AgmQVg", "Sharoor | 1352 | Full Movie", "Filmrangi", 5796, "2026-09-29")],
  "old-iranian-1353024": [publicYouTubeVideo("pSgvsNKLdLo", "Yaran | 1353 | Full Movie", "Filmrangi", 5937, "2026-09-29")],
  "old-iranian-1353025": [publicYouTubeVideo("BAYyxGSvggs", "Doctor va Raghasseh | 1353 | Full Movie", "Filmrangi", 6357, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title matches with verified
// feature-length runtimes. Trailers, clips and unrelated modern titles omitted.
const BATCH_ONE_HUNDRED_TWENTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353031": [publicYouTubeVideo("RqJTwUCFI3Y", "Mozaffar | 1353 | Full Movie", "Film Ghadimi Rangi", 4229, "2026-09-29")],
  "old-iranian-1353041": [publicYouTubeVideo("cm0tHBqmtGc", "Dorooghgoo-ye Koochooloo | 1353 | Full Movie", "FilmFarsi", 6171, "2026-09-29")],
  "old-iranian-1353045": [publicYouTubeVideo("IbPLA4Ko_gc", "Asrar-e Ganj-e Darreh-ye Jeni | 1353 | Full Movie", "Film Irooni", 9374, "2026-09-29")],
  "old-iranian-1353047": [publicYouTubeVideo("bSnWboEe6Q0", "Ab-e Tobe | 1353 | Full Movie", "Cinema Rangarang", 5686, "2026-09-29")],
  "old-iranian-1353052": [publicYouTubeVideo("MG9broZvsq8", "Mard-e Shab | 1353 | Full Movie", "Filmrangi", 6312, "2026-09-29")],
  "old-iranian-1353057": [publicYouTubeVideo("jOdulOqQ8Bw", "Mehdi Farangi | 1353 | Full Movie", "Cinema Rex", 5103, "2026-09-29")],
  "old-iranian-1353060": [publicYouTubeVideo("w0gb4C2jIwo", "Ab | 1353 | Full Movie", "Filmrangi", 4617, "2026-09-29")],
  "old-iranian-1353063": [publicYouTubeVideo("w6qgy1m8ik4", "Khashm-o Khoon | 1353 | Full Movie", "FilmFarsi", 5470, "2026-09-29")],
  "old-iranian-1353064": [publicYouTubeVideo("oeO3zkD9wDU", "Kowsar | 1353 | Full Movie", "Filmrangi", 5303, "2026-09-29")],
  "old-iranian-1352063": [publicYouTubeVideo("EDb6aaZXRqU", "Yek Etefagh Sadeh | 1352 | Full Movie", "Cine Persia", 4664, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title/year matches with verified
// feature-length runtimes. Short clips and unrelated modern results omitted.
const BATCH_ONE_HUNDRED_TWENTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352009": [publicYouTubeVideo("GXI9J9dWzJk", "Tangna | 1352 | Full Movie", "Filmrangi", 6039, "2026-09-29")],
  "old-iranian-1352016": [publicYouTubeVideo("2MuaJZNbbFI", "Khialati | 1352 | Full Movie", "Beykiha", 6689, "2026-09-29")],
  "old-iranian-1352031": [publicYouTubeVideo("1rUeQkud4zM", "Nemat Nafti | 1352 | Full Movie", "FilmFarsi", 6518, "2026-09-29")],
  "old-iranian-1352069": [publicYouTubeVideo("TAWDAGnnjsk", "Khorous | 1352 | Full Movie", "Hidalo Dust", 6468, "2026-09-29")],
  "old-iranian-1352077": [publicYouTubeVideo("tigJIc5spAE", "Mogholha | 1352 | Full Movie", "Mordegan Mohtaram", 6799, "2026-09-29")],
  "old-iranian-1352039": [publicYouTubeVideo("IuPGZUhuMbQ", "Ghesseh Shab | 1352 | Full Movie", "Beykiha", 6524, "2026-09-29")],
  "old-iranian-1352051": [publicYouTubeVideo("MhKZQrMmnXk", "Gorg-e Bizar | 1352 | Full Movie", "FilmFarsi", 5840, "2026-09-29")],
  "old-iranian-1352021": [publicYouTubeVideo("X4qXRk8TnCU", "Ghiamat-e Eshgh | 1352 | Full Movie", "Filmrangi", 5122, "2026-09-29")],
  "old-iranian-1352043": [publicYouTubeVideo("vfUBWBy0O8s", "Khak | 1352 | Full Movie", "Filmrangi", 6141, "2026-09-29")],
  "old-iranian-1352058": [publicYouTubeVideo("MmXID92UYeQ", "Nefrin | 1352 | Full Movie", "Filmrangi", 5041, "2026-09-29")],
};

// 2026-09-29 research batch: direct full-film uploads matched to archive
// title/year and checked for feature-length runtime.
const BATCH_ONE_HUNDRED_TWENTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351088": [publicYouTubeVideo("QOPvUTDxas4", "Sattar Khan | 1351 | Full Movie", "Persian Films Archive", 5143, "2026-09-29")],
  "old-iranian-1352027": [publicYouTubeVideo("t2oEJShNEH8", "Biqarar | 1352 | Full Movie", "Filmrangi", 5223, "2026-09-29")],
  "old-iranian-1352054": [publicYouTubeVideo("1M0E1MPD7TA", "Morvarid | 1352 | Full Movie", "Filmrangi", 6380, "2026-09-29")],
  "old-iranian-1351079": [publicYouTubeVideo("FvJ9XlcfG34", "Tavalodet Mobarak | 1351 | Full Movie", "Persian Films Archive", 6352, "2026-09-29")],
  "old-iranian-1352001": [publicYouTubeVideo("fPZbsdCi_Ac", "Jabbar Sarjookhe-ye Farari | 1352 | Full Movie", "Filmrangi", 6147, "2026-09-29")],
  "old-iranian-1352052": [publicYouTubeVideo("s1AOz4--xPA", "Kaj Kola Khan | 1352 | Full Movie", "Donyaye Tamasha", 7182, "2026-09-29")],
  "old-iranian-1352049": [publicYouTubeVideo("eAw9va1qdA4", "Hashtomin Rooz-e Hafte | 1352 | Full Movie", "Filmrangi", 5791, "2026-09-29")],
  "old-iranian-1352029": [publicYouTubeVideo("wgAQnSKdqx4", "Khoshgozaran | 1352 | Full Movie", "FARSI TOP", 5817, "2026-09-29")],
  "old-iranian-1352073": [publicYouTubeVideo("r0z2Y79HCyk", "Ghool | 1352 | Full Movie", "TimeTravel TV", 6047, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title/year matches with known
// feature-length runtime. Results without reliable duration are omitted.
const BATCH_ONE_HUNDRED_TWENTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352067": [publicYouTubeVideo("G56oyeve94Y", "Maghrebi | 1352 | Full Movie", "Mordegan Mohtaram", 4991, "2026-09-29")],
  "old-iranian-1352045": [publicYouTubeVideo("CQIkcddYESY", "Ali Konkouri | 1352 | Full Movie", "Persian Comedy Channel", 6118, "2026-09-29")],
  "old-iranian-1353017": [publicYouTubeVideo("MXFT5wHttck", "Aghaye Jahel | 1353 | Full Movie", "Film Haye Ghadimi", 6565, "2026-09-29")],
  "old-iranian-1352007": [publicYouTubeVideo("FZIZ0_g83NE", "Ki Daste Gol Beh Ab Dadeh | 1352 | Full Movie", "Filmrangi", 6057, "2026-09-29")],
  "old-iranian-1352013": [publicYouTubeVideo("_2QDqSLGB1c", "Bandari | 1352 | Full Movie", "Filmrangi", 5314, "2026-09-29")],
};

// 2026-09-29 research batch: direct YouTube uploads matched to the archive
// title/year and checked against a feature-length runtime source.
const BATCH_ONE_HUNDRED_TWENTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353043": [publicYouTubeVideo("qTYdG_eVv4Q", "Mosafer | 1353 | Full Movie", "MalayerBook Media", 4395, "2026-09-29")],
  "old-iranian-1353051": [publicYouTubeVideo("BhbP3qnOkww", "Golnesa in Paris | 1353 | Full Movie", "Cinema Rex", 6600, "2026-09-29")],
  "old-iranian-1352062": [publicYouTubeVideo("PuC-fLRxqX4", "The Kiss on Bloody Lips | 1352 | Full Movie", "FilmFarsi", 5400, "2026-09-29")],
  "old-iranian-1352002": [publicYouTubeVideo("wxAHo3Di2e0", "Kaka Siyah | 1352 | Full Movie", "FilmFarsi", 5580, "2026-09-29")],
  "old-iranian-1352011": [publicYouTubeVideo("_vEVtQaQewQ", "Papoosh | 1352 | Full Movie", "FilmFarsi", 6960, "2026-09-29")],
};

// 2026-09-29 research batch: exact archive-title/year matches with direct
// full-film uploads and feature-length runtime checks.
const BATCH_ONE_HUNDRED_TWENTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351012": [publicYouTubeVideo("Mj39CPWJ054", "Kafir | 1351 | Full Movie", "Persian Films Archive", 5460, "2026-09-29")],
  "old-iranian-1351020": [publicYouTubeVideo("9pRXzSFZowo", "Khaneh-ye Ghamar Khanom | 1351 | Full Movie", "FilmFarsi", 5400, "2026-09-29")],
  "old-iranian-1351076": [publicYouTubeVideo("JXLz3BQ5Tc8", "Mardi Dar Toofan | 1351 | Full Movie", "Cinema Rex", 6600, "2026-09-29")],
  "old-iranian-1351033": [publicYouTubeVideo("aXJd2c6G8Xs", "Fadaei | 1351 | Full Movie", "FilmFarsi", 6600, "2026-09-29")],
  "old-iranian-1351062": [publicYouTubeVideo("3pmVku2Ghy4", "Sadegh Kord | 1351 | Full Movie", "FilmFarsi", 6600, "2026-09-29")],
  "old-iranian-1351078": [publicYouTubeVideo("Yi_q_zYtTds", "Samad va Foolad Zereh Div | 1351 | Full Movie", "Cinema Ghadimiha", 7020, "2026-09-29")],
  "old-iranian-1351056": [publicYouTubeVideo("llygOd91J5Y", "Postchi | 1351 | Full Movie", "Persian Films Archive", 6420, "2026-09-29")],
  "old-iranian-1352008": [publicYouTubeVideo("y9bnXkbKZEQ", "Aramesh Dar Hozour-e Digaran | 1351 | Full Movie", "FilmFarsi", 5160, "2026-09-29")],
  "old-iranian-1351045": [publicYouTubeVideo("f-mTO9__koE", "Zafar | 1351 | Full Movie", "BabakFilm", 7200, "2026-09-29")],
};

const BATCH_ONE_HUNDRED_TWENTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352074": [publicYouTubeVideo("9ZahYQIip80", "Nakhoda Bakhoda | 1352 | Full Movie", "Old Iranian Films", undefined, "2026-09-29")],
  "old-iranian-1352032": [publicYouTubeVideo("sR-0dG9EIa8", "Gharib | 1352 | Full Movie", "Pars Films", undefined, "2026-09-29")],
  "old-iranian-1352056": [publicYouTubeVideo("4mx-80_6mnw", "Mahboob Bacheha | 1352 | Full Movie", "Filmrangi", 5880, "2026-09-29")],
  "old-iranian-1352060": [publicYouTubeVideo("XPKxZ9iVXKU", "Mekafat | 1352 | Full Movie", "Beykiha", undefined, "2026-09-29")],
  "old-iranian-1355047": [publicYouTubeVideo("JoZUQ6moOAU", "Bi Gonah | 1355 | Full Movie", "Persian Films Archive", undefined, "2026-09-29")],
  "old-iranian-1352034": [publicYouTubeVideo("et2cgkwZz5c", "Hariss | 1352 | Full Movie", "FilmFarsi", 5780, "2026-09-29")],
};

const BATCH_ONE_HUNDRED_TWENTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355055": [publicYouTubeVideo("0rt7Mi1Og5I", "Heeyoola | 1355 | Full Movie", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1355042": [publicYouTubeVideo("R0gSVF_H0uk", "Fanoos-e Khial | Full Movie", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1354017": [publicYouTubeVideo("AgmujYIZxEE", "Boof-e Koor | Full Movie", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1354035": [publicYouTubeVideo("3ErcGMDCGMQ", "Shab-e Gharibaan | 1354 | Full Movie", "Iroon video archive", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_TWENTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354039": [publicYouTubeVideo("wSO4SKsPv60", "Aslaheh | 1354 | Full Movie", "Old Iranian Films", undefined, "2026-09-30")],
  "old-iranian-1353016": [publicYouTubeVideo("gCtEljskE9E", "Dokhtaran-e Bala, Mardan-e Naqola | 1353 | Full Movie", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353004": [publicYouTubeVideo("MlMTwjiRHM4", "Morad Barghi va Haft Dokhtaroon | 1353 | Full Movie", "Iroon video archive", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352082": [publicYouTubeVideo("gf9xOvD_6ww", "Haft Delavar | 1352 | Full Movie", "Old Iranian Films", undefined, "2026-09-30")],
  "old-iranian-1352006": [publicYouTubeVideo("djgvv2tDmLU", "Zan-e Bakereh | 1352 | Full Movie", "Pars Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352071": [publicYouTubeVideo("x840wM3HE6U", "Ghorboon Har Chi Khoshgeleh | 1352 | Full Movie", "Persian Films Archive", 6600, "2026-09-30")],
  "old-iranian-1352023": [publicYouTubeVideo("Pe8wIF7NOIo", "Nakhoda | 1352 | Full Movie", "Filmrangi", 5640, "2026-09-30")],
  "old-iranian-1352046": [publicYouTubeVideo("1hnwDFUJ4X0", "Ghesse-ye Mahan | 1352 | Full Movie", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352028": [publicYouTubeVideo("jYOxAdhfDLY", "Agha Mehdi Kalle-Paz | 1352 | Full Movie", "YouTube archive", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352005": [publicYouTubeVideo("nmoROQVynjo", "Mashooqe | 1352 | Full Movie", "FilmFarsi archive", undefined, "2026-09-30")],
  "old-iranian-1352036": [publicYouTubeVideo("et-ByqTHctA", "Dar Akharin Lahzeh | 1352 | Full Movie", "Old Iranian Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352026": [publicYouTubeVideo("JcJOTIQUxH4", "Khorshid Dar Mordab | 1352 | Full Movie", "Pars Film", undefined, "2026-09-30")],
  "old-iranian-1352080": [publicYouTubeVideo("IjIBvazdi0M", "Tigh-e Aftab | 1352 | Full Movie", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352015": [publicYouTubeVideo("haf_wbLUPbU", "Holoo-ye Poost-Kandeh | 1352 | Full Movie", "Pars Film", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354026": [publicYouTubeVideo("kzBLbCtnZyA", "Kamin | 1354 | Full Movie", "Old Iranian Films", undefined, "2026-09-30")],
  "old-iranian-1353007": [publicYouTubeVideo("NTCKsQC001c", "Harjaei | 1353 | Full Movie", "Old Iranian Films", undefined, "2026-09-30")],
  "old-iranian-1352003": [publicYouTubeVideo("KFdxGW36-IM", "Parizad | 1352 | Full Movie", "Pars Film Official", 6840, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353023": [publicYouTubeVideo("5yBdnddnfD4", "Bezan Berim Dozdi | 1353 | Full Movie", "Pars Film", undefined, "2026-09-30")],
  "old-iranian-1352064": [publicYouTubeVideo("I3vCIjQCY7s", "Bi Hejab | 1352 | Full Movie", "Pars Film", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_THIRTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352012": [publicYouTubeVideo("E8Wzp3YYZow", "Ayalvar | 1352 | Full Movie", "Pars Film", undefined, "2026-09-30")],
  "old-iranian-1352017": [publicYouTubeVideo("Ad30K7arlsQ", "Keifar | 1352 | Full Movie", "Pars Film", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact-title full-film uploads from established
// Iranian-film channels. No trailer or short excerpt is added here.
const BATCH_ONE_HUNDRED_FORTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352020": [publicYouTubeVideo("Tj0pa3S2XVU", "فیلم کامل بدکاران", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1352053": [publicYouTubeVideo("ApPX7OLz_Fc", "فیلم کامل مترس", "بیکی ها", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352018": [publicYouTubeVideo("C5mShwyO6EU", "فیلم جنوبی | ۱۳۵۲ | نسخه کامل", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1352037": [publicYouTubeVideo("CV6U4Kv74ZI", "نسخه کامل فیلم فارسی عروس و مادر شوهر", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1352047": [publicYouTubeVideo("FYA_5yQK3iE", "فیلم صخره سیاه | ۱۳۵۲ | نسخه کامل", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1352061": [publicYouTubeVideo("yX4NGBFu0Lk", "فیلم دل خودش می‌خواد | ۱۳۵۲ | نسخه کامل", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1352075": [publicYouTubeVideo("FAAFCsEMUe8", "فیلم کامل تنها و گل‌ها | ۱۳۵۲", "Pars Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352050": [publicYouTubeVideo("GXG1kr8pndU", "فیلم شورش | ۱۳۵۲ | نسخه کامل", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1352057": [publicYouTubeVideo("hlgJgGZu-cc", "نسخه کامل فیلم فارسی پسرخوانده", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1352081": [publicYouTubeVideo("kTMsWSYa_yA", "نسخه کامل فیلم فارسی بیگانه", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1353018": [publicYouTubeVideo("-utRG0bsl5c", "فیلم کامل سر طلایی", "فیلم‌های ایرانی", undefined, "2026-09-30")],
  "old-iranian-1351084": [publicYouTubeVideo("xGFgQ4ZkkJQ", "نسخه کامل فیلم فارسی صبح روز چهارم", "FilmFarsi", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact-title full-film uploads. Runtime checks
// against film references excluded short excerpts and unrelated results.
const BATCH_ONE_HUNDRED_FORTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352065": [publicYouTubeVideo("mlM8ZAo5FaU", "نسخه کامل فیلم فارسی قربون زن ایرونی", "FilmFarsi", 5820, "2026-09-30")],
  "old-iranian-1352040": [publicYouTubeVideo("Hj6_I1lDVUU", "فیلم کامل گدای میلیونر", "بیکی‌ها", 6120, "2026-09-30")],
  "old-iranian-1351057": [publicYouTubeVideo("iAkM3gNiKVI", "فیلم کامل سینمایی جهنم + من", "Tasvir Parse", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351080": [publicYouTubeVideo("NxiPYTQMEfE", "نسخه کامل فیلم فارسی تختخواب سه نفره", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351086": [publicYouTubeVideo("pI325KKXq6g", "فیلم بدون سانسور یک میلیونر و دو مفلس - نسخه کامل و رنگی", "Persian Films Archive", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350069": [publicYouTubeVideo("6xSJ8y7Ffqk", "فیلم کامل رشید", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351001": [publicYouTubeVideo("jVFUAbEeF2U", "فیلم قدیمی مهدی مشکی و شلوارک داغ | نسخه بی سانسور", "فیلم قدیمی رنگی", undefined, "2026-09-30")],
  "old-iranian-1351006": [publicYouTubeVideo("PeNquB4Nyng", "فیلم کامل حسن دینامیت", "بیکی ها", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351085": [publicYouTubeVideo("g3dDl0dMfEQ", "نسخه کامل فیلم قدیمی چشمه | ۱۳۵۱", "فیلم‌های ایرانی", undefined, "2026-09-30")],
  "old-iranian-1351005": [publicYouTubeVideo("GOr4C2PLzHM", "فیلم کامل قلندر", "فیلم قدیمی رنگی", undefined, "2026-09-30")],
  "old-iranian-1351059": [publicYouTubeVideo("1gXWkwbRPNw", "فیلم کامل حسن سیاه | بدون سانسور HD", "Shouka Film", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351066": [publicYouTubeVideo("bnAnRUQEeeA", "نسخه کامل فیلم قدیمی آبنبات چوبی | ۱۳۵۱", "فیلم‌های ایرانی", undefined, "2026-09-30")],
  "old-iranian-1351029": [publicYouTubeVideo("u9mb5oBwL5U", "فیلم کامل مرد اجاره‌ای", "بیکی ها", undefined, "2026-09-30")],
  "old-iranian-1351030": [publicYouTubeVideo("2R-TnwLm-R8", "فیلم کامل گذر اکبر", "بیکی ها", undefined, "2026-09-30")],
  "old-iranian-1351065": [publicYouTubeVideo("dwMu2WiYcd4", "فیلم کامل فاتح دلها", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FORTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351042": [publicYouTubeVideo("AiMkkS8imCI", "فیلم کامل غریبه", "ایرانیمه", undefined, "2026-09-30")],
  "old-iranian-1351087": [publicYouTubeVideo("bWvTnAx3XMQ", "نسخه کامل فیلم فارسی مستاجر", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351007": [publicYouTubeVideo("T1rczg4UGrs", "نسخه کامل فیلم فارسی علی سورچی", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351067": [publicYouTubeVideo("5oac262A7Q8", "نسخه کامل فیلم فارسی تشنه باران", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351051": [publicYouTubeVideo("xYUiReKgVfM", "فیلم کامل ایرانی خانواده سرکار غضنفر | بدون سانسور", "Persian Comedy Channel", undefined, "2026-09-30")],
  "old-iranian-1351050": [publicYouTubeVideo("UAiJsp_Ucak", "فیلم کامل کاکل زری", "بیکی ها", undefined, "2026-09-30")],
  "old-iranian-1351036": [publicYouTubeVideo("exaAONTMEh8", "نسخه کامل فیلم قدیمی آشوبگر | ۱۳۵۱", "فیلم‌های ایرانی", undefined, "2026-09-30")],
  "old-iranian-1351037": [publicYouTubeVideo("c2X9mZgACNs", "نسخه کامل فیلم فارسی ساحره", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351010": [publicYouTubeVideo("MxSmT0eL6_Q", "نسخه کامل فیلم فارسی قدیر", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351090": [publicYouTubeVideo("lt3O-KqjICY", "فیلم کامل پری خوشگله", "فیلم قدیمی رنگی", undefined, "2026-09-30")],
  "old-iranian-1351089": [publicYouTubeVideo("TyOQqH2pF1U", "نسخه کامل فیلم فارسی ضعیفه", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351081": [publicYouTubeVideo("cs-NWEM3Sl8", "فیلم قدیمی - فیلم کامل مردان خلیج", "فیلم‌های ایرانی", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351016": [publicYouTubeVideo("ET9DPUv2e8g", "فیلم کامل احمد چوپان", "بیکی ها", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351025": [publicYouTubeVideo("s9WIgVR_w48", "فیلم کامل ایرانی اتل متل توتوله | بدون سانسور", "Persian Comedy Channel", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351040": [publicYouTubeVideo("OhAxZpViVrk", "Motreb (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351055": [publicYouTubeVideo("aaPGoVshnVs", "The Hour of Calamity (1972) - full film - 112 minutes", "FilmFarsi", 6720, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_FIFTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351071": [publicYouTubeVideo("h36L8tfQVpE", "The Dagger (1972) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351043": [publicYouTubeVideo("4mXUCNY4pIc", "Baba Nan Dad (1972) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351046": [publicYouTubeVideo("5_Z_QVEQr-Y", "Baluch (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1352078": [publicYouTubeVideo("PKzkuphoo3w", "Mostafa Loreh (1973) - full film", "FilmFarsi", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_FIFTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352014": [publicYouTubeVideo("dx3wmZ0Ts34", "Manic (1973) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351023": [publicYouTubeVideo("ia9Q9fAbKcg", "Chubby (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351038": [publicYouTubeVideo("qACqqgnRZas", "Life Gambling (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351028": [publicYouTubeVideo("pmKEPWmNVcM", "Prodigies (1972) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351048": [publicYouTubeVideo("xMa0ooGtM1c", "The White Clove (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351052": [publicYouTubeVideo("ZxmDq_7N58I", "Boatmen (1972) - full film", "Lalezar", undefined, "2026-09-30")],
  "old-iranian-1351061": [publicYouTubeVideo("G1t74co2Z1M", "The sergeant major and the cop (1972) - full film", "Pars Films", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_FIFTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351063": [publicYouTubeVideo("GoiXr3F2Ju4", "Navvab (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351018": [publicYouTubeVideo("GHVm5qImI0E", "Jadal dar Kavir (1972) - full film", "Shouka Film", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_FIFTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351054": [publicYouTubeVideo("vZtGzJhEydI", "Khar-e Dajjal (1972) - full film", "Iranian Movies", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_SIXTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351058": [publicYouTubeVideo("7oNEmbLk-Xw", "Master Sergeant (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351024": [publicYouTubeVideo("UHK-ac9f9gM", "The Lover (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351004": [publicYouTubeVideo("IbmwBSiQX8o", "Cunning Reza (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350068": [publicYouTubeVideo("Jl8IkoqvEbg", "Noghre-dagh (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351073": [publicYouTubeVideo("qWXaOOIGVnY", "The only Man in the Neighborhood (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_SIXTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351072": [publicYouTubeVideo("AVdRtI-7Iqc", "Shir Too Shir (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350007": [publicYouTubeVideo("Fv5ftNBLAws", "The Carriage Driver (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350012": [publicYouTubeVideo("XbIKAlcy4r4", "Hot Sensation (1971) - full film", "Pars Films", undefined, "2026-09-30")],
};
const BATCH_ONE_HUNDRED_SIXTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353056": [publicYouTubeVideo("FG9JCrulGz0", "Shazdeh Ehtejab (1974) - full film", "Film O Honar", undefined, "2026-09-30")],
  "old-iranian-1352068": [publicYouTubeVideo("4jyjwWhVzYM", "The Chase to Hell (1973) - full film", "Film Ghadimi", undefined, "2026-09-30")],
  "old-iranian-1351027": [publicYouTubeVideo("omLSC45rfNo", "The Suitor (1972) - full film", "Persian Films Archive", undefined, "2026-09-30")],
  "old-iranian-1351026": [publicYouTubeVideo("L1G8JnIDMMA", "Morghe Tokhm Tala (1972) - full film", "Dele Zaman", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact archive-title matches from public Iranian
// cinema channels. Clips, trailers and similarly named uploads were excluded.
const BATCH_ONE_HUNDRED_SIXTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352025": [publicYouTubeVideo("rl-J1yiwW9E", "Escape from Death (1973) - full film", "Beykiha", undefined, "2026-09-30")],
  "old-iranian-1351015": [publicYouTubeVideo("2mvocsKYMe4", "Ragbar (1972) - full film", "Persian Films Archive", undefined, "2026-09-30")],
  "old-iranian-1351074": [publicYouTubeVideo("dwX1dbyLnRc", "Pedar ke na-khalaf oftad (1972) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1351008": [publicYouTubeVideo("yKa3-LYZWoc", "The Golden Waterfall (1972) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351014": [publicYouTubeVideo("zIw_BolG_MA", "Ba Sharafha (1972) - full film", "Film Ghadimi Official", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: additional exact 1351-title matches. The
// selected uploads are presented as complete films by their source channels.
const BATCH_ONE_HUNDRED_SIXTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351035": [publicYouTubeVideo("LeWfFcx-MMw", "Kheyli Ham Mamnoon (1972) - full film", "Beykiha", undefined, "2026-09-30")],
  "old-iranian-1351034": [publicYouTubeVideo("QDYLJNQ_il4", "Pakhmeh (1972) - full film", "Hezar-o Yek Shab", undefined, "2026-09-30")],
  "old-iranian-1351064": [publicYouTubeVideo("w_6jxnlFGmE", "Hamisheh Ghahreman (1972) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351075": [publicYouTubeVideo("JAWEJ5clEJM", "Shirbaha (1972) - full film", "Beykiha", undefined, "2026-09-30")],
  "old-iranian-1351083": [publicYouTubeVideo("Kz5ueF03SDQ", "Khanoom Khanooma (1972) - full film", "Pars Films", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact feature-film matches from public Iranian
// cinema channels. Short clips and unrelated uploads were excluded.
const BATCH_ONE_HUNDRED_SIXTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350033": [publicYouTubeVideo("y9uC-XoxFmE", "Escape from the Trap (1971) - full film", "Nabat", undefined, "2026-09-30")],
  "old-iranian-1350061": [publicYouTubeVideo("YdZjYAOkAUI", "A Man and a City (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350054": [publicYouTubeVideo("i3c_uKDU04Q", "Gholam Jandarm (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350063": [publicYouTubeVideo("IUg1V_N3z2s", "Adamak (1971) - full film", "Persian film", undefined, "2026-09-30")],
  "old-iranian-1351032": [publicYouTubeVideo("4RBYDKzM_Bo", "Fetne in Boots (1972) - full film", "Persian Films Archive", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: additional exact 1350-title feature matches.
const BATCH_ONE_HUNDRED_SIXTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350079": [publicYouTubeVideo("qcAcTfvh0TM", "Starless Sky (1971) - full film", "Cinema Rex", undefined, "2026-09-30")],
  "old-iranian-1350043": [publicYouTubeVideo("q4pqGEW4Ylk", "Trees Die Standing (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350037": [publicYouTubeVideo("B1-5P0yHXAI", "Looti (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350077": [publicYouTubeVideo("Tnp3H575ZZs", "The Glass Wall (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350046": [publicYouTubeVideo("qX_K80x_C9Q", "The Most Beautiful Woman in the World (1971) - full film", "Cinema Rex", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact archive-title matches from established
// Iranian cinema channels, with duration metadata where the source provides it.
const BATCH_ONE_HUNDRED_SIXTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350002": [publicYouTubeVideo("ka0XBl3KI7o", "Ayyoob (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350053": [publicYouTubeVideo("Q0RXucj01pg", "Howff of Anger (1971) - full film", "Pars Film Official", 5460, "2026-09-30")],
  "old-iranian-1349057": [publicYouTubeVideo("y7hh7S3r7PY", "Night of the Execution (1970) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1351039": [publicYouTubeVideo("THjaj0b-o1k", "Sun City (1972) - full film", "Pars Film Official", 5760, "2026-09-30")],
};

// 2026-09-30 research batch: exact 1351-title feature matches. The short
// trailer result for Fetaneh was deliberately excluded from this batch.
const BATCH_ONE_HUNDRED_SIXTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351009": [publicYouTubeVideo("8J3sTqAzN24", "Repentance (1972) - full film", "Beykiha", undefined, "2026-09-30")],
  "old-iranian-1351019": [publicYouTubeVideo("YDTKfV8lhdc", "Escaping from Life (1972) - full film", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1351017": [publicYouTubeVideo("ha8N9UzaSWg", "The Saving Angel (1972) - full film", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1351092": [publicYouTubeVideo("d974u5msmjs", "How Scary Is the Darkness of the Soul (1972) - full film", "passargad10", 3600, "2026-09-30")],
};

// 2026-09-30 research batch: exact 1350-title feature matches, including
// source-reported runtimes for the two long-form uploads that provide them.
const BATCH_ONE_HUNDRED_SIXTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350018": [publicYouTubeVideo("3UYc9I0z8Rg", "Mah-pishooni (1971) - full film", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1350058": [publicYouTubeVideo("RAb-B1mJszQ", "Beautiful of the Neighborhood (1971) - full film", "Film Ghadimi Rangi", undefined, "2026-09-30")],
  "old-iranian-1350030": [publicYouTubeVideo("iXmO17jESAU", "Die Hard (1971) - full film", "Pars Film Official", 5640, "2026-09-30")],
  "old-iranian-1350005": [publicYouTubeVideo("KAjJNJ9x1nM", "The Bridge (1971) - full film", "Pars Film Official", 5400, "2026-09-30")],
};

// 2026-09-30 research batch: exact title matches for full-length YouTube uploads.
const BATCH_ONE_HUNDRED_SEVENTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1352084": [publicYouTubeVideo("fGv6HEaZEBg", "Do Kabootar (1973) - full film", "Shouka Film", undefined, "2026-09-30")],
  "old-iranian-1351082": [publicYouTubeVideo("exaAONTMEh8", "The Insurgent (1972) - full film", "Iranian Movies", undefined, "2026-09-30")],
  "old-iranian-1350072": [publicYouTubeVideo("3dVo_8s1ICQ", "The Interim Husband (1971) - full film", "YouTube archive", undefined, "2026-09-30")],
  "old-iranian-1351049": [publicYouTubeVideo("gGsa_Q84cP0", "Fataneh (1972) - full film", "Film Ghadimi", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: three more exact title/year full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350076": [publicYouTubeVideo("QPuMa3hcsb0", "A Suitcaseful of Sex (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350003": [publicYouTubeVideo("Qnm03EujMaM", "One Beautiful and 1000 Problems (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350055": [publicYouTubeVideo("_a6X4JRnRLA", "Heydar (1971) - full film", "Pars Film Official", 5040, "2026-09-30")],
};

// 2026-09-30 research batch: three exact 1350 full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350052": [publicYouTubeVideo("SPwOHlcs8Yg", "The Wedding Night (1971) - full film", "Film Ghadimi", undefined, "2026-09-30")],
  "old-iranian-1350032": [publicYouTubeVideo("JF58DXLTCSE", "The Spectacle (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350021": [publicYouTubeVideo("Q4pJxYw7rJ4", "Shater Abbas (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: three exact 1350 full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350010": [publicYouTubeVideo("CaBIsgeHnZg", "Faryad (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350029": [publicYouTubeVideo("7GZuXvigSyI", "Inverted Life (1971) - full film", "Pars Film Official", 5400, "2026-09-30")],
  "old-iranian-1350045": [publicYouTubeVideo("YOZciq1J16A", "Mard Afkan (1971) - full film", "Pars Films", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact 1351 full-film uploads with source runtime.
const BATCH_ONE_HUNDRED_SEVENTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1351053": [publicYouTubeVideo("lVNbpdKfsEs", "Yek Jo Gheyrat (1972) - full film", "Film Ghadimi", undefined, "2026-09-30")],
  "old-iranian-1351068": [publicYouTubeVideo("_rjwRCWf0us", "Toghrul (1972) - full film", "Pars Film Official", 5460, "2026-09-30")],
};

// 2026-09-30 research batch: exact title/year full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350051": [publicYouTubeVideo("WDjTalRAuAg", "The Scandal of Love (1971) - full film", "Pars Film Official", undefined, "2026-09-30")],
  "old-iranian-1350084": [publicYouTubeVideo("2nId-SKolvY", "Three Fearless Heroes (1971) - full film", "Pars Film Official", 5340, "2026-09-30")],
};

// 2026-09-30 research batch: exact title/year full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350048": [publicYouTubeVideo("aLMMgFSTdMU", "Furious Men (1971) - full film", "Pars Films", 6660, "2026-09-30")],
  "old-iranian-1350017": [publicYouTubeVideo("QVY8CpHNja0", "Ahmad Chakme-ee (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

// 2026-09-30 research batch: exact title/year full-film uploads.
const BATCH_ONE_HUNDRED_SEVENTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350011": [publicYouTubeVideo("cGX97x9tcUI", "Men of the Dawn (1971) - full film", "Pars Film Official", 5400, "2026-09-30")],
  "old-iranian-1349056": [publicYouTubeVideo("_GFGslIpwPA", "Dokhtar-e Zalem-Bala (1971) - full film", "Pars Film Official", 5400, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_SEVENTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350038": [publicYouTubeVideo("hMr9KoFpn8U", "The World Is Mine (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350022": [publicYouTubeVideo("OrfZBuiZ_lE", "The Hero Mofrad (1971) - full film", "Pars Film Official", 5400, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_SEVENTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350074": [publicYouTubeVideo("mnx5N9OsKOI", "For Whom the Hearts Beat (1971) - full film", "Pars Film Official", 5520, "2026-09-30")],
  "old-iranian-1350008": [publicYouTubeVideo("gEsyQisoOcY", "Nobar-e Esfahan (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350019": [publicYouTubeVideo("tyJvw5Dqq9A", "Ra'd o Bargh (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350049": [publicYouTubeVideo("JUfIDKVbmLY", "Goodbye, My Friend (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350034": [publicYouTubeVideo("NoGxpgwSREA", "Sharareh (1971) - full film", "Cinema Rex", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349064": [publicYouTubeVideo("EHBsipJcc5Q", "The Jungle Man (1970) - full film", "Pars Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357027": [publicYouTubeVideo("nlk2i3UXml8", "Mobarzi dar Nimeye Rah / Shab-e Bazigaran (1978) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350050": [publicYouTubeVideo("hTrzk7P-I1k", "Reza Chelchele (1971) - full film", "Beikiha", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350065": [publicYouTubeVideo("WPe46pn0jvI", "Badnam (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350073": [publicYouTubeVideo("01ofDJRTEwY", "Raze Derakhte Senjed (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350070": [publicYouTubeVideo("lFNvw67sxn4", "Aziz Gherghi (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350028": [publicYouTubeVideo("ZtqlLX6r-6s", "Vahshi-ye Jangal (1971) - full film", "YouTube", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_EIGHTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347048": [publicYouTubeVideo("zaOrPfROSGk", "Shohare Ahoo Khanoom (1969) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349015": [publicYouTubeVideo("39ioR8UAYQI", "Azhir-e Khatari (1970) - full film", "Pars Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350004": [publicYouTubeVideo("UhgYDZi7IvA", "Fatehin-e Sahra (1971) - full film", "Beikiha", undefined, "2026-09-30")],
  "old-iranian-1349026": [publicYouTubeVideo("ThLj3OYmgx0", "Saghi (1970) - full film", "Pars Films", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350013": [publicYouTubeVideo("WcwmeJP5kRk", "Se Ghap (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350057": [publicYouTubeVideo("FNECupP7c3M", "Bedeh Dar Rahe Khoda (1971) - full film", "Pars Films", undefined, "2026-09-30")],
  "old-iranian-1350078": [publicYouTubeVideo("dSQVG6BViDA", "Alkoli (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350014": [publicYouTubeVideo("OQGvVWTB16Q", "Shohar-e Pastorize (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1350027": [publicYouTubeVideo("k3_Fi4V7V8Y", "Eshghiha (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
  "old-iranian-1349049": [publicYouTubeVideo("iVXkZayeJTw", "The Pretty Pickpocket (1971) - full film", "Cinema Rex", undefined, "2026-09-30")],
  "old-iranian-1350083": [publicYouTubeVideo("xQ9Y2eWw9jo", "The Story of a Thief (1971) - full film", "Filmrangi", 5400, "2026-09-30")],
  "old-iranian-1351002": [publicYouTubeVideo("2WDHA0-bqg0", "An Isfahani in New York (1972) - full film", "Iran Ghadim", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350020": [publicYouTubeVideo("Vu0HdETns24", "Tricksters (1971) - full film", "Lalehzar", undefined, "2026-09-30")],
  "old-iranian-1350026": [publicYouTubeVideo("PGByxY8rMzw", "Three Villains (1971) - full film", "1001 Shab", undefined, "2026-09-30")],
  "old-iranian-1350082": [publicYouTubeVideo("u8PeY3wlHFI", "It Happened in America (1971) - full film", "FilmFarsi", undefined, "2026-09-30")],
};

const BATCH_ONE_HUNDRED_NINETY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350056": [publicYouTubeVideo("N2YplR_WTs8", "Hero in the Atomic Age (1971) - full film", "Filmrangi", 5460, "2026-09-30")],
  "old-iranian-1350080": [publicYouTubeVideo("h3yaR5MsIeQ", "Rainbow (1971) - full film", "Lalehzar", undefined, "2026-09-30")],
};

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

// Third review batch: direct YouTube search results matched against the next
// fifty catalogue entries. Short clips, trailers, and title mismatches stay
// excluded even when the search result is otherwise public.
const BATCH_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1359001": [publicYouTubeVideo("D__QXGQwUok", "فیلم پرواز در قفس از حبیب کاوش سال 1357", "Persian Films Archive", 6410)],
  "old-iranian-1358031": [publicYouTubeVideo("ngY_5pibLZU", "فیلم عبور از مرز شب ۱۳۵۷", "دوبله کلاسیک", 6188)],
  "old-iranian-1358025": [publicYouTubeVideo("bfisG2HDaLc", "فیلم سایه های بلند باد", "Mori", 6450)],
  "old-iranian-1358008": [publicYouTubeVideo("mboMHPwHOQ0", "The Crystal Garden Persian Film | Classic Film", "FilmFarsi - فیلمفارسی", 6085)],
  "old-iranian-1358023": [publicYouTubeVideo("atRJTT8eDQ8", "فیلم ایرانی کامل و بدون سانسور | بر فراز آسمان‌ها", "Cine Persia", 5892)],
  "old-iranian-1359007": [publicYouTubeVideo("C5WVZ_hIsHA", "Classic Persian Film: A Tear Falls Tonight", "FilmFarsi - فیلمفارسی", 5891)],
  "old-iranian-1358007": [publicYouTubeVideo("PuralgNAqcc", "فیلم فریاد مجاهد | مهدی معدنیان | ۱۳۵۸", "mehranshargh", 5935)],
  "old-iranian-1358018": [publicYouTubeVideo("_n6eEyJg5Rs", "Film Tekye Bar Baad - Full Movie | فیلم سینمایی تکیه بر باد", "FilmNama", 4828)],
  "old-iranian-1358027": [publicYouTubeVideo("H8DsdUla9Pg", "فیلم کامل خیابانی‌ها", "بیکی ها", 6402)],
  "old-iranian-1357012": [publicYouTubeVideo("IupJrr5TKE4", "نسخه کامل فیلم مرثیه از امیر نادری بدون سانسور", "4uTube", 6122)],
  "old-iranian-1357021": [publicYouTubeVideo("tQ_ze0qxeGU", "صمد دربدر می شود", "Pars Video", 5526)],
  "old-iranian-1358010": [publicYouTubeVideo("z0_MzDsecow", "فیلم ساخت ایران از امیر نادری سال 1357", "Persian Films Archive", 5177)],
  "old-iranian-1359005": [publicYouTubeVideo("RCvGrhUo6CU", "نفس بریده، محصول 1357", "SAEED ARIAEE", 5852)],
  "old-iranian-1357001": [publicYouTubeVideo("fy9RkfAp4U0", "فیلم قدیمی؛ کوسه جنوب | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6483)],
  "old-iranian-1357015": [publicYouTubeVideo("555UuGAdTbo", "سفر سنگ؛ Journey of the Stone (1978)", "Global Vault TV", 6386)],
  "old-iranian-1357033": [publicYouTubeVideo("wsg6rOvb_B4", "caravans (1978) فیلم کاروانها دوبله فارسی", "فیلم فارسی", 7160)],
  "old-iranian-1358002": [publicYouTubeVideo("ikFjsNdiLyo", "فیلم قدیمی؛ به دادم برس رفیق | ۱۳۵۷ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5871)],
  "old-iranian-1358009": [publicYouTubeVideo("qBpOAA0LobI", "ایرج قادری در فیلم زیبای لبه تیغ - نسخه کامل", "Shouka Film", 5874)],
  "old-iranian-1356050": [publicYouTubeVideo("6-rPOdeYN2Q", "فیلم قدیمی؛ تشنه باران | ۱۳۵۷ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5579)],
  "old-iranian-1357016": [publicYouTubeVideo("N-u4Uk7vY0c", "خان نایب | بدون حذفیات و با کیفیت", "Shouka Film", 4411)],
  "old-iranian-1358029": [publicYouTubeVideo("N-zdZ7OXu48", "فیلم قدیمی سرنوشت‌سازان | کیفیت بالا", "بیکی ها", 5874)],
  "old-iranian-1358030": [publicYouTubeVideo("3ii-cuJEZvg", "فیلم فارسی زخم خنجر رفیق", "FilmFarsi - فیلمفارسی", 5165)],
  "old-iranian-1357005": [publicYouTubeVideo("jNwte0jdh74", "Dayereh Mina 1978 | فیلم دایره مینا", "maher", 5934)],
  "old-iranian-1358015": [publicYouTubeVideo("ACvYrNYFD98", "بن بست، پرویز صیاد", "Shahrouz Tavakol", 4535)],
  "old-iranian-1356035": [publicYouTubeVideo("1a8Tj1d9m8k", "فیلم کلاغ 1356", "Mori", 6839)],
  "old-iranian-1357013": [publicYouTubeVideo("ax-K_UwzWtE", "فیلم ایرانی بوی گندم | Persian Movie Booye Gandom", "TPM - Top Persian Movies", 5081)],
  "old-iranian-1356032": [publicYouTubeVideo("d2OTZg7suVQ", "Gozāresh (1977) | The Report | گزارش", "Enes Çinkay", 6567)],
  "old-iranian-1356024": [publicYouTubeVideo("BawtJ0hYHOs", "شب آفتابی - ۱۳۵۶", "Film O Honar", 6134)],
  "old-iranian-1356036": [publicYouTubeVideo("u4LXfT7yCNw", "فیلم سینمایی ایرانی یکی خوش‌صدا، یکی خوش‌دست", "Persian Comedy Channel", 5018)],
  "old-iranian-1356004": [publicYouTubeVideo("awmGWn_IFw0", "فیلم قبل انقلاب فریاد زیر آب", "Shouka Film", 6112)],
  "old-iranian-1356022": [publicYouTubeVideo("-Lm5qg9x-S4", "فیلم بدون سانسور عشق و خشونت", "Shouka Film", 5110)],
  "old-iranian-1357011": [publicYouTubeVideo("SoknEzP9eqY", "فیلم قدیمی؛ طوطی | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6266)],
};

// Fourth review batch: the next fifty catalogue entries searched by exact
// Persian title and year. Only one-hour-plus results are active.
const BATCH_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357024": [publicYouTubeVideo("g7mIMxifxPo", "فیلم کامل ماجراهای علاءالدین و چراغ جادو", "Cinema Rex", 5815)],
  "old-iranian-1358028": [publicYouTubeVideo("Uw-YEkOVpQ8", "گدای اشراف زاده - ۱۳۵۷", "Film O Honar", 7137)],
  "old-iranian-1358017": [publicYouTubeVideo("zP37YCOKgkk", "فیلم قدیمی؛ تا آخرین نفس | ۱۳۵۷ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5113)],
  "old-iranian-1358011": [publicYouTubeVideo("wveiQNQtL6w", "فیلم قدیمی حق و ناحق | با بازی بهمن مفید", "بیکی ها", 7229)],
  "old-iranian-1356034": [publicYouTubeVideo("zKpbeavWUro", "فیلم خاک سر به مهر | The Sealed Soil (1977)", "Reza Rosebud", 5456)],
  "old-iranian-1356012": [publicYouTubeVideo("9nkanvU5hQI", "همراهان | فیلم کامل بدون سانسور | Hamrahan 1977", "Global Vault TV", 5886)],
  "old-iranian-1356006": [publicYouTubeVideo("4pU_USar-MA", "فیلم قدیمی؛ واسطه‌ها | ۱۳۵۶ | رنگی مرمت شده", "Filmrangi - فیلمرنگی", 6394)],
  "old-iranian-1356020": [publicYouTubeVideo("9i4Ikj9tiVQ", "فیلم کامل هزار بار مردن", "FilmFarsi - فیلمفارسی", 5726)],
  "old-iranian-1356039": [publicYouTubeVideo("m8MVr29ve0M", "Full Movie of Johnny and the Chubby One", "FilmFarsi - فیلمفارسی", 5404)],
  "old-iranian-1356013": [publicYouTubeVideo("EKzN1ldZ1x0", "فیلم پشت و خنجر از ایرج قادری سال 1356", "Persian Films Archive", 6347)],
  "old-iranian-1358001": [publicYouTubeVideo("StwqjNurh7I", "فیلم قدیمی؛ حکم تیر | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6421)],
  "old-iranian-1357003": [publicYouTubeVideo("ASaNek7_eO0", "Persian Film: The Lor Goes to the City", "FilmFarsi - فیلمفارسی", 4835)],
  "old-iranian-1357009": [publicYouTubeVideo("cZnUll5UHwk", "منوچهر وثوق در فیلم سه دلباخته", "Shouka Film", 4872)],
  "old-iranian-1356026": [publicYouTubeVideo("gbSlyH1cw7s", "فیلم حرمت رفیق از عباس کسایی سال 1356", "Persian Films Archive", 6740)],
  "old-iranian-1357002": [publicYouTubeVideo("Yy5ltFfjE6g", "فیلم کامل سرسپرده", "Cine Persia", 5242)],
  "old-iranian-1356028": [publicYouTubeVideo("5l4S6meil2o", "فیلم قدیمی؛ دو کله شق | ۱۳۵۶ | رنگی شده", "Filmrangi - فیلمرنگی", 6082)],
  "old-iranian-1356021": [publicYouTubeVideo("ZfyK78M2_s0", "صبح خاکستر | Sobh-e Khakestar (1977)", "Global Vault TV", 5696)],
  "old-iranian-1356010": [publicYouTubeVideo("1pd8t9sDdOQ", "Charlotte Comes to the Marketplace Persian Movie", "FilmFarsi - فیلمفارسی", 4781)],
  "old-iranian-1356007": [publicYouTubeVideo("_GnsIRylVTk", "فیلم قدیمی؛ رفاقت | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5889)],
  "old-iranian-1356025": [publicYouTubeVideo("DvjnOuWgm6I", "Persian Movie: Nothing New in Town", "FilmFarsi - فیلمفارسی", 5495)],
  "old-iranian-1356014": [publicYouTubeVideo("Pn9poG41tv0", "فیلم قدیمی؛ نان و نمک | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5681)],
  "old-iranian-1356040": [publicYouTubeVideo("W4ThrtMPev8", "فیلم قدیمی؛ فری دست قشنگ | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6086)],
  "old-iranian-1356003": [publicYouTubeVideo("zT-9NwG851M", "Uncensored Persian Film: Classmate", "FilmFarsi - فیلمفارسی", 5979)],
  "old-iranian-1356005": [publicYouTubeVideo("Qi8wioIjz_I", "سکوت بزرگ | بدون سانسور و بدون حذفیات", "Shouka Film", 5820)],
  "old-iranian-1356008": [publicYouTubeVideo("crtpjRffDEo", "فیلم قدیمی؛ تازه عروس | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 5569)],
  "old-iranian-1356011": [publicYouTubeVideo("QxVjqpr1xJ0", "فیلم کامل ایرانی خدا قوت | بدون سانسور", "Persian Comedy Channel", 6870)],
  "old-iranian-1356015": [publicYouTubeVideo("iHhMmTsDWYk", "فیلم قدیمی - فیلم کامل سرباز", "مردگان محترم", 6058)],
  "old-iranian-1356017": [publicYouTubeVideo("jQwZahY2BUo", "خاتون | فیلم کامل ایرانی | Khatoun 1977", "Global Vault TV", 7570)],
};

// Fifth review batch: long-form matches from the next fifty archive titles.
const BATCH_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357004": [publicYouTubeVideo("eTqgoCOgpqs", "The full movie of Mr. Etemad's problem", "FilmFarsi - فیلمفارسی", 6242)],
  "old-iranian-1356018": [publicYouTubeVideo("9mGfUef3Zvk", "فیلم سینمایی ایرانی جای امن", "TPM - Top Persian Movies", 6410)],
  "old-iranian-1356019": [publicYouTubeVideo("i6iKSL7piSc", "جمعه | فیلم قدیمی ایرانی | Jomeh 1977", "Global Vault TV", 5684)],
  "old-iranian-1356027": [publicYouTubeVideo("P4FE72Ix0Ds", "Uncensored Persian Film: The Nomad", "FilmFarsi - فیلمفارسی", 5606)],
  "old-iranian-1356041": [publicYouTubeVideo("n2h0j0KB0OU", "فیلم قدیمی؛ گلهای کاغذی | ۱۳۵۶ | رنگی شده", "Filmrangi - فیلمرنگی", 6500)],
  "old-iranian-1356042": [publicYouTubeVideo("Y7XQ7t2KsMY", "فریاد عشق | Faryad-e Eshgh 1977", "Global Vault TV", 5314)],
  "old-iranian-1356043": [publicYouTubeVideo("zvl8rH6ih_Q", "فیلم قدیمی؛ اشک رقاصه | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6206)],
  "old-iranian-1356046": [publicYouTubeVideo("KRDyRHLL06c", "فیلم قدیمی؛ شب زخمی | ۱۳۵۶ | رنگی فول اچ دی", "Filmrangi - فیلمرنگی", 6523)],
  "old-iranian-1356047": [publicYouTubeVideo("48DCtz7cwpo", "فیلم کامل غربتی ها", "بیکی ها", 6681)],
  "old-iranian-1356048": [publicYouTubeVideo("OSZRrG97W3U", "فیلم قدیمی؛ فقط آقا مهدی می تونه | ۱۳۵۶ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6272)],
  "old-iranian-1357034": [publicYouTubeVideo("L1nHUhtpOPQ", "قول مرد - ۱۳۵۶", "Film O Honar", 6163)],
  "old-iranian-1355046": [publicYouTubeVideo("5pVWIkQoKxM", "CHESS OF THE WIND | شطرنج باد", "Contracultura Internacional", 6301)],
  "old-iranian-1355056": [publicYouTubeVideo("TVMHN2C2r-0", "علفهای هرز - بدون سانسور و رنگی", "Shouka Film", 6375)],
  "old-iranian-1355007": [publicYouTubeVideo("4ZzLUp8os6w", "فیلم ایرانی کامل و بدون سانسور | سرایدار", "Cine Persia", 6115)],
  "old-iranian-1355027": [publicYouTubeVideo("vhCdZsVchL8", "Uncensored Persian Film: The Loser", "FilmFarsi - فیلمفارسی", 6634)],
  "old-iranian-1355040": [publicYouTubeVideo("KH5yOrqMLyY", "فیلم کامل جدال", "Cinema Rex", 6023)],
  "old-iranian-1356001": [publicYouTubeVideo("C_v_DAAWOro", "فیلم کامل ایرانی یک اصفهانی در سرزمین هیتلر", "Persian Comedy Channel", 6455)],
  "old-iranian-1355009": [publicYouTubeVideo("xwE9w6pwdbs", "فیلم قدیمی؛ عنتر و منتر | ۱۳۵۵ | رنگی شده", "Filmrangi - فیلمرنگی", 4981)],
  "old-iranian-1354058": [publicYouTubeVideo("6AujvIp5c9c", "فیلم قدیمی؛ رفیق | ۱۳۵۴ | رنگی مرمت شده", "Filmrangi - فیلمرنگی", 5398)],
  "old-iranian-1355038": [publicYouTubeVideo("mctoSYCazRE", "فیلم ایرانی - شوهر جونم عاشق شده", "Pars Video", 6149)],
  "old-iranian-1355030": [publicYouTubeVideo("twTqrfPA4Ok", "فیلم کامل مادر جونم عاشق شده", "بیکی ها", 4680)],
};

// Sixth review batch: additional exact matches found while checking the next
// fifty titles. All active entries are long-form results.
const BATCH_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355037": [publicYouTubeVideo("wRCeUyuwy1s", "فیلم زیبای بت شکن - با بازی بهروز وثوق و جمشید مشایخی", "Shouka Film", 4904)],
  "old-iranian-1355064": [publicYouTubeVideo("bjJkPW8BLBQ", "The Sleeping Lion Persian Film | Classic Film", "FilmFarsi - فیلمفارسی", 4761)],
  "old-iranian-1355023": [publicYouTubeVideo("TiiWLm2AWQU", "Ghazal 1975 - فیلم سینمایی غزل", "40 سالگی - 40 years old", 6394)],
  "old-iranian-1357035": [publicYouTubeVideo("5dsXMO97fTU", "فیلم کامل دو مرد خشن", "فیلم قدیمی رنگی", 4976)],
  "old-iranian-1355068": [publicYouTubeVideo("ZOJFSuJMajU", "Uncensored Persian movie The lady wants a motorbike", "FilmFarsi - فیلمفارسی", 5123)],
  "old-iranian-1355004": [publicYouTubeVideo("-AvdB_WeSiM", "فیلم ایرانی - نقص فنی", "Pars Video", 6241)],
  "old-iranian-1355031": [publicYouTubeVideo("LX3rT1-bi2Q", "Persian Youth Romance Film | Classic Movie", "FilmFarsi - فیلمفارسی", 5797)],
  "old-iranian-1354060": [publicYouTubeVideo("EK_muy_TNGQ", "فیلم قدیمی؛ مرد شرقی و زن فرنگی", "Filmrangi - فیلمرنگی", 5674)],
};

// Seventh review batch: long-form, title-matched results from the next fifty
// archive titles. Short clips and ambiguous title matches remain excluded.
const BATCH_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355001": [publicYouTubeVideo("kGNzPMezK08", "فیلم قدیمی؛ شادی‌های زندگی ما | ۱۳۵۵ | رنگی اچ دی", "Filmrangi - فیلمرنگی", 6562)],
  "old-iranian-1355018": [publicYouTubeVideo("qpwZNcU5ORY", "Classic Film: Ghader | 1976 | Color HD", "Filmrangi - فیلمرنگی", 5211)],
  "old-iranian-1355058": [publicYouTubeVideo("c5HUHFuKRlg", "Uncensored Persian movie Three People on the Line", "FilmFarsi - فیلمفارسی", 5157)],
  "old-iranian-1355054": [publicYouTubeVideo("E8FCsVxAkGc", "فیلم قدیمی؛ کلک نزن خوشگله | ۱۳۵۵ | رنگی مرمت شده", "Filmrangi - فیلمرنگی", 5843)],
  "old-iranian-1355020": [publicYouTubeVideo("vSWqsNif4F0", "چلچراغ | فیلم کامل ایرانی ۱۳۵۵", "Global Vault TV", 5703)],
  "old-iranian-1355024": [publicYouTubeVideo("DWjLeUnJKZ0", "Uncensored Persian Film: The Tough Guy and the Dancer", "FilmFarsi - فیلمفارسی", 5747)],
  "old-iranian-1355034": [publicYouTubeVideo("xCEVEGSZ1Nk", "Uncensored Persian Movie: Awake in the City", "FilmFarsi - فیلمفارسی", 5400)],
  "old-iranian-1355050": [publicYouTubeVideo("xIWaRq9axhg", "تنها حامی - ۱۳۵۵", "Film O Honar", 6272)],
  "old-iranian-1355006": [publicYouTubeVideo("NCapHlc1sOY", "Persian Film The Nameless | Vintage Film", "FilmFarsi - فیلمفارسی", 5197)],
  "old-iranian-1354055": [publicYouTubeVideo("Z1TNCQBniGU", "فیلم قدیمی غلام زنگی | کیفیت بالا", "بیکی ها", 5462)],
  "old-iranian-1355005": [publicYouTubeVideo("qieTg_kTpDw", "غیرت | Gheyrat (1976) | فیلم کامل ایرانی قدیمی", "Global Vault TV", 4585)],
  "old-iranian-1355010": [publicYouTubeVideo("TfweLevY0Bw", "فیلم قدیمی - فیلم کامل دلقک", "فیلم قدیمی", 3964)],
  "old-iranian-1355012": [publicYouTubeVideo("TxJ_DLJqNj0", "فیلم کامل مردی در آتش", "Cinema Rex", 5776)],
  "old-iranian-1355013": [publicYouTubeVideo("nLLvMzhJYm0", "فیلم قدیمی؛ شهر شراب | ۱۳۵۵ | رنگی مرمت شده", "Filmrangi - فیلمرنگی", 5454)],
  "old-iranian-1355021": [publicYouTubeVideo("kf-SNLs-iec", "Uncensored Persian Movie The Last Supper", "FilmFarsi - فیلمفارسی", 6262)],
  "old-iranian-1355025": [publicYouTubeVideo("Fqaj2M2uuvc", "فیلم قدیمی تنهایی با شرکت منوچهر وثوق", "FilmFarsi - فیلمفارسی", 7229)],
  "old-iranian-1355028": [publicYouTubeVideo("i7zEO1ncAuU", "فیلم کامل گل خشخاش", "Cinema Rex", 5571)],
  "old-iranian-1355029": [publicYouTubeVideo("I0cAuTWooJE", "فیلم قدیمی؛ غرور و تعصب | ۱۳۵۵ | رنگی شده", "Filmrangi - فیلمرنگی", 6238)],
};

// Eighth review batch: the remaining clear long-form matches from that
// fifty-title pass, including one catalogue spelling correction.
const BATCH_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1356029": [publicYouTubeVideo("PdGA6E3KsEE", "فیلم ایرانی حلقه های ازدواج", "TPM - Top Persian Movies", 5248)],
  "old-iranian-1356037": [publicYouTubeVideo("_0VtK4jd5a4", "فيلم كلام حق (1356)", "فیلم فارسی", 6118)],
  "old-iranian-1356055": [publicYouTubeVideo("5DTCzqSTYOs", "Golgo 13 | فیلم گلگو سیزده", "Midnight Pulp", 6241)],
};

// Ninth review batch: exact title/year matches found in public YouTube
// archives. Every active result was checked as a long-form upload (at least
// one hour) before being added to the catalogue.
const BATCH_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1330006": [publicYouTubeVideo("9zKdKc6wZ4w", "فیلم ایرانی قدیمی خوابهای طلائی | ۱۳۳۰ | نسخه کامل", "Pars Film Official", 4317)],
  "old-iranian-1335007": [publicYouTubeVideo("KPIP0FRdKjE", "نسخه کامل فیلم قدیمی خورشید می درخشد | ۱۳۳۵", "هزار و یک شب", 6624)],
  "old-iranian-1336005": [publicYouTubeVideo("FOJFyT7hFOQ", "فیلم قدیمی بلبل مزرعه | ۱۳۳۶ | نسخه کامل", "Pars Films", 6342)],
  "old-iranian-1337003": [publicYouTubeVideo("uzc0NM3C3Qw", "فیلم قدیمی روزنه امید | ۱۳۳۸ | نسخه ترمیم شده", "Pars Film Official", 3805)],
  "old-iranian-1338008": [publicYouTubeVideo("aV3aPF7-al0", "فیلم قدیمی بی‌ستاره‌ها | ۱۳۳۸ | رنگی اچ‌دی", "Pars Film Official", 4740)],
  "old-iranian-1340002": [publicYouTubeVideo("xQzs4E1Xw-I", "فیلم قدیمی دختر همسایه | نسخه کامل", "Pars Films", 4467)],
  "old-iranian-1340004": [publicYouTubeVideo("kHvX-_TeE4k", "فیلم فارسی آتشپاره تهران | نسخه کامل", "Pars Films", 4519)],
  "old-iranian-1340008": [publicYouTubeVideo("Ax1S9nAl6lE", "فیلم قدیمی دام عشق | نسخه کامل", "Cinema Rex", 6315)],
  "old-iranian-1340013": [publicYouTubeVideo("cq5Bb3e0PNQ", "فیلم فارسی انسان پرنده | نسخه کامل", "Pars Films", 5041)],
  "old-iranian-1341004": [publicYouTubeVideo("8MwpYpPU3aA", "فیلم قدیمی طلای سفید | ۱۳۴۱ | نسخه کامل", "Pars Film Official", 5433)],
  "old-iranian-1341005": [publicYouTubeVideo("BGeIAzHDiN8", "فیلم فارسی آخرین گذرگاه | نسخه کامل", "Pars Films", 5168)],
  "old-iranian-1341011": [publicYouTubeVideo("2YcjyqB37oA", "فیلم قدیمی گل گمشده | ۱۳۴۱ | رنگی اچ‌دی", "Pars Film Official", 5467)],
  "old-iranian-1341014": [publicYouTubeVideo("obOMr6P-bMs", "فیلم ساحل دور نیست", "فیلم قدیمی", 4482)],
  "old-iranian-1341025": [publicYouTubeVideo("P_z7S3lM0Rg", "فیلم قدیمی اهریمن زیبا | ۱۳۴۱ | نسخه کامل", "Pars Films", 5831)],
  "old-iranian-1342004": [publicYouTubeVideo("Dq_w5fiKwx0", "فیلم آراس خان", "فیلم قدیمی", 6027)],
  "old-iranian-1342010": [publicYouTubeVideo("DzuY_YcF5Yg", "فیلم کامل جاده مرگ | فیلم قدیمی", "فیلم قدیمی", 4688)],
  "old-iranian-1342014": [publicYouTubeVideo("tsx28uYYgU0", "فیلم فارسی مرد میدان | نسخه کامل", "Pars Films", 4740)],
  "old-iranian-1343007": [publicYouTubeVideo("MnqBNGrY8qs", "نسخه کامل فیلم قدیمی ترانه‌های روستایی | ۱۳۴۳", "هزار و یک شب", 7479)],
  "old-iranian-1343010": [publicYouTubeVideo("qnN4GR1b2YE", "فیلم قدیمی دزد شهر | ۱۳۴۳", "بیکی ها", 8923)],
  "old-iranian-1343017": [publicYouTubeVideo("_2rPJyElYCk", "فیلم قدیمی سه تفنگدار | ۱۳۴۳ | نسخه کامل", "Pars Film Official", 5207)],
  "old-iranian-1343025": [publicYouTubeVideo("Nw3EauvlLyc", "فیلم شکوفه‌های امید | فیلم قدیمی", "فیلم قدیمی", 4431)],
  "old-iranian-1343027": [publicYouTubeVideo("I4z3Fv-j1to", "فیلم قدیمی دهکده طلایی | ۱۳۴۴ | نسخه کامل", "Cinema Rex", 7301)],
  "old-iranian-1343035": [publicYouTubeVideo("iZcnggIkNJg", "فیلم قدیمی گناه من چیست | ۱۳۴۳ | نسخه کامل", "Pars Film Official", 5628)],
};

// Tenth review batch: additional direct long-form uploads found while
// continuing the catalogue review. All active results were checked at more
// than one hour before being added.
const BATCH_TEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1333002": [publicYouTubeVideo("_j2Qro7lVx0", "فیلم قدیمی مراد | ۱۳۳۳ | نسخه کامل", "Pars Media", 5186)],
  "old-iranian-1334002": [publicYouTubeVideo("FwEGEAxx2G8", "فیلم قدیمی چهار راه حوادث | ۱۳۳۳ | نسخه کامل", "YouTube archive", 4688)],
  "old-iranian-1336010": [publicYouTubeVideo("r2xdOE342Xw", "فیلم قدیمی نردبان ترقی | ۱۳۳۶ | نسخه کامل", "Pars Film", 4883)],
  "old-iranian-1341016": [publicYouTubeVideo("fATi-87vMrg", "فیلم قدیمی انتقام روح | نسخه کامل", "فیلم قدیمی", 3935)],
  "old-iranian-1342025": [publicYouTubeVideo("LH6nli7gGdo", "فیلم قدیمی مادر فداکار | ۱۳۴۲ | نسخه کامل", "Pars Film Official", 4810)],
  "old-iranian-1342026": [publicYouTubeVideo("R7LITKoaNr0", "فیلم قدیمی دختر ساری | ۱۳۴۲ | نسخه کامل", "Pars Film Official", 5302)],
  "old-iranian-1338026": [publicYouTubeVideo("Vb9LZ5nCg9c", "فیلم قدیمی جوانان امروزی | ۱۳۳۸ | نسخه کامل", "Pars Film Official", 4917)],
  "old-iranian-1339008": [publicYouTubeVideo("ibpaCSZS7go", "فیلم قدیمی فردا روشن است | ۱۳۳۹ | نسخه کامل", "Pars Film Official", 5541)],
  "old-iranian-1339019": [publicYouTubeVideo("2WJZxCQYx2k", "فیلم قدیمی ستارگان می درخشند | ۱۳۳۹ | نسخه کامل", "Pars Film Official", 4588)],
  "old-iranian-1339026": [publicYouTubeVideo("lLeyt6BhK3Y", "فیلم قدیمی مروارید سیاه | ۱۳۳۹ | نسخه کامل", "Pars Film Official", 4857)],
  "old-iranian-1343013": [publicYouTubeVideo("h7tqck7GLOM", "فیلم قدیمی گلهای گیلان | ۱۳۴۳ | نسخه کامل", "فیلم قدیمی", 4779)],
  "old-iranian-1353035": [publicYouTubeVideo("XJBSFeYV5wY", "فیلم کامل ابرمرد | ۱۳۵۳", "Shouka Film", 5475)],
  "old-iranian-1353054": [publicYouTubeVideo("0zylCNz_lNM", "فیلم قدیمی مرگ در باران | ۱۳۵۴ | نسخه کامل", "Pars Films", 5229)],
  "old-iranian-1344004": [publicYouTubeVideo("qoPcbAcOL5o", "فیلم قدیمی یکپارچه آقا | ۱۳۴۴ | نسخه کامل", "Pars Films", 5394)],
};

// Eleventh review batch: these candidates were rechecked against the public
// YouTube watch page on 2026-09-26. Each page reported an embedded-playback
// allowance and a runtime above one hour; the site still links to YouTube's
// own player and never copies or proxies the upload.
const BATCH_ELEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357014": [{
    ...publicYouTubeVideo(
      "_x4CgAHVsZk",
      "لیلا فروهر در فیلم عاشقانه پرستوهای عاشق - نسخه بدون سانسور و رنگی شده HD",
      "Shouka Film",
      5234,
    ),
    checkedAt: "2026-09-26",
    playbackStatus: "available",
  }],
  "old-iranian-1356023": [{
    ...publicYouTubeVideo(
      "ro0NkU2XBtU",
      "فیلم قدیمی؛ خاکستری | ۱۳۵۶ | رنگی اچ دی",
      "Pars Film Official",
      6573,
    ),
    checkedAt: "2026-09-26",
    playbackStatus: "available",
  }],
  "old-iranian-1358006": [publicYouTubeVideo("bhZsZnnuRu4", "فیلم زیبای نفس گیر - با بازی پروین سلیمانی - رنگی", "Shouka Film", 5047, "2026-09-26", "available")],
  "old-iranian-1358004": [publicYouTubeVideo("oZK7hhtv9og", "Film Sorkhpoost - Full Movie | فیلم سینمایی سرخپوست - کامل", "Honar Aval", 5091, "2026-09-26", "available")],
  "old-iranian-1358020": [publicYouTubeVideo("E5Q7BPQkGiI", "فیلم ایرانی کامل و بدون سانسور | زر خرید", "Cine Persia", 5650, "2026-09-26", "available")],
  "old-iranian-1357007": [publicYouTubeVideo("ox7A2F_ePJ4", "نسخه کامل فیلم فارسی این گروه محکومین", "FilmFarsi - فیلمفارسی", 6157, "2026-09-26", "available")],
  "old-iranian-1355063": [publicYouTubeVideo("trao4fVZCVQ", "فیلم قدیمی؛ سینه چاک | ۱۳۵۵ | رنگی شده", "Filmrangi - فیلمرنگی", 5649, "2026-09-26", "available")],
  "old-iranian-1356009": [publicYouTubeVideo("8iBhaOwj43A", "فیلم قدیمی - فیلم زن 1356", "FilmFarsi - فیلمفارسی", 5141, "2026-09-26", "available")],
  "old-iranian-1356030": [publicYouTubeVideo("sEK7ay05Y7s", "فیلم قدیمی؛ ماهی ها در خاک می میرند | ۱۳۵۶ | نسخه کامل و با کیفیت", "Filmrangi - فیلمرنگی", 6680, "2026-09-26", "available")],
};

// OITN's public VideoObject collection was checked against the YouTube watch
// pages on 2026-09-26. Every entry is a long-form upload with
// playableInEmbed=true; the site keeps YouTube as the player and source link.
const BATCH_TWELVE_OITN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355020": [publicOitnVideo("YGycqs-Rf90", "The Chandelier · full film", 5277)],
  "old-iranian-1349035": [publicOitnVideo("BtrCB0vgv48", "Dancer of the City · full film", 7379)],
  "old-iranian-1355051": [
    publicOitnVideo("Cwh_9tx6IA0", "Mehman · full film", 6026),
    publicOitnVideo("3o0JENft3tM", "Mehman · alternate full upload", 5992),
  ],
  "old-iranian-1352042": [publicOitnVideo("6FHHpReizNI", "The Enemy · full film", 5865)],
  "old-iranian-1352035": [publicOitnVideo("YrSkUe-0BSk", "Mirage · full film", 5622)],
  "old-iranian-1351041": [publicOitnVideo("FvUCojIcrKk", "Hakim-bashi · full film", 6096)],
  "old-iranian-1355024": [publicOitnVideo("VFpGOSF3NY4", "The Foolish and the Dancer · full film", 5456)],
  "old-iranian-1350035": [publicOitnVideo("cJSPCTsAbeE", "Retaliation · full film", 5825)],
  "old-iranian-1350025": [publicOitnVideo("O2bOYxZdMoQ", "A Man with Thousand Smiles · full film", 5412)],
  "old-iranian-1349018": [publicOitnVideo("eG8xEgV3oKc", "Ali Bi Gham · full film", 6252)],
  "old-iranian-1348027": [publicOitnVideo("nCJBDy9rsJM", "Qeseh Delha · full film", 5800)],
  "old-iranian-1351047": [publicOitnVideo("R2T4VQMu-6s", "Mard · full film", 6917)],
  "old-iranian-1352076": [publicOitnVideo("XLes3YGJEiM", "Men and Unmen · full film", 4504)],
  "old-iranian-1352024": [publicOitnVideo("CEVIo7M8f7E", "Bajenagh · full film", 6835)],
  "old-iranian-1352030": [publicOitnVideo("poQQ9IavSMA", "Na-mahram · full film", 4359)],
  "old-iranian-1345040": [publicOitnVideo("B30nbWIoNbI", "Beggars of Tehran · full film", 4802)],
  "old-iranian-1354015": [publicOitnVideo("T-aP87IbvFg", "Leopard at Night · full film", 4954)],
  "old-iranian-1353009": [publicOitnVideo("BqngQcafk2U", "Baby Dandy · full film", 5966)],
  "old-iranian-1353036": [publicOitnVideo("0FctRSM6JOc", "Accusation · full film", 5183)],
  "old-iranian-1353006": [publicOitnVideo("AiucNJZruYU", "Mr. Handsome Reza · full film", 5596)],
  "old-iranian-1352059": [publicOitnVideo("E2iKXm_BlDE", "Akbar Dilmaj · full film", 6331)],
  "old-iranian-1353034": [publicOitnVideo("T6NrBlfQ5aI", "Najoorha · full film", 5388)],
  "old-iranian-1353032": [publicOitnVideo("pIItu5d-SmU", "Indomitable Defeat · full film", 6425)],
  "old-iranian-1351044": [publicOitnVideo("3JFebuubn1c", "Laj-o-Lajbazi · full film", 5583)],
  "old-iranian-1356036": [publicOitnVideo("avUSC0crdTk", "The Euphonious One and the Nice One · full film", 5302)],
  "old-iranian-1353027": [publicOitnVideo("tBLkdKZdR00", "Noon Prayer · full film", 5628)],
};

// Thirteenth review batch: an exact full-length match from Pars Films.
// The duration was checked from the public result before adding it here;
// short clips and behind-the-scenes uploads remain excluded.
const BATCH_THIRTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1357008": [publicYouTubeVideo("BRXXnMY2MUk", "فیلم کامل طغیانگر (۱۳۵۶)", "Pars Films", 5640, "2026-09-27", "available")],
};

// Fourteenth review batch: exact full-film uploads found on the reviewed
// Persian archive channels. Search-result pages and short excerpts stay out.
const BATCH_FOURTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1336003": [publicYouTubeVideo("Qlz29F6Qx4Y", "فیلم کامل مردی که رنج می‌برد (۱۳۳۶)", "Pars Films", 5400, "2026-09-27")],
  "old-iranian-1336007": [publicYouTubeVideo("5RHzKWo8YJE", "فیلم کامل مادموازل خاله", "Persian Comedy Channel", 6600, "2026-09-27")],
  "old-iranian-1336009": [publicYouTubeVideo("v16Qqb8pqE8", "فیلم کامل شب‌نشینی در جهنم (۱۳۳۵)", "Pars Films", 7200, "2026-09-27")],
  "old-iranian-1337016": [publicYouTubeVideo("JIiuVtgrqp0", "فیلم کامل دشمن زن", "Film Ghadimi Rangi", 6600, "2026-09-27")],
  "old-iranian-1338001": [publicYouTubeVideo("taC3X06o-Gs", "فیلم کامل یکی بود یکی نبود (۱۳۳۸)", "Film Ghadimi", undefined, "2026-09-27")],
  "old-iranian-1339006": [publicYouTubeVideo("FFRHpqx4xe4", "فیلم کامل حاجی جبار در پاریس", "FilmFarsi", undefined, "2026-09-27")],
};

// Fifteenth review batch: two more exact full-film archive uploads. The
// Amir-Arsalan search result was a trailer and is intentionally not included.
const BATCH_FIFTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1332001": [publicYouTubeVideo("_ViRefxnc0c", "فیلم کامل افسونگر", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1339013": [publicYouTubeVideo("yXUPH_NJjJs", "فیلم کامل آینه تاکسی (۱۳۳۹)", "Pars Films", 6600, "2026-09-27")],
};

// Sixteenth review batch: exact full-film results with matching catalogue
// titles; unrelated trailers and snippets remain excluded.
const BATCH_SIXTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1332022": [publicYouTubeVideo("ZmMfj85P8Y8", "فیلم کامل غفلت (۱۳۳۲)", "Shouka Film", undefined, "2026-09-27")],
  "old-iranian-1340010": [publicYouTubeVideo("MpyOTqOKqdM", "فیلم کامل آتش و خاکستر (۱۳۳۹)", "Pars Films", undefined, "2026-09-27")],
};

// Twenty-fourth review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_TWENTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347014": [publicYouTubeVideo("xEC3DByJgVM", "The Husband Hunt (1968) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1347031": [publicYouTubeVideo("ucwueAkcvaA", "Sange Sabour (1968) · full film", "Lalezar", undefined, "2026-09-27")],
  "old-iranian-1347058": [publicYouTubeVideo("BmRXTnUf4FU", "The Night of the Angels (1968) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1347062": [publicYouTubeVideo("UTl0W9ISrq0", "Iranian Marriage (1968) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1348005": [publicYouTubeVideo("r7ZKKVH7nWQ", "Eshgh Afarin (1969) · full film", "Cinema Rex", undefined, "2026-09-27")],
};

// Twenty-fifth review batch: direct YouTube uploads whose titles and release
// years match the catalogue entries. Search pages, trailers, and excerpts are
// intentionally excluded.
const BATCH_TWENTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348046": [publicYouTubeVideo("xKgu1zxVhDI", "The Cow (1969) - full film - 105 minutes", "Independent Films", 6300, "2026-09-27", "available")],
  "old-iranian-1354050": [publicYouTubeVideo("9RCduqHH0gw", "Kando (1975) - full film", "FilmFarsi", undefined, "2026-09-27")],
};

// Twenty-sixth review batch: direct uploads with an exact catalogue-title
// match. These are retained as playable references; duration is left unset
// until a provider-side metadata check is available.
const BATCH_TWENTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1350047": [publicYouTubeVideo("kPfeAKChGvA", "Baba Shaml (1971) - full film", "Persian Comedy Channel", undefined, "2026-09-27")],
  "old-iranian-1353002": [publicYouTubeVideo("oeAW965qZxk", "Mamal American (1975) - full film", "Pars Video", undefined, "2026-09-27")],
  "old-iranian-1356002": [publicYouTubeVideo("4qW8fTfmvqo", "Samad dar rah-e Ezhdeha (1977) - full film", "FARSI TOP", undefined, "2026-09-27")],
};

// Twenty-seventh review batch: direct uploads with exact catalogue-title and
// release-year matches. Short clips and non-film programme pages are omitted.
const BATCH_TWENTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1355057": [publicYouTubeVideo("c1QNEm9kqiw", "Atash-e Jonoub (1976) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1356044": [publicYouTubeVideo("wsuLNprT1h4", "Suteh Delan (1977) - full film", "Pars Video", undefined, "2026-09-27")],
  "old-iranian-1357015": [publicYouTubeVideo("avN-UJjY-vg", "Safar-e Sang (1978) - full film", "Cine Persia", undefined, "2026-09-27")],
};

// Twenty-eighth review batch: direct full-film uploads with matching archive
// years. Results with a conflicting year are intentionally left unlinked.
const BATCH_TWENTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1339003": [publicYouTubeVideo("G1xeacbCOaE", "Doostan-e Yekrang (1960) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1340015": [publicYouTubeVideo("vHmueOCd00w", "Khorous-e Bi Mahal (1961) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
};

// Twenty-ninth review batch: an exact year-matched, full-length upload. The
// separate trailer result for this title is deliberately not used.
const BATCH_TWENTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1334004": [publicYouTubeVideo("ZmVsspF_IMw", "Amir Arsalan Namdar (1966) - full film", "Shouka Film", undefined, "2026-09-27")],
};

// Thirtieth review batch: exact catalogue-title/year matches from direct
// feature-film uploads. No search-result URLs are stored.
const BATCH_THIRTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1342007": [publicYouTubeVideo("SGodcXW61yA", "Partgah-e Mokhuf (1964) - full film", "1001 Shab", undefined, "2026-09-27")],
  "old-iranian-1342023": [publicYouTubeVideo("WxDERxf5ySw", "Mardha va Jadeha (1963) - full film", "Shouka Film", undefined, "2026-09-27")],
};

// Thirty-first review batch: a direct full-film upload with an exact archive
// title and year match.
const BATCH_THIRTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1342013": [publicYouTubeVideo("KqACZQgAQrA", "Fereshteh-i Dar Khaneh-ye Man (1963) - full film", "Film Ghadimi", undefined, "2026-09-27")],
};

// Thirty-second review batch: an exact catalogue-title/year match with
// provider-described feature-film duration.
const BATCH_THIRTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344030": [publicYouTubeVideo("MlWAWVFvgNg", "Shans-e Bozorg (1965) - full film - 113 minutes", "Pars Film Official", 6780, "2026-09-27", "available")],
};

// Thirty-third review batch: direct full-film uploads with exact catalogue
// title/year matches.
const BATCH_THIRTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343004": [publicYouTubeVideo("vB58bcCAtX4", "Ensanha (1964) - full film", "1001 Shab", undefined, "2026-09-27")],
  "old-iranian-1343009": [publicYouTubeVideo("Wv-nHYcagRQ", "Aroos-e Farangi (1964) - full film", "Pars Video", undefined, "2026-09-27")],
  "old-iranian-1344007": [publicYouTubeVideo("02Z9uJ0xXNE", "Zesht o Ziba (1965) - full film", "FilmFarsi", undefined, "2026-09-27")],
};

// Thirty-fourth review batch: an exact archive-title/year match from a direct
// full-film upload.
const BATCH_THIRTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344037": [publicYouTubeVideo("THWjGxpJ59A", "Dozd-e Bank (1965) - full film", "1001 Shab", undefined, "2026-09-27")],
};

// Thirty-fifth review batch: direct full-film uploads with exact catalogue
// years and titles.
const BATCH_THIRTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344042": [publicYouTubeVideo("jmk1aCqAz-s", "Dah Sayeh-ye Khatarnaak (1965) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1345012": [publicYouTubeVideo("C3NSyIW6xTY", "Kolâh Namadi (1966) - full film", "Cinema Rex", undefined, "2026-09-27")],
};

// Thirty-sixth review batch: direct full-film uploads with exact catalogue
// title/year matches.
const BATCH_THIRTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345022": [publicYouTubeVideo("ZU7z0zTHthc", "Eteraf (1966) - full film", "1001 Shab", undefined, "2026-09-27")],
  "old-iranian-1345036": [publicYouTubeVideo("XrfPGL0NEwY", "Yek Gadam Ta Behesht (1966) - full film", "Pars Films", undefined, "2026-09-27")],
};

// Thirty-seventh review batch: direct full-film uploads with exact archive
// title/year matches.
const BATCH_THIRTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345046": [publicYouTubeVideo("_pGWJRqOmDg", "Farar Az Haghighat (1967) - full film", "Film Ghadimi", undefined, "2026-09-27")],
  "old-iranian-1345050": [publicYouTubeVideo("hHxeeJ2NQyM", "Ganjineh-ye Soleiman (1966) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1346010": [publicYouTubeVideo("bUYHp6AbLH0", "Khoshgel o Gahreman (1967) - full film", "Shouka Film", undefined, "2026-09-27")],
};

// Thirty-eighth review batch: direct YouTube uploads whose displayed title,
// archive year, and feature-film context were checked against the catalogue.
// Results that only exposed a trailer, clip, or search page are intentionally
// not included.
const BATCH_THIRTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346001": [publicYouTubeVideo("VGn9g1UmpwI", "Gohare Shab Cheragh (1967) - full film", "Film O Honar", undefined, "2026-09-27")],
  "old-iranian-1346005": [publicYouTubeVideo("03zI4XCQnV4", "Mardi Az Esfahan (1967) - full film", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1346011": [publicYouTubeVideo("8T20_og-W84", "Haqeh Bazan (1967) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1346012": [publicYouTubeVideo("W72CGsOK2-4", "Ali Baba va Chehel Dozd-e Baghdad (1967) - full film", "Beykiha", undefined, "2026-09-27")],
  "old-iranian-1346025": [publicYouTubeVideo("M85Izf72Tx0", "Kuhzad (1967) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1346035": [publicYouTubeVideo("N70aWC4SEEM", "Gozasht-e Bozorg (1967) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1347003": [publicYouTubeVideo("-ggUuAErhLw", "Toofan Bar Fraz-e Patra (1968) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1347025": [publicYouTubeVideo("Wm1GSyAfj4k", "Charkh-e Bazigar (1968) - full film", "Film Ghadimi Rangi", undefined, "2026-09-27")],
  "old-iranian-1347028": [publicYouTubeVideo("NUmF37NMtwQ", "Luti-ye Qarn-e Bistom (1968) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-27", "available")],
  "old-iranian-1347042": [publicYouTubeVideo("WX2EjkpsbtE", "Mard-e Hanjareh-ye Talaei (1968) - full film", "1001 Shab", undefined, "2026-09-27")],
  "old-iranian-1347043": [publicYouTubeVideo("qfTA94Rvfdo", "Hangameh (1968) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1347045": [publicYouTubeVideo("qQMI7N5RgMw", "Setareh-ye Haft Asemoon (1968) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1348001": [publicYouTubeVideo("AHHZnJIscic", "Se Ferari (1969) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-27", "available")],
  "old-iranian-1348002": [publicYouTubeVideo("ItS1aWMSqQ8", "Pesarane Qaroon (1969) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1348008": [publicYouTubeVideo("uc2YlLuwEYc", "Qahveh Khaneh-ye Qanbar (1969) - full film", "Cinema Rex", undefined, "2026-09-27")],
  "old-iranian-1348012": [publicYouTubeVideo("OFkcpZpVtV4", "Sogand-e Sokoot (1969) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-27", "available")],
  "old-iranian-1348015": [publicYouTubeVideo("2i3HRLSNKPo", "Nasl-e Shoja'an (1969) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1348016": [publicYouTubeVideo("ZG9tkguaU54", "Akharin Mobarezeh (1969) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1348018": [publicYouTubeVideo("uF-RVVBYo74", "Pahlevan Pahlevanan (1969) - full film", "Persian Films Archive", undefined, "2026-09-27")],
  "old-iranian-1348020": [publicYouTubeVideo("aXztPdN-yHk", "Eshgh-e Kooli (1969) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1348022": [publicYouTubeVideo("RK-kCSgGnz8", "Rouspi (1969) - full film - 110 minutes", "Pars Film Official", 6600, "2026-09-27", "available")],
  "old-iranian-1348023": [publicYouTubeVideo("yPZxw28pZD8", "Gonah-e Zibaei (1969) - full film", "Film Ghadimi Rangi", undefined, "2026-09-27")],
};

// Thirty-ninth review batch: direct feature-film uploads with exact catalogue
// year/title matches. Trailer-only results remain excluded.
const BATCH_THIRTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349003": [publicYouTubeVideo("qCEGK2f9KgU", "Shahr-e Hert (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1349004": [publicYouTubeVideo("XqmNosjnfNU", "Sekkeh-ye Shans (1970) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1349006": [publicYouTubeVideo("xB6bT0mjP3k", "Baba Karam (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1349012": [publicYouTubeVideo("U1nIFnb7RP8", "Qesseh-ye Shab-e Yalda (1970) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1349014": [publicYouTubeVideo("SfBX4Q0tUyE", "Namadari (1970) - full film", "Cinema Rex", undefined, "2026-09-27")],
  "old-iranian-1349021": [publicYouTubeVideo("ELXAFxEwwL0", "Adam o Hava (1970) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1349023": [publicYouTubeVideo("URsl28lfVds", "Jomeh-ye Shirin (1970) - full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1349024": [publicYouTubeVideo("pX9iYmX1DmQ", "Az Yad Rafteh (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1349030": [publicYouTubeVideo("d7sLxJRwmXY", "Javani Ham Alemi Darad (1970) - full film", "1001 Shab", undefined, "2026-09-27")],
  "old-iranian-1349033": [publicYouTubeVideo("nBuqH-6rrj8", "Aghaye Hallou (1970) - feature film", "Persian Films Archive", undefined, "2026-09-27")],
  "old-iranian-1349034": [publicYouTubeVideo("48zqoBzhaNQ", "Bargah-e Sheytan (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1349042": [publicYouTubeVideo("sjfGp4ctj9Y", "Ghahreman-ha Nemimirand (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27", "available")],
  "old-iranian-1349048": [publicYouTubeVideo("Fl4K8IkbR_w", "Panjereh (1970) - full film - 109 minutes", "Pars Film Official", 6540, "2026-09-27", "available")],
};

// Fortieth review batch: direct feature/documentary uploads with an exact
// Persian title or an unambiguous catalogue title/year match. Search pages,
// trailers, and clips are intentionally excluded.
const BATCH_FORTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1358026": [publicYouTubeVideo("1fBIwC9sNGc", "Baraye Azadi (1979) - complete documentary - 112 minutes", "Iranian documentary archive", 6720, "2026-09-27")],
  "old-iranian-1356016": [publicYouTubeVideo("IZSNf6PRCrM", "Salam Tehran (1977) - full film", "Film Rangi", undefined, "2026-09-27")],
  "old-iranian-1356038": [publicYouTubeVideo("RhKed2EME9E", "Talafi (1977) - full film", "Film Rangi", undefined, "2026-09-27")],
  "old-iranian-1356052": [publicYouTubeVideo("2zew3R4y-FE", "Nabard ba Zendegi (1977) - full film", "Shouka Film", undefined, "2026-09-27")],
  "old-iranian-1355049": [publicYouTubeVideo("Pkl7xPP24qY", "Baba Goli be Jamalet (1976) - full film", "Persian classic film archive", undefined, "2026-09-27")],
  "old-iranian-1355017": [publicYouTubeVideo("h7Kh6gR2f0c", "Ba Ham Vali Tanha (1976) - full film", "Shouka Film", undefined, "2026-09-27")],
  "old-iranian-1355036": [publicYouTubeVideo("e5beDKmWnJQ", "Bot (1976) - full film", "Film Rangi", undefined, "2026-09-27")],
  "old-iranian-1350071": [publicYouTubeVideo("yV262pEc2oY", "Mobareze ba Sheytan (1971) - full film", "Beykiha", undefined, "2026-09-27")],
};

// Forty-first review batch: direct feature-length uploads found by exact
// title/year searches. Search pages, trailers, and short clips stay excluded.
const BATCH_FORTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344006": [publicYouTubeVideo("Ta-EpqLbNiI", "Zaboon Basteh (1965) - complete film - 104 minutes", "Pars Film Official", 6240, "2026-09-27", "available")],
  "old-iranian-1344008": [publicYouTubeVideo("H_kix1jMvVE", "Babr-e Kuhestan (1965) - complete film", "1001 Shab", 5160, "2026-09-27", "available")],
  "old-iranian-1344013": [publicYouTubeVideo("sZ5vP1YL-kQ", "Shir Mard (1965) - complete film", "Persian Films Archive", undefined, "2026-09-27")],
  "old-iranian-1344035": [publicYouTubeVideo("X-gfNZqKULw", "Khesht o Ayeneh (1965) - complete film - 131 minutes", "Persian Cinematheque", 7860, "2026-09-27", "available")],
};

// Forty-second review batch: exact title/year matches with a complete-film
// title or catalogue description. Trailers and short excerpts stay excluded.
const BATCH_FORTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344019": [publicYouTubeVideo("L_KvgcZn9J8", "Hame Sar-e Harif (1965) - complete film - 108 minutes", "Pars Film Official", 6480, "2026-09-27", "available")],
  "old-iranian-1344023": [publicYouTubeVideo("F6F17z_PdMI", "Khoshgel Khoshgela (1965) - full film", "BandMoviez", undefined, "2026-09-27")],
  "old-iranian-1344027": [publicYouTubeVideo("io5WasjZ5x4", "Se Ta Bezan Bahador (1965) - full film", "1001 Shab", undefined, "2026-09-27")],
};

// Forty-third review batch: direct long-form uploads with an exact title and
// year match. Anonses and other short promotional videos stay excluded.
const BATCH_FORTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345006": [publicYouTubeVideo("A5joarLJ4lA", "Do Ensan (1966) - complete film", "Pars Film Official", undefined, "2026-09-27")],
  "old-iranian-1345023": [publicYouTubeVideo("hyejJS8X7Ik", "Agha Mochol (1966) - full film - 86 minutes", "Film Farsi", 5160, "2026-09-27", "available")],
};

// Forty-fourth review batch: exact title/year matches with full-film uploads.
// Search pages, trailers, and unrelated films are intentionally excluded.
const BATCH_FORTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345026": [publicYouTubeVideo("k12fsSX98Gk", "Hatam-e Taee (1966) - complete film - 105 minutes", "Pars Film Official", 6300, "2026-09-27", "available")],
  "old-iranian-1345029": [publicYouTubeVideo("vutOjSz4YP4", "Mamoor-e Do Janebe (1966) - complete film", "Persian classic film archive", undefined, "2026-09-27")],
};

// Forty-fifth review batch: direct full-film uploads confirmed by exact
// title/year metadata. Promotional clips remain excluded.
const BATCH_FORTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345030": [publicYouTubeVideo("goIy4NYS5I0", "Hashem Khan (1966) - complete film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1345033": [publicYouTubeVideo("NZzQ8PaMys4", "Jahan Pahlevan (1966) - complete film - 101 minutes", "Pars Film Official", 6060, "2026-09-27", "available")],
};

// Forty-sixth review batch: direct uploads whose titles and archive years
// match the catalogue. Results for the newer film titled Sharlatan and other
// unrelated clips are intentionally excluded.
const BATCH_FORTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345004": [publicYouTubeVideo("w8GESUX8Mz8", "Nokhaleh Gahreman (1966) - full film", "Cinema Comedy", undefined, "2026-09-27")],
  "old-iranian-1345008": [publicYouTubeVideo("AdvaJYeiuwI", "Ghafas-e Talaei (1966) - full film", "Persian classic film archive", undefined, "2026-09-27")],
  "old-iranian-1345035": [publicYouTubeVideo("NWlvuEkUEHs", "Dokhtar-e Kadkhoda (1966) - full film", "Cinema Rex", undefined, "2026-09-27")],
};

// Forty-seventh review batch: exact 1345 archive-title matches with direct
// feature-film uploads. Unrelated modern titles and search pages are omitted.
const BATCH_FORTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345043": [publicYouTubeVideo("9v0JNfC5ek8", "Mardi Az Tehran (1966) - full film - 90 minutes", "Pars Films", 5400, "2026-09-27")],
  "old-iranian-1345044": [publicYouTubeVideo("DwDYTNeijiM", "Mamoor 114 (1966) - full film - 90 minutes", "Persian classic film archive", 5400, "2026-09-27")],
};

// Forty-eighth review batch: direct year-matched feature uploads. The
// trailer-only result for Goodbye Tehran is deliberately not used.
const BATCH_FORTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345047": [publicYouTubeVideo("SqBJIoAUrFY", "Khoda Hafez Tehran (1966) - full film", "Persian classic film archive", undefined, "2026-09-27")],
  "old-iranian-1345052": [publicYouTubeVideo("UflS4HvxuQw", "Istgah-e Teren (1966) - full film", "Shouka Film", undefined, "2026-09-27")],
};

// Forty-ninth review batch: a direct feature upload with an exact archive
// title/year match and independently listed feature runtime.
const BATCH_FORTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346004": [publicYouTubeVideo("I-EURFySeXg", "Millionerhaye Gorsneh (1967) - full film - 90 minutes", "Pars Media", 5400, "2026-09-27")],
};

// Fiftieth review batch: direct uploads whose displayed title and archive
// year match the catalogue entries.
const BATCH_FIFTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346016": [publicYouTubeVideo("BOsn4Beg1Hs", "Dash Ahmad (1967) - full film", "Pars Film", undefined, "2026-09-27")],
  "old-iranian-1346021": [publicYouTubeVideo("TjNNJO8MCf4", "Pesarane Alaeddin (1967) - full film", "Persian classic film archive", undefined, "2026-09-27")],
};

// Fifty-first review batch: direct full-film uploads with exact archive
// title/year matches.
const BATCH_FIFTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346029": [publicYouTubeVideo("CMqIwphVRog", "Dalaho (1967) - full film", "Persian Films Archive", undefined, "2026-09-27")],
  "old-iranian-1346032": [publicYouTubeVideo("ok3XPm-QCZI", "Haft Shahr-e Eshgh (1967) - full film", "Pars Films", undefined, "2026-09-27")],
};

// Fifty-second review batch: direct uploads with exact archive title/year
// matches. The result is kept only when it is a feature-film upload.
const BATCH_FIFTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346038": [publicYouTubeVideo("X40F6wjrr8M", "Siyavosh Dar Takht-e Jamshid (1967) - full film - 90 minutes", "Film and Media", 5400, "2026-09-27")],
  "old-iranian-1346043": [publicYouTubeVideo("ciuenBWQn1M", "Zani Be Name Sharab (1967) - full film", "Persian Films Archive", undefined, "2026-09-27")],
};

// Fifty-third review batch: direct full-film uploads with exact archive title
// and release-year matches. The archive spells "Dokhtar Tala" as "دختر طال".
const BATCH_FIFTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346045": [publicYouTubeVideo("CKpPcjPsIrU", "Mard Bi Setareh (1967) - full film", "Persian Films Archive", undefined, "2026-09-27")],
  "old-iranian-1346046": [publicYouTubeVideo("E7-UHr7BvSo", "Sarnevesht (1967) - full film - 90 minutes", "Pars Films", 5400, "2026-09-27")],
  "old-iranian-1346048": [publicYouTubeVideo("m3KNT-kcXFo", "Dokhtar Tala (1967) - full film - 115 minutes", "Pars Films", 6900, "2026-09-27")],
};

// Fifty-fourth review batch: one exact, full-length YouTube upload from the
// next archive year. Other candidates in this slice were not direct YouTube
// feature uploads and remain intentionally unlinked.
const BATCH_FIFTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347002": [publicYouTubeVideo("BY6VEnY8w8A", "Kashti-ye Nuh (1968) - full film - 110 minutes", "Cinema Rex", 6600, "2026-09-27")],
};

// Fifty-fifth review batch: an exact-title, direct upload explicitly marked
// as the complete feature film.
const BATCH_FIFTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346052": [publicYouTubeVideo("zVRm53dTHak", "Aroos-e Tehran (1967) - full film", "Pars Films", undefined, "2026-09-27")],
};

// Fifty-sixth review batch: the next exact archive title with an explicit
// complete-film YouTube upload.
const BATCH_FIFTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347001": [publicYouTubeVideo("T4tlqkpn9BY", "Jaddeh-ye Zarrin-e Samarkand (1968) - full film", "YouTube old-film archive", undefined, "2026-09-27")],
};

// Fifty-seventh review batch: the exact 1968 title with a feature-length
// upload whose independently listed runtime is 122 minutes.
const BATCH_FIFTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347007": [publicYouTubeVideo("JroZcB7XYyc", "Babr-e Mazandaran (1968) - full film - 122 minutes", "Film O Honar", 7320, "2026-09-27")],
};

// Fifty-eighth review batch: exact archive title/year and a direct upload
// explicitly labelled as the complete feature film.
const BATCH_FIFTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347018": [publicYouTubeVideo("hfvwkTkHtbw", "Eshq-e Qarun (1968) - full film", "Pars Films", undefined, "2026-09-27")],
};

// Fifty-ninth review batch: two exact archive title/year matches with direct
// uploads explicitly identified as complete films.
const BATCH_FIFTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347021": [publicYouTubeVideo("krNNA6bOvRc", "Shahrah-e Zendegi (1968) - full film - 90 minutes", "Pars Films", 5400, "2026-09-27")],
  "old-iranian-1347030": [publicYouTubeVideo("4a1gt72bbLs", "Man Ham Geryeh Kardam (1968) - full film", "YouTube old-film archive", undefined, "2026-09-27")],
};

// Sixtieth review batch: direct full-film upload with the exact archive
// title/year and an independently listed 1:48:43 runtime.
const BATCH_SIXTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347033": [publicYouTubeVideo("fZFGAtshlPc", "Majaraye Shab-e January (1968) - full film - 1h 48m", "Cinema Rex", 6523, "2026-09-27")],
};

// Sixty-first review batch: direct upload whose displayed title matches the
// archive entry. Search results without a complete-film title are excluded.
const BATCH_SIXTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1341006": [publicYouTubeVideo("BVUFe_Pf6y0", "Film-e Ghadimi Var Parideh (1962) - full film", "1001 Shab / Iranian Movies", undefined, "2026-09-27")],
};

// Sixty-second review batch: direct feature upload with an exact archive
// title match and an independently listed 121-minute runtime.
const BATCH_SIXTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1341026": [publicYouTubeVideo("neKcPzzhzYw", "Ghorboon-e Khodam (1962) - full film - 121 minutes", "Film Ghadimi / Iranian Movies", 7260, "2026-09-27")],
};

// Sixty-third review batch: exact-title upload with the published archive
// runtime of 94 minutes. Short clips and unrelated results are excluded.
const BATCH_SIXTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343002": [publicYouTubeVideo("znOntmUhDRA", "Nabgheh Haft Maheh (1964) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-27")],
};

// Sixty-fourth review batch: exact-title upload from a known classic-film
// channel with the published 90-minute feature runtime.
const BATCH_SIXTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343016": [publicYouTubeVideo("vizcCS5XIb4", "Babr-e Ring (1964) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27")],
};

// Sixty-fifth review batch: exact-title complete upload with the published
// archive runtime of 101 minutes.
const BATCH_SIXTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343028": [publicYouTubeVideo("TbDLcP3iHvc", "Jahel-ha va Zhigool-ha (1964) - full film - 101 minutes", "Pars Film Official", 6060, "2026-09-27")],
};

// Sixty-sixth review batch: two exact-title complete uploads with published
// feature runtimes. Short or title-only search results remain excluded.
const BATCH_SIXTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343029": [publicYouTubeVideo("hg79gmT-_-c", "Ashk-e Yatim (1964) - full film - 101 minutes", "Shouka Film", 6060, "2026-09-27")],
  "old-iranian-1344031": [publicYouTubeVideo("2oZ1ljTWxhg", "Mo Talaei-ye Shahr-e Ma (1965) - full film - 128 minutes", "Pars Film Official", 7680, "2026-09-27")],
};

// Sixty-seventh review batch: three exact-title uploads with independently
// listed feature runtimes. Short clips and unrelated search matches stay out.
const BATCH_SIXTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344039": [publicYouTubeVideo("hdxfF1-xec4", "Mardi Dar Ghafas (1965) - full film - 109 minutes", "Shouka Film", 6540, "2026-09-27")],
  "old-iranian-1344040": [publicYouTubeVideo("VKy4-wudNIg", "Mard-e Dah Million Tomani (1965) - full film - 110 minutes", "Pars Film Official", 6600, "2026-09-27")],
  "old-iranian-1345005": [publicYouTubeVideo("aGWwzfXTM2U", "Damad-e Farari (1966) - full film - 110 minutes", "YouTube old-film archive", 6600, "2026-09-27")],
};

// Sixty-eighth review batch: four exact-title feature uploads with verified
// runtimes. Search results that were clips, trailers, or title-only matches
// remain excluded.
const BATCH_SIXTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1339004": [publicYouTubeVideo("CivFlu270SQ", "Sefr Ali (1960) - full film - 90 minutes", "YouTube old-film archive", 5400, "2026-09-27")],
  "old-iranian-1343005": [publicYouTubeVideo("O2veU0WyXYE", "Zarbat (1964) - full film - 103 minutes", "Pars Films", 6180, "2026-09-27")],
  "old-iranian-1343022": [publicYouTubeVideo("VfkqlKQgXd8", "Jahel-e Mahall (1964) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27")],
  "old-iranian-1343024": [publicYouTubeVideo("tf-pnYuK2t4", "Setareh-ye Sahra (1964) - full film - 90 minutes", "Shouka Film", 5400, "2026-09-27")],
};

// Sixty-ninth review batch: one exact-title, feature-length upload with the
// runtime stated in the YouTube description.
const BATCH_SIXTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1341023": [publicYouTubeVideo("RGV9A2P4rOg", "Dar Entehaye Zolmat (1962) - full film - 80 minutes", "Pars Film Official", 4800, "2026-09-27")],
};

// Seventieth review batch: two exact-title feature uploads with independent
// catalogue runtimes. The shorter trailer/search variants are excluded.
const BATCH_SEVENTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345011": [publicYouTubeVideo("Yal8Mp6dzHk", "Se Naghola Dar Japon (1966) - full film - 108 minutes", "Persian Comedy Channel", 6480, "2026-09-27")],
  "old-iranian-1345015": [publicYouTubeVideo("o5bPTlS2Vqo", "Bist Sal Entezar (1966) - full film - 110 minutes", "YouTube old-film archive", 6600, "2026-09-27")],
};

// Seventy-first review batch: one exact-title full upload with an
// independently listed 97-minute runtime.
const BATCH_SEVENTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345017": [publicYouTubeVideo("j9RjyhvzALw", "Bi Eshq Hargez (1966) - full film - 97 minutes", "Pars Films", 5820, "2026-09-27")],
};

// Seventy-second review batch: three exact-title full-film uploads. The
// source descriptions identify them as complete feature films; title-only
// and trailer results for nearby archive entries remain excluded.
const BATCH_SEVENTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345024": [publicYouTubeVideo("Jn0EfUyQyic", "Fil-o Fanjan (1966) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-27")],
  "old-iranian-1345014": [publicYouTubeVideo("AO-5CWC0LOU", "Azab-e Marg (1966) - full film", "Film Ghadimi", undefined, "2026-09-27")],
  "old-iranian-1345027": [publicYouTubeVideo("pAah2EIq-Rc", "Aqa Dozdeh (1966) - full film", "Beykiha", undefined, "2026-09-27")],
};

// Seventy-third review batch: one exact-title feature upload with an
// independently listed 94-minute runtime.
const BATCH_SEVENTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1337012": [publicYouTubeVideo("_XCu-wpD4Mo", "Lat-e Javanmard (1958) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-27")],
};

// Seventy-fourth review batch: the archive's 1960 "Peyman" entry matches the
// complete 86-minute upload catalogued as "Peyman Doosti".
const BATCH_SEVENTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1339023": [publicYouTubeVideo("caApmR_pGq4", "Peyman Doosti (1960) - full film - 86 minutes", "Pars Film Official", 5160, "2026-09-27")],
};

// Seventy-fifth review batch: two exact-title feature uploads with catalogue
// runtimes of 101 and 90 minutes respectively.
const BATCH_SEVENTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345031": [publicYouTubeVideo("IMYIqsstJAk", "Shookhi Nakon Delkhor Misham (1966) - full film - 101 minutes", "YouTube old-film archive", 6060, "2026-09-27")],
  "old-iranian-1345037": [publicYouTubeVideo("EFWfj-K69Fw", "Emrooz o Farda (1966) - full film - 90 minutes", "YouTube old-film archive", 5400, "2026-09-27")],
};

// Seventy-sixth review batch: two exact-title complete uploads. Their
// independent runtimes were not exposed by the indexed results, so the
// duration is intentionally left unset instead of being guessed.
const BATCH_SEVENTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345034": [publicYouTubeVideo("lExOhhyyZ1w", "Sharlatan (1966) - full film", "Beikiha", undefined, "2026-09-27")],
  "old-iranian-1345054": [publicYouTubeVideo("b1yIA7BQm3c", "Pesar-e Dehati (1966) - complete film", "Hezar-o Yek Shab", undefined, "2026-09-27")],
};

// Seventy-seventh review batch: one exact-title upload whose catalogue
// runtime is independently listed as two hours.
const BATCH_SEVENTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1339017": [publicYouTubeVideo("fpY2f5uCdhw", "Arshin Malalan (1960) - full film - 120 minutes", "Film O Honar", 7200, "2026-09-27")],
};

// Seventy-eighth review batch: two exact-title feature uploads with
// independently listed runtimes of 98 and 90 minutes.
const BATCH_SEVENTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1341012": [publicYouTubeVideo("tG57N3h8pa8", "Zan Doshmane Khatarnakist (1962) - full film - 98 minutes", "YouTube old-film archive", 5880, "2026-09-27")],
  "old-iranian-1341015": [publicYouTubeVideo("RM1oEu1Xnk4", "Gozasht (1962) - full film - 90 minutes", "YouTube old-film archive", 5400, "2026-09-27")],
};

// Seventy-ninth review batch: two exact-title feature uploads. The first
// upload has an independently listed feature runtime; the second runtime is
// intentionally left unset because no reliable catalogue duration was found.
const BATCH_SEVENTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1342024": [publicYouTubeVideo("EAc1kiM5ntQ", "Parastooha Be Laneh Bazmigardand (1963) - full film - 86 minutes", "YouTube old-film archive", 5160, "2026-09-27")],
  "old-iranian-1343021": [publicYouTubeVideo("_eM8ud5W2Yo", "Abram Dar Paris (1964) - full film", "YouTube old-film archive", undefined, "2026-09-27")],
};

// Eightieth review batch: two exact-title feature uploads with independent
// runtime checks. The Haji Agha upload is the surviving public-domain silent
// feature; the second is the exact 1959 title/year upload from Shouka Film.
const BATCH_EIGHTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1311001": [publicYouTubeVideo("Yp7kNe_riaM", "Haji Agha Aktor-e Cinema (1933) - full film - 69 minutes", "YouTube old-film archive", 4140, "2026-09-27")],
  "old-iranian-1338024": [publicYouTubeVideo("4BQCl-a9Hx0", "Mimiram Baraye Pool (1959) - full film - 90 minutes", "Shouka Film", 5400, "2026-09-27")],
};

// Eighty-first review batch: one exact year-matched feature upload. The
// similarly named 1357 film "Bon Bast" is intentionally not mapped to the
// archive's separate 1343 entry.
const BATCH_EIGHTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343030": [publicYouTubeVideo("U9UiRM6CTu4", "Sarkesh (1964) - full film - 90 minutes", "Lalezar", 5400, "2026-09-28")],
};

// Eighty-second review batch: two exact title/year feature uploads. The
// Qahreman-e Dehkadeh runtime is independently listed as 90 minutes; the
// YouTube title for Kelid-e Behesht explicitly identifies it as a full copy,
// but no dependable runtime metadata was available.
const BATCH_EIGHTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345019": [publicYouTubeVideo("ISckI09Mk8w", "Qahreman-e Dehkadeh (1967) - full film - 90 minutes", "YouTube old-film archive", 5400, "2026-09-28")],
  "old-iranian-1345032": [publicYouTubeVideo("V6ZzJCEkPQI", "Kelid-e Behesht (1966) - full film", "Pars Film", undefined, "2026-09-28")],
};

// Eighty-third review batch: two exact title/year feature uploads with
// independent runtime checks.
const BATCH_EIGHTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346003": [publicYouTubeVideo("VTKdOHkP1FA", "Yeke Bezan (1967) - full film - 95 minutes", "Bikiha", 5700, "2026-09-28")],
  "old-iranian-1346033": [publicYouTubeVideo("06_knnFUQEM", "Nim Vajabi (1967) - full film - 106 minutes", "Pars Film", 6360, "2026-09-28")],
};

// Eighty-fourth review batch: one exact title/year upload with an
// independently listed 115-minute runtime.
const BATCH_EIGHTY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346042": [publicYouTubeVideo("gzvDIj3mDwo", "Mojezeh (1967) - full film - 115 minutes", "TikTok Challenge", 6900, "2026-09-28")],
};

// Eighty-fifth review batch: two exact title/year feature uploads with
// independently listed runtimes.
const BATCH_EIGHTY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347009": [publicYouTubeVideo("wNApyIBZ418", "Haft Dokhtar Baraye Haft Pesar (1968) - full film - 93 minutes", "YouTube old-film archive", 5580, "2026-09-28")],
  "old-iranian-1347015": [publicYouTubeVideo("_6hsdc5X3SQ", "Bastarehaye Jodaganeh (1968) - full film - 119 minutes", "YouTube old-film archive", 7140, "2026-09-28")],
};

// Eighty-sixth review batch: an exact-title upload from the Bikiha archive.
// The source identifies the video as the complete feature, but no reliable
// runtime metadata was available, so duration remains intentionally unset.
const BATCH_EIGHTY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347004": [publicYouTubeVideo("Ri697qFCOEk", "Mard Do Chehre (1968) - full film", "Bikiha", undefined, "2026-09-28")],
};

// Eighty-ninth review batch: direct, exact-title feature uploads found while
// continuing through the 1969 archive. Runtime was not published reliably in
// the search metadata, so these stay unlabelled instead of using a guess.
const BATCH_EIGHTY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348021": [publicYouTubeVideo("luYhgVrzRys", "Donyaye Por Omid (1969) - full film", "FilmFarsi", undefined, "2026-09-28")],
  "old-iranian-1348042": [publicYouTubeVideo("6Tofmx3mNbE", "Jib-Bar Khoshgeleh (1969) - full film", "Persian Comedy Channel", undefined, "2026-09-28")],
  "old-iranian-1348043": [publicYouTubeVideo("mW0V7EhyFok", "Gorbeh Kor (1969) - full film", "Cinema Rex", undefined, "2026-09-28")],
  "old-iranian-1348047": [publicYouTubeVideo("raxoBF7hH7c", "Tatilat-e Dash Esmaeil (1969) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1348054": [publicYouTubeVideo("cjcfLJj8F2c", "Chicho o Franco Vatani (1969) - full film", "Shouka Film", undefined, "2026-09-28")],
};

// Ninetieth review batch: exact 1348/1969 feature uploads. Adl Elahi is the
// only item in this batch whose publisher supplied a reliable runtime.
const BATCH_NINETY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348004": [publicYouTubeVideo("1NttYCoLPUY", "Adl Elahi (1969) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-28")],
  "old-iranian-1348007": [publicYouTubeVideo("3xzSlFC0LqM", "Ghatelin Ham Migeryand (1969) - full film", "Shouka Film", undefined, "2026-09-28")],
  "old-iranian-1348024": [publicYouTubeVideo("TsFfopx5t3Q", "Ghool Biabooni (1969) - full film", "Film Ghadimi", undefined, "2026-09-28")],
  "old-iranian-1348029": [publicYouTubeVideo("v0DEk636pPo", "Gonah-e Madar (1969) - full film", "FilmFarsi", undefined, "2026-09-28")],
};

// Ninety-first review batch: two more exact 1348 feature uploads. Both are
// labelled as complete by the publishing archive; no guessed runtime added.
const BATCH_NINETY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348035": [publicYouTubeVideo("pY8CxCVQiHs", "Donyaye Abi (1969) - full film", "Hezar-o-Yek Shab", undefined, "2026-09-28")],
  "old-iranian-1348041": [publicYouTubeVideo("q1vQTzeJGIs", "Emshab Dokhtari Mimirad (1969) - full film", "FilmFarsi", undefined, "2026-09-28")],
};

// Ninety-second review batch: exact 1348/1969 feature uploads. The Behesht
// Dour Nist runtime is stated in the publisher's film metadata.
const BATCH_NINETY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348019": [publicYouTubeVideo("uR-Oz8kujHc", "Jodaei (1969) - full film", "FilmFarsi", undefined, "2026-09-28")],
  "old-iranian-1348044": [publicYouTubeVideo("SKpVJURC39s", "Behesht Dour Nist (1969) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-28")],
  "old-iranian-1348045": [publicYouTubeVideo("Snh3ERFOqGs", "Malek Dozakh (1969) - full film", "Pars Films", undefined, "2026-09-28")],
};

// Ninety-third review batch: two direct uploads for 1348/1969 titles. Search
// results that were only trailers, excerpts, or external download pages stay
// excluded from the playable catalogue.
const BATCH_NINETY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348033": [publicYouTubeVideo("68bYzY6m-Wo", "Baba Kuhi (1969) - full film", "Shouka Film", undefined, "2026-09-28")],
  "old-iranian-1348036": [publicYouTubeVideo("dAGNHdzoIE0", "Gorbeh Ra Dam-e Hejleh Mikoshad (1969) - full film", "Persian Films Archive", undefined, "2026-09-28")],
};

// Ninety-fourth review batch: an exact 1963 feature upload for the archive
// title Ashk-ha va Khandeha. External archive pages and short excerpts stay
// excluded from the playable catalogue.
const BATCH_NINETY_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343008": [publicYouTubeVideo("5TWlZVRRIdk", "Ashk-ha va Khandeha (1963) - full film", "Shouka Film", undefined, "2026-09-28")],
};

// Ninety-fifth review batch: two exact 1967 feature uploads whose published
// metadata includes runtimes above one hour.
const BATCH_NINETY_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346015": [publicYouTubeVideo("NYC1ncX7nrQ", "Iman (1967) - full film - 94 minutes", "Pars Film Official", 5640, "2026-09-28")],
  "old-iranian-1345053": [publicYouTubeVideo("Hm9pYO6pobw", "Bazoo Talaei (1967) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-28")],
};

// Ninety-ninth review batch: the exact feature upload for Iron Claw (1347).
// The indexed YouTube title identifies the upload as the complete film;
// runtime is left unset because the source does not expose reliable metadata.
const BATCH_NINETY_NINE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347026": [publicYouTubeVideo("1Swkxd19bhE", "Panjeh Ahaniin (1968) - full film", "Classic Iranian Cinema Archive", undefined, "2026-09-28")],
};

// One-hundred-first review batch: two direct full-film uploads for the
// 1970 archive titles Reza, the Motorcyclist and Jafar and Golnar.
const BATCH_ONE_HUNDRED_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349043": [publicYouTubeVideo("ugThrMN-IqI", "Reza Motori (1970) - full film - 87 minutes", "فیلم قدیمی", 5220, "2026-09-28")],
  "old-iranian-1349047": [publicYouTubeVideo("ATTG9Iyw0NY", "Jafar and Golnar (1970) - full film - 94 minutes", "فیلم قدیمی", 5640, "2026-09-28")],
};

// One-hundred-second review batch: exact full-film uploads for two 1970/71
// archive records. The YouTube listings identify both uploads as complete
// films, with the Qahremanan listing exposing a 90-minute runtime.
const BATCH_ONE_HUNDRED_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349054": [publicYouTubeVideo("J7goiOYL3m8", "Aroos-e Bianca (1971) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1349042": [publicYouTubeVideo("sjfGp4ctj9Y", "Qahremanan Nemimirand (1970) - full film - 90 minutes", "Pars Film Official", 5400, "2026-09-28")],
};

// One-hundred-third review batch: one exact full-film upload for the 1970
// archive title Janjal-e Aroosi. The indexed listing identifies it as a full
// film; no duration is stored because the source metadata is not reliable.
const BATCH_ONE_HUNDRED_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1349029": [publicYouTubeVideo("d0EqauPoGvY", "Janjal-e Aroosi (1970) - full film", "Persian Comedy Channel", undefined, "2026-09-28")],
};

// One-hundred-fourth review batch: the exact 1974 upload for Majarajoyane
// Khashen. The catalogue records a 100-minute feature and the indexed listing
// identifies the matching full-length Iranian film.
const BATCH_ONE_HUNDRED_FOUR_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353053": [publicYouTubeVideo("4MW0KFFQke8", "Majarajoyane Khashen (1974) - full film - 100 minutes", "Pars Film Official", 6000, "2026-09-28")],
};

// One-hundred-fifth review batch: direct full-film upload for Pari Khoshgeleh
// (1353). The YouTube title matches the catalogue title and the indexed media
// record confirms a 91-minute feature, so this is safe to expose as a player.
const BATCH_ONE_HUNDRED_FIVE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1353011": [publicYouTubeVideo("6HClUhQZevw", "Pari Khoshgeleh (1974) - full film", "FilmFarsi", 5513, "2026-09-28")],
};

// One-hundred-sixth review batch: exact 1975 full-film upload for The
// Mandrake (Mehre giah). The catalogue and IMDb identify the same Iranian
// feature, while the archived source confirms the YouTube video's runtime.
const BATCH_ONE_HUNDRED_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354008": [publicYouTubeVideo("hJy8iFBIj1E", "The Mandrake (1975) - full film - Mehre giah", "Pars Film Studio", 6069, "2026-09-29")],
};

// One-hundred-seventh review batch: exact 1975 full-film upload for Golden
// Heel (Pashneh Tala). The publisher's listing names the same feature and
// provides a 114-minute runtime.
const BATCH_ONE_HUNDRED_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354002": [publicYouTubeVideo("PKMW8M6HHko", "Golden Heel (1975) - full film - Pashneh Tala", "Pars Film Official", 6840, "2026-09-29")],
};

// One-hundredth review batch: a direct full-film upload for Goodbye Little
// One (1354). The catalogue runtime is 102 minutes and the indexed YouTube
// title identifies the upload as a complete film.
const BATCH_ONE_HUNDRED_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1354049": [publicYouTubeVideo("HRvEXyLSGmo", "Khodahafez Koochooloo (1976) - full film - 102 minutes", "فیلم قدیمی", 6120, "2026-09-28")],
};

// Ninety-eighth review batch: exact 1967 feature uploads for the next two
// archive titles. Their catalog runtimes are above one hour and the indexed
// YouTube results identify the matching films, so both are safe direct players.
const BATCH_NINETY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345041": [publicYouTubeVideo("296hPeOTw-U", "Se Ghahreman (1967) - full film - 105 minutes", "Classic Iranian Cinema Archive", 6300, "2026-09-28")],
  "old-iranian-1345049": [publicYouTubeVideo("qQwilsgX5EQ", "Haroon and Gharoon (1967) - full film - 91 minutes", "Classic Iranian Cinema Archive", 5460, "2026-09-28")],
};

// Ninety-seventh review batch: an exact 1966 feature upload for Amir Arsalan
// Namdar. The indexed YouTube listing identifies it as the complete film;
// duration is intentionally left unset until the source exposes reliable
// runtime metadata.
const BATCH_NINETY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345021": [publicYouTubeVideo("-QzqgokJ0O0", "Amir Arsalan Namdar (1966) - full film", "Classic Iranian Cinema Archive", undefined, "2026-09-28")],
};

// Ninety-sixth review batch: the exact 1968 feature upload for Ghahraman-e
// Shahre Ma, with the catalogue runtime above one hour.
const BATCH_NINETY_SIX_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1346051": [publicYouTubeVideo("PQH_etJ6kg8", "Ghahraman-e Shahre Ma (1968) - full film - 98 minutes", "Cinema Rex / Pars Films", 5880, "2026-09-28")],
};

// Eighty-seventh review batch: exact 1968 archive titles with direct,
// feature-film YouTube uploads. Trailer-only results were excluded.
const BATCH_EIGHTY_SEVEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1347020": [publicYouTubeVideo("gh1-HWF0-hk", "Pa Barahneh-ha (1968) - full film", "Bikiha", undefined, "2026-09-28")],
  "old-iranian-1347036": [publicYouTubeVideo("IDRjRjoa0w4", "Mard-e Sahra (1968) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1347040": [publicYouTubeVideo("DMk2B5pyj0c", "Dozd-e Siahpoosh (1968) - full film", "YouTube old-film archive", undefined, "2026-09-28")],
  "old-iranian-1347046": [publicYouTubeVideo("cvle93i4Y54", "Avareh-haye Tehran (1968) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1347052": [publicYouTubeVideo("UlqstbVxzWU", "Yousef va Zoleykha (1968) - full film", "YouTube old-film archive", undefined, "2026-09-28")],
  "old-iranian-1347054": [publicYouTubeVideo("xIm_PZMUTDg", "Biganeh Bia (1968) - full film", "YouTube old-film archive", undefined, "2026-09-28")],
  "old-iranian-1347061": [publicYouTubeVideo("8cJp_E1WpCg", "Donyaye Pooshali (1968) - full film", "Cinema Rex", undefined, "2026-09-28")],
  "old-iranian-1347063": [publicYouTubeVideo("bA29ds4JtPc", "Khashm-e Kooli (1968) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1347068": [publicYouTubeVideo("mYqD8WtgK4M", "Poli Be Sooye Behesht (1968) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1347071": [publicYouTubeVideo("PUW_WmipSc4", "Chaker Shoma Koochooloo (1968) - full film - 90 minutes", "Hezar-o-Yek Shab", 5400, "2026-09-28")],
};

// Eighty-eighth review batch: exact 1969/1348 archive titles with direct,
// feature-film uploads. The Do Del o Yek Delbar runtime comes from the
// indexed YouTube metadata surfaced by the search result.
const BATCH_EIGHTY_EIGHT_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1348010": [publicYouTubeVideo("w__UGyTOZHA", "Nareh Toofan (1969) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1348011": [publicYouTubeVideo("uy7GGKST1pk", "Do Del o Yek Delbar (1969) - full film - 110 minutes", "Pars Films", 6633, "2026-09-28")],
  "old-iranian-1348013": [publicYouTubeVideo("eutuv_yasJs", "Ghalb-haye Talaei (1969) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1348017": [publicYouTubeVideo("eFsu4sfOSNQ", "Rabeteh (1969) - full film", "Persian old-film archive", undefined, "2026-09-28")],
  "old-iranian-1348026": [publicYouTubeVideo("qz77DN7MJqo", "Khaneh Kenar-e Darya (1969) - full film", "Pars Media", undefined, "2026-09-28")],
  "old-iranian-1348028": [publicYouTubeVideo("ufZcuIa-w4Q", "Setareh Forouzan (1969) - full film", "Pars Films", undefined, "2026-09-28")],
  "old-iranian-1348037": [publicYouTubeVideo("TQqSpX_HMuQ", "Kasb-haye Mahall (1969) - full film", "Cinema Rex", undefined, "2026-09-28")],
  "old-iranian-1348038": [publicYouTubeVideo("P0aExsYhT9k", "Mojezeh-ye Ghalb-ha (1969) - full film", "Cinema Rex", undefined, "2026-09-28")],
  "old-iranian-1348039": [publicYouTubeVideo("SVX3Fus24p8", "Zarb-e Shast (1969) - full film", "Film Farsi", undefined, "2026-09-28")],
  "old-iranian-1348040": [publicYouTubeVideo("lFpgZJmD7vU", "Zan-e Vahshi Vahshi (1969) - full film", "YouTube old-film archive", undefined, "2026-09-28")],
};

// Twenty-third review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_TWENTY_THREE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344036": [publicYouTubeVideo("xunhZi-PY8E", "The Gamecock (1965) · full film", "Film Rangi", undefined, "2026-09-27")],
  "old-iranian-1344043": [publicYouTubeVideo("XqApDzWjy5I", "Three Private Detectives (1965) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1346044": [publicYouTubeVideo("OO4sDmRAwnU", "Diamond 33 (1967) · full film", "Shouka Film", undefined, "2026-09-27")],
  "old-iranian-1347012": [publicYouTubeVideo("vKW1wwnU_H0", "The Red Plain (1968) · full film", "Film Rangi", undefined, "2026-09-27")],
  "old-iranian-1347013": [publicYouTubeVideo("0EaI-7wVh0A", "Three Crazies (1968) · full film", "Lalezar", undefined, "2026-09-27")],
};

// Twenty-second review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_TWENTY_TWO_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1345002": [publicYouTubeVideo("oinmr9KPyu4", "Shamsi Pahlevan (1966) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1345007": [publicYouTubeVideo("i9BGhhY1JDI", "Aseyan (1966) · full film", "Iranian Movies", undefined, "2026-09-27")],
};

// Twenty-first review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_TWENTY_ONE_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1344012": [publicYouTubeVideo("9-LgBgXkhTM", "Stigma (1965) · full film", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1344016": [publicYouTubeVideo("yMxnW1UjdDg", "Woman and Her Dolls (1965) · full film", "Beykiha", undefined, "2026-09-27")],
  "old-iranian-1344020": [publicYouTubeVideo("4aVOKzE1MyU", "Jallad (1965) · full film", "Iranian Movies", undefined, "2026-09-27")],
  "old-iranian-1344024": [publicYouTubeVideo("JshKBDG8kS4", "The World of Money (1965) · full film", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1345001": [publicYouTubeVideo("IzFiqn2M1Jw", "Hosseyn Kord Shabestari (1966) · full film", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1345018": [publicYouTubeVideo("BJ2FpQLUjgE", "The Mummy (1966) · full film", "Film Rangi", undefined, "2026-09-27")],
};

// Twentieth review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_TWENTY_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1343031": [publicYouTubeVideo("x6J1xMODb5A", "Night of the Hunchback (1965) · full film", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1344010": [publicYouTubeVideo("n9n24BOBmNA", "The Bride of the Sea (1965) · full film", "Pars Films", undefined, "2026-09-27")],
};

// Nineteenth review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_NINETEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1339015": [publicYouTubeVideo("iucm8f-L-3M", "In Search of the Groom (1959) · full film", "Pars Films", undefined, "2026-09-27")],
  "old-iranian-1344003": [publicYouTubeVideo("p-ijPlZWDZQ", "The Champion of Champions (1965) · full film", "FilmFarsi", undefined, "2026-09-27")],
  "old-iranian-1344005": [publicYouTubeVideo("LovNfMJr2cU", "Sarsam (1965) · full film", "FilmFarsi", undefined, "2026-09-27")],
};

// Eighteenth review batch: exact full-film uploads whose catalogue titles
// match the archive entries. Trailers and short excerpts stay excluded.
const BATCH_EIGHTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1340020": [publicYouTubeVideo("SWn2xqOtpNs", "One Step to Death (1961) · full film", "Iranian Movies", undefined, "2026-09-27")],
  "old-iranian-1341019": [publicYouTubeVideo("QSiI8VvJ2zA", "Gorghaye Gorosneh (1962) · full film", "FilmFarsi", undefined, "2026-09-27")],
};

// Seventeenth review batch: an exact full-film upload whose catalogue title
// and year match the archive entry. Trailers and short excerpts stay excluded.
const BATCH_SEVENTEEN_YOUTUBE_BY_ID: Record<string, YouTubeSource[]> = {
  "old-iranian-1340009": [publicYouTubeVideo("11kADOKa07U", "The Daughters of Eve (1961) · full film", "Iranian Movies", undefined, "2026-09-27")],
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
  const key = id.toLowerCase();
  if (BATCH_ONE_HUNDRED_NINETY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FORTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FORTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWENTY_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWENTY_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINETEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINETEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVENTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVENTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIXTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIXTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIFTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIFTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FOURTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FOURTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THIRTEEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THIRTEEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWELVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWELVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_ELEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_ELEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_NINE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_SIX_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FIVE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_FOUR_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_THREE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_TWO_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_ONE_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_ONE_HUNDRED_YOUTUBE_BY_ID[key]) return BATCH_ONE_HUNDRED_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_NINE_YOUTUBE_BY_ID[key]) return BATCH_NINETY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_NINETY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_NINETY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_SIX_YOUTUBE_BY_ID[key]) return BATCH_NINETY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_NINETY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_NINETY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_THREE_YOUTUBE_BY_ID[key]) return BATCH_NINETY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_TWO_YOUTUBE_BY_ID[key]) return BATCH_NINETY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_ONE_YOUTUBE_BY_ID[key]) return BATCH_NINETY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_NINETY_YOUTUBE_BY_ID[key]) return BATCH_NINETY_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_NINE_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_NINE_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_EIGHT_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_EIGHT_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_SEVEN_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_SEVEN_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_SIX_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_SIX_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_FIVE_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_FIVE_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_FOUR_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_FOUR_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_THREE_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_THREE_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_TWO_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_TWO_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_ONE_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_ONE_YOUTUBE_BY_ID[key];
  if (BATCH_EIGHTY_YOUTUBE_BY_ID[key]) return BATCH_EIGHTY_YOUTUBE_BY_ID[key];
  return getOldIranianFilmMedia(id)?.youtubeVideos ?? BATCH_SEVENTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTY_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_SIXTY_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_YOUTUBE_BY_ID[key] ?? BATCH_NINETEEN_YOUTUBE_BY_ID[key] ?? BATCH_EIGHTEEN_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTEEN_YOUTUBE_BY_ID[key] ?? BATCH_SIXTEEN_YOUTUBE_BY_ID[key] ?? BATCH_FIFTEEN_YOUTUBE_BY_ID[key] ?? BATCH_FOURTEEN_YOUTUBE_BY_ID[key] ?? BATCH_THIRTEEN_YOUTUBE_BY_ID[key] ?? BATCH_TWELVE_OITN_YOUTUBE_BY_ID[key] ?? BATCH_ONE_YOUTUBE_BY_ID[key] ?? BATCH_TWO_YOUTUBE_BY_ID[key] ?? BATCH_THREE_YOUTUBE_BY_ID[key] ?? BATCH_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_SIX_YOUTUBE_BY_ID[key] ?? BATCH_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_NINE_YOUTUBE_BY_ID[key] ?? BATCH_TEN_YOUTUBE_BY_ID[key] ?? BATCH_ELEVEN_YOUTUBE_BY_ID[key] ?? null;
}

/**
 * Enriches legacy source-only records without manufacturing a direct file link.
 * The source remains a public page/YouTube reference and is intentionally not
 * converted into a fake playable VodLink.
 */
export function enrichOldIranianFilm(item: VodItem): VodItem {
  const media = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  // Curated mappings are checked first so a newly verified full-film upload
  // can replace a stale trailer that was already persisted in a title cache.
  const curatedYouTubeVideos = getOldIranianYouTubeVideos(item.id) ?? getOldIranianYouTubeVideos(item.imdbCode);
  const youtubeVideos = curatedYouTubeVideos?.length ? curatedYouTubeVideos : item.youtubeVideos?.length ? item.youtubeVideos : undefined;
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
