---
title: Secrets on argv through variables, credential remedy forms for git and cargo, and the reach of dynamic names outside bash (SH-SEC revision)
topic: shell scripting across operating systems and shells, wave 4, group security, revision of shell-security.md
agent: W4 security/argv-through-variables-and-credentials
model: sonnet
date_researched: 2026-10-11
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/argv-through-variables-and-credentials/
scope: >
  Answers three questions left open by shell-security.md (SH-SEC-01..12 stay stable; new rules start at SH-SEC-13).
  Q1: a two-pass awk check, checks/secret-argv.sh, for secrets that reach the argv of curl, wget, git, docker, gh and cargo
  through a variable, array or positional list: MUST cell or listing cell. Q2: the remedy forms for git and cargo
  credentials, each run against a stub server that demands the token (git 2.43.0, 2.47.3, 2.53.0, 2.54.0; cargo 1.93.1,
  1.94.0, 1.95.0, 1.99.0). Q3: the scope of SH-SEC-09 outside bash (local, typeset, export, readonly, unset, read,
  printf -v, namerefs) on 11 POSIX-family columns, 4 zsh and 8 bash versions. Not covered: macOS and BSD (no host: every
  such claim is marked "unverified: read only"), Windows cross-user argv, Windows Credential Manager and macOS keychain
  helpers, PowerShell (PS-SEC), the wget and gh remedy forms (documentation read, not run).
---

# Secrets on argv through variables, git and cargo credential forms, dynamic names outside bash

