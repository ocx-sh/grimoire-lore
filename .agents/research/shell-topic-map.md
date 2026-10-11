---
title: "Shell topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, wave 3 staged"
phase: 3
model: opus
date: 2026-10-10
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 12
candidates_deduplicated: 237
---

# Shell topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject. "Error handling" is a wave.
   "Where is errexit silently disabled, and which optional ShellCheck check reports each site?" is a row.
   Each row is something a later rule answers with a named verification.

2. **Coverage is measured against the sibling lore sets** inventoried in [cfg](shell-audit/config-inventory.md).
   No set targets shell. The touchpoints that exist:
   - `code-docs` already globs `**/*.sh`, `**/*.bash`, `**/*.zsh`, `**/*.ps1`, `**/*.psm1`, but carries no shell checks.
   - `rust-quality/cli-contract.md` owns the exit-code and stream shape (EXIT-02, EXIT-11, CLI-01, CLI-05, CLI-12, CLI-14). Shell rows that mirror it are `partial (rust cli-contract)`.
   - `cmake-build` CMK-CORE-05 owns the "no early-exit reader under pipefail" rule for CMake trees only.
   - `bazel-quality`, `nix-quality`, `python-quality` carry CI notes, never the `run:` shell semantics.
   - `swift-quality/checks/*.sh` are the only shipped shell scripts (9 files).

   So `uncovered` is the default and the honest value for almost every row.

3. **Priority is judged against three consumers.**
   - **Fleet scripts and CI:** 213 authored files, 17.7 KLOC in 17 repos, 79% bash; 628 workflow `run:` blocks; 954 Taskfile cmds ([fleet](shell-audit/fleet-shell-shape.md)).
   - **ocx's multi-shell emitter and the fleet installers:** a 10-variant `Shell` enum (24,527 LOC) ([ocx](shell-audit/ocx-emitter.md)); the 5-dialect installer set in `www-setup/src` and grimoire's cargo-dist front door ([inst](shell-audit/installers.md)).
   - **External adopters** of the catalog, measured through the 39-repo exemplar corpus ([ex](shell-audit/exemplar-shape.md)).

   A topic central to shell culture but irrelevant to all three drops to P2. The reverse also happens: a curly quote closing a PowerShell literal (M-M-02) is invisible to most shell writing and decisive for an emitter.

4. **SURFACE legend.**
   - Dialects: `posix` · `bash` · `zsh` · `ksh` · `fish` · `nu` · `elvish` · `pwsh`
   - Environment: `userland` (GNU, BSD, busybox, uutils, MSYS) · `ci` (GitHub Actions, Taskfiles)
   - Artifacts: `emitter` (code generated for N shells) · `installer` (`install.sh` / `install.ps1`)
   - Quality: `testing` · `lint-format` · `security` · `any`

5. **Source keys.** All 12 wave-1 artifacts returned, and each was read in full.
   - Frame: [frame](shell-frame.md)
   - Audits: [cfg](shell-audit/config-inventory.md) · [fleet](shell-audit/fleet-shell-shape.md) · [ocx](shell-audit/ocx-emitter.md) · [inst](shell-audit/installers.md) · [ex](shell-audit/exemplar-shape.md) · [emit](shell-audit/emitters-compared.md) · [plat](shell-audit/platform-matrix.md)
   - Scouts: [canon](shell-topic-map/canonical.md) · [prac](shell-topic-map/practitioner.md) · [cod](shell-topic-map/codified.md) · [fail](shell-topic-map/failure.md) · [shift](shell-topic-map/shifts.md)
   - In table cells the key appears bare (`[fleet]`); a `§` or `#` points into that artifact.

6. **Every P0 names a check** in its priority cell: a ShellCheck code, a PSScriptAnalyzer rule, a parse or `matrix.sh` run, a grep, or a named reading heuristic. A P0 that could not name one was demoted.

7. **Version-specific rows carry their version and the date 2026-10-10.** The versions current on that date:
   - bash 5.3 (5.3.20 image; 5.3.9 on Ubuntu 26.04); macOS `/bin/bash` 3.2.57 (read only).
   - dash 0.5.12 as packaged (-2 Debian 12, -6ubuntu5 Ubuntu 24.04, -12 Debian 13 and Ubuntu 26.04); upstream 0.5.13.5.
   - busybox 1.37.0 (1.38.0 unstable); zsh 5.9 packaged, 5.9.2 upstream; fish 4.9.3; nushell 0.116.1; elvish 0.21.0.
   - Windows PowerShell 5.1.26100.9444; PowerShell 7.6.6 LTS (EOS 2028-11-14); 7.4 and 7.5 EOS 2026-11-10.
   - ShellCheck 0.11.0; shfmt 3.13.1 installed, 3.14.1 upstream; PSScriptAnalyzer 1.25.0; bats-core 1.14.0; Pester 6.2.0 (5.7.1 in the toolchain).
   - GitHub `ubuntu-latest` moves from 24.04 to 26.04 between 2026-10-19 and 2026-11-19.

## Conflicts resolved

Twenty-two places where two wave-1 artifacts disagree, or where an artifact disagrees with the frame (H1-H9, Q1-Q6) or with a fleet rule.
Evidence is ranked:
1. **normative:** POSIX.1-2024, a shell's or tool's own manual, NEWS, CHANGELOG or source, Microsoft Learn, GitHub Docs;
2. **measured:** a `matrix.sh` run or a corpus count on 2026-10-10;
3. **codified:** a shipped linter default or rule catalogue (ShellCheck, PSScriptAnalyzer, Debian Policy);
4. **argued:** a named practitioner with a reason (Wooledge, Google, oils);
5. **asserted:** a claim with no source, including fleet rule files.

