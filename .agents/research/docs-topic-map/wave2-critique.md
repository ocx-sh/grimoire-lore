---
title: Documentation design, wave 2 convergence critique
program: docs
role: convergence critic
model: claude-opus-5[1m]
date: 2026-09-05
wave: 2
inputs:
  - docs-frame.md, body plus Corrections plus the orchestrator decision table
  - docs-topic-map/wave1-critique.md
  - docs-topic-map/wave2-declaration-key.md
  - docs-topic-map/wave2-severity-ledger.md
  - docs-topic-map/wave2-calibration-a.md
  - docs-topic-map/wave2-calibration-b.md
  - docs-topic-map/wave2-landing-check-portability.md (spot-check only)
  - the seven revised consolidations, read in full
verdict: ready-to-draft
---

# Wave 2 convergence critique

## Verdict

**ready-to-draft.**

The literal stop rule is not met, and I am calling it anyway. Wave 2 added 13
new MUST rules and about 15 new agent failure modes. That is the expected
result of discharging ten wave-1 commissions, not a sign the domain is still
open. The right test is forward looking. Every research item wave 2 leaves
behind promotes a severity or builds a fixture. None of them adds a new MUST
rule and none names a new failure mode.

The three remaining research questions are `explanation-boundary-calibration`
(DOC-TYPE-05), `disc-03-second-calibration` (DOC-DISC-03) and
`twin-generation-mechanics` (DOC-AGENT-01). All three rules already ship at an
honest lower severity. Answering them moves CONSIDER to SHOULD or SHOULD to
MUST. A wave whose whole yield is three promotions does not earn its cost.

What blocks shipping is not research. It is ten check scripts that do not exist
on disk, a set of fixtures nobody has written, and about a dozen rules that
address the author of the rule set rather than an adopter. A third research
wave cannot do any of that. The author can, and the Authoring notes below say
how.

The sourcing held up under spot-check. I verified 21 measured claims across the
seven consolidations against the calibration reports and the landing dive. All
21 matched to the digit. I verified six severity changes against the ledger or
the dive that caused them. All six were justified, including the two places a
consolidation overrode the ledger on new evidence and said so in the row.

## What wave 2 added

### New MUST rules, by ID and by the dive that produced each

| ID | Rule | Dive |
|---|---|---|
| DOC-TYPE-22 | A how-to states its goal before the first `##` | `how-to-and-explanation-contracts` |
| DOC-TYPE-28 | Never write the declaration as YAML frontmatter | `wave2-declaration-key` |
| DOC-TYPE-29 | Never place the declaration comment above frontmatter | `wave2-declaration-key` |
| DOC-TYPE-30 | Use `{/* */}` in MDX, set Docusaurus `format: detect` | `wave2-declaration-key` |
| DOC-TYPE-31 | Run this family only over published documentation | `wave2-severity-ledger`, candidate 9 |
| DOC-TYPE-32 | A README states what the project is before anything else | `readme-and-changelog-contracts` |
| DOC-TYPE-40 | Never gate a build on an `## [Unreleased]` heading | `readme-and-changelog-contracts` |
| DOC-EX-20 | A fence tier suffix is one hyphen-joined token | `tested-examples-beyond-shell-python-rust` |
| DOC-EX-27 | A live sandbox is never the only way to see an example | `interactive-elements-contract` |
| DOC-PLAIN-22 | AI assistance is disclosed on the PR, never on the page | `error-message-links-and-ai-authoring-policy` |
| DOC-PLAIN-23 | Run this family only on published documentation | `wave2-severity-ledger`, candidate 9 |
| DOC-AGENT-19 | Every check ships with a fixture it must reject | `wave2-severity-ledger`, finding 5 and 6 |
| DOC-AGENT-20 | Measure a check before it ships above SHOULD | both calibration dives |

One promotion, DOC-OBS-15 from SHOULD to MUST, plus the clause that every path
a verification names must resolve on disk. The ledger's argument is right. A
SHOULD cannot carry two MUSTs that depend on it.

