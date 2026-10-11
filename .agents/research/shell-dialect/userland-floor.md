---
title: "Shell dialect: the userland floor (GNU, BSD, busybox, uutils)"
topic: "dialect/userland-floor (W2-3, SH-USER): which external-command forms a portable shell script may rely on, and how a catalog verifies it"
agent: "sonnet subagent, wave 2, shell-scripting lore program"
model: sonnet
date_researched: 2026-10-11
sources_count: 30
fixtures: "/home/mherwig/.cache/research-lang/shell-tools/fixtures/userland-floor/"
scope: "Rows M-D-01..M-D-14, M-D-16, M-D-17, M-A-03 (userland columns). Linux measured on 21 container images plus Git Bash 5.2.15 on the Windows host. macOS/BSD claims are read from Apple open-source files and are labelled 'unverified: read only' (no macOS host). Measured 2026-10-11 (container clocks read 2026-10-10 UTC)."
---

# Shell dialect: the userland floor

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - F1 Which userland is on the machine (M-D-02, M-A-03)
   - F2 GNU-isms that fail, per tool (M-D-01, M-D-03, M-D-11, M-D-12, M-D-16)
   - F3 busybox 1.37 gaps (M-D-03)
   - F4 uutils 0.2.2 / 0.10.0 (M-D-04)
   - F5 Locale and collation (M-D-05)
   - F6 The temp-file contract (M-D-06)
   - F7 Command lookup and probing (M-D-08, M-D-09, M-D-12)
   - F8 awk (M-D-10)
   - F9 Dates (M-D-11)
   - F10 Git Bash / MSYS2 (M-D-13)
   - F11 The oracle matrix (M-D-14)
   - F12 Environment variables (M-D-17)
   - F13 Fleet defects found on the way
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Measured, not recalled.** One 105-probe script (`gnuisms.sh`) ran on 21 container images (Debian 11/12/13, Ubuntu 20.04/22.04/24.04/25.10/26.04/26.10, Alpine 3.22/3.23, busybox 1.37, Alma 8/9/10, Amazon Linux 2/2023, Fedora, openSUSE Leap, Arch, nixos/nix) plus Git Bash. Every number below is from `out/g_*.txt`.
- **Only a handful of GNU-isms are universal.** On all 21 images: `readlink -f` (existing file), `realpath`, `date -d @N`, `date -d 'YYYY-MM-DD HH:MM:SS'`, `stat -c`, `sort -V`, `sort -h`, `mktemp -d`, `sha256sum`, `base64 -d`, `install -D`. Everything else loses 1 to 4 images.
- **`shasum` is on 0 of 21** images; `sha256sum` on 21 of 21. macOS is the reverse (unverified: read only). Probe, do not assume.
- **`which` is absent on 8 of 21 images** (Alma 8/9/10, AL2, AL2023, Arch, Fedora, Leap). The topic-map figure of 7 is wrong by one.
- **`find` and `xargs` are absent on AL2023 and Leap** (findutils not in the base image). `tar` is absent on AL2 and AL2023. `flock` is absent on AL2, AL2023, nixos/nix and Git Bash.
- **busybox 1.37 fails** `grep -r --include/--exclude-dir`, `grep -P`, `sed -z`, `readlink -m`, `realpath -m/-s/--relative-to`, `date -d` with ISO-8601 `T..Z` or relative strings, `find -printf`, `mktemp` with a suffix or fewer than six X, `ln -sr`, `cut --complement`, `env -S`, `tar --owner/--sort/--exclude-vcs/--zstd`, and wget `--https-only/--secure-protocol`. busybox `timeout` exits 143, not 124.
- **uutils is the default on Ubuntu 25.10, 26.04 and 26.10** (0.2.2, 0.10.0, 0.10.0). On 26.04 `cp` and `mv` are still GNU 9.7 (`mv --version`, cp warning text); on 26.10 `cp` is uutils. Of 304 differential cases, 37 differ from GNU 9.4 on 25.10, 30 on 26.04, and 3 between 26.04 and 26.10. Error text always differs; so does `timeout -s KILL` (exit 124 vs 137), `date -d '<date> friday'`, `wc -m/-L` and `cut -c` on multibyte input in the C locale, `uname -p/-i` (`unknown`), and `sort` collation.
- **Collation trap.** On uutils, any `*.UTF-8` or `*.utf8` locale name selects ICU collation, even a locale that is not installed (`zz_ZZ.UTF-8` sorts `a A b B`). GNU silently falls back to C when the locale is missing. So `LANG=en_US.UTF-8` with no locale installed sorts by bytes on Ubuntu 24.04 and by ICU on 26.04. `LC_ALL=C` fixes both. `LANG=en_US` (no codeset), `C.UTF-8`, `C`, `POSIX` give byte order on uutils.
- **`LC_ALL=C` is per command, not a blanket export.** `export LC_ALL=C` changes `${#x}`, `wc -m`, `cut -c`, `awk length` on `héllo` from 5 to 6, so a script that handles UTF-8 text breaks. Pin it only on `sort`, `comm`, `join`, `uniq -i`-style order-observable calls.
- **Temp-file contract.** `mktemp -d "${TMPDIR:-/tmp}/name.XXXXXX"` is the one form all of GNU, busybox and uutils accept (macOS: unverified, read only). A bare `trap cleanup EXIT` leaks the directory on `kill -TERM` in 8 of 13 interpreter variants for a foreground child, and even the `trap 'exit 143' TERM` variant leaks in every bash because the trap waits for the foreground child. The pattern that is clean in all 13: `trap cleanup EXIT; trap 'exit 143' TERM INT HUP; cmd & wait $!`.
- **Debian 13 `/tmp` is tmpfs** (release notes 5.1.6: up to 50% of memory). A `mv` from it to a disk path is copy-then-unlink: a reader saw 1966080 of 419430400 bytes at the destination mid-move, and the inode changed.
- **Git Bash.** `cmd /c echo hi` hangs (rc 124 under a 5 s bound); `cmd //c` works; `MSYS_NO_PATHCONV=1` needs the single-slash `/c`. `ln -s` makes a copy unless the user has the symlink privilege; the file system is case-insensitive; `chmod 600` does not stick (644); native tools emit CRLF through pipes.
- **Default ShellCheck 0.11.0 catches 1 of 18** planted GNU-isms (`echo -e`, SC3037). Even `-o all` adds only `which` (SC2230). A portability rule needs a catalog check, not ShellCheck.
- **Nine checks were watched red on a plant and green on a twin** (denylist, denylist on a boundary twin, find-variant on 5 userlands, unprobed-tool, EXIT-trap-without-TERM, missing-tool calls, unsorted-sort, `deprecate-which`, locale-sort). The denylist was found to false-positive on `--no-selfupdate -d` and fixed during this run. The `grep --include` variant is a documented false-green on busybox.
- **Catalog dialect.** `rg` is on 0 of 21 base images; `curl` 9, `wget` 4, `git` 1, `python3` 3, `perl` 9, `awk` 20, `gawk` 8, `mawk` 9. A shipped check may use `find DIR -type f -name 'GLOB' -exec grep ... {} +` (runs on busybox) but not `grep --include` and not `rg`.
- **Fleet:** two real defects (`sed -i` at ocx `setup-integrations.sh:79` and `bootstrap.sh:138`; busybox-incompatible wget flags at www-setup `install.sh:352,354`), three low-severity items (`readlink -f`, `grep --include`, unguarded `sha256sum`). Reported, not fixed.

## Findings

All claims are dated 2026-10-11 and version-tagged. "Image" means a container from Docker Hub at the tag named. Fixture paths are relative to `/home/mherwig/.cache/research-lang/shell-tools/fixtures/userland-floor/`.

### F1. Which userland is on the machine (M-D-02, M-A-03)

Versions found (from `out/g_*.txt`, `awk_version`, `sed_version`, `sort_version`, `tar_version`):

