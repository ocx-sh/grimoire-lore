---
title: Testing and Verification Strategy for the OCX/Grimoire Rust CLIs
topic: rust-testing
model: opus
consolidates:
  - rust-testing/test-strategy-and-cli-testing.md
  - rust-testing/property-fuzz-and-formal.md
  - rust-testing/filesystem-seam-strategy.md
  - rust-testing/cargo-features-and-test-seams.md
date: "2026-08"
revised: "2026-08"
---

## Verdict

1. **The test pyramid here is inverted on purpose and that is fine.** Both codebases are
   ~99% inline `#[cfg(test)]` unit tests (ocx 354 blocks, grimoire 207, grimoire has no
   `tests/` directory at all — `crate-architecture.md:271-276`). We keep that as the bulk,
   but every user-visible CLI contract — exit code, stderr wording, file written — gets a
   `tests/`-level black-box test, because none of that is reachable from a unit test.
2. **Revised — the filesystem seam question is settled, and the answer is "do not build one."**
   This item previously read "the single largest real gap is missing seams" and pointed at
   `load_logo`, `validate_symlinks_in_dir`, `write_shims`, `build_client` doing raw
   `std::fs`/`reqwest` in free functions (`crate-architecture.md:224-230`). The follow-up round
   overturns that for the *filesystem*: none of cargo, rustup, sccache, jj or uv puts a
   `FileSystem` trait between its logic and `std::fs` — all test against a real temp directory
   (`filesystem-seam-strategy.md` §5) — and an in-memory fake structurally cannot produce `EXDEV`,
   `ENOSPC`, real permission denial, symlink-escape races, case folding, or Windows file locking
   (§1). uv-fs, the closest analogue to ocx/grimoire, has no trait at all. The seam bar stays what
   `OciTransport`/`OciAccess`/`CredentialStore` already set — *a second production
   implementation* (`crate-architecture.md:242-252`) — and the three filesystem free functions do
   not clear it; `build_client` still does, because HTTP already has one. What replaces the seam:
   real `TempDir` (TEST-06), a sans-I/O split of decide-from-write (TEST-31),
   `cap_std::fs::Dir` where the path comes from an attacker (TEST-28), and `fail::fail_point!`
   where the failure mode is durability (TEST-32) — never a `FileSystem` trait (TEST-27).
3. **Revised — four test crates, plus two non-test additions the follow-up round forced.**
   Unchanged: `rstest`, `assert_cmd`+`predicates`, `wiremock`, `proptest`. Added: `cap-std` as a
   *production* dependency — a path-traversal control whose test-sandbox value is a side effect
   (`filesystem-seam-strategy.md` §6) — and `cargo-hack` as a CI tool, not a dependency. `fail` is
   CONSIDER-tier, scoped to durability paths (TEST-32). Still rejected: `insta`, `trycmd`,
   `serial_test`, `quickcheck`, `loom`/`shuttle`/`turmoil`/`madsim`, and now also `rsfs`
   (unmaintained since 2017, error injection removed), `vfs`, `mockall`, `faux`, and `httpmock`
   (`wiremock` is already the chosen HTTP mock; two is one too many). Snapshot testing is deferred
   until there is output too large to assert on; `serial_test` is unnecessary because the correct
   answer to env vars is not to mutate them.
4. **Conflict resolved — matklad's "Neural Network Test" vs ocx's structural guards.**
   matklad's heuristic ([how-to-test](https://matklad.github.io/2021/05/31/how-to-test.html))
   would reject source-text assertions outright; ocx has ~75 lines of hard-won rules for
   writing them (`rules-inventory.md:269-301`). Both are right at different altitudes: a
   behavioral seam is *always* tried first; a structural guard is legal only when the
   property is the *absence* of behavior with nothing to call. Ordering is normative
   (TEST-11).
5. **Conflict resolved — retries.** grimoire's CI profile sets `retries = 2`
   (`grimoire/.config/nextest.toml:14`); ocx sets none. A retried-green suite is exactly
   what an autonomous agent must not be handed. Retries stay, but a flaky result is a
   failing state that must be fixed, not a passing one (TEST-20).
6. **Conflict resolved — fuzz on every PR.** The property/fuzz sub-artifact endorses a
   60-300s per-target smoke run per PR; the strategy sub-artifact wants a fast default loop.
   Decision: fuzz targets **build** on every PR, **run** nightly only. A 5-minute
   coverage-guided run finds nothing and costs 5 minutes on every push.
7. **Coverage is a ratchet, not a target.** `cargo-llvm-cov` is already wired
   (`ocx/taskfiles/coverage.taskfile.yml:21-23`) but enforces nothing. We gate on
   "not lower than the last merged value", never on an aspirational 80%.
8. **Miri is nightly-only and probably never fires.** grimoire sets
   `unsafe_code = "forbid"` (`grimoire/Cargo.toml:123`) and Miri cannot execute the
   network/FS paths that dominate both codebases. Keep it scoped to the pure parser/resolver
   slice on a schedule; do not make it a PR gate.
9. **`cargo-semver-checks` is out of scope.** Neither `ocx_lib` nor `grimoire` is published
   to crates.io; the tool gates a boundary we do not have. `#[non_exhaustive]` discipline
   still applies to anything that ever gets published (TEST-21).
10. **Conflict resolved — `cfg(test)` is not a seam mechanism.** `cfg(test)` is set by `rustc
    --test` on one compilation unit, so a `tests/*.rs` binary and every sibling crate link the
    library as a plain rlib and cannot see the item (`cargo-features-and-test-seams.md` §1). The
    fix is a real Cargo feature, never a widened `pub` — and the feature edge must be a
    `[dev-dependencies]` edge, because that is the one case resolver v2/v3 protects and a
    `[dependencies]` edge is graph-wide unification in every resolver version (§3). ocx violates
    this today: `ocx_cli` forwards `__testing = ["ocx_lib/__testing"]` across a *normal*
    dependency (`ocx/crates/ocx_cli/Cargo.toml:21-24,38-39`), so the escape hatch is one
    `--all-features` away from a shipped binary despite the comment forbidding it
    (TEST-34, TEST-35, TEST-37).
11. **Test tiering is declarative or it does not exist.** `required-features` on the target plus
    nextest filtersets/test-groups; a `std::env::var(...).is_ok()` early-return is invisible to
    `cargo test --list` and to every selector, so it is not a tier (TEST-38). This settles the
    *mechanism* half of the suite-speed question; the measurement half is still open.
12. **`--all-features` is not thoroughness.** It is the one configuration that forces every
    mutually exclusive feature pairing in the graph on at once, and on ocx it is also the switch
    that enables `__testing`. `cargo-hack --each-feature` plus a pruned powerset replaces it
    (TEST-37).

## The ruleset

### Structure and placement

