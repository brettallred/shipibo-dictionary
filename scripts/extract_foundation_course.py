#!/usr/bin/env python3
"""
Extract vocabulary and icaros from foundation_course PDFs using Claude vision.

The foundation_course PDFs (Ayahuasca Foundation, Don Enrique) are image-based,
so we render pages as images and send them to Claude's vision API.

Usage:
    python scripts/extract_foundation_course.py
    python scripts/extract_foundation_course.py --restart  # ignore cache
"""

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import pymupdf
from dotenv import load_dotenv
import anthropic

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
COURSE_DIR = BASE_DIR / "courses" / "foundation_course"
CACHE_DIR = DATA_DIR / "foundation_course_parsed"

load_dotenv(BASE_DIR / ".env")

VOCAB_PROMPT = """You are extracting Shipibo-Konibo language vocabulary from a course PDF page.

This is from the Ayahuasca Foundation course (Don Enrique). The page may contain:
- A vocabulary/dictionary table with Shipibo words and English meanings
- Icaro lyrics with translations
- Suffix/prefix explanations
- Grammar notes

Extract ALL vocabulary items visible on this page:

1. **Words**: Any Shipibo word with a definition or translation
2. **Suffixes**: Any suffix (starts with -) with its meaning
3. **Prefixes**: Any prefix with its meaning

For each WORD:
- "shipibo": the word (lowercase)
- "part_of_speech": "noun", "verb", "transitive verb", "intransitive verb", "adjective", "adverb", "pronoun", "conjunction", "interjection", "particle", or null
- "meaning": English definition

For each SUFFIX:
- "form": with leading dash (e.g. "-ya")
- "meaning": what it does
- "usage": grammatical note
- "examples": array of example words

For each PREFIX:
- "form": the prefix
- "meaning": what it does
- "usage": grammatical note
- "examples": array of examples

Return JSON:
{{
  "words": [...],
  "suffixes": [...],
  "prefixes": [],
  "page_description": "brief description of what this page contains"
}}

If the page has no extractable vocabulary (e.g. it's a cover page, image-only art, etc.), return empty arrays.
Return ONLY valid JSON."""


def render_page_to_base64(doc, page_num: int, zoom: float = 2.0) -> str:
    """Render a PDF page to a base64-encoded PNG."""
    page = doc[page_num]
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    png_bytes = pix.tobytes("png")
    return base64.standard_b64encode(png_bytes).decode("utf-8")


def parse_page_with_vision(client: anthropic.Anthropic, image_b64: str, pdf_name: str, page_num: int) -> dict:
    """Send a page image to Claude vision API for vocabulary extraction."""
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": VOCAB_PROMPT,
                    },
                ],
            }],
        )

        response_text = response.content[0].text.strip()

        if response_text.startswith("{"):
            json_text = response_text
        else:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start >= 0 and end > start:
                json_text = response_text[start:end]
            else:
                print(f"    Warning: No JSON in response for {pdf_name} p{page_num}")
                return {"words": [], "suffixes": [], "prefixes": []}

        result = json.loads(json_text)
        result.setdefault("words", [])
        result.setdefault("suffixes", [])
        result.setdefault("prefixes", [])
        return result

    except json.JSONDecodeError as e:
        print(f"    Warning: JSON parse error for {pdf_name} p{page_num}: {e}")
        return {"words": [], "suffixes": [], "prefixes": []}
    except anthropic.APIError as e:
        print(f"    Warning: API error for {pdf_name} p{page_num}: {e}")
        return {"words": [], "suffixes": [], "prefixes": []}


def process_pdf(client: anthropic.Anthropic, pdf_path: Path, restart: bool = False):
    """Process all pages of a PDF through vision API."""
    pdf_name = pdf_path.stem
    doc = pymupdf.open(str(pdf_path))
    num_pages = len(doc)

    print(f"\nProcessing {pdf_path.name} ({num_pages} pages)...")

    all_results = []

    for page_num in range(num_pages):
        cache_file = CACHE_DIR / f"{pdf_name}_page{page_num + 1}.json"

        if cache_file.exists() and not restart:
            with open(cache_file, "r", encoding="utf-8") as f:
                result = json.load(f)
            w = len(result.get("words", []))
            s = len(result.get("suffixes", []))
            p = len(result.get("prefixes", []))
            desc = result.get("page_description", "")[:50]
            print(f"  Page {page_num + 1}/{num_pages} (cached: {w}w {s}s {p}p) {desc}")
            all_results.append(result)
            continue

        print(f"  Page {page_num + 1}/{num_pages}...", end=" ", flush=True)

        image_b64 = render_page_to_base64(doc, page_num)
        result = parse_page_with_vision(client, image_b64, pdf_name, page_num + 1)

        result["pdf"] = pdf_path.name
        result["page"] = page_num + 1
        result["parsed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        w = len(result.get("words", []))
        s = len(result.get("suffixes", []))
        p = len(result.get("prefixes", []))
        desc = result.get("page_description", "")[:50]
        print(f"{w}w {s}s {p}p — {desc}")

        all_results.append(result)
        time.sleep(0.3)

    doc.close()
    return all_results


def main():
    parser = argparse.ArgumentParser(description="Extract foundation course vocabulary via vision")
    parser.add_argument("--restart", action="store_true", help="Ignore cached results")
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY not set. Check .env file.")
        sys.exit(1)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    client = anthropic.Anthropic()

    pdfs = [
        COURSE_DIR / "dictionary.pdf",
        COURSE_DIR / "icaros.pdf",
    ]

    all_words = []
    all_suffixes = []
    all_prefixes = []

    for pdf_path in pdfs:
        if not pdf_path.exists():
            print(f"Warning: {pdf_path} not found, skipping")
            continue

        results = process_pdf(client, pdf_path, args.restart)

        for r in results:
            source_tag = f"{pdf_path.stem}:p{r.get('page', '?')}"
            for w in r.get("words", []):
                w.setdefault("sources", [source_tag])
                all_words.append(w)
            for s in r.get("suffixes", []):
                s.setdefault("sources", [source_tag])
                all_suffixes.append(s)
            for p in r.get("prefixes", []):
                p.setdefault("sources", [source_tag])
                all_prefixes.append(p)

    # Save combined output
    output = {
        "source": "foundation_course",
        "teacher": "Ayahuasca Foundation (Don Enrique)",
        "extracted_at": datetime.now().strftime("%Y-%m-%d"),
        "stats": {
            "total_words_raw": len(all_words),
            "total_suffixes_raw": len(all_suffixes),
            "total_prefixes_raw": len(all_prefixes),
        },
        "words": all_words,
        "suffixes": all_suffixes,
        "prefixes": all_prefixes,
    }

    output_file = DATA_DIR / "foundation_course_vocabulary.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved: {output_file}")
    print(f"  Words: {len(all_words)}")
    print(f"  Suffixes: {len(all_suffixes)}")
    print(f"  Prefixes: {len(all_prefixes)}")


if __name__ == "__main__":
    main()
