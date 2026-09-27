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
  return getOldIranianFilmMedia(id)?.youtubeVideos ?? BATCH_FIFTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_FIFTY_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_FORTY_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_THIRTY_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_NINE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_SIX_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_THREE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_TWO_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_ONE_YOUTUBE_BY_ID[key] ?? BATCH_TWENTY_YOUTUBE_BY_ID[key] ?? BATCH_NINETEEN_YOUTUBE_BY_ID[key] ?? BATCH_EIGHTEEN_YOUTUBE_BY_ID[key] ?? BATCH_SEVENTEEN_YOUTUBE_BY_ID[key] ?? BATCH_SIXTEEN_YOUTUBE_BY_ID[key] ?? BATCH_FIFTEEN_YOUTUBE_BY_ID[key] ?? BATCH_FOURTEEN_YOUTUBE_BY_ID[key] ?? BATCH_THIRTEEN_YOUTUBE_BY_ID[key] ?? BATCH_TWELVE_OITN_YOUTUBE_BY_ID[key] ?? BATCH_ONE_YOUTUBE_BY_ID[key] ?? BATCH_TWO_YOUTUBE_BY_ID[key] ?? BATCH_THREE_YOUTUBE_BY_ID[key] ?? BATCH_FOUR_YOUTUBE_BY_ID[key] ?? BATCH_FIVE_YOUTUBE_BY_ID[key] ?? BATCH_SIX_YOUTUBE_BY_ID[key] ?? BATCH_SEVEN_YOUTUBE_BY_ID[key] ?? BATCH_EIGHT_YOUTUBE_BY_ID[key] ?? BATCH_NINE_YOUTUBE_BY_ID[key] ?? BATCH_TEN_YOUTUBE_BY_ID[key] ?? BATCH_ELEVEN_YOUTUBE_BY_ID[key] ?? null;
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
