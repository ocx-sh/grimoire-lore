#!/usr/bin/env python3
"""DOC-NAV-05, 06, 09, 10, 11, 12, 15 over the fleet file list."""
import re
import sys
from collections import defaultdict
from strip_prose import strip

WORD_RE = re.compile(r"[A-Za-z']+")

H5_RE = re.compile(r"^#{5,6} ", re.MULTILINE)
ROLE_NOUN_RE = re.compile(r"\b(developer|admin|beginner|advanced|professional|workforce)\b", re.IGNORECASE)
ZERO_RESULT_RE = re.compile(r"zero.result|search.analytics|docs:zero-result-search", re.IGNORECASE)
SYNONYM_KEY_RE = re.compile(r"\b(synonyms|removeWordsIfNoResults|optionalWords|ignorePlurals|removeStopWords)\b")
CADENCE_WORD_RE = re.compile(r"\b(regularly|frequently|periodically|often)\b[^.]{0,40}review|review[^.]{0,40}\b(regularly|frequently|periodically|often)\b", re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r"lorem ipsum|placeholder text|TODO: write|coming soon", re.IGNORECASE)


def main():
    files = open(sys.argv[1]).read().split()
    h5_pages = []
    role_noun_hits = []
    over4000 = []
    stub_pages_no_link = []
    for path in files:
        try:
            raw = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if H5_RE.search(raw):
            h5_pages.append(path)
        stripped = strip(raw)
        words = WORD_RE.findall(stripped)
        if len(words) > 4000:
            over4000.append((path, len(words)))
        # title / first H1 role-noun check
        m = re.search(r"^#\s+(.+)$", raw, re.MULTILINE)
        title = m.group(1) if m else ""
        for hit in ROLE_NOUN_RE.finditer(title):
            role_noun_hits.append((path, hit.group(0)))
        if len(words) < 150:
            has_link = bool(re.search(r"\[[^\]]*\]\([^)]+\)", raw))
            has_placeholder = bool(PLACEHOLDER_RE.search(raw))
            if not has_link or has_placeholder:
                stub_pages_no_link.append((path, len(words), has_link, has_placeholder))

    print("=== DOC-NAV-05 (H5/H6 headings) ===")
    print(f"pages with H5+ heading: {len(h5_pages)}/{len(files)}")
    for p in h5_pages:
        print(" ", p)

    print()
    print("=== DOC-NAV-06 (non-reference page > 4000 prose words) ===")
    print(f"pages over 4000 words: {len(over4000)}/{len(files)}")
    for p, n in sorted(over4000, key=lambda kv: -kv[1]):
        print(f"  {p}: {n}")

    print()
    print("=== DOC-NAV-09 (role-noun in page title) ===")
    print(f"title hits: {len(role_noun_hits)}")
    for p, w in role_noun_hits[:10]:
        print(f"  {p}: {w!r}")

    print()
    print("=== DOC-NAV-12 (stub/short page under 150 words with 0 links, or placeholder text) ===")
    print(f"pages: {len(stub_pages_no_link)}/{len(files)}")
    for p, n, has_link, has_ph in stub_pages_no_link[:15]:
        print(f"  {p}: words={n} has_link={has_link} placeholder={has_ph}")

    print()
    print("=== DOC-NAV-10 / DOC-NAV-11 / DOC-NAV-15 (site-config + rule-text greps) ===")
    for repo, cfgs in [
        ("ocx", ["ocx/website/.vitepress/config.mts"]),
        ("ocx-catalog", ["ocx-catalog/mkdocs.yml"]),
        ("grimoire-indexer", ["grimoire-indexer/mkdocs.yml"]),
        ("ocx-mirror-sdk", ["ocx-mirror-sdk/mkdocs.yml"]),
        ("ocx-sdk-python", ["ocx-sdk-python/mkdocs.yml"]),
        ("ocx-indexbot", ["ocx-indexbot/mkdocs.yml"]),
        ("ocx-mirror", ["ocx-mirror/mkdocs.yml"]),
        ("ocx-mcp", ["ocx-mcp/mkdocs.yml"]),
        ("grimoire", ["grimoire/docs/book.toml"]),
    ]:
        for cfg in cfgs:
            try:
                text = open(cfg, encoding="utf-8", errors="replace").read()
            except OSError:
                print(f"  {cfg}: MISSING")
                continue
            zr = bool(ZERO_RESULT_RE.search(text))
            syn = SYNONYM_KEY_RE.findall(text)
            print(f"  {cfg}: zero-result-hook={zr}  synonym-keys-present={syn}")


if __name__ == "__main__":
    main()
