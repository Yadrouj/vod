/** Public HTTPS only. Never expose the worker's internal BOT_SITE_URL or token. */
export function miniAppUrl(env = process.env) {
  const explicit = env.TELEGRAM_MINI_APP_URL?.trim();
  const base = env.PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || "https://sarvnema.ir";
  try {
    const url = new URL(explicit || "/mini-app", base);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || !url.hostname.includes(".") || /^127\./.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function miniAppButton(url, privateChat) {
  if (!url) return null;
  return privateChat ? { text: "🚀 بازکردن اپ سرونما", web_app: { url } } : { text: "🌐 بازکردن سرونما", url };
}
