#!/usr/bin/env python3
"""Extract icaro JSON data from task output files and combine into a single array."""

import json
import re
import os

TASK_DIR = "/private/tmp/claude-501/-Users-brett-code-shipibo-dictionary/tasks"
OUTPUT_DATA = "/Users/brett/code/shipibo_dictionary/data/icaros.json"
OUTPUT_SITE = "/Users/brett/code/shipibo_dictionary/site/data/icaros.json"

# File definitions: (filename, line_index of assistant text, is_array)
FILES = [
    ("a4ae54f.output", 9, False),   # icaro 1
    ("aabc429.output", 10, False),  # icaro 2
    ("a415726.output", 9, False),   # icaro 3
    ("ad6e009.output", 32, True),   # icaros 4-7
]


def extract_json_from_text(text, is_array):
    """Extract JSON object or array from text that may contain markdown fences."""
    # Strip markdown code fences if present
    # Look for ```json ... ``` pattern
    match = re.search(r'```json\s*\n(.*?)```', text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
    else:
        # Try to find raw JSON - find first { or [
        if is_array:
            start = text.find('[')
        else:
            start = text.find('{')
        if start == -1:
            raise ValueError("No JSON found in text")
        json_str = text[start:].strip()
        # Remove trailing ``` if present
        if json_str.endswith('```'):
            json_str = json_str[:-3].strip()

    return json.loads(json_str)


def main():
    all_icaros = []

    for filename, line_idx, is_array in FILES:
        filepath = os.path.join(TASK_DIR, filename)
        print(f"Reading {filename}...")

        with open(filepath, 'r') as f:
            content = f.read()

        lines = content.strip().split('\n')
        obj = json.loads(lines[line_idx])

        # Find text block in assistant message
        msg_content = obj['message']['content']
        text_block = None
        for block in msg_content:
            if block.get('type') == 'text':
                text_block = block['text']

        if not text_block:
            raise ValueError(f"No text block found in {filename} at line {line_idx}")

        # Find the longest text block (for files with multiple text blocks, we want the one with JSON)
        # Actually re-scan all text blocks and pick the one containing JSON
        best_text = None
        for block in msg_content:
            if block.get('type') == 'text':
                t = block['text']
                if '"id"' in t and '"title"' in t:
                    best_text = t
                    break

        if best_text is None:
            best_text = text_block  # fallback

        data = extract_json_from_text(best_text, is_array)

        if is_array:
            print(f"  Extracted {len(data)} icaros (ids: {[d['id'] for d in data]})")
            all_icaros.extend(data)
        else:
            print(f"  Extracted icaro id={data['id']}, title=\"{data['title']}\"")
            all_icaros.append(data)

    # Sort by id
    all_icaros.sort(key=lambda x: x['id'])
    print(f"\nTotal icaros: {len(all_icaros)}")
    print(f"IDs: {[i['id'] for i in all_icaros]}")

    # Write output files
    for outpath in [OUTPUT_DATA, OUTPUT_SITE]:
        os.makedirs(os.path.dirname(outpath), exist_ok=True)
        with open(outpath, 'w') as f:
            json.dump(all_icaros, f, indent=2, ensure_ascii=False)
        print(f"Wrote {outpath}")


if __name__ == "__main__":
    main()
