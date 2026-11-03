import test from "node:test";
import assert from "node:assert/strict";
import { heroBackdropUrl, heroImageSrc, isHeroReady, isValidatedHeroArtwork, type HeroArtwork } from "@/lib/hero-art";

const item = (extra: Partial<{ imdbCode: string; backdropUrl: string | null; posterUrl: string | null }> = {}) => ({
  imdbCode: "tt-test",
  backdropUrl: "https://cdn.example.test/backdrop.jpg",
  posterUrl: "https://cdn.example.test/poster.jpg",
  ...extra,
});

const art: HeroArtwork = { url: "https://image.tmdb.org/t/p/original/landscape.jpg", width: 3840, height: 2160,
  sourceUrl: "https://www.themoviedb.org/movie/123", provider: "tmdb", validatedAt: "2026-09-07T12:00:00Z" };

test("hero prefers a validated native landscape over a poster-only catalog", () => {
  assert.equal(heroBackdropUrl({ ...item({ backdropUrl: "/poster.jpg", posterUrl: "/poster.jpg" }), heroArt: art }), art.url);
});

test("unverified hard-coded wallpapers no longer bypass landscape validation", () => {
  assert.equal(heroBackdropUrl(item({ imdbCode: "tt33764258", backdropUrl: "/poster.jpg", posterUrl: "/poster.jpg" })), null);
  assert.equal(heroBackdropUrl({ ...item(), heroArt: null }), null);
});

test("validated artwork rejects undersized, portrait, unsafe and malformed records", () => {
  for (const extra of [{ width: 1280 }, { width: 2160, height: 3840 }, { width: 6000, height: 1000 }, { validatedAt: "invalid" },
    { url: "https://evil.example/image.jpg" }, { url: "http://image.tmdb.org/image.jpg" }, { url: "/media/../secret.jpg" }, { url: "https://image.tmdb.org/image.jpg?api_key=secret" }]) {
    assert.equal(isValidatedHeroArtwork({ ...art, ...extra }), false);
    assert.equal(heroBackdropUrl({ ...item(), heroArt: { ...art, ...extra } }), null);
  }
  assert.equal(isValidatedHeroArtwork({ ...art, url: "/media/hero/landscape.webp" }), true);
});

test("hero rejects a portrait poster masquerading as a backdrop", () => {
  assert.equal(heroBackdropUrl(item({ backdropUrl: "https://cdn.example.test/movie-poster.jpg" })), null);
  assert.equal(isHeroReady(item({ backdropUrl: "https://cdn.example.test/movie-poster.jpg" })), false);
});

test("hero keeps a distinct landscape backdrop", () => {
  assert.equal(heroBackdropUrl(item()), "https://cdn.example.test/backdrop.jpg");
  assert.equal(isHeroReady(item()), true);
});

test("hero preserves original landscape art for desktop", () => {
  const original = "https://images.hdqwalls.com/download/backdrop-3440x1440.jpg";
  assert.equal(heroImageSrc(original, 1920), original);
  assert.equal(heroImageSrc(art.url, 1920), art.url);
});
