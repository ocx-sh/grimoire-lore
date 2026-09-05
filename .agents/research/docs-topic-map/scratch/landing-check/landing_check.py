#!/usr/bin/env python3
"""Reconciled landing-page check (DOC-TYPE-11/12/13), markdown-source-level.

Portable across MkDocs Material, VitePress and mdBook: never parses a
generator-specific frontmatter shape as its ONLY path. Frontmatter hero/features
arrays are read as a bonus signal when present (VitePress), never required.

Usage: landing_check.py <file.md> [file.md ...]
"""
import re
import sys

FENCE_RE = re.compile(r"^```")
H2_RE = re.compile(r"^##\s")
# inline [text](url), reference-style [text][ref] / [text][], and a bare
# reference-style link footer definition `[ref]: url`.
INLINE_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)(?:\s+[^)]*)?\)")
REF_LINK_RE = re.compile(r"\[([^\]]+)\]\[([^\]]*)\]")
REF_DEF_RE = re.compile(r"^\[([^\]]+)\]:\s*(\S+)", re.M)
HTML_A_RE = re.compile(r'<a\s+href=["\']([^"\']+)["\']', re.I)
LIST_ITEM_RE = re.compile(r"^\s*(?:[-*]|\d+\.)\s+")
PLACEHOLDER_RE = re.compile(r"lorem ipsum|placeholder text|TODO: write|coming soon", re.I)
ADMONITION_OPEN_RE = re.compile(r"^!!!\s|^:::\s*\w")
ADMONITION_CLOSE_RE = re.compile(r"^:::\s*$")
EXTERNAL_RE = re.compile(r"^(https?:|mailto:)", re.I)