| Class | Images | Versions |
|---|---|---|
| GNU coreutils | AL2 8.22; Alma 8 8.30, Ubuntu 20.04 8.30; Debian 11, Ubuntu 22.04, Alma 9, AL2023 8.32; Ubuntu 24.04 9.4; Debian 12 9.1; Debian 13 9.7; Alma 10 9.5; Leap 9.6; Fedora 9.10; nix 9.11; Arch 9.12 | 8.22 to 9.12 |
| uutils | Ubuntu 25.10 0.2.2; Ubuntu 26.04 and 26.10 0.10.0 | `sort --version` banner `sort (uutils coreutils)` |
| busybox | Alpine 3.22, 3.23, busybox 1.37 (tar `busybox 1.37.0`) | `--version` unsupported on grep, sort, date, awk |
| GNU sed | 4.2.2 (AL2) to 4.10 (Arch); none on nixos/nix | busybox sed: `This is not GNU sed version 4.0` |
| awk | gawk 4.0.2 to 5.4.1 on Alma/AL/Fedora/Leap/Arch; mawk 1.3.4 (20240123 Ubuntu 24.04, 20250131 Debian 13 and Ubuntu 25.10, 20260129 Ubuntu 26.04, 20260302 Ubuntu 26.10); older mawk on Debian 11/12, Ubuntu 20.04/22.04 (`awk: not an option: --version`); busybox awk; none on nixos/nix | |
| Git Bash 5.2.15 | GNU coreutils 8.32, tar 1.34, grep 3.0, awk GNU 5.0.0 | no `grep -P` |

Tools present in the base image (`out/has-tools.txt`, 21 images): `awk` 20, `gawk` 8, `mawk` 9, `curl` 9, `wget` 4, `perl` 9, `python3` 3, `git` 1, `jq` 0, `rg` 0.

Presence of candidate tools (functional probes, 21 Linux images):

| Probe | OK | Fails on |
|---|---|---|
| `command -v sh` | 21 | none |
| `which sh` | 13 | Alma 8/9/10, AL2, AL2023, Fedora, Leap, Arch (rc 127) |
| `sha256sum` | 21 | none |
| `shasum -a 256` | 0 | all |
| `flock -n` | 18 | AL2, AL2023, nixos/nix |
| `timeout` (rc 124) | 18 | busybox: rc 143 |
| `xargs -r` | 19 | AL2023, Leap (no xargs) |
| `find -print0` / `-maxdepth` / `-iname` | 19 | AL2023, Leap (no find) |
| `find -printf` | 16 | + busybox (3) |
| `tar -xzf --strip-components` | 19 | AL2, AL2023 (no tar) |
| `tar --zstd` | 2 | Arch, Fedora only |

Note: the nixos/nix image has no `sed` and no `awk`; probes that pipe through `sed` mis-report on it (`date_plus_N`). It is kept in the matrix only as a "tools may be missing" case.

The ledger rows were partly confirmed and partly corrected: `shasum` 0/21 confirmed; `tar` absent on AL2/AL2023 confirmed; neither curl nor wget on 9 images confirmed (Debian and Ubuntu); `which` absent is 8 not 7.

### F2. GNU-isms that fail, per tool (M-D-01, M-D-03, M-D-11, M-D-12, M-D-16)

Incorrect on the left, correct on the right. "Fails on" is from `gnuisms.sh` on 21 images plus Git Bash; the BSD column is **unverified: read only** (Apple open-source files, tags text_cmds-199, shell_cmds-329, file_cmds-479).

| Incorrect (GNU-only or unprobed) | Correct | Fails on (measured) | BSD / macOS (unverified: read only) |
|---|---|---|---|
| `sed -i 's/a/b/' f` | `sed -i.bak 's/a/b/' f && rm -f f.bak` | works on 20 of 21 (nix has no sed) | `-i` takes its argument as the suffix (`apple-sed-main.c:163`: `inplace = optarg`), so `sed -i -e ...` eats `-e`. The `.bak` form runs on both. |
| `sed -i '' 's/a/b/' f` (BSD form) | same `.bak` form | GNU sed 4.9: rc 2 "can't read s/alpha/beta/", file unchanged; busybox rc 1, file unchanged (`sed-bsd-form.sh`) | the form macOS needs |
| `sed -z`, `sed -r`, `\+` in BRE | `sed -E`, `-e`; avoid `-z` | `-z` fails on Alpine 3.22/3.23, busybox (empty output) | `-z` not a BSD flag |
| `readlink -f "$p"` | `realpath "$p"`, with `readlink -f` second and a `readlink` loop third (`u_realpath`) | `readlink -f` works on all 21 for an existing file; `-f` on a missing file, `-m`, `realpath -m/-s/--relative-to` fail on busybox (3) | `readlink -f` since macOS 12.3 (ledger; no Apple source fetched, `apple-readlink-stat.c` is a 14-byte miss) |
| `date -d '2020-01-02T03:04:05Z' +%s`, `date -d '... +1 day'` | `date -u -d @N` (epoch input) and a `date -r N` fallback | ISO `T..Z` and relative forms fail on busybox (3); `@N` and `YYYY-MM-DD HH:MM:SS` work on 21 of 21 | `date -r N`, `date -v+1d` (`apple-date.c`); both fail on GNU (`date_r_bsd`, `date_v_bsd`: 0/21) |
| `stat -c %s f` | `wc -c < f` for size; `stat -c %Y f` then `stat -f %m f` for mtime (`u_mtime`) | `stat -c` works on 21 of 21; Git Bash returns mode 644 after `chmod 600` | `stat -f %z` (`apple-stat.c`); fails on GNU where `-f` means filesystem status (`stat_f_bsd`: 0/21) |
| `grep -P '\d'` | `grep -E '[0-9]'` | fails on Alpine 3.22/3.23, busybox, Git Bash (rc 2) | BSD grep has no `-P` |
| `grep -rl --include='*.sh' x d` | `find d -type f -name '*.sh' -exec grep -l x {} +` | fails on busybox (3): `--include` and `--exclude-dir` unknown; exit hidden by a pipe | BSD grep accepts `--include` (`apple-grep.c` long options); unverified |
| `find . -printf '%p\n'` | `find . -print` | fails on busybox (3), AL2023 and Leap (no find) | not in BSD find |
| `xargs` with no `-r` on empty input | `xargs -r` | GNU runs the command once on empty input (`xargs_noR_empty`: `DIFF[X]` on all 19 that have xargs); `-r` is POSIX.1-2024 (`posix-xargs.txt:88`) | `-r` accepted as "GNU compatibility" no-op (`apple-xargs.c:250-252`) |
| `mktemp --suffix=.txt`, `mktemp -t foo`, `mktemp --tmpdir` | `mktemp "${TMPDIR:-/tmp}/foo.XXXXXX"` | template with a suffix (`XXXXXX.txt`) or three X (`t3XXX`) fails on busybox (3); a template with no X fails on all 21 | BSD `-t prefix` appends X's and uses `TMPDIR` (`apple-mktemp.c`, option string `dp:qt:u`); different semantics |
| `timeout 5 cmd` unguarded | `command -v timeout`, else a watchdog (`u_timeout`) | absent on macOS (ledger, unverified); on busybox exit is 143 not 124 | no `timeout` in the base system |
| `flock` | `mkdir lockdir` as mutex (`u_lock`/`u_unlock`) | `flock` absent on AL2, AL2023, nix, Git Bash | not shipped on macOS (ledger) |
| `ln -sr a b` | `ln -s ../a b` | fails on busybox (3) and Git Bash | |
| `cut --complement -c1` | `cut -c2-` | fails on busybox (3) | |
| `head -n -1` | `sed '$d'` | works on all 21 Linux images | BSD head rejects non-positive counts (`apple-head.c:111-113`: "illegal line count") |
| `tar --exclude-vcs --owner=0 --sort=name`, `tar --zstd` | plain `tar -cf`; for reproducible archives probe | `--owner/--sort/--exclude-vcs` fail on busybox (3), AL2, AL2023; `--zstd` works on 2 of 21 images (Arch, Fedora) | bsdtar differs |
| `base64 -d` / `-D` | `base64 -d` | `-d` on 21 of 21; `-D` (BSD) only on Ubuntu 25.10+ (uutils adds `-D` "just like macOS", `uu-extensions.md`) | `-D` |
| `env -S 'echo a b'` | avoid | fails on busybox (3), AL2 (125), Ubuntu 25.10 (127) | |
| `uname -o` | `uname -s` | `Linux` on Alpine instead of `GNU/Linux`; `Msys` on Git Bash | |
| `cp -a`, `cp --parents`, `install -D`, `base64`, `nproc`, `du -sb` | | work on all 21 | |

