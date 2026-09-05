---
title: Plain English for documentation
topic: docs-plain-english
family: DOC-PLAIN
model: claude-opus-5
date: 2026-09-05
revised: 2026-09-05
wave: 2
consolidates:
  - docs-plain-english/readability-gate-per-page-type.md
  - docs-plain-english/ai-tell-set-and-honest-label.md
  - docs-plain-english/lint-mechanism-and-rule-verification-shape.md
  - docs-observability/error-message-links-and-ai-authoring-policy.md
  - docs-topic-map/wave2-severity-ledger.md
  - docs-topic-map/wave2-calibration-b.md
  - docs-topic-map/wave2-declaration-key.md
grounded_in:
  - docs-audit/config-inventory.md
  - docs-audit/docs-shape.md
  - docs-audit/tested-examples-mechanism.md
  - docs-audit/ux-observability-posture.md
  - docs-topic-map/wave1-critique.md
  - docs-frame.md
---

# Plain English for documentation

## Verdict

This program ships plain English as a set of counted, greppable limits, not as
a voice. Twenty-two live rules, each with a command that runs. Wave 2 ran every
one of those commands against the fleet's 249 pages. Four checks were wrong.

1. **The punctuation ban ships, and it never claims to detect AI.** Freeburg's
   2026 numbers falsify per-instance detection. Twain scores 10.13 em-dashes per
   1,000 words, inside GPT-4.1's range of 10.62, while Llama 3.1 8B scores 0.00.
   GitLab bans the same three marks for machine translation and terminal
   rendering, and that rationale is sufficient on its own.
2. **One readability number, not five.** Flesch Reading Ease with a floor of 50.
   Wave 2 widened the corpus to 249 pages and measured a median of 49.0 with
   53.0 percent of pages below the floor. The floor stays at 50 and stays a
   warning. Every borrowed number is still rejected.
3. **Reference and troubleshooting pages are exempt from the floor, not given a
   laxer one.** Every syllable formula breaks on identifiers. Wave 2 extended the
   same exemption to the link budget, because reference pages repeat a
   cross-reference by design.
4. **The mandatory gate is grep plus markdownlint.** Vale is an opt-in
   escalation layer. Vale is absent from every fleet repo and from the
   measurement environment, so no rule may rest on it for its only check.
5. **Sentence length gates at MUST, scoped to touched lines.** GOV.UK's 25-word
   limit is mechanical. Wave 2 found the word counter counted a link's target as
   prose, at a 2.6 percent false-positive rate, and the fix is in the shared
   preprocessing.
6. **Link or explain a term once, at first mention, on narrative pages only.**
   ocx's every-occurrence rule is still rejected. Wave 2 added the reference
   exemption, because 25 of 249 pages break the 15-link cap and the highest are
   all command reference tables.
7. **Link syntax flips.** Inline links are required and reference-style links are
   banned. Measured at 3,595 hits with no false positives, because the check is
   pure syntax.
8. **A rule with no runnable check says so in its own row and caps at SHOULD.**
   DOC-PLAIN-17 now owns the cap alone. DOC-AGENT-16 owns the literal marker
   string. The two meta-rules no longer demand different literals.
9. **One rollout rule governs every family, not just this one.** A rule enforces
   at error on changed files from its first commit. It warns whole-tree until
   its backfill lands. That resolves the standing conflict with DOC-TYPE-01.
10. **The declaration is a comment, never frontmatter.** The type is read from a
    `doc_type` comment inside the first 12 lines. `changelog` is now a real enum
    value, which makes DOC-PLAIN-11's exemption implementable for the first time.
11. **AI authorship is disclosed on the pull request, never on the page.** The
    fleet adopts Kubernetes' 2026 shape. Wikipedia's ban and GitLab's site-wide
    banner both assume a review team no adopting repo has.

### Documented gaps

These are settled as gaps, not as answers. Research established that the answer
does not exist rather than that nobody looked.

- **There is no fleet-native marketing wordlist to derive.** All 8 fleet hits of
  the asserted list are false positives. Five sit in internal decision records
  weighing library trade-offs. Zero genuine hype instances exist anywhere in the
  fleet. DOC-PLAIN-12 ships at CONSIDER and stops looking.
- **Tell density cannot be calibrated on this fleet.** The whole corpus produces
  18 raw hits across 14 pages, and 17 of the 18 are false positives. There is no
  population to fit a threshold to. The default of 3 stays labelled uncalibrated.
- **Vale was never exercised.** The binary is absent from the measurement
  environment. DOC-PLAIN-14, DOC-PLAIN-20 and DOC-PLAIN-21 rest on their grep and
  reading-heuristic fallbacks, which is what the tiered gate designed them to do.

## The ruleset

Severity keys: MUST blocks, SHOULD warns and is expected to be fixed, CONSIDER is
advisory. A row marked "pinned" states a project decision, which is the one way a
MUST may rest on argued evidence. Evidence keys: normative (a standards body or
major style guide states it), measured (this program measured it), codified (a
shipped tool or config implements it), argued (reasoned from measured evidence),
asserted (stated without either).

The shared preprocessing referenced below is `checks/strip_prose.py`. It blanks
frontmatter, fenced code, ATX headings, table rows, reference-link definitions
and inline code spans while preserving line numbers. Wave 2 added one step. It
also drops the target half of every markdown link and every autolink, keeping
only the link text. Every grep in this table runs against its output.

Page type is read from a `doc_type` comment inside the file's first 12 lines,
per the wave-2 declaration-key decision. Never from YAML frontmatter, which
renders as a visible heading on mdBook 0.5.3. Never from a path. The nine enum
values are tutorial, how-to, reference, explanation, troubleshooting, runbook,
landing, readme and changelog.

