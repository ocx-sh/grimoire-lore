#!/usr/bin/env python3
"""Landing-page checks, as a markdown scan.

Covers DOC-TYPE-10 (lead-in prose), DOC-TYPE-11 (a reachable action),
DOC-TYPE-12 (call-to-action and task-link budgets), DOC-TYPE-13 (who the docs
are for, true-zero case only), DOC-TYPE-14 (placeholder text) and
DOC-TYPE-15 (unsourced adoption claims).

No generator-specific frontmatter shape decides anything. A frontmatter block
that pairs a link key with a label key is read as one more action signal,
never as the only slot the check knows. The wave-1 version parsed VitePress
hero arrays and was inert on 8 of 9 fleet sites.

DOC-TYPE-10 to DOC-TYPE-13 run only on pages declaring doc_type: landing.
DOC-TYPE-14 and DOC-TYPE-15 run on every page.

A page that also declares doc_surface: pitch keeps its words in a component, so
a source scan cannot see them. DOC-TYPE-10 to DOC-TYPE-12 skip that page's
source and run over its built route instead (--built DIST, the pages whose
built <meta name="doc-surface"> says pitch). DOC-TYPE-13 stays on the source.

Usage: landing_check.py [--root DIR] [PATH ...] [--format text|json] [--self-test]
       landing_check.py --built DIST [--format text|json]
Exit 0 clean, 1 findings, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import doc_declaration as dd
import strip_prose as sp
from strip_prose import Finding

# DOC-TYPE-11. 150 words, reused from DOC-NAV-06, DOC-DISC-09 and DOC-DISC-16
# rather than invented. Measured failures: two fleet landing pages at word 176
# and word 186, one at word 215.
ACTION_WORD_BUDGET = 150
# DOC-TYPE-10. One sentence, measured across five fetched exemplars. The
# 30-word warning is argued from those same five pages.
LEAD_IN_WORD_WARNING = 30
# DOC-TYPE-12. Re-measured: uv 2, GitLab 1, Stripe about 3, one fleet page 7.
CTA_CAP = 2
# DOC-TYPE-12's second arm, argued from the smallest grouped exemplar section.
UNGROUPED_TASK_LINK_WARNING = 8

LIST_ITEM = re.compile(r"^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$")
HTML_ANCHOR = re.compile(r"^\s*<a\s+[^>]*href=", re.IGNORECASE)
ANY_LINK = re.compile(r"(?<!!)\[[^\]]*\]\([^)\s]+|(?<!!)\[[^\]]+\]\[[^\]]*\]|<https?://[^>\s]+>")
COMMAND_BLOCK = re.compile(r"^\s*(?:`{3,}|~{3,}|<<<|--8<--)|\{\{#include")
# DOC-TYPE-14. The one historical fleet violation is verbatim scaffold copy.
PLACEHOLDER = re.compile(r"lorem ipsum|placeholder text|TODO: write|coming soon", re.IGNORECASE)
# DOC-TYPE-15, tightened. The bare "trusted by" arm produced 3 of 3 false
# positives on security trust-model prose, so it now needs a count noun.
ADOPTION_CLAIM = re.compile(
    r"trusted by (?:thousands|millions|leading|[0-9,]+\+? (?:companies|developers|teams))|"
    r"used by (?:thousands|leading)|"
    r"[0-9,]+\+? (?:companies|developers|teams)\b",
    re.IGNORECASE,
)
READER_SENTENCE = re.compile(
    r"\bfor (?:developers|engineers|users|teams|beginners|newcomers|operators)\b|"
    r"\bif you (?:are|'re) (?:a|an)\b|\bthis (?:site|documentation|guide) is for\b",
    re.IGNORECASE,
)
FM_LINK_KEY = re.compile(r"^\s*-?\s*(?:link|href|to|url)\s*:\s*\S")
FM_LABEL_KEY = re.compile(r"^\s*-?\s*(?:text|title|name|label)\s*:\s*\S")


def split_front_matter(text: str) -> tuple[str, str, int]:
    """Return (front matter, body, body's first line number)."""
    m = sp.FRONT_MATTER.match(text)
    if not m:
        return "", text, 1
    return m.group(0), text[m.end() :], m.group(0).count("\n") + 1


def front_matter_ctas(front: str) -> int:
    """Count entries that pair a link-like key with a nearby label-like key."""
    lines = front.split("\n")
    return sum(
        1
        for i, line in enumerate(lines)
        if FM_LINK_KEY.match(line)
        and any(FM_LABEL_KEY.match(w) for w in lines[max(0, i - 3) : i + 1])
    )


def scan(body: str, offset: int) -> dict:
    """One pass over the body: word positions, actions, and link-bearing lists."""
    words = 0
    fence = None
    action: tuple[int, int, str] | None = None
    anchors: list[int] = []
    groups: list[tuple[int, int, int]] = []  # (start line, items, linked items)
    indent = None
    item_linked = False
    total = linked = 0
    group_line = group_words = 0

    def close_item():
        nonlocal total, linked
        if indent is not None:
            total += 1
            linked += 1 if item_linked else 0

    def close_group():
        # The menu counts from where it starts, not from where it ends. Using
        # the closing position put one real grid of task links at word 351.
        nonlocal total, linked, action
        if total:
            groups.append((group_line, total, linked))
            if linked == total and total >= 2 and action is None:
                action = (group_line, group_words, "link menu")
        total = linked = 0

    for line_no, line in enumerate(body.split("\n"), start=offset):
        if fence is not None:
            if sp.FENCE.match(line) and sp.FENCE.match(line).group(2)[0] == fence[0]:
                fence = None
            continue
        if COMMAND_BLOCK.search(line):
            m = sp.FENCE.match(line)
            if m:
                fence = m.group(2)
            if action is None:
                action = (line_no, words, "runnable command")
            continue
        if sp.HEADING.match(line):
            close_item()
            close_group()
            indent = None
            continue
        item = LIST_ITEM.match(line)
        depth = len(line) - len(line.lstrip(" "))
        if item:
            if indent is not None and depth <= indent:
                close_item()
            elif indent is None:
                group_line, group_words = line_no, words
            indent = depth
            item_linked = False
        elif line.strip() and indent is not None and depth <= indent:
            close_item()
            close_group()
            indent = None
        if indent is not None and ANY_LINK.search(line):
            item_linked = True
        elif indent is None and HTML_ANCHOR.match(line):
            anchors.append(line_no)
            if action is None:
                action = (line_no, words, "anchor button")
        words += len(sp.WORD.findall(sp.inline(line)))
    close_item()
    close_group()
    return {"words": words, "action": action, "anchors": anchors, "groups": groups}


def lead_in(body: str, offset: int) -> tuple[int, int, int]:
    """Words, sentence terminators and line number of the block that opens the page."""
    lines = body.split("\n")
    heads = [i for i, ln in enumerate(lines) if sp.HEADING.match(ln)]
    start = heads[0] + 1 if heads and sp.HEADING.match(lines[heads[0]]).group(1) == "#" else 0
    end = len(lines)
    for i in range(start, len(lines)):
        # The lead-in ends where a list or an admonition starts: a hub's link
        # list and a caution box are not positioning prose.
        if (
            sp.HEADING.match(lines[i])
            or COMMAND_BLOCK.search(lines[i])
            or LIST_ITEM.match(lines[i])
            or sp.ADMONITION.match(lines[i])
        ):
            end = i
            break
    block = sp.strip("\n".join(lines[start:end]))
    return sp.word_count(block), len(re.findall(r"[.!?]", block)), start + offset


def check(path: str, text: str, root: str) -> list[Finding]:
    out: list[Finding] = []
    for line_no, line in enumerate(text.split("\n"), start=1):
        if PLACEHOLDER.search(line):
            out.append(
                Finding(
                    path,
                    line_no,
                    "DOC-TYPE-14",
                    "placeholder text, this reaches readers as published copy",
                )
            )
        m = ADOPTION_CLAIM.search(line)
        if m and not ANY_LINK.search(line):
            out.append(
                Finding(
                    path,
                    line_no,
                    "DOC-TYPE-15",
                    f"adoption claim {m.group(0)!r} with no link to its source",
                )
            )
    decl = sp.declaration(text)
    if decl.get("doc_type") != "landing":
        return out

    front, body, offset = split_front_matter(text)
    # A declared pitch is judged on its built route for DOC-TYPE-10 to 12.
    rules = ("13",) if decl.get("doc_surface") == "pitch" else ("10", "11", "12", "13")
    return out + landing_findings(path, front, body, offset, rules)


def landing_findings(
    path: str, front: str, body: str, offset: int, rules: tuple[str, ...]
) -> list[Finding]:
    """DOC-TYPE-10 to 13 over one body. `rules` holds the numbers to run."""
    out: list[Finding] = []
    ctas = front_matter_ctas(front)
    found = scan(body, offset)

    words, stops, line_no = lead_in(body, offset)
    if "10" in rules and stops > 1:
        out.append(
            Finding(
                path,
                line_no,
                "DOC-TYPE-10",
                f"{stops} sentences of lead-in positioning prose, one is the "
                "measured shape across five exemplars",
            )
        )
    elif "10" in rules and words > LEAD_IN_WORD_WARNING:
        out.append(
            Finding(
                path,
                line_no,
                "DOC-TYPE-10",
                f"{words} words of lead-in prose over an argued {LEAD_IN_WORD_WARNING}",
            )
        )

    action = found["action"]
    if "11" in rules and ctas == 0 and (action is None or action[1] > ACTION_WORD_BUDGET):
        where = f"word {action[1]}" if action else "nowhere on the page"
        out.append(
            Finding(
                path,
                action[0] if action else line_no,
                "DOC-TYPE-11",
                f"first runnable command or link menu is at {where}, "
                f"budget is word {ACTION_WORD_BUDGET}",
            )
        )

    # The button budget counts the hero slot only, which ends at the first H2.
    # Counting the whole opening section would read a task-link grid as if it
    # were a stack of buttons, the exact conflation this rule undoes.
    hero_end = next(
        (
            n
            for n, ln in enumerate(body.split("\n"), start=offset)
            if sp.HEADING.match(ln) and len(sp.HEADING.match(ln).group(1)) == 2
        ),
        offset + len(body.split("\n")),
    )
    buttons = ctas + sum(1 for n in found["anchors"] if n <= hero_end)
    if "12" in rules and buttons > CTA_CAP:
        out.append(
            Finding(
                path,
                line_no,
                "DOC-TYPE-12",
                f"{buttons} button-style calls to action, cap is {CTA_CAP}, "
                "a reader gets no hierarchy from a stack of them",
            )
        )
    ungrouped = sum(linked for _, total, linked in found["groups"] if linked == total)
    if "12" in rules and ungrouped > UNGROUPED_TASK_LINK_WARNING and len(found["groups"]) < 2:
        out.append(
            Finding(
                path,
                found["groups"][0][0],
                "DOC-TYPE-12",
                f"{ungrouped} task links in one ungrouped run, label groups "
                f"past about {UNGROUPED_TASK_LINK_WARNING}",
            )
        )

    if "13" in rules and not found["groups"] and not READER_SENTENCE.search(sp.strip(body)):
        out.append(
            Finding(
                path,
                line_no,
                "DOC-TYPE-13",
                "no task-link menu and no sentence naming the reader, so the "
                "page never says who it is for",
            )
        )
    return out


# --- built route (DOC-TYPE-10 to 12 on a declared pitch) ----------------------

BLOCK_TAGS = {
    "p", "div", "section", "article", "header", "footer", "main", "li", "ul", "ol",
    "h1", "h2", "h3", "h4", "h5", "h6", "pre", "br", "table", "tr", "form",
}  # fmt: skip
INLINE_CONTEXT = {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6"}


class _Markdownish(HTMLParser):
    """Turn <main> of a built page into the markdown shapes scan() reads.

    Headings become `#`, list items `- `, links `[t](h)` inside text and a raw
    `<a href>` line when the link stands alone, <pre> a fence, <aside> a
    `:::` marker. Scripts and styles are dropped.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lines: list[str] = []
        self.buf = ""
        self.prefix = ""
        self.in_main = False
        self.skip = 0
        self.pre = False
        self.ctx: list[str] = []
        self.href: str | None = None
        self.link_text = ""
        self.link_inline = False

    def flush(self) -> None:
        text = " ".join(self.buf.split())
        if text:
            self.lines += [self.prefix + text, ""]
        self.buf = self.prefix = ""

    def handle_starttag(self, tag: str, attrs: list) -> None:
        a = dict(attrs)
        if tag == "main":
            self.in_main = True
        if not self.in_main:
            return
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "a" and a.get("href"):
            self.link_inline = any(c in INLINE_CONTEXT for c in self.ctx)
            if not self.link_inline:
                self.flush()
            self.href, self.link_text = a["href"], ""
        elif tag == "aside":
            self.flush()
            self.lines += [":::note", ""]
        elif tag == "pre":
            self.flush()
            self.lines.append("```")
            self.pre = True
        elif tag in BLOCK_TAGS:
            self.flush()
            if tag in INLINE_CONTEXT:
                self.ctx.append(tag)
            if tag == "li":
                self.prefix = "- "
            elif tag[0] == "h" and len(tag) == 2:
                self.prefix = "#" * int(tag[1]) + " "

    def handle_endtag(self, tag: str) -> None:
        if not self.in_main:
            return
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        if tag == "a" and self.href is not None:
            label = " ".join(self.link_text.split())
            if self.link_inline:
                self.buf += f"[{label}]({self.href})"
            else:
                self.lines += [f'<a href="{self.href}">{label}</a>', ""]
            self.href = None
        elif tag == "pre":
            self.lines += ["```", ""]
            self.pre = False
        elif tag in BLOCK_TAGS:
            self.flush()
            if tag in INLINE_CONTEXT and tag in self.ctx:
                self.ctx.remove(tag)
        elif tag == "main":
            self.flush()
            self.in_main = False

    def handle_data(self, data: str) -> None:
        if not self.in_main or self.skip:
            return
        if self.href is not None:
            self.link_text += data
        elif self.pre:
            self.lines.append(data.rstrip("\n"))
        else:
            self.buf += data


def html_to_markdown(html: str) -> str:
    p = _Markdownish()
    p.feed(html)
    p.flush()
    return "\n".join(p.lines)


def check_built(dist: Path) -> tuple[list[Finding], int]:
    """DOC-TYPE-10 to 12 over every built page whose meta declares pitch.

    Returns the findings and how many pages were read.
    """
    out: list[Finding] = []
    read = 0
    for page in sorted(dist.rglob("*.html")):
        html = page.read_text(encoding="utf-8", errors="replace")
        if dd.built_surface(html)[0] != ["pitch"]:
            continue
        read += 1
        out += landing_findings(str(page), "", html_to_markdown(html), 1, ("10", "11", "12"))
    return out, read


def _built_self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "landing_check"

    def expect(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"built self-test FAILED: {what}")

    hits, read = check_built(here / "built-pass")
    expect(read == 1 and not hits, f"built-pass: {read} pages, findings {hits}")
    hits, read = check_built(here / "built-fail")
    rules = {h.rule for h in hits}
    expect(read == 1 and {"DOC-TYPE-10", "DOC-TYPE-12"} <= rules, f"built-fail: {read}, {rules}")
    md = html_to_markdown(
        '<main><h1>T</h1><p>Hi <a href="/x">x</a></p><ul><li><a href="/y">y</a></li></ul>'
        '<a href="/z">z</a><pre>cmd</pre><aside>n</aside></main>'
    )
    expect(
        md.split("\n")[0] == "# T"
        and "- [y](/y)" in md
        and '<a href="/z">z</a>' in md
        and "```" in md
        and ":::note" in md,
        f"html_to_markdown shapes: {md!r}",
    )
    print("built self-test ok: a pitch route is read, a clean one passes, a stacked one fails")
    return 0


def main() -> int:
    if "--built" in sys.argv[1:]:
        ap = argparse.ArgumentParser(description="DOC-TYPE-10 to 12 on built pitch pages")
        ap.add_argument("--built", required=True, metavar="DIST")
        ap.add_argument("--format", choices=("text", "json"), default="text")
        args = ap.parse_args()
        dist = Path(args.built)
        if not dist.is_dir():
            print(f"landing_check: no such directory: {dist}", file=sys.stderr)
            return 2
        findings, read = check_built(dist)
        sp.emit(findings, args.format)
        print(f"landing_check: {read} built pitch pages read", file=sys.stderr)
        return 1 if findings else 0
    return sp.run_cli(__doc__ or "", check, "landing_check", extra_self_test=_built_self_test)


if __name__ == "__main__":
    sys.exit(main())
