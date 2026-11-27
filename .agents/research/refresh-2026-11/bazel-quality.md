---
title: bazel-quality delta refresh, 2026-09-06 to 2026-11-27
pair: bazel-quality
date: 2026-11-27
window_start: 2026-09-06
model: opus
consolidates:
  - .agents/research/refresh-2026-11/bazel-quality/bazel-core-releases-lts-and-flag-flips.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-remote-cache-sandbox-and-experimental-flags.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-lint-test-and-target-selection-tooling.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-python-and-js-rulesets.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-cpp-toolchains-and-protobuf.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-rust-rules-rust-and-rules-rs.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-go-jvm-swift-rulesets.md
  - .agents/research/refresh-2026-11/bazel-quality/bazel-recent-shifts-not-yet-covered.md
revises:
  - .agents/research/bazel-flags-and-versions.md
  - .agents/research/bazel-caching-rbe.md
  - .agents/research/bazel-ci-and-target-selection.md
  - .agents/research/bazel-starlark-and-build.md
  - .agents/research/bazel-testing.md
  - .agents/research/bazel-hermeticity-determinism.md
  - .agents/research/bazel-python.md
  - .agents/research/bazel-typescript.md
  - .agents/research/bazel-cpp.md
  - .agents/research/bazel-rust.md
  - .agents/research/go-bazel.md
  - .agents/research/jvm-bazel-java.md
  - .agents/research/swift-bazel.md
---

