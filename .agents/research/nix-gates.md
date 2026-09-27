---
title: "Nix gate: formatter, linters, flake check, CI and implementations — consolidated"
topic: nix-quality/gates.md (NIX-GATE) — what fails the build, in what order, on which Nix
model: opus
id_family: NIX-GATE
consolidates:
  - nix-gates/format-and-lint.md
  - nix-gates/check-ci-and-impls.md
date: 2026-09-27
era: "CppNix 2.35.2 + nixpkgs 26.11pre rev 8d5d270900d3 + nixfmt 1.5.0, nixfmt-tree 2.6.0 (treefmt v2.6.0), deadnix 1.3.2, statix 0.5.8-unstable-2026-07-17 (molybdenumsoftware fork), nixf-diagnose 0.1.4, flake-checker 0.2.15, Lix 2.95.2, nixVersions.nix_2_31 = 2.31.5 — measured 2026-09-27"
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-gates/
---

# The gate — consolidated (NIX-GATE)

Both wave-2 dives ran **zero** toolchain commands: each recorded "store
contention" and staged its fixtures unrun. The cause was not contention. A
nix process killed by `timeout` had left a stale SQLite dotfile lock
(`.nix-portable/nix/var/nix/db/db.sqlite.lock/`, mtime 10:25:18, older than
every live holder). nix-portable on WSL uses `unix-dotfile` locking, so every
later `run.sh` call busy-waited forever, and about 100 orphans piled up. This
consolidation killed the 90 orphans whose parent was init, removed the stale
lock, and then ran every verification below: 20 runs, each watched red on a
planted violation and green on a compliant twin (Verification runs, V1-V20).
Four of the dives' factual claims did not survive the runs (see Conflicts).

## Verdict

1. **Format:** the `formatter` output of A, D and E flakes is
   **`pkgs.nixfmt-tree`**, or a treefmt-nix wrapper that enables nixfmt.
   Never use bare `pkgs.nixfmt`: on Nix 2.35 a bare `nix fmt` passes it no
   files, so it reads stdin and exits 1 (V1). The CI step is
   **`nix fmt -- --ci`** (V3/V4), which is what `ipetkov/crane` already runs.
   An alejandra repository keeps alejandra (map conflict 5).
2. **Dead names:** `nixfmt-rfc-style` (an evaluation warning on 26.11),
   `nixfmt-classic` (a hard throw since 2026-07-01) and `nixpkgs-fmt` (archived)
   are MUST findings (V6/V7). The dive's claim that these "evaluate silently"
   is overturned.
3. **deadnix becomes a MUST**, run as `deadnix --fail --no-lambda-pattern-names`
   with directory excludes. The promotion test in map conflict 6 is met: after
   `-L`, 34 findings survive on six exemplars, and fixing any of them breaks
   no caller (V9, Measured). `--fail` is not optional. Without it, deadnix
   exits 0 on findings (V9b), and crane's CI step is a gate that can never go
   red for that reason.
4. **statix is advisory, and nixf-diagnose is editor-only.** statix's W20 is a
   readability lint by design. A literal duplicate key is already a hard Nix
   error (V10), so the dive's "false-positive class / silent shadow" reading
   is overturned. nixf-diagnose exits 1 on every flake that has an unused
   `self` (V12).
5. **Schema and IFD:** the deterministic check is
   `nix flake check --no-build --option allow-import-from-derivation false`
   (Q5), and B, C and D flakes MUST pass it (map conflict 14). `--no-build`
   alone is **not** an IFD ban, because its result depends on what is already
   in the store. It fails on a cold store and passes once the IFD output
   exists (V13). The same cold-store effect produces the self-source
   `path '…' is not valid` red by remote ref, and it reproduces on 2.31.5 and
   Lix too (V15). It is a checker limit, not a defect.
6. **`--all-systems`** is a MUST step. A red result is triaged against a cause
   table before the systems list is touched: only 2 of 10 measured reds were
   the author's defect.
7. **Build:** CI MUST `nix build` the flake's own packages. Since Nix 2.32,
   `nix flake check` silently skips substitutable checks, and it ran 1 of 2
   checks in V16.
8. **CI:** use `cachix/install-nix-action` (upstream CppNix) with every action
   pinned by a 40-hex SHA. The Nix version is pinned by `install_url` (V18).
   The store cache is `nix-community/cache-nix-action` v7. flake-checker is
   advisory, run with `--fail-mode` and stderr classification (V17).
9. **Implementations:** CppNix is the gate of record. A, B and D flakes add
   a non-blocking **Lix 2.95** leg and a non-blocking **floor** leg. The floor
   is computed from the pinned nixpkgs (V20, today `nix_2_31`), never
   remembered. The Lix leg is the only check that caught a real divergence
   (V19). It stays non-blocking because Lix's only other measured divergence
   is a warning, and Lix's flake support is frozen and being moved into a
   plugin.
10. **Shape differences:** B and C flakes skip steps 6 and 7 of the gate
    block when they export no packages. D flakes (ocx-index) run the full
    block plus Q5 with no IFD exemption. E templates run format and Q5 on the
    template directory.

## The ruleset

### The gate block (index-owned via M-J-01, sequenced by these rules)

Cheapest first. Steps 1-6 block a merge. Steps 7-9 are advisory. Run the
block from a local checkout, never by remote ref (GATE-09).

