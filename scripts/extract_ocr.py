#!/usr/bin/env python3
"""
Step 1: Extract raw OCR text from PDF and cache it.

This separates OCR (slow, deterministic) from parsing (fast, iterative).
"""

import json
import sys
from pathlib import Path

import pymupdf
import pytesseract
from PIL import Image


def extract_page_image(doc, page_num: int, zoom: float = 2.0) -> Image.Image:
    """Extract a page as a PIL Image."""
    page = doc[page_num]
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def ocr_page(img: Image.Image) -> str:
    """Run OCR on an image and return text."""
    return pytesseract.image_to_string(img, lang='spa')


def extract_all_pages(pdf_path: str, start_page: int, end_page: int) -> dict:
    """Extract OCR text from all pages, returning dict of page_num -> text."""
    doc = pymupdf.open(pdf_path)
    pages = {}

    total = end_page - start_page
    for i, page_num in enumerate(range(start_page, end_page)):
        if i % 10 == 0:
            print(f"  OCR progress: {i}/{total} pages...")

        img = extract_page_image(doc, page_num)
        text = ocr_page(img)
        pages[page_num + 1] = text  # 1-indexed page numbers

    doc.close()
    return pages


def main():
    pdf_path = Path(__file__).parent.parent / 'shipibo.pdf'
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)

    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    doc.close()

    print(f"PDF has {total_pages} pages")

    # Dictionary content is roughly pages 85-343 (0-indexed: 84-342)
    start_page = 84
    end_page = total_pages - 5

    if '--sample' in sys.argv:
        # Just extract 10 pages for testing
        print("Extracting sample (10 pages)...")
        start_page = 84
        end_page = 94
        output_file = data_dir / 'ocr_sample.json'
    else:
        print(f"Extracting full dictionary (pages {start_page+1}-{end_page})...")
        output_file = data_dir / 'ocr_full.json'

    # Check if we already have cached OCR
    if output_file.exists() and '--force' not in sys.argv:
        print(f"OCR cache exists at {output_file}")
        print("Use --force to re-extract")
        return

    pages = extract_all_pages(str(pdf_path), start_page, end_page)

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(pages, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(pages)} pages of OCR text to {output_file}")

    # Print sample
    first_page = list(pages.keys())[0]
    print(f"\n=== Sample from page {first_page} ===")
    print(pages[first_page][:1000])


if __name__ == '__main__':
    main()