Rule count moved from 132 to 179 IDs, of which 7 are retired in place, so 172
rules ship. MUST count is about 58. Thirteen wave-1 MUSTs demoted and 13 new
MUSTs arrived, so the merge-blocking surface did not shrink.

### New agent failure modes

Each one was measured this wave, not reasoned.

1. A transcluded example file passes a green build and does not compile.
   `ocx-mirror-sdk` has shipped 5 of 6 broken examples since 2026-06-01.
   `mkdocs build --strict` checks links and never imports the file.
2. A declaration comment placed above existing frontmatter destroys that
   frontmatter on all three fleet generators.
3. An HTML comment in an `.mdx` file is a hard build error, and Docusaurus 3
   applies MDX parsing to plain `.md` by default.
4. A space-separated fence info string such as `ts twoslash` is unparsed under
   MkDocs Material, and the damage swallows later page content.
5. `yaml.safe_load` hard-fails on 4 of 7 real fleet `mkdocs.yml` files over the
   `!ENV` and `!!python/name:` tags those tools ship by default.
6. A naive heading grep counts mdBook's own mandatory `# Summary` line as a
   grouping divider, so a flat 20-item nav reads as grouped.
7. A first-fence scan misses VitePress `<<<` and MkDocs `--8<--` includes, and
   reads 2019 words on a page whose real count is 185.
8. An optional prefix group in a regex swallows the framing it was there to
   require. `(for )?agents?` produced 22 hits and 22 false positives.
9. markdownlint MD025 treats a frontmatter `title:` as a second H1 by default,
   which is a 100 percent false-positive rate against this fleet's convention.
10. A word counter reads a markdown link target as prose words.
11. A sentence splitter reads a bare `1.` list marker as a sentence.
12. A tell wordlist collides with ordinary technical vocabulary, and two rules
    rediscovered the same false positives alone.
13. A verification cell names a check script that reads as if it exists. This
    is the dominant defect in the program's own set, at 17 rules and 7 files.
14. A severity is assigned from how important a rule feels, before the check
    has run once against real content.
15. A check is written that cannot fail. A count compared to itself, a grep on
    a beacon with no listener, a probe that reports "cannot verify" and passes.

Items 13, 14 and 15 are why DOC-OBS-15, DOC-AGENT-19 and DOC-AGENT-20 exist.

## What wave 2 fixed

Every wave-1 "claims unverified" item, with its disposition.

### MUSTs whose verification could not go red

| Wave-1 item | Disposition |
|---|---|
| DOC-EX-01, probe cannot see a new example | **fixed.** Set-diff of runnable-tagged fences against fences carrying DOC-EX-02's key. No false positives by construction. MUST kept |
| DOC-TYPE-11, inert on 8 of 9 sites | **fixed.** Generator-neutral markdown scan, run on 9 real landing pages plus 2 controls, 3 fail and 0 report "cannot verify". MUST kept against the ledger's demotion, and the row records the disagreement |
| DOC-TYPE-12, VitePress-only frontmatter parse | **fixed and downgraded.** Same script, and the 9-task-link cap plus the groups-of-four clause are dropped because re-fetching found uv at 12, GitLab at 18 and Stripe past 30 |
| DOC-TYPE-17, no script and no fixture | **downgraded.** MUST to CONSIDER on a measured 649 of 658 entries, 98.6 percent, with 10 of 10 sampled hits carrying the content in prose. Keyword arms dropped |
| DOC-TYPE-08, circular assertion | **fixed and downgraded.** Count every entry heading, then assert each carries the prefix. MUST to SHOULD until the repaired check reports a rate. Run on all 3 real fleet troubleshooting pages |
| DOC-OBS-06, unbuilt scheduled job | **downgraded.** MUST to SHOULD with a greppable per-step floor, plus an exemption for non-routable example addresses |
| DOC-AGENT-01, no known implementation | **downgraded.** MUST to SHOULD, and the gap is named as `twin-generation-mechanics` |

### Reading heuristics shipped above the cap