```sh
nix fmt -- --ci                                                                 # 1 GATE-01/02; exit 1 = unformatted (writes the fix into the checkout)
grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .   # 2 GATE-03; empty = pass
deadnix --fail --no-lambda-pattern-names --exclude vendor tests/fixtures -- .   # 3 GATE-05; list only dirs that exist (GATE-04)
nix flake check --no-build --option allow-import-from-derivation false          # 4 GATE-08 (Q5); exit 0 = pass
nix flake check --all-systems --no-build                                        # 5 GATE-09; red → triage table first
nix build .#default --print-build-logs                                          # 6 GATE-10; every own package, not only default
flake-checker --no-telemetry --fail-mode flake.lock                             # 7 GATE-11; advisory, stderr-classified
nix shell nixpkgs#lix --command nix flake check --no-build                      # 8 GATE-16; advisory
nix shell nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build     # 9 GATE-16; floor from V20's expression
```

### NIX-GATE — caught by `nix fmt` and a grep (format)

**NIX-GATE-01 — Declare `formatter.<system>` as `pkgs.nixfmt-tree` (or a
treefmt-nix wrapper enabling nixfmt), never bare `pkgs.nixfmt`.**
- Rationale: nixfmt formats only the files it is given. A bare `nix fmt`
  hands it none, so it reads stdin and fails, while the author believes the
  tree is formatted.
- Verification: in a fixture with a misformatted tracked file, run `nix fmt`
  followed by `git status --porcelain --untracked-files=all .`. A nixfmt-tree
  formatter changes files and exits 0. Bare nixfmt exits 1 with
  `unexpected end of input`.
- Watched red: **yes** (V1 red, V2 green). `nix flake check` also hard-fails a
  non-derivation `formatter` ([outputs-contract](nix-flakes/outputs-contract.md),
  `src/nix/flake.cc` at 2.35.2).
- Severity: **MUST** for any flake that declares a formatter. Declaring one
  at all is a SHOULD for A, D and E (map conflict 19), and a MUST for fleet
  flakes (Applied).
- Floor: Nix 2.35.2 `nix fmt` passes no arguments (measured). `nixfmt-tree`
  is in nixpkgs 26.11pre (2.6.0), and its package carries a 2025-04-01
  deprecation note, so it predates 25.05.

