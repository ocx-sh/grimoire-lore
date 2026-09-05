---
title: Use-case discovery and the tier model
topic: docs-use-case-discovery
family: DOC-DISC
model: claude-opus-5[1m]
consolidates:
  - .agents/research/docs-use-case-discovery/use-case-discovery-procedure.md
  - .agents/research/docs-use-case-discovery/tier-model-and-first-steps-contract.md
  - .agents/research/docs-use-case-discovery/first-steps-for-libraries-and-sdks.md
  - .agents/research/docs-topic-map/wave2-declaration-key.md
  - .agents/research/docs-topic-map/wave2-severity-ledger.md
  - .agents/research/docs-topic-map/wave2-calibration-a.md
  - .agents/research/docs-topic-map/wave2-calibration-b.md
  - .agents/research/docs-topic-map/wave1-critique.md
  - .agents/research/docs-audit/config-inventory.md
  - .agents/research/docs-audit/docs-shape.md
  - .agents/research/docs-audit/tested-examples-mechanism.md
  - .agents/research/docs-audit/ux-observability-posture.md
  - .agents/research/docs-frame.md
date: 2026-09-05
revised: 2026-09-05
wave: 2
---

# Use-case discovery and the tier model

## Verdict

This program ships discovery as a procedure an agent runs alone, not as a survey it
pretends to run. The canonical top-tasks pipeline needs 200-400 candidates, a 3-8 person
shortlisting committee and 100+ voters over about twelve weeks
([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)).
None of those inputs exist here, so the shipped procedure substitutes what does exist:
completeness over the code surface in place of completeness over traffic, and a real
executed friction log in place of a vote.

Nine decisions follow. The first five survive wave 1 unchanged. The last four are what
wave 2 settled.

1. **The vote is replaced by the friction log, not simulated.** McGovern's method degrades
   gracefully at low N. The European Commission's top three were stable after 30 of
   107,000 votes. But 30 real voters is still 30 more than this fleet has. Nielsen's
   discount-usability regime is the right scale fit, so ranking falls back to a named
   signal and never to an invented percentage.
2. **The friction log names no fix.** Stripe's three sections are adopted verbatim. The
   competing product-triage template that bundles a proposed solution is rejected. Naming
   a fix during discovery repeats GOV.UK's solution-shaped failure one stage earlier.
3. **Tier and type are two axes and the tier enum has exactly three values.** The frame's
   hypothesis 3 named edge reference as a fourth tier. That is wrong. uv and Astro both
   place reference outside the first-steps to guides progression. Tiers are first steps,
   everyday tasks, elaborate integration.
4. **First steps ends at one verified result, not at a step count.** A fixed 5-9 budget is
   wrong for single-binary CLIs. A fixed one-command rule is wrong for multi-system
   quickstarts. The step count is a function of how many external systems must be wired.
5. **No tutorial tier is required.** The fleet has 0 tutorials across 248 pages and that
   is a correct outcome for CLI-shaped tools, not a gap. A tutorial is required only when
   the reader must assemble two or more interacting concepts before the tool is useful.
6. **The declaration carrier is a comment line, never YAML frontmatter.** Wave 2 built the
   same five fixture pages on all three fleet generators. On mdBook 0.5.3 a frontmatter
   block renders as a horizontal rule plus a real `<h2>`, and that fake heading enters the
   search index with its own anchor. Every tier and type check in this family now reads
   `<!-- doc_tier: ... -->` and its per-markup siblings.
7. **`doc_tier` is required only on tutorial, how-to and landing pages.** Wave 1 required
   it on every page. Scoping it to three types cuts the retrofit from 248 tier lines to
   77-110, and stops a tier value being forced onto a reference entry where the concept
   means nothing.
8. **Tier can never be derived from nav position. Documented gap, now closed.** Wave 1
   deferred this as open research. Wave 2 measured it. Zero of nine sites can yield all
   three tier values from their nav config. Only three of seven MkDocs sites carry any
   tier-shaped label, and none separates everyday from integration. The inverse is true
   and useful: nav labels seed the *type* value on 115 of 122 MkDocs nav pages, 94.3%.
9. **The exit condition is one observable value, not a working command.** All 9 library
   quickstarts fetched in wave 2 end at a printed, returned or asserted value. A CLI's
   working command is one instance of that contract, not the contract itself. The step
   counter must branch on declared product shape, because 0 of 9 library quickstarts use
   a numbered list and the wave-1 counter returns a silent zero on every one of them.

Two documented gaps replace answers, and are recorded here rather than left open.

- **DOC-DISC-03's check cannot ship as designed.** Simulated against 10 realistic need
  sentences, it flags 5 of 5 legitimate needs and 5 of 5 planted paraphrases. The
  false-positive rate on legitimate needs is 100%. One cause is a stripped single-letter
  CLI flag such as `-i` matching the pronoun "I". The obligation survives at SHOULD. The
  token construction is rewritten and needs a second calibration run before any promotion.
- **A passing docs build proves nothing about the code inside it.** `ocx-mirror-sdk` ships
  four pages advertising fully runnable recipes. 5 of its 6 transcluded example files fail
  today, broken by commit `eca608f` on 2026-06-01 and green in CI ever since, because
  `mkdocs build --strict` checks links and never imports a transcluded Python file. This
  belongs to DOC-EX-01 and is recorded here because this family measured it.

## The ruleset

