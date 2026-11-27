---
title: Network-bound fleet mutators on a repeat run and with stdin closed
program: product
topic: ux-consequential-actions
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 1
---

# Network-bound fleet mutators on a repeat run and with stdin closed

Question (q3, [commission](../product-resume/wave2/ux-consequential-actions/q3.md)): what do `grim add/install/update/release/publish` and `ocx add/pull/update/upgrade` do on a repeat run and with stdin closed, against a local registry?

This is a repair pass. Every measurement of the first draft was re-run from scratch against a registry started for this pass, with wall time recorded per command and the full output kept. Where the first draft was wrong the correction is listed in "Corrections to the first draft". Wave-1 references are given as paths with line numbers (all in this research tree, dated 2026-11-27 unless a git date is shown). One external source was fetched: Terraform `plan` docs (see Dated facts). Everything else is measurement. Versions: grim 0.16.0 (`grim --version`), ocx 0.6.8 (`ocx version`).

## Answer

1. **No command prompted, read stdin or hung.** 81 commands ran with stdin closed (`0<&-`), no controlling terminal (`setsid -w`) and a 20 s bound (`timeout 20`); none returned 124. Wall time is in every log entry (`elapsed=`). Against the live registry the slowest mutator took 0.422 s (`grim release`, first push) and the slowest overall 0.475 s (`ocx package push`). Against a dead registry (nothing listening, section 5) the slowest took 3.028 s (`ocx update`, `ocx add`), because ocx retries three times; the other dead-registry runs took 0.022 s to 1.480 s. Hence the bound is real but not "under a second" as the first draft claimed.
2. **A dead registry does not give one exit class.** Same cause, connection refused: `grim` update/add/release/publish exit 69; `ocx update` and `ocx add` exit 69 after about 3 s; `ocx pull` (empty store) and `ocx upgrade` exit 75 in 0.03 s. `grim install` and `ocx pull` with the content already local exit 0 and never report the registry as down. An agent that retries on 75 and gives up on 69 treats one failure two ways inside one CLI.
3. **Repeat runs mostly succeed. Four report a change that did not happen, hide a content conflict, or move state before refusing.**
   - `grim add` run 2 prints `added` and a WARN that it kept the existing pin; exit 0.
   - `grim update` on a locally edited install prints Action `updated`, exits 65, and the lock already points at the new digest while `grim status` reports `modified`.
   - `grim publish` with changed content and the same version exits 0 with status `skipped` and the old digest, also under `--dry-run`. This is the documented default (`--force` help: "default: skip entries whose exact-version tag already exists"), but the row never says the content differs. `grim release` on the same input exits 65 and names both digests.
   - `ocx remove` run 1 prints a header with no rows and no `removed hi` line.
4. **Previews exist where the first draft said none.** `ocx pull --dry-run` prints `cached` per package and writes nothing. `ocx upgrade --check` prints what would move, exits 65 when a tag would move, and leaves `ocx.toml` and `ocx.lock` byte-identical (diff in section 4). `ocx add`, `ocx update`, `ocx remove`, `ocx init` and all of `grim add/install/update/uninstall` have no `--dry-run`. `grim release --dry-run` skips the conflict check: real run exit 65, dry run exit 0 (section 1).
5. **Refusals name `--force` as the only remedy**, no `Try:` line. The `grim update` refusal says `--force` also authorizes "prune and reap deletions", but the `--force` help line never uses those words (section 6).

## Corrections to the first draft

| First draft said | Measured now | Section |
|---|---|---|
| Every command exited in under a second, none near the bound; "five commands exit 69 in under a second" | Max 3.028 s (ocx, three retries); `ocx pull` and `ocx upgrade` exit 75, not 69 | 5 |
| `ocx upgrade` `--dry-run` not checked | `--dry-run` count 0, but `--check` exists and is a no-write preview | 4 |
| `grim` exit 64 listed as measured | First draft never ran a grim command that exited 64. Now measured: `grim release --repo x ...` exits 64 | 2 |
| `grim publish` same-version change "hides a conflict" as if undocumented | Skip is the documented default; dry run agrees with the real run; the missing part is that the row does not say the digest differs | 3 |
| `grim install`, `ocx pull`, `ocx upgrade`, `ocx add` not measured against a dead registry (stale-lock refusal) | All four measured, lock intact, no host-name edit | 5 |
| Used registry `vsc-live-reg` of another session | Own registry `q3r-reg` on 127.0.0.1:5088, empty at start, removed at end | Method |

## Method

Throwaway state under `~/.cache/research-lang/exemplars/product/wave2/q3r` (written `$W` below): temporary `HOME`, `XDG_*`, `GRIM_HOME` and `OCX_HOME`; no credential read, used or created. Registry: `docker run -d --rm --name q3r-reg -p 127.0.0.1:5088:5000 registry:2`. Before it, `ss -ltn | grep -E ":5088 |:5089 "` printed nothing, and after start `curl -s http://127.0.0.1:5088/v2/_catalog` printed `{"repositories":[]}`, so every repository in it was created by this pass. `docker stop q3r-reg` before section 5 removed it (`--rm`); `docker ps -a --filter name=q3r-reg -q | wc -l` printed `0`. The other session's registry was not used or touched in this pass.

Harness `$W/step.sh LABEL CMD...` (each log entry shows `$ <exact command>`, `exit=`, `elapsed=`, then the full output, stdout and stderr merged; `NO_COLOR=1` so no ANSI codes, checked with `grep -c $'\x1b'`, which printed 0):

```
export HOME=$B/home XDG_CONFIG_HOME=$B/home/.config XDG_DATA_HOME=$B/home/.local XDG_CACHE_HOME=$B/home/.cache GRIM_HOME=$B/home/.grim OCX_HOME=${OCX_HOME_OVERRIDE:-$B/home/.ocx} NO_COLOR=1
export OCX_INSECURE_REGISTRIES=127.0.0.1:5088 GRIM_INSECURE_REGISTRIES=127.0.0.1:5088
unset CI
s=$(date +%s.%N)
out=$(timeout 20 setsid -w "$@" 0<&- 2>&1); rc=$?
e=$(date +%s.%N)
printf '### %s\n$ %s\nexit=%s elapsed=%.3fs\n%s\n\n' "$label" "$*" "$rc" "$(echo "$e - $s" | bc -l)" "$out"
```

Skill: `skills/demo/SKILL.md` (frontmatter `name: demo`, one description line, a body line). Package: `pkg/bin/hi` plus `meta.json` `{"type":"bundle","version":1,"env":[{"key":"PATH","type":"path","required":true,"value":"${installPath}/bin"}]}`. Registry versions pushed: grim `q3/demo` 1.0.0, 1.0.1, 1.0.2 and `skills/demo` 2.0.0; ocx `q3/hi` 1.0.0, 1.1.0, 2.0.0. `--announce` and `--push-registry` were not used. Per-log step counts and maxima (`grep -c '^exit=' log-*.txt`, `grep -o 'elapsed=[0-9.]*'`): grim 11 steps max 0.422 s; grim2 16 max 0.327 s; publish 8 max 0.359 s; ocx 4 max 0.475 s; ocx2 2 max 0.407 s; ocx3 21 max 0.107 s; force 4 max 0.010 s; dead-setup 5 max 0.149 s; dead 14 max 3.028 s.

## Measured results

Each table row summarizes a log entry; the full command lines, outputs and timings are in the Appendix (logs A to H), in the same order.

### 1. `grim release` (log A)

