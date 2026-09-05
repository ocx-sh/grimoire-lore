# Design decisions log

Append-only record of discussion-settled decisions that are not (yet) full
sections in AGENTS.md or graph-ir.md. One entry per topic, terse. Do not
re-litigate an entry here — supersede it with a dated follow-up entry.

## 2026-08-30

### D1 — Analysis is recomputation, not a phase
There is no static-analysis subsystem and no phase split machinery. "Check"
is the same demand-driven evaluation with a different root question:
`bob build` demands outputs, `bob check` demands subgraphs (expand
everything, execute nothing). An expansion that reads an action's output
legitimately forces that action (Buck2 `dynamic_output` analog; Bazel
forbids this and pays with out-of-build generators). Residue: the graph is
knowable only per frontier — a different config means re-expansion. Bazel
has the identical residue (`select()`); it hides it behind the phase wall.

### D2 — Three tiers of dynamism, graded analyzability
1. Static wiring. 2. Static template over dynamic cardinality
(`map`/`for-each`; optional branches = selective-functor shape) — the
operator graph is analyzable without evaluation, only counts are data.
3. Full monadic expansion (arbitrary graph from data) — shape known only by
evaluating the expander. The engine and caches treat all three identically;
only tooling power differs. The dialect makes tiers 1–2 the ergonomic
default and tier 3 the explicit escape hatch. Most build dynamism is tier 2
dressed as tier 3.

### D3 — Module model: modules export nodes, constructors, constants
A module (component/package) is a library, not a node. Export kinds:
- **Node definitions** — carry a `BoundaryType`; a stream is just a port
  type; each instance is its own cache boundary.
- **Constructor functions** — run at expansion time, return graph. Rule:
  **a constructor returns a sealed box, never a flattened splat** — there
  is no flattening layer, which is what kills Bazel's macro-vs-rule
  confusion by construction.
- **Constants** — typed content-addressed values (flag presets, toolchain
  descriptors).
The export manifest (kinds + types) must be queryable without executing
anything; only constructor bodies need evaluation (D1). Per-node typed
input *schemas* as queryable metadata: agreed, not yet implemented (today
inputs arrive as an untyped map, checked by runtime lookup).

### D4 — Cross-language interop: typed values on wires, never code calls
Shared types live in WIT once (e.g. `toolchain-config` record); every
guest language gets generated bindings. Default composition is
graph-level: "using another package's function" = wiring its node; the
call is an edge carrying a content-addressed record. Library fusion
(importing their lib into your expander) is the opt-in alternative and
fuses code identity (their code hashes into your component digest).
Toolchains are records + a resolve node — no engine machinery (contrast
Bazel platforms/transitions). Multi-target = `map` over config records
(tier 2).

### D5 — IDE and completion come from the type layer
Guest-language completion is free (generated typed bindings). The dialect
LSP is fed by WIT types + content-addressed definitions (Unison
precedent). The canvas gets graphical completion from `BoundaryType`:
which wires may connect is a type check.

### D6 — Sharing a pipeline stage = partial application
Binding some inputs of a node yields a new node: identity = wrapped node
hash + captured value digests (closure hashing, settled in the language
design), boundary = the remaining free inputs. Canvas equivalent: box a
selection and name it. Publishable like any node.

### D7 — Relative imports resolve to digests, capped at the box root
`import ./rules/cc` is frontend sugar: resolved at expansion time to a
content digest that joins the importer's inputs. The Merkle tree never
sees paths. Resolution never escapes the box/package root — `../` past
the boundary is a hidden channel and is refused (the part of CMake's
`CMAKE_CURRENT_SOURCE_DIR` we deliberately do not copy). Cross-box =
declared dep.

### D8 — OCX is the module distribution channel; the component is the manifest
Artifact = one WASM component, media-typed, digest-addressed; the
component embeds its own WIT world, so digest pins bytes *and* boundary
type — no sidecar metadata to drift. On ingest Bob verifies the embedded
world against the expected node world and checks imports ⊆ granted row.
`wasip2/wasm` is platform-free (no os/arch matrix). Multi-component
bundles: later, one component per OCI layer. Resolve/fetch split: OCX
resolves name/tag → digest (ocx.lock = witness store), the CAS fetches.

