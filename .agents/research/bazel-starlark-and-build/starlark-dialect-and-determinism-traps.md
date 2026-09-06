---
title: Starlark dialect and determinism traps
topic: starlark-dialect-and-determinism-traps
group: bazel-starlark-and-build
family: BZL-LARK
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
primary_sources_count: 16
settles: [M-A-05, M-A-06, M-A-07, M-A-08, M-A-09, M-A-17, M-A-18, M-A-19]
scope: >
  Covers Starlark-level traps that parse or evaluate to a wrong-but-silent
  result: the top-level statement restriction, dict/set/depset ordering and
  where it leaks into a command line or generated file, depset performance
  shapes, deprecated runfiles APIs, legacy struct providers, and two
  fleet-discovered testing/codegen traps. Does NOT cover buildifier's full
  warning catalogue or style guides (buildifier-taxonomy-and-style), macro
  vs. rule choice or symbolic-macro porting (macros-rules-and-symbolic-macros),
  or Bzlmod/module-extension mechanics (bazel-bzlmod-and-repo-rules/*).
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The statement-position rule](#1-the-statement-position-rule)
  2. [Dict and set iteration order](#2-dict-and-set-iteration-order-specified-but-the-leak-is-upstream)
  3. [Depset ordering guarantees and `.to_list()` cost](#3-depset-ordering-guarantees-and-to_list-cost)
  4. [The overly-nested-depset shape](#4-the-overly-nested-depset-shape)
  5. [Deprecated runfiles APIs](#5-deprecated-runfiles-apis)
  6. [Legacy struct-based providers vs. `provider()`](#6-legacy-struct-based-providers-vs-provider)
  7. [The `analysistest`/`expect_failure` vacuous pass](#7-the-analysistestexpect_failure-vacuous-pass)
  8. [Generated BUILD content authored as a string](#8-generated-build-content-authored-as-a-starlark-string)
- [Decisions](#decisions)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Fleet evidence](#fleet-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- No `if`/`for`/`while` **statement** may appear at Starlark module (top) level in any dialect — it is a parse-time static error per the language spec itself, not a Bazel-specific rule, so it applies identically to `.bzl`, `BUILD`, `MODULE.bazel`, `.star`, `.scl`, and any other embedded Starlark dialect (settles M-A-18).
- `while` is a reserved keyword with **no grammar production at all** — there is no such statement in Starlark, in any position, in any dialect.
- The two legal ways to branch at module scope are an if-**expression** (ternary, for choosing a value) and a `def` whose body holds the `if`/`for`, called as a bare top-level expression statement; list/dict comprehensions are expressions and are legal at top level too.
- Dict and set iteration order **is** specified: both preserve insertion order, normatively, per the Starlark spec — this is not the trap.
- The real trap is upstream: a `depset()` built without an explicit `order=` gets the `default` order, whose only guarantee is "deterministic for this graph shape" — not "stable when an unrelated transitive dependency is added elsewhere." Feeding that traversal straight into a dict/set/string join and then into an action's arguments silently changes the command line, and therefore the action key, on an unrelated graph edit (settles M-A-07).
- `depset.to_list()` costs O(N²) when called more than once across overlapping dependency chains — even "only at binary targets" is not safe once tests or IDE imports build overlapping target sets. Use `ctx.actions.args().add_all()` to defer expansion to execution time instead (settles M-A-06).
- Building a depset inside a loop with itself as `transitive=[x, ...]` produces the `overly-nested-depset` shape (buildifier category `overly-nested-depset`, no autofix) — collect a plain list first and construct one depset after the loop (settles M-A-05).
- `ctx.runfiles(collect_data=True)`, `collect_data=True`/`collect_default=True`, and `DefaultInfo.data_runfiles` are all on Bazel's own deprecated list; none of them is backed by a buildifier warning or an `--incompatible_*` flag, so the only check is a grep — Bazel will not tell you.
- A rule implementation returning a bare `struct(...)` (the legacy provider style) is discouraged on Bazel 8 and **removed outright** on Bazel 9.0: `--incompatible_disallow_struct_provider_syntax` is a permanent no-op there because legacy struct providers no longer exist (settles M-A-08). The official migration doc page still describes the legacy style as "for the moment... still supported," with zero mention of Bazel 9 — a stale-docs trap in its own right.
- Every `provider()` call should declare both `fields` and a documentation string (buildifier category `provider-params`) — undocumented fields become backward-incompatible the moment a field is added later (settles M-A-09).
- `analysistest`'s failure-message assertion (`asserts.expect_failure`) is a **plain substring search** (`actual_errors.find(expected_failure_msg) < 0` in `bazel-skylib`'s `unittest.bzl`) over the concatenated `AnalysisFailureInfo` cause messages — any fragment that happens to appear anywhere in that text, including the traceback's echo of the test's own call-site source line, makes the assertion pass whether or not the guard under test actually fired (settles M-A-19). This is fleet-documented and undocumented anywhere upstream.
- Generated BUILD-file content written as raw string concatenation (`ctx.file("BUILD.bazel", "...")`) is invisible to buildifier, stardoc, and every grep-based BUILD audit — a typo in a generated `package()` call passes every static check and only surfaces when an example actually builds the generated repo (settles M-A-17). Four fleet sites do this today.
- `depset1 + depset2`, `depset1 | depset2`, and `depset1.union(depset2)` are deprecated (buildifier `depset-union`, backed by `--incompatible_depset_union`) — an LLM trained on older Bazel snippets will reach for these first; they still load and run today, they just accumulate technical debt toward a future removal.
- Starlark gained a native `set()` builtin in Bazel 8.1.0 (`--experimental_enable_starlark_set`, default `true` as of 2026-09-05 but still tagged `experimental`) — the dict-as-set idiom (`{k: True for k in xs}`), used even in Bazel's own official depsets documentation, predates it and remains the common pattern in existing code.
- `assert` is reserved but, like `while`, implements nothing — Starlark has no built-in assertion statement; assertion primitives are always application-defined (`unittest.bzl`'s `asserts.*`, or a dialect's own `expect.*`).

## Findings

### 1. The statement-position rule

The restriction is not a Bazel quirk layered on top of Python — it is written into the core Starlark language grammar itself. The spec's grammar reference defines the top-level unit as:

```text
File = {Statement | newline} eof .
Statement = DefStmt | IfStmt | ForStmt | SimpleStmt .
```

and then states the restriction in prose, twice, once per construct:

> "An `if` statement is permitted only within a function definition. An `if` statement at top level results in a static error." — [Starlark spec §If statements](https://github.com/bazelbuild/starlark/blob/master/spec.md#if-statements)
>
> "In Starlark, a `for` statement is permitted only within a function definition. A `for` statement at top level results in a static error." — [Starlark spec §For statements](https://github.com/bazelbuild/starlark/blob/master/spec.md#for-statements)

and explains the consequence for module execution:

> "Because `if` statements and `for` statements cannot appear outside of a function, control flows from top to bottom." — [Starlark spec §Module execution](https://github.com/bazelbuild/starlark/blob/master/spec.md#module-execution)

`while` never appears in the grammar at all. It is listed only among the tokens "reserved as possible future keywords" alongside `assert`, `class`, `import`, `yield`, etc. — [Starlark spec §Lexical elements](https://github.com/bazelbuild/starlark/blob/master/spec.md#lexical-elements). There is no `WhileStmt` production, in any position, in any dialect.

Because the rule lives in the spec, not in Bazel's own `.bzl`/BUILD-specific machinery, it holds identically for `.bzl`, `BUILD`, `MODULE.bazel`, `.star`, `.scl` files parsed by upstream Bazel, and for any other embedded Starlark dialect — confirmed independently by the fleet's own reference for the `starlark-rust`-backed `ocx package test --script` engine, and by `starlark-rust`'s own parser test fixtures:

```
Program:
x = 1
if x == 1:
  x = 2
x = 3

Error:
error: `if` cannot be used outside `def` in this dialect
```
— [`starlark-rust` grammar test golden file, `top_level_statements.golden`](https://github.com/facebook/starlark-rust/blob/main/starlark_syntax/src/syntax/grammar_tests/top_level_statements.golden)

This is byte-for-byte what the fleet's own dialect reference documents from the same engine — [`ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md:13-58`](/home/mherwig/dev/ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md), which also gives the two legal workarounds:

```python
# (1) if-EXPRESSION (ternary) — for choosing a VALUE. Legal at top level.
TOOL = "tool.exe" if ocx.target_platform.os == ocx.os.Windows else "tool"

# (2) def + top-level call — for a conditional BLOCK.
def check_env_wiring():
    if ocx.target_platform.os == ocx.os.Windows:
        return
    v = ocx.env("MANPATH")
    expect.ne(v, None)

check_env_wiring()                   # top-level call: legal
```

List/dict comprehensions are **expressions** in the grammar (`ListComp`, `DictComp` are `Operand` alternatives under `Expression`, not statements), so they are legal at top level even though they iterate — this is easy to over-generalize into "loops are fine at top level," which they are not: a comprehension is one expression evaluated once; a `for` **statement** with a mutable body is not permitted outside a `def` under any circumstance.

The failure mode named in the brief and confirmed by [`bazel-audit/starlark-code-shape.md`, Patterns §1](../bazel-audit/starlark-code-shape.md) is real and has shipped twice in `ocx-contrib`'s own smoke-test corpus: the error is a **parse-time** static error, so it reds every target on every platform in one shot, before a single test assertion runs.

### 2. Dict and set iteration order: specified, but the leak is upstream

Contrary to a common assumption carried over from "hash tables have no order," Starlark dict and set iteration order is normatively guaranteed:

> "Dictionaries are a subtype of `Mapping`. `len()` returns the number of entries. Iteration yields the keys in the order that they were inserted; updating the value associated with an existing key does not affect the iteration order." — [Starlark spec §Dictionaries](https://github.com/bazelbuild/starlark/blob/master/spec.md#dictionaries)

> "A set is a subtype of `Collection`... the order of iteration is the order in which elements were inserted. (Attempting to add an element that is already present is a no-op, and does not change the iteration order.)" — [Starlark spec §Sets](https://github.com/bazelbuild/starlark/blob/master/spec.md#sets)

So a dict or set built from a **fixed, known insertion sequence** — e.g. iterating `ctx.attr.deps` (BUILD-file order) — is fully reproducible. That is not where M-A-07's "silent action-key instability" comes from.

The real leak is a depset with unspecified (`default`) order feeding a dict, set, or string join:

> "If [the `order`] argument is omitted, the depset has the special `default` order, in which case there are no guarantees about the order of any of its elements (except that it is deterministic)." — [`bazel.build/extending/depsets` §Order](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/depsets.md#order)

"Deterministic" here means only "the same graph, run twice, yields the same list" — it does **not** mean "stable when the graph changes." A `default`-order depset's flattened order is a function of its internal DAG structure; adding an unrelated transitive dependency anywhere in the build graph can silently reorder an existing depset's `to_list()` output. Code of the shape:

```python
# BAD: bakes an unstable default-order traversal into a command-line string
seen = {}
for f in headers.to_list():          # headers built with order="default"
    seen[f.short_path] = True
args.add("-I" + ",".join(seen.keys()))
```

produces a command-line argument whose *content* — not just its cosmetic order — changes when an unrelated part of the build graph changes, which changes the action's command line and therefore its action key: a spurious cache miss with no functional change, which reads as "the build is non-deterministic" when the individual Starlark operations were each, in isolation, well-defined.

Two independent, deterministic builds of the same target should therefore produce byte-identical action command lines; a diff catches the case above:

```bash
bazel build --execution_log_compact_file=/tmp/exec1.log //target
# edit something in an unrelated part of the graph that touches a shared depset transitively
bazel build --execution_log_compact_file=/tmp/exec2.log //target
bazel build src/tools/execlog:parser
bazel-bin/src/tools/execlog/parser --log_path=/tmp/exec1.log --log_path=/tmp/exec2.log \
    --output_path=/tmp/exec1.log.txt --output_path=/tmp/exec2.log.txt
diff /tmp/exec1.log.txt /tmp/exec2.log.txt
```
— [`src/tools/execlog/README.md`](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md)

Empty diff on the target's action arguments = pass; any diff on a target whose real inputs did not change = the M-A-07 trap firing.

### 3. Depset ordering guarantees and `.to_list()` cost

Depsets support three named traversal orders — `postorder`, `preorder`, `topological` — plus the unordered-but-deterministic `default`:

```python
def create(order):
  a = depset(["a"], order=order)
  b = depset(["b"], transitive=[a], order=order)
  c = depset(["c"], transitive=[a], order=order)
  d = depset(["d"], transitive=[b, c], order=order)
  return d

print(create("postorder").to_list())    # ["a", "b", "c", "d"]
print(create("preorder").to_list())     # ["d", "b", "a", "c"]
print(create("topological").to_list())  # ["d", "b", "c", "a"]
```
— [`bazel.build/extending/depsets` §Order](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/depsets.md#order)

The order argument **must be fixed at construction time**; there is no way to re-traverse an existing depset in a different order after the fact.

`.to_list()`'s cost is the sharpest named performance pitfall in the official guidance:

> "You can coerce a depset to a flat list using `to_list()`, but doing so usually results in O(N²) cost... A common misconception is that you can freely flatten depsets if you only do it at top-level targets... since then the cost is not accumulated over each level of the build graph. But this is *still* O(N²) when you build a set of targets with overlapping dependencies. This happens when building your tests `//foo/tests/...`, or when importing an IDE project." — [`bazel.build/rules/performance` §Avoid calling depset.to_list()](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/performance.md#avoid-calling-depsetto_list)

The fix Bazel's own docs give is `ctx.actions.args()`, which defers depset expansion to the execution phase and is reported to cut rule memory consumption "by 90% or more":

```python
# Bad, makes a giant string of a whole depset at analysis time
args.add(" ".join(["-I%s" % file.short_path for file in files.to_list()]))

# Good, only stores a reference to the depset; expanded at execution time
args.add_all(files, format_each="-I%s", map_each=_to_short_path)
```
— [`bazel.build/rules/performance` §Use ctx.actions.args()](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/performance.md#use-ctxactionsargs-for-command-lines)

### 4. The overly-nested-depset shape

Building a depset inside a loop, using the accumulator itself as a transitive input, produces an unbounded chain of single-element nodes:

```python
x = depset()
for i in inputs:
    # Do not do that.
    x = depset(transitive = [x, i.deps])
```
— [`bazel.build/rules/performance` §Reduce the number of calls to depset](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/performance.md#reduce-the-number-of-calls-to-depset)

buildifier catches exactly this shape under a dedicated category:

> "Category name: `overly-nested-depset`. Automatic fix: no... If a depset is iteratively chained in a for loop... this can result in an overly nested depset with a long chain of transitive elements. Such patterns can lead to performance problems." — [`buildtools/WARNINGS.md` §overly-nested-depset](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md#the-depset-is-potentially-overly-nested)

The fix collects a flat Starlark list first and calls the constructor once:

```python
transitive = []
for i in inputs:
    transitive.append(i.deps)
x = depset(transitive = transitive)
# or, as a comprehension:
x = depset(transitive = [i.deps for i in inputs])
```

There is no `--incompatible_*` flag behind this warning — it is a pure performance lint, never a removal.

### 5. Deprecated runfiles APIs

`bazel.build/extending/rules` names the deprecated runfiles surface explicitly, under "Runfiles features to avoid":

> "**Avoid** use of the `collect_data` and `collect_default` modes of `ctx.runfiles`. These modes implicitly collect runfiles across certain hardcoded dependency edges in confusing ways. Instead, add files using the `files` or `transitive_files` parameters of `ctx.runfiles`, or by merging in runfiles from dependencies with `runfiles = runfiles.merge(dep[DefaultInfo].default_runfiles)`.
>
> **Avoid** use of the `data_runfiles` and `default_runfiles` [constructor parameters] of the `DefaultInfo` constructor. Specify `DefaultInfo(runfiles = ...)` instead... When retrieving `runfiles` from `DefaultInfo`... use `DefaultInfo.default_runfiles`, **not** `DefaultInfo.data_runfiles`."
— [`bazel.build/extending/rules` §Runfiles features to avoid](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/rules.md#runfiles-features-to-avoid)

Note the asymmetry: reading `DefaultInfo.default_runfiles` (the field) is correct and current; the deprecated constructor *parameters* are the same names minus the read-side distinction — `default_runfiles=`/`data_runfiles=` as constructor kwargs are what to avoid, while `.default_runfiles` as a read is the recommended replacement for `.data_runfiles`. A grep that flags any occurrence of `data_runfiles` (constructor or read) and lets `default_runfiles` reads through, while still flagging `default_runfiles=`/`data_runfiles=` used as `DefaultInfo(...)` constructor keywords, captures the distinction correctly.

None of `collect_data`, `collect_default`, or `data_runfiles` triggers a buildifier warning or an `--incompatible_*` flag — confirmed by grepping the full `WARNINGS.md` catalogue, zero hits. This is purely a docs-level deprecation with no mechanical enforcement anywhere in the toolchain; Bazel will build and run code using these APIs without a diagnostic. The only available check is a grep, and it must be run deliberately — nothing will surface it on its own.

### 6. Legacy struct-based providers vs. `provider()`

The modern style declares a typed provider and returns instances of it:

```python
ExampleInfo = provider(
    "Info needed to compile/link Example code.",
    fields = {
        "headers": "depset of header Files from transitive dependencies.",
        "files_to_link": "depset of Files from compilation.",
    },
)

def _example_library_impl(ctx):
    return [ExampleInfo(headers = ..., files_to_link = ...)]
```
— [`bazel.build/extending/rules` §Custom providers](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/rules.md#custom-providers)

The legacy style returns a `struct` with the provider's fields attached by name:

```python
# legacy, deprecated
return struct(example_info = struct(headers = depset(...)))
```
which callers read with dot access (`hdr.example_info.headers`) instead of `hdr[ExampleInfo].headers`. The docs page itself still frames this as transitional:

> "For the moment, legacy providers are still supported. A rule can return both legacy and modern providers as follows..." — [`bazel.build/extending/rules` §Migrating from legacy providers](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/rules.md#migrating-from-legacy-providers)

That framing is **stale as of 2026-09-05** — the page contains zero mentions of Bazel 9 anywhere. The actual Bazel 9.0.0 release notes are unambiguous:

> "**[Incompatible]** Legacy `struct` providers are no longer supported. The `--incompatible_disallow_struct_provider_syntax` flag is now a no-op." — [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)

and the flag's own history confirms it was still opt-in and defaulting `false` through Bazel 8:

> "`--incompatible_disallow_struct_provider_syntax` ([#19467](https://github.com/bazelbuild/bazel/issues/19467); will default to true)" — listed among flags **not yet flipped**, in [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0)

So: on Bazel 8.x the flag exists and can be flipped early to test forward-compatibility, but the legacy style still works by default; on Bazel 9.0+, returning a bare `struct()` with legacy-provider fields fails unconditionally, flag or no flag. buildifier's own lint for this predates the removal and never needed a flag argument to be useful:

> "Category name: `rule-impl-return`. Automatic fix: no. Returning structs from rule implementation functions is deprecated, consider using providers or lists of providers instead." — [`buildtools/WARNINGS.md` §rule-impl-return](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md#avoid-using-the-legacy-provider-syntax)

Every `provider()` call should carry both a doc string and `fields`:

> "Category name: `provider-params`... Calls to `provider` should specify a documentation string and a list of fields." — [`buildtools/WARNINGS.md` §provider-params](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md#calls-to-provider-should-specify-a-list-of-fields-and-a-documentation)

Undeclared fields are not merely a style nit: because provider identity is `Info` symbol + shape, adding a field to an undocumented, unconstrained provider later is a silent contract change for every downstream reader that pattern-matches on `hasattr`.

### 7. The `analysistest`/`expect_failure` vacuous pass

The official failure-testing pattern is:

```python
failure_testing_test = analysistest.make(
    _failure_testing_test_impl,
    expect_failure = True,
)

def _failure_testing_test_impl(ctx):
    env = analysistest.begin(ctx)
    asserts.expect_failure(env, "This rule should never work")
    return analysistest.end(env)
```
— [`bazel.build/rules/testing` §Failure testing](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/testing.md#failure-testing)

The docs never explain how `expect_failure` actually matches. Reading `bazel-skylib`'s implementation shows it is a raw substring search over every collected failure message, concatenated:

```python
def _expect_failure(env, expected_failure_msg = ""):
    dep = _target_under_test(env)
    if AnalysisFailureInfo in dep:
        actual_errors = ""
        for cause in dep[AnalysisFailureInfo].causes.to_list():
            actual_errors += cause.message + "\n"
        if actual_errors.find(expected_failure_msg) < 0:
            _fail(env, "Expected errors to contain '%s' but did not..." % expected_failure_msg)
    else:
        _fail(env, "Expected failure of target_under_test, but found success")
```
— [`bazel-skylib/lib/unittest.bzl`, `_expect_failure`](https://github.com/bazelbuild/bazel-skylib/blob/main/lib/unittest.bzl)

`str.find(...) < 0` means: **any** occurrence anywhere in the concatenated cause text passes, whether or not it came from the guard's own `fail()` call. The fleet's own rule documents the concrete failure mode this substring semantics enables — a Starlark error's reported text carries a traceback that echoes each stack frame's source line, so an `expected_failure_msg` fragment that also happens to appear, verbatim, in the *test's own call-site source line* matches the traceback echo instead of the guard's actual message, and the test passes even with the guard deleted:

> "A guard test written with `analysistest`'s `expect_failure` can pass vacuously: a Starlark failure carries a traceback that echoes each frame's *source line*, so an expected fragment which also appears in the test's own call site matches the echo rather than the guard's message. Hold the fragment in a constant the call site cannot spell, and confirm the test fails when the guard is removed — a guard test that has never been seen red is not evidence." — [`rules_ocx/.claude/rules/starlark.md:34-39`](/home/mherwig/dev/rules_ocx/.claude/rules/starlark.md)

No upstream source documents this failure mode; `bazel.build/rules/testing` does not mention it, and no `analysistest`/`unittest.bzl` issue tracker thread surfaced in this dive's search names it. This is a genuine fleet-discovered, portable, verbatim-reusable trap.

### 8. Generated BUILD content authored as a Starlark string

Four sites in `rules_ocx` synthesize BUILD-file text as raw string concatenation and write it with `ctx.file`:

```python
# ocx/private/download.bzl:17-26 — a fixed template
_BUILD = """\
package(default_visibility = ["//visibility:public"])

exports_files(glob(["ocx*"]))

filegroup(
    name = "binary",
    srcs = ["ocx"],
)
"""
```

```python
# ocx/private/package.bzl:284-295 — built with string joins
ctx.file("BUILD.bazel", render_launchers_build(
    discovered.bins,
    host.is_windows,
    extra = "\n".join([
        'exports_files(["env.bzl"])',
        "",
        "filegroup(",
        '    name = "content",',
        '    srcs = glob(["content/**"], allow_empty = True),',
        ")",
        "",
    ]),
))
```

```python
# ocx/private/package.bzl:367-406 — a select()-emitting hub, built line by line
def _ocx_package_hub_impl(ctx):
    lines = ['package(default_visibility = ["//visibility:public"])', ""]
    ...
    for s, real in ctx.attr.platform_reals.items():
        ...
        lines += [
            "config_setting(",
            '    name = "{}",'.format(s),
            "    constraint_values = [",
        ] + ['        "{}",'.format(c) for c in constraints] + [
            "    ],",
            ")",
            "",
        ]
    ctx.file("BUILD.bazel", "\n".join(lines))
```
(also `project.bzl:124-127,228-230`; source: [`rules_ocx/ocx/private/*.bzl`](/home/mherwig/dev/rules_ocx/ocx/private/))

None of this text is ever parsed as Starlark by buildifier, stardoc, or a grep-based BUILD audit — it is a string, indistinguishable to every static tool from any other string a `.bzl` file might build. `bazel-audit/starlark-code-shape.md` names the consequence directly:

> "A typo in a generated `package(default_visibility=...)` string would pass every static check in this repo and only surface when an example test actually builds the generated repo. This is a genuine blind spot a 'grep the BUILD graph' heuristic must know to route around." — [`bazel-audit/starlark-code-shape.md`, Smells §3](../bazel-audit/starlark-code-shape.md)

There is no mechanical way to validate the *generated* Starlark text short of actually building a target from the generated repository — buildifier operates on files on disk before repository-rule execution, not on strings a repository rule assembles at fetch time. The only real check is an integration test, which is exactly what `examples/*` already provides in this fleet — but nothing forces every generator call site to have one.

## Decisions

- **The statement-position rule is a Starlark-spec fact, not a Bazel dialect quirk — state it that way.** Evidence: the spec's own grammar and prose ("An `if` statement at top level results in a static error") make no reference to Bazel at all, and an independent embedding (`starlark-rust`, used by `ocx`'s smoke-test engine) enforces the identical restriction with near-identical wording. Assumption: a rule phrased as "Bazel disallows top-level control flow" undersells the guarantee — it holds for *any* Starlark dialect an agent might touch, including ones the fleet does not yet use (e.g., Buck2's Starlark).
- **The dict/set-order trap is not "order is unspecified" — it is "an unspecified upstream (default-order depset) feeds a specified-order consumer (dict/set)."** Evidence: the spec guarantees dict/set insertion order; `bazel.build/extending/depsets` only guarantees `default` order is "deterministic," not stable across graph edits. Assumption: a rule that tells an agent "avoid relying on dict order" is solving the wrong problem — the fix is at the depset boundary (explicit `order=`, or defer with `ctx.actions.args()`), not at the dict.
- **Legacy struct providers are a MUST-not-use on both 8 and 9, but for different reasons, and the rule must say both.** Evidence: Bazel 8's own release notes list the incompatible flag as still un-flipped (opt-in only); Bazel 9's release notes call it a permanent no-op because the syntax no longer exists. Assumption: a repo targeting only Bazel 8 today, as `rules_ocx` does (8.7.0 pin), still needs this as a MUST rather than a SHOULD, because every fleet CI matrix in this program also runs `9.x` and `rolling` — code that works on the 8.7.0 leg and silently fails on the 9.x leg is worse than code that never worked.
- **The `analysistest`/`expect_failure` vacuous pass and the generated-BUILD-as-string blind spot are shipped as named, portable traps with the ocx names parameterised out, per the brief's instruction that these are the strongest verbatim-reuse candidates in the corpus.** Evidence: neither trap is documented anywhere upstream (`bazel.build/rules/testing`, `bazel.build/extending/rules`, and buildifier's `WARNINGS.md` are all silent on both); both are demonstrated with real, checked fleet code. Assumption: the underlying mechanisms (`str.find`-based substring assertion; `ctx.file()` accepting an arbitrary string) are properties of `bazel-skylib` and Bazel itself, not of `rules_ocx`'s implementation, so the traps generalize to any consumer of `analysistest` or any repository/module-extension author who synthesizes BUILD text — which is the justification for shipping them as house rules rather than fleet-specific notes.
- **The deprecated-runfiles-API and provider-params checks are grep-only, and the rule must say so rather than implying a lint exists.** Evidence: `collect_data`, `collect_default`, and `data_runfiles` produce zero hits across the entirety of `buildtools/WARNINGS.md` and no associated `--incompatible_*` flag was found in the current command-line reference. Assumption: a reviewer or an AI agent who expects "buildifier would have caught it" for these APIs is wrong, and the rule's verification column must not overstate mechanical coverage that does not exist.

## Normative guidance candidates

1. **Never write a top-level `if`, `for`, or `while` statement in any Starlark file.** Rationale: static parse error that reds every target on every platform at once, before any test runs. Verify: `grep -nE '^\s{0,0}(if |for |while )' **/*.{bzl,star,scl}` and inspect any hit that is not inside a `def` body (a naive column-0 grep is a fast first pass; a false negative is possible for an indented-but-still-top-level continuation line, so treat this as a triage grep, not a proof). Empty output = pass. Severity: **MUST**. Applies: Bazel 7/8/9, all rulesets, and any other Starlark dialect. Settles: M-A-18.
2. **Never write `while` anywhere in Starlark, in any position.** Rationale: `while` is a reserved keyword with no grammar production in the language at all — not "restricted to functions," simply absent. Verify: `grep -n '\bwhile\b' **/*.{bzl,star,scl}`. Empty output = pass. Severity: **MUST**. Applies: all Bazel majors, all rulesets. Settles: M-A-18 (same root cause).
3. **Prefer a list/dict comprehension over a `def`-plus-immediate-call when the goal is a single value or collection at module scope.** Rationale: comprehensions are expressions and legal at top level; wrapping a one-shot collection build in a throwaway function obscures why the workaround exists. Verify: reading heuristic — does a top-level `def` immediately called once produce only a list/dict/set with no side effects? If so, it is a comprehension candidate. No mechanical check; absence of any flagged case = pass. Severity: **CONSIDER**. Applies: all. Settles: none (style corollary of M-A-18).
4. **Never let a `default`-order depset's `.to_list()` output flow into an action's command line or a generated file without either an explicit `order=` chosen for a real requirement, or an explicit `sorted()`/canonicalization step.** Rationale: `default` order is only guaranteed deterministic for a fixed graph shape — an unrelated transitive-dependency edit elsewhere in the build graph can silently reorder it, changing the action's command line and therefore its action key with no functional change (a spurious cache miss masquerading as "non-determinism"). Verify: build twice with `--execution_log_compact_file`, touch an unrelated part of the graph between runs, diff the two logs with `bazel-bin/src/tools/execlog/parser --log_path=... --log_path=... --output_path=... --output_path=...`. Empty diff on the arguments of an unaffected action = pass; any diff = the trap firing. Severity: **MUST** for any rule building a linker/compiler-style command line or writing a manifest file from depset contents; **SHOULD** elsewhere. Applies: Bazel 7/8/9, all rulesets. Settles: M-A-07.
5. **Never call `.to_list()` inside a rule implementation except at the final consuming target (typically a `_binary`-shaped rule), and never for constructing action arguments.** Rationale: O(N²) analysis cost across the whole build; the "only at the top" exemption is false once tests or IDE-project imports build overlapping target sets. Verify: `grep -n '\.to_list()' **/*.bzl` excluding files under a `tests/`/debugging path, then confirm each hit is either at a genuine terminal rule or replaceable by `ctx.actions.args().add_all()`/`add_joined()`. Empty output = pass. Severity: **MUST**. Applies: Bazel 7/8/9, all rulesets. Settles: M-A-06.
6. **Never build a depset inside a loop using the accumulator itself as `transitive=`.** Rationale: produces the overly-nested-depset shape — a long chain of single-element nodes with poor traversal performance, and no `--incompatible_*` flag will ever catch it because it is a pure performance defect, not a compatibility break. Verify: buildifier warning `overly-nested-depset` (no autofix). Empty output = pass. Severity: **MUST**. Applies: Bazel 7/8/9, all rulesets. Settles: M-A-05.
7. **When several transitive depsets must be merged, collect a plain Starlark list across the loop and construct the depset once, after the loop.** Rationale: the mechanical fix for #6; a single `depset(transitive = collected)` call replaces N nested constructions. Verify: same as #6 — a hit means the previous rule's fix has not been applied. Severity: **MUST** (paired with #6). Applies: Bazel 7/8/9, all rulesets. Settles: M-A-05.
8. **Never merge two depsets with `+`, `|`, or `.union()`.** Rationale: deprecated since `--incompatible_depset_union`; an LLM trained on older Bazel snippets reaches for these first because they read as natural set algebra, and they still load and run today, silently accumulating debt toward a future hard removal. Verify: buildifier warning `depset-union`. Empty output = pass. Severity: **SHOULD** (not yet a hard error on 8 or 9, but flag-gated and trending toward one). Applies: Bazel 7/8/9. Settles: none directly (buildifier-taxonomy owns the full catalogue); cited here because it is the map's own worked seed-a-violation example for M-A-02.
9. **Never return a bare `struct(...)` from a rule implementation function.** Rationale: works, with a deprecation warning, on Bazel 8; **fails unconditionally on Bazel 9.0+** because legacy struct providers no longer exist and `--incompatible_disallow_struct_provider_syntax` is a permanent no-op there. Verify: buildifier warning `rule-impl-return` (no autofix). Empty output = pass. Severity: **MUST** for any codebase whose CI matrix includes Bazel 9.x or later (which includes every fleet CI matrix in this program). Applies: Bazel 8 (deprecated, still works) → Bazel 9 (hard removed). Settles: M-A-08.
10. **Every `provider()` call declares both `fields` (list or dict) and a documentation string.** Rationale: an undocumented, unconstrained provider's shape is a silent contract that becomes backward-incompatible the moment a field is added, because nothing records what callers may rely on. Verify: buildifier warning `provider-params`. Empty output = pass. Severity: **MUST** for any new provider; **SHOULD** for existing undocumented ones (0 providers exist in the fleet today, so this is a forward-looking bar, not a retrofit). Applies: Bazel 7/8/9, all rulesets. Settles: M-A-09.
11. **Never use `ctx.runfiles(collect_data=True)` or `collect_data=True`/`collect_default=True` as `ctx.runfiles()` arguments.** Rationale: named "avoid" in the official rules doc for implicitly collecting runfiles across hardcoded, confusing dependency edges; no buildifier warning or `--incompatible_*` flag exists for this, so nothing else will catch it. Verify: `grep -n 'collect_data\|collect_default' **/*.bzl`. Empty output = pass. Severity: **MUST** for new code, **SHOULD** for a migration backlog. Applies: Bazel 7/8/9, all rulesets. Settles: none directly (no M-ID names this precisely; covered per brief).
12. **Never construct `DefaultInfo(data_runfiles = ..., default_runfiles = ...)` as separate legacy fields; use `DefaultInfo(runfiles = ...)` instead, and when reading a dependency's runfiles for merging, read `DefaultInfo.default_runfiles`, never `DefaultInfo.data_runfiles`.** Rationale: the default/data split is legacy-only; using it produces subtly wrong runfiles trees for consumers that expect the modern single-field contract. Verify: `grep -n 'data_runfiles' **/*.bzl` — every hit is suspect (a legitimate `default_runfiles` **read** does not match this grep since it is scoped to `data_runfiles`, but also flag any `default_runfiles =` used as a `DefaultInfo(...)` *constructor* keyword, which is the other deprecated half). Empty output = pass. Severity: **MUST** for new code. Applies: Bazel 7/8/9, all rulesets. Settles: none directly (covered per brief).
13. **Never use `assert` as an identifier, and never expect an `assert` statement to exist.** Rationale: reserved but unimplemented, exactly like `while`; assertion primitives are always application- or dialect-defined (`asserts.*` from `bazel-skylib`, or a host's own `expect.*`). Verify: `grep -n '\bassert\b' **/*.bzl` — any hit outside a string literal or comment is either dead code (if it were legal, which it is not) or a training-data hallucination. Empty output = pass. Severity: **MUST**. Applies: all Starlark dialects. Settles: none directly.
14. **An `analysistest` test built with `expect_failure = True` must assert against a fragment that cannot appear at its own call site, and the test suite must record having observed the test fail when the guard is removed.** Rationale: `asserts.expect_failure` is a substring search (`str.find`) over the concatenated failure-cause text, which includes a traceback echo of each stack frame's source line; a fragment that also appears verbatim in the calling `.bzl` file's own source matches that echo and passes vacuously even with the guard deleted. Verify: no mechanical check exists for "is this fragment collision-free" — it is a reading heuristic (does the exact string literal passed to `expect_failure` appear anywhere else in the same file, especially near the call site?) backed by a manual regression drill: comment out the `fail()` call the test is meant to guard, rerun the test, and confirm it goes red. A test that has never been observed red is not evidence, regardless of how it reads. Empty output ("this fragment appears nowhere else in the file, and removing the guard turned the test red") = pass. Severity: **MUST**. Applies: Bazel 7/8/9, any `analysistest` consumer. Settles: M-A-19.
15. **Any repository rule, module extension, or macro that writes BUILD-file text as a raw string (`ctx.file("BUILD.bazel", <string>)` or equivalent) must have at least one integration test that actually builds a target out of the generated repository.** Rationale: generated BUILD content is invisible to buildifier, stardoc, and every grep-based audit — those tools only see the `.bzl` source that *builds* the string, never the string's own content as Starlark. A typo in the generated text (a stray quote, a wrong attribute name) passes every static check and surfaces only when something tries to build the generated target. Verify: for each `ctx.file(` call site whose content argument is a computed string (not a static `load()`ed file), confirm a corresponding example or e2e test target exists in CI and is exercised on every push, not just on a schedule. This is a reading heuristic cross-referenced against CI configuration, not a single grep. Empty output ("every generator call site has a corresponding exercised integration test") = pass. Severity: **MUST**. Applies: Bazel 7/8/9, all rulesets — this is a repository-rule/module-extension-authoring concern, so it binds shape A (a ruleset publisher) hardest. Settles: M-A-17.
16. **Where generated BUILD content cannot be avoided, centralize the string-building into a small number of named `render_*` helpers rather than open-coding string concatenation per call site, and pipe at least one rendered sample through `buildifier -mode=check` in a unit test.** Rationale: does not eliminate the blind spot in #15, but shrinks it to a handful of tested helpers instead of every repository-rule impl, and catches at least gross syntax errors (unbalanced parens, bad quoting) without needing a live build. Verify: does a test exist that captures a `render_*` helper's output and runs it through `buildifier -mode=check`, asserting a clean exit? Absence of such a test = finding. Severity: **SHOULD**. Applies: Bazel 7/8/9, all rulesets. Settles: M-A-17 (mitigation, not full closure).
17. **Do not treat a `provider()`-based rewrite of a legacy `struct`-returning rule as complete until every consumer's `hasattr(target, 'foo')`/dot-access check is also migrated to `FooInfo in target`/`target[FooInfo]`.** Rationale: the official migration path explicitly supports an interim dual-return state (`struct(legacy_info = ..., providers = [modern_data])`), and stopping there on a Bazel-9-bound codebase leaves the legacy half broken the day the pin moves, with no compile-time signal that any consumer still depends on it. Verify: `grep -n '\.legacy_info\.\|hasattr(.*,' **/*.bzl` for any remaining legacy-provider consumer once a rule claims to have migrated. Empty output = pass. Severity: **SHOULD**. Applies: Bazel 8 (dual-return still legal) transitioning to Bazel 9 (legacy half removed). Settles: M-A-08 (consumer side).
18. **Do not rely on the dict-as-set idiom (`{k: True for k in xs}` / `{}` used purely for membership) as the default choice for local uniqueness needs in new code on Bazel ≥8.1.0.** Rationale: Starlark's native `set()` type (added 8.1.0) exists to replace exactly this idiom, which even Bazel's own official depsets documentation still demonstrates as the go-to workaround. Verify: reading heuristic — a dict literal or comprehension whose values are uniformly `True`/`None` and never read back is a set in disguise; replace with `set(...)`. No mechanical grep is reliable (false positives on genuine dict-shaped data are common). Severity: **CONSIDER** — `--experimental_enable_starlark_set` defaults `true` as of 2026-09-05 but remains tagged `experimental`, so treat as forward-looking guidance, not a retrofit mandate. Applies: Bazel 8.1.0+ only (absent entirely before). Settles: none directly.
19. **Do not describe the statement-position restriction as "Bazel's BUILD dialect" in any shipped rule text; describe it as core Starlark.** Rationale: the restriction is in the language spec's grammar and prose, independent of Bazel, and holds identically in at least one other independent embedding (`starlark-rust`); framing it as Bazel-specific undersells its reach into `.star`/`.scl` files and any other Starlark-embedding tool an agent might touch. Verify: reading heuristic on the shipped rule text itself — does it name "Starlark" as the source of the restriction, not "Bazel's BUILD files"? Severity: **MUST** (a documentation-accuracy rule, not a code check). Applies: all. Settles: M-A-18 (framing).
20. **Do not cite `bazel.build/extending/rules`'s "Migrating from legacy providers" section as evidence that the legacy struct style still works, without independently checking the current release notes for the Bazel major in question.** Rationale: as of 2026-09-05 that page contains zero mention of Bazel 9 or of the syntax's removal, despite the 9.0.0 release notes stating flatly that it is gone; a prose docs page is not automatically current (this map's conflict 8). Verify: reading heuristic — before repeating any "for the moment, X is still supported" claim from a `bazel.build` prose page, cross-check the release notes for every Bazel major the target CI matrix runs. Severity: **MUST** (a sourcing-discipline rule for whoever authors or maintains the shipped rule text). Applies: all. Settles: M-A-08 (docs-staleness angle).

## Fleet evidence

- **M-A-18 (top-level `if`/`for`/`while`):** `rules_ocx` itself has zero violations (its own `.bzl` corpus never trips this). The trap is proven live in the sibling repo `ocx-contrib`, whose `create-mirror` skill runs real Bazel-dialect Starlark (`starlark-rust`) for package smoke tests and has shipped both a top-level `for` and, later, a top-level `if` — [`ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md:13-32`](/home/mherwig/dev/ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md). `rules_ocx`'s clean record does not mean the trap is inert for the fleet — it means the one place currently authoring dialect Starlark by hand (`ocx-contrib`) is exactly where it has bitten.
- **M-A-06 / M-A-05 (`.to_list()` and overly-nested-depset):** Not observable — `rules_ocx` has 0 `rule()` declarations in production ([`bazel-audit/starlark-code-shape.md`, Headline numbers](../bazel-audit/starlark-code-shape.md)), so there is no rule-implementation code in the fleet to exhibit either shape. These rules are grounded entirely on upstream sources for this fleet, as flagged in the frame's Wave-1 correction 7.
- **M-A-07 (dict/set order leaking via depset default order):** Same absence — no fleet `.bzl` constructs a depset with `order=` at all (0 `rule()` declarations means 0 depset-consuming actions to exhibit the trap). Upstream-grounded.
- **M-A-08 / M-A-09 (legacy struct providers / provider-params):** `bazel-audit/starlark-code-shape.md`'s headline numbers confirm 0 `provider()` calls and 0 legacy-struct-provider returns anywhere in `rules_ocx` — the repo is simply too thin on rule-authoring surface to have an opinion either way. The rule ships upstream-grounded, not fleet-validated.
- **M-A-19 (`analysistest`/`expect_failure` vacuous pass):** Directly fleet-sourced. `rules_ocx/.claude/rules/starlark.md:34-39` documents the trap in prose but — per [`bazel-audit/config-inventory.md` #45](../bazel-audit/config-inventory.md) — carries **no re-runnable verification** in the fleet today; it is asserted, not checked. `bazel-audit/starlark-code-shape.md` §4 independently confirms the underlying risk surface is real: only 2 `analysistest.make()` calls exist in the entire repo (`ocx/tests/launcher_test.bzl:1169,1299`), both against hand-written test fixtures, and **none** of the 4 production repository-rule `_impl` functions is wrapped in `analysistest.make()` at all — so the fleet's actual exposure to this trap, should it start testing those impls with `expect_failure`, is currently zero only because the coverage itself is zero (see Smells §1 of the same audit).
- **M-A-17 (generated BUILD content as a string):** Directly fleet-sourced, four confirmed sites: `download.bzl:17-26` (static template), `project.bzl:124-127,228-230`, `package.bzl:284-295` (string-joined), `package.bzl:367-406` (line-by-line `select()`-emitting hub) — [`rules_ocx/ocx/private/{download,project,package}.bzl`](/home/mherwig/dev/rules_ocx/ocx/private/). Per [`bazel-audit/starlark-code-shape.md`, Smells §3](../bazel-audit/starlark-code-shape.md), these are covered only by the live-registry `examples/*` integration tests and two dogfood `sh_test` targets — no unit-level validation of the generated Starlark text exists, matching guidance candidate #15's verification exactly (an exercised integration test exists per site today, but nothing *requires* one for a future fifth site).
- **Deprecated runfiles APIs, `depset-union`, `assert`:** Not observable in `rules_ocx` — the repo has 0 `rule()` declarations and therefore no runfiles-merging or command-line-building code to exhibit any of these. All grounded on upstream sources for this fleet.

## AI-agent angle

- **Writing `struct(my_field = ...)` as a rule's return value, copied from a still-live-looking `bazel.build` docs example.** The official "Migrating from legacy providers" section on `bazel.build/extending/rules` still presents this as working "for the moment," with zero mention of Bazel 9's removal. An agent trained on or reading that page verbatim will write code that builds fine on Bazel 8 and fails outright on Bazel 9. Smallest check: `grep -n 'return struct(' **/*.bzl` in any rule implementation file, then confirm every hit is either genuinely rule-local (fine) or actually returning provider-shaped fields as a legacy provider (a MUST-fix); pair with the buildifier `rule-impl-return` warning as the mechanical backstop.
- **Merging depsets with `depset1 + depset2` or `depset1 | depset2`.** These read as natural Python/Starlark set algebra and appear throughout older training-data-era Bazel code; they still load and execute today (deprecated, not yet removed), so nothing crashes — the mistake is invisible until a lint runs. Smallest check: buildifier warning `depset-union`, or a direct grep `grep -nE 'depset\s*[+|]\s*depset|\.union\(' **/*.bzl`.
- **Using `ctx.runfiles(collect_data=True)` because it "sounds like" the right modern parameter name.** Superficially plausible-looking API (it exists, it's documented, it's on the same object as the correct modern parameters), but it is exactly the legacy mode the official docs say to avoid, and no lint exists to catch it — an agent has to already know to avoid it, or grep for it deliberately. Smallest check: `grep -n 'collect_data\|collect_default' **/*.bzl`.
- **Writing a top-level `if` to conditionally define a target or a `for` to generate several targets in a macro file, copying a pattern that looks like ordinary Python module-level code.** This is the single sharpest "loads in one dialect, breaks in another, or breaks even in the same dialect if the file is later loaded as a genuine BUILD/`.bzl` file" mistake, and it fails at *parse* time, which an agent may misdiagnose as an unrelated syntax problem elsewhere in the file (the reported error location is often the `if`/`for` line itself, but an agent unfamiliar with the restriction may "fix" it by restructuring nearby code instead of wrapping the block in a `def`). Smallest check: the exact starlark-rust/Bazel error text is distinctive — `` `if` cannot be used outside `def` in this dialect `` / `` `for` cannot be used outside `def` in this dialect `` — grep the build log for that string before attempting any other fix.
- **Assuming a `expect_failure` test that currently passes is proof the guard works**, and therefore never running the guard-removed regression drill. This is not a "wrong API" mistake but a "trusted the wrong signal" mistake, and it is specifically dangerous for an agent operating without a human in the loop, because a green test suite is exactly the evidence an autonomous agent is designed to trust. Smallest check: for any `analysistest` test built with `expect_failure = True`, require (in the PR/commit description or a companion comment) a note that the test was observed red with the guard removed — absence of that note is itself the finding, since there is no way to check it after the fact from the test file alone.
- **Building BUILD-file content as a Starlark string inside a repository rule and assuming `buildifier`/`stardoc`/CI's BUILD-lint job covers it because "it's Bazel-adjacent code."** An agent extending a repository rule to add a new generated attribute will naturally reach for more string concatenation, matching the existing style, without realizing none of the existing static tooling — including whatever gate it just ran to check its own diff — looked inside the string at all. Smallest check: after editing any `render_*`/`ctx.file("BUILD...", ...)` call site, confirm the corresponding example/e2e target still builds (not just that unit tests pass), since unit tests in this fleet do not exercise the generated BUILD text either.

## Contested / evolving

- **Whether `set()` is "the" replacement for the dict-as-set idiom is not yet settled in practice.** The type was added in Bazel 8.1.0 and is on by default as of 2026-09-05, but its own controlling flag (`--experimental_enable_starlark_set`) is still tagged `experimental` in the current command-line reference, and even Bazel's own canonical `extending/depsets` documentation page still demonstrates the pre-`set()` dict idiom as the reference pattern for simulating a set. Trending: toward `set()` becoming unremarkable, but not there yet — treat as CONSIDER, not MUST, until the flag graduates out of `experimental`.
- **Whether the legacy-struct-provider migration doc page will be updated before Bazel 9's EOL-adjacent maintenance window.** As of this research date, `bazel.build/extending/rules`'s "Migrating from legacy providers" section is silently wrong for any Bazel-9-targeting reader; whether upstream treats this as a docs bug worth a dedicated fix, or leaves it as background rot behind the more prominent `[Incompatible]` release-note callout, is unknown. Any rule citing that page for current behavior should re-check it at each refresh, not assume it has been fixed.
- **How aggressively to treat the deprecated-runfiles-API grep (`collect_data`/`collect_default`/`data_runfiles`) as a gate versus a backlog item.** No `--incompatible_*` flag exists, so there is no forcing function analogous to the struct-provider removal; whether these APIs get removed outright in some future major or remain permanently-deprecated-but-legal is not stated anywhere in the sources this dive found. Treat the MUST/SHOULD split in guidance candidates #11–#12 (MUST for new code, SHOULD for existing) as the pragmatic default until upstream signals otherwise.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/bazelbuild/starlark/blob/master/spec.md](https://github.com/bazelbuild/starlark/blob/master/spec.md) | The Starlark language specification (normative) | Living doc, fetched 2026-09-05 | The only normative source for the statement-position rule, dict/set ordering, and the reserved-but-unimplemented keyword list; settles that these are language facts, not Bazel-specific ones |
| [bazel.build/rules/performance](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/performance.md) (source) | Bazel's own rule-performance guide | Current as of fetch, 2026-09-05 | Primary source for `.to_list()` O(N²) cost, the overly-nested-depset anti-pattern, and `ctx.actions.args()` as the fix |
| [bazel.build/extending/depsets](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/depsets.md) (source) | Bazel's depset conceptual guide | Current as of fetch, 2026-09-05 | Primary source for the three named traversal orders and the exact "deterministic but not stable" guarantee of `default` order |
| [bazel.build/extending/rules](https://github.com/bazelbuild/bazel/blob/master/site/en/extending/rules.md) (source) | Bazel's rule-authoring reference | Current as of fetch, 2026-09-05; contains a stale (pre-Bazel-9) section, dated in Findings §6 | Primary source for the action purity contract, the deprecated runfiles API list, and the legacy-struct-provider migration guide (whose own staleness is itself a finding) |
| [bazel.build/rules/testing](https://github.com/bazelbuild/bazel/blob/master/site/en/rules/testing.md) (source) | Bazel's `analysistest`/`unittest` guide | Current as of fetch, 2026-09-05 | Primary source for the official `expect_failure` usage pattern this dive shows is trivially defeated |
| [buildtools/WARNINGS.md](https://github.com/bazelbuild/buildtools/blob/master/WARNINGS.md) | buildifier's full warning catalogue | Current as of fetch, 2026-09-05 | Codified source for exact category names, autofix status, and `--incompatible_*` cross-references for `overly-nested-depset`, `rule-impl-return`, `provider-params`, `depset-union`, `depset-iteration` |
| [bazel-skylib/lib/unittest.bzl](https://github.com/bazelbuild/bazel-skylib/blob/main/lib/unittest.bzl) | `bazel-skylib`'s testing framework source | Current as of fetch, 2026-09-05 | The only source that reveals `_expect_failure`'s substring-match implementation (`str.find`), which is the mechanism behind the vacuous-pass trap |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | Official GitHub release notes | Published with the 8.0.0 release | Normative source that `--incompatible_disallow_struct_provider_syntax` was still un-flipped (opt-in) as of Bazel 8's initial release |
| [Bazel 8.1.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.1.0) | Official GitHub release notes | Published with the 8.1.0 release | Normative source for the Starlark `set()` type's introduction |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Official GitHub release notes | Published with the 9.0.0 release (2026-01-20 per the frame) | Normative source that legacy struct providers are fully removed and the incompatible flag is a permanent no-op |
| [starlark-rust: `top_level_statements.golden`](https://github.com/facebook/starlark-rust/blob/main/starlark_syntax/src/syntax/grammar_tests/top_level_statements.golden) | Parser conformance test fixture, an independent Starlark implementation | Current as of fetch, 2026-09-05 | Corroborates the statement-position rule from a second, independent implementation with the exact error wording the fleet's own doc quotes |
| [src/tools/execlog/README.md](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md) | Bazel's own execution-log parser tool docs | Current as of fetch, 2026-09-05 | Gives the exact command line for diffing two builds' action arguments — the verification for the dict/set/depset-order-leak trap |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Bazel CLI flag reference (live page) | Live, fetched 2026-09-05 | Confirmed `--experimental_enable_starlark_set` default (`true`) and tag (`experimental`), and confirmed no `--incompatible_*` flag exists for the deprecated runfiles APIs |
| [`rules_ocx/.claude/rules/starlark.md`](/home/mherwig/dev/rules_ocx/.claude/rules/starlark.md) | Fleet rule file | 2026, current at time of research | Sole documented source anywhere (fleet or upstream) for the `analysistest`/`expect_failure` vacuous-pass trap |
| [`ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md`](/home/mherwig/dev/ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md) | Fleet skill reference for a `starlark-rust`-embedded dialect | 2026, current at time of research | Independent-implementation confirmation of the statement-position rule, plus the two named legal workarounds, verified against a real (non-Bazel-core) Starlark engine |
| [`rules_ocx/ocx/private/{download,project,package}.bzl`](/home/mherwig/dev/rules_ocx/ocx/private/) | Fleet source code | 2026, current at time of research | The four confirmed generated-BUILD-as-string sites this dive cites verbatim |
| [`bazel-audit/starlark-code-shape.md`](../bazel-audit/starlark-code-shape.md) | Wave-1 grounding audit of `rules_ocx`'s Starlark corpus | 2026-09-05 | Measured evidence for the fleet-evidence section: headline counts (0 `rule()`, 0 `provider()`), the analysistest coverage gap, and the Smells §3 characterization of the generated-BUILD blind spot |
| [`bazel-topic-map.md`](../bazel-topic-map.md) | Wave-1/2 topic map for the whole Bazel research program | 2026-09-05 | Source of the M-A-nn row definitions this dive settles, and Conflict 8's operational rule (a `bazel.build` prose page is not automatically current) applied directly in Finding 6 |
