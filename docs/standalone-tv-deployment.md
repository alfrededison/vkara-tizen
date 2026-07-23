# Standalone TV deployment (your own frontend + upstream backend)

How to run the vkara Samsung TV app fully under your own control: you deploy
the **frontend** (this fork, free Vercel Hobby plan) and reuse the upstream
author's **backend**. No cooperation from the upstream project is needed.

```
┌─────────────┐   loads    ┌──────────────────────────┐   WS/HTTP   ┌────────────────────────────┐
│ Samsung TV   │ ─────────▶ │ YOUR Vercel deployment    │ ──────────▶ │ upstream backend            │
│ vKara.wgt    │            │ <your-app>.vercel.app/tv  │             │ vkara-realtime.giang.io.vn  │
└─────────────┘            └──────────────────────────┘             └────────────────────────────┘
```

Why this split: the WGT must stay a thin shell (a Next.js app-router frontend
can't run from a Tizen widget's local origin), and the backend is already
open — its CORS reflects any origin and the `/ws` WebSocket upgrade accepts
foreign `Origin` headers (verified 2026-07-23). If that ever gets locked
down, self-host the backend instead with the `lehuygiang28/vkara-api` Docker
image and change two env vars below.

## 1. Import the repo on Vercel

1. [vercel.com](https://vercel.com) → log in **with GitHub** →
   **Add New → Project** → import your fork.
2. **Set Root Directory to `apps/web`** — the one critical monorepo setting.
   Everything else comes from [apps/web/vercel.json](../apps/web/vercel.json)
   (Bun 1.x, `bun install` + `bun run build:web` from the repo root, Next.js
   auto-detected).

## 2. Set the environment variables

Project **Settings → Environment Variables**:

```
NEXT_PUBLIC_API_URL        = https://vkara-realtime.giang.io.vn
NEXT_PUBLIC_WS_URL         = wss://vkara-realtime.giang.io.vn/ws
NEXT_PUBLIC_TIKTOK_API_URL = https://vkara-tiktok-api.giang.io.vn
NEXT_PUBLIC_APP_URL        = https://<your-project>.vercel.app
```

`NEXT_PUBLIC_APP_URL` makes canonical/Open Graph URLs point at your own
domain (you can add it after the first deploy once you know the URL).
Sentry/analytics stay off without their vars, and Vercel sets `CI=1`, which
skips strict env validation at build time.

## 3. Deploy and verify

Deploy, then confirm the TV pipeline ran in the build logs:

```
[tv-downlevel] target=chrome85: rewrote 66/66 JS chunks ...
[tv-verify] OK — 66 JS chunks parse at ES2021, 3 CSS files clean
```

Open `https://<your-project>.vercel.app/tv` in a desktop browser — you should
see the TV lobby with a room code and QR.

## 4. Build and sideload the TV app

```sh
VKARA_TV_URL=https://<your-project>.vercel.app/tv bun run build:tizen
```

Then sideload `apps/tizen/dist/vKara.wgt` with
[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) — TV setup steps
are in [apps/tizen/README.md](../apps/tizen/README.md). Supported models:
Tizen 6.5+ (2022 and newer, e.g. The Frame 2022).

From then on, every push to `main` auto-deploys the frontend; the WGT only
needs rebuilding if you change the wrapper itself or the target URL.

## CLI alternative

Prefer the terminal over the dashboard? `npm i -g vercel && vercel login`,
then `cd apps/web && vercel --prod`. The GitHub integration is still the
better default — it gives you auto-deploys on push.

## Troubleshooting

- **White/blank screen on the TV, site fine on desktop** — check the build
  logs for the `[tv-downlevel]`/`[tv-verify]` lines; if they're missing, the
  build ran without the TV pipeline. Also note the TV's built-in browser
  updates its engine independently of the web-app runtime, so "works in the
  TV browser" doesn't prove the app runtime can run it.
- **Which engine does my TV actually have?** While the WGT's splash or error
  overlay is visible, the full user agent (with `Chrome/xx`) is printed at
  the bottom of the screen.
- **Room won't connect** — verify `NEXT_PUBLIC_WS_URL` ends with `/ws` and
  uses `wss://`, and that the backend is reachable:
  a request to `https://vkara-realtime.giang.io.vn/ws` with WebSocket upgrade
  headers should answer `101 Switching Protocols`.
