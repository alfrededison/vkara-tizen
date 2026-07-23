# @vkara/tizen — Samsung TV app (Tizen 6.5+, 2022+ models)

A thin Tizen web-app shell that opens the hosted vkara TV experience
(`https://vkara.vercel.app/tv`) fullscreen on the TV. On launch it turns the
screensaver off, registers the remote's media keys (both are app-level
settings that survive navigation), then **navigates top-level** to the hosted
app — the exact same context as the TV's built-in browser, which is known to
work. An earlier iframe-based shell showed a white frame: cross-origin
iframes inside a Tizen widget get third-party restrictions (blocked
localStorage/cookies) that top-level pages don't, and vkara needs storage at
boot. If the TV is offline, the shell shows a retry overlay instead
(OK retries, BACK exits).

## Why the TV works now (and didn't before)

Samsung TVs run old Chromium builds pinned to the OS — the supported
baseline, **Tizen 6.5 (2022 models, e.g. The Frame 2022), is roughly
Chrome 85**. The built-in browser app updates its engine separately, so "the
site works in the TV browser" says nothing about the web-app runtime. The
vkara web app is fully client-side rendered, and vendor chunks from
`node_modules` can ship syntax/CSS newer than that engine, which used to
leave the TV on a white screen. Two things in `apps/web` fix that:

- `scripts/tv-downlevel.mjs` — post-build pass that rewrites **every** client
  chunk with esbuild to `chrome85` syntax and fixes the CSS (`:is()`,
  `:where()` are Chrome 88+, `dvh` is 108+). Runs automatically in
  `bun run build`; skip with `TV_DOWNLEVEL=0`, tune with `TV_CHROME_TARGET`
  (e.g. `chrome63` to re-add 2019-model support).
- `public/tv-polyfills.js` — guarded runtime API shims newer than Chrome 85
  (`Array.at`, `Object.hasOwn`, `findLast`, `crypto.randomUUID`,
  `structuredClone`) loaded before any app chunk.

The TV fix therefore ships with the next web deploy; the WGT itself rarely
needs to change. While the splash or error overlay is visible, the TV's user
agent is printed at the bottom of the screen — the `Chrome/xx` value tells you
exactly what engine you're dealing with when debugging.

Running your own frontend instead of vkara.vercel.app? See
[docs/standalone-tv-deployment.md](../../docs/standalone-tv-deployment.md)
for the full fork-and-deploy walkthrough.

## Build the WGT

```sh
bun run build:tizen            # from the repo root
```

Output: `apps/tizen/dist/vKara.wgt` (unsigned — see below for why that's OK).

Self-hosting vkara? Point the shell at your own instance:

```sh
VKARA_TV_URL=https://your-host.example.com/tv bun run build:tizen
```

Requirements: `bash` and `zip` (preinstalled on macOS/Linux; on Windows use
WSL).

## Sideload with Apps2Samsung

1. Put the TV in **Developer Mode**:
   - Open the **Apps** panel on the TV.
   - Type `1` `2` `3` `4` `5` on the remote (a hidden dialog appears).
   - Switch Developer mode **On**, enter the IP address of the computer that
     will run Apps2Samsung, then restart the TV.
2. Run [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung)
   (Windows/macOS/Linux/Android), select your TV, choose **custom `.wgt`**,
   and pick `apps/tizen/dist/vKara.wgt`.
3. The app appears in the TV's app list as **vKara**.

The WGT is intentionally unsigned: Apps2Samsung generates certificates for
your specific TV (using its DUID) and re-signs the package during
installation. If you install with Tizen Studio / `tizen install` instead,
sign it with your own certificate profile first
(`tizen package -t wgt -s <profile> -- apps/tizen/dist`).

## Project layout

```
src/
  config.xml      # Tizen manifest — package Gvkara0001, required_version 6.5
  index.html      # splash / error overlays shown until the hand-off
  js/main.js      # top-level hand-off, retry, remote keys, screensaver, UA badge
  css/style.css
  icon.png
scripts/
  build-wgt.sh    # stages src/, applies VKARA_TV_URL, zips into dist/vKara.wgt
```

Keep `config.xml`'s package ID (`Gvkara0001`) stable across releases —
installing a WGT with the same ID upgrades the app in place; changing it
creates a second app on the TV.
