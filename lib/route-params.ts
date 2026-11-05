/**
 * Next 16 passes dynamic segments to page components still percent-encoded
 * (e.g. "%D9%87%D8%A7%DB%8C%D8%AF%D9%87") while generateMetadata receives them
 * decoded ("هایده"). Decode once so both lookups see the same value; decoding
 * an already-decoded or plain-ASCII value is a no-op.
 */
export function decodeRouteParam(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function decodedParams<T extends Record<string, string>>(params: Promise<T>): Promise<T> {
  const raw = await params;
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? decodeRouteParam(value) : value])) as T;
}
