# Convert Shipibo Dictionary from Rails to Cloudflare Pages Static Site

## Overview
Replace the Rails app (`web/`) with a static site (`site/`) that runs entirely client-side. No server, no database, no build tools. Dictionary data bundled as JSON, search runs in the browser.

## Architecture
- **Single `index.html`** with hash routing (`#/`, `#/search?q=`, `#/entry/42`)
- **Single `app.js`** (~300 lines) for routing, rendering, and search
- **Pre-compiled Tailwind CSS** copied from the Rails build (no CDN, no build step)
- **Static JSON** data file (~200 entries, ~25KB gzipped)
- **PWA** with service worker for offline use

Hash routing chosen over History API because it requires zero server config and works with any static file server including `python3 -m http.server` for local dev.

## File Structure
```
site/
  index.html            # Shell: header, <main id="app">, footer
  app.js                # Router + views + search logic
  style.css             # Copied from web/app/assets/builds/tailwind.css
  data/entries.json     # Processed dictionary data
  fonts/                # Copied from web/public/fonts/
  icon.png, icon.svg    # Copied from web/public/
  manifest.json         # PWA manifest
  service-worker.js     # Cache-first service worker
```

## Implementation Steps

### Step 1: Create `site/` directory and copy static assets
- Copy fonts from `web/public/fonts/`
- Copy icons from `web/public/`
- Copy `web/app/assets/builds/tailwind.css` to `site/style.css`

### Step 2: Create data build script (`scripts/build_site_data.py`)
- Read `data/entries_section_a_translated.json`
- Strip accents from headwords (matching Rails `import.rake` behavior)
- Add `id` field (array index) for URL routing
- Remove `examples_original` field (redundant, saves ~30% JSON size)
- Write to `site/data/entries.json`

### Step 3: Create `site/index.html`
- Translate Rails layout (`application.html.erb`) to static HTML
- Static header/footer, dynamic `<main id="app">` container
- Links use `#/` hash routes
- PWA meta tags, manifest link, service worker registration

### Step 4: Create `site/app.js` (core application)
Three views translated from Rails ERB templates:

**Browse view** (from `index.html.erb`):
- Hero section, search input with 250ms debounce
- Alphabet navigation (`#/?letter=a` links)
- Entry card grid

**Search view** (from `search.html.erb`):
- Client-side search across headword, definitions_english, definitions_spanish
- Case-insensitive substring match, max 50 results

**Entry detail view** (from `show.html.erb`):
- All sections: variant forms, etymology, scientific name, definitions (EN/ES), examples, usage notes, synonyms, cross-references, page reference
- Synonyms/cross-references link to matching entries when found

### Step 5: Create PWA files
- `manifest.json` with Shipibo Dictionary branding, earth-tone theme color (`#e9dfc7`)
- `service-worker.js` caching all static assets for offline use

### Step 6: Test locally
```bash
cd site && python3 -m http.server 8000
```
- Verify browse, search, detail views
- Compare visual output against Rails app
- Test offline PWA behavior

### Step 7: Deploy to Cloudflare Pages
- Build output directory: `site`
- No build command needed (or optionally `python3 scripts/build_site_data.py`)

## Key Source Files to Reference
- `web/app/assets/builds/tailwind.css` - complete CSS to copy directly
- `web/app/views/entries/index.html.erb` - browse view template
- `web/app/views/entries/show.html.erb` - detail view template
- `web/app/views/entries/search.html.erb` - search view template
- `web/app/views/layouts/application.html.erb` - layout template
- `web/app/javascript/controllers/search_controller.js` - search behavior to replicate
- `web/lib/tasks/import.rake` - accent stripping logic to replicate
- `data/entries_section_a_translated.json` - source data

## Key Implementation Details

### Hash Router
```javascript
// #/              -> browse all entries
// #/?letter=a     -> browse filtered by letter
// #/search?q=foo  -> search results
// #/entry/42      -> entry detail (by array index)
window.addEventListener('hashchange', route);
```

### Client-Side Search
```javascript
function searchEntries(query) {
  const q = query.toLowerCase();
  return ENTRIES.filter(entry => {
    if (entry.headword.toLowerCase().includes(q)) return true;
    if (entry.definitions_english?.some(d => d.toLowerCase().includes(q))) return true;
    if (entry.definitions_spanish?.some(d => d.toLowerCase().includes(q))) return true;
    return false;
  }).slice(0, 50);
}
```

### Accent Stripping (matching Rails import.rake)
```python
# In build_site_data.py
def strip_accents(s):
    return s.translate(str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU"))
```

### Alphabet Navigation
```javascript
function computeLetters(entries) {
  const letters = new Set();
  entries.forEach(e => {
    const clean = e.headword.replace(/^[-\u2014]/, '');
    if (clean.length > 0) letters.add(clean[0].toLowerCase());
  });
  return [...letters].sort();
}
```
