---
name: research-lang
description: Language-expertise research program that turns a programming language or technical domain into cited research artifacts and publishable AI-config rules and skills. Use when someone wants the agent fleet to become expert in a language (Rust, Python, TypeScript, Go, Swift, SQL, Terraform...), when authoring or porting language quality rules, code-review skills, or coding standards, when asked to research best practices, design patterns, idioms, antipatterns, or "what should we invest in" for a language, or when existing language rules need a refresh against current practice. Not for answering one language question — reach for it when the deliverable is durable config or a research corpus.
license: Apache-2.0
compatibility: Requires Python 3.11+ for the artifact validator in scripts/
metadata:
  summary: Multi-wave, source-cited research program that ends in publishable language quality rules and skills
  keywords: research,language,rust,python,typescript,best-practices,rules,skills,quality,standards,subagents
---

# research-lang

A repeatable program for making an agent fleet genuinely expert in a
language, ending in artifacts that outlive the session: a cited research
corpus under `.agents/research/`, and rules + skills a coding agent loads
while it works.

The program exists because the naive alternative fails in two specific
ways. Ask a model to "write Rust best-practice rules" and it emits
plausible, uncited, already-known advice that changes no behaviour. Ask
it to research a handed-down topic list and it never finds the topics the
requester did not know to ask for — which are the ones that bite.