**NIX-GATE-02 — Check formatting in CI with `nix fmt -- --ci`, never
`nixfmt --check .`.**
- Rationale: `--ci` is treefmt's fail-on-change mode. nixfmt's directory mode
  is deprecated ("Passing directories or non-Nix files (such as ".") is
  deprecated and will be unsupported soon"). The dive's claim that it "errors
  outright" is wrong: it still works, with that warning.
- Verification: `nix fmt -- --ci` exits 1 with
  `Error: unexpected changes detected, --fail-on-change is enabled` on an
  unformatted tree and exits 0 on the formatted twin. A treefmt-nix flake can
  instead expose `checks.<system>.formatting = treefmtEval.config.build.check self`,
  which makes `nix flake check` red.
- Watched red: **yes** (V3 red / V4 green; V5 red/green for the treefmt-nix
  check; V1b shows the directory-mode warning).
- Severity: **MUST**.
- Floor: treefmt v2 (`--ci`). The step writes the fix into the checkout, so
  run it in a disposable CI checkout.

**NIX-GATE-03 — Never write `nixfmt-rfc-style`, `nixfmt-classic` or
`nixpkgs-fmt` (package, hook or formatter) in new code; an alejandra
repository keeps alejandra.**
- Rationale: on nixpkgs 26.11 these three names fail differently.
  `nixfmt-rfc-style` is a `warnAlias` that prints an evaluation warning on
  every instantiation. `nixfmt-classic` throws ("has been removed as it is
  deprecated and unmaintained", converted 2026-07-01). `nixpkgs-fmt` is an
  archived tool (2024-07-24) that still evaluates.
  Source: `NixOS/nixpkgs@9cab9ed832c3:pkgs/top-level/aliases.nix:1869-1870`.
- Verification: `grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .`
  (Q10). Empty output passes. The grep also catches git-hooks.nix
  `hooks.nixfmt-rfc-style` and `hooks.nixpkgs-fmt`.
- Watched red: **yes** (V6 grep red/green; V7 eval shows the warning and the
  throw).
- Severity: **MUST**.
- Floor: nixpkgs ≥ 25.11 (rename, `rl-2511.section.md:11`); the classic throw
  applies from 26.11pre.

**NIX-GATE-04 — Exclude generated data, vendored trees and parser fixtures by
directory, using one list shared by the formatter (`settings.excludes` or
`settings.formatter.nixfmt.excludes`), deadnix `--exclude` and statix `-i`.**
- Rationale: a formatter fights a generator's output, and linters grade code
  nobody wrote. nil's `test_data/` alone accounted for 596 of 599 statix
  syntax errors and 670 of 1,914 deadnix findings
  ([runs](nix-audit/exemplar-tool-runs.md) Axis 5).
- Verification: with a misformatted `generated/data.nix`, `nix fmt -- --ci`
  exits 1 without the exclude and 0 with
  `pkgs.nixfmt-tree.override { settings.formatter.nixfmt.excludes = [ "generated/*" ]; }`.
- Watched red: **yes** (V8).
- Severity: **MUST** whenever the repository carries such files, which
  includes every D flake.
- Floor: nixfmt-tree `settings` override (nixpkgs 26.11pre).

### NIX-GATE — caught by deadnix (dead code)

**NIX-GATE-05 — Gate on `deadnix --fail --no-lambda-pattern-names` over
tracked Nix with the GATE-04 excludes. Fix what survives by deleting the let
binding or `_`-prefixing the positional argument. Never run `deadnix --edit`
without `-L`.**
- Rationale: without `-L`, deadnix flags the `self` in every
  `outputs = { self, nixpkgs }:` and every `callPackage` formal. Those names
  are matched by name, so deleting them breaks callers. Without `--fail`,
  deadnix exits 0 on findings.
- Verification: `deadnix --fail --no-lambda-pattern-names <dir>`. On
  `lint-cases/` it exits 1 with only `Unused let binding: unused`. On
  `lint-cases-good/` it exits 0. Plain `deadnix --fail` also reports
  `Unused lambda pattern: self` and `…: autoPatchelfHook`.
- Watched red: **yes** (V9; V9b shows exit 0 without `--fail`).
- Measured false-positive rate after `-L` on the six named exemplars, from
  stored JSON: treefmt 0, yazi 0, nixpkgs-review 1 (2.4 per 1,000 lines),
  disko 6 (0.5), flake-parts 16 (4.6, of which 2 in `vendor/`),
  nix-installer 8 (7.7). Every one of the 34 is a signature-forced positional
  argument (`final: prev:`, `name: value:`), fixed by `_`-prefixing, or a
  truly dead let binding. None is a fix that breaks a caller, which satisfies
  map conflict 6.
- Severity: **MUST**.
- Floor: deadnix ≥ 1.1 (`# deadnix: skip`); measured on 1.3.2.

### NIX-GATE — advisory lint (never blocks)

**NIX-GATE-06 — Do not make statix a required gate. If a repository runs it,
commit `statix.toml` with
`disabled = ["useless_parens", "repeated_keys", "manual_inherit", "manual_inherit_from", "empty_pattern"]`
and act only on W12 (unquoted URI) and W17 (`builtins.toPath`).**
- Rationale: statix's volume is style. W08 (749), W20 (442) and W04 (254)
  lead the corpus ([runs](nix-audit/exemplar-tool-runs.md) Axis 5). W20
  targets `foo.a = …; foo.b = …;` by design (`statix explain W20`), and a
  literal `{ a = 1; a = 3; }` is already `error: attribute 'a' already defined`
  at evaluation.
- Verification: `statix check -o errfmt <dir>` reports
  `W:12:Consider quoting this URI expression` and `W:17:` and exits 1 on the
  bad twin, and exits 0 on the good twin. With the committed config,
  `statix check -c statix.toml dotted.nix` exits 0.
- Watched red: **yes** (V10 red/green, V11).
- Severity: **SHOULD**.
- Floor: statix from nixpkgs 26.11pre builds from the molybdenumsoftware fork
  (`src` URL measured). The native equivalent of W12 is Nix ≥2.35
  `--option lint-url-literals fatal` (red/green in V11b; a NIX-LANG concern).

**NIX-GATE-07 — Use nixf-diagnose only in the editor or a pre-commit hook,
with `-i sema-unused-def-lambda-noarg-formal`, never as a CI gate.**
- Rationale: nixf-diagnose exits 1 on warnings, so every flake with an unused
  `self` goes red. It also does not catch the one real cross-implementation
  divergence (V19's fixture passes it).
- Verification: `nixf-diagnose lint-cases/repeated-key.nix` exits 1
  (`[sema-duplicated-attrname] Error`). `nixf-diagnose ifd-compliant/flake.nix`
  exits 1 (`sema-unused-def-lambda-noarg-formal`). The same command with `-i`
  exits 0.
- Watched red: **yes** (V12).
- Severity: **CONSIDER**.
- Floor: `pkgs.nixf-diagnose` 0.1.4 exists in nixpkgs 26.11pre (evaluated),
  which settles the dive's open question.

### NIX-GATE — caught by `nix flake check` (schema, IFD, systems)

**NIX-GATE-08 — Ban IFD with Q5,
`nix flake check --no-build --option allow-import-from-derivation false`, run
from the local checkout. Never treat `--no-build` alone as an IFD ban.**
- Rationale: `--no-build` depends on the state of the store. An IFD flake
  fails on a cold store (`error: path '/nix/store/…-generated-value.nix.drv' is not valid`)
  and **passes** once the IFD output has been realised, for example by a
  previous `nix eval` or a warm CI cache. The option gives the same answer
  whatever the store holds:
  `error: cannot build '…drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`.
- Verification: Q5 on `ifd-violation/` exits 1 on a cold store and on a warm
  one. On `ifd-compliant/` it exits 0.
- Watched red: **yes** (V13a-e).
- Severity: **MUST** for B, C and D flakes and anything aimed at nixpkgs
  (map conflict 14). An A flake whose builder needs IFD drops the option only
  with a comment naming the builder, and builds that path in CI.
- Floor: `allow-import-from-derivation` defaults to true in CppNix 2.35.2
  (measured by the canon scout, reconfirmed by V13a).

**NIX-GATE-09 — Run `nix flake check --all-systems --no-build` after the
home-system check, and triage any red against the cause table below before
editing the systems list or the flake.**
- Rationale: 8 of the 10 measured `--all-systems` reds were not the author's
  defect ([runs](nix-audit/exemplar-tool-runs.md) Axis 3). An agent that
  "fixes" them by deleting systems throws away coverage.
- Verification: a reading heuristic over the first `error:` line. It cannot
  be mechanised, because the same exit code covers every row. Each error
  string was reproduced here or in the audit:

  | first error line (2.35.2 unless noted) | cause | author's fix? |
  |---|---|---|
  | `Nixpkgs 26.11 has dropped support for x86_64-darwin` (`lib/trivial.nix:1003`) | nixpkgs dropped the platform | drop the system from the list (NIX-FLK) |
  | `Refusing to evaluate package '…' … not available on the requested hostPlatform` | platform-restricted dependency | no; optional per-system guard |
  | `infinite recursion encountered` with a nixpkgs path in the trace | nixpkgs bug | no |
  | `cannot bootstrap GHC on this platform` | toolchain limit | no |
  | `error: Cannot build '…drv'. Reason: platform mismatch Required system: 'aarch64-linux'` (exit 100; V14) | foreign-system IFD, NixOS/nix#4265 (the 2020 text differs) | remove the IFD (GATE-08) |
  | `error: path '/nix/store/…-source' is not valid` (2.35.2 and 2.31.5), `… did not exist in the store during evaluation` (Lix 2.95.2) | `--no-build` on a cold store by remote ref; V15 shows plain `nix eval …drvPath` succeeds and the same check passes once the source is realised | no; run the gate from the checkout |
  | `flake attribute 'checks.<sys>.<n>' is not a derivation` | **author** (or a library it imports, as with blueprint) | yes |
  | `infinite recursion encountered` in the flake's own per-system helper | **author** (helix `pkgsFor`) | yes |

- Watched red: foreign IFD **yes** (V14 red exit 100 / twin green); remote
  self-source **yes** (V15). The other rows are cited from the audit's live
  runs.
- Severity: **MUST** for the step. The triage is a reading heuristic, stated
  as such.
- Floor: CppNix 2.35.2. The home-system check warns
  `The check omitted these incompatible systems: …` (V14).

### NIX-GATE — caught by a real build

**NIX-GATE-10 — Build every package the flake itself defines with
`nix build .#<name>` in CI. A green `nix flake check` is not a build.**
- Rationale: since Nix 2.32, `nix flake check` skips checks it can
  substitute (rl-2.32, PR #13574). Fleet packages have no public cache
  (owner Q2), so `nix build` really builds them.
- Verification: `substitutable-build/` has two checks, `sl` (in
  cache.nixos.org) and a fresh `runCommand`. `nix flake check` prints
  `running 1 flake checks...`, and afterwards
  `nix path-info <sl outPath>` still says `is not valid`. `nix build .#checks.x86_64-linux.sl`
  fetches it. The workflow check is
  `grep -rn -e 'nix build' .github/workflows`, and empty output fails.
- Watched red: **yes** (V16), and the grep on the ci-bad/ci-good twins (V18).
- Severity: **MUST** for A and D. B and C flakes build their `checks`.
- Floor: Nix ≥ 2.32.

### NIX-GATE — caught by flake-checker (advisory)

**NIX-GATE-11 — Run flake-checker as an advisory CLI step with `--fail-mode`
on A and D flakes that have a root `nixpkgs` input. Treat stderr containing
`Error: Invalid(` or `Error: FlakeLock(` as "tool could not run", and never
add a `nixpkgs` input just to satisfy it.**
- Rationale: the CLI exits 0 on findings by default, not only the Action.
  With `--fail-mode`, findings exit 1, and a crash also exits 1, so the exit
  code alone cannot tell the two apart.
- Verification:
  `flake-checker --no-telemetry --fail-mode flake.lock > o 2>&1; grep -c -e 'Error: Invalid(' -e 'Error: FlakeLock(' o`.
  The crash twins exit 1 with a grep count of 1. The stale-branch twin exits
  0 by default and 1 under `--fail-mode` with a grep count of 0. The clean
  twin exits 0.
- Watched red: **yes** (V17).
- Severity: **SHOULD**.
- Floor: flake-checker 0.2.15. Its binary accepts only the 26.05 and unstable
  branches (map conflict 15).

### NIX-GATE — caught by a workflow grep (CI)

**NIX-GATE-12 — Pin every `uses:` in a Nix workflow to a 40-hex commit SHA
with a version comment.**
- Rationale: `@main` and `@vN` move under the flake. Half of the corpus's
  `install-nix-action` uses and all 4 `determinate-nix-action` uses float
  ([shape](nix-audit/exemplar-flake-shape.md) §9).
- Verification: `grep -rn -E 'uses: [^ ]+@' .github/workflows | grep -v -E '@[0-9a-f]{40}( |$)'`.
  Empty output passes.
- Watched red: **yes** (V18: ci-bad has 3 hits and exit 0, ci-good exits 1).
- Severity: **MUST**.
- Floor: none.

**NIX-GATE-13 — Install upstream CppNix with `cachix/install-nix-action`,
and pin the Nix version with
`install_url: https://releases.nixos.org/nix/nix-<version>/install`. Use a
Determinate installer only when Determinate Nix is the stated intent, and then
`determinate-nix-action` at an exact tag, never `nix-installer-action`.**
- Rationale: `nix-installer-action` installs Determinate Nix by default, and
  its README calls upstream mode "not a supported configuration". The SHA pin
  fixes the Nix version only implicitly (v31.11.1 hardcodes
  `nix_version=2.35.2` at `install-nix.sh:105`), so the next action bump
  silently changes Nix.
- Verification (Q19):
  `grep -rn -e '@main' -e 'nix-installer-action' -e 'magic-nix-cache-action@v[0-9]\b' .github/workflows`.
  Empty output passes. Then read that `install_url` is present.
- Watched red: **yes** (V18).
- Severity: **MUST**.
- Floor: install-nix-action v31.11.1 (`13d8dd58da0234aa297dedd986986ccb8e7f3e24`,
  2026-08-13, resolved via the GitHub API). The installed version must be at
  or above the CVE-2026-39860 fix for its line (NIX-SEC, M-H-05).

**NIX-GATE-14 — Cache the Nix store in CI with `nix-community/cache-nix-action`
(v7, SHA-pinned, `primary-key` on `hashFiles('flake.lock')`). Never use
`magic-nix-cache-action` below v11 or at `@main`, and add no public
substituter until owner Q2 decides.**
- Rationale: the pre-2025 Magic Nix Cache API died on 2025-02-01. v11+ is a
  community revival, and v15 is current (2026-09-09). cache-nix-action wraps
  GitHub's own client and GC-bounds the saved store.
- Verification: the Q19 grep catches `magic-nix-cache-action@v2` (V18).
  Reading heuristic for the key.
- Watched red: **yes** for the stale reference (V18). The choice between the
  two caches was **not** measured on a runner.
- Severity: **SHOULD**.
- Floor: cache-nix-action v7 (`7df957e333c1`, 2026-01-08).

**NIX-GATE-15 — Run the gate on `ubuntu-24.04`, `ubuntu-24.04-arm` and one
Apple-silicon macOS runner (`macos-15` or `macos-14`) when the flake declares
`aarch64-darwin`. Do not add an Intel macOS or a Windows runner.**
- Rationale: x86_64-darwin throws on nixpkgs 26.11, and no exemplar runs
  Nix CI on Windows. jj's matrix is the working reference
  (`jj-vcs/jj@f01e70f8e375:.github/workflows/ci.yml:129-144`).
- Verification: a reading heuristic. The set of runner OSes must equal the
  set of OS halves of the declared systems.
- Watched red: n/a (a reading heuristic).
- Severity: **SHOULD**.
- Floor: GitHub-hosted runners as of 2026-09.

### NIX-GATE — caught by the implementation legs

**NIX-GATE-16 — A published A, B or D flake runs two non-blocking legs of Q5:
Lix (`nix shell nixpkgs#lix --command nix flake check --no-build`) and the
floor. The floor is the oldest non-stub `nixVersions.nix_2_*` in the pinned
nixpkgs, computed rather than remembered. No flake relies on a
Determinate-only feature.**
- Rationale: Lix 2.95 rejects rec/non-rec attribute merges that CppNix accepts
  silently. nixpkgs prunes old versions release by release: `nix_2_24` and
  `nix_2_30` both throw `has been removed. use nix_2_31`.
- Verification:
  - Lix: `lix-leg-violation/` passes Q5 on CppNix 2.35.2 and 2.31.5 (exit 0)
    but fails on Lix 2.95.2 with exit 1:
    `error: attribute 'meta.minor' cannot be merged, because one set is marked as recursive and the other isn't`.
    The twin passes all three.
  - Floor: `nix eval --json 'github:NixOS/nixpkgs/<rev>#nixVersions' --apply 'v: builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (v.${n}.version or null)).success) (builtins.attrNames v)'`,
    whose first element is the floor (V20).
- Watched red: **yes** (V19, V20). The Axis 7 rerun on jj, zig-overlay and
  yazi across all three implementations agrees (V21).
- Severity: **SHOULD** (the legs). No Determinate-only feature is a MUST
  owned by map conflict 11 and NIX-FLK (`schemas`).
- Floor: this rule *is* the floor rule. Today the floor is 2.31.5, which is
  above the CVE-2026-39860 patch for its line (2.31.4).

### Verification runs (this consolidation, 2026-09-27)

Every command ran through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`
under `timeout 900`. Fixtures are under `F=/home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-gates`,
copied from both dives, git-initialized, and pinned to nixpkgs `8d5d2709`.

| # | Fixture | Command | Violation | Twin |
|---|---|---|---|---|
| V1 | `format-and-lint/fmt-nixfmt` | `nix fmt --no-write-lock-file` | exit 1, `unexpected end of input` (stdin) | — |
| V1b | `format-and-lint/misformatted` | `nixfmt --check .` | exit 1 + `Passing directories … is deprecated and will be unsupported soon` | `nixfmt --check good.nix` exit 0; `bad.nix: not formatted` exit 1 |
| V2 | `format-and-lint/fmt-nixfmt-tree` | `nix fmt` then `git status --porcelain` | — | `formatted 3 files (2 changed)`, exit 0, ` M sub/nested.nix`, ` M unformatted.nix` |
| V3/V4 | `format-and-lint/fmt-nixfmt-tree` | `nix fmt -- --ci` | exit 1, `Error: unexpected changes detected, --fail-on-change is enabled` | after formatting: `(0 changed)`, exit 0 |
| V5 | `format-and-lint/fmt-treefmt-nix` | `nix flake check` (builds `checks.formatting`) | exit 1, treefmt-check diff of `unformatted.nix` | `all checks passed!`, exit 0 |
| V6 | `format-and-lint/lint-cases{,-good}` | Q10 grep | 3 hits, exit 0 | no output, exit 1 |
| V7 | pinned nixpkgs | `nix eval … nixfmt-rfc-style.drvPath` / `nixfmt-classic.name` | `evaluation warning: nixfmt-rfc-style is now the same as pkgs.nixfmt…`; `error: nixfmt-classic has been removed…` | `nixfmt.version` → `1.5.0` |
| V8 | `excl-bad` / `excl-good` | `nix fmt -- --ci` with misformatted `generated/data.nix` | exit 1 (`1 changed`) | with `settings.formatter.nixfmt.excludes`: `(0 changed)`, exit 0 |
| V9 | `format-and-lint/lint-cases{,-good}` | `deadnix --fail [--no-lambda-pattern-names]` | without `-L`: `Unused lambda pattern: self`, `…: autoPatchelfHook`, `Unused let binding: unused`, exit 1; with `-L`: only the let binding, exit 1 | exit 0 |
| V9b | `lint-cases` | `deadnix lint-cases` (no `--fail`) | findings printed, **exit 0** | — |
| V10 | `w20/` + `lint-cases/repeated-key.nix` | `statix check -o errfmt dotted.nix`; `nix eval --file repeated-key.nix` | `W:20:The key boot is first assigned here…`, exit 1; `error: attribute 'a' already defined`, exit 1 | `nested.nix` exit 0 |
| V11 | `w20/w12bad.nix`, `w12good.nix`, `statix.toml` | `statix check -o errfmt` | `W:12:Consider quoting this URI expression`, `W:17:builtins.toPath is deprecated`, exit 1 | exit 0; `-c statix.toml dotted.nix` exit 0 |
| V11b | same | `nix eval --option lint-url-literals fatal --file w12bad.nix u` | `error: URL literals are disallowed…`, exit 1 | exit 0 |
| V12 | `lint-cases`, `ifd-compliant` | `nixf-diagnose` | `[sema-duplicated-attrname] Error`, exit 1 | `ifd-compliant` exit 1 on unused `self`; with `-i sema-unused-def-lambda-noarg-formal` exit 0 |
| V13a | `check-ci-and-impls/ifd-violation` | `nix flake check --no-build` (cold) | exit 1, `path '…-generated-value.nix.drv' is not valid` | `ifd-compliant` exit 0 |
| V13b | same | `nix eval …default.drvPath` | builds `generated-value.nix.drv`, exit 0 (pure eval allows IFD) | — |
| V13c | same | `nix eval --option allow-import-from-derivation false …` | exit 1, `cannot build '…drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled` (IFD already realised) | — |
| V13d | same | `nix flake check` (build) plain / with option | plain exit 0; with option exit 1 (same message) | `ifd-compliant` with option exit 0 |
| V13e | same | `nix flake check --no-build` (warm, after V13b) | **exit 0**, `all checks passed!` | — |
| V14 | `foreign-ifd-{violation,compliant}` | `nix flake check --all-systems [--no-build]` | exit 100, `error: Cannot build '…-v.nix.drv'. Reason: platform mismatch Required system: 'aarch64-linux'` | exit 0; home-system run warns `The check omitted these incompatible systems: aarch64-linux` |
| V15 | `github:sxyazi/yazi/0ea4c5d9ef75…` | `nix flake check --no-build` on 2.35.2 / 2.31.5 / Lix | exit 1, `path '/nix/store/xzmki8…-source' is not valid` (Lix: `did not exist in the store during evaluation`) | `nix eval …default.drvPath` exit 0; the same check afterwards exit 0 |
| V16 | `check-ci-and-impls/substitutable-build` | `nix flake check -L`, `nix path-info`, `nix build` | `running 1 flake checks...` (2 declared); `sl` still `is not valid` after check | `nix build .#checks.x86_64-linux.sl` → `copying path '…-sl-5.05' from 'https://cache.nixos.org'` |
| V17 | `fc-no-nixpkgs`, `fc-empty-root`, `fc-stale`, `with-nixpkgs-input` | `flake-checker --no-telemetry [--fail-mode] flake.lock` | crash: exit 1, `Error: Invalid("no nixpkgs dependency found…")` / `Error: FlakeLock(Json(…Fallthrough node…))`; stale: exit 0 default, 1 fail-mode, `Non-supported Git branches for Nixpkgs` | exit 0 (`didn't identify any issues`) |
| V18 | `ci-bad` / `ci-good` | GATE-12 grep; Q19 grep | 3 unpinned `uses:` + `nix-installer-action@main` + `magic-nix-cache-action@v2`, exit 0 | both greps empty, exit 1 |
| V19 | `lix-leg-violation`, `lix-recmerge-reversed`, `lix-float-violation` | Q5 / `nix-instantiate --eval --strict` on 2.35.2, 2.31.5, Lix 2.95.2 | Lix exit 1 `attribute 'meta.minor' cannot be merged…`; CppNix and 2.31.5 exit 0. The float fixture on Lix gives only `warning: Found floating point literal without leading zero`, exit 0 | twin exit 0 on all three |
| V20 | pinned nixpkgs | floor expression (GATE-16); `nixVersions.nix_2_24.version`, `nix_2_30.version` | `nix_2_24 has been removed. use nix_2_31.`; `nix_2_30 has been removed. use nix_2_31.` | `["nix_2_31","nix_2_34","nix_2_35"]`; `nix_2_31` runs as `nix (Nix) 2.31.5` |
| V21 | Axis 7 rerun, sequential | `nix flake check --no-build` by remote ref | yazi exit 1 on all three (V15's limit) | jj: 2.35.2 exit 0 (4 s), 2.31.5 exit 0 (147 s), Lix exit 0 (6 s); zig-overlay: exit 0 / 0 / 0 |
| V22 | `check-ci-and-impls/pr-clone` (depth-1 clone, detached HEAD) | `nix flake metadata` | adding a staged file → `warning: Git tree '…' is dirty` | clean shallow detached clone: no dirty warning (NixOS/nix#5302 does not reproduce on 2.35.2) |

## Applied to the exemplars and the future consumers

**Satisfied by the strict exemplars**
- `ipetkov/crane@73b980519cef`:
  - `flake.nix:138-143` uses `pkgs.nixfmt-tree.override { settings.excludes = [ … ]; }`
    (GATE-01, GATE-04).
  - `.github/workflows/test.yml:142-147` SHA-pins checkout and
    install-nix-action with version comments and runs `nix fmt -- --ci`
    (GATE-02, GATE-12, GATE-13).
- `sxyazi/yazi@0ea4c5d9ef75:flake.nix:61` uses `formatter = pkgs.nixfmt-tree`
  (GATE-01), with zero statix and zero deadnix findings.
- `jj-vcs/jj@f01e70f8e375:.github/workflows/ci.yml:129-144` has a SHA-pinned
  installer, the `ubuntu-24.04`/`-arm`/`macos-14` matrix, and
  `nix flake check -L` (GATE-12, GATE-15). It is on alejandra, which is
  allowed. It has no `--all-systems` step (GATE-09 gap).
- `nix-community/nix-index-database@9ad722673ab3:.github/workflows/update.yml`
  runs `nix flake check -L --all-systems --no-build` and says why (GATE-09).

**Violated**

| Rule | Exemplar | Finding |
|---|---|---|
| GATE-01 | `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:147`, `the-nix-way/dev-templates@6a7eefd8fd91:flake.nix:81` | `formatter = … pkgs.nixfmt`, so a bare `nix fmt` reads stdin (V1) |
| GATE-03 | `nix-community/fenix@5f7e7d793cb2:flake.nix:46` | `nixpkgs-fmt` formatter |
| GATE-03 | `nix-community/nix-index-database@9ad722673ab3:flake.nix:69` | `nixfmt-rfc-style` formatter, which warns on every instantiation (V7) |
| GATE-03 | `numtide/blueprint@8be75245e274:formatter.nix:12` | `nixfmt-rfc-style` |
| GATE-03 | `hercules-ci/flake-parts@31729ca8cbdb:dev/flake-module.nix:26,37` | `pkgs.nixpkgs-fmt`, `hooks.nixpkgs-fmt.enable` |
| GATE-05 | `ipetkov/crane@73b980519cef:.github/workflows/test.yml:149` | `deadnix .` without `--fail` exits 0 on findings (V9b), so the gate cannot go red |
| GATE-08 | `cachix/devenv@6d76db3889de` | a cold `nix eval` builds `devenv-nixpkgs-patched.drv` (IFD, 95.6 s, [runs](nix-audit/exemplar-tool-runs.md) Axis 6). Tolerable for an A flake only with the GATE-08 comment |
| GATE-08 | 23/37 exemplar CIs | no `nix flake check` at all ([shape](nix-audit/exemplar-flake-shape.md) §9) |
| GATE-09 (author row) | `numtide/treefmt@d68dddf6ac3a` via blueprint | `checks.aarch64-darwin.pkgs-default-coverage` is not a derivation |
| GATE-09 (author row) | `helix-editor/helix@079a789e8cb0` | own `pkgsFor` recursion on `x86_64-freebsd` |
| GATE-12 | `nix-community/fenix@5f7e7d793cb2:.github/workflows/ci.yml:27,31,35,38` | `@v7`, `nothing-but-nix@main`, `install-nix-action@v31`, `cachix-action@v17` |
| GATE-12/13 | `ghostty-org/ghostty@b40acce58dcf:.github/workflows/test.yml:264` (and 10 more lines) | `DeterminateSystems/nix-installer-action@main`: floating, and Determinate by default |
| GATE-12/13 | `the-nix-way/dev-templates@6a7eefd8fd91:.github/workflows/ci.yml:27` | `determinate-nix-action@main` |
| GATE-11 (tool limit, not a defect) | `hercules-ci/flake-parts`, `numtide/flake-utils`, `nix-community/nix-index`, `ipetkov/crane` | flake-checker crashes (V17 shapes); correctly, none adds a nixpkgs input for it |
| GATE-16 | all 37 | no Lix or floor leg anywhere; the rule is prescriptive |

**New commitments for the fleet's flakes** (ocx, grimoire, ocx-sdk-python,
setup-ocx; shape A):
- Every fleet flake declares `formatter = pkgs.nixfmt-tree` (GATE-01, MUST
  for the fleet).
- Every fleet repository carries one `nix.yml` workflow shaped like
  `fixtures/nix-gates/ci-good/.github/workflows/nix.yml`: SHA-pinned
  checkout, installer and cache; `install_url` at the pinned Nix; the six
  blocking steps; the Lix and floor legs as `continue-on-error` jobs.
- The Rust CLIs build through `packages.default` on every push (GATE-10).
  There is no public cache (owner Q2), so this is a real build of 17 or 10
  `-sys` crates. Budget CI time for it rather than skip it.

**New commitments for the ocx-generated flake** (shape D):
- Q5 with no IFD exemption (GATE-08). The generated data directory goes
  in the GATE-04 exclude list.
- It pins nixpkgs because its FODs use `fetchurl`, so flake-checker can run.
  That is a consequence, not a reason (GATE-11).
- `--all-systems --no-build` is the only way its CI can check darwin
  entries without darwin runners, as in nix-index-database's precedent
  (GATE-09).
- It builds a sampled subset of packages per run (GATE-10). Which subset is
  owned by NIX-GEN.

## AI-agent failure modes

Ranked by how often the corpus and the runs show them.

1. **The CI step runs `nix flake check` alone**, so formatting, dead code, IFD
   and real builds are never checked (only 14/37 even run that).
   Check: `grep -rn -e 'nix fmt -- --ci' -e 'deadnix --fail' -e 'allow-import-from-derivation false' -e 'nix build' .github/workflows`.
   Each missing line is a missing step.
2. **Wrong formatter name or shape**: `nixfmt-rfc-style`, `nixpkgs-fmt` (5
   exemplar hits), or bare `pkgs.nixfmt` (2).
   Check: Q10, plus `nix fmt` then `git status --porcelain` on a planted
   misformatted file (V1/V2).
3. **Actions left floating** (`@main`, `@vN`), and `nix-installer-action`
   assumed to be upstream Nix. Check: the GATE-12 grep and Q19 (V18).
4. **deadnix wired without `--fail`**, so it is always green (crane), or run
   with `--edit` without `-L`, which deletes `callPackage` formals and
   `self`. Check: V9/V9b, plain versus `-L` on the same file.
5. **"Fixing" an `--all-systems` red by deleting systems**, or reading
   `path … is not valid` as a flake bug. Check: the GATE-09 table, then
   `nix eval <ref>#<attr>.drvPath` (V15).
6. **Trusting `--no-build` as an IFD ban**: it goes green on a warm store.
   Check: Q5 (V13).
7. **Trusting a green `nix flake check` as a build**, since Nix 2.32 skips
   substitutable checks. Check: the `running N flake checks` count against
   the number declared, plus the `nix build` grep (V16).
8. **Remembering a Nix floor** (`nix_2_24`) instead of computing it. Check:
   the V20 expression. A `has been removed. use nix_2_N` error names the
   floor.
9. **Treating statix W20 or nixf-diagnose warnings as defects**, and
   merging, deleting or failing CI on them. Check: `statix explain W20`, and
   `nix eval` on the file. A real duplicate key is already an evaluation
   error (V10).
10. **Reading a flake-checker exit code as its verdict**, when exit 0 hides
    findings and exit 1 conflates crashes with findings. Check: `--fail-mode`
    plus the stderr grep (V17).

## Open questions

**Owner decisions (the default the program applies):**
- Q2, public binary cache. Default: none. GATE-10 therefore costs a full Rust
  build per push on fleet CI.
- Q6, implementation promise. Default applied: CppNix gated; Lix and floor
  legs advisory (GATE-16); Determinate untested and never deliberately
  broken.
- New: may a fleet flake carry an **allowlist of accepted `--all-systems`
  reds** (for example a system blocked upstream by nixpkgs)? Default: no. The
  fleet's four systems (x86_64/aarch64 × linux/darwin) are all green today, so
  any red is investigated.

**Subareas that need another round:**
- **gates/ci-live** — run `ci-good`'s workflow on real GitHub runners. Does
  `cache-nix-action` v7 or `magic-nix-cache-action` v15 restore a Rust
  flake's closure faster and inside GitHub's 10 GB cache cap after the 2025
  API change? Do `ubuntu-24.04-arm` and `macos-15` evaluate the gate within
  budget? Neither dive nor this consolidation ran a runner (GATE-14 and
  GATE-15 stay SHOULD until then).
- **gates/eval-budget (M-F-18)** — what wall-time budget should CI enforce for
  `nix flake check --all-systems --no-build`, and how is a network-bound
  input fan-out (helix, 300 s) told apart from a hang (nix-installer,
  treefmt-nix: silent 300 s)? Unmeasured.
- **flakes/outputs-contract follow-up** — V15 shows the remote-ref
  `-source is not valid` failure is `--no-build` on a cold store: it
  reproduces on 2.31.5 and Lix and clears once the source is realised. That
  contradicts outputs-contract's lazy-copy hypothesis. The NIX-FLK
  consolidation should adopt V15 and drop its "combination is known-bad"
  rule.
- **toolchain (not research)** — `run.sh` needs a stale-dotfile-lock guard
  before any further wave. Retro entry filed:
  `.agents/retro/inbox/20260927T101137Z-27acfc3a.json`.

## Sub-artifacts

- [nix-gates/format-and-lint.md](nix-gates/format-and-lint.md) — the formatter
  of record, `nixfmt-tree`, statix and deadnix classification on six
  exemplars, nixf, treefmt-nix and git-hooks.nix wiring, and exclusion
  mechanisms. It ran no toolchain commands. Its W20, directory-mode and
  alias claims are corrected above.
- [nix-gates/check-ci-and-impls.md](nix-gates/check-ci-and-impls.md) — what
  `nix flake check` proves, the `--all-systems` taxonomy, the installer and
  cache landscape after 2025, flake-checker, the Lix, floor and CVE matrix,
  and a nine-step block. Its fixtures were staged but not run. Its `--no-build`
  IFD prediction, `nix_2_27` floor, Lix-float "forbidden" and generator
  root-nixpkgs MUST are corrected above.

## Key sources

- RFC 166, Nix formatting: https://github.com/NixOS/rfcs/blob/master/rfcs/0166-nix-formatting.md
- nixfmt README (`nixfmt-tree`, one-file-at-a-time, `nixfmt:disable`): https://github.com/NixOS/nixfmt/blob/master/README.md
- nixpkgs `nixfmt-tree` package: https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/ni/nixfmt-tree/package.nix
- nixpkgs 25.11 release notes (nixfmt rename): https://github.com/NixOS/nixpkgs/blob/master/doc/release-notes/rl-2511.section.md
- deadnix README (flags, `--fail` off by default): https://github.com/astro/deadnix/blob/main/README.md
- statix README (fork notice, `statix.toml`): https://github.com/oppiliappan/statix/blob/master/readme.md
- `nix flake check`, 2.35 manual: https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check
- Nix 2.32 release notes (check skips substitutable derivations): https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.32.md
- NixOS/nix#4265, foreign-system IFD: https://github.com/NixOS/nix/issues/4265
- cachix/install-nix-action: https://github.com/cachix/install-nix-action
- DeterminateSystems/nix-installer-action (Determinate by default): https://github.com/DeterminateSystems/nix-installer-action
- nix-community/cache-nix-action: https://github.com/nix-community/cache-nix-action
- Magic Nix Cache free-tier end of life: https://determinate.systems/blog/magic-nix-cache-free-tier-eol/
- flake-checker README (exit behaviour, CEL conditions): https://github.com/DeterminateSystems/flake-checker
- Lix 2.95 release (`rec-set-merges`, `floating-without-zero`): https://lix.systems/blog/2026-03-25-lix-2.95-release/
