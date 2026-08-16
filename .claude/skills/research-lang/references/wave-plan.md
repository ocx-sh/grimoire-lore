# Wave Plan

You loaded this file because you are about to launch a research wave and
need the phase mechanics: who runs, on which model, how many, and what
comes back.

Contents: [Model Routing](#model-routing) · [Phase 1: Ground](#phase-1-ground) ·
[Phase 2: Scout](#phase-2-scout) · [Phase 3: Map](#phase-3-map) ·
[Phase 4: Dive](#phase-4-dive) · [Phase 5: Consolidate](#phase-5-consolidate) ·
[Orchestration](#orchestration) · [Convergence](#convergence) ·
[Budget](#budget)

## Model Routing

| Work | Model | Why |
|---|---|---|
| Corpus surveys, web reading, deep dives, codebase measurement | cheap/fast tier | Volume work; the cost is in pages read, not in judgment |
| Topic prioritisation, consolidation, conflict resolution, any text that becomes an enforced rule | strongest tier | These are decisions with a blast radius; a wrong MUST rule propagates into every future diff |
| Authoring the artifacts, reviewing the whole | you (the orchestrator) | Needs the whole picture and the house voice |

Set the model explicitly on every spawn. Inheriting silently gives you a
fleet of orchestrator-tier workers reading blog posts.

## Phase 1: Ground

One worker per axis. Each writes `.agents/research/<codebase>-audit/<axis>.md`.

| Axis | What it must produce |
|---|---|
| Config inventory | Every existing rule/skill/agent touching the language: path, size, activation, and a faithful digest of its *normative* content — thresholds, lint names, forbidden patterns, verbatim. Plus: which claims are portable and which are repo-specific, and the gaps |
| Code shape | Counts, not adjectives: LOC and file count per module/crate/package; type vs function vs method counts; the largest files with a cohesion judgment; coupling edges; public surface size; test placement. Every number accompanied by the command that produced it |
| Implemented contracts | The contracts the code *actually* honours — exit codes, error taxonomy, output streams, public API, on-disk formats — with file:line for definition, production, and test assertion. Explicitly diff docs against code and say which wins in practice |
| Runtime posture | Error handling, concurrency, I/O, security-sensitive paths, observability — with a ranked smells list and a "patterns worth encoding" list |

Two demands make this phase worth running:

- **Reproducible numbers.** The exact command inline next to its result.
  An audit nobody can re-run rots into folklore within a month.
- **Permission to contradict.** State in the prompt that the requester's
  diagnosis is a hypothesis. The most valuable audit result is the one
  that says the stated problem is not the real one — and that only
  happens if the worker was told it may say so.

## Phase 2: Scout

Scouts do not answer questions. They find out which questions exist.
Four to five corpora, one worker each — see
[corpus-map.md](corpus-map.md) for what each corpus contains per
language:

1. **Canonical guides** — the books, official guides, and API-guideline
   checklists. Extract their *tables of contents*: every item, chapter,
   and checklist ID is a candidate topic.
2. **Practitioner writing** — the influential blogs and talks. Read the
   posts; extract the argued positions, not the author list.
3. **Codified practice** — organisational style guides, lint catalogs,
   security guidance, safety-critical rule sets. These are topics that
   somebody already thought worth *enforcing*.
4. **Failure corpus** — antipattern catalogs, recurring code-review
   objections in large repositories, postmortems, and the complaints that
   keep resurfacing. This corpus finds the topics no curriculum lists.
5. **Recent shifts** — what changed in the last 18–24 months, and what
   old advice it invalidates. Without this scout the program bakes in
   whatever the model was trained on.

Each scout returns a structured list: candidate topic, one-line why,
source, and a coverage guess against the already-covered list you hand
it. Give every scout that list — it is what keeps them out of ground
already walked.

## Phase 3: Map

One strongest-tier agent reads every scout artifact plus the phase-1
audits, and writes `topic-map.md`:

- **The map** — every deduplicated candidate with coverage
  (covered / partial / uncovered) and a priority justified in one line
  against *this* project, not against Rust-in-general.
- **Selected for this wave** — at most a wave's worth, chosen by:
  uncovered first, then leverage for the adopting codebase, then "an area
  where agents demonstrably get it wrong", then "a rule could actually
  check this".
- **Deferred** — everything else, so the next wave starts from a backlog
  rather than from scratch.

The map returns the selection as structured data: group, slug, label, and
a **research brief** of 10–25 lines written as a professional commission
— exactly what to investigate, which sources to chase, which APIs and
patterns to name, and what the deliverable must decide. The brief is
handed to the worker verbatim, so a vague brief is a wasted worker.

A topic is a question, not a subject. "Iterator pipelines versus
collecting into an intermediate collection" is a topic. "Performance" is
a wave.

## Phase 4: Dive

One cheap-tier worker per selected topic, each writing
`.agents/research/<group>/<slug>.md` against the output contract in
[prompt-contracts.md](prompt-contracts.md). The contract is what makes
the artifacts mergeable: same sections, same order, same citation
discipline, in every file.

Two clauses do most of the work:

- *"Fetch the primary sources; never write from search snippets."*
- *"Normative guidance candidates: each rule with a rationale and a
  verification."* — this is the section the consolidator actually merges.

## Phase 5: Consolidate

One strongest-tier agent per topic reads every sub-artifact in its group
plus the relevant phase-1 audits, and writes `<topic>.md`. Its job is not
to summarise. It is to **decide**:

- **Verdict** — the position this project takes, written as decisions.
  Where sub-researchers disagreed, resolve it and say why.
- **The ruleset** — merged, de-duplicated, numbered rules with a stable
  ID prefix. Every entry: imperative rule, one-line rationale,
  verification, severity (MUST / SHOULD / CONSIDER).
- **Applied to the codebase** — already satisfied / violated / new
  commitment, with file:line evidence from the phase-1 audits.
- **Agent failure modes** — ranked by how often it bites.
- **Open questions** — including which subarea deserves another round.
- **Sub-artifacts and key sources** — relative links, then the best URLs.

A consolidation with no resolved conflict and no "violated" row is a
survey wearing a verdict's clothes. Send it back.

**From wave two onward, this phase is a revision, not a fresh
consolidation.** The topic file already exists and published artifacts
already cite its rule IDs, so the reviser folds the new sub-artifact in
while holding every existing ID stable, changes contradicted rules in
place, and appends a revision log. The contract is in
[prompt-contracts.md](prompt-contracts.md#reviser). Never run two
revisions of the same file concurrently.

## Orchestration

Run phases 4 and 5 as a pipeline over topics, not as two barriers: a
topic whose workers finish early should be consolidating while another
topic is still reading. The only real barrier is phase 3, which needs
every scout.

```
scouts      = parallel(one per corpus)                     # phase 2
map         = strongest(reads scouts + audits)             # phase 3  [barrier]
results     = pipeline(map.selected_by_group,
                stage1 = parallel(dive per subtopic),      # phase 4
                stage2 = strongest(consolidate group))     # phase 5
```

Every worker writes its own artifact and returns a short structured
result — path, source count, top rules. Never let a worker return its
findings as prose for you to re-file; the file *is* the deliverable and
the return value is a receipt.

## Convergence

Stop the loop when a full wave produces:

- no new MUST-severity rule, and
- no new agent failure mode, and
- no open question that a reviewer would call load-bearing.

Do not stop because the backlog is empty — it never is. Do not continue
because it is not — the tail is deferred deliberately, and the map
records it for whoever picks it up.

## Budget

Rough shape for a language's full quality surface: 4–6 grounding workers,
5 scouts, 1 map, 12–25 dives across 3 waves, 1 consolidator per topic.
The dives dominate. If that is too much, cut waves, not the output
contract — half the topics researched properly beats all of them
researched from search snippets.
