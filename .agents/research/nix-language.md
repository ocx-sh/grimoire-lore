---
title: "The Nix language: idioms, string context, and evaluation-failure localization (NIX-LANG)"
topic: nix-language
model: opus
id_family: NIX-LANG
consolidates:
  - nix-language/idioms-and-scope.md
  - nix-language/evaluation-failures.md
  - nix-audit/exemplar-flake-shape.md (§4)
  - nix-audit/exemplar-tool-runs.md (Axis 3, Axis 5, Axis 7)
  - nix-audit/ocx-index-and-fleet.md (consumer (b) only, via NIX-GEN)
  - nix-topic-map.md (section C rows M-C-01..16, M-K-03; conflict 20; wave-4 dive briefs)
date: 2026-09-27
era: "CppNix 2.35.2 (run.sh); CppNix 2.34.8 and 2.31.5 and Lix 2.95.2 from the pinned nixpkgs 26.11pre rev 8d5d2709; nixf-diagnose 0.1.4; deadnix 1.3.2"
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-language/ (this consolidation), fixtures/idioms-and-scope/, fixtures/evaluation-failures/
---

# The Nix language (NIX-LANG)

## Verdict

1. **String context is the language rule that matters most, and the dive's fix was wrong.** A path or derivation becomes a build dependency only through interpolation (`"${./data}"`, `"${drv}"`). `toString ./data` gives a context-free string, and so does `unsafeDiscardStringContext`. Splice either into a builder and the sandbox build fails with `No such file or directory`. On a host that already holds the path, the build instead passes silently without the dependency. idioms-and-scope recommended `toString` as the fix for path interpolation. A run here overturned that (conflict 2). This binds every shape.
2. **Impure builtins are a MUST, not a measured absence.** Under pure flake evaluation, `builtins.getEnv` returns `""` and `builtins.nixPath` returns `[ ]`, both with exit 0. `currentSystem` and `<nixpkgs>` fail loudly. So the silent pair is the danger. For the generated flake (D) it rules out reading a registry token from the environment.
3. **Lix portability is a language rule.** Never give one attribute path both a `rec` definition and a plain one. CppNix 2.31.5 and 2.35.2 accept all four shapes planted here. Lix 2.95.2 rejects all four. nixf misses the exact shape in the Lix release note. The check is a Lix eval leg, never nixf. This binds library, module and generated flakes (B, C, D) hardest, because other people's evaluators consume them.
4. **Most language hazards are caught by gates that already exist.** Point to those gates rather than adding new tools. deadnix (NIX-GATE-05) catches `rec` self-shadowing in the `let` and positional-argument shapes. A sandboxed build (NIX-GATE-10) catches lost string context. The Lix advisory leg (NIX-GATE-16) catches mixed-`rec` merges. `nix flake check --no-build` catches none of the eight idiom fixtures.
5. **`with` and `//` are SHOULD-level reading rules.** Standalone `with lib;`, `with pkgs;` or `with builtins;` at file or module scope is a finding. The reason is measured: an undefined name under `with` stays silent until something forces it. List-scoped `with pkgs; [ … ]` and single-expression `with lib.types;` are tolerated (map conflict 20 confirmed). `//` is shallow and never re-derives `rec` values. That is a reading heuristic with a value check, and no linter catches it.
6. **Diagnosis is keyed by shape, implementation and version, never by the error string alone** (class C20: seven measured string splits). The 46-row verbatim catalog stays skill-only (`nix-diagnose`). The rule set keeps only the procedure (LANG-08..11). "Infinite recursion encountered" has at least five causes, and each has a different fix.
7. **Dropped as duplicates:** `abort-on-warn` scoping (owned by NIX-REL-11), URL literals (owned by NIX-GATE-06, whose version floor this consolidation corrects to 2.34), `mkDerivation rec` (NIX-PKG-14), and `pkgs.system` (NIX-FLK-12).

### Conflicts resolved

