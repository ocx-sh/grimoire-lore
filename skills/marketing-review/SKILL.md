---
name: marketing-review
description: "On-demand review of marketing surfaces against the marketing-quality rule set: a README first screen, a pitch or home page, manifest and repository descriptions, claims and their evidence records, endorsements and popularity counts, open-source and licence wording, positioning drift, maturity lines, head metadata and AI-authorship markers. Use when someone asks to review, check or audit a landing page, a home page or hero, a README pitch, a tagline, product copy, a claim such as fast, secure or free, a testimonial, or a pull request that touches marketing copy. Not for accessibility or interface review, which is ux-review, and not for documentation pages, which is docs-review."
license: Apache-2.0
metadata:
  summary: Grades named marketing surfaces or a branch diff against the marketing-quality rules, runs the positioning, claims, head and voice checks in order, and reports findings with rule IDs and a separate owner list
  keywords: marketing,review,audit,landing-page,hero,readme,tagline,claims,evidence,testimonial,positioning,drift,maturity,seo,open-graph,licence,copy,marketing-quality
  grim.requires.skills.marketing-quality-reference: "./marketing-quality-reference:0"
---

# marketing-review

Contents: [Stop condition](#stop-condition) · [1 Targets](#1-pick-the-targets) ·
[2 Load](#2-load-the-rules) · [3 Checks](#3-run-the-checks-in-order) ·
[4 Landing](#4-the-landing-checklist) · [5 AI markers](#5-the-ai-marker-pass) ·
[6 Refute](#6-try-to-refute-each-finding) · [7 Report](#7-report) ·
[MUST list](#the-must-list) · [Limits](#limits)

The `marketing-quality` rule loads when an agent edits a copy surface. This skill
is the explicit trigger: grade surfaces nobody is editing, or a whole branch. It
reports. It never fixes unless asked and never changes a positioning sentence, a
category noun or a claim record.

## Stop condition

Stop when every target has findings or `clean`, and the report has three parts:
findings, owner questions and checks that did not run. A finding is
`path:line: RULE-ID [SEVERITY]: message`. Mark any finding no script produced
`unverified: reading heuristic`. Never write a verdict such as "good copy" or
"compliant".

## 1. Pick the targets

The paths `claims.toml`, `.agents/positioning.toml` and `.agents/voice.toml` are
pinned house conventions: defaults that an adopter overrides once, by naming another
path in the repository's agent instructions. Use the override when one exists.

- Named paths or URLs: use them as given.
- Nothing named: the branch diff of governed surfaces.

```sh
git diff --name-only --diff-filter=d --merge-base origin/HEAD -- README.md ':(glob)**/README.md' CHANGELOG.md Cargo.toml package.json pyproject.toml ':(glob)**/pages/index.*' ':(glob)**/astro.config.*' ':(glob)**/mkdocs.yml' claims.toml .agents/positioning.toml .agents/voice.toml
```

Add the built pages when the change touches a site. Drop agent config
(`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.claude/`), vendored copies and docs body
pages, which `docs-review` grades. Refuse a diff of more than 2,000 changed lines
and ask for a smaller set: scrutiny per line falls with size. Done: a typed list
of targets (README, pitch page, home page, manifest, head config, release note,
record).

## 2. Load the rules

Read the installed `marketing-quality` rule, then only the depth files it routes to
for the target types. They sit in the `marketing-quality-reference` skill:
`positioning.md`, `first-screen.md`, `claims.md`, `trust-claims.md`, `voice.md`,
`discoverability.md`. Find the checks directory in the project install, then the
agents install, then the global one:

```sh
for d in .claude/skills .agents/skills "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/skills; do ls -d "$d"/marketing-quality-reference/checks 2>/dev/null; done
```

Set `CHECKS` to the first line. All three miss means the rule is not installed: say
`grim add ghcr.io/ocx-sh/lore/marketing-quality` and stop.

## 3. Run the checks in order

Run from the repository root. Skip a check whose input is absent and list it under
"did not run". Steps 2, 3, 4 and 6 read a built `dist/`. When it is missing, build the
site with the repository's own command (the `build` entry of its task runner or
package scripts, or the build line in its README or CI). When no build is possible,
list those steps under "did not run" and read the source instead: the MKT-PAGE-02
declaration grep on the page source, and the MKT-PAGE-03 hero by hand, marked
`unverified: reading heuristic`.

The checks that scan the whole repository (the `git ls-files` blocks of
`trust-claims.md` and `claims.md`) hit agent config, specs and docs bodies. Narrow
each block's file list to the typed targets of step 1 before reading its output.

| Step | Command | Rules |
|---|---|---|
| 1 Record | `python3 -I "$CHECKS"/positioning_check.py fields` | MKT-POS-01, 02, 13 |
| 2 Drift | `python3 -I "$CHECKS"/positioning_check.py drift --dist dist --base origin/main` | MKT-POS-04, 07 to 11 |
| 3 Pitch scope | `python3 -I "$CHECKS"/positioning_check.py surface dist --need index.html` | MKT-PAGE-01, 02 |
| 4 Hero noun | `python3 -I "$CHECKS"/positioning_check.py hero-noun dist/index.html` | MKT-PAGE-03 |
| 5 Claims | `python3 -I "$CHECKS"/claims_lint.py --base origin/main --reading` (add each target path to scan named files) | MKT-CLAIM-01 to 05, 28 |
| 6 Head | `python3 -I "$CHECKS"/head_check.py dist --host "$HOST"` | MKT-SEO-01 to 10, 21 to 25 |
| 7 Live site | `python3 -I "$CHECKS"/live_site_check.py robots "$HOST"`, only when the user asks for the deployed site | MKT-SEO-11 to 17, 26 |

Step 1 exit 2 means no positioning record. Report that as the first finding, name
`positioning-brief` as the fix, and run the checks that need no record: steps 3, 5,
6. Steps 2 and 4 stay under "did not run". Never pick a noun yourself.

Step 5 exit 2 with `cannot read claims file` means no `claims.toml`. Report "no
claims record" as a finding, name `claims.md` for the record format, then run step 5
again with `--claims /dev/null` (or any empty file). Every pattern hit it prints is a hit
without a record. Never create `claims.toml` in the repository.

Then run these verifications by hand. Each is the verification cell or check block of the rule, in the depth file named.

| Surface | Block | Rules |
|---|---|---|
| README first screen | `positioning_check.py readme-window README.md`, then the checks of those rules in `first-screen.md` | MKT-PAGE-06, 09, 10 |
| Added copy lines | The checks of those rules in `voice.md` (em dash, first-person experience, authorship). For named existing files nothing is added, so grep each file instead of the diff. A hit there is a report, never a rewrite, because MKT-VOICE-03 binds added lines only | MKT-VOICE-03, 06, 14 |
| Generated media on a page | `positioning_check.py performer PAGE`, then the caption grep in `voice.md` | MKT-VOICE-16 |
| Recordings on a pitch or README | The check of that rule in `voice.md` | MKT-VOICE-17 |
| Licence wording | The checks of those rules in `trust-claims.md` | MKT-CLAIM-11, 12, 13 |
| Endorsements, logos, counts | The checks of those rules in `trust-claims.md` | MKT-CLAIM-20 to 24, 26 |
| A comparison table or chart | The checks of those rules in `claims.md` and `trust-claims.md`, and the denigration check in `positioning.md` | MKT-CLAIM-06, 30, MKT-POS-14 |

A claims hit without a live record is a finding even when the sentence reads as
true. The record decides, not the reviewer.

MKT-PAGE-10 needs `gh api "repos/$SLUG" --jq .archived`. Without a logged-in `gh`, try
`curl -s "https://api.github.com/repos/$SLUG"` and read `"archived"`. When both fail,
ask the owner and list the check under "did not run".

## 4. The landing checklist

For a pitch page, a home page or a README first screen, check these four things in
this order. Stop at the first MUST finding of a row and report it, then continue.

1. **Hero.** The recorded category noun sits in the H1 or the subhead (MKT-PAGE-03,
   MUST). No `AI`, `AI-powered` or `agentic` unless the record allows it
   (MKT-PAGE-05). The name-removal and competitor-swap tests are
   `unverified: reading heuristic` (MKT-PAGE-04, CONSIDER). A `home` page carries
   no hero (MKT-PAGE-11).
2. **Status line.** A version below 1.0.0 needs one plain maturity sentence in the
   first screen (MKT-PAGE-06, SHOULD), backed by a `maturity` claim row
   (MKT-PAGE-08). Never "stable", "production-ready" or "mature" on a 0.x first
   screen (MKT-PAGE-09, MUST). An archived repository says so on the first line
   (MKT-PAGE-10, MUST).
3. **Proof.** Every number, price, limit, count, comparison, quote, logo and
   adopter name on the first screen has a live record (MKT-CLAIM-02, 03, 20, 24,
   30). A popularity count shows its date and source link. A performance figure
   links its method page (MKT-CLAIM-06). A testimonial is never the evidence for
   an objective claim (MKT-CLAIM-28).
4. **Calls to action.** Length, placement and the adoption link of a
   `doc_type: landing` page are `docs-quality`'s (DOC-TYPE-10 to 15): run
   `docs-review` for them and cite its findings. Without `docs-review` installed,
   list DOC-TYPE-10 to 15 under "did not run". A `doc_surface: offer` page needs
   one next step that says what happens after the click (MKT-PAGE-12).

## 5. The AI-marker pass

Report AI-writing markers as `WARN`, never as findings, and never as a reason to
rewrite. No detector score, humanizer step or style-marker count may fail a
review (MKT-VOICE-01, 02). Report em dash density on existing copy with its rate
and baseline (MKT-VOICE-04; without `docs-quality-reference` there is no
`strip_prose.py`, so list that density check under "did not run"), and a corrective-framing phrase on an added line
(MKT-VOICE-20). A first-person account of the author's past with no `Owner words`
source (MKT-VOICE-06) and an authorship badge or "human-written" claim
(MKT-VOICE-14) are findings. Name the phrase and the line. Never write that a page
"reads as AI".

## 6. Try to refute each finding

Before reporting, try to prove each finding wrong: reread the line, check the
record, check the surface scope (is the page declared `pitch`, or is it a docs
home?) and the version. Drop what you refute. A finding with no failing input and
no wrong outcome is a style opinion.

## 7. Report

Group by target, MUST first, then by rule number. Example:
`README.md:3: MKT-POS-08 [MUST]: description differs from the recorded sentence`.
End each target with a count per severity. Then add:

- **Owner questions.** Each decision an agent must not take: the category noun,
  a price figure, a proof number, a named competitor, a quote or logo, the
  `status` flip, whether a page is a pitch.
- **Did not run.** Each check skipped, with the reason.
- **Warnings.** The AI-marker items from step 5.

## The MUST list

A hedge against the rule not having fired. Each ID is in the depth file named in
step 3.

- **Positioning:** one record, filled, read before editing; identity frozen while
  unreviewed; sentence, manifest, README tagline and meta equal; no forbidden
  variant, typed list or `do_not_say` hit (MKT-POS-01 to 13).
- **Claims:** a live record for every pattern hit, price, statistic, comparison and
  AI claim; "open source" only for OSI-approved licences; no compliance or
  certificate wording; no invented quote, rating or logo (MKT-CLAIM-01 to 08, 10 to
  14, 16, 18 to 24, 26, 28, 30).
- **First screen:** category noun in the hero, no grade word below 1.0, an archived
  README says so (MKT-PAGE-01, 02, 03, 09, 10).
- **Voice:** no detector gate, no humanizer, no invented author history, no
  authorship statement, no unlabelled generated media or fake recording
  (MKT-VOICE-01, 02, 06, 14 to 17).
- **Head:** absolute https origin, one canonical, unique title and description,
  Open Graph set, no misleading structured data, no unsupported AI-visibility
  claim; after a deploy, a recorded crawler policy checked live (MKT-SEO-01 to 06,
  10, 11 to 13, 15 to 18, 20, 21, 23).

## Limits

The claims pattern set is a mechanical filter. It was measured on 2026-11-27 on 19
held-out developer-product home pages, fetched that day, by one reader with no
second rater: 59.5 percent precision for the 15-line set and recall of at most 55.9
percent (`claims.md` holds the table; the earlier set scored 58.2 percent on frozen
strict labels). Expect about 4 false hits in 10 on a new page. Pages that are not developer products were not measured.
A false hit costs a marker or an allow entry. Built-page checks read
the built page, because source misses text a component renders. Which country's law
applies is the owner's and counsel's question: never state it.