None of the seven `checks/` scripts named below exists on disk yet. Writing them
is a precondition of shipping, per DOC-OBS-15. Write `strip_prose.py` first,
because nine rules in this family run against its output.

### Sentence and paragraph shape

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-01 | Write prose without em dashes, en dashes, semicolons, or curly quotes. | Machine translation and terminal rendering both mangle these marks, which corrupts copied commands. | `python3 checks/strip_prose.py PAGE \| grep -nE '[—–;""'"''"']'` returns no lines. Measured 229 of 249 pages, 8,462 hits, false-positive rate not applicable because the match is a literal character. Vale users may add `AiTells.Dash` instead. | SHOULD, pinned | codified (GitLab style guide bans all three) + pinned (frame decision 1 fixes this as house style) | all |
| DOC-PLAIN-02 | Split any prose sentence longer than 25 words. | A stacked-clause sentence forces a reader to hold three ideas at once, and it is the commonest defect in generated prose. | `python3 checks/long_sentences.py PAGE` exits 0, over `strip_prose.py` output with link targets removed. Scope the run to lines the change adds or edits. Measured 211 of 249 pages, 4,674 sentences, 2.6 percent false positives (121 of 4,674, exhaustive) before the link-target fix. Threshold 25 words (GOV.UK clear-language guidance). | MUST | normative (GOV.UK states the number) + measured (wave-2 calibration, 249 pages) | all |
| DOC-PLAIN-03 | Keep any paragraph to 5 sentences or fewer. | A long block hides its own topic sentence and gives a scanner no entry point. | The same script counts sentences between blank lines. It must discard any token matching `^\d{1,2}\.$` before counting, or a compliant 3-item numbered list reads as 6 sentences. Measured 69 of 249 pages, 153 paragraphs, 10.5 percent false positives (16 of 153, exhaustive) before the fix. Threshold 5 sentences (GOV.UK clear-language guidance). | SHOULD | normative (GOV.UK states the number) + measured (wave-2 calibration) | all |

### Readability measurement

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-04 | Compute every readability score on stripped prose, never on raw file text. | A code fence, a table row or a link target corrupts the sentence split and produces a number that means nothing. | Feed the scorer a fixture page holding a large fenced block of nonsense tokens. Measured on that fixture: raw 59.6 passes the floor, stripped 48.8 fails it, a 10.8-point gap. The strip must also remove `(target)` from every `[text](target)`. | MUST | codified (the fleet audit's own working preprocessing) + measured (wave-2 fixture, 10.8-point gap) | all |
| DOC-PLAIN-05 | Keep a page at Flesch Reading Ease 50 or above. | A page below the fleet's own median is harder than everything the team already publishes. | `python3 checks/readability_gate.py PAGE` reports the score against `FLOOR = 50.0`. Formula `206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)`. Skip any page under 300 prose words (DOC-DISC-09's stub floor), because the sentence-length term dominates a tiny denominator. Report as a warning, never as a red gate. Measured 132 of 249 pages below the floor (53.0 percent), median 49.0. | SHOULD | measured (fleet median 51.6 on 186 site pages, 49.0 on the wider 249-page corpus) + argued (one floor beats an invented per-type matrix) | landing, tutorial, how-to, explanation |
| DOC-PLAIN-06 | RETIRED. Dropped by the wave-2 severity ledger. It named no failure it catches, and it applied only to the two page types the readability floor already exempts. | | | RETIRED | | |
| DOC-PLAIN-07 | Wrap every identifier in a code span when it appears in prose. | A bare identifier can make a page score easier or harder by accident of digit placement, and it also renders badly. | Match only shapes ordinary English cannot produce. Those are a leading `--`, a trailing `()`, a `::`, a `/`, and any term on a project-maintained identifier list. The wave-1 pattern is banned. Measured at 1,621 hits over this program's own 7 consolidations and 9,618 hits over 184 of 186 fleet pages, with `how-to`, `zero-result` and ISO dates as its top matches. Re-run the tightened pattern over the same corpus and report the count. Under 50 is acceptable and over 200 is not. | CONSIDER | measured (a 64-character digest shifted one fixture from 75.7 to 103.6) + measured against (the wave-1 pattern's own hit rate) | all |

