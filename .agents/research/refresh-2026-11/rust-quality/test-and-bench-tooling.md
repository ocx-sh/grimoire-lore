---
title: Test, coverage, mutation, fuzz and benchmark tooling delta, 2026-08-14 to 2026-11-27
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 36
---

# Test and benchmark tooling delta

Scope: claims in testing.md, performance.md and docs-and-tracing.md that name a test, coverage, mutation, fuzz or benchmark tool. Events dated 2026-08-01 or later count as in-window. This is a delta against the existing text; unchanged items stay as they are.

Summary: one claim needs a wording update (hyperfine 2.0.0 made `--shell=none` the default). One claim is stale in its inverse direction (assert_cmd `cargo_bin` is not deprecated). One claim is soft (gungraun is no longer "mid-rename"). Every other claim is unchanged. No verification command in the three files uses a flag that was renamed or removed in the window.

## Verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| TEST-22 / DOC-08: nextest does not execute doc tests | unchanged | The nextest running docs still say "Doctests are currently not supported because of limitations in stable Rust" and recommend `cargo test --doc` ([nexte.st/docs/running](https://nexte.st/docs/running/)). Releases 0.9.143 (2026-08-04) through 0.9.152 (2026-11-13) never mention doctests ([changelog](https://nexte.st/changelog/)). |
| TEST-23: JUnit `flakyFailure` in `target/nextest/ci/junit.xml`, retries, `--profile ci` | unchanged | The only JUnit change is a new `junit.report-skipped` setting in 0.9.143 (2026-08-04), which controls skipped tests in the XML. Retries and `--profile` are not mentioned. Profile inheritance fixes in 0.9.145 (2026-09-16) do not change the flag. |
| TEST-38: nextest filtersets and test-groups | unchanged | No filterset DSL change. 0.9.145 changed `default-filter` inheritance from profile ancestors and tool config files. 0.9.151 (2026-11-02) fixed test groups with `threads-required` where waiting tests might never start. A reader should know the 0.9.151 fix if a CI test-group deadlock was seen before it. |
| TEST-24: `cargo-tarpaulin` "Linux-x86_64-only ptrace" | unchanged | README: "On Linux, Tarpaulin's default tracing backend is still Ptrace and will only work on x86_64 processors"; Mac and Windows default to LLVM, and `--engine llvm` is available ([README](https://raw.githubusercontent.com/xd009642/tarpaulin/develop/README.md)). Releases 0.37.1 to 0.37.6 (2026-08-10 to 2026-11-05) touched LLVM 23 support and argument hardening only ([changelog](https://raw.githubusercontent.com/xd009642/tarpaulin/develop/CHANGELOG.md)). Wording note: "ptrace" is the Linux-x86_64-only part; tarpaulin itself also runs with the LLVM engine elsewhere. |
| TEST-24: cargo-llvm-cov `--branch` still unstable | unchanged | README: "Enable branch coverage. (unstable)", requires nightly ([README](https://raw.githubusercontent.com/taiki-e/cargo-llvm-cov/main/README.md)). Releases 0.9.0 (2026-08-16), 0.9.1 (2026-09-06), 0.9.2 (2026-11-20) do not touch it ([changelog](https://raw.githubusercontent.com/taiki-e/cargo-llvm-cov/main/CHANGELOG.md)). |
| TEST-24: `--fail-under-lines` | unchanged | Same README: exits 1 if total line coverage is under MIN percent. Not changed in window. Note: 0.9.0 changed `--show-missing-lines` output to aggregate consecutive line numbers, a breaking change for output parsers. Check that no rule parses that output. |
| TEST-20: `cargo mutants --in-diff` | unchanged | No cargo-mutants release in window; latest is 27.1.0 (2026-06-02) ([NEWS](https://raw.githubusercontent.com/sourcefrog/cargo-mutants/main/NEWS.md), [crates.io](https://crates.io/api/v1/crates/cargo-mutants)). `--in-diff` has existed since 23.11.1. |
| TEST-37: `cargo hack` `--each-feature`, `--feature-powerset`, `--depth`, `--group-features`, `--exclude-features` | unchanged | Only 0.6.46 (2026-11-01): `-m` alias and a FreeBSD aarch64 binary ([changelog](https://raw.githubusercontent.com/taiki-e/cargo-hack/main/CHANGELOG.md)). |
| TEST-26: `cargo semver-checks` limits | unchanged in kind, with two additions | v0.50.0 (2026-08-01) added the lint `auto_trait_impl_added` and rustdoc JSON v61. v0.51.0 (2026-10-03) added six C-ABI variadic lints and requires Rust 1.93 or newer ([releases](https://github.com/obi1kenobi/cargo-semver-checks/releases)). The release notes say nothing about the three limits the rule names (auto-trait loss, bound tightening, RPIT lifetime capture). The new auto-trait lint may narrow the auto-trait gap, but "a clean run is not proof" still holds. Could not determine from release notes how far the gap narrowed; the lint docs were not fetched. |
| TEST-33: `rsfs` no release since 2017 | unchanged | crates.io: newest 0.4.1, 2017-05-27 ([crates.io](https://crates.io/api/v1/crates/rsfs)). |
| TEST-17: `proptest-state-machine` `prop_state_machine!` | unchanged | proptest-state-machine 0.9.0 (2026-10-10) raised the MSRV to 1.88.0 and bumped proptest to 1.12.0, which fixes replaying persisted failures in forked tests ([changelog](https://raw.githubusercontent.com/proptest-rs/proptest/main/proptest-state-machine/CHANGELOG.md), [crates.io](https://crates.io/api/v1/crates/proptest-state-machine)). The macro is not mentioned. |
| TEST-18: `cargo fuzz build`, `#[derive(Arbitrary)]` | unchanged | cargo-fuzz latest is 0.13.2 (2026-06-09), before the window ([crates.io](https://crates.io/api/v1/crates/cargo-fuzz)). Arbitrary itself was not checked in this run. |
| TEST-32: `fail` `FailScenario` / `fail::cfg` | unchanged | `fail` newest is 0.5.1 (2022-10-08) ([crates.io](https://crates.io/api/v1/crates/fail)). |
| TEST-39: `mockall` | unchanged | Newest 0.15.0 (2026-06-28), before the window ([crates.io](https://crates.io/api/v1/crates/mockall)). |
| testing.md source line: `Command::cargo_bin` in assert_cmd | changed (inverse of the question) | `cargo_bin` was deprecated in 2.1.0 (2025-10-28) in favour of the `cargo_bin!` and `cargo_bin_cmd!` macros, then un-deprecated in 2.1.3 (2026-03-10); 2.2.0 (2026-03-10) made invalid paths panic instead of returning errors ([CHANGELOG](https://raw.githubusercontent.com/assert-rs/assert_cmd/master/CHANGELOG.md)). Both forms are current. Latest is 2.2.2 (2026-05-11). Both predate the window, so this is a baseline-gap correction, not a window event. If the source line implies a deprecation, drop it; if it only names the function, keep it and optionally name the macros as an alternative. |
| PERF-03, PERF-25: hyperfine `--shell=none` / `-N`, `--prepare`, `--warmup` | changed | hyperfine 2.0.0 (2026-10-07) runs commands directly by default, which is `--shell=none`; `-S` (alias for `--shell=default`) restores the shell; `-N` / `--shell=none` is still in the README; `-p/--prepare` and `-w/--warmup` are still documented; `--setup`, `--prepare`, `--conclude`, `--cleanup` always run in a shell ([release v2.0.0](https://github.com/sharkdp/hyperfine/releases/tag/v2.0.0), [README v2.0.0](https://raw.githubusercontent.com/sharkdp/hyperfine/v2.0.0/README.md)). Removed in 2.0.0: `--time-unit/-u` (use `--metrics`), `--sort`, `--reference`, `--reference-name`. JSON export is schema version 2 (`results[i].mean` moved to `results[i].summary.time_wall_clock.mean`). Consequence: the PERF-25 rationale "hyperfine's shell-startup correction" applies only to the old default or to `-S`; the explicit flag is still valid and harmless, so the verification greps for `--shell=none` / ` -N ` still work, but on 2.x a command without them is already shell-free. Under hyperfine 1.x (latest 1.21.0, 2026-10-05) the old default still applies, so keep the explicit flag. |
| PERF-05: criterion / divan with `black_box` | unchanged | criterion latest 0.8.2 (2026-02-04), no window release. Since criterion 0.6.0 it uses `std::hint::black_box`; the old `criterion::black_box` is the legacy spelling. divan latest 0.1.21 (2025-04-10) ([criterion changelog](https://raw.githubusercontent.com/bheisler/criterion.rs/master/CHANGELOG.md), [crates.io criterion](https://crates.io/api/v1/crates/criterion), [crates.io divan](https://crates.io/api/v1/crates/divan)). The corpus should prefer `std::hint::black_box` if it still names `criterion::black_box`. |
| performance.md: iai-callgrind/Gungraun "Linux-only, mid-rename" | changed (soft) | The rename to Gungraun completed in 0.17.0 (2025-09-21): crate `gungraun`, env prefix `GUNGRAUN`, output dir `target/gungraun`. 0.20.0 (2026-09-26) is "focused on Linux perf", adds perf as a first-class tool, a test mode so `cargo test --benches` runs without Valgrind or perf, and a further breaking rename of internal API names (`ValgrindTool` to `Tool`, `client_request*` features to `stubs` / `act`, `GUNGRAUN_VR_*` to `GUNGRAUN_TR_*`) ([releases v0.20.0](https://github.com/gungraun/gungraun/releases/tag/v0.20.0), [CHANGELOG](https://raw.githubusercontent.com/gungraun/gungraun/main/CHANGELOG.md)). "Mid-rename" is stale for the crate name but the API still churns between minors. "Linux-only" is still a fair summary of real measurement (Valgrind and perf); other platforms only get a run-once test mode. Rejection stands. |
| PERF-08: `cargo bloat` "guesswork" | unchanged | README still says "numbers above are a result of guesswork. They are not 100% correct and never will be." Latest release 0.12.1 (2024-05-10) ([repo](https://github.com/RazrFalcon/cargo-bloat), [crates.io](https://crates.io/api/v1/crates/cargo-bloat)). |
| PERF-07: CodSpeed "~2.66% CoV ... ~45% false-positive" | unchanged | The article, published 2025-07-30 with no revision date, states 2.66% CoV on GitHub-hosted runners, a 45% false-positive chance at a 2% gate, and 0.56% on bare-metal Macro Runners ([blog](https://codspeed.io/blog/benchmarks-in-ci-without-noise)). The figures are from 2025 and not re-measured in the window. |
| PERF-23: `cargo llvm-lines` | could not determine for 0.4.47 and 0.4.48 | Two releases on 2026-08-19 (0.4.47, 0.4.48) are in-window; only the crates.io listing was read, not release notes ([crates.io](https://crates.io/api/v1/crates/cargo-llvm-lines)). No flag change is evidenced. The rule's use of the subcommand is likely unaffected, but this is unverified. |
| PERF-28: BOLT scoped to long-running services | could not determine | No BOLT source was fetched in this run. |
| Corpus open question: no maintained Rust size-limit equivalent | could not determine | No fetch searched for a Rust size-limit tool in the window. |
| DOC-15: `trycmd` | unchanged | Newest 1.2.1 (2026-07-21), before the window; 1.2.0 on 2026-03-23 ([crates.io](https://crates.io/api/v1/crates/trycmd)). The changelog content was not read. |
| DOC-17: `cargo rdme --check` | unchanged, with a note | cargo-rdme 2.2.0 (2026-08-05), 2.2.1 (2026-08-11), 2.2.2 (2026-08-27), 2.2.3 (2026-09-20). The release notes do not mention `--check`; 2.2.1 fixed detection of uncommitted changes for workspace projects pointing at the root `Cargo.toml` ([releases](https://github.com/orium/cargo-rdme/releases), [crates.io](https://crates.io/api/v1/crates/cargo-rdme)). The flag is only unconfirmed by the summaries, not shown changed. |

## Rules whose verification command is affected

- None uses a renamed or removed flag.
- PERF-03 and PERF-25 (and the grep that rejects hyperfine lines lacking `--shell=none` or ` -N `): still correct for hyperfine 1.x. On 2.x the check flags harmless lines. Keep it, optionally with a one-line note that 2.0.0 made shell-free the default.
- Any rule or script that reads hyperfine JSON (`results[].mean`, `results[].times`) or uses `--time-unit`, `--sort`, `--reference` breaks on 2.0.0. No such use was found by reading the claims list; a grep over the three files should confirm: `grep -nE 'time-unit|--sort|--reference|\.times|results\[' skills/rust-quality-reference/*.md`.
- TEST-24 tooling that parses `cargo llvm-cov --show-missing-lines` output breaks on 0.9.0 and later.

## Normative guidance candidates

1. PERF-25 wording: "Measure startup with `hyperfine --warmup N` and an explicit `-N`/`--shell=none`; hyperfine 2.0 makes this the default, and 1.x does not." Rationale: the rule must be right on both majors. Verify: `grep -nE 'hyperfine' skills/rust-quality-reference/performance.md` and the existing PERF-25 block.
2. PERF-05: name `std::hint::black_box` as the spelling. Rationale: criterion 0.6.0 dropped its own implementation. Verify: `grep -rn 'criterion::black_box' --include='*.rs' .` returns nothing.
3. Gungraun line in performance.md: replace "mid-rename" with "rename finished in 0.17.0; API still breaking between minors (0.20.0)". Rationale: stale fact. Verify: reading heuristic, compare to the gungraun CHANGELOG.
4. testing.md assert_cmd source line: state that `cargo_bin` and the `cargo_bin!` / `cargo_bin_cmd!` macros are both current. Rationale: a deprecation window came and went. Verify: `grep -n 'cargo_bin' skills/rust-quality-reference/testing.md`.

## AI-agent angle

- An agent trained before October 2026 assumes hyperfine runs through a shell. On 2.x, shell syntax (pipes, `&&`) in a benchmarked command silently becomes literal arguments unless `-S` is passed. Catch with: grep for `hyperfine .*[|&]` without `-S`.
- An agent that saw the 2025 deprecation of `Command::cargo_bin` may rewrite working code to macros or add `#[allow(deprecated)]`. Both are harmless now; neither is required.
- An agent may state "nextest now runs doctests". It does not, as of 0.9.152.

## Contested / evolving

- Gungraun and cargo-semver-checks both churn by minor version; re-check at the next refresh.
- hyperfine 2.0.0 is days old at the window end (2026-10-07) and its JSON schema changed; downstream scripts may lag.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://nexte.st/changelog/ | nextest changelog, first 100000 characters read (0.9.141 to 0.9.152) | 2026-08-04 to 2026-11-13 | primary |
| https://nexte.st/docs/running/ | nextest doctest note | current | primary |
| https://raw.githubusercontent.com/taiki-e/cargo-llvm-cov/main/CHANGELOG.md | llvm-cov changelog | to 2026-11-20 | primary |
| https://raw.githubusercontent.com/taiki-e/cargo-llvm-cov/main/README.md | `--branch`, `--fail-under-lines` | current | primary |
| https://raw.githubusercontent.com/xd009642/tarpaulin/develop/CHANGELOG.md | tarpaulin changelog | to 2026-11-05 | primary |
| https://raw.githubusercontent.com/xd009642/tarpaulin/develop/README.md | platform support | current | primary |
| https://raw.githubusercontent.com/sourcefrog/cargo-mutants/main/NEWS.md | mutants news | to 2026-06-02 | primary |
| https://raw.githubusercontent.com/taiki-e/cargo-hack/main/CHANGELOG.md | hack changelog | to 2026-11-01 | primary |
| https://github.com/obi1kenobi/cargo-semver-checks/releases | semver-checks releases, first 100000 characters read | to 2026-10-03 | primary |
| https://raw.githubusercontent.com/proptest-rs/proptest/main/proptest-state-machine/CHANGELOG.md | state-machine changelog | 0.9.0 | primary |
| https://raw.githubusercontent.com/assert-rs/assert_cmd/master/CHANGELOG.md | assert_cmd changelog | to 2026-05-11 | primary |
| https://github.com/sharkdp/hyperfine/releases/tag/v2.0.0 | hyperfine 2.0.0 notes | 2026-10-07 | primary |
| https://raw.githubusercontent.com/sharkdp/hyperfine/v2.0.0/README.md | hyperfine 2.0.0 README | 2026-10-07 | primary |
| https://github.com/gungraun/gungraun/releases/tag/v0.20.0 | gungraun release | 2026-09-26 | primary |
| https://raw.githubusercontent.com/gungraun/gungraun/main/CHANGELOG.md | gungraun changelog | to 2026-09-26 | primary |
| https://raw.githubusercontent.com/bheisler/criterion.rs/master/CHANGELOG.md | criterion changelog | to 2025-07-25 | primary |
| https://github.com/RazrFalcon/cargo-bloat | cargo-bloat README | current | primary |
| https://codspeed.io/blog/benchmarks-in-ci-without-noise | CodSpeed figures | 2025-07-30 | primary |
| https://github.com/orium/cargo-rdme/releases | cargo-rdme releases | 2026-08-05 to 2026-09-20 | primary |
| https://crates.io/api/v1/crates/{proptest, proptest-state-machine, rsfs, hyperfine, criterion, divan, cargo-bloat, trycmd, cargo-rdme, cargo-fuzz, cargo-llvm-lines, cargo-mutants, mockall, fail, cargo-tarpaulin, assert_cmd} | release dates | to 2026-11-05 | version and date evidence |

Not fetched or not readable: cargo-fuzz and mockall and fail changelog bodies (dates only, from crates.io and the cargo-fuzz releases page), cargo-semver-checks CHANGELOG.md (404), cargo-rdme CHANGELOG.md (404), proptest CHANGELOG (undated), the final 88813 characters of the nextest changelog (older releases), BOLT and size-limit sources, divan changelog.