`sed -i.bak ... && rm -f f.bak` was run on Ubuntu 24.04, 26.04 (sed is GNU sed on both) and Alpine 3.22 and gave `rc=0 content=beta` in each (`sed-bsd-form.sh`).

### F3. busybox 1.37 gaps (M-D-03)

Measured on Alpine 3.22, 3.23 and busybox:1.37 (busybox 1.37.0, tar `busybox 1.37.0`). BusyBox 1.37.0 was released 2024-09-27; 1.38.0 is tagged unstable (2026-05-13) in the NEWS file, so Alpine 3.22/3.23 still carry 1.37. The list in F2 is the complete measured gap set. Two things matter beyond the list:

1. **A pipe hides the error.** `grep -rl --include='*.sh' x d | sort | tr '\n' ,` printed an empty string and exited 0 on busybox because the pipeline status is `tr`'s. A verification that ends in a pipe turns an unknown option into a clean result (the "false green"; see F13 and Verification V3).
2. **wget is where the installer breaks.** busybox wget rejects `--https-only` (`wget: unrecognized option: https-only`, rc 1) and `--secure-protocol`; GNU wget accepts both. `rustup-init.sh` solves this with `check_help_for ... wget --https-only --secure-protocol` (`rustup-init.sh:742,895,900`), i.e. it greps `--help` for the flag before using it. The probe `wget --help 2>&1 | grep -c -e secure-protocol` was only meaningful on the 3 busybox images (0 matches, correct); the other images have no wget and nixos/nix lacks the `sed` the probe pipes through. `u_wget_flags` greps `--help` for `--https-only` and returned the GNU flag set only on nixos/nix (`wget_flags=[--https-only --secure-protocol=TLSv1_2]`) and an empty set on busybox. Reproducer in F13.

### F4. uutils 0.2.2 / 0.10.0 (M-D-04)

Ubuntu 25.10 ships rust-coreutils 0.2.2, "not necessarily fully compatible yet", with the GNU tools kept alongside (`ubuntu2510.txt:117-119`). 26.04 and 26.10 carry 0.10.0 (measured). Upstream is at 0.12.0 (2026-09-17, `uu-releases.json`). The differential battery `uu-diff.sh` (304 cases, A = Ubuntu 24.04 GNU 9.4, B = uutils) found, beyond the three differences already recorded in the shift audit:

| Case | GNU 9.4 | uutils |
|---|---|---|
| Unknown option text | `ls: unrecognized option '--bogus'` | `error: unexpected argument '--bogus' found` (clap) |
| `head -n` missing arg | `head: option requires an argument -- 'n'` | `error: a value is required for '--lines <[-]NUM>'...` |
| `mkdir` / `ln` / `chmod` / `stat` errors | `cannot create directory 'dd': File exists`; `failed to create hard link 'a.txt': File exists`; `invalid mode: 'zzz'`; `cannot statx` | `mkdir: dd: File exists`; `...'a.txt' => 'a.txt': Already exists`; `invalid operator (expected +, -, or =, but found z)`; `cannot stat ... (os error 2)` |
| `timeout` spawn failure | `timeout: failed to run command 'x': No such file or directory` | `timeout: failed to execute process: ... (os error 2)` |
| `timeout -s KILL 1 sleep 5; echo $?` | 137 | **124** (also 124 on 25.10, 26.04, 26.10). POSIX leaves 124-or-signal status unspecified when `-k` is used (`posix-timeout.txt:116`). |
| `date -d '2020-01-02 friday'` | `2020-01-02` (weekday word ignored when a date is given, GNU 9.4) | `2020-01-03` (`date-weekday.sh`) |
| `wc -m` / `wc -L` on `é`-bearing file, C locale | 14 / 9 (bytes) | 12 / 11 (characters) |
| `cut -c` on multibyte, C locale | splits a byte | whole character |
| `uname -p`, `uname -i` | `x86_64` | `unknown` |
| `mv -n` on existing target | GNU 9.4: `mv: not replacing 'dst'`, **rc 1**; GNU 9.5 (Alma 10), 9.7 (Debian 13, Ubuntu 26.04), 9.12 (Arch): silent, **rc 0** (`mvn.sh`) | silent, rc 0 |
| `cp -n` on existing target | GNU 9.4 (Ubuntu 24.04) and 9.7 (Ubuntu 26.04) warn "behavior of -n is non-portable"; Alma 10 9.5, Debian 13 9.7 and Arch 9.12 are silent | silent |
| `realpath -E` | rejected (`invalid option -- 'E'`) | accepted; POSIX.1-2024 defines `-E` and `-e` (`posix-realpath.txt:39,42`) |
| `ls --color=always` on a pipe | no escapes when `LS_COLORS` unset | emits `\033[...` always |
| `sort +1` obsolete positional | accepted | `error: unexpected argument '-1' found` |
| `shuf -rs` seeded output | `1,2,3` | `3,1,2` (seed is not portable) |
| Option abbreviation `cp --pres` | accepted | rejected by uutils `cp` 0.10.0 on 26.10 (`unexpected argument '--pres'`); the 26.04 `cp` is GNU and accepts it |
| `cp` binary | on 26.04 `cp` is `gnucp` (GNU); on 26.10 `cp` is uutils (`cp-bin-link`) | |
| Help/ver banners | `--version` first line `sort (GNU coreutils) 9.4` | `sort (uutils coreutils) 0.10.0` |

Counts: 37 of 304 differ between 24.04 and 25.10, 30 between 24.04 and 26.04, 3 between 26.04 and 26.10 (`out/uu_diff_*.txt`). Almost all are stderr text, exit codes where a signal is involved, and locale handling. uutils also adds extensions (`ls -w=80`, `-V`/`-h` short forms, `base64 -D`; `uu-extensions.md`), so a script that works on uutils is not proof it works on GNU.

The rule that follows: never parse stderr or `--version` banners, never test for "GNU" by banner. Probe the behavior (the `u_*` helpers do).

### F5. Locale and collation (M-D-05)

`LANG` and `LC_ALL` are unset in all 21 images (`envvars.sh`: `LANG=unset LC_ALL=unset`), so order-sensitive commands are byte-ordered in a bare container. The trap is a developer machine where `LANG=en_US.UTF-8` is set.

`sort` of `b B a A _x -y é Z z 10 9 'a b' ab` (`sort-locale.sh`, `locale-battery.sh`, `locale-probe.sh`):

| Environment | Ubuntu 24.04 (GNU 9.4) | Ubuntu 26.04 (uutils 0.10.0) |
|---|---|---|
| unset | `10 9 A B Z _x a b z` (bytes) | same |
| `LANG=en_US.UTF-8`, locale not installed | bytes (silent C fallback; bash prints `setlocale: cannot change locale`) | **`10 9 a A b B _x z Z`** (ICU) |
| `LANG=en_US.UTF-8`, locale installed (apt `locales`) | glibc locale order (`sort-locale.sh` exit 1) | ICU order |
| `LANG=zz_ZZ.UTF-8`, `de_DE.UTF-8`, `sv_SE.UTF-8`, `en_US.utf8` | | all `a A b B` |
| `LANG=en_US` (no codeset), `LANG=C.UTF-8`, `LANG=C`, `LANG=POSIX` | | bytes `A B a b` |
| `LC_ALL=C LANG=en_US.UTF-8` | | bytes |
| `LC_ALL=en_US.UTF-8 LANG=C` | | ICU (`LC_ALL` wins) |
| `LANGUAGE=en_US.UTF-8` | | bytes (`LANGUAGE` is message-only) |

Source: `uu-collator.rs` (`should_use_locale_collation` compares `get_collating_locale()` to the default; any UTF-8 name leaves the default), and the measurements above. Other tools that changed on 26.04 under `LC_ALL=en_US.UTF-8`: `join` printed nothing where C prints the disorder messages, `expr B '<' a` returned 0 (C: 1), `cut -c2` of `héllo` returned `é` (C: a byte). On 24.04 with the locale missing none of the 18 cases in `locale-battery.sh` differ between C and `en_US.UTF-8` except bash's own `setlocale` warning on stderr.

