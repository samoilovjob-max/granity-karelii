#!/usr/bin/env python3
"""Turn the supplied product .docx files into scripts/products-articles.json.

Stone documents in the same folder also start with 01, 02, … so this script
matches a unique fragment of the product filename, not the numeric prefix.
"""

import glob
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

OUT = os.path.join(os.path.dirname(__file__), "products-articles.json")

# fragment -> id. Id is the page slug: produkciya/<id>.html
FILES = [
    ("bccd.docx", "plity-mosheniya"),
    ("Road_and_Sidewalk", "bordyury"),
    ("Stone_Facing_Slabs", "oblicovochnye-plity"),
    ("Granite_Steps", "stupeni"),
    ("Granite_Bollards", "bollardy"),
    ("Granite_Paving_Blocks", "bruschatka"),
    ("f685.docx", "fasad-nvf"),
    ("Tactile_Stone", "taktilnye-plity"),
    ("Granite_Slabs", "sleby"),
    ("Memorial_Monuments", "pamyatniki"),
    ("Tombstones", "nadgrobiya"),
    ("Memorial_Bases", "tumby"),
    ("Flower_Beds", "tsvetniki"),
    ("Fence_Pillars", "stolbiki"),
    ("Balusters", "balyasiny"),
]


def paragraphs(path):
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    lines = []
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    for node in root.iter(ns + "p"):
        parts = []
        for text in node.iter(ns + "t"):
            if text.text:
                parts.append(text.text)
            if text.tail:
                parts.append(text.tail)
        line = clean("".join(parts))
        if line:
            lines.append(line)
    return lines


def clean(value):
    value = value.replace("\xa0", " ").replace("\u200b", "")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"([.!?])([А-ЯA-Z«])", r"\1 \2", value)
    value = re.sub(r":([А-ЯA-Z«])", r": \1", value)
    return value


def split_seo(text):
    match = re.search(
        r"Title\s*\(для SEO\)\s*:\s*(.+?)Meta-description\s*:\s*(.+)$",
        text,
        re.S,
    )
    if not match:
        return "", ""
    return clean(match.group(1)), clean(match.group(2))


def is_label(text):
    if ":" not in text:
        return False
    left, right = text.split(":", 1)
    if not right.strip() or len(left) > 90 or "." in left:
        return False
    return True


def blocks_from(lines):
    blocks = []
    points = []

    def flush():
        if points:
            blocks.append({"type": "points", "items": points[:]})
            points.clear()

    for line in lines:
        if is_label(line):
            label, text = line.split(":", 1)
            points.append({"label": label.strip(), "text": text.strip()})
        else:
            flush()
            blocks.append({"type": "p", "text": line})
    flush()
    return blocks


def article_from(path, product_id):
    lines = paragraphs(path)
    seo_title, meta = split_seo(lines[0])
    body = lines[1:]
    headline = body[0]
    rest = body[1:]
    lead = []
    sections = []
    current = None
    for line in rest:
        if re.match(r"^\d+\.\s+\S", line):
            current = {"title": line, "lines": []}
            sections.append(current)
            continue
        if current is None:
            lead.append(line)
        else:
            current["lines"].append(line)
    if not sections or not lead:
        raise SystemExit(f"{product_id}: expected a lead and numbered sections")
    return {
        "id": product_id,
        "seoTitle": seo_title,
        "meta": meta,
        "headline": headline,
        "lead": lead,
        "sections": [
            {"title": section["title"], "blocks": blocks_from(section["lines"])}
            for section in sections
        ],
    }


def main():
    folder = os.environ.get(
        "PRODUCT_DOCS",
        "/home/ubuntu/.cursor/projects/workspace/uploads",
    )
    paths = glob.glob(os.path.join(folder, "*.docx"))
    chosen = {}
    for fragment, product_id in FILES:
        matches = [path for path in paths if fragment in os.path.basename(path)]
        if len(matches) != 1:
            raise SystemExit(f"{product_id}: expected 1 file with {fragment}, got {len(matches)}")
        chosen[product_id] = matches[0]
    articles = [article_from(chosen[product_id], product_id) for _, product_id in FILES]
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(articles, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {len(articles)} articles to {OUT}")


if __name__ == "__main__":
    main()
