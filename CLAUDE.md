# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Shipibo-English dictionary application built from a scanned Shipibo-Spanish PDF dictionary. Shipibo is an indigenous language from the Peruvian Amazon.

## Project Structure

```
shipibo_dictionary/
├── shipibo.pdf                    # Original 554-page dictionary
├── shipibo_dictionary_only.pdf    # Extracted dictionary pages only
├── scripts/                       # Python extraction/translation tools
│   ├── extract_ocr.py            # OCR extraction from PDF
│   ├── parse_entries.py          # Parse OCR with Claude API
│   ├── translate_entries.py      # Translate Spanish→English
│   └── build_site_data.py       # Build static JSON for site
├── data/                          # Extracted dictionary data
│   ├── ocr_section_a.json        # Raw OCR text
│   ├── entries_section_a.json    # Parsed entries (Spanish)
│   └── entries_section_a_translated.json  # Bilingual entries
├── site/                          # Static site (deployed to Cloudflare Pages)
│   ├── index.html                # Single-page app shell
│   ├── app.js                    # Router, views, client-side search
│   ├── style.css                 # Pre-compiled Tailwind CSS
│   ├── data/entries.json         # Processed dictionary data
│   ├── fonts/                    # Custom web fonts
│   ├── manifest.json             # PWA manifest
│   └── service-worker.js         # Offline caching
├── ios/                           # iOS app wrapper
└── android/                       # Android app wrapper
```

## Commands

### Python Scripts (from project root)
```bash
source venv/bin/activate

# Extract OCR from PDF (requires tesseract)
python scripts/extract_ocr.py --sample

# Parse entries with Claude API (requires ANTHROPIC_API_KEY in .env)
python scripts/parse_entries.py --sample

# Translate to English
python scripts/translate_entries.py --section-a

# Build site data
python scripts/build_site_data.py
```

### Static Site
```bash
# Local development
cd site && python3 -m http.server 8000

# Deploy to Cloudflare Pages
wrangler pages deploy site --project-name shipibo-dictionary --branch main
```

## Architecture

- Static site with hash routing (`#/`, `#/search?q=`, `#/entry/42`)
- Client-side search across headword, English, and Spanish definitions
- PWA with service worker for offline use
- Deployed to Cloudflare Pages at https://shipibo-dictionary.pages.dev

## Environment

- Python 3.x with venv for extraction scripts
- ANTHROPIC_API_KEY in .env for Claude API access
- wrangler CLI for Cloudflare Pages deployment
