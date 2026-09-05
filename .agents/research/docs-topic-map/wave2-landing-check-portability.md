---
title: Documentation design — landing checks and the short-page link budget (wave 2)
program: docs
commissions:
  - landing-check-portability (docs-page-types)
  - landing-and-short-page-link-budget (docs-navigation-search)
model: claude-sonnet-5
date: 2026-09-05
revises:
  - docs-page-types.md (DOC-TYPE-11, DOC-TYPE-12)
  - docs-navigation-search.md (DOC-NAV-12)
  - docs-use-case-discovery.md (DOC-DISC-10, evidence-line correction only)
inputs:
  - docs-topic-map/wave1-critique.md (Requester emphasis g, Contradiction 4)
  - docs-page-types.md, docs-navigation-search.md (read in full)
  - fleet.json (wave-1's raw per-page dataset, still on disk)
  - primary sources re-fetched today: atlassian.design empty-state page,
    docs.astral.sh/uv, docs.stripe.com, docs.gitlab.com, laravel.com/docs
check: /tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/landing_check.py
---

# Landing checks and the short-page link budget

## Verdict

Both commissions turn out to share one root cause: **DOC-TYPE-11/12 and
DOC-NAV-12 were each measuring a different thing than the sentence they were
written in implies**, and three of the four "known failures" or
"contradictions" that motivated this commission do not survive a primary-source
or fleet-data recheck. The fixes below are not a compromise between two rules —
they are one corrected check plus a corrected scope, both run against the real
fleet.

1. **DOC-TYPE-11/12 can be made generator-neutral without a frontmatter
   dependency.** A single markdown-level scan (below) replaces the
   VitePress-only frontmatter parse. It reproduces the one known failure that
   still holds up (`ocx-mcp`), passes `ocx-catalog` as required, and finds two
   new, previously-unmeasured failures (`ocx-mirror`, `grimoire`'s mdBook
   landing chapter). It also **overturns** wave 1's claim that
   `ocx-sdk-python` "reaches no action at all" — it does not.
2. **DOC-NAV-12's "contradiction" with DOC-TYPE-12/13 and DOC-DISC-10 is
   mostly a measurement error, not a design conflict.** None of the three
   pages the critique named as colliding with DOC-NAV-12
   (`ocx-catalog/docs/index.md` at 433 words, `installation.md` at 1,669
   words, `getting-started.md` at 2,173 words) is actually under DOC-NAV-12's
   own 150-word applicability gate. The critique quoted a *time-to-first-command*
   figure (words before the first runnable command — an opening-move metric)
   as if it were *total page length* (a stub-detection metric). They are two
   different axes measured on the same page.
3. **The real conflict exists, just on different pages.** Five real,
   currently-short (`landing/index`-typed) pages in the fleet sit under 150
   words today and would collide with a literal "exactly one link" rule. The
   fix is to remove `landing` from DOC-NAV-12's applies-to and let
   DOC-TYPE-12's own (revised) budget govern every landing page regardless of
   length.
4. **The re-fetched Atlassian source does not say "one or two CTA buttons."**
   It says a CTA *label* should be one to two words, and separately cautions
   against "too many" buttons with no number. The commission brief's premise
   for loosening DOC-NAV-12 doesn't hold; I did not loosen it on that basis.
5. **DOC-TYPE-12's "9 task links" cap does not survive re-fetching its own
   named exemplars.** uv's real front page carries 12, GitLab's 18, Stripe's
   30+, Laravel's 94 (already the fleet's own cited bad example). The number
   drops to CONSIDER; see below for what replaces it.

## 1. The reconciled landing-page check (DOC-TYPE-11 + DOC-TYPE-12)

### Why the frontmatter-only version failed on 8 of 9 sites

DOC-TYPE-11 required a "declared CTA slot" that only VitePress's
`hero.actions` array provides; DOC-TYPE-12 parsed that same array plus a
`features` array. Both are invisible on MkDocs Material and mdBook, which is
why the wave-1 verification returned "cannot verify" everywhere but `ocx`.

