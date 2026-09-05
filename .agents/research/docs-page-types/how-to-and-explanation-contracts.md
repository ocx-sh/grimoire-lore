---
title: Documentation design — the how-to and explanation page contracts
topic: how-to-and-explanation-contracts
group: docs-page-types
agent: docs-page-types-howto-explanation-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 7
commission: wave 2 (docs-topic-map/wave1-critique.md, "Commissions for wave 2" row how-to-and-explanation-contracts)
revises: docs-page-types.md
scope: |
  Closes the wave-1 gap named as emphasis (g), the requester's own "use-case
  guide" middle term. Extracts checkable obligations for the how-to (task)
  and explanation (concept) content types from four primary sources, tests
  every candidate check against 27 real ocx pages (13 how-to-shaped, 14
  explanation-shaped), and ships six new DOC-TYPE rules plus one revision to
  an existing rule (DOC-TYPE-07). Also closes the tutorial-contract open
  slot. Does not touch the type set itself, the declaration mechanism, or
  reference and landing, which page-type-set-and-declaration.md,
  reference-page-contract.md and landing-page-contract.md already own.
---

## Table of contents

- [Verdict](#verdict)
- [Primary sources, what each one requires](#primary-sources-what-each-one-requires)
- [Fleet measurement, how-to](#fleet-measurement-how-to)
- [Fleet measurement, explanation](#fleet-measurement-explanation)
- [New rules](#new-rules)
- [One existing rule revised](#one-existing-rule-revised)
- [The verification step needs no third marker](#the-verification-step-needs-no-third-marker)
- [The tutorial-contract slot is closed](#the-tutorial-contract-slot-is-closed)
- [Applied to the fleet](#applied-to-the-fleet)
- [Open questions](#open-questions)
- [Sources](#sources)

## Verdict

How-to and explanation both had a declared type value and zero required
sections. That gap is closed with six new rules, evidence-checked against
real pages, not adjectives.

The fleet's docs surface changed size between wave 1 and this pass. `ocx`
carried 44 pages under `website/src/docs` when wave 1 measured it. It carries
42 today, two fewer, because commit `52d029df` removed `catalog.md` and a
sibling page after wave 1 ran. This is disclosed rather than smoothed over,
the same way the program already disclosed the Good Docs template-count
drift. It changes no finding below, because every measurement here reads the
current 42 pages directly rather than trusting the 44 figure.

Of those 42 pages, 13 are how-to-shaped (`authoring/*.md`, three of
`user-guide/*.md`, `getting-started.md`, `docker.md`) and 14 are
explanation-shaped (`in-depth/*.md`). Every check below ran against all of
them, not a sample.

The headline finding: real how-to pages in this fleet almost never write a
single flat numbered list from goal to done. They open with two or three
paragraphs of motivation. Then they split into two to six independent
sub-procedures, each under its own heading, each with its own short step
sequence or single command. A rule that expects one linear list will
misfire on most of the fleet's real content. Every rule below is built
around that shape, not against it.

## Primary sources, what each one requires

| Source | How-to (task) requirement | Explanation (concept) requirement |
|---|---|---|
| [Kubernetes page content types](https://kubernetes.io/docs/contribute/style/page-content-types/) | Fixed section order: overview paragraph, prerequisites, steps as a numbered list, discussion, "what's next" with up to 5 links | Fixed section order: overview paragraph, body, "what's next". No sequence of steps. Links to tasks instead |
| [Diataxis, how-to guides](https://diataxis.fr/how-to-guides/) | Title states exactly what the guide accomplishes. Assumes an already-competent reader. Steps are a time-ordered sequence of actions | (separate page, see next row) |
| [Diataxis, explanation](https://diataxis.fr/explanation/) | (see previous row) | A real or imagined "why" question motivates the page. Opinions, comparisons and background are licensed. Step sequences "interfere with the explanation itself" |
| [GitLab, Task topic type](https://docs.gitlab.com/development/documentation/topic_types/task/) | Title is "active verb + noun". Intro states "Do this task when you want to...". Prerequisites optional but always plural. Steps under "To do this task:". A single-step task uses a bullet, not a number | (separate page, see next row) |
| [GitLab, Concept topic type](https://docs.gitlab.com/development/documentation/topic_types/concept/) | (see previous row) | Answers "What is this?" and "Why would you use it?" explicitly, both questions. Title is a noun. Bans "Overview", "Introduction", "How it works" as titles. Bans numbered instructions and task links |
| [Good Docs, How-to template](https://thegooddocsproject.dev/template/how-to/) | Overview section states the problem. "Before you begin" is optional. Steps start with a verb, one action per step, capped around 8 to 10. "See also" closes the page | (separate page, see next row) |
| [Good Docs, Concept template](https://thegooddocsproject.dev/template/concept/) | (see previous row) | Optional intro, then a definition section answering what the concept is and what is out of scope. Use cases and comparison sections are optional |

Four independent sources agree on three things for how-to: an opening
paragraph that states the goal, steps that are actions in order, and a
closing link list. Three of four treat prerequisites as optional, not
required. None of the four requires a separate "verification" heading,
so that obligation is not invented here (see below).

Three independent sources agree on explanation: state what the thing is
and, ideally, why it matters, before anything else, and keep numbered
reader instructions out. GitLab is the only source that bans them outright.
Diataxis calls them a distraction. Good Docs and Kubernetes simply never
include a steps section in the template.

## Fleet measurement, how-to

Thirteen pages: `authoring/building-pushing.md`, `authoring/bundle-anatomy.md`,
`authoring/dependencies.md`, `authoring/entry-points.md`,
`authoring/env-surface.md`, `authoring/migration.md`, `authoring/testing.md`,
`user-guide/patches.md`, `user-guide/attestations.md`,
`user-guide/promoting-packages.md`, `getting-started.md`, `docker.md`.

**1. Opening goal statement.** 12 of 13 pages carry non-empty prose before
their first `##`, ranging from 52 to 216 words. `authoring/testing.md` is the
one exception: its H1 is followed immediately by `## The problem with
push-debug-push`, zero words of scope statement. That is a real, single,
named violation, not a hypothetical one.

**2. Prerequisites.** Zero of 13 pages carry a `## Prerequisites` or `##
Before you begin` heading. One page, `getting-started.md`, states a
prerequisite inline ("It assumes ocx is already installed"). Three of the
four sources call this section optional. The fleet's near-total absence of
the heading form, paired with the sources' own hedging, means this cannot
ship as a required heading.

**3. Ordered steps.** Only 5 of 13 pages carry a genuine ordered list or
numbered sub-heading describing a real procedure:
`authoring/testing.md` (6 items), `authoring/building-pushing.md` (3),
`authoring/multi-platform.md` (3), `authoring/entry-points.md` (3), and
`user-guide/patches.md` (4, as numbered `###` sub-headings). The other 8
pages have no numbered sequence anywhere. That is not a gap. GitLab's own
contract says a task with more than one method gets nested headings per
method, and a single-step method gets a bullet, never a number. Reading the
8 pages that skip numbering confirms this: each covers two to six
independent choices (which platform, which registry, which libc variant),
not one linear task. A rule requiring a numbered list on every how-to page
would fail 8 of 13 real pages for correctly not having one.

**4. Steps must read as reader actions, not narrated system behaviour.**
Of the 5 pages with real numbered steps, 4 are phrased as actions the reader
takes: "Bundle the base archive...", "Push the first release...", "Read
`metadata.json`...". One is not.
`authoring/entry-points.md:129-131` numbers three sentences that describe
what the software does after the reader has already acted ("Consumer types
`mytool`", "The launcher re-enters...", "OCX exec's `bin/mytool`"), third
person throughout, no instruction to the reader anywhere in the list. That
is the fleet's one real instance of a how-to page narrating instead of
instructing, out of 6 pages with real steps. A 1-in-6 rate on real content is
a genuine, named, useful finding, and not high enough to justify a hard gate.

**5. Next-step or related-reading link.** 9 of 13 pages already close with a
heading built for this: 8 of 8 `authoring/*.md` pages carry `## See also`,
and `getting-started.md` carries `## Next Steps`. None of the three
`user-guide/*.md` pages or `docker.md` do. Two of the four primary sources
treat this as required core structure (Kubernetes, Good Docs), one treats it
as optional (GitLab). A 9-of-13 baseline this strong, on an obligation this
cheap to satisfy, is good evidence for a rule. It is not evidence for a
hard gate, since almost a quarter of the fleet's real pages have never
needed one.

**6. Concept-preamble word count** (calibrating the existing DOC-TYPE-07 cap,
not a new obligation). The 13 opening-prose blocks measured in finding 1 run
0, 52, 57, 62, 62, 78, 86, 87, 98, 117, 120, 145, and 216 words. DOC-TYPE-07
currently caps this at 100 words and is labelled "argued... no source
states." Against real data, a 100-word cap fails 4 of 13 pages that are not
padding. They carry real, load-bearing motivation, such as why a rebuild
breaks a signature or why entry points exist at all. See the revision
below.

## Fleet measurement, explanation

Fourteen pages, all of `in-depth/*.md`: `ci.md`, `configuration.md`,
`cosign-parity.md`, `dependencies.md`, `entry-points.md`, `environments.md`,
`indices.md`, `lazy-loading.md`, `project.md`, `self-hosted-sigstore.md`,
`shell-integration.md`, `signing.md`, `storage.md`, `versioning.md`.

**1. Stated question.** A grep for an opening sentence of the shape "This
page explains/covers/describes/states/is the..." matches 12 of 14 pages.
Six use the literal word "explains" (`configuration.md`, `dependencies.md`,
`entry-points.md`, `indices.md`, `storage.md`, `versioning.md`). Three use a
close variant: `self-hosted-sigstore.md` ("This page is the fleet answer"),
`cosign-parity.md` ("This page states exactly how far that goes"),
`environments.md` ("This page is the canonical reference for how..."). Three
more state the same thing without that sentence shape at all
(`shell-integration.md`, `project.md`). Two pages never frame themselves this
way at all: `ci.md` and `lazy-loading.md` open straight into the problem,
with no sentence naming what the page itself does. Both real, both named.
Fourteen real pages, 12 satisfy a broad version of this check, a rate high
enough to ship, not high enough to call it free.

**2. Numbered lists inside explanation content.** Five of the 14 pages carry
a real numbered list: `cosign-parity.md` (6 items), `environments.md` (8, in
two separate lists), `indices.md` (7, in two separate lists),
`self-hosted-sigstore.md` (3), `signing.md` (12, in two separate lists). A
rule that just bans any numbered list on an explanation page would misfire
on 3 of these 5:

- `signing.md:316-323` numbers six steps of what the signing pipeline itself
  does ("An ephemeral ECDSA P-256 keypair is generated...", "The ephemeral
  public key is sent to Fulcio..."), third person throughout. Mechanism
  narration, not reader instruction. Not a violation.
- `environments.md:79-81` and `:155-157` number a resolution *order*
  (deepest dependency first, then the root's own declarations), stating a
  fact about precedence, not a task. Not a violation.
- `self-hosted-sigstore.md:235-237` numbers three independent hardening tips
  ("Anchor everything you can.", "Escape the dots.", "The CI side is half
  the control."). No item depends on a prior one completing. Diataxis
  explicitly licenses "judgements and opinions" in explanation content, and
  an order-free tip list is exactly that, not a procedure. Not a violation.

Two of the 5 genuinely are how-to content sitting inside an explanation-typed
page:

- `indices.md:230-241` is an air-gapped install walkthrough, addressed
  directly to the reader ("Copy `$OCX_HOME/index/<source>/`...onto media",
  "On the air-gapped machine, point ocx at the copy"), each step depending
  on the one before it completing. This is a how-to hiding inside an
  explanation page.
- `cosign-parity.md:183-188` numbers a six-step test procedure ("Publish a
  package...", "Sign it...", "Assert exactly one signature is
  discoverable...", "Corrupt one byte...") where step order is load-bearing
  (you cannot corrupt the signature before signing it). Test-methodology
  content written as a how-to, also hiding inside an explanation page.

That is a real 2-in-5 violation rate among pages that use numbered lists at
all, and a real 2-in-14 rate across the whole explanation set. It also
proves that a mechanical "ban all numbered lists" check would have been
wrong 3 times out of 5, which is exactly the kind of unmeasured,
high-false-positive check this program's own severity gate exists to catch
before it ships.

## New rules

Six new rules, numbered from DOC-TYPE-22 to continue the family's existing
21. Severities follow the measured rates above, not the source count.

### How-to

**DOC-TYPE-22 — MUST — applies to: how-to**
State the page's goal or scope in prose before its first `##` heading.
Never open a how-to straight into steps with no framing sentence.
*Rationale*: a reader with no framing cannot tell whether the page solves
their problem before reading every step.
*Verify*: word-count the text between the H1 and the first `##`. Fail on
zero words outside inline code and links.
*Evidence*: measured (12 of 13 ocx how-to pages already comply,
`authoring/testing.md` is the one violation) plus normative (Kubernetes
overview section, Good Docs overview section, GitLab's "Do this task
when..." intro).

**DOC-TYPE-23 — CONSIDER — applies to: how-to**
State a hard prerequisite before the first step. Name another page the
reader must complete first, an account, or a running service. Use a heading
only when three or more prerequisites apply.
*Rationale*: a step that silently assumes prior setup strands a reader who
skipped it. Most tasks in this fleet have no true prerequisite beyond
installation, though.
*Verify*: reading heuristic. `unverified: reading heuristic`. A mechanical
check cannot tell a true prerequisite from ordinary context apart without
understanding the task.
*Evidence*: measured (0 of 13 pages carry the heading, 1 of 13 states one
inline) plus argued (two of four sources mark the section optional).

**DOC-TYPE-24 — SHOULD — applies to: how-to**
A procedure with two or more actions in a fixed order needs a numbered
list, or numbered sub-headings, phrased as what the reader does. A
procedure with independent, order-free choices may use one heading per
choice instead. A single-action task may use one fenced command with no
list at all.
*Rationale*: forcing every page into one flat numbered list breaks the 8 of
13 fleet pages that correctly describe several independent choices instead
of one sequence. The real defect is a numbered list that narrates what the
software does instead of instructing the reader.
*Verify*: reading heuristic. `unverified: reading heuristic`. Distinguishing
a reader instruction from third-person system narration is not reliably
regexable.
*Evidence*: measured (5 of 13 pages carry a real step sequence, 4 phrase it
as reader action, `authoring/entry-points.md:129-131` is the one narrated
exception) plus codified (GitLab: "Use imperative voice for steps", single
step is a bullet not a number).

**DOC-TYPE-25 — SHOULD — applies to: how-to**
Close a how-to page with a heading linking to related or next reading.
*Rationale*: a page that solves one task and stops leaves a reader with no
path to the next task. Handing off to the next task is the point of the
tier model this program already ships.
*Verify*: `grep -niE '^#{2,4} (see also|next steps?|what.?s next|related)'`
in the file. Absence fails.
*Evidence*: measured (9 of 13 ocx how-to pages already carry this heading,
all 8 of `authoring/*.md` plus `getting-started.md`) plus codified
(Kubernetes "whatsnext", Good Docs "See also").

No new rule states a verification obligation for how-to. See
[below](#the-verification-step-needs-no-third-marker).

### Explanation

**DOC-TYPE-26 — SHOULD — applies to: explanation**
Open with a sentence stating what the page explains and, where it applies,
why it matters, before any other content.
*Rationale*: a reader who does not know what question the page answers
cannot judge whether to keep reading. "Overview" or "Introduction" as a
title answers nothing.
*Verify*: `grep -niE 'this (page|guide|section) (explains|covers|describes|states|is (the|exactly))'`
in the text before the first `##`. Absence is a warning, not a hard fail,
because the check only catches one phrasing of a real requirement.
*Evidence*: measured (12 of 14 ocx explanation pages already comply under a
broad reading, `ci.md` and `lazy-loading.md` are the two named exceptions)
plus normative (GitLab's explicit "what is this, why would you use it"
test, Good Docs' definition section, Kubernetes' overview section).

**DOC-TYPE-27 — SHOULD — applies to: explanation**
Do not write a numbered sequence of dependent actions, addressed to the
reader or to whoever runs a test, as explanation content. Narrate system
behaviour in third person instead. Or link to the how-to or test that owns
the procedure.
*Rationale*: order-dependent instructions belong in a how-to a reader can
follow on their own, not folded into a page whose job is understanding.
*Verify*: reading heuristic. `unverified: reading heuristic`. A blanket ban
on numbered lists in explanation content is wrong on 3 of 5 real fleet
instances (mechanism narration and order-free tips are legitimate). Only a
human or an agent reading the list for reader-directed, order-dependent
action can tell the difference.
*Evidence*: measured. 2 of 14 ocx explanation pages violate this,
`in-depth/indices.md:230-241` and `in-depth/cosign-parity.md:183-188`, both
named. 3 of 14 carry a legitimate numbered list that must not be flagged,
`in-depth/signing.md:316-323`, `in-depth/environments.md:79-81`, and
`in-depth/self-hosted-sigstore.md:235-237`. Plus normative: GitLab bans
procedural steps in Concept pages outright, and Diataxis says steps
"interfere with the explanation itself."

DOC-TYPE-27 is the mirror of the existing DOC-TYPE-05 (opinions belong only
in explanation). Together the two rules say: judgement stays inside
explanation, and order-dependent instruction stays outside it.

## One existing rule revised

**DOC-TYPE-07**, unchanged in scope and shape, gets a new number and a new
evidence line.

- Old: cap at 100 words, applies to how-to and reference, evidence "argued,
  the 100-word number, which no source states."
- New: cap at 150 words, same scope, same severity (CONSIDER stays
  CONSIDER, since it is still one source's floor, now measured rather than
  asserted).
- *Evidence*: measured against 13 real ocx how-to preambles (0 to 216
  words, median 78). A 150-word cap passes 12 of 13. The one page over it,
  `user-guide/promoting-packages.md` at 216 words, carries real,
  non-padding reasoning (why a rebuild silently invalidates a signature)
  plus an analogy callout that could move to its own admonition rather than
  count against the cap. 100 words was not measured against anything and
  failed 4 of 13 pages that are not padding.

This answers `docs-page-types.md`'s own open question
`concept-preamble-cap`, which asked for exactly this measurement before the
number shipped.

## The verification step needs no third marker

The brief asked whether a how-to needs its own "the reader can see it
worked" rule, or whether one already exists. One already exists, twice.

`DOC-DISC-18` (MUST, applies to tutorial and how-to) already requires every
step to produce a result the reader can see. `DOC-EX-02` (MUST, applies to
tutorial, how-to and reference) already requires the page to bind to a real,
runnable test through a declared key, `ocx`'s own `# doc:` slug being the
worked example. Between them, a how-to's verification obligation is fully
covered: DOC-DISC-18 states what a step must show, and DOC-EX-02 states how
a check proves the page still matches a real command.

No new rule is added here. A third marker would only create a second name
for the same fact DOC-EX-02's binding already carries, which is the exact
mistake `docs-use-case-discovery.md`'s own commission notes name as the
cheapest remaining verification win. This closes it instead of repeating
it.

## The tutorial-contract slot is closed

`docs-page-types.md`'s open questions name `tutorial-contract` as an empty
slot with no rule. It is not empty. It lives in a different family.

`docs-use-case-discovery.md` already ships five rules scoped to `tutorial`:
DOC-DISC-17 bans branching choices on a tutorial page. DOC-DISC-18 requires
every step to show a result. DOC-DISC-19 sets the bar for calling a page a
tutorial at all (two or more interacting concepts, not just "onboarding").
DOC-DISC-20 requires a reader who did not write the page to walk it before
it ships. DOC-DISC-22 requires a scope caveat when a tutorial's own commands
are dev-only. Add DOC-TYPE-03, shared with how-to, banning the tutorial page
from switching into conditional task instructions mid-file.

That is six rules covering the opening move, the step shape, the
classification test, the review gate, and the scope caveat, the same five
things a how-to contract covers. `docs-page-types.md` should stop listing
`tutorial-contract` as an open question and instead cross-reference
DOC-DISC-17 through DOC-DISC-22 and DOC-TYPE-03 from the type-set section,
so a reader of the page-types family is not left thinking tutorial has
nothing.

Zero of the fleet's 42 real ocx pages classify as a tutorial today, so
nothing here was tested against real tutorial content. That absence is
itself named by DOC-DISC-19's own base rate, not a gap this pass introduces.

## Applied to the fleet

| Rule | Status |
|---|---|
| DOC-TYPE-22 | Violated once: `authoring/testing.md` opens with zero words before its first `##` |
| DOC-TYPE-23 | Satisfied nowhere as a heading, satisfied once inline (`getting-started.md`) |
| DOC-TYPE-24 | Satisfied on 4 of 6 pages with real steps, violated on 1 (`authoring/entry-points.md:129-131`) |
| DOC-TYPE-25 | Already satisfied on 9 of 13 pages, all under `authoring/` plus `getting-started.md` |
| DOC-TYPE-26 | Already satisfied on 12 of 14 pages under a broad reading, violated on 2 (`in-depth/ci.md`, `in-depth/lazy-loading.md`) |
| DOC-TYPE-27 | Violated on 2 of 14 pages (`in-depth/indices.md:230-241`, `in-depth/cosign-parity.md:183-188`), correctly silent on the other 3 pages with numbered lists |
| DOC-TYPE-07 (revised) | Now passes 12 of 13 how-to preambles at 150 words, the one page over it (`user-guide/promoting-packages.md`) carries real reasoning, not padding |

## Open questions

### Needs a human decision

1. **DOC-TYPE-25's cheap win.** Adding a `## See also` heading to
   `user-guide/*.md` and `docker.md` would bring how-to compliance from 9 of
   13 to 13 of 13 in an afternoon, since the `authoring/*.md` convention
   already exists and only needs copying. Worth doing before this rule ever
   fires in anger.

### Deserves another research round

1. **DOC-TYPE-24's imperative-versus-narrated distinction**, useful here for
   both how-to steps and explanation lists, is a reading heuristic in both
   places. A small classifier (subject pronoun and verb person, rather than
   a fixed verb allowlist) might make it mechanically checkable. Nobody has
   tried building one for this fleet's prose yet.
2. **`in-depth/cosign-parity.md:183-188` and `in-depth/indices.md:230-241`**
   are real content that should probably move, the first to a testing or
   troubleshooting page, the second to a how-to for air-gapped installs.
   That is an authoring task for `docs-plan`, not a research question, but
   it is a concrete, named backlog item this pass produced.

## Sources

| URL | Fetched | Why |
|---|---|---|
| https://kubernetes.io/docs/contribute/style/page-content-types/ | 2026-09-05 | The Task and Concept section skeletons, in order, with the exact per-section guidance text |
| https://diataxis.fr/how-to-guides/ | 2026-09-05 | The title-states-the-goal rule and the already-competent-reader assumption behind DOC-TYPE-22 |
| https://diataxis.fr/explanation/ | 2026-09-05 | The "why question" framing and the "steps interfere with explanation" line behind DOC-TYPE-26 and DOC-TYPE-27 |
| https://docs.gitlab.com/development/documentation/topic_types/task/ | 2026-09-05 | The imperative-steps requirement and the single-step-uses-a-bullet rule behind DOC-TYPE-24 |
| https://docs.gitlab.com/development/documentation/topic_types/concept/ | 2026-09-05 | The explicit two-question test and the ban on numbered instructions behind DOC-TYPE-26 and DOC-TYPE-27 |
| https://thegooddocsproject.dev/template/how-to/ | 2026-09-05 | The "See also" closing section behind DOC-TYPE-25 and the overview section behind DOC-TYPE-22 |
| https://thegooddocsproject.dev/template/concept/ | 2026-09-05 | The definition-first structure behind DOC-TYPE-26 |
| `ocx/website/src/docs/{authoring,user-guide,in-depth}/*.md`, `getting-started.md`, `docker.md` (local repo) | 2026-09-05 | The 27-page real corpus every measurement in this artifact ran against, read directly, not sampled |
