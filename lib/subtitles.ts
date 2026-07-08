export function subzoneSearchUrl(title: string, year?: number | null) {
  const query = [title, year].filter(Boolean).join(" ");
  return `http://subzone.ir/?s=${encodeURIComponent(query)}`;
}
