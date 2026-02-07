#!/usr/bin/env python3
"""
Import merged vocabulary into the app's entries.json.

Converts vocabulary_merged.json (from course extraction) into the same
format as entries.json (from the original dictionary OCR), then merges
them together. Existing dictionary entries are preserved; course vocabulary
is added for words not already in the dictionary.

For words that exist in both, the course meaning is added as a note
if it provides additional context.

Usage:
    python scripts/import_vocabulary.py
    python scripts/import_vocabulary.py --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SITE_DATA_DIR = ROOT / "site" / "data"


def normalize_headword(hw):
    """Normalize a headword for comparison."""
    return hw.lower().strip().replace("\u2014", "-")


def load_existing_entries():
    """Load the current entries.json."""
    path = SITE_DATA_DIR / "entries.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_merged_vocabulary():
    """Load the merged vocabulary from all courses."""
    path = DATA_DIR / "vocabulary_merged.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def vocab_to_entry(word, entry_id):
    """Convert a vocabulary word to entries.json format."""
    meaning = word.get("meaning") or ""
    pos = word.get("part_of_speech")
    context = word.get("context") or ""
    sources = word.get("sources", [])

    # Build source tag for attribution
    source_note = ""
    if sources:
        course_names = set()
        for s in sources:
            if s.startswith("basic_course:"):
                course_names.add("Koshinete Basic Course")
            elif s.startswith("foundation_course:"):
                course_names.add("Ayahuasca Foundation")
            elif s.startswith("icaro_course:"):
                course_names.add("Koshinete Icaro Course")
            else:
                course_names.add(s.split(":")[0] if ":" in s else s)
        source_note = "Source: " + ", ".join(sorted(course_names))

    entry = {
        "id": entry_id,
        "headword": word["shipibo"],
        "part_of_speech": pos,
        "variant_forms": [],
        "etymology": None,
        "scientific_name": None,
        "definitions_english": [meaning] if meaning else [],
        "definitions_spanish": [],
        "examples": [],
        "synonyms": [],
        "cross_references": [],
        "grammatical_notes": context if context else None,
        "page_number": 0,
        "source": source_note,
    }
    return entry


def suffix_to_entry(suffix, entry_id):
    """Convert a suffix to entries.json format."""
    meaning = suffix.get("meaning") or ""
    usage = suffix.get("usage") or ""
    examples = suffix.get("examples", [])

    full_meaning = meaning
    if usage and usage != meaning:
        full_meaning = f"{meaning} ({usage})" if meaning else usage

    entry = {
        "id": entry_id,
        "headword": suffix["form"],
        "part_of_speech": "suffix",
        "variant_forms": [],
        "etymology": None,
        "scientific_name": None,
        "definitions_english": [full_meaning] if full_meaning else [],
        "definitions_spanish": [],
        "examples": [],
        "synonyms": [],
        "cross_references": [],
        "grammatical_notes": "; ".join(examples) if examples else None,
        "page_number": 0,
        "source": "Course vocabulary",
    }
    return entry


def main():
    parser = argparse.ArgumentParser(description="Import vocabulary into entries.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    existing = load_existing_entries()
    vocab = load_merged_vocabulary()

    print(f"Existing entries: {len(existing)}")
    print(f"Vocabulary to import: {len(vocab['words'])} words, {len(vocab['suffixes'])} suffixes")

    # Build lookup of existing headwords
    existing_hw = {}
    for e in existing:
        hw = normalize_headword(e["headword"])
        existing_hw[hw] = e

    # Track what we add
    new_entries = []
    enriched = 0
    skipped_existing = 0
    next_id = max(e["id"] for e in existing) + 1

    # Process words
    for word in vocab["words"]:
        hw = normalize_headword(word["shipibo"])
        if not hw:
            continue

        if hw in existing_hw:
            # Word already exists in dictionary — check if we can enrich it
            entry = existing_hw[hw]
            course_meaning = word.get("meaning") or ""

            # If existing entry has no English definitions, add ours
            if not entry.get("definitions_english") and course_meaning:
                entry["definitions_english"] = [course_meaning]
                enriched += 1
            else:
                skipped_existing += 1
        else:
            # New word — add it
            entry = vocab_to_entry(word, next_id)
            new_entries.append(entry)
            existing_hw[hw] = entry
            next_id += 1

    # Process suffixes
    for suffix in vocab["suffixes"]:
        hw = normalize_headword(suffix["form"])
        if not hw:
            continue

        if hw in existing_hw:
            entry = existing_hw[hw]
            course_meaning = suffix.get("meaning") or ""
            if not entry.get("definitions_english") and course_meaning:
                usage = suffix.get("usage") or ""
                full = f"{course_meaning} ({usage})" if usage and usage != course_meaning else course_meaning
                entry["definitions_english"] = [full]
                enriched += 1
            else:
                skipped_existing += 1
        else:
            entry = suffix_to_entry(suffix, next_id)
            new_entries.append(entry)
            existing_hw[hw] = entry
            next_id += 1

    print(f"\nResults:")
    print(f"  New entries added: {len(new_entries)}")
    print(f"  Existing entries enriched (English defs added): {enriched}")
    print(f"  Already had definitions (skipped): {skipped_existing}")
    print(f"  Total entries: {len(existing) + len(new_entries)}")

    if args.dry_run:
        print("\n[Dry run — no files written]")
        # Show some samples
        print("\nSample new entries:")
        for e in new_entries[:10]:
            defs = e["definitions_english"][0][:60] if e["definitions_english"] else "?"
            print(f"  {e['headword']} ({e['part_of_speech']}): {defs}")
        return

    # Combine and sort
    all_entries = existing + new_entries
    all_entries.sort(key=lambda e: normalize_headword(e["headword"]))

    # Reassign IDs after sorting
    for i, e in enumerate(all_entries):
        e["id"] = i

    # Write output
    output_path = SITE_DATA_DIR / "entries.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {output_path} ({len(all_entries)} entries)")

    # Also save a backup
    backup_path = DATA_DIR / "entries_with_vocabulary.json"
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"Wrote backup {backup_path}")


if __name__ == "__main__":
    main()
