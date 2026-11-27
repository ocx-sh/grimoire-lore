---
title: Terminal and product demo recordings - secret scrub gate and reproducibility
program: product
sub_program: channels
topic: channel-terminal-video
worker: vid-scrub-and-reproducibility
date_researched: 2026-11-27
model: sonnet
sources_fetched: 21
---

# Terminal and product demo recordings: secret scrub gate and reproducibility

Scope: how a recording leaks secrets, the gate that stops it, and what makes a recording regenerable. Not covered: pipeline choice per surface, legibility and captions (sibling workers). Era: all tool facts read 2026-11-27. Method notes: tools `gitleaks`, `trufflehog`, `asciinema`, `vhs` are not installed locally; gitleaks ran from the Docker image `zricethezav/gitleaks:latest` (reports `v8.30.1`). Not run: trufflehog, asciinema, vhs.

## Contents
1. Summary
2. Findings (1 leak paths, 2 tool docs, 3 fleet measurement, 4 synthetic evasion test, 5 reproducibility, 6 exemplars, 7 scout figures that fail)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary
- A `.cast` file is replayable text; an asciicast v3 header records only `SHELL` from the environment by default and not keystrokes ([asciicast v3 spec](https://docs.asciinema.org/manual/asciicast/v3/), spec revised 2025-10-20). The leak is therefore the output stream, not the header.
- The standard secret scanners do not flatten a cast. Measured here: raw `gitleaks dir` caught 1 of 4 synthetic casts that contained the same fake token; the same files with output events concatenated and ANSI stripped were caught 4 of 4 (section 4).
- So the gate is two steps: reassemble the output stream to plain text, then scan it. Scanning the committed `.cast` alone is not a gate.
- Fix at the source, not after: the fleet recorder's docstring says post-hoc string rewriting broke table alignment, so it records against a clean environment instead (section 3). The cli/cli `vhs-demo` skill says "Never redact the GIF after capture" ([cli/cli skill](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md), commit 2026-09-04).
- Isolation recipe that exists in two fleet and upstream forms: allowlisted env dict, isolated `HOME`, empty config dir, credential variables cleared, synthetic hosts, fixed prompt sentinel.
- Fleet measurement (20 casts, 235,905 bytes): 0 gitleaks findings, 0 emails, 0 token prefixes, 0 real usernames; 67 `/home/` lines in 6 files all with one generic segment; 35 `localhost`/`127.0.0.1` lines in 7 files; 18 `/tmp/` lines in 12 files.
- Reproducibility needs: committed script (tape or recorder), pinned tool versions, `Require` lines, fixed shell/prompt/geometry, CI regeneration and a diffable golden text. Seeds and fixed time are not features of VHS or asciinema; they must come from the scripted environment.
- VHS `Hide`/`Show` stops frame capture only; hidden commands still run and nothing in the docs says hidden content is scrubbed ([VHS README](https://github.com/charmbracelet/vhs)).
- GitHub secret scanning docs do not state file types or size limits scanned; push protection is off by default per repository ([push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection), undated). Treat GitHub as a backstop, never the gate.
- Gate placement: put the procedure in the terminal-demo skill and one MUST line ("no recording is committed or uploaded without a passing scrub report") in the channel-publishing rule.

## Findings

### 1. How a recording leaks
Leak paths, with the evidence that each exists or is closed:

| Path | Evidence | Status in fleet |
|---|---|---|
| Output stream: tokens echoed by commands, `env`/`printenv`, registry login output, debug logs | Cast events store raw output; the asciicast spec stores events as `[interval, code, data]` ([spec](https://docs.asciinema.org/manual/asciicast/v3/)) | no token prefix hit (section 3) |
| Typed input echoed by the terminal | Input events (`i`) are off by default, but echo of typed text lands in `o` events; `capture_input` default `false` ([config v3](https://docs.asciinema.org/manual/cli/configuration/v3/)) | 0 `i` events across 7,212 events |
| Header `env` map | Only `SHELL` captured by default; `capture_env` can add names such as `USER` ([config v3](https://docs.asciinema.org/manual/cli/configuration/v3/)) | 0 casts have an `env` key |
| Shell prompt (user, host, cwd) | Prompt is part of the stream; the fleet recorder sets a fixed `PS1` sentinel after spawn | no real username found |
| Home paths and temp dirs | `/home/<name>/`, `/tmp/pytest-of-<user>/` appear when the runner's real `HOME`/tmp leaks | 67 and 18 lines, generic segment only |
| Hostnames and registries | Private registry hostnames in `pull`/`login` output | 35 loopback lines; no `.internal/.local/.lan/.corp` hits |
| Hidden VHS setup | `Hide` stops capture only; commands still run in the real shell ([VHS README](https://github.com/charmbracelet/vhs)) | no tape files in fleet |
| Uploaded recordings | `asciinema upload` prints "a secret link"; the quick start carries no warning about sensitive content ([quick start](https://docs.asciinema.org/manual/cli/quick-start/)) | not used |

### 2. What the tool docs say (read 2026-11-27)
- asciinema config v3: `capture_env` "List of environment variables to capture, default: SHELL"; `capture_input` "default: false"; `idle_time_limit` in `[session]` "Limit recorded terminal inactivity to max n seconds, default: off" ([config v3](https://docs.asciinema.org/manual/cli/configuration/v3/), undated page). `asciinema rec -i 2` sets it per recording; `--command`/`-c` records one command instead of a shell ([quick start](https://docs.asciinema.org/manual/cli/quick-start/)).
- asciicast v3: header `idle_time_limit` optional float; players should reduce inactivity to it. Event timestamps are relative intervals; header `timestamp` is absolute. Spec revisions 2025-09-10 and 2025-10-20; `env` privacy note "should not capture any additional environment variables unless explicitly requested by the user" ([spec](https://docs.asciinema.org/manual/asciicast/v3/)). The `docs.asciinema.org/manual/cli/usage/` URL returned 404; the CLI manual index has no privacy page ([manual](https://docs.asciinema.org/manual/cli/)).
- VHS README: `Env HELLO "WORLD"` sets a variable; `Hide` "stop capturing frames... useful to pause a recording to perform hidden commands"; `Show` resumes; `Require` must precede non-setting commands and fails early if a program is missing from `$PATH`; `Set Shell`; `Source` another tape; `Output golden.ascii` (or `.txt`) "generate golden files" to commit so runs can be diffed; hooks into CI via the official GitHub Action. No secret warning; the Releases section was empty on the fetched page, so release dates come from the GitHub API (v0.12.1 published 2026-09-24) ([VHS README](https://github.com/charmbracelet/vhs)).
- vhs-action README inputs: `path`, `version` (default `"latest"`), `token`, `install-fonts` (default `false`); no pinning or security statement. Latest release v2.1.1, 2026-08-11 (GitHub API). The default `latest` means an unpinned tool unless a rule sets `version` ([vhs-action](https://github.com/charmbracelet/vhs-action)).
- gitleaks README: `detect` and `protect` deprecated since v8.19.0; modes are `git`, `dir` (aliases `files`, `directory`) and `stdin`; custom rules use `[[rules]]` with `regex`, optional `entropy`, `[[rules.allowlists]]`; `[extend] useDefault = true` inherits the built-in ruleset; `--baseline-path`; `--exit-code` (default 1 on leak); `--max-decode-depth` decodes percent, hex and base64 (base64 at least 16 chars); `--max-archive-depth` for archives. The README says the project is feature complete with security patches only and the author is shifting to Betterleaks. Latest release v8.30.1, 2026-03-21 (GitHub API) ([gitleaks](https://github.com/gitleaks/gitleaks)). The deprecated `detect --no-git` still ran on v8.30.1 here.
- trufflehog README: `trufflehog filesystem path...` scans files; `--results=verified`, `--no-verification`, `--fail` (exit code 183 on results); custom regex detectors are "alpha", need at least one regex and one keyword, verification is a webhook; no exclude-path flag documented for filesystem scans. Latest release v3.100.1, 2026-11-23 (GitHub API) ([trufflehog](https://github.com/trufflesecurity/trufflehog)). Not run locally; custom-detector behaviour is documented only.
- GitHub secret scanning: scans "entire Git history on all branches", issues, PRs, discussions, wikis; free and automatic on public repos; no file-type or size exclusions stated ([about](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning), undated). Push protection: repository push protection "Is disabled by default"; push protection for users is enabled by default; write-access users can bypass with a reason ("It's used in tests", "It's a false positive", "I'll fix it later"); surfaces include CLI pushes, GitHub UI commits, file uploads, REST API ([push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection), undated). "Push protection only supports the most recent token versions" ([patterns](https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns), undated). Whether GitHub flattens a cast before matching is not documented; the next section shows why that matters.

### 3. Fleet measurement (read-only fleet, copy in `~/.cache/research-lang/exemplars/product/vid-scrub/`)
Commands (counts only; no values read out):

```
D=~/.cache/research-lang/exemplars/product/vid-scrub
cp grimoire-rs/grimoire/docs/public/casts/*.cast grimoire-rs/grimoire/docs/public/demo.cast $D/grimoire/
cp ocx-sh/www-setup/site/public/casts/examples/*.cast $D/ocx/
docker run --rm -v $D:/src:ro zricethezav/gitleaks:latest dir /src --no-banner --redact
grep -rEho '/home/[A-Za-z0-9_.-]+' $D | wc -l          # also /Users/, email, localhost, /tmp/, token prefixes
```

| Measure | Result |
|---|---|
| Casts copied | 20 (12 under grimoire incl. `demo.cast`, 8 under ocx), 235,905 bytes |
| `gitleaks dir` (v8.30.1), raw files | `no leaks found` |
| `gitleaks dir`, output events flattened and ANSI stripped | `no leaks found` |
| `/home/` lines / files / distinct first segments | 67 / 6 / 1; 0 match the real user or host name; all generic |
| `/Users/`, `/root/`, `C:\Users`, email, `.internal/.local/.lan/.corp`, `Bearer`, `Authorization`, token prefixes `ghp_ gho_ github_pat_ AKIA xox sk-` | 0 each |
| `localhost` or `127.0.0.1` lines / files | 35 / 7 (a local test registry) |
| `/tmp/` lines / files | 18 / 12 |
| Header `env` key present | 0 of 20 |
| Input (`i`) events | 0 of 7,212 events |
| Format | 12 asciicast v2 (width 180 x 11, 120 x 1; no `idle_time_limit` key), 8 asciicast v3 (`term`, `idle_time_limit` 2) |

Source-side hygiene found in the code (read, not run):
- `grimoire-rs/grimoire/test/recordings/cast_recorder.py` docstring: post-hoc swap of registry host and temp path was removed because `print_table` pads to rendered width, so replacing a cell leaves downstream columns misaligned; the fix is at the source (real anonymous registry, short cwd), guarded by `assert_tables_column_aligned`. It sets `PS1` to a sentinel after spawning a PTY shell and uses simulated typing timing (deterministic) with real-time output capture.
- `grimoire-rs/grimoire/test/src/runner.py` `GrimRunner.env` is a built dict, not a copy of `os.environ`: `GRIM_HOME`, `PATH`, isolated `HOME`, `XDG_CONFIG_HOME`, plus only the keys it copies from the host; it passes `env=` and `cwd=` to the recorder (`test_record_casts.py` lines 538-545).
- The OCX original (`ocx-sh/ocx/test/recordings/cast_layer.py`, `conftest.py`) derives `sanitize_map` and `repo_map` from `provider.display_map()` (one source), i.e. rewriting is a mapping, not ad-hoc regex. This is the older approach that the grimoire port dropped.

### 4. Synthetic evasion test: why scanning the `.cast` is not enough
Method: four casts, each carrying the same synthetic `ghp_` token (random, never valid), differing only in how the output events are cut. Directory `~/.cache/research-lang/exemplars/product/vid-scrub-synth/`. Commands: `gitleaks dir /src --no-banner --redact -v` over the raw files, then over files rebuilt by concatenating every `o` event and stripping `\x1b[...` sequences.

| Cast variant | Raw `.cast` scan | Flattened text scan |
|---|---|---|
| a. token in one event | found | found |
| b. typed one character per event (a real recorder's echo) | missed | found |
| c. ANSI colour codes inside the token | missed | found |
| d. token split across two events | missed | found |
| Total | 1 of 4 | 4 of 4 |

Reading: the JSON event framing (`[0.15,"o","g"]`) breaks regexes that expect a contiguous token. Typed commands are recorded per keystroke in real recordings, so variant b is the normal case. This is a measurement of gitleaks v8.30.1 only; GitHub secret scanning and trufflehog were not tested, and their behaviour on cast files is undocumented (section 2).

### 5. Reproducibility
- Scripted source of truth: a recording is regenerated from a committed script, never hand-captured. Fleet: `cast_recorder.py` + pytest scenarios; upstream: a `.tape` file ([VHS README](https://github.com/charmbracelet/vhs)).
- Pinned tools: `vhs-action` `version` defaults to `latest`; the cli/cli skill requires VHS 0.11.0+ plus ffmpeg, ffprobe and ttyd and stops if any is missing ([cli/cli skill](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md)). Pin the action's `version` and the product binary (absolute path, version, SHA-256, per the cli/cli skill).
- Fixed shell and prompt: `Set Shell`, the fleet's `PS1` sentinel; cli/cli says VHS 0.11 shell definitions suppress startup profiles and set a generic prompt and tells the agent to verify with a probe.
- Fixed geometry and pacing: `Set Width/Height/FontSize/TypingSpeed`; fleet casts record fixed width 180 or 120 and auto-height; asciicast v3 `idle_time_limit` caps dead time (fleet v3: 2).
- Condition waits, not sleeps: cli/cli uses `Wait+Screen` and `Wait+Line`, with `Sleep` only for pacing.
- Fixed time and seeds: neither VHS nor asciinema docs offer a clock or seed setting (not found in the pages read). Pinning must come from the demo's setup: a fixture registry with fixed digests, versions and content, fixed tags (fleet `setups.py` pins versions such as `0.12.5`, `25.0.5`), and commands whose output contains no clock values. This is a gap, not a documented feature.
- Diffable golden text: VHS `Output golden.ascii` committed in git lets CI show what changed ([VHS README](https://github.com/charmbracelet/vhs)). The fleet has no `.tape` files (find over the fleet returned 0).
- Regeneration in CI: Geodesic's `vhs.yaml` runs on pull requests that change `*.tape`, with a `[skip vhs]` commit-message escape, `TERM`/`COLORTERM`/`LANG` fixed, and demo-only env files ([cloudposse/geodesic](https://github.com/cloudposse/geodesic/blob/main/.github/workflows/vhs.yaml), last change 2025-02-06).

### 6. Exemplars (upstream)
The 16 READMEs with demos in the first 40 lines are listed in `product-audit/exemplar-readmes.md`. Searching the git trees of all 16 for `.tape`, `vhs`, `asciinema`, `.cast`, `demo`, `record`: cli/cli (`.github/skills/vhs-demo/`) and eza (`docs/tapes/demo.tape`) have demo-generation source; the other 14 show nothing under those names (a tree-path search; it misses generators with other names).

| Project | What it does | Gap |
|---|---|---|
| [cli/cli](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md) (skill commit 2026-09-04) | Evidence contract; empty `GH_CONFIG_DIR`, remapped `HOME`/`XDG_CONFIG_HOME`, token variables set to empty, `Hide` used only for fixtures and prompt, preflight and frame-inspection scripts, "Never redact the GIF after capture", media kept out of the repo | Agent-facing skill, not a CI job; no automated secret scan step is named (inspection is visual) |
| [eza-community/eza](https://github.com/eza-community/eza/blob/main/docs/tapes/demo.tape) (tape last changed 2023-11-04) | Committed tape with fixed `Set Shell fish`, `Set Width 1536`, `Set Height 512`, `Set FontSize 13`, writes `docs/images/demo.gif` | No `Env`, `Require` or `Hide` seen in the part read; the `.github/workflows` listing (apt, unit-tests, update-dependencies, winget) has no VHS workflow, so regeneration is manual; font is a Nerd Font that readers lack |
| [cloudposse/geodesic](https://github.com/cloudposse/geodesic/blob/main/.github/workflows/vhs.yaml) (outside the 16; CI generator) | PR-triggered regeneration, skip flag, fixed terminal env | Not one of the 16 README exemplars; used because neither of the two in-set projects regenerates in CI |

### 7. Scout figures that fail to reproduce
Scout `channel-video-production-software.md` line 25 reads "11 (casts dir), 10 casts with a height and `idle_time_limit` set to 16 to 66 s, v2, width 180 (browse-tui: 120)". Measured: 11 casts plus `demo.cast`; none of the 12 v2 headers has an `idle_time_limit` key; the 16 to 66 range is the header `height` (rows) of 11 casts (browse-tui is 120 x 30). The v3 count (8, ocx) reproduces and those carry `idle_time_limit` 2. Row 5 of the scout ("fleet casts use 16 to 66 s limits") is therefore wrong: no fleet v2 cast caps idle time. Last-event time of the v2 casts is 13 to 56 s (v3 values are intervals, summed 7 to 16 s). Scout line 150 says no tool was installed; here Docker supplied gitleaks.

## Normative guidance candidates

Numbered. Severity in brackets.

1. [MUST] Fix leaks at the source: record in an isolated environment and rerun, never edit the finished recording. Rationale: post-hoc rewrite broke fleet table alignment and the cli/cli skill forbids it. Verify: the recording script sets `env=` as an allowlisted dict (not `os.environ.copy()`) or the tape sets `Env HOME`, `Env XDG_CONFIG_HOME`, and empties credential variables; `grep -nE 'os\.environ\.copy\(\)' <recorder>` returns nothing for the recording path; in a tape, `grep -nE '^Env (HOME|XDG_CONFIG_HOME)' demo.tape` returns 2 lines.
2. [MUST] Flatten before scanning: rebuild the plain text of every `o` event (concatenate, strip ANSI) and scan that, in addition to the raw file. Rationale: raw scan caught 1 of 4 synthetic casts, flattened caught 4 of 4. Verify: run the flatten script from section 4 and `gitleaks dir <flat-dir> --no-banner --redact` exits 0; a seeded canary (a fake `ghp_` token typed per character) in a test cast must be detected, otherwise the gate is broken.
3. [MUST] Run the flattened scan with `gitleaks dir` (not the deprecated `detect`) before commit and before any upload, and fail the job on exit code 1. Rationale: `detect` deprecated since v8.19.0. Verify: `gitleaks dir "$FLAT" --no-banner --redact; echo $?` is 0 (default exit code is 1 on a leak, [gitleaks README](https://github.com/gitleaks/gitleaks)).
4. [MUST] Count, and fix to zero, path, host and identity patterns in the flattened text: `/home/`, `/Users/`, `/root/`, `C:\Users`, email addresses, private hostname suffixes, the real hostname and username of the recorder. Rationale: scanners do not detect them as secrets (fleet had 67 `/home/` lines with 0 findings). Verify: `grep -rEc '/home/|/Users/|/root/|C:\\Users|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' $FLAT` is 0 except the allowlisted generic demo segment documented in the repo; also `grep -Fc "$(id -un)" $FLAT` and `grep -Fc "$(hostname)" $FLAT` are 0.
5. [MUST] Use a fixed synthetic prompt and a synthetic cwd short enough not to wrap; the recorded prompt contains no real user, host or path. Rationale: the prompt is in every frame. Verify: set a sentinel prompt (fleet: `PS1="<sentinel>"`) and run the rule-4 grep.
6. [MUST] Keep `capture_input` off and do not add `capture_env` entries beyond `SHELL`/`TERM`. Rationale: spec default and privacy note. Verify: `head -1 f.cast | python3 -I -c 'import sys,json;h=json.loads(sys.stdin.read());print(sorted(h.get("env",{})))'` prints at most `['SHELL']` (`['SHELL','TERM']` allowed); `grep -c '"i"' f.cast` is 0.
7. [MUST] Use only synthetic credentials, hosts and registry data, and clear every inherited credential variable for the recorded product (tool-specific: for `gh`, `GH_TOKEN`, `GITHUB_TOKEN`, `GH_ENTERPRISE_TOKEN`, `GITHUB_ENTERPRISE_TOKEN`, `GH_HOST`, `GH_REPO`, per [cli/cli](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md)). Rationale: an inherited login is the likeliest real token. Verify: grep the recorder for the product's token variable names set to empty, or assert they are absent from the child env in a test.
8. [MUST] Do not publish or upload a recording whose scan report is missing; upload (including `asciinema upload`) is a publication step. Rationale: the upload link is "secret" only by obscurity and the docs carry no warning. Verify: CI job order: scrub gate precedes any `asciinema upload` or media publish step; `grep -rn 'asciinema upload' .github scripts` finds no call outside the gated job.
9. [MUST] Commit the recording script (tape or recorder plus scenario), not only its output, and give the media a regeneration command in the repo docs. Rationale: a demo that cannot be rebuilt goes stale. Verify: for every `*.cast`, `*.gif`, `*.webm` under the docs tree there is a script that names its output path (`grep -rl '<output filename>' <scripts dir>` returns at least 1 file).
10. [MUST] In a tape: `Require` lines for every program the tape calls, `Set Shell` explicit, and no `Hide` block that prints, pastes or rewrites output attributed to the product (hidden commands only for fixtures, isolated config, prompt, `cd`, clear). Rationale: `Hide` stops capture only; cli/cli's evidence contract. Verify: `grep -c '^Require' demo.tape` at least 1 per called program and before any non-setting command; read each `Hide ... Show` block with the heuristic "pass: `mkdir`, `export`, `clear`; fail: `echo` or `cat` of fake product output".
11. [SHOULD] Pin versions: set `version:` on `charmbracelet/vhs-action` (default is `latest`), record product binary version and SHA-256 next to the recording. Rationale: unpinned tool changes alter output and geometry. Verify: `grep -n 'vhs-action' -A4 .github/workflows/*.yml | grep -c 'version:'` at least 1 per use.
12. [SHOULD] Commit a golden text output (`Output golden.ascii` or a flattened cast text) and diff it in CI so output drift fails or is reviewed. Rationale: VHS documents this for CI diffs. Verify: `ls **/*.ascii **/*.txt` golden present and CI step `git diff --exit-code` over it.
13. [SHOULD] Cap dead time: asciicast v3 header `idle_time_limit` set (fleet v3 uses 2), or `asciinema rec -i`. Rationale: spec lets players cap idle; v2 fleet casts have none. Verify: `head -1 f.cast | grep -c idle_time_limit` is 1 for every cast.
14. [SHOULD] Prefer condition waits (`Wait+Screen`, `Wait+Line`) over `Sleep` for results; keep `Sleep` for pacing. Rationale: timing on CI runners differs. Verify: `grep -c '^Sleep' demo.tape` vs `grep -c '^Wait' demo.tape`; every command whose output is asserted is followed by a `Wait`.
15. [SHOULD] Make the output deterministic: fixed fixture versions and digests, no clock, random or machine-specific values in visible output. Rationale: neither VHS nor asciinema offers time or seed pinning. Verify: record twice and compare flattened text: `diff <(flatten run1.cast) <(flatten run2.cast)` is empty.
16. [SHOULD] Run the flattened scan again in CI on every pull request that touches a media file, with a canary test of the gate (rule 2). Rationale: gates regress silently. Verify: CI log shows both the scan and the canary result.
17. [SHOULD] Enable GitHub push protection for the repository as a backstop. Rationale: it is off by default and is not documented to flatten casts. Verify: repository security settings show push protection enabled; do not count it as satisfying rules 2 to 4.
18. [CONSIDER] Add a custom gitleaks config that extends the default (`[extend] useDefault = true`) with project rules for internal hostnames and registry names. Rationale: default rules do not know your private hosts. Verify: `.gitleaks.toml` contains `useDefault = true` and a `[[rules]]` for each private domain; scan with `--config`.
19. [CONSIDER] Run trufflehog `filesystem` with `--results=verified,unknown` as a second opinion on the flattened text. Rationale: verification catches live credentials. Verify: `trufflehog filesystem "$FLAT" --fail` exits 0 (183 on results). Not run in this research.
20. [CONSIDER] When a GUI or non-terminal product is shown, use the same isolation and a visual frame inspection (first, last, one frame per second) instead of text scan. Rationale: text scan sees no pixels. Verify: cli/cli's `inspect.sh <gif> <dir>` style extraction exists and a person or model read the frames.

Placement decision: the procedure (flatten, scan, counts, canary, isolation recipe, reproducibility rules 9 to 16) belongs in the terminal-demo skill, because it is a multi-step workflow with scripts and tool commands. The channel-publishing rule should carry only rule 8 plus one pointer line: "every recording passes the terminal-demo scrub gate before commit or upload". Reason: the rule is read on every publish task and must stay short; the skill is loaded when a recording is made.

## Dated facts

| Fact | Source | Source date | Source kind |
|---|---|---|---|
| asciicast v3 captures only `SHELL` by default; other env only on request; no keyboard input by default; timestamps are relative intervals | [spec](https://docs.asciinema.org/manual/asciicast/v3/) | revised 2025-10-20 | authority itself |
| `capture_env` default SHELL; `capture_input` default false; `idle_time_limit` default off | [config v3](https://docs.asciinema.org/manual/cli/configuration/v3/) | undated | authority itself |
| `asciinema upload` prints a secret link; no sensitive-content warning on page | [quick start](https://docs.asciinema.org/manual/cli/quick-start/) | undated | authority itself |
| asciinema CLI latest 3.2.1 | GitHub releases API (`gh api repos/asciinema/asciinema/releases/latest`) | 2026-06-16 | authority itself |
| VHS: `Env`, `Hide`, `Show`, `Require`, golden `.txt`/`.ascii`, CI action; v0.12.1 | [README](https://github.com/charmbracelet/vhs); `gh api repos/charmbracelet/vhs/releases/latest` | v0.12.1 2026-09-24 | authority itself |
| vhs-action v2.1.1; `version` default `latest` | [vhs-action](https://github.com/charmbracelet/vhs-action) | 2026-08-11 | authority itself |
| gitleaks v8.30.1; `detect` deprecated v8.19.0; feature complete, author shifting to Betterleaks | [README](https://github.com/gitleaks/gitleaks); releases API | 2026-03-21 | authority itself |
| trufflehog v3.100.1; custom detectors alpha; exit 183 with `--fail` | [README](https://github.com/trufflesecurity/trufflehog); releases API | 2026-11-23 | authority itself |
| GitHub secret scanning: public repos free and automatic; history on all branches; no file-type or size rule stated | [about](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning) | undated | platform itself |
| GitHub push protection: repo setting off by default; user setting on by default; bypass reasons | [push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection) | undated | platform itself |
| cli/cli `vhs-demo` skill: requires VHS 0.11.0+, "Never redact the GIF after capture" | [SKILL.md](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md) | 2026-09-04 | upstream project |
| Fleet: 20 casts, 235,905 bytes, 0 gitleaks findings | commands in section 3 | measured 2026-11-27 | own measurement |
| Synthetic test: raw scan 1 of 4, flattened 4 of 4 | commands in section 4 | measured 2026-11-27 | own measurement (gitleaks v8.30.1 only) |

## What an agent must not decide alone
- Whether to publish a recording that shows a real customer, real credentials, a real internal host or a real person's name; ask the owner.
- Whether a real (non-synthetic) registry or account may appear on screen, even a public one; this is a brand and legal call.
- Whether a flagged finding is a false positive: an agent may allowlist only a documented generic demo value, never a finding it cannot identify.
- Whether to upload to asciinema.org or YouTube (third-party hosting of the content, retention, secret-link semantics).
- Which license, font license and music license a rendered video uses (font file used in a GIF render may carry terms).
- Whether to ship a demo whose output is simulated rather than the real binary; the owner decides and the demo must say so.

## AI-agent angle
- Agents scan the committed `.cast` and report clean. Catch: require the flattened scan and the canary test (rules 2, 16).
- Agents reach for `gitleaks detect --no-git` from training data. It is deprecated since v8.19.0; use `gitleaks dir` (rule 3). Check: `grep -rn 'gitleaks detect' .github scripts Taskfile*`.
- Agents record in the live shell, with real `HOME`, prompt and logged-in CLIs, then `sed` the output. Check: rule 1 greps.
- Agents trust `Hide` as "scrubbed". It only stops frame capture. Check: rule 10 reading heuristic.
- Agents add `Sleep` everywhere. Check: Sleep versus Wait count (rule 14).
- Agents set `vhs-action` without `version`. Check: rule 11 grep.
- Agents assume asciinema records environment variables. It records `SHELL` by default; the leak is in output. Check: rule 6.
- Agents cite scout-style claims such as "idle_time_limit 16 to 66 s" without opening the header. Check: print the header (section 7).

## Contested / evolving
- Replace versus allowlist-and-rewrite: the grimoire recorder rejected post-hoc string replacement because it breaks column alignment ([fleet docstring](file:///home/mherwig/dev/grimoire-rs/grimoire/test/recordings/cast_recorder.py)); the OCX original uses a sanitize map derived from `display_map()`. Both are in the fleet. Source-side isolation is more robust; a one-source map is acceptable where the output has no padded tables. cli/cli sides with source-side only.
- Scanner choice: gitleaks says it is feature complete and the author moves to Betterleaks ([README](https://github.com/gitleaks/gitleaks), read 2026-11-27) while trufflehog ships frequently (v3.100.1, 2026-11-23) but its custom detectors are alpha ([README](https://github.com/trufflesecurity/trufflehog)). Neither was shown to flatten casts. Trend: pick by whether it can run on the flattened text; revisit Betterleaks when it has a documented release.
- Whether GitHub flattens casts: undocumented; do not assume.
- Idle cap in the file versus in the player: the spec asks players to honour `idle_time_limit`, but the recorded timestamps still contain the pause; trimming at record time (`-i`) and playback cap are different, and both are in use.
- Video versus text cast for demos is the sibling workers' question; the scrub gate applies to both, but the flatten step differs (frame inspection for GIF and video).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.asciinema.org/manual/asciicast/v3/ | asciicast v3 spec (primary) | revised 2025-10-20 | `env`, `idle_time_limit`, relative timestamps, privacy note |
| https://docs.asciinema.org/manual/cli/configuration/v3/ | asciinema CLI 3 config (primary) | undated | `capture_env`, `capture_input`, `idle_time_limit` defaults |
| https://docs.asciinema.org/manual/cli/quick-start/ | asciinema quick start (primary) | undated | `-i`, `-c`, upload secret link, no warning |
| https://docs.asciinema.org/manual/cli/ | asciinema CLI manual index (primary) | undated | confirms no privacy page; `usage/` 404 |
| https://github.com/charmbracelet/vhs | VHS README (primary) | v0.12.1 2026-09-24 | `Env`, `Hide`, `Show`, `Require`, golden files, CI |
| https://github.com/charmbracelet/vhs-action | VHS GitHub Action (primary) | v2.1.1 2026-08-11 | inputs, default `latest` |
| https://github.com/gitleaks/gitleaks | gitleaks README (primary) | v8.30.1 2026-03-21 | `dir`, custom rules, baseline, decode depth, deprecation |
| https://github.com/trufflesecurity/trufflehog | trufflehog README (primary) | v3.100.1 2026-11-23 | `filesystem`, verification, custom detectors |
| https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning | GitHub secret scanning (primary) | undated | what is scanned; no file-type rule |
| https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection | GitHub push protection (primary) | undated | default off, bypass reasons |
| https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns | GitHub supported patterns (primary) | undated | newest token versions only |
| https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md | cli/cli agent skill for VHS demos (upstream exemplar) | 2026-09-04 | isolation recipe, evidence contract |
| https://github.com/eza-community/eza/blob/main/docs/tapes/demo.tape | eza demo tape (upstream exemplar) | 2023-11-04 | committed tape, no Env isolation |
| https://github.com/cloudposse/geodesic/blob/main/.github/workflows/vhs.yaml | CI regeneration workflow (upstream exemplar, outside the 16) | 2025-02-06 | PR-triggered rebuild, skip flag |
| /home/mherwig/dev/grimoire-rs/grimoire/test/recordings/cast_recorder.py | fleet recorder (read-only) | 2026 | source-side scrub rationale |
| /home/mherwig/dev/grimoire-rs/grimoire/test/src/runner.py | fleet env isolation (read-only) | 2026 | allowlisted env dict, isolated HOME |
| /home/mherwig/dev/ocx-sh/ocx/test/recordings/cast_layer.py | OCX sanitize-map recorder (read-only) | 2026 | single-source mapping |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/marketing-topic-map/channel-video-production-software.md | scout (rows 2, 5, 6 and line 25) | 2026-11-27 | claims re-tested; line 25 and row 5 fail |
| https://github.com/asciinema/asciinema/releases | asciinema release (GitHub API) | 3.2.1 2026-06-16 | tool era |

Not fetched or not found: the asciinema `usage/` page (404); a documented clock or seed setting for VHS or asciinema (none in the pages read); GitHub's handling of `.cast` files (undocumented). Not run: trufflehog, asciinema, vhs (not installed; commands are proposed, not executed).
