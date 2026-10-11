---
title: Nushell churn and elvish for emitted code
topic: shell
agent: W3-5 alt-shells/nu-and-elvish
model: sonnet
date_researched: 2026-10-11
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/nu-and-elvish/
scope: >
  Covers rows M-K-01..M-K-07 and M-L-01..M-L-03 and the nu and elvish cleanup models (rule families SH-NU, SH-ELV):
  nu 0.100.0 to 0.116.1 (14 pinned real binaries were run, not every release: 0.100.0 0.101.0 0.102.0 0.105.1 0.106.1 0.107.0 0.110.0 0.111.0 0.112.1 0.113.0 0.114.1 0.115.1 0.116.0 0.116.1),
  elvish 0.18.0 to 0.21.0 (latest release is v0.21.0, 2024-08-14), the parse gate, the version-split pattern, the dated denylists and the cleanup idiom per shell.
  Not covered: quoting for emitted strings and hook registration (SH-EMIT-02/03, SH-EMIT-27, SH-EMIT-28, already measured in shell-emit.md), fish, zsh, and any macOS or Windows host behaviour of nu or elvish
  (nu and elvish were run on Linux only; the Windows `rc.elv` path stays unverified, as in ocx-emitter.md).
---

# Nushell churn and elvish for emitted code

Date of all runs: 2026-10-11. Fixture root: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/nu-and-elvish/` (written `FX/` below).
Every nu or elvish version in this file was a real binary (`FX/bin/<ver>/nu`, `FX/bin/elv/<ver>/elvish`), run with `--no-config-file` or in a sandbox `HOME`.
The wave-2 consolidations are cited by rule ID and not re-derived: SH-EMIT-06, SH-EMIT-27, SH-EMIT-28, SH-EMIT-30 ([shell-emit.md](../shell-emit.md)).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. The window: releases, cadence, supported range (M-K-05)
   - 2. What `--ide-check` and `nu-check` see, and what they do not (M-K-01)
   - 3. The parse-gate wrapper `nu-gate.nu`
   - 4. Removed and renamed items: failure mode per item (M-K-01)
   - 5. Fall-through to an external binary (M-K-03)
   - 6. The safe intersection that parses and prints the same on 0.100.0..0.116.1
   - 7. Version guard and file split (M-K-02)
   - 8. Where emitted nu lives and what loads it (M-K-04)
   - 9. Errors and cleanup in nu: try, catch, finally, complete, exit (M-K-06)
   - 10. Bash habits in nu (M-K-07)
   - 11. Elvish: what emitted code can assume (M-L-01)
   - 12. Elvish: `-compileonly` blind spots and the `edit:` false positive (M-L-03)
   - 13. Elvish: guard, idempotent rc, cleanup (M-L-02)
   - 14. Fleet defects found (reported, not fixed)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Nushell has no 1.0 and ships a breaking minor roughly monthly: 0.105.1 (2025-06-10) to 0.116.1 (2026-10-04) is 11 minors; GitHub's latest release is `0.116.1` ([releases](https://github.com/nushell/nushell/releases)). Treat every nu file as pinned to a declared `[floor, ceiling]` range and re-run its gate on each new minor.
- `nu --ide-check N file` ALWAYS exits 0, even on a parse error (measured: exit 0 with two `"severity":"Error"` lines for `let-env FOO = "x"` on 0.116.1). Its JSON lines are the signal, so a CI gate must read stdout.
- `--ide-check` and `nu-check` are blind to the three failure classes that matter most for agent-written nu: deprecation warnings (`str upcase`, `get -i`), removed commands (`def-env`, `date format`, `fetch`: they parse as external calls) and fall-through to a real binary (`"abc" | size` ran GNU binutils `size`). `FX/nu-gate.nu` closes all three; it is itself written in the safe intersection and runs on 0.100.0..0.116.1.
- A removed nu command can silently succeed: with an `a.out` in the working directory, `print ("abc" | size)` printed a binutils table and exited 0 on both 0.105.1 and 0.116.1. Only `nu-gate --strict` (any bareword external is red unless listed in `--allow`) catches it.
- One unknown flag or subcommand of a KNOWN command fails the whole file at parse time (`str uppercase` on 0.105.1: `nu::parser::extra_positional`), even in a dead branch; a new top-level command in a dead branch does not (it parses as external). So the guard is a `const`-selected `source`: `const f = (if (version | get minor) >= 114 { "new.nu" } else { "old.nu" }); source $f` parses only the selected file on nu >= 0.102.0 and is a hard error on 0.100.0 and 0.101.0 (`not_a_const_command`).
- A runtime `if (version ...) { source new.nu }` fails on the old nu: the parser reads both files (0.105.1 exit 1, `extra_positional` in `new-only.nu`).
- `login.nu` runs BEFORE the vendor and user autoload directories (measured on 0.105.1 and 0.116.1: `env.nu`, `config.nu`, `login.nu`, vendor autoload, user autoload), although the [nushell book](https://www.nushell.sh/book/configuration.html) prints the overview list with `login.nu` last. `nu script.nu`, `nu -c` and `nu -l -c` load no autoload directory at all.
- Dated stale-command denylist, measured on 0.105.1 and 0.116.1: broken on both ends are `let-env`, `def-env`, `extern-wrapped`, `date format`, `fetch`, `unfold`, `str collect`, `str find-replace`, `register`, `with-env [..]`, `&&`, `do -s`; changed in the window are `$nu.home-path`/`$nu.temp-path` (hard error from 0.110.0), `str upcase`/`str downcase` (warning from 0.114.0), `get -i` (warning from 0.106.1; `--optional` unknown before 0.106.0), `into value` (0.108.0), `def run` (a builtin from 0.114.0, an error from 0.115/0.116), `random dice` (gone by 0.114.1).
- A list-typed flag given on the command line (`--allow '[ocx,git]'`) parses as nuon on 0.110.0/0.111.0 and is a type mismatch on 0.114.1/0.116.1; pass `--allow ocx,git` and `split row ","` inside.
- nu cleanup, portable 0.100.0..0.116.1: capture with `try { ...; 0 } catch {...}`, clean up, then `exit $code`. `try { } finally { }` exists from 0.111.0 but is only well-behaved from 0.116.0 (0.111.0 ran `finally` twice; 0.114.1 continued past a failed external with exit 7).
- A bare `try { ^sh -c "exit 7" }` swallows the failure (exit 0). An external in TAIL position of `try` hangs forever once it writes more than 65536 bytes on nu 0.112.1..0.116.1 (0.105.1, 0.110.0 and 0.111.0 finish); put `| complete` inside the `try`. No upstream issue was found by `gh search` (3 queries).
- A helper that calls `exit` leaks the caller's temp dir on both shells: `www-setup/src/install.nu:244,285,295` and `install.elv:226,285,289` exit with `$tmpdir` live (reproducer in section 14).
- Elvish 0.21.0 is the latest release (2024-08-14); the 0.22 draft changes no language feature. `elvish -compileonly` is blind to every removed command (`eawk`, `float64`, implicit `cd`, `a=b cmd`: they fail at RUN time with `executable file not found`), so the gate adds a deprecation-stderr check and a dated denylist (`FX/elv-gate.sh`).
- `elvish -compileonly` reports `$edit:` references as compile errors (`variable $edit:before-readline not found`) although the same line works in a real interactive session (pty run: the hook fired once). Tolerate exactly those messages in rc files, never in scripts, and wrap `edit:` in `eval` when the code may run non-interactively (SH-EMIT-28).
- Elvish cleanup: `defer` inside a `fn` (not at top level), or `try { } finally { }`, both 0.18.0..0.21.0; neither runs on `exit` (defer) or on SIGTERM/SIGHUP, and re-exit with the external's status needs `$e[reason][exit-status]`.
- Neither shell has `trap`: measured on nu 0.116.1 and elvish 0.21.0, SIGTERM and SIGHUP skip `finally`; SIGINT to the child's process group runs it on nu only.

## Findings

### 1. The window: releases, cadence, supported range (M-K-05)

- Cadence from the release posts: 0.105.0/.1 2025-06-10, 0.106.0 2025-07-23, 0.107.0 2025-09-02, 0.108.0 2025-10-15, 0.110.0 2026-01-17, 0.111.0 2026-02-28, 0.112.1 2026-04-11, 0.113.0 2026-05-23, 0.114.0 2026-07-04, 0.115.0 2026-08-15, 0.116.0 2026-09-26, 0.116.1 2026-10-04 (post dates from [the blog sources](https://github.com/nushell/nushell.github.io/tree/main/blog); `gh api repos/nushell/nushell/releases/latest` returned `0.116.1 2026-10-04T15:26:13Z`). That is 11 minors in 16 months and no 1.0 date; the only 1.0 material found is the 2023 road-to-1.0 post.
- Deprecations carry a removal schedule from 0.116.1 on ("scheduled for removal in 0.118.0", [0.116.1 post](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2026-10-04-nushell_v0_116_1.md)); `str upcase` warns "will be removed in a future release" with no version ([0.114.0](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html), measured warning text).
- Decision for the `nushell.md` row: **declared range, not "latest".** Shared and emitted nu declares `# nu-range: 0.105.1..0.116.1` (floor = the program's matrix floor; zoxide's own floor is 0.106.0, `ajeetdsouza/zoxide@86b443cffcd7:CHANGELOG.md:34`). The gate runs on BOTH ends and again on each new minor. ocx's embedded `env.nu` body passes the gate on 0.100.0, 0.105.1 and 0.116.1 (`FX/ocx/ocx-env.nu`, verify V7), so ocx can state a floor of 0.100.0 for that one file; that is a property of the file, not of nu.
- zoxide is the live example of the cost: `CHANGELOG.md` carries 10 `Nushell: support for v…` / `upgrade minimum supported version to v…` lines (0.32.0 up to 0.106.0), measured by `grep -c -E` on the exemplar clone (the brief said 11; 10 match that pattern).
- nu_scripts: 69 of 1,545 files (4.5%) differ between 0.105.1 and 0.116.0 (28 old-only, 41 new-only), 35 fail on both ([exemplar-shape.md:52](../shell-audit/exemplar-shape.md), `nushell/nu_scripts@4033ddf35966`).

### 2. What `--ide-check` and `nu-check` see, and what they do not (M-K-01)

`nu --help` on 0.116.1 documents `--ide-check <int>`: "run a diagnostic check on the given source and limit number of errors returned to provided number". Measured on nu 0.116.1 and 0.105.1:

