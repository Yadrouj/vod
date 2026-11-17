export { default as bundledAppReleases } from "./data/android-app-releases.json";

/** Optional operator override; bundled previews are real, debug-signed APKs. */
export function appReleaseUrl(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    return url.href;
  } catch { return null; }
}
