---
title: OCX/Grimoire exit-code and CLI-output contract audit
agent: inv-exit
model: sonnet
scope: >
  Real, currently-implemented exit-code taxonomy and CLI stdout/stderr/help
  contract of the ocx and grimoire Rust binaries (ocx_cli, ocx_shim,
  ocx_schema, grim, ocx-mirror), diffed against the two copies of
  quality-rust-exit_codes.md and quality-cli-help.md.
sources:
  - /home/mherwig/dev/ocx/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-cli-help.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/ocx/crates/ocx_lib/src/cli/exit_code.rs
  - /home/mherwig/dev/ocx/crates/ocx_lib/src/cli/classify.rs
  - /home/mherwig/dev/ocx/crates/ocx_lib/src/cli/clap.rs
  - /home/mherwig/dev/ocx/crates/ocx_cli/src/main.rs
  - /home/mherwig/dev/ocx/crates/ocx_cli/src/app.rs
  - /home/mherwig/dev/ocx/crates/ocx_shim/src/main.rs
  - /home/mherwig/dev/ocx/crates/ocx_schema/src/main.rs
  - /home/mherwig/dev/ocx/website/src/docs/reference/command-line.md
  - /home/mherwig/dev/grimoire/src/cli/exit_code.rs
  - /home/mherwig/dev/grimoire/src/error.rs
  - /home/mherwig/dev/grimoire/src/main.rs
  - /home/mherwig/dev/grimoire/test/tests/test_exit_codes.py
  - /home/mherwig/dev/ocx-mirror/src/error.rs (external CI tool, reuses ocx_lib::cli::ExitCode)
---

# OCX/Grimoire exit-code and CLI-output contract audit

## 1. Definitive exit-code table

Both `.claude/rules/quality-rust-exit_codes.md` copies (ocx and grimoire) are
byte-identical except the 81 entry's name/prose. Neither copy — nor ocx's own
public website docs — documents code 82, which exists and is live in ocx code.

