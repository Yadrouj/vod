export type ReleaseKind = 'dubbed' | 'softsub' | 'hardsub' | 'original' | 'other';
export function releaseKind(group: string): ReleaseKind {
  if (/dub|دوبله/i.test(group)) return 'dubbed';
  if (/hard.?sub|چسبیده/i.test(group)) return 'hardsub';
  if (/soft.?sub|subbed|قابل تغییر|زیرنویس نرم/i.test(group)) return 'softsub';
  if (/original|زبان اصلی|raw/i.test(group)) return 'original';
  return 'other';
}
export const releaseKindLabels: Record<ReleaseKind, [string, string]> = {
  dubbed: ['دوبله فارسی', 'Persian dubbed'], softsub: ['زیرنویس قابل تغییر', 'Soft subtitles'],
  hardsub: ['زیرنویس چسبیده', 'Hard subtitles'], original: ['زبان اصلی', 'Original language'], other: ['سایر نسخه‌ها', 'Other versions'],
};
export function qualityScore(value: string | null) {
  if (/4k/i.test(value || '')) return 2160;
  return Number(value?.match(/(?:^|\D)(2160|1440|1080|720|576|480|360|240)(?:p|\b)/i)?.[1] || 0);
}
export function sortedQualities(values: (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => qualityScore(b) - qualityScore(a) || a.localeCompare(b));
}
