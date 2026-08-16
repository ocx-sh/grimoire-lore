---
title: The `starlark` Dependency Cluster in ocx
topic: rust-ecosystem
phase: 4 (deep dive)
model: sonnet
date: 2026-08-14
grounded_by: ocx @ HEAD (uncommitted tree, /home/mherwig/dev/ocx), grimoire @ HEAD
scope: starlark, starlark_syntax, starlark_map, starlark_derive, allocative
---

# The `starlark` Dependency Cluster in ocx

ocx embeds `starlark = "=0.13.0"` as its package-test scripting language,
pulling four siblings (`starlark_syntax`, `starlark_map`, `starlark_derive`,
`allocative`) that a prior consolidation ([`rust-ecosystem.md`
ECO-42](../rust-ecosystem.md)) flagged as "version-pinning phantoms" and
separately flagged the whole cluster as unreviewed by any scout or dive
across five phases (`rust-ecosystem.md` §Open Questions #2). This dive closes
that gap. Every claim below is checked against a primary source — the
crates.io JSON API, the `facebook/starlark-rust` GitHub repo, docs.rs for the
pinned and current versions, and the real ocx tree — not against training
data or the crate's marketing copy.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 — What's actually depended on](#f1--whats-actually-depended-on)
   - [F2 — Why the siblings are pinned: lockstep is real, but not where ocx's own comment says it is](#f2--why-the-siblings-are-pinned-lockstep-is-real-but-not-where-ocxs-own-comment-says-it-is)
   - [F3 — Liveness and provenance](#f3--liveness-and-provenance)
   - [F4 — Zero advisories, checked two ways](#f4--zero-advisories-checked-two-ways)
   - [F5 — Security posture: what the crate's own docs say, in its own words](#f5--security-posture-what-the-crates-own-docs-say-in-its-own-words)
   - [F6 — ocx's embedding: where the real capability lives](#f6--ocxs-embedding-where-the-real-capability-lives)
   - [F7 — Is the input attacker-controlled?](#f7--is-the-input-attacker-controlled)
   - [F8 — The phantom finding, live today](#f8--the-phantom-finding-live-today)
   - [F9 — Alternatives, as a sizing exercise](#f9--alternatives-as-a-sizing-exercise)
3. [Applied to the codebases](#applied-to-the-codebases)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

The phantom-dependency finding **does not survive contact with the lockstep
question, but not for the reason ocx's own manifest comment gives.**
`allocative` is a genuine, Rust-enforced hard dependency: `StarlarkValue`'s
supertrait bound is `allocative::Allocative`, so any host type implementing
it must name the crate directly — verified against the trait's real
`0.13.0` source. `starlark_syntax`, `starlark_map` and `starlark_derive`,
by contrast, are **not** compile-enforced as direct dependencies — I
emptied all three from both manifests and `cargo check -p ocx_lib` finished
clean, with `cargo tree` confirming Cargo's own resolver still pulled all
three at the identical `0.13.0` transitively through `starlark`'s manifest.
What *is* real is a documented, upstream-run **coordinated release process**:
the `facebook/starlark-rust` README's own "Making a release" section
describes bumping `starlark_derive`'s version inside `starlark`'s manifest
and publishing all crates from one repository in one pass, and the project
states in its own words that it does "not aim for API stability between
releases." Given that, pinning the siblings by hand is a defensible
deliberate-pin discipline for an unstable family embedded in a
security-sensitive binary — but it is a *policy choice*, not a compile
requirement, and ECO-07's "no `use` site → delete" heuristic needs a named
carve-out for this shape (a crate that is transitively force-resolved to an
exact version by a sibling it will never diverge from *by construction of
the upstream release process*), not a blanket "trust the manifest comment"
exemption.

**The single highest-severity finding is upstream, not in ocx's code**:
starlark 0.13.0's `Evaluator` exposes exactly one resource limit —
`set_max_callstack_size` (recursion depth). `set_max_heap_size`,
`set_max_tick_count` and `set_check_cancelled` do not exist until 0.14.0
(2026-05-22, "Resource limits: instruction count and heap memory limits
during evaluation" per the crate's own changelog) — roughly seventeen months
after the version ocx has pinned. ocx's own `script.rs` already documents
this exact gap as an "ACCEPTED v1 LIMITATION": a pure-compute Starlark loop
with no `ocx.run` call cannot be preempted and hangs the ocx process itself
until externally killed. The crate's *own* current documentation for the
methods that would close this gap states, verbatim: **"starlark-rust should
in general not be considered secure against truly malicious code... Use
OS-level APIs in a subprocess if you want that."** ocx evaluates the script
in-process, not in a subprocess — the exact configuration upstream's own
docs say not to rely on for a runtime guarantee.

## Findings

### F1 — What's actually depended on

`cargo tree -e normal -i` for each name in the workspace root confirms all
five resolve to a single instance each at `0.13.0`:

```
$ cargo tree -e normal -i starlark
starlark v0.13.0
└── ocx_lib v0.5.8 (crates/ocx_lib)
    ├── ocx v0.5.8 (crates/ocx_cli)
    └── ocx_schema v0.5.8 (crates/ocx_schema)

$ cargo tree -e normal -i starlark_syntax   # identical shape, plus starlark itself as a second consumer
$ cargo tree -e normal -i starlark_map      # identical shape, plus starlark_syntax as a third consumer
$ cargo tree -e normal -i starlark_derive   # identical shape (proc-macro)
$ cargo tree -e normal -i allocative        # identical shape, plus starlark and starlark_map as consumers
```

All five are **direct manifest entries** — `ocx_lib/Cargo.toml:103-110`
lists all five as `.workspace = true`, pinned at `Cargo.toml:200-209` with
an exact (`=`) version requirement, the only such exact pins in the
workspace (every other dependency uses caret ranges).

Grepping for real `use` sites, underscored crate name as the path prefix,
across the whole tree excluding the vendored `external/` forks:

```
$ rg -n '\bstarlark::' --type rust -g '!external/*'    → 11 files, all under crates/ocx_lib/src/script/
$ rg -n '\ballocative::' --type rust -g '!external/*'  → 4 files, all under crates/ocx_lib/src/script/
$ rg -n '\bstarlark_syntax::' --type rust -g '!external/*'  → 0 files
$ rg -n '\bstarlark_map::' --type rust -g '!external/*'     → 0 files
$ rg -n '\bstarlark_derive::' --type rust -g '!external/*'  → 0 files
```

`starlark` and `allocative` have real, direct `use` sites. `starlark_syntax`,
`starlark_map` and `starlark_derive` have **zero** — confirming the earlier
consolidation's characterization exactly. The question this dive answers is
whether that zero-use-site state makes them phantom dependencies in the
ECO-07 sense (a crate that should be deleted because nothing needs it) or a
different, defensible shape.

### F2 — Why the siblings are pinned: lockstep is real, but not where ocx's own comment says it is

ocx's root `Cargo.toml:187-209` carries this rationale:

> "starlark-rust does NOT promise API stability between releases... The
> whole family is co-versioned and must move together." — for
> `starlark_syntax`/`starlark_map`/`starlark_derive` — and separately for
> `allocative`: "Not a free choice: `allocative` is part of starlark's
> public API surface. `StarlarkValue` is a sealed trait whose supertrait
> bound is `allocative::Allocative`... Bump only together."

Both claims are true in spirit, but they are **two structurally different
mechanisms**, and only one of them is a hard compile requirement:

**`allocative` — genuinely, Rust-language-level required.** Fetching
`starlark`'s real `0.13.0` source
(`starlark/src/values/traits.rs`) shows:

```rust
pub trait StarlarkValue<'v>:
    'v + ProvidesStaticType<'v> + Allocative + Debug + Display + Serialize + Sized
```

`Allocative` is a supertrait bound. ocx's own host types
(`OsValue`, `ArchValue`, `PlatformValue`, `RunResultValue`) implement
`StarlarkValue`, which means they must implement `Allocative` too, which
means their source must write `impl allocative::Allocative for ...` — and
Rust cannot name a trait from a crate that isn't a direct dependency of the
crate doing the `impl`, even when that crate is reachable transitively.
This part of the comment is exactly right, confirmed both by the crate
source and by ocx's own 4 real `use allocative::{Allocative, Visitor}` call
sites (`os_value.rs:17`, `platform_value.rs:19`, `run_result.rs:20`,
`arch_value.rs:17`). Note the comment's word "sealed" is loose — Rust's
actual sealed-trait pattern (an unimplementable-outside-the-crate trait via
a private supertrait) is not what's happening; ocx implements
`StarlarkValue` for its own types directly, which a truly sealed trait would
forbid. The real mechanism is "supertrait-bound version identity," not
sealing — but the practical conclusion (direct dependency required) is the
same either way.

**`starlark_syntax` / `starlark_map` / `starlark_derive` — not
Rust-language-level required; empirically confirmed.** I emptied all three
`.workspace = true` lines from `crates/ocx_lib/Cargo.toml` (the only crate
referencing them) and ran `cargo check -p ocx_lib`:

```
$ cargo check -p ocx_lib
    Checking ocx_lib v0.5.8 (/home/mherwig/dev/ocx/crates/ocx_lib)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 8.59s
```

Clean compile. `cargo tree -e normal -i starlark_syntax -i starlark_map
-i starlark_derive` afterward still shows all three resolved at exactly
`0.13.0`, pulled transitively purely through `starlark`'s own manifest
requirement on its siblings — Cargo's normal per-major/minor unification
already guarantees a single instance of each across the graph with zero
help from ocx's direct pins. (Both manifests and `Cargo.lock` were restored
byte-for-byte afterward; `git diff --stat` on all three confirms no residual
diff.) So the literal claim "the parent will not compile against a
mismatched sibling" — read as "ocx's build breaks without these three direct
entries" — is not true today. What *is* true, and is the real justification:
the `facebook/starlark-rust` repository's own README documents a
**coordinated, single-repository release process** for the whole family —
"Making a release," step 3: *"Bump the dependency in `starlark` to point at
the latest `starlark_derive` version"*, step 5: *"publish... in each of the
component directories in the [order above]"* — and states as a non-goal:
*"We do not aim for API stability between releases, preferring to iterate
quickly... But we do follow SemVer."* The four sibling crates (`starlark`,
`starlark_syntax`, `starlark_map`, `starlark_derive`) live in one Cargo
workspace and are released together by the same maintainers on the same
day, every time (crates.io version history for all four is identical:
`0.9.0 → 0.10.0 → 0.11.0 → 0.12.0 → 0.13.0 → 0.14.0 → 0.14.1(yanked) →
0.14.2`, same dates each step). `allocative` tracks within a day or two of
the same cadence (`0.3.4` on the same day as `starlark` `0.13.0`; `0.3.6`
two days after `starlark` `0.14.0`) because — as of 2026-06-14 — it is now
*also* a workspace member of the same `facebook/starlark-rust` repository
(`allocative/allocative`), not a separate crate maintained independently
(see F3).

Given a family with (a) an explicit no-API-stability policy, (b) a real
history of breaking changes every release (0.14.0 alone: "Heap lifetime
rework," "`FrozenRef` removed," "`AnyLifetime` is now sealed instead of
`unsafe`," "`Value<'v>` is no longer `Send + Sync`" — five breaking changes
in one release, per the crate's own changelog), and (c) zero contractual
guarantee that a caret range across the four crates would even resolve to
mutually-compatible versions if one were bumped independently by a stray
`cargo update` — exact-pinning all four as a group, even the three with no
direct call site, is a defensible *choice*, made for audit-visibility and
deliberate-bump discipline in a security-sensitive binary, not a
requirement Rust's own dependency resolution imposes. **The lockstep
question resolves as: real at the release-process level, not real at the
compile level for three of the four crates — and the ECO-07 rule needs a
named carve-out for exactly this shape**, distinct from the shape it was
written to catch (a genuinely deletable crate hanging around after a
refactor).

### F3 — Liveness and provenance

All five crates, via `curl -H "User-Agent: ..." https://crates.io/api/v1/crates/<name>` (checked 2026-08-14):

| Crate | max_version (as of 2026-08-14) | updated_at | created_at | repository |
|---|---|---|---|---|
| `starlark` | 0.14.2 | 2026-06-05 | 2018-09-27 | facebook/starlark-rust |
| `starlark_syntax` | 0.14.2 | 2026-06-05 | 2023-10-17 | facebook/starlark-rust |
| `starlark_map` | 0.14.2 | 2026-06-05 | 2023-06-05 | facebook/starlark-rust |
| `starlark_derive` | 0.14.2 | 2026-06-05 | 2021-08-27 | facebook/starlark-rust |
| `allocative` | 0.3.6 | 2026-05-20 | 2022-11-04 | facebookexperimental/allocative (**stale pointer, see below**) |

`gh api repos/facebook/starlark-rust` (checked 2026-08-14): `pushed_at:
2026-08-14T07:59:44Z` — **the same day as this dive**, `archived: false`,
1,006 stargazers, 38 open issues. The most recent commits (also
2026-08-14T07:57:31Z) are an in-progress lifetime/freeze-trait refactor —
this is an actively developed repository, not a coasting one.

**Meta/Buck2 relationship, in the project's own words** (`README.md`):
Starlark "is used for configuration in the build systems Bazel, Buck and
Buck2, of which Buck2 depends on this library." Ownership moved "from
Google to Meta (formerly Facebook)" at version 0.4.0.
`CONTRIBUTING.md`: **"Starlark is currently developed in Meta's internal
repositories and then exported out to GitHub by a Meta team member; however,
we invite you to submit pull requests."** This is the concrete answer to
"what does Meta-internal development imply for outside-user support": the
canonical source of truth is Meta's internal monorepo; the public GitHub
repo is a downstream mirror that accepts external PRs but the project is
driven by Buck2's own needs, not by outside embedders' roadmap requests.
That is a real support-commitment caveat for ocx to carry forward, distinct
from "is it maintained" (yes).

**Provenance gotcha found while checking `allocative`'s repository field**:
`https://github.com/facebookexperimental/allocative` carries a GitHub
archival banner — *"This repository was archived by the owner on Jun 14,
2026. It is now read-only,"* with a notice: *"June 2026: This repository is
being retired and maintenance of this library is moving to
https://github.com/facebook/buck2."* Read naively (crates.io's `repository`
field, or a browser visit), this reads as "the crate is dead." It is not:
`facebook/starlark-rust`'s own `main` branch `Cargo.toml` now lists
`allocative/allocative` and `allocative/allocative_derive` as first-class
members of its *own* workspace (`[workspace.dependencies] allocative = {
version = "0.3.6", path = "allocative/allocative" }`), and the crate keeps
publishing from there in step with `starlark`'s own release cadence. The
crate is not abandoned; its old standalone home was retired and its source
was folded into the same monorepo that already houses `starlark` — the kind
of internal reorganization that only shows up if you follow the archived
repository's banner instead of trusting the "repository" field as a
liveness signal on its own (ECO-01's mandate to hit the JSON API instead of
the rendered page has a sibling gap here: the JSON API's `repository` field
can itself point at a since-archived repo).

### F4 — Zero advisories, checked two ways

- OSV.dev, `POST https://api.osv.dev/v1/query {"package":{"name":"<crate>","ecosystem":"crates.io"}}` for all five: `{}` (empty) in every case.
- `gh api "search/code?q=repo:rustsec/advisory-db+<crate>+in:path"` for all five: `total_count: 0` in every case.

No RUSTSEC advisory, yanked-for-security release, or open CVE against any
crate in this cluster, checked 2026-08-14.

### F5 — Security posture: what the crate's own docs say, in its own words

**Resource limits, pinned version (`0.13.0`)**, from
`docs.rs/starlark/0.13.0/starlark/eval/struct.Evaluator.html`, full method
list: `ast, borrow, borrow_mut, call_stack, call_stack_count,
call_stack_top_frame, call_stack_top_location, coverage, disable_gc,
enable_profile, enable_static_typechecking,
enable_terminal_breakpoint_console, eval_function, eval_module,
eval_statements, frozen_heap, garbage_collect, gen_profile, heap,
local_variables, module, set_loader, set_max_callstack_size,
set_module_variable_at_some_point, set_print_handler,
set_soft_error_handler, verbose_gc`. **`set_max_callstack_size` is the only
resource-bounding method that exists.** No heap cap, no instruction/tick
cap, no cancellation hook — this matches, word for word, ocx's own
`script.rs:39-54` doc comment.

**Resource limits, current version (`0.14.2`)**, same page: the method list
gains `check_heap_size_limit, check_tick_count_limit, get_total_tick_count,
set_check_cancelled, set_max_heap_size, set_max_tick_count`. The changelog
(`CHANGELOG.md`, `## 0.14 (May 20, 2026)`) attributes this to: *"Resource
limits: instruction count and heap memory limits during evaluation."* This
landed 2026-05-22 — roughly 17 months after ocx's pinned 2024-12-13 release.

The doc text for these *new* methods is the load-bearing quote for this
whole dive, verbatim from `docs.rs/starlark/0.14.2`:

> **`set_max_tick_count`**: "Putting aside that starlark-rust should in
> general not be considered secure against truly malicious code, this check
> in particular is best-effort and should absolutely not be treated as a
> way to guarantee bounded runtime. **Use OS-level APIs in a subprocess if
> you want that.**"
>
> **`set_max_heap_size`**: "Putting aside that starlark-rust should in
> general not be considered secure against truly malicious code, this check
> in particular is best-effort and should absolutely not be treated as a
> way to guarantee bounded memory use of an evaluation. **Use OS-level APIs
> in a subprocess if you want that.**"

This is the crate maintainers stating, in the current-generation
documentation for the exact feature that would close ocx's own
"accepted v1 limitation," that (a) the interpreter is not to be considered
secure against a malicious script under any configuration, and (b) the only
way to get an actual runtime/memory guarantee is to run the evaluator
itself inside an OS-level subprocess boundary — which ocx does not do (see
F6). ocx runs `Evaluator::eval_module` **in-process**, inside the same
address space and privilege level as the rest of the `ocx` binary.

**Network/file I/O in the language and standard library**: `Dialect
::Standard` (the base language) and every `LibraryExtension` variant
(`docs.rs/starlark/0.13.0/starlark/environment/enum.LibraryExtension.html`)
were checked individually. None perform file or network I/O: `Print`/
`Pprint` write to *stderr* only (not the filesystem), `Json` builds an
in-memory string, `Debug`/`Pstr`/`Prepr` are pure formatting,
`Map`/`Filter`/`Partial`/`StructType`/`RecordType`/`EnumType`/
`NamespaceType`/`SetType` are pure data-structure helpers, `Breakpoint`
"drops into a console-module evaluation prompt" (interactive escape —
correctly excluded by ocx), `Internal` is explicitly documented "not for
production use" (correctly excluded by ocx). **Starlark itself — language
plus every stdlib extension — has no built-in capability to touch the
network or the filesystem.** This is by design (Starlark's whole premise,
inherited from Bazel, is hermetic/deterministic build configuration). Every
I/O capability reachable from a `.star` script running under ocx comes
exclusively from the custom host functions ocx itself registers (F6) — the
crate did not grant this, ocx did.

### F6 — ocx's embedding: where the real capability lives

Evaluation entry point: `crates/ocx_lib/src/script.rs`, whose own module
doc (`script.rs:4-20`) names it "Embedded Starlark test-runner —
engine-swap firewall" and asserts (enforced by a real test, see below) that
`crates/ocx_lib/src/script/` is the **only** place in the workspace that
may reference `starlark*` symbols.

Dialect and globals, `crates/ocx_lib/src/script/engine.rs`:
- `dialect()` (`engine.rs:54-59`) sets `enable_load: false` — `load()`
  (Starlark's module-import statement) is disabled; scripts are single-file
  by contract.
- `SCRIPT_EXTENSIONS` (`engine.rs:26-41`) enables 14 of the 18
  `LibraryExtension` variants — every one confirmed I/O-free in F5 — and
  explicitly excludes `Breakpoint` and `Internal`.
- `evaluate()` (`engine.rs:63-109`) calls `eval.set_max_callstack_size(...)`
  (`engine.rs:92-93`) — the one limit 0.13.0 offers — and nothing else.
  There is no `tokio::time::timeout` around the evaluation itself; the
  module doc for `run_script` (`script.rs:181-191`) explains why: the
  `Evaluator` is `!Send`, so it cannot be moved off the calling thread to be
  raced against a timeout.

Host capability surface, `crates/ocx_lib/src/script/ocx_module.rs`:
`ocx.run(*args, *, env=None, cwd=None, stdin=None)` (`ocx_module.rs:392-479`)
spawns an **arbitrary subprocess**: any program resolvable on the composed
`PATH`, or an absolute/cwd-relative path, with arbitrary argv, an
env-var overlay (blocked only for a named reserved-key list —
`RESERVED_ENV_KEYS`, `ocx_module.rs:65-76`, plus a `OCX_AUTH_` credential
prefix, `ocx_module.rs:82-101`), and a working directory constrained to the
scratch sandbox. The only refusal is re-entrant `ocx` itself
(`is_ocx_binary`, `ocx_module.rs:356-390`) — a defence against the sandbox
nesting recursively, not a defence against arbitrary command execution.
Once spawned, the **child process runs with full OS-level privilege of the
invoking user** — no namespace, no seccomp filter, no chroot, no cgroup.
The only bounds on the child are a per-call wall-clock kill
(`ScriptLimits::wall_clock`, `script.rs:58-61`, enforced in
`spawn_capture`, `ocx_module.rs:117-228`) and a per-stream output byte cap
(`OUTPUT_CAP_BYTES`, `ocx_module.rs:230-238`). This means the filesystem
guard described next (`guard.rs`) protects exactly four host functions and
nothing a spawned child does.

Filesystem guard, `crates/ocx_lib/src/script/guard.rs`: `resolve_scratch`
/ `resolve_read` (lines 45-105) reject absolute paths and lexical `..`
escapes, then `verify_symlink_containment` (lines 115-149) walks every path
component and re-validates symlink targets stay inside the sandbox root —
explicitly documented (`guard.rs:18-21`) as a best-effort TOCTOU-narrowing
measure, not a closure, against "an adversarial in-sandbox process that
spawns binaries." This guard covers exactly `ocx.read_file`,
`ocx.write_file`, `ocx.exists`, `ocx.mkdir`, and the `cwd=` argument to
`ocx.run` — it has **no effect on what a spawned child subsequently does**
with the filesystem once it starts running, since a normal OS subprocess
is not confined to the scratch root.

The engine-isolation firewall is a real, running test —
`crates/ocx_lib/src/script.rs:242-319`, `no_starlark_import_outside_firewall`
— which walks every `.rs` file in the workspace and asserts none outside
`crates/ocx_lib/src/script/` contains the literal tokens `"use starlark"`,
`"starlark::"`, `"starlark_syntax"`, `"starlark_map"`, `"starlark_derive"`.
This is the same mechanism the earlier consolidation cited
(ECO-42 / `dependency-update-automation-and-unused-deps.md` #16) as a
"second, independent confirmation" that the three zero-use-site crates are
legitimately dependency-declared-but-unimported — confirmed still present
and still passing.

### F7 — Is the input attacker-controlled?

The `.star` script source reaches `run_script` from exactly two call sites,
both CLI commands, both requiring an explicit human-supplied local path or
stdin:

- `ocx package test --script <PATH>` — `crates/ocx_cli/src/command/package_test.rs:90-98`:
  *"Path to a Starlark test script... The value `-` reads the script SOURCE
  from stdin."* `script: Option<PathBuf>`, read at `package_test.rs:278-330`
  via `tokio::fs::read_to_string(script_path)` or stdin.
- `ocx patch test --script <PATH>` — `crates/ocx_cli/src/command/patch_test.rs`
  (same shape, delegating to the shared `script_runner::run_script_in_env`,
  `crates/ocx_cli/src/command/script_runner.rs:34-64`).

Neither command auto-discovers or auto-executes a `.star` file that ships
*inside* a fetched package or registry manifest — there is no code path
anywhere in `ocx_cli` that reads a `.star` extension out of a pulled
bundle's own content and runs it without an explicit `--script` flag naming
a path chosen by the invoking operator. **The threat model this cluster
actually sits in is "the operator who runs `ocx package test --script
some.star` or `ocx patch test --script some.star` trusts that file's
contents,"** not "installing or pulling a package silently runs untrusted
Starlark." That is a real and different risk shape than "attacker-controlled
input reaches the interpreter during ordinary `ocx install`/`ocx pull`" —
worth stating precisely rather than leaving as an open question, since the
brief specifically asked whether the input is ever attacker-controlled. It
*can* be, in the same sense any file path a human points a tool at can be
(a maintainer running a test script a contributor supplied in a PR, or
copy-pasted from an untrusted source) — but it is never reached without a
deliberate, named `--script` invocation.

### F8 — The phantom finding, live today

Running `cargo shear` in `/home/mherwig/dev/ocx` today produces 9 findings,
matching the count the earlier consolidation recorded
(`dependency-update-automation-and-unused-deps.md` #15): `liblzma` (×2 —
crate-level and workspace-level; already allowlisted by comment, not by
tool config), `starlark_derive` (×2), `starlark_map` (×2), `starlark_syntax`
(×2), plus one new one outside this cluster's scope, `glob` (workspace-level
only — not investigated here). **`cargo shear` is not wired into CI** —
`rg -n 'cargo-shear|cargo shear' .github/workflows/*.yml` finds nothing —
and **no `[package.metadata.cargo-shear] ignored` table exists anywhere in
the tree** for any of the three starlark siblings, despite ECO-42 already
recommending exactly that mechanism. Today, the only thing standing between
an agent following ECO-07 literally and a `cargo remove
starlark_syntax starlark_map starlark_derive` commit is a Cargo.toml prose
comment — which this dive's F2 shows is not even accurate about *why* the
pin exists, only that one should.

### F9 — Alternatives, as a sizing exercise

Not a migration recommendation — sized only to answer "is the current
choice defensible," per the brief.

| Crate | max_version (2026-08-14) | updated_at | Fit for ocx's use case |
|---|---|---|---|
| `rhai` | 1.25.1 | 2026-05-29 | Pure-Rust, no unsafe, sandboxed by design with its own `Engine::set_max_*` limits (call depth, operations, string size) built in since early releases — closer to what ocx wants *today* than starlark 0.13.0's single-limit surface. Not a Starlark-syntax language, so switching means rewriting every `.star` fixture and losing Bazel/Buck-familiarity for anyone who already knows Starlark. |
| `rune` | 0.14.2 | 2026-05-22 | Much smaller install base (161K downloads vs. starlark's 4.26M) for comparable API churn risk; async-native, which ocx's sync-by-design `!Send` evaluator constraint was written around avoiding. |
| `mlua` | 0.12.0 | 2026-07-05 | Lua, not Starlark — mature sandboxing story (`Lua::new_with` restricted stdlib) but links a C library (`unsafe_code = "forbid"` at workspace level, LINT-07, would need a named FFI exemption crate-wide for the embedding, not just ocx_lib). |
| Plain declarative TOML | n/a | n/a | Cannot express the imperative assertion/branching logic `expect.*` and conditional test flow already exercise; would be a scripting-language removal, not a swap, and is out of scope for what `ocx package test --script` is for. |

Exit cost from `starlark` specifically: every `.star` fixture in the test
corpus, the whole `expect_module.rs`/`ocx_module.rs` host-function surface,
and the `AssertionKind`/`ScriptOutcomeKind` classification table in
`engine.rs` are Starlark-error-shape-specific (`ErrorKind::Fail`,
`ErrorKind::StackOverflow`, etc.) even though the firewall already isolates
the *symbol* dependency to one directory. The engine-swap firewall
(`script.rs` module doc) was built for exactly this contingency and would
meaningfully lower the cost of a future swap, but it does not eliminate the
corpus-rewrite cost. **Given zero advisories, an actively-developed
upstream, and a real (if partial) upgrade path to 0.14.x that closes the
single highest-severity gap found here, a migration is not indicated; a
version bump is.**

## Applied to the codebases

- `ocx/Cargo.toml:193-209` — the exact-pin block and its rationale comments for the whole cluster.
- `ocx/crates/ocx_lib/Cargo.toml:102-110` — the five `.workspace = true` entries; `:107-109` — the allocative supertrait rationale comment.
- `ocx/crates/ocx_lib/Cargo.toml:122-129` — `anyhow` kept `[dev-dependencies]`-only specifically because `starlark_syntax` 0.13's `ErrorKind` variants are `anyhow::Error`-typed; enforced by `dependency_hygiene_tests::anyhow_is_dev_dependency_only` (`script.rs:337-354`).
- `ocx/crates/ocx_lib/src/script.rs:37-62` — `ScriptLimits` doc comment, the "ACCEPTED v1 LIMITATION" that F5's upstream finding directly addresses.
- `ocx/crates/ocx_lib/src/script.rs:242-319` — `no_starlark_import_outside_firewall`, the running structural test enforcing the engine-isolation firewall.
- `ocx/crates/ocx_lib/src/script/engine.rs:26-41` — `SCRIPT_EXTENSIONS`; `:54-59` — `dialect()`; `:90-93` — the single `set_max_callstack_size` call.
- `ocx/crates/ocx_lib/src/script/ocx_module.rs:392-479` — `ocx.run`, the actual capability surface; `:65-101` — the reserved-env-key/credential-prefix deny-list; `:356-390` — the re-entrant-`ocx` refusal.
- `ocx/crates/ocx_lib/src/script/guard.rs:1-22` — the two-layer path sandbox and its documented residual TOCTOU scope.
- `ocx/crates/ocx_cli/src/command/package_test.rs:90-98` — `--script` flag definition, the sole entry point for user-authored `.star` source; `:278-330` — the read path (file or stdin).
- `ocx/crates/ocx_cli/src/command/patch_test.rs` and `crates/ocx_cli/src/command/script_runner.rs:34-64` — the second call site (`ocx patch test --script`), sharing the same runner.
- `grimoire` — zero references to `starlark` anywhere in `Cargo.toml` or `src/`; this cluster is entirely an ocx concern.
- Prior work this dive extends: `.agents/research/rust-ecosystem.md` §Open Questions #2 (deferred this exact review), `.agents/research/rust-ecosystem/dependency-update-automation-and-unused-deps.md` #15-16 (the original false-positive finding), `rules/rust-cargo/crates-of-record.md` ECO-07/ECO-42.

## Normative guidance candidates

1. **ECO-07 carve-out**: a crate with zero `use` sites is exempt from
   "delete it" when (a) it resolves to the exact same version whether
   pinned directly or left purely transitive — verify with the same
   before/after `cargo tree -i <crate>` emptying test run here — **and**
   (b) its owning family publishes from one shared workspace/release
   process, evidenced by identical version-and-date history across siblings
   on crates.io. Absent both, ECO-07 applies as written. **Verification**:
   `curl -s crates.io/api/v1/crates/<crate>/versions` for every sibling in
   the family; if `created_at` dates for the shared version match (or fall
   within the same release week) across all siblings for the last 4+
   releases, condition (b) holds. MUST.
2. **Allowlist the finding instead of leaving a comment.** Add `[workspace.metadata.cargo-shear] ignored = ["starlark_syntax", "starlark_map", "starlark_derive"]` to `ocx/Cargo.toml` (`liblzma` already has the crate-level equivalent; the workspace-level table is currently empty). A prose comment is not machine-checked and does not survive an agent that runs `cargo shear --fix`. **Verification**: `cargo shear` output no longer lists these three names as findings requiring a fix; a fresh clone with `cargo shear --fix` run blind does not remove them. MUST.
3. **Wire `cargo shear` into CI.** TOOL-05 already names it as the SHOULD-tier unused-dependency gate; it is not currently run anywhere in `.github/workflows/`. Without it, the allowlist in (2) has nothing checking it stays accurate as the cluster evolves. **Verification**: a CI step runs `cargo shear`. SHOULD (inherits TOOL-05's tier).
4. **Track `starlark` 0.14.x as an upgrade, not a backlog item.** The gap it closes — `set_max_tick_count`/`set_max_heap_size`/`set_check_cancelled` — is exactly the "ACCEPTED v1 LIMITATION" `script.rs` already documents as unmitigated. This is a breaking-change upgrade (0.14.0's own changelog lists 9 breaking API changes) requiring a manual review pass per ocx's own pin-rationale comment, not a version-bump PR. **Verification**: `curl -s https://crates.io/api/v1/crates/starlark | jq .crate.max_version` — track for the next release after `0.14.2`; the upgrade PR must add calls to `set_max_tick_count` and `set_max_heap_size` in `engine.rs`'s `evaluate()`, not just bump the manifest version. SHOULD.
5. **Do not claim the current wall-clock limit bounds a pure-compute script.** `ScriptLimits::wall_clock` (`script.rs:58-61`) only bounds each `ocx.run` child-process invocation; it has no effect on Starlark evaluation time itself, which `script.rs`'s own comment already documents as unbounded pending a starlark upgrade or a subprocess-isolated evaluator. Any doc, security review, or audit checklist claiming ocx's Starlark scripts run under a time limit today is wrong per SEC-32 (never document a control that doesn't exist). **Verification**: `rg -n 'wall_clock|time.?out' crates/ocx_lib/src/script*` — confirm every hit scopes to `ocx.run`'s child, never to `eval.eval_module`. MUST.
6. **A crate's `repository` field pointing at an archived repo is not proof of abandonment — but it is not proof of health either; resolve it.** `allocative`'s crates.io `repository` field points at `facebookexperimental/allocative`, archived 2026-06-14 with a banner redirecting to `facebook/buck2`; the actual current publishing source is `facebook/starlark-rust`'s own workspace. ECO-01 mandates the JSON API over the rendered page; this finding shows the JSON API's own `repository` field can itself be a dead pointer for a crate that migrated homes without a rename. **Verification**: when a crate's `repository` field 404s, redirects, or shows a GitHub archival banner, follow it before either killing or clearing the dependency — check whether the crate is still publishing (fresh `updated_at`) from a *different* location first. SHOULD.
7. **`ocx.run` is the actual attack surface of this embedding, not the Starlark language.** Starlark itself and every enabled `LibraryExtension` are I/O-free by construction (verified per-variant against `docs.rs`); all filesystem and network reach available to a `.star` script comes from ocx's own `ocx_module.rs`, and `ocx.run` in particular grants full, OS-unconfined subprocess execution once past the reserved-env-key and re-entrancy checks. Any future security review of "can a malicious `.star` script do X" should start at `ocx_module.rs::run`, not at the starlark crate's changelog. **Verification**: `rg -n 'fn run<' crates/ocx_lib/src/script/ocx_module.rs` — confirm the function still spawns via `tokio::process::Command::new(program)` with no seccomp/namespace/chroot wrapper. SHOULD.

## Contested / evolving

- **Whether the exact-pin discipline should extend to a caret range once
  ocx completes the 0.14.x upgrade.** starlark's own release cadence is
  fast (six releases in the last twenty months, one yanked) and each is
  breaking-change-bearing; nothing in this dive settles whether ocx should
  keep hand-reviewing every bump indefinitely or adopt a narrower
  "unreviewed patch-level drift is fine, minor-level needs a pass" policy —
  starlark's 0.x versioning makes every bump minor-shaped regardless, so
  the caret-vs-exact question may be moot until the crate reaches 1.0 (no
  1.0 timeline stated anywhere in the repo).
- **Whether `ocx.run`'s unconfined subprocess model should gain OS-level
  sandboxing** (namespaces/seccomp/a `cap-std`-style directory handle for
  the child, not just the guard's own file-write restrictions). This is a
  design question with real cost (platform-specific, no existing ocx
  dependency covers it) that this dive surfaces but does not resolve — it
  is the natural follow-up to normative candidate #7 and deserves its own
  design pass rather than a rule minted from this file alone.
- **Whether the `glob` cargo-shear finding (unrelated to this cluster,
  surfaced incidentally in F8) is a genuine phantom or another false
  positive of the same shape as this cluster.** Out of scope here; flagged
  for whoever picks up the next `cargo-shear`-adjacent dive.

## Sources

| Source | What it established | URL |
|---|---|---|
| crates.io JSON API, all 5 crates | `updated_at`, `max_version`, `repository`, `downloads` (checked 2026-08-14) | https://crates.io/api/v1/crates/starlark (and `/starlark_syntax`, `/starlark_map`, `/starlark_derive`, `/allocative`) |
| crates.io JSON API, `/versions` for all 5 | Identical release dates across `starlark`/`starlark_syntax`/`starlark_map`/`starlark_derive`; `allocative` tracking within days | https://crates.io/api/v1/crates/starlark/versions |
| `facebook/starlark-rust` GitHub repo metadata | `pushed_at: 2026-08-14`, `archived: false`, active commit history same-day | https://github.com/facebook/starlark-rust |
| `facebook/starlark-rust` `README.md` (main branch) | No-API-stability policy verbatim, Components section ("should not be used directly" for `starlark_derive`), release process, Meta ownership history | https://raw.githubusercontent.com/facebook/starlark-rust/main/README.md |
| `facebook/starlark-rust` `CONTRIBUTING.md` | "Developed in Meta's internal repositories... exported out to GitHub" | https://raw.githubusercontent.com/facebook/starlark-rust/main/CONTRIBUTING.md |
| `facebook/starlark-rust` `CHANGELOG.md` | 0.13.0 (Dec 13, 2024) vs 0.14.0 (May 22, 2026) content; "Resource limits: instruction count and heap memory limits" landing in 0.14.0; breaking-change list | https://raw.githubusercontent.com/facebook/starlark-rust/main/CHANGELOG.md |
| `facebook/starlark-rust` `starlark/src/values/traits.rs` | `StarlarkValue<'v>` real supertrait bound including `Allocative` | https://raw.githubusercontent.com/facebook/starlark-rust/main/starlark/src/values/traits.rs |
| `facebook/starlark-rust` root `Cargo.toml` | `allocative/allocative` as a workspace member, confirming allocative's current publishing home | https://raw.githubusercontent.com/facebook/starlark-rust/main/Cargo.toml |
| docs.rs, `starlark` 0.13.0 `Evaluator` | Exact method list for the pinned version — `set_max_callstack_size` only | https://docs.rs/starlark/0.13.0/starlark/eval/struct.Evaluator.html |
| docs.rs, `starlark` 0.14.2 `Evaluator` | New methods + verbatim "not considered secure against truly malicious code... Use OS-level APIs in a subprocess" doc text | https://docs.rs/starlark/0.14.2/starlark/eval/struct.Evaluator.html |
| docs.rs, `starlark` 0.13.0 `LibraryExtension` | Per-variant capability description confirming no file/network I/O in any stdlib extension | https://docs.rs/starlark/0.13.0/starlark/environment/enum.LibraryExtension.html |
| GitHub archival banner, `facebookexperimental/allocative` | Archived 2026-06-14, redirect notice to `facebook/buck2` | https://github.com/facebookexperimental/allocative |
| `facebook/buck2` repo contents API | Confirms `allocative/` directory present in buck2 too (Meta's multi-repo sync pattern) | https://github.com/facebook/buck2 |
| OSV.dev API query, all 5 crates | Zero advisories against any crate in the cluster | https://api.osv.dev/v1/query |
| GitHub code search, `rustsec/advisory-db` | Zero advisory files matching any of the 5 crate names | (via `gh api search/code?q=repo:rustsec/advisory-db+<crate>+in:path`) |
| Empirical `cargo check -p ocx_lib` with siblings removed | Direct evidence the three zero-use-site crates are not compile-required — Cargo's own resolver already unifies them transitively | (local, this dive; manifests + lockfile restored and diff-verified after) |
| `cargo shear`, run live against ocx @ HEAD | 9 live findings, no allowlist, confirming F8 | (local, this dive) |
| crates.io JSON API, `rhai`/`rune`/`mlua` | Alternatives sizing table (F9) | https://crates.io/api/v1/crates/rhai (and `/rune`, `/mlua`) |
| ocx source tree @ HEAD (uncommitted working tree) | All file:line citations in "Applied to the codebases" | /home/mherwig/dev/ocx |
| Prior work extended by this dive | `rust-ecosystem.md` ECO-42, §Open Questions #2; `dependency-update-automation-and-unused-deps.md` #15-16; `rules/rust-cargo/crates-of-record.md` ECO-07 | `.agents/research/rust-ecosystem.md`, `.agents/research/rust-ecosystem/dependency-update-automation-and-unused-deps.md`, `rules/rust-cargo/crates-of-record.md` |
