---
title: "Interface-leak check: one token set across clap, schemars, rmcp and commander"
topic: interface-check
agent: research-lang subagent (code-docs, wave 3, surfaces group)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 23
scope: >
  Commission on SRF-01 and SRF-03 (code-docs-surfaces.md): capture every
  fleet-used generator's rendered output fresh (own build, own scratch copy),
  apply the SRF-01 token set, measure true leaks and false positives, tune
  the set to <=2% false positives, design and prove one output-side test per
  language on a planted leak, and gather evidence on whether ocx's schema
  `description` text is part of its versioned contract. Rebuilds ocx and
  grimoire from source in scratch (git worktree + manual submodule checkout,
  CARGO_TARGET_DIR under scratch); builds ocx-catalog and grimoire-indexer
  from source in scratch (npm install + tsc); reads ocx-sdk-python's already
  git-clean mkdocstrings build in place; reads grimoire-vscode's package.json
  at HEAD via `git show` (working tree carries unrelated local edits).
---

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Generator inventory: what each repo actually renders](#1-generator-inventory-what-each-repo-actually-renders)
  2. [Rust clap: ocx and grimoire `--help`, rebuilt and walked fresh](#2-rust-clap-ocx-and-grimoire---help-rebuilt-and-walked-fresh)
  3. [Rust schemars: ocx's golden schemas and grimoire's `grim schema` output](#3-rust-schemars-ocxs-golden-schemas-and-grimoires-grim-schema-output)
  4. [Rust rmcp/MCP: grimoire has five tools, clean; ocx has none](#4-rust-rmcpmcp-grimoire-has-five-tools-clean-ocx-has-none)
  5. [Python: ocx-sdk-python's mkdocstrings-rendered API reference](#5-python-ocx-sdk-pythons-mkdocstrings-rendered-api-reference)
  6. [TypeScript commander: a live, uncaught leak in ocx-catalog](#6-typescript-commander-a-live-uncaught-leak-in-ocx-catalog)
  7. [Token-set tuning: 0% false positives on 14 families, 25% on the excluded one, one real gap found and closed](#7-token-set-tuning-0-false-positives-on-14-families-25-on-the-excluded-one-one-real-gap-found-and-closed)
  8. [Per-generator output-side test, proved red/green on a planted leak, one per language](#8-per-generator-output-side-test-proved-redgreen-on-a-planted-leak-one-per-language)
  9. [Is schema `description` text ocx's versioned contract? Evidence from the repo itself](#9-is-schema-description-text-ocxs-versioned-contract-evidence-from-the-repo-itself)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Every generator the commission named was captured fresh in this dive: ocx's clap tree (73 `--help` screens) and golden JSON schemas (rebuilt binary, own `cargo build --release`), grimoire's clap tree (36 screens) and all four `grim schema --kind` outputs (config/publish/lock/mcp), grimoire's five `#[tool]` MCP descriptions plus their `JsonSchema`-derived argument structs, ocx-sdk-python's already-built mkdocstrings HTML (git-clean at HEAD, no rebuild needed), and ocx-catalog / grimoire-indexer's commander CLIs (rebuilt with `npm install && tsc`, run live).
- **ocx has no rmcp/MCP surface at all**: `grep -rn 'rmcp' ocx/Cargo.toml ocx/crates/*/Cargo.toml` returns nothing. The commission's "any rmcp/MCP tool list in ocx" is an empty set, measured, not assumed.
- **grimoire's MCP surface is clean today**: 0 banned-token hits across all 5 `#[tool(description = "...")]` strings and every `JsonSchema`-derived field doc in `tool_args.rs`. The mechanism (`#[tool]` copies its `description` string, or falls back to the function's own doc comment, verbatim — confirmed from the rmcp-macros docs) means this is a live risk, not a solved one: nothing stops the next tool from leaking.
- **A real, previously-uncaught leak was found live, not inherited**: `ocx-catalog:src/cli/main.ts:37` — `.description("render or check the catalog CI pipeline (C-007)")` — renders verbatim in both `ocx-catalog --help` and `ocx-catalog ci --help`, captured from a binary this dive built and ran. `ocx-catalog/test/cli.test.ts` exists and exercises the CLI but asserts nothing about description text — SRF-03 has zero TypeScript coverage in this repo today, confirmed by reading the test file.
- **grimoire-indexer's commander CLI (9 subcommands, all captured) and grimoire-vscode's `package.json` (6 `description` fields at HEAD `b4f7ca3`) are clean** — 0 hits.
- **Token-set false-positive rate, measured fresh: 0% (0 of 331 hits)** across every surface above, using SRF-01's 14 ID/filename/link families (excluding `short2char`) plus one addition this dive proposes (below). Every hit was individually read in context and confirmed a genuine internal reference — real plan/decision IDs (`C-050`, `A-21`, `RUL-51`, `DX-40.3`), real source filenames (`config_setup.rs`, `pull.rs`), real intra-doc links and `Self::`/`crate::` paths, and one real ADR-dated amendment.
- **Re-testing `short2char` (excluded from SRF-01's MUST set) on this same fresh corpus: 4 false positives in 16 hits, 25%** — `V1`/`V3` are schema-version enum tags (`LockVersion::V1`, project-lock's version marker), `C0` is the Unicode C0-control-code term, not a plan ID. This is fresh, concrete confirmation of the existing exclusion, not a repeat of the prior number.
- **A genuine token-set gap, found and closed**: ocx's own existing clap-only leak test (`crates/ocx_cli/src/app.rs:757-762`, function `has_clause_label`) already detects a `C-S<digit>` design-clause label (e.g. `C-S1-1`) as a distinct marker family — but this family is absent from SRF-01's list and from every other surface's check. It is real: `C-S1-1` leaks in *both* `ocx`'s golden `reports.json:3578` *and* `ocx-sdk-python`'s published API reference (`_results.py:320,331`), independently, in unrelated fields. Recommend adding `\bC-S[0-9]+(-[0-9]+)?\b` as SRF-01's 15th family — 2 hits, 0 false, on this corpus.
- **DOC-11's existing clap-only test does not check what SRF-01 checks.** Its `marker()` function (`app.rs:779-800`) tests for `§`, `handshake`, `adr_`, `amended`, the clause label, ISO dates, and 8+ digit runs — it has no rule for a bare `.rs` filename, `Self::`, `crate::`, or an intra-doc link. That gap is why this dive's fresh `--help` capture found 2 new hits on ocx (`package-test--help.txt`, `package-exec--help.txt`) and 3 on grimoire (`login`, `logout`, `fetch`) that the shipped test does not catch — all genuine: one is the exact guard SRF-02 already names (`exec.rs`'s `.split_first().expect(...)` soundness argument, rendered into `--help` via `[`Self::execute`]`).
- **`schema_outputs.rs` (25K, 15 test functions) has zero content/leak assertion** — confirmed by reading every `fn` name in the file. The clap-side leak test and the schema-side shape tests have never been the same check; this dive's evidence is the first fresh confirmation since census.md.
- **One output-side test proved red/green per language, on a planted leak, this dive's own fixtures**: Rust (schemars `schema_for!`, `cargo run --features leak`), Python (`inspect.getdoc()` over a module's public API, mirroring mkdocstrings' own verbatim extraction), TypeScript (commander's `.description()` walked in-process). All three share one scanner script (`srf01_scan.py`) — the walk differs per generator, the token check does not.
- **Schema `description` text is a mechanically-gated wire surface today, but not part of ocx's *compat*-gated contract.** `golden_schemas.rs`'s own doc comment: "the seven published schemas are pinned byte-for-byte to committed goldens... regenerate a golden only in a commit whose subject names the schema change" — any description edit reds this test and needs a named commit. But the active design discussion `ocx/.agents/discussions/ocx-interface-contract.md` (State: active, 2026-09-25) scopes its compat-breaking gate to "report JSON + CLI grammar + exit codes + `error.detail` slugs + stdout error envelope" in purely structural terms (fields, types, tags) — never description prose. `CLAUDE.md`'s pre-1.0 policy: "even interfaces break... a break is announced in the changelog and nowhere else." Net: a description-text cleanup is a normal, commit-subject-named (hence changelog-visible) content edit, not a `!`-flagged break needing a ledger entry and `$id` bump. This is evidence for the owner's decision, not the decision itself.
- **SRF-03 should stay MUST**: every generator this dive touched has a working, cheap, portable test shape, and the one repo with none (ocx-catalog) already shipped a real leak nobody caught. The fix is additive per generator, not a new mechanism.

## Findings

### 1. Generator inventory: what each repo actually renders

| Repo | Generator(s) in actual use | Evidence |
|---|---|---|
| ocx | clap (`Parser`/`Args`/`Subcommand`), schemars (`JsonSchema`) | `crates/ocx_cli/Cargo.toml:112` (`name = "ocx"`, bin `ocx`); `Cargo.toml:294` (`schemars = "1.2.1"`); no rmcp anywhere: `grep -rn 'rmcp' ocx/Cargo.toml ocx/crates/*/Cargo.toml` → 0 hits (run 2026-09-27, ocx HEAD `2691d3c16`) |
| grimoire | clap, schemars, rmcp (MCP) | `grimoire/Cargo.toml:15,30,69`; `src/mcp/server.rs` (5 `#[tool]` blocks); `src/command/schema.rs` (`grim schema --kind {config,publish,lock,mcp}`) |
| ocx-sdk-python | mkdocstrings (Python docstrings → HTML); no pydantic | `mkdocs.yml` (`theme: material`, `site/reference/api/`); `grep -rln "^import pydantic\|from pydantic" src` → 0 hits |
| ocx-catalog | commander (`.description(`) | `src/cli/main.ts:19-38`, 3 subcommands |
| grimoire-indexer | commander | `src/cli/main.ts`, 9 subcommands |
| grimoire-vscode | `package.json` `description` fields (VS Code marketplace/contribution metadata, no commander) | `package.json` at HEAD `b4f7ca3` |
| ocx-mirror | schemars only, via `cfg_attr` (not measured for content here — cited from the classifier-gap angle in [§7](#7-token-set-tuning-0-false-positives-on-14-families-25-on-the-excluded-one-one-real-gap-found-and-closed)) | `crates/ocx_mirror_spec/src/dist.rs:62` |

Fleet HEADs actually built/read in this dive (drift from surfaces.md's pins is noted where it happened): ocx `2691d3c16` (unchanged), grimoire `96647fc4` (moved from `7dc3d6b8` mid-session — another agent landed commits on `dev/grimoire` while this dive ran; rebuilt against the new tip), ocx-catalog `a16be21a`, grimoire-indexer `fd624615`, ocx-sdk-python `9713f0a9` (git-clean, matches its committed `site/` build), grimoire-vscode `b4f7ca3` (working tree has unrelated local edits; read via `git show HEAD:package.json`), ocx-mirror `7b395d57`.

Build method, per the commission's scratch rule: `git worktree add --detach` into `/home/mherwig/.cache/research-lang/code-docs-scratch/interface-check/{ocx,grimoire}` (both repos pin git submodules `external/docker_credential`, `external/rust-oci-client`, which `git archive` cannot populate — `git submodule update --init --depth 1` after the worktree add, or a direct pinned-SHA clone when the worktree registry hiccuped mid-session, see below). `CARGO_TARGET_DIR` pointed at `.../target-ocx` and `.../target-grimoire` under the same scratch root. ocx-catalog/grimoire-indexer used `git archive HEAD | tar -x` (no submodules) plus `npm install && npx tsc`. One incident: the grimoire worktree directory disappeared mid-build (another concurrent session on this shared machine touching `dev/grimoire`'s worktree registry, or a prune race — `git -C dev/grimoire worktree list` no longer showed it); recovered by re-archiving and cloning the two pinned submodule SHAs directly rather than retrying the worktree, then rebuilding — the rebuilt binary's behavior is identical either way since both paths check out the same commit content.

### 2. Rust clap: ocx and grimoire `--help`, rebuilt and walked fresh

Built both binaries from scratch (`cargo build --release`, ~4m20s ocx / ~56s grimoire once submodules were in place — grimoire's fast rebuild reused ocx's warm dependency cache). Walked every subcommand recursively with a small BFS script (`walk_help.py`, parses each screen's `Commands:` section for the next level, depth-capped at 4):

```
python3 walk_help.py target-ocx/release/ocx captures/ocx-help       # → 73 screens captured to captures/ocx-help
python3 walk_help.py target-grimoire/release/grim captures/grim-help # → 36 screens captured to captures/grim-help
```

Applying the SRF-01 family list (the 14-family `rg` alternation from `code-docs-surfaces.md`'s SRF-01 verification block, run over the two directories):

```
rg -n -e '\bC-[0-9]{1,4}\b' -e '\bRUL-[0-9]{1,3}\b' -e '\bA-[0-9]{1,3}\b' -e '\bS-[0-9]{1,3}\b' \
   -e '\bWP-[0-9]{1,3}\b' -e '\bDX-[0-9]{1,3}\b' -e '\bDEC-[A-Za-z0-9]{1,6}\b' -e '\badr_[A-Za-z0-9_.-]+' \
   -e '\bplan_[A-Za-z0-9_.-]+' -e '\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b' -e '\b[a-z_][a-z0-9_]*\.rs[^/a-z0-9]' \
   -e '\b[a-z_][a-z0-9_]*\.rs$' -e '\[`[A-Za-z_][A-Za-z0-9_:]*`\]' -e '\bSelf::' -e '\bcrate::' captures/ocx-help
# → 2 lines
```
```
... captures/grim-help
# → 3 lines
```

Both non-zero, both real:

- `captures/ocx-help/package-test--help.txt:14` — "`last = true` (mirroring `toolchain_exec.rs`'s `argv`) makes clap parse everything before the mandatory `--`..." — a real source filename (`toolchain_exec.rs`), matched by the `.rs` family.
- `captures/ocx-help/package-exec--help.txt:14` — "`required = true`... clap rejects the invocation before [`Self::execute`] runs when the slice would be empty, so the `.split_first().expect(...)` below is sound..." — this is the exact guard `code-docs-surfaces.md` SRF-02 cites from `ocx:crates/ocx_cli/src/command/exec.rs:90-95`, confirmed live in this dive's own capture, matched by the intra-doc-link and `Self::` families.
- `captures/grim-help/login--help.txt:9` and `logout--help.txt:9` — "Named `host` rather than `registry`... `[`crate::context::Context::registry_flags`]`" — a real `crate::` path plus intra-doc link.
- `captures/grim-help/fetch--help.txt:20` — "... round-trips through [`crate::install::client_target::ClientTarget`]..." — same pattern.

None of these four are caught by ocx's own shipped clap leak test. Reading that test (`crates/ocx_cli/src/app.rs:731-812`, function `cli_help_text_has_no_internal_references`) shows its `marker()` function (lines 779-800) checks only: `§`, `handshake`, `adr_`, `amended`, a `C-S<digit>` clause label (`has_clause_label`, lines 757-762), ISO dates, and 8+-digit runs. It has no rule for a bare source filename, `Self::`, `crate::`, or an intra-doc link — so this dive's fresh capture surfaces four genuine leaks the shipped test structurally cannot see, on top of the ID-family leaks census.md already established live only in schemars output.

### 3. Rust schemars: ocx's golden schemas and grimoire's `grim schema` output

ocx's seven golden schemas (`crates/ocx_schema/tests/golden/*.json`, copied read-only into scratch, 8,399 lines total) were scanned with the identical SRF-01 command:

```
rg -n -e '\bC-[0-9]{1,4}\b' ... captures/ocx-golden | wc -l
# → 256
```

This reproduces SRF-01's own stated number exactly (256), confirming the check is stable across independent runs on the same commit. Per-family breakdown (own script, `famcount.sh`, counts occurrences not lines):

| Family | Occurrences | Sample |
|---|---:|---|
| `C-[0-9]{1,4}` | 97 | `C-050` ×7, `C-019` ×7, `C-056` ×6 |
| `A-[0-9]{1,3}` | 48 | `A-21` ×3, `A-13` ×2, `A-04` ×2 |
| `RUL-[0-9]{1,3}` | 6 | `RUL-51` (twice, "Always present, never `null` (RUL-51)") |
| `S-[0-9]{1,3}` | 5 | `S-004`, `S-009` |
| `DX-[0-9]{1,3}` | 1 | `DX-40.3` |
| `adr_...` | 16 | `adr_index_indirection.md`, `adr_managed_config_tier.md` |
| `plan_...` | 6 | |
| ISO date | 1 | "the 2026-07-31 amendment in `adr_managed_config_tier.md`" |
| `.rs` filename | 5 | `config_setup.rs`, `config_update.rs`, `pull.rs`, `update_check.rs` (×2) |
| Intra-doc link `` [`X`] `` | 320 | |
| `Self::` | 62 | |
| `crate::` | 15 | |
| `WP-`, `DEC-` | 0 each | |

grimoire has no committed golden schemas (they're gitignored: `grimoire:.gitignore:102` per surfaces.md), so this dive generated them fresh from the rebuilt binary — the exact SRF-03 recommendation in practice:

```
target-grimoire/release/grim schema --kind config  > captures/grim-schema/config.schema.json   # 281 lines
target-grimoire/release/grim schema --kind publish > captures/grim-schema/publish.schema.json  # 445 lines
target-grimoire/release/grim schema --kind lock    > captures/grim-schema/lock.schema.json     # 329 lines
target-grimoire/release/grim schema --kind mcp     > captures/grim-schema/mcp.schema.json      # 247 lines
```

Scanned: 0 ID-family hits (`C-`/`RUL-`/`A-`/`S-`/`WP-`/`DX-`/`DEC-`/`adr_`/`plan_`/ISO-date all zero), but 16 intra-doc-link hits and 4 `Self::` hits across all four files (8 lines, some lines carry more than one link) — reproducing surfaces.md's "16 links across 4 built schemas" on a freshly generated build rather than a previously-captured one. Every hit read in context is a genuine `` [`Self::x`] ``/`` [`Type::variant`] `` rustdoc cross-reference, e.g. `config.schema.json:66`: "Exactly one of [`Self::oci`] / [`Self::index`] must be set", `mcp.schema.json:209`: "Independent of [`Self::deprecated`]".

### 4. Rust rmcp/MCP: grimoire has five tools, clean; ocx has none

ocx has zero rmcp dependency anywhere in its workspace (checked above) — the commission's "any rmcp/MCP tool list in ocx" is confirmed empty, not merely undiscovered.

grimoire's five tools are declared with explicit `description = "..."` string literals in `src/mcp/server.rs:60-149` (`grim_search`, `grim_status`, `grim_fetch`, `grim_describe`, `grim_render`). Read in full, all five: 0 banned-token hits. Their argument structs (`src/mcp/tool_args.rs`, `SearchToolArgs`/`FetchToolArgs`/`DescribeToolArgs`/`RenderToolArgs`/`StatusToolArgs`/`ScopeToolArgs`) are `#[derive(Deserialize, schemars::JsonSchema)]`, so every field's `///` doc comment is *also* rendered — into the tool's `inputSchema` — read in full: 0 hits there too. The one `//` (non-doc) comment in the file correctly sits outside the render boundary: `tool_args.rs:29-33` explains an SSRF/CWE-918 design decision in a plain `//` comment on a field with no `///`, exactly the SRF-01 boundary (`//` never renders; `///` on a `JsonSchema`-derived field does).

Mechanism, confirmed externally rather than assumed: the `#[tool]` macro (rmcp-macros) "accepts either a string literal or an expression that evaluates to a `&'static str`" for `description`, used verbatim, and "the document of this function will be used if not provided" — i.e. it falls back to the plain Rust doc comment when no explicit `description` is given ([docs.rs/rmcp-macros](https://docs.rs/rmcp-macros/latest/rmcp_macros/attr.tool.html), fetched 2026-09-27). That fallback path is a second, currently-unused way for a rustdoc-audience `///` to become externally-rendered MCP text the moment someone drops the explicit `description` attribute — a concrete failure mode with the same shape as [§2](#2-rust-clap-ocx-and-grimoire---help-rebuilt-and-walked-fresh)'s clap findings, worth naming in SRF-03's rule text even though it has zero current occurrences.

### 5. Python: ocx-sdk-python's mkdocstrings-rendered API reference

`ocx-sdk-python`'s `site/` build is gitignored (`.gitignore:35`) but present on disk, built 2026-09-13, and the working tree is git-clean at HEAD `9713f0a9` (`git status --porcelain` empty aside from `?? site`) — so it accurately reflects HEAD, no rebuild needed. Extracted the rendered API-reference page to plain text (`site/reference/api/index.html`, tags stripped, 46,351 lines) and ran the common (non-Rust) SRF-01 families:

```
rg -n -e '\bC-[0-9]{1,4}\b' -e '\bRUL-[0-9]{1,3}\b' -e '\bA-[0-9]{1,3}\b' -e '\bS-[0-9]{1,3}\b' \
   -e '\bWP-[0-9]{1,3}\b' -e '\bDX-[0-9]{1,3}\b' -e '\bDEC-[A-Za-z0-9]{1,6}\b' -e '\badr_[A-Za-z0-9_.-]+' \
   -e '\bplan_[A-Za-z0-9_.-]+' -e '\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b' captures/ocx-sdk-api-plain.txt
# → 54 lines: 15 distinct C- tokens, plus 2 occurrences of S-009 (paired with the short2char token D10, correctly excluded — see §7)
```

Cross-referenced every distinct `C-` token against the actual source file, not assumed:

```
grep -o '\bC-[0-9]\{1,4\}\b' src/ocx_sdk/_results.py | sort -u
# → C-003 C-005 C-008 C-009 C-011 C-012 C-013 C-014 C-015 C-017 C-018 C-019 C-021 C-060 C-061
```

All 15 rendered tokens appear verbatim in the source — 0 false positives, and the leak is real: `src/ocx_sdk/_results.py:1570`'s `SignatureReport` class is exported at `src/ocx_sdk/__init__.py:288` and rendered by mkdocstrings' `::: ocx_sdk` directive into `docs/reference/api.md` → `site/reference/api/index.html`. mkdocstrings' own docs describe its *output* formatting options (summary-line handling via `ignore_init_summary`, table vs. list docstring sections) but not a content-filtering step — and this dive's direct empirical cross-reference (source token → rendered token, exact match) is stronger evidence than the docs page: mkdocstrings copies the docstring through unfiltered, exactly like clap and schemars.

### 6. TypeScript commander: a live, uncaught leak in ocx-catalog

Built both TypeScript CLIs from scratch (`npm install`, `npx tsc -p tsconfig.json`, ~20s each) and ran every subcommand's `--help` live:

```
cd ocx-catalog && node dist/cli/index.js ci --help
# Usage: ocx-catalog ci [options]
#
# render or check the catalog CI pipeline (C-007)
#
# Options:
#   --check     check-only, no writes
#   -h, --help  display help for command
```

Source: `ocx-catalog:src/cli/main.ts:37` — `.description("render or check the catalog CI pipeline (C-007)")`. This is a genuine, previously-unflagged leak: `grep -n 'description\|banned\|leak\|internal.reference' ocx-catalog/test/cli.test.ts` → the one hit is an unrelated comment about exit-code test isolation ("tests never leak exit-code state"), not a description assertion. `ocx-catalog/test/cli.test.ts` exercises the CLI (build/dev/ci error paths) but asserts nothing about rendered help text — SRF-03 has zero coverage here today.

grimoire-indexer's 9 subcommands, captured the same way, and grimoire-vscode's `package.json` (6 `description` fields, read at HEAD via `git show HEAD:package.json` since the working tree carries unrelated local edits — `package.json | 119 lines changed` in the diff, none of it in the walkthrough section this dive's first pass had accidentally picked up from the dirty tree): both 0 hits.

### 7. Token-set tuning: 0% false positives on 14 families, 25% on the excluded one, one real gap found and closed

Every hit from §2, §3, §5 and §6 — 331 total across the two Rust CLIs' `--help`, ocx's golden schemas, grimoire's four generated schemas, ocx-sdk-python's rendered API page, and ocx-catalog's `--help` — was read in its full sentence context (not just the matched token) and classified. Result: **0 false positives**. Every hit was a real plan/decision ID, a real source filename, a real intra-doc link or code path, or a real ADR-dated amendment. This is well inside the commission's 2% ceiling with no tuning of the 14-family set itself required.

Testing whether the *already-excluded* `short2char` family (`\b[A-Z][0-9]{1,2}[a-z]?\b`, dropped from SRF-01's MUST list per `code-docs-surfaces.md` "short2char stays out of the mechanical check") would still misfire if included, on this same fresh corpus:

```
rg -o -e '\b[A-Z][0-9]{1,2}[a-z]?\b' captures/ocx-golden captures/ocx-help captures/grim-help captures/grim-schema \
  | sed 's/^[^:]*://' | sort | uniq -c | sort -rn
```

16 occurrences, 14 distinct tokens: `V1`×2, `C7`×2, `V3`, `S1`, `R1`, `F5b`, `F5a`, `D8`, `D7`, `D3`, `D2`, `D16`, `C2`, `C0`. Read each in context:

- **True** (11 of 14 distinct, 12 of 16 occurrences): `C7` (×2, `project.json:181` and `config.json:201`, "enforcement beats opt-out, C7"), `F5a`/`F5b` (`config.json:29,137`, both paired with `` `adr_index_indirection.md` ``), `D2` (`project-lock.json`, "canonical grammar string ([`Platform`] `Display` — D2)"), `D3` (`project-lock.json`, "the canonical-platform-key invariants (D3)"), `D7` (`reports.json:4225`, "plan D7"), `D8` (`reports.json`, "spec D8"), `D16` (`reports.json`, "`adr_package_integrations.md` D16"), `R1` (`project-lock.json`, "the global scope's constants (R1)"), `C2` ("detected over the interface projection (Codex C2)"), and `S1` (a fragment of the larger true ID `C-S1-1`, see below — not a clean standalone hit, but not a false one either).
- **False** (2 of 14 distinct, 4 of 16 occurrences): `V1` and `V3` are schema-version enum tags, not plan IDs — `grim-schema/lock.schema.json:106`: "On-disk schema version (currently always [`LockVersion::V1`])"; `ocx-golden/project-lock.json:30`: "On-disk schema version. `V3` is the only version this build reads or writes." `C0` is the Unicode C0-control-codes term — `ocx-golden/reports.json`: "`serde_json` escapes C0 controls" — a standard technical term, not an ID.

**25% false-positive rate (4/16)** on this measurement — far over the 2% ceiling, confirming with fresh numbers (not a repeat of a prior claim) that `short2char` stays excluded from the MUST family list.

**A genuine gap, found while classifying the `S1` fragment above.** `S1` is a substring match inside the real token `C-S1-1` (`ocx-golden/reports.json:3578`: "Signing mechanism used (C-S1-1 contract field)"), which none of SRF-01's 14 families catch as a unit — `\bC-[0-9]{1,4}\b` requires digits immediately after `C-`, and `short2char` (even if it weren't excluded) would only ever catch the `S1` fragment, not the whole label. But ocx's *own* shipped clap-help test already has a purpose-built detector for exactly this shape: `has_clause_label` (`crates/ocx_cli/src/app.rs:757-762`) — "Detect a `C-S<digit>` design-clause label (e.g. `C-S1-3`, `C-S1-4`)... These clause tags are signing-slice ADR provenance and must never surface in `--help`." That detector is clap-only and was never generalized into a portable regex family or ported to any other surface. Checking whether the token actually leaks elsewhere:

```
rg -o -e '\bC-S[0-9]+(-[0-9]+)?\b' captures/ocx-golden captures/ocx-help captures/grim-help captures/grim-schema captures/ocx-sdk-api-plain.txt
# → ocx-golden/reports.json:C-S1-1
# → ocx-sdk-api-plain.txt:C-S1-1
```

It leaks in *two independent* interface surfaces — ocx's own golden schema (`reports.json:3578`, a signing-mechanism field) and ocx-sdk-python's published API reference (confirmed by source: `src/ocx_sdk/_results.py:320,331`, an unrelated error-envelope class) — the same internal ID citation habit crossing into two generators and two repos. 2 occurrences, 0 false, on this corpus.

**Final token set, 15 families, measured 0 false positives in 331+2 = 333 hits (0%)**:

```
\bC-[0-9]{1,4}\b          \bRUL-[0-9]{1,3}\b        \bA-[0-9]{1,3}\b
\bS-[0-9]{1,3}\b          \bWP-[0-9]{1,3}\b         \bDX-[0-9]{1,3}\b
\bDEC-[A-Za-z0-9]{1,6}\b  \bC-S[0-9]+(-[0-9]+)?\b    (new: 15th family)
\badr_[A-Za-z0-9_.-]+     \bplan_[A-Za-z0-9_.-]+
\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b
\b[a-z_][a-z0-9_]*\.rs\b  (Rust-only)
\[`[A-Za-z_][A-Za-z0-9_:]*`\]  (Rust-only)
\bSelf::                   (Rust-only)
\bcrate::                  (Rust-only)
```

`short2char` (`\b[A-Z][0-9]{1,2}[a-z]?\b`) stays excluded from the MUST set (25% FP, above). Non-Rust generators (Python, TypeScript) drop the four Rust-only families; the ten common families apply everywhere, portable as SRF-01 already states.

### 8. Per-generator output-side test, proved red/green on a planted leak, one per language

Built one minimal fixture per language, each toggling a planted leak, and ran the same scanner (`srf01_scan.py`, shared token list, `--lang rust|python|ts` selects the Rust-only families) against both states:

**Rust (schemars).** `fixtures/rust-fixture/`: a `#[derive(Serialize, JsonSchema)]` struct with a `cfg_attr`-toggled field doc (`#[cfg_attr(feature = "leak", doc = "...(C-999, adr_planted_fixture.md).")]` vs. the clean doc without the feature). `cargo run` (green) vs. `cargo run --features leak` (red):

```
$ python3 srf01_scan.py green.json
PASS: 0 banned-token hits
$ python3 srf01_scan.py red.json
--- red.json ---
8: "description": "The tier to activate (C-999, adr_planted_fixture.md).",
FAIL: 1 banned-token hit(s)
```

**Python (mkdocstrings-equivalent).** `fixtures/python-fixture/`: two modules, `fixture_green.py`/`fixture_red.py`, each with a `SignatureReport` class whose docstring only differs by the planted line. `extract_docs.py` mirrors mkdocstrings-python's own extraction — `inspect.getdoc()` over every public name in the module, no transform beyond what mkdocstrings itself does:

```
$ python3 extract_docs.py fixture_green | python3 srf01_scan.py --lang python /dev/stdin
PASS: 0 banned-token hits
$ python3 extract_docs.py fixture_red | python3 srf01_scan.py --lang python /dev/stdin
4: (C-999, adr_planted_fixture.md) internal note that must never render.
FAIL: 1 banned-token hit(s)
```

**TypeScript (commander).** `fixtures/ts-fixture/fixture.mjs`, run from inside `ocx-catalog`'s own `node_modules` (so it resolves the real installed `commander`, no new dependency): a `program.command("ci").description(...)` toggled by an env var, walked via `program.commands[i].description()` — the exact API a test would call in-process, no subprocess needed:

```
$ node fixture.mjs | python3 srf01_scan.py --lang ts /dev/stdin
PASS: 0 banned-token hits
$ LEAK=1 node fixture.mjs | python3 srf01_scan.py --lang ts /dev/stdin
1: ci: render or check the catalog CI pipeline (C-999, adr_planted_fixture.md)
FAIL: 1 banned-token hit(s)
```

All three: red with the leak, green without, same scanner. The walk is generator-specific (schema JSON on disk / `inspect.getdoc()` in-process / `Command.description()` in-process); the token check is the one 15-family list from [§7](#7-token-set-tuning-0-false-positives-on-14-families-25-on-the-excluded-one-one-real-gap-found-and-closed) either way. For the MCP surface (no fleet fixture built — grimoire's own tools are already clean, §4), the identical shape applies: call `list_tools()` in-process (rmcp's own `ServerHandler` trait) or scan the `#[tool(description = ...)]`/`#[derive(..., JsonSchema)]` source spans the same way `comment_census.py`'s `RUST_IFACE_RE` already does for clap/schemars.

### 9. Is schema `description` text ocx's versioned contract? Evidence from the repo itself

Three primary sources, read directly, none of them my inference:

1. **`ocx:crates/ocx_schema/tests/golden_schemas.rs:4-20`** (module doc): "The seven published schemas are pinned byte-for-byte to committed goldens... Anything that changes the output — a field, a `$defs` key, `$defs` *order*... reds here... Regenerate a golden only in a commit whose subject **names the schema change**." This mechanically gates *any* description-text edit — cleaning a leak *will* red this test and *does* require a commit whose subject names it. It is not free, but the requirement is a commit subject, not a breaking-change process.

2. **`ocx:.agents/discussions/ocx-interface-contract.md`** (State: active, Updated: 2026-09-25 — two days before this dive, git-tracked and unmodified, so per the harness's own state rules this is a live but *inert-to-me* artifact, read only): its "Decisions" section states, in the owner's own words dated 2026-09-25: "Contract scope = report JSON + CLI grammar + exit codes + `error.detail` slugs + stdout error envelope." The compat gate it designs is explicitly structural — "diff each schema against the last release baseline, additive passes, break needs an explicit recorded acknowledgement," with worked examples that are all shape changes ("remove a field... make a required field optional... new optional field"). Nowhere does the scope, the gate design, or its "Open questions" list mention `description` string content as something the compat gate diffs.

3. **`ocx:CLAUDE.md:19-21`** ("Stability tiers"): "Interfaces are the CLI surface and every wire/persisted format... Even interfaces break pre-1.0. A break is announced in the changelog and nowhere else." Since `CHANGELOG.md` is generated from commit subjects (`CLAUDE.md:31`, "the changelog entry is the commit subject"), and the golden test already forces a subject naming the schema change (source 1), the two mechanisms compose for free: a description-text cleanup already produces exactly the changelog visibility a pre-1.0 interface break is entitled to, without needing the heavier compat-gate ledger-entry-plus-`$id`-bump path that source 2 reserves for structural breaks. `CHANGELOG.md` already carries schema-scoped entries today (`grep -n -i schema CHANGELOG.md`: "Publish the --format json report contract *(schema)*", "Publish every JSON Schema, not just metadata *(website)*") — schema changes are routinely changelog-visible in this repo's existing practice.

**Reading of the evidence** (not the decision — that is the owner's, per the commission): schema `description` text is a byte-gated wire artifact today, but current design intent — as of a discussion dated two days before this measurement — treats it as *outside* the versioned compat contract the SDKs' handshake logic depends on. Cleaning SRF-01 leaks out of it is well-modeled as a "fixture refresh" (regenerate the golden, name the change in the commit subject) rather than a breaking-change ledger entry. If the owner instead decides schema description text *should* join the compat-gated contract (e.g. because a future codegen step surfaces it as SDK-generated doc comments — the interface-contract discussion's own "Codegen" decision says the OCX-owned generator "emits stdlib-only code for all six languages," and typify/quicktype-style generators typically do carry `description` into generated doc comments), that is a new decision this discussion has not yet made, and the SRF-01 cleanup would need to wait for it or be scoped to fields the generator does not yet touch.

## Normative guidance candidates

1. **Add the `C-S[0-9]+(-[0-9]+)?` clause-label family to SRF-01's token set** (amends SRF-01). Prevents: an internal signing-slice provenance tag leaking in a shape none of the other 14 families catch — measured leaking in both `ocx:crates/ocx_schema/tests/golden/reports.json:3578` and `ocx-sdk-python:src/ocx_sdk/_results.py:320,331` today. Verification: `rg -o -e '\bC-S[0-9]+(-[0-9]+)?\b' <surface>` must print nothing; 2026-09-27 measured 2 hits, 0 false positives. Severity: MUST (same tier as the family it generalizes from ocx's own `has_clause_label`).
2. **Extend ocx's clap-only leak test's family list to match SRF-01's full set, and port the same assertion to `schema_outputs.rs`** (amends SRF-03). Prevents: the four leaks this dive found live in `--help` (`.rs` filenames, `Self::`/`crate::` paths, intra-doc links) that the shipped `marker()` function structurally cannot see, and the zero coverage `schema_outputs.rs` has today (confirmed: 15 test functions, none asserting on description content). Verification: planted-fixture red/green per [§8](#8-per-generator-output-side-test-proved-redgreen-on-a-planted-leak-one-per-language); a schema-side assertion added to `schema_outputs.rs` must fail on a planted `(C-999, adr_planted_fixture.md)` field doc and pass without it, mirroring the existing `cli_help_text_has_no_internal_references` pattern. Severity: MUST.
3. **Grimoire needs the same two tests it currently lacks entirely: one over `grim schema --kind {config,publish,lock,mcp}` output, one over the rmcp tool list (both explicit `description` strings and `JsonSchema`-derived argument struct docs).** Prevents: grimoire's clean-today state (0 hits, §3-§4) silently regressing — nothing currently stops it. Verification: the same 15-family scan run against all four `grim schema` outputs and against `src/mcp/server.rs` + `src/mcp/tool_args.rs`'s doc-comment spans; must be zero today (measured) and must fail on the rust-fixture-style planted leak. Severity: MUST.
4. **TypeScript CLIs (commander) need an output-side or in-process description scan; ocx-catalog does not have one and already shipped a leak.** Prevents: exactly the measured `ocx-catalog:src/cli/main.ts:37` `(C-007)` leak, live in `ocx-catalog --help` and `ocx-catalog ci --help` today. Verification: the ts-fixture pattern from [§8](#8-per-generator-output-side-test-proved-redgreen-on-a-planted-leak-one-per-language) — import the CLI's command tree (requires exporting `buildProgram()` from `main.ts`, currently unexported) and walk `.commands[i].description()`, or shell out to `--help` recursively and scan stdout (simpler, no export needed, matches this dive's own capture method). Severity: MUST.
5. **`short2char` stays excluded from the MUST set; do not add it back.** Freshly re-measured 25% false-positive rate (4/16: `V1`, `V3` schema-version tags, `C0` Unicode terminology) on this dive's own corpus, independent of the prior dive's number. Severity: n/a (confirms an existing exclusion, no new check).
6. **rmcp's doc-comment fallback (`description` unset → the function's own `///` is used) is a live failure mode with zero current occurrences; name it explicitly in SRF-03's rationale** so a future tool added without an explicit `description` attribute is not assumed safe just because it has no `description = "..."` string to scan. Verification: none needed today (0 occurrences); the source-side scan in [§8](#8-per-generator-output-side-test-proved-redgreen-on-a-planted-leak-one-per-language)'s MCP paragraph already covers both forms since it walks doc-comment spans directly, not just the `description` attribute. Severity: CONSIDER (documentation-only until a real occurrence exists).

## Decisions this dive proposes

- **Token set**: SRF-01's 14 families plus a 15th, `\bC-S[0-9]+(-[0-9]+)?\b`, given in full in [§7](#7-token-set-tuning-0-false-positives-on-14-families-25-on-the-excluded-one-one-real-gap-found-and-closed). Measured false-positive rate on 333 hits across every generator the commission named: **0%**, comfortably under the 2% ceiling with no further tuning needed. `short2char` stays out (25% FP, freshly re-measured).
- **Per-generator test shapes**: clap and commander → walk `--help` recursively (subprocess, output-side, simplest, already what this dive's own capture does and what ocx's `app.rs` test already does for clap); schemars and rmcp/MCP schemas → walk the generator's own emitted JSON (schemars: existing golden-file pattern for ocx, add the same for grimoire via `grim schema --kind`; rmcp: call `list_tools()`/scan the `#[tool]`+`JsonSchema` doc-comment spans in-process, no subprocess); mkdocstrings/Python → `inspect.getdoc()` over the package's public API, in-process, no site build needed for the test itself (only for a human-facing spot check). One shared scanner (`srf01_scan.py`'s shape) across all of them; only the walk changes per generator.
- **SRF-03 stays MUST.** Every generator this dive touched already has, or trivially gets, a working, cheap, portable test — and the one gap (ocx-catalog's commander CLI) already shipped a real, live leak that a routine test would have caught before it shipped. Downgrading would leave that class of leak structurally unmonitored.
- **Is schema `description` text ocx's versioned contract?** Evidence (not the decision, per the commission): no — not in the sense the owner's own active compat-gate design currently uses "contract" (structural, backward-compat-diffed, `$id`-bumped on break). It *is* a byte-gated committed artifact requiring a named commit to change, which already produces changelog visibility under the existing pre-1.0 "changelog only" policy. Practical consequence: an SRF-01 cleanup of ocx's golden schemas is a normal content change (regenerate golden, name it in the commit subject) — not a breaking-change ledger entry — under the interface-contract discussion's current (2026-09-25) design. This could change if that discussion's still-open codegen decision starts propagating `description` text into generated SDK code; that is a future decision, not one this discussion has made.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `code-docs-surfaces.md` (SRF-01 through SRF-05) and `code-docs-surfaces/interface-leak.md` | This program's own prior consolidation and wave-2 dive | 2026-09-27 | The commission's starting point; this dive re-measures fresh rather than re-citing its numbers |
| Live commands + fresh builds against scratch copies of `/home/mherwig/dev/{ocx,grimoire,ocx-catalog,grimoire-indexer}` | This dive's own primary measurement | 2026-09-27 | Every number in §2-§7 is freshly run in this session, not carried over |
| `ocx:crates/ocx_cli/src/app.rs:731-812` (`cli_help_text_has_no_internal_references`, `has_clause_label`, `marker`) | Fleet primary, existing shipped test | HEAD `2691d3c16` | The existing clap-only check this dive extends; source of the `C-S<n>` clause-label family |
| `ocx:crates/ocx_schema/tests/schema_outputs.rs` | Fleet primary, existing shipped test | HEAD `2691d3c16` | Confirmed (by reading every `fn` name) to have zero content/leak assertion — the SRF-03 schema-side gap |
| `ocx:crates/ocx_schema/tests/golden_schemas.rs:4-20` | Fleet primary, shipped test's own doc comment | HEAD `2691d3c16` | Byte-exact golden policy and its "name the change in the commit subject" requirement — key evidence for §9 |
| `ocx:.agents/discussions/ocx-interface-contract.md` | Fleet primary, active design discussion (git-tracked, unmodified) | Updated 2026-09-25 | The owner's own current contract-scope decision, read directly rather than inferred |
| `ocx:CLAUDE.md:13-31` ("Stability tiers", "Never edit CHANGELOG.md") | Fleet primary, project policy | current | Pre-1.0 break policy and the commit-subject-as-changelog mechanism §9 relies on |
| `ocx:CHANGELOG.md` (grep `-i schema`) | Fleet primary, generated changelog | current | Existing precedent for schema changes being changelog-scoped `*(schema)*` |
| `ocx-catalog:src/cli/main.ts:37`, `test/cli.test.ts` | Fleet primary, this dive's own finding | HEAD `a16be21a` | The live, uncaught `(C-007)` leak and the confirmed absence of a description assertion |
| `ocx-sdk-python:src/ocx_sdk/_results.py:320,331,1570`, `site/reference/api/index.html` | Fleet primary | HEAD `9713f0a9` | Source-to-rendered cross-reference proving mkdocstrings copies docstrings verbatim |
| `grimoire:src/mcp/server.rs:55-149`, `src/mcp/tool_args.rs` | Fleet primary | HEAD `96647fc4` | The MCP tool descriptions and their `JsonSchema`-derived argument docs, read in full |
| `grimoire:src/command/schema.rs` | Fleet primary | HEAD `96647fc4` | `grim schema --kind` — the command this dive used to generate grimoire's schemas fresh |
| `ocx-mirror:crates/ocx_mirror_spec/src/dist.rs:62` | Fleet primary | HEAD `7b395d57` | The `cfg_attr(feature = "jsonschema", derive(...))` shape `comment_census.py`'s `RUST_IFACE_RE` still misses, re-confirmed against the regex text |
| `rules/code-docs/checks/comment_census.py:99-106` (`RUST_IFACE_RE`) | This program's own check | current | Re-read to confirm exactly why `cfg_attr`-wrapped derives don't match |
| [docs.rs/rmcp-macros — `attr.tool.html`](https://docs.rs/rmcp-macros/latest/rmcp_macros/attr.tool.html) | Official generated docs, fetched | fetched 2026-09-27 | Confirms `#[tool(description = ...)]` is used verbatim and falls back to the doc comment when absent |
| [mkdocstrings-python usage docs](https://mkdocstrings.github.io/python/usage/) | Official docs, fetched | fetched 2026-09-27 | Confirms no content-filtering step is documented (extraction mechanics not fully public; empirical cross-reference in §5 is the stronger evidence) |
| [commander.js README](https://github.com/tj/commander.js#readme) | Official docs, fetched | fetched 2026-09-27 | Confirms `.description()` only wraps for terminal width, no content filtering |
| `.agents/research/code-docs-audit/census.md` §5 | This program's prior measurement | 2026-09-27 | Baseline this dive's §3 numbers reproduce independently |
| `walk_help.py`, `srf01_scan.py`, `famcount.sh`, `fixtures/{rust,python,ts}-fixture/` | This dive's own scripts, session scratchpad | 2026-09-27 | The measurement and planted-fixture tooling itself |
