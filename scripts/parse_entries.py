#!/usr/bin/env python3
"""
Step 2: Parse OCR text into structured entries using Claude API.

Pre-splits OCR text at headword boundaries so each API call parses
one entry, avoiding dropped entries on dense pages.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
import anthropic

# Load .env file from project root
load_dotenv(Path(__file__).parent.parent / '.env')


PARSE_PROMPT = """Parse this Shipibo-Spanish dictionary entry into structured JSON.

The text comes from OCR and may have errors. Common OCR mistakes:
- "v. £." or "v. ¿." usually means "v. t." (transitive verb)
- "». i." or "v. 1." usually means "v. i." (intransitive verb)
- "5." might mean "s." (noun)
- Angle brackets «» may appear as < > or other variants

Extract the following fields:
- headword: the Shipibo word being defined (lowercase)
- part_of_speech: one of: "s." (noun), "v. t." (transitive verb), "v. i." (intransitive verb), "adj." (adjective), "adv." (adverb), "interj." (interjection), "prep." (preposition), "sf." (suffix), or null
- variant_forms: array of alternate spellings/conjugations (found after "tb." or "coni.")
- etymology: the bracketed etymology like "[del ship. X + Y]" or null
- definitions_spanish: array of Spanish definitions (may be numbered 1:, 2:, etc.)
- examples: array of objects with "shipibo" and "spanish" fields. Examples appear in «» or <>. The Shipibo text is typically first (often italicized in original), followed by Spanish translation.
- synonyms: array of synonym words (found after "sinón.")
- cross_references: array of related words (found after "Véase" or "Véase bajo")
- grammatical_notes: usage notes starting with "-Úsase" or null

Important:
- Return ONLY a valid JSON array containing one or more entry objects, no other text
- Each entry should be a complete dictionary entry (headword + definition)
- If the text contains sub-entries (compounds listed under a main entry), include each as a separate entry in the array
- If an entry has multiple numbered definitions, include all of them in definitions_spanish array
- This text is from the A section of the dictionary. Headwords should start with "a" or "á". If the OCR appears to have corrupted the first character(s) of a headword, correct it based on context (variant forms, etymology, examples).

OCR TEXT TO PARSE:
---
{ocr_text}
---

