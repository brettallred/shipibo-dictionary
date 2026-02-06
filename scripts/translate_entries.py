#!/usr/bin/env python3
"""
Step 3: Translate Spanish definitions to English using Claude API.
"""

import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
import anthropic

load_dotenv(Path(__file__).parent.parent / '.env')

TRANSLATE_PROMPT = """Translate this Shipibo dictionary entry from Spanish to English.

This is from a Shipibo (indigenous Amazonian language) dictionary.

Your task:
1. Add a new field "definitions_english" with English translations of "definitions_spanish"
2. In "examples", translate the "spanish" field to English
3. Translate any "grammatical_notes" to English
4. For flora/fauna terms, include scientific names in parentheses if you know them

Keep all other fields unchanged. Keep the original Spanish text in definitions_spanish.

Entry to translate:
{entry_json}

Return ONLY the JSON object with the added definitions_english field (no markdown, no explanation):"""


def translate_entry(client, entry: dict) -> dict:
    """Translate a single entry's Spanish content to English."""
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": TRANSLATE_PROMPT.format(entry_json=json.dumps(entry, ensure_ascii=False, indent=2))
            }]
        )

        text = response.content[0].text.strip()

        # Parse JSON response
        if text.startswith('{'):
            return json.loads(text)
        else:
            # Try to extract JSON
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])

        return entry  # Return original if parsing fails

    except Exception as e:
        print(f"  Error translating {entry.get('headword')}: {e}")
        return entry


def main():
    data_dir = Path(__file__).parent.parent / 'data'

    # Determine input/output files
    if '--section-a' in sys.argv or not (data_dir / 'entries.json').exists():
        input_file = data_dir / 'entries_section_a.json'
        output_file = data_dir / 'entries_section_a_translated.json'
    else:
        input_file = data_dir / 'entries.json'
        output_file = data_dir / 'entries_translated.json'

    if not input_file.exists():
        print(f"Input file not found: {input_file}")
        sys.exit(1)

    # Load entries
    print(f"Loading entries from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    print(f"Loaded {len(entries)} entries")

    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic()

    # Check for progress file
    progress_file = output_file.with_suffix('.progress.json')
    translated = []
    start_idx = 0

    if progress_file.exists() and '--restart' not in sys.argv:
        print(f"Resuming from {progress_file}...")
        with open(progress_file, 'r', encoding='utf-8') as f:
            progress = json.load(f)
            translated = progress.get('translated', [])
            start_idx = len(translated)
        print(f"  Already translated {start_idx} entries")

    # Translate each entry
    total = len(entries)
    for i, entry in enumerate(entries[start_idx:], start=start_idx):
        print(f"Translating {i+1}/{total}: {entry.get('headword', '?')}")

        translated_entry = translate_entry(client, entry)

        # Ensure original Spanish is preserved
        if 'definitions_spanish' not in translated_entry:
            translated_entry['definitions_spanish'] = entry.get('definitions_spanish', [])
        # Store original Spanish examples
        translated_entry['examples_original'] = entry.get('examples', [])

        translated.append(translated_entry)

        # Save progress every 20 entries
        if (i + 1) % 20 == 0:
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump({'translated': translated}, f, ensure_ascii=False)
            print(f"  Progress saved")

        time.sleep(0.05)  # Small delay

    # Save final output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Saved {len(translated)} translated entries to {output_file}")

    # Cleanup progress file
    if progress_file.exists():
        progress_file.unlink()

    # Show samples
    print("\n=== Sample translated entries ===")
    for entry in translated[:3]:
        print(f"\n{entry.get('headword')} ({entry.get('part_of_speech', '?')})")
        print(f"  Spanish: {entry.get('definitions_spanish', [])[:1]}")
        print(f"  English: {entry.get('definitions_english', [])[:1]}")


if __name__ == '__main__':
    main()
