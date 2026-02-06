#!/usr/bin/env python3
"""
Extract dictionary entries from PDF pages using Claude's vision API.

Replaces the 3-step pipeline (extract_ocr.py → parse_entries.py → translate_entries.py)
with a single script that sends page images directly to Claude, getting structured +
translated entries in one pass per page.
"""

import argparse
import base64
import io
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from queue import Queue
from threading import Thread

import pymupdf
from PIL import Image
from dotenv import load_dotenv
import anthropic

load_dotenv(Path(__file__).parent.parent / '.env')

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "shipibo.pdf"
DATA_DIR = ROOT / "data"

# Dictionary spans PDF pages 85–549 (1-indexed)
DICT_START = 85
DICT_END = 348

# Section A: pages 85–98
SECTION_A_START = 85
SECTION_A_END = 98

# Sample: first 3 pages
SAMPLE_START = 85
SAMPLE_END = 87

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
- scientific_name: for flora/fauna terms, the scientific (Latin) name if you know it, or null
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
- Read the page carefully — the text is in two columns, read left column fully then right column

Return the JSON array:"""


def extract_page_images_streaming(pdf_path, page_numbers, queue, zoom=2.0):
    """Extract page images as base64 PNGs, pushing each to a queue as it's ready.

    Sends (page_num, base64_string) tuples. Sends None as sentinel when done.
    """
    doc = pymupdf.open(str(pdf_path))
    for page_num in page_numbers:
        page_idx = page_num - 1  # Convert 1-indexed to 0-indexed
        if page_idx < 0 or page_idx >= len(doc):
            print(f"  Warning: page {page_num} out of range (PDF has {len(doc)} pages)")
            continue
        page = doc[page_idx]
        mat = pymupdf.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        queue.put((page_num, base64.standard_b64encode(buf.getvalue()).decode("utf-8")))
    doc.close()
    queue.put(None)  # sentinel


def process_page(client, page_num, img_b64, max_retries=5):
    """Send a page image to Claude vision API and return parsed entries.

    Retries on rate limit (429) errors with exponential backoff.
    """
    for attempt in range(max_retries + 1):
        t0 = time.time()
        try:
            response = client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=16384,
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

            elapsed = time.time() - t0
            response_text = response.content[0].text.strip()

            # Parse JSON from response
            if response_text.startswith('['):
                json_text = response_text
            else:
                start = response_text.find('[')
                end = response_text.rfind(']') + 1
                if start >= 0 and end > start:
                    json_text = response_text[start:end]
                else:
                    print(f"  Page {page_num}: Could not find JSON in response ({elapsed:.1f}s)")
                    return page_num, [], elapsed

            entries = json.loads(json_text)

            # Add page_number to each entry
            for entry in entries:
                entry['page_number'] = page_num

            tokens_in = response.usage.input_tokens
            tokens_out = response.usage.output_tokens
            print(f"  Page {page_num}: {len(entries)} entries ({elapsed:.1f}s, {tokens_in}+{tokens_out} tokens)")
            return page_num, entries, elapsed

        except json.JSONDecodeError as e:
            elapsed = time.time() - t0
            print(f"  Page {page_num}: JSON parse error ({elapsed:.1f}s): {e}")
            return page_num, [], elapsed
        except anthropic.RateLimitError:
            wait = 30 * (2 ** attempt)  # 30s, 60s, 120s, 240s, 480s
            print(f"  Page {page_num}: rate limited, waiting {wait}s (attempt {attempt + 1}/{max_retries + 1})")
            time.sleep(wait)
        except anthropic.APIError as e:
            elapsed = time.time() - t0
            print(f"  Page {page_num}: API error ({elapsed:.1f}s): {e}")
            return page_num, [], elapsed

    # All retries exhausted
    print(f"  Page {page_num}: failed after {max_retries + 1} attempts")
    return page_num, [], 0


def load_progress(progress_file):
    """Load progress from a previous run. Returns set of completed page numbers and entries."""
    if not progress_file.exists():
        return set(), []
    with open(progress_file, 'r', encoding='utf-8') as f:
        progress = json.load(f)
    return set(progress.get('completed_pages', [])), progress.get('entries', [])


def save_progress(progress_file, completed_pages, entries):
    """Save progress to disk."""
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump({
            'completed_pages': sorted(completed_pages),
            'entries': entries,
        }, f, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Extract Shipibo dictionary entries from PDF using Claude vision API"
    )
    parser.add_argument('--sample', action='store_true',
                        help=f'Process 3 sample pages ({SAMPLE_START}-{SAMPLE_END})')
    parser.add_argument('--section-a', action='store_true',
                        help=f'Process section A pages ({SECTION_A_START}-{SECTION_A_END})')
    parser.add_argument('--start', type=int, default=None,
                        help='Start page number (1-indexed PDF page)')
    parser.add_argument('--end', type=int, default=None,
                        help='End page number (1-indexed PDF page, inclusive)')
    parser.add_argument('--workers', type=int, default=5,
                        help='Number of concurrent API workers (default: 5)')
    parser.add_argument('--force', action='store_true',
                        help='Overwrite existing output file')
    parser.add_argument('--restart', action='store_true',
                        help='Ignore progress file and start fresh')
    parser.add_argument('--output', type=str, default=None,
                        help='Output file path (default: auto-determined)')
    args = parser.parse_args()

    # Determine page range
    if args.sample:
        start_page, end_page = SAMPLE_START, SAMPLE_END
        default_output = DATA_DIR / 'entries_vision_sample.json'
    elif args.section_a:
        start_page, end_page = SECTION_A_START, SECTION_A_END
        default_output = DATA_DIR / 'entries_vision_section_a.json'
    elif args.start is not None or args.end is not None:
        start_page = args.start or DICT_START
        end_page = args.end or DICT_END
        default_output = DATA_DIR / f'entries_vision_p{start_page}-{end_page}.json'
    else:
        start_page, end_page = DICT_START, DICT_END
        default_output = DATA_DIR / 'entries_vision.json'

    output_file = Path(args.output) if args.output else default_output
    progress_file = output_file.with_suffix('.progress.json')
    page_numbers = list(range(start_page, end_page + 1))

    print(f"Shipibo Dictionary Vision Extraction")
    print(f"  Pages: {start_page}–{end_page} ({len(page_numbers)} pages)")
    print(f"  Output: {output_file}")
    print(f"  Workers: {args.workers}")

    # Check for existing output
    if output_file.exists() and not args.force:
        print(f"\nOutput file already exists: {output_file}")
        print("Use --force to overwrite or --restart to ignore progress")
        sys.exit(1)

    # Check API key
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("\nError: ANTHROPIC_API_KEY not set (check .env file)")
        sys.exit(1)

    # Load progress
    completed_pages, existing_entries = set(), []
    if not args.restart:
        completed_pages, existing_entries = load_progress(progress_file)
        if completed_pages:
            print(f"  Resuming: {len(completed_pages)} pages already done, {len(existing_entries)} entries")

    remaining_pages = [p for p in page_numbers if p not in completed_pages]
    if not remaining_pages:
        print("\nAll pages already processed!")
        # Write final output from progress
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(existing_entries, f, ensure_ascii=False, indent=2)
        print(f"Wrote {len(existing_entries)} entries to {output_file}")
        if progress_file.exists():
            progress_file.unlink()
        return

    # Process pages with Claude vision API (concurrent)
    # Images are extracted in a background thread and streamed to API workers
    client = anthropic.Anthropic()
    all_entries = list(existing_entries)
    total_pages = len(page_numbers)
    done_count = len(completed_pages)

    image_queue = Queue(maxsize=args.workers * 2)  # bound memory usage
    producer = Thread(
        target=extract_page_images_streaming,
        args=(PDF_PATH, remaining_pages, image_queue),
        daemon=True,
    )

    print(f"\nProcessing {len(remaining_pages)} pages with Claude vision API...")
    t0 = time.time()
    producer.start()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {}
        images_done = False

        while not images_done or futures:
            # Submit new work from the image queue
            while not images_done and len(futures) < args.workers:
                item = image_queue.get()
                if item is None:
                    images_done = True
                    break
                page_num, img_b64 = item
                future = executor.submit(process_page, client, page_num, img_b64)
                futures[future] = page_num

            # Collect completed results
            done_futures = [f for f in futures if f.done()]
            if not done_futures and futures:
                # Wait for at least one to finish
                next(as_completed(futures))
                done_futures = [f for f in futures if f.done()]

            for future in done_futures:
                del futures[future]
                page_num, entries, elapsed = future.result()
                all_entries.extend(entries)
                completed_pages.add(page_num)
                done_count += 1

                # Save progress every 5 pages or on the last page
                pages_left = total_pages - done_count
                if done_count % 5 == 0 or pages_left == 0:
                    save_progress(progress_file, completed_pages, all_entries)

                if pages_left > 0:
                    print(f"  Progress: {done_count}/{total_pages} pages ({pages_left} remaining)")

    producer.join()

    total_time = time.time() - t0
    print(f"\nAPI processing complete in {total_time:.1f}s")

    # Sort entries by page number, then by headword within each page
    all_entries.sort(key=lambda e: (e.get('page_number', 0), e.get('headword', '')))

    # Write final output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    # Clean up progress file
    if progress_file.exists():
        progress_file.unlink()

    # Summary
    headwords = [e.get('headword', '?') for e in all_entries]
    print(f"\nDone! Saved {len(all_entries)} entries to {output_file}")
    print(f"  Pages processed: {len(completed_pages)}")
    print(f"  Total time: {total_time:.1f}s")
    print(f"  Avg per page: {total_time / max(len(remaining_pages), 1):.1f}s")

    # Show sample entries
    print(f"\n=== Sample entries ===")
    for entry in all_entries[:5]:
        hw = entry.get('headword', '?')
        pos = entry.get('part_of_speech', '?')
        esp = entry.get('definitions_spanish', [])
        eng = entry.get('definitions_english', [])
        print(f"\n  {hw} ({pos}) [page {entry.get('page_number')}]")
        print(f"    ES: {esp[:2]}")
        print(f"    EN: {eng[:2]}")


if __name__ == '__main__':
    main()