### Tells and honest labelling

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-08 | Remove every chatbot artifact and every AI-authorship badge from a published page. | These phrases prove an unedited paste. A page-level badge is a second unmaintained place for an authorship fact to rot. | `grep -rniE "I hope this helps\|as an AI\|as of my last update\|knowledge cutoff\|let me know if\|feel free to ask\|contentReference\|oaicite\|\[cite: [0-9]\|AI-generated\|AI-assisted\|written with (the )?(help\|assistance) of (AI\|Claude\|ChatGPT\|Copilot\|Gemini)\|assisted by (AI\|Claude\|ChatGPT\|Copilot\|Gemini)" docs/` returns nothing. Measured 0 of 249 pages, so it launches red today. | MUST | codified (Wikipedia's essay plus two skill implementations) + measured (0 of 249 pages) + argued, pinned (the badge clause follows the Kubernetes shape) | all |
| DOC-PLAIN-09 | Never word a prose finding or a rule rationale as a claim about who or what wrote the page. | Per-instance authorship detection is falsified, so the claim is false and it also makes the rule easy to dismiss. | `grep -niE "AI-written\|AI-generated\|sign of AI\|detect.*AI\|written by (an )?AI" RULEFILE` returns nothing. Findings must read "N per 1,000 words, a human should read this". | MUST | measured (Freeburg 2026, and Wikipedia's cited 57 and 64 percent single-instance accuracy) | all |
| DOC-PLAIN-10 | Gate a vocabulary tell on its density per 1,000 words, never on one occurrence. | One "delve" is ordinary prose, so a per-instance fail produces false positives on human writing. | `python3 checks/tell_density.py PAGE` reports hits per 1,000 words against a default of 3 (uncalibrated default, no source states a validated threshold). Label that default uncalibrated in the config. The wordlist must not contain `underscore*` or `unlock*`, which both name ordinary technical objects. Skip any page under 300 prose words (DOC-DISC-09's stub floor). Measured 14 of 249 pages, 18 raw hits, 94 percent false positives (17 of 18, exhaustive), and the single page over threshold failed on one false positive. | CONSIDER | argued (no source states a validated threshold) + measured (wave-2 calibration, 17 of 18 hits false) | all |
| DOC-PLAIN-11 | Remove time-relative words from documentation prose. | Words like "currently" and "latest" are accurate on the day of writing and wrong within a release. | `python3 checks/strip_prose.py PAGE \| grep -niE '\b(as of this writing\|currently\|does not yet\|eventually\|in the future\|latest\|newer\|newest\|now\|older\|presently\|at present\|soon)\b'` returns no lines. Skip any page whose first 12 lines declare `doc_type: changelog`. A flagged noun phrase naming a resolved runtime value is exempt, for example "the currently installed version" or "the latest digest". That exemption is `unverified: reading heuristic`. A reviewer checks whether the sentence claims product status or describes a value the reader's environment computes. Measured 104 of 249 pages, 398 hits, about 50 percent runtime-state phrases in a 10-item sample. | SHOULD | normative (Google publishes this exact list) + measured (wave-2 calibration sample) | all except pages declaring `doc_type: changelog` |
| DOC-PLAIN-12 | Remove marketing superlatives from documentation prose. | A superlative makes a claim the reader cannot check and delays the fact they came for. | `python3 checks/strip_prose.py PAGE \| grep -niE '\b(powerful\|seamless(ly)?\|revolutionary\|game.chang\|supercharge\|unlock\|empower\|cutting.edge\|robust\|effortless)\b'` returns no lines. Exclude any file under a `docs/research/` or `docs/decisions/` path before reporting. The list is asserted, with no cited ancestor, which is why DOC-AGENT-10 caps it. Measured 6 of 249 pages, 8 hits, 100 percent false positives (8 of 8, exhaustive). | CONSIDER | codified (ocx states the ban) + asserted (the exact wordlist, no published guide states one) | all except internal research and decision records |

### Structure

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-13 | Use real headings, one top-level heading per page, and no skipped levels. | A bold line standing in for a heading is invisible to the outline, to search, and to a screen reader. | `npx markdownlint-cli2 --config '{"config":{"MD001":true,"MD025":{"front_matter_title":""},"MD036":true}}' PAGE`. The `front_matter_title` override is mandatory. Measured on markdownlint-cli2 v0.23.2: MD001 0 hits, MD025 8 hits with a 100 percent false-positive rate (8 of 8, exhaustive) before the override, MD036 324 hits over 204 pages with roughly 12 percent false positives (1 of 8 sampled). | MUST | codified (markdownlint ships all three) + measured (wave-2 calibration, v0.23.2) | all |
| DOC-PLAIN-14 | Write every heading in sentence case. | Title Case is a named typographic tell and it reads as a marketing header rather than a section label. | Vale `Google.Headings` where Vale is adopted. Otherwise `unverified: reading heuristic`. A reviewer treats a heading with two or more capitalised words that are not proper nouns or identifiers as Title Case. Never cite MD003 for this. Vale was absent from the wave-2 environment, so the tier-1 path is untested. | SHOULD | normative (Google states sentence case for all headings and titles) | all |

### Links

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-15 | Write links inline and never as reference-style definitions. | Reference-style splits a link from its text, so an edit updates one half and rots the other. | `npx markdownlint-cli2 --config '{"MD054":{"inline":true,"full":false,"collapsed":false,"shortcut":false,"autolink":true}}' PAGE`. Note the per-style booleans. There is no `style` key, and the invalid shape throws a schema error. Measured 3,595 hits fleet-wide with a 0 percent false-positive rate, because the check is pure syntax. | SHOULD | normative (GitLab ships `ReferenceLinks.yml` enforcing inline) + measured (ocx drifted to 555 inline links against its own rule) | all |
| DOC-PLAIN-16 | Link or explain a term once, at its first meaningful mention on the page. | Linking every occurrence blows past any sane link budget and needs an entity list nobody maintains. | A script groups each page's links by normalised anchor text and target, and flags any group used twice. It also flags a non-footer link count above 15 (GitLab style guide states the cap). Skip any page declaring `doc_type: reference`. Measured 25 of 249 pages over the cap and 48 of 249 repeating a link, both concentrated in command reference pages. | SHOULD | normative (GOV.UK explains on first use, GitLab caps at 15 links, Wikipedia's `MOS:REPEATLINK` allows repeats across sections) + measured (wave-2 calibration) | all except pages declaring `doc_type: reference` |

### Rule shape and rollout

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-PLAIN-17 | Cap any rule whose Verification cell holds no runnable command at SHOULD. | An unverifiable rule stated as a MUST is a rule nobody can enforce, which is how 90 of the fleet's 92 prose rules became decoration. | Read the Verification column. Any row whose Severity is MUST or whose cell holds no fenced command is a finding unless the row says "pinned". The marker string itself belongs to DOC-AGENT-16, not to this rule. | MUST | normative (the frame's own constraint) + measured (2 checks across 92 rules) | all |
| DOC-PLAIN-18 | Launch a new rule at error on the lines a change adds or edits, and at warning whole-tree until its backfill lands. | The fleet's median page already fails several of these rules, so a whole-tree red gate blocks every open PR on day one. A diff-scoped red gate blocks none of them. | The introducing PR runs the check twice. Once against `git diff --name-only` at error, once against the whole tree at warning. A rule may launch at error on changed files with any number of standing violations. A rule may launch at error whole-tree only at zero current violations. | MUST | codified (GitLab requires existing occurrences fixed before an error rule lands, Fern's `filter_mode: added`) + measured (fleet baseline) | all |
| DOC-PLAIN-19 | Never let an optional linter supply a rule's only verification. | Twelve adopting repos have no prose tooling, so a Vale-only check is an unchecked rule everywhere Vale is absent. | Every Verification cell resolves with grep, a shell script, or markdownlint alone. Vale rule names appear only as an additional option. Confirmed by `which vale` returning nothing in the wave-2 environment. | MUST, pinned | normative (the frame's tiered-gate decision 6) + measured (zero prose tooling fleet-wide) | all |
| DOC-PLAIN-20 | Give every checkable construct exactly one owning tool and disable the other tool's equivalent. | Two linters can demand opposite fixes on the same construct, and a contributor fixing one breaks the other. | `unverified: reading heuristic`. A reviewer confirms each construct named in the rule set is active in exactly one tool's config. Link style is the known collision, owned here by markdownlint MD054. | SHOULD | measured (MD054 and GitLab's `ReferenceLinks.yml` demand opposite link styles) | all |
| DOC-PLAIN-21 | Pin a third-party lint package by its exact org and repo, and read its severity split before wiring it into CI. | Two separately authored packages ship as `vale-ai-tells`, one with 17 tiered rules and one with about 111 rules all at error. | The config names an org/repo or a pinned archive URL. Print the resolved package's rule count and error share before enabling it. | SHOULD | measured (the real package collision, `krishnasunkam` versus `tbhb`) | all |
| DOC-PLAIN-22 | State whether AI assistance drafted a documentation change, in the pull request, and never name the tool as an author. | An unlabelled AI draft reads as human-reviewed prose to the next person who trusts it. Naming the tool as an author breaks the accountability chain. | CI greps the PR body for an `AI assistance: yes\|no\|partial` key and fails when it is missing or empty. A second grep over the PR's commit trailers for `Co-Authored-By:.*([Cc]laude\|[Gg][Pp][Tt]\|[Cc]opilot\|[Gg]emini)\|assisted-by\|co-developed` returns zero hits. | MUST, pinned | argued (three real 2026 policies disagree) + pinned (this program adopts the Kubernetes shape, because Wikipedia's ban and GitLab's banner both assume a review team no adopting repo has) | all |
| DOC-PLAIN-23 | Run this family only on published documentation, never on an agent's own notes. | Every rule here fires today on research corpora and agent config, where the findings are noise and nobody checked what they cost. | The shipped file list is `git ls-files` under a directory holding a generator config, plus repo-root `README.md` and `CHANGELOG.md`. Assert the list excludes `.agents`, `.claude`, `.serena`, `.worktrees`, `node_modules`, `dist`, `target` and build output. | MUST | normative (the frame's glob decision) + measured (a naive `find` loads 420 Lighthouse reports and 257 stale worktree files) | all |