| Step | Exact command | Result | Exit | Time |
|---|---|---|---|---|
| r1 | `grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.0` | row `sha256:b890c5a2...`, tags `1.0.0,1.0,1,latest`, Pushed `true` | 0 | 0.422 s |
| r2, same content | same | identical row, Pushed `true` | 0 | 0.332 s |
| r3, content edited, same tag | same | `version tag '1.0.0' already exists at a different digest (existing sha256:b890c5a2..., new sha256:ed5883ab...); rerun with --force to move it` | 65 | 0.235 s |
| r3 dry run | `grim release --dry-run skills/demo ...:1.0.0` | row with new digest `ed5883ab...`, Pushed `false`, no conflict text | 0 | 0.030 s |
| r3 skip existing | `grim release --skip-existing skills/demo ...:1.0.0` | old digest `b890c5a2...`, Pushed `false`, Tags empty | 0 | 0.023 s |
| r3 force | `grim release --force skills/demo ...:1.0.0` | new digest, Pushed `true` | 0 | 0.342 s |
| force again | same | same row, Pushed `true` | 0 | 0.324 s |
| 1.0.1 | `grim release skills/demo ...:1.0.1` | `1.0.1,1.0,1,latest` Pushed `true` | 0 | 0.371 s |
| 1.0.1 again | same | identical row, Pushed `true` | 0 | 0.344 s |

Registry after: `curl -s http://127.0.0.1:5088/v2/q3/demo/tags/list` printed `{"name":"q3/demo","tags":["1.0.1","latest","1.0","1","1.0.0"]}`. An identical repeat succeeds but prints `Pushed true` for a push that changed nothing. The dry run disagrees with the real run on a conflict.

### 2. `grim add`, `install`, `update`, `uninstall`, and an exit-64 probe (log B)

| Step | Exact command | Result (status word in bold) | Exit | Time |
|---|---|---|---|---|
| help scan | `for c in add install update uninstall release publish; do grim $c --help \| grep -c -- --dry-run; done` | 0, 0, 0, 0, 1, 2 | 0 | 0.028 s |
| add run 1 | `grim add 127.0.0.1:5088/q3/demo:1 --name demo` | `skill demo ...@sha256:243d6c1f... ` **added** | 0 | 0.145 s |
| add run 2 | same | status **added** again, plus WARN `kept the existing pin of skill 'demo'. grim update -- demo moves it ...` | 0 | 0.087 s |
| install 1, 2 | `grim install` | **unchanged**, **unchanged** | 0, 0 | 0.052 s, 0.053 s |
| install, local edit | `echo "local edit" >> .agents/skills/demo/SKILL.md; grim install` | `installed artifact was modified locally: recorded sha256:bc20e68f..., found sha256:3b1d58a5...; rerun with --force to overwrite` | 65 | 0.056 s |
| tag moved | `grim release skills/demo ...:1.0.2` then `grim update` | ERROR `Update refused a locally modified artifact; rerunning with --force overwrites it and also authorizes update's prune and reap deletions: ...`; table `skill demo sha256:243d6c1fb7c7 -> sha256:d7ef5138b1b9` Action **updated** | 65 | 0.121 s |
| lock after refused update | `grep -n "sha256" grimoire.lock` | `pinned = "...q3/demo:1@sha256:d7ef5138b1b9..."` (the new digest) | - | - |
| status after | `grim status` | State `modified`, Pinned `d7ef5138...` | 0 | 0.021 s |
| update force | `grim update --force` | Old `d7ef5138b1b9` New `d7ef5138b1b9` **restored** | 0 | 0.131 s |
| update again | `grim update` | **unchanged** | 0 | 0.109 s |
| install force over edit | `echo edit2 >> .agents/skills/demo/SKILL.md; grim install --force` | **updated** | 0 | 0.094 s |
| uninstall 1 / 2 | `grim uninstall skill demo` | **uninstalled** / **not-installed** | 0 / 0 | 0.127 s / 0.046 s |
| kind not inferable | `grim add 127.0.0.1:5088/q3/nosuch:1` | `could not infer the kind of ...; pass --kind skill\|rule\|agent\|bundle\|mcp\|hook\|settings` | 65 | 0.022 s |
| usage error | `grim release --repo x skills/demo 127.0.0.1:5088/q3/demo:1.0.3` | `error: unexpected argument '--repo' found` ... `Usage: grim release --repository <URL> <PATH> <REFERENCE>` | **64** | 0.006 s |

The refused `grim update` printed Action `updated` while the files stayed old and `grim status` called the artifact `modified`: a half-applied state shown as success.

### 3. `grim publish` (log C)

`publish.toml` (printed at the top of log C): `registry = "127.0.0.1:5088"`, `version = "2.0.0"`, `[skills.demo]` `path = "skills/demo"`.

| Step | Exact command | Status | Digest (12) | Tags | Exit | Time |
|---|---|---|---|---|---|---|
| dry run | `grim publish --dry-run` | `dry-run` | 40dc07374eeb | 2.0.0,2.0,2,latest | 0 | 0.038 s |
| run 1 | `grim publish` | `pushed` | 40dc07374eeb | 2.0.0,2.0,2,latest | 0 | 0.345 s |
| run 2, same content | `grim publish` | `skipped` | 40dc07374eeb | empty | 0 | 0.024 s |
| content edited (`echo "x" >> skills/demo/SKILL.md`), same version | `grim publish` | `skipped` | 40dc07374eeb (old) | empty | 0 | 0.022 s |
| same state, dry run | `grim publish --dry-run` | `skipped` | 40dc07374eeb | empty | 0 | 0.025 s |
| control | `grim release skills/demo 127.0.0.1:5088/skills/demo:2.0.0` | refusal naming `existing sha256:40dc0737...` and `new sha256:cfba3a2f...` | - | - | 65 | 0.230 s |
| force | `grim publish --force` | `pushed` | cfba3a2f3d60 | 2.0.0,2.0,2,latest | 0 | 0.359 s |

`grim publish --help` (log C, last entry) line 68: `--force` "Move existing exact-version tags that point at a different digest (default: skip entries whose exact-version tag already exists)". The skip is documented, the dry run and the real run agree, and the registry keeps the old content. What is missing is any word in the row that the content differs.

### 4. `ocx` project commands (log D for setup and `--help`, log E for the project, log F for pushes)

| Step | Exact command | Result | Exit | Time |
|---|---|---|---|---|
| help scan | `for c in init add pull update upgrade remove lock; do ocx $c --help \| grep -c -- --dry-run; done` | 0, 0, **2**, 0, 0, 0, 0 | 1 (last `grep -c` is 0) | 0.055 s |
| init 1 / 2 | `ocx init` | `created .../ocx.toml` / `error: ... ocx.toml already exists at ...` | 0 / **64** | 0.029 s / 0.012 s |
| add 1 | `ocx add 127.0.0.1:5088/q3/hi:1` | `pulling count=1`, trust warning, binding table `hi default sha256:6bc84a52...` | 0 | 0.105 s |
| add 2 | same | first line `Unchanged: hi is already added; use ocx update hi to move it`, then the same pull and table | 0 | 0.019 s |
| pull 1 / 2 | `ocx pull` | package table, identical | 0 / 0 | 0.033 s / 0.038 s |
| pull preview | `ocx pull --dry-run` | `127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f0  cached` | 0 | 0.014 s |
| update 1 / 2 | `ocx update` | `1 unchanged tool not shown; re-run with --verbose to list it` | 0 / 0 | 0.046 s / 0.047 s |
| update verbose | `ocx update --verbose` | `hi:1 default linux/amd64 sha256:6bc84a52b3f0 (1.1.0) sha256:6bc84a52b3f0 (1.1.0)` | 0 | 0.046 s |
| upgrade preview, nothing in-major | `ocx upgrade --check` | `1 skipped binding not shown ...`, `hi:1 (default): 2 is available; re-run with --major to move to it` | 0 | 0.027 s |
| upgrade 1 / 2 / verbose | `ocx upgrade` | same hint; verbose shows `hi default 1 skipped: up_to_date` | 0 / 0 / 0 | 0.027 / 0.026 / 0.025 s |
| upgrade preview, would move | `ocx upgrade --check --major` | `hi default 1 2`, `1 tag would move; run ocx upgrade to apply` | **65** | 0.034 s |
| files after the preview | `diff ocx.toml ocx.toml.before && diff ocx.lock ocx.lock.before && echo "files unchanged by --check"` | `files unchanged by --check` | 0 | - |
| upgrade major 1 | `ocx upgrade --major` | pulls, table `hi default 1 2`; `diff ocx.toml.before ocx.toml`: `< hi = "127.0.0.1:5088/q3/hi:1"` `> hi = "127.0.0.1:5088/q3/hi:2"` | 0 | 0.107 s |
| upgrade major 2 | same | `1 skipped binding not shown ...` | 0 | 0.025 s |
| preview after | `ocx upgrade --check --major` | nothing to move | 0 | 0.027 s |
| remove 1 | `ocx remove hi` | stdout is the header line `Binding  Group  Digest` and no row | 0 | 0.052 s |
| remove 2 | same | `error: .../ocx.toml: binding 'hi' not found in ocx.toml` | **79** | 0.013 s |

