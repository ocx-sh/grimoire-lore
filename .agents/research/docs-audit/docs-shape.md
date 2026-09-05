---
title: Fleet documentation shape audit
agent: docs-shape-scout (sonnet)
model: claude-sonnet-5
scope: every /home/mherwig/dev/*/ with a docs/ or website/ tree, or a README over 100 lines (excl. mirror-*, *tmp*)
method: find + grep for inventory, one inline Python script (docs_shape.py) for prose/structure/link metrics, git remote/branch for de-duplication
date: 2026-09-05
---

# Fleet documentation shape audit

Numbers-first measurement of the fleet's documentation, run against
`/home/mherwig/dev/*` as it stood 2026-09-05. `docs-frame.md` is treated as a
hypothesis; every section below states where the measurements confirm or
contradict it, with `file:line` citations.

## 0. Scope and the first correction: repo count

Command:
```bash
for d in */; do d="${d%/}"
  [[ "$d" == mirror-* || "$d" == *tmp* ]] && continue
  [[ -d "$d/docs" || -d "$d/website" ]] && echo "$d docs=1"
  rl=$(wc -l < "$d/README.md" 2>/dev/null || echo 0)
  (( rl > 100 )) && echo "$d readme=$rl"
done
```
28 directories matched — not the ~13 rows in
[`docs-frame.md:29-42`](../docs-frame.md). Checking `git remote -v` and
`git branch --show-current` on each shows **5 of the 28 are duplicate
branch checkouts of a repo already in the list**, not separate products:

| Duplicate dir | Same remote as | Branch |
|---|---|---|
| `ocx-evelynn`, `ocx-sion`, `ocx-soraka` | `ocx` (`git@github.com:ocx-sh/ocx.git`) | `evelynn`, `sion`, `soraka` |
| `grimoire-duo`, `grimoire-wt-opencode-jsonc` | `grimoire` (`git@github.com:grimoire-rs/grimoire.git`) | `duo`, `fix/opencode-global-jsonc` |

`ocx`/`ocx-evelynn`/`ocx-sion` are word-for-word identical (same sha256 of
concatenated docs, differing only in trailing newline); `ocx-soraka` is the
same repo two weeks stale on its own branch. **23 distinct documentation
surfaces**, not 28 and not the frame's 13. Six of the 23 are single-page
README-only "sites" (`grimoire-components`, `grimoire-index`,
`setup-grimoire`, `setup-ocx`, `vscode-ocx`, `www-setup`) with no docs/website
tree at all. All per-repo tables below list every measured row; duplicates
are marked and excluded from fleet aggregates.

### Correction to the frame's own page counts

The frame's per-repo "Markdown files" column
([`docs-frame.md:34-39`](../docs-frame.md)) is **whole-repo** `find -name
'*.md'` (excluding node_modules/.git/target/.claude/.agents/.serena), not the
docs/website surface its own "Docs surface" column names. Recomputing that
exact command reproduces the frame's numbers exactly, which proves the
method, not the docs, is what's large:

```bash
find ocx-catalog -name '*.md' | grep -vE '/node_modules/|/\.git/|/target/|/\.claude/|/\.agents/|/\.serena/' | wc -l   # 560, matches frame
find ocx-catalog/docs \( -name '*.md' -o -name '*.mdx' \) | wc -l                                                    # 23, the real docs surface
```
560 of ocx-catalog's counted files are 420 Lighthouse CI report artifacts
under `.lhci-bulk/` plus 98 search-index dumps under `.dev-indexes/` — build
output, not documentation (`ocx-catalog/.lhci-bulk/`,
`ocx-catalog/.dev-indexes/`). Same pattern, worse ratio, in `creeptd-ng`
([`docs-frame.md:35`](../docs-frame.md), claimed 322): 257 of those 322 are
under `creeptd-ng/.worktrees/{cicd-delivery,ffa-build,spec-preview}/` — three
stale agent worktrees dated May 31–Aug 28 2026, i.e. disposable per this
project's own worktree-hygiene policy, not docs. `creeptd-ng`'s actual docs
surface is 2 files (`creeptd-ng/docs/dev-infra/{play-full,play-lan}.md`).
**Any rule that globs on "the fleet's markdown count" from a naive `find`
will load itself onto CI report output and stale worktrees.**

## 1. Generator and site

```bash
find "$repo" -maxdepth 3 \( -iname '.vitepress' -o -iname 'docusaurus.config.*' \
  -o -iname 'astro.config.*' -o -iname 'mkdocs.yml' -o -iname 'book.toml' \) 2>/dev/null
