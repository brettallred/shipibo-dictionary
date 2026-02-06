#!/usr/bin/env python3
"""
Extract and parse dictionary entries from shipibo.pdf using OCR.

This script extracts text from the Shipibo-Spanish dictionary PDF using OCR,
parses it into structured entries, and outputs JSON.
"""

import json
import re
import sys
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

import pymupdf
import pytesseract
from PIL import Image


@dataclass
class Example:
    shipibo: str
    spanish: str


@dataclass
class Entry:
    headword: str
    part_of_speech: Optional[str] = None
    variant_forms: list[str] = field(default_factory=list)
    etymology: Optional[str] = None
    definitions_spanish: list[str] = field(default_factory=list)
    definitions_english: list[str] = field(default_factory=list)
    examples: list[dict] = field(default_factory=list)
    synonyms: list[str] = field(default_factory=list)
    cross_references: list[str] = field(default_factory=list)
    grammatical_notes: Optional[str] = None
    page_number: int = 0


def extract_page_image(doc, page_num: int, zoom: float = 2.0) -> Image.Image:
    """Extract a page as a PIL Image."""
    page = doc[page_num]
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def ocr_page(img: Image.Image) -> str:
    """Run OCR on an image and return text."""
    return pytesseract.image_to_string(img, lang='spa')


def extract_text_from_pdf(pdf_path: str, start_page: int = 0, end_page: int = None) -> list[tuple[int, str]]:
    """Extract text from PDF using OCR, returning list of (page_number, text) tuples."""
    doc = pymupdf.open(pdf_path)
    pages = []

    if end_page is None:
        end_page = len(doc)

    total = min(end_page, len(doc)) - start_page
    for i, page_num in enumerate(range(start_page, min(end_page, len(doc)))):
        if i % 10 == 0:
            print(f"  OCR progress: {i}/{total} pages...")

        img = extract_page_image(doc, page_num)
        text = ocr_page(img)
        pages.append((page_num + 1, text))  # 1-indexed page numbers

    doc.close()
    return pages


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    # Fix common OCR errors
    text = text.replace('»', '>')
    text = text.replace('«', '<')
    text = text.replace(''', "'")
    text = text.replace(''', "'")
    text = text.replace('"', '"')
    text = text.replace('"', '"')

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_entries_from_text(text: str, page_num: int) -> list[Entry]:
    """Parse dictionary entries from OCR text."""
    entries = []

    # Pattern to find entry starts:
    # - Headword at start (lowercase, may have accents/diacritics)
    # - Followed by part of speech markers: v. t., v. i., s., adj., adv., etc.
    # - Or variant forms: tb. (también)

    # Entry pattern: word(s) followed by POS abbreviation
    entry_pattern = re.compile(
        r'^([a-záéíóúñšü–\-]+(?:\s+[a-záéíóúñšü–\-]+)?)\s+'
        r'(tb\.|s\.|v\.\s*[ti]\.|v\.|adj\.|adv\.|interj\.|prep\.|sf\.|coni\.)',
        re.MULTILINE | re.IGNORECASE
    )

    # Split text into lines and reassemble entries
    lines = text.split('\n')
    current_entry_text = []
    current_headword = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip page headers/footers (typically have page numbers)
        if re.match(r'^[a-záéíóúñšü]+\s+\d+\s+[a-záéíóúñšü]+$', line):
            continue
        if re.match(r'^\d+\s+[a-záéíóúñšü]+$', line):
            continue
        if re.match(r'^[a-záéíóúñšü]+\s+\d+$', line):
            continue

        # Check if this line starts a new entry
        match = entry_pattern.match(line)
        if match:
            # Save previous entry if exists
            if current_headword and current_entry_text:
                entry = parse_single_entry(' '.join(current_entry_text), page_num)
                if entry:
                    entries.append(entry)

            current_headword = match.group(1)
            current_entry_text = [line]
        elif current_headword:
            current_entry_text.append(line)

    # Don't forget last entry
    if current_headword and current_entry_text:
        entry = parse_single_entry(' '.join(current_entry_text), page_num)
        if entry:
            entries.append(entry)

    return entries


