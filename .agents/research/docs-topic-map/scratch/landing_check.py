#!/usr/bin/env python3
"""
Portable, generator-neutral landing-page check (wave-2 commission
`landing-check-portability` + `landing-and-short-page-link-budget`).

No frontmatter-array dependency for the pass/fail decision on DOC-TYPE-11;
frontmatter hero-action detection is one *input signal* among several, not
the only slot the check knows how to read (that was the wave-1 defect).

Usage: python3 landing_check.py <file1.md> [file2.md ...]
"""
import re
import sys
import json

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
FENCE_OPEN_RE = re.compile(r"^\s*```")
ATX_H_RE = re.compile(r"^(#{1,6})\s+\S")
HTML_H_RE = re.compile(r"<h[1-6][\s>]")
LIST_ITEM_RE = re.compile(r"^(\s*)([-*]|\d+[.)])\s+(.*)")
MD_LINK_INLINE_RE = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]+)")
MD_LINK_REF_RE = re.compile(r"(?<!!)\[([^\]]+)\]\[([^\]]*)\]")
MD_AUTOLINK_RE = re.compile(r"<https?://[^>\s]+>")
HTML_A_BLOCK_RE = re.compile(r"^\s*<a\s+[^>]*href=")


def has_any_link(line):
    return bool(
        MD_LINK_INLINE_RE.search(line)
        or MD_LINK_REF_RE.search(line)
        or MD_AUTOLINK_RE.search(line)
    )
WORD_RE = re.compile(r"[A-Za-z']+")

# Generic frontmatter CTA-array detector: a YAML list whose items are
# mappings carrying both a link-like key and a label-like key. Deliberately
# not named "hero" or "VitePress" -- matches the *shape*, wherever a
# generator's frontmatter happens to carry it (0 hits on the 7 MkDocs pages
# and the 1 mdBook page measured below).
FM_LINK_KEY_RE = re.compile(r"^\s*-?\s*(link|href|to|url)\s*:\s*\S")
FM_LABEL_KEY_RE = re.compile(r"^\s*-?\s*(text|title|name|label)\s*:\s*\S")


def strip_frontmatter(text):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def frontmatter_cta_count(fm_text):
    """Count frontmatter entries that pair a link-like key with a label-like
    key within 3 lines of each other -- the generic shape of a hero.actions
    entry, matched by shape rather than by naming any one generator."""
    lines = fm_text.split("\n")
    count = 0
    for i, line in enumerate(lines):
        if not FM_LINK_KEY_RE.match(line):
            continue
        window = lines[max(0, i - 3):i + 1]
        if any(FM_LABEL_KEY_RE.match(w) for w in window):
            count += 1
    return count


WORD_BUDGET = 150  # reuses the number DOC-NAV-06/DOC-DISC-09/16 already use


def analyze(path):
    text = open(path, encoding="utf-8").read()
    fm_text, body = strip_frontmatter(text)
    fm_ctas = frontmatter_cta_count(fm_text)

    prose_words = 0
    in_fence = False
    first_action_at = None      # word position of first CTA/command signal
    first_action_kind = None
    cta_button_count = fm_ctas  # raw <a> buttons outside a list, e.g. ocx's footer cards
    task_link_items = 0         # list items that carry >=1 markdown link

    # A "list item" in MkDocs Material's grid-cards / def-list style is a
    # marker line plus every following line indented deeper than the
    # marker's own column -- the CTA link usually sits on its OWN
    # continuation line, several lines under the bullet, not beside it.
    #
    # DOC-TYPE-12's task-link *budget* counts every link-bearing item on the
    # page (a descriptive list with one citation link still costs a reader
    # one more thing to scan). DOC-TYPE-11's "reaches an action" gate needs a
    # stricter signal: a *menu* -- a run of sibling items where EVERY item
    # links somewhere, not a feature list where one item happens to cite a
    # dependency. A single stray link inside an otherwise-unlinked bullet
    # list (ocx-mcp's "planned"/"TBD" Highlights) must not read as a CTA.
    item_indent = None
    item_has_link = False
    item_word_pos = None
    group_total = 0
    group_linked = 0
    group_start_pos = None

    def close_item():
        nonlocal task_link_items, group_total, group_linked
        if item_indent is not None:
            group_total += 1
            if item_has_link:
                task_link_items += 1
                group_linked += 1

    def close_group():
        nonlocal first_action_at, first_action_kind, group_total, group_linked, group_start_pos
        if group_total > 0 and group_linked == group_total:
            if first_action_at is None:
                first_action_at, first_action_kind = group_start_pos, "all-linked list (menu)"
        group_total, group_linked, group_start_pos = 0, 0, None

    for raw_line in body.split("\n"):
        line = raw_line
        if FENCE_OPEN_RE.match(line):
            if not in_fence and first_action_at is None:
                first_action_at, first_action_kind = prose_words, "fenced block"
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        m_atx = ATX_H_RE.match(line)
        m_html = HTML_H_RE.search(line)
        if m_atx or m_html:
            close_item()
            close_group()
            item_indent = None
            continue  # heading text itself isn't scored as prose or a CTA

        if re.match(r"^\s*\|.*\|\s*$", line):
            continue  # table row

        m_li = LIST_ITEM_RE.match(line)
        stripped_indent = len(line) - len(line.lstrip(" "))
        if m_li:
            if item_indent is not None and stripped_indent <= item_indent:
                close_item()  # sibling marker: same group continues
            item_indent = stripped_indent
            item_has_link = False
            item_word_pos = prose_words
            if group_start_pos is None:
                group_start_pos = prose_words
        elif line.strip() == "":
            pass  # blank line: stays inside the open item (loose list)
        elif item_indent is not None and stripped_indent <= item_indent:
            # dedented, non-list content: the list -- and the group -- ends
            close_item()
            close_group()
            item_indent = None

        if item_indent is not None and has_any_link(line):
            item_has_link = True
        elif item_indent is None and HTML_A_BLOCK_RE.match(line):
            cta_button_count += 1
            if first_action_at is None:
                first_action_at, first_action_kind = prose_words, "HTML anchor button"

        # word count this line contributes (strip inline code + link markup
        # for a rough prose count -- precision to the word doesn't matter,
        # the budget is a 150-word round number already)
        stripped = re.sub(r"`[^`]*`", " ", line)
        stripped = MD_LINK_INLINE_RE.sub(lambda mo: mo.group(1), stripped)
        stripped = MD_LINK_REF_RE.sub(lambda mo: mo.group(1), stripped)
        prose_words += len(WORD_RE.findall(stripped))

    close_item()
    close_group()

    action_within_budget = fm_ctas > 0 or (
        first_action_at is not None and first_action_at <= WORD_BUDGET
    )

    return {
        "file": path,
        "words_total_scanned": prose_words,
        "frontmatter_ctas": fm_ctas,
        "first_action_word_pos": first_action_at,
        "first_action_kind": first_action_kind,
        "DOC-TYPE-11_pass": action_within_budget,
        "cta_button_count": cta_button_count,
        "task_link_items": task_link_items,
        "DOC-TYPE-12_cta_ok": cta_button_count <= 2,
        "DOC-TYPE-12_tasklinks_ok": task_link_items <= 9,
    }


if __name__ == "__main__":
    results = [analyze(p) for p in sys.argv[1:]]
    print(json.dumps(results, indent=2))