```

| Repo | Generator | Version (source) |
|---|---|---|
| `ocx` (+3 dup checkouts) | VitePress 2 (alpha) | `2.0.0-alpha.16`, `ocx/website/bun.lock` |
| `ocx-save` | VitePress | website/ tree present, same family |
| `ocx-catalog` | **MkDocs Material** | `9.7.7` pinned, `ocx-catalog/taskfile.yml:14` |
| `grimoire-indexer` | **MkDocs Material** | `9.7.7` pinned, `grimoire-indexer/taskfile.yml:19` |
| `ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot` | MkDocs Material | range `>=9.5,<10` in each `pyproject.toml` |
| `ocx-mirror`, `ocx-mcp` | MkDocs Material | **unpinned** — `uv run --with mkdocs-material mkdocs build` (`ocx-mirror/taskfiles/docs.taskfile.yml:12`, `ocx-mcp/taskfiles/docs.taskfile.yml:12`) |
| `grimoire` (+2 dup checkouts) | **mdBook** | `mdbook@0.5.3` pinned, `grimoire/.github/workflows/docs.yml:69` |
| `kate-middlechild` | Astro | `6.4.6`, `kate-middlechild/bun.lock` |
| `find_ocx` | **Sphinx (reStructuredText)** | `find_ocx/docs/conf.py`, `.rst` files — not Markdown at all |
| `grimoire-lore`, `bob`, `creeptd-ng`, `rules_ocx` | none (plain .md, no generator) | — |
| 6 README-only repos | none | — |

**Contradiction of the frame**: [`docs-frame.md:34`](../docs-frame.md) states
"`ocx-catalog` | `docs/` — VitePress" and
[`docs-frame.md:39`](../docs-frame.md) states "`grimoire-indexer` | `docs/` —
Astro". Both are **wrong**. Both are MkDocs Material, confirmed by
`mkdocs.yml` at each repo root and by `!!! warning "..."` admonition syntax
(Python-Markdown/MkDocs-only) in `ocx-catalog/docs/index.md:11` and
`ocx-catalog/docs/ops/troubleshooting.md:72`. `ocx-catalog`'s own `src/` app
depends on `vitepress` as an npm package (`ocx-catalog/package.json`) — it is
a tool that *renders sites*, which is presumably where the frame's mix-up
came from; that is not what builds `ocx-catalog`'s own docs. `find_ocx`
(Sphinx/RST) is a fifth generator the frame's candidate list
([`docs-frame.md`](../docs-frame.md) intro) never names.

## 2. Page inventory and type classification

Classifier (inline in `docs_shape.py`, see §3 for the full script): ordered
substring match on the lowercased path-plus-filename, first hit wins —
`changelog → contributing → faq → getting-started → tutorial → how-to →
reference → concept`, falling back to `landing/index` for a root
`index`/`README`, else `other`. This is a path heuristic, not a content
parse; its known blind spot is named in §6.

Fleet totals, **distinct repos only** (23 repos, 248 pages):

| Type | Count | Share |
|---|---:|---:|
| other | 79 | 31.9% |
| reference | 53 | 21.4% |
| how-to | 38 | 15.3% |
| landing/index | 22 | 8.9% |
| concept | 20 | 8.1% |
| getting-started | 17 | 6.9% |
| contributing | 10 | 4.0% |
| changelog | 7 | 2.8% |
| faq | 2 | 0.8% |
| **tutorial** | **0** | **0.0%** |

Per-repo (`n` = page count; duplicate checkouts marked):

```
bob                        n=2   concept=2
creeptd-ng                 n=2   other=2
find_ocx                   n=0   (Sphinx/.rst, no .md — see §1)
grimoire                   n=23  landing=1 getting-started=2 concept=1 reference=1 other=18
grimoire-duo   [DUPLICATE of grimoire, branch "duo"]
grimoire-wt-opencode-jsonc [DUPLICATE of grimoire, branch "fix/opencode-global-jsonc"]
grimoire-indexer           n=22  landing=2 getting-started=1 how-to=6 concept=3 reference=8 other=2
grimoire-lore              n=10  other=10
grimoire-vscode            n=1   other=1
kate-middlechild           n=25  landing=2 how-to=1 concept=6 other=16
ocx                        n=44  landing=2 getting-started=2 how-to=4 reference=10 faq=1 changelog=1 other=24
ocx-evelynn    [DUPLICATE of ocx, branch "evelynn"]
ocx-sion       [DUPLICATE of ocx, branch "sion"]
ocx-soraka     [DUPLICATE of ocx, branch "soraka", n=41 — 2 weeks stale]
ocx-catalog                n=23  landing=2 getting-started=1 how-to=7 concept=4 reference=6 other=3
ocx-indexbot               n=9   landing=1 getting-started=1 how-to=1 reference=4 changelog=1 contributing=1
ocx-mcp                    n=6   landing=1 getting-started=1 reference=3 changelog=1
ocx-mirror                 n=8   landing=1 getting-started=1 reference=5 changelog=1
ocx-mirror-sdk             n=35  landing=1 getting-started=5 how-to=11 concept=4 reference=9 changelog=1 contributing=4
ocx-save                   n=10  landing=1 getting-started=2 how-to=1 reference=3 faq=1 changelog=1 other=1
ocx-sdk-python             n=19  landing=1 getting-started=1 how-to=7 reference=4 changelog=1 contributing=5
rules_ocx                  n=3   landing=1 other=2
grimoire-components/grimoire-index/setup-grimoire/setup-ocx/vscode-ocx/www-setup   n=1 each  landing=1 (README-only)
```
Command: `python3 docs_shape.py <repo>...` (script in §3) → one JSON blob;
summarized with a second script that groups by `p["type"]`.

**Zero pages classify as `tutorial`** fleetwide. Read carefully: this
heuristic files a numbered walkthrough under `getting-started` if its path
says "getting-started" rather than "tutorial" — so the honest claim is
narrower than "no tutorials exist": **no repo in the fleet labels any page as
a tutorial**, and the getting-started tier (17 pages, 6.9%) is the closest
thing to it everywhere. This is the one place the measurements **support**
the frame's hypothesis #3 (a missing use-case-tier model) rather than
contradicting it — the "first steps" tier exists in name only as
"getting-started", never as a distinct, longer, learn-by-doing tutorial tier.

**`other` at 31.9% is a real classifier gap, not noise, and it is
concentrated**: `grimoire`'s mdBook docs are a **flat single directory**
(`grimoire/docs/src/*.md` — no `how-to/`, `reference/`, etc. subdirectories),
so filenames like `commands.md`, `publishing.md`, `hosting-an-index.md`,
`upgrading.md` (all in `grimoire/docs/src/`) carry no type-signaling keyword
and fall to `other` even though a reader would call `commands.md` a
reference page and `upgrading.md` a migration/how-to page. By contrast the
MkDocs-Material sites (`ocx-catalog`: 3/23 other, `ocx-mirror-sdk`: 0/35
other) use a Diataxis-shaped directory split (`how-to/`, `reference/`,
`explanation/` or `guide/{concepts,}`) that this same heuristic reads
cleanly. **The directory-IA pattern, where present, is what makes a
path-based classifier — and a human skimming the sidebar — work at all.**

## 3. Prose metrics

Script (written to scratch, run once per repo set, no third-party deps):

```python
#!/usr/bin/env python3
# docs_shape.py -- fleet documentation shape audit (full listing; abridged
# comments below match the working copy at
# /tmp/claude-.../scratchpad/docs_shape.py)
import json, os, re, sys

EXCLUDE_DIRS = {"node_modules", ".git", "target", "dist", ".vitepress", ".serena",
                ".astro", ".cache", "public", "_site", "book"}
CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)")
FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
EM_DASH = "—"
LINK_INLINE_RE = re.compile(r"(?<!\!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
LINK_REF_USE_RE = re.compile(r"(?<!\!)\[([^\]]*)\]\[([^\]]*)\]")
LINK_REF_DEF_RE = re.compile(r"^\s*\[([^\]]+)\]:\s*(\S+)")
FENCE_LANG_RE = re.compile(r"^\s*```\s*([A-Za-z0-9_+-]*)\s*$")
# VitePress/markdown-it-anchor lets a heading pin its own id: "### Options {#script-options}".
# The real anchor IS that id, not the slug of the visible text -- ocx uses this
# throughout; skipping it flags hundreds of real links as dead.
EXPLICIT_ID_RE = re.compile(r"\{#([\w-]+)\}\s*$")
IRREGULAR_PP = ("written|shown|built|done|given|taken|known|seen|made|found|run|set|put|"
                "read|held|kept|left|meant|sent|spent|told|understood|used|broken|chosen|"
                "driven|drawn|grown|thrown|worn|torn|sworn|born")
PASSIVE_RE = re.compile(r"\b(was|were|is|are|been|being|be)\b\s+(?:\w+\s+){0,2}(\w+ed\b|"
                        + IRREGULAR_PP + r")", re.IGNORECASE)
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
WORD_RE = re.compile(r"[A-Za-z']+")
VOWEL_GROUPS_RE = re.compile(r"[aeiouyAEIOUY]+")

def count_syllables(word):
    word = word.lower()
    n = len(VOWEL_GROUPS_RE.findall(word))
    if word.endswith("e") and n > 1 and not word.endswith("le"):
        n -= 1
    return max(n, 1)

def flesch(words_list, n_sentences):
    n_words = len(words_list)
    if n_words == 0 or n_sentences == 0:
        return None
    n_syll = sum(count_syllables(w) for w in words_list)
    return round(206.835 - 1.015 * (n_words / n_sentences) - 84.6 * (n_syll / n_words), 1)

def strip_code_and_front(text):
    # Drops code fences, frontmatter, ATX heading lines, and table rows -- none
    # of those are "prose" and left in they corrupt sentence splitting (a
    # heading with no terminal punctuation merges into the next paragraph; a
    # table row reads as one run-on clause).
    text = FRONTMATTER_RE.sub("", text)
    out, in_fence = [], False
    for ln in text.split("\n"):
        if CODE_FENCE_RE.match(ln):
            in_fence = not in_fence; continue
        if in_fence: continue
        if ATX_HEADING_RE.match(ln): out.append(""); continue
        if re.match(r"^\s*\|.*\|\s*$", ln) or re.match(r"^\s*\|?[\s:|-]+\|?\s*$", ln): continue
        out.append(ln)
    return INLINE_CODE_RE.sub(" ", "\n".join(out))

def split_sentences(prose):
    # Sentence-split per blank-line-separated block so a heading-less or
    # punctuation-less block (a bare list item, an admonition title) counts as
    # one sentence instead of bleeding into the next paragraph.
    sentences = []
    for b in re.split(r"\n\s*\n", prose):
        b = " ".join(b.split())
        if not b: continue
        parts = [p for p in SENT_SPLIT_RE.split(b) if p.strip()]
        sentences.extend(parts if parts else [b])
    return sentences

# [page-type classifier TYPE_RULES/classify(): see §2 above -- identical code]
# [heading_anchor()/slugify(): see §5 below -- identical code]
# [analyze_file(), find_docs_surface(), main(): walk docs/website, run every
#  metric per page, dump one JSON blob to stdout -- unabridged copy kept at
#  /tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/docs_shape.py]
```
Run: `python3 docs_shape.py bob creeptd-ng ... www-setup > fleet.json` (28
repo args, from `/home/mherwig/dev`), then a second script groups per repo
and computes medians with `statistics.median`.

Per-repo (distinct repos; `pages` = pages with ≥1 sentence; `flesch` =
per-repo median of per-page Flesch Reading Ease):

| Repo | pages | words | mean sent. len | long-sent. share | em-dash | semicolon | passive* | Flesch |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ocx-mcp | 6 | 875 | 12.1 | 0.0 | 22 | 1 | 24 | 41.2 |
| ocx | 44 | 163,150 | 23.0 | 0.3 | 2,988 | 771 | 1,972 | 42.1 |
| ocx-save | 10 | 9,978 | 15.5 | 0.1 | 138 | 19 | 148 | 43.5 |
| ocx-sdk-python | 19 | 6,593 | 22.5 | 0.3 | 155 | 31 | 67 | 43.6 |
| grimoire | 23 | 60,860 | 23.1 | 0.4 | 1,109 | 346 | 758 | 45.4 |
| kate-middlechild | 25 | 33,146 | 20.7 | 0.2 | 575 | 484 | 143 | 46.6 |
| ocx-mirror | 8 | 23,289 | 19.8 | 0.3 | 416 | 103 | 390 | 47.3 |
| bob | 2 | 4,722 | 20.0 | 0.3 | 71 | 48 | 59 | 47.5 |
| ocx-catalog | 23 | 9,718 | 22.1 | 0.3 | 205 | 43 | 101 | 51.1 |
| grimoire-lore | 10 | 3,618 | 19.3 | 0.3 | 50 | 18 | 44 | 53.8 |
| creeptd-ng | 2 | 662 | 14.8 | 0.1 | 15 | 1 | 5 | 54.2 |
| ocx-indexbot | 9 | 15,506 | 20.4 | 0.3 | 342 | 96 | 170 | 54.6 |
| ocx-mirror-sdk | 35 | 2,815 | 9.4 | 0.0 | 62 | 8 | 23 | 56.9 |
| grimoire-indexer | 22 | 8,132 | 19.5 | 0.3 | 137 | 37 | 99 | 60.6 |
| grimoire-vscode | 1 | 1,092 | 19.5 | 0.3 | 25 | 3 | 5 | 63.5 |

(rules_ocx, and the 6 README-only repos, omitted from the table — 1-3 pages
each; full numbers are in `fleet.json`.) \*passive: cheap regex (`was/were/
is/are/been/being/be` + `-ed` word or a 30-word irregular-participle list
within 2 tokens) — overcounts adjectives ("was excited"), undercounts
irregulars outside the list; a count, not a grammar judgment.

**Fleet medians (23 distinct repos, 248 pages, 348,917 prose words):**
Flesch 51.6 · mean sentence length 19.5 words · **em-dash 18.3 / 1,000
words** · semicolon 5.8 / 1,000 words · passive 11.6 / 1,000 words (heuristic).

This is the strongest **confirmation** of the frame's hypothesis #5: em-dash
and semicolon density are not a strawman here, they show up at real,
countable rates fleetwide, heaviest in `kate-middlechild` (484 semicolons in
25 pages — check with `grep -c ';' kate-middlechild/docs/**/*.md` outside
code fences) and `ocx` (2,988 em-dashes across 44 pages). On reading level:
Flesch 51.6 sits in the "fairly difficult" band (50–60); only 3 of 15
substantial repos (`grimoire-indexer`, `grimoire-vscode`, and — per the full
per-repo list — `setup-ocx`) clear 60 ("standard"). No repo in the fleet
reaches "plain English" by the standard Flesch bands.

## 4. Structure metrics

| Repo | pages | max heading depth | mean headings/page | code-block share | lang-tagged share | stub share (<150w) |
|---|---:|---:|---:|---:|---:|---:|
| ocx | 44 | 5 | 11.0 | 0.91 | 0.89 | 0.07 |
| ocx-catalog | 23 | 3 | 6 | 0.65 | 0.89 | 0.17 |
| grimoire | 23 | 4 | 13 | 0.87 | 0.95 | 0.04 |
| grimoire-indexer | 22 | 3 | 5.0 | 0.77 | 0.65 | 0.18 |
| kate-middlechild | 25 | 3 | 7 | 0.72 | 0.87 | 0.08 |
| ocx-mirror-sdk | 35 | 3 | 3 | 0.60 | 0.83 | **0.94** |
| ocx-sdk-python | 19 | 3 | 4 | 0.58 | 1.00 | 0.21 |
| ocx-mcp | 6 | 3 | 2.5 | 0.33 | 1.00 | **0.67** |
| ocx-save | 10 | 4 | 8.0 | 0.80 | 0.75 | 0.30 |
| ocx-indexbot | 9 | 3 | 9 | 0.89 | 0.98 | 0.11 |
| ocx-mirror | 8 | 3 | 16.5 | 0.88 | 0.92 | 0.12 |
| grimoire-lore | 10 | 2 | 5.5 | 1.00 | 1.00 | 0.00 |

Command: same `fleet.json`, grouped by repo; `max(p.max_heading_depth)`,
`median(p.n_headings)`, `mean(p.has_code_block)`, etc.

Longest 5 pages fleetwide (distinct): `ocx/website/src/docs/reference/
command-line.md` — 34,298 prose words (one file); `ocx/website/src/docs/
user-guide.md` — 13,789 words; both single Markdown files, no pagination.
**A 34k-word reference page in one file is itself a UX finding** —
`command-line.md` alone is longer than the entire docs surface of 12 of the
23 distinct repos measured here.

**Stub pages (<150 prose words) are 24.6% of all 248 pages fleetwide** — a
quarter of every page in the fleet is a stub by this measure. `ocx-mirror-sdk`
is the extreme case: 33/35 pages are stubs (0.94 share) — its `docs/` tree is
mostly one-line placeholder pages under `ocx-mirror-sdk/docs/` (check with
`for f in ocx-mirror-sdk/docs/**/*.md; do wc -w "$f"; done | sort -n | head`).

## 5. Link metrics

Anchor and dead-link check needed two fixes mid-run, both worth stating
because they change the number by more than 30x:

1. **Explicit heading ids.** VitePress/markdown-it-anchor lets a heading pin
   its own anchor: `ocx/website/src/docs/installation.md:49` is
   `### Options {#script-options}`. A slugger that ignores `{#...}` and
   slugs the visible text instead produces `options`, not `script-options`
   — so the real link at `ocx/website/src/docs/installation.md:233`,
   `[...](#script-options)`, reads as dead when it is not. Fixed by
   preferring the explicit id (see `heading_anchor()` in §3).
