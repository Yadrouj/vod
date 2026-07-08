import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || IN_FILE;
const MEDIA_DIR = process.env.IMDB_MEDIA_DIR || path.join("public", "media", "imdb");
const LIMIT = Number(process.env.IMDB_LIMIT || 0);
const DELAY_MS = Number(process.env.IMDB_DELAY_MS || 1800);
const DOWNLOAD = process.env.IMDB_DOWNLOAD !== "0";
const UA =
  process.env.IMDB_UA ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function absolutize(raw, baseUrl) {
  try {
    return new URL(decodeEntities(raw), baseUrl).toString();
  } catch {
    return decodeEntities(raw);
  }
}

function normalizeAmazonImage(url) {
  try {
    const parsed = new URL(url);
    if (!/m\.media-amazon\.com$/i.test(parsed.hostname)) return url;
    parsed.pathname = parsed.pathname.replace(/\._V1_[^/]+(?=\.(?:jpg|png|webp)$)/i, "");
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractJsonLdImages(html) {
  const images = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].trim());
      const image = data.image;
      if (typeof image === "string") images.push(image);
      if (Array.isArray(image)) images.push(...image.filter((item) => typeof item === "string"));
    } catch {
      /* ignore malformed embedded json */
    }
  }
  return images;
}

function extractImageUrls(html, baseUrl) {
  const urls = new Set();
  const add = (raw) => {
    if (!raw) return;
    for (const part of raw.split(",")) {
      const candidate = part.trim().split(/\s+/)[0];
      if (!candidate) continue;
      if (!/\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(candidate)) continue;
      urls.add(normalizeAmazonImage(absolutize(candidate, baseUrl)));
    }
  };

  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<img\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<source\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) add(match[1]);
  for (const image of extractJsonLdImages(html)) add(image);
  for (const match of html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/[^"'\\\s<>]+?\.(?:jpg|png|webp)/gi)) add(match[0]);

  return Array.from(urls);
}

function pickPoster(urls) {
  return (
    urls.find((url) => /\/images\/M\//i.test(url) && !/SX\d{3,}/i.test(url)) ??
    urls[0] ??
    null
  );
}

function pickBackdrop(urls, poster) {
  return urls.find((url) => url !== poster) ?? poster ?? null;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  const text = await res.text();
  const waf = res.headers.get("x-amzn-waf-action");
  if (waf || res.status === 202 || text.length < 200) {
    return { ok: false, status: res.status, waf, html: text };
  }
  return { ok: res.ok, status: res.status, waf, html: text };
}

function extension(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return ext && ext.length <= 6 ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
}

async function downloadImage(url, imdbCode, kind, index) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const file = `${kind}-${index}-${hash}${extension(url)}`;
  const dir = path.join(MEDIA_DIR, imdbCode);
  const diskPath = path.join(dir, file);
  const publicPath = `/media/imdb/${imdbCode}/${file}`;
  await mkdir(dir, { recursive: true });

  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
  });
  if (!res.ok || !res.body) throw new Error(`image ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(diskPath));
  return publicPath;
}

async function enrichItem(item) {
  const titleUrl = `https://www.imdb.com/title/${item.imdbCode}/`;
  const mediaUrl = `https://www.imdb.com/title/${item.imdbCode}/mediaindex/`;
  const title = await fetchHtml(titleUrl);
  await sleep(DELAY_MS);
  const media = title.ok ? await fetchHtml(mediaUrl) : null;
  const html = [title.html, media?.html].filter(Boolean).join("\n");
  const remoteUrls = title.ok ? extractImageUrls(html, titleUrl) : [];
  const posterRemote = pickPoster(remoteUrls);
  const backdropRemote = pickBackdrop(remoteUrls, posterRemote);
  const localImages = [];

  if (DOWNLOAD && remoteUrls.length > 0) {
    const selected = Array.from(new Set([posterRemote, backdropRemote, ...remoteUrls].filter(Boolean))).slice(0, 8);
    for (let index = 0; index < selected.length; index += 1) {
      try {
        localImages.push(await downloadImage(selected[index], item.imdbCode, index === 0 ? "poster" : "image", index));
      } catch (error) {
        console.warn(`download failed ${item.imdbCode}: ${error.message}`);
      }
    }
  }

  return {
    item: {
      ...item,
      imdbImageScrape: {
        status: title.status,
        waf: title.waf ?? null,
        remoteImageCount: remoteUrls.length,
        downloadedImageCount: localImages.length,
      },
      imdbImageUrls: remoteUrls,
      localImageUrls: localImages,
      posterUrl: localImages[0] ?? posterRemote ?? item.posterUrl ?? null,
      backdropUrl: localImages[1] ?? backdropRemote ?? item.backdropUrl ?? localImages[0] ?? posterRemote ?? null,
    },
    blocked: !title.ok,
    imageCount: remoteUrls.length,
    downloadedCount: localImages.length,
  };
}

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const items = LIMIT > 0 ? archive.items.slice(0, LIMIT) : archive.items;
  const rest = LIMIT > 0 ? archive.items.slice(LIMIT) : [];
  const enriched = [];
  let blocked = 0;
  let images = 0;
  let downloads = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!/^tt\d+$/.test(item.imdbCode ?? "")) {
      enriched.push(item);
      continue;
    }
    const result = await enrichItem(item);
    enriched.push(result.item);
    if (result.blocked) blocked += 1;
    images += result.imageCount;
    downloads += result.downloadedCount;
    console.log(
      `${index + 1}/${items.length} ${item.imdbCode}: images=${result.imageCount} downloaded=${result.downloadedCount}${result.blocked ? " blocked" : ""}`
    );
    await sleep(DELAY_MS);
  }

  const payload = {
    ...archive,
    imageProvider: "IMDb HTML",
    imageScrapedAt: new Date().toISOString(),
    imageScrapeStats: {
      requestedTitles: items.length,
      blockedTitles: blocked,
      remoteImagesFound: images,
      downloadedImages: downloads,
    },
    items: [...enriched, ...rest],
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        requestedTitles: items.length,
        blockedTitles: blocked,
        remoteImagesFound: images,
        downloadedImages: downloads,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