1. **The version floor for `lint-url-literals`.** NIX-GATE-06 says Nix ≥2.35; idioms-and-scope §9 says 2.34. **Measured (C8):** CppNix 2.34.8 exits 1 with `URL literals are disallowed… (lint-url-literals)`. CppNix 2.31.5 prints `warning: unknown setting 'lint-url-literals'` and evaluates the URL literal with **exit 0**. **Resolved:** the floor is **2.34**. Below it the flag does nothing and still exits 0 (class C9), so use it only on the CI-pinned Nix and never as a consumer-floor check. NIX-GATE-06's floor note should read 2.34.
2. **`toString ./dir` as the fix (idioms LANG-04).** The dive only checked `toString` outside a flake. **Measured (C4, C5):** inside a flake, `toString ./data` returns `/nix/store/…-source/data` with `builtins.hasContext` = `false`. In a `runCommand` it fails the sandbox build, `cat: /nix/store/r93z…-source/data/a.txt: No such file or directory`, exit 1. The twin `${./data}` has context `true` and builds, exit 0. **Resolved:** interpolation is the correct way to reference a file in a build. Use `toString` only for strings that never reach a builder (LANG-02, LANG-03).
3. **"No static tool flags self-shadowing" (idioms §1).** **Measured (C1):** `deadnix --fail --no-lambda-pattern-names` reports `Unused let binding: settings` on the `let` shape and `Unused lambda argument: settings` on the positional-argument shape. It exits 0 on the pattern-formal shape (`{ settings, ... }: rec { settings = settings // …; }`). nixf reports that shape only as `sema-unused-def-lambda-noarg-formal`, which NIX-GATE-07 tells you to suppress. **Resolved:** the MUST gate catches two of the three shapes. Forcing the value catches the third.
4. **nixf's `merge-diff-rec` as the check for `//` over `rec` (idioms §3, LANG-03).** **Measured (C2, C3):** nixf-diagnose exits 0 on `rec-merge-bad` (`//` over `rec`). On the four mixed-`rec` shapes it fires `merge-diff-rec` on three of them (m2–m4) but **not** on m1, `{ foo = rec { a = 1; }; foo.b = 2; }`, which is the Lix release note's own example and the dive's fixture. **Resolved:** nixf checks neither construct reliably. The `//` drift stays a reading heuristic (LANG-06), and the mixed merge is checked by the Lix leg (LANG-05).
5. **"No corpus instance of `unsafeDiscardStringContext`" (idioms, Exemplar evidence).** **Measured here:** more than 20 occurrences exist, for example `ipetkov/crane@73b980519cef:lib/mkDummySrc.nix:100,141,349`, `lib/crateNameFromCargoToml.nix:29`, `Mic92/sops-nix@2bd00bd9bb35:flake.nix:21`, `nix-community/home-manager@7b4c5ec4beda:modules/programs/codex/lib.nix:46,59,64`. All are used for names, attribute keys, prefix arithmetic, `fromTOML` of content, or `getFlake` paths. None is spliced into a builder. **Resolved:** the rule's scope ("never on a string that reaches a builder") is confirmed, and the grep is a reading prompt, not a gate.
6. **Row M-C-12's premise (the map): "Nix's lazy runtime error reports [undefined variables] only when forced."** **Measured (evaluation-failures rows 5–6):** with no enclosing `with`, the error is static and fires for *every* attribute of the file. Only under a `with` does it wait until the value is forced (`.#onlyX` exit 0, `.#forceY` exit 1). **Resolved:** this becomes the measured rationale for LANG-07 (a `with` hides typos). It is not a separate rule.
7. **What M-C-13's "rec-merge" means (map line 1708, "`//` over `rec`" routed as the Lix row).** Two different constructs are involved. `base // { minor = 9; }` over a `rec` base gives `"1.0"` on CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2 alike, so it is portable, only surprising. The implicit attribute-path merge of mixed `rec` is the Lix-only rejection. **Resolved:** these are two rules (LANG-06 SHOULD and LANG-05 MUST).
8. **idioms LANG-08 (`abort-on-warn` scope).** It restates NIX-REL-11 word for word. **Resolved:** dropped, and NIX-REL-11 is cited.
9. **`with lib;` flagged or not.** idioms LANG-02 flags standalone `with lib;`, but its own AI-agent angle says "do not extend the same flag to `with lib;`". **Measured here:** in `NixOS/nixpkgs@9cab9ed832c3`, 38 of 40,298 `pkgs/` files and 401 of 2,490 `nixos/modules/` files carry a standalone `with lib;` or `with pkgs;` line. The package tree has almost eliminated it, and the module tree lags. **Resolved:** a standalone `with lib;` is flagged like `with pkgs;` (SHOULD). Only the single-expression `with lib.types;`, `with lib.licenses;` and `with lib.maintainers;` forms are exempt.
10. **idioms LANG-06 ("measured absence, nothing to plant").** **Measured (C6):** a planted flake returns `""` for `getEnv "HOME"` and `[ ]` for `nixPath`, both with exit 0. **Resolved:** this is promoted to MUST, because two of the four constructs fail silently.
11. **The helix citation.** evaluation-failures row 3 quotes `helix-editor/helix@079a789e8cb0:flake.nix:19` as `flake-utils.lib.eachSystem …`. The line actually reads `eachSystem = lib.genAttrs lib.systems.flakeExposed;`. The fault (recursion on `x86_64-freebsd` under `--all-systems`, [runs](nix-audit/exemplar-tool-runs.md) Axis 3) stands, and the citation is corrected.
12. **An amendment, not a conflict.** evaluation-failures row 12 shows that Lix 2.95.2 also accepts an `apps` entry with an unknown attribute (exit 0; CppNix 2.31.5 and 2.35.2 exit 1). NIX-FLK-19's list of Lix leniency gaps grows to three: `formatter`, overlay arity and `apps`.

## The ruleset

