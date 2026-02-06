# Shipibo-English Dictionary

A bilingual dictionary application for **Shipibo**, an indigenous language spoken by the Shipibo-Conibo people of the Peruvian Amazon.

## Features

- **101 dictionary entries** (A section) with:
  - Shipibo headwords and variant forms
  - English and Spanish definitions
  - Example sentences in Shipibo with translations
  - Etymology and grammatical notes
  - Scientific names for flora/fauna

- **Web Application** (Rails 8 + Tailwind)
  - Browse all entries alphabetically
  - Search by Shipibo, Spanish, or English
  - Mobile-responsive design

- **Mobile Apps** (Turbo Native)
  - iOS and Android wrapper apps
  - Native navigation with web content

## Quick Start

### Prerequisites

- Ruby 3.2+
- PostgreSQL
- Node.js

### Setup

```bash
cd web
bundle install
rails db:create db:migrate
rails dictionary:import
bin/rails server
```

Visit **http://localhost:3000**

## Project Structure

```
shipibo_dictionary/
├── data/                     # Dictionary data (JSON)
├── scripts/                  # Python extraction tools
├── web/                      # Rails web application
├── ios/                      # iOS app (Turbo Native)
└── android/                  # Android app (Turbo Native)
```

## Data Pipeline

The dictionary was created through this pipeline:

1. **OCR Extraction** - Extract text from scanned PDF using Tesseract
2. **AI Parsing** - Parse entries into structured JSON using Claude API
3. **Translation** - Translate Spanish definitions to English using Claude API
4. **Import** - Load into PostgreSQL via Rails

## Extending the Dictionary

To extract additional sections (B, C, etc.):

```bash
source venv/bin/activate

# 1. Extract OCR from specific pages
python scripts/extract_ocr.py  # Edit page ranges in script

# 2. Parse with Claude
python scripts/parse_entries.py

# 3. Translate to English
python scripts/translate_entries.py

# 4. Re-import to Rails
cd web && rails dictionary:clear dictionary:import
```

## About Shipibo

Shipibo (also called Shipibo-Conibo) is a Panoan language spoken by approximately 35,000 people in the Ucayali region of Peru. The language is known for its:

- Complex verbal morphology
- Evidentiality markers
- Rich vocabulary for Amazonian ecology
- Connection to traditional art and ayahuasca ceremonies

## License

Dictionary content is derived from academic linguistic research. Code is MIT licensed.

## Acknowledgments

- Original dictionary compiled by linguistic researchers
- Built with Claude API for AI-powered extraction and translation