### The replacement: a markdown-structure scan, no generator named

Read the raw file. Strip YAML frontmatter for scanning, but scan it once for a
generic *shape* — a list entry pairing a link-like key (`link`/`href`/`to`/`url`)
with a label-like key (`text`/`title`/`name`/`label`) within three lines of each
other. That shape happens to be what VitePress's `hero.actions` looks like, but
nothing in the check says "VitePress" or "hero" — it is 0/8 on the seven MkDocs
pages and the one mdBook page measured below, and would fire equally on any
generator that shaped its frontmatter that way.

Then walk the body counting, in order, the first of:

- a fenced code block (\`\`\`) — a runnable command,
- a **menu**: a run of sibling list items where *every* item in the run
  carries a link (inline `[t](u)`, reference-style `[t][r]`, or an autolink) —
  this is what MkDocs Material's `grid cards` pattern and a plain "where to go
  next" list both render as, structurally, on every one of the three
  generators,
- a raw block-level `<a href=...>` tag outside any list (VitePress's
  hand-written footer CTA cards).

A single stray link inside an otherwise-unlinked bullet list does **not**
count — that is the deliberate fix for the false positive a naive "any link
before the first heading" check produces (see `ocx-mcp` below). The budget is
150 words, reusing the number this rule set already uses three other places
(DOC-NAV-06, DOC-DISC-09, DOC-DISC-16) rather than inventing a fourth.

For the budget (DOC-TYPE-12), count *every* individually link-bearing list
item on the page (not just menu-pure runs) as one task link, and every
frontmatter CTA-array entry plus every raw `<a href>` button as one CTA — this
is what actually matches the audit's own "7 CTAs, no hierarchy" count for
`ocx` (3 hero actions + 4 footer cards).

The full script (192 lines, stdlib only, no deps) is at
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/landing_check.py`.
Ship it as `checks/landing-cta.py`.

### Run against nine real fleet landing pages plus the required test files

| Page | Generator | DOC-TYPE-11 | First action found | CTAs | Task links |
|---|---|---|---|---:|---:|
| `ocx/website/src/index.md` | VitePress | **PASS** | word 22, fenced block | 7 | 3 |
| `ocx-catalog/docs/index.md` | MkDocs Material | **PASS** | word 146, menu | 0 | 5 |
| `grimoire-indexer/docs/index.md` | MkDocs Material | PASS | word 80, menu | 0 | 4 |
| `ocx-mcp/docs/index.md` | MkDocs Material | **FAIL** | word 186, fenced block | 0 | 6 |
| `ocx-sdk-python/docs/index.md` | MkDocs Material | PASS (see correction) | word 79, menu | 0 | 7 |
| `ocx-mirror-sdk/docs/index.md` | MkDocs Material | PASS | word 73, menu | 0 | 8 |
| `ocx-mirror/docs/index.md` | MkDocs Material | **FAIL (new)** | word 176, menu | 0 | 9 |
| `ocx-indexbot/docs/index.md` | MkDocs Material | PASS | word 148, fenced block | 0 | 0 |
| `ocx-save/website/src/index.md` | VitePress (stale dup) | PASS | word 8, fenced block | 3 | 0 |
| `grimoire/docs/src/introduction.md` | mdBook | **FAIL (new)** | word 215, menu | 0 | 5 |
| `grimoire/docs/src/SUMMARY.md` | mdBook — nav, not landing | n/a | word 1, menu | 0 | **20** |

`SUMMARY.md` is mdBook's table of contents, not its landing page; for mdBook
the check must point at the first linked chapter (`introduction.md`), which is
what the row above does. Pointed at `SUMMARY.md` itself the check trivially
"passes" DOC-TYPE-11 (a TOC is nothing but links) while failing the task-link
budget at 20 — that collision with DOC-NAV-03's own flat-nav finding is a
scoping bug, not a rule bug: **the glob for this check must exclude
`SUMMARY.md`/`book.toml` and target the first chapter file instead.**

Required reproductions, confirmed:
- **`ocx-mcp` fails** (the one known failure that holds up: its first
  section, `## Highlights`, is a bullet list of `_(planned)_`/`_(TBD)_` items
  with one stray citation link — not a menu — and the real install command
  doesn't arrive until word 186, past budget).
- **`ocx-catalog` passes** (its task-card grid is a 100%-linked menu at word
  146, just inside budget).
- **`ocx` fails its CTA budget** at 7 (cap 2) — reproduces "7 CTAs, no
  hierarchy" exactly (3 hero actions + 4 footer cards).
- **`ocx-save`'s Lorem Ipsum problem is out of scope for this check** — it's
  a DOC-TYPE-14 (placeholder-text) violation, not a DOC-TYPE-11/12 one, and
  correctly isn't flagged here.

### Correction to wave 1: `ocx-sdk-python` does not "reach no action at all"

`docs-page-types.md`'s "Violated today" table states: *"`ocx-mcp/docs/index.md:1-7`
and `ocx-sdk-python/docs/index.md:1-9` open with a caveat and reach no action
at all."* Reading the primary source: `ocx-sdk-python/docs/index.md` opens
with an H1 and a `!!! warning` caveat, then its very next section (`## At a
glance`) is a 100%-linked `grid cards` menu including a Quickstart link — at
word 79, well inside any reasonable budget. `ocx-mirror-sdk` has the identical
shape. The underlying measurement this claim cites
(`docs-shape.md` §7, "First CTA: none") is correct but narrower than the
consolidation's prose: it measured only the *literal pre-first-heading* text,
which is a stricter window than "reaches an action at all." Treating those as
the same claim is the error — the same kind (a re-fetchable, primary-source
overstatement) as the DOC-NAV-13 mdBook-boost-defaults error the wave-1 critic
already caught. Two pages named as violations, one holds up.

### Re-deriving the 2-CTA and 9-task-link numbers

Re-fetched today, counting only page-body content (excluding the persistent
sidebar/global nav that repeats on every page of each site):

| Site | Body CTAs | Body task/topic links | Preamble words |
|---|---:|---:|---:|
| `docs.astral.sh/uv` | 2 | 12 | 185 |
| `docs.gitlab.com` | 1 | 18 (in 3 labelled groups of 6-10) | 24 |
| `docs.stripe.com` | ~3 (CLI install + agent setup + quickstart) | 30+ across 5 labelled product groups | short |
| `laravel.com/docs` | 0 | 94, one flat unlabelled list | ~0 |

**The 2-CTA cap holds up** (uv=2, GitLab=1, Stripe≈3, all close to the
argued number; `ocx`'s real violation, 7, is far outside all four). Keep it at
**SHOULD**.

**The 9-task-link cap does not hold up.** uv alone — the fleet's own cited
best-practice exemplar for DOC-TYPE-10 — carries 12 on its front page; GitLab
18; Stripe 30+. Laravel's 94 is real too, but Laravel is already the fleet's
named *bad* example (DOC-TYPE-16 cites it for mixing a full reference TOC into
its landing page) — its high count is a symptom of a different, already-caught
defect, not evidence for where the line should sit. **Drop the fixed count to
CONSIDER.** What survives measurement is *grouping*, not a total: every
re-fetched site above groups its task links under labelled headings (uv:
Getting started/Guides/Concepts/Reference/pip interface; GitLab: three
labelled clusters; Stripe: five product categories) — only Laravel's failure
case is a single unlabelled flat list. Replace the numeric cap with: task
links must sit under a labelled group once the ungrouped total passes roughly
8 (uv's own smallest grouped section) — argued, not measured, ships CONSIDER.
**Also drop "groups of at most four"** — none of the four re-fetched
exemplars groups that tightly (uv's Guides group alone has 7 direct entries
plus 16 integrations); it was never sourced and doesn't survive the same
re-fetch.

### Correction to the Atlassian citation

Re-fetched `atlassian.design/foundations/content/designing-messages/empty-state`
twice with targeted prompts. It contains no sentence giving a button *count*.
What it says: *"Be careful of how many call to action buttons are on one
page. You don't want to overwhelm people with too many options"* (no number)
and *"Limit your CTA to one or two words"* (label length, already correctly
cited elsewhere in this rule set as "a one-to-two-word CTA"). The commission
brief's claim that Atlassian "says one or two CTA buttons" appears to be a
misreading of that same label-length line as a button-count line. I did not
loosen DOC-NAV-12's link cap on this basis — see below for what it should be
based on instead.

## 2. The reconciled short-page link budget (DOC-NAV-12)

### The three objects DOC-NAV-12 was conflating

| Object | What it is | Governing rule after this change | Budget |
|---|---|---|---|
| **(A) Rendered empty state / 404** | The template shown for a zero-result search or a missing page — not authored markdown content | DOC-NAV-12, narrowed | Title + 1-2 sentences (Atlassian, confirmed) + at least one link. No sourced maximum — Atlassian gives none. CONSIDER, argued. |
| **(B) Stub content page** | An authored page under 150 prose words that is not a landing page and not a completed first-steps page | DOC-NAV-12, narrowed | At least one outbound link (a dead end fails). No maximum — a short stub linking to five related pages for context is not a defect. SHOULD, measured below. |
| **(C) Short-by-design landing or first-steps page** | A `landing`-typed page (any length) or a first-steps page that reaches a verified, runnable result | DOC-TYPE-12 (landing) or DOC-DISC-10 (first-steps) — **removed from DOC-NAV-12's applies-to entirely** | Governed by the landing CTA/task-link budget above, or by DOC-DISC-10's own "words before the first verified result" measure. Never DOC-NAV-12's word-count gate. |

DOC-NAV-12's applies-to line drops `landing`. DOC-DISC-10's own evidence line
is corrected (below) rather than reconciled against DOC-NAV-12, because on
inspection they were never measuring the same thing.

### Why the three named "conflicts" don't actually fire

Checked every page-length number the critique used, against `fleet.json`
(wave 1's own raw per-page dataset, still on disk):

| Page named in the conflict | Claimed | Actual `words_prose` | Actual links | Under DOC-NAV-12's 150-word gate? |
|---|---|---:|---:|---|
| `ocx-catalog/docs/index.md` (DOC-TYPE-13's exemplar) | "fails DOC-NAV-12" | **433** | 9 | **No** — out of scope for DOC-NAV-12 as written |
| `ocx/website/src/docs/installation.md` (DOC-DISC-10's exemplar, "20 words") | 20 words total | **1,669** | 42 | **No** |
| `ocx/website/src/docs/getting-started.md` | (same family) | **2,173** | 73 | **No** |

The "20 words" and "185 words" figures are real — they come from
`ux-observability-posture.md` §8's **time-to-first-command** measurement
(words before the *first runnable command*, an opening-move metric, the same
species of thing my DOC-TYPE-11 check above measures) — not the page's total
length. `docs-page-types.md`'s Contradiction-4 prose conflates the two. None
of the three named pages was ever actually a candidate for DOC-NAV-12's
stub check, because none is under 150 words. **Recommend correcting
DOC-DISC-10's evidence line** to name its metric as "words to first verified
result," distinct from DOC-NAV-12's "total page length," so a future
consolidation doesn't reconstruct the same false conflict.

### Where the real conflict lives instead: run over the fleet

Using `fleet.json`'s per-page `words_prose`, `internal_links`+`external_links`,
and `type` fields (238 pages recorded with ≥1 sentence, across the 22
non-duplicate repos fleet.json covers — 10 short of `docs-shape.md`'s stated
248, the gap being pages with zero detected sentences, e.g. the 2-4-word
changelog stubs below):

- **58 of 238 pages are under 150 prose words.**
- **5 of those 58 are `landing/index`-typed** — real, today, not
  hypothetical: `grimoire-indexer/docs/ops/index.md` (25w, 2 links),
  `ocx-catalog/docs/ops/index.md` (57w, 3 links), `rules_ocx/docs/index.md`
  (37w, 4 links), and two `kate-middlechild` README indexes (122w/58w, 1 link
  each). Under a literal "exactly one link" rule, 4 of these 5 fail today —
  under the corrected split (object C, governed by DOC-TYPE-12's budget: ≤2
  CTAs, task links no longer capped at a fixed number) **all 5 pass easily.**
  This is the conflict DOC-NAV-12 actually has with the landing family, just
  on section-index pages, not the two homepages the critique named.
- **53 are non-landing stub candidates (object B).** Of those, **15 carry
  zero links** and would fail an "at least one link" floor — mostly
  near-empty changelog stubs (`ocx-mcp/docs/changelog.md` at 2 words,
  `ocx-mirror/docs/changelog.md` at 2 words, `ocx-sdk-python/docs/changelog.md`
  at 4 words — auto-scaffolded, never populated) and `ocx-mirror-sdk`'s
  known 94%-stub `docs/` tree (7 of its stubs land here: `api/text.md` at 6
  words, `api/index-builder.md` at 5, `api/cache.md` at 10, `recipes/*.md`,
  `schema/url-index.md`). **38 already carry ≥1 link and would pass.**
- **0 of 238 pages are a rendered empty-state or 404 template** — they
  aren't markdown content and can't appear in this dataset. This confirms
  `docs-navigation-search.md`'s own finding (0/9 sites author one) rather
  than contradicting it; object (A) has no fleet instances to check against
  yet, and ships as a template-authoring guideline for the first site that
  adds one, not as a retrofit obligation.

## 3. Rule-text changes to make

- **DOC-TYPE-11**: keep MUST (it now resolves on all 9 real fleet pages with
  no "cannot verify" case). Replace its verification with the scan above.
  Rewrite its rationale example to `ocx-mcp` only (not `ocx-sdk-python`).
- **DOC-TYPE-12**: keep the 2-CTA cap at SHOULD. Drop the 9-task-link number
  and the "groups of at most four" clause to CONSIDER, replaced by the
  labelled-grouping guidance (argued, ~8 as the trigger). Verification
  switches to the same markdown scan (both rules share one script).
- **DOC-NAV-12**: remove `landing` from applies-to. Split its budget into (A)
  empty-state/404 (CONSIDER, no sourced max, ships as a template guideline)
  and (B) stub-page floor (SHOULD, ≥1 link, measured at 15/53 current
  failures). Drop the "exactly one, two or more fails" cap entirely — no
  source supports an upper bound on a stub page's links, only a floor on
  whether it has any.
- **DOC-DISC-10**: no change to its exemption logic, only its evidence-line
  wording — name the metric as "words before the first verified result,"
  not page length, so it stops reading as a DOC-NAV-12 exception.

## Sources

- Re-fetched today: https://atlassian.design/foundations/content/designing-messages/empty-state
  (twice, targeted prompts — no button-count sentence found)
- Re-fetched today: https://docs.astral.sh/uv/, https://docs.gitlab.com/,
  https://docs.stripe.com/, https://laravel.com/docs (body-only CTA/task-link
  counts)
- `fleet.json` (wave 1's raw per-page dataset,
  `/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/fleet.json`)
- Every fleet file read directly for this commission: `ocx/website/src/index.md`,
  `ocx-catalog/docs/index.md`, `grimoire-indexer/docs/index.md`,
  `ocx-mcp/docs/index.md`, `ocx-sdk-python/docs/index.md`,
  `ocx-mirror-sdk/docs/index.md`, `ocx-mirror/docs/index.md`,
  `ocx-indexbot/docs/index.md`, `ocx-save/website/src/index.md`,
  `grimoire/docs/src/{SUMMARY.md,introduction.md}`
