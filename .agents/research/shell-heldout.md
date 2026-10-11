---
title: "Held-out verdict: do the shell rulesets survive trees the program never read"
topic: "held-out round"
model: sonnet
date: 2026-10-11
consolidates:
  - shell-heldout/posix-scripts.md
  - shell-heldout/installers.md
  - shell-heldout/ci-and-taskfiles.md
  - shell-heldout/emitters-and-alt-shells.md
  - shell-heldout/powershell.md
  - shell-heldout/test-suites.md
trees: "64 blob-less clones under /home/mherwig/.cache/research-lang/heldout/shell/ (none is in the 41-exemplar corpus or the fleet). Repo-reads per dive: posix 16, installers 10, CI 13 (SH-CI-30 swept all 64: 3,936 files), emitters and alt shells 12, PowerShell 9, test suites 13 (9 shared with other dives). The 12-character SHAs are in each sub-artifact's tree table; installer pins are also in /home/mherwig/.cache/research-lang/shell-tools/fixtures/installers/heldout/data/shas.txt."
---

# Held-out verdict (2026-10-11)

Fixture root `$FX` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures`. Citation form `repo@sha12:path:line`. Verdicts are by output, never exit status (SH-GATE-26). A cell is admissible only if it was watched red on a planted violation and green on a compliant twin (SH-CORE-02).

## Verdict

**Overall: NOT READY to draft as a whole.** 7 of 21 families are CLEAN and can be drafted now. 14 produced a new failure class, a check that failed open, or a MUST whose scope the held-out trees contradicted, so the converge-on-failure-classes stop condition is not met. No MUST rule was retired. 11 MUST texts change (rescope, rewrite or broaden, table in "Rules weakened or contradicted"). 15 new failure classes came out (9 MUST, 6 SHOULD), each proven by a plant and a twin except where marked. Every amended cell was fitted on the same 64 trees, so its out-of-sample precision is unmeasured: that, not the rule texts, is what the next round must test.

Criteria used: CLEAN = only instances of existing classes, no MUST overturned, no check that failed open (false positives alone leave a family CLEAN with amended cells). NOT CLEAN = a new failure class, a MUST contradicted, or a check that failed open (a false negative or a gate that reports green on a violation).

| Family | Verdict | Evidence |
|---|---|---|
| SH-DIAL | NOT CLEAN | d01 and the sh-shebang detector failed open: `#! /bin/sh` slips d07, `shfiles()`, 16-a and the gate script (planted file passed the gate rc 0); 8 void-packages files lacked a real line-1 shebang yet passed d01. d06 was 26% false positive (36 of 140) |
| SH-USER | CLEAN | 06-09 clean (u08 0 of 12 read false). u01 `echo -e` alternative is out of scope: 1710 of 2223 hits |
| SH-ERR | NOT CLEAN | new class CANDIDATE-ERR-1 (RETURN trap persists, dokku 44 sets 0 resets). G-IFS 80% false positive; SH-ERR-31 needs an array-form clause and a repo-shipped-directory exemption |
| SH-EXP | CLEAN | 13-15 clean. X08 74% false positive (351 to 90), X09 scope (1920 hits, 4 in the MUST scope); `echo "$data"` appears 2073 times and has no cheap check |
| SH-GATE | NOT CLEAN | gate script line 75 and cell 16-a miss `#! /bin/sh`; 02-c demands five keys where X51 has four and flags every compliant rc; SH-GATE-07 has no SC2218 row (21 of 22 hits are bats). Exit map clean on 16 real trees |
| SH-SEC | CLEAN | s05 94% false positive (16 of 17), s02 2 of 7, s11 2 of 32; no false negative reported; 06, 07, 10, 12 clean |
| SH-CORE | NOT CLEAN | new class CANDIDATE-CORE-1 (a harness ran `broot --install` with an inherited `ZDOTDIR` and appended a line to the real `~/.zshrc`). SH-CORE-07 T1 99.8% out of scope (1916 of 1920), T2-T6 clean |
| SH-INST | NOT CLEAN | 3 kit checks returned false GREEN on shapes the sample contains: t-trunc (no seeded install), t-trap (signals before `mktemp`), t-flags (blind on a tty); new classes CANDIDATE-INST-1 and -2; 4 of 10 installers outside SH-INST-12 |
| PS-SEC | NOT CLEAN | new class CANDIDATE-PSSEC-1 (http override in ps1); file-level hash grep passes pnpm's unverified branch; `EXIT-IN-FUNCTION` misses pixi's top-level `exit`; PS-SEC-01 has two accepted alternatives it does not name |
| SH-CI | NOT CLEAN | `gl-extract.py` crashes on 10 of 21 real GitLab files and the documented pipe then exits 0 (silent false green); SH-CI-24 stage 1 missed tokio's list-item dimension; SH-CI-13 checker misses 8 bash 4+ constructs; SH-CI-19 extractor skips 3 keys; new classes CANDIDATE-CI-1..3 |
| SH-EMIT | CLEAN | fnm, vfox, mcfly, carapace fail the 36-case corpus on the shells they target (21-26 of 33-34 pass), all inside SH-EMIT-01..04 and 41; vfox bash hook is the SH-EMIT-24 violation (5 of 40); one new static check (C5). Harness defects were false reds |
| SH-ZSH | CLEAN | Z2 hard tier 0 hits on 330 files; 5.0.8 `-fn` false positive is already a stated limit of SH-ZSH-12; Z4 list needs a file-role filter |
| SH-FISH | NOT CLEAN | SH-FISH-07 "no `\|\|` while floor < 4.7.0" over-reaches: verdict-author run on fish 3.6.0 and 4.0.2 shows only an unknown-command left side skips the right side; tide's 38 `\|\|` lines are builtins or functions |
| SH-NU | CLEAN | nupm 13 of 25 red unwrapped, 0 wrapped on 0.116.1: one check fix (`use DIR/` wrapper); `$nu.temp-dir` red on 0.100.0 is the SH-NU-05 shape |
| SH-ELV | NOT CLEAN | the E1 gate is silent on legacy `a=b cmd` on 0.21.0 (compile clean, fails at run time): elvish-modules `git-vcsh.elv:26`; SH-ELV-03 already bans it, the check lacked the shape |
| PS-COMPAT | NOT CLEAN | static fallback greps recall 5 of 7 files that fail on 5.1; D2/D5 fire 0 of 120 times under StrictMode (PS-COMPAT-04 over-reaches); named list covers 7 of 19 names; new class CANDIDATE-PSCOMPAT-1 |
| PS-ENC | NOT CLEAN | PS-ENC-01 ASCII-only contradicted: 47 of 82 non-ASCII files carry a BOM and work, the defect is the 35 without; ENC-02 and ENC-10 greps 0 of 22 true; new class CANDIDATE-PSENC-1 |
| PS-ERR | NOT CLEAN | PS-ERR-03 lint ignored `defaults.run.shell` and missed a plant; new class CANDIDATE-PSERR-1; PS-ERR-05 grep matched for the wrong reason |
| PS-NATIVE | CLEAN | rules hold; NATIVE-01 old grep 25 of 48 false, NATIVE-02 13 of 18 false (rewritten, plant/twin proven) |
| PS-GATE | NOT CLEAN | winutil's report-only PSSA step (sixth fail-open mode, CANDIDATE-PSGATE-1); wrapper turned an analyzer crash into exit 1; GATE-04 false positive on 5 Pode locale files; GATE-06's own `-Allow` example is a wildcard that hides hallucinations |
| SH-TEST | NOT CLEAN | census false green on a 0-of-2 run and on a vanished generator, false red on `bats_test_function`; all 3 real Pester gate forms green on zero tests; SH-TEST-20's last sentence contradicted; new classes CANDIDATE-TEST-1..3 |

### Drafting verdict

- **Draft now (7 families):** SH-USER, SH-EXP, SH-SEC, SH-EMIT, SH-ZSH, SH-NU, PS-NATIVE. Apply the cell amendments in the next section verbatim.
- **Need one narrow confirmation round (14 families):** SH-DIAL, SH-ERR, SH-GATE, SH-CORE, SH-INST, PS-SEC, SH-CI, SH-FISH, SH-ELV, PS-COMPAT, PS-ENC, PS-ERR, PS-GATE, SH-TEST. Reason: each has a new class or a fail-open check whose fix was written against these trees. The round replays the amended cells unmodified on fresh trees (never the 64) and stops on a round with no new class and no failed-open check. Priced at 5 dives (posix cells; installers plus PS-SEC; CI plus fish and elvish; PowerShell; test suites), about 6 fresh trees each. Drafting of these families can proceed in parallel with the new rules marked provisional.
- **Owner decisions the round cannot make:** PS-ENC-01 (ASCII-only for new files, or the BOM-aware rewording only); whether root-by-design installers (tailscale) fall under CANDIDATE-INST-2; whether a hand-listed test runner must run everything or carry an exclude (CANDIDATE-TEST-3).

### Conflicts resolved

1. **RETURN-trap premise (posix dive, brief).** "A RETURN trap re-fires on later plain function calls" is wrong. Verdict-author re-run of `$FX/heldout-posix-scripts/matrix/return-trap-*.sh` on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3: the trap persists (`trap -p RETURN` prints it), re-fires when a later `.`/`source` finishes and for every function under `set -T`, never for plain later calls; harm run deletes a reused variable's directory.
2. **SH-GATE-02 five keys versus four (map X51).** Held-out confirms four. The five-key text survives in `shell-gate.md` at the rc template (line 87), cell 02-c (line 245) and SH-GATE-19's `SHELLCHECK_OPTS` (lines 428 and 433). Only the 02-c half is held-out evidence; the SH-GATE-19 half is map-derived (topic map line 1533) and is labelled so in the amendments.
3. **d07 heredoc false positive versus `#! /bin/sh` false negative.** The heredoc false positive did not reproduce (GNU grep 3.12 `-z` anchors at file start); only the `#! /bin/sh` false negative is real. The dive's amended regex then regressed on a CRLF shebang (original red, amended silent) and its amended gate script strips only one space, so `#!  /bin/sh` slips. Both fixed and watched; see "Verdict-author amendments".
4. **`plant/trailing.sh` ("caught by the byte tail only", `shell-installer.md` lines 70 and 552).** Re-run on dash with the unmodified kit: `plant/trailing.sh` `cuts=367 partial_cuts=0 noise_cuts=32`, `plant/linear.sh` `partial_cuts=4` of 85, `ref/install.sh` `partial_cuts=0 noise_cuts=3`. The plant's tail is `main ...` then an stderr `echo`, so no cut can leave HOME in a PARTIAL state. Resolution: the claim is withdrawn as evidence for SH-INST-01 (red evidence is `linear.sh` and `toplevel.sh`); `trailing.sh` shows only as noise (32 versus 3), which does not set the exit status.
5. **ASCII-only versus BOM'd UTF-8 (PS-ENC-01).** Practice (choco 270 of 275 BOM'd, working on 5.1.26100.9444) and the 82-file byte scan say the BOM is the fix and ASCII-only is not the hazard. Resolved as a rewrite, with the owner decision above for new files.
6. **SH-EXP-21 "nullglob only inside a function or subshell".** The function half is already superseded by SH-ERR-29/30/31 (errexit C-12). No change beyond confirming the reworded text lands in the draft.
7. **Map questions.** M-N-13 (root escalation) is load-bearing: CANDIDATE-INST-2. M-N-14 (signature roots) partly answered: pnpm verifies an npm ECDSA signature with `openssl dgst -sha256 -verify` and an embedded key, ollama verifies Authenticode; no installer used minisign or cosign. M-N-16 (posh truncation vacuity) has a mechanical cause: posh 0.14.1 rejects `-s`, so a pipe-fed `posh -s --` never runs the script; fixed in the adapter, not in the shipped kit.
8. **Elvish E2b "new class" (emitters dive).** SH-ELV-03 already bans `a=b cmd` and SH-ELV-02 names it as a run-time failure; the gap is the check. Reclassified from new class to a false negative in the E1/E2 gate (check amendment).
9. **SH-FISH-07 blanket `||` ban versus the measured hazard.** Run by the verdict author with `$FX/emitters-and-alt-shells/orbar.fish` on fish 3.6.0 and 4.0.2: `command -v nosuch || echo`, `false || echo`, `test 1 = 2 && echo X || echo`, `set -q nosuch || echo` and a function returning 3 all run the right side; only `nosuch-zz-cmd 2>/dev/null || echo` skips it (fish prints `Unknown command`). Resolution: rescope (table below). fish 4.7.0 and 4.9.3 were not re-run by the verdict author; the dive measured all four.
10. **SH-TEST-20 versus test-suites F16.** SH-TEST-20 ends "A `-ForEach` that can be empty carries `-AllowNullOrEmptyForEach` on purpose"; F16 shows the flag turns Pester 6's discovery error into a silent empty Describe. Resolution: reverse the sentence; pin the total instead.
11. **Severity of the finally-masking class.** The dive proposed MUST. The failure still exits non-zero; only the diagnostic is replaced. Set to SHOULD.