DOC-DISC-18 and DOC-AGENT-05 both demoted to SHOULD and both given the literal
marker. **fixed.** Markers added to DOC-TYPE-13, DOC-AGENT-13 and DOC-NAV-16.
DOC-EX-04 no longer needs one, because `run_doc_examples.py` was written and
tested in both directions. DOC-AGENT-09 was retired, because a scope note about
the artifact is not a rule an adopter can violate.

### MUST severity on argued or asserted evidence

DOC-TYPE-20 **fixed**, MUST now attaches to the measured zero-word floor and
the argued 100 warns. DOC-AGENT-06 **downgraded** to SHOULD on n=15 and one
model. DOC-OBS-08 **downgraded** to SHOULD, and see the still-open note below.

### Numbers with no named formula, tool or citation

**fixed.** The ledger audited all 132 rows and found 21, three more than wave 1
did. DOC-AGENT-12 now demands the literal shape `N (<source>)`, which turns a
reading task into a grep. Every consolidation applied the shape.

### Checks with an unmeasured false-positive rate

| Wave-1 item | Disposition |
|---|---|
| DOC-PLAIN-07 bare-identifier grep | **fixed.** Measured at 1,621 hits over the program's own corpus, top matches `how-to` and ISO dates. Demoted to CONSIDER and the pattern replaced |
| DOC-DISC-03 solution-shaped need | **downgraded.** Simulated at 100 percent false positive on 5 legitimate needs. MUST to SHOULD, token construction rewritten and not yet re-run |
| DOC-OBS-08 fabricated metric | **downgraded, still open.** Demoted on wave 1's own 5-of-7 number. Neither calibration worker re-measured it. Both cited a ledger section that does not contain it |
| DOC-TYPE-05 opinion grep | **still open.** Never calibrated by either worker, each believing the other had done it. Ships at CONSIDER and the page-types Verdict names the gap outright |

### The one factual error

DOC-NAV-13's mdBook claim. **fixed.** The false violation is retracted. The
rule survives at CONSIDER with new wording, because calibration wrote a check
that passes on grimoire's real config and reddens on a planted flattened one.
The Good Docs template count is settled at 28 against the live page.

### Surfaces never studied

Fixed: README (DOC-TYPE-32 to 36), CHANGELOG and migration links (37 to 41),
CONTRIBUTING (42 and 43), how-to and explanation (22 to 27), error-message
links (DOC-OBS-18 and 19), the AI-authoring policy (DOC-PLAIN-22), library
versus CLI versus service (DOC-DISC-23 to 25), and the program's own tree
firing its own rules (DOC-TYPE-31 and DOC-PLAIN-23).

Retired: API reference from a spec. The OpenAPI arm is dropped from
DOC-TYPE-18 and DOC-EX-32 gates on the surface not existing.

Partially fixed: Sphinx and rST. The `%` and `..` carriers rest on primary
documentation and no built fixture. Site-component portability is covered for
fences and admonition dialects and not stated as a rule.

Still open: versioned docs and i18n, accessibility outside the terminal player,
and print or offline output. Only the second one matters, and it is in the
load-bearing list below.

## Contradictions remaining

1. **DOC-TYPE-28 and DOC-TYPE-29 are assigned twice.** `docs-examples.md`
   hands its tooltip-selection rule and its WCAG 1.4.13 hover rule to DOC-TYPE
   "proposed there as DOC-TYPE-28 and DOC-TYPE-29". Those two numbers belong to
   the declaration mechanics in `docs-page-types.md`. Neither tooltip rule
   appears anywhere in that file. Two rules are lost and two IDs collide.

2. **The fleet has zero runbook pages, and it has two.**
   `wave2-declaration-key.md` §9 argues against a third key on `grep -ril
   runbook` returning nothing. That grep covered `ocx*/docs`, `ocx/website` and
   `grimoire/docs` only. It never looked at `creeptd-ng`.
   `wave2-calibration-a.md` §3 names `creeptd-ng/docs/dev-infra/play-full.md`
   and `play-lan.md` as the rule's own motivating evidence, with 4 and 2 real
   fenced command blocks. `docs-observability.md` believes calibration A.
   `docs-page-types.md` documented gap 4 still states zero.

