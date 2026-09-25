import test from "node:test";
import assert from "node:assert/strict";
import { heroBackdropUrl, heroImageSrc, isHeroReady } from "@/lib/hero-art";

const item = (extra: Partial<{ imdbCode: string; backdropUrl: string | null; posterUrl: string | null }> = {}) => ({
  imdbCode: "tt-test",
  backdropUrl: "https://cdn.example.test/backdrop.jpg",
  posterUrl: "https://cdn.example.test/poster.jpg",
  ...extra,
});

test("hero prefers curated landscape art for chart titles with poster-only catalog data", () => {
  const art = heroBackdropUrl(item({ imdbCode: "tt33764258", backdropUrl: "/media/moviesho/tt33764258/poster.jpg", posterUrl: "/media/moviesho/tt33764258/poster.jpg" }));
  assert.match(art ?? "", /images\.hdqwalls\.com\/download/);
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
});