**The single most important behaviour in this skill: you set the agenda.**
The request is a seed, not a scope. You run the scout wave even when the
requester handed you a detailed list, you commission the follow-ups your
own findings surface, and you keep looping until the waves stop
producing new blocking rules. Nobody will tell you what to research next
— finding that out is the job. See
[Self-Direction](#self-direction-the-loop-is-yours).

## The Loop

Eight phases. Phases 2–6 repeat until a wave stops producing new MUST
rules. Do not skip phase 1 or phase 5; they are where the value is.

| # | Phase | Who | Output |
|---|---|---|---|
| 0 | Frame | you | The target language, the codebases that will adopt the rules, the artifact set |
| 1 | Ground | cheap-model workers | Audits of the real codebases: existing config, measured code shape, the contracts already implemented |
| 2 | Scout | cheap-model workers | Corpus surveys that *discover* candidate topics |
| 3 | Map | strongest model | `topic-map.md`: prioritised backlog, coverage marks, the next wave's commissions |
| 4 | Dive | cheap-model workers | One cited artifact per subtopic |
| 5 | Consolidate | strongest model | One `<topic>.md` per topic: decisions, a verified ruleset, codebase application |
| 6 | Iterate | you | Feed open questions and deferred topics back into phase 3 |
| 7 | Author | you (+ strongest model) | Rules, skills, and the verification gate |
| 8 | Validate | scripts | Machine checks, then trigger evals |

Read [references/wave-plan.md](references/wave-plan.md) before launching
anything: it holds the phase-by-phase mechanics, wave sizing, model
routing, and the orchestration pseudocode.

## Self-Direction: The Loop Is Yours

A research program that only answers the questions it was handed is a
transcription service. Four obligations, and none of them wait for
permission:

1. **Run the scout wave even when the request is detailed.** A specific
   request is the strongest signal that the requester has a hypothesis —
   and a hypothesis is a lens, which means it has edges. The topics
   outside it are found by surveying the corpus, never by decomposing the
   request more finely. Decomposing a request produces its sub-questions;
   it cannot produce the question that was never asked.
2. **Commission every follow-up your own output names.** Each
   consolidation ends with "deserves another round" items. Those are
   research commissions, not documentation. File them into the next wave
   the moment the wave that produced them lands.
3. **Chase the surprises.** When an audit contradicts a premise, when two
   sources disagree hard, when a subarea turns out to be load-bearing and
   thin — that is a new topic. Spawn it. Depth found mid-program is worth
   more than breadth planned up front, because it was discovered rather
   than guessed.
4. **Loop until convergence, not until the list is done.** The stop
   condition is a wave that adds no new MUST rule and no new failure
   mode. A backlog that still has entries is normal and expected; an
   unexplored surprise is not.

The failure this prevents is subtle, because the output looks fine: a
corpus that answers the brief thoroughly and misses the thing that would
have changed the design. Streaming interfaces, cancellation tokens,
atomic-write durability, on-disk format evolution, path-encoding
footguns — these surface from the corpus and from measurement, and never
from a request that did not already know about them.

## Non-Negotiables

These are the rules that decide whether the output is worth its tokens.

1. **Ground before you research.** Measure the codebase that will adopt
   the rules before reading a single blog post. Counts, not impressions —
   the requester's diagnosis of their own code is a hypothesis to test,
   not a premise. Report the measurement even when it contradicts them.
2. **Discover the topics; do not accept them.** The requester's list is
   the *seed*, never the scope. Phase 2 exists to find what they did not
   name. If a wave's topic list came only from the request, the program
   has already failed.
3. **Every rule carries a verification.** A command, a lint name, a grep,
   or a named reading heuristic. A rule nobody can check is a comment.
   Rules without verification do not enter the ruleset.
4. **Drop what the model already does.** Keep only guidance an agent gets
   wrong without being told. Restating common knowledge costs context and
   dilutes the rules that matter.
5. **Cite primary sources.** Official docs, specs, RFCs, API guidelines,
   crate/package docs, real source code — a minimum count per artifact,
   fetched not recalled. Search snippets are not sources.
6. **Cheap model researches, strongest model decides.** Web reading and
   enumeration are cheap-model work. Synthesis, conflict resolution, and
   anything that becomes an enforced rule is strongest-model work.
7. **Persist everything, link everything.** `<topic>/<worker>.md` for each
   worker, `<topic>.md` for the consolidation, relative links between
   them. A finding no artifact records did not happen.
8. **Date the guidance.** Record when it was researched and flag anything
   that is edition-, version-, or era-specific. Stale guidance is the most
   dangerous kind for an agent trained on older text.

## Directory Contract

```
.agents/research/
  topic-map.md                  # the prioritised backlog (phase 3)
  topic-map/<scout>.md          # corpus surveys (phase 2)
  <codebase>-audit/<worker>.md  # local grounding (phase 1)
  <topic>.md                    # consolidated position + ruleset (phase 5)
  <topic>/<worker>.md           # one per deep dive (phase 4)
```

One topic per `<topic>.md`. The consolidation links its sub-artifacts by
relative path so the tree browses on a forge. Nothing is deleted between
waves — a superseded artifact gets a `superseded_by:` frontmatter key.

## Phase Briefs

Phases 0–1 and 6–8 run inline; phases 2–5 fan out to workers.

**Phase 0 — Frame.** Write down three things before spawning anything:
the language and its era (edition/version/runtime), the codebases that
will adopt the output, and the artifact set you intend to ship. Without
the third, research never converges.

**Phase 1 — Ground.** One worker per audit axis: existing AI-config
inventory, measured code shape (module/type/function counts, largest
files, coupling), the implemented contracts (exit codes, error taxonomy,
public API), and the runtime/security posture. Demand file:line evidence
and the exact commands used, so every number is re-runnable.

**Phases 2–5** are covered in
[references/wave-plan.md](references/wave-plan.md), with the worker
prompts to copy in
[references/prompt-contracts.md](references/prompt-contracts.md) and the
per-language corpus in
[references/corpus-map.md](references/corpus-map.md).

**Phase 6 — Iterate.** Each consolidation ends with open questions and
each map with a deferred list. Harvest both the moment a wave lands, sort
them into "needs a human decision" (report those) and "needs another
research round" (commission those), and launch. Stop when a wave adds no
new MUST-severity rule and no new failure mode — not when the topic list
is exhausted, which it never is. This phase is where
[self-direction](#self-direction-the-loop-is-yours) is either real or
decorative.

**Phase 7 — Author.** Turn rulesets into artifacts. Read
[references/rule-distillation.md](references/rule-distillation.md) for
the shape: what becomes an always-on rule, what becomes a scoped rule
with a support directory, what becomes a skill, and what becomes a
script. Budgets are hard limits, not targets.

**Phase 8 — Validate.** Run the machine checks and the trigger evals in
[references/validation.md](references/validation.md) before publishing.
A rule with a dead glob and a skill that never triggers are the same
failure: content nobody loads.

## Sizing and Cost

Match the wave to the domain, not to enthusiasm.

| Domain size | Scouts | Topics/wave | Workers/topic | Waves |
|---|---|---|---|---|
| Focused (one subsystem, one framework) | 2 | 3–4 | 1–2 | 1–2 |
| A language's quality surface | 4–5 | 5–6 | 2–4 | 3 |
| A language plus its ecosystem and tooling | 5 | 6 | 2–4 | 4+ |

Keep a single fan-out under ~15 workers and split larger programs into
sequential waves — you stay in the loop between them, and each wave's
map is better for having read the previous one. Coordination cost rises
faster than coverage does past that point.

## Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Rules read like a textbook | No grounding phase | Re-run phase 1; delete every rule with no codebase evidence and no named failure mode |
| Every rule is "SHOULD" | Consolidator surveyed instead of deciding | Force a verdict section written as decisions, and make conflicts explicit |
| Workers return the same findings | Topics overlap | Sharpen briefs in phase 3; a topic is a *question*, not a subject area |
| Nothing contradicts the requester | Workers are agreeing, not measuring | Demand counts and file:line; reward the contradiction |
| Artifacts nobody reads | No routing, or budgets blown | Index + one level of depth; enforce budgets in phase 8 |
| Guidance already stale on arrival | No era check | Add a "recent shifts" scout; date every artifact |

## Reference Routing

| Read… | …when |
|---|---|
| [references/wave-plan.md](references/wave-plan.md) | Before launching any wave — phase mechanics, sizing, model routing, orchestration pseudocode |
| [references/prompt-contracts.md](references/prompt-contracts.md) | Writing the scout, researcher, or consolidator prompts — copy the output contracts verbatim |
| [references/corpus-map.md](references/corpus-map.md) | Deciding what to survey for a given language, or porting the program to a new one |
| [references/rule-distillation.md](references/rule-distillation.md) | Turning a consolidated ruleset into rules, skills, and gates |
| [references/validation.md](references/validation.md) | Before publishing — machine checks and trigger evals |

Companion skills, if installed: `ai-config-authoring` at
`../ai-config-authoring/SKILL.md` for artifact-type choice and context
budgets, and `grim-authoring` at `../grim-authoring/SKILL.md` for
packaging the result as a distributable OCI artifact.
