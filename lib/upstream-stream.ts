/** Limit time to upstream headers, not the entire film/song duration.
 * Client disconnect still cancels the upstream body through the supplied signal. */
export async function fetchStreamHeaders(url: string, headers: Headers, signal: AbortSignal, timeoutMs = 30_000) {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(new Error("Media source timed out")), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", headers, redirect: "follow", signal: AbortSignal.any([signal, deadline.signal]) });
  } finally {
    clearTimeout(timer);
  }
}