```text
$ nu --no-config-file --ide-check 100 stale/s01-let-env.nu ; echo $?     # PLANT
{"type":"diagnostic","severity":"Error","message":"Assignment operations require a variable.","span":{"start":0,"end":11}}
{"type":"diagnostic","severity":"Error","message":"Types 'nothing' and 'string' are not compatible for the '=' operator.", ...}
0                                                                       # exit 0 on a parse error
$ nu --no-config-file --ide-check 100 safe/safe-intersection.nu         # TWIN
{"type":"hint","typename":"record<a: int>","position":{"start":431,"end":432}}      # hints only, no diagnostic
```

| Tool | Exit on parse error | Sees deprecation warning | Sees removed command | Sees fall-through (`size`) |
|---|---|---|---|---|
| `nu --ide-check N f` | 0 always (stdout JSON has the error) | no (`str upcase`, `get -i`: 0 diagnostics on 0.116.1) | no (`def-env`, `date format`, `fetch`: E0) | no |
| `nu -c 'nu-check f'` | 0 (prints `false`) | no | no | no |
| `nu -c 'nu-check --debug f'` | 1 (measured: s01 exit 1, safe twin exit 0, on 0.105.1 and 0.116.1) | no | no | no (s05-size exit 0) |
| `nu f` (run) | 1 | yes, on stderr, only if the code is parsed | `Removed command: date format` (stub) or runs an external | runs the external |
| `FX/nu-gate.nu --strict` | 1 | yes (dry `source`) | yes (stub category + external shape) | yes (strict) |

Per-item `--ide-check` counts across 0.100.0..0.116.1 are in `FX/ide-results.txt`; two take-aways: (1) it is E0 for `str upcase`, `get -i`, `def-env`, `date format`, `fetch`, `size`, `$nu.home-path` and `$nu.temp-path` on every version (the last two are runtime errors, so no parser sees them); (2) it differs from the run result for `unfold` (E1 up to 0.114.1, E0 on 0.116.x, where `unfold` is an external call).

### 3. The parse-gate wrapper `nu-gate.nu`

`FX/nu-gate.nu` (51 lines, nu, written in the safe intersection so it runs on 0.100.0..0.116.1; usage `nu nu-gate.nu [--strict] [--allow ocx,git] file.nu ...`) exits 1 on ANY of:

1. an `--ide-check` JSON line with `"type":"diagnostic"`;
2. a `Warning:` or `Error:` printed when a temp wrapper `if false { source FILE }` is run with `--no-config-file --error-style plain` (deprecations print only when the sourced file is parsed; the dead branch parses without executing);
3. a `shape_external` node from `nu --ide-ast FILE` whose text is neither `^`-prefixed, nor in `--allow`, nor (in default mode) found by `which`; with `--strict` every bareword external is red unless allowed (this is what catches `size`);
4. a `shape_internalcall` of a command that the running nu files under `scope commands | where category == "removed"` (the stubs for `date format`, `fetch`, `let-env`).

`--allow` takes a comma-separated STRING because a `list<string>` flag typed on the command line is a nuon parse on nu <= 0.111.0 and a type mismatch on nu >= 0.114.0 (finding 9, V13). Run it with the nu under test: `nu` on the floor and `nu` on the ceiling (`matrix.sh nu` runs a script on 0.105.1 and 0.116.0).

```text
nu-gate s01-let-env (plant) 0.105.1   want=red   exit=1 | stale/s01-let-env.nu: diagnostic: {"type":"diagnostic","severity":"Error", ...
nu-gate safe-intersection (twin) 0.116.1  want=green exit=0 |
```

Limits, measured: default mode is blind to a removed name that is also a binary on PATH (`size`: exit 0); `--strict` needs an `--allow` list for the externals a file legitimately calls bare (`printenv,ls` in the `nu-forms.nu` twin); the gate does not run the code, so `$nu.home-path` (a runtime `column_not_found`) passes it, which is why the denylist in finding 4 exists.

### 4. Removed and renamed items: failure mode per item (M-K-01)

