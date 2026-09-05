---
title: Documentation design — docs-observability (consolidated)
topic: docs-observability
family: DOC-OBS
model: claude-opus-5[1m]
date: 2026-09-05
revised: 2026-09-05
wave: 2
consolidates:
  - .agents/research/docs-observability/minimum-instrumentation-set.md
  - .agents/research/docs-observability/staleness-and-drift-gates.md
  - .agents/research/docs-observability/reader-signals-and-zero-result-sink.md
  - .agents/research/docs-observability/error-message-links-and-ai-authoring-policy.md
grounded_in:
  - .agents/research/docs-audit/config-inventory.md
  - .agents/research/docs-audit/docs-shape.md
  - .agents/research/docs-audit/tested-examples-mechanism.md
  - .agents/research/docs-audit/ux-observability-posture.md
  - .agents/research/docs-frame.md
  - .agents/research/docs-topic-map/wave1-critique.md
  - .agents/research/docs-topic-map/wave2-severity-ledger.md
  - .agents/research/docs-topic-map/wave2-declaration-key.md
  - .agents/research/docs-topic-map/wave2-calibration-a.md
---

# docs-observability — consolidated

## Verdict

Grade documentation on whether it is still true and still findable, not on how it
reads. Three "worst documentation" threads, re-fetched rather than summarised,
contain almost no complaint about tone and nearly all about currency
(`staleness-and-drift-gates.md` §1). DORA measures the same axis: clarity,
findability, reliability, with an above-average docs multiplier of 1525% on
trunk-based development against 36% below average
([dora.dev](https://dora.dev/capabilities/documentation-quality/), re-fetched
2026-09-05). So this group's rules gate drift first and instrumentation second.

The fleet's link checking exists and is misconfigured, but wave 2 changed which
half is broken. Reading the nine real CI configs directly shows seven of nine
sites already fail their build on a broken internal link or anchor, through
`mkdocs build --strict` rather than through lychee
(`wave2-calibration-a.md` §3). The literal wave-1 check text would have reported
all seven as non-compliant. So DOC-OBS-01 now accepts a generator's own strict
build as satisfying the obligation. The real gap is smaller and sharper: ocx and
grimoire run no link check of any kind against their real docs output. The raw
pass stays broken everywhere. Seven of nine run lychee against a raw tree with no
`--root-dir`, and ocx-sdk-python's one exclusion names test fixtures rather than
the mkdocstrings stub that manufactures the 65 phantom failures.

The blocking conflict resolves by blast radius, not by vote. GitLab's published
workflow says outright that "documentation reviews must not be blockers" and
requires a post-merge follow-up issue instead (re-fetched 2026-09-05).
creeptd-ng's opposite Block finding (`doc-sync.md:33`) is right for its own
surface, which is exactly two runbook pages, the one class with a measured
staleness cost. Runbook-class drift blocks. Everything else opens a tracked
issue. That split ships as the default and the owner's remaining choice narrows
to the default class only.

The runbook classifier fails on its own motivating case, and that is a documented
gap rather than an answer. Both wave-1 carriers, `type: runbook` frontmatter and
a `docs/runbooks/**` path glob, match 0 of 248 fleet pages, including the two
creeptd-ng pages the rule cites as its evidence (`wave2-calibration-a.md` §3).
Frontmatter is disqualified outright, because on mdBook 0.5.3 it renders as a
visible heading and enters the search index (`wave2-declaration-key.md` §1). The
path glob is deleted, because DOC-TYPE-02 forbids path inference. The carrier is
now `<!-- doc_type: runbook -->` in the first 12 lines, and the two known pages
must be retrofitted at rollout or DOC-OBS-05 ships permanently inert.

Zero-result search is no longer deferred, and the deferral rule keeps its shape
with a different example. Wave 1 called a query-logging search backend the
blocking precondition. That was the precondition for one kind of sink only. A
Cloudflare Worker free tier carries 100,000 requests a day at no cost, and Umami
or Plausible accept the same event as a named custom event
(`reader-signals-and-zero-result-sink.md` §2). The requirement lives in DOC-NAV,
which already owns the beacon's whole lifecycle. DOC-OBS-12 keeps the deferral
mechanism and takes agent-versus-human traffic share as its worked example, which
is still genuinely blocked on this fleet's static hosting.

Two things this group still refuses to ship. No invented freshness SLO: no source
surveyed validates a "review every N days" number, and the one numeric model
found is runbook-specific. No metric published without its denominator, its
channel and its date.

The rule set is read by AI authors, which changes what it must forbid. DORA 2024
pairs a 7.5% documentation-quality gain with a 7.2% stability drop at the same
25% AI-adoption increase. This program declines to adjudicate whether AI helps or
hurts docs and instead grades an axis neither side contests: every docs change
states what it removed. Volume stops being free. The separate question of
disclosing AI authorship is settled and owned elsewhere. Kubernetes' shape wins,
which is a PR-level disclosure field and a ban on AI co-author trailers, and it
ships as DOC-PLAIN-22 beside DOC-OBS-09's keys.

Four documented gaps, stated rather than closed. No `checks/` directory exists
anywhere on disk, so every rule naming a script is unshipped until the file
lands. DOC-OBS-06's scheduled runbook harness is still unbuilt, so the rule now
ships a greppable floor at SHOULD instead. No live GA4 DebugView session was run,
so the GA4 non-satisfier rests on two vendors' own stated mechanisms. Umami's
cloud pricing and DocSearch's free-tier analytics dashboard are both unconfirmed
at the vendor's own page.

## The ruleset

| ID | Rule | Severity | Evidence | Applies to |
|---|---|---|---|---|
| DOC-OBS-01 | Fail the docs build on a broken internal link or anchor, checked against built output | MUST | measured | all |
| DOC-OBS-02 | Configure any raw-markdown link pass with a source root and build-time-anchor exclusions | MUST | measured | all |
| DOC-OBS-03 | Keep a trigger matrix mapping source globs to the doc sections they invalidate | SHOULD | codified | all |
| DOC-OBS-04 | Do not block a merge on drift in a general docs page | SHOULD, pinned | normative | all |
| DOC-OBS-05 | Block a merge on drift in a page declaring `doc_type: runbook` | SHOULD, pinned | measured | runbook |
| DOC-OBS-06 | Write every runbook step against something a machine can check | SHOULD | measured | runbook |
| DOC-OBS-07 | Record a dated, hand-measured time to first working result | SHOULD | measured | landing, tutorial |
| DOC-OBS-08 | Never publish a docs metric you did not measure | SHOULD | codified | all |
| DOC-OBS-09 | State what a docs change removed | SHOULD | measured | all |
| DOC-OBS-10 | Keep one manifest recording every signal's status, review trigger and bias | SHOULD, pinned | asserted | all |
| DOC-OBS-11 | Ship a docs issue template that applies a docs label | SHOULD | measured | all |
| DOC-OBS-12 | Defer a signal the stack cannot produce and record the precondition | SHOULD | measured | all |
| DOC-OBS-13 | Never fail a build on a page's last-updated date | SHOULD | measured | all |
| DOC-OBS-14 | Detect forked pages by paragraph hashing, never by banning repetition | SHOULD | measured | all |
| DOC-OBS-15 | Never ship a check in a "tracked, not built yet" state, and resolve every path it names | MUST | measured | all |
| DOC-OBS-16 | Ship a feedback widget only after a real traffic denominator exists | CONSIDER | codified | all |
| DOC-OBS-17 | Name a feedback signal's sink and that sink's own bias in the manifest | CONSIDER | measured | all |
| DOC-OBS-18 | Resolve every stable error identifier the project emits to a docs anchor | SHOULD | normative | reference, troubleshooting |
| DOC-OBS-19 | Surface a documentation link that arrives inside a dependency's error payload | SHOULD | measured | all |

---

### DOC-OBS-01 — The build fails on a broken link or anchor

**Rule.** Fail the docs build on a broken internal link or heading anchor,
checked against built output rather than against the raw markdown tree.

**Rationale.** A raw-tree scan misreads explicit heading anchors and
root-relative links, so it reports rot that does not exist.

**Verification.** One of two mechanisms must be present in CI. Either the
generator's own strict build (`mkdocs build --strict`, `mdbook-linkcheck`), or
`lychee --include-fragments <build-dir>` after the docs build, where
`<build-dir>` is `site/`, `.vitepress/dist/` or `book/`. Grep for either with
`grep -n 'mkdocs build --strict\|mdbook-linkcheck\|lychee.*--include-fragments'`
over the repo's taskfiles and workflows. Prove it once: break one anchor and one
root-relative link in a fixture, confirm a non-zero exit, revert.

**Severity.** MUST. **Evidence.** measured. `docs-shape.md` §5 measures 89% dead
falling to 2.9% (`docs-shape.md` §5 scan) once both traps are handled.
`wave2-calibration-a.md` §3 read all 9 CI configs: 7 of 9 already satisfy this
through `mkdocs build --strict`, and 2 of 9 (ocx, grimoire) have no gate at all.
0 false positives, because this is a config-presence check, not a text grep.
[lychee.cli.rs/recipes/anchors](https://lychee.cli.rs/recipes/anchors/) confirms
`--include-fragments`. **Applies to.** all. Absorbs DOC-TYPE-21, which is dropped.

### DOC-OBS-02 — A raw-markdown pass is configured or it is not run

**Rule.** Give any pre-build markdown link pass a source root and an exclusion
for every page whose anchors are generated at build time.

**Rationale.** Without both, the pass either floods the log with false
positives or silently checks nothing.

**Verification.** `lychee --offline --include-fragments --root-dir <site-src>
<docs-dir>` exits 0 on a clean tree. Every `--exclude-path` entry names a page
carrying an auto-generated header, checked with `grep -l 'Auto-generated'`. This
resolver also settles explicit ids, root-relative paths and build-time anchors
before any link is called dead.

**Severity.** MUST. **Evidence.** measured. `docs-shape.md` §5 traces 65 phantom
dead links (65, `docs-shape.md` §5 trace) to `ocx-sdk-python/docs/reference/api.md:1-4`,
a four-line mkdocstrings stub. `wave2-calibration-a.md` §3 measures 7 of 9 repos
running lychee against a raw tree with no `--root-dir`, and names
ocx-sdk-python's `--exclude-path tests/fixtures` as the near miss: right flag,
wrong path. **Applies to.** all. Absorbs DOC-NAV-08 and DOC-NAV-07's resolver
half, both dropped.

### DOC-OBS-03 — A trigger matrix maps code to the docs it invalidates

**Rule.** Keep a project-local table mapping each source-file glob to the doc
file and section that a change to it invalidates.

**Rationale.** Without an explicit map, code-to-doc drift is found only by
someone happening to reread the page.

**Verification.** `docs/.meta/trigger-matrix.md` exists and holds at least 3
non-header rows (3, asserted floor, one row per fleet trigger class in
`worker-doc-reviewer.md:15-28`). The shipped template stays portable: `grep -nE
'(crates|services|packages)/'` over the rule file must return zero hits.

**Severity.** SHOULD. **Evidence.** codified for presence.
`ocx/.claude/agents/worker-doc-reviewer.md:15-28` is the fleet's most systematic
mechanism (`config-inventory.md` axis 2). Measured greenfield:
`wave2-calibration-a.md` §3 finds 0 of 22 repos carrying the file, 0 false
positives on a presence check. **Applies to.** all.

### DOC-OBS-04 — General docs drift does not block a merge

**Rule.** Merge a change whose general documentation is behind, and open a
tracked issue for the gap in the same action.

**Rationale.** A uniform block stalls a fleet with no writer capacity, and then
gets bypassed.

**Verification.** The repo's docs policy states the non-blocking posture for
default-class pages. Each deferred drift finding carries an issue number in the
review output. An empty issue reference fails the check.

**Severity.** SHOULD, pinned by `docs-frame.md` orchestrator decision 4 pins the
adopter choice, so the row survives its normative-only evidence. **Evidence.**
normative.
[GitLab's documentation workflow](https://docs.gitlab.com/development/documentation/workflow/),
re-fetched 2026-09-05: "The documentation reviews must not be blockers", with a
required post-merge follow-up issue. Measured gap:
`wave2-calibration-a.md` §3 reads 14 docs-adjacent rule files and finds 0 stating
the non-blocking posture. The 3 "block" hits are a general review-severity word
and are false positives for this rule. **Applies to.** all.

### DOC-OBS-05 — Runbook drift blocks the merge

**Rule.** Fail the merge when a page declaring `doc_type: runbook` contains a
step that no longer resolves.

**Rationale.** A wrong runbook step costs incident minutes, and nothing else
pages anyone when it rots.

**Verification.** Classify with the declaration comment only. Run
`checks/doc-declaration.sh` and select the files declaring
`<!-- doc_type: runbook -->` in the first 12 lines. Never read a path. CI fails
only when a changed page inside that set carries an unresolved drift finding.

**Severity.** SHOULD, pinned. The pinned half is a project decision: retrofit the
declaration onto `creeptd-ng/docs/dev-infra/play-full.md` and `play-lan.md` at
rollout. **Evidence.** measured.
[ekline.io](https://ekline.io/blog/why-your-incident-runbook-lies-to-you-at-3-a-m-and-how-to-tell-before-the-page-fires)
gives 3 stale steps in 30 producing a ~10% error rate at 8 to 15 minutes per
wrong step (ekline.io cost model). `wave2-calibration-a.md` §3 measures the
wave-1 carrier at 0 of 248 pages matched, 0 false positives and 0 true positives,
which is why the carrier changed. **Applies to.** runbook.

### DOC-OBS-06 — Runbook steps name something checkable

**Rule.** Write every runbook step against a runnable command, a live URL or a
query, never a screenshot or a remembered value.

**Rationale.** A step tied to nothing live decays without any signal that it
decayed.

**Verification.** For each step heading on a page declaring
`doc_type: runbook`, assert the block below it contains a fenced block or an
`https?://` match. Exempt a non-routable example address (RFC 1918, RFC 5737)
from any liveness assertion, because creeptd-ng's two candidate pages cite
`192.168.1.42` as an illustrative address. A scheduled job that runs each command
and each URL is the stronger form and is not yet built.

**Severity.** SHOULD, demoted from MUST per the severity ledger. Its verification
was a scheduled job nobody had built, which is the state DOC-OBS-15 forbids. MUST
returns when that job ships and is priced. **Evidence.** measured. same
ekline.io cost model. `wave2-calibration-a.md` §3 could not run the check,
because 0 pages classify as runbook today, and spot-checked the two candidate
pages at 4 and 2 real fenced command blocks. **Applies to.** runbook.

### DOC-OBS-07 — Time to first working result is measured and dated

**Rule.** Measure by hand how long the quickstart takes to reach a working
result, and record the number with its measurement date.

**Rationale.** An unrecorded onboarding time cannot regress visibly, so a
broken step hides.

**Verification.** `docs/.meta/tthw.md` holds an integer and an ISO date. CI fails
when a page declaring `doc_type: landing` or `doc_type: tutorial` is in the
changed paths and that file is not.

**Severity.** SHOULD. **Evidence.** measured. Ably's five-band scale, under 30
minutes rating 5 of 5 (30 minutes, Ably's band 5 via
[Nordic APIs](https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/)),
and Twilio's 5-minute target on the same page. `wave2-calibration-a.md` §3
measures 22 of 22 repos and 39 of 39 candidate pages carrying no record, which is
a greenfield count rather than a false-positive rate. **Applies to.** landing,
tutorial.

### DOC-OBS-08 — No unmeasured metric, ever

**Rule.** Never publish a docs metric you did not measure, and state its
channel, its denominator and its date beside it.

**Rationale.** A plausible invented percentage reads as evidence and cannot be
corrected by a later reader.

**Verification.** `grep -nE '[0-9]+%|\b(most|nearly all|the majority of)
(users|readers|developers)\b'` over docs pages, after stripping fenced blocks and
table rows. Every surviving hit needs a denominator, a channel and a date in the
same paragraph, or it is deleted.

**Severity.** SHOULD, demoted from MUST. The measured false-positive rate is
unacceptable for a merge gate: 7 raw hits across 6 files over 186 pages, of which
5 of 7 are false positives (71%, `wave2-severity-ledger.md` §4). The strip-fences
and strip-tables clause is the fix for the two named false-positive classes, a
benchmark table and a changelog entry. MUST returns when the tightened pattern is
re-measured. **Evidence.** codified. Mintlify's shipped feedback surface defines
the reporting shape ([mintlify.com/docs/optimize/feedback](https://mintlify.com/docs/optimize/feedback));
[the survivorship-bias essay](https://dev.to/ben/the-developer-feedback-you-are-actually-getting-is-survivorship-bias-4b54)
defines why the denominator is mandatory. **Applies to.** all.

### DOC-OBS-09 — Every docs change states what it removed

**Rule.** State in every documentation change what was removed, or state
explicitly that nothing was removed.

**Rationale.** Unreviewed growth reads as improvement while it buries the pages
that already worked.

**Verification.** The PR template carries `Added:` and `Removed:` keys. CI greps
the PR body and fails when either key is missing or empty. The literal value
`none` passes. DOC-PLAIN-22's `AI assistance:` key sits beside these two and is
checked by that rule, not this one.

**Severity.** SHOULD. **Evidence.** measured. DORA 2024 pairs a 7.5%
documentation-quality gain with a 7.2% stability drop and a 1.5% throughput drop
at a 25% AI-adoption increase
([Swimm's summary](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation)).
`wave2-calibration-a.md` §3 measures 22 of 22 repos failing this today, 21 with
no PR template at all. **Applies to.** all.

### DOC-OBS-10 — One manifest holds every signal's state

**Rule.** Record every observability signal in one file with three fields:
status, review trigger, and bias disclosure.

**Rationale.** A signal that exists but has no recorded review is
indistinguishable from one nobody ever read.

**Verification.** A parser over `docs/.meta/observability.md` fails when a signal
with status `instrumented` has no `last_reviewed` date. The review trigger is a
count or a release boundary, never a bare cadence word, per DOC-NAV-15.

**Severity.** SHOULD, pinned, promoted from CONSIDER per the severity ledger.
DOC-OBS-12, DOC-OBS-16, DOC-OBS-17 and DOC-NAV-14 are all unimplementable without
this file, and a CONSIDER cannot carry three SHOULDs. Pinned because the file
shape is this program's own decision. **Evidence.** asserted. no source ships
this file shape. Mintlify's Pending, In Progress, Resolved, Dismissed workflow is
the hosted analogue. **Applies to.** all.

### DOC-OBS-11 — A docs issue template exists and is triaged

**Rule.** Ship an issue template that pre-applies a docs label, and name the
trigger on which that label is triaged.

**Rationale.** Without a labelled landing place, a deferred docs fix silently
becomes no fix.

**Verification.** An issue template under `.github/ISSUE_TEMPLATE/` (or the forge
equivalent) whose `labels:` list contains `docs`. The trigger line names an
existing release or iteration boundary, or a count of open docs issues. A bare
cadence word fails, per DOC-NAV-15.

**Severity.** SHOULD. **Evidence.** measured.
`wave2-calibration-a.md` §3 measures 22 of 22 repos failing, with 19 having no
issue-template directory at all and 3 having templates with no `docs` label. 39%
of surveyed docs teams track nothing at all (39%,
[State of Docs 2025](https://www.stateofdocs.com/2025/documentation-metrics-and-measurement),
re-fetched 2026-09-05). **Applies to.** all.

### DOC-OBS-12 — Defer a blocked signal with its precondition named

**Rule.** Defer any signal the current stack cannot produce, and record the
exact precondition that would unblock it.

**Rationale.** A requirement no repo can satisfy trains readers to ignore the
whole rule set.

**Verification.** unverified: reading heuristic, for the judgement of whether a
precondition is genuine. A reviewer checks that the manifest entry for a deferred
signal names a checkable precondition, and checks the precondition rather than
the missing log. The worked example is agent-versus-human traffic share, whose
precondition is a stated, checkable consumer question in the PR description.
Zero-result search is no longer an example here, because its sink is priced and
DOC-NAV-10 requires it.

**Severity.** SHOULD, capped by the reading heuristic. **Evidence.** measured.
`reader-signals-and-zero-result-sink.md` §2 prices three sink shapes at $0 to $20
a month and clears the wave-1 precondition. `minimum-instrumentation-set.md` NG8
and that file's §6 both find agent-traffic share still blocked on this fleet's
static hosting. **Applies to.** all.

### DOC-OBS-13 — A date stamp is informational, never a gate

**Rule.** Never fail a docs build because a page's last-updated date is old.

**Rationale.** No validated review interval exists, so a clock gate fails on a
number nobody can defend.

**Verification.** `grep -rniE 'days_since|stale_after|max_age'` over the docs CI
config returns zero hits. The second wave-1 grep is deleted, because DOC-AGENT-12
already owns "a number names its source".

**Severity.** SHOULD. **Evidence.** measured. the fleet's 3 last-updated stamps
travel with one richer mkdocs template rather than any freshness decision
(`ux-observability-posture.md` §6), and the one numeric staleness model found is
runbook-specific. `wave2-calibration-a.md` §3 runs the surviving grep over 22
repos' CI configs and returns 0 hits, 0 false positives. **Applies to.** all.

### DOC-OBS-14 — Fork detection at file level, not sentence level

**Rule.** Detect duplicated documentation by hashing normalized paragraphs
across files, and never ban repetition sentence by sentence.

**Rationale.** Two independently edited files claiming the same subject drift
apart, while a restated default value on two pages helps the reader.

**Verification.** A script lowercases and whitespace-collapses each paragraph,
hashes it per file, and flags any file pair sharing 3 or more identical
paragraphs of 40 or more words (3 paragraphs of 40 words, invented default,
calibrated at 3 hits and 0 false positives over 248 pages,
`wave2-calibration-a.md` §3).

**Severity.** SHOULD. **Evidence.** measured. the detector reproduces the known
`ocx` against `ocx-save` `faq.md` duplication from independent evidence, which is
a strong correctness signal. 3 file pairs found over 248 pages, 0 of 3 false
positives. [Write the Docs](https://www.writethedocs.org/guide/writing/docs-principles/),
re-fetched 2026-09-05, scopes ARID to content and Unique to sources.
**Applies to.** all.

### DOC-OBS-15 — No inert check ships as coverage

**Rule.** Never ship a check that is written down but not wired up, and resolve
on disk every file path a verification names.

**Rationale.** A stated gate that runs nothing reads as coverage and hides the
gap it claims to close.

**Verification.** Two checks, both before the rule set is declared normative.
First, `grep -rniE 'tracked, not built|future gate|not implemented yet|(gate|check).{0,15}TODO|TODO.{0,15}(gate|check)'`
over the adopted rule files and the docs CI config returns zero hits. Second,
`grep -oE 'checks/[a-z_.-]+' rules/*.md | cut -d: -f2 | sort -u | while read p;
do test -f "$p" || echo "MISSING $p"; done` prints nothing.

**Severity.** MUST, promoted from SHOULD per the severity ledger. DOC-PLAIN-17
and DOC-AGENT-16 both ship at MUST and both depend on this rule's guarantee. A
SHOULD cannot carry two MUSTs. **Evidence.** measured.
`creeptd-ng/.claude/rules/doc-sync.md:38,41` names two gates in exactly this
state. `wave2-severity-ledger.md` §3 measures 0 of 7 named check scripts existing
on disk and no `checks/` directory anywhere, which puts 17 rules in the forbidden
state. `wave2-calibration-a.md` §3 measures the wave-1 grep at 5 hits over 14
rule files with 3 of 5 false positives (60%), all from a bare `TODO` arm matching
a rule file quoting `TODO: document` as an anti-pattern. The narrowed pattern
above drops those 3 and keeps creeptd-ng's 2 true positives. **Applies to.** all.

### DOC-OBS-16 — A feedback widget needs a denominator first

**Rule.** Ship a per-page feedback widget only after the repo already reports a
real, nonzero traffic number for 30 consecutive days.

**Rationale.** A helpfulness percentage with no traffic denominator is the
unmeasured metric DOC-OBS-08 already forbids.

**Verification.** The manifest names a custom-event-capable page-analytics signal
reporting nonzero for 30 days (30 days, asserted default). Plausible, Umami and
Fathom qualify. GoatCounter and Cloudflare Web Analytics do not, because neither
carries a named event with properties. A repo with no generator and no site names
`gh api repos/<owner>/<repo>/traffic/views` instead, and that call must return
200.

**Severity.** CONSIDER, capped because the 30-day threshold is argued and no
source supplies it. **Evidence.** codified.
`minimum-instrumentation-set.md` NG5 carries the disclosure duty this restores.
Measured for the vendor split and the fallback:
`reader-signals-and-zero-result-sink.md` §6 compares four vendors at their own
pricing and docs pages, and §7 calls the GitHub Traffic API live against this
program's own repository. **Applies to.** all.

### DOC-OBS-17 — Name the feedback sink and its own bias

**Rule.** Name a feedback signal's sink and that sink's own selection bias in the
same manifest entry, beside any percentage it produces.

**Rationale.** A sink that asks the reader to authenticate filters the count a
second time, on top of ordinary survivorship bias.

**Verification.** The manifest entry for a `feedback` signal names its sink
mechanism, which is giscus, a serverless `createDiscussion` call, or a vendor
custom event. When the sink requires reader authentication, the entry says so
beside the percentage.

**Severity.** CONSIDER, following DOC-OBS-16, because it only ever fires
alongside that deferred rule. **Evidence.** measured. giscus's own site states
that "visitors must authorize the giscus app to post on their behalf using the
GitHub OAuth flow" ([giscus.app](https://giscus.app/)). GitHub's
`createDiscussion` mutation was confirmed live against GitHub's own GraphQL
schema, and needs no reader account. **Applies to.** all.

### DOC-OBS-18 — Every error identifier resolves to a docs anchor

**Rule.** When a project's own code emits a stable, documented error identifier,
that identifier must resolve to a docs anchor a checker can confirm exists.

**Rationale.** An identifier with no page sends the reader to a search engine
instead of a jump. Skip this rule when the project's errors carry only free-text
messages.

**Verification.** Grep the error-defining source for its identifier pattern, such
as an exit-code enum or a set of named error classes. Diff that list against the
anchor set DOC-OBS-02's resolver already produces. Both differences must be
empty. Reuse that resolver. Do not build a second checker.

**Severity.** SHOULD. The scheme is proven cheap to author. The check is new work
in every repo. **Evidence.** normative, for the pattern. Rust's error index,
Node's `errors.html` anchors and mypy's default-on bracketed codes, all fetched
2026-09-05. Measured for the fleet cost.
`ocx/website/src/docs/reference/command-line.md:311-324` and
`ocx/crates/ocx_lib/src/cli/exit_code.rs:20-93` carry the same 14 identifiers and
agree today with no test binding them. **Applies to.** reference,
troubleshooting.

### DOC-OBS-19 — Do not bury a link a dependency handed you

**Rule.** When error-handling code receives a docs link inside a dependency's own
error payload, surface that link. Never fold it into an opaque dump of the raw
body.

**Rationale.** That link is the one part of the payload built to answer the
reader's next question.

**Verification.** unverified: reading heuristic. A reviewer opens the function
consuming an external API's error body and checks whether a link-shaped field,
such as `documentation_url` or `help_url`, is read out and shown separately
rather than passed through inside the whole body.

**Severity.** SHOULD, capped by the reading heuristic. **Evidence.** measured, for
the gap. `grimoire/src/catalog/forge.rs:1577-1589` formats the whole JSON body
into one string, and its test at `forge.rs:2345` asserts only that `message`
surfaces. Argued for the remedy, because no source states a general rule.
**Applies to.** all.

## Applied to the fleet

Counts below come from `wave2-calibration-a.md` §3, run over the 248-page fleet
corpus, 22 repos and the 9 real CI configs.

### Already satisfied

| Rule | Where | Evidence |
|---|---|---|
| DOC-OBS-01 | 7 of 9 sites | The 6 MkDocs Material sites plus `ocx-mirror-sdk` run `mkdocs build --strict`, which fails the build on a broken internal link or anchor. Satisfied through the generator, not through lychee. |
| DOC-OBS-13 | 22 of 22 repos | `run_obs13_ci()` returns 0 hits for `days_since`, `stale_after` or `max_age` across every CI config. Satisfied by inaction, not by decision. |
| DOC-OBS-03, partly | `ocx` | `worker-doc-reviewer.md:15-28` is a real four-column trigger matrix. Every row is an ocx path, so the mechanism transfers and the content does not. |

### Violated

| Rule | Where | Evidence |
|---|---|---|
| DOC-OBS-01 | `ocx`, `grimoire` | 2 of 9. No build-time link or anchor gate of any kind. ocx also carries the fleet's only real rot: 68 dead internal links, including `command-line.md:361` pointing at an anchor that lives in the linking file. |
| DOC-OBS-02 | 7 of 9 sites running lychee | All run against a raw tree with no `--root-dir` and no generated-anchor exclusion. `ocx-sdk-python` has `--exclude-path tests/fixtures`, which is the right flag on the wrong path, and misses the mkdocstrings stub that produces the 65 phantom failures. |
| DOC-OBS-03 | 22 of 22 repos | 0 carry `docs/.meta/trigger-matrix.md`. Greenfield fleet-wide. |
| DOC-OBS-04 | 14 of 14 rule files | 0 state the non-blocking posture. 3 state a blocking posture as a general review-severity word, and only `creeptd-ng` genuinely blocks docs drift. |
| DOC-OBS-05 | 248 of 248 pages | 0 pages classify as a runbook under either wave-1 carrier, including `creeptd-ng/docs/dev-infra/play-full.md` and `play-lan.md`, the rule's own evidence. The declaration comment must be retrofitted at rollout. |
| DOC-OBS-06 | `creeptd-ng` | Cannot fire today, because 0 pages classify. Its 2 candidate pages carry 4 and 2 real fenced command blocks, so the check is meaningful once classification is fixed. |
| DOC-OBS-07 | 22 of 22 repos, 39 of 39 pages | No TTHW record anywhere. ocx has the fleet's best onboarding number and writes it nowhere. |
| DOC-OBS-08 | 6 of 186 pages | 7 raw hits, 5 of them false positives from benchmark tables and changelog entries. The gap is the check, not the corpus. |
| DOC-OBS-09 | 22 of 22 repos | 21 have no PR template. `vscode-ocx` has one without the required keys. |
| DOC-OBS-11 | 22 of 22 repos | 19 have no issue-template directory. `grimoire`, `ocx` and `vscode-ocx` have templates with no `docs` label. |
| DOC-OBS-14 | 3 file pairs of 248 pages | `ocx-save` against `ocx` for `faq.md` and `environment.md`, plus `kate-middlechild`'s own hand-forked design notes. All 3 are true positives. |
| DOC-OBS-15 | 17 rules, 0 of 7 scripts | No `checks/` directory exists anywhere on disk. `creeptd-ng/doc-sync.md:38,41` names two gates as "Future gate (tracked, not built yet)". |
| DOC-OBS-18 | `ocx` | The exit-code table and the `ExitCode` enum carry the same 14 identifiers and agree today, with no test holding them together. |
| DOC-OBS-19 | `grimoire` | `src/catalog/forge.rs:1577-1589` folds a GitHub error body's `documentation_url` into one format string. The link survives in the bytes and is absent from the signal. |

### New commitments

DOC-OBS-10, DOC-OBS-12, DOC-OBS-16 and DOC-OBS-17 have no fleet instance to
satisfy or violate, because 0 of 22 repos publish any docs metric at all. The
nearest precedent is a warning rather than a model:
`ocx-save/website/src/index.md:26-39` shipped three literal Lorem Ipsum tiles
into a published site. Unmeasured placeholder content already reaches production
here.

## AI-agent failure modes

Ranked by how often the sub-artifacts and the audits saw it, not by severity.

1. **Ships a checker that checks nothing.** Configures lychee against raw
   markdown with no `--root-dir` and no `--include-fragments`, sees zero issues,
   and reports link checking as done. Caught by DOC-OBS-01 and DOC-OBS-02.
2. **Invents a plausible number.** Writes "94% of readers found this helpful"
   because it reads as normal prose in the genre. Caught by DOC-OBS-08.
3. **Invents a freshness interval.** Reaches for "review every 90 days" because a
   number pattern-matches a professional policy. Caught by DOC-OBS-13 and
   DOC-AGENT-12.
4. **Adds volume and calls it improvement.** Adds pages and never removes one,
   reproducing the measured DORA effect. Caught by DOC-OBS-09.
5. **Copies the strictest fleet policy everywhere.** Lifts creeptd-ng's hard
   Block onto a 248-page general surface. Caught by DOC-OBS-04 and DOC-OBS-05.
6. **Adds infrastructure nobody asked for.** Reaches for a hosted search swap or
   an agent-analytics product on static hosting. Caught by DOC-OBS-12.
7. **Fabricates the onboarding time.** Estimates "about five minutes" without
   running the quickstart. Caught by DOC-OBS-07's required date.
8. **Writes a cadence with nothing behind it.** States "reviewed weekly" and
   wires nothing that notices a week passing. Caught by DOC-OBS-10 and
   DOC-NAV-15.
9. **Treats silence as success.** Reports no open issues as evidence the docs
   work. Caught by DOC-OBS-08 and DOC-OBS-11.
10. **Bans repetition in the name of DRY.** Refuses to restate a default value
    because DRY is the more famous slogan than ARID. Caught by DOC-OBS-14.
11. **Leaks fleet paths into a portable template.** Fills the trigger matrix with
    the `crates/ocx_cli/...` rows it just read. Caught by DOC-OBS-03's
    portability grep.
12. **Writes a gate and never wires it.** Caught by DOC-OBS-15.
13. **Names a check script it never wrote.** Writes a verification cell that
    reads as if `checks/foo.py` exists. This is the dominant wave-2 failure, at
    17 rules and 7 phantom files. Caught by DOC-OBS-15's path-resolves clause.
14. **Classifies by path because the path looks right.** Reaches for
    `docs/runbooks/**` rather than a declaration, and the check then matches
    nothing. Caught by DOC-OBS-05's declaration-only carrier and DOC-TYPE-02.
15. **Adds a feedback widget to a page with no measured visits.** Reaches for the
    widget because it is the most visible ask. Caught by DOC-OBS-16.
16. **Picks the best-known feedback sink without reading its filter.** Chooses
    giscus, which gates every vote behind a GitHub OAuth step. Caught by
    DOC-OBS-17.
17. **Buries a link a dependency already handed it.** Dumps the whole error body
    into one string, then writes new prose next to it. Caught by DOC-OBS-19.
18. **Writes prose where a link belongs.** Makes errors "more helpful" by adding
    a sentence rather than an anchor, because prose needs no anchor to exist
    first. Caught by DOC-OBS-18.

## Open questions

### Needs a human decision

1. **Does default-class documentation drift block a merge in this fleet?**
   DOC-OBS-04 ships non-blocking with a tracked issue, following GitLab. The
   owner picks whether the fleet takes that default or the stricter posture, per
   `docs-frame.md` orchestrator decision 4. Runbook-class blocking is decided.
2. **Does the shipped rule supersede `ocx/.claude/rules/docs-style.md` and
   grimoire's fork?** DOC-OBS-14 names the fork as a live violation and this
   artifact is its fix. Adopting the fix is a migration only the owner can
   authorise.
3. **Is a `docs`-labelled issue template acceptable in all 22 repos?** 19 have no
   `.github/ISSUE_TEMPLATE/` directory at all, so DOC-OBS-11 creates one where
   none exists.
4. **Which release or iteration boundary anchors triage?** DOC-NAV-15 bans a bare
   cadence word, so DOC-OBS-11's trigger must name a real boundary or a count.
   The fleet does not state one anywhere. The owner names it.

### Deserves another research round

- **tthw-from-the-existing-harness** — can ocx's 66 executed doc scripts emit the
  time-to-first-result number as a byproduct instead of a hand measurement?
  `tested-examples-mechanism.md` §3 shows the harness already runs them under
  pytest with per-case timing available. If yes, DOC-OBS-07 becomes measured
  rather than hand-recorded.
- **runbook-step-harness-price** — DOC-OBS-06 now ships a greppable floor at
  SHOULD. Price the scheduled command-and-URL job before restoring MUST. Two
  creeptd-ng pages are the pilot.
- **fabrication-grep-retighten** — DOC-OBS-08's tightened pattern strips fenced
  blocks and table rows and has not been re-run. Re-measure over the same 186
  pages. Under a 20% false-positive rate restores MUST.
- **umami-cloud-pricing** — the vendor's own pricing page did not render to a
  fetch, so the hosted-tier numbers behind DOC-OBS-16's vendor list are
  second-hand. Re-confirm before any shipped rule cites a figure.
- **ga4-debugview-last-mile** — the GA4 non-satisfier rests on two vendors' own
  stated mechanisms and no live session. A ten-minute DebugView check closes it.

## Revision log

- **Wave 2, DOC-OBS-01, verification widened.** Accepts a generator's own strict
  build alongside `lychee --include-fragments`. Reason:
  `wave2-calibration-a.md` §3 measured 7 of 9 repos satisfying the intent through
  `mkdocs build --strict`, which the literal wave-1 text would have failed.
- **DOC-OBS-01 and DOC-OBS-02, ownership recorded.** They absorb DOC-TYPE-21,
  DOC-NAV-08 and DOC-NAV-07's resolver half, per the ledger's overlap 1.
- **DOC-OBS-05 and DOC-OBS-06, carrier replaced.** Both now classify on
  `<!-- doc_type: runbook -->` only. The `type: runbook` frontmatter is
  disqualified by the declaration-key decision, and the `docs/runbooks/**` glob
  is deleted for violating DOC-TYPE-02 and matching 0 paths.
- **DOC-OBS-05, severity now SHOULD, pinned.** The pin is the rollout decision to
  retrofit the declaration onto creeptd-ng's two pages, without which the rule is
  permanently inert.
- **DOC-OBS-06, MUST to SHOULD, verification replaced.** Reason: the ledger's
  gate G5. Its scheduled job does not exist, which DOC-OBS-15 forbids. It now
  ships a greppable per-step floor, plus an exemption for non-routable example
  addresses that would otherwise fail forever.
- **DOC-OBS-08, MUST to SHOULD, pattern tightened.** Reason: a measured 5 of 7
  false positives over 186 pages. The pattern now strips fenced blocks and table
  rows, the two named false-positive classes.
- **DOC-OBS-10, CONSIDER to SHOULD, pinned.** Reason: three SHOULD rules depend
  on this manifest. Its `last_reviewed` cadence became a review trigger, per
  DOC-NAV-15's cadence-word ban.
- **DOC-OBS-11, cadence line reworded.** Names a release boundary or a count
  instead of a bare cadence word, per DOC-NAV-15.
- **DOC-OBS-12, narrowed.** Keeps the deferral mechanism, loses zero-result
  search as its worked example, gains agent-versus-human traffic share. Reason:
  `reader-signals-and-zero-result-sink.md` §2 prices the sink and clears the
  precondition. DOC-NAV-10 owns the requirement, because it owns the beacon's
  lifecycle. This CONTRADICTS the wave-1 Verdict's refusal, and that text is
  replaced rather than kept beside it.
- **DOC-OBS-13, second grep deleted.** DOC-AGENT-12 owns "a number names its
  source", per the ledger.
- **DOC-OBS-14, threshold labelled and calibrated.** The 3-paragraph, 40-word
  threshold stays invented, and now carries its measured rate: 3 hits, 0 false
  positives over 248 pages.
- **DOC-OBS-15, SHOULD to MUST, two changes.** Promoted because DOC-PLAIN-17 and
  DOC-AGENT-16 both depend on it at MUST. Gains the clause that every path a
  verification names must resolve on disk, which catches 17 rules and 7 phantom
  files in one line. Its bare `TODO` arm narrows to a `gate` or `check` context,
  which drops the measured 3 of 5 false positives.
- **NEW DOC-OBS-16, feedback widget deferred until a denominator exists.**
  CONSIDER. Restores `minimum-instrumentation-set.md` NG5, which wave 1 dropped
  entirely, and gives it the precondition it lacked.
- **NEW DOC-OBS-17, name the feedback sink and its bias.** CONSIDER. Measured on
  giscus's own OAuth requirement against GitHub's `createDiscussion` mutation.
- **NEW DOC-OBS-18, error identifiers resolve to docs anchors.** SHOULD. Reuses
  DOC-OBS-02's resolver rather than adding a second checker.
- **NEW DOC-OBS-19, surface a dependency's documentation link.** SHOULD, carries
  the reading-heuristic marker.
- **Merged the reader-signals dive's candidate 6 into DOC-OBS-16.** It named the
  same precondition DOC-OBS-16 already carries, so a separate ID would have
  duplicated one obligation across two rows.
- **Renumbered the error-message dive's two candidates.** Both dives proposed
  DOC-OBS-16 and DOC-OBS-17 independently. Reader signals kept those numbers, and
  the error-message rules became DOC-OBS-18 and DOC-OBS-19.
- **Applies-to cells now name enum values.** `troubleshooting` became `runbook`
  on DOC-OBS-05 and DOC-OBS-06, per the nine-value type enum.
- **Ledger disagreement recorded.** `wave2-calibration-a.md` §3 skips DOC-OBS-10
  as "already resolved to drop, folded into DOC-OBS-12". The ledger says the
  opposite, promoting it to SHOULD, pinned, because DOC-OBS-12 cannot be
  implemented without the manifest. The ledger is followed.
- **Numbers now carry a parenthesised source on the row**, per DOC-AGENT-12's
  fixed shape.
- **Verdict rewritten** for the link-check finding, the runbook carrier gap, the
  cleared zero-result precondition, the adopted AI-disclosure shape, and four
  documented gaps.
- **Open questions.** Removed `zero-result-unblock-cost`,
  `fabrication-grep-false-positive-rate` and `fork-detector-threshold`, all
  answered. `runbook-step-harness-cost` became `runbook-step-harness-price`,
  because the demotion answered the shipping question and left the pricing one.

## Sub-artifacts

- [minimum-instrumentation-set.md](docs-observability/minimum-instrumentation-set.md)
  — what a docs site with zero measurement instruments first, ranked by cost, and
  how "instrumented" is checked separately from "reviewed". Wave 1.
- [staleness-and-drift-gates.md](docs-observability/staleness-and-drift-gates.md)
  — link-check configuration with both measured traps, the portable trigger
  matrix, the blocking policy split, ARID against Unique, and why no freshness
  SLO ships. Wave 1.
- [reader-signals-and-zero-result-sink.md](docs-observability/reader-signals-and-zero-result-sink.md)
  — prices three zero-result sinks, settles the DOC-NAV-10 against DOC-OBS-12
  ownership conflict, compares four analytics vendors, and restores the
  feedback-widget rule with a checkable precondition. Wave 2.
- [error-message-links-and-ai-authoring-policy.md](docs-observability/error-message-links-and-ai-authoring-policy.md)
  — four error-to-docs link shapes, the fleet's two unwired instances, three real
  2026 AI-authoring policies, and the site-component portability table. Wave 2.

## Key sources

| URL | Why it is here |
|---|---|
| [dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/) | The axis this group grades: clarity, findability, reliability. Re-fetched 2026-09-05. |
| [Swimm on the 2024 DORA report](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation) | The only source carrying the +25% / +7.5% / −7.2% / −1.5% AI-adoption figures behind DOC-OBS-09. |
| [GitLab documentation workflow](https://docs.gitlab.com/development/documentation/workflow/) | "The documentation reviews must not be blockers", plus the post-merge follow-up issue. DOC-OBS-04. |
| [ekline.io — why your incident runbook lies to you at 3 a.m.](https://ekline.io/blog/why-your-incident-runbook-lies-to-you-at-3-a-m-and-how-to-tell-before-the-page-fires) | The only numeric staleness cost model found anywhere. DOC-OBS-05 and DOC-OBS-06. |
| [Write the Docs — documentation principles](https://www.writethedocs.org/guide/writing/docs-principles/) | Exact wording of ARID and Unique, which resolves the map's conflict as a scope confusion. |
| [lychee.cli.rs/recipes/anchors](https://lychee.cli.rs/recipes/anchors/) | `--include-fragments`, and the stated absence of any exclusion for generated anchors. |
| [lychee.cli.rs/overview](https://lychee.cli.rs/overview/) | `--root-dir` and `--base-url`, the raw-source configuration DOC-OBS-02 requires. |
| [Nordic APIs — why time to first call is a vital API metric](https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/) | Ably's five-band scale and Twilio's 5-minute target. DOC-OBS-07. |
| [State of Docs 2025 — metrics and measurement](https://www.stateofdocs.com/2025/documentation-metrics-and-measurement) | 39% track nothing, and over a third never measure onboarding separately. |
| [Mintlify — feedback](https://mintlify.com/docs/optimize/feedback) | The productized instrumentation shape, and its plan and telemetry preconditions. |
| [dev.to — developer feedback is survivorship bias](https://dev.to/ben/the-developer-feedback-you-are-actually-getting-is-survivorship-bias-4b54) | Why DOC-OBS-08 requires a denominator and a channel, not just a number. |
| [developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/) | The free-tier figures that clear DOC-OBS-12's wave-1 zero-result precondition. |
| [giscus.app](https://giscus.app/) | The reader-facing OAuth requirement behind DOC-OBS-17's bias disclosure. |
| [docs.github.com — repository traffic](https://docs.github.com/en/rest/metrics/traffic) | The zero-backend fallback signal DOC-OBS-16 accepts for a generator-less repo. |
| [doc.rust-lang.org/error_codes/error-index.html](https://doc.rust-lang.org/error_codes/error-index.html) | The numeric-code-to-static-URL shape behind DOC-OBS-18. |
| [nodejs.org/api/errors.html](https://nodejs.org/api/errors.html) | The string-code-plus-anchor shape, and the code-over-message discipline. DOC-OBS-18. |
| [docs.github.com — troubleshooting the REST API](https://docs.github.com/en/rest/overview/troubleshooting-the-rest-api) | GitHub's own statement of the link-inside-the-error intent. DOC-OBS-19. |
| [kubernetes.io — open source maintainership in the age of AI](https://kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai/) | The adopted AI-disclosure shape, which ships as DOC-PLAIN-22 beside DOC-OBS-09. |
| [HN 13702628 — bad documentation](https://news.ycombinator.com/item?id=13702628) | "Looks professional and complete and lies through its teeth", the reason DOC-OBS-13 and DOC-OBS-15 exist. |
| [HN 25422756 — the worst documentation I have ever seen](https://news.ycombinator.com/item?id=25422756) | Readers asking for CI-tested docs, not better prose. The ordering argument for this whole group. |