Rules DOC-DISC-01 to DOC-DISC-12 govern the discovery procedure and its artifact. Rules
DOC-DISC-13 to DOC-DISC-22 govern the tier model and the first-steps contract. Rules
DOC-DISC-23 to DOC-DISC-25 govern product shape, added in wave 2.

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| DOC-DISC-01 | Never source a candidate task from an existing docs page title or heading. | Stops the docs tree inventing a need that only justifies the page already written. | Diff the artifact's `source` field against a generated list of existing page titles. A task whose only source is an existing title fails. Script to be written. | MUST | codified ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)) plus measured (`config-inventory.md` axis 4) | all (discovery artifact) |
| DOC-DISC-02 | Write exactly one user need per shortlisted task, in the form "As a X, I need to Y, so that Z". | A task with no need sentence cannot be tested for solution shape later. | Schema check. Every row has non-empty `as_a`, `i_need_to` and `so_that` fields. Runnable as written. | MUST | codified ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/), template verified 2026-09-05) | all (discovery artifact) |
| DOC-DISC-03 | Reject a user need whose need or outcome clause names a page, command or flag. | Catches the agent that paraphrases the target page back at itself instead of reasoning about the task. | Build a token file from every docs heading and every CLI flag or subcommand name. Drop every token under 4 characters. Match only a 2-word-or-longer phrase, never a single word. Then `rg -iof tokens.txt needs.txt`. Any hit fails. Measured on the pre-fix pattern: 10 of 10 sentences flagged, 5 of 5 legitimate needs false-positive, 100% FP rate against a 2,964-token file (`wave2-calibration-a.md` §2). | SHOULD | codified ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)) plus measured (the failing simulation) | all (discovery artifact) |
| DOC-DISC-04 | Structure every friction log as Context, Pros and cons, and Detailed stream of consciousness, with no proposed-fix section. | A fix named during discovery locks in a solution before the task is understood. | Assert the log has exactly those three level-2 headings. Reject any file with a "solution" or "proposed fix" heading. Runnable as written. No target in the fleet today. | SHOULD | codified ([Stripe friction-logging toolkit](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md), verified 2026-09-05) | all (discovery artifact) |
| DOC-DISC-05 | Include verbatim output from a real run in the stream-of-consciousness section. | Catches an agent narrating what a user would probably see instead of running the command. | Grep the section for a fenced code block or a line starting `$ `. Absence fails. Runnable as written. No target in the fleet today. | MUST | codified (Stripe requires the log be written during the attempt, with screenshots and links as evidence) | all (discovery artifact) |
| DOC-DISC-06 | Name a concrete first-time persona in the Context section. | An agent grading its own work as an unnamed expert already knows the answer it claims to discover. | Grep the Context section for "has never" or "first time". Reject a persona sentence containing "familiar with". Runnable as written. | SHOULD | codified (Stripe requires a persona) plus argued (the first-time qualifier) | all (discovery artifact) |
| DOC-DISC-07 | Rank tasks only by one of four named signals, and record which one was used. The four are `issue-pr-frequency`, `invocation-telemetry`, `zero-result-logs` and `friction-log-severity`, in that priority order. | Blocks the fabricated percentage or vote count, which is the most common way this procedure gets faked. | Schema check that `signal` holds one of those four literal values. Then `rg '[0-9]+%\|[0-9]+ (votes\|respondents)'` over the artifact must return nothing. Runnable as written. | MUST | measured (0 of 9 sites run analytics, `ux-observability-posture.md` §2) plus codified (McGovern's ranking is a real vote count) | all (discovery artifact) |
| DOC-DISC-08 | List every top-level subcommand or exported entry point as a candidate task, even one triaged out. | A zero-traffic project has no sampling frame, so surface completeness is the only honest substitute. | Diff the tool's `--help` subcommand list against the artifact's task list plus its explicit out-of-scope list. Script to be written. | SHOULD (pinned project decision: the whole substitute method rests on this, so it is not advice) | argued, pinned (McGovern's longlist requirement applied to a surface with no traffic) | all (discovery artifact) |
| DOC-DISC-09 | Put a page on the delete list only when no user need maps to it and it is a stub or a duplicate. | One weak signal is not enough licence to delete, because the canonical deletion case had real traffic data. | Intersect the coverage table's unmapped rows with a prose word count under 150 words (threshold from `docs-shape.md` §4, which measures the fleet's stub share at that cut). Both must hold. Runnable as written. | SHOULD | measured (`docs-shape.md` §4 measures 24.6% stubs across 248 pages) plus argued (the two-signal threshold) | all |
| DOC-DISC-10 | Exempt from the stub half of the delete test any page that reaches a verified result, and any page whose body is mostly a build-time generator directive. | A 20-word page that installs the tool is the best page in the fleet. A 4-line autodoc directive renders a full API surface. Neither is a stub. | Before the word count, grep the page for a generator directive (`^:::\s`, `\.\. auto(class|module|function)::` or the language equivalent). A hit exempts the page whatever its tier. Otherwise the delete intersection skips any row whose page carries DOC-EX-02's `# doc:` success marker. Marker owned by DOC-EX-02, not reinvented here. | SHOULD | measured (`ux-observability-posture.md` §8, ocx `installation.md` reaches a working command in 20 words) plus measured (8 directive-only pages across ocx-sdk-python and ocx-mirror-sdk) | all |
| DOC-DISC-11 | Write the discovery result to one durable artifact file with the fixed schema. | A result that exists only in a transcript cannot be diffed on the next run. | Acceptance check. The named file exists on disk after a run, with one row per shortlisted task. Runnable as written. | MUST | normative (`docs-frame.md`, the artifacts are used by agents with no human in the loop) | all (discovery artifact) |
| DOC-DISC-12 | Re-run discovery on every feature merge, and re-run the grep-only coverage audit on every tagged release. | There is no traffic curve to watch, so the trigger has to be a code change or a release boundary. | A CI job on the merge event and a job on the release tag regenerate the coverage columns and diff the stub and orphan counts against the prior run. Runnable as written. | CONSIDER | argued (no source gives a cadence for this regime) | all (discovery artifact) |
| DOC-DISC-13 | Declare tier and type as two separate comment-line keys, and allow only `first-steps`, `everyday` or `integration` as a `doc_tier` value. Require `doc_tier` only on pages typed tutorial, how-to or landing. | Stops reference being filed as a tier and stops one enum trying to carry both axes. Frontmatter corrupts the mdBook render and its search index. | `checks/doc-declaration.sh <files>`. It reads the first 12 lines for `doc_type` and, for the three journey types only, `doc_tier`. Openers are `<!--` for markdown, `{/*` for MDX, `..` for reStructuredText and `%` for MyST. Measured: 248 of 248 fleet pages fail, and 181 of 181 on the narrower generator-tree list. 0 of 10 sampled hits are false positives, matching DOC-TYPE-01's 0 of 248. | MUST | normative (`docs-frame.md` correction 5) plus measured (fixture builds on MkDocs Material 9.7.7, mdBook 0.5.3 and VitePress 2.0.0-alpha.20) | tutorial, how-to, landing (tier); all (type, owned by DOC-TYPE-01) |
| DOC-DISC-14 | Give every task row a tier, and decide first-steps membership by dependency order rather than by rank. | Without this the ranked list never becomes nav, and the most painful task outranks the entry task. | Schema check. Every row has a `tier`. Every `first-steps` row also carries an empty `depends_on` list. Runnable as written. | SHOULD | normative (follows from DOC-DISC-13) plus argued (the dependency criterion) | all |
| DOC-DISC-15 | End a first-steps page at one verified observable result, and justify a page that runs past its shape's budget. | A fixed step budget is wrong for a single binary and a one-command rule is wrong for a multi-system setup. | Branch on declared product shape (DOC-DISC-23). For `cli` and `hosted-service`, count ordered-list items matching `^\s*\d+\.` plus command fences from the H1 to the first success marker, and require an external-system list above 9 actions (9 from [Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), the longest quickstart measured). For `library`, count fences from the nearest example-introducing heading to the first fence with shown output, and flag above 4 (measured ceiling is 2 across 9 library quickstarts). Success marker is DOC-EX-02's. Measured on the fleet: 1 hit in 248 pages, 0 of 1 false positive. | SHOULD | measured ([Twilio](https://www.twilio.com/docs/messaging/quickstart) 8 steps, Supabase 9, uv and ocx 1, and 9 library quickstarts at 1-2 fences) | tutorial, how-to, landing |
| DOC-DISC-16 | Keep a first-steps page under about 100 words before its first command, counted from the heading that introduces the runnable snippet, and move any callout past it. | Padding before the first command is the agent's default and it costs the reader the fastest path to a result. | Count words from the nearest example-introducing heading, not the H1, to the first command block. Treat `^\s*<<<`, `^\s*--8<--` and `{{#include` as command blocks alongside a literal fence. Flag `::: tip`, `> [!NOTE]`, `!!! ` or `<Aside>` before that block. 100 words is unsourced and shared with DOC-TYPE-07, which owns the number. Measured on the fleet: 4 hits in 248 pages, and 1 of 4 was a detector gap reading 2019 words against a manually confirmed 185. | SHOULD | measured (`ux-observability-posture.md` §8, 20 words versus 185 with a deferrable callout) plus measured (serde 320 and tokio 275 words on dual-purpose pages) | tutorial, how-to, landing |
| DOC-DISC-17 | Keep branching choices out of a page declaring `doc_type: tutorial`, including a branch written as prose. | A page cannot promise a single safe path and offer package-manager alternatives at the same time. | Over pages whose first 12 lines declare `doc_type: tutorial`, run `rg '(::: ?code-group\|<Tabs\|=== "\|\{% tab)'` and `rg -i '\b(or,? with\|alternatively\|if you (use\|prefer))\b'` between two fences of the same language. Any hit fails. The same syntax passes on a quickstart or how-to. Measured: 0 scoped hits today because 0 pages declare a type, and 3 informational hits on path-classified pages. Inert until the declaration lands. | MUST | normative ([Diataxis](https://diataxis.fr/tutorials-how-to/) and [The Good Docs Project](https://www.thegooddocsproject.dev/template/), both quotes verified 2026-09-05) plus measured (one prose-branch instance in ocx-sdk-python) | tutorial |
| DOC-DISC-18 | Make every step of a first-steps or tutorial page produce a result the reader can see. | A step whose only effect is "no error" breaks the confidence chain the whole tier exists to build. | unverified: reading heuristic. For each step, a printed value, a new file or a rendered page is stated within that step. A `>>>` result line, a `#>` comment or an inline `// prints` comment satisfies this on its own, with no extra prose. Returns to MUST as a set comparison once DOC-EX-02's marker is wired per step. | SHOULD | normative ([Diataxis](https://diataxis.fr/tutorials/)) plus measured (9 of 9 library quickstarts end at a shown value) | tutorial, how-to |
| DOC-DISC-19 | Type a page as a tutorial only when the reader must assemble two or more interacting concepts. | An agent labels any onboarding page a tutorial, because that is the most frequent word for it. | unverified: reading heuristic. Compare against the fleet base rate of 0 tutorials in 248 pages. | CONSIDER | argued (two-site comparison of uv and Astro) | tutorial |
| DOC-DISC-20 | Have a reader who did not write the page walk a tutorial before it ships. | A passing script proves the commands run, not that an unfamiliar reader can follow the prose between them. | Record the reviewer in a named field. For an agent fleet the reviewer is a subagent with no repo context that follows only the page and reports where it stalled. Runnable as written. | SHOULD | normative ([Diataxis](https://diataxis.fr/tutorials/) requires testing with real users) | tutorial |
| DOC-DISC-21 | Put the next tier in a different top-level nav group from the first-steps entry point. | A nav break is what stops tier one absorbing everyday and integration content over time. | Read the generator nav config. Confirm the first-steps pages and the everyday hub sit in different top-level groups. Read `mkdocs.yml`, `SUMMARY.md` and the VitePress sidebar config. Skip when the tree has no generator config. Measured: 9 of 22 repos have a nav config, 13 skipped, and grimoire's flat `SUMMARY.md` is the only real violation. | SHOULD | measured ([uv](https://docs.astral.sh/uv/) and [Astro](https://docs.astro.build/en/getting-started/) nav, `ux-observability-posture.md` §1) | all |
| DOC-DISC-22 | State the production scope of a quickstart whose own commands are dev-only, with named before-you-ship items. | Shipping insecure defaults without a caveat teaches a bad habit as if it were best practice. | Applies only where DOC-DISC-23 declares `hosted-service` or a multi-tenant `cli`. Grep the page for a scope sentence containing "production" when its fences match a dev-only trigger list, such as a hardcoded key literal or a disabled-auth flag. Measured: 0 hits over 55 scoped pages, so the trigger list is narrow and the zero is not proof of compliance. | SHOULD | measured ([Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)) plus measured (0 of 8 pure or network libraries show a dev-versus-production default) | tutorial, how-to |
| DOC-DISC-23 | Declare one product shape per repository, from `cli`, `library`, `hosted-service` or `framework`, and read it before applying any first-steps threshold. | The first-steps thresholds were calibrated on CLI and hosted-service exemplars and misfire on a library. | Grep the project's docs config (`mkdocs.yml` extra, a `pyproject.toml` tool table, or `docs.toml`) for one of the four literal values. Absence fails. The shape then selects the DOC-DISC-15 counting branch and the DOC-DISC-22 scope. | CONSIDER | argued (this program designed the key, no external source names it) | all |
| DOC-DISC-24 | A library that wraps a CLI or a service publishes a per-entry parity table with a closed support-tier enum, not prose about what it wraps. | Prose coverage claims are not falsifiable, so a drifted or missing wrapper is invisible. | Grep the reference tree for a table whose header row carries a tier legend, then confirm every row's tier value comes from that closed enum. No free-text tier values. DOC-TYPE-18 owns the REST-surface version of this contract. | SHOULD | measured (`ocx-sdk-python/docs/reference/command-map.md`, T1/T2/T3 plus never-wrapped) plus argued (generalising past one instance) | reference |
| DOC-DISC-25 | State a first example's precondition before the call, whenever the example needs a binary, a key or a running server. | A wrapper SDK cannot reach a zero-setup result, so a "just works" quickstart fails for every real reader. | unverified: reading heuristic. Where DOC-DISC-23 declares `library` and the first example touches a wrapped binary, an account key or a separate process, a precondition sentence appears above the fence. | SHOULD | measured (ocx-sdk-python states the PATH precondition, Stripe needs an account and key, tokio needs Mini-Redis running) | tutorial, how-to, landing |

## Applied to the fleet

### Already satisfied

- **DOC-DISC-15 and DOC-DISC-16, on two pages.** `ocx/website/src/docs/installation.md`
  reaches a runnable successful command in 20 words behind one heading.
  `ocx-sdk-python/docs/guide/quickstart.md` reaches its first fence in 4 words, better
  than 7 of the 9 external library quickstarts measured in wave 2.
- **DOC-DISC-14 in spirit, on one site.** `ocx-catalog/docs/index.md:19-30` keys its
  landing cards to reader intent rather than to a feature grid. It sits on the
  docs-tooling product rather than on any product-docs site.
- **DOC-DISC-21 on the seven MkDocs sites.** Each groups its nav into 3 to 9 top-level
  sections with getting-started separate from the guide hub.
- **DOC-DISC-24, on one repo.** `ocx-sdk-python/docs/reference/command-map.md` is the
  fleet's only wrapper parity table with a closed tier enum.

### Violated today

- **DOC-DISC-13, fleet-wide, 248 of 248 pages.** The narrower generator-tree run fails
  181 of 181. Zero pages declare a tier or a type. Classification is a path heuristic that
  files 31.9% of pages as other, concentrated in `grimoire`'s flat mdBook tree.
- **DOC-DISC-16, 4 hits in 248 pages.** `ocx/website/src/docs/getting-started.md` runs 185
  words before its first command, inflated by a deferrable `::: tip` callout. One of the
  four hits is the detector gap, not the page.
- **DOC-DISC-15, 1 hit in 248 pages.** `ocx/website/src/docs/installation.md` runs 16
  steps or fences with no named external system, and the hit is genuine.
- **DOC-DISC-21, on grimoire.** `grimoire/docs/src/SUMMARY.md:5-24` is a flat 21-item
  sidebar with zero grouping, the fleet's only zero-hierarchy nav. The check skipped `ocx`
  in wave 1 because it read only `mkdocs.yml` and `SUMMARY.md`. The VitePress arm is now
  named in the verification.
- **DOC-DISC-09 and DOC-DISC-10 have a real target.** `ocx-mirror-sdk` is 33 of 35 pages
  under 150 prose words. 7 of those are generator-directive pages that DOC-DISC-10 now
  exempts outright, so the deletable set is smaller than the raw stub share implies.
- **DOC-DISC-07 has nothing to rank with.** 0 of 9 sites log zero-result searches or run
  analytics, so every repo falls to `friction-log-severity` today and must say so.
- **DOC-DISC-17 is inert, 0 scoped hits.** No page declares a type, so the rule cannot
  fire. Three path-classified pages carry real branching syntax and will fail on the day
  the declaration lands.
- **DOC-DISC-22 never fires, 0 hits over 55 scoped pages.** The dev-only trigger list is
  narrow. The zero is not evidence of compliance.
- **DOC-DISC-23, fleet-wide.** No repo declares a product shape anywhere.

### New commitments

Everything in DOC-DISC-01 to DOC-DISC-08 and DOC-DISC-11 is greenfield. The calibration
run confirmed this by measurement: those checks return zero targets, not zero hits,
because no discovery artifact exists in any checkout. `config-inventory.md` axis 4 found
no repo with config for use-case tiers, a quickstart contract, or any
information-architecture method.

Two existing mechanisms are the carriers these rules reuse rather than duplicate.
DOC-DISC-10, 15 and 18 all consume DOC-EX-02's `# doc:` binding key as their success
marker, which has 66 uses and zero orphans today. DOC-DISC-13 consumes
`checks/doc-declaration.sh`, which is 12 lines of POSIX shell owned by DOC-TYPE-01.
Neither is reinvented here.

## AI-agent failure modes

Ranked by how often it bites when an agent runs this procedure or writes a first-steps page.

1. **Fabricates a vote count or a percentage it never measured.** Asked to rank tasks
   under a top-tasks framing, an agent produces "73% of users need X" with no survey
   behind it. Caught by DOC-DISC-07.
2. **Transcludes an example file into a page and calls that tested.** The single most
   expensive failure measured in wave 2. A green `mkdocs build --strict` proves the file
   renders, never that it imports. 5 of 6 `ocx-mirror-sdk` examples have been broken for
   three months under a green build. Owned by DOC-EX-01, recorded here.
3. **Narrates a friction log instead of running one.** An agent writes plausible prose
   about what a user would probably feel without executing anything. Caught by DOC-DISC-05.
4. **Writes the user need by paraphrasing the target page.** Caught by DOC-DISC-03, with
   DOC-DISC-01 closing the sourcing stage.
5. **Writes YAML frontmatter for the declaration.** Frontmatter dominates training data,
   so an agent told to add metadata reaches for `---`. On mdBook that ships a fake heading
   into the search index. Caught by DOC-DISC-13's comment-line check.
6. **Puts the declaration comment above existing frontmatter.** The agent reads "first
   line" literally and destroys the frontmatter the page already had. Caught by the same
   check plus DOC-TYPE-01's order clause.
7. **Collapses tier and type into one field.** A single enum such as `doc_type:
   getting-started` is easier to generate than two orthogonal keys. Caught by DOC-DISC-13.
8. **Imports the CLI framing wholesale onto a library.** An agent that just read a
   hosted-service quickstart writes a library first-steps page around a shell command
   instead of a printed value. Caught by DOC-DISC-23 plus DOC-DISC-18.
9. **Flags a generated-reference stub for deletion.** A 4-line autodoc directive reads as
   a stub by word count, and deleting it destroys the pointer to a whole API surface.
   Caught by DOC-DISC-10's directive grep, run before the word count.
10. **Pads the runway with a "why this matters" paragraph before the first command.**
    Caught by DOC-DISC-16.
11. **Writes "or, with pip:" instead of a tabs component.** Not deliberate evasion. Prose
    is what an agent reaches for, and the wave-1 grep did not fire on it. Caught by
    DOC-DISC-17's broadened pattern.
12. **Invents a word-count violation by counting from the H1 on a dual-purpose page.** An
    agent auditing serde.rs cold flags 320 words without noticing the page is landing and
    quickstart at once. Caught by DOC-DISC-16's heading-relative counting.
13. **Assumes every library example runs with no precondition.** It writes a "just works"
    quickstart for a wrapper SDK that needs a live binary, key or server. Caught by
    DOC-DISC-25.
14. **Labels any onboarding page a tutorial.** Caught by DOC-DISC-19, with DOC-DISC-17
    catching the consequence.
15. **Never deletes, only adds.** Caught by DOC-DISC-09 requiring an explicit action value
    per row, and DOC-DISC-11 requiring the run to leave a diffable file.
16. **Writes silent steps.** A step whose only effect is that no error appeared reads as
    progress to the author and as a dead end to the reader. Caught by DOC-DISC-18.
17. **Invents a step or time claim.** "Five easy steps" appears without counting the
    actual actions. Caught by DOC-DISC-15's counter compared against the prose claim.
18. **Ships dev-only defaults with no scope caveat.** Caught by DOC-DISC-22.
19. **Sprawls the longlist and never converges.** Caught by DOC-DISC-08 paired with a
    duplicate-collapse pass before ranking.
20. **Leaks the template into a shipped page.** The literal strings "As a" and "so that"
    reach a rendered page. Caught by grepping build output for the template markers
    outside the discovery directory.

## Conflicts resolved

| Conflict | Sources | Resolution and reason |
|---|---|---|
| Survey-scale voting versus discount-usability reviewing | [Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/) versus [NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/) | Take the discount regime. The survey regime needs a voter pool this fleet cannot produce without inventing one. DOC-DISC-07. |
| Friction log names a fix versus names no fix | [Stripe](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md) versus [Chameleon](https://www.chameleon.io/blog/friction-logs) | Stripe's shape wins for discovery. A fix named while the task is still being discovered repeats the solution-shaped failure one stage earlier. DOC-DISC-04. |
| Four tiers with edge reference versus three tiers | `docs-frame.md` hypothesis 3 versus live fetches of uv and Astro | Three tiers. Reference sits outside the progression on both exemplar sites. DOC-DISC-13. |
| Fixed 5-9 step budget versus a one-command rule | Twilio and Supabase versus uv, Astro and ocx | Neither. The step count scales with external systems to wire, so the rule states a result condition with a smell threshold. DOC-DISC-15. |
| Diataxis tutorial linearity versus Every Page is Page One | [Diataxis](https://diataxis.fr/tutorials-how-to/) versus [EPPO](https://everypageispageone.com/the-book/) | Not a real conflict. EPPO's workflow-topic exception is Diataxis's tutorial under another name. |
| Delete on the stub signal versus keep a very short first-steps page | `use-case-discovery-procedure.md` §7 versus `tier-model-and-first-steps-contract.md` candidate 4 | ocx's 20-word `installation.md` would trip the stub test while being the fleet's best first-steps page. Exempt pages reaching a verified result. DOC-DISC-10. |
| Rank decides the first tier versus dependency decides it | `use-case-discovery-procedure.md` §6 versus `tier-model-and-first-steps-contract.md` finding 8 | Ranking by friction severity would put the most painful task first, not the entry task. Dependency order decides tier one. DOC-DISC-14. |
| Frontmatter carrier versus comment carrier | DOC-DISC-13 and DOC-DISC-17 wave 1 versus `wave2-declaration-key.md` finding 1 | The comment wins on rendered evidence. mdBook 0.5.3 turns frontmatter into a searchable fake heading with its own anchor. Both rules keep their severity and rewrite the carrier. |
| Tier required on every page versus scoped to three types | DOC-DISC-13 wave 1 versus `wave2-declaration-key.md` candidate 9 | Scoped. Requiring a tier on a reference entry or a changelog forces a value where the concept means nothing, and costs 248 lines instead of about 100. |
| Tier from nav versus tier from a per-page key | this file's own wave-1 open question versus `wave2-declaration-key.md` finding 10 | Per-page key. 0 of 9 sites yield all three tier values from nav. Nav labels seed the type value at 94.3% and are a migration seed only. |
| CLI step-count budget versus library evidence | Twilio and Supabase versus 9 library quickstarts | Branch on declared product shape. 0 of 9 library quickstarts use a numbered list, so the wave-1 counter returns a silent zero. DOC-DISC-15 and DOC-DISC-23. |
| Word count from the H1 versus from the example heading | DOC-DISC-16 wave 1 versus serde and tokio | From the example heading. Counting from the H1 flags well-regarded dual-purpose pages for running a pitch before their own quickstart section. |
| "Quarterly" cadence versus DOC-NAV-15's ban on cadence words | DOC-DISC-12 versus DOC-NAV-15 | DOC-NAV-15 wins. DOC-DISC-12 now names a release boundary instead. |
| Template catalogue size, 25 versus 28 | `tier-model-and-first-steps-contract.md` finding 3 versus the live page | The live [Good Docs Project](https://www.thegooddocsproject.dev/template/) page lists 28 templates across three packs. Quickstart and Tutorial remain separate templates. |

Two claims from sibling topics are flagged rather than resolved here. uv's landing page
does carry a benchmark chart, which contradicts `exemplar-sites.md` §1 and belongs to
`landing-page-contract`. The transclusion-versus-test gap measured on `ocx-mirror-sdk`
belongs to DOC-EX-01 in `docs-examples.md`.

## Open questions

### Needs a human decision

1. **Does the fleet retrofit the declaration onto 248 existing pages?** Wave 2 priced it:
   325 to 358 added lines across 248 files in one commit, with 115 type values seeding
   from nav config at 94.3% accuracy and about 79 pages needing a content read. The
   sequencing is settled, seed in one commit then flip the check to error. The spend is
   not.
2. **Where does the discovery artifact live, and is it committed?** In-repo under
   `docs/discovery/` makes it reviewable in a pull request. Under `.agents/` keeps
   generated research off the docs surface. Note that `wave2-declaration-key.md` candidate
   14 already excludes `.agents` from the declaration check.
3. **May an agent act on the delete list without sign-off?** DOC-DISC-09 restricts
   deletion to two agreeing signals. DOC-DISC-10's new directive exemption shrinks the
   `ocx-mirror-sdk` target, but deleting docs unattended remains a different risk class
   from writing a page.
4. **Does discovery block a merge?** `docs-frame.md` decision 4 reserves the blocking
   posture for the owner. DOC-DISC-12 assumes event-triggered and non-blocking.

### Deserves another research round

- `friction-log-under-agent-execution` — can an agent that already has the repository in
  context produce a friction log worth anything? DOC-DISC-06 instructs a first-time
  persona, but instruction cannot make the agent un-know the codebase. The candidate
  design is a subagent with no repo access. Nobody has measured whether it finds different
  things.
- `disc-03-second-calibration` — the rewritten token construction (drop tokens under 4
  characters, match 2-word phrases) has not been run. The first design flagged 5 of 5
  legitimate needs. The rewrite must show 0 of 5 before DOC-DISC-03 goes above SHOULD.
- `product-shape-key-adoption` — DOC-DISC-23 invents a config key no external source
  names. Whether four values are the right cut, and whether `framework` earns its slot
  with zero fleet instances, is untested.
- `disc-22-trigger-list` — the dev-only trigger list fires on 0 of 55 scoped pages. It
  needs widening and a second run before the zero counts as compliance.

Two wave-1 items are removed because wave 2 answered them.
`tier-from-nav-versus-tier-from-frontmatter` is closed by measurement, in Verdict decision
8. `success-marker-shared-with-the-tested-example-gate` is closed by assigning the marker
to DOC-EX-02, which DOC-DISC-10, 15 and 18 now consume.
`discovery-check-false-positive-rates` is partly closed and survives as
`disc-03-second-calibration`.

## Revision log

- Wave 2. Rewrote the declaration carrier in DOC-DISC-13 and DOC-DISC-17 from YAML
  frontmatter to a comment line, per `wave2-declaration-key.md` finding 1. Both keep MUST.
  Frontmatter renders as a searchable fake heading on mdBook 0.5.3.
- Wave 2. Scoped `doc_tier` in DOC-DISC-13 to pages typed tutorial, how-to or landing.
  Wave 1 required it on every page. Cuts the retrofit from 248 lines to 77-110.
- Wave 2. Demoted DOC-DISC-03 from MUST to SHOULD and rewrote its token construction. The
  ledger and the calibration both demand a measured rate first. Measured 100% false
  positive on 5 legitimate needs.
- Wave 2. Promoted DOC-DISC-08 from CONSIDER to SHOULD and marked it a pinned project
  decision. The substitute-for-a-vote method rests on it, so it is not advice.
- Wave 2. Demoted DOC-DISC-18 from MUST to SHOULD and added the literal marker
  `unverified: reading heuristic`, per DOC-PLAIN-17's cap and DOC-AGENT-16's marker. The
  row named a reading heuristic and shipped at MUST, which the program's own gates forbid.
- Wave 2. Added the literal marker to DOC-DISC-19 and DOC-DISC-25 for the same reason.
- Wave 2. Printed DOC-DISC-07's four enum values in the rule text. The wave-1 critique
  found the fixed enum referenced with its values never stated.
- Wave 2. Put a source on every bare number. DOC-DISC-09's 150 cites `docs-shape.md` §4,
  DOC-DISC-15's 9 cites Supabase, DOC-DISC-16's 100 is marked unsourced and assigned to
  DOC-TYPE-07 as owner. Satisfies DOC-AGENT-12.
- Wave 2. Replaced "quarterly" in DOC-DISC-12 with a release boundary. DOC-NAV-15 bans a
  bare cadence word and owns that object.
- Wave 2. Widened DOC-DISC-10's stub exemption to any page whose body is mostly a
  build-time generator directive, whatever its tier. 8 measured fleet pages across two
  repos were on the delete list wrongly.
- Wave 2. Bound DOC-DISC-10, DOC-DISC-15 and DOC-DISC-18 to DOC-EX-02's `# doc:` marker
  rather than inventing one. Overlap 6 in the ledger assigns that owner.
- Wave 2. Branched DOC-DISC-15's counter on product shape. 0 of 9 library quickstarts use
  a numbered list, so the wave-1 counter returned a silent zero on all of them.
- Wave 2. Changed DOC-DISC-16 to count from the example-introducing heading, and to treat
  `<<<`, `--8<--` and `{{#include` as command blocks. The wave-1 detector read 2019 words
  on a page whose real count is 185.
- Wave 2. Broadened DOC-DISC-17's grep to catch a prose branch such as "or, with pip:".
  One live fleet instance evaded the component-syntax pattern.
- Wave 2. Narrowed DOC-DISC-22 to hosted-service and multi-tenant CLI shapes. 0 of 8 pure
  or network libraries show any dev-versus-production default to caveat.
- Wave 2. Added the VitePress sidebar to DOC-DISC-21's verification. The wave-1 check
  silently skipped `ocx` because it read only `mkdocs.yml` and `SUMMARY.md`.
- Wave 2. Added DOC-DISC-23, declare one product shape per repository. CONSIDER, because
  no external source names the key.
- Wave 2. Added DOC-DISC-24, a wrapper parity table with a closed tier enum. SHOULD.
  DOC-TYPE-18 owns the REST-surface version and this is the CLI or service version.
- Wave 2. Added DOC-DISC-25, state a first example's precondition. SHOULD, reading
  heuristic. Three measured instances need a precondition and one states it.
- Wave 2. Put measured hit counts and false-positive rates on DOC-DISC-13, 15, 16, 17, 21
  and 22 from `wave2-calibration-a.md` §2.
- Wave 2. Kept DOC-DISC-17 as a live ID with its own number, against the ledger's
  suggestion that it move under DOC-TYPE-03's tutorial contract. The ledger's own
  surviving-MUST table still lists DOC-DISC-17, and ID stability forbids reassigning it.
  DOC-TYPE-03 owns the general type-mixing object and the row now says so.
- Wave 2. Kept DOC-DISC-09's stub threshold at 150 words, not the 300 words named in
  `wave2-calibration-b.md` candidate 15. 150 is the fleet audit's own measured cut and
  the 300 there is a floor for rate-based prose gates, a different object.
- Wave 2. Moved `tier-from-nav-versus-tier-from-frontmatter` out of Open questions into
  the Verdict as a documented gap, measured and closed.
- Wave 2. Removed `success-marker-shared-with-the-tested-example-gate` from Open
  questions. DOC-EX-02 owns the marker and three rules here consume it.

## Sub-artifacts

- [use-case-discovery-procedure.md](docs-use-case-discovery/use-case-discovery-procedure.md)
  — wave 1. How a project with no users and no analytics builds a ranked task list, runs
  a friction log, writes falsifiable user needs, and produces a coverage table plus a
  delete list.
- [tier-model-and-first-steps-contract.md](docs-use-case-discovery/tier-model-and-first-steps-contract.md)
  — wave 1. The three-tier axis, why it is independent of content type, what a first-steps
  page owes a reader, and when a project needs a tutorial at all.
- [first-steps-for-libraries-and-sdks.md](docs-use-case-discovery/first-steps-for-libraries-and-sdks.md)
  — wave 2. Nine library quickstarts across Python, Rust and TypeScript measured against
  the CLI-calibrated first-steps rules. Establishes the observable-value exit condition,
  three library sub-shapes, the fence-count budget, and the broken-transclusion failure on
  `ocx-mirror-sdk`.

## Key sources

| URL | Why it matters here |
|---|---|
| [guidance.publishing.service.gov.uk/.../identify-user-needs/](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/) | The user-need template and the carer example behind DOC-DISC-02 and DOC-DISC-03, verified verbatim 2026-09-05 |
| [github.com/mikeb-stripe/friction-logging-toolkit](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md) | The three-section friction log adopted in DOC-DISC-04 to DOC-DISC-06, confirmed to contain no fix section |
| [smashingmagazine.com/2022/05/top-tasks-...](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/) | The full top-tasks pipeline with real numbers and the Liverpool deletion case |
| [nngroup.com/articles/why-you-only-need-to-test-with-5-users/](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/) | The discount-usability sizing that replaces the voter pool |
| [measuringu.com/top-tasks/](https://measuringu.com/top-tasks/) | Independent account of the same method, with the sample-size math |
| [diataxis.fr/tutorials-how-to/](https://diataxis.fr/tutorials-how-to/) | The no-branching quote behind DOC-DISC-17, verified 2026-09-05 |
| [diataxis.fr/tutorials/](https://diataxis.fr/tutorials/) | Every step produces a comprehensible result, behind DOC-DISC-18 and DOC-DISC-20 |
| [thegooddocsproject.dev/template/](https://www.thegooddocsproject.dev/template/) | Quickstart and Tutorial as separate templates, now 28 templates across three packs |
| [docs.astral.sh/uv](https://docs.astral.sh/uv/) | Live proof that tier and type are separate axes |
| [docs.astro.build/en/getting-started/](https://docs.astro.build/en/getting-started/) | Three coexisting entry paths and a one-command quickstart on the same site |
| [twilio.com/docs/messaging/quickstart](https://www.twilio.com/docs/messaging/quickstart) | Eight-step multi-system quickstart, the upper end of DOC-DISC-15's CLI branch |
| [supabase.com/docs/guides/getting-started/quickstarts/reactjs](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) | Nine-step quickstart plus the production-scope caveat behind DOC-DISC-22 |
| [requests.readthedocs.io/en/latest/user/quickstart/](https://requests.readthedocs.io/en/latest/user/quickstart/) | REPL-transcript exit value, behind DOC-DISC-18's transcript clause |
| [pydantic.dev/docs/validation/latest/get-started/](https://pydantic.dev/docs/validation/latest/get-started/) | The `#>` output convention and the numbered-comment legend |
| [docs.rs/reqwest/latest/reqwest/](https://docs.rs/reqwest/latest/reqwest/) | Tightest word budget measured, 16 words |
| [serde.rs](https://serde.rs/) | The 320-word dual-purpose page that breaks H1-relative counting |
| [tokio.rs/tokio/tutorial/hello-tokio](https://tokio.rs/tokio/tutorial/hello-tokio) | Runtime-as-library shape, needs a live Mini-Redis process, behind DOC-DISC-25 |
| [docs.stripe.com/get-started/api-request](https://docs.stripe.com/get-started/api-request) | Confirms the hosted-service first step is CLI-shaped, not SDK-shaped |
| [developers.google.com/style/code-samples](https://developers.google.com/style/code-samples) | Documented absence. Google's public guidance here is formatting only |
| [learn.microsoft.com/en-us/contribute/content/](https://learn.microsoft.com/en-us/contribute/content/) | Documented absence. The quickstart-template page returns 404 as of 2026-09-05 |
| [mdxjs.com/docs/what-is-mdx/](https://mdxjs.com/docs/what-is-mdx/) | The `{/* */}` comment requirement that gives DOC-DISC-13 its MDX opener |
| [rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html) | mdBook never supported frontmatter, which matches the measured render |
| [everypageispageone.com/the-book/](https://everypageispageone.com/the-book/) | The workflow-topic exception that dissolves the EPPO versus tutorial-linearity conflict |
| [chameleon.io/blog/friction-logs](https://www.chameleon.io/blog/friction-logs) | The rejected friction-log template that bundles a proposed solution |
| [digital.gov/event/2018/04/11/a-deep-dive-into-top-tasks-with-gerry-mcgovern](https://digital.gov/event/2018/04/11/a-deep-dive-into-top-tasks-with-gerry-mcgovern) | The only fetchable primary source for the Task Performance Indicator |
