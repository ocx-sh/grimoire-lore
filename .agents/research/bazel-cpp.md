---
title: "BZL-CC — rules_cc, hermetic toolchains, strict deps, sanitizers, foreign builds"
topic: bazel-cpp
family: BZL-CC
model: opus
consolidates:
  - bazel-cpp/hermetic-cc-toolchain-choice.md
  - bazel-cpp/layering-check-includes-and-sanitizers.md
  - bazel-cpp/foreign-builds-modules-and-cpp-tooling.md
  - bazel-followups/cpp-modular-toolchain-cost-iwyu-and-sandbox-base.md
  - bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md
  - bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md
  - bazel-followups/macos-windows-sandbox-and-runfiles-parity.md
  - bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
builds_on:
  - bazel-hermeticity-determinism.md (BZL-HERM-07, -08, -09, -13, -24, -25, -26, -27, -28)
  - bazel-starlark-and-build.md (BZL-LARK-10)
  - bazel-architecture-monorepo.md (BZL-ARCH-16, -17, -18, -31)
  - bazel-caching-rbe.md (BZL-CACHE-11)
  - bazel-testing.md (BZL-TEST-24, -25, -27)
grounded_in:
  - bazel-frame.md (body + all seven Corrections blocks; the Measurement wave overrides any earlier inference)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 6/8/18, "The map" § L, "Artifact set decision" › Depth files, "Staged for wave 3" § Group 9)
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/fleet-bazel-readiness.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-CC

**Scope line, carried into the shipped depth file verbatim: this family has no fleet
consumer.** `rules_ocx` — the fleet's only Bazel repository — compiles zero
`cc_binary`/`cc_library`/`cc_toolchain` targets
([`build-contracts-and-ci-posture.md:37`](bazel-audit/build-contracts-and-ci-posture.md)),
and no other fleet repository builds with Bazel at all. Every rule below is grounded on
upstream sources read at a tag or on `main`, on the rulesets' own issue trackers, on the
practitioner corpus, and — for the rows the 2026-09-06 revision touched — on real Bazel
8.7.0/8.8.0/9.2.0 binaries run in scratch workspaces on this host, never on a fleet build.
It ships for shape F: the adopting monorepo and `rules_ocx`'s own users.

## Verdict

1. **There is no default hermetic C++ toolchain, and this project will not invent one.** The
   position is a three-branch tree keyed on the constraint that is actually load-bearing:
   named modules or the newest sanitizer/MSan story → `toolchains_llvm`; cheap
   bring-nothing cross-compilation, absorbing UBSAN-on-by-default → `hermetic_cc_toolchain`;
   exactly one target platform with no community release cadence to track → `rules_cc`'s own
   modular `cc_toolchain()` API, which ships a maintained working example and is a real third
   branch, not a fallback
   ([`bazel-cpp/hermetic-cc-toolchain-choice.md:229-235,198-217`](bazel-cpp/hermetic-cc-toolchain-choice.md)).
   `rules_cc`'s README states outright it "does not yet offer a hermetic toolchain
   distribution" and names four projects while endorsing none
   ([:74-80](bazel-cpp/hermetic-cc-toolchain-choice.md)). Upholds map conflict 6.
   **The third branch's maintenance cost is now measured, and it is two-tiered**: the public
   macros (`cc_toolchain()`, `cc_args()`, `cc_tool_map()`) took **3 optional additions and
   zero renames or removals across 0.1.1 → 0.2.22** (14 months, 21 releases), and the
   maintained example needed exactly two small edits in that span — but `rules_cc`'s
   **built-in** `cc/toolchains/args/*` fragments (ThinLTO, PIC, `layering_check` itself) had
   their `select()` conditions rewritten three times in five weeks at 0.2.19-0.2.22, with no
   release-note line naming an affected label
   ([`bazel-followups/cpp-modular-toolchain-cost-iwyu-and-sandbox-base.md` Q1](bazel-followups/cpp-modular-toolchain-cost-iwyu-and-sandbox-base.md)).
   **BZL-CC-01 is pinned**, and now carries that split.
2. **This file starts where BZL-HERM stops.** `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`
   is settled at [BZL-HERM-07](bazel-hermeticity-determinism.md); "treat the default as
   host-installed and non-hermetic" is [BZL-HERM-24](bazel-hermeticity-determinism.md);
   "confirm the hermetic toolchain actually resolves ahead of it" is
   [BZL-HERM-25](bazel-hermeticity-determinism.md). None is restated as a `BZL-CC` row —
   dive candidate 1 of `hermetic-cc-toolchain-choice.md:245-248` is dropped to a
   cross-reference for exactly that reason. `--incompatible_strict_action_env` (false on all
   8.x, true only from 9.0.0 — confirmed on the real binaries and by an env capture inside a
   sandboxed action) is likewise not re-derived here.
