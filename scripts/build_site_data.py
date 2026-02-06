#!/usr/bin/env python3
"""Build static JSON data for the Shipibo Dictionary site."""

import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "site" / "data" / "entries.json"

# Input file priority: CLI arg > vision pipeline > old pipeline
_INPUT_CANDIDATES = [
    ROOT / "data" / "entries_vision.json",
    ROOT / "data" / "entries_vision_section_a.json",
    ROOT / "data" / "entries_section_a_translated.json",
]


def resolve_input():
    if len(sys.argv) > 1:
        p = Path(sys.argv[1])
        if not p.is_absolute():
            p = ROOT / p
        if not p.exists():
            print(f"Error: input file not found: {p}")
            sys.exit(1)
        return p
    for candidate in _INPUT_CANDIDATES:
        if candidate.exists():
            return candidate
    print("Error: no input file found. Run extract_vision.py first, or pass a path as argument.")
    sys.exit(1)


def strip_accents(s):
    return s.translate(str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU"))


def main():
    input_file = resolve_input()
    print(f"Input: {input_file}")
    entries = json.loads(input_file.read_text())
    print(f"Loaded {len(entries)} entries")

    # Filter out section B leakage (matching Rails import.rake logic)
    def is_section_b_leak(entry):
        hw = entry.get("headword", "")
        hw = unicodedata.normalize("NFKD", hw)
        hw = "".join(c for c in hw if not unicodedata.combining(c))
        hw = hw.lower().lstrip("-")
        return hw.startswith("b") and not any(x in hw for x in ("atsa", "atapa", "awa"))

    entries = [e for e in entries if not is_section_b_leak(e)]
    print(f"After filtering: {len(entries)} entries")

    result = []
    for i, entry in enumerate(entries):
        out = {
            "id": i,
            "headword": strip_accents(entry.get("headword", "")),
            "part_of_speech": entry.get("part_of_speech"),
            "variant_forms": entry.get("variant_forms", []),
            "etymology": entry.get("etymology"),
            "scientific_name": entry.get("scientific_name"),
            "definitions_spanish": entry.get("definitions_spanish", []),
            "definitions_english": entry.get("definitions_english", []),
            "examples": entry.get("examples", []),
            "synonyms": entry.get("synonyms", []),
            "cross_references": entry.get("cross_references", []),
            "grammatical_notes": entry.get("grammatical_notes"),
            "page_number": entry.get("page_number"),
        }
        result.append(out)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False))
    print(f"Wrote {len(result)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
