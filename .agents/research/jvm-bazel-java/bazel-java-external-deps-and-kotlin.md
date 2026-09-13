---
title: "maven_install, repinning, and the Kotlin traps that have no Gradle analogue"
topic: "Bazel-Java external dependencies (rules_jvm_external / maven_install.json) and Kotlin-under-Bazel correctness traps"
agent: jvm-bazel-java/bazel-java-external-deps-and-kotlin
model: sonnet
date_researched: 2026-09-12
sources_count: 16
scope: >
  Covers only maven_install.json's freshness/pinning mechanics under
  rules_jvm_external (bzlmod form) and the two Kotlin-under-Bazel correctness
  traps with no Gradle analogue (ijar-vs-inline-functions, x_lambdas codegen
  divergence), plus worker defaults for Kotlin compile actions. Does NOT cover
  MODULE.bazel.lock/--lockfile_mode (bzlmod.md), credential helpers
  (caching.md), --repo_env/--action_env or network reachability
  (hermeticity.md), coverage/worker-flag semantics in general (testing.md), or
  rc files/Bazel floors (flags.md) — cited, never restated. Java-toolchain
  flags (--java_language_version family) are the sibling
  bazel-java-toolchains-and-compilation dive's subject, not this one's.
---

# maven_install, repinning, and the Kotlin traps that have no Gradle analogue

## Contents