### Dropped, and why

These were candidates in the topic map or the sub-artifacts and do not ship.
An agent already handles them, or the check costs more than the defect.

- **Passive-voice budget.** Vale ships `Passive.yml` with no budget, the fleet's
  own measure is a documented-as-crude regex, and "prefer active voice" is
  knowledge every model already has.
- **Double-hyphen as a dash substitute.** The grep collides with every CLI flag
  in a fleet whose docs are 1,470 shell blocks deep.
- **Modal-verb precision, self-referential prose, negative contractions, source
  line wrapping.** Low blast radius, and the map itself rates three of them low.
- **Inclusive-language gate.** Real, but it needs its own corpus and its own
  tool, and it does not belong inside a plain-English family.
- **A separate rule for the minimum page length before a rate-based gate.**
  Folded into DOC-PLAIN-05 and DOC-PLAIN-10 as a shared 300-word precondition.
  A precondition two rules share is not a third rule.
- **A page-level AI-authorship banner.** Rejected. GitLab ships one, and it is a
  communications choice for a company with a review team. DOC-PLAIN-08 bans it.

## Applied to the fleet

All counts below come from the wave-2 calibration run over 249 pages, unless the
row says otherwise. Preprocessing is `strip_prose.py` as described above.

### Already satisfied

| Rule | Evidence |
|---|---|
| DOC-PLAIN-08 | 0 of 249 pages carry a chatbot artifact or an AI badge. The gate launches at error today with zero standing violations. |
| DOC-PLAIN-13, MD001 arm | 0 of 249 pages skip a heading level. |
| DOC-PLAIN-15 (in practice) | `docs-shape.md` §5 counts 555 inline-style links in ocx and 492 in grimoire. Writers already default to the syntax this rule requires, even though 3,595 reference-style hits remain. |
| DOC-PLAIN-04 | `docs-shape.md` §3's `strip_code_and_front()` is the working implementation, extended with the link-target strip wave 2 measured. |

### Violated

