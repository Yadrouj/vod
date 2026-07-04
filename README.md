# Gym Trainer

A personal, installable **PWA** for planning and running gym workouts *and* nutrition, powered
by the [MuscleWiki](https://musclewiki.com) exercise catalog (1,900+ exercises with demo videos).
Dark, energetic fitness UI.

- **Onboarding** — pick Male/Female, Beginner/Advanced, a primary goal
  (Strength / Muscle / Endurance) and days per week; we auto-build a science-based split.
- **Evidence-based programming** ([`lib/programming.ts`](lib/programming.ts)) — sound splits by
  day count (full-body, upper/lower, PPL, push/pull, bro), compound-first exercise selection, and
  set/rep/rest prescribed per goal (e.g. hypertrophy = compounds 4×8 @120s, isolation 3×12 @75s).
- **Program builder** — tweak days, focus per day, and per-exercise sets / reps / rest.
- **Marketplace** — 50 ready-made plans (25 training programs + 25 nutrition plans). Browse,
  filter, preview the full schedule / sample day, and one-tap **Apply** to personalise it to you.
- **Exercise library** — browse and filter MuscleWiki by body part, equipment, and gender, with
  a detail page showing the demo video (male/female + camera angle), muscles worked, and steps.
- **Jefit-style workout player** — looping demo video, per-set logging (reps + weight or timed
  holds), automatic rest countdown, beep/vibration cues, and a screen wake-lock.
- **Diet & nutrition** ([`lib/nutrition.ts`](lib/nutrition.ts)) — enter age, sex, height, weight,
  activity, goal, diet style (omnivore / halal / vegetarian / vegan) and allergens. Get
  evidence-based calorie & macro targets (Mifflin–St Jeor → TDEE; protein 1.6–2.4 g/kg with fat and
  calorie floors), plus fiber and hydration targets, a generated meal plan (1-day or 7-day,
  regenerate for variety), and tailored supplement guidance.
- **History** — every completed workout is saved on-device.

Everything is **local-first**: your settings, program, diet plan, and history live in your
browser (IndexedDB) — no accounts, no server database.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand · Dexie (IndexedDB) ·
Serwist (service worker / offline).

## Getting started

```bash
npm install
npm run build-dataset   # one-time: pull the MuscleWiki dataset -> public/data/*.json
npm run dev             # http://localhost:3000 (Turbopack; service worker disabled in dev)
```

For the full PWA (installable + offline), run a production build:

```bash
npm run build           # uses --webpack so Serwist can bundle the service worker
npm start               # then open the app and "Install" it from the browser menu
```

## How the exercise data & videos work

- `npm run build-dataset` scrapes MuscleWiki's public catalog once into
  `public/data/exercises.json` (metadata + video URLs) and `filters.json`. Re-run it anytime to
  refresh. It uses `curl` because MuscleWiki sits behind Cloudflare, which blocks Node's fetch.
- **Videos** are streamed on demand. MuscleWiki's Cloudflare blocks cross-origin browser requests
  for the mp4s, so the app proxies them through a same-origin route
  ([`app/api/media/route.ts`](app/api/media/route.ts)) that fetches each clip with `curl` and
  caches it under `.media-cache/`. First play downloads the clip; later plays are instant and work
  offline. Poster images load directly.

### Requirements & scope

- **`curl` must be on PATH** (built into Windows 10+/macOS/Linux) — the dataset script and the
  video proxy both use it.
- Designed to run as a **local / self-hosted Node app** (the video proxy writes to disk and shells
  out to curl), not on a serverless host.
- For **personal use**. MuscleWiki owns the exercise content and videos — don't redistribute or
  publish it commercially.

## Accounts, usage limit & AI coach

- **Profile** (`/profile`) — identity, body stats, training prefs, language, free-usage meter.
- **Usage gate** — 12 free "significant actions" (saving a workout, regenerating a diet, applying
  a marketplace plan, AI messages). Past that, the app routes to `/login`. Signing in (Google or
  a local account) removes the limit; data stays on-device either way.
- **Google sign-in** — Google Identity Services button; set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in
  `.env.local` (see `.env.example`). Without it, local accounts still work.
- **AI coach** (`/coach`) — chat that knows your program + diet targets. Backed by a free
  OpenAI-compatible Chinese model: default **Z.AI `glm-4.5-flash`** (email-only signup at
  z.ai, permanently free). Set `AI_API_KEY`; override `AI_BASE_URL`/`AI_MODEL` to switch
  providers (SiliconFlow etc.). Server proxy: [`app/api/ai/route.ts`](app/api/ai/route.ts).

## Deploy

Needs a real Node server (curl + disk cache) — **not** serverless. Full guide (VPS/PM2/nginx
and Liara, Persian): **[DEPLOY.md](DEPLOY.md)**.

## Verify it works

```bash
npm run selfcheck                          # dataset + taxonomy integrity (no browser)
npm start                                  # in one terminal
node scripts/e2e.mjs http://localhost:3000 # full flow in a real browser (needs Chrome/Edge)
```

`scripts/` also has `video-check.mjs`, `library-check.mjs`, and `sw-check.mjs` for targeted checks.
