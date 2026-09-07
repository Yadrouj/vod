import { createHash } from "node:crypto";
const YEAR = /^\d{4}$/;

export function normalizeReleaseTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\b(?:season|series|s\d{1,2}|part|episode|e\d{1,3}|dubbed|softsub|subtitle)\b/gi, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function releaseKind(type, episode) {
  if (episode?.season && episode?.episode) return "episode";
  return isSeriesType(type) ? "series" : "film";
}

function isSeriesType(type) {
  const value = String(type ?? "").trim().toLowerCase();
  return !/movie|film|short|documentary|video/i.test(value)
    && /series|episode|tvmini|tvspecial|tvepisode|show/i.test(value);
}

export function latestEpisode(links = []) {
  let selected = null;
  for (const link of links) {
    const season = Number(link?.season);
    const episode = Number(link?.episode);
    if (!Number.isFinite(season) || season <= 0 || !Number.isFinite(episode) || episode <= 0) continue;
    if (!selected || season > selected.season || (season === selected.season && episode > selected.episode)) {
      selected = { season, episode };
    }
  }
  return selected;
}

export function makeSourceFingerprint(item) {
  if (item?.sourceLinkFingerprint) return String(item.sourceLinkFingerprint);
  const parts = (item?.links ?? [])
    .map((link) => [
      link?.sourceOriginalUrl ?? link?.url ?? "",
      link?.quality ?? "",
      link?.season ?? "",
      link?.episode ?? "",
    ].join("|"))
    .filter(Boolean)
    .sort();
  return `${parts.length}:${hash(parts.join("\n"))}`;
}

export function summarizeCatalogItem(item) {
  const episode = latestEpisode(item?.links);
  const sources = new Set([
    item?.source,
    ...(item?.links ?? []).map((link) => link?.sourceProvider),
  ].filter(Boolean));
  const qualities = Array.from(new Set([
    ...(item?.qualities ?? []),
    ...(item?.links ?? []).map((link) => link?.quality),
  ].filter(Boolean))).slice(0, 8);
  const linksCount = Array.isArray(item?.links) ? item.links.length : 0;

  return {
    id: String(item?.id ?? item?.imdbCode ?? ""),
    imdbCode: String(item?.imdbCode ?? ""),
    title: String(item?.title ?? "Untitled"),
    normalizedTitle: normalizeReleaseTitle(item?.title),
    type: isSeriesType(item?.type) ? "series" : "movie",
    year: Number.isFinite(Number(item?.year)) ? Number(item.year) : null,
    releaseDate: item?.releaseDate ?? null,
    posterUrl: item?.posterUrl ?? item?.backdropUrl ?? null,
    backdropUrl: item?.backdropUrl ?? item?.posterUrl ?? null,
    linksCount,
    linkKeys: (item?.links ?? []).map((link) => createHash("sha256").update(String(link.sourceOriginalUrl || link.url || "")).digest("hex").slice(0, 32)),
    qualities,
    sources: Array.from(sources),
    latestEpisode: episode,
    fingerprint: makeSourceFingerprint(item),
  };
}

// Historical imports can contain more than one record for the same title ID.
// Comparing each row to the last row's state creates fake updates every run.
// Union their links and metadata before comparing; never sum duplicate URLs.
export function combineCatalogSummaries(items) {
  const combined = new Map();
  for (const item of items) {
    const previous = combined.get(item.id);
    if (!previous) { combined.set(item.id, item); continue; }
    const linkKeys = [...new Set([...(previous.linkKeys ?? []), ...(item.linkKeys ?? [])])].sort();
    const episode = latestEpisode([previous.latestEpisode, item.latestEpisode]);
    combined.set(item.id, {
      ...previous,
      linksCount: linkKeys.length || Math.max(previous.linksCount, item.linksCount),
      linkKeys,
      fingerprint: `combined:${hash(linkKeys.join("|"))}`,
      qualities: [...new Set([...previous.qualities, ...item.qualities])].sort(),
      sources: [...new Set([...previous.sources, ...item.sources])].sort(),
      latestEpisode: episode,
      combinedSources: true,
    });
  }
  return [...combined.values()];
}