| Rule | Hits | Measured false-positive rate |
|---|---|---|
| DOC-PLAIN-01 | 229 of 249 pages, 8,462 hits | Not applicable, a literal character match |
| DOC-PLAIN-02 | 211 of 249 pages, 4,674 sentences | 2.6 percent (121 of 4,674, exhaustive), removed by the link-target fix |
| DOC-PLAIN-03 | 69 of 249 pages, 153 paragraphs | 10.5 percent (16 of 153, exhaustive), removed by dropping bare `N.` tokens |
| DOC-PLAIN-05 | 132 of 249 pages below the floor (53.0 percent), median 49.0 | Not a lint. The lowest scores are short list-heavy pages, which the 300-word floor removes |
| DOC-PLAIN-07 | 9,618 hits over 184 of 186 pages, and 1,621 over this program's own 7 consolidations | Unusable as written. Top matches are `how-to`, `zero-result`, `first-steps` and ISO dates |
| DOC-PLAIN-10 | 14 of 249 pages, 18 raw hits, 1 page over density 3 | 94 percent (17 of 18, exhaustive). The one failing page fails on a false positive |
| DOC-PLAIN-11 | 104 of 249 pages, 398 hits | About 50 percent (5 of 10 sampled), all runtime-state noun phrases |
| DOC-PLAIN-12 | 6 of 249 pages, 8 hits | 100 percent (8 of 8, exhaustive). Five sit in internal research notes |
| DOC-PLAIN-13, MD025 arm | 8 of 249 pages | 100 percent (8 of 8, exhaustive) before `front_matter_title` is disabled |
| DOC-PLAIN-13, MD036 arm | 324 hits over 204 pages | About 12 percent (1 of 8 sampled). ocx alone holds 264 |
| DOC-PLAIN-15 | 3,595 hits, 2,757 in ocx and 499 in grimoire | 0 percent, pure syntax |
| DOC-PLAIN-16 | 25 of 249 pages over 15 links, 48 of 249 repeating a link | High on reference pages, which the new exemption removes |
| DOC-PLAIN-14 | 72 of ocx's 783 subheadings, reading heuristic only | Not measured, Vale absent |
| DOC-PLAIN-17 | 2 runnable checks across roughly 92 docs-prose rules (`config-inventory.md` axis 5) | Not applicable |
| DOC-PLAIN-19 | Zero repos carry Vale, textlint, Flesch tooling, or markdownlint | Not applicable. Every rule here is a new wiring job |
| DOC-PLAIN-23 | Every check in this family currently fires on `.agents/` research prose | Not applicable, the rule is the exclusion |

### Rules the fleet's own config contradicts

`ocx/.claude/rules/docs-style.md:104-124` requires reference-style links only and
forbids inline links in body text. DOC-PLAIN-15 requires the opposite. The
evidence for flipping it is the repo's own practice, 555 inline links written
against a rule saying never write one, plus GitLab shipping `ReferenceLinks.yml`
to enforce inline for maintainability.

`ocx/.claude/rules/docs-style.md:44-49`'s every-occurrence hyperlink rule is
rejected by DOC-PLAIN-16 for the reasons in the Verdict.

### New commitments

Everything in the Tells, Structure and Rule-shape blocks is greenfield.
`config-inventory.md` states it plainly: plain-English measurement is "100%
greenfield for this program, not a refinement of existing practice". The one
shape to copy already exists in the fleet and governs code, not prose:
`bob/.claude/rules/rust-quality/docs-and-tracing.md:29-40` carries an inline
`rg` or `grep` in 11 of 12 rule rows. DOC-PLAIN-17 is that shape generalised.

Seven `checks/` scripts are named in this file and none of them exists. That is
the single largest shipping blocker in the family. Write `strip_prose.py` first,
because nine rules read its output and two DOC-TYPE rules do as well.

### Interaction with the tested-docs mechanisms

Neither tested-docs mechanism is touched by this family. ocx's 66 acceptance-
tested scripts and ocx-sdk-python's Sybil collection both execute code, and
every rule here runs on stripped prose with code fences removed. The one
overlap is DOC-PLAIN-07: `tested-examples-mechanism.md` §3 shows ocx already
canonicalises identifiers between the executed and the displayed command. The
`<!-- moved-command-ok -->` marker in `user-guide.md:1178-1184` is the shape an
annotated exemption should take for any rule in this family that needs one.

## AI-agent failure modes

Ranked by how often the sub-artifacts and the fleet measurements show it biting.

| # | Failure | Caught by |
|---|---|---|
| 1 | Writes a 40-word sentence with two em dashes and a subordinate clause stack. | DOC-PLAIN-01, DOC-PLAIN-02 |
| 2 | Names a check script in a Verification cell and never writes the file. | DOC-PLAIN-17, DOC-OBS-15 |
| 3 | Writes a word counter that reads markup as content, so a link target inflates the count. | DOC-PLAIN-02, DOC-PLAIN-04 |
| 4 | Ships a linter config option it never ran, so a fleet convention produces a 100 percent false-positive rate. | DOC-PLAIN-13 |
| 5 | Justifies the punctuation ban as AI detection, a claim Twain's 10.13 falsifies. | DOC-PLAIN-09 |
| 6 | Uses a bold line as a pseudo-heading, or jumps H2 straight to H4. | DOC-PLAIN-13 |
| 7 | Reuses a stem-matched wordlist across two rules without checking domain overlap. | DOC-PLAIN-10, DOC-PLAIN-12 |
| 8 | Adds a rule as a bullet with no wired check and calls it done. | DOC-PLAIN-17 |
| 9 | Writes "currently", "the latest version", "for now" into permanent reference prose. | DOC-PLAIN-11 |
| 10 | Grades its own grep on one fixture it wrote, and calls that calibration. | DOC-PLAIN-18, DOC-PLAIN-23 |
| 11 | Fabricates a plausible flag to fill a verification cell, such as `{"MD054":{"style":"inline"}}`. | DOC-PLAIN-17 |
| 12 | Reaches for an unearned round number, usually "grade 8" or "reading age 9", with no citation. | DOC-PLAIN-05 |
| 13 | Writes an "applies to" scope and never enforces it inside the verification cell. | DOC-PLAIN-16, DOC-PLAIN-23 |
| 14 | Writes Title Case headings, then cites MD003 for the check. MD003 does not read casing. | DOC-PLAIN-14 |
| 15 | Runs a readability formula on raw markdown including code fences and frontmatter. | DOC-PLAIN-04 |
| 16 | Runs a rate-based gate on a 118-word stub, where one hit reads as density 8.47. | DOC-PLAIN-05, DOC-PLAIN-10 |
| 17 | Ships the new lint at error severity across the whole tree because strict feels safer. | DOC-PLAIN-18 |
| 18 | Leaves "I hope this helps" or "let me know if you have questions" in a published page. | DOC-PLAIN-08 |
| 19 | Writes a page-level "AI-generated" badge when asked for transparency, or says nothing at all. | DOC-PLAIN-08, DOC-PLAIN-22 |
| 20 | Names the model as a commit co-author. | DOC-PLAIN-22 |
| 21 | Opens a page with a superlative instead of a fact. | DOC-PLAIN-12 |
| 22 | Declares one "delve" proof that a page was machine written. | DOC-PLAIN-09, DOC-PLAIN-10 |
| 23 | Invents a five-row per-page-type threshold matrix because types differ, with no source per number. | DOC-PLAIN-05 |
| 24 | Writes `sha256` and `--flag-name` bare in running prose. | DOC-PLAIN-07 |
| 25 | Runs a prose lint over the agent's own research directory and reports the noise as findings. | DOC-PLAIN-23 |
| 26 | Re-implements a construct in a second linter because the first tool's config felt awkward. | DOC-PLAIN-20 |
| 27 | Resolves a Vale package by display name and pulls the aggressive twin. | DOC-PLAIN-21 |