Dated 2026-10-11. Every version-tagged claim below was run on this host (WSL2, Linux 6.18) or in Docker unless it says "read only" or "unverified". Fixture directory `~/.cache/research-lang/shell-tools/fixtures/argv-through-variables-and-credentials/` is written `FX/`. Hosts: the host (dash, bash, gawk 5.3.2), `vd-alp` (busybox 1.37 userland, busybox awk 1.37), `vd-u24`, `vd-u26` (Ubuntu 24.04 and 26.04, mawk 1.3.4), `vd-alpgnu` (Alpine plus GNU tools). `[sec]` means `shell-security.md`; `[is]` means `shell-security/injection-and-secrets.md`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Revision log](#revision-log)
9. [Sources](#sources)
10. [Appendix: checks/secret-argv.sh](#appendix-checkssecret-argvsh)

## Summary

- **Q1 verdict: `checks/secret-argv.sh` is a MUST cell**, not a listing. It prints a finding only when a variable that derives from a secret source (a secret-named variable, `${{ secrets.X }}`, `$(cat token-file)`, `read -s`, `pass show`, `gh auth token`) reaches the argument segment of one of six tools. Exit map 0/1/69/74/78/79 (SH-GATE-31); waiver `# sec-ok: <reason>`.
- It sees what the single-line `s02-argv` grep cannot: **26 of 71 findings on the 40-clone corpus and 32 of 80 on the 57-clone held-out set** are on lines where neither the use line nor the line that set the taint matches `s02-argv` or `s02-argv-yaml`.
- Precision after tuning: held-out 80 lines, 0 false positives by reading (first run: 88 lines, about 9 false positives, six classes, all fixed). Clean round: 7 unseen repos gave 5 lines, all true. Fleet: 14 lines in 8 files of 7 repos, all true.
- Eleven of the 71 corpus lines are git's own `t/` test fixtures that use a fake credential (`$HTTPD_URL_USER_PASS`); they are true to the pattern and belong under the waiver `# sec-ok: test credential`.
- Portability: the check is byte-identical on gawk 5.3.2, busybox awk 1.37 and mawk 1.3.4 across five hosts; the plant gives 18 lines (exit 1), the twin 0 (exit 0); exit 69, 74, 78 and 79 were each forced and read.
- Known ceiling, stated in the script header: file-level taint, no flow or function scope, positional `$1` not tracked, variable names that are not secret-shaped (`T`) are invisible unless assigned from a secret-shaped source.
- **git (Q2):** no remedy form puts the token on argv except two negative controls. `GIT_ASKPASS`, `credential.helper store` (plaintext, mode 600), `credential.helper cache`, and `GIT_CONFIG_COUNT/KEY_n/VALUE_n` in the environment of the one command all authenticated against the stub with `ARGV none` on four git versions.
- **`git -c http.extraheader="Authorization: Bearer $T"` is argv**: the parent `git` shows the token in `/proc/<pid>/cmdline` on 2.43.0, 2.47.3 and 2.53.0, and the children also carry it in their environment (`GIT_CONFIG_PARAMETERS`). A userinfo URL shows it in all three processes and writes it to `.git/config`.
- `GIT_TRACE_CURL` redacts `Authorization` (0 occurrences) but not a custom header: `X-Token: <token>` appeared 5 times on 2.43.0, 2.53.0 and 2.47.3. A persistent `git config http.extraHeader` writes the token to `~/.gitconfig`.
- **cargo (Q2):** `--token` is argv on cargo 1.93.1, 1.94.0, 1.95.0 and 1.99.0. `CARGO_REGISTRIES_<NAME>_TOKEN` and `cargo login` on stdin do not put it there. **`CARGO_REGISTRY_TOKEN` is the crates.io token only**: against an alternative registry it exits 101 `no token found for stub`, even with the registry made the default.
- **Q3 verdict: SH-SEC-09 widens beyond bash.** mksh R59c, posh 0.14.1 and zsh 5.0.8 to 5.9 execute `a[$(cmd)]` through name constructs; dash 0.5.12, busybox ash 1.35 and 1.37, ksh93u+m 2023 and 1.0.10, and yash 2.52 never did (control `eval` ran on all of them, so the harness works).
- The "safe on all eight" list in SH-SEC-09 is bash-only: `export "$k=v"` and `export "$k"` are HIT on mksh, posh and zsh 5.0.8 to 5.9; `readonly` and `unset` are HIT on mksh and posh; `read "$k"` is HIT on mksh, posh, zsh and bash.
- `shfmt -f` without `--` aborts on a tracked file named `-x.sh` (hand-off to SH-GATE-09/22); every cell here uses `shfmt -f --`.
- The validator `case $k in '' | [0-9]* | *[!A-Za-z0-9_]*) exit 64 ;; esac` before each construct turned all 26 constructs green on every column (twin exit 0 on 11 posix, 4 zsh and 8 bash columns, 0 HIT lines).

## Findings

### 1. The gap: a secret reaches argv through a variable and no single-line check sees it

`s02-argv` ([sec] SH-SEC-02) looks for a secret-shaped token and a `$` on one physical line. These forms are invisible to it and to ShellCheck 0.11.0 (which has no rule for it):

```sh
# wrong: five shapes, all argv
h="Authorization: Bearer $GH_TOKEN"; curl -sS -H "$h" "$url"          # variable
args=(-H "Authorization: Bearer $GH_TOKEN"); curl "${args[@]}" "$url" # array
set -- "$@" -H "Authorization: Bearer $GH_TOKEN"; curl "$@" "$url"    # positional list
read -rs pw; docker login -u me -p "$pw" registry.example.com        # read -s then argv
docker run --rm -e API_TOKEN="$API_TOKEN" img                          # docker client argv

# right: stdin, a mode-0600 file, or the environment of the one command
printf 'header = "Authorization: Bearer %s"\n' "$GH_TOKEN" | curl -sS -K - "$url"
printf '%s' "$pw" | docker login -u me --password-stdin registry.example.com
API_TOKEN=$API_TOKEN docker run --rm -e API_TOKEN img   # the value is not on the client's argv
```

Runtime proof (`FX/secret-argv-var.sh`, `FX/out/runtime-var.txt`, ran 2026-10-11): the variable, array and userinfo plants each print `LEAK /proc/<pid>/cmdline: curl ... Bearer s3cr3t-...` and exit 1 while "server received header: yes"; the stdin and config-file twins exit 0 with the same server result. `/proc/<pid>/cmdline` is mode 0444, `/proc/<pid>/environ` mode 0400, and `hidepid=1` protects other users' `cmdline` and `hidepid=2` also hides the directory ([proc(5)](https://man.archlinux.org/man/proc.5)); CWE-214 names the class ([CWE-214](https://cwe.mitre.org/data/definitions/214.html)).

`docker run -e K=V` and `docker build --build-arg K=V` put `K=V` in the docker client's argv (`FX/out/docker-env.txt`: plant `LEAK docker: docker run --rm -e API_TOKEN=tok1fff70df317c ...`, exit 1; twins `-e K` with an env prefix, and `--secret`, exit 0, "container got 15 chars"). The Docker docs steer build secrets to `--secret id=,env=` ([docker build secrets](https://docs.docker.com/build/building/secrets/)) and registry passwords to `--password-stdin` ([docker login](https://docs.docker.com/reference/cli/docker/login/)).

### 2. The two-pass check, how it works, what it costs

`checks/secret-argv.sh` (appendix) is awk only. Pass 1 collects assignments (`x=`, `export x=`, `set --`, `read -s`) with the variables each right-hand side references, then marks a variable tainted when its right-hand side holds a secret source or a tainted variable (fixpoint). A function that `echo`s or `printf`s a secret taints `$(fname)`. Pass 2 takes the argument segment after `curl|wget|git|docker|gh|cargo` in command position and reports a tainted reference (`derived`), a secret-shaped name that ends in a secret word (`direct`), or a `${{ secrets.X }}` expression (`expr`). Output: `file:line: [class] TOOL argv carries NAME (tainted at line N): text`.

Six false-positive classes were found by measurement and fixed; each is a guard in the script, so a reader sees why a name is excluded:

| Class (where found) | Guard |
|---|---|
| tool name inside a log string (`acme.sh` `_log "curl ..."`) | `cmdpos`: the tool must be in command position |
| `must_pass_arg`, `api_pat_args` (bare `PASS`, `PAT` in a lowercase name; a name ending `_ARGS`) | `secname`: bare `PASS\|PAT\|AUTH` only in names with no lowercase; path-ish and flag-ish suffix list |
| `GOOGLE_APPLICATION_CREDENTIALS` (holds a path) | explicit exclusion |
| a `$(curl ...)` that consumes a secret and returns data (`record_id` from a Cloudflare lookup) | `dropcs`: a substitution that runs a consumer tool does not propagate its inner references, including an unterminated one (a quoted argument that runs to the next line) |
| `${{ secrets.X_USERNAME }}`, `_ID`, `_HOST`, `_URL`, `_EMAIL`, `_REGISTRY` | `secname_ok` |
| a 2950-character data-blob YAML line (cli `eval-prompts.yml`) | lines over 1500 characters are skipped |

Two traps in the awk itself, both found because a run printed nothing: a `^` inside an alternation mid-regex never matches (rewrote the `$(curl` guard as `[$][(]([^)]*[|;&(])?[ \t]*(tools)[ \t]`), and `for (k = ln; ...)` compared strings, not numbers (`k = ln + 0`). The script sets `LC_ALL=C` because gawk warns on invalid multibyte data in git's `t/` fixtures and the warning would read as a failed scan (exit 74).

Ceilings (the script header says them too): file-level taint with no scope or flow; `$1`, `$2` are not tracked; a secret in a non-secret-shaped name (`T`, `h` assigned from a literal) is invisible; `eval`, `source`d files and embedded Python or Node are not read; heredoc bodies are scanned as lines. A plant that used `$T` was missed, which is how the ceiling was found; the plant now uses `$GH_TOKEN`.

### 3. Corpus, held-out, unseen and fleet numbers

| Set | Repos | Lines | Clones with a line | s02 sees the use line | s02 sees the taint line | Neither |
|---|---|---|---|---|---|---|
| Corpus (the dive's 40) | 40 | 71 (39 derived, 27 direct, 5 expr) | 11 | 28 | 17 | **26** |
| Held-out (wave 3 round) | 57 | 80 (24 derived, 55 direct, 1 expr) | 16 | 45 | 3 | **32** |
| Unseen (`heldout/shell-src`) | 7 | 5 (all true by reading) | 3 | not computed | not computed | not computed |
| Fleet (`~/dev`, worktrees and scratch excluded) | 39 scanned (1 exit 79: nothing in scope) | 14 in 8 files | 7 repos | not computed | not computed | not computed |

The held-out set stopped being held out when its false positives were fixed; the unseen set is the clean round (5 of 5 true, 0 false). The 11 git `t/` lines are true to the pattern with fake credentials; they are the reason the waiver exists.

### 4. git: which credential form leaves the token where

One stub dumb-HTTP server demands Basic, Bearer or X-Token with a random per-run secret passed in the stub's environment (`FX/cred/authsrv.py`, `FX/cred/git-cred.sh MODE`). After the first authorized request the harness samples every `/proc/<pid>/cmdline` and `/proc/<pid>/environ` for the secret while git waits, then checks `.git/config` and `~/.gitconfig`. Results, identical on git 2.43.0 (Ubuntu 24.04), 2.47.3 (rust:latest), 2.53.0 (Ubuntu 26.04) and, for the right forms, 2.54.0 (host); the two negative-control rows (userinfo, `-c`) were run on the three container versions:

| Form | argv | environ (same uid, 0400) | at rest | Verdict |
|---|---|---|---|---|
| `git clone http://ci:$TOK@host/r.git` (userinfo) | **git, git remote-http, git-remote-http** | none | **`.git/config` holds it** | wrong |
| `git -c http.extraheader="Authorization: Bearer $TOK" clone ...` | **git (parent)** | git, git-remote-http (`GIT_CONFIG_PARAMETERS`) | none | wrong |
| `GIT_ASKPASS=script` reading `$CI_TOKEN` | none (argv is the prompt only) | git, git-remote-http | none | right when the script reads a 0600 file instead |
| `GIT_ASKPASS=script` reading a 0600 file | none | none | file | right |
| `credential.helper store --file=F` (primed by `git credential approve`) | none | none | `F` mode 600, plaintext | right for CI, document the file |
| `credential.helper cache --timeout=60` | none | none | daemon memory and socket, none in files | right; one daemon per user |
| `env GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Bearer $TOK" git clone ...` | none | git, git-remote-http | none | right; needs git 2.31 or later (the 2.31.0 release notes introduce the pair of variables; git-config(1) documents `GIT_CONFIG_COUNT`) |
| `git config --global http.extraHeader "Authorization: Bearer $TOK"` | none | none | **`~/.gitconfig` holds it** | wrong unless unset after |

```sh
# wrong
git clone "https://x-access-token:$GH_TOKEN@github.com/o/r.git"     # argv x3 and .git/config
git -c http.extraheader="AUTHORIZATION: basic $B64" fetch            # parent argv, children environ

# right: environment of the one command, git 2.31 or later (git-config(1): GIT_CONFIG_COUNT, KEY_<n>, VALUE_<n>)
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader \
  GIT_CONFIG_VALUE_0="Authorization: Basic $B64" git fetch origin
# right: askpass, the secret read from a 0600 file or the environment by the script
GIT_ASKPASS=$PWD/askpass.sh git clone https://ci@host/r.git
```

Servers saw `auth=basic-ok` (and one `basic-bad`, the probe before askpass) or `auth=bearer-ok` or `auth=xtoken-ok`, so each right form worked, not just hid the token. `GIT_TRACE_CURL=1` redacted the Authorization header (0 occurrences of the token) but printed a custom `X-Token: <token>` header in clear (**5 occurrences** on 2.43.0, 2.47.3 and 2.53.0): redaction is by header name, so a custom header name defeats it. git(1) states the redaction scope: values of cookies, the `Authorization:` header, the `Proxy-Authorization:` header and packfile URIs, switched off by `GIT_TRACE_REDACT=0`. Credentials in URLs have their own guard, `transfer.credentialsInUrl` ([git-config](https://git-scm.com/docs/git-config)), exercised by git's own `t/t5551` fixtures. `git credential-cache` keeps the secret in a daemon reached over a Unix domain socket (default `$XDG_CACHE_HOME/git/credential/socket`; [git-credential-cache](https://git-scm.com/docs/git-credential-cache)), so it is Unix-only by construction (unverified on Windows: read only); `store` is plaintext by design ([git-credential-store](https://git-scm.com/docs/git-credential-store)); macOS Keychain and Windows Credential Manager helpers were not run (unverified: read only).

### 5. cargo: which token form leaves the token where

Stub sparse registry named `stub` with an authenticated `PUT` (`FX/cred/cargosrv.py`, `FX/cred/cargo-cred.sh MODE`), `CARGO_HOME` per run, sampled while cargo is blocked on the `PUT`. cargo 1.93.1, 1.94.0, 1.95.0 and 1.99.0 (container) gave the same row each time:

| Form | argv | environ | at rest | publish |
|---|---|---|---|---|
| `cargo publish --registry stub --token "$TOK"` | **cargo** | none | none | exit 0 |
| `CARGO_REGISTRIES_STUB_TOKEN="$TOK" cargo publish --registry stub` | none | cargo (0400) | none | exit 0 |
| `printf '%s\n' "$TOK" \| cargo login --registry stub`, then `cargo publish` | none | none | `credentials.toml` mode 600, plaintext | exit 0 |
| `CARGO_REGISTRY_TOKEN="$TOK" cargo publish --registry stub` | none | none | none | **exit 101: no token found for `stub`, please run `cargo login --registry stub` or use environment variable CARGO_REGISTRIES_STUB_TOKEN** |
| same plus `CARGO_REGISTRY_DEFAULT=stub`, no `--registry` | none | none | none | **exit 101, same message** |

`CARGO_REGISTRY_TOKEN` authenticates crates.io only; for any other registry the variable is `CARGO_REGISTRIES_<NAME>_TOKEN` with the name upper-cased and `-` mapped to `_` ([cargo environment variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html), [cargo config](https://doc.rust-lang.org/cargo/reference/config.html)). `cargo login` reads the token from stdin when the argument is absent and stores it in plaintext in `credentials.toml` ([cargo login](https://doc.rust-lang.org/cargo/commands/cargo-login.html)); credential providers (`cargo:libsecret`, `cargo:macos-keychain`) are in the credential-provider documentation and were not run ([cargo credential providers](https://doc.rust-lang.org/cargo/reference/credential-provider-protocol.html), unverified: read only).

```sh
# wrong
cargo publish --token "$CARGO_TOKEN"
cargo publish --registry corp --token abc123
# right: crates.io
CARGO_REGISTRY_TOKEN=$CRATES_TOKEN cargo publish
# right: any other registry
CARGO_REGISTRIES_CORP_TOKEN=$CORP_TOKEN cargo publish --registry corp
```

### 6. SH-SEC-09 outside bash: the harness and the table

`FX/names/dyn.sh` sets `k='a[$(touch CANARY)]'` and runs 27 constructs, each in its own subshell inside `eval`, once raw (plant) and once behind the SH-SEC-09 validator (twin). A case prints `HIT` when `CANARY` exists, `ok` when it ran without executing, `err` when the shell rejected the name. The control (`eval "$k=v"`) is HIT on every shell, so a silent column means the construct is safe there, not that the harness failed. Columns: dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m 2023 and 1.0.10, yash 2.52, posh 0.14.1, bash 3.2 and 5.2 in `--posix`, zsh 5.9; plus zsh 5.0.8, 5.3.1, 5.8, 5.9 and bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 in full.

| Construct with `$k` from data | dash, ash 1.35/1.37, ksh93u+m x2, yash | mksh R59c | posh 0.14.1 | zsh 5.0.8 to 5.9 | bash 3.2 to 5.3 |
|---|---|---|---|---|---|
| `local "$k=v"` | err | **HIT** | **HIT** | err | **HIT** (8 of 8) |
| `typeset "$k=v"` | err | **HIT** | err | err | **HIT** (8 of 8) |
| `declare "$k=v"` | err | err | err | err | **HIT** (8 of 8) |
| `export "$k=v"`, `export "$k"` | err | **HIT** | **HIT** | **HIT** (4 of 4) | err |
| `readonly "$k=v"`, `readonly "$k"` | err | **HIT** | **HIT** | err | err |
| `unset "$k"` | err | **HIT** | **HIT** | ok | ok |
| `read -r "$k"`, `read "$k"` | err | **HIT** | **HIT** | **HIT** (4 of 4) | **HIT** (8 of 8) |
| `typeset -n r="$k"`, `local -n r="$k"` | err | **HIT** | err | err | **HIT** from 4.4 |
| `printf -v "$k"` | ok (busybox) or err | err | err | **HIT** from 5.3.1 (err on 5.0.8) | **HIT** from 4.2 |
| `${!k}` | ok (ksh93u+m), err | ok | err | err (5.9 `${(P)k}` ok) | **HIT** (8 of 8) |
| `[ -v "$k" ]`, `[[ -v $k ]]` | err | **HIT** | err | ok | **HIT** from 4.4 |
| `$(( k ))`, `let`, `(( ))`, `a[$k]` | err | **HIT** | `$(( ))` and `[ -eq ]` HIT, `let` and `(( ))` err | ok | **HIT** (8 of 8) |

Two consequences. First, SH-SEC-09's present list of "safe on all eight" (`export`, `unset`, `readonly`) is true on bash 3.2 to 5.3 only; it is a HIT on mksh, posh and, for `export` and `read`, zsh 5.0.8 to 5.9. Second, dash, busybox ash, ksh93u+m and yash reject or ignore every name construct, so a `#!/bin/sh` script run by one of them is not exposed; on Debian and Ubuntu `/bin/sh` is dash, on Alpine busybox ash, so the exposure depends on the interpreter that actually runs, which SH-DIAL already makes the author pin.

```sh
# wrong: k comes from a file, a flag or the environment
export "$k=$v"          # HIT on zsh, mksh, posh
read -r "$k"            # HIT on bash, zsh, mksh, posh
# right: validate the name on every shell, then use it
case $k in '' | [0-9]* | *[!A-Za-z0-9_]*) printf 'bad name\n' >&2; exit 64 ;; esac
export "$k=$v"
```

### 7. The cell shapes for the new rules

`FX/cells/s13s14.sh` and `FX/cells/s09r.sh` follow SH-GATE-21..28: file list from `git ls-files -z`, `xargs -0 -r shfmt -f --`, `grep -H -n -i -E` with one `-e` per alternative and an explicit `--`, output equals violation, `PREFLIGHT:` line when a tool is missing. The git and cargo cells scan YAML as well as shell. s09r adds `export`, `readonly` and `unset` to the dive's constructs (`s09-dynamic-names-listing`). Both are byte-identical on the host and the four containers.

## Normative guidance candidates

IDs SH-SEC-01..12 stay stable. A rule marked AMEND keeps its ID and gains text and a cell; NEW rules start at 13.

**SH-SEC-02 · MUST · AMEND.** A secret never reaches argv, by any route: a literal, a variable, an array, `set -- "$@"`, a `read -s` variable, `docker run -e K=V`, `docker build --build-arg K=V`, `cargo publish --token`. Pass it on stdin (`curl -K -`, `docker login --password-stdin`), in a 0600 file (`-H @file`, an askpass script, `--secret id=,env=`), or in the environment of the one command (`K=$V docker run -e K`).
- *Why.* Section 1; `/proc/<pid>/cmdline` is 0444. 26 of 71 corpus lines and 32 of 80 held-out lines are invisible to `s02-argv`.
- *Verify.* New MUST cell `s02-argv-var`: `sh checks/secret-argv.sh . ':!**/vendor/**'` from the repository root; any output is a violation, exit 1. Keep `s02-argv` and `s02-argv-yaml` unchanged. Exit 69, 74, 78, 79 are tool or scope faults, never a pass. Waiver `# sec-ok: <reason>` on any physical line of the command (a fake test credential, a public token).
- *Ran against a plant?* **Yes, watched red.** Plant (16 files) 18 lines exit 1, twin 0 exit 0, byte-identical on five hosts; faults 69, 74, 78, 79 each forced and read; runtime `/proc` proof for variable, array, userinfo and docker `-e` plants (exit 1), twins exit 0.
- *Scope.* INST, TOOL, CI, GATE. Linux measured; macOS and Windows unverified. wget and gh remedy forms not run.

**SH-SEC-09 · MUST · AMEND.** Validate any identifier or subscript that comes from data before it reaches **any** construct that takes a variable name, on every shell, not only bash: `local|typeset|declare "$k=v"`, `export`, `readonly`, `unset`, `read "$k"`, `printf -v`, `typeset -n`, `[ -v ]`, `${!k}`, arithmetic. Bash-only "safe" lists (`export`, `readonly`, `unset`) are withdrawn as portable claims.
- *Why.* Section 6: HIT on mksh R59c and posh 0.14.1 (many constructs), zsh 5.0.8 to 5.9 (`export`, `read`, `printf -v` from 5.3.1) and bash 3.2 to 5.3; never on dash 0.5.12, busybox ash 1.35 and 1.37, ksh93u+m 2023 and 1.0.10, yash 2.52.
- *Verify.* Replace `s09-dynamic-names-listing` with `s09r` (a superset): each site shows a `case` validator within reach or carries `# sec-ok: validated at <line>`. Runtime: `FX/names/dyn.sh plant` through `matrix.sh` on the target interpreters, then `twin`.
- *Ran against a plant?* **Yes.** s09r plant 10 lines, twin 0, byte-identical on five hosts; `dyn.sh` plant HIT on the columns above, twin exit 0 and 0 HIT on all 23 columns.
- *Scope.* TOOL, CI, LIB on any POSIX-family interpreter; mksh, posh and zsh are exposed to constructs bash is not. Replaces the bash-only scope sentence of the old rule.

**SH-SEC-13 · MUST · NEW.** git credentials never go in a URL, in `git -c http.extraheader=...` or in `git config http.extraHeader` with a secret value. Use `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0`, `GIT_CONFIG_VALUE_0` in the environment of the one command (git 2.31 or later), a `GIT_ASKPASS` script that reads a 0600 file, or a `credential.helper store --file=` primed from stdin with the file at mode 600. Never name a secret header `X-...` and then enable `GIT_TRACE_CURL`.
- *Why.* Section 4: userinfo is argv in three processes plus `.git/config`; `-c` is argv in the parent and environ in the children; `GIT_TRACE_CURL` redacts only `Authorization`. 1 true hit in 97 clones (`dbatools-public`), 0 in the fleet: low prevalence, high consequence, and it is the shape the `actions/checkout` pattern teaches.
- *Verify.* MUST cell `s13-git-extraheader-argv` (cell text in `FX/cells/s13s14.sh`): `grep -H -n -i -E -e 'git[^#]*[[:space:]]-c[[:space:]]+"?[^[:space:]]*extraheader[^#]*[$]' -e 'git[[:space:]]+config[^#]*extraheader[^#]*[$]' --` over the file list; any hit is a violation. Listing cell `s13-git-extraheader-write-listing` prints every `git config ... extraheader` site to read. Userinfo URLs stay with `s02-argv` and `secret-argv`.
- *Ran against a plant?* **Yes.** Plant 3 lines in the argv cell and 2 in the listing cell, twin 0; runtime red on three git versions (`argv-url`, `argv-c`), green on four for the right forms (`askpass-*`, `store`, `cache`, `extraheader-env`).
- *Scope.* INST, TOOL, CI. git 2.43.0 to 2.54.0 measured; Windows Git Credential Manager and macOS Keychain unverified.

**SH-SEC-14 · MUST · NEW.** cargo tokens never ride `--token`. crates.io: `CARGO_REGISTRY_TOKEN=$T cargo publish`. Any other registry: `CARGO_REGISTRIES_<NAME>_TOKEN=$T cargo publish --registry <name>`; `CARGO_REGISTRY_TOKEN` does not authenticate an alternative registry. `cargo login` takes the token on stdin and leaves a mode-600 plaintext `credentials.toml`; delete it in CI.
- *Why.* Section 5, four cargo versions. Corpus: 4 `--token` sites (`cargo-dist` 3, `starship` 1) and the fleet's `rust-oci-client` release workflow; `zoxide` and `mise` already use the environment form.
- *Verify.* MUST cell `s14-cargo-token-argv` (`cargo[[:space:]]+publish[^#]*--token`, the same for `owner` and `yank`, and `cargo login` followed by a variable); listing cell `s14-cargo-registry-token-with-registry-listing` prints `CARGO_REGISTRY_TOKEN` next to `--registry`, which is the silent-failure shape.
- *Ran against a plant?* **Yes.** Plant 4 plus 1 lines, twin 0 (byte-identical on five hosts); runtime `--token` red on 1.93.1, 1.94.0, 1.95.0, 1.99.0; `CARGO_REGISTRY_TOKEN` against `--registry stub` exit 101 on all four.
- *Scope.* TOOL, CI. Credential providers not run.

**Hand-off to SH-GATE-09 and SH-GATE-22 (not a SH-SEC rule).** `shfmt -f` must be `shfmt -f --`: a tracked file named `-x.sh` makes shfmt fail with a flag error, and a gate that discards stderr reads that as "no files" (the first draft of `secret-argv.sh` did). Capture stderr and exit 74 if it is not empty.
- *Verify.* `grep -r -n -e 'shfmt -f [^-]' -e 'shfmt -f$' -e 'shfmt -f |' <dir>` over the directory that holds the gate scripts: any output is a violation. The tracked file `-x.sh` is in `FX/plant` and `FX/twin`, so a gate run on either exercises it.
- *Ran against a plant?* **Yes, watched red.** `FX/hand/secret-argv-nodash.sh` (the check with `--` removed) matched line 35 and, run on the plant, exited 74 with `flag provided but not defined: -x.sh`; the real `checks/` and `cells/` directories print nothing, and the real check on the plant exits 1 with 18 lines.

## Verification runs

All run 2026-10-11; "red" means the check fired on a plant, "green" means the twin was clean. Admissible only where both were watched.

| # | Check | Red (plant) | Green (twin) | Hosts or versions |
|---|---|---|---|---|
| V1 | `checks/secret-argv.sh` | 18 lines, exit 1 (16 files: variable, array, `set --`, userinfo, chain, `read -s`, `$(cat)`, function, cargo, docker, base64, continuation, `gh secret set`, `-x.sh`, workflow) | 0 lines, exit 0 | host plus 4 containers, byte-identical; gawk 5.3.2, busybox awk 1.37, mawk 1.3.4 |
| V2 | exit map | forced 69 (shfmt off PATH), 74 (broken awk), 78 (not a repo), 79 (empty scope) with the stderr line each | plant exit 1, twin exit 0 | host |
| V3 | runtime `/proc` proof for variable, array, userinfo | 3 plants `LEAK /proc/<pid>/cmdline`, exit 1, server saw the header | stdin and config-file twins exit 0, server saw the header | host, curl |
| V4 | docker `-e K=V` | `LEAK docker: docker run --rm -e API_TOKEN=...`, exit 1 | `-e K` with env prefix, `--secret`: exit 0, "container got 15 chars" | host docker |
| V5 | git userinfo URL and `-c http.extraheader` | ARGV lines for git, git remote-http, git-remote-http (userinfo, `.git/config` token) and git (`-c`) | n/a (negative controls) | git 2.43.0, 2.47.3, 2.53.0 |
| V6 | git right forms | n/a | `ARGV none` and server `*-ok` for askpass-env, askpass-file, store, cache, extraheader-env | 2.43.0, 2.47.3, 2.53.0, 2.54.0 |
| V7 | `GIT_TRACE_CURL` redaction | `X-Token` trace leaks token 5 | `Authorization` trace leaks 0 | 2.43.0, 2.47.3, 2.53.0 |
| V8 | cargo `--token` | `ARGV cargo: ... publish --registry stub -...` | `CARGO_REGISTRIES_STUB_TOKEN`, `login-stdin`: `ARGV none`, PUT `auth=ok` | 1.93.1, 1.94.0, 1.95.0, 1.99.0 |
| V9 | `CARGO_REGISTRY_TOKEN` on an alternative registry | exit 101 `no token found for stub` (also with `CARGO_REGISTRY_DEFAULT=stub`) | `CARGO_REGISTRIES_STUB_TOKEN` exit 0 | same four |
| V10 | cells `s13-*` | 3 + 2 lines | 0 | host plus 4 containers, byte-identical |
| V11 | cells `s14-*` | 4 + 1 lines | 0 | host plus 4 containers, byte-identical |
| V12 | cell `s09r` | 10 lines (`export`, `readonly`, `unset` x2, `local`, `declare`, `printf -v`, `read`, `[[ -v ]]`, `${!k}`) | 0 | host plus 4 containers, byte-identical |
| V13 | `names/dyn.sh` plant on 11 POSIX, 4 zsh, 8 bash columns | HIT lines 76, 23, 127 (control included) | 0 HIT, exit 0 on 11, 4, 8 | see section 6 |
| V14 | s02 overlap (`FX/overlap.sh`) | corpus 26 of 71 and held-out 32 of 80 invisible to `s02-argv` | n/a (a measurement, not a gate) | host |
| V15 | `shfmt -f --` hand-off grep | `hand/secret-argv-nodash.sh` line 35 matches; that variant exits 74 on the plant (`flag provided but not defined: -x.sh`) | real `checks/` and `cells/`: no output; real check exit 1, 18 lines | host, shfmt |

Scans (not gates): corpus 40 clones 71 lines, held-out 57 clones 80 lines, unseen 7 clones 5 lines, fleet 39 repos 14 lines (`FX/out/ex-summary.txt`, `held-summary.txt`, `src-summary.txt`, `fleet-summary.txt`). Not run: macOS, BSD, Windows, wget and gh remedy forms, credential providers and keychain helpers.

## Exemplar evidence

Links are `owner/repo@sha12:path:line` at the commit scanned. `derived` and `expr` hits are the ones `s02-argv` cannot see.

**Real defects the new check finds (and `s02-argv` mostly does not):**
- [`ohmyzsh/ohmyzsh@42a4ccb1b14d:plugins/macos/spotify:183`](https://github.com/ohmyzsh/ohmyzsh/blob/42a4ccb1b14d/plugins/macos/spotify#L183) builds `SHPOTIFY_CREDENTIALS` from client id and secret; [`:189`](https://github.com/ohmyzsh/ohmyzsh/blob/42a4ccb1b14d/plugins/macos/spotify#L189) passes it to `curl`. A bearer token set at `:202` reaches `curl` at `:219` and `:238`. Derived, 3 lines.
- [`jdx/mise@19e8c8f0d03d:.github/workflows/registry-impl.yml:251`](https://github.com/jdx/mise/blob/19e8c8f0d03d/.github/workflows/registry-impl.yml#L251): `docker run ... -e MISE_GITHUB_TOKEN="${POOL_TOKEN:-...}"`, a new production shape (two sites, `:242` and `:305`).
- [`cli/cli@ec5b512045db:script/api-host-gateway/run.sh:104`](https://github.com/cli/cli/blob/ec5b512045db/script/api-host-gateway/run.sh#L104): `docker run -e GH_APIHOST_TOKEN="$token"` where `token=${GH_TOKEN:-}`.
- [`casey/just@a1951a5ff762:www/install.sh:61`](https://github.com/casey/just/blob/a1951a5ff762/www/install.sh#L61): `args+=(--header "Authorization: Bearer $GITHUB_TOKEN")` at `:59`, then `curl ... ${args[@]+"${args[@]}"}`. Same shape in `jdx/mise` `scripts/task-cache-remote-compat.sh` (12 lines) and [`direnv/direnv@28a73d1df3f3:install.sh:97`](https://github.com/direnv/direnv/blob/28a73d1df3f3/install.sh#L97), [`actions/runner-images@8197087fc536:images/ubuntu-slim/scripts/helpers/install.sh:66`](https://github.com/actions/runner-images/blob/8197087fc536/images/ubuntu-slim/scripts/helpers/install.sh#L66).
- [`starship/starship@d4d0459c5c24:.github/workflows/release.yml:345`](https://github.com/starship/starship/blob/d4d0459c5c24/.github/workflows/release.yml#L345): `cargo publish --token ${{ steps.auth.outputs.token }}` (a short-lived trusted-publishing token, still argv for the run).
- [`axodotdev/cargo-dist@d1055f48071e:.github/workflows/publish-crates.yml:31`](https://github.com/axodotdev/cargo-dist/blob/d1055f48071e/.github/workflows/publish-crates.yml#L31) (and `:34`, `:37`): `cargo publish -p axoproject --token ${CRATES_TOKEN}`.
- [`dataplat/dbatools-public@e273a4164bdf:.github/workflows/codex.yml:248`](https://github.com/dataplat/dbatools-public/blob/e273a4164bdf/.github/workflows/codex.yml#L248): `git -c http.https://github.com/.extraheader="AUTHORIZATION: basic ${basic_auth}"`, the only SH-SEC-13 hit.
- [`dokku/dokku@5eaab7cc1a14:contrib/build-docs:160`](https://github.com/dokku/dokku/blob/5eaab7cc1a14/contrib/build-docs#L160) and [`neovim/neovim@7e1ae5115f1f:.github/workflows/release.yml:273`](https://github.com/neovim/neovim/blob/7e1ae5115f1f/.github/workflows/release.yml#L273): token in a userinfo URL on `git remote set-url` and `git push`.
- Fleet (working trees at the commits shown, 2026-10-11): `ocx-sh/www-setup@a251c3631047:scripts/gen-dist.sh:174-176` (`set -- ... -H "Authorization: Bearer ${GITHUB_TOKEN}"` then `curl "$@"`); `ocx-sh/ocx@1727d6a15394:test/manual/announce-e2e/scripts/run_sequence.sh:177` and `taskfiles/infra.taskfile.yml:21`; `ocx-sh/index@9eba2cc3929b:.github/workflows/render-deploy.yml:169-189` (`auth="Authorization: Bearer ..."` then `curl -H "$auth"`, 5 lines); `ocx-sh/rust-oci-client@c76d82a6c6c7:.github/workflows/release.yml:13` (`cargo publish --token ${{ secrets.CargoToken }}`); `grimoire-rs/setup-grimoire@1259e35b2550:.github/scripts/install.sh:60-93` (`curl "${curl_args[@]}"`); `grimoire-rs/components@6fd8054116af:templates/publish.yml:100-108` (`${auth_header:+-H "$auth_header"}`); `michael-herwig/website@b6f79261ca14:Taskfile.yml:139` (`-H "AccessKey: $BUNNY_API_KEY"`). Eight variable-carried or direct sources in 7 repos; the wave-3 fleet pass found 4.

**Positive models (the right form, in the wild):**
- [`ajeetdsouza/zoxide@86b443cffcd7:.github/workflows/cd.yml:23`](https://github.com/ajeetdsouza/zoxide/blob/86b443cffcd7/.github/workflows/cd.yml#L23) and [`jdx/mise@19e8c8f0d03d:.github/workflows/release-plz.yml:56`](https://github.com/jdx/mise/blob/19e8c8f0d03d/.github/workflows/release-plz.yml#L56): `CARGO_REGISTRY_TOKEN: ${{ ... }}` in the step environment.
- [`acmesh-official/acme.sh`](https://github.com/acmesh-official/acme.sh) `.github/workflows/dockerhub.yml:70-73` and `fish-shell/fish-shell` `build_docker_images.yml:32`: `docker login --password-stdin`.
- [`git/git@6de20f6092dc:t/t0300-credentials.sh`](https://github.com/git/git/blob/6de20f6092dc/t/t0300-credentials.sh) exercises `GIT_ASKPASS`, `credential.helper` and `GIT_CONFIG_COUNT` across 57 lines; `FX/out/positive-models.txt` lists 208 positive-form lines in 28 clones.
- `git` 11 `t/` lines that the check reports are the project's own fake-credential tests (`t5541`, `t5550`, `t5551`: `$HTTPD_URL_USER_PASS`, `url_userpass`); waive them.

## AI-agent angle

- An agent that fixes a flagged `curl -H "Authorization: Bearer $TOKEN"` by putting the header in a variable has not fixed anything; the shape stays argv. The fix the rule must name is stdin (`-K -`, `-H @file`), not a rename.
- An agent that reads `CARGO_REGISTRY_TOKEN` in a tutorial and uses it for a private registry gets exit 101 with an error that names the right variable; the rule names both variables, so the agent does not search again.
- An agent told "validate the name before `export`" will test on bash and call it done. The table says zsh, mksh and posh execute; the verify step names `dyn.sh` on the interpreter that runs the script.
- The gate must treat exit 69, 74, 78, 79 as faults. The first `secret-argv.sh` draft turned a shfmt failure into an empty list and exit 0; an agent that sees exit 0 and no output will report clean.
- The waiver `# sec-ok: <reason>` must carry a reason; an agent that adds a bare waiver to silence the check should be caught by the SH-GATE waiver rule (a waiver without a reason is itself a finding).

## Contested / evolving

- **MUST versus listing for `secret-argv`.** For MUST: 0 false positives on 80 held-out lines after tuning, 5 of 5 on unseen repos, 14 of 14 in the fleet, byte-identical on three awk implementations. Against: the tuning was done on the held-out set, so that set is no longer clean; the 11 git `t/` lines need a waiver; the ceiling (file-level taint, secret-shaped names only) means a pass is not proof of absence. The cell is MUST because a finding is a true pattern in every sample read; the pass is not claimed as proof.
- **`git -c` versus environment form.** `GIT_CONFIG_COUNT` keeps the token out of the parent argv but both put it in the child's environ (0400, same uid). If the threat is a same-uid process, only askpass from a 0600 file or `store` avoids the environment. The rule picks the environment form as the default because it works without a file and is measured, and names askpass as the stronger form.
- **`store` versus `cache`.** `store` leaves a plaintext file (mode 600); `cache` leaves a per-user daemon and Unix-domain socket (Unix-only by construction). Neither is rated above the other; CI should prefer `store` with a file removed at job end, a workstation should use a keychain helper (not run).
- **Whether SH-SEC-09 should be MUST for dash, ash, ksh93u+m and yash.** They executed nothing in 26 constructs. The rule says "every shell" because scripts migrate and `#!/bin/sh` points at different interpreters; a narrower scope by interpreter is possible and cheaper.
- **Evolving.** bash 5.3's `array_expand_once` narrows `let`, `printf -v` and `read` and closes nothing else ([is] §8). zsh 5.3.1 made `printf -v` execute; 5.0.8 does not. git 2.54.0 and cargo 1.99.0 behave as 2.43.0 and 1.93.1 on every row measured, but credential helpers and cargo credential providers are moving areas.
- **Open.** macOS and BSD argv visibility (`ps` shows other users' arguments by default on macOS: unverified: read only), Windows cross-user argv, Windows Credential Manager and macOS Keychain helpers, `wget --header` stdin forms, `gh auth login --with-token` stdin form, `docker --env-file` mode.

## Revision log

| ID | Change | Reason |
|---|---|---|
| SH-SEC-01, 03 to 08, 10 to 12 | unchanged | not touched by these questions |
| SH-SEC-02 | **AMEND**: text covers variable, array, `set --`, `read -s`, `docker -e K=V`, `--build-arg`, `cargo --token`; remedy forms listed; new MUST cell `s02-argv-var` = `checks/secret-argv.sh` (exit map 0/1/69/74/78/79, waiver `# sec-ok:`); `s02-argv` and `s02-argv-yaml` kept | Q1: 26 of 71 and 32 of 80 findings invisible to the single-line grep |
| SH-SEC-09 | **AMEND**: scope widens from bash to every shell; "safe on all eight" list (`export`, `readonly`, `unset`) withdrawn as portable; `s09-dynamic-names-listing` superseded by `s09r` | Q3: HIT on mksh R59c, posh 0.14.1, zsh 5.0.8 to 5.9 |
| SH-SEC-13 | **NEW** (MUST): git credential forms; cells `s13-git-extraheader-argv` (MUST), `s13-git-extraheader-write-listing` | Q2 |
| SH-SEC-14 | **NEW** (MUST): cargo token forms; cells `s14-cargo-token-argv` (MUST), `s14-cargo-registry-token-with-registry-listing` | Q2 |
| SH-GATE-09, SH-GATE-22 | **hand-off**: `shfmt -f --`, capture stderr, exit 74 | `-x.sh` plant: shfmt flag error |
| `[sec]` open question "credential helpers" | partly closed: git askpass, store, cache, `GIT_CONFIG_COUNT`; cargo login stdin and env | Q2; Windows and macOS helpers still open |
| `[sec]` fleet table, SH-SEC-02 row | 4 sites becomes 8 variable-carried or direct sources in 7 repos | fleet scan with `secret-argv.sh` |

## Sources

Fetched 2026-10-11 into `FX/src/` unless marked. "Primary" is the tool's own manual, the specification, or the code that ran.

| # | Source | Kind | Used for |
|---|---|---|---|
| 1 | [proc(5)](https://man.archlinux.org/man/proc.5), `/proc/<pid>/cmdline`, `environ`, `hidepid` | primary | argv and environ visibility (man7.org was unreachable; Arch mirrors the man-pages text) |
| 2 | [CWE-214, Invocation of Process Using Visible Sensitive Information](https://cwe.mitre.org/data/definitions/214.html) | primary | class name |
| 3 | [git-config](https://git-scm.com/docs/git-config) (`http.extraHeader`, `transfer.credentialsInUrl`) | primary | extraHeader, URL credentials |
| 4 | [gitcredentials](https://git-scm.com/docs/gitcredentials) | primary | askpass and helper order |
| 5 | [git-credential-store](https://git-scm.com/docs/git-credential-store) | primary | plaintext file, mode |
| 6 | [git-credential-cache](https://git-scm.com/docs/git-credential-cache) | primary | daemon, socket, no Windows |
| 7 | [git(1)](https://git-scm.com/docs/git) (`GIT_TRACE_CURL`, `GIT_TRACE_REDACT`, `GIT_ASKPASS`) and git-config(1) `GIT_CONFIG_COUNT` | primary | env forms, trace redaction |
| 8 | [Git 2.31.0 release notes](https://github.com/git/git/blob/master/Documentation/RelNotes/2.31.0.adoc) | primary | the environment-variable config pairs introduced in 2.31 |
| 9 | [cargo environment variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html) | primary | `CARGO_REGISTRY_TOKEN`, `CARGO_REGISTRIES_<NAME>_TOKEN` |
| 10 | [cargo config](https://doc.rust-lang.org/cargo/reference/config.html) | primary | `registries.<name>.token`, `credentials.toml` |
| 11 | [cargo login](https://doc.rust-lang.org/cargo/commands/cargo-login.html) | primary | token on stdin |
| 12 | [cargo credential provider protocol](https://doc.rust-lang.org/cargo/reference/credential-provider-protocol.html) | primary (read only) | providers not run |
| 13 | [curl manpage](https://curl.se/docs/manpage.html) (`-K -`, `-H @file`) | primary | stdin forms |
| 14 | [docker login](https://docs.docker.com/reference/cli/docker/login/) | primary | `--password-stdin` |
| 15 | [docker build secrets](https://docs.docker.com/build/building/secrets/) | primary | `--secret id=,env=` |
| 16 | [GitHub Actions using secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) | primary | `${{ secrets.X }}` expansion |
| 17 | [POSIX 2024 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) | primary | name and expansion rules |
| 18 | [POSIX export](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/export.html) and [read](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html) | primary | `export name=value`, `read` operands |
| 19 | POSIX base definitions, name production ([definitions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html)) | primary | what a name is |
| 20 | `FX/cred/authsrv.py`, `git-cred.sh`, `cargosrv.py`, `cargo-cred.sh` run on git 2.43.0 to 2.54.0, cargo 1.93.1 to 1.99.0 | primary (ran) | section 4 and 5 |
| 21 | `FX/names/dyn.sh` on 23 interpreter columns | primary (ran) | section 6 |
| 22 | Exemplar corpus, 40 clones (`~/.cache/research-lang/exemplars/shell`) | corpus | section 3, exemplars |
| 23 | Held-out set 57 clones and unseen set 7 (`heldout/shell`, `heldout/shell-src`) | corpus | section 3, exemplars |
| 24 | Fleet repos under `~/dev` (39 scanned) | corpus | section 3, exemplars |

## Appendix: checks/secret-argv.sh

The deliverable of Q1, verbatim from `FX/checks/secret-argv.sh` (186 lines). Run from the repository root.

```sh
#!/bin/sh
# checks/secret-argv.sh -- SH-SEC-02 completeness: a secret that reaches the argv of curl, wget, git, docker, gh or cargo
# THROUGH A VARIABLE (h="Authorization: Bearer $T"; curl -H "$h"), which the single-line s02-argv grep cannot see.
# Run from the repository root; optional arguments are git pathspecs (default "."), e.g. . ':!**/vendor/**'. Output is the violation. Exit map (SH-GATE-31):
#   0 clean   1 finding   69 a required tool is missing   74 the scan itself failed   78 not a usable git work tree   79 no files in scope
# Two passes per file, awk only: pass 1 marks variables assigned from secret sources (to a fixpoint); pass 2 flags their use
# in the argument segment of one of the six tools. Waiver: "# sec-ok: <reason>" on any physical line of the command.
# LC_ALL=C: gawk warns on invalid multibyte data in a UTF-8 locale (git t/ fixtures), and the warning would read as a failed scan.
# ponytail: file-level taint, no flow or function scope, positional $1.. not tracked; add scope tracking only if the listing proves noisy.
set -u
for t in git xargs awk shfmt mktemp tr; do
    command -v "$t" >/dev/null 2>&1 || {
        echo "secret-argv: '$t' not on PATH" >&2
        exit 69
    }
done
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "secret-argv: not a usable git work tree" >&2
    exit 78
}
all=$(mktemp) || exit 74
list=$(mktemp) || exit 74
sh0=$(mktemp) || exit 74
out=$(mktemp) || exit 74
err=$(mktemp) || exit 74
trap 'rm -f "$all" "$sh0" "$list" "$out" "$err"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
[ "$#" -gt 0 ] || set -- .
git ls-files -z --cached --others --exclude-standard -- "$@" >"$all" || {
    echo "secret-argv: git ls-files failed" >&2
    exit 74
}
xargs -0 -r sh -c 'for f; do if [ -f "$f" ]; then printf "%s\0" "$f"; fi; done' _ <"$all" | xargs -0 -r shfmt -f -- 2>"$err" | tr '\n' '\0' >"$sh0"
[ -s "$err" ] && {
    cat "$err" >&2
    exit 74
}
git ls-files -z --cached --others --exclude-standard -- "$@" | xargs -0 -r sh -c 'for f; do case $f in *.yml | *.yaml) printf "%s\0" "$f" ;; esac; done' _ >>"$sh0" || exit 74
xargs -0 -r sh -c 'for f; do if [ -f "$f" ]; then printf "%s\0" "$f"; fi; done' _ <"$sh0" >"$list" || exit 74
[ -s "$list" ] || {
    echo "secret-argv: no files in scope" >&2
    exit 79
}
PROG='
function secname(n,   u) {
    u = toupper(n)
    if (u ~ /^(HAS|HAVE|IS|NO|SKIP|USE|WITH|WITHOUT)_/ || u == "GOOGLE_APPLICATION_CREDENTIALS") return 0   # the latter holds a path
    if (u ~ /(^|_)(FILE|PATH|DIR|URI|URL|NAME|ID|USER|USERNAME|HOST|PORT|REGISTRY|ENDPOINT|SET|PRESENT|ENABLED|REQUIRED|EXISTS|LENGTH|LEN|COUNT)$/) return 0
    if (u ~ /(^|_)(TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|CREDENTIALS?|BEARER|PRIVATE_KEY|ACCESS_KEY|SECRET_KEY)(_|$)/) return 1
    return (n !~ /[a-z]/ && u ~ /(^|_)(PASS|PAT|AUTH)(_|$)/)
}
# endsecret(n): the name ENDS in a secret word (GITHUB_TOKEN, feed_credential), which is what a direct use must show
function endsecret(n) { return secname(n) && toupper(n) ~ /(TOKEN|SECRET|PASSWORD|PASSWD|PASS|PAT|APIKEY|API_KEY|CREDENTIALS?|BEARER|AUTH|KEY)$/ }
function reset() { nl = 0; na = 0; delete LL; delete LN; delete AL; delete AR; delete AK; delete AN; delete T; delete SRC; delete FN; curfn = "" }
# refs(s): fill R[1..n] with the variable names expanded in s ("@" for $@ and $*); single-quoted text is not an expansion
function refs(s,   n, r) {
    n = 0; delete R
    if (gsub(Q, Q, s) % 2 == 0) gsub(Q "[^" Q "]*" Q, "", s)
    while (match(s, /[$][{]?[A-Za-z_][A-Za-z_0-9]*|[$][{]?[@*]/)) {
        r = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH)
        sub(/^[$][{]?/, "", r); if (r ~ /^[@*]/) r = "@"
        R[++n] = r
    }
    return n
}
# consumers whose output is not the secret: a command substitution that runs one of them (first word or after a pipe) does not propagate its inner refs
function dropcs(s,   head, tail) {
    while (match(s, /[$][(]([^)]*[|;&(])?[ \t]*(curl|wget|git|docker|gh|cargo|ssh|aws|gcloud|az|kubectl|helm|npm|pip|oras|skopeo|crane)[ \t][^)]*[)]/)) {
        head = substr(s, 1, RSTART - 1); tail = substr(s, RSTART + RLENGTH); s = head " " tail
    }
    # an unterminated substitution (a quoted argument runs on to the next physical line) is consumed to the end of the line
    if (match(s, /[$][(]([^)]*[|;&(])?[ \t]*(curl|wget|git|docker|gh|cargo|ssh|aws|gcloud|az|kubectl|helm|npm|pip|oras|skopeo|crane)[ \t]/)) s = substr(s, 1, RSTART - 1)
    return s
}
# cmdpos(pre): does the text before a tool name leave the tool in command position (not inside a log string or an echo)?
function cmdpos(pre) {
    while (pre ~ /(^|[ \t])[A-Za-z_][A-Za-z_0-9]*=("[^"]*"|[^ \t"]*)[ \t]*$/) sub(/[A-Za-z_][A-Za-z_0-9]*=("[^"]*"|[^ \t"]*)[ \t]*$/, "", pre)
    sub(/[ \t]+$/, "", pre)
    if (pre == "") return 1
    return (pre ~ /([;&|({`]|[$][(]|:)$/ || pre ~ /(^|[ \t;&|(])(then|do|else|elif|if|while|until|exec|sudo|command|time|xargs|nohup|env|!|-)$/)
}
# secname_ok(x): a "secrets.NAME" expression that names a user, id or other public value
function secname_ok(x) { sub(/^[ \t]*secrets[.]/, "", x); return toupper(x) ~ /(USER|USERNAME|ID|NAME|HOST|URL|EMAIL|REGISTRY)$/ }
function srcroot(rhs) {
    if (rhs ~ /[$][{][{][ \t]*secrets[.]/) return 1
    if (rhs ~ /[$][(] *(cat|head|tail|tr|<) *[^)]*(token|secret|passw|credential|api_?key|[.]netrc|id_rsa|[.]pat)/) return 1
    if (rhs ~ /[$][(] *(pass show|op read|vault kv get|gh auth token|security find-generic-password|aws secretsmanager|gcloud auth print|az account get-access-token|kubectl get secret|bw get|doppler secrets|keyctl)/) return 1
    return 0
}
function flush(   i, k, n, changed, m, j, line, seg, rest, tool, name, cls, dup, nt, w, fnn, src, pre) {
    if (nl == 0) return
    # pass 1: assignments and read -s, to a fixpoint
    for (i = 1; i <= nl; i++) {
        line = LL[i]
        if (match(line, /(^|[;&|(][ \t]*|^[ \t]*)read[ \t]+-[A-Za-z]*s[A-Za-z]*[ \t]/)) {
            rest = substr(line, RSTART); sub(/[<;&|].*$/, "", rest); n = split(rest, W, /[ \t]+/)
            if (W[n] != "" && W[n] !~ /^-/) { na++; AL[na] = W[n]; AR[na] = ""; AK[na] = 1; AN[na] = LN[i] }
            continue
        }
        w = line; sub(/^[ \t]*/, "", w)
        if (w ~ /^set[ \t]+--/) { sub(/^set[ \t]+--/, "", w); name = "@"; rest = w }
        else {
            sub(/^(export|local|declare|typeset|readonly)[ \t]+(-[A-Za-z-]+[ \t]+)*/, "", w)
            if (!match(w, /^[A-Za-z_][A-Za-z_0-9]*[+]?=/)) continue
            name = substr(w, 1, RLENGTH - 1); sub(/[+]$/, "", name); rest = substr(w, RLENGTH + 1)
        }
        na++; AL[na] = name; AN[na] = LN[i]
        rest = dropcs(rest); AK[na] = srcroot(rest)
        m = refs(rest); w = ""
        for (j = 1; j <= m; j++) w = w " " R[j]
        AR[na] = w
    }
    do {
        changed = 0
        for (k = 1; k <= na; k++) {
            if (AL[k] in T) continue
            cls = AK[k]
            if (!cls) { n = split(AR[k], W, " "); for (j = 1; j <= n; j++) if (secname(W[j]) || (W[j] in T)) { cls = 1; break } }
            if (cls) { T[AL[k]] = 1; SRC[AL[k]] = AN[k]; changed = 1 }
        }
    } while (changed)
    # functions that echo/printf a secret: $(fname) in a tool segment counts as a tainted ref
    for (i = 1; i <= nl; i++) {
        line = LL[i]
        if (match(line, /^[ \t]*(function[ \t]+)?[A-Za-z_][A-Za-z_0-9-]*[ \t]*[(][)]/)) {
            curfn = substr(line, RSTART, RLENGTH); sub(/^[ \t]*(function[ \t]+)?/, "", curfn); sub(/[ \t]*[(][)]$/, "", curfn)
        } else if (line ~ /^}/) curfn = ""
        if (curfn != "" && line ~ /(echo|printf)[ \t]/) {
            m = refs(line); for (j = 1; j <= m; j++) if (secname(R[j]) || (R[j] in T)) FN[curfn] = LN[i]
        }
    }
    # pass 2: argument segments of the six tools
    for (i = 1; i <= nl; i++) {
        line = LL[i]; rest = line; dup = ""
        while (match(rest, /(^|[^A-Za-z0-9_.\/-])(curl|wget|git|docker|gh|cargo)([ \t]|$)/)) {
            tool = substr(rest, RSTART, RLENGTH); m = RSTART; gsub(/[^a-z]/, "", tool)
            pre = substr(rest, 1, m - 1 + index(substr(rest, m, RLENGTH), tool) - 1)
            seg = substr(rest, RSTART + RLENGTH); rest = seg
            if (!cmdpos(pre)) continue
            sub(/[|;].*$|&&.*$/, "", seg)
            gsub(/<[(][^)]*[)]/, "", seg); sub(/<<<.*$/, "", seg); sub(/[ \t]<[ \t]*[^ \t]*/, "", seg)
            cls = ""; name = ""
            if (match(seg, /[$][{][{][ \t]*secrets[.][A-Za-z_0-9]*/) && !secname_ok(substr(seg, RSTART + 3, RLENGTH - 3))) { cls = "expr"; name = "secrets" }
            m = refs(seg)
            for (j = 1; j <= m && cls == ""; j++) {
                if (R[j] in T) { cls = "derived"; name = R[j] }
                else if (endsecret(R[j])) { cls = "direct"; name = R[j] }
            }
            if (cls == "") for (fnn in FN) if (index(seg, "$(" fnn) || index(seg, "`" fnn)) { cls = "derived"; name = fnn "()" }
            if (cls != "") {
                src = (name in SRC) ? " (tainted at line " SRC[name] ")" : ""
                printf "%s:%d: [%s] %s argv carries %s%s: %s\n", cur, LN[i], cls, tool, name, src, substr(LL[i], 1, 140)
            }
        }
    }
    reset()
}
BEGIN { Q = sprintf("%c", 39); reset() }
FNR == 1 { if (cur != "") flush(); cur = FILENAME; sub(/^[.]\//, "", cur); acc = ""; accn = 0 }
{
    line = $0
    if (acc == "") accn = FNR
    if (line ~ /\\[ \t]*$/) { sub(/\\[ \t]*$/, " ", line); acc = acc line; next }
    line = acc line; acc = ""
    if (line ~ /sec-ok:/) next
    if (length(line) > 1500) next    # a data blob (a prompt corpus, minified text), not a command
    if (line ~ /^[ \t]*#/) next
    sub(/[ \t]#[ \t].*$/, "", line)
    nl++; LL[nl] = line; LN[nl] = accn
}
END { flush() }
'
LC_ALL=C xargs -0 -r awk "$PROG" <"$list" >"$out" 2>"$err"
rc=$?
if [ -s "$err" ]; then
    cat "$err" >&2
    exit 74
fi
[ "$rc" -le 123 ] || exit 74
if [ -s "$out" ]; then
    cat "$out"
    exit 1
fi
exit 0
```
