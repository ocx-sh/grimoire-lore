---
title: Landing-page check portability, and the short-page link budget
topic: landing-check-portability + landing-and-short-page-link-budget (merged)
group: docs-page-types + docs-navigation-search
wave: 2
agent: wave2-landing-portability-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 9
scope: |
  Answers two wave-2 commissions together because they touch the same rules
  (DOC-TYPE-10 to DOC-TYPE-16, DOC-NAV-03, DOC-NAV-12). Rewrites DOC-TYPE-11's
  and DOC-TYPE-12's verification as a markdown-source-level check that runs on
  a repo checkout with no generator-specific parsing as its only path, tests
  it against all 9 real fleet landing pages plus the stale `ocx-save` clone,
  and reconciles the three-way link-budget conflict between DOC-NAV-12,
  DOC-TYPE-12/13 and DOC-DISC-10. Re-fetches the five exemplar landing pages
  and the Atlassian empty-state page live. Does not redesign DOC-DISC-09/10
  (already reconciled by `severity-and-check-audit`, read and adopted here)
  or the declaration carrier (already reconciled by
  `declaration-key-unification`, read and adopted here).
revises:
  - docs-page-types.md
  - docs-navigation-search.md
---

## Verdict

**Ships.** DOC-TYPE-11's "cannot verify" was the real defect, not the concept:
a markdown-source-level scan (links and fenced blocks, counted before and
through the page's own opening section) runs identically on MkDocs Material,
VitePress and mdBook with no frontmatter dependency, and it correctly
reproduces every previously-claimed fleet failure it was tested against
**except two, which the check disproves on direct re-read of the file** —
`ocx-sdk-python` and `ocx-mirror-sdk` both carry a real, immediate task-link
grid one section after their pre-1.0 warning, not "no action at all" as wave 1
claimed. `grimoire`'s own landing page fails DOC-TYPE-11 instead, previously
unnamed among the "four known failures" but already implied by
`docs-shape.md` §7's own row for it.

The link-budget conflict is a three-way object conflation, and a parallel
wave-2 pass (`severity-and-check-audit`, read in full before writing this)
independently reached the same split I was converging on and made it
authoritative first: **DOC-TYPE-12 owns landing pages, DOC-DISC-09/10 own
stub content pages, DOC-NAV-12 owns only a rendered empty-result state or a
custom 404 template.** That pass also re-fetched Atlassian's empty-state page
and found the same thing I independently found before reading it: the page
gives no button-count number at all. This file adopts that split, sets
DOC-NAV-12's remaining number, and supplies the fleet-wide run the ledger
deferred to this commission.

## 1. The landing check, re-specified

### 1.1 What was broken

DOC-TYPE-11 (MUST) required scanning to the first `##` for "one fenced block
or one link inside the declared CTA slot," reporting "cannot verify" with no
such slot. DOC-TYPE-12 (SHOULD) parsed "the frontmatter hero-actions and
features arrays" — a VitePress-only shape. Only `ocx` carries either. On the
other 8 of 9 real sites (7 MkDocs Material, 1 mdBook) both checks were inert.

### 1.2 The fix, and why the naive version was still wrong once

The obvious portable rewrite — count links and fenced code blocks in the
markdown source, stopping at the first `##` — was tried first (it's also what
`severity-and-check-audit` independently measured while triaging DOC-TYPE-11's
severity; see its table, reproduced below). It runs on 9 of 9 sites, which
already fixes the inertness. But run against real pages it under-detects: it
misses `grimoire-indexer`'s, `ocx-catalog`'s and `ocx-mirror`'s own real
task-link grid, because the fleet's dominant landing shape is *title, one
sentence, then a `## Start here` / `## What it does` section whose content IS
the call to action* — the grid sits one heading past the boundary the literal
reading stops at.

The shipped design uses **two different windows for two different questions**,
which also happens to resolve the "collapsing CTA-count and task-link-count"
defect DOC-TYPE-12 already names as the actual cause of `ocx`'s 7-CTA page:

- **Reachability (DOC-TYPE-11)** scans through the end of the page's *first
  section* — up to the **second** `##`, not the first. This is the same
  one-bounded-section allowance DOC-TYPE-07 already grants a how-to or
  reference page's concept preamble, extended here to a landing page's own
  opening section.
- **CTA count (DOC-TYPE-12)** scans only the strict hero window — up to the
  **first** `##`. Using the wider window here would double-count a task-link
  grid as if it were button CTAs, which is exactly the conflation the rule
  exists to prevent.
- **Task-link count (DOC-TYPE-12/13)** scans the *whole page* for
  consecutive runs of link-bearing list items (a heading closes a run),
  independent of either boundary — this is what catches a card grid wherever
  on the page it sits, without needing a component name.

Two more corrections, both found only by running the check against real
files, not by reasoning about it:

- **A citation is not a next step.** `ocx-mcp`'s opening paragraph links
  `[Model Context Protocol][mcp]` and `[OCX][ocx]` — both external — and a
  naive any-link count reads that as "reachable." An external link (absolute
  `http(s)://` or `mailto:`) never counts toward reachability or the CTA
  budget; only an internal link (a relative path to another doc, the common
  case for a real next step) or a fenced command does. This is what
  correctly keeps `ocx-mcp` failing once the section window is widened for
  everything else.
- **An admonition aside is not a CTA.** `ocx-catalog`'s opening `!!! warning`
  callout carries two real cross-reference links before its own real task
  grid. Counted naively, that reads as "3 CTAs, over the cap of 2" — a false
  positive on the fleet's own best "who is this for" example
  (`docs-page-types.md` finding 5). Links inside a `!!!`/`:::` callout are
  excluded from the CTA count (kept for reachability, since a link inside a
  warning still gives a reader somewhere to click).

### 1.3 The check

Portable Python, standard library only, no generator SDK. Reads the raw
markdown file; frontmatter `hero.actions:` is read as a bonus signal when
present (VitePress) and is never the only path.

```python
#!/usr/bin/env python3
"""Reconciled landing-page check (DOC-TYPE-11/12/13), markdown-source-level.
Portable across MkDocs Material, VitePress and mdBook."""
import re

FENCE_RE = re.compile(r"^```")
H2_RE = re.compile(r"^##\s")
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
    if text.startswith("---\n") or text.startswith("---\r\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = text[4:end]
            body_start = text.find("\n", end + 1)
            return fm, (text[body_start + 1:] if body_start != -1 else "")
    return None, text


def frontmatter_hero_action_count(fm):
    """VitePress `hero.actions:`, nested under `hero:`. Bonus signal only."""
    if not fm:
        return None
    m = re.search(r"^\s*actions:\s*$", fm, re.M)
    if not m:
        return None
    action_indent = len(re.match(r"^\s*", m.group()).group())
    count = 0
    for line in fm[m.end():].splitlines():
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent <= action_indent:
            break
        if re.match(r"^\s*-\s+theme:", line):
            count += 1
    return count


def hero_window(body):
    """Up to the FIRST `##` -- strict, for the CTA-count cap only."""
    lines = body.splitlines()
    idx = [i for i, l in enumerate(lines) if H2_RE.match(l)]
    return lines[:idx[0]] if idx else lines


def section_window(body):
    """Up to the SECOND `##` -- one bounded opening section, for
    reachability only. See 1.2 for why the strict window under-detects."""
    lines = body.splitlines()
    idx = [i for i, l in enumerate(lines) if H2_RE.match(l)]
    return lines[:idx[1]] if len(idx) >= 2 else lines


def build_ref_defs(body):
    return {k.lower(): v for k, v in REF_DEF_RE.findall(body)}


def extract_links(lines, ref_defs):
    """Yield (url, is_internal) for every link, fenced code excluded."""
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for _t, url in INLINE_LINK_RE.findall(line):
            yield url, not EXTERNAL_RE.match(url)
        for text, ref in REF_LINK_RE.findall(line):
            url = ref_defs.get((ref or text).lower())
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
    return fences // 2 + (fences % 2)


def strip_admonitions(lines):
    """A `!!! type` (MkDocs) or `::: type ... :::` (VitePress) aside is not
    a button-style CTA."""
    out, in_adm, adm_indent = [], False, None
    for line in lines:
        if in_adm:
            if adm_indent is not None:
                if line.strip() and (len(line) - len(line.lstrip(" "))) <= adm_indent:
                    in_adm, adm_indent = False, None
            elif ADMONITION_CLOSE_RE.match(line):
                in_adm = False
            if in_adm:
                continue
        elif ADMONITION_OPEN_RE.match(line):
            in_adm, adm_indent = True, (0 if line.startswith("!!!") else None)
            continue
        out.append(line)
    return out


def find_link_bearing_list_groups(body, ref_defs):
    """Consecutive link-bearing list items, anywhere on the page, grouped by
    the nearest heading -- catches a card grid regardless of component name."""
    groups, current, in_fence = [], 0, False
    for line in body.splitlines():
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
        if LIST_ITEM_RE.match(line) and any(True for _ in extract_links([line], ref_defs)):
            current += 1
    if current:
        groups.append(current)
    return groups


def check(path):
    text = open(path, encoding="utf-8").read()
    fm, body = split_frontmatter(text)
    ref_defs = build_ref_defs(body)
    hero, section = hero_window(body), section_window(body)
    hero_actions = frontmatter_hero_action_count(fm)

    reach_fences = count_fences(section)
    reach_internal = sum(1 for _u, i in extract_links(section, ref_defs) if i)
    reachable = reach_fences >= 1 or reach_internal >= 1 or (hero_actions or 0) >= 1

    cta_window = strip_admonitions(hero)
    cta_count = sum(1 for _u, i in extract_links(cta_window, ref_defs) if i) + (hero_actions or 0)

    groups = find_link_bearing_list_groups(body, ref_defs)
    task_link_total = sum(groups)

    return {
        "path": path,
        "DOC-TYPE-11_reachable_action": reachable,
        "cta_count": cta_count, "cta_over_2": cta_count > 2,
        "task_link_total": task_link_total, "task_link_groups": groups,
        "task_link_over_9": task_link_total > 9,
        "max_group_over_4": (max(groups) if groups else 0) > 4,
        "placeholder_text_found": bool(PLACEHOLDER_RE.search(text)),
    }
```

Working, tested copy (with the self-check below):
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/landing-check/landing_check.py`.
Ship it to `checks/landing-page.py`.

A minimal self-check, the smallest thing that fails if the internal/external
distinction breaks:

```python
# an external citation link must not satisfy reachability; an internal
# next-step link must.
CAVEAT_ONLY = """# Widget
Widgets follow the [Widget Protocol][wp], an open standard.
!!! warning "Not implemented yet"
    Nothing works yet.
## Highlights
- stuff
[wp]: https://widget-protocol.example
"""
CAVEAT_WITH_NEXT_STEP = CAVEAT_ONLY.replace(
    "## Highlights", "See [Getting Started][gs] for the current state.\n\n## Highlights"
) + "[gs]: ./getting-started.md\n"
# check(CAVEAT_ONLY)["DOC-TYPE-11_reachable_action"] is False
# check(CAVEAT_WITH_NEXT_STEP)["DOC-TYPE-11_reachable_action"] is True
```

### 1.4 Run against all 9 real fleet landing pages, plus `ocx-save`

| Page | Generator | DOC-TYPE-11 reach | CTA count (cap 2) | Task links (cap 9) | Placeholder |
|---|---|---|---|---|---|
| `ocx/website/src/index.md` | VitePress | pass | **5 — fails** | 3 | clean |
| `ocx-catalog/docs/index.md` | MkDocs | pass | 1 | 0 | clean |
| `grimoire/docs/src/introduction.md` | mdBook | **fail** | 0 | 5 | clean |
| `ocx-mcp/docs/index.md` | MkDocs | **fail** | 0 | 5 | clean |
| `ocx-sdk-python/docs/index.md` | MkDocs | pass* | 0 | 7 | clean |
| `ocx-mirror-sdk/docs/index.md` | MkDocs | pass* | 0 | 8 | clean |
| `ocx-mirror/docs/index.md` | MkDocs | pass* | 0 | 9 | clean |
| `ocx-indexbot/docs/index.md` | MkDocs | pass | 2 | 0 | clean |
| `grimoire-indexer/docs/index.md` | MkDocs | pass* | 0 | 4 | clean |
| `ocx-save/website/src/index.md` (stale clone) | VitePress | pass | **3 — fails** | 0 | **found** |

`*` = passes under the corrected (section-window, internal-link-only) check;
failed or read as ambiguous under the literal first-`##` reading. See §1.5.

This reproduces the four originally-claimed failures — `ocx-mcp` (no action),
`ocx` (CTA cap), `ocx-save` (placeholder) — and confirms `ocx-catalog` passes
clean, as the commission asked. It also surfaces one the four-item list
didn't name: `grimoire`'s own landing page has no internal link and no
fenced block in its opening section either (`docs-shape.md` §7 already said
so: "none in the opening — SUMMARY.md sidebar is the nav, no in-page CTA" —
this check just gives that observation a runnable form).

### 1.5 A correction to a wave-1 claim, found only by re-reading the files

`docs-page-types.md` finding 2 and `landing-page-contract.md` finding 2 both
state that `ocx-sdk-python` and `ocx-mirror-sdk` "reach no action at all"
after their pre-1.0 caveat. Reading the actual files:

```
ocx-sdk-python/docs/index.md
  # ocx-sdk
  !!! warning "Pre-1.0 ..."
  **Typed Python handles over [ocx](https://ocx.sh)** -- ...
  ## At a glance
  <div class="grid cards" markdown>
  - [Quickstart](guide/quickstart.md)
  - [Guide](guide/projects.md)
  - [API reference](reference/api.md)
  - [Contributing](contributing/index.md)
  </div>
```

The very next section after the warning is a 4-card grid of real, internal
next steps — not "no action," an immediate one. `ocx-mirror-sdk/docs/index.md`
carries the identical shape. `severity-and-check-audit`'s own preliminary
measurement (its DOC-TYPE-11 table) independently found the same thing under
a stricter, unextended window — its raw counts for both pages are 2, not 0 —
and named `ocx-mcp` and `ocx-mirror` (not `ocx-sdk-python`/`ocx-mirror-sdk`)
as the two that read as genuinely empty under that reading. The
section-window fix (§1.2) resolves `ocx-mirror` too, once its own "## What it
does" bullet list — which links `mirror.yml reference` and `pipeline
generate ci`, both internal — is included.

Net effect: of the two pages wave 1 named as the joint worked example for
"caveat opening with zero resolution," only one (`ocx-mcp`) still fails on
direct, corrected re-measurement. This is the same class of correction
`severity-and-check-audit` made for the mdBook search-boost claim (DOC-NAV-13)
and the wave-1 critique praised two other groups for making at their own
primary source — a fact worth landing plainly rather than smoothing over.

### 1.6 Re-fetching the five exemplar landing pages

Fetched live 2026-09-05 (not from the earlier sub-artifact's cache):

| Site | Button CTAs | Task-link grid(s) |
|---|---|---|
| Stripe (`docs.stripe.com`) | 0 (every next step is a task link) | 9, in 3 groups of 3 — reconfirms the original reading exactly |
| uv (`docs.astral.sh/uv`) | 0 | ~5 (Getting started / First steps / Installation / Guides / Concepts) |
| Cloudflare Workers | 2 in the hero ("Deploy a template", "Deploy with Wrangler CLI") | a first grid of 5, **then a second grid of ≈15 items in 3 groups of 5** |
| GitLab docs home | 4 on this fetch (was 2 in the earlier pass) | three grids, roughly 11 + 7 + 5 = 23 items total |
| Laravel docs | reconfirmed: five sub-headed marketing paragraphs before the first install command | n/a |

**The CTA cap of 2 holds up as a hero-level pattern**: every exemplar with a
clean hero (Cloudflare) or none at all (Stripe, uv) keeps button-style CTAs
at 0–2; only the negative example (GitLab, and the fleet's own `ocx`/`ocx-save`)
runs higher. **The task-link cap of 9 does not hold up**: Cloudflare's own
second grid alone is larger than the proposed ceiling, sitting right next to
a hero that is otherwise the cleanest 2-CTA example in the corpus, and
GitLab's total moved from 19 (first fetch) to roughly 23 (this fetch) —
messier either way, but not stably "19" or "9." This independently confirms
`severity-and-check-audit`'s own demotion of DOC-TYPE-12's numbers (see
below): the structural separation of CTA-count from task-link-count is well
supported; the specific integers are argued, not measured, and should read
that way.

## 2. The link budget, reconciled

### 2.1 The conflict, and the split already decided in parallel

Three rules fired on the same short page with different verdicts:
`DOC-NAV-12` failed any page under 150 words with zero or two-plus links;
`DOC-TYPE-12` permitted up to 2 CTAs plus 9 task links on a landing page;
`DOC-DISC-10` exempted a 20-word first-steps page outright.
`ocx-catalog/docs/index.md` — the fleet's only "who is this for" success,
zero prose, a 5-card task grid — passed the landing rule and failed
DOC-NAV-12 for having zero *body* links even though its grid links plainly.

`severity-and-check-audit` (read in full before writing this section) reached
the same three-way split independently and shipped it first, as an "owner"
table:

| Object | Owner | Why |
|---|---|---|
| A landing page's own CTA/task-link budget | **DOC-TYPE-12** | already the family that owns landing content |
| A stub content page (thin, possibly no user need maps to it) | **DOC-DISC-09 / DOC-DISC-10** | the real question is "delete candidate," which needs the discovery artifact's coverage table — a bare word-and-link count can't answer it, see §2.3 |
| A rendered empty-result state or a custom 404 template | **DOC-NAV-12** | the only object left once the other two are split out |

This file adopts that split rather than re-deriving it, and does the two
things the ledger explicitly left open: **sets DOC-NAV-12's number**, and
**runs the resulting stub-page question over the fleet** to check the split
holds up (§2.3).

### 2.2 DOC-NAV-12, renumbered

The rule's own cited source does not support its own number. Re-fetched
live, `atlassian.design/foundations/content/designing-messages/empty-state`
gives no button count at all: *"Be careful of how many call to action
buttons are on one page. You don't want to overwhelm people with too many
options"* and *"Keep messages one to two sentences long."* This is the exact
finding `severity-and-check-audit` made independently — its quote and mine
match verbatim, from two separate live fetches on the same day. "Exactly one
link, zero fails, two or more fails" is not a tightening of that source; it
has no source, which is why it demotes.

**DOC-NAV-12, revised — applies to: a rendered empty search-result state or a
custom 404 template only, never a content page under any word count.**

- Title, one to two sentences, and **one or two links** (not "exactly one" —
  no source supports precision past Atlassian's own "don't overwhelm"
  caution and its one-to-two-sentence body length).
- Placeholder text (`TODO`, `Lorem ipsum`, `Coming soon`) is dropped from
  this rule — owned by DOC-TYPE-14, per the ledger's overlap item 11.
- Severity: **CONSIDER** (already decided by the ledger; the "150 words" and
  "exactly one" numbers both go on the `(invented default)` list the ledger
  defines).
- Evidence: normative (Atlassian, re-verified, weaker than previously cited)
  + measured (0 of 9 sites author any such template — `ux-observability-posture.md`
  §3 — so this rule currently has no fleet target to run against; it is a
  precondition-first rule until one exists, the same shape DOC-NAV-01 already
  uses).

### 2.3 Running the (retired) stub-page question over 248 pages anyway

Before adopting "DOC-DISC-09/10 owns stub content pages" on the ledger's say-so
alone, I ran the shape DOC-NAV-12 used to cover — a content page under 150
prose words with zero outbound links — against the full measured fleet (23
surfaces, 248 pages, the grounding wave's own `fleet.json`), scoped to
exclude `landing`/`getting-started`-typed pages (those are DOC-TYPE-12's and
DOC-DISC-10's objects respectively, already covered).

50 pages qualify as candidates (non-landing, non-getting-started, under 150
prose words). Of those, 17 have zero counted outbound links. Reading each of
the 17 by hand:

| Cause | Count | Example |
|---|---|---|
| Build-time transclusion the static scan can't see into | 8 | `ocx/website/src/docs/changelog.md` — VitePress `<!--@include: ../../../CHANGELOG.md-->`; `ocx-mirror-sdk/docs/changelog.md`, `ocx-sdk-python/docs/changelog.md` — MkDocs `{% include-markdown %}`; `ocx-mirror-sdk/docs/recipes/shellcheck.md` and 2 more — `pymdownx.snippets` `--8<--` |
| mkdocstrings generation directive, already DOC-TYPE-20's object | 4 | `ocx-mirror-sdk/docs/api/text.md`, `api/releases.md`, `api/cache.md`, `api/index-builder.md` — bare `::: module.Class` |
| Vue-component page, no markdown links at all (real links live in a `<script setup>` array) | 2 | `ocx/website/src/team.md`, `ocx-save/website/src/team.md` |
| Bare autolink the pattern missed (`<https://...>`, valid CommonMark, not counted) | 1 | `ocx-mirror-sdk/docs/schema/url-index.md` |
| **Genuine dead end — no link, no transclusion, no directive** | **2** | `ocx-mirror-sdk/docs/contributing/setup.md` (33 words, a shell fence and nothing else); `ocx-sdk-python/docs/reference/compatibility-checklist.md` (80 words, a table and nothing else) |

**15 of 17 raw hits are checker false positives from four distinct causes,
three of them a build-time transclusion syntax unique to a different
generator or plugin each time** (VitePress `@include`, MkDocs
`include-markdown`, MkDocs `pymdownx.snippets`) — a fourth, mdBook's
`{{#include}}`, wasn't observed in this batch but shares the same blind spot
by construction. **Only 2 of 50 candidate pages are genuine, checkable dead
ends.**

This confirms the ledger's split was the right call, for a reason worth
stating precisely: a bare word-count-plus-link-count rule on this object is
noisy enough (88% false-positive rate on its own candidate set, before even
reaching the "does a user need map to it" question DOC-DISC-09 actually
asks) that shipping it as a NAV rule with a hard numeric cutoff would have
repeated the exact failure mode `check-false-positive-calibration` was
commissioned to hunt down elsewhere in this program. DOC-DISC-09's
two-signal design (unmapped-in-the-coverage-table AND under 150 words) is
structurally better suited to this object than a link count ever was, because
the coverage table is the piece that can tell a real dead end from a
transclusion, a generated stub, or a components-only page — none of which a
static scan alone can resolve. **Recommendation for whoever finalizes
DOC-DISC-09/10's check: add the four carve-outs found here** (a known
transclusion directive string, a bare mkdocstrings `:::` line, a `<script
setup>` block, and a bare autolink) to its word/link counting, since the same
false-positive sources apply to any static text-level scan of these pages
regardless of which family owns the rule.

### 2.4 A measurement caveat, not a rule defect

The grounding wave's page classifier (`docs_shape.py`) tags every `index.md`
and `README.md` — not just a site's true root — as `landing/index`, including
section indexes such as `grimoire-indexer/docs/ops/index.md` (25 words) and
`ocx-catalog/docs/ops/index.md` (57 words). Both happen to carry real
outbound links, so this didn't hide a defect this pass, but it means any
count of "N landing pages" that cites this classifier is counting section
indexes alongside true homepages. Once real `doc_type: landing` declarations
exist (per `declaration-key-unification`'s decision, adopted here — the
carrier is now YAML frontmatter, not the HTML comment wave 1 specified), this
resolves itself: an author only writes `doc_type: landing` for an actual
site root, and a rule scoped to that declared value stops seeing section
indexes at all. Flagging here so the same conflation doesn't get re-measured
as fleet fact by a later pass.

## 3. Revised rule rows

Carried through to the two files this revises. Declaration examples use the
frontmatter carrier per `declaration-key-unification`, not the HTML comment
wave 1 specified — that decision supersedes this file's source consolidation
on the carrier question alone; nothing else about it changes here.

**DOC-TYPE-11 — MUST (reinstated; the ledger's "SHOULD, until the portability
fix lands" condition is now met) — applies to: `doc_type: landing`**
Give every landing page a runnable command or an internal link inside its
opening section (through the end of its first `##`-delimited section) before
any later content.
*Verify*: `checks/landing-page.py`'s `DOC-TYPE-11_reachable_action`, §1.3.
An external citation link does not satisfy this; an admonition aside does (a
caveat with a link inside it is still reachable).
*Evidence*: measured (9 of 9 real fleet sites tested directly, §1.4).

**DOC-TYPE-12 — CONSIDER (demoted; matches `severity-and-check-audit`'s
independent call, and this file's own re-fetch corroborates it, §1.6) —
applies to: `doc_type: landing`**
Cap button-style CTAs at 2, counted in the strict pre-first-`##` window only,
separately from any task-link grid, which this rule does not cap by number
(§1.6 found the 9/group-of-4 numbers unsupported by the exemplar corpus
itself) but does require to be *visibly separate* from the CTA slot.
*Verify*: `checks/landing-page.py`'s `cta_count`/`cta_over_2` for the CTA half
(admonition asides excluded); `task_link_groups` reported for review, not
gated, until a numeric source exists.
*Evidence*: argued (both counts), `(invented default)` marker required per
`severity-and-check-audit`'s convention.

**DOC-NAV-12 — CONSIDER — applies to: a rendered empty search-result state or
a custom 404 template only**
Title, one to two sentences, one or two links. Never scoped to a content page
by word count; the stub-content question is DOC-DISC-09/10's, not this
rule's (§2.1–§2.3).
*Verify*: reviewer check against the template file (no fleet site has one
today — `ux-observability-posture.md` §3 — so this has no red/green fixture
yet; ship the precondition, not a fabricated pass).
*Evidence*: normative (Atlassian, re-verified weaker than previously cited,
§2.2), `(invented default)` on both numbers.

## 4. Open questions handed forward

1. **DOC-DISC-09/10's own check should add the four carve-outs found in
   §2.3** (transclusion directive, mkdocstrings `:::`, `<script setup>`,
   bare autolink) before it runs at anything above CONSIDER on the fleet —
   whoever owns that file next should read §2.3 rather than re-measure it.
2. **mdBook's `{{#include}}` transclusion syntax was not observed in this
   fleet** (only VitePress `@include` and two MkDocs plugin syntaxes were).
   It shares the same blind spot by construction and should be added to the
   carve-out list on the strength of that reasoning, not fleet evidence.
3. **The task-link total and per-group caps (9, 4) have no number this pass
   can defend**, per §1.6's Cloudflare/GitLab re-fetch. They ship as
   informational review output, not a gate, until `docs-observability`'s
   click or search-log instrumentation exists to supersede them with a
   measured one — the same deferral `landing-page-contract.md` already
   named.

## Sources

| URL | Fetched | Why |
|---|---|---|
| https://docs.stripe.com/ | 2026-09-05, live | Re-derive the 9-link/3-group task grid number; reconfirmed exactly |
| https://docs.astral.sh/uv/ | 2026-09-05, live | Reconfirm the one-sentence hero and zero-CTA pattern |
| https://developers.cloudflare.com/workers/ | 2026-09-05, live | Found the second grid (≈15 items) that contradicts the 9-link cap |
| https://docs.gitlab.com/ | 2026-09-05, live | Reconfirm "too much homepage"; found the exact counts are unstable across fetches |
| https://laravel.com/docs/12.x | 2026-09-05, live | Reconfirm the multi-paragraph marketing-essay outlier |
| https://atlassian.design/foundations/content/designing-messages/empty-state | 2026-09-05, live | Found no button-count number exists; independently matches `severity-and-check-audit`'s own re-fetch |
| `/home/mherwig/dev/grimoire-lore/.agents/research/docs-page-types.md` | read in full | Primary source for DOC-TYPE-10..21, revised here |
| `/home/mherwig/dev/grimoire-lore/.agents/research/docs-navigation-search.md` | read in full | Primary source for DOC-NAV-01..16, revised here |
| `/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/wave2-severity-ledger.md` | read in full | Parallel wave-2 pass; adopted its DOC-DISC-09/10 ownership split and its DOC-TYPE-12/DOC-NAV-12 severity demotions rather than re-deriving them |
| `/home/mherwig/dev/grimoire-lore/.agents/research/docs-topic-map/wave2-declaration-key.md` | read in full | Parallel wave-2 pass; adopted its frontmatter-carrier decision for the `applies to: doc_type: landing` phrasing used here |
| `/home/mherwig/dev/grimoire-lore/.agents/research/docs-audit/docs-shape.md`, `ux-observability-posture.md` | read in full | Fleet ground truth for §1.4-1.5, §2.3-2.4 |
| `/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/fleet.json` | read directly | Raw per-page grounding data; §2.3's 248-page run reads this file's 23 non-duplicate surfaces directly (excludes 5 agent-worktree duplicate clones the same way `docs-shape.md` excluded `ocx-save` from its per-axis tables) |
| 9 real fleet landing pages + `ocx-save` (file paths in §1.4) | read directly | The actual check target for §1 |
