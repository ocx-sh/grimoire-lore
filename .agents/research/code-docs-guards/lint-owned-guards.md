---
title: Lint-owned guards — which mechanisms a compiler, lint or test can own
topic: code-docs / lint-owned-guards
agent: lint-owned-guards-dive
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 19
scope: >
  Classifies the 40 mechanism sites in code-docs-audit/eval-sites.md into
  lint/compiler-ownable, test-ownable, or comment-only, with per-language lint
  configs for the two mechanisms the brief names (named RAII guard bindings,
  exhaustive matches) verified by planting violations against real clippy,
  pyright and the fleet's own source. Does NOT re-derive density numbers,
  design the guard recognizer (guard-shape), or decide the eval rubric
  (eval-scoring) — those are sibling dives.
---

# Lint-owned guards

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Named RAII guard bindings: which lint actually owns the `_`-rename footgun](#1-named-raii-guard-bindings)
  2. [Exhaustive matches: what a comment-worthy `#[non_exhaustive]` boundary needs](#2-exhaustive-matches)
  3. [Other languages: the same idiom, three different names](#3-other-languages)
  4. [Classifying all 40 mechanism sites](#4-classifying-all-40-mechanism-sites)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Neither of the two fleet RAII-footgun sites (ocx's `LockedFile`, grimoire's
  `InFlightGuard`) carries `#[must_use]` today — verified by reading both
  struct definitions (`repo:ocx:crates/ocx_util/src/fs/locked_file.rs:29-32`,
  `repo:grimoire:src/tui/update_check.rs:371`).
- `#[must_use]` is neither necessary nor sufficient to catch the `_`-rename
  footgun. The lint that actually fires on renaming `_render_lock`/`_slot` to
  bare `_` is rustc's own **`let_underscore_drop`** (allow-by-default, fires
  on *any* type with a `Drop` impl) — proven by planting the rename in a
  scratch crate and running `cargo clippy`. `#[must_use]` only adds a second,
  independent lint (`clippy::let_underscore_must_use`) on top.
- `clippy::let_underscore_lock` (the clippy lint, not rustc's) never fires for
  either fleet site: it only recognizes `parking_lot::Mutex`/`RwLock` guards
  as the *direct* bound type, not a custom domain wrapper that merely holds a
  lock internally. IDIOM-05 lists it as one of the "must enable" five; it is
  effectively moot for this footgun shape.
- Two of IDIOM-05's five named lints are misdescribed: `let_underscore_lock`
  is clippy's `correctness` group (**deny**-by-default under plain
  `cargo clippy`) and `let_underscore_future` is `suspicious` (**warn**-by-
  default) — neither is "none... on by default" as the rule states. Only
  `let_underscore_must_use`, `let_underscore_untyped` and
  `allow_attributes`/`wildcard_imports` are genuinely allow-by-default
  restriction/pedantic lints needing explicit enabling.
- OCX-17's exhaustive match needs no lint to catch a *missing* variant — that
  is rustc's E0004, free and unconditional as long as no wildcard arm exists.
  The only real risk is a *later-added* wildcard arm, and only
  `clippy::wildcard_enum_match_arm` (restriction, allow-by-default) catches
  that mutation.
- `#[expect(clippy::wildcard_enum_match_arm)]` — the attribute an agent reaches
  for as "the one-line lint pointer" — is the wrong mechanism and fails
  immediately: verified by applying it to a still-exhaustive match and running
  `cargo clippy`, which errors `this lint expectation is unfulfilled`. The
  correct attribute is `#[deny(clippy::wildcard_enum_match_arm)]`, scoped to
  the function/impl, verified silent today and verified to turn the planted
  wildcard-arm mutation into a hard `cargo clippy` failure.
- 0 of 40 fleet mechanism sites outside `ocx` use an exhaustive-match
  mechanism; the only comparable Python `match` statement in the harvested
  repos (`ocx-sdk-python/src/ocx_sdk/_envmodel.py:169`) ends in
  `case _: raise TypeError(...)`, and 0 of the fleet's TypeScript `switch`
  statements sampled use the `never`-typed exhaustiveness idiom.
- Enabling pyright's `reportMatchNotExhaustive` does **not** fix that Python
  site: verified by running `npx pyright` on a reproduction — a wildcard
  `case _:` that raises already satisfies pattern coverage, so the diagnostic
  never fires, strict mode or not. Replacing the body with
  `typing.assert_never(declared)` (3.11+) makes pyright reject an unhandled
  union member with `reportArgumentType`, and — verified separately — this
  fires even under `typeCheckingMode: "standard"`, no config change needed.
- `@typescript-eslint/switch-exhaustiveness-check` requires **typed linting**
  (`parserOptions.project`/`projectService`); both fleet TypeScript repos
  (`grimoire-indexer`, `grimoire-vscode`) currently use only the untyped
  `tseslint.configs.recommended` preset, so adopting the rule is a two-step
  migration, not a one-line rule addition — verified by reading both
  `eslint.config.*` files.
- Classifying all 40 mechanism sites: **4 lint/compiler-ownable** (OCX-09,
  OCX-14, OCX-17, GRM-08), **24 test-ownable** (a named test fails on the
  exact breaking edit), **12 comment-only** (no lint and no test catches the
  breaking edit named in the harvest).
- OCX-04's compile-time `const _: () = assert!(...)` looks lint/compiler-owned
  but is not, for the breaking edit the harvest actually names: "raise the
  constant to unblock a build" changes the assertion's own threshold, so the
  assert passes against the new, wrong ceiling. The check protects against
  *ignoring* the assert, not against *relaxing* it — reclassified comment-only.
- ERR-19 (shipped: `rules/rust-quality/errors.md`) mechanically forces a
  rationale comment next to `let _ = fsync_parent(parent);`
  (OCX-14's exact breaking edit) — but only checks a comment exists, not that
  its content is true. A plausible-sounding wrong rationale ("fsync failures
  are usually not actionable" — the very reasoning OCX-14's comment refutes)
  satisfies ERR-19 letter-for-letter.
- The comment-only residue (12/40, 30%) clusters into five shapes: crash/
  fault-injection-untestable ordering, a check whose bypass evades the check
  itself, a negative-space API contract ("this is *not* a containment
  primitive"), a posture/direction guard compatible with either posture in
  every existing test, and a deliberately-not-optimized decision. None of
  these five shapes is fixable by adding a lint; the cleanup skill must treat
  this class as a floor, not a target.

## Findings

### 1. Named RAII guard bindings

**The mechanism.** OCX-09 (`repo:ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:892`)
binds `let _render_lock = render_lock_parameters(...).acquire().await?;`; GRM-08
(`repo:grimoire:src/tui/update_check.rs:328`) binds
`let _slot = InFlightGuard { ... };`. Both rely on the binding staying *named*
(underscore-prefixed but not literal `_`) so the value's `Drop` fires at the
end of the enclosing scope, not at the `let` statement. Renaming either to
literal `_` — a completely standard, tool-suggested unused-binding cleanup —
drops the guard immediately.

**What the four clippy `let_underscore_*` lints actually cover.** Fetched
[`clippy_lints/src/let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs)
(current `master`, 2026-09-27) in full:

| Lint | Group | Default | What it actually matches |
|---|---|---|---|
| `let_underscore_lock` | `correctness` | **deny** | `let _ = expr` where `expr`'s type *is* (or generically contains as a type argument) a `parking_lot::Mutex`/`RwLock` guard — **std** locks are explicitly out of scope for this clippy lint (its own doc comment says so, pointing at rustc's separate lint of the same name) |
| `let_underscore_must_use` | `restriction` | allow | `let _ = expr` where `expr`'s *type* carries `#[must_use]`, or `expr` is a call to a `#[must_use]`-annotated function |
| `let_underscore_untyped` | `restriction` | allow | **Any** `let _ = expr;` with no type annotation, regardless of `expr`'s type — the broadest of the four |
| `let_underscore_future` | `suspicious` | **warn** | `let _ = expr` where `expr`'s type implements `Future` |

None of the four match a custom domain guard struct (`LockedFile`,
`InFlightGuard`) *by shape* unless it is separately marked `#[must_use]` (only
`let_underscore_must_use` cares) or the binding is untyped (`let_underscore_untyped`
always cares, unconditionally). `let_underscore_lock` and `let_underscore_future`
are structurally inapplicable to either fleet site.

**The lint the brief didn't ask about is the one that actually owns this.**
Fetched rustc's own [allowed-by-default lint listing](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#let-underscore-drop):
`let_underscore_drop` "checks for statements which don't bind an expression
which has a non-trivial `Drop` implementation to anything." This is a
**rustc-native** lint (not clippy), allow-by-default, part of the `let_underscore`
lint group alongside rustc's own (deny-by-default) `let_underscore_lock` — see
[deny-by-default listing](https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html#let-underscore-lock).
It requires no `#[must_use]` annotation at all: any type with a `Drop` impl
qualifies, which is exactly the shape of `LockedFile` and `InFlightGuard`.

**Verified by planting the rename.** Scratch crate
(`/tmp/.../let_underscore_probe`, `edition = "2021"`), with
`[lints.rust] let_underscore = "deny"` and all four clippy lints denied,
against a type shaped like the fleet's guards:

```rust
pub struct PlainGuard(pub u32);
impl Drop for PlainGuard { fn drop(&mut self) { /* releases the resource */ } }
pub fn acquire_plain() -> PlainGuard { PlainGuard(1) }

pub fn case_a_underscore() {
    let _ = acquire_plain(); // the OCX-09 / GRM-08 rename, no #[must_use] anywhere
}
```

`cargo clippy` output (verbatim):

```
src/lib.rs:14:5: error: non-binding `let` without a type annotation
src/lib.rs:14:5: error: non-binding let on a type that has a destructor
```

Two lints fire **with zero `#[must_use]` anywhere in the crate**:
`let_underscore_untyped` (clippy) and `let_underscore_drop` (rustc). Adding
`#[must_use]` to the same struct (case B in the same probe) adds exactly one
more diagnostic, `let_underscore_must_use` — it does not change whether the
footgun is caught, only how many lints report it. A genuine
`std::sync::Mutex` guard (case C, for comparison) fires rustc's `let_underscore_lock`
instead of `let_underscore_drop` — the two are mutually exclusive per
statement, rustc's lint pass prefers the more specific "lock" diagnosis when
the type actually is a std sync guard.

**Fleet check: neither guard type carries `#[must_use]` today**, and neither
Cargo.toml enables any of the five lints IDIOM-05 already asks for:

```
$ rg -n --glob '**/Cargo.toml' --glob '!external/**' -e 'let_underscore' /home/mherwig/dev/ocx /home/mherwig/dev/grimoire
(no output)
```

`repo:ocx:crates/ocx_util/src/fs/locked_file.rs:29-32` — `pub struct LockedFile`,
no `#[must_use]`. `repo:grimoire:src/tui/update_check.rs:371` — `struct InFlightGuard`,
no `#[must_use]`.

**IDIOM-05 (`repo:rules/rust-quality/api-and-idioms.md:97`) is half wrong about
defaults.** It says all five of its named lints have "none... on by default."
Fetched the [clippy README's lint-group table](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/README.md)
(current `master`): `correctness` is **deny** by default and `suspicious` is
**warn** by default under plain `cargo clippy`, with no `[lints]` section at
all. `let_underscore_lock` is `correctness`; `let_underscore_future` is
`suspicious`. Both already fire without any workspace configuration — the
rule's rationale for listing them alongside the genuinely allow-by-default
`let_underscore_must_use`/`let_underscore_untyped` (`restriction`, confirmed
allow-by-default in the same README table) is incorrect, though harmless
(enabling an already-on lint again is a no-op).

### 2. Exhaustive matches

**OCX-17** (`repo:ocx:crates/ocx_oci/src/endpoint.rs:479-493`,
`impl From<SsrfError> for UrlRejection`) has no wildcard arm. `SsrfError` is
`#[non_exhaustive]` only from *outside* its defining crate, so *inside* the
crate the match is a plain, total Rust `match` — the compiler already refuses
to build (`E0004`, unconditional, no lint needed) the moment a new variant is
added and this match is not updated. This is the free half of the guarantee;
no clippy configuration makes it stronger.

**The only way the guard breaks is a later wildcard arm**, converting the
compile error into a silent catch-all. Fetched
[`WILDCARD_ENUM_MATCH_ARM`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/matches/mod.rs)
(`clippy_lints/src/matches/mod.rs`, `master`, 2026-09-27): "Checks for
wildcard enum matches using `_`", group `restriction` (allow-by-default,
confirmed against the same README table above), first shipped 1.34.0. It
fires on *any* enum match with a `_` arm, matched or not — deliberately broad,
which is why it cannot be a workspace-wide lint in a fleet that legitimately
uses `_` on `#[non_exhaustive]` foreign enums (e.g. `std::io::ErrorKind`,
which OCX-18 matches with a real, intentional wildcard).

**`MATCH_WILDCARD_FOR_SINGLE_VARIANTS`** (same file, `pedantic` group,
1.45.0) is narrower and not the right tool here: it only fires when a
wildcard covers *exactly one* remaining variant of an in-scope enum ("New
enum variants added by library updates can be missed" — same rationale,
different trigger shape). It is moot for OCX-17 today (zero wildcards to
flag) and would not have prevented the mutation this dive tested (adding a
wildcard that covers *two* remaining variants at once, see below).

**The right attribute is `#[deny]`, scoped locally — not `#[expect]`.** Fetched
the [Rust reference's `#[expect]` section](https://raw.githubusercontent.com/rust-lang/reference/master/src/attributes/diagnostics.md):
"The expectation will be fulfilled, if a `#[warn(C)]` attribute at the same
location would result in a lint emission. If the expectation is unfulfilled
[...] the `unfulfilled_lint_expectations` lint will be emitted." Since the
match has no wildcard today, `wildcard_enum_match_arm` never fires, so
`#[expect(clippy::wildcard_enum_match_arm)]` is unfulfillable by construction.
Verified in a scratch crate reproducing OCX-17's shape:

```
$ cargo clippy --message-format=short
src/lib.rs:7:10: warning: this lint expectation is unfulfilled
```

Swapping `#[expect(...)]` for `#[deny(clippy::wildcard_enum_match_arm)]`
(scoped to the `impl`) is silent today —

```
$ cargo clippy --message-format=short
(no output)
```

— and turns a planted "simplification" (an agent collapsing two arms into a
wildcard) into a hard failure:

```rust
match e {
    SsrfError::HostBlocked => UrlRejection::Blocked,
    _ => UrlRejection::RedirectDenied, // the planted mutation
}
```
```
$ cargo clippy --message-format=short
src/lib.rs:10:13: error: wildcard match will also match any future added variants: help: try: `SsrfError::PortBlocked | SsrfError::RedirectBlocked`
error: could not compile `wildcard_probe` (lib) due to 1 previous error
```

Fleet check — this attribute is adopted nowhere today:
```
$ rg -n --type rust --glob '!external/**' -e 'wildcard_enum_match_arm' -e 'match_wildcard_for_single_variants' /home/mherwig/dev/ocx /home/mherwig/dev/grimoire
(no output)
```

### 3. Other languages

The 40-site harvest contains exactly **one** exhaustive-match mechanism site
(OCX-17, Rust). No GRM, PY or TS site in `eval-sites.md` is framed as an
exhaustiveness guard — the mechanism is under-sampled outside Rust in this
harvest, not absent from the fleet's code. A supplementary sweep of the four
non-Rust repos in the harvest found:

- **Python**: exactly one `match` statement in fleet source,
  `repo:ocx-sdk-python:src/ocx_sdk/_envmodel.py:169` (`merge`, folding
  `EnvValue` entries). It ends `case _: raise TypeError(...)` — a wildcard
  that raises, which type-checkers treat as fully covering the match.
- **TypeScript**: 15 `switch` statements across `grimoire-indexer`/
  `grimoire-vscode` source (`rg -rln 'switch (' --include='*.ts' src/`, hand-
  filtered for `switch (message.type)`/`switch (action)`/`switch (row.type)`-
  shaped discriminated-union dispatch, e.g.
  `repo:grimoire-vscode:src/views/details.ts:630`,
  `repo:grimoire-vscode:src/webview/settings/render.ts:630`). None sampled
  ends in a `never`-typed exhaustiveness check.

**Python: `reportMatchNotExhaustive` does not fix the fleet's one site.**
Fetched pyright's [`configuration.md`](https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md)
(`main`, 2026-09-27): `reportMatchNotExhaustive` — "Generate or suppress
diagnostics for a `match` statement that does not provide cases that
exhaustively match against all potential types of the target expression" —
default `"none"` in off/basic/standard, `"error"` only in strict mode (the
diagnostic-defaults table, row 413 of the fetched file). `ocx-sdk-python`'s
`pyproject.toml` (`repo:ocx-sdk-python:pyproject.toml:82-86`) sets
`typeCheckingMode = "standard"` with `strict = ["src"]` — pyright's own docs
confirm a directory listed in `strict` gets full strict-mode diagnostics,
including this one, for files under it. `_envmodel.py` is under `src/`, so
`reportMatchNotExhaustive` is **already effectively "error" for this exact
file** — and still catches nothing, because the existing `case _:` wildcard
already satisfies pattern coverage. Verified by reproducing the shape and
running `npx pyright` (v1.1.414) twice, once per fallback style, both with an
added-but-unhandled `EnvRef` union member:

```python
# case_wildcard_raise.py — reproduces the shipped shape
match declared:
    case PathVar(): ...
    case ListVar(): ...
    case ConstVar(): ...
    case str(): ...
    case _:
        raise TypeError(f"unhandled: {declared!r}")
```
```
$ npx pyright case_wildcard_raise.py
0 errors, 0 warnings, 0 informations
```
```python
# case_assert_never.py — same shape, assert_never instead of raise
    case _:
        assert_never(declared)
```
```
$ npx pyright case_assert_never.py
case_assert_never.py:39:26 - error: Argument of type "EnvRef" cannot be
  assigned to parameter "arg" of type "Never" in function "assert_never"
  (reportArgumentType)
1 error, 0 warnings, 0 informations
```

The diagnostic that actually fires is `reportArgumentType`, not
`reportMatchNotExhaustive` — the wildcard still exists, so pyright never
calls the match "not exhaustive"; the win comes from `typing.assert_never`'s
parameter being typed `Never`
([`typing.assert_never` docs](https://docs.python.org/3/library/typing.html#typing.assert_never),
added Python 3.11, runtime behavior: raises `AssertionError`). This also
fires with **no config change**: re-running the second file under
`typeCheckingMode: "standard"` (no `strict`, no explicit
`reportMatchNotExhaustive` override) produces the identical error. A third
run with *no* wildcard arm at all confirms `reportMatchNotExhaustive` also
works directly in strict mode ("Cases within match statement do not
exhaustively handle all values... If exhaustive handling is not intended, add
`case _: pass`") — but removing the wildcard entirely forces every branch to
return a value, which is not always the shape a fallible-conversion function
wants.

**TypeScript: the `never`-parameter idiom is the same trick, and needs no
ESLint plugin.** Fetched the
[TypeScript Handbook's exhaustiveness-checking section](https://www.typescriptlang.org/docs/handbook/2/narrowing.html):
a `default` branch assigns the unhandled value to a `never`-typed local
(`const _exhaustiveCheck: never = shape;`); adding a new union member without
a matching `case` produces `Type 'Triangle' is not assignable to type
'never'` from plain `tsc`, no ESLint needed. `@typescript-eslint/switch-
exhaustiveness-check` (fetched [typescript-eslint.io](https://typescript-eslint.io/rules/switch-exhaustiveness-check/),
v8.70.1) is the *enforcement* that the idiom was actually written, not the
underlying safety net — it requires typed linting
(`parserOptions.project`/`projectService: true`, confirmed on the same page)
and defaults to `allowDefaultCaseForExhaustiveSwitch: true`,
`considerDefaultExhaustiveForUnions: false`, `requireDefaultForNonUnion: false`.
Both fleet TS repos use only `tseslint.configs.recommended` (untyped):

```
$ grep -n 'recommendedTypeChecked\|strict-type-checked\|switch-exhaustiveness' grimoire-indexer/eslint.config.js grimoire-vscode/eslint.config.mjs
(no output)
```

**Cross-language throughline.** All three non-Rust checks share one shape:
route the theoretically-unreachable branch through a value typed to accept
nothing (`Never`/`never`). Rust gets this for free from the compiler because
`match` exhaustiveness is a language guarantee, not an opt-in check; Python
and TypeScript need the idiom spelled out by hand, and their respective
lint/type-checker settings only make *forgetting* the idiom loud — they do
not retrofit exhaustiveness onto a match/switch that already has a
catch-all.

### 4. Classifying all 40 mechanism sites

Method: for each site in `eval-sites.md` §3, take the "Test" column (`yes:` /
`none found` / `n/a:structural`) as the starting classification, then check
whether the *exact breaking edit named* is independently caught by an
existing lint, an existing shipped lore rule's grep check, or a
compiler-structural guarantee — promoting to lint/compiler-ownable where so,
and demoting a nominally-tested or nominally-checked site to comment-only
where the check does not actually cover the named mutation (OCX-04).

| Class | Count | Sites |
|---|---|---|
| Lint/compiler-ownable | 4 | OCX-09, OCX-14, OCX-17, GRM-08 |
| Test-ownable | 24 | OCX-01, OCX-03, OCX-05, OCX-08, OCX-10, OCX-11, OCX-12, OCX-13, OCX-15, OCX-16, OCX-18, OCX-19, OCX-20, OCX-22, OCX-24, GRM-01, GRM-02, GRM-05, GRM-07, PY-02, PY-03, PY-04, TS-02, TS-04 |
| Comment-only | 12 | OCX-02, OCX-04, OCX-06, OCX-07, OCX-21, OCX-23, GRM-03, GRM-04, GRM-06, PY-01, TS-01, TS-03 |

Notes on the four lint/compiler-ownable sites:

- **OCX-09, GRM-08** — `let_underscore_drop` + `let_underscore_untyped` once
  enabled (§1); today, neither is enabled, so these two currently sit on their
  named tests only (`two_renders_against_one_home_are_serialized_by_the_render_lock`,
  `duplicate_in_flight_row_checks_are_deduped`) — classified lint-ownable
  because the *cheapest* durable owner is the lint, not the test, once N1
  ships.
- **OCX-17** — `#[deny(clippy::wildcard_enum_match_arm)]`, scoped (§2); today
  unenforced by any lint or test (`n/a:structural` per the harvest) — this is
  the one site where the lint is the *only* available mechanical owner, since
  no runtime test can exercise "a variant that does not exist yet."
- **OCX-14** — ERR-19 (`repo:rules/rust-quality/errors.md:72`) already greps
  for `let _ = ` / `.ok\(\);` / `unwrap_or_default\(\)` and requires an
  adjacent rationale comment on every hit. The harvest's named breaking edit
  for OCX-14 (`let _ = fsync_parent(parent);`) is exactly this pattern — the
  one site in the whole harvest already covered by a shipped, mechanical
  lore-rule check, not a language lint. See the caveat in
  [AI-agent angle](#ai-agent-angle): ERR-19 checks *presence* of a rationale,
  not its *truth*.

Reclassified from a naive "has a check" reading:

- **OCX-04** — `const _: () = assert!(SHIM_SIZE_BUDGET <= 512 * 1024)` is a
  real compile-time check, and the harvest's own "Test" column says "yes
  (compile-time; fails the build)." But the *breaking edit the harvest names*
  is "raise the constant to unblock a build... without checking why the blob
  grew" — that edit changes the constant the assert checks *against*, so the
  assert passes trivially on the new, larger ceiling. The check protects
  against ignoring a red assert; it does nothing against relaxing the
  threshold itself, which is the actual regression the comment guards
  against. Reclassified comment-only for the "why 512 KiB, not more" half;
  the "the ceiling exists as a hard build gate at all" half stays genuinely
  compiler-owned. No lint or test distinguishes "the ceiling moved for a good
  reason" from "the ceiling moved to make CI green."

Sites where a partial test exists but does not cover the *specific* claim
(kept in their harvested bucket, flagged for the eval design rather than
reclassified here): OCX-23 (`remove_segment_plants_no_segment_the_ambient_did_not_have`
tests a related CWE-426 property, not the "this is not a containment check"
claim itself) and TS-01 (the general escape-the-root test exists; the
symlinked-*parent*-directory scenario specifically does not) — both counted
comment-only above because the named breaking edit's specific failure mode
has no oracle in-repo, matching `eval-sites.md`'s own framing.

## Normative guidance candidates

1. **Rust workspaces enable `let_underscore_drop` in `[workspace.lints.rust]`,
   in addition to IDIOM-05's four clippy lints.**
   Rationale: it is the only lint that fires on renaming *any* custom
   `Drop`-implementing RAII guard (locks, permits, slots) to `_`, independent
   of `#[must_use]`; the parking_lot/std-scoped `let_underscore_lock` lints
   never see a domain wrapper type.
   Verify: `rg -n --glob 'Cargo.toml' --glob '!external/**' -e 'let_underscore_drop' .`
   — run against `ocx` and `grimoire` today: empty in both. Planted-violation
   result (§1): `error: non-binding let on a type that has a destructor`.
   Severity: **MUST**.

2. **A struct returned from an `acquire`/`lock`/`claim`-shaped function and
   holding a resource via `Drop` also carries `#[must_use]`.**
   Rationale: `let_underscore_drop` catches the `let _ = ...` shape; it does
   not catch discarding the guard as a bare expression statement
   (`acquire_plain();`, no `let` at all), which only `#[must_use]` (via the
   ordinary `unused_must_use` lint) catches.
   Verify: `rg -n --type rust --glob '!external/**' -B2 -e 'impl Drop for' .`
   then confirm the preceding `struct`/`pub struct` line carries `#[must_use]`
   — reading heuristic, not fully mechanizable (a struct can implement `Drop`
   in a different file than its declaration). Run on the two named fleet
   sites: `LockedFile` and `InFlightGuard` both fail this check today (0/2).
   Severity: **SHOULD**.

3. **Once rule 1 ships, a comment guarding a named RAII binding shrinks to one
   line naming the lint, never restates the mechanism in prose.**
   Good: `// LINT-OWNED: renaming to \`_\` is caught by let_underscore_drop (deny).`
   Bad (today, OCX-09): four lines re-deriving "held until this call returns"
   from first principles.
   Rationale: once the lint is workspace-enabled, the prose no longer carries
   unique information — it duplicates what `cargo clippy -- -D warnings`
   already guarantees.
   Verify: reading heuristic — a comment above a `let _<name> = <Drop-typed
   call>` binding exceeding one line, in a crate where rule 1's lint is
   enabled, is a candidate for the cleanup skill.
   Severity: **MUST** (conditional on rule 1 being adopted in that crate).

4. **An in-crate match that must stay exhaustive on purpose carries
   `#[deny(clippy::wildcard_enum_match_arm)]` scoped to the function or impl
   block — never `#[expect(...)]` for this purpose, and never as a
   workspace-wide lint.**
   Rationale: rustc's own exhaustiveness check (E0004) already fails the
   build on a *missed* variant for free; the only gap is a *later-added*
   wildcard arm, which only this restriction lint catches, and only
   `#[deny]` (not `#[expect]`, which requires the lint to already be firing)
   is fulfillable while the match stays exhaustive. Workspace-wide, the lint
   fires on every legitimate wildcard on a foreign `#[non_exhaustive]` enum
   fleet-wide (e.g. OCX-18's `io::ErrorKind` match), which is not a mistake.
   Verify: `rg -n --type rust --glob '!external/**' -c 'clippy::wildcard_enum_match_arm' .`
   — run against `ocx` and `grimoire` today: 0 hits, unadopted. Planted-
   violation result (§2): `#[expect(...)]` on the still-exhaustive match →
   `this lint expectation is unfulfilled`; `#[deny(...)]` → silent today,
   `error: wildcard match will also match any future added variants` once a
   `_` arm is added.
   Severity: **MUST** for every match a comment calls "must stay exhaustive";
   **MUST NOT** apply the same attribute workspace-wide.

5. **TypeScript: a `switch` over a discriminated union that a comment calls
   "must stay exhaustive" is either rewritten with the `never`-typed default
   idiom (no tooling dependency) or enforced by
   `@typescript-eslint/switch-exhaustiveness-check` under typed linting.**
   Config (flat config, fetched from
   [typescript-eslint.io](https://typescript-eslint.io/rules/switch-exhaustiveness-check/)):
   ```js
   export default tseslint.config(
     ...tseslint.configs.recommendedTypeChecked,
     { languageOptions: { parserOptions: { projectService: true } },
       rules: { '@typescript-eslint/switch-exhaustiveness-check': 'error' } },
   );
   ```
   Rationale: the ESLint rule requires typed linting; adopting it without
   first migrating off the untyped `recommended` preset either errors at
   startup or silently no-ops, so the config change is two steps, not one.
   Verify: `rg -n --glob 'eslint.config.*' -e 'switch-exhaustiveness-check' .`
   paired with `rg -n --glob 'eslint.config.*' -e 'recommendedTypeChecked' -e 'projectService' .`
   — both must be non-empty together. Run against `grimoire-indexer` and
   `grimoire-vscode` today: both empty (0/2 have the rule; 0/2 are on typed
   linting).
   Severity: **SHOULD** (the idiom itself, MUST; the ESLint enforcement of
   it, SHOULD, given the typed-linting migration cost).

6. **Python: a `match` statement's fallback arm calls `typing.assert_never(x)`
   (3.11+), never a bare `raise`/`pass`, whenever a comment claims the match
   is exhaustive.**
   Rationale: a bare-`raise` wildcard already satisfies pyright's pattern-
   coverage check regardless of `typeCheckingMode` or `reportMatchNotExhaustive`,
   so turning that pyright setting on protects nothing here — the fix is a
   code shape, and it works even without touching pyright config (verified
   under `typeCheckingMode: "standard"`).
   Verify: `rg -n --type py --glob '!external/**' -A1 -e 'case _:' .` then
   check each hit's body for `assert_never(` (compliant) vs `raise`/`pass`/
   anything else (needs the rewrite). Run against `ocx-sdk-python` today: 1/1
   sampled site (`_envmodel.py:169`) uses the non-enforcing `raise` shape.
   Severity: **MUST**.

7. **Classify a mechanism site before shortening its comment: lint/compiler-
   ownable, test-ownable (name the test), or comment-only — and never
   compress a comment-only site past mechanism + breaking edit + consequence.**
   Rationale: the same length-and-ratchet cut applied uniformly would compress
   the 12 comment-only sites (§4) exactly as aggressively as the 24
   test-backed ones, deleting the fleet's only remaining defense at those 12
   sites.
   Verify: reading heuristic against the table in §4 — not mechanizable in
   general, since "does a named test fail on this exact breaking edit"
   requires reading the test body, as `eval-sites.md` already did by hand for
   all 40 sites.
   Severity: **SHOULD** (this rule's automation waits on guard-shape's
   recognizer, a sibling dive).

8. **A shipped grep-based lore check (ERR-19-shaped: "a discard needs an
   adjacent comment") is credited as lint-ownable only for *presence*, never
   for *correctness*, of the rationale it requires.**
   Rationale: OCX-14 shows a check can force an agent to surface a rationale
   without being able to judge whether that rationale is true; crediting the
   site as "fully lint-owned" would understate what a reviewer still has to
   verify by hand.
   Verify: no command distinguishes a true rationale from a false one; this
   is a reading heuristic for whoever reviews a diff that ERR-19 passed.
   Severity: **CONSIDER** (documentation of a limitation, not an enforceable
   rule).

## AI-agent angle

- **Reaches for `#[must_use]` as *the* fix for the RAII-rename footgun.**
  It is not: `let_underscore_drop` already fires on the bare rename with zero
  type annotations, and `#[must_use]` only adds coverage for a different
  mutation (discarding as an expression statement). Smallest check: the
  planted-rename probe in §1 — apply it to any candidate guard type before
  believing `#[must_use]` alone closes the gap.
- **Reaches for `#[expect(clippy::<lint>)]` as the generic "one-line lint
  pointer" pattern, without checking whether the lint currently fires.**
  `#[expect]` requires the lint to be *presently* triggered at that location;
  applied to a guard that is *currently compliant* (OCX-17's still-exhaustive
  match), it fails immediately with `unfulfilled_lint_expectations`. Smallest
  check: `cargo clippy` on the annotated site before committing it — a green
  run with the attribute present proves nothing; a *silent, warning-free*
  run with `#[deny]` in its place is the actual signal.
- **Treats "enable the stricter type-checker setting" as sufficient for
  cross-language exhaustiveness, by analogy with Rust's compiler behavior.**
  Rust's guarantee is structural and needs no setting; Python's and
  TypeScript's need a specific code shape (a `Never`/`never`-typed fallback
  parameter) that a settings change cannot retrofit onto an existing
  catch-all. Smallest check: for Python, `rg -A1 'case _:'` and read the
  body; for TypeScript, `rg -A2 'default:'` inside a `switch` and check the
  branch assigns to (or passes) a `never`-typed value rather than doing
  nothing or logging.
- **Treats adding an ESLint rule name to the `rules` object as the whole
  change**, missing that `switch-exhaustiveness-check` needs typed linting
  first. Smallest check: `rg 'switch-exhaustiveness-check'` and
  `rg 'recommendedTypeChecked\|projectService'` (escaped as
  `-e 'recommendedTypeChecked' -e 'projectService'` per the verification
  command shape) must both hit in the same config file.
- **Marks a compile-time `assert!` as "the guard is now enforced" and stops
  looking.** OCX-04 shows a compile-time check can still leave the actual
  regression (relaxing the checked threshold) completely unenforced. Smallest
  check: for any `const _: () = assert!(X <= N)`-shaped guard, ask "does any
  check fire if `N` itself is edited," not just "does the assert fire on
  overflow" — if the answer is no, the site is comment-only for that edit,
  regardless of the assert's presence.

## Contested / evolving

- **Whether `#[deny]` or a `clippy.toml`/`[lints]` table is the right scope
  for a restriction lint that is only locally sound** (this dive: file/impl-
  scoped `#[deny(clippy::wildcard_enum_match_arm)]`) is not settled fleet
  practice — 0 fleet crates use either mechanism today, so there is no
  existing convention to follow, only the general clippy guidance that
  restriction lints are opt-in precisely because they are not universally
  correct. As of 2026-09-27, clippy's own docs recommend scoping restriction
  lints per-item over enabling them workspace-wide; this dive follows that
  general guidance, not a fleet precedent.
- **`typing.assert_never` vs a bare `case _: raise` is a genuinely recent
  Python idiom** — `assert_never` landed in `typing` in Python 3.11 (2022);
  `ocx-sdk-python` targets `pythonVersion = "3.12"`
  (`repo:ocx-sdk-python:pyproject.toml:85`) so nothing blocks adoption, but
  the fleet's one match site predates any push toward the idiom and nothing
  in the shipped lore rules currently names it.
- **Whether `@typescript-eslint/switch-exhaustiveness-check`'s typed-linting
  requirement is worth the migration cost fleet-wide**, versus adopting the
  plain `never`-parameter idiom (which plain `tsc` already enforces with zero
  ESLint changes) and treating the ESLint rule as optional belt-and-suspenders,
  is a real, unresolved cost/benefit this dive surfaces but does not decide —
  it depends on how much the fleet's TypeScript already relies on typed
  linting for other rules, which is outside this commission's scope.

## Decisions this dive proposes

- **The lints/config the rule tells adopters to enable, per language:**
  Rust — `let_underscore_drop = "warn"` (or `"deny"`) added to
  `[workspace.lints.rust]`, alongside IDIOM-05's existing four; plus, per
  guard-carrying enum match, a locally scoped
  `#[deny(clippy::wildcard_enum_match_arm)]` (never workspace-wide).
  TypeScript — `@typescript-eslint/switch-exhaustiveness-check: "error"`
  under `tseslint.configs.recommendedTypeChecked` with `projectService: true`,
  reserved for repos already paying for typed linting; otherwise the plain
  `never`-parameter idiom with no config change.
  Python — no `pyrightconfig.json`/`[tool.pyright]` change is required (the
  fleet's one site is already under effective strict mode); the fix is
  rewriting `case _: raise ...` to `case _: assert_never(x)`.
  Reason: each config recommendation was verified against a planted violation
  or a real fleet gap, not assumed from the tool's marketing description.

- **A lint- or compiler-owned guard's comment keeps at most a one-line
  pointer naming the lint/attribute, once that lint is actually enabled in
  the crate** (Normative guidance 3). Reason: once a mechanical check
  guarantees the invariant, prose re-deriving the mechanism is pure
  duplication of what `cargo clippy -- -D warnings` (or the equivalent
  `tsc`/`pyright` run) already proves on every CI run; the pointer's only job
  is telling a cold reader *which* check to trust, not re-explaining it.

- **The comment-only residue is a named class the cleanup never shortens
  past mechanism + breaking edit + consequence**: 12/40 sites (30%),
  clustering into five shapes — crash/fault-injection-untestable ordering
  (GRM-04, GRM-06), a check whose bypass evades the check itself (OCX-04), a
  negative-space API contract no test can prove the absence of (OCX-23), a
  posture/direction guard every existing test is compatible with either way
  (OCX-02), and a deliberately-not-optimized decision (OCX-21, `ponytail:`-
  marked). Reason: none of the five shapes is closable by adding a lint or a
  unit test with today's tooling — GRM-04's ordering needs fault injection,
  OCX-23's claim is about what a function is *not*, OCX-02's posture needs a
  test that asserts the *direction* of every error path, not just today's
  inputs. The eval design (a sibling dive) should weight sampling toward this
  class, since reason-recovery matters most exactly where no mechanical
  backstop exists.

## Sources

| URL / path | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [rust-clippy `let_underscore.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs) | Clippy lint source, `master` | fetched 2026-09-27 | Ground truth for what each of the four `let_underscore_*` lints actually matches — the doc comments explicitly scope `let_underscore_lock` to parking_lot only |
| [rust-clippy `matches/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/matches/mod.rs) | Clippy lint source, `master` | fetched 2026-09-27 | `WILDCARD_ENUM_MATCH_ARM` and `MATCH_WILDCARD_FOR_SINGLE_VARIANTS` doc comments, groups and version-introduced |
| [rustc deny-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html#let-underscore-lock) | rustc reference | current | Confirms rustc's *own* `let_underscore_lock` (distinct from clippy's) is deny-by-default and scoped to `std::sync` guard types directly |
| [rustc allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#let-underscore-drop) | rustc reference | current | `let_underscore_drop`'s exact scope (any `Drop`-implementing type) and default level |
| [rust-clippy README](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/README.md) | Clippy project docs | fetched 2026-09-27 | The lint-group default-level table used to correct IDIOM-05's "none on by default" claim |
| [Rust reference — diagnostic attributes](https://raw.githubusercontent.com/rust-lang/reference/master/src/attributes/diagnostics.md) | Language reference | fetched 2026-09-27 | Exact semantics of `#[expect]` (requires the lint to presently fire) and `#[must_use]` (allowed positions, `unused_must_use` trigger) |
| [typescript-eslint `switch-exhaustiveness-check`](https://typescript-eslint.io/rules/switch-exhaustiveness-check/) | Rule docs, v8.70.1 | fetched 2026-09-27 | Default options, typed-linting requirement, flat-config enable snippet |
| [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | Language handbook | fetched 2026-09-27 | Canonical `never`-parameter exhaustiveness idiom, needs no ESLint plugin |
| [`typing.assert_never`](https://docs.python.org/3/library/typing.html#typing.assert_never) | Python stdlib docs | fetched 2026-09-27, added 3.11 | Runtime behavior (raises `AssertionError`) and static-exhaustiveness intent |
| [pyright `configuration.md`](https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md) | Pyright project docs, `main` | fetched 2026-09-27 | `reportMatchNotExhaustive`'s exact default-per-mode table and description |
| `repo:ocx:crates/ocx_util/src/fs/locked_file.rs:29-32` | Fleet source | 2026-09-27 HEAD | `LockedFile` struct definition — confirms no `#[must_use]` |
| `repo:grimoire:src/tui/update_check.rs:371` | Fleet source | 2026-09-27 HEAD | `InFlightGuard` struct definition — confirms no `#[must_use]` |
| `repo:ocx:crates/ocx_oci/src/endpoint.rs:479-493` | Fleet source (OCX-17) | 2026-09-27 HEAD | The actual exhaustive match this dive builds a scratch reproduction of |
| `repo:ocx-sdk-python:src/ocx_sdk/_envmodel.py:169-183` | Fleet source | 2026-09-27 HEAD | The fleet's one Python `match` statement, `case _: raise` shape |
| `.agents/research/code-docs-audit/eval-sites.md` | This program's own harvest | 2026-09-27 | Source of all 40 mechanism sites, their Obv/Test/Elsewhere columns, and the ground truth this dive classifies against |
| `rules/rust-quality/errors.md` (ERR-19) | Shipped lore rule | current | The existing mechanical check that already partially owns OCX-14 |
| `rules/rust-quality/api-and-idioms.md` (IDIOM-05) | Shipped lore rule | current | The existing rule this dive corrects on two of its five lints' default levels |
| Scratch crates `let_underscore_probe`, `wildcard_probe` (this session) | Planted-violation reproductions | run 2026-09-27 | `cargo clippy` output cited verbatim throughout §1–§2 — actual tool runs, not lint documentation alone |
| Scratch pyright probes `case_wildcard_raise.py`, `case_assert_never.py`, `case_no_wildcard.py` (this session) | Planted-violation reproductions | run 2026-09-27, pyright 1.1.414 | `npx pyright` output cited verbatim in §3 — confirms `reportMatchNotExhaustive`'s actual (non-)behavior against the fleet's exact shape |