### Side effect disclosed

A dive harness ran `broot --install` with the Bash tool's inherited `ZDOTDIR=/home/mherwig` and appended one line to the real `~/.zshrc`. It was reverted by a byte-exact tail check (size 2237 to 2106, mtime changed). A later run through `env -i` left the file at 2106 bytes. This is the evidence for CANDIDATE-CORE-1.

## New failure classes

Format: mechanism, held-out evidence, candidate text, family, severity, run. IDs are provisional (`CANDIDATE-<family>-n`); drafters assign final IDs. Section "Observed, not promoted" at the end lists shapes seen once or without a plant.

### CANDIDATE-ERR-1 (joins SH-ERR; dive label SH-ERR-34), MUST for bash

- **Mechanism.** `trap ... RETURN` set inside a bash function is shell-global. It survives the function, fires again when any later `.`/`source` finishes, and for every function under `set -T`. A single-quoted action re-evaluates its variables at the later firing.
- **Evidence.** dokku@5eaab7cc1a14:plugins/common/archive-functions:182 (44 sets, 0 resets across the tree, 32 files flagged; double-quoted action, low harm); pi-hole@f47b8ede5a8e:gravity.sh:967 (single-quoted `rm -f "${recoverySQL}"`, 1 set, 0 resets).
- **Candidate text.** A function that sets `trap ... RETURN` ends the trap's action with `trap - RETURN`: `f() { trap 'rm -rf "$tmp"; trap - RETURN' RETURN; tmp=$(mktemp -d); }`. A deliberate `set -T` suite waives with `# tell-ok:`.
- **Check.** `n_return` in `$FX/heldout-posix-scripts/amended-cells.sh` (files that set a RETURN trap and never reset it).
- **Run.** Plant `c15-return` 1 line, twin 0. Behaviour on 8 bash versions in `matrix/return-trap-{plant,twin,source,harm,harm-twin}.sh`, re-run by the verdict author with identical results. Severity: the real sites are low harm (one single-quoted); MUST because the fix is one clause and the failure mode is deletion.

### CANDIDATE-INST-1 (joins SH-INST-05 wget half, SH-USER-10), MUST

- **Mechanism.** The installer picks wget options by a condition the harness did not vary (`[ -t 1 ]`); BusyBox v1.37.0 rejects `--show-progress`, `--https-only`, `--secure-protocol`, `--netrc`, `--retry-connrefused`, so the tty branch fails while the non-tty run installs.
- **Evidence.** prefix-dev/pixi@98535e0857e2:install/install.sh:119 (`WGET_OPTIONS="--show-progress"` on a tty; non-tty run installs on real alpine:3.22, tty rejected); casey/just@a1951a5ff762:www/install.sh:63 (`wget --https-only --secure-protocol=TLSv1_2` dies on BusyBox, an instance of SH-USER-10).
- **Candidate text.** Pass the same wget options on and off a tty, and only options in the BusyBox v1.37.0 set (`-q`, `-S`, `-O`, `--no-verbose`, `--tries`, `--timeout`, `--header`, `--user-agent`); never `--show-progress`, `--https-only`, `--secure-protocol`, `--retry-connrefused` or `--netrc` without a `wget --help` probe.
- **Check.** `bash $FX/installers/heldout/kit/tools/mx.sh toolx t-flags.sh INSTALLER` (row 2t, pty) plus the 4-pattern grep in the Check amendments.
- **Run.** `plant/wget-tty.sh` red on row 2t only, twin green (dash 0.5.12, BusyBox option set); grep red on the held tree (`just-install.sh:63`, `pixi-install.sh:119`), plant red, twin silent.

### CANDIDATE-INST-2 (joins SH-INST-12; resolves M-N-13), MUST (scoped)

- **Mechanism.** Installers escalate in four ways (blanket `$SUDO`, probe-then-escalate, escalate only the final copy, none). Three fail to install as a normal user; helm needs sudo for `/usr/local/bin` silently. SH-INST-12 binds user-space installers only, leaving 4 of 10 outside any rule.
- **Evidence.** ollama@eab97e9f92b9:scripts/install.sh:117,166,169; tailscale@3bb8a906c277:scripts/installer.sh:513-522; coder@50c785cc6d75:install.sh:429,587 (and `su - -c '$*'` quoting); helm/helm@dc56a44fee5a:scripts/get-helm-3:21,192.
- **Candidate text.** An installer that can need root defaults to a user prefix; escalates only for an explicitly chosen unwritable prefix; announces the exact command first; escalates only the final copy (never download, verify or extract as root); offers `--no-sudo`; never interpolates arguments into `su -c '...'`. Root-by-design installers (package-manager dispatch) are labelled and checked for the narrowest escalation (owner call).
- **Check.** `MX_DOCKER_USER=1000:1000 bash $FX/installers/heldout/kit/tools/mx.sh coder-user t-root.sh INSTALLER` plus reading where the first `sudo` falls.
- **Run.** `plant/sudoinstall.sh` red 11 of 11, `ref/install.sh` green; held-out ollama, tailscale, coder red, `coder-user` profile green.

### CANDIDATE-PSSEC-1 (joins SH-INST-06 for ps1; dive label PS-SEC-14), MUST

- **Mechanism.** PowerShell has no `--proto`; an environment-variable URL override reaches the request unchecked.
- **Evidence.** ollama/ollama@eab97e9f92b9:scripts/install.ps1:58 (`OLLAMA_DOWNLOAD_URL`, plain http request observed on 5.1.26100.9444); prefix-dev/pixi@98535e0857e2:install/install.ps1:174 (`PIXI_DOWNLOAD_URL`, `GET /x.zip` on both engines).
- **Candidate text.** A `.ps1` that takes a download URL from an environment variable or parameter refuses a non-https URL with `throw` before any request: `if ($u -notmatch '^https://') { throw "refusing non-https download URL: $u" }`.
- **Check.** Grep in Check amendments; behavioural `$FX/installers/heldout/ps/httpcheck.sh` (a local http server must see no request).
- **Run.** Grep: held red (ollama, pixi), plant red, twin silent. Behavioural: plant red, twin green on pwsh 7.6.6 and 5.1.26100.9444.

### CANDIDATE-PSCOMPAT-1 (joins PS-COMPAT-04; dive label PS-SEC-15), MUST

- **Mechanism.** `$PSVersionTable.OS` is free text: pwsh 7.6.6 on Fedora reports `Fedora Linux 43 (WSL)`, no `Darwin*`/`Linux*`/`Ubuntu*` pattern matches.
- **Evidence.** pnpm/get.pnpm.io@29fc8463b5b8:install.ps1:31-46; the real installer prints `Platform could not be determined! Only Windows, Linux and MacOS are supported.`
- **Candidate text.** Read the OS from `$IsWindows`, `$IsMacOS`, `$IsLinux` (with `$PSVersionTable.PSVersion.Major -lt 6` meaning Windows); never match the text of `$PSVersionTable.OS`.
- **Check.** `git ls-files -z --cached --others --exclude-standard -- '*.ps1' | xargs -0 -r grep -nHF -e 'PSVersionTable.OS'` (empty = pass).
- **Run.** Held red (`pnpm-install.ps1:31`), plant red, twin silent; behavioural `os-switch.ps1` throws on 7.6.6 and 5.1, `os-isvar.ps1` prints `platform=linux` and `platform=win32`.

### CANDIDATE-PSENC-1 (joins PS-ENC-08 and PS-ENC-01), MUST (collapses into the PS-ENC-01 rewrite)

- **Mechanism.** U+2013 or U+2014 used as a parameter prefix (`Get-ChildItem –Path .`) is a parse error on 5.1 in a BOM-less file; it runs on 7.6.6 and in a BOM'd file on 5.1. PS-ENC-08's list is U+2018 to U+201E only.
- **Evidence.** azure-powershell@f26e66248b28:tools/Az.Tools.Installer/GenerateHelp.ps1:14 and tools/Az.Tools.Predictor/GenerateHelp.ps1:14 (BOM-less, parse error); the same pattern in a BOM'd file parses (`InstallationTests/NetcoreTests/Compute/SqlIaaSExtensionTests.ps1:83`).
- **Candidate text.** Non-ASCII content in a 5.1-bound file needs a BOM, or `[char]0xNNNN`. U+2013 and U+2014 in a code position of a BOM-less file are a parse error on 5.1.
- **Check.** N3 in Check amendments. **Run.** V-DASH plant 1 line, BOM twin 0; 5.1 parse fails on the plant, passes the twin; held-out 2 of 2 true.

### CANDIDATE-PSGATE-1 (joins PS-GATE-01), MUST

- **Mechanism.** A PSScriptAnalyzer step that prints findings and never sets a status is a sixth fail-open mode: green job, red findings.
- **Evidence.** ChrisTitusTech/winutil@07ccd8e2e755:.github/workflows/unittests.yaml:19-27.
- **Candidate text.** A PSSA step turns findings into a non-zero status through the PS-GATE-01 wrapper, a `throw`, or `-EnableExit` on a pinned version; printing the table is not a gate.
- **Check.** N10 in Check amendments. **Run.** V-REPORT plant 1 line, twin 0; held-out 1 true.

### CANDIDATE-PSERR-1 (joins PS-ERR), SHOULD (verdict adjustment from MUST)

- **Mechanism.** Under `Set-StrictMode -Version Latest` a `finally` that reads a variable assigned only inside `try` throws, replacing the real failure message; `finally` also runs after `exit`.
- **Evidence.** pixi@98535e0857e2:install/install.ps1:31,208,211 (`$ZIP_FILE` read in `finally`).
- **Candidate text.** Initialise every variable a `finally` block reads before `try` and guard its use.
- **Check.** `runps.sh finally-masks.ps1 -Path FILE` (exit 1 when the output holds the undefined-variable error). **Run.** `plant2/finally-strict.ps1` red on pwsh 7.6.6 and 5.1.26100.9444, twin green.

### CANDIDATE-CI-1 (SH-CI-31 in the dive; joins the SH-CI enumeration cells), SHOULD

- **Mechanism.** GitHub reads only the top level of `.github/workflows`; `grep -r` and actionlint recurse into data YAML.
- **Evidence.** cli/cli@ec5b512045db:.github/workflows/scripts/spam-detection/eval-prompts.yml (5,000 lines of logs): actionlint 6 syntax errors, SH-CI-05a 3 hits, SH-CI-16 2 hits.
- **Candidate text.** Enumerate workflow files as `find .github/workflows -maxdepth 1 -type f -name '*.y*ml'`, never recursively; the recursive forms in SH-CI-01/02/05/07/08/16/23/24 change.
- **Run.** H6: data-subdir plant red under `grep -r` and `actionlint`, green under `find`; a real top-level violation stays red.

### CANDIDATE-CI-2 (SH-CI-32 in the dive), SHOULD

- **Mechanism.** Task runs errexit on and pipefail off; SH-CI-17 says how to enable pipefail, not when.
- **Evidence.** goreleaser@ccaac66e8d36:Taskfile.yml:220,231,329; arduino-cli@1c0071456537:Taskfile.yml:174,393,396,405; go-task/task@871da1618956:Taskfile.yml:72. 3 repos, 0 `set:` keys, about 8 pipelines. goreleaser `:220` (`[ $(git status --porcelain=2 | wc -l) = 0 ]`) shows pipefail does not help inside `$(...)` in a test.
- **Candidate text.** A Taskfile `cmds`, `status` or `sh:` item that contains a pipeline runs with pipefail in scope: `set: [pipefail]` at Taskfile, task or cmd level, or `set -o pipefail;` inside the item.
- **Run.** H5: `tf/bad-pipeline` 1 line, three twins (global set, inline, template-only pipe) 0 lines.

### CANDIDATE-CI-3 (clause of SH-CI-28), MUST clause

- **Mechanism.** A GitLab job on a Windows runner runs PowerShell, not the image's shell; ShellCheck under `-s sh` gives parse errors.
- **Evidence.** inkscape@21f427000de1:.gitlab-ci.yml:211,243-256 (SC1066, SC2283, SC1036).
- **Candidate text.** Lint a GitLab job whose tags or `extends` name a Windows runner under the PS-* rules, never under ShellCheck.
- **Run.** H9: `gl/win-bad` old extractor red, `gl-extract2.py` skips it, twin green. The PS-* lint half was not run here.

### CANDIDATE-TEST-1 (joins SH-TEST-09 census), SHOULD