3. **The one merge-blocking page class lives outside the shipped glob.**
   DOC-OBS-05 blocks a merge on runbook drift and pins a retrofit onto
   creeptd-ng's two pages. DOC-TYPE-31 and DOC-PLAIN-23 build the file list
   from `git ls-files` under a directory holding a generator config.
   `creeptd-ng` has no `mkdocs.yml`, no `book.toml` and no `.vitepress`,
   confirmed today. The declaration check would never read those two pages.

4. **DOC-PLAIN-05 and DOC-PLAIN-10 cite the wrong rule for their 300-word
   floor.** Both rows read "under 300 prose words (DOC-DISC-09's stub floor)".
   DOC-DISC-09's floor is 150 words, and its own revision log says so
   explicitly while rejecting the 300. This is exactly the defect DOC-AGENT-12
   exists to prevent, inside a row that obeys DOC-AGENT-12's shape.

5. **Wave 2's own new MUSTs fail DOC-AGENT-19 and DOC-AGENT-20.** No fixture
   exists for any check, because no check exists. DOC-PLAIN-22, DOC-PLAIN-23,
   DOC-TYPE-31, DOC-EX-27, DOC-AGENT-19 and DOC-AGENT-20 all ship above SHOULD
   with no measured hit count and false-positive rate on the row. The rules
   name no exemption for a pinned decision or a config-shape check.

6. **DOC-AGENT-16 fails on the corpus text that explains it.**
   `docs-machine-readers-and-prior-art.md:474` contains the literal string
   `Unverified. Reading heuristic:` inside a Conflicts-resolved paragraph.
   DOC-AGENT-16's own verification requires that grep to return zero over the
   shipped files.

7. **`wave2-calibration-a.md` misreads the ledger in three dispositions.** It
   records DOC-OBS-10 as "resolved to drop", DOC-DISC-19 as "recommends drop"
   and DOC-DISC-17 as "inert-9/9". The ledger promotes DOC-OBS-10 to SHOULD
   pinned, keeps DOC-DISC-19 at CONSIDER, and keeps DOC-DISC-17 at MUST.
   `docs-observability.md` caught one of the three and recorded the
   disagreement. The other two never propagated, so no rule is wrong today.

8. **Two hit counts are cited to a section that does not contain them.**
   DOC-PLAIN-07's "9,618 hits over 184 of 186 pages" and DOC-OBS-08's "5 of 7
   over 186 pages" both name `wave2-severity-ledger.md` §4. That section
   measures only DOC-PLAIN-07, at 1,621 hits over 7 files. The 186-page numbers
   come from the wave-1 consolidations. Both rules are demoted either way.

Contradictions 1 to 4 change a shipped rule. Contradictions 5 to 8 are
citation and self-consistency defects that the drafting pass must clear.

## Load-bearing open questions

Only questions whose answer changes a shipped rule.

1. **Does the type and prose scope gate accept a committed `docs/` tree with no
   generator config?** DOC-NAV-01 correctly gates the nav family on a generator
   config. DOC-TYPE-31 and DOC-PLAIN-23 copied that shape, which excludes
   `creeptd-ng`, `kate-middlechild` and `grimoire-lore`. That takes the fleet's
   only two runbook pages out of scope and leaves 3 of 23 surfaces ungoverned.
   Deciding it changes DOC-TYPE-31, DOC-PLAIN-23, DOC-OBS-05 and DOC-OBS-06.

2. **Does the shipped artifact carry a page-level accessibility rule at all?**
   172 rules govern documentation and none mentions alt text, contrast, keyboard
   order or table semantics. WCAG 1.1.1 is Level A and every cited style guide
   states it. The wave-1 critic named this and wave 2 did not act. Either ship
   one grep-backed rule or state the exclusion in the Verdict.

3. **Do DOC-AGENT-19 and DOC-AGENT-20 exempt a pinned or config-shape row?**
   As written they do not, and six of wave 2's own MUSTs fail them. One clause
   settles it, and the clause changes two shipped MUST rules.

