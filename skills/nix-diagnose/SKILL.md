---
name: nix-diagnose
description: Error-keyed diagnosis procedure for a Nix evaluation, flake check or build that already fails, covering infinite recursion, undefined variables, "is not a derivation", overlay argument errors, "path is not valid" on a cold store, x86_64-darwin throws, follow cycles, hash mismatches, IFD refusals, red --all-systems runs, a Lix leg that disagrees with CppNix, a flake check that looks hung, and an error that did not change after a fix. Use when someone pastes a Nix error, says nix flake check or nix build fails, evaluation is stuck, infinite recursion encountered, --all-systems is red, it works locally but fails in CI, Lix says something different, the Nix upgrade broke the flake, or asks why a Nix error happens. Not for writing flake standards, which the nix-quality rule carries, and not for adding a flake to a repository or cutting a release, which are nix-flake-adopt and nix-flake-release.
license: Apache-2.0
metadata:
  summary: Routes a failing Nix evaluation or build from its verbatim error, keyed by era and shape, to the cause and the rule that fixes it, measured on CppNix 2.35.2, 2.31.5 and Lix 2.95.2
  keywords: nix,flake,diagnose,debugging,evaluation,infinite-recursion,show-trace,no-eval-cache,nix-repl,flake-check,all-systems,lix,cppnix,cold-store,ifd,follows,hash-mismatch,error-catalog
---

# nix-diagnose

A Nix evaluation, `nix flake check` or build already fails. This skill takes the
verbatim error to its cause, then to the rule that fixes it.

Measured 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, the
floor `nix_2_31` = 2.31.5, Lix 2.95.2, nixfmt 1.5.0, deadnix 1.3.2 and
flake-checker 0.2.15. Determinate Nix was not measured. This skill carries the procedure only. It cites the `nix-quality` rule by
ID (NIX-CORE, NIX-FLK, NIX-INP, NIX-LANG, NIX-PKG, NIX-GATE, NIX-GEN, NIX-SEC,
NIX-MOD), and that rule's routing table names the depth file for each family.
The verbatim strings live in [references/error-catalog.md](references/error-catalog.md).

**Pinned defaults** (an adopter overrides each once): CppNix is the gated
implementation, Lix is an advisory leg, Determinate Nix is untested but never
deliberately broken (frame Q6). The consumer floor is the oldest non-stub
`nixVersions.nix_2_*` in the pinned nixpkgs, computed, never remembered (frame
Q8, today 2.31.5).