## Conflicts resolved

1. **Em dash as detector versus house style.** Resolved as house style. Freeburg's
   data kills detection at the instance level, and GitLab's translation rationale
   justifies the identical ban without the claim. DOC-PLAIN-01 states the reason
   and DOC-PLAIN-09 forbids the other one.
2. **A readability grade target at all.** Resolved as Flesch Reading Ease with a
   floor of 50. All four circulating numbers are rejected on the record. GOV.UK's
   9 is a citizen-literacy floor, Vale's grade 8 is an undesigned tool default,
   the 9 to 13 range is SaaS glossary content, and a per-type matrix has no source
   backing any single row.
3. **Explain once versus hyperlink every occurrence, against a 15-link cap.**
   Resolved as explain or link once at first mention, on narrative pages only.
   Wave 2 added the reference exemption on measurement.
4. **Vale's default severity: `suggestion` or `warning`.** Fetched
   `docs.vale.sh/topics/styles` directly. The default is `suggestion`. The lint
   sub-artifact is wrong.
5. **MD054's configuration shape.** Fetched markdownlint's `Rules.md` directly.
   MD054 takes per-style boolean parameters. There is no `style` key. Wave 2
   confirmed the invalid shape throws a schema error at run time.
6. **Link syntax: reference-style or inline.** Resolved as inline, because ocx's
   own writers ignored the stated rule 555 times and because the maintainability
   argument runs one way only.
7. **Severity of the punctuation ban.** Resolved as SHOULD, pinned. Retrofitting
   ocx alone is roughly 3,750 edits, and frame decision 7 forbids a red gate for
   tell counts because a red prose gate gets switched off.
8. **Severity of the sentence-length cap.** Resolved by scope, not by softening.
   MUST applies only to lines a change adds or edits.
9. **DOC-PLAIN-17 versus DOC-AGENT-16 on the marker string.** Resolved by
   splitting the object. DOC-AGENT-16 owns the literal `unverified: reading
   heuristic`. DOC-PLAIN-17 owns the severity cap. DOC-PLAIN-17's competing
   literal is deleted from its rule text.
10. **DOC-PLAIN-18 versus DOC-TYPE-01 on rollout.** Resolved by scope. Both keep
    MUST. Every rule enforces at error on changed files and warns whole-tree
    until its backfill lands.
11. **DOC-PLAIN-11's `changelog` exemption against the type enum.** Resolved by
    registering `changelog` as one of the nine `doc_type` values. The exemption
    was unimplementable until wave 2.
12. **DOC-PLAIN-12 versus DOC-AGENT-10 on wordlists.** Resolved to DOC-AGENT-10.
    An asserted list with no cited ancestor caps at CONSIDER.
13. **AI-authoring disclosure: three real 2026 policies.** Resolved to the
    Kubernetes shape. Wikipedia's outright ban assumes a volunteer editor corps.
    GitLab's site-wide banner assumes a paid writing team. Neither exists here.
14. **Is GitLab's Vale gate specific to AI-generated content?** Resolved as no.
    The wave-1 brief assumed it was. GitLab's public pages state uniform review
    for AI and human content, with no AI-specific gate.

## Open questions

### Needs a human decision

1. **Is Vale acceptable as an opt-in layer with a shipped `.vale.ini`, or is the
   fleet grep-only?** The mandatory gate works without it. Vale buys the
   readability `metric` type, the 17-rule AiTells taxonomy, and per-rule
   severity that grep cannot express. The cost is a Go binary and a styles
   directory per opted-in repo. Wave 2 confirmed Vale is absent everywhere and
   could not test it.

### Deserves another research round

1. **sentence-case-heading-check-without-vale: can a proper-noun-aware
   heuristic reach an acceptable false-positive rate?** The crude run flagged 72
   of ocx's 783 headings and nobody verified how many are real. DOC-PLAIN-14 is
   the only rule in this family whose tier-0 verification is a reading heuristic.
2. **readability-floor-ratchet: what schedule moves the floor, and who reruns
   the audit?** A floor at 50 now fails 53.0 percent of the corpus and rewards
   nothing once the median moves. The Lighthouse ratchet on two fleet sites is
   the working local precedent and nobody has mapped it onto prose.