| Code | Symbolic name (ocx) | Symbolic name (grimoire) | Meaning | Defined | Produced (example) | Asserted in tests |
|---|---|---|---|---|---|---|
| 0 | `Success` | `Success` | Success | [ocx exit_code.rs:22](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/exit_code.rs#L22), [grim exit_code.rs:22](file:///home/mherwig/dev/grimoire/src/cli/exit_code.rs#L22) | both `main.rs` `Ok` arms | both `exit_code.rs` unit tests |
| 1 | `Failure` | `Failure` | Generic fallback | same files, `Failure = 1` | ocx `classify.rs:67` fallthrough; grim `error.rs:221` fallthrough | ocx `classify.rs:661`, grim `error.rs:1009` |
| 64 | `UsageError` | `UsageError` | Bad CLI invocation | both, `= 64` | ocx `cli/clap.rs:44` (`parse()` helper, shared); grim `main.rs:284` (inlined in `main`) | grim `error.rs:568,583`, ocx `classify.rs:596` |
| 65 | `DataError` | `DataError` | Malformed input data | both, `= 65` | pervasive across both | pervasive |
| 69 | `Unavailable` | `Unavailable` | Registry/resource unreachable, non-retryable | both, `= 69` | e.g. grim `error.rs:216` (`Announce` remote faults) | grim `error.rs:1062` |
| 74 | `IoError` | `IoError` | Filesystem I/O fault | both, `= 74` | `classify_io` in both | both |
| 75 | `TempFail` | `TempFail` | Retryable transient failure | both, `= 75` | grim `error.rs:449` (helper timeout); ocx-mirror push retry (`ocx_cli/push.rs:157`) | ocx `classify.rs:556`, ocx-mirror `push/tests/retry.rs` |
| 77 | **`PermissionDenied`** | **`NoPermission`** | `EPERM` | ocx `exit_code.rs:49`; grim `exit_code.rs:43` | `classify_io` in both | both |
| 78 | `ConfigError` | `ConfigError` | Bad config | both, `= 78` | pervasive | pervasive |
| 79 | `NotFound` | `NotFound` | Resource/config-path not found | both, `= 79` | grim `error.rs:263` (`NotDiscovered`→`NoConfig` reason); grim python test `test_exit_codes.py` locks explicit `--config <missing>` → 79 | grim `test_exit_codes.py:42`, ocx `classify.rs:217` |
| 80 | `AuthError` | `AuthError` | Auth failure | both, `= 80` | `classify_auth` in both | both |
| 81 | **`PolicyBlocked`** | **`OfflineBlocked`** | Deliberate `--offline`/`--frozen` refusal | ocx `exit_code.rs:63`; grim `exit_code.rs:55` | ocx: shared by offline+frozen; grim: `AccessErrorKind::OfflineMiss`, `AuthError::VerifyOffline` | ocx `classify.rs:494,508,519,531,649,880`; grim (implicit via `classify_access`) |
| 82 | **`DirtyRcBlock`** *(ocx only)* | — *(absent)* | `ocx self setup` refused to touch a shell-RC block carrying user edits | [ocx exit_code.rs:67](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/exit_code.rs#L67) | [self_group/setup.rs:187](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/command/self_group/setup.rs#L187), [config_setup.rs:145](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/command/config_setup.rs#L145) | [exit_code.rs:158-163](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/exit_code.rs#L158) | **not in either rule doc, and not in the public website table either** ([command-line.md:301-306](file:///home/mherwig/dev/ocx/website/src/docs/reference/command-line.md#L301)) |
| n/a | — | `.slug()` machine string | JSON error envelope `code` field (`"success"`…`"offline-blocked"`) | [grim exit_code.rs:64-79](file:///home/mherwig/dev/grimoire/src/cli/exit_code.rs#L64) | `main.rs` `error_document()` | grim `exit_code.rs:157-172` | **grimoire-only feature, entirely undocumented in the shared rule** |

## 2. Contract bypasses (code that doesn't route through the taxonomy)

- **`ocx_schema` binary — raw, unclassified `process::exit(1)`.** [`ocx_schema/src/main.rs:15`](file:///home/mherwig/dev/ocx/crates/ocx_schema/src/main.rs#L15): an unknown `schema_for()` argument (a usage error — bad CLI invocation) exits `1` (`Failure`) instead of `64` (`UsageError`). Does not use `ocx_lib::cli::ExitCode` at all — this binary is entirely outside the taxonomy.
- **`ocx_shim` — a second, parallel exit-code taxonomy by design.** Its own doc comment ([`ocx_shim/src/main.rs:13-19`](file:///home/mherwig/dev/ocx/crates/ocx_shim/src/main.rs#L13)) states it "does not use OCX's `Error` enum"; it defines a local `ShimError` (E1-E8) mapped ad hoc to sysexits values (78/77/74/69/74) documented only in an ADR. This is a direct, *acknowledged* violation of the rule's own Block anti-pattern "Different binaries in same workspace using different exit-code taxonomies" — justified in-repo (Windows launcher constraints) but never called out as an exception in the rule doc.
- **Child-process/script exit forwarding uses `128 + signal`, not the sysexits enum — correctly, and by design.** [`ocx_lib/src/utility/child_process.rs:35-50`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/utility/child_process.rs#L35), [`script/ocx_module.rs:245`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/script/ocx_module.rs#L245): a signal-killed child (`ocx exec`, sandboxed script execution) reports `128 + signum`. This is the *only* place either codebase produces a 128+ code, and it is a forwarded child status, never the CLI's own process exit — **grim/ocx do not install their own Ctrl-C/SIGINT handler**; no code path returns 130 for the top-level binary itself (default OS disposition applies, uncatchable by Rust's normal `main`).

## 3. The rule's own Block-tier anti-pattern is violated by ocx's real architecture

The rule (identical in both copies) explicitly blocks: *"Trait-based error-to-exit-code mapping per error type — circular dep lib → cli → lib. Use free function walking error chain."* and prescribes the free-function `classify_error` shown in its Canonical Shape section.

- **ocx does the opposite.** [`ocx_lib/src/cli/classify.rs:44`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/classify.rs#L44) defines `pub trait ClassifyExitCode { fn classify(&self) -> Option<ExitCode> }`, implemented on **50+ error types** across the workspace (`grep` count — `oci/index/error.rs`, `package_manager/error.rs`, `auth/error.rs`, `config/error.rs`, `announce/error.rs`, `patch/error.rs`, etc., plus CLI-local types in `ocx_cli/src/app.rs:61` and `app/project_context.rs:108`). The free function `classify_error` in the same file is only a thin chain-walker that calls `.classify()` on each downcast — it is trait dispatch wearing a free-function's name.
- **grimoire follows the documented pattern faithfully.** [`grimoire/src/error.rs:177`](file:///home/mherwig/dev/grimoire/src/error.rs#L177) `classify()` is a genuine free function with one big exhaustive `match` over a single top-level `Error` enum — exactly the rule's prescribed shape, extended with a `Classification { exit, reason }` struct (§4) the rule doesn't mention.
- **This is the single largest doc/code divergence found.** The rule is either aspirational (never true of ocx) or stale (ocx moved to trait dispatch after the rule was written, likely for the composability the trait's own doc comment argues for — nested wrapper variants recursively delegating via `inner.classify()`). Either way, **ocx's production code is authoritative in practice; the rule text is not.**

## 4. stdout/stderr, JSON mode, help/version, signals

- **Error chain → stderr, once, at the single `main.rs` boundary**, in both: ocx via `log::error!` (sanitized through `api::data::sanitize_for_terminal`, [`ocx_cli/main.rs:36`](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/main.rs#L36), CWE-150-driven, structurally pinned by a same-file test); grim via a direct `writeln!(io::stderr(), "{err:#}")` ([`grim/main.rs:326`](file:///home/mherwig/dev/grimoire/src/main.rs#L326)).
- **`--format json` (grim only, confirmed):** grim emits a structured `{"error": {"code": <slug>, "exit": <int>, "message": …, "reason"?, "retryable"?, "forceable"?}}` document to **stdout** (never stderr, to avoid interleaving with tracing) — [`grim/main.rs:220-265`](file:///home/mherwig/dev/grimoire/src/main.rs#L220), documented at `docs/src/json-interface.md`. This entire envelope (slug, reason, retryable/forceable) is **not mentioned anywhere in either copy of the exit-code rule**. ocx has an equivalent `--format`/`DataInterface` JSON output path (`ocx_lib/src/cli/data_interface.rs`) for command *results*, but no equivalent structured *error* document was found in ocx.
- **Stdout-pipe-closed (`| head`) handling: grim only, explicitly.** [`grim/main.rs:319-320`](file:///home/mherwig/dev/grimoire/src/main.rs#L319): a downstream-closed stdout pipe short-circuits to `ExitCode::Success` (ripgrep/cargo convention), detected via a `StdoutPipeClosed` sentinel walked through the chain. No equivalent found in ocx's `main.rs`.
- **`--help`/`--version` → exit 0; every other clap parse failure → `UsageError` (64), in both**, but structured differently: ocx factors this into a shared helper, [`ocx_lib/src/cli/clap.rs:31`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/clap.rs#L31) `pub fn parse(cmd: Command) -> Result<ArgMatches, ExitCode>`, reused by every ocx binary; grim inlines the same `ErrorKind::DisplayHelp | DisplayVersion` match directly in `main()` ([`grim/main.rs:282-285`](file:///home/mherwig/dev/grimoire/src/main.rs#L282)) — not factored out, only one binary (`grim`) exists so there's nothing to share yet.
- **Flags:** ocx has `--quiet`/`-q`, `--log-level`, `--color`, `--offline`, `--frozen`, `--remote`, `-g/--global` on `ContextOptions` ([`ocx_cli/app/context_options.rs`](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/app/context_options.rs)). grim has `--format`, `--color`, `--log-level` on `GlobalOptions` ([`grim/src/cli/options.rs:60`](file:///home/mherwig/dev/grimoire/src/cli/options.rs#L60)) but **no `--quiet` flag** — a real CLI-surface asymmetry, not just naming.
- **`quality-cli-help.md` exists only in ocx** (no grimoire copy found); grimoire's `--help` text is not covered by an equivalent enforced rule.

## 5. Proposed canonical table (recommendation)

| Code | Name | Status |
|---|---|---|
| 0 `Success`, 1 `Failure`, 64 `UsageError`, 65 `DataError`, 69 `Unavailable`, 74 `IoError`, 75 `TempFail`, 78 `ConfigError`, 79 `NotFound`, 80 `AuthError` | — | **Already implemented identically everywhere** (ocx, grimoire, ocx-mirror). Pin as-is. |
| 77 | Pick one name. Recommend **`PermissionDenied`** (ocx's name, and grimoire's *own rule doc* already says this — only grimoire's *code* drifted to `NoPermission`). | **Implemented in some** — a doc/code mismatch inside grimoire itself, not just a cross-repo split. |
| 81 | Pick one name. Recommend **`PolicyBlocked`** (ocx's name covers both offline *and* frozen policy refusals explicitly; grimoire's `OfflineBlocked` is narrower than what it's actually used for — `--frozen` exists in ocx, and grimoire's own `AuthError::VerifyOffline` case is arguably a policy block, not strictly "offline"). | **Implemented in some**, name split. |
| 82 `DirtyRcBlock` | Document it. It is real, tested, shipped ocx behavior missing from *every* doc surface (rule + website). | **New** (doc-only gap — code is fine). |
| — | Add a row to the rule for the **trait-based `ClassifyExitCode` pattern** as ocx's actual sanctioned approach, or mark ocx as deliberately non-compliant with the free-function Block rule and scope that rule to greenfield/grimoire-style codebases only. | **Rule/code conflict — must be resolved explicitly, not silently pinned.** |
| — | Note the `ocx_shim` exception (separate binary, separate taxonomy, ADR-justified) as an allowed carve-out in the "one enum per workspace" principle. | **New** (currently an undocumented exception). |
| — | Note `ocx_schema`'s raw `process::exit(1)` as a bug to fix (should be `UsageError`), not a pattern to pin. | **Divergent — code is wrong, not the rule.** |
| — | grim's `Classification{exit, reason}` + `.slug()` JSON error envelope (reason, retryable, forceable) is a mature, tested, real 1.0 contract (`docs/src/json-interface.md`) that the shared rule says nothing about. | **New** — worth folding into the rule if JSON error output is meant to be a cross-tool contract, otherwise scope the rule to exit codes only and point to `json-interface.md` separately. |
