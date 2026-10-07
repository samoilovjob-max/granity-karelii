#!/usr/bin/env python3
"""Convert a raster logo to SVG with vtracer, then clean the result.

Minimal API (as documented by vtracer):
  pip install vtracer
  import vtracer
  vtracer.convert_image_to_svg_py("logo.jpg", "logo.svg", colormode="color")

This script wraps that call and post-cleans the SVG:
  - bake transform=\"translate(tx,ty)\" into absolute coords
  - preserve compound cutout subpaths (holes) with fill-rule=evenodd
  - drop micro-paths (max side < 0.5px by default)
  - smooth corners (Ramer–Douglas–Peucker)
  - merge near-identical fills

Usage:
  pip install vtracer
  python3 scripts/jpg_to_svg_vtracer.py images/brand/logo-gk.jpg \\
      --out images/brand/logo-gk.svg \\
      --transparent-out images/brand/logo-gk-transparent.svg

If the automatic result is still jagged / noisy (typical for photos and
JPEG compression), stop iterating auto-trace and use a desktop tool:
  - potrace (best for B/W silhouettes)
  - vtracer CLI (same engine, more knobs)
  - vectorizer.ai
  - Adobe Illustrator → Image Trace (then Expand + Pathfinder merge)
Then manually: delete <0.5px shards, straighten facet edges, unify fills.
"""

from __future__ import annotations

import argparse
import colorsys
import math
import re
import shutil
import tempfile
from pathlib import Path

import vtracer

# ---------------------------------------------------------------------------
# Path parsing / geometry helpers
# ---------------------------------------------------------------------------

_NUM = re.compile(r"[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
_CMD = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]")


def _hex_to_rgb(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#{:02X}{:02X}{:02X}".format(
        max(0, min(255, int(round(r * 255)))),
        max(0, min(255, int(round(g * 255)))),
        max(0, min(255, int(round(b * 255)))),
    )


def _color_distance(a: str, b: str) -> float:
    ar, ag, ab = _hex_to_rgb(a)
    br, bg, bb = _hex_to_rgb(b)
    # perceptual-ish weighted RGB distance
    return math.sqrt(2 * (ar - br) ** 2 + 4 * (ag - bg) ** 2 + 3 * (ab - bb) ** 2)


def _tokenize_area(pts: list[tuple[float, float]]) -> float:
    """Signed shoelace area (positive = CCW)."""
    if len(pts) < 3:
        return 0.0
    a = 0.0
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        a += x1 * y2 - x2 * y1
    return a * 0.5


def parse_path_subpaths(d: str) -> list[list[tuple[float, float]]]:
    """Parse SVG path `d` into absolute subpaths (one list of points per M…Z).

    vtracer cutout mode emits compound paths (outer + holes) as multiple
    subpaths in a single `d`; those must stay separate for correct holes.
    """
    tokens: list[str] = []
    i = 0
    while i < len(d):
        ch = d[i]
        if _CMD.match(ch):
            tokens.append(ch)
            i += 1
        elif ch.isspace() or ch == ",":
            i += 1
        else:
            m = _NUM.match(d, i)
            if not m:
                i += 1
                continue
            tokens.append(m.group(0))
            i = m.end()

    subpaths: list[list[tuple[float, float]]] = []
    pts: list[tuple[float, float]] = []
    cx = cy = 0.0
    sx = sy = 0.0
    i = 0
    cmd = "M"
    started = False

    def close_subpath() -> None:
        nonlocal pts, started
        if pts:
            # Ensure closed ring for hole winding
            if math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) > 1e-6:
                pts.append(pts[0])
            subpaths.append(pts)
        pts = []
        started = False

    while i < len(tokens):
        t = tokens[i]
        if _CMD.match(t):
            cmd = t
            i += 1
            if cmd in "Zz":
                cx, cy = sx, sy
                if pts and (pts[-1][0] != cx or pts[-1][1] != cy):
                    pts.append((cx, cy))
                close_subpath()
            continue

        def take() -> float:
            nonlocal i
            v = float(tokens[i])
            i += 1
            return v

        if cmd in "Mm":
            x, y = take(), take()
            if cmd == "m":
                x, y = cx + x, cy + y
            # New subpath when we already have points (implicit close)
            if started and pts:
                close_subpath()
            cx, cy = x, y
            sx, sy = x, y
            pts = [(cx, cy)]
            started = True
            cmd = "L" if cmd == "M" else "l"
        elif cmd in "Ll":
            x, y = take(), take()
            if cmd == "l":
                x, y = cx + x, cy + y
            cx, cy = x, y
            pts.append((cx, cy))
        elif cmd in "Hh":
            x = take()
            if cmd == "h":
                x = cx + x
            cx = x
            pts.append((cx, cy))
        elif cmd in "Vv":
            y = take()
            if cmd == "v":
                y = cy + y
            cy = y
            pts.append((cx, cy))
        elif cmd in "Cc":
            _ = [take() for _ in range(4)]
            x, y = take(), take()
            if cmd == "c":
                x, y = cx + x, cy + y
            cx, cy = x, y
            pts.append((cx, cy))
        elif cmd in "SsQqTt":
            n = 2 if cmd in "Tt" else 4
            vals = [take() for _ in range(n)]
            x, y = vals[-2], vals[-1]
            if cmd.islower():
                x, y = cx + x, cy + y
            cx, cy = x, y
            pts.append((cx, cy))
        elif cmd in "Aa":
            _ = [take() for _ in range(5)]
            x, y = take(), take()
            if cmd == "a":
                x, y = cx + x, cy + y
            cx, cy = x, y
            pts.append((cx, cy))
        else:
            i += 1

    if pts:
        close_subpath()
    return subpaths


