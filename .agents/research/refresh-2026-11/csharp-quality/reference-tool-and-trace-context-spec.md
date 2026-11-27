---
title: Delta - example wrapped tool ocx and OTel env-carrier spec, 2026-10-11 to 2026-11-27
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 8
---

# Delta: ocx and the OpenTelemetry env-carrier spec

This is a delta update. Everything below is checked against primary sources fetched on 2026-11-27: the ocx-sh/ocx release list and CHANGELOG, a shallow clone of tag v0.6.8 (commit 720f08a6, 2026-11-15) and tag v0.6.5, ocx-sh/www-setup issue 14, and the opentelemetry-specification CHANGELOG and context/env-carriers.md on main.

## Summary

- Newest ocx release is v0.6.8 (2026-11-15). Releases in the window after 0.6.5 (2026-10-07): v0.6.6 (2026-11-12), v0.6.7 (2026-11-15), v0.6.8 (2026-11-15). Note 0.6.5 itself predates the 2026-10-11 baseline; the baseline measured 0.6.5, which was current then.
- A released ocx now carries `contract`: 0.6.6 adds the "OCX machine-interface contract". In v0.6.8 `ocx version --verbose` emits a top-level `contract` object (`errors`, `commands`, `reports`, each a per-name integer version).
- `schema_version` is emitted in v0.6.8 (value 1) as a top-level member of the reports and error documents. The error document is the envelope `{"schema_version":1,"command":...,"exit_code":...,"error":{kind,message,context}}`. Reports and errors contracts are held at v1 ("while the interface hardens"). The CHANGELOG never uses the word `schema_version`; the evidence is the source and conformance fixtures.
- Exit code 82 changed meaning: `DirtyRcBlock` (0.6.5) is now `Unsupported`. The dirty managed shell-profile block now exits 81 (`PolicyBlocked`).
- Exit codes 83 to 87 are retired and never reused (folded into next-action codes).
- ocx still reads no trace context: no TRACEPARENT, TRACESTATE or BAGGAGE handling in v0.6.8 source or in the 0.6.6 to 0.6.8 changelog.
- The OTel env-carrier spec moved from Release Candidate to Stable in spec v1.63.0 (2026-11-23).
- www-setup issue 14 is still open as of 2026-11-27. Immutable releases on ocx-sh/ocx: could not determine.

## Findings, per claim at risk