Return the JSON array:"""


# Regex to detect the start of a dictionary entry.
# Matches: optional dash + headword + whitespace + POS marker (or Véase / etymology)
ENTRY_START = re.compile(
    r'^[-—]?[A-ZÁÉÍÓÚa-záéíóúñ][\wáéíóúñ]*'   # headword
    r'\s+'
    r'(?:'
        r'(?:tb\.\s+\S+\s+)?'         # optional variant marker like "tb. háche"
        r'(?:s\.|[$5]\.|v\.\s*[tiíí£]|adj\.|adv\.|sf\.|sí\.|interj\.|prep\.)'  # POS
        r'|Véase\b'                     # cross-reference
        r'|\[del\s'                     # sub-entry with etymology only
    r')',
    re.MULTILINE
)

# Column/page headers: a single word (no POS marker) on its own line,
# preceded and followed by blank lines. Also standalone page numbers.
COLUMN_HEADER = re.compile(
    r'\n[ \t]*\n'                       # blank line before
    r'([ \t]*(?:[A-ZÁÉÍÓÚa-záéíóúñ][\wáéíóúñ]*(?:\s+[\wáéíóúñ]+)?|[\d]+)[ \t]*)'  # single word/number
    r'\n[ \t]*\n',                      # blank line after
)

# Standalone page numbers (just digits on their own line)
PAGE_NUMBER = re.compile(r'^\s*\d{1,3}\s*$', re.MULTILINE)


def clean_page_text(text: str) -> str:
    """Remove column headers and page numbers from OCR page text.

    Column headers are standalone words at column boundaries that appear
    on their own line surrounded by blank lines. Page numbers are standalone
    numbers on their own line.
    """
    # Rejoin hyphenated words split across lines (e.g. "aín-\ntsan" -> "aíntsan")
    text = re.sub(r'-\n\s*([a-záéíóúñ])', r'\1', text)

    # Remove standalone page numbers (e.g. "88", "92")
    text = PAGE_NUMBER.sub('', text)

    # Remove column headers: single words surrounded by blank lines
    # that don't look like entry starts (no POS marker on same line)
    def replace_header(m):
        word = m.group(1).strip()
        # Keep it if it looks like it could be part of an entry
        # (has a POS marker nearby) - but standalone headers won't
        if ENTRY_START.match(word):
            return m.group(0)  # keep it
        return '\n\n'  # remove the header word, keep blank lines

    text = COLUMN_HEADER.sub(replace_header, text)

    return text


def split_ocr_into_entries(pages: dict) -> list[dict]:
    """Concatenate all OCR pages and split at headword boundaries.

    Args:
        pages: dict mapping page_num (str) -> OCR text

    Returns:
        List of {"text": str, "page_number": int} chunks, one per entry.
    """
    page_nums = sorted([int(p) for p in pages.keys()])

    # Build a list of (character_offset, page_number) to track which page
    # each character belongs to
    full_text = ""
    page_boundaries = []  # list of (start_offset, page_number)

    for page_num in page_nums:
        cleaned = clean_page_text(pages[str(page_num)])
        start = len(full_text)
        full_text += cleaned + "\n"
        page_boundaries.append((start, page_num))

    # Find all entry start positions
    matches = list(ENTRY_START.finditer(full_text))

    if not matches:
        # Fallback: return the whole text as one chunk
        return [{"text": full_text.strip(), "page_number": page_nums[0]}]

    # Split text at each match position
    chunks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        chunk_text = full_text[start:end].strip()

        if not chunk_text:
            continue

        # Determine page number for this chunk
        chunk_page = page_nums[0]
        for boundary_start, page_num in page_boundaries:
            if boundary_start <= start:
                chunk_page = page_num
            else:
                break

        chunks.append({"text": chunk_text, "page_number": chunk_page})

    return chunks


def parse_entry_with_claude(client, ocr_text: str, entry_idx: int) -> list[dict]:
    """Parse OCR text for one entry using Claude."""

    # Skip if text is too short to be a real entry
    if len(ocr_text.strip()) < 10:
        return []

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            messages=[{
                "role": "user",
                "content": PARSE_PROMPT.format(ocr_text=ocr_text)
            }]
        )

        response_text = response.content[0].text.strip()

        # Extract JSON from response (in case there's any wrapper text)
        if response_text.startswith('['):
            json_text = response_text
        else:
            # Try to find JSON array in response
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start >= 0 and end > start:
                json_text = response_text[start:end]
            else:
                print(f"  Warning: Could not find JSON in response for entry {entry_idx}")
                return []

        entries = json.loads(json_text)

        return entries

    except json.JSONDecodeError as e:
        print(f"  Warning: JSON parse error on entry {entry_idx}: {e}")
        return []
    except anthropic.APIError as e:
        print(f"  Warning: API error on entry {entry_idx}: {e}")
        return []


def main():
    data_dir = Path(__file__).parent.parent / 'data'

    # Determine input file
    if '--sample' in sys.argv:
        ocr_file = data_dir / 'ocr_sample.json'
        output_file = data_dir / 'entries_sample.json'
    elif '--section-a' in sys.argv:
        ocr_file = data_dir / 'ocr_section_a.json'
        output_file = data_dir / 'entries_section_a.json'
    else:
        ocr_file = data_dir / 'ocr_full.json'
        output_file = data_dir / 'entries.json'

    if not ocr_file.exists():
        print(f"OCR file not found: {ocr_file}")
        print("Run extract_ocr.py first")
        sys.exit(1)

    # Load OCR text
    print(f"Loading OCR text from {ocr_file}...")
    with open(ocr_file, 'r', encoding='utf-8') as f:
        pages = json.load(f)

    print(f"Loaded {len(pages)} pages")

    # Pre-split OCR into individual entry chunks
    print("Splitting OCR text into individual entries...")
    chunks = split_ocr_into_entries(pages)
    print(f"Found {len(chunks)} entry chunks")

    # Check for API key
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    client = anthropic.Anthropic()

    # Check for existing progress (resume support)
    progress_file = output_file.with_suffix('.progress.json')
    all_entries = []
    processed_indices = set()

    if progress_file.exists() and '--restart' not in sys.argv:
        print(f"Resuming from {progress_file}...")
        with open(progress_file, 'r', encoding='utf-8') as f:
            progress = json.load(f)
            all_entries = progress.get('entries', [])
            processed_indices = set(progress.get('processed_indices', []))
        print(f"  Already processed {len(processed_indices)} chunks, {len(all_entries)} entries")

    # Process each entry chunk
    total = len(chunks)

    for i, chunk in enumerate(chunks):
        if i in processed_indices:
            continue

        headword_preview = chunk['text'][:40].replace('\n', ' ')
        print(f"Processing chunk {i+1}/{total} (page {chunk['page_number']}): {headword_preview}...")

        entries = parse_entry_with_claude(client, chunk['text'], i)

        # Add page number to each entry
        for entry in entries:
            entry['page_number'] = chunk['page_number']

        all_entries.extend(entries)
        processed_indices.add(i)

        if entries:
            headwords = [e.get('headword', '?') for e in entries]
            print(f"  Parsed: {', '.join(headwords)}")
        else:
            print(f"  No entries parsed")

        # Save progress every 25 chunks
        if (i + 1) % 25 == 0:
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'entries': all_entries,
                    'processed_indices': list(processed_indices)
                }, f, ensure_ascii=False)
            print(f"  Progress saved ({len(all_entries)} total entries)")

        # Small delay to avoid rate limits
        time.sleep(0.1)

    # Save final output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Saved {len(all_entries)} entries to {output_file}")

    # Clean up progress file
    if progress_file.exists():
        progress_file.unlink()

    # Print sample entries
    print("\n=== Sample entries ===")
    for entry in all_entries[:5]:
        print(f"\nHeadword: {entry.get('headword')}")
        print(f"  POS: {entry.get('part_of_speech')}")
        etym = entry.get('etymology') or ''
        print(f"  Etymology: {etym[:50]}...")
        print(f"  Definitions: {entry.get('definitions_spanish', [])[:2]}")
        if entry.get('examples'):
            print(f"  Example: {entry['examples'][0]}")


if __name__ == '__main__':
    main()