4. **`twin-generation-mechanics`.** Can MkDocs Material, VitePress and mdBook
   each emit a per-page `.md` twin with no custom plugin? This is the only
   remaining research question, and its answer moves DOC-AGENT-01 from SHOULD
   back to MUST.

Two owner decisions already pin a shipped value and are not research. Frame
decision 4 picks the default blocking class for DOC-OBS-04. The zero-result
sink host and privacy posture pin DOC-NAV-10's endpoint.

## Authoring notes

### Route these rules away from the glob-scoped rule

About a third of the set does not belong in a file an agent loads while editing
a docs page.

- **DOC-DISC-01 to DOC-DISC-12 govern the discovery artifact,** which no repo
  has ever produced. Calibration measured them as zero targets, not zero hits.
  They are the `docs-plan` skill's procedure. Ship them there.
- **DOC-PLAIN-17, 18, 19, 21, DOC-OBS-15, DOC-AGENT-10 to 20 govern the rule
  set itself,** not an adopter's documentation. DOC-AGENT-15 already prescribes
  a two-tier split. Apply it to the artifact boundary, not only to voice.
- **DOC-EX-22 (Go), DOC-EX-28 (Sandpack), DOC-EX-31 (console vendors) rest on
  vendor status that goes stale.** Keep them in a dated depth section or in the
  corpus. A rule citing a 2025 release date ages badly inside a rule file.
- The 7 retired rows stay in the corpus. The shipped file carries no retired
  row and never reuses a number.

That leaves roughly 100 adopter-facing rules for `docs-quality`, which still
does not fit the frame's 200-line index cap. Plan the index as a pointer to six
depth files, and put only the MUST list and the glob in the index itself.

### Overlaps already merged, and the ID that survives

| Object | Owner | What loses |
|---|---|---|
| Link checking, built output | DOC-OBS-01 | DOC-TYPE-21 retired |
| Link checking, raw pass and resolver | DOC-OBS-02 | DOC-NAV-08 retired, DOC-NAV-07 keeps the authoring half |
| Page declaration carrier | DOC-TYPE-01, plus 28 to 31 | DISC-13, DISC-17, OBS-05, NAV-05, NAV-06, NAV-17 all call `checks/doc-declaration.sh` |
| Success marker for a verified result | DOC-EX-02's `# doc:` key | DISC-10, DISC-15, DISC-18 and TYPE-17 consume it. NAV-05's carve-out should too |
| Type mixing | DOC-TYPE-03 | DOC-TYPE-16 retired. DOC-DISC-17 keeps its ID for the tutorial branch |
| Heading depth | DOC-NAV-05 | DOC-TYPE-19 keeps only the item count |
| Page length | DOC-NAV-06 | nothing |
| Placeholder text | DOC-TYPE-14 | DOC-NAV-12 dropped the clause |
| Cadence words | DOC-NAV-15 | DISC-12, OBS-10 and OBS-11 restate as a count or a release boundary |
| A number names its source | DOC-AGENT-12 | DOC-OBS-13 lost its duplicate grep |
| Zero-result signal | DOC-NAV-10 | DOC-OBS-12 keeps the deferral mechanism only |
| Unverifiable rows | AGENT-16 marker, PLAIN-17 cap, OBS-15 unwired check | three objects, do not merge them |

### Portability traps

- One comment opener per markup family. `<!--` for markdown, `{/*` for MDX,
  `..` for reStructuredText, `%` for MyST. A Docusaurus site needs
  `markdown.format: detect` first.
- Never YAML frontmatter. mdBook 0.5.3 renders it as a fake `<h2>` and puts
  that heading in the search index with its own anchor.
- Never a declaration comment above existing frontmatter.
- A fence tier tag is one hyphen-joined token. `ts twoslash` is unparsed under
  MkDocs Material and eats the next fence.
- No VitePress-only frontmatter parsing survives anywhere. The landing check is
  a markdown scan for exactly this reason.
