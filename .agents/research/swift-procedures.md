---
title: "SW-CORE consolidation: the swift-quality index core, the swift-upgrade procedure and the swift-diagnose runbook, measured on Swift 6.4.0 and 6.3.3"
topic: procedures (rows M-K-01..08 as far as they are procedure-shaped, M-P-01, M-P-02; M-P-03 is SW-REL, M-P-04 deferred)
model: sonnet
id_family: SW-CORE
consolidates:
  - swift-procedures/upgrade-and-diagnose.md
date: 2026-10-10
---

# SW-CORE: the index core and the two procedures

Scope: the cross-cutting checks the `swift-quality` index carries (the CORE trio, floor, generated code, shape and routing) and the step lists of the `swift-upgrade` and `swift-diagnose` skills. Rule text for the other families is cited by ID and never restated (SW-CONC-01..35, SW-GATE-01..29, SW-PKG, SW-ERR, SW-CLI, SW-TEST, SW-IO). Narrative, step tables and sources live in the one sub-artifact, [upgrade-and-diagnose.md](swift-procedures/upgrade-and-diagnose.md); this file keeps the decisions, the de-duplicated ruleset and the evidence re-run for the consolidation.

Everything below was run on 2026-10-10 on Linux x86_64 in the `swift:6.4` (6.4.0) and `swift:6.3` (6.3.3) images through `/home/mherwig/.cache/research-lang/swift-tools/run.sh`. Fixtures: `F=/home/mherwig/.cache/research-lang/swift-tools/fixtures/procedures-consolidation` (the scripts quoted here are saved there with the same names; run logs in its `logs/`). macOS, Xcode, Windows, the static Linux SDK and Wasm are `unverified: read only`.

## Table of contents

