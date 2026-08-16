# Prompt Contracts

You loaded this file because you are writing the worker prompts for a
wave. Copy the contracts verbatim — their value is that every artifact in
the corpus has the same sections in the same order, which is what makes
consolidation a merge instead of a rewrite.

Contents: [Shared Preamble](#shared-preamble) ·
[Grounding Worker](#grounding-worker) · [Scout](#scout) ·
[Deep-Dive Researcher](#deep-dive-researcher) ·
[Consolidator](#consolidator) · [Return Values](#return-values) ·
[Clauses That Earn Their Line](#clauses-that-earn-their-line)

## Shared Preamble

Every worker prompt opens with the same three blocks, in this order, and
they are never merged into prose:

```
Model rationale: <tier> — <one line on why this tier for this work>.

PROJECT CONTEXT:
<8-15 lines: what the adopting codebases are, their shape, their
constraints, the known pain point, and the fact that the output becomes
AI-agent configuration used without a human in the loop>

ALREADY COVERED:
<the topic list earlier waves finished, so this worker does not re-tread
it — omit for the first wave>
```

State the constraints as constraints, and say so: *"these blocks are
context for you, not content to reproduce"*. Models asked to draft an
artifact will otherwise echo the brief into the output.

## Grounding Worker

```
You are producing a numbers-first audit of <codebase> so a later
authoring pass is grounded in what is actually there.

<measurement axes, one numbered demand each>

Write <path> with YAML frontmatter (title, agent, model, scope, method).
`method` must describe the exact commands used so every number is
re-runnable; inline each command next to its result.

The requester's diagnosis of this codebase is a HYPOTHESIS, not a
premise. If the measurements contradict it, say so plainly and show the
counts. That is the most valuable result this audit can produce.

Every claim needs a file:line citation. Where docs and code disagree,
say which one is authoritative in practice.

Use read-only tools. Do not modify anything outside your output file.
```

## Scout

```
You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to
DISCOVER which questions exist. Survey a corpus and come back with the
topics an expert must be expert in, ranked by how much each changes real
code quality.

YOUR CORPUS: <one of the five corpora>
<10-20 lines naming the specific books/authors/repos/catalogs to survey>

<the standard artifact contract, plus:>

"## Candidate topics" — a table: topic | why it matters | source |
already-covered? (yes/partial/no) | priority for <this project shape>.
Aim for 20-40 candidates. Be exhaustive and specific: a candidate is a
question, not a subject area. Include the topics that sound boring but
bite — encoding, path handling, time, ordering determinism, resource
cleanup, cancellation, idempotency, on-disk format versioning,
extensibility seams, feature-flag design, macro hygiene.
```

## Deep-Dive Researcher

The artifact contract, verbatim:

```
OUTPUT FILE: <path>

Structure, in this order:
1. YAML frontmatter: title, topic, agent, model, date_researched,
   sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone actionable claim.
4. "## Findings" — numbered subsections. EVERY non-obvious claim carries
   an inline citation as a markdown link to the exact URL read. Correct
   and incorrect code side by side wherever a rule is easier shown than
   told. Exact library names with the version/era they apply to, exact
   lint names, exact command lines, exact numeric thresholds.
5. "## Normative guidance candidates" — numbered, crisp, checkable
   imperative rules distilled from the findings, each with: the rule, a
   one-line rationale, and how a reviewer VERIFIES it (a grep, a lint, a
   subcommand, or a named reading heuristic). This is the section that
   matters most — make it dense and specific.
6. "## AI-agent angle" — what an LLM characteristically gets WRONG here
   (outdated idioms it was trained on, hallucinated APIs, patterns that
   compile but are wrong) and the smallest mechanical check that catches
   each mistake.
7. "## Contested / evolving" — where practice genuinely disagrees or
   recently changed, and which way it is trending, as of when.
8. "## Sources" — table: URL | what it is | date/era | why worth reading.
   Minimum 12 distinct sources, at least 6 primary.

Hard requirements:
- Load the web tools first, then research.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of <date>; flag historical-only guidance.
- No "it depends" without saying what it depends on.
- Do not modify any file other than your output file.
```

## Consolidator

```
You are consolidating a topic into the single authoritative artifact a
later author works from.

Read EVERY file in <topic dir> (list it first; read each in full), plus
<the relevant grounding audits>.

Write <topic>.md:
1. YAML frontmatter: title, topic, model, consolidates (the file list), date.
2. "## Verdict" — 5-15 lines: the position this project takes, stated as
   DECISIONS, not as a survey. Where sub-researchers disagreed, decide
   and say why.
3. "## The ruleset" — merged, de-duplicated, numbered rules. Each entry:
   ID (topic-prefixed), the rule as an imperative sentence, rationale
   (one line), verification (exact command, lint, or grep), severity
   (MUST / SHOULD / CONSIDER). Drop rules that are generic model common
   knowledge and would not change behaviour; keep the ones an agent gets
   wrong without being told. Smallest set with the highest yield.
4. "## Applied to <codebase>" — which rules it already satisfies, which
   it violates, which are new commitments, citing file:line from the
   grounding audits.
5. "## AI-agent failure modes" — merged, ranked by how often it bites.
6. "## Open questions" — what needs a human decision, and which subarea
   deserves ANOTHER research round (name the subarea and the question).
7. "## Sub-artifacts" — relative markdown links to each sub-file with a
   one-line description.
8. "## Key sources" — the 10-15 best URLs across all sub-artifacts.

Merge rules: no claim without a citation that traces to a sub-artifact or
a URL; no duplicated rules; prefer the more specific formulation; when
two sub-artifacts conflict, state the conflict and resolve it with a
reason.
```

## Reviser

Later waves fold their findings into a topic that already exists. Do not
re-consolidate from scratch — by then, published artifacts cite the rule
IDs, and renumbering silently breaks every citation.

```
You are REVISING an existing consolidated artifact to fold in a follow-up
round it itself commissioned.

Read <topic>.md IN FULL, then every file in <topic>/ in full — including
the new artifact this round produced.

Rewrite <topic>.md in place, preserving its structure:

- ID STABILITY IS A HARD CONTRACT. Every existing rule ID keeps its number
  and its meaning. Published artifacts already cite them. Do not renumber,
  do not reorder into different IDs, do not reuse a retired number.
- New rules get NEW IDs continuing the sequence.
- If the follow-up CONTRADICTS an existing rule, change that rule's text in
  place and record the change — never leave both standing. A rule that
  overclaims a guarantee the new research shows does not exist is the most
  dangerous kind; fix it explicitly.
- Update the Verdict for whatever the follow-up settled, and REMOVE from
  Open questions whatever it answered. Where the research established a
  GAP rather than an answer, move it into the Verdict as a documented gap
  — it is a finding, not an open question.
- Add or extend a "## Revision log": one line per change — what, which
  IDs, why. That is what a later author diffs against.
- Update the frontmatter's `consolidates` list and add a `revised:` key.
```

Two operational notes. Never let two agents revise the same file in one
run — sequence them or split the topics. And after a revision lands,
re-check the artifacts that cite the changed IDs; the ID survived, but its
text may no longer say what the artifact quoted.

## Return Values

The file is the deliverable; the return value is a receipt. Constrain it:

| Worker | Returns |
|---|---|
| Grounding | Path, headline numbers, top smells, top patterns worth encoding. Max 35 lines |
| Scout | Path, and the candidate list as structured data (slug + why) |
| Dive | Path, source count, top 8 rules as one-liners |
| Consolidator | Path, rule IDs with imperatives, conflicts resolved, any subarea needing another round |

Force structure where you will act on it programmatically — a schema on
the scout's candidate list and the map's selection turns phase 3 → 4 into
a mechanical fan-out instead of a re-parse.

## Clauses That Earn Their Line

Every one of these exists because its absence produced a bad artifact.

| Clause | Prevents |
|---|---|
| "Fetch the primary sources; never write from search snippets" | Confident summaries of pages nobody opened |
| "Minimum 12 sources, at least 6 primary" | A three-blog-post artifact that reads authoritative |
| "Each rule with a verification" | Unenforceable advice entering the ruleset |
| "Drop what the model already reliably does" | 200 lines restating the language tutorial |
| "The requester's diagnosis is a hypothesis" | Confirmation of a wrong premise |
| "Flag anything edition/version-specific, as of when" | Guidance stale on arrival |
| "State decisions, not a survey" | A consolidation that resolves nothing |
| "These blocks are context for you, not content to reproduce" | The brief echoed into the artifact |
| "Do not modify any file other than your output" | Parallel workers stepping on each other |
| "Return max N lines" | The finding arriving as prose instead of a file |
