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
  return getOldIranianFilmMedia(id)?.youtubeVideos ?? BATCH_ONE_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_TWO_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_THREE_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_FOUR_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_FIVE_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_SIX_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_SEVEN_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_EIGHT_YOUTUBE_BY_ID[id.toLowerCase()] ?? BATCH_NINE_YOUTUBE_BY_ID[id.toLowerCase()] ?? null;
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
