"use client";

// Loads the bundled MuscleWiki dataset once and exposes it to client components.
// The 3 MB JSON is fetched a single time and memoized at module scope, so
// navigating between library / program / workout screens doesn't refetch it.

import { useEffect, useState } from "react";
import type { Exercise, Filters } from "./types";

let exercisesPromise: Promise<Exercise[]> | null = null;
let filtersPromise: Promise<Filters> | null = null;

interface VideoManifestItem {
  url: string;
  localUrl?: string;
}

function applyLocalVideoUrls(exercises: Exercise[], manifest: VideoManifestItem[]): Exercise[] {
  const localByUrl = new Map(
    manifest
      .map((item) => [item.url, item.localUrl])
      .filter((x): x is [string, string] => Boolean(x[1]))
  );
  if (!localByUrl.size) return exercises;
  return exercises.map((exercise) => ({
    ...exercise,
    videos: {
      male: exercise.videos.male.map((clip) => ({
        ...clip,
        localUrl: localByUrl.get(clip.url),
      })),
      female: exercise.videos.female.map((clip) => ({
        ...clip,
        localUrl: localByUrl.get(clip.url),
      })),
    },
  }));
}

export function loadExercises(): Promise<Exercise[]> {
  if (!exercisesPromise) {
    exercisesPromise = Promise.all([
      fetch("/data/exercises.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load exercises dataset");
        return r.json() as Promise<Exercise[]>;
      }),
      fetch("/data/musclewiki-video-manifest.json")
        .then((r) => (r.ok ? (r.json() as Promise<VideoManifestItem[]>) : []))
        .catch(() => []),
    ]).then(([exercises, manifest]) => applyLocalVideoUrls(exercises, manifest));
  }
  return exercisesPromise;
}

export function loadFilters(): Promise<Filters> {
  if (!filtersPromise) {
    filtersPromise = fetch("/data/filters.json").then((r) => {
      if (!r.ok) throw new Error("Failed to load filters");
      return r.json();
    });
  }
  return filtersPromise;
}

export interface ExerciseIndex {
  all: Exercise[];
  byId: Map<number, Exercise>;
  bySlug: Map<string, Exercise>;
}

function buildIndex(all: Exercise[]): ExerciseIndex {
  const byId = new Map<number, Exercise>();
  const bySlug = new Map<string, Exercise>();
  for (const ex of all) {
    byId.set(ex.id, ex);
    bySlug.set(ex.slug, ex);
  }
  return { all, byId, bySlug };
}

let indexCache: ExerciseIndex | null = null;

/** Load + index the dataset once (used by the program generator / marketplace). */
export async function loadIndex(): Promise<ExerciseIndex> {
  if (indexCache) return indexCache;
  const all = await loadExercises();
  indexCache = buildIndex(all);
  return indexCache;
}

/** Hook: returns the full indexed dataset (or null while loading). */
export function useExercises(): { index: ExerciseIndex | null; error: string | null } {
  const [index, setIndex] = useState<ExerciseIndex | null>(indexCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (indexCache) return;
    let alive = true;
    loadExercises()
      .then((all) => {
        indexCache = buildIndex(all);
        if (alive) setIndex(indexCache);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return { index, error };
}

export function useFilters(): Filters | null {
  const [filters, setFilters] = useState<Filters | null>(null);
  useEffect(() => {
    let alive = true;
    loadFilters().then((f) => alive && setFilters(f));
    return () => {
      alive = false;
    };
  }, []);
  return filters;
}