Each row is one file in `FX/stale/` run on 0.105.1, 0.114.1 and 0.116.1 (`FX/stale-results.txt` has all seven versions). "Parse" = fails before any line runs; "run" = fails when reached; "warn" = exit 0 with a `Warning: nu::parser::deprecated` on stderr; "silent" = no signal. Release attribution is from the release posts: [0.106.0](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-07-23-nushell_0_106_0.md) (`--ignore-errors (-i)` renamed to `--optional (-o)`), [0.107.0](https://www.nushell.sh/blog/2025-09-02-nushell_0_107_0.html), [0.108.0](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-10-15-nushell_v0_108_0.md), [0.110.0](https://www.nushell.sh/blog/2026-01-17-nushell_v0_110_0.html), [0.114.0](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html), [0.115.0](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2026-08-15-nushell_v0_115_0.md).

| Item (file) | Since / until | 0.105.1 | 0.114.1 | 0.116.1 |
|---|---|---|---|---|
| `let-env FOO = "x"` (s01) | removed 0.83 (2023-07) | parse `assignment_requires_variable` | same | same |
| `def-env setit [] {..}` (s02) | removed 0.88 | run `nu::shell::external_command` (parses as an external call) | same | same |
| `date now \| date format "%Y"` (s03) | renamed 0.84 | run `Removed command: date format ... use 'format date'` (stub) | same | same |
| `fetch URL` (s04) | removed | run `Removed command: fetch ... use 'http get'` | same | same |
| `"abc" \| size` (s05) | removed 0.88 | run: executes **/usr/sbin/size** (binutils) | same | same |
| `unfold` (s06) | removed | parse `variable_not_found` | same | run `external_command` |
| `str collect` (s07), `str find-replace` (s27) | removed | parse `extra_positional` | same | same |
| `register /path` (s08) | removed 0.93 | run `external_command` | same | same |
| `$nu.home-path` (s09) | renamed `home-dir` in **0.110.0** | works (prints path) | run `column_not_found` | same |
| `$nu.temp-path` (s10) | renamed `temp-dir` in **0.110.0** | works | run `name_not_found` | same |
| `$nu.home-dir`, `$nu.temp-dir` (s21, s22) | new in 0.110.0 | run `column_not_found` | works | works |
| `"abc" \| str upcase` (s11) | deprecated **0.114.0** | works, silent | **warn** | **warn** |
| `str uppercase` (s23) | new 0.114.0 | parse `extra_positional` | works | works |
| `"12" \| into value` (s12) | replaced by `detect type` 0.108.0 | parse `input_type_mismatch` | works | works |
| `detect type` (s24) | new 0.108.0 | run `external_command` | works | works |
| `print a && print b` (s13) | never valid | parse `shell_andand` | same | same |
| `get -i b` (s14), `get 0 -i` (s40) | deprecated **0.106.0** | silent | **warn** | **warn** |
| `get --optional b` (s15) | new **0.106.0** | parse `unknown_flag` | works | works |
| `with-env [A 1] {..}` (s16) | list form removed 0.94 | run `cant_convert` | same | same |
| `do -s {..}` (s17) | removed 0.104 | parse `unknown_flag` | same | same |
| `def run [] {..}; run` (s18) | `run` builtin 0.114.0, keyword 0.115.0 | works | run `missing_positional` (the builtin `run` was called) | parse `name_is_keyword` |
| `def while [] {..}` (s38) | keyword shadowing banned 0.115.0 | works | works | parse `name_is_keyword` |
| `["ABC"] \| find abc \| length` (probe p01) | case-sensitive 0.107.0 | `1` | `0` | `0` |
| `null \| each {..}` (p06) | passes `null` through 0.107.0 | `int` | `nothing` | `nothing` |
| `catch {\|e\| $e.json}` (s25) | `json` field replaced by `details` 0.114.0 | works | run `column_not_found` | same |
| `try {..} finally {..}` (s32) | new **0.111.0** | parse `expected_keyword` | works | works |
| `random dice` (s31) | removed by 0.114.1 | works | parse `extra_positional` | same |
| `1 ++ 2` (s36), `$(cmd)` (s37) | never valid for numbers / cmd subst | parse | same | same |
| `extern-wrapped foo [...args]` (s26) | removed (use `def --wrapped`) | run `external_command` | same | parse `variable_not_found` |
| submodule call `use a; a b f` (p11) | implicit submodule import removed **0.114.0** | works | run `external_command` | same |
| `error make {label: {..}}` (p04a) / `labels: [..]` (p04b) | `labels` for several, 0.110.0 | works | works | works (both forms ran on all 10 versions) |
| `(version \| get minor)` in a `const` | const-evaluable from **0.102.0** | works | works | works |

Notes with measured evidence:

- "Silent" is the dangerous column: `str upcase` before 0.114.0, `$nu.home-path` before 0.110.0 and `get -i` before 0.106.1 are correct code that rots later; the same text is correct on the floor and a warning or error on the ceiling, so a file that must run on both has to avoid them (finding 6).
- `find` became case-sensitive in 0.107.0 and `each` passes `null` through from 0.107.0: both are SILENT result changes (probes p01, p06 above), invisible to every gate; the safe form is an explicit regex `where {|s| $s =~ '(?i)abc'}`.
- `def run` is the 0.114.0 to 0.116.0 trap: the builtin `run` ([0.114.0](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html): "Scripts can join the pipeline with `run`") wins silently on 0.114.1, and the definition is rejected on 0.116.1 ([0.115.0](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2026-08-15-nushell_v0_115_0.md), "Disallowed shadowing parser keywords"). Name helpers with a tool prefix (`__ocx-say`).
- `def collect [] {..}` still works on 0.116.1 (probe p13), so it is not on the denylist.
- 0.116.0 also made "Unified custom completions" a breaking change for completers and menu sources ([0.116.0](https://www.nushell.sh/blog/2026-09-26-nushell_v0_116_0.html)); no completer was run in this study (read only).
- `str upcase` etc. are deprecation WARNINGS on 0.114.0..0.116.1, scheduled removal unspecified; the same post series shows removal after a warning period is real (`random dice`).

### 5. Fall-through to an external binary (M-K-03)

`FX/fallthrough/fallthrough.nu`:

```nu
print ("abc" | size)
print "reached-end"
```

`size` was removed from nu; the parser treats the unknown bareword as an external call, so whichever `size` is on PATH answers. On this host that is GNU binutils (`/usr/bin/size`, `GNU size version 2.45.1-4.fc43`):

```text
cwd without a.out : /usr/sbin/size: 'a.out': No such file        nu 0.105.1 exit=1   nu 0.116.1 exit=1
cwd WITH a.out    :  text data bss dec hex filename / 20220 992 48 21260 530c a.out / reached-end   exit=0 on both
```

The second case is the real hazard: a wrong answer with exit 0 (binutils ignores the piped string and reads `./a.out`). The same mechanism makes `def-env`, `register` and `unfold` (0.116.x) "work" until reached. Detection: `nu-gate --strict` reports `unknown command treated as external: size` (exit 1 on 0.105.1 and 0.116.1); default mode is green when the name resolves on PATH. A floor-and-ceiling run of the file under a PATH without binutils would also expose it, but the gate does not depend on the host's PATH.

### 6. The safe intersection that parses and prints the same on 0.100.0..0.116.1

`FX/safe/safe-intersection.nu` (annotated in `safe-intersection-annotated.txt`) replaces each stale construct; its output was byte-identical (md5 `bc37adadbf4a651cc9e0e48402be0a26`) on 0.100.0, 0.101.0, 0.102.0, 0.105.1, 0.107.0, 0.110.0, 0.111.0, 0.114.1, 0.115.1, 0.116.0 and 0.116.1, and the gate is green on it for 0.105.1 and 0.116.1. Selected pairs:

| Stale or version-bound | Safe on the whole range |
|---|---|
| `let-env FOO = "x"` | `$env.FOO = "x"` |
| `def-env f [] {..}` | `def --env f [] {..}` |
| `date now \| date format "%Y"` | `date now \| format date "%Y"` |
| `fetch URL` | `http get URL` |
| `"abc" \| size` | `"abc" \| str stats \| get chars` |
| `unfold`, `str collect` | `generate {\|x\| ...} 1`, `str join` |
| `$nu.home-path` / `$nu.home-dir` | `("~" \| path expand)` or `$env.HOME` |
| `into value` / `detect type` | `into int` etc. (a specific conversion) |
| `a && b` | `a; b` (or `and` for booleans) |
| `get -i b` / `get --optional b` | `$r.b? \| default none` (cell-path `?` ran on all 10 probed versions, p03c) |
| `with-env [A 1] {..}` | `with-env {A: "1"} {..}` |
| `do -s {..}` | `do {..}` |
| `str upcase` / `str uppercase` | avoid, or guard (finding 7) |
| `$e.json` in `catch` | `$e.msg` (present on every version; `json` became `details` in 0.114.0, p05) |
| `find abc` | `where {\|s\| $s =~ '(?i)abc'}` |
| `null \| each {..}` | `null \| default ..` first |
| `try .. finally` | finding 9 |

### 7. Version guard and file split (M-K-02)

One parse error aborts the whole file: nu parses the entire file (and every file it `source`s) before running line 1. A new command in a dead branch is harmless (it is an external call), but a new FLAG or SUBCOMMAND of a known command is a parse error even in a dead branch. Measured with `FX/guard/`:

```nu
# new-only.nu   (parses only on nu >= 0.114.0)
export def shout [s: string] { $s | str uppercase }
# old-only.nu   (str upcase warns on >= 0.114.0)
export def shout [s: string] { $s | str upcase }
```

```nu
# PLANT entry-naive.nu: runtime guard
if (version | get minor) >= 114 { source new-only.nu; print (shout abc) } else { source old-only.nu; print (shout abc) }
# TWIN entry-const.nu: const-evaluated file choice
const shout_file = (if (version | get minor) >= 114 { "new-only.nu" } else { "old-only.nu" })
source $shout_file
print (shout abc)
# TWIN 2 entry-const-garbage.nu: the unselected file is garbage and is never opened
const f = (if (version | get minor) >= 999 { "never-parsed.nu" } else { "old-only.nu" })
```

| Entry | 0.100.0 | 0.101.0 | 0.102.0 | 0.105.1 | 0.113.0 | 0.114.1 | 0.116.1 |
|---|---|---|---|---|---|---|---|
| naive (plant) | exit 1 `extra_positional` | 1 | 1 | 1 | 1 | 1 (warn + `shout` not found) | 0 + deprecation warning |
| const (twin) | exit 1 `not_a_const_command` | 1 | **0 `ABC`** | 0 | 0 | 0 | 0 |

- The const form needs nu >= 0.102.0: [`get` became const-evaluable in 0.102.0](https://www.nushell.sh/blog/2025-02-04-nushell_0_102_0.html) ("`get` is now const"), and `version | get minor` is a `get`. On 0.100.0 and 0.101.0 the same line is `not_a_const_command`, a hard error at parse time.
- On 0.116.1 the naive guard "works" but prints a `str upcase` deprecation from the not-taken branch: the parse of the dead file is the proof that the old file is read.
- The selector must be numeric (`(version | get minor)`), matching SH-EMIT-30 ("numeric version fields or a feature probe, never parsed version text").
- The pattern for emitted nu: write the version-neutral core file, then one `since-0.114.nu` / `before-0.114.nu` pair, and an entry file containing only the `const`-selected `source`. Do NOT use `$nu.version.minor?` in a const (probe-const3): use the `version` command form that was measured.
- The ocx design (guard by `describe` at runtime, no new syntax; `crates/ocx_setup/src/shims.rs:195`, `ocx@d0cdf8838`) avoids the problem by writing only intersection syntax. That is the better first choice; the file split is for syntax the intersection cannot express.

### 8. Where emitted nu lives and what loads it (M-K-04)

- Documented startup order in the [configuration book](https://www.nushell.sh/book/configuration.html) numbered list: `env.nu` (step 20), `config.nu` (step 22), then step 23 "(login) loads the user's login.nu", then 24 vendor autoload dirs, 25 user autoload dirs. The "Configuration Overview" bullet list on the same page puts `login.nu` LAST, which contradicts the numbered list.
- Measured (`FX/order/`, `nu --login` with a marker file in each location, nu 0.105.1 and 0.116.1): `1 env.nu; 2 config.nu; 4 login.nu; 3a vendor-autoload; 3b user-autoload`. The numbered list is right; wave-2's conflict 5 holds.
- The same page's scenario table: `nu`, `nu script.nu` and `nu -c` do not read `login.nu`; `nu -c` and `nu -l -c` load NO vendor or user autoload directory and `nu script.nu` loads no config. Consequence: hooks and `PATH` edits emitted into autoload exist in the REPL only, never in `nu -c` or a script (same scope as SH-EMIT-27: "REPL only").
- User autoload dir `($nu.default-config-dir)/autoload` since [0.102.0](https://www.nushell.sh/blog/2025-02-04-nushell_0_102_0.html), sourced after vendor dirs; `$nu.data-dir/vendor/autoload` is the vendor dir ocx uses (`ocx@d0cdf8838:crates/ocx_setup/src/profiles.rs:27,473`).
- Version-specific, from the posts: `PROMPT_*` environment variables are no longer inherited from 0.103.0 ([post](https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-03-18-nushell_0_103_0.md)); `env_change` hooks run BEFORE `pre_prompt` from 0.107.0 ([post](https://www.nushell.sh/blog/2025-09-02-nushell_0_107_0.html)); both are covered by SH-EMIT-27 (normalise to a list, marker, never depend on order) and are not re-measured here.

### 9. Errors and cleanup in nu: try, catch, finally, complete, exit (M-K-06)

Measured on `FX/probes/p02*`, `FX/cleanup/*`:

- A bare external with a non-zero status aborts the script with that status: `^sh -c "exit 3"; print "after"` exits 3 and never prints `after`, on 0.110.0, 0.111.0 and 0.116.1.
- pipefail: `^false | lines | length | print; print "reached"` printed `0 reached` (exit 0) on 0.110.0 and `0` (exit 1, `reached` not printed) on 0.111.0 and 0.116.1. The [0.111.0 post](https://www.nushell.sh/blog/2026-02-28-nushell_v0_111_0.html) says "nushell will use `pipefail` by default"; the [book](https://www.nushell.sh/book/stdout_stderr_exit_codes.html) says it is an opt-out experimental option, `nu --experimental-options '[pipefail=false]'`. `let r = (^false | lines)` still reaches the next line (probe s28), so assignment contexts differ from statement contexts.
- `try` without `catch` swallows: `try { ^sh -c "exit 7" }; print "after"` printed `after` and exited 0 on every version (tf-a). A `try` that MUST propagate needs `catch` that re-raises or sets the exit code.
- `catch {|e| ...}` record fields: `debug,json,msg,raw,rendered` through 0.111.0; `debug,details,msg,raw,rendered` from 0.114.1 ([0.114.0](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html), "Errors with more details"). Use `$e.msg`.
- `error make`: a record `label` and a list `labels` both ran on all 10 versions (p04); `labels` is the form for several labels from 0.110.0 ([post](https://www.nushell.sh/blog/2026-01-17-nushell_v0_110_0.html)).
- Exit status of an external inside `try`: `$env.LAST_EXIT_CODE` holds it in `catch`; the portable twin below uses `($env.LAST_EXIT_CODE? | default 0)`. `complete` returns `{stdout, stderr, exit_code}` and never raises on a non-zero status ([book](https://www.nushell.sh/book/stdout_stderr_exit_codes.html)).

**`finally` per version** (`FX/cleanup/tf-b.nu`: `try { ^sh -c "exit 7" } finally { print "fin" }; print "after"`):

| nu | tf-b (external fails) | tf-c (`error make` in try) | tf-d (catch + finally) |
|---|---|---|---|
| 0.105.1, 0.110.0 | parse `expected_keyword` | parse | parse `extra_positional` |
| 0.111.0 | `fin fin after`, exit 0 (finally twice) | `fin after`, exit 0 (error swallowed) | `fin fin after` (no `caught`) |
| 0.112.1 | `fin after`, exit 0 | `fin after`, exit 0 | `caught fin after` |
| 0.114.1 | `fin after`, **exit 7** | `fin after` then the error, exit 1 | `caught fin after` |
| 0.116.0, 0.116.1 | `fin`, exit 7, `after` not printed | `fin` then the error, exit 1 | `caught fin after` |

So `finally` is a parse error below 0.111.0 and only matches the documented "runs no matter what, then the failure continues" contract from 0.116.0. The 0.111.0 post documents it ("finally runs no matter what happened before"; "`finally` runs even after `exit`"; `exit --abort` skips it).

**Cleanup idioms, cleanup plant vs twins** (`FX/cleanup/`, `exit 7` from an external, temp dir made with `mktemp -d` and recorded in a marker file):

| Script | nu 0.105.1 | nu 0.116.1 |
|---|---|---|
| `cleanup-plant.nu` (rm after the failing step) | exit 7, temp dir LEFTOVER | exit 7, LEFTOVER |
| `cleanup-twin-portable.nu` (capture, clean, `exit $code`) | exit 7, cleaned | exit 7, cleaned |
| `cleanup-twin-finally.nu` | exit 1 (parse error) | exit 7, cleaned |

```nu
# portable twin: nu 0.100.0 .. 0.116.1
def main [marker: string, mode: string = "ext"] {
  let d = (mktemp -d)
  let code = (try { work $d $mode; 0 } catch {|e|
    print -e $e.msg
    let c = ($env.LAST_EXIT_CODE? | default 0)
    if $c == 0 { 1 } else { $c }
  })
  rm -rf $d
  if $code != 0 { exit $code }
}
```

- **Tail-position hang.** `try { ^sh -c 'head -c N /dev/zero | tr "\0" a' } catch { "caught" }` writes N bytes to a captured stream: N = 65536 finishes, N = 65537 hangs (nu 0.116.1); N = 300000 finishes on 0.105.1, 0.110.0 and 0.111.0 and hangs on 0.112.1, 0.113.0, 0.114.1, 0.115.1, 0.116.0 and 0.116.1. The twin `try { ^sh -c '...' | complete } catch {...}` finishes (`tail-try-twin`, exit 0 on 0.112.1 and 0.116.1). The fleet already knows: `www-setup@a251c3631047:src/install.nu:148-151` documents "An external command left in tail position inside `try` hangs forever in nushell". No upstream issue was located (`gh search issues --repo nushell/nushell`, three phrasings, all empty).
- **Helpers must not `exit`.** `FX/leak/helper-exit-leak.nu` (a helper calls `exit 4` while `main` owns `$tmpdir`) leaves the temp dir (exit 4, LEFTOVER on 0.116.1); `helper-exit-twin.nu` (helper raises `error make`, `main` captures, cleans, then exits 4) cleans up. From 0.111.0 `try { exit } finally {..}` runs `finally`, but the floor cannot rely on it.
- **Signals are not trapped.** Measured with `FX/cleanup/sig-run.sh` (nu sleeping in `try { ^sleep 30 } finally { save marker }`): nu 0.116.1 SIGTERM to the pid: `finally` NOT run; SIGHUP: NOT run; SIGINT to the pid: NOT run and nu still alive; SIGINT to the process group: `finally` RAN. Single runs, timing-dependent: report as "not reliable", not as a contract. nu 0.111.0 SIGTERM to the group ran `finally`; 0.116.1 did not.

### 10. Bash habits in nu (M-K-07)

`FX/bashisms/` ran on 0.105.1 and 0.116.1 (identical class on both):

| Habit | Result |
|---|---|
| `print a && print b`, `[ -f f ] && ..` | parse `shell_andand` ("use ';' or 'and'") |
| `false \|\| print fallback` | parse `shell_oror` |
| `export FOO=bar` | parse `unexpected_keyword` |
| `FOO=bar printenv FOO` | works (prints `bar`) |
| `ls /x 2>&1 \| length` | parse `shell_outerr` ("the '2>&1' shell operation is 'out+err>'") |
| `print $?` | parse `variable_not_found` / `Incomplete variable` |
| `print $HOME` | parse `env_var_not_var` ("Use $env.HOME") |
| `print $(echo hi)` | parse `parse_mismatch` |
| `for f in *.txt; do ..; done` | parse `keyword_missing_arg` |
| `cat <<EOF ...` | RUNS: executes external `cat <<EOF` ("No such file") |
| ``print `date` `` | SILENT: prints the word `date` |
| `echo -n hi` | parse `unknown_flag` |
| `let f = "x.nu"; source $f` | parse `not_a_constant` |

Ten of the thirteen are parse errors, one works (`FOO=bar cmd`), two are silent (backtick, heredoc), which is why the bash-habit denylist is a grep and not only a parse.

### 11. Elvish: what emitted code can assume (M-L-01)

- Releases: [0.18.0](https://elv.sh/blog/0.18.0-release-notes.html) 2022-03-20, 0.19.1 2023-03-05, [0.20.0](https://github.com/elves/elvish/blob/master/website/blog/0.20.0-release-notes.md) 2024-02-11, [0.21.0](https://elv.sh/blog/0.21.0-release-notes.html) 2024-08-14. GitHub's latest release is `v0.21.0` (2024-08-14, `gh api repos/elves/elvish/releases/latest`); the 0.22 draft in `website/blog/0.22.0-release-notes.md` (`elves/elvish@26a8bd5c4ee1`) has one breaking-changes entry, about daemons older than 0.14.0, and no language change, and `0.21.1-release-notes.md` is a 404 placeholder.
- Removed or changed, each with the measured failure mode on 0.21.0 (`FX/elv-stale/e*.elv`, all four versions in `FX/elv-results.txt`):

| Item | Gone in | `-compileonly` | Run |
|---|---|---|---|
| `E=1 cmd` (legacy temporary assignment) | 0.21.0 (deprecated 0.18.0) | exit 0 on 0.21.0 (0.20.1: deprecation) | exit 2 `exec: "E=1": executable file not found` |
| `try {..} except e {..}` | 0.20.0 (deprecated 0.18.0) | exit 2 `superfluous arguments` | same |
| `float64` (use `num` or `inexact-num`) | 0.20.0 (deprecated 0.16.0) | exit 0 | exit 2 `exec: "float64": executable file not found` |
| `eawk` | 0.21.0 (deprecated 0.20.0) | exit 0, no output on 0.21.0 | exit 2 `executable file not found` |
| implicit `cd` (`/tmp`) | deprecated 0.21.0 | exit 0 | exit 0 + `Deprecation: implicit cd is deprecated` on stderr |
| lone `try {..}` | forbidden since 0.18.0 | exit 2 `try must be followed by a catch block or a finally block` | same |
| `try {..} else {..}` with no `catch` | 0.21.0 | exit 2 `try with an else block requires a catch block` | same |
| `!= 1 2 3` | 0.21.0 (two args only) | exit 0 | exit 2 `arity mismatch: arguments must be 2 values, but is 3 values` |
| `tmp E = 1` at top level | always | exit 2 `tmp may only be used inside a function` | same |
| `with x = new { .. }` | new 0.21.0 | exit 0 on 0.18.0..0.21.0 (an ordinary command word on older) | 0.18.0, 0.20.1: exit 2 `exec: "with": executable file not found`; 0.21.0: `new old` |
| `keep-if`, `os:mkdir-all` | new 0.21.0 | exit 0 | exit 2 `executable file not found` / `variable $os:mkdir-all~ not found` on 0.20.1 |
| `~/.elvish` rc dir | removed 0.21.0 | n/a | ignored |

- Source for the removal list: the [0.21.0 notes](https://elv.sh/blog/0.21.0-release-notes.html) (`eawk`, `~/.elvish`, `a=b command`, `!=` two arguments, `else` without `catch`, `edit:kill-left-alnum-word` renamed `kill-alnum-word-left`; implicit cd deprecated; `with` and `keep-if` new) and the 0.20.0 notes in `elves__elvish@26a8bd5c4ee1:website/blog/0.20.0-release-notes.md`.
- The safe intersection for 0.18.0..0.21.0: `try .. catch e .. finally`, `defer` inside `fn`, `tmp` inside `fn`, `var`/`set`, `use str` / `use re` / `use path` / `use platform` (probe-mods.elv green), `set-env`/`get-env`. Not safe below 0.21.0: `with`, `keep-if`, `os:mkdir-all`. Not safe at all: everything in the removal table. The `E:` namespace plus `tmp` inside a `fn` is the replacement for `E=1 cmd`.
- `resolve NAME` returns `(external NAME)` for a name that does not resolve to a builtin or function, which is the probe for new commands (finding 13).

### 12. Elvish: `-compileonly` blind spots and the `edit:` false positive (M-L-03)

[`-compileonly`](https://elv.sh/ref/command.html): "Parse and compile Elvish code without executing it"; `-json` shows the output as JSON. On 0.21.0:

- It sees syntax errors, unknown VARIABLES (`$nosuchvar`: exit 2), `tmp` outside a function, `try` forms and `$edit:` references. It does NOT see unknown COMMANDS (`no-such-cmd-xyz`: exit 0, run exit 2 `executable file not found`), `use` of a missing module (run-time `no such module`), `ns:missing-fn`, removed commands (`eawk`, `float64`) and implicit cd. That is why `elv-gate.sh` adds two checks: any stderr line containing `deprecat` (the 0.20.1 `eawk` and legacy-assignment warnings and 0.21.0 implicit-cd print on stderr), and a `-w` denylist of `eawk float64 except`.
- **`edit:` false positive.** `FX/elv-edit/edit-valid.elv` is `set edit:before-readline = [$@edit:before-readline {|@__tool_marker| echo HOOK-RAN }]`. `-compileonly` rejects it (`variable $edit:before-readline not found`, `cannot find variable $edit:..`), yet a pty run of real `elvish -rc` fired the hook once (`python3 -I elv-edit/pty-run.py ... edit-valid.elv` printed `HOOK-RAN count: 1`). The [`edit:` module](https://elv.sh/ref/edit.html) is the interactive editor API, so it does not exist in a script or `-compileonly`.
- The tolerance: `elv-gate.sh --tolerate-edit` removes only messages matching `cannot find variable $edit:` or `variable $edit:.* not found`; a real typo in the same file (`echo $nosuchvar`) still fails (`edit-valid-plus-typo.elv`: exit 1 with and without the flag).
- `edit-eval.elv` wraps the line in `eval '...'` (SH-EMIT-28): the gate is green with no flag, and a non-interactive run raises a run-time exception (`Exception: Multiple compilation errors`) instead of a compile error. That is the contract: rc files are interactive; shared scripts use `eval`.
- Limit: `-json` output and the exact message wording exist from 0.20.x; on 0.18.0 `elv-gate.sh --tolerate-edit` exits 0 on the typo twin (masked, V10). The gate's floor is elvish 0.20.1.

### 13. Elvish: guard, idempotent rc, cleanup (M-L-02)

- **Idempotent rc** is SH-EMIT-28 (marker as the closure's rest-argument name, probe `$c[arg-names]` with `has-value`, `eval` around `edit:`); direnv and mise append unguarded. It was measured by wave 2 on elvish 0.21.0 only, two scenarios; this study adds nothing to it and does not repeat it.
- **Guard.** A new COMMAND in a dead branch compiles on 0.18.0..0.21.0, so no file split is needed in this range: `fn has-cmd {|name| not (str:has-prefix (resolve $name) '(external')}` plus `if (has-cmd keep-if)` is enough (`FX/elv-guard/twin.elv`: `▶ 2 ▶ 3` on 0.20.1 and 0.21.0; `plant.elv` with the unguarded `keep-if` dies on 0.20.1 with exit 2 and passes on 0.21.0; `with-probe-deadbranch.elv` prints `fallback old` on 0.18.0/0.20.1 and `in-with new` on 0.21.0). A file split would be needed only for new SYNTAX, which no release in 0.18..0.21 added.
- **Cleanup** (`FX/cleanup/cleanup-*.elv`, `sh -c 'exit 7'` as the failing step):

| Script | 0.18.0 | 0.21.0 |
|---|---|---|
| `cleanup-plant.elv` (rm after the failing step) | exit 2, LEFTOVER | exit 2, LEFTOVER |
| `cleanup-twin-defer.elv` (`defer { rm -rf $d }` in a `fn`) | exit 2, cleaned | exit 2, cleaned |
| `cleanup-twin-finally.elv` (`try {..} finally {..}`) | exit 2, cleaned | exit 2, cleaned |
| `cleanup-twin-status.elv` (catch, clean, `exit $code`) | **exit 7**, cleaned | **exit 7**, cleaned |

```elvish
# re-exit with the external's own status (0.18.0 .. 0.21.0)
var code = 0
try { ...; sh -c 'exit 7' } catch e {
  set code = 1
  if (has-key $e[reason] exit-status) { set code = $e[reason][exit-status] }
  echo (to-string $e[reason]) >&2
}
rm -rf $d
exit $code
```

- `defer` is documented in the [builtin reference](https://elv.sh/ref/builtin.html) and fails at top level: `Exception: defer must be called from within a closure` (e23). It runs after an exception inside the function (`cleanup` printed before `Exception: boom`, e17) and does NOT run on `exit`: `fn f { defer { echo defer-ran > $marker }; exit 3 }; f` left no marker (exit 3). `try ... finally` is specified in the [language reference](https://elv.sh/ref/language.html) ("At least one of catch and finally must be present"; the exception continues after `finally`, exit status 2).
- Signals: elvish 0.21.0 `try { sleep 30 } finally {..}`: SIGTERM and SIGHUP exit WITHOUT running `finally`; SIGINT to the pid or the group leaves elvish alive and `finally` not run (`sig-run-elv.sh`).

### 14. Fleet defects found (reported, not fixed; owner Q6)

1. **`www-setup/src/install.nu` leaks `$tmpdir` on three error exits.** `__ocx-err` calls `exit $code` (`install.nu:93-96`); `mktemp -d` is at `:499` and `rm -rf $tmpdir` runs at `:502` (download failure), `:521` (binary not found) and `:542` (success); in between `__ocx-verify-checksum` (`:244`, code 4) and `__ocx-safe-extract` (`:285` unsafe path, `:295` extract failure, code 5) exit with the directory live. Reproducer for the mechanism: `FX/leak/helper-exit-leak.nu` (`nu 0.116.1`: exit 4, tempdir LEFTOVER) against `helper-exit-twin.nu` (cleaned). `www-setup@a251c3631047`.
2. **`www-setup/src/install.elv` has the same shape**: `ocx-err` does `exit $code` (`:97-100`), `tmpdir` is made at `:518`, `ocx-err` is reached with it live at `:226` (checksum), `:285` (unsafe path) and `:289` (extract failure), and `e:rm -rf` runs at `:521` (download failure), `:541` (binary not found) and `:561` (success) only. Reproducer: `FX/cleanup/cleanup-plant.elv` (LEFTOVER) vs `cleanup-twin-defer.elv` (cleaned). The fix shape in elvish is a `defer` in the function that owns `$tmpdir`, then calls that do not `exit`.
3. Credit: `install.nu:148-151` already documents the tail-in-`try` hang and uses `| complete`; `install.nu` and `install.elv` parse on nu 0.105.1/0.116.0 and elvish 0.21.0 ([installers.md:313](../shell-audit/installers.md)).
4. ocx: the regression test at `crates/ocx_setup/src/shims.rs:603-640` (`env_nu_applies_activation_as_data_not_via_source`) rejects `$nu.temp-path`, `source (` and `| save`, which is the right denylist idea for one file; it does not cover `str upcase`, `get -i`, `def run` or `finally`. The embedded body passes the full gate on 0.100.0, 0.105.1 and 0.116.1 (V7). Note the field names in the embedded JSON loop changed between `ocx@5de9d777eb7d` (`entries`/`type`) and `ocx@d0cdf8838` (`items`/`kind`): a schema change is not a nu-version change, and the two sides need their own test.

## Normative guidance candidates

Rule IDs follow the SH-NU / SH-ELV families. "Run" says whether the verification went red on a planted violation and green on its twin in this study; fixture paths are under `FX/`.

### Nushell

**SH-NU-01 (MUST). Declare the nu range in the file and gate both ends.** Header `# nu-range: 0.105.1..0.116.1`; run the gate (SH-NU-02) with the floor binary and the ceiling binary; re-run on every new minor. Why: 11 breaking minors in 16 months, no 1.0 (finding 1). Verify: `grep -rL -F -e '# nu-range:' --include='*.nu' .` lists nu files with no declared range (output is the violation); the gate runs per binary. Run: gate yes (V2, V7); the `-L` grep yes (`range-hdr/plant` lists `range-hdr/plant/a.nu`, `range-hdr/twin` prints nothing; exit 0 with output on the plant, exit 1 and empty on the twin).

**SH-NU-02 (MUST). Gate every nu file with `nu-gate.nu --strict`, never with bare `--ide-check`.** `nu nu-gate.nu --strict --allow <list> FILE...` on the floor and ceiling nu; exit 1 is red. Why: `--ide-check` exits 0 on a parse error and sees neither deprecations, removed commands nor fall-through (finding 2). Verify: `nu nu-gate.nu --strict FX/stale/s01-let-env.nu` exit 1 and `... --strict FX/safe/safe-intersection.nu` exit 0, on 0.105.1 and 0.116.1. Run: yes (V1 shows `--ide-check` exit 0 on the plant, V2 red/green).

**SH-NU-03 (MUST). Call externals with `^`; a bareword that is not a nu builtin or a custom command is a defect.** Why: a removed command falls through to whatever binary is on PATH (`size` -> binutils, exit 0 with a wrong answer). Verify: `nu nu-gate.nu --strict FILE` (reports `unknown command treated as external`); `--allow` lists the barewords that are intentional (`printenv,ls`). Run: yes (X1: red exit 1 on 0.105.1 and 0.116.1, default mode green = blind, safe twin green).

**SH-NU-04 (MUST). Write the safe intersection, not the latest form, in shared and emitted nu.** Use the right column of the finding-6 table. Why: the safe forms print byte-identical output on 0.100.0..0.116.1. Verify: `grep -rn -F --include='*.nu' -e 'let-env' -e 'def-env' -e 'extern-wrapped' -e 'date format' -e 'unfold ' -e 'str collect' -e 'str find-replace' -e 'register ' -e 'with-env [' -e ' && ' -e 'do -s' -e 'do -p' -e 'fetch ' -e '$nu.home-path' -e '$nu.temp-path' -e 'str upcase' -e 'str downcase' -e 'into value' -e 'get -i' -e 'get --ignore-errors' -e 'select -i' -e 'reject -i' -e 'filter {' -e 'random dice' -e 'def run ' -e '| size' .` (output is the violation; empty = pass; `FX/denylist-nu.sh DIR` is the same list). Run: yes (V5, X2: 20 hit lines on `stale/`, exit 0; `safe/` empty, grep exit 1). Known false positives: `&&` and `fetch ` inside string literals.

**SH-NU-05 (MUST). A file that must run on the floor uses no name born after the floor.** Verify: `grep -rn -F --include='*.nu' -e '--optional' -e 'str uppercase' -e 'str lowercase' -e 'detect type' -e '$nu.home-dir' -e '$nu.temp-dir' -e ' finally ' .` (output is the violation). Introduced: `--optional` 0.106.0, `detect type` 0.108.0, `$nu.home-dir` 0.110.0, `finally` 0.111.0, `str uppercase` 0.114.0. Run: yes (X2: 6 hit lines on `stale/`, `safe/` empty). `FX/denylist-nu-new.sh`.

**SH-NU-06 (MUST). Select a version-specific file with a `const` and `source`; never with a runtime `if`.** `const f = (if (version | get minor) >= 114 { "new.nu" } else { "old.nu" }); source $f`, floor nu 0.102.0. Why: the parser reads both files of a runtime branch; the const form parses only the chosen file. Verify: `nu guard/entry-const.nu` exit 0 `ABC` on 0.102.0..0.116.1 against `guard/entry-naive.nu` exit 1 `extra_positional` on 0.105.1; plant-shape grep `grep -rn -E --include='*.nu' -e 'if .*version.*\{ *source' .` (output is the violation). Run: yes (V6; the grep hit `guard/entry-naive.nu:2` and nothing in `safe/`).

**SH-NU-07 (MUST). Do not rely on `login.nu` or autoload for scripts.** Emitted startup code goes in `$nu.data-dir/vendor/autoload/<tool>.nu` (a file of its own); it loads for the REPL only; `login.nu` runs before every autoload dir; `nu script.nu`/`nu -c` source neither. Why: measured order and book scenario table. Verify: `matrix.sh`-style run of `FX/order/` (nu --login prints `1 env.nu;2 config.nu;4 login.nu;3a vendor-autoload;3b user-autoload`). Run: yes (X5, both versions); no red/green pair, it is an order measurement.

**SH-NU-08 (MUST). Hooks follow SH-EMIT-27.** Normalise to a list, marker, append; never depend on `env_change` vs `pre_prompt` order (flips at 0.107.0); `PROMPT_*` not inherited from 0.103.0. Verify and run: SH-EMIT-27 (wave 2, watched red/green). Not re-run here.

**SH-NU-09 (MUST). No bash syntax in nu.** `&&`, `||`, `$?`, `$(..)`, `export X=`, `<<`, `2>&1`, backticks, `$HOME`, `echo -n`. Why: nine of the thirteen habits are parse errors, two are silent (heredoc runs `cat`, backtick prints the word). Verify: `grep -rn -F --include='*.nu' -e ' && ' -e ' || ' -e '$(' -e '$?' -e '<<' -e '2>&1' -e '`' -e 'export ' -e '; do' -e '; then' -e '$HOME' -e 'echo -n' .` (output is the violation). Run: yes (V14: plant exit 0 with hits; twin exit 1 empty; `nu-gate` red on `b12-andand-run` and green on `nu-forms.nu` on both versions; the silent two stay green in default mode and red only under `--strict` for the heredoc).

**SH-NU-10 (MUST). Cleanup is capture, clean, then `exit` with the original status; helpers raise `error make`, only the entry point calls `exit`.** The portable block in finding 9. Why: a failing step aborts the script, so a trailing `rm -rf` never runs; a helper `exit` skips the caller's cleanup. Verify: run `cleanup-plant.nu` vs `cleanup-twin-portable.nu` with a marker for the temp dir on 0.105.1 and 0.116.1 and test whether the directory survives; reading heuristic: `grep -rn -F --include='*.nu' -e 'exit ' .` then check the caller owns no temp dir. Run: yes (V8, X3: plant LEFTOVER, twin cleaned, exit 7 preserved on both versions; leak helper LEFTOVER vs cleaned).

**SH-NU-11 (SHOULD). Use `try { } finally { }` only when the floor is nu >= 0.116.0.** Why: parse error below 0.111.0; double `finally` on 0.111.0; continues past a failed external on 0.114.1. Verify: `grep -rn -F --include='*.nu' -e ' finally ' .` and check `# nu-range` floor; `nu cleanup/tf-b.nu`/`tf-c.nu` on the range. Run: yes as a measurement (tf-b..d table), not as a red/green gate.

**SH-NU-12 (MUST). Never leave an external in tail position of `try`; add `| complete` inside.** Why: with > 65536 bytes of output the process hangs forever on nu 0.112.1..0.116.1. Verify: `hang-run.sh 0.116.1 300000` (HANG) vs `tail-try-twin.nu` (exit 0); reading heuristic: `grep -rn -E --include='*.nu' -e 'try *\{ *\^' .` (matches plant and twin alike; the reviewer then confirms `| complete` inside). Run: yes for the hang (V9: 0.116.1 300000 bytes HANG, 65536 done, 65537 HANG; twin exit 0 on 0.112.1 and 0.116.1); the grep is a reading heuristic only.

**SH-NU-13 (MUST). Do not use bare `try` to "ignore" an error you must act on.** `try { ^cmd }` exits 0 on a failed command. Use `try {..} catch {|e| ..}` and set the exit code, or `^cmd | complete` and read `.exit_code`. Verify: reading heuristic (`grep -rn -E --include='*.nu' -e 'try *\{[^}]*\} *$' .`). Run: measured (tf-a), grep: no.

**SH-NU-14 (MUST). Name nothing `run` or after a parser keyword; prefix helpers with the tool name.** `def run` is the builtin on 0.114.x and a parse error on 0.116.x. Verify: SH-NU-04's grep includes `def run `; the gate catches `name_is_keyword` on 0.116.1. Run: yes (`nu-gate s18-def-run` plant, gate matrix R on 0.116.1, g on 0.105.1).

**SH-NU-15 (SHOULD). Pass a list option as one comma-separated string.** `--allow ocx,git`, `split row ","` inside; never `list<string>` fed from a command line. Why: nuon parse on 0.110/0.111, type mismatch on 0.114.1/0.116.1. Verify: `nu argflag/twin-string-flag.nu --allow ocx,git` exit 0 on all four; `argflag/plant-list-flag.nu --allow '[ocx,git]'` exit 1 on 0.114.1 and 0.116.1 (0.110.0, 0.111.0 exit 0). Run: yes (V13).

**SH-NU-16 (SHOULD). Read a `catch` record through `$e.msg` only.** `$e.json` is gone from 0.114.0 (`details`). Verify: `grep -rn -F --include='*.nu' -e '$e.json' -e '.json |' .`. Run: measured (s25, p05); the grep: no.

**SH-NU-17 (SHOULD). Replace result-changing defaults explicitly.** `find` (case-sensitive from 0.107.0), `each` over `null` (passes `null` from 0.107.0), `*` skipping dotfiles in `cp/mv/du` (0.110.0). Verify: reading heuristic only (`grep -rn -F --include='*.nu' -e '| find ' -e '| each ' .` and review); no gate sees them. Run: measured on probes p01, p06; heuristic: no.

**SH-NU-18 (CONSIDER). Re-test custom completers on 0.116.0.** The completion input model changed (`token`, `place`, `buffer`). Verify: run the completer under the gate on 0.116.0. Run: no (read only).

### Elvish

**SH-ELV-01 (MUST). Target elvish 0.18.0..0.21.0 (latest release 0.21.0, 2024-08-14) and test on both ends.** Verify: `matrix.sh elvish FILE` runs 0.21.0 only; the 0.18.0/0.19.2/0.20.1 binaries are `FX/elv.sh <ver> FILE`. Run: yes (V10-V12 on 0.18.0..0.21.0).

**SH-ELV-02 (MUST). Gate with compile + deprecation + denylist, never `-compileonly` alone.** `elv-gate.sh FILE...` exits 1 on any compile message, any stderr `deprecat` line, or a hit on `eawk float64 except`. Why: removed commands compile and fail at run time. Verify: `ELV="elv.sh 0.21.0" elv-gate.sh elv-stale/e05-eawk.elv` exit 1, `elv-stale/e03-catch.elv` exit 0; `-compileonly` alone is exit 0 on `e05-eawk` (0.21.0). Run: yes (V10).

**SH-ELV-03 (MUST). In rc files tolerate `$edit:` compile messages and nothing else; in scripts wrap `edit:` in `eval`.** `elv-gate.sh --tolerate-edit rc.elv`. Verify: `edit-valid.elv` red without the flag and green with it; `edit-valid-plus-typo.elv` red with it. Run: yes (V10; gate floor elvish 0.20.1, masked on 0.18.0).

**SH-ELV-04 (MUST). Do not emit the removed forms.** `a=b cmd` -> `tmp` in a `fn` or `with` (0.21.0+); `except` -> `catch`; `float64` -> `num` or `inexact-num` ([0.20.0 notes](https://github.com/elves/elvish/blob/master/website/blog/0.20.0-release-notes.md); `echo (num 1)` printed `1` on 0.18.0, 0.20.1 and 0.21.0); `eawk` -> `re:awk`; bare `/path` -> `cd /path`; `!= a b c` -> two arguments only; no lone `try`; no `try .. else` without `catch`. Verify: `grep -rn -w --include='*.elv' -e 'eawk' -e 'float64' -e 'except' .` (output is the violation) plus the gate. Run: yes (V10: `e02-except`, `e05-eawk` red). 

**SH-ELV-05 (MUST). Probe new commands with `resolve`, not a parsed version.** `fn has-cmd {|n| not (str:has-prefix (resolve $n) '(external')}`. Why: a new command in a dead branch compiles on 0.18..0.21, so no file split is needed. Verify: `elv-guard/twin.elv` exit 0 on 0.20.1 and 0.21.0, `plant.elv` exit 2 on 0.20.1. Run: yes (V11, X4).

**SH-ELV-06 (MUST). Cleanup with `defer` inside the function that owns the resource, or `try { } finally { }`; re-exit with `$e[reason][exit-status]`.** Never `exit` from a helper while a temp dir is live; `defer` does not run on `exit` and is an error at top level. Verify: plant `cleanup-plant.elv` vs `cleanup-twin-defer.elv`, `-finally.elv`, `-status.elv` on 0.18.0 and 0.21.0 (temp dir survives only in the plant; the status twin exits 7). Run: yes (V12).

**SH-ELV-07 (MUST). `tmp` only inside a function; `with` only when the floor is 0.21.0.** Verify: `elvish -compileonly` red on a top-level `tmp` (`e13-tmp.elv`: `tmp may only be used inside a function`, exit 2). Run: yes (e13).

**SH-ELV-08 (MUST). Idempotent rc follows SH-EMIT-28.** Marker as the rest-argument name, `has-value` probe, `eval` around `edit:`. Verify and run: SH-EMIT-28 (wave 2). Not repeated.

### Both

**SH-NU-19 / SH-ELV-09 (SHOULD). Do not claim signal-safe cleanup.** Neither shell has `trap`; `finally` and `defer` are skipped on SIGTERM and SIGHUP (nu 0.116.1, elvish 0.21.0). Keep temp files under a per-tool state directory that the next run sweeps, or use the OS. Verify: reading heuristic. Run: measured (`sig-run.sh`, `sig-run-elv.sh`), single runs.

## Verification runs

All run on 2026-10-11 (CEST) on Linux; `verify-all.sh` was executed twice and the two outputs were diff-identical (`FX/verify-all.out` vs `FX/verify-all.rerun.out`); `FX/verify-extra.sh` holds the checks added later. `exit` is the exit code of the command shown; "red" means the gate or check reported a violation. Paths are relative to `FX/`.

**V1. Raw `--ide-check` exit status is useless (did NOT go red).**
`./nuv.sh 0.116.1 --ide-check 10 stale/s01-let-env.nu` -> exit 0 with `{"type":"diagnostic","severity":"Error","message":"Assignment operations require a variable.",...}`. Wanted red, got 0: the flag never exits non-zero. This is the finding that motivates SH-NU-02.

**V2. nu-gate, parse error vs twin.**
```text
./nuv.sh 0.105.1 nu-gate.nu stale/s01-let-env.nu           exit=1 | stale/s01-let-env.nu: diagnostic: {"type":"diagnostic","severity":"Error", ...
./nuv.sh 0.105.1 nu-gate.nu --strict safe/safe-intersection.nu   exit=0 |
./nuv.sh 0.116.1 nu-gate.nu stale/s01-let-env.nu           exit=1 | (same)
./nuv.sh 0.116.1 nu-gate.nu --strict safe/safe-intersection.nu   exit=0 |
```

**V3. Deprecations are invisible to `--ide-check`, visible to the gate.**
```text
ide-check s11-str-upcase 0.116.1 (blind)    want=green exit=0 |
nu-gate s11-str-upcase (plant) 0.116.1      want=red   exit=1 | stale/s11-str-upcase.nu: Warning: nu::parser::deprecated
nu-gate s11-str-upcase 0.105.1 (valid there) want=green exit=0 |
nu-gate s14-get-i (plant) 0.116.1           want=red   exit=1 | Warning: nu::parser::deprecated
nu-gate s15-get-optional (plant) 0.105.1    want=red   exit=1 | diagnostic: {"type":"diagnostic","severity":"Error","message":"The `get` command do...
```

**V4. Removed stub, unknown external, fall-through.**
```text
nu-gate s03-date-format (plant) 0.116.1     red   exit=1 | removed command: date format
nu-gate s02-def-env (plant) 0.116.1         red   exit=1 | unknown command treated as external: def-env
nu-gate s05-size default 0.116.1            green exit=0 |           (blind: size is on PATH; reported, not a pass)
nu-gate --strict s05-size 0.116.1           red   exit=1 | unknown command treated as external: size
nu-gate --strict s05-size 0.105.1           red   exit=1 | (same)
```
X1 (verify-extra): `fallthrough.nu` with no `a.out` -> `/usr/sbin/size: 'a.out': No such file` exit 1; with an `a.out` in the cwd -> binutils table, `reached-end`, **exit 0** on both versions; `nu-gate --strict` exit 1; `--strict` on the safe twin exit 0.

**V5. Denylist grep (SH-NU-04).**
`./denylist-nu.sh stale` -> exit 0, 20 lines (`stale/s09-home-path.nu:1:print $nu.home-path`, `stale/s31-random-dice.nu:1:print (random dice | length)`, `stale/s05-size.nu:1:print ("abc" | size)`, ...); `./denylist-nu.sh safe` -> empty, exit 1. Misses by design (needs the gate): s15, s20-s25 new forms, s28-s30, s32-s40.

**V6. Guard split (SH-NU-06).**
```text
guard entry-naive (plant) 0.105.1   want=red   exit=1 | Error: nu::parser::extra_positional  x Extra positional argument. ,-[guard/new-only.nu:2:41]
guard entry-const (twin) 0.105.1    want=green exit=0 | ABC
guard entry-const-garbage (twin) 0.105.1 want=green exit=0 | ABC
guard entry-naive (plant) 0.116.1   want=red   exit=0 | Warning: nu::parser::deprecated ,-[guard/old-only.nu:2:37]   <- did not go red on the ceiling: the dead file is still parsed (the warning proves it), but nothing fails
guard entry-const (twin) 0.116.1    want=green exit=0 | ABC
guard entry-const-garbage (twin) 0.116.1 want=green exit=0 | Warning: ... (old-only is the selected file)
guard entry-const on 0.101.0        want=red   exit=1 | Error: nu::shell::not_a_const_command  Not a const command.
```
Also 0.102.0 `entry-const` exit 0 `ABC`; 0.100.0 and 0.101.0 exit 1; naive exit 1 on 0.100.0..0.113.0, 0.114.1 exit 1 (`Command shout not found`).

**V7. ocx embedded env.nu body passes.** `nu-gate.nu --allow ocx ocx/ocx-env.nu` exit 0 on 0.100.0, 0.105.1 and 0.116.1.

**V8. nu cleanup (SH-NU-10).**
```text
cleanup-plant.nu ext nu 0.105.1            exit=7 tempdir=LEFTOVER
cleanup-twin-portable.nu ext nu 0.105.1    exit=7 tempdir=cleaned
cleanup-plant.nu ext nu 0.116.1            exit=7 tempdir=LEFTOVER
cleanup-twin-portable.nu ext nu 0.116.1    exit=7 tempdir=cleaned
cleanup-twin-finally.nu ext nu 0.105.1     exit=1 tempdir=cleaned       (parse error, then nothing was created)
cleanup-twin-finally.nu ext nu 0.116.1     exit=7 tempdir=cleaned
```
X3: `helper-exit-leak nu 0.116.1 exit=4 tempdir=LEFTOVER`; `helper-exit-twin nu 0.116.1 exit=4 tempdir=cleaned`.

**V9. External in tail position of `try` (SH-NU-12).**
```text
nu 0.111.0 tail-in-try 300000 bytes: done [300000 ]
nu 0.112.1 tail-in-try 300000 bytes: HANG []
nu 0.116.1 tail-in-try 300000 bytes: HANG []
nu 0.116.1 tail-in-try 65536 bytes: done [65536 ]     nu 0.116.1 ... 65537 bytes: HANG []
tail-try-twin (complete) nu 0.112.1 exit=0            tail-try-twin (complete) nu 0.116.1 exit=0
```
(also 300000 bytes: 0.105.1 and 0.110.0 done; 0.113.0, 0.114.1, 0.115.1, 0.116.0 HANG.)

**V10. Elvish gate.**
```text
elvish 0.21.0 -compileonly e05-eawk   want=green exit=0 |                (compile-blind)
elvish 0.21.0 run e05-eawk            want=red   exit=2 | Exception: exec: "eawk": executable file not found in $PATH
elv-gate e05-eawk (denylist) 0.21.0   want=red   exit=1 | elv-stale/e05-eawk.elv: removed name (eawk, float64 or except)
elv-gate e03-catch (twin) 0.21.0      want=green exit=0 |
elv-gate e02-except (plant) 0.21.0    want=red   exit=1 | compile: "message":"superfluous arguments"
elv-gate e01-legacy-tempassign 0.20.1 want=red   exit=1 | Deprecation: the legacy temporary assignment syntax is deprecated; use "tmp" instead
elv-gate e06-implicit-cd 0.21.0       want=green exit=0 |                (compile-blind; the deprecation appears only at run time)
elv-gate edit-valid 0.21.0            want=red   exit=1 | compile: "message":"variable $edit:before-readline not found"   (false positive)
elv-gate --tolerate-edit edit-valid   want=green exit=0 |
elv-gate --tolerate-edit edit-valid-plus-typo 0.21.0   want=red exit=1 | "message":"variable $nosuchvar not found"
elv-gate --tolerate-edit edit-valid-plus-typo 0.18.0   want=red exit=0 |      (masked: no -json on 0.18.0; did NOT go red)
```
`elv-edit/run.sh`: `edit-valid: elv-gate exit=1 | --tolerate-edit exit=0`, `edit-valid-plus-typo: 1 | 1`, `edit-eval: 0 | 0` (non-interactive run raises an exception); pty: `HOOK-RAN count: 1` for `edit-valid.elv` and `edit-eval.elv`.

**V11. Elvish guard.** `elv-guard/plant.elv`: 0.20.1 exit 2 `exec: "keep-if": executable file not found`, 0.21.0 exit 0 (red only on the older binary); `twin.elv`: `▶ 2 ▶ 3` exit 0 on both. X4: `with-probe-deadbranch.elv` exit 0 on 0.18.0, 0.20.1 (`fallback old`) and 0.21.0 (`in-with new`).

**V12. Elvish cleanup.** 0.18.0 and 0.21.0: `cleanup-plant.elv` exit 2 LEFTOVER; `cleanup-twin-defer.elv` exit 2 cleaned; `cleanup-twin-finally.elv` exit 2 cleaned; `cleanup-twin-status.elv` exit 7 cleaned.

**V13. List flag (SH-NU-15).**
```text
plant-list-flag --allow '[ocx,git]' 0.110.0   want=red exit=0 | 2     (did NOT go red: nuon parse)
plant-list-flag --allow '[ocx,git]' 0.114.1   want=red exit=1 | Error: nu::parser::parse_mismatch_with_full_string_msg
plant-list-flag --allow '[ocx,git]' 0.116.1   want=red exit=1 | Error: nu::parser::parse_mismatch_with_full_string_msg  x Parse mismatch: expected list<string>.
twin-string-flag --allow ocx,git (0.110.0 0.111.0 0.114.1 0.116.1)  green exit=0 | 2
```

**V14. Bash habits (SH-NU-09).** `denylist-nu-bashisms.sh bashisms` exit 0 with hits (`b01-export.nu:1:export FOO=bar`, `b09-heredoc.nu:1:cat <<EOF`, ...); `bashisms-twin` empty, exit 1. `nu-gate b12-andand-run` red (exit 1) and `nu-gate --strict --allow printenv,ls nu-forms` green on 0.105.1 and 0.116.1. Reported misses: `nu-gate b10-backtick` exit 0 (silent word `date`), `nu-gate b09-heredoc` exit 1 here (`cat` and `hi` parse as externals; the denylist is the catch for the backtick).

**X2/X5.** `denylist-nu-new.sh stale` exit 0 (6 hits) / `safe` exit 1 (empty). Startup order: `nu 0.105.1 --login: 1 env.nu;2 config.nu;4 login.nu;3a vendor-autoload;3b user-autoload;` identical on 0.116.1.

Signals and `finally` table (single runs, `sig-run.sh`, `sig-run-elv.sh`): nu 0.116.1 INT->pid NOT run / INT->group RAN / TERM->pid NOT run / TERM->group NOT run / HUP->pid NOT run / HUP->group NOT run; nu 0.111.0 TERM->group RAN; elvish 0.21.0 INT->pid NOT run (alive) / INT->group NOT run (alive) / TERM NOT run / HUP NOT run; `defer` + `exit 3`: marker absent.

Counts: 20 distinct checks were watched red on a plant and green on a compliant twin (nu-gate parse, nu-gate deprecation, nu-gate removed stub, nu-gate strict fall-through, floor denylist, stale denylist, bash-habit denylist, `&&` gate, const guard, nu cleanup, helper-exit leak, tail-position hang, list-flag, elv-gate compile, elv-gate denylist, elv-gate deprecation, elv `edit:` tolerance, elvish cleanup, elv `resolve` guard, missing-`nu-range`-header grep). Not red as wanted: V1 (raw `--ide-check` exit 0), V6 naive guard on 0.116.1, V13 on 0.110.0/0.111.0, the elv-gate on 0.18.0 and `nu-gate` default mode on `size` (all reported above).

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SH-NU-01 range | `ajeetdsouza/zoxide@86b443cffcd7:templates/nushell.txt:107` ("zoxide only supports Nushell v0.106.0+"), `CHANGELOG.md:34`; ocx's gated `ENV_NU` (`ocx@d0cdf8838:crates/ocx_setup/src/shims.rs:183-240`) | nu_scripts has no range: 69/1,545 files differ across 0.105.1..0.116.0, 35 fail on both ([exemplar-shape.md:52](../shell-audit/exemplar-shape.md)) |
| SH-NU-02/03 gate | none of the 41 exemplars runs `--ide-check`; nu_scripts used `nu-check` (planted error verified, [exemplar-shape.md:52](../shell-audit/exemplar-shape.md)), which this study shows is blind to deprecations and fall-through | virtualenv `activation/nushell/activate.nu`: 1 error on 0.105.1 (`get` has no flag `optional`), 0 on 0.116.0 ([fleet-shell-shape.md:518](../shell-audit/fleet-shell-shape.md)); uv `activate.nu` template: 3 / 2 errors on 0.105.1 / 0.116.0 ([fleet-shell-shape.md:516](../shell-audit/fleet-shell-shape.md)) |
| SH-NU-04/05 safe forms | ocx `ENV_NU` avoids `$nu.temp-path`, `source (`, `\| save` by test (`shims.rs:603-640`); uses `describe`-guarded split (`shims.rs:195`) | `get --optional` in virtualenv's generated `activate.nu` (fails the floor) |
| SH-NU-06 split | no exemplar uses the const-selected `source`; zoxide handles versions by changelog bumps of the floor (10 entries) | n/a (absence) |
| SH-NU-08 hooks | `zoxide@86b443cffcd7:templates/nushell.txt:21-27` (normalise `hooks.pre_prompt`, `any { try { get __zoxide_hook } catch { false } }` marker, append): idempotent | direnv/mise unguarded (SH-EMIT-27/28) |
| SH-NU-10/12 cleanup, tail-try | `www-setup@a251c3631047:src/install.nu:148-151` (the `complete` note), `install.nu:521,542` (cleanup on success) | `install.nu:244,285,295` and `install.elv:226,285,289`: `exit` with a live temp dir |
| SH-ELV-02/03 | `www-setup/src/install.elv` passes `elvish -compileonly` (rc=0) on 0.21.0 ([fleet-shell-shape.md:514](../shell-audit/fleet-shell-shape.md)); `ocx@5de9d777eb7d` uses `eval`-style hook with marker rest-arg (`hook.rs:576-591`, [ocx-emitter.md:76](../shell-audit/ocx-emitter.md)) | zoxide's elvish template appends `before-chdir` unconditionally (`zoxide@86b443cffcd7:templates/elvish.txt:25`) |
| SH-ELV-06 cleanup | `install.elv:521,541,561` clean the temp dir on three of the paths | `install.elv:226,285,289` (exit with live `$tmpdir`) |

## AI-agent angle

What a coding agent characteristically gets wrong with nu and elvish, and the smallest mechanical check:

| Mistake | Why it happens | Smallest check |
|---|---|---|
| Stale 2023-24 nu: `let-env`, `def-env`, `date format`, `fetch`, `unfold`, `register`, `str collect` | training data predates 0.83-0.94 | `denylist-nu.sh DIR` (grep) then `nu-gate --strict` |
| `$nu.home-path` / `$nu.temp-path` (hard error on >= 0.110.0) | common in 2024-25 snippets | the same denylist (the gate does not run the code) |
| `str upcase`, `get -i`, `filter` (warn on >= 0.114.0 / 0.106.1) | still valid on older nu | `nu-gate` (dry `source` prints the warning) |
| 2026-new forms on a 2025 floor: `get --optional`, `str uppercase`, `try .. finally`, `$nu.home-dir` | the agent copies the newest docs | `denylist-nu-new.sh` + gate on the floor binary |
| `&&`, `\|\|`, `$?`, `$(..)`, `export X=`, heredocs, backticks, `2>&1` | bash habit | grep (SH-NU-09); backtick and heredoc are silent |
| Bare removed command that exists as a binary (`size`) | falls through | `nu-gate --strict` |
| `def run`, `def while` | helper names that became keywords (0.114-0.115) | gate (`name_is_keyword`) |
| `--allow '[a,b]'` list flags from the CLI | works on 0.110, fails on 0.114+ | run the script on floor and ceiling |
| `try { ^cmd }` expecting propagation; `exit` in a helper; trailing `rm -rf` | errexit-style thinking | cleanup plant/twin pattern (SH-NU-10), `grep -n -F -e 'exit '` review |
| Runtime `if (version ...) { source new.nu }` | the obvious guard | run on the floor: parse error |
| Elvish `except`, `float64`, `eawk`, `a=b cmd`, implicit `cd` | Elvish 0.1x training data | `elv-gate.sh` (compile + deprecation + denylist) |
| Elvish `$edit:` in a script, or `-compileonly` rejecting a valid rc | `edit:` is interactive-only | `--tolerate-edit` for rc files, `eval` for scripts |
| Elvish `tmp` at top level, `defer` at top level | the docs show them in a function | `-compileonly` / run (`defer must be called from within a closure`) |
| Assuming `trap`/signal cleanup in nu or elvish | bash habit | none: measured not available |
| Hallucinated flags (`get -o` on 0.105.1, `--ignore-errors`) | version-bound | the gate on the floor binary |

## Contested / evolving

- **Pin to latest vs a declared range for nu.** The release stream has no LTS. The position here is a declared `[floor, ceiling]` with both ends gated (as of 2026-10-11, 0.105.1..0.116.1). The opposing view ("emit only for the latest nu, document it") is zoxide's practice (floor 0.106.0 and moving). Trend: floors keep moving up about once a year (10 zoxide bumps in 6 years), so the declared floor is a decision to revisit each quarter.
- **`finally`.** Introduced 0.111.0 (2026-02-28) with documented "always runs" semantics; this study measured behaviour differences through 0.114.1 and a clean contract only from 0.116.0 (a patch the 0.111-0.115 tail did not get). Trend: converging; re-test on 0.117.
- **Pipefail and exit semantics** are an "experimental option" with opt-out (book) and a default since 0.111.0; the experimental flag can change again.
- **The book's own startup-order list contradicts its numbered list** (`login.nu` last vs step 23); measured order follows the numbered list on 0.105.1 and 0.116.1. Cite the measurement, not the overview.
- **Deprecation removal dates are now announced** (0.116.1: removal in 0.118.0 for `tui label --title`) but not for `str upcase`; the denylist should treat a warning as "removal pending".
- **Elvish is pre-1.0 but stable in the window**: no release after 0.21.0 (2024-08-14); the 0.22 draft is empty of breaking changes. The risk for emitted elvish is the interactive `edit:` API, not the language. The Windows rc path was not verified.
- **Whether `nu --ide-check` should ever exit non-zero** is an upstream design question, not a trend: the flag has exited 0 on every version measured (0.100.0..0.116.1).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.nushell.sh/blog/2025-09-02-nushell_0_107_0.html | Nushell 0.107.0 release post (primary) | 2025-09-02 | `env_change` before `pre_prompt`, `find` case-sensitive, `each` passes `null` |
| https://www.nushell.sh/blog/2026-01-17-nushell_v0_110_0.html | Nushell 0.110.0 release post (primary) | 2026-01-17 | `$nu.home-path`/`temp-path` renamed, `error make` `labels` |
| https://www.nushell.sh/blog/2026-02-28-nushell_v0_111_0.html | Nushell 0.111.0 release post (primary) | 2026-02-28 | `try .. finally`, pipefail by default, `finally` after `exit` |
| https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html | Nushell 0.114.0 release post (primary) | 2026-07-04 | `str upcase` deprecation, submodule imports, `catch` `details`, new `run` |
| https://www.nushell.sh/blog/2026-09-26-nushell_v0_116_0.html | Nushell 0.116.0 release post (primary) | 2026-09-26 | unified custom completions (breaking), `to yaml` flag |
| https://www.nushell.sh/blog/2025-02-04-nushell_0_102_0.html | Nushell 0.102.0 release post (primary) | 2025-02-04 | user autoload dir, `get` const (floor of the const guard) |
| https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-07-23-nushell_0_106_0.md | 0.106.0 post source (primary) | 2025-07-23 | `--ignore-errors` renamed `--optional`, unquoted path args |
| https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-10-15-nushell_v0_108_0.md | 0.108.0 post source (primary) | 2025-10-15 | `into value` -> `detect type` |
| https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2026-08-15-nushell_v0_115_0.md | 0.115.0 post source (primary) | 2026-08-15 | "Disallowed shadowing parser keywords" |
| https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2026-10-04-nushell_v0_116_1.md | 0.116.1 post source (primary) | 2026-10-04 | current release; deprecation removal dates |
| https://raw.githubusercontent.com/nushell/nushell.github.io/main/blog/2025-03-18-nushell_0_103_0.md | 0.103.0 post source (primary) | 2025-03-18 | `PROMPT_*` not inherited |
| https://www.nushell.sh/book/configuration.html | Nushell book: configuration and startup order (primary) | 2026 | numbered load order, scenario table, internal contradiction on `login.nu` |
| https://www.nushell.sh/book/stdout_stderr_exit_codes.html | Nushell book: exit codes, `complete`, pipefail option (primary) | 2026 | opt-out `pipefail`, `complete` |
| https://www.nushell.sh/book/pipelines.html | Nushell book: pipelines (primary) | 2026 | pipefail in pipelines |
| https://github.com/nushell/nushell/releases | nushell GitHub releases (primary; `gh api` read) | latest `0.116.1` 2026-10-04 | authoritative latest version |
| https://elv.sh/blog/0.21.0-release-notes.html | Elvish 0.21.0 release notes (primary) | 2024-08-14 | removals, `with`, `keep-if` |
| https://elv.sh/blog/0.18.0-release-notes.html and https://github.com/elves/elvish/blob/master/website/blog/0.20.0-release-notes.md | Elvish 0.18.0 and 0.20.0 notes (primary) | 2022-03-20, 2024-02-11 | `tmp`, `catch`, `except`/`float64` removal, `os:` module |
| https://elv.sh/ref/language.html | Elvish language reference (primary) | 0.21 era | `try`/`catch`/`finally`, `tmp`, `with` |
| https://elv.sh/ref/builtin.html | Elvish builtin reference (primary) | 0.21 era | `defer`, `resolve`, `has-key` |
| https://elv.sh/ref/command.html | Elvish command reference (primary) | 0.21 era | `-compileonly`, `-json`, `-norc` |
| https://elv.sh/ref/edit.html | Elvish `edit:` module reference (primary) | 0.21 era | interactive-only editor API |
| https://github.com/elves/elvish/releases | elvish GitHub releases (primary; `gh api` read) | latest `v0.21.0` 2024-08-14 | no newer release |
| `ajeetdsouza/zoxide@86b443cffcd7:CHANGELOG.md`, `templates/nushell.txt`, `templates/elvish.txt` | exemplar: nu and elvish emitter with 10 version pins | 2026 clone | the cost of a moving target; idempotent hook marker |
| `nushell/nu_scripts@4033ddf35966` (via [exemplar-shape.md](../shell-audit/exemplar-shape.md)) | exemplar corpus: 4.5% version drift | 2026-10-10 | measured churn |
| `www-setup@a251c3631047:src/install.nu`, `src/install.elv`; `ocx@d0cdf8838:crates/ocx_setup/src/shims.rs`, `profiles.rs` | fleet installers and emitter (read only) | 2026-10-11 | cleanup defects, tail-in-try note, regression test |
| [shell-emit.md](../shell-emit.md) (SH-EMIT-06/27/28/30) and [shell-topic-map/failure.md](../shell-topic-map/failure.md) section 13 | wave-2 consolidation and wave-1 measurement | 2026-10 | reused facts, not re-derived |
| `FX/stale-results.txt`, `ide-results.txt`, `probes/probe-results*.txt`, `elv-results.txt`, `verify-all.out`, `verify-extra.out` | this study's raw runs | 2026-10-11 | every table above regenerates from `verify-all.sh` and `verify-extra.sh` |
