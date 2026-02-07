#!/usr/bin/env python3
"""
Merge Koshinete icaros (existing) with Ayahuasca Foundation icaros (Don Enrique).

Adds source/description/note fields to all icaros, assigns sequential IDs,
and writes merged output to both data/icaros.json and site/data/icaros.json.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SITE_DATA_DIR = ROOT / "site" / "data"


def main():
    # Load existing Koshi Nete icaros
    koshi_path = DATA_DIR / "icaros.json"
    with open(koshi_path, 'r', encoding='utf-8') as f:
        koshi_icaros = json.load(f)

    print(f"Loaded {len(koshi_icaros)} Koshi Nete icaros")

    # Load Ayahuasca Foundation icaros
    af_path = DATA_DIR / "icaros_foundation.json"
    with open(af_path, 'r', encoding='utf-8') as f:
        af_icaros = json.load(f)

    print(f"Loaded {len(af_icaros)} Ayahuasca Foundation icaros")

    # Add source fields to Koshi Nete icaros (keep existing IDs 1-7)
    for icaro in koshi_icaros:
        icaro['source'] = 'Koshi Nete'
        icaro['description'] = None
        icaro['note'] = None
        icaro['alternative_translation'] = None

    # Assign IDs to AF icaros (8-27)
    merged = list(koshi_icaros)
    for i, icaro in enumerate(af_icaros):
        icaro['id'] = len(koshi_icaros) + i + 1
        icaro['source'] = 'Ayahuasca Foundation'
        # Remove the 'number' field (was just for reference)
        icaro.pop('number', None)
        merged.append(icaro)

    print(f"Merged: {len(merged)} total icaros")

    # Write to data/icaros.json
    with open(koshi_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"Wrote {koshi_path}")

    # Write to site/data/icaros.json
    site_path = SITE_DATA_DIR / "icaros.json"
    with open(site_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"Wrote {site_path}")

    # Summary
    sources = {}
    for ic in merged:
        src = ic.get('source', 'unknown')
        sources[src] = sources.get(src, 0) + 1
    for src, count in sources.items():
        print(f"  {src}: {count} icaros")


if __name__ == '__main__':
    main()
