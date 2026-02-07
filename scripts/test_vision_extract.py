#!/usr/bin/env python3
"""
Test: Send a dictionary page image directly to Claude's vision API
to extract structured + translated entries in a single call.

Compares results against the existing OCR → parse → translate pipeline.
"""

import base64
import json
import os
import sys
import time
from pathlib import Path

import pymupdf
from PIL import Image
from dotenv import load_dotenv
import anthropic

load_dotenv(Path(__file__).parent.parent / '.env')

VISION_PROMPT = """You are extracting entries from a scanned page of a Shipibo-Spanish dictionary.

## How to identify dictionary entries

Each entry starts with a **bold headword** — a single Shipibo word (sometimes prefixed with a dash for suffixes like "-a"). The headword is followed by a part-of-speech abbreviation (s., v. t., v. i., adj., adv., sf., interj., prep.) and then the Spanish definition(s).

Do NOT treat these as entries:
- Example sentences in angle brackets «» — these illustrate the headword, they are NOT separate entries. An example sentence is typically a full phrase or sentence (multiple words with spaces) followed by a translation. These ALWAYS belong to the preceding headword entry.
- Sentences or phrases that appear after "-Úsase" notes — these are usage examples, not headwords
- Column headers (single words centered at the top of a column)
- Page headers like "DICCIONARIO SHIPIBO"
- Cross-references within an entry (e.g. "Véase Bosquejo gramatical...")

A real headword is always a SINGLE Shipibo word (or a dash-prefixed suffix like "-a"), immediately followed by a part-of-speech marker. If you see a multi-word phrase, it is an example sentence, not a headword.

## Entry structure

Many entries have MULTIPLE numbered senses (1:, 2:, etc.) — capture ALL of them in the definitions arrays.

Entries may also have multiple "-Úsase" usage notes describing different grammatical functions — when a headword has several distinct "-Úsase" blocks followed by different examples, these are all part of the SAME entry (multiple senses), not separate entries. Combine them.

## Fields to extract per entry

- headword: the Shipibo word (lowercase, preserve all accents like á é í ó ú)
- part_of_speech: normalize to one of: "noun", "transitive verb", "intransitive verb", "adjective", "adverb", "interjection", "preposition", "suffix", "postposition", or null
- variant_forms: array of alternate spellings (after "tb." or "conj."), or []
- etymology: bracketed text like "[del cast.]" or "[del ship. X + Y]", or null
- definitions_spanish: array of ALL Spanish definitions/senses for this entry
- definitions_english: array of English translations matching each Spanish definition (same order, same count)
- examples: array of objects with "shipibo", "spanish", and "english" fields. In the dictionary, examples appear between «» or <>. The Shipibo sentence comes first (often italicized), then the Spanish translation. Provide an English translation for each.
- synonyms: array of synonym words (after "sinón."), or []
- cross_references: array of related words (after "Véase" or "Véase bajo"), or []
- grammatical_notes: combined usage notes from "-Úsase" sections (translated to English), or null

## Rules

- Return ONLY a valid JSON array of entry objects — no markdown, no explanation
- Include every distinct headword entry visible on the page
- When an entry has multiple numbered definitions (1:, 2:), include ALL in definitions_spanish and definitions_english
- When a suffix like "-a" has multiple grammatical uses (each with "-Úsase..."), combine them as multiple definitions in ONE entry, unless the dictionary clearly marks them as separate entries (separate bold headwords with separate POS markers)
- For flora/fauna terms, add scientific names in parentheses in definitions_english if you know them
- Read the page carefully — the text is in two columns, read left column fully then right column

Return the JSON array:"""


def extract_page_as_base64(pdf_path: str, page_num: int, zoom: float = 2.0) -> str:
    """Extract a PDF page as a base64-encoded PNG."""
    doc = pymupdf.open(pdf_path)
    page = doc[page_num]
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()

    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.standard_b64encode(buf.getvalue()).decode("utf-8")


def main():
    pdf_path = Path(__file__).parent.parent / 'shipibo.pdf'
    data_dir = Path(__file__).parent.parent / 'data'

    # Page 84 (0-indexed) = page 85 = first A section page
    page_idx = 84
    print(f"Extracting page {page_idx + 1} as image...")
    img_b64 = extract_page_as_base64(str(pdf_path), page_idx)
    print(f"  Image size: {len(img_b64)} bytes (base64)")

    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic()

    # --- Vision API call ---
    print("\nSending page image to Claude (vision)...")
    t0 = time.time()

    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=8192,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
                {
                    "type": "text",
                    "text": VISION_PROMPT,
                },
            ],
        }],
    )

    vision_time = time.time() - t0
    print(f"  Vision API call took {vision_time:.1f}s")

    response_text = response.content[0].text.strip()

    # Parse JSON
    if response_text.startswith('['):
        json_text = response_text
    else:
        start = response_text.find('[')
        end = response_text.rfind(']') + 1
        if start >= 0 and end > start:
            json_text = response_text[start:end]
        else:
            print("ERROR: Could not find JSON in response")
            print(response_text[:500])
            sys.exit(1)

    vision_entries = json.loads(json_text)

    # Save vision results
    output_file = data_dir / 'test_vision_page85.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(vision_entries, f, ensure_ascii=False, indent=2)

    print(f"\n=== VISION RESULTS ===")
    print(f"Entries found: {len(vision_entries)}")
    print(f"Time: {vision_time:.1f}s (1 API call)")

    for e in vision_entries:
        hw = e.get('headword', '?')
        pos = e.get('part_of_speech', '?')
        esp = e.get('definitions_spanish', [])
        eng = e.get('definitions_english', [])
        print(f"\n  {hw} ({pos})")
        print(f"    ES: {esp[:2]}")
        print(f"    EN: {eng[:2]}")

    # --- Compare with existing pipeline results ---
    existing_file = data_dir / 'entries_section_a_translated.json'
    if existing_file.exists():
        existing = json.load(open(existing_file, 'r', encoding='utf-8'))
        page1_existing = [e for e in existing if e.get('page_number') == 1]

        print(f"\n=== EXISTING PIPELINE RESULTS (page 1) ===")
        print(f"Entries: {len(page1_existing)}")
        print(f"Time: ~{len(page1_existing)} parse API calls + {len(page1_existing)} translate API calls")

        for e in page1_existing:
            hw = e.get('headword', '?')
            pos = e.get('part_of_speech', '?')
            esp = e.get('definitions_spanish', [])
            eng = e.get('definitions_english', [])
            print(f"\n  {hw} ({pos})")
            print(f"    ES: {esp[:2]}")
            print(f"    EN: {eng[:2]}")

        # Summary comparison
        vision_headwords = {e.get('headword', '').lower() for e in vision_entries}
        existing_headwords = {e.get('headword', '').lower() for e in page1_existing}

        print(f"\n=== COMPARISON ===")
        print(f"Vision headwords ({len(vision_headwords)}): {sorted(vision_headwords)}")
        print(f"Existing headwords ({len(existing_headwords)}): {sorted(existing_headwords)}")
        print(f"In vision but not existing: {sorted(vision_headwords - existing_headwords)}")
        print(f"In existing but not vision: {sorted(existing_headwords - vision_headwords)}")
    else:
        print(f"\nNo existing translated entries file found for comparison")

    print(f"\nUsage: input={response.usage.input_tokens} tokens, output={response.usage.output_tokens} tokens")


if __name__ == '__main__':
    main()
