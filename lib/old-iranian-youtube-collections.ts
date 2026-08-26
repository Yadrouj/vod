/**
 * Curated public YouTube playlists for classic Iranian cinema.
 *
 * These are outbound references only: SarvNema does not download, host, or
 * represent the videos as its own media. Keep the list intentionally small
 * and editorial so the archive page stays quick to render.
 */
export type OldIranianYouTubeCollection = {
  id: string;
  title: string;
  description: string;
  playlistId: string;
  url: string;
  kind: "films" | "scenes";
};

const filmFarsiPlaylist = (playlistId: string) =>
  `https://www.youtube.com/playlist?list=${playlistId}`;

export const OLD_IRANIAN_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@filmfarsichannel";

/**
 * Public collection links listed by FilmFarsi in its channel description.
 * The source describes the channel as a classic pre-revolution Iranian cinema
 * archive. Playlist availability is controlled by YouTube and its publisher.
 */
export const OLD_IRANIAN_YOUTUBE_COLLECTIONS: OldIranianYouTubeCollection[] = [
  {
    id: "naser-malek-motiei",
    title: "بهترین فیلم‌های ناصر ملک‌مطیعی",
    description: "گلچینی از آثار ناصر ملک‌مطیعی",
    playlistId: "PLkvFABnKzzvoE_Y-Gu_rg8uM7hnD2_doq",
    url: filmFarsiPlaylist("PLkvFABnKzzvoE_Y-Gu_rg8uM7hnD2_doq"),
    kind: "films",
  },
  {
    id: "shahnaz-tehrani",
    title: "بهترین فیلم‌های شهناز تهرانی",
    description: "مجموعه آثار شهناز تهرانی",
    playlistId: "PLkvFABnKzzvqxxN1wJ_Wy_Vvk5Lx_XTBQ",
    url: filmFarsiPlaylist("PLkvFABnKzzvqxxN1wJ_Wy_Vvk5Lx_XTBQ"),
    kind: "films",
  },
  {
    id: "fifties",
    title: "بهترین فیلم‌های دهه پنجاه",
    description: "مرور سینمای ایران در دهه ۵۰",
    playlistId: "PLkvFABnKzzvraKAcNSVUOlgNtZt0CFKc2",
    url: filmFarsiPlaylist("PLkvFABnKzzvraKAcNSVUOlgNtZt0CFKc2"),
    kind: "films",
  },
  {
    id: "bahman-mofid",
    title: "بهترین فیلم‌های بهمن مفید",
    description: "گلچین آثار بهمن مفید",
    playlistId: "PLkvFABnKzzvptSr4Y8TUh2EnXSQObg0Mn",
    url: filmFarsiPlaylist("PLkvFABnKzzvptSr4Y8TUh2EnXSQObg0Mn"),
    kind: "films",
  },
  {
    id: "poori-banaei",
    title: "بهترین فیلم‌های پوری بنایی",
    description: "مجموعه آثار پوری بنایی",
    playlistId: "PLkvFABnKzzvqMYxR8JxgNcdqg8l9gCjhq",
    url: filmFarsiPlaylist("PLkvFABnKzzvqMYxR8JxgNcdqg8l9gCjhq"),
    kind: "films",
  },
  {
    id: "classic-farsi",
    title: "فیلم فارسی قدیمی",
    description: "آرشیو منتخب فیلم‌های فارسی قدیمی",
    playlistId: "PLkvFABnKzzvrlDlAPk6T9J4EPhDCQNYO-",
    url: filmFarsiPlaylist("PLkvFABnKzzvrlDlAPk6T9J4EPhDCQNYO-"),
    kind: "films",
  },
  {
    id: "classic-comedy",
    title: "فیلم‌های قدیمی کمدی",
    description: "کمدی‌های کلاسیک ایرانی",
    playlistId: "PLkvFABnKzzvqx3KWtbro1s_Gq69XWUZgo",
    url: filmFarsiPlaylist("PLkvFABnKzzvqx3KWtbro1s_Gq69XWUZgo"),
    kind: "films",
  },
  {
    id: "behrouz-vossoughi",
    title: "فیلم‌های بهروز وثوقی",
    description: "گلچینی از آثار بهروز وثوقی",
    playlistId: "PLkvFABnKzzvq5AWWWQ8nBilSyyxVODFky",
    url: filmFarsiPlaylist("PLkvFABnKzzvq5AWWWQ8nBilSyyxVODFky"),
    kind: "films",
  },
  {
    id: "reza-beyk-imanverdi",
    title: "بهترین فیلم‌های رضا بیک‌ایمانوردی",
    description: "مجموعه آثار رضا بیک‌ایمانوردی",
    playlistId: "PLkvFABnKzzvpSDjp6mV6aHlU8fhH5ro_0",
    url: filmFarsiPlaylist("PLkvFABnKzzvpSDjp6mV6aHlU8fhH5ro_0"),
    kind: "films",
  },
  {
    id: "shahla-riahi",
    title: "بهترین فیلم‌های شهلا ریاحی",
    description: "گلچین آثار شهلا ریاحی",
    playlistId: "PLkvFABnKzzvpcHyEAfTUkrmwDHj0W4PJ1",
    url: filmFarsiPlaylist("PLkvFABnKzzvpcHyEAfTUkrmwDHj0W4PJ1"),
    kind: "films",
  },
  {
    id: "leila-forouhar",
    title: "فیلم‌های لیلا فروهر",
    description: "مجموعه فیلم‌های لیلا فروهر",
    playlistId: "PLkvFABnKzzvqTlkzdILEzeVGmN7cC82z2",
    url: filmFarsiPlaylist("PLkvFABnKzzvqTlkzdILEzeVGmN7cC82z2"),
    kind: "films",
  },
  {
    id: "googoosh",
    title: "فیلم‌های گوگوش",
    description: "گلچینی از فیلم‌های گوگوش",
    playlistId: "PLkvFABnKzzvqtktJVOpISiOSpS7-WmkUz",
    url: filmFarsiPlaylist("PLkvFABnKzzvqtktJVOpISiOSpS7-WmkUz"),
    kind: "films",
  },
  {
    id: "nosratollah-vahdat",
    title: "فیلم‌های نصرت‌الله وحدت",
    description: "مجموعه آثار نصرت‌الله وحدت",
    playlistId: "PLkvFABnKzzvrrts-gAO8zQd6ewFmyiP9O",
    url: filmFarsiPlaylist("PLkvFABnKzzvrrts-gAO8zQd6ewFmyiP9O"),
    kind: "films",
  },
  {
    id: "ali-miri",
    title: "بهترین فیلم‌های علی میری",
    description: "گلچین آثار علی میری",
    playlistId: "PLkvFABnKzzvon4knByiTQrdkbFk1iuAsk",
    url: filmFarsiPlaylist("PLkvFABnKzzvon4knByiTQrdkbFk1iuAsk"),
    kind: "films",
  },
  {
    id: "classic-iranian",
    title: "فیلم‌های قدیمی ایرانی",
    description: "یک مجموعه عمومی دیگر از سینمای کلاسیک ایران",
    playlistId: "PLkvFABnKzzvqzX6bfKqwJQh0lb6TJePFi",
    url: filmFarsiPlaylist("PLkvFABnKzzvqzX6bfKqwJQh0lb6TJePFi"),
    kind: "films",
  },
  {
    id: "iconic-scenes",
    title: "پنج سکانس برتر سینمای ایران",
    description: "گزیده صحنه‌ها؛ این مورد لزوماً فیلم کامل نیست",
    playlistId: "PLkvFABnKzzvryRfQk3air1dMsb_hRmYBi",
    url: filmFarsiPlaylist("PLkvFABnKzzvryRfQk3air1dMsb_hRmYBi"),
    kind: "scenes",
  },
];