3. **stylometric-versus-keyword tells: does burstiness beat a wordlist?**
   `Aboudjem/humanizer-skill` computes lexical density and sentence-length
   variance instead of counting keywords, which sidesteps the single-instance
   problem structurally. As of September 2026 it is a one-tool pattern.
4. **One shared exclusion list for words that double as ordinary technical
   vocabulary.** DOC-PLAIN-10 and DOC-PLAIN-12 both misfire on `robust` and
   `unlock`, and each rediscovered the same false positives alone. One list
   maintained once would prevent the third rediscovery. `paradigm` is the next
   candidate for removal and nobody has decided it.

## Revision log

Wave 2, 2026-09-05. Twenty-two live rules, one retirement, two additions.

- **Severity ledger applied, DOC-PLAIN-07.** SHOULD to CONSIDER, and the wave-1
  pattern is replaced. Measured 1,621 hits over this program's own corpus and
  9,618 over 184 of 186 fleet pages, mostly ordinary hyphenated English.
- **Severity ledger applied, DOC-PLAIN-12.** SHOULD to CONSIDER. DOC-AGENT-10
  requires a cited ancestor for a wordlist and this list has none.
- **Severity ledger applied, DOC-PLAIN-21.** CONSIDER to SHOULD. A supply-chain
  pin is not advice, and the wrong twin ships about 111 rules at error.
- **Severity ledger applied, DOC-PLAIN-06 retired.** The rule named no failure it
  catches and applied only to the two page types the floor already exempts. The
  row stays in place and the number is never reused. Calibration worker B
  recommended shipping it after a planted fixture went red, which proves the
  check runs and not that it is worth its cost. The ledger's argument wins.
- **DOC-PLAIN-17 reworded.** The competing literal `Unverified. Reading
  heuristic:` is deleted. DOC-AGENT-16 owns the marker string and this rule owns
  the severity cap alone. Two MUSTs demanding different literals was unsatisfiable.
- **DOC-PLAIN-18 reworded.** Scope broadened from "a new prose rule" to "a new
  rule". Launch condition replaced. Error on changed files with any standing
  violations, error whole-tree only at zero. This resolves the DOC-TYPE-01
  conflict without demoting either rule.
- **Declaration key applied, DOC-PLAIN-11.** The exemption now reads
  `doc_type: changelog` in the first 12 lines. It was written against a value the
  enum did not carry, so it could never resolve.
- **Declaration key applied, DOC-PLAIN-05, DOC-PLAIN-16 and the ruleset preamble.**
  Page type is read from the comment carrier, never from frontmatter and never
  from a path. Frontmatter renders as a visible heading on mdBook 0.5.3.
- **Calibration applied, DOC-PLAIN-02.** Verification now strips a link's target
  before counting words. Measured 2.6 percent false positives (121 of 4,674).
- **Calibration applied, DOC-PLAIN-03.** Verification now discards bare `N.`
  tokens. Measured 10.5 percent false positives (16 of 153), all compliant
  numbered lists.
- **Calibration applied, DOC-PLAIN-13.** Verification now ships
  `{"MD025":{"front_matter_title":""}}`. Measured 100 percent false positives
  (8 of 8) without it, against the fleet's own frontmatter-title convention.
- **Calibration applied, DOC-PLAIN-10.** `underscore*` and `unlock*` removed from
  the wordlist and a 300-word floor added. Measured 94 percent false positives
  (17 of 18), and the single failing page failed on one of them.
- **Calibration applied, DOC-PLAIN-12.** Internal research and decision records
  are excluded before reporting. Measured 100 percent false positives (8 of 8),
  five of them in `kate-middlechild/docs/research/`.
- **Calibration applied, DOC-PLAIN-11.** A runtime-value noun phrase is exempt,
  marked `unverified: reading heuristic`. Measured about 50 percent of a 10-item
  sample describe a computed value, not a staleness claim.
- **Calibration applied, DOC-PLAIN-16.** Reference pages are exempt from both the
  15-link cap and the link-once rule. Measured 25 of 249 over the cap and 48 of
  249 repeating, concentrated in command reference tables.
- **Calibration applied, DOC-PLAIN-04 and the shared preprocessing.**
  `strip_prose.py` gains a link-target strip. DOC-PLAIN-02, 03 and 05 all
  inherit it once.
- **Calibration applied, DOC-PLAIN-05.** A 300-word floor added, because negative
  Flesch scores on short list-heavy pages come from a tiny denominator. Corpus
  widened from 186 to 249 pages, median 49.0 against the earlier 51.6.
- **Wave-2 dive applied, DOC-PLAIN-08.** The grep now also bans a page-level
  AI-authorship badge. Still 0 of 249 hits, so it still launches red.
- **NEW DOC-PLAIN-22.** AI assistance is disclosed on the pull request and the
  tool is never named as an author. MUST, pinned to the Kubernetes 2026 shape.
- **NEW DOC-PLAIN-23.** This family runs only on published documentation. It
  currently fires on the program's own research corpus and nobody priced that.
- **DOC-AGENT-12 shape applied to every numeric row.** 25 words, 5 sentences,
  50, 3 per 1,000 words, 15 links, 300 words and 12 lines each name their source
  on the same row.
- **`unverified: reading heuristic` added** to DOC-PLAIN-14, DOC-PLAIN-20 and
  DOC-PLAIN-11's exemption clause. All three cap at SHOULD.
- **Open questions closed.** `marketing-tone-wordlist` and
  `aggregate-tell-density-calibration` are answered as gaps and moved into the
  Verdict. The DOC-PLAIN-01 retrofit posture and the sentence-length MUST are
  both settled by DOC-PLAIN-18's rewording and are removed.
- **No disagreement with the severity ledger stands.** Every severity correction
  it proposed for this family is applied as written.

## Sub-artifacts

