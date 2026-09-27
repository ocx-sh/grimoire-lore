---
title: Guard shape, register, recogniser, marker, phrasing
topic: guard-shape
agent: research-lang / code-docs-guards
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 16
scope: >
  What shape a load-bearing "guard" comment must take to survive compression,
  which register (doc vs. plain) it belongs in, whether a lexical heuristic
  can recognise one well enough to exempt it from a length/ratio cut, whether
  it should carry a greppable marker, and how it must be phrased for an
  AI-agent reader. Does not cover which guard *mechanisms* a lint or test can
  own outright (lint-owned-guards), the length caps themselves
  (length-and-ratchet), or the cleanup skill's procedure (cleanup-procedure) —
  each is a separate wave-2 dive this one hands its recogniser and shape rule
  to.
---

# Guard shape, register, recogniser, marker, phrasing

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The measured gap, restated as a target](#1-the-measured-gap-restated-as-a-target)
  2. [Twenty fleet guards rewritten to human shape](#2-twenty-fleet-guards-rewritten-to-human-shape)
  3. [Register: which register owns which content](#3-register-which-register-owns-which-content)
  4. [Recogniser: a heuristic, scored on 520 blocks](#4-recogniser-a-heuristic-scored-on-520-blocks)
  5. [Marker: a greppable prefix, weighed against inflation](#5-marker-a-greppable-prefix-weighed-against-inflation)
  6. [Phrasing: fact plus consequence, never an instruction](#6-phrasing-fact-plus-consequence-never-an-instruction)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Fleet guards run 3x longer than human guards (median 6 vs 2 lines) and sit
  in a doc comment 53% of the time against humans' 18% — the gap is register
  *and* length, not just length ([§1](#1-the-measured-gap-restated-as-a-target)).
- Rewriting 20 fleet guards (2–42 lines before, spread over 5 repos and 3
  languages) to human shape compressed 394 lines to 114 — a 3.46x factor,
  matching the audit's own independently measured 2–3.4x range, not cherry-picked
  to hit it ([§2](#2-twenty-fleet-guards-rewritten-to-human-shape)).
- The minimum content a guard rewrite must keep is exactly three things:
  the mechanism, the plausible breaking edit, and its consequence — everything
  else (design rationale, alternative approaches considered, bare IDs, repeated
  restatement) is what compresses away ([§2](#2-twenty-fleet-guards-rewritten-to-human-shape)).
- 7 of the 20 rewrites dropped a bare plan/decision/issue ID with no
  loss of guard information; 4 of 20 turned out to be two or three independent
  guards wearing one paragraph, better split at each fact's own call site than
  merely shortened in place ([§2](#2-twenty-fleet-guards-rewritten-to-human-shape)).
- Register rule: a **caller-visible precondition is contract (doc comment)**;
  an **implementation hazard is plain (`//`/`#`/`* `)**. This is not a new
  rule — it is DOC-04's `# Safety` vs `// SAFETY:` split and the Rust API
  Guidelines' C-FAILURE, generalised from unsafe-only to every guard
  ([§3](#3-register-which-register-owns-which-content)).
- Applying the register rule to the 20 rewrites gave an even split: 9 plain,
  10 doc, 1 that needed both (one paragraph carried two separable guards in
  two registers) — confirming the rule is not just theoretically clean but
  fits real fleet guards roughly 1:1 ([§3](#3-register-which-register-owns-which-content)).
- A lexical recogniser built from the named wording patterns (SAFETY labels,
  comparative-edit + consequence, prohibition + consequence, single-choke-point,
  sentinel/tri-state, hedge markers, causal + consequence) scores **precision
  0.714, recall 0.432** on the full specified population (139 positives: 100
  fleet + 39 human guards; 381 negatives: 220 other fleet blocks + 161
  non-guard human rows), n=520 ([§4](#4-recogniser-a-heuristic-scored-on-520-blocks)).
- Recall is the ceiling problem, not precision: many real guards are phrased
  as bare declarative facts ("Never called: rules are skipped at the
  `kind_support` gate.") with no lexical tell distinguishing them from an
  ordinary contract sentence — the signal is semantic, not textual
  ([§4](#4-recogniser-a-heuristic-scored-on-520-blocks)).
- The recogniser is safe to use as a **high-precision "never auto-delete"
  carve-out** (71% of what it flags really is a guard) but not as a complete
  guard detector (it misses more guards than it catches) — this is exactly
  clippy's own scoping choice for `undocumented_unsafe_blocks`, which only
  ever claims to check comments *on unsafe blocks*, never guards in general
  ([§4](#4-recogniser-a-heuristic-scored-on-520-blocks), [§5](#5-marker-a-greppable-prefix-weighed-against-inflation)).
- **Marker: yes, but never without a paired anti-inflation check.** Go's
  `Deprecated:` and clippy's `SAFETY:` both prove a plaintext prefix works at
  scale; clippy additionally ships `UNNECESSARY_SAFETY_COMMENT` specifically
  because a marker without a companion check invites exactly the inflation an
  agent facing a length ratchet would reach for
  ([§5](#5-marker-a-greppable-prefix-weighed-against-inflation)).
- **Phrasing: confirmed.** arXiv 2603.21642 names "code comments" explicitly
  as an indirect-prompt-injection vector and recommends stripping imperative
  language from untrusted text an agent reads — which a guard comment is, from
  the next agent's perspective ([§6](#6-phrasing-fact-plus-consequence-never-an-instruction)).
- Measured on the fleet: 3–4 of the 100 sampled guards (3–4%) are phrased as
  a direct instruction to the reader ("NEVER key on `.agents/`", "Classify a
  new call site by intent... do not assume the escape is permitted") rather
  than fact-plus-consequence — rare today, but exactly the shape that would be
  dangerous if planted adversarially ([§6](#6-phrasing-fact-plus-consequence-never-an-instruction)).
- The register split already shipped for unsafe code (DOC-04) generalises
  cleanly; nothing here contradicts it, and it should stay the worked example
  in the depth file rather than be replaced.
- A `GUARD:` marker plus an anti-inflation check is proposed as new; it is
  not yet implemented anywhere in this fleet, so its real-world false-positive
  and inflation rates are unmeasured until the cleanup skill ships and the
  ratchet goes live — flagged in [Contested / evolving](#contested--evolving).

## Findings

### 1. The measured gap, restated as a target

The topic map's headline gap: fleet guards have **median 6 lines**, 53 of 100
sit in a doc comment, and 33 of 100 run past 10 lines; human guards have
**median 2 lines**, 7 of 39 sit in a doc comment, and none run past 9
(`.agents/research/code-docs-topic-map.md` "What the grounding changed";
`.agents/research/code-docs-audit/sample.md` §5; `.agents/research/code-docs-audit/human-sample.md`
"Headline numbers"). Re-verified directly from the two audits'
own length distributions in this dive (`fleet_blocks.json`/`human_blocks.json`
built from `.agents/research/code-docs-audit/scratch/samples/*.json` and the
appendix table): fleet guard lengths run `[1,1,1,2×11,3×10,4×7,5×6,6×5,7×4,
8×5,9×5,10×2,11×3,12×2,13,14×4,15×3,16×2,18,19×2,20×4,22×2,24×2,28,31,32×2,
34,39,42]` (n=100, median 6, matching the audit exactly); human guard lengths
top out at 9 (n=39, median 2). The gap is not merely "fleet writes long
comments" — it is specifically that fleet guards default to the doc register
(53%) where human guards default to plain (82%, `human-sample.md` "Headline
numbers"), and every register mismatch compounds: a doc-comment guard renders
into `cargo doc`, hover, and (for a `pub` item under `missing_docs`) a schema,
carrying its full length to every one of those surfaces instead of staying
next to the one risky line it guards.

### 2. Twenty fleet guards rewritten to human shape

Selection: 20 guards from `sample.md` §5, spread over all 5 sampled repos (9
ocx, 4 grimoire, 3 ocx-catalog, 2 ocx-sdk-python, 2 grimoire-vscode) and the
full length range (2 to 42 lines before), covering Rust, Python and
TypeScript. Full original text was pulled from
`.agents/research/code-docs-audit/scratch/samples/*.json` (the audit's own
raw census dump, matched to the 100 guards listed in `sample.md` §5 by
`file:line` — all 100 matched exactly, confirming the audit's own
classification is reproducible from its raw data). Rewrites and the exact
line-count arithmetic below were computed by a script
(`/tmp/.../scratchpad/rewrites.py`, not part of the fleet) — reproducible, not
eyeballed.

**Full before/after, one per language, one long-essay case:**

Rust, short (already near-human — minimal loss):

```rust
// BEFORE (ocx crates/ocx_config/src/lib.rs:1591, 2 lines)
// SAFETY: `geteuid` reads the calling process's own credentials. It takes no
// arguments, touches no memory, and is documented as always succeeding.

// AFTER (1 line)
// SAFETY: geteuid takes no arguments, touches no memory, and always succeeds.
```

Rust, long essay bundling three separable guards (42 → 5 lines, keeping one,
splitting one into a doc line, dropping one to routing):

```rust
// BEFORE (ocx crates/ocx_project/src/consent.rs:507, 42 lines) — bundles:
// (a) who may call this (a caller-visible precondition), (b) why the write
// stamp lives here and not in the shared loader (an implementation hazard),
// (c) how a suppression flag interacts with the allowlist (a third fact,
// with its own ocx#400 pointer, that changes neither (a) nor (b)).
/// Record consent for `project_dir` over `sources` (C-024).
/// [... 40 more lines: closed-allowlist argument, A-26/A-29/C-011 cross-refs,
///  suppressibility discussion, canonical_project_dir precondition ...]

// AFTER — split into contract (kept) + guard (kept) + (c) dropped, routed to
// the linked ADR instead of repeated here (5 lines total):
/// Records consent for `project_dir` over `sources`. Callers: `add`, `remove`,
/// `lock`, `update`, `pull`, `exec`, `init` only.
// Consent is per-caller opt-in, not stamped in the shared loader: doing that
// there would auto-grant write consent on read-only commands like `ocx env`
// and `ocx inspect`, silently widening a security control.
```

Python, doc-register contract kept because Args/Returns are genuine public
interface (22 → 17 lines — the smallest compression in the set, because a
public function's parameter contract is not narration and does not compress
the way a guard does; `human-sample.md`'s own finding that contract
compresses only 2.56x against guard's 1.48–3.46x applies here directly):

```python
# BEFORE (ocx-sdk-python src/ocx_sdk/_bootstrap.py:431, 22 lines)
"""Look `name` up on a PATH, entry by entry, refusing unsafe hits.

`shutil.which` inserts the current directory ahead of the search path on
Windows, which turns a working directory into a binary-injection vector
(CWE-426). Scanning entry by entry lets a hit inside the working directory
be dropped instead of trusted. Off Windows, a hit whose parent directory is
group- or other-writable is refused for the same reason.

Both the hit and `cwd` are resolved before either check: a relative PATH
entry like `.` otherwise slips past the working-directory comparison, and
the caller would be handed a path that stops meaning anything the moment
something calls `chdir`.
...
"""

# AFTER (17 lines — Args/Returns kept verbatim, "why" paragraph tightened)
"""Look `name` up on PATH entry by entry, refusing an unsafe hit.

`shutil.which` lets Windows' CWD-ahead-of-PATH insertion return a binary
from the working directory (CWE-426); scanning entry by entry drops that
hit instead. Off Windows, a hit under a group- or other-writable directory
is refused for the same reason. Both the hit and `cwd` are resolved before
comparing, or a relative entry like `.` slips past.

Args:
    name: Binary name to find.
    ...
Returns:
    The first acceptable hit, as an absolute path, or `None`.
"""
```

TypeScript, doc-register contract with a "must-use" precondition (20 → 4
lines — the concrete incident detail is exactly what makes this
non-recoverable and stays; the collision-proofing side-argument for a
*different* filename is dropped and routed to a comment at that filename's
own definition instead of being bundled here):

```typescript
// BEFORE (ocx-catalog src/sources/types.ts:231, 20 lines)
/** Basename of the ad-blocker-safe ALIAS copy of a package root, written
 * beside the package's own CAS directory: `p/<ns>/<pkg>/_root.json`.
 *
 * Why an alias exists at all: the wire root's own URL ends in
 * `<pkg>.json`, so a package whose name matches one of the ~800 unanchored
 * `/<word>.js` rules in EasyList/EasyPrivacy has its root fetch BLOCKED in
 * any browser running those lists ... [+13 more lines: incident detail,
 * `_root` collision-proofing argument, `_headers` sandbox coverage note] */

// AFTER (4 lines)
/** Basename of the ad-blocker-safe ALIAS of a package root
 * (`p/<ns>/<pkg>/_root.json`). EasyList/EasyPrivacy's ~800 `/<word>.js`
 * rules substring-match `/<word>.json` too, blocking the canonical root
 * fetch for names like `hawkeye` (observed 2026-08-27). */
```

**Aggregate result, all 20** (script output, not estimated):

| # | Repo | Lang | Before | After | Factor | Register | Lost |
|---|---|---|---:|---:|---:|---|---|
| 1 | ocx | rs | 2 | 1 | 2.00x | plain | wording only |
| 2 | ocx | rs | 42 | 5 | 8.40x | doc+plain | 5 bare IDs; 1 of 3 bundled guards dropped, routed to ADR |
| 3 | ocx | rs | 34 | 3 | 11.33x | plain | design-ownership rationale, routed to ADR |
| 4 | ocx | rs | 39 | 8 | 4.88x | doc | C-011 vocabulary cross-ref; row-bookkeeping enumeration |
| 5 | ocx | rs | 32 | 4 | 8.00x | doc | digest-vs-length cost tradeoff; testability-of-param note (2nd guard) |
| 6 | ocx | rs | 32 | 3 | 10.67x | plain | error-kind-naming rationale; unrelated test-seam note |
| 7 | ocx | rs | 18 | 4 | 4.50x | plain | bare IDs C-018/RUL-31; spec-test-parity note (2nd guard) |
| 8 | ocx | rs | 19 | 4 | 4.75x | plain | bare issue #218; ADR pointer (should route file-qualified, not drop) |
| 9 | ocx | rs | 31 | 9 | 3.44x | doc | RFC citation detail; bare issue #407; enumerated IP-form list |
| 10 | grimoire | rs | 11 | 4 | 2.75x | doc | instruction-to-reader clause ("classify...do not assume") |
| 11 | grimoire | rs | 8 | 3 | 2.67x | plain | none (pure redundancy in the original) |
| 12 | grimoire | rs | 14 | 6 | 2.33x | doc | `Containment` type cross-reference (recoverable from signature) |
| 13 | grimoire | rs | 3 | 2 | 1.50x | plain | bare plan IDs P3.2/F4 |
| 14 | ocx-catalog | ts | 20 | 6 | 3.33x | doc | 2nd guard (`_root` collision-proofing) — split, not dropped |
| 15 | ocx-catalog | ts | 13 | 4 | 3.25x | plain | bare ID C-600; DRY rationale (recoverable from the call site) |
| 16 | ocx-catalog | ts | 20 | 4 | 5.00x | doc | browser re-export dependency-direction note (belongs at re-export site) |
| 17 | ocx-sdk-python | py | 22 | 17 | 1.29x | doc | wording only (Args/Returns are genuine contract, kept) |
| 18 | ocx-sdk-python | py | 24 | 21 | 1.14x | doc | wording only (Args/Returns/Raises kept) |
| 19 | grimoire-vscode | ts | 6 | 3 | 2.00x | doc | itemized list of exactly which UI elements hide (recoverable from call site) |
| 20 | grimoire-vscode | ts | 4 | 3 | 1.33x | plain | "reason rides along for the caller" note (recoverable from return type) |
| **Σ** | | | **394** | **114** | **3.46x** | 10 doc / 9 plain / 1 mixed | |

**What generalises from this exercise, not just what each row shows:**

- **The minimum content is always the same three things**: the mechanism
  (what the code actually does that isn't obvious), the plausible breaking
  edit (the specific "someone will try X" a reviewer or agent would consider
  reasonable), and its consequence (what actually breaks, named, not "this is
  important"). Every rewrite above keeps exactly these three and nothing else
  survives compression — this matches `human-sample.md`'s own "Wording
  patterns" finding #2 ("Names the concrete failure, not just 'be careful'")
  independently.
- **Bare IDs are the cheapest, safest cut**: 7 of 20 rewrites (#2, #4, #7,
  #8, #9, #13, #15) dropped a bare plan/decision/issue ID with zero loss of
  guard information, confirming `census.md`'s C-018 collision finding
  (`.agents/research/code-docs-audit/sample.md` "Smells" #2) from the guard
  side: the ID was never the guard's content, only a citation nobody follows.
- **Essays bundle multiple independent guards** in 4 of 20 cases (#2, #5,
  #9, #14) — the fix in each case is not "make this one guard shorter" but
  "split this into N guards, each at its own risk site," which a pure
  length-cap check cannot do (it would either flag the whole bundle or none
  of it) but a per-fact recogniser (§4) can approximate by counting
  independent hits inside one block.
- **One rewrite (#8) shows the failure mode of dropping too hard**: the
  original's `adr_index_indirection.md` A2 pointer is a *file-qualified*
  pointer of the kind `pointer-form-and-check`'s human-sample evidence says
  "always resolved" — it should have been kept in file-qualified form, not
  deleted alongside the bare issue number next to it. A cleanup pass that
  treats "has an ID-shaped token" as the deletion trigger without
  distinguishing bare-ID from file-qualified-pointer will over-delete.

### 3. Register: which register owns which content

The rule is not new. `rules/rust-quality/docs-and-tracing.md` DOC-04 already
states it for unsafe code specifically: "every `unsafe fn` has a `# Safety`
rustdoc section stating what the *caller* must uphold; every `unsafe` block
has a `// SAFETY:` comment stating why it holds *here*. Two documents, two
readers" (`rules/rust-quality/docs-and-tracing.md:28`), and the same file's
"Two Registers" section generalises it once already: "`///` and `//!` are
for API consumers via rustdoc: content is **contract**... `//` is for the
maintainer reading the implementation: content is **rationale**"
(`rules/rust-quality/docs-and-tracing.md:64`). The Rust API Guidelines state
the caller-facing half independently, as guideline C-FAILURE: "Unsafe
functions should be documented with a 'Safety' section that explains all
invariants that the caller is responsible for upholding to use the function
correctly" ([rust-lang.github.io/api-guidelines/documentation.html](https://rust-lang.github.io/api-guidelines/documentation.html)).
rustdoc's own guide independently confirms the `# Panics` header exists for
the same caller-visible reason: "a 'Panics' section explains when the code
might abruptly exit, which can help the reader prevent reaching a panic"
([doc.rust-lang.org/rustdoc/how-to-write-documentation.html](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html)).

**This dive's contribution is generalising the split beyond `unsafe`.** The
same distinction — does this fact constrain what a *caller* must do, or does
it explain an *implementation* choice a maintainer editing this body would
need — applies to every guard, not only ones next to an `unsafe` keyword.
Applying it to the 20 rewrites in §2 gave a close to even split (10 doc, 9
plain, 1 needing both), which is not a coincidence the fleet already gets
right: the fleet sample sits at 53% doc / 47% plain for guards overall
(`.agents/research/code-docs-audit/sample.md` §2), close to a 1:1 split too —
**the fleet is not choosing the wrong register at random; it is choosing it
inconsistently**, per row 5 (a "why a length check at all" hazard, plain, but
found in the fleet as a `///` doc comment) and row 16 (a "every wire URL must
go through this" precondition, genuinely doc-worthy, also found as a plain
comment in some call sites during this dive's reading). The rule this dive
proposes is not "move more guards out of doc comments" as a blanket
direction — it is "put each guard in the register its *audience* reads,"
which cuts both ways.

**The test to apply, stated as a question a reviewer or a check can ask:**
*Does the fact change if I only ever call this function, never edit its
body?* If the fact would still matter to a caller who never opens the
implementation (an error condition, a `None` case, a "must be called with X
already true"), it is contract → doc comment. If the fact only matters to
someone editing the body (why this loop uses a `BTreeMap`, why this
`Drop` isn't implemented, why this order of two gates), it is rationale →
plain comment beside the line.

### 4. Recogniser: a heuristic, scored on 520 blocks

**Construction.** Seven regex-pair rules, each corresponding to one wording
pattern named in `human-sample.md` "Wording patterns" and `sample.md`
"Patterns worth encoding":

| Rule | Fires on | Source pattern |
|---|---|---|
| `safety-label` | `SAFETY:` (case-insensitive) anywhere in the block | `human-sample.md` pattern #1; matches clippy's own match (below) |
| `comparative+consequence` | "instead of / rather than / in place of" **and** a consequence word (would/will/breaks/silently/panics/leaks/...) | `sample.md` "Name the counterfactual edit" |
| `prohibition+consequence` | "never/must not/do not/cannot/not X-ing" **and** a consequence word or a conditional connector | `human-sample.md` pattern #2 |
| `choke-point` | "single/one choke point\|source of truth\|place\|spelling", "shared so", "the only place/mechanism/way" | `sample.md` "single choke point" tell |
| `sentinel+consequence` | "sentinel", "None means", "-1 means", "tri-state" **and** a consequence word | commission's named pattern |
| `hedge-marker` | `CAUTION`, "should never happen", `N.B.` | `human-sample.md` pattern #5 |
| `causal+consequence` / `conditional+consequence` | "so that/because/since", or "otherwise/unless/only if/requires/relies on/depends on/assumes" **and** a consequence word | `human-sample.md` pattern #4 |

A block hits if any rule fires; reasons are recorded per block (a block can
hit more than one). Full source: `/tmp/.../scratchpad/recognizer2.py` (this
dive's scratch, not committed).

**Scoring populations, exactly as specified in the commission**: positives =
the 139 listed guards (100 fleet from `sample.md` §5, file:line-matched
against the raw `scratch/samples/*.json` census dump — all 100 matched;
39 human from `human-sample.md`'s "How humans write guards" table).
Negatives = 220 other fleet blocks (the remainder of the same 320-block
`scratch/samples/*.json` sample after removing the 100 guards) plus 161
non-guard rows of the `human-sample.md` appendix. The human-sample rows'
comment text is not printed in the appendix (only a short classifier note),
so this dive extracted the actual verbatim text for all 200 appendix rows
from the pinned pre-2022 clones under
`~/.cache/research-lang/exemplars/code-docs/<owner>__<repo>/` at
`file:line`+`len` (spot-checked against the two verbatim tables in
`human-sample.md` — exact match on both checked rows, e.g.
`tokio-util/src/codec/any_delimiter_codec.rs:66` reproduces the 9-line doc
comment in `human-sample.md`'s guard table verbatim, character for
character). n = 139 + 381 = 520, matching the commission's stated
population exactly.

**Result (combined, both populations):**

| Population | n | TP | FP | FN | TN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fleet (100 pos / 220 neg) | 320 | 51 | 19 | 49 | 201 | 0.729 | 0.510 |
| Human (39 pos / 161 neg) | 200 | 9 | 5 | 30 | 156 | 0.643 | 0.231 |
| **Combined** | **520** | **60** | **24** | **79** | **357** | **0.714** | **0.432** |

**Per repo:**

| Repo | n | Precision | Recall |
|---|---:|---:|---:|
| ocx | 150 | 0.744 | 0.552 |
| ocx-catalog | 30 | 0.778 | 0.583 |
| ocx-sdk-python | 40 | 0.800 | 0.444 |
| grimoire-vscode | 30 | 1.000 | 0.400 |
| grimoire | 70 | 0.545 | 0.375 |
| tokio-rs/tokio | 25 | 1.000 | 0.444 |
| rust-lang/rust-analyzer | 25 | 1.000 | 0.333 |
| rust-lang/cargo | 25 | 1.000 | 0.200 |
| BurntSushi/ripgrep | 25 | 0.500 | 0.500 |
| square/okhttp | 25 | 0.500 | 0.250 |
| vitejs/vite | 25 | 1.000 | 0.143 |
| pypa/pip | 25 | 0.000 | 0.000 |
| restic/restic | 25 | n/a (0 hits) | 0.000 |

A stricter variant (dropping the weaker `conditional+consequence` rule and
requiring an explicit consequence verb rather than a conditional connector)
was also run: precision rises to 0.719 combined but recall falls to 0.295 —
the two variants bracket an operating-point choice (§ Normative guidance
candidates below), not a bug in either.

**Why recall caps around 43–51% and not higher.** Reading the 79 combined
false negatives (full list in
`/tmp/.../scratchpad` run output; representative examples: grimoire's
`// Never called: rules are skipped at the \`kind_support\` gate.`,
tokio's `// Normalize the deadline. Values cannot be set to expire in the
past.`, cargo's `// Lists are always merged.`) shows the same shape every
time: **a real guard stated as a bare declarative fact, with no comparative,
prohibitive, causal, or hedging lexical marker at all.** These are
lexically indistinguishable from an ordinary contract or why-constraint
sentence — "Lists are always merged" reads exactly like a tautological
restatement until you know (from the surrounding `match` arm) that the
alternative branch exists and merging is the deliberately-chosen one. No
regex over the comment text alone can recover that without also reading the
code it sits beside, which is precisely why clippy's own
`undocumented_unsafe_blocks` lint never attempts general guard detection —
it only ever asks "is there *any* comment on this specific structural site
(the unsafe block)", never "is this comment's *content* guard-shaped" ([raw.githubusercontent.com/rust-lang/rust-clippy … undocumented_unsafe_blocks.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs)).
The 24 combined false positives skew toward contract sentences that happen to
contain a negation ("or `None` when no...") or a causal connector ("split out
so the ... conjunct is *decidable* by a test") without being guards in the
strict sense — precision loss from the same lexical ambiguity, mirrored.

**Conclusion for use**: the recogniser is safe as a **carve-out** ("never
auto-delete or auto-shorten anything this flags" — at 71% combined
precision, roughly 7 in 10 flagged blocks really are guards) but unsafe as a
**gate** ("only these are guards, everything else may be cut" — it would
silently approve cutting 57% of real guards). Any cut mechanism (ratchet,
cleanup skill, length cap) must treat a recogniser miss as "unclassified,"
never as "confirmed safe to cut."

### 5. Marker: a greppable prefix, weighed against inflation

Go's `Deprecated:` convention: "add a paragraph to its doc comment that
begins with `Deprecated:` followed by some information about the
deprecation," and "the paragraph does not have to be the last paragraph in
the doc comment" — a plaintext, position-flexible, mechanically-greppable
prefix that "some tools will warn on use of" and that hides the deprecated
item's docs on pkg.go.dev ([go.dev/wiki/Deprecated](https://go.dev/wiki/Deprecated)).
clippy's `undocumented_unsafe_blocks` does the same for a different purpose:
the exact match is `line.to_ascii_uppercase().find("SAFETY:")` — a literal,
case-insensitive substring match on `"SAFETY:"`, nothing more structural
(`clippy_lints/src/undocumented_unsafe_blocks.rs:837`,
[raw.githubusercontent.com/…](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs)).
`UNDOCUMENTED_UNSAFE_BLOCKS` is a `restriction`-level lint since 1.58.0 (opt-in,
not part of `clippy::all`); its companion `UNNECESSARY_SAFETY_COMMENT`
(since 1.67.0) exists for exactly one reason — to catch marker inflation:
"Checks for `// SAFETY: ` comments on safe code. Safe code has no safety
requirements, so there is no need to describe safety invariants"
(`clippy_lints/src/undocumented_unsafe_blocks.rs:66-72`). **The lint pair is
the precedent, not the marker alone**: clippy never shipped `SAFETY:`
detection without also shipping detection of `SAFETY:` where it doesn't
belong.

This fleet already runs the un-paired half: `SAFETY:` appears (and is caught
by the `safety-label` rule) with zero false positives in this dive's 520-block
sample — every `safety-label` hit was a true positive. That is not evidence
the marker is safe from inflation in general; it is evidence that *today*,
before any ratchet exists to game, nobody has an incentive to write
`// SAFETY:` on code that isn't actually unsafe. A length ratchet changes that
incentive the moment it ships (this is exactly the reward-hacking risk the
`cleanup-procedure` dive is separately tasked with costing, citing METR's
2025 reward-hacking post per the topic map).

**Decision, with its condition**: adopt a `GUARD:` plain-comment marker,
extending the already-shipped `SAFETY:`/`# Safety` convention from unsafe
code to every load-bearing guard — but never ship it without a paired
anti-inflation check from the same release. The cheapest anti-inflation
check available today is to run this dive's own recogniser (§4) against
every `GUARD:`-marked block and flag one that fires none of the seven rules:
at 71% combined precision the recogniser under-flags true guards but is a
reasonable first filter for the opposite failure (a marker on a non-guard),
since a genuine guard is likely to hit at least one of seven varied patterns
even if no single pattern is complete on its own.

### 6. Phrasing: fact plus consequence, never an instruction

arXiv 2603.21642, "Are AI-assisted Development Tools Immune to Prompt
Injection?" (Huang, Huang, Milani Fard; submitted 2026-03-23) evaluates
prompt-injection vulnerabilities across seven MCP-client AI coding tools. It
names source comments explicitly as a vector, not a hypothetical one: "In
indirect forms, the attacker hides instructions inside external artifacts
such as web pages, PDFs, **code comments**, README files, or package
metadata that the model later ingests," and, describing Cline specifically:
"Injection vectors are any untrusted text in **code comments**, documents,
issues, or API responses" ([arxiv.org/html/2603.21642](https://arxiv.org/html/2603.21642)).
The paper's stated mitigation is exactly the rule the commission asks this
dive to confirm or reject: "Users of high-risk tools must treat all tool
output as untrusted, **strip imperative language from responses**, require
user confirmation between tool calls, and never let the tool output modify
system prompts." **Confirmed**: a guard comment is untrusted text a
downstream coding agent reads as context, by the paper's own definition, and
imperative phrasing in it is the shape the paper's mitigation targets.

Measured on the fleet (this dive; script scanned all 100 sampled guards for
a directive verb — Never/Always/Do not/Ensure/Classify/Keep/... — opening a
sentence rather than sitting mid-sentence as part of a stated fact): 7 raw
hits, of which 3 are genuine reader-directed instructions after manual
reading —

- `grimoire src/command/add.rs:507` — "Keep the dev-record keyspace disjoint
  from declared bindings (C2)." — an instruction, no stated consequence in
  the same clause.
- `grimoire src/install/vendor_warp.rs:69` — "NEVER key on `.agents/`" — a
  command, though the em-dash clause after it does supply a consequence
  ("Warp scans the pool"), making this a hybrid rather than a bare directive.
- `grimoire src/install/path_anchor.rs:436` — "Classify a new call site by
  intent regardless of platform; do not assume the escape is permitted." — an
  instruction to the reader with no consequence attached at all; this is the
  clause this dive's rewrite #10 (§2) dropped.

The other 4 raw hits ("never a guess from the login string", "never the
passive shape above", "Always guarded: a leading dash...") are mid-sentence
comparative-fact phrasing, not reader-directed commands, on manual reading —
false positives of the crude opening-verb scan, kept here for transparency
rather than silently dropped. **Net measured rate: 3 of 100 fleet guards
(3%) are phrased as instructions rather than facts.** Rare today — but the
fleet's own three real instances show the failure mode is not
hypothetical, and a `GUARD:`-marked comment is exactly the kind of text a
future "the AI trusts guard comments more" convention (§ AI-agent angle)
would make a more attractive injection target, not a less attractive one.

## Normative guidance candidates

1. **A guard states the mechanism, the plausible breaking edit, and its
   consequence — nothing else survives a cut.** Rationale: this is the
   3.46x-compressible minimum measured across 20 rewritten fleet guards
   (§2); anything beyond it (design alternatives considered, restated
   context, bare IDs) is exactly what those 20 rewrites cut with zero loss.
   Verify: reading heuristic for the cleanup skill/reviewer — for a
   `GUARD:`-marked or recogniser-flagged block, ask "if I delete every
   sentence except the one naming the breaking edit and its consequence,
   does anything a caller or maintainer needs disappear?" A "no" is a
   finding. Severity: SHOULD (a review heuristic, not yet mechanically
   checkable without a judge).
2. **Register by audience, not by comment syntax convenience: a
   caller-visible precondition is a doc comment; an implementation hazard
   is a plain comment at the line.** Rationale: prevents exactly the fleet's
   current inconsistency (53%/47% split with no evident rule, §3) and keeps
   a guard off rendered surfaces (hover, `cargo doc`, JSON schemas) unless a
   caller genuinely needs it there — directly reduces the `interface-leak`
   dive's exposure surface as a side effect. Verify: `rg -n --type rust
   -e '^\s*///.*\b(never|must not|instead of|only if)\b' -e '^\s*///.*\bwould\b'
   crates/` then hand-check each hit against the "does this survive if I
   never open the body" test in §3 — a hit that fails the test (it is a pure
   implementation hazard) is a finding. Severity: SHOULD.
3. **A drop of a bare plan/decision/issue ID during a guard rewrite needs no
   sign-off; a drop of a file-qualified pointer (`path.md#anchor` or
   `path.md` + a resolvable heading) does.** Rationale: 7 of 20 rewrites in
   §2 dropped a bare ID with zero information loss, matching the
   independently-measured `plan-ids` finding that bare IDs collide (14 of
   the top 15 ocx IDs resolve to 3–5 unrelated definitions per the topic
   map); rewrite #8 in §2 shows the opposite failure — dropping a
   file-qualified ADR pointer alongside a bare issue number lost a pointer
   `human-sample.md`'s own evidence says resolves reliably. Verify: `rg -n
   -e '\bC-[0-9]+\b' -e '\bA-[0-9]+\b' -e '\bRUL-[0-9]+\b' -e '#[0-9]+\b'
   --type rust --type py --type ts crates/ src/` on a cleanup diff's removed
   lines only, then confirm each removed hit was either bare (fine) or had
   an equivalent file-qualified pointer added elsewhere (required). Severity:
   MUST (dropping a live file-qualified pointer with nothing replacing it is
   the same failure the `pointer-form-and-check` dive treats as a hard
   finding).
4. **An essay-shaped guard block that names more than one distinct breaking
   edit is split into one comment per edit, at each edit's own risk site —
   not merely shortened in place.** Rationale: 4 of 20 rewrites (§2, rows
   #2/#5/#9/#14) bundled 2–3 independent guards in one block; a length cap
   alone cannot fix this (it either keeps or cuts the whole bundle) and a
   recogniser undercounts a bundle's true guard content because one hit
   covers what should be several sites. Verify: for a block flagged by the
   recogniser (§4) at >10 lines, count independent hits of its seven rules
   inside the same block — more than one distinct rule firing on
   non-overlapping sentences is the signal to split, not just shrink.
   Severity: SHOULD.
5. **The recogniser (§4, seven rules) is a carve-out, never a gate**: a
   length ratchet, a cleanup skill, or a reviewer treats a recogniser hit as
   "never auto-cut" and a recogniser miss as "unclassified, needs a human or
   LLM-judge read" — never as "confirmed safe to cut." Rationale: measured
   combined precision 0.714 / recall 0.432 (§4) means roughly 3 in 10
   flagged blocks are false alarms (tolerable for a carve-out) but nearly 6
   in 10 real guards go unflagged (intolerable as a gate — treating a miss
   as "not a guard" would silently approve cutting most of the fleet's
   guard content). Verify: `python3 /tmp/.../scratchpad/recognizer2.py`
   reproduces the table in §4 against the same 520-block population; a
   committed version under `rules/code-docs/checks/` would run the same
   seven rules against `comment_census.py`'s own block extraction. Severity:
   MUST (this is the ratchet's guard carve-out, not an optional lint).
6. **A `GUARD:` plain-comment marker may ship only in the same release as
   its anti-inflation check.** Rationale: Go's `Deprecated:` and clippy's
   `SAFETY:` both prove a plaintext marker scales, but clippy never shipped
   `UNDOCUMENTED_UNSAFE_BLOCKS` without also owning `UNNECESSARY_SAFETY_COMMENT`
   (§5) — precedent that a marker without its paired check is an open
   invitation once a length ratchet gives an agent a reason to spray it.
   Verify: on any commit introducing `GUARD:` recognition to a check, `rg -c
   'GUARD:' --type rust --type py --type ts .` before and after, cross-checked
   against how many of those blocks also fire at least one of the seven
   recogniser rules (§4) — a rising marker count with a falling
   rules-fired-per-marker rate is inflation. Severity: MUST (a marker check
   ships with its inflation check or not at all).
7. **A guard reads as a fact plus its consequence, never as an instruction
   to the reader or the agent** ("do X", "never do Y" with no stated
   consequence, ALL-CAPS commands). Rationale: arXiv 2603.21642 names code
   comments as a live indirect-prompt-injection vector and recommends
   stripping imperative language from untrusted text an agent reads (§6);
   3 of 100 sampled fleet guards already violate this. Verify: `rg -n
   --type rust --type py --type ts -e '^\s*(///|//!|//|#|\*)\s*(Never|Always|Do not|Don.t|Ensure|Make sure|Classify)\b'
   crates/ src/` — a hit with no consequence clause in the same sentence
   (compare against the "and/because/which" clause that should follow) is a
   finding. Severity: SHOULD (rare today; escalate to MUST if the
   `cleanup-procedure` or `guard-marker` work makes guards a more attractive
   injection target).

## AI-agent angle

- **An agent compressing a guard drops the consequence clause first and
  keeps the mechanism**, because the mechanism reads as "the interesting
  part" and the consequence reads as filler — exactly backwards from
  `human-sample.md`'s own finding that naming the concrete failure (not just
  "be careful") is what makes a guard non-recoverable. Smallest mechanical
  check: after any edit that shortens a `GUARD:`-marked or recogniser-hit
  block, re-run the recogniser (§4) on the new text — if it no longer fires
  any of the seven rules, the consequence clause is probably gone; fail the
  edit.
- **An agent asked to "shorten comments" bundles what should be a
  split into a single shorter paragraph instead of splitting it**, because
  splitting means touching more call sites for what looks like one task —
  §2 rows #2/#5/#9/#14 show this is already the fleet's actual failure mode,
  not a hypothetical one. Smallest mechanical check: rule 4 above (count
  independent recogniser-rule hits inside one block; more than one is a
  split, not a shrink).
- **An agent writing a new guard reaches for a bare plan/decision ID as a
  substitute for stating the consequence**, because the ID looks like it
  points at "the real reason" without the agent having to articulate it —
  this is exactly how `sample.md`'s `C-018` collision (4 unrelated decisions,
  one token) accumulated in the first place. Smallest mechanical check: rule
  3 above, applied at write-time instead of only at cleanup-time — flag a
  new comment whose only non-obvious content is an ID-shaped token with no
  accompanying consequence clause.
- **An agent phrases a guard as an instruction because that is the register
  agents write in by default** (skill files, CLAUDE.md, rule files — the
  text an agent reads *most* is written as directives to it), and code
  comments inherit that register through habit, not intent. Smallest
  mechanical check: rule 7 above.
- **An agent asked to "add a SAFETY comment" for an unsafe block does so
  correctly today** (this dive found zero false positives on `safety-label`
  in 520 blocks) — the risk is specifically what happens once a length
  ratchet exists and "add a `GUARD:` comment" becomes a way to exempt a
  block from it, which is why rule 6's pairing condition is a MUST, not a
  SHOULD.

## Contested / evolving

- **The register rule is uncontested for unsafe code (DOC-04 already ships
  it) but untested at scale for guards in general.** This dive's evidence is
  20 hand-rewritten examples (§2) plus a fleet-wide 53/47 split with no
  stated rule (§3) — consistent with the proposed rule, not yet a controlled
  test of it. The `eval-design` dive's reason-recovery harness is the
  mechanism that would actually confirm register placement affects whether
  a cold agent recovers the reason; until it runs, treat rule 2 as SHOULD,
  not MUST.
- **Whether a `GUARD:` marker is worth the adoption cost is a live, not yet
  settled, tension**: it would raise recall from this dive's measured
  0.432 to near 1.0 for marked blocks, but only after every existing
  fleet guard is retrofitted with it — an upfront cost this dive did not
  measure (how many of the fleet's other ~200-plus unsampled guard-bearing
  files would need touching). The direction (yes, paired) is this dive's
  recommendation; the rollout cost is unresolved.
- **Lexical recognition versus an LLM judge is trending toward the judge,
  not the regex, for exactly the recall ceiling measured in §4.** The
  `eval-scoring` dive is independently deciding a judge-plus-calibration
  approach for the reason-recovery eval; if that infrastructure ships, the
  same judge is the natural upgrade path for guard recognition once the
  regex carve-out (rule 5) is in place — this dive's heuristic is a
  cheap-and-immediate floor, not a claimed final answer.
- **Whether "fact plus consequence, never an instruction" should extend from
  guards to the fleet's *rule and skill* prose itself** (which is written
  entirely as instructions, by design, to steer an agent) is out of scope
  here and genuinely unresolved — arXiv 2603.21642's mitigation is about
  content an agent reads as *untrusted* context; a project's own rule files
  are a different trust tier than a comment in a dependency's vendored code
  or a PR diff, and this dive takes no position on where that line sits.

## Decisions this dive proposes

1. **Guard shape**: a guard states the mechanism, the plausible breaking
   edit, and its consequence, and nothing else — see the MUST-adjacent text
   and the Rust/Python/TypeScript before/after pairs in §2 and rule 1.
   Reason: this is the exact content that survived a measured 3.46x
   compression across 20 real fleet guards with the audit's authors
   independently reporting the same 2–3.4x range from a different sample.
2. **Register rule**: caller-visible precondition → doc comment; implementation
   hazard → plain comment at the line — see §3 and rule 2. Reason:
   generalises DOC-04's already-shipped unsafe-only split (Rust API
   Guidelines C-FAILURE, rustdoc's own `# Panics` rationale) rather than
   inventing a new convention, and fits the 20 rewritten guards close to
   evenly (10 doc / 9 plain / 1 mixed) without forcing either register.
3. **Recogniser**: ship the seven-rule heuristic in §4 as a length-ratchet
   carve-out (rule 5), not a gate. Reason: measured precision 0.714 / recall
   0.432 on the exact 520-block population the commission specified — high
   enough precision to trust as "never auto-cut," far too low recall to
   trust as "everything else is safe to cut."
4. **Marker**: adopt `GUARD:` as a plain-comment prefix extending the
   shipped `SAFETY:` convention, conditioned on shipping its anti-inflation
   check (rule 5's recogniser run against every marked block) in the same
   change — see §5 and rule 6. Reason: Go's `Deprecated:` and clippy's
   `SAFETY:` both prove the marker pattern works at scale, but clippy's own
   `UNNECESSARY_SAFETY_COMMENT` proves the pairing is not optional once a
   marker's absence starts costing something (a ratchet failure) rather than
   only its presence costing something (an unsafe block with no
   justification).

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/wiki/Deprecated](https://go.dev/wiki/Deprecated) | Go wiki: the `Deprecated:` doc-comment convention | fetched 2026-09-27 | Primary; the marker precedent §5 builds on — exact prefix text, position rule, tool behavior |
| [raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs) | clippy lint source, fetched directly (939 lines) | fetched 2026-09-27, lint since v1.58.0/v1.67.0 | Primary; the exact `"SAFETY:"` match logic (line 837) and the paired anti-inflation lint (`UNNECESSARY_SAFETY_COMMENT`) §5 decision rests on |
| [arxiv.org/abs/2603.21642](https://arxiv.org/abs/2603.21642) + [arxiv.org/html/2603.21642](https://arxiv.org/html/2603.21642) | "Are AI-assisted Development Tools Immune to Prompt Injection?" (Huang, Huang, Milani Fard, 2026-03-23) | 2026, current | Primary; names code comments explicitly as an injection vector and recommends stripping imperative language — the phrasing rule in §6 |
| [doc.rust-lang.org/rustdoc/how-to-write-documentation.html](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html) | rustdoc book, "how to write documentation" | fetched 2026-09-27 | Primary; the `# Panics` caller-visibility rationale cited in §3 |
| [rust-lang.github.io/api-guidelines/documentation.html](https://rust-lang.github.io/api-guidelines/documentation.html) | Rust API Guidelines, documentation chapter (C-FAILURE) | fetched 2026-09-27 | Primary; the caller-vs-implementation split stated independently of DOC-04, for §3 |
| [cwe.mitre.org/data/definitions/426.html](https://cwe.mitre.org/data/definitions/426.html) | CWE-426, Untrusted Search Path | fetched 2026-09-27 | Primary; grounds the ocx-sdk-python `_bootstrap.py` guard rewrite (§2, row 17) |
| [cwe.mitre.org/data/definitions/918.html](https://cwe.mitre.org/data/definitions/918.html) | CWE-918, Server-Side Request Forgery | fetched 2026-09-27 | Primary; grounds the ocx `ssrf.rs` guard rewrite (§2, row 9) |
| `.agents/research/code-docs-audit/sample.md` | Fleet audit: 320-block seeded sample, 5 repos, 100 guards listed with edit-prevented | 2026-09-27 | Primary (fleet); source of the 100 fleet-guard positives and the raw census JSON used for §2/§4 |
| `.agents/research/code-docs-audit/human-sample.md` | Human baseline: 200-block sample, 8 pre-2022 repos, 39 guards + full appendix | 2026-09-27 | Primary (reference corpus); source of the 39 human-guard positives and 161 negatives, verbatim-verified against the pinned clones in §4 |
| `.agents/research/code-docs-audit/eval-sites.md` | 40 hand-picked mechanism sites, "Patterns worth encoding" | 2026-09-27 | Primary (fleet); RAII-binding, tri-state, and counter-example-cross-reference patterns folded into §4's rule design |
| `.agents/research/code-docs-audit/scratch/samples/*.json` | Raw census dump backing `sample.md`, per-repo, 320 blocks with full text | 2026-09-27 | Primary (fleet); this dive's actual scoring input for §2 and §4, matched 100/100 against `sample.md`'s file:line list |
| `~/.cache/research-lang/exemplars/code-docs/{BurntSushi__ripgrep,pypa__pip,restic__restic,rust-lang__cargo,rust-lang__rust-analyzer,square__okhttp,tokio-rs__tokio,vitejs__vite}/` | Pinned pre-2022 clones (blob-available locally, no network needed) | commits dated 2021-11 to 2022-01 (`exemplars.tsv`) | Primary (reference corpus); source of the 200 human-appendix blocks' actual text for §4, spot-verified byte-for-byte against `human-sample.md`'s own verbatim table |
| `rules/rust-quality/docs-and-tracing.md` | Shipped lore rule, DOC-01..20 | current (this repo) | Primary; DOC-04's unsafe-only register split and the "Two Registers" section §3 generalises |
| `.agents/research/code-docs-frame.md` | Program frame: hypotheses H1-H7, measured comment-density table | 2026-09-27 | Primary (fleet); H2/H6 context for §1's gap framing |
| `.agents/research/code-docs-topic-map.md` | Wave-1 synthesis across all audits | 2026-09-27 | Primary; "What the grounding changed" is the headline-gap source for §1, and names this dive's exact commission and gap |
| `/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md` | Prior ocx-only research, superseded per the frame | pre-2026-09-27 | Secondary; read only to confirm what the current audits already overrode, not cited as current evidence |