### D9 — Floating external refs are pinned by the frontier
Fetch-by-commit-hash = `net.read` with a free witness (git already
content-addresses). Resolving a floating ref (HEAD, branch, moving tag) is
a tiny uncached resolve step whose result is an input *event* in the log:
"main → abc123 at time t". Builds at frontier t are deterministic and
replayable; floating data never exists inside the graph.

### D10 — Agreed next implementation rung
`bob check` (expand-only demand), `bob inspect <component>` (print the
embedded WIT world / export manifest), and the typed input-schema
declaration sketched into graph-ir.md. Not started.
Landed 2026-08-30: `bob check` in 4601016, `bob inspect` in the commit that
added this line; the typed input schema stays a named upgrade (graph-ir.md
§8), not implemented.

### D11 — Strategy: why this doesn't exist yet (risk register)
The ingredients are younger than the incumbents (à la Carte 2018, OCaml 5
effects 2022, Buck2 open-sourced 2023, WASM component model ~2023-24); the
needed fields (build theory, dataflow, PL effects, OS sandboxing) barely
intersect; CI/workflow vendors profit from the seams; FAANG build teams
have no itch; the category's graveyard scares investment. Reasons 3–5 are
simultaneously the project's risk register; the migration story is the
moat killer either way.

## 2026-09-02

### D12 — The spec is a draft; nothing is ratified
The spec site (`spec/`) was written in one pass from AGENTS.md, graph-ir.md
and D1–D11 before any of it was committed to. Status vocabulary from now
on: **Proven** = the POC demonstrates the claim (named test/demo);
**Proposed** = design intent, not committed to; **Open** = not designed;
**Ratified** = explicit owner sign-off, recorded here as a dated entry
naming the chapter. No chapter is ratified as of this entry. "Settled" in
AGENTS.md and D1–D11 means settled *in discussion* — it promotes nothing.

### D13 — Open question: which kernel thesis?
Double-check finding (2026-09-02). The POC validates a DICE/Buck2-shaped
kernel: demand-driven, memoized recomputation over content-addressed
inputs, plus dynamic expansion, Merkle boundaries and capability
sandboxing. It contains none of the timely/differential machinery the
design assumes — no typed event log, no logical time (the watch advance
counter is a label), no delta-aware combinators, no folds or checkpoints.
Everything "proven" so far is proven for the first thesis. The second is
needed only by the streaming half (folds, temporal fan-in, actors,
checkpoints at frontiers); the build half does not need it. Decide before
implementing folds: (a) differential dataflow as the kernel, (b) memoized
recomputation as the kernel with streams as *inputs* only and folds as
checkpointed memo nodes, or (c) both, layered. Until decided, Ch 1 and
Ch 7 stay Proposed on this point.

### D14 — Script API: the build script returns one box built from constructors
`bob_expander_script` now registers a small constructor set into the rhai
engine — `file`, `wire`, `sh`/`action`, `box`, plus `cc_targets` for the C
demo's shared policy — instead of leaving the script to build `Subgraph`
values by hand. `wire(node, port)` names a sibling by string; those names
become indices only when the enclosing `box` closes, and `box` orders its
children producers-before-consumers (ties by name) because the engine runs
a subgraph's children serially in emission order — an engine-side
topological sort remains the named upgrade. `files` replaces the earlier
`sources` name for the script's list of scope paths. `cc_targets` keeps the
C demo byte-identical between its JSON-driven and script-driven expanders,
since both call the same Rust builder. `playground/wordcount` is the
worked example this API exists to make concrete, and its counters are
asserted (not just printed) in `task gate`. This promotes D3's "a
constructor returns a sealed box, never a flattened splat" from settled
discussion to Partially proven; typed per-node input schemas are still not
implemented.

This paragraph is deliberately plain and should pass every check cleanly today.
