#!/usr/bin/env python3
"""Add phrase_idx to each song line in icaros.json by matching text.

Also fixes song line texts that are slightly different from their phrase counterpart.
Outputs to both data/icaros.json and site/data/icaros.json.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "icaros.json"
SITE_PATH = ROOT / "site" / "data" / "icaros.json"


def normalize(text):
    """Normalize text for fuzzy matching: lowercase, strip punctuation/spaces."""
    t = text.lower()
    t = re.sub(r"[,.\s\-\u2014]+", "", t)
    # Remove trailing ellipsis / "..." / "je" / "he" / "...o" suffixes for matching
    t = re.sub(r"\.{2,}[a-z]*$", "", t)
    return t


# Manual song-line text fixes: (icaro_id, old_text) -> new_text
# These make song lines display consistently with their phrase counterparts
TEXT_FIXES = {
    (1, "Yora pari abano"): "Yora pari abanon",
    (1, "Panayonparibano"): "Panayonparibanon",
    (1, "Kanobo ponteban"): "Kanobo pontebanon",
    (2, "Neska neska shamani"): "Neska neskashamani",
    (2, "Neska neska shamani ... je, he"): "Neska neskashamani jehe",
    (2, "Jakon nira kanoke"): "Jakonira kanoke",
    (2, "Jakon nira kanoke ... je, he"): "Jakonira kanoke jehe",
    (2, "Kano kibi kanota"): "Kanokibi kanota",
    (2, "Kano kibi kanota ... je, he"): "Kanokibi kanota jehe",
    (2, "Maanira bekani ... je, he"): "Maanira bekani jehe",
    (2, "Noki beiranira"): "Nokibeiranira",
    (2, "Kano kano shamani"): "Kano kanoshamani",
    (2, "Torrin ewa joyoya"): "Torin ewa joyoya",
    (5, "Nete kano niwebo...o"): "Nete kano niwebo",
}

# Manual phrase_idx overrides for lines that can't be fuzzy-matched
# (icaro_id, song_line_text_after_fix) -> phrase_idx
MANUAL_IDX = {
    (1, "Yora pari abanon"): 1,   # phrase is "Yonapari abanon" (different spacing)
    (1, "Neska, neska shamankin"): 8,  # exact match with comma, not p0
    (2, "Torin ewa joyoya"): 19,   # phrase is "Torrin ewa joyoya" (original has double r)
}


def find_phrase_idx(icaro, line_text):
    """Find the phrase index that matches a song line text."""
    norm_line = normalize(line_text)
    for pi, phrase in enumerate(icaro["phrases"]):
        norm_phrase = normalize(phrase["shipibo"])
        if norm_line == norm_phrase:
            return pi
    # Relaxed matching: check if one is a prefix of the other
    for pi, phrase in enumerate(icaro["phrases"]):
        norm_phrase = normalize(phrase["shipibo"])
        if norm_line.startswith(norm_phrase) or norm_phrase.startswith(norm_line):
            return pi
    return None


def link_icaros():
    with open(DATA_PATH) as f:
        data = json.load(f)

    for icaro in data:
        icaro_id = icaro["id"]
        phrases = icaro.get("phrases", [])
        if not phrases:
            continue

        # Track which phrase indices have been assigned per unique occurrence
        # For sequential matching: each song line maps to corresponding phrase
        phrase_cursor = 0  # Track sequential position for 1:1 icaros

        for section in icaro["song"]["sections"]:
            for line in section["lines"]:
                old_text = line["text"]

                # Apply text fix if one exists
                fix_key = (icaro_id, old_text)
                if fix_key in TEXT_FIXES:
                    line["text"] = TEXT_FIXES[fix_key]

                # Find matching phrase: try manual override first, then fuzzy match
                manual_key = (icaro_id, line["text"])
                if manual_key in MANUAL_IDX:
                    idx = MANUAL_IDX[manual_key]
                else:
                    idx = find_phrase_idx(icaro, line["text"])
                line["phrase_idx"] = idx

    # Verify all lines got assigned
    unmatched = []
    for icaro in data:
        for section in icaro["song"]["sections"]:
            for line in section["lines"]:
                if line["phrase_idx"] is None:
                    unmatched.append(f"  Icaro {icaro['id']}: {line['text']!r}")

    if unmatched:
        print("WARNING: Unmatched song lines:")
        for u in unmatched:
            print(u)
    else:
        print("All song lines matched successfully!")

    # Print summary
    for icaro in data:
        print(f"\nIcaro {icaro['id']}: {icaro['title']}")
        for si, section in enumerate(icaro["song"]["sections"]):
            for li, line in enumerate(section["lines"]):
                pi = line["phrase_idx"]
                phrase_text = icaro["phrases"][pi]["shipibo"] if pi is not None else "---"
                marker = " *FIXED*" if (icaro["id"], line["text"]) != (icaro["id"], line["text"]) else ""
                print(f"  s{si}l{li}: {line['text']!r:45s} -> p{pi}: {phrase_text!r}")

    # Write output
    output = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    DATA_PATH.write_text(output)
    SITE_PATH.write_text(output)
    print(f"\nWrote {DATA_PATH}")
    print(f"Wrote {SITE_PATH}")


if __name__ == "__main__":
    link_icaros()