# bazel-quality delta refresh, 2026-09-06 to 2026-11-27

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Edit list](#edit-list)
- [Spillover round](#spillover-round)

## Verdict

1. This is a delta update. Every measurement disclosure in the pair keeps its original date and versions, because nothing was re-run on a Bazel binary in this window. Where a newer release exists, a dated clause is added beside the old statement rather than replacing it.
2. Three statements are wrong today and are corrected in place: BZL-CACHE-28 says no chunking-function flag has ever shipped (it ships on 8.9.0 and the 10.0.0 release candidates); BZL-CC-04 says named-modules support exists in no tagged `toolchains_llvm` release (it shipped in 1.9.1); BZL-PY-28 says `lockfiles =` does not exist (it shipped in rules_python 2.4.0).
3. Behaviour flips upstream make further rows incomplete, and those rows gain a version clause: `--rewind_lost_inputs` defaults on from Bazel 9.3.0 (BZL-CACHE-12), tests without a compatible execution platform fail at run time from 9.3.0 (BZL-TEST-28), rules_python's default interpreter moved from 3.11 to 3.14 at 2.4.0 (BZL-PY-01), pnpm 12 lockfiles parse from `aspect_gazelle_js` 1.2.3 (BZL-JS-34), gazelle's 2.0.0 betas rename `check_direct_dependencies` to `checks` (BZL-GO-13), rules_swift_package_manager 1.26.0 no longer drags in rules_swift 3.6.0 (BZL-SWIFT-02), and buildtools 10.x changes the default warning set.
4. The pair was silent on Bazel 10. It gains the provisional 10.0 flip list beside the 8-to-9 checklist (BZL-FLAG-15) and a provisional removed-symbol grep (BZL-FLAG-31). Both are marked release-candidate stage, because 10.0.0 has not shipped on 2026-11-27. No 10.x guidance is written as a final fact, and no standalone Bazel 10 rule is added.
5. Two new rules are added: BZL-FLAG-36 (the pin is the only fix for the bundled JDK and its trust store, with the current security floors) and BZL-CI-34 (both bazel-diff hash files come from one bazel-diff version).
6. bazel-diff was rewritten as a Rust binary with a Bazel 8 floor, so ci.md's header gains a currency sentence, and BZL-CI-21 and BZL-CI-23 are corrected for the new query and auto-detection mechanics. BZL-CI-21 stays MUST, because the measured repository-rule case was not re-measured.
7. Version-only pin bumps (skylib, rules_shell, rules_cc, target-determinator, aspect_rules_lint, bazelisk, rules_rust 0.75.0, protobuf 36.2 and similar) are not written into the headers. Those headers name what was measured, and the new versions were not measured. Where a newer release changes a fact a row states, the row itself carries the clause.
8. The rule index gets one currency sentence and nothing else. Every Non-Negotiable still holds as written. The rule's bump is patch; the reference skill's bump is minor, for the two new rules.

## Changed rules

Each entry gives the old claim, the new claim and the primary source. The exact text to find and replace is in the [Edit list](#edit-list).

### BZL-FLAG-15 (flags.md)

- Old: the checklist reads the incoming major's "flipped in X.0" list from that major's release notes, and the section names only the 9.0.0 notes.
- New: the section names the provisional 10.0 list: six flags flipped in the 10.0.0rc1 to rc3 notes, a list the rc4 notes no longer carry. The verification adds a check for a 404 on the `10.0.0` release tag, which marks that list as provisional.
- Source: https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc3 and rc1, rc2, rc4 (2026-10-07 to 2026-11-19); `gh api repos/bazelbuild/bazel/releases/tags/10.0.0` returned 404 on 2026-11-27.

### BZL-FLAG-31 (flags.md)

- Old: it names only the 8-to-9 command and enum removals.
- New: it adds the 9-to-10 symbol removals from the release-candidate notes (`new_git_repository`, `remote_execution_properties`, `@bazel_tools//src/conditions:host_windows` and `:remote`, `symlink_files`, and a `bazel_dep()` on the current module) and a new grep block, BZL-FLAG-31-b, to run before a 10.x bump. That block is separate from the existing one, because those symbols are still valid on 9.x and the existing block treats any hit on a 9.x pin as a finding.
- Source: https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4 (2026-11-19).

### BZL-CACHE-12 (caching.md)

- Old: `MAX_REPEATED_LOST_INPUTS = 20` is hard-coded, and the finding is `rewind_lost_inputs` set alongside `retries=0`.
- New: the constant is hard-coded through 9.2.0, and 8.9.0 and 10.0 make it configurable through `--experimental_max_repeated_lost_inputs` (default 20). Rewinding is on by default from 9.3.0, so `retries=0` on a 9.3.0 or later pin is the finding even with no rewind line. The measured outcomes are stated as not re-measured on 9.3.x.
- Source: https://github.com/bazelbuild/bazel/pull/31416 (merged 2026-09-30, shipped in 9.3.0 on 2026-10-07); https://github.com/bazelbuild/bazel/pull/32354 (merged 2026-11-02, in 8.9.0).

### BZL-CACHE-17 (caching.md)

- Old: the disk-cache GC flags are named only by their experimental spelling.
- New: the rationale adds that the 10.0.0rc4 notes take the flags out of experimental as `--disk_cache_gc_max_size`, `--disk_cache_gc_max_age` and `--disk_cache_gc_idle_delay`, and says to read the spelling off the pin. The verification grep already matches both spellings.
- Source: https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4.

### BZL-CACHE-28 (caching.md)

- Old: "Never write `--experimental_remote_cache_chunking_function` or any `rep_max_cdc` selector — no such flag has ever shipped."
- New: write the selector only on a pin that has it. It is on 8.9.0 and the 10.0.0 release candidates (values `auto` as the default, `fast_cdc_2020` and `rep_max_cdc`), it is not on 8.8.x or 9.2.0, and 9.3.x was not checked. Enabling chunking stays off by default and stays CONSIDER.
- Source: https://github.com/bazelbuild/bazel/pull/32385 (8.9.0, released 2026-11-19); https://github.com/bazelbuild/bazel/releases/tag/8.9.0.

### BZL-CC-04 (cpp.md)

- Old: "as of 2026-09-06 it exists only on `main` … in no tagged release and in no BCR version", and the verification says only a commit-pinned override carries the feature.
- New: the feature first shipped in `toolchains_llvm` 1.9.1 (2026-09-16, on the BCR). A pin below 1.9.1 with named modules in use is the finding. The rule also names all three switches the 1.13.0 README requires: `--experimental_cpp_modules`, `--features=cpp_modules` and `-std=c++20` or newer.
- Source: https://github.com/bazel-contrib/toolchains_llvm/blob/v1.13.0/CHANGELOG.md (entry for 1.9.1); https://github.com/bazel-contrib/toolchains_llvm/blob/v1.13.0/README.md (section "C++ named modules").

### BZL-CC-10 (cpp.md)

- Old: the rationale calls the `main`-only `cpp_modules` feature a present-tense example.
- New: the example is dated 2026-09-06, with the note that 1.9.1 shipped it ten days later.
- Source: the same CHANGELOG as BZL-CC-04.

### BZL-PY-01 (python.md)

- Old: the default is "3.11 at tag 2.3.3, already 3.14 on `main`".
- New: the default is 3.11 through 2.3.x and 3.14 from 2.4.0 (2026-09-22).
- Source: https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md (v2.4.0 entry).

### BZL-PY-21 (python.md)

- Old: the accepted entrypoints are a wrapper's `main()` or a `py_console_script_binary` macro.
- New: the first-party `pytest_test` rule (rules_python 2.5.0 and later) is an accepted entrypoint. The rule notes that `pytest_test` brings `pytest-randomly` ordering and `pytest-shard`, which can surface hidden order dependence.
- Source: the rules_python CHANGELOG, v2.5.0 entry (2026-10-31).

### BZL-PY-28 (python.md)

- Old: "Use `requirements =` against rules_python ≤2.3.3; `lockfiles =` does not exist yet."
- New: use `requirements =` at 2.3.x and older, and `lockfiles =` from 2.4.0, where `requirements =` is deprecated. The severity splits into MUST for `lockfiles =` below 2.4.0 and SHOULD for `requirements =` on 2.4.0 or later.
- Source: the rules_python CHANGELOG, v2.4.0 entry ("Deprecate the `requirements` argument of `gazelle_python_manifest` in favor of the format-agnostic `lockfiles` argument").

### BZL-JS-34 (typescript.md)

- Old: the pnpm 12 lockfile is an open upstream bug, and the check is `head -1 pnpm-lock.yaml`.
- New: the bug is fixed in `aspect_gazelle_js` 1.2.3 (2026-10-23), and the major-version dispatch stays 5, 6 and 9 only. The check reads the `lockfileVersion` line with grep, because a pnpm 12 file starts with `---`, so `head -1` no longer prints the version. A leading `---` with the plugin below 1.2.3 is the finding.
- Source: https://github.com/aspect-build/aspect-gazelle/issues/461 (closed 2026-10-20); https://github.com/aspect-build/aspect-gazelle/releases/tag/js-v1.2.3; `parser.go` at js-v1.2.3.

### BZL-JS-30 (typescript.md)

- Old: "BCR-published (v0.5.4, pushed 2026-03-06)".
- New: the newest BCR version is 0.5.3, and v0.5.4 is a GitHub tag only.
- Source: https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_playwright/metadata.json (read 2026-11-27).

### BZL-RUST-37 (rust.md)

- Old: no Bazel floor is stated for rules_rs.
- New: rules_rs 0.2.0 and later require Bazel 8.7 or newer, and the verification adds a `.bazelversion` check.
- Source: https://github.com/hermeticbuild/rules_rs/pull/324 (2026-10-29), released in v0.2.0.

### BZL-GO-13 (go.md)

- Old: "The attribute is `check_direct_dependencies`, not `checks`."
- New: that holds on gazelle 0.x (0.54.0). On the 2.0.0 beta line `checks` replaces it, and the old name prints a deprecation message. The default stays a warning on both lines, and the grep block matches both spellings.
- Source: https://github.com/bazel-contrib/bazel-gazelle/blob/master/internal/bzlmod/go_deps.bzl; https://github.com/bazel-contrib/bazel-gazelle/releases/tag/v2.0.0-beta.2 (2026-10-08).

### BZL-JAVA-05 (java.md)

- Old: the rationale says a misspelled flag "is rejected at the command line".
- New: `JavaOptions.java` declares `experimental_strict_java_deps` with `oldName = "strict_java_deps"` at 8.8.0, 9.2.0 and on `master`, so both spellings parse. The rule still writes the declared name. The verification adds an existence probe for the alias.
- Source: https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/rules/java/JavaOptions.java and the same file at tags 8.8.0 and 9.2.0.

### BZL-SWIFT-02 (swift.md)

- Old: a root declaring only rules_swift_package_manager resolves rules_swift 3.6.0.
- New: that holds for rules_swift_package_manager 1.25.0 and older. Version 1.26.0 (2026-11-19) declares rules_swift 4.2.1, and the root declaration still decides the pin.
- Source: https://github.com/cgrindel/rules_swift_package_manager/releases/tag/v1.26.0.

### BZL-SWIFT-05 (swift.md)

- Old: "(4.2.1 carries 6.2.1 to 6.4.0) … (`6.4.1`, exit 1)".
- New: rules_swift 4.3.0 adds 6.4.1 and 6.4.2, and the `6.4.1` failure is scoped to 4.2.1.
- Source: https://github.com/bazelbuild/rules_swift/compare/4.2.1...4.3.0 (`swift_release_metadata.json`).

### BZL-LARK-31 (starlark.md)

- Old: "8.5.1.4 preferred".
- New: the newest release is preferred (10.2.0 on 2026-11-27, whose runner template still carries both fixes by source read). The 8.5.1.3 floor is unchanged.
- Source: https://github.com/keith/buildifier-prebuilt/blob/10.2.0/runner.bash.template; https://github.com/keith/buildifier-prebuilt/releases/tag/10.2.0.

### BZL-CI-21 (ci.md)

- Old: an `Executing Query:` line reading `'//external:all-targets' + '//...:all-targets'` means cquery mode is off.
- New: only the presence of `deps(//...:all-targets)` is decisive. From v70.0.2 the `//external` term is skipped wherever `bazel info` shows no `//external` package. The rationale adds that from v62.0.0 default mode hashes every extension-generated repository from `bazel mod show_repo`. The measured repository-rule case was not re-measured, so the rule stays MUST.
- Source: https://github.com/Tinder/bazel-diff/pull/529 (2026-10-20); https://github.com/Tinder/bazel-diff/pull/606 (2026-11-02); https://github.com/Tinder/bazel-diff/blob/master/README.md.

### BZL-CI-23 (ci.md)

- Old: the flag is "auto-detected via `bazel mod graph`".
- New: from v70.0.2 `get-impacted-targets` auto-detects from the module graph recorded in the final hash file and falls back to asking Bazel. On `generate-hashes` the default is a literal `false`, and a `bazel info` probe skips the `//external` query instead.
- Source: https://github.com/Tinder/bazel-diff/pull/605 (2026-11-02); https://github.com/Tinder/bazel-diff/blob/master/src/main.rs.

### BZL-TEST-28 (testing.md)

- Old: the rationale says "unchanged through 9.2.0", and the verification says "the failure is loud: a toolchain-resolution error".
- New: the build setting is unchanged through 9.3.3 and 10.0.0rc4 by source read. From 9.3.0 a test without a compatible execution platform builds and fails only when it runs, so `bazel build` alone no longer surfaces the problem.
- Source: https://github.com/bazelbuild/bazel/releases/tag/9.3.0 (PR 30946); `tools/test/BUILD.tools` at 9.3.3 and 10.0.0rc4.

### BZL-HERM-01 (hermeticity.md)

- Old: the static PATH is `/bin:/usr/bin:/usr/local/bin` on POSIX.
- New: that holds through 9.x. The 10.0.0 release-candidate notes drop `/usr/local/bin`.
- Source: https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4.

### Dated clauses that are not rule rows

These are currency notes beside measurement disclosures. None changes an ID:

- the rules/bazel-quality.md intro (edit 1; release tags https://github.com/bazelbuild/bazel/releases/tag/9.3.0, https://github.com/bazelbuild/bazel/releases/tag/9.3.3, https://github.com/bazelbuild/bazel/releases/tag/8.8.1, https://github.com/bazelbuild/bazel/releases/tag/8.9.0 and https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4; the 10.0.0 release candidates and the 404 on the 10.0.0 tag are sourced under BZL-FLAG-15, and the `--rewind_lost_inputs` flip under BZL-CACHE-12);
- the flags.md LTS sentence (edit 2; the 2026-11-27 stages read from https://bazel.build/release, with tags https://github.com/bazelbuild/bazel/releases/tag/9.3.3, https://github.com/bazelbuild/bazel/releases/tag/8.9.0, https://github.com/bazelbuild/bazel/releases/tag/7.7.3 and https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4);
- the caching.md flag-surface paragraph;
- the cpp.md header;
- the python.md Gaps entry;
- the rust.md header (edit 34; rules_rust 0.75.0 of 2026-10-26 at https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0, the releases list at https://github.com/bazelbuild/rules_rust/releases, and the crate_universe fixes on main by 2026-11-24 at https://github.com/bazelbuild/rules_rust/commits/main, including [PR 4454](https://github.com/bazelbuild/rules_rust/pull/4454), [PR 4416](https://github.com/bazelbuild/rules_rust/pull/4416), [PR 4427](https://github.com/bazelbuild/rules_rust/pull/4427), [PR 4411](https://github.com/bazelbuild/rules_rust/pull/4411), [PR 4410](https://github.com/bazelbuild/rules_rust/pull/4410) and [PR 4383](https://github.com/bazelbuild/rules_rust/pull/4383));
- the go.md stamping paragraph, which notes that rules_go 0.64.0 dropped `-buildid=redacted` ([PR 4728](https://github.com/bazel-contrib/rules_go/pull/4728));
- the java.md header, where contrib_rules_jvm does have tagged releases (edit 42; tags 0.31.1 to 0.35.0 and the move to bazel-contrib/rules_jvm at https://github.com/bazel-contrib/rules_jvm/releases);
- the swift.md Gaps entry;
- the starlark.md header, buildifier warning count and Gaps entry (edit 51; buildtools 10.0.1 at https://github.com/bazel-contrib/buildtools/releases/tag/v10.0.1, 10.2.0 at https://github.com/bazel-contrib/buildtools/releases/tag/v10.2.0 with the counts read from https://github.com/bazel-contrib/buildtools/blob/v10.2.0/warn/warn.go, and `.bzl` coverage of `make-location` in [PR 1526](https://github.com/bazel-contrib/buildtools/pull/1526));
- the ci.md header (edit 53), which notes that bazel-diff was rewritten in Rust ([PR 498](https://github.com/Tinder/bazel-diff/pull/498), released in https://github.com/Tinder/bazel-diff/releases/tag/v48.0.0), that the README states a Bazel 8 floor (https://github.com/Tinder/bazel-diff/blob/master/README.md), and that https://github.com/Tinder/bazel-diff/releases/tag/v81.0.0 (2026-11-25) is the newest release.

## New rules

### BZL-FLAG-36 (flags.md, section "The Pin and the CI Matrix", after BZL-FLAG-05)

- Rule: Keep `.bazelversion` at or above the newest release of its own major that fixes the bundled JDK or its certificate store. Fix a Bazel-side JDK CVE or a CA distrust by bumping the pin, never by patching the host JDK. On 2026-11-27 that floor is 9.3.3, 8.9.0 and 7.7.3.
- Rationale: Bazel embeds its own JDK and trust store, so a host JDK update changes nothing Bazel runs. 9.3.1, 8.8.2 and 7.7.2 removed the distrusted eMudhra and Sectigo roots after the eMudhra CA compromise. 9.3.3, 8.9.0 and 7.7.3 (all 2026-11-19) update the bundled JDK for CVE-2026-114938. The advisory names JDK versions only, so the mapping to Bazel releases comes from the release notes. Unsupported majors get no fix. A model trained before this window knows none of these floors and reaches for the host JDK.
- Verification: `cat .bazelversion`, then list the non-prerelease tags with `gh api repos/bazelbuild/bazel/releases` and sort them by semver. A pin below the newest same-major release whose notes name a CVE or a certificate change is the finding. A pin on a Deprecated major is also the finding. An empty release list means the API call failed, never a pass.
- Severity: SHOULD.
- Sources: https://blog.bazel.build/2026/10/23/emudhra-ca-compromise.html; https://github.com/bazelbuild/bazel/releases/tag/9.3.3; https://github.com/advisories/GHSA-6g7j-4xh3-xq2q.

### BZL-CI-34 (ci.md, section "Selection Tool Miss Classes", after BZL-CI-25)

- Rule: Generate the starting and the final `bazel-diff` hash file with the same pinned `bazel-diff` version, and put that version in the key of any cache that stores a hash file.
- Rationale: The hash format moves between releases. v61.0.0 migrated cache entries to a new format (PR 525), and PR 608 states that for users of its flag the owning module and everything that depends on it hash differently once. A starting hash cached from `main` under one release and compared with a final hash from another can report changes no commit made or mask real ones, and the CI log looks the same in both cases. With releases arriving roughly daily, a wrapper that pins only one of the two steps drifts within a week.
- Verification: grep the CI wrapper for `bazel-diff`. Both `generate-hashes` steps must resolve the same pinned tag. Two different pins, an unpinned `latest`, or a cached starting hash whose cache key omits the version is the finding. Empty output means the wrapper does not use `bazel-diff`, and the row does not bind.
- Severity: SHOULD.
- Sources: https://github.com/Tinder/bazel-diff/pull/525; https://github.com/Tinder/bazel-diff/pull/608 (2026-11-03).

## Confirmed unchanged

Each claim below was checked against a primary source in a delta artifact and still holds on 2026-11-27:

- Non-Negotiables 1 to 19 in the rule index.
- The four 9.0.0 behaviour flips.
- `LOCK_FILE_VERSION` 24 on 8.7.0 and 28 from 8.8.0 through 10.0.0rc4 (BZL-FLAG-15 and the bzlmod rows).
- The `--lockfile_mode=error` crash fix shipped in 9.3.0.
- LTS stages and Support-Ends dates (BZL-FLAG-04 and BZL-FLAG-05).
- `incompatible_flags.yml` has had no commit since 2025-07-25 (BZL-FLAG-07).
- bazelisk still removes `last_downstream_green` (BZL-CI-09).
- `--enforce_project_configs` defaults to true on 8.9.0, 9.3.3 and 10.0.0rc4 (BZL-FLAG-32).
- The cgroup flag defaults to true on 9.x (BZL-FLAG-35). It becomes a no-op on 10, which BZL-FLAG-35's "on Bazel 9" wording already scopes.
- The repo contents cache is on by default on 9.x and off on 8.9.0 (BZL-MOD-33).
- `compatibility_level` stays a resolver no-op (BZL-MOD-09). The 10.0 notes extend this; the BCR-validation half was not re-checked.
- `--remote_cache_compression` defaults to false (BZL-CACHE-30), `--experimental_remote_cache_ttl` defaults to `3h` (BZL-CACHE-13), and `--remote_local_fallback` defaults to false (BZL-CACHE-26).
- The buildifier_prebuilt floor of 8.5.1.3 (BZL-LARK-31 and BZL-CORE-02).
- The rules_shell and rules_cc load paths.
- rules_bazel_integration_test has no `bazel_compatibility`.
- The BCR presubmit schema (BZL-CI-13).
- The target-determinator cache key (BZL-CI-22).
- `--experimental_cpp_modules`: same name, default false, experimental, through 9.3.3 and 10.0.0rc4 (BZL-CC-27).
- `layering_check` and module-map staging (BZL-CC-12 and BZL-CC-14).
- The rules_cc `layering_check` and `pic_flags` fragments, apart from an added filegroup (BZL-CC-01).
- protobuf `>=8.0.0` and the `proto_library` load path (BZL-FLAG-27 and BZL-FLAG-34).
- hermetic_cc_toolchain enables UBSAN by default.
- rules_rust docs still print `bazel sync` at 0.75.0 (Non-Negotiable 15 and BZL-RUST-03).
- The rules_rs `toolchains.toolchain(version = ...)` pin and the `--discard-stdout-on-success` behaviour (BZL-RUST-31 and BZL-RUST-40).
- gazelle_rust 0.1.0 (BZL-RUST-19).
- The rules_rust Windows disclaimer.
- The gazelle override precedence (BZL-GO-12).
- `go_sdk.from_file` and `-s -w` under strip (BZL-GO-01 and BZL-GO-15).
- `TOOLS_NOGO`.
- gazelle#1797 and rules_go#2396 remain open.
- `x_lambdas` defaults to `"class"` (BZL-JAVA-19), `strict_visibility` (BZL-JAVA-13), and the Kotlin ijar warning (BZL-JAVA-18).
- Swift upcoming-feature names and SE floors (BZL-SWIFT-08, -09 and -11).
- The rules_swift 4.3.0 `bazel_compatibility` and the three doc drifts (BZL-SWIFT-15).
- rules_mypy v0.41.0.
- pylock.toml issue 2787 is still open (BZL-PY-09).
- rules_ts 3.10.1 is still newest, and the transpiler and `_typecheck_test` behaviour is unchanged (Non-Negotiable 17).
- The three BZL-JS-06 issues are still open.
- rules_playwright still resolves to `github:mrmeku/rules_playwright` (BZL-JS-30's check).

## Open questions

Each item lacks a fetched primary source or a binary run, so it changes nothing in the pair:

1. Exit-code-39 reachability, the eviction outcomes and the `--experimental_remote_cache_eviction_retries` default have not been re-measured on 9.3.x, where rewinding is the default recovery path (BZL-CACHE-12 and Non-Negotiable 14). Whether `--rewind_lost_inputs` now renders on a help surface is also unknown.
2. It is unknown whether `--experimental_remote_cache_chunking_function` and `--experimental_max_repeated_lost_inputs` exist on 9.3.x. Both are confirmed on 8.9.0 and 10.0.0rc4 only.
3. It is unknown whether the experimental `--experimental_disk_cache_gc_*` spelling survives as an alias on 10.x.
4. The `--experimental_output_paths=strip` value set and help text (BZL-ARCH-22) and the verbatim `--repo_env` help sentence (BZL-HERM-05) were not re-read on 9.3.x.
5. On 10.x, a failing credential helper aborts HTTP downloads, and remote or auth flags can be reset with an empty value (10.0.0rc4 notes). No rule text is changed until 10.0.0 is final. Re-check BZL-CACHE-03, BZL-CACHE-04 and BZL-FLAG-19 then.
6. 10.x makes `--experimental_use_hermetic_linux_sandbox` fail where linux-sandbox is unsupported (bazel PR 32198). This is release-candidate stage, and BZL-CC-31 is unaffected on 8.x and 9.x.
7. On 10.x the remote repo contents cache covers all reproducible rules. It is unknown whether `getenv()` and `watch()` still disqualify a rule from it (BZL-MOD-16).
8. It is unknown whether BCR's `bcr_validation.py` still diffs `compatibility_level` (BZL-MOD-09). It is also unknown what the new `verify_no_binary_files` check (BCR PR 11940, 2026-11-23) detects. A publish-checklist row waits on reading that check.
9. Starlark static types were planned for 10.0, but the rc4 notes list none.
10. bazel-diff's toolchain-candidates file reports `complete: false`. A toolchain-priority miss class may deserve a CONSIDER row once it is measured.
11. bazel-diff's coverage of the specific measured BZL-CI-21 case, a repository-rule implementation reading a file no attribute names, was not re-measured on v62.0.0 or later.
12. Go: BZL-GO-15 and BZL-GO-14 byte identity was not re-measured on rules_go 0.64 or later. It is unknown whether rules_go 0.65.0's `go.mod` still produces the BZL-GO-11 uplift example. BZL-GO-12's citation of gazelle's `bzlmod.md` could not be located at `docs/bzlmod.md`, and whether a prose page exists elsewhere is undetermined, so the citation was not changed.
13. rules_ts#1008: TypeScript 7.x downloads all 20 native platform packages, about 180 MB. The issue is open, so no row was added; revisit if the issue persists past the next rules_ts release.
14. It is unknown whether rules_python's `lock()` now reads `uv.lock` (BZL-PY-07). It is also unknown whether the 2.5.0 `pyproject.toml` Python-version source lifts BZL-PY-02's exact-pin caveat.
15. protobuf 37.0's prebuilt-protoc resolution fix may move the `prefer_prebuilt_protoc` label (BZL-FLAG-34). 37.0 is still at rc3.
16. The BZL-CC-27 multi-interface history after 2026-09-06 was not re-read.
17. The effect of bazelisk v1.30.0 and v1.31.0 on `--migrate` (BZL-FLAG-17) was not determined.
18. The following stay unbound until they reach BCR as stable releases: the `aspect_rules_py` 2.0.0 alphas (alpha.11 renames the module to `rules_py`), the `aspect_rules_js` 4.0.0 alphas (renamed to `rules_js`), the rules_rust unreleased hub-alias deprecation (PR 4452), `rust-toolchain.toml` pinning (PR 4449), and the gazelle 2.0 line.

## Revision log

- rules/bazel-quality.md intro: added the post-baseline release range, the not-re-measured statement and the `--rewind_lost_inputs` flip at 9.3.0.
- flags.md header: added the LTS table as read on 2026-11-27.
- flags.md "Crossing 8 to 9" prose and BZL-FLAG-15: added the provisional 10.0 flip list and the 404 check.
- BZL-FLAG-31: added the 9-to-10 symbol removals and block BZL-FLAG-31-b.
- BZL-FLAG-36: new rule for the security patch floor of the pinned major.
- caching.md flag-surface paragraph: `--rewind_lost_inputs` defaults to true from 9.3.0.
- BZL-CACHE-12: `retries=0` on 9.3.0 or later is the finding, and `--experimental_max_repeated_lost_inputs` exists on 8.9.0 and 10.0.
- BZL-CACHE-17: added the non-experimental `disk_cache_gc` spelling on 10.0 release candidates.
- BZL-CACHE-28: corrected; the chunking-function flag ships on 8.9.0 and 10.0 release candidates.
- cpp.md header: `main` after PR #843 shipped as 1.9.1.
- BZL-CC-04: corrected; the floor is `toolchains_llvm` 1.9.1, and the three required switches are named.
- BZL-CC-10: dated the ahead-of-release example.
- BZL-PY-01: the default interpreter is 3.14 from rules_python 2.4.0.
- BZL-PY-21: `pytest_test` added as an entrypoint, with the random-order note.
- BZL-PY-28: corrected; `lockfiles =` from 2.4.0, `requirements =` deprecated there, and the severity split.
- python.md Gaps: the rename shipped, and pylock.toml is still unshipped through 2.5.1.
- BZL-JS-34: pnpm 12 lockfiles need `aspect_gazelle_js` 1.2.3, and the check no longer uses `head -1` alone.
- BZL-JS-30: the newest BCR version is 0.5.3.
- rust.md header: crate_universe repair status after 0.75.0.
- BZL-RUST-37: rules_rs 0.2.0 or later needs Bazel 8.7 or later.
- BZL-GO-13: `checks` on the gazelle 2.0.0 betas, and the grep matches both spellings.
- go.md stamping paragraph: byte identity measured on 0.63.0, with a re-measure note for 0.64 and later.
- java.md header: contrib_rules_jvm has tagged releases and a new repository location.
- BZL-JAVA-05: `--strict_java_deps` is an `oldName` alias, and an existence probe was added.
- BZL-SWIFT-02: the 3.6.0 resolution is bounded to rules_swift_package_manager 1.25.0 and older.
- BZL-SWIFT-05: rules_swift 4.3.0 adds Swift 6.4.1 and 6.4.2.
- swift.md Gaps: the 3.6.0 clause is bounded to 1.25.0 and older.
- starlark.md header: buildifier_prebuilt 10.2.0 is current.
- BZL-LARK-31: the newest release is preferred over 8.5.1.4.
- starlark.md warning count: the buildtools 10.x default set, `make-location` and its grep.
- starlark.md Gaps: the 10.x releases are audited by source read only.
- ci.md header: bazel-diff is now a Rust binary with a Bazel 8 floor, and v81.0.0 is current.
- BZL-CI-21: extension repositories are hashed from v62.0.0, and the `//external` term is no longer decisive.
- BZL-CI-23: the auto-detection mechanism from v70.0.2.
- BZL-CI-34: new rule; one bazel-diff version for both hash files.
- BZL-TEST-28: from 9.3.0 a missing execution platform fails at run time.
- BZL-HERM-01: `/usr/local/bin` leaves the static PATH on 10.0 release candidates.

## Edit list

All paths are relative to the repository root. Each "Find" string occurs exactly once in its file; this was checked on 2026-11-27. Apply each edit by replacing the Find text with the Replace text, or by inserting the Insert text on a new line directly after the line that contains the Anchor text.

### 1. rules/bazel-quality.md

Find:
```text
Where it names none, it held on both majors.
```
Replace:
```text
Where it names none, it held on both majors. Releases after that date — 9.3.0 to 9.3.3, 8.8.1 to 8.9.0 and the 10.0.0 release candidates (10.0.0 itself is unreleased on 2026-11-27) — were checked against release notes and tagged source, not re-run on a binary; the one default they flip on a released major is `--rewind_lost_inputs`, on from 9.3.0.
```

### 2. skills/bazel-quality-reference/flags.md

Find:
```text
Maintenance (7.7.1, ends Dec 2026), 6 Deprecated. Ruleset versions this file
```
Replace:
```text
Maintenance (7.7.1, ends Dec 2026), 6 Deprecated; on 2026-11-27 it read 10 Rolling (10.0.0 unreleased, 10.0.0rc4 newest), 9 Active (9.3.3), 8 Maintenance (8.9.0), 7 Maintenance (7.7.3), with every Support-Ends date unchanged. Ruleset versions this file
```

### 3. skills/bazel-quality-reference/flags.md

Find:
```text
the [9.0.0 notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0).
```
Replace:
```text
the [9.0.0 notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0).
For 9→10 no final list exists on 2026-11-27: 10.0.0 is unreleased, and the
rc1 to rc3 notes (rc3 dated 2026-11-10) flip six flags —
`--incompatible_no_implicit_file_export`,
`--incompatible_check_testonly_for_output_files`,
`--incompatible_exclude_starlark_flags_from_exec_config`,
`--experimental_fetch_all_coverage_outputs`,
`--experimental_split_coverage_postprocessing` and `--rewind_lost_inputs`,
already on from 9.3.0 — while the rc4 notes drop that section. Use that list
for step 2 only as provisional, and re-read it from the 10.0.0 notes once they
exist.
```

### 4. skills/bazel-quality-reference/flags.md (BZL-FLAG-15)

Find:
```text
Steps 5, 6 and 7: EMPTY = pass. | MUST |
```
Replace:
```text
Steps 5, 6 and 7: EMPTY = pass. For a 9→10 crossing run `gh api repos/bazelbuild/bazel/releases/tags/10.0.0 --jq .published_at` first: a 404 (the 2026-11-27 result) means 10.0.0 has not shipped and step 2's list is the provisional release-candidate one. | MUST |
```

### 5. skills/bazel-quality-reference/flags.md (BZL-FLAG-31, rule)

Find:
```text
and `bazel sync --only=` (deleted at 9.0.0; the replacement is `bazel fetch --repo=@<repo>`).
```
Replace:
```text
and `bazel sync --only=` (deleted at 9.0.0; the replacement is `bazel fetch --repo=@<repo>`). For 9→10 the release-candidate notes (10.0.0rc4, 2026-11-19) remove `new_git_repository` (use `git_repository`), the platform attribute `remote_execution_properties` (use `exec_properties`), the `@bazel_tools//src/conditions:host_windows` and `:remote` settings and the `symlink_files` attribute of `http_archive` and `archive_override`, and reject a `bazel_dep()` on the current module.
```

### 6. skills/bazel-quality-reference/flags.md (BZL-FLAG-31, verification)

Find:
```text
A command spelled inside generated shell or `.bzl` text is outside this grep. | MUST |
```
Replace:
```text
A command spelled inside generated shell or `.bzl` text is outside this grep. Before a bump to 10.x, see block BZL-FLAG-31-b — any hit is a removal to port first, EMPTY = pass; that list is release-candidate stage until the 10.0.0 notes exist, so re-read it then. | MUST |
```

### 7. skills/bazel-quality-reference/flags.md (block BZL-FLAG-31-b, insertion)

Anchor (the line to insert after):
```text
xargs -0 -r grep -H -n -E -e 'analyze-profile' -e 'skyframe=working_set' -e 'sync --only' --
```
Insert:
```text
# BZL-FLAG-31-b
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/MODULE.bazel' ':(glob)**/*.bzl' ':(glob)**/BUILD*' | xargs -0 -r grep -H -n -e 'new_git_repository' -e 'remote_execution_properties' -e 'src/conditions:host_windows' -e 'src/conditions:remote' -e 'symlink_files' --
```

### 8. skills/bazel-quality-reference/flags.md (new row BZL-FLAG-36, insertion)

Anchor (the line to insert after, which ends the BZL-FLAG-05 row):
```text
EMPTY (no such claim anywhere in the artifact) = the artifact is silently single-major, which is its own finding. | CONSIDER |
```
Insert:
```text
| BZL-FLAG-36 | Keep `.bazelversion` at or above the newest release of its own major that fixes the bundled JDK or its certificate store, and fix a Bazel-side JDK CVE or CA distrust by bumping the pin, never by patching the host JDK. On 2026-11-27 that floor is 9.3.3, 8.9.0 and 7.7.3. | Bazel embeds its own JDK and trust store, so a host JDK update changes nothing Bazel runs. 9.3.1, 8.8.2 and 7.7.2 removed the distrusted eMudhra and Sectigo roots after the eMudhra CA compromise ([Bazel blog, 2026-10-23](https://blog.bazel.build/2026/10/23/emudhra-ca-compromise.html)), and 9.3.3, 8.9.0 and 7.7.3 (all 2026-11-19) update the bundled JDK for CVE-2026-114938 ([9.3.3 notes](https://github.com/bazelbuild/bazel/releases/tag/9.3.3)). The advisory names JDK versions only, so the mapping to Bazel releases is the release notes'. Unsupported majors get no fix. | `cat .bazelversion`, then `gh api repos/bazelbuild/bazel/releases --jq '.[] \| select(.prerelease==false) \| .tag_name'` sorted by semver: a pin below the newest same-major release whose notes name a CVE or a certificate change is the finding. A pin on a Deprecated major is the finding too, because no fix will ship for it. An EMPTY release list means the API call failed, never a pass. | SHOULD |
```

### 9. skills/bazel-quality-reference/caching.md

Find:
```text
on either help surface while parsing fine, from 8.7.0 through 9.1.0 — a
```
Replace:
```text
on either help surface while parsing fine, from 8.7.0 through 9.1.0, and
defaulting to `true` from 9.3.0 ([#31416](https://github.com/bazelbuild/bazel/pull/31416)) — a
```

### 10. skills/bazel-quality-reference/caching.md (BZL-CACHE-12, rule)

Find:
```text
and never set it to `0` believing `--rewind_lost_inputs` covers the gap.
```
Replace:
```text
and never set it to `0` believing `--rewind_lost_inputs` covers the gap — on 9.3.0 and later rewinding is on by default, so `retries=0` there is exactly that configuration.
```

### 11. skills/bazel-quality-reference/caching.md (BZL-CACHE-12, rationale)

Find:
```text
then exhausts a hard-coded `MAX_REPEATED_LOST_INPUTS = 20` (byte-identical 8.7.0 through 9.2.0; the 21st loss trips it, hence the `#21` in the message) and still exits 1.
```
Replace:
```text
then exhausts `MAX_REPEATED_LOST_INPUTS = 20` (hard-coded and byte-identical 8.7.0 through 9.2.0; 8.9.0 and 10.0 expose it as `--experimental_max_repeated_lost_inputs`, default 20, [#32354](https://github.com/bazelbuild/bazel/pull/32354); the 21st loss trips it, hence the `#21` in the message) and still exits 1. 9.3.0 made rewinding the default recovery path for Build without the Bytes ([9.3.0 notes](https://github.com/bazelbuild/bazel/releases/tag/9.3.0)), and none of these outcomes has been re-measured on 9.3.x.
```

### 12. skills/bazel-quality-reference/caching.md (BZL-CACHE-12, verification)

Find:
```text
(c) `rewind_lost_inputs` present **alongside** `retries=0` is the finding.
```
Replace:
```text
(c) `retries=0` **alongside** `rewind_lost_inputs`, or alongside a `.bazelversion` at 9.3.0 or later where rewinding is the default, is the finding.
```

### 13. skills/bazel-quality-reference/caching.md (BZL-CACHE-17)

Find:
```text
the feature is opt-in, not automatic-by-version (measured `0` on 8.7.0, 8.8.0 and 9.2.0).
```
Replace:
```text
the feature is opt-in, not automatic-by-version (measured `0` on 8.7.0, 8.8.0 and 9.2.0). The 10.0.0rc4 notes take the flags out of experimental as `--disk_cache_gc_max_size`, `--disk_cache_gc_max_age` and `--disk_cache_gc_idle_delay`, so read the spelling off the pin.
```

### 14. skills/bazel-quality-reference/caching.md (BZL-CACHE-28, rule)

Find:
```text
Never write `--experimental_remote_cache_chunking_function` or any `rep_max_cdc` selector — no such flag has ever shipped.
```
Replace:
```text
Write `--experimental_remote_cache_chunking_function` (values `auto`, the default, `fast_cdc_2020` and `rep_max_cdc`) only on a pin that has it: 8.9.0 and the 10.0.0 release candidates do, 8.8.x and 9.2.0 do not, and 9.3.x was not checked.
```

### 15. skills/bazel-quality-reference/caching.md (BZL-CACHE-28, rationale)

Find:
```text
The selector shipped nowhere: its PR closed unmerged and `GrpcCacheClient.java` hardcodes `FAST_CDC_2020` at every call site at both the 8.8.0 and 9.0.0 tags.
```
Replace:
```text
At the 8.8.0 and 9.0.0 tags `GrpcCacheClient.java` hardcodes `FAST_CDC_2020` at every call site and the cited cherry-pick closed unmerged; the selector landed by another route in 8.9.0 ([#32385](https://github.com/bazelbuild/bazel/pull/32385)), where `auto` negotiates with the server and falls back to RepMaxCDC.
```

### 16. skills/bazel-quality-reference/caching.md (BZL-CACHE-28, verification)

Find:
```text
the boolean is the only hit, and a hit on any `_function` or `rep_max_cdc` spelling means a fork or a non-release build, not upstream.
```
Replace:
```text
on 8.8.x and 9.2.0 the boolean is the only hit, and a `_function` hit there means a fork or a non-release build; on 8.9.0 or later a `_function` hit is upstream.
```

### 17. skills/bazel-quality-reference/cpp.md

Find:
```text
binds to: `rules_cc` 0.2.22, `toolchains_llvm` 1.9.0 plus its unreleased `main`
after PR #843, `hermetic_cc_toolchain` 4.3.0, `rules_foreign_cc` 0.15.1,
```
Replace:
```text
binds to: `rules_cc` 0.2.22, `toolchains_llvm` 1.9.0 plus its then-unreleased `main`
after PR #843 (first released in 1.9.1, 2026-09-16), `hermetic_cc_toolchain` 4.3.0, `rules_foreign_cc` 0.15.1,
```

### 18. skills/bazel-quality-reference/cpp.md (BZL-CC-04, rule)

Find:
```text
as of 2026-09-06 it exists only on `main` ([PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843), merged 2026-09-02), in no tagged release and in no BCR version — and that the floor is Bazel **9.2.0+** with an LLVM **22+** distribution containing `bin/clang-scan-deps`.
```
Replace:
```text
it first shipped in `toolchains_llvm` **1.9.1** (2026-09-16, on the BCR; [PR #843](https://github.com/bazel-contrib/toolchains_llvm/pull/843), merged 2026-09-02), so 1.9.0 and older carry none of it — that the floor is Bazel **9.2.0+** with an LLVM **22+** distribution containing `bin/clang-scan-deps`, and that the build sets all three of `--experimental_cpp_modules`, `--features=cpp_modules` and `-std=c++20` or newer (the 1.13.0 README's "C++ named modules" section).
```

### 19. skills/bazel-quality-reference/cpp.md (BZL-CC-04, verification)

Find:
```text
a plain `bazel_dep` on a released version with named modules in use is a finding; only a commit-pinned override carries the feature today.
```
Replace:
```text
a `toolchains_llvm` version below 1.9.1 with named modules in use is the finding; 1.9.1 or later, or an override pinned at or after PR #843, carries the feature.
```

### 20. skills/bazel-quality-reference/cpp.md (BZL-CC-10)

Find:
```text
Ahead-of-release: `toolchains_llvm`'s `main` documents a `cpp_modules` feature absent from every tag and from the BCR.
```
Replace:
```text
Ahead-of-release: on 2026-09-06 `toolchains_llvm`'s `main` documented a `cpp_modules` feature absent from every tag and from the BCR, ten days before 1.9.1 shipped it.
```

### 21. skills/bazel-quality-reference/python.md (BZL-PY-01)

Find:
```text
3.11 at tag 2.3.3, already 3.14 on `main`
```
Replace:
```text
3.11 through 2.3.x, 3.14 from 2.4.0 (2026-09-22)
```

### 22. skills/bazel-quality-reference/python.md (BZL-PY-21, rule)

Find:
```text
Never point a `py_test`'s `srcs` at a pytest-style file without a pytest entrypoint — a wrapper's `main()`, or a `py_console_script_binary`-based macro.
```
Replace:
```text
Never point a `py_test`'s `srcs` at a pytest-style file without a pytest entrypoint — a wrapper's `main()`, a `py_console_script_binary`-based macro, or the first-party `pytest_test` rule (rules_python 2.5.0 and later).
```

### 23. skills/bazel-quality-reference/python.md (BZL-PY-21, rationale)

Find:
```text
This is the single highest-risk step in migrating an existing pytest suite.
```
Replace:
```text
This is the single highest-risk step in migrating an existing pytest suite. `pytest_test` also runs tests through `pytest-randomly` and `pytest-shard`, so a suite with hidden order dependence can fail on adoption; that is the suite's defect surfacing, not a reason to fall back to a bare `py_test`.
```

### 24. skills/bazel-quality-reference/python.md (BZL-PY-21, verification)

Find:
```text
a `def test_` file whose owning `py_test` names none is the finding.
```
Replace:
```text
a `def test_` file whose owning `py_test` names none is the finding; a `pytest_test` owner counts as an entrypoint.
```

### 25. skills/bazel-quality-reference/python.md (BZL-PY-28, rule)

Find:
```text
Use `gazelle_python_manifest`'s `requirements =` attribute against `rules_python` ≤2.3.3; `lockfiles =` does not exist yet.
```
Replace:
```text
Match `gazelle_python_manifest`'s lock attribute to the pinned `rules_python`: `requirements =` at 2.3.x and older, where `lockfiles =` does not exist; `lockfiles =` from 2.4.0, where `requirements =` still parses but is deprecated.
```

### 26. skills/bazel-quality-reference/python.md (BZL-PY-28, rationale)

Find:
```text
The rename — on the very page that documents `uv.lock` acceptance — is unreleased, present only in `main`-branch docs behind a `VERSION_NEXT_FEATURE` marker, so copying the current doc page against a 2.3.3 pin fails with an unknown-parameter error.
```
Replace:
```text
The rename — on the very page that documents `uv.lock` acceptance — shipped in 2.4.0 (2026-09-22), so copying the current doc page against a 2.3.x pin fails with an unknown-parameter error, and copying an older example onto 2.4.0 or later writes a deprecated name.
```

### 27. skills/bazel-quality-reference/python.md (BZL-PY-28, verification)

Find:
```text
see block BZL-PY-28 — empty is the pass; a `lockfiles =` use at ≤2.3.3 is the finding.
```
Replace:
```text
see block BZL-PY-28 — empty is the pass; a `lockfiles =` use with `rules_python` at 2.3.x or older is the finding, and so is a `requirements =` inside `gazelle_python_manifest` on 2.4.0 or later (`grep -n -A3 'gazelle_python_manifest(' -- BUILD.bazel`).
```

### 28. skills/bazel-quality-reference/python.md (BZL-PY-28, severity)

Find:
```text
'def gazelle_python_manifest' -A5`. | MUST |
```
Replace:
```text
'def gazelle_python_manifest' -A5`. | MUST (`lockfiles =` below 2.4.0) / SHOULD (`requirements =` on 2.4.0 or later) |
```

### 29. skills/bazel-quality-reference/python.md (Gaps)

Find:
```text
- `pylock.toml` (PEP 751) support and the `gazelle_python_manifest`
  `requirements=`→`lockfiles=` rename are both unshipped at 2.3.3 with no dated
  target; re-check both before repeating either status.
```
Replace:
```text
- `pylock.toml` (PEP 751) support is unshipped through 2.5.1 with no dated
  target (issue 2787 open on 2026-11-27); re-check before repeating that status.
  The `gazelle_python_manifest` `requirements=`→`lockfiles=` rename shipped in
  2.4.0 (BZL-PY-28).
```

### 30. skills/bazel-quality-reference/typescript.md (BZL-JS-34, rule)

Find:
```text
only majors 5, 6 and 9 resolve at `aspect_gazelle_js` 1.2.1.
```
Replace:
```text
only majors 5, 6 and 9 resolve (unchanged through `aspect_gazelle_js` 1.2.3), and a pnpm 12 lockfile needs 1.2.3 or newer.
```

### 31. skills/bazel-quality-reference/typescript.md (BZL-JS-34, rationale)

Find:
```text
pnpm 12's multi-document lockfile is an open upstream bug with two competing unmerged fixes as of 2026-09-05, so npm-import resolution fails outright on a pnpm-12-locked workspace.
```
Replace:
```text
pnpm 12 writes a multi-document lockfile — a leading `---`, still `lockfileVersion: '9.0'` — that 1.2.2 and older fail to parse ([aspect-gazelle#461](https://github.com/aspect-build/aspect-gazelle/issues/461), fixed in 1.2.3 on 2026-10-23), so npm-import resolution fails outright on a pnpm-12-locked workspace below that pin.
```

### 32. skills/bazel-quality-reference/typescript.md (BZL-JS-34, verification)

Find:
```text
`head -1 pnpm-lock.yaml`. **A major outside {5, 6, 9} with this plugin pinned is the finding; empty output (no lockfile) is BZL-JS-01's finding, not this row's pass.**
```
Replace:
```text
`grep -m1 -e 'lockfileVersion' -- pnpm-lock.yaml` and `head -1 pnpm-lock.yaml`. **A major outside {5, 6, 9} with this plugin pinned is the finding, and so is a leading `---` with the plugin below 1.2.3; empty output (no lockfile) is BZL-JS-01's finding, not this row's pass.**
```

### 33. skills/bazel-quality-reference/typescript.md (BZL-JS-30)

Find:
```text
Only one is BCR-published (v0.5.4, pushed 2026-03-06)
```
Replace:
```text
Only one is BCR-published (newest BCR version 0.5.3 on 2026-11-27; its v0.5.4 is a GitHub tag only, last pushed 2026-03-06)
```

### 34. skills/bazel-quality-reference/rust.md (header)

Find:
```text
crate_universe correctness fixes from the preceding six weeks — so re-read
```
Replace:
```text
crate_universe correctness fixes from the preceding six weeks, 0.75.0
(2026-10-26) carries none, and about ten more sat on `main` by 2026-11-24 — so re-read
```

### 35. skills/bazel-quality-reference/rust.md (BZL-RUST-37, rationale)

Find:
```text
The ruleset is pre-1.0 with roughly weekly releases (BZL-FLAG-29 compares the second component), and
```
Replace:
```text
The ruleset is pre-1.0 with roughly weekly releases (BZL-FLAG-29 compares the second component), 0.2.0 and later require Bazel 8.7 or newer ([#324](https://github.com/hermeticbuild/rules_rs/pull/324)), and
```

### 36. skills/bazel-quality-reference/rust.md (BZL-RUST-37, verification)

Find:
```text
Read both `bazel_dep` lines for an exact `version =`.
```
Replace:
```text
Read both `bazel_dep` lines for an exact `version =`, and `cat .bazelversion`: a pin below 8.7.0 with `rules_rs` 0.2.0 or newer is the finding.
```

### 37. skills/bazel-quality-reference/go.md (BZL-GO-13, rule)

Find:
```text
then `go_deps.config(check_direct_dependencies = ...)`
```
Replace:
```text
then `go_deps.config(check_direct_dependencies = ...)` (`checks = ...` on the gazelle 2.x line)
```

### 38. skills/bazel-quality-reference/go.md (BZL-GO-13, rationale)

Find:
```text
The attribute is `check_direct_dependencies`, not `checks`, and its default only prints a warning.
```
Replace:
```text
On gazelle 0.x (0.54.0) the attribute is `check_direct_dependencies`, not `checks`; on the 2.0.0 beta line (2.0.0-beta.2, 2026-10-08) `checks` replaces it and the old name prints a deprecation message. On both, the default only prints a warning.
```

### 39. skills/bazel-quality-reference/go.md (BZL-GO-13, verification)

Find:
```text
Doc-derived, gazelle 0.54.0 source read 2026-09-26.
```
Replace:
```text
Doc-derived, gazelle 0.54.0 source read 2026-09-26 and the 2.0.0-beta source read 2026-11-27.
```

### 40. skills/bazel-quality-reference/go.md (block BZL-GO-13)

Find:
```text
xargs -0 -r grep -H -n -e 'check_direct_dependencies' --
```
Replace:
```text
xargs -0 -r grep -H -n -e 'check_direct_dependencies' -e 'checks *=' --
```

### 41. skills/bazel-quality-reference/go.md (stamping paragraph)

Find:
```text
output bases (`linux_amd64` only), is one checked-in rc line:
```
Replace:
```text
output bases (`linux_amd64` only, rules_go 0.63.0), is one checked-in rc line.
rules_go 0.64.0 dropped the fixed `-buildid=redacted` link flag and 0.65.0
derives Go build IDs from the linked binary
([PR 4728](https://github.com/bazel-contrib/rules_go/pull/4728)), so re-run
BZL-GO-14's two-clone `sha256sum` check before claiming byte identity on 0.64
or later:
```

### 42. skills/bazel-quality-reference/java.md (header)

Find:
```text
0.31.0 (pre-1.0, no tagged releases).
```
Replace:
```text
0.31.0 (pre-1.0; tagged releases do exist, 0.31.1 of 2025-11-11 through 0.35.0 of 2026-11-12, and the repository is now `bazel-contrib/rules_jvm`).
```

### 43. skills/bazel-quality-reference/java.md (BZL-JAVA-05, rule)

Find:
```text
Write the flag as `--experimental_strict_java_deps`, the only spelling with exemplar evidence, and confirm it against the pinned binary before relying on it.
```
Replace:
```text
Write the flag as `--experimental_strict_java_deps`, its declared name, and confirm it against the pinned binary before relying on it.
```

### 44. skills/bazel-quality-reference/java.md (BZL-JAVA-05, rationale)

Find:
```text
A model trained on one page and asked after the other produces the wrong name confidently, and a misspelled flag is rejected at the command line rather than silently.
```
Replace:
```text
Bazel's source settles it: `JavaOptions.java` declares `experimental_strict_java_deps` with `oldName = "strict_java_deps"` at 8.8.0, 9.2.0 and on `master`, so both spellings parse. Write the declared name, because it is the one the command-line reference and `bazel help` list; a model that calls either spelling nonexistent is wrong.
```

### 45. skills/bazel-quality-reference/java.md (BZL-JAVA-05, verification)

Find:
```text
Verified against documentation only, 2026-09-12.
```
Replace:
```text
Verified against documentation 2026-09-12 and tagged source 2026-11-27; `bazel build --nobuild --strict_java_deps=error //...` printing `Unrecognized option` would mean the alias is gone at that pin.
```

### 46. skills/bazel-quality-reference/swift.md (BZL-SWIFT-02)

Find:
```text
A root that declares only `rules_swift_package_manager` silently resolves `rules_swift` 3.6.0, the last Bazel-7 line, with no error.
```
Replace:
```text
A root that declares only `rules_swift_package_manager` 1.25.0 or older silently resolves `rules_swift` 3.6.0, the last Bazel-7 line, with no error; 1.26.0 (2026-11-19) declares `rules_swift` 4.2.1, but the root declaration still decides the pin.
```

### 47. skills/bazel-quality-reference/swift.md (BZL-SWIFT-05)

Find:
```text
(4.2.1 carries 6.2.1 to 6.4.0) fails at extension evaluation (`6.4.1`, exit 1)
```
Replace:
```text
(4.2.1 carries 6.2.1 to 6.4.0; 4.3.0 adds 6.4.1 and 6.4.2) fails at extension evaluation (`6.4.1` on 4.2.1, exit 1)
```

### 48. skills/bazel-quality-reference/swift.md (Gaps)

Find:
```text
outside the ruleset, and it resolves against `rules_swift` 3.6.0 when the root omits the dependency (BZL-SWIFT-02).
```
Replace:
```text
outside the ruleset, and at 1.25.0 and older it resolves against `rules_swift` 3.6.0 when the root omits the dependency (BZL-SWIFT-02).
```

### 49. skills/bazel-quality-reference/starlark.md (header)

Find:
```text
[8.5.1.4](https://github.com/keith/buildifier-prebuilt/releases) (latest),
```
Replace:
```text
[8.5.1.4](https://github.com/keith/buildifier-prebuilt/releases) (latest on that date; 10.2.0 on 2026-11-27, read from release notes and source only),
```

### 50. skills/bazel-quality-reference/starlark.md (BZL-LARK-31)

Find:
```text
pin `buildifier_prebuilt` at 8.5.1.3 or later — 8.5.1.4 preferred. **pinned**
```
Replace:
```text
pin `buildifier_prebuilt` at 8.5.1.3 or later — the newest release preferred (10.2.0 on 2026-11-27, whose runner template still carries both fixes by source read). **pinned**
```

### 51. skills/bazel-quality-reference/starlark.md (default warning set)

Find:
```text
warning is a build-breaking finding rather than advice: 99 categories exist, 98
are on by default, exactly one (`unsorted-dict-items`) is off. These five are
promoted out of the 98 because each names a distinct failure an agent repeats.
```
Replace:
```text
warning is a build-breaking finding rather than advice: at buildifier 8.2.0
through 8.5.1, 99 categories exist, 98 are on by default, and exactly one
(`unsorted-dict-items`) is off. buildtools 10.0.1 and later (now
`bazel-contrib/buildtools`) drop `canonical-repository` and `external-path` and
add `make-location`, on by default, so 10.2.0 counts 98 and 97. After a bump past
10.0, every `$(location)` or `$(locations)` in a BUILD file (and from 10.2.0 in a
`.bzl` file) fails the gate until it becomes `$(execpath)` or `$(rootpath)`;
find them first with
`grep -rn -E '\$\(locations? ' --include=BUILD --include=BUILD.bazel --include='*.bzl' .`.
These five are promoted out of the default set because each names a distinct
failure an agent repeats.
```

### 52. skills/bazel-quality-reference/starlark.md (Gaps)

Find:
```text
`exclude_patterns` expansion, `lint_warnings` handling and the runfiles layout are unaudited across that span.
```
Replace:
```text
`exclude_patterns` expansion, `lint_warnings` handling and the runfiles layout are unaudited across that span. 10.0.1, 10.1.0 and 10.2.0 are audited for those two fixes by source read only, and the 10.2.0 notes name changed `exclude_patterns` handling (excluded directories pruned, a Windows fix) and new SARIF output.
```

### 53. skills/bazel-quality-reference/ci.md (header)

Find:
```text
2.9.0, `buildifier_prebuilt` 8.5.1.4 and bazelisk as released on 2026-09-06. Before citing any
```
Replace:
```text
2.9.0, `buildifier_prebuilt` 8.5.1.4 and bazelisk as released on 2026-09-06. `bazel-diff` was rewritten after that date: v48.0.0 (2026-09-14) deleted the Kotlin/JVM CLI, so it is a Rust binary that needs no JDK, its README states Bazel 8 or higher, and v81.0.0 (2026-11-25) is the newest of a roughly daily cadence — re-derive every flag below at your pinned tag (BZL-CI-26). Before citing any
```

### 54. skills/bazel-quality-reference/ci.md (BZL-CI-21, rationale)

Find:
```text
Since Bazel 8.6.0+/9.0.1+, default mode *does* catch a declared `bazel_dep` version bump via `mod show_repo` diffing — a different, narrower miss.
```
Replace:
```text
Since Bazel 8.6.0+/9.0.1+, default mode *does* catch a declared `bazel_dep` version bump via `mod show_repo` diffing — a different, narrower miss. From v62.0.0 (2026-10-20) default mode also hashes every module-extension-generated repository from `bazel mod show_repo`, including ones no module imports, with the owning module standing in for them ([#529](https://github.com/Tinder/bazel-diff/pull/529)); the measured case — a repository-rule implementation reading a file no attribute names — has not been re-measured, and the README still says a label a repository rule writes without receiving it as an attribute value is not seen, so the mitigation stays.
```

### 55. skills/bazel-quality-reference/ci.md (BZL-CI-21, verification)

Find:
```text
`'//external:all-targets' + '//...:all-targets'` means it is not.
```
Replace:
```text
its absence means it is not. From v70.0.2 the `//external:all-targets` term is dropped wherever `bazel info` shows no `//external` package, so that term's absence proves nothing about the mode.
```

### 56. skills/bazel-quality-reference/ci.md (BZL-CI-23, verification)

Find:
```text
the flag must be absent, meaning auto-detected via `bazel mod graph`, or explicitly `true`.
```
Replace:
```text
the flag must be absent, meaning auto-detected — since v70.0.2 from the module graph recorded in the final hash file, falling back to asking Bazel — or explicitly `true`. On `generate-hashes` the default is a literal `false`, and a `bazel info` probe skips the `//external` query instead.
```

### 57. skills/bazel-quality-reference/ci.md (new row BZL-CI-34, insertion)

Anchor (the line to insert after, which ends the BZL-CI-25 row):
```text
A zero-target diff acted on with no flag list stated is the finding. | SHOULD |
```
Insert:
```text
| BZL-CI-34 | Generate the starting and the final `bazel-diff` hash file with the same pinned `bazel-diff` version, and put that version in the key of any cache that stores a hash file. | The hash format moves between releases: v61.0.0 migrated cache entries to a new format ([#525](https://github.com/Tinder/bazel-diff/pull/525)), and [#608](https://github.com/Tinder/bazel-diff/pull/608) states that for users of its flag the owning module and everything depending on it hash differently once. A starting hash cached from `main` under one release and compared against a final hash from another reports changes no commit made, or masks the ones it did, and the CI log looks the same either way. | `CI_WRAPPER=path/to/ci-wrapper; grep -n -e 'bazel-diff' -- "${CI_WRAPPER}"`: both `generate-hashes` steps must resolve the same pinned tag. Two different pins, an unpinned `latest`, or a cached starting hash whose cache key omits the version is the finding. EMPTY means the wrapper does not use `bazel-diff` and the row does not bind. | SHOULD |
```

### 58. skills/bazel-quality-reference/testing.md (BZL-TEST-28, rationale)

Find:
```text
New at 9.0.0 and unchanged through 9.2.0:
```
Replace:
```text
New at 9.0.0 and unchanged through 9.3.3 (10.0.0rc4 too, by source read):
```

### 59. skills/bazel-quality-reference/testing.md (BZL-TEST-28, verification)

Find:
```text
EMPTY (every target platform has a matching execution platform) = PASS, and the failure is loud: a toolchain-resolution error naming `default_test_toolchain_type`.
```
Replace:
```text
EMPTY (every target platform has a matching execution platform) = PASS. Through 9.2.0 the failure is loud at analysis: a toolchain-resolution error naming `default_test_toolchain_type`. From 9.3.0 such a test builds and fails only when it runs ([9.3.0 notes](https://github.com/bazelbuild/bazel/releases/tag/9.3.0), PR 30946), so on 9.3.0 or later `bazel build` alone no longer surfaces it — run `bazel test`.
```

### 60. skills/bazel-quality-reference/hermeticity.md (BZL-HERM-01)

Find:
```text
`/bin:/usr/bin:/usr/local/bin` on POSIX,
```
Replace:
```text
`/bin:/usr/bin:/usr/local/bin` on POSIX through 9.x (the 10.0.0 release-candidate notes drop `/usr/local/bin`),
```

## Spillover round

### Verdict

The spillover check carried one item, from cmake-build: rules_foreign_cc 0.17.0 (released 25 October) keeps the default CMake 3.31.12, the prebuilt ceiling 4.0.7 and a `bazel_dep` on rules_cc 0.2.18, and Bazel 9.3.3 and 10.0.0rc4 are out. Primary sources confirm it, and the pair already matches it. No text in rules/bazel-quality.md or skills/bazel-quality-reference/ names rules_foreign_cc 0.16.0 as the newest release. The only pinned version is 0.15.1 in the cpp.md header. That header names what was measured, so this refresh leaves it alone, because version-only bumps do not go into headers (Verdict point 7). The Bazel release facts already appear, as written in the first round, in the rule intro and the flags.md LTS sentence. The CMake default and the rules_cc 0.2.18 pin belong to cmake-build. The rules_cc 0.2.22 that flags.md and the cpp.md header name is a separate claim, and this item does not touch it. This round changes nothing.

### Changed rules

None.

### New rules

None.

### Declined

- rules_foreign_cc 0.17.0 and Bazel 9.3.3 / 10.0.0rc4 (from cmake-build): confirmed, but already correct in the target. No text names 0.16.0 as the newest release. The 0.15.1 in the cpp.md header is a measurement disclosure and stays unchanged, by Verdict point 7. The Bazel versions are already current in edits 1 and 2.

### Sources

No change was made, so this round has no source rows. For the record, the item was confirmed against https://github.com/bazel-contrib/rules_foreign_cc/releases/tag/0.17.0, https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/MODULE.bazel, https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/foreign_cc/repositories.bzl and https://github.com/bazelbuild/bazel/releases.

### Edit list (spillover round)

Empty. This round applies no edits.