- `mkdocs build --strict` satisfies DOC-OBS-01. Do not hard-code lychee.
- The nav script needs a permissive YAML loader for `!ENV` and
  `!!python/name:`, and must skip mdBook's own `# Summary` line.
- Any "first command" check must also match `<<<`, `--8<--` and `{{#include`.
- markdownlint needs `{"MD025": {"front_matter_title": ""}}`, and MD054 takes
  per-style booleans with no `style` key.
- DOC-OBS-03's trigger matrix must carry no fleet path. Its own portability
  grep checks that.
- The glob names `astro.config.*` and `docs/conf.py` against carriers nobody
  built. Build those two fixtures or drop both from the glob.

### Rules that pin a project decision

These carry `pinned`, which is the only way a rule rests on argued evidence
above CONSIDER. Every one is reversible by editing one row, and the owner
should see the list before it ships.

DOC-PLAIN-01 (punctuation ban, frame decision 1), DOC-PLAIN-19 (tiered gate,
frame decision 6), DOC-PLAIN-22 (Kubernetes AI-disclosure shape), DOC-EX-12
(a recording is a real run), DOC-EX-13 (commit a cast only when nothing
regenerates it, which overrides frame decision 3), DOC-OBS-04 and DOC-OBS-05
(the blocking split, frame decision 4), DOC-OBS-10 (manifest file shape),
DOC-DISC-08 (surface completeness replaces a vote), DOC-DISC-23 (the
product-shape key, invented here), and the two enums themselves: nine
`doc_type` values and three `doc_tier` values.

### Do this before the session's scratch is lost

Ten `checks/` scripts are named across the set and none exists in any
checkout. DOC-OBS-15 now ships at MUST and forbids exactly that state, so the
artifact would violate its own meta-rule on day one.

Several are already written and tested in this session's scratch tree at
`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/`.
Harvest them into the artifact's `checks/` directory now.

- `wave2-declaration-key/doc-declaration.sh`, 12 lines, 7 controls, run against
  181 fleet pages
- `wave2-calibration-b/nav_depth.py`, all three generators, both bug fixes in
- `wave2-calibration-b/strip_prose.py` and `readability_gate.py`
- `tested-examples-beyond-shell-python-rust/harness-test/run_doc_examples.py`,
  55 lines, DOC-EX-04's shipped floor
- `landing-check/landing_check.py` plus its test, DOC-TYPE-11 and DOC-TYPE-12
- `wave2-calibration-a/fixtures/`, `fixture_depth4/`, `fixture_flat9/`, the
  planted violations DOC-AGENT-19 requires

`strip_prose.py` is the hot dependency. Nine DOC-PLAIN rules and two DOC-TYPE
rules read its output. Write or harvest it first, and give it the link-target
strip wave 2 measured.

### Smaller corrections the drafting pass must make

- Give the two lost interactive rules real IDs. The tooltip selection rule and
  the WCAG 1.4.13 hover rule belong in DOC-TYPE at the next free numbers, not
  at 28 and 29.
- Fix DOC-PLAIN-05 and DOC-PLAIN-10 to cite the 300-word floor as their own,
  not as DOC-DISC-09's 150.
- Correct `docs-page-types.md` documented gap 4. Runbook has two fleet
  instances in `creeptd-ng`, not zero. Tutorial still has zero.
- Do not carry `docs-machine-readers-and-prior-art.md:474` into a shipped file
  verbatim. Its quoted literal fails DOC-AGENT-16's own grep.
- DOC-NAV-04 ships at MUST with a reading heuristic on VitePress and mdBook.
  The one fleet site that violates it is the VitePress one, so the MUST is
  unverifiable exactly where it fires. Either specify the check for those two
  generators or drop to SHOULD.
- DOC-EX-08's scope is now a path glob under the mechanism's own doc tree. An
  adopting repo with no such tree needs a stated default, or the rule reads as
  applying nowhere.

## Commissions

None. The verdict is ready-to-draft, so wave 2 is the last research wave. The
work that remains is authoring and one engineering job, both described above.