def parse_path_points(d: str) -> list[tuple[float, float]]:
    """Flatten all subpaths (legacy helper for bbox checks)."""
    pts: list[tuple[float, float]] = []
    for sp in parse_path_subpaths(d):
        pts.extend(sp)
    return pts


def path_bbox_area(d: str) -> float:
    pts = parse_path_points(d)
    if len(pts) < 2:
        return 0.0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return max(0.0, (max(xs) - min(xs)) * (max(ys) - min(ys)))


def path_max_extent(d: str) -> float:
    pts = parse_path_points(d)
    if len(pts) < 2:
        return 0.0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return max(max(xs) - min(xs), max(ys) - min(ys))


def simplify_polyline(pts: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    """Ramer–Douglas–Peucker simplification."""
    if len(pts) < 3 or epsilon <= 0:
        return pts

    def perp_dist(p, a, b) -> float:
        ax, ay = a
        bx, by = b
        px, py = p
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
        t = max(0.0, min(1.0, t))
        return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

    def rdp(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(points) < 3:
            return points
        a, b = points[0], points[-1]
        idx, dist = 0, 0.0
        for i in range(1, len(points) - 1):
            d = perp_dist(points[i], a, b)
            if d > dist:
                idx, dist = i, d
        if dist > epsilon:
            left = rdp(points[: idx + 1])
            right = rdp(points[idx:])
            return left[:-1] + right
        return [a, b]

    # Keep closed paths closed
    closed = len(pts) > 2 and math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) < 1e-6
    core = pts[:-1] if closed else pts
    simple = rdp(core)
    if closed:
        if simple[0] != simple[-1]:
            simple = simple + [simple[0]]
    return simple


def points_to_path(pts: list[tuple[float, float]], precision: int = 1) -> str:
    if not pts:
        return ""
    fmt = f"{{:.{precision}f}}"
    # Skip duplicate closing point if present — we emit Z
    body = pts[:-1] if len(pts) > 2 and math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) < 1e-6 else pts
    parts = [f"M{fmt.format(body[0][0])},{fmt.format(body[0][1])}"]
    for x, y in body[1:]:
        parts.append(f"L{fmt.format(x)},{fmt.format(y)}")
    parts.append("Z")
    return " ".join(parts)


def subpaths_to_path(subpaths: list[list[tuple[float, float]]], precision: int = 1) -> str:
    """Join subpaths into one `d` (compound path with holes)."""
    return " ".join(points_to_path(sp, precision=precision) for sp in subpaths if sp)