- **Mechanism.** A commented-out `# @test` lowers the static count and the TAP plan together, so the census stays green.
- **Evidence.** asdf-vm/asdf@cb72590e9f96:test/asdf_nu.bats:118,133,149 (35 in the file set), dokku@5eaab7cc1a14:tests/unit/client.bats:302, nodenv 3; 39 in all.
- **Candidate text.** No commented-out test: remove it, or `skip` it with a reason.
- **Check.** L8: `^[[:space:]]*#[[:space:]]*@test[[:space:]]+["'].*\{[[:space:]]*$`. **Run.** Plant `k_comment_plant/p.bats:7` red, twin (a comment that mentions `@test` mid-sentence) silent.

### CANDIDATE-TEST-2 (joins SH-TEST-10), SHOULD

- **Mechanism.** `skip` as the first statement leaves the test body dead; the census catches the reported skip only when `CENSUS_SKIP_OK` is empty or the reason is not whitelisted.
- **Evidence.** dokku@5eaab7cc1a14:tests/unit/apps_2.bats:110; Bash-it/bash-it@81929690975f:test/plugins/go.plugin.bats:44,68 (`skip 'huh?'`, 2 of 8 skips in a clean run).
- **Candidate text.** No `skip` as the first statement of a test; a conditional skip (`command -v x || skip "reason"`) is the legal form, and the reason regex never whitelists `huh`.
- **Check.** L9 (awk in `$FX/heldout-test-suites/ref/l8l9.sh`). **Run.** Plants `h_skip/skip.bats:8`, `k_comment_plant/skipfirst.bats:4` red; twin `cond.bats` silent.

### CANDIDATE-TEST-3 (joins SH-TEST-09), SHOULD

- **Mechanism.** A hand-listed runner (Go, make) runs a subset of the `.bats` files; a directory census over the tree describes tests CI never executes.
- **Evidence.** asdf-vm/asdf@cb72590e9f96:cmd/asdf/main_test.go:24- lists 23 files (`:99-105` comments one out, 63 tests); 9 of 32 `test/*.bats` are listed nowhere; run on their own, `utils.bats` is 51 of 53 not ok, `asdf_elvish`/`fish`/`nu`/`pwsh` skip 100%.
- **Candidate text.** Every `.bats` under the test tree is run by the gate: a hand-listed runner names them all, or the tree carries an explicit exclude (owner decision: exclude versus run-all).
- **Check.** Compare `git ls-files -- 'DIR/*.bats'` with the runner list (`rg -o -e 'runBatsFile\(t, dir, "[a-z_.]+"\)' --glob '*.go' .`). **Run.** Plant (unlisted file) red, twin (listed) green; asdf 9 unlisted plus 1 commented out.

### CANDIDATE-CORE-1 (joins SH-CORE-02 procedure), MUST

- **Mechanism.** A harness that runs a third-party installer or init command without scrubbing the environment writes to the real home: `broot --install` honours `$ZDOTDIR`.
- **Evidence.** See "Side effect disclosed" (one line appended to `~/.zshrc`, reverted).
- **Candidate text.** Run a third-party installer or init command under `env -i` with a throwaway `HOME` and explicit `ZDOTDIR`, `XDG_*` and `PATH`.
- **Check.** Reading heuristic: `grep -rnE --include='*.sh' -e '--install' DIR | xargs -r grep -L -e 'env -i'`; the grep was not run on a plant, only the behavioural twin (adapter through `env -i` left `~/.zshrc` at 2106 bytes).

### Observed, not promoted

| Shape | Why it is not a candidate yet |
|---|---|
| Bracket class used as alternation, `grep '^[^(Version\|Architecture)]'` (openwrt@17a3a87f6e1b:scripts/make-ipkg-dir.sh:11); ShellCheck sees only the redirect order | one site, no check, no plant |
| Project-own edition helper that the PS-GATE-06 resolver's version guard does not model (Pode@89797a301afe:src/Private/Helpers.ps1:1587, 7 of 26 findings) | no fix written; affects only the advisory mode |
| `"test": "echo todo"` (jasonkarns/bats-mock@eacf0fecb9f4:package.json:43) | grep ran on the real file only, no plant built |
| fnm `SET {name}={value}` on cmd.exe (Schniz/fnm@d2555b46362a:src/shell/windows_cmd/mod.rs:27), an SH-EMIT-48 instance | confirmed on a real `cmd.exe` before a context compaction; transcript not recaptured, re-run before citing |
| PS-GATE-06 unknown-parameter mode as MUST (58 findings, 0 false) | fix written against the same nine repos; needs a fresh round |
| SH-INST-07 behavioural run on a non-validating `busybox:1.37` against the sample; the generated-installer row (SH-INST-20 R10) | no sample member is generated; only alpine:3.22 ran |
| Gate cells 21-29 and the nested-`.shellcheckrc` gap (ShellCheck reads only the nearest rc, so an upstream rc in 4 of 16 trees hides root keys; SH-ERR-33) | catalog text with no executable form; no nested-rc listing cell was run |

## Check amendments

Rule ID, current cell, amended cell, evidence. Amended cells are verbatim from the fixtures and drafters apply them as written. `files` and `shfiles` are the dialect helpers (`shell-dialect.md` lines 65-66); the amended `shfiles` replaces the original. Plant/twin counts are output lines (plant / twin) unless stated.

### A. POSIX cells (`$FX/heldout-posix-scripts/amended-cells.sh`, 19 of 19 amendments proven by `verify-plants.sh`)

| Rule (cell) | Defect | Original to amended | Plant / twin |
|---|---|---|---|
| SH-GATE-02 (02-c) | false positive: demands five keys, X51 has four; flags every compliant rc | drop `enable=check-extra-masked-returns` from the key list; also drop it from the rc template (`shell-gate.md` line 87) and from SH-GATE-19's `-o` list (lines 428, 433; map-derived) | amended 1 / 0; original 2 / 1 (red on the compliant twin) |
| SH-DIAL-01 (d01) | false negative: `grep -L '^#!'` satisfied by a heredoc line, 8 void-packages files passed | line-1 awk (block 2) | 1 / 0; original 0 / 0 |
| SH-DIAL-06 (d06) | false positive 36 of 140 (UCI `@device[-1]`, `\|&` and `&>>` in quotes, bats titles, `${EPOCHREALTIME:-}` probes) | three changes (block 3); 140 to 104, the 36 removed lines read, all false | 1 / 0 on c02, c03, c04; original red on all three twins |
| SH-DIAL-07 (d07), `shfiles()`, SH-GATE-16 (16-a), SH-CORE-07 T1 | false negative: `#! /bin/sh` slips; CRLF shebang regressed by the dive's amendment | block 4 (spaces and CR tolerated) | 1 / 0 on c06, c07; original 0 / 0 |
| SH-GATE gate script line 75 | false negative: planted `#! /bin/sh` plus non-ASCII file, rc 0 | block 5 (strip all spaces) | amended gate rc 1; original rc 0; twin rc 0; clean 0, mode plant 1, empty repo 79 |
| SH-USER-01 (u01) | false positive: the `echo -e` alternative, 1710 of 2223 hits, out of scope (SH-EXP-09 owns it) | delete the `-e 'echo[[:space:]]+-e'` alternative from u01; nothing else changes | 1 / 0 (c08); d12 on a planted `#!/bin/sh` `echo -e`: 1 line |
| SH-CORE-07 T1, SH-EXP-09 X09, SH-GATE-20-a | false positive: 1916 of 1920 outside the MUST scope | run on `shfiles()` output only (block 4, `a_t1`); the "never `echo "$data"`" half stays a reading rule | 1 / 0 (c19); 1920 to 4 |
| SH-ERR-03 (G-IFS) | false positive 73 of 91 (scoped uses) | line-anchored assignment (block 6) | 1 / 0 (c16, three scoped twins); 91 to 18 |
| SH-ERR-04 (G-DOLLARQ) | false positive 2 of 2 (`\|\| return $?` is the correct propagation) | pipe through `grep -v -E -e '[\|][\|][[:space:]]*(return\|exit)[[:space:]]+[$][?]'` | 1 / 0 (c09) |
| SH-ERR-26 (G-ERRTRAP), SH-ERR-16 (e16b) | false positive 11 of 15, 6 of 72 (resets, `trap -p`, comments) | pipe through `grep -v -E -e 'trap[[:space:]]+-[[:space:]]' -e 'trap[[:space:]]+-p' -e ':[0-9]+:[[:space:]]*#'` (e16b: first and third filter) | 1 / 0 each (c10, two rows) |
| SH-ERR-15 (G-MKTEMP) | false positive 6 of 33 (bats `teardown()` removes the directory) | add `-e 'teardown'` to the `grep -L` | 1 / 0 (c17); 33 to 27 |
| SH-EXP-10 (X08) | false positive 261 of 351 (`nonbash()` treats shebang-less sourced libraries as non-bash) | `nonbash()` requires a non-bash shebang on line 1 (block 6); a shebang-less library sourced from sh is missed, ShellCheck `-s sh` SC3014 covers it when it declares `shell=sh` | 1 / 0 (c18); 351 to 90 |
| SH-SEC-05 (s05) | false positive 16 of 17 (fish and nu text in bats, ASCII art) | bare name must start alphanumeric, skip `.bats` (block 7) | 1 / 0 (c11); 17 to 1 (`source virtualenvwrapper.sh`, bash-it@81929690975f:plugins/available/virtualenv.plugin.bash:14) |
| SH-SEC-02 (s02) | false positive 2 of 7 (`[^\|#]*[$]` spans from a single-quoted header to a later `$`) | the `$` must sit inside the double-quoted header (block 7) | 1 / 0 (c12); 7 to 5 |
| SH-SEC-11 (s11) | false positive 2 of 32 (`export -n CDPATH` removes the variable) | pipe through `grep -v -E -e 'export[[:space:]]+-[A-Za-z]*n'` | 1 / 0 (c13); 32 to 30 |
| SH-GATE-07 (table) | missing row: SC2218 fires 21 of 22 times on `.bats` though bats evaluates the whole file first | add the row: order the helper above the first `@test`, never `disable=SC2218` | ShellCheck plant 1 line, twin 0; bats passes both (c14) |
| SH-ERR-29 (G-SHOPT) | limit, not changed: column-0 only, misses a function-body `shopt` | none | 17 column-0 hits, goenv 8, nodenv 6, LinuxGSM 2, dokku 1 |
| SH-ERR-34 candidate | new cell `n_return` | see CANDIDATE-ERR-1 | 1 / 0 (c15) |

Block 1, SH-GATE-02 02-c:

```sh
for k in external-sources=true source-path=SCRIPTDIR enable=check-set-e-suppressed enable=deprecate-which; do grep -q -e "^$k" .shellcheckrc || echo "missing in .shellcheckrc: $k"; done
```

Block 2, SH-DIAL-01 d01 (the mid-file `# shellcheck shell=` directive stays a legitimate pass):

```sh
files | xargs -0 -r awk 'FNR == 1 { if (NR > 1 && !ok) print prev; prev = FILENAME; ok = ($0 ~ /^#!/) } /^# shellcheck shell=/ { ok = 1 } END { if (NR > 0 && !ok) print prev }'
```

Block 3, SH-DIAL-06 d06 (the amended cell; the added post-filter and the balanced-quote alternative are the changes):

```sh
files | xargs -0 -r grep -LE -e '^# bash-floor: ' | tr '\n' '\0' | xargs -0 -r grep -nE \
  -e '^[^#]*(declare|local|typeset|readonly)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
  -e '^[^#]*(mapfile|readarray)[[:space:]]' \
  -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?[,^]' \
  -e '^[^#]*(declare|local)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ul][[:space:]]' \
  -e '^[^#]*\[\[?[[:space:]]+(![[:space:]]+)?-[vR][[:space:]]' \
  -e '^[^#]*(\$\{|[[:space:];(])[A-Za-z_][A-Za-z_0-9]*\[-[0-9]+\][}=]' \
  -e '^[^#]*:[0-9]+:-[0-9]' \
  -e '^[^#]*printf[[:space:]]+[^;]*%\([^)]*\)T' \
  -e '^[^#]*declare[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ng][[:space:]]' \
  -e '^[^#]*(local|typeset)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n[[:space:]]' \
  -e '^[^#]*wait[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n' \
  -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?@[QEPAaKkUuL]\}' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*(inherit_errexit|lastpipe|globstar|globskipdots|patsub_replacement|localvar_inherit|varredir_close|compat[0-9])[[:space:]]*(;|$)' \
  -e '^([^#"'"'"']|"[^"]*"|'"'"'[^'"'"']*'"'"')*([|]&|&>>)' \
  -e '^[^#]*;;&' \
  -e '^[^#]*coproc[[:space:]]' \
  -e '^[^#]*;&[[:space:]]*$' \
  -e '^[^#]*(EPOCHREALTIME|EPOCHSECONDS|SRANDOM|BASH_ARGV0|BASH_MONOSECONDS|BASH_TRAPSIG|GLOBSORT|BASHPID|BASH_COMPAT)' \
  -e '^[^#]*\$\{[[:space:]|]' \
  -e '^[^#]*(source[[:space:]]+-p[[:space:]]|trap[[:space:]]+-P)' \
  -e '^[^#]*read[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-t[[:space:]]+[0-9]*\.[0-9]' \
  -e '^[^#]*\{[0-9]+\.\.[0-9]+\.\.[0-9]+\}' \
  -e '^[^#]*\{0[0-9]+\.\.' \
  -e '^[^#]*[^$]\{[A-Za-z_][A-Za-z_0-9]*\}[<>]' \
  -e '^[^#]*\$\([[:space:]]*case[[:space:]]+[^[:space:]]+[[:space:]]+in[[:space:]]+[^(]' \
  -e '^[^#]*\$\{[A-Za-z_][A-Za-z_0-9]*//?[^/}]+/[^}]*&' \
  -- | grep -v -E -e ':[0-9]+:@test ' -e 'BASH_VERSINFO' -e 'bash_version' -e '\$\{(EPOCHREALTIME|EPOCHSECONDS|SRANDOM|BASH_ARGV0|BASHPID)[:]?[-+]'
```

