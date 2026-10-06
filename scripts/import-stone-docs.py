#!/usr/bin/env python3
"""Turn the supplied stone .docx files into scripts/stones-articles.json."""

import glob
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(os.path.dirname(__file__), "stones-articles.json")

FILES = {
    "01": "gabbro-diabaz",
    "03": "kalguvaara",
    "04": "dyadina-gora",
    "05": "onezhskiy-labradorit",
    "06": "vozrozhdenie",
    "09": "mavara",
    "10": "dymovskiy",
    "11": "kolskiy",
    "12": "onego-green",
    "14": "vinga",
    "15": "hauki",
    "17": "amphibolite",
    "18": "kupetskiy",
    "19": "galaktika",
    "20": "khibinite",
    "21": "krasnogorskiy",
    "26": "sopka-buntina",
    "27": "kashina-gora",
}


def paragraphs(path):
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    lines = []
    for node in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        parts = []
        for text in node.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
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


# Measured values stay. Warning sentences about a batch, drainage, or dry laying do not.
CAVEAT_TEXT = {
    ("khibinite", "Морозостойкость (F50–F100)"): "умеренная морозостойкость.",
    ("khibinite", "Радиационная безопасность"): "1-й класс.",
    ("galaktika", "Морозостойкость (F50–F100)"): "умеренная морозостойкость.",
}


def split_seo(text):
    text = re.sub(r"^Ver\s*2\.0\.\s*", "", text)
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


def blocks_from(lines, stone_id):
    blocks = []
    points = []

    def flush():
        if points:
            blocks.append({"type": "points", "items": points[:]})
            points.clear()

    for line in lines:
        if is_label(line):
            label, text = line.split(":", 1)
            label = label.strip()
            text = CAVEAT_TEXT.get((stone_id, label), text.strip())
            points.append({"label": label, "text": text})
        else:
            flush()
            blocks.append({"type": "p", "text": line})
    flush()
    return blocks


def article_from(path, stone_id):
    lines = paragraphs(path)
    seo_title, meta = split_seo(lines[0])
    body = lines[1:]
    if not seo_title and lines[0].startswith("Title"):
        seo_title, meta = split_seo(lines[0])
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
    if len(sections) != 6 or not lead:
        raise SystemExit(f"{stone_id}: expected 6 sections and a lead, got {len(sections)} sections")
    return {
        "id": stone_id,
        "seoTitle": seo_title,
        "meta": meta,
        "headline": headline,
        "lead": lead,
        "sections": [
            {"title": section["title"], "blocks": blocks_from(section["lines"], stone_id)}
            for section in sections
        ],
    }


def main():
    folder = os.environ.get(
        "STONE_DOCS",
        "/home/ubuntu/.cursor/projects/workspace/uploads",
    )
    chosen = {}
    for path in glob.glob(os.path.join(folder, "*.docx")):
        name = os.path.basename(path)
        prefix = name[:2]
        if prefix not in FILES:
            continue
        # Prefer the earlier copy when the same stone was uploaded twice.
        if prefix not in chosen or "efb8" in os.path.basename(chosen[prefix]):
            chosen[prefix] = path
    missing = [FILES[key] for key in FILES if key not in chosen]
    if missing:
        raise SystemExit("missing documents: " + ", ".join(missing))
    articles = [article_from(chosen[key], FILES[key]) for key in FILES]
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(articles, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {len(articles)} articles to {OUT}")


if __name__ == "__main__":
    main()