Severity follows the program's convention. **MUST** needs a normative or measured source and a verification watched red here or in a sub-artifact, or an explicit statement of why it can only be a reading heuristic. **SHOULD** allows a known exception class. **CONSIDER** depends on context. "C n" refers to this consolidation's runs (table at the end of this section). "IS n" is idioms-and-scope's *Verification runs* row n, and "EF" is evaluation-failures'. Rules owned elsewhere are cited, not restated: NIX-REL-11 (`abort-on-warn`), NIX-GATE-05/06/07/10/16, NIX-PKG-14 (`finalAttrs`), NIX-FLK-07 (eval-time reads through `${src}`), NIX-FLK-12 (`pkgs.system`), NIX-INP-10 (builtin fetchers).

### NIX-LANG — A. Caught by deadnix (NIX-GATE-05) and by forcing the value

**NIX-LANG-01 — Never give an attribute inside a `rec { }` (or a `let`) the same name as an outer binding it is meant to read, whether that binding is a `let`, a positional argument or a pattern formal. Rename the outer binding (`baseSettings`) instead.**
- Rationale: inside `rec`, `settings = settings // { … }` reads itself, so it fails with `error: infinite recursion encountered` as soon as it is forced. This is the canonical nix.dev footgun. A plain `rec` without shadowing is otherwise acceptable (CONSIDER, map conflict 20).
- Verification: (1) `deadnix --fail --no-lambda-pattern-names <dir>` flags the `let` and positional shapes as unused bindings. (2) For the pattern-formal shape, which deadnix `-L` does not see, force the value with `nix eval --json <flake>#<attr>`. nixf's `sema-extra-rec` checks the opposite case (a `rec` that is not needed), so it is not a substitute.
- Watched red: **yes**. C1: deadnix on `shadow/let-bad.nix` exit 1 (`Unused let binding: settings`), on `arg-bad.nix` exit 1 (`Unused lambda argument`), on `let-good.nix` exit 0, and on `pattern-bad.nix` exit 0, which is the gap. `nix eval` on `let-bad` and `pattern-bad` exits 1 with infinite recursion, and on `pattern-good` exits 0. IS 1: `self-shadow-bad` 1, `-good` 0.
- Severity: **MUST**. Floor: none (all implementations). deadnix ≥1.1.

### NIX-LANG — B. Caught by a sandboxed build (NIX-GATE-10) and `builtins.hasContext`

**NIX-LANG-02 — Reference a local file or a derivation output inside a builder, `src` or any derivation attribute only through interpolation (`"${./file}"`, `"${drv}"`) or `lib.fileset.toSource`. Never through `toString <path>` or `builtins.unsafeDiscardStringContext`. Use those two only for strings that never reach a builder: names, attribute keys, log messages, prefix arithmetic.**
- Rationale: string context is how Nix records dependencies (Nix 2.35 manual, *String context*). A context-free store path adds no `inputDrvs`/`inputSrcs`. The sandbox then lacks the path, and without the sandbox the build silently depends on whatever the host holds. The dive's own fix for LANG-03 (`toString`) produced exactly this failure (conflict 2).
- Verification: `nix build --no-link -L <flake>#<pkg>` with the sandbox on (the NIX-GATE-10 build), watched for `No such file or directory` on a `/nix/store` path. For a value, `nix eval <flake>#<attr> --apply builtins.hasContext` must print `true` for anything that reaches a builder. A reading prompt that is not a gate: `grep -rn -E -e 'unsafeDiscardStringContext' -e 'toString +\.{1,2}/' --include='*.nix' <dir>`. Hits need reading, because legitimate uses exist (conflict 5).
- Watched red: **yes**. C5: `path-build-tostring-bad` exit 1 (`cat: /nix/store/r93z…-source/data/a.txt: No such file or directory`, and only the consumer `.drv` is listed to build), `path-build-interp-good` exit 0. IS 3: `string-context-bad` exit 1, `-good` exit 0. C4: `hasContext` is `true` for interpolation and `false` for `toString`. C7: the grep hits on both bad twins (exit 0) and is empty on both good twins (exit 1).
- Severity: **MUST**. Floor: none. The sandbox must be on (the default on Linux).

**NIX-LANG-03 — Do not interpolate a whole directory (`"${./.}"`, `"${../..}"`, `"${./subdir}"`) just to obtain a string or to use a few files from it. Filter with `lib.fileset.toSource` (the NIX-PKG `src` rule) when a build needs some files. Use `toString` when no build needs the string.**
- Rationale: interpolation copies the whole tree into a separate store object named after the directory (Nix 2.35 manual, *Path* type). Measured: 272 KB copied to deliver a 56-byte file. Inside a flake it is a second copy, `…-data`, next to `…-source`. Outside a flake it copies the working tree with everything untracked in it.
- Verification: `nix eval <flake>#<attr>`. A result shaped `/nix/store/<hash>-<dirname>` (not `…-source/<dirname>`) means a separate copy was made. Then use `du -sh` on it.
- Watched red: **yes**. IS 2: `path-interp-bad` → `/nix/store/jfq9…-subdir`, 272K. C4: in a flake, `interp` → `/nix/store/ii6z…-data`, while `tostr` → `/nix/store/1zic…-source/data`. The signal is the output value, not the exit code.
- Severity: **SHOULD**. Exception: a test that must compare one small file's content (home-manager's `"${./one.json}"` in tests).