Block 4, `shfiles()` for SH-DIAL-07 d07, SH-GATE-16 16-a and SH-CORE-07 T1, including the verdict-author `\r` fix (see "Verdict-author amendments"):

```sh
shfiles() { files | xargs -0 -r awk 'FNR == 1 && /^#![ ]*\/(usr\/)?bin\/(env )?sh([ \r]|$)/ { print FILENAME }' | tr '\n' '\0'; }
# SH-DIAL-07 d07
shfiles | xargs -0 -r grep -nE -e '^[[:space:]]*set [^#]*pipefail' --
# SH-GATE-16 16-a
git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | LC_ALL=C xargs -0 -r awk 'FNR == 1 { sh = ($0 ~ /^#![ ]*\/(usr\/)?bin\/(env )?sh([ \r]|$)/) } sh && /[^ -~\t\r]/ { print FILENAME ":" FNR ": " $0 }'
# SH-CORE-07 T1 (sh files only)
shfiles | xargs -0 -r grep -H -n -e 'echo -[neE]' -- | grep -v -e 'tell-ok: *[^ ]' -e 'userland-ok: *[^ ]'
```

Block 5, gate script lines 73-75 (`shell-gate.sh`; the dive's amended script is `$FX/heldout-posix-scripts/shell-gate-amended.sh`, whose line 74 `shebang=${shebang# }` strips one space):

```sh
shebang=${line1#'#!'}
shebang=${shebang#"${shebang%%[! ]*}"}
case "$line1:$shebang" in '#!'*:'/bin/sh' | '#!'*:'/bin/sh '* | '#!'*:'/usr/bin/env sh' | '#!'*:'/usr/bin/env sh '*)
```

Block 6, SH-ERR-03 and SH-EXP-10:

```sh
# G-IFS
files | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(export[[:space:]]+)?IFS=[$]'"'"'[^'"'"']*'"'"'[[:space:]]*(;|#|$)' --
# X08: nonbash() requires a shebang on line 1 that is not bash
nonbash() { files | xargs -0 -r awk 'FNR == 1 && /^#!/ && !/^#!.*bash/ { print FILENAME }' | tr '\n' '\0'; }
nonbash | xargs -0 -r grep -H -n -e '\[ [^]]* == ' --
```

Block 7, SH-SEC:

```sh
# s05
files | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(\.|source)[[:space:]]+"?[A-Za-z0-9_][A-Za-z0-9_.-]*"?[[:space:]]*([;&|#].*)?$' -- | grep -v -E -e 'sec-ok:' -e '^[^:]*[.]bats:'
# s02
files | xargs -0 -r grep -H -n -E -e '(-H|--header)[ =]+"[^"]*(Authorization|Proxy-Authorization|X-[A-Za-z-]*(Token|Key|Secret))[^"]*[$]' -e '(curl|wget)[^|#]*[[:space:]](-u|--user)[ =]+"?[$]' --
```

Block 8, new cell for CANDIDATE-ERR-1:

```sh
files | xargs -0 -r grep -l -E -e 'trap[[:space:]]+[^-].*[[:space:]]RETURN' -- | tr '\n' '\0' | xargs -0 -r grep -L -E -e 'trap[[:space:]]+(--[[:space:]]+)?-[[:space:]]+(.*[[:space:]])?RETURN' --
```

### Verdict-author amendments (two defects in the posix dive's own amended cells, both run)

| Defect | Evidence | Fix |
|---|---|---|
| The amended shebang regex `sh([ ]\|$)` regresses on a CRLF shebang: the original already missed it, the amended one stays silent, so a CRLF `#!/bin/sh` file with `pipefail` or non-ASCII passes d07, 16-a and T1 | `$FX/heldout-verdict/crlf-sh.sh` (`#!/bin/sh\r\n`): amended silent. Fixed form red on `crlf-sh.sh`, `lf-sh.sh`, `space-sh.sh`; silent on `bash-twin.sh` (`#!/bin/bash`), `shx-twin.sh` (`#!/bin/shx`); `ascii-twin.sh` is a `/bin/sh` file and matches by design. Verified on gawk 5.3.2 and busybox awk; mawk not installed, unverified | `([ \r]|$)` in awk (block 4). Note `\r` is not an escape inside an ERE bracket for `grep -E`; the fix is for the awk forms, which is what the amended cells use |
| The amended gate script strips one space after `#!`, so `#!  /bin/sh` (two spaces) slips | `$FX/heldout-verdict/strip.sh`: strip-all form MATCH on `#!/bin/sh`, `#! /bin/sh`, `#!  /bin/sh`, `#!/usr/bin/env sh`; no-match on both bash forms; the dive's own `#! /bin/sh` plant passes the strip-all form too. Verified on 11 of 11 POSIX interpreters | `shebang=${shebang#"${shebang%%[! ]*}"}` (block 5). A CRLF `sh` file already fails the gate through its CR check (section 3 of the script), so the case pattern needs no `\r` |

### B. Installers and PS-SEC (`$FX/installers/heldout/`)

| Rule (check) | Defect | Amended | Plant / twin |
|---|---|---|---|
| SH-INST-01 (`t-trunc.sh`) | false GREEN: sweep seeded only `~/.local/bin/old`, so a script that deletes the old binary then dies is invisible; `just` refuses to overwrite, every cell VACUOUS (counted as RED) | profile `p_seedold` seeds the previous binary; `P_ARGS=--force` where the installer refuses overwrite; treat a baseline that changes nothing as failure | `plant/linear.sh` `partial_cuts=4` of 85, red 11 of 11; `ref/install.sh` 0 of 11; bun 168 of 389 |
| SH-ERR-15/16 as used by SH-INST-20 row 5 (`t-trap.py`) | false GREEN: signals at the first network call, before `mktemp` in just and volta | `T_NTH=2`: `T_NTH=2 python3 -I $KIT/t-trap.py INSTALLER dash INT` (repeat TERM, HUP) | `plant/trap-late.sh` red at NTH=2, GREEN at NTH=1 (the false green); twin GREEN rc 130/143/129 |
| SH-INST-05 (`t-flags.sh`) | blind on a tty (scenario 2 runs without one) | scenario 2t under `ptyrun.py` with the BusyBox option set | `plant/wget-tty.sh` red on 2t only; twin green |
| SH-INST-05 grep (new) | none: aid for CANDIDATE-INST-1 | `git ls-files -z --cached --others --exclude-standard -- '*.sh' \| xargs -0 -r grep -nH -e '--show-progress' -e '--https-only' -e '--secure-protocol' -e '--retry-connrefused'` (a hit inside a `wget --help` probe is a reading step) | held red (`just-install.sh:63`, `pixi-install.sh:119`), plant red, twin silent |
| SH-INST-03/-07 (`t-tamper.sh`, pnpm profile) | profile removing only `openssl` read RED because `sha512sum` remained (honest labelling, not fail-open) | profile `pnpm-allhash` removes all hash tools: A, B, C all refuse | `plant/failopen.sh` red, ref green; pnpm-allhash green |
| SH-INST-17, PS-SEC-05, -06, -08bc, -10 greps | `\|` inside an `-E` pattern (shape) | one `-e` per alternative | R7 greps `r7-heldout.sh`: plants red, twins silent |
| PS-SEC-01 (presence grep) | false negative: file-level, passes pnpm's v11 branch that extracts unverified | `runps.sh ast-sec2.ps1 DIR` prints `UNVERIFIED-PATH (Expand-Archive)`; known false positive: a local-file `Start-Process` (ollama `scripts/install.ps1:232`), cleared by reading | `plant2/branch-unverified.ps1` red, `twin2/branch-verified.ps1` green, both engines |
| PS-SEC-09 (`EXIT-IN-FUNCTION`) | false negative: pixi's top-level `exit 1` in `catch` | `EXIT-TOPLEVEL-UNGUARDED` in `ast-sec2.ps1` | `plant2/toplevel-exit.ps1` red, `toplevel-exit-guarded.ps1` green; `pixi-install.ps1:208` red |
| PS-SEC-09 (`check-iex-survival.ps1`) | deadlock (timeout 124) when the child's stderr fills the pipe | `ReadToEndAsync` on both streams | `plant/stderr-flood.ps1`: original hangs, fixed GREEN |
| PS-SEC-10 (grep) | false positive: 6 hits are `irm \| iex` inside ollama's `<# #>` help block | `INVOKE-EXPRESSION-TOKEN` in `ast-sec2.ps1` (CommandAst only) | `plant2/real-iex.ps1` red, `doc-iex.ps1` not flagged, ollama green |
| PS-SEC-06 (grep) | false positive: `Tls` alternative matches `Tls12`; pnpm hit was accidental | pair 06a (named legacy member: `-e 'SecurityProtocolType\]::Tls13' -e 'SecurityProtocolType\]::Tls11' -e 'SecurityProtocolType\]::Ssl3' -e 'SecurityProtocolType\]::Tls[^0-9]' -e 'SecurityProtocolType\]::Tls$'`) and 06b (an assignment in a file that never tests `PSEdition`: `grep -lE -e 'SecurityProtocol *=' \| xargs -0 -r grep -L -e PSEdition`) | 06a plant red, twin silent, held silent; 06b plant red, twin silent, held red (pnpm `:257`, true) |
| PS-SEC-06 / SH-INST-06 ps1 | none: aid for CANDIDATE-PSSEC-1 | `git ls-files -z --cached --others --exclude-standard -- '*.ps1' \| xargs -0 -r grep -liE -e 'env:[A-Za-z_]*URL' \| tr '\n' '\0' \| xargs -0 -r grep -LF -e "-notmatch '^https://" -e 'StartsWith("https://"'` | held red (ollama, pixi), plant red, twin silent |
| PS-SEC-01 (accepted alternative) | rule names only a hash | see "Rules weakened or contradicted" | `authenticode.ps1 -Variant weakregex` and `nostatus` red, `pinned` green on both engines |

### C. CI and Taskfiles (`$FX/ci-and-taskfiles/`)

| Rule | Defect | Amended | Plant / twin |
|---|---|---|---|
| SH-CI-24 | false negative: stage 1 keys on `fromjson(` anywhere (13 files, 3 true) and misses the list-item and whole-matrix forms (tokio@5946c3f03bb8:.github/workflows/ci.yml:1401) | stage 1 anchored on the `matrix:` block (block 9); rule text adds the two forms | 3 plants red (`bad-fromjson`, `bad-listitem`, `bad-whole`); `twin-static-with-fromjson` silent (old red); held 4 of 4 files true |
| SH-CI-23, SH-CI-24 | no generated-file exemption (7 hits in gh-aw and cargo-dist files) | pipe through `grep -rLZ -i -e '^# .*DO NOT EDIT' -e '^# .*automatically generated' -e '^# .*autogenerated' -e '^# .*auto-generated' --include='*.yml' --include='*.yaml' .github/workflows \| xargs -r -0 grep -HPn -e '<line pattern>'` | authored plant red, generated plant silent (plain grep red); marker found 4 of 4 generated, 0 false marks in 113 files |
| SH-CI-30 | false positive 27 of 27 on 64 trees (9 GitHub `if:`/`runs-on:` expressions, 4 `\|\|` before `[[ a && b ]]`, 14 gh-aw generated) | block 10 | `bad/` 5 of 5 lines red; `twin/` 0 (old 5); generated twin 0; held 27 to 0, exemplars 10 to 8, fleet 1 to 1 |
| SH-CI-28, SH-CI-29 | false green: `gl-extract.py` crashes on 10 of 21 files (`!reference` 9, two-document `spec:` header 1) and the documented pipe exits 0; a job named `shellcheck` aborts ShellCheck; flat concatenation floods SC2317; PowerShell jobs fed to `sh` | `python3 gl-extract2.py --sh .gitlab-ci.yml OUTDIR && find OUTDIR -name '*.sh' \| xargs -r shellcheck -s sh -f gcc` (`--bash` with a pinned bash image); a nonzero extractor status is a failure | `gl/bad`, `gl/ref-bad` (old rc 1, pipeline green; new red), `gl/jobname-*`, `gl/exit-*`, `gl/win-*`; 21 of 21 files extract |
| SH-CI-17 (verify grep) | false positive: `-A3` after `shopt:` reaches a task named `pipefail` (go-task@871da1618956:testdata/shopts/global_level/Taskfile.yml:8) | block 11; also exclude `testdata/` (187 of 190 Taskfiles in go-task) | flow and block plants red (task 3.54.0: `invalid option name: "pipefail"`); named-task twin silent |
| SH-CI-19 (extractor) | false negative: skips `preconditions[].sh`, `vars.*.sh`, `defer`; `( )` wrapper raises SC2234; shipped runner passes `-S warning` against SH-GATE-01 | `python3 tf-extract2.py Taskfile.yml > out.sh && shellcheck -s bash -e SC1091,SC2050,SC2194,SC2154,SC2157,SC2043,SC2234 -f gcc out.sh` | `tfx/bad` old 0 findings, new 4; twin 0 and 0 |
| SH-CI-13 (checker) | false negative: `BASH4` misses `${x^}`, `${x,}`, `${x^^pat}`, `[[ -v X ]]`, `\|&`, `;;&`, `${x@Q}`, `shopt -s globstar` (and `declare -g`, `printf '%(..)T'`, `coproc`), each measured on bash 3.2, 4.0, 4.4, 5.3 | `python3 job-shell-lint2.py .github/workflows` (needs PyYAML, no `-I`); rule text lists the 8 plus 3 | `plants/mac/bad` red 3 of 3, appendix checker silent; twin 0 |
| SH-CI-01/02/05/07/08/16/23/24 | false positive: recursion into data YAML | enumerate per CANDIDATE-CI-1 | data-subdir twin silent under `find`, real violation red |
| SH-CI-05 (reading aid) | lists `msys2 {0}` as a template to check; it is `bash.exe -leo pipefail` (setup-msys2 `main.js:339`) and actionlint skips ShellCheck on every custom-shell body | text: known-good shims are `msys2 {0}` and `bash -euo pipefail {0}` | `m/msys2` rc 0 on a body the `shell: bash` twin flags (SC2086) |
| SH-CI-07 | field list lacks `github.event.pull_request.head.repo.full_name` (zizmor medium flags arduino-cli@1c0071456537:.github/workflows/check-certificates.yml:51); bodies also live in `with:` inputs of VM actions (tokio `ci.yml:1414-1430`) | verdict-author recommendation: add the field to the list; scope note that `prepare:`/`run:` inputs count, zizmor at `--min-severity medium` is the second check | H8: multi-line plant red, `envs:` twin silent; the full_name addition was not planted |
| SH-CI-17b pipefail trigger | no trigger | CANDIDATE-CI-2 check, block 12 | 1 / 0 (three twins) |

Block 9, SH-CI-24 (two commands; stage 1 lists files, stage 2 prints lines):

```sh
grep -rlPzZ -e '(?im)^([ ]*)matrix:[ ]*+(?:\$\{\{[^\n]*?\b(?:needs|steps|github\.event|inputs)\.|\n(?:\1[ ]++[^\n]*+\n)*?\1[ ]++(?:[A-Za-z0-9_-]++:[ ]*+|-[ ]++)\$\{\{[ ]*+(?:fromjson\([ (]*+)?(?:needs|steps|github\.event|inputs)\.)' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r -0 grep -Pn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\bmatrix\.'
```

Block 10, SH-CI-30:

```sh
grep -rLZ -i -e '^# .*DO NOT EDIT' -e '^# .*automatically generated' -e '^# .*autogenerated' -e '^# .*auto-generated' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bash' --include='*.bats' . | xargs -r -0 grep -HnP -e '^(?!\s*(?:-\s+)?(?:if|runs-on):)(?!.*(?:\bgithub\.(?:event|ref|sha|actor|repository|head_ref|run_id|workspace)|\b(?:inputs|matrix|needs|steps|secrets|vars)\.[A-Za-z_]))(?!.*\[\[(?:(?!\]\]).)* \|\| ).* \|\| (?:[^|&;(){}`\[\]]|\$\([^)]*\)|[0-9]?>&[0-9])+ && '
```

Sensitivity trade: `[ -n x ] || cmd && other` with the test first stays red; a real shell line that names `steps.`, `needs.` or `inputs.` followed by a letter is exempted (shell variables are not spelled that way).

Block 11, SH-CI-17:

```sh
grep -rlPz -e '(?m)^[ ]*shopt:[ ]*(?:\[[^\]\n]*\bpipefail\b|\n(?:[ ]*-[ ]*[A-Za-z]+[ ]*\n)*?[ ]*-[ ]*pipefail\b)' --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' .
```

Block 12, SH-CI-32 (file-level approximation: a file naming pipefail anywhere is skipped):

```sh
grep -rLZ -e pipefail --include='Taskfile*.yml' --include='*.taskfile.yml' --include='taskfile.yml' . | xargs -r -0 grep -HnP -e '^(?:[^{|]|\{(?!\{)|\{\{(?:(?!\}\}).)*\}\}|\|\|)* [|] [a-z]'
```

SH-CI-31 enumeration form: `find .github/workflows -maxdepth 1 -type f -name '*.y*ml' | xargs -r grep -HnE -e 'shell: */'` and `... | xargs -r actionlint -oneline`.

Also: do not suppress SC2193 or SC2309 in a workflow body (`${{ }}` placeholder artefacts, actionlint disables neither); read the value through `env:` (H7: `m/placeholder-bad` rc 1, twin rc 0). SH-CI-21: zizmor `--offline` where no token exists; its medium floor is attainable only on SHA-pinned actions (`unpinned-uses` 340 of 394 findings; ruff exit 0, neovim 1 finding).

### D. Emitters and alt shells (`$FX/emitters-and-alt-shells/`)

| Rule | Defect | Amended | Plant / twin |
|---|---|---|---|
| SH-EMIT-01 (Verify) | none: static aid added | C5: `grep -rnE --include='*.rs' -e '(export\|set -gx\|setenv\|\$env:)[^"]*\{(value\|val\|path\|v\|s\|str)(:[?#]+)?\}' -e '= "\{(value\|val\|path\|v\|s\|str)\}"' DIR` and `grep -rnE --include='*.go' --include='*.py' -e '(export \|set -x -g\|fish_add_path\|\$env[.:]\|set paths\|setenv).*%[sv]' DIR`; triage aid, not a gate (4 of 7 vfox hits false) | `c5/plant` 5 lines, `c5/twin` 0; fnm 7, vfox 7, carapace 5, just/mcfly/broot 0 |
| SH-EMIT-03 (aid) | none | `grep -rlF --include='*.rs' -e "replace('\\''" DIR \| xargs -r grep -L -e '2019'` (and the `.go` variant with `ReplaceAll`) | `pwsh_ocx` 28 of 35 red, `pwsh_sq` 35 of 35 green; `inject.ps1 u2018` exit 1 on pwsh 7.4.7, 7.6.6, WinPS 5.1.26100.9444, `fixed-u2018` and `ascii` exit 0 |
| SH-EMIT-24 (aid) | none | `grep -rnE --include='*.go' --include='*.sh' --include='*.rs' -e 'PROMPT_COMMAND=\([_a-z]+ ' DIR` | vfox `bash.go:47` hit; `plant-ocx-array.sh` 5 of 40, `twin.sh` 0 |
| SH-EMIT-24 to -29 hook harness | false red: a pipe-fed `bash -i` cannot drive a tty-gated emitter (mcfly: 40 of 40 "failing", pty run 0 of 25); fish judge assumes `fish_prompt` (mcfly rides `fish_postexec`, 8 of 8 false failures); mcfly fish exits on an unreadable `MCFLY_HISTFILE`; docker `-it` pty rows can be empty | drive tty-gated emitters on a pty; judge `ours == prompts` and treat zero firings as INVALID; judge fish per event; an empty row is INVALID, never a pass | `out-mcfly-bash.txt` 40 of 40 (blind), `-pty` 0 of 25; mcfly fish by prompt 8 of 8 false, by command ours = 4 in 8 of 8 |
| SH-FISH-07 (F5) | false positive: lists every `\|\|` (tide 38 lines, builtins or functions) | narrow check F5b: `grep -rnP --include='*.fish' -e '^\s*(?!(?:if\|and\|or\|not\|while\|command\|test\|set\|string\|status\|functions\|contains\|count\|builtin\|type\|math\|path\|echo\|return\|true\|false\|read\|begin\|_)\b)[a-z][a-z0-9_.-]*\s[^\|#]*\|\|' DIR` (a known function on the left is a false positive: tide `conf.d/_tide_init.fish:9`) | `f5/plant` 2, `f5/twin` 0; tide 1 (false), fzf.fish 0 |
| SH-ELV-02 / SH-ELV-03 (E1, E2) | false negative: `a=b cmd` compiles clean on 0.21.0 and runs a program named `a=b` (flagged on 0.18.0 only) | `grep -rnE --include='*.elv' -e '(^\|[[:space:]({;\|])[A-Za-z_][A-Za-z_0-9]*=[^[:space:]=]+[[:space:]]+[{(A-Za-z]' DIR` | `e2b/plant` 1, `e2b/twin` 0; elvish-modules `git-vcsh.elv:26` true |
| SH-NU-02 | false positive: standalone module files flag every module command as external (nupm 13 of 25 red) | run module trees through `use DIR/`: `nuv.sh 0.116.1 nu-gate.nu --strict wrap.nu` | `nu-mod/plant/wrap.nu` rc 1 on 0.100.0 and 0.116.1, twin rc 0 on both |
| SH-NU-05 (N3 second grep) | none: floor check | `grep -rnF --include='*.nu' -e '$nu.temp-dir' -e 'str lowercase' -e 'str uppercase' DIR \| xargs -r grep -L -e '# nu-range:'` | nupm hits `dirs.nu:11,65,71`; 25 of 25 files lack the header |
| SH-ZSH-01 (Z4 `emulate -L zsh`) | false positive: raw list is not a violation list (26 of 29 pure, 300 of 301 zsh-syntax-highlighting files, mostly tests and `test-data`) | judge per file role: drop paths matching `test` and `test-data`; entry points that only source are exempt | listing only, no plant |
| SH-ZSH-12 (Z1) | false positive on 5.0.8: `typeset -gA w=()` inside `if` inside a function, and `${A[x]:=y}` | gate at 5.3.1 and later (the rule already says so); 5.0.8 is a run-time target | `zsh-parse/t1.zsh` rc 1 on 5.0.8, 0 on 5.3.1 and 5.9; `t2`, `t3` 0 on all |

### E. PowerShell (`$FX/powershell/`; verification table in `shell-heldout/powershell.md`)

| Rule | Defect | Amended | Plant / twin |
|---|---|---|---|
| PS-COMPAT-02 (static fallback) | false negative: recall 5 of 7; misses end-of-line `&&` (PSReadLine@2984546f62da:tools/issue-mgmt/CloseDupIssues.ps1:101) and the generic static call (azure-powershell@f26e66248b28:tools/Github/ParseServiceContactsList.ps1:126) | N1 `grep -rnE -e '(&&\|[\|][\|])[[:space:]]*$' --include='*.ps1' --include='*.psm1' .` (1 of 6 held-out hits true; C# here-strings false); N2 `grep -rnE -e '\]::[[:alnum:]_]+\[[^]$]+\]\(' --include='*.ps1' --include='*.psm1' .` | 1 / 0 each |
| PS-COMPAT-01 | false positive: `-x` form misreports a CRLF file (winget-cli 6 of 6) | `grep -rL -e '^#[Rr]equires -Version' --include='*.ps1' .` | 1 / 0; old form lists the CRLF twin |
| PS-COMPAT-04 (D2, D5) | false positive: 0 of 120 hits under StrictMode; 84 of 96 D2 hits name only `$IsLinux`/`$IsMacOS` | split by variable (rule rewrite below); `grep -rnP -e '^(?!.*(PSVersionTable\|PSEdition\|Get-Variable)).*[$]IsWindows(?![A-Za-z0-9_])' --include='*.ps1' --include='*.psm1' .` | 1 / 0; held 10 hits, 3 reachable-wrong read, 2 guarded, 5 unread |
| PS-COMPAT-05 (C10) | false positive: `Get-Error` matched `Get-ErrorMessage` 72 of 72, `-Parallel` matched dbatools' own parameter; list covers 7 of 19 names | `grep -rnE -e '-AsHashtable' -e '-AsByteStream' -e 'ForEach-Object[^\|]*-Parallel' -e 'Join-String' -e 'Test-Json' -e 'Get-Error([[:space:]]\|$)' -e '-SkipHttpErrorCheck' -e '-AsArray' --include='*.ps1' --include='*.psm1' .`; the resolver's unknown-parameter mode is the check, the list illustrative; `Scan-StaticMembers-rev2.ps1` (`::new` excluded: 425 flagged before, 2 real after) | 2 / 0 (old form fires on the twin); static scan bad 2, `new` plant 0 |
| PS-ENC-01 | false positive: grep counts the BOM as non-ASCII (403 of 485 hits are BOM-only ASCII files) | N4 `LC_ALL=C grep -rlP -e '^(?:\xEF\xBB\xBF)?+[\x00-\x7F]*+[\x80-\xFF]' --include='*.ps1' --include='*.psm1' --include='*.psd1' . \| xargs -r env LC_ALL=C grep -L -P -e '^\xEF\xBB\xBF'` (non-ASCII content and no BOM) | 1 / 0; held 35 files (24 `.ps1`, 11 `.psd1`) |
| PS-ENC-02 | grep unusable: 391 BOM'd `.ps1`, 0 shebang or iex-served | scope by file role, not by grep | none |
| PS-ENC-08 / CANDIDATE-PSENC-1 | N3 en dash; N18 retained | N3 `LC_ALL=C grep -rlP -e '[ \t]\xE2\x80[\x93\x94][A-Za-z]' --include='*.ps1' --include='*.psm1' . \| xargs -r env LC_ALL=C grep -L -P -e '^\xEF\xBB\xBF'`; N18 `LC_ALL=C grep -rnP -e '^[^#]*\xE2\x80[\x98-\x9E]' --include='*.ps1' --include='*.psm1' .` | N3 1 / 0; N18 1 / 0, held 2 of 2 true |
| PS-ENC-10 (V3a) | false positive 22 of 22 (20 in `shell: pwsh`, 2 write `GITHUB_STEP_SUMMARY`; the runner's three readers detect a BOM, `actions/runner` `FileCommandManager.cs:138,258,369`) | N8 `grep -rnE -e '>>[[:space:]]*"?[$]env:GITHUB_(ENV\|PATH\|OUTPUT\|STATE)' --include='*.yml' --include='*.yaml' --include='*.ps1' .` then `python3 step-shell.py FILE LINE` per hit; violation only when `shell=powershell` | resolver: plant `powershell`, twin `pwsh` (grep itself shell-blind by design) |
| PS-ERR-03 (lint) | false negative: ignored `defaults.run.shell`; false positive: here-strings and hashtable lines counted as natives | `python3 pwsh-run-lint-rev3.py .` (4 findings on 86 YAML files, each read) | `miss` 0 to 1, `fp` 1 to 0, twin 0 |
| PS-NATIVE-01 | false positive 25 of 48 (package name, comments) | N16 `grep -rnP -e '^[ \t]*([$]\w+[ ]*=[ ]*)?[(]?curl[ ]+-' --include='*.ps1' --include='*.psm1' .` (held 23, all one Pode 7.x test file: a target-scope question) | 1 / 0 |
| PS-NATIVE-02 | false positive 13 of 18 | N17 `grep -rnP -e '^[^#<]*Start-Process[^#]*-ArgumentList[ ]+("[^",]*[ ][^",]*"\|\x27[^\x27,]*[ ][^\x27,]*\x27)[ ]*(-[A-Za-z]+\|$\|[\|])' --include='*.ps1' --include='*.psm1' .` | 1 / 0; held 4 |
| PS-GATE-01 (wrapper) | misconfiguration reported as findings: PSSA 1.25.0 RULE_ERROR on a manifest whose `FormatsToProcess` file is missing (azure-powershell `tools/AzDev/AzDev/AzDev.psd1`) exits 1 | `Invoke-PSGate-rev3.ps1` (`-ErrorAction Stop`, catch to exit 2) | original 1, rev3 2, twin 0 findings |
| PS-GATE-01 (new mode) | none | N10 `grep -rl -e 'Invoke-ScriptAnalyzer' --include='*.yml' --include='*.yaml' --include='*.ps1' --include='*.psm1' . \| xargs -r grep -L -e 'exit' -e 'throw' -e 'EnableExit'` | 1 / 0; held 1 true |
| PS-GATE-02 | false positive: unanchored grep matches a commented example (vscode-powershell `examples/PSScriptAnalyzerSettings.psd1:15`) | N11 `grep -rnP -e '^[ \t]*Severity[ ]*=[ ]*@[(](?!.*ParseError)' --include='*.psd1' .` | 1 / 0; held 1 true (Pode `PSScriptAnalyzerSettings.psd1:2`) |
| PS-GATE-03 (table) | the shipped `script.psd1` and `test.psd1` omit the `PSUseBOMForUnicodeEncodedFile` exclusion the table lists; test kind needs a `PSAvoidUsingConvertToSecureStringWithPlainText` exclusion (68 Error findings, all fixtures); no repo passes the table as written (script 580, test 1,098, module 2,273 findings) | `script-rev.psd1`, `test-rev.psd1`, `test-rev2.psd1`; adoption by baseline or ratchet | red under `test-rev`, green on twin (the exclusion silences its own bad plant by design) |
| PS-GATE-04 | false positive 43 (Pode locale `.psd1`, BOM-less UTF-8, load fine via `Import-LocalizedData`); template directories | `parse-gate-rev3.ps1` (culture-directory `.psd1` decoded as UTF-8 and parsed; template directories excluded; `TypeNotFound` and `ModuleNotFoundDuringParse` are environment findings) | `loc-ok` 6 to 0, `loc-broken` 5 to 2, `nonloc` 6 to 6 |
| PS-GATE-06 | rule text recommends `-Allow` wildcards; blind spots | see "Rules weakened or contradicted" | `plants/resolver3`: `bad` 1 finding (`-Tpe`), `good` 0; `allow` plant: `*-Az*` hides `Get-AzVMFooBarBaz` |

### F. Test suites (`$FX/heldout-test-suites/ref/`)

| Rule (cell) | Defect | Amended | Plant / twin |
|---|---|---|---|
| SH-TEST-09 census | false green on a short run (no GNU parallel: `1..2`, 0 executed, bats exit 1, original census exit 0; Bash-it 255 of 308 with exit 1); false green when a generator input vanishes (plan and static count shrink together); false red on `bats_test_function` files | `bats-census2.sh`: result lines (`^ok N`, `^not ok N`) equal the plan, no duplicated N, no `# bats warning`; per-file pin `N path` for files that call `bats_test_function` with `bats --count FILE`; the CI step records `rc=$?` of bats and fails on either | `c_empty` red (original exit 0), `a_gen` without pin red, pinned green, `f_gen_twin` green (original false red), `e_twin` short run red (original exit 0) |
| SH-TEST-09 (`--formatter junit`) | no TAP plan, census exits 74 | `--report-formatter junit --output DIR` beside stdout TAP, or `bats-census-junit.sh` | `h_skip` red, `i_nested` red, `e_twin` green |
| SH-TEST-09 (`bats --count -r DIR`) | cannot replace the static grep: executes top-level code (dokku 4 files fail), descends into submodules (basher 429 versus 138), counts fixtures (bats-file 227 versus 212) | keep the static count over `git ls-files` with `CENSUS_EXCLUDE` for fixture `.bats`; use `--count` on single files only | measured, F2 |
| SH-TEST-04 (L3) | listing: 105 hits, 10 mutation-proven vacuous (bats-assert, bash 3.2.57 green and 5.3.20 red) | `l3v2` flags a `[[ ]]` or `(( ))` followed by another statement in the same test | `mutate-l3.sh` on `bash:3.2` and `bash:5.3`, 10 sites each |
| SH-TEST-05 (L2) | false positive 200 of 200 (cleanup, traps, guards; dokku `tests/unit/plugin.bats:18`) | `l2v3.sh` (blank quoted strings, assertion-shaped statement, `\|\|` directly after) | plant 2 lines, twin 0, corpus 0 (`l2v2` missed the quoted form) |
| SH-TEST-02 (L5) | false positive 329 of 329 (every file lacks the literal; none has the hazard) | `l5v3.sh`: flag used and no directive in the file or any `load`ed helper | plant red, helper twin green (`l5v2` flagged it); corpus 0 |
| SH-TEST-06 (L6) | false positive on assertion libraries (bats-assert 204 by construction) | `l6v2.awk` (accepts `assert*`/`refute*`/`$status`/`$output`, excludes `run assert*`); advisory only on assertion-library suites | asdf 101, Bash-it 12, dokku 21, goenv/nodenv/basher/bats-file 0 |
| SH-TEST-18 (P1) | false positive: Pode and PSDepend pin Pester elsewhere (build file) | `p1v2.sh`: pin evidence anywhere in the repo, call sites outside comments | `p1plant` red, `p1twin` silent |
| SH-TEST-20 (P2) | false negative: `git ls-files -- '*.Tests.ps1'` is case-sensitive, Pester also runs `*.tests.ps1` | `:(icase)*.tests.ps1` pathspec (`pester-lint2.sh`); sparse checkouts exit 74, materialise first | plant red, original lists only `upper.Tests.ps1` |
| SH-TEST-21 (`Test-DiscoveryCode.ps1`) | false positive 114 of 116 (`InModuleScope` wrapper, `-ForEach` data) | `Test-DiscoveryCode2.ps1` (`InModuleScope` transparent; report only names used inside `It`/`BeforeEach`/`AfterEach`/`BeforeAll`/`AfterAll`) | plant red, twin silent (v1 flagged the twin); 1 hit left, probably also false |
| SH-TEST-19 (gate) | false green: Pode, PSDepend and dbatools gate forms are all green on zero tests and skip-only; dbatools also on a failed container | `Invoke-PesterGate2.ps1`: `TotalCount > 0`, skipped within budget, all three failed counters, `Result`; `-ExpectedTotal N` for generated suites | zero, skip-only red on both Pester 5.9.1 and 6.2.0; `gen5/plant` red with pin `total=1 but the pin says 3` |
| CANDIDATE-TEST-1..3 | new | L8, L9, runner-list compare (candidate text) | see candidates |