3. **Correction to the map, on primary-source evidence: M-L-06's polarity is backwards, and
   the dive wins.** The map row says an unsandboxed compile "loads transitive module maps
   Bazel never declared, producing a silent false negative"
   ([`bazel-topic-map.md`](bazel-topic-map.md) § L, M-L-06; the wave-3 brief repeats it as
   "`layering_check` **silently stops enforcing anything** once compilation runs
   unsandboxed"). [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592),
   read in full with its ten comments, reports the **opposite**: sandboxed *succeeded*,
   unsandboxed *failed* with a spurious undeclared-inclusion error on unmodified upstream
   Abseil, through the **legacy dotd-based** checker — a different mechanism from
   `-fmodules-strict-decluse` — and it was fixed in **Bazel 7.3.0** (2024-08-12), which both
   live majors clear
   ([`bazel-cpp/layering-check-includes-and-sanitizers.md:158-177`](bazel-cpp/layering-check-includes-and-sanitizers.md)).
   The durable lesson is narrower and permanent: Bazel stages `-fmodule-map-file=` for
   **direct** dependencies only, and Clang silently skips an `extern module` reference it
   cannot resolve — enforcement is a function of the declared graph, not of the execution
   strategy. BZL-CC-14 ships the correction as a claim-accuracy MUST, now with the Windows
   clause from Verdict 15's gap (c).
4. **Correction to the map's Group-9 brief: the compatibility sentence is cross-attributed.**
   The brief asks the dive to pin down `hermetic_cc_toolchain`'s "stated compatibility limited
   to `rules_go`, `rules_rust` and `rules_foreign_cc`"
   ([`bazel-topic-map.md`](bazel-topic-map.md) § "Staged for wave 3" › 9.1), inherited from
   wave-1 scout `bazel-topic-map/language-rulesets-canonical.md` §24. A direct fetch of
   `hermetic_cc_toolchain`'s current README finds no such sentence and no Compatibility
   section at all; the sentence is `toolchains_llvm`'s, verbatim
   ([`bazel-cpp/hermetic-cc-toolchain-choice.md:190-196`](bazel-cpp/hermetic-cc-toolchain-choice.md)).
   The dive wins. **The follow-up round added the mirror-image failure to the same row**: a
   README on `main` can be *ahead* of every release — `toolchains_llvm`'s `main` documents a
   `cpp_modules` feature that no tag and no BCR version carries (Verdict 14). BZL-CC-10 ships
   the general guard against both directions, because the cross-attribution already happened
   once inside this research program and the ahead-of-release read happened once in this
   file's own sub-artifact.
5. **Correction to the map's partition: half of M-L-16 already belongs to `BZL-ARCH`.** The
   "a Starlark transition setting legacy flags is invisible to rules reading `--platforms`"
   half is [BZL-ARCH-17](bazel-architecture-monorepo.md) (MUST, settles M-G-07/M-G-09), with
   [BZL-ARCH-16](bazel-architecture-monorepo.md) and
   [BZL-ARCH-18](bazel-architecture-monorepo.md) covering the `config_setting` and
   `platform_mappings` sides. `BZL-CC` keeps only the C++-toolchain-specific half: the MSVC
   path-absoluteness bug (BZL-CC-29) and the autodetected-toolchain root cause the Windows
   symptoms share (BZL-CC-03).
6. **Correction to the map's Depth-files note: Windows path length is not a `cpp.md` row —
   but its root cause is a C++ one, and its citation moved.** The map assigns "path length in
   `cpp.md`" ([`bazel-topic-map.md`](bazel-topic-map.md) › "No `windows.md`"), while
   [BZL-HERM-27](bazel-hermeticity-determinism.md) already owns the short `--output_user_root`
   mitigation and binds shape A today. Two refinements from the Windows follow-up, folded as
   citations rather than as a new row: the mitigation exists because **the MSVC compiler still
   does not support long paths** (a maintainer comment, not the issue body), and
   [bazelbuild/bazel#11482](https://github.com/bazelbuild/bazel/issues/11482) — the issue
   BZL-HERM-27 cited — resolves as a DLL basename collision, not a symlink-length-to-copy
   defect, so the supporting citation is `bazel.build/configure/windows`, whose own recipe is
   the exact string `startup --output_user_root=C:/tmp`
   ([`bazel-followups/macos-windows-sandbox-and-runfiles-parity.md` Q2](bazel-followups/macos-windows-sandbox-and-runfiles-parity.md)).
   `BZL-CC` cites; no duplicate row.
7. **The fleet's zig arrangement is not an instance of any branch of the tree, and must never
   be read as one.** `rules_ocx`'s `MODULE.bazel` carries zero `bazel_dep` on
   `hermetic_cc_toolchain` or `toolchains_llvm` (verified live, zero matches);
   `.bazelrc.user:2` points the **autodetected** toolchain's compiler probe at a local zig
   wrapper under one developer's `$HOME`, and `.bazelrc.user:3` turns `layering_check` off for
   build and host. It registers no toolchain and resolves nothing ahead of the default — the
   least-hermetic point on the whole tree
   ([`bazel-cpp/hermetic-cc-toolchain-choice.md:320-331`](bazel-cpp/hermetic-cc-toolchain-choice.md);
   [`build-contracts-and-ci-posture.md:64-80,220`](bazel-audit/build-contracts-and-ci-posture.md)).
   Upholds map conflict 6's own last clause. **BZL-CC-02 is pinned.**
8. **`rules_foreign_cc` is a last resort scoped to vendored, upstream-owned C/C++, never a
   first-party build strategy.** Its own docs scope it to software "not fully under your
   control"; `layering_check` is not merely unsupported for its targets but hardcoded into
   `FOREIGN_CC_DISABLED_FEATURES` and force-disabled at the toolchain-flags level, so a
   consuming `cc_library` cannot re-enable it for that edge; and both structural gaps
   (Windows `symlink_to_dir` slowness since 2021, the `layering_check` block since 2024) are
   open with no fix in sight
   ([`bazel-cpp/foreign-builds-modules-and-cpp-tooling.md:142-213,416-428`](bazel-cpp/foreign-builds-modules-and-cpp-tooling.md)).
   **BZL-CC-24 is pinned.** The determinism side of a wrapped build is
   [BZL-HERM-13](bazel-hermeticity-determinism.md)'s, not a new row.
9. **The IDE floor is an `aquery`-based `compile_commands.json` generator plus clangd, and
   freshness is a manual re-run that must be written down.** `aquery` is the only query mode
   that reports the actual compile commands rather than the target graph (~30s cold versus
   ~30m for the `action_listener` predecessor), and the generator ships no watch mode and no
   CI drift check
   ([`bazel-cpp/foreign-builds-modules-and-cpp-tooling.md:275-305,430-442`](bazel-cpp/foreign-builds-modules-and-cpp-tooling.md)).
   The same artifact is the bridge to standalone `include-what-you-use`: `iwyu_tool.py`
   consumes exactly this compilation database, which is the no-aspect path to the IWYU pass
   BZL-CC-11 requires. The BwoB interaction (`--remote_download_regex` for headers and
   sources) is already [BZL-CACHE-11](bazel-caching-rbe.md)'s IDE clause — cited, not
   duplicated.
10. **The sanitizer block is shipped as named configs and the optimization level is a pinned
    choice, because the primary sources genuinely disagree.** `rules_cc`'s own
    `_sanitizer_feature` already bakes in `-fno-omit-frame-pointer` and
    `-fno-sanitize-recover=all`; what it does **not** set is `--strip` or an optimization
    level, which is exactly what the community convention adds. grpc uses `-O0`, google/xls
    uses `-O1 -g`; **this project ships `-O1`** for stack-trace readability and records the
    disagreement rather than hiding it
    ([`bazel-cpp/layering-check-includes-and-sanitizers.md:253-285,335-338`](bazel-cpp/layering-check-includes-and-sanitizers.md)).
    **BZL-CC-18 is pinned on that number.**
11. **Severity discipline: the four symptoms of the autodetected default are argued-class, so
    BZL-CC-03 is SHOULD, not MUST.** Pigweed's account is a practitioner blog, primary only
    for its own history
    ([`bazel-cpp/hermetic-cc-toolchain-choice.md:88-107`](bazel-cpp/hermetic-cc-toolchain-choice.md));
    the *non-hermetic* half is independently normative (rules_cc's README, plus the 70-project
    study behind [BZL-HERM-24](bazel-hermeticity-determinism.md)), but the gcc-over-clang
    preference and the no-structured-API complaint are not. The house standard sends
    argued-only rules to CONSIDER; this one keeps SHOULD because its normative half stands
    alone, and the decision is recorded here rather than buried.
12. **Google's stated intent to remove the default-toolchain concept is dated direction, not
    current behaviour.** The BazelCon 2024 statement is nearly two years old and unexecuted:
    a fresh fetch of `rules_cc`'s README shows the autodetected default and its off-switch
    fully live and unqualified
    ([`bazel-cpp/hermetic-cc-toolchain-choice.md:219-225`](bazel-cpp/hermetic-cc-toolchain-choice.md)).
    Recommend explicit registration as the durable posture; never claim the default is gone.
13. **`--reuse_sandbox_directories` needs a correction against wave 2, and it is small — and
    `--sandbox_base` carries the same rename shape.**
    [BZL-HERM Verdict 13](bazel-hermeticity-determinism.md) dropped
    "`--experimental_reuse_sandbox_directories`" from the standards as "a performance knob
    with no M-ID and no pass/fail reading". Two of the three clauses no longer hold: the flag
    was renamed (the `experimental_` spelling is a silent alias, `oldNameWarning = false`), it
    defaults `true` identically from 8.7.0 through 9.2.0 read from tagged `SandboxOptions.java`,
    it has an M-ID (M-L-18), and it has a pass/fail reading — an explicit `=false` is the
    finding
    ([`bazel-cpp/foreign-builds-modules-and-cpp-tooling.md:363-389`](bazel-cpp/foreign-builds-modules-and-cpp-tooling.md)).
    The *drop* stands for the general case; BZL-CC-30 ships one CONSIDER row scoped to the
    high-input-count C++ shape that produces the cost. **New in this revision**: `--sandbox_base`
    itself carries `oldName = "experimental_sandbox_base"` — visible only in
    `SandboxOptions.java` (8.7.0 and 9.2.0), documented on no CLI reference page, and not
    previously recorded anywhere in this program. `BZL-HERM`'s own 2026-09-06 revision ships
    no `--sandbox_base` row (grep: zero occurrences), so **BZL-CC-31 takes it** rather than
    leaving M-L-17 homeless.
14. **Version boundaries every decision above depends on**, restated after the measurement
    wave. Bazel **8.7.0** (fleet pin), **8.8.0** and **9.0.0-9.2.0**:
    `--experimental_cpp_modules` present with `defaultValue = "false"` and `EXPERIMENTAL`
    metadata at 8.7.0/9.0.0/9.2.0; `--reuse_sandbox_directories` default `true` at all;
    `--sandbox_base` default `""` at all; `--experimental_use_hermetic_linux_sandbox` default
    `false` on 8.7.0/8.8.0/9.2.0 read from the binaries, and it runs on both live majors;
    `module_interfaces` attribute text byte-identical at 8.7.0 and 9.1.0; `hdrs_check`
    "Deprecated, no-op" at both. **Bazel 9.0.0**: `--incompatible_autoload_externally` empty,
    so every `cc_*` needs an explicit `load()` ([BZL-LARK-10](bazel-starlark-and-build.md)) —
    **measured**: a bare `cc_library` on 9.2.0 fails through a *dedicated removed-rule stub*
    (`/virtual_builtins_bzl/bazel/exports.bzl:40`, `_removed_rule_failure`) naming
    `buildifier --lint=fix`, a different and more forgiving error shape than the plain
    `name 'py_library' is not defined` the other four rule families get; adding
    `bazel_dep(name = "rules_cc", version = "0.2.22")` plus
    `load("@rules_cc//cc:defs.bzl", "cc_library")` builds green on **both** majors (the
    per-rule files `cc/cc_library.bzl`, `cc/cc_binary.bzl`, `cc/cc_test.bzl` are equally
    valid). WORKSPACE support code is deleted
    ([BZL-HERM-28](bazel-hermeticity-determinism.md)). **Bazel 7.3.0**: the dotd/cppmap fix.
    Rulesets: `rules_cc` **0.2.22** (2026-07-07, already shipping the
    `cpp20_module_compile`/`cpp20_module_codegen`/`cpp_module_deps_scanning` action types),
    `toolchains_llvm` **1.9.0** (2026-08-29) — **which carries no C++20-named-modules support
    at all**: the feature landed on `main` only, via
    [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) merged **2026-09-02**,
    four days after the tag and four days before this era date, and the BCR still lists 1.9.0
    as newest. The "Bazel 9.2 + LLVM 22" floor therefore describes an **unreleased ref**, not
    anything a normal `bazel_dep` reaches; the wave-3b text that attributed it to 1.9.0 was
    reading `master`. Also: `hermetic_cc_toolchain` **4.3.0** (2026-07-27, README's own example
    still says 3.1.0), `rules_foreign_cc` **0.15.1** (2025-06-24), `rules_fuzzing` **0.8.0**
    (2026-04-16), Hedron's extractor at `main` (`abb61a6`), `bazel_iwyu` **0.0.4**
    (RealtimeRoboticsGroup, first commit 2026-07-03), `rules_lint` **2.9.0** (no IWYU linter),
    `protobuf` **36.1.bcr.1** (BCR module name `protobuf`, apparent repo name
    `com_google_protobuf`; Bazel 9 enforces a graph minimum of 33.4).
15. **Three documented gaps, promoted out of the open-questions table because no further round
    of the same kind closes them.**
    **(a) `layering_check` × `--features=cpp_modules` is unknown, and now for a stated
    reason.** `toolchains_llvm` passed `-Xclang -fno-cxx-modules` *unconditionally* for LLVM
    ≥ 14 precisely because Clang's C++20-modules default "breaks Bazel's `use_module_maps`
    feature, which is used by `layering_check`". PR #843 gates that suppression **off exactly
    when `cpp_modules` is enabled**, and adds no replacement; `rules_cc` 0.2.22's
    `layering_check` fragment targets `compile_actions` while the module machinery uses the
    disjoint `cpp20_module_*` action set, with neither fragment referencing the other; and the
    PR's own tests never combine the two features. The interaction is untested at every
    version that exists. BZL-CC-05 is the guard.
    **(b) `--sandbox_base` performance on a disk-backed default is untested here.** Measured
    on this host it is a null result *because the mandated scratch directory is itself tmpfs* —
    a tmpfs-vs-tmpfs comparison, not the tmpfs-vs-disk one the flag's help text promises a
    win for. Closing it needs an output root on a real block device, outside this program's
    permitted execution locations. BZL-CC-31 states the null result with that caveat.
    **(c) Windows never runs a real sandbox, so the "does `processwrapper-sandbox` reproduce
    the #21592 class" question cannot be measured on any host this program has.** Bazel's
    source carries a fourth strategy, `windows-sandbox` (BuildXL-based), but it is off by
    default (`--experimental_use_windows_sandbox`, a `TriState` defaulting false), needs a
    `BazelSandbox.exe` Bazel does not ship, and appears on no bazel.build page — so a Windows
    leg is always `processwrapper-sandbox` or `local`. The question is also *bounded*: the
    #21592 symptom was a legacy-dotd bug fixed at 7.3.0, which both live majors clear. Say
    "no default, no shipped binary, no docs — but the code path exists", never "Bazel has no
    Windows sandbox code".
16. **The IWYU precondition BZL-CC-11 has always required now has a named Bazel-native path,
    and it is young.** `rules_lint` v2.9.0 ships `clang_tidy.bzl` and `cppcheck.bzl` and **no
    IWYU linter** (directory listing, not a claim). The maintained aspect is
    `RealtimeRoboticsGroup/bazel_iwyu` 0.0.4 — an explicit fork of `storypku/bazel_iwyu`
    (stale since 2024-09-12) that shares the **exact module name**, so
    `bazel_dep(name = "bazel_iwyu", version = "0.0.4")` resolves to the fork per the BCR's own
    metadata. Two months of history and one maintainer is not maturity; the fallback is
    Hedron's compilation database plus standalone `iwyu_tool.py` (Verdict 9). **IWYU and
    `layering_check` share no input**: the aspect reads `CcInfo.compilation_context` and
    `cc_common`'s compile variables and never touches a `.cppmap` or `-fmodule-map-file=`, so
    a clean IWYU report is no evidence about enforcement and vice versa. BZL-CC-11 and -12
    carry both halves.
17. **`protoc` is not built by your C++ toolchain on any current protobuf.** Read from tagged
    protobuf source at four versions: `//bazel/toolchains:prefer_prebuilt_protoc` is a real
    `bool_flag` with `build_setting_default = False` at v33.4; at v34.0 that label becomes an
    `alias` to `//bazel/flags:prefer_prebuilt_protoc`; by v36.1 the default is `True`. Bazel 9
    enforces protobuf ≥ 33.4 as a graph minimum (its own 9.0.0 release notes) and the BCR
    publishes 34.0 through 36.1, so almost every current install resolves *above* the version
    where the default flipped. A repo that says "our hermetic toolchain compiles everything in
    the graph" is wrong about `protoc` specifically — a checksummed download is hermetic, but
    it is not your toolchain's output and carries none of your sysroot or sanitizer features.
    BZL-CC-32 ships the claim-accuracy half. The one-`proto_library`-plus-N-attachments model
    itself is [BZL-ARCH-31](bazel-architecture-monorepo.md)'s; the explicit `load()` for
    `cc_proto_library` is [BZL-LARK-10](bazel-starlark-and-build.md)'s.
18. **C++ coverage has two silent-empty causes and one platform with no path at all.** The
    lcov-format half — raw `.profdata` unless `--experimental_generate_llvm_lcov` (default
    `false` at 8.8.0 and 9.2.0) — is [BZL-TEST-27](bazel-testing.md)'s row and is cited, never
    duplicated. What is C++-specific and unowned elsewhere: `bazel.build/configure/coverage`
    documents the C++ path for **Linux and macOS only**, and states that `GCOV_PREFIX_STRIP`'s
    correct value "depends on your setup" and that with a wrong value "no coverage data will
    be found". Both failures leave the test PASSing and the command exiting 0, which is why
    the gate is [BZL-TEST-25](bazel-testing.md)'s nonzero-`DA:` check. BZL-CC-33.
19. **Still no fleet consumer, restated after the revision.** Nothing in the 2026-09-06 round
    changed that: the two measurement artifacts ran in scratch workspaces against real
    8.7.0/8.8.0/9.2.0 binaries and `rules_ocx` was never modified; no C++ target was compiled
    anywhere in the fleet. The 33 rows below remain vacuously satisfied, which is not the same
    as passing.

## The ruleset

**This topic owns `BZL-CC` exclusively.** 33 rules, 13 MUST. Boundaries: host-toolchain
autodetection, its off-switch and the sandbox/environment taxonomy belong to `BZL-HERM`;
`cc_*` and `proto_library` `load()` coverage on Bazel 9 belongs to `BZL-LARK`; transitions,
`config_setting`, `platform_mappings` and the one-`proto_library`-N-attachments model belong
to `BZL-ARCH`; download modes and remote-cache economics belong to `BZL-CACHE`; coverage
mechanics, the lcov flag and the `DA:`-record gate belong to `BZL-TEST`. Those are cited by ID
below, never restated. `Cargo.toml`, `pyproject.toml` and `package.json` hygiene inside a
Bazel-adopting repo is covered by `rust-cargo`, `python-packaging` and `typescript-packaging`;
C++ has no fleet package-manifest equivalent (no `conanfile.txt`/`vcpkg.json` anywhere).

**Cross-references, not rows** — a `BZL-CC` reviewer needs these and must not get a second
copy: [BZL-HERM-07](bazel-hermeticity-determinism.md) (the one off-switch for autodetection),
[BZL-HERM-08](bazel-hermeticity-determinism.md) (a host-specific `CC=`/`-layering_check`
override is a latent trap with a named activation condition),
[BZL-HERM-13](bazel-hermeticity-determinism.md) (an action shelling into a foreign build is
non-deterministic until an execution-log diff says otherwise — this covers foreign_cc cache
behaviour), [BZL-HERM-24](bazel-hermeticity-determinism.md) and
[-25](bazel-hermeticity-determinism.md) (register a hermetic toolchain; confirm it resolves),
[BZL-HERM-26](bazel-hermeticity-determinism.md) (name the sandbox strategy that actually ran —
on Windows that is always `processwrapper-sandbox` or `local`, so the row is vacuous there
rather than unmet), [BZL-HERM-27](bazel-hermeticity-determinism.md) (short
`--output_user_root` on Windows; the documented recipe is `startup --output_user_root=C:/tmp`
and the root cause is MSVC's own long-path limit — Verdict 6),
[BZL-LARK-10](bazel-starlark-and-build.md) (explicit `load()` for every `cc_*` and
`proto_library` on Bazel 9 — the concrete forms are
`load("@rules_cc//cc:defs.bzl", "cc_library")` or its per-rule siblings
`cc/cc_library.bzl`/`cc_binary.bzl`/`cc_test.bzl`, and
`load("@protobuf//bazel:cc_proto_library.bzl", "cc_proto_library")`; that row also carries the
measured `cc_*`-only removed-rule stub error shape naming `buildifier --lint=fix`),
[BZL-ARCH-16](bazel-architecture-monorepo.md)/[-17](bazel-architecture-monorepo.md)/
[-18](bazel-architecture-monorepo.md) (legacy flags versus `--platforms`),
[BZL-ARCH-31](bazel-architecture-monorepo.md) (one `proto_library`, N language attachments),
[BZL-CACHE-11](bazel-caching-rbe.md) (an IDE-feeding build gets `--remote_download_regex`
naming the consumed paths), [BZL-TEST-24](bazel-testing.md) (`--enable_runfiles` on a Windows
coverage leg, read against the pinned ruleset), [BZL-TEST-25](bazel-testing.md) (gate coverage
on nonzero `DA:` records, never on exit code) and [BZL-TEST-27](bazel-testing.md)
(`--experimental_generate_llvm_lcov` on any clang/LLVM coverage leg).

**Every grep-based verification below is blind to generated-repo content.** BUILD and `.bzl`
text written by a repository rule or module extension into an external repo — including every
`cc_library` a `crates_repository`, `pip.parse` or foreign-build wrapper emits — is not on
disk when the grep runs. A clean grep is a statement about checked-in source only; say so when
reporting.

| ID | Rule | Rationale | Verification (and how EMPTY OUTPUT reads) | Severity | Applies to | Settles | Depends on |
|---|---|---|---|---|---|---|---|
| **BZL-CC-01** | Choose the hermetic C++ toolchain from the three-branch constraint tree — named modules/newest sanitizers → `toolchains_llvm`; cheap cross-compilation, UBSAN-by-default absorbed → `hermetic_cc_toolchain`; exactly one platform, no external cadence → `rules_cc`'s own modular `cc_toolchain()` — record which constraint decided it next to the registration, and on the third branch record whether the toolchain references `rules_cc`'s built-in `cc/toolchains/args/*` fragments by label. **pinned** | No upstream source endorses a default; a pick made because a project was most-starred or first in a training corpus is unreviewable later, and the three cost profiles are mutually exclusive, not ranked. The third branch's cost is now measured and two-tiered: the public macros took 3 optional additions and **zero renames or removals** across 0.1.1→0.2.22 (21 releases, 14 months) and the maintained example needed two small edits — but the built-in argument fragments (ThinLTO, PIC, `layering_check`) had their `select()` conditions rewritten three times in five weeks at 0.2.19-0.2.22 (`@platforms//os:macos` → `//cc/settings:apple_constraint`), with no release-note line naming an affected label. Referencing a fragment by label inherits that churn silently; calling only the public macros does not. | Reading heuristic: does a comment, ADR or PR description adjacent to the `bazel_dep`/`register_toolchains` call name one of the three constraints? No named constraint anywhere = finding. Enumerate candidates with `grep -n 'toolchains_llvm\|hermetic_cc_toolchain\|cc_toolchain(' MODULE.bazel`; EMPTY there in a repo with real `cc_*` targets is [BZL-HERM-24](bazel-hermeticity-determinism.md)'s finding, not this one. On a `rules_cc` version bump, `grep -rn '@rules_cc//cc/toolchains/args' --include='BUILD*' --include='*.bzl' .` and diff those exact fragment paths between the two tags — EMPTY grep (no fragment referenced by label) = the bump needs no fragment review; a non-empty grep with no recorded diff = finding. A release-note keyword search is not a substitute: 85 PR titles across the span, none path-scoped. | SHOULD | Bazel 8/9; rules_cc 0.2.22, toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0; shape F | M-L-01, M-L-02, M-L-05 | BZL-HERM-24, BZL-HERM-25 |
| **BZL-CC-02** | Never present a bare `CC=` or `--repo_env=CC=<path>` override as a hermetic toolchain, or as an instance of adopting `hermetic_cc_toolchain`. **pinned** | It only redirects the *autodetected* toolchain's compiler probe: it registers no `cc_toolchain`, resolves nothing ahead of the default, and carries none of a real toolchain's cross-compilation, sysroot or sanitizer-feature machinery. Conflating the two is the single most likely misreading of a repo that has one. | `grep -n 'repo_env=CC=\|action_env=CC=' .bazelrc*` paired with `grep -n 'bazel_dep(name = "hermetic_cc_toolchain"\|bazel_dep(name = "toolchains_llvm"' MODULE.bazel`. First non-empty + second EMPTY = a probe redirect; document it as such and treat it under [BZL-HERM-08](bazel-hermeticity-determinism.md). EMPTY on the first grep = not applicable. | MUST (claim accuracy) | all majors; shapes A, F | M-L-02 | BZL-HERM-08 |
| **BZL-CC-03** | Treat a build whose resolved graph reaches `@local_config_cc` as running on the autodetected default — non-hermetic, gcc/binutils-preferring, CI-versus-local divergent — and move its C++ flags into a toolchain definition instead of accumulating them in `.bazelrc`. | The autodetected toolchain assumes `host = exec = target`, which is why a native ARM64 Windows build silently emits x64 and a Linux→Windows cross-compile silently mis-resolves; and its only flag surface is the command line or an rc file, with no typed API. (The gcc-preference and no-API symptoms are practitioner-argued, so this row is SHOULD — see Verdict 11.) | `bazel query 'somepath(//your:target, @local_config_cc//...)'` — a **non-empty** result means the autodetected toolchain is in the resolved graph (finding for any repo claiming hermeticity); EMPTY means it is not reachable from that target, which is the pass. Do not read EMPTY from a target that failed to configure as a pass. | SHOULD | Bazel 8/9; rules_cc 0.2.22; shape F | M-L-04, M-L-16 (part) | BZL-HERM-24, BZL-HERM-25 |
| **BZL-CC-04** | Before choosing `toolchains_llvm` for C++20 named modules, confirm two things in order: that the pin is a ref that actually carries the feature — as of 2026-09-06 it exists **only on `main`** ([PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843), merged 2026-09-02), in no tagged release (latest `v1.9.0`, 2026-08-29) and in no BCR version — and that the floor is Bazel **9.2.0+** with an LLVM **22+** distribution containing `bin/clang-scan-deps`. Never infer support from Bazel's own `module_interfaces` attribute existing on an earlier major. | The ruleset states plainly that "Bazel 7 and 8 do not expose the required `cc_library` module API", while `--experimental_cpp_modules` and the `module_interfaces` plumbing demonstrably exist in Bazel's own builtins at 8.7.0 — the missing surface is toolchain-internal, so a grep of Bazel source produces a floor that is wrong in the permissive direction. And the floor sentence itself lives on `main`: `v1.9.0`'s README has no "C++ named modules" section at all and its `cc_toolchain_config.bzl` still passes `-fno-cxx-modules` unconditionally, so a `bazel_dep(name = "toolchains_llvm", version = "1.9.0")` gets **zero** named-modules support. Reading `master` and citing the tag is how this file's own wave-3b text got it wrong. | Read the README **at the tag the repo pins**, not at `main`: `gh api repos/bazel-contrib/toolchains_llvm/releases --jq '.[0].tag_name'`, then fetch that tag's `README.md` and `toolchain/cc_toolchain_config.bzl`. Then `grep -n 'llvm_version\|bazel_dep(name = "toolchains_llvm"\|git_override\|archive_override' MODULE.bazel` — a plain `bazel_dep` on a released version with named modules in use is a finding; only a commit-pinned override can carry the feature today. EMPTY on the grep = named modules not configured, rule not applicable. | MUST | Bazel 9.2+ (7/8 explicitly unsupported by the ruleset); toolchains_llvm **unreleased `main` only** (post-#843) — v1.9.0 and every BCR version lack the feature; shape F | M-L-02, M-L-08 | — |
| **BZL-CC-05** | Wherever `--features=cpp_modules` is enabled, re-verify `layering_check` enforcement on a real target instead of assuming it survived. | Settled mechanism, not mere silence: `toolchains_llvm` passed `-Xclang -fno-cxx-modules` **unconditionally** for LLVM ≥ 14 precisely because Clang's C++20-modules default "breaks Bazel's `use_module_maps` feature, which is used by `layering_check`" — and [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) gates that suppression **off exactly when `cpp_modules` is on**, with no replacement protection. `rules_cc` 0.2.22's `layering_check` fragment targets `compile_actions`; the module machinery uses the disjoint `cpp20_module_compile`/`cpp20_module_codegen`/`cpp_module_deps_scanning` action types; neither references the other, and the PR's own tests never combine the two features. The far side is untested at every version that exists (Verdict 15a). | `grep -rn 'cpp_modules' .bazelrc* --include='BUILD*' --include='*.bzl' .` — any hit requires the BZL-CC-12 `aquery` check re-run on that build **plus** a seeded violation (a target that `#include`s an undeclared header must still fail). EMPTY = feature not in use, not applicable. A green build with `cpp_modules` on and no seeded violation is not evidence of anything. | MUST wherever `cpp_modules` is enabled | Bazel 9.2+; toolchains_llvm `main` post-#843 (no release carries the feature); shape F | M-L-08 | — |
| **BZL-CC-06** | Escape `zig cc`'s UBSAN-on-by-default by setting an optimization level (`-c opt`, or an explicit `--copt=-O2`/`-O3`/`-Os`), never by hunting for a switch that disables UBSAN — none is documented. | `zig cc` infers debug mode, with its safety checks, purely from the *absence* of an optimization flag; this is the Zig project's own stated design, so a program that compiles clean under mainstream clang/gcc can crash with `SIGILL` from the toolchain switch alone, at Bazel's default `-c dbg`. | Reading heuristic: in a repo registering a zig-cc toolchain, does any CI or dev command build at the default compilation mode (no `-c`/`--compilation_mode` in `.bazelrc*` or the workflow)? `grep -n 'compilation_mode\|-c opt\|copt=-O' .bazelrc* .github/workflows/*.yml`; EMPTY = every target builds in debug mode with UBSAN on — a finding when `SIGILL` reports exist, and a latent one otherwise. | MUST wherever `hermetic_cc_toolchain` is registered | all majors; hermetic_cc_toolchain 4.3.0; shape F | M-L-03 | — |
| **BZL-CC-07** | Document `hermetic_cc_toolchain`'s two permanent gaps in the repo's own onboarding, and pin `HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX` rather than relying on `$HOME`: the zig cache lives outside Bazel's output base (`$HOME/.cache/zig`, `%LocalAppData%\zig`) so `bazel clean --expunge` never clears it, and OSX sysroot support is unimplemented (darwin/arm64 cgo named as the casualty). | Both are in the ruleset's own "Known Issues", prefaced as things the maintainers are "unlikely to implement any time soon" — a clean-room rebuild that still resolves stale zig artifacts, and a target platform that looks supported and is not. The README's "each user gets their own cache directory automatically via `$HOME`" needs one measured caveat: **`HOME` is absent from Bazel's action environment** on 8.7.0 and 9.2.0 alike — not empty, genuinely unset, in default and strict mode both (measured for a genrule under `linux-sandbox` on this WSL2 host; not measured for a zig-cc compile action, since no fleet consumer exists). So `$HOME` resolution for the cache happens in the loading phase or inside the launcher's own environment handling, never by inheritance into the action. | `grep -rn 'HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX\|osx.*sysroot\|darwin.*arm64' .bazelrc* docs/ README* CONTRIBUTING*` in a repo using the toolchain. EMPTY = the caveats are undocumented locally and the cache prefix is unpinned — a knowledge gap, not a build failure. To check the action-env half directly: a `genrule` whose `cmd` prints `${HOME:-<unset>}` — `<unset>` is the expected, measured result on both majors, not a finding. | SHOULD | all majors; hermetic_cc_toolchain 4.3.0; shape F; `HOME` result measured on WSL2, both majors | M-L-02 | — |
| **BZL-CC-08** | Cross-compiling with `toolchains_llvm`: confirm the host→target pair is one of the four the ruleset actually tests, and produce the sysroot the documented way — a `docker export` archive or the Chromium sysroot scripts — never by wrapping CMake, `rules_foreign_cc` or a shell script around the step. | The README's own words are "tested to work for some hello-world binaries" for exactly `{linux,x86_64}→{linux,aarch64}`, `{linux,aarch64}→{linux,x86_64}`, `{darwin,x86_64}→{linux,x86_64}` and `{darwin,x86_64}→{linux,aarch64}` — not a general guarantee; and reaching for a familiar build tool to "produce a sysroot" adds an entire second non-hermetic build system to a problem the docs answer in two sentences. | Read the `--platforms=`/`--extra_toolchains=` pair the cross-compile build uses against those four; then `grep -rn 'sysroot' MODULE.bazel BUILD.bazel --include='*.bzl' .` and read how the archive is produced — a `genrule` shelling into `cmake`/`make` is a finding, an `http_archive`/`filegroup` over a `docker export` or Chromium output is the documented path. EMPTY on the sysroot grep = single-platform build, not applicable. | SHOULD | Bazel 8/9; toolchains_llvm 1.9.0; shape F | M-L-02 | — |
| **BZL-CC-09** | Set `cxx_include_layout = "yocto"` and the matching `multiarch` override explicitly whenever a `toolchains_llvm` sysroot is Yocto-built. | The default (`"debian"`) expects `/usr/include/<multiarch>/c++/<ver>` while Yocto ships `/usr/include/c++/<ver>/<multiarch>`; the mismatch does not error, it silently resolves the wrong libstdc++ headers. | `grep -n 'cxx_include_layout\|multiarch' MODULE.bazel` for every `sysroot`-carrying `llvm_toolchain`/`llvm.toolchain`. A Yocto-sourced sysroot (check its build provenance) with no `cxx_include_layout = "yocto"` = finding. EMPTY with no Yocto sysroot in play = not applicable. | MUST wherever a Yocto sysroot is used | Bazel 8/9; toolchains_llvm 1.9.0; shape F | M-L-02 | — |
| **BZL-CC-10** | Re-read the specific project's own README **at the ref the repo actually pins** before repeating any capability, compatibility or version claim about a C++ toolchain — never carry one across from a sibling project, from a README's own code fence, or from `main`. | Four demonstrated instances, in both directions. Stale-behind: the "tested with `rules_go`/`rules_rust`/`rules_foreign_cc`" sentence is `toolchains_llvm`'s and was mis-attributed to `hermetic_cc_toolchain` inside this very research program; `hermetic_cc_toolchain`'s own README example pins `version = "3.1.0"` two majors behind its 4.3.0 release; the BazelCon 2024 statement of intent to remove the default-toolchain concept is still unexecuted, with the autodetected default and its off-switch fully live. Ahead-of-release: `toolchains_llvm`'s README on `main` documents a `cpp_modules` feature absent from `v1.9.0` and from the BCR entirely (BZL-CC-04) — reading `master` and citing the tag is how this file's own sub-artifact got the named-modules floor wrong. | For a version: `gh api repos/<owner>/<repo>/releases --jq '.[0].tag_name'` (or the BCR listing) rather than the README's code fence. For a capability: quote the paragraph from the project actually being cited **and name the ref it was read at**; diff that tag's README against `main` before repeating a feature claim. For "Bazel no longer has a default C++ toolchain" or similar: check a fresh fetch of `rules_cc/README.md`'s Toolchains section — it still documents both. No re-read performed, or a re-read whose ref is unstated = the claim is unverified and does not ship. | MUST (claim accuracy) | rules_cc 0.2.22, toolchains_llvm 1.9.0 (+ unreleased `main`), hermetic_cc_toolchain 4.3.0, era 2026-09; all shapes | M-L-05 | — |
| **BZL-CC-11** | Roll `layering_check` out per package or per target (`package(features = ["layering_check"])`), gated on two preconditions in order: an Include-What-You-Use (or equivalent direct-include) pass has run on that package, and the toolchain's system module map exists. Never adopt it as one repo-wide `.bazelrc` flip. | `-fmodules-strict-decluse` only ever sees a **directly written** `#include`, so an un-IWYU'd package fails on noise rather than real violations; and most systems ship no Clang module maps for the C/C++ standard library, so every `#include <stdio.h>` errors until `tools/cpp/generate_system_module_map.sh` (or the hermetic toolchain's equivalent) has run. LLVM's own Bazel build enables it for three packages, not repo-wide. | Run the IWYU pass with `bazel_dep(name = "bazel_iwyu", version = "0.0.4")` — confirm on the BCR (`modules/bazel_iwyu/metadata.json`) that this resolves to `RealtimeRoboticsGroup/bazel_iwyu`, never `storypku/bazel_iwyu`, which shares the exact module name and is stale since 2024-09-12 — wiring `build:iwyu --aspects @bazel_iwyu//:iwyu.bzl%iwyu_aspect` and `build:iwyu --output_groups=report` in `.bazelrc`, then `bazel build --config=iwyu //path/to/pkg/...` and reading the generated `<target>.<src>.iwyu.txt` reports **before** enabling the feature on that package. `rules_lint` (checked at v2.9.0) ships no IWYU linter — do not look there; without the aspect, Hedron's `compile_commands.json` (BZL-CC-28) feeds standalone `iwyu_tool.py`. Then `grep -rn 'features\s*=.*layering_check' --include='BUILD*' --include='*.bzl' .` cross-checked against `grep -rn 'bazel_iwyu\|iwyu_aspect' MODULE.bazel .bazelrc*`: a package carrying the feature with an EMPTY IWYU grep and no recorded direct-include pass = finding. EMPTY on both = not yet adopted anywhere, which is not itself a finding. Blind to generated BUILD text. | SHOULD | Bazel 7/8/9; rules_cc 0.2.22; bazel_iwyu 0.0.4 (2026-07, single maintainer — re-check its cadence next wave); toolchain must be clang on Unix/macOS; shape F | M-L-06, M-L-07 | — |
| **BZL-CC-12** | Never read a build's success, a failure, a `.bazelrc` line, or a clean IWYU report as evidence that `layering_check` is enforcing for a target; confirm it on the real spawned command line with `aquery`, per target and per configuration. | The feature can be set in a config CI never selects, silently unsupported by the toolchain (Bazel's own toolchains support it only with clang on Unix and macOS), or cancelled by a later negative feature, which always overrides a positive one. Build outcome and enforcement are independent signals — and so are IWYU and enforcement: `bazel_iwyu`'s aspect derives its command line from `CcInfo.compilation_context` plus `cc_common`'s compile variables and **never references a `.cppmap` or `-fmodule-map-file=`**, so the two mechanisms consume disjoint inputs and neither one's result predicts the other's. | `bazel aquery 'mnemonic("CppCompile", //path/to:target)' --output=text \| grep -c -- '-fmodules-strict-decluse'` — `0` = **not enforcing for this target today** (a finding if the target is believed covered); `>0` = confirmed on the real command line. Re-run per CI matrix leg; never generalise from one, and on a Windows leg never substitute BZL-CC-14's strategy grep for this check. | MUST (for any target claimed to be layering-checked) | Bazel 7/8/9; shape F | M-L-06 | BZL-HERM-26 |
| **BZL-CC-13** | Never state layering-check rollout coverage from `bazel query 'attr(features, "layering_check", //...)'` alone; pair it with a grep for `package()`-level defaults. | `attr()` reads a target's own rule attribute; a `package()` default is inherited and never appears in that query's results, so an EMPTY `attr()` result is not proof the feature is unused. | Run both: `bazel query 'attr(features, "layering_check", //...)'` and `grep -rn 'features\s*=.*layering_check\|--features[= ]layering_check' --include='BUILD*' --include='*.bzl' --include='.bazelrc*' .`. **Both EMPTY = not adopted here; query EMPTY with a non-empty grep = the package-level blind spot this row exists to catch.** | SHOULD | Bazel 7/8/9; shape F | M-L-06 | — |
| **BZL-CC-14** | Do not repeat "`layering_check` silently stops enforcing outside a sandbox". State the corrected fact: the reported symptom was a **spurious failure** in the legacy dotd-based undeclared-inclusion checker, fixed in Bazel **7.3.0**; what is permanent is that only **direct** dependencies' module maps are staged as inputs and Clang silently skips an unresolvable `extern module` reference. | The inverted claim sends a reviewer looking for a false negative that does not exist, and implies enforcement can be restored by changing execution strategy. It cannot: enforcement completeness is a property of the declared BUILD graph. The strategy question is also structurally closed on Windows: no Windows leg ever runs a real sandbox — `windows-sandbox` (BuildXL) exists in source but defaults off, needs a `BazelSandbox.exe` Bazel does not ship, and is documented nowhere — so a Windows leg is always `processwrapper-sandbox` or `local`, and whether that weaker tier can reproduce any variant of the #21592 class is unmeasurable on any host this program has (Verdict 15c). | Confirm the floor with `cat .bazelversion` and the CI matrix (≥7.3.0 everywhere `layering_check` is enabled), cross-checked against any `--spawn_strategy=standalone`/`local` or `--strategy=CppCompile=local` line: `grep -rn 'spawn_strategy\|strategy=CppCompile' .bazelrc* .github/workflows/*.yml`. EMPTY on the strategy grep with a ≥7.3.0 floor = pass **on Linux and macOS only** — on a Windows leg EMPTY says nothing, because the strategy there is weak by default; read enforcement from BZL-CC-12's `aquery` instead. A pre-7.3.0 floor anywhere = the historical symptom is reachable. | MUST (claim accuracy) | Bazel <7.3.0 (affected) vs ≥7.3.0 (fixed; both live majors clear it); Windows clause: all majors; shape F | M-L-06 | — |
| **BZL-CC-15** | Never set `hdrs_check` on a `cc_library`/`cc_binary`, and never accept it as evidence of header-inclusion checking. | The Build Encyclopedia's text is "Deprecated, no-op" — byte-identical at 8.7.0 and 9.1.0. It predates `layering_check` entirely and any value written there has zero build effect, while its name reads exactly like the knob someone was looking for. | `grep -rn 'hdrs_check' --include='BUILD*' --include='*.bzl' .` — any hit is a finding (cargo-culted dead attribute) regardless of the value. EMPTY = pass. Blind to generated BUILD text. | SHOULD | Bazel 8/9 (identical text at both); shape F | M-L-06 | — |
| **BZL-CC-16** | Use `strip_include_prefix`/`include_prefix` to relabel how a target's **own** `hdrs` are addressed, and `includes` only when the search path is genuinely meant to reach every reverse dependency; the three are not interchangeable, and their "only legal under `third_party`" restriction is a documented convention, not a verified Bazel-side check. | The Encyclopedia's own emphasis is that `includes` flags "are added for this rule and every rule that depends on it. (Note: **not** the rules it depends upon!)" — one `includes` entry silently mutates every reverse dependency's compile line for as long as the edge exists, while the prefix pair never leaves the declaring target. And no source in this corpus located an enforcement mechanism for the `third_party` restriction, so reporting a violation as a "Bazel error" would be unverified. | `grep -rn 'includes\s*=' --include='BUILD*' .` to enumerate, then read each: is the intent "every consumer needs this path" (`includes`, correct) or "let this target's own headers resolve" (`strip_include_prefix`, correct)? EMPTY = pass. Any claim that Bazel itself rejects the prefix attributes outside `third_party` must cite a reproduced error message or be downgraded to "documented convention". Blind to generated BUILD text. | SHOULD (CONSIDER for the `third_party` claim-accuracy clause) | Bazel 7/8/9 (attribute text unchanged 8.7.0→9.1.0); shape F | M-L-09 | — |
| **BZL-CC-17** | Move a dependency used only inside a library's `.cc` files, never named in its public `hdrs`, from `deps` to `implementation_deps`. | Without it, a private dependency's headers and include paths land on every consumer's compile line — a false public surface plus needless recompile fan-out when the private dependency changes. It is still linked into any binary depending on the library, so nothing is lost. | Reading heuristic, no mechanical check exists: for each `deps` entry, check whether any file in `hdrs` `#include`s it or names one of its types in a public signature. If not, it is an `implementation_deps` candidate. A partial signal is grepping each `hdrs` file's `#include` list against each `deps` entry's public headers. | CONSIDER (reading heuristic only) | Bazel 7/8/9 (attribute text identical 8.7.0/9.1.0); shape F | M-L-10 | — |
| **BZL-CC-18** | Ship sanitizers as named `.bazelrc` configs, each pairing `-fsanitize=<san>` with `-fno-omit-frame-pointer`, an explicit optimization level, `-g`, `--strip=never` and the matching `linkopt`. **pinned** on `-O1` as the shipped level. | `rules_cc`'s own `_sanitizer_feature` already adds `-fno-omit-frame-pointer` and `-fno-sanitize-recover=all`, but sets neither `--strip` nor an optimization level — and `--strip` defaults to `sometimes` (strip iff `--compilation_mode=fastbuild`), so a sanitizer build without `--strip=never` yields backtraces with no symbols, defeating the point. grpc uses `-O0` and google/xls `-O1 -g`; the pin is `-O1`, and the disagreement is recorded rather than hidden. | `grep -n '^build:asan\|^build:tsan\|^build:ubsan' .bazelrc*` and confirm each block carries `--strip=never` and a `linkopt=-fsanitize=` matching its `copt`. A sanitizer config missing either = finding. EMPTY = no sanitizer configs shipped, rule not applicable. | MUST (for any repo shipping a sanitizer config at all) | Bazel 7/8/9; rules_cc 0.2.22, toolchains_llvm 1.9.0; shape F | M-L-11 | — |
| **BZL-CC-19** | Never set `--host_features=<sanitizer>` alongside `--features=<sanitizer>` unless build tools are deliberately meant to run instrumented. | `--features` applies only "for targets built in the target configuration" by design, so a code generator or `protoc` built in the same invocation is uninstrumented for free; adding `--host_features` "for symmetry" actively defeats that and instruments the build tools. This is a scope property of the flag, not an active reset by any toolchain. (On protobuf ≥ 34.0 the exec-configuration `protoc` is not built at all by default — BZL-CC-32.) | `grep -n 'host_features' .bazelrc*` — a hit pairing a sanitizer name with `--host_features` and no comment explaining a deliberate instrumented-tool need = finding. EMPTY = pass (default behaviour in effect). | SHOULD | Bazel 7/8/9; shape F | M-L-11 | — |
| **BZL-CC-20** | Treat MemorySanitizer as a CONSIDER with a standing cost, not a fourth peer default: name the instrumented libc++ as an owned, versioned artifact before enabling it. | There is no official prebuilt instrumented libc++; a repository must build one from the exact matching LLVM sources (`-DLLVM_USE_SANITIZER=MemoryWithOrigins`, then swap in an *uninstrumented* libunwind) and re-do it on every LLVM bump. MSan is Linux-only and reports false positives against an uninstrumented standard library. | Reading heuristic: does the toolchain setup point `libcxx_url`/`libcxx_sha256` at a locally-built, versioned artifact rather than a placeholder or stale URL? `grep -n 'libcxx_url\|libcxx_sha256\|msan' MODULE.bazel .bazelrc*` — MSan enabled with no such pair = finding. EMPTY = MSan not in use, pass. | CONSIDER | Bazel 7/8/9; toolchains_llvm 1.9.0 (Linux only); shape F | M-L-12 | — |
| **BZL-CC-21** | Build actual fuzz targets on `rules_fuzzing`'s `cc_engine`/`cc_engine_instrumentation`/`cc_engine_sanitizer` build settings behind named configs, never on hand-rolled `--copt=-fsanitize=` lines. | The three settings compose engine and sanitizer choice independently — the ruleset's own documented interface, with reproduction modes (`asan-replay`, `msan-libfuzzer-repro`) a hand-rolled copt cannot reach. They are also a different namespace from Bazel's `--features`, despite sharing the string `asan`. | `grep -rn 'cc_fuzz_test\|fuzz_test(' --include='BUILD*' .`, then confirm the corresponding `.bazelrc` configs reference `@rules_fuzzing//fuzzing:cc_engine*` rather than raw `-fsanitize=` copts. EMPTY on the first grep = no fuzz targets, not applicable. | SHOULD | Bazel 7/8/9; rules_fuzzing 0.8.0; shape F | M-L-11 | — |
| **BZL-CC-22** | Never enable, or plan to enable, `features = ["layering_check"]` on a `cc_library` whose `deps` reach a `rules_foreign_cc` target (`cmake`, `configure_make`, `make`, `ninja`, `boost_build`). | The ruleset hardcodes `layering_check` (with `module_maps`, `fdo_instrument`, `fdo_optimize`, `thin_lto`) into `FOREIGN_CC_DISABLED_FEATURES` and passes it as `unsupported_features` when configuring the flags handed to the external build — the request cannot reach it, and the failure surfaces as "module X does not depend on a module exporting <header>" on the *consumer*. The maintainers' only offered workaround opts the edge further out, not in. | `grep -rln 'features = \[.*layering_check' --include='BUILD*' --include='*.bzl' .`, then for each hit check whether any `deps` entry resolves to a `cmake(`/`configure_make(`/`make(`/`ninja(`/`boost_build(` rule. EMPTY on the first grep = pass; a hit whose deps include a foreign_cc rule = finding. | MUST | all majors; rules_foreign_cc 0.15.1+; shape F | M-L-13 | — |
| **BZL-CC-23** | Hand-declare both directions of a wrapped build's I/O: `lib_source` as a filegroup over the whole wrapped tree (`glob(["**"])`, never a curated subset), and every artifact it produces named in `out_static_libs`/`out_shared_libs`/`out_interface_libs`/`out_binaries`/`out_include_dir`/`out_lib_dir`/`out_bin_dir`/`out_data_dirs`/`out_data_files`. | A CMake or Autotools project decides at configure time which files it reads, so a narrower glob drops one silently and the error surfaces deep inside the wrapped tool's own output, not as a Bazel missing-input message. On the output side Bazel declares an output only for names present in those attributes — a produced file named nowhere never becomes a Bazel output at all, with no error, and the downstream failure points at the consumer. | Input side: for each foreign_cc target, read its `lib_source` filegroup and confirm the `srcs` glob has no narrowing pattern — EMPTY (no narrowing found) = pass. Output side: run the target once, then diff the wrapped build's own install directory listing against the declared `out_*` names by hand — no Bazel query reaches inside a foreign build's log; EMPTY diff = pass. | SHOULD | all majors; rules_foreign_cc 0.15.1+; shape F | M-L-13 | — |
| **BZL-CC-24** | Use `rules_foreign_cc` only to vendor third-party C/C++ you do not control and will not rewrite as native `cc_*`; never as the long-term build strategy for a repo's own first-party CMake or Autotools project. **pinned** | The ruleset scopes itself to software "not built by Bazel and also not fully under their control"; a first-party project under active development pays the hand-declared-I/O tax and the forced-off `layering_check` cost indefinitely, for code the team could port to `cc_library`/`cc_binary` instead. (Argued from the ruleset's stated intent, not a hard technical constraint — hence CONSIDER.) | Reading heuristic: for every `cmake(`/`configure_make(`/`make(`/`ninja(` target, does `lib_source` resolve to a path inside the same workspace (first-party) or to an external repository fetched by `http_archive`/a module extension (third-party)? A first-party hit is a finding. | CONSIDER (argued source) | all majors; rules_foreign_cc 0.15.1+; shape F | M-L-13 | — |
| **BZL-CC-25** | Audit the wrapping repo's own toolchain hermeticity before trusting any `cmake()` target that sets `generate_crosstool_file = True`. | The generated CMake toolchain file is built from whatever `cc_toolchain` Bazel already resolved — so an autodetected default, or an inert host-specific override, propagates straight into the wrapped build, silently and live rather than latent. | `grep -rn 'generate_crosstool_file' --include='BUILD*' --include='*.bzl' .`; for each hit, run [BZL-HERM-07](bazel-hermeticity-determinism.md)/[-08](bazel-hermeticity-determinism.md)'s own check (`grep -n 'BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN\|CC=\|layering_check' .bazelrc*`) and BZL-CC-03's `somepath` query. EMPTY on the first grep = not applicable, pass. | SHOULD | all majors; rules_foreign_cc 0.15.1+; shape F | M-L-13 | BZL-HERM-07, BZL-HERM-08 |
| **BZL-CC-26** | Budget materially more CI wall-clock for `configure_make`/`make` targets on Windows, and do not diagnose a Windows-only slowdown as runner misconfiguration. | The ruleset's Windows command path walks and recreates the source tree through a PowerShell `symlink_to_dir` helper instead of a real symlink (which Linux/macOS get) — reported 2021-07-13, stale-marked twice, still open with no maintainer fix. | Compare wall-clock for the same target's wrapped-build action across a Windows leg and a Linux/macOS leg with `--profile` on both. An order-of-magnitude Windows slowdown localised to that action confirms the known pattern; comparable times = pass. | SHOULD | all majors; rules_foreign_cc 0.15.1+ (unresolved at this version); shape F | M-L-13 | — |
| **BZL-CC-27** | Keep `--experimental_cpp_modules`/`module_interfaces` to an isolated, single-`cc_library`, single-interface experiment with the experimental-flag risk accepted in writing; and never state "Bazel supports C++20 modules" without naming the flag, the Bazel version checked, and a date. | The flag's own help text promises "no guarantees about incompatible changes to it or even keeping the support in the future"; the multi-interface case a real module graph needs was merged 2025-12-10 and reverted 2026-01-08 over a measured ~425s CPU regression, and the 2017 tracking issue was closed 2026-01-19 then reopened the next day because of that revert. A static claim goes stale exactly the way that issue's own history shows. | `grep -rn 'experimental_cpp_modules' .bazelrc* .github/workflows/*.yml` and `grep -rln 'module_interfaces' --include='BUILD*' .`. EMPTY on both = pass. Non-empty = confirm a written risk acceptance (comment or ADR) exists rather than an inherited copied example. Note the correct flag spelling is `--experimental_cpp_modules`, not `--experimental_cpp20_modules`, and that `help build --long` and `help startup_options` are two separate surfaces when checking a flag's existence at all. | MUST | Bazel 8.7.0 and 9.2.0 identically (flag default `false`, `EXPERIMENTAL`, unchanged); shape F | M-L-14 | — |
| **BZL-CC-28** | Generate `compile_commands.json` from an `aquery`-based extractor wired as a `refresh_compile_commands` target with clangd configured — never from a full build or an `action_listener`/`extra_action` — and state in the repo's own onboarding that freshness is a manual re-run. | `aquery` reports the action graph's real compile commands without building (~30s cold against ~30m for the `action_listener` predecessor), while `query`/`cquery`/aspects would mean re-implementing the toolchain's own flag assembly outside Bazel. The generator ships no watch mode and no CI drift check, so an unwarned developer files "autocomplete is wrong" as a mystery bug. The same artifact is the no-aspect IWYU path: standalone `include-what-you-use`'s `iwyu_tool.py` consumes exactly this compilation database, which is what BZL-CC-11's precondition needs when `bazel_iwyu`'s aspect is not wired. | `grep -rln 'action_listener\|extra_action' --include='BUILD*' --include='*.bzl' .` for any compile-commands purpose (a hit = finding) and confirm an `aquery`-based generator is present in `MODULE.bazel` (absence = finding). Then read the contributor docs for the re-run command; absent = finding. Under BwoB, see [BZL-CACHE-11](bazel-caching-rbe.md) for the `--remote_download_regex` clause clangd needs. | SHOULD | all majors; `hedron_compile_commands` `main` (2026-09, `abb61a6`); shape F | M-L-15 | BZL-CACHE-11 |
| **BZL-CC-29** | Before committing to Linux-to-Windows C++ cross-compilation (RBE included), confirm the toolchain's tool paths resolve under the **execution** platform's path-absoluteness rules, not the host's — and track [bazelbuild/bazel#19208](https://github.com/bazelbuild/bazel/issues/19208) as open rather than assuming a fix landed. | Path absoluteness is decided by the host's rules, so `C:/foo/bar` reads as *relative* on a Linux host and Bazel prepends the toolchain package path, emitting a silently broken compiler invocation (`.../rbe_windows_.../C:/VS/VC/Tools/MSVC/.../cl.exe`). Open since 2023-08-09, no fix, discussion converged but stalled. | Run the cross-compile action with `--subcommands` and inspect the emitted command line for a path where the toolchain package path precedes an absolute Windows path (the `.../C:/...` shape). EMPTY (no such malformed path) = pass for this bug; a hit = confirmed, with exec-platform-specific `cc_toolchain_config` paths the only documented workaround. The related `--platforms`-versus-legacy-flag failure is [BZL-ARCH-17](bazel-architecture-monorepo.md)'s, not this row's; the MAX_PATH mitigation is [BZL-HERM-27](bazel-hermeticity-determinism.md)'s. | MUST (know the limitation before committing to the path) | all majors (unfixed since ~2023); shape F | M-L-16 | BZL-ARCH-17 |
| **BZL-CC-30** | For a C++ target whose declared input set runs to six figures — a large vendored tree wrapped by `rules_foreign_cc`, or an equivalent monorepo subtree — expect symlinked-sandbox construction to be a real fraction of cold-build wall-clock, and confirm nothing has explicitly disabled `--reuse_sandbox_directories`. | Sandbox construction scales with input count and is reported dominant around 300K input files; of five proposed mitigations only directory reuse shipped (on by default 8.7.0-9.2.0, and it helps warm rebuilds only), and `io_uring` was abandoned over its own security bugs. The highest-input-count actions in a C++ repo are exactly the foreign-build wraps. | `grep -n 'reuse_sandbox_directories' .bazelrc*` for an explicit `=false` — EMPTY (flag left at its `true` default) = pass. Then run `bazel clean` **before** `bazel build --profile=/tmp/p.gz <large-input-target>` and read sandbox-creation time as a fraction of action time: a warm action cache skips sandbox construction entirely and reads as a false pass (measured on this host — even changing `--sandbox_add_mount_pair` did not bust an action-cache hit). A large fraction with the default on is a real unmitigated cold-build cost, not a misconfiguration; for the sandbox *location* see BZL-CC-31. | CONSIDER | Bazel 8.7.0-9.2.0 (default identical throughout); shape F | M-L-18 | — |
| **BZL-CC-31** | Treat `--sandbox_base=<tmpfs path>` as a conditional, two-precondition knob, never a free win: confirm the current sandbox location is not already tmpfs before setting it, and never pair it with `--experimental_use_hermetic_linux_sandbox` when the base and the output root sit on different filesystems. | Measured here (50 genrules, 3 clean rebuilds per condition, Bazel 8.7.0, `linux-sandbox` confirmed for all 50 actions): default base **26.2 ms/action** versus `--sandbox_base=/dev/shm` **24.1 ms/action**, stdev 8-11 ms — no measurable effect, because this host's mandated scratch is itself tmpfs, making the comparison tmpfs-vs-tmpfs rather than the tmpfs-vs-disk the flag's own help text promises a win for. **[WSL2 + harness-location caveat: a CI runner whose output root sits on a real block device is untested and would plausibly show a real delta — Verdict 15b.]** What holds regardless of host, from 9.2.0 source: sandbox subdirectories are mode `755` either way, but `/dev/shm`'s parent is `1777` where a `$HOME`-rooted default is `700`, so on a multi-user machine any local user can list and read the sandbox's staged inputs; and the **hermetic** sandbox stages inputs as hardlinks (`HardlinkedSandboxedSpawn`), which fail `EXDEV` across a filesystem boundary — Bazel catches the `IOException` and silently copies the file instead, logged only under `--sandbox_debug`. The flag also carries `oldName = "experimental_sandbox_base"`, source-only and on no CLI reference page. | `grep -n 'sandbox_base' .bazelrc* .github/workflows/*.yml` — EMPTY (default `""`) = pass, nothing to review. For a hit: `findmnt -T "$(bazel info output_base)"` (Linux only) — `tmpfs` there means the flag buys nothing on that host, which is the finding; then, if `--experimental_use_hermetic_linux_sandbox` is also set, run one build with `--sandbox_debug` and grep that output plus `$(bazel info output_base)/java.log*` for `could not be hardlinked`. EMPTY on that grep reads **weakly** — either no downgrade happened or the log line was not surfaced — so treat a base and an output root on different `findmnt` sources as the finding regardless. | CONSIDER | Bazel 8.7.0-9.2.0 (option definition and `""` default identical; help text in the 8.7.0 and 9.1.0 CLI references — no 9.2.0 doc snapshot exists — and `SandboxOptions.java` read at 8.7.0 and 9.2.0); Linux only; timings WSL2-only; shape F | M-L-17 | BZL-HERM-26 |
| **BZL-CC-32** | Never claim a repo's registered C++ toolchain builds every binary in its graph while a `protobuf` ≥ 34.0 dependency is in it — `protoc` arrives as a prebuilt download by default there — and always name the protobuf version alongside any `prefer_prebuilt_protoc` citation, using the current path `--@protobuf//bazel/flags:prefer_prebuilt_protoc`. | Read from tagged protobuf source at four versions: at **v33.4** `//bazel/toolchains:prefer_prebuilt_protoc` is a real `bool_flag` with `build_setting_default = False`; at **v34.0** that label becomes an `alias` to `//bazel/flags:prefer_prebuilt_protoc`; by **v36.1** the default is `True`. Bazel 9 enforces protobuf ≥ 33.4 as a graph minimum (its own 9.0.0 release notes) and the BCR publishes 34.0 through 36.1, so almost every current install resolves above the flip. A checksummed download is hermetic, but it is not your toolchain's output and carries none of your sysroot, sanitizer or `layering_check` features — and the old flag path, while still resolving, is right for exactly one version. | Read the resolved version first (`bazel mod graph \| grep protobuf`, or the `protobuf` entry in `MODULE.bazel.lock`), then `grep -rn 'prefer_prebuilt_protoc' .bazelrc* MODULE.bazel`. EMPTY grep with protobuf **≥ 34.0** = the prebuilt default is in effect — document that instead of repeating a whole-graph toolchain claim; EMPTY grep with **33.4** = `protoc` is built from source by the resolved C++ toolchain. A `//bazel/toolchains:` spelling in a repo pinning ≥ 34.0 is stale-but-working, and a finding for any doc that cites it without a version. Blind to generated-repo text. | MUST (claim accuracy) | Bazel 9 (enforced protobuf floor 33.4); protobuf 33.4 → 36.1.bcr.1; shape F | — (cross-family: the flag's path move and default flip are the protobuf follow-up's, assigned by [BZL-ARCH](bazel-architecture-monorepo.md) Verdict 12 to `BZL-FLAG`, which carries no such row at its 2026-09-06 revision; this row states only the C++-toolchain-reach half) | BZL-ARCH-31, BZL-LARK-10 |
| **BZL-CC-33** | Do not schedule or promise C++ coverage on a Windows leg, and set `GCOV_PREFIX_STRIP` explicitly on any macOS coverage leg before trusting a C++ coverage number. | `bazel.build/configure/coverage` documents the C++ path for **Linux and macOS only** — there is no Windows path at all — and states that the correct `GCOV_PREFIX_STRIP` value "depends on your setup" and that when it is wrong "no coverage data will be found". That is a second silent-empty cause on the same language as [BZL-TEST-27](bazel-testing.md)'s raw-`.profdata` one (`--experimental_generate_llvm_lcov`, default `false` on 8.8.0 and 9.2.0), and both leave the test PASSing and the command exiting 0. The Windows half rests on documented absence, not on a measured failure — say so when reporting it. | `grep -rn 'GCOV_PREFIX_STRIP' .bazelrc* .github/workflows/*.yml` on any macOS coverage leg — EMPTY = the value is unset and an empty C++ report there is expected rather than mysterious (a finding for a leg believed to produce coverage). A Windows leg running `bazel coverage` over `cc_*` targets is a finding on its own. Gate the result on [BZL-TEST-25](bazel-testing.md)'s nonzero-`DA:` count, never on the exit code, and pass [BZL-TEST-27](bazel-testing.md)'s flag wherever the toolchain is clang/LLVM. | SHOULD | Bazel 8/9 (documented for Linux and macOS only); shape F | — | BZL-TEST-25, BZL-TEST-27 |

## Applied to rules_ocx and the fleet

**This family has no fleet instance. Nothing here is satisfied or violated — it cannot be
exhibited.** The measurements:

- **Zero C++ targets.** `grep -rn "cc_binary\|cc_library\|cc_toolchain"` over every `.bzl` and
  `BUILD.bazel` in `rules_ocx` returns nothing
  ([`build-contracts-and-ci-posture.md:37`](bazel-audit/build-contracts-and-ci-posture.md);
  independently re-run on this pass, zero matches, including for `hermetic_cc_toolchain` and
  `toolchains_llvm` in `MODULE.bazel`). `starlark-code-shape.md`'s own contradiction log states
  the frame's per-language hypothesis "gets no support or refutation from this codebase"
  ([`starlark-code-shape.md:293`](bazel-audit/starlark-code-shape.md)). So **BZL-CC-01
  through -33 are all vacuously satisfied**, which is not the same as passing.
- **The 2026-09-06 measurement round changed nothing here.** Both cross-version measurement
  artifacts ran in scratch workspaces against real 8.7.0/8.8.0/9.2.0 binaries with their own
  `--output_user_root`; `rules_ocx` was read, never modified, and no C++ target was compiled
  anywhere in the fleet. Every measured number in BZL-CC-31 and Verdict 14 is a
  synthetic-workspace number on this WSL2 host, carried with that caveat rather than
  generalised.
- **The one adjacent live fact is the developer-machine override, and it belongs to
  `BZL-HERM`.** `.bazelrc.user:1` is a comment stating the rationale ("no g++ on this box, use
  zig as C compiler"); `:2` sets `common --repo_env=CC=<path under one developer's $HOME>`;
  `:3` sets `build --features=-layering_check --host_features=-layering_check`
  ([`build-contracts-and-ci-posture.md:64-80`](bazel-audit/build-contracts-and-ci-posture.md)).
  The file is gitignored and CI never reads its content — it is regenerated at CI runtime by
  `.github/actions/remote-cache/action.yml`, which appends neither line
  ([`build-contracts-and-ci-posture.md:79,220`](bazel-audit/build-contracts-and-ci-posture.md)).
  That pair is **BZL-CC-02's exact worked example of what a hermetic toolchain is not**, and
  its severity ladder is [BZL-HERM-08](bazel-hermeticity-determinism.md)'s: CONSIDER while it
  governs zero targets, MUST the moment any dependency pulls in a `cc_library`. The cheaper
  correct fix today is [BZL-HERM-07](bazel-hermeticity-determinism.md)'s one committed
  `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` line, which retires the reason both
  lines exist. (That file also holds a cache write credential on a later line; it is described
  in words only and never reproduced, here or in any dive.)
- **The autodetection probe is why the override exists at all.** Bazel's `@bazel_tools` C++
  autoconfiguration probes for a working C compiler at workspace setup "regardless of whether
  any `cc_*` target is ever requested"
  ([`build-contracts-and-ci-posture.md:220`](bazel-audit/build-contracts-and-ci-posture.md)) —
  the mechanism BZL-CC-03 names and [BZL-HERM-07](bazel-hermeticity-determinism.md) switches
  off.
- **The fleet's CMake surface is real but compiles nothing, and the frame undercounts it.**
  The frame's table says "C++ | none (one CMake probe directory)". Measured on this pass there
  are two CMake trees under `/home/mherwig/dev`, neither a Bazel repo and neither with a C or
  C++ source file: `/home/mherwig/dev/test/CMakeLists.txt` is two lines
  (`cmake_minimum_required(VERSION 4.0)` + `project(hello_world)`) with no sources — the
  frame's probe directory; and `/home/mherwig/dev/find_ocx` is a **whole git repository** (last
  commit 2026-07-10) shipping `ocx.cmake`/`Findocx.cmake` as a CMake integration module, whose
  own `CMakeLists.txt:9` declares `project(find_ocx LANGUAGES NONE)` — it deliberately probes
  no compiler at all and has no `MODULE.bazel`, `BUILD.bazel` or `.bazelrc`. Recorded as a
  frame correction, not a C++ consumer.
- **What the fleet would have to build to exhibit this family**, in order of least work: one
  repository with a real `cc_library` plus one registered hermetic toolchain (BZL-CC-01, and
  [BZL-HERM-24](bazel-hermeticity-determinism.md)/[-25](bazel-hermeticity-determinism.md)
  become checkable); then a second package with `features = ["layering_check"]` after an IWYU
  pass (BZL-CC-11 through -14); then one `.bazelrc` sanitizer config (BZL-CC-18/-19); then a
  vendored third-party dependency wrapped by `rules_foreign_cc` (BZL-CC-22 through -26); then
  a `cc_proto_library` over the fleet's currently zero `.proto` files (BZL-CC-32). Until the
  first of those exists, every verification in this file is an upstream-grounded standard with
  no local signal — which is the map's own stated reason for shipping `cpp.md` anyway (frame
  decision table, row 7).

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds through exactly one row,
  and only as an anti-example: BZL-CC-02 names the `.bazelrc.user` `CC=` pair as "not a
  hermetic toolchain", with its severity ladder owned by
  [BZL-HERM-08](bazel-hermeticity-determinism.md). Everything else is inert: zero `cc_*`
  targets, so no `layering_check`, sanitizer, foreign-build or IDE row has a target to check.
  BZL-CC-26, -29 and -33 would bind the day a C++ target appeared, because 3 of 9 test shards
  and a BCR-parity target already run Windows
  ([`build-contracts-and-ci-posture.md:40`](bazel-audit/build-contracts-and-ci-posture.md)) —
  and that Windows leg has no real sandbox and no documented C++ coverage path at all
  (Verdict 15c, 18).
- **B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`).** Binds only through `rules_rust`'s own C-linkage edges on adoption: a
  `cargo_build_script` or a `cc`-crate dependency resolves the same `cc_toolchain` BZL-CC-01
  and -03 govern. Nothing in this shape uses `cc_*` rules directly today.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** Same as B, at the only fleet scale where
  BZL-CC-30's sandbox-cost row and BZL-CC-31's sandbox-location row could ever matter; no C++
  today.
- **D — Python library or automation.** Binds only if a native extension appears; every fleet
  Python project is pure-Python with no native extension
  ([`fleet-bazel-readiness.md`](bazel-audit/fleet-bazel-readiness.md), Repo shapes: "no native
  extension"). Not applicable today.
- **E — TypeScript package, extension or Action.** No binding. `node-gyp`-style native modules
  would pull the same toolchain question in through `rules_js`; none exists in the fleet.
- **F — Future polyglot Bazel monorepo (none today; `rules_ocx`'s own users).** Every one of
  the 33 rows binds here, and this shape is the only reason the family ships. The map's own
  priority note applies verbatim: a topic inert in this fleet is not inert for the audience
  the artifacts ship to.

## AI-agent failure modes

Ranked by how often it bites; 1-17 merged across the three dives, 18-22 added by the
2026-09-06 follow-up and measurement round.

1. **Writing a bare `cc_library(...)`/`cc_binary(...)`/`cc_test(...)` with no `load()`.**
   WORKSPACE-era muscle memory that still works on 7/8 and is a hard error on 9, where
   `--incompatible_autoload_externally` defaults empty. Named independently by two of three
   dives, and reproduced on both binaries. *Check*:
   `load("@rules_cc//cc:defs.bzl", "cc_library")` (or the per-rule `cc/cc_library.bzl`
   sibling) present in the same file as any `cc_library(` call; on 9.2.0 the failure is a
   purpose-built `_removed_rule_failure` traceback naming `buildifier --lint=fix`, not the
   plain "is not defined" the other rule families get
   ([BZL-LARK-10](bazel-starlark-and-build.md)).
2. **Spelling the autodetection off-switch as `--define=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`,
   or as a loadable Starlark symbol.** The top failure mode of the sibling family, and a model
   asked specifically about C++ toolchains is in the most likely context to hallucinate it.
   *Check*: the only correct forms are `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` or the
   variable set in the process environment before Bazel starts
   ([BZL-HERM-07](bazel-hermeticity-determinism.md)).
3. **Reading `layering_check` in a `.bazelrc` as proof a codebase is strict-deps-clean.** The
   single most on-topic mistake for this family: a summary from
   `grep -n layering_check .bazelrc` reports a gate that may never reach the target (wrong
   toolchain, wrong OS, a later negative feature, a config CI never selects). *Check*:
   BZL-CC-12's `aquery` command before asserting enforcement for any specific target.
4. **Repeating the inverted "`layering_check` silently stops enforcing outside a sandbox"
   claim.** It is in this program's own map and brief, so a model reading the corpus inherits
   it. *Check*: BZL-CC-14 — the reported bug was a spurious *failure* in the legacy dotd
   checker, fixed in 7.3.0; the permanent fact is direct-only module-map staging.
5. **Cross-attributing a compatibility or version claim between `toolchains_llvm` and
   `hermetic_cc_toolchain`.** Demonstrated, not hypothetical: it already happened once inside
   this research program. Both READMEs cover sandboxing, sysroots and sanitizers in a similar
   order. *Check*: BZL-CC-10 — re-read the paragraph in the project actually being cited.
6. **Copying a `bazel_dep` version straight out of a README code fence.**
   `hermetic_cc_toolchain`'s own README example says `version = "3.1.0"`; the current release
   is 4.3.0. *Check*: `gh api repos/<owner>/<repo>/releases --jq '.[0].tag_name'` or the BCR
   listing before trusting any version inside a doc.
7. **Reaching for `includes` to make one target's own `#include`s resolve.** It reads like the
   natural "add an include path" attribute and instead mutates every reverse dependency's
   compile line, permanently and invisibly. *Check*: BZL-CC-16 — ask whether the path is meant
   to reach consumers (`includes`) or stay local (`strip_include_prefix`).
8. **Hand-writing sanitizer flags as `copts` instead of using the toolchain feature or the
   shipped config.** Produces a partial set — missing `--strip=never`, the matching `linkopt`,
   or `-fno-sanitize-recover=all`. *Check*: BZL-CC-18's block, or `--features=asan`; a
   hand-written `-fsanitize=` copt is a signal to re-derive, not to trust.
9. **Proposing `features = ["layering_check"]` on a `cc_library` that wraps a
   `rules_foreign_cc` dependency, "to improve include hygiene".** Plausible-sounding and
   structurally impossible — the feature is in `FOREIGN_CC_DISABLED_FEATURES`. *Check*:
   BZL-CC-22's grep.
10. **Reaching for `rules_foreign_cc` as the first move for any non-Bazel-native C/C++
    dependency**, without checking whether a native `cc_library`-based module already exists.
    *Check*: query the BCR (or `bazel mod show_repo`) for the library name before adding a
    `cmake()`/`configure_make()` target.
11. **Hallucinating `--experimental_cpp20_modules`.** The blog posts and the original PR
    discussion used the "20" form; the flag that shipped in 8.7.0 and 9.2.0 alike is
    `--experimental_cpp_modules`. *Check*: run the exact flag name against the real binary —
    an unrecognised option is the cheapest possible verification, and remember `help build
    --long` and `help startup_options` are two separate surfaces, so absence from one is not
    absence from the binary.
12. **Concluding `toolchains_llvm` supports named modules on Bazel 8 from a grep of Bazel's
    own rule source.** `module_interfaces` and `--experimental_cpp_modules` exist at 8.7.0;
    that is not the same claim. *Check*: BZL-CC-04 — the ruleset's own stated floor is
    authoritative for its own behaviour, and it must be read at the pinned ref.
13. **Setting `hdrs_check` expecting it to enable header checking.** The name is exactly what
    someone hunting for strict deps would guess; it has been a documented no-op since before
    `layering_check` existed. *Check*: `grep -rn 'hdrs_check'` — any hit is worth a second
    look regardless of value.
14. **Proposing an `action_listener`/`extra_action`-based `compile_commands.json` generator**,
    copied from a pre-2019 answer, instead of the `aquery` approach every current source uses.
    *Check*: BZL-CC-28's grep.
15. **Assuming a custom transition that flips `--cpu` for a fat-binary build is compatible
    with `--platforms`-based toolchain resolution.** Pre-platforms-migration examples dominate
    training data. *Check*: [BZL-ARCH-17](bazel-architecture-monorepo.md)'s grep over the
    transition's returned dict.
16. **Reaching for a README's `WORKSPACE` snippet because it appears first.**
    `hermetic_cc_toolchain`'s README still shows the `http_archive` pattern above the
    `MODULE.bazel` one; on Bazel 9 that is deleted machinery, not legacy-but-working
    ([BZL-HERM-28](bazel-hermeticity-determinism.md)). *Check*: grep the README for its
    `MODULE.bazel` heading and use that section regardless of reading order.
17. **Repeating the "missing IDE integration is the #1 C++ adoption blocker" ranking as
    measured data.** Its own author calls it "no statistics… just my gut feeling", and a model
    compressing the source reliably drops that qualifier. *Check*: carry the qualifier, or
    cite the independent corroboration (a mature single extractor with no rival; two
    multi-year-open cross-compilation issues; a modules effort merged and reverted inside five
    weeks) instead of the ranking.
18. **Citing a ruleset README on `main` for a feature no release carries.** The mirror image of
    failure mode 6, and it bit this file's own sub-artifact: `toolchains_llvm`'s `main`
    documents C++20 named modules that `v1.9.0` and every BCR version lack (PR #843 merged
    2026-09-02, four days after the tag). *Check*: BZL-CC-10 — diff the pinned tag's README
    against `main` before repeating a capability claim, and state the ref.
19. **Conflating the two GitHub projects named `bazel_iwyu`.** A search finds
    `storypku/bazel_iwyu` first (older, more history) and misses that it is stale since
    2024-09-12 while a maintained fork under a different org carries the **identical module
    name**. *Check*: resolve the name through the BCR (`modules/bazel_iwyu/metadata.json`,
    homepage `RealtimeRoboticsGroup/bazel_iwyu`), never through the first search hit — and do
    not look for IWYU in `rules_lint`, which has none at v2.9.0.
20. **Assuming `--sandbox_base=/dev/shm` is a free performance win, or pairing it with
    `--experimental_use_hermetic_linux_sandbox` for "maximum speed and hermeticity".** The
    flag's own help text ("possibly improve performance a lot") invites the first; the second
    is a plausible-sounding pairing whose real effect is a silent hardlink→copy downgrade of
    every input across a filesystem boundary. *Check*: BZL-CC-31 — `findmnt -T` the current
    output base first, and never recommend the pairing without confirming the two filesystems
    match.
21. **Recommending a defensive toolchain rewrite on every `rules_cc` bump.** The commit-level
    churn in the built-in argument fragments is real, but no public macro attribute was renamed
    or removed in 21 releases and the worked example needed two edits in 14 months. *Check*:
    BZL-CC-01 — review the fragments the toolchain references *by label*; leave the macro calls
    alone.
22. **Citing `--@protobuf//bazel/toolchains:prefer_prebuilt_protoc` as the current flag, with
    no protobuf version.** Right for exactly one version (33.4, default `False`) and stale for
    every version after it (the canonical path is `//bazel/flags:…` and the default is `True`
    from 34.0). *Check*: BZL-CC-32 — name the resolved protobuf version alongside the flag,
    every time.

## Open questions

### Needs a human decision

1. **Does `bazel-adopt` name a C++ branch at all, given no fleet consumer and no candidate
   repo?** The frame's adoption candidate is `bob` (pure Rust). A C++ adoption path in the
   skill would be written entirely from upstream sources with no fleet rehearsal — shippable,
   but the owner should decide whether it earns the words or whether `cpp.md` alone carries
   the C++ story.
2. **Which of the three toolchain branches, if any, does the shipped guidance name as the
   worked example?** BZL-CC-01 deliberately refuses a default. A worked example is still one
   concrete `MODULE.bazel` snippet, and picking which project it shows is a presentation
   decision with a nudging effect the tree is designed to avoid. Default if unanswered: show
   `rules_cc`'s own modular API — now on measured grounds rather than preference: zero
   attribute renames or removals across 21 releases and a worked example that needed two small
   edits in 14 months, against a `toolchains_llvm` whose headline new feature is in no release.
3. **Ship the `-O1` sanitizer pin as written, or make the block carry both numbers?** grpc and
   google/xls disagree on primary-sourced grounds (BZL-CC-18). Shipping both doubles the
   config block; shipping one hides a real disagreement. Default if unanswered: `-O1`, with
   the `-O0` alternative named in one sentence.

### Deserves another research round

| Subarea | Exact question |
|---|---|
| `bazel-cpp` — `layering_check` × C++20 named modules (**the experiment that closes Verdict 15's documented gap (a)**) | On `toolchains_llvm` `main` after [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) (2026-09-02) with LLVM 22, does `bazel build --features=layering_check,cpp_modules --experimental_cpp_modules --cxxopt=-std=c++20` on a `cc_library` carrying both a `module_interfaces` file and an ordinary `.cc` file with a deliberately undeclared `#include` still fail with the `-fmodules-strict-decluse` diagnostic? Needs a commit-pinned override (no release carries the feature) plus an LLVM 22 distribution; not answerable by any doc read. |
| `bazel-cpp` — `--sandbox_base` on a disk-backed output root (**documented gap (b)**) | Repeat BZL-CC-31's exact 50-genrule protocol with `--output_user_root` on a real block-device filesystem (`findmnt -T` reporting `ext4` or similar, not `tmpfs`) and report the per-action delta. Outside this program's permitted execution locations; needs a CI runner or a different host. |
| `bazel-cpp` — `bazel_iwyu` fork longevity | `RealtimeRoboticsGroup/bazel_iwyu` is two months old at one BCR version (0.0.4) with a single maintainer. Re-check its commit cadence and BCR version count next wave; several months with no new version is the signal to downgrade BZL-CC-11's reliance on the aspect in favour of the Hedron + `iwyu_tool.py` path. |
| `bazel-cpp` — sanitizer features under a *modular* `rules_cc` toolchain | Every sanitizer fact in BZL-CC-18/-19/-20 traces to `unix_cc_toolchain_config.bzl`'s `_sanitizer_feature`, the legacy path. `rules_cc` 0.2.22 added a second, `bazel_features.cc.supports_starlarkified_toolchains`-gated native implementation path in `cc/toolchains/toolchain.bzl`. Do the stock sanitizer features compose identically on a toolchain built with the modular API, or must a `cc_toolchain()`-built toolchain declare them itself? Read by no dive. |

### M-L rows this ruleset does not settle

- **M-L-08** — settled on its floor half (BZL-CC-04, now including the release-versus-`main`
  correction) and on the default-off reason plus the *mechanism* of the far side (BZL-CC-05:
  the `-fno-cxx-modules` suppression is gated off exactly when `cpp_modules` is on, with no
  replacement and no test anywhere combining the two). What remains unsettled is only the
  empirical outcome, which needs an unreleased ref and LLVM 22 — Verdict 15's documented gap
  (a), with the exact experiment named above.
- **M-L-16** — settled by BZL-CC-29 for the MSVC path-absoluteness half and BZL-CC-03 for the
  shared autodetected-toolchain root cause; the transition-versus-`--platforms` half is
  **already settled by [BZL-ARCH-17](bazel-architecture-monorepo.md)** and is deliberately not
  duplicated here (Verdict 5).

**M-L-17 is now settled** by BZL-CC-31 (measured 2026-09-06, WSL2 caveat carried); it is no
longer a research gap. All other section-L rows (M-L-01 through M-L-07, M-L-09 through M-L-15,
M-L-18) are settled by at least one rule above.

## Sub-artifacts

- [`bazel-cpp/hermetic-cc-toolchain-choice.md`](bazel-cpp/hermetic-cc-toolchain-choice.md) —
  why `rules_cc` ships no hermetic toolchain, the four symptoms of the autodetected default it
  leaves behind, and the constraint-keyed three-branch tree across `toolchains_llvm`,
  `hermetic_cc_toolchain` and `rules_cc`'s own modular API, each with its real cost: the
  named-modules floor, the `layering_check`-preserving default, UBSAN-by-default and the zig
  cache, the four tested cross-compile pairs and the Yocto layout trap. **Superseded on one
  point**: its named-modules section reads `toolchains_llvm`'s `master`, so its
  "toolchains_llvm 1.9.0" attribution is corrected by the follow-up below and by BZL-CC-04.
- [`bazel-cpp/layering-check-includes-and-sanitizers.md`](bazel-cpp/layering-check-includes-and-sanitizers.md)
  — `layering_check` end to end (`.cppmap` generation, the exact compiler flags traced to
  `rules_cc` source, direct-includes-only scope, per-package rollout, and the corrected
  account of its sandboxing story), the `includes`/`strip_include_prefix`/`include_prefix`/
  `implementation_deps` quartet, and the sanitizer `.bazelrc` block with the `--host_features`
  scope rule and MSan's instrumented-libc++ tax.
- [`bazel-cpp/foreign-builds-modules-and-cpp-tooling.md`](bazel-cpp/foreign-builds-modules-and-cpp-tooling.md)
  — `rules_foreign_cc`'s hand-declared-I/O cost model and its hardcoded `layering_check`
  block, the dated status of native C++20 modules through a merge-and-revert cycle,
  `aquery`-based `compile_commands.json` and its manual staleness model, the Linux-to-Windows
  path-absoluteness bug and its shared root cause with native-Windows mis-resolution, and
  symlinked-sandbox construction cost.
- [`bazel-followups/cpp-modular-toolchain-cost-iwyu-and-sandbox-base.md`](bazel-followups/cpp-modular-toolchain-cost-iwyu-and-sandbox-base.md)
  — commissioned by this file's own open questions: the modular API's measured
  attribute stability against its built-in fragments' churn, the two `bazel_iwyu` projects and
  `rules_lint`'s absent IWYU support, the `--sandbox_base` measurement with its two
  hermeticity effects, and PR #843's evidence for *why* the `layering_check` × `cpp_modules`
  far side is unknown.
- [`bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md`](bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md)
  — read here only for its protobuf half: the flag-path move and default flip at 34.0 behind
  BZL-CC-32, and the Bazel-9 `load()` requirement for `cc_proto_library`.
- [`bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md`](bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md)
  — read here only for its C++ half: the `PROFDATA`-versus-`LLVM_LCOV` branch
  ([BZL-TEST-27](bazel-testing.md)'s row) and the Linux/macOS-only,
  `GCOV_PREFIX_STRIP`-sensitive C++ coverage path behind BZL-CC-33.
- [`bazel-followups/macos-windows-sandbox-and-runfiles-parity.md`](bazel-followups/macos-windows-sandbox-and-runfiles-parity.md)
  — read here for the Windows sandbox reality (no default, no shipped `BazelSandbox.exe`, no
  docs, but a `windows-sandbox` code path), which bounds BZL-CC-14's strategy clause, and for
  BZL-HERM-27's corrected citation and exact `--output_user_root` recipe (Verdict 6).
- [`bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md`](bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md)
  — the `linux-sandbox` strategy, its whole-root read-only remount, the `HOME`-unset action
  environment behind BZL-CC-07's caveat, and the action-cache observation behind BZL-CC-30's
  `clean`-first verification.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — flag defaults read from the real 8.7.0/8.8.0/9.2.0 binaries, and the measured `cc_*`
  removed-rule stub error shape behind Verdict 14 and failure mode 1.

## Revision log

Every line is one change made on **2026-09-06**, folding the four wave-4a follow-ups that touch
this family and the two cross-version measurements. Rule IDs are a stable contract: no number
was reused, reordered or retired. Rule count 30 → 33; MUST count 12 → 13.

| What changed | IDs | Why | Input |
|---|---|---|---|
| Rationale gains the measured two-tier maintenance cost (public macros additive-only across 21 releases; built-in `cc/toolchains/args/*` fragments rewritten three times in five weeks); rule text and verification now ask whether the toolchain references those fragments by label, with a per-bump diff and its EMPTY reading. Severity held at SHOULD. | BZL-CC-01 | The third branch of the tree was the least-evidenced; the follow-up measured it and found the cost is real but lives one layer below the public API. | 4b follow-up Q1 (measured) |
| Rule text rewritten: confirm the **ref** carries the feature before the floor. `toolchains_llvm` v1.9.0 and every BCR version have no C++20-named-modules support; it exists only on `main` after PR #843 (2026-09-02). Applies-to cell corrected from "toolchains_llvm 1.9.0" to "unreleased `main` only". Verification now reads the pinned tag's README, never `main`. | BZL-CC-04 | The sub-artifact fetched `master` and attributed its floor sentence to the 1.9.0 tag — a claim no `bazel_dep` can satisfy. Contradiction resolved in place. | 4b follow-up Q4 (measured) |
| Rationale replaced: the far side is not merely undocumented, it is unprotected — PR #843 gates the `-fno-cxx-modules` suppression off exactly when `cpp_modules` is on, `rules_cc` 0.2.22's `layering_check` fragment and the `cpp20_module_*` action types are disjoint, and no test anywhere combines the two. Applies-to cell updated to the unreleased ref. | BZL-CC-05 | "Undocumented" understated a mechanism now readable in a diff. | 4b follow-up Q4 (measured) |
| Rule text gains "pin `HERMETIC_CC_TOOLCHAIN_CACHE_PREFIX` rather than relying on `$HOME`"; rationale gains the measured absence of `HOME` from the action environment on both majors with its not-measured-for-a-zig-action caveat; verification gains the genrule probe and its expected `<unset>` result. | BZL-CC-07 | The ruleset's "each user gets their own cache via `$HOME`" claim needed the measured action-env fact beside it. | sandbox measurement Q2/Q4 (measured, WSL2) |
| Rationale gains a fourth demonstrated instance in the opposite direction — a README on `main` ahead of every release — and the rule text and verification now require naming the ref a claim was read at. | BZL-CC-10 | The failure this row exists to catch has now happened in both directions inside this program. | 4b follow-up Q4 (measured) |
| Verification replaced with the concrete IWYU wiring: `bazel_iwyu` 0.0.4 resolved through the BCR to `RealtimeRoboticsGroup`, the `storypku` name collision, `rules_lint` v2.9.0's absent IWYU support, the aspect/output-group `.bazelrc` lines, and the Hedron fallback. Applies-to gains the fork's age and a re-check instruction. | BZL-CC-11 | The row required an IWYU pass and named no way to run one. | 4b follow-up Q2 (measured) |
| Rule text and rationale gain the independence clause: `bazel_iwyu`'s aspect reads `CcInfo.compilation_context` and never a `.cppmap`, so neither check predicts the other. Verification gains "on a Windows leg never substitute BZL-CC-14's strategy grep for this check". | BZL-CC-12 | Two mechanisms an agent will treat as one; source-read proof they share no input. | 4b follow-up Q2 (measured) |
| Rationale gains the Windows structural clause (no default sandbox, no shipped `BazelSandbox.exe`, `windows-sandbox` exists in source); the verification's EMPTY reading is now scoped to Linux and macOS — on a Windows leg EMPTY says nothing. | BZL-CC-14 | The open question "does processwrapper reproduce #21592 on Windows" turns out to be unmeasurable and bounded; the rule absorbs what is knowable. | Windows/macOS follow-up Q2 (normative, source-read) |
| Verification gains the two-help-surface note, so a flag-existence check is not read from `help build --long` alone. | BZL-CC-27 | `bazel help all --long` is not a subcommand and startup options never appear in `help build --long`; a flag can live in either surface. | flag-defaults measurement Q1 (measured) |
| Rationale gains the standalone-IWYU bridge: `iwyu_tool.py` consumes the same compilation database, which is BZL-CC-11's no-aspect path. | BZL-CC-28 | Connects the IDE floor to the IWYU precondition instead of leaving them unrelated. | 4b follow-up Q2 (measured) |
| Verification gains `bazel clean` before the profile and the measured reason: an action-cache hit skips sandbox construction entirely (changing `--sandbox_add_mount_pair` alone did not bust a hit), so a warm profile is a false pass. Cross-reference to BZL-CC-31 added. | BZL-CC-30 | The row's own check could report a pass for the wrong reason. | sandbox measurement Q2 (measured, WSL2) |
| NEW — `--sandbox_base` as a two-precondition CONSIDER: the measured tmpfs-vs-tmpfs null result with its WSL2/harness caveat, the `1777`-versus-`700` parent-directory exposure, the hermetic-sandbox hardlink→copy `EXDEV` downgrade, and the previously unrecorded `oldName = "experimental_sandbox_base"`. Settles M-L-17. | BZL-CC-31 | M-L-17 was "not settled, and not researched"; `BZL-HERM`'s own 2026-09-06 revision ships no `--sandbox_base` row (grep: zero occurrences), so the follow-up's proposed home did not take it. | 4b follow-up Q3 + NEW-1/NEW-2 (measured) |
| NEW — `protoc` is a prebuilt download by default on protobuf ≥ 34.0, so a whole-graph toolchain claim is false about it; the canonical flag path is `//bazel/flags:prefer_prebuilt_protoc` and every citation names a protobuf version. MUST (claim accuracy) — the thirteenth. | BZL-CC-32 | The flag fact was assigned to `BZL-FLAG`, which carries no such row at its own revision; the C++-toolchain-reach half is this family's regardless. | protobuf follow-up § 2 / NEW-4 (measured, four tagged versions) |
| NEW — C++ coverage is documented for Linux and macOS only, and macOS needs an explicit `GCOV_PREFIX_STRIP`; the lcov-format half stays [BZL-TEST-27](bazel-testing.md)'s. SHOULD, with the Windows half labelled documented-absence rather than measured failure. | BZL-CC-33 | A second silent-empty cause on the same language, C++-specific and unowned by the coverage family's own rows. | coverage follow-up § 1 (normative) |
| Verdict 1 gains the measured modular-API cost split; Verdict 4 gains the ahead-of-release failure direction; Verdict 6 gains the corrected BZL-HERM-27 citation, the MSVC root cause and the exact `C:/tmp` recipe; Verdict 9 gains the IWYU bridge; Verdict 13 gains `--sandbox_base`'s `oldName` and the BZL-HERM hand-back. | Verdict 1, 4, 6, 9, 13 | Each follows the rule change it explains. | all four follow-ups |
| Verdict 14 rewritten from the real binaries: `toolchains_llvm` 1.9.0 carries no named modules; the measured `cc_*` removed-rule stub error shape and the green `load()` form on both majors; `--sandbox_base`/`--experimental_use_hermetic_linux_sandbox` defaults; `bazel_iwyu`, `rules_lint`, protobuf and `rules_cc` module-action-type facts added. | Verdict 14 | Version boundaries were partly inferred from `master` reads; they are now binary- and tag-read. | flag-defaults measurement Q1/Q4 + 4b follow-up |
| Verdicts 15-19 added: the three documented gaps (the `cpp_modules` far side, `--sandbox_base` on disk, Windows's absent sandbox), the IWYU landscape, the prebuilt-`protoc` reach, the coverage platform gaps, and the restated no-fleet-consumer scope. | Verdict | The instruction to move established gaps into the Verdict rather than leave them in the open-questions table. | this revision |
| Four rows removed from "deserves another research round" (modular toolchain API, IWYU under Bazel, sandbox base, and the sandbox-strategy × strict-deps Windows question); two rewritten as the exact experiments that close documented gaps (a) and (b); two added (`bazel_iwyu` longevity, sanitizer features under a modular toolchain). | Open questions | Answered, or moved to the Verdict as gaps no further round of the same kind closes. | 4b + Windows follow-ups |
| "M-L rows this ruleset does not settle" updated: M-L-17 settled by BZL-CC-31 and removed from the gap list; M-L-08's entry now distinguishes the settled mechanism from the unsettled outcome. | M-L section | Consequence of the two rule changes above. | 4b follow-up |
| Human-decision question 2's default re-grounded on the measured API stability instead of "no documented trap list". | Open questions | The evidence behind the default changed class from argued to measured. | 4b follow-up Q1 (measured) |
| Ruleset preamble re-counted (33 rules, 13 MUST), boundaries extended to name `BZL-TEST` and `BZL-ARCH-31`, and the cross-reference list gained BZL-TEST-24/-25/-27, BZL-ARCH-31, the `cc_proto_library` load form and the Windows clause on BZL-HERM-26. | preamble | New rows and new sibling ownership. | this revision |
| Failure modes 18-22 appended (README ahead of release, the two `bazel_iwyu` projects, `--sandbox_base` as a free win, defensive rewrites on every `rules_cc` bump, the stale `prefer_prebuilt_protoc` path); failure mode 1 gains the measured `cc_*` stub error shape and 11 gains the two-help-surface note. | AI-agent failure modes | Each new trap is demonstrated in a follow-up or a measurement, not hypothesised. | all inputs |
| Frontmatter: six inputs added to `consolidates`, `revised: 2026-09-06` added, `builds_on` extended with BZL-ARCH-31 and the BZL-TEST rows, `grounded_in` re-pointed at all seven Corrections blocks. Fleet sections re-counted to -33 and given the "measurements changed nothing here" bullet. | frontmatter, fleet sections | Provenance for this pass. | — |

## Key sources

| URL | What it grounds |
|---|---|
| [bazelbuild/rules_cc README](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md) | The verbatim "does not yet offer a hermetic toolchain distribution", the four named third-party projects with no endorsement, and the autodetect off-switch still documented as live (BZL-CC-01, -10) |
| [rules_cc `unix_cc_toolchain_config.bzl`](https://github.com/bazelbuild/rules_cc/blob/main/cc/private/toolchain/unix_cc_toolchain_config.bzl) | The real `layering_check`/`use_module_maps` feature definitions (`-fmodules-strict-decluse -Wprivate-header`) and the `_sanitizer_feature` helper's baked-in flags (BZL-CC-12, -18) |
| [rules_cc `cc/toolchains/toolchain.bzl`, diffed 0.1.1 vs 0.2.22](https://github.com/bazelbuild/rules_cc/blob/main/cc/toolchains/toolchain.bzl) + [commit `31f137fd`](https://github.com/bazelbuild/rules_cc/commit/31f137fd8838bb961332df8857b84c75f769333b) | The public macro's attribute stability (3 additions, 0 renames/removals across 21 releases) against the built-in argument fragments' three `select()` rewrites in five weeks (BZL-CC-01) |
| [rules_cc `examples/rule_based_toolchain`](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/examples/rule_based_toolchain/toolchains/clang/BUILD.bazel) | The working `cc_toolchain()` call from `@rules_cc//cc/toolchains` — the third branch shown rather than described, and the two edits it needed in 14 months (BZL-CC-01) |
| [rules_cc `cc/toolchains/args/layering_check/BUILD`](https://github.com/bazelbuild/rules_cc/blob/0.2.22/cc/toolchains/args/layering_check/BUILD) + [`cc/toolchains/actions/BUILD`](https://raw.githubusercontent.com/bazelbuild/rules_cc/0.2.22/cc/toolchains/actions/BUILD) | `layering_check`'s fragment targets `compile_actions` while `cpp20_module_compile`/`cpp20_module_codegen`/`cpp_module_deps_scanning` already ship as disjoint action types — neither references the other (BZL-CC-05) |
| [bazel-contrib/toolchains_llvm README @ `v1.9.0`](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/v1.9.0/README.md) + [@ `main`](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) + [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843) | The tag-versus-`main` split: no named-modules section at v1.9.0, the feature merged to `main` 2026-09-02, and the `cc_toolchain_config.bzl` diff that gates `-fno-cxx-modules` off exactly when `cpp_modules` is on (BZL-CC-04, -05, -10) |
| [bazel-contrib/toolchains_llvm README](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) | Sanitizer features and the `--host_features` framing, the four tested cross-compile pairs, the Yocto/Debian `cxx_include_layout` trap, the `layering_check`-preserving default, and MSan's no-prebuilt statement (BZL-CC-05, -08, -09, -19, -20) |
| [uber/hermetic_cc_toolchain README](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md) | UBSAN-by-default, the Known Issues (zig cache outside the output base, unimplemented OSX sysroot), and the confirmed *absence* of any compatibility list (BZL-CC-06, -07, -10) |
| [ziglang/zig#4830](https://github.com/ziglang/zig/issues/4830) | The Zig maintainer's own account: debug mode and its UBSAN checks are inferred from the absence of an optimization flag, by design (BZL-CC-06) |
| [Build Encyclopedia — C/C++ rules, 8.7.0](https://bazel.build/versions/8.7.0/reference/be/c-cpp) / [9.1.0](https://bazel.build/versions/9.1.0/reference/be/c-cpp) | Attribute text for `includes`, `strip_include_prefix`, `include_prefix`, `implementation_deps`, `hdrs_check` and `module_interfaces`, plus the direct-only header-inclusion-checking scope — diffed byte-for-byte across both live majors (BZL-CC-15, -16, -17, -27) |
| [Bazel command-line reference, 8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference) / [9.1.0](https://bazel.build/versions/9.1.0/reference/command-line-reference) | Exact `--features`/`--host_features`/`--strip` text and defaults, and the `--sandbox_base`/`--sandbox_tmpfs_path`/`--reuse_sandbox_directories` help text — 9.1.0 is the closest live 9.x snapshot, since no 9.2.0 doc snapshot exists (BZL-CC-18, -19, -31) |
| [bazelbuild/bazel#21592](https://github.com/bazelbuild/bazel/issues/21592) + [#21832](https://github.com/bazelbuild/bazel/pull/21832) | The bug the map's M-L-06 traces to, read in full with the maintainers' investigation, and the 7.3.0 fix — the primary evidence behind the polarity correction (BZL-CC-14) |
| [maskray — "Layering check with Clang"](https://maskray.me/blog/2022-09-25-layering-check-with-clang) | The `.cppmap` generation mapping and a real command line, with the direct-includes-only failure shown rather than asserted; reproducible and corroborated by the `rules_cc` source read (BZL-CC-11, -12) |
| [BCR `modules/bazel_iwyu/metadata.json`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/bazel_iwyu/metadata.json) + [RealtimeRoboticsGroup/bazel_iwyu `bazel/iwyu/iwyu.bzl`](https://raw.githubusercontent.com/RealtimeRoboticsGroup/bazel_iwyu/main/bazel/iwyu/iwyu.bzl) + [storypku/bazel_iwyu](https://github.com/storypku/bazel_iwyu) | Which `bazel_iwyu` a `bazel_dep` resolves to, the aspect's `CcInfo.compilation_context`-only input set, and the stale namesake (BZL-CC-11, -12) |
| [aspect-build/rules_lint `lint/` tree @ v2.9.0](https://github.com/aspect-build/rules_lint/tree/v2.9.0/lint) | Direct evidence that no IWYU linter exists there — only `clang_tidy.bzl` and `cppcheck.bzl` for C++ (BZL-CC-11) |
| [rules_foreign_cc `cc_toolchain_util.bzl`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/cc_toolchain_util.bzl) + [#1221](https://github.com/bazel-contrib/rules_foreign_cc/issues/1221) | `FOREIGN_CC_DISABLED_FEATURES` and a live user report plus maintainer confirmation that `layering_check` cannot be re-enabled for a wrapped dependency (BZL-CC-22) |
| [rules_foreign_cc `framework.bzl`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/framework.bzl) + [`docs/src/index.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/docs/src/index.md) | The `lib_source`/`deps`/`out_*` contract and the ruleset's own "not fully under your control" scope statement (BZL-CC-23, -24) |
| [`CppOptions.java` @ 8.7.0 / 9.0.0 / 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java) | `--experimental_cpp_modules`'s exact name, `false` default, `EXPERIMENTAL` tag and no-guarantees help text, unchanged across all three tags; and `--experimental_generate_llvm_lcov`'s `false` default (BZL-CC-27, -33; [BZL-TEST-27](bazel-testing.md)) |
| [bazelbuild/bazel#4005](https://github.com/bazelbuild/bazel/issues/4005) + [#27927](https://github.com/bazelbuild/bazel/pull/27927)/[#28190](https://github.com/bazelbuild/bazel/pull/28190) | The C++20-modules merge-then-revert cycle (2025-12-10 → 2026-01-08) and the close-then-reopen of the 2017 tracking issue — why any module-support claim must be dated (BZL-CC-27) |
| [Hedron `ImplementationReadme.md`](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/ImplementationReadme.md) + [README](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/README.md) | Why `aquery` and not `query`/`cquery`/`action_listener` (with the 30s-vs-30m timing), the explicit manual-refresh staleness model, and the generic compilation-database bridge standalone IWYU consumes (BZL-CC-28, -11) |
| [bazelbuild/bazel#19208](https://github.com/bazelbuild/bazel/issues/19208) + [#22164](https://github.com/bazelbuild/bazel/issues/22164) | The MSVC path-absoluteness cross-compile bug (open since 2023-08-09) and the native-Windows mis-resolution bug auto-closed `not_planned` 2026-08-07 — the shared autodetected-toolchain root cause (BZL-CC-03, -29) |
| [bazelbuild/bazel#16711](https://github.com/bazelbuild/bazel/issues/16711) + [`SandboxOptions.java` @ 8.7.0 / 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | The symlinked-sandbox cost, the 300K-input figure, `--reuse_sandbox_directories`'s rename and `true` default across 8.7.0-9.2.0, and `--sandbox_base`'s own `oldName = "experimental_sandbox_base"` (BZL-CC-30, -31, Verdict 13) |
| [`LinuxSandboxedSpawnRunner.java`](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxedSpawnRunner.java) + [`HardlinkedSandboxedSpawn.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/HardlinkedSandboxedSpawn.java) @ 9.2.0 | The symlink-versus-hardlink staging branch on `useHermetic`, and the caught-`IOException`-falls-back-to-copy code behind BZL-CC-31's second precondition |
| [`WindowsSandboxedSpawnRunner.java`](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/sandbox/WindowsSandboxedSpawnRunner.java) + [bazel.build/configure/windows](https://bazel.build/configure/windows) | The BuildXL-based `windows-sandbox` that exists in source but ships no binary, and the `startup --output_user_root=C:/tmp` MAX_PATH recipe whose root cause is MSVC's own long-path limit (BZL-CC-14, Verdict 6 and 15c) |
| [protobuf `bazel/toolchains/BUILD` @ v33.4 / v34.0](https://github.com/protocolbuffers/protobuf/blob/v34.0/bazel/flags/BUILD) + [`bazel/flags/BUILD` @ v36.1](https://github.com/protocolbuffers/protobuf/blob/v36.1/bazel/flags/BUILD) + [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | `prefer_prebuilt_protoc`'s path move to `//bazel/flags:` and its `False`→`True` default flip at 34.0, plus Bazel 9's enforced protobuf ≥ 33.4 graph minimum (BZL-CC-32) |
| [bazel.build/configure/coverage](https://github.com/bazelbuild/bazel/blob/master/site/en/configure/coverage.md) + [`collect_cc_coverage.sh` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_cc_coverage.sh) | The Linux/macOS-only C++ coverage path, the `GCOV_PREFIX_STRIP` "no coverage data will be found" statement, and the `PROFDATA`-versus-`LLVM_LCOV` branch (BZL-CC-33; [BZL-TEST-27](bazel-testing.md)) |
| [Pigweed — "Shaping a better future for Bazel C/C++ toolchains"](https://pigweed.dev/blog/06-better-cpp-toolchains.html) | The four symptoms of the autodetected default and the `pw_cc_toolchain` → SEED 0113 → `rules_cc` 0.0.10 lineage — argued-class, which is why BZL-CC-03 is SHOULD (Verdict 11) |
| [rules_fuzzing `.bazelrc`](https://github.com/bazelbuild/rules_fuzzing/blob/master/.bazelrc) + [guide](https://github.com/bazelbuild/rules_fuzzing/blob/master/docs/guide.md) | The `cc_engine`/`cc_engine_instrumentation`/`cc_engine_sanitizer` build-setting composition behind named configs (BZL-CC-21) |
| [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md) | Flag defaults read from the real 8.7.0/8.8.0/9.2.0 binaries, and the `cc_*`-only `_removed_rule_failure` stub naming `buildifier --lint=fix` (Verdict 14, failure mode 1) |
| [`bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md`](bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md) | `linux-sandbox` as the measured strategy, the whole-root read-only remount, the `HOME`-unset action environment, and the action-cache-masking observation (BZL-CC-07, -30) |
