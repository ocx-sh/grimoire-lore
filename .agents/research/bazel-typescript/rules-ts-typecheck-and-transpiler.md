---
title: "rules_ts: the typecheck gate and the mandatory transpiler choice"
topic: rules-ts-typecheck-and-transpiler
group: bazel-typescript
family: BZL-JS
agent: sonnet-wave2-bazel-typescript
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
primary_sources_count: 15
settles: [M-K-01, M-K-02, M-K-03, M-K-10, M-K-11]
scope: |
  Covers `ts_project`'s typecheck-versus-build split (why `bazel build` goes
  green with a type error), the mandatory `transpiler` selection since
  rules_ts 2.0, the four documented `ts_project` failure signatures
  (TS6059, TS5033/EPERM, TS2786/TS7016, overlapping srcs), and
  `isolatedDeclarations` + `isolated_typecheck`. Does not cover pnpm,
  `node_modules` layout, phantom dependencies, or the `bazel-out`-as-cwd
  tax — that is `rules-js-architecture-and-dependency-resolution`
  (bazel-typescript group, dive 6.1). Current release examined: rules_ts
  v3.10.1 (2026-08-21); `main`-branch-only changes are named as such.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The headline fact: `bazel build` never runs the typechecker](#1-the-headline-fact-bazel-build-never-runs-the-typechecker)
   2. [The forcing flag, and why it is discouraged](#2-the-forcing-flag-and-why-it-is-discouraged)
   3. [The mandatory transpiler choice since rules_ts 2.0](#3-the-mandatory-transpiler-choice-since-rules_ts-20)
   4. [SWC's documented output differences](#4-swcs-documented-output-differences)
   5. [Four failure signatures](#5-four-failure-signatures)
   6. [isolatedDeclarations + isolated_typecheck](#6-isolateddeclarations--isolated_typecheck)
   7. [Version floor, current as of 2026-09-05](#7-version-floor-current-as-of-2026-09-05)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `bazel build //path:my_ts_project` can succeed with a live type error whenever `transpiler`, `declaration_transpiler`, `no_emit`, or `isolated_typecheck` is set on the target — the default output group is JavaScript only ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).
- The only gate is the auto-generated `[name]_typecheck_test` target, and it only runs under `bazel test` ([transpiler.md § Macro expansion](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)).
- A forcing flag exists — `--@aspect_rules_ts//ts:validation_typecheck` (`bool_flag`, default `False`) — and the ruleset calls it "discouraged and off by default" because it reintroduces the exact cost a transpiler exists to avoid ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md); default confirmed in [`ts/BUILD.bazel`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/BUILD.bazel)).
- `bazel build` alone is never an acceptable gate for a `ts_project` — CI must run `bazel test` against the `_typecheck_test` targets (see [Decisions](#decisions)).
- Since rules_ts 2.0.0 (released 2023-09-07), `ts_project(transpiler=...)` has **no default**; an unset value hard-fails at analysis time with a "Required Transpiler Selection" error unless `--@aspect_rules_ts//ts:default_to_tsc_transpiler` is set ([`ts/private/options.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/options.bzl); [v2.0.0 release notes](https://github.com/aspect-build/rules_ts/releases/tag/v2.0.0)).
- SWC (`transpiler = swc`) is the recommended choice for speed but has two documented output-compatibility gaps versus `tsc`: type-only-import elision ambiguity (worst with `emitDecoratorMetadata`) and ESM-to-CJS export mutability semantics ([rules_ts discussion #398](https://github.com/aspect-build/rules_ts/discussions/398)).
- `transpiler = "tsc"` is the simplest, slowest choice — no extra dependency, but no speed win either ([transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)).
- `TS6059` ("File ... is not under 'rootDir'") is diagnosed with `--explainFiles` (TS ≥4.2) to see why a file entered the program ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).
- `TS5033: EPERM` on a `bazel-out` path means two targets wrote the same output file, usually because the program resolved a `.ts` where it should have resolved the sibling `.d.ts` ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md), cross-referencing [microsoft/TypeScript#22208](https://github.com/microsoft/TypeScript/issues/22208)).
- `TS2786`/`TS7016` fire when a dependency exposes a type-only package (commonly `@types/*`) through its public API but declares it only as a `devDependency` — strict, non-hoisted `rules_js` deps surface this where npm's flat hoisting used to hide it ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).
- Two `ts_project` targets with overlapping `.ts` files in `srcs` produce a build error (conflicting `.js` outputs) when built together, and a build-order-dependent, silently-stale result when built separately — diagnose with `bazel aquery //path:my_ts_project` ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).
- TypeScript 5.5's `isolatedDeclarations` option lets `.d.ts` emission become a pure single-file AST transform (no type checker), which `ts_project(isolated_typecheck = True)` turns into a separate, fully parallel Bazel action stage ahead of type-checking ([Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)).
- Canva's measured result migrating ~90% of a ~40,000-package, ~105,000-file TypeScript monorepo: type-check actions per PR down 73–81%, P95 type-check wall time down 53–60% (over 10 minutes), P50 under one minute, local type-check usage up 70% ([BazelCon 2025 talk](https://www.youtube.com/watch?v=26CoMExb6FE); reported on [Aspect's isolated-declarations page](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)).
- `isolated_typecheck` and `no_emit` are independent knobs; `isolated_typecheck` works with `tsc` as transpiler too, it does not require SWC.
- `ts_project`'s `validate = True` default checks that `tsconfig.json`'s `outDir`/`declarationDir` and `sourceMap` agree with the rule's own attributes — Bazel ignores `outDir`/`declarationDir` values and always writes under `bazel-out/.../bin` ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md); attribute default confirmed in [`ts/defs.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/defs.bzl)).
- The released rules_ts (v3.10.1, 2026-08-21) declares **no** `bazel_compatibility` floor in `MODULE.bazel`; the unreleased `main` branch adds `bazel_compatibility = [">=7.7.0"]` and bumps the `aspect_rules_js` lower bound from 2.0.0 to 3.4.0 — a floor bump not yet in a tagged release as of 2026-09-05.
- Persistent-worker mode for `tsc` was removed as a default in 2.0.0; `supports_workers` changed from a boolean to a tri-state `[-1, 0, 1]` attribute — an agent porting 1.x-era snippets will hit an unrelated type error if it still passes `True`/`False`.

## Findings

### 1. The headline fact: `bazel build` never runs the typechecker

`ts_project` is a macro, not a single rule. When `transpiler`, `declaration_transpiler`, `no_emit`, or `isolated_typecheck` is set, the macro expands to at least four targets ([transpiler.md § Macro expansion](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)):

| Target | What it produces | Runs the typechecker? |
|---|---|---|
| `[name]` | default target for `deps`; JS only | No — "will successfully build *even if there are typecheck failures*" (quoted verbatim from the doc) |
| `[name]_types` | `.d.ts` as default outputs (absent if `no_emit`) | Only if something demands it |
| `[name]_typecheck` | default outputs assert type-checking ran | Yes, whenever built |
| `[name]_typecheck_test` | a [`build_test`](https://github.com/bazelbuild/bazel-skylib/blob/main/rules/build_test.bzl) depending on `[name]_typecheck` | Yes, under `bazel test` (needs [`--build_tests_only`](https://docs.bazel.build/versions/main/user-manual.html#flag--build_tests_only)) |

This is source-confirmed at the rule-implementation level, not only in prose: `ts_project.bzl` computes `emit_js = not ctx.attr.no_emit and ctx.attr.transpile != 0` and `emit_dts = not ctx.attr.no_emit and not ctx.attr.declaration_transpile` for the *default* output group, and only builds the separate `typecheck` output directory when `ctx.attr.isolated_typecheck or not (use_tsc_for_js or use_tsc_for_dts)` ([`ts/private/ts_project.bzl:116-117,225`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/ts_project.bzl)). Put plainly: whenever a custom transpiler produces the JS (the entire point of the fast path), the JS is what `bazel build` needs and gets — the compiler that would report a type error never runs unless something separately demands the `typecheck` output group.

The ruleset's own framing: "This is intentional, and is the whole point of using a fast transpiler without type-checking: `tsc` and type-checking stay off the critical path of a build" ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).

Type errors surface only when something demands the `typecheck` output group: a dependent target that needs `.d.ts`, `bazel build --output_groups=typecheck //path:my_ts_project`, or `[name]_typecheck_test` under `bazel test` ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).

### 2. The forcing flag, and why it is discouraged

```
# Not recommended: report type errors from `bazel build`, not only from `bazel test`.
common --@aspect_rules_ts//ts:validation_typecheck
```

`validation_typecheck` is a `bool_flag` with `build_setting_default = False` ([`ts/BUILD.bazel`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/BUILD.bazel)). Setting it turns type-checking into a [Bazel validation action](https://bazel.build/extending/rules) on every `ts_project`. Two independent facts matter and are easy to conflate:

- Validation actions do **not** block a target's own default-output actions — Bazel deliberately keeps a validation output out of any other action's inputs so it can run in parallel rather than gating the critical path ([bazel.build/extending/rules § Validation Actions](https://bazel.build/extending/rules)).
- But the action still **runs on every `bazel build`**, unconditionally, over the whole dependency graph that changed — so a JavaScript-only fast development loop stops being fast, and the wall-clock floor becomes the slowest type-check in the graph rather than the transpiler. `--run_validations` defaults to `true`; a single invocation can skip validations with `--norun_validations` ([bazel.build/extending/rules](https://bazel.build/extending/rules); [troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)).

The ruleset's own words: it "reintroduc[es] exactly the cost that a custom `transpiler` and `isolated_typecheck` exist to avoid" ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)). The documented recommendation is `bazel test`, where `_typecheck_test` targets run in parallel with the rest of the test suite and are cached like any other test.

### 3. The mandatory transpiler choice since rules_ts 2.0

`ts_project`'s macro signature (`ts/defs.bzl:32-57`) defaults `transpiler = None`. The underlying rule fails fast:

```python
# ts/private/ts_project.bzl:211-212
if is_root_module and len(outputs) > 0 and ctx.attr.transpile == -1 and not ctx.attr.emit_declaration_only and not options.default_to_tsc_transpiler:
    fail(transpiler_selection_required)
```

The exact failure text ([`ts/private/options.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/options.bzl)):

```
######## Required Transpiler Selection ########

You must select a transpiler for ts_project rules, which produces the .js outputs.

Please read https://docs.aspect.build/rules/aspect_rules_ts/docs/transpiler

##########################################################
```

This is a v2.0.0 breaking change, dated 2023-09-07: "We require that you select a value for the `transpiler` attribute. Again, there is no good default since the choices are to be fast or compatible" ([v2.0.0 release notes](https://github.com/aspect-build/rules_ts/releases/tag/v2.0.0)). Any 1.x-era snippet that omits `transpiler=` hard-errors on 2.0+ unless the escape hatch below is set.

**Options, correct vs. incorrect:**

```python
# WRONG on rules_ts >= 2.0 — no default, analysis-time fail
ts_project(
    name = "lib",
    srcs = glob(["*.ts"]),
)
```

```python
# RIGHT — SWC (recommended for speed)
load("@aspect_rules_swc//swc:defs.bzl", "swc")

ts_project(
    name = "lib",
    srcs = glob(["*.ts"]),
    transpiler = swc,
)
```

```python
# RIGHT — tsc (simplest, slowest, no extra dependency)
ts_project(
    name = "lib",
    srcs = glob(["*.ts"]),
    transpiler = "tsc",
)
```

```
# RIGHT — repo-wide escape hatch restoring 1.x default behaviour
# (.bazelrc)
common --@aspect_rules_ts//ts:default_to_tsc_transpiler
```

(all confirmed against [transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md) and `ts/BUILD.bazel`'s `default_to_tsc_transpiler` `bool_flag`, default `False`.)

### 4. SWC's documented output differences

`transpiler.md` names the ruleset's own tracking issue, [discussion #398](https://github.com/aspect-build/rules_ts/discussions/398), for known SWC-vs-`tsc` gaps. Reading the discussion directly (not just its title) surfaces two concrete, still-open differences as of 2026-09-05:

1. **Type-only import elision ambiguity.** SWC cannot always tell, from local information alone, whether an imported symbol is a type (to erase) or a value (to keep) — worst with `emitDecoratorMetadata` (which can "promote" a type-position symbol to a value symbol) and with pure re-export files (`export {A, B} from "./index"`). The stated workaround is explicit type-only import/export syntax (`import type`, `export type`).
2. **ESM-to-CJS export mutability.** SWC preserves ESM's read-only export semantics when down-leveling to CommonJS; `tsc` produces the looser, historically-mutable CJS `exports` object shape. A source-level `export const FOO = "bar"` compiles to a `defineProperty`-based getter under SWC rather than a plain assignment — code that mutates a named export at runtime (rare, but real in some interop shims) behaves differently.

Both differences are argued/reported in a GitHub Discussion, not specified anywhere — treat SWC-vs-tsc equivalence as CONSIDER-level, not MUST-level, evidence (see [Normative guidance candidates](#normative-guidance-candidates) #3).

### 5. Four failure signatures

All four are documented verbatim in [troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md); exact error text reproduced below.

**TS6059 — file not under `rootDir`.**

```
error TS6059: File '.../ts/test/index.test.ts' is not under 'rootDir' '.../ts/src'. 'rootDir' is expected to contain all source files.
Target //ts/src:src failed to build
```

Cause: the TS "program" includes a file the author didn't expect, usually from a too-wide `include` glob in `tsconfig.json` or a `srcs` glob in the `ts_project` target. Diagnosis: upgrade to TypeScript ≥4.2 and pass `--explainFiles` — from TS 4.2 the error itself gains a "The file is in the program because: Matched by include pattern '**/*' in 'tsconfig.json'" trailer, and `--explainFiles` gives that provenance for every file.

**TS5033: EPERM — two targets wrote the same output.**

```
error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/setup_script.js': EPERM: operation not permitted, open '...'.
```

Cause: two Bazel targets tried to write the same output path. Diagnosis: `--listFiles` to see what's in the program; check whether the program pulled in a `.ts` file where it should have resolved the corresponding `.d.ts` from a dependency — the doc cross-references [microsoft/TypeScript#22208](https://github.com/microsoft/TypeScript/issues/22208) as the underlying TS-side resolution bug class.

**TS2786 / TS7016 — undeclared type-only dependency.**

```
src/index.tsx(40,10): error TS2786: 'X' cannot be used as a JSX component. ...
```
```
src/index.ts(2,25): error TS7016: Could not find a declaration file for module 'express'. ... implicitly has an 'any' type.
```

Cause: a dependency exposes a type (e.g. via a publicly-exported JSX prop type) that comes from a package it declares only as a `devDependency` (frequently `@types/*`). Outside Bazel, npm's hoisted flat `node_modules` can accidentally make the type resolve anyway; rules_js's strict, non-hoisted dependency model does not, so the same code now fails to type-check under Bazel where it "worked" before. Two named remedies: TypeScript's `skipLibCheck` (avoids checking inside dependencies where the error originates — a blunt instrument, see rule #14 below) or pnpm's [`packageExtensions`](https://pnpm.io/package_json#pnpmpackageextensions) to correct the offending package's own declared dependencies.

**Overlapping `srcs`.**

> "Bazel expects that each output is produced by a single rule. Thus if you have two `ts_project` rules with overlapping sources (the same `.ts` file appears in more than one) then you get an error about conflicting `.js` output files if you try to build both together. Worse, if you build them separately then the output directory will contain whichever one you happened to build most recently. This is highly discouraged." ([troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md))

This is the corpus's clearest silent-corruption trap in the family: built-together fails loudly; built-separately (e.g. two different CI shards, or a developer building one target at a time) succeeds with whichever target ran last winning the output path — no error at all. Diagnosis: `bazel aquery //path/to:my_ts_project` to see exactly what `tsc` received and which action produced which output path.

### 6. isolatedDeclarations + isolated_typecheck

TypeScript 5.5 added `isolatedDeclarations`: with it on, every exported symbol needs an explicit type annotation (no inferring a return type from a dependency's internals), which makes `.d.ts` generation a **single-file AST transform** requiring no type checker at all ([Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)). The option was proposed by Martin Probst (Google) in [TypeScript#47947](https://github.com/microsoft/TypeScript/issues/47947).

```typescript
// Rejected under isolatedDeclarations — return type inferred from a dependency
export function countParts(x: string) {
  return new Splitter(x).splitWords().size();
}

// Accepted — self-contained signature
export function countParts(x: string): number {
  return new Splitter(x).splitWords().size();
}
```

**Why this matters for the Bazel action graph.** Without it, generating `A`'s `.d.ts` requires `B`'s `.d.ts`, which requires `C`'s — a full type-check chain, sequential, because a normal `.d.ts` emit needs the type checker to have resolved cross-file types. With isolated declarations, a fast, dependency-free "declare" action emits each package's `.d.ts` in parallel; the type-check action then consumes those pre-generated `.d.ts` files and itself produces no build outputs, so it can never block anything downstream. Benchmark on a ~20-file package: `tsc` traditional 860ms → `tsc` with `isolatedDeclarations` 340ms → [oxc](https://oxc.rs/)'s isolated-declarations transform ~5ms (~168× faster than the traditional path) ([Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)).

```python
# Enable per target once the codebase passes tsc --noEmit with
# "isolatedDeclarations": true in tsconfig.json
ts_project(
    name = "my_lib",
    srcs = glob(["*.ts"]),
    isolated_typecheck = True,
)
```

`isolated_typecheck` defaults to `False` ([`ts/defs.bzl:42`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/defs.bzl)) and is independent of the `transpiler` choice — it works with `tsc` as transpiler too, and is not an SWC-only feature. `rules_ts` reads `isolatedDeclarations` from `tsconfig.json` automatically once the flag is set on the target ([Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)).

**Measured result (Canva, BazelCon 2025).** Canva's monorepo: ~105,000 TypeScript files across ~40,000 Bazel packages, one `BUILD` + one `tsconfig.json` per folder. After migrating ~90% of packages ([Brad Zacher, "Improving Bazel TypeScript Type-Checks With IsolatedDeclarations," BazelCon 2025, Nov 11 2025](https://www.youtube.com/watch?v=26CoMExb6FE); reported on [Aspect's page](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)):

| Metric | Result |
|---|---|
| Type-check actions per PR | −73% to −81% |
| Type-check wall time, P95 | −53% to −60% (over 10 minutes faster) |
| Type-check wall time, P50 | under 1 minute |
| Local type-check usage | +70% |

Canva used [oxc](https://oxc.rs/) for the declaration-emit action (not `tsc`'s own `isolatedDeclarations` emit) plus custom build-file generation to emit *both* the implementation dependency graph and a separate, smaller module-signature dependency graph — the latter lets type-check actions collect only the `.d.ts`-relevant transitive inputs, pruning actions that were scheduled but provably unnecessary.

Migration is incremental: `isolatedDeclarations` can be turned on per `tsconfig.json` and `isolated_typecheck` per target, starting from the highest-fan-out, slowest-to-typecheck packages (`bazel query 'rdeps(..., //my/slow:lib)'` to find candidates).

### 7. Version floor, current as of 2026-09-05

The latest released rules_ts is **v3.10.1** (2026-08-21) ([GitHub releases](https://github.com/aspect-build/rules_ts/releases)). Its `MODULE.bazel` declares no `bazel_compatibility` constraint and a lower bound of `aspect_rules_js` **2.0.0** ([raw MODULE.bazel at tag v3.10.1](https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/MODULE.bazel)).

The unreleased `main` branch (fetched 2026-09-05) has already moved past that: `bazel_compatibility = [">=7.7.0"]` and `aspect_rules_js` lower bound bumped to **3.4.0** ([raw MODULE.bazel at `main`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/MODULE.bazel)). Neither change is in a tagged release yet — name the branch, not just "current," when citing this floor, and re-check before the next rules_ts bump lands. Either way, `rules_ocx`'s pinned Bazel 8.7.0 clears a 7.7.0 floor with room to spare.

## Decisions

**Is `bazel build` alone ever an acceptable gate for a `ts_project`? No.**

Evidence: the macro's own documentation states the default target "will successfully build *even if there are typecheck failures*" and calls this "considered a feature" for keeping a fast JS-only dev loop ([transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)); confirmed at the implementation level in `ts_project.bzl` (§1 above). This is not a corner case — it is the default the moment any of `transpiler`, `declaration_transpiler`, `no_emit`, or `isolated_typecheck` is set, i.e. on every 2.0+ target, since `transpiler` is now mandatory. The only way `bazel build` alone would catch a type error is if the repo runs the discouraged `validation_typecheck` flag on every build — which the ruleset's own docs argue against for cost reasons (§2).

Rule adopted: **a `ts_project` is gated by `bazel test` against its `_typecheck_test` target, never by `bazel build`'s exit code.** Verification is in [Normative guidance candidates](#normative-guidance-candidates) #1. Assumption named: this assumes CI actually invokes `bazel test` over a target set that includes every `_typecheck_test` — a `bazel build //...`-only CI job (common in early Bazel adoptions optimizing for "does it compile") is a silent gap even after this rule ships, unless the CI-and-target-selection guidance (wave 3) also checks that `bazel test //...` — not `bazel build //...` — is the CI verb of record for a repo containing `ts_project` targets.

**Transpiler recommendation, with its risk stated.**

Recommend `transpiler = swc` (via `@aspect_rules_swc`) as the default for new `ts_project` targets, for the documented speed win (§3, and the wider "avoid tsc" framing across `performance.md`). Risk named explicitly: SWC has two open, documented compatibility gaps versus `tsc` — type-only import elision (worst with `emitDecoratorMetadata`, i.e. decorator-heavy Angular/NestJS-style code) and ESM-to-CJS export mutability (§4). Recommend `transpiler = "tsc"` instead for any package that sets `emitDecoratorMetadata` in `tsconfig.json`, or that has runtime code mutating a named export across a CJS boundary. Assumption named: this recommendation rests on a GitHub Discussion (argued evidence, not a spec or a measured benchmark of *correctness* — only of speed), so it is shipped as SHOULD/CONSIDER, never MUST (see rule #3).

## Normative guidance candidates

1. **A `ts_project` MUST be gated by `bazel test` on its `_typecheck_test` target, never by `bazel build`'s exit code alone.**
   Rationale: the default output group is JavaScript-only once a transpiler is set (mandatory since 2.0), so `bazel build` reports success with a live type error.
   Verify: `bazel query 'kind(ts_project, //...)'` to enumerate targets, then for each label `//pkg:name` confirm `//pkg:name_typecheck_test` appears in `bazel query 'tests(//...)'` (or in the CI target list actually passed to `bazel test`). Empty output from `bazel query 'kind(ts_project, //...)' except tests(//...)`-style set difference = pass (every `ts_project` has its test target reachable); any label surviving the diff = a target that can go green on `bazel build` with a type error.
   Severity: **MUST**. Bazel 7, 8, 9. rules_ts ≥2.0 (any version where `transpiler` is mandatory). Settles M-K-01.

2. **CI MUST invoke `bazel test`, not only `bazel build`, over any package tree containing `ts_project` targets.**
   Rationale: rule #1's target-level gate is inert if the CI verb never runs it.
   Verify: grep CI workflow files for the `bazel` invocation verb per job (`grep -rn "bazel build\|bazel test" .github/workflows/*.yml` or the repo's CI config); a job that only ever runs `bazel build //...` and never `bazel test //...` (or an explicit `_typecheck_test` target list) is the finding. Empty grep for any `bazel test` invocation across all CI files = fail (whole repo ungated); presence with a narrower target than `//...` needs the diff from rule #1 applied to that narrower set.
   Severity: **MUST**. Bazel 7, 8, 9. rules_ts ≥2.0. Settles M-K-01.

3. **Repo-wide, choose one default `transpiler` for new `ts_project` targets and name the risk in the same commit; do not leave it unset per target "for now."**
   Rationale: rules_ts has shipped no default since 2.0 specifically because there is no universally-correct choice — SWC trades correctness edge cases for speed, `tsc` trades speed for zero-surprise output.
   Verify: grep `ts_project(` call sites for a `transpiler =` argument or for delegation to a repo-local wrapper macro that sets one; `grep -rn "ts_project(" --include=BUILD.bazel . | xargs -I{} …` cross-checked against `grep -L "transpiler" <each BUILD file with ts_project>`. Empty output (no `ts_project(` call lacking a resolvable `transpiler=`) = pass.
   Severity: **SHOULD** (the tool already hard-fails at analysis time for a truly unset value when `default_to_tsc_transpiler` is off, so the risk this rule catches is narrower: a repo that flips `default_to_tsc_transpiler` on specifically to avoid ever deciding, which the docs themselves offer as a legitimate "not ready to choose" escape hatch — CONSIDER whether that flag is still set a year later). Bazel 7, 8, 9. rules_ts ≥2.0. Settles M-K-02.

4. **Do not recommend SWC unconditionally; SHOULD default to it, but CONSIDER `tsc` for any target whose `tsconfig.json` sets `emitDecoratorMetadata: true` or whose runtime code mutates a named CJS export.**
   Rationale: both are documented, still-open SWC/tsc output differences (§4) — an agent defaulting every target to SWC because "the docs recommend it" will silently miscompile decorator-metadata-dependent code (Angular/NestJS-style DI) with no build-time error, only a runtime one.
   Verify: `grep -rn "emitDecoratorMetadata" **/tsconfig*.json` and `grep -rln "export const\|export let" **/*.ts | xargs grep -l "= require("` as a rough re-export/CJS-interop signal — named reading heuristic, not exhaustive: manually check rules_ts discussion #398 against the target's actual usage rather than trusting the grep alone. Empty output on the first grep = SWC default is lower-risk for that target; a hit = escalate to a human/tsc decision, do not silently keep SWC.
   Severity: **CONSIDER** (evidence is an argued GitHub Discussion, not a spec or benchmark of correctness). Bazel 7, 8, 9. rules_ts ≥2.0. Settles M-K-02.

5. **`--@aspect_rules_ts//ts:validation_typecheck` MUST NOT be set in a checked-in `.bazelrc` without a comment naming the tradeoff it accepts.**
   Rationale: the ruleset's own docs call this flag discouraged; it makes every `bazel build` pay the full type-check cost across the changed dependency graph, eliminating the fast-JS-only loop that a custom transpiler and `isolated_typecheck` exist to provide.
   Verify: `grep -rn "validation_typecheck" *.bazelrc* .bazelrc.*` (repo root and any per-environment rc files). Empty output = pass (flag unset, fast path preserved); a hit with no adjacent comment explaining the tradeoff = finding. A hit with a comment explaining a deliberate "we want build-time truth more than speed" choice is an accepted exception, not a violation.
   Severity: **MUST** (the "no silent flip" requirement) with the flag's *presence* itself being **CONSIDER**-level acceptable when justified. Bazel 7, 8, 9. rules_ts ≥2.0. Settles M-K-03.

6. **Never edit `outDir` or `declarationDir` in a `tsconfig.json` that feeds a `ts_project` expecting them to change where output lands.**
   Rationale: rules_ts ignores both; Bazel requires all outputs beneath `bazel-out/[target]/bin/path/to/package`, so these settings are dead configuration that will confuse a reader (and an agent) about where files actually go. `ts_project(validate = True)` (the default) checks a subset of tsconfig/attribute alignment but does not stop a human from writing a plausible-looking but inert `outDir`.
   Verify: `grep -n '"outDir"\|"declarationDir"' tsconfig.json` inside any package with a `ts_project` target — a named reading heuristic: cross-check the value against the actual `bazel-bin` layout; empty grep is unremarkable (nothing to check), a hit is not automatically wrong but must be read as decoration, not configuration.
   Severity: **CONSIDER** (this is a "don't be confused" hygiene note, not a build-breaking defect — Bazel silently overrides it rather than failing). Bazel 7, 8, 9. rules_ts ≥2.0.

7. **Two `ts_project` targets in the same package tree MUST NOT list the same `.ts` path in `srcs`.**
   Rationale: Bazel requires one producer per output path. Built together, this errors on conflicting `.js` outputs; built separately (e.g. two CI shards, or incremental local builds), it silently produces whichever target's output was written most recently — the worse failure mode because there is no error at all.
   Verify: for each package containing more than one `ts_project`, diff their `srcs` lists — `buildozer 'print srcs' //pkg:%ts_project'` per target, or `bazel query 'kind("source file", deps(//pkg:target_a)) intersect kind("source file", deps(//pkg:target_b))'` for a specific pair, filtered to files ending `.ts`/`.tsx`. Empty intersection = pass.
   Severity: **MUST**. Bazel 7, 8, 9. Any rules_ts version. Settles M-K-10.

8. **When a `ts_project` build fails with a `tsc` error whose cause isn't obvious from the message alone, run `bazel aquery //path:target` before editing `tsconfig.json`.**
   Rationale: Bazel remaps `outDir`, injects its own `rootDir`-equivalent constraints under `bazel-out`, and may include or exclude files the author didn't expect from `srcs`/`deps` — editing tsconfig options that Bazel overrides wastes a cycle; aquery shows the actual argv and input set `tsc` received.
   Verify: `bazel aquery 'mnemonic("TsProject", //path:target)'` returns a non-empty `Inputs:` / `Command Line:` block; check the failing file's presence (or absence) in `Inputs:` before assuming a tsconfig fix is needed. Empty aquery output for a target that supposedly built means the wrong label was queried or the action was cached from a stale invocation — re-run with `--noshow_progress --output=text` and confirm the label.
   Severity: **SHOULD** (diagnostic heuristic, not a build-time gate). Bazel 7, 8, 9. rules_ts, any version with `ts_project`.

9. **`TS6059` diagnosis: use `--explainFiles` (TypeScript ≥4.2) before touching `srcs` or `include`.**
   Rationale: the error means a file entered the TypeScript "program" that the author did not expect under the configured `rootDir`; guessing at glob edits without seeing *why* the file was included wastes cycles and risks silently dropping a file that should have been there.
   Verify: pass `--explainFiles` (via `ts_project(args = [...])` or `--@aspect_rules_ts//ts:verbose`) and confirm the trailer "The file is in the program because: ..." appears in the failing action's output. Named reading heuristic — no query substitutes for reading the trailer.
   Severity: **CONSIDER**. Bazel 7, 8, 9. TypeScript ≥4.2 (rules_ts, any version).

10. **`TS5033: EPERM` on a `bazel-out` path is an overlapping-output defect, not a filesystem permissions bug — do not chmod, retry, or add `--sandbox_writable_path`.**
    Rationale: the error text ("operation not permitted") reads like an OS permissions problem to an agent unfamiliar with Bazel's sandbox, but the documented root cause is two targets writing the same output path, most often because the compiled program resolved a `.ts` file where it should have resolved the paired `.d.ts` from a dependency.
    Verify: `--listFiles` to dump the TS program's file list, then `--explainFiles` on the offending `.ts`/`.d.ts` pair to see which one the resolver picked and why (cf. [microsoft/TypeScript#22208](https://github.com/microsoft/TypeScript/issues/22208)). Empty `--listFiles` output for the target under investigation means the wrong target was queried.
    Severity: **CONSIDER** (AI-agent misdiagnosis guard; the actual fix belongs to rule #7's family). Bazel 7, 8, 9.

11. **`TS2786`/`TS7016` MUST NOT be silenced by adding `skipLibCheck` repo-wide as the default response; check whether the missing type belongs in the offending package's `dependencies` (or needs a pnpm `packageExtensions` fix) first.**
    Rationale: the error usually means a real, previously-hidden problem (a package exposing a type from an npm `devDependency` in its public API), which npm's flat hoisting concealed and rules_js's strict, non-hoisted model correctly surfaces; blanket `skipLibCheck` disables type-checking inside *all* dependencies, not just the offending one, trading real coverage for silence.
    Verify: for the specific package named in the error, check whether the missing declaration package (commonly `@types/*`) appears in its `dependencies` (not `devDependencies`) in its own `package.json`; if the fix is upstream, prefer pnpm's [`packageExtensions`](https://pnpm.io/package_json#pnpmpackageextensions) scoped to that one package over a global `skipLibCheck`. Named reading heuristic — no single grep substitutes for reading the failing package's `package.json`.
    Severity: **SHOULD**. Bazel 7, 8, 9. rules_ts, any version; `rules_js` strict-dependency model. Settles part of M-K-03's neighboring failure-mode territory (not a separate M-ID).

12. **`isolated_typecheck` SHOULD be enabled per-target starting from the highest-fan-out, slowest-to-typecheck libraries once `isolatedDeclarations` is green, rather than attempted repo-wide in one change.**
    Rationale: the measured Canva result (§6) came from a ~90%-migrated monorepo of ~40,000 packages, migrated incrementally starting from bottleneck libraries; `isolatedDeclarations` requires source changes (explicit return-type annotations) that are not always trivial, so an all-at-once flip risks a large, hard-to-review diff with no incremental checkpoint.
    Verify: `bazel query 'rdeps(//..., //candidate:lib)'` — a high result count identifies a good migration candidate; after enabling, confirm `tsc --noEmit` (or the `_typecheck` target) is green before and after the `isolated_typecheck = True` flip on that target.
    Severity: **SHOULD** for a monorepo above roughly a few hundred `ts_project` targets (where sequential type-check chains are actually the bottleneck); **CONSIDER** below that scale, where the migration cost may exceed the wall-clock win. Bazel 7, 8, 9. rules_ts ≥ whatever release ships `isolated_typecheck` (present since at least 2024-12, confirmed on v3.10.1 and `main`); TypeScript ≥5.5. Settles M-K-11.

13. **An agent MUST NOT set `isolated_typecheck = True` on a target whose `tsconfig.json` lacks `"isolatedDeclarations": true`, expecting the flag alone to produce the parallelism win.**
    Rationale: `isolated_typecheck` splits the Bazel action graph, but the *speedup* comes from `isolatedDeclarations` making `.d.ts` emission a type-checker-free, single-file transform; without that tsconfig option, the split still runs but does not remove the underlying sequential-chain cost the doc describes, and the option may not even be legal to enable if the codebase has inferred-type exports that would now error.
    Verify: `grep '"isolatedDeclarations"' tsconfig.json` for the target's config before flipping `isolated_typecheck`; absence is the finding. Confirm `tsc --noEmit` passes clean under `isolatedDeclarations: true` locally before touching the BUILD file (per Aspect's own migration steps).
    Severity: **MUST**. Bazel 7, 8, 9. TypeScript ≥5.5, rules_ts with `isolated_typecheck` support. Settles M-K-11.

14. **An agent porting a 1.x-era `ts_project(supports_workers = True)` snippet to rules_ts ≥2.0 MUST replace the boolean with the tri-state integer, or remove the attribute (persistent-worker mode is no longer the default).**
    Rationale: `supports_workers` changed from boolean to a tri-state `[-1, 0, 1]` in the 2.0.0 breaking-changes list; a boolean `True`/`False` is not the same type and either errors or silently means something different than the author intended, and persistent-worker mode itself is no longer enabled by default as of 2.0 because of unresolved determinism bugs the maintainers "don't have the resources to maintain."
    Verify: `grep -rn "supports_workers" **/BUILD.bazel **/*.bzl` and check every match's value is `-1`, `0`, or `1` — a literal `True`/`False` is the finding. Empty grep = nothing to check (attribute unused, which is now the common case).
    Severity: **MUST**. Bazel 7, 8, 9. rules_ts ≥2.0 (breaking relative to 1.x).

## Fleet evidence

No fleet repository builds TypeScript with Bazel today; every `ts_project` claim above is grounded on the ruleset's own docs and source, not fleet code, per the map's Shape F classification ([bazel-topic-map.md § How to read this, item 4](../bazel-topic-map.md)). Two fleet-shape mappings are directly relevant to the transpiler decision (rule #3/#4) if any of these repos adopt Bazel:

- `ocx-catalog` and `grimoire-indexer` are npm, `tsc`-only builds with a shipped `bin` — no existing bundler step ([fleet-bazel-readiness.md:261](../bazel-audit/fleet-bazel-readiness.md#L261)). These map onto `ts_project(transpiler = "tsc")` with the least friction: they already accept `tsc`'s speed, so the SWC-vs-tsc tradeoff in rule #4 doesn't force a decision — staying on `tsc` costs nothing they don't already pay.
- `grimoire-vscode` and `vscode-ocx` are npm with an esbuild bundler step and no first-party `rules_esbuild` in the frame's named ruleset set ([fleet-bazel-readiness.md:262](../bazel-audit/fleet-bazel-readiness.md#L262)) — a candidate for the `transpiler` attribute's documented "any rule or macro with signature `(name, srcs, **kwargs)`" extension point ([transpiler.md § Other Transpilers](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)), not a gap in rules_ts itself.

No fleet CI job currently distinguishes `bazel build` from `bazel test` for a TypeScript target (there are none), so rule #2 (CI must run `bazel test`) has no fleet violation to cite — it is preventive guidance for `rules_ocx`'s own future users ("Bazel monorepo maintainers," per its `AGENTS.md`) and any fleet repo that later adopts `rules_ts`.

## AI-agent angle

- **Reports "the build passed" after `bazel build //path:my_ts_project` and stops.** This is the single sharpest failure mode named in the wave-1 map (M-K-01, P0). An agent trained on general software habits treats a successful build as proof the code type-checks; under rules_ts ≥2.0 with any transpiler set, it is not. Mechanical check: before claiming a `ts_project` is clean, run `bazel test //path:my_ts_project_typecheck_test` (or `bazel build --output_groups=typecheck //path:my_ts_project`) explicitly — rule #1.
- **Ports a 1.x-era `ts_project(...)` snippet with no `transpiler=` attribute** (common in training-data-era tutorials, StackOverflow answers, and older internal wikis). On rules_ts ≥2.0 this hard-fails at analysis time with the "Required Transpiler Selection" message — a loud, non-silent failure, but an agent that doesn't recognize the message may try unrelated fixes (bumping Bazel version, reinstalling node_modules) before reading the actual error. Mechanical check: grep the error text for "Required Transpiler Selection" and go straight to setting `transpiler =`.
- **Silences `TS2786`/`TS7016` with a blanket `skipLibCheck` instead of finding the missing `dependencies` entry.** `skipLibCheck` is a plausible-looking one-line fix an agent reaches for reflexively; it disables checking inside every dependency's declarations, not just the one at fault — a much larger correctness loss than the ticket implies. Mechanical check: rule #11 — read the failing package's own `package.json` before reaching for a global flag.
- **Treats `TS5033: EPERM` as an OS/filesystem permissions problem** and reaches for `chmod`, a sandbox flag, or a retry loop, because the string "EPERM: operation not permitted" pattern-matches training data about real permission errors far more often than it matches "two Bazel targets share an output path." Mechanical check: rule #10.
- **Sets `supports_workers = True`/`False`** from a memorized 1.x pattern. On 2.0+ this is a type mismatch against the tri-state `[-1, 0, 1]` attribute — a genuinely new failure signature that won't be in most models' training data yet, because the attribute type change is a 2.0-era (2023-09-07) breaking change and persistent-worker mode isn't default any more regardless. Mechanical check: rule #14.
- **Assumes `isolated_typecheck = True` alone is "the fast mode" and flips it without touching `tsconfig.json`.** The parallelism win is contingent on `isolatedDeclarations` being enabled and the codebase already passing under it; flipping the Bazel-side flag alone either does nothing useful or, worse, may not even be legal if the target's exports rely on cross-file type inference. Mechanical check: rule #13.
- **Assumes `outDir`/`declarationDir` in `tsconfig.json` control where Bazel writes output**, and "fixes" a build-layout confusion by editing them. Bazel silently ignores both; the fix is almost always in `srcs`/`deps`/`out_dir` on the `ts_project` target itself, not in tsconfig. Mechanical check: rule #6.

## Contested / evolving

- **SWC-vs-`tsc` output equivalence is not settled, and is unlikely to ever be "fixed" rather than merely documented.** The known-issues discussion (#398) is community-maintained, not a roadmap; both named gaps (type-only import elision, ESM/CJS export mutability) are structural consequences of SWC not running a full type checker, not simple bugs. As of 2026-09-05 there is no indication either gap will close; the practical posture (rule #4) is "know your target's risk surface," not "wait for parity."
- **The rules_ts compatibility floor is mid-change.** The released v3.10.1 (2026-08-21) declares no `bazel_compatibility` in `MODULE.bazel`; `main` already carries `bazel_compatibility = [">=7.7.0"]` and a bumped `aspect_rules_js` floor (2.0.0 → 3.4.0), unreleased as of this writing (§7). Trending toward a near-term release that raises the floor — re-verify before citing "no floor" as current once the next tagged release ships.
- **`isolated_typecheck` adoption is trending toward "the default recommendation for large monorepos," but the evidence base is still small and vendor-adjacent.** The only large-scale measured numbers available (Canva, ~40,000 packages) come from the ruleset vendor's own docs site reporting a customer's conference talk — a single data point, albeit a normatively strong one (a recorded talk with concrete before/after numbers, not a blog argument). No independent second measurement at comparable scale is public as of 2026-09-05. Airtable's scaling writeup (linked from the same Aspect page) covers isolated declarations adoption but not the same Bazel-specific action-graph metrics.
- **Whether `emitDecoratorMetadata`-using codebases should default away from SWC entirely, or only for the specific packages that use it, is a judgment call this research does not resolve** — the rules_ts community discussion documents the risk but does not recommend a blanket policy either way; rule #4 above picks the narrower, per-package scoping as the safer default, named as an assumption rather than settled practice.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_ts README.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/README.md) | Ruleset's own top-level docs (raw, `main`) | Fetched 2026-09-05 | Establishes `ts_project`'s role (transpiler + `tsc` split) and the custom-rule escape hatches |
| [rules_ts docs/transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md) | Ruleset docs (raw, `main`) | Fetched 2026-09-05 | The primary source for the mandatory transpiler choice, SWC setup steps, and the macro-expansion target list |
| [rules_ts docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) | Ruleset docs (raw, `main`) | Fetched 2026-09-05 | The primary source for the headline typecheck-gate fact, `validation_typecheck`, and all four failure signatures verbatim |
| [rules_ts docs/performance.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/performance.md) | Ruleset docs (raw, `main`) | Fetched 2026-09-05 | Frames `isolated_typecheck` as a bottleneck-targeted optimization with an ASCII dependency-graph example |
| [Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md) | Vendor (Aspect) docs site, ruleset maintainer's own content | Fetched 2026-09-05 | The only source with the exact Canva numbers, the oxc benchmark, and the migration steps in one place |
| [`ts/BUILD.bazel`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/BUILD.bazel) | Ruleset Starlark source (raw, `main`) | Fetched 2026-09-05 | Ground truth for every `bool_flag`/`string_flag` name and default (`validation_typecheck`, `default_to_tsc_transpiler`, `verbose`, `generate_tsc_trace`, `skipLibCheck`) |
| [`ts/defs.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/defs.bzl) | Ruleset Starlark source (raw, `main`) | Fetched 2026-09-05 | Ground truth for the `ts_project` macro's attribute defaults (`transpiler = None`, `no_emit = False`, `isolated_typecheck = False`, `validate = True`) |
| [`ts/private/ts_project.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/ts_project.bzl) | Ruleset Starlark source (raw, `main`) | Fetched 2026-09-05 | Ground truth for exactly which condition triggers the transpiler-selection `fail()`, and how `emit_js`/`emit_dts` gate the default output group |
| [`ts/private/options.bzl`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/options.bzl) | Ruleset Starlark source (raw, `main`) | Fetched 2026-09-05 | Exact verbatim text of the "Required Transpiler Selection" failure message |
| [rules_ts v2.0.0 release notes](https://github.com/aspect-build/rules_ts/releases/tag/v2.0.0) | GitHub release notes | 2023-09-07 | Primary, dated source for the breaking changes that made `transpiler` mandatory and removed default persistent-worker mode |
| [rules_ts v3.0.0 release notes](https://github.com/aspect-build/rules_ts/releases/tag/v3.0.0) | GitHub release notes | 2024-08-15 | Confirms the 3.x line tracks `rules_js` 2.0 as its floor; no further transpiler-relevant breaking changes at 3.0 |
| [MODULE.bazel at tag v3.10.1](https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/MODULE.bazel) | Ruleset module manifest, released version | 2026-08-21 | Establishes the *released* compatibility floor (none declared) as distinct from `main` |
| [MODULE.bazel at `main`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/MODULE.bazel) | Ruleset module manifest, unreleased | Fetched 2026-09-05 | Shows the in-flight `bazel_compatibility = [">=7.7.0"]` and `rules_js` floor bump not yet released |
| [rules_ts Discussion #398](https://github.com/aspect-build/rules_ts/discussions/398) | Ruleset maintainer's own GitHub Discussion | Opened 2023, active through 2025 | The only source naming the two concrete, still-open SWC-vs-`tsc` output differences with code examples |
| [bazel.build/extending/rules](https://bazel.build/extending/rules) | Canonical Bazel docs, "Validation Actions" section | Current, dateModified 2026-09-05 | Confirms validation actions don't block default outputs, and that `--run_validations` defaults `true` |
| [BazelCon 2025 schedule: Improving Bazel TypeScript Type-Checks With IsolatedDeclarations](https://bazelcon2025.sched.com/) | Conference program record | Talk given 2025-11-11 | Dates and locates the Canva talk independently of the vendor's own citation of it |
| [BazelCon 2025 talk video — Brad Zacher, Canva](https://www.youtube.com/watch?v=26CoMExb6FE) | Recorded conference talk | 2025-11-11 | Primary record of the measured numbers Aspect's docs page reports secondhand |
| [microsoft/TypeScript#22208](https://github.com/microsoft/TypeScript/issues/22208) | TypeScript's own issue tracker | Referenced by rules_ts troubleshooting doc | The upstream TS-side resolution bug class behind `TS5033: EPERM`'s `.ts`-vs-`.d.ts` mixup |
