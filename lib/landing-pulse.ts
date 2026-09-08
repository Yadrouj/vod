import type { ReleaseUpdatesPayload } from "./release-updates";

export function landingPulse(payload: ReleaseUpdatesPayload, now = Date.now()) {
  const week = now - 7 * 86400000;
  const events = payload.items.filter(item => {
    const date = Date.parse(item.eventAt);
    return date >= week && date <= now && item.status === "available" && item.linksCount > 0
      && (item.changeType === "new-title" || item.changeType === "new-episode");
  });
  return {
    version: payload.generatedAt,
    updatedAt: Date.parse(payload.generatedAt) > 0 ? payload.generatedAt : null,
    recentCount: new Set(events.map(item => item.imdbCode ? `${item.imdbCode}:${item.season}:${item.episode}` : item.id)).size,
  };
}
export type LandingPulse = ReturnType<typeof landingPulse>;