## Rules weakened or contradicted

No rule is retired. The table lists the 11 MUST texts that change, then SHOULD-level and wording items.

| Rule | What the held-out tree showed | Recommended change | Evidence |
|---|---|---|---|
| PS-ENC-01 (MUST) | ASCII-only over-reaches. 47 of 82 files with non-ASCII content carry a BOM and work on 5.1.26100.9444; the defect is the 35 without one. The "BOM exception" is too narrow: Pode's locale `.psd1` are BOM-less UTF-8 and load through `Import-LocalizedData` | rewrite: "Non-ASCII content in a 5.1-bound file requires a BOM (or `[char]0xNNNN`); ASCII-only stays required for `iex`-served and shebang files (PS-ENC-02). Locale data may be BOM-less UTF-8 only when loaded by `Import-LocalizedData`." Owner: keep ASCII-only for new files | byte scan of 2,197 files; choco 270 of 275 BOM'd; Pode@89797a301afe:src/Locales/zh/Pode.psd1; `probe-pode-locale.ps1` (`Import-LocalizedData` correct on 5.1, `ParseFile` 5 errors) |
| PS-COMPAT-04 (MUST) | D2/D5 fire on safe code: 0 of 120 hits in a StrictMode file; an undefined `$IsLinux` is falsey, the right answer on 5.1. Only `$IsWindows` used alone is silently wrong | split: MUST for `$IsWindows` alone (positive or negated) and for `$PSVersionTable.Platform`/`.OS` under StrictMode (`.Platform` throws on 5.1, `.Keys -contains "Platform"` is False); SHOULD for `$IsLinux`/`$IsMacOS` outside StrictMode | PSDepend@a7ab90cf716f:psakeFile.ps1:22; azure-powershell@f26e66248b28:tools/StaticAnalysis/CollectStaticAnalysisPipelineResult.ps1:24; `probe-platform-key.ps1` |
| SH-FISH-07 (MUST) | the blanket "no `\|\|` while the floor is below 4.7.0" is wider than the hazard: only an unknown-command left side skips the right side on 3.6.0 and 4.0.2 (verdict-author run) | rescope: "no unknown command (not a builtin, function or `command -v`) on the left of `\|\|` while the floor is below 4.7.0"; keep the `or`/`and` chain half; add F5b | `orbar.fish` on fish 3.6.0 and 4.0.2, cases a, c, d, e, f run the right side, b skips it; tide@fcda500d2c29 38 `\|\|` lines |
| SH-TEST-02 (MUST) | 329 of 329 files lack the literal; 0 have the hazard (the flag used with no directive anywhere it can come from) | rewrite to the hazard: a test file that uses `run -N`, `run !` or `run --separate-stderr` names `bats_require_minimum_version` itself or in a `load`ed helper; the literal first-statement placement becomes SHOULD | `l5v3` corpus 0 hits; plant/twin |
| SH-TEST-20 (MUST) | last sentence ("A `-ForEach` that can be empty carries `-AllowNullOrEmptyForEach` on purpose") contradicts F16: the flag, new in Pester 6.0.0, turns a loud discovery error into a silent empty Describe; on 5.9.1 it is an unknown-parameter error | reverse it: pin the total (`-ExpectedTotal N`) and never pass `-AllowNullOrEmptyForEach` in a gating run | `gen5/plant` 5.9.1 total=1 green, with pin red; Pester 6.2.0 discovery error by default |
| PS-GATE-04 (MUST) | parsing every 5.1-bound file has false positives (5 Pode locale files, 43 errors; template directories; environment errors) | make the parse loader-aware and template-aware; `TypeNotFound` and `ModuleNotFoundDuringParse` need the dependency installed, not a syntax defect | `parse-gate-rev3.ps1`; azure-powershell `tools/Az.Tools.Installer/internal/Classes.ps1:18`, `InstallationTests/NetcoreTests/Compute/DummyConfig.ps1:3`; choco `tests/packages/{msi,zip}.template/templates/tools/chocolateyinstall.ps1:3` |
| PS-GATE-03 (MUST) | the shipped table lacks two exclusions and no repo passes it | ship the exclusions (BOM for script and test; `PSAvoidUsingConvertToSecureStringWithPlainText` for test); adoption by baseline or ratchet | 580, 1,098, 2,273 findings per kind |
| SH-INST-03 (MUST) | a digest may be replaced by a signature verified against an embedded key (pnpm `install.sh:129-131`); with every tool removed pnpm refuses; without openssl it degrades to the same-origin sha512 and says so | scope note: signature against an embedded key accepted; absent the verifying tool, fail closed unless the digest is pinned, and say in the header that the signature was skipped | pnpm@29fc8463b5b8:install.sh:129-131,186; `pnpm-allhash` A, B, C refuse |
| PS-SEC-01 (MUST) | Authenticode is an accepted alternative to a hash; and the hash must precede every path to extraction, not appear once in the file | amend: a verified Authenticode signature is accepted only with `Status -eq 'Valid'` and an anchored full-string signer pin; hash or signature before every path that reaches an extract or run call | ollama@eab97e9f92b9:scripts/install.ps1:75-91; `weakregex` and `nostatus` plants red; pnpm `install.ps1:332` (v11 branch) |
| SH-ERR-31 (MUST) | 220 glob-loop candidates: 98 unguarded, 59 guarded, 63 under nullglob; 63 of the unguarded are directories the script itself ships (non-empty by construction); only 1 of 59 guards includes the `-L` form; a dead emptiness check exists | rescope and extend: a loop over a directory the script ships is exempt, over user data it is not; add the array form `a=(./*.x); if [ ! -e "${a[0]}" ] && [ ! -L "${a[0]}" ]; then ... exit 79; fi`, never `${#a[@]}` as the emptiness test | void-packages@f485811fcd2a:common/xbps-src/shutils/purge_distfiles.sh:51-53 (`max=1` on 8 bash versions); `matrix/glob-dangling.sh` (`[ -e ]` alone 0, `-e` or `-L` 1, 11 of 11 shells) |
| SH-GATE-02 (MUST) | the text and its derivatives still list five keys where map X51 has four | four keys; remove `enable=check-extra-masked-returns` from the rc template and from SH-GATE-19 (lines 87, 245, 428, 433 of `shell-gate.md`) | `a_02c` 1 / 0, `o_02c` 2 / 1; map line 1533 |

