---
title: "ocx CLI contract a C# SDK binds to - numbers-first audit"
agent: ocx-cli-contract (sonnet subagent, research-lang csharp, 2026-10-10)
model: claude-sonnet-5-5
scope: ~/dev/ocx (Rust) crates ocx_cli, ocx_exit, ocx_exit_derive, ocx_schema, ocx_env, ocx_config, ocx_console, ocx_sdkgen, ocx_shim + website/src/docs; ~/dev/ocx-sdk-python as the reference consumer; live setup.ocx.sh / ocx.sh/schemas; the installed ocx 0.6.5 binary for measurements
method: see "Method" - every number has its command inline next to it
---

# ocx CLI contract for a C# SDK

Citation form: `ocx@<sha12>:path:line`. Three code states matter and are NOT the same thing:

| Label | What | sha12 |
|---|---|---|
| **v0.6.5** | the last release; what `ocx` on PATH is today | `26ad03a17b34` |
| **main** | `origin/main`, v0.6.5 + 3 commits, carries the whole machine-interface contract (PR #580, commit `6daf9a164c1c`, 2026-10-07), UNRELEASED | `246863abc1d4` |
| **#604** | open PR `fix/580-followups` (11 commits ahead of main: `git log --oneline origin/main..fix/580-followups | wc -l`, MERGEABLE), hardens main | `cb48abdd15e3` |

The working tree at `~/dev/ocx` is branch `goat` (`5de9d777e`, 18 commits behind main, no sdkgen sources). I read `origin/main` through `git archive`, not the working tree.

## 0. Headline: the hypothesis is half wrong

Framing: "a stable CLI contract exists that a C# SDK binds to". Measured: **a designed contract exists, but no released ocx implements it.**

- `git tag --contains 6daf9a164` prints nothing; `git rev-list --count v0.6.5..origin/main` = 3. The contract (`schema_version` on every root, `contract` in `ocx version`, error document on usage errors, `cli.json`) is in 1 unreleased commit (1059 files, +132648/-24880: `git show --stat --format= 6daf9a164 | tail -1`).
- Released v0.6.5, measured with `ocx --json --offline index list cmake`: stdout is `{"cmake": []}` (bare map, no `schema_version`), `ocx --json --bogus` exits 64 with **0 bytes on stdout**, `ocx --format json version` has **no `contract` key** (`ocx --json version | head -20`). Docs for main describe a different binary.
- The shipped SDK generator's own floor is wrong: `MINIMUM_OCX = "0.6.4"` (`ocx@246863abc1d4:crates/ocx_sdkgen/src/rust.rs:27`), but v0.6.4 and v0.6.5 both lack `contract` (`git show v0.6.5:crates/ocx_schema/tests/golden/cli.json` -> path does not exist). Its own handshake would answer `Error::Unsupported` against both.
- The contract is not frozen: no baseline cut yet. #604 rolls reports and errors schemas BACK to v1 in place (`c3385fae2`: "hardening edits the v1 documents in place until the first baseline is cut (`task contract:rotate`)"). Live today: `curl -sSI https://ocx.sh/schemas/reports/v1.json` 200 (58 roots, 212 defs), `reports/v2.json` 200 (56 roots, 284 defs), `errors/v2.json` 200, `errors/v1.json` 404, `cli/v1.json` 404.
- **C# is not on the generator's language list.** `Lang` has exactly one variant, `Rust` (`ocx_sdkgen/src/lib.rs:147-149`). The ADR research names Python, TypeScript, Rust, Go, Swift, Java (`.claude/artifacts/research_zero_dep_sdk_codegen.md:11`, `git show origin/main:.claude/artifacts/research_zero_dep_sdk_codegen.md | sed -n 11p`); `grep -ciE "c#|csharp|dotnet"` over that file, the ADR and the plan = 0 hits. A C# SDK is hand-written (ADR Option C wording "SDKs hand-written") or a new backend.

Reference consumer is stale against main: `ocx-sdk-python@80136dde4162` pins `TESTED_OCX_VERSION = "0.6.2"` / `MIN_SUPPORTED = "0.6.2"` (`src/ocx_sdk/_types.py:30,33`) and an `ExitCode` enum of 17 members with 82 = `DIRTY_RC_BLOCK`, 83-86 present, 87 missing (`_errors.py:28-51`). It is the shape to copy (typed handles, `--format json --color never`, env neutralisation) but not the numbers.

## 1. Exit-code table

Defined once: `ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs:44-78` (macro rows; `ALL` = published table), `#[repr(u8)] #[non_exhaustive]`. 13 codes on main, **18 on v0.6.5** (`for r in v0.6.5 origin/main; do git show $r:crates/ocx_exit/src/exit_code.rs | grep -cE '^\s+[A-Z][A-Za-z]+ = [0-9]+'; done` -> 18, 13). Retired forever: 83-87 (`exit_code.rs:84`, test `retired_numbers_are_never_reused`).

Columns: "Produced" = `#[exit(<Variant>...)]` attribute uses outside ocx_exit/ocx_exit_derive/ocx_test_support (python `re` over `crates/**/*.rs`, 443 total); "Slugs" = unique `error.detail` slugs per code from `crates/ocx_cli/src/exit/detail_rows.txt` (505 unique over 532 rows); "Accept." = acceptance files under `test/tests/*.py` that compare a returncode/exit_code to that number (regex `(returncode|exit_code|\.code)\s*(==|!=|in)\s*\(?N\b`); Rust-side every code is pinned by `pinned_value` + `all_lists_every_code_once_in_declaration_order` (`exit_code.rs`, tests).

| Code | Name (kind) | Meaning | Produced | Slugs | Accept. |
|---|---|---|---|---|---|
| 0 | Success (internal) | succeeded | - | - | 97 |
| 1 | Failure (internal) | no specific code applies | 9 | 58 | 4 |
| 64 | UsageError (usage_error) | bad flag/arity/syntax; clap errors remapped from clap's 2 (`clap_parse.rs`) | 52 | 50 | 34 |
| 65 | DataError (data_error) | malformed identifier/digest/manifest, verification fails | 182 | 180 | 33 |
| 69 | Unavailable (unavailable) | service answered badly; rerun will NOT help | 7 | 11 | 4 |
| 74 | IoError (io_error) | filesystem read/write | 32 | 37 | 12 |
| 75 | TempFail (temp_fail) | transient; the ONLY code where automated retry is safe | 16 | 21 | 11 |
| 77 | PermissionDenied (permission_denied) | EPERM, forge refusal | 6 | 8 | 9 |
| 78 | ConfigError (config_error) | bad config / bad `OCX_*` value | 88 | 92 | 22 |
| 79 | NotFound (not_found) | package/tag/file absent | 31 | 28 | 27 |
| 80 | AuthError (auth_error) | 401/403, missing credentials | 6 | 7 | 7 |
| 81 | PolicyBlocked (permission_denied) | `--offline`/`--frozen`/dirty shell block refused | 9 | 9 | 16 |
| 82 | Unsupported (unsupported) | registry/forge/build lacks capability; never retry | 5 | 4 | 5 |

Facts that bite an SDK:
- 11 `error.kind` values (`ocx_exit/src/error_category.rs:53-65`), 13 exit codes: `81 PolicyBlocked` maps to kind `permission_denied` (`exit_code.rs:73`), so **kind does not determine the code and the code does not determine the kind**; branch on `exit_code` first, `kind` second, `detail` third.
- Released 0.6.5 had `82 DirtyRcBlock, 83 TransparencyLogUnavailable, 84 ReferrersUnsupported, 85 UnsupportedKeyBackend, 86 ForgeCapabilityUnavailable, 87 RegistryDeleteUnsupported` (`git show v0.6.5:crates/ocx_exit/src/exit_code.rs`). Main reuses **82 with a new meaning** (commit message table: 82 dirty profile -> 81; 84/85/86/87 -> 82). Same number, different meaning across one release: an SDK table must be keyed by ocx version or refuse unknown pairs.
- Child exit forwarding: `ocx exec` returns the child's code unchanged. Measured on 0.6.5 (`ocx --offline exec -- sh -c 'exit 64'`): exit 64, indistinguishable from UsageError; child SIGTERM -> 143; `exit 300` -> 44 (mod 256); missing command -> 65 with a long "searched: [...]" message. Do not infer ocx failure from the code of `exec`/`run`/`package exec`/`package test` (output kind `passthrough`).
- `index list <missing package>` exits **0** with a stderr warning on 0.6.5 (`ocx --json --offline index list zz; echo $?`). "Not found" is sometimes data, not an exit.
- Exit codes are not the full outcome: 17 command modes are `report_then_fail` (`cli.json`: `python3 -I` count over `output[].type`; totals report 65, report_then_fail 17, empty 10, passthrough 7, shell_stream 5, raw_document 1): the full report is on stdout AND exit is non-zero. Parse stdout when exit != 0, but only for those commands.
- Windows shim exit codes: 78 sidecar bad, 77 containment, 74 self-path/spawn, 69 ocx not found (`ocx_shim/src/main.rs:20-40`). Same table, so `69` from a launcher means "ocx missing".
- Docs vs code agree on the 13 (`website/src/docs/reference/command-line.md:320-362` "Numbers 83-87 are retired"). The doc's `case $?` example uses `ocx package install` which exists (cli.json leaf `package install`).

## 2. Machine-readable output surface

- Flag: **global, pre-subcommand only**: `--format <plain|json>`, `--json` (alias; last of the two wins), `--quiet/-q`, `--color <auto|always|never>`, `--log-level/-l`. All 13 root args have `"global": false` (`python3 -I` over cli.json: `sum(a['global'] ...)` = 0). Measured on 0.6.5: `ocx version --format json` -> exit 64 "unexpected argument '--format' found"; `ocx --format json version` works; `ocx --format=json version` works (the Rust SDK emits this form: `runtime.rs` `argv.word("--format=json")`).
- **No env var for format or color.** `python3 -I` over the 124 `env` entries: none named `*FORMAT*`; `OCX_QUIET` exists. The SDK must pass `--format json` on every call and `--color never`.
- Stdout/stderr discipline (main docs `machine-interface.md:24,67-77`): stdout holds exactly one pretty-printed JSON document per invocation, also after a usage error; `--quiet` suppresses success reports only, a failure still prints the error document. Log lines, warnings, progress go to stderr. Measured on 0.6.5: `ocx --log-level trace --json status` -> stdout 600 B parses as one JSON doc, 5 stderr lines.
- Roots (main): 56 roots in `reports.json`, 50 at `schema_version` 1, 6 at 2 (`python3 -I` over `reports.json['reports']` wrappers); error document `schema_version` 2 (`error_document.rs:29`; becomes 1 under #604). Shape rules: root is an object, `schema_version` first, lists are `{schema_version, items}`, absent = unset (never `null`), unions carry `type`, keys/enums snake_case (`machine-interface.md:15-22`). Enums and unions are open; unknown `status` is NOT success (`:57-63`).
- Schema source: `ocx_schema` crate (schemars) -> goldens in `crates/ocx_schema/tests/golden/` (10 files: reports.json 368665 B, errors.json 93964 B, cli.json 450758 B, plus config/project/lock/patch/metadata/execution-record/cli-schema). Published: metadata, config, project, project-lock, patch, reports, execution-record, errors; **`cli` and `cli-schema` are "Golden only"** (`ocx_schema/src/main.rs` usage string). No ocx subcommand prints the command grammar; the SDK input is a repo checkout at a pinned commit or `ocx-sdkgen --contract <dir>`.
- Custom schema keywords a C# codegen must understand: `x-ocx-enum` (open enum with value/name/description/category/exit_code), `x-ocx-unknown-variant`, `x-ocx-opaque` (`ocx_sdkgen/src/subset.rs:11-39,50-58`); allowlist of 25 keywords; `$defs` 284 in reports, 6 in errors (`ExitCode` 13 values, `ErrorDetail` 505 values with `exit_code` each).
- Not JSON, on purpose (`cli.json` output kinds): `passthrough` (exec/run/launcher/package exec/package test), `shell_stream` (env --shell, shell completion, self activate, direnv export), `raw_document` (`package sbom`), `empty` (init, create, ...). `--json` after a bare `--` belongs to the child.
- Progress/colour/TTY: progress only when stderr is a terminal (`ocx_console/src/options/progress_mode.rs:12`, `console::Term::stderr().is_term()`); piped stderr = no bars (test `test_progress_channel.py` asserts on a pty because a pipe proves nothing). Colour precedence `NO_COLOR` > `CLICOLOR_FORCE` > `CLICOLOR=0` > `TERM=dumb` > tty probe (`color_mode.rs:102-110`); `--color` outranks all. **Measured:** `CLICOLOR_FORCE=1 ocx --json --offline index list zz 2>&1 >/dev/null | cat -v` -> `^[[33m^[[1mwarning:` (ANSI in a pipe); adding `--color never` removes it. The Rust-generated SDK sends only `--format=json` (`runtime.rs argv()`), so it inherits this leak unless its env scrub covers `CLICOLOR_FORCE` (it only strips `OCX_*`/`__OCX_*`, `spawn.rs:60-65`). The Python SDK sends `--color never` (`_client.py:119`).
- Silencing logs: `--log-level off` (flag) works on 0.6.5; env `OCX_LOG_LEVEL` is **ignored by 0.6.5** (measured: `OCX_LOG_LEVEL=trace` -> 1 stderr line vs `--log-level trace` -> 6; `OCX_LOG=trace` -> 6). 0.6.5 reads `OCX_LOG` -> `RUST_LOG` (`git show v0.6.5:crates/ocx_cli/src/tracing_init/log_settings.rs:107`); main reads `OCX_LOG_CONSOLE` -> `OCX_LOG_LEVEL` -> `RUST_LOG` (main `log_settings.rs:107`) with `OCX_LOG` retired in 0.7.0 (`cli.json` `retired`: 2 entries, OCX_LOG and OCX_NO_COMPLETIONS, removal "0.7.0"). Docs (main) say OCX_LOG_LEVEL; the installed binary says OCX_LOG: **the binary wins in practice.** Use the flag, never the env var.
- Background network activity is off for a piped SDK: `skip_reason` gates update/drift/managed-config checks on kill switch, `CI`, `--offline`, or stderr not a terminal (`app/background_check.rs:37-48`). Still export `OCX_NO_UPDATE_CHECK=1` for belt and braces.

## 3. Environment, config, directories

- `cli.json.env`: **124 entries = 56 public + 66 foreign + 2 plumbing**; 10 secret; `on_invalid`: 120 default, 4 error (`OCX_OFFLINE`, `OCX_FROZEN`, `OCX_NO_CONSENT`, `OCX_NO_VERIFY`: invalid value -> exit 78). Value kinds: string 55, path 32, bool 19, choice 6, json 4, path_list 3, integer 2, host_list 1, tri_bool 1, path_or_pem 1. Command: `python3 -I - <<<'import json;d=json.load(open("cli.json"));...'` over `crates/ocx_schema/tests/golden/cli.json`.
- Docs vs registry: `environment.md` has 59 `OCX_` headings (56 unique); the 56 public names all appear except the 3 `OCX_AUTH_{REGISTRY}_{TYPE,USER,TOKEN}` templates, which the doc spells as a prefix heading. No drift.
- Flags with an env twin (from `cli.json` root args): `--config`=OCX_CONFIG, `--project`=OCX_PROJECT, `--global`=OCX_GLOBAL, `--remote`=OCX_REMOTE, `--offline`=OCX_OFFLINE, `--frozen`=OCX_FROZEN, `--quiet`=OCX_QUIET, `--jobs`=OCX_JOBS, `--index`=OCX_INDEX, `--log-level`=OCX_LOG_LEVEL. `--format`, `--json`, `--color` have none.
- Spawn-hygiene set (union of Python SDK `_NEUTRALIZED_KEYS` `_env.py:53-60` and the Rust SDK scrub `spawn.rs:45-65`): drop ambient `OCX_PROJECT`, `OCX_GLOBAL`, `OCX_QUIET`, `OCX_NO_VERIFY` (silently disables signature verification), `OCX_NO_HOOK`, `OCX_NO_COMPLETIONS`; Rust drops EVERY `OCX_*`/`__OCX_*` then re-adds explicit pairs and sets `OCX_BINARY_PIN` to the resolved binary. Credentials: `OCX_AUTH_<SLUG>_{TYPE,USER,TOKEN}`, `OCX_IDENTITY_TOKEN`, `OCX_KEY_PASSWORD`, `OCX_SIGNING_KEY`, `OCX_ANNOUNCE_TOKEN`, `OCX_ANNOUNCE_GIT_TOKEN` (secrets to redact from logged argv/stderr).
- Home / data root: `$OCX_HOME`, else `~/.ocx` on **every OS** (`ocx_config/src/home.rs:12-18`; `std::env::home_dir`, i.e. `%USERPROFILE%` on Windows, deliberately not `dirs::home_dir`, `ocx_env/src/lib.rs:398-408`). Empty `OCX_HOME` falls back. There is no separate cache dir: `ls ~/.ocx` -> `blobs index layers locks packages projects shims state symlinks temp toolchain` + `config.toml`, `env.*`, `ocx.toml`, `ocx.lock`. Local index overridable with `--index`/`OCX_INDEX`.
- Config tiers, low to high (`configuration.md:33-49`): compiled defaults < system < user < `$OCX_HOME/config.toml` < `[managed]` snapshot < `OCX_CONFIG` < `--config` < `OCX_*` env < CLI flags (five ladder vars invert env vs file: OCX_TOOLCHAIN_ACTIVATE/PINNED/DIR, OCX_LAZY_MODE/REPORT). `OCX_NO_CONFIG=1` skips tiers 2-5, explicit paths still load. Max file 64 KiB (`loader.rs MAX_CONFIG_SIZE`). Project file `ocx.toml` found by CWD walk (stops at `OCX_CEILING_PATH`), `--project`, or `-g`; `ocx.lock` beside it.
- **Docs vs code, per-OS paths:** doc lists system `/etc/ocx/config.toml`, user Linux `$XDG_CONFIG_HOME/ocx` or `~/.config/ocx`, user macOS `~/Library/Application Support/ocx`, and **nothing for Windows**. Code: system path is the literal `/etc/ocx/config.toml` on every OS (`loader.rs:1111-1119`; on Windows that is `<current drive>:\etc\ocx\config.toml`, effectively never present); user path is `dirs::config_dir()/ocx/config.toml` (`loader.rs:1124-1129`), which is `%APPDATA%` (Roaming) on Windows. Code wins; the Windows user tier is undocumented.
- Hermetic SDK recipe the evidence supports: `OCX_NO_CONFIG=1` (+ explicit `--config`), `OCX_NO_PROJECT=1` unless a project is targeted via `--project`, own `OCX_HOME`.

## 4. Command tree an SDK must model

From `cli.json` on main (`python3 -I` walk of `root.commands`): **81 nodes = 70 leaves + 11 groups (root included among the groups)**, 4 hidden (`launcher`, `package describe`, `package info`, `run`), `external_subcommands: true` on the root only (unknown `ocx foo` -> tries plugin `ocx-foo` on PATH, else exit 64; measured `ocx --json --index list foo`). 413 args in total (156 switch, 99 string, 56 path, 39 identifier, 32 choice, 26 platform, 5 integer). Every leaf carries `version: 1` (70 of 70) and an `output[]` list.
- Top-level visible: env add clean config direnv index about init lock login logout update upgrade package patch pull remove exec shell self status inspect version (+ hidden run, launcher). Biggest leaves by arg count: `package push` 21, `package announce`/`attest` 16, `package copy`/`create`/`sbom`/`sign` 14.
- Arg grammar fields an argv builder needs (`ArgSpec` keys, 23): `long short position value{type} required required_unless num_args{min,max} default requires conflicts overrides require_equals allow_hyphen_values last trailing_var_arg value_terminator stdin_secret global hidden env deprecated`. **`repeatable` is missing on main** (clap `Vec` flags like `--env`, `--group` look single-valued); it lands in #604 (`aaf82bc13`).
- **Interactive: exactly one command prompts**: `login` (username line + password via `rpassword`; non-TTY without `--password-stdin` is exit 64 "non-interactive login requires --password-stdin", `command/login.rs`; `python3 -I` walk for `.prompt_line(`/`.prompt_secret(` finds only `login.rs:73,97`). Secrets on stdin: `login --password-stdin`, `package sign --identity-token-stdin`, `package attest --identity-token-stdin` (the 3 `stdin_secret` args). Never put these in argv; the Rust runtime takes them as bytes (`spawn.rs` `invocation.stdin`).
- Hidden interactive-shell machinery (`self activate --interactive/--no-interactive`, `shell state`, `direnv`) is irrelevant to an SDK; Python SDK drops `OCX_NO_HOOK`.
- Concurrency: cross-process lock files under `$OCX_HOME/locks` (content-keyed; project mutation mutex) (`in-depth/storage.md:56`), so parallel `ocx` children on one home are designed for. Per-spawn cost, measured: 20 sequential `ocx --json version` = 0.094 s total (about 5 ms each, WSL2, v0.6.5 musl).

## 5. Version reporting and negotiation

- `ocx --format json version` (main): `version`, optional `cargo_pkg_version`, provenance (`commit`, `build`, `ci`), and **`contract: {errors:int, commands:{"package push":1,...}, reports:{"PushReport":1,...}}`** (`api/data/version.rs:45-52`; doc `machine-interface.md:33-42`). Measured today (0.6.5): `version` "0.6.5", `commit.sha`, `build.target` "x86_64-unknown-linux-musl"; no `contract`.
- Policy: integer per document and per command; bump on removal/rename/retype/renumber, never on addition (`machine-interface.md:44-51`); "unknown keys must be ignored". Ledger `crates/ocx_schema/contract/ledger.toml` (+ `exemptions.toml`) and a compat gate in `ocx_sdkgen/src/compat.rs` (1267 lines) enforce it in the ocx repo; baseline not yet cut.
- Generated-SDK protocol to copy (`runtime.rs:293-338,376-392`): handshake once, cache; no `contract` -> `Error::Unsupported{found, minimum}`; refuse a command BEFORE spawning when the binary's version of (error doc, command, each output root) differs from the one compiled in; per call decode checks `schema_version` of the root. Only exact equality is checked (no ranges), so each ocx contract bump forces an SDK release.
- Release metadata: `https://setup.ocx.sh/dist.json` (`schema: 1`, `latest`, `latest_next`, `releases[]` with `version, channel, tag, target, filename, sha256, url`): **280 release rows over 35 versions (newest five 0.6.1..0.6.5), 8 targets, all channel "stable"** (`curl -s https://setup.ocx.sh/dist.json | python3 -I -c ...`). The Python SDK's bootstrap is built on it (`_dist.py:61`).
- Bootstrap targets (8) map one-to-one onto .NET RIDs: aarch64/x86_64-apple-darwin = osx-arm64/osx-x64; aarch64/x86_64-pc-windows-msvc = win-arm64/win-x64 (`.zip`); aarch64/x86_64-unknown-linux-gnu = linux-arm64/linux-x64; aarch64/x86_64-unknown-linux-musl = linux-musl-arm64/linux-musl-x64 (static). **No win-x86, no linux-arm (32-bit), no FreeBSD**: relevant to the netstandard2.0 / .NET Framework question, since a 32-bit Windows process cannot be served. Archives: `.tar.gz` except Windows `.zip`; `sha256.sum` per release (`installation.md:108-137`).
- Bootstrap alternative: `ocx --format json self setup <version> | jq .bootstrap.digest` (`installation.md:166`).

## 6. Windows specifics

- Binary is `ocx.exe`; the generated runtime looks for the exact file name only ("`ocx.exe` on Windows never matches a bare `ocx`") on **absolute** PATH entries only (`runtime.rs:486-510`); `OCX_BINARY_PIN` is checked first and an empty pin counts as unset there, while the Windows shim follows `IF DEFINED` semantics (present-but-empty IS defined) (`entry-points.md:84`, `environment.md:212`). Env names are matched case-insensitively (`eq_ignore_ascii_case`); the Python SDK matches on `key.upper()` for the same reason.
- Launchers: no scripts. Each entrypoint is a native `<name>.exe` shim + `<name>.shim` sidecar (one UTF-8 line: absolute package root), spawning `ocx launcher exec` through `CreateProcessW` to dodge the cmd.exe BatBadBut `%*` re-parse, with a Job Object so a force-killed launcher reaps the child tree, and child exit code passed through (32-bit) (`ocx_shim/src/main.rs:1-10`, `entry-points.md:72-84,146-152`). Package-root paths containing `'`, `"`, newline, CR are rejected at install (`entry-points.md:93`).
- Directory links on Windows are **NTFS junctions** (no admin/Developer Mode needed) (`in-depth/storage.md:267`); symlink targets inside archives must be relative and physically contained (`ocx_util/src/fs/symlink.rs:15-40`, `dunce::canonicalize`). `%VAR%` in OCX path settings is literal on every platform (`environment.md:1010`). Windows does not check directory ownership (`environment.md:1024`). `SSL_CERT_FILE/DIR` ignored on Windows and macOS (`environment.md:1211`).
- Signals: the generated Rust spawn has no Windows interrupt: "no interrupt to send on Windows, so the child is killed at once" (`spawn.rs:221-236`), and it kills only the direct child (`// ponytail:` `spawn.rs:182-183`), leaving grandchildren holding the pipes (bounded by a drain deadline `await_readers`). A .NET SDK can do better with `Process.Kill(entireProcessTree: true)`; ocx itself uses a Job Object only in the shim.
- Windows acceptance checks run via cross-compile + `cmd.exe` on this machine (owner CLAUDE.md), not CI-only.

## 7. The sdkgen question (git log answer)

- A generator existed and shipped on main: `git log --all --oneline -- crates/ocx_sdkgen | wc -l` = 50 commits across all branches (1 on origin/main: the squash `6daf9a164`); origin: `c94a11b7a` (2026-10-05, "OCX machine-interface contract and the ocx-sdkgen Rust SDK generator") re-landed as `6daf9a164` (2026-10-07). Working-tree `crates/ocx_sdkgen/` holds only `ocx_sdkgen.cdx.json` because `goat` predates the merge: `git ls-tree -r --name-only origin/main crates/ocx_sdkgen | wc -l` = 230 files (7122 lines of src+templates: `wc -l src/*.rs templates/rust/*`).
- What it emits: `ocx-sdkgen --lang rust --out <dir> [--contract <dir>]` writes an `ocx-sdk` crate: structs with omitted-when-unset `Option`s, open scalar enums and tagged unions with an `Unknown` arm, a union decoder that reads `type` first (known tag + bad payload = error, not unknown), one function per command (70 leaves), the exit registry with **fail-closed success predicates** (`SUCCESS_STATUSES`: AttestationStatus succeeded, CapabilityStatus passed, ListingStatus success, ScriptStatus passed, SlotStatus ok, SweptStatus completed; `rust.rs:34-41`), env manifest, version table, plus a fixed runtime (`templates/rust/{runtime,spawn,wire}.rs`, 510+254+289 lines). Deps: `serde`, `serde_json` only (ADR N2 zero-dependency rule).
- README of the crate is stale against its own code: it describes only "the published-document contract: subset + lint + reconcile" (`ocx_sdkgen/README.md`) and never mentions the Rust backend, `compat.rs` differ or `main.rs`. Code wins.
- Distribution: `.github/workflows/sdkgen-publish.yml` packages it as OCI package `ocx.sh/ocx/sdkgen`, keyless-signed; **not yet published**: `ocx --remote --json index list ocx.sh/ocx/sdkgen` -> `{"ocx.sh/ocx/sdkgen": []}`; no `ocx-sdk-rust` repo exists (`gh repo view ocx-sh/ocx-sdk-rust` -> not found; org repos: ocx, ocx-sdk-python, ocx-mirror(-sdk), ...).
- Decision record: `.claude/artifacts/adr_ocx_interface_contract.md` ("Every other language is still decided in its own SDK plan"; Go/no-go 2026-10-04: typify emitted 0 of 13 unions as tagged, so Option D, an owned IR + backend, ~1450 LOC). A C# backend would reuse the IR (`ir.rs`, 1152 lines) and runtime semantics; this is a design option for the C# SDK plan, not a planned item.

## 8. Contract points a C# SDK MUST honour

1. Resolve one absolute `ocx` binary once: explicit path, then `OCX_BINARY_PIN`, then PATH (absolute entries only; exact name `ocx` / `ocx.exe`). Pass `OCX_BINARY_PIN` to the child so nested launches use the same binary.
2. Never use a shell; pass an argv list. Prefer `--long=value` single tokens, `--` before operands that may start with `-` unless the grammar marks `allow_hyphen_values`. Secrets only through stdin (`stdin_secret` args), never argv; redact `OCX_AUTH_*` and the other 9 secret vars from logs and exception text.
3. Global options go BEFORE the subcommand; every call sends `--format json` and `--color never`; do not send `--quiet`. Control logs with `--log-level`, not `OCX_LOG_LEVEL` (ignored by the released 0.6.5).
4. Scrub the child environment: drop ambient `OCX_*`/`__OCX_*` (at minimum PROJECT, GLOBAL, QUIET, NO_VERIFY, NO_HOOK, NO_COMPLETIONS), re-add only what the caller asked for; decide on `CLICOLOR_FORCE`/`NO_COLOR`.
5. Read exit code first, then stdout. Exit 0 with a report whose `status` is not a known success value is a failure (fail closed). `report_then_fail` commands (17 modes) carry a report AND a non-zero code; every other non-zero exit carries the error document (main) or nothing (0.6.5).
6. Model `ExitCode` as an open enum over the 13 values; map unknown numbers to a generic failure; version the table (82 changed meaning between 0.6.5 and main). Branch on `exit_code`, then `error.kind`, then `error.detail`; never on `error.message`.
7. Retry only on 75. Never on 69, 81, 82.
8. Passthrough commands (`exec`, `run`, `package exec`, `package test`, `launcher *`) forward the child's exit code and raw stdout; to separate ocx failure from child failure run `ocx env --json`/`package env` and spawn the tool yourself, or accept the ambiguity.
9. JSON binding must be forward-compatible: ignore unknown keys; open enums with an Unknown arm; tagged unions dispatch on `type` and skip unknown tags; absent = unset, `null` only inside publisher metadata (opaque). (System.Text.Json: `[JsonExtensionData]`-free ignore-unknown default is fine; closed C# enums are NOT.)
10. Handshake once per binary with `ocx --format json version`; no `contract` key = unsupported-binary error; refuse commands whose version differs from the generated one before spawning. Needs an ocx release newer than 0.6.5; there is none yet.
11. Bound stdout/stderr size, drain both pipes concurrently, honour cancellation (interrupt then kill after a grace; on Windows kill immediately; kill the process tree), and treat pipes held open by grandchildren as a timeout.
12. Do not assume one `$HOME` convention: data root is `~/.ocx` or `$OCX_HOME` on all OSes; config tiers differ per OS; hermetic runs set `OCX_NO_CONFIG=1` and an isolated `OCX_HOME`.
13. Ship/locate per-RID binaries for the 8 targets (no win-x86); verify the dist `sha256` before running a downloaded `ocx`.

## 9. Smells (for the rules to warn about)

1. Contract documented ahead of any release: the docs on `ocx.sh` for main describe behaviour v0.6.5 does not have (usage-error document, `contract`, `schema_version`, `OCX_LOG_LEVEL`).
2. `MINIMUM_OCX = "0.6.4"` contradicts the release history; a baseline is not cut; schema URL set is in flux (v1/v2 both live, #604 retires v2).
3. Exit number reuse (82) across releases despite the "never reused" policy, justified as "before any contract baseline exists".
4. `error.kind` and exit code are different partitions (81 -> permission_denied; 505 slugs, 58 of them fallback `Failure`/internal "unclassified cause" rows).
5. `--format` not `global = true`; `ocx version --format json` is a usage error.
6. `ocx exec` code collision with UsageError and DataError (child 64/65, missing command 65).
7. `index list` of an unknown package exits 0.
8. Released error `message` repeats its cause ("X: X") in 0.6.5 (`ocx --json --frozen --offline pull`).
9. Generated SDK does not send `--color never` and strips only `OCX_*`; `CLICOLOR_FORCE` leaks ANSI into captured stderr.
10. Equality-only version check: every contract bump breaks every generated SDK.
11. `cli.json` summaries carry a leading space (`" Absolute path to the running..."`), a codegen doc-comment hazard.
12. Crate README for `ocx_sdkgen` does not describe the generator.

## Method (commands, all re-runnable)

Environment: ocx 0.6.5 (`which ocx` -> `~/.ocx/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`), `OCX_HOME` pointed at a scratch dir for every probe, WSL2 Linux x86_64. Source reads from `git archive origin/main crates website/src test .github CLAUDE.md Cargo.toml | tar -x -C <scratch>/ocx` (so line numbers are those of `246863abc1d4`).

- State of branches: `git -C ~/dev/ocx rev-parse --short=12 origin/main fix/580-followups v0.6.5`; `git merge-base --is-ancestor 6daf9a164 origin/main && echo in-main`; `git tag --contains 6daf9a164` (empty); `git rev-list --count v0.6.5..origin/main` (3); `gh pr view 580 --json state` (MERGED), `gh pr view 604 --json state,mergeable` (OPEN, MERGEABLE); `git log --oneline origin/main..fix/580-followups | wc -l` (11).
- Exit table: `for r in v0.6.4 v0.6.5 origin/main fix/580-followups; do git show "${r}:crates/ocx_exit/src/exit_code.rs" | grep -E '^\s+[A-Z][A-Za-z]+ = [0-9]+'; done` (zsh note: write `${r}:` with braces or zsh eats `:c`). Production attribute counts: python `re.finditer(r'#\[exit\(\s*([A-Za-z_:]+)', text)` over `crates/**/*.rs` excluding `ocx_exit`, `ocx_exit_derive`, `ocx_test_support` (443). Slugs: `cut -f1,2 crates/ocx_cli/src/exit/detail_rows.txt` unique count 505 of 532 rows. Acceptance: python regex above over `test/tests/*.py`.
- cli.json statistics: `python3 -I` loading `crates/ocx_schema/tests/golden/cli.json`; recursive walk of `root['commands']` (81 nodes, 70 leaves, 11 groups, 4 hidden); `Counter(o['type'] for n in leaves for o in n['output'])`; `len(d['env'])` 124 split by `visibility` (public 56, foreign 66, plumbing 2); `sum(a['global'] for n in nodes for a in n['args'])` = 0; `retired` list = 2. reports.json: `len(d['reports'])` 56, `$defs` 284, wrapper `schema_version.const` Counter {1: 50, 2: 6}. errors.json `$defs.ExitCode['x-ocx-enum']` 13, `ErrorDetail` 505.
- Measured behaviour (v0.6.5): `ocx --json --bogus`; `ocx version --format json`; `ocx --format json version`; `ocx --format=json version`; `ocx --json --offline index list cmake`; `ocx init && ocx --offline lock && ocx --offline exec -- sh -c 'exit 7'` (7), `kill -TERM $$` (143), `exit 300` (44), `exit 64` (64), `exec -- nonexistent_cmd_zz` (65); `OCX_LOG_LEVEL=trace|OCX_LOG=trace|RUST_LOG=trace ocx --json --offline index list zz 2>&1 >/dev/null | wc -l` (run under bash, not zsh: zsh MULTIOS tees `>/dev/null` into the pipe) -> 1, 6, 6; `CLICOLOR_FORCE=1 ... | cat -v`. Timing: `time (for i in $(seq 20); do ocx --json version >/dev/null; done)` 0.094 s.
- Live endpoints: `curl -s https://setup.ocx.sh/dist.json` (280 releases, 35 versions, 8 targets); `curl -sSI https://ocx.sh/schemas/{reports/v1,reports/v2,errors/v1,errors/v2,cli/v1}.json` (200,200,404,200,404); `ocx --remote --json index list ocx.sh/ocx/sdkgen` (empty).
- Docs vs code: `website/src/docs/reference/{machine-interface,command-line,configuration,environment}.md`, `website/src/docs/in-depth/entry-points.md`, `website/src/docs/installation.md` against the sources cited inline.

## Not verified

- No main-built `ocx` binary was available (`ls ~/dev/ocx*/target/*/ocx` empty); everything labelled "main" is source/doc/golden reading, everything labelled "measured" ran on 0.6.5. In particular the usage-error document, `contract` handshake and `index list` exit on main are unexecuted.
- Docs coverage of every command in `command-line.md` against the 67 visible leaves was not completed (heading format differs); the repo has a conformance test for it.
- macOS and Windows runs were not executed here; Windows facts are from source and docs.