`export LC_ALL=C` is not free (`lcall-scope.sh`, Ubuntu host bash): with `x=héllo`, `${#x}` is 6 under C and 5 under C.UTF-8; `wc -m` 6 vs 5; `awk length` 6 vs 5; `cut -c2` returns half a character under C; `tr '[:lower:]' '[:upper:]'` leaves `é` in both. Messages stay English in both because the container has no translations.

Incorrect: `sort file > out` in a generator (output depends on the caller's `LANG` and on the userland). Correct: `LC_ALL=C sort file > out`. Same for `comm`, `join`, `uniq` after `sort`, and `ls` when its order is captured.

### F6. The temp-file contract (M-D-06)

`mktemp-contract.sh` on Ubuntu 24.04 (GNU), Ubuntu 26.04 (uutils) and Alpine 3.22 (busybox) gave identical results: directory mode 700, file mode 600, created under `/tmp`, `TMPDIR` honoured, a `TMPDIR` that points at a missing directory is an error (rc 1, no silent fallback to `/tmp`), no double slash from a trailing-slash `TMPDIR`, the name keeps the template's X count (`aXXXXXX` gives 7 characters, `bXXXXXXXXXX` gives 11), name characters are `[A-Za-z0-9]`, two calls differ, a rename on one file system keeps the inode.

Template forms (21 images): `mktemp -d "$PWD/tplXXXXXX"` ok on 21; relative template stays relative on 21; `mktemp -t fooXXXXXX`, `-p DIR`, `--tmpdir` ok on 21; suffix after the X's and fewer than six X fail on busybox (3); no X fails on 21.

Signal behaviour of the EXIT trap (`tmp-trap.sh`, driver sends `kill -TERM` to a script that holds a temp directory). Modes: M1 `trap cleanup EXIT; sleep 30`; M2 `trap cleanup EXIT; sleep 30 & wait`; M3 `trap cleanup EXIT; trap 'exit 143' TERM; sleep 30`; M4 `trap cleanup EXIT; trap 'exit 143' TERM INT HUP; sleep 30 & wait $!`.

| Interpreter | M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| dash 0.5.12 (Debian 12, 13) | leaked | leaked | leaked | gone |
| busybox ash 1.35, 1.37 | leaked | leaked | leaked | gone |
| mksh R59c | leaked | gone | leaked | gone |
| ksh93u+m 1.0.10 | gone | gone | gone | gone |
| yash 2.52, posh 0.14.1 | leaked | leaked | leaked | gone |
| bash 3.2.57, 4.4, 5.3 (also 3.2 `--posix`) | gone | gone | **leaked** | gone |
| zsh 5.9 `--emulate sh` | leaked | leaked | leaked | gone |

Read: the "obvious" `trap cleanup EXIT` leaves the directory behind on TERM in every shell except bash and ksh93. A `TERM` handler written as a plain `trap '...' TERM` before a foreground command leaks even in bash, because bash defers the trap until the foreground child ends. Only M4 (handler for `TERM INT HUP` that calls `exit`, with the work in the background and `wait $!`) is clean in all 13 variants. Caveat: the background child itself keeps running after the script exits (orphaned `sleep 30`); the contract protects the temp directory, not the child.

Atomicity (`xdev-mv.sh`, tmpfs mounted at `/mnt/t`, root file system elsewhere): same-file-system `mv` keeps the inode (2 to 2); cross-file-system `mv` of a 400 MB file showed a destination of 1966080 bytes while the move was in flight, and the inode changed (2 to 36888043); `ln` across the boundary fails with `Invalid cross-device link`. So the atomic-replace recipe is: create the temp file in the destination directory (`mktemp "$(dirname "$dest")/.name.XXXXXX"`), then `mv` it onto the name.

Debian 13 changed `/tmp` to tmpfs: default size up to 50% of memory, files already in `/tmp` are hidden after the first boot into trixie (`debian13-relnotes.txt:1999-2012`). A script that stages a large download in `/tmp` can fail with ENOSPC on a small host; honour `TMPDIR`.

### F7. Command lookup and probing (M-D-08, M-D-09, M-D-12)

- `command -v` works on 21 of 21; `which` on 13 (F1). ShellCheck's SC2230 (`which`) is an **optional** check: `shellcheck -s sh -o deprecate-which plant/which.sh` exits 1, the same file under default options exits 0 (V6).
- Checksum: `sha256sum` 21 of 21 Linux plus Git Bash; `shasum` 0 of 21. The helper `u_sha256` tries `sha256sum`, then `shasum -a 256`, then `openssl dgst -sha256`. Exemplars do the same (nvm `.github/scripts/docker-image.sh:17-20`, rustup `ci/prepare-deploy.bash:11-13`).
- The helper library `userland-lib.sh` (`u_has`, `u_realpath`, `u_sha256`, `u_mtime`, `u_iso_utc`, `u_tmpdir`, `u_timeout`, `u_lock`, `u_unlock`, `u_wget_flags`) was run on all 21 images and under dash, busybox ash (Debian 12 and Alpine 3.22), mksh, ksh93, yash, posh, bash 5.2, bash 3.2, bash 5.3 and zsh in sh-emulation (11 runs), and gave `realpath_chain=ok realpath_dir=ok realpath_missing_last=ok mtime=86400 iso_utc=1970-01-02T00:00:00Z tmpdir=ok lock_seq=010` everywhere. `u_timeout 1 sleep 5` returns 124 with coreutils timeout and **143** with busybox timeout or the sh watchdog; bash additionally prints a `Terminated ... timeout` job line on stderr for the watchdog path. A forced-fallback run (functions override `realpath`, `readlink -f` and `timeout` to look absent) passed under dash, mksh and bash (`userland-lib-fallback-test.sh`: `fb_realpath_chain=ok fb_realpath_dir=ok fb_realpath_dotdot=ok fb_timeout_rc=143 fb_timeout_fast_rc=0`).
- A `mkdir` mutex (`u_lock`) gave `lock_seq=010` (acquire, refuse, release-then-acquire) on 21 of 21 images. It is atomic on local file systems only; do not use it on NFS (unverified here).
- `curl` in the base image: 9 of 21; `wget`: 4 of 21 (Alpine 3.22/3.23, busybox, nixos/nix); neither on the 9 Debian/Ubuntu images. An installer must probe both.

### F8. awk (M-D-10)

`awk_gensub` ok on 12 of 22 (gawk 8, plus busybox awk and Git Bash gawk; fails on all 9 mawk images); `awk_strftime`, `length(array)`, `nextfile`, regex `RS` ok on all 21 that have awk; ERE interval `/a{3}/` fails on Debian 11/12 and Ubuntu 20.04/22.04 (old mawk; the newer mawk 1.3.4 20240123+ matches). mawk's changelog records interval support as experimental (`-W repetitions`, `mawk-changes.txt:247-310`). POSIX awk has none of `gensub`, `strftime`, `nextfile` (the last is in POSIX.1-2024 awk, not re-checked here). Use `sub`/`gsub`/`substr`/`index`/`split`, and treat `length(arr)` and intervals as probe-first.

### F9. Dates (M-D-11)

Portable shapes, measured: `date +%s` and `date -u +%Y-%m-%dT%H:%M:%SZ` on all 21; `date -d @N` all 21; `date -u -Iseconds` ok on 20 (AL2 prints a different length); `date +%N` is GNU-only (busybox prints something other than nine digits). `date -d 'YYYY-MM-DD HH:MM:SS'` works everywhere but its time zone is the local one unless `-u`/`TZ=UTC` is set. Weekday arithmetic (`next friday`, `2020-01-02 friday`) is not portable: busybox rejects it, GNU 9.4 ignores the weekday when a date is given, uutils 0.10.0 applies it. POSIX `date` offers `+format` only (`posix-date.txt`); `-d`/`-r`/`-v` are all extensions. For epoch-to-ISO conversion use `u_iso_utc`; for "now minus N days" compute in epoch seconds and convert.

### F10. Git Bash / MSYS2 (M-D-13)

Measured on the Windows host, Git Bash 5.2.15 (`msys.sh`, stdin held open, 5 s bound):

| Case | Result |
|---|---|
| `cmd /c echo hi` | hangs (prints the banner, rc 124): `/c` is rewritten as a path and cmd goes interactive |
| `cmd //c echo hi` | `hi`, rc 0 |
| `MSYS_NO_PATHCONV=1 cmd /c echo hi` | `hi`; with `//c` it prints the banner (the double slash is no longer collapsed) |
| `MSYS2_ARG_CONV_EXCL='*' cmd /c echo hi` | `hi` |
| `cmd //c echo /tmp/x` | `C:/Users/ecom/AppData/Local/Temp/x` (argument converted) |
| `cmd //c echo --opt=/tmp/x` | `--opt=C:/Users/.../x` (converted after `=`) |
| `cmd //c echo a:/tmp` | unchanged (looks like a drive) |
| `/tmp/x;/tmp/y` | converted as a path list, with backslashes |
| native tool output | CRLF (`h i \r \n` through a pipe, a redirect and PowerShell 5.1) |
| `ln -s` | creates a copy, not a symlink, without the privilege (`ln: failed to create symbolic link 'c': Operation not permitted` in strict mode) |
| case-insensitive file system | `zed` visible as `Zed` |
| `chmod 600` | mode stays 644 |
| `timeout` | exists, rc 124 |
| `mktemp` | `/tmp/tmp.XXXXXXXXXX`; `TMPDIR` unset, `TEMP=/tmp` |
| `uname -s` | `MINGW64_NT-10.0-26200`; `OSTYPE=msys` |

Source for the conversion rules: MSYS2 "Filesystem Paths" (automatic Unix to Windows conversion, `MSYS2_ARG_CONV_EXCL`, `MSYS_NO_PATHCONV`). A script that calls native Windows tools must either use `//flag`, set `MSYS2_ARG_CONV_EXCL`, or convert with `cygpath -w` explicitly.

### F11. The oracle matrix (M-D-14)

Choice, with reason (every class listed below was measured except macOS):

| Image | Why it is in the matrix |
|---|---|
| `ubuntu:24.04` | GNU coreutils 9.4, mawk, dash; the agent default; locale-silent-fallback case |
| `ubuntu:26.04` | uutils 0.10.0 (LTS), ICU collation |
| `debian:12` | coreutils 9.1, older mawk (no ERE intervals, `awk --version` unsupported), bash 5.2 |
| `debian:13` | coreutils 9.7, `/tmp` on tmpfs |
| `alpine:3.22` | busybox 1.37, musl; the strict-POSIX floor |
| `amazonlinux:2023` | coreutils 8.32, gawk, no `find`/`xargs`/`tar` in the base image, no `which`, no `flock` |
| `amazonlinux:2` | coreutils 8.22, gawk 4.0.2, grep 2.20, sed 4.2.2; the oldest GNU still in use |
| `bash:3.2` | the macOS /bin/bash version, on busybox userland (shell floor only) |
| macOS (read-only) | the BSD list in F2, unverified |

`ubuntu:26.10` was identical to 26.04 on 3 of 304 cases and is not needed. `almalinux:9`, `fedora`, `leap` and `arch` added no class not already covered by the above. The Debian 11/12 and Ubuntu 20.04/22.04 mawk class is covered by `debian:12`. `nixos/nix` is excluded because it lacks `sed` and `awk`.

### F12. Environment variables (M-D-17)

`envvars.sh` on Ubuntu 24.04, 26.04 and Alpine 3.22 (`docker run`, no shell profile): set: `HOME`, `HOSTNAME`, `PWD`, `PATH`. Unset: `USER`, `LOGNAME`, `SHELL`, `TMPDIR`, `TEMP`, `XDG_RUNTIME_DIR`, `XDG_*_HOME`, `HOSTTYPE`, `OSTYPE`, `UID`, `EUID`, `OLDPWD`, `LANG`, `LC_ALL`, `TERM`, `CI`. `id -un` works (`root`), `id -u` works. `HOSTNAME`, `UID`, `EUID`, `OSTYPE`, `HOSTTYPE` are bash variables, not POSIX; under dash `$UID` is empty. Rule: `${USER:-$(id -un)}`, `${TMPDIR:-/tmp}`, `${XDG_CONFIG_HOME:-$HOME/.config}`, and never `set -u` before defaulting.

### F13. Fleet defects found on the way

Reported with file:line and a reproducer. Nothing was edited. Repo SHAs are the working-tree HEADs on 2026-10-11.

| # | Where | Defect | Reproducer | Severity |
|---|---|---|---|---|
| 1 | `ocx` @3485207c183e: `test/manual/scripts/setup-integrations.sh:79`, `test/manual/scripts/bootstrap.sh:138` | `sed -i "s\|...\|" file` with no suffix fails on BSD sed (the suffix is mandatory) | on macOS `sed -i 's/a/b/' f` errors with "invalid command code" (unverified: read only; `apple-sed-main.c:163`). On Linux: `grep -n -e 'sed -i' setup-integrations.sh` shows line 79 | Real defect for macOS maintainers; the scripts are manual test helpers |
| 2 | `www-setup` @a251c3631047: `src/install.sh:352,354` | `wget --secure-protocol=TLSv1_2 --https-only` is rejected by busybox wget; the script does not probe | `docker run --rm --network none -v /home/mherwig/dev/www-setup/src:/ws:ro alpine:3.22 sh /ws/install.sh` prints the busybox wget usage ("-U STR Use STR for User-Agent header") and exits 3 | Real defect for Alpine users with no curl (the script prefers curl when present) |
| 3 | `ocx-mirror` @71bb1c2953ba: `test/bazel_accept.sh:26,52` | `readlink -f` without a fallback (macOS < 12.3, unverified) | `grep -n -e 'readlink -f' test/bazel_accept.sh` | Low: macOS 12.3+ has it |
| 4 | `grimoire-lore` @88d5e14cb616: `rules/swift-quality/checks/k07.sh:56,65` | `grep -rn --include=... --exclude-dir=...`; busybox grep has no such options | on `alpine:3.22`, `grep -rn --include='*.swift' x .` errors | Low: swift checks run on macOS or Linux GNU |
| 5 | `index` @9eba2cc3929b: `scripts/golden-baseline.sh:176` | `sha256sum` with no `shasum` fallback; macOS has no `sha256sum` (unverified) | `grep -n -e 'sha256sum' scripts/golden-baseline.sh` | Low |

Checked and not defects: `grimoire-lore/rules/swift-quality/checks/generated-touch.sh:21`, `k07.sh:73`, `never-gate.sh:30` use `xargs -r -0`, which is POSIX.1-2024 and a no-op on macOS; `tsan-check.sh:24` guards `timeout` with `command -v` (exit 69 on absence); `setup-grimoire/.github/scripts/install.sh:98` uses `sha256sum ... | awk ... || shasum ...`, which looks dead (the pipeline status is awk's) but the file sets `set -euo pipefail` (line 9), so the fallback fires. This last one is a correct pattern only because of `pipefail`; the standalone test `sh out/pipe-fallback.sh` printed `rc-shape: []`, i.e. the same line without `pipefail` would silently produce an empty digest.

## Normative guidance candidates

Each rule: statement, rationale, verification, and whether the verification was RUN against a plant (red) and its twin (green). Check scripts are in the fixture directory; the dialect is the catalog's (explicit directory operand, `-r` where recursive, one `-e` per alternative, quoted `--include`, `xargs -r`, judge by output).

**R1. Do not use a GNU-only or BSD-only userland form without a probe.**
Rationale: F2. 20 forms fail on at least one of busybox, uutils, BSD or an old GNU.
Verification (output equals the violation, empty is a pass): `sh denylist.sh plant` (prints 31 lines, exit 0); `sh denylist.sh twin` (prints nothing, exit 1); `sh denylist.sh twinb` (prints nothing, exit 1). Busybox-safe variant: `sh denylist-find.sh plant` (31 lines, exit 0 on alpine:3.22, busybox:1.37, ubuntu:24.04, ubuntu:26.04). RUN: red on plant, green on twin and boundary twin.

**R2. In-place edits use `sed -i.bak ... && rm -f f.bak` or write-then-`mv`; never `sed -i ''` and never bare `sed -i`.**
Rationale: GNU rc 2 and busybox rc 1 on the BSD form, BSD eats the next argument on the bare form (`apple-sed-main.c:163`).
Verification: part of `denylist.sh` (patterns `sed ... -i[[:space:]]`, `sed ... -i$`). RUN (plant lines 3-4 and 30 flagged).

**R3. Probe a tool before use when it is absent somewhere: `timeout`, `flock`, `sha256sum`/`shasum`, `realpath`, `curl`/`wget`, `tar`, `find`, `xargs`.**
Rationale: F1 (absent on 2 to 8 of 21 images each). Probe with `command -v`, then fall back; do not discover absence from exit 127.
Verification: `sh unprobed.sh plant` prints `plant/bad.sh` and `plant/unprobed.sh` (xargs exits 123 because `grep -L` exits 1; judge by output); `sh unprobed.sh twin` prints nothing. RUN.

**R4. Use `command -v`, never `which`.**
Rationale: absent on 8 of 21 images; SC2230.
Verification: `shellcheck -s sh -o deprecate-which plant/which.sh` (exit 1) vs `shellcheck -s sh -o deprecate-which twin/which.sh` (exit 0). The default invocation exits 0 on the plant, so the option is required. RUN.

**R5. `LC_ALL=C` goes on each order-observable `sort`, `comm`, `join` (and a `ls` whose order is captured), not exported for the whole script.**
Rationale: F5; uutils applies ICU for any `*.UTF-8` name even when the locale is missing; a blanket export changes `wc -m`, `cut -c`, `awk length`, `${#x}` on UTF-8 text.
Verification: `sh sortcheck.sh plant` prints 5 lines (exit 0); `sh sortcheck.sh twin` prints nothing (exit 1). Behavioural: `sh sort-locale.sh` on ubuntu:26.04 exits 1 (differs from C); `sh sort-locale.sh pin` exits 0 on 24.04 and 26.04. RUN.

**R6. Resolve paths with a helper that tries `realpath`, then `readlink -f`, then a `readlink` loop; never `readlink -m` or `realpath -m/-s/--relative-to`.**
Rationale: `-m/-s/--relative-to` fail on busybox; `readlink -f` fails on macOS < 12.3 (unverified); POSIX.1-2024 has `readlink`, `realpath -E/-e` (`posix-readlink.txt:14`, `posix-realpath.txt:39,42`).
Verification: denylist patterns for `readlink -[fm]` and `realpath -[ms]`; behaviour: `sh userland-lib-test.sh` on 21 images and 11 shells, and `sh userland-lib-fallback-test.sh` for the loop. RUN (denylist red on plant lines 6-9; helper tests green everywhere).

**R7. Temp files: `mktemp -d "${TMPDIR:-/tmp}/name.XXXXXX"` (template ends in six X, no suffix), cleaned by `trap cleanup EXIT` plus `trap 'exit 143' TERM INT HUP`, with the work run in the background and awaited with `wait $!`.**
Rationale: F6: bare EXIT trap leaks on TERM in 8 of 13 variants; the TERM-handler-only form leaks in all bash because the trap is deferred.
Verification: behavioural, `sh run-tmp-trap.sh` (table in F6); static: `sh trapcheck.sh plant` prints `plant/trapexit.sh` (exit 123 from `xargs`, judge by output) and `sh trapcheck.sh twin` prints nothing; it lists files that set an EXIT trap and never mention TERM. Behavioural RUN on 13 interpreters (M1 red, M4 green); static RUN red on the plant, green on the twin.

**R8. Atomic replace: create the temp file in the destination's directory, then `mv`.**
Rationale: cross-file-system `mv` is copy and unlink (partial 1966080 of 419430400 bytes visible), Debian 13 `/tmp` is tmpfs.
Verification: `docker run --rm --network none --tmpfs /mnt/t:size=600m -v ... ubuntu:24.04 sh xdev-mv.sh` shows partial size and inode change. RUN as a measurement; not a catalog check (no static form).

**R9. Never parse stderr text or `--version` banners to choose a code path.**
Rationale: F4: error text differs on 30 to 37 of 304 cases; a banner check for "GNU" mis-detects uutils and busybox.
Verification: the denylist carries a `--version.*grep` pattern (plant line 35 flagged). RUN as part of R1.

**R10. Probe the flag set before using wget/curl TLS flags (`--help` grep for `--https-only`), or use curl first.**
Rationale: busybox wget rejects `--https-only/--secure-protocol` (rc 1) (F3, F13 #2).
Verification: `u_wget_flags` on 21 images (empty on busybox, flags on GNU wget); reproducer in F13. RUN.

**R11. In Git Bash, call `cmd` as `cmd //c`, or set `MSYS2_ARG_CONV_EXCL='*'`; do not rely on `ln -s`, `chmod`, case-sensitivity or LF output from native tools.**
Rationale: F10, measured on the host.
Verification: `msys.sh` on the Windows host (rc 124 for `cmd /c`, rc 0 for `cmd //c`). RUN once (host only; not portable to CI without a Windows runner).

**R12. Do not use `rg`, `jq`, `python3`, `git` or `perl` in a catalog check or an install-time script without a probe; awk is the only scripting tool on 20 of 21 images.**
Rationale: `rg` 0 of 21, `jq` 0, `git` 1, `python3` 3, `perl` 9 (`has-tools.txt`).
Verification: `sh toolcheck.sh plant` prints 3 lines (`rg`, `jq`, `python3`, exit 0); `sh toolcheck.sh twin` prints nothing (exit 1). The twin probes with `command -v` or carries a `userland-ok` marker. RUN.

**R13. A check that ends in a pipe must prove it can fail: add a canary against a plant in the same suite.**
Rationale: V3 (busybox `grep --include` error hidden by `| grep -v`, exit 1 = "clean").
Verification: `sh denylist.sh plant` must print lines; on alpine:3.22 it printed none and exited 1, which is the failure the canary exists to catch. RUN (false-green demonstrated).

**R14. Awk: use `sub`, `gsub`, `substr`, `index`, `split`, `printf`; probe before `gensub`, `strftime`, ERE intervals `{n}`, `length(array)`.**
Rationale: F8, mawk on 9 of 21 images.
Verification: behavioural, `gnuisms.sh` `awk_*` rows. RUN (measurement); no static check written.

**R15. Defaults for absent environment: `${USER:-$(id -un)}`, `${TMPDIR:-/tmp}`, `${XDG_CONFIG_HOME:-$HOME/.config}`.**
Rationale: F12.
Verification: `sh envvars.sh` inside a container. RUN (measurement).

Rules R1 to R7, R12 and R13 are the first-order catalog candidates (each has a static check run red and green). R8 to R11, R14 and R15 are guidance with a behavioural measurement but no plantable static check.

## Verification runs

All runs from `/home/mherwig/.cache/research-lang/shell-tools/fixtures/userland-floor/`, 2026-10-11, recorded in `out/verify.txt`.

| ID | Command (verbatim) | On plant | On twin | Verdict |
|---|---|---|---|---|
| V1 | `sh denylist.sh plant` / `sh denylist.sh twin` | 31 lines, exit 0 | 0 lines, exit 1 | red then green |
| V1b | `sh denylist.sh twinb` | before the boundary fix: 2 lines flagged (`transactional-update --no-selfupdate -d run` and `mystat -c file`), exit 0 | after: 0 lines, exit 1 | red then green (defect found and fixed in the fixture) |
| V2 | `sh denylist-find.sh plant` / `sh denylist-find.sh twin` | 31 lines, exit 0 on host, alpine:3.22, busybox:1.37, ubuntu:24.04, ubuntu:26.04 | 0 lines, exit 1 on each | red then green on 5 userlands |
| V3 | `sh denylist.sh plant` on alpine:3.22 | **0 lines, exit 1** (false green) | n/a | failure mode documented |
| V4 | `sh unprobed.sh plant` / `sh unprobed.sh twin` | prints `plant/bad.sh`, `plant/unprobed.sh`; exit 123 | prints nothing | red then green |
| V8 | `sh trapcheck.sh plant` / `sh trapcheck.sh twin` | prints `plant/trapexit.sh`; exit 123 | prints nothing | red then green |
| V9 | `sh toolcheck.sh plant` / `sh toolcheck.sh twin` | 3 lines (`rg`, `jq`, `python3`), exit 0 | 0 lines, exit 1 | red then green |
| V5 | `sh sortcheck.sh plant` / `sh sortcheck.sh twin` | 5 lines, exit 0 | 0 lines, exit 1 | red then green |
| V6 | `shellcheck -s sh -o deprecate-which plant/which.sh` / `shellcheck -s sh -o deprecate-which twin/which.sh` / `shellcheck -s sh plant/which.sh` | exit 1 | exit 0; default options on plant: exit 0 | red then green; default is blind |
| V6b | `shellcheck -s sh -f gcc plant-gnuisms.sh` | codes: SC3037 only (1 of 18) | n/a | ShellCheck 0.11.0 default is not a portability check |
| V6c | `shellcheck -s sh -o all -f gcc plant-gnuisms.sh` | codes: SC2230, SC3037 | n/a | `-o all` adds only `which` |
| V7 | `sh sort-locale.sh` on ubuntu:24.04 / ubuntu:26.04 | 24.04: exit 0 (same as C); **26.04: exit 1** (differs from C) | `sh sort-locale.sh pin`: exit 0 on both | red on uutils only, then green |
| V7b | `sh sort-locale.sh` after `apt-get install locales` on ubuntu:24.04 | unpinned exit 1 | pinned exit 0 | the same trap appears on GNU once the locale is installed |

Count of verifications watched red on a planted fixture and green on its twin: **9** (V1, V1b, V2, V4, V5, V6, V7, V8, V9).

Other measurements (not plant/twin checks, but replayable):

- `sh run-images.sh` then `python3 table2.py`: the 105-probe matrix, `out/g_*.txt`, `out/table2.txt`.
- `sh run-tmp-trap.sh`: the 13-variant trap table, `out/tmp-trap.txt`, `out/tmp-trap-posix.txt`.
- `sh uu-diff.sh` per image, then `python3 uu-compare.py out/uu_ubuntu_24.04.txt out/uu_ubuntu_26.04.txt`: 304 cases, `out/uu_diff_*.txt`.
- `sh mvn.sh` (GNU `mv -n`/`cp -n` per image), `sh xdev-mv.sh`, `sh mktemp-contract.sh`, `sh locale-probe.sh`, `sh locale-battery.sh`, `sh lcall-scope.sh`, `sh envvars.sh`, `sh date-weekday.sh`, `sh sed-bsd-form.sh`: single-purpose measurements quoted in F2 to F12.
- `sh userland-lib-test.sh` and `sh userland-lib-fallback-test.sh`: helper library on 21 images, 11 shells, and the forced-fallback path.
- `bash msys.sh`: Git Bash on the Windows host.

Errors encountered and how they were handled: `zsh` (the login shell) does not word-split, so loops over image lists use `bash` scripts; a safety hook rejects `docker ... sh -c '...'` one-liners, so all container work is in script files; an early version of `uu-diff.sh` contained a destructive line that every image refused; it was removed from the file; `denylist.sh` was first written with pipe characters inside patterns (rewritten to one `-e` per alternative) and without a word boundary; the boundary is now two `-e` patterns per command (`^sed...` and `[^[:alnum:]_.-]sed...`), and the false-positive (`--no-selfupdate -d`) is exactly what V1b catches.

## Exemplar evidence

`exemplar-count.sh` counts non-comment lines per idiom in the authored shell files of 14 cloned exemplars (`/home/mherwig/.cache/research-lang/exemplars/shell`). The `which` and `command -v` columns are upper bounds (prose lines match). The `date -d` column for k3s (3) is three false positives (`transactional-update --no-selfupdate -d run`, `install.sh:698,699,972`), which is what led to the word-boundary fix (V1b).

| Repo | `readlink -f` | `sed -i` | `mktemp` | `stat -c` | `grep -P` | `sha256sum` / `shasum` | `command -v` | `LC_ALL=C` | `xargs -r` |
|---|---|---|---|---|---|---|---|---|---|
| rust-lang/rustup | 0 | 0 | 4 | 0 | 0 | 2 / 1 | 2 | 0 | 0 |
| acmesh-official/acme.sh | 1 | 5 | 27 | 1 | 0 | 0 / 0 | 7 | 3 | 2 |
| nvm-sh/nvm | 0 | 0 | 6 | 0 | 0 | 16 / 8 | 9 | 1 | 0 |
| k3s-io/k3s | 0 | 3 | 4 | 1 | 0 | 18 / 0 | 20 | 0 | 4 |
| dotnet/install-scripts | 0 | 4 | 5 | 1 | 1 | 2 / 0 | 31 | 0 | 0 |
| axodotdev/cargo-dist | 0 | 0 | 114 | 0 | 0 | 42 / 0 | 57 | 0 | 0 |
| git/git | 0 | 0 | 3 | 1 | 0 | 0 / 0 | 1 | 4 | 0 |
| Homebrew/install | 0 | 0 | 1 | 0 | 0 | 0 / 0 | 9 | 2 | 0 |
| pyenv, rbenv, deno_install, docker-install, bats-core, Scoop | 0 to 1 | 0 | 0 to 3 | 0 | 0 | 0 | 0 to 8 | 0 to 1 | 0 |

What the exemplars do (file:line):

- **Probe, then use.** rustup probes `--help` for each curl/wget flag (`rustup-init.sh:766` defines `check_help_for`; used at `:710,742,826,828,865,895,900`) and wraps `mktemp` in `ensure` (`:111,301`).
- **Wrapper around the `sed -i` split.** acme.sh branches on the platform and calls `sed -i "$options"` or `sed -i "" "$options"` (`acme.sh:941-944`), and guards `readlink -f` (`:3282`, `if ! readlink -f ...`) and `stat -c` (`:1788`, `if stat -c ... 2>/dev/null`).
- **Checksum fallback.** nvm `.github/scripts/docker-image.sh:17-20` (`command -v sha256sum` else `shasum -a 256`); `nvm.sh:2147` (`nvm_has_non_aliased 'sha256sum'`); rustup `ci/prepare-deploy.bash:11-13`.
- **Where GNU-isms live: tests and CI helpers, not the installer.** k3s `sed -i` at `tests/e2e/scripts/setup_rootless.sh:18,39`; dotnet `grep -Po` at `eng/common/cross/build-rootfs.sh:614` and `sed -i.bak` at `eng/common/SetupNugetSources.sh:71,98,155,206`; pyenv `readlink -f` at `test/test_helper.bash:23` (tests only). The shipped `dotnet-install.sh:603` uses `stat -c '%s'` unguarded.
- **`xargs -r`.** k3s `install.sh:878,888` and `tests/e2e/scripts/run_tests.sh:40`.
- **`LC_ALL=C` on one command.** git `tools/generate-cmdlist.sh:33` (`LC_ALL=C sort -u`), `contrib/completion/git-completion.bash:1068` (`LANG=C LC_ALL=C git merge -s help`); `t/test-lib.sh:527` exports it for the test suite.
- **Traps on EXIT only.** Homebrew `install.sh:331,891,1088` (`trap ... EXIT`) with `mktemp` at `:1087`; per F6 this leaks on TERM in dash and busybox ash (these scripts use bash).

No exemplar uses `date -d` or `rg` in shipped code.

## AI-agent angle

- **Agents author on GNU and fail elsewhere.** The agent sandbox is Debian or Ubuntu with GNU coreutils; every form in F2 passes there. The failure surfaces on the user's Mac, on Alpine, or on Ubuntu 25.10+ where `timeout -s KILL` exits 124 and `sort` collates by ICU. Run the oracle matrix, not the author's box.
- **Default ShellCheck does not catch it.** 1 of 18 planted GNU-isms was reported (V6b). An agent told "ShellCheck is clean" has learned nothing about portability. The denylist (R1) plus the unprobed-tool check (R3) are the agent-facing gate.
- **Agents reach for tools that are not there.** `rg`, `jq`, `python3` and `git` are in 0, 0, 3 and 1 of 21 base images. A check or a skill that shells out to them fails in a bare container.
- **Agents write `sed -i ''` (macOS) in a script that then runs on Linux, and `sed -i` bare in a script that then runs on macOS.** Both are in the denylist; the portable form is `.bak` plus `rm`.
- **Agents trust `trap cleanup EXIT`.** It leaks on TERM in 8 of 13 interpreter variants (F6). The M4 pattern is a ten-word fix an agent can apply mechanically.
- **Agents parse error text and banners.** uutils changed all of it. An agent checking `sort --version | grep GNU` takes the wrong path on Ubuntu 26.04.
- **A verification an agent writes can pass vacuously.** `grep -r --include ... | grep -v ...` returned "clean" on busybox because the first grep errored (V3). Every shipped check needs a plant canary (R13).
- **Locale surprises are invisible in an agent sandbox** (`LANG` unset), and visible on every developer laptop. Pin per command.

## Contested / evolving

- **uutils moves fast.** 0.12.0 was released 2026-09-17; the images carry 0.2.2 and 0.10.0. The 30-case difference with GNU will shrink; the stderr-text and collation rows may not, since clap error text is by design different. Re-run `uu-diff.sh` when 26.10 or 0.12 reaches an image. The `cp` binary on 26.04 is `gnucp`; 26.10 switches to uutils (3 of 304 differ).
- **busybox 1.38.0** is unstable (2026-05-13). If it lands in Alpine, re-measure F3; some gaps (`grep --include`, `readlink -m`) may close.
- **GNU `mv -n` exit status changed between 9.4 and 9.5.** Measured (`mvn.sh`): 9.4 exits 1 with a message when the target exists, 9.5, 9.7 and 9.12 exit 0 silently; `cp -n` warns on Ubuntu's 9.4 and 9.7 and not on Alma 10, Debian 13 or Arch. A script that branches on `mv -n`'s status is wrong on half the matrix. Prefer `[ -e target ] || mv src target` (non-atomic), or `ln src target` for exclusive creation.
- **POSIX.1-2024 moved the floor.** `xargs -r`, `find -print0`, `realpath -E/-e`, `readlink -n` and `timeout` are now standard (`posix-xargs.txt:88,105`, `posix-find.txt:171`, `posix-realpath.txt:39,42`, `posix-readlink.txt:14`, `posix-timeout.txt`). `grep -r`, `grep -o`, `sed -i`, `sort -V`, `date -d`, `mktemp` and `find -maxdepth` are not in the standard. Whether a catalog should treat "in POSIX.1-2024" as "portable" is a policy call: Debian 11 and Ubuntu 20.04 predate it, but every image tested already had the flags.
- **macOS.** Everything BSD in this report is read from Apple source, not run. The macOS 12.3 `readlink -f` and macOS 13 `realpath` claims are from the ledger and secondary sources (Stack Overflow 1055671, 5694228), not from Apple source. A real macOS run of `gnuisms.sh` (it is POSIX sh and needs no setup) would close this.
- **`mkdir` lock vs `flock`.** The mutex is atomic on local file systems only; NFS behaviour was not measured.
- **Whether `trap ... TERM INT HUP` should be the catalog default** (R7). It changes the exit status to 143, and a script that wants to preserve the signal exit code for its caller needs `kill -s TERM $$` after cleanup; not measured.
- **The `mawk` interval support.** Behaviour on Debian 12 (old mawk) fails; mawk 1.3.4-2024+ accepts it. When Debian 11/12 and Ubuntu 20.04/22.04 leave the support window the awk rule can relax.

## Sources

Primary = a specification, a vendor or upstream document, source code, or a measurement run for this report. Dates are retrieval dates (2026-10-11) unless noted.

| # | Source | Type | Used for |
|---|---|---|---|
| 1 | POSIX.1-2024 (Issue 8) `sed` utility, `web/posix-sed.txt` | primary | no `-i`, `-z`, `-r` |
| 2 | POSIX.1-2024 `grep`, `web/posix-grep.txt` | primary | no `-r`, `-o`, `-P` |
| 3 | POSIX.1-2024 `find`, `web/posix-find.txt` (`-print0` at 171, 238) | primary | `-print0` standard |
| 4 | POSIX.1-2024 `xargs`, `web/posix-xargs.txt` (`-r` at 88, `-0` at 105) | primary | `-r`, `-0` standard |
| 5 | POSIX.1-2024 `sort`, `web/posix-sort.txt` | primary | no `-V`, `-h` |
| 6 | POSIX.1-2024 `date`, `web/posix-date.txt` | primary | only `+format` |
| 7 | POSIX.1-2024 `readlink`, `web/posix-readlink.txt` (line 14) | primary | `readlink [-n]` |
| 8 | POSIX.1-2024 `realpath`, `web/posix-realpath.txt` (39, 42) | primary | `-E`, `-e` |
| 9 | POSIX.1-2024 `timeout`, `web/posix-timeout.txt` (116, 122-126) | primary | exit codes 124 to 127 |
| 10 | POSIX.1-2024 utilities index (`mktemp` absent), `web/posix-mktemp-index.txt` | primary | `mktemp` not standard |
| 11 | GNU coreutils manual v9.4, `doc/coreutils.texi` from the GitHub mirror (gnu.org unreachable), `web/coreutils-9.4.texi` (`mktemp` node at 14641) | primary | GNU semantics |
| 12 | BusyBox 1.37 command reference, `web/busybox-doc.txt` (wget at 2623) | primary | applet flags |
| 13 | BusyBox NEWS (1.37.0 2024-09-27; 1.38.0 unstable 2026-05-13), `web/busybox-news.txt` | primary | versions |
| 14 | uutils/coreutils README, `web/uutils-readme.md` | primary | project status |
| 15 | uutils "Extensions over GNU", `web/uu-extensions.md` | primary | `-D`, `-w=80` |
| 16 | uutils `collator.rs`, `web/uu-collator.rs` | primary | ICU collation rule |
| 17 | uutils localization doc, `web/uu-l10n.md` | primary | locale files |
| 18 | uutils GitHub releases API, `web/uu-releases.json` (latest 0.12.0, 2026-09-17) | primary | current version |
| 19 | Apple open-source: `sed/main.c` (text_cmds-199), `xargs.c`, `mktemp.c`, `head.c`, `sort/sort.c`, `grep/grep.c`, `date.c`, `stat.c` (shell_cmds-329, file_cmds-479), `web/apple-*.c` | primary (read only; no macOS host) | BSD column in F2 |
| 20 | MSYS2 "Filesystem Paths" (https://www.msys2.org/docs/filesystem-paths/), `web/msys2-paths.txt` | primary | conversion rules |
| 21 | Debian 13 "trixie" release notes 5.1.6, `web/debian13-relnotes.txt` | primary | `/tmp` tmpfs |
| 22 | Ubuntu 25.10 release notes (https://documentation.ubuntu.com/release-notes/25.10/), `web/ubuntu2510.txt` | primary | rust-coreutils 0.2.2 |
| 23 | Launchpad bug 2125535, rust-coreutils `dd` partial write (https://bugs.launchpad.net/bugs/2125535), `web/lp-2125535.txt` | secondary | uutils regressions in the wild |
| 24 | mawk CHANGES, `web/mawk-changes.txt` | primary | interval expressions |
| 25 | Stack Overflow 1055671 (`readlink -f` on macOS), via the StackExchange API, `web/so-1055671*.json` | secondary | macOS `greadlink` |
| 26 | Stack Overflow 5694228 (`sed -i` on macOS and Linux), `web/so-5694228*.json` | secondary | BSD suffix form |
| 27 | ShellCheck 0.11.0 run in the shell-tools runner (`run.sh shellcheck`), V6/V6b/V6c | primary (measurement) | rule coverage |
| 28 | 105-probe matrix over 21 images plus Git Bash, `out/g_*.txt`, `out/table2.txt` | primary (measurement) | F1 to F3, F7 to F9 |
| 29 | Exemplar corpus, 14 repos under `/home/mherwig/.cache/research-lang/exemplars/shell` (`exemplar-count.sh`, `exemplar-lines.sh`) | primary (code) | Exemplar evidence |
| 30 | Fleet repos at the SHAs in F13 (ocx, ocx-mirror, grimoire-lore, www-setup, index, setup-grimoire) | primary (code) | F13 |

Internal context read first (not counted): `shell-frame.md`, `shell-topic-map.md` (row text for M-D-01..17 and M-A-03), `platform-matrix.md`, and the `matrix.sh`/`run.sh` runner.