1. [Verdict](#verdict)
2. [The ruleset](#the-ruleset)
   1. [A. Core checks: diff scripts, canary, floor, generated code](#a-core-checks-diff-scripts-canary-floor-generated-code)
   2. [B. Artifact shape and routing](#b-artifact-shape-and-routing)
   3. [C. swift-upgrade](#c-swift-upgrade)
   4. [D. swift-diagnose](#d-swift-diagnose)
   5. [Conflicts resolved](#conflicts-resolved)
   6. [Verification runs](#verification-runs)
3. [Applied to the exemplars and the future consumers](#applied-to-the-exemplars-and-the-future-consumers)
4. [AI-agent failure modes](#ai-agent-failure-modes)
5. [Open questions](#open-questions)
6. [Sub-artifacts](#sub-artifacts)
7. [Key sources](#key-sources)

## Verdict

1. **The index opens with the CORE trio** (SW-CORE-01 weaken-check, -02 watched red, -03 empty output), each a saved script or a named reading heuristic. Binds every code kind (library, SDK, CLI, server, app).
2. **Read the floor and record a baseline before the first edit, and prove the manifest in effect afterwards** (SW-CORE-04; the command is SW-PKG-06's). `swift package migrate` on a package with a `Package@swift-X.swift` file edits the dead `Package.swift` and exits 0: 0 features on the manifest in effect. Binds every kind that edits a manifest.
3. **Generated Swift is regenerated, never edited, and never scanned by the tell set** (SW-CORE-05, -06). Two layers, path and marker line, because path alone misses 120 of 450 marker files in the corpus. Binds libraries, servers and CLIs with codegen; amends SW-GATE-10.
4. **The `swift-upgrade` skill is the U0..U10 order of the sub-artifact** (SW-CORE-09, -11, -12, -13). Only five feature names are migratable, the flag is `--target`, the done test is `-Xswiftc -warnings-as-errors` exit 0 on the current and the floor toolchain. Binds existing Swift 5-mode libraries, SDKs, CLIs and servers; apps are `unverified: read only`.
5. **An upgrade adds zero hatches, judged by the added-lines delta, not the whole-tree pass** (SW-CORE-10): ladder tree 0 added, lazy twin 13, while the whole-tree pass prints 2 versus 12. Binds every upgrade of an adopted tree.
6. **The `swift-diagnose` skill routes by exit code plus the first message line** (SW-CORE-16): 17 of 17 right on 6.4 and 6.3, 7 of 7 on release builds, against 11 of 17 and 5 of 7 wrong for the exit-code-only tree. Binds every runtime failure of every kind.
7. **A diagnosis never edits the check to make the symptom stop** (SW-CORE-17); the fix is accepted only when the same measurement clears. Binds every kind.
8. **Capture before kill** (SW-CORE-18): backtracer on, `set -m` launch, `SIGQUIT` before `SIGKILL`, signal the test runner not the driver. Linux 6.3 and 6.4 measured; macOS `unverified: read only`.
9. **TSan is authoritative in diagnosis and advisory in CI** (SW-CORE-19): report kind first (`data race` versus `Swift access race`), five plain runs as fallback. Binds servers, daemons and the SDK's process layer.
10. **Four dated probes must still fail at every toolchain bump** (SW-CORE-14): SE-0526, SE-0540, SE-0529, T-V42. All four STILL on 6.4 and 6.3.
11. **Scope fences.** `swift-release` is SW-REL (M-P-03), not this family; the review skill (M-P-04, P3) is not authored.
12. **Count.** 21 rules: 8 MUST (01 to 05, 10, 16, 17), 13 SHOULD. Eleven conflicts with earlier consolidations are resolved below; four fix defects in text already settled (SW-PKG-32, SW-CONC-07, SW-GATE-10 generated exclusions and canary).

## The ruleset

Conventions. A grep, awk or diff check's **output is the violation; empty output with exit 0 is the pass**. Every scan runs after SW-CORE-03's canary. Each rule lists its **Red** evidence by run ID ([Verification runs](#verification-runs)); a rule whose check is a reading heuristic says so and has no run. Counts are lines printed. Floors name the Swift version; `unverified: read only` marks anything not run on this Linux host. Scripts are saved files; the cells quote them. Real operands only (directory operands, `-e` alternatives, `xargs -r`, a `$BASE` variable, no `<placeholder>`).

### A. Core checks: diff scripts, canary, floor, generated code

**SW-CORE-01 (MUST, any Swift).** A change that turns a red check green by weakening the check carries a one-line written justification per weakened item in the pull-request description. Weakening is: a package-level or per-target `.v5` opt-out, `@preconcurrency`, `@diagnose(..., as: ignored)` or `as: .warning`, `-Wwarning`, `-suppress-warnings`, a linter or formatter suppression, a removed `-warnings-as-errors`, `-Werror`, sanitizer, `--strict`, `--force-resolved-versions` or API-breakage step, a raised `timeout-minutes`, `SWIFT_BACKTRACE=enable=no`, `try? await`, a `.disabled()` or `XCTSkip` test; edits to `.swift-format`, `.swiftlint.yml`, `.swiftformat`, `.swift-format-ignore` and `.swift-version` are named for review.
- Why: the cheapest way for an agent to go green; no compiler flag sees it. SW-GATE-12 is the gate-specific instance (it also covers the allowlist and TSan suppression files); this is the general check and the script that runs.
- Check: save as `weaken-check.sh`, run `BASE=origin/main bash weaken-check.sh` from the repository root; quote every printed line with its reason. A `.swift-version` change is a bump (SW-GATE-08), listed to be read, not judged.

```bash
#!/usr/bin/env bash
git diff -U0 --merge-base "$BASE" -- '*.swift' '*.yml' '*.yaml' Makefile '*.sh' Dockerfile | grep -v -e '^+++ ' -e '^--- ' \
  | grep -E -e '^\+.*(swiftLanguageModes: *\[ *\.v5|swiftLanguageMode\(\.v5\)|@preconcurrency|as: *\.?(ignored|warning)|-Wwarning|suppress-warnings|swiftlint:disable|swift-format-ignore|swiftformat:disable|SWIFT_BACKTRACE[=:] *"?enable=no|timeout-minutes: *[0-9]{3,}|try\? +await|\.disabled\(|XCTSkip)' \
            -e '^-.*(warnings-as-errors|Werror|sanitize|warn-long-expression|force-resolved-versions|--strict|treatWarning|treatAllWarnings|diagnose-api-breaking-changes)'
git diff --name-only --merge-base "$BASE" -- .swift-format .swiftlint.yml .swiftformat .swift-format-ignore .swift-version
```

- Red: yes, R01 (red 8 lines, green 0; the first form of the regex printed 7 of 8).
- Binds: every kind.

**SW-CORE-02 (MUST, any Swift).** Every new check (grep, awk, script, lint rule, CI step, compiler flag) is run once on a planted violation and once on its compliant twin before it is relied on, in a fixture directory outside the repository under test; the pull request or receipt quotes both results as exit code and printed-line count. A check never seen red is a hypothesis.
- Why: five defects surfaced only because a plant was run while writing this file: the first `weaken-check.sh` form dropped a line (R01), the `import ` canary failed a valid tree (R02), the unmodified tell scan failed a regeneration commit (R05), the unanchored generated marker matched indented template text (R04), and the routing check's first green fixture was a zsh word-splitting accident that made the red case pass (R08).
- Check: named reading heuristic. For each check the diff adds, the PR text holds a plant result and a twin result, and the fixture path is under a cache directory, never `/tmp` and never inside an exemplar clone. Not machine-checkable; every script in this file carries its own red/green rows as the worked example.
- Red: yes for the rule's premise (R01, R02, R04, R05, R08); no run for the heuristic itself.
- Binds: every kind.

**SW-CORE-03 (MUST, any Swift).** No empty result is trusted until the operand is proven non-empty: a canary lists at least one Swift file under the scanned root and ends the step with exit 1 when it finds none. It precedes every grep, find and awk gate; a failed canary is never chained with `&&` before a `;`. Search for manifests the same way (`find . -name 'Package*.swift' -not -path '*/.build/*' | head -1` prints a path). Use the `find` form: the `import ` form of SW-GATE-10's `k07.sh` exits 1 on a valid tree whose files import nothing.
- Why: a grep over the wrong directory exits 1 with no output, the same as a clean tree. The canary proves non-empty, not the right root: run from `git rev-parse --show-toplevel`.
- Check: save as `canary.sh`; `cd` to the root and `bash canary.sh` exits 0 and prints nothing.

```bash
#!/usr/bin/env bash
find . -name '*.swift' -not -path '*/.build/*' | awk 'END { if (NR == 0) { print "CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }'
```

- Red: yes, R02 (empty tree exit 1 with the message; a stdlib-only file: `import ` form exit 1, `find` form exit 0).
- Binds: every kind.

**SW-CORE-04 (MUST, any Swift; `swift package migrate` 6.2+).** Before the first edit run the SW-PKG-06 floor command (this rule does not restate it) and record in the receipt: `swift --version`, `.swift-version` if present, the tools version, the language mode and the feature names, a clean tree, a green build, the warning count and the SW-GATE-10 hatch count. After every tool that edits a manifest (`swift package migrate`, `add-setting`), re-run `swift package dump-package | grep -c '"ExistentialAny"'`, with the name of the feature just enabled, and require at least 1.
- Why: the baseline is what step "zero warnings" and "zero new hatches" are measured against. A versioned manifest shadows `Package.swift` (SW-PKG-21): `migrate` edited the file not in effect, exited 0, rewrote sources, built green under `-Xswiftc -warnings-as-errors`, and enabled nothing (R03).
- Check: the floor command's output pasted in the receipt, plus the `dump-package` count after the edit: 0 on the shadowed fixture, 1 on the control, on 6.4 and 6.3.
- Red: yes, R03 (0 versus 1 on both toolchains).
- Binds: every manifest edit; the receipt is the artifact.

**SW-CORE-05 (MUST, any Swift).** Generated Swift is regenerated from its spec and committed with it, never edited by hand. A file is generated when its path matches `*.pb.swift`, `*.grpc.swift`, `*.generated.swift`, `*+Generated.swift` or a `Generated/` or `generated/` directory, or when a line in its first 40 starts at column 0 with `//` and says `DO NOT EDIT`, `automatically generated`, `AUTO-GENERATED` or `Generated file|by|using`. A repository with codegen should carry a CI step that regenerates and fails on `git diff --exit-code` (SHOULD; three corpus repositories do, see the exemplar table).
- Why: a hand edit is overwritten on the next run; hatches and suppressions in generated files are noise to every scan (SW-CORE-06). Detection needs both layers: over the 19 corpus repositories with any hit, 450 files carry a column-0 marker, 338 match a path pattern, 330 both; 120 marker-only files (`svd2swift` register files, swift-crypto `Digests.swift`) and 8 path-only files exist (R04). An indented marker is template text inside a string or the generator itself (mostly tuist and JavaScriptKit): the column-0 anchor removed 15 false positives (465 to 450).
- Check: save as `generated-touch.sh`; `BASE=origin/main bash generated-touch.sh` prints each generated file the change edits; every line needs "regenerated by `<command>`" in the PR.

```bash
#!/usr/bin/env bash
git add -A -- '*.swift'
git diff --name-only -z --diff-filter=d --merge-base "$BASE" -- '*.swift' | xargs -r -0 awk '
  FNR == 1 && FILENAME ~ /(\.pb|\.grpc|\.generated)\.swift$|\+Generated\.swift$|\/[Gg]enerated\// && !seen[FILENAME]++ { print FILENAME ": path" }
  FNR <= 40 && $0 ~ /^\/\/([^\/]|$).*([Dd][Oo] [Nn][Oo][Tt] [Ee][Dd][Ii][Tt]|[Aa]utomatically [Gg]enerated|AUTO-GENERATED|[Gg]enerated (file|by|using))/ && !seen[FILENAME]++ { print FILENAME ": marker line " FNR }'
```

- Red: yes, R04 (red 4 files, green 0).
- Binds: libraries, servers, CLIs and the SDK where a spec is compiled to Swift (protobuf, OpenAPI, SVD, string tables).

**SW-CORE-06 (SHOULD, any Swift; amends SW-GATE-10).** The K-07 tell scan skips generated files and uses the `find` canary. Four edits to `k07.sh`: a `GEN` exclusion array appended to `P`; the same array on the `e15` suppression grep; the same patterns as `:(exclude)` pathspecs in `hatches()`; the `canary()` of SW-CORE-03.
- Why: `e15` (`swift-format-ignore`, `swiftlint:disable`) hits every generated protobuf file (`// swift-format-ignore-file` is in the generator's banner), so a regeneration commit is red for a reason no author can remove. Measured on three corpus repositories: swift-protobuf 507 raw hits, 7 after exclusion; swift-syntax 54 to 8; grpc-swift-2 10 to 2 (R06).
- Check: run the amended script on the generated fixture; the diff below is the whole change.

```diff
-P=(--include='*.swift' --exclude-dir='.build' --exclude-dir='Tests')
+GEN=(--exclude='*.pb.swift' --exclude='*.grpc.swift' --exclude='*.generated.swift' --exclude='*+Generated.swift' --exclude-dir='Generated' --exclude-dir='generated')
+P=(--include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' "${GEN[@]}")
-e15() { grep -rn --include='*.swift' --exclude-dir='.build' -F -e 'swift-format-ignore' ...
+e15() { grep -rn --include='*.swift' --exclude-dir='.build' "${GEN[@]}" -F -e 'swift-format-ignore' ...
-  git ls-files -z --cached --others --exclude-standard -- '*.swift' ':(exclude)Tests' | xargs -r -0 awk '
+  git ls-files -z --cached --others --exclude-standard -- '*.swift' ':(exclude)Tests' ':(exclude)*.pb.swift' ':(exclude)*.grpc.swift' ':(exclude)*.generated.swift' ':(exclude)*+Generated.swift' ':(exclude,glob)**/Generated/**' ':(exclude,glob)**/generated/**' | xargs -r -0 awk '
```

- Red: yes, R05 (hand-written hatch plus generated hatches: original 4 lines, amended 1; generated-only change: original exit 1, amended exit 0).
- Binds: new and touched code of every kind; hand-off to the SW-GATE-10 author.

### B. Artifact shape and routing

**SW-CORE-07 (SHOULD, lore artifacts).** `swift-upgrade` and `swift-diagnose` are skills built as: SKILL.md body at most 500 lines holding the order, the commands, the stop conditions and the receipt; a `description` of at most 1024 characters that opens with "Use when", names the exact symptom or phrase ("Swift 6 concurrency migration", `Illegal instruction`, "exit code 132", `unable to type-check this expression in reasonable time`) and carries negative triggers; depth in `references/` (upgrade: ladder cases, feature table, dated re-checks, toolchain pin; diagnose: crash signatures, hang capture, backtrace settings, type-check). A skill cites rule IDs and restates only the MUST list.
- Why: the five go, bazel and cmake skills measured here sit at 396 to 483 lines with descriptions of 752 to 1017 characters, and the catalog's 16 skills at 68 to 499 body lines; `go-diagnose` at 473 of 500 has no `references/`, so a Swift diagnose skill needs it from the start (the sub-artifact's section 15 gives the split).
- Check: `python3 -I .claude/skills/research-lang/scripts/check-artifacts.py skills/swift-upgrade skills/swift-diagnose --root .` exits 0.
- Red: yes, R07 (planted 524-line body with a 1217-character "Runs ..." description: 5 findings, exit 1; clean twin exit 0).
- Binds: the two skills.

**SW-CORE-08 (SHOULD, lore artifacts).** The `swift-quality` index body stays under 200 lines and has a routing row for every ID family it does not carry (SW-LANG, SW-CONC, SW-ERR, SW-API, SW-TEST, SW-CLI, SW-IO, SW-NET, SW-SEC, SW-APPLE, SW-PKG, SW-GATE, SW-REL, BZL-SWIFT) keyed by task words, plus the sibling map (`code-docs`, `docs-quality`, `bazel-quality`); every depth file carries a never-matching `paths` glob and the index glob is the bare `**/*.swift`.
- Why: the extension cannot miss (18,886 files in 40 of 40 repositories); a narrow glob fails silently; depth files load only by routing, and 136 of 141 existing depth files lack the never-matching glob (config audit).
- Check: save as `routing-check.sh`; `bash routing-check.sh rules/swift-quality.md` prints nothing; plus the SW-CORE-07 command for the 200-line cap.

```bash
#!/usr/bin/env bash
awk 'BEGIN { n = split("SW-LANG SW-CONC SW-ERR SW-API SW-TEST SW-CLI SW-IO SW-NET SW-SEC SW-APPLE SW-PKG SW-GATE SW-REL BZL-SWIFT", f, " ") }
     { for (i = 1; i <= n; i++) if (index($0, f[i]) && $0 ~ /^\|/) seen[i] = 1 }
     END { if (NR == 0) { print "ROUTING: index is empty or missing" > "/dev/stderr"; exit 1 } for (i = 1; i <= n; i++) if (!seen[i]) print "no routing row: " f[i] }' "$1"
```

- Red: yes, R08 (index minus two families printed both; full index printed nothing) and R07 (the 234-line rule body finding).
- Binds: the index author.

### C. swift-upgrade

The step list U0..U10, its counts and the fix-ladder cases are [upgrade-and-diagnose.md sections 2 to 8](swift-procedures/upgrade-and-diagnose.md#2-swift-upgrade-the-ordered-step-list); the rules below are the parts that are checks.

**SW-CORE-09 (SHOULD, any Swift).** One toolchain pin, derived: `.swift-version` holds the exact patch; the primary CI image is built from it (`image=swift:$(cat .swift-version)-noble`); a literal `swift:<ver>` tag is allowed only on a matrix leg that exists to test that version (floor, nightly). The pin grep is a bump-time inventory: when `.swift-version` exists, every hit is either derived or a deliberate leg.
- Why: a bump is one edit and a floating `swift:6.3` cannot split legs (SW-GATE-08 owns the pin; this is the derivation).
- Check, output is the violation: `[ -f .swift-version ] && grep -rn -e 'swift:[0-9]' --include='*.yml' --include='*.yaml' --include='Dockerfile' --exclude-dir=.build --exclude-dir=.git .`
- Red: yes, R09 (red 1 line, green and no-file 0; swiftly: `.swift-version` 6.4.0 beside `FROM swift:6.1-jammy`).
- Binds: CLI, server, SDK (primary leg); libraries keep floor and current legs literal.

**SW-CORE-10 (MUST, Swift 6.0; `weak let` 6.3).** An upgrade adds no hatch: resolve each Sendable or isolation diagnostic at the highest applicable rung of SW-CONC-28 (delete the sharing, return a fresh value from a computed `static var`, `Sendable` on public value types, `var` to `let`, `Mutex`, an existing lock type) and judge the result by the added-lines delta against the U0 commit. On an adopted tree the SW-GATE-10 whole-tree pass is the wrong receipt: it prints the legacy hatches before and after.
- Why: the lazy twin built green in Swift 6 mode with 13 added hatch lines, indistinguishable to the compiler (R16).
- Check, output is the violation: `git diff -U0 "$BASE" -- '*.swift' | awk '/^\+[^+]/ && /@unchecked[[:space:]]+Sendable|nonisolated\(unsafe\)|Task\.detached|@preconcurrency|MainActor\.assumeIsolated|MainActor\.run/'`. A line that survives needs the SW-GATE-10 justification or a lower rung; stop condition S1 to S6 (SW-CORE-15) otherwise.
- Red: yes, R16 (ladder 0 added, lazy 13; whole-tree pass 2 versus 12).
- Binds: every upgrade of an adopted library, SDK, CLI or server.

**SW-CORE-11 (SHOULD, tools 6.2).** Upgrade in this order and run the probes before editing: (1) baseline (SW-CORE-04); (2) manifest floor, shared loop and `StrictLanguageFeatures` guard (SW-PKG-11, -18, -02); (3) probe with flags only, committing none: `-Xswiftc -strict-concurrency=complete`, `-Xswiftc -swift-version -Xswiftc 6` (it reaches dependencies, so it is a lower bound), one `-enable-upcoming-feature` per Swift-6-group name; (4) enable only the names with a non-zero delta through the manifest; (5) ladder (SW-CORE-10); (6) flip in the commit that removes the 5-mode lines (SW-PKG-03, -14); (7) clear the flip's non-concurrency warnings; (8) done when `-Xswiftc -warnings-as-errors` exits 0 on the current and the floor toolchain (SW-GATE-13).
- Why: the flip surfaced 5 warnings complete checking never showed (4 `ConciseMagicFile`, 1 deprecation). Re-run on both toolchains: baseline 1 warning, complete checking 13, flip 6 (`-Werror` exit 1), final 0 (`-Werror` exit 0) (R11); the intermediate ladder counts 9, 4, 4, 1 are the dive's, not re-run. The `-swift-version 6` probe is not a stable number: 1 to 4 own-package errors on 6.4 across logged runs, 9 on 6.3 every time (R12).
- Check: the per-step counts in the receipt; `grep -rn -e '-swift-version' --include='*.yml' --include='*.sh' --include='Makefile' --exclude-dir=.build --exclude-dir=.git .` prints nothing (flags never committed); the typo guard fails a misspelt feature (`'ExistentalAny' is not a recognized upcoming feature`, exit 1 with the guard, 0 without, R13).
- Red: yes, R10 (flag grep), R11, R13.
- Binds: libraries, SDKs, CLIs, servers in Swift 5 mode.

**SW-CORE-12 (SHOULD, Swift 6.2).** Adopt post-6 features one at a time with `swift package migrate --target T --to-feature NAME`, only for the five migratable names (`ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`, `NonisolatedNonsendingByDefault`, `StrictMemorySafety`), from a clean tree and a green build, once per feature; read `git diff`, then re-gate with `-Xswiftc -warnings-as-errors` on the current and the floor toolchain.
- Why: the flag is `--target` (`--targets` exits 64); `GlobalConcurrency`, `StrictConcurrency` and `InternalImportsByDefault` exit 64 `not migratable`; a dirty tree exits 0 with mixed edits; a build error exits 1 with no edits; a second run of the same feature appends a second literal (2 after 2 runs, both toolchains) (R14). On the real package the 6.4 gate went red after the `NonisolatedNonsendingByDefault` run and stayed red through the fourth: `SnapshotsTestTrait.swift:54:35: error: 'withValue(_:operation:isolation:file:line:)' is deprecated ... [#DeprecatedDeclaration]`, exit 1, while 6.3 exited 0; dropping `@concurrent in` from two closures made it clean (R15). Stop for a human when a fix-it adds `@concurrent` to public API (S4).
- Check: `grep -rn -e 'migrate --targets' --include='*.sh' --include='*.md' --include='*.yml' --exclude-dir=.build --exclude-dir=.git .` prints nothing; `git status --porcelain` prints nothing before each run; the re-gate exits 0 on both toolchains.
- Red: yes, R14, R15 (6.4 exit 1 at `0e95143` and `441dd75`, exit 0 at `9f1bddb` after the fix; 6.3 exit 0 at all five commits tested).
- Binds: libraries, SDKs, CLIs, servers.

**SW-CORE-13 (SHOULD, tools 6.2).** After `migrate`, fold the per-target `swiftSettings: [.enableUpcomingFeature(...)]` literals into the shared `for target in package.targets` loop (SW-PKG-18); no `enableUpcomingFeature` call stays outside it.
- Why: `migrate` never edits the loop; it writes per-target literals beside it and the two drift. A grep for `swiftSettings: [` over-matches legitimate settings, so the check reads the loop boundary.
- Check: save as `fold-check.sh`; from the package root it prints each literal outside the loop and nothing when folded.

```bash
#!/usr/bin/env bash
find . -name 'Package*.swift' -not -path '*/.build/*' -print0 | xargs -r -0 awk '
  /^for target in package\.targets/ { inloop = 1 }
  FNR == 1 { inloop = 0 }
  !inloop && /enableUpcomingFeature\(/ { print FILENAME ":" FNR ": " $0 }'
```

- Red: yes, R17 (real package after the four migrate runs: 12 literals printed; folded final tree 0; toy plants 1 and 0).
- Binds: every package that used `migrate`.

**SW-CORE-14 (SHOULD, Swift 6.2).** At every toolchain or SwiftPM bump run the four dated probes; each must still fail with its pinned message, and a probe that compiles reports FLIPPED and means the cited rules are stale. SE-0526 `withDeadline` (SW-CONC-24), SE-0540 `defaultSwiftSettings:` (SW-PKG-01, -18), SE-0529 stdlib `FilePath` (SW-IO-01), T-V42 typed-throws `Task` frontend crash (SW-CONC-03). Also re-read the swift-syntax tag list (SW-PKG-10 range).
- Why: the three proposals are Accepted with modifications, not shipped, and the fourth crashes the compiler; an agent writing from proposal text produces code that does not build.
- Check, per probe package: `swift build --scratch-path "$SWIFT_SCRATCH/recheck-<probe>"` exits 1 with `cannot find 'withDeadline' in scope`, `extra argument 'defaultSwiftSettings' in call`, `cannot find type 'FilePath' in scope`, `Please submit a bug report`. Sources: `try await withDeadline(.now + .seconds(1)) { 1 }`; `Package(... defaultSwiftSettings: [.swiftLanguageMode(.v6)])`; `let p: FilePath = "/tmp/x"` with no import; `Task { () throws(E) in throw E() }` in Swift 6 mode. Twin: `Task { throw E() }` compiles (FLIPPED).
- Red: yes, R18 (four STILL on 6.4 and 6.3, twin FLIPPED); R26 (604.0.0 latest release, 605 prereleases).
- Binds: every kind at each bump.

**SW-CORE-15 (SHOULD, any Swift).** Stop and report instead of adding a hatch when a stop condition fires: S1 the errors sit in a dependency you do not own; S2 the applicable rung needs an API above the platform or tools floor (`Mutex` on an Apple floor below the OS that ships `Synchronization`, `weak let` below 6.3, `sending` below 6.0); S3 a diagnostic reproduces as a frontend crash; S4 a fix-it changes public async signatures; S5 two consecutive classes leave the count unchanged or higher; S6 the re-gate differs between the current and the floor toolchain (report both, add no `#if compiler` split).
- Why: each is the point where the lazy twin's shortcut becomes the only way to green.
- Check: named reading heuristic; the receipt lists the condition and the diagnostics left. No run.
- Red: no.
- Binds: every upgrade.

### D. swift-diagnose

The decision tree, signature tables, backtracer keys and hang procedure are [upgrade-and-diagnose.md sections 9 to 15](swift-procedures/upgrade-and-diagnose.md#9-swift-diagnose-the-decision-tree).

**SW-CORE-16 (MUST, Swift 6.3 and 6.4 Linux measured; arm64 `133` and macOS `unverified: read only`).** Classify a failure by exit code and the first message line together, never by the code alone: 132 covers six causes (`Precondition failed` or, in release, `precondition failure`; `Unexpectedly found nil`; `Error raised at top level`; `tried to resume its continuation more than once`; `Swift runtime failure` for overflow; other `Fatal error`), 134 two (`double free`, `corrupted`, `invalid pointer`, `malloc(): ` versus plain abort), 139 two (the same frame 20 or more times versus `Bad pointer dereference at 0x0000000000000000`), 124 three (below); 137, 141, 143 mean no backtrace exists and the cause is outside the program (SIGKILL, closed reader per SW-CLI-08, unhandled SIGTERM); 124 is `timeout`'s own code for any signal it sent. In a release build match `Swift runtime failure` and read frame 0's `file:line`; the `precondition` message text is gone.
- Why: R19, below. The route table is in the sub-artifact (section 9); the executable `classify.sh`, `classify-naive.sh` and `matrix.sh` are saved in `$F/diagnose/` and are what the skill author copies into `references/`.
- Check: replay the symptom matrix: `bash matrix.sh ./classify.sh` prints `wrong_branches=0`; the exit-code-only twin prints 11 (debug) and 5 (release).
- Red: yes, R19 (tree 17 of 17 on 6.4 and 6.3 and 7 of 7 release; naive 11 and 11 and 5 wrong).
- Binds: every runtime failure of every kind.

**SW-CORE-17 (MUST, any Swift).** A diagnosis fix never makes the symptom stop by changing the measurement: no `SWIFT_BACKTRACE=enable=no`, raised `timeout`, added `Task.sleep`, `Thread.sleep` or `usleep`, `try?` around the failing call, `nonisolated(unsafe)` to quiet TSan, removed `-warnings-as-errors`, `-warn-long-expression-type-checking` or sanitizer leg. The fix is accepted only when the same measurement that showed the fault now clears and nothing else changed (root cause named as a mechanism, evidence pasted, fix watched).
- Why: every one of those makes the next run green. SW-CORE-01 covers gate and config weakening; this covers code and timing edits in the fix diff (SW-TEST-03, SW-CONC-09, SW-CONC-17).
- Check, output is the violation, run both scripts on the fix:

```bash
#!/usr/bin/env bash
git diff -U0 --merge-base "$BASE" | grep -v -e '^+++ ' -e '^--- ' \
  | grep -E -e '^\+.*(Task\.sleep|Thread\.sleep|[^[:alnum:]_.]usleep\(|try\? |nonisolated\(unsafe\)|timeout [0-9]{3,})'
```

- Red: yes, R25 (silencing commit: this script 3 lines, `weaken-check.sh` 6 lines; the cancellation fix: 0 and 0).
- Binds: every kind.

**SW-CORE-18 (SHOULD, Swift 6.3 and 6.4 Linux; macOS `unverified: read only`).** Capture a hang before killing it. Keep the backtracer on (unset `SWIFT_BACKTRACE`, or `enable=yes,interactive=no,color=no`; never `enable=no` in a Dockerfile, unit or CI file of a process you will diagnose); start the target under job control (`set -m`) and confirm the `SigIgn` mask has bits 0x6 clear before relying on a signal; `kill -QUIT <pid>` prints every thread and the process survives; read thread 0 and `kill -KILL` last. Under `swift test` signal the runner (`<Target>-test-runner` on 6.4, `<pkg>PackageTests.xctest` on 6.3), not `swift-test`.
- Why: exit codes are identical with the backtracer off, but a segfault's 52-line report becomes 0 lines; a bare `&` in a non-interactive shell leaves SIGINT and SIGQUIT ignored (`SigIgn: 0000000000000006`, `nohup` 7, `set -m` 0) and the runtime installs no handler for an ignored signal (Backtracing.rst); `enable=no` turns SIGQUIT back into a kill (rc 131). The one deliberate `enable=no` is swift-testing's exit-test child.
- Check, output is the violation: `grep -rn -e 'SWIFT_BACKTRACE=enable=no' -e 'SWIFT_BACKTRACE: enable=no' --include='Dockerfile' --include='*.yml' --include='*.yaml' --include='*.sh' --exclude-dir=.build --exclude-dir=.git .`; at the process, `grep -e SigIgn /proc/$PID/status` shows a mask with 0x6 clear; stderr contains `Signal 3: Backtracing` and `kill -0 $PID` still succeeds.
- Red: yes, R20, R21 (bare `&`: alive, 0 stderr lines; `set -m`: dump, alive, rc 137 after KILL; `enable=no`: rc 131; TERM 143, INT 130), R22.
- Binds: servers, daemons, CLIs, the SDK's child-process layer.

**SW-CORE-19 (SHOULD, Swift 6.3 and 6.4 Linux).** Exit 0 with output that differs between two runs is a race suspect: run a `--sanitize=thread` build (Docker needs `--security-opt seccomp=unconfined`). TSan exits 66 (default `exitcode`); read the report kind first: a `ThreadSanitizer: data race` line is a race, a `Swift access race` line alone on `Mutex`-guarded code is the known false positive, confirmed by an exact result over five plain runs. For exit 124 branch on the `leaked its continuation` line (SW-CONC-22), then CPU at or above 50 percent (spin), then a `_dispatch_sema4_wait` frame in the SIGQUIT dump (SW-CONC-15), else idle with no user frame (lost wakeup, SW-CONC-22).
- Why: TSan is advisory in CI (SW-TEST-17, SW-GATE-27) and authoritative here. The race plant printed `data race` 2 and `Swift access race` 4 on every run and five different counts; the correct `Mutex` plant printed `data race` 0, `Swift access race` 2 and `count=200000` every run, rc 66 on both toolchains.
- Check: the counts above; `swift build --sanitize=thread` then the binary; the 124 branches are the `classify.sh` cases `leak`, `semaphore`, `spin`.
- Red: yes, R19, R23.
- Binds: servers, daemons, the SDK's process layer, any concurrent library.

**SW-CORE-20 (SHOULD, Swift 6.3 and 6.4).** On `unable to type-check this expression in reasonable time`, split the expression and read the first real error before changing anything else; never raise a solver limit. Gate expression cost with `swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=100 -Xswiftc -warnings-as-errors`, and fix by annotating a type or using a struct.
- Why: the message hid a `Double` plus `Float` error (4.9 s and 3.5 s to fail with it, 0.8 s and 0.7 s once split). The budget gate failed a 5-row dictionary-literal array at 2.2 s and passed the annotated twin. Ceiling: the gate is wall-clock; a loaded runner can flap an expression near 100 ms.
- Check: that build command exits 0; a split reproduces the real error. In a manifest the flags are `unsafeFlags` (SW-PKG-04, root only).
- Red: yes, R24.
- Binds: any kind; no corpus repository applies the flag (tuist uses it as test data only).

**SW-CORE-21 (SHOULD, any Swift).** Every diagnose or upgrade run ends with a receipt and starts with consent. Receipt: symptom in the reporter's words; build identity (`swift --version`, configuration, `echo "$SWIFT_BACKTRACE"`); root cause with the toolchain version; verbatim evidence (two readings when a fix was applied); fix with rule ID or a named gap; every rule ID relied on. Consent: on a process the operator named, `kill -QUIT` is non-destructive, `kill -KILL` destroys it, a `SWIFT_BACKTRACE` change needs a restart, a TSan or release rebuild is a different binary; on production print the command and its cost and stop without consent.
- Check: named reading heuristic. No run.
- Red: no.
- Binds: both skills.

### Conflicts resolved

1. **`-swift-version 6` probe count.** The dive recorded 9 own-package errors on 6.4; logged re-runs gave 1, 2, 2 and 4 on 6.4 (nondeterministic: the compiler stops after the first module with errors) and 9 on 6.3 in all four. Resolution: U3 reports the probe as a lower bound, runs it on the floor toolchain too, and never compares counts across toolchains (SW-CORE-11).
2. **SW-PKG-32** writes `--targets`: the flag is `--target`, `--targets` exits 64 on both toolchains and `Migrate.swift` declares `.customLong("target")`. SW-CORE-12 wins; the SW-PKG owner edits.
3. **SW-CONC-07** says `migrate` takes no `--scratch-path`: every migrate run here used one and exited 0. Edit SW-CONC-07.
4. **SW-PKG-18 versus `migrate`.** The loop and the per-target literals coexist until folded (12 literals at the migrate commits). Resolution: SW-CORE-13 with the loop-boundary awk, replacing the over-broad `swiftSettings: [` grep.
5. **SW-GATE-10 versus a migration receipt.** File-granular `BASE` form keeps a touched legacy file's legacy hits; the migration question is "what was added". Both stay: SW-GATE-10 for the gate, the added-lines delta for the receipt (SW-CORE-10): ladder 2 versus 0, lazy 12 versus 13.
6. **Toolchain pin.** SW-GATE-08 allows `.swift-version` or an exact image tag. Resolution: when `.swift-version` exists the primary image derives from it; matrix floor and nightly legs may be literal by design; the grep is an inventory at bump time, not a gate (SW-CORE-09).
7. **TSan.** SW-TEST-17 and SW-CONC-27 say TSan reports `Mutex` as a race; SW-GATE-27 fails only on `data race`; the dive's classifier treated any `ThreadSanitizer` line as a race. Resolution: report kind first, five-run count as fallback (SW-CORE-19); the plant gives `data race` 2 versus 0.
8. **Map M-K-04 versus SW-PKG-06.** The map's check was `head -1 Package.swift`; SW-PKG-06 forbids it (the tools-version comment may sit on a later line since 6.0). SW-PKG-06's command wins; SW-CORE-04 adds only the baseline and the post-edit proof.
9. **SW-GATE-10 scans generated files.** `e15` printed 500 of 507 swift-protobuf hits in generated files. Amended by SW-CORE-06.
10. **`migrate` on a shadowed manifest** extends SW-PKG-21: a silent no-op on the manifest in effect (SW-CORE-04), not only a hazard when editing by hand.
11. **SW-GATE-10's `import ` canary** exits 1 on an import-free tree. Replaced by the `find` canary (SW-CORE-03, -06).

### Verification runs

All 2026-10-10, Linux x86_64. Fixture root `F=/home/mherwig/.cache/research-lang/swift-tools/fixtures/procedures-consolidation`; logs `$F/logs/`. "Host" runs need no container.

| # | Fixture and command | Violation | Compliant twin | Output |
|---|---|---|---|---|
| R01 | host: `weaken/` branches `red`, `green`, `BASE` = root commit, `bash weaken-check.sh` | 8 lines | 0 lines | `+    timeout-minutes: 240`, `-      - run: swift test --sanitize=thread`, `+@preconcurrency import Foundation`, `+@diagnose(NoUsage, as: ignored)`, `+@Test(.disabled())`; first regex form printed 7 (lost `@preconcurrency`) |
| R02 | host: `canary/ok`, `canary/noimport`, `canary/empty`, `bash canary.sh` | empty: exit 1, `CANARY: no Swift file scanned`; `import ` form on `noimport`: exit 1 | ok 0; noimport 0 (find form) | `logs/canary.final.txt`, `logs/host2.rerun.txt` |
| R03 | 6.4 and 6.3 images: `mig-shadow/shadow.sh` versus `mig-green/shadow.sh` | `migrate` exit 0, `Package.swift` and `Mig.swift` modified, `dump-package` `"ExistentialAny"` count 0, `-warnings-as-errors` exit 0 | unshadowed control: count 0 before, 1 after, both toolchains | `ls` lists `Package.swift` and `Package@swift-6.3.swift`, `tools-version` prints `6.3.0`; `logs/shadow.rerun.txt`, `logs/shadow-green.rerun.txt` |
| R04 | host: `generated/` red/green, `bash generated-touch.sh`; `logs/gen-measure.sh` over `~/.cache/research-lang/exemplars/swift` (read only) | 4 lines (`Crypto.swift: marker line 5`, `Generated/Strings.swift: path`, `Msg.pb.swift: path`, `Rules+Generated.swift: path`) | 0 | corpus: marker 450, path 338, both 330, marker-only 120; the unanchored marker gave 465 (15 indented template hits); `logs/gen-measure.txt` |
| R05 | host: `genk07/` `k07f.sh` (original tells, `find` canary) versus `k07f-gen.sh` (SW-CORE-06) | original: 4 lines (3 generated), and on the generated-only branch exit 1 | amended: 1 line (`Bad.swift:1`), generated-only branch exit 0 | `logs/host2.rerun.txt` |
| R06 | read-only grep, `logs/e15-exemplars.txt` | swift-protobuf 507, swift-syntax 54, grpc-swift-2 10, tuist 324 raw | 7, 8, 2, 310 after `GEN` | `e15` pattern over `*.swift` |
| R07 | host: `shape/red`, `shape/green`, `check-artifacts.py` (repo checker) | skill: 5 findings exit 1 (`description is 1217 chars (max 1024)`, `opens with the workflow verb 'runs'`, `no 'Use when' trigger clause`, `body is 524 lines (max 500)`, no TOC); rule: `body is 234 lines (max 200)` exit 1 | both `clean` exit 0 | `logs/shape.rerun.txt` |
| R08 | host: `routing/check.sh` on `routing/green`, `routing/red` | prints `no routing row: SW-IO`, `SW-SEC` | prints nothing | `logs/routing.rerun.txt` |
| R09 | host: `greps.sh` pin set; read-only on exemplars | `pin/red` exit 0, 1 line `ci.yml:3: container: swift:6.1-noble`; swiftly `.devcontainer/Dockerfile:1` | `pin/green` and `pin/nofile` exit 1, empty | exemplars: Alamofire, swift-nio, SwiftLint matrix legs literal; containerization derived |
| R10 | host: `greps.sh` flag, bt, flip sets | `-swift-version` ci.sh 2 lines; `ENV SWIFT_BACKTRACE=enable=no` 1 line; `[.v5]` plus `StrictConcurrency` 2 lines | all three twins exit 1, empty | `logs/host.rerun.txt` |
| R11 | 6.4 and 6.3: `up-base`, `up-flip`, `up-final` (copies of swift-snapshot-testing@28e5de025e3f), plain, complete checking, `-Werror` | base 0/0/1, complete checking 13 warnings, flip 6 warnings and `-Werror` exit 1 | final 0 warnings, `-Werror` exit 0, both toolchains | `logs/steps.rerun.txt` |
| R12 | 6.4 and 6.3: `-Xswiftc -swift-version -Xswiftc 6` on the baseline | 6.4: 1, 2, 2 and 4 errors (exit 1); 6.3: 9 errors every time | | `logs/swv.rerun.txt` |
| R13 | 6.4 and 6.3: `guard60` (typo `ExistentalAny`) versus `guard60-ok`, `-Xswiftc -Werror -Xswiftc StrictLanguageFeatures` | plain exit 0; guard exit 1 (`'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`) | ok twin exit 0 | `logs/guard.rerun.txt` |
| R14 | 6.4 and 6.3: `work-mig*/` `migrate` matrix | `--targets` 64; `Bogus` 64; `GlobalConcurrency`, `InternalImportsByDefault`, `StrictConcurrency` 64 `not migratable`; build error exit 1; dirty tree exit 0 (3 files modified); second run: 2 literals | `--target Mig ExistentialAny` exit 0, `Package.swift` and `Mig.swift` modified | `logs/migrate.rerun.txt` |
| R15 | 6.4 and 6.3: `dive-full/` at `5d86394`, `0e95143`, `441dd75`, `9f1bddb`, `8f4792d`, `swift build -Xswiftc -warnings-as-errors` | 6.4 at `0e95143` and `441dd75`: exit 1, `SnapshotsTestTrait.swift:54:35: error: 'withValue(_:operation:isolation:file:line:)' is deprecated ... [#DeprecatedDeclaration]` | 6.4 at `5d86394`, `9f1bddb`, `8f4792d` exit 0; 6.3 exit 0 at all five | `logs/dw.<ver>.<sha>.log` |
| R16 | host: `dive-full` `8f4792d` and `dive-lazy`, hatch pass and added-lines delta against `b36158f` | lazy: pass 12, delta 13 | ladder: pass 2 (legacy), delta 0; baseline pass 2 | `logs/hatch.rerun.txt` |
| R17 | host: `fold-check.sh` on `dive-full` and `fold-red`, `fold-green` | `441dd75`, `9f1bddb`: 12 literals; `fold-red`: `Package.swift:8` | `8f4792d`: 0; `fold-green`, `fold-extra`: 0 | `logs/hatch.rerun.txt`, `logs/host.rerun.txt` |
| R18 | 6.4 and 6.3: `recheck/recheck.sh` | four probes exit 1: `cannot find 'withDeadline' in scope`, `extra argument 'defaultSwiftSettings' in call`, `cannot find type 'FilePath' in scope`, `Please submit a bug report` | `typedtask-ok` compiles (FLIPPED) | `logs/recheck.rerun.6.4.txt`, `.6.3.txt` |
| R19 | 6.4 and 6.3 debug, 6.4 release: `diagnose/` 17 planted failures, `matrix.sh ./classify.sh` versus `./classify-naive.sh` | naive: 11, 11, 5 wrong (`unwrap got=precondition`, `recurse got=null-deref`, `race-tsan got=unmapped-66`) | tree: `wrong_branches=0` on all three | `logs/diag.matrix.6.4.txt`, `.6.3.txt`, `diag.matrix-rel.txt` |
| R20 | 6.4 and 6.3: `btenv.sh` over `SWIFT_BACKTRACE` | `enable=no` segv: rc 139 with 0 stderr lines (`unwrap` still prints its 14 message lines) | default: 52 and 53 lines; `enable=yes,interactive=no,...`: 3 lines | exit codes 132 and 139 identical in all settings; `logs/diag.signals.<ver>.txt` |
| R21 | 6.4 and 6.3: `sigign.sh`, `quit.sh`; 6.4: `bare.sh`, `sigterm.sh` | bare `&`: `SigIgn` 6, alive after QUIT, 0 stderr lines; `enable=no` QUIT: rc 131 | `set -m`: mask 0, `Signal 3: Backtracing`, `_dispatch_sema4_wait` frame, alive until KILL (rc 137) | `setsid` 6, `nohup` 7; TERM rc 143, INT rc 130; `logs/diag.signals.<ver>.txt`, `logs/diag.extra.6.4.txt` |
| R22 | 6.4 and 6.3: `crashtest/` `swift test` with one trapping test | `swift test` rc 1, `Fatal error: Unexpectedly found nil`, `exited with unexpected signal code 4` for `CTests-test-runner` (6.4) and `CPackageTests.xctest` (6.3) | `--filter passes` rc 0 | `logs/crashtest.<ver>.out`, `.rc` |
| R23 | 6.4 and 6.3: TSan build, `race` and `mutexok` x3 | race: rc 66, `data race` 2, `Swift access race` 4, counts 392847 to 434317 across both toolchains | mutexok: rc 66, `data race` 0, `Swift access race` 2, `count=200000` x3 | `logs/diag.tsan.<ver>.txt`; five plain runs each (`logs/five.rerun.txt`): race 6.4 `282767 464098 252147 276921 308943`, 6.3 `217225 249022 346487 255679 393033`; mutexok `200000` x5 on both |
| R24 | 6.4 and 6.3: `diagnose` `-DSLOW`, `-DSLOWER`, `-DSLOWFIXED`; `tc/hidden*.swift` | SLOW + flag + `-Werror`: exit 1 (`expression took 2236ms`, 6.3 2074 ms); SLOWER exit 1 `unable to type-check ... in reasonable time` (11.7 s, 11.9 s); `hidden` exit 1 same message (4.9 s, 3.5 s) | SLOWFIXED exit 0; `hidden-split` exit 1 with `binary operator '+' cannot be applied to operands of type 'Double' and 'Float'` (0.8 s, 0.7 s); `hidden-twin` exit 0 | `logs/tc.rerun.txt` |
| R25 | host: `silence/` commit `e623e35` versus `78db4dc` against base `4915c7a`, `silence-check.sh` and `weaken-check.sh` | 3 lines and 6 lines (`timeout 3000 swift test`, `try? await Task.sleep` x2; `timeout-minutes: 120`, `SWIFT_BACKTRACE: enable=no`, two removed gate steps) | 0 and 0 | `logs/silence.rerun.txt` |
| R26 | read-only `git ls-remote --tags` on swift-syntax | latest release `604.0.0`; prereleases `605.0.0-prerelease-2026-09-15` | | SW-PKG-10 range lo 602 hi 605 stands |

Not verified: the dive's reasoned `registered` deadlock; `timeout` reaping the test runner after the driver is killed; ASan; macOS, Windows and the static Linux SDK (`unverified: read only`); the `-swift-version` blast radius in dependencies (audit-measured).

## Applied to the exemplars and the future consumers

SHAs are the 2026-10-10 clones under `~/.cache/research-lang/exemplars/swift`.

| Rule | Repo | Evidence |
|---|---|---|
| SW-CORE-09 satisfied | apple/containerization | `containerization@3e7bc39e66b3:.github/workflows/containerization-build-template.yml:26-34` sparse-checks-out `.swift-version` (`6.3.0`) and emits `image=swift:$(cat .swift-version)-noble`; `:49` `container: ${{ needs.swift-version.outputs.image }}` |
| SW-CORE-09 satisfied | swiftly, swift-embedded-examples | `swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235` reads the file; `swift-embedded-examples@119b29f83550:.github/workflows/update-swift-version.yml:57` automates the bump |
| SW-CORE-05 satisfied | grpc-swift-2 | `grpc-swift-2@ac33066eb6ed:dev/check-generated-code.sh:29` `GIT_PAGER='' git diff --exit-code '*.swift'` after regeneration; `.github/workflows/soundness.yml:24,38` |
| SW-CORE-05 satisfied | swift-syntax | `swift-syntax@be549876fe91:.github/workflows/pull_request.yml:57` `verify-source-code` ("Validate generated code") |
| SW-CORE-05 satisfied | JavaScriptKit | `JavaScriptKit@c68ee9bdebfa:.github/workflows/test.yml:65-68` runs `make regenerate_swiftpm_resources` then `git diff --exit-code Sources/JavaScriptKit/Runtime` |
| SW-CORE-05 marker-only | swift-crypto, embedded-examples | `swift-crypto@1c80d3aff53f:Sources/Crypto/Digests/Digests.swift:18` `// MARK: - Generated file, do NOT edit`; `swift-embedded-examples@119b29f83550:stm32-neopixel/Sources/STM32F7X6/DMA2.swift:1` `// Generated by svd2swift.`; neither matches a path pattern |
| SW-CORE-18 deliberate | swift-testing | `swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift:887-890` sets `SWIFT_BACKTRACE=enable=no` in the exit-test child "to reduce the noise level"; the only setting of the variable in the corpus |
| SW-CORE-11/SW-PKG-14 reasoned downgrade | swift-build | `swift-build@2187330e13e7:Package.swift:345` `swiftSettings(languageMode: .v5), // Temporarily downgraded from Swift 6 mode due to a source break in 1/31/26 nightly snapshot (rdar://169461269)` |
| SW-CORE-11 conditional | swift-service-lifecycle | `swift-service-lifecycle@c55297914e26:Package.swift:78` `#if compiler(<6.2)` with the reason on the next line |
| **violated** SW-CORE-09 | swiftly | `swiftly@c8cf2e35bfca:.devcontainer/Dockerfile:1` `FROM swift:6.1-jammy` beside `.swift-version` = `6.4.0` |
| **violated** SW-CORE-09 | swift-format | `swift-format@b15dd59fad21:.github/workflows/pull_request.yml:51` `image: swift:6.2`, a floating tag, no `.swift-version` |
| **violated** SW-CORE-09 | swift-protobuf | `swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:89,159` `image: swift:6.3`, no `.swift-version` |
| **violated** SW-CORE-11 step 6 | swift-embedded-examples | `swift-embedded-examples@119b29f83550:rpi-pico2-neopixel/Package.swift:27`, `stm32-uart-echo/Package.swift:34`, `stm32-neopixel/Package.swift:34` `swiftLanguageModes: [.v5]` with no dated reason (embedded; SW-PKG-14/15) |
| **violated** SW-CORE-11 step 6 | swift-collections | `swift-collections@935f696a549a:Package.swift:324-325` `// FIXME: _modify accessors in RopeModule seem to be broken in Swift 6 mode` then `.swiftLanguageMode(.v5)`: reason without a date or an issue |
| **violated** SW-CORE-11 step 6 | swift-format, Alamofire | `swift-format@b15dd59fad21:Package.swift:150` and `Alamofire@bda9ed57d729:Package.swift:52` `swiftLanguageModes: [.v5]` |
| **violated** SW-CORE-10 (legacy, not added) | swift-snapshot-testing | `swift-snapshot-testing@28e5de025e3f:Sources/SnapshotTesting/AssertSnapshot.swift:615` `final class Counter: @unchecked Sendable` and `Sources/InlineSnapshotTesting/AssertInlineSnapshot.swift:767` `public final class LockIsolated<Value>: @unchecked Sendable`, no justification comment; the delta check passes (0) while the whole-tree pass prints both |

**New commitments, Swift SDK wrapping `ocx`.** (1) Ship `.swift-version` with an exact patch and derive the primary CI image from it; the floor leg stays literal (SW-CORE-09). (2) The SDK's gate block calls `weaken-check.sh`, the amended `k07.sh` and the `find` canary with `BASE` set (SW-CORE-01, -03, -06). (3) If the SDK compiles a schema into Swift, check the output in with a regenerate-and-diff step (SW-CORE-05). (4) Every manifest edit starts with the SW-PKG-06 floor command and ends with the `dump-package` proof (SW-CORE-04). (5) The process layer's hang runbook is SW-CORE-18 against a `swift-subprocess` child: launch under `set -m`, signal the child, read thread 0; Linux CI only, as the SDK's coverage and sanitizer legs already are.

**New commitments, Swift CLIs.** (1) Exit codes 132, 134 and 139 are diagnosed, never documented statuses; SW-CORE-16 maps them and SW-CLI-01 owns the `Status` enum. (2) A CLI's `Dockerfile`, unit and CI never set `SWIFT_BACKTRACE=enable=no` (SW-CORE-18 grep). (3) Toolchain bumps run the four dated probes and the `-Werror` gate on the current and floor toolchains (SW-CORE-14, -11). (4) A CLI that adopts `NonisolatedNonsendingByDefault` does it through `migrate` and reads every `@concurrent` it adds (SW-CORE-12, S4).

**Hand-offs to other families (not edited here).** SW-PKG-32: `--target`. SW-CONC-07: `migrate` accepts `--scratch-path`. SW-GATE-10: generated exclusions and the `find` canary (SW-CORE-06). SW-CONC-27 and SW-TEST-17: the TSan verdict is SW-GATE-27's plus SW-CORE-19's kind-first rule (already on the SW-GATE hand-off list). SW-PKG-21: `migrate` edits the dead file. The sub-artifact's two links to `swift-audit/exemplar-concurrency.md` (Axis 7) resolve from the wrong directory and need `../swift-audit/exemplar-concurrency.md` (`check-artifacts.py` reports both); not edited here.

## AI-agent failure modes

Ranked by how often the shortcut compiles and passes, then by cost. Every row has a mechanical check; the worked checks are in [The ruleset](#the-ruleset).

| Rank | Mistake | Why it passes | Mechanical check |
|---|---|---|---|
| 1 | Silences every Swift 6 error with `nonisolated(unsafe)` or `@unchecked Sendable` | Builds green in Swift 6 mode (lazy twin exit 0, 13 added hatch lines) | SW-CORE-10 added-lines delta |
| 2 | Turns a gate green by weakening it: `[.v5]`, `@preconcurrency`, a suppression, a dropped `-Werror`, a longer timeout | The build is green | SW-CORE-01 `weaken-check.sh` |
| 3 | Trusts an empty grep over the wrong directory | `grep` exits 1 with no output on a clean tree and on an empty one | SW-CORE-03 `canary.sh` |
| 4 | Edits a generated file, or counts its hatches as findings | Compiles; the next regeneration reverts it | SW-CORE-05 `generated-touch.sh`, SW-CORE-06 |
| 5 | Migrates with a flag or pastes a feature name: `-swift-version 6` as the migration, `--targets`, `enableUpcomingFeature("NonisolatedNonsendingByDefault")` without `migrate` | Builds; or exit 64; behaviour flips silently | SW-CORE-11/-12 greps and exit codes |
| 6 | Runs `migrate` and reads exit 0 as success on a shadowed manifest | Exit 0, sources rewritten, `-Werror` green, feature off | SW-CORE-04 `dump-package` count |
| 7 | Reads a green plain build as done | The flip leaves warnings that `-Werror` turns into exit 1; 6.4 deprecates what `migrate` emits | SW-CORE-11 step 8 on both toolchains |
| 8 | Triages a crash by exit code alone (132 means precondition) | The code is right for six different faults | SW-CORE-16 `classify.sh`; first message line |
| 9 | Makes the symptom stop: `try? await Task.sleep`, `enable=no`, `timeout 3000` | The next run is green | SW-CORE-17 `silence-check.sh` plus `weaken-check.sh` |
| 10 | Launches with a bare `&`, sends `kill -QUIT`, concludes "no dump"; or `kill -9` first | SIGQUIT was inherited as ignored; the evidence died | SW-CORE-18 `SigIgn` mask |
| 11 | Calls a race from a `Swift access race` report on `Mutex` code, or none from rc 0 | Both are false on this toolchain pair | SW-CORE-19 report kind, five-run count |
| 12 | Chases `unable to type-check this expression in reasonable time` with casts or a raised solver limit | Masks the real `Double` plus `Float` error | SW-CORE-20 split first |
| 13 | Writes `defaultSwiftSettings:`, `withDeadline`, stdlib `FilePath`, or a typed-throws `Task` from proposal text | Accepted proposals are not shipped; the last crashes the frontend | SW-CORE-14 probes |
| 14 | Hard-codes `swift:6.4` beside a different `.swift-version` | Both builds pass | SW-CORE-09 pin grep |
| 15 | Invents `swift test --timeout` or `--deadlock-detect` | Not in `swift test --help` | `swift test --help` |

## Open questions

**Owner decisions (default applied).**
1. SW-CORE-06 amends SW-GATE-10 in place. Default: yes; the index author uses the amended `k07.sh`, the SW-GATE owner edits the text.
2. The scripts (`weaken-check.sh`, `canary.sh`, `generated-touch.sh`, `silence-check.sh`, `fold-check.sh`, `routing-check.sh`, the amended `k07.sh`) ship as saved files in the `swift-quality` support directory and the gate block calls them. Default: files, not table cells (the SW-GATE hand-off says the same for its four).
3. M-P-03 `swift-release` belongs to SW-REL; M-P-04 (a review skill, P3) is not authored. Default: both stand.
4. The receipt (SW-CORE-21) is mandatory output of both skills. Default: yes.
5. A library keeps floor and current legs literal and derives only its primary image. Default: yes (SW-CORE-09).

**Subareas needing another research round.**
- procedures/apple-diagnosis: does the backtracer default and the `com.apple.security.get-task-allow` requirement hold on macOS 26, and what do Instruments and `.ips` crash logs add to the SW-CORE-16 route table? Needs a macOS host; today `unverified: read only`.
- procedures/static-sdk-diagnosis: does a static-Linux-SDK binary print a backtrace with `swift-backtrace-static` next to it and the documented ptrace settings, and does SW-CORE-18's `SIGQUIT` dump survive?
- procedures/test-runner-reaping: when `timeout 60 swift test` kills the driver, is the test runner reaped, and does that change SW-TEST-13's CI timeout advice?
- procedures/migrate-versioned-manifests: why does `swift package migrate` edit `Package.swift` when `Package@swift-X.swift` is in effect (the editor is `SwiftPackageCommand.AddSetting.editSwiftSettings`, `Migrate.swift:261-275`), and should it be reported upstream?
- api/computed-static-var-abi: does replacing a stored `static let` with a computed `static var` change the symbol or break a library-evolution or binary-framework consumer (SW-CORE-10 rung 2)? Measured only for source-distributed packages.
- gates/type-check-budget-ci: is `-warn-long-expression-type-checking=100` stable on a loaded shared runner, and what limit avoids flapping?

## Sub-artifacts

- [swift-procedures/upgrade-and-diagnose.md](swift-procedures/upgrade-and-diagnose.md): the swift-upgrade step list U0 to U10 with per-step counts on 6.4 and 6.3, the `migrate` behaviour table, the fix-ladder cases with code, the toolchain-pin and dated re-check sections, stop conditions and description; the swift-diagnose decision tree, crash signatures (debug and release), backtracer keys, hang capture, sanitizers, type-check gate, the 30 candidate rules and 28 verification runs this file consolidates.

## Key sources

Fetched in this session on 2026-10-10 unless marked "dive" (read by the sub-artifact's author the same day).

1. https://raw.githubusercontent.com/swiftlang/swift/main/docs/Backtracing.rst : `SWIFT_BACKTRACE` keys, handled signals (SIGQUIT row), "will not install its signal handlers ... already a handler" (normative for SW-CORE-18).
2. https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/Commands/PackageCommands/Migrate.swift : `--target`, `--to-feature`, `updateManifest` through `AddSetting.editSwiftSettings` (SW-CORE-12).
3. https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/FeatureMigration.md : the guide's `--targets` spelling and "in active development" (conflict 2).
4. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0526-deadline.md : SE-0526, Accepted with modifications (SW-CORE-14).
5. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0540-default-target-settings.md : SE-0540, Accepted with modifications.
6. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0529-filepath-in-stdlib.md : SE-0529, Accepted with modifications.
7. https://github.com/swiftlang/swift-syntax (`git ls-remote --tags`) : 604.0.0 latest release, 605 prereleases (R26).
8. https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/MigrationStrategy.md : outside-in order, Swift 5 mode first (dive; SW-CORE-11).
9. https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md : spellings per tools version, `-Xswiftc -swift-version` (dive).
10. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0300-continuation.md : double resume traps, leak detection (dive; SW-CORE-16, -19).
11. https://swift.org/blog/swift-5.9-backtraces/ : on-crash backtraces on by default on Linux, interactive only on a TTY (dive; SW-CORE-18).
12. https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags : `exitcode` default 66 (dive; SW-CORE-19).
13. https://github.com/apple/containerization/blob/3e7bc39e66b3/.github/workflows/containerization-build-template.yml : the derived-image pattern (SW-CORE-09).
14. https://github.com/grpc/grpc-swift-2/blob/ac33066eb6ed/dev/check-generated-code.sh : regenerate and `git diff --exit-code` (SW-CORE-05).
15. https://github.com/swiftlang/swift-testing/blob/c7d68ca20cd7/Sources/Testing/ExitTests/ExitTest.swift : the one deliberate `SWIFT_BACKTRACE=enable=no` (SW-CORE-18).
