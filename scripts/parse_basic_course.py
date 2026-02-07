#!/usr/bin/env python3
"""
Parse vocabulary from Basic Course (Koshinete) raw text using Claude API.

For each PDF's extracted text, calls Claude to identify words, suffixes,
and prefixes with their definitions. Saves per-file results for resumability.

Usage:
    python scripts/parse_basic_course.py --module 1
    python scripts/parse_basic_course.py --module 1 --restart
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
import anthropic

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
PARSED_DIR = DATA_DIR / "basic_course_parsed"

load_dotenv(BASE_DIR / ".env")

PARSE_PROMPT = """You are extracting Shipibo language vocabulary from a Koshinete course PDF.

The PDF is from the Basic Course (Koshinete) — a Shipibo-Konibo language course focused on icaro (sacred healing song) composition. The filename is: {filename}

Extract ALL vocabulary items from this text. Include:

1. **Words**: Any Shipibo word with a definition or translation given
2. **Suffixes**: Any suffix (starts with -) with its meaning explained
3. **Prefixes**: Any prefix with its meaning explained

For each WORD, provide:
- "shipibo": the Shipibo word (lowercase, no suffixes attached unless that's the base form)
- "part_of_speech": one of "noun", "verb", "transitive verb", "intransitive verb", "adjective", "adverb", "pronoun", "conjunction", "interjection", "particle", or null if unclear
- "meaning": English definition/translation
- "context": brief note on how it's used in icaros or the lesson context (optional, omit if not relevant)

For each SUFFIX, provide:
- "form": the suffix with leading dash (e.g. "-ya")
- "meaning": what the suffix means/does
- "usage": grammatical category or usage note
- "examples": array of example words using this suffix (with translations if given)

For each PREFIX, provide:
- "form": the prefix with trailing dash if applicable
- "meaning": what it means/does
- "usage": grammatical note
- "examples": array of examples

Return a JSON object with this exact structure:
{{
  "words": [...],
  "suffixes": [...],
  "prefixes": [...]
}}

Important:
- Extract EVERY vocabulary item, even if it seems basic (greetings, pronouns, etc.)
- If the text is a writing exercise or icaro analysis, extract all words that are defined or glossed
- If a word appears multiple times with the same definition, include it only once
- If the text has very little extractable content, return empty arrays
- Return ONLY valid JSON, no other text

TEXT FROM PDF:
---
{text}
---

Return the JSON:"""


def parse_with_claude(client: anthropic.Anthropic, filename: str, text: str) -> dict:
    """Parse vocabulary from PDF text using Claude API."""
    if len(text.strip()) < 20:
        return {"words": [], "suffixes": [], "prefixes": []}

    prompt = PARSE_PROMPT.format(filename=filename, text=text)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Extract JSON from response
        if response_text.startswith("{"):
            json_text = response_text
        else:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start >= 0 and end > start:
                json_text = response_text[start:end]
            else:
                print(f"    Warning: No JSON found in response")
                return {"words": [], "suffixes": [], "prefixes": []}

        result = json.loads(json_text)

        # Ensure all keys exist
        result.setdefault("words", [])
        result.setdefault("suffixes", [])
        result.setdefault("prefixes", [])

        return result

    except json.JSONDecodeError as e:
        print(f"    Warning: JSON parse error: {e}")
        return {"words": [], "suffixes": [], "prefixes": []}
    except anthropic.APIError as e:
        print(f"    Warning: API error: {e}")
        return {"words": [], "suffixes": [], "prefixes": []}


def main():
    parser = argparse.ArgumentParser(description="Parse Basic Course vocabulary with Claude API")
    parser.add_argument("--module", type=int, required=True, choices=[1, 2, 3])
    parser.add_argument("--restart", action="store_true", help="Ignore cached per-file results")
    args = parser.parse_args()

    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY not set. Check .env file.")
        sys.exit(1)

    # Load raw text
    raw_file = DATA_DIR / f"basic_course_module{args.module}_raw.json"
    if not raw_file.exists():
        print(f"Raw text not found: {raw_file}")
        print(f"Run extract_basic_course.py --module {args.module} first")
        sys.exit(1)

    with open(raw_file, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    files = raw_data["files"]
    print(f"Parsing vocabulary from Module {args.module} ({len(files)} PDFs)...")

    # Ensure parsed output directory exists
    PARSED_DIR.mkdir(parents=True, exist_ok=True)

    client = anthropic.Anthropic()
    total_words = 0
    total_suffixes = 0
    total_prefixes = 0
    skipped = 0

    for i, file_entry in enumerate(files):
        filename = file_entry["filename"]
        section = file_entry["section"]
        text = file_entry["text"]

        # Check for cached result
        cache_file = PARSED_DIR / f"module{args.module}_{section}.json"
        if cache_file.exists() and not args.restart:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached = json.load(f)
            w = len(cached.get("words", []))
            s = len(cached.get("suffixes", []))
            p = len(cached.get("prefixes", []))
            total_words += w
            total_suffixes += s
            total_prefixes += p
            print(f"  [{i+1}/{len(files)}] {filename} (cached: {w}w {s}s {p}p)")
            continue

        print(f"  [{i+1}/{len(files)}] {filename} ({file_entry['char_count']} chars)")

        if file_entry["char_count"] < 20:
            print(f"    -> Skipping (too little text)")
            result = {"words": [], "suffixes": [], "prefixes": []}
            skipped += 1
        else:
            result = parse_with_claude(client, filename, text)
            time.sleep(0.2)  # Rate limiting

        # Add metadata
        result["filename"] = filename
        result["section"] = section
        result["module"] = args.module
        result["parsed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Save per-file result
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        w = len(result["words"])
        s = len(result["suffixes"])
        p = len(result["prefixes"])
        total_words += w
        total_suffixes += s
        total_prefixes += p

        if w or s or p:
            print(f"    -> {w} words, {s} suffixes, {p} prefixes")
            # Show a sample
            if result["words"]:
                sample = result["words"][0]
                print(f"       e.g. {sample.get('shipibo', '?')} = {sample.get('meaning', '?')[:60]}")
        else:
            print(f"    -> No vocabulary found")

    print(f"\nDone! Module {args.module} totals (before dedup):")
    print(f"  Words: {total_words}")
    print(f"  Suffixes: {total_suffixes}")
    print(f"  Prefixes: {total_prefixes}")
    print(f"  Skipped (no text): {skipped}")
    print(f"\nPer-file results saved in {PARSED_DIR}/")
    print(f"Run merge_basic_course.py --module {args.module} to deduplicate and produce final output.")


if __name__ == "__main__":
    main()
