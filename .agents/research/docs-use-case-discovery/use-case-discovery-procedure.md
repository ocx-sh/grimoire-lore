---
title: "Use-case discovery at zero users: the procedure"
topic: use-case-discovery-procedure
group: docs-use-case-discovery
agent: research-lang-scout
model: sonnet
date_researched: 2026-09-05
sources_count: 14
scope: |
  Covers: how a project with no users and no analytics builds its own ranked
  task list, turns each task into a falsifiable user need, runs the one
  discovery method an unaided agent can execute (the friction log), ranks
  without a voter pool, and turns the result into a coverage table plus a
  delete list, with a schema and a cadence.
  Does not cover: tier names or tier-to-type mapping (tier-model-and-first-
  steps-contract), page-type declaration (page-type-set-and-declaration), or
  nav/IA placement (docs-navigation-search). This procedure's output is one
  user need plus one coverage verdict per task — not a shipped page.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The native top-tasks pipeline, and why it does not fit here](#1-the-native-top-tasks-pipeline-and-why-it-does-not-fit-here)
  2. [The sizing problem, resolved](#2-the-sizing-problem-resolved)
  3. [Candidate-task sources: surface over sampled traffic](#3-candidate-task-sources-surface-over-sampled-traffic)
  4. [The friction log: the one method an unaided agent can run](#4-the-friction-log-the-one-method-an-unaided-agent-can-run)
  5. [The user-need statement and its falsifiable test](#5-the-user-need-statement-and-its-falsifiable-test)
  6. [Ranking without a voter pool](#6-ranking-without-a-voter-pool)
  7. [The artifact: schema, coverage table, delete list](#7-the-artifact-schema-coverage-table-delete-list)
  8. [Cadence and ownership](#8-cadence-and-ownership)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- The canonical top-tasks pipeline needs a longlist of 200-400 tasks, a shortlist group of 3-8 people running 5-8 sessions, and 100+ survey voters over roughly 12 weeks ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)) — none of that exists for a project with no users, and pretending it does produces fabricated numbers.
- Top-task rankings stabilize fast: the European Commission's 107,000-voter, 77-task survey had the same top three tasks after 30 votes as after all 107,000 ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)) — the lesson to keep is "cheap to get directionally right," not "you need thousands of respondents."
- Nielsen's discount-usability logic gives the zero-user analogue: one reviewer finds ~31% of problems, five finds most of the rest, and beyond that you are "wasting your time" — the fix for a small budget is 2-3 waves of 5, not one giant study ([NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)).
- Never source the candidate-task longlist from existing docs page titles. GOV.UK calls that failure mode a need that "creates a 'need' to justify existing content" ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)) — source it from the CLI/API surface, README headings, issue and PR titles, and changelog entries instead.
- The one top-tasks-family method an agent can execute completely unaided, with no voters and no users, is the friction log: attempt the task in a named, first-time persona and write it up in three sections — Context, Pros and cons, Detailed stream of consciousness — exactly as Stripe runs it internally ([Stripe friction-logging toolkit](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md)).
- Every shortlisted task gets exactly one user-need sentence in GOV.UK's template — "As a [who], I need to [do], so that [why]" — and it fails if the "I need to" clause names a specific tool, page, or command instead of an outcome ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)).
- With no vote count and no analytics, rank tasks by whichever real signal exists, in this order: issue/PR title frequency, then CLI/API invocation telemetry (if it exists), then search zero-result logs (if they exist), then friction-log severity. A project with none of the first three — this fleet has none of them ([config-inventory.md](../docs-audit/config-inventory.md)) — ranks by friction-log severity alone, and says so in the artifact rather than inventing a percentage.
- The candidate-task list must be exhaustive over the code surface (every CLI subcommand or exported API entry point appears, even if immediately triaged out), because a zero-user project has no traffic to sample from and completeness over the surface is the only honest substitute.
- A page goes on the delete list only when two independent structural signals agree: no surviving user need maps to it, AND it is a stub by the fleet's own measured definition (under 150 prose words) or a near-duplicate of a covered page ([docs-shape.md](../docs-audit/docs-shape.md) measures 24.6% of 248 fleet pages as stubs by this definition already). A single signal is not enough license, because Liverpool's 80%-of-4,000-pages deletion had real traffic data behind it and this fleet does not ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)).
- The procedure produces exactly one durable artifact — a task inventory file with a fixed schema (id, task, signal, friction-log path, user need, solution-shaped flag, existing-page status, action) — not conversational output, because the whole point is a coding-agent-run process with no human reviewing chat logs.
- Re-run the procedure on every minor version bump or feature merge (event-triggered, because there is no traffic curve to watch drift on) plus a cheap quarterly grep-only audit that recomputes stub rate and orphan count without a new friction-log wave.
- Friction-log templates disagree on shape: Stripe's persona/experience-first three-section log names no fix, while a common product-triage template bundles in a "proposed solution" field ([Chameleon](https://www.chameleon.io/blog/friction-logs)). Use Stripe's shape for discovery — naming a fix early repeats exactly the "suggests a specific solution" failure GOV.UK warns against.
- The friction log's persona must be a concrete, unprivileged first-time user ("a Python developer who has never run this CLI, following only the README"), not "the developer" or "a user" — an agent grading its own homework as an unspecified persona already knows the answer.
- The Task Performance Indicator (success rate plus time-on-task, per McGovern's own framing) does not transfer to a zero-user project — there is no install base to measure success rate or time-on-task against — treat it as a future check to wire up once real telemetry exists, not as something this procedure computes today.
- `gerrymcgovern.com` returns HTTP 403 to an automated fetch on every path tried, twice, as of 2026-09-05; the primary account of his own method has to come from the Smashing Magazine long-form piece and a digital.gov session description instead.
- No source anywhere states a repeatable top-tasks or JTBD method built for a project with a code surface but no measurable customer — the absence itself is the finding, and this procedure is the substitute, not a rediscovery of an existing one.

## Findings

### 1. The native top-tasks pipeline, and why it does not fit here

Gerry McGovern's top-tasks method, as laid out in the fullest fetched primary
account, runs in three phases. **Longlisting**: pull 200-400 candidate tasks
(into the thousands for a body the size of the European Commission) from
existing content, top-50 search and page lists, 2-3 years of surveys, and
support tickets. **Shortlisting**: a group of 3-8 people from Support,
Marketing, Sales, Product, Web, and IT meets for 5-8 sessions of 90 minutes
over 2-4 weeks to cut the longlist to 50-80 tasks, presented as "one single
list... randomly presented" so no department's tasks get grouped and biased.
**Voting**: a survey asks people to pick their top 5 (or top 3, below ~30
items) from the shortlist; McGovern wants 400+ respondents for statistical
reliability and states a floor of 100. A full cycle runs about 12 weeks
([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)).

Jeff Sauro's independent account of the same family of method gives the
companion numbers on the voting side: to hit a 7% margin of error at 90%
confidence you plan for roughly 136 participants, and the resulting
task-share graph reliably shows a "long neck" — a handful of tasks that
dominate, with a long tail of everything else ([MeasuringU](https://measuringu.com/top-tasks/)).

None of the three phases survives contact with a project that has no
customer base to survey and no support-ticket volume worth calling a corpus.
This fleet is that project: `config-inventory.md` finds top-tasks,
card-sorting, and JTBD used nowhere in the fleet except inside
`ocx-marketing`'s customer-research skills, which target product positioning,
not documentation navigation ([config-inventory.md](../docs-audit/config-inventory.md)).
There is no shortlisting committee and no voter pool to recruit — the
"owner plus a set of agents" is the entire population.

### 2. The sizing problem, resolved

The brief's central difficulty is deciding a minimum viable version of a
method built for hundreds of respondents. Two findings resolve it in
different but compatible directions.

First, McGovern's own case studies show the method degrades gracefully at
low N. The European Commission's top-3 tasks were identical after 30 votes
out of an eventual 107,000 ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)).
That is evidence that *voting itself* is cheap to run small — it does not
prove voting can be skipped, because 30 real, independent people is still
30 more than an owner-plus-agents pool can produce without inventing data.

Second, Nielsen's discount-usability logic gives the actual substitute
reasoning for a pool this small. A single reviewer finds about 31% of
usability problems; a fifth reviewer marks the point of diminishing
returns; distributing a budget across three waves of five beats one wave
of fifteen ([NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)).
This is not the same claim as McGovern's — Nielsen is about usability
*problems found*, not task *popularity* — but the shape transfers: run a
small number of structured attempts in waves, expect each additional wave
to add less, and stop after 2-3 waves rather than trying to simulate a
100-voter survey with an LLM (which fabricates the numbers, not the
insight — see [AI-agent angle](#ai-agent-angle)).

The resolution this procedure ships: **replace the vote with a friction
log** (§4) run in 2-3 waves over the shortlisted tasks, and **replace the
longlist-from-traffic with a longlist-from-code-surface** (§3), because a
zero-user project has code completeness to substitute for traffic
completeness but has no substitute for a missing voter.

### 3. Candidate-task sources: surface over sampled traffic

McGovern's longlist is built by sampling multiple *traffic and history*
sources — none of which exist yet for a new or small project. The
substitute is to enumerate the *code surface* instead: every top-level CLI
subcommand, every exported SDK entry point, every README section heading,
every issue and PR title, every changelog entry describing a shipped
feature. Each of these is a candidate task regardless of whether anyone has
ever asked about it, because completeness over the surface is the only
thing a zero-traffic project can prove.

The one source that must **not** feed the candidate list is the existing
docs tree's own page titles. GOV.UK's identify-user-needs guidance gives
the exact failure this avoids: its own bad-example user need — "As a carer,
I need to use a benefits calculator, so that I can find out if I can get
Carer's Allowance" — is invalid because it "creates a 'need' to justify
existing content, and suggests a specific solution that may or may not be
right" ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)).
Sourcing candidate tasks from what documentation already exists is exactly
that trap at the sourcing stage instead of the need-writing stage. Existing
page titles belong only in the *coverage table* (§7), compared against the
independently-sourced task list, never used to generate the list itself.

### 4. The friction log: the one method an unaided agent can run

Of every discovery method surveyed for this topic, the friction log is the
only one an agent can execute completely on its own, because it requires
no third-party voter and produces a real, falsifiable observation (did the
task actually complete, and what happened) rather than an opinion.

Stripe's internal practice, as documented by a Stripe engineer, structures
every friction log into exactly three sections: **Context** (the reviewer's
persona and what they were trying to accomplish), **Pros and cons** (a
bulleted list of what went well and badly), and **Detailed stream of
consciousness** (unstructured, first-person notes written while attempting
the task, screenshots and links included). Every employee is trained on the
format at onboarding; a finished log is broadcast company-wide and to the
owning team; the author is expected to steward the resulting tickets to
resolution and report back ([Stripe friction-logging toolkit](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md)).
Crucially, none of the three sections asks the author to propose a fix.

A second, commonly-cited friction-log template disagrees on exactly that
point: it asks for the friction point, supporting data, and a **proposed
solution** in the same document, reviewed on a monthly or sprint-end
cadence by a cross-functional group ([Chameleon](https://www.chameleon.io/blog/friction-logs)).
This is a reasonable shape once a team is triaging known issues into fixes,
but it is the wrong shape for *discovery*, because naming a fix while still
discovering the task repeats GOV.UK's "suggests a specific solution"
failure one step earlier in the pipeline. This procedure adopts Stripe's
three-section shape for the discovery step and defers solution proposals
to whatever process turns the coverage table (§7) into written pages.

The persona in the Context section must be concrete and explicitly
inexperienced — "a Python developer who has never run this CLI, following
only the README" — not "the developer" or "a user." An unnamed or
over-familiar persona is exactly the failure mode `failure-and-
observability.md` flags: an LLM asked to write a user need from an
unspecified viewpoint tends to describe the page's own content back at the
reader, because it already knows the answer it is supposedly discovering.

### 5. The user-need statement and its falsifiable test

Every shortlisted task gets exactly one user-need sentence, in GOV.UK's
three-part template: "As a… [who is the user?] I need to… [what do they want
to do?] So that… [why?]" GOV.UK's own worked example pair makes the test
concrete. The bad need — "As a carer, I need to use a benefits calculator,
So that I can find out if I can get Carer's Allowance" — fails because it
names a specific tool and backfills a justification for content that
already exists. The corrected need — "As a carer, I need to get financial
help, So that I can carry on looking after the person I care for" — states
an outcome with no implied solution ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/)).
The same guidance adds a softer test worth carrying over: avoid "understand,"
"know," or "be aware of" in the need unless a concrete action follows —
those verbs describe a mental state, not a task.

### 6. Ranking without a voter pool

McGovern's ranking signal is a vote count; this fleet has none, and
`ux-observability-posture.md`'s finding that 0 of 9 real docs sites run
analytics or log zero-result searches means the more mature substitutes
(search logs, invocation telemetry) are also absent today. The honest
ranking order, from strongest available signal to the fallback, is:

1. Issue and PR title frequency for the task's keywords, if the repo has
   enough history to search.
2. CLI or API invocation telemetry, if the project instruments it (none in
   this fleet do, per `config-inventory.md`).
3. Search zero-result logs, if the docs site has search analytics (none in
   this fleet do).
4. Friction-log severity and dependency order (what has to work before
   anything else can) — the fallback every zero-user, zero-instrumentation
   project lands on.

A project must rank by whichever of these actually exists and record which
one it used in the artifact (§7). Ranking by an invented percentage or vote
count when none of the four exists is the single most common way this
procedure gets faked (see [AI-agent angle](#ai-agent-angle)).

### 7. The artifact: schema, coverage table, delete list

The procedure's output is one file, not a chat transcript or a set of
scattered notes — this is a process meant to run without a human reading
along. One row per candidate task, with this schema:

```yaml
id: T07
task: "install the CLI on a machine with no prior toolchain"
source: cli-subcommand          # cli-subcommand | readme-heading | issue-title | changelog
signal: friction-log-severity    # issue-frequency | telemetry | zero-result-log | friction-log-severity
friction_log: discovery/friction-logs/T07.md
user_need:
  as_a: "a developer with no prior install of this tool"
  i_need_to: "get a working copy of the CLI onto my machine"
  so_that: "I can start following the rest of the docs"
solution_shaped: false           # result of the mechanical check in rule 2
existing_page: docs/installation.md
page_word_count: 640
page_status: adequate            # missing | stub | adequate | duplicate
action: keep                     # write | expand | merge | keep | delete
```

The **coverage table** is this same file rendered as rows: task, mapped
page (or "missing"), and verdict. The verdict reuses the fleet's own,
already-measured stub definition rather than inventing a new threshold:
`docs-shape.md` defines a stub as a page under 150 prose words and measures
24.6% of the fleet's 248 pages at that level today, with one repo
(`ocx-mirror-sdk`) at 94% stub share ([docs-shape.md](../docs-audit/docs-shape.md)).

The **delete list** is licensed only when two independent signals agree:
the page has no surviving user need mapped to it, *and* it is a stub or an
exact duplicate of another covered page's need. Either signal alone is not
enough. Liverpool City Council's 80%-of-4,000-pages deletion is the
canonical case for evidence-based deletion — 200 pages generated 85% of
traffic, so the rest went — but that decision rode on real traffic data
this fleet does not have ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)).
Requiring both signals is this procedure's deliberate risk adjustment for
running the same kind of deletion with a much weaker evidence base.

### 8. Cadence and ownership

McGovern's full cycle runs about 12 weeks and assumes a standing team; this
fleet has neither the traffic to justify that cadence nor the staff to run
it. The procedure instead runs on two triggers: **event-triggered**, on
every minor version bump or feature merge (a new subcommand or exported
function is a new candidate task the moment it ships), and a cheap
**periodic** pass — a quarterly grep-only audit that recomputes the stub
count and the orphan count from the existing artifact without launching a
new friction-log wave. The "who" is the coding agent itself, invoked either
by the maintainer directly or by a scheduled hook — there is no separate
human team to hand this off to, matching the project's stated operating
model of AI agents authoring documentation without a human in the loop.

## Normative guidance candidates

1. **Never source the candidate-task longlist from the existing docs tree's own page titles or headings.** Source it from the CLI/API surface, README section headings, issue and PR titles, and changelog entries instead.
   Rationale: prevents GOV.UK's "creates a need to justify existing content" failure at the sourcing stage.
   Verify: diff the candidate-task list's `source` field against a generated list of existing doc page titles — any task whose only source is an existing title fails.
   Evidence: **codified** (GOV.UK) + **measured** (the fleet has no other source in use today, `config-inventory.md`).

2. **Every user need must fail a solution-shaped check before it is accepted.** Build a token list from every existing doc heading and every CLI flag/subcommand name in the repo; if the need's `i_need_to` or `so_that` field contains one of those tokens as a substring, reject and rewrite.
   Rationale: this is GOV.UK's own falsifiable test, made mechanical.
   Verify: `rg -iof <(doc-headings-and-flags.txt) need-sentences.txt` — any match fails.
   Evidence: **codified** (GOV.UK), verification is **argued** (the script is a design, not a found tool).

3. **Run the friction log in Stripe's three-section shape (Context, Pros and cons, Detailed stream of consciousness) for every shortlisted task, with no "proposed solution" field.** Never adopt a friction-log template that asks for a fix at the discovery stage.
   Rationale: naming a fix while still discovering the task repeats the solution-shaped failure one step earlier.
   Verify: a script asserting each `friction_log` file contains exactly those three section headings, and rejecting any file with a "proposed fix" or "solution" heading.
   Evidence: **measured** (Stripe's own published practice) vs. **argued** rejection of the competing Chameleon template.

4. **The friction log's Context section must name a concrete, first-time-unfamiliar persona.** Reject any Context whose persona sentence contains "familiar" or lacks an explicit "has never" / "first time" qualifier.
   Rationale: an unspecified or over-familiar persona reproduces the page's own content back at the reader instead of discovering friction.
   Verify: a named reading heuristic — a fresh reviewer reads only the Context section and checks for the qualifier.
   Evidence: **argued** (`failure-and-observability.md`'s named failure mode; no external source states this test directly).

5. **The friction log's Detailed stream of consciousness section must contain literal command output (a fenced code block or a `$` prompt line), not prose describing hypothetical behavior.**
   Rationale: catches an agent narrating what a user would probably see instead of executing the command and reporting what happened.
   Verify: grep the section for a fenced code block or a `$ ` line; reject if absent.
   Evidence: **argued** (derived from the Stripe shape's own emphasis on screenshots/links as evidence, not stated as a rule anywhere).

6. **Rank tasks only by a signal the artifact names from a fixed list — issue/PR frequency, invocation telemetry, zero-result logs, or friction-log severity, in that priority order — and record which one was used.** A `signal` field with an invented percentage, vote count, or the literal value "guess" fails.
   Rationale: McGovern's ranking is a real vote count; this fleet has none of the mature signals either, so the rule blocks fabricating one.
   Verify: schema check on the `signal` enum; a percentage or vote-count string in that field fails.
   Evidence: **measured** (0/9 sites have analytics, `ux-observability-posture.md`) + **argued** (the priority order itself).

7. **The candidate-task list must be exhaustive over the CLI/API surface — every top-level subcommand or exported entry point appears at least once, even if immediately triaged out as out of scope.**
   Rationale: a zero-traffic project has no sampling frame; completeness over the code surface is the only available substitute for completeness over traffic.
   Verify: diff the tool's `--help` subcommand list (or exported-symbol list) against the candidate-task file; anything present in neither the task list nor an explicit out-of-scope list fails.
   Evidence: **argued** (no source states this directly; it follows from McGovern's longlist requirement applied to a surface with no traffic to sample).

8. **A page enters the delete list only when both hold: no surviving user need maps to it, and it is a stub (under 150 prose words) or an exact duplicate of a covered page's need.** Either signal alone is insufficient.
   Rationale: Liverpool's deletion rode on real traffic data this fleet lacks; requiring two structural signals is the risk-adjustment for a weaker evidence base.
   Verify: script intersecting the coverage table's "unmapped" rows with the fleet's own stub grep (`wc -w` under 150 on the page's prose, excluding code blocks and headers).
   Evidence: **argued** risk-adjustment of a **measured** case study (Smashing Magazine) and a **measured** fleet baseline (`docs-shape.md`).

9. **Run the friction log in waves of a small, fixed size (2-3 waves), and stop — do not simulate a 100+-voter survey with the same reviewer or the same model.**
   Rationale: Nielsen's diminishing-returns curve (31% at one reviewer, most of the rest by five, "wasting your time" beyond that) is the closest available analogue for a tiny reviewer pool; simulating hundreds of synthetic voters manufactures false precision instead.
   Verify: the artifact must show at most 3 friction-log waves per task before ranking is finalized; a 4th wave or a claimed "N respondents" figure with no real N behind it fails review.
   Evidence: **argued analogy** (NN/g's finding is about usability-problem discovery, not task popularity — the shape transfers, the numbers do not).

10. **The procedure writes exactly one durable artifact file with the schema in §7 (or an equivalent superset) — never scatters partial results across chat or log output only.**
    Rationale: this process is designed to run without a human reading along; an artifact that exists only in a transcript cannot be re-run against or diffed on the next cadence trigger.
    Verify: the skill's own acceptance check — does the named artifact file exist on disk after a run, with every shortlisted task present as a row.
    Evidence: **asserted** (implied by "used by coding agents without a human in the loop," project context).

11. **Re-run the procedure on every minor version bump or feature merge, plus a quarterly grep-only audit that recomputes stub and orphan counts without a new friction-log wave.**
    Rationale: there is no traffic curve to watch for drift, so the trigger has to be code change (new surface) or a cheap periodic re-check, not a calendar cycle sized for a 100-voter survey.
    Verify: CI or scheduled-hook invocation exists that regenerates the coverage columns of the artifact and diffs the stub/orphan counts against the prior run.
    Evidence: **argued** (no source gives a cadence for this regime; McGovern's 12-week cycle is explicitly rejected as a fit).

## AI-agent angle

- **Fabricates a vote count or a percentage it never measured.** An LLM asked to rank tasks under McGovern's framing will readily produce "73% of users need X" with no survey behind it. Check: rule 6 — the `signal` field must name one of four allowed sources; any numeric claim outside a cited friction log or issue-count grep fails.
- **Writes the user need by paraphrasing the target page's own heading and intro instead of reasoning independently about the task.** This is GOV.UK's failure mode at the writing stage, not the sourcing stage. Check: word-overlap heuristic between the `so_that`/`i_need_to` fields and the mapped page's first paragraph — high shared-token overlap flags for a rewrite.
- **Produces a sprawling, un-shortlisted longlist and never converges.** LLMs default to breadth; asked for "top tasks" they will list dozens of near-duplicates rather than force a ranked, small set. Check: rule 7's exhaustiveness requirement is paired with a duplicate-detection pass — near-identical `task` strings collapse to one row before ranking.
- **Skips deletion entirely.** Asked to "improve the docs," an agent defaults to writing more pages, never removing any — Liverpool's highest-leverage move (delete 80%) is the one an unprompted agent will not reach for on its own. Check: the schema forces an explicit `action` value per row; a run whose delete list is empty must show that the AND-check (rule 8) was actually evaluated, not silently skipped.
- **Narrates a friction log instead of running one.** An LLM asked to "simulate a new user's first experience" will write plausible-sounding prose about what a user would probably feel, without ever executing the documented command. Check: rule 5 — no fenced code block or `$` prompt line in the stream-of-consciousness section fails review.
- **Lets marketing tone into the user-need sentence.** The `so_that` clause drifts from a plain outcome ("so that I can carry on looking after the person I care for") toward a value-prop sentence ("so that I can seamlessly unlock the platform's full potential"). Check: grep the `so_that` field against a short marketing-adjective list (seamless, powerful, effortless, unlock, delight).
- **Ships the discovery artifact's own template language into a rendered docs page.** The literal strings "As a" and "so that" occasionally leak into a shipped page when an agent copies the need statement instead of writing prose from it. Check: grep the site's build output for the literal template markers; any hit outside the `discovery/` artifact directory fails.

## Contested / evolving

No row in the map's "Conflicts to resolve" table names `use-case-discovery-procedure`
as its owner topic — the tensions below surfaced during this topic's own
research rather than from a named fleet-wide conflict.

- **Survey-scale top-tasks voting vs. discount-usability-scale reviewing.** McGovern's method assumes a real customer base large enough to survey ([Smashing Magazine](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/)); Nielsen's discount-usability tradition assumes a design team validating with a handful of testers ([NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)). These are not competing answers to the same question — they fit different regimes. Resolved here by scale-fit: a project with zero measurable users takes the discount-usability regime (small waves, fast diminishing returns) over the survey regime (large N, statistical confidence), not because the survey regime is wrong, but because it needs an input this fleet cannot produce.
- **Friction-log shape: name-no-fix (Stripe) vs. name-a-fix (product-triage templates).** Both are live practice as of 2026 ([Stripe](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md), [Chameleon](https://www.chameleon.io/blog/friction-logs)). Resolved here: use the name-no-fix shape for discovery, defer solution proposals to whatever process later turns a coverage-table row into a written page.
- **Telemetry-based ranking is where mature docs practice is heading, but has not arrived in this fleet.** Search zero-result mining and CLI invocation counts are the ranking signals a product with real usage graduates to (rules 6's priority order names them above friction-log severity on purpose) — but `ux-observability-posture.md` finds 0 of 9 real fleet sites instrument either as of 2026-09-05. The trend is real; the fallback is what this procedure actually ships today. Re-rank by rule 6's higher-priority signals the day any of them exists.
- **`gerrymcgovern.com` access, tried twice, does not resolve.** Both `/top-tasks/` and the bare domain returned HTTP 403 to an automated fetch on 2026-09-05, and the Medium republication of his own writing (`medium.com/@gerrymcgovern`) also 403'd. This looks like bot-blocking rather than a moved or retired page — the Smashing Magazine account and a `digital.gov` session description stand in as the primary sources for his method and the Task Performance Indicator instead.
- **No source anywhere gives a repeatable top-tasks or JTBD method for a project with a code surface but no measurable customer.** `failure-and-observability.md` names this absence directly, and this topic's own search turned up nothing further — the gap is the finding, and this procedure (code-surface longlist, friction-log shortlist, signal-priority ranking) is offered as a substitute method, not a rediscovery of one that already exists.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [smashingmagazine.com/2022/05/top-tasks-…](https://www.smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/) | Long-form explainer of Gerry McGovern's Top Tasks method | 2022, method stated as unchanged since | Fullest fetched primary account of the pipeline with real numbers: longlist size, shortlist process, voter minimums, the Liverpool and European Commission case studies |
| [measuringu.com/top-tasks/](https://measuringu.com/top-tasks/) | Jeff Sauro's independent top-task-analysis methodology | current as of fetch, method decades-stable | Companion account with the "pick 5" mechanic, sample-size math (~136 for 7% margin), and the "long neck" distribution shape |
| [digital.gov event: A Deep Dive Into Top Tasks with Gerry McGovern](https://digital.gov/event/2018/04/11/a-deep-dive-into-top-tasks-with-gerry-mcgovern) | US federal government digital-services event description of a McGovern talk | 2018 session, hosted on a .gov domain | Only fetchable primary source for the Task Performance Indicator's two components (success rate, time-on-task) after `gerrymcgovern.com` blocked direct access |
| [github.com/mikeb-stripe/friction-logging-toolkit](https://github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md) | A Stripe engineer's public writeup of Stripe's internal friction-log practice | current repo, practice described as ongoing | The exact three-section template (Context / Pros and cons / Detailed stream of consciousness) this procedure adopts, plus onboarding and follow-through process |
| [guidance.publishing.service.gov.uk/…/identify-user-needs/](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/identify-user-needs/) | GOV.UK's own content-design guidance | current GOV.UK Service Manual guidance, method long-standing | Source of the user-need template and the verbatim good/bad carer example this procedure's falsifiable check is built on |
| [nngroup.com/articles/why-you-only-need-to-test-with-5-users/](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/) | Nielsen Norman Group, discount usability engineering | Nielsen's rule, 30+ years standing, article actively maintained | Gives the diminishing-returns numbers (31% at one reviewer, "wasting your time" past five) used as the zero-user analogue for sizing friction-log waves |
| [chameleon.io/blog/friction-logs](https://www.chameleon.io/blog/friction-logs) | Product-analytics vendor's friction-log how-to | current blog post | Only found source describing a friction-log template that bundles in a proposed fix — used here as the contrast case against Stripe's shape, not adopted |
| `gerrymcgovern.com` (root and `/top-tasks/`) | Gerry McGovern's own site | inaccessible to automated fetch, 403, tried twice on 2026-09-05 | Attempted per the brief's explicit instruction; documented here as still blocked rather than silently substituted |
| `medium.com/@gerrymcgovern` | McGovern's Medium republication of his own writing | inaccessible to automated fetch, 403 | Second attempt at a primary McGovern source once the personal domain failed; also blocked |
| [`docs-audit/config-inventory.md`](../docs-audit/config-inventory.md) | This program's own fleet-wide grep audit of existing AI config | measured 2026-09-05 | Source of the finding that top-tasks/card-sorting/JTBD exist nowhere in the fleet's docs config, only inside a marketing-positioning skill |
| [`docs-audit/docs-shape.md`](../docs-audit/docs-shape.md) | This program's own fleet-wide docs-content measurement | measured 2026-09-05 | Source of the 150-word stub definition and the 24.6% stub rate this procedure reuses rather than inventing a new threshold |
| [`docs-topic-map/failure-and-observability.md`](../docs-topic-map/failure-and-observability.md) | This program's scout synthesis on discovery-method failure modes | 2026-09-05 | Names the LLM-writes-its-own-user-need failure mode and restates the Liverpool/European Commission numbers with citation |
| [`docs-frame.md`](../docs-frame.md) | This program's phase-0 frame, with corrections | 2026-09-05 | Establishes the project context (AI-agent-authored docs, no human in the loop) that the artifact-schema and cadence decisions are built around |
| [`docs-topic-map.md`](../docs-topic-map.md) | This program's phase-3 topic map | 2026-09-05 | The commissioning brief itself — the exact investigate steps and "must decide" list this deliverable answers |