**TEST-01 — MUST.** Put implementation-detail assertions in an inline `#[cfg(test)] mod tests`
and public-contract assertions in `tests/`; never widen an item's visibility so an integration
test can reach it.
*Rationale:* a test that needs `pub(crate)` added is a unit test wearing the wrong hat, and the
widening outlives the test ([Rust Book §11.3](https://doc.rust-lang.org/book/ch11-03-test-organization.html)).
*Verify:* `git diff` adding `pub(crate)`/`pub` in the same commit as a new `tests/*.rs` file.

**TEST-02 — MUST.** Shared integration-test helpers live at `tests/<name>/mod.rs`, never
`tests/<name>.rs`.
*Rationale:* a bare `tests/common.rs` is compiled as its own test binary and reports a spurious
"running 0 tests" ([Rust Book §11.3](https://doc.rust-lang.org/book/ch11-03-test-organization.html)).
*Verify:* `find */tests -maxdepth 1 -name '*.rs' -exec grep -L '#\[test\]\|#\[tokio::test\]' {} +`
must be empty.

**TEST-03 — MUST.** Test-only methods go in a dedicated `#[cfg(test)] impl Foo { }` block placed
before `mod tests`, or behind a `__testing` feature — never as scattered `#[cfg(test)]`
attributes inside the production `impl`. Choosing the feature form binds TEST-34 and TEST-35:
`cfg(test)` alone cannot reach another compilation unit, and the feature edge that turns it on
must be a `[dev-dependencies]` edge.
*Rationale:* keeps the production surface readable and makes test scaffolding an explicit,
reviewable block (`rules-inventory.md:264-268`; precedent `ocx/crates/ocx_lib/Cargo.toml:26`).
*Verify:* `grep -n -B1 '#\[cfg(test)\]' src/**/*.rs | grep -A1 'fn '` — a `#[cfg(test)]`
directly on an `fn` inside a non-test `impl` is the violation.

**TEST-04 — SHOULD.** Three or more variations of the same assertion use `#[rstest]`
`#[case(...)]`, not a `for` loop over an array inside one `#[test]`.
*Rationale:* a loop aborts at the first failure, hides the remaining cases, and reports one
opaque name in nextest/JUnit ([rstest](https://docs.rs/rstest/latest/rstest/)).
*Verify:* `grep -rn 'for .* in \[' src/ | wc -l` inside `#[cfg(test)]` regions — 36 such
constructs exist in `grimoire/src` today.

### Determinism

**TEST-05 — MUST.** No test calls `std::env::set_var`/`remove_var`. Code under test takes its
configuration as a parameter; a test that must vary the environment does so via
`Command::env()` on a child process.
*Rationale:* env mutation is `unsafe fn` because concurrent env access is an OS-unprotected data
race, and the stdlib itself reads the environment ([std::env::set_var](https://doc.rust-lang.org/std/env/fn.set_var.html)).
*Verify:* `grep -rn 'env::set_var\|env::remove_var' src/ tests/` must return zero call sites
(comments explaining the ban are fine).

**TEST-06 — MUST.** A real filesystem under a per-test `tempfile::TempDir` (or `assert_fs`) is
*the* strategy for filesystem-touching tests, not a fallback (TEST-27). Every such test creates
its own `TempDir`, binds it to a `let`, and passes `&dir`/`dir.path()` — never a fixed path, never
the inline `tempfile::tempdir()?.path()` form.
*Rationale:* the inline form drops the guard (deleting the directory) before the callee runs;
fixed paths race across parallel tests ([tempfile](https://docs.rs/tempfile/latest/tempfile/)).
Real disk is also the only strategy in `filesystem-seam-strategy.md` §1's table that can exercise
`EXDEV`, `ENOSPC`, permission denial, symlink-escape races, or Windows file locking at all.
*Verify:* `grep -rn 'tempdir()[?.]*\.\(unwrap()\)\?\.path()' src/ tests/` must be empty; so must
`grep -rn '"/tmp/\|"\./scratch' src/ tests/`.

**TEST-07 — MUST.** No test in the default profile opens a socket. Registry/HTTP behavior is
tested against `wiremock` on a local random port, or against captured production bytes committed
with provenance; anything needing the real network is `#[ignore = "network"]`.
*Rationale:* a package manager's suite must not depend on `ghcr.io` uptime or rate limits
([wiremock](https://docs.rs/wiremock/latest/wiremock/)); ocx already models the fixture form
correctly (`ocx/crates/ocx_lib/tests/live_index_wire.rs:12-21`, with a `PROVENANCE.md`).
*Verify:* run the default test job with egress blocked; `grep -rn 'reqwest::\|Client::new' tests/`
should only appear behind a mock server URI.

**TEST-08 — MUST.** Never assert a path equality against a POSIX-absolute literal, and
canonicalize both sides (via `dunce::canonicalize`) before comparing; always pair a
`!contains(path)` assertion with a positive assertion on a known-present canonical path.
*Rationale:* `/tmp` is a symlink on macOS, `std::fs::canonicalize` returns `\\?\`-verbatim paths
on Windows, and `base.join("/root/bin")` yields `C:/root/bin` — so a green negative assertion
proves nothing (`rules-inventory.md:303-325`).
*Verify:* `grep -rn 'assert.*"/[a-z]' src/ tests/` — every hit is a candidate violation.

**TEST-09 — MUST.** Sort any `HashMap`/`HashSet`-derived sequence before asserting on its order,
and never assert on a wall-clock instant — inject a clock or assert a range/ordering.
*Rationale:* Rust's default hasher is randomized per process, so iteration order is
nondeterministic by construction (`test-strategy-and-cli-testing.md` §7).
*Verify:* `grep -rn 'assert_eq!(.*\.iter()\.collect' src/` for unsorted collection asserts.

### CLI contract

**TEST-10 — MUST.** Every exit code the CLI can produce, and every stderr message a user is
expected to act on, has an `assert_cmd` test asserting `.code(n)` and the stream contents
*separately*.
*Rationale:* exit codes are a wire contract for scripts; asserting on combined output cannot tell
a code change from a wording change ([assert_cmd](https://github.com/assert-rs/assert_cmd)).
*Verify:* one test per `ExitCode` enum variant; `grep -c 'fn ' tests/exit_codes.rs` vs the variant
count in the exit-code enum.

### Test quality

**TEST-11 — MUST.** Extract a behavioral seam first. A source-text ("structural") guard is
permitted only when the property under test is the *absence* of behavior with nothing to call —
and then it must strip comments before scanning, assert its needle matches at least once, scan
each call site rather than comparing counts, and be scoped to where the defect can actually
occur, not to the function whose name matches the contract.
*Rationale:* five documented, non-hypothetical ways these guards silently pass
(`rules-inventory.md:269-301`); a guard that matches nothing still reports green. Reference
implementation: `script::dependency_hygiene_tests::anyhow_is_dev_dependency_only`
(`ocx/crates/ocx_lib/Cargo.toml:121-128`).
*Verify:* `grep -rn 'include_str!\|file!()' src/ | grep -i test` — every hit must show a non-zero
match-count assertion.

**TEST-12 — MUST.** Before claiming a check works, demonstrate it red on a controlled input; a
mutation that fails to turn it red means another guard exists, not that the check is weak.
*Rationale:* "Unchecked Green" — a check that never ran and a check that passed are
indistinguishable (`rules-inventory.md:759-776`). Stating "verified" without citing the red run is
Block-tier.
*Verify:* the PR body or commit message cites the failing invocation, not just the passing one.

**TEST-13 — SHOULD.** Do not write a test whose only failure mode is "someone refactored the
internals": if swapping the implementation for a different one with identical observable behavior
would break the test, it is testing implementation.
*Rationale:* matklad's Neural Network Test — the sharpest available heuristic for a codebase whose
stated pain point is free functions in a monolith
([how-to-test](https://matklad.github.io/2021/05/31/how-to-test.html)).
*Verify:* reviewer heuristic; a test naming a private helper in its own name is the tell.

### Property and deeper verification

**TEST-14 — MUST.** Use `proptest`, never `quickcheck`, for new property tests.
*Rationale:* composable `Strategy` values instead of one generator per type, finer shrinking, and
it is what the ecosystem uses (~14.9M downloads/mo vs 3.1M)
([vs-quickcheck](https://proptest-rs.github.io/proptest/proptest/vs-quickcheck.html)).
*Verify:* `grep -rn quickcheck **/Cargo.toml` must be empty.

**TEST-15 — MUST.** Every parser/serializer pair — manifest, lockfile, OCI reference
(`registry/repo:tag@digest`), version requirement, digest encoding, path normalization — has a
round-trip property generating the *structured* value and asserting `parse(x.to_string()) == x`.
*Rationale:* round-tripping through the value type is the highest-signal property and does not
require reimplementing the parser in the test
([getting-started](https://proptest-rs.github.io/proptest/proptest/getting-started.html)).
*Verify:* for each `impl FromStr` + `impl Display` pair, a `proptest!` block naming the type.

**TEST-16 — MUST.** Commit `proptest-regressions/*.txt`; never gitignore that directory.
*Rationale:* it is the only record of the minimized failing case, and without it a bug found once
silently stops being tested for ([proptest README](https://github.com/proptest-rs/proptest/blob/main/proptest/README.md)).
*Verify:* `git check-ignore -v proptest-regressions` must exit non-zero.

**TEST-17 — SHOULD.** Any subsystem with read-modify-write state across calls — lockfile writer,
install/uninstall sequences, cache eviction — gets a `proptest-state-machine` test before it gets
more single-shot unit tests.
*Rationale:* sequential unit tests cannot discover order-dependent corruption; state-machine tests
generate and shrink whole transition sequences
([state-machine](https://proptest-rs.github.io/proptest/proptest/state-machine.html)).
*Verify:* reviewer heuristic — a module doing multi-step on-disk mutation with no
`prop_state_machine!` anywhere in the crate.

**TEST-18 — SHOULD.** Hand-rolled binary/text format parsers (archive/tar headers, OCI manifest
JSON, reference strings) get a `cargo-fuzz` target whose `fuzz_target!` argument is a
`#[derive(Arbitrary)]` struct, not `&[u8]`. Targets **build** on every PR and **run** for hours on
a nightly schedule against a persisted corpus.
*Rationale:* byte-soup input is rejected at the first validity check and never reaches the parser;
the rust-fuzz book's own 300s CI example is framed as a build smoke test, not a bug-finding budget
([structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html),
[CI chapter](https://rust-fuzz.github.io/book/cargo-fuzz/ci.html)).
*Verify:* `cargo fuzz build` in the PR workflow; `grep max_total_time` present only in the
scheduled workflow.

**TEST-19 — MUST.** Every bug found by a fuzzer or a property test also gets a plain `#[test]`
with the minimized input hardcoded.
*Rationale:* fuzz and property infrastructure can be skipped by a fast profile or deleted by a
refactor; a literal unit test survives that churn
(`property-fuzz-and-formal.md` normative candidate 12).
*Verify:* every entry in `proptest-regressions/` and `fuzz/corpus/` that maps to a fixed bug has a
matching named `#[test]`.

**TEST-20 — CONSIDER.** Run `cargo mutants --in-diff` on the PR diff and an unscoped pass nightly.
*Rationale:* mutation testing catches the gap coverage cannot see — a test asserting `Ok(_)` came
back but never asserting the file was written ([vs-coverage](https://mutants.rs/vs-coverage.html));
full-repo runs rerun the whole suite per mutant and are too slow per PR
([in-diff](https://mutants.rs/in-diff.html)).
*Verify:* `--in-diff` present in the PR job, absent in the scheduled job.

**TEST-21 — CONSIDER.** Run `cargo miri test` on a schedule, scoped with `-p`/`--lib` to the
parser/resolver slice only — never at the workspace root, never as a PR gate.
*Rationale:* Miri cannot execute FFI, networking, or most filesystem syscalls, and is 10-100x
slower ([miri](https://github.com/rust-lang/miri/),
[Microsoft Rust Engineering](https://microsoft.github.io/RustTraining/engineering-book/ch05-miri-valgrind-and-sanitizers-verifying-u.html)).
*Verify:* the Miri step names a crate/target; a bare `cargo miri test` at workspace root is the
violation.

### Tooling and CI

**TEST-22 — MUST.** CI runs `cargo nextest run --profile ci` **and** a separate
`cargo test --doc` step. Neither substitutes for the other.
*Rationale:* nextest does not execute doc tests at all, so a nextest-only pipeline silently stops
verifying every documented example ([nexte.st](https://nexte.st/docs/running/)).
*Verify:* `grep -rn 'cargo test.*--doc' .github/ taskfiles/` must have a hit alongside every
`cargo nextest run`.

**TEST-23 — MUST.** A flaky result is a failing state. Retries may exist in the CI profile, but a
test reported flaky blocks the merge until fixed or explicitly quarantined with a tracking issue —
"retried and eventually green" is not green.
*Rationale:* nextest reports flakes distinctly (`<flakyFailure>` in JUnit) precisely so they are
not mistaken for passes ([retries](https://github.com/nextest-rs/nextest/blob/main/site/src/docs/features/retries.md));
an autonomous agent handed a retried-green suite never sees the bug.
*Verify:* CI parses `target/nextest/ci/junit.xml` for `flakyFailure` and fails on a non-zero count.

**TEST-24 — MUST.** Coverage is measured with `cargo llvm-cov`, never `cargo-tarpaulin`, and CI
enforces a ratchet: the line-coverage number may not fall below the last merged value.
*Rationale:* tarpaulin's ptrace instrumentation is Linux-x86_64-only and cannot cover the
macOS/Windows targets these binaries ship for; an unenforced number silently erodes, and a fixed
aspirational floor gets gamed ([cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov)).
Report line/region coverage only — `--branch` is still unstable upstream.
*Verify:* `grep -rn tarpaulin .github/ taskfiles/ **/Cargo.toml` empty;
`grep -rn 'fail-under-lines' .github/ taskfiles/` present.

**TEST-25 — MUST.** Do not add `loom`, `shuttle`, `turmoil`, or `madsim` without a filed bug
describing a concrete race or ordering failure the tool would have caught.
*Rationale:* each costs an instrumented parallel build or a whole-runtime swap, and none is useful
against correct use of `tokio::sync` primitives — their target is hand-written lock-free code,
which neither codebase has ([loom](https://github.com/tokio-rs/loom),
[shuttle](https://github.com/awslabs/shuttle)).
*Verify:* `grep -rn 'loom\|shuttle\|turmoil\|madsim' **/Cargo.toml` must be empty or cite an issue.

**TEST-26 — SHOULD.** Any crate that is actually published marks new public structs/enums
`#[non_exhaustive]` at first publish and gates the release on `cargo semver-checks`; a clean
semver-checks run is *not* proof no breaking change occurred.
*Rationale:* retrofitting `#[non_exhaustive]` is itself breaking, and the tool's own maintainers
state it does not yet catch generic/lifetime/inference breakage — the
[Cargo Book SemVer page](https://doc.rust-lang.org/cargo/reference/semver.html) is the authority
([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)).
*Verify:* only applies where `publish = false` is absent from `Cargo.toml`.

### Filesystem strategy

**TEST-27 — MUST NOT.** Do not introduce a `FileSystem`/`Vfs` trait to make filesystem code
testable. A new trait seam is justified only by a *second production implementation* — the bar
`OciTransport`/`CredentialStore`/`ArtifactMaterializer` already meet.
*Rationale:* cargo, rustup, sccache, jj and uv all test against real temp directories and none
abstracts `std::fs`; uv-fs — free functions over `std::fs`/`tokio::fs` with Windows retry loops —
is the closest analogue to this codebase's 2,570 call sites, and threading `F: FileSystem` through
free functions is the function-colouring problem applied to I/O
(`filesystem-seam-strategy.md` §2, §5;
[uv-fs](https://github.com/astral-sh/uv/blob/main/crates/uv-fs/src/lib.rs)).
*Verify:* `grep -rn 'trait .*FileSystem\|trait .*Vfs' --include=*.rs` must be empty; any hit must
name its second production implementor in the same PR.

**TEST-28 — MUST.** Any path derived from attacker-controlled data — OCI layer paths, tar entry
names, manifest-supplied filenames — is opened through a `cap_std::fs::Dir` scoped to the
destination root, never `std::fs` on a string-joined `Path`.
*Rationale:* `Dir::open` requires already holding the enclosing directory capability, so `../` and
symlink escapes return `PermissionDenied` instead of leaving the root — a CWE-22 control for an
unpacker of untrusted artifacts, enforced at open time rather than by a check-then-use
canonicalization with a TOCTOU window
([cap-std](https://github.com/bytecodealliance/cap-std); `filesystem-seam-strategy.md` §1, §6).
*Verify:* in the materializer/cache-write modules, every `Path::join`/`File::open` fed from a
manifest or tar entry is a violation; `cargo tree -i cap-std` confirms adoption.

**TEST-29 — MUST.** Every `fs::rename`/`tokio::fs::rename` that moves an artifact into place has
either a documented same-filesystem invariant or an `ErrorKind::CrossesDevices` fallback
(copy + fsync + delete), and that fallback is tested across two real mounts, not against a canned
`Err`.
*Rationale:* `std::fs::rename` "will not work if the new name is on a different mount point", with
Windows/Unix divergence layered on top
([std::fs::rename](https://doc.rust-lang.org/std/fs/fn.rename.html)); a cache directory on a
different device from `$TMPDIR` is the ordinary case, and no fake can produce `EXDEV` because a
fake has one device (`filesystem-seam-strategy.md` §1).
*Verify:* `grep -rn 'fs::rename' src/` — each hit shows a fallback branch or an invariant comment.

**TEST-30 — MUST.** A filesystem-touching change is not green until the filesystem test job has
passed on Linux, macOS *and* Windows, with the symlink/junction containment tests actually
executing on Windows rather than compiled out by `#[cfg(unix)]`.
*Rationale:* Windows locked-file rename failure, `MAX_PATH`, junctions-vs-symlinks, and
macOS/Windows case-insensitive collisions are real-OS-only failure modes that no fake and no
Linux-only job can surface (`filesystem-seam-strategy.md` §1).
*Verify:* the filesystem-test job matrix lists `windows-latest` and `macos-latest`;
`grep -rn '#\[cfg(unix)\]' -B5 src/ | grep -i 'escape\|symlink\|junction'` must be empty.

**TEST-31 — SHOULD.** A function must not both decide and touch the disk. Parsing, validation and
policy take already-read bytes or already-listed paths; `std::fs`/`tokio::fs` calls live in thin
I/O-only wrappers.
*Rationale:* this is the only lever with measured effect on suite time — cargo's suite runs ~7
minutes and rust-analyzer's under 30 seconds, and matklad attributes the gap to how much of each is
architected sans-I/O, not to mocking strategy
([how-to-test](https://matklad.github.io/2021/05/31/how-to-test.html);
`filesystem-seam-strategy.md` §3).
*Verify:* reviewer heuristic on touched functions — a body containing both a parse/validate branch
and a `std::fs`/`tokio::fs` call is a split candidate.

**TEST-32 — CONSIDER.** Durability paths (lockfile commit, cache manifest write) that need a
partial-failure test get `fail::fail_point!` behind a `failpoints` Cargo feature, driven by
`FailScenario`/`fail::cfg` — not by a fake filesystem, and not by setting `FAILPOINTS` in-process,
which is `std::env::set_var` and banned by TEST-05.
*Rationale:* `fail` reaches the real call site without a trait indirection and compiles out of
release builds; it is the standard Rust mechanism, from TiKV
([fail-rs](https://github.com/tikv/fail-rs); `filesystem-seam-strategy.md` §4).
*Verify:* `grep -rn 'fail_point!' src/` appears only in persistence/cache-write modules, and
`failpoints` is absent from the shipped binary's resolved feature set.

**TEST-33 — MUST NOT.** Do not add `rsfs`. If an in-memory filesystem is used at all, the test name
or an adjacent comment states that it covers branching logic only, and no PR claims a `MemoryFS`
test covers permissions, fsync, `EXDEV`, or symlink escape.
*Rationale:* `rsfs` has had no release since 2017 and its own docs record that its error-injection
feature was removed; `vfs::MemoryFS` is documented only as "an ephemeral in-memory implementation
(intended for unit tests)" and models no OS error semantics
([lib.rs/rsfs](https://lib.rs/crates/rsfs), [docs.rs/vfs](https://docs.rs/vfs/latest/vfs/)).
*Verify:* `cargo tree -i rsfs` returns nothing; every fake-filesystem test carries the scope
comment.

### Features, seams and fixtures

**TEST-34 — MUST.** A helper that an integration test or a sibling crate must reach is gated
`#[cfg(any(test, feature = "test-util"))]` (or moved to a `-testsupport` crate, TEST-40) — never
`cfg(test)` alone, and never "fixed" by widening the item to `pub`.
*Rationale:* `cfg(test)` is set by `rustc --test` on a single compilation unit; a `tests/*.rs`
binary and every downstream crate link the library as a plain rlib, so the item does not exist for
them ([Rust Reference — conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html);
`cargo-features-and-test-seams.md` §1). Widening is TEST-01's violation with a permanent blast
radius. Reference implementation: libsignal gates a whole `test_support` module and a
`visibility::make(pub)` promotion this way
([libsignal chat.rs](https://github.com/signalapp/libsignal/blob/main/rust/net/src/chat.rs)).
*Verify:* `grep -rn '#\[cfg(test)\]' --include=*.rs src/ | grep -v 'mod tests'` — any hit gating an
item named from `tests/*.rs` or another crate is the violation.

**TEST-35 — MUST.** A `test-util`/`__testing` feature is enabled only through a
`[dev-dependencies]` edge — never `[dependencies]`, in any crate, including feature-forwarding
entries like `__testing = ["ocx_lib/__testing"]` sitting on a normal dependency.
*Rationale:* resolver v2/v3 builds the crate twice so a dev-only feature never reaches the normal
artifact, but that protection exists only for the dev edge; a normal edge is graph-wide unification
in every resolver version ([Cargo Book — Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html);
`cargo-features-and-test-seams.md` §3, §7). The blast radius is not "extra test code": iroh's
`test-utils` feature disables TLS certificate verification entirely
([iroh tls.rs](https://github.com/n0-computer/iroh/blob/main/iroh-relay/src/tls.rs)).
*Verify:* `grep -A3 '^\[dependencies\]' */Cargo.toml | grep -i 'test.util\|__testing\|testsupport'`
must be empty, and `cargo tree -e normal -p <shipped binary>` must not reach the feature.

**TEST-36 — MUST.** A virtual workspace (a `[workspace]` table with no `[package]`) sets
`resolver = "2"` or `"3"` explicitly.
*Rationale:* cargo does not infer the resolver from member `edition` fields for a virtual manifest;
omit the line and the whole workspace silently reverts to v1 feature unification, reopening exactly
the leak TEST-35 depends on being closed
([Cargo Book — Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)).
*Verify:* `grep -A2 '^\[workspace\]' Cargo.toml | grep -q 'resolver = "[23]"'` succeeds at every
virtual-workspace root.

**TEST-37 — MUST NOT.** `--all-features` is not the feature-combination gate. CI runs
`cargo hack check --each-feature` plus a pruned `--feature-powerset`
(`--depth`, `--group-features`, `--exclude-features` for any test-only feature), and any pair of
features known to be mutually exclusive carries a `compile_error!` guard with a CI job asserting
the combination *fails*.
*Rationale:* `--all-features` forces on every mutually exclusive pairing in the graph at once —
wstunnel documents it enabling both `aws-lc-rs` and `ring`, after which "every test going through a
tunnel then panics" ([wstunnel CONTRIBUTING](https://github.com/erebe/wstunnel/blob/main/CONTRIBUTING.md);
[Cargo Book — Features](https://doc.rust-lang.org/cargo/reference/features.html);
[cargo-hack](https://github.com/taiki-e/cargo-hack)). Here it is also the switch that enables
`__testing`.
*Verify:* `grep -rn 'all-features' .github/ taskfiles/` — each hit is removed, or paired with a
comment establishing there is no mutually exclusive pair and no test-only feature in the graph.

**TEST-38 — MUST.** Tier tests declaratively: `required-features` on any `[[test]]`/`[[bin]]`/
`[[example]]` target needing network, a real registry, or another external resource, and nextest
filtersets plus test-groups for selection and shared-resource serialization. A
`std::env::var(...).is_ok()` early-return is not a tier.
*Rationale:* `required-features` makes cargo skip the target rather than compile and fail it
([Cargo Book — cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html)); an
env-var gate is invisible to `cargo test --list` and to every declarative selector
([nextest filtersets](https://nexte.st/docs/filtersets/),
[test groups](https://nexte.st/docs/configuration/test-groups/)).
*Verify:* `cargo nextest list` with no extra features lists no test that immediately errors for
lack of network; no test body contains an env-var tier gate.

**TEST-39 — MUST.** Default to a hand-written fake behind a narrow trait. Reach for `mockall` only
when the trait already exists for a production reason and the fake would be pure boilerplate; never
expose a `#[cfg_attr(test, automock)]` mock to another crate, and never set an expectation on a
static method.
*Rationale:* mockall's static-method expectations are process-global and unsynchronized, which
races under nextest's default per-test parallelism, and generic methods with non-`'static`
parameters plus associated types are documented hard edges
([docs.rs/mockall](https://docs.rs/mockall/latest/mockall/);
`cargo-features-and-test-seams.md` §8). `wiremock` stays at the HTTP edge (TEST-07), never as a
substitute for an in-process fake.
*Verify:* `grep -rn 'automock\|expect_' src/` — any `Mock*` named from `tests/*.rs` must be behind
a feature (TEST-34); any static-method expectation is a finding.

**TEST-40 — SHOULD.** Once a second crate needs the same fixtures or fakes, extract an
`ocx-testsupport` crate consumed only via `[dev-dependencies]`, instead of growing a shared
`test-util` feature. A single-crate workspace (grimoire) keeps the feature.
*Rationale:* a crate that appears in no `[dependencies]` section anywhere is structurally absent
from the shipped graph — certainty, rather than the per-`Cargo.toml` discipline TEST-35 otherwise
demands forever (`cargo-features-and-test-seams.md` §9).
*Verify:* `cargo tree -e normal -p ocx` lists no `-testsupport` crate.

**TEST-41 — MUST.** Locate fixtures and golden files with
`concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/…")`, never a bare relative path, and give
every golden file an explicit regeneration command.
*Rationale:* the cwd-equals-package-root guarantee belongs to `cargo test` as a launcher, not to
the compiled binary — under `cargo nextest run`, direct invocation, or a debugger a relative path
can resolve against the wrong root, and rustdoc runs doctests from the *workspace* root, a third
answer again ([Cargo Book — cargo test](https://doc.rust-lang.org/cargo/commands/cargo-test.html);
`cargo-features-and-test-seams.md` §10). A golden file with no regeneration path silently tests the
wrong thing the first time someone edits it by hand.
*Verify:* `grep -rn '"\./\|"tests/' --include=*.rs src/ tests/ | grep -v CARGO_MANIFEST_DIR` flags
every candidate.

## Applied to OCX

**Already satisfied.**
- `cargo-nextest` with a `ci` profile emitting JUnit is wired in both repos
  (`ocx/.config/nextest.toml`, `grimoire/.config/nextest.toml`), and `fail-fast = false` is set so
  CI surfaces every failure in one pass (TEST-22 half, TEST-23 substrate).
- `cargo-llvm-cov` is already the coverage tool in both; `cargo-tarpaulin` appears nowhere
  (`ocx/taskfiles/coverage.taskfile.yml:21-23`, `grimoire/taskfiles/coverage.taskfile.yml:21`) —
  TEST-24's tool choice is met.
- TEST-05 is satisfied *by design*, not by accident: grimoire forbids `unsafe_code`
  (`grimoire/Cargo.toml:123`), which makes `std::env::set_var` uncallable, and the code was shaped
  around it — `installer.rs:1571` and `path_anchor.rs:38` both document taking env *values* as
  parameters instead of reading the process environment. This is the pattern the rule wants.
- TEST-07's harder half is already exemplary: `ocx/crates/ocx_lib/tests/live_index_wire.rs:12-21`
  tests against captured production bytes under `tests/fixtures/live_index_ocx_sh/` with a
  `PROVENANCE.md`, and its own header explains that two suites each arguing with their own fixture
  is how the catalog envelope drifted.
- TEST-03's seam mechanism exists: `ocx/crates/ocx_lib/Cargo.toml:26` defines `__testing = []`.
- TEST-11's reference implementation exists and is good:
  `script::dependency_hygiene_tests::anyhow_is_dev_dependency_only` locks `anyhow` into
  `[dev-dependencies]` so a runtime `use anyhow` is a compile error
  (`ocx/crates/ocx_lib/Cargo.toml:121-128`).
- TEST-08 and TEST-12 already exist as written rules in ocx's `quality-rust.md`
  (`rules-inventory.md:303-325`, `:759-776`) — this document restates them so they stop being
  ocx-only (grimoire's copy lacks both, `rules-inventory.md:965`).
- TEST-36 is met: ocx's virtual workspace root sets `resolver = "3"` explicitly
  (`ocx/Cargo.toml:2`), which is what makes TEST-35's dev/normal split real. grimoire is a
  single-`[package]` workspace on edition 2024 (`grimoire/Cargo.toml:1-4`), so it inherits v3 and
  the rule does not apply.
- TEST-27 is met by default and must stay that way: no `FileSystem`/`Vfs` trait, no `vfs`, no
  `rsfs`, no `mockall`, no `faux` in either manifest. The follow-up round's conclusion is that
  this is the correct state, not a gap.
- TEST-29's pattern exists but is not universal: `ocx/crates` has 9 `ErrorKind::CrossesDevices`
  mentions against 28 `fs::rename` call sites (grep).
- TEST-41 is partly practised — 15 `CARGO_MANIFEST_DIR` uses in `ocx/crates`, 16 in
  `grimoire/src` — but it is not written down anywhere, so it is convention, not contract.

**Currently violated.**
- **TEST-22.** No `cargo test --doc` step exists anywhere in either repo's workflows or taskfiles
  (grep over `.github/` and `taskfiles/` returns only unrelated hits). Every doc example in both
  codebases is currently unverified.
- **TEST-24.** Coverage runs produce `lcov.info` and HTML and gate on nothing — no
  `--fail-under-lines`, and `--doctests` is not passed
  (`ocx/taskfiles/coverage.taskfile.yml:21-23`).
- **TEST-23.** `grimoire/.config/nextest.toml:14` sets `retries = 2` with no flaky-count gate, so
  an intermittently failing test reports green forever.
- **TEST-04.** 36 `for (...) in [...]` table constructs in `grimoire/src` alone.
- **TEST-10.** grimoire has *no* `tests/` directory at all (`crate-architecture.md:272`) — zero
  black-box CLI tests, despite exit codes being a documented script contract
  (`rules-inventory.md:967`). ocx has 7 integration files, none of which is an exit-code contract
  suite.
- **TEST-14/15/16/17/18/19.** No `proptest`, `arbitrary`, or `fuzz/` directory exists in any
  manifest. The OCI reference parser, semver-range parser, digest encoding, and path
  normalization — all named security-relevant in `rules-inventory.md:800-815` — have no property
  coverage.
- **Untestable free functions — reclassified this round.** `crate-architecture.md:224-230` names
  four free functions doing raw I/O with no seam (`package/description.rs:51`,
  `utility/fs/path.rs:296`, `setup/shims.rs:314`, `grimoire/src/catalog/forge.rs:263`). The
  earlier reading — "extract a seam for each" — is withdrawn (Verdict 2). Only `build_client`
  (`forge.rs:263`) is a seam candidate, because HTTP already has `OciTransport`. The other three
  are TEST-31 work: split the decision out of the I/O and test the decision directly, with the
  residual thin wrapper covered by a `TempDir` test.
- **Windows path safety is asserted but unverified**: `rules-inventory.md:806` records that every
  symlink/junction escape test is `#[cfg(unix)]`, so the Windows containment claim has no red-able
  test — a direct TEST-12 and TEST-30 failure on the most security-sensitive property in the
  codebase.
- **TEST-35/TEST-37 — the sharpest new finding.** `ocx_cli` declares
  `__testing = ["ocx_lib/__testing"]` under `[features]` while depending on `ocx_lib` under
  `[dependencies]` (`ocx/crates/ocx_cli/Cargo.toml:21-24,38-39`). The comment says "NEVER enable in
  release builds" — a comment is the entire enforcement mechanism, and `--all-features` or a
  stray `--features __testing` compiles the escape hatch into the shipped binary. Either move the
  edge to `[dev-dependencies]` or move the helpers to a `-testsupport` crate (TEST-40).
- **TEST-28.** No `cap-std` in either manifest, and grimoire explicitly evaluated and rejected it
  as "overkill" for its anchored-install prefix check in favour of `dunce`
  (`grimoire/Cargo.toml:57-61`). That decision is fine on its own terms — `dunce` solves
  canonicalization and `\\?\` UNC comparison — but it is a *check-then-use* guard with a TOCTOU
  window, and it does not cover the tar/OCI-layer unpack path, which is what TEST-28 is about.
  TEST-28 is unmet and the rejection note does not answer it.
- **TEST-29.** grimoire has 3 `fs::rename` call sites and zero `CrossesDevices` mentions
  (`grimoire/src`, grep); ocx has 28 rename sites against 9 `CrossesDevices` mentions. No test in
  either repo crosses two real mounts.
- **TEST-32.** Zero `fail_point!` occurrences and no `fail` dependency, so no atomic-write or
  lockfile-commit path has a partial-failure test.
- **TEST-38.** Zero `required-features` entries across every manifest in both repos; the
  acceptance tier lives in the Python tree instead (see Open questions).

**Newly committed to.**
Adding `rstest`, `assert_cmd`+`predicates`, `wiremock`, and `proptest` as dev-dependencies;
`cap-std` as a production dependency on the unpack path; a `cargo test --doc` CI step; a coverage
ratchet; a flaky-count gate on the JUnit report; an exit-code contract suite in `tests/`;
round-trip properties on the five parsers named in TEST-15; moving ocx's `__testing` edge off
`[dependencies]`; and a `cargo hack --each-feature` job in place of any `--all-features` gate.
Explicitly *not* adopting: `insta`, `trycmd`, `serial_test`, `quickcheck`, `cargo-semver-checks`,
`loom`, `shuttle`, `turmoil`, `madsim`, OSS-Fuzz, and — added this round — `rsfs`, `vfs`,
`mockall`, `faux`, `httpmock`, and any `FileSystem` trait.
`rules-inventory.md:1039-1045` records that none of this — table-driven, property, snapshot,
fixture organization, naming, mocking, flaky handling — is covered by any existing rule file; this
document is that gap closed.

## AI-agent failure modes

Ranked by how often each bites, most frequent first.

1. **Claiming green without ever seeing red.** The agent writes a guard, sees it pass, and reports
   "verified". A guard scoped to the wrong function, a needle that stopped matching after
   `cargo fmt` rewrapped a line, a `#[cfg(unix)]`-only escape test on a Windows property — all look
   identical to passing (`rules-inventory.md:759-776`, `:280-285`). This is the highest-frequency
   and highest-consequence failure in this codebase specifically, because the security properties
   are exactly the ones with no behavioral seam.
2. **Reaching for a `FileSystem` trait + mock the moment "make this testable" is asked.** It is
   the textbook OOP answer, it makes the diff look thorough, and no comparable Rust project does
   it (`filesystem-seam-strategy.md` "AI-agent angle"). Tell: a new trait whose only two
   implementors are `std::fs`-backed and a test-only fake. The mechanical reject is TEST-27.
3. **`cfg(test)` on a helper another compilation unit needs, then "fixing" the unresolved-item
   error by making it `pub`.** Compiles, ships test-only code, and in the iroh case that code
   disabled TLS verification. The correct fix is a feature (TEST-34), and putting the
   feature-enabling edge in `[dependencies]` — the section an agent defaults to — is the *second*
   half of the same mistake (TEST-35). Both are silent: the build succeeds.
4. **Owned `TempDir` dropped before use.** `Command::new(bin).current_dir(tempfile::tempdir()?.path())`
   compiles, deletes the directory at the end of the statement, and then fails with ENOENT
   intermittently depending on cleanup timing.
5. **Writing the disk-full test against a fake and reporting it done.** `MemoryFS` has no
   error-injection hook (`rsfs` had one and removed it), so a green `ENOSPC` test against a fake is
   fabricated coverage. Same for permissions, fsync, and symlink escape (TEST-33).
6. **`rename()`-into-place with no `EXDEV` fallback.** Requires knowing the cache and `$TMPDIR` can
   be on different mounts — an OS fact invisible in the diff, which is why TEST-29 is a grep and
   not a judgement call.
7. **Reaching for `--all-features` because it sounds maximal**, forcing on every mutually exclusive
   pairing and, here, the `__testing` escape hatch (TEST-37).
8. **Assuming `cargo nextest run` covers doc tests.** The agent writes a CI file with nextest only
   and sometimes adds a comment asserting it runs everything. Both repos currently have this bug.
9. **Hand-rolled `for`-loop test tables.** Reflexive, compiles, and hides every case after the
   first failure behind one opaque test name. 36 instances in `grimoire/src`.
10. **`std::env::set_var` written as a bare call**, or wrapped in a blanket `unsafe {}` to make it
   compile — which satisfies the compiler and does nothing about the data race. In grimoire the
   `forbid(unsafe_code)` lint blocks this; in any crate without it, the agent will do it.
11. **A "property" that reimplements the function under test as its own oracle.**
   `prop_assert_eq!(parse(s), inline_copy_of_parse(s))` can never fail. Watch for an oracle side
   with the same branches in the same order as the code under test.
12. **`tests/common.rs` instead of `tests/common/mod.rs`.** Half-works, adds a phantom zero-test
   binary, and the extra "running 0 tests" line reads as normal.
13. **Fuzz targets taking `&[u8]` with hand-written offset math.** Looks structure-aware, rejects
   almost every input before reaching real parser logic.
14. **Adopting a heavyweight verification tool speculatively** — `loom`, `madsim`, OSS-Fuzz — because
   "concurrent code should be tested this way", with no bug motivating it.
15. **Treating a clean `cargo semver-checks` as proof of no breaking change**, missing auto-trait
    loss, bound tightening, and RPIT lifetime capture, which the tool's own maintainers say it does
    not catch.
16. **Hand-editing `.snap` files** to make a snapshot test pass instead of going through
    `cargo insta review`. Currently inapplicable (no `insta` in either repo) — it becomes live the
    day snapshot testing is adopted, which is one reason it is deferred.
17. **Emitting deprecated `--partition count:m/n`** in CI matrix config; `slice:`/`hash:` are the
    current forms.

## Open questions

- **Human decision — the exit-code contract suite's shape.** ocx names exit code 81 `PolicyBlocked`
  (offline *or* frozen); grimoire names the same slot `OfflineBlocked` (offline only)
  (`rules-inventory.md:967`). A shared contract test cannot assert both. Decide whether the rule
  package parameterizes the variant name or standardizes on ocx's broader framing.
- **Human decision — the coverage ratchet's baseline and enforcement point.** A ratchet needs a
  stored previous value; whether that lives in a committed file, a Codecov gate, or a CI artifact
  is an infra choice, not a research finding.
- **Human decision — Windows CI capacity.** TEST-08, TEST-30 and the symlink/junction containment
  property are unverifiable without a Windows runner actually executing the escape tests.
  Currently every such test is `#[cfg(unix)]` (`rules-inventory.md:806`). The follow-up round
  makes the three-OS matrix normative (TEST-30); it cannot buy the runners.
- **Human decision — where `cap-std` starts and stops.** TEST-28 scopes it to attacker-controlled
  paths on the unpack path. grimoire already rejected `cap-std` as "overkill" for its
  anchored-install prefix check (`grimoire/Cargo.toml:57-61`). Whether that earlier rejection also
  binds the unpack path, or is superseded there, is a call for the owner — the research position
  is that they are different problems (check-then-use vs enforce-at-open).
- **Needs another research round — the Python acceptance-test tree.** Both repos carry a
  substantial Python acceptance suite at `test/` (`crate-architecture.md:275-276`) that was
  explicitly out of scope for the Rust research. Where the Rust/Python boundary should sit — which
  contracts belong in `tests/*.rs` under `assert_cmd` versus in the Python tree, and whether the two
  are currently duplicating or leaving gaps — is unanswered and directly determines how much of
  TEST-10 is new work versus a port.
- **Needs a measurement, not a research round — suite runtime at 561 test blocks.** Narrowed this
  round. The *mechanism* for a fast/slow split is settled (TEST-38: `required-features` plus
  nextest filtersets and test-groups, never env-var gates), and the lever with measured effect is
  sans-I/O architecture, not the mocking strategy (TEST-31; cargo ~7 min vs rust-analyzer <30 s).
  What remains is a number nobody has taken: with ocx at 4,282 `#[test]` fns and grimoire at 2,687
  (`crate-architecture.md:30`), is the default local loop already too slow to run per-edit? Two
  claimed multipliers are explicitly *unsourced* and must not be repeated as fact — a whole-suite
  runtime budget and any tmpfs-vs-disk speedup figure
  (`test-strategy-and-cli-testing.md` and `filesystem-seam-strategy.md` §3, both "Contested").

## Sub-artifacts

- [rust-testing/test-strategy-and-cli-testing.md](rust-testing/test-strategy-and-cli-testing.md) —
  test taxonomy and placement, naming and table-driven conventions, cargo-nextest configuration,
  `assert_cmd`/`trycmd`/`insta` for CLI black-box testing, filesystem and network isolation,
  `cargo-llvm-cov` coverage, and the five Rust-specific sources of flakiness.
- [rust-testing/property-fuzz-and-formal.md](rust-testing/property-fuzz-and-formal.md) —
  the deeper verification tier: proptest vs quickcheck, property patterns and state-machine
  testing, cargo-fuzz with `arbitrary`, Miri's hard limits, cargo-mutants scoping,
  semver/API-stability gating, and why deterministic simulation and concurrency model checking do
  not yet pay for themselves here.
- [rust-testing/filesystem-seam-strategy.md](rust-testing/filesystem-seam-strategy.md) —
  the follow-up round on testing filesystem-heavy code: what a trait fake, an in-memory VFS, a
  `TempDir`, and `cap-std` each can and cannot test; the ergonomics cost of a seam at 1,600+ call
  sites; how cargo, rustup, sccache, jj and uv actually do it; `fail`/libfiu fault injection; and
  deterministic simulation as the frontier alternative.
- [rust-testing/cargo-features-and-test-seams.md](rust-testing/cargo-features-and-test-seams.md) —
  the follow-up round on Cargo features as a seam: why `cfg(test)` cannot cross a compilation unit,
  the `test-util` idiom, the dev-dependency-on-self feature-unification leak and the
  virtual-workspace resolver gotcha, additive-only discipline and the `--all-features` trap, suite
  tiering with nextest, the mocking decision rule, `-testsupport` crates, and fixture location.

## Key sources

| URL | Why |
|---|---|
| [Rust Book §11.3 — Test Organization](https://doc.rust-lang.org/book/ch11-03-test-organization.html) | Canonical unit/integration split and the `tests/common/mod.rs` rule (TEST-01, TEST-02) |
| [std::env::set_var](https://doc.rust-lang.org/std/env/fn.set_var.html) | The exact safety contract that makes env mutation in tests a data race (TEST-05) |
| [nexte.st — Running tests](https://nexte.st/docs/running/) | Process-per-test model and the doc-test gap (TEST-22) |
| [nextest retries docs](https://github.com/nextest-rs/nextest/blob/main/site/src/docs/features/retries.md) | Flaky-vs-failed reporting and the JUnit `<flakyFailure>` element (TEST-23) |
| [assert_cmd](https://github.com/assert-rs/assert_cmd) | `Command::cargo_bin`, separate exit-code and stream assertions (TEST-10) |
| [wiremock](https://docs.rs/wiremock/latest/wiremock/) | Async local HTTP mocking for the OCI client (TEST-07) |
| [tempfile](https://docs.rs/tempfile/latest/tempfile/) | Drop-based cleanup and the owned-guard pitfall (TEST-06) |
| [rstest](https://docs.rs/rstest/latest/rstest/) | `#[case]`/`#[fixture]` table-driven syntax (TEST-04) |
| [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) | Cross-platform coverage, `--doctests`, `--branch` unstable status (TEST-24) |
| [matklad — How to Test](https://matklad.github.io/2021/05/31/how-to-test.html) | The Neural Network Test and keeping I/O off the fast path (TEST-13) |
| [proptest vs quickcheck](https://proptest-rs.github.io/proptest/proptest/vs-quickcheck.html) | Strategy-value vs type-generator distinction (TEST-14) |
| [proptest getting-started](https://proptest-rs.github.io/proptest/proptest/getting-started.html) | Round-trip / format-then-parse / non-crash property patterns (TEST-15) |
| [proptest state-machine](https://proptest-rs.github.io/proptest/proptest/state-machine.html) | Transition-sequence generation and shrink order (TEST-17) |
| [rust-fuzz book — structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html) | `#[derive(Arbitrary)]` targets and corpus Keep/Reject (TEST-18) |
| [mutants.rs — vs coverage](https://mutants.rs/vs-coverage.html) | The concrete gap coverage cannot see (TEST-20) |
| [rust-lang/miri](https://github.com/rust-lang/miri/) | What Miri cannot execute — FFI, networking, most FS (TEST-21) |
| [Cargo Book — SemVer Compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) | The authoritative breaking-change taxonomy (TEST-26) |
| [Cargo Book — Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html) | v1/v2/v3 feature unification, the dev-dependency rule, and the virtual-workspace resolver placement (TEST-35, TEST-36) |
| [Cargo Book — Features](https://doc.rust-lang.org/cargo/reference/features.html) | Additive-only discipline and why mutually exclusive features are broken (TEST-37) |
| [Cargo Book — Cargo Targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html) | `required-features` scope: bin/bench/test/example, never lib (TEST-38) |
| [Rust Reference — Conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html) | The exact `cfg(test)` semantics that make it useless as a cross-crate seam (TEST-34) |
| [cap-std](https://github.com/bytecodealliance/cap-std) | Capability-scoped `Dir` as a CWE-22 control whose test-sandbox value is a side effect (TEST-28) |
| [std::fs::rename](https://doc.rust-lang.org/std/fs/fn.rename.html) | Cross-mount-point failure documented at stdlib level (TEST-29) |
| [uv-fs](https://github.com/astral-sh/uv/blob/main/crates/uv-fs/src/lib.rs) | The closest architectural analogue: free functions, no trait, platform-conditional retries (TEST-27) |
| [tikv/fail-rs](https://github.com/tikv/fail-rs) | `fail_point!` fault injection at real call sites, behind a feature (TEST-32) |
| [erebe/wstunnel CONTRIBUTING](https://github.com/erebe/wstunnel/blob/main/CONTRIBUTING.md) | A documented, real `--all-features` failure from mutually exclusive crypto providers (TEST-37) |
| [n0-computer/iroh tls.rs](https://github.com/n0-computer/iroh/blob/main/iroh-relay/src/tls.rs) | What a leaked test feature costs: certificate verification disabled (TEST-35) |
| [docs.rs — mockall](https://docs.rs/mockall/latest/mockall/) | Process-global static-method expectations and the generics/associated-type limits (TEST-39) |
| [taiki-e/cargo-hack](https://github.com/taiki-e/cargo-hack) | `--each-feature`/`--feature-powerset` with `--depth`/`--group-features` pruning (TEST-37) |

## Revision log

**2026-08 — folded in `filesystem-seam-strategy.md` and `cargo-features-and-test-seams.md`.**
TEST-01 … TEST-26 keep their numbers and their meaning; the two amendments below change wording
inside a rule, not what it requires.

| Change | IDs | Why |
|---|---|---|
| **Added** — filesystem strategy: no `FileSystem` trait; `cap-std` on attacker-controlled paths; `EXDEV` fallback; three-OS matrix; sans-I/O split; `fail` for durability; no `rsfs`/unlabelled fakes | TEST-27 … TEST-33 | `filesystem-seam-strategy.md` answered the round's largest open question. |
| **Added** — features and seams: feature not `cfg(test)` for cross-unit helpers; dev-dependency-only feature edges; explicit virtual-workspace resolver; no `--all-features` gate; declarative tiering; fakes over `mockall`; `-testsupport` crate; `CARGO_MANIFEST_DIR` fixtures | TEST-34 … TEST-41 | `cargo-features-and-test-seams.md`; TEST-35 exposed a live leak in ocx. |
| **Amended** — the feature form of the escape hatch now explicitly binds TEST-34/TEST-35 | TEST-03 | The rule offered `__testing` as an option without saying what turning it on costs; ocx's `ocx_cli` wired exactly that edge through `[dependencies]`. |
| **Amended** — `TempDir` is named as *the* filesystem test strategy, not just a hygiene rule, with the failure modes only real disk can reach | TEST-06 | Follows from TEST-27: with the trait seam rejected, TEST-06 carries the weight the seam would have. |
| **Reversed** — Verdict 2 no longer says "the largest gap is missing seams"; the filesystem seam is rejected outright and the three filesystem free functions are reclassified as TEST-31 work. `build_client` remains a seam candidate. | Verdict 2, "Applied to OCX" | Five comparable projects (cargo, rustup, sccache, jj, uv) contradict the original position, and §1's table shows the fake misses the failure modes that matter here. |
| **Extended** — Verdict 3's crate budget: `cap-std` added as a *production* dependency, `cargo-hack` as a CI tool, `fail` at CONSIDER; `rsfs`, `vfs`, `mockall`, `faux`, `httpmock` added to the reject list | Verdict 3 | The follow-up round forced two additions that are not test crates and five new explicit rejections. |
| **Added** — Verdicts 10-12 (cfg(test) is not a seam; tiering is declarative; `--all-features` is not thoroughness) | Verdict 10-12 | Positions the follow-up round settled. |
| **Closed** — open question "testing filesystem-heavy code without a filesystem" | — | Answered: real `TempDir`, sans-I/O split, `cap-std` at the untrusted boundary, `fail` for durability. Removed from Open questions. |
| **Narrowed** — open question on suite runtime | — | The mechanism half is settled (TEST-31, TEST-38); only the unmeasured number remains, and two claimed multipliers are flagged unsourced. |
| **Opened** — human decision on `cap-std`'s scope | — | grimoire already rejected `cap-std` as "overkill" for a different problem (`grimoire/Cargo.toml:57-61`); whether that binds the unpack path is the owner's call. |
| **Added** — five AI-agent failure modes (FileSystem-trait reflex, `cfg(test)`→`pub` widening plus the wrong `Cargo.toml` section, fabricated `MemoryFS` disk-full coverage, missing `EXDEV` fallback, `--all-features` reflex); list re-ranked | — | Both follow-up artifacts identified these as the default LLM answer, not an occasional slip. |