### NIX-LANG — C. Caught by a grep over flake-reachable files, backed by a pure eval

**NIX-LANG-04 — Keep `builtins.getEnv`, `builtins.nixPath`, `builtins.currentSystem` and lookup paths (`<nixpkgs>`) out of anything reachable from `outputs`. The system comes from the systems list (NIX-FLK-08). Configuration and secrets come from inputs, or at run time from the built program, never from evaluation. They are tolerated only in `default.nix`, `shell.nix` or `release.nix` compatibility shims, and in devShell script strings that pass `--impure` explicitly.**
- Rationale: pure evaluation disables them, and two fail **silently**. `getEnv` returns `""` and `nixPath` returns `[ ]`, both with exit 0. `currentSystem` (`attribute 'currentSystem' missing`) and `<nixpkgs>` fail loudly. The usual "fix", `--impure`, makes outputs depend on the host.
- Verification: `grep -rn -e '<nixpkgs>' -e 'currentSystem' -e 'getEnv' -e 'nixPath' --include='*.nix' <dir>`, excluding the shim names and option-description strings. Empty output passes. The authority is `nix eval <flake>#<attr>`: a `""` or `[ ]` where a value was expected is the silent failure.
- Watched red: **yes**. C6: `pure-impure#home` → `""` exit 0, `#nixPath` → `[ ]` exit 0, `#sys` exit 1, `#np` exit 1. C7: the grep prints four hits on `pure-impure` (exit 0) and nothing on `path-interp-flake` (exit 1). Corpus: 2 hits in `flake.nix` files, both tolerated (idioms §6).
- Severity: **MUST**. Floor: flakes (pure evaluation by default), all implementations.

### NIX-LANG — D. Caught by the Lix eval leg (NIX-GATE-16)

**NIX-LANG-05 — Never give one attribute path both a `rec { }` definition and a non-`rec` one in the same attribute set. This covers `foo = rec { … }; foo.b = …;` in either order and two `foo = …` literals of different `rec`-ness. Write the whole value once.**
- Rationale: Lix 2.95 forbids it (release note: "the recursive attribute may get lost (order-dependent)"), with `error: attribute 'foo.b' cannot be merged, because one set is marked as recursive and the other isn't`. CppNix accepts it silently with implementation-defined semantics, so a CppNix-only author never sees it. Generators that emit dotted keys next to a `rec` block are the likely source (M-C-13).
- Verification: `nix shell nixpkgs#lix --command nix eval --file <file>` (or `nix flake check --no-build` through the same shell) must exit 0. nixf's `merge-diff-rec` is **not** the check, because it misses the m1 shape (conflict 4).
- Watched red: **yes**. C3: m1–m4 exit 1 on Lix 2.95.2 and 0 on CppNix 2.35.2. `good.nix` exits 0 on both. IS 6: the same split on CppNix 2.31.5.
- Severity: **MUST** (B, C, D; A as well, since the fix costs nothing). Floor: Lix ≥2.95. CppNix through 2.35.2 does not detect it.

### NIX-LANG — E. Reading heuristics with a value check