export function normalizeImdbCandidate(value, source = "IMDb") {
  const title = decodeEntities(String(value?.l ?? value?.title ?? value?.name ?? "")).trim();
  const imdbCode = String(value?.id ?? value?.imdbCode ?? "").trim();
  if (!title || !/^tt\d{5,}$/i.test(imdbCode)) return null;
  const rawYear = value?.y ?? value?.year ?? value?.yr ?? null;
  const yearMatch = String(rawYear ?? "").match(/\d{4}/);
  const image = value?.i?.imageUrl ?? value?.imageUrl ?? value?.image ?? null;
  const type = /tv|series|episode/i.test(String(value?.q ?? value?.type ?? "")) ? "series" : "movie";
  return {
    id: imdbCode.toLowerCase(),
    imdbCode: imdbCode.toLowerCase(),
    title,
    normalizedTitle: normalizeReleaseTitle(title),
    type,
    year: yearMatch && YEAR.test(yearMatch[0]) ? Number(yearMatch[0]) : null,
    imageUrl: typeof image === "string" ? image : null,
    releaseDate: value?.releaseDate ?? null,
    source,
  };
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function findCatalogMatch(candidate, catalogItems) {
  const byImdb = catalogItems.find((item) => item.imdbCode && item.imdbCode.toLowerCase() === candidate.imdbCode);
  if (byImdb) return byImdb;
  const exactTitle = catalogItems.filter((item) => item.normalizedTitle && item.normalizedTitle === candidate.normalizedTitle);
  const yearMatch = exactTitle.find((item) => !candidate.year || !item.year || item.year === candidate.year);
  return yearMatch ?? exactTitle[0] ?? null;
}

function availableEvent(item, eventAt, reason, previous, discoveryReleaseDate = null) {
  const episodeChanged = previous?.latestEpisode && item.latestEpisode && (
    item.latestEpisode.season > previous.latestEpisode.season ||
    (item.latestEpisode.season === previous.latestEpisode.season && item.latestEpisode.episode > previous.latestEpisode.episode)
  );
  const kind = releaseKind(item.type, episodeChanged ? item.latestEpisode : null);
  const episodeLabel = episodeChanged
    ? ` · S${String(item.latestEpisode.season).padStart(2, "0")}E${String(item.latestEpisode.episode).padStart(2, "0")}`
    : "";
  const addedQualities = previous?.qualities ? item.qualities.filter((quality) => !previous.qualities.includes(quality)) : [];
  const changeType = episodeChanged ? "new-episode"
    : !previous || !previous.linksCount ? "new-title"
      : addedQualities.length ? "quality-added"
        : item.linksCount > previous.linksCount ? "source-added" : "links-refreshed";
  return {
    id: `available-${item.imdbCode || item.id}-${item.fingerprint}`,
    eventAt,
    status: "available",
    kind,
    title: `${item.title}${episodeLabel}`,
    baseTitle: item.title,
    imdbCode: item.imdbCode || null,
    year: item.year,
    releaseDate: discoveryReleaseDate ?? item.releaseDate,
    season: episodeChanged ? item.latestEpisode.season : null,
    episode: episodeChanged ? item.latestEpisode.episode : null,
    href: item.imdbCode ? `/${item.imdbCode}` : null,
    imdbUrl: item.imdbCode ? `https://www.imdb.com/title/${item.imdbCode}/` : null,
    imageUrl: item.backdropUrl ?? item.posterUrl ?? null,
    sourceNames: item.sources,
    qualities: item.qualities,
    linksCount: item.linksCount,
    reason,
    changeType,
    addedQualities,
  };
}

function comingSoonEvent(candidate, eventAt, existing) {
  return {
    id: `coming-soon-${candidate.imdbCode}`,
    eventAt: existing?.eventAt ?? eventAt,
    status: "coming-soon",
    kind: candidate.type === "series" ? "series" : "film",
    title: candidate.title,
    baseTitle: candidate.title,
    imdbCode: candidate.imdbCode,
    year: candidate.year,
    releaseDate: candidate.releaseDate ?? null,
    season: null,
    episode: null,
    href: null,
    imdbUrl: `https://www.imdb.com/title/${candidate.imdbCode}/`,
    imageUrl: candidate.imageUrl,
    sourceNames: [],
    qualities: [],
    linksCount: 0,
    reason: "IMDb release found — source scan is queued.",
    changeType: "coming-soon",
  };
}

function isWithinRetention(event, now, retentionDays) {
  const timestamp = Date.parse(event?.eventAt ?? "");
  return Number.isFinite(timestamp) && timestamp >= now - retentionDays * 86_400_000;
}

export function buildReleaseMonitorResult({ catalogItems, previousState, imdbCandidates, now = new Date(), retentionDays = 14 }) {
  catalogItems = combineCatalogSummaries(catalogItems);
  const previousItems = new Map(Object.entries(previousState?.items ?? {}));
  const previousUpdates = new Map((previousState?.updates ?? []).map((item) => [item.id, item]));
  const previouslyTrackedImdb = new Set(previousState?.trackedImdbCodes ?? []);
  const eventAt = now.toISOString();
  // Versioning prevents a change in fingerprint semantics from turning the
  // whole historical archive into a fake "new release" list on deployment.
  const bootstrap = previousState?.version !== 2 || !previousState?.initializedAt;
  const fresh = [];

  if (!bootstrap) {
    for (const item of catalogItems) {
      if (!item.linksCount) continue;
      const previous = previousItems.get(item.id);
      // Seed the unified state on the first run after this migration rather
      // than announcing legacy duplicates as newly discovered source files.
      if (item.combinedSources && previous && !previous.combinedSources) continue;
      if (!previous) {
        fresh.push(availableEvent(item, eventAt, "New title found in a configured source.", null));
        continue;
      }
      const qualityAdded = previous.qualities && item.qualities.some((quality) => !previous.qualities.includes(quality));
      if (qualityAdded || previous.fingerprint !== item.fingerprint || previous.latestEpisode?.episode !== item.latestEpisode?.episode || previous.latestEpisode?.season !== item.latestEpisode?.season || previous.linksCount !== item.linksCount) {
        const episodeChanged = previous.latestEpisode && item.latestEpisode && (
          item.latestEpisode.season > previous.latestEpisode.season ||
          (item.latestEpisode.season === previous.latestEpisode.season && item.latestEpisode.episode > previous.latestEpisode.episode)
        );
        // Removing dead links is maintenance, not a newly available release.
        if (item.linksCount < previous.linksCount && !episodeChanged && !qualityAdded) continue;
        const event = availableEvent(
          item,
          eventAt,
          episodeChanged ? "A new episode and its available qualities were found." : "New files or qualities were found in a configured source.",
          previous,
        );
        // Keep maintenance in the state only. Otherwise 80 URL rotations can
        // evict every real episode update from the bounded public feed.
        if (event.changeType !== "links-refreshed") fresh.push(event);
      }
    }
  }

  for (const candidate of imdbCandidates) {
    const match = findCatalogMatch(candidate, catalogItems);
    const previousComingSoon = previousUpdates.get(`coming-soon-${candidate.imdbCode}`);
    if (match?.linksCount) {
      const existing = fresh.find((item) => item.imdbCode === match.imdbCode);
      if (!existing && candidate.releaseDate && (!previouslyTrackedImdb.has(candidate.imdbCode) || previousComingSoon)) {
        fresh.push(availableEvent(match, eventAt, "IMDb discovery is already available in the source catalog.", null, candidate.releaseDate));
      }
    } else if (candidate.releaseDate && !previouslyTrackedImdb.has(candidate.imdbCode)) {
      fresh.push(comingSoonEvent(candidate, eventAt, previousComingSoon));
    }
  }

  const currentEvents = new Map();
  for (const event of fresh) {
    const identity = `${event.status}-${event.imdbCode || event.baseTitle}-${event.season ?? ""}-${event.episode ?? ""}`;
    const existing = currentEvents.get(identity);
    if (!existing || Date.parse(event.eventAt) > Date.parse(existing.eventAt)) currentEvents.set(identity, event);
  }
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  const retained = [...previousUpdates.values()].filter((event) => {
    // A monitor schema migration may leave an old-format update feed behind.
    // During bootstrap, do not resurrect any prior generated list.
    if (bootstrap) return false;
    const key = `${event.status}-${event.imdbCode || event.baseTitle}-${event.season ?? ""}-${event.episode ?? ""}`;
    const nowAvailable = event.status === "coming-soon" && catalogItems.some((item) => item.imdbCode === event.imdbCode && item.linksCount > 0);
    return !nowAvailable && event.changeType !== "links-refreshed" && !currentEvents.has(key) && isWithinRetention(event, now.getTime(), retentionDays) && Date.parse(event.eventAt) >= cutoff;
  });
  const allUpdates = [...currentEvents.values(), ...retained]
    .sort((left, right) => {
      const rank = { "new-episode": 0, "new-title": 1, "quality-added": 2, "source-added": 3, "coming-soon": 4 };
      return Date.parse(right.eventAt) - Date.parse(left.eventAt)
        || (rank[left.changeType] ?? 5) - (rank[right.changeType] ?? 5)
        || (right.year ?? 0) - (left.year ?? 0)
        || Number(/^tt\d+$/.test(right.imdbCode ?? "")) - Number(/^tt\d+$/.test(left.imdbCode ?? ""))
        || String(left.baseTitle).localeCompare(String(right.baseTitle));
    })
    .slice(0, 200);
  const updates = bootstrap
    ? allUpdates.filter((event) => event.status !== "available" || Boolean(event.releaseDate))
    : allUpdates;

  const stateItems = Object.fromEntries(catalogItems.map((item) => [item.id, {
    imdbCode: item.imdbCode,
    fingerprint: item.fingerprint,
    latestEpisode: item.latestEpisode,
    linksCount: item.linksCount,
    qualities: item.qualities,
    combinedSources: item.combinedSources ?? false,
  }]));
  return {
    bootstrap,
    updates,
    state: {
      version: 2,
      initializedAt: previousState?.initializedAt ?? eventAt,
      updatedAt: eventAt,
      items: stateItems,
      updates,
      trackedImdbCodes: Array.from(new Set([
        ...Array.from(previouslyTrackedImdb),
        ...imdbCandidates.map((candidate) => candidate.imdbCode),
      ])).slice(-2_000),
    },
    summary: {
      catalogTitles: catalogItems.length,
      available: updates.filter((item) => item.status === "available").length,
      comingSoon: updates.filter((item) => item.status === "coming-soon").length,
      newEvents: currentEvents.size,
      imdbCandidates: imdbCandidates.length,
    },
  };
}

function hash(value) {
  let valueHash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    valueHash ^= value.charCodeAt(index);
    valueHash = Math.imul(valueHash, 16777619);
  }
  return (valueHash >>> 0).toString(36);
}