### 1. binaries.md:8 and observability.md:9, "example wrapped tool ocx 0.6.5", "pinned 0.6.2", "assets.json 0.6.5"
Status: changed. The tool is at 0.6.8. Releases: [releases page](https://github.com/ocx-sh/ocx/releases) lists v0.6.8 (2026-11-15, Latest), v0.6.7 (2026-11-15), 0.6.6 (2026-11-12), 0.6.5 (2026-10-07). Old text "ocx 0.6.5" is a measurement pin, not wrong for 0.6.5, but it is no longer the newest. The `triangulate.py ... 0.6.5` command and "Example inputs are from the 0.6.5 release" in binaries.md (lines 164, 210) describe a release that is two minors behind; I did not re-measure `assets.json` or `dist.json` for 0.6.6 to 0.6.8, so member names and digests there are "could not determine".

### 2. Open question "No released ocx carries `contract`; 0.6.5 has no `schema_version`" (csharp-api, csharp-json, csharp-packaging, csharp-crossplatform) and Owner Default D8 floor "first ocx release carrying `contract`"
Status: changed.
- `contract`: first released in 0.6.6 (2026-11-12): CHANGELOG line "OCX machine-interface contract, the ocx-sdkgen Rust SDK generator, and exit codes 83-87 folded into the next-action codes BREAKING" ([CHANGELOG](https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/CHANGELOG.md), [v0.6.6 release](https://github.com/ocx-sh/ocx/releases/tag/v0.6.6)). Source: `crates/ocx_cli/src/api/data/version.rs:26` at v0.6.8 documents `"contract": { "errors": 1, "commands": {...}, "reports": {...} }`. At tag v0.6.5 the directory `crates/ocx_schema/contract` does not exist and `"contract"` does not occur in `crates`. So the D8 floor is now concretely "ocx 0.6.6" (the first release carrying `contract`); the sentence "No released ocx carries `contract`" is stale.
- `schema_version`: "0.6.5 has no `schema_version`" is partly wrong even for 0.6.5: at tag v0.6.5 the `package attest`, `package sbom`, signature, verification and sweep reports already emitted `{"schema_version":1,"command":...,"exit_code":0,"data":...}` (for example `crates/ocx_cli/src/api/data/sbom.rs:277`). What 0.6.5 lacked was the universal contract. In v0.6.8 the conformance fixtures show `schema_version: 1` at the top of status, error, and version documents (`crates/ocx_schema/contract/conformance/captured_status/instance.json`, `captured_error_not_found`, `captured_version_verbose`). The README there defines `contract_mismatch` as "the root's `schema_version` is not the one the SDK was generated for". Caveat: I read fixtures and doc comments, not a live 0.6.8 binary. Whether every `--format json` success document carries `schema_version` was not verified command by command: could not determine.
- Date of upstream change: 2026-11-12 (0.6.6).

### 3. "82 = `DirtyRcBlock`" in the 0.6.5 exit table
Status: changed. v0.6.5 `crates/ocx_exit/src/exit_code.rs`: `PolicyBlocked = 81`, `DirtyRcBlock = 82`, `TransparencyLogUnavailable = 83`, `ReferrersUnsupported = 84`, `UnsupportedKeyBackend = 85`, `ForgeCapabilityUnavailable = 86`, `RegistryDeleteUnsupported = 87`. v0.6.8 same file: `PolicyBlocked = 81` ("A local policy or safeguard refused the operation; loosen the flag or pass --force", now including "a managed shell-profile block carrying user edits") and `Unsupported = 82` ("A valid invocation the registry, forge or build cannot honour ... retrying never helps"). `RETIRED = [83, 84, 85, 86, 87]`. The reference page states "Exit numbers 83, 84, 85, 86, 87 are retired and never reused" (`website/src/content/docs/reference/exit-codes.md:8`), and `self.md:68` says a hand-edited managed block without `--force` exits 81. Date: 2026-11-12 (0.6.6). All other table entries (0, 1, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81) unchanged in number; 75 additionally covers a transient GitHub OIDC token fetch failure (0.6.6), and the 0.6.5 exit-table rows 83 to 87 no longer exist. Any depth-file text that maps 82 to a dirty profile block, or lists 83 to 87 as live, is stale. A consumer that branches on 82 now sees "unsupported capability".

### 4. observability.md CS-OBS-29 "ocx 0.6.5 and main read no trace context"
Status: unchanged for ocx. `git grep -i traceparent` on tag v0.6.8 finds only two `.claude/artifacts` design notes that explicitly decline the feature; no source or website doc. CHANGELOG 0.6.6 to 0.6.8 has no trace-context line. The only telemetry entries are 0.6.3 (Bazel build events to otel.ocx.sh) and 0.6.6 ("The telemetry credential reaches only the step that exports test timings", CI only). "Main" is now v0.6.8 (I checked the tag, not a later main commit: any commit after 2026-11-15 is could not determine). Those same design notes still say "The env-carrier spec is OTel release-candidate and does not even mandate the variable name"; that is now outdated (see 5) but they remain ocx's own decision to not propagate.

### 5. Corpus note "The OTel env-carrier spec is a Release Candidate"; observability.md:170 "The env-carrier spec exists."
Status: changed for the first, unchanged for the second. [spec CHANGELOG](https://raw.githubusercontent.com/open-telemetry/opentelemetry-specification/main/CHANGELOG.md) v1.63.0 (2026-11-23), Context: "Mark 'Environment Variables as Context Propagation Carriers' as Stable. (#5389)". The earlier v1.59.0 entry marked it Release Candidate. [env-carriers.md](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/context/env-carriers.md) now reads `**Status**: Stable`. Variable names: not fixed by the carrier. The carrier MUST be format-agnostic and treat values as opaque; propagators choose key names. Normalization (MUST): empty name becomes `_`, ASCII letters uppercased, any character outside ASCII letter, digit, underscore becomes `_`, a leading digit gets a `_` prefix; result matches `^[A-Z_][A-Z0-9_]*$`. The doc cites `TRACEPARENT` and `X_B3_TRACEID` as examples only (a Windows case-insensitive lookup note for `TRACEPARENT`). The names TRACEPARENT, TRACESTATE, BAGGAGE come from the W3C propagators uppercased by normalization, not from a variable list in the carrier doc. No variable name change in the window (the last name-related changes are v1.56.0 and v1.58.0, both before the baseline). Also: "Language implementations MUST NOT spawn child processes as part of environment variable context propagation." The "Release Candidate" wording and any "pending spec" hedge in the corpus note are stale; the sentence "The env-carrier spec exists." is still true. Spec Unreleased section is empty (no pending env-carrier change).

### 6. csharp-security.md open question: ocx-sh/www-setup#14 signature-format change and immutable releases (keeping CS-BIN-28 dormant)
Status: www-setup#14 unchanged: still OPEN, no comments, `closedAt` null, fetched 2026-11-27 via the GitHub API. Its title is "dist.json: detached signature for manifest authenticity", proposing a minisign or sigstore detached signature over `dist.json`, published as `dist.json.minisig`, with key pinned in consuming SDKs. Nothing landed there. Immutable releases on ocx-sh/ocx: could not determine (the releases API was rate-limited and the release list page and CHANGELOG say nothing about immutability). Separate, relevant to the "binaries are not signed" premise: ocx 0.6.7 changes signature verification of OCI packages (publisher verification against the index, `--no-verify` refused when system config requires signatures; breaking). That concerns package trust in ocx itself, not the GitHub release assets or `dist.json` that CS-BIN verifies, so it does not by itself activate CS-BIN-28; I flag it for the owner, not decided here.

## Stale-sentence checklist (for the consolidating author)
| File and sentence | Why stale | Source date |
|---|---|---|
| binaries.md:8, observability.md:9 "ocx 0.6.5" | newest is 0.6.8 | 2026-11-15 |
| binaries.md "pinned 0.6.2", "assets.json 0.6.5", triangulate command | not re-measured for 0.6.6 to 0.6.8 | 2026-11-12 |
| open questions in api, json, packaging, crossplatform: "No released ocx carries `contract`" | 0.6.6 carries it | 2026-11-12 |
| "0.6.5 has no `schema_version`" | 0.6.5 had it on attest, sbom, sign, verify, sweep; universal from 0.6.6 | 2026-11-12 |
| D8 floor "first ocx release carrying `contract`" | resolves to 0.6.6 | 2026-11-12 |
| exit table "82 = DirtyRcBlock", rows 83 to 87 | 82 = Unsupported, dirty block = 81, 83 to 87 retired | 2026-11-12 |
| observability corpus note "env-carrier spec is a Release Candidate" | Stable since spec v1.63.0 | 2026-11-23 |
| CS-OBS-29 "ocx ... read no trace context" | unchanged, still true at v0.6.8 | - |
| security open question www-setup#14 | unchanged, still open | - |

## Normative guidance candidates
No new rule is proposed; these are example-consumer facts. Two checks for the consolidator:
1. Rule: key any version floor to "first ocx release carrying `contract`" as 0.6.6, and refuse documents whose `contract` or `schema_version` differ. Rationale: the contract now exists in a release. Verify: `ocx version --verbose --format json | jq '.contract.errors, .schema_version'` on a 0.6.6+ binary, or `grep -n '"contract"' crates/ocx_cli/src/api/data/version.rs` in the ocx tag.
2. Rule: never branch on a numeric exit code without the tool's table for the pinned version. Rationale: 82 changed meaning in a patch-level release. Verify: `grep -n "= 8[0-9]" crates/ocx_exit/src/exit_code.rs` at the pinned tag and compare with the wrapper's `OcxExitCode` enum.

## AI-agent angle
An agent trained before 2026-11 will write "82 means dirty profile" and "83 to 87 are forge or key errors" and will assume the env-carrier spec is RC. Smallest check: grep the wrapper for `82` and `8[3-7]` constants against the pinned tag's `exit_code.rs`.

## Contested / evolving
Trend: ocx is hardening its machine interface (contract baseline in `crates/ocx_schema/contract/baseline`, "while the interface hardens"), so further breaking changes before 1.0 are plausible. OTel env-carriers are Stable; whether ocx adopts them is its own stated non-goal as of v0.6.8.

## Sources
| URL | What | Date |
|---|---|---|
| https://github.com/ocx-sh/ocx/releases | release list and notes | to 2026-11-15 |
| https://github.com/ocx-sh/ocx/releases/tag/v0.6.6 | 0.6.6 notes | 2026-11-12 |
| https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/CHANGELOG.md | CHANGELOG | 2026-11-15 |
| https://github.com/ocx-sh/ocx/tree/v0.6.8 (shallow clone, commit 720f08a6) | source: exit_code.rs, version.rs, conformance fixtures, website exit-codes.md | 2026-11-15 |
| tag v0.6.5 of ocx-sh/ocx (fetched) | baseline source comparison | 2026-10-07 |
| https://github.com/ocx-sh/www-setup/issues/14 | open issue | open on 2026-11-27 |
| https://raw.githubusercontent.com/open-telemetry/opentelemetry-specification/main/CHANGELOG.md | spec changelog | v1.63.0 2026-11-23 |
| https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/context/env-carriers.md | spec text, status Stable | 2026-11-27 |
