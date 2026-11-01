/** A WordPress anime collection contains both films and series. Genre is not format. */
export function curatedSourceType({ type = "", link = "", title = "" } = {}) {
  return type === "series" || /\/series\//i.test(link) || /\b(?:tv[ -]?series|mini[ -]?series)\b|سریالی?(?=\s|$)/iu.test(title)
    ? "tvSeries" : "movie";
}
