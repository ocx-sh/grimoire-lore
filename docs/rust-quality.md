# rust-quality

Traps, not maps. A Rust quality rule set that names the mistakes which get
made without it — and leaves out the architecture of any particular
codebase, which is discoverable by reading the code.

```sh
grim add ghcr.io/ocx-sh/lore/rust-quality
```

Loads on any `**/*.rs`.

## What loads, and when

The rule itself is an **index**: about 110 lines carrying the verification
gate, twenty non-negotiables, and a routing table. Depth lives in 18
sibling files that load only when the work calls for them, so writing a
`Drop` impl never costs you the TUI rules.

| Doing… | Read |
|---|---|
| Types, traits, modules, crate boundaries | `architecture.md` |
| Error types, what a failure returns or prints | `errors.md` |
| Ending a process, exit status, argv, stdout | `cli-contract.md` |
| Anything async, spawned, locked, timed out, cancelled | `async.md` |
| Archives, untrusted paths, subprocesses, credentials, TLS | `security.md` |
| Tests, fixtures, snapshots, seams | `testing.md` |
| Public signatures, derive sets, conversions | `api-and-idioms.md` |
| On-disk and wire formats, deterministic output | `data-and-formats.md` |
| Paths, filenames, `cfg(target_os)`, the clock | `platform-and-paths.md` |
| Atomic writes, fsync, locks, guards, `Drop` | `durable-state.md` |
| Reviewing a diff someone else wrote | `reviewing-a-diff.md` |
| Whether a change weakened the gate instead of fixing it | `diff-integrity.md` |
| Moving code at scale — extract a type, split a crate | `restructuring.md` |

Plus `performance.md`, `docs-and-tracing.md`, `current-apis.md`,
`package-manager-domain.md` and `tui.md`.

## What makes it different

**Every rule carries a verification** — a command, a lint name, or a named
reading heuristic. A rule nobody can check is a comment, and it does not
enter the set.

**It is dated and sourced.** Each rule was distilled from a cited research
corpus of 111 files, with primary sources fetched rather than recalled.
Guidance that is edition- or version-specific says so, because stale advice
is the most dangerous kind for a model trained on older text.

**It states what a model gets wrong.** Version-blind recall is the
highest-frequency failure mode in agent-written Rust: the crate that was
right in 2021, the API that moved, the builder that gained a required
argument. `current-apis.md` exists for exactly that.

**A pinned exit-code contract.** Statuses, their meanings, and the stream
each kind of output belongs on — scripted against and locked by tests, so
a number invented locally is a shipped contract break.

## Scope

Written for CLI tools and package managers that ship prebuilt binaries —
the failure modes are drawn from that shape of program: registries,
archives, caches, atomic installs, terminal output. Most of it is general
Rust; the parts that are opinionated say so and tell you to adopt or
replace them wholesale rather than re-litigate them one rule at a time.

Anything `cargo clippy -- -D warnings` already catches is deliberately
absent. The linter ran; this is for what it cannot see.

## See also

- **`rust-cargo`** — lint policy, toolchain pinning, dependency gates, CI
  and release settings. Loads on `Cargo.toml`.
- **`rust-essentials`** — the bundle that installs both.

Apache-2.0 · [source](https://github.com/ocx-sh/grimoire-lore)