def parse_single_entry(text: str, page_num: int) -> Optional[Entry]:
    """Parse a single entry's text into structured data."""
    text = clean_text(text)
    if not text or len(text) < 5:
        return None

    # Extract headword
    headword_match = re.match(r'^([a-záéíóúñšü–\-]+(?:\s+[a-záéíóúñšü–\-]+)?)', text, re.IGNORECASE)
    if not headword_match:
        return None

    headword = headword_match.group(1).lower().strip()
    remaining = text[len(headword_match.group(0)):].strip()

    entry = Entry(headword=headword, page_number=page_num)

    # Extract variant forms (tb. X or multiple forms listed after headword)
    variant_pattern = r'\btb\.\s+([a-záéíóúñšü]+)'
    variants = re.findall(variant_pattern, remaining, re.IGNORECASE)
    entry.variant_forms = variants

    # Look for conjugation forms like "coni. X"
    conj_pattern = r'\bconi\.\s+([a-záéíóúñšü]+)'
    conj_forms = re.findall(conj_pattern, remaining, re.IGNORECASE)
    entry.variant_forms.extend(conj_forms)

    # Extract part of speech
    pos_pattern = r'\b(s\.|v\.\s*[ti]\.|v\.|adj\.|adv\.|interj\.|prep\.|sf\.\s*(?:vbl|posp|modif|VOC)\.|sf\.|coni\.|pish\.)'
    pos_match = re.search(pos_pattern, remaining, re.IGNORECASE)
    if pos_match:
        entry.part_of_speech = pos_match.group(1).strip()

    # Extract etymology [del ship. X + Y] or [del cast. X]
    etym_pattern = r'\[del\s+(?:ship|cast|quech)\.[^\]]+\]'
    etym_match = re.search(etym_pattern, remaining, re.IGNORECASE)
    if etym_match:
        entry.etymology = etym_match.group(0)

    # Extract definitions - they typically follow `:` and precede examples
    # Multiple numbered definitions: 1 : def1 2 : def2
    numbered_def_pattern = r'(\d+)\s*:\s*([^<>\d]+?)(?=\d+\s*:|<|$)'
    numbered_defs = re.findall(numbered_def_pattern, remaining)

    if numbered_defs:
        for num, defn in numbered_defs:
            defn = defn.strip().rstrip('.')
            # Clean up definition text
            defn = re.sub(r'\[del\s+[^\]]+\]', '', defn)  # Remove etymologies from defs
            defn = re.sub(r'\s+', ' ', defn).strip()
            if defn and len(defn) > 1:
                entry.definitions_spanish.append(defn)
    else:
        # Single definition: after colon, before example
        single_def_pattern = r':\s*([^<>]+?)(?=<|Véase|sinón\.|$)'
        single_match = re.search(single_def_pattern, remaining)
        if single_match:
            defn = single_match.group(1).strip().rstrip('.')
            # Clean up
            defn = re.sub(r'\[del\s+[^\]]+\]', '', defn)
            defn = re.sub(r'\s+', ' ', defn).strip()
            if defn and len(defn) > 1:
                entry.definitions_spanish.append(defn)

    # Extract example sentences (in angle brackets < > or « »)
    # Pattern: <Shipibo text. Spanish translation.>
    example_pattern = r'[<«]([^>»]+)[>»]'
    examples_raw = re.findall(example_pattern, remaining)

    for ex in examples_raw:
        ex = ex.strip()
        # Try to split on period followed by uppercase (Spanish sentence start)
        # Shipibo sentences are typically in italics and followed by Spanish translation
        parts = re.split(r'\.\s+(?=[A-ZÁÉÍÓÚÑ])', ex, maxsplit=1)
        if len(parts) == 2:
            entry.examples.append({
                'shipibo': parts[0].strip() + '.',
                'spanish': parts[1].strip()
            })
        elif ex:
            # Can't split - store as combined
            entry.examples.append({
                'shipibo': ex,
                'spanish': ''
            })

    # Extract synonyms (sinón. section)
    syn_pattern = r'sinón\.\s+([a-záéíóúñšü,;\s]+?)(?=\s*[A-Z]|$|\d)'
    syn_match = re.search(syn_pattern, remaining, re.IGNORECASE)
    if syn_match:
        syns_text = syn_match.group(1)
        syns = re.split(r'[,;]\s*', syns_text)
        entry.synonyms = [s.strip() for s in syns if s.strip() and len(s.strip()) > 1]

    # Extract cross-references (Véase X)
    xref_pattern = r'[Vv]éase\s+(?:bajo\s+)?([a-záéíóúñšü]+)'
    xrefs = re.findall(xref_pattern, remaining)
    entry.cross_references = list(set(xrefs))

    # Extract grammatical notes (-Usase... sections)
    gram_pattern = r'-[Úú]sase[^<>]+?(?=<|$)'
    gram_matches = re.findall(gram_pattern, remaining)
    if gram_matches:
        entry.grammatical_notes = ' '.join([g.strip() for g in gram_matches])

    return entry


