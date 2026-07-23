#!/usr/bin/env bash
# Build the vKara Samsung TV (Tizen 6.5+, 2022+ models
#
# Produces an UNSIGNED dist/vKara.wgt — a plain zip with config.xml at the
# root, which is exactly what Apps2Samsung expects: it generates certificates
# for your TV (using its DUID) and re-signs the package during install.
#
# Usage:
#   bun run build:tizen                        # from the repo root
#   VKARA_TV_URL=https://my.host/ bun run build:tizen   # self-hosted vkara
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$APP_DIR/src"
DIST_DIR="$APP_DIR/dist"
OUT_FILE="$DIST_DIR/vKara.wgt"

if ! command -v zip >/dev/null 2>&1; then
    echo "error: 'zip' is required (macOS/Linux ship it; on Windows use WSL or 'winget install GnuWin32.Zip')." >&2
    exit 1
fi

for f in config.xml index.html icon.png js/main.js css/style.css; do
    if [[ ! -f "$SRC_DIR/$f" ]]; then
        echo "error: missing $SRC_DIR/$f" >&2
        exit 1
    fi
done

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT
cp -R "$SRC_DIR/". "$STAGE_DIR/"

# Point the wrapper at a self-hosted vkara instead of vkara.vercel.app.
if [[ -n "${VKARA_TV_URL:-}" ]]; then
    if [[ "$VKARA_TV_URL" != http://* && "$VKARA_TV_URL" != https://* ]]; then
        echo "error: VKARA_TV_URL must start with http:// or https:// (got: $VKARA_TV_URL)" >&2
        exit 1
    fi
    sed "s#^var APP_URL = .*#var APP_URL = '$VKARA_TV_URL';#" \
        "$STAGE_DIR/js/main.js" > "$STAGE_DIR/js/main.js.tmp"
    mv "$STAGE_DIR/js/main.js.tmp" "$STAGE_DIR/js/main.js"
    echo "Using custom app URL: $VKARA_TV_URL"
fi

mkdir -p "$DIST_DIR"
rm -f "$OUT_FILE"
(cd "$STAGE_DIR" && zip -r -X -q "$OUT_FILE" .)

VERSION="$(sed -n 's/.*<widget[^>]*[^_]version="\([^"]*\)".*/\1/p' "$SRC_DIR/config.xml" | head -1)"
echo "Built $OUT_FILE (v${VERSION:-?}, $(du -h "$OUT_FILE" | cut -f1 | tr -d ' '))"
echo "Sideload it with Apps2Samsung: https://github.com/Apps2Samsung/Apps2Samsung"
