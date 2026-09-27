---
title: code-docs topic map
model: claude-opus-5-5
date: 2026-09-27
reads:
  - .agents/research/code-docs-frame.md
  - .agents/research/code-docs-audit/reference-corpus.md
  - .agents/research/code-docs-audit/census.md
  - .agents/research/code-docs-audit/sample.md
  - .agents/research/code-docs-audit/human-sample.md
  - .agents/research/code-docs-audit/eval-sites.md
  - .agents/research/code-docs-audit/records.md
  - .agents/research/code-docs-audit/config.md
  - .agents/research/code-docs-audit/scratch/samples/*.json
  - .agents/research/code-docs-topic-map/canon.md
  - .agents/research/code-docs-topic-map/methods.md
  - .agents/research/code-docs-topic-map/empirical.md
  - .agents/research/code-docs-topic-map/agent-era.md
  - .agents/research/code-docs-topic-map/tooling.md
  - .agents/research/code-docs-topic-map/failure.md
  - .agents/research/code-docs-eval/harness/build_arms.py
  - .agents/research/code-docs-eval/harness/run_probes.py
  - .agents/research/code-docs-eval/harness/extract.py
  - /home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md
  - rules/rust-quality/docs-and-tracing.md
  - rules/docs-quality.md
  - rules/{python,typescript,go,java,kotlin}-quality/*.md (grep for doc-comment and "comment naming" clauses)
---

# code-docs: topic map

Wave-1 synthesis: what the grounding changed, the deduplicated question map, the
wave-2 commissions, and what waits. Paths are relative to the worktree
`/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs` unless absolute.

Contents: [What the grounding changed](#what-the-grounding-changed) ·
[The map](#the-map) · [Selected for wave 2](#selected-for-wave-2) ·
[Deferred](#deferred) · [Questions for the owner](#questions-for-the-owner)

## What the grounding changed

- **Owner premise (1:4-1:6, 0.17-0.25): generous for apps, out of reach for ocx
  by shortening alone.** Human apps sit at 0.117 (IQR 0.056-0.193), libraries at
  0.273; the premise is the app upper quartile. Cutting every sampled fleet block
  to its non-recoverable minimum still lands at 0.323 pooled, 0.338 for ocx
  (`sample.md` §4). The band needs relocation into tests, lints and records, not
  compression, and the eval sets the line, not the premise.
- **H1 confirmed, lower than framed.** Apps land at 0.12, below the 0.15-0.30 the
  frame guessed. The app/library gap is entirely doc comments (0.060 vs 0.212);
  plain comments barely differ (0.046 vs 0.065). ocx's doc rate is 11x the app
  rate, its plain rate 4x. ocx's 0.894, 0.852 and 0.985 differ by classifier
  bucket, not by drift (`config.md`).
- **H2 holds for plain comments, needs package kind for doc comments.** Plain p90
  is 3 lines in apps and libraries alike (3.1 in the hand sample); doc p90 is 6 in
  apps, 13.5 in libraries. ocx: plain p90 8, doc p90 18, 23.2 blocks over 10 lines
  per kLOC against 0.64 (36x). The share of code under >10-line blocks separates
  ocx from grimoire (1.9x) better than the ratio (1.45x), and 25 of 636 ocx files
  hold 34% of that mass: the mass is per file, not only agent versus human.
- **H3 holds.** HEAD against pre-2022: 13 repos up, 14 flat, 5 down, median shift
  +0.005; the two large rises (clap, kotlinx.coroutines) are deliberate API-doc
  work. The pre-2022 snapshot is a valid human baseline.
- **The fleet's mass is guards, not essays; the prior 30% essay share was a
  large-file sampling artifact.** Unbiased sample, 320 blocks: guards 48% of
  lines, contract 35%, essays 6%. Fleet guards have median 6 lines, 53 of 100 sit
  in doc comments, 33 run past 10 lines. Human guards have median 2 lines, 7 of 39
  in doc comments, none past 9. The cut must compress guards and move them to the
  plain register, the highest-risk edit in the program.
- **H6 confirmed harder, but the free lunch is tiny.** Narration, tautology, IDs
  and provenance: 43 of 320 blocks, one borderline guard fact among them (~0%). They
  are 2.7% of fleet lines (the human cuttable set is 15.8%), so category deletes buy
  almost nothing. A history-phrase regex is useless: 37% false positives, 37%
  load-bearing guards, 27% safe to delete (`census.md` §6).
- **H4 splits into three states.** 12 of 40 mechanism sites are not inferable from
  code and have no test, so the comment is the only defense; OCX-17's exhaustive match can never have a
  runtime test; 7 of 15 sampled ocx guards already sit on the test's own doc
  comment. Pointers fail as "pointer beside the essay" (2 of 10) or "ID with no
  file" (2 of 10); every file-qualified pointer sampled resolved.
- **H5 is untested by every audit, and the built harness cannot test its git
  half.** `build_arms.py` builds history-free snapshots by design. External data:
  60.5% of agent doc consultations hit instruction files, 10.6% classical docs,
  1.3% API references (arXiv 2608.20195, `empirical.md` §18).
- **Plan IDs: collision is universal, and a difference of kind from human code.**
  14 of the top 15 ocx IDs resolve to 3-5 unrelated definitions; 0 of 30 sampled
  `C-` IDs resolve uniquely; 1,872 ocx prod comment lines carry one; 0 of 200 human
  blocks do. No instruction puts them in code: they leak from hex plan vocabulary,
  and the harness's own `retro.py` carries 16 that resolve nowhere. The prior
  4,237 does not reproduce (1,872 prod, 5,221 prod plus test).
- **The user-facing leak is schemars, not clap.** 0 of 73 `ocx --help` screens
  leak; ocx's golden JSON Schemas carry 64 distinct internal IDs in 182
  occurrences. DOC-11 works, on the wrong generator.
- **Linkage rots in both directions; the record store itself is healthy.**
  Code to record: 8 dead of 68 targets in ocx, and the naive detector is 43% false
  positive from `plan_`/`adr_`-prefixed identifiers. Record to code: 76 of 169 path
  citations in 15 sampled ADRs are gone, mostly from one crate split. Records:
  96 of 96 ocx ADRs tracked, 81% of 444 share one house format, 106 name a
  supersession. Fix the pointers, not the record-writing habit.
- **Tests already document; naming needs ratifying, not inventing.** 35-40 of 40
  sampled test names per repo are behaviour sentences; hex's protocol puts plan
  IDs in test names (`c050_s022_...`), followed inconsistently; no per-language
  `testing.md` defines a naming rule.
- **The shipped rules pull both ways and one does not load.** DOC-01..04 and
  DOC-10 add docs at MUST while the cuts (DOC-19, DOC-20) are SHOULD; ocx's local
  `quality-rust.md` protects the phase markers DOC-19 bans; `docs-and-tracing.md`
  has no `paths:`; the TypeScript set never mentions JSDoc or TSDoc. About 70
  clauses in 51 files across 14 lore families mandate "a comment naming X", which is the guard
  shape, and no comment rule references them.

## The map

Coverage is against shipped lore rules and the prior ocx research. Priority is
against this fleet. "Audit only" marks a question no scout named.

| Slug | Question | Coverage | Priority | Source |
|---|---|---|---|---|
| eval-design | Which arms, sites, rubric and statistic let the reason-recovery eval set a cut line without the design deciding the answer? | uncovered (harness exists, design unsettled) | P0 — sets the cut line every other rule defers to | canon, empirical, failure; eval-sites, harness |
| agent-consultation | Do cold agents open pointers, records, rules or git before editing, and where must a reason sit to be found? | uncovered (H5) | P0 — only the eval can answer it; folded into eval-design | empirical, agent-era, failure, canon, methods |
| guard-shape | What shape must a guard take (register, length, breaking edit plus consequence) to survive compression and a simplify pass? | uncovered (DOC-20 says preserve, never says what shape) | P0 — 48% of fleet lines are guards at median 6 lines against the human 2 | failure, canon; sample, human-sample, eval-sites |
| guard-recognition | Can a check recognise a guard well enough to exempt it from every cut? | partial (clippy `undocumented_unsafe_blocks`, unsafe only) | P0 — a length ratchet without a guard carve-out cuts guards; 139 labelled guards exist to score against | canon, tooling; sample, human-sample |
| guard-marker | Should a load-bearing comment carry a greppable prefix, as Go's `Deprecated:` token or `ponytail:` does? | uncovered | P1 — cheapest protect-guard enforcement, against marker inflation | tooling, canon, failure; config |
| injection-safe-phrasing | Must a guard read as fact plus consequence, never as an instruction to the agent, given repo text steers agents? | uncovered | P2 — decided here, confirmed inside guard-shape | failure |
| two-registers | Across languages, what goes in the doc register versus the plain register, including test-attached and private items? | partial (Rust DOC "two registers"; Google TS) | P1 — fleet puts 53% of guards in doc text that feeds schemas and hover; folded into guard-shape and interface-leak | canon, agent-era, tooling; sample, human-sample, config |
| lint-owned-guards | Which guard mechanisms can a compiler, lint, type or test own so the comment shrinks, and which can never have a runtime test? | uncovered | P1 — the same `let _name` footgun sits in ocx and grimoire; OCX-17 is untestable by construction | audit only (eval-sites); tooling partial |
| rule-mandated-reasons | Do the ~70 lore clauses mandating "a comment naming X" count as protected guards with one shared shape? | uncovered | P2 — decided here | audit only (rule grep, config scope) |
| what-how-why | Is the gate "why, not what", or the Linux what/how/why split, and where do algorithm and regex "what" comments fit? | partial (DOC-19, DOC-20) | P2 — wording for the index; no fleet number turns on it | canon, failure |
| contract-budget | How much contract text does a published API owe against an internal `pub` item, and who decides "external consumer"? | partial (DOC-10 unenforced; GO-API-04; KT-API-02) | P1 — contract is 35% of fleet lines and 37% of human lines, and compresses only 2.56x | canon, tooling, failure; sample, config |
| doc-presence-gaming | Do presence mandates produce boilerplate, and must a presence check pair with a content check? | partial | P2 — no fleet crate enables `missing_docs` | failure, tooling |
| tautology-check | Does a content-word-novelty check (`informative-docs`) catch tautology and narration without touching guards? | uncovered outside TS | P2 — the targets are 2.7% of fleet lines | tooling; human-sample, sample |
| summary-sentence | What form does a doc comment's first sentence take per language, one rule or per-language adapters? | partial (DOC-01, GO-API-04) | P2 — language sets already pin it; the index only routes | canon, tooling |
| section-vocabulary | Does each language get a closed header vocabulary, and is an invented header a violation? | partial (DOC-05; 194 ocx blocks with invented headers) | P2 — secondary to the length ratchet | canon, tooling; census |
| rewrite-before-comment | When does a name, extraction or type beat a comment for a grep-navigating agent, and should cleanup default to rewriting? | partial (DOC gate's three substitutions) | P2 — one codebase's naming data (Modem); no fleet measurement | canon, methods, agent-era |
| deprecation-markers | Structured deprecation annotations over prose, per language? | partial (DOC-13, JAVA-API-05, KDoc) | P3 — no deprecation block in 320 fleet samples | canon, tooling, agent-era |
| todo-debt | TODO markers: owner, issue link, expiry condition, or `ponytail:` ceiling plus upgrade path? | partial (ponytail convention, ruff TD) | P3 — 1 of 320 fleet blocks | canon, tooling, failure, empirical; config |
| directive-reason | Must a suppression directive carry a reason, at what floor? | covered (ERR-19, LINT-07, TS-GATE-04 and peers) | P3 — already ruled across families | tooling |
| commented-out-code | ERA001-style ban in every language? | partial (DOC-18, Rust only) | P3 — 2 of 200 human blocks, none in the fleet sample | tooling |
| call-site-arg-comments | `/* name= */` argument comments, or refactor to a struct? | uncovered | P3 — no fleet occurrence measured | canon |
| jvm-doc-syntax | Markdown Javadoc (`///`) and `<include>`-style externalised docs? | uncovered | P3 — no JVM code in the fleet | canon |
| ratio-bands | What comment:code band fits each package kind, interface text excluded? | covered (`reference-corpus.md`) | P2 — answered; residue is tagging package kind | canon, empirical; reference-corpus |
| length-cap | What block-length cap per register and package kind? | partial (prior >20-line ratchet; clippy 200 chars; PMD 6 lines) | P0 — MUST check; ocx has 36x the human rate of >10-line blocks | canon, methods, empirical, agent-era, tooling; reference-corpus, census |
| ratchet-design | Which per-package metric ratchets, how does it report, and how does it resist being met by deleting guards? | partial (prior: ratchet, not gate) | P0 — the check suite's spine; a ratio-only ratchet hits its number by cutting guards | empirical, methods, tooling, failure, agent-era |
| ambient-density | Claude Code's prompt says "match its comment density"; does density self-reinforce per file, and how does the rule avoid contradicting the prompt? | uncovered | P1 — explains why dense ocx files beget essays; folded into ratchet-design | agent-era |
| census-classifier | Which lines leave the ratio (interface, licence, directive, PEP 723, meta-tooling, vendored), and does the classifier need a fixture test? | partial | P2 — decided here | empirical, agent-era, failure; sample, human-sample |
| per-file-concentration | Is comment mass a per-file convention more than an agent-versus-human one? | uncovered | P3 — the sweep order already exploits it | audit only (census) |
| context-cost | What does an over-commented file cost an agent in tokens or task success? | partial (char ratio 1.77) | P3 — the direction is decided without it | failure, agent-era |
| density-age | Does density drift with project age? | covered (H3, median shift +0.005) | P3 — answered | empirical; reference-corpus |
| routing-table | For each kind of information, which store holds it, and what one-line test sends content there? | partial (prior research table) | P0 — the index's core table; every MUST routes through it | methods, empirical, agent-era, failure |
| essay-split | How is an essay split into one-line local invariants plus relocated rationale without losing constraints the ADR lacks? | partial (prior critique fix) | P1 — essays are 6% of lines but concentrated; folded into routing-table | methods, agent-era; human-sample |
| commit-as-store | Can commit bodies or trailers hold provenance when checkpoints amend and hex-finalize rewrites, and do agents read them? | partial (prior critique #11) | P2 — pure provenance is 1 of 320 fleet blocks; folded into routing-table | canon, methods, empirical; records |
| rules-as-store | Should a reason route to a path-scoped rule, and should a hook print the rules covering a touched path? | partial | P1 — grimoire's `post_tool_use_tracker.py` already does it; folded into routing-table | empirical, agent-era; records |
| architecture-codemap | Does a matklad-style ARCHITECTURE.md hold cross-cutting reasons better than per-file comments? | uncovered | P2 — no fleet repo has one to measure | methods |
| tests-as-guards | When does a test named for the constraint carry the guard, and can a check prove the test fails if the guard goes? | partial (hex traceability IDs; fleet sentence names) | P0 — H4's second channel; 12 of 40 eval sites have no test | methods, canon, empirical, agent-era, tooling, failure; records, config, eval-sites |
| test-traceability-ids | May test names carry plan IDs when those IDs collide across plans? | partial (hex protocol requires them) | P1 — folded into plan-ids | config; tooling |
| fitness-functions | Can an import or layer check replace a layering why-comment, and do Rust and TS have ArchUnit equivalents? | uncovered | P2 — sampled guards are local mechanism constraints, not layering | methods, failure, agent-era |
| record-format | MADR tier, status vocabulary, Confirmation field, AgDR provenance fields? | partial (81% of 444 records share one hybrid) | P2 — describe the fleet's hybrid, adopt the status words | methods, agent-era; records |
| record-staleness | How is a decision record flagged stale, and must agents read records as point-in-time? | uncovered | P2 — the store is healthy today | failure, agent-era, methods |
| record-index | Does the decision log need a generated index, per repo or fleet-wide, with cross-repo lookup? | partial (`arch-principles.md` index, out of sync) | P2 — one missing ADR, two cross-repo pointers found | methods; records, config |
| record-to-code-rot | When a record cites code paths or symbols, how do the citations stay resolvable across renames and crate splits? | uncovered | P1 — 45% of path citations in 15 sampled records are gone | audit only (records) |
| pointer-form | What exact form must a code-to-record pointer take, and may it appear in rendered doc text? | partial (prior: file plus ID) | P0 — bare IDs never resolve, file-qualified ones always did | methods, canon, empirical, agent-era; census, config |
| pointer-check | What check proves every pointer resolves (tracked file, anchor, cross-repo, URL) at a tolerable false-positive rate? | partial (proposed; no tool exists anywhere) | P0 — 8 dead ocx targets; naive detector 43% false positive | tooling, empirical, failure; census, records, human-sample |
| plan-ids | Which ID families does the ban cover, with which exclusions, and what replaces the 1,872 ocx prod lines? | partial (prior recommendation; no rule) | P0 — 14 of the top 15 IDs collide; humans write none | methods; census, records, config, sample, human-sample |
| history-phrasing | Can history phrasing be banned mechanically, or must history-phrased guards be rewritten by hand? | partial (prior critique) | P2 — decided: no regex; folded into cleanup-procedure | census |
| harness-scope | Do the rules bind agent tooling (hooks, skill scripts) as well as product code? | uncovered | P2 — decided here | audit only (config, sample) |
| interface-leak | What one check keeps internal IDs, record names and jargon out of every doc text that renders to help, schema or hover? | partial (DOC-11, clap only) | P0 — 64 distinct IDs in ocx golden schemas | tooling, empirical; census |
| rendered-summary | Where does the rendered summary end, how long may it be, and what does each hover client show? | partial (DOC-01) | P1 — owner-seeded surface; five tools split at the first blank line | tooling, canon, agent-era |
| module-front-page | Does a module front page carry "why this exists" once, so per-file comments stop repeating it? | partial | P2 — onboarding surface; folded into rendered-summary | canon, methods |
| docs-quality-boundary | Where does code-docs stop and docs-quality start? | partial | P2 — decided here | empirical; config |
| wrong-vs-missing | How much worse is a stale comment than none, and can a check flag code changed without its adjacent comment? | partial (prior cites CodeCrash, 2609.09242) | P2 — best detectors reach 72-80%: triage, not a gate | empirical, agent-era, failure, tooling |
| cleanup-procedure | What steps must the cleanup skill run so an agent shortens comments without deleting guards or touching code? | partial (prior: hand sweep of the top ~20 files) | P0 — a deliverable; agents under-delete (71.7% recall) and refinement is the most comment-sensitive task | empirical, agent-era, failure; census |
| cleanup-safety | Must the cleanup be barred from tests, lock scopes and error paths in the same diff, enforced structurally? | uncovered | P0 — instructions cut reward hacking only from 80% to 70%; folded into cleanup-procedure | failure |
| rule-artifact-shape | Index plus depth files, per-client frontmatter, AGENTS.md precedence, write-time versus review-time, amending DOC-18..20? | partial | P1 — decided here | canon, agent-era; config, records |
| agent-comment-trust | Is an agent's comment a weaker witness to its own correctness, and does the audience shift to the next agent? | uncovered | P3 — context for wording, not a rule | failure, agent-era |
| llm-comment-trend | Is AI over-commenting fixed or moving with model generations? | partial | P3 — a ratchet absorbs a moving baseline | empirical |
| landmarking | Should agent-only context comments be told apart from human-facing ones? | uncovered | P3 — four case studies, no baseline | agent-era |
| incident-checks | Do Knight Capital and goto-fail style checks (no flag reuse, braces, negative tests) transfer? | uncovered | P3 — no fleet evidence of either failure | failure |
| model-capability | Do more capable models need heavier guardrails? | uncovered | P3 — cleanup-safety covers the practical half | failure |

## Selected for wave 2

Seven groups, 13 dives. Selection order: blocks a MUST rule or the eval design,
then uncovered, then an agent demonstrably gets it wrong, then a check can verify
it. `record-to-code-rot` and `lint-owned-guards` are audit-only topics no scout
named. The eval design is its own group because the audits and the built harness
expose five open design questions.

### eval — the reason-recovery eval design

Why this wave: the cut line comes from this eval, and the harness as built cannot
observe the git channel, scores against a leading prompt, draws every site from
comment keywords, and uses controls no agent would break.

#### eval-arms-and-sites

```
Question: which arms and which sites let the reason-recovery eval set a cut line
without the design deciding the answer?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/eval-sites.md (48 sites, tiers A-C, 8 FTC
controls), sample.md sections 3 and 5, then build_arms.py and run_probes.py under
.agents/research/code-docs-eval/harness/.
1. Arms: rules and pointer are left for an agent to write. Make each reproducible
   (frozen rule text plus fixed prompt, or written once and committed). Add test-only
   (comment gone, test kept), pointer-only (file-plus-anchor line) and marker (one-line
   guard with a prefix). Name the arm that isolates H4.
2. Git channel: snapshots are history-free, so H5's git half is unobservable. Design a
   history-bearing variant that does not leak the comment (git filter-repo blob
   callbacks, or history cut before the comment landed) and cost it.
3. Sites: all 40 mechanism sites came from grepping comment keywords. Tabulate the
   proposed 24 by register, comment length (1-2, 3-10, over 10), test present,
   obviousness and language; name the empty cells to fill.
4. Controls: the 8 FTC sites are trivial accessors. Replace them with blocks labelled
   recoverable-from-code in sample.md or human-sample.md, each read in its function.
5. Power: repetitions per site and arm to detect a 10-point drop in guard survival,
   with session count and token cost. Fetch huggingface.co/papers/2607.28887, METR's
   2025-06-05 reward-hacking post and the git-filter-repo manual.
Decide: arms with a build recipe each, the site list as JSON (id, repo, file, lines,
anchor line, breaking edit, stratum), repetitions per cell, and the history-bearing
variant or why it is dropped. Commands: directory operands, -e, xargs -r, no angle
brackets.
```

#### eval-scoring

```
Question: what counts as keeping a guard and as recovering a reason, who judges it,
and which statistic turns arm results into a cut line?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/eval-sites.md (ground truth and breaking
edit per site), the Eval sketch in .agents/research/code-docs-frame.md, then
run_probes.py and extract.py under .agents/research/code-docs-eval/harness/.
1. Turn 2 asks "may it change to X?", naming the breaking edit. Compare an unled form
   ("what would break if this line changed?") and decide which one scores recovery.
2. Rubric: anchored levels for guard survival (the turn-1 rewrite keeps the guarded
   property, judged by property, not text match) and for reason recovery (mechanism
   plus consequence / mechanism only / generic caution / wrong). Write level examples
   from OCX-09, OCX-14, GRM-05 and TS-03.
3. Judge: LLM judge or hand scoring. Fetch the InfoQ article on agentic fitness
   functions (calibrate on 20-50 labelled cases) and Panthaplackel et al. AAAI 2021
   (balanced versus realistic accuracy). Decide judge model, calibration set size,
   agreement gate (Cohen's kappa) and escalation.
4. Where-found: extract.py tags stores by path regex. Test its patterns on real record
   paths (ocx .claude/artifacts/adr_*.md, grimoire .agents/adr/*.md, subsystem rules)
   and fix the taxonomy.
5. Cut line: the most aggressive arm whose guard survival matches the original.
   Specify a paired non-inferiority test with its margin and the tie rule.
Fetch: the Abdelsalam et al. 2025 eye-tracking paper (code-first reading), arXiv
2609.09242 and arXiv 2504.14119 for how they score comment effects.
Decide: turn-2 wording, the rubric with anchors, judge plus calibration gate, store
taxonomy, and the margin, each with the script change or command implementing it.
```

### guards — what a load-bearing comment is and what can own it

Why this wave: guards are 48% of fleet lines, 3x longer than human guards, and
half of them sit in the doc register. No shipped rule says what a guard looks like, and
every cut the program proposes needs a guard carve-out a check can apply.

#### guard-shape

```
Question: what shape must a guard comment take, and can a check recognise one well
enough to exempt it from every cut?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/sample.md section 5 (100 fleet guards with
the edit each prevents), human-sample.md "How humans write guards" (39 guards, five
wording patterns), eval-sites.md Patterns.
Gap to explain: fleet guards have median 6 lines, 53 of 100 in doc comments, 33 over
10 lines; human guards have median 2 lines, 7 of 39 in doc comments, none over 9.
1. Rewrite 20 fleet guards, spread over repos and lengths, to the human shape; record
   what each rewrite lost and state the minimum content (mechanism, plausible
   breaking edit, consequence).
2. Register: per rewrite, plain comment at the line or doc comment on the item. State
   the rule (caller-visible precondition is contract; implementation hazard is plain).
3. Recogniser: build a heuristic (SAFETY labels, "instead of / rather than / never"
   plus a consequence, single-choke-point wording, sentinel and tri-state wording).
   Score it with positives = the 139 listed guards, negatives = the 220 other fleet
   blocks in audit scratch/samples/*.json and the 161 non-guard rows of the
   human-sample.md appendix. Report precision and recall per repo.
4. Marker: fetch go.dev/wiki/Deprecated and clippy's undocumented_unsafe_blocks source;
   decide whether a guard carries a greppable prefix, weighing marker inflation.
5. Phrasing: fetch arXiv 2603.21642; confirm or reject "fact plus consequence, never an
   instruction to the reader".
Decide: guard shape as MUST text with good and bad examples in Rust, Python and
TypeScript; the register rule; the recogniser with its precision, recall and command;
marker yes or no. Commands: directory operands, -e, xargs -r, no angle brackets.
```

#### lint-owned-guards

```
Question: which guard mechanisms can a compiler, lint, type or test own, so the
comment shrinks to one line, and which guards can never have a runtime test?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/eval-sites.md (40 mechanism sites: OCX-09 and
GRM-08 named RAII bindings, OCX-17 exhaustive match, OCX-10 clamp, OCX-19 re-hash),
then rules/rust-quality/errors.md ERR-19 and the lint tables in rules/rust-cargo.md.
1. Named guard bindings: fetch the clippy sources for let_underscore_lock,
   let_underscore_must_use, let_underscore_untyped and let_underscore_future. Check
   whether ocx's render-lock guard type and grimoire's InFlightGuard carry #[must_use].
   On a scratch copy of each file, rename the binding to an underscore and report
   which lint fires today and which would with #[must_use] added.
2. Exhaustive matches: fetch clippy wildcard_enum_match_arm and
   match_wildcard_for_single_variants; decide whether OCX-17's comment can become a
   lint expectation on that match.
3. Other languages: typescript-eslint switch-exhaustiveness-check, pyright
   reportMatchNotExhaustive and typing.assert_never. Map the GRM, PY and TS sites.
4. Classify all 40 sites: lint-ownable, test-ownable (name the test or the mutation
   that fails), or comment-only; count each class.
Decide: the lints the rule tells adopters to enable per language, with the config
line (Cargo.toml [lints], eslint config, pyrightconfig.json); the rule that a
lint-owned guard keeps at most a one-line pointer to its lint; and the comment-only
residue as a named class the cleanup never shortens. Each with a command that fails
on a planted violation; commands use directory operands and no angle-bracket
placeholders.
```

### linkage — code and records, both directions

Why this wave: the record store is healthy but the links rot. Bare IDs collide,
8 ocx pointer targets are dead, and 45% of the path citations inside sampled records are
gone. All three failure modes are checkable.

#### pointer-form-and-check

```
Question: what exact form must a code-to-record pointer take, and what check proves
every pointer resolves at a false-positive rate an adopter tolerates?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/census.md sections 3-4 (68 targets, 8 dead,
naive detector 43% false positive), records.md section 2 (cross-repo pointers),
config.md section 4 (file-qualified pointers resolved every time), human-sample.md
"How humans point elsewhere" (1 in 5 already fragile).
1. Form: fetch adr.github.io/e-adr, matklad's 2021 ARCHITECTURE.md post and RFC 1574's
   link section. Decide between file plus heading anchor, file plus ID, and symbol
   name, and whether a pointer may sit in doc text that renders (census.md section 5).
2. Check: write a stdlib-only prototype that takes comment text from
   rules/code-docs/checks/comment_census.py's comment_lines(), skips intra-doc links
   and snake_case identifiers, resolves targets against git ls-files, checks the
   anchor against the target's headings, and resolves cross-repo targets through a
   small fleet map. Run it on ocx, grimoire, ocx-indexbot and ocx-catalog; report
   hits, dead targets and false positives read by hand.
3. URLs: fetch Hata et al. (arXiv 1901.07440); decide whether URL rot is checked in
   the same gate or a scheduled job.
4. Prior art: fetch the todocheck README (github.com/preslavmihaylov/todocheck)
   directly and say whether any tool already resolves pointers.
Decide: the pointer grammar as MUST text with good and bad examples, the check's
exclusions and command, its measured false-positive rate on the four repos,
cross-repo handling, and the URL policy. Commands run as written: directory operands,
-e for alternatives, xargs -r, no angle-bracket placeholders.
```

#### plan-ids

```
Question: which plan and process ID shapes does the ban cover, with which exclusions,
and what does an agent write instead?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/census.md section 3 (families, top-15
collision table, short2char false positives), records.md section 2, config.md
section 3 (IDs leak from hex plans; retro.py's 16 dead IDs; test names such as
c050_s022_...), human-sample.md (0 of 200 human blocks carry one).
1. Families: sample 30 random hits per family (C-, WP-, DEC-, DX-, RUL-, A-, S-,
   short2char) in ocx prod and test comments; classify each; write the exclusion
   list (heading levels H1-H6, schema versions V1/V2, SPDX, UTF-8, SHA-256, CWE-,
   RFC numbers, issue numbers) and the residual false-positive rate.
2. Replacement: for 30 random ocx prod lines carrying an ID, write the replacement
   (file-qualified pointer, present-tense constraint, or delete) and count each kind.
3. Tests: decide whether a traceability ID may stay in a test name, given C-050
   names three documents. Read the Traceability IDs section of
   /home/mherwig/.claude/skills/hex-core/references/protocol.md.
4. Ratchet: specify per-package count, baseline file and diff mode, reusing the
   baseline pattern of /home/mherwig/dev/ocx/scripts/lint_ratchet.py.
5. Fetch log4brains' README and adr-tools' README for how ADR tooling avoids ID
   collisions across branches.
Decide: regex families with exclusions and measured false-positive rate, the allowed
file-qualified form, the test-name policy, the ratchet command, and the smallest
change to hex's ID minting, written as a proposal, not an edit. Commands use
directory operands, -e for alternatives, no angle-bracket placeholders.
```

#### record-to-code-rot

```
Question: when a decision record cites code paths or symbols, how do the citations
stay resolvable across renames and crate splits, and what check catches the rot?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/records.md sections 1 and 3 (444 records;
in 15 sampled ADRs, 76 of 169 path citations are gone, most from the ocx_lib crate
split). No wave-1 scout named this direction.
1. Extend the rename-rot sample to every tracked ADR in ocx, grimoire and arcana.
   Report per repo the share of backticked paths and symbols that no longer resolve,
   and how many a rename trace recovers (git log --follow --diff-filter=R -M over
   each missing path).
2. Compare three citation forms for durability across the ocx crate split: path,
   path plus symbol, symbol only (matklad's "name, don't link"). Resolve symbols with
   rg over the current tree and report survival per form.
3. Who fixes rot: a diff-time check that fails when a change renames or deletes a path
   some record cites, or a scheduled whole-tree job. Fetch the repowise.dev post on
   stale ADRs and the log4brains README for prior art.
4. Immutability: fetch Nygard's 2011 post and the MADR 4 template; decide whether an
   accepted record's citations may be edited or get an addendum line.
Decide: the citation form records use, the diff-time check with its command and its
false-positive rate replayed over ocx's last 200 commits, and the edit-versus-addendum
rule. Commands run as written: directory operands, -e for alternatives, xargs -r, no
angle-bracket placeholders.
```

### routing — where everything else goes

Why this wave: the where-it-goes table is the index's core, and the prior table
routed history to a commit body that this fleet's git flow rewrites. Tests are the
second survival channel H4 names and the cheapest place to move a guard.

#### routing-table

```
Question: for each kind of information a comment carries today, which store holds
it, what one-line test sends it there, and which stores survive this fleet's git flow?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/sample.md sections 2-4, records.md sections
1, 5 and 6 (healthy records; commit bodies median 17 lines; backup refs; path-scoped
rules), config.md section 4, and the "where each kind lives" list in
/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md.
1. For each category (guard, why-constraint, contract, essay, record-paraphrase,
   pointer, provenance, todo-debt, narration, tautology, section marker) name the
   destination and a one-line routing test. For the record row, fetch Joel Parker
   Henderson's architecture-decision-record README and reuse its scope filter.
2. Commit bodies: read /home/mherwig/.claude/skills/hex-finalize/SKILL.md, then compare
   git log bodies on a finalized ocx branch against its backup/*-prefinalize ref.
   Decide whether provenance may route to a commit at all.
3. Path-scoped rules: fetch arXiv 2608.20195 and code.claude.com/docs/en/memory;
   decide when a reason belongs in a paths-scoped rule, and whether a hook like
   /home/mherwig/dev/grimoire/.claude/hooks/post_tool_use_tracker.py should print the
   rules covering a touched path.
4. Essays: split the 4 fleet essays in sample.md and ocx's
   crates/ocx_config/src/env.rs is_ocx_trampoline block by the table; report what
   stayed inline, what moved, and what was lost.
Decide: the table as it will appear in the rule index (category, destination,
routing test, verification), the essay-split procedure, and the commit-body verdict.
```

#### tests-as-guards

```
Question: when does a test carry a guard's reason well enough that the comment can
shrink to a pointer, and how does a check prove the test fails if the guard goes?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/eval-sites.md (test column: 12 of 40 sites
have none; OCX-17 cannot), records.md section 4 (7 of 15 guards are the test's own
doc comment; 35-40 of 40 names are sentences), config.md (hex traceability IDs in
test names; no per-language naming rule).
1. Mutation testing as the proof: fetch the cargo-mutants, mutmut and StrykerJS docs.
   Run cargo-mutants limited to one file for OCX-10 (clamp), OCX-18 (error-kind match)
   and OCX-22 (per-entry floor); report whether the named test kills the mutant that
   removes the guard, and the wall time.
2. Pairing: decide a cheap static link between a guard and its test (the test name
   carries the constraint noun, or the guard names the test) and measure its hit rate
   on the 18 Tier B sites.
3. Naming: fetch Osherove's 2005 naming post and a current Given-When-Then source;
   decide the sentence-name rule for Rust test fns, pytest and vitest it().
4. Placement: decide whether the reason lives on the test, on the code, or both, using
   /home/mherwig/dev/ocx/crates/ocx_project/src/config.rs line 3121 as the case.
Decide: the MUST stating when a test lets a guard comment shrink, the pairing check
with its command and hit rate, the mutation spot-check the cleanup skill runs before
shortening a guard, and the test-name rule per language. Commands run as written:
directory operands, -e for alternatives, no angle-bracket placeholders.
```

### surfaces — text that renders from code

Why this wave: the one measured user-visible leak (schemars) is outside the only
rule that guards rendered text (DOC-11, clap), and the owner seeded hover, rendered
API docs and module onboarding as a surface this program owns.

#### interface-leak

```
Question: what single check keeps internal IDs, record names, dates and jargon out of
every doc text that renders to a user or an editor, across the fleet's generators?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/census.md section 5 (0 leaks in 73 ocx
--help screens; 64 distinct IDs, 182 occurrences in ocx golden JSON schemas, traced
to source doc comments), rules/rust-quality/docs-and-tracing.md DOC-11,
rules/docs-quality.md.
1. Generators: confirm from source how doc text reaches output for clap derive
   (clap_derive/src/utils/doc_comments.rs), schemars, pydantic
   (use_attribute_docstrings) and zod (.describe, .meta). Grep ocx-sdk-python,
   ocx-indexbot, ocx-catalog, grimoire-indexer and grimoire for each API.
2. Check placement: prototype an output-side check (golden schemas, captured --help)
   and a source-side check (doc comments on clap- and schema-derived items); compare
   catch rate and false positives on ocx and grimoire.
3. Jargon: build a wordlist from census.md's trampoline finding and
   /home/mherwig/dev/ocx/CLAUDE.md; measure hits on captured help screens.
4. Hover: decide whether internal doc comments that render only in an editor may
   carry file-qualified record pointers.
5. Boundary: list what docs-quality's plain-english depth file already covers for
   this text and reference it instead of restating.
Decide: the leak check (source-side, output-side or both) with its command, the
banned-token families, the jargon policy, and where pointers may and may not appear.
Commands run as written: directory operands, -e for alternatives, xargs -r, no
angle-bracket placeholders.
```

#### rendered-summary

```
Question: what must the first paragraph of a doc comment carry, how long may it be,
and what does each rendering surface actually show from it?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-topic-map/tooling.md sections 3, 7, 11, 12 and 19;
rules/rust-quality/docs-and-tracing.md DOC-01; census.md section 2 (top-25 files).
1. Fetch the rustdoc book's summary-line behaviour and confirm whether an over-long
   first sentence is dropped or truncated; fetch clippy's
   too_long_first_doc_paragraph source (200 characters).
2. Hover: fetch the LSP 3.17 hover section in full, rust-analyzer's hover docs,
   pyright's hover behaviour and TypeScript quickinfo; state what each shows (first
   paragraph, whole block, truncation point).
3. Measure first-paragraph length in ocx, grimoire, ocx-sdk-python and grimoire-vscode
   from comment_census.py blocks, p50 and p90 in characters, against 4 reference repos
   under ~/.cache/research-lang/exemplars/code-docs (SHAs in code-docs-audit/exemplars.tsv).
4. Module front pages: in ocx's top-25 files by long-block mass, count modules whose
   module doc says why the module exists against per-function repetition of that why.
5. Fetch Javadoc's summary tag and TypeDoc's @summary docs; decide whether the fleet
   needs an explicit summary override.
Decide: first-paragraph content and length cap per language with the command that
checks it, the override policy, and the module front-page rule for onboarding.
Commands run as written: directory operands, -e for alternatives, no angle-bracket
placeholders.
```

### ratchet — the length caps and the per-package ratchet

Why this wave: the length ratchet is the MUST check the prior critique ranked
above the header regex, and the audits show the naive metrics are met most cheaply
by deleting guards.

#### length-and-ratchet

```
Question: which block-length caps and which per-package ratchet metric hold the line
without being met by deleting guards?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/reference-corpus.md (plain p90 3; doc p90 6
apps, 13.5 libraries; >10-line blocks 0.64 and 5.9 per kLOC), census.md section 2
(ocx 23.2 per kLOC; top-25 files hold 34%), sample.md section 4, human-sample.md
"Compression".
1. Caps: run rules/code-docs/checks/comment_census.py --list-blocks over the 33
   exemplar clones (SHAs in code-docs-audit/exemplars.tsv). For each candidate cap
   (plain 3/5/8 lines; doc 6/10/15/20) report the share of human blocks flagged and
   how many of the 39 human guards it flags. A cap that flags human guards is wrong.
2. Metric: replay ocx's last 6 months at monthly commits and compute four candidates
   per package: ratio, char ratio, blocks over N per kLOC, lines in long blocks.
   Report which moves when an essay is split and which when a guard is deleted.
3. Gaming: show one diff per metric that improves it by deleting a guard, and the
   carve-out that blocks it (guard recogniser, pointer credit).
4. Ambient matching: fetch the charlesjones.dev post quoting Claude Code's "match its
   comment density" prompt; phrase the density rule so it does not contradict it.
5. Reporting: fetch arch-go's compliance-level docs and revive's comments-density
   rule; decide the report format and whether any floor exists.
Decide: caps per register and package kind, the ratchet metric, the baseline file
format, the diff-mode command, and the guard carve-out. Commands run as written:
directory operands, -e for alternatives, xargs -r, no angle-bracket placeholders.
```

### cleanup — the cleanup skill's procedure and safety

Why this wave: the skill is a deliverable, the task it runs is the most
comment-sensitive task measured, agents under-delete, and a cleaning agent is the
same actor that reward-hacks checks.

#### cleanup-procedure

```
Question: what exact procedure does the cleanup skill run so an agent shortens
comments without deleting guards, touching code, or leaving the old text in place?
Worktree: /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs (paths below).
Read first: .agents/research/code-docs-audit/census.md sections 2 and 6 (top-25 sweep
list; history phrases 37% false positive, 37% guards), sample.md sections 3-5, the
adversarial critique in /home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md
(objections 4-6 and 11), and code-docs-topic-map/empirical.md sections 16-17.
1. Decision list: turn sample.md's categories into an ordered per-block decision an
   agent applies (guard, contract, essay, provenance, narration); dry-run it on 10
   blocks from the ocx top-25 files and report disagreements with sample.md labels.
2. Comment-only proof: design a command that fails when a cleanup diff changes any
   non-comment token (compare comment_census.py classify() code lines before and
   after, per file) and test it on a planted diff.
3. Deletion check: fetch CanItDelete (arXiv 2607.28887); design the step proving the
   intended deletions happened, with no old text kept behind a new wrapper.
4. Reason recheck: specify the fresh-context probe run after shortening a guard
   (run_probes.py turn 2 on the edited file) and its pass bar.
5. Safety: fetch METR's 2025 reward-hacking post; decide which paths the skill never
   edits in the same diff (tests, lock scopes, error branches) and the diff check
   that enforces it, not an instruction.
6. Batching: whole-file mass order against touched-files-only, and conflicts with
   in-flight worktrees.
Decide: the step list, each step's verification command, the forbidden-path list with
its check, and the batch policy. Commands run as written: directory operands, -e for
alternatives, xargs -r, no angle-bracket placeholders.
```

## Deferred

| Slug | Why it waits |
|---|---|
| agent-consultation | Answered inside eval-design, not a separate dive. |
| injection-safe-phrasing | Decided here (fact plus consequence, never an instruction); guard-shape confirms or overturns. |
| two-registers | Split between guard-shape (where a guard sits) and interface-leak (what renders). |
| rule-mandated-reasons | Decided here: every lore "comment naming X" clause produces a guard; the amendment pass lists them as protected. |
| what-how-why | A wording choice for the index; no fleet number depends on it. |
| contract-budget | Decided for now by amending DOC-10's scope to published API; reopen in wave 3 if the ratchet dive shows contract blocks dominate the long tail. |
| doc-presence-gaming | No fleet crate enables a presence mandate today. |
| tautology-check | 2.7% of fleet lines; the census can report `informative-docs`-style hits later as an advisory. |
| summary-sentence | Language sets already pin the form; the index routes to them. |
| section-vocabulary | Secondary to the length ratchet; DOC-05's regex fix is a one-line amendment. |
| rewrite-before-comment | The Ousterhout gate and its three substitutions already ship; no fleet measurement would change them. |
| deprecation-markers | No deprecation block in the fleet sample. |
| todo-debt | 1 block in 320; `ponytail:` already resolves itself. |
| directive-reason | Covered by existing family rules. |
| commented-out-code | Rust covered; no fleet occurrence measured elsewhere. |
| call-site-arg-comments | No fleet occurrence measured. |
| jvm-doc-syntax | No JVM code in the fleet. |
| ratio-bands | Answered by `reference-corpus.md`; the bands ship as reference, not target. |
| ambient-density | Folded into length-and-ratchet. |
| census-classifier | Decided here: add a meta scope for `.claude/hooks/` and `rules/*/checks/`, classify PEP 723 `# ///` blocks as directives, exclude vendored and example trees from the exemplar corpus, add a fixture self-test. |
| per-file-concentration | The top-25 sweep order already exploits it. |
| context-cost | The direction is decided without a token measurement. |
| density-age | Answered (H3). |
| essay-split | Folded into routing-table. |
| commit-as-store | Folded into routing-table. |
| rules-as-store | Folded into routing-table. |
| architecture-codemap | No fleet repo has one to measure; revisit after routing-table. |
| test-traceability-ids | Folded into plan-ids. |
| fitness-functions | Sampled guards are local mechanism constraints, not layering. |
| record-format | Describe the fleet's existing hybrid; no new format. |
| record-staleness | The store is healthy today; record-to-code-rot covers the measurable half. |
| record-index | One missing index entry and two cross-repo pointers; pointer-form-and-check handles cross-repo. |
| history-phrasing | Decided: no regex; cleanup-procedure rewrites history-phrased guards in the present tense. |
| harness-scope | Decided here: the rule globs every source extension wherever it sits, agent tooling included. |
| module-front-page | Folded into rendered-summary. |
| docs-quality-boundary | Decided here: code-docs owns text written in source files, including text that renders to help, schemas and hover; docs-quality owns markup files; code-docs cites docs-quality's plain-english limits instead of restating them. |
| wrong-vs-missing | Detectors reach 72-80%: triage signal, not a gate; the argument is already made. |
| cleanup-safety | Folded into cleanup-procedure. |
| rule-artifact-shape | Decided here: one index globbed on source extensions plus depth files; DOC-18..20 amended to supersede by reference with a version bump; `docs-and-tracing.md` stays a routed depth file, so the index, not it, carries the auto-load. |
| agent-comment-trust | Context for wording, not a rule. |
| llm-comment-trend | A ratchet absorbs a moving baseline. |
| landmarking | Four case studies, no baseline. |
| incident-checks | No fleet evidence of either failure mode. |
| model-capability | cleanup-procedure's structural safety covers the practical half. |

## Questions for the owner

1. **Plan-ID minting in the hex harness.** The leak starts where hex-core's
   protocol mints plan-local `C-`/`S-` IDs and asks for them in test names; the fix
   there changes a harness every repo uses and lives outside lore. Default: this
   program bans bare IDs in source and ships a written proposal for hex-core, and
   you decide whether hex changes.
2. **ocx's local `quality-rust.md` § Comment Quality.** It auto-loads on every `.rs`
   edit in ocx and protects the phase markers the lore rule will call narration
   unless they guard something. The fix lands in the ocx repo, not here. Default:
   ocx's section shrinks to a pointer at code-docs in the first ocx cleanup PR.

Decided here, not asked: no fixed comment:code target in the rule (bands ship as
reference, the ratchet holds the line, the eval sets ocx's cut line; the current
estimate is 0.30-0.35); guards phrased as fact plus consequence; rule-mandated reason
comments count as guards; the census classifier fixes; the docs-quality boundary; the
rule artifact shape. Each is listed in [Deferred](#deferred) with its reason.