- [readability-gate-per-page-type.md](docs-plain-english/readability-gate-per-page-type.md)
  Picks Flesch Reading Ease over the grade formulas, sets the floor at the
  fleet's own median, exempts reference pages by declared type, and ships a
  runnable scorer with fixture results. Wave 1.
- [ai-tell-set-and-honest-label.md](docs-plain-english/ai-tell-set-and-honest-label.md)
  Falsifies em-dash detection with Freeburg's numbers, adopts GitLab's
  translation rationale for the same ban, and splits Wikipedia's five-layer tell
  taxonomy into hard, judgment-dependent, and aggregate-only tiers. Wave 1.
- [lint-mechanism-and-rule-verification-shape.md](docs-plain-english/lint-mechanism-and-rule-verification-shape.md)
  Chooses grep plus markdownlint as the mandatory gate with Vale opt-in, sets
  the diff-scoped warning-first rollout, resolves both link conflicts, and
  defines the verified rule-row shape. Wave 1.
- [../docs-observability/error-message-links-and-ai-authoring-policy.md](docs-observability/error-message-links-and-ai-authoring-policy.md)
  Wave 2. Compares Wikipedia's ban, GitLab's site-wide banner and Kubernetes'
  per-PR disclosure, picks the Kubernetes shape, and supplies DOC-PLAIN-22 and
  DOC-PLAIN-08's badge clause.
- [../docs-topic-map/wave2-severity-ledger.md](docs-topic-map/wave2-severity-ledger.md)
  Wave 2. Passes all 132 rules through the program's own gates. Supplies this
  family's three severity corrections, the DOC-PLAIN-06 drop, the marker split
  and the rollout rewrite.
- [../docs-topic-map/wave2-calibration-b.md](docs-topic-map/wave2-calibration-b.md)
  Wave 2. Runs every runnable DOC-PLAIN check against 249 fleet pages and reports
  the false-positive rate for each. Source of every hit count in this file.
- [../docs-topic-map/wave2-declaration-key.md](docs-topic-map/wave2-declaration-key.md)
  Wave 2. Fixes the declaration carrier on three real generators, sets the
  nine-value type enum, and registers `changelog` so DOC-PLAIN-11's exemption
  can resolve.

## Key sources

| URL | Why it matters here |
|---|---|
| [docs.vale.sh/topics/styles](https://docs.vale.sh/topics/styles/) | The eleven rule types and the confirmed `suggestion` default that settles conflict 4 |
| [guidance.publishing.service.gov.uk — clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | The 25-word sentence limit, the 5-sentence paragraph cap, and the explain-on-first-use rule |
| [docs.gitlab.com — documentation style guide](https://docs.gitlab.com/development/documentation/styleguide/) | The em-dash, semicolon and curly-quote ban with its translation rationale, and the 15-link cap |
| [docs.gitlab.com — Vale testing](https://docs.gitlab.com/development/documentation/testing/vale/) | The three-tier severity contract and the rule that an error-level rule requires existing occurrences fixed first |
| [docs.gitlab.com — use of generative AI](https://docs.gitlab.com/legal/use_generative_ai/) | The site-wide banner and uniform review, rejected here as assuming a review team |
| [kubernetes.io — open source maintainership in the age of AI](https://kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai/) | The per-PR disclosure and co-author ban DOC-PLAIN-22 adopts |
| [en.wikipedia.org — Wikipedia:Large language models](https://en.wikipedia.org/wiki/Wikipedia:Large_language_models) | The 2026-03-20 outright ban, rejected here as assuming a volunteer editor corps |
| [github.com/DavidAnson/markdownlint — Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) | MD001, MD025, MD036, MD054 and MD059, MD054's real per-style booleans, and MD025's `front_matter_title` parameter |
| [developers.google.com/style/timeless-documentation](https://developers.google.com/style/timeless-documentation) | The literal time-relative blocklist DOC-PLAIN-11 greps |
| [developers.google.com/style/headings](https://developers.google.com/style/headings) | Sentence case for all headings and titles |
| [slopdetector.org — em-dash AI tell data](https://slopdetector.org/blog/em-dash-ai-tell-data) | Freeburg 2026: GPT-4.1 at 10.62, human baseline 3.23, Twain at 10.13, Llama 3.1 8B at 0.00 |
| [en.wikipedia.org — Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | The five-layer tell taxonomy and the 57 and 64 percent single-instance accuracy finding |
| [en.wikipedia.org — MOS:REPEATLINK](https://en.wikipedia.org/wiki/Wikipedia:Manual_of_Style/Linking) | Repeat linking is correct on a long page with self-contained sections, the basis of DOC-PLAIN-16's reference exemption |
| [github.com/krishnasunkam/vale-ai-tells](https://github.com/krishnasunkam/vale-ai-tells) | The 17-rule mechanical implementation with its 6-error, 11-suggestion split by judgment cost |
| [github.com/tbhb/vale-ai-tells](https://github.com/tbhb/vale-ai-tells) | The same-name package with about 111 rules all at error, the evidence behind DOC-PLAIN-21 |
| [errata-ai/Readability — FleschReadingEase.yml](https://raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschReadingEase.yml) | The exact formula, the `< 70` condition, and the absent `level` field |
| [design.homeoffice.gov.uk — readability](https://design.homeoffice.gov.uk/accessibility/written-content/readability) | The reading-age-9 figure and its stated citizen-facing rationale, the reason it is rejected here |
| [grafana.com — lint prose](https://grafana.com/docs/writers-toolkit/review/lint-prose/) | A real running config at `MinAlertLevel = suggestion`, softer than any published guide recommends |
| [buildwithfern.com — docs linting guide](https://buildwithfern.com/post/docs-linting-guide) | The `filter_mode: added` rollout pattern DOC-PLAIN-18 adopts |
