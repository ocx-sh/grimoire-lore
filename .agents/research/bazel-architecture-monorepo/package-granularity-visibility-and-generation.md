---
title: Package granularity, visibility, and BUILD generation
topic: package-granularity-visibility-and-generation
group: bazel-architecture-monorepo
family: BZL-ARCH
agent: wave2-package-granularity-visibility-and-generation
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 12
settles: [M-G-01, M-G-02, M-G-03, M-G-04, M-G-05, M-G-06]
scope: >
  Covers three questions only: (1) what makes a package boundary correct
  (the package-per-directory rule and the glob() trap it guards against),
  (2) Bazel's three visibility mechanisms plus package_group as the reusable
  allowlist, and (3) whether hand-written or generated BUILD files are
  sustainable per language, resolved as a conditional granularity rule keyed
  to Gazelle-plugin maturity. Does NOT cover platforms/select()/transitions,
  migration-state standards, or protobuf modelling — see the sibling dive
  platforms-selects-transitions-and-migration-state.md for M-G-07 through
  M-G-24.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The package-per-directory rule](#1-the-package-per-directory-rule)
   2. [The glob() package-boundary trap](#2-the-glob-package-boundary-trap)
   3. [Fine-grained targets: the argument and its cost](#3-fine-grained-targets-the-argument-and-its-cost)
   4. [Target visibility: syntax, defaults, the public anti-pattern](#4-target-visibility-syntax-defaults-the-public-anti-pattern)
   5. [package_group as the reusable allowlist](#5-package_group-as-the-reusable-allowlist)
   6. [Load visibility and the bzl-visibility lint](#6-load-visibility-and-the-bzl-visibility-lint)
   7. [Transitive visibility: real, but not yet in a numbered release](#7-transitive-visibility-real-but-not-yet-in-a-numbered-release)
   8. [Generator maturity by language: who owns the Gazelle plugin](#8-generator-maturity-by-language-who-owns-the-gazelle-plugin)
   9. [Verifying "no diff": the gazelle rule's mode attribute](#9-verifying-no-diff-the-gazelle-rules-mode-attribute)
   10. [The coarse-side proxy: rule-count-to-source-file ratio](#10-the-coarse-side-proxy-rule-count-to-source-file-ratio)
   11. ["1:1:1" is Pants vocabulary, not Bazel's](#11-111-is-pants-vocabulary-not-bazels)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Every directory containing buildable files should own a BUILD file; a `srcs`/`hdrs` entry that is a bare path into a subdirectory (not a label) is the documented sign a BUILD file is missing there ([bazel.build/configure/best-practices](https://bazel.build/configure/best-practices)).
- `glob()` never crosses a package boundary — adding a BUILD file to a subdirectory silently shrinks every existing glob that used to reach into it, with no error ([bazel.build/reference/be/functions](https://bazel.build/reference/be/functions)).
- Bazel has three, and only three, visibility systems: target visibility, transitive visibility, and load visibility ([bazel.build/concepts/visibility](https://bazel.build/concepts/visibility)) — not two, and "transitive" is a distinct package-level mechanism, not a synonym for target visibility's propagation.
- `default_visibility = ["//visibility:public"]` at package level is a named anti-pattern in Bazel's own docs, with **no buildifier lint** that catches it — confirmed by reading `buildtools/WARNINGS.md` in full: no warning category mentions `default_visibility`.
- `package_group(name, packages, includes)` is the reusable allowlist; `includes` is transitive, but negated `packages` specs inside one group have **no effect** on another group's specs — each group's set is computed independently, then unioned.
- Load visibility (`visibility()` in a `.bzl` file) has been available since **Bazel 6.0**, defaults to public unless declared, and is a *different* mechanism from target visibility — a BUILD target can be public while its `.bzl` source stays load-gated, which is exactly what `rules_ocx` does today.
- A brand-new `transitive_visibility` package-level parameter appears on the current (`HEAD`) `bazel.build/concepts/visibility` page but is **absent from the versioned 8.1.0 and 9.1.0 doc snapshots** — treat it as unreleased-or-very-recent, not as a Bazel-8/9-stable feature, until confirmed against the target version's own `bazel help`.
- Fine-grained targets buy a narrower affected-test set and more build parallelism, at the cost of BUILD-file maintenance labour — both Bazel's own best-practices page and Google's SWE book (ch. 18) state this as a trade-off, not a free win: "a typical production binary at Google will likely depend on tens of thousands of targets," mitigated only by "investing in tooling to automatically manage BUILD files."
- Generator (Gazelle) plugin maturity is genuinely uneven by language: Python's lives inside `rules_python` itself (first-party); JS/TS is Aspect's own `aspect-gazelle`; Rust's (`Calsign/gazelle_rust`) and C/C++'s (`EngFlow/gazelle_cc`) are third-party, independently-versioned, and both still pre-1.0 (`0.1.0`) as of this read.
- **Granularity is not an independent choice — it is downstream of generator maturity.** Go fine-grained only where a maintained generator exists for that language; stay coarse (directory-per-package, hand-maintained) elsewhere.
- "1:1:1" (one target : one file : one package) is Pants' own coined idiom, confirmed on Pants' own docs (`v1.pantsbuild.org/build_files.html`) — Bazel's docs never use the phrase. A rule that cites "1:1:1" as Bazel's is misattributing.
- Uber's Go monorepo (70,000+ files, ~10,000 monthly commits, ~900 monthly active engineers) is the concrete "what generation buys" case study: Gazelle infers Bazel rules from `go.mod`/source directly, and even so Uber had to *extend* Gazelle (separate macro file for `go_repository` rules, automatic pruning) — generation is load-bearing but not turnkey at scale.
- The CI-native "no diff" check is not a bare CLI invocation — it is the `gazelle_test` Bazel rule (`@gazelle//:def.bzl`), whose `mode` attribute **defaults to `"diff"`**; `bazel test //:gazelle_test` fails (non-zero exit, diff printed) exactly when checked-in BUILD files would change.
- There is no official numeric threshold for "how fine is fine-grained" — the rule-count-to-source-file ratio is a heuristic proxy for the coarse side, not a documented Bazel metric, and any rule built on it must stay CONSIDER, not MUST.
- `--incompatible_no_implicit_file_export` (current default **true**) means a file mentioned only via a rule's `srcs=` is package-private unless `exports_files()` names it explicitly — the pre-Bazel-8-era pattern of "any referenced file is implicitly exported" is gone by default.
- `config_setting` targets used as `select()` keys are visibility-checked by default now: `--incompatible_enforce_config_setting_visibility` defaults **true**, and `--incompatible_config_setting_private_default_visibility` (default **false**) means an unspecified-visibility `config_setting` is still `//visibility:public` today, not private — an asymmetry worth stating explicitly because "it's a no-op" reads the wrong way twice here.
- `rules_ocx` demonstrates the two-mechanism split concretely: `ocx/private/BUILD.bazel:6` sets `default_visibility = ["//visibility:public"]` on the `bzl_library` target, while every one of the 7 `.bzl` files it wraps separately declares `visibility(["//ocx", "//ocx/tests"])` — the target is public, the source is load-gated. Zero `package_group` declarations exist anywhere in the repo.
- `creeptd-ng` is the fleet's only real granularity test case: 12 Cargo workspace members (13 `Cargo.toml` total including the virtual manifest) and 3 `package.json` files across what should be one pnpm workspace — `pnpm-workspace.yaml` declares `web` as the sole member, yet `web` itself is npm-managed (`package-lock.json`), and a third, unlisted npm project lives at `crates/creeptd-client/tests/e2e/`. This is what "coarse, hand-maintained package boundaries drift" looks like without a generator watching them.

## Findings

### 1. The package-per-directory rule

Bazel's own best-practices page states the rule directly, fetched verbatim 2026-09-05:

> "Every directory that contains buildable files should be a package. If a BUILD file refers to files in subdirectories (such as, `srcs = ["a/b/C.java"]`) it's a sign that a BUILD file should be added to that subdirectory. The longer this structure exists, the more likely circular dependencies will be inadvertently created, a target's scope will creep, and an increasing number of reverse dependencies will have to be updated."
> — [bazel.build/configure/best-practices](https://bazel.build/configure/best-practices)

The signal is mechanical and grep-able: a `srcs`/`hdrs`/`data` list entry that is a **bare relative path containing a `/`** (not a label — labels start with `:` or `//`) names a file living in a subdirectory of the current package. That is legal only because no BUILD file exists in that subdirectory yet; the day one is added there, every such reference breaks (the file becomes another package's source, unreachable without an explicit label and `exports_files()`/visibility grant).

The `bazel.build/concepts/build-files` page — the other page the brief named — does **not** contain this rule at all (confirmed by fetching it directly: no `srcs = ["a/b/`, no "sign a BUILD file is missing" language anywhere on that page). The rule lives on `configure/best-practices` only. A citation that points the package-per-directory rule at `concepts/build-files` is citing the wrong page.

### 2. The glob() package-boundary trap

`glob()` never matches into a subpackage, and the failure mode is silent, not an error:

> "`glob` does not match files in subpackages... the glob expression `**/*.cc` in package x does not include `x/y/z.cc` if `x/y` exists as a package."
> — [bazel.build/reference/be/functions](https://bazel.build/reference/be/functions), corroborated by [bazelbuild/bazel#4194](https://github.com/bazelbuild/bazel/issues/4194) and [#13950](https://github.com/bazelbuild/bazel/issues/13950)

This is the same underlying mechanic as Finding 1, from the other direction: adding a BUILD file to fix a package-per-directory violation can *itself* silently shrink an existing `glob()`'s match set in the parent package, with no build failure — the files just stop being included. A reviewer cannot see this from the glob call site alone; it depends on which BUILD files currently exist anywhere under the glob's root.

### 3. Fine-grained targets: the argument and its cost

The stated goal, exactly as worded on the best-practices page: "To use fine-grained dependencies to allow parallelism and incrementality." Two effects follow: Bazel "can be much smarter about running only a limited subset of tests that could be affected by any given change," and "the build system has the maximum flexibility in caching and scheduling steps of the build" ([Software Engineering at Google, ch. 18](https://abseil.io/resources/swe-book/html/ch18.html)).

The scale claim from the same chapter: "a typical production binary at Google will likely depend on tens of thousands of targets, and even a moderate-sized team can own several hundred targets within its codebase." The stated cost is symmetric and explicit, not hand-waved: "engineers need to expend more effort maintaining lists of dependencies," mitigated only by "investing in tooling to automatically manage BUILD files to avoid burdening developers. Many of these tools are now open source" — i.e. Gazelle and its analogues are the mitigation the chapter is describing, not an optional nicety.

Contrast: coarser modules mean "the build system will always need to build the entire project all at once" (no test-set narrowing, no incremental win) but need no BUILD-file bookkeeping. Neither side is free; the chapter's own framing is "which cost do you want," and the artifact-vs-task-based build-system distinction it draws (Bazel/Buck/Pants know each target's declared output type and so "can use this knowledge to make the build far more efficient" versus task systems where "there's no way in general to check whether they've already been done") is the reason the fine-grained side is worth paying for *once tooling exists* — not a reason to go fine-grained unconditionally.

### 4. Target visibility: syntax, defaults, the public anti-pattern

Fetched in full from [bazel.build/concepts/visibility](https://bazel.build/concepts/visibility). Exact label forms accepted by a `visibility` attribute:

| Form | Meaning |
|---|---|
| `"//visibility:public"` | Accessible to all packages |
| `"//visibility:private"` | Only the target's own package |
| `"//foo/bar:__pkg__"` | `//foo/bar` only, not subpackages |
| `"//foo/bar:__subpackages__"` | `//foo/bar` and all direct/indirect subpackages |
| `"//some_pkg:my_package_group"` | Everything in that `package_group` |

Default resolution, precisely: a rule target's visibility is its declared `visibility` attribute, or — if omitted — the package's `default_visibility` if set, or `["//visibility:private"]` otherwise; for a target declared **inside a symbolic macro**, the default is always `["//visibility:private"]` regardless of package `default_visibility`. Two explicit best practices from the same page:

- "Avoid setting `default_visibility` to public. It may be convenient for prototyping or in small codebases, but the risk of inadvertently creating public targets increases as the codebase grows."
- "When granting visibility to another team's project, prefer `__subpackages__` over `__pkg__` to avoid needless visibility churn as that project evolves and adds new subpackages."

Verification confirmed against buildtools' own catalogue: **no buildifier warning checks `default_visibility` at all.** `buildtools/WARNINGS.md` (fetched in full, 1,533 lines) has zero occurrences of `default_visibility`; the only visibility-adjacent categories are `bzl-visibility` (load visibility, §6 below) and `package-on-top` (ordering, not content). This confirms the map's M-G-03 reading exactly: "named anti-pattern with no mechanical check but a trivial grep." The grep is: `grep -rn 'default_visibility.*//visibility:public' -- '*/BUILD*'`; **non-empty output is the finding** (a package defaulting to public).

Source-file visibility follows the flag `--incompatible_no_implicit_file_export`, current default **`true`** (confirmed in the live [command-line reference](https://bazel.build/reference/command-line-reference)): "If set, (used) source files are package private unless exported explicitly." Prior/legacy behaviour (flag `false`) let any file referenced from a `srcs=`-style attribute inherit the package's `default_visibility`. The docs' own guidance: "Avoid relying on the legacy behavior. Always write an `exports_files` declaration whenever a source file target needs non-private visibility."

`config_setting` visibility is a second, separate asymmetry worth stating precisely because it reads backwards on a skim:

- `--incompatible_enforce_config_setting_visibility` — default **true** — turns on visibility checking for `config_setting` targets used as `select()` keys at all.
- `--incompatible_config_setting_private_default_visibility` — default **false** — governs what an *unspecified*-visibility `config_setting` resolves to: at its current default, such a target is still `//visibility:public`; only flipping it to `true` makes `config_setting` follow the same private-by-default rule as every other target.

So today, an undocumented `config_setting` with no explicit `visibility=` is public by default even under a package that sets `default_visibility` to something narrower — the opposite of what "visibility is now enforced" suggests on its own.

### 5. package_group as the reusable allowlist

Exact signature, from the Build Encyclopedia (fetched in full): `package_group(name, packages, includes)`.

```starlark
# Canonical composition example (bazel.build/reference/be/functions)
package_group(
    name = "fooapp",
    includes = [":controller", ":model", ":view"],
)
package_group(name = "model", packages = ["//fooapp/database"])
package_group(name = "view", packages = ["//fooapp/swingui", "//fooapp/webui"])
package_group(name = "controller", packages = ["//fooapp/algorithm"])
```

`packages` accepts `//foo/bar` (exact package), `//foo/bar/...` (package + subpackages), `//...` (all packages in the *current* repository only — see the reporoot-syntax note below), and the strings `"public"`/`"private"` (gated behind `--incompatible_package_group_has_public_syntax`, current default **true**). Any of the first two forms may be negated with a leading `-`.

**The composition trap**, stated exactly as documented and easy to get backwards: "the set of packages for each group is first computed independently and the results are then unioned together. This means that negated specifications in one group have no effect on the specifications in another group." Concretely: if group A excludes `//foo/tests/...` and group B (which does not) is `include`d into A, B's inclusion of `//foo/tests/...` is **not** filtered out by A's own negation — A's final set is A's-set ∪ B's-set, computed separately.

Two more version-dated corrections on the same attribute, both defaulting **true** today: `--incompatible_fix_package_group_reporoot_syntax` — prior to Bazel 6.0, `//...` inside `packages` meant "public" (all repositories); the fixed, current behaviour restricts it to the current repository only, and `"public"` must be spelled out for the old meaning. `--incompatible_package_group_includes_double_slash` — prior to Bazel 6.0, `bazel query --output=proto`/`--output=xml` dropped the leading `//` when serializing this attribute; fixed since.

`package_group` targets have no `visibility` attribute of their own — "They are always publicly visible" (same page).

### 6. Load visibility and the bzl-visibility lint

Load visibility is declared inside a `.bzl` file by calling `visibility(...)` at the top level, once, ideally right after the `load()` statements:

```starlark
# //mylib/internal_defs.bzl
visibility(["//mylib/...", "//tests/mylib/..."])   # available to subpackages and mylib's tests
def helper(...): ...

# //mylib/rules.bzl
load(":internal_defs.bzl", "helper")
visibility("public")           # explicit even though public is the default
myrule = rule(...)
```

"Load visibility is available as of **Bazel 6.0**." Unlike target visibility, the *default* is public — a `.bzl` file with no `visibility()` call is loadable from anywhere. Argument syntax matches `package_group.packages` but **does not accept negation**. `--check_bzl_visibility` (current default **true**) demotes violations to warnings when disabled; never disable it for submitted code.

Buildifier has a predating, narrower lint for the same intent — `bzl-visibility` (category name confirmed from `buildtools/WARNINGS.md`): it warns when a file loads from a directory literally named `internal` or `private` from outside that directory's own tree. The docs are explicit that this lint "predates the load visibility feature and is unnecessary in workspaces where `.bzl` files declare visibilities" — i.e. a repo that adopts `visibility()` calls everywhere can treat `bzl-visibility` findings as redundant, not as a second signal to also fix.

### 7. Transitive visibility: real, but not yet in a numbered release

The current `bazel.build/concepts/visibility` page documents a **third**, separate mechanism beyond target and load visibility: `transitive_visibility`, a parameter of `package()` that restricts who may depend on a target *even indirectly*, independent of the ordinary target-visibility graph:

```starlark
# //third_party/sensitive_dep/BUILD
package(transitive_visibility = [":sensitive_dep_users"])   # must list itself
package_group(
    name = "sensitive_dep_users",
    packages = ["//third_party/sensitive_dep/...", "//allowed"],
)
sh_library(name = "sensitive_dep")
```

A violating build fails with: `Transitive visibility error: //third_party/sensitive_dep:sensitive_dep is not transitively visible from //not_allowed:bad. ...` This is a genuinely new tool for the exact case `package_group`/target visibility cannot express — "shareable but must not leak transitively."

**Chase-the-surprise finding, not in the brief's source list**: this parameter is **absent from both the versioned 8.1.0 and 9.1.0 doc snapshots** (`bazel.build/versions/8.1.0/concepts/visibility`, `bazel.build/versions/9.1.0/concepts/visibility`, both fetched and grepped — zero hits for `transitive_visibility` in either). The live page carries a `HEAD` marker in its own navigation breadcrumb. Conflict-8's lesson in the topic map (a `bazel.build` prose page is not automatically current) cuts both ways here: this page is *ahead* of the last two numbered releases, not behind. **No shipped rule may claim `transitive_visibility` works on Bazel 8.7.0 or 9.2.0 without confirming it against that exact binary's own `bazel help` output or release notes first** — the doc alone is insufficient evidence for a feature this new.

### 8. Generator maturity by language: who owns the Gazelle plugin

Fetched directly from [Gazelle's own README](https://github.com/bazel-contrib/bazel-gazelle) (`bazel-contrib/bazel-gazelle`, primary source, the project's own supported-languages list):

| Language | Plugin | Maintainer | Maturity signal |
|---|---|---|---|
| Go, Protobuf | built into `bazel-gazelle` | bazel-contrib | first-party, native |
| Python | `rules_python`'s own `gazelle/` extension | `bazel-contrib/rules_python` | **first-party** — lives inside the ruleset itself, confirmed present at `rules_python/gazelle/` in the repo tree |
| JS/TS | `aspect-gazelle` (`language/js`) | Aspect | third-party org, actively maintained; alt: BenchSci's `rules_nodejs_gazelle` (`ts_project`, `js_library`, `jest_test`, bundler support) |
| Kotlin | `aspect-gazelle` (`language/kotlin`) | Aspect | **"Still under development"** per the README itself — not yet production-grade |
| Rust | [`Calsign/gazelle_rust`](https://github.com/Calsign/gazelle_rust) | independent third party | version **0.1.0** as of this read; requires `rules_rust >= 0.40.0` (fleet pins 0.74.0, satisfied); ships a Gazelle patch for unused-`crate_universe`-dependency reporting that must be opted into separately |
| C/C++ | [`EngFlow/gazelle_cc`](https://github.com/EngFlow/gazelle_cc) | EngFlow (vendor) | version **0.1.0** as of this read; requires `gazelle >= 0.42.0`, `rules_cc >= 0.1.1` |
| Java | `rules_jvm`'s `java/gazelle` extension | bazel-contrib | first-party-adjacent, generates `java_library`/`java_binary`/`java_test`/`java_test_suite` |
| Haskell | `tweag/gazelle_cabal`, `gazelle_haskell_modules` | Tweag | third party |
| R, Swift | `grailbio/rules_r`, `cgrindel/swift_gazelle_plugin` | independent | third party |

The maturity split the map names is confirmed exactly, with a sharper signal than "first vs. third party": **both third-party plugins named in the brief are still pre-1.0** (`0.1.0`), which in semver terms means their own maintainers make no stability promise across releases — a real cost for "go fine-grained because a generator exists" that a version-agnostic rule should surface, not just the party label.

### 9. Verifying "no diff": the gazelle rule's `mode` attribute

The map's wave-1 candidate check, `gazelle -mode=diff producing no diff`, is not documented anywhere in Gazelle's own top-level README as a bare CLI invocation — confirmed by grepping the full README text for `mode`/`diff`/`print` (zero hits outside dependency-resolution's unrelated `external`/`static`/`vendored` modes). The actual, confirmed mechanism lives in the Bazel-native rule wrapper, `@gazelle//:def.bzl`, fetched directly:

```starlark
# def.bzl (bazel-contrib/bazel-gazelle), exact attribute definition
"mode": attr.string(
    values = ["", "print", "fix", "diff"],
    default = "",
),
```

and, for the dedicated test-runner variant, the default is overridden:

```starlark
# test_runner-only override, same file
"mode": attr.string(
    values = ["diff"],
    default = "diff",
),
```

So the CI-native pattern is:

```starlark
load("@gazelle//:def.bzl", "gazelle", "gazelle_test")

gazelle(name = "gazelle")                       # bazel run //:gazelle  → command="update" (default)
gazelle_test(
    name = "gazelle_test",                       # bazel test //:gazelle_test
    workspace = "//:MODULE.bazel",                # mode="diff" is this rule's own default
)
```

`bazel test //:gazelle_test` **fails (non-zero exit, diff printed to test log) exactly when the generated BUILD content would differ from what is checked in** — this is the real, runnable equivalent of the map's candidate check, and the correct citation for it is `def.bzl`'s `mode` attribute, not a documented `-mode=diff` CLI flag. **Empty diff (test passes) reads as generation is in sync; any diff output is the finding.**

### 10. The coarse-side proxy: rule-count-to-source-file ratio

No official Bazel or Gazelle document states a numeric target-per-file ratio — this is the map's own candidate heuristic (M-G-02), and it stays a heuristic after this read, not a documented metric. The mechanical form:

```bash
bazel query 'kind(rule, //...)' | wc -l          # rule-target count
git ls-files -- '*.rs' | wc -l                    # source-file count, per language extension
```

A ratio close to 1 (one rule roughly per source file, or per small cluster of files) is consistent with fine-grained, generator-backed packaging (Python, JS/TS on this fleet). A ratio far below 1 — one rule covering tens of source files — is consistent with coarse, hand-maintained packaging, and is the expected, *acceptable* shape wherever no maintained generator exists (Rust today, C/C++ until `gazelle_cc` is adopted). **This heuristic rests only on the map's own reasoning and Google's SWE-book framing, not on a Bazel-published number — any rule built on it is CONSIDER, never MUST**, per this program's house standard for argued-not-measured evidence.

### 11. "1:1:1" is Pants vocabulary, not Bazel's

Confirmed directly on Pants' own (v1) documentation, fetched verbatim:

> "The idiom of having one target per directory, representing a single package, is sometimes referred to as the **1:1:1 rule**. It's by no means required, but has proven in practice to be a good rule of thumb."
> — [v1.pantsbuild.org/build_files.html](https://v1.pantsbuild.org/build_files.html)

Both `bazel.build/configure/best-practices` and `bazel.build/concepts/build-files` were fetched in full for this dive and neither contains the string "1:1:1" anywhere. Bazel's docs converge on the same *practice* (package-per-directory, Finding 1) without ever naming it that way. **A shipped rule must describe the practice on its own terms and must not attribute "1:1:1" to Bazel** — doing so is a specific, checkable misattribution (grep the shipped rule text for the literal string "1:1:1"; if present, it must be attributed to Pants by name in the same sentence, or removed).

## Decisions

**D1 — Granularity is conditional on generator maturity, not a fixed target-per-file ratio.**
Decision: go fine-grained (near one target per module/file) only where a maintained generator exists for that language; otherwise stay coarse (one target per logical directory, hand-maintained, package-per-directory as the floor).
Evidence: Bazel's own best-practices page and the SWE-book chapter both state fine-grained targets' cost is BUILD-file maintenance labour, "mitigated" only by tooling (Finding 3); Gazelle plugin ownership is measurably uneven — first-party for Python, Aspect-owned for JS/TS, third-party pre-1.0 for Rust and C/C++ (Finding 8); this fleet's own coarse-side counter-example (`creeptd-ng`'s drifted pnpm/npm declaration, Fleet evidence below) shows what unmonitored coarse boundaries do without either a generator or discipline.
Assumption named: "maintained" means the plugin ships from the ruleset's own repository or a named org actively cutting releases (not a years-stale fork); a rule instance must re-check this per adoption, since maturity moves (Kotlin's plugin, still "under development" today, may graduate).
This settles M-G-02 and M-G-05 together — they were never independent questions.

**D2 — The verification for the generator side is `gazelle_test` (mode defaults to `diff`), not a bare `-mode=diff` CLI flag.**
Evidence: Finding 9 — the flag is real (`def.bzl`'s `attr.string(values=["", "print", "fix", "diff"])`) but is not documented at the CLI-invocation level Gazelle's own README describes; the Bazel-native, CI-safe wrapper is the `gazelle_test` rule.
Assumption named: the adopting repo builds `gazelle`/`gazelle_test` from `@gazelle//:def.bzl` rather than shelling out to a bare `gazelle` binary in CI — true for every fetched example across the language plugins surveyed.
Settles the verification half of M-G-05.

**D3 — The coarse-side numeric proxy (rule-count-to-source-file ratio) ships as CONSIDER, never MUST.**
Evidence: no primary source states a threshold (Finding 10); the ratio is this program's own construction from the map's candidate.
Assumption named: a future dive with real fleet Bazel adoption (post-`bob`-pilot, per the frame's Q1 decision) can recalibrate this once real ratios exist to measure against; until then it is a discussion aid, not a gate.

**D4 — "1:1:1" never appears in the shipped rule as Bazel's own terminology.**
Evidence: Finding 11, confirmed on Pants' own docs and by the absence of the phrase on both Bazel pages read for this dive.
No assumption needed — this is a direct textual fact, not an inference.

**D5 — `default_visibility = public` at package level ships as a grep-verified MUST-avoid with no lint backstop.**
Evidence: Finding 4 — Bazel's own docs name it an anti-pattern; buildifier's full warning catalogue was read and contains no check for it.
Assumption named: the grep (`default_visibility.*//visibility:public`) is a text-match over BUILD files, not a semantic query — a value assembled via a Starlark variable or macro parameter (not a literal `//visibility:public` string) will not be caught, and the rule's verification section must say so.

## Normative guidance candidates

1. **Every directory that contains buildable source files owns a BUILD/BUILD.bazel file; a rule's `srcs`/`hdrs`/`data` must never list a bare path into a subdirectory.**
   Rationale: the moment a BUILD file is later added to that subdirectory, every such reference breaks and reverse dependencies must all be updated (Finding 1).
   Verify: `grep -rnE '"[A-Za-z0-9_./-]+/[A-Za-z0-9_.-]+\.[a-z]+"' -- '*/BUILD*'` filtered to entries without a leading `:`/`//` inside `srcs=`/`hdrs=`/`data=` lists — a named reading heuristic (label vs. bare path) more than a single grep. Non-empty = finding.
   Severity: SHOULD. Bazel majors: 7, 8, 9. Ruleset: n/a (core Starlark). Settles: M-G-01.

2. **Never let a `glob()` silently shrink because a sibling BUILD file appeared.** Re-run `bazel query` output on affected globbed targets after adding any new BUILD file under an existing glob's root.
   Rationale: `glob()` never matches into a subpackage; the failure is silent, not a build error (Finding 2).
   Verify: before/after `bazel query 'kind("source file", //path/to/globbed/pkg:*)'` diff around the new BUILD file's addition. Empty diff = pass (nothing was silently dropped); any removed entry = finding.
   Severity: SHOULD. Bazel majors: 7, 8, 9. Settles: M-G-01.

3. **Never set `default_visibility = ["//visibility:public"]` at package level outside a prototype or the package's own top-level public-API package.**
   Rationale: named anti-pattern in Bazel's own docs; risk of accidental public API surface grows with codebase size, and there is no lint backstop (Finding 4, Decision D5).
   Verify: `grep -rn 'default_visibility.*//visibility:public' -- '*/BUILD*' '*/BUILD.bazel'`. Non-empty = finding (each hit needs a stated reason it is intentional).
   Severity: MUST. Bazel majors: 7, 8, 9. Settles: M-G-03.

4. **Prefer `__subpackages__` over `__pkg__` when granting visibility across a team or project boundary.**
   Rationale: `__pkg__` needs a new visibility entry every time the granted project adds a subpackage — documented churn (Finding 4).
   Verify: named reading heuristic — a `visibility` list entry of the form `"//other_team/foo:__pkg__"` that grants access to *another team's* code (not the declaring package's own tree) is a candidate for `__subpackages__` instead. No mechanical grep; a reviewer judgment call.
   Severity: SHOULD. Bazel majors: 7, 8, 9. Settles: M-G-03.

5. **Use `package_group` once the same visibility list is repeated across two or more targets; never copy-paste a `visibility = [...]` list.**
   Rationale: Bazel's own best practice — readability and preventing skew between copies (Finding 5); this fleet currently has zero `package_group` declarations anywhere, so the pattern is unproven, not merely unused, at fleet scale.
   Verify: `grep -c 'visibility = \[' -- '*/BUILD*'` compared against `grep -c 'package_group(' -- '*/BUILD*'` — if the first count is much larger than the second while multiple `visibility` lists are textually identical (a diff/sort check), that is the finding. Empty/zero `package_group` count with 3+ duplicate visibility lists = finding.
   Severity: SHOULD. Bazel majors: 7, 8, 9. Settles: M-G-04.

6. **When composing `package_group`s via `includes`, never assume a negated spec in one group filters another group's packages.**
   Rationale: each group's package set is computed independently before the union — documented, easy to get backwards (Finding 5).
   Verify: named reading heuristic — any `package_group` with both a negated `packages` entry (`"-//foo/..."`) and a non-empty `includes` list needs a comment stating the negation only applies to its own `packages` list, or a test (`bazel query 'package_group(...)'`-style reasoning is not directly queryable; manual trace is the check). No grep exists for the underlying semantic error.
   Severity: CONSIDER. Bazel majors: 7, 8, 9. Settles: M-G-04.

7. **Every private `.bzl` file gates its own load visibility with `visibility([...])`, even when its BUILD-target visibility is public.** Do not conflate the two mechanisms.
   Rationale: target visibility governs `deps=`/`bzl_library` graph reachability; load visibility governs `load()` statements specifically — a public BUILD target does not stop `load()` of the underlying file without a separate `visibility()` call (Finding 6; demonstrated concretely by `rules_ocx`, Fleet evidence below).
   Verify: `grep -L '^visibility(' path/to/private/*.bzl` — empty output means every file in that directory is gated (pass); any listed filename is the finding.
   Severity: MUST for a package intended as an internal-only surface (a `private/` or `internal/` directory); SHOULD elsewhere. Bazel majors: 8, 9 (load visibility since Bazel 6.0). Settles: M-G-06 (pattern generalized from the fleet's own worked example).

8. **New `.bzl` files default to `visibility("private")` unless deliberately public.**
   Rationale: the default load visibility is public — a forgotten `visibility()` call means silent, unintended external reuse; Bazel's own docs recommend this explicitly (Finding 6).
   Verify: any new `.bzl` file (via `git diff --diff-filter=A -- '*.bzl'` on a PR) with no `visibility(` call anywhere in its first 10 lines is the finding.
   Severity: SHOULD. Bazel majors: 8, 9. Settles: M-G-06.

9. **Never rely on the legacy implicit-file-export behaviour; always write `exports_files()` for any source file consumed outside its own package.**
   Rationale: `--incompatible_no_implicit_file_export` defaults `true` today — a file referenced only via a rule's `srcs=` is package-private unless explicitly exported; code written against the old assumption silently loses visibility (Finding 4).
   Verify: `bazel build` failure with a visibility error naming a source-file label is the runtime signal; statically, `grep -L 'exports_files' -- '*/BUILD*'` on packages whose files are consumed cross-package by label is the proxy (needs cross-referencing consumer `deps=`/`srcs=` lists — no single grep suffices; named heuristic).
   Severity: MUST. Bazel majors: 8, 9 (flag has defaulted true since well before this era). Settles: general visibility hygiene, cross-referencing M-G-03.

10. **State every `config_setting`'s visibility explicitly if it is meant to be package-scoped; do not assume `default_visibility` covers it.**
    Rationale: `--incompatible_config_setting_private_default_visibility` still defaults **false** — an unspecified-visibility `config_setting` is `//visibility:public` today regardless of the package's own `default_visibility` (Finding 4).
    Verify: `grep -B2 'config_setting(' -- '*/BUILD*'` then check each declaration for an explicit `visibility=`; missing it while the package sets a narrow `default_visibility` is the finding (the `config_setting` is public anyway, silently).
    Severity: SHOULD. Bazel majors: 8, 9. Settles: extends M-G-03 to a documented exception case.

11. **Do not cite `transitive_visibility` as available on Bazel 8.7.0 or 9.2.0 without confirming it against that binary's own `bazel help package` or its release notes first.**
    Rationale: the parameter is on the live/HEAD docs but absent from the 8.1.0 and 9.1.0 versioned snapshots — evidence of a not-yet-numbered or very recent release (Finding 7).
    Verify: run the target Bazel version's `bazel help package` (or equivalent) and grep for `transitive_visibility`; absence means the guidance does not apply yet to that pin.
    Severity: CONSIDER (informational trap, not yet actionable for this fleet's 8.7.0 pin). Bazel majors: unresolved — confirm per-version. Settles: none directly (new finding, not one of the M-G IDs), flagged for the map's next pass.

12. **Go fine-grained (near one target per source file/module) only for languages with a maintained Gazelle-family generator; otherwise keep BUILD files coarse and hand-maintained at the directory level.**
    Rationale: fine-grained targets are only sustainable with generation tooling; maturity is uneven by language (Findings 3, 8; Decision D1).
    Verify: is there a `gazelle_test`(-shaped) CI target for this language, defaulting `mode="diff"`, passing today? If yes, fine-grained is supported — go fine-grained. If no such target exists and none of the language's Gazelle plugins ship from a maintained org, coarse is the correct default; do not fine-grain by hand.
    Severity: MUST (as a decision procedure — the specific per-language call is SHOULD). Bazel majors: 8, 9. Ruleset-specific: `rules_python` ≥ any 2.x (first-party plugin), `gazelle_rust` 0.1.0+ (pre-1.0, third-party — treat as CONSIDER-tier trust), `gazelle_cc` 0.1.0+ (same caveat). Settles: M-G-02, M-G-05.

13. **Treat any pre-1.0 (`0.x`) third-party Gazelle plugin's generated output as requiring a human diff-review on every version bump, not an auto-merge.**
    Rationale: `gazelle_rust` and `gazelle_cc` are both `0.1.0` — semver gives no stability guarantee pre-1.0, and neither is first-party to its target ruleset (Finding 8).
    Verify: `MODULE.bazel` diff on any `gazelle_rust`/`gazelle_cc` version bump must accompany a regenerated-BUILD-files diff in the same PR, reviewed as code, not squashed silently.
    Severity: SHOULD. Bazel majors: 8, 9. Ruleset: `rules_rust` (any, via `gazelle_rust` 0.1.0), C/C++ via `gazelle_cc` 0.1.0. Settles: M-G-05, M-G-06.

14. **When a repository declares one workspace-manager file (e.g. `pnpm-workspace.yaml`) as the source of truth for package membership, verify every claimed member actually uses that manager — not a sibling one.**
    Rationale: a declared member that is secretly managed by a different package manager (a second, undeclared lockfile) is exactly the coarse-boundary drift a generator would have caught, and this fleet has a live instance (Fleet evidence below).
    Verify: for each `packages:` entry in the workspace manifest, confirm the member directory's own lockfile matches the workspace's manager (e.g. no `package-lock.json` inside a pnpm-workspace member). Empty output (no stray lockfiles found) = pass; any hit = finding.
    Severity: SHOULD. Applies regardless of Bazel adoption — this is a pre-Bazel hygiene check that determines whether Bazel-friendly generation is even possible later. Settles: M-G-02 (coarse-side proxy, negative case).

15. **A shipped rule describing package-per-directory or fine-grained targets must never attribute the phrase "1:1:1" to Bazel.**
    Rationale: confirmed Pants-only vocabulary (Finding 11, Decision D4).
    Verify: `grep -n '1:1:1' <rule-file>` — if found, the same line or the immediately preceding sentence must name Pants, not Bazel, as the source; otherwise this is a misattribution finding. Absence of the string entirely also passes (nothing to check).
    Severity: MUST (documentation-correctness bar for the shipped artifact itself, not for a reviewed BUILD tree). Settles: M-G-02.

16. **A rule-count-to-source-file ratio may inform a coarse/fine-grained discussion but must never gate CI or a review as a hard threshold.**
    Rationale: no primary source publishes a numeric target — this is a constructed heuristic, and house standard requires CONSIDER severity for argued-only evidence (Finding 10, Decision D3).
    Verify: `bazel query 'kind(rule, //...)' | wc -l` against `git ls-files -- '*.<ext>' | wc -l` — report the ratio; do not fail a build on it.
    Severity: CONSIDER. Bazel majors: 7, 8, 9. Settles: M-G-02.

## Fleet evidence

- **The two-mechanism split, worked example.** `rules_ocx/ocx/private/BUILD.bazel:6` sets `package(default_visibility = ["//visibility:public"])` on the `bzl_library(name = "private", srcs = glob(["*.bzl"]))` target — that BUILD *target* is public. Independently, every one of the 7 `.bzl` files it globs together opens with `visibility(["//ocx", "//ocx/tests"])` (`ocx/private/project.bzl:31`, `download.bzl:15`, `platforms.bzl:10`, `versions.bzl:13`, `package.bzl:31`, `manifest.bzl:11`, `repo_utils.bzl:10`) — those files cannot be `load()`-ed from outside `//ocx`/`//ocx/tests` even though the wrapping target is nominally public. Verified live: `grep -L '^visibility(' ocx/private/*.bzl` in `/home/mherwig/dev/rules_ocx` returns empty — every file gated.
- **Two, and only two, package-level public-visibility sites in the whole repo.** `ocx/BUILD.bazel:6` and `ocx/private/BUILD.bazel:6`, both the public API surfaces (`//ocx:defs.bzl`, `//ocx:extensions.bzl`, and the private-module aggregation target). These are the repo's deliberate public façade, not accidental sprawl — consistent with the map's "exemplar, not cautionary tale" resolution (topic-map Conflict 9).
- **Zero `package_group` declarations anywhere.** `grep -rn package_group` across `/home/mherwig/dev/rules_ocx` (`.bzl`, `BUILD`, `BUILD.bazel`) returns nothing. At 2 public sites and a 5,851-line repo, this is proportionate (map priority P2) — but it means the pattern from Finding 5/candidate 5 is unproven at this fleet's current scale, not validated.
- **`creeptd-ng`'s drifted workspace declaration is the fleet's coarse-boundary counter-example.** `creeptd-ng/pnpm-workspace.yaml` declares `packages: - "web"` as its only member, yet `creeptd-ng/web/package-lock.json` exists (npm, not pnpm), and `creeptd-ng/crates/creeptd-client/tests/e2e/package.json` is a third, wholly unlisted npm project (`bazel-audit/fleet-bazel-readiness.md:173`, `:70-73`). 12 Rust workspace members, 13 `Cargo.toml` including the virtual manifest (`bazel-audit/fleet-bazel-readiness.md:254`, corrected from the frame's stale 65/15/6 count per topic-map Conflict 16). No generator watches any of this today; candidate 14 above is written directly against this instance.
- **No fleet repo builds with a language rule at all** (0 `cc_*`/`py_*`/`js_*`/`rust_*` targets anywhere) — every per-language granularity claim in this dive is grounded on the rulesets' and Gazelle's own upstream sources, never on fleet code, per the map's Shape-F framing.

## AI-agent angle

- **Hallucinating a buildifier lint for `default_visibility = public`.** An LLM asked "how do I catch a public default visibility" will often assert a lint name that does not exist. Mechanical check: the model must be able to name the exact buildifier category from `buildtools/WARNINGS.md`; if it cannot produce a real category name matching the catalogue, the claim is fabricated. (There is no such category — the correct answer is "no lint exists, use this grep.")
- **Citing "1:1:1" as Bazel's own recommended pattern.** Training-data blogs conflate Pants and Bazel vocabulary constantly. Mechanical check: `grep -n '1:1:1'` any generated rule text or explanation; if present without naming Pants, it is wrong (Finding 11, candidate 15).
- **Assuming `//foo/...` inside a `package_group.packages` list means "public."** Pre-Bazel-6 behaviour; current default (`--incompatible_fix_package_group_reporoot_syntax=true`) restricts it to the current repository. A model trained mostly on pre-2023 examples will get this backwards. Mechanical check: any generated `package_group` intended as a public allowlist must spell out `"public"` explicitly, not rely on `"//..."`.
- **Recommending `-mode=diff` as a raw CLI incantation instead of the `gazelle_test` rule.** An LLM will readily produce `gazelle -mode=diff` as a shell command without wiring it through Bazel — this works interactively but is not what a hermetic CI check should run. Mechanical check: does the generated BUILD snippet load `gazelle_test` from `@gazelle//:def.bzl` and wire it into `bazel test //...`? If the "verification" is a bare shell invocation outside Bazel, flag it.
- **Assuming any referenced source file is implicitly exported.** Under `--incompatible_no_implicit_file_export=true` (current default), a model generating BUILD files from pre-2020-era training examples will omit `exports_files()` and produce a visibility error the model cannot explain without knowing the flag's current default. Mechanical check: does every cross-package file reference in generated BUILD content have a matching `exports_files()` in its owning package?
- **Treating `gazelle_rust`/`gazelle_cc` as equivalent in trust to `rules_python`'s first-party plugin.** A model summarizing "Gazelle supports Rust and C++" without the version/ownership caveat erases a real maturity gap (both 0.1.0, third-party). Mechanical check: does the generated guidance name the plugin's version and maintainer, or does it treat "Gazelle supports language X" as a flat fact?
- **Citing `transitive_visibility` as stable on Bazel 8 or 9.** Because it appears on the current canonical docs page, a model reading only that page (not the versioned snapshots) will present it as available today on any Bazel 8/9 install. Mechanical check: was the versioned doc snapshot for the target Bazel release checked, or only the rolling/HEAD page? (Finding 7, candidate 11.)

## Contested / evolving

- **Whether `package_group` allowlists are actually load-bearing at anything smaller than Google scale.** The map (M-G-04) rates this P2/uncovered — no fleet evidence either way, and this dive's own reading confirms `rules_ocx` has zero instances at 2 public sites. The Build Encyclopedia's own worked example (`fooapp`/`controller`/`model`/`view`) is a multi-team composition pattern; whether a single-team, single-repo shop should adopt it before it has 3+ duplicate visibility lists is a judgment call this dive resolves only as "wait for the duplication to appear" (candidate 5), not as an upfront pattern.
- **`transitive_visibility`'s release status.** As of 2026-09-05 this is genuinely unresolved from the sources available to this dive — present on HEAD docs, absent from the two most recent versioned snapshots checked. Trending: new Bazel features increasingly land on the docs site ahead of a tagged release (the docs platform migrated to Mintlify recently, per its own site banner: "The new site is online!"), so treat rolling-docs-only features as a growing, not shrinking, category going forward.
- **How aggressively to adopt fine-grained targets ahead of generator maturity.** Google's own chapter frames "invest in tooling" as the unlock, implying fine-grained-first is fine if you're willing to build the tooling yourself. This dive's conditional rule (Decision D1) takes the more conservative reading — wait for a maintained generator — because this fleet has no in-house Gazelle-authoring capacity today and no repo at monorepo scale (topic-map Conflict 16) to justify building one. A team the size of Uber's Go org, or Google itself, may correctly choose the opposite trade-off.
- **Kotlin's Gazelle plugin is explicitly "still under development"** per its own README as of this read — a maturity split that may resolve (graduate) or regress (be abandoned) before this rule's next refresh. No fleet consumer exists to force a decision either way today.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/configure/best-practices](https://bazel.build/configure/best-practices) | Official Bazel docs, "Best Practices" page | Fetched 2026-09-05, rolling/HEAD docs | Primary source for the package-per-directory rule (exact wording) and the fine-grained-dependencies goal statement |
| [bazel.build/concepts/build-files](https://bazel.build/concepts/build-files) | Official Bazel docs, BUILD-file concepts | Fetched 2026-09-05 | Confirms the package-per-directory rule does NOT live on this page (a citation-placement check); BUILD-file syntax restrictions |
| [bazel.build/concepts/visibility](https://bazel.build/concepts/visibility) | Official Bazel docs, visibility page | Fetched 2026-09-05, rolling/HEAD | Primary, exhaustive source for all three visibility mechanisms, exact syntax, defaults, and the `transitive_visibility` surprise |
| [bazel.build/versions/8.1.0/concepts/visibility](https://bazel.build/versions/8.1.0/concepts/visibility) | Versioned snapshot of the same page | Bazel 8.1.0-tagged | Negative-evidence source: confirms `transitive_visibility` is absent from this release's docs |
| [bazel.build/versions/9.1.0/concepts/visibility](https://bazel.build/versions/9.1.0/concepts/visibility) | Versioned snapshot of the same page | Bazel 9.1.0-tagged | Same negative-evidence check for the Active-LTS-adjacent release |
| [bazel.build/reference/be/functions](https://bazel.build/reference/be/functions) | Build Encyclopedia, `package_group`/`exports_files`/`glob` reference | Fetched 2026-09-05 | Primary, exact `package_group` attribute spec, the negation-composition trap, and the `glob()` subpackage-boundary rule |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official CLI flag reference | Fetched 2026-09-05 | Primary source for every `--incompatible_*`/`--check_*` flag default cited in this dive |
| [github.com/bazel-contrib/bazel-gazelle](https://github.com/bazel-contrib/bazel-gazelle) (README.md, def.bzl) | Gazelle's own repository | README + `def.bzl` fetched 2026-09-05, HEAD | Primary source for the per-language plugin ownership list and the exact `mode` attribute (`"", "print", "fix", "diff"`) behind the "no diff" check |
| [github.com/bazel-contrib/rules_python](https://github.com/bazel-contrib/rules_python) `/gazelle/` | rules_python's own Gazelle extension directory | Repo tree checked 2026-09-05 | Confirms Python's plugin is genuinely first-party (lives inside the ruleset's own repo) |
| [github.com/Calsign/gazelle_rust](https://github.com/Calsign/gazelle_rust) (README.md) | Rust Gazelle plugin, third party | Fetched 2026-09-05 | Confirms third-party status, version `0.1.0`, `rules_rust >= 0.40.0` floor |
| [github.com/EngFlow/gazelle_cc](https://github.com/EngFlow/gazelle_cc) (README.md) | C/C++ Gazelle plugin, EngFlow | Fetched 2026-09-05 | Confirms vendor-maintained status, version `0.1.0`, `gazelle >= 0.42.0` / `rules_cc >= 0.1.1` floor |
| [github.com/bazelbuild/buildtools](https://github.com/bazelbuild/buildtools) `WARNINGS.md` | Buildifier's own warning catalogue | Fetched in full 2026-09-05 | Primary negative-evidence source: no lint checks `default_visibility`; exact text of `bzl-visibility` and `package-on-top` |
| [v1.pantsbuild.org/build_files.html](https://v1.pantsbuild.org/build_files.html) | Pants' own (v1) documentation | Fetched 2026-09-05 | Primary source attributing "1:1:1" to Pants in Pants' own words |
| [abseil.io/resources/swe-book/html/ch18.html](https://abseil.io/resources/swe-book/html/ch18.html) | "Software Engineering at Google," ch. 18 | Google-published book, fetched 2026-09-05 | Canonical argument for fine-grained targets, its stated cost, and the artifact-vs-task build-system distinction, with Google's own scale numbers |
| [uber.com/us/en/blog/go-monorepo-bazel](https://www.uber.com/us/en/blog/go-monorepo-bazel/) | Uber Engineering blog, Go monorepo case study | Company blog, fetched 2026-09-05 | Concrete "what generation buys" numbers (70,000+ files, ~10,000 monthly commits, ~900 engineers) and the ongoing costs generation did not solve (IDE support, target selection) |
| [bazel-topic-map/practitioner-and-conferences.md](../bazel-topic-map/practitioner-and-conferences.md) §13, §15-17 | Wave-1 scout, internal | 2026-09-05 | Sources the secondary "70% have trouble writing BUILD files" (Salesforce, BazelCon 2023, reported via an independent trip-report) and cross-checks the Uber numbers |
| `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-audit/starlark-code-shape.md` | Fleet audit, `rules_ocx` Starlark shape | Measured 2026-09-05 | Source for the exact visibility-site line numbers and the two-mechanism worked example (§2, §7, Patterns §1) |
| `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-audit/fleet-bazel-readiness.md` | Fleet audit, polyglot repo shapes | Measured 2026-09-05 | Source for the corrected `creeptd-ng` counts and the three-JS-toolchain drift finding |
