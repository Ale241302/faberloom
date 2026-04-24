#!/usr/bin/env python3
"""
build.py — concatenate fragments/*.fragment into index-standalone.html

Rules:
- Numeric prefix dictates concat order (00_, 01_, ...).
- *.css.fragment  -> wrapped in <style> and appended to <head> fragments block.
- *.js.fragment   -> wrapped in <script> and appended to <body> fragments block.
- *.html.fragment -> inserted verbatim into <body>. Special cases:
    00_head.*     -> prepended to <head> block (meta/fonts first).
    99_footer.*   -> appended last in <body> (closing markup + init call).
- No external dependencies. Python 3.8+ stdlib only.

Usage:
    python build.py

Output:
    index-standalone.html  (overwritten)
"""
from __future__ import annotations

import datetime
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent
FRAGMENTS = ROOT / "fragments"
OUTPUT = ROOT / "index-standalone.html"


def wrap(content: str, kind: str) -> str:
    """Wrap raw content in the correct HTML tag for its kind."""
    if kind == "css":
        return f"<style>\n{content}\n</style>"
    if kind == "js":
        return f"<script>\n{content}\n</script>"
    return content


def classify(name: str) -> str:
    """Return one of: 'head', 'footer', 'css', 'js', 'html'."""
    if name.startswith("00_head") and name.endswith(".html.fragment"):
        return "head"
    if name.startswith("99_footer") and name.endswith(".html.fragment"):
        return "footer"
    if name.endswith(".css.fragment"):
        return "css"
    if name.endswith(".js.fragment"):
        return "js"
    if name.endswith(".html.fragment"):
        return "html"
    return "unknown"


def build() -> int:
    if not FRAGMENTS.exists():
        print(f"ERROR: fragments folder not found at {FRAGMENTS}", file=sys.stderr)
        return 2

    # Sort by filename so numeric prefix dictates order.
    frags = sorted(FRAGMENTS.glob("*.fragment"), key=lambda p: p.name)
    if not frags:
        print(f"WARN: no .fragment files in {FRAGMENTS} — output will be a bare shell.")

    head_blocks: list[str] = []
    body_blocks: list[str] = []
    footer_block: str | None = None
    skipped: list[str] = []

    for f in frags:
        name = f.name
        raw = f.read_text(encoding="utf-8")
        kind = classify(name)

        if kind == "head":
            # <head> content goes first inside head_blocks
            head_blocks.insert(0, raw)
        elif kind == "css":
            head_blocks.append(wrap(raw, "css"))
        elif kind == "js":
            body_blocks.append(wrap(raw, "js"))
        elif kind == "footer":
            footer_block = raw
        elif kind == "html":
            body_blocks.append(raw)
        else:
            skipped.append(name)

    if footer_block:
        body_blocks.append(footer_block)

    head_combined = "\n".join(head_blocks) if head_blocks else ""
    body_combined = "\n".join(body_blocks) if body_blocks else ""

    html = (
        "<!DOCTYPE html>\n"
        "<html lang=\"es\" data-theme=\"light\">\n"
        "<head>\n"
        f"{head_combined}\n"
        "</head>\n"
        "<body>\n"
        f"{body_combined}\n"
        "<script>if(window.__faberloom&&window.__faberloom.boot&&typeof window.__faberloom.boot.init==='function'){window.__faberloom.boot.init();}</script>\n"
        "</body>\n"
        "</html>\n"
    )

    OUTPUT.write_text(html, encoding="utf-8")

    size_kb = OUTPUT.stat().st_size // 1024
    lines = html.count("\n")
    now = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[OK] {OUTPUT.name} - {size_kb} KB - {lines} lines - {now}")
    print(f"     fragments processed: {len(frags)}  head: {len(head_blocks)}  body: {len(body_blocks)}")
    if skipped:
        print(f"     skipped (unknown kind): {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(build())
