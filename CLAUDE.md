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
│   └── translate_entries.py      # Translate Spanish→English
├── data/                          # Extracted dictionary data
│   ├── ocr_section_a.json        # Raw OCR text
│   ├── entries_section_a.json    # Parsed entries (Spanish)
│   └── entries_section_a_translated.json  # Bilingual entries
├── web/                           # Rails web application
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
```

### Rails App (from web/ directory)
```bash
cd web

# Setup
rails db:create db:migrate
rails dictionary:import

# Run server
bin/rails server

# Or with Tailwind watcher
bin/dev
```

## Environment

- Python 3.x with venv for extraction scripts
- Ruby 3.2+ / Rails 8 for web app
- PostgreSQL database
- ANTHROPIC_API_KEY in .env for Claude API access
