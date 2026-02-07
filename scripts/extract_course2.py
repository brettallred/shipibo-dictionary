#!/usr/bin/env python3
"""
Step 1: Extract raw text from Course 2 PDFs using pdftotext.

Usage:
    python scripts/extract_course2.py --module 1
    python scripts/extract_course2.py --module 2
    python scripts/extract_course2.py --module 3
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
COURSE_DIR = DATA_DIR / "course_2"

MODULE_DIRS = {
    1: COURSE_DIR / "Module 1",
    2: COURSE_DIR / "Module 2",
    3: COURSE_DIR / "Module 3",
}


def extract_text(pdf_path: Path) -> str:
    """Extract text from a PDF using pdftotext."""
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True, text=True, timeout=30
        )
        return result.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  Error extracting {pdf_path.name}: {e}")
        return ""


def get_section_number(filename: str) -> str:
    """Extract section number like '2.3' from filename like '2.3-Ways to Describe...'."""
    parts = filename.split("-", 1)
    if parts and parts[0].replace(".", "").replace(" ", "").isdigit():
        return parts[0].strip()
    return filename


def main():
    parser = argparse.ArgumentParser(description="Extract text from Course 2 PDFs")
    parser.add_argument("--module", type=int, required=True, choices=[1, 2, 3])
    args = parser.parse_args()

    module_dir = MODULE_DIRS[args.module]
    if not module_dir.exists():
        print(f"Module directory not found: {module_dir}")
        sys.exit(1)

    pdfs = sorted(module_dir.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {module_dir}")
        sys.exit(1)

    print(f"Extracting text from Module {args.module} ({len(pdfs)} PDFs)...")

    results = []
    low_text_files = []

    for i, pdf in enumerate(pdfs):
        print(f"  [{i+1}/{len(pdfs)}] {pdf.name}")
        text = extract_text(pdf)
        clean = text.strip()
        char_count = len(clean)

        section = get_section_number(pdf.stem)
        entry = {
            "filename": pdf.name,
            "section": section,
            "text": clean,
            "char_count": char_count,
        }
        results.append(entry)

        if char_count < 200:
            low_text_files.append((pdf.name, char_count))
            print(f"    -> Low text: {char_count} chars")
        else:
            # Show first line of meaningful content
            first_line = ""
            for line in clean.split("\n"):
                line = line.strip()
                if len(line) > 10:
                    first_line = line[:80]
                    break
            if first_line:
                print(f"    -> {char_count} chars: {first_line}...")

    # Save output
    output_file = DATA_DIR / f"course_2_module{args.module}_raw.json"
    output = {
        "source": "course_2",
        "module": args.module,
        "extracted_at": datetime.now().strftime("%Y-%m-%d"),
        "file_count": len(results),
        "files": results,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to {output_file}")

    # Summary
    total_chars = sum(r["char_count"] for r in results)
    good_files = [r for r in results if r["char_count"] >= 200]
    print(f"\nSummary:")
    print(f"  Total PDFs: {len(results)}")
    print(f"  Good text (>=200 chars): {len(good_files)}")
    print(f"  Low text (<200 chars): {len(low_text_files)}")
    print(f"  Total chars extracted: {total_chars:,}")

    if low_text_files:
        print(f"\nLow-text files (may be image-heavy):")
        for name, count in low_text_files:
            print(f"  {name}: {count} chars")


if __name__ == "__main__":
    main()