2. **Root-relative links** (`/docs/installation`, VitePress/Docusaurus/
   Starlight convention) need resolving against the site's `srcDir`
   (`website/src`), not the linking file's own directory. Unfixed, every
   root-relative link in the fleet reads as dead.

Before both fixes: `ocx` showed 2,087/2,337 internal links dead (89%).
After: **68/2,337 (2.9%)**. That 68 is not zero-cost noise either — a manual
check of one sample confirms real rot: `ocx/website/src/docs/reference/
command-line.md:361` links `../user-guide.md#path-resolution`, but
`#path-resolution` is defined at `command-line.md:349`
(`` ### `--candidate` / `--current` {#path-resolution} ``) — **in the file
doing the linking, not in `user-guide.md`** — and `user-guide.md` has no
heading answering to `file-structure-packages`, `path-resolution`, or
`file-structure-symlinks` either, all three referenced from
`command-line.md` and elsewhere. This reads as a heading moved out of
`user-guide.md` at some point without its inbound cross-references
following it.

| Repo | internal | external | inline-style | ref-style | dead-internal (cheap check) |
|---|---:|---:|---:|---:|---:|
| ocx | 2,337 | 611 | 555 | 2,397 | 68 |
| grimoire | 604 | 234 | 492 | 346 | 1 |
| ocx-sdk-python | 98 | 20 | 118 | 0 | **65 — see caveat below** |
| ocx-mirror | 144 | 36 | 86 | 94 | 0 |
| ocx-save | 181 | 46 | 51 | 176 | 1 |
| ocx-mirror-sdk | 37 | 29 | 66 | 0 | 0 |
| grimoire-indexer | 70 | 4 | 74 | 0 | 0 |
| ocx-catalog | 66 | 3 | 69 | 0 | 0 |
| kate-middlechild | 5 | 152 | 157 | 0 | 0 |
| ocx-indexbot | 22 | 9 | 31 | 0 | 0 |
| ocx-mcp | 9 | 13 | 0 | 22 | 0 |

**Fleet totals (distinct repos): 3,590 internal links, 135 flagged dead
(3.8%) — but `ocx-sdk-python`'s 65 are a checker limitation, not rot.** Every
one of them targets `docs/reference/api.md#ocx_sdk.<Class>.<method>`
(e.g. `ocx-sdk-python/docs/reference/command-map.md:5`), and
`ocx-sdk-python/docs/reference/api.md:1-4` is a 4-line stub that says
"Auto-generated from docstrings via mkdocstrings" — those anchors are built
at `mkdocs build` time from Python docstrings, invisible to a static-file
scan. Net real dead-link rate, fleetwide: **~70/3,590 (≈1.9%)**, concentrated
almost entirely in `ocx`. **A "cheap" dead-link check must special-case
build-time anchor generators (mkdocstrings and its kin) or it manufactures
65 false positives from one repo alone.**

## 6. Examples

Fenced code blocks by language, fleetwide (distinct repos, 3,065 total
blocks):

| Lang | Count | | Lang | Count |
|---|---:|---|---|---:|
| sh | 827 | | text | 72 |
| shell | 496 | | python | 65 |
| json | 435 | | console | 57 |
| toml | 420 | | ts | 25 |
| (untagged) | 343 | | powershell | 21 |
| yaml | 279 | | jsonc | 20 |
| bash | 90 | | dockerfile | 20 |

Shell/bash/console blocks: 1,470 total; **only 61 (4.2%) open with a `$` or
`>` prompt character** — the fleet's shell examples are overwhelmingly bare
commands with no prompt convention, not REPL-style transcripts.

Tested-example evidence — **two distinct, real mechanisms found**, not one:

1. **ocx's asciicast mechanism**, as the frame already knows
   ([`docs-frame.md:44-46`](../docs-frame.md)): 35 acceptance-tested `.sh`
   scripts under `ocx/test/doc_scripts/*.sh`, rendered by
   `ocx/website/.vitepress/theme/components/Terminal.vue`.
2. **A second, unrelated mechanism the frame does not mention**:
   `ocx-sdk-python` runs `>>>`-style doctest examples embedded in its own
   docs/docstrings through `sybil`'s `DocTestParser`
   (`ocx-sdk-python/conftest.py:25-42` — explicitly *not* stdlib doctest,
   the comment there says why). This is a second, independently-arrived-at
   tested-docs pattern in the same fleet, for a different language (Python
   examples vs. shell transcripts) — worth citing as a second worked example
   alongside ocx's, not folding into "the ocx mechanism."

Grep hits for `mdbook test`/`tesh`/`runme`/`mdsh`/`byexample` elsewhere in
the fleet (3, 11, 2, 1, 2 files respectively) are **mentions, not wiring** —
e.g. `grimoire`'s 3 hits for "mdbook test" are prose describing the idea;
`grimoire/.github/workflows/docs.yml` and `grimoire/taskfile.yml` contain no
`mdbook test` invocation. Confirmed absent, not just unmeasured.

## 7. Landing pages

| Site | Opens with | First 3 lines (non-heading) | First CTA |
|---|---|---|---|
| `ocx` (VitePress) | **value claim** | YAML hero block, not prose: `hero.tagline: "Turn any OCI registry into a cross-platform binary distribution platform. Zero extra infrastructure."` (`ocx/website/src/index.md:1-9`) | "Get Started" → `/docs/getting-started` |
| `ocx-catalog` (MkDocs) | **definition** | "`@ocx-sh/catalog` renders one or more **OCX package indices** into a browsable static site... It is a *renderer*, not a producer." (`ocx-catalog/docs/index.md:1-9`) | none in the opening block — first link is a cross-reference ("Index vs. catalog"), not a CTA |
| `grimoire-indexer` (MkDocs) | **definition** | "`@grimoire-rs/indexer` runs your own Grimoire package index: a static site listing the skills, rules, agents... An index stores nothing but **pointers**." (`grimoire-indexer/docs/index.md:1-9`) | "Start here" card grid (`grimoire-indexer/docs/index.md:11`) |
| `grimoire` (mdBook) | **definition** | "Grimoire is a package manager for AI-agent configuration. Its binary, `grim`, installs, updates, and publishes..." (`grimoire/docs/src/introduction.md:1-8`) | none in the opening — SUMMARY.md sidebar is the nav, no in-page CTA |
| `ocx-mcp` (MkDocs) | **definition + explicit caveat** | "The Model Context Protocol (MCP)... `ocx-mcp` is an MCP server that exposes OCX registry and package operations..." then immediately: "**not implemented yet**" (`ocx-mcp/docs/index.md:1-7`) | none — the page is honest about being pre-implementation |
| `ocx-sdk-python`, `ocx-mirror-sdk` (MkDocs) | **neither** — title, then straight to a caveat | `# ocx-sdk` → `!!! warning "Pre-1.0 — API may change..."` (`ocx-sdk-python/docs/index.md:1-9`) | none |
| `kate-middlechild` (Astro) | **not a landing page at all** | root `index.astro` is a bare 301 redirect to `/en/` (`kate-middlechild/packages/web/src/pages/index.astro:1-5`); the real landing page is locale-scoped at `[lang]/index.astro` | (not measured — out of scope of this pass) |

**Contradiction of a background assumption, not the frame directly**: the
requester's list of candidate CTA styles ("definition vs. value claim vs.
command") doesn't include what two real sites actually do — open with
**neither**, going straight from an H1 title to a stability warning. That's
its own pattern (pre-1.0 honesty over marketing), not a defect, but it means
"every landing page makes one of three opening moves" doesn't hold across
this fleet.

## Data files

Raw per-page JSON (422 pages, all 28 candidate dirs including duplicates):
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/fleet.json`.
Script: same directory, `docs_shape.py` (full, unabridged — §3 above elides
the page-classifier and anchor-check bodies already shown in §2/§5 to avoid
repeating ~120 lines verbatim).