`ocx upgrade --help` (log D) states: "`--check` writes nothing and exits 65 when a tag would move" and "When nothing would move, neither file is written". Both statements held in the run. `ocx add` is the one fleet mutator that names a no-op (`Unchanged:`). `ocx add` run 1 prints a binding table but no `added` word.

### 5. Registry unreachable, stdin closed (logs G and H)

Setup (log G): in `deadg` and `deado`, `grim add` and `ocx add` against the live registry created locks; copies of the toml and lock went to `deadg-fresh` and `deado-fresh` (the latter with an empty `OCX_HOME`, `$W/home/.ocx-fresh`). Then `docker stop q3r-reg`; `ss -ltn | grep -c ':5088 '` printed `0`. No host name was edited, so the locks stay fresh. Run in log H:

| Command | Output (trimmed to the decisive line) | Exit | Time |
|---|---|---|---|
| `grim install` (fresh dir, nothing installed) | `skill demo .../deadg-fresh/.agents/skills/demo installed` | 0 | 0.084 s |
| `grim install` (already installed) | `unchanged` | 0 | 0.056 s |
| `grim update` | `registry unreachable: ... Connection refused (os error 111)` | 69 | 1.426 s |
| `grim add 127.0.0.1:5088/q3/other:1 --kind skill` | `registry unreachable: ...` | 69 | 1.480 s |
| `grim release skills/demo 127.0.0.1:5088/q3/demo:9.9.9` | `registry operation failed: ... Connection refused (os error 111)` | 69 | 0.022 s |
| `grim publish` | `error: checking whether ... already exists: ...`, status `failed`, digest `-` | 69 | 0.025 s |
| `grim publish --dry-run` | same, status `failed` | 69 | 0.024 s |
| `ocx pull` (empty store) | `transient registry failure: ... Connection refused` | **75** | 0.029 s |
| `ocx pull` (package cached) | pull table | 0 | 0.045 s |
| `ocx pull --dry-run` (cached) | `cached` | 0 | 0.016 s |
| `ocx update` | three `Could not fetch ... chained source` warnings, then `registry unreachable for '127.0.0.1:5088/q3/hi:1'` | 69 | **3.028 s** |
| `ocx upgrade` | `Remote-mode list_tags failed ...`, `transient registry failure` | **75** | 0.025 s |
| `ocx upgrade --check` | same | **75** | 0.024 s |
| `ocx add 127.0.0.1:5088/q3/other:1` | three warnings, `registry unreachable` | 69 | **3.027 s** |

Zero 124 exits in the 14 runs (`grep -c "exit=124" log-dead.txt` printed 0). `grim install` on a fresh directory succeeded with the registry down, so grim resolved the content without the network (apparently its local cache; which store served it was not traced). Wave-1 saw the same split for a refused connection: ocx 75 and grim 69 ([correctable-errors-and-retries.md:41,109](../ux-agent-facing-interfaces/correctable-errors-and-retries.md)). The new data show it inside ocx as well: 69 for `update` and `add`, 75 for `pull` and `upgrade`.

### 6. The `--force` help lines against the refusal text (log I)

| Command | `--force` help line (from `<cmd> --help \| grep -n -B1 -A3 -- "--force"`) |
|---|---|
| `grim update` (line 11) | "Overwrite a locally modified artifact instead of refusing it, and delete a locally modified orphan or dropped-client output instead of preserving it. On a named update it reaches only the named closure" |
| `grim install` (line 35) | "Overwrite a locally modified artifact instead of refusing it" |
| `grim release` (line 41) | "Move an existing exact-version tag that points at a different digest (default: refuse)" |

`grim update --help | grep -n -i -e prune -e reap -e orphan` printed one line, line 11, the `--force` line, which contains "orphan" and neither "prune" nor "reap". The refusal says "also authorizes update's prune and reap deletions". The help and the refusal describe the same deletion with different words, so an agent cannot match them mechanically.

## Effect on the ruleset

Rule text is at [ux-consequential-actions.md:114-136](../ux-consequential-actions.md) (UX-ACT-12 to 17); the Applied rows are at lines 202 to 209 of the same file.

**UX-ACT-12: confirm, evidence added.** `grim install` (exit 65, 0.056 s), `grim update` (65, 0.121 s) and `grim release` (65, 0.235 s) refuse without reading stdin and in under a quarter second; each message ends with `rerun with --force`, none has a `Try:` line. Applied row "12 `Try:`/`Override:` layout" ([ux-consequential-actions.md:204](../ux-consequential-actions.md)) stays "new commitment" and now lists these three. No text change.

**UX-ACT-13: change.** The MUST clause gains: "On a conflict the real run refuses, `--dry-run` refuses the same way with the same exit code." Verify addition: create a conflict (same version, changed content); `<cmd> --dry-run; echo $?` must print the same nonzero code as `<cmd>; echo $?`. Measured: `grim release` real 65, dry run 0, fail. The SHOULD sentence about exit 0 changes to: "A preview exits 0. A preview that signals pending work through its exit code does so only behind a named flag (`--check`, `-detailed-exitcode`) and documents the code in its help." Reason: `ocx upgrade --check` exits 65 when a tag would move; the first-draft rule text said preview exits 0 and had no source, while Terraform's `-detailed-exitcode` is the sourced precedent (0 empty diff, 1 error, 2 changes present; see Dated facts). Verify addition: `<cmd> --help | grep -cE -- '--dry-run|--check'` is at least 1 for every T1+ command. Applied row 13 ([ux-consequential-actions.md:205](../ux-consequential-actions.md)) gains: `grim release --dry-run` violated; `ocx pull --dry-run` and `ocx upgrade --check` satisfied; `ocx add`, `ocx update`, `ocx remove`, `grim add` violated (no preview).

**UX-ACT-15: change.** Add: "A status word that names a change (`added`, `updated`, `pushed`) is printed only for a change made in that run. A run that keeps existing state prints `unchanged` or `kept`. A refused run prints no success word for the work it refused." Verify addition: run each mutator twice; run 2's status column must not contain `added`, `updated` or `pushed`; and when the exit code is nonzero, `grep -c ' updated\| added\| pushed'` on stdout is 0. Violations: `grim add` run 2 (`added`), refused `grim update` (`updated`, exit 65), `grim release` identical repeat (`Pushed true`), `ocx remove` run 1 (header, no row). Passes: `ocx add` run 2 (`Unchanged:`), `ocx update`, `grim install`, `grim uninstall`.