Wording and SHOULD-level items:

| Rule | Held-out result | Change |
|---|---|---|
| PS-GATE-06 (SHOULD) | its own text recommends `-Allow` wildcards (`*-Az*`, `*Chocolatey*`, `shell-pwsh.md` line 286); with the corpus list 3,986 of 4,062 unresolved-command findings (98.1%) are false, 3 of 9 repos produce only false ones, only 2 of 44 false names recur across repos; `-Allow '*-Az*'` hides `Get-AzVMFooBarBaz`. Unknown-parameter mode after the provider-dynamic-parameter fix: 58 findings, 0 false | split the rule: unresolved-command mode stays SHOULD and advisory with a repo-owned reviewed allow-list and no wildcard entries; unknown-parameter mode is a MUST candidate after a fresh round |
| PS-COMPAT-05 (MUST) | the named list covers 7 of 19 distinct 7-only names | the resolver's unknown-parameter mode is the check; the list is illustrative |
| SH-CI-08 (MUST) | 91 lines in 5 of 9 repos; 94 of 117 variable uses are literals | keep the MUST, add a Limits note: a hit defined only by literals or `secrets.*` is a style finding; one live chain exists (tokio `uring-kernel-version-test.yml:15` safe versus `:102` unsafe) |
| SH-CI-05, SH-CI-07, SH-CI-13, SH-CI-24, SH-CI-28 | text additions listed in section C | apply |
| SH-INST-01 evidence | `trailing.sh` withdrawn | drop it from the Watched line; red evidence is `linear.sh` and `toplevel.sh` |
| SH-INST-07 | no behavioural run against the sample; 5 of 10 have a wget path, 0 of 5 mention BusyBox | keep MUST; add a non-validating `busybox:1.37` run to the next round |
| SH-EXP-09 | 2073 `echo "$data"` lines in 16 trees; rule right on semantics, no cheap check | keep as a drafting and reading rule, do not gate |
| SH-EXP-21 | function half superseded | confirm the errexit C-12 wording lands |
| SH-TEST-04 (MUST) | original L3 lists 105 `[[ ]]` statements, 10 vacuous (mid-test only); last-statement uses were not mutated | keep the uniform `\|\| false` text (cheap); ship `l3v2` as the review priority list; owner may narrow the text |
| SH-TEST-09 (MUST) | O6 (dynamic registration) answered | add the red conditions of section F to the rule text |
| SH-TEST-19 (MUST) | all three real gate forms pass a zero-test run | add `-ExpectedTotal` for generated suites |
| SH-ZSH-12, SH-NU-01, SH-NU-02 | confirmed (5.3.1 floor; nupm declares no range, 25 of 25; wrapper needed) | no change |