[Owns](#owns) · [Measurement](#measurement) ·
[Summary](#summary) · [Findings](#findings) ·
[1. The maven_install.json freshness gate](#1-the-maven_installjson-freshness-gate) ·
[2. version_conflict_policy, exclusions, neverlink/testonly](#2-version_conflict_policy-exclusions-neverlinktestonly) ·
[3. strict_visibility and the artifact() macro's buildozer cost](#3-strict_visibility-and-the-artifact-macros-buildozer-cost) ·
[4. The ijar/inline-function trap](#4-the-ijarinline-function-trap) ·
[5. x_lambdas: indy vs class across build systems](#5-x_lambdas-indy-vs-class-across-build-systems) ·
[6. Kotlin worker defaults and the local opt-out](#6-kotlin-worker-defaults-and-the-local-opt-out) ·
[7. The dual-build source-of-truth question (M-X-07)](#7-the-dual-build-source-of-truth-question-m-x-07) ·
[Normative guidance candidates](#normative-guidance-candidates) ·
[Exemplar evidence](#exemplar-evidence) · [AI-agent angle](#ai-agent-angle) ·
[Contested / evolving](#contested--evolving) · [Gaps](#gaps) · [Sources](#sources)

## Owns

Owns the `BZL-JAVA` family's external-dependency and Kotlin half: `maven.install`
(bzlmod form) and its `lock_file`/`maven_install.json`, `version_conflict_policy`,
`excluded_artifacts`, `neverlink`/`testonly` amendments, `strict_visibility`, the
`artifact()` macro, and the two Kotlin-under-Bazel correctness traps
(`java_import`-vs-`ijar` corruption of inline functions, and `x_lambdas`
codegen divergence), plus `KotlinCompile`/`KotlinKsp2`/`JdepsMerge` worker
defaults. It does not own `MODULE.bazel.lock` or `--lockfile_mode` (sibling
`bzlmod.md` — the two lockfiles must never be conflated: `maven_install.json`
is a **coursier-resolved artifact+checksum manifest gating a `maven.install`
extension instance**, `MODULE.bazel.lock` is **Bazel's own module-resolution
lockfile** covering the whole dependency graph including this one's tag
values — a `maven.install` call itself is one more hashed usage inside
`MODULE.bazel.lock`, one layer up from the file this dive is about). It does
not own credential helpers or network reachability for Maven repository
fetches (sibling `caching.md`/`hermeticity.md`), coverage or worker-flag
semantics in general (sibling `testing.md`), or rc files and Bazel version
floors (sibling `flags.md`). `--java_language_version`/`--tool_java_*` and
JDK-toolchain pinning under Bazel are the sibling
`bazel-java-toolchains-and-compilation` dive's subject and are cited, never
restated, here.

## Measurement

Rows bind [rules_jvm_external 7.1](https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.1)
(2026-07-23) and [rules_kotlin v2.4.10](https://github.com/bazel-contrib/rules_kotlin/releases/tag/v2.4.10)
(2026-08-20), both read at `master` HEAD on 2026-09-12 (source-code citations
below give the exact tree path; README prose is the tagged/latest release
content GitHub serves at `master`, which for both repos matches the
just-cited release — no unreleased-only prose is cited). **Correction to the
brief's premise**: no merge between `bazel-contrib/rules_jvm_external` and
`bazel-contrib/rules_jvm` has happened — both remain live, separate,
non-archived repos ([rules_jvm_external](https://github.com/bazel-contrib/rules_jvm_external),
[rules_jvm](https://github.com/bazel-contrib/rules_jvm), confirmed via
`gh api repos/bazel-contrib/rules_jvm_external` and
`repos/bazel-contrib/rules_jvm`, both `archived: false`, distinct
descriptions, 2026-09-12). What *did* move, and what the recent-shifts scout
was half-right about: **rules_kotlin's org changed**, from `bazelbuild/rules_kotlin`
to `bazel-contrib/rules_kotlin` — `bazelbuild/rules_kotlin` now resolves as
the same repository record (`full_name: "bazel-contrib/rules_kotlin"` when
queried at the old path), i.e. a GitHub repo transfer, not a fork or a rename
of content. Cite the new org going forward; the audit's
`bazelbuild__rules_kotlin@7c51dd1210` clone directory name is now stale as an
org label but the SHA and content are unaffected. Every grep here reads
`MODULE.bazel`, `BUILD.bazel`/`BUILD`, `.bzl` and `.bazelrc` text in your own
repository; `maven_install.json`'s *content* is generator output (from
`REPIN=1 bazel run @maven//:pin`) and reading it is legitimate only to check
its shape or diff it, never to hand-edit it — every primary source here says
so explicitly (`"PLEASE DO NOT MODIFY THIS FILE DIRECTLY!"`, quoted verbatim
in [§1](#1-the-maven_installjson-freshness-gate)). MUST = Block, SHOULD =
Warn, CONSIDER = Suggest, matching the sibling set's severities.

## Summary

- `maven.install(lock_file = "//:maven_install.json")` is required for any
  freshness checking at all; omitting `lock_file` means unpinned resolution
  with no checksum verification on every clean checkout ([README §Pinning](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md)).
- Unlike crate_universe's Cargo-analogue, **the freshness gate is opt-in, not
  unconditional**: `fail_if_repin_required` defaults to `False`
  ([coursier.bzl:1683](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl#L1683)),
  so a stale or corrupted lock is a printed warning and the build **still
  succeeds**, using whatever the lock currently contains.
- Set `fail_if_repin_required = True` on every `maven.install` call. This is
  the single lever that turns rules_jvm_external's freshness check from
  advisory to load-bearing — treat it as a MUST, not a style preference.
- The lock file self-checks on **two independent axes**, both gated by the
  same flag: `__INPUT_ARTIFACTS_HASH` (does the lock match what `MODULE.bazel`
  currently declares?) and `__RESOLVED_ARTIFACTS_HASH` (does the lock's own
  body match the hash recorded in the lock — i.e., was the file hand-edited or
  desynced by a merge?) ([v3_lock_file.bzl:41,44](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/v3_lock_file.bzl#L41)).
- Repin with `REPIN=1 bazel run @maven//:pin`; scope a
  rules_jvm_external-only repin to `RULES_JVM_EXTERNAL_REPIN=1 bazel run @maven//:pin`
  ([README §Requiring lock file repinning](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#requiring-lock-file-repinning-when-the-list-of-artifacts-changes)) —
  no `bazel sync`/`bazel fetch --repo=` equivalent exists here; the mechanism
  is a `bazel run` of a generated `:pin` target, not a fetch/sync verb.
  `maven_install.json` must exist (`touch maven_install.json BUILD.bazel`)
  *before* the first pin, and it must be a valid Bazel target.
- Pinning is what buys SHA-256 integration with Bazel's downloader, cross-
  workspace artifact sharing, and fully offline builds after one
  `bazel fetch @maven//...` — unpinned resolution gets none of these
  ([README §Pinning artifacts and integration with Bazel's downloader](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#pinning-artifacts-and-integration-with-bazels-downloader)).
- `version_conflict_policy = "pinned"` forces the versions **you** declared in
  `maven.install`/`maven.artifact` to win over a higher transitive request;
  the default is Coursier's own highest-wins algorithm — the Bazel-side
  analogue of unmanaged Maven mediation, not managed-Maven-dependency-style
  determinism ([README §Resolving...version conflicts](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#resolving-user-specified-and-transitive-dependency-version-conflicts)).
- Reuse [`jvm-dependencies.md` GRADLE-DEP-09](../jvm-dependencies.md): a
  lockfile — Gradle's or this one — pins **resolution**, never legitimacy. A
  malicious or vulnerable first resolution is locked into `maven_install.json`
  exactly as faithfully as a good one; `version_conflict_policy = "pinned"`
  narrows *which* version wins a conflict, it does not vet *any* version. Both
  facts hold simultaneously and neither substitutes for a supply-chain scanner.
- `excluded_artifacts` drops a coordinate from the whole resolved graph
  globally; `maven.artifact(exclusions = [...])` drops it from one top-level
  artifact's transitive closure only — picking the wrong scope either starves
  a target that needed the excluded jar or leaves it reachable elsewhere in
  the graph ([README §Artifact exclusion](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#artifact-exclusion)).
- `neverlink = "true"` marks an artifact compile-only (never on the runtime
  classpath); `testonly = "true"` restricts it to `testonly` targets — set
  both via `maven.amend_artifact`, never by hand-editing the generated
  `java_import` target ([README §Compile-only/Test-only dependencies](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#compile-only-dependencies)).
- `strict_visibility = True` makes every transitive dependency private,
  forcing rule authors to declare what they actually import; the default
  (all transitives visible) silently survives a pruned `artifacts` list until
  a consumer's build breaks somewhere else ([README §Hiding transitive dependencies](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#hiding-transitive-dependencies)).
- The `artifact()` macro is convenient but its own docs warn it "makes BUILD
  file refactoring with tools like `buildozer` more difficult, because the
  macro hides the actual target label at the syntax level" — quoted verbatim
  ([README §artifact helper macro](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#artifact-helper-macro)).
- A naive `java_import` on a Kotlin jar corrupts it: native `ijar` "does not
  know about kotlin metadata with respect to inlined functions, and will
  remove method bodies inappropriately" — quoted from both
  [rules_kotlin's README](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#kotlin-in-your-workspace)
  and the original [rules_jvm_external issue #59](https://github.com/bazel-contrib/rules_jvm_external/issues/59).
- That trap has been fixed since 2019: [PR #69](https://github.com/bazel-contrib/rules_jvm_external/pull/69)
  (merged 2019-03-26) added a Kotlin-metadata-aware `jvm_import` that skips
  `ijar` entirely when a jar carries `kotlin_module` entries — present at
  every currently-supported release (5.x through 7.1); no version floor is
  needed for a repository starting fresh today.
- `kt_kotlinc_options` defaults `x_lambdas` to `"class"` (anonymous inner
  classes) while Kotlin 2.x's own compiler default and Gradle's default are
  both `"indy"` (invokedynamic) — the same source code compiles to
  **different bytecode shapes** depending on which build system ran it
  ([README §Lambda Bytecode Generation](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#lambda-bytecode-generation),
  [docs/kotlin.md `x_lambdas` attribute doc](https://github.com/bazel-contrib/rules_kotlin/blob/master/docs/kotlin.md#kt_kotlinc_options-x_lambdas)).
  `x_sam_conversions` has no such trap — it already defaults to `"indy"`,
  matching Kotlin's own default since 1.5.
- Persistent and multiplex workers are on **by default** for `KotlinCompile`,
  `KotlinKsp2` and `JdepsMerge`; opt out per-mnemonic with
  `--strategy=<mnemonic>=local` ([README §Workers](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#workers)) —
  M-X-10.
- Nothing in the exemplar corpus verifies Gradle/Bazel dependency-graph
  parity in a dual-build repository; treat M-X-07 as a documented reading
  heuristic, not a mechanically checkable rule (see
  [§7](#7-the-dual-build-source-of-truth-question-m-x-07)).

## Findings

### 1. The maven_install.json freshness gate

Two greps and one primary-source read cover this block:

```bash
grep -n -A3 'maven.install(' MODULE.bazel | grep -n 'lock_file\|fail_if_repin_required'
git ls-files maven_install.json '*_install.json'
```

Empty output from the first line inside a `maven.install(` block means no
`lock_file` is set at all — unpinned resolution — and the second grep for
`fail_if_repin_required` empty means the gate is present but advisory-only.

The pinning workflow, quoted from the primary source, is exactly three steps:

1. "Add a `lock_file` attribute to the `install` tag."
2. `touch maven_install.json BUILD.bazel` — "The lock file must exist before
   pinning but may be empty. It must also be a valid target."
3. `REPIN=1 bazel run @maven//:pin` — "This will generate the lock file."

([README §Pinning and lock files](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#pinning-and-lock-files))

What changes once pinned, quoted: "By pinning artifact versions, you can get
improved artifact resolution and build times, since using `maven_install.json`
enables `rules_jvm_external` to integrate with Bazel's downloader that caches
files on their sha256 checksums... Since all artifacts are persisted locally
in Bazel's cache, it means that **fully offline builds are possible** after
the initial `bazel fetch @maven//...`" ([README §Pinning artifacts and
integration with Bazel's downloader](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#pinning-artifacts-and-integration-with-bazels-downloader)).
Cross-workspace sharing follows from the same mechanism: once artifacts are
addressed by checksum through Bazel's own downloader cache, two workspaces on
the same machine (or the same CI runner's cache) that pin the same coordinate
at the same version share the download.

**The lock file's shape.** Every `maven_install.json` opens with two
generator-owned header keys — confirmed by reading the ruleset's own
dogfooded lock file:

```json
{
  "__AUTOGENERATED_FILE_DO_NOT_MODIFY_THIS_FILE_MANUALLY": "THERE_IS_NO_DATA_ONLY_ZUUL",
  "__INPUT_ARTIFACTS_HASH": -1642503178,
  "__RESOLVED_ARTIFACTS_HASH": -1242467072,
  "artifacts": { "...": "..." }
}
```

(`bazel-contrib/rules_jvm_external@master:maven_coursier_install.json:1-4`,
fetched via `gh api .../contents/...`). This is one field more than the
brief's premise assumed — there are **two** hash fields, not one, and they
check different things:

- `__INPUT_ARTIFACTS_HASH` — a hash of the `artifacts`/`boms`/`repositories`/
  `excluded_artifacts` values as currently declared in `MODULE.bazel`. Loaded
  against a freshly recomputed hash of the *current* declaration at every
  build; a mismatch means "you edited `MODULE.bazel` and did not repin"
  (`is_valid_lock_file`/`get_input_artifacts_hash` in
  [`v3_lock_file.bzl:41`](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/v3_lock_file.bzl#L41)).
- `__RESOLVED_ARTIFACTS_HASH` — a hash of the lock file's **own resolved
  `artifacts` body**. A mismatch means the file was hand-edited, or a merge
  wrote content whose checksums no longer match its own header — this is the
  self-tamper check
  ([`v3_lock_file.bzl:44`](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/v3_lock_file.bzl#L44)).

Drift is detected by **re-hashing the declared artifact list and the lock's
own body**, never by a version field — there is no simple incrementing "lock
file version" integer anywhere in the schema (confirmed: the only versioning
concept is which of `v1_lock_file.bzl`/`v2_lock_file.bzl`/`v3_lock_file.bzl`
successfully parses the file's *shape*, an orthogonal migration mechanism, not
a freshness signal).

**Where this diverges from crate_universe (BZL-RUST-01/BZL-RUST-05's
analogue), and why it matters more here than there.** rust.md's
`determine_repin()` "hard-`fail()`s on a digest mismatch on **every ordinary
build**" with no flag to add — the absent thing is an environment variable.
`rules_jvm_external`'s equivalent check is **opt-in**, not unconditional. Read
directly from source (`_pinned_coursier_fetch_impl` /
`_maven_install_impl` in
[`coursier.bzl:672-682`](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl#L672)):
on an `__INPUT_ARTIFACTS_HASH` mismatch, if `fail_if_repin_required` is
`False` (the [documented default](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl#L1683)),
the build prints "The inputs to `%s_install.json` have changed, but the lock
file has not been regenerated" and **continues**, resolving whatever the
stale lock's content says. The same branch structure repeats for
`__RESOLVED_ARTIFACTS_HASH` at
[`coursier.bzl:712-725`](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl#L712),
with the fail-path's message reading, verbatim: `"PLEASE DO NOT MODIFY THIS
FILE DIRECTLY! To generate a new %s_install.json and re-pin the artifacts,
follow these steps..."`. **Only `fail_if_repin_required = True` converts
either mismatch into a hard `fail()`.** This means the crate_universe
"nothing to add, something to remove" framing does not transfer: here there
is something to *add* — the boolean — and its absence is the silent failure
mode, exactly inverted from BZL-RUST-01/02's framing. This settles the
brief's DECIDE (a): **committing `maven_install.json` plus
`fail_if_repin_required = True` is a MUST**, not a SHOULD, precisely because
the default leaves both self-checks advisory.

**Where BZL-RUST-05's merge-driver analogy holds, and where it breaks.**
`maven_install.json` is exactly the shape BZL-RUST-05 describes: an opaque,
generator-computed pair of hashes that a **line-based git merge desyncs with
no conflict markers at all** — a three-way JSON-diff merge can easily produce
a syntactically valid file whose `artifacts` map differs from what either
`__INPUT_ARTIFACTS_HASH` or `__RESOLVED_ARTIFACTS_HASH` describes, and Git's
own textual conflict detector never fires because nothing looks like
`<<<<<<<`. So: never `union`, `ours`, or any line-based driver on this file,
for the same reason as BZL-RUST-05 and BZL-MOD-04. It **breaks** from both
sibling analogues in one way: **no ready-made schema-aware merge driver
ships for this file at all.** `bzlmod.md`'s `bazel-lockfile-merge` is a jq
driver Bazel itself ships for `MODULE.bazel.lock`'s specific schema — pointing
it at `maven_install.json` parses the wrong schema and is itself a finding
(the sibling file's own rule: "never point Bazel's own `bazel-lockfile-merge`
driver at it" reused verbatim for a different generator-owned file).
`rules_jvm_external` ships no analogous driver for its own lock format. The
practical consequence, and the one place this rule differs materially from
BZL-RUST-05's prescription: **there is no clean "keep both sides" merge
region** in `maven_install.json` at all (unlike `MODULE.bazel.lock`'s
`registryFileHashes`/`selectedYankedVersions`, which BZL-MOD-03 documents as
genuinely safe to hand-merge) — every top-level key here is either a
generator-computed hash or a value the hash covers. So the correct conflict
resolution is never "merge the JSON," schema-aware or not; it is: resolve the
conflicting `artifacts =`/`boms =` list in `MODULE.bazel` itself, discard
both sides of the generated lock file, and regenerate wholesale with
`REPIN=1 bazel run @maven//:pin`. **`fail_if_repin_required = True` is what
makes a bad merge that slips past this discipline loud instead of silent** —
the two mitigations (never hand-merge; fail on any resulting mismatch) are
complementary, not substitutes, exactly as the BZL-RUST-05/BZL-RUST-01 pair
is complementary for Cargo.

```starlark
# wrong — no freshness gate at all; every clean checkout re-resolves online
# with no checksum verification, and no repin warning is ever possible
maven.install(
    artifacts = ["junit:junit:4.13.2"],
    repositories = ["https://repo1.maven.org/maven2"],
)
```

```starlark
# right — pinned, and a stale/corrupted lock hard-fails instead of warning
maven.install(
    artifacts = ["junit:junit:4.13.2"],
    repositories = ["https://repo1.maven.org/maven2"],
    lock_file = "//:maven_install.json",
    fail_if_repin_required = True,
)
```

```bash
REPIN=1 bazel run @maven//:pin                  # repin everything
RULES_JVM_EXTERNAL_REPIN=1 bazel run @maven//:pin  # repin only rules_jvm_external's own resolution
```

**Multiple `maven.install` instances** each need their own `name` and their
own `lock_file` — reusing one lock file across two `install` tags is invalid,
not merely discouraged
([README §Multiple maven_install.json files](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#multiple-maven_installjson-files)).

### 2. version_conflict_policy, exclusions, neverlink/testonly

`version_conflict_policy` takes `"default"` (Coursier's own highest-wins
algorithm across the whole graph) or `"pinned"` (an artifact you declared in
`maven.install`/`maven.artifact` wins over any transitive request, higher or
lower). Demonstrated in the primary source with a worked example: pulling
`com.google.cloud:google-cloud-storage:1.66.0` transitively drags in
`guava-26.0-android`; declaring `guava:25.0-android` directly under the
`default` policy still resolves to `26.0-android` (highest wins); the same
declaration under `version_conflict_policy = "pinned"` resolves to the
declared `25.0-android`
([README §Resolving user-specified and transitive dependency version
conflicts](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#resolving-user-specified-and-transitive-dependency-version-conflicts)).
A single artifact can also be force-pinned regardless of the graph's overall
policy via `maven.artifact(force_version = "true", ...)`.

This is the Bazel-side answer to M-X-06 and the mapping a reviewer needs when
explaining drift across build systems: `default` behaves like unmanaged Maven
mediation (nearest-wins in Maven's actual algorithm, highest-wins in
Coursier's — the two are not identical, but both are "someone else's
transitive request can outrank your own"); `"pinned"` behaves like a Gradle
`strictly()`/BOM-enforced version, forcing your own declaration to hold.
**Reuse, never restate:** [`jvm-dependencies.md` GRADLE-DEP-09](../jvm-dependencies.md)
established that a lockfile (or here, a pinning policy) locks in
**resolution**, never legitimacy — `version_conflict_policy = "pinned"`
changes which version an attacker's or a stale registry's transitive
dependency has to beat to win a conflict, but it performs zero verification
of what that version actually is. Once `maven.install` is pinned via
`lock_file`, the SHA-256 in `maven_install.json` is the actual integrity
control (checksum-verified against Bazel's downloader); `version_conflict_policy`
is a resolution-determinism knob layered on top, not a second integrity
mechanism.

`excluded_artifacts` (on `maven.install`) removes a coordinate from the
**entire** resolved graph, globally, for every top-level artifact that would
have pulled it in. `maven.artifact(exclusions = [...])` removes it only from
**that one artifact's** transitive closure — a second top-level artifact that
also depends on the excluded coordinate still gets it. Picking the wrong
scope either starves a target of a jar it legitimately needed elsewhere, or
leaves a coordinate reachable through a different top-level artifact when the
intent was to ban it outright
([README §Artifact exclusion](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#artifact-exclusion)).

`neverlink`/`testonly` are per-coordinate amendments via
`maven.amend_artifact(coordinates = "...", neverlink = "true")` or
`testonly = "true"`. `neverlink` marks the generated `java_import`
compile-only (present at compile time, absent from the runtime classpath and
from any binary/deploy jar) — the worked example given is
`com.squareup:javapoet`, a codegen-time-only dependency with no business on a
shipped runtime classpath. `testonly` restricts the target to `testonly = True`
consumers (`java_test` and other `testonly`-tagged targets), demonstrated on
`junit:junit`
([README §Compile-only/Test-only dependencies](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#compile-only-dependencies)).

### 3. strict_visibility and the artifact() macro's buildozer cost

`strict_visibility = True` on `maven.install` sets every generated target's
visibility to `//visibility:private` by default (overridable per-repository
via `strict_visibility_value`), so a `deps =`/`exports =` entry that reaches a
transitive artifact you never declared fails to build instead of silently
compiling
([README §Hiding transitive dependencies](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#hiding-transitive-dependencies)).
Without it, pruning `maven.install`'s `artifacts` list can silently remove a
transitive jar that some other target was depending on without declaring —
the build still passes today and breaks the next time someone edits the list,
with no signal at the point of the actual mistake.

The `artifact("group:artifact")` helper macro resolves to the same target as
the literal `@maven//:group_artifact` label
(`@maven//:junit_junit` ≡ `artifact("junit:junit")`), and its only documented
cost is tooling friction, quoted: "usage of this macro makes BUILD file
refactoring with tools like `buildozer` more difficult, because the macro
hides the actual target label at the syntax level"
([README §artifact helper macro](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md#artifact-helper-macro)).
This is a readability/tooling trade-off, not a correctness bug — a
CONSIDER-level note for a codebase whose review or refactor tooling leans on
`buildozer` scripting the `deps` attribute directly.

```starlark
# both resolve identically; the second is buildozer-opaque
deps = ["@maven//:junit_junit"]
deps = [artifact("junit:junit")]
```

### 4. The ijar/inline-function trap

`ijar` (Bazel's interface-jar generator, used by `java_import` to strip
method bodies for faster incremental compilation) predates Kotlin and knows
nothing about Kotlin's `@Metadata` annotation or its inline-function
encoding. Quoted directly from rules_kotlin's own README: "make sure the
version you use doesn't naively use `java_import`, as this will cause bazel
to make an interface-only (`ijar`), or ABI jar, and the native `ijar` tool
does not know about kotlin metadata with respect to inlined functions, and
will remove method bodies inappropriately"
([README §Kotlin in your workspace](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#kotlin-in-your-workspace)).
An `inline fun` in Kotlin is spliced into the **caller's** bytecode at every
call site — the compiler needs the callee's actual method body available at
every downstream compilation, not merely its signature. Strip the body via
`ijar` and any caller that inlines that function fails to compile (or, worse,
compiles against a stale cached interface jar and produces silently wrong
bytecode).

This was [rules_jvm_external issue #59](https://github.com/bazel-contrib/rules_jvm_external/issues/59)
("java_import invokes ijar, which clobbers inline functions in kotlin"),
opened against exactly this failure mode (`kotlin.test`'s `assertFailsWith<T> { ... }`,
an inline function). It was fixed by
[PR #69](https://github.com/bazel-contrib/rules_jvm_external/pull/69)
(merged 2019-03-26), which added a Kotlin-aware import path: "To detect
whether a JAR is Kotlin-sourced, we run `jar tf` on jars during BUILD file
generation, and check for the existence of `kotlin_module` files. If it
exists, we use the `no_ijar_java_import` rule class" (PR description, quoted).
The mechanism is still present at 7.1, now as a dedicated Starlark rule whose
own header comment states its purpose without euphemism: "Stripped down
version of a java_import Starlark rule, without invoking ijar to create
interface jars... Inspired by... discussions on the GitHub thread about
ijar's interaction with Kotlin JARs"
([`private/rules/jvm_import.bzl:1-8`](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/jvm_import.bzl#L1)).
**Version floor: the fix predates rules_jvm_external's entire currently-
supported release line** (5.x onward per the project's own N/N-2 LTS
compatibility policy) — there is no live version of rules_jvm_external that
lacks it. The brief's premise that a version cutoff needs establishing is
answered: none is needed for a repository adopting rules_jvm_external today;
the trap is real only for (a) a hand-rolled `java_import` bypassing
`rules_jvm_external` entirely, or (b) a genuinely ancient pin predating 2019.
rules_jvm_external ships a regression fixture for this exact case at
`tests/unit/kotlin/com/example/bazel/InlineFunctionTest.kt` and a full
worked example at `examples/android_kotlin_app/`.

```starlark
# wrong — a hand-rolled java_import on a Kotlin jar strips inline-function bodies
java_import(
    name = "some_kotlin_lib",
    jars = ["some-kotlin-lib.jar"],
)
```

```starlark
# right — resolve Kotlin (and Java) coordinates through rules_jvm_external's
# maven.install; its jvm_import automatically detects kotlin_module entries
# and skips ijar for them — no manual opt-in needed
deps = ["@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core"]
```

### 5. x_lambdas: indy vs class across build systems

`kt_kotlinc_options` exposes two lambda-codegen knobs. `x_sam_conversions`
defaults to `"indy"` ("matching Kotlin compiler's own default since 1.5") —
no trap. `x_lambdas` defaults to `"class"` ("anonymous inner classes"),
documented explicitly as diverging: "which differs from Kotlin 2.x/Gradle
default of `\"indy\"` (invokedynamic)"
([docs/kotlin.md, `kt_kotlinc_options-x_lambdas` attribute row](https://github.com/bazel-contrib/rules_kotlin/blob/master/docs/kotlin.md#kt_kotlinc_options-x_lambdas);
README's prose version:
["Note: `kt_kotlinc_options` defaults `x_sam_conversions` to `\"indy\"`... but defaults `x_lambdas` to `\"class\"`, which differs from Kotlin 2.x and Gradle's default of `\"indy\"`"](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#lambda-bytecode-generation)).

The practical consequence: the **same `.kt` source file**, compiled once
under Gradle (Kotlin 2.x default: `indy`, real JVM `invokedynamic` +
`LambdaMetafactory`) and once under Bazel with rules_kotlin's default
(`class`, a synthesized anonymous inner class per lambda), produces
observably different bytecode — different class counts in the output jar,
different stack traces through lambda frames, and different results from any
bytecode-shape-sensitive tool (a bytecode size/class-count budget check, a
reflection-based test harness enumerating anonymous classes, certain
obfuscation/shrinking configurations tuned for one shape).

**Brief's DECIDE (b): in a repository that also builds with Gradle, this is a
MUST-configure, not a CONSIDER.** The two build systems' *documented
defaults* already agree with each other (`indy`) — it is specifically
rules_kotlin's own default that is the outlier versus both Kotlin 2.x's
compiler default and Gradle's. Leaving `x_lambdas` unset in a dual-build
repository is not "using each tool's default" — it is silently opting the
Bazel leg only into legacy-shape bytecode that neither the Kotlin compiler's
own author nor Gradle's Kotlin plugin chooses on their own. Set it explicitly
to match:

```starlark
# wrong in a repo also built with Gradle — silently diverges from the
# Kotlin-compiler and Gradle default, producing different bytecode
# for identical source depending on which build system ran
kt_kotlinc_options(name = "kt_kotlinc_options")
```

```starlark
# right — matches Kotlin 2.x's own compiler default and Gradle's default
kt_kotlinc_options(
    name = "kt_kotlinc_options",
    x_lambdas = "indy",
)
```

In a Bazel-only repository with no Gradle leg, this is a SHOULD, not a MUST —
there is no second build system's output to diverge from, and `"class"`
lambdas are correct, supported bytecode; the only cost is losing parity with
whatever bytecode-shape assumptions an external tool (a shrinker, a
bytecode-size budget) might carry from its own Gradle-trained defaults.

**Corpus check**: zero of the six Bazel-carrying exemplars (`bazel`,
`rules_java`, `rules_kotlin`, `rules_jvm_external`, `dagger`, `grpc-java`) set
`x_lambdas` anywhere, including `dagger`, which is a genuine dual
Gradle+Bazel Kotlin-adjacent repo. This is silent-default territory exactly
as the map row predicted, not a counterexample to the rule.

### 6. Kotlin worker defaults and the local opt-out

Persistent workers and multiplex workers are enabled **by default** — no flag
needed to turn them on — for three action mnemonics: `KotlinCompile` (main
compilation), `KotlinKsp2` (KSP 2 symbol processing), and `JdepsMerge` (jdeps
file merging)
([README §Workers](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#workers)).
This is M-X-10. A persistent worker keeps a compiler process alive across
builds and multiplexing runs several work requests through one such process
concurrently — both are a performance win, but both carry the class of risk
every persistent-process build strategy carries: a compiler bug or a
classloader/static-state leak inside the worker can make build N+1's output
depend on build N's process state rather than purely on build N+1's declared
inputs, in principle defeating hermeticity guarantees a from-scratch action
would hold by construction. rules_kotlin's own docs make no correctness claim
beyond "significantly improves build performance by reusing compiler
processes across builds" — they neither promise nor disclaim
non-reproducibility from stale worker state, so treat "on by default" as a
performance decision inherited silently, not a reproducibility guarantee.

Opt out per mnemonic:

```
build --strategy=KotlinCompile=local
build --strategy=KotlinKsp2=local
build --strategy=JdepsMerge=local
```

Multiplexing alone (keeping the persistent worker but capping concurrent work
units) is a separate, narrower dial:

```
build --experimental_worker_max_multiplex_instances=KotlinCompile=0
```

This block is a CONSIDER, not a MUST/SHOULD: no primary source states a
correctness defect in the default, and no exemplar in the corpus overrides
it — the sibling `testing.md`/`caching.md` own worker-strategy flag semantics
generally; this row exists here only because the three mnemonics themselves
(`KotlinCompile`, `KotlinKsp2`, `JdepsMerge`) are Kotlin-specific and a
reviewer needs to know they exist and are on by default before deciding
whether a flaky or suspiciously-cached Kotlin build warrants the local
fallback as a diagnostic step.

### 7. The dual-build source-of-truth question (M-X-07)

Settled against the corpus, reusing the audit's own measurement rather than
re-deriving it: **nothing in the exemplar corpus checks Gradle/Bazel
dependency-graph parity**, in either genuinely dual-build repo. Neither
`google/dagger` nor `grpc/grpc-java` generates one build's dependency
declarations from the other's, and neither documents *why* it carries two
build systems at all
([`jvm-audit/exemplar-publishing-ci-bazel.md` §Axis 4](../jvm-audit/exemplar-publishing-ci-bazel.md)).
`dagger`'s answer is a plain prose line — confirmed by direct read: "Dagger is
built with [`bazel`](https://bazel.build)."
(`google__dagger@4fbc045d2b:CONTRIBUTING.md:29`, verified at HEAD in the
exemplar clone) — plus CI job ordering: `.github/workflows/release.yml`
gates every publish job on `needs: bazel-build`/`needs: bazel-test`, so a
broken Bazel build blocks release, but this proves only that both builds
individually succeed, never that their resolved *artifact sets* agree.
`grpc-java`'s `.bazelrc` carries no Java version pin at all
(`grpc__grpc-java@fc4314419d:.bazelrc:1-3`, C++ flags only) and no
`maven_install.json`, sourcing artifacts instead from an
`IO_GRPC_GRPC_JAVA_ARTIFACTS` Starlark constant — its own dependency
declaration is not lock-pinned by rules_jvm_external's own mechanism at all,
making a parity check against its Gradle build doubly moot (neither side is
independently verifiable against a checksum).

**DECIDE (c), answered**: M-X-07 gets a **reading heuristic, never a
mechanical rule**. No primary source proposes a generator or verifier for
this, no exemplar runs one, and the two real-world instances of the pattern
in this corpus answer the "why two build systems" question with a
CONTRIBUTING-file sentence rather than a technical rationale — there is
nothing here to encode as a grep or a query. The heuristic a reviewer should
apply: in a repository declaring both a Gradle and a Bazel build for the same
artifact, find the doc line (a `CONTRIBUTING.md`, a top-level `README.md`
section) naming which build is canonical and treat its absence as a finding
in its own right — not "which is correct" (unanswerable without one), but
"is it written down" (mechanically checkable by its presence or absence).

## Normative guidance candidates

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-30 | Set `lock_file = "//:maven_install.json"` (or another explicit path) on every `maven.install` call. | Without it, resolution is unpinned on every clean checkout: no checksum verification, no cross-workspace sharing, no offline builds. | `grep -n -A6 'maven.install(' MODULE.bazel` — an instance with no `lock_file =` inside the block is the finding; empty grep output (no `maven.install` at all) is nothing to check. | MUST |
| BZL-JAVA-31 | Set `fail_if_repin_required = True` on every `maven.install` call that carries a `lock_file`. | The default (`False`) makes both of the lock file's self-checks (input-artifacts hash, resolved-artifacts hash) advisory warnings the build survives; only this flag converts a stale or corrupted lock into a hard failure. | `grep -n 'fail_if_repin_required' MODULE.bazel` — absent (or explicitly `False`) on a pinned `maven.install` is the finding; `True` is the pass. Self-verifying at build time once set: a deliberately staled artifact list must reproduce the documented `fail()` text (`"...contains an invalid input signature... and must be regenerated"`). | MUST |
| BZL-JAVA-32 | Never hand-edit `maven_install.json`, and never resolve a merge conflict in it by keeping one side, unioning, or hand-splicing JSON. On any conflict, discard both sides, resolve the conflicting `artifacts =`/`boms =` list in `MODULE.bazel`, and regenerate wholesale with `REPIN=1 bazel run @maven//:pin`. | The file carries two generator-computed hashes over its own content with **no human-editable "safe" region** (unlike `MODULE.bazel.lock`'s `registryFileHashes`); a line-based or JSON-aware-but-naive merge produces a syntactically valid file whose hashes silently no longer match its body, with no conflict markers for Git's detector to find. | `git check-attr merge maven_install.json '*_install.json'` — any driver other than "unspecified with a documented never-hand-merge policy in the repo's onboarding doc" is a finding if it claims to safely merge this file (no primary source ships one to point at); the mechanical backstop is BZL-JAVA-31 catching whatever a bad merge produces. | MUST |
| BZL-JAVA-33 | Never conflate `maven_install.json` with `MODULE.bazel.lock` in review, tooling, or documentation. | The two lockfiles have unrelated schemas, unrelated freshness mechanisms (this file's is opt-in via `fail_if_repin_required`; `MODULE.bazel.lock`'s is `--lockfile_mode`-gated per `bzlmod.md`), and unrelated merge drivers (`bazel-lockfile-merge` is schema-specific to `MODULE.bazel.lock` and must never be pointed at this file). | Reading heuristic: a PR description, onboarding doc, or CI job comment that says "the lockfile" without naming which of the two is the finding whenever both files exist in the repository. | SHOULD |
| BZL-JAVA-34 | Set `version_conflict_policy = "pinned"` wherever the build needs deterministic conflict resolution rather than Coursier's highest-wins default; document the choice once per `maven.install` call, not per artifact. | `default` silently resolves like unmanaged Maven mediation (a transitive can outrank your explicit declaration); `pinned` forces your declared version to win, at the cost of needing `force_version` for a deliberate exception. Reuse [`jvm-dependencies.md` GRADLE-DEP-09](../jvm-dependencies.md): neither setting vets a version, both only decide which one wins a conflict. | `grep -n 'version_conflict_policy' MODULE.bazel`; absent means `default` applies — a finding only if the same repository claims deterministic dependency resolution elsewhere (e.g., a reproducibility doc) without qualifying that claim. | SHOULD |
| BZL-JAVA-35 | Scope every exclusion to the narrowest correct mechanism: `maven.artifact(exclusions = [...])` for a single top-level artifact's transitive closure, `excluded_artifacts` on `maven.install` only when the coordinate must be banned from the entire resolved graph. | The two are not interchangeable: a global `excluded_artifacts` entry can starve an unrelated target that legitimately needed the jar; a per-artifact `exclusions` entry leaves the coordinate reachable through any other top-level artifact that also pulls it in. | Read each `excluded_artifacts`/`exclusions` entry against what actually needs the excluded coordinate elsewhere in the graph (`bazel query 'somepath(//..., @maven//:<excluded_target>)'` after a build the exclusion is meant to affect) — a query returning a path the exclusion was meant to sever is the finding. | SHOULD |
| BZL-JAVA-36 | Mark a compile-time-only Maven dependency (an annotation-processor-only or codegen-only artifact) `neverlink = "true"` via `maven.amend_artifact`; mark a test-only one `testonly = "true"` the same way. Never hand-edit the generated `java_import` target to add either attribute. | `neverlink`/`testonly` on the generated target is the only place these semantics are expressed once `maven.install` owns target generation; a hand-edit is silently overwritten on the next repin, and its absence lets a codegen-only jar (or a test-only one) leak onto a runtime or production classpath with no build-time signal. | `grep -n 'neverlink\|testonly' MODULE.bazel` against a manual review of `bazel query 'kind(java_import, @maven//...)'` output for a target you know should carry one of these — a mismatch between intent and the amend list is the finding. | SHOULD |
| BZL-JAVA-37 | Set `strict_visibility = True` on `maven.install` in any repository with more than a handful of contributors touching the `artifacts` list. | Without it, every transitive dependency is visible to every target by default, so pruning the declared `artifacts` list can silently remove a jar some other target was depending on undeclared — the failure surfaces later, elsewhere, with no link back to the actual edit. | `grep -n 'strict_visibility' MODULE.bazel`; absent is a finding to raise, not an automatic block — the corpus shows this set at `bazel`, `grpc-java`, and `rules_jvm_external`'s own dogfooded `MODULE.bazel`, so its absence in a comparable multi-contributor repo is worth asking about. | CONSIDER |
| BZL-JAVA-38 | Prefer the literal `@maven//:group_artifact` label over the `artifact("group:artifact")` macro in any BUILD file a `buildozer`-driven refactor or dependency-automation tool will touch. | The macro's own documentation states it "makes BUILD file refactoring with tools like `buildozer` more difficult, because the macro hides the actual target label at the syntax level" — a tooling cost, not a correctness one. | Reading heuristic, no grep substitutes: does this repository run `buildozer` (interactively or in an automated dependency-bump job)? If yes, an `artifact(...)` call site is a friction point to flag, never a build-breaking finding. | CONSIDER |
| BZL-JAVA-39 | Never let a Maven-resolved Kotlin jar reach a hand-rolled `java_import`; resolve Kotlin coordinates only through `rules_jvm_external`'s `maven.install`, whose generated import target detects `kotlin_module` entries and skips `ijar` automatically. | A naive `java_import` on a Kotlin jar strips method bodies via `ijar`, and `ijar` "does not know about kotlin metadata with respect to inlined functions" — a caller of an inline function compiled against the stripped jar fails or, worse, silently miscompiles. | `grep -rn 'java_import(' --include=BUILD.bazel --include=BUILD .` — a hand-written `java_import` whose `jars` attribute names a `.jar` containing Kotlin metadata (`unzip -l <jar> \| grep META-INF/.*\.kotlin_module`) is the finding; every coordinate reached through `@maven//:...` is already covered by rules_jvm_external's own Kotlin-aware import path and is not a finding. | MUST |
| BZL-JAVA-40 | In any repository that also builds the same Kotlin sources with Gradle, set `kt_kotlinc_options(x_lambdas = "indy")` explicitly on the Bazel side. In a Bazel-only Kotlin repository, this is a should-configure, not a must. | rules_kotlin's own default (`"class"`) diverges from both Kotlin 2.x's compiler default and Gradle's default (both `"indy"`) — leaving it unset in a dual-build repo silently produces different bytecode for identical source depending on which build system ran, which neither tool's own author chose as a shared default. | `grep -rn 'kt_kotlinc_options\|x_lambdas' --include=BUILD.bazel --include=BUILD --include='*.bzl' .` in a repository that also has a `build.gradle*`/`libs.versions.toml` Kotlin plugin: an `x_lambdas` unset (or explicitly `"class"`) in that combination is the finding. A Bazel-only repository with no Gradle leg is not a finding either way. | MUST when a Gradle leg for the same Kotlin sources exists; SHOULD otherwise |
| BZL-JAVA-41 | Know that `KotlinCompile`, `KotlinKsp2` and `JdepsMerge` run under persistent, multiplexed workers by default with no opt-in flag, and reach for `--strategy=<mnemonic>=local` as the first diagnostic step when a Kotlin build is flaky or produces output that looks stale relative to its declared inputs. | The defaults are undocumented-as-a-risk (rules_kotlin claims a performance win and states no correctness caveat), so a reviewer who does not know they are on by default has no reason to suspect worker-process state when triaging a Kotlin-specific flake. | Reading heuristic: for any Kotlin build-flakiness report, confirm whether disabling the relevant mnemonic's worker (`--strategy=<mnemonic>=local`) makes the symptom disappear before attributing it to source code or dependency changes. | CONSIDER |
| BZL-JAVA-42 | In a repository building the same code under both Gradle and Bazel, require a single prose line naming which build is canonical (a `CONTRIBUTING.md` or top-level `README.md` statement); do not require, and do not attempt to build, a generator or verifier proving the two dependency graphs agree. | No primary source and no exemplar in this corpus (including the two genuine dual-build repos) documents a technical rationale for carrying two build systems, and none runs a parity check between them — the corpus's own answer is a doc sentence plus CI job ordering, not a generator. Inventing a stronger requirement here would assert a practice that does not exist anywhere it was measured. | Reading heuristic only: grep the repository's `CONTRIBUTING.md`/`README.md` for a sentence naming the canonical build (`grep -rniE 'built with (bazel\|gradle)\|canonical build' CONTRIBUTING.md README.md`); its absence in a genuinely dual-build repo is the finding, its presence is the pass — parity between the two graphs is out of scope for a mechanical check. | SHOULD |

```starlark
# wrong — advisory-only freshness, no self-tamper check enforced
maven.install(
    artifacts = [...],
    lock_file = "//:maven_install.json",
)
```

```starlark
# right — matches BZL-JAVA-31; a stale or hand-edited lock hard-fails
maven.install(
    artifacts = [...],
    lock_file = "//:maven_install.json",
    fail_if_repin_required = True,
    version_conflict_policy = "pinned",
    strict_visibility = True,
)
```

## Exemplar evidence

| Candidate | Exemplar | Evidence |
|---|---|---|
| BZL-JAVA-30/31 (lock_file + fail_if_repin_required) | `google__dagger@4fbc045d2b` | **Satisfies both.** `MODULE.bazel:185-186` sets `fail_if_repin_required = True` and `lock_file = "//:maven_install.json"` on its `maven.install` block (verified by direct read, `git show HEAD:MODULE.bazel`). |
| BZL-JAVA-30/31 | `grpc__grpc-java@fc4314419d` | **Violates both by absence.** No `maven_install.json` in-tree at all; artifacts come from an `IO_GRPC_GRPC_JAVA_ARTIFACTS` Starlark constant, unpinned by rules_jvm_external's own mechanism ([`jvm-audit/exemplar-publishing-ci-bazel.md` §Axis 4](../jvm-audit/exemplar-publishing-ci-bazel.md)). |
| BZL-JAVA-34 (version_conflict_policy) | `bazel-contrib__rules_jvm_external@master` | **Satisfies, dogfooded.** `MODULE.bazel:335,592,653` all set `version_conflict_policy = "pinned"` on the project's own `maven.install` instances (verified via `git grep` on the live exemplar clone). |
| BZL-JAVA-34 | `google__dagger@4fbc045d2b` | No `version_conflict_policy` set anywhere (`git grep` returned no hits) — rides Coursier's default highest-wins policy despite pinning its lock file otherwise carefully. |
| BZL-JAVA-37 (strict_visibility) | `bazel-contrib__rules_jvm_external`, `grpc__grpc-java`, `bazelbuild__bazel` | **Satisfies, three separate repos.** `strict_visibility = True` present in `rules_jvm_external@master:MODULE.bazel:86,610,874,892` (including test fixtures), `grpc-java@fc4314419d:MODULE.bazel:78,100` and `examples/MODULE.bazel:31`, and `bazel@948b8c70e2:MODULE.bazel:269`. |
| BZL-JAVA-39 (ijar/inline-function fix) | `bazel-contrib__rules_jvm_external@master` | **Fixed and regression-tested.** `private/rules/jvm_import.bzl:1-8` implements the ijar-free import path with an explicit header comment citing the original GitHub thread; `tests/unit/kotlin/com/example/bazel/InlineFunctionTest.kt` and `examples/android_kotlin_app/` exercise it directly. |
| BZL-JAVA-40 (x_lambdas) | All 6 Bazel-carrying exemplars, including `google__dagger@4fbc045d2b` (14 `kt_jvm_library` hits per [`jvm-audit/exemplar-publishing-ci-bazel.md` §Axis 4](../jvm-audit/exemplar-publishing-ci-bazel.md)) | **Nobody sets it — the silent-default risk is real, not hypothetical.** `git grep -n 'x_lambdas'` returns zero hits in any of the six repos with `MODULE.bazel`/`BUILD` files, including the one genuine dual-build Kotlin-adjacent repo (`dagger`). |
| BZL-JAVA-42 (dual-build doc line) | `google__dagger@4fbc045d2b` | **Partially satisfies.** `CONTRIBUTING.md:29` states "Dagger is built with `bazel`" — the canonical-build sentence exists — but no companion statement or mechanism establishes why Gradle also ships, nor any parity check between the two ([`jvm-audit/exemplar-publishing-ci-bazel.md` §Axis 4](../jvm-audit/exemplar-publishing-ci-bazel.md)). |
| BZL-JAVA-42 | `grpc__grpc-java@fc4314419d` | **Violates.** No equivalent sentence found in the exemplar's top-level docs per the audit; its `.bazelrc` (C++ flags only) and unpinned Maven artifacts make a parity claim doubly unverifiable even in principle. |

## AI-agent angle

1. **Assuming rules_jvm_external's freshness gate is unconditional like
   crate_universe's.** A model trained on the general "Bazel lockfiles
   auto-verify" pattern will state that a stale `maven_install.json` fails
   the build without checking `fail_if_repin_required` — it defaults to
   `False` and the mismatch is merely printed. *Check:* `grep -n
   fail_if_repin_required MODULE.bazel`; absent or `False` on a `lock_file`-
   bearing `maven.install` means the claim is wrong (BZL-JAVA-31).
2. **Inventing a `--lockfile_mode`-style flag for `maven_install.json`** by
   analogy with `MODULE.bazel.lock`'s bzlmod flag family. No such flag exists
   for this file; the mechanism is entirely attribute- plus environment-
   variable-based (`lock_file`, `fail_if_repin_required`, `REPIN`,
   `RULES_JVM_EXTERNAL_REPIN`). *Check:* `bazel help build --long \| grep -i
   maven` and `bazel help build --long \| grep -i lockfile` — the second
   returns bzlmod's flags only, never anything scoped to `maven_install.json`.
3. **Reaching for `bazel sync` or a `bazel fetch --repo=@maven` style verb to
   repin**, porting the Rust-family muscle memory. The repin verb here is
   `bazel run @maven//:pin` (a generated executable target), not a
   fetch/sync subcommand — there is no `@maven` repository fetch that
   performs repinning on its own. *Check:* `grep -rn 'bazel sync\|fetch
   --repo=@maven' . --include='*.md' --include='*.sh' --include='*.yml'` —
   any hit describing a maven repin is the finding.
4. **Treating a naive `java_import` of a third-party Kotlin jar as safe**
   because it "builds" — the failure mode is a compile-time error only when
   the stripped inline function is actually called from outside the jar
   during that particular build; a codebase that never happens to call the
   affected inline function compiles clean while silently carrying a
   corrupted classpath entry, and the bug surfaces months later when a new
   caller is added. *Check:* never hand-write `java_import` for a
   Maven-sourced Kotlin artifact at all — route it through
   `rules_jvm_external`'s `maven.install` (BZL-JAVA-39), which already
   detects and handles this.
5. **Assuming Kotlin lambda bytecode is identical across Gradle and Bazel**
   because "it's the same compiler." It is not the same *default
   configuration* — rules_kotlin's `x_lambdas` default diverges from
   Kotlin 2.x's and Gradle's shared default, and a model asked to explain a
   bytecode-shape difference between a repo's two build legs will reach for
   compiler-version mismatch or JDK-target mismatch before checking this
   flag. *Check:* `grep -n x_lambdas` across `kt_kotlinc_options` call sites
   before attributing a lambda-shape discrepancy to anything else.
6. **Citing `bazelbuild/rules_kotlin` as the current canonical repository.**
   The org transferred to `bazel-contrib/rules_kotlin`; a model trained
   before the transfer (or one that searches instead of fetching) will link
   the old org path. *Check:* resolve the repo via `gh api
   repos/bazelbuild/rules_kotlin --jq .full_name` — a mismatch against the
   queried path confirms a transfer, not a fork.
7. **Assuming `rules_jvm_external` and `rules_jvm` merged** because both are
   now under the `bazel-contrib` org and share a naming prefix. They are two
   separate, actively maintained repositories with different scopes
   (external Maven resolution vs. contributed first-party Java rule
   helpers). *Check:* `gh api repos/bazel-contrib/rules_jvm_external --jq
   .full_name` and the same for `rules_jvm` — two distinct, non-archived
   records settle it without search.

## Contested / evolving

- **`bazelbuild/rules_kotlin` → `bazel-contrib/rules_kotlin` org transfer**,
  confirmed as of 2026-09-12 (`gh api repos/bazelbuild/rules_kotlin` resolves
  to `full_name: "bazel-contrib/rules_kotlin"`). This mirrors
  `rules_jvm_external`'s earlier move to the same org — the trend is toward
  `bazel-contrib` consolidating community-maintained JVM-adjacent rulesets
  that were previously scattered across `bazelbuild` and independent
  maintainers. Treat any citation of the old org path as stale, not wrong in
  content.
- **The Build Tools API (rules_kotlin) is opt-in, not yet default.**
  "By default rules_kotlin compiles through the legacy `K2JVMCompiler`"; the
  Build Tools API — JetBrains's modern compiler invocation interface,
  required for incremental compilation support — needs an explicit
  `--@rules_kotlin//kotlin/settings:experimental_build_tools_api=true` or a
  per-toolchain `experimental_build_tools_api = True`
  ([README §Build Tools API](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md#build-tools-api)).
  This sits adjacent to, not inside, this dive's scope (it changes
  compilation invocation, not external-dependency or lambda-codegen
  behavior), but a reviewer evaluating "is this repo on a modern Kotlin-
  under-Bazel setup" should know the flag exists and defaults off.
- **Transitive dependency pruning is experimental and narrow.**
  `--@rules_kotlin//kotlin/settings:experimental_prune_transitive_deps=True`
  removes transitive dependencies from the Kotlin compile classpath, with an
  explicit escape hatch (`experimental_prune_transitive_deps_keep_transitive_repositories`)
  because "some Maven dependency graphs need to remain transitive." Both
  flags default off/empty; this is a genuinely unsettled feature, not yet a
  practice to recommend adopting broadly.
- **M-X-07 (dual-build source of truth) is trending toward "document it,
  don't verify it," not the reverse.** Neither exemplar dual-build repo in
  this corpus has moved toward a generator or parity check in the versions
  measured; the practice observed is a static prose statement plus CI
  ordering. Nothing in the primary sources for either ruleset proposes
  changing this. Absent new evidence, this dive's SHOULD-level heuristic
  (BZL-JAVA-42) is the ceiling of what can be recommended honestly.

## Gaps

- No primary source or exemplar states a numeric threshold (artifact count,
  resolution time) at which `version_conflict_policy = "pinned"` becomes
  necessary versus optional performance-wise — the recommendation here is
  determinism-driven, not measured against a build-time cost.
- `x_lambdas = "indy"`'s interaction with rules_kotlin's Build Tools API
  (opt-in, K2-based) has not been independently verified in this corpus — no
  exemplar enables both simultaneously. Treat the combination as unmeasured,
  not as confirmed-compatible.
- Whether any JSON-aware git merge driver exists in the wider Bazel ecosystem
  that a repository could adopt for `maven_install.json` specifically (as
  opposed to writing one) was not found in either primary source; the
  practical guidance here (BZL-JAVA-32) is a process rule, not a tool
  recommendation, because no tool surfaced.
- The exact bytecode-level diff between `x_lambdas = "class"` and
  `x_lambdas = "indy"` output (class count, method count, verified via
  `javap`/`asm`) was not independently reproduced here — the claim rests on
  the two primary sources' own documentation of the divergence, not on a
  compiled sample.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel-contrib/rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md) | Primary ruleset docs, fetched at `master` (= 7.1) | 7.1, 2026-07-23 | The pinning workflow, `fail_if_repin_required`, `version_conflict_policy`, exclusions, `neverlink`/`testonly`, `strict_visibility`, `artifact()` macro cost — nearly every rule in this file. |
| [rules_jvm_external `v3_lock_file.bzl` source](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/v3_lock_file.bzl) | Source of truth for the lock file's two hash fields | 7.1 | Confirms `__INPUT_ARTIFACTS_HASH` and `__RESOLVED_ARTIFACTS_HASH` are separate, independently-checked fields — not documented this precisely in the README prose. |
| [rules_jvm_external `coursier.bzl` source](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl) | Source of truth for `fail_if_repin_required`'s default and branch behavior | 7.1 | Settles DECIDE (a): the default is `False` and both mismatches are warn-only without it — this exact mechanism is not spelled out in the README. |
| [rules_jvm_external issue #59](https://github.com/bazel-contrib/rules_jvm_external/issues/59) | Original bug report, "java_import invokes ijar, which clobbers inline functions in kotlin" | Filed and closed 2019-03-26 | The original statement of the ijar/inline-function trap and its Bazel-issue root cause (bazelbuild/bazel#4549). |
| [rules_jvm_external PR #69](https://github.com/bazel-contrib/rules_jvm_external/pull/69) | The fix, merged 2019-03-26 | 2019, present at every current release | Establishes the version floor (none needed today) and the mechanism (`kotlin_module` detection → ijar-free import). |
| [rules_jvm_external `jvm_import.bzl` source](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/jvm_import.bzl) | Current implementation of the ijar-free import path | 7.1 | Confirms the 2019 fix is still the live mechanism, not superseded or removed. |
| [rules_jvm_external releases page](https://github.com/bazel-contrib/rules_jvm_external/releases) | Version history | through 7.1, 2026-07-23 | Confirms current version and release cadence; used to settle the "has it merged with rules_jvm" question via `gh api`. |
| [bazel-contrib/rules_jvm](https://github.com/bazel-contrib/rules_jvm) | Sibling ruleset (contrib_rules_jvm), checked for a merge claim | 2026-09-12 | Confirmed separate, non-archived, distinct scope — settles the recent-shifts scout's flagged uncertainty by direct fetch, not search. |
| [bazel-contrib/rules_kotlin README](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md) | Primary ruleset docs, fetched at `master` (= v2.4.10) | v2.4.10, 2026-08-20 | The `ijar`/Kotlin-metadata warning (in rules_kotlin's own words), `x_lambdas`/`x_sam_conversions` defaults, worker defaults and the `--strategy=<mnemonic>=local` opt-out, Build Tools API opt-in. |
| [bazel-contrib/rules_kotlin docs/kotlin.md](https://github.com/bazel-contrib/rules_kotlin/blob/master/docs/kotlin.md) | Generated API reference for `kt_kotlinc_options` and toolchain attributes | v2.4.10 | The precise attribute-level doc string for `x_lambdas`, confirming the README's prose claim at the API-reference level. |
| [`jvm-audit/exemplar-publishing-ci-bazel.md` §Axis 4](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own prior measurement of the 6 Bazel-carrying exemplars | Measured 2026-09-xx (wave 2) | Source for the dagger/`fail_if_repin_required`, grpc-java-unpinned, and dual-build CI-ordering findings reused rather than re-derived. |
| [`jvm-dependencies.md` GRADLE-DEP-09](../jvm-dependencies.md) | This program's own consolidated Gradle dependency-locking finding | Measured wave 2 | The "lockfile pins resolution, never legitimacy" framing this file's `version_conflict_policy`/pinning rows explicitly reuse rather than re-derive. |
| `google__dagger@4fbc045d2b` exemplar clone, `MODULE.bazel` and `CONTRIBUTING.md` | Direct re-read of the exemplar corpus (this dive) | Pinned SHA per frame | Confirms `fail_if_repin_required = True` at `MODULE.bazel:185` and the canonical-build sentence at `CONTRIBUTING.md:29` first-hand, beyond what the prior audit quoted. |
| `bazel-contrib__rules_jvm_external@master`, `grpc__grpc-java@fc4314419d`, `bazelbuild__bazel@948b8c70e2` exemplar clones, `MODULE.bazel` | Direct `git grep` of the exemplar corpus (this dive) | Pinned SHAs / live master | Confirms `strict_visibility = True` and `version_conflict_policy = "pinned"` exemplar hits used in [Exemplar evidence](#exemplar-evidence). |
| [rules_jvm_external `maven_coursier_install.json`](https://github.com/bazel-contrib/rules_jvm_external/blob/master/maven_coursier_install.json) | The project's own dogfooded lock file | master, 2026-09-12 | Direct confirmation of the lock file's exact header shape (`__AUTOGENERATED_FILE_DO_NOT_MODIFY_THIS_FILE_MANUALLY`, both hash fields) beyond the README's paraphrase. |
| `gh api repos/bazelbuild/rules_kotlin`, `repos/bazel-contrib/rules_jvm_external`, `repos/bazel-contrib/rules_jvm` (GitHub REST API) | Direct repository-metadata queries (this dive) | Queried 2026-09-12 | Settled the org-transfer and no-merge questions by direct fetch rather than search, per the brief's explicit instruction. |
