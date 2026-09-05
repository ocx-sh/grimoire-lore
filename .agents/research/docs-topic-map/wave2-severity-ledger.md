---
title: Severity and check audit, the 132-rule ledger
topic: severity-and-check-audit
group: cross-cutting
wave: 2
agent: severity-and-check-audit
model: claude-opus-5[1m]
date_researched: 2026-09-05
sources_count: 16
scope: >
  Every one of the 132 rules across DOC-TYPE, DOC-DISC, DOC-PLAIN, DOC-EX,
  DOC-NAV, DOC-OBS and DOC-AGENT, passed mechanically through the program's own
  meta-rules. Reconciliation only. No new external research.
revises:
  - docs-page-types.md
  - docs-use-case-discovery.md
  - docs-plain-english.md
  - docs-examples.md
  - docs-navigation-search.md
  - docs-observability.md
  - docs-machine-readers-and-prior-art.md
---

# Severity and check audit

## Contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. The gates, in the order they run](#1-the-gates-in-the-order-they-run)
  - [2. The two meta-rules disagree on the marker string](#2-the-two-meta-rules-disagree-on-the-marker-string)
  - [3. Zero of the seven named check scripts exist](#3-zero-of-the-seven-named-check-scripts-exist)
  - [4. DOC-PLAIN-07 measured against this program's own corpus](#4-doc-plain-07-measured-against-this-programs-own-corpus)
  - [5. DOC-TYPE-08 is circular, and the repair](#5-doc-type-08-is-circular-and-the-repair)
  - [6. DOC-EX-01 has no continuous detector, and the repair](#6-doc-ex-01-has-no-continuous-detector-and-the-repair)
  - [7. The rollout conflict, resolved](#7-the-rollout-conflict-resolved)
  - [8. The ledger: DOC-TYPE](#8-the-ledger-doc-type)
  - [9. The ledger: DOC-DISC](#9-the-ledger-doc-disc)
  - [10. The ledger: DOC-PLAIN](#10-the-ledger-doc-plain)
  - [11. The ledger: DOC-EX](#11-the-ledger-doc-ex)
  - [12. The ledger: DOC-NAV](#12-the-ledger-doc-nav)
  - [13. The ledger: DOC-OBS](#13-the-ledger-doc-obs)
  - [14. The ledger: DOC-AGENT](#14-the-ledger-doc-agent)
  - [15. Bare numbers, the full DOC-AGENT-12 audit](#15-bare-numbers-the-full-doc-agent-12-audit)
- [Overlaps to merge](#overlaps-to-merge)
- [MUST rules that survive the gate](#must-rules-that-survive-the-gate)
- [Rules to drop](#rules-to-drop)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- 57 of the 132 rules ship at MUST today. 44 survive the program's own gates. 13 demote and 1 promotes.
- Six rules should not ship at all. Each is a duplicate of a stronger rule, or a scope note wearing a rule ID.
- Zero of the seven `checks/` scripts named in Verification cells exist on disk. Measured 2026-09-05 with `find` over `/home/mherwig/dev`.
- That fact alone puts 17 rules in the state DOC-OBS-15 forbids. Most are fixable by writing the file, not by demoting the rule.
- DOC-PLAIN-17 and DOC-AGENT-16 mandate two different literal marker strings for the same thing. Pick DOC-AGENT-16's. Give DOC-PLAIN-17 the severity cap alone.
- DOC-AGENT-16 owns the marker. DOC-PLAIN-17 owns the cap. DOC-OBS-15 owns the unwired check. Three meta-rules, three objects, no overlap after this pass.
- DOC-OBS-15 ships at SHOULD beside two MUST meta-rules that need it. Raise it to MUST and add one clause: every path a Verification cell names must resolve on disk.
- DOC-PLAIN-07's grep returns 1,621 hits across this program's own seven consolidations. Its top matches are `how-to`, `first-steps`, `zero-result` and ISO dates. Demote to CONSIDER and tighten the pattern.
- DOC-TYPE-08's assertion is a tautology. It compares a grep count to an entry count derived from the same headings the grep counts. Repair by counting all entry headings, then asserting each carries the prefix.
- DOC-EX-01 is the family's flagship MUST and has no continuous detector. Replace the one-off probe with a set-diff over fences the author already tagged runnable. That reuses DOC-EX-02 and DOC-EX-05 and has no false positives by construction.
- The DOC-PLAIN-18 versus DOC-TYPE-01 rollout conflict resolves by scope, not by severity. Every rule enforces on changed files from day one and warns whole-tree until the backfill lands.
- 21 rows carry a number with no named formula, tool or citation on the same line. The wave-1 critique found 18. Three more are DOC-TYPE-08's 70 characters, DOC-NAV-02's three levels, and DOC-DISC-12's "quarterly".
- DOC-DISC-12 ships the word "quarterly". DOC-NAV-15 bans exactly that word. One of the two must change, and DOC-NAV-15 holds the better argument.
- Four rules state a link-checking obligation. Two families, four IDs, three severities. DOC-OBS-01 and DOC-OBS-02 hold the measured evidence and the real tool flags. They own it.
- Three families ship a page-declaration carrier that DOC-TYPE-01 forbids. Rewriting the carrier is a text edit, not a demotion. The rules keep their severity.
- Five MUSTs rest on infrastructure nobody has built: DOC-OBS-06's scheduled job, DOC-AGENT-01's twin generator, DOC-TYPE-17's schema script, DOC-TYPE-11's CTA slot, DOC-DISC-03's calibrated token check.
- DOC-NAV-13's fleet violation is false. mdBook already defaults to `boost-title: 2` against `boost-paragraph: 1`, which satisfies the rule. Drop the rule.
- The `docs-examples` family ships a bare evidence word on all 19 rows. Normalising them to the sourced shape is mechanical and costs one editing pass.

## Findings

### 1. The gates, in the order they run

Each rule passes through six gates. A rule fails at the first gate that catches
it. The gates come from the program's own meta-rules, not from me.

| Gate | Source | What it does |
|---|---|---|
| G1 evidence-to-severity | `docs-page-types.md:58-60` | A rule resting only on `argued` or `asserted` evidence caps at CONSIDER. The exception is a rule that pins a project decision. Say "pinned" on the row. |
| G2 severity cap | DOC-PLAIN-17 | A row with no runnable command caps at SHOULD. |
| G3 marker | DOC-AGENT-16 | A row with no runnable command carries the literal string `unverified: reading heuristic`. |
| G4 numbers | DOC-AGENT-12 | Every numeric threshold names a formula, a tool or a citation on the same line. |
| G5 wired | DOC-OBS-15 | A check that is written down and not wired up does not ship as coverage. |
| G6 reach | new, this file | A MUST whose check reports "cannot verify" on most adopting sites is not a MUST. Fix the check or lower the severity. |

G5 splits into two states, and the split decides whether a rule demotes.

**script-to-be-written.** The algorithm, the inputs and the fail condition are
all stated. A reviser writes the file in an afternoon. The severity survives.
Shipping is blocked on the file landing in `checks/`, not on new research.

**script-to-be-designed.** No algorithm, or an algorithm that needs data or
infrastructure nobody has. The severity does not survive. DOC-OBS-06 and
DOC-AGENT-01 are the two clearest cases.

### 2. The two meta-rules disagree on the marker string

DOC-PLAIN-17 requires the literal `Unverified. Reading heuristic: <what a
reviewer looks for>`. DOC-AGENT-16 requires the literal `unverified: reading
heuristic`. Both ship at MUST. A row obeying one fails the other.

Resolve by splitting the object. DOC-AGENT-16 owns the marker string, because
its grep is the simpler one and it already scopes to "this rule set".
DOC-PLAIN-17 owns the severity cap, which is a different obligation and the one
its own rationale actually argues for. Delete the competing literal from
DOC-PLAIN-17's rule text.

Correct row shape after the split:

```
*Verify*: unverified: reading heuristic. A reviewer classifies every grid
label as task-phrased or product-noun.
*Severity*: SHOULD
```

Incorrect, and it fails two gates at once:

```
*Verify*: Reading heuristic.
*Severity*: MUST
```

DOC-AGENT-16 carries one more defect. It says a row holding both a command and
the marker "fails as ambiguous". Three real rows legitimately hold both,
because one clause is greppable and another is not: DOC-TYPE-13, DOC-NAV-04 and
DOC-AGENT-05. Reword DOC-AGENT-16 so the marker names which clause is
unverified, and a mixed row passes.

### 3. Zero of the seven named check scripts exist

Measured 2026-09-05 over `/home/mherwig/dev`, excluding `node_modules` and
`.git`:

```bash
for f in strip_prose.py long_sentences.py readability_gate.py nav_depth.py \
         doc-type.sh doc-type-conflation.sh docs_shape.py; do
  find /home/mherwig/dev -name "$f" -not -path '*/node_modules/*' \
       -not -path '*/.git/*'
done
# no output
find /home/mherwig/dev/grimoire-lore -type d -name checks
# no output
```

Every one returns nothing. Seventeen rules name one of these files in their
Verification cell. Because the rules are pre-ship research, that is expected
rather than scandalous. It becomes a defect the moment the artifact ships.

`checks/strip_prose.py` is the hot dependency. Nine DOC-PLAIN rules and two
DOC-TYPE rules run against its output. Write it first. `docs-shape.md` §3's
`strip_code_and_front()` is the working implementation to lift.

The right enforcement is a one-line addition to DOC-OBS-15. Every path a
Verification cell names must resolve on disk. That is checked before the rule
set is declared normative. That single clause catches all seventeen without a per-rule audit.

### 4. DOC-PLAIN-07 measured against this program's own corpus

The rule wraps every identifier in a code span. Its grep is
`\b[a-z0-9]+[-_][a-z0-9_-]+\b|\b[a-z]+[0-9]+\b`. Run over the seven
consolidations:

```bash
cd /home/mherwig/dev/grimoire-lore/.agents/research
for f in docs-page-types.md docs-use-case-discovery.md docs-plain-english.md \
         docs-examples.md docs-navigation-search.md docs-observability.md \
         docs-machine-readers-and-prior-art.md; do
  echo "$f: $(grep -oE '\b[a-z0-9]+[-_][a-z0-9_-]+\b' "$f" | wc -l)"
done
```

| File | Hits | Lines |
|---|---|---|
| docs-page-types.md | 244 | 473 |
| docs-use-case-discovery.md | 272 | 286 |
| docs-plain-english.md | 226 | 350 |
| docs-examples.md | 157 | 274 |
| docs-navigation-search.md | 265 | 340 |
| docs-observability.md | 255 | 496 |
| docs-machine-readers-and-prior-art.md | 202 | 430 |
| **Total** | **1,621** | 2,649 |

The most frequent matches are not identifiers. They are `how-to` at 38,
`zero-result` at 35, `first-steps` at 25, `getting-started` at 21, and the ISO
date `2026-09-05` at 41. Stripping code spans removes the file paths and leaves
the ordinary hyphenated English behind.

The wave-1 critique predicted this and did not measure it. Now it is measured.
The rule demotes to CONSIDER, and the pattern loses its bare arm. Keep only the
shapes ordinary English cannot produce. Those are a leading `--`, a trailing
`()`, a `::`, a `/`, and any term on a project-maintained identifier list.

### 5. DOC-TYPE-08 is circular, and the repair

The rule requires each troubleshooting entry title to open with `Error:` or
`Warning:`. The verification says both greps "must both be non-zero and must
equal the entry count".

The entry count has no independent definition. The only way to derive it is to
count the headings that the grep is already counting. So the assertion reduces
to `n == n` and can never fail. It is also admitted never to have been run
against `ocx-catalog/docs/ops/troubleshooting.md`, the fleet's one real
instance.

Incorrect, as shipped:

```bash
grep -c '^#\{2,4\} \(Error\|Warning\):' page.md   # -> n
# assert n == entry_count, where entry_count is that same n
```

Correct, and it can fail:

```bash
total=$(grep -c '^#\{2,4\} ' page.md)                        # every entry heading
tagged=$(grep -c '^#\{2,4\} \(Error\|Warning\):' page.md)    # the compliant ones
[ "$total" -eq "$tagged" ]                                   # untagged entries fail
```

The repaired check runs the same day it is written. The obligation stays
codified by GitLab's troubleshooting topic type. The severity drops to SHOULD
only until the repaired check reports a false-positive rate against that one
real page.

### 6. DOC-EX-01 has no continuous detector, and the repair

DOC-EX-01 is the family's flagship MUST. Its verification is a one-off probe:
break one documented command and confirm the required check reddens. That
proves the harness exists. It cannot notice an example added tomorrow with no
test behind it.

The rule that would notice is DOC-EX-10. It ships at SHOULD with an explicit ban
on gating, at a measured false-positive rate near 55 percent on one real page.

The repair does not need either. DOC-EX-02 already gives a declared binding key
with 66 live uses and zero orphans. DOC-EX-05 already gives a tier list of fence
languages. Put them together and the detector is a set difference, not a
heuristic:

```
runnable_fences  = every fence whose info string is on the project's runnable tier list
bound_fences     = every fence carrying a declared binding key
assert runnable_fences - bound_fences == {}
```

False positives are impossible by construction, because the check only looks at
fences the author explicitly marked runnable. An author who does not want a
fence gated tags it with a non-runnable tier, which DOC-EX-06 already requires a
reason for. DOC-EX-01 keeps MUST with this check in place of the probe.

### 7. The rollout conflict, resolved

DOC-PLAIN-18 says a rule launched at error must show zero current violations,
and new rules launch at warning scoped to the diff. DOC-TYPE-01 hard-fails an
untyped page, with 248 of 248 fleet pages in violation on day one. Both ship at
MUST and they cannot both be right as worded.

The disagreement is about scope, not about severity. Resolve it that way.

**One rollout rule for the whole set.** Every rule enforces on changed files
from the first commit. Every rule warns whole-tree until its backfill lands.
Then the whole-tree gate turns red and stays red.

DOC-PLAIN-18 is the owner. Two edits make it work. Broaden "a new prose rule" to
"a new rule", because the structural rules need the same treatment. Then replace
its launch condition. A rule launched at error whole-tree must show zero current
violations. A rule may launch at error on changed files with any number of
standing violations.

DOC-TYPE-01 then keeps MUST honestly. A new or edited page that carries no
declaration fails the merge. The 248 standing pages warn until `docs-plan`
backfills them. `page-type-set-and-declaration.md` R13's argument that a warning
is a rule nobody fixes is preserved, because the diff gate is red from day one.

### 8. The ledger: DOC-TYPE

Columns, in order: evidence as the rule states it, evidence as I assess it,
severity now, severity corrected. Then the one-line reason, the verification
status, any bare number, and the overlap with its recommended owner.

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| TYPE-01 | measured + normative | measured + normative | MUST | MUST (changed files) | Carrier is measured, rollout fixed by G7 | runnable-as-written | none | DISC-13, DISC-17, OBS-05 carriers. Owner TYPE-01 |
| TYPE-02 | measured | measured | MUST | MUST | Path inference measured at 0/35 against 18/23 | script-to-be-written | none | OBS-05 path glob. Owner TYPE-02, OBS-05 loses the glob |
| TYPE-03 | measured | measured | MUST | MUST | 0 false positives over 44 real pages | script-to-be-written | none | Absorbs TYPE-16 as a landing clause |
| TYPE-04 | normative + measured | normative + measured | MUST | MUST | 0 of 9 false positives, greps given verbatim | script-to-be-written | none | none |
| TYPE-05 | normative, check untested | normative principle, asserted pattern | SHOULD | CONSIDER | Rule text itself says not yet calibrated | runnable-as-written, uncalibrated | none | `check-false-positive-calibration` returns the rate |
| TYPE-06 | measured + argued | argued | SHOULD | CONSIDER | Third clause asks a script to judge that a sentence says the same idea | reading-heuristic | none | Depends on admonition portability, unresearched |
| TYPE-07 | codified + asserted | codified + asserted | CONSIDER | CONSIDER | Correct already | runnable-as-written | 100 words | DISC-16 uses the same unsourced 100. One number, one script |
| TYPE-08 | codified | codified | MUST | SHOULD | Assertion is a tautology, see finding 5 | circular | 70 characters | none |
| TYPE-09 | codified | codified | SHOULD | SHOULD | GitLab states the five-item trigger | runnable-as-written | none | none |
| TYPE-10 | measured + argued | measured pattern, argued number | SHOULD | SHOULD for one sentence, CONSIDER for 30 words | Split, the sentence count is measured across 5 exemplars | runnable-as-written | 30 words | none |
| TYPE-11 | measured | measured failure, unportable check | MUST | SHOULD | Reports cannot verify on 8 of 9 sites | inert-on-8-of-9-sites | none | `landing-check-portability` rewrites the check |
| TYPE-12 | measured + argued | argued numbers, generator-specific check | SHOULD | CONSIDER | Parses VitePress arrays, banned by the portability constraint | inert-on-8-of-9-sites | 2 CTAs, 9 links, groups of 4 | NAV-12 budget. Owner `landing-and-short-page-link-budget` |
| TYPE-13 | measured | measured | SHOULD | SHOULD | Cap already correct, marker missing | reading-heuristic plus a runnable true-zero half | none | none |
| TYPE-14 | measured | measured | MUST | MUST | Lorem Ipsum verbatim on a published site | runnable-as-written | none | NAV-12 placeholder clause. Owner TYPE-14 |
| TYPE-15 | measured | measured | MUST | MUST | Zero-cost prevention against a measured model reflex | runnable-as-written | none | none |
| TYPE-16 | measured + argued | argued thresholds | SHOULD | drop, merge into TYPE-03 | Mixing on a declared landing page is already TYPE-03's object | runnable-as-written | over 2 items, over 3 rows | Owner TYPE-03 |
| TYPE-17 | codified | codified obligation, no check | MUST | SHOULD | No script, no command, no fixture | script-to-be-designed | none | Its example section consumes EX-02's key |
| TYPE-18 | codified + normative | codified + normative | MUST | MUST | Two working fleet implementations exist today | runnable-as-written | none | Drop the OpenAPI arm, no research behind it |
| TYPE-19 | normative + argued | normative for H5, argued for counts | SHOULD | SHOULD for H5, CONSIDER for 15/20 | Split by evidence | runnable-as-written | 15 warn, 20 fail | NAV-05 owns the H5 cap. TYPE-19 keeps the split trigger |
| TYPE-20 | codified + measured + argued | codified obligation, argued floor | MUST | MUST at over 0 words, SHOULD warn under 100 | The measured failure case is literally zero words | runnable-as-written | 100 words | none |
| TYPE-21 | measured | measured | SHOULD | drop | Duplicate of OBS-01 at lower severity | runnable-as-written | none | Owner OBS-01 |

### 9. The ledger: DOC-DISC

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| DISC-01 | codified + measured | codified + measured | MUST | MUST | GOV.UK carries the obligation, the diff is specifiable | script-to-be-written | none | none |
| DISC-02 | codified | codified | MUST | MUST | Three-field schema check | runnable-as-written | none | none |
| DISC-03 | codified + argued | codified obligation, uncalibrated check | MUST | SHOULD | Own open questions demand a measured rate before MUST | script-to-be-written, uncalibrated | none | `check-false-positive-calibration` |
| DISC-04 | codified | codified | SHOULD | SHOULD | Stripe's three headings, verified at source | runnable-as-written | none | none |
| DISC-05 | codified + argued | codified | MUST | MUST | Grep for a fence or a `$ ` line runs as written | runnable-as-written | none | none |
| DISC-06 | codified + argued | codified + argued | SHOULD | SHOULD | Correct already | runnable-as-written | none | none |
| DISC-07 | measured + codified | measured + codified | MUST | MUST | Blocks the fabricated vote, the single worst failure here | runnable-as-written | none | Ship-blocking gap, the four enum values are never printed |
| DISC-08 | argued | argued, pinned | CONSIDER | SHOULD, pinned | The whole method rests on it, so it is a pinned decision not advice | script-to-be-written | none | none |
| DISC-09 | measured + argued | measured | SHOULD | SHOULD | 150 is the audit's own stub threshold, so cite it | runnable-as-written | 150 words, cite `docs-shape.md` §4 | DISC-10 exempts, NAV-12 uses the same 150 for a different object |
| DISC-10 | measured | measured | SHOULD | SHOULD | Needs a success marker that is not yet chosen | script-to-be-designed | none | EX-02 owns the marker. DISC-10 consumes it |
| DISC-11 | normative | normative | MUST | MUST | The artifact must exist on disk to be diffable | runnable-as-written | none | none |
| DISC-12 | argued | argued | CONSIDER | CONSIDER | Correct already, but the cadence word must go | runnable-as-written | "quarterly" | NAV-15 bans bare cadence words. Owner NAV-15 |
| DISC-13 | normative + measured | normative + measured | MUST | MUST, carrier rewritten | Content survives, the frontmatter carrier does not | runnable-as-written after the rewrite | none | TYPE-01 owns the carrier. The type half is TYPE-01's |
| DISC-14 | normative + argued | normative + argued | SHOULD | SHOULD | Schema check, correct already | runnable-as-written | none | none |
| DISC-15 | measured + argued | measured | SHOULD | SHOULD | Supabase's 9 steps is a named citation, put it on the line | runnable-as-written | 9 actions, cite Supabase | Consumes EX-02's marker |
| DISC-16 | measured | measured obligation, argued number | SHOULD | SHOULD | The fleet measured 20 and 185, not 100 | script-to-be-written | 100 words | TYPE-07's identical unsourced 100. One number, two applies-to |
| DISC-17 | normative | normative | MUST | MUST, carrier rewritten | Diataxis and Good Docs both carry it, the frontmatter grep does not | runnable-as-written after the rewrite | none | TYPE-01 owns the carrier. Move the rule into the tutorial contract |
| DISC-18 | normative | normative obligation, no check | MUST | SHOULD | Verification is the bare words "Reading heuristic" | reading-heuristic | none | EX-02's marker makes it partly mechanical, then MUST |
| DISC-19 | argued | argued | CONSIDER | CONSIDER | Correct already, add the marker | reading-heuristic | none | none |
| DISC-20 | normative | normative | SHOULD | SHOULD | Diataxis requires real-user testing, the reviewer field is assertable | runnable-as-written | none | none |
| DISC-21 | measured | measured | SHOULD | SHOULD | Shares `checks/nav_depth.py` with NAV-02 and NAV-03 | script-to-be-written | none | NAV owns nav-config reading. This is the cheap route to DISC-13 |
| DISC-22 | measured + argued | measured + argued | SHOULD | SHOULD | The dev-only trigger list must ship with it | script-to-be-written | none | none |

### 10. The ledger: DOC-PLAIN

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| PLAIN-01 | codified | codified, pinned | SHOULD | SHOULD, pinned | Frame decision 1 fixes this at SHOULD as house style | script-to-be-written | none | AGENT-10 requires the list cite an ancestor |
| PLAIN-02 | normative + measured | normative + measured | MUST | MUST | GOV.UK states 25, scoped to the diff already | script-to-be-written | 25 words, GOV.UK named | none |
| PLAIN-03 | normative | normative | SHOULD | SHOULD | GOV.UK states 5 | script-to-be-written | 5 sentences, GOV.UK named | none |
| PLAIN-04 | codified | codified | MUST | MUST | Fixture test, and nine rules depend on the script | script-to-be-written, write it first | none | none |
| PLAIN-05 | measured + argued | measured | SHOULD | SHOULD | Floor equals the fleet median, warn only per frame decision 7 | script-to-be-written | 50, fleet median 51.6 named | none |
| PLAIN-06 | argued | argued | CONSIDER | drop | No failure named, and it applies only to the types the floor exempts | script-to-be-designed | 10-point drop | none |
| PLAIN-07 | measured + argued | measured against, see finding 4 | SHOULD | CONSIDER | 1,621 hits on this program's own corpus, mostly ordinary English | runnable-as-written, unusable rate | none | none |
| PLAIN-08 | codified | codified | MUST | MUST | Zero current violations measured, so it can launch red today | runnable-as-written | none | none |
| PLAIN-09 | measured | measured | MUST | MUST | Governs the rule set's own wording, grep runs as written | runnable-as-written | none | AGENT-10, AGENT-11 sit beside it, no conflict |
| PLAIN-10 | argued | argued | CONSIDER | CONSIDER | Correct already, labelled uncalibrated in its own config | script-to-be-written | density 3 | none |
| PLAIN-11 | normative | normative | SHOULD | SHOULD, blocked | `changelog` is not a value in TYPE-01's enum, so the exemption cannot resolve | runnable-as-written, applies-to unimplementable | none | `readme-and-changelog-contracts` registers the value |
| PLAIN-12 | codified + asserted | asserted wordlist | SHOULD | CONSIDER | AGENT-10 requires a cited ancestor and this list has none | runnable-as-written | none | AGENT-10 owns the citation requirement |
| PLAIN-13 | codified | codified | MUST | MUST | Real tool, real rule names MD001, MD025, MD036, zero config | runnable-as-written | none | none |
| PLAIN-14 | normative | normative obligation, heuristic check | SHOULD | SHOULD | Tier-0 check is a heuristic and PLAIN-19 forbids Vale-only | reading-heuristic | none | none |
| PLAIN-15 | normative + measured | normative + measured | SHOULD | SHOULD | MD054's real per-style booleans, verified at source | runnable-as-written | none | Supersedes ocx's own rule, owner decision |
| PLAIN-16 | normative | normative | SHOULD | SHOULD | GitLab states the 15-link cap | script-to-be-written | 15 links, GitLab named | NAV-12 counts links too, different object |
| PLAIN-17 | normative + measured | normative + measured | MUST | MUST | Keeps the severity cap, loses the competing literal | runnable-as-written | none | AGENT-16 owns the marker string |
| PLAIN-18 | codified + measured | codified + measured | MUST | MUST, reworded | Owns the rollout for every family, see finding 7 | runnable-as-written | none | TYPE-01 conflict resolved by scope |
| PLAIN-19 | normative + measured | normative, pinned | MUST | MUST, pinned | Frame decision 6 pins the tiered gate | runnable-as-written | none | none |
| PLAIN-20 | measured | measured | SHOULD | SHOULD | The MD054 collision is real and named | reading-heuristic plus a per-construct grep | none | none |
| PLAIN-21 | measured | measured | CONSIDER | SHOULD | A supply-chain pin is not advice, and the wrong twin ships 111 rules at error | runnable-as-written | none | none |

### 11. The ledger: DOC-EX

Family-wide defect. All 19 rows ship a bare evidence word with no source in the
cell. DOC-AGENT-12 and the bob-rule shape both require the citation in the row.
Normalising is a mechanical editing pass and changes no severity.

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| EX-01 | measured | measured | MUST | MUST, check replaced | The probe cannot see a new unbacked example, see finding 6 | script-to-be-written | none | Consumes EX-02 and EX-05. EX-10 becomes optional |
| EX-02 | measured | measured | MUST | MUST | 66 live bindings, zero orphans | runnable-as-written | none | **Owns the success marker** for DISC-10, DISC-15, DISC-18, TYPE-17 |
| EX-03 | normative | argued plus two measured fleet instances | MUST | SHOULD | No source states it, and for TypeScript it names a tool that does not exist | runnable-as-written | none | `tested-examples-beyond-shell-python-rust` adds the fallback |
| EX-04 | measured | measured | SHOULD | SHOULD | Cap already correct, marker missing, and the harness is described not shipped | reading-heuristic | none | Becomes runnable once `checks/` carries the starter harness |
| EX-05 | codified | codified | SHOULD | SHOULD | markdownlint MD040 `allowed_languages`, a real lint | runnable-as-written | none | EX-01's replacement check reads the same tier list |
| EX-06 | codified | codified | MUST | MUST | ocx's paired marker is the working shape | runnable-as-written | none | none |
| EX-07 | codified | codified | MUST | SHOULD | A one-off probe cannot carry a MUST, and this is an ergonomics rule | runnable-as-written, one-off only | none | none |
| EX-08 | measured | measured | SHOULD | SHOULD | Grep for four absolute words, runs as written | runnable-as-written | none | none |
| EX-09 | measured | measured | SHOULD | SHOULD | Verified against Sybil's own source, `pathlib.match` contradicts its docstring | runnable-as-written, one-off fixture | none | none |
| EX-10 | measured | measured | SHOULD | SHOULD | The rule is the ban on gating, and that ban is greppable | runnable-as-written | 55 percent, measured on one page | EX-01's replacement makes this optional rather than load-bearing |
| EX-11 | measured | measured | MUST | MUST | Disable the recorder and re-run, a real probe with a real answer | runnable-as-written | none | none |
| EX-12 | normative | pinned, with a measured instance | MUST | MUST, pinned | No standards body states it, but it pins the program's central decision | runnable-as-written | none | Absorbs EX-19 as its second clause |
| EX-13 | codified | codified | MUST | MUST | `git ls-files` against the build task graph, a real contradiction to catch | runnable-as-written | none | Overrides frame decision 3, owner confirms |
| EX-14 | measured | measured | SHOULD | SHOULD | Two greps, one against a generated cast, one against the pinned parser | runnable-as-written | none | none |
| EX-15 | codified | codified, WCAG 2.2.2 Level A | MUST | MUST | Level A, and the grep reads a default | runnable-as-written | none | none |
| EX-16 | codified | codified, WCAG 2.2.2 Level A | MUST | MUST | Level A, and `controls: false` is greppable | runnable-as-written | none | none |
| EX-17 | measured | measured, WCAG 2.3.3 AAA | SHOULD | SHOULD | AAA is AAA, and the honest level is the shipped level | runnable-as-written | none | none |
| EX-18 | codified | codified | SHOULD | SHOULD | Fail when a `.tape` and a script tree coexist | runnable-as-written | none | none |
| EX-19 | argued | argued | CONSIDER | drop, merge into EX-12 | Its one instance sits in a repo the frame put out of scope | runnable-as-written | none | Owner EX-12 |

### 12. The ledger: DOC-NAV

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| NAV-01 | normative + measured | normative + measured | MUST | MUST | The precondition gate that keeps the family off three generator-less trees | runnable-as-written | none | **The DOC-TYPE and DOC-PLAIN families need the same gate and have none** |
| NAV-02 | normative + measured | normative + measured | MUST | MUST | NN/g counts open levels, the fleet already complies | script-to-be-written | three levels, tie to NN/g's two-open ceiling | Shares the script with NAV-04 and DISC-21 |
| NAV-03 | measured + codified | measured obligation, argued number | MUST | SHOULD | The measured failure is 20 items flat, not 8 | script-to-be-written | 8 pages | Move the number to the measured one and MUST returns |
| NAV-04 | normative + codified + measured | normative + codified | MUST | MUST | NN/g states breadcrumbs are unnecessary only at 1 to 2 levels | runnable-as-written on MkDocs, reading-heuristic on the other two | none | none |
| NAV-05 | measured + argued | measured + argued | SHOULD | SHOULD | `grep -cE '^#{5,6} '` runs as written | runnable-as-written | none | **Owns the H5 cap.** TYPE-19 loses its H5 half |
| NAV-06 | measured + argued | measured | SHOULD | SHOULD | 4000 comes from the fleet distribution, so cite `docs-shape.md` §4 | script-to-be-written | 4000 words, cite the fleet distribution | none |
| NAV-07 | measured | measured | MUST | MUST | A real broken anchor with three inbound references | script-to-be-written | none | The resolver half belongs to OBS-02. NAV-07 keeps the authoring rule |
| NAV-08 | measured | measured | MUST | drop | Duplicate of OBS-02, same flags, same measured numbers | runnable-as-written | none | Owner OBS-02 |
| NAV-09 | normative | normative obligation, half-runnable check | SHOULD | SHOULD for the role-noun grep, CONSIDER for the denylist half | Its own text admits an empty denylist is an unrun check | runnable-as-written plus script-to-be-designed | none | none |
| NAV-10 | codified + measured | codified + measured | SHOULD | SHOULD, one owner | Contradicts OBS-12 head on, and the grep passes on a beacon with no listener | runnable-as-written but satisfiable without the signal | asserted event name | **`zero-result-ownership-and-sink` adjudicates. Owner DOC-OBS** |
| NAV-11 | measured | measured | MUST | MUST | All three engine config references fetched, none reads the keys | runnable-as-written | none | none |
| NAV-12 | normative + measured + argued | argued cap | SHOULD | CONSIDER | Atlassian says one or two, so the cap is tighter than its own source | runnable-as-written | 150 words, exactly one link | TYPE-12, TYPE-13, TYPE-14, DISC-10. Owner `landing-and-short-page-link-budget` |
| NAV-13 | measured + argued | argued, and its fleet violation is false | CONSIDER | drop | mdBook defaults to 2 against 1, which already satisfies the rule | runnable-as-written, zero live targets | none | Keep one sentence in the nav depth file, no ID |
| NAV-14 | codified | codified obligation, argued number | SHOULD | CONSIDER | It consumes a log that OBS-12 defers, so it cannot outrank that signal | script-to-be-designed | 30 days | Owner `zero-result-ownership-and-sink` |
| NAV-15 | asserted | asserted | CONSIDER | CONSIDER | Correct already | runnable-as-written | 20 entries | **Owns the cadence-word ban.** DISC-12, OBS-10 and OBS-11 lose their bare cadences |
| NAV-16 | measured + normative | measured + normative | SHOULD | SHOULD | Upgrade the check from reviewer judgement to a grep on import paths | reading-heuristic, upgradable to runnable | none | Conditional on NAV-10 surviving |

### 13. The ledger: DOC-OBS

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| OBS-01 | measured | measured | MUST | MUST | Real tool, real flags, and a break-one-anchor proof | runnable-as-written | 89 percent to 2.9 percent, cited | **Owns built-output link checking.** Absorbs TYPE-21 |
| OBS-02 | measured | measured | MUST | MUST | 65 phantom links traced to one four-line stub | runnable-as-written | 65, cited | **Owns raw-pass configuration.** Absorbs NAV-08 and NAV-07's resolver half |
| OBS-03 | codified + argued | codified for presence | SHOULD | SHOULD | File exists, three rows, plus a portability grep | runnable-as-written | 3 rows | none |
| OBS-04 | normative | normative | SHOULD | SHOULD, pinned | GitLab states it verbatim, and frame decision 4 pins the adopter choice | runnable-as-written | none | none |
| OBS-05 | measured | measured | SHOULD | SHOULD, carrier rewritten | Its frontmatter-or-path classifier is banned twice by TYPE-01 and TYPE-02 | runnable-as-written after the rewrite | none | `runbook` is not in the enum. `declaration-key-unification` decides |
| OBS-06 | measured | measured cost, no built check | MUST | SHOULD | Its own open questions say price it or downgrade it, and OBS-15 forbids it | script-to-be-designed | none | A greppable weak form exists, see the candidates below |
| OBS-07 | measured | measured | SHOULD | SHOULD | Ably's bands and Twilio's target are both named | runnable-as-written | 30 minutes, Ably named | none |
| OBS-08 | codified | codified obligation, unmeasured check | MUST | SHOULD | Its own open questions call this the shape OBS-15 forbids | runnable-as-written, unmeasured rate | none | `check-false-positive-calibration` |
| OBS-09 | measured | measured | SHOULD | SHOULD | PR template keys, CI greps the body, `none` passes | runnable-as-written | none | none |
| OBS-10 | asserted | asserted, pinned | CONSIDER | SHOULD, pinned | OBS-12 and NAV-14 are unimplementable without this manifest | script-to-be-written | none | A CONSIDER carrying two SHOULDs is upside down |
| OBS-11 | measured | measured | SHOULD | SHOULD | 0 of 9 sites, plus State of Docs at 39 percent | runnable-as-written | none | Its cadence line defers to NAV-15 |
| OBS-12 | measured | measured | SHOULD | SHOULD, narrowed | Keep the deferral mechanism, remove the zero-result-specific disposition | runnable-as-written | none | NAV-10 conflict, owner `zero-result-ownership-and-sink` |
| OBS-13 | measured | measured | SHOULD | SHOULD, narrowed | The second grep is AGENT-12 restated, so drop it | runnable-as-written | none | AGENT-12 owns "a number names its source" |
| OBS-14 | normative + measured | normative obligation, invented numbers | SHOULD | SHOULD | Its own open questions call the threshold invented | script-to-be-written | 3 paragraphs of 40 words | Mark the numbers `(invented default)` as OBS-11 already does |
| OBS-15 | measured | measured | SHOULD | **MUST** | It is the gate PLAIN-17 and AGENT-16 both rely on, one rung too low | runnable-as-written | none | Add the clause that every named path resolves on disk |

### 14. The ledger: DOC-AGENT

| ID | Ev. stated | Ev. assessed | Sev. now | Sev. fixed | Reason | Verification status | Bare number | Overlap and owner |
|---|---|---|---|---|---|---|---|---|
| AGENT-01 | measured | measured demand, no implementation | MUST | SHOULD | Its own open questions say no known implementation on 3 of 3 generators | script-to-be-designed | none | `twin-generation-mechanics` unblocks it. Absorbs AGENT-02 |
| AGENT-02 | measured | measured | SHOULD | drop, merge into AGENT-01 | It is AGENT-01's implementation, not a separate obligation | runnable-as-written | none | Owner AGENT-01 |
| AGENT-03 | argued | argued | CONSIDER | CONSIDER | Correct already | script-to-be-written | none | none |
| AGENT-04 | normative + measured | normative + measured | SHOULD | SHOULD | The rule is conditional on publishing, which is the right shape | runnable-as-written | none | none |
| AGENT-05 | measured | measured | MUST | SHOULD | Verification is the bare words "Reading heuristic" for the per-hit half | runnable-as-written grep plus reading-heuristic | 1.1 percent, cited | none |
| AGENT-06 | measured | thinly measured, n=15 on one model | MUST | SHOULD | Its own open questions ask whether it earns MUST across models | runnable-as-written | 33 to 100 percent, cited | none |
| AGENT-07 | measured | measured | SHOULD | SHOULD | Mintlify's truncation claim is the citation, put it on the line | runnable-as-written | before the second `##` | none |
| AGENT-08 | measured | measured | MUST | MUST | Cheap, zero false positives, catches a real agent reflex | runnable-as-written | none | none |
| AGENT-09 | asserted | asserted | CONSIDER | drop | It is a scope note about the artifact's own table of contents | reading-heuristic | none | Keep as prose in the Verdict, not as a rule |
| AGENT-10 | codified | codified | MUST | MUST | Grep the wordlist for a citation URL, runs as written | runnable-as-written | none | **PLAIN-12 currently fails this rule.** Fix PLAIN-12 |
| AGENT-11 | measured | measured | SHOULD | SHOULD | Per-term dated comment, and a hit-rate re-run | script-to-be-written | none | none |
| AGENT-12 | measured | measured | MUST | MUST, shape fixed | Make it mechanical by requiring `N (<source>)` on the line | runnable-as-written after the shape fix | none | **21 rows fail it today.** OBS-13 loses its duplicate grep |
| AGENT-13 | codified | codified | SHOULD | SHOULD | Cap correct, marker missing | reading-heuristic | none | none |
| AGENT-14 | codified | codified | MUST | MUST | The VoltAgent template is the measured instance, the grep runs as written | runnable-as-written | none | none |
| AGENT-15 | codified | codified | SHOULD | SHOULD | GitBook's split, two labelled sections, greppable | runnable-as-written | none | none |
| AGENT-16 | normative + measured | normative + measured | MUST | MUST | **Owns the marker string.** Allow a mixed row when the marker names its clause | runnable-as-written | none | PLAIN-17 keeps the cap only |
| AGENT-17 | codified | codified | SHOULD | SHOULD | Log file with a stated schema, 5 samples, obra's method | runnable-as-written | 5 samples, obra named | Cost is an owner scoping decision |
| AGENT-18 | argued | argued | CONSIDER | CONSIDER | Correct already | script-to-be-designed | 5 to 10 questions | none |

### 15. Bare numbers, the full DOC-AGENT-12 audit

Twenty-one rows carry a number with no named formula, tool or citation on the
same line. The wave-1 critique found 18. Three more surfaced in this pass.

| Rule | The number | What it needs on the line |
|---|---|---|
| TYPE-07 | 100 words | Nothing states it. Mark `(asserted)` or measure the exemplar corpus |
| TYPE-08 | 70 characters | GitLab's troubleshooting page, if it states a title length. Else `(asserted)` |
| TYPE-10 | 30 words | `(argued from 5 fetched landing pages)` |
| TYPE-12 | 2 CTAs, 9 links, groups of 4 | `(argued, GOV.UK gives the rationale and no number)` |
| TYPE-16 | over 2 items, over 3 rows | `(argued)`. Merging into TYPE-03 removes the row |
| TYPE-19 | 15 warn, 20 fail | `(argued, calibrated on command-line.md at 30 commands)` |
| TYPE-20 | 100 words | `(argued, calibrated on ocx-sdk-python/docs/reference/api.md at 109 words)` |
| DISC-09 | 150 words | `(docs-shape.md §4 stub threshold)` |
| DISC-12 | "quarterly" | Replace with a count or a release boundary, per NAV-15 |
| DISC-15 | 9 actions | `(Supabase reactjs quickstart, 9 steps)` |
| DISC-16 | 100 words | `(argued midpoint between the fleet's 20 and 185, ux-observability-posture.md §8)` |
| NAV-02 | three levels | `(NN/g progressive disclosure, two open levels, plus one collapsed)` |
| NAV-03 | 8 pages | `(argued)`, or move it to the measured 20 |
| NAV-06 | 4000 words | `(fleet distribution, docs-shape.md §4)` |
| NAV-12 | 150 words, exactly one link | `(argued, Atlassian says one or two)` |
| NAV-14 | 30 days | `(asserted)` |
| NAV-15 | 20 entries | `(asserted, reasoned default)`, already honest in the prose |
| OBS-14 | 3 paragraphs of 40 words | `(invented default)` |
| PLAIN-06 | 10-point drop | `(asserted)`. Dropping the rule removes the row |
| PLAIN-10 | density 3 | `(uncalibrated default)`, already honest in the prose |
| AGENT-07 | before the second `##` | `(Mintlify, reading agents truncate long pages)` |

Six of these are already honest in the surrounding prose and only need the
label moved onto the line. Five need a real source or a demotion.

## Overlaps to merge

Nine overlaps. Each gets one owner and one ID.

**1. Link checking. Four rules, one obligation.**
DOC-TYPE-21 (SHOULD), DOC-OBS-01 (MUST), DOC-OBS-02 (MUST), DOC-NAV-08 (MUST).
Owner: **DOC-OBS-01** for built output and **DOC-OBS-02** for the raw pass. They
hold the measured 89 percent to 2.9 percent figure, the 65-phantom-link trace,
and the real lychee flags at a pinned version. Drop DOC-TYPE-21 and DOC-NAV-08.
DOC-NAV-07 keeps only its authoring half, which is the requirement to write an
explicit `{#kebab-id}` on any heading another file links to.

**2. The page-declaration carrier. Four schemes, three families.**
DOC-TYPE-01 and DOC-TYPE-02 mandate `<!-- doc_type: VALUE -->` on line 1 and
forbid path inference. DOC-DISC-13 greps `^tier:` frontmatter. DOC-DISC-17 greps
`type: tutorial`. DOC-OBS-05 accepts `type: runbook` frontmatter or a
`docs/runbooks/**` path glob. Owner: **DOC-TYPE-01**. The ground is measured. Frontmatter renders as visible
text on the fleet's mdBook site, and a path classifier misses 78 percent of one
repo. The other three rewrite their carrier
and keep their content and their severity. `declaration-key-unification` decides
whether `runbook` and `changelog` become enum values.

**3. Zero-result capture. Required by one family, deferred by another.**
DOC-NAV-10 (SHOULD, applies to all) versus DOC-OBS-12 (SHOULD, codifies the
deferral). Owner: **DOC-OBS**, because it owns instrumentation and the manifest
that records a deferral. The nav group holds the better evidence, which is the
DOM beacon costed at 20 to 30 lines per site. `zero-result-ownership-and-sink`
adjudicates and ships one rule, one severity, one sink. DOC-NAV-10 becomes a
cross-reference. DOC-NAV-14 and DOC-NAV-16 both consume that signal and cannot
outrank it.

**4. The type-mixing check.**
DOC-DISC-17 bans branching UI inside a page typed as a tutorial. DOC-TYPE-03
bans learning framing that switches to task conditionals. DOC-TYPE-16 bans
walkthrough steps and reference tables on a landing page. All three are the same
object: a declared type carrying another type's content. Owner: **DOC-TYPE-03**,
generalised to any declared type. DOC-TYPE-16 merges in. DOC-DISC-17 moves into
DOC-TYPE as the first clause of the tutorial contract, which is currently an
admitted empty slot.

**5. The unverifiable-row markers.**
DOC-PLAIN-17 and DOC-AGENT-16 mandate two different literal strings. Owner:
**DOC-AGENT-16** for the marker string, **DOC-PLAIN-17** for the severity cap.
DOC-OBS-15 is neither of those. It owns the written-but-unwired check, which is a
third object. After the split the three meta-rules do not overlap at all.

**6. The success marker.**
DOC-DISC-10 needs a marker for "this page reached a verified result".
DOC-DISC-15 needs one to end its step count. DOC-DISC-18 needs one per step.
DOC-TYPE-17 needs one for its example section. Owner: **DOC-EX-02**, whose
declared binding key exists today with 66 uses and zero orphans. No family
invents a second marker. This is also the cheapest remaining verification win in
the whole program, because it turns DOC-DISC-18 from a reading heuristic into a
set comparison.

**7. Heading depth and page length.**
DOC-TYPE-19 caps `#####` and splits a reference page past 15 items. DOC-NAV-05
caps in-page headings at H4. DOC-NAV-06 splits a non-reference page past 4000
words. Owner: **DOC-NAV-05** for the heading-depth cap and **DOC-NAV-06** for the
length trigger. DOC-TYPE-19 keeps only the reference-specific one-page-per-item
split, which is a different decision from either.

**8. Placeholder text.**
DOC-TYPE-14 (MUST) bans it everywhere. DOC-NAV-12 (SHOULD) repeats the ban
inside its empty-state contract. Owner: **DOC-TYPE-14**. DOC-NAV-12 drops the
clause.

**9. Cadence words.**
DOC-NAV-15 bans a bare cadence word. DOC-DISC-12 ships "quarterly".
DOC-OBS-11 names a triage cadence. DOC-OBS-10 states a cadence in its manifest.
Owner: **DOC-NAV-15**. The other three restate their trigger as a count or a
release boundary, or carry DOC-OBS-11's own `(invented default)` marker.

One more, adjacent but not an overlap. DOC-AGENT-12 requires a number to name
its source. DOC-OBS-13's second grep does exactly that for date intervals.
Owner: **DOC-AGENT-12**. DOC-OBS-13 keeps only "a date stamp is never a gate".

## MUST rules that survive the gate

Forty-four rules an author may ship as merge-blocking, once the conditions in
the right column are met. Every one of them enforces on changed files from day
one and warns whole-tree until its backfill lands, per finding 7.

| Rule | Condition before it blocks |
|---|---|
| DOC-TYPE-01 | none, ships today |
| DOC-TYPE-02 | `checks/doc-type.sh` exists |
| DOC-TYPE-03 | `checks/doc-type-conflation.sh` exists |
| DOC-TYPE-04 | `checks/strip_prose.py` exists |
| DOC-TYPE-14 | none, ships today |
| DOC-TYPE-15 | none, ships today |
| DOC-TYPE-18 | drop the unresearched OpenAPI arm |
| DOC-TYPE-20 | floor set at over 0 words, the 100 warns |
| DOC-DISC-01 | the title-diff script exists |
| DOC-DISC-02 | none, ships today |
| DOC-DISC-05 | none, ships today |
| DOC-DISC-07 | the four enum values are printed in the rule |
| DOC-DISC-11 | none, ships today |
| DOC-DISC-13 | carrier rewritten to DOC-TYPE-01's comment |
| DOC-DISC-17 | carrier rewritten, and moved under the tutorial contract |
| DOC-PLAIN-02 | `checks/long_sentences.py` exists |
| DOC-PLAIN-04 | `checks/strip_prose.py` exists |
| DOC-PLAIN-08 | none, zero current violations measured |
| DOC-PLAIN-09 | none, ships today |
| DOC-PLAIN-13 | none, markdownlint is zero-config here |
| DOC-PLAIN-17 | competing literal removed |
| DOC-PLAIN-18 | reworded per finding 7 |
| DOC-PLAIN-19 | none, ships today |
| DOC-EX-01 | the tagged-fence set-diff replaces the probe |
| DOC-EX-02 | none, ships today |
| DOC-EX-06 | none, ships today |
| DOC-EX-11 | none, ships today |
| DOC-EX-12 | evidence relabelled from normative to pinned |
| DOC-EX-13 | owner confirms a branching rule with no single default |
| DOC-EX-15 | none, WCAG 2.2.2 Level A |
| DOC-EX-16 | none, WCAG 2.2.2 Level A |
| DOC-NAV-01 | none, ships today |
| DOC-NAV-02 | `checks/nav_depth.py` exists |
| DOC-NAV-04 | breadcrumb check specified for VitePress and mdBook |
| DOC-NAV-07 | the anchor resolver ships inside DOC-OBS-02 |
| DOC-NAV-11 | none, ships today |
| DOC-OBS-01 | none, ships today |
| DOC-OBS-02 | none, ships today |
| DOC-OBS-15 | promoted to MUST, plus the path-resolves clause |
| DOC-AGENT-08 | none, ships today |
| DOC-AGENT-10 | none, ships today |
| DOC-AGENT-12 | the `N (<source>)` shape is specified |
| DOC-AGENT-14 | none, ships today |
| DOC-AGENT-16 | mixed rows allowed when the marker names its clause |

Sixteen of the forty-four ship today with no new file and no new research.

## Rules to drop

Six. Each is a duplicate, a scope note, or a rule with no live target.

| Rule | Why it goes | What replaces it |
|---|---|---|
| DOC-TYPE-21 | Duplicate of DOC-OBS-01 at a lower severity and weaker evidence | DOC-OBS-01 |
| DOC-NAV-08 | Duplicate of DOC-OBS-02, same flags, same measured numbers | DOC-OBS-02 |
| DOC-AGENT-02 | It is DOC-AGENT-01's implementation, not a second obligation | DOC-AGENT-01 |
| DOC-AGENT-09 | A scope note about the artifact's own table of contents, not a rule an adopter can violate | One sentence in the Verdict |
| DOC-NAV-13 | Its fleet violation is false. mdBook defaults to `boost-title: 2` against `boost-paragraph: 1`, and VitePress defaults to `{title: 4, text: 2, titles: 1}`. Nine of nine sites already comply | One sentence in the nav depth file, no ID |
| DOC-PLAIN-06 | No failure named, and it applies only to the two page types the readability floor already exempts. Cost is a per-diff double scorer run | nothing |

Two more are merges rather than drops, and their IDs disappear the same way.
DOC-TYPE-16 merges into DOC-TYPE-03. DOC-EX-19 merges into DOC-EX-12 as its
second clause.

The set goes from 132 rules to 124.

## Normative guidance candidates

These are the rules this pass adds or rewrites. Each names what it CHANGES,
REPLACES, or is NEW beside.

**1. One marker string, one owner.**
Mark an unverifiable clause with the literal string `unverified: reading
heuristic`, followed by what a reviewer looks for.
*Rationale*: two meta-rules mandate two different literals, so a row obeying one
fails the other.
*Verification*: `grep -c 'Unverified\. Reading heuristic:'` over the shipped rule
files returns 0. `grep -c 'unverified: reading heuristic'` returns the count of
unverifiable clauses.
*Evidence*: normative, the program's own DOC-AGENT-16.
*Severity*: MUST.
*CHANGES* DOC-PLAIN-17, which loses its competing literal and keeps the cap.

**2. Every named path resolves.**
Before the rule set is declared normative, every file path named in a
Verification cell must exist on disk.
*Rationale*: seven scripts are named across seventeen rules and none of them
exists, which is the state DOC-OBS-15 forbids.
*Verification*: `grep -oE 'checks/[a-z_.-]+' rules/*.md | cut -d: -f2 | sort -u |
while read p; do test -f "$p" || echo "MISSING $p"; done` prints nothing.
*Evidence*: measured, this file's finding 3.
*Severity*: MUST.
*CHANGES* DOC-OBS-15, which also rises from SHOULD to MUST.

**3. Enforce on the diff, warn on the tree.**
A new rule enforces at error on changed files from its first commit, and warns
whole-tree until its backfill lands.
*Rationale*: DOC-PLAIN-18 and DOC-TYPE-01 both ship at MUST today and directly
contradict each other on day-one violations.
*Verification*: the introducing pull request runs the check against `git diff
--name-only` for the error gate and against the full tree for the warning gate.
Two invocations, two severities, one script.
*Evidence*: codified, GitLab requires existing occurrences fixed before an error
rule lands, and Fern's `filter_mode: added` is the working pattern.
*Severity*: MUST.
*REPLACES* DOC-PLAIN-18's launch condition and resolves its conflict with
DOC-TYPE-01.

**4. Non-circular entry counting.**
Count every entry heading on a troubleshooting page, then assert each one
carries the `Error:` or `Warning:` prefix.
*Rationale*: the shipped assertion compares a count to itself and can never
fail.
*Verification*:
`total=$(grep -c '^#\{2,4\} ' p.md); tagged=$(grep -c '^#\{2,4\} \(Error\|Warning\):' p.md); [ "$total" -eq "$tagged" ]`
*Evidence*: codified for the obligation, GitLab's troubleshooting topic type.
Measured for the defect, this file's finding 5.
*Severity*: SHOULD until run against `ocx-catalog/docs/ops/troubleshooting.md`,
then MUST.
*REPLACES* DOC-TYPE-08's verification.

**5. A continuous detector for unbacked examples.**
Every fence tagged with a language on the project's runnable tier list must
carry a declared binding key.
*Rationale*: DOC-EX-01's probe proves the harness exists and cannot see an
example added tomorrow. Its detector DOC-EX-10 is banned from the gate at a 55
percent false-positive rate.
*Verification*: set-diff the fences whose info string is on the runnable tier
list against the fences carrying a binding key. A non-empty difference fails.
*Evidence*: measured, DOC-EX-02 reports 66 bindings with zero orphans and
DOC-EX-05 supplies the tier list through markdownlint MD040 `allowed_languages`.
*Severity*: MUST.
*REPLACES* DOC-EX-01's verification.

**6. Numbers carry their source in a fixed shape.**
Write every numeric threshold as `N (<formula, tool or citation>)` on the same
line.
*Rationale*: DOC-AGENT-12 requires the source but not a shape. Its own check is
therefore a reading task rather than a grep, and 21 rows fail it today.
*Verification*: extract each number from a Rule or Verification cell and assert
a parenthesised source follows it on the same line.
*Evidence*: measured, this file's finding 15.
*Severity*: MUST.
*CHANGES* DOC-AGENT-12 by giving it a mechanical shape.

**7. Tighten the identifier pattern.**
Match only shapes ordinary English cannot produce. Those are a leading `--`, a
trailing `()`, a `::`, a `/`, and any term on a project-maintained identifier
list.
*Rationale*: the shipped pattern returns 1,621 hits across this program's own
seven consolidations, and its most frequent matches are `how-to`, `zero-result`
and ISO dates.
*Verification*: run the tightened pattern over the same seven files and report
the count. Under 50 is acceptable, over 200 is not.
*Evidence*: measured, this file's finding 4.
*Severity*: CONSIDER until the tightened rate is measured.
*CHANGES* DOC-PLAIN-07.

**8. A greppable floor for runbook steps.**
Fail a runbook step that contains neither a fenced command nor a URL.
*Rationale*: DOC-OBS-06 ships at MUST on a scheduled job nobody has built, which
its own open questions say to price or downgrade.
*Verification*: for each step heading on a runbook-classified page, assert the
block below it contains a fence or an `https?://` match.
*Evidence*: measured for the cost model, ekline's 3 stale steps in 30. Argued for
the greppable floor.
*Severity*: SHOULD. MUST returns when the scheduled job ships and is priced.
*REPLACES* DOC-OBS-06's verification.

**9. A generator precondition for the prose and type families.**
Apply the page-type and prose families only where the docs surface is a
published site or a README. Never apply them to an agent's own research
directory.
*Rationale*: DOC-NAV-01 gates the nav family on a generator config file, and the
DOC-TYPE and DOC-PLAIN families have no equivalent. They fire today on
`grimoire-lore/docs/**` and on this program's own artifacts, and nobody checked
what that does.
*Verification*: the shipped glob's exclusion list names `.agents/`, `.claude/`
and any research directory. Assert the check's file list excludes them.
*Evidence*: normative, the frame's own glob decision. Measured, the wave-1
critique's surface 11.
*Severity*: MUST.
*NEW*, beside DOC-NAV-01.

**10. Sourced evidence cells in DOC-EX.**
Name the source inside the evidence cell on every row.
*Rationale*: one family of seven is authored to a different contract, shipping a
bare level word on 19 of 19 rows.
*Verification*: `grep -cE '\| (measured|codified|normative|argued|asserted) \|'`
over the DOC-EX table returns 0.
*Evidence*: normative, DOC-AGENT-12 and the bob-rule shape both require it.
*Severity*: MUST.
*CHANGES* all 19 DOC-EX rows, no severity moves.

## AI-agent angle

An agent asked to author or revise this rule set gets four things wrong, and
each has a cheap mechanical catch.

**It writes a rule and leaves the Verification cell aspirational.** The cell
names a script that reads like it exists. This is the dominant failure in the
wave, at 17 rules and 7 phantom files. The catch is candidate 2: extract every
path from a Verification cell and test that it resolves. One line of shell, and
it caught all seven.

**It assigns severity from how important the rule feels, not from the evidence
column it just wrote.** Thirteen MUSTs fail their own family's evidence gate,
and two of them ship the words "Reading heuristic" as the entire verification.
The catch is a two-column grep. Any row whose Severity is MUST and whose
Evidence is `argued` or `asserted` is a finding. A row carrying the word
`pinned` is exempt.

**It writes a check that cannot fail.** DOC-TYPE-08 compares a count to itself.
DOC-NAV-10's grep passes on a beacon with no listener. DOC-TYPE-11 reports
"cannot verify" on 8 of 9 sites and never fails. The catch is the red-state
proof the fleet already uses for Lighthouse: every check ships with a fixture
that it must reject. A check with no failing fixture does not ship.

**It writes a number and moves on.** Twenty-one thresholds carry no source. The
agent knows the number is invented at the moment it types it, and the prose
often says so two sections later. The catch is candidate 6: a fixed
`N (<source>)` shape turns a reading task into a grep.

The smallest single check that catches the most is candidate 2. Seven missing
files, seventeen affected rules, one line of shell.

## Contested / evolving

Every conflict this commission was assigned, resolved.

**DOC-PLAIN-17 versus DOC-AGENT-16 on the marker string.** Resolved by splitting
the object. AGENT-16 owns the string, PLAIN-17 owns the cap. Evidence: both
rules ship at MUST with different literals, so the current state is unsatisfiable
and one of them must yield. AGENT-16's grep is simpler and already scopes to
"this rule set", so it keeps the string.

**DOC-PLAIN-18 versus DOC-TYPE-01 on rollout.** Resolved by scope. Both keep
MUST. Every rule enforces on changed files and warns whole-tree until backfill.
Evidence: PLAIN-18's own rationale is about blocking every open pull request on
day one, which a diff-scoped gate does not do.
`page-type-set-and-declaration.md` R13's counter-argument, that a warning is a
rule nobody fixes, is satisfied because the diff gate is red from the first
commit.

**DOC-TYPE-21 versus DOC-OBS-01 and DOC-OBS-02 on link checking.** Resolved to
DOC-OBS. Evidence: the observability family holds the measured 89 percent to 2.9 percent
swing. It also holds the 65-phantom-link trace to a specific four-line file, and
the real lychee flags at a pinned action version. DOC-TYPE-21 states the same
obligation with none of that.

**DOC-DISC-13 versus DOC-TYPE-01 on the declaration key.** Resolved to
DOC-TYPE-01. Evidence: `grimoire/docs/book.toml` configures no frontmatter
preprocessor, so a `---` block renders as visible text on one of the fleet's
three generators. That is a measured rendering failure, and no counter-evidence
was offered for frontmatter beyond convenience.

**DOC-NAV-10 versus DOC-OBS-12 on zero results.** Not resolved here, and it
should not be. It has its own commission with the pricing work attached. What
this ledger fixes is the ownership: DOC-OBS carries it, one rule, one severity.
The evidence asymmetry is real and belongs in that commission's hands. The nav
group costed a DOM beacon at 20 to 30 lines per site, and the observability
group never saw that number.

**DOC-DISC-12's "quarterly" versus DOC-NAV-15's cadence ban.** Resolved to
DOC-NAV-15. Evidence: NAV-15's rationale is that a bare cadence never fires on a
low-traffic site, which describes this fleet exactly. DISC-12's quarterly audit
has no source behind the interval and its own evidence cell says so.

**DOC-PLAIN-12 versus DOC-AGENT-10 on wordlists.** Resolved to DOC-AGENT-10.
Evidence: PLAIN-12 ships an asserted list with no cited ancestor, which is
exactly what AGENT-10 forbids, and AGENT-10 is the MUST. PLAIN-12 drops to
CONSIDER until the `marketing-tone-wordlist` commission returns a sourced list.

**DOC-NAV-13's mdBook claim.** Resolved against the rule. Evidence: mdBook's
renderer reference gives defaults of `boost-title: 2`, `boost-hierarchy: 1`,
`boost-paragraph: 1`, which already satisfies "rank titles above body text".
VitePress defaults to `{title: 4, text: 2, titles: 1}`, which also satisfies it,
and the consolidation's own fleet table records ocx as inheriting that
unmodified. The rule has zero live targets on 9 of 9 sites. Drop it.

**Whether DOC-OBS-15 outranks the rules it protects.** Resolved to yes. Evidence:
DOC-PLAIN-17 and DOC-AGENT-16 both ship at MUST and both depend on OBS-15's
guarantee that a stated check is a real check. A SHOULD cannot carry two MUSTs.

Still open, and correctly so. Whether `runbook` and `changelog` join the type
enum belongs to `declaration-key-unification`. The four uncalibrated greps belong
to `check-false-positive-calibration`. The three conflated link budgets belong to
`landing-and-short-page-link-budget`. This ledger names the owner and the
severity each of them should carry when it returns, and does not pre-empt the
measurement.

## Sources

This is a reconciliation dive. It lists the files read and the commands run
rather than a web corpus. The three external facts it leans on were re-fetched
by the wave-1 critique on the same day and are cited to that verification.

| Path or command | What it is | Date / era | Why worth reading |
|---|---|---|---|
| `.agents/research/docs-page-types.md` | DOC-TYPE, 21 rules, and the program's evidence-to-severity gate at lines 58-60 | 2026-09-05 | The gate every other family is measured against, stated by only one of them |
| `.agents/research/docs-use-case-discovery.md` | DOC-DISC, 22 rules | 2026-09-05 | Holds the two rows that ship MUST on the words "Reading heuristic" |
| `.agents/research/docs-plain-english.md` | DOC-PLAIN, 21 rules | 2026-09-05 | Carries DOC-PLAIN-17, 18 and 19, three of the six meta-rules |
| `.agents/research/docs-examples.md` | DOC-EX, 19 rules | 2026-09-05 | The one family with a bare evidence word on every row |
| `.agents/research/docs-navigation-search.md` | DOC-NAV, 16 rules | 2026-09-05 | Holds the false mdBook violation and the zero-result conflict |
| `.agents/research/docs-observability.md` | DOC-OBS, 15 rules | 2026-09-05 | Carries DOC-OBS-15, and two rules that violate it inside the same file |
| `.agents/research/docs-machine-readers-and-prior-art.md` | DOC-AGENT, 18 rules | 2026-09-05 | Carries DOC-AGENT-12 and 16, the marker and the number rules |
| `.agents/research/docs-topic-map/wave1-critique.md` | The commission, and the re-fetch of 20 primary sources | 2026-09-05 | Names 18 of the 21 bare numbers and the one factual error |
| `.agents/research/docs-frame.md` | Corrections and the orchestrator decision table | 2026-09-05 | Decisions 1, 4, 6 and 7 are what makes four severities "pinned" |
| `.agents/research/docs-audit/docs-shape.md` | Fleet measurement, 23 surfaces, 248 pages | 2026-09-05 | §1 generators, §2 type classification, §4 stubs, §5 links, §7 landing pages |
| `.agents/research/docs-audit/ux-observability-posture.md` | Fleet UX and instrumentation posture | 2026-09-05 | §1 nav, §2 search, §3 feedback, §7 landing anatomy, §8 time to first command |
| `.agents/research/docs-audit/config-inventory.md` | Existing AI config, axis 5 is the 2-checks-in-92-rules number | 2026-09-05 | The baseline every meta-rule in this program is arguing against |
| `.agents/research/docs-audit/tested-examples-mechanism.md` | The 66 scripts, the `# doc:` binding, the 35 casts | 2026-09-05 | Proves DOC-EX-02's key is real, which is what makes overlap 6 possible |
| `find /home/mherwig/dev -name '<script>' -not -path '*/node_modules/*'` for seven names | Existence probe for every `checks/` script named in a Verification cell | run 2026-09-05 | Returned nothing for all seven. Finding 3 |
| `find /home/mherwig/dev/grimoire-lore -type d -name checks` | Existence probe for the checks directory itself | run 2026-09-05 | Returned nothing. No `checks/` directory exists anywhere yet |
| `grep -oE '\b[a-z0-9]+[-_][a-z0-9_-]+\b' <7 consolidations> \| wc -l` | DOC-PLAIN-07's own pattern run against this program's corpus | run 2026-09-05 | 1,621 hits over 2,649 lines, top matches ordinary English. Finding 4 |