**NIX-LANG-06 — Treat `//` as a shallow replace. Use `lib.recursiveUpdate` when the right side sets a nested attribute set that the left side also sets and the intent is a merge. Never expect `//` to re-derive values that a `rec` (or a `let`) computed from the replaced keys: merge first, then derive, or use a fixed point (`finalAttrs`, NIX-PKG-14).**
- Rationale: `base // { minor = 9; }` over `rec { minor = 0; version = "${…minor}"; }` keeps `version = "1.0"` on every implementation. `//` also drops `foo.baz` whenever the right side sets `foo` (nixpkgs' own doctest, `lib/attrsets.nix:1696-1714`).
- Verification: a reading heuristic, "a `//` whose right side sets a key whose left value is an attribute set, or is read by a derived value". No tool catches it: nixf-diagnose exits 0 on the fixture (C2). Where a test exists, compare the evaluated value, `nix eval <flake>#<attr>.version`.
- Watched red: value check **yes**. IS 5: `rec-merge-bad` → `"1.0"` and `rec-merge-good` → `"1.9"` on CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2. Both exit 0.
- Severity: **SHOULD**.

**NIX-LANG-07 — Do not write `with lib;`, `with pkgs;` or `with builtins;` as a standalone statement at file or module scope. Qualify names (`lib.optional`), or use `inherit (lib) optional;`. Tolerated: list-scoped `with pkgs; [ … ]`, and single-expression `with lib.types;`, `with lib.licenses;` or `with lib.maintainers;`.**
- Rationale: a scope-wide `with` hides every name from static analysis (nix.dev best practices). It also turns an undefined name into a lazy error: under `with`, a typo passes evaluation until something forces that value (EF rows 5–6: `.#onlyX` exit 0 and `.#forceY` exit 1, while with no `with` the whole file fails). nixpkgs' package tree has almost eliminated it (38 of 40,298 files, conflict 9).
- Verification: `grep -rn -E '^\s*with (lib|pkgs|builtins)\s*;\s*$' --include='*.nix' <dir>`. Empty output passes.
- Watched red: **yes**. C7: `with-bad` shows two hits (exit 0) and `with-good` (list-scoped `with pkgs;` plus `with lib.types;`) shows none (exit 1).
- Severity: **SHOULD**. It is a finding in new code, while existing NixOS-style modules are migrated opportunistically.

### NIX-LANG — F. The localization procedure (read by `nix-diagnose`)

**NIX-LANG-08 — Before matching any Nix error string, record `nix --version` (implementation and version) and the input shape (flake output check, fetcher, module, per-system helper, lock). Look the error up by (shape, implementation, version range) and only then by string. Re-run an old upstream issue's repro, or a recorded leniency gap, on the pinned version before citing it.**
- Rationale: class C20. The same fault prints different text across implementations and versions: `points outside of its parent's store path` (2.20.6) versus `access to absolute path … is forbidden` (≥2.31); `follow cycle detected` (CppNix) versus `stack overflow (possible infinite recursion)` (Lix); `is not valid` versus `did not exist in the store during evaluation`; and Lix exits 0 where CppNix rejects `formatter`, overlay and `apps` errors (EF §2, seven triples). NixOS/nix#8013 no longer reproduces on 2.35.2 (EF row 14).
- Verification: a **reading heuristic** over the diagnosis transcript: `nix --version` precedes the first catalog lookup. It can only be a heuristic, because it constrains the agent's procedure rather than a file. The underlying splits were each watched (EF §2 and rows 12–14).
- Watched red: the evidence splits **yes** (EF rows 12, 13, 14 and the harvested triples). The procedure itself is n/a.
- Severity: **MUST**. Floor: n/a (it exists because of version drift).

**NIX-LANG-09 — Localize in this order: (1) read the bare first `error:` line; (2) add `--show-trace` only when that line names no rule, chiefly for `infinite recursion encountered`; (3) remove the suspected clause and re-run before naming a cause; (4) re-run with `--no-eval-cache` if a message does not change after a fix.**
- Rationale: `--show-trace` does not change the final `error:` line (EF §1). For module recursion, nixpkgs 26.11pre already prints a targeted hint without it (`lib/modules.nix:268`). Class C7's four misattributions were each fixed only by isolating one variable (EF §4). The eval cache (NixOS/nix#3872) is real, but its staleness was not reproduced here.
- Verification: `nix eval <flake>#<attr>` and then `nix eval --show-trace <flake>#<attr>`. The final line is the same, and the trace adds the file and line.
- Watched red: **yes** for (1)–(2): EF `overlay-final-not-prev` (1/0, the trace names the `final.greeting` line) and `imports-from-config` (1/0, the hint appears without the trace). **Partial** for (4): cache presence was confirmed and staleness not reproduced.
- Severity: **SHOULD**.

**NIX-LANG-10 — Classify an `infinite recursion encountered` by shape before changing anything:**
  - **(a)** An overlay reads `final.x` to define `x`: read `prev.x`.
  - **(b)** `imports` is computed from `config`: make `imports` unconditional and put `mkIf` inside `config`.
  - **(c)** A per-system helper indexes its own result set that is still being built, or bootstraps an unsupported system: build the set once, or drop that system.
  - **(d)** The trace ends inside the nixpkgs source: this is upstream, so leave the flake's systems list alone and file the bug or wait.
  - **(e)** A `rec` shadows a binding: see LANG-01.

  **Never** apply a generic fix (delete a system, delete the overlay, rename `final:` to `self:`).
- Rationale: one string covers five causes with incompatible fixes (EF §3 rows 1–4, AI angle #1). Renaming `final:` to `self:` also breaks the NIX-FLK-02 output check.
- Verification: `nix eval --show-trace <flake>#<attr>`. The innermost `at <file>:<line>` that belongs to the flake picks the shape. A frame under the nixpkgs store path is (d).
- Watched red: **yes**. EF: `overlay-final-not-prev` 1/0, `imports-from-config` 1/0, `persystem-helper-recurse` 1/0. The real cases are (c) `helix-editor/helix@079a789e8cb0:flake.nix:19` and (d) `nix-community/nixd@77bb1cacfa8a` inside nixpkgs `cpython/default.nix:472` ([runs](nix-audit/exemplar-tool-runs.md) Axis 3).
- Severity: **MUST**. Floor: the (b) hint text needs nixpkgs ≥26.11pre. The richer contexts in nixpkgs PR #370967 are not merged as of 2026-09-27.

**NIX-LANG-11 — Never inspect a derivation, or anything that carries `outPath`, with `nix eval --json` and read the result as the whole value. Select fields (`.#pkg.pname`), project them with `--apply 'p: { inherit (p) pname version; }'`, or use `nix repl`.**
- Rationale: the JSON encoder collapses an attribute set with `outPath` to that one string, and every other field is dropped silently (C9, M-C-16). An agent then reports "meta is missing".
- Verification: `nix eval --json <flake>#<pkg> --apply 'p: { inherit (p) pname version; }'` returns an object.
- Watched red: **yes**. C9: plain `--json` → `"/nix/store/xl1h…-hello-2.12.3"`, and the projected form → `{"pname":"hello","version":"2.12.3"}`. Both exit 0, and the signal is the shape.
- Severity: **SHOULD**.

### Not rules here (cited)

- The `abort-on-warn` scope is **NIX-REL-11**. `builtins.warn` versus `lib.warn` versus `warnOnInstantiate` is **NIX-REL-10** (floor: `builtins.warn` ≥2.23).
- URL literals are **NIX-GATE-06**, statix W12. The native `--option lint-url-literals fatal` needs **Nix ≥2.34** (conflict 1).
- Style-only items (map deferrals): legacy `let { }` and `builtins.toPath` (M-C-11, statix W05/W17), `inherit` rewrites (M-C-03), and duplicate dotted keys (statix W20 is style, NIX-GATE-06). A literal `{ a = 1; a = 3; }` is already an eval error.
- The 46-row verbatim catalog (EF §3) is content for the **nix-diagnose** skill, not rules.

### Verification runs added by this consolidation

All runs used `/home/mherwig/.cache/research-lang/nix-tools/run.sh` under `timeout 900`, with `--no-write-lock-file` on flake evals. CppNix 2.35.2 was used unless stated. Fixtures are under `fixtures/nix-language/`, each flake `git init -q && git add -A`.

| # | Fixture | Command | Violation → exit / output | Twin → exit / output |
|---|---|---|---|---|
| C1 | `shadow/{let,arg,pattern}-bad.nix`, `{let,pattern}-good.nix` | `deadnix --fail --no-lambda-pattern-names <f>`; `nix eval --json --file <f> --apply …` | let-bad 1 (`Unused let binding: settings`), arg-bad 1 (`Unused lambda argument: settings`), **pattern-bad 0 (gap)**. Eval: let-bad 1, pattern-bad 1 | let-good 0, pattern-good 0. Eval of pattern-good 0: `{"flags":…,"merged":…}` |
| C2 | `idioms-and-scope/rec-merge-bad` | `nix run nixpkgs#nixf-diagnose -- flake.nix` | **exit 0, no diagnostic**, so nixf misses `//` over `rec` | — |
| C3 | `mixed/m1..m4.nix`, `mixed/good.nix` | `nix eval --file <f>` on CppNix 2.35.2; the same under `nix shell nixpkgs#lix` (2.95.2); `nixf-diagnose <f>` | CppNix: all 0 (`{ foo = { a = 1; b = 2; }; }`). Lix: all 1 (`cannot be merged, because one set is marked as recursive…`). nixf `merge-diff-rec` on m2, m3, m4 only; **m1: `sema-extra-rec` only** | good: 0 on both |
| C4 | `path-interp-flake` | `nix eval .#{interp,tostr,interpHasContext,tostrHasContext}` | interp `"/nix/store/ii6z…-data"`, hasContext `true` | tostr `"/nix/store/1zic…-source/data"`, hasContext `false` |
| C5 | `path-build-tostring-bad`, `path-build-interp-good` | `nix build --no-link -L .` | 1: only `tostring-bad.drv` built; `cat: /nix/store/r93z…-source/data/a.txt: No such file or directory` | 0 |
| C6 | `pure-impure` | `nix eval .#{home,nixPath,sys,np}` | home `""` **exit 0**, nixPath `[ ]` **exit 0**, sys 1 (`attribute 'currentSystem' missing`), np 1 | — |
| C7 | `with-bad`, `with-good`; `pure-impure`, `path-interp-flake`; string-context and tostring twins | the LANG-07, LANG-04 and LANG-02 greps (directory operand) | with-bad 2 hits exit 0; pure-impure 4 hits exit 0; string-context-bad and tostring-bad hits exit 0 | with-good exit 1; path-interp-flake exit 1; both good twins exit 1 |
| C8 | `url/bad.nix`, `url/good.nix` | `nix eval --option lint-url-literals fatal --file <f> u` on 2.35.2, 2.34.8 and 2.31.5 | 2.35.2: 1; **2.34.8: 1**; **2.31.5: `warning: unknown setting 'lint-url-literals'`, exit 0** | good 0 |
| C9 | `evaluation-failures/eval-json-outpath-collapse` | `nix eval --json .#packages.x86_64-linux.default [--apply 'p: { inherit (p) pname version; }']` | plain: bare `"/nix/store/…-hello-2.12.3"` | projected: `{"pname":"hello","version":"2.12.3"}` |

## Applied to the exemplars and the future consumers

| Rule | Satisfied by | Violated by (repo@sha12:path:line) | New commitment |
|---|---|---|---|
| LANG-01 | The 80 `rec` package definitions in `numtide/llm-agents.nix@efb10f28f724` use plain `pname`/`version` interpolation without shadowing ([shape](nix-audit/exemplar-flake-shape.md) §4) | None found in the corpus; the fixture is the only reproduction | Fleet A flakes: the deadnix gate is already a MUST (GATE-05). The pattern-formal gap is covered by `nix flake check` forcing the outputs |
| LANG-02 | `ipetkov/crane@73b980519cef:lib/mkDummySrc.nix:100,141,349` and `lib/crateNameFromCargoToml.nix:29` discard context only for names, prefixes and `fromTOML` content, which is legitimate | `nix-community/home-manager@7b4c5ec4beda:overlay.nix:2` passes `path = toString ./.` into `home-manager/default.nix:60` (`--subst-var-by HOME_MANAGER_PATH`), so the built script embeds a context-free store path that is not in its closure. This is a read-level instance (not built here), in a non-flake overlay | Fleet A `package.nix` reaches files only through `lib.fileset.toSource` / `"${…}"`. Generated flake (D): the reader interpolates each `fetchurl` result, never its `toString` |
| LANG-03 | `sxyazi/yazi` and `ipetkov/crane` filter sources (21/37 repos use some filter, [shape](nix-audit/exemplar-flake-shape.md) §4) | `nix-community/home-manager@7b4c5ec4beda:tests/integration/standalone/dconf.nix:28` (`home_manager = "${../../..}"`, the repository root, repeated in 10+ files; confined to tests) | The fleet uses `lib.fileset.toSource` (NIX-PKG) |
| LANG-04 | The `flake.nix` surface is clean in 37/37 repos. The 2 hits are tolerated: `the-nix-way/dev-templates@6a7eefd8fd91:flake.nix:32` (a script string with `--impure`) and `NixOS/nix@209d2bc44288:tests/functional/cancelled-builds/flake.nix:15` (a test fixture) | Tolerated shim: `hercules-ci/flake-parts@31729ca8cbdb:shell.nix:1` (`builtins.currentSystem` inside `shell.nix`, a compatibility shim) | **ocx generated flake:** no registry token or configuration read through `getEnv`, which would silently return `""`. The fetch path is NIX-GEN's (token-free FOD or header), and secrets are NIX-SEC's |
| LANG-05 | llm-agents.nix's `rec` blocks are never split (idioms Exemplar evidence) | None in the corpus | **ocx generator** emits each package attribute once, as a non-`rec` set or JSON read by `lib.importJSON`, and never dotted keys next to a `rec` block. The fleet's advisory Lix leg (GATE-16) runs LANG-05's eval |
| LANG-06 | `nixpkgs@9cab9ed832c3:lib/attrsets.nix:1778-1783` (`recursiveUpdate`) | None confirmed (heuristic) | The generated flake's overrides use `recursiveUpdate` when layering per-system metadata |
| LANG-07 | flake-parts consumers (`zed-industries/zed@bda9c0bd43a8`) have 0 standalone hits; the nixpkgs `pkgs/` tree has 38 in 40,298 files | `nix-darwin/nix-darwin@4cff07de74b5:modules/nix/default.nix:5` (`with lib;`), `cachix/devenv@6d76db3889de:src/modules/languages/php.nix:3` (12 devenv files); nixpkgs `nixos/modules/` 401 of 2,490 files | Fleet flakes and the generator template emit no standalone `with` |
| LANG-10 | — | Shape (c): `helix-editor/helix@079a789e8cb0:flake.nix:19` (`eachSystem = lib.genAttrs lib.systems.flakeExposed;` recurses on `x86_64-freebsd` under `--all-systems`). Shape (d): `nix-community/nixd@77bb1cacfa8a`, recursion inside nixpkgs `cpython/default.nix:472` ([runs](nix-audit/exemplar-tool-runs.md) Axis 3) | Fleet A flakes use an explicit systems list (NIX-FLK-08), never `flakeExposed` |
| LANG-08/09/11 | — | Procedure rules. The in-program instance is this program's own wave-1 misattribution of helix's slow `show` to its inputs (EF §4) | nix-diagnose opens with `nix --version` and a shape classification |

## AI-agent failure modes

Ranked by how often each bites. Each entry names the mechanical check.

1. **The generic fix for "infinite recursion".** The agent deletes a system, removes an overlay or renames `final:` to `self:`, which are three incompatible fixes for one string. Check: `nix eval --show-trace`, then classify with LANG-10.
2. **"Fixing" a string-context error with `toString` or `unsafeDiscardStringContext`.** It looks right, evaluates and fails only in the sandbox, or silently passes off-sandbox. Check: the sandboxed `nix build` (GATE-10) and `--apply builtins.hasContext` (LANG-02).
3. **Reading `$GITHUB_TOKEN` or `$HOME` with `builtins.getEnv` in a flake.** It gets `""` with exit 0 and continues. Then it adds `--impure` to "fix" `currentSystem`. Check: the LANG-04 grep, plus `nix eval` of the value.
4. **Matching a remembered error string without the version.** `points outside of its parent's store path` is dead on ≥2.31, and Lix prints other texts or exits 0. Check: `nix --version` first (LANG-08).
5. **Treating a green `nix flake check --no-build` as proof about language idioms.** None of the eight idiom fixtures trip it (idioms AI angle). Check: the targeted gates (deadnix, a real build, the Lix leg).
6. **A standalone `with pkgs;` or `with lib;` copied from older NixOS modules**, which hides typos until they are forced. Check: the LANG-07 grep.
7. **Emitting `foo = rec { … }; foo.bar = …;` from a generator or a refactor.** It is green on CppNix and red for Lix consumers. Check: the Lix eval leg (LANG-05). Do not rely on nixf, which misses this shape.
8. **Expecting `//` to deep-merge or to re-derive `rec` fields.** Check: a value assertion in `checks`, or `nix eval` of the derived field (LANG-06).
9. **`nix eval --json` on a package "to inspect it".** Check: project with `--apply` (LANG-11).
10. **Wiring `--option abort-on-warn true` into a whole-flake gate** "for strictness". Check: NIX-REL-11's workflow grep.

## Open questions

**Owner decisions (with the defaults the program applies):**
- **Q-LANG-1: should the fleet's Lix leg block on LANG-05 only?** Default: no. The Lix leg stays advisory (frame Q6), and LANG-05 is enforced as an authoring MUST checked by reviewers and the advisory leg's output.
- **Q-LANG-2: list-scoped `with pkgs; [ … ]`.** nix.dev prefers `builtins.attrValues { inherit (pkgs) … ; }`. Default: tolerated (map conflict 20; 789 corpus occurrences).

**Needs another round:**
- **language/evaluation-failures: can eval-cache staleness (NixOS/nix#3872) still be reproduced on 2.35.2?** Test it through a `nixosConfigurations.<host>.config.system.build.toplevel` chain or a deep module evaluation. It did not reproduce on bare attributes. Until then LANG-09 (4) is advisory.
- **language/idioms-and-scope: is there a static detector for pattern-formal self-shadowing and nested `//` drops?** Candidates are a nixf rule or a tree-sitter or `nix-instantiate --parse` query. Today both are covered only by forcing values or by reading.
- **language/string-context: does a context-free store path embedded in an output break after `nix copy` or substitution?** The case is home-manager's `HOME_MANAGER_PATH` (read, not built). Measure the closure with `nix path-info -r` and a copy to a fresh store.
- **implementations: what else does Lix 2.95 accept or reject?** Run every NIX-FLK/NIX-LANG fixture under Lix 2.95.x to enumerate the leniency gaps (now three: `formatter`, overlay arity, `apps`) and the language rejections (`rec-set-merges`, `.5` floats, `or` as identifier, token whitespace; only the first is measured).
- **M-C-15: is cross-system evaluation deterministic** when one host evaluates every system's outputs? Still unexamined, and it matters for D flakes evaluated in one CI job.

## Sub-artifacts

- [nix-language/idioms-and-scope.md](nix-language/idioms-and-scope.md): `rec` self-shadowing, `with` scope counts, `//` shallowness, path interpolation cost, string context, impure builtins, mixed-`rec` merges across CppNix and Lix, `builtins.warn`.
- [nix-language/evaluation-failures.md](nix-language/evaluation-failures.md): the localization procedure, class C20 string drift by implementation and version, the 46-row verbatim error catalog for nix-diagnose, and class C7 misattributions.

## Key sources

- https://nix.dev/guides/best-practices (the `rec`, `with`, `//` and URL anti-patterns)
- https://nix.dev/manual/nix/2.35/language/string-context (string context and `unsafeDiscardStringContext`)
- https://nix.dev/manual/nix/2.35/language/types (path-to-string coercion copies to the store)
- https://nix.dev/manual/nix/2.35/language/ (static name resolution versus lazy forcing)
- https://nix.dev/manual/nix/2.35/release-notes/rl-2.23 (`builtins.warn`, `abort-on-warn`)
- https://nix.dev/manual/nix/2.35/release-notes/rl-2.34 (`lint-url-literals` stabilised)
- https://nix.dev/tutorials/working-with-local-files (`lib.fileset`, the flake-directory copy)
- https://lix.systems/blog/2026-03-25-lix-2.95-release/ (the `rec-set-merges` rejection and other language strictness changes)
- https://raw.githubusercontent.com/nix-community/nixd/main/libnixf/src/Basic/diagnostic.py (`sema-extra-rec`, `sema-extra-with`, `merge-diff-rec`, `sema-undefined-variable`)
- https://github.com/NixOS/nixpkgs/pull/370967 (module-system error contexts, unmerged)
- https://github.com/NixOS/nixpkgs/issues/550879 (the `check-meta` recursion class)
- https://github.com/NixOS/nix/issues/3872 (the cached evaluation failure)
- https://github.com/NixOS/nix/issues/8013 (flake through a symlink; does not reproduce on 2.35.2)
- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md (the flake reference for 2.35.2)
