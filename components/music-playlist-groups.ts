import type { MoodPlaylist } from "@/lib/mood-playlists";

export const playlistKinds = {
  moods: "گلچین‌های حال‌وهوا",
  styles: "سبک‌ها",
  years: "سال انتشار",
  tags: "تگ‌های واقعی آرشیو",
  sources: "مجموعه‌های دیگر",
};

export function musicPlaylistKind(playlist: MoodPlaylist): keyof typeof playlistKinds {
  if (playlist.selection === "curated-mood" || playlist.selection === "editorial-tags") return "moods";
  if (playlist.selection === "genre-tags") return "styles";
  if (playlist.selection === "published-year") return "years";
  if (playlist.selection === "library-tags") return "tags";
  return "sources";
}

export function musicPlaylistGroups(playlists: MoodPlaylist[]) {
  const moods = playlists.filter(playlist => playlist.selection === "curated-mood");
  return [
    {
      id: "moods",
      title: "ایرانی؛ از جاده تا حال دل",
      description: "جاده شمال، رفاقت، دوستی و آواهای محلی؛ انتخاب حال‌وهوای امروزت با آهنگ‌های واقعی آرشیو.",
      playlists: (moods.length ? moods : playlists.filter(playlist => playlist.scope === "persian" && playlist.selection === "editorial-tags")).slice(0, 20),
    },
    {
      id: "styles",
      title: "پلی‌لیست‌های سبک و سلیقه",
      description: "از پاپ و ریمیکس ایرانی تا راک و جاز؛ انتخاب از برچسب‌های واقعی سبک.",
      playlists: playlists.filter(playlist => playlist.selection === "genre-tags").slice(0, 8),
    },
    {
      id: "years",
      title: "سفر در سال‌های انتشار",
      description: "بر اساس تاریخ ثبت‌شدهٔ آهنگ یا آلبوم؛ نه تاریخ اضافه‌شدن به آرشیو یا سال حدسی.",
      playlists: playlists.filter(playlist => playlist.selection === "published-year")
        .sort((left, right) => Number(right.mood) - Number(left.mood) || Number(right.id.includes("-persian-")) - Number(left.id.includes("-persian-"))).slice(0, 8),
    },
  ].filter(group => group.playlists.length > 0);
}
