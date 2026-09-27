---
title: The Nix Language
summary: The NIX-LANG family, owning rec self-shadowing, string context and path interpolation, impure builtins under pure evaluation, mixed-rec merges across CppNix and Lix, the shallow `//`, scope-wide `with`, JSON inspection of derivations, and how an evaluation error is keyed before it is diagnosed
---

# The Nix Language

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns the expression language itself: when `rec` and `let` bindings shadow
themselves, how a path or a derivation becomes a build dependency through
string context, which builtins pure evaluation silences, which attribute-set
shapes Lix rejects, what `//` and `with` hide, and how an evaluation error is
keyed before anyone matches its text. The flake output schema, the systems list
and `pkgs.system` are `NIX-FLK`, including eval-time reads through a source
path (NIX-FLK-07). `src` filtering and `finalAttrs` are `NIX-PKG`. The deadnix,
statix, URL-literal, build and Lix gates themselves are `NIX-GATE`. Warnings and
`abort-on-warn` are `NIX-REL`. Secrets read from the environment are `NIX-SEC`.
Choosing idioms by era is NIX-CORE-04 in the index. The verbatim error catalog
and the localization steps are the `nix-diagnose` skill.

Contents: [Dates and Floors](#dates-and-floors) · [Self-Shadowing: deadnix and a Forced Value](#self-shadowing-deadnix-and-a-forced-value) ·
[String Context: the Sandboxed Build](#string-context-the-sandboxed-build) ·
[Impure Builtins and Scope-Wide with: Greps](#impure-builtins-and-scope-wide-with-greps) ·
[Mixed rec Merges: the Lix Leg](#mixed-rec-merges-the-lix-leg) ·
[Value Checks No Tool Makes](#value-checks-no-tool-makes) ·
[Keying an Evaluation Error](#keying-an-evaluation-error) · [Applied Evidence](#applied-evidence-held-out-round-2026-09-27) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Every command was re-run on 2026-09-27 against planted violations and their
compliant twins (flakes committed to the index with `git add -A`, built-in
`derivation` only, so no nixpkgs fetch was needed and the store was warm for
the one Lix fetch). The rows assume:

- **CppNix 2.35.2** runs the gate. CppNix 2.31.5 (the consumer floor) behaves
  the same on every row measured here.
- **Lix 2.95.2** is the only implementation that rejects mixed-`rec` merges
  (NIX-LANG-05). CppNix through 2.35.2 accepts all four shapes silently
  (re-check at each CppNix and Lix release). Determinate Nix is untested.
- **deadnix 1.3.2** with `--no-lambda-pattern-names` (`-L`), the NIX-GATE-05
  invocation. It misses the pattern-formal shape of NIX-LANG-01.
- **nixf-diagnose 0.1.4** is not a check for any row here: `merge-diff-rec`
  misses the Lix release note's own example, and nothing flags `//` over `rec`.
- **`lint-url-literals`** needs Nix 2.34 or later and is NIX-GATE-06's. Below
  2.34 the option is unknown and the eval still exits 0.
- **Pinned default (Q6, adopter overrides once):** CppNix is gated, the Lix leg
  is advisory. **Pinned default (Q-LANG-1):** the Lix leg does not block on
  NIX-LANG-05 alone. The rule is an authoring MUST that review enforces and the
  advisory leg reports. **Pinned default (Q-LANG-2):** list-scoped
  `with pkgs; [ … ]` is tolerated.

Every grep below is a locator: empty output with exit 1 is the pass, and a hit
with exit 0 is a site to read. Every `.#…` attribute is the fixture's example,
so substitute your own.

## Self-Shadowing: deadnix and a Forced Value

```sh
deadnix --fail --no-lambda-pattern-names .
nix eval --json .#lib.settings
```

deadnix: exit 0 with no output is the pass, exit 1 with `Unused let binding`
or `Unused lambda argument` is the finding. `nix eval`: exit 1 with
`infinite recursion encountered` is the finding.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-01 | Never give an attribute inside a `rec { }` (or a `let`) the same name as an outer binding it is meant to read, whether that binding is a `let`, a positional argument or a pattern formal. Rename the outer binding (`baseSettings`). | Inside `rec`, `settings = settings // { … }` reads itself, so it fails with `infinite recursion encountered` the moment it is forced. A plain `rec` without shadowing is fine. | deadnix (above) catches the `let` and positional shapes: watched red, exit 1 with `Unused let binding: settings` and `Unused lambda argument: settings`, and green on the renamed twin, exit 0. The pattern-formal shape passes deadnix (exit 0, the gap), so force the value with `nix eval --json .#lib.settings`: watched red, exit 1, and green on the twin, exit 0 with `{"a":1,"b":2}`. nixf's `sema-extra-rec` checks the opposite case and is no substitute. | all implementations, deadnix ≥1.1 (measured on 1.3.2), CppNix 2.35.2 and 2.31.5 | MUST, shapes A-E. |

```nix
# wrong: inside rec, `settings` names the attribute itself, so forcing it recurses
{ settings, ... }:
rec {
  settings = settings // {
    b = 2;
  };
  flags = settings.b;
}
```

```nix
# right: the outer binding has its own name
{ baseSettings, ... }:
rec {
  settings = baseSettings // {
    b = 2;
  };
  flags = settings.b;
}
```

## String Context: the Sandboxed Build

```sh
nix build --no-link -L .#default
nix eval .#packages.x86_64-linux.default.dataPath --apply builtins.hasContext
grep -rn -E -e 'unsafeDiscardStringContext' -e 'toString +\.{1,2}/' --include='*.nix' .
```

The build is the NIX-GATE-10 build with the sandbox on (the Linux default).
Exit 1 naming a missing `/nix/store/…-source/…` path is the finding. The
`hasContext` eval must print `true` for any string that reaches a builder. The
grep is a reading prompt, not a gate, because names, attribute keys and prefix
arithmetic legitimately drop context.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-02 | For build-time references, reach a local file or a derivation output inside a builder, `src` or any derivation attribute only through interpolation (`"${./file}"`, `"${drv}"`) or `lib.fileset.toSource`, never through `toString ./path` or `builtins.unsafeDiscardStringContext`. Use those two only for strings that never reach a builder. Eval-time reads use the source-tree path (NIX-FLK-07). | String context is how Nix records dependencies ([manual, String context](https://nix.dev/manual/nix/2.35/language/string-context)). A context-free store path adds no input, so the sandbox lacks it, and off-sandbox the build silently depends on whatever the host holds. `toString` is the fix agents reach for, and it produces exactly this failure. | Build: watched red, exit 1 with `can't open /nix/store/…-source/data/a.txt: no such file` (busybox sh, coreutils prints `No such file or directory`), green on the interpolated twin, exit 0. `hasContext`: `false` on the `toString` twin, `true` on the interpolated one. Grep: a hit on the `toString` twin (exit 0), empty on the interpolated one (exit 1). | all implementations, sandbox on, CppNix 2.35.2 and 2.31.5 | MUST, shapes A-E. |
| NIX-LANG-03 | Do not interpolate a whole directory (`"${./.}"`, `"${../..}"`, `"${./subdir}"`) to obtain a string or to use a few files from it. Filter with `lib.fileset.toSource` (the NIX-PKG `src` rule) when a build needs some files, and use `toString` when no build needs the string. | Interpolation copies the whole tree into a separate store object named after the directory ([manual, Path](https://nix.dev/manual/nix/2.35/language/types)): 272 KB to deliver a 56-byte file. Outside a flake it copies untracked files too. | `nix eval .#lib.label`. A result shaped `/nix/store/…-data` (named after the directory) is the separate copy, while `/nix/store/…-source/data` is not. Watched: the interpolated form printed `…-data`, the `toString` twin `…-source/data`, both exit 0, so the signal is the value. Then `du -sh` the copy. | CppNix 2.35.2 | SHOULD, shapes A-E. Exception: a test comparing one small file's content. |

```nix
# wrong: a context-free string, so the sandbox lacks the path
{ runCommand }:
runCommand "report" { } ''
  cp ${toString ./data}/a.txt $out
''
```

```nix
# right: interpolation carries the context that makes ./data an input
{ runCommand }:
runCommand "report" { } ''
  cp ${./data}/a.txt $out
''
```

## Impure Builtins and Scope-Wide with: Greps

```sh
grep -rn -e '<nixpkgs' -e 'currentSystem' -e 'getEnv' -e 'nixPath' --include='*.nix' .
grep -rn -E -e '^with lib[[:space:]]*;[[:space:]]*$' -e '^with lib[[:space:]]*;[[:space:]]*[^[[:space:]]' -e '^with pkgs[[:space:]]*;[[:space:]]*$' -e '^with pkgs[[:space:]]*;[[:space:]]*[^[[:space:]]' -e '^with builtins[[:space:]]*;[[:space:]]*$' -e '^with builtins[[:space:]]*;[[:space:]]*[^[[:space:]]' --include='*.nix' .
```

Empty output with exit 1 passes both. A first-grep hit in a root `default.nix`,
`shell.nix` or `release.nix` compatibility shim, or in an option description,
is tolerated after reading.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-04 | Keep `builtins.getEnv`, `builtins.nixPath`, `builtins.currentSystem` and lookup paths (`<nixpkgs>`) out of anything reachable from `outputs`. The system comes from the systems list (NIX-FLK-08). Configuration comes from inputs, or at run time from the built program, never from evaluation. Tolerated only in compatibility shims and in devShell script strings that pass `--impure` explicitly. Secret placement for the same construct is NIX-SEC-04. | Pure evaluation disables them, and two fail silently: `getEnv` returns `""` and `nixPath` returns `[ ]`, both exit 0. `currentSystem` (`attribute 'currentSystem' missing`) and `<nixpkgs>` fail loudly. The usual "fix", `--impure`, makes outputs depend on the host. | The first grep: watched red, four hits (exit 0), green on the twin (exit 1). The authority is the value: `nix eval --json .#lib.home` printed `""` with exit 0, which is the silent finding, and `.#lib.sys` exited 1. One grep serves NIX-SEC-04 too. | flakes (pure by default), CppNix 2.35.2 and 2.31.5 | MUST, shapes A-E. |
| NIX-LANG-07 | Do not write `with lib;`, `with pkgs;` or `with builtins;` as a standalone statement at file or module scope. Qualify names (`lib.optional`) or use `inherit (lib) optional;`. Tolerated: list-scoped `with pkgs; [ … ]` (pinned default, Q-LANG-2) and single-expression `with lib.types;`, `with lib.licenses;` or `with lib.maintainers;`. | A scope-wide `with` hides every name from static analysis ([nix.dev best practices](https://nix.dev/guides/best-practices)) and turns a typo into a lazy error: under `with`, an undefined name evaluates green until something forces it, while without `with` the whole file fails. nixpkgs' own `pkgs/` tree carries it in 38 of 40,298 files, `nixos/modules/` in 401 of 2,490 (nixpkgs 26.11pre). | The second grep binds column 0, where file and module scope sit (`with lib;` alone, `with lib; let`, `with pkgs; mkShell {`), and skips a `[` right after the `;`. nixfmt's nested shape passes: an indented `with lib;` on its own line under `default =` or `a: b:`. An inline module inside a list indents its `with` too and is found by reading. Watched red, five hits (exit 0), green on a twin holding those nested lines, a column-0 `with pkgs; [ … ]` and `with lib.types;`, with the set installed under `.claude/` (exit 1). | any | SHOULD, shapes A-E. A finding in new code, existing NixOS-style modules migrate opportunistically. |

## Mixed rec Merges: the Lix Leg

```sh
nix shell --inputs-from . nixpkgs#lix --command nix eval --file m1.nix
```

Run it from the flake root, so that `nixpkgs#lix` resolves to the locked
nixpkgs. A flake with no input named `nixpkgs` falls back to the global
registry's `nixpkgs-unstable` (watched 2026-09-27 on flake-utils).

Exit 0 is the pass. Exit 1 with `cannot be merged, because one set is marked as
recursive and the other isn't` is the finding. For a flake, the NIX-GATE-16 Lix
leg runs the same evaluator over every output.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-05 | Never give one attribute path both a `rec { }` definition and a non-`rec` one in the same attribute set. This covers `foo = rec { … }; foo.b = …;` in either order and two `foo = …` literals of different `rec`-ness. Write the whole value once. | Lix 2.95 rejects it ([release note](https://lix.systems/blog/2026-03-25-lix-2.95-release/): "the recursive attribute may get lost"). CppNix accepts it with implementation-defined semantics, so a CppNix-only author never sees it. Generators that emit dotted keys next to a `rec` block are the usual source. | Watched red on all four shapes under Lix 2.95.2 (exit 1), and on the same files CppNix 2.35.2 exits 0 with `{ foo = { a = 1; b = 2; }; }`. The single-definition twin exits 0 on both. nixf `merge-diff-rec` is not the check, because it misses the `foo = rec { … }; foo.b = …;` shape. | Lix ≥2.95 rejects, CppNix through 2.35.2 accepts (re-check at each Lix release) | MUST, shapes A-E, hardest for B, C and D, which other people's evaluators consume. Enforced by review (pinned default, Q-LANG-1). |

## Value Checks No Tool Makes

```sh
nix eval .#lib.version
nix eval --json .#packages.x86_64-linux.default --apply 'p: { inherit (p) pname version; }'
```

Both exit 0 on the violation and the twin. The signal is the printed value.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-06 | Treat `//` as a shallow replace. Use `lib.recursiveUpdate` when the right side sets a nested attribute set the left side also sets and the intent is a merge. Never expect `//` to re-derive values a `rec` (or a `let`) computed from the replaced keys: merge first, then derive, or use a fixed point (`finalAttrs`, NIX-PKG-14). | `base // { minor = 9; }` over `rec { minor = 0; version = "1.${toString minor}"; }` keeps `version = "1.0"` on every implementation. `//` also drops `foo.baz` whenever the right side sets `foo` (the nixpkgs doctest for `recursiveUpdate`). | A reading heuristic: "a `//` whose right side sets a key whose left value is an attribute set, or is read by a derived value". No linter catches it. Where a value is testable, `nix eval .#lib.version`: watched `"1.0"` on the `//` form and `"1.9"` on the derive-after twin. | CppNix 2.35.2, 2.31.5 and Lix 2.95.2 alike | SHOULD, shapes A-E. |
| NIX-LANG-11 | Never inspect a derivation, or anything carrying `outPath`, with `nix eval --json` and read the result as the whole value. Select fields (`.#default.pname`), project them with `--apply 'p: { inherit (p) pname version; }'`, or use `nix repl`. | The JSON encoder collapses any attribute set with `outPath` to that one string and drops every other field silently, so the agent reports "meta is missing". | Watched: plain `nix eval --json .#packages.x86_64-linux.default` printed a bare `"/nix/store/…-hello-1.0"`, and the projected command above printed `{"pname":"hello","version":"1.0"}`. An object is the pass. | CppNix 2.35.2 and 2.31.5 | SHOULD, shapes A-E. |

## Keying an Evaluation Error

```sh
nix --version
nix eval --show-trace .#lib.greeting
```

Read by the `nix-diagnose` skill, which owns the verbatim catalog and the
steps. NIX-LANG-09 (localization order) is retired into that skill and the number is not reused.

| ID | Rule | Rationale | Verification | Floor / impl | Severity |
|---|---|---|---|---|---|
| NIX-LANG-08 | Before matching any Nix error string, record `nix --version` (implementation and version, NIX-CORE-04) and the input shape (flake output check, fetcher, module, per-system helper, lock). Look the error up by shape, implementation and version range, and only then by string. Re-run an old upstream issue's repro on the pinned version before citing it. | The same fault prints different text across implementations and versions: `points outside of its parent's store path` (CppNix 2.20 and Lix 2.95.2, re-check at each Lix release) against `access to absolute path … is forbidden` (CppNix 2.31.5 and 2.35.2, naming `/nix/store/sibling` on 2.31.5 and `/nix/store/sibling/flake.nix` on 2.35.2, re-watched 2026-09-27), `follow cycle detected` (CppNix) against `stack overflow (possible infinite recursion)` (Lix), and Lix exits 0 where CppNix rejects `formatter`, overlay-arity and `apps` errors. | A reading heuristic over the diagnosis transcript: `nix --version` precedes the first catalog lookup. It constrains the procedure, not a file, so no command can go red on it. | n/a, exists because of version drift | MUST, shapes A-E. |
| NIX-LANG-10 | Classify an `infinite recursion encountered` by shape before changing anything. (a) An overlay reads `final.x` to define `x`: read `prev.x`. (b) `imports` is computed from `config`: make `imports` unconditional and put `mkIf` inside `config`. (c) A per-system helper indexes its own unfinished result, or bootstraps an unsupported system: build the set once, or drop that system. (d) The trace ends inside the nixpkgs source: upstream, so leave the systems list alone. (e) A `rec` shadows a binding: NIX-LANG-01. Never apply a generic fix (delete a system, delete the overlay, rename `final:` to `self:`). | One string covers five causes with incompatible fixes. Renaming `final:` to `self:` also breaks the NIX-FLK-02 overlay check. | `nix eval --show-trace .#lib.greeting`: the innermost `at` frame in your own files picks the shape, and a frame under the nixpkgs store path is (d). Watched: the (a) plant exited 1 with the frame on the `final.greeting` line, the `prev.greeting` twin exited 0 with `"hi!"`. | all implementations, the (b) hint needs nixpkgs 26.11pre or later | MUST, shapes A-E. |

## Applied Evidence (held-out round 2026-09-27)

- add to Applied: numtide/devshell@a67c0f87b63b violates NIX-LANG-04 at nix/mkNakedShell.nix:24 (builtins.getEnv "IN_NIX_SHELL" reachable from devShells through modules/devshell.nix:39, "" under pure evaluation, C9)
- add to Applied: ryantm/agenix@654f73179924 violates NIX-LANG-07 at modules/age.nix:8 (file-scope with lib;, C4)

## What Agents Get Wrong Here

1. **The generic fix for "infinite recursion"**: delete a system, remove the overlay, rename `final:` to `self:`. Classify with `--show-trace` first (NIX-LANG-10).
2. **"Fixing" a string-context error with `toString` or `unsafeDiscardStringContext`.** It evaluates, then fails only in the sandbox, or passes silently off it. Run the sandboxed build and `hasContext` (NIX-LANG-02).
3. **Reading `$GITHUB_TOKEN` or `$HOME` with `builtins.getEnv` in a flake.** It gets `""` with exit 0 and carries on, then adds `--impure` to "fix" `currentSystem` (NIX-LANG-04, NIX-SEC-04).
4. **Matching a remembered error string without the version.** `points outside of its parent's store path` is the CppNix 2.20 and Lix 2.95.2 wording, while CppNix 2.31.5 and 2.35.2 print `access to absolute path … is forbidden` for the same `path:../` input (re-check at each Lix release, NIX-LANG-08).
5. **Treating a green `nix flake check --no-build` as proof about idioms.** None of the idiom plants trip it. Run deadnix, a real build and the Lix leg.
6. **Copying a standalone `with pkgs;` or `with lib;` from an older NixOS module**, which hides typos until forced (NIX-LANG-07).
7. **Emitting `foo = rec { … }; foo.bar = …;` from a generator or a refactor.** Green on CppNix, red for every Lix consumer, and nixf misses it (NIX-LANG-05).
8. **Expecting `//` to deep-merge or to re-derive `rec` fields** (NIX-LANG-06).
9. **`nix eval --json` on a package "to inspect it"** (NIX-LANG-11).
10. **Wiring `--option abort-on-warn true` into a whole-flake gate** "for strictness". That scope is NIX-REL-11's.
