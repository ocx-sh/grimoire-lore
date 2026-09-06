---
title: "Macros, rules, and symbolic macros — the decision procedure and the porting traps"
topic: macros-rules-and-symbolic-macros
group: bazel-starlark-and-build
family: BZL-LARK
agent: bazel-wave2-macros-rules-symbolic-macros
model: sonnet
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 10
settles: [M-A-10, M-A-11, M-A-12, M-A-13, M-A-14, M-A-15]
scope: >
  Covers the choice between rule(), symbolic macro, and legacy macro; the
  symbolic-macro naming schema, frozen-kwargs and select-configurability
  traps; inherit_attrs and its Bazel-version floor; lazy evaluation's shipped
  status; and the positional-args migration blocker. Does not cover buildifier's
  full warning catalogue (see buildifier-taxonomy-and-style.md), provider-style
  hygiene (rule-impl-return, provider-params — also that dive), or
  Starlark-dialect determinism traps (see starlark-dialect-and-determinism-traps.md).
  Grounded entirely on upstream sources: rules_ocx has zero rule() declarations
  in production and zero macro() calls anywhere (verified below).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Default to a **symbolic macro** for any new macro on Bazel 8+; reach for a
  **legacy macro** only when the body needs `glob()`, an untyped parameter, or
  `native.existing_rules()` outside a finalizer — those three are hard blockers,
  not preferences ([macros.md](https://bazel.build/extending/macros)).
- Reach for a **real `rule()`**, not a macro of either kind, whenever the logic
  must register a Bazel action or return a custom provider — macros only compose
  existing rule calls at the loading phase and cannot do either
  ([rules.md](https://bazel.build/extending/rules)).
- **Lazy evaluation — symbolic macros' headline performance promise — is still
  unshipped as of 2026-09-05.** The live `macros.md` page states it plainly:
  "We are in the process of implementing lazy macro expansion and evaluation.
  This feature is not available yet." A rule that recommends switching to
  symbolic macros *for performance* is wrong today.
- A symbolic macro's created targets **must** equal the macro's own `name` or
  start with it followed by `_`, `.`, or `-`; a violating target can be
  declared but never built or depended on
  ([macros.md §Naming conventions](https://bazel.build/extending/macros#naming)).
- All macro arguments arrive **frozen**: `kwargs["env"]["some"] = "more"`
  throws `Error: trying to mutate a frozen dict value`
  ([Tweag, 2025-11-20](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
  Rebuild with `dict(env)` instead of mutating in place.
- Attributes are **configurable by default** — a plain list value arrives
  wrapped as `select({"//conditions:default": [...]})`. `.append()` on it
  fails with `Error: 'select' value has no field or method 'append'`, but
  `+=` succeeds because `select` supports in-place extension
  ([Tweag, 2025-11-20](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
- To read a `select()`-wrapped value at macro-evaluation time, wrap it in an
  `alias()` target and declare the macro's attribute
  `attr.label(configurable = False)` — resolution then happens before the
  macro sees it ([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
- **`inherit_attrs` is available in Bazel 8.0.0, not a Bazel-9-only feature**
  — despite the 9.0.0 GitHub release notes listing "Added `inherit_attrs`
  param to `macro()`" under that release, the versioned docs fetched at the
  `8.0.0` git tag already document and demonstrate it (verified below; see
  Findings §5 for why the release notes are misleading here).
- Every non-mandatory attribute pulled in via `inherit_attrs` defaults to
  `None`, **not** the wrapped rule's real default — `target_compatible_with`
  defaults to `[]` on the rule but to `None` on the inheriting macro, so a
  bare `if not kwargs["x"]` check silently treats "unset" and "explicitly
  empty" the same way ([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/); [macros.md](https://bazel.build/extending/macros#attribute-inheritance)).
  Default values written into the macro implementation's own function
  signature are silently ignored for inherited attrs — declare defaults in
  `attrs`, not in the `def` line.
  Full-inheritance requires `**kwargs` and does not exist before Bazel 8.0.0.
- **Starlark computation-step limits are enforced against symbolic-macro
  evaluation only from Bazel 9.0.0 on** (`--max_computation_steps`, default
  `0` = unlimited) — an `[Incompatible]` change in the 9.0.0 release notes
  with no equivalent bullet in any 8.x release, confirmed by source history
  (commit `f23d0a6d`, 2025-05-13, landed after every 8.x branch cut).
- Buildifier's `positional-args` warning is not pure style here: its own
  entry says plainly, "positional arguments prevent migration from Legacy
  Macros to Symbolic Macros" — because a symbolic macro literally rejects
  positional call-site arguments at runtime, it does not merely discourage
  them ([WARNINGS.md](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md)).
  No autofix exists for this warning.
- Visibility inside a symbolic macro defaults to **macro-private**, not the
  package's `default_visibility` — a target the macro creates without an
  explicit `visibility=` is invisible to the macro's caller unless the macro
  forwards its own `visibility` parameter (`some_rule(..., visibility =
  visibility)`) ([macros.md §Visibility and macros](https://bazel.build/extending/macros#visibility)).
- Symbolic macros may **not**: call `glob()`, call `native.existing_rules()`
  (except finalizers), call `native.package()` or
  `native.environment_group()`, return a value, or mutate an argument
  ([macros.md §Restrictions](https://bazel.build/extending/macros#restrictions)).
- A **rule finalizer** (`macro(finalizer = True, ...)`) is the symbolic-macro
  replacement for a legacy macro that calls `native.existing_rules()` — it
  runs after all non-finalizer targets in the package are defined and can see
  the rule set the rest of the package built ([macros.md §Finalizers](https://bazel.build/extending/macros#finalizers)).
- `bazel query --output=build 'attr(generator_function, <macro>,
  //...)'` finds every target instantiated by a **legacy** macro; finding a
  **symbolic** macro is "trivial" by contrast — just grep `.bzl` files for
  `macro()` calls ([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/); [legacy-macros.md](https://bazel.build/extending/legacy-macros#debugging)).
- `bazel.build/rules/bzl-style` states the general preference bluntly: "In
  general, use rules whenever possible instead of macros," because macros
  expand before Bazel's build-graph analysis and break aspect-based tooling
  (IDEs) that never sees macro internals.
- Legacy macros are not deprecated and are not going away: the Tweag post's
  own closing advice is that legacy and symbolic macros can be composed
  during a transition, and some codebases may reasonably never migrate.
- `rules_ocx` settles nothing here empirically — it has **zero** `macro()`
  calls anywhere and **zero** `rule()` declarations in production code (three
  `rule()` calls exist, but all three are test-fixture or example code:
  `ocx/tests/launcher_test.bzl:1148`, `:1292`, `examples/cross_platform/transition.bzl:18`).
  This dive is grounded entirely on upstream sources.

## Findings

### 1. The three-way decision test: rule(), symbolic macro, or legacy macro

Bazel's own rule-authoring guide draws the line at what the implementation
function is *allowed to do*, not at style preference. A rule's implementation
function "transform[s] the graph of targets generated in the loading phase
into a graph of actions" and can register [actions](https://bazel.build/extending/rules#actions)
and return custom [providers](https://bazel.build/extending/rules#providers).
A macro — legacy or symbolic — is "a function called from the `BUILD` file
that can instantiate rules" ([macros.md](https://bazel.build/extending/macros))
and never itself runs an action or emits a provider; it only composes calls
to existing rules during the loading phase.

**Decision test:**

| Need | Answer |
|---|---|
| Must run an external tool, or emit a custom provider consumed by another rule | `rule()` — no macro can do this |
| Wraps/parameterizes existing rule calls, needs typed attrs, `select()` support, or visibility encapsulation | Symbolic macro (Bazel 8+) |
| Needs `glob()`, an untyped parameter, or `native.existing_rules()` outside a finalizer | Legacy macro (or a legacy wrapper around a nested symbolic macro) |

`bzl-style.md` states the rule-over-macro preference explicitly: "In general,
use rules whenever possible instead of macros. The build graph seen by the
user is not the same as the one used by Bazel during the build - macros are
expanded *before* Bazel does any build graph analysis," and "aspects are not
aware of macros, so tooling depending on aspects (IDEs and others) might
fail." ([bzl-style.md](https://bazel.build/rules/bzl-style#macros)) Settles
**M-A-10**.

### 2. Symbolic macros: what they are, what changed in Bazel 8 and 9

Symbolic macros became "available by default in Bazel 8"
([macros.md](https://bazel.build/extending/macros)); the Bazel 8.0.0 GitHub
release notes describe them as offering typed attributes with "similar type
conversions" to rule attributes, automatic promotion of configurable-attribute
values to `select()` expressions, argument-mutation protection, macro-scoped
visibility, and finalizer macros as the `native.existing_rules()` replacement
— explicitly noting they are "compatible with lazy evaluation (not
implemented yet)" ([8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0)).

Bazel 9.0.0 changed two things specific to symbolic macros, both under an
explicit "Symbolic macros:" bullet in its own release notes
([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)):

```text
* Symbolic macros:
  * [Incompatible] Starlark computation step limits are now enforced for symbolic macros.
  * Added `inherit_attrs` param to `macro()` to allow symbolic macros to inherit
    attributes from rules or other symbolic macros.
  * Set `generator_name`, `generator_function`, `generator_location`, and the
    full Starlark stack for rule targets instantiated in a symbolic macro.
```

The second bullet is misleading taken at face value — see §5 below,
`inherit_attrs` is actually an 8.0.0 feature. The first bullet is real and
verified independently (§4).

### 3. The naming schema, and what happens on a violation

"The names of any targets or submacros created by a symbolic macro must
either match the macro's `name` parameter or must be prefixed by `name`
followed by `_` (preferred), `.` or `-`." A `my_macro(name = "foo")` may only
create `foo`, or names prefixed `foo_`, `foo-`, `foo.` ([macros.md
§Naming conventions](https://bazel.build/extending/macros#naming)).

Tweag reproduces the exact failure for a macro named `tool` that calls
`native.genrule(name = "genrule" + name, ...)`, producing `genruletool`:

```text
ERROR: in genrule rule //src:genruletool: Target //src:genruletool declared in
symbolic macro 'tool' violates macro naming rules and cannot be built.
```

The fix is `tool_genrule`, not `genruletool`
([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
Per `macros.md` itself, a violating target "can be declared, but cannot be
built and cannot be used as dependencies" — it is a hard, load-visible defect,
not merely a warning. Settles **M-A-11**.

### 4. Frozen kwargs, configurable-by-default attributes, and the alias workaround

Two distinct failure modes, both demonstrated verbatim by Tweag with exact
Bazel error text:

**Frozen kwargs.** All arguments a symbolic macro receives — including
dict-typed attribute values passed through `**kwargs` — are frozen. Code that
worked in a legacy macro fails outright in a symbolic one:

```starlark
# Legacy macro — this works
def special_test_legacy(name, **kwargs):
    kwargs["env"]["some"] = "more"
    cc_test(**kwargs)
```

```starlark
# Symbolic macro — this throws
def _simple_macro_impl(name, visibility, **kwargs):
    kwargs["env"]["some"] = "more"
    # Error: trying to mutate a frozen dict value
```

The fix is to copy first: `env = dict(kwargs["env"]); env["some"] = "more"`.

**Configurable-by-default `.append()`.** Any attribute not explicitly marked
`configurable = False` arrives wrapped in a trivial `select()` even when the
caller passed a plain list — `deps = ["//a"]` becomes
`select({"//conditions:default": ["//a"]})` inside the implementation
function ([macros.md §Selects](https://bazel.build/extending/macros#selects)).
Calling `.append()` on that value fails:

```text
Error: 'select' value has no field or method 'append'
```

`select` *does* support in-place extension via `+=`, so
`kwargs["deps"] += ["//:commons"]` works where `.append()` does not
([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
The other escape hatch is declaring the attribute `attr.label_list(configurable
= False)`, which rejects a `select()` value from the caller entirely rather
than wrapping a plain one.

**The alias workaround for early resolution.** When a macro genuinely needs
the *resolved* value of a `select()` at macro-evaluation time (not analysis
time), wrap the `select()` in an `alias()` target in the BUILD file and
declare the macro's corresponding attribute as a non-configurable label:

```starlark
# BUILD.bazel
alias(
    name = "configpath",
    actual = select({
        "//conditions:default": "deploy/config/dev.ini",
        "//:production": "deploy/config/production.ini",
    }),
    visibility = ["//visibility:public"],
)

deployment(name = "deploy", filepath = ":configpath")
```

```starlark
# defs.bzl
deployment = macro(
    attrs = {"filepath": attr.label(configurable = False)},
    implementation = _deployment_impl,
)
```

The macro's `filepath` parameter then receives a resolved `Label`, not an
opaque `select` object ([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/)).
Settles **M-A-12**.

### 5. `inherit_attrs`: available since Bazel 8.0.0 — the release notes bullet is misleading

The brief asks to verify `inherit_attrs` and dated it to "Bazel 8 and 9." The
Bazel 9.0.0 GitHub release notes list "Added `inherit_attrs` param to
`macro()`" as a 9.0.0 change, which — taken at face value — would mean it is
unavailable on the fleet's pinned Bazel 8.7.0. **That reading is wrong.**

Fetching the versioned documentation at three separate git tags in the
`bazelbuild/bazel` repository (`site/en/extending/macros.md`) shows
`inherit_attrs` documented, with the exact `native.cc_library` example, at
every one of them:

```
$ grep -n inherit_attrs macros-8.0.0.md macros-8.7.0.md macros-9.0.0.md
macros-8.0.0.md:71:`inherit_attrs` argument. ...
macros-8.7.0.md:71:`inherit_attrs` argument. ...
macros-9.0.0.md:73:`inherit_attrs` argument. ...
```

Independently, [PR #24280](https://github.com/bazelbuild/bazel/pull/24280),
titled "[8.0.0] Symbolic macro attribute inheritance," merged into the
`release-8.0.0` branch on 2024-11-11 — nearly a month before Bazel 8.0.0's
2024-12-09 GA — and carries the identical `RELNOTES` text that later
resurfaced verbatim under the 9.0.0 bullet: "Add `inherit_attrs` param to
`macro()` to allow symbolic macros to inherit attributes from rules or other
symbolic macros." The feature shipped in 8.0.0; the 9.0.0 release-notes
bucket re-lists it, most plausibly an artifact of Bazel's RELNOTES
aggregation tooling rather than a real re-introduction.

**Consequence for a rule set:** never cite a Bazel GitHub release-notes
bullet alone as a feature's version floor. Cross-check the versioned
reference docs at the specific git tag (`raw.githubusercontent.com/bazelbuild/bazel/<tag>/site/en/...`)
before naming a Bazel major as the floor. This is the same lesson [the map's
Conflict 8](../bazel-topic-map.md) draws about `remote/ci` staleness, from
the opposite direction: here the *release notes*, not the prose docs, were
the misleading source.

Once inherited, every non-mandatory attribute's default is unconditionally
overridden to `None`, "regardless of the original attribute definition's
default value" ([macros.md §Attribute inheritance](https://bazel.build/extending/macros#attribute-inheritance)).
Tweag's concrete illustration: `target_compatible_with` defaults to `[]` on
the wrapped rule but to `None` inside the inheriting macro, so
`if not kwargs["target_compatible_with"]` is `True` for both "caller passed
nothing" and "caller passed `[]`" — a distinction the macro author usually
needs and silently loses. `inherit_attrs` also requires the implementation
function to carry a `**kwargs` residual parameter; without it Bazel refuses
to inherit anything ([macros.md](https://bazel.build/extending/macros#attributes)).
Settles **M-A-13**.

### 6. Lazy evaluation: still unshipped as of 2026-09-05 — say so flatly

The live `macros.md` page (fetched 2026-09-05) is unambiguous:

> "IMPORTANT: We are in the process of implementing lazy macro expansion and
> evaluation. This feature is not available yet.
>
> Currently, all macros are evaluated as soon as the BUILD file is loaded,
> which can negatively impact performance for targets in packages that also
> have costly unrelated macros. In the future, non-finalizer symbolic macros
> will only be evaluated if they're required for the build."
> ([macros.md §Laziness](https://bazel.build/extending/macros#laziness))

The Tweag post, dated 2025-11-20 — the single most recent primary-adjacent
source in the whole wave-1 corpus — independently confirms the same status:
"Symbolic macros also intend to support lazy evaluation, a feature that is
currently being considered for a future Bazel release."
([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/))
Neither Bazel 9.0.0, 9.1.0, nor 9.2.0's release notes mention shipping it
(checked directly — no "macro" bullet appears in either 9.1.0 or 9.2.0's
notes at all). **A rule that recommends symbolic macros for a performance
win is wrong as of 2026-09-05 and must be dated if the claim is ever revived.**
The performance case for symbolic macros today rests only on avoiding
unconditional macro-body evaluation cost that legacy macros already pay
identically — not on anything Bazel 8 or 9 actually changed. Settles
**M-A-14**.

### 7. `positional-args`: a style warning that is also a migration blocker

Buildifier's own catalogue entry for `positional-args` does not frame this as
a pure style nit:

> "All macro and rule calls should use keyword args over positional
> arguments. Positional arguments can cause subtle errors if the order is
> switched or if an argument is removed. Keyword args also greatly improve
> readability. Additionally, **positional arguments prevent migration from
> Legacy Macros to Symbolic Macros.**"
> ([WARNINGS.md](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md), category `positional-args`, no automatic fix)

This is not rhetorical: a symbolic macro rejects positional call-site
arguments at the interpreter level, not merely by convention. Tweag
demonstrates the exact runtime error when a caller passes a second positional
argument to a macro whose signature only declares one positional slot before
its keyword-only marker:

```text
# Error: special_test_legacy() accepts no more than 1 positional argument but got 2
special_test_legacy("with-tag", "manual")
```

and states plainly: "Positional arguments are not supported in symbolic
macros as attributes must either be declared in the `attrs` dictionary
(which would make it automatically a keyword argument) or be inherited in
which case it should also be provided by name."
([Tweag](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/))
Buildifier's `positional-args` warning has **no automatic fix**
([WARNINGS.md](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md)),
so every call site must be hand-converted to keyword args before the macro
definition itself can become symbolic. `bzl-style.md` independently states
the same call-site convention without naming the migration link: "When
calling a macro, use only keyword arguments" ([bzl-style.md](https://bazel.build/rules/bzl-style#macros)).
Settles **M-A-15**.

### 8. Starlark computation-step limits: Bazel-9-only enforcement, verified two ways

The brief asks specifically about "the Bazel 9 change that started enforcing
Starlark computation-step limits inside symbolic macros." The 9.0.0 release
notes list it as an `[Incompatible]` bullet under "Symbolic macros:" with no
further detail. Two independent checks confirm it is genuinely new to 9.0.0
and not a stale or backported claim:

1. **No equivalent bullet exists in any 8.x release.** Every 8.x point
   release from 8.1.0 through 8.8.0 (the current Maintenance release) was
   checked directly against the GitHub releases API; none mentions
   computation-step limits or macros in this context.
2. **The implementing commit postdates every 8.x branch cut.** Commit
   `f23d0a6d` ("Enforce Starlark computation step limits in symbolic
   macros," 2025-05-13) carries `RELNOTES[INC]: Starlark computation step
   limits are now enforced for symbolic macros" — the same text that
   appears in the 9.0.0 notes — and lands on Bazel's development trunk well
   after the `release-8.0.0` branch was already cut and shipping (8.0.0 GA
   2024-12-09; 8.7.0 GA 2026-05-07).

The governing flag is `--max_computation_steps`, type "a long integer",
**default `0` (zero means no limit)**, tagged `build_file_semantics`
([command-line reference](https://bazel.build/reference/command-line-reference)).
Practically: this change only bites a repository that has *already* set
`--max_computation_steps` to a nonzero value — before Bazel 9, a package's
step budget covered only the BUILD file thread itself; from 9.0.0 on, the
same budget also covers Starlark work performed inside that package's
symbolic-macro expansion. A macro-heavy package that passed comfortably
under Bazel 8 with a tight budget set can start failing purely from the
upgrade, with no change to its own code.

## Decisions

**Decision 1 — the default for new code.** New macro code targeting Bazel 8+
defaults to a **symbolic macro**. Evidence: `macros.md` states symbolic
macros are "available by default in Bazel 8" and legacy macros' own doc page
opens with "Where possible you should use symbolic macros"
([legacy-macros.md](https://bazel.build/extending/legacy-macros#no-legacy-macros)).
Assumption: the codebase's floor is Bazel 8.0.0 or later — a repo still
supporting Bazel 7 cannot make this the default (symbolic macros require 8+).

**Decision 2 — trigger conditions for converting an existing legacy macro.**
Convert when the macro exhibits any of: (a) a genuine visibility leak — an
implementation-detail target the macro creates is reachable by a caller that
should not see it, because legacy macros are "entirely transparent to the
visibility system" ([macros.md §Visibility and macros](https://bazel.build/extending/macros#visibility));
(b) a real need for typed, auto-converting attributes (label/select
conversion) rather than raw strings passed through `**kwargs`; (c) a caller
that already passes a `select()`-wrapped value and needs it validated rather
than silently mishandled. **Do not** convert chasing a performance win — see
Decision 3. Evidence: `macros.md` §Restrictions and §Visibility, Tweag's
gotcha list. Assumption: the macro's callers do not rely on positional
arguments, `glob()`, or an untyped parameter — if they do, buildifier's
`positional-args` finding (§7) or the migration-troubleshooting glob
workaround (Findings, `macros.md` §Migration troubleshooting) is a
prerequisite step, not a blocker to abandon the migration over.

**Decision 3 — the shipped rule does NOT recommend symbolic macros for
performance.** Evidence: lazy evaluation is unshipped as of 2026-09-05 on
both the live docs and the most recent primary-adjacent source (Tweag,
2025-11-20); no 9.0.0/9.1.0/9.2.0 release note claims otherwise. Assumption:
this is a snapshot, not a permanent verdict — the moment Bazel's release
notes announce lazy evaluation shipping, this decision must be revisited and
the rule's severity/wording updated, dated to that release.

**Decision 4 — legacy macro retained, by named exception only.** A legacy
macro remains correct when the body needs `glob()`, an untyped parameter (a
Starlark value with no corresponding `attr.*()` type), or must call
`native.existing_rules()` outside a `finalizer = True` macro. Evidence:
`macros.md` §Restrictions lists exactly these as things a symbolic macro
"may not" do; §Migration troubleshooting gives the standard workaround
(`glob()` at the BUILD-file call site, or a legacy top-level macro nesting a
symbolic inner macro). Assumption: none of these three needs can itself be
refactored away — if the `glob()` call can move to the BUILD file that calls
the macro, that is preferred over keeping the whole macro legacy.

**Decision 5 — rule() versus macro is not a style choice.** A macro (either
kind) that finds itself needing to register an action or emit a provider is
not a candidate for "just add more macro logic" — it needs a `rule()`.
Evidence: `rules.md`'s own framing of the implementation function's role;
`bzl-style.md`'s "use rules whenever possible instead of macros." Assumption:
none — this is a structural fact about what a macro implementation function
can do, not a preference.

**Note on grounding.** `rules_ocx` has zero `macro()` calls and zero
production `rule()` declarations (Findings intro; Fleet evidence below), so
every decision above rests entirely on the upstream sources named, never on
fleet behavior.

## Normative guidance candidates

1. **A new macro on Bazel 8+ MUST be written as a symbolic macro (`macro()`),
   not a legacy Starlark function, unless it needs `glob()`, an untyped
   parameter, or `native.existing_rules()` outside a finalizer.**
   Rationale: legacy macros are "entirely transparent to the visibility
   system" and allow silent argument mutation that symbolic macros forbid by
   design — porting later is strictly harder than starting symbolic.
   Verify: reading heuristic — does the macro body call `glob()`, accept a
   parameter with no corresponding `attr.*()` type, or need
   `native.existing_rules()` outside `finalizer = True`? If none apply and
   the definition is still a plain `def foo(name, ...):`, it should be a
   `macro()` call instead. Empty output (no such def-style macros found) =
   pass. Severity: SHOULD (a judgment call on "needs" a human/reviewer makes,
   not a pure grep). Bazel 8+, all rulesets. Settles M-A-10.

2. **A macro implementation MUST NOT be asked to register an action or
   return a custom provider; that logic belongs in a `rule()`.**
   Rationale: neither legacy nor symbolic macro implementation functions can
   call `ctx.actions.*` or return `provider()` instances — this is a hard
   Starlark-API boundary, not a style violation.
   Verify: grep macro `.bzl` files (functions passed to `macro(implementation
   = ...)` or legacy `def`s called from BUILD) for `ctx.actions.` or
   `provider(` — a macro implementation function never receives a `ctx`
   parameter at all (its parameters are one per declared attribute), so any
   `ctx.actions` reference inside one is a structural error already caught
   at load time, not a lint finding. Empty output (no `ctx.actions` inside a
   macro impl) = pass. Severity: MUST. Bazel all, all rulesets. Settles
   M-A-10.

3. **Every target or file a symbolic macro creates MUST have a name equal to
   the macro's `name` or prefixed by `name` + one of `_`, `.`, `-`.**
   Rationale: a violating target "can be declared, but cannot be built and
   cannot be used as dependencies" — a load-time-adjacent, hard-to-debug
   failure that surfaces only when something tries to depend on the target.
   Verify: `grep -n 'name = ' <macro_impl_body>` and check every literal or
   computed target name against the macro's `name` parameter; or build the
   suspect target directly (`bazel build //pkg:suspected_bad_name`) and read
   for `violates macro naming rules`. Empty output (no name construction that
   skips the `name` prefix) = pass. Severity: MUST. Bazel 8+. Settles M-A-11.

4. **A symbolic macro implementation MUST NOT mutate a `kwargs` dict value or
   any object it receives as an argument (`x[k] = v`, `x.append(...)` on a
   received list, dict, or `select`).**
   Rationale: all macro arguments are frozen; this pattern worked silently in
   a legacy macro and throws `Error: trying to mutate a frozen dict value` or
   `'select' value has no field or method 'append'` in a symbolic one.
   Verify: `grep -nE '(kwargs\[[^]]+\]\s*\[[^]]+\]\s*=|kwargs\[[^]]+\]\.append\()'`
   over the macro's `.bzl` file — a positive hit is a candidate defect;
   confirm by running `bazel cquery //pkg:target` and reading for the exact
   frozen-dict or select-append error. Empty output = pass. Severity: MUST.
   Bazel 8+ (symbolic macros only — legacy macros are unaffected and this
   check does not apply to them). Settles M-A-12.

5. **A configurable attribute the macro needs to read or extend in place
   SHOULD use `+=`, never `.append()`, and a macro that truly cannot tolerate
   a `select()` SHOULD declare the attribute `configurable = False` instead
   of working around it downstream.**
   Rationale: `.append()` throws on the default configurable-wrapped value;
   `+=` is the one mutation `select` supports. Marking `configurable = False`
   is the correct fix when the macro genuinely cannot handle per-configuration
   values (e.g. it needs the value at macro-evaluation time), rather than
   scattering resolution workarounds through the implementation.
   Verify: grep the macro's `.bzl` for `.append(` on any parameter not marked
   `configurable = False` in the corresponding `attrs` entry. Empty output =
   pass. Severity: SHOULD. Bazel 8+. Settles M-A-12.

6. **A macro that must read a `select()`-resolved value at macro-evaluation
   time (not analysis time) SHOULD use the alias-plus-`attr.label(configurable
   = False)` pattern, not attempt to inspect the `select` object directly.**
   Rationale: `select` "is an opaque object with limited interactivity" inside
   a macro; inspecting it (indexing, truthiness beyond the documented
   always-`True` caveat) produces silently wrong or crashing code.
   Verify: reading heuristic — does the macro body ever branch on, index into,
   or otherwise inspect a `select()`-typed parameter's contents rather than
   simply forwarding it to a rule call? If so, check whether an `alias()` +
   non-configurable `attr.label()` would resolve it earlier instead. No
   mechanical check exists (CONSIDER). Bazel 8+. Settles M-A-12.

7. **Every attribute a macro pulls in via `inherit_attrs` MUST be handled
   with an explicit `None` branch in the implementation function; a bare
   `if not kwargs["attr"])` MUST NOT be used to distinguish "unset" from
   "explicitly empty."**
   Rationale: `inherit_attrs` overrides every non-mandatory inherited
   attribute's default to `None` "regardless of the original attribute
   definition's default value" — code assuming the wrapped rule's real
   default (e.g. `[]` for `target_compatible_with`) is silently wrong.
   Verify: for each attribute named in `inherit_attrs` and not overridden in
   the macro's own `attrs` dict, grep the implementation function body for a
   read of that parameter and confirm an `or []` / `if x == None` /
   equivalent guard precedes any use. Empty output where a guard is missing =
   pass (i.e. absence of an unguarded read is the passing state — read the
   heuristic as "every inherited-attr read is guarded, or there is no read
   at all"). Severity: MUST. Bazel 8.0.0+ (confirmed available at the 8.0.0
   git tag — do not gate this rule on Bazel 9 despite the 9.0.0 release
   notes' own bullet; see Findings §5). Settles M-A-13.

8. **A macro definition MUST NOT be advertised, in a rule, commit message, or
   PR description, as "converted to symbolic macros for performance"
   without a dated citation that lazy evaluation has shipped.**
   Rationale: lazy macro expansion — the only mechanism that would make
   symbolic macros cheaper than legacy ones at the same call volume — is
   still explicitly unshipped ("This feature is not available yet") on the
   live `macros.md` page as of 2026-09-05, and every 9.x minor to date carries
   no bullet claiming otherwise.
   Verify: `curl -s https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/extending/macros.md
   | grep -A2 'Laziness'` and read for "not available yet" versus a shipped
   description. Non-empty match containing "not available yet" = performance
   claim is still false; a match describing shipped laziness = re-open this
   rule. Severity: MUST (a documentation/marketing-accuracy rule, not a code
   check). Bazel 8, 9 (as of 9.2.0). Settles M-A-14.

9. **Any BUILD-file call site of a macro slated for symbolic conversion MUST
   pass every argument as a keyword, never positionally.**
   Rationale: buildifier's own `positional-args` entry states plainly that
   positional arguments "prevent migration from Legacy Macros to Symbolic
   Macros" — a symbolic macro rejects extra positional arguments at the
   interpreter level with `accepts no more than N positional argument(s) but
   got M`, not merely by convention.
   Verify: buildifier warning `positional-args`
   (`buildifier -lint=warn -warnings=positional-args path/to/BUILD`, or
   `bazel run //:buildifier.check` if the target's warning set is not
   narrowed away from the ~83-warning default). No autofix exists — every
   finding needs a manual edit. Empty output = pass (no positional call
   sites at risk). Severity: MUST for any macro on a symbolic-migration path;
   SHOULD generally per `bzl-style.md`'s "use only keyword arguments"
   guidance even for macros with no migration planned. Bazel all
   (buildifier-side check, ruleset-agnostic). Settles M-A-15.

10. **A macro whose implementation function's `def` line assigns a default
    value to an `inherit_attrs`-sourced parameter MUST remove that default —
    it is silently ignored.**
    Rationale: Tweag demonstrates directly that a default written on the
    Python-style function signature ("`purpose = "dev"`") is never used;
    the macro always sees `None` unless the caller passed the attribute, and
    the real default belongs in the corresponding `attrs` entry.
    Verify: reading heuristic — for every parameter present in the
    implementation function's signature with a `= <value>` default *and*
    named in `inherit_attrs`'s source rule/macro's attribute set, confirm the
    default is not also expected to apply when the macro is called without
    that argument (test: call the macro without the argument, `bazel cquery
    //target --output=build`, and read the resulting attribute value against
    the expected default). Empty output on a targeted cquery diff = pass.
    Severity: SHOULD (a correctness footgun, not a load-time error). Bazel
    8.0.0+. Settles M-A-13.

11. **A symbolic macro's created implementation-detail targets MUST NOT rely
    on the package's `default_visibility`; the macro MUST set visibility
    explicitly (private by omission, or forwarded via `visibility =
    visibility` to export).**
    Rationale: "The package's default visibility does not apply within a
    macro" — targets default to macro-private regardless of what the BUILD
    file's `package(default_visibility = ...)` says, the opposite of legacy
    macro behavior where visibility is "entirely transparent."
    Verify: reading heuristic — for each rule call inside a symbolic macro's
    implementation function, is `visibility=` either omitted (correctly
    private) or explicitly `visibility` (correctly forwarded)? A call that
    hardcodes `visibility = ["//visibility:public"]` inside the macro body is
    the documented antipattern ("it makes the target unconditionally visible
    to every package, even if the caller specified a more restricted
    visibility") ([macros.md §Visibility and macros](https://bazel.build/extending/macros#visibility)).
    `grep -n 'visibility = \["//visibility:public"\]'` inside a `.bzl` macro
    implementation file is a mechanical proxy for the worst case. Empty
    output = pass. Severity: MUST for the public-visibility antipattern,
    SHOULD for the general "set it explicitly" guidance. Bazel 8+. New
    finding, no prior M-ID (adjacent to M-A-11/M-A-16).

12. **A macro migrated from legacy to symbolic that needs `glob()` MUST move
    the `glob()` call to the BUILD file (or a retained legacy wrapper) and
    pass the result in as a label-list attribute — never attempt to call
    `glob()` inside the symbolic macro's implementation.**
    Rationale: symbolic macros "may not call `glob()`" — a hard restriction,
    not a lint finding; this is the documented, canonical migration fix, not
    a workaround to invent per-repo.
    Verify: grep the macro's `.bzl` implementation function body for the
    literal string `glob(` — its presence inside a function passed to
    `macro(implementation=...)` is a load-time-detectable defect
    (`bazel build` on any target the macro instantiates fails outright, since
    `glob` is not defined in that scope). Empty output = pass. Severity:
    MUST. Bazel 8+. Settles part of M-A-10 (legacy-macro exception).

13. **A legacy macro that calls `native.existing_rules()` for anything other
    than late-package introspection SHOULD be converted to a rule finalizer
    (`macro(finalizer = True, ...)`), not kept as a legacy macro out of
    inertia.**
    Rationale: finalizers give the same `native.existing_rules()` capability
    with macro-aware visibility semantics restored (a finalizer's targets can
    see everything visible to the finalizer's own package, matching the old
    legacy-macro dependency reach) — "if you migrate a
    `native.existing_rules()`-based legacy macro to a finalizer, the targets
    declared by the finalizer will still be able to see their old
    dependencies" ([macros.md §Finalizers and visibility](https://bazel.build/extending/macros#finalizers-and-visibility)).
    Verify: `grep -rn 'native.existing_rules()' --include='*.bzl'` — for each
    hit, confirm the enclosing macro is declared with `finalizer = True`;
    a hit inside a macro without that flag is either a legacy macro (fine,
    but a migration candidate) or a symbolic macro (a load-time error, since
    non-finalizer symbolic macros cannot call it at all). Empty output = no
    finalizer candidates found. Severity: SHOULD. Bazel 8+. Settles part of
    M-A-10.

14. **A repository that sets `--max_computation_steps` to a nonzero value and
    also uses symbolic macros MUST re-validate that budget after any upgrade
    to Bazel 9, not assume Bazel-8-era headroom still holds.**
    Rationale: Bazel 9.0.0 is an `[Incompatible]` change that starts counting
    a package's symbolic-macro Starlark evaluation against the same
    `--max_computation_steps` budget that previously covered only the BUILD
    file thread itself — a macro-heavy package that fit comfortably under
    Bazel 8 can start failing on Bazel 9 with no code change.
    Verify: `bazel info --show_make_env 2>/dev/null; grep -rn
    'max_computation_steps' .bazelrc* .bazelrc.user 2>/dev/null` to find
    whether the flag is set at all (default is `0`, unlimited, in which case
    this rule does not apply); if set, build the heaviest macro-using package
    on both a Bazel-8.x and a Bazel-9.x binary and diff for a new
    computation-step-limit failure. Empty grep output (flag never set) = not
    applicable, no finding. Severity: SHOULD (only bites repos that opted
    into the flag). Bazel 9.0.0+ specifically (verified absent from every
    8.x release through 8.8.0). New finding, no prior M-ID — a direct answer
    to the brief's "name and verify" clause on computation-step limits.

15. **Do not cite a Bazel major-version floor for a Starlark API from the
    GitHub release-notes bullet list alone; cross-check the versioned
    reference docs at the specific git tag before naming the floor in a
    rule.**
    Rationale: the 9.0.0 release notes list `inherit_attrs` as a 9.0.0
    addition; the versioned docs at the `8.0.0` git tag already document and
    demonstrate it, and the implementing PR merged into the `release-8.0.0`
    branch before that version's GA. Citing the release-notes bullet alone
    would misdate this feature and block Bazel-8-pinned repos from using it.
    Verify: for any Starlark-API version-floor claim, run `curl -sL
    https://raw.githubusercontent.com/bazelbuild/bazel/<candidate-floor-tag>/site/en/<page>.md
    | grep '<api-name>'` — a hit at a tag earlier than the release notes
    claim contradicts the release-notes bullet and the docs win (measured
    beats documented, per the map's Conflict 13 precedent). Empty output at
    the claimed floor tag = the release-notes claim holds; check one tag
    earlier to be sure it doesn't predate that too. Severity: CONSIDER (a
    verification-methodology rule for whoever authors future version-floor
    claims, not a checkable property of any one BUILD/.bzl file). Bazel all.
    New finding, no prior M-ID.

## Fleet evidence

`rules_ocx` supplies no macro or rule examples to evaluate against — every
rule above is grounded on upstream sources alone, as the brief anticipates.
Verified directly against the repository (excluding `.agents/worktrees/`):

- `grep -rn '= macro(' --include='*.bzl' .` → **zero hits anywhere in the
  repository.** No symbolic macro exists to check against any rule above.
- `grep -rn '= rule(' --include='*.bzl' .` → three hits, **none in
  production code**: `examples/cross_platform/transition.bzl:18`
  (`platform_filegroup = rule(...)`, an examples-tree demo), and
  `ocx/tests/launcher_test.bzl:1148` / `:1292` (`_bad_closure_report` and
  `_guard`, both test-fixture rules used only to exercise `analysistest`
  failure paths). This slightly refines, but does not contradict, the map's
  "0 `rule()` declarations in production" claim ([map Conflict
  9](../bazel-topic-map.md)) — the public surface really is `repository_rule()`
  and `module_extension()` only; the three `rule()` calls found are
  non-public test/example scaffolding.
- `.claude/rules/starlark.md:3` mentions "rules/macros" only in passing
  ("Public API surface is `//ocx:defs.bzl` (rules/macros) and...") with no
  normative content on which to build a rule.

## AI-agent angle

- **Writes a legacy-style `def foo(name, ...): native.cc_library(...)` macro
  from training-data muscle memory, even on a Bazel-8+-only repo.** Training
  data over-represents WORKSPACE-era and pre-2024 legacy macros; a model
  asked to "write a macro" defaults to the pattern it has seen most. Check:
  does the generated `.bzl` file call `macro(attrs=..., implementation=...)`
  at all, or does it define a bare `def` with a `visibility=None` parameter
  default (the legacy-macro convention)? A bare `def` on a Bazel 8+ repo with
  no stated reason (glob/untyped-param/finalizer need) is the tell.
- **Mutates `kwargs` in a "converted" symbolic macro without adjusting the
  code, because the pattern compiled and ran fine as a legacy macro during
  the model's training window.** Check: grep the new `.bzl` for
  `kwargs[...] [...] = ` or `kwargs[...].append(` — both are silent-pass in a
  legacy macro and hard-fail in a symbolic one, and a model porting code
  mechanically (rename `def` to `macro()` call, keep the body) will carry the
  mutation over unchanged.
- **Assumes an inherited attribute keeps the wrapped rule's real default**
  (e.g. writes `kwargs.get("tags", [])` expecting `[]`, when `inherit_attrs`
  guarantees the unset value is `None`, not `[]`). `None + ["x"]` and `[] +
  ["x"]` behave differently — the former raises `TypeError: unsupported
  binary operation`. Check: for every `inherit_attrs` name, confirm the
  generated code guards with `or []` / `if x == None` before treating the
  value as a list, dict, or string it can concatenate.
- **Claims a symbolic-macro migration "speeds up the build" as its
  justification**, echoing marketing language from Bazel's own macros page
  ("designed to be amenable to lazy evaluation") without checking that lazy
  evaluation has actually shipped. Check: does the PR/commit message cite a
  release note or docs URL confirming laziness shipped, dated after
  2026-09-05? If it just asserts "faster," treat the claim as unverified —
  the mechanism does not exist yet.
- **Hallucinates or misremembers a macro-restriction list** (e.g. claims
  symbolic macros "cannot call other macros" or "cannot use `select()` at
  all," neither of which is true — the real restrictions are the seven items
  in `macros.md` §Restrictions: no `glob()`, no `native.package()`, no
  `native.environment_group()`, no `native.existing_rules()` outside
  finalizers, no return value, no argument mutation, and the naming schema).
  Check: cross-reference any claimed restriction against the live
  `macros.md#restrictions` list verbatim before writing it into a rule or a
  code comment.
- **Cites a Bazel-9-only floor for `inherit_attrs`** by trusting the 9.0.0
  release notes' own bullet at face value (see Findings §5) — exactly the
  mistake this dive caught and corrected. Check: before writing "requires
  Bazel 9" for any Starlark API, fetch the versioned docs at the *claimed*
  floor tag and one major earlier; if the earlier tag already documents it,
  the release-notes bullet is wrong or duplicated.
- **Uses a `_test`-suffixed name for a non-test rule or vice versa**, a
  removed-native-rules-adjacent trap: on Bazel 9,
  `--incompatible_autoload_externally` defaults empty, so a model that writes
  `cc_test(...)` or `py_test(...)` expecting it to resolve natively (as it
  would have under Bazel 7/legacy autoload) gets an "undefined symbol"
  failure unless an explicit `load()` is present — this compounds with any
  macro that wraps such a call without its own `load()` for the wrapped rule.
  Check: does the `.bzl` or BUILD file carry an explicit `load("@rules_cc//cc:defs.bzl",
  "cc_test", ...)` (or the equivalent for the language in use) rather than
  relying on autoload?

## Contested / evolving

- **Whether lazy evaluation ever ships, and on what timeline, is genuinely
  open.** `macros.md` says "we are in the process of implementing" it;
  Tweag (2025-11-20) says it is "currently being considered for a future
  Bazel release" — softer language than "in progress," and BazelCon 2024's
  recap notes internal Google "pushback... over fear that lazy-evaluated
  macros will encourage larger, harder-to-navigate BUILD packages"
  ([practitioner-and-conferences.md](../bazel-topic-map/practitioner-and-conferences.md)).
  As of 2026-09-05 there is no committed release target in any fetched
  source. Trending: unresolved, watch each new minor's release notes for a
  "Laziness" bullet.
- **Whether to migrate a legacy macro at all is a genuine cost/benefit
  call, not a foregone conclusion.** Tweag's own closing guidance: "legacy
  macros can still be used and are to remain supported in Bazel for the
  foreseeable future. Some organizations may even choose not to migrate at
  all, particularly if they rely on the current behavior of the legacy
  macros heavily." Trending: symbolic is the default for *new* code
  (settled), but wholesale retroactive migration of a large legacy-macro
  estate is not treated as urgent by any source in this corpus.
  Historical-only guidance risk: none identified — legacy macros are not on
  a deprecation clock as of 2026-09-05.
- **The BUILD-versus-`.bzl` DRY tension intersects macro authorship but is
  not settled here** — `bzl-style.md`'s "do not create a variable or macro
  just to avoid some amount of repetition in BUILD files" is in active
  tension with any codebase's instinct to factor out a shared macro call;
  the map tracks the general DRY-vs-readability question as M-A-21, which
  this dive does not adjudicate further.
- **`compatibility_level`-style dual-layer confusion does not exist for
  macros/rules specifically** — no evidence surfaced of a similar
  "resolver ignores it, registry still checks it" split for anything in this
  dive's scope; noted as a non-finding so a later wave does not re-search
  for one.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [bazel.build/extending/macros](https://bazel.build/extending/macros) (fetched as [raw `site/en/extending/macros.md`](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/extending/macros.md)) | Primary — official symbolic-macro reference, fetched verbatim | Live as of 2026-09-05 | The naming schema, restrictions list, visibility model, `inherit_attrs`, laziness status — the ground truth for nearly every claim in this dive |
| [bazel.build/extending/legacy-macros](https://bazel.build/extending/legacy-macros) (raw `legacy-macros.md`) | Primary — official legacy-macro reference | Live as of 2026-09-05 | "Where possible you should use symbolic macros"; debugging technique (`generator_function` query); the four conventions unique to legacy macros |
| [bazel.build/extending/rules](https://bazel.build/extending/rules) (raw `rules.md`) | Primary — official rule-authoring reference | Live as of 2026-09-05 | The implementation-function/action/provider boundary that defines when a rule, not a macro, is required; legacy struct-provider and runfiles-API deprecation wording |
| [bazel.build/rules/bzl-style](https://bazel.build/rules/bzl-style) (raw `bzl-style.md`) | Primary — official Starlark style guide | Live as of 2026-09-05 | "Use rules whenever possible instead of macros"; keyword-argument convention; generated-target visibility/`manual`-tag conventions |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | Primary — GitHub release, fetched via `gh api` | Published 2024-12-09 | The original symbolic-macro announcement, including the "compatible with lazy evaluation (not implemented yet)" line at ship time |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Primary — GitHub release, fetched via `gh api` | Published 2026-01-20 | The two Bazel-9-specific macro changes (computation-step limits, `inherit_attrs` bullet) and the WORKSPACE-removal context around them |
| [buildtools `WARNINGS.md`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md) | Primary — buildifier's own warning catalogue, fetched verbatim | Live as of 2026-09-05 | Exact wording of `positional-args`, including the explicit "prevent migration from Legacy Macros to Symbolic Macros" line and the no-autofix statement |
| Versioned `macros.md` at git tags `8.0.0`, `8.7.0`, `9.0.0` (e.g. [8.0.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.0.0/site/en/extending/macros.md)) | Primary — point-in-time documentation snapshots, fetched verbatim | Tagged 2024-12-09 / 2026-05-07 / 2026-01-20 | The decisive check that `inherit_attrs` predates the 9.0.0 release-notes bullet — resolves the version-floor question the release notes alone get wrong |
| [PR #24280](https://github.com/bazelbuild/bazel/pull/24280) | Primary — the implementing pull request, fetched via `gh api` | Merged 2024-11-11 | Confirms `inherit_attrs` merged into the `release-8.0.0` branch before that version's GA, with the RELNOTES text later duplicated under 9.0.0 |
| Commit [`f23d0a6d`](https://github.com/bazelbuild/bazel/commit/f23d0a6ddf45f987b2ed4b944ae3da9e998af7a7) | Primary — the commit enforcing computation-step limits, fetched via `gh api` | 2025-05-13 | Confirms the computation-step-limit change lands after every 8.x branch cut, corroborating its 9.0.0-only status independently of the release notes |
| [Bazel command-line reference](https://bazel.build/reference/command-line-reference) | Primary — official flag reference | Live as of 2026-09-05 | Exact `--max_computation_steps` type, default (`0`, unlimited), and tag |
| [Tweag: "Migrating to Bazel symbolic macros"](https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/) | Secondary (practitioner) — hands-on migration gotcha list with exact reproduced error text and worked examples | 2025-11-20 — most recent primary-adjacent source in the wave-1 corpus | Every exact error string in this dive's Findings §4/§7 traces to this post's worked, runnable examples |
| [bazel-topic-map/failure-corpus.md §5](../bazel-topic-map/failure-corpus.md) | Internal — wave-1 scout's synthesis of the Tweag post | 2026-09-05 | Cross-check for the Tweag extraction; independently arrived at the same gotcha list |
| [bazel-topic-map/architecture-and-monorepo-practice.md §11](../bazel-topic-map/architecture-and-monorepo-practice.md) | Internal — wave-1 scout reading of `macros.md` | 2026-09-05 | Corroborates "available by default in Bazel 8" and the legacy-macro exception list independently |
| [bazel-topic-map/codified-and-lint-catalogue.md §3](../bazel-topic-map/codified-and-lint-catalogue.md) | Internal — wave-1 scout's buildifier-warning table | 2026-09-05 | Source of the `positional-args` migration-blocker cross-reference, verified independently against `WARNINGS.md` itself in this dive |
| [bazel-topic-map/practitioner-and-conferences.md](../bazel-topic-map/practitioner-and-conferences.md) | Internal — wave-1 scout's conference-talk synthesis | 2026-09-05 | Source of the BazelCon 2024 internal-pushback detail on lazy macros and oversized BUILD packages |
| [bazel-topic-map.md — Conflict 3](../bazel-topic-map.md) | Internal — phase-3 adjudication | 2026-09-05 | The map's own resolution of the "symbolic macros: recommended, or performance-overclaimed?" conflict, which this dive independently re-verifies against live sources rather than only citing |
| `rules_ocx` repository (`ocx/tests/launcher_test.bzl`, `examples/cross_platform/transition.bzl`, `.claude/rules/starlark.md`) | Fleet ground truth, read directly | Measured 2026-09-05 | Confirms zero `macro()` calls and zero production `rule()` declarations, refining the map's "0 `rule()` declarations" claim to name the three non-production exceptions |