# ---------------------------------------------------------------------------
# SVG clean-up
# ---------------------------------------------------------------------------

_PATH_RE = re.compile(
    r'<path\b([^>]*?)\bd="([^"]*)"([^>]*?)/?>',
    re.IGNORECASE | re.DOTALL,
)
_FILL_RE = re.compile(r'fill="(#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|[a-zA-Z]+)"', re.I)
_STYLE_FILL_RE = re.compile(r"fill\s*:\s*(#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|[a-zA-Z]+)", re.I)
_VIEWBOX_RE = re.compile(r'viewBox="([^"]+)"', re.I)
_WIDTH_RE = re.compile(r'\bwidth="([0-9.]+)"', re.I)
_HEIGHT_RE = re.compile(r'\bheight="([0-9.]+)"', re.I)
_TRANSLATE_RE = re.compile(
    r'transform="\s*translate\(\s*([-+]?(?:\d*\.\d+|\d+))\s*[,\s]\s*([-+]?(?:\d*\.\d+|\d+))\s*\)\s*"',
    re.I,
)


def _normalize_fill(fill: str) -> str | None:
    fill = fill.strip()
    if fill.lower() in ("none", "transparent"):
        return None
    if fill.startswith("#"):
        h = fill[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) >= 6:
            return f"#{h[:6].upper()}"
    m = re.match(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", fill, re.I)
    if m:
        return "#{:02X}{:02X}{:02X}".format(int(m[1]), int(m[2]), int(m[3]))
    return fill


def extract_fill(attrs_before: str, attrs_after: str) -> str | None:
    blob = attrs_before + " " + attrs_after
    m = _FILL_RE.search(blob) or _STYLE_FILL_RE.search(blob)
    if not m:
        return "#000000"
    return _normalize_fill(m.group(1))


def extract_translate(attrs_before: str, attrs_after: str) -> tuple[float, float]:
    """Parse transform=\"translate(tx,ty)\" from path attributes (vtracer style)."""
    blob = attrs_before + " " + attrs_after
    m = _TRANSLATE_RE.search(blob)
    if not m:
        return 0.0, 0.0
    return float(m.group(1)), float(m.group(2))


def svg_canvas_size(svg_text: str) -> tuple[str, float, float]:
    """Return (viewBox, width, height). Prefer viewBox; else width/height attrs."""
    vb = _VIEWBOX_RE.search(svg_text)
    if vb:
        viewbox = vb.group(1)
        parts = viewbox.split()
        try:
            w = float(parts[2])
            h = float(parts[3])
            return viewbox, w, h
        except (IndexError, ValueError):
            pass

    mw = _WIDTH_RE.search(svg_text)
    mh = _HEIGHT_RE.search(svg_text)
    if mw and mh:
        w = float(mw.group(1))
        h = float(mh.group(1))
        return f"0 0 {w:g} {h:g}", w, h

    return "0 0 484 484", 484.0, 484.0


def absolute_subpaths(d: str, tx: float, ty: float) -> list[list[tuple[float, float]]]:
    """Parse path `d` into subpaths and bake translate(tx, ty)."""
    subs = parse_path_subpaths(d)
    if tx == 0.0 and ty == 0.0:
        return subs
    return [[(x + tx, y + ty) for x, y in sp] for sp in subs]


def clean_svg(
    svg_text: str,
    *,
    min_extent_px: float = 0.5,
    simplify_epsilon: float = 0.75,
    merge_delta: float = 0.045,
    path_precision: int = 1,
) -> str:
    """Remove micro-paths, smooth corners (RDP), merge near-identical fills.

    vtracer emits relative path coords plus transform=\"translate(tx,ty)\";
    this pass bakes the translate into absolute coordinates so cleaning
    preserves geometry. Compound cutout paths (multiple M…Z subpaths / holes)
    are kept as compound paths.
    """
    viewbox, w, h = svg_canvas_size(svg_text)

    paths: list[dict] = []
    for m in _PATH_RE.finditer(svg_text):
        d = m.group(2)
        fill = extract_fill(m.group(1), m.group(3))
        if fill is None:
            continue
        tx, ty = extract_translate(m.group(1), m.group(3))
        subs = absolute_subpaths(d, tx, ty)
        cleaned_subs: list[list[tuple[float, float]]] = []
        max_extent = 0.0
        max_area = 0.0
        for sp in subs:
            if len(sp) < 3:
                continue
            xs = [p[0] for p in sp]
            ys = [p[1] for p in sp]
            extent = max(max(xs) - min(xs), max(ys) - min(ys))
            area = max(0.0, (max(xs) - min(xs)) * (max(ys) - min(ys)))
            # Drop micro subpaths
            if extent < min_extent_px or area < (min_extent_px * min_extent_px):
                continue
            sp = simplify_polyline(sp, simplify_epsilon)
            if len(sp) < 3:
                continue
            cleaned_subs.append(sp)
            max_extent = max(max_extent, extent)
            max_area = max(max_area, area)
        if not cleaned_subs:
            continue
        new_d = subpaths_to_path(cleaned_subs, precision=path_precision)
        compound = len(cleaned_subs) > 1
        paths.append(
            {
                "d": new_d,
                "fill": fill,
                "extent": max_extent,
                "area": max_area,
                "compound": compound,
            }
        )

    if not paths:
        return svg_text

    # Merge similar fills into palette clusters (greedy)
    palette: list[str] = []
    for p in paths:
        assigned = None
        for c in palette:
            if _color_distance(p["fill"], c) <= merge_delta:
                assigned = c
                break
        if assigned is None:
            palette.append(p["fill"])
            assigned = p["fill"]
        p["fill"] = assigned

    # Keep vtracer emission order — stacked hierarchy depends on it.
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" '
        f'width="{w:g}" height="{h:g}">',
    ]
    for p in paths:
        # Compound cutout paths need evenodd so holes punch through
        if p["compound"]:
            out.append(
                f'<path d="{p["d"]}" fill="{p["fill"]}" fill-rule="evenodd"/>'
            )
        else:
            out.append(f'<path d="{p["d"]}" fill="{p["fill"]}"/>')
    out.append("</svg>")
    out.append("")
    return "\n".join(out)