Contents: [Stop condition](#stop-condition) ·
[Never weaken the check](#never-weaken-the-check) ·
[Step 0: era and shape](#step-0-era-and-shape) ·
[Step 1: the bare error line](#step-1-the-bare-error-line) ·
[Step 2: match the catalog](#step-2-match-the-catalog) ·
[Step 3: the implementation check](#step-3-the-implementation-check) ·
[Step 4: isolate by removal](#step-4-isolate-by-removal) ·
[Step 5: cache, repl](#step-5-cache-repl) ·
[Infinite recursion](#infinite-recursion) ·
[A red --all-systems run](#a-red---all-systems-run) ·
[A check that looks hung](#a-check-that-looks-hung) ·
[Classify flake-checker](#classify-flake-checker) ·
[Explicitly not a defect](#explicitly-not-a-defect) ·
[The receipt](#the-receipt) · [MUST rows](#must-rows-this-procedure-surfaces) ·
[What agents get wrong](#what-agents-get-wrong)

## Stop condition

Stop when all four hold.

1. The **cause is named as a mechanism**: "`cargoLock.lockFile` reads
   `${src}/Cargo.lock` at evaluation time" is a cause, "a store problem" is not.
2. The **command and its verbatim first `error:` line are pasted**, with
   `nix --version` above them.
3. Either the **fix was watched**: the same command, red before and green after,
   on the same implementation. Or the cause is a **named gap** (nixpkgs-internal,
   an upstream issue, an unmeasured implementation) with the version it holds on.
4. Nothing outside the cause changed to reach step 3.

## Never weaken the check

Making the error disappear by weakening what raised it is the failure this skill
exists to prevent (NIX-CORE-01). Each edit below is a violation, not a fix.

| Edit | Why it is a violation | Rule |
|---|---|---|
| Deleting a system from the list after a red `--all-systems` run, before triage | 8 of 10 measured reds were not the author's defect, and coverage is lost | NIX-GATE-09 |
| Renaming `final:` to `self:`, or deleting the overlay, to stop an infinite recursion | A different class with a different fix, and `self:` fails the output check | NIX-LANG-10, NIX-FLK-02 |
| `doInstallCheck = false` or removing `versionCheckHook` after a `versionCheckPhase` failure | Deletes the only build-time proof the binary runs | NIX-PKG-19 |
| `--impure` to get past `currentSystem` or `<nixpkgs>` | Outputs start depending on the host | NIX-LANG-04 |
| `--accept-flake-config`, or answering the trust prompt "permanently" | A root-equivalent trust escalation | NIX-SEC-02 |
| `--extra-deprecated-features rec-set-merges` to quiet Lix | CppNix accepts the merge with implementation-defined semantics, so the defect ships | NIX-LANG-05 |
| `--option abort-on-warn true` over a whole flake to "be strict" | Fails every deliberate deprecation shim | NIX-REL-11 |
| Adding a `nixpkgs` input so flake-checker stops crashing | Changes every consumer's lock for a tool limit | NIX-GATE-11 |
| Raising the CI timeout on a check that looks hung | Hides a real stall and a real scope problem alike | NIX-INP-13 |
| `toString ./path` or `unsafeDiscardStringContext` to silence a string-context error | Evaluates, then fails in the sandbox or passes off-sandbox without the dependency | NIX-LANG-02 |
| Pasting any hash that makes a warm `nix build` green | The store reuses the old path, so nothing was verified | NIX-PKG-03, NIX-PKG-04 |

If the only fix available is one of these, record it as a gap under stop
condition 3. Never apply it silently.

## Step 0: era and shape

Before any hypothesis (NIX-CORE-04, NIX-LANG-08). The same fault prints
different text across implementations and versions (class C20), so a string
means nothing until you know who printed it.

```sh
nix --version
jq -r '.nodes[.nodes.root.inputs.nixpkgs // "nixpkgs"] | .original.ref // .original.url // .original.rev, .original.type, .locked.type' flake.lock
```

Reading:
- `nix (Nix) 2.35.2` is CppNix. `nix (Lix, like Nix) 2.95.2` is Lix. Determinate
  Nix was not measured. Step 3 applies whenever the output says Lix.
- The `jq` line prints three lines for the root nixpkgs node, whatever the lock
  names it (`nixpkgs_2` included). The first is the branch (`nixos-unstable`),
  a channel URL that names it, or, for a rev-pinned input, the rev. The second
  is the input's type (`github`, `tarball`, `indirect`), and the third the
  fetcher that really ran (`github`, `tarball`). `null` three times means no
  nixpkgs node, which is normal for a library flake (B). Exit 5 with `Cannot
  index object with array` means the root `nixpkgs` follows another input: read
  that input's node.

Then record three facts in one line each:
1. **Flake shape** (NIX-CORE-05): A app, B library, C module, D generated,
   E template.
2. **Input shape of the failure**: flake output check, fetcher, module
   evaluation, per-system helper, lock and `follows`, or build.
3. **Where and how it ran**: local checkout or remote ref, warm or cold store
   (a fresh CI runner is cold), `--no-build` or a real build.

## Step 1: the bare error line

Read the **first** `error:` line exactly as printed, with no extra flags. Most
catalog rows are diagnosable from that line plus Step 0. `--show-trace` does not
change the final line. It only adds frames, and for the `is not a derivation`,
`is not valid` and deprecation rows it adds nothing.

Paste the line into the receipt before touching anything.

If that line names no rule, chiefly `infinite recursion encountered`, re-run
the same command once with `--show-trace`. The innermost frame that belongs to
your flake picks the class (see [Infinite recursion](#infinite-recursion)). A
frame under the nixpkgs source is class (d).

## Step 2: match the catalog

Open [references/error-catalog.md](references/error-catalog.md). Pick the
section by input shape, then the row by (implementation, version), then by the
key fragment:

| The failure's input shape | Catalog section |
|---|---|
| A language error, a module, `undefined variable`, `infinite recursion`, unfree or platform refusals | A. Language and modules |
| `nix flake check` output errors or warnings, cold-store `is not valid`, `x86_64-darwin`, `nix run` | B. Flake output contract |
| `nix fmt`, deadnix, IFD, Lix-only rejections, a removed `nix_2_N`, flake-checker | C. Gate tools |
| `nix flake lock`, `follows`, `path:` inputs, eval-time downloads | D. Inputs and the lock |
| A fixed-output hash, a Python or Rust builder, `versionCheckPhase`, submodules | E. Packaging and builds |
| The first plausible cause did not hold | Misattributed diagnostics |

A row marked `carried-from-research` is evidence from an earlier watched run.
Re-run its first command on your implementation before you cite it as the only
cause. The same applies to an old upstream issue: NixOS/nix#8013 (a symlinked
flake) no longer reproduces on any of the three measured implementations.

No row matches? Go to step 4 with the line you have, and say in the receipt that
the catalog had no entry.

## Step 3: the implementation check

On a Lix host, a green output-contract check is **not evidence** for the
CppNix-gated MUSTs (NIX-FLK-19). Lix 2.95.2 exits 0 on a string `formatter`, a
`self: super:` overlay and an `apps` entry with an extra key, all of which
CppNix rejects. Re-run on CppNix before you report green:

```sh
nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --no-write-lock-file --option allow-import-from-derivation false .
```

Exit 0 passes. Exit 1 prints the CppNix error. `nix_2_31` is the 2026-09-27
floor (NIX-GATE-16 computes it). A lock older than the floor has no such
attribute (numtide/blueprint's 25.05 pin stops at `nix_2_26`: `does not provide
attribute`): drop `--inputs-from .` there, and the flake still evaluates
against its own lock. The reverse also holds: a
Lix-only red on a mixed `rec` merge (catalog row 33) is a real NIX-LANG-05
finding even though CppNix is green. A flake that declares `inputs.self` needs
`--extra-experimental-features flake-self-attrs` on the Lix leg (NIX-GATE-16),
and failing without it is not a finding.

## Step 4: isolate by removal

Before naming a cause, **remove the suspected clause, keep everything else, and
re-run the Step 1 command**. The error persisting means the clause is innocent.
Every class C7 misattribution in the catalog was first blamed on the nearest
plausible expression and corrected only by this run.

Two cheap pre-checks narrow the search before removal. Each prints the finding,
and empty output passes:

```sh
git ls-files --others --exclude-standard .
grep -rn -e '"${src}/' -e '"${finalAttrs.src}/' -e '"${self}/' --include='*.nix' . | grep -e 'readFile "' -e 'importTOML "' -e 'importJSON "' -e 'lockFile = "'
```

- The first lists files the flake cannot see because they are untracked
  (NIX-FLK-16). `git add` them and re-run.
- The second finds eval-time reads through the flake's own source store path
  (its second grep drops build-time interpolation, which NIX-LANG-02 allows),
  the cause of a cold-store `path '/nix/store/…-source' is not valid`
  (NIX-FLK-07). It misses reads hidden inside a builder, so a red cold-store
  `nix flake check --no-build` stays authoritative.

## Step 5: cache, repl

Escalate in this order, and only as far as needed.

1. **`--no-eval-cache`, when the message did not change after a fix** and an
   identical re-run. The eval cache is keyed by flake narHash and attribute
   path ([NixOS/nix#3872](https://github.com/NixOS/nix/issues/3872)). Staleness
   was not reproduced on bare attributes on 2.35.2, which is an environment gap,
   not proof it is gone. Expect it on deep module evaluations.
2. **`nix repl`, or one field at a time, when you need to see a value.** Never
   read `nix eval --json` of a derivation as the whole value: it prints only the
   `outPath` string (NIX-LANG-11). Project instead:

```sh
nix eval --json .#default --apply 'p: { inherit (p) pname version; }'
```

An object back is the pass. A bare `"/nix/store/…"` string means the
attribute carries `outPath` and the projection was dropped.

`nixf-diagnose` is a static first look for `undefined variable` and duplicate
attributes (`nix run nixpkgs#nixf-diagnose -- flake.nix`, unlocked on purpose:
`--inputs-from .` evaluates the flake first and dies on the very undefined
variable the tool exists to report). It exits 1 on
warnings such as an unused `self`, so it is an editor aid, never a verdict
(NIX-GATE-07).

## Infinite recursion

One string, five causes, incompatible fixes (NIX-LANG-10). Classify by the
innermost frame before changing anything. **Never** apply a generic fix: delete
a system, delete the overlay, or rename `final:` to `self:`.

| Class | What the frame shows | Fix | Catalog |
|---|---|---|---|
| (a) | An overlay reads `final.x` while defining `x` | Read `prev.x` | row 2 |
| (b) | `imports` computed from `config`. CppNix with nixpkgs 26.11pre prints ``you probably reference `config` in `imports` `` without a trace. Lix 2.95.2 prints no hint, so run `--show-trace` and look for the `imports =` frame | Make `imports` unconditional, gate with `lib.mkIf` | row 1 |
| (c) | A per-system helper indexes its own unfinished set, or bootstraps a system it cannot build | Build the set once, or drop that system | row 3 |
| (d) | The innermost frame is under the nixpkgs source | None in the flake. File upstream or wait | row 4 |
| (e) | A `rec` attribute shadows the binding it reads (`settings = settings // { … }`) | Rename the outer binding (NIX-LANG-01) | none |

```nix
{
  # wrong: final.greeting is the value this overlay defines
  bad = final: _prev: { greeting = final.greeting + "!"; };
  # right: read the layer below
  good = _final: prev: { greeting = prev.greeting + "!"; };
}
```

```nix
{ config, lib, ... }:
{
  # wrong: imports = lib.optional config.feature.enable ./feature.nix;
  imports = [ ./feature.nix ];
  config = lib.mkIf config.feature.enable { services.feature.enable = true; };
}
```

A `follows` cycle on Lix also reads as recursion (`stack overflow (possible
infinite recursion)`, catalog row 38). If the command was a lock operation,
read the `follows` lines, not the trace.

## A red --all-systems run

`nix flake check --all-systems --no-build` is red. Triage the first `error:`
line against this table **before** editing the systems list (NIX-GATE-09). The
triage is a reading heuristic: the same exit code covers every row.

| First error line (CppNix 2.35.2 unless noted) | Cause | Author's fix? |
|---|---|---|
| `Nixpkgs 26.11 has dropped support for x86_64-darwin.` | nixpkgs dropped the platform | Yes: drop `x86_64-darwin`, or stay on `nixos-26.05` until end of 2026 (NIX-FLK-09) |
| `Refusing to evaluate package '…' … not available on the requested hostPlatform` | A platform-restricted dependency | No. An optional per-system guard |
| `infinite recursion encountered` with a nixpkgs path as the innermost frame | A nixpkgs bug | No |
| `cannot bootstrap GHC on this platform` | A toolchain limit | No |
| `Cannot build '…drv'. Reason: platform mismatch Required system: 'aarch64-linux'` (exit 100) | Foreign-system IFD | Yes: remove the IFD (NIX-GATE-08) |
| `path '/nix/store/…-source' is not valid` (CppNix 2.35.2, 2.31.5), `… did not exist in the store during evaluation` (Lix 2.95.2) | An eval-time read through the flake's own source store path (NIX-FLK-07, NIX-PKG-15) | Yes: read the source-tree path |
| `path '/nix/store/…drv' is not valid` for an IFD output on a cold store | `--no-build` depends on the store state for IFD, a checker limit | No for the red itself. Run the deterministic `--option allow-import-from-derivation false` check (NIX-GATE-08) |
| `flake attribute 'checks.<sys>.<n>' is not a derivation` | The author, or a library it imports | Yes |
| `infinite recursion encountered` in the flake's own per-system helper | The author (class c) | Yes |

Run the gate from a local checkout, never by remote ref (NIX-GATE-09). A
remote-ref run of a flake with an eval-time source read is red for the same
FLK-07 reason, not for a different one.

## A check that looks hung

A `nix flake check` or `nix flake show` with no output for minutes is not
proof of a hang. nix-installer's `hydraJobs` evaluation looked silent for 300 s
and was progressing all along. Re-run with `-v` under a wall-clock limit, stamp
each line, and read the largest gap (NIX-INP-13):

```sh
set -o pipefail
timeout 900 nix flake check --no-build -v 2>&1 | awk '{ print strftime("%s"), $0 }' > check.log
awk 'NR > 1 && $1 - prev > max { max = $1 - prev } { prev = $1 } END { print "max gap", max + 0 }' check.log
tail -n 1 check.log
```

- Exit 124 from the `timeout` line means the limit killed it (`pipefail` carries
  the code through `awk`). `tail` names the last step printed.
- A max gap over 60 s is an **alarm** naming that step, never an automatic kill:
  one legitimate long fetch or IFD build looks the same.
- A stream that keeps moving is a scope problem. Exclude heavy outputs such as
  `hydraJobs` from the check. Never raise the timeout.

Watched: an eval-time fetch to an unroutable address printed a 20 s gap (the
rig's `connect-timeout = 20`) and exit 124 under a 30 s limit. The compliant
twin printed a 0 s gap and exit 0. `strftime` needs GNU awk.

## Classify flake-checker

flake-checker exits 1 both on findings (with `--fail-mode`) and on its own crash,
so the exit code alone cannot tell them apart (NIX-GATE-11):

```sh
flake-checker --no-telemetry --fail-mode flake.lock > fc.out 2>&1
grep -c -e 'Error: Invalid(' -e 'Error: FlakeLock(' fc.out
```

A count of 1 or more means the tool could not run (no root `nixpkgs` input, or
an empty lock): not a finding. A count of 0 with exit 1 from the first command
is a real finding. Exit 0 from the first command is clean, except with `no flake
lockfile found`: lock the flake first.

## Explicitly not a defect

Each of these gets flagged by an agent or a reviewer. Leave it alone, and say
so in the receipt.

**Checker limits:**
- flake-checker crashing on a flake with no root `nixpkgs` input or an empty
  lock (flake-checker 0.2.15).
- `nix flake check --no-build` red with `path '…drv' is not valid` on an **IFD**
  flake on a cold store: a store-state limit. The deterministic check is
  `--option allow-import-from-derivation false` (NIX-GATE-08). A cold-store
  `…-source' is not valid` is **not** in this list: that one is the author defect
  NIX-FLK-07.
- `--no-build` never building anything: it cannot see a wrong
  `meta.mainProgram`, a foreign-system IFD or a failing build. A green result is
  not a build (NIX-GATE-10). Since Nix 2.32 `nix flake check` also skips checks it
  can substitute.
- `--all-systems` reds that the triage table marks "No".
- deadnix or statix parse errors on a repository's deliberately malformed parser
  test fixtures.
- statix W20 (repeated dotted keys) and `nixf-diagnose` exiting 1 on an unused
  `self`: style and warnings, not defects (NIX-GATE-06, NIX-GATE-07). A literal
  duplicate key is already an evaluation error.
- The eval-cache staleness bug not reproducing in your run.

**Expected output:**
- `warning: unknown flake output` for a community output (`lib`, `homeModules`,
  `flakeModule`). Only `schemas` is a finding (NIX-FLK-05).
- `warning: Git tree '…' is dirty` in a working checkout with uncommitted edits.
- The Lix leg failing with `experimental Lix feature 'flake-self-attrs' is
  disabled` when the leg lacks `--extra-experimental-features flake-self-attrs`:
  fix the leg's command, not the flake (NIX-GATE-16).
- `x86_64-darwin` in a flake pinned to `nixos-26.05`: supported until the end of
  2026.
- A template repository with no `flake.lock`: templates ship lockless.
- A `-v` stream that keeps moving for minutes.

**Style an agent mistakes for a defect:**
- `rec` for `pname` and `version` interpolation in a package file.
- deadnix's unused `callPackage` formals when run without
  `--no-lambda-pattern-names`.
- `with import <nixpkgs>` in a `default.nix` or `shell.nix` compatibility shim.
- `overrideAttrs` in a downstream or generated flake.

## The receipt

Write five blocks, in this order.

1. **Era and shape**: Step 0's three commands and output, plus the flake shape,
   the input shape and where it ran.
2. **The error**: the command and its first `error:` line, verbatim.
3. **Cause**: the mechanism, the catalog row (number and status) or "no row",
   and the implementation and version it holds on.
4. **Evidence**: the isolation run from step 4, and the fix watched red then
   green with the same command on the same implementation.
5. **Fix, or gap**: the change and the rule ID it satisfies, or the named gap
   and the version or surface that would settle it.

A diagnosis citing no rule ID either found something new, and says so, or
skipped the rule that already covered it.

## MUST rows this procedure surfaces

Restated as findings so a diagnosis run without the rule loaded still reports
them with the right ID. The rule text and full verification live in the
`nix-quality` rule.

| # | Finding | Rule |
|---|---|---|
| 1 | A check was weakened, a system dropped or a lint disabled to get green | NIX-CORE-01 |
| 2 | An error string was matched before `nix --version` and the input shape were recorded | NIX-LANG-08 |
| 3 | An `infinite recursion` was fixed generically, without classifying the frame | NIX-LANG-10 |
| 4 | A Lix-green `nix flake check` was reported as the output contract passing | NIX-FLK-19 |
| 5 | An `--all-systems` red was fixed by editing the systems list before triage | NIX-GATE-09 |
| 6 | A file is read at evaluation time through the flake's own source store path | NIX-FLK-07 |
| 7 | A file the flake reads is untracked | NIX-FLK-16 |
| 8 | An exported overlay's first argument is not `final`, `_final` or `_` (`self: super:`, `prev: final:`), or it takes formals | NIX-FLK-02 |
| 9 | `x86_64-darwin` is declared against nixpkgs 26.11 or unstable | NIX-FLK-09 |
| 10 | Code reads `pkgs.system` | NIX-FLK-12 |
| 11 | One attribute path mixes a `rec` and a plain definition | NIX-LANG-05 |
| 12 | `getEnv`, `nixPath`, `currentSystem` or `<nixpkgs>` is reachable from outputs, or `--impure` was added | NIX-LANG-04 |
| 13 | A hash was guessed, or a fetcher edit was verified without `--rebuild` | NIX-PKG-03, NIX-PKG-04 |
| 14 | A `versionCheckPhase` failure was answered by disabling the check | NIX-PKG-19 |
| 15 | `accept-flake-config` was passed or recommended | NIX-SEC-02 |
| 16 | A third-party flake was run with `develop`, `shell`, `run` or `direnv allow` during diagnosis | NIX-SEC-05 |

## What agents get wrong

1. **One fix for every `infinite recursion`.** Deleting a system, deleting the
   overlay and renaming `final:` are three fixes for three different classes.
2. **Matching a remembered string.** `points outside of its parent's store path`
   is what Lix 2.95.2 still prints for an out-of-tree `path:` input, while
   CppNix 2.31.5 and 2.35.2 say `access to absolute path … is forbidden`. Step 0
   first.
3. **Reporting a Lix green as passing.** Three contract errors are silent on Lix.
4. **Blaming the `self.packages` alias for `-source' is not valid`.** The alias
   is innocent. The eval-time read is the cause, and it is an author defect, not
   a checker limit.
5. **Reading `cannot coerce an integer to a string: 42` as a coercion bug.** A
   module list holds a non-module value.
6. **Reading `nix eval --json` of a package as the whole value.** Only
   `outPath` came back.
7. **Treating `undefined variable` as lazy everywhere.** Without an enclosing
   `with` it fails for every attribute of the file.
8. **Trusting a green `nix flake check --no-build`** as proof of a build, a
   working `nix run` or a working module.
9. **Killing a silent check, or raising its timeout,** without `-v`.
10. **Reaching for `--impure`, `--accept-flake-config` or
    `--option abort-on-warn true`** to make a confusing error go away.
11. **Citing an old open issue as current** without re-running its repro on the
    pinned version.
12. **Running `nix develop` or `nix run` on a flake it was only asked to
    inspect.** A `shellHook` runs as you (NIX-SEC-05).
