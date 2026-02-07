#!/usr/bin/env python3
"""
Step 3: Merge and deduplicate parsed Course 2 vocabulary into module-level output.

Combines per-file parsed results, deduplicates words and suffixes,
and produces the final module vocabulary JSON.

Usage:
    python scripts/merge_course2.py --module 1
    python scripts/merge_course2.py --module 1 --module 2 --module 3  # merge all
    python scripts/merge_course2.py --all  # merge all modules into one file
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
PARSED_DIR = DATA_DIR / "course_2_parsed"


def load_parsed_files(module: int) -> list[dict]:
    """Load all parsed per-file results for a module."""
    pattern = f"module{module}_*.json"
    files = sorted(PARSED_DIR.glob(pattern))
    results = []
    for f in files:
        with open(f, "r", encoding="utf-8") as fh:
            results.append(json.load(fh))
    return results


def deduplicate_words(all_words: list[dict]) -> list[dict]:
    """Deduplicate words by shipibo form, merging source info."""
    seen = {}  # key: lowercase shipibo -> merged entry

    for word in all_words:
        key = word.get("shipibo", "").lower().strip()
        if not key:
            continue

        if key not in seen:
            # Normalize and store
            entry = {
                "shipibo": key,
                "part_of_speech": word.get("part_of_speech"),
                "meaning": word.get("meaning", ""),
                "sources": list(word.get("sources", [])),
            }
            if word.get("context"):
                entry["context"] = word["context"]
            seen[key] = entry
        else:
            # Merge: combine sources, keep longer meaning
            existing = seen[key]
            new_sources = word.get("sources", [])
            for s in new_sources:
                if s not in existing["sources"]:
                    existing["sources"].append(s)

            # Keep the longer/more detailed meaning
            new_meaning = word.get("meaning", "")
            if len(new_meaning) > len(existing.get("meaning", "")):
                existing["meaning"] = new_meaning

            # Keep context if we didn't have one
            if word.get("context") and not existing.get("context"):
                existing["context"] = word["context"]

            # Prefer a non-null POS
            if word.get("part_of_speech") and not existing.get("part_of_speech"):
                existing["part_of_speech"] = word["part_of_speech"]

    return sorted(seen.values(), key=lambda w: w["shipibo"])


def deduplicate_suffixes(all_suffixes: list[dict]) -> list[dict]:
    """Deduplicate suffixes by form, merging examples and sources."""
    seen = {}

    for suffix in all_suffixes:
        key = suffix.get("form", "").lower().strip()
        if not key:
            continue

        if key not in seen:
            entry = {
                "form": key,
                "meaning": suffix.get("meaning", ""),
                "usage": suffix.get("usage", ""),
                "examples": list(suffix.get("examples", [])),
                "sources": list(suffix.get("sources", [])),
            }
            seen[key] = entry
        else:
            existing = seen[key]
            # Merge sources
            for s in suffix.get("sources", []):
                if s not in existing["sources"]:
                    existing["sources"].append(s)
            # Merge examples (deduplicate)
            for ex in suffix.get("examples", []):
                if ex not in existing["examples"]:
                    existing["examples"].append(ex)
            # Keep longer meaning
            if len(suffix.get("meaning", "")) > len(existing.get("meaning", "")):
                existing["meaning"] = suffix["meaning"]
            # Keep longer usage
            if len(suffix.get("usage", "")) > len(existing.get("usage", "")):
                existing["usage"] = suffix["usage"]

    return sorted(seen.values(), key=lambda s: s["form"])


def deduplicate_prefixes(all_prefixes: list[dict]) -> list[dict]:
    """Deduplicate prefixes by form."""
    seen = {}

    for prefix in all_prefixes:
        key = prefix.get("form", "").lower().strip()
        if not key:
            continue

        if key not in seen:
            entry = {
                "form": key,
                "meaning": prefix.get("meaning", ""),
                "usage": prefix.get("usage", ""),
                "examples": list(prefix.get("examples", [])),
                "sources": list(prefix.get("sources", [])),
            }
            seen[key] = entry
        else:
            existing = seen[key]
            for s in prefix.get("sources", []):
                if s not in existing["sources"]:
                    existing["sources"].append(s)
            for ex in prefix.get("examples", []):
                if ex not in existing["examples"]:
                    existing["examples"].append(ex)
            if len(prefix.get("meaning", "")) > len(existing.get("meaning", "")):
                existing["meaning"] = prefix["meaning"]

    return sorted(seen.values(), key=lambda p: p["form"])


def merge_module(module: int) -> dict:
    """Merge all parsed files for a module into a single deduplicated output."""
    parsed_files = load_parsed_files(module)
    if not parsed_files:
        print(f"No parsed files found for Module {module}")
        return None

    all_words = []
    all_suffixes = []
    all_prefixes = []

    for pf in parsed_files:
        section = pf.get("section", "?")
        for w in pf.get("words", []):
            if "sources" not in w:
                w["sources"] = [section]
            all_words.append(w)
        for s in pf.get("suffixes", []):
            if "sources" not in s:
                s["sources"] = [section]
            all_suffixes.append(s)
        for p in pf.get("prefixes", []):
            if "sources" not in p:
                p["sources"] = [section]
            all_prefixes.append(p)

    words = deduplicate_words(all_words)
    suffixes = deduplicate_suffixes(all_suffixes)
    prefixes = deduplicate_prefixes(all_prefixes)

    return {
        "source": "course_2",
        "module": module,
        "extracted_at": datetime.now().strftime("%Y-%m-%d"),
        "stats": {
            "files_parsed": len(parsed_files),
            "words_before_dedup": len(all_words),
            "words_after_dedup": len(words),
            "suffixes_before_dedup": len(all_suffixes),
            "suffixes_after_dedup": len(suffixes),
            "prefixes_before_dedup": len(all_prefixes),
            "prefixes_after_dedup": len(prefixes),
        },
        "words": words,
        "suffixes": suffixes,
        "prefixes": prefixes,
    }


def print_summary(data: dict):
    """Print summary stats for a merged module."""
    stats = data["stats"]
    module = data["module"]

    print(f"\n{'='*60}")
    print(f"Module {module} Summary")
    print(f"{'='*60}")
    print(f"  Files parsed: {stats['files_parsed']}")
    print(f"  Words: {stats['words_after_dedup']} (from {stats['words_before_dedup']} raw)")
    print(f"  Suffixes: {stats['suffixes_after_dedup']} (from {stats['suffixes_before_dedup']} raw)")
    print(f"  Prefixes: {stats['prefixes_after_dedup']} (from {stats['prefixes_before_dedup']} raw)")

    # POS breakdown
    pos_counts = defaultdict(int)
    for w in data["words"]:
        pos = w.get("part_of_speech") or "unknown"
        pos_counts[pos] += 1

    print(f"\n  Part of Speech breakdown:")
    for pos, count in sorted(pos_counts.items(), key=lambda x: -x[1]):
        print(f"    {pos}: {count}")

    # Sample words
    print(f"\n  Sample words:")
    for w in data["words"][:10]:
        meaning = w.get("meaning", "")[:50]
        print(f"    {w['shipibo']} ({w.get('part_of_speech', '?')}): {meaning}")

    # Sample suffixes
    if data["suffixes"]:
        print(f"\n  Sample suffixes:")
        for s in data["suffixes"][:5]:
            meaning = s.get("meaning", "")[:50]
            print(f"    {s['form']}: {meaning}")


def main():
    parser = argparse.ArgumentParser(description="Merge and deduplicate Course 2 vocabulary")
    parser.add_argument("--module", type=int, action="append", choices=[1, 2, 3],
                        help="Module(s) to merge (can specify multiple)")
    parser.add_argument("--all", action="store_true", help="Merge all 3 modules into one file")
    args = parser.parse_args()

    if args.all:
        modules = [1, 2, 3]
    elif args.module:
        modules = args.module
    else:
        print("Specify --module N or --all")
        sys.exit(1)

    for module in modules:
        data = merge_module(module)
        if data is None:
            continue

        output_file = DATA_DIR / f"course_2_module{module}_vocabulary.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"Saved: {output_file}")
        print_summary(data)

    # If merging all, also create combined file
    if args.all:
        all_words = []
        all_suffixes = []
        all_prefixes = []
        total_files = 0

        for module in [1, 2, 3]:
            mod_file = DATA_DIR / f"course_2_module{module}_vocabulary.json"
            if not mod_file.exists():
                print(f"Warning: {mod_file} not found, skipping")
                continue
            with open(mod_file, "r", encoding="utf-8") as f:
                mod_data = json.load(f)
            # Tag sources with module prefix
            for w in mod_data["words"]:
                w["sources"] = [f"M{module}:{s}" for s in w.get("sources", [])]
                all_words.append(w)
            for s in mod_data["suffixes"]:
                s["sources"] = [f"M{module}:{src}" for src in s.get("sources", [])]
                all_suffixes.append(s)
            for p in mod_data["prefixes"]:
                p["sources"] = [f"M{module}:{src}" for src in p.get("sources", [])]
                all_prefixes.append(p)
            total_files += mod_data["stats"]["files_parsed"]

        words = deduplicate_words(all_words)
        suffixes = deduplicate_suffixes(all_suffixes)
        prefixes = deduplicate_prefixes(all_prefixes)

        combined = {
            "source": "course_2",
            "module": "all",
            "extracted_at": datetime.now().strftime("%Y-%m-%d"),
            "stats": {
                "files_parsed": total_files,
                "words_before_dedup": len(all_words),
                "words_after_dedup": len(words),
                "suffixes_before_dedup": len(all_suffixes),
                "suffixes_after_dedup": len(suffixes),
                "prefixes_before_dedup": len(all_prefixes),
                "prefixes_after_dedup": len(prefixes),
            },
            "words": words,
            "suffixes": suffixes,
            "prefixes": prefixes,
        }

        combined_file = DATA_DIR / "course_2_vocabulary.json"
        with open(combined_file, "w", encoding="utf-8") as f:
            json.dump(combined, f, ensure_ascii=False, indent=2)

        print(f"\nSaved combined: {combined_file}")
        print_summary(combined)


if __name__ == "__main__":
    main()