def entries_to_json(entries: list[Entry]) -> str:
    """Convert entries to JSON string."""
    return json.dumps(
        [asdict(e) for e in entries],
        ensure_ascii=False,
        indent=2
    )


def main():
    pdf_path = Path(__file__).parent.parent / 'shipibo.pdf'
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)

    print(f"Extracting text from {pdf_path}...")

    # Dictionary content appears to be on pages 85+ (0-indexed: 84+)
    # Let's find the actual dictionary start by checking content

    if '--full' in sys.argv:
        # Full extraction - find dictionary pages first
        print("Running full extraction...")

        # Based on preview, dictionary starts around page 85 and goes to ~340
        # We'll do a quick check to find the actual range
        doc = pymupdf.open(str(pdf_path))
        total_pages = len(doc)
        doc.close()

        print(f"Total pages in PDF: {total_pages}")

        # Extract all dictionary pages (roughly pages 85-340)
        start_page = 84  # 0-indexed
        end_page = total_pages - 5  # Skip last few pages (appendix/index)

        all_pages = extract_text_from_pdf(str(pdf_path), start_page=start_page, end_page=end_page)

        all_entries = []
        for page_num, text in all_pages:
            entries = parse_entries_from_text(text, page_num)
            all_entries.extend(entries)

        print(f"Found {len(all_entries)} total entries")

        full_path = data_dir / 'entries.json'
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(entries_to_json(all_entries))
        print(f"Saved full dictionary to {full_path}")

    else:
        # Sample extraction (pages 82-92 for testing - covers "chi" entries)
        print("Running sample extraction (10 pages)...")
        sample_pages = extract_text_from_pdf(str(pdf_path), start_page=81, end_page=92)

        print(f"Extracted {len(sample_pages)} sample pages")

        # Parse entries from sample
        sample_entries = []
        for page_num, text in sample_pages:
            entries = parse_entries_from_text(text, page_num)
            sample_entries.extend(entries)

        print(f"Found {len(sample_entries)} entries in sample")

        # Save sample
        sample_path = data_dir / 'entries_sample.json'
        with open(sample_path, 'w', encoding='utf-8') as f:
            f.write(entries_to_json(sample_entries))
        print(f"Saved sample to {sample_path}")

        # Print some sample entries for verification
        print("\n=== Sample entries ===")
        for entry in sample_entries[:10]:
            print(f"\nHeadword: {entry.headword}")
            print(f"  POS: {entry.part_of_speech}")
            print(f"  Etymology: {entry.etymology}")
            print(f"  Definitions: {entry.definitions_spanish[:2]}")
            print(f"  Examples: {len(entry.examples)}")
            if entry.examples:
                print(f"    Ex 1: {entry.examples[0]}")
            if entry.synonyms:
                print(f"  Synonyms: {entry.synonyms}")
            if entry.cross_references:
                print(f"  Cross-refs: {entry.cross_references}")


if __name__ == '__main__':
    main()
