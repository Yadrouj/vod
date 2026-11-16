/** Geometry is deliberately independent of React/DOM so D-pad behaviour is testable. */
export type TVRect = { left: number; top: number; width: number; height: number };
export type TVDirection = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
export function nextTVFocus(from: TVRect, candidates: TVRect[], direction: TVDirection): number {
  const horizontal = direction === "ArrowLeft" || direction === "ArrowRight";
  const sign = direction === "ArrowLeft" || direction === "ArrowUp" ? -1 : 1;
  const x = from.left + from.width / 2, y = from.top + from.height / 2;
  let best = -1, score = Infinity;
  candidates.forEach((rect, index) => {
    const dx = rect.left + rect.width / 2 - x, dy = rect.top + rect.height / 2 - y;
    const forward = (horizontal ? dx : dy) * sign;
    if (forward < 2) return;
    const cross = Math.abs(horizontal ? dy : dx);
    const overlap = horizontal
      ? Math.min(from.top + from.height, rect.top + rect.height) - Math.max(from.top, rect.top)
      : Math.min(from.left + from.width, rect.left + rect.width) - Math.max(from.left, rect.left);
    const value = forward + cross * 3 + (overlap < -2 ? 500 : 0);
    if (value < score) { score = value; best = index; }
  });
  return best;
}

export function tvSearchParams(params: URLSearchParams) {
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const value = Number(params.get(name) ?? fallback);
    return String(Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback);
  };
  const type = params.get("type");
  const year = params.get("year") ?? "All";
  return {
    q: (params.get("q") ?? "").trim().slice(0, 160),
    type: type === "movie" || type === "series" ? type : "all",
    genre: (params.get("genre") ?? "All").slice(0, 64),
    year: /^\d{4}$/.test(year) && Number(year) >= 1888 && Number(year) <= new Date().getFullYear() + 3 ? year : "All",
    minScore: integer("minScore", 0, 0, 10),
    page: integer("page", 1, 1, 10000),
  };
}