## Per-ID hit table

"Hits" are output lines of the original cell over the named trees; precision is from the lines actually read ("full" = every hit classified). Amended-cell counts are in section A.

### POSIX scripts (16 trees, 2,131 files, 10,611 ShellCheck findings at default severity)

| Rule ID (cell) | Hits | Trees | Precision |
|---|---:|---:|---|
| SH-DIAL-01 (d01) | 241 (249 after fix) | 16 | false negative +8, no false-positive read |
| SH-DIAL-03 (d03), SH-DIAL-21 (d21) | 2131, 754 | 16 | adoption counters, not defects |
| SH-DIAL-06 (d06) | 140 | 16 | 104 of 140 true (74%), full read of the 36 removed |
| SH-DIAL-07, -09, -11, -12 | 2, 1, 27, 2 | 16 | d07 plus 1 false negative; d11 openwrt 18 |
| SH-USER-01 (u01) | 2223 | 16 | 513 in scope, 1710 `echo -e` out of scope |
| SH-USER-06, -07, -08, -09 | 5, 57, 80, 226 | 16 | u07 11 of 12 read true; u08 12 of 12; u09 10 of 12 (2 order-insensitive consumers) |
| SH-GATE-05 (05-a), -06 (06-a/b/c), -08 (08-a) | 437, 31/3/46, 118 | 16 | instances |
| SH-GATE-16 (16-a), -17 (script) | 25, 270 | 16 | 16-a false negative on `#! /bin/sh`; -17: 266 mode-without-shebang, 4 shebang-less 100755 |
| SH-SEC-01 (s01-*) | 2, 1, 77 | 16 | instances |
| SH-SEC-02 (s02) | 10 | 16 | 5 of 7 true after read of 7 |
| SH-SEC-05 (s05) | 17 | 16 | 1 of 17 true (6%) |
| SH-SEC-06, -07, -12 | 16, 8, 6 | 16 | instances |
| SH-SEC-08, -09, -10 | 30, 65, 83 | 16 | listings |
| SH-SEC-11 (s11) | 32 | 16 | 30 of 32 true |
| SH-ERR-03 (G-IFS) | 91 | 16 | 18 of 91 true (20%), full |
| SH-ERR-04 (G-DOLLARQ) | 2 | 16 | 0 of 2 true |
| SH-ERR-09, -10, -11, -12, -13, -14 | 51, 94, 1, 132, 2, 84 | 16 | instances |
| SH-ERR-15 (G-MKTEMP) | 33 | 16 | 27 of 33 true; 6 bats `teardown`; 22 non-test hits all real leaks |
| SH-ERR-16 (G-RET, e16a, e16b) | 45, 1, 72 | 16 | e16b 66 of 72 true |
| SH-ERR-17, -18, -19, -25 | 0 | 16 | green |
| SH-ERR-26 (G-ERRTRAP) | 15 | 16 | 4 of 15 true (27%) |
| SH-ERR-29 (G-SHOPT) | 17 | 16 | instances |
| SH-ERR-31 (census) | 220 loops | 16 | 98 unguarded, 59 guarded, 63 nullglob |
| CANDIDATE-ERR-1 (`n_return`) | 33 files | 2 (dokku 32, pi-hole 1) | 44 plus 1 sets, 0 resets |
| SH-EXP-09 (X09 = T1) | 1920 | 16 | 4 in MUST scope (0.2%) |
| SH-EXP-10 (X08) | 351 | 16 | 90 true (26%), full |
| SH-EXP-13 (X13 eval) | 332 | 16 | 6 of 10 read true |
| SH-EXP (X04 `rm "$var"`) | 276 | 16 | 10 of 10 read true |
| SH-CORE-07 T1 to T6 | 1920, 182, 149, 328, 233, 4 | 16 | T1 amended; T2-T6 clean |
| SC2218 (SH-GATE-07 row) | 22 | 16 | 1 of 22 outside bats |

### Installers (10; 4 with install.ps1)

| Rule | Result | Notes |
|---|---|---|
| SH-INST-01 | 1 of 10 violates (bun, 168 of 389 cuts partial) | 9 hold (`just`, `helm` cut-safe though linear) |
| SH-INST-03/04 | 7 of 10 verify nothing; 8 of 10 install a tampered payload with rc 0 | helm and pnpm fail closed; SH-INST-04 0 false claims |
| SH-INST-05 | 10 of 10 fail the probe; 9 of 10 omit `--proto` | only just passes both flags |
| SH-INST-06 | bun, pixi violate; 8 of 10 have no override | ps1: ollama, pixi |
| SH-INST-07 | 5 of 10 have a wget path, 0 mention BusyBox | static only |
| SH-INST-08 | 0 of 9 platform-aware installers exit 7 | fnm and bun fetch the wrong asset; volta exits 0 doing nothing on 5 platforms |
| SH-INST-09, -16, -19 | 0 of 10 | universally unmet |
| SH-INST-11 | 10 of 10 pass | |
| SH-INST-12 | 4 of 10 escalate by default | outside the rule's scope |
| SH-INST-17 | 2 hits (just `:120`, coder `:117`) | true |
| SH-ERR-15/16 (t-trap) | RED: fnm, pixi, ollama, just and volta (at NTH=2), pnpm (status 1); GREEN: helm, coder, tailscale | |
| PS-SEC-01 | bun, pixi violate; ollama uses a signature; pnpm partial | pixi tampered zip extracted on both engines |
| PS-SEC-03, -07, -11 | 0 hits | |
| PS-SEC-04 | 3 of 3 extractors use `Expand-Archive`; safe on both engines | |
| PS-SEC-05 | 3 hits (bun `:191`, pixi `:205`, pnpm `:332`) | |
| PS-SEC-06 | 06a 0, 06b 1 (pnpm `:257`, true) | old grep matched `Tls12` |
| PS-SEC-08, -09 | 4 of 4 leak into the session; pixi host-killed, bun swallowed | |
| PS-SEC-10 | 6 hits, 0 true | help-block `iex` |

### CI (13 trees; 113 workflow files, 829 `run:` steps, 36 Windows and 32 macOS jobs)

| Rule | Hits | Precision |
|---|---:|---|
| SH-CI-01 | 26 steps in 6 repos (grep 30) | the 3 Windows default-pwsh hits are the documented false positive |
| SH-CI-05, -16 | 1 live template (neovim `msys2 {0}`, known-good); ripgrep `ci.yml:166` live | 3 and 2 further hits in a data YAML |
| SH-CI-07 | 8 authored | 2 true (ripgrep `release.yml:26`, tokio `ci.yml:786`), 6 `docker/metadata-action` `tags:` lines |
| SH-CI-08 | 91 lines, 117 uses | 94 literal (80%) |
| SH-CI-23 | 49 authored (56 total) | 45 of 49 in run bodies (92%) |
| SH-CI-24 | stage 1 13 files, then 4 | 3 of 13 true (old); 4 of 4 (new) |
| SH-CI-09, -11, -14, -18, -26, -27, -29 (eval, `git checkout --`) | 0 | green |
| SH-CI-10 | 2 | both benign |
| SH-CI-13 | 0 in 137 macOS steps | checker incomplete |
| SH-CI-28, -29 | 10 of 21 GitLab files crash the old extractor; 70 SC2086/SC2046/SC2068 lines name `$CI_*` | |
| SH-CI-30 | 27 hits over 64 trees (3,936 files) | 0 true |
| SH-CI-17 | 1 | false positive |
| actionlint 1.7.12 default | 243 findings, 34 not ShellCheck | 4 placeholder artefacts |
| zizmor 1.30.1 medium | 394 findings over 9 repos (340 `unpinned-uses`) | ruff exit 0, neovim 1 |

