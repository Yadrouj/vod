const key = value => String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Uploaded maps are candidates, never proof of a substring-only title match. */
export function exactPublisherPageMapping(row) {
  try {
    const slug = decodeURIComponent(new URL(row.movieLandzPage).pathname).split(/[-_/]/u)
      .filter(word => word && !/^(?:film|films|movie|movies|series|serial|download|\d{4})$/i.test(word)).join(' ');
    return key(slug) === key(row.title);
  } catch { return false; }
}
