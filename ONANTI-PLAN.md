# Onanti Rebrand — Login Wall + Marketing Landing Page

## Context
The Shipibo Dictionary app is being rebranded to **Onanti** and deployed to `onanti.com` with `api.onanti.com`. All features move behind a login wall. Unauthenticated visitors see a marketing landing page with feature highlights and a Google sign-in CTA. The existing design language in `design language/` provides a complete visual system (burgundy primary, earth tones, DM Serif Display + Inter fonts, Kene patterns).

Currently: vanilla JS SPA, hash routing, ~2644-line `app.js`, Cloudflare Pages + Workers (Hono/D1/KV). Google OAuth already works. Some routes already require auth; dictionary browsing and icaros are public.

---

## Phase 1: Design System Foundation

### 1.1 Copy tokens.css into site
- Copy `design language/tokens.css` to `site/tokens.css`
- Add `<link rel="stylesheet" href="/tokens.css">` to `site/index.html` before `style.css`

### 1.2 Load new fonts
**File: `site/index.html`** — Add Google Fonts link in `<head>`:
- DM Serif Display (heading), Inter (body), Noto Sans (icaro lyrics)

### 1.3 Bridge old theme variables to new tokens
**File: `site/style.css`** — Add a `:root` override block at the end that maps old variables to new design token values. This lets all existing component CSS adopt the new palette without rewriting every rule.