### Emitters and alt shells (corpus pass/total, oldest/newest interpreter)

| Arm | Pass |
|---|---|
| fnm bash, zsh, fish, pwsh | 26/33, 26/33, 26/33, 24/33 |
| vfox bash, zsh, fish, pwsh (EXE channel) | 25/34, 25/34, 25/34, 21/34 |
| mcfly pwsh | 23/34 |
| carapace bash, zsh, fish, pwsh, nu, elvish | 26/33, 26/33, 21/33, 22/33 (WinPS 21), 32/33, 25/33 |
| SH-EMIT-24 hook, vfox bash | 5 of 40 fail; mcfly pty 0 of 25; vfox and mcfly zsh 0 of 16 each |
| SH-EMIT-33/35 completion | fnm, just, broot green everywhere; carapace 5 of 8 bash, 0 of 4 zsh autoload, source-before-compinit 0 of 4; vfox bash 0 candidates without bash-completion |
| SH-ZSH Z2 / Z1 | 0 hits on 330 files / 5.0.8 fails 3 pure and 5 zsh-syntax-highlighting files, 5.3.1 and later none |
| SH-FISH F1 / F5 | 0 failures on 4 versions (162 files) / tide 38 `\|\|`, 1 false by F5b |
| SH-NU | nupm raw 13 of 25 red (0.100.0), wrapped 0.116.1 rc 0, 0.100.0 rc 1 |
| SH-ELV E1 | 0.18.0 8 of 25 red, 0.21.0 7 of 25; E2b 1 true |

### PowerShell (9 repos, 2,197 files)

| Rule | Hits | Precision |
|---|---:|---|
| PS-COMPAT-02 (5.1 parse) | 76 errors in 19 files (7.6.6: 5 in 5) | 15 files fail only on 5.1; no 7-only construct slipped past |
| PS-COMPAT-02 static greps | recall 5 of 7 | EOL `&&` hits 6, 1 true |
| PS-COMPAT-04 (D2, D5) | 96, 24 | 0 of 120 under StrictMode |
| PS-COMPAT-05 | resolver 19 names, 51 findings; V-C10 37 | list covers 7 of 19 |
| PS-ENC-01 | 485 files by grep, 82 by byte scan | 35 BOM-less non-ASCII are the defect |
| PS-ENC-02 | 391 | 0 true |
| PS-ENC-07, -08 | 1, 2 files (4 lines) | 1 of 1, 2 of 2 true |
| PS-ENC-10 | 22 | 0 true |
| PS-ERR-03 | 4 on 86 YAML | each read, consistent with the rule |
| PS-ERR-05, -06 | 1, 3 | 0 of 1 true; 3 conformant, none executed |
| PS-NATIVE-01, -02 | 48 (23 real), 18 (5 real) | old greps 52% and 72% false |
| PS-GATE-01 / 02 / 04 | 1 report-only / 1 true / 43 false | |
| PS-GATE-03 | 580, 1,098, 2,273 findings by kind | none passes |
| PS-GATE-05, -07 | 0, 0 | green |
| PS-GATE-06 | 4,062 findings (rev3): unresolved 3,990, 3,986 false; unknown-parameter 58, 0 false | |
| PS-GATE-09 | 21 wildcard `*ToExport` | |

### Test suites (9 bats suites, 4 Pester repos; census 329 bats files)

| Rule | Hits | Precision |
|---|---:|---|
| SH-TEST-02 (L5) | 329 | 0 true (hazard) |
| SH-TEST-04 (L3) | asdf 52, dokku 34, Bash-it 6, bats-assert 10, nodenv 3 | 10 mutation-proven (bats-assert) |
| SH-TEST-05 (L2) | 200 | 0 true |
| SH-TEST-06 (L6) | asdf 140, Bash-it 164, bats-assert 448, dokku 21, goenv 11, nodenv 1 | after `l6v2`: 101, 12, 204, 21, 0, 0 |
| SH-TEST-09 census | original false green on a 0-of-2 run and 255 of 308; false red on dynamic files | census2 red on both |
| CANDIDATE-TEST-1 (L8) | 39 | plant/twin |
| CANDIDATE-TEST-2 (L9) | 3 unconditional first-statement skips | plant/twin |
| CANDIDATE-TEST-3 | asdf 9 unlisted plus 1 commented out | plant/twin |
| SH-TEST-18 (P1) | Pode, PSDepend flagged | both pin elsewhere |
| SH-TEST-19 | 3 of 3 real gate forms green on zero tests and skip-only | |
| SH-TEST-20 (P2) | case-sensitive pathspec misses `*.tests.ps1` | plant/twin |
| SH-TEST-21 | 116 (v1) | 114 false; 1 left |

## Third-party defects observed

Recorded only; nothing was filed (map X55).

- **Installers.** pixi: ps1 `exit 1` kills the host (`install/install.ps1:208`), `$ZIP_FILE` read in `finally` under StrictMode (`:211`), no hash, sh `--show-progress` on a tty breaks BusyBox, `PIXI_REPOURL`/`PIXI_DOWNLOAD_URL` accept http, leaks `.pixi_install.*` on signals. pnpm: ps1 fails on pwsh 7.6.6 on Fedora, unguarded `Tls12`, v11 branch extracts unverified, sh trap returns status 1, `pnpm setup` aborts without `$SHELL` after the install finished. bun: linear sh (partial `bun.zip` on a cut), `GITHUB` http override, wrong asset on armv7l/i686/freebsd, ps1 `return 1` swallowed. volta: exits 0 after doing nothing on 5 platforms, leaks the temp dir on success. fnm: wrong asset on i686/riscv64, leaks the temp dir on success. just: wget branch dies on BusyBox, REST API for "latest" (`:120`). coder: REST releases list (`:117`), `su - -c '$*'` quoting, default prefix needs root. ollama: ps1 http override, `local` on ksh93u+m, blanket `$SUDO`. tailscale: `type` missing on posh (conditional member). helm: `$EUID`-based sudo even when the target is writable.
- **Emitters.** fnm builds shell values with Rust `{value:?}` in double quotes (`src/shell/bash.rs:25`, `zsh.rs:25`, `fish.rs:25`; 26 of 33) and raw double quotes for pwsh (`powershell.rs:25`); cmd `SET` unquoted (`windows_cmd/mod.rs:27`, unrecaptured). vfox: raw `{{.SelfPath}}` in `eval "$("...")"` (`internal/shell/bash.go:41`, `zsh.go:47`), `&"{{.SelfPath}}"` in pwsh (`:49`), bash hook prepends to the `PROMPT_COMMAND` array (`bash.go:47`, 5 of 40 on bash <= 5.0), bash completion yields 0 candidates without bash-completion. mcfly: path substituted raw into `-FilePath '::MCFLY::'` (`src/init.rs:37-38`, `mcfly.ps1:86`; 23 of 34, a U+2018 path executes attacker text), bash init returns early unless stdin is a tty, fish exits the shell on an unreadable `MCFLY_HISTFILE`. carapace: snippet quoting (`cmd/carapace/cmd/snippet/path.go:23-36`), needs bash >= 4.4 and `compdef` before use. broot: `--install` has no marker and no uninstall, honours `$ZDOTDIR`; `powershell.rs:76` single-quote doubling lacks U+2018..U+201B.
- **PowerShell smart-quote hole.** A generated completer whose help text holds `x` U+2018 `+(Set-Content ...)+` U+2018 `y` executes on pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1.26100.9444 (3 of 3); the ASCII twin and the U+2019-aware fix are green. Disclosure is the owner's call (map Q7).
- **Scripts.** dokku: 44 unreset RETURN traps, `.shellcheckrc` disables SC2086/SC2046/SC2068/SC2155/SC2162/SC2295, `curl -u "$USER:$TOKEN"` on argv (`contrib/release-dokku:190`). pi-hole: single-quoted RETURN trap (`gravity.sh:967`), 4 non-ASCII `#!/bin/sh` files. pfetch@a906ff89680c:pfetch:1 non-ASCII `#!/bin/sh` fails to parse under yash 2.52 in the C locale. void-packages: dead emptiness check (`purge_distfiles.sh:51-53`), 8 files without a real shebang. openwrt: bracket class as alternation (`scripts/make-ipkg-dir.sh:11`), `[ ... == ... ]` in `#!/bin/sh` (`sysupgrade:364`). kubernetes: `curl -H 'Authorization: Bearer dummy_token'` flagged by the old s02 (a false positive, not a defect). goenv: nullglob at top level (8 sites), `$0`-derived `base_dir` breaks `bats --count`.
- **CI.** ruff, ripgrep, tokio, bat, arduino-cli: `${{ }}` in run bodies (ripgrep `release.yml:26`, tokio `ci.yml:786`, arduino-cli `check-certificates.yml:51`); tokio's kernel-version taint chain (`ci.yml:1383-1406` to `uring-kernel-version-test.yml:102`); cli/cli keeps a 5,000-line data YAML under `.github/workflows/scripts/`; gitlab-runner `rebase.gitlab-ci.yml:6-19` unquoted `$CI_*`; inkscape `.windows` jobs are PowerShell; go-task `testdata/` is Task's own fixture set. actionlint 1.7.12 does not know `concurrency.queue`, the `copilot-requests` scope or the `field_added` event.
- **PowerShell.** winutil@07ccd8e2e755:.github/workflows/unittests.yaml:19-27 report-only PSSA, `Invoke-WinUtilISOScript.ps1:736` `[Text.Encoding]::Default`. Pode `PSScriptAnalyzerSettings.psd1:2` lists no `ParseError`. azure-powershell: en dash parameter prefix in two BOM-less files, `tools/ExecuteCIStep.ps1:278` `&&`, `gen-mail.ps1:19` trailing comma. choco: un-rendered template placeholders, `Invoke-AuthedTests.ps1:26` `if` with no block. dbatools-public: four unguarded multi-native steps (`reposize.yml`, `integration-tests.yml`, `gallery.yml`, `azure-migration-tests.yml`). zzamboni/elvish-modules `git-vcsh.elv:26` legacy `a=b cmd`. nupm `utils/dirs.nu:11,65,71` names born after 0.100.0.
- **Tests.** asdf: 9 of 32 bats files run by no harness, 35 commented-out tests, `main_test.go:99-105` comments out 63 tests. dokku `tests/unit/apps_2.bats:110` unconditional skip. bats-assert `test/assert_line.bats:340` and 9 siblings: vacuous `[[ =~ ]]` on bash < 4.1. bats-mock `package.json:43` `"test": "echo todo"`. basher `.github/workflows/ci.yml:24` fetches bats v1.1.0 with `--no-check-certificate`. Pode `pode.build.ps1:962` and dbatools `tests/appveyor.pester.ps1:520`: gate forms green on zero tests.

## Sub-artifacts

- [shell-heldout/posix-scripts.md](shell-heldout/posix-scripts.md): SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-GATE, SH-SEC, SH-CORE-07 over 16 trees; 19 proven amendments; CANDIDATE-ERR-1.
- [shell-heldout/installers.md](shell-heldout/installers.md): SH-INST and PS-SEC on 10 installers; G1-G13; kit fixes.
- [shell-heldout/ci-and-taskfiles.md](shell-heldout/ci-and-taskfiles.md): SH-CI-01..30 on 9 workflow, 3 Taskfile and 4 GitLab trees; SH-CI-30 on 64.
- [shell-heldout/emitters-and-alt-shells.md](shell-heldout/emitters-and-alt-shells.md): SH-EMIT corpus and hook matrices on 6 emitters; zsh, fish, nu, elvish checks on 6 repos.
- [shell-heldout/powershell.md](shell-heldout/powershell.md): PS-COMPAT, PS-ENC, PS-ERR, PS-NATIVE, PS-GATE on 9 repos; resolver out of sample; N1-N19.
- [shell-heldout/test-suites.md](shell-heldout/test-suites.md): SH-TEST on 9 bats and 4 Pester repos; census, parallel and junit; F1-F20.

Verdict-author fixtures: `$FX/heldout-verdict/` (`crlf-sh.sh`, `lf-sh.sh`, `space-sh.sh`, `bash-twin.sh`, `ascii-twin.sh`, `shx-twin.sh`, `strip.sh`).
