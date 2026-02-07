#!/usr/bin/env python3
"""
Master merge: combine icaros and vocabulary from all courses with deduplication.

Sources:
  - icaro_course (Koshinete): 7 icaros with vocabulary + suffix references
  - foundation_course (Ayahuasca Foundation, Don Enrique): 20 icaros (no vocab yet)
  - basic_course (Koshinete): vocabulary + suffixes from lesson PDFs

Outputs:
  - data/icaros_merged.json — all icaros, deduplicated by title
  - site/data/icaros.json — same, deployed to site
  - data/vocabulary_merged.json — all vocabulary from every source, deduplicated

Usage:
    python scripts/merge_all.py
    python scripts/merge_all.py --dry-run   # show what would happen without writing
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SITE_DATA_DIR = ROOT / "site" / "data"


def normalize_title(title: str) -> str:
    """Normalize icaro title for dedup matching.

    Handles spelling variations like Nokon/Nocon, Tori/Torri,
    Tsoa/Sowa, etc.
    """
    t = title.lower().strip()
    # Normalize common spelling variations
    t = t.replace("nocon", "nokon")
    t = t.replace("torri", "tori")
    t = t.replace("sowa", "tsoa")
    t = t.replace("sowawa", "tsoawa")
    # Remove punctuation
    t = re.sub(r'[^a-záéíóúñ\s]', '', t)
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def load_icaro_course() -> list[dict]:
    """Load icaros from icaro_course (Koshinete)."""
    path = SITE_DATA_DIR / "icaros.json"
    if not path.exists():
        print(f"Warning: {path} not found")
        return []
    with open(path, "r", encoding="utf-8") as f:
        icaros = json.load(f)
    for ic in icaros:
        ic.setdefault("source", "icaro_course")
        ic.setdefault("teacher", "Koshinete (Macarena/Wexa Metsa)")
    return icaros


def load_foundation_course() -> list[dict]:
    """Load icaros from foundation_course (Ayahuasca Foundation, Don Enrique)."""
    path = DATA_DIR / "icaros_foundation.json"
    if not path.exists():
        print(f"Warning: {path} not found")
        return []
    with open(path, "r", encoding="utf-8") as f:
        icaros = json.load(f)
    for ic in icaros:
        ic["source"] = "foundation_course"
        ic["teacher"] = "Ayahuasca Foundation (Don Enrique)"
        # Remove old 'number' field if present
        ic.pop("number", None)
    return icaros


def load_basic_course_vocabulary() -> dict:
    """Load merged vocabulary from basic_course."""
    path = DATA_DIR / "basic_course_vocabulary.json"
    if not path.exists():
        print(f"Warning: {path} not found")
        return {"words": [], "suffixes": [], "prefixes": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_foundation_course_vocabulary() -> dict:
    """Load vocabulary extracted from foundation_course PDFs (vision API)."""
    path = DATA_DIR / "foundation_course_vocabulary.json"
    if not path.exists():
        print(f"Warning: {path} not found")
        return {"words": [], "suffixes": [], "prefixes": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def merge_icaros(icaro_course: list, foundation_course: list, dry_run: bool = False) -> list[dict]:
    """Merge icaros from both courses, deduplicating by title.

    When duplicates are found, the icaro_course version is preferred
    (it has vocabulary/suffix data), but we merge in any extra fields
    from the foundation version.
    """
    merged = []
    seen_titles = {}  # normalized_title -> index in merged

    # Add icaro_course first (preferred — has vocabulary)
    for ic in icaro_course:
        norm = normalize_title(ic["title"])
        idx = len(merged)
        seen_titles[norm] = idx
        merged.append(ic)

    # Add foundation_course, merging duplicates
    duplicates = []
    new_icaros = []

    for ic in foundation_course:
        norm = normalize_title(ic["title"])
        if norm in seen_titles:
            # Duplicate — merge extra fields into existing
            existing = merged[seen_titles[norm]]
            duplicates.append((existing["title"], ic["title"]))

            # Add foundation-specific fields if missing
            if ic.get("description") and not existing.get("description"):
                existing["description"] = ic["description"]
            if ic.get("note") and not existing.get("note"):
                existing["note"] = ic["note"]
            if ic.get("alternative_translation") and not existing.get("alternative_translation"):
                existing["alternative_translation"] = ic["alternative_translation"]

            # Track both sources
            if "also_in" not in existing:
                existing["also_in"] = []
            existing["also_in"].append(ic["source"])
        else:
            idx = len(merged)
            seen_titles[norm] = idx
            merged.append(ic)
            new_icaros.append(ic["title"])

    # Reassign sequential IDs
    for i, ic in enumerate(merged):
        ic["id"] = i + 1

    # Report
    print(f"\nIcaro merge results:")
    print(f"  icaro_course: {len(icaro_course)} icaros")
    print(f"  foundation_course: {len(foundation_course)} icaros")
    print(f"  Duplicates found: {len(duplicates)}")
    for existing_title, dup_title in duplicates:
        print(f"    '{existing_title}' == '{dup_title}'")
    print(f"  New from foundation: {len(new_icaros)}")
    for title in new_icaros:
        print(f"    + {title}")
    print(f"  Total merged: {len(merged)}")

    return merged


def extract_vocab_from_icaros(icaros: list) -> tuple[list, list]:
    """Extract vocabulary and suffixes from icaro data."""
    words = []
    suffixes = []

    for ic in icaros:
        source_tag = f"{ic.get('source', '?')}:{ic['title']}"

        for v in (ic.get("vocabulary") or []):
            words.append({
                "shipibo": v.get("shipibo", "").lower().strip(),
                "part_of_speech": v.get("pos"),
                "meaning": v.get("meaning", ""),
                "sources": [source_tag],
            })

        for s in (ic.get("suffix_reference") or []):
            suffixes.append({
                "form": s.get("form", "").lower().strip(),
                "meaning": s.get("meaning", ""),
                "usage": "",
                "examples": [],
                "sources": [source_tag],
            })

    return words, suffixes


POS_NORMALIZE = {
    "n": "noun", "n.": "noun", "s": "noun", "s.": "noun",
    "v": "verb", "v.": "verb",
    "v. t.": "transitive verb", "vt": "transitive verb",
    "v. i.": "intransitive verb", "vi": "intransitive verb",
    "adj": "adjective", "adj.": "adjective",
    "adv": "adverb", "adv.": "adverb",
    "pron": "pronoun", "pron.": "pronoun",
    "interj": "interjection", "interj.": "interjection",
    "conj": "conjunction", "conj.": "conjunction",
    "prep": "preposition", "prep.": "preposition",
    "sf": "suffix", "sf.": "suffix",
}


def normalize_pos(pos):
    """Normalize part of speech labels."""
    if not pos:
        return None
    return POS_NORMALIZE.get(pos.lower().strip(), pos.lower().strip())


def deduplicate_words(all_words: list[dict]) -> list[dict]:
    """Deduplicate words by shipibo form, merging source info."""
    seen = {}

    for word in all_words:
        key = word.get("shipibo", "").lower().strip()
        if not key:
            continue

        if key not in seen:
            entry = {
                "shipibo": key,
                "part_of_speech": normalize_pos(word.get("part_of_speech")),
                "meaning": word.get("meaning", ""),
                "sources": list(word.get("sources", [])),
            }
            if word.get("context"):
                entry["context"] = word["context"]
            seen[key] = entry
        else:
            existing = seen[key]
            for s in word.get("sources", []):
                if s not in existing["sources"]:
                    existing["sources"].append(s)
            new_meaning = word.get("meaning") or ""
            old_meaning = existing.get("meaning") or ""
            if len(new_meaning) > len(old_meaning):
                existing["meaning"] = new_meaning
            if word.get("context") and not existing.get("context"):
                existing["context"] = word["context"]
            if word.get("part_of_speech") and not existing.get("part_of_speech"):
                existing["part_of_speech"] = normalize_pos(word["part_of_speech"])

    return sorted(seen.values(), key=lambda w: w["shipibo"])


def deduplicate_suffixes(all_suffixes: list[dict]) -> list[dict]:
    """Deduplicate suffixes by form."""
    seen = {}

    for suffix in all_suffixes:
        key = suffix.get("form", "").lower().strip()
        if not key:
            continue

        if key not in seen:
            seen[key] = {
                "form": key,
                "meaning": suffix.get("meaning", ""),
                "usage": suffix.get("usage", ""),
                "examples": list(suffix.get("examples", [])),
                "sources": list(suffix.get("sources", [])),
            }
        else:
            existing = seen[key]
            for s in suffix.get("sources", []):
                if s not in existing["sources"]:
                    existing["sources"].append(s)
            for ex in suffix.get("examples", []):
                if ex not in existing["examples"]:
                    existing["examples"].append(ex)
            if len(suffix.get("meaning", "")) > len(existing.get("meaning", "")):
                existing["meaning"] = suffix["meaning"]
            if len(suffix.get("usage", "")) > len(existing.get("usage", "")):
                existing["usage"] = suffix["usage"]

    return sorted(seen.values(), key=lambda s: s["form"])


def main():
    parser = argparse.ArgumentParser(description="Merge all courses: icaros + vocabulary")
    parser.add_argument("--dry-run", action="store_true", help="Show results without writing files")
    args = parser.parse_args()

    print("Loading sources...")

    # Load icaros
    icaro_course = load_icaro_course()
    foundation_course = load_foundation_course()

    # Merge icaros with dedup
    merged_icaros = merge_icaros(icaro_course, foundation_course, args.dry_run)

    # Extract vocabulary from icaros
    icaro_words, icaro_suffixes = extract_vocab_from_icaros(merged_icaros)

    # Load basic_course vocabulary
    basic = load_basic_course_vocabulary()
    basic_words = []
    for w in basic.get("words", []):
        w["sources"] = [f"basic_course:{s}" for s in w.get("sources", [])]
        basic_words.append(w)
    basic_suffixes = []
    for s in basic.get("suffixes", []):
        s["sources"] = [f"basic_course:{src}" for src in s.get("sources", [])]
        basic_suffixes.append(s)

    # Load foundation_course vocabulary (from vision extraction)
    foundation = load_foundation_course_vocabulary()
    foundation_words = []
    for w in foundation.get("words", []):
        if "sources" not in w:
            w["sources"] = ["foundation_course"]
        else:
            w["sources"] = [f"foundation_course:{s}" for s in w["sources"]]
        foundation_words.append(w)
    foundation_suffixes = []
    for s in foundation.get("suffixes", []):
        if "sources" not in s:
            s["sources"] = ["foundation_course"]
        else:
            s["sources"] = [f"foundation_course:{src}" for src in s["sources"]]
        foundation_suffixes.append(s)

    # Merge all vocabulary
    all_words = icaro_words + basic_words + foundation_words
    all_suffixes = icaro_suffixes + basic_suffixes + foundation_suffixes

    words = deduplicate_words(all_words)
    suffixes = deduplicate_suffixes(all_suffixes)

    print(f"\nVocabulary merge results:")
    print(f"  From icaros: {len(icaro_words)} words, {len(icaro_suffixes)} suffixes")
    print(f"  From basic_course: {len(basic_words)} words, {len(basic_suffixes)} suffixes")
    print(f"  From foundation_course: {len(foundation_words)} words, {len(foundation_suffixes)} suffixes")
    print(f"  After dedup: {len(words)} words, {len(suffixes)} suffixes")

    # POS breakdown
    pos_counts = defaultdict(int)
    for w in words:
        pos = w.get("part_of_speech") or "unknown"
        pos_counts[pos] += 1
    print(f"\n  Part of Speech breakdown:")
    for pos, count in sorted(pos_counts.items(), key=lambda x: -x[1]):
        print(f"    {pos}: {count}")

    if args.dry_run:
        print("\n[Dry run — no files written]")
        return

    # Write merged icaros
    icaros_path = DATA_DIR / "icaros_merged.json"
    with open(icaros_path, "w", encoding="utf-8") as f:
        json.dump(merged_icaros, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {icaros_path}")

    # Write to site
    site_path = SITE_DATA_DIR / "icaros.json"
    with open(site_path, "w", encoding="utf-8") as f:
        json.dump(merged_icaros, f, ensure_ascii=False, indent=2)
    print(f"Wrote {site_path}")

    # Write merged vocabulary
    vocab_output = {
        "extracted_at": datetime.now().strftime("%Y-%m-%d"),
        "sources": ["icaro_course", "foundation_course", "basic_course"],
        "stats": {
            "total_words": len(words),
            "total_suffixes": len(suffixes),
            "from_icaros_words": len(icaro_words),
            "from_basic_course_words": len(basic_words),
            "from_foundation_course_words": len(foundation_words),
        },
        "words": words,
        "suffixes": suffixes,
    }
    vocab_path = DATA_DIR / "vocabulary_merged.json"
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump(vocab_output, f, ensure_ascii=False, indent=2)
    print(f"Wrote {vocab_path}")

    print(f"\nDone! {len(merged_icaros)} icaros, {len(words)} words, {len(suffixes)} suffixes")


if __name__ == "__main__":
    main()
