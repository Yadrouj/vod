import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VodItem, VodLink } from "./types";

export type SourceLinkBase = {
  id: string;
  provider: string;
  label: string;
  baseUrl: string;
  aliases: string[];
  manual: boolean;
  discoveredAt: string | null;
  lastSeenAt: string | null;
  updatedAt: string | null;
};

export type SourceLinkRegistry = {
  version: number;
  updatedAt: string | null;
  bases: Record<string, SourceLinkBase>;
};

const REGISTRY_FILE = path.join(process.cwd(), "data", "source-link-registry.json");
const CACHE_MS = 3_000;
let cached: SourceLinkRegistry | null = null;
let cacheExpiresAt = 0;

export async function loadSourceLinkRegistry(): Promise<SourceLinkRegistry> {
  if (cached && Date.now() < cacheExpiresAt) return cached;
  try {
    const parsed = JSON.parse(await readFile(REGISTRY_FILE, "utf8")) as Partial<SourceLinkRegistry>;
    cached = {
      version: 1,
      updatedAt: parsed.updatedAt ?? null,
      bases: parsed.bases ?? {},
    };
  } catch {
    cached = { version: 1, updatedAt: null, bases: {} };
  }
  cacheExpiresAt = Date.now() + CACHE_MS;
  return cached;
}

export async function saveSourceLinkBase(id: string, value: string, manual = true) {
  const baseUrl = normalizeSourceBaseUrl(value);
  const registry = await loadSourceLinkRegistry();
  const existing = registry.bases[id];
  if (!existing) throw new Error(`Unknown source base: ${id}`);
  const now = new Date().toISOString();
  const next: SourceLinkRegistry = {
    ...registry,
    updatedAt: now,
    bases: {
      ...registry.bases,
      [id]: {
        ...existing,
        baseUrl,
        aliases: Array.from(new Set([...(existing.aliases ?? []), existing.baseUrl, baseUrl])),
        manual,
        updatedAt: now,
      },
    },
  };
  await writeRegistry(next);
  cached = next;
  cacheExpiresAt = Date.now() + CACHE_MS;
  return next.bases[id];
}

export async function applySourceLinkBasesToItem(item: VodItem): Promise<VodItem> {
  const allLinks = [...item.links, ...(item.f2myExtraLinks ?? [])];
  if (!allLinks.some((link) => link.sourceBaseId && link.sourceRelativePath)) return item;
  const registry = await loadSourceLinkRegistry();
  return {
    ...item,
    links: item.links.map((link) => rewriteSourceLink(link, registry)),
    f2myExtraLinks: item.f2myExtraLinks?.map((link) => rewriteSourceLink(link, registry)),
  };
}

export function rewriteSourceLink(link: VodLink, registry: SourceLinkRegistry): VodLink {
  const url = resolveSourceUrl(link, registry);
  const selectedSubtitle = link.subtitles?.find((subtitle) => subtitle.url === link.subtitleUrl);
  const subtitles = link.subtitles?.map((subtitle) => ({
    ...subtitle,
    url: resolveSourceUrl(subtitle, registry),
  }));
  const subtitleUrl = selectedSubtitle
    ? resolveSourceUrl(selectedSubtitle, registry)
    : subtitles?.[0]?.url ?? link.subtitleUrl;
  return { ...link, url, subtitles, subtitleUrl };
}

function resolveSourceUrl(
  link: {
    url: string;
    sourceProvider?: string | null;
    sourceBaseId?: string | null;
    sourceRelativePath?: string | null;
    sourceOriginalUrl?: string | null;
  },
  registry: SourceLinkRegistry,
) {
  if (!link.sourceBaseId || !link.sourceRelativePath) return link.url;
  const configuredBase = registry.bases[link.sourceBaseId];
  const equivalent = configuredBase ? null : findEquivalentF2myBase(link, registry);
  const sourceBase = configuredBase ?? equivalent?.base;
  if (!sourceBase?.baseUrl) return link.url;
  try {
    const relativePath = equivalent?.relativePath ?? link.sourceRelativePath;
    return new URL(relativePath.replace(/^\/+/, ""), sourceBase.baseUrl).toString();
  } catch {
    return link.url;
  }
}

function findEquivalentF2myBase(
  link: { url: string; sourceProvider?: string | null; sourceOriginalUrl?: string | null },
  registry: SourceLinkRegistry,
) {
  if (link.sourceProvider !== "f2my") return null;
  let original: URL;
  try {
    original = new URL(link.sourceOriginalUrl || link.url);
  } catch {
    return null;
  }

  let best: { base: SourceLinkBase; relativePath: string; pathLength: number } | null = null;
  for (const base of Object.values(registry.bases)) {
    if (base.provider !== "f2my") continue;
    for (const alias of uniqueBaseUrls([base.baseUrl, ...(base.aliases ?? [])])) {
      try {
        const aliasUrl = new URL(alias);
        const aliasPath = aliasUrl.pathname.replace(/\/+$/, "") || "/";
        const pathMatches = aliasPath === "/"
          || original.pathname === aliasPath
          || original.pathname.startsWith(`${aliasPath}/`);
        if (aliasUrl.origin !== original.origin || !pathMatches) continue;
        const relativePath = original.pathname.slice(aliasPath.length).replace(/^\/+/, "") + original.search;
        if (!relativePath) continue;
        if (!best || aliasPath.length > best.pathLength) {
          best = { base, relativePath, pathLength: aliasPath.length };
        }
      } catch {
        // Ignore malformed historic aliases rather than breaking title playback.
      }
    }
  }
  return best;
}

function uniqueBaseUrls(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function normalizeSourceBaseUrl(value: string) {
  const url = new URL(value.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("Source base URL must use HTTP or HTTPS.");
  url.pathname = url.pathname.replace(/\/?$/, "/");
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function writeRegistry(registry: SourceLinkRegistry) {
  await mkdir(path.dirname(REGISTRY_FILE), { recursive: true });
  const temporary = `${REGISTRY_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await rename(temporary, REGISTRY_FILE);
}
