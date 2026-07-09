export const LOCALE_COOKIE = "vod_locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "fa"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const dictionaries = {
  en: {
    localeName: "English",
    common: {
      all: "All",
      admin: "Admin",
      animation: "Animation",
      apply: "Apply",
      backHome: "Back home",
      backToVod: "Back to VOD",
      bestFile: "Best file",
      bestMovies: "Best Movies",
      bestSeries: "Best Series",
      browse: "Browse",
      details: "Details",
      file: "File",
      files: "files",
      find: "Find",
      films: "Films",
      home: "Home",
      imdb: "IMDb",
      kids: "Kids",
      loading: "Loading",
      movie: "Movie",
      next: "Next",
      play: "Play",
      playOnline: "Play online",
      previous: "Previous",
      recentFilm: "Recent Film",
      reset: "Reset",
      search: "Search",
      series: "Series",
      subtitles: "Subtitles",
      thinking: "Thinking",
      titles: "titles",
      topImdb: "Top IMDb",
      viewAll: "View all",
      viewImdb: "View IMDb",
    },
    nav: {
      topImdb: "Top IMDb",
      films: "Films",
      series: "Series",
      animation: "Animation",
      admin: "Admin",
      browse: "Browse",
    },
    home: {
      searchPlaceholder: "Search films, series, IMDb ID...",
      aiPrompt: "dark crime series above IMDb 8",
      spotlight: "Spotlight Rail",
      wideTitle: "Signature Frames",
      wideSubtitle: "Bigger cinematic cards mixed into the page for a richer browsing rhythm.",
      wideAction: "Open title",
      sections: {
        "top-imdb": {
          title: "Top 250 IMDb",
          subtitle: "Highest rated films and series matched to direct source links.",
        },
        "recent-films": {
          title: "Recent Film",
          subtitle: "Newest movie entries with posters, scores, and playable files.",
        },
        "best-movies": {
          title: "Best Movies",
          subtitle: "High-score films ready for fast browsing and download.",
        },
        "best-series": {
          title: "Best Series",
          subtitle: "Series with strong IMDb scores and season-ready download pages.",
        },
        kids: {
          title: "Kids",
          subtitle: "Family and kids titles from the archive.",
        },
        animation: {
          title: "Animation",
          subtitle: "Animated films and series with posters and streamable links.",
        },
        "recent-trailers": {
          title: "Recent Trailers",
          subtitle: "Newer titles with cinematic artwork and trailer-ready pages.",
        },
        "latest-series": {
          title: "Recent Episodes",
          subtitle: "Series with the latest seasons and the most episode files.",
        },
        "ai-curated": {
          title: "AI Curated",
          subtitle: "Dark, quiet, high-score cinema selected by the local matcher.",
        },
      },
    },
    browse: {
      titleFallback: "Browse Library",
      pageOf: "Page {page} of {total}",
      showing: "Showing {count} of {total}",
      searchPlaceholder: "Search title, IMDb code, genre...",
      type: "Type",
      genre: "Genre",
      year: "Year",
      quality: "Quality",
      imdbScore: "IMDb Score",
    },
    ai: {
      kicker: "AI Search",
      placeholder: "Describe mood, genre, year, country, IMDb score...",
      match: "Match",
      prompts: [
        { label: "dark crime series above IMDb 8", query: "dark crime series above IMDb 8" },
        { label: "luxury slow drama with mystery", query: "luxury slow drama with mystery" },
        { label: "new animation for kids", query: "new animation for kids" },
        { label: "short sci-fi movie after 2015", query: "short sci-fi movie after 2015" },
      ],
    },
    title: {
      originalTitle: "Original title",
      runtime: "Runtime",
      rating: "Rating",
      votes: "Votes",
      metascore: "Metascore",
      imdbData: "IMDb Data",
      subzoneSubtitles: "Subzone subtitles",
      tabs: {
        about: "About",
        episodes: "Episodes & Seasons",
        suggestions: "Suggestions",
      },
      trailersPictures: "Trailers & Pictures",
      trailersPicturesNote: "{trailers} trailers / {pictures} pictures",
      castCrew: "Cast & Crew",
      people: "people",
      data: "Data",
      type: "Type",
      year: "Year",
      end: "End",
      release: "Release",
      certificate: "Cert",
      country: "Country",
      language: "Language",
      qualities: "Qualities",
      open: "Open",
      openPicture: "Open picture",
      openPoster: "Open poster",
    },
    downloads: {
      files: "Files",
      sourceCount: "{count} sources",
      loadError: "Could not load episode files. Try another season.",
      seasonFile: "Season file",
      episodeFallback: "Episode files are ready by quality. A short synopsis appears here when episode metadata is available.",
      seasonFallback: "This season is available as direct sources. Open a source to view or download its files.",
      season: "Season",
      seasonPack: "Season pack",
      episode: "Episode",
    },
    player: {
      pause: "Pause",
      volume: "Volume",
      cast: "Cast",
      full: "Full",
      settings: "Settings",
      quality: "Quality",
      speed: "Speed",
      subtitleUrl: "Subtitle URL",
      subtitlePlaceholder: "Paste .vtt subtitle URL",
      source: "Source",
      sources: "sources",
      stream: "stream",
      pipUnavailable: "Picture in Picture is not available.",
      pipFailed: "Picture in Picture could not start.",
      castUnavailable: "Cast is not available in this browser.",
      castFailed: "Cast could not start.",
      playbackBlocked: "Playback blocked by browser or source.",
      sourceError: "This source may need a compatible browser or direct stream file.",
    },
    admin: {
      title: "Download Base URL",
      intro: "Change the DonyayeSerial host once. Detail pages, player sources, movie downloads, and episode quality links will use the new base immediately.",
      currentBase: "Current base",
      updateLinks: "Update links",
      updating: "Updating",
      success: "Base URL updated. All download links now use the new host.",
      failed: "Update failed.",
      activeBase: "Active base",
      updated: "Updated",
      originalSample: "Original sample",
      afterRewrite: "After rewrite",
      defaultValue: "Default",
    },
  },
  fa: {
    localeName: "فارسی",
    common: {
      all: "همه",
      admin: "مدیریت",
      animation: "انیمیشن",
      apply: "اعمال",
      backHome: "بازگشت خانه",
      backToVod: "بازگشت به VOD",
      bestFile: "بهترین فایل",
      bestMovies: "بهترین فیلم ها",
      bestSeries: "بهترین سریال ها",
      browse: "آرشیو",
      details: "جزئیات",
      file: "فایل",
      files: "فایل",
      find: "پیدا کن",
      films: "فیلم ها",
      home: "خانه",
      imdb: "IMDb",
      kids: "کودک",
      loading: "در حال بارگذاری",
      movie: "فیلم",
      next: "بعدی",
      play: "پخش",
      playOnline: "پخش آنلاین",
      previous: "قبلی",
      recentFilm: "فیلم های جدید",
      reset: "پاک کردن",
      search: "جستجو",
      series: "سریال",
      subtitles: "زیرنویس",
      thinking: "در حال فکر کردن",
      titles: "عنوان",
      topImdb: "برترین IMDb",
      viewAll: "مشاهده همه",
      viewImdb: "مشاهده IMDb",
    },
    nav: {
      topImdb: "برترین IMDb",
      films: "فیلم ها",
      series: "سریال ها",
      animation: "انیمیشن",
      admin: "مدیریت",
      browse: "آرشیو",
    },
    home: {
      searchPlaceholder: "جستجوی فیلم، سریال یا کد IMDb...",
      aiPrompt: "dark crime series above IMDb 8",
      spotlight: "ریل ویژه",
      wideTitle: "قاب های ویژه",
      wideSubtitle: "کارت های بزرگ تر سینمایی برای ریتم لوکس تر در مرور صفحه.",
      wideAction: "باز کردن عنوان",
      sections: {
        "top-imdb": {
          title: "۲۵۰ برتر IMDb",
          subtitle: "بالاترین امتیازها با لینک های مستقیم منبع.",
        },
        "recent-films": {
          title: "فیلم های جدید",
          subtitle: "جدیدترین فیلم ها با پوستر، امتیاز و فایل آماده پخش.",
        },
        "best-movies": {
          title: "بهترین فیلم ها",
          subtitle: "فیلم های پرامتیاز برای مرور سریع و دانلود.",
        },
        "best-series": {
          title: "بهترین سریال ها",
          subtitle: "سریال های پرامتیاز با صفحه فصل ها و قسمت ها.",
        },
        kids: {
          title: "کودک",
          subtitle: "عنوان های مناسب خانواده و کودک از آرشیو.",
        },
        animation: {
          title: "انیمیشن",
          subtitle: "فیلم و سریال انیمیشن با پوستر و لینک پخش.",
        },
        "recent-trailers": {
          title: "تریلرهای جدید",
          subtitle: "عنوان های تازه با تصویر سینمایی و صفحه تریلر.",
        },
        "latest-series": {
          title: "قسمت های جدید",
          subtitle: "سریال هایی با فصل های تازه و فایل های بیشتر.",
        },
        "ai-curated": {
          title: "انتخاب هوشمند",
          subtitle: "پیشنهادهای تاریک، آرام و پرامتیاز با جستجوی محلی.",
        },
      },
    },
    browse: {
      titleFallback: "مرور آرشیو",
      pageOf: "صفحه {page} از {total}",
      showing: "نمایش {count} از {total}",
      searchPlaceholder: "جستجوی عنوان، کد IMDb یا ژانر...",
      type: "نوع",
      genre: "ژانر",
      year: "سال",
      quality: "کیفیت",
      imdbScore: "امتیاز IMDb",
    },
    ai: {
      kicker: "جستجوی هوشمند",
      placeholder: "حال و هوا، ژانر، سال، کشور یا امتیاز IMDb را بنویس...",
      match: "تطبیق",
      prompts: [
        { label: "سریال جنایی تاریک بالای IMDb 8", query: "dark crime series above IMDb 8" },
        { label: "درام آرام لوکس با معما", query: "luxury slow drama with mystery" },
        { label: "انیمیشن جدید برای کودک", query: "new animation for kids" },
        { label: "فیلم کوتاه علمی تخیلی بعد از 2015", query: "short sci-fi movie after 2015" },
      ],
    },
    title: {
      originalTitle: "عنوان اصلی",
      runtime: "مدت",
      rating: "امتیاز",
      votes: "رای",
      metascore: "متااسکور",
      imdbData: "داده IMDb",
      subzoneSubtitles: "زیرنویس Subzone",
      tabs: {
        about: "درباره",
        episodes: "قسمت ها و فصل ها",
        suggestions: "پیشنهادها",
      },
      trailersPictures: "تریلرها و تصاویر",
      trailersPicturesNote: "{trailers} تریلر / {pictures} تصویر",
      castCrew: "بازیگران و عوامل",
      people: "نفر",
      data: "داده ها",
      type: "نوع",
      year: "سال",
      end: "پایان",
      release: "انتشار",
      certificate: "رده",
      country: "کشور",
      language: "زبان",
      qualities: "کیفیت ها",
      open: "باز کردن",
      openPicture: "باز کردن تصویر",
      openPoster: "باز کردن پوستر",
    },
    downloads: {
      files: "فایل ها",
      sourceCount: "{count} منبع",
      loadError: "فایل های قسمت بارگذاری نشد. فصل دیگری را امتحان کن.",
      seasonFile: "فایل فصل",
      episodeFallback: "فایل های این قسمت بر اساس کیفیت آماده اند. وقتی متادیتا پیدا شود خلاصه قسمت اینجا نمایش داده می شود.",
      seasonFallback: "این فصل به صورت منبع مستقیم موجود است. برای مشاهده یا دانلود، یک منبع را باز کن.",
      season: "فصل",
      seasonPack: "پکیج فصل",
      episode: "قسمت",
    },
    player: {
      pause: "توقف",
      volume: "صدا",
      cast: "کست",
      full: "تمام صفحه",
      settings: "تنظیمات",
      quality: "کیفیت",
      speed: "سرعت",
      subtitleUrl: "لینک زیرنویس",
      subtitlePlaceholder: "لینک زیرنویس .vtt را وارد کن",
      source: "منبع",
      sources: "منبع",
      stream: "استریم",
      pipUnavailable: "تصویر در تصویر در این مرورگر در دسترس نیست.",
      pipFailed: "تصویر در تصویر اجرا نشد.",
      castUnavailable: "کست در این مرورگر در دسترس نیست.",
      castFailed: "کست اجرا نشد.",
      playbackBlocked: "مرورگر یا منبع اجازه پخش نداد.",
      sourceError: "این منبع شاید به مرورگر سازگار یا فایل مستقیم نیاز داشته باشد.",
    },
    admin: {
      title: "آدرس پایه دانلود",
      intro: "هاست DonyayeSerial را یک بار تغییر بده. صفحه جزئیات، پلیر، دانلود فیلم و لینک کیفیت قسمت ها بلافاصله از آدرس جدید استفاده می کنند.",
      currentBase: "آدرس فعلی",
      updateLinks: "به روزرسانی لینک ها",
      updating: "در حال به روزرسانی",
      success: "آدرس پایه به روز شد. همه لینک های دانلود از هاست جدید استفاده می کنند.",
      failed: "به روزرسانی ناموفق بود.",
      activeBase: "آدرس فعال",
      updated: "به روز شده",
      originalSample: "نمونه اصلی",
      afterRewrite: "بعد از بازنویسی",
      defaultValue: "پیش فرض",
    },
  },
} as const;

export type UiDictionary = (typeof dictionaries)[Locale];

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "fa" ? "fa" : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): UiDictionary {
  return dictionaries[locale];
}

export function isRtl(locale: Locale) {
  return locale === "fa";
}

export function numberFormatLocale(locale: Locale) {
  return locale === "fa" ? "fa-IR" : "en-US";
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(numberFormatLocale(locale)).format(value);
}

export function typeLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();
  const t = getDictionary(locale).common;
  if (normalized === "series" || normalized === "tv") return t.series;
  if (normalized === "movie" || normalized === "film") return t.movie;
  return value;
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