**1. `set -e` as a default vs explicit error checks.** Resolved **by script kind**, not globally.
- The sources split three ways. Wooledge (BashFAQ/105, BashPitfalls #60) and oils say errexit is broken (argued). Google, agent rule packs and GHA `shell: bash` make it the default (codified). Debian Policy says "`set -e` or check every exit status" (codified).
- The measurements decide the shape. `local x=$(false)` masks the status in all 9 sh-family shells that have `local`, and on bash 3.2-5.3 ([fail] §9, [cod] m1). A function called from `if`/`&&`/`||` runs with errexit off on every version. Failing `(( ))` and `[[ ]]` abort only from bash 4.1 ([fail] §10).
- The fleet already chose: `set -euo pipefail` in 77% of non-snippet bash, `set -eu` in sh, never pipefail in sh, and 0 `local x=$(…)` ([fleet] #9). The real hazard is SC2310 ×69 in 9 files and SC2312 ×150 in 41 files.
- Bootstrap code avoids `-e` on purpose: rustup (`set -u` + `ensure`/`need_cmd`), Homebrew (`set -u` + `abort`), git (`&&` chains), nvm (sourced; probes `${-#*e}` and restores, `nvm.sh:3877-3905`) ([ex]).

**Resolved:**
- **Repo and CI bash scripts:** `set -euo pipefail` stays, as a net and never the contract. `check-set-e-suppressed` and `check-extra-masked-returns` become mandatory, so every site where `-e` is off is visible (M-B-01, M-B-02).
- **`#!/bin/sh` scripts:** `set -eu`, plus pipefail only through the probe (conflict 3).
- **Installers and bootstrap:** `set -u` plus explicit `|| die` at every fallible call (rustup model).
- **Sourced libraries:** set no options; a library that sets `-e` changes the caller's shell.
- Wave 2 `errexit/error-model` confirms or overturns this by reading 15 of the 69 SC2310 sites.

**2. POSIX sh vs bash as the default dialect, and the bash floor per script kind.** Resolved **by script kind**.
- Frame Q1 says POSIX sh for installers and bash 3.2-compatible where macOS can run it. H1 assumed fleet `#!/bin/sh` scripts hide bashisms.
- H1 is refuted: 0 of 190 sh-shebang scripts carry an SC3xxx; the one exception is a deliberate, runtime-probed `local` (`www-setup/src/install.sh:5,39`) ([fleet] #6). Exemplars: 3.5% of `#!/bin/sh` files ([ex]).
- The fleet is a bash fleet (155 of 197 authored files) whose bash 4+ use is tiny: 5 of 166 files, 0 version guards ([fleet] #10).
- macOS `/bin/bash` is 3.2.57 through macOS 26.5 (normative, Apple source; read only), and GitHub's macOS runners print 3.2.57 ([plat], [shift]).

**Resolved, per kind:**

| Script kind | Dialect and shebang | Floor |
|---|---|---|
| Installer, bootstrap, rc snippet for login shells | `#!/bin/sh` | POSIX.1-2017 plus probed features; tested on dash 0.5.12-2, busybox 1.37, bash 3.2 `--posix` |
| Repo tool, CI helper, test helper | `#!/usr/bin/env bash` | bash 3.2 unless a header names the pinned interpreter (CI image, container, ocx toolchain) |
| Pinned-interpreter script | `#!/usr/bin/env bash` plus a `BASH_VERSINFO` guard first | the pinned version, guarded |
| Sourced library | no shebang, `# shellcheck shell=bash` or `shell=sh` | the floor of its callers |
| zsh, fish, nu, elvish | their own shebang or none (sourced) | the version table in M-A-03 |

The table goes to owner Q1. Wave 2 `dialect/floors-and-shebangs` writes the verbatim header convention.

**3. Are the POSIX.1-2024 additions usable yet?** Resolved **per feature**, with the measured verdict.
- Normative: POSIX.1-2024 adds `set -o pipefail`, `$'..'`, `read -d`, `find -print0`, `xargs -0`/`-r`, `realpath`, `readlink`, `timeout`, `test -ef/-nt/-ot`, and drops `test -a/-o` ([canon], [shift] §2).
- Measured: dash 0.5.12 as Debian 12 and Ubuntu 24.04 ship it lacks pipefail, `$'..'` and `read -d`. posh 0.14.1 lacks all three. yash 2.52 lacks pipefail and `$'..'` ([shift], [fail] §9).
- Codified lint lags: ShellCheck 0.11.0 still emits SC3040, SC3003 and SC3045; only unreleased master accepts pipefail ([cod] §2, [shift] §14).
- **Canonical vs platform-matrix:** [canon] says Debian sid / Ubuntu 26.04 dash 0.5.12-12 lacks pipefail. [plat] and [shift] measured it accepting `set -o pipefail` (Debian backported it in 0.5.12-7, 2024-05-17). **Measured wins.** A version number does not identify the feature set; probe, never parse `--version`.

**Resolved (2026-10-10):**

| Feature | Verdict for `#!/bin/sh` |
|---|---|
| `set -o pipefail` | **probe** with `(set -o pipefail) 2>/dev/null && set -o pipefail`. Never `set -o pipefail \|\| …`: dash 0.5.12-2 and posh abort on a special-builtin error ([canon], [plat]) |
| `$'..'` | **never**: printed literally, without error, on dash 0.5.12, yash 2.52, posh |
| `read -d` | **never** in sh |
| `find -print0`, `xargs -0` | **use** (GNU, BSD, busybox default build); wave 2 confirms the busybox build option |
| `xargs -r` | **use on Linux only**; it is a no-op on macOS (read only), so a macOS-reachable script must not depend on it |
| `realpath` | **use on Linux**; macOS 13+ only |
| `readlink -f` | **use on Linux**; macOS 12.3+ only |
| `timeout` | **probe**; absent on macOS |
| `test -nt/-ot/-ef` | **use** |
| `test -a/-o` | **never** (removed in 2024; SC2166) |

ShellCheck's SC3040 on a probed pipefail is suppressed with a reason; SC3003 and SC3045 stay on as real findings for dash.

**4. ShellCheck: `enable=all` vs defaults vs a curated set, and which codes to relax.** Resolved: **a curated set at default severity.**
- `-o all` is rejected. The wiki says optional checks "are more subjective rather than more comprehensive, and may conflict with each other" (normative, [cod] §3).
- **The fleet gate's `-S warning` is overturned.** SC2086, SC2046, SC2068 and SC2162 are info-level findings, so `shellcheck -S warning` (`ocx/taskfiles/shell.taskfile.yml:38`) hides the single most frequent bug class (SC2086: 4,387 exemplar findings, 183 of 278 research-scratch findings) ([ex], [fleet] #7). Wave 2 `gate/lint-format-profile` measures what the fleet gate misses.
- **Enabled optional checks:** `check-set-e-suppressed` (SC2310/2311), `check-extra-masked-returns` (SC2312), `deprecate-which` (SC2230).
- **Relaxations come from the disable census:** 1,185 directives, only 12.5% justified ([ex]). Central configs relax SC2317, SC2329, SC1091 and SC2016 (mise, docker, shellspec).
  - **May be disabled with a reason:** SC2317/SC2329 on trap handlers and dispatch tables; SC1091 only where `source-path=SCRIPTDIR` cannot resolve; SC2016 for deliberate single-quoted `$`; SC3040 on a probed pipefail; SC3043 on `local` when ksh93 is not a target.
  - **Never disabled:** SC2086, SC2046, SC2068, SC2155, SC2164, SC2162, SC2115.
  - **Every directive carries a trailing reason.** That is the check for M-F-03.

**5. shfmt style of record.** Resolved: **`-i 4 -ci` written to `.editorconfig`, never passed as flags** (owner Q3).
- Fleet: 161 of 197 authored files are clean under `shfmt -d -i 4 -ci` (ocx 117/117) ([fleet] #8). The agent-scratch style is 2 spaces (97 of 129 files), which is exactly the drift a rule exists to stop.
- Corpus: 2 spaces 54%, tabs 32%, 4 spaces 13% ([ex]). Google's style is `-i 2 -ci -bn` (argued, [cod] §4).
- Normative: shfmt reads `.editorconfig` only when no printer flag is given ([cod] §4). So the gate runs `shfmt -d` with no style flags, and the style lives next to the code.
- An adopter repo that pins another style in `.editorconfig` is not a defect.

**6. PowerShell target per script kind and the PSScriptAnalyzer profile.** Resolved.
- **Targets:**
  - **Installers and bootstrap: Windows PowerShell 5.1.** It is the only inbox shell; `#Requires -Version 5.1`; ASCII only.
  - **Repo, dev and CI scripts: PowerShell 7.6 LTS.** Frame Q2 said 7.4+, but 7.4 and 7.5 reach end of support on 2026-11-10 ([shift] §11, [fail] §15), so the floor written today is 7.6.
  - **Modules:** dual-edition (`CompatiblePSEditions` Desktop, Core), parse-tested on 5.1.
- **PSSA profile:** `Severity = Error, Warning`, with `PSUseCompatibleSyntax` enabled and `TargetVersions` set to the script kind's floor. It is disabled by default, which is why 5.1 breakage goes unseen ([cod] §8).
  - **Exclusions by kind, not globally:**
    - ShouldProcess-family rules for scripts (www-setup and Pester exclude them);
    - `PSAvoidUsingWriteHost` only for installers and interactive scripts;
    - `PSUseApprovedVerbs` and `PSUseSingularNouns` only for non-exported script functions.
  - `PSUseCompatibleCommands` and `PSUseCompatibleTypes` are not relied on: the bundled profiles stop at 7.0 ([cod] §8).
  - **The 5.1 parse on the real host is the second gate:** a 5.1 parse error is all-or-nothing ([cod] m7).

**7. One shell rule with per-shell depth files vs separate rules; extensionless scripts.** Resolved: **two rules.**
- **`shell-quality`:** sh, bash, zsh, ksh, fish, nu, elvish, bats, plus the CI YAML in conflict 8.
- **`powershell-quality`:** PowerShell is a different language, with a different gate (PSSA), error model and encoding problem. The glob is genuinely different.
- **fish, nu and elvish do not get a third rule.** The fleet has 3 authored files in those shells ([fleet] #14). Most of their risk is emitted code inside Rust strings, which no glob reaches, so the `shell-integration` skill carries it.
  - One depth file per shell, routed from the `shell-quality` index ("which shell is this file?" is the first routing row).
  - This applies frame Q3 (integration first).
- **Extensionless scripts cannot be reached by any glob.** No client, checker or grim transform matches a shebang ([cfg] §2.4: 0 of 207 catalog globs are content-based). `**/bin/*` over-matches, so it is rejected (memory "globs must not miss").
- The fleet has only 6 authored extensionless files: 5 tool-managed `bd` hooks and 1 served bootstrap ([fleet] #3). The 313-376 `.ocx/toolchain/shells` trampolines are generated and gitignored.
- **The mechanism has three parts:**
  - (a) the index makes **an extension on authored scripts** a SHOULD (M-O-04);
  - (b) the gate discovers shebang files with `shfmt -f` / `--detect` (M-F-06), so the gate does not miss what the rule cannot load on;
  - (c) the skill descriptions name "extensionless scripts".

**8. Do GHA `run:` blocks and Taskfile `cmds` belong to this set or to a CI set?** Resolved: **this set; the index globs them** (owner Q4).
- No CI set exists. No rule in the catalog globs `.github/workflows` today (map-time check of all 21 index frontmatters). The sibling CI notes (bazel `ci.md`, python `ci-gate.md`, nix gates) do not cover `run:` shell semantics.
- The `run:` block is the largest fleet shell surface by count: 628 blocks against 197 authored script files. 82% run on the default shell, which has no pipefail ([fleet] #11). It also holds the fleet's one confirmed injection, `www-setup/.github/workflows/test-installers.yml:206-207`.
- "Narrow the Glob Only When It Cannot Miss" points to widening: an agent editing a workflow `run:` block is writing shell, and a pointer-only route would miss every edit. The added globs are exact names the tools require:
  - `**/.github/workflows/*.yml`, `**/.github/workflows/*.yaml`;
  - `**/action.yml`, `**/action.yaml`;
  - `**/Taskfile.yml`, `**/taskfile.yml`, `**/*.taskfile.yml`.
- **The cost is accepted:** a non-shell workflow edit loads the ~200-line index, whose first routing row sends it to `ci.md`.
- **If a CI set is created later,** `ci.md` moves there and these globs go with it.

**9. Era rows the shifts scout overturned.** Each line names the old advice, the replacement, and the evidence.

| Old advice | Now (2026-10-10) | Key |
|---|---|---|
| "pipefail and `$'..'` are bashisms" | Both POSIX.1-2024; pipefail present in Debian 13 / Ubuntu 26.04 dash, absent in Debian 12 / Ubuntu 24.04 dash and posh | [shift] §2-3 |
| "dash has no pipefail" | True upstream until 0.5.13 (2025-09-21); false for Debian `0.5.12-7`+ packages | [shift] §3 |
| "PowerShell 7.4 is the LTS to target" | 7.6 LTS (2026-03-18); 7.4 and 7.5 EOS 2026-11-10 | [shift] §11 |
| "`ubuntu-latest` is 24.04: bash 5.2, GNU coreutils, ShellCheck 0.9" | 26.04 from 2026-10-19: bash 5.3.9, dash with pipefail, uutils 0.10.0, ShellCheck 0.11.0 | [shift] §13 |
| "Ubuntu userland is GNU coreutils" | uutils since 25.10; 52 of 55 behaviours identical, differs in banner, collation, error text | [shift] §12 |
| "fish `?` is a glob", "`bind -k`" | `?` stopped globbing in 4.0 (2025-02-27); `bind -k` removed in 4.1 | [shift] §8 |
| "`$nu.home-path` / `$nu.temp-path`" | Hard errors since 0.110 (`-dir`); `str upcase` deprecated in 0.114 | [shift] §9 |
| "shfmt cannot format zsh" | Parses zsh from 3.13.0 (2026-03-09); `shfmt -l` exits non-zero | [shift] §14 |
| "bats `run` shields errexit" | bats 1.14.0 `run` honours `set -e`; an empty suite fails | [shift] §14 |
| "`-UseBasicParsing` only matters without IE" | Since the 2025-12-09 update, 5.1 IWR without it fails under `-NonInteractive` (CVE-2025-54100) | [fail] §15 |
| "`powershell -Version 2` is a test path" | 2.0 engine removed (Windows 11 24H2, Server 2025) | [shift] §11 |
| "SC2002 UUOC is always reported" | Default-off since ShellCheck 0.11.0 | [cod] §2 |
| "Debian 13 drops yash and posh" (frame) | yash dropped, posh 0.14.1 kept | [shift] §5 |
| "bash 5.x `${y/b/&}` and `.*` behave as before" | 5.2 turned on `patsub_replacement` and `globskipdots` silently | [shift] §1 |

**10. macOS `/bin/sh`.** The fleet's native `quality-bash.md` (grimoire, index, ocx, grimoire-vscode) says "macOS /bin/sh is dash" (asserted, [cfg] §5). Apple's source and docs say `/bin/sh` runs bash 3.2 in POSIX mode, with dash selectable through `/private/var/select/sh` (normative, read only, [plat], [frame] H7). **Apple wins.** The rule states the default, and marks it "unverified: read only".

**11. The fleet `quality-bash.md` prescriptions.** Each is overturned by a higher rank:
- **The mandated `IFS=$'\n\t'`** was dropped by the later strict-mode templates ([prac]). It changes `read` and `"$*"` behaviour, and nothing measured supports it. **Not mandated** (M-B-18).
- **The ban on `[ ]` in bash** is overturned. `[` vs `[[` is decided by dialect, not style ([cod] contested). `[ ]` in bash is not a defect.
- **The empty-array advice** `args=(); "${args[@]}"` under `set -u` fails on bash 3.2/4.0/4.2 ([canon] measured). The idiom is `${args[@]+"${args[@]}"}` (M-B-06).
- **`shellcheck -S warning`** is overturned by conflict 4.

**12. The hypotheses.**
- **H1 refuted:** 0/190 ([fleet]).
- **H2 split:** errexit is present and mostly well-used; the hazard is suppression, not absence ([fleet] Axis 4).
- **H3 confirmed, in a sharper form:**
  - PowerShell curly quotes U+2018-201B close a single-quoted literal, which is code execution on pwsh 7.4, 7.6.6 and WinPS 5.1 (`ocx@5de9d777eb7d:crates/ocx_shell/src/shell/escape.rs:35`). The same class is in direnv, starship, mise and zoxide ([ocx]).
  - A shared POSIX quoter reused for fish, nu and elvish fails 17-18 of 20 hostile cases ([emit]).
- **H4 refuted for installers:** GNU-isms are confined to `test/manual` scripts and the Swift checks ([fleet] Axis 5). But the flagship installer crashes on busybox wget (`www-setup/src/install.sh:352-354`, [inst]).
- **H5 confirmed and extended:** a mid-script native failure in a pwsh step is invisible on 5.1 and 7.6.6 ([plat]).
- **H7 confirmed,** read only.
- **H8 confirmed.**
- **H9 split:** nu is the churniest target (4.5% of nu_scripts change 0.105→0.116 against 0.6% for fish 3.6→4.9; zoxide carries 11 nu pins) ([ex], [emit]). But ocx's emitted nu passes on 0.105.1 and 0.116.0 behind its `describe` guard ([ocx]).

**13. `local` in `#!/bin/sh`.**
- ShellCheck SC3043 flags it (codified). Debian Policy allows it (codified).
- It runs in dash, ash, mksh, yash, posh, bash and zsh-sh, and is absent only in ksh93u+m (measured, [cod] p1).

**Resolved:**
- **Allowed** when ksh93 is not a target, with `# shellcheck disable=SC3043 # local: dash/ash/bash/mksh/yash/posh; not ksh93`.
- **Installers** keep the rustup/www-setup probe (`has_local || alias local=typeset`).

**14. `#!/usr/bin/env bash` vs `#!/bin/bash`.**
- Google mandates `/bin/bash` (argued). The fleet uses `env bash` in 154 of 155 bash files (measured).
- `/bin/bash` is the wrong interpreter on NixOS (absent) and BSD (`/usr/local/bin`). On macOS it pins 3.2 ([cod] #13, [fail] contested).

**Resolved:** `#!/usr/bin/env bash`, plus a `BASH_VERSINFO` guard when the floor is above 3.2. `#!/bin/bash` is not a defect where a 3.2 floor is intended.

**15. Exit-status vocabulary.** There are two taxonomies:
- the Rust cli-contract table (0, 1, 64-82 sysexits, 128+N);
- the www-setup installer table (0-7, usage = 2, `www-setup/.claude/rules/installers.md:224-236`) ([cfg] §4, [inst]).

**Resolved by kind** (owner Q6):
- CLIs written in shell mirror the Rust table.
- Installers keep 0-7.
- Both document that a signal-killed child reads 143 in 8 shells, 271 in ksh93u+m and 399 in yash ([canon]), so scripts never compare against a literal 128+N from another shell.

**16. `elvish -compileonly` exists.** [ocx] says it does not. [inst] and [ex] used it on 0.21.0 with planted errors (55/55 verified) (measured wins). It gives false positives on `edit:` in non-interactive checks ([ex]). `nu-check` always exits 0, so the nu parse gate needs a wrapper over `nu --ide-check` diagnostics ([inst]).

**17. Counts in the frame vs the audits.** [fleet] and [cfg] differ slightly: 389 vs 393 extensionless `sh` files; 313 vs 376 ocx trampolines. [fleet] dedupes same-remote clones and [cfg] does not. **[fleet] is used for authored counts and [cfg] for raw counts.** Both overturn the frame's ~1100 and ~1450 (frame corrections).

**18. SIGPIPE under pipefail.** CMK-CORE-05 already says "never pipe into an early-exit reader under pipefail" for CMake trees. **Resolved:** SH-ERR generalises it for every shell script (M-B-07), and the cmake row stays with a sibling pointer. ShellCheck's SC2337 is unreleased, so the check is a grep until it ships.

**19. `echo` vs `printf`.** Google allows `echo` (argued). The measured split is 4 against 4: dash, mksh, yash and posh interpret `\t` in plain `echo`, while bash, ash, ksh93 and zsh-sh do not; yash prints `-n` ([cod] q1, [fail] §9). **Resolved:** `echo` only for fixed literals with no leading `-` and no backslash; `printf '%s\n'` for everything else (M-C-04).

**20. `[[ -v ]]`, assoc arrays and friends are "just bash."** Codified tools cannot see them: with `#!/bin/bash`, ShellCheck flags none of 16 bash-4/GNU probes, and it has no "target bash 3.2" setting ([koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615), open) ([fail] §3). **Resolved:** the bash 3.2 floor is enforced by a grep denylist plus a `bash -n` and run on the `bash:3.2` image (M-A-06). That is wave-2 dive `dialect/bash-version-gate`.

**21. GHA "the shell GHA uses".** `skills/nix-flake-adopt` says `bash --noprofile --norc -eo pipefail` is "the shell GHA uses". It is true only for an explicit `shell: bash`; unspecified is `bash -e {0}` (normative, [plat]). **Reported as a sibling defect** (M-X-04), not fixed here.

**22. Who verifies on Windows.** The frame Q4 grant stands: `matrix.sh win` and `matrix.sh pwsh` ran on the real host in wave 1 (Git Bash 5.2.15, WinPS 5.1.26100.9444) without incident. Wave 2 keeps it, staged only under `C:\Users\ecom\shell-wintest`.

## The map

237 rows, sorted into lettered sections. Each section feeds one future depth file (A becomes `shell-quality/dialect.md`, and so on). Section O becomes the `shell-quality` index, V the `powershell-quality` index, W the skills, and X goes to sibling owners.

IDs are stable; a later wave appends rows and never renumbers. Coverage defaults to `uncovered`. `partial (sibling)` names the sibling whose shape transfers.

### A. Dialect and floors → `shell-quality/dialect.md` (SH-DIAL)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-A-01 | Which dialect does this script target, and do the shebang, the extension, a `# shellcheck shell=` directive and the body agree? | posix,bash,lint-format | uncovered · [fail] #1, [cod] #3 | P0: the gate for every portability rule; check: SC2148, `shfmt -d` parse error "tried parsing as posix", `shellcheck -s sh` SC3xxx | SH-DIAL |
| M-A-02 | Which script kinds must be POSIX sh (installer, bootstrap, login-shell snippet), which may be bash, and what is each kind's bash floor (3.2 unless the interpreter is pinned)? | posix,bash,installer | uncovered · [frame] Q1, [fleet] #5, [plat] | P0: conflict 2; check: header names the kind, and a `matrix.sh bash` run on `bash:3.2` passes for unpinned bash | SH-DIAL |
| M-A-03 | The floor table (2026-10-10): `/bin/sh` per platform (dash 9, bash 9, busybox 3 of 21 images), bash per OS (macOS 3.2.57, Debian 13 5.2.37, Ubuntu 26.04 5.3, Alma 9 5.1.8, AL2023 5.2.15), zsh, fish, nu, elvish, pwsh. | any | uncovered · [plat], [shift] §12 | P0: every other floor row cites it; check: heuristic "every row names image and date", re-measured by `matrix.sh` | SH-DIAL |
| M-A-04 | Which POSIX.1-2024 additions may a `#!/bin/sh` script use in 2026, per feature (use / probe / never)? | posix,userland | uncovered · [canon], [shift] §2, [fail] §9 | P0: conflict 3; check: `matrix.sh posix` probe battery plus grep for dollar-single-quote in sh files | SH-DIAL |
| M-A-05 | How is pipefail enabled safely in sh: the subshell probe, never `set -o pipefail \|\| …` (dash 0.5.12-2 and posh abort)? | posix,installer | uncovered · [canon], [plat], [shift] §3 | P0: unguarded line kills Ubuntu 24.04 `sh`; check: grep `set -o pipefail` in `#!/bin/sh` files outside `( … ) 2>/dev/null`; run on `shellzoo:deb12` | SH-DIAL |
| M-A-06 | Which bash features fail on macOS 3.2.57 (assoc arrays, `mapfile`, `${x,,}` 4.0; `[[ -v ]]`, negative index 4.2; `local -n`, `wait -n` 4.3+; `${x@Q}`, `inherit_errexit` 4.4; `EPOCHREALTIME` 5.0; `${ cmd; }` 5.3), and how is each detected when ShellCheck cannot? | bash | uncovered · [fail] §10, [shift] §1, [cod] #50 | P0: biggest codified gap (shellcheck#2615); check: grep denylist plus `bash -n` and a run on `bash:3.2` | SH-DIAL |
| M-A-07 | Do parse-time bash 4 constructs kill the whole script on 3.2, so a runtime guard placed after them never runs? Where must the guard sit? | bash | uncovered · [prac], [ex] (omp.bash:34) | P1 | SH-DIAL |
| M-A-08 | What is the guard idiom for a raised floor (`BASH_VERSINFO` in a 3.2-parsable prologue; refuse or re-exec), given 0 guards fleet-wide? | bash | uncovered · [fleet] #10, [ex] (pyenv-rehash:139, bats bin/bats:8-15) | P1 | SH-DIAL |
| M-A-09 | `#!/usr/bin/env bash` vs `#!/bin/bash` vs `#!/bin/sh`: which interpreter does each pick on macOS, NixOS, BSD and containers? | posix,bash | uncovered · [cod] #13, [fail] contested, [fleet] #5 | P0: conflict 14; check: grep line 1 against the two allowed forms; SC2239 | SH-DIAL |
| M-A-10 | Which shebang forms fail on Linux (`#!/bin/bash -e -o pipefail`, `#!/usr/bin/env bash -e`), and when is `env -S` allowed? | posix,userland | uncovered · [fail] §8 | P1: check SC2096 | SH-DIAL |
| M-A-11 | What did bash 5.2 change silently (`patsub_replacement`: `${y/b/[&]}` gives `a[b]c`; `globskipdots`), and how is replacement text written to behave the same on 3.2-5.3? | bash | uncovered · [shift] §1 | P1 (bash 5.2+, measured) | SH-DIAL |
| M-A-12 | When may a script use bash 5.3 features (`${ cmd; }`, `GLOBSORT`, `source -p`, `trap -P`), given Debian 13 5.2.37 and Alma 10 5.2.26? | bash | uncovered · [shift] §1, §12 | P2 | SH-DIAL |
| M-A-13 | Is `bash --posix` or `zsh --emulate sh` ever a portability check? (bash 5.2 `--posix` accepts `${x,,}`, arrays and `<()`.) | posix | uncovered · [fail] §9, [canon] | P1: heuristic "portability evidence comes from dash, posh or busybox runs" | SH-DIAL |
| M-A-14 | Is `local` allowed in `#!/bin/sh` (absent only in ksh93u+m), and what is the installer probe (`has_local \|\| alias local=typeset`)? | posix,ksh,installer | uncovered · [cod] #2, [fleet] #6, [inst] | P1: conflict 13 | SH-DIAL |
| M-A-15 | What does busybox ash 1.37 on Alpine 3.22 support (pipefail, `$'..'`, `[[`, `${x//}`, `<()`; no arrays, no brace expansion; `<<<` only in 1.38), and which features are build options? | posix | uncovered · [shift] §4, [cod] §12 | P1 | SH-DIAL |
| M-A-16 | Which interpreters form the "tested on" table (dash -2 and -12, busybox 1.37, bash 3.2/5.x, mksh, posh, yash; ksh93 and BSD sh read only)? | posix,testing | uncovered · [plat], [shift] §5 | P1 | SH-DIAL |
| M-A-17 | When should a shell script become a program in another language (Google: past 100 lines; error-proneness grows with size)? | any | uncovered · [cod] §1, [fail] §18, [prac] | P2: argued only | SH-DIAL |
| M-A-18 | What is macOS `/bin/sh` (bash 3.2 POSIX mode, dash selectable), and which fleet advice is wrong? | posix,bash | uncovered · [plat], [cfg] §5, [frame] H7 | P1: conflict 10, read only | SH-DIAL |
| M-A-19 | What is `/bin/sh` on RHEL 8 and AL2 (bash 4.4 / 4.2 in POSIX mode; no `<()` in POSIX mode before 5.1)? | posix | uncovered · [plat] | P2 | SH-DIAL |
| M-A-20 | `function f {` vs `f() {`: which dialects accept which, and which reject function names containing `-`? | posix,bash | uncovered · [fail] §9, [cod] §5 | P2: SC2112, SC3033 | SH-DIAL |
| M-A-21 | What is the oils divergence ranking (yash 54.6%, dash 42.3%, ash 40.2%, zsh 38%, mksh 34.4%, bash 13.2%) good for? | posix,testing | uncovered · [plat] | P3: background for M-A-16 | SH-DIAL |
| M-A-22 | Is `BASH_COMPAT` / `shopt compatNN` ever a portability tool? | bash | uncovered · [shift] #10 | P3: a "do not" | SH-DIAL |

### B. Errors, exit status and traps → `shell-quality/errors.md` (SH-ERR)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-B-01 | Which error model does each script kind use: strict prologue (bash), `set -eu` plus probed pipefail (sh), `set -u` plus explicit checks (installers), nothing (sourced libraries)? | bash,posix,installer | uncovered · [fleet] Axis 4, [ex], [canon], [prac] | P0: conflict 1; check: `shellcheck -o check-set-e-suppressed,check-extra-masked-returns` clean | SH-ERR |
| M-B-02 | Where is errexit silently off: a function called from `if`/`&&`/`\|\|`/`!`, `local x=$(…)`, `export x=$(…)`, command substitution, a `!` pipeline? | bash,posix | uncovered · [fail] §9, [cod] m1, [canon] | P0: fleet SC2310 ×69 in 9 files, SC2312 ×150 in 41; check: SC2310, SC2311, SC2312, SC2155 | SH-ERR |
| M-B-03 | Does `set -e` abort on a failing `(( i++ ))` or `[[ ]]` (no on 3.2/4.0, yes from 4.2), and how do 3.2-floor scripts compensate? | bash | uncovered · [cod] m1, [fail] §10 | P1 (bash 3.2-5.3, measured) | SH-ERR |
| M-B-04 | `set -e; ( false ); echo after` continues on bash 3.2 and exits on 4.0+. Does any fleet script depend on either? | bash | uncovered · [canon] | P2 | SH-ERR |
| M-B-05 | When is `inherit_errexit` (4.4+) needed, and what does `echo $(false; echo hi)` print in default bash, POSIX mode and busybox? | bash,posix | uncovered · [canon], [fail] §9 | P1 | SH-ERR |
| M-B-06 | `set -u` with an empty `"${a[@]}"` fails on bash 3.2/4.0/4.2 (passes 4.4), and with `"$@"` on 3.2. Is `${a[@]+"${a[@]}"}` the idiom? | bash | uncovered · [canon], [fleet] (setup-grimoire/.github/scripts/install.sh:82, index/scripts/smoke-test.sh:85) | P0: fleet rule prescribes the failing form; check: grep `"\${[A-Za-z_]*\[@\]}"` in `set -u` files, plus a `bash:3.2` run of the plant | SH-ERR |
| M-B-07 | Pipefail plus an early-exit reader (`\| grep -q`, `\| head -1`) gives status 141: when is it a false failure, and what replaces it? | bash,posix | partial (cmake-build CMK-CORE-05) · [fail] #7, [prac] | P0: conflict 18; check: grep `\| *grep -q\|\| *head` in pipefail files (SC2337 unreleased) | SH-ERR |
| M-B-08 | `cmd; if [ $? -ne 0 ]` vs `if ! cmd`: when is `$?` clobbered by a substitution in the same command (shellcheck#3522)? | any | uncovered · [fail] #45 | P2: SC2181 | SH-ERR |
| M-B-09 | Which exit-status vocabulary do scripts use: the Rust cli-contract table, or the installer 0-7 table? | any,installer | partial (rust cli-contract) · [cfg] §4, [inst] | P1: conflict 15, owner Q6 | SH-ERR |
| M-B-10 | What does a signal-killed child report per shell (TERM: 143 in 8 shells, 271 ksh93u+m, 399 yash; PIPE: 141/269/397), and what may a script compare against? | posix,ksh | uncovered · [canon], [cfg] gap 7 | P1 | SH-ERR |
| M-B-11 | How does a script re-raise INT or TERM after cleanup so the parent sees 130/143 (`trap - INT; kill -INT $$`)? | posix,bash | partial (rust cli-contract EXIT-11) · [cfg] §4 | P1 | SH-ERR |
| M-B-12 | Is `trap … EXIT` the single cleanup point, and which forms are portable (EXIT INT TERM HUP; names vs numbers; no ERR in sh)? | posix,bash | uncovered · [cod] #28, [fleet] (EXIT 34 files, ERR 0), [inst] (8/17) | P0: every temp file and installer; check: SC2064, SC3047, SC3048, SC3049; grep `mktemp` with no `trap` in the file | SH-ERR |
| M-B-13 | `exit` inside `$( )` or a pipeline stage leaves only the subshell. How does `die` actually stop the script (the EXIT-02 mechanism)? | posix,bash | partial (rust cli-contract EXIT-02) · [cfg] §4 | P1 | SH-ERR |
| M-B-14 | What status does `exit` inside a trap use (bash 5.3 interp 1602, yash 2.59, zsh 5.10 draft)? | posix,bash,zsh | uncovered · [shift] #21 | P2 | SH-ERR |
| M-B-15 | Do diagnostics go to stderr and data to stdout (CLI-01), and what is the standard `die`/`warn` helper? | any | partial (rust cli-contract CLI-01) · [cfg] §4, [cod] §1 | P1 | SH-ERR |
| M-B-16 | Is `cmd1 && cmd2 \|\| cmd3` ever an if-then-else (BashPitfalls #22)? | any | uncovered · [cod] §6 | P2: SC2015 | SH-ERR |
| M-B-17 | Does a sourced library that sets `-e` break its caller, and how do libraries probe and restore (`${-#*e}`, `nvm.sh:3877-3905`)? | bash,zsh | uncovered · [ex] | P1 | SH-ERR |
| M-B-18 | What does `IFS=$'\n\t'` in a strict prologue buy, given that later templates dropped it and the fleet rule mandates it? | bash | uncovered · [prac], [cfg] §5 | P1: conflict 11 | SH-ERR |
| M-B-19 | Which `shopt` options belong in a hardened bash prologue (`inherit_errexit` 4.4, `lastpipe` 4.2, `nullglob`/`failglob`), and which are missing on 3.2? | bash | uncovered · [fail] #49 | P2 | SH-ERR |

### C. Quoting and expansion → `shell-quality/expansion.md` (SH-EXP)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-C-01 | When is an unquoted expansion a bug, and what are the sanctioned splitting idioms (arrays, `set --`, `${x:+"…"}`, `set -f`)? | any | uncovered · [fail] §1 (12 of 65 pitfalls), [ex] (SC2086 4,387), [fleet] #7 | P0: top bug class; check: SC2086, SC2046, SC2068, SC2048 at default severity (conflict 4) | SH-EXP |
| M-C-02 | How is a command line built from parts: a bash array, POSIX `set --`, or a string plus `eval` (never)? | bash,posix | uncovered · [cod] #19, [prac] | P0: check SC2206, SC2207, SC2294 plus grep `eval ` | SH-EXP |
| M-C-03 | How are hostile filenames handled (leading `-`: `--` and `./*`; newlines: `find -print0 \| xargs -0`, `-exec {} +`; never parse `ls`)? | any,userland | uncovered · [fail] #10, [cod] #20 | P0: check SC2035, SC2010, SC2012, SC2038, SC2044, SC2045 | SH-EXP |
| M-C-04 | `echo` or `printf`: which `echo` forms are portable, given that 4 of 8 shells interpret `\t` in plain `echo` and yash prints `-n`? | posix | uncovered · [fail] #9, [cod] q1 | P0: conflict 19; check SC3036/SC3037 in sh, SC2028; grep `echo -[en]` | SH-EXP |
| M-C-05 | Is a variable ever allowed in a `printf` format string, and when is `%b` right? (Positional `%2$s` works only in ksh93 and zsh.) | posix | uncovered · [canon], [cod] §2 | P1: SC2059 | SH-EXP |
| M-C-06 | How is input read: `IFS= read -r`, `-d ''` (bash only; dash 0.5.12 lacks `read -d`), stdin theft by `ssh`/`ffmpeg` in loops, and the bash 5.0-5.2 multibyte `read -d ''` bug? | posix,bash | uncovered · [fail] #47, [prac] | P1: SC2162 | SH-EXP |
| M-C-07 | What survives a pipeline: `cmd \| while read` loses variables (except ksh93's last stage); `lastpipe` 4.2+; `< <()` bash only; here-doc or temp file in sh? | bash,posix,ksh | uncovered · [cod] #18, [fail] #46 | P1: SC2030, SC2031 | SH-EXP |
| M-C-08 | Which `test` operators are portable (`==` fails in dash/posh; `-a/-o` removed in 2024; `-v` 4.2; `<` is lexicographic; `=~` quoting; busybox `[[` has no glob match)? | posix,bash | uncovered · [cod] #22 | P1: SC3014, SC2166, SC2076, SC2330 | SH-EXP |
| M-C-09 | `[[ ]]` vs `[ ]`: decided by dialect, not style (the fleet rule's ban on `[ ]` in bash is overturned)? | bash,posix | uncovered · [cfg] §5, [cod] contested | P1: conflict 11 | SH-EXP |
| M-C-10 | Which shell arithmetic is portable: octal `010` (8, but 10 in mksh/ksh93), `08` errors, `10#` missing in dash/yash, 64-bit wrap vs mksh 32-bit vs ksh93 float, `**` missing in dash? | posix,bash,ksh | uncovered · [cod] q1, [fail] §9 | P1 (measured, 11 shells) | SH-EXP |
| M-C-11 | How are here-docs written for literal text and for generated code (quoted delimiter, `<<-` tab rule, `$'..'` in here-docs)? | posix,emitter | uncovered · [prac], [shift] #50 | P1 | SH-EXP |
| M-C-12 | Command substitution strips trailing newlines; `$(<file)` is bash/ksh only. When is the `printf x` sentinel needed? | posix | uncovered · [fail] #41 | P2 | SH-EXP |
| M-C-13 | What does an unmatched glob do: stays literal (sh, bash), aborts (zsh `nomatch`), vanishes (`nullglob`)? | posix,bash,zsh | uncovered · [fail] §11, [cfg] §3.3 | P1 | SH-EXP |
| M-C-14 | `{1..3}` under `#!/bin/sh` runs once with the literal word in 7 of 11 shells ([inst] K3S:408). Is brace expansion banned in sh? | posix | uncovered · [inst] | P1: SC3009 | SH-EXP |
| M-C-15 | Tilde inside quotes (`"~"`, `export foo=~/bar`) and history expansion of `!` in interactive bash? | any | uncovered · [fail] §1 | P3 | SH-EXP |
| M-C-16 | `$*` vs `"$@"`, `$@` in an assignment, and `"${@}"` under `set -u` with no arguments on bash 3.2? | bash | uncovered · [cod] §1, [canon] | P1: SC2048, SC2124 | SH-EXP |
| M-C-17 | Which variable names collide with shell specials (`path` tied to `PATH` and read-only `status` in zsh; UPPER_CASE environment names)? | any,zsh | uncovered · [fail] §11 | P2 | SH-EXP |
| M-C-18 | `${var}` bracing everywhere, `$(…)` over backticks: rules or style? | any | uncovered · [cod] contested | P3: style; backticks only SC2006 | SH-EXP |
| M-C-19 | How is option parsing written: `getopts` (POSIX, no long options), not GNU `getopt --long` (missing on macOS and busybox), or a manual `case` loop with `--`? | posix,userland | uncovered · [cod] #29, [prac] | P1: grep `\bgetopt ` | SH-EXP |
| M-C-20 | What do concurrency patterns need (`xargs -P` interleaving, `wait -n` 4.3+, `wait` status of background jobs)? | any | uncovered · [fail] #50 | P2: SC2156 | SH-EXP |
| M-C-21 | Which string operations exist in sh (`${x#}` and `${x%}` yes; `${x//}`, `${x:0:1}`, `${x,,}` not in dash or posh)? | posix | uncovered · [fail] §9 | P1: SC3057, SC3059, SC3060 | SH-EXP |
| M-C-22 | How does quoting survive extra parsers (`ssh host cmd`, `docker exec`, `bash -c`, `sudo sh -c`, YAML), given that QuoteBench lost 55-73 points through one added parser? | any,emitter | uncovered · [fail] #39 | P1: heuristic "count the parsers between author and exec"; SC2029 | SH-EXP |

### D. Userland and environment → `shell-quality/userland.md` (SH-USER)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-D-01 | Which GNU-only flags must a portable script avoid or probe: `sed -i` (BSD needs a suffix), `readlink -f` (macOS 12.3+), `date -d`, `stat -c`, `grep -P`, `xargs -r` (no-op on macOS), `sort -V`, `find -printf`, `cp --parents`? | userland | uncovered · [fail] #21, [plat] | P0: ShellCheck flags 0 of 16 (measured); check: grep denylist | SH-USER |
| M-D-02 | Which commands are universal on Linux images (`readlink -f`, `realpath`, `mktemp -d`, `sha256sum`, `date -d`, `stat -c`: 21/21) and which are often missing (`shasum` 0/21, `which` absent on 7, `tar` absent on AL2/AL2023, neither curl nor wget on 9)? | userland | uncovered · [plat] (21 images, 2026-10-10) | P0: check: `command -v` probe before each optional tool; the table cites images | SH-USER |
| M-D-03 | Which busybox 1.37 applet gaps bite (`grep --include`, `grep -P`, `find -printf`, `sed -z`, wget `--secure-protocol`)? | userland | uncovered · [cfg] §3.3, [inst] | P1 | SH-USER |
| M-D-04 | What must scripts not depend on under uutils 0.10.0 (Ubuntu 25.10+): `--version` banners, collation without an installed locale, error-message text? | userland | uncovered · [shift] §12, [plat] | P1 (dated): heuristic "never parse tool stderr or banners" | SH-USER |
| M-D-05 | Must order-sensitive `sort`, `comm`, `join`, globs and `tr` ranges set `LC_ALL=C` (LANG unset in 20/21 images; GNU and uutils collate differently)? | userland,posix | uncovered · [shift] #14, [fail] #16 | P0: generated-file determinism; check: grep `sort` without `LC_ALL=C` in scripts that write committed or hashed output | SH-USER |
| M-D-06 | What is the temp-file contract: `mktemp -d` (not POSIX, but 21/21 Linux and macOS), `trap` cleanup, Debian 13 tmpfs `/tmp` (size; cross-filesystem `mv` is not atomic)? | posix,userland | uncovered · [cod] #27, [shift] #46 | P0: check: grep literal `/tmp/` paths, and `mktemp` without `trap` | SH-USER |
| M-D-07 | How are atomic replacement and locking done portably (`mv` on the same filesystem, `mkdir` lock, no `flock` on macOS)? | posix,userland | uncovered · [cod] #36, [fail] #19 | P2 | SH-USER |
| M-D-08 | Which command lookup is portable and safe: `command -v`, not `which` (absent on 7 images; SC2230 optional); `type -P` bash only; NULL `PATH` means `.` in bash 5.3? | posix,security | uncovered · [fail] #20, [cod] §3 | P0: check `shellcheck -o deprecate-which` (SC2230) or grep `\bwhich ` | SH-USER |
| M-D-09 | Which checksum tool where (`sha256sum` on Linux and busybox, `shasum -a 256` on macOS, `Get-FileHash`), and how is it probed? | userland,installer | uncovered · [inst], [fleet] Axis 5 | P1 | SH-USER |
| M-D-10 | Which awk features are safe given mawk on Debian/Ubuntu (no `gensub`, no `length(array)` guarantees)? | userland | uncovered · [plat] | P2 | SH-USER |
| M-D-11 | How are dates and timestamps produced portably (no `date -d` on macOS/BSD; `%s` is not POSIX)? | userland | uncovered · [plat] | P2 | SH-USER |
| M-D-12 | What replaces `timeout`, `flock` and `realpath` where macOS lacks them? | userland | uncovered · [plat] | P2: read only | SH-USER |
| M-D-13 | Which Git Bash / MSYS behaviours break scripts: `cmd /c` path conversion (hangs), `//c`, `MSYS_NO_PATHCONV`, `ln -s` making copies, CRLF from native tools, a case-insensitive filesystem? | userland,ci | uncovered · [fail] §16 | P1 (Git Bash 5.2.15, measured on the host) | SH-USER |
| M-D-14 | Which userland matrix is the oracle (deb12, deb13, ubuntu 24.04 and 26.04, alpine 3.22, AL2023, `bash:3.2`, plus the read-only macOS list)? | userland,testing | uncovered · [plat] | P1 | SH-USER |
| M-D-15 | Do sudo-rs (Ubuntu 25.10+) and GNU sudo differ in the flags installers use (`-n`, `-E`, `-S`)? | userland,installer | uncovered · [shift] #15 | P3: release-note evidence only | SH-USER |
| M-D-16 | Which `tar` and `unzip` forms are portable (GNU vs bsdtar; `--exclude-vcs`; unzip often absent)? | userland | uncovered · [fail] §3 | P2 | SH-USER |
| M-D-17 | Which environment variables may a script rely on (`HOME`; `USER` unset in containers; `TMPDIR`; `XDG_*`; `$HOSTNAME` bash only)? | posix | uncovered · [cod] §5 | P2 | SH-USER |

### E. Security → `shell-quality/security.md` (SH-SEC)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-E-01 | How do destructive commands guard against an empty or wrong variable (`${VAR:?}`, a checked `cd`, `--`, never `rm -rf "$x/"*`), given the Steam and Bumblebee incidents? | any,security | uncovered · [fail] #11 | P0: highest damage; check SC2115, SC2164, SC2086; grep `rm -rf "\$` | SH-SEC |
| M-E-02 | How is shell-out injection prevented: argv arrays, no command strings, no `eval` (SC2294), no `sh -c "$x"`, `ssh host "$cmd"` (SC2029), `find -exec sh -c '{}'` (SC2156)? | any,security | partial (python processes.md, swift security.md, other languages) · [cod] #30 | P0: check SC2029, SC2156, SC2294 plus grep `eval \|sh -c "` | SH-SEC |
| M-E-03 | How is untrusted input kept out of arithmetic and subscripts (`a[$(cmd)]` executes in `$(( ))`, `[[ -eq ]]`, `(( ))`)? Is it validated with `case` first? | bash,security | uncovered · [fail] #41, shellcheck#2679, [prac] | P1: heuristic "untrusted value passes a `case *[!0-9]*` check before arithmetic" | SH-SEC |
| M-E-04 | How are secrets handled: never on argv (visible in `ps`), no `set -x` near them, files or stdin over environment where possible? | any,security | uncovered · [prac] T49 | P1: grep `set -x` in files that read token variables | SH-SEC |
| M-E-05 | Which environment imports change behaviour (`BASH_ENV`, `ENV`, `POSIXLY_CORRECT`, exported `BASH_FUNC_*%%`)? | bash,security | uncovered · [fail] #44, [cod] §10 | P2 | SH-SEC |
| M-E-06 | How is PATH hijack avoided (relative or empty PATH entries; NULL PATH is `.` in 5.3; `command -p`)? | posix,security | uncovered · [shift] #8 | P2 | SH-SEC |
| M-E-07 | Is a config file ever `source`d or `eval`ed when someone else can write it, or is it parsed with `case`? | any,security | uncovered · [prac] T47 | P1 | SH-SEC |
| M-E-08 | Do `.*` globs (`rm -rf .*`) still match `.` and `..` (bash before 5.2, other shells)? | bash,posix,security | uncovered · [shift] #6 | P1 | SH-SEC |

### F. Gates and file hygiene → `shell-quality/gates.md` (SH-GATE)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-F-01 | What is the gate of record per family: shellcheck plus `shfmt -d` (sh/bash/ksh/bats); `zsh -n` plus `shfmt -ln zsh`; `fish --no-execute`; a `nu --ide-check` wrapper (`nu-check` exits 0); `elvish -compileonly`; pwsh `Parser::ParseFile` plus PSSA? | lint-format | uncovered · [cod] §7, [inst] (55/55 planted errors), [fleet] | P0: check: each command watched red on a planted parse error | SH-GATE |
| M-F-02 | Which ShellCheck profile ships: default severity (never `-S warning`), the three enabled optional checks, `external-sources=true`, `source-path=SCRIPTDIR`? | lint-format | uncovered · [cod] #5-6, [fleet] (ocx shell.taskfile.yml:38) | P0: conflict 4; check: `.shellcheckrc` content plus grep the gate for `-S warning` | SH-GATE |
| M-F-03 | Which SC codes may be relaxed, how, and must every directive carry a reason (1,185 directives, 12.5% justified)? | lint-format | uncovered · [ex] | P0: check: grep `shellcheck disable=` lines with no trailing `#` reason | SH-GATE |
| M-F-04 | Which ShellCheck version does the gate pin (0.9.0 on ubuntu-24.04, 0.10.0 Debian 13, 0.11.0 Ubuntu 26.04), and which SC3xxx are false positives for POSIX.1-2024 targets? | lint-format,ci | uncovered · [shift] #23, [cod] #9 | P1 (dated) | SH-GATE |
| M-F-05 | How are stale suppressions found (SC2039 retired in 0.7.2 but in rustup-init.sh:3; SC2230 now optional; SC2002 off; SC3013 removed)? | lint-format | uncovered · [cod] #8 | P2 | SH-GATE |
| M-F-06 | How does the gate find every shell file? `git ls-files '*.sh'` misses `.bash`, `.bats` and extensionless hooks; `shfmt -f` and `--detect` (3.14) find shebangs. | lint-format,ci | uncovered · [fleet] (gate gaps), [cod] #4 | P0: check: diff of `shfmt -f .` against the gate's file list is empty | SH-GATE |
| M-F-07 | Does the gate fail loudly when a tool is missing (grimoire's gate prints "skipping" and exits 0)? | lint-format,ci | uncovered · [cfg] §6 | P0: check: run the gate with shellcheck off PATH; non-zero exit watched red | SH-GATE |
| M-F-08 | What is the shfmt style of record, and where does it live (`.editorconfig`, since flags override it)? | lint-format | uncovered · [fleet] #8, [ex], [cod] #11 | P1: conflict 5, owner Q3 | SH-GATE |
| M-F-09 | How does shfmt pick a dialect (`.sh` implies posix unless the shebang says otherwise; `-ln bats`; `-ln zsh` from 3.13.0), and which version floor does the gate need (3.13 for the `-l` exit code)? | lint-format | uncovered · [cod] #10, [shift] #25 | P1 | SH-GATE |
| M-F-10 | How are CRLF and BOM caught (`#!/bin/sh` with a CR gives exit 127; a CRLF body runs a prefix and then dies; a BOM makes line 1 "not found" and the rest runs)? | any | uncovered · [fail] #13, [shift] §15 | P0: check SC1017, SC1082; grep for CR bytes; `head -c3 \| od` for `ef bb bf`; `.gitattributes` `*.sh text eol=lf` | SH-GATE |
| M-F-11 | Are scripts with a shebang executable in git (93 of 186 are 100644), and are libraries without a shebang non-executable? | any | uncovered · [fleet] | P1: check `git ls-files -s` mode vs line 1 | SH-GATE |
| M-F-12 | Must scripts be ASCII-only (non-ASCII in 21 of 31 sh scripts; yash fails in the C locale; installers must be ASCII)? | posix,installer | uncovered · [fleet], [inst] | P1: `LC_ALL=C grep -n '[^ -~[:space:]]'` | SH-GATE |
| M-F-13 | How is shell embedded in other files linted (workflow `run:` via actionlint's shellcheck; Taskfile cmds; fenced doc blocks)? | lint-format,ci | uncovered · [cfg] §2.3 | P1 | SH-GATE |
| M-F-14 | How are sourced libraries marked (no shebang, `# shellcheck shell=…`, not executable, `source-path`)? | bash,lint-format | uncovered · [fleet] #5 (11 without shebang) | P2 | SH-GATE |
| M-F-15 | Are `checkbashisms` or `posh` worth running as secondary checks? | posix,lint-format | uncovered · [cod] §5 | P3 | SH-GATE |
| M-F-16 | Should the gate run in a pre-commit or lefthook hook (0 in the fleet)? | lint-format | uncovered · [cfg] §6 | P3 | SH-GATE |

### G. Testing → `shell-quality/testing.md` (SH-TEST)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-G-01 | Which framework per dialect: bats-core 1.14.0 for bash (matrix 3.2.57-5.2), shellspec or shunit2 for POSIX (shellspec's last release is 2024-09), or plain matrix scripts? | testing | uncovered · [cod] #45, [ex] | P1 | SH-TEST |
| M-G-02 | How can a shell test pass without testing anything (`! cmd` in bats before `run !`, `[[ ]]` on bash < 4.1, `run` swallowing `set -e` before 1.14.0, an empty suite exiting 0)? | testing | uncovered · [fail] #38 | P0: check: plant a failing assertion; the suite must go red | SH-TEST |
| M-G-03 | What did bats 1.14.0 change (`run` honours `set -e`; empty suite is an error), and which version do distros ship (Debian 13 1.11.1, Ubuntu 26.04 1.13.0)? | testing | uncovered · [shift] #27 | P1 (dated) | SH-TEST |
| M-G-04 | How do scripts run across the interpreter matrix in CI (`bash:3.2`…`5.3` images, dash deb12/deb13, alpine busybox, a macOS runner)? | testing,ci | uncovered · [plat], [shift] #28 | P1 | SH-TEST |
| M-G-05 | What test hatches do installers expose (`__OCX_TESTING_INSTALL_BINARY`, offline fixture servers, `server.bash`)? | testing,installer | uncovered · [inst] | P2 | SH-TEST |
| M-G-06 | Are the fleet's `.bats` files (10 files, 1,997 lines) inside the gate (shellcheck parses bats; `shfmt -ln bats`)? | testing,lint-format | uncovered · [fleet] | P1 | SH-TEST |
| M-G-07 | Is shell coverage worth measuring (kcov handles bash only)? | testing | uncovered · [cod] §7 | P3 | SH-TEST |
| M-G-08 | How is formatter drift in test fixtures handled (bats pins shfmt 3.5.1; 48 files dirty under 3.13.1)? | lint-format | uncovered · [ex] | P3 | SH-TEST |

### H. CI shells → `shell-quality/ci.md` (SH-CI)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-H-01 | What does each GHA `run:` get per OS (unspecified: `bash -e {0}`, no pipefail; `shell: bash`: `--noprofile --norc -eo pipefail`; Windows: pwsh with the `Stop` prelude and `LASTEXITCODE` epilogue; `cmd`: no fail-fast), and what must be written explicitly? | ci | partial (bazel ci.md, python ci-gate.md) · [plat], [fail] §7, [fleet] #11 | P0: 82% of fleet blocks on the default shell; check: grep `run:` blocks containing `\|` with no `shell: bash` and no `defaults.run.shell` | SH-CI |
| M-H-02 | Does every `${{ }}` that reaches a `run:` go through `env:`, and are `$GITHUB_ENV`/`$GITHUB_OUTPUT` multiline delimiters safe? | ci,security | uncovered · [fail] #36, [fleet] (test-installers.yml:206-207) | P0: check: grep `\$\{\{ *(github\.event\|inputs\.\|github\.head_ref)` inside `run:`; actionlint | SH-CI |
| M-H-03 | A native failure mid-script in a pwsh step is invisible (5.1 and 7.6.6). Is `$PSNativeCommandUseErrorActionPreference = $true` (7.4+) or a per-call `$LASTEXITCODE` check required? | ci,pwsh | uncovered · [plat], [fleet] | P0: check: grep pwsh `run:` blocks with more than one native call and neither guard | SH-CI |
| M-H-04 | What changes for fleet workflows when `ubuntu-latest` becomes 26.04 (2026-10-19 to 2026-11-19): bash 5.3.9, dash with pipefail, uutils, ShellCheck 0.11? | ci | uncovered · [shift] #11 | P1: time-boxed | SH-CI |
| M-H-05 | macOS runners run bash 3.2.57 with no Homebrew bash first. Does a Linux-only CI miss every 3.2 break? | ci,bash | uncovered · [plat] | P1 | SH-CI |
| M-H-06 | On Windows runners, `shell: bash` is Git Bash 5.3.15. What does MSYS path conversion do to `run:` steps? | ci | uncovered · [plat], [fail] §16 | P1 | SH-CI |
| M-H-07 | Which shell features work in Taskfile `cmds` (mvdan/sh in task 3.53.1: errexit on, pipefail off; breaks `printf -v`, `PIPESTATUS`, `BASH_VERSION`, `read -p`; panics on an assoc key containing `-`)? | ci | uncovered · [fleet] #12, [fail] #37, [shift] #26 | P1 | SH-CI |
| M-H-08 | When does an inline `run:` block move into a script file (length, shellcheck reach, local reproducibility)? | ci | uncovered · [prac] | P2 | SH-CI |
| M-H-09 | How are `$GITHUB_PATH` and `$GITHUB_ENV` written safely? | ci | uncovered · [cfg] gap 12 | P2 | SH-CI |
| M-H-10 | Is actionlint (which runs shellcheck on `run:` and honours `shell:`) part of the gate? | ci,lint-format | uncovered · [cfg] §2.3 | P1 | SH-CI |
| M-H-11 | Composite-action `run` steps require `shell:`. Which value? | ci | uncovered · [plat] | P3 | SH-CI |

### I. zsh → `shell-quality/zsh.md` (SH-ZSH)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-I-01 | What breaks when bash code runs or is sourced in zsh (no word splitting, 1-based arrays, `path` tied to PATH, `nomatch`, read-only `status`, `pipestatus` not `PIPESTATUS`, `read -a` invalid)? | zsh | uncovered · [fail] §11, [canon] | P1: check `zsh -n` plus the plant run on zsh 5.0.8 and 5.9 | SH-ZSH |
| M-I-02 | How does a zsh script declare itself (`emulate -L zsh`, `setopt err_return`/`err_exit`, `local_options`)? | zsh | uncovered · [canon] | P1 | SH-ZSH |
| M-I-03 | Which startup file gets what (`.zshenv` minimal, `.zprofile`, `.zshrc`; macOS login shells; p10k instant prompt; the `emulate sh -c 'source ~/.profile'` bridge)? | zsh,emitter | uncovered · [prac], [shift] #51 | P1 | SH-ZSH |
| M-I-04 | `set -e; ! false \| true` exits on zsh 5.0.8; unreleased 5.10 refines ERR_EXIT. What may a zsh script assume? | zsh | uncovered · [canon], [shift] §6 | P2 | SH-ZSH |
| M-I-05 | How far does `shfmt -ln zsh` (3.13.0+, "far enough for many use cases") get on real zsh files? | zsh,lint-format | uncovered · [cod] §4 | P2 | SH-ZSH |
| M-I-06 | Is zsh ever a CI shell, or `/bin/sh` through emulation? | zsh | uncovered · [plat] | P3 | SH-ZSH |

### J. fish → `shell-quality/fish.md` (SH-FISH)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-J-01 | Which fish 3.6→4.9 changes break stored or emitted code (`?` stops globbing in 4.0, `{ }` compound in 4.1, `bind -k` removed, for-loop locals, `status=123` errors in 4.9), with distros on 3.6.0 / 4.0.2 / 4.2.1? | fish | uncovered · [fail] #26, [shift] #29, [emit] | P1: check `fish --no-execute` plus a run on 3.6.0 and 4.9.3 | SH-FISH |
| M-J-02 | How is a value quoted for fish (single quotes escape only `\'` and `\\`; a trailing backslash corrupts; `string escape`)? | fish,emitter | uncovered · [emit] | P1: round trip through `matrix.sh fish` | SH-FISH |
| M-J-03 | Where does emitted or installed fish config live (`conf.d/*.fish` vs `config.fish`; 4.3 frozen theme files; `__fish_initialized` removed in 4.8)? | fish,installer | uncovered · [shift] #31, [ocx] | P1 | SH-FISH |
| M-J-04 | How does fish report errors without errexit (`$status`, `and`/`or`, `&&`/`\|\|` from 3.0)? | fish | uncovered · [prac] | P2 | SH-FISH |
| M-J-05 | How does fish code detect its version and feature flags (`$version`, `status features`)? | fish | uncovered · [shift] #30 | P2 | SH-FISH |
| M-J-06 | Which event handlers serve as hooks (`--on-event fish_prompt`, `--on-variable PWD`, `fish_exit`)? | fish,emitter | uncovered · [ocx] (hook.rs:320-345) | P2 | SH-FISH |
| M-J-07 | How is fish code tested (littlecheck `tests/checks`, the `fish --no-execute` gate)? | fish,testing | uncovered · [cod] §7 | P3 | SH-FISH |

### K. nushell → `shell-quality/nushell.md` (SH-NU)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-K-01 | Which nu removals and renames break generated code from 0.80 to 0.116.1 (`let-env`, `def-env`, `date format`, `fetch`, `$nu.home-path`→`home-dir` in 0.110, `str upcase` deprecated in 0.114, `into value`→`detect type` in 0.108, implicit submodule import gone in 0.114, `def run` rejected in 0.116)? | nu | uncovered · [fail] #27, [shift] #32, [emit] | P0: agents emit 2024-era nu; check: `nu --ide-check` wrapper on 0.105.1 and 0.116.1 | SH-NU |
| M-K-02 | One parse error aborts a whole nu file. How is emitted nu structured (a version guard, separate autoload files)? | nu,emitter | uncovered · [shift] #33, [ocx] | P1 | SH-NU |
| M-K-03 | A removed internal command can fall through to an external binary (`"abc" \| size` ran `/usr/sbin/size`). How is that caught? | nu | uncovered · [fail] §13 | P1 | SH-NU |
| M-K-04 | Where does emitted nu live (vendor vs user autoload dirs from 0.102; `env.nu` vs `config.nu`; `env_change` before `pre_prompt` from 0.107; `PROMPT_*` not inherited from 0.103)? | nu,emitter,installer | uncovered · [shift] #34, [ocx] (profiles.rs:122-131) | P1 | SH-NU |
| M-K-05 | Which nu range does emitted code support, given 12 minor releases in 16 months and no 1.0 date? | nu | uncovered · [shift] #35, [ex] | P1 | SH-NU |
| M-K-06 | How does nu handle errors (`try`/`catch`, `error make` labels from 0.110, `complete` for external exit codes, pipefail default from 0.111)? | nu | uncovered · [canon] | P2 | SH-NU |
| M-K-07 | `&&` is unsupported in nu (`;` or `and`). Where do agents emit it? | nu | uncovered · [fail] §13 | P2 | SH-NU |

### L. elvish → `shell-quality/elvish.md` (SH-ELV)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-L-01 | What can emitted elvish assume (0.21.0, latest since 2024-08-14; `a=b cmd`, `except`, `eawk`, `float64`, `~/.elvish` removed; implicit `cd` deprecated)? | elvish | uncovered · [fail] #29, [shift] #36 | P2: check `elvish -compileonly` | SH-ELV |
| M-L-02 | How is a re-sourced elvish rc kept idempotent (direnv and mise are unguarded)? | elvish,emitter | uncovered · [emit], [ocx] | P2 | SH-ELV |
| M-L-03 | Which `elvish -compileonly` false positives (`edit:` in non-interactive mode) does the gate tolerate? | elvish,lint-format | uncovered · [ex] | P3 | SH-ELV |

### M. Multi-shell emission → `shell-quality/emit.md` (SH-EMIT)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-M-01 | Why one quoter per target and per quoting context: a shared POSIX quoter fails 17-18 of 20 hostile cases on fish/nu/elvish, while hand-written per-shell quoters pass 20/20? | emitter | uncovered · [emit], [ocx] (per-context escapers) | P0: check: hostile-corpus round trip through `matrix.sh` for each target | SH-EMIT |
| M-M-02 | Must PowerShell single-quote escaping double U+2018, U+2019, U+201A and U+201B as well as U+0027? (Curly quotes close the literal, which is code execution on pwsh 7.4, 7.6.6 and WinPS 5.1.) | emitter,pwsh,security | uncovered · [ocx] (ocx@5de9d777eb7d:crates/ocx_shell/src/shell/escape.rs:35; direnv shell_pwsh.go:169, starship mod.rs:46-48, mise pwsh.rs:408-412, zoxide) | P0: check: corpus case of U+2019 followed by `;Write-Output PWNED;` round trip | SH-EMIT |
| M-M-03 | What hostile corpus must every emitter test include (quote, `$`, backtick, backslash, trailing backslash, newline, `%`, `!`, non-ASCII, leading `-`, curly quotes, empty, NUL rejected)? | emitter,testing | uncovered · [emit] (20 cases), [frame] H3 | P0: check: corpus present in the emitter's tests, all targets green | SH-EMIT |
| M-M-04 | When is a value passed as data (nu `load-env` from JSON, environment variables, a file) instead of string-built code? | emitter | uncovered · [ocx], [emit] | P1 | SH-EMIT |
| M-M-05 | Is `$'..'` ever emitted for sh targets (literal on dash, yash and posh: 1/20)? | emitter,posix | uncovered · [emit] | P0: check: grep emitter templates for dollar-single-quote on sh targets | SH-EMIT |
| M-M-06 | Which rc or profile file does an emitter target per shell (bash `.bashrc` plus `.bash_profile`/`.bash_login`/`.profile` order; ocx never targets `.bash_login`, profiles.rs:138-152; zsh; fish `conf.d`; nu autoload; pwsh `$PROFILE.CurrentUserAllHosts` probed live)? | emitter,installer | uncovered · [ocx], [inst] | P1 | SH-EMIT |
| M-M-07 | Is an rc edit idempotent (marker block, grep guard, trailing-newline repair: `nvm install.sh:484,493`)? | emitter,installer | uncovered · [fail] #42 | P0: check: run twice; the rc diff is empty | SH-EMIT |
| M-M-08 | Does an rc rewrite keep a symlinked rc a symlink (ocx's rename replaces it, `ocx_util/src/fs.rs:236`) and keep its mode (silently 0600, `fs.rs:244-249`)? | emitter,installer | uncovered · [ocx] | P1: check: planted symlinked 0644 `.bashrc` survives | SH-EMIT |
| M-M-09 | How is a hook appended without clobbering (`PROMPT_COMMAND` string vs array, where the array is inert on bash 3.2-5.0; zsh `precmd_functions`; fish events; nu `env_change` append; pwsh prompt wrap with clobber detection)? | emitter | uncovered · [emit] (omp 16-18 of 50 scenarios), [ocx] (hook.rs) | P1 | SH-EMIT |
| M-M-10 | Is `source <(cmd)` ever emitted (fails on bash 3.2/4.0 and in POSIX mode before 5.1)? What replaces it (`eval "$(cmd)"`, a stub)? | emitter,bash | uncovered · [emit] | P1: grep `source <(` | SH-EMIT |
| M-M-11 | Is emitted code version-guarded for churny targets, and tested on the oldest and newest interpreter? | emitter | uncovered · [ocx] (floor: 0 failures), [emit] | P1 | SH-EMIT |
| M-M-12 | Do launcher scripts `exec "$@"` with no re-quoting, and validate embedded strings (LauncherSafeString)? | emitter | uncovered · [ocx] | P2 | SH-EMIT |
| M-M-13 | Does a quoted pattern inside `${l%%"$p"*}` behave on posh (ocx `shell.rs:294-299, 398-412`)? | emitter,posix | uncovered · [ocx] | P2 | SH-EMIT |
| M-M-14 | How does emitted pwsh set a variable to empty vs unset it (`$env:X=''` removes it on 7.4.7 and 5.1, keeps it on 7.6.6)? | emitter,pwsh | uncovered · [emit] | P1 | SH-EMIT |
| M-M-15 | How is non-ASCII emitted for 5.1 (OEM code page on a native pipe; `[char]0xE9`)? | emitter,pwsh | uncovered · [emit] | P1 | SH-EMIT |
| M-M-16 | Does every emitted change have an undo (ocx's prompt wrap has no live uninstall)? | emitter | uncovered · [ocx] | P2 | SH-EMIT |
| M-M-17 | How are completions registered per shell (bash-completion dir, zsh `fpath`/`compdef`, fish completions dir, nu external completer, pwsh `Register-ArgumentCompleter -NativeFallback` from 7.6)? | emitter | partial (rust cli-contract CLI-14) · [cfg] §4, [canon] | P2 | SH-EMIT |
| M-M-18 | Is there a parity test proving every `Shell` arm has the same semantics (PARITY_ARMS, `shell.rs:2886-2917`)? | emitter,testing | uncovered · [ocx] | P2 | SH-EMIT |
| M-M-19 | Are path-list separators and list types right per target (`:` vs `;`, nu lists)? | emitter | uncovered · [emit] | P2 | SH-EMIT |
| M-M-20 | Does sourcing an rc snippet twice leave one copy of each hook? | emitter | uncovered · [emit] | P2 | SH-EMIT |

### N. Installers → `shell-quality/installers.md` (SH-INST)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-N-01 | Is all code in functions with `main "$@"` as the last line, so a truncated download runs nothing (rustup-init.sh:931; 10 of 17 installers)? | installer | uncovered · [inst], [fail] #12 | P0: check: the last non-comment line is the main call | SH-INST |
| M-N-02 | Is the payload verified (SHA-256) before it is executed or extracted, and where does the checksum come from (9 of 17 have none; grimoire's front door claims a check its cargo-dist 0.33.0 template lacks)? | installer,security | uncovered · [inst] | P0: check: grep for a hash comparison between download and extract | SH-INST |
| M-N-03 | Are TLS and download flags used only after a capability probe (busybox wget rejects `--secure-protocol`, rc=3, `www-setup/src/install.sh:352-354`; rustup `check_help_for`; cargo-dist omits TLS flags)? | installer,userland | uncovered · [inst] | P0: check: run the installer in `alpine:3.22` with only busybox wget | SH-INST |
| M-N-04 | Does platform detection fail loudly (OS/arch map, musl via ldd then `/lib/ld-musl` then `/etc/alpine-release`, Rosetta via `sysctl`), with no silent fallthrough (deno and oras get 12 of 26 cells wrong; cargo-dist Rosetta precedence)? | installer | uncovered · [inst] | P0: check: stubbed `uname -s/-m` matrix gives the expected target or an explicit error | SH-INST |
| M-N-05 | Which exit taxonomy does an installer document (0-7, usage = 2; 1 of 17 have one)? | installer | uncovered · [inst] | P1: owner Q6 | SH-INST |
| M-N-06 | Do prompts read `/dev/tty` when stdin is the pipe, with a non-interactive default? | installer | uncovered · [inst] | P1 | SH-INST |
| M-N-07 | Does the installer work without root (tool home, `~/.local/bin`), and edit PATH only with consent? | installer | uncovered · [frame], [inst] | P1 | SH-INST |
| M-N-08 | What test hatch does an installer expose for offline tests? | installer,testing | uncovered · [inst] | P2 | SH-INST |
| M-N-09 | What retry semantics does a download use (`curl --retry`, `--retry-connrefused` availability, a backoff loop)? | installer | uncovered · [inst] | P2 | SH-INST |
| M-N-10 | Generated (cargo-dist) or hand-written, and what must a generated installer be audited for (cargo-dist 0.33.0: no TLS flags, Rosetta bug, ps1 without hash)? | installer | uncovered · [inst] | P1 | SH-INST |
| M-N-11 | Does `"$@"` under `set -u` with no arguments break on posh? | installer,posix | uncovered · [inst] | P2 | SH-INST |
| M-N-12 | How is `latest` resolved (GitHub API rate limits, redirect URL parsing) vs a pinned version? | installer | uncovered · [inst] | P2 | SH-INST |

### O. Cross-cutting core → `shell-quality` index (SH-CORE)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-O-01 | The gate block (M-F-01 commands verbatim) and never-weaken (no new disable without a reason, no `\|\| true` to silence a failure). | any | partial (house CORE-01) · [cfg] §1.4 | P0: check: the gate commands themselves, watched red | SH-CORE |
| M-O-02 | Read-the-floor-first: find the script kind and floor header before editing. | any | uncovered · conflict 2 | P1 | SH-CORE |
| M-O-03 | The agent-tell grep set: `echo -e`, `which`, `function f()` in sh, `[[` in sh, dollar-single-quote in sh, `source <(`, unguarded pipefail in sh, `readlink -f`, `sed -i` without suffix, literal `/tmp/`, `eval`. | any | uncovered · [frame] H6, [fail] §18 | P0: check: the grep set, each pattern watched red on a plant | SH-CORE |
| M-O-04 | Do authored scripts carry an extension (6 authored extensionless files in the fleet), so the rule can load? | any | uncovered · [cfg] §2.4, [fleet] #3 | P1: conflict 7, owner Q8 | SH-CORE |
| M-O-05 | The routing table: which depth file for which task (writing an installer, emitting for N shells, editing a workflow, porting to macOS, a fish/nu/elvish file). | any | uncovered | P1 | SH-CORE |
| M-O-06 | The sibling map: code-docs (header comments), rust cli-contract (exit table), cmake CMK-CORE-05, nix/bazel CI notes, powershell-quality. | any | uncovered · [cfg] §3 | P1 | SH-CORE |
| M-O-07 | Watched-red and empty-output semantics for every grep check. | any | partial (house CORE-02, CORE-03) | P3 | SH-CORE |

### P. PowerShell compatibility → `powershell-quality/compat.md` (PS-COMPAT)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-P-01 | Which PowerShell does each script kind target (installer/bootstrap 5.1; repo and CI 7.6 LTS; modules dual-edition), and what does `#Requires` say? | pwsh | uncovered · [shift] #37, [frame] Q2 | P0: conflict 6; check: the `#Requires` line, plus a parse on the 5.1 host for 5.1 targets | PS-COMPAT |
| M-P-02 | Which 7-only syntax and variables break 5.1 (`&&`, `\|\|`, `?:`, `??`, `?.`, `-Parallel`, `-AsHashtable`, `Test-Json`, `$IsWindows`, leading-pipe continuation)? | pwsh | uncovered · [fail] #30, [shift] #38, [ex] (vcpkg) | P0: check: PSUseCompatibleSyntax with TargetVersions 5.1, plus `Parser::ParseFile` on WinPS 5.1 | PS-COMPAT |
| M-P-03 | What can PSUseCompatibleCommands and PSUseCompatibleTypes tell you when the profiles stop at 7.0, and what replaces them? | pwsh,lint-format | uncovered · [cod] #39 | P1 | PS-COMPAT |
| M-P-04 | How does a script detect the platform on both 5.1 and 7 (`$PSVersionTable.PSEdition`; `$IsWindows` is null on 5.1)? | pwsh | uncovered · [fail] §15 | P1 | PS-COMPAT |
| M-P-05 | Which 7.5/7.6 changes does older text get wrong (`ConvertTo-Json` BigInteger, `Join-Path -ChildPath string[]`, `Microsoft.PowerShell.ThreadJob`)? | pwsh | uncovered · [shift] #43 | P2 | PS-COMPAT |
| M-P-06 | Must 5.1 `Invoke-WebRequest` calls pass `-UseBasicParsing` (since 2025-12-09 it prompts and fails under `-NonInteractive`; 12 of 31 corpus files pass it)? | pwsh,installer | uncovered · [fail] #34, [ex] | P0: check: grep `Invoke-WebRequest\|iwr` without `-UseBasicParsing` in 5.1 targets | PS-COMPAT |
| M-P-07 | The 2.0 engine is removed (24H2, Server 2025). Do `powershell -Version 2` callers land on 5.1? | pwsh | uncovered · [shift] #52 | P3 | PS-COMPAT |
| M-P-08 | Which `Set-StrictMode` level works on both 5.1 and 7? | pwsh | uncovered · [prac] | P2 | PS-COMPAT |
| M-P-09 | Which .NET differences bite on 5.1 (TLS 1.2 must be set, `System.IO.Compression.ZipFile` assembly load)? | pwsh | uncovered · [inst] (PS kit) | P1 | PS-COMPAT |

### Q. PowerShell errors → `powershell-quality/errors.md` (PS-ERR)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-Q-01 | How does a failing native command fail the script on both 5.1 and 7? (`$ErrorActionPreference='Stop'` does not stop natives; `$PSNativeCommandUseErrorActionPreference` works on 7.3+ and does nothing on 5.1; an explicit `$LASTEXITCODE` check works everywhere.) | pwsh | uncovered · [fleet], [plat], [fail] #31 | P0: silent success; check: a planted mid-script native exit 3 fails the script on 5.1, 7.4 and 7.6 | PS-ERR |
| M-Q-02 | On 5.1, native stderr under `Stop` with `2>&1` throws (RemoteException); on 7.x it does not. Which form is safe on both? | pwsh | uncovered · [fail] §15 | P1 | PS-ERR |
| M-Q-03 | `exit` inside `irm \| iex` kills the host shell on all 3 engines (`www-setup/src/install.ps1:182, :734`). Is the safe form `$Global:LASTEXITCODE` plus `return`/`break` (scoop)? | pwsh,installer | uncovered · [inst] | P0: check: grep `\bexit\b` in iex-delivered scripts | PS-ERR |
| M-Q-04 | When do `try`/`catch`/`finally`, `-ErrorAction Stop` and terminating vs non-terminating errors apply, and how did `$?` change in 7? | pwsh | uncovered · [prac] | P1 | PS-ERR |
| M-Q-05 | Which exit code does a caller see for `powershell -File`, `-Command`, `pwsh -File` and the GHA wrapper? | pwsh,ci | uncovered · [plat] | P1 | PS-ERR |
| M-Q-06 | Which output stream for what (`Write-Output` for data; `Write-Host`/`Write-Information` for humans; stray values pollute a function's return)? | pwsh | uncovered · [frame] H6 | P1 | PS-ERR |

### R. PowerShell native commands → `powershell-quality/native.md` (PS-NATIVE)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-R-01 | How do empty strings and embedded quotes reach native tools under `$PSNativeCommandArgumentPassing` (7.3+: Windows default on Windows, Standard elsewhere; Legacy for `cmd.exe`, `.bat`, `find.exe`) vs 5.1? | pwsh,emitter | uncovered · [cod] #41, [shift] #40 | P1 | PS-NATIVE |
| M-R-02 | On 5.1, `curl`, `wget` and `sort` are aliases (`curl` is `Invoke-WebRequest`). Must scripts call `curl.exe`? | pwsh | uncovered · [plat] | P1: grep `\bcurl\b` not followed by `.exe` in `.ps1` | PS-NATIVE |
| M-R-03 | How is pwsh called from sh and sh from pwsh (`-NoProfile -NonInteractive -File` vs `-Command`; quoting `-Command` from sh)? | pwsh,emitter | uncovered · [prac] | P2 | PS-NATIVE |
| M-R-04 | Are argument lists built as arrays and splatted (`& $exe @args`), never as strings? | pwsh | uncovered · [prac] | P1 | PS-NATIVE |

### S. PowerShell encoding → `powershell-quality/encoding.md` (PS-ENC)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-S-01 | What is the BOM policy, given that 5.1 reads BOM-less UTF-8 as ANSI ("café" has length 5), Unix shells break on a BOM, and PSUseBOMForUnicodeEncodedFile is always on? | pwsh | uncovered · [fail] #14, [fleet] #13 (0 BOM) | P0: check: non-ASCII grep over `.ps1`, plus the PSSA rule | PS-ENC |
| M-S-02 | Which writer produces which bytes on 5.1 (`>` and `Out-File`: UTF-16LE with BOM; `Set-Content`: ANSI; `utf8NoBOM` rejected), and what is the safe idiom? | pwsh | uncovered · [plat], [shift] §11 | P0: check: grep `Out-File\|Set-Content\| > ` without an explicit encoding in 5.1 targets | PS-ENC |
| M-S-03 | What encoding do the console and native pipes use (`$OutputEncoding` us-ascii, Console IBM437 on 5.1)? | pwsh | uncovered · [plat] | P1 | PS-ENC |
| M-S-04 | Must help and messages be ASCII on 5.1 (CLI-12 mojibake)? | pwsh | partial (rust cli-contract CLI-12) · [cfg] §4 | P2 | PS-ENC |
| M-S-05 | Do `.ps1` line endings matter, and what does `.gitattributes` say for them? | pwsh | uncovered · [fleet] #13 (0 CRLF) | P3 | PS-ENC |

### T. PowerShell gates and tests → `powershell-quality/gates.md` (PS-GATE)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-T-01 | Which PSScriptAnalyzer settings ship per kind (Severity Error/Warning; PSUseCompatibleSyntax enabled; ExcludeRules by kind; `-EnableExit` returns the diagnostic count since 1.24)? | pwsh,lint-format | uncovered · [ex], [cfg] §6, [cod] #43 | P0: conflict 6; check: `Invoke-ScriptAnalyzer -Settings … -EnableExit` red on a plant | PS-GATE |
| M-T-02 | Is a parse on the real 5.1 host (`Parser::ParseFile`) part of the gate, beside PSSA run on 7? | pwsh,lint-format | uncovered · [fleet] #13 | P1 | PS-GATE |
| M-T-03 | Is `Invoke-Formatter` (CodeFormatting presets) part of the gate? | pwsh,lint-format | uncovered · [cod] §8 | P2 | PS-GATE |
| M-T-04 | Pester 5 or 6 (6.0.0 on 2026-07-07: `Should-*`, minimum 5.1/7.4, `Assert-MockCalled`/`-Focus`/`Pending` removed; the corpus pins 5.x)? | pwsh,testing | uncovered · [shift] #45, [ex] | P1 (dated) | PS-GATE |
| M-T-05 | Does test code respect Pester 5's discovery/run split (code outside `BeforeAll` runs at discovery)? | pwsh,testing | uncovered · [cod] #46 | P2 | PS-GATE |
| M-T-06 | Which top corpus findings are noise (PSUseDeclaredVarsMoreThanAssignments 1,580; PSAvoidUsingWriteHost 753)? | pwsh,lint-format | uncovered · [ex] | P2 | PS-GATE |
| M-T-07 | What must a module manifest carry (`CompatiblePSEditions`, `RequiredModules`, PSEdition tags, Gallery guidelines)? | pwsh | uncovered · [cod] §8 | P2 | PS-GATE |
| M-T-08 | Which PSSA version does the gate pin (1.25.0, 2026-03-20, with its new rules)? | pwsh,lint-format | uncovered · [shift] #44 | P2 | PS-GATE |

### U. PowerShell security → `powershell-quality/security.md` (PS-SEC)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-U-01 | What must an `irm \| iex` script avoid (exit, param blocks, a null `$PSScriptRoot`), and where else is Invoke-Expression allowed? | pwsh,installer,security | uncovered · [cod] #42, [inst] | P1: PSAvoidUsingInvokeExpression | PS-SEC |
| M-U-02 | The execution policy is not a security boundary. May an installer call `Set-ExecutionPolicy` beyond `-Scope Process`? | pwsh,security | uncovered · [cod] §9, [plat] | P1: grep `Set-ExecutionPolicy` without `-Scope Process` | PS-SEC |
| M-U-03 | Does a 5.1 script enable TLS 1.2 before downloading? | pwsh,installer | uncovered · [inst] | P1 | PS-SEC |
| M-U-04 | Is zip extraction checked for zip-slip, and the archive verified with `Get-FileHash` first? | pwsh,installer,security | uncovered · [inst] | P1 | PS-SEC |
| M-U-05 | Does the installer degrade under ConstrainedLanguage (WDAC/AppLocker)? | pwsh | uncovered · [cod] §9 | P3 | PS-SEC |
| M-U-06 | How are credentials handled (PSAvoidUsingPlainTextForPassword, SecureString)? | pwsh | uncovered · [cod] §8 | P3 | PS-SEC |

### V. PowerShell core → `powershell-quality` index (PS-CORE)

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-V-01 | The gate block (5.1 parse, PSSA settings, Pester) and the target declaration. | pwsh | partial (house CORE trio) | P1 | PS-CORE |
| M-V-02 | The pwsh agent-tell grep set: `&&`, ternary and `??` in 5.1 targets; `$IsWindows`; bare `curl`; IWR without `-UseBasicParsing`; `exit` in iex scripts; `Out-File` without `-Encoding`; `Write-Host` for data. | pwsh | uncovered · [frame] H6 | P0: check: the grep set, each pattern watched red | PS-CORE |
| M-V-03 | Approved verbs and naming for script functions vs exported module functions. | pwsh | uncovered · [cod] §8 | P3 | PS-CORE |

### W. Procedures → skills

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-W-01 | `shell-integration`: emit code for N shells (a quoter per target, the hostile corpus, rc targets, hooks, undo, verification through the matrix). | emitter | uncovered · [frame], [ocx], [emit] | P1 | SH-CORE |
| M-W-02 | `installer-script`: the `install.sh` plus `install.ps1` pair (detection, download, verify, PATH and profile edits, idempotency, no-root). | installer | uncovered · [inst] | P1 | SH-CORE |
| M-W-03 | `shell-port`: port a script to a target matrix (find the floor, run `bash:3.2`/dash/busybox, the read-only macOS list, fix, re-verify). | any | partial (go-upgrade, swift-upgrade shape) | P1 | SH-CORE |
| M-W-04 | `shell-diagnose`: symptom-to-cause catalog (127 with `^M`, "Illegal option -o pipefail", 141, 143/271/399, "unbound variable", nu parse errors, "token '&&' is not a valid statement separator", mojibake). | any | partial (go-diagnose, swift-diagnose shape) | P1 | SH-CORE |
| M-W-05 | A shell review skill? | any | uncovered | P3 | SH-CORE |

### X. Sibling and catalog defects → owner action

| ID | Question | Surface | Coverage · source | Priority | Family |
|---|---|---|---|---|---|
| M-X-01 | `check-artifacts.py` lints only inline backtick spans, so 628 fenced sh/bash blocks (2,977 lines) are never linted. Add a fenced-block shellcheck lint? | lint-format | uncovered · [cfg] §2.3 | P2 | — |
| M-X-02 | Catalog command blocks abort under zsh `nomatch` (5 of 6 sampled: `rules/docs-quality.md:128`, `skills/docs-plan/SKILL.md:197`, `rules/bazel-quality/rust.md:62,164`, `skills/jvm-release/SKILL.md:182`, `skills/bazel-adopt/SKILL.md:276`). | zsh | uncovered · [cfg] §3.3 | P2 | — |
| M-X-03 | The never-matching depth-file glob covers 19 of 155 depth files; 136 autoload in every session. | any | uncovered · [cfg] §1.6 | P2 | — |
| M-X-04 | `skills/nix-flake-adopt` calls `bash --noprofile --norc -eo pipefail` "the shell GHA uses"; that is true only for `shell: bash`. | ci | uncovered · [cfg] §3 | P3 | — |
| M-X-05 | The catalog's own verification commands use `grep -r --include` (232 blocks; busybox lacks it) and `rg` (497 rows). Which verification dialect should the catalog use? | userland | uncovered · [cfg] gap 13 | P2 | — |
| M-X-06 | The fleet's native `quality-bash.md` (grimoire, index, ocx, grimoire-vscode) carries the claims overturned in conflicts 10 and 11. | any | uncovered · [cfg] §5 | P2 | — |

## Artifact set decision

### Rules (two)

**`shell-quality`.** The globs are widened per conflicts 7 and 8. The fleet counts below are from [cfg] §6.4 and [fleet]:

| Glob | Fleet count | Why |
|---|---|---|
| `**/*.sh` | 647 raw, 187 authored | the main surface |
| `**/*.bash` | 5 (4 bats helpers) | outside today's gate |
| `**/*.bats` | 10 (1,997 lines) | installer tests, outside today's gate |
| `**/*.zsh` | 1 | macOS default interactive shell |
| `**/*.ksh` | 0 | cheap; ksh is in the dialect matrix |
| `**/*.fish` | 6 (1 authored) | routed to `fish.md` |
| `**/*.nu` | 3 (1 authored) | routed to `nushell.md` |
| `**/*.elv` | 1 (authored) | routed to `elvish.md` |
| `**/.shellcheckrc` | 0 | the config this set ships |
| `**/.github/workflows/*.yml`, `**/.github/workflows/*.yaml` | 137 workflows, 628 `run:` blocks | conflict 8 |
| `**/action.yml`, `**/action.yaml` | 15 composite actions | conflict 8 |
| `**/Taskfile.yml`, `**/taskfile.yml`, `**/*.taskfile.yml` | 99 files, 954 cmds | conflict 8, owner Q4 |

- **Liveness.** The checker root is `/home/mherwig/dev/www-setup`, which is live for sh, bash, bats, fish, nu, elv, workflows and taskfiles. It needs `--allow-absent` for `**/*.zsh`, `**/*.ksh`, `**/.shellcheckrc`, `**/action.yml`, `**/action.yaml`, `**/.github/workflows/*.yaml` and `**/Taskfile.yml`. No brace globs: the checker reports them dead, and Cursor splits on commas ([cfg] §2.4).
- **The index (family SH-CORE)** carries the gate block (M-O-01), read-the-floor-first (M-O-02), the agent-tell grep set (M-O-03), the extension SHOULD (M-O-04), the CORE trio, the "which shell / which task" routing table (M-O-05) and the sibling map (M-O-06). It stays under 200 lines.
- **Depth files** each get the never-matching glob `paths: ["**/.shell-quality-depth-on-demand"]` with the house comment. They are routed by task, and none chains to another.

  | Depth file | Family | Task that routes here |
  |---|---|---|
  | `dialect.md` | SH-DIAL | choosing a shebang, a floor, or a POSIX.1-2024 feature |
  | `errors.md` | SH-ERR | error handling, traps, exit codes |
  | `expansion.md` | SH-EXP | quoting, argv, echo/printf, read, test, arithmetic |
  | `userland.md` | SH-USER | calling external tools; macOS, Alpine or uutils targets |
  | `security.md` | SH-SEC | destructive commands, untrusted input, secrets |
  | `gates.md` | SH-GATE | setting up or changing lint, format and hygiene checks |
  | `testing.md` | SH-TEST | writing bats or matrix tests |
  | `ci.md` | SH-CI | editing a workflow `run:` or a Taskfile cmd |
  | `zsh.md` | SH-ZSH | a `.zsh` file or zsh rc |
  | `fish.md` | SH-FISH | a `.fish` file or fish config |
  | `nushell.md` | SH-NU | a `.nu` file or nu config |
  | `elvish.md` | SH-ELV | a `.elv` file |
  | `emit.md` | SH-EMIT | generating shell code from another language |
  | `installers.md` | SH-INST | writing or reviewing an `install.sh` |

**`powershell-quality`.** Globs: `**/*.ps1` (25), `**/*.psm1` (2), `**/*.psd1` (1, `PSScriptAnalyzerSettings.psd1`). All are live in www-setup.
- The index (family PS-CORE) carries the gate block (M-V-01) and the pwsh agent-tell grep set (M-V-02).
- Depth files, with the never-matching glob `**/.powershell-quality-depth-on-demand`:

  | Depth file | Family |
  |---|---|
  | `compat.md` | PS-COMPAT |
  | `errors.md` | PS-ERR |
  | `native.md` | PS-NATIVE |
  | `encoding.md` | PS-ENC |
  | `gates.md` | PS-GATE |
  | `security.md` | PS-SEC |

**Never globbed:**
- `**/bin/*` and any shebang guess (conflict 7);
- `.bashrc`, `.zshrc` and other dotfiles, since project repos rarely carry them and the emitter's rc writing is reached through `emit.md` and the skill;
- `Makefile` recipes and `Dockerfile` `RUN` lines, which belong to the build sets;
- `.editorconfig`, a shared file. The shfmt keys are documented in `gates.md` instead.

### ID families (22)

| Family | Covers |
|---|---|
| SH-CORE | the `shell-quality` index, plus skill rows M-W-* |
| SH-DIAL, SH-ERR, SH-EXP, SH-USER, SH-SEC, SH-GATE, SH-TEST, SH-CI, SH-ZSH, SH-FISH, SH-NU, SH-ELV, SH-EMIT, SH-INST | the 14 `shell-quality` depth files, one each |
| PS-CORE | the `powershell-quality` index |
| PS-COMPAT, PS-ERR, PS-NATIVE, PS-ENC, PS-GATE, PS-SEC | the 6 `powershell-quality` depth files, one each |

All match `^[A-Z][A-Z0-9]*(-[A-Z][A-Z0-9]*)*-\d+$` once numbered. The catalog's existing prefixes do not collide with `SH-` or `PS-` (the swift set uses `SW-`, cmake `CMK-`, rust `EXIT-`/`CLI-`).

### Skills (four procedures)

| Skill | Procedure | Reads |
|---|---|---|
| `shell-integration` | Emit code for N shells: pick the quoter per target and context, run the hostile corpus through `matrix.sh`, choose rc targets, register hooks append-safely, write the undo, test oldest and newest interpreters. Description names "generating shell code from Rust, Go or Python", "rc/profile edits", "extensionless scripts". | `emit.md`, `fish.md`, `nushell.md`, `elvish.md`, `zsh.md`, `powershell-quality/native.md` |
| `installer-script` | Write or review the `install.sh` plus `install.ps1` pair: dialect, truncation guard, detection, probed download, verification, no-root install, idempotent PATH edit, exit taxonomy, the matrix run. | `installers.md`, `userland.md`, `powershell-quality/security.md` |
| `shell-port` | Port a script to a target matrix: read the floor, run the 3.2 denylist and `matrix.sh`, fix, re-verify, record the receipt. | `dialect.md`, `userland.md` |
| `shell-diagnose` | Symptom → cause → check → fix catalog across shells, with each error text quoted verbatim. | `references/` from the start |

Each skill carries a bounded MUST-rows table and a receipt; SKILL.md stays under 500 lines. A review skill is deferred (M-W-05).

### Bundle

`shell-essentials` has these untagged members:
- `./shell-quality`
- `./powershell-quality`
- `./shell-integration`
- `./installer-script`
- `./shell-port`
- `./shell-diagnose`
- `./code-docs`
- `./code-docs-cleanup`

### Plumbing at authoring

- `publish.toml` entries;
- `docs/<artifact>.md` for each;
- `assets/lore-shell.svg`, which does not exist yet;
- a taskfile block whose liveness root is `www-setup`;
- the depth-file never-glob on every depth file (M-X-03 is the catalog-wide backfill, owner's call).

### Not in scope

- An interactive-shell configuration guide (prompt theming, plugin managers);
- csh/tcsh;
- Windows `cmd.exe` batch scripting, except as a `$PSNativeCommandArgumentPassing` target;
- Makefile shell, which belongs to `cmake-build` and the build sets;
- Dockerfile `RUN` lines;
- full fish/nu/elvish style guides (frame Q3);
- fixing ocx, www-setup or upstream emitters (frame Q6).

## Selected for wave 2

Seven groups and 13 dives, chosen in this order:
1. **Cross-cutting decisions:** dialect and floors, the error model, quoting, and the gate of record. Every depth file depends on them.
2. **PowerShell 5.1/7:** the second rule's whole foundation.
3. **The multi-shell emission contract:** the strongest adopter pull and the security finding.
4. **CI:** the largest fleet surface by count.

Every row they cover is uncovered. Each brief plants fixtures that are watched red on the plant and green on the twin.

**Chase the surprise.** Each item is assigned to one dive. If it does not reproduce, the dive says so and does not paper over it.

| Surprise | Dive |
|---|---|
| dash 0.5.12-12 accepts pipefail; 0.5.12-2 and -6ubuntu5 abort on the same line | `dialect/floors-and-shebangs` |
| `$'..'` prints literally, without error, on dash, yash, posh | `dialect/floors-and-shebangs` |
| `set -e; ( false ); echo after` continues on bash 3.2 | `dialect/bash-version-gate` |
| bash 5.2 `patsub_replacement` changes output silently | `dialect/bash-version-gate` |
| uutils sorts differently when the locale is not installed | `dialect/userland-floor` |
| busybox wget rejects `--secure-protocol` (rc=3) in the flagship installer | `dialect/userland-floor` |
| 69 SC2310 and 150 SC2312 sites hide behind optional checks | `errexit/error-model` |
| A TERM-killed child reads 143, 271 or 399 depending on the shell | `errexit/traps-and-exit-codes` |
| `shellcheck -S warning` hides SC2086 in the fleet gate | `gate/lint-format-profile` and `expansion/quoting-and-words` |
| `{1..3}` runs once with the literal word in 7 of 11 shells | `expansion/quoting-and-words` |
| 5.1 `Invoke-WebRequest` fails under `-NonInteractive` without `-UseBasicParsing` | `pwsh/compat-and-encoding` |
| A mid-script native failure passes a GHA pwsh step | `pwsh/errors-and-native` |
| `exit` inside `irm \| iex` kills the host shell | `pwsh/errors-and-native` |
| Curly quotes close a PowerShell literal (ocx plus four upstreams) | `emit/quoting-contract` |
| `$env:X=''` keeps the variable on 7.6.6 only | `emit/quoting-contract` |
| An rc rewrite replaces a symlink and sets 0600 | `emit/rc-and-hooks` |
| An array `PROMPT_COMMAND` is inert on bash 3.2-5.0 | `emit/rc-and-hooks` |
| mvdan/sh panics on an assoc key containing `-` | `ci/run-steps-and-taskfiles` |

**Shared Env footer.** Every brief ends with it, and the consolidations cite it.

```text
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/<slug>/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `dialect`: Dialect, floors and userland (SH-DIAL, SH-USER) → `shell-dialect.md`

#### W2-1 `dialect/floors-and-shebangs`: Dialect policy, version floors and POSIX.1-2024 adoption

```text
Rows: M-A-01..M-A-05, M-A-09, M-A-10, M-A-13..M-A-16, M-A-18..M-A-20, M-O-04.
Fetch: POSIX.1-2024 XCU https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html and the read, xargs, find, realpath, readlink, timeout, test pages under the same utilities/ path;
  Debian Policy 10.4 https://www.debian.org/doc/debian-policy/ch-files.html ; dash git https://git.kernel.org/pub/scm/utils/dash/dash.git/ ;
  Debian dash changelog https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog ; Apple https://support.apple.com/en-us/102360 (read only);
  runner images https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md and the macos-26 README.
Pin: per feature (pipefail, dollar-single-quote, read -d, find -print0, xargs -0 and -r, realpath, readlink -f, timeout, test -nt/-ot/-ef, local, echo -n) the verdict on
  dash 0.5.12-2 (deb12), 0.5.12-6ubuntu5 (24.04), 0.5.12-12 (deb13, 26.04), busybox 1.37 (alpine 3.22), mksh R59c, ksh93u+m 1.0.10, yash 2.52, posh 0.14.1, bash 3.2 --posix;
  the /bin/sh of each of the 21 images in [plat]; whether env -S works in busybox env.
Fleet: www-setup/src/install.sh:5 and :39 (probed local); fleet quality-bash.md claim "macOS /bin/sh is dash" ([cfg] section 5); 154 env-bash vs 1 /bin/bash shebangs ([fleet] #5);
  the 6 authored extensionless files ([fleet] #3). Exemplar: rust-lang__rustup@61271d00a979:rustup-init.sh:17-20 (has_local), Homebrew__install@8ab1549dfa11:install.sh:17-19 (BASH_VERSION abort).
Plant in fixtures/floors-and-shebangs/:
  (a) sh-pipefail-bare.sh: set -o pipefail || true, then echo reached; red on dash deb12 and posh (no "reached"); twin sh-pipefail-probe.sh with the subshell probe, green everywhere.
  (b) sh-dsq.sh printing a dollar-single-quoted tab through od -c: record literal vs tab per shell (silent wrong output, not an error).
  (c) posix2024-utils.sh probing each utility flag above with command -v plus a run; one row per image.
  (d) shebang-args.sh with "#!/bin/bash -e -o pipefail": record the Linux error; twin with set -eo pipefail in the body.
  (e) mixed.sh: a .sh file with bash arrays and no shebang through shfmt -d and shellcheck; twin with a bash shebang.
Decide: the script-kind table (installer/bootstrap, repo tool, CI helper, sourced library, test helper) with dialect, shebang form and bash floor for each (confirm or overturn conflict 2);
  which POSIX.1-2024 features a #!/bin/sh script may use in 2026 (use / probe / never) with dated image evidence (conflict 3); the floor-table format (nix "Floor / impl" precedent);
  whether local is allowed in sh and the exact directive text; the extension convention for authored scripts.
Chase: dash 0.5.12-12 accepting pipefail while 0.5.12-2 aborts; dollar-single-quote printing literally; if the probe idiom fails anywhere, say where.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/floors-and-shebangs/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-2 `dialect/bash-version-gate`: Detecting bash 4+ features and version drift for a bash 3.2 floor

```text
Rows: M-A-06, M-A-07, M-A-08, M-A-11, M-A-12, M-A-22, M-B-03, M-B-04, M-B-19, M-C-16.
Fetch: bash 5.3 NEWS and COMPAT from https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz ; https://github.com/koalaman/shellcheck/issues/2615 (no bash-3.2 target, open);
  bats gotchas https://github.com/bats-core/bats-core/blob/master/docs/source/gotchas.rst ; BashFAQ/105 https://mywiki.wooledge.org/BashFAQ/105 .
Pin: first working version on matrix.sh bash (3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3) for declare -A, mapfile/readarray, case modification, [[ -v ]], negative index, printf %()T,
  local -n, wait -n, ${x@Q}, inherit_errexit, lastpipe, |&, &>>, coproc, EPOCHREALTIME, SRANDOM, funsub, GLOBSORT, patsub_replacement, globskipdots, ${A[@]@k};
  parse-time vs run-time failure for each (does bash -n on 3.2 reject it, or only execution?); fill in 4.3 where [fail] skipped it.
Fleet: the 5 authored files with bash 4+ features ([fleet] #10); index/scripts/golden-baseline.sh:250 (taskfile-invoked); 0 BASH_VERSION guards fleet-wide.
Exemplar: omp.bash:34 ([[ -v fails to parse on 3.2/4.0, [ex]); direnv stdlib.sh:1404 (local -A); guard patterns pyenv-rehash:139, git-completion:2917, bats bin/bats:8-15 ([ex]).
Plant in fixtures/bash-version-gate/:
  (a) features.sh, one feature per function, called by name: record the version table (check the output, not just the exit code).
  (b) guard-late.sh: a BASH_VERSINFO guard after a declare -A line; red on 3.2 (parse dies before the guard); twin guard-first.sh with the guard in a 3.2-parsable prologue.
  (c) errexit-arith.sh: set -e; i=0; (( i++ )); echo reached, plus a function ending in a false [[ ]]; record 3.2/4.0 vs 4.2+.
  (d) patsub.sh and dotglob.sh: silent output differences between 5.1 and 5.2.
  (e) a grep denylist (grep -E, quoted patterns, directory operands) run over all fixtures: zero false negatives on (a), and its false-positive count on the fleet's 166 authored bash files.
Decide: the bash 3.2 denylist (pattern, feature, first version) as the mechanical check ShellCheck cannot provide; the guard idiom and where it must sit;
  whether the floor is 3.2 for every unpinned bash script or only macOS-reachable ones; the (( )) and [[ ]] errexit compensation rule.
Chase: set -e; ( false ); echo after continuing on 3.2; ${A[@]@k} silently printing only values on 4.x; patsub_replacement changing output with no error.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/bash-version-gate/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-3 `dialect/userland-floor`: Userland portability across GNU, BSD, busybox and uutils

```text
Rows: M-D-01..M-D-14, M-D-16, M-D-17, M-A-03 (userland columns).
Fetch: Ubuntu 25.10 notes https://documentation.ubuntu.com/release-notes/25.10/ ; uutils https://github.com/uutils/coreutils ; POSIX utility pages (realpath, readlink, xargs, find, timeout);
  busybox news https://busybox.net/ ; SO 5694228 and 1055671 for the BSD forms (read only); Debian 13 release notes (tmpfs /tmp) https://www.debian.org/releases/stable/release-notes.en.txt .
Pin: for sed -i, readlink -f, realpath, date -d, stat -c, grep -P, grep -r --include, xargs -r, sort -V, find -printf, sed -z, mktemp -d and its template forms, timeout, flock,
  sha256sum/shasum, which, tar, curl, wget TLS flags, awk (mawk vs gawk): present / absent / different on each of the 21 Linux images in [plat], busybox 1.37, Git Bash 5.2.15 (host),
  and macOS from Apple source (read only, labelled); uutils 0.10.0 vs GNU 9.4 differences beyond the 3 in [shift].
Fleet: GNU-isms sed -i x2 and readlink -f x1 (test/manual) and xargs -r in rules/swift-quality/checks ([fleet] Axis 5); installers probing sha256sum ([inst]);
  catalog verification commands using grep -r --include (232 blocks) and rg (497 rows) ([cfg]).
Plant in fixtures/userland-floor/:
  (a) gnuisms.sh exercising each flag; run per image; record exit and output.
  (b) sort-locale.sh: LANG=en_US.UTF-8 sort on mixed case vs LC_ALL=C sort, GNU (24.04) vs uutils (26.04); red = order differs, twin LC_ALL=C identical.
  (c) tmp-trap.sh: mktemp -d plus trap cleanup, killed by TERM; verify the dir is gone on dash, busybox, bash 3.2.
  (d) msys.sh on matrix.sh win: cmd /c vs cmd //c vs MSYS_NO_PATHCONV=1; record hang (under timeout) vs ok.
Decide: the userland table (command, safe form, probe, fallback, platforms with evidence date) for SH-USER; the grep denylist for GNU-only flags;
  the LC_ALL=C rule's scope; the temp-file contract; the catalog's own verification dialect (input to M-X-05).
Chase: uutils collation without an installed locale; busybox wget rejecting --secure-protocol (rc=3, www-setup/src/install.sh:352-354).
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/userland-floor/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `errexit`: Error model, traps and exit codes (SH-ERR) → `shell-errexit.md`

#### W2-4 `errexit/error-model`: The error model (set -e, explicit checks, nounset, pipefail)

```text
Rows: M-B-01, M-B-02, M-B-05..M-B-08, M-B-16..M-B-18.
Fetch: BashFAQ/105 https://mywiki.wooledge.org/BashFAQ/105 ; BashPitfalls #60 https://mywiki.wooledge.org/BashPitfalls ; oils https://github.com/oils-for-unix/oils/blob/master/doc/error-handling.md ;
  the POSIX errexit text (XCU set, 2.8.1); ShellCheck optional checks https://github.com/koalaman/shellcheck/wiki/Optional ; shellcheck issues 3444 and 3522; rules/cmake-build.md CMK-CORE-05.
Pin: per shell (dash, busybox, mksh, ksh93, yash, posh, bash 3.2..5.3, zsh 5.9) whether -e fires for: a function in if/&&/||/!, local or export x=$(false), echo $(false; echo hi), a ! pipeline,
  pipelines under pipefail with an early-exit reader (status 141), empty "${a[@]}" and "$@" under -u; what SC2310, SC2311, SC2312 and SC2155 report on each plant.
Fleet: SC2310 x69 in 9 files and SC2312 x150 in 41 files under -o check-set-e-suppressed,check-extra-masked-returns ([fleet] Axis 4: list the files);
  set -u empty-array candidates setup-grimoire/.github/scripts/install.sh:82 and index/scripts/smoke-test.sh:85; the swift checks' deliberate set -u-only design.
Exemplar ([ex]): git (&& chains, --chain-lint), nvm.sh:3877-3905 (probes the -e flag and restores it), rust-lang__rustup@61271d00a979:rustup-init.sh (set -u plus ensure/need_cmd), Homebrew__install@8ab1549dfa11:install.sh (set -u plus abort).
Plant in fixtures/error-model/:
  (a) suppressed.sh: f() { false; echo still; }; if f; then :; fi under set -e; red = "still" printed; SC2310 must fire.
  (b) masked.sh: local x=$(false); twin with a split declaration; SC2155 and SC2312.
  (c) sigpipe.sh: set -o pipefail; yes | head -1, and printf output piped to grep -q; record 141 per shell.
  (d) empty-array.sh under set -u on bash 3.2..5.3; twin using ${a[@]+"${a[@]}"}.
  (e) sourced-lib.sh that sets -e, sourced from a caller that does not; record the caller's behaviour after a later failure.
Decide: the error model per script kind and the exact prologue text for each (confirm or overturn conflict 1); which optional ShellCheck checks become mandatory;
  the SIGPIPE rule generalised from CMK-CORE-05 with a sibling pointer; whether the IFS newline-tab prologue line is dropped (conflict 11); the empty-array idiom and its floor.
Chase: whether the 69 SC2310 sites are real hazards: read 15 and classify them; if most are benign, say so and demote the row.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/error-model/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-5 `errexit/traps-and-exit-codes`: Traps, cleanup, signals and the exit-status vocabulary

```text
Rows: M-B-09..M-B-15, M-D-06 (trap half), M-N-05.
Fetch: rules/rust-quality/cli-contract.md (EXIT-02, EXIT-11, CLI-01, CLI-05); sysexits(3); www-setup/.claude/rules/installers.md:224-236 (installer taxonomy);
  bash 5.3 NEWS item uu (exit in a trap, Posix interp 1602); yash NEWS 2.59 https://raw.githubusercontent.com/magicant/yash/trunk/NEWS ; ShellCheck wiki SC2064, SC3047, SC3048, SC3049.
Pin: the $? of a TERM-killed and a PIPE-killed child per shell (143/141 in most; 271/269 ksh93u+m; 399/397 yash); which trap spellings each shell accepts (EXIT, 0, INT, SIGINT, int, ERR);
  whether an EXIT trap fires on INT and TERM in dash, busybox, bash and zsh; what exit inside $( ) and inside a pipeline stage does to the script.
Fleet: trap EXIT in 34 files, ERR in 0 ([fleet]); installers with a trap 8/17 and with an exit taxonomy 1/17 ([inst]); www-setup installer exit codes 0-7 (usage = 2).
Exemplar: the [inst] cleanup-trap pattern (EXIT INT TERM HUP); docker__docker-install@2b32480025b2:install.sh:809-813.
Plant in fixtures/traps-and-exit-codes/:
  (a) reraise.sh: cleanup, then trap - INT; kill -INT $$; the parent sees 130 on bash and dash; twin with a plain exit 1 (parent sees 1: red for the contract).
  (b) die-subshell.sh: die called inside $( ); red = the script continues; twin with a status check at the call site.
  (c) trap-matrix.sh: an EXIT trap plus INT and TERM delivered by kill; record per shell whether cleanup ran.
  (d) signal-status.sh: a child killed by TERM, print $?; one row per shell.
Decide: the exit-status vocabulary for scripts (rust cli-contract table, installer 0-7, or both by kind; owner Q6 default applies) and the 128+N caveat text;
  the canonical cleanup trap for sh and for bash; the die() helper and where it may be called; the stderr/stdout contract; whether ERR traps are ever allowed (bash only).
Chase: if an EXIT trap does not run on SIGTERM in some shell, the rule must trap TERM explicitly; record which shells.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/traps-and-exit-codes/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `expansion`: Quoting and expansion (SH-EXP) → `shell-expansion.md`

#### W2-6 `expansion/quoting-and-words`: Quoting, word splitting, globbing and the text-handling builtins

```text
Rows: M-C-01..M-C-14, M-C-17, M-C-19, M-C-21, M-C-22, M-E-01..M-E-03, M-E-08.
Fetch: BashPitfalls https://mywiki.wooledge.org/BashPitfalls (#1-#3, #8, #14, #22, #41, #47, #56, #59, #61, #62); SC2086 https://www.shellcheck.net/wiki/SC2086 ;
  Unix SE 65803 (printf vs echo); shellcheck issue 2679 (arithmetic injection) https://github.com/koalaman/shellcheck/issues/2679 ; QuoteBench https://arxiv.org/abs/2608.13547 ;
  Google style guide https://google.github.io/styleguide/shellguide.html (quoting, arrays, getopts sections).
Pin: per shell in matrix.sh posix plus bash 3.2/5.3 and zsh 5.9: echo with -n, -e and backslashes; printf %b and positional %2$s; read -r and -d; here-strings; ${x//}; ${x:0:1};
  brace expansion in sh; test == / -a / -o / -v; arithmetic octal, 08, 10#, overflow, **; unmatched globs; the SC codes that fire on each plant.
Fleet: research scratch SC2086 183 of 278 findings ([fleet] #7) vs authored 4.9 findings/KLOC; grimoire gate piping a file list through echo into xargs shellcheck ([cfg] section 6).
Exemplar: [inst] K3S:408 ({1..3} runs once in 7/11 shells); the Steam incident, ValveSoftware/steam-for-linux issue 3671 (rm -rf of an empty root variable).
Plant in fixtures/quoting-and-words/:
  (a) split.sh: filenames with a space, a newline and a leading dash through for/cp/rm forms; red unquoted, green quoted plus --.
  (b) argv.sh: building a command with optional flags: string plus eval (red on a hostile value) vs array (bash) vs set -- (sh).
  (c) echo.sh: echo of a backslash-t string and of -n across the 11 POSIX-mode shells; twin printf '%s'.
  (d) arith-inject.sh: x='a[$(touch PWNED)]'; (( x > 1 )); red = file created; twin validates with case first.
  (e) destructive.sh: rm -rf "${root}/"* with root empty inside a throwaway dir; twin with ${root:?}; record SC2115.
  (f) brace.sh: {1..3} under sh in all 11 shells.
Decide: the quoting contract (MUST rows with SC codes); the argv-building rule per dialect; the echo/printf rule (confirm conflict 19); the read-loop template; the test-operator table per dialect;
  the arithmetic safety rule; and for each row whether it is lint-checked, grep-checked or a reading heuristic.
Chase: SC2086 is severity info; confirm that shellcheck -S warning (ocx/taskfiles/shell.taskfile.yml:38) hides it, and count what the fleet gate therefore misses.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/quoting-and-words/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `gate`: The gate of record (SH-GATE) → `shell-gate.md`

#### W2-7 `gate/lint-format-profile`: shellcheck and shfmt profile, file discovery and file hygiene

```text
Rows: M-F-01..M-F-14, M-G-06, M-O-01, M-O-03.
Fetch: ShellCheck CHANGELOG https://github.com/koalaman/shellcheck/blob/master/CHANGELOG.md plus the Optional and Directive wiki pages; shfmt man https://github.com/mvdan/sh/blob/master/cmd/shfmt/shfmt.1.scd
  and CHANGELOG https://github.com/mvdan/sh/blob/master/CHANGELOG.md ; gitattributes https://git-scm.com/docs/gitattributes ; actionlint's shellcheck integration docs.
Pin: the severity of SC2086, SC2046, SC2068, SC2155, SC2162, SC2164, SC2310, SC2312 (info vs warning); the .shellcheckrc keys (enable=, external-sources=, source-path=, shell=) and the file search order;
  shfmt 3.13.1 -ln auto rules, -f discovery and 3.14 --detect, the EditorConfig keys and the flags-override rule; the ShellCheck version on ubuntu-24.04 (0.9.0), Debian 13 (0.10.0), Ubuntu 26.04 (0.11.0).
Fleet: ocx/taskfiles/shell.taskfile.yml:21, :38, :48 (git ls-files '*.sh', -S warning, shfmt -d -i 4 -ci); grimoire/taskfiles/shell.taskfile.yml:12-21 (exits 0 when tools are missing);
  93/186 shebang scripts committed 100644; non-ASCII in 21/31 sh scripts; 10 .bats and 5 .bash files outside the gate ([fleet]).
Exemplar ([ex]): disable census of 1185 directives, 12.5% justified; central configs (mise .shellcheckrc, docker, shellspec, acme, starship --severity=warning); shfmt styles 2sp 54% / tab 32% / 4sp 13%.
Plant in fixtures/lint-format-profile/:
  (a) sev.sh with one finding per pinned code; run with -S warning and with defaults; record which findings disappear.
  (b) rc/ tree with the proposed .shellcheckrc and a sourced lib; prove SC1091 resolves through source-path=SCRIPTDIR.
  (c) discovery/ tree: x.sh, y.bash, z.bats, an extensionless bin/tool with #!/bin/sh, a lib with no shebang; compare git ls-files '*.sh', shfmt -f . and the proposed gate's list.
  (d) gate-missing-tool: run the proposed gate with shellcheck removed from PATH; red = exit 0.
  (e) crlf.sh, bom.sh, nonascii.sh: each detector command watched red and green.
  (f) parse-errors/: one broken file per family; bash -n, dash -n, zsh -n, fish --no-execute, a nu --ide-check wrapper, elvish -compileonly and pwsh Parser::ParseFile must each go red.
Decide: the shipped .shellcheckrc (verbatim); the relaxation list with the required reason text (confirm conflict 4); the gate command block for the index (verbatim); the shfmt default for owner Q3;
  the discovery command; the hygiene checks (CRLF, BOM, exec bit, ASCII); the ShellCheck and shfmt version floors.
Chase: if -S warning hides SC2086, the fleet gate misses the top bug class; quantify it on the 197 authored files.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/lint-format-profile/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `pwsh`: PowerShell 5.1 and 7 (PS-COMPAT, PS-ERR, PS-GATE) → `shell-pwsh.md`

#### W2-8 `pwsh/compat-and-encoding`: PowerShell targets, 5.1/7 compatibility and encoding

```text
Rows: M-P-01..M-P-06, M-P-08, M-P-09, M-S-01..M-S-04.
Fetch: lifecycle https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle ; differences https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell ;
  about_Character_Encoding https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding ;
  Invoke-WebRequest 5.1 https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1 (the CVE-2025-54100 note);
  UseCompatibleSyntax https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/UseCompatibleSyntax.md .
Pin: on WinPS 5.1.26100 (host), pwsh 7.4.7 and 7.6.6: the parse result for &&, ||, ternary, ??, ?., -Parallel, leading-pipe continuation, -AsHashtable, Test-Json, $IsWindows;
  whether Invoke-RestMethod is affected like Invoke-WebRequest under -NonInteractive; the bytes written by >, Out-File, Set-Content and Add-Content with and without -Encoding on 5.1;
  how a BOM-less non-ASCII .ps1 reads on 5.1 under powershell -File and under irm | iex.
Fleet: 26 PowerShell files, 0 BOM, 25/26 parse on all three engines, 0 PS7-only syntax ([fleet] #13); www-setup PSScriptAnalyzerSettings.psd1; the [inst] PS kit (#Requires 5.1, TLS12, ZipFile, Get-FileHash).
Exemplar ([ex]): vcpkg leading pipe (7.0+); 52 of 1327 corpus files fail to parse on 5.1; -UseBasicParsing in 12 of 31 IWR files.
Plant in fixtures/compat-and-encoding/:
  (a) ps7only/, one construct per file; red on the 5.1 parse; PSUseCompatibleSyntax with TargetVersions 5.1 must flag each.
  (b) iwr.ps1 with and without -UseBasicParsing under powershell -NonInteractive on the host.
  (c) cafe-nobom.ps1 vs cafe-bom.ps1 vs ascii-escape.ps1 ([char]0xE9): record the string length on 5.1 and 7.6.
  (d) write-enc.ps1: each writer, then od -c of the bytes from WSL.
Decide: the PowerShell target per script kind with the #Requires text (confirm or overturn conflict 6); the 5.1 denylist and its checks;
  the encoding rule (ASCII-only 5.1 targets vs UTF-8 with BOM) and the safe file-writing idiom on 5.1; the -UseBasicParsing rule.
Chase: whether irm is affected by the 2025-12-09 change; whether 7.4 should appear anywhere given its EOS on 2026-11-10.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/compat-and-encoding/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-9 `pwsh/errors-and-native`: The PowerShell error model and native commands

```text
Rows: M-Q-01..M-Q-06, M-R-01, M-R-02, M-R-04, M-H-03.
Fetch: about_Preference_Variables https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables ($PSNativeCommandArgumentPassing, $PSNativeCommandUseErrorActionPreference);
  GHA workflow syntax (the pwsh prelude and epilogue) https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md ; about_Try_Catch_Finally; about_Automatic_Variables ($?, $LASTEXITCODE).
Pin: on 5.1, 7.4.7 and 7.6.6: a mid-script native exit 3 under EAP Stop with and without $PSNativeCommandUseErrorActionPreference; native stderr with 2>&1 under Stop;
  the exit code a caller sees for powershell -File, -Command, pwsh -File and the GHA wrapper; empty-string and embedded-quote arguments to a native argument printer under Legacy, Standard and Windows passing;
  what exit inside irm | iex does to the host process.
Fleet: www-setup/src/install.ps1:182 and :734 (exit inside irm | iex kills the host on 3/3 engines, [inst]); the pwsh run: steps in fleet workflows ([fleet] #11).
Exemplar: scoop installer SCOOP:91-102 ($Global:LASTEXITCODE plus break, [inst]).
Plant in fixtures/errors-and-native/:
  (a) native-mid.ps1: cmd /c exit 3 (host) or sh -c 'exit 3' (Linux), then Write-Output reached; red = "reached" and exit 0; twins with the preference (7.x) and with an explicit LASTEXITCODE check (all three).
  (b) gha-sim.ps1 wrapped exactly like the GHA prelude and epilogue; record the step result.
  (c) iex-exit.ps1 run through Get-Content | iex: red = the host exits; twin using return or break.
  (d) args.ps1 passing an empty string, a value with a space, and a value with an embedded double quote to a native argument printer under each passing mode.
Decide: the one native-call idiom that fails correctly on 5.1 and 7 (a MUST row with its check); whether 7.x scripts must set $PSNativeCommandUseErrorActionPreference;
  the exit rules for iex-delivered scripts; the curl.exe rule; the argument-passing guidance; the stream rule (Write-Output vs Write-Host vs Write-Information).
Chase: GHA pwsh steps that pass with a failed native command mid-script; quantify it across the fleet's pwsh run: blocks.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/errors-and-native/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-10 `pwsh/analyzer-profile`: The PSScriptAnalyzer profile and the PowerShell gate

```text
Rows: M-T-01..M-T-03, M-T-06..M-T-08, M-V-01..M-V-03, M-U-02.
Fetch: PSSA rules README https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/README.md ; releases https://github.com/PowerShell/PSScriptAnalyzer/releases (1.24 -EnableExit, 1.25 rules);
  Gallery publishing guidelines https://learn.microsoft.com/en-us/powershell/gallery/concepts/publishing-guidelines ; about_Execution_Policies.
Pin: PSSA 1.25.0's default-on rules and severities; the settings-file schema (IncludeRules, ExcludeRules, Rules.PSUseCompatibleSyntax.TargetVersions); the -EnableExit exit value;
  whether PSUseCompatibleSyntax run from pwsh 7.6 flags each 7-only construct for TargetVersions 5.1; the Invoke-Formatter presets; whether PSSA loads on WinPS 5.1.
Fleet: www-setup/PSScriptAnalyzerSettings.psd1 (excludes PSUseApprovedVerbs, PSUseSingularNouns, PSUseShouldProcessForStateChangingFunctions) ([cfg] section 6).
Exemplar: the corpus settings census (Severity Error,Warning plus ExcludeRules WriteHost, ApprovedVerbs, ShouldProcess, GlobalVars); top findings PSUseDeclaredVarsMoreThanAssignments 1580 and PSAvoidUsingWriteHost 753 ([ex]); Pester's own settings ([cod] section 7).
Plant in fixtures/analyzer-profile/:
  (a) settings.psd1 (proposed) plus one violation per kept rule; -EnableExit red; a clean twin green.
  (b) installer-like.ps1 using Write-Host for progress: confirm the per-kind exclusion works without a global exclude.
  (c) a parse-gate script for the 5.1 host using [System.Management.Automation.Language.Parser]::ParseFile; red on a 7-only plant.
  (d) a sample of 30 PSUseDeclaredVarsMoreThanAssignments hits from the corpus: count the real defects.
Decide: the shipped PSScriptAnalyzerSettings.psd1 per kind (script, module, installer); the gate block (PSSA plus the 5.1 parse); the pwsh agent-tell grep set; whether Invoke-Formatter joins the gate;
  the execution-policy rule for installers.
Chase: if PSUseCompatibleSyntax misses a construct that the 5.1 parse catches, the parse gate is mandatory; name the construct.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/analyzer-profile/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `emit`: The multi-shell emission contract (SH-EMIT) → `shell-emit.md`

#### W2-11 `emit/quoting-contract`: Quoters per target, the hostile corpus and the data channel

```text
Rows: M-M-01..M-M-05, M-M-13..M-M-15, M-J-02, M-C-22.
Fetch: fish quoting https://fishshell.com/docs/current/language.html#quotes ; nushell strings https://www.nushell.sh/book/working_with_strings.html ; elvish language reference https://elv.sh/ref/language.html ;
  about_Quoting_Rules (PowerShell single-quoted strings and the quote characters it treats as equivalent); bash printf %q and ${x@Q} (NEWS 4.4); POSIX XCU 2.2 quoting.
Pin: which characters terminate a single-quoted literal in pwsh 5.1, 7.4.7 and 7.6.6 (U+0027, U+2018, U+2019, U+201A, U+201B), and the double-quote equivalents (U+201C..U+201E) for double-quoted strings;
  fish single-quote escapes and the trailing backslash; nu raw strings and escapes; elvish quote doubling; dollar-single-quote on sh targets; the shared POSIX quoter's result on each target.
Fleet: ocx@5de9d777eb7d:crates/ocx_shell/src/shell/escape.rs:35 (single_quoted_doubled doubles only U+0027) and escape.rs:13, :27, :43; ocx shell.rs:294-299 and :398-412 (posh quoted pattern); 982/989 hostile round trip ([ocx]).
Exemplar: direnv shell_pwsh.go:169, starship mod.rs:46-48, mise pwsh.rs:408-412, the zoxide pwsh template ([ocx]); mise fish double-backslash corruption and starship nu/elvish apostrophe failures; omp [char]0xE9 ([emit]).
Plant in fixtures/quoting-contract/:
  (a) corpus.txt: the 20 [emit] cases plus U+2018, U+2019, U+201A, U+201B, U+201C, U+201D, NUL (must be rejected), empty, a 4 KB value.
  (b) per-target emitters (sh, bash, zsh, fish, nu, elvish, pwsh) in one small script: emit the set-variable form, run it in the target via matrix.sh, compare the value byte for byte.
  (c) curly.ps1: a value with U+2019 followed by ;Write-Output PWNED; ; red on an ocx-style quoter, green on a quoter that doubles all four characters.
  (d) env-empty.ps1: $env:X = '' then Test-Path env:X on 5.1, 7.4.7 and 7.6.6.
Decide: the quoter specification per target (characters escaped, form used); the mandatory hostile corpus; the data-channel preference order; the never-emit list (dollar-single-quote for sh, source <(...));
  the verification recipe the shell-integration skill runs.
Chase: the curly-quote class in ocx and in four upstreams (owner Q6/Q7: report with a reproducer, do not fix); whether double-quoted pwsh strings carry the same class with U+201C..U+201E.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/quoting-contract/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W2-12 `emit/rc-and-hooks`: rc files, idempotent edits and hook registration per shell

```text
Rows: M-M-06..M-M-12, M-M-16, M-M-19, M-M-20, M-K-04, M-J-03, M-I-03, M-L-02.
Fetch: the bash manual INVOCATION section (login vs interactive file order); zsh startup files https://zsh.sourceforge.io/Intro/intro_3.html ; fish CHANGELOG 4.3 and 4.8 https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst ;
  nushell 0.107 (hook order) https://www.nushell.sh/blog/2025-09-03-nushell_v0_107_0.html and the autoload docs; about_Profiles; the elvish rc.elv docs.
Pin: which files each shell reads for login, interactive and non-interactive sessions (bash .bash_profile, then .bash_login, then .profile; zsh .zshenv, .zprofile, .zshrc; macOS Terminal login shells, read only);
  PROMPT_COMMAND string vs array support per bash version; nu vendor vs user autoload order; the pwsh $PROFILE variants and OneDrive redirection.
Fleet: ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:138-152 (.bash_login never targeted) and :176-213 (live $PROFILE probe); crates/ocx_util/src/fs.rs:236 (rename replaces a symlinked rc) and :244-249 (0600);
  ocx shell.rs:2886-2917 (PARITY_ARMS); crates/ocx_setup/src/shims.rs:604-638 (rejects $nu.temp-path); the rc edits in the www-setup installers ([inst]).
Exemplar: nvm-sh__nvm@b1b3a0038c06:install.sh:484,493 (grep guard, trailing-newline repair); Homebrew__install@8ab1549dfa11:install.sh:1139-1145; omp's array PROMPT_COMMAND inert on 3.2-5.0; starship's stub init ([emit]).
Plant in fixtures/rc-and-hooks/:
  (a) rc-edit.sh: apply a marker block twice to a .bashrc (with and without a trailing newline); red = duplicate block or joined line; twin idempotent.
  (b) symlink-rc/: .bashrc as a symlink into a dotfiles dir, mode 0644; run a rename-based rewrite; red = symlink replaced or mode changed; twin writes through the link.
  (c) hooks/: register a prompt hook in bash 3.2, 5.0 and 5.3 (PROMPT_COMMAND string and array, with a pre-existing user hook), zsh precmd_functions, a fish event, nu env_change, a pwsh prompt wrap; verify both hooks fire.
  (d) source-subst.sh: source <(printf ...) on bash 3.2, 4.0 and 5.3; twin eval "$(...)".
Decide: the per-shell rc-target table; the idempotent-edit contract (marker text, guard, newline repair, symlink and mode preservation); the hook registration form per shell;
  the undo contract; the version-guard pattern for churny targets. This feeds the shell-integration and installer-script skills.
Chase: ocx's symlinked-rc and 0600 rewrite (report per Q6); PROMPT_COMMAND arrays inert on bash 3.2-5.0.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/rc-and-hooks/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `ci`: CI shells (SH-CI) → `shell-ci.md`

#### W2-13 `ci/run-steps-and-taskfiles`: Shell in GitHub Actions run: steps and Taskfile cmds

```text
Rows: M-H-01, M-H-02, M-H-04..M-H-11, M-F-13 (CI half).
Fetch: workflow syntax (the defaults.run.shell table, exit codes) https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md ;
  secure use https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md ; Security Lab https://securitylab.github.com/resources/github-actions-untrusted-input/ ;
  runner-images issue https://github.com/actions/runner-images/issues/14748 and the Ubuntu2604, macos-26 and Windows2025 READMEs; go-task issues https://github.com/go-task/task/issues/2469 and https://github.com/go-task/task/issues/2429 ;
  the mvdan/sh interp CHANGELOG sections; actionlint docs (shellcheck integration).
Pin: the exact command line per shell: value and OS; whether defaults.run.shell: bash at workflow level adds pipefail; the Git Bash version on windows-2025 (5.3.15);
  task 3.53.1 interpreter behaviour for pipefail, printf -v, PIPESTATUS, BASH_VERSION, read -p and assoc keys containing '-'; whether set: [pipefail] in a Taskfile works.
Fleet: 628 run: blocks, 82% on the default shell, 22 pipelines without pipefail ([fleet] #11); www-setup/.github/workflows/test-installers.yml:206-207 (inputs.release_tag interpolated, a true positive);
  update-dist.yml:27 (echo only); ocx-mirror/taskfiles/release.taskfile.yml:55, :119, :121 and :196-197 (mvdan panic); 99 taskfiles, 954 cmds ([fleet] #12).
Plant in fixtures/run-steps-and-taskfiles/:
  (a) a workflow with a default-shell pipeline false | true and a shell: bash twin; run both through act if it is available, otherwise emulate with bash -e {0} vs bash --noprofile --norc -eo pipefail {0}.
  (b) inject.yml: a run: step echoing ${{ github.event.issue.title }} vs the env: twin; the grep check and actionlint (if installable) must flag the first.
  (c) Taskfile.yml with each construct above; run it under task 3.53.1; record panic or ok.
Decide: the CI MUST rows (an explicit shell: bash or defaults.run.shell; env indirection for every ${{ }} that reaches run:; the pwsh native-call pointer to PS-ERR); the grep checks;
  the Taskfile cmds rules; the dated ubuntu-26.04 rollout note; whether actionlint becomes part of the gate.
Chase: the T2 injection at test-installers.yml:206-207 (report with evidence, do not fix); the mvdan panic on an assoc key containing '-'.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/run-steps-and-taskfiles/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

## Staged for wave 3

Five groups and 8 dives. Five of them carry **REVISE AFTER WAVE 2**: wave 3 depends on the dialect, errexit, expansion, pwsh and emit decisions, and the orchestrator re-reads those consolidations before launching them. Total program budget: 13 + 8 = 21 dives.

### Group `installer`: Installer pairs (SH-INST, PS-SEC) → `shell-installer.md`

#### W3-1 `installer/sh-contract`: The install.sh contract. REVISE AFTER WAVE 2 (floors, userland, traps, rc-and-hooks)

```text
Rows: M-N-01..M-N-12, M-D-09.
Fetch: rustup-init.sh, docker install.sh, deno install.sh and Homebrew install.sh at the [inst] SHAs; the cargo-dist 0.33.0 shell template; https://spin.atomicobject.com/security-spectrum-curl-sh/ .
Pin: for the 17 corpus installers ([inst] Axis 2): truncation guard, integrity source, TLS flags, platform mapping, exit taxonomy, trap, /dev/tty prompts. Re-run only where wave 2 changed a verdict.
Fleet: www-setup/src/install.sh (913 lines, 0 shellcheck findings; busybox wget crash at :352-354; non-ASCII yash failure); setup-grimoire/.github/scripts/install.sh:82; grimoire's cargo-dist 0.33.0 front door ([inst] FD).
Exemplar: rust-lang__rustup@61271d00a979:rustup-init.sh:931 (main last) and :742 (check_help_for); docker__docker-install@2b32480025b2:install.sh:809-813; [inst] K3S:408, CDIST:1460, CDIST:1749.
Plant in fixtures/sh-contract/:
  (a) truncated.sh: the installer cut at 60% and piped to sh; red = partial side effects; twin with main last runs nothing.
  (b) platform.sh: stubbed uname -s/-m and ldd/musl fixtures on PATH, giving the expected target or a loud error; red = silent fallthrough.
  (c) the installer under alpine:3.22 with busybox wget only, deb12 dash, bash 3.2 --posix, and yash in the C locale.
  (d) run twice: the rc diff is empty (uses the wave-2 rc contract).
Decide: the SH-INST MUST rows; the installer-script skill's procedure and receipt; the generated-installer audit checklist (cargo-dist gaps); the exit taxonomy per owner Q6.
Chase: cargo-dist 0.33.0 lacking TLS flags and the Rosetta precedence bug; whether a newer cargo-dist fixes them (pin the version and date).
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/sh-contract/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W3-2 `installer/ps1-front-door`: install.ps1 (irm | iex delivery, TLS, integrity and 5.1 safety). REVISE AFTER WAVE 2 (pwsh dives)

```text
Rows: M-U-01, M-U-03, M-U-04, M-Q-03 (follow-up), M-P-06 (follow-up), M-N-02 (ps1 half).
Fetch: about_Execution_Policies; the PSAvoidUsingInvokeExpression rule doc; the scoop installer; the cargo-dist 0.33.0 powershell template; Get-FileHash and System.IO.Compression.ZipFile docs.
Pin: the default TLS protocols of 5.1 on the host; Expand-Archive vs ZipFile on 5.1; how param blocks and $PSScriptRoot behave under iex; Get-FileHash on 5.1.
Fleet: www-setup/src/install.ps1 (:182 and :734, exit inside iex); grimoire FD ps1:4-5 claiming a SHA-256 check that the cargo-dist template lacks ([inst]).
Exemplar: [inst] SCOOP:91-102; the [inst] PS kit (#Requires 5.1, TLS12, custom retry, ZipFile with a zip-slip check, Get-FileHash).
Plant in fixtures/ps1-front-door/:
  (a) served.ps1 run through Get-Content | iex on 5.1 and 7.6 with a failing step: the host survives and $LASTEXITCODE is set.
  (b) zip-slip.zip with a ../ entry: red = a file written outside the target; twin checks each entry path.
  (c) hash-mismatch: a corrupted download must abort before extraction.
Decide: the install.ps1 MUST rows (PS-SEC, PS-ERR); the PowerShell half of the installer-script skill; the verdict on grimoire's front-door claim (evidence for the owner).
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/ps1-front-door/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `alt-shells`: zsh, fish, nushell and elvish (SH-ZSH, SH-FISH, SH-NU) → `shell-alt-shells.md`

#### W3-3 `alt-shells/zsh`: zsh scripts and bash code sourced in zsh

```text
Rows: M-I-01..M-I-06, M-C-13 (zsh half).
Fetch: zsh NEWS (5.10 draft) https://raw.githubusercontent.com/zsh-users/zsh/master/NEWS ; the zsh options manual (SH_WORD_SPLIT, NOMATCH, ERR_EXIT, ERR_RETURN, LOCAL_OPTIONS); zsh News https://zsh.sourceforge.io/News/ ; shfmt zsh notes in its CHANGELOG.
Pin: on zsh 5.0.8, 5.3.1, 5.8 and 5.9 (and 5.9.2 if packaged): splitting, arrays, nomatch, the path/PATH tie, status, pipestatus, read -A, set -e with ! pipelines; the effect of emulate -L sh and emulate -L zsh.
Fleet: 1 .zsh file ([cfg] section 6.4); catalog blocks that fail under zsh nomatch ([cfg] section 3.3, M-X-02).
Plant in fixtures/zsh/:
  (a) bash-in-zsh.sh sourced from zsh: record each break; twin wrapped in emulate -L sh.
  (b) errexit.zsh: set -e; ! false | true; echo after, on 5.0.8 vs 5.9.
  (c) shfmt -ln zsh on a realistic .zshrc; record parse failures.
Decide: the zsh.md rows (script prologue, which bash habits break, startup-file placement, the emulate bridge) and whether zsh gets a gate beyond zsh -n plus shfmt.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/zsh/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W3-4 `alt-shells/fish`: fish 3.6 to 4.9 for scripts and emitted config

```text
Rows: M-J-01..M-J-07.
Fetch: fish CHANGELOG https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst (4.0 to 4.9.3); the fish language docs; the littlecheck tests in fish-shell tests/checks.
Pin: on fish 3.6.0, 4.0.2, 4.7.0 and 4.9.3: the ? glob, { } compound commands, for-loop locals, status features, test-require-arg, the status=123 override, conf.d load order, the frozen theme files.
Fleet: www-setup/src/install.fish (650 lines, clean on all four versions); the ocx fish emitter hook.rs:320-345 and conf.d/ocx.fish ([ocx]).
Exemplar: virtualenv, pdm and uv activate.fish ([fleet] #14); mise fish quoting corruption ([emit]).
Plant in fixtures/fish/:
  (a) breaks.fish, one construct per function; record per version.
  (b) a conf.d/ placement sourced twice: no duplicate handlers.
Decide: the fish.md rows: the supported range (3.6 to 4.9 until Debian 12 EOL), constructs to avoid, config placement, version detection, the fish gate.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/fish/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

#### W3-5 `alt-shells/nu-and-elvish`: nushell churn and elvish for emitted code. REVISE AFTER WAVE 2 (emit dives)

```text
Rows: M-K-01..M-K-07, M-L-01..M-L-03.
Fetch: the nushell release posts 0.100 to 0.116.1 (https://www.nushell.sh/blog/), especially 0.107, 0.110 https://www.nushell.sh/blog/2026-01-18-nushell_v0_110_0.html , 0.114 https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html and 0.116 https://www.nushell.sh/blog/2026-09-26-nushell_v0_116_0.html ;
  elvish 0.21.0 notes https://elv.sh/blog/0.21.0-release-notes.html and the 0.22 draft.
Pin: on nu 0.105.1 and 0.116.1: each removed or renamed item in [fail] section 13 (parse error vs warning vs silent); a wrapper over nu --ide-check that exits non-zero on any diagnostic;
  the safe intersection that parses on both; the elvish -compileonly false positives on edit:.
Fleet: ocx@5de9d777eb7d:crates/ocx_setup/src/shims.rs:604-638; ocx's nu describe guard (0 floor failures, [ocx]); www-setup/src/install.nu (547 lines) and install.elv (566 lines).
Exemplar: zoxide's 11 nu version pins; nu_scripts churn of 4.5% from 0.105 to 0.116 ([ex], [emit]); virtualenv activate.nu failing on 0.105.1 (get --optional).
Plant in fixtures/nu-and-elvish/:
  (a) stale/, one removed command per file, on both versions: record the failure mode.
  (b) fallthrough.nu: "abc" | size; record which external binary ran.
  (c) guard/: a version-guarded file split; confirm the old nu never parses the new-only file.
Decide: the nushell.md and elvish.md rows: the supported version range, the parse-gate wrapper, the guard and file-split pattern, the stale-command denylist with dates.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/nu-and-elvish/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `testing`: Shell and PowerShell tests (SH-TEST) → `shell-testing.md`

#### W3-6 `testing/bats-pester-matrix`: bats, Pester and the interpreter matrix in CI

```text
Rows: M-G-01..M-G-05, M-T-04, M-T-05.
Fetch: bats CHANGELOG https://github.com/bats-core/bats-core/blob/master/docs/CHANGELOG.md and the gotchas page; the shellspec README; Pester releases https://github.com/pester/Pester/releases (the 6.0.0 breaking list).
Pin: bats 1.11.1, 1.13.0 and 1.14.0 behaviour for run plus set -e, ! cmd, [[ ]] on bash 3.2, an empty suite; Pester 5.7.1 vs 6.2.0 on 5.1 and 7.6 for Should vs Should-*.
Fleet: 10 .bats files (1997 lines) under setup-grimoire and www-setup tests/install; the server.bash helpers; fleet Pester usage ([fleet]).
Plant in fixtures/bats-pester-matrix/:
  (a) vacuous.bats: each vacuous form wrapped around a deliberately failing assertion; red = the suite stays green.
  (b) a CI matrix sketch: the same bats suite on the bash:3.2 and bash:5.3 images.
  (c) pester5.Tests.ps1 vs Pester 6 assertions on the 5.1 host and on 7.6.
Decide: the testing.md rows (framework per dialect, the watched-red assertion forms, version pins); the Pester choice for PS-GATE; the CI matrix recipe.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/bats-pester-matrix/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `security`: Security beyond quoting (SH-SEC) → `shell-security.md`

#### W3-7 `security/injection-and-secrets`: Secrets, environment import, PATH and locking. REVISE AFTER WAVE 2 (expansion)

```text
Rows: M-E-04..M-E-07, M-C-20, M-D-07, M-D-15.
Fetch: the OWASP OS command injection cheat sheet https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.md ; CWE-78 https://cwe.mitre.org/data/definitions/78.html ;
  BashFAQ/045 (locking), /062 (temp files), /111 (Shellshock); bash 5.3 NEWS item p (NULL PATH).
Pin: how visible argv secrets are (ps, /proc/<pid>/cmdline) per OS; set -x leakage; whether BASH_ENV and ENV are honoured by non-interactive sh and bash; NULL PATH on 5.2 vs 5.3; mkdir-lock atomicity.
Fleet: grep the 213 authored files for tokens on argv, set -x near secrets, and source of writable config ([fleet] inventory).
Plant in fixtures/injection-and-secrets/:
  (a) secret-argv.sh: an Authorization header passed to curl on argv and visible in ps; twin reading the header from a file or stdin.
  (b) bash-env.sh: BASH_ENV pointing at a payload, then a non-interactive script; record per shell.
  (c) null-path.sh: PATH= cmd on 5.2 vs 5.3.
Decide: the security.md rows beyond wave 2 (secrets, environment import, PATH, data as code, locking), each with its check.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/injection-and-secrets/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

### Group `skills`: Procedures (SH-CORE) → `shell-skills.md`

#### W3-8 `skills/diagnose-and-port`: The shell-diagnose catalog and the shell-port runbook. REVISE AFTER WAVE 2

```text
Rows: M-W-01..M-W-04.
Fetch: the wave-2 consolidations (shell-dialect.md, shell-errexit.md, shell-expansion.md, shell-gate.md, shell-pwsh.md, shell-emit.md, shell-ci.md); skills/swift-diagnose and skills/go-release for the house skill shape.
Pin: the exact error text per symptom on each interpreter: a CR in the shebang (127, bad interpreter); "Illegal option -o pipefail"; 141/269/397; 143/271/399; "unbound variable" on an empty array; zsh "no matches found";
  nu parse errors for removed commands; WinPS "The token '&&' is not a valid statement separator"; 5.1 mojibake; the MSYS cmd /c hang.
Fleet: the 5 authored bash 4+ files ([fleet] #10) as port candidates; www-setup/src/install.sh and install.ps1 as the installer-script worked example; the ocx emitter paths in [ocx] as the shell-integration worked example.
Exemplar: the skill shape of skills/swift-diagnose/SKILL.md and skills/go-upgrade/SKILL.md (symptom table, bounded MUST rows, receipt); the [ex] symptom frequencies to order the diagnose table.
Plant in fixtures/diagnose-and-port/:
  (a) one minimal reproducer per symptom, each run once to capture its text verbatim on every interpreter that produces it;
  (b) one 3.2-incompatible fleet-shaped script ported end to end by following the draft shell-port steps, with the receipt filled in;
  (c) a dry run of the shell-integration procedure against a 3-target toy emitter, ending in the hostile-corpus round trip.
Decide: the shell-diagnose symptom table (symptom, cause, check, fix); the shell-port procedure with its receipt; the MUST-rows tables of shell-integration and installer-script; confirm each SKILL.md stays under 500 lines with references/.
Chase: any symptom whose text differs between interpreter versions (bash 3.2 vs 5.3, WinPS 5.1 vs pwsh 7.6) gets one row per variant, not a paraphrase.
Env: ~/.cache/research-lang/shell-tools/run.sh (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH) and matrix.sh <family> <script> (posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + WinPS 5.1, win = Git Bash + WinPS 5.1 on the host, staged only under C:/Users/ecom/shell-wintest); fixtures only under ~/.cache/research-lang/shell-tools/fixtures/diagnose-and-port/, never /tmp; no macOS host, so BSD/macOS claims are "unverified: read only"; quote every check verbatim with its exit code red on the plant and green on its twin; ocx and fleet defects are reported with file:line and a reproducer, never fixed (owner Q6).
```

## Deferred

Twenty-seven rows: no dive is commissioned for them in waves 2 or 3 (M-C-20, M-D-07 and M-D-15 belong to W3-7).

### Ready to author: no research needed

| M-ID | Why | Promotion |
|---|---|---|
| M-O-02 | Read-the-floor-first follows from conflict 2 and wave-2 `floors-and-shebangs`. | Written at authoring time. |
| M-O-05 | Routing follows from the artifact decision above. | Written at authoring time. |
| M-O-06 | The sibling map is fixed by [cfg] §3. | Written at authoring time. |
| M-O-07 | Watched-red and empty-output are the house CORE-02 and CORE-03. | Written at authoring time. |
| M-W-01 | `shell-integration` is assembled from W2-11, W2-12 and W3-5. | Drafted after wave 3. |
| M-W-02 | `installer-script` is assembled from W3-1 and W3-2. | Drafted after wave 3. |

### Low leverage: background or style

| M-ID | Why | Promotion |
|---|---|---|
| M-A-17 | Rewrite threshold: argued only (Google), with no measured line. | The owner wants a size cap in the rule. |
| M-A-21 | Oils divergence ranking: background for the tested-on table. | A dive needs it to justify dropping a shell. |
| M-C-15 | Tilde and history expansion: rare in scripts. | An agent-failure sample shows it. |
| M-C-18 | Bracing and backticks: style; SC2006 already covers backticks. | Never; listed under "not a defect". |
| M-F-15 | checkbashisms and posh as extra checks: shellcheck `-s sh` plus a dash run cover 22 of 25 probes. | A bashism escapes both. |
| M-F-16 | Pre-commit hooks: 0 in the fleet. | The owner asks for local hooks. |
| M-G-07 | kcov coverage: bash only, C-oriented. | Never for this set. |
| M-G-08 | shfmt drift in test fixtures. | The gate dive finds fleet drift. |
| M-M-17 | Completions per shell: CLI-14 already says they are per-shell. | ocx completion work starts. |
| M-M-18 | Parity tests across `Shell` arms: ocx already has PARITY_ARMS. | A second emitter in the fleet. |
| M-P-07 | PowerShell 2.0 removal. | Never: informational. |
| M-S-05 | `.ps1` line endings: 0 CRLF in the fleet, harmless to PowerShell. | A CRLF-caused failure. |
| M-U-05 | ConstrainedLanguage: no fleet target under WDAC. | An enterprise adopter asks. |
| M-U-06 | Credentials in PowerShell scripts: none in the fleet. | A fleet script handles credentials. |
| M-W-05 | Review skill: the rules plus the gate cover review. | Two waves of adopter feedback ask for it. |

### Sibling and catalog defects: owner action needed

| M-ID | Why | Promotion |
|---|---|---|
| M-X-01 | The checker lints no fenced blocks (628 sh/bash blocks). | The owner files a checker issue; the shell gate dive supplies the command. |
| M-X-02 | The catalog has zsh `nomatch` failures in 5 places. | The owner files issues against docs-quality, docs-plan, bazel-quality, jvm-release and bazel-adopt. |
| M-X-03 | 136 of 155 depth files autoload. | The owner schedules a catalog-wide backfill. |
| M-X-04 | The nix-flake-adopt GHA sentence. | The owner files an issue against nix-flake-adopt. |
| M-X-05 | The catalog's verification dialect (`grep --include`, `rg`). | Wave-2 `userland-floor` proposes a dialect; the owner adopts it catalog-wide. |
| M-X-06 | The fleet's native `quality-bash.md` copies. | Replaced when shell-quality is installed in those four repos. |

## Questions for the owner

Frame Q3 (fish/nu/elvish integration first), Q4 (Windows host probes under `C:\Users\ecom\shell-wintest`) and Q5 (no macOS; read-only labels) were re-examined and stand unchanged; they are applied, not asked again.

1. **Dialect floors (revises Q1).** Installers, bootstrap and login-shell snippets use POSIX sh. Every other bash script holds a bash 3.2 floor unless its header names a pinned interpreter; bash 4+ only behind a `BASH_VERSINFO` guard.
   *Default:* as stated. The fleet already complies, with 5 of 166 files to guard.
2. **Error model.** Bash scripts: `set -euo pipefail` (no `IFS` line), with SC2310 and SC2312 enabled. Sh scripts: `set -eu` plus probed pipefail. Installers: `set -u` plus explicit checks. Sourced libraries: no options.
   *Default:* yes; wave 2 may demote SC2310 if the 69 sites are benign.
3. **shfmt style.** `indent_size = 4` plus `switch_case_indent = true` in `.editorconfig` (the fleet house style: 161 of 197 clean), and the gate passes no style flags.
   *Default:* yes. Say if you want 2 spaces, the corpus majority and Google's choice.
4. **CI and Taskfile globs.** `shell-quality` also loads on `.github/workflows/*.y*ml`, `action.y*ml` and Taskfiles. It would be the first catalog rule to glob workflows.
   *Default:* yes for all three; `ci.md` moves to a CI set if one is ever created.
5. **PowerShell floor (revises Q2).** Installers and bootstrap: 5.1. Everything else: 7.6 LTS, not 7.4, which reaches end of support on 2026-11-10.
   *Default:* yes.
6. **Exit codes.** CLIs written in shell mirror the Rust cli-contract table. Installers keep the www-setup 0-7 table. Both document the 143/271/399 signal variance.
   *Default:* yes.
7. **Security findings (Q6 says report, not fix).** These findings are security-relevant:
   - the PowerShell curly-quote injection in ocx (`crates/ocx_shell/src/shell/escape.rs:35`) and in direnv, starship, mise and zoxide;
   - the `${{ inputs.release_tag }}` injection at `www-setup/.github/workflows/test-installers.yml:206-207`;
   - `exit` inside `irm | iex` in `www-setup/src/install.ps1`.

   *Default:* the program files nothing. The reproducers stay in the audit and the wave-2 emit dive. You decide on ocx and www-setup issues and on private advisories upstream.
8. **Extension convention.** Authored scripts carry an extension, because no rule can load on a shebang-only file. Extensionless names are kept for tool-managed hooks and installed entry points, and the gate finds those by shebang.
   *Default:* yes.

## Explicitly not a defect

- `local` in a `#!/bin/sh` script whose targets exclude ksh93, with the reasoned SC3043 directive (conflict 13).
- `set -u` without `set -e` in installers and checks that test every fallible call explicitly (rustup model; the swift checks).
- No `set -e` in a sourced library (nvm model).
- `[ ]` in a bash script, and `[[ ]]` in a bash script (conflict 11).
- `#!/usr/bin/env bash`, and `#!/bin/bash` where a 3.2 floor is intended (conflict 14).
- Bare `$var` without braces; `require-variable-braces` is optional and off.
- An adopter repo whose `.editorconfig` pins a different shfmt style.
- `Write-Host` in installers and interactive scripts.
- A `.sh` file with a bash shebang; shfmt and shellcheck honour the shebang.
- The ocx toolchain trampolines under `.ocx/toolchain/shells/`: generated and gitignored, outside the gate on purpose.
- Bash-only syntax (`$'..'`, arrays, `[[`) in a script whose shebang says bash.
- An ASCII-only `.ps1` without a BOM.
- `cmd || true` with a comment that says why the failure is ignored.
- SC2317 or SC2329 disabled, with a reason, on trap handlers and dispatch tables.
- Non-ASCII in the comments of a bash repo script (only yash in the C locale breaks, and installers are excluded).
- 2-space or tab indentation in vendored upstream scripts (uv, devcontainers), which are outside the gate.
- A macOS claim labelled "unverified: read only".
- A Taskfile cmd using arrays, `[[`, `declare -A`, `mapfile` or `local`: mvdan/sh in task 3.53.1 accepts them ([fleet] #12).
- SC3040 on a pipefail line inside the subshell probe.

## Frame corrections

- `.sh` count is 647 (raw, after exclusions), not ~1450; authored 187 [fleet], [cfg] §6.4.
- Extensionless `#!/bin/sh` files are 389-393, not ~1100; 313-376 are gitignored ocx toolchain trampolines and only 6 are authored [fleet] #3, [cfg] §6.4.
- `.bash` count is 5, not 132; `.ps1` 23-25, not 49; `.fish` 6, not 22; `.nu` 3, not 21 [fleet] contradictions.
- H1 is refuted: 0 of 190 sh-shebang scripts carry an SC3xxx (exemplars 3.5%) [fleet] #6, [ex].
- H2 is split: errexit is present in 77% of non-snippet bash and never in sh; the hazard is SC2310 ×69 / SC2312 ×150 suppression, not cargo-culting [fleet] #9.
- H3 is confirmed and sharpened: PowerShell curly quotes U+2018-201B escape the literal (ocx `escape.rs:35` plus four upstreams), and a shared POSIX quoter fails 17-18 of 20 cases on fish/nu/elvish [ocx], [emit].
- H4 is refuted for installers (they are POSIX and probe tools); GNU-isms sit in `test/manual` and the Swift checks; but www-setup's installer crashes on busybox wget [fleet] Axis 5, [inst].
- H5 is confirmed and extended: a mid-script native failure in a pwsh step is invisible on 5.1 and 7.6.6 [plat].
- H9 is split: nu churns most (4.5% vs fish 0.6%), but ocx's emitted nu passes 0.105.1 and 0.116.0 behind its `describe` guard [ex], [ocx].
- ocx ships no installer pair (`installers = []`); the 5-dialect installers live in `www-setup/src`, and grimoire uses a cargo-dist 0.33.0 front door [ocx], [inst].
- The `code-docs` rule globs the shell extensions but carries no shell checks [cfg].
- nushell's current release is 0.116.1 (2026-10-04), not 0.116.0 [canon], [shift] §9.
- zsh 5.9.1 (2026-05-31) and 5.9.2 (2026-07-12) exist; 5.10 is unreleased [shift] §6.
- `elvish -compileonly` exists and works on 0.21.0 (55/55 planted errors); [ocx]'s "does not exist" is wrong [inst], [ex].
- Debian 13 drops yash but keeps posh 0.14.1 [shift] §5.
- A dash version string does not identify its features: Debian 0.5.12-12 accepts pipefail, while 0.5.12-2 and 0.5.12-6ubuntu5 reject it [shift] §3, [plat].
- `ubuntu-latest` moves to Ubuntu 26.04 between 2026-10-19 and 2026-11-19 (bash 5.3.9, uutils, ShellCheck 0.11.0) [shift] §13.
- Ubuntu 25.10+ ships uutils coreutils, not GNU, for `date`/`ls`/`sort` and friends [shift] §12.
- Rule frontmatter has no `description` or `metadata`; it is `paths`, `summary`, `keywords`, `license`, `repository` at top level [cfg] §1.2.
- The never-matching depth-file glob is adopted by only 19 of 155 depth files, and the checker does not enforce it [cfg] §1.6.
- `**/.shellcheckrc` matches 0 fleet files, and the only PSScriptAnalyzer settings file is www-setup's [cfg] §6.
- No glob form can reach a shebang-only script on any client or in the checker; the frame's artifact table implied the rule would cover them [cfg] §2.4.
- GHA's Windows `shell: bash` is Git Bash 5.3.15 on windows-2025; the host's Git Bash is 5.2.15 [plat], [shift] §13.
- PowerShell 7.4 is no longer a floor to write: it and 7.5 reach EOS 2026-11-10, so Q2's "pwsh 7.4+ elsewhere" becomes 7.6 LTS [shift] §11.

## Wave 2 landed (2026-10-11)

Seven consolidations are on disk. Counts were re-taken from rule headers on 2026-10-11, with one `grep -E '^\*\*(SH|PS)-'` per file and a `Severity:` line count for shell-expansion.md. Totals: **199 IDs, 124 MUST, 12 families**: SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-GATE, SH-EMIT, SH-CI, PS-COMPAT, PS-ENC, PS-ERR, PS-NATIVE and PS-GATE. Eight families are still unopened: SH-INST, SH-SEC, SH-TEST, SH-ZSH, SH-FISH, SH-NU, SH-ELV and PS-SEC. SH-CORE and PS-CORE are index-only.

### (a) Per group

- **dialect**: `shell-dialect.md`. SH-DIAL-01..12, 17, 18, 21..23, 25..28 and SH-USER-01..16. 37 IDs, 23 MUST.
  - Conflicts resolved: 8 in its table. The load-bearing ones:
    - File discovery is git-fed (conflict 5).
    - `xargs -r` is always used (conflict 8, X7 on 4 images).
    - The guard exits 69.
    - Guards test the scalar `BASH_VERSINFO`, never index an array.
  - Follow-ups named:
    - busybox Kconfig options for `-print0`, `xargs -0` and `-r`
    - uutils 0.12
    - NFS `mkdir` lock
    - BSD on a real host
    - signal re-raise
    - the SC2317 allow-row
- **errexit**: `shell-errexit.md`. SH-ERR-01..28. 28 IDs, 17 MUST.
  - Conflicts resolved:
    - C-1: SC2310 is enabled at SHOULD and SC2312 is not enabled. This dissents from SH-GATE-02.
    - The SH-ERR-25 kind tables carry a gate carve-out (64/65/66/69/70).
    - SIGPIPE has one owner (map conflict 18).
  - Follow-ups named:
    - hardened shopts (`nullglob`/`failglob`)
    - the SC2310/SC2312 burn-down
    - Git Bash signals
    - the fish, nu, elvish and pwsh cleanup models
    - FreeBSD/macOS
- **expansion**: `shell-expansion.md`. SH-EXP-01..23. 23 IDs, 17 MUST.
  - Conflicts resolved:
    - C1: SC2046 is a warning and SC2068 an error, not info.
    - C2: actionlint runs at default severity with `--exclude=` of named style codes.
    - C3: echo scope.
  - Follow-ups named: option-and-pattern injection, arithmetic reach, macOS/BSD evidence, zsh semantics.
- **gate**: `shell-gate.md`. SH-GATE-01..20. 20 IDs, 14 MUST.
  - Ships a five-key `.shellcheckrc`, `.editorconfig`, `.gitattributes` and the 99-line `scripts/shell-gate.sh` (exits 0/1/69/78/79).
  - Follow-ups named:
    - the gate on Windows and macOS
    - the burn-down
    - a fenced-block lint (M-X-01)
    - hooks and checkbashisms
    - older toolchains
    - open G1-G8; G5 places the script at `shell-quality/checks/shell-gate.sh`
- **pwsh**: `shell-pwsh.md`. PS-COMPAT-01..10, PS-ENC-01..06, PS-ERR-01..08, PS-NATIVE-01..03 and PS-GATE-01..10. 37 IDs, 22 MUST.
  - 13 conflicts resolved. The load-bearing ones:
    - ParseError goes in every Severity.
    - `-UseBasicParsing` is MUST, measured.
    - The AST is the check of record over greps.
    - Floor 7.6.
    - `$PSNativeCommandUseErrorActionPreference` is 7.4+.
    - `Write-Host` is decided by kind.
  - Follow-ups named:
    - pwsh 7 encoding on Windows
    - `Test-CommandResolves` precision
    - the GHA wrapper on a hosted runner
    - `irm` after KB5129195
    - non-1252 hosts
    - PSSA main
    - `IncludeRules` vs ParseError
- **emit**: `shell-emit.md`. SH-EMIT-01..32. 32 IDs, 17 MUST.
  - 12 conflicts resolved: `source <(` versions, yash, ASCII and no BOM for 5.1, nu `login.nu` order, zoxide and starship scope, SC2029 not admissible.
  - Follow-ups named:
    - completions registration (M-M-17)
    - cmd.exe Batch emission
    - dir-change and pre-exec hooks
    - hosts not available here (macOS, pwsh 7 on Windows, elvish on Windows, sshd)
- **ci**: `shell-ci.md`. SH-CI-01..22. 22 IDs, 14 MUST.
  - 14 conflicts resolved:
    - actionlint severity: default wins (C2, C13).
    - The UTF-16 rationale is refuted (C7).
    - `read -p` is not a Taskfile rule.
    - Container jobs are new (SH-CI-04).
    - www-setup injection: 6 sites.
  - Follow-ups named:
    - a real-runner probe workflow
    - Taskfile currency on Windows
    - the SH-CI-07 scope (`steps.*`/`needs.*` outputs, zizmor persona)
    - 21 unaudited GitLab CI files

### (b) Surprises

1. **Container jobs run `sh -e` inside the image** (SH-CI-04, C4: `[[: not found` on debian:12, and the step stays green).
   - Verdict: **fold**, already ruled in shell-ci.md.
   - The real-runner confirmation is a measurement the corpus cannot supply. It needs a push and dispatch to a repo, so it is deferred to the owner (shell-ci open question "Real-runner probe").
2. **PowerShell curly-quote injection executes in ocx, direnv 2.37.1 and mise 2026.10.2** on pwsh 7.4.7, 7.6.6 and WinPS 5.1.26100.9444. The orchestrator confirmed it with `fixtures/orch-verify/inj.ps1`. zoxide is not affected; starship shows a parse error only (shell-emit.md conflicts 6-7).
   - Verdict: **fold** into SH-EMIT-03 (done).
   - Disclosure is an owner decision. Default: the program files nothing (Q7). Correct Q7's list to "ocx, direnv, mise execute; starship parse error; zoxide not affected".
3. **A lone WinPS 5.1 `>>` into `$GITHUB_ENV` decodes fine; mixing writers and `Add-Content` corrupt** (SH-CI-11, C7, C9).
   - Verdict: **fold**, and resolve against PS-ENC-03 in (e) X8.
4. **PSSA fails open.** No fleet settings file lists ParseError, and `PSUseCompatibleSyntax` is blind to 4 constructs (shell-pwsh.md verdict 2, 6; R2, R3).
   - Verdict: **fold**, ruled in PS-GATE-01..04.
5. **Bash runs only element 0 of an array `PROMPT_COMMAND` on 3.2-5.0** (SH-EMIT-24; 40-scenario matrix).
   - Verdict: **fold**, ruled.
6. **`source <(...)` works from bash 4.0 in default mode; on 3.2 it is a silent no-op** (shell-emit.md conflict 2).
   - Verdict: **fold** into SH-EMIT-13. Correct M-M-10.
7. **busybox grep rejects `--include` and the error hides behind a pipe** (shell-dialect.md conflict 5, T4 row; UF V3).
   - Verdict: **promote** to the cross-cutting dive `gate/verify-dialect`. It decides the catalog verification dialect (M-X-05) and binds every shipped check.
8. **SC2312 dispute between SH-ERR-07 and SH-GATE-02/19.**
   - Verdict: an owner decision with the default in (e) X4. It is **promoted** into `errexit/shopts-and-burndown` for the burn-down numbers that settle the default.
9. **Taskfile traps**:
   - `set -o pipefail` as its own cmd item does not carry.
   - `shopt: [pipefail]` panics or errors.
   - `status:` ignores `set:` ([go-task/task#2469](https://github.com/go-task/task/issues/2469)) (SH-CI-17, C12).
   - Verdict: **fold**, ruled.
   - Re-checks per task release are dated.
10. **`ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19.** The plain image ships uutils 0.10.0 (SH-CI-15, V21).
    - Verdict: **defer** with a date, as SH-CI-15 expires 2026-11-19. Re-check the runner README after the window.
11. **`Invoke-WebRequest` without `-UseBasicParsing` fails on 5.1.26100.9444** (PS-COMPAT-06, R5).
    - Verdict: **fold**, ruled.
12. **`exit` under `irm | iex` kills the caller's shell on all three engines** (PS-ERR-05, R8; www-setup `install.ps1:182,734`).
    - Verdict: **fold**. The installer half goes to `installer/ps1-front-door`.
13. **ocx's rc writer breaks the target-file, symlink and mode rules** (SH-EMIT-16, 19; real binary).
    - Verdict: **reject** as a rule change; report to the owner under Q6. It is evidence for `installer/sh-contract`.
14. **The SH-USER-12 atomic `mv` contradicts SH-EMIT-19's "never rename onto the rc path"**, found in this cross-read.
    - Verdict: **fold**, resolved in (e) X19.
15. **`grimoire@4650ad830375:.github/workflows/release.yml:230:59`: actionlint reports `property "output" is not defined`** (shell-ci.md C13).
    - Verdict: **reject** for the rules. It is an owner action, an unrelated defect.
16. **ConvertFrom-Json turns an ISO-date string into `[DateTime]`** on 7.4.7/7.6.6 (SH-EMIT-07).
    - Verdict: **fold**, ruled.
17. **`bash -n` misses unterminated arrays on 3.2-5.1, and shfmt treats a shebang-less `.sh` as bash** (SH-GATE-11, SH-DIAL-01).
    - Verdict: **fold**, ruled.
18. **SH-CI and SH-EXP cite IDs that do not exist**: SH-GATE-27, SH-GATE-32 and BVG-02/03 (shell-ci.md:37,191,201,131), plus the stale SH-EXP cross-refs.
    - Verdict: **fold**. The drafters re-point them per (e) X7.

### (c) Map rows affected

Consolidated with no row left open:
- A (SH-DIAL) except M-A-17
- B (SH-ERR)
- C (SH-EXP) except M-C-20 (goes to W3-7)
- D (SH-USER) except M-D-07 and M-D-15 (go to W3-7)
- F (SH-GATE) except M-F rows on hooks
- H (SH-CI)
- M (SH-EMIT) except M-M-17
- P (PS-COMPAT)
- Q (PS-ERR)
- R (PS-NATIVE)
- S (PS-ENC)
- T (PS-GATE) except M-T-04 and M-T-05 (go to W3-6)

Row text corrections:
- M-B-03: the `(( ))`/`[[ ]]` errexit boundary is bash 4.1, not 4.2.
- M-B-06: empty `"$@"` fails only on posh; `"${@}"` fails on 3.2.
- M-H-07: `read -p` works in task 3.53.1-3.54.0 (V16). Drop it from the row.
- M-M-10: `source <(` works in bash 4.0-5.0 default mode, but `--posix` fails before 5.1 and 3.2 is a silent no-op.
- M-Q-01: 7.4+, not 7.3+.
- M-U-02: carried as PS-GATE-07. PS-SEC cites it.

Rows moved family:
- M-S-01..04 now sit under PS-ENC in shell-pwsh.md.
- M-R-01, M-R-02 and M-R-04 now sit under PS-NATIVE in shell-pwsh.md.

Status changes:
- M-X-05 is now answered by the dialect group. Its binding form is in the authoring notes once the verdict is ready-to-draft. Until then `gate/verify-dialect` owns it.
- M-M-17 is promoted from Deferred into `emit/completions-and-dir-hooks`: grim and ocx both ship completion emitters, so the trigger in Deferred has fired.
- M-X-01 and M-X-02 stay with the owner.

### (d) Frame corrections

- Map conflict 3 was wrong about yash: yash 2.52 supports `pipefail`.
- The errexit boundary is bash 4.1, not 4.2 (M-B-03).
- `xargs -r`: the map's reasoning is inverted. Always pass `-r` (SH-USER-08, X7).
- `which` is absent on 8 of 21 images, not 7. "macOS `/bin/sh` is dash" appears in 6 repos, not 4.
- SC2046 is a warning and SC2068 an error, not info (shell-expansion.md C1).
- busybox `getopt` supports long options.
- nushell `login.nu` loads before autoload (shell-emit.md conflict 5).
- `$PSNativeCommandUseErrorActionPreference` is 7.4+ (shell-pwsh.md conflict 6).
- H5 is refined: GHA `shell: pwsh` is last-native-wins, not invisible (shell-pwsh.md verdict 3).
- Q7: `test-installers.yml` has 6 injection sites, not 2 (shell-ci.md conflict 11). The tool list is ocx, direnv and mise (execute) plus starship (parse error). zoxide is not affected.
- The WinPS 5.1 `>>` failure is writer mixing, not "the runner cannot parse UTF-16" (C7).
- The gate's "missing input" exit is 79, not 66 (SH-GATE-08).
- The docker-install trap citation `install.sh:809-813` is wrong; the trap is in `rootless-install.sh:265`. W3-1 must use the corrected line.
- Ubuntu 26.04 has a mixed userland (`cp`/`mv` are GNU, `date`/`ls`/`sort` are uutils).

### (e) Cross-consolidation contradictions

Each item gives the pair, then the resolution, then whose text the drafters keep. No consolidation is edited.

- **X1, file discovery.**
  - Pair:
    - Use `grep -r --include ... .`: SH-ERR G-* gates (shell-errexit.md:248-252), SH-GATE-01/05/06/13/15/16 verify cells, SH-EXP and SH-CI verify cells.
    - Use git-fed discovery: SH-GATE-09 and SH-DIAL conflict 5.
  - Resolution and owner:
    - SH-GATE-09 keeps the text. Shell files come from its `files()`.
    - Every other verification lists files with `git ls-files -z -- DIR` and matches with `xargs -0 -r grep`. See the authoring notes once drafted, and `gate/verify-dialect`.
- **X2, SC3040 directive.**
  - Pair: SH-ERR-13 uses a bare directive; SH-DIAL-08 and SH-GATE-07 require a reason.
  - Resolution and owner: SH-DIAL-07/08 keep the text. SH-ERR-13 and SH-CI-03 become pointers.
- **X3, SC3043 reason text.**
  - Pair: SH-DIAL-17 and the SH-GATE-07 table differ.
  - Resolution and owner: SH-DIAL-17 keeps the text. The SH-GATE-07 row cites it.
- **X4, SC2312.**
  - Pair: SH-GATE-02 (five-key rc with `enable=check-extra-masked-returns`) and SH-GATE-19 (`SHELLCHECK_OPTS`) against SH-ERR-07 (not enabled; C-1).
  - Resolution and owner: SH-ERR-07 keeps the text, by owner default. SH-GATE-02 becomes four keys and the SH-GATE-19 `-o` list drops `check-extra-masked-returns`. `errexit/shopts-and-burndown` supplies the burn-down counts to the owner.
- **X5, gate exit codes.**
  - Pair: SH-ERR-25's gate carve-out (64/65/66/69/70) against SH-GATE-08 (69/78/79).
  - Resolution and owner, by owner default:
    - SH-GATE-08 keeps the text for every new gate script.
    - The SH-ERR-25 carve-out covers only existing checks it names.
    - The SH-ERR-25 gate row cites SH-GATE-08.
- **X6, actionlint configuration.**
  - Pair: SH-GATE-19 (default severity, `-o` list) against SH-EXP C2 (`--exclude=` named style codes) and SH-CI-19 ("the actionlint exclusion list").
  - Resolution and owner:
    - Default severity is settled: SH-GATE-01 keeps the text, and SH-CI conflict 2 agrees.
    - SH-GATE-19 keeps the invocation.
    - An `--exclude=SCnnnn` is allowed only for a code the SH-GATE-07 allow table lists with a reason. The only measured candidate is SC2129 (SE-10, C13 5 hits).
    - SC2086 and SC2046 are never excluded (SH-GATE-06).
    - SH-CI-19 points at the SH-GATE-07 table.
- **X7, stale cross-refs.** The drafters re-point each one:
  - SH-EXP-20 → SH-ERR-12, not SH-ERR-09.
  - SH-EXP-16 and the hand-offs → SH-CI-07/08, not SH-CI-03/04, and → SH-EMIT-03, not SH-EMIT-06/07.
  - SH-CI "SH-GATE-01/27" (shell-ci.md:37,201,289) → SH-GATE-01 and SH-GATE-19.
  - SH-CI-22's "SH-GATE-32" (shell-ci.md:191) does not exist. Drop it.
  - SH-CI-13's "BVG-02/03" (shell-ci.md:131) → SH-DIAL-06 and SH-DIAL-25.
  - SH-CI-12's "PS-ERR-01 (MUST) and PS-ERR-04 (SHOULD, 7.x)" → PS-ERR-03 (MUST), because in shell-pwsh.md PS-ERR-04 is the entry-point exit rule.
- **X8, the 5.1 runner-file writer.**
  - Pair:
    - SH-CI-11 (MUST): only `Out-File -Encoding utf8 -Append`.
    - PS-ENC-03 (MUST): never `Out-File`, never `-Encoding utf8` in 5.1-bound code.
    - shell-pwsh.md owner Q7 defaults to `[IO.File]::AppendAllText` with `UTF8Encoding($false)`.
  - Resolution and owner:
    - PS-ENC-03 keeps the writer text. A `.ps1` writes `$GITHUB_ENV`/`PATH`/`OUTPUT` with `AppendAllText` and no BOM.
    - SH-CI-11 keeps its bans: no `>>`, no bare `Add-Content`, no two writers on one file. It keeps its C7/C9 evidence.
    - SH-CI-11 accepts `Out-File -Encoding utf8 -Append` only inside a `shell: powershell` step body, where the runner gives each step a fresh file.
- **X9, the pwsh run-step guard level.**
  - Pair: SH-CI-12 (SHOULD) against PS-ERR-03 (MUST).
  - Resolution and owner: PS-ERR-03 keeps the text. SH-CI-12 is DROPPED to a pointer row. Its check `pwsh-run-lint.py` goes to PS-ERR-03.
- **X10, custom shell templates.**
  - Pair: SH-CI-05, worded universally, against PS-GATE-08 and PS-ERR-03 (`powershell -NoProfile -NonInteractive -File {0}`).
  - Resolution and owner:
    - SH-CI-05 is scoped to bash templates and keeps its text.
    - PowerShell templates are PS-GATE-08's text.
    - Both share "bare interpreter name plus `{0}`, never a path".
- **X11, layered quoting.**
  - Pair: SH-EXP-16 and SH-EMIT-10.
  - Resolution and owner:
    - SH-EXP-16 keeps the text. SH-EMIT-10 becomes "SH-EXP-16 applies to emitted text" plus the `layers.sh` check.
    - SC2029 is not admissible in either (shell-emit.md conflict 8; SH-EXP-16 already says so).
- **X12, `$'..'` and the posix matrix.**
  - Pair: SH-DIAL-09 and SH-DIAL-04 against SH-EMIT-12 and SH-EMIT-15.
  - Resolution and owner:
    - Scopes differ: authored versus emitted. Both IDs stay.
    - SH-EMIT-12/15 cite SH-DIAL-09/04.
    - SH-DIAL-04 owns the interpreter list.
- **X13, the tell list.**
  - Pair: SH-GATE-20's greps overlap SH-USER-01 (`readlink -f`, `sed -i`), SH-USER-04 (`which`), SH-DIAL-12 (`echo -e`), SH-EXP-13 (`eval`), SH-ERR-10 and SH-EMIT-13 (`source <(`).
  - Resolution and owner:
    - The owners keep the rule text.
    - SH-GATE-20 becomes the SH-CORE tell table (M-O-03), one row per tell, each naming its owner ID.
    - `source <(` version facts are SH-EMIT-13's.
- **X14, version sniffing.**
  - Pair: SH-USER-05 against SH-CI-15 (second grep) and SH-EMIT-30.
  - Resolution and owner: SH-USER-05 keeps the text. The other two cite it.
- **X15, Git Bash.**
  - Pair: SH-USER-15 (CONSIDER) and SH-CI-14 (SHOULD).
  - Resolution and owner: SH-USER-15 keeps the facts. SH-CI-14 keeps only the CI grep and cites SH-USER-15.
- **X16, non-ASCII in sh.**
  - Pair: SH-GATE-16 (MUST for installers, SHOULD otherwise) against `scripts/shell-gate.sh`, which fails every `#!/bin/sh` file.
  - Resolution and owner: SH-GATE-16 keeps the text. The shipped script warns, exit 0, for non-installer kinds. SH-EMIT-08 and PS-ENC-01 are consistent with this.
- **X17, verifier semantics.**
  - Pair: SH-ERR-24 ("judge each tool by its exit status") against the cells' "output is the violation; empty means pass" (SH-CI preamble, M-O-07).
  - Resolution and owner: no conflict once scoped. Shipped check scripts follow SH-ERR-24; inline verification cells follow output semantics.
- **X18, `xargs -r` portability.**
  - Pair: shell-emit.md owner Q5 ("GNU only") against SH-USER-08 (X7: GNU, busybox 1.37, uutils; BSD no-op, read only).
  - Resolution and owner: SH-USER-08 keeps the text. Emit Q5 is superseded.
- **X19, atomic replace against rc writes.**
  - Pair: SH-USER-12 (SHOULD: temp file in the destination directory, then `mv` onto the name) against SH-EMIT-19 (MUST: never rename a temp file onto the rc path; keep mode and owner; resolve symlinks).
  - Resolution and owner:
    - SH-EMIT-19 keeps the text for any user-owned config or possibly-symlinked file.
    - SH-USER-12 is scoped to files the script owns, and gains a one-line exception citing SH-EMIT-19.
- **X20, sourced library shape.**
  - Pair: SH-DIAL-01/26, SH-GATE-18 (allows `shell=dash`) and SH-ERR-11.
  - Resolution and owner:
    - SH-DIAL-26 keeps the header text and SH-DIAL-01 the directive values (`sh` or `bash`). SH-GATE-18 drops `dash`.
    - SH-ERR-11 keeps "sets no options".
    - The extension is SH-DIAL-21's; SH-GATE-18 cites it.
- **X21, kind tables.**
  - Pair: SH-DIAL T3 against SH-ERR-23 and SH-ERR-25.
  - Resolution and owner:
    - SH-ERR-23 keeps the prologue text. SH-DIAL-03 keeps the header and floor columns.
    - SH-ERR-25 keeps the exit table, subject to X5.
    - T3 cites SH-ERR-23 instead of repeating the prologue.
- **X22, empty arrays.**
  - Pair: SH-EXP-20 and SH-ERR-12.
  - Resolution and owner: SH-ERR-12 keeps the text, both policy and idiom. SH-EXP-20 becomes a pointer plus the 3.2 measurement.
- **X23, echo.**
  - Pair: SH-DIAL-12 (sh constructs) and SH-EXP-09 (data in any dialect).
  - Resolution and owner: both stay, with their scopes stated.
- **X24, `test -a/-o`.**
  - Pair: SH-DIAL-11 and SH-EXP-08.
  - Resolution and owner: SH-DIAL-11 keeps the text.
- **X25, sh subset.**
  - Pair: SH-DIAL-02 against SH-EXP-10 and SH-EXP-12.
  - Resolution and owner: SH-DIAL-02 owns the dialect gate. SH-EXP-10/12 keep only the tells ShellCheck misses, such as `${x@Q}`.
- **X26, pipeline readers.**
  - Pair: SIGPIPE in SH-ERR-09 and SH-CI-16; xargs in SH-USER-08 (`-r`) and SH-EXP-14 (`-0`); IFS in SH-ERR-03.
  - Resolution and owner: SH-ERR-09, SH-USER-08, SH-EXP-14 and SH-ERR-03 own their parts. SH-CI-16 is the CI trigger.
- **X27, eval of captured output.**
  - Pair: SH-ERR-10 (MUST, no `eval "$(cmd)"` in installer, CI and dev scripts) and SH-EMIT-14 (SHOULD, `out=$(tool) || return; eval "$out"` in rc consumption).
  - Resolution and owner: consistent (capture first). Both stay with their scopes.
- **X28, execution policy.**
  - Pair: PS-GATE-07 against the future PS-SEC.
  - Resolution and owner: PS-GATE-07 keeps the text. W3-2 cites it.

### (f) Convergence

The wave-plan stop condition is not met:
- Wave 2 yielded 124 MUST rules. Each one is new by construction, since wave 1 had none.
- Wave 2 found new failure classes: container-job `sh -e`, writer mixing, `PROMPT_COMMAND` element 0, Taskfile item scope, PSSA fail-open.
- Eight families have no consolidation.
- No held-out round has run.

Verdict: **needs-another-round**.

Open questions by class:
- **Dated re-checks.** These do not block drafting:
  - uutils 0.12
  - the ShellCheck master SC2337
  - task and mvdan/sh releases (`Taskfile.assoc.yml`, C12)
  - `ubuntu-latest` 26.04 (SH-CI-15, until 2026-11-19)
  - pwsh 7.4/7.5 EOS 2026-11-10 (the PS-COMPAT-01 parse matrix column)
  - `irm` after KB5129195
  - PSSA main
  - bash 5.3 interpreter changes
- **Measurements the corpus cannot supply.** Each is labelled "unverified: read only" or left to the owner:
  - macOS and BSD userland, login order and `/bin/bash` 3.2.57
  - a real GHA runner: container default, defaults merge, Git Bash 5.3.15, 26.04 coreutils (needs a push)
  - non-1252 ANSI hosts
  - NFS `mkdir` locks
  - a real sshd
- **Owner decisions with the default applied:**
  - SC2312 (X4)
  - gate exit codes (X5)
  - the SC2317 allow-row (default: not allowed)
  - header ratchet on existing files (default: new and edited files only)
  - bash-4 pinning (default: the 3.2 floor unless `# bash-floor:`)
  - fleet `defaults.run.shell` and the mirror generator (default: no)
  - zizmor adoption (default: required by SH-CI-21, with greps as the fallback)
  - shipping check assets under `rules/<rule>/checks/` (default: yes)
  - disclosure of the curly-quote and test-installers injections (default: file nothing, Q7)
- **Answerable now, by fixture runs on this host.** These are load-bearing:
  - the busybox/GNU/uutils verification dialect (X1, M-X-05)
  - the SC2310/SC2312 burn-down
  - `nullglob`/`failglob`
  - Git Bash signal statuses
  - pwsh 7.6 Windows encoding
  - `Test-CommandResolves` false-positive rate
  - completions and dir-hook coexistence
  - Taskfile on Windows
  - every unopened wave-3 family

### (g) Next wave

The revision and cross-cutting dives run first. Wave-3 briefs are revised with the wave-2 facts.

1. `gate/verify-dialect`: proves the catalog verification shape (git-fed lists, `-e`, `xargs -r`) red and green on GNU, busybox 1.37 and uutils 0.10. Why: X1 and M-X-05 bind every shipped check.
2. `errexit/shopts-and-burndown`: SC2310/SC2312 counts over the authored fleet, `nullglob`/`failglob`, and Git Bash signals on the host. Why: X4 needs numbers, and SH-EXP-21 depends on the shopt verdict.
3. `pwsh/windows-7x-and-resolver`: pwsh 7.6 encoding and console on the Windows host, `Test-CommandResolves` false positives, `IncludeRules` against ParseError, and the X8 writer. Why: these are open PS-ENC and PS-GATE-06 levels.
4. `emit/completions-and-dir-hooks`: M-M-17 completions, dir-change and pre-exec hooks against bash-preexec/ble.sh, and the cmd.exe Batch corpus. Why: live fleet emitters with no rule.
5. `ci/outputs-scope-and-taskfile-windows`: `steps.*`/`needs.*` outputs, the zizmor persona, Taskfile on Windows, and the 21 GitLab CI files. Why: the SH-CI-07 scope and SH-CI-20 level are open.
6. `installer/sh-contract` (W3-1, revised). Why: SH-INST is unopened, and installer-script depends on it.
7. `installer/ps1-front-door` (W3-2, revised). Why: PS-SEC is unopened.
8. `alt-shells/zsh` (W3-3, revised: absorbs the expansion zsh-semantics follow-up, SH-ERR-27 and M-X-02). Why: SH-ZSH is unopened.
9. `alt-shells/fish` (W3-4, revised: absorbs the fish cleanup model and SH-EMIT-17/26). Why: SH-FISH is unopened.
10. `alt-shells/nu-and-elvish` (W3-5, revised: `login.nu` order, 0.107 hook order, `get -o`, cleanup models). Why: SH-NU and SH-ELV are unopened.
11. `testing/bats-pester-matrix` (W3-6). Why: SH-TEST is unopened, and the Pester pin feeds PS-GATE.
12. `security/injection-and-secrets` (W3-7, revised: absorbs the expansion option/pattern-injection and arithmetic-reach follow-ups, SH-EXP-13/16/19, M-C-20, M-D-07, M-D-15). Why: SH-SEC is unopened.
13. `skills/diagnose-and-port` (W3-8, revised to cite the wave-2 IDs, with M-IDs for wave-3 families). Why: the four skills need a symptom table and port receipt.

After this wave: consolidate with stable IDs, then run one held-out round. Sample exemplar repos outside the 30-repo corpus and check each new MUST and failure class. Draft when that round is clean.

## Wave 3 landed (2026-10-11)

Twelve consolidations are on disk: five revised wave-2 files (gate, errexit, pwsh, emit, ci), five new ones (installer, alt-shells, testing, security, skills), and two unchanged since wave 2 (dialect, expansion). Counts were re-taken from the rule headers on 2026-10-11: one awk over the `^\*\*(SH|PS)-` header lines per file, the `- Severity:` lines for shell-expansion.md, and the CI header list read by hand (SH-CI-20 is SHOULD with a conditional promotion; SH-CI-05 is MUST NOT; SH-CI-12 is a pointer row). Rules with a split severity (SH-ZSH-08, SH-USER-07, SH-USER-10, SH-INST-09) count as MUST.

Totals: **371 IDs, 251 MUST, 21 families**. Wave 2 ended at 199 IDs and 124 MUST, so wave 3 added 172 IDs and 127 MUST:
- Revisions added 47 IDs and 33 MUST.
- The new groups added 125 IDs and 94 MUST.

The 21 families are SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-GATE, SH-EMIT, SH-CI, SH-ZSH, SH-FISH, SH-NU, SH-ELV, SH-INST, SH-SEC, SH-TEST, SH-CORE, PS-COMPAT, PS-ENC, PS-ERR, PS-NATIVE, PS-GATE and PS-SEC. PS-CORE has no consolidation. It is assembled at drafting from the PS-GATE rules and the tell set of record in shell-pwsh.md (map rows M-V-01 and M-V-02). M-V-03 stays P3.

### (a) Per group

- **gate** (revised): `shell-gate.md`.
  - SH-GATE-01..34; 27 and 32 are retired.
  - 32 IDs, 24 MUST. Wave 2 had 20 IDs and 14 MUST.
  - Conflicts resolved: 24. The load-bearing ones:
    - C16 to C21: busybox 1.37 with git is a supported executor. The `$'\r'` and `-P` cells are replaced by awk. A cell passes on empty stdout and stderr, and its exit status is never read (`grep -L` through `xargs` inverts on busybox). One `-e` per alternative. Shell content comes from `files()`, not from `'*.sh'`.
    - C24: the gate script ran on Git Bash 5.2.15.
  - Follow-ups named:
    - G10 / subarea 1: Git Bash 5.3.15 and macOS.
    - Subarea 2: the SC2310/SC2312 burn-down, now answered by errexit.
    - Subarea 3: fenced blocks, now answered by SH-CORE-13.
    - Subarea 4: hooks and checkbashisms.
    - Subarea 5: ShellCheck 0.8.0 and shfmt 3.8.0.
- **errexit** (revised): `shell-errexit.md`.
  - SH-ERR-01..33.
  - 33 IDs, 21 MUST. Wave 2 had 28 IDs and 17 MUST.
  - Conflicts resolved: 15. The load-bearing ones:
    - C-1: SC2312 stays out of the rc. The burn-down found 191 sites in 55 files, 2 of them strict defects.
    - C-6: the 64/65/66/69/70 carve-out is frozen to the 16 existing sites.
    - C-12: SH-EXP-21's "function" half is wrong. SH-ERR-29..31 own glob shopts, and SH-ERR-31 gives an empty glob its own exit, 79.
    - C-15: `kill -l` after `-gt 128` fails for Git Bash statuses seen from a native parent.
  - Follow-ups named: `lastpipe` (M-B-19 remainder), unguarded glob loops in the 41 exemplars, re-measure on new releases, FreeBSD and macOS `sh`.
- **pwsh** (revised): `shell-pwsh.md`.
  - PS-COMPAT-01..10, PS-ENC-01..10, PS-ERR-01..08, PS-NATIVE-01..03, PS-GATE-01..10.
  - 41 IDs, 25 MUST. Wave 2 had 37 IDs and 22 MUST.
  - Conflicts resolved: 18 rows. The load-bearing ones:
    - Row 1: an explicit `Severity` list drops ParseError; an IncludeRules-only file does not (R10).
    - X8 is settled by PS-ENC-10.
    - PS-GATE-06 is advisory.
  - Follow-ups named:
    - Hosted-runner readers.
    - Interactive console and UTF-8 locale hosts.
    - `irm` after KB5129195.
    - Non-1252 ANSI hosts.
    - PSSA main.
    - Resolver out of sample.
  - Hand-offs it did not apply: SH-CI-11 wording; the map counts.
- **emit** (revised): `shell-emit.md`.
  - SH-EMIT-01..50.
  - 50 IDs, 27 MUST. Wave 2 had 32 IDs and 17 MUST.
  - Conflicts resolved: 20. The load-bearing ones:
    - 13: a generated PowerShell completion script is ASCII with no BOM.
    - 15: SH-EMIT-24 is amended for ble.sh.
    - 16: the bash completion fallback is `eval "$(...)"` or `.` on a stored file, never `source <(...)`.
    - 18 and 19: the cmd.exe Batch arm carries its own predicate.
    - 20: the ASCII check drops `-P`.
  - Follow-ups named:
    - Hosts: macOS, pwsh 7.x on Windows, elvish on Windows.
    - Lazy `DEBUG` install.
    - PSReadLine as a pre-exec point.
    - cmd.exe code page and locale.
    - ble.sh tagged release.
    - fish completion lookup.
    - nu chained completer.
- **ci** (revised): `shell-ci.md`.
  - SH-CI-01..30.
  - 30 IDs, 20 MUST, 9 SHOULD, 1 pointer row. Wave 2 had 22 IDs and 14 MUST.
  - Conflicts resolved: 23 source rows plus revision runs C14 to C18. The load-bearing ones:
    - SH-CI-23 and SH-CI-24: outputs and dynamic `matrix.*` are code (N-act).
    - C14: hosted Windows images put Git's Unix directories on PATH, so SH-CI-20 is held at SHOULD.
    - C16: SH-CI-30 demands explicit grouping.
    - C17: a git ref is never written after `--`.
  - Follow-ups named:
    - Real GitHub runner probe.
    - Real GitLab Runner probe.
    - Scheduled currency re-runs.
    - Map items X6, X8 and X10 not folded.
- **installer** (new): `shell-installer.md`.
  - 14 SH-INST and 11 PS-SEC rules.
  - SH-INST-02/10/13/14/15/18/21 and PS-SEC-12/13 are retired to pointers or merged.
  - 25 IDs, 20 MUST.
  - Conflicts resolved: 16. The load-bearing ones:
    - C1: PS-SEC-09 replaces PS-ERR-05's `break` idiom and formula.
    - C2: one 5.1 runner-file writer.
    - C3: PS-SEC-06 refines PS-COMPAT-09.
    - C4: cargo-dist 0.33.0 is "pinned".
    - C5: SH-INST-09 is MUST for installers.
    - C11: all checks use the git-fed form.
    - C12: SH-INST-13 becomes an SH-ERR-12 amendment.
    - C14: the prefix sweep is the check of record.
    - C16: a missing hash tool fails closed.
  - Follow-ups named:
    - Legacy .NET TLS.
    - macOS installer facts.
    - Zip-slip on older stacks.
    - posh truncation.
    - The cargo-dist config surface.
    - Signature roots of trust.
    - Root-requiring installers.
- **alt-shells** (new): `shell-alt-shells.md`.
  - SH-ZSH-01..15, SH-FISH-01..16, SH-NU-01..14, SH-ELV-01..06.
  - 51 IDs, 41 MUST.
  - Conflicts resolved: 15, C1 to C15. The load-bearing ones:
    - C1: the zsh parse gate needs 5.3.1 or newer.
    - C2: SH-ZSH-08 resolves SH-ERR-27.
    - C4: fish `||` is a greppable ban.
    - C5: `fish -c` is no parse check.
    - C7: parse-clean is not warning-free in nu.
    - C8: elvish `-compileonly` is not enough.
    - C10: shfmt is advisory for zsh.
  - Follow-ups named:
    - zsh on macOS.
    - zsh 5.10.
    - fish 4.1 to 4.6.
    - nu 0.117 and later.
    - The nu tail-`try` hang issue.
    - nu, elvish and fish on Windows.
- **testing** (new): `shell-testing.md`.
  - SH-TEST-01..22.
  - 22 IDs, 14 MUST.
  - Conflicts resolved: 14. The load-bearing ones:
    - C2: one skip budget for both tools.
    - C3: `Run.Exit` composes with the census.
    - C4: the variable is the child host of the subject, not the Pester host.
    - C5: the cells are rewritten into the dialect.
    - C6: an indented `@test` is counted.
    - C9: bats `run` and `set -e`.
    - C14: Pester is pinned to 6.2.0.
  - Follow-ups named:
    - Census for dynamic and parallel bats.
    - macOS and Git Bash legs.
    - The Pester 5.1 child host.
    - Hatch security.
    - "The program-wide held-out round for this family".
- **security** (new): `shell-security.md`.
  - SH-SEC-01..12.
  - 12 IDs, 10 MUST.
  - Conflicts resolved: 17. The load-bearing ones:
    - C1: SH-SEC-11 is SHOULD.
    - C2: SH-SEC-09 narrows SH-EXP-13.
    - C4: every cell is git-fed.
    - C11: the never-disable list grows by five codes.
    - C13: no stale-lock takeover.
    - C14: sudo-rs `-E` is MUST for INST, TOOL and CI.
    - C16: locking moves to SH-SEC.
  - Follow-ups named:
    - macOS and BSD.
    - Windows cross-user argv.
    - CI log masking.
    - git and cargo credentials without argv.
    - Network-filesystem locks.
    - Inbound environment scrub.
    - Name constructs outside bash.
    - Variable-carried secrets (two-pass awk).
- **skills** (new): `shell-skills.md`.
  - SH-CORE-01..15.
  - 15 IDs, 9 MUST.
  - Conflicts resolved: 9. The load-bearing ones:
    - C2: SH-CORE-07 owns the tell table.
    - C3: joint reading of SH-EXP-13 and SH-EMIT-14.
    - C4: inline cells are judged by output, shipped scripts by status.
    - C7: MUST tables cite MUST rules only.
    - C8: the iex formula.
  - Follow-ups named:
    - SH-INST and PS-SEC IDs for `installer-script` (now on disk).
    - SH-NU and SH-ZSH IDs for diagnose rows 12 and 13.
    - Sibling fence triage.
    - macOS and BSD.
- **dialect** (`shell-dialect.md`, 37 IDs, 23 MUST) and **expansion** (`shell-expansion.md`, 23 IDs, 17 MUST): unchanged since wave 2. Their owed amendments are listed in (e) as X33, X42 and X47.

### (b) Surprises

1. **`emulate -L zsh` alone resets `ERR_EXIT`.** `set -e; f() { emulate -L zsh; false; echo X }` prints `X` on all six builds (SH-ZSH-01).
   - Verdict: **fold**, already ruled.
2. **Unquoted globs in catalog command blocks abort under zsh.** At least 18 sites in 15 catalog files are affected, not the 5 places in M-X-02 (shell-alt-shells.md Verdict 2, SH-ZSH-06).
   - Verdict: **fold** into SH-ZSH-06.
   - M-X-02 stays an owner action with the corrected count.
3. **fish `||` after a missing command skips its right side on 3.6.0 and 4.0.2** (alt C4, SH-FISH-07).
   - Verdict: **fold**.
   - The exact fix release between 4.0.2 and 4.7.0 is a dated re-check. It is not load-bearing while the floor stays 3.6.0, which holds until 2028-06-30 (alt Q2).
4. **`fish -c 'echo ('` exits 0 on 3.6.0** (alt C5).
   - Verdict: **fold** into SH-FISH-01 (parse a file).
5. **fish `set -q X` is true for an empty string.** ocx `conf.d/ocx.fish` sources `/env.fish` when `OCX_HOME` is empty (SH-FISH-09).
   - Verdict: **fold**. The fleet defect is reported, not filed (X55).
6. **nu: parse-clean is not warning-free.** `www-setup@a251c3631047:src/install.nu` exits 1 under `nu-gate.nu` on 0.114.1 and 0.116.1 (alt C7, SH-NU-02).
   - Verdict: **fold**.
7. **An external in tail position of nu `try` hangs.** No upstream issue was found (SH-NU-11).
   - Verdict: **fold**.
   - Filing upstream is an owner decision. Defer as **M-K-08** (upstream report for the tail-`try` hang).
8. **`elvish -compileonly` misses deprecated forms and false-positives on `$edit:`** (alt C8, SH-ELV-02).
   - Verdict: **fold**.
9. **zizmor 1.30.1 misses dotted access on a dynamic matrix dimension** at every severity while the payload executes (ci Verdict 13, SH-CI-24).
   - Verdict: **fold**. The SH-CI-24 grep carries the gap.
   - Re-run the plant on each zizmor bump (dated). Reporting upstream is an owner decision.
10. **act runs a payload through a two-job output hop whose first hop used the safe `env:` form** (N-act, SH-CI-23).
    - Verdict: **fold**.
11. **`platforms: ['!windows']` fails the whole Taskfile with rc 102** (SH-CI-27).
    - Verdict: **fold**.
12. **Hosted Windows images put Git's `usr\bin` and `mingw64\bin` on PATH** (`PathOption=CmdTools`, ci C14). `shell-audit/platform-matrix.md:267` is wrong.
    - Verdict: **fold**. SH-CI-20 is held at SHOULD.
    - Hosted confirmation needs a real runner, which is a measurement the corpus cannot supply.
13. **GitLab sets errexit and pipefail itself, and a `node:*-alpine` job runs busybox ash.** The one fleet defect is `apk ... || apt-get update && apt-get install` at `grimoire-indexer@19fe2dcb5dc1:templates/ci/gitlab-publish.yml:28` (SH-CI-28..30).
    - Verdict: **fold**.
14. **The shipped cargo-dist 0.33.0 sh installer installs a tampered archive with rc 0 when `sha256sum` is off PATH.** The grimoire ps1 front door claims a verification that its code lacks: 0 hash tokens (installer R6, R11; SH-INST-03, PS-SEC-01, PS-SEC-03).
    - Verdict: **fold**.
    - The remedy is an owner decision (installer Q1, Q2). The upstream fix is [axodotdev/cargo-dist#2497](https://github.com/axodotdev/cargo-dist/pull/2497), unmerged as of 2026-10-11 (dated).
15. **Both fleet sh installers fail on BusyBox wget** (installer R8; SH-INST-05, SH-INST-07).
    - Verdict: **fold**.
16. **`trap cleanup EXIT INT TERM HUP` exits 3 instead of 130/143** (installer retirement row SH-INST-10).
    - Verdict: **fold** into SH-ERR-16 as evidence.
17. **Linters see almost none of the installer defects.** ShellCheck catches 1 of 26 sh plants and PSSA catches 3 of 12 PS plants (installer Verdict 11).
    - Verdict: **fold**. The kit runs are the gate.
18. **sudo-rs ignores bare `-E` with a warning and exit 0** (0.2.8, 0.2.13; SH-SEC-06).
    - Verdict: **fold**. M-D-15 is closed.
19. **No stale-lock takeover is safe.** Each round gave 1 to 7 winners on dash, ash 1.37 and bash 5.3 (security C13, SH-SEC-07).
    - Verdict: **fold**.
20. **`printf -v "$k"`, `local`, `declare` and `read` with a dynamic name execute `a[$(cmd)]`** (security C2, SH-SEC-09).
    - Verdict: **fold**. The amendment to SH-EXP-13 is X42.
21. **`wait -n PID...` ignores the PID list on bash 4.4 and 5.0** (security C8).
    - Verdict: **reject as a rule**. The 3.2 floor already bans `wait -n` (SH-DIAL-06). The datum stays in shell-security.md.
22. **bats 1.14.0 exits 0 on a missing `-r`, on any skip, on `run` 126/127 and on a missing version directive** (testing Verdict 2, SH-TEST-09).
    - Verdict: **fold**.
23. **Pester version and exit behaviour surprise.** `-MinimumVersion 5.0` resolves to 6.2.0, and the fleet already runs 6.2.0 under a step named "Install Pester (v5)". `Run.Exit` exits only on failure (testing C3, C14).
    - Verdict: **fold** into SH-TEST-18 and SH-TEST-19.
24. **100 tracked shell-shebang files are at mode 100644** (ocx 97, www-setup 3). This gives rc 126 on 23 of 23 interpreter legs (skills R5, SH-CORE-05).
    - Verdict: **fold**. Fix on touch (skills Q3).
25. **The catalog's fenced blocks are unlinted.** It holds 650 fenced sh/bash blocks with 146 findings in 46 files (skills R11), and 1132 `--include` lines in 124 files (skills R14).
    - Verdict: **fold** for the shell set (SH-CORE-13, SH-GATE-21..23).
    - The sibling sets are owner actions M-X-01 and M-X-05.
26. **The wave-2 iex formula `$null -eq $MyInvocation.MyCommand.Path` throws under `Set-StrictMode -Version Latest`** on 5.1, 7.4 and 7.6.6 (skills R12, installer C1).
    - Verdict: **fold**. PS-SEC-09 keeps the text (X29).
27. **dotnet's PSSA settings file names 3 rules that do not exist, and PSSA ignores unknown names** (pwsh R10).
    - Verdict: **fold** into PS-GATE-01.
28. **Both `pwsh` and `powershell` emit OEM bytes to a redirected stdout on a clean console.** So `ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:207` is wrong with either host installed (pwsh R16, PS-ENC-05).
    - Verdict: **fold**. The fleet defect is reported.
29. **The curly-quote injection also reaches generated completion scripts through clap_complete 4.6.8/4.6.9 `escape_string`** (grim, ocx; emit failure mode 22, SH-EMIT-40/41).
    - Verdict: **fold**.
    - The orchestrator confirmed the injection class on pwsh 7.4, pwsh 7.6.6 and real WinPS 5.1 (`fixtures/orch-verify/inj.ps1`). Disclosure is the owner's decision, and the program files nothing.
30. **`source <(grim completions bash)` registers nothing on bash 3.2.57** (SH-EMIT-34).
    - Verdict: **fold**.
31. **cmd.exe `SET "K=v"` refuses far more than ocx's four characters.** That set leaves 62 of 186 admitted runs wrong (SH-EMIT-48).
    - Verdict: **fold**. The fleet defect is reported.
32. **A `PROMPT_COMMAND` append after `ble-attach` is discarded** (emit conflict 15, SH-EMIT-24). This was measured on one nightly (`0.4.0-nightly+d81fd54`).
    - Verdict: **promote**. Run the MUST's ble.sh clause on a tagged release (next wave, `emit/ble-release-and-windows-rows`).
33. **The security group's "held-out round" ran over the corpus's own 40 code clones** (shell-security.md:13). It is not out-of-corpus evidence. Even so, it found one missing class, userinfo URLs (C5e).
    - Verdict: **promote**. It is the reason the next wave is a true held-out round.

### (c) Map rows affected

Consolidated with no row left open:
- E (SH-SEC) except two items, deferred:
  - inbound environment scrub (new **M-E-09**)
  - CI log masking of derived secrets (new **M-E-10**, a measurement)
- G (SH-TEST) except dynamic and parallel bats census, which goes to `heldout/test-suites`.
- I, J, K, L (SH-ZSH, SH-FISH, SH-NU, SH-ELV) except:
  - Windows config paths, which go to `emit/ble-release-and-windows-rows`
  - dated currency items
- N (SH-INST) except three items, deferred:
  - root-requiring installers (new **M-N-13**)
  - signature roots of trust with stock tools (new **M-N-14**)
  - the cargo-dist template override surface (new **M-N-15**, an input to installer Q2)
  - Also excepted: posh truncation coverage (new **M-N-16**; posh is a conditional member, SH-DIAL-04).
- U (PS-SEC) except the legacy .NET under 4.7 TLS default, a measurement.
- O (SH-CORE).
- W: M-W-01..04 can be drafted after the held-out round. The M-W-02 hold in skills Verdict 9 is released, because shell-installer.md defines every cited ID, including PS-SEC-08.
- M-C-20 (SH-SEC-08/09).
- M-D-07 is split: locking is SH-SEC-07, atomic replace is SH-USER-12.
- M-D-15 (SH-SEC-06).
- M-M-17 (SH-EMIT-33..41).
- M-T-04 and M-T-05 (SH-TEST-18..22).

Still open:
- M-A-17 (deferred, unchanged).
- M-B-19, the `lastpipe` remainder: deferred. No prologue in SH-ERR-23 sets it, and BVG-14 already bans it on a 3.2 floor.
- V (PS-CORE): assembled at drafting.

Row text corrections:
- M-X-02: at least 18 sites in 15 files.
- M-G-01: ShellSpec's last release is 0.28.1 (2021-01-11), not 2024-09 (testing C8).
- M-G-03: bats 1.14.0 `run` honours only a `set -e` the called function sets; plain commands need `--errexit` (testing C9).
- M-H rows on GitLab: 12 files, not 21 (ci revision log).
- M-F-01 and the SH-GATE-11 table: zsh needs 5.3.1 or newer, nu needs `nu-gate.nu`, elvish needs `elv-gate.sh` (X35).

New deferred rows (trigger in brackets):
- **M-F-17**: ShellCheck 0.8.0 and shfmt 3.8.0 as gate toolchains [an adopter cannot pin per SH-GATE C11].
- **M-M-21**: lazy first-prompt `DEBUG` install and PSReadLine as a pre-exec point [SH-EMIT-44/45 move above SHOULD].
- **M-M-22**: cmd.exe code page, UTF-8 system locale and the `DelayedExpansion` default [an emitter wants to admit non-ASCII to Batch].
- **M-M-23**: three unmeasured edges [a fleet emitter uses one of them]:
  - the cause of fish completion lookup without PATH
  - the nu chained completer sourced twice
  - the pwsh delegate marker after a global reset
- **M-G-09**: cost of the Pester child host `$env:SUT_PWSH` [SH-TEST-22 is proposed for MUST].
- **M-G-10**: adversarial reading of installer test hatches [a hatch accepts more than a local file].
- **M-K-08**: upstream issue for the nu tail-`try` hang [the owner wants it filed].

### (d) Frame corrections

- No out-of-corpus held-out round has run. The security round sampled the 41-repo corpus itself (shell-security.md:13).
- The wave-2 map's closing line said "the 30-repo corpus". The corpus is 41 repos (frame §"The codebases", item 5).
- cargo-dist 0.33.0 embeds per-archive digests, so it is class "pinned", not sidecar/manifest (installer C4 corrects [inst]).
- `shasum` and `openssl` are absent on stock ubuntu:24.04, ubuntu:26.04, debian:12, alpine:3.22 and busybox:1.37. The [sh] 26.04 row came from a custom image (installer C6).
- `shell-dialect.md:111` swaps the `{1..3}` composition. mksh runs it once; ksh93u+m runs it three times (installer C7).
- The www-setup comment "`Expand-Archive` validates entries only from 7.4" does not reproduce on 5.1.26100.9444 (installer C9).
- Hosted GitHub Windows images carry Git's Unix tools on PATH. The audit sentence at `platform-matrix.md:267` is wrong (ci C14).
- sudo-rs `-E` is not merely "discouraged". The variable is dropped silently, with a warning and exit 0 (security C14).
- bash 5.3 NEWS item p (NULL `$PATH` as `.`) is not a behaviour change (security C10).
- The fleet runs Pester 6.2.0 under a step titled "Install Pester (v5)". `www-setup/.claude/rules/testing-pwsh.md` is stale (testing C14).
- House skill bodies are 497 to 499 lines, and the checker enforces 500 on the body (skills C1).
- Bare `nu-check` and `nu --ide-check` exit 0 on broken or erroring files (skills R13, alt C7). The SH-GATE-11 nu row is a parse floor, not a gate.
- H6 is refined for the families opened this wave.
  - The top alt-shell failures are bash habits in zsh/fish files and trust in blind gates (alt failure modes 1-2).
  - The top PowerShell failure is belief in `$ErrorActionPreference = 'Stop'` for natives (pwsh failure mode 1).
  - The top installer failure is a missing or fail-open integrity check (installer failure mode 1).
- H9 is sharpened: a parse-clean nu installer already warns on the two newest minors (alt C7).

### (e) Cross-consolidation contradictions

Each item gives the pair, then the resolution, then whose text the drafters keep. No consolidation is edited. X1 to X28 stand as recorded in the wave-2 section, except where an item below supersedes one.

- **X29, iex exit and iex detection.**
  - Pair: PS-ERR-05 (`break`, and `$null -eq $MyInvocation.MyCommand.Path`) against PS-SEC-09 (one guarded top-level exit) and PS-SEC-08(d) (`[string]::IsNullOrEmpty($PSCommandPath)`). Installer C1, skills C8 and R12 bear on it.
  - Keep PS-SEC-09 for the exit shape and PS-SEC-08(d) for detection.
  - PS-ERR-05 becomes a pointer. Its www-setup `:182`, `:734` rows move to PS-SEC-09.
- **X30, the 5.1 runner-file writer** (supersedes X8).
  - Pair:
    - SH-CI-11: only `Out-File -Encoding utf8 -Append`.
    - Installer C2 and the retired PS-SEC-12: one writer per file, `AppendAllText`.
    - PS-ENC-10: both writers are safe alone and mixed, and `AppendAllText` with `UTF8Encoding $false` is the default (R11, 21 writer sequences).
  - Keep **PS-ENC-10**.
  - SH-CI-11 becomes a pointer row that keeps only its CI-side greps for `>>` and bare `Add-Content`. The installer kind uses PS-ENC-10's default.
- **X31, TLS on 5.1.**
  - Pair: PS-COMPAT-09 (SHOULD, `-bor Tls12`) against PS-SEC-06 (MUST for installers: guarded, numeric, Desktop only, no `Tls13`/`Tls11` literal; installer C3).
  - Keep PS-SEC-06 wherever `SecurityProtocol` is touched. PS-COMPAT-09 becomes a pointer, and its `-bor` advice is dropped.
  - shell-pwsh.md's "satisfied" row for `www-setup@a251c3631047:src/install.ps1:337,355` is a violation under PS-SEC-06.
- **X32, `#Requires` in iex scripts.**
  - Pair: installer Verdict 8 ("No `#Requires` ... in a script documented as `| iex`") against PS-COMPAT-01 (`#Requires -Version 5.1` in anything `irm | iex` runs, plus an in-code version test) and PS-SEC-08(a) ("not by `#Requires` alone").
  - Keep the rule texts of PS-COMPAT-01 and PS-SEC-08(a), which agree. The Verdict 8 wording is not carried.
- **X33, the `"$@"` forwarding guard.**
  - SH-INST-13 is retired into SH-ERR-12, which gains "`${1+"$@"}` at every forwarding site" (posh 0.14.1; shell-installer.md retirement table).
  - Keep SH-ERR-12, amended.
- **X34, the exit header for installers.**
  - Pair: SH-ERR-25 (SHOULD) against SH-INST-09 (MUST, installer C5).
  - Both keep their text. SH-INST-09 owns the installer kind.
  - The empty-glob exit follows the same split: installers use the SH-INST-09 0-7 table, and SH-ERR-31's 79 binds CLIs and gates.
- **X35, parse-gate rows.**
  - Pair: SH-GATE-11 (zsh `-fn` on 5.0.8 and 5.9; `nu --ide-check`/`nu-check`; `elvish -compileonly`) and the shell-diagnose route row 16 (skills R13), against SH-ZSH-12 (5.3.1+), SH-NU-02 (`nu-gate.nu --strict` on both ends), SH-ELV-02 (compile, deprecation and denylist) and SH-FISH-01 (file, floor 3.6.0 and ceiling 4.9.3).
  - Keep the family rules. SH-GATE-11 keeps only the table and cites them.
- **X36, shfmt scope.**
  - Pair: SH-GATE-09 lists zsh in shfmt's blocking scope; alt C10 and SH-ZSH-12 make shfmt advisory for zsh; SH-FISH-03 keeps ShellCheck and shfmt off `.fish`.
  - Keep SH-ZSH-12 and SH-FISH-03. SH-GATE-09 keeps the discovery text, but shfmt's blocking set is the `shfmt -f` list minus zsh files (zsh goes to an advisory run over an explicit list).
- **X37, `trap ... EXIT` inside a function.**
  - Pair: SH-ERR-27 (CONSIDER) against SH-ZSH-08 (MUST in files bash also sources, SHOULD in zsh-only files).
  - Keep SH-ZSH-08 for any file zsh can source. SH-ERR-27 stays CONSIDER for bash-only files and points to it.
- **X38, `echo -e`.**
  - Pair: SH-EXP-09 against SH-ZSH-15 (alt C3).
  - Both keep their text, with scopes stated: SH-EXP-09 for sh-bound code, SH-ZSH-15 for files that may be sourced into sh.
- **X39, fish and nu own-file emission.**
  - Pair: SH-EMIT-17 (SHOULD, *where*) against SH-FISH-13 (MUST, *content*: idempotent, persists nothing) (alt C9).
  - Both keep their text. SH-NU-07 and SH-FISH-15 point to SH-EMIT-17 and SH-EMIT-26..28 for hooks (alt C15).
- **X40, `.zshenv` against rc targets.** SH-ZSH-11 (PATH in `.zprofile`, `.zshenv` silent) and SH-EMIT-16 (zsh environment in `.zprofile`) agree. No change; both keep their text.
- **X41, emitted PowerShell quoting against authored source.**
  - Pair: SH-EMIT-03 (double the five single-quote code points), SH-EMIT-08 (5.1-bound emitted text is ASCII, non-ASCII as `[char]0xNN`) and PS-ENC-08 (no U+2018..U+201E in code positions of authored files).
  - They are consistent once scoped. PS-ENC-08 covers authored files. SH-EMIT-08 wins for 5.1-bound output. SH-EMIT-03 is the literal form otherwise. All three keep their text.
- **X42, dynamic names.**
  - Pair: SH-EXP-13 (recommends `printf -v`) against SH-SEC-09 (literal or validated identifier only; security C2).
  - Keep SH-SEC-09. SH-EXP-13 gains the clause "literal or validated identifier only".
- **X43, locking.**
  - Pair: M-D-07 and the SH-USER-06 table against SH-SEC-07 (security C16).
  - SH-SEC-07 keeps the lock text: `mkdir`, `set -C` or `ln`; exit 75; no stale break.
  - SH-USER-06 keeps the tool-availability facts (no `flock` on AL2023 and others). SH-USER-12 keeps atomic replace.
- **X44, the never-disable list.**
  - Pair: SH-GATE-06 (SC2155, SC2164, SC2162, SC2115, SC2068) against SH-SEC-01, which adds SC2254, SC2053, SC2295, SC2035 and SC2156 (security C11).
  - SH-GATE-06 keeps the list mechanics with all ten codes. SH-SEC-01 keeps the injection reason and its `s01-rc`/site cells.
- **X45, skips for an absent interpreter.**
  - Pair: SH-EMIT-32 (CONSIDER) against SH-TEST-10 (MUST; testing C2).
  - Keep SH-TEST-10. SH-EMIT-32 becomes a pointer.
- **X46, the POSIX interpreter list.**
  - Pair: the testing dive (dash and posh mandatory) against SH-DIAL-04.
  - Keep SH-DIAL-04. SH-TEST-13 cites it (testing C1, X12).
- **X47, SH-EXP-21** (restates the wave-2 hand-off for drafters). SH-EXP-21 takes errexit C-12's reworded text. SH-ERR-29..31 own glob shopts.
- **X48, where the Pester rules live.**
  - Pair: the artifact decision (SH-TEST in `shell-quality/testing.md`) against testing O1 (SH-TEST-18..22 authored into `powershell-quality/gates.md`).
  - The IDs stay SH-TEST and placement follows O1's default. `testing.md` carries SH-TEST-01..17 and a pointer.
- **X49, installer test hatches.**
  - Pair: SH-TEST-17 (a local-file binary hatch, "waits on SH-INST") against SH-INST-19 (a print hatch plus an https-only base-URL override).
  - Both are SHOULD. SH-INST-19 owns the installer hatch contract. SH-TEST-17 cites it and keeps the fixture-server half.
- **X50, the tell table and eval of captured output.**
  - X13 is confirmed: SH-CORE-07 owns the table and SH-GATE-20 becomes a pointer.
  - SH-EXP-13 against SH-EMIT-14 is settled by skills C3: the captured form needs a status check and `# tell-ok:`. Both keep their text with that joint reading.
- **X51, SC2310/SC2312** (X4 re-priced).
  - Pair: shell-gate.md G1 and SH-GATE-02 still ship both `enable=` lines; SH-ERR-07 and SH-ERR-33 keep SC2312 out of the rc.
  - Keep SH-ERR-07: 191 sites, 2 strict (errexit Q1). SH-GATE-02 is four keys.
- **X52, the verification dialect** (X1 continued).
  - Lines matching a recursive `grep -..r..` or `--include` remain in these consolidations. Counts from one grep each on 2026-10-11:
    - alt-shells 35
    - pwsh 32, plus 13 `-P` lines
    - ci 25, plus 12 `-P` lines
    - emit 19, plus 3 `-P` lines
    - errexit 18
    - expansion 13
    - skills 7
    - dialect 5
    - installer 3
    - testing 2
  - Three items contradict the dialect directly:
    - SH-ZSH-06 tells pasted blocks to "prefer `grep -r --include='*.ext' .`".
    - emit conflict 20 reads grep's exit status.
    - emit Q5 says "keep as measured".
  - Keep SH-GATE-21..31. Drafters translate every cell.
  - SH-ZSH-06 keeps the glob-quoting obligation. Its preferred form becomes the SH-GATE-21 git-fed shape, or `find . -name '*.ext'`.
- **X53, non-ASCII checks.**
  - Pair: emit conflict 20 (`if LC_ALL=C grep -rl '[^[:print:][:space:]]' DIR; then exit 1; fi`), the SH-GATE-16 awk (X16) and the PS-ENC-01/08 greps.
  - SH-GATE-16's awk keeps the text for sh and bash. SH-EMIT-40's ASCII check and the PS-ENC cells are re-expressed in the dialect and judged by output.
- **X54, waiver tokens.** Four tokens exist:
  - `vd-ok:` for catalog text (22 mentions)
  - `userland-ok:` for SH-USER-16 (23 mentions)
  - `sec-ok:` for SH-SEC (20 mentions)
  - `tell-ok:` for SH-CORE-07 (11 mentions)

  This is an overlap, not a conflict. All four are kept with a mandatory same-line reason, per the owner defaults in security Q8 and skills Q1. The index lists them in one table.
- **X55, filing fleet defects.**
  - Pair: alt-shells Q4 (default: "yes, one issue per repo") against frame Q6, map Q7, ci Q5, emit Q1 and errexit Q3 (the program files nothing).
  - The program files nothing. alt-shells Q4's default is overturned to report-only.
- **X56, git operands.**
  - Pair: SH-SEC-08 (`--` before every variable operand, including `git clone|fetch|ls-remote -- "$url"`) against SH-CI-29 (a ref is written `git checkout "$ref" --` or `git switch -- "$ref"`, never `git checkout -- "$ref"`; ci C17).
  - Both keep their text. SH-SEC-08 gains a pointer to SH-CI-29's ref clause.
- **X57, MUST tables in skills.**
  - SH-CORE-10 tables cite M-IDs and a "dangling" PS-SEC-08, which shell-installer.md now defines (MUST). Drafters re-point:
    - M-N-* to SH-INST-*
    - M-U-* to PS-SEC-*
    - diagnose rows 12 and 13 to SH-NU-02 and SH-ZSH-12
  - Then re-run `must-cell.sh` and `sev-cell.sh` (skills R8). The `installer-script` hold (skills Q8) is released.
- **X58, execution policy.** X28 stands. PS-GATE-07 keeps the `Set-ExecutionPolicy` text. PS-SEC-11 keeps the installer-specific "no policy gate and no policy advice" and cites PS-GATE-07.

### (f) Convergence

The wave-plan stop condition is **not met**:
- Wave 3 added 127 MUST rules, 94 of them in nine families opened this wave: SH-ZSH, SH-FISH, SH-NU, SH-ELV, SH-INST, PS-SEC, SH-SEC, SH-TEST and SH-CORE.
- It found new failure classes in those families. Each has a watched check:
  - zsh `emulate -L` resetting errexit
  - fish's `||` right side skipped after a missing command
  - `fish -c` parse blindness
  - the nu tail-`try` hang
  - nu parse-clean but warning-red
  - elvish `-compileonly` blindness
  - cargo-dist failing open
  - BusyBox wget TLS flags
  - sudo-rs dropping `-E`
  - stale-lock takeover races
  - bats vacuous exits
  - Pester vacuous `Run.Exit`
  - mode 100644 giving 126
  - zizmor's dotted-matrix miss
  - Taskfile negation rc 102
  - GitLab `A || B && C`
- No out-of-corpus held-out round has run. The wave-2 map made that round the drafting gate, and surprise 33 shows that even an in-corpus resample still found a missing class.

The tail clause also fails. Open questions remain that are load-bearing and answerable now, by fixture runs on this host or by clones.

Verdict: **needs-another-round**.

This should be the last research wave. If the held-out round yields only instances of existing classes and check corrections (a false positive or false negative fixed in a cell), with no new MUST and no new class, the next iterate returns ready-to-draft.

Open questions by class:
- **Dated re-checks.** These do not block drafting:
  - pwsh 7.4/7.5 EOS on 2026-11-10: drop the 7.4 parse column (pwsh Q4).
  - `ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15 expiry).
  - uutils 0.12 and Ubuntu 26.10 (dialect).
  - The next ShellCheck release (SC2337, SC3040/SC3003 relaxation, re-run `burndown.py`) (errexit, ci).
  - bash 5.3 interp 1602, yash 2.61, zsh 5.10, dash 0.5.13 (errexit, alt).
  - The fish `||` fix release, which matters only when the floor rises past 3.6.0.
  - nu 0.117+ and `nu-gate.nu`'s JSON (alt).
  - The zizmor bump and the dotted-matrix plant (SH-CI-24).
  - task and mvdan/sh bumps (ci).
  - Pester 6.3 (testing O2).
  - The PSSA release (pwsh).
  - `irm` after KB5129195 (PS-COMPAT-06).
  - The merge of [axodotdev/cargo-dist#2497](https://github.com/axodotdev/cargo-dist/pull/2497) (installer C8).
- **Measurements the corpus cannot supply.** Each keeps its "unverified: read only" label:
  - macOS and BSD: `/bin/zsh` 5.8/5.9, login order, `/bin/bash` 3.2.57 harnesses, `shasum`/Rosetta, BSD grep, xargs and awk for the cells, `ps` visibility, `flock` alternatives (alt, emit, installer, security, testing, gate G10). There is no macOS host.
  - A real GitHub-hosted runner: container default shell, defaults merge, the 26.04 image, Git Bash 5.3.15, the 5.1 env-file reader, the Windows PATH (ci, pwsh). This needs a workflow in a fleet repo, and the program launches nothing.
  - A real GitLab Runner (ci). The rules hold under both readings.
  - Non-1252 ANSI hosts, the UTF-8 beta locale and an interactive Windows Terminal (pwsh). These need a changed system locale on the owner's host.
  - A legacy .NET below 4.7 TLS default and an old Archive module (installer).
  - NFS and SMB locks (dialect, security).
  - Windows cross-user argv with a second account (security).
  - CI log masking (security, M-E-10).
  - FreeBSD `sh` and ksh93 on CI (dialect, errexit).
- **Owner decisions, with the default applied:**
  - Disclosure of the curly-quote injection (ocx, direnv, mise, and clap_complete through grim and ocx completions), the `test-installers.yml` injection and the iex exit. Default: file nothing (map Q7, emit Q1).
  - Fleet defects. Default: report only (X55).
  - zsh floor 5.8 authored and 5.0.8 emitted (alt Q1).
  - fish floor 3.6.0 until 2028-06-30 (alt Q2).
  - The `# nu-range:` header, with gate scripts as plumbing (alt Q3).
  - Keep elvish (alt Q6).
  - The SH-CI Q1-Q7 defaults.
  - The installer Q1-Q6 defaults; Q1 recommends dropping the grimoire ps1 verification sentence.
  - The security Q1-Q8, testing O1-O7, skills Q1-Q8, pwsh Q1-Q8, emit Q2-Q6, gate G3-G10, errexit Q1-Q5 and dialect Q1-Q7 defaults.
  - SC2312 (X4/X51).
  - The gate exit carve-out (X5).
- **Answerable now and load-bearing.** These go to the next wave:
  - The held-out round over every new MUST rule and failure class, across all families.
  - Whether SH-SEC-02's check is complete for variable-carried secrets, which is the dominant real defect (security Verdict 2), plus the credential remedy forms the rule recommends but never ran (git, cargo; security Q1).
  - The ble.sh clauses of MUST rules SH-EMIT-24/43 on a tagged release, and the pwsh 7.6 Windows rows for rc, profile, completion and hooks, which were measured on Linux only (emit subarea 1b, 5).
  - Three items folded into held-out dives:
    - the PS-GATE-06 resolver out of sample
    - the bats census under dynamic and parallel registration (testing subarea 1)
    - SH-ERR-31 over fresh glob loops (its evidence is 7 fleet loops)
- **Answerable now, not load-bearing.** These are deferred:
  - `lastpipe` (M-B-19)
  - older toolchains (M-F-17)
  - checkbashisms and posh (M-F-15)
  - busybox Kconfig options (dialect)
  - Pester child-host cost (M-G-09)
  - hatch security (M-G-10)
  - the cargo-dist override surface (M-N-15)
  - posh truncation (M-N-16)
  - pre-exec edges (M-M-21)
  - Batch code pages (M-M-22)
  - completion edges (M-M-23)

### (g) Next wave

The held-out dives run first, because they are cross-cutting; the two revisions follow. Every held-out dive does the following:
- Clones fresh trees as blob-less depth-1 clones under `/home/mherwig/.cache/research-lang/heldout/shell/<owner>__<repo>`.
- Excludes the 41 corpus repos (`shell-audit/scratch/exemplar-shas.md`) and every fleet repo.
- Records the SHAs.
- Judges "clean" in the same way: every finding maps to an existing ID and failure class.

1. `heldout/posix-scripts`: SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-GATE, SH-SEC and SH-CORE on about 12 fresh bash/sh repos, including SH-ERR-31 over fresh glob loops. Why: the drafting gate, and 94 new MUST rules.
2. `heldout/installers`: SH-INST and PS-SEC kit runs on 8 or more fresh install.sh/install.ps1 pairs. Why: 20 new MUST rules rest on 17 corpus installers.
3. `heldout/ci-and-taskfiles`: the SH-CI greps, linters and zizmor on fresh workflows, Taskfiles and GitLab files. Why: the SH-CI-23..30 classes come from one revision round.
4. `heldout/emitters-and-alt-shells`: the SH-EMIT corpus and harnesses on fresh emitters, and the zsh/fish/nu/elvish gates on fresh authored files. Why: 41 alt-shell MUST rules, and an emitter class found in 6 tools.
5. `heldout/powershell`: PS-* gates on fresh PowerShell repos, plus the resolver out of sample. Why: the PS-ENC-07..10 and PS-SEC classes, and PS-GATE-06.
6. `heldout/test-suites`: bats-lint and the census on 10 fresh bats repos, including dynamic and parallel suites, and the Pester census on 4 fresh Pester repos. Why: SH-TEST rests on one dive (testing subarea 5).
7. `security/argv-through-variables-and-credentials` (revision): a two-pass awk check for variable-carried secrets, git and cargo credential forms, and name constructs outside bash. Why: the completeness of the SH-SEC-02 check and the SH-SEC-09 scope.
8. `emit/ble-release-and-windows-rows` (revision): ble.sh on a tagged release, pwsh 7.6 rows on the Windows host, and nu/elvish config paths on Windows. Why: the MUST clauses of SH-EMIT-24/43 and the Windows emitter rows.

Carried to drafting, not research: X29 to X58 above, the M-W-02 release (X57) and PS-CORE assembly (M-V-01/02).


## Wave 4 landed (2026-10-11)

Fourteen files are on disk. Three of them changed this wave: `shell-heldout.md` is new (six held-out dives over 64 fresh trees), and `shell-security.md` and `shell-emit.md` are revised. The other eleven consolidations are unchanged since wave 3. Counts were re-taken on 2026-10-11 the way wave 3 took them: one awk over the `^\*\*(SH|PS)-` header lines per file, the `- Severity:` lines for shell-expansion.md, and the CI revision log's own count (one header is MUST NOT, one is a pointer row).

Totals:
- **374 consolidated IDs and 254 MUST.** Wave 3 ended at 371 and 251. The 3 new IDs are SH-SEC-13, SH-SEC-14 and SH-EMIT-51, all MUST.
- **15 provisional IDs, 9 of them MUST,** from the held-out candidates. Final IDs are given in the authoring notes.
- **389 IDs, 263 MUST, 21 families** in all. PS-CORE is the 22nd family. It has no consolidation and is assembled at drafting (authoring notes, PS-CORE assembly).

### (a) Per group

- **heldout** (new): `shell-heldout.md`.
  - No IDs of its own. It names 15 failure classes (`CANDIDATE-<family>-n`, 9 MUST, 6 SHOULD) and amends cells in 14 families.
  - Verdict by family: 7 CLEAN (SH-USER, SH-EXP, SH-SEC, SH-EMIT, SH-ZSH, SH-NU, PS-NATIVE) and 14 NOT CLEAN. No MUST was retired, and 11 MUST texts change.
  - Conflicts resolved: 11. The load-bearing ones:
    - 1: the RETURN-trap premise.
    - 2: four `.shellcheckrc` keys, not five.
    - 3: the `#! /bin/sh` false negative, and the CRLF regression in the dive's own fix.
    - 5: BOM against ASCII-only for PS-ENC-01.
    - 9: SH-FISH-07 rescoped.
    - 10: SH-TEST-20 reversed.
  - Follow-ups named:
    - one narrow confirmation round over the 14 NOT CLEAN families (5 dives, about 6 fresh trees each, never the 64);
    - three owner decisions (PS-ENC-01, root-by-design installers, hand-listed runners);
    - the PS-GATE-06 unknown-parameter mode as a MUST candidate;
    - a non-validating `busybox:1.37` run for SH-INST-07.
- **security** (revised): `shell-security.md`.
  - SH-SEC-01..14: 14 IDs, 12 MUST (SH-SEC-11 and 12 are SHOULD). Wave 3 had 12 IDs and 10 MUST.
  - Conflicts resolved: 27 (C1 to C27). The load-bearing ones:
    - C18: `s02-argv-var`, an awk taint script, ships as `checks/secret-argv.sh`.
    - C21: `shfmt -f --` and `shellcheck --` are handed to SH-GATE-09/22.
    - C22: every waiver filter requires a reason (`sec-ok: *[^ ]`).
    - C23: the vendor exclusion is `':(exclude,glob)**/vendor/**'`.
  - New rules: SH-SEC-13 (git credentials) and SH-SEC-14 (cargo credentials). SH-SEC-02 is widened to the variable-carried forms, and SH-SEC-09 now binds every POSIX shell.
  - Follow-ups named:
    - macOS/BSD;
    - Windows cross-user argv and Git Credential Manager;
    - CI log masking (M-E-10);
    - credential helpers not run;
    - NFS locks;
    - the inbound environment scrub (M-E-09).
- **emit** (revised, third pass): `shell-emit.md`.
  - SH-EMIT-01..51: 51 IDs, 28 MUST, 19 SHOULD, 4 CONSIDER.
  - Conflicts resolved: 25; rows 21 to 25 are new.
    - 21: the ble.sh discard is a window, from `ble-attach` to the first prompt.
    - 22: the `declare -F blehook` probe.
    - 23: the CRLF-safe rc editor.
    - 24: elvish `rc.elv` on Windows.
    - 25: ask nu for its autoload directory.
  - New rule: SH-EMIT-51 (append a PowerShell profile with `Add-Content` only). Amended in place: SH-EMIT-16, 17, 18, 24, 33, 42 and 43.
  - Follow-ups named: 8 subareas (emit Open questions):
    - macOS, and nu/elvish hook forms on Windows;
    - lazy `DEBUG` install;
    - PSReadLine;
    - Batch code page;
    - fish completion lookup;
    - nu chained completer and pwsh delegate;
    - ble.sh builds beyond the three measured;
    - OneDrive-redirected and ANSI profiles.
- **Unchanged since wave 3:**

  | Consolidation | IDs | MUST |
  |---|---|---|
  | alt-shells | 51 | 41 |
  | ci | 30 | 20 |
  | dialect | 37 | 23 |
  | errexit | 33 | 21 |
  | expansion | 23 | 17 |
  | gate | 32 | 24 |
  | installer | 25 | 20 |
  | pwsh | 41 | 25 |
  | skills | 15 | 9 |
  | testing | 22 | 14 |

  Their wave-3 conflicts and follow-ups stand. The heldout amendments that land on them are in the authoring notes.

### (b) Surprises

1. **A `trap ... RETURN` set in a bash function is shell-global.** It re-fires after a later `.`/`source` and under `set -T`, never for plain calls (heldout conflict 1; dokku sets 44, resets 0).
   - Verdict: **promote** to SH-ERR-34, MUST, provisional.
2. **A BusyBox v1.37.0 wget rejects the options a script passes only on a tty** (pixi `install.sh:119`).
   - Verdict: **promote** to SH-INST-22, MUST, provisional. The general probe rule stays SH-USER-10.
3. **Escalation comes in four shapes, and 4 of 10 installers sit outside SH-INST-12** (ollama, tailscale, coder, helm).
   - Verdict: **promote** to SH-INST-23, MUST, scoped, provisional. It closes M-N-13.
   - Owner default applied: root-by-design installers fall under SH-INST-23 with a documented-exception clause.
4. **A `.ps1` takes an http URL from an environment variable and fetches it** (ollama, pixi).
   - Verdict: **promote** to PS-SEC-14, MUST, provisional.
5. **`$PSVersionTable.OS` is free text** (`Fedora Linux 43 (WSL)`). pnpm's installer cannot find its platform.
   - Verdict: **promote** to PS-COMPAT-11, MUST, provisional.
6. **U+2013 or U+2014 used as a parameter prefix is a parse error on 5.1 in a BOM-less file** (azure-powershell `GenerateHelp.ps1:14`).
   - Verdict: **promote** to PS-ENC-11, MUST, provisional. The BOM half collapses into the PS-ENC-01 rewrite.
7. **A report-only PSScriptAnalyzer step is a sixth fail-open mode** (winutil).
   - Verdict: **promote** to PS-GATE-11, MUST, provisional.
8. **A GitLab job on a Windows runner runs PowerShell.** ShellCheck then reports parse errors (inkscape).
   - Verdict: **promote** to SH-CI-33, MUST, provisional. The PowerShell-lint half is unproven, so the confirmation round runs it.
9. **The program's own dive harness wrote to the owner's real `~/.zshrc`** through an inherited `ZDOTDIR` (heldout "Side effect disclosed"; reverted byte-exact).
   - Verdict: **promote** to SH-CORE-16, MUST, provisional. The confirmation round's harnesses obey it from the start.
10. **A `finally` that reads a variable assigned only in `try` throws under StrictMode** and replaces the real error (pixi).
    - Verdict: **promote** to PS-ERR-09, SHOULD, provisional. The severity follows heldout conflict 11.
11. **`grep -r` and actionlint recurse into data YAML under `.github/workflows/`** (cli/cli).
    - Verdict: **promote** to SH-CI-31, SHOULD, provisional.
12. **Task runs errexit on and pipefail off.** SH-CI-17 says how to set pipefail, not when (goreleaser, arduino-cli, task).
    - Verdict: **promote** to SH-CI-32, SHOULD, provisional.
13. **A commented-out `# @test` lowers the count and the plan together**, so the census stays green.
    - Verdict: **promote** to SH-TEST-23, SHOULD, provisional.
14. **A first-statement `skip` leaves the body dead** (Bash-it `skip 'huh?'`).
    - Verdict: **promote** to SH-TEST-24, SHOULD, provisional.
15. **A hand-listed runner runs 23 of 32 `.bats` files** (asdf).
    - Verdict: **promote** to SH-TEST-25, SHOULD, provisional. Owner default: an explicit exclude list.
16. **PS-ENC-01's "ASCII only" is not the hazard.** 47 of 82 non-ASCII files carry a BOM and work on 5.1; the defect is the 35 without one.
    - Verdict: **fold**, as the BOM-aware rewrite (owner default).
17. **SH-FISH-07's blanket `||` ban is wider than the hazard.** Only an unknown-command left side skips the right side on 3.6.0 and 4.0.2.
    - Verdict: **fold**, as a rescope with check F5b.
18. **Four checks failed open, and each fix is a check correction, not a class:**
    - `gl-extract.py` crashed on 10 of 21 real GitLab files and the pipe exited 0 (heldout C, `gl-extract2.py`).
    - `#! /bin/sh` with a space slips the gate (heldout A, blocks 4 and 5).
    - elvish `a=b cmd` compiles clean (heldout D, E2b).
    - All three real Pester gate forms are green on zero tests (SH-TEST-19 `-ExpectedTotal`).
    - Verdict: **fold** into the cells.
19. **The ble.sh discard is the attach-to-first-prompt window, on v0.4.0-devel3 and the nightly only.** v0.3.4 has no `blehook` (emit conflicts 21 and 22).
    - Verdict: **fold**. It is already in SH-EMIT-24 and 43.
20. **`Add-Content` is the only profile append that is green in all 12 (file shape, engine) cells** (emit SH-EMIT-51). It was promoted in the emit revision.
    - Verdict: **fold**. No further action.
21. **Variable-carried secrets are 26 of 71 corpus lines that the single-line cells cannot see** (security C18). The git and cargo credential forms are measured.
    - Verdict: **fold**. They are already in SH-SEC-02, 13 and 14.
22. **M-N-14 is partly answered:**
    - pnpm verifies an npm ECDSA signature with `openssl dgst -sha256 -verify` and an embedded key;
    - ollama verifies Authenticode;
    - no installer uses minisign or cosign.
    - Verdict: **fold** into the SH-INST-03 and PS-SEC-01 amendments. The minisign/cosign remainder stays **deferred** as M-N-14.
23. **M-N-16 has a mechanical cause:** posh 0.14.1 rejects `-s`, so a pipe-fed `posh -s --` never ran the script.
    - Verdict: **reject** as a rule question. The fix belongs to the adapter, not to the shipped kit.
24. **The PS-GATE-06 unknown-parameter mode gave 58 findings and 0 false on held-out code.**
    - Verdict: **defer** as new **M-T-09**. Trigger: a fresh round confirms 0 false, and then the mode is split out as a MUST. PS-GATE-06 stays SHOULD and advisory.
25. **Observed, not promoted** (heldout: bracket class used as alternation, Pode's edition helper, `"test": "echo todo"`).
    - Verdict: **reject**. Each is one site with no plant. Any of them re-enters only if the confirmation round sees it again.

### (c) Map rows affected

Closed:
- **M-N-13**, by SH-INST-23 (provisional).
- **M-N-16**, closed as a harness defect (surprise 23).
- **M-E** (security), except M-E-09, M-E-10 and the new M-E-11. SH-SEC-02's completeness and the credential remedy forms, which wave 3's convergence listed as answerable now, are answered by the security revision.
- **M-M**, Windows and ble.sh rows (SH-EMIT-16, 17, 24, 33, 42, 43, 51), except the residue below.
- **M-G**, dynamic and parallel census. Heldout section F answers testing O6: SH-TEST-09 gains its red conditions, junit report formatting and `CENSUS_EXCLUDE`.

Partly closed:
- **M-N-14**: closed for embedded-key signatures and Authenticode (surprise 22). The minisign/cosign-with-stock-tools remainder stays deferred.

Row text corrections:
- **Artifact set, `shell-quality` globs**: add `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml`, both with `--allow-absent`.
  - shell-ci.md Verdict 11 and owner Q7 default "the globs yes".
  - Neither glob is live in www-setup, checked by `git ls-files` on 2026-10-11.
  - Wave 3 recorded the GitLab rules (surprise 13) but never added the globs.
- **Artifact set, "Not in scope: Windows `cmd.exe` batch scripting"**: this means authored `.cmd`/`.bat` files. Emitted Batch is in scope (SH-EMIT-48..50).
- **Artifact set, skills**: `installer-script` cites SH-INST-22, SH-INST-23 and PS-SEC-14 as provisional MUST rows. The M-W-02 hold stays released (wave 3).
- **M-T-04/M-T-05**: SH-TEST-18..22 keep their IDs and are authored in `powershell-quality/gates.md` (X48). PS-GATE-11 is now taken by CANDIDATE-PSGATE-1, so testing O1's fallback renumber, if the checker ever forces it, starts at PS-GATE-12.
- **M-U**: PS-SEC-06 binds every 5.1-bound script that touches `SecurityProtocol`, not only installers (wave 3 X on PS-COMPAT-09, map line 2044).

New deferred rows (trigger in brackets):
- **M-T-09**: the PS-GATE-06 unknown-parameter mode as a MUST [a fresh round with 0 false findings].
- **M-M-24**: ble.sh v0.4.0 final and builds between devel3 and the nightly [a new ble.sh tag; re-run blw V9, V10, V22].
- **M-M-25**: a OneDrive-redirected `Documents` and a BOM-less ANSI profile holding non-ASCII, under SH-EMIT-51 and SH-EMIT-16 [a user reports a profile that stops loading].
- **M-E-11**: Windows cross-user argv visibility and Git Credential Manager forms (security subareas) [a Windows-only installer handles a secret].

Still open, unchanged:
- M-A-17, M-B-19, M-E-09, M-E-10, M-F-17, M-G-09, M-G-10, M-K-08, M-M-21..23, M-N-15.
- V (PS-CORE): assembled at drafting.
- X (M-X-01..06): owner and sibling actions; M-X-05 is residue (section g).

### (d) Frame corrections

- **The stop condition is met at the drafts, not at another research round.** The held-out round produced 15 classes. Every one is plant- and twin-proven except the PowerShell half of CANDIDATE-CI-3 and the grep half of CANDIDATE-CORE-1. Every amended cell was fitted on the same 64 trees, so those trees are spent. The clean round the wave plan asks for therefore runs as a confirmation round, against the drafted artifacts, on fresh trees (orchestrator decision 2026-10-11). It replays the amended cells unmodified and clears the `provisional: true` markers.
- **The funnel's "~60-100 shipped rules" (rule-distillation.md) is per language surface.** This set covers seven surfaces (sh/bash, zsh, fish, nu, elvish, PowerShell, CI YAML) plus emitters and installers, in two rule files and twenty depth files. The budget is therefore applied per depth file (authoring notes, Budgets), and selection drops pointers and catalog-only rows rather than measured MUST rules.
- **A RETURN trap persists; it does not re-fire on later plain calls** (heldout conflict 1, 8 bash versions).
- **For 5.1 the BOM is the fix, and ASCII-only is not the hazard** (heldout conflict 5; choco 270 of 275 files carry a BOM). ASCII-only remains required where a BOM breaks delivery: `irm | iex`, `#!` files, and emitted PowerShell (PS-ENC-02, SH-EMIT-08).
- **Shebang detection that tests the exact text `#!/bin/sh` is wrong.** `#! /bin/sh`, `#!  /bin/sh` and a CRLF `#!/bin/sh` are real shapes (heldout conflict 3 and the verdict-author amendments).
- **The program's harnesses are not inherently read-only.** A third-party `--install` honoured an inherited `ZDOTDIR`. Every harness that runs third-party installers runs under `env -i` with a throwaway `HOME` (SH-CORE-16).
- **`plant/trailing.sh` is not evidence for SH-INST-01** (heldout conflict 4). The red evidence is `linear.sh` and `toplevel.sh`.
- **`$PSVersionTable.OS` cannot identify a platform.** Only `$IsWindows`/`$IsMacOS`/`$IsLinux` plus `PSVersion.Major -lt 6` can (CANDIDATE-PSCOMPAT-1).
- **Two Windows facts differ from the Unix rows** (emit F16):
  - elvish reads `%XDG_CONFIG_HOME%\elvish\rc.elv`, else the RoamingAppData known folder, and never `~/.config` on Windows;
  - nu's `$nu.data-dir` is `%AppData%\nushell`, moved by `XDG_DATA_HOME` and not by `%APPDATA%`.
- **ble.sh discards a `PROMPT_COMMAND` write only between `ble-attach` and the first prompt**, on v0.4.0-devel3 and the nightly. Wave 3's "after attach" overclaimed (emit conflict 21).
- **The `shell-quality` glob list in "Artifact set decision" lacks the two GitLab globs** (section c).

### (e) Cross-consolidation contradictions

Every ruleset was read against every other. X1 to X58 of waves 2 and 3 stand. New pairs, continuing the numbering:

- **X59, the `s05` cell.**
  - Pair: heldout block 7 (bare name must start alphanumeric; skip `.bats`; filter `sec-ok:` without a reason) against shell-security.md `s05-bare-source` (first character `[^/$<"[:space:]~-]`, which catches `. .env`, security C5(a); reasoned filter).
  - Resolution: keep security's pattern, because the alphanumeric start loses `. .env`, which was measured falling back to the cwd. Add heldout's `.bats` skip. Keep the reasoned filter. The cell is in the authoring notes (Security wave-4 revision).
  - Text: SH-SEC-05 (shell-security.md).
- **X60, the `s02` header alternative.**
  - Pair: heldout block 7's double-quoted bound `'(-H|--header)[ =]+"[^"]*(Authorization|...)[^"]*[$]'` (fixes 2 of 7 false positives) against security's `.?` form in `s02-argv` and `s02-argv-yaml`.
  - Resolution: heldout's alternative replaces security's first alternative in both cells. Security's other alternatives and `s02-argv-var` are unchanged. The confirmation round re-watches `SS/plant` (10 lines) and `AV/plant` (18 lines).
  - Text: SH-SEC-02 (shell-security.md).
- **X61, waiver filter shape.**
  - Pair: heldout's bare `grep -v -E -e 'sec-ok:'` (block 7) against security C22 and SH-GATE (`TOKEN: *[^ ]`).
  - Resolution: the reasoned shape everywhere, for all four tokens (`vd-ok:`, `userland-ok:`, `sec-ok:`, `tell-ok:`).
  - Owner: SH-GATE-21..31 for the shape; X54 for the token set.
- **X62, file-list helpers.**
  - Pair: heldout's `files`/`shfiles` (`... | xargs -0 -r shfmt -f | tr ...`) and gate script line 145, against security C21 (`shfmt -f --`, `shellcheck --`).
  - Resolution: `--` before operands in every helper, in gate script line 145, and in the gate's `shfmt -d --apply-ignore -- "${all[@]}"` and `shellcheck -- "${sc[@]}"` calls. The confirmation round re-watches the gate on the 33 plants.
  - Text: SH-GATE-09 and SH-GATE-22.
- **X63, PowerShell encoding.**
  - Pair: shell-pwsh.md PS-ENC-01 and Verdict 1/4 ("5.1-bound: ASCII only, no BOM") and SH-EMIT-08/40 ("emitted PowerShell: ASCII, no BOM"), against heldout's rewrite and the owner default (BOM-aware).
  - Resolution, by delivery route:
    - An on-disk `.ps1`/`.psm1`/`.psd1` that must run on 5.1 and holds non-ASCII carries a UTF-8 BOM, or spells the character as `[char]0xNNNN` (MUST).
    - ASCII-only is a SHOULD for new on-disk files.
    - ASCII-only stays MUST for `irm | iex`-delivered and `#!` files (PS-ENC-02) and for emitted or generated PowerShell (SH-EMIT-08, 40), because a BOM breaks `iex` and the emitter does not choose the route.
    - Locale data loaded by `Import-LocalizedData` may be BOM-less UTF-8.
    - PSSA keeps `PSUseBOMForUnicodeEncodedFile` on for the 5.1 kinds and excludes it for the 7.6 script and test kinds (pwsh Q2, heldout PS-GATE-03).
  - Text: PS-ENC-01 (rewritten). SH-EMIT-08 and PS-ENC-02 are unchanged.
- **X64, PS-COMPAT-04 split against PS-COMPAT-11.**
  - Pair: heldout's PS-COMPAT-04 MUST half names `$PSVersionTable.Platform`/`.OS` under StrictMode, and CANDIDATE-PSCOMPAT-1 bans `.OS` matching outright.
  - Resolution:
    - PS-COMPAT-04 keeps `$IsWindows` used alone (MUST) and `.Platform` under StrictMode (MUST), and makes `$IsLinux`/`$IsMacOS` outside StrictMode a SHOULD.
    - PS-COMPAT-11 owns every `.OS` text match, in any mode.
  - Text: each rule keeps its own half.
- **X65, SH-FISH-07.**
  - Pair: alt-shells C4 (a blanket `||` ban while the floor is below 4.7.0) against heldout conflict 9 (only an unknown-command left side skips the right side).
  - Resolution: rescope to "no unknown command on the left of `||` while the floor is below 4.7.0". Keep the `or`/`and` half. Check F5b runs as an awk `checks/` script (its `-P` lookahead is banned in a cell).
  - Text: SH-FISH-07.
- **X66, SH-TEST-20 against SH-TEST-19.**
  - Pair: SH-TEST-20's last sentence (`-AllowNullOrEmptyForEach` on purpose) against heldout F16.
  - Resolution: reverse it. Never pass the flag in a gating run; pin the total with `-ExpectedTotal N` in SH-TEST-19.
  - Text: SH-TEST-19 and SH-TEST-20.
- **X67, SH-INST-03 against the pnpm signature.**
  - Resolution: a signature verified against an embedded key is accepted. Without the verifying tool, fail closed unless the digest is pinned, and say so in the header.
  - Text: SH-INST-03.
- **X68, PS-SEC-01 against Authenticode.**
  - Resolution: accepted only with `Status -eq 'Valid'` and an anchored full-string signer pin. The hash or signature check precedes every path that reaches extraction or execution.
  - Text: PS-SEC-01.
- **X69, SH-ERR-31 against the held-out glob loops.**
  - Resolution: a loop over a directory the script itself ships is exempt. Add the array form with `[ ! -e "${a[0]}" ] && [ ! -L "${a[0]}" ]`, and never `${#a[@]}` as the emptiness test.
  - Text: SH-ERR-31. SH-EXP-21 keeps the C-12 wording (X47).
- **X70, SH-INST-12 against CANDIDATE-INST-2.**
  - Resolution: SH-INST-12 keeps the user-space installer text. SH-INST-23 owns escalation, including the root-by-design exception.
  - Text: each its own.
- **X71, CANDIDATE-INST-1 against SH-USER-10, SH-INST-05 and SH-INST-16.**
  - Resolution: SH-USER-10 owns the generic wget probe. SH-INST-22 owns tty-invariant options and the BusyBox v1.37.0 option set. SH-INST-16's curl `--retry-connrefused` probe is unchanged.
  - Text: each its own. Overlap only.
- **X72, CANDIDATE-PSSEC-1 against SH-INST-06.**
  - Resolution: SH-INST-06 stays the `install.sh` rule. PS-SEC-14 is the `.ps1` form with a `throw`.
- **X73, workflow enumeration.**
  - Pair: CANDIDATE-CI-1's `find .github/workflows -maxdepth 1 -type f -name '*.y*ml'` against SH-GATE-21 (git-fed lists only).
  - Resolution: the git-fed form with top-level glob pathspecs, `git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/*.yml' ':(glob).github/workflows/*.yaml'`. Under `:(glob)` a `*` does not cross `/`, so data subdirectories drop out. `find` reads ignored files and is not git-fed.
  - Text: SH-CI-31. The recursive cells of SH-CI-01/02/05/07/08/16/23/24 change to it.
- **X74, CANDIDATE-CI-3 against SH-CI-28.**
  - Resolution: SH-CI-28 gains the scope "a job on a Linux runner". SH-CI-33 owns Windows-runner jobs (lint under the PS rules, never ShellCheck).
  - Text: each its own, in the same depth file.
- **X75, CANDIDATE-CI-2 against SH-CI-17.**
  - Resolution: SH-CI-17 owns how to set pipefail; SH-CI-32 owns when it must be in scope.
- **X76, check commands outside the dialect.**
  - Pair: CANDIDATE-TEST-3's `rg -o` and CANDIDATE-CORE-1's `grep -rnE --include ... | xargs -r grep -L` (which feeds `file:line:text` to xargs as file names) against SH-GATE-21/23/25.
  - Resolution: both are translated (authoring notes, Final IDs).
- **X77, PS-GATE-06's wildcard example.**
  - Pair: `-Allow '*-Az*'` at shell-pwsh.md line 286 against heldout (a wildcard hides `Get-AzVMFooBarBaz`).
  - Resolution: no wildcard entries; a reviewed, repo-owned allow-list; the rule split by mode (M-T-09).
  - Text: PS-GATE-06.
- **X78, `Add-Content`.**
  - Pair: SH-EMIT-51 ("append a profile only with `Add-Content`") against SH-CI-11 and PS-ENC-10 ("never bare `Add-Content`" into runner files).
  - Resolution: not a contradiction once the target is named. Each rule sentence names its file: the profile for SH-EMIT-51; `$GITHUB_ENV`, `$GITHUB_PATH` and `$GITHUB_OUTPUT` for PS-ENC-10. Drafters never write either rule without its target.
- **X79, cells in emit and alt-shells outside the dialect.**
  - Pair: emit Q5 ("keep `grep -rn --include` as measured") and the alt-shells and heldout D cells, against SH-GATE-21..31.
  - Resolution: the gate dialect binds every shipped cell. A PCRE original survives only as a labelled `(GNU grep)` extra beneath the portable cell.
  - Text: SH-GATE-21..31.
- **X80, emitter restatements.**
  - Pair: SH-EMIT-10, 12 and 15 restating SH-EXP and SH-DIAL rules (emit Q6, "drop from the family that ships second") against same-time shipping.
  - Resolution: both ship. The emit rows are the emitter instance (the subject is emitted text and the emitter's source), written self-contained.
  - Text: SH-EMIT-10, 12 and 15 for emitters; SH-EXP and SH-DIAL for scripts.
- **X81, alt-shells cross-file pointers** (emit "Cross-file pointers").
  - Resolution:
    - SH-NU-07 gains the ask-nu sentence: `nu --no-config-file -c '$nu.vendor-autoload-dirs | last'`, the Windows `%AppData%\nushell` fact, and "a `-c` script loads no autoload".
    - The proposed new SH-ELV row for the `rc.elv` location is rejected, because SH-EMIT-16 owns rc locations and an `.elv` author is not choosing an rc file.
  - Text: SH-NU-07 (amended); SH-EMIT-16.
- **X82, depth-to-depth pointers.**
  - Pair: X56 (SH-SEC-08 gains a pointer to SH-CI-29's ref clause), X6 (SH-CI-19 points at the SH-GATE-07 allow table) and the wave-2 "becomes a pointer" rows, against rule-distillation's "no chains".
  - Resolution: no shipped row's content lives in another depth file.
    - SH-SEC-08 copies the ref-clause sentence.
    - SH-CI-19 copies the allow rows it uses.
    - A pure pointer whose owner is reachable through the index routing table in the same rule file is dropped.
    - A cross-rule-file pointer ships as a self-contained copy, because a workflow edit never loads `powershell-quality`. SH-CI-11 copies PS-ENC-10's writer list, and SH-CI-12 copies PS-ERR-03's run-step guard at MUST.
  - The drop list is in the authoring notes.
- **X83, SH-ERR-13 and SH-CI-03 under X2.**
  - Pair: X2 made both "pointers" to SH-DIAL-07/08, but SH-CI-03 carries CI-only content (bash syntax under `shell: sh`).
  - Resolution:
    - SH-ERR-13 duplicates SH-DIAL-07/08 entirely and is dropped.
    - SH-CI-03 ships as a full row whose probe line and SC3040 directive wording are copied verbatim from SH-DIAL-07/08.

### (f) Convergence

The stop condition for research is met:
- No question remains that only research can answer and that blocks drafting.
- The 15 new classes enter as provisional rules with watched checks.
- The one round left is verification of drafted artifacts on fresh trees, which the orchestrator has placed after drafting.

Verdict: **ready-to-draft**.

Open questions by class:
- **Dated re-checks.** These do not block drafting; each dated item carries its date in the rule text.
  - pwsh 7.4/7.5 EOS 2026-11-10: drop the 7.4 parse column and the SH-EMIT-05 empty-value clause for 7.4.
  - `ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15).
  - Pester 6.3 (SH-TEST-18).
  - The next PSSA release (PS-GATE-01..06; M-T-09).
  - The next ShellCheck release (SC2337, SC3040/SC3003; re-run `burndown.py`).
  - zizmor bump and the dotted-matrix plant (SH-CI-24).
  - task and mvdan/sh bumps.
  - fish 4.1 to 4.6, for the `||` fix release.
  - nu 0.117+ and `nu-gate.nu` JSON.
  - uutils 0.12 and Ubuntu 26.10.
  - bash 5.3 interp 1602, yash 2.61, zsh 5.10, dash 0.5.13.
  - A ble.sh v0.4.0 final (M-M-24).
  - `irm` after KB5129195.
  - [axodotdev/cargo-dist#2497](https://github.com/axodotdev/cargo-dist/pull/2497).
- **Measurements the corpus cannot supply.** Each keeps its "unverified: read only" label.
  - macOS and BSD, all families. There is no macOS host.
  - A real GitHub-hosted runner, a real GitLab Runner, and the hosted 5.1 env-file reader.
  - nu and elvish hook forms on Windows.
  - OneDrive-redirected and ANSI profiles (M-M-25).
  - Non-1252 ANSI hosts and the UTF-8 beta locale.
  - Legacy .NET below 4.7 and old Archive builds.
  - NFS and SMB locks.
  - Windows cross-user argv and GCM (M-E-11).
  - CI log masking (M-E-10).
  - Credential helpers (security).
- **Owner decisions, with the default applied:**
  - PS-ENC-01 BOM-aware (X63).
  - Root-by-design installers inside SH-INST-23 with a documented exception.
  - A hand-listed runner carries an explicit exclude list (SH-TEST-25).
  - The sibling-set dialect migration (M-X-05) stays outside this set (residue).
  - Disclosure of the PowerShell curly-quote injection, confirmed by the orchestrator on pwsh 7.4, 7.6.6 and real WinPS 5.1 (`fixtures/orch-verify/inj.ps1`). Default: file nothing.
  - Fleet defects: report only (X55).
  - Every consolidation's Q defaults carried in wave 3 (f).
- **Answerable now and load-bearing.** None for research. The confirmation round answers three questions against the drafts:
  - the out-of-sample precision of every heldout-amended cell and every translated cell;
  - the PowerShell half of SH-CI-33;
  - the grep half of SH-CORE-16.
- **Answerable now, not load-bearing.** Deferred:
  - M-B-19, M-F-17, M-G-09, M-G-10, M-M-21..23, M-N-15;
  - the SH-INST-07 non-validating `busybox:1.37` run, folded into the confirmation round.

### (g) Residue

Residue is what drafting leaves open, and no research wave closes it:

- **M-X-05, the sibling sets' verification dialect** (about 1132 `grep --include` lines; gate G9, skills Q2).
  - Owner decision outside this set.
  - The shell set ships portable cells only, and the checker's quoted-glob lint keeps protecting the siblings meanwhile.
- **M-X-01..04 and M-X-06**: catalog-wide owner actions, including the depth-file never-glob backfill (M-X-03).
- **Disclosure** of the curly-quote injection (ocx, direnv 2.37.1, mise 2026.10.2, clap_complete 4.6.8/4.6.9 through grim and ocx completions) and of the third-party defects in heldout "Third-party defects observed". The owner decides; the program files nothing.
- **Deferred rows**:
  - carried: M-A-17, M-B-19, M-E-09, M-E-10, M-F-17, M-G-09, M-G-10, M-K-08, M-M-21..23, the M-N-14 remainder, M-N-15;
  - new: M-T-09, M-M-24, M-M-25, M-E-11.
- **The confirmation round itself.**
  - Five dives of about 6 fresh trees each:
    - posix cells;
    - installers plus PS-SEC;
    - CI plus fish and elvish;
    - PowerShell;
    - test suites.
  - It runs on the drafted artifacts, never on the 64 held-out trees and never on the 41 corpus repos or the fleet.
  - A clean round clears every `provisional: true`.
  - A new class sends only its family back to research.

## Authoring notes (binding on the drafters)

These notes bind every drafter of the shell set. Where they conflict with a consolidation, they win, because they fold the wave-4 resolutions above. Where they are silent, the consolidation text is the source, and its measured numbers, versions and citations carry over unchanged. Never cite a dive draft number or a `CANDIDATE-*` label in a shipped artifact; cite final IDs only.

### 1. Artifact set and exact globs

**`rules/shell-quality.md`** (index), frontmatter `paths`, one plain glob per line, no brace globs:

```yaml
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.bats"
  - "**/*.zsh"
  - "**/*.ksh"
  - "**/*.fish"
  - "**/*.nu"
  - "**/*.elv"
  - "**/.shellcheckrc"
  - "**/.github/workflows/*.yml"
  - "**/.github/workflows/*.yaml"
  - "**/action.yml"
  - "**/action.yaml"
  - "**/Taskfile.yml"
  - "**/taskfile.yml"
  - "**/*.taskfile.yml"
  - "**/.gitlab-ci.yml"
  - "**/.gitlab-ci/*.yml"
```

Liveness:
- The liveness root is `/home/mherwig/dev/www-setup`.
- The checker takes `--allow-absent` for `**/*.zsh`, `**/*.ksh`, `**/.shellcheckrc`, `**/action.yml`, `**/action.yaml`, `**/.github/workflows/*.yaml`, `**/Taskfile.yml`, `**/.gitlab-ci.yml` and `**/.gitlab-ci/*.yml`.

**`rules/powershell-quality.md`** (index):

```yaml
paths:
  - "**/*.ps1"
  - "**/*.psm1"
  - "**/*.psd1"
```

All three are live in www-setup.

**Depth files**:
- Every file under `rules/shell-quality/` takes exactly `paths: ["**/.shell-quality-depth-on-demand"]` with the house comment.
- Every file under `rules/powershell-quality/` takes `paths: ["**/.powershell-quality-depth-on-demand"]`.
- Never a real glob on a depth file.

**Never glob**:
- `**/bin/*`, and no shebang guess;
- dotfiles (`.bashrc`, `.zshrc`);
- `Makefile`, `Dockerfile`, `.editorconfig`.

**Skills:** `shell-integration`, `installer-script`, `shell-port`, `shell-diagnose`.

**Bundle:** `shell-essentials`. Its members carry no tag:
- `./shell-quality`
- `./powershell-quality`
- `./shell-integration`
- `./installer-script`
- `./shell-port`
- `./shell-diagnose`
- `./code-docs`
- `./code-docs-cleanup`

**Checks:**
- `rules/shell-quality/checks/` and `rules/powershell-quality/checks/` (pwsh Q1, testing O4, precedent `swift-quality/checks/`).
- The index tells adopters to copy them to `scripts/`.

### 2. Index-owned rules against depth-owned rules

**`shell-quality` index (SH-CORE).** Front-load in this order:
1. The gate block: `bash scripts/shell-gate.sh`, copied from `checks/shell-gate.sh`, plus the PREFLIGHT line.
2. SH-CORE-04, read the floor first.
3. The script-kind table. This is a pinned decision; one line per kind:
   - INST, RC, EMIT-for-sh: `#!/bin/sh`, POSIX.1-2017 plus probes, `set -eu` or `set -u` plus explicit checks.
   - TOOL, CI: `#!/usr/bin/env bash`, floor 3.2.57, `set -euo pipefail`.
   - LIB: no shebang, no options.
   - GATE: `set -u`, no `-e`.
   - Sources: SH-DIAL-03/05, SH-ERR-23.
4. Rows SH-CORE-01, 02, 03, 05 and 16 (provisional).
5. The SH-CORE-07 tell table, as six cells.
6. The waiver-token table (four tokens, reason required).
7. The routing table, task to depth file. A task may name two depth files, which is how cross-family subjects are reached without chains:
   - enabling pipefail in sh: `dialect.md`;
   - an empty array under `set -u`: `errors.md`.
8. The sibling map (code-docs for header comments).
9. One version-dating line.

Under 200 lines.

**`powershell-quality` index (PS-CORE assembly).** No PS-CORE consolidation exists, so the index drafter assigns PS-CORE-01.. to exactly three index rows, and no row restates a depth rule's text:
- **PS-CORE-01**: run the gate wrapper (exit 0/1/2: `Invoke-PSGate-rev3.ps1` from heldout E, shipped under `checks/`), with the 5.1 `Parser::ParseFile` gate on a 5.1 host. U21 owns the wrapper script; the index only calls it.
  - Cites PS-GATE-01..04 and 11.
  - Source: shell-pwsh.md Verdict 2 and 6.
- **PS-CORE-02**: the target-by-kind table, a pinned decision:
  - 5.1 for installers, bootstrap and anything run by `irm | iex` or `powershell -File`;
  - 7.6 for repo, dev, CI and Pester scripts;
  - modules dual-edition.
  - Source: shell-pwsh.md Verdict 1, PS-COMPAT-01.
- **PS-CORE-03**: the PowerShell tell set (map M-V-02), taken from shell-pwsh.md "AI-agent failure modes" (lines 532-558) and "Rules by the check that catches them" (lines 307-323), plus testing O1's cells P1, P2 and the census script.

The index also carries:
- the routing table to the six depth files, naming `gates.md` for `*.Tests.ps1` work (SH-TEST-18..22);
- the waiver tokens;
- the dating line.

Under 200 lines.

**Not shipped as adopter rows.** These rows bind the catalog, not adopter code. They become obligations on the drafters (section 9) and the checker:
- SH-CORE-10 (MUST-rows table form);
- SH-CORE-11 (SKILL.md body at most 500, as `check-artifacts.py` counts it, target 460);
- SH-CORE-12 (plain globs, index at most 200 lines);
- SH-CORE-13 (fence lint of the set's own blocks);
- SH-CORE-14 (routing and sibling map: satisfied by building the index);
- SH-CORE-15 (a ranked "What agents get wrong" table in each skill).

**Shipped inside the skills as procedure, not as rule rows:**
- SH-CORE-06: `shell-diagnose` symptom catalog.
- SH-CORE-08 and SH-CORE-09: `shell-port`.

Their IDs stay cited in the skills' finding tables where they are MUST (SH-CORE-08).

**Everything else is depth-owned.** One family per depth file:
- `shell-quality`: SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-SEC, SH-GATE, SH-TEST (01..17, 23..25), SH-CI, SH-ZSH, SH-FISH, SH-NU, SH-ELV, SH-EMIT, SH-INST.
- `powershell-quality`: PS-COMPAT, PS-ERR, PS-NATIVE, PS-ENC, PS-SEC, plus PS-GATE together with SH-TEST-18..22 in `gates.md` (X48).

Never renumber an ID. A dropped ID is retired and never reused.

### 3. Depth files, families and source sections (one drafter per unit, no overlap)

Each unit writes only its own file and the `checks/` scripts named for it. A new script name is prefixed with the depth-file stem (`ci-`, `ps-enc-`, ...), except the names the consolidations already fix:

| Script | Owner unit |
|---|---|
| `shell-gate.sh` | U7 |
| `secret-argv.sh` | U6 |
| `bats-lint.sh`, `bats-census.sh` | U8 |
| `pester-lint.sh`, `Invoke-PesterGate.ps1`, `Test-DiscoveryCode.ps1`, `Invoke-PSGate.ps1` | U21 |

"Heldout X" means shell-heldout.md "Check amendments" section X (A lines 204-323, B 324-341, C 342-387, D 388-402, E 403-424, F 425-441). "RW" means its "Rules weakened or contradicted" tables (lines 442-475).

**`shell-quality`**

- **U1, the index (SH-CORE).**
  - Sources:
    - shell-skills.md lines 41-228;
    - shell-gate.md lines 77-227 (gate block only) and 452-565 (PREFLIGHT and dialect summary);
    - heldout A row SH-CORE-07 T1 (block 4 `shfiles` scope);
    - shell-heldout.md lines 181-187 (SH-CORE-16);
    - this map's "Artifact set decision".
- **U2, `dialect.md` (SH-DIAL).**
  - Sources:
    - shell-dialect.md lines 28-58;
    - 59-221 (every cell and table except rows owned by an SH-USER ID);
    - 222-385;
    - 519-542 (retired table; ship none of it);
    - heldout A rows d01, d06, d07 and `shfiles` (blocks 2-4) and the verdict-author amendments (lines 317-323).
  - Also fix the `{1..3}` composition at shell-dialect.md line 111: mksh runs it once, ksh93u+m three times (installer C7).
- **U3, `userland.md` (SH-USER).**
  - Sources: shell-dialect.md lines 386-518, and the SH-USER-owned rows of lines 59-221.
  - Heldout A row u01: delete the `echo -e` alternative.
- **U4, `errors.md` (SH-ERR-01..12, 14..34).**
  - Sources:
    - shell-errexit.md lines 18-351;
    - heldout A rows SH-ERR-03 (block 6 G-IFS), 04, 15, 16, 26 and 29 (limit note), and block 8;
    - shell-heldout.md lines 78-85 (SH-ERR-34);
    - RW SH-ERR-31.
  - SH-ERR-12 also absorbs:
    - the 3.2 measurement of SH-EXP-20 (shell-expansion.md lines 178-183);
    - `${1+"$@"}` at every forwarding site (installer retirement row SH-INST-13).
- **U5, `expansion.md` (SH-EXP-01..19, 21..23).**
  - Sources:
    - shell-expansion.md lines 18-233;
    - heldout A rows X08 (block 6) and X09 (`shfiles` scope);
    - SH-EXP-21 takes errexit C-12's text (X47);
    - SH-EXP-13 reads "literal or validated name, every shell" (security catalog edit);
    - SH-EXP-09 is a drafting and reading rule with its X09 cell scoped to `shfiles` (RW).
- **U6, `security.md` (SH-SEC-01..14).**
  - Sources:
    - shell-security.md lines 17-311, including the 22-cell block;
    - heldout A rows s05, s02, s11 as resolved by X59-X61;
    - `checks/secret-argv.sh` from the security fixtures, with the waiver patch `if (line ~ /sec-ok:[ \t]*[^ \t]/) next`.
  - SH-SEC-08 carries SH-CI-29's ref clause as its own sentence (X82).
- **U7, `gates.md` (SH-GATE-01..19, 21..26, 28..31, 33, 34).**
  - Sources:
    - shell-gate.md lines 17-603. The shipped files at lines 77-227 go to `checks/shell-gate.sh` and to template blocks, and are not restated inline.
  - Heldout A:
    - 02-c, four keys. Remove `enable=check-extra-masked-returns` at shell-gate.md lines 87, 245, 428 and 433, and from SH-GATE-19's `SHELLCHECK_OPTS`.
    - the gate script block 5;
    - cell 16-a, block 4;
    - a new SH-GATE-07 row for SC2218: order helpers above the first `@test`, never `disable=SC2218`.
  - X62 `--`.
  - X35: SH-GATE-11 keeps only the table. The zsh row carries the 5.3.1 floor (alt C1), the nu row `nu-gate.nu`, the elvish row `elv-gate.sh`.
- **U8, `testing.md` (SH-TEST-01..17, 23..25).**
  - Sources:
    - shell-testing.md lines 17-576 (bats rows and the bats reference scripts) and 627-652;
    - heldout F bats rows (`bats-census2.sh`, the junit report formatter, the static count plus `CENSUS_EXCLUDE`, `l3v2`, `l2v3`, `l5v3`, `l6v2.awk`);
    - shell-heldout.md lines 160-180;
    - RW SH-TEST-02, 04, 09.
  - Add L8 and L9 to `checks/bats-lint.sh`, from `$FX/heldout-test-suites/ref/l8l9.sh`.
- **U9, `ci.md` (SH-CI-01..10, 11 and 12 as self-contained copies, 13..33).**
  - Sources:
    - shell-ci.md lines 31-391;
    - appendices lines 555-716, superseded by heldout C's `gl-extract2.py`, `tf-extract2.py` and `job-shell-lint2.py`, shipped under `checks/ci-*`;
    - heldout C lines 342-387;
    - shell-heldout.md lines 139-159.
  - X6, X8 and X10 applied:
    - SH-CI-19 copies the SH-GATE-07 allow rows it needs;
    - SH-CI-11 copies PS-ENC-10's writer list, both writers accepted;
    - SH-CI-05 is scoped to bash templates, with known-good shims `msys2 {0}` and `bash -euo pipefail {0}`.
  - SH-CI-12 copies PS-ERR-03 at MUST.
- **U10, `zsh.md` (SH-ZSH).**
  - Sources: shell-alt-shells.md lines 22-58 (C1-C3, C10-C12, C14), 59-168, and the zsh parts of 421-501.
  - Heldout D: SH-ZSH-01 Z4 role filter; SH-ZSH-12 gate at 5.3.1.
- **U11, `fish.md` (SH-FISH).**
  - Sources: shell-alt-shells.md lines 169-284 and the fish parts of 421-501.
  - RW SH-FISH-07 (X65), heldout D F5b.
- **U12, `nushell.md` (SH-NU).**
  - Sources: shell-alt-shells.md lines 285-376 and `nu-gate.nu`.
  - Heldout D: SH-NU-02 `use DIR/` wrapper; SH-NU-05 floor grep.
  - SH-NU-07: the ask-nu sentence (X81).
- **U13, `elvish.md` (SH-ELV).**
  - Sources: shell-alt-shells.md lines 377-420 and `elv-gate.sh`.
  - Heldout D: E2b (`a=b cmd`).
- **U14, `emit.md` (SH-EMIT-01..31, 33..51).**
  - Sources: shell-emit.md lines 22-533, and 702-760 for the third-pass amendments.
  - Heldout D: the C5 static aid, the SH-EMIT-03 aid, the SH-EMIT-24 aid, and the hook-harness fixes (pty, zero firings INVALID, fish judged per event).
  - The harnesses and `corpus.txt` go to `shell-integration/references/` (emit Q4), not to the rule.
- **U15, `installers.md` (SH-INST-01, 03..09, 11, 12, 16, 17, 19, 20, 22, 23).**
  - Sources:
    - shell-installer.md lines 19-166 and the cargo-dist checklist at lines 335-349 (into SH-INST-20);
    - heldout B `install.sh` rows (t-trunc seeded `p_seedold` plus `P_ARGS=--force`, `T_NTH=2` t-trap, t-flags row 2t pty, the 4-pattern SH-INST-05 grep, pnpm-allhash);
    - shell-heldout.md lines 86-101;
    - RW SH-INST-03, SH-INST-01 evidence, SH-INST-07.

**`powershell-quality`**

- **U16, the index (PS-CORE).** As in section 2.
- **U17, `compat.md` (PS-COMPAT-01..08, 10, 11).**
  - Sources:
    - shell-pwsh.md lines 68-123;
    - heldout E: PS-COMPAT-01 (the `-L` form), 02 (end-of-line `&&` and the generic static call), 04 (split, X64) and 05 (illustrative list; the resolver's unknown-parameter mode is the check);
    - shell-heldout.md lines 110-117.
- **U18, `errors.md` (PS-ERR-01..04, 06..09).**
  - Sources:
    - shell-pwsh.md lines 181-226;
    - heldout E PS-ERR-03 (`pwsh-run-lint-rev3.py`, honouring `defaults.run.shell`);
    - shell-heldout.md lines 132-138.
  - Note that the dive-draft "PS-ERR-09" in pwsh conflict 8 became PS-ERR-08. The final PS-ERR-09 is the `finally` rule.
- **U19, `native.md` (PS-NATIVE-01..03).**
  - Sources: shell-pwsh.md lines 227-245; heldout E N16 and N17.
- **U20, `encoding.md` (PS-ENC-01..11).**
  - Sources:
    - shell-pwsh.md lines 124-180;
    - the PS-ENC-01 rewrite (X63, RW row, owner default);
    - shell-heldout.md lines 118-124;
    - heldout E N3, N4, N8, N18;
    - PS-ENC-02 by role;
    - `step-shell.py`.
- **U21, `gates.md` (PS-GATE-01..11 and SH-TEST-18..22).**
  - Sources:
    - shell-pwsh.md lines 246-306;
    - shell-testing.md lines 577-626 and the Pester reference scripts in lines 77-340;
    - heldout E (`Invoke-PSGate-rev3.ps1` exit 2, `parse-gate-rev3.ps1`, N10, N11, and the PS-GATE-03, 04 and 06 rewrites; for PS-GATE-06, no wildcards and a split by mode);
    - heldout F Pester rows (`p1v2`, `':(icase)*.tests.ps1'`, `Test-DiscoveryCode2`, `Invoke-PesterGate2 -ExpectedTotal`);
    - RW SH-TEST-19 and 20;
    - shell-heldout.md lines 125-131.
- **U22, `security.md` (PS-SEC-01..11, 14).**
  - Sources:
    - shell-installer.md lines 167-255;
    - heldout B `.ps1` rows (`ast-sec2.ps1` with UNVERIFIED-PATH, EXIT-TOPLEVEL-UNGUARDED and INVOKE-EXPRESSION-TOKEN; `check-iex-survival` with `ReadToEndAsync`; PS-SEC-06 06a/06b; the Authenticode alternative);
    - shell-heldout.md lines 102-109;
    - RW PS-SEC-01.
  - PS-SEC-06 binds every 5.1-bound script that touches `SecurityProtocol`.
  - PS-SEC-09 takes PS-ERR-05's www-setup rows (`install.ps1:182,734`).

**Skills and plumbing**

- **U23, `shell-integration`.**
  - Procedure from SH-EMIT.
  - Reads `emit.md`, `fish.md`, `nushell.md`, `elvish.md`, `zsh.md` and `powershell-quality/encoding.md`.
  - `references/` holds:
    - `corpus.txt` (36 lines, hex);
    - the per-target harness;
    - the four hook harnesses;
    - the completion read-back;
    - the Batch matrix as a script plus its recorded plant and twin logs.
- **U24, `installer-script`.**
  - Sources: shell-installer.md lines 318-349 (procedure and receipt) and the cargo-dist checklist.
  - MUST rows from SH-INST and PS-SEC. Provisional rows are marked.
- **U25, `shell-port`.**
  - Sources: SH-CORE-08/09 (shell-skills.md lines 156-174).
  - Reads `dialect.md` and `userland.md`.
- **U26, `shell-diagnose`.**
  - Sources: SH-CORE-05/06 and the route table (shell-skills.md lines 90-121, R5 mode row first for 126/127).
  - `references/` from the start.
- **U27, plumbing.**
  - `publish.toml` entries.
  - `docs/<artifact>.md` for each of the six artifacts and the bundle.
  - `assets/lore-shell.svg`.
  - A taskfile block with liveness root www-setup and the `--allow-absent` list of section 1.
  - The bundle.

### 4. Final IDs for the held-out candidates

Every candidate row ships with the literal token `provisional: true` on its Scope line until the confirmation round clears it. Final IDs continue each family's sequence and skip retired numbers (SH-INST-21 and PS-SEC-12/13 are retired).

- **SH-ERR-34** (MUST, `errors.md`), from CANDIDATE-ERR-1.
  - Rule: a function that sets `trap ... RETURN` ends the action with `trap - RETURN`.
  - Waiver: `# tell-ok:` for a deliberate `set -T` suite.
  - Cell: heldout block 8, already in dialect.
- **SH-INST-22** (MUST, `installers.md`), from CANDIDATE-INST-1.
  - Rule: the same wget options on and off a tty, from the BusyBox v1.37.0 set; probe the others with `wget --help`.
  - Cells:
    - heldout B SH-INST-05 4-pattern grep (git-fed, keep as written);
    - t-flags row 2t under a pty.
- **SH-INST-23** (MUST, scoped, `installers.md`), from CANDIDATE-INST-2.
  - Rule:
    - user prefix by default;
    - escalate only for an explicitly chosen unwritable prefix, and only the final copy;
    - announce the exact command;
    - offer `--no-sudo`;
    - never interpolate into `su -c '...'`.
  - Documented-exception clause: a root-by-design installer (package-manager dispatch) is labelled in its header and checked for the narrowest escalation.
  - Check: `MX_DOCKER_USER=1000:1000` t-root, plus reading where the first `sudo` falls.
- **PS-SEC-14** (MUST, PS `security.md`), from CANDIDATE-PSSEC-1.
  - Rule: a non-https environment or parameter URL is refused with `throw` before any request.
  - Cell: heldout B PSSEC-1 grep, git-fed. Add `'*.psm1'`.
  - The parameter half is a reading step.
- **PS-COMPAT-11** (MUST, `compat.md`), from CANDIDATE-PSCOMPAT-1.
  - Rule: read the OS from `$IsWindows`/`$IsMacOS`/`$IsLinux`, with `PSVersion.Major -lt 6` meaning Windows; never match `$PSVersionTable.OS`.
  - Cell:

    ```sh
    git ls-files -z --cached --others --exclude-standard -- '*.ps1' '*.psm1' | xargs -0 -r grep -n -H -F -e 'PSVersionTable.OS' --
    ```

- **PS-ENC-11** (MUST, `encoding.md`), from CANDIDATE-PSENC-1. The BOM half lives in PS-ENC-01.
  - Rule: never U+2013 or U+2014 in a code position. In a BOM-less 5.1-bound file it is a parse error.
  - Check: heldout N3, translated to `checks/ps-enc-dash.sh` (awk under `LC_ALL=C`, matching bytes `\342\200\223` and `\342\200\224` after a blank and before a letter, skipping files whose first three bytes are `\357\273\277`).
- **PS-GATE-11** (MUST, PS `gates.md`), from CANDIDATE-PSGATE-1.
  - Rule: a PSSA step turns findings into a non-zero status through the wrapper, a `throw`, or `-EnableExit` on a pinned version.
  - Cell: heldout N10, translated: a git-fed `-l` over `'*.yml' '*.yaml' '*.ps1' '*.psm1'`, then `tr '\n' '\0'`, then `xargs -0 -r grep -L` with N10's `-e` list verbatim.
- **PS-ERR-09** (SHOULD, PS `errors.md`), from CANDIDATE-PSERR-1.
  - Rule: initialise every variable a `finally` reads before `try`.
  - Check: `finally-masks.ps1` under `checks/`.
- **SH-CI-31** (SHOULD, `ci.md`), from CANDIDATE-CI-1.
  - Rule: enumerate workflow files top-level only.
  - Cell: the X73 pathspec form.
  - The recursive cells of SH-CI-01/02/05/07/08/16/23/24 switch to it.
- **SH-CI-32** (SHOULD, `ci.md`), from CANDIDATE-CI-2.
  - Rule: a Taskfile item containing a pipeline runs with pipefail in scope.
  - Check: heldout block 12 (PCRE), translated to `checks/ci-task-pipefail.sh` (awk).
- **SH-CI-33** (MUST, `ci.md`), from CANDIDATE-CI-3.
  - Rule: lint a GitLab job whose tags or `extends` name a Windows runner under the PS rules, never ShellCheck. `gl-extract2.py` skips such jobs.
  - The PowerShell-lint half is confirmation-round work.
- **SH-TEST-23** (SHOULD, `testing.md`), from CANDIDATE-TEST-1.
  - Rule: no commented-out test.
  - Check: L8 in `bats-lint.sh`.
- **SH-TEST-24** (SHOULD, `testing.md`), from CANDIDATE-TEST-2.
  - Rule: no `skip` as a test's first statement; the reason regex never whitelists `huh`.
  - Check: L9 in `bats-lint.sh`.
- **SH-TEST-25** (SHOULD, `testing.md`), from CANDIDATE-TEST-3.
  - Rule: every `.bats` under the test tree is run by the gate, or listed in the runner's explicit exclude list (owner default).
  - Check: `checks/bats-runner-list.sh` compares `git ls-files -- ':(glob)DIR/**/*.bats'` with the runner list. It uses `grep -o -E`, never `rg`.
- **SH-CORE-16** (MUST, index), from CANDIDATE-CORE-1.
  - Rule: run a third-party installer or init command under `env -i` with a throwaway `HOME` and explicit `ZDOTDIR`, `XDG_*` and `PATH`.
  - Listing cell (reading heuristic; a hit is a site to read):

    ```sh
    git ls-files -z --cached --others --exclude-standard -- '*.sh' '*.bash' '*.bats' | xargs -0 -r grep -l -e '--install' -- | tr '\n' '\0' | xargs -0 -r grep -L -e 'env -i' --
    ```

### 5. Changes folded from wave 4 (apply all)

**(a) Check amendments.**
- Copy every row of heldout sections A to F verbatim into the cell of the rule it names. That covers blocks 1 to 8, the verdict-author fixes, and every row of sections B to F.
- The amended `shfiles()` replaces the dialect original everywhere it appears: d07, 16-a, T1 and X09 scoping:

  ```sh
  shfiles() { files | xargs -0 -r awk 'FNR == 1 && /^#![ ]*\/(usr\/)?bin\/(env )?sh([ \r]|$)/ { print FILENAME }' | tr '\n' '\0'; }
  ```

- Gate script lines 73-75 take block 5 verbatim.
- Three cases change "verbatim" to "translated" (section 7):
  - a row that uses a banned form;
  - X59/X60 for `s05` and `s02`;
  - X62 for `--`.
- A translated cell keeps the heldout original beneath it as a labelled `(GNU grep)` extra, only when it is PCRE.

**(b) Rules weakened or contradicted.** Apply the eleven MUST texts in heldout RW as written:
- PS-ENC-01, as X63;
- PS-COMPAT-04, as X64;
- SH-FISH-07, as X65;
- SH-TEST-02 and SH-TEST-20 (X66);
- PS-GATE-04, PS-GATE-03, SH-INST-03 (X67), PS-SEC-01 (X68), SH-ERR-31 (X69), SH-GATE-02.

Apply every SHOULD and wording row:
- PS-GATE-06 split (X77);
- PS-COMPAT-05 list illustrative;
- the SH-CI-08 Limits note;
- SH-CI-05, 07, 13, 24 and 28 text additions from heldout C. SH-CI-07 adds `github.event.pull_request.head.repo.full_name`.
- The SH-INST-01 evidence drop, keeping SH-INST-07 at MUST.
- SH-EXP-09 as a reading rule, and the SH-EXP-21 C-12 wording.
- SH-TEST-04: keep `|| false` and ship `l3v2` as the priority list.
- SH-TEST-09 red conditions, SH-TEST-19 `-ExpectedTotal`.
- SH-ZSH-12 and SH-NU-01/02 are unchanged.

**(c) Security wave-4 revision.** Ship SH-SEC-01..14 as revised:
- SH-SEC-02 covers variable, array, `set --`, `read -s`, `docker run -e K=V`, `--build-arg`, `cargo --token` and userinfo URLs. Its check of record is `s02-argv` plus `s02-argv-yaml` plus `checks/secret-argv.sh`.
- SH-SEC-09 binds every POSIX shell and keeps its exposure table.
- SH-SEC-13: `GIT_ASKPASS` with a 0600 file, `credential.helper store`, the `GIT_CONFIG_COUNT` triple, git 2.31+.
- SH-SEC-14: `CARGO_REGISTRY_TOKEN` for crates.io only, `CARGO_REGISTRIES_<NAME>_TOKEN`, `cargo login` on stdin.
- The 22-cell block uses this `files()`:

  ```sh
  files() { git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f -- | tr '\n' '\0'; }
  ```

- The vendor exclusion is `':(exclude,glob)**/vendor/**'`.
- The merged `s05` cell (X59):

  ```sh
  files | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(\.|source)[[:space:]]+"?[^/$<"[:space:]~-][^/"[:space:]]*"?[[:space:]]*([;&|#].*)?$' -- | grep -v -e 'sec-ok: *[^ ]' -e '^[^:]*[.]bats:'
  ```

- `s02` alternative 1 becomes heldout's double-quoted form (X60).

**(d) Emit wave-4 revision.** Ship SH-EMIT-01..51 as revised in the third pass:
- 24: the ble.sh window, and `blehook PRECMD` behind `[[ -n ${BLE_VERSION-} ]] && declare -F blehook >/dev/null`, never `BLE_VERSION` alone.
- 43: `blehook CHPWD` with the same probe.
- 33: register the bare command name (six spellings).
- 42: `[Delegate]::Combine` plus the `$PWD.Provider.Name -eq 'FileSystem'` guard; 5.1 wraps `prompt`.
- 16: per-edition `$PROFILE.CurrentUserAllHosts`, read from the target interpreter; elvish `rc.elv` on Windows; the ble.sh window sentence.
- 17: ask nu with `$nu.vendor-autoload-dirs | last`.
- 18: byte-preserving and CRLF-aware, the user's lines never passed through awk or sed; twin `twin-rc-edit-v3.sh`.
- 07: red on 7.x only; `-DateKind` is 7.5+.
- 05: the cmd.exe empty clause, citing `shell.rs:610-612`.
- 51: append a profile only with `Add-Content`.
- Plus heldout D's aids and harness fixes.
- The SH-EMIT-08/40 ASCII-only text is unchanged (X63).

### 6. Drop list (retired at authoring, never reused)

| ID or text | Reason |
|---|---|
| SH-ERR-13 | Duplicates SH-DIAL-07/08 entirely (X2, X83). Routed from the index ("enabling pipefail in sh"). |
| SH-EXP-20 | SH-ERR-12 owns policy and idiom (wave-2 X, map line 1624). Its 3.2 measurement moves into SH-ERR-12. |
| SH-EMIT-32 | SH-TEST-10 owns the absent-interpreter skip rule (wave 3, map line 2087). |
| SH-GATE-20 | SH-CORE-07's tell table in the index replaces it (X13, X50). |
| PS-ERR-05 | PS-SEC-09 replaces it. Its `$null -eq $MyInvocation.MyCommand.Path` throws under StrictMode Latest, and its `break` idiom exits 0 in CI (installer C1, skills C8). |
| PS-COMPAT-09 | PS-SEC-06 replaces it wherever `SecurityProtocol` is touched. The `-bor Tls12` advice keeps legacy protocols on (installer C3). |
| SH-CORE-10, 11, 12, 13, 14, 15 as adopter rows | Catalog-authoring rules: they bind the drafters (section 9) and the checker, not code under the globs. |
| SH-CORE-06, 08, 09 as rule rows | Procedures. They ship in `shell-diagnose` and `shell-port`. |
| SH-GATE-27, SH-GATE-32 | Retired in wave 3. |
| SH-INST-02, 10, 13, 14, 15, 18, 21; PS-SEC-12, 13 | Retired or merged (shell-installer.md retirement table). |
| Dialect dive labels FL SH-DIAL-13..16, 19, 20, 24; BVG-*; UF R* | Merged or renumbered (shell-dialect.md lines 519-542). |
| `enable=check-extra-masked-returns` | Four keys (X51; heldout conflict 2), at shell-gate.md lines 87, 245, 428 and 433. |
| u01's `-e 'echo[[:space:]]+-e'` alternative | 1710 of 2223 hits out of scope; SH-EXP-09 owns it. |
| SH-TEST-20's last sentence | Contradicted by F16 (X66). |
| PS-GATE-06's `-Allow` wildcard example | Hides hallucinated names (X77). |
| PS-ENC-01's ASCII-only MUST wording | Replaced by the BOM-aware text (X63). |
| SH-FISH-07's blanket `\|\|` ban | Replaced by the rescope (X65). |
| SH-EXP-21's "function or subshell" half | Wrong on 8 of 8 bash versions (errexit C-12). |
| `plant/trailing.sh` as SH-INST-01 evidence | Withdrawn (heldout conflict 4). |
| Every `grep -r`, `--include`, `-P`, `-z`, `-Z`, `rg` and `find` cell | Replaced by the portable form (section 7). PCRE originals survive only as labelled `(GNU grep)` extras. |
| The heldout bare `sec-ok:` filter | Replaced by the reasoned shape (X61). |
| The emit dives' draft numbers, the CI V-run labels and every `CANDIDATE-*` label | Never cited in shipped text. |

SH-CI-11 and SH-CI-12 are **not** dropped. They ship as self-contained copies (X82), because a workflow edit loads `shell-quality` only.

### 7. Verification dialect for every shipped cell (SH-GATE-21..31, binding)

- **List files git-fed:**
  - The shape is `git ls-files -z --cached --others --exclude-standard -- 'PATHSPEC' | xargs -0 -r grep -H -n -e 'PAT' --` (SH-GATE-21).
  - Shell content comes from the `files()` helper above (SH-GATE-22), and sh-only content from `shfiles()`.
  - Use quoted pathspecs: `':(glob)**/NAME'`, `':(exclude,glob)**/DIR/**'`, `':(icase)*.tests.ps1'` (SH-GATE-24).
  - Never an unquoted glob, and never an unquoted `**`. zsh aborts the whole block on a non-match (SH-ZSH-05/06).
- **Portable grep option set only:**
  - Allowed: `-E -F -e -H -n -l -L -c -o -q -s -v -w -x -i --` (SH-GATE-23).
  - Banned: `-r -R --include --exclude --exclude-dir -P -z -Z -U --null --no-messages --color -I`, and `$'..'`.
- **One `-e` per top-level alternative** (SH-GATE-28). Under `-E`, `\|` is a literal pipe; a grouped `(a|b)` inside one pattern is fine.
- **`--` before operands** for `grep`, `shfmt` and `shellcheck` (X62). Always `xargs -0 -r`.
- **Explicit operands.** Every command that reads files names its operand: the git-fed list, or an explicit `.` for a directory argument. A cell never relies on stdin or an implicit cwd.
- **No `$(...)` and no backticks in a cell.** No angle-bracket placeholders: `<file>` is a redirection. A per-subject script takes a quoted variable (`"$INSTALLER"`) that its prose defines.
- **The PREFLIGHT line opens each block of cells, verbatim from SH-GATE-25:**
  - Its tool list is extended with the block's own tools (`shellcheck`, `python3`, `pwsh`, `actionlint`, `zizmor`, `bats`).
  - Every line it prints starts `PREFLIGHT:`.
- **Pass means empty stdout and empty stderr** (SH-GATE-26).
  - Never read an inline cell's exit status: `grep -L` through `xargs` inverts on busybox.
  - Never `2>/dev/null` on a cell.
  - A `-listing` cell prints sites to read; its pass is "every hit fixed or waived".
  - Waiver filters take the shape `grep -v -e 'TOKEN: *[^ ]'`, with a reason required.
- **No command inside a table cell** (SH-GATE-29). Tables name the cell ID; commands live in fenced `sh` blocks, so SH-CORE-13's extraction lint parses them. A `|` inside a table cell is escaped `\|`.
- **Lookaround, multi-line, CR or byte-class matches go to an awk script** `checks/NAME.sh` (SH-GATE-30):
  - POSIX awk only, verified on gawk 5.3.2 and busybox awk; mawk where the consolidation ran it.
  - `LC_ALL=C` for byte classes.
  - `-P`/`-z` only as a labelled `(GNU grep)` extra line.
- **Shipped `checks/` scripts are judged by exit status.** The map is 0, 1, 69, 74, 78, 79 (SH-GATE-31). A Python or PowerShell check asset follows the same map; PS gate wrappers keep 0/1/2 (PS-GATE-01).
- **Python extractors** run as `python3 -I SCRIPT`, and a non-zero status is a failure, never a silent pass: `gl-extract2.py`, `tf-extract2.py`, `job-shell-lint2.py`, `step-shell.py`, `pwsh-run-lint-rev3.py`, `win-task-lint.py`.
- **Translate** every cell the consolidations or heldout wrote in a banned form:
  - non-PCRE `grep -r --include=X` becomes the git-fed form with the SH-GATE-24 pathspec for `X`, and `\|` alternatives are split into `-e`;
  - PCRE, `-z` and lookahead forms become awk `checks/` scripts;
  - `find DIR -maxdepth 1` becomes a `:(glob)` pathspec (X73);
  - `rg` becomes `grep -o -E`.
- **Known translation targets:**
  - heldout C blocks 9 to 12 and the generated-file exemption (`grep -rLZ`);
  - heldout D C5, the SH-EMIT-03 aid, the SH-EMIT-24 aid, F5b, E2b and the SH-NU-05 floor grep;
  - heldout E for PS-COMPAT-01, 02, 04, 05, N3, N4, N8, N10, N11, N16, N17, N18;
  - CORE-1 and TEST-3;
  - the SH-EMIT verification greps;
  - the alt-shells gate greps.
- **Re-watch every translated cell** red on its plant and green on its twin in the confirmation round. Until then, its Watched line says "translated 2026-10-11, re-watch pending".

### 8. Portability of the shipped commands

- **Supported executors** (SH-GATE-33):
  - GNU grep and findutils;
  - busybox 1.37 with git;
  - uutils 0.10+;
  - Git Bash 5.2.15.
- **macOS and BSD** are "unverified: read only" on every cell (no macOS host). Every cell stays inside the option set that BSD grep documents (section 7), uses only `xargs -0`/`-r`, `tr`, `awk` and `git`, and never `sed -i`, `readlink -f`, `stat -c`, `date -d`, `find -printf` or `grep -P`. The BSD `xargs -r` and awk rows remain unverified.
- **busybox:**
  - No `-P`, no `--include`, no `-r` reliance.
  - `grep -L` exit codes differ, so status is never read.
  - `find -print0` and `xargs -0 -r` are on in Alpine's build. Whether they are Kconfig-optional is open (dialect).
- **Shipped `checks/*.sh` scripts:**
  - start `#!/bin/sh` and pass the SH-DIAL-04 interpreter set (dash 0.5.12, busybox ash 1.37, bash 3.2 `--posix`);
  - run under ShellCheck default severity and `shfmt -d`;
  - pass their own gate.
- **PowerShell check assets** state the engines they ran on (5.1.26100.9444, 7.4.7, 7.6.6) and run without modules beyond pinned PSSA 1.25.0 and Pester 6.2.0.

### 9. Budgets

- **Indexes:** each under 200 lines (rule-distillation.md "Index + Support Directory"). Front-load MUST rows and the gate block.
- **Depth files:**
  - A table of contents in any file over 100 lines.
  - No chains: no row's content lives in another depth file; a cross-family ID appears only as attribution, "(also SH-XXX-NN)".
  - One row per ID: ID, one imperative sentence, a one-line rationale naming the failure, the verification (cell ID or `checks/` script), severity, then a Scope line with kinds, shells, versions and dates.
  - Rows are grouped by the check that catches them; each check's command is stated once per group.
  - Program-set line caps, including TOC and check blocks:

    | Depth file | Line cap |
    |---|---|
    | `dialect.md` | 230 |
    | `userland.md` | 190 |
    | `errors.md` | 330 |
    | `expansion.md` | 230 |
    | `security.md` | 260 |
    | `gates.md` (shell) | 340 |
    | `testing.md` | 230 |
    | `ci.md` | 340 |
    | `zsh.md` | 180 |
    | `fish.md` | 190 |
    | `nushell.md` | 170 |
    | `elvish.md` | 100 |
    | `emit.md` | 460 |
    | `installers.md` | 220 |
    | `compat.md` | 150 |
    | `errors.md` (PS) | 130 |
    | `native.md` | 70 |
    | `encoding.md` | 160 |
    | `gates.md` (PS) | 240 |
    | `security.md` (PS) | 180 |

  - Evidence beyond one line per rule stays in the research files, linked by consolidation path.
- **Skills:** the body is at most 500 lines as `check-artifacts.py` counts it; target 460 (SH-CORE-11). Depth goes to `references/`.
- **Shipped count:**
  - 389 IDs, less the 6 dropped rule IDs and the 9 SH-CORE rows that ship only in skills or as drafter obligations, gives about 374 rows across 20 depth files and 2 indexes, plus 3 PS-CORE rows.
  - That is over the funnel's ~60-100 per surface for sh/bash. It is defended by the per-surface split (frame correction, section d).
  - Every MUST row states its script kind, so the rows that block any single edit stay few.

### 10. Version-dating convention

- Every version-specific claim names the tool and version and is dated 2026-10-11: "bash 3.2.57 to 5.3", "pwsh 7.4.7, 7.6.6, Windows PowerShell 5.1.26100.9444", "ShellCheck 0.11.0", "fish 3.6.0 to 4.9.3".
- Never "latest" or "current" without a version.
- An item with a known end carries "until DATE":
  - pwsh 7.4 EOS 2026-11-10;
  - `ubuntu-latest` to 26.04 by 2026-11-19;
  - fish floor 3.6.0 until 2028-06-30.
- macOS and BSD claims carry "unverified: read only".
- Provisional rows carry `provisional: true`.
- Pinned decisions carry "pinned decision (adopter may override)" (rule-distillation "Portability").

### 11. Pinned decisions and defaults (do not re-litigate)

- **Exit maps:**
  - installers 0-7 (SH-INST-09);
  - gate scripts 0/1/69/74/78/79 (SH-GATE-08/31);
  - shell CLIs mirror the Rust cli-contract;
  - the Swift 66/70 carve-out is frozen to 16 sites (SH-ERR-25).
- **The error model by kind** (SH-ERR-23).
- **Floors:**
  - unpinned bash 3.2.57, with `# bash-floor: X.Y` plus a guard exiting 69;
  - sh at POSIX.1-2017 plus probes;
  - zsh 5.8 authored, 5.0.8 emitted;
  - fish 3.6.0 to 4.9.3;
  - nu `# nu-range: FLOOR..CEILING`;
  - elvish 0.18.0 to 0.21.0;
  - PowerShell 5.1 for `iex` and installers, 7.6 for repo scripts.
- **Tools:**
  - `.shellcheckrc` with four keys and no SC2312 (X4, X51);
  - actionlint at default severity;
  - zizmor persona `regular` at `--min-severity medium`;
  - bats 1.14.0;
  - Pester `-RequiredVersion 6.2.0` (5.9.1 for Pester 5);
  - ShellCheck 0.11.0, shfmt 3.13.0+, PSSA 1.25.0.
- **Policies:**
  - the skip budget is zero, held in the CI step;
  - four waiver tokens;
  - the program files nothing (X55).
- **Owner defaults:**
  - PS-ENC-01 is BOM-aware;
  - SH-INST-23 carries the root-by-design exception;
  - SH-TEST-25 uses an exclude list;
  - M-X-05 is residue.

### 12. Skills scope

- `shell-integration`, `installer-script`, `shell-port` and `shell-diagnose` carry procedures only. They contain no rule text and no restated depth.
- A MUST rule a procedure surfaces appears once, in a `| # | Finding | Rule |` table that cites MUST IDs only. Never rule-ID-first, and never a SHOULD in that table (SH-CORE-10). SHOULD findings stay in the route or symptom table with a severity column.
- Commands live in fenced `sh` blocks, never in table cells.
- Each skill ends with a ranked "What agents get wrong" table, one mechanical check per row (SH-CORE-15).
- Body at most 500 lines, target 460.
- `installer-script` marks SH-INST-22, SH-INST-23 and PS-SEC-14 as provisional.

### 13. Confirmation round (after drafting; not research)

The round replays, on fresh trees only (not the 64 held-out trees, not the 41 corpus repos, not the fleet):
- every heldout-amended cell, unmodified;
- every translated cell;
- the merged `s05` and `s02` cells;
- the gate script with `--` on its 33 plants;
- the checks of the 15 provisional rows;
- the PowerShell half of SH-CI-33;
- a non-validating `busybox:1.37` SH-INST-07 run.

Every harness obeys SH-CORE-16. A clean round removes `provisional: true`. A new class reopens only its family.
