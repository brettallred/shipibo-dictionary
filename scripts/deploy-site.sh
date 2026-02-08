#!/usr/bin/env bash
set -euo pipefail

# Deploy site to Cloudflare Pages with cache-busting via git hash.
# Usage: ./scripts/deploy-site.sh [--staging]
#
# How it works:
# 1. Copies site/ to a temp build directory
# 2. Gets the current git short hash
# 3. Appends ?v=HASH to asset references in index.html
# 4. Sets CACHE_NAME to "onanti-HASH" in service-worker.js
# 5. Deploys from the temp dir
# 6. Cleans up
#
# Source files stay clean — local dev works without version strings.

PROJECT="shipibo-dictionary"
BRANCH="main"
if [[ "${1:-}" == "--staging" ]]; then
  PROJECT="onanti-staging"
  BRANCH="main"
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$PROJECT_ROOT/site"
HASH="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
BUILD_DIR="$(mktemp -d)"

echo "==> Building with hash: $HASH"
echo "==> Build dir: $BUILD_DIR"

# Copy site to build dir
cp -R "$SITE_DIR"/* "$BUILD_DIR"/

# Bust asset references in index.html
sed -i.bak \
  -e "s|href=\"/tokens.css\"|href=\"/tokens.css?v=$HASH\"|g" \
  -e "s|href=\"/style.css\"|href=\"/style.css?v=$HASH\"|g" \
  -e "s|src=\"/kene-patterns.js\"|src=\"/kene-patterns.js?v=$HASH\"|g" \
  -e "s|src=\"/app.js\"|src=\"/app.js?v=$HASH\"|g" \
  -e "s|href=\"/manifest.json\"|href=\"/manifest.json?v=$HASH\"|g" \
  "$BUILD_DIR/index.html"
rm -f "$BUILD_DIR/index.html.bak"

# Update service worker cache name so old SW is replaced
sed -i.bak \
  "s|var CACHE_NAME = \"onanti-v[^\"]*\"|var CACHE_NAME = \"onanti-$HASH\"|" \
  "$BUILD_DIR/service-worker.js"
rm -f "$BUILD_DIR/service-worker.js.bak"

# Update stale-while-revalidate URL matching to use includes()
# so it works with versioned query strings (must run BEFORE URL versioning)
sed -i.bak \
  -e 's|endsWith("/app.js")|includes("/app.js")|g' \
  -e 's|endsWith("/style.css")|includes("/style.css")|g' \
  -e 's|endsWith("/tokens.css")|includes("/tokens.css")|g' \
  -e 's|endsWith("/kene-patterns.js")|includes("/kene-patterns.js")|g' \
  "$BUILD_DIR/service-worker.js"
rm -f "$BUILD_DIR/service-worker.js.bak"

# Bust the asset URLs inside the service worker ASSETS array
sed -i.bak \
  -e "s|\"/app.js\"|\"\/app.js?v=$HASH\"|g" \
  -e "s|\"/style.css\"|\"\/style.css?v=$HASH\"|g" \
  -e "s|\"/tokens.css\"|\"\/tokens.css?v=$HASH\"|g" \
  -e "s|\"/kene-patterns.js\"|\"\/kene-patterns.js?v=$HASH\"|g" \
  -e "s|\"/index.html\"|\"\/index.html?v=$HASH\"|g" \
  -e "s|\"/manifest.json\"|\"\/manifest.json?v=$HASH\"|g" \
  "$BUILD_DIR/service-worker.js"
rm -f "$BUILD_DIR/service-worker.js.bak"

echo "==> Deploying to Cloudflare Pages (project: $PROJECT, branch: $BRANCH)..."
npx wrangler pages deploy "$BUILD_DIR" \
  --project-name "$PROJECT" \
  --branch "$BRANCH"

# Cleanup
rm -rf "$BUILD_DIR"
echo "==> Done! Deployed with cache version: onanti-$HASH"