Key mappings:
- `--color-accent` maps to `var(--color-burgundy-600)` (#7a3333)
- `--color-ink` maps to `var(--text-primary)`
- `--color-sand` maps to `var(--surface-secondary)`
- `--font-display` maps to `'DM Serif Display', serif`
- `--font-body` maps to `'Inter', sans-serif`

### 1.4 Extract Kene SVG patterns for vanilla JS
**File: Create `site/kene-patterns.js`** — Extract 2-3 key SVG patterns from `design language/kene-patterns.svg` as inline SVG strings for the landing page:
- Diamond grid for hero background
- Zigzag border for section dividers

---

## Phase 2: Auth Gating

### 2.1 Gate all routes in route()
**File: `site/app.js`** (line 496)

Add auth check at the top of `route()`. If `currentUser` is null, call `renderLanding()` and return. All existing route dispatching remains unchanged below the gate.

### 2.2 Defer data loading for unauthenticated users
**File: `site/app.js`** — `loadAll()` (line 481)

Only load entries/icaros/progress/bookmarks after auth is confirmed. Add an `ensureDataLoaded()` guard at the top of `route()` (after auth gate) so data loads on first authenticated navigation if not yet loaded.

### 2.3 Hide header/footer on landing page
- `renderLanding()` hides `#site-header` and `footer`, removes `max-w-3xl` class from `#app`
- `route()` restores them for authenticated views

### 2.4 Update renderNav()
**File: `site/app.js`** (line 381)

When `currentUser` is null, clear the nav (landing page has its own header). Existing authenticated nav rendering stays the same.

---

## Phase 3: Marketing Landing Page

### 3.1 Create renderLanding() function
**File: `site/app.js`** — New function (~120-150 lines)

Sections:
1. **Hero** — Dark burgundy gradient background with diamond grid Kene pattern at 6% opacity. "Onanti" in DM Serif Display at 60px (36px mobile). Subtitle: "Learn the Shipibo language through sacred icaros". Prominent "Sign in with Google" CTA button.
2. **Kene Divider** — Zigzag border pattern between hero and features.
3. **Feature Cards** — 2x2 grid (stacked on mobile):
   - Dictionary: "Explore 1000+ Shipibo words with English and Spanish definitions"
   - Icaros: "Learn traditional healing songs with line-by-line translations"
   - Spaced Repetition: "Master vocabulary with SM-2 flashcard review"
   - AI Chat: "Ask questions about Shipibo language and culture"
4. **Bottom CTA** — "Ready to begin your journey?" with another sign-in button.

Note: All dynamic content is escaped via `esc()`. The Google auth URL comes from `getGoogleAuthUrl()` which constructs a URL from constants (no user input). Feature card text is static/hardcoded.

### 3.2 Landing page CSS
**File: `site/style.css`** — Add ~120 lines of landing page styles using design tokens:
- `.landing-hero` — min-height 70vh, burgundy gradient, flex center
- `.landing-hero-pattern` — absolute positioned Kene background at 6% opacity
- `.landing-title` — `var(--font-heading)`, 60px display size
- `.landing-cta` — burgundy primary button with hover lift
- `.landing-features-grid` — CSS grid 2x2 to 1col on mobile at 640px
- `.landing-feature-card` — card with shadow, hover translateY(-2px)
- `.landing-divider` — inline SVG zigzag pattern
- `.landing-bottom-cta` — centered CTA section with earth background

---

## Phase 4: Rebrand Text

### 4.1 HTML
**File: `site/index.html`**
- Line 5: `<title>` changes to "Onanti"
- Line 9: theme-color changes to `#7a3333`
- Line 10: description changes to "Learn the Shipibo language through sacred icaros"
- Line 24: Logo text changes from "Shipibo" to "Onanti"
- Line 25: Remove "dictionary" span entirely
- Line 48: Footer tagline updates

### 4.2 Document titles in app.js
**File: `site/app.js`** — Replace all ~15 instances of "Shipibo Dictionary" in document.title assignments with "Onanti":
- "Shipibo Dictionary -- Browse" becomes "Browse -- Onanti"
- "Icaros -- Shipibo Dictionary" becomes "Icaros -- Onanti"
- And all other page titles similarly

### 4.3 Content text
- Search placeholder keeps "Shipibo" (it's the language name, not the brand)
- Update about page to reference "Onanti" as the product name
- Chat suggestions: keep Shipibo language references
- **Important**: "Shipibo" the language stays. "Shipibo Dictionary" the product changes to "Onanti".

### 4.4 LocalStorage key migration
**File: `site/app.js`** — Rename `shipibo_token` to `onanti_token` with backward-compatible migration:
- `getToken()` checks `onanti_token` first, then falls back to `shipibo_token` and migrates
- `setToken()` writes to `onanti_token`
- `clearToken()` removes both keys
- This ensures existing logged-in users are not logged out during the rebrand

### 4.5 API URL
**File: `site/app.js`** (line 10-12) — Production API URL changes to `https://api.onanti.com`

---

## Phase 5: PWA + Deployment

### 5.1 Update manifest.json
**File: `site/manifest.json`**
- name: "Onanti"
- short_name: "Onanti"
- description: "Learn the Shipibo language through sacred icaros"
- theme_color: "#7a3333"
- background_color: "#f9f8f7"

### 5.2 Update icons
- **`site/icon.svg`** — Burgundy rounded square with "O" lettermark
- **`site/icon.png`** — Generate 512x512 PNG from new SVG

### 5.3 Service worker
**File: `site/service-worker.js`**
- Cache name: `onanti-v1` (replaces `shipibo-v7`, triggers automatic old cache cleanup)
- Add `/tokens.css` to ASSETS list

### 5.4 Custom domain: onanti.com (Cloudflare Pages)
**Manual steps:**
1. Ensure `onanti.com` zone exists in Cloudflare account
2. Cloudflare Pages project settings, Custom domains, add `onanti.com` + `www.onanti.com`
3. SSL auto-provisions

### 5.5 Custom domain: api.onanti.com (Cloudflare Workers)
**File: `api/wrangler.toml`** — Add routes config:
```toml
routes = [{ pattern = "api.onanti.com/*", zone_name = "onanti.com" }]
```
Then deploy: `cd api && npx wrangler deploy`

### 5.6 Google OAuth update
**Manual steps in Google Cloud Console:**
1. Navigate to OAuth 2.0 credentials for client ID `1031125691626-be1alhdjerga7uicudgmgaghsh3ad6je`
2. Add authorized JavaScript origin: `https://onanti.com`
3. Add authorized redirect URI: `https://onanti.com/auth/callback/`
4. Keep old `shipibo-dictionary.pages.dev` URIs during transition

### 5.7 Deployment order
1. Deploy API with custom domain route in `wrangler.toml`
2. Configure DNS (`onanti.com` for Pages, `api.onanti.com` for Workers)
3. Update Google OAuth redirect URIs in Cloud Console
4. Deploy site to Cloudflare Pages
5. Test full OAuth flow on new domain
6. Old domains continue working during transition

---

## Files to Modify

| File | Changes |
|------|---------|
| `site/index.html` | Google Fonts, tokens.css link, rebrand title/meta/logo/footer |
| `site/app.js` | Auth gate in `route()`, `renderLanding()`, defer data loading, `ensureDataLoaded()`, rebrand ~15 titles, token key migration, API URL |
| `site/style.css` | Theme bridge variables, ~120 lines of landing page styles |
| `site/tokens.css` | **New file** (copy from `design language/tokens.css`) |
| `site/kene-patterns.js` | **New file** (extracted SVG patterns for landing page) |
| `site/manifest.json` | Name to "Onanti", colors |
| `site/icon.svg` | New Onanti burgundy icon |
| `site/icon.png` | New 512x512 PNG |
| `site/service-worker.js` | Cache name `onanti-v1`, add `tokens.css` to ASSETS |
| `api/wrangler.toml` | Add routes for `api.onanti.com` |

---

## Verification Checklist
1. Unauthenticated visit shows marketing landing page with Onanti branding
2. No hash route shows app content without signing in
3. Google sign-in works and redirects to browse view with full app
4. All existing features work (dictionary, icaros, bookmarks, review, chat, contributions, admin)
5. Existing logged-in users are not logged out (localStorage migration)
6. New design tokens apply (burgundy accents, DM Serif Display headings, Inter body)
7. PWA installable with new name/icon
8. Offline fallback works (service worker serves cached shell)
9. `onanti.com` and `api.onanti.com` resolve correctly
10. Landing page is responsive (hero + feature cards stack on mobile)