def split_frontmatter(text):
    """Return (frontmatter_text_or_None, body_text)."""
    if text.startswith("---\n") or text.startswith("---\r\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = text[4:end]
            body_start = text.find("\n", end + 1)
            body = text[body_start + 1:] if body_start != -1 else ""
            return fm, body
    return None, text


def frontmatter_hero_action_count(fm):
    """Best-effort count of a VitePress `hero.actions:` list. Bonus signal only.
    `actions:` sits nested (indented) under `hero:`, not at column 0."""
    if not fm:
        return None
    m = re.search(r"^\s*actions:\s*$", fm, re.M)
    if not m:
        return None
    action_indent = len(re.match(r"^\s*", m.group()).group())
    lines = fm[m.end():].splitlines()
    count = 0
    for line in lines:
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent <= action_indent:
            break
        if re.match(r"^\s*-\s+theme:", line):
            count += 1
    return count


def hero_window(body):
    """Lines from the start of the body to the FIRST markdown H2 (exclusive).
    Fewer than one H2 means the window is the whole body. This is the strict
    hero/CTA-slot reading, used only for the DOC-TYPE-12 button-CTA cap."""
    lines = body.splitlines()
    h2_idx = [i for i, line in enumerate(lines) if H2_RE.match(line)]
    if h2_idx:
        return lines[:h2_idx[0]]
    return lines


def section_window(body):
    """Lines from the start of the body through the end of its FIRST section
    (i.e. up to the SECOND markdown H2, exclusive). Fewer than two H2s means
    the window is the whole body. Used only for DOC-TYPE-11 reachability.

    Stopping at the first `##` (a literal reading of "before the first
    section heading") was tried first and measured wrong: it fails
    `grimoire-indexer`, `ocx-catalog` and `ocx-mirror`'s own real task-link
    grid, because the fleet's dominant landing shape is title, one sentence,
    then a `## Start here` / `## What it does` section whose content IS the
    CTA. That is the same one-bounded-section allowance DOC-TYPE-07 already
    grants a how-to/reference page's concept preamble, extended here to a
    landing page's own opening section. It must NOT also be used for the
    CTA-count cap (DOC-TYPE-12) -- doing so double-counts a task-link grid as
    if it were button CTAs, the exact conflation DOC-TYPE-12 exists to undo."""
    lines = body.splitlines()
    h2_idx = [i for i, line in enumerate(lines) if H2_RE.match(line)]
    if len(h2_idx) >= 2:
        return lines[:h2_idx[1]]
    return lines


def build_ref_defs(body):
    """[ref]: url footer definitions, for resolving [text][ref] links."""
    return {k.lower(): v for k, v in REF_DEF_RE.findall(body)}


def extract_links(lines, ref_defs):
    """Yield (url_or_None, is_internal) for every link on these lines,
    ignoring fenced code. url is None when a reference-style link's id has no
    matching footer definition (broken link -- still counted, treated as
    internal since a broken doc-relative link is the common case, per
    DOC-NAV-08/DOC-TYPE-21's territory, not this check's job to catch)."""
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for _text, url in INLINE_LINK_RE.findall(line):
            yield url, not EXTERNAL_RE.match(url)
        for text, ref in REF_LINK_RE.findall(line):
            key = (ref or text).lower()
            url = ref_defs.get(key)
            yield url, (url is None or not EXTERNAL_RE.match(url))
        for url in HTML_A_RE.findall(line):
            yield url, not EXTERNAL_RE.match(url)


def count_fences(lines):
    fences = 0
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            fences += 1
            in_fence = not in_fence
    return fences // 2 + (fences % 2)  # tolerate an unclosed fence


def strip_admonitions(lines):
    """Drop lines belonging to a `!!! type` (MkDocs) or `::: type ... :::`
    (VitePress) callout -- a cross-reference inside a warning aside is not a
    button-style CTA. (Counted for reachability, which wants "any action
    anywhere in the opening block", but not for the CTA budget.)"""
    out = []
    in_admonition = False
    admonition_indent = None
    for line in lines:
        if in_admonition:
            if admonition_indent is not None:
                if line.strip() and (len(line) - len(line.lstrip(" "))) <= admonition_indent:
                    in_admonition = False
                    admonition_indent = None
            elif ADMONITION_CLOSE_RE.match(line):
                in_admonition = False
            if in_admonition:
                continue
        elif ADMONITION_OPEN_RE.match(line):
            in_admonition = True
            admonition_indent = 0 if line.startswith("!!!") else None
            continue
        out.append(line)
    return out


def find_link_bearing_list_groups(body, ref_defs):
    """Group consecutive link-bearing list items (blank-line-separated runs)
    anywhere on the page -- catches MkDocs `grid cards` blocks, VitePress plain
    markdown grids, and mdBook plain lists alike, without needing a component
    name. A heading closes the current group. Returns list of group sizes."""
    lines = body.splitlines()
    groups = []
    current = 0
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("#"):
            if current:
                groups.append(current)
                current = 0
            continue
        is_item = bool(LIST_ITEM_RE.match(line))
        has_link = any(True for _ in extract_links([line], ref_defs))
        if is_item and has_link:
            current += 1
    if current:
        groups.append(current)
    return groups


def check(path):
    text = open(path, encoding="utf-8").read()
    fm, body = split_frontmatter(text)
    ref_defs = build_ref_defs(body)
    hero = hero_window(body)
    section = section_window(body)

    # Reachability (DOC-TYPE-11): does the reader have a real next step --
    # an internal link (another doc page, a relative anchor) or a runnable
    # command -- within the opening section? An external citation link (a
    # protocol spec, a glossary term) does not count: it is a footnote, not a
    # next step, which is what let ocx-mcp read as "reachable" under a naive
    # any-link count.
    reach_fences = count_fences(section)
    reach_internal_links = sum(1 for _url, internal in extract_links(section, ref_defs) if internal)
    hero_actions = frontmatter_hero_action_count(fm)
    reachable = reach_fences >= 1 or reach_internal_links >= 1 or (hero_actions or 0) >= 1

    # CTA budget (DOC-TYPE-12): the strict hero window only -- using the
    # wider section window here would double-count a task-link grid as if it
    # were button CTAs. Internal links only, admonition asides excluded (a
    # cross-reference inside a warning callout is not a primary action).
    cta_window = strip_admonitions(hero)
    cta_links = sum(1 for _url, internal in extract_links(cta_window, ref_defs) if internal)
    cta_count = cta_links + (hero_actions or 0)

    groups = find_link_bearing_list_groups(body, ref_defs)
    task_link_total = sum(groups)
    # Scan the WHOLE file, frontmatter included: ocx-save's real Lorem Ipsum
    # defect sits inside a VitePress `features:` frontmatter `details:`
    # string, not in the markdown body -- a body-only scan misses it.
    placeholder_hit = bool(PLACEHOLDER_RE.search(text))

    return {
        "path": path,
        "DOC-TYPE-11_reachable_action": reachable,
        "cta_count_opening_window": cta_count,
        "cta_over_2": cta_count > 2,
        "task_link_total": task_link_total,
        "task_link_groups": groups,
        "task_link_over_9": task_link_total > 9,
        "max_group_over_4": (max(groups) if groups else 0) > 4,
        "placeholder_text_found": placeholder_hit,
    }


if __name__ == "__main__":
    import json
    for p in sys.argv[1:]:
        print(json.dumps(check(p), indent=2))