def make_transparent(svg_text: str) -> str:
    """Remove near-white full-canvas background rect/path if present."""
    viewbox, vw, vh = svg_canvas_size(svg_text)
    canvas = vw * vh

    def is_near_white(fill: str) -> bool:
        n = _normalize_fill(fill)
        if not n or not n.startswith("#"):
            return False
        r, g, b = _hex_to_rgb(n)
        return r > 0.92 and g > 0.92 and b > 0.92

    kept = []
    for m in _PATH_RE.finditer(svg_text):
        d = m.group(2)
        fill = extract_fill(m.group(1), m.group(3))
        tx, ty = extract_translate(m.group(1), m.group(3))
        subs = absolute_subpaths(d, tx, ty)
        # Use outer subpath bbox for canvas coverage check
        if subs:
            xs = [p[0] for sp in subs for p in sp]
            ys = [p[1] for sp in subs for p in sp]
            area = max(0.0, (max(xs) - min(xs)) * (max(ys) - min(ys)))
        else:
            area = 0.0
        if fill and is_near_white(fill) and area > 0.85 * canvas:
            continue
        # Already-clean absolute paths (no transform) — keep as-is
        if tx == 0.0 and ty == 0.0 and "transform=" not in (m.group(1) + m.group(3)):
            kept.append(m.group(0))
        else:
            compound = len(subs) > 1
            new_d = subpaths_to_path(subs, precision=2)
            fr = ' fill-rule="evenodd"' if compound else ""
            kept.append(f'<path d="{new_d}" fill="{fill}"{fr}/>')

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" '
        f'width="{vw:g}" height="{vh:g}">\n'
        + "\n".join(kept)
        + "\n</svg>\n"
    )


# ---------------------------------------------------------------------------
# Conversion
# ---------------------------------------------------------------------------