**UX-ACT-16: change.** Insert before the SHOULD sentence: "A same-intent repeat whose content differs from what the registry already holds (same version, different digest) names the difference in its output: the row says `differs` or `different digest`, never only `skipped`. It exits nonzero unless the command documents a skip-existing default; then the row still names the difference." Reason: `grim publish` documents the skip, so exit 0 is a shipped, documented behaviour (SHOULD for shipped, per the rule's own split); the missing text is the gap. Verify: edit the artifact, repeat the command with the same version; require `grep -ci 'differs\|different digest'` at least 1 on stdout or stderr. `grim release` passes (exit 65, both digests); `grim publish` fails (exit 0, `skipped`, old digest). New Applied row: `grim publish` violated, owner decision.

**UX-ACT-17: change (Verify only).** Status settled: change, not confirm. The rule's meaning holds (every `--force` here overrides a refusal), but measured evidence shows its Verify cannot catch a refusal that describes `--force` with other words than the help. Append to Verify: "For every refusal message that says what `--force` also authorizes, each effect word after 'authorizes' appears in that command's `--force` help line: `<cmd> --help | grep -ci '<word>'` is at least 1 for each." Measured: `grim update` refusal says "prune and reap deletions"; `grim update --help | grep -ci 'prune\|reap'` would print 0 (the help says "delete a locally modified orphan or dropped-client output"), so the check fails today. Severity of the addition: SHOULD; the base rule stays MUST. Applied row 17 ([ux-consequential-actions.md:209](../ux-consequential-actions.md)) stays satisfied for the meaning of `--force`, with a note: wording mismatch on `grim update`.

**UX-ACT-21: confirm.** Three hints end in "rerun with --force". Following them overwrites local edits (`install`, `update`) or moves a published tag (`release`). A dry-run first step exists only for `release` (and it skips the conflict check), so the `--help` fallback clause carries `install` and `update`. No text change.

**Verdict 8: confirm.** Network mutators given an identical request succeed (`grim release`, `add`, `install`, `update`, `publish`; `ocx add`, `pull`, `update`, `upgrade`). Recorded exceptions: `ocx init` 64, `ocx remove` 79.

**NEW UX-ACT-29 (SHOULD).** *A network command whose registry refuses the connection exits within 10 seconds with one exit code per cause, never reads stdin, and is documented in the CLI's pinned table.* Rationale: measured in section 5, 14 runs, none hung, slowest 3.028 s, but one cause gives 69 on seven commands and 75 on two ocx commands, so a retrying agent behaves differently per command. Exit classes belong to the UX-AGENT family and CLI-04 ([skills/rust-quality-reference/cli-contract.md:126](../../../skills/rust-quality-reference/cli-contract.md), git date 2026-11-19); this rule only requires that the classes agree within one CLI and that failure is bounded. Verify: with nothing listening on the target port, for every network command of the CLI run `timeout 10 setsid -w <cmd> 0<&- >/dev/null 2>&1; echo $?` and collect the codes. Pass: no code is 124, and the set of distinct nonzero codes has size 1. Fail today: ocx gives {69, 75}. Shipped exit codes are public contract, so for ocx this is a report-only warning until the owner decides (same split as UX-ACT-16). Limit: only connection-refused was measured; a server that accepts and stalls is a different case, which wave-1 observed as a 100 s hang with no deadline ([correctable-errors-and-retries.md:113](../ux-agent-facing-interfaces/correctable-errors-and-retries.md)).

## Dated facts

- All measurements 2026-11-27 on grim 0.16.0 and ocx 0.6.8, Linux, `registry:2` container `q3r-reg` (127.0.0.1:5088), throwaway HOME. Exit codes measured: grim 0, 64, 65, 69; ocx 0, 64, 65, 69, 75, 79.
- Terraform CLI v1.17.x `plan`, fetched 2026-11-27, no page date, vendor docs ([developer.hashicorp.com/terraform/cli/commands/plan](https://developer.hashicorp.com/terraform/cli/commands/plan)): "`-detailed-exitcode` ... Returns a detailed exit code when the command exits. ... 0 = Succeeded with empty diff (no changes); 1 = Error; 2 = Succeeded with non-empty diff (changes present)". This is the precedent for `ocx upgrade --check` exiting nonzero on pending work, behind a flag.
- Wave-1 references used (all in this tree): CLI-04 in `skills/rust-quality-reference/cli-contract.md:126` (git date 2026-11-19); Applied rows 13, 16, 17 in `ux-consequential-actions.md:205,208,209` (date_researched 2026-11-27); the error dive in `ux-agent-facing-interfaces/correctable-errors-and-retries.md` (date_researched 2026-11-27), lines 41, 109, 113, 116.

## What could not be determined

- Behaviour with a real TTY prompt: no pty harness. No command prompted with stdin closed, so none is known to have a prompt path.
- Whether `grim install` served from a local cache or another source when the registry was down: not traced (no network capture).
- A registry that accepts the connection and stalls, or returns 429/503, for these eight commands: not run here (wave-1 covered `describe` and `package inspect`).
- `grim publish --announce` and `--push-registry`: not run, because they post to a forge, which the hard limits forbid.
- Authenticated registries, `login`, token refresh and 401 handling: no credential used.
- Left over from the first pass of this task (outside this pass's control): three repositories (`q3/demo`, `q3/hi`, `skills/demo`) pushed to another session's `vsc-live-reg` registry on 127.0.0.1:5077. Needs a human to decide whether to delete them; registry:2 delete support was not checked. This pass created nothing there.

## Appendix: raw logs

Each entry: label, exact command, exit code, wall time, full output. Home paths shortened to `$W`.

### Log A grim release (`log-grim.txt`)

```
### init
$ grim init
exit=0 elapsed=0.025s
Path                                                                                    Scope    Status
$W/work/proj/grimoire.toml  project  created

### config registry add
$ grim config registry add local --oci 127.0.0.1:5088 --insecure --default
exit=0 elapsed=0.025s
Action          Key             Value           Scope    Dry Run
registry-added  registry.local  127.0.0.1:5088  project  false

### r1 release 1.0.0
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.422s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:b890c5a23f02b1a84089f298b4a069779709852745255f7e16434964574b2232  1.0.0,1.0,1,latest  true

### r2 release 1.0.0 identical
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.332s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:b890c5a23f02b1a84089f298b4a069779709852745255f7e16434964574b2232  1.0.0,1.0,1,latest  true

### r3 release 1.0.0 content edited
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=65 elapsed=0.235s
127.0.0.1:5088/q3/demo: version tag '1.0.0' already exists at a different digest (existing sha256:b890c5a23f02b1a84089f298b4a069779709852745255f7e16434964574b2232, new sha256:ed5883ab09dd1f3cf4643f58ba198cacab63783712384d97195daadbb0577691); rerun with --force to move it

### r3 --dry-run
$ grim release --dry-run skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.030s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:ed5883ab09dd1f3cf4643f58ba198cacab63783712384d97195daadbb0577691  1.0.0,1.0,1,latest  false

### r3 --skip-existing
$ grim release --skip-existing skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.023s
Ref                           Manifest Digest                                                          Tags  Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:b890c5a23f02b1a84089f298b4a069779709852745255f7e16434964574b2232        false

### r3 --force
$ grim release --force skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.342s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:ed5883ab09dd1f3cf4643f58ba198cacab63783712384d97195daadbb0577691  1.0.0,1.0,1,latest  true

### r3 --force again
$ grim release --force skills/demo 127.0.0.1:5088/q3/demo:1.0.0
exit=0 elapsed=0.324s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.0  sha256:ed5883ab09dd1f3cf4643f58ba198cacab63783712384d97195daadbb0577691  1.0.0,1.0,1,latest  true

### new version 1.0.1
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.1
exit=0 elapsed=0.371s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.1  sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1  1.0.1,1.0,1,latest  true

### new version 1.0.1 again
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.1
exit=0 elapsed=0.344s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.1  sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1  1.0.1,1.0,1,latest  true

### tags
{"name":"q3/demo","tags":["1.0.1","latest","1.0","1","1.0.0"]}

```

### Log B grim add/install/update/uninstall (`log-grim2.txt`)

```
### help dry-run counts
$ bash -c for c in add install update uninstall release publish; do printf "grim $c --dry-run lines: "; grim $c --help | grep -c -- --dry-run; done
exit=0 elapsed=0.028s
grim add --dry-run lines: 0
grim install --dry-run lines: 0
grim update --dry-run lines: 0
grim uninstall --dry-run lines: 0
grim release --dry-run lines: 1
grim publish --dry-run lines: 2

### add run 1
$ grim add 127.0.0.1:5088/q3/demo:1 --name demo
exit=0 elapsed=0.145s
2026-11-27T13:17:41.106087Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Pinned                                                                                          Status
skill  demo  127.0.0.1:5088/q3/demo@sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1  added

### add run 2
$ grim add 127.0.0.1:5088/q3/demo:1 --name demo
exit=0 elapsed=0.087s
2026-11-27T13:17:41.223077Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
2026-11-27T13:17:41.256133Z  WARN grim::command::add: kept the existing pin of skill 'demo'. `grim update -- demo` moves it to what its tag names now, or says why it cannot. Declare a reference that exists if that tag is gone
Kind   Name  Pinned                                                                                          Status
skill  demo  127.0.0.1:5088/q3/demo@sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1  added

### install run 1
$ grim install
exit=0 elapsed=0.052s
clients: agents (fallback)
2026-11-27T13:17:41.278570Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Target                                                                                        Status
skill  demo  $W/work/proj/.agents/skills/demo  unchanged

### install run 2
$ grim install
exit=0 elapsed=0.053s
clients: agents (fallback)
2026-11-27T13:17:41.337262Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Target                                                                                        Status
skill  demo  $W/work/proj/.agents/skills/demo  unchanged

### install with local edit
$ grim install
exit=65 elapsed=0.056s
clients: agents (fallback)
2026-11-27T13:17:41.394994Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
skill 'demo' (127.0.0.1:5088/q3/demo@sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1): installed artifact was modified locally: recorded sha256:bc20e68f8eb15a491a27d5a2ba714e99fb761e276afdd37601fa11974019ffeb, found sha256:3b1d58a56621b2dabc179313118bd22770682f2619fdba51974cd29349f7ed46; rerun with --force to overwrite

rule = []
agent = []

[metadata]
lock_version = 1
declaration_hash_version = 1
declaration_hash = "sha256:1811cc48304f1059d762ade0e3b55ba4ab53796cad497b59e0694b4519fe274e"
generated_by = "grim 0.16.0"
generated_at = "2026-11-27T13:17:41Z"

[[skill]]
name = "demo"
pinned = "127.0.0.1:5088/q3/demo:1@sha256:243d6c1fb7c74135cd85034e2f5f92b768998167b67e8cdea99c4ef008b6deb1"
### release 1.0.2 (moves tag 1)
$ grim release skills/demo 127.0.0.1:5088/q3/demo:1.0.2
exit=0 elapsed=0.327s
Ref                           Manifest Digest                                                          Tags                Pushed
127.0.0.1:5088/q3/demo:1.0.2  sha256:d7ef5138b1b9757c3b4ba53862e90f10047bf24ca96256ffb017b31ac3bb759c  1.0.2,1.0,1,latest  true

### update with local edit present
$ grim update
exit=65 elapsed=0.121s
2026-11-27T13:17:41.887989Z ERROR grim::command::update: Update refused a locally modified artifact; rerunning with --force overwrites it and also authorizes update's prune and reap deletions: skill 'demo' (127.0.0.1:5088/q3/demo:1@sha256:d7ef5138b1b9757c3b4ba53862e90f10047bf24ca96256ffb017b31ac3bb759c): installed artifact was modified locally: recorded sha256:bc20e68f8eb15a491a27d5a2ba714e99fb761e276afdd37601fa11974019ffeb, found sha256:3b1d58a56621b2dabc179313118bd22770682f2619fdba51974cd29349f7ed46; rerun with --force to overwrite
Kind   Name  Old                  New                  Action
skill  demo  sha256:243d6c1fb7c7  sha256:d7ef5138b1b9  updated

--- lock after refused update
7:declaration_hash = "sha256:1811cc48304f1059d762ade0e3b55ba4ab53796cad497b59e0694b4519fe274e"
13:pinned = "127.0.0.1:5088/q3/demo:1@sha256:d7ef5138b1b9757c3b4ba53862e90f10047bf24ca96256ffb017b31ac3bb759c"
### status after refused update
$ grim status
exit=0 elapsed=0.021s
2026-11-27T13:17:41.918344Z  WARN grim::command::status: adopted 0 artifacts into the install record; 1 left unproven
Kind   Name  Source  Pinned                                                                                          State
skill  demo  direct  127.0.0.1:5088/q3/demo@sha256:d7ef5138b1b9757c3b4ba53862e90f10047bf24ca96256ffb017b31ac3bb759c  modified
clients: agents (fallback)

### update --force
$ grim update --force
exit=0 elapsed=0.131s
Kind   Name  Old                  New                  Action
skill  demo  sha256:d7ef5138b1b9  sha256:d7ef5138b1b9  restored

### update again
$ grim update
exit=0 elapsed=0.109s
Kind   Name  Old                  New                  Action
skill  demo  sha256:d7ef5138b1b9  sha256:d7ef5138b1b9  unchanged

### install --force over an edit
$ bash -c echo edit2 >> .agents/skills/demo/SKILL.md; grim install --force
exit=0 elapsed=0.094s
clients: agents (fallback)
2026-11-27T13:17:42.192487Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Target                                                                                        Status
skill  demo  $W/work/proj/.agents/skills/demo  updated

### uninstall run 1
$ grim uninstall skill demo
exit=0 elapsed=0.127s
Kind   Name  Status
skill  demo  uninstalled

### uninstall run 2
$ grim uninstall skill demo
exit=0 elapsed=0.046s
Kind   Name  Status
skill  demo  not-installed

### add kind not inferable
$ grim add 127.0.0.1:5088/q3/nosuch:1
exit=65 elapsed=0.022s
could not infer the kind of '127.0.0.1:5088/q3/nosuch:1'; pass --kind skill|rule|agent|bundle|mcp|hook|settings

### usage error (exit 64 probe)
$ grim release --repo x skills/demo 127.0.0.1:5088/q3/demo:1.0.3
exit=64 elapsed=0.006s
error: unexpected argument '--repo' found

  tip: a similar argument exists: '--repository'

Usage: grim release --repository <URL> <PATH> <REFERENCE>

For more information, try '--help'.

```

### Log C grim publish (`log-publish.txt`)

```
registry = "127.0.0.1:5088"
version = "2.0.0"

[skills.demo]
path = "skills/demo"

### publish --dry-run
$ grim publish --dry-run
exit=0 elapsed=0.038s
Kind   Ref                               Digest               Tags                Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:40dc07374eeb  2.0.0,2.0,2,latest  dry-run

### publish run 1
$ grim publish
exit=0 elapsed=0.345s
Kind   Ref                               Digest               Tags                Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:40dc07374eeb  2.0.0,2.0,2,latest  pushed

### publish run 2 same content
$ grim publish
exit=0 elapsed=0.024s
Kind   Ref                               Digest               Tags  Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:40dc07374eeb        skipped

### publish content edited, same version
$ grim publish
exit=0 elapsed=0.022s
Kind   Ref                               Digest               Tags  Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:40dc07374eeb        skipped

### publish --dry-run, content edited same version
$ grim publish --dry-run
exit=0 elapsed=0.025s
Kind   Ref                               Digest               Tags  Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:40dc07374eeb        skipped

### release same version, content edited (control)
$ grim release skills/demo 127.0.0.1:5088/skills/demo:2.0.0
exit=65 elapsed=0.230s
127.0.0.1:5088/skills/demo: version tag '2.0.0' already exists at a different digest (existing sha256:40dc07374eeb329fa3f8322febcf14b21ebfdb7e2e48e2ab53f80b73c73111ac, new sha256:cfba3a2f3d60338458c920b4501ac8356e7e73e882a94ed49d935ddf1b24bb64); rerun with --force to move it

### publish --force
$ grim publish --force
exit=0 elapsed=0.359s
Kind   Ref                               Digest               Tags                Status
skill  127.0.0.1:5088/skills/demo:2.0.0  sha256:cfba3a2f3d60  2.0.0,2.0,2,latest  pushed

### registry tags
{"name":"skills/demo","tags":["2","latest","2.0.0","2.0"]}

### publish --help dry-run/force lines
$ bash -c grim publish --help | grep -n -B1 -A2 -e --dry-run -e --force
exit=0 elapsed=0.009s
43-      --version <VERSION>
44:          The version to publish this run. A semver value (e.g. `v1.2.3`) overrides the manifest's top-level `version` — entries with their own `version` keep it — and each entry cascades (see `--cascade`). A non-semver value (e.g. `canary`, `edge`) is a movable channel tag applied to *every* entry uniformly, with no cascade — the batch equivalent of a channel release. The manifest `version_prefix` (default `v`) is stripped first, so `--version v1.2.3` publishes tag `1.2.3`. Like every publish, a channel tag skips-existing by default and needs `--force` to move
45-
46-      --offline
--
63-
64:      --dry-run
65-          Print the push plan without pushing anything
66-
67:      --force
68-          Move existing exact-version tags that point at a different digest (default: skip entries whose exact-version tag already exists)
69-
--
100-      --announce
101:          After a fully successful publish, announce the published packages to a package-index git repository: write metadata pointers on a topic branch, push, and open the pull/merge request via the forge API (GitHub/GitLab, enterprise instances included) — or via git push options on a token-less GitLab host, or leave the pushed branch on a plain git host. No-op under `--dry-run`
102-
103-      --announce-repo <REPO_URL>

```

### Log D ocx help scan and package setup (`log-ocx.txt`)

```
### help dry-run counts
$ bash -c for c in init add pull update upgrade remove lock; do printf "ocx $c --dry-run lines: "; ocx $c --help | grep -c -- --dry-run; done
exit=1 elapsed=0.055s
ocx init --dry-run lines: 0
ocx add --dry-run lines: 0
ocx pull --dry-run lines: 2
ocx update --dry-run lines: 0
ocx upgrade --dry-run lines: 0
ocx remove --dry-run lines: 0
ocx lock --dry-run lines: 0

### upgrade --help (full)
$ ocx upgrade --help
exit=0 elapsed=0.010s
Move declared tags in ocx.toml to the newest published release.

`ocx update` moves the lock to where a tag points now; `ocx upgrade` moves the tag itself. A binding keeps its variant and precision and stays within its major: `cmake:3.28` moves to `cmake:3.29`, and `cmake:3` has nothing to move to until `--major` lets it cross to `cmake:4`.

A newer major is listed as a hint either way. A binding that cannot move is left alone and reported with one reason: `digest_pinned`, `latest`, `not_a_version`, `prerelease_or_build` or `up_to_date`.

The retagged bindings are then re-locked and the project toolchain re-rendered, as `ocx update` does.

Without `-g` only the default group is considered; `-g ci` selects a group and `-g all` every group. Binding names narrow the selection. `--check` writes nothing and exits 65 when a tag would move.

Needs an existing `ocx.lock` (exit 78), refuses a drifted `ocx.toml` (exit 65), rejects an unknown group or name (exit 64), and is refused under `--frozen` or `--offline` (exit 81).

Each binding keeps its variant: a `debug-3.28` binding considers only `debug-*` tags, and the new tag must be strictly newer than the declared one. A binding that cannot move is a report row with its reason, never an error.

Comments and formatting in `ocx.toml` survive the edit. Tag listings come from the registry every time and never touch the local index. Only the retagged bindings are re-resolved and every other pin carries forward. When nothing would move, neither file is written.

After writing, the new pins are materialized for the host platform, as `ocx update` does.

Usage: ocx upgrade [OPTIONS] [NAMES]...

Arguments:
  [NAMES]...
          Binding names to upgrade; leave every other binding as declared.
          
          Each name is the `ocx.toml` binding key and is upgraded in the default group, or in every group `-g` names (`-g all` for every group). An unknown name exits 64.

Options:
      --check
          Report the tags that would move and exit without writing.
          
          Exits 0 when every selected binding is up to date and 65 (`DataError`) when at least one would move. `ocx.toml` and `ocx.lock` are left untouched either way.

      --major
          Allow a tag to move to a newer major version.
          
          Without it a binding stays within its current major (`cmake:3.28` moves to `3.29`, never to `4.0`), and a newer major is listed for information only.

  -v, --verbose
          List the bindings that were left alone as well as the ones that moved.
          
          Affects the plain rendering only. The structured report (`ocx --format json upgrade`) carries every field either way.

  -g, --group <GROUPS>
          Upgrade every binding in the named group(s); leave the rest.
          
          Repeatable and comma-separated: `-g ci,lint -g release`. The reserved name `default` selects the top-level `[tools]` table; `all` expands to `default` plus every declared `[group.*]`. Combine with binding names to upgrade only those bindings within the named groups. When omitted, scope is exactly the default group.

      --purge
          Also delete each package this command unlinks, when nothing else references it

      --no-purge
          Leave unlinked packages on disk for `ocx clean`. The default

  -h, --help
          Print help (see a summary with '-h')

### package create 1.0.0
$ ocx package create pkg -i 127.0.0.1:5088/q3/hi:1.0.0 -p linux/amd64 -m meta.json -o hi.tar.gz
exit=0 elapsed=0.017s
Creating package bundle from pkg with compression level Default
Created package bundle from pkg at hi.tar.gz

### package push 1.0.0 cascade
$ ocx package push -i 127.0.0.1:5088/q3/hi:1.0.0 -p linux/amd64 -m meta.json --cascade hi.tar.gz
exit=0 elapsed=0.475s
deploying package with 1 layer(s) and metadata meta.json
staging package 127.0.0.1:5088/q3/hi:1.0.0 (platform linux/amd64)
publishing package 127.0.0.1:5088/q3/hi:1.0.0 (cascade, platform linux/amd64)
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1.0.0'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1.0'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:latest'.
Identifier                  Digest                                                                   Tags          Keep Tags  Layers                         
127.0.0.1:5088/q3/hi:1.0.0  sha256:d8d07638fa5289161f6f45dbac27759d075a8944654b82ce79d6ee7c47dba4bb  1.0,1,latest  1          mounted=0,uploaded=1,verified=0

```

### Log F ocx package pushes (`log-ocx2.txt`)

```
### package create+push 1.1.0
$ bash -c ocx package create pkg -i 127.0.0.1:5088/q3/hi:1.1.0 -p linux/amd64 -m meta.json -o hi11.tar.gz && ocx package push -i 127.0.0.1:5088/q3/hi:1.1.0 -p linux/amd64 -m meta.json --cascade hi11.tar.gz
exit=0 elapsed=0.388s
Creating package bundle from pkg with compression level Default
Created package bundle from pkg at hi11.tar.gz
deploying package with 1 layer(s) and metadata meta.json
staging package 127.0.0.1:5088/q3/hi:1.1.0 (platform linux/amd64)
publishing package 127.0.0.1:5088/q3/hi:1.1.0 (cascade, platform linux/amd64)
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1.1.0'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1.1'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:1'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:latest'.
Identifier                  Digest                                                                   Tags          Keep Tags  Layers                         
127.0.0.1:5088/q3/hi:1.1.0  sha256:101eecec6dde61394c7b2ed1e6699e7ff812323b9e0df0cf22e7a85c0675847e  1.1,1,latest  1          mounted=0,uploaded=1,verified=0

### package create+push 2.0.0
$ bash -c echo v2 >> pkg/bin/hi; ocx package create pkg -i 127.0.0.1:5088/q3/hi:2.0.0 -p linux/amd64 -m meta.json -o hi2.tar.gz && ocx package push -i 127.0.0.1:5088/q3/hi:2.0.0 -p linux/amd64 -m meta.json --cascade hi2.tar.gz
exit=0 elapsed=0.407s
Creating package bundle from pkg with compression level Default
Created package bundle from pkg at hi2.tar.gz
deploying package with 1 layer(s) and metadata meta.json
staging package 127.0.0.1:5088/q3/hi:2.0.0 (platform linux/amd64)
publishing package 127.0.0.1:5088/q3/hi:2.0.0 (cascade, platform linux/amd64)
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:2.0.0'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:2.0'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:2'.
Refreshing tags for identifier '127.0.0.1:5088/q3/hi:latest'.
Identifier                  Digest                                                                   Tags          Keep Tags  Layers                         
127.0.0.1:5088/q3/hi:2.0.0  sha256:5cd7b467d888e3f701e4cd66af14b4e99d82bcbe7099c709de868826018ba9f7  2.0,2,latest  1          mounted=0,uploaded=1,verified=0

### tags
{"name":"q3/hi","tags":["2","__ocx.keep.sha256-d9e2faba3c71324db6e8376763119ee191d7cc9f827be5ffe48fc1537b6b66a1","1.1.0","__ocx.keep.sha256-6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541","latest","1.0","2.0.0","1","1.0.0","1.1","2.0","__ocx.keep.sha256-4b0cb8a2ef90b8b67888f4f7a05d52ace36ce1926769353ba4d0f73457d24a07"]}

```

### Log E ocx project commands (`log-ocx3.txt`)

```
### pull --help dry-run lines
$ bash -c ocx pull --help | grep -n -B1 -A3 -- --dry-run
exit=0 elapsed=0.011s
4-
5:This is the primary way a project toolchain is rendered; `--dry-run` reports the delta and writes nothing.
6-
7-The package store's own `candidate` and `current` symlinks are left alone: those move only when you install or select a package.
8-
--
19-Options:
20:      --dry-run
21-          Preview which locked packages are cached vs. would be fetched.
22-          
23-          Walks `ocx.lock`, resolves each entry through the local index (cache-first), and checks the store for the resolved digest. No store writes; the only network surface is the cache-miss path of resolve, which lock has typically already populated. Combine with `--offline` to forbid any network probe. Honors `--format json` and `--quiet`. The staleness gate still fires: a stale lock exits 65 before the dry-run preview prints.

### init run 1
$ ocx init
exit=0 elapsed=0.029s
created $W/work/ocxp/proj/ocx.toml

### init run 2
$ ocx init
exit=64 elapsed=0.012s
error: $W/work/ocxp/proj/ocx.toml: ocx.toml already exists at '$W/work/ocxp/proj/ocx.toml'

### add run 1
$ ocx add 127.0.0.1:5088/q3/hi:1
exit=0 elapsed=0.105s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Downloading layer sha256:8f4cb165505e to $W/home/.ocx/temp/4a1e393842d653502134e257b5269b7b
Binding  Group    Digest                                                                 
hi       default  sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541

### add run 2
$ ocx add 127.0.0.1:5088/q3/hi:1
exit=0 elapsed=0.019s
Unchanged: hi is already added; use `ocx update hi` to move it
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Binding  Group    Digest                                                                 
hi       default  sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541

--- ocx.toml
#:schema https://ocx.sh/schemas/project/v1.json
# OCX project toolchain — managed by `ocx add` / `ocx remove`

[tools]
hi = "127.0.0.1:5088/q3/hi:1"
### pull run 1
$ ocx pull
exit=0 elapsed=0.033s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Package                                                                                       Kind     Path                                                                                                                                     
127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541  package  $W/home/.ocx/packages/127.0.0.1_5088/sha256/6b/c84a52b3f014c5649698080303e125

### pull run 2
$ ocx pull
exit=0 elapsed=0.038s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Package                                                                                       Kind     Path                                                                                                                                     
127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541  package  $W/home/.ocx/packages/127.0.0.1_5088/sha256/6b/c84a52b3f014c5649698080303e125

### pull --dry-run
$ ocx pull --dry-run
exit=0 elapsed=0.014s
Package                                   Status
127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f0  cached

### update run 1
$ ocx update
exit=0 elapsed=0.046s
1 unchanged tool not shown; re-run with --verbose to list it

### update run 2
$ ocx update
exit=0 elapsed=0.047s
1 unchanged tool not shown; re-run with --verbose to list it

### update --verbose
$ ocx update --verbose
exit=0 elapsed=0.046s
Binding  Group    Platform     From                         To                         
hi:1     default  linux/amd64  sha256:6bc84a52b3f0 (1.1.0)  sha256:6bc84a52b3f0 (1.1.0)

### upgrade --check (before)
$ ocx upgrade --check
exit=0 elapsed=0.027s
Binding  Group  From  To
1 skipped binding not shown; re-run with --verbose to list them with the reason
hi:1 (default): 2 is available; re-run with --major to move to it

### upgrade run 1
$ ocx upgrade
exit=0 elapsed=0.027s
Binding  Group  From  To
1 skipped binding not shown; re-run with --verbose to list them with the reason
hi:1 (default): 2 is available; re-run with --major to move to it

### upgrade run 2
$ ocx upgrade
exit=0 elapsed=0.026s
Binding  Group  From  To
1 skipped binding not shown; re-run with --verbose to list them with the reason
hi:1 (default): 2 is available; re-run with --major to move to it

### upgrade --verbose
$ ocx upgrade --verbose
exit=0 elapsed=0.025s
Binding  Group    From  To                 
hi       default  1     skipped: up_to_date
hi:1 (default): 2 is available; re-run with --major to move to it

### upgrade --check --major (would move)
$ ocx upgrade --check --major
exit=65 elapsed=0.034s
Binding  Group    From  To
hi       default  1     2 
1 tag would move; run `ocx upgrade` to apply

--- diff after --check
files unchanged by --check
### upgrade --major run 1
$ ocx upgrade --major
exit=0 elapsed=0.107s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:2@sha256:4b0cb8a2ef90b8b67888f4f7a05d52ace36ce1926769353ba4d0f73457d24a07' without signature verification
Downloading layer sha256:2f0a6195ed0d to $W/home/.ocx/temp/9f2ace4b2649eddf8e2fe418ec668e28
Binding  Group    From  To
hi       default  1     2 

--- diff ocx.toml.before ocx.toml
5c5
< hi = "127.0.0.1:5088/q3/hi:1"
---
> hi = "127.0.0.1:5088/q3/hi:2"
### upgrade --major run 2
$ ocx upgrade --major
exit=0 elapsed=0.025s
Binding  Group  From  To
1 skipped binding not shown; re-run with --verbose to list them with the reason

### upgrade --check --major (after, nothing to move)
$ ocx upgrade --check --major
exit=0 elapsed=0.027s
Binding  Group  From  To
1 skipped binding not shown; re-run with --verbose to list them with the reason

### remove run 1
$ ocx remove hi
exit=0 elapsed=0.052s
Binding  Group  Digest

### remove run 2
$ ocx remove hi
exit=79 elapsed=0.013s
error: $W/work/ocxp/proj/ocx.toml: binding 'hi' not found in ocx.toml

--- ocx.toml after remove
#:schema https://ocx.sh/schemas/project/v1.json
# OCX project toolchain — managed by `ocx add` / `ocx remove`

[tools]
```

### Log G dead-registry setup (`log-dead-setup.txt`)

```
### setup grim init
$ grim init
exit=0 elapsed=0.032s
Path                                                                                     Scope    Status
$W/work/deadg/grimoire.toml  project  created

### setup grim registry add
$ grim config registry add local --oci 127.0.0.1:5088 --insecure --default
exit=0 elapsed=0.027s
Action          Key             Value           Scope    Dry Run
registry-added  registry.local  127.0.0.1:5088  project  false

### setup grim add
$ grim add 127.0.0.1:5088/q3/demo:1 --name demo
exit=0 elapsed=0.149s
2026-11-27T13:18:15.394500Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Pinned                                                                                          Status
skill  demo  127.0.0.1:5088/q3/demo@sha256:d7ef5138b1b9757c3b4ba53862e90f10047bf24ca96256ffb017b31ac3bb759c  added

### setup ocx init
$ ocx init
exit=0 elapsed=0.034s
created $W/work/deado/ocx.toml

### setup ocx add
$ ocx add 127.0.0.1:5088/q3/hi:1
exit=0 elapsed=0.051s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Binding  Group    Digest                                                                 
hi       default  sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541

```

### Log H dead registry runs (`log-dead.txt`)

```
listeners on 127.0.0.1:5088: 0

### grim install (fresh, nothing installed)
$ grim install
exit=0 elapsed=0.084s
clients: agents (fallback)
2026-11-27T13:18:26.440300Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Target                                                                                               Status
skill  demo  $W/work/deadg-fresh/.agents/skills/demo  installed

### grim install (already installed)
$ grim install
exit=0 elapsed=0.056s
clients: agents (fallback)
2026-11-27T13:18:26.528011Z  WARN grim::install::installer: no AI client detected; installing into the cross-vendor `.agents/skills` pool, which Claude Code and most other clients do not read — select a client with --client or `[options].clients`
Kind   Name  Target                                                                                         Status
skill  demo  $W/work/deadg/.agents/skills/demo  unchanged

### grim update
$ grim update
exit=69 elapsed=1.426s
skill 'demo' (127.0.0.1:5088/q3/demo:1): registry unreachable: 127.0.0.1:5088/q3/demo:1: registry operation failed: error sending request for url (http://127.0.0.1:5088/v2/q3/demo/manifests/1): client error (Connect): tcp connect error: Connection refused (os error 111)

### grim add new ref
$ grim add 127.0.0.1:5088/q3/other:1 --kind skill
exit=69 elapsed=1.480s
skill 'other' (127.0.0.1:5088/q3/other:1): registry unreachable: 127.0.0.1:5088/q3/other:1: registry operation failed: error sending request for url (http://127.0.0.1:5088/v2/q3/other/manifests/1): client error (Connect): tcp connect error: Connection refused (os error 111)

### grim release
$ grim release skills/demo 127.0.0.1:5088/q3/demo:9.9.9
exit=69 elapsed=0.022s
127.0.0.1:5088/q3/demo: registry operation failed: error sending request for url (http://127.0.0.1:5088/v2/q3/demo/blobs/uploads/): client error (Connect): tcp connect error: Connection refused (os error 111)

### grim publish
$ grim publish
exit=69 elapsed=0.025s
error: checking whether 127.0.0.1:5088/skills/demo:2.0.0 already exists: 127.0.0.1:5088/skills/demo:2.0.0: registry operation failed: error sending request for url (http://127.0.0.1:5088/v2/skills/demo/manifests/2.0.0): client error (Connect): tcp connect error: Connection refused (os error 111)
Kind   Ref                               Digest  Tags  Status
skill  127.0.0.1:5088/skills/demo:2.0.0  -             failed

### grim publish --dry-run
$ grim publish --dry-run
exit=69 elapsed=0.024s
error: checking whether 127.0.0.1:5088/skills/demo:2.0.0 already exists: 127.0.0.1:5088/skills/demo:2.0.0: registry operation failed: error sending request for url (http://127.0.0.1:5088/v2/skills/demo/manifests/2.0.0): client error (Connect): tcp connect error: Connection refused (os error 111)
Kind   Ref                               Digest  Tags  Status
skill  127.0.0.1:5088/skills/demo:2.0.0  -             failed

### ocx pull (empty store)
$ ocx pull
exit=75 elapsed=0.029s
pulling count=1
warning: Could not fetch '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
error: failed to install package: 127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541 — chained index source walk failed: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): client error (Connect): tcp connect error: Connection refused (os error 111)

### ocx pull (package cached)
$ ocx pull
exit=0 elapsed=0.045s
pulling count=1
no trust policy covers '127.0.0.1:5088/q3/hi'; installing '127.0.0.1:5088/q3/hi:1@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541' without signature verification
Package                                                                                       Kind     Path                                                                                                                                     
127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f014c5649698080303e1251912f6e60dd69bdb530fd2f1f3922541  package  $W/home/.ocx/packages/127.0.0.1_5088/sha256/6b/c84a52b3f014c5649698080303e125

### ocx pull --dry-run (package cached)
$ ocx pull --dry-run
exit=0 elapsed=0.016s
Package                                   Status
127.0.0.1:5088/q3/hi@sha256:6bc84a52b3f0  cached

### ocx update
$ ocx update
exit=69 elapsed=3.028s
warning: Could not fetch '127.0.0.1:5088/q3/hi:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
warning: Could not fetch '127.0.0.1:5088/q3/hi:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
warning: Could not fetch '127.0.0.1:5088/q3/hi:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
error: registry unreachable for '127.0.0.1:5088/q3/hi:1': chained index source walk failed: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): error sending request for url (http://127.0.0.1:5088/v2/): client error (Connect): tcp connect error: Connection refused (os error 111)

### ocx upgrade
$ ocx upgrade
exit=75 elapsed=0.025s
warning: Remote-mode list_tags failed for '127.0.0.1:5088/q3/hi:1': transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
error: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): error sending request for url (http://127.0.0.1:5088/v2/): client error (Connect): tcp connect error: Connection refused (os error 111)

### ocx upgrade --check
$ ocx upgrade --check
exit=75 elapsed=0.024s
warning: Remote-mode list_tags failed for '127.0.0.1:5088/q3/hi:1': transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
error: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): error sending request for url (http://127.0.0.1:5088/v2/): client error (Connect): tcp connect error: Connection refused (os error 111)

### ocx add new ref
$ ocx add 127.0.0.1:5088/q3/other:1
exit=69 elapsed=3.027s
warning: Could not fetch '127.0.0.1:5088/q3/other:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
warning: Could not fetch '127.0.0.1:5088/q3/other:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
warning: Could not fetch '127.0.0.1:5088/q3/other:1' from chained source: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/)
error: registry unreachable for '127.0.0.1:5088/q3/other:1': chained index source walk failed: transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): transient registry failure: error sending request for url (http://127.0.0.1:5088/v2/): error sending request for url (http://127.0.0.1:5088/v2/): client error (Connect): tcp connect error: Connection refused (os error 111)

```

### Log I force help lines (`log-force.txt`)

```
### grim update --help force
$ bash -c grim update --help | grep -n -B1 -A3 -- "--force"
exit=0 elapsed=0.009s
9-Options:
10:      --force
11-          Overwrite a locally modified artifact instead of refusing it, and delete a locally modified orphan or dropped-client output instead of preserving it. On a named update it reaches only the named closure
12-
13-      --format <FORMAT>

### grim install --help force
$ bash -c grim install --help | grep -n -B1 -A3 -- "--force"
exit=0 elapsed=0.008s
33-
34:      --force
35-          Overwrite a locally modified artifact instead of refusing it
36-
37-      --client <CLIENT>

### grim release --help force
$ bash -c grim release --help | grep -n -B1 -A3 -- "--force"
exit=0 elapsed=0.008s
39-
40:      --force
41-          Move an existing exact-version tag that points at a different digest (default: refuse)
42-
43-      --progress <PROGRESS>

### prune/reap in grim update help
$ bash -c grim update --help | grep -n -i -e prune -e reap -e orphan
exit=0 elapsed=0.010s
11:          Overwrite a locally modified artifact instead of refusing it, and delete a locally modified orphan or dropped-client output instead of preserving it. On a named update it reaches only the named closure

```