def convert(
    image_path: Path,
    out_path: Path,
    *,
    colormode: str = "color",
    hierarchical: str = "cutout",
    mode: str = "polygon",
    filter_speckle: int = 8,
    color_precision: int = 6,
    layer_difference: int = 16,
    corner_threshold: int = 60,
    length_threshold: float = 4.0,
    max_iterations: int = 10,
    splice_threshold: int = 45,
    path_precision: int = 3,
    clean: bool = True,
    min_extent_px: float = 0.5,
    simplify_epsilon: float = 0.45,
    merge_delta: float = 0.035,
    transparent_out: Path | None = None,
) -> None:
    image_path = image_path.resolve()
    out_path = out_path.resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    raw_path = out_path.with_suffix(".vtracer-raw.svg")
    print(f"vtracer: {image_path} → {raw_path}")
    vtracer.convert_image_to_svg_py(
        str(image_path),
        str(raw_path),
        colormode=colormode,
        hierarchical=hierarchical,
        mode=mode,
        filter_speckle=filter_speckle,
        color_precision=color_precision,
        layer_difference=layer_difference,
        corner_threshold=corner_threshold,
        length_threshold=length_threshold,
        max_iterations=max_iterations,
        splice_threshold=splice_threshold,
        path_precision=path_precision,
    )

    raw = raw_path.read_text(encoding="utf-8", errors="replace")
    n_raw = len(_PATH_RE.findall(raw))
    print(f"  raw paths: {n_raw}")

    if clean:
        cleaned = clean_svg(
            raw,
            min_extent_px=min_extent_px,
            simplify_epsilon=simplify_epsilon,
            merge_delta=merge_delta,
            path_precision=max(1, min(2, path_precision)),
        )
        n_clean = len(_PATH_RE.findall(cleaned))
        print(f"  cleaned paths: {n_clean} (dropped {n_raw - n_clean})")
        out_path.write_text(cleaned, encoding="utf-8")
    else:
        shutil.copyfile(raw_path, out_path)
        cleaned = raw

    if transparent_out is not None:
        transparent_out = transparent_out.resolve()
        transparent_out.parent.mkdir(parents=True, exist_ok=True)
        transparent_out.write_text(make_transparent(cleaned), encoding="utf-8")
        print(f"  transparent: {transparent_out}")

    print(f"  wrote: {out_path}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("image", type=Path, help="Input raster (jpg/png)")
    p.add_argument("--out", type=Path, required=True, help="Output SVG path")
    p.add_argument("--transparent-out", type=Path, default=None, help="Also write SVG without white bg")
    p.add_argument("--colormode", default="color", choices=["color", "binary"])
    p.add_argument("--hierarchical", default="cutout", choices=["stacked", "cutout"])
    p.add_argument("--mode", default="polygon", choices=["spline", "polygon", "none"])
    p.add_argument("--filter-speckle", type=int, default=8)
    p.add_argument("--color-precision", type=int, default=6)
    p.add_argument("--layer-difference", type=int, default=16)
    p.add_argument("--corner-threshold", type=int, default=60)
    p.add_argument("--length-threshold", type=float, default=4.0)
    p.add_argument("--max-iterations", type=int, default=10)
    p.add_argument("--splice-threshold", type=int, default=45)
    p.add_argument("--path-precision", type=int, default=3)
    p.add_argument("--no-clean", action="store_true", help="Skip post-clean pass")
    p.add_argument("--min-extent", type=float, default=0.5, help="Drop paths with max side < this (px)")
    p.add_argument("--simplify", type=float, default=0.45, help="RDP epsilon for corner smoothing")
    p.add_argument("--merge-delta", type=float, default=0.035, help="Merge fills closer than this")
    args = p.parse_args()

    convert(
        args.image,
        args.out,
        colormode=args.colormode,
        hierarchical=args.hierarchical,
        mode=args.mode,
        filter_speckle=args.filter_speckle,
        color_precision=args.color_precision,
        layer_difference=args.layer_difference,
        corner_threshold=args.corner_threshold,
        length_threshold=args.length_threshold,
        max_iterations=args.max_iterations,
        splice_threshold=args.splice_threshold,
        path_precision=args.path_precision,
        clean=not args.no_clean,
        min_extent_px=args.min_extent,
        simplify_epsilon=args.simplify,
        merge_delta=args.merge_delta,
        transparent_out=args.transparent_out,
    )


if __name__ == "__main__":
    main()
