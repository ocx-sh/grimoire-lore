---
title: CLI first-run and everyday UX of ocx and grim (grounding audit)
program: product (ux sub-program)
worker: grounding, axis cli-first-run
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
---

# CLI first-run and everyday UX: ocx 0.6.8 and grim 0.16.0

Method. Binaries on PATH: `ocx` (0.6.8, from `ocx version`) and `grim` (0.16.0, from `grim --version`). All runs used a scratch directory under `/tmp`, with `HOME`, `OCX_HOME` and `GRIM_HOME` pointed at scratch paths, stdin from `/dev/null`, and output piped through `head`. So every run below saw a non-terminal stdout. Sources are the checkouts at `/home/mherwig/dev/ocx-sh/ocx` (crates under `crates/`) and `/home/mherwig/dev/grimoire-rs/grimoire` (code under `src/`). Five external fetches. Three are the fleet's own installers, by `curl -sSL` into `~/.cache/research-lang/exemplars/product/cli-first-run/`: `https://setup.grimoire.rs/sh`, `https://setup.ocx.sh/sh`, `https://github.com/grimoire-rs/grimoire/releases/latest/download/grimoire-installer.sh`. Two are for the reading speed in section 1: the Crossref record `https://api.crossref.org/works/10.1016/j.jml.2019.104047` and the OpenAlex abstract `https://api.openalex.org/works/doi:10.1016/j.jml.2019.104047?select=abstract_inverted_index` (both fetched 2026-11-27; the publisher page and several mirrors were blocked or rate-limited, so the abstract came from OpenAlex).

Disclosure. Two ocx commands exceeded read-only: `ocx --frozen pull` and `ocx package install nodejs/node` ran against the network and wrote into the scratch `OCX_HOME` (`/tmp/cx/home`, deleted afterwards with `rm -rf`). Nothing under the real home was touched. Two things were not measured: wall-clock time of a real first run (no install was done on purpose), and Windows behaviour.

## 1. Steps and reading time to a first success

Reading speed. The minutes column uses 238 words per minute. Source: Brysbaert, M. (2019), "How many words do we read per minute? A review and meta-analysis of reading rate", Journal of Memory and Language 109, 104047, DOI https://doi.org/10.1016/j.jml.2019.104047 (record: https://api.crossref.org/works/10.1016/j.jml.2019.104047, published 2019-12). Abstract text as served by OpenAlex on 2026-11-27 (https://api.openalex.org/works/doi:10.1016/j.jml.2019.104047?select=abstract_inverted_index): "Based on the analysis of 190 studies (18,573 participants), we estimate that the average silent reading rate for adults in English is 238 words per minute (wpm) for non-fiction and 260 wpm for fiction"; "For silent reading of English non-fiction most adults fall in the range of 175-300 wpm". Reproduce: `curl -sS "https://api.openalex.org/works/doi:10.1016/j.jml.2019.104047?select=abstract_inverted_index"` and rebuild the abstract from the inverted index. Limits. The figure is for prose read for comprehension, not for reading with commands to run; the real time is longer, so the minutes below are a floor. The 175-300 range puts the 5.7-minute and 8.1-minute rows at 4.5-7.8 and 6.4-11.0 minutes (`python3 -c "print(1363/300,1363/175,1932/300,1932/175)"`).

| Path | Steps (commands) | Words to read | Minutes at 238 wpm | Command that produced it |
|---|---|---|---|---|
| ocx README: install, `ocx package install nodejs/node:24`, `ocx package exec nodejs/node:24 -- node --version` | 3 | 97 (text before Quick Start 44 + Quick Start section 53) | 0.4 | `awk '/^## Quick Start/{exit} {print}' ocx-sh/ocx/README.md \| wc -w`; `awk '/^## Quick Start/{f=1} /^## Installation/{f=0} f' ocx-sh/ocx/README.md \| wc -w` |
| ocx site: install-ocx (610 words) + first-package (753 words) | 2 commands before first output: installer, then `ocx package exec` (the page says exec needs no install) | 1363 | 5.7 | `wc -w ocx-sh/ocx/website/src/content/docs/getting-started/*.mdx` |
| grim README: install, `grim init`, `grim add ghcr.io/grimoire-rs/skills/grim-usage` | 3 | 257 (text before Install 141 + Install section 116) | 1.1 | `awk '/^## Install/{exit} {print}' grimoire-rs/grimoire/README.md \| wc -w`; `awk '/^## Install/{f=1} /^## Run Your Own/{f=0} f' grimoire-rs/grimoire/README.md \| wc -w` |
| grim site: installation (934 words) + quickstart (998 words) | 12 ocx/grim command lines in the quickstart across 9 shell blocks, 5 numbered steps | 1932 | 8.1 | `wc -w grimoire-rs/grimoire/docs/src/content/docs/quickstart.md grimoire-rs/grimoire/docs/src/content/docs/installation.md`; `awk '/^```(sh\|shell\|bash\|console)/{f=1;next} /^```/{f=0} f' <file> \| grep -cE '^(\$ )?(ocx\|grim) '` |

Findings.

- Both READMEs reach a first command in 3 steps. The word count is the cheap part; the real cost is the second doc layer (5.7 and 8.1 minutes).
- The ocx README and the ocx site disagree on the first run. README `ocx-sh/ocx/README.md:22-26` installs then execs. The site tutorial (`ocx-sh/ocx/website/src/content/docs/getting-started/first-package.mdx:12-26`) runs first, installs second, and says "Nothing persists on your machine". The site is the better first step; the README adds a step the site says is optional.
- The ocx README teaches the `ocx package ...` verbs, but the top-level `ocx --help` leads with the project verbs (`env`, `add`, `clean`, `config`). The project flow (`ocx init`, `add`, `pull`, `exec`) lives on a separate page (`first-project.mdx`, 753 words, 8 sections). A new reader meets two models of the tool (package-level and project-level) in the first 10 minutes.
- The grim quickstart admits a silent trap at `grimoire-rs/grimoire/docs/src/content/docs/quickstart.md:60-64`: with no client marker directory, `grim add` writes to `.agents/skills/`, "the shared pool that Claude Code does not read. ... Nothing in the command output tells you it happened." Measured: `grim init && grim status` printed `clients: agents (fallback)` and `grim install` printed a WARN (`install/installer.rs:800`). So the CLI does say it now; the docs sentence is stale or the signal is a log line, not a result row. Docs and code disagree; the code is authoritative.
- A second quickstart trap, `quickstart.md:12-16`: a bare name like `grim-usage` expands to a repository that does not exist. Measured: `grim fetch not-a-ref` returned `ghcr.io/grimoire-rs/not-a-ref:latest: registry authentication failed: Not authorized: url https://ghcr.io/v2/grimoire-rs/not-a-ref/manifests/latest`, exit 80. The user typed a wrong name; the message blames authentication (see section 4, row 19).

## 2. --help at each level

All counts are `<cmd> --help 2>&1 | wc -l` run from a scratch directory.

| Command | Lines (long help) | Lines (`-h`) |
|---|---|---|
| `ocx` | 126 | 44 (`ocx -h \| wc -l`) |
| `grim` | 86 | 45 (`grim -h \| wc -l`) |
| `ocx add` / `exec` / `pull` / `init` / `lock` / `env` | 57 / 102 / 59 / 27 / 39 / 98 | `ocx add -h`: 15 |
| `ocx package` / `index` / `self` | 32 / 16 / 11 | |
| `grim add` / `install` / `init` / `lock` / `update` | 88 / 79 / 54 / 57 / 80 | `grim add -h`: 26 |
| `grim search` / `fetch` / `build` / `release` / `publish` / `config` | 86 / 73 / 87 / 120 / 117 / 62 | |

Examples. Neither CLI ships an examples section in its help text. Measured: `grep -rn --include='*.rs' -E "after_help|after_long_help|Examples?:" ocx-sh/ocx/crates/ocx_cli/src grimoire-rs/grimoire/src/command grimoire-rs/grimoire/src/main.rs` returns one real hit: `ocx-sh/ocx/crates/ocx_cli/src/command/package_push.rs:262` (an inline "Examples:" in one flag doc). Zero for grim. The word "example" appears in `ocx add --help` only inside the `--platform` flag text. Ten ocx subcommands and eleven grim subcommands were probed with `<cmd> --help 2>&1 | grep -ci example`; the ocx hits are all incidental prose, the grim hits are 0.

Most common command first. No. Row counts come from the `Commands:` block: `ocx --help 2>&1 | awk '/^Commands:/{f=1;next} /^$/{f=0} f' | wc -l` prints 23, and `ocx --help 2>&1 | awk '/^Commands:/{f=1;next} /^$/{f=0} f{n++; if($1=="package"||$1=="exec") print n, $1}'` prints `14 package` and `18 exec`. The same two commands with `grim` print 27 rows, `11 add` and `14 search` (the 27 includes the built-in `help` row). `ocx --help` lists 23 rows in neither alphabetical nor frequency order: `env`, `add`, `clean`, ...; `package` (the README's headline verb) is row 14 and `exec` is row 18 (`ocx --help`, Commands block). `grim --help` lists 27 rows: `config`, `context`, `init`, `lock`, `install`, ...; `add`, the quickstart's headline verb, is row 11 and `search` row 14. grim does order `init`, `lock`, `install` near the front, which matches the lifecycle.

Other help facts.
- `ocx --help` is dominated by global flags. Of its 126 lines, the Commands block is about 25; the rest is 13 global options with long prose (`ocx --help`, Options block).
- Version flag. `ocx --version` and `ocx -V` both exit 64 with `error: unexpected argument '--version' found`; only `ocx version` works (`ocx version` prints `0.6.8`). `grim -V` and `grim --version` work.
- `ocx --help` global options use env-var and exit-code vocabulary heavily ("exits 79", "exits 81"). Exit codes are documented in help prose, which is good for agents and uncommon for humans.

## 3. Did-you-mean, colour, non-terminal, progress, completions

| Behaviour | ocx | grim | Evidence |
|---|---|---|---|
| Mistyped subcommand, nested | Suggests: `ocx package instal` prints `tip: some similar subcommands exist: 'uninstall', 'install'`, exit 64 | Suggests: `grim instal` prints `tip: some similar subcommands exist: 'init', 'uninstall', 'install'`; `grim ad foo` prints `tip: a similar subcommand exists: 'add'`, exit 64 | runs of those commands |
| Mistyped subcommand, top level | NO suggestion: `ocx instal` prints `unknown subcommand 'instal'; if 'ocx-instal' is an official OCX plugin, install it with 'ocx --global add ocx.sh/ocx/instal', otherwise put an 'ocx-instal' binary on your PATH`, exit 64. The plugin dispatcher intercepts before clap's suggester. | n/a | `ocx-sh/ocx/crates/ocx_cli/src/app/plugin_dispatch.rs:63,92` |
| Mistyped enum value | clap `[possible values: ...]` | clap lists values plus `tip: a similar value exists: 'hook'` for `grim why foo` | runs |
| Colour flag | `--color auto\|always\|never`; precedence NO_COLOR, CLICOLOR_FORCE, CLICOLOR=0, TERM=dumb, tty probe, explicit flag outranks env | same flag; same precedence, stdout-tty-gated | `ocx_console/src/options/color_mode.rs:102-109`; `grimoire/src/cli/color.rs:23-26,158` |
| Colour in logs when piped | Not observed in the run | LEAKS. `grim describe nonsense 2>&1 \| head -1 \| cat -v` showed `^[[2m2026-11-27T10:31:21Z^[[0m ^[[33m WARN^[[0m ...` with stdout piped; `--color never` made no difference; `NO_COLOR=1` removed it. The tracing layer is built without `with_ansi` and so defaults to ANSI on: `grimoire/src/main.rs:458-462` | runs above; `grep -n with_ansi grimoire/src/main.rs` finds no call |
| Colour via `--color always` | banner art in `ocx about`-style output carries 256-colour codes (`^[[38;5;203m`) | not run | `ocx --color always about \| cat -v` |
| Non-terminal stdout | plain padded table; json via `--format json` or `--json`; `ocx env` warns `default output is not eval-safe; use --shell=bash` | plain table, `--format json`; `grim search` pads Summary column with trailing spaces to full width (about 200 columns) | runs; `ocx_console/src/data_interface.rs:168` |
| Progress | `indicatif` MultiProgress on stderr, spinners and byte bars, hidden under `--quiet`; piped runs print plain lines (`pulling count=1`, `Downloading layer sha256:... to <path>`) | A single stderr bar, only when stderr is a terminal; `--progress auto\|json\|none`, NDJSON events as a machine mode; `grim update` and `grim add` never show it | `ocx_console/src/progress.rs:26-57,95-104`; `grimoire/src/cli/progress.rs:1-10`; `grim --help` (Options) |
| Update notice | background check, gated on stderr being a terminal | not found | `ocx_cli/src/app/background_check.rs:50` |
| Shell completions | `ocx shell completion --shell zsh` (flag, not positional; `ocx shell completion zsh` exits 64), `--if-enabled`, `OCX_NO_COMPLETION=1`; injected by `$OCX_HOME/env.sh`. NOT under `ocx self`, though `ocx self --help` says "PATH activation, completions, self-update"; `ocx self completions` exits 64 | `grim completions <bash\|elvish\|fish\|powershell\|zsh>`, 2505 lines for zsh (`grim completions zsh \| wc -l`); no nushell | `ocx_cli/src/command/shell_completion.rs:13-48`; runs |
| Exit codes | sysexits-style: 64 usage, 65 data, 78 config, 79 not found, 80 auth, 81 offline-blocked | same family: 64, 65, 78, 79, 80 | `grimoire/src/error.rs:1956`; runs |

## 4. Twenty error messages

Legend. W = says what happened. Y = says why. N = says what to do next. I = names the offending input. Y/N values are yes, part or no. Every row was reproduced by its own command in the repair pass (all with `HOME`, `OCX_HOME` and `GRIM_HOME` in a scratch directory, stdin `/dev/null`). Commands for the three rows that had not been: row 6, `ocx package install nodejs/node:24 2>&1` (ran against the network into a scratch `OCX_HOME`, the second disclosed write beyond read-only; printed `no trust policy covers 'ocx.sh/nodejs/node'; installing ... without signature verification` as an unprefixed stderr line, exit 0 for that step); row 8, `ocx package exec nodejs/node:24 -- nosuchbin 2>&1 | cut -c1-400` after that install (printed `error: "nosuchbin" does not resolve in the composed environment; searched: [...]`); row 10, `ocx --offline package info nodejs/node 2>&1 | head -5` (printed `warning: ocx package info is renamed to ocx package description pull and is removed in 0.7`, then `error: network operation attempted in offline mode`). Rows 1-5, 7, 9 and 11-20 keep the commands given in sections 1-3 and in the Source column.

| # | Message (shortened) | Source | W | Y | N | I |
|---|---|---|---|---|---|---|
| 1 | `unknown subcommand 'instal'; if ocx-instal is an official OCX plugin, install it with ocx --global add ocx.sh/ocx/instal, ...` | `ocx_cli/src/app/plugin_dispatch.rs:92` | yes | part | yes | yes |
| 2 | `no ocx.toml found in /tmp/cx or any parent; run ocx init to create one` | `ocx_cli/src/app/project_context.rs:35` | yes | yes | yes | yes |
| 3 | `'ocx.sh/ghost:1' is not in the index at https://index.ocx.sh, which is authoritative for every name in registry 'ocx.sh'; announce it there with ocx package announce, or take the namespace off the index ...` | `ocx_index/src/error.rs:255` | yes | yes | yes | yes |
| 4 | `resolves to sha256:a063... but is not installed; run ocx install ocx.sh/nodejs/node:24` | `ocx_package_manager/src/error.rs:357` | yes | yes | yes, but the named command does not exist (`ocx install` hits the plugin error, row 1) | yes |
| 5 | `invalid identifier 'Bad_Name!': repository must be lowercase` | `ocx_oci/src/package_ref/error.rs:33` | yes | yes | no | yes |
| 6 | `no trust policy covers 'ocx.sh/nodejs/node'; installing ... without signature verification` (printed with no level prefix, on every unsigned install; the source emits it with `log::info!`, `auto_verify.rs:430`, so it is an info-level line that appears at default verbosity) | `ocx_package_manager/src/tasks/auto_verify.rs:431` | yes | yes | no | yes |
| 7 | `binding 'nosuch' not found in the selected groups (default); pass -g to select another group` | `ocx_cli/src/command/pull.rs:184`, `app/project_context.rs:428` | yes | part | yes | yes |
| 8 | `"nosuchbin" does not resolve in the composed environment; searched: [...]` (dumps every search path, 300+ characters; the list includes the cwd project's `.ocx/toolchain/links/default/*` entries, not only the package asked for) | `ocx_config/src/env.rs:423` | yes | part | no | yes |
| 9 | `--identifier (-i) is required: the build receipt beside the bundle records no identifier; pass --identifier, or run ocx package create --identifier <IDENTIFIER> ...` | `ocx_cli/src/build_receipt.rs:143` | yes | yes | yes | yes |
| 10 | `network operation attempted in offline mode` (from `ocx --offline package info`; preceded by a deprecation warning for the command) | `ocx_package_manager/src/error.rs:55` | yes | yes | no | no |
| 11 | `/tmp/cx4/ocx.toml: ocx.toml already exists at '/tmp/cx4/ocx.toml'` (path printed twice) | `ocx_project/src/error.rs:645` | yes | no | no | yes |
| 12 | `could not infer the kind of 'ghcr.io/grimoire-rs/skills/grim-usage:latest'; pass --kind skill\|rule\|agent\|bundle\|mcp\|hook\|settings` (the runtime list also omits `mod`, which the source string has) | `grimoire/src/command/command_error.rs:56` | yes | no | yes | yes |
| 13 | `no grimoire.lock found at /tmp/cx3/grimoire.lock; run grim lock first` | `grimoire/src/command/command_error.rs:21` | yes | part | yes | yes |
| 14 | `no registry given; pass a registry argument or set GRIM_DEFAULT_REGISTRY` | `grimoire/src/command/command_error.rs:42` | yes | no | yes | no |
| 15 | `unknown config key 'nonexist'; valid keys: options.default_registry, options.clients, ...` | `grimoire/src/command/config.rs:401` | yes | no | yes | yes |
| 16 | `/tmp/cx2: no grimoire.toml found by walking up from the working directory` (no `grim init` hint, unlike ocx row 2) | `grimoire/src/config/config_error.rs:148` | yes | yes | no | yes |
| 17 | `'nothing': not declared` (from `grim why skill nothing`) | `grimoire/src/resolve/resolve_error.rs:355` | yes | no | no | yes |
| 18 | `./nonexist: skill directory has no SKILL.md` (from `grim build ./nonexist`; the path may not exist at all, and that case is not distinguished) | `grimoire/src/skill/skill_error.rs:62` | yes | no | no | yes |
| 19 | `ghcr.io/grimoire-rs/not-a-ref:latest: registry authentication failed: Not authorized: url https://ghcr.io/v2/...` (the real cause was a nonexistent repository) | `grimoire/src/oci/access/error.rs:75` | yes | part | no | yes |
| 20 | `no AI client detected; installing into the cross-vendor .agents/skills pool, which Claude Code and most other clients do not read - select a client with --client o...` (a WARN log line with timestamp) | `grimoire/src/install/installer.rs:800` | yes | yes | yes | no |

Tally (from the table): says what happened 20 of 20; says why yes 9, part 5, no 6; says what to do next 11 of 20 (one of the 11 points to a command that does not exist); names the offending input 17 of 20 (rows 10, 14, 20 do not). The strongest messages (2, 3, 9) have all four parts. The weakest are the noun-phrase fragments: rows 11, 17, 18.

Format differences. ocx prefixes `error:`; grim usage errors prefix `error:` (clap) while runtime errors have no prefix and lead with the path (`/tmp/cx2: no grimoire.toml...`, `./nonexist: skill directory...`). Mixed conventions inside one binary.

## 5. Installers

| Item | ocx (`setup.ocx.sh/sh`, 1193 lines) | grim (`setup.grimoire.rs/sh`, 35 lines, delegates to a 1919-line cargo-dist script) |

Line counts: `wc -l ocx-sh/www-setup/src/install.sh` prints 1193; `wc -l grimoire-rs/grimoire/docs/public/install.sh` prints 35; `wc -l ~/.cache/research-lang/exemplars/product/cli-first-run/grim-dist.txt` prints 1919 (the downloaded `grimoire-installer.sh`); `wc -l ocx-sh/www-setup/src/install.ps1` prints 1067; `wc -l grimoire-rs/grimoire/docs/public/install.ps1` prints 12 (all paths relative to `/home/mherwig/dev`).

|---|---|---|
| Source | `ocx-sh/www-setup/src/install.sh` (byte-identical to the served file: `diff ocx-sh.txt install.sh` printed nothing) | `grimoire-rs/grimoire/docs/public/install.sh`; the served copy differs in two comment lines (lines 2 and 9: served says setup.grimoire.rs, repo says "docs site" and `grimoire.rs/install.sh`); the downstream installer is generated by cargo-dist and not in the repo |
| Streams | all messages to stderr; stdout silent unless `OCX_INSTALL_PRINT_PATH` (`install.sh:27-29`) | cargo-dist `say` to stderr |
| Success | `ocx X installed successfully!` then `Restart your shell, then verify with: ocx about` and an uninstall recipe (`rm -rf $_ocx_home`), `install.sh:885-902`; silent under `OCX_INSTALL_QUIET` | `everything's installed!` (`grim-dist:966` in the fetched copy), then, only if it edited no profile, `To add <dir> to your PATH, either restart your shell or run: source <env script>` (lines 1009-1012). No "verify with" and no first command. |
| Failure | `ocx-install: error: <msg>` (`install.sh:143`) with documented exit codes 0-7 (`install.sh:5`), e.g. `unsupported architecture: ... (expected x86_64 or aarch64)` (`:359`), `failed to extract ... ensure tar is installed` (`:666`); retries `download failed (attempt N/M), retrying in Ns` (`:533`) | `grim install: need curl or wget on PATH` (`install.sh:31`), no next step; downloader errors come from curl |
| Re-run | `ocx vX already installed at ~/.ocx/... (set OCX_INSTALL_FORCE=1 to reinstall)` (`:1080`) | cargo-dist default |
| Verification | sha256 from a manifest on another origin than the archive (`install.sh:4`) | sha256 inside the cargo-dist installer |
| Piped-install ergonomics | `--no-modify-path`, `--version`, `--help` | `--no-modify-path` forwarded |
| Windows | `install.ps1` 1067 lines, `ocx X installed successfully!` at `install.ps1:779` | 12-line wrapper doing `irm` + `iex` of the cargo-dist `.ps1` |

Neither installer tells the user what to do after the verify step (for ocx: `ocx init` or `ocx package exec`; for grim: `grim init`). The first-run path ends at the installer and resumes in the README, a context switch the installer could close with one line.

## Smells

Ranked by how often an agent or a new user would hit it.

1. Top-level mistype on ocx has no suggestion and a misleading plugin message (`plugin_dispatch.rs:92`); `ocx instal` is the likeliest first-week typo. Nested commands and all of grim do suggest.
2. Error message `ocx install ...` is recommended by the product itself (`ocx_package_manager/src/error.rs:357`) but is not a command: it routes into row 1. A copy-paste of the fix fails.
3. grim: a nonexistent repository on GHCR reports "registry authentication failed" (row 19), pushing the reader toward `grim login` instead of checking the name.
4. grim logs print ANSI escapes when stdout and stderr are piped and `--color never` is given (`main.rs:458-462`); only `NO_COLOR` strips them. This breaks the grim contract written in `cli/color.rs:23-26`.
5. Neither CLI has an examples section in help (1 inline hit in ocx, 0 in grim); help for `ocx exec` is 102 lines of prose before `Usage`.
6. Command lists are not ordered by use: `package` is row 14 of 23 in ocx, `add` row 11 of 27 in grim.
7. Docs and README split the first run into two models (ocx: package-level versus project-level; README adds an install step the site says is optional).
8. grim quickstart documents a silent fallback to `.agents/skills/` ("Nothing in the command output tells you"); the code now prints it, so the docs are stale, yet the notice is a timestamped WARN, not a result row.
9. Fragment-style errors (rows 11, 17, 18) lack cause and next step; runtime grim errors lead with a path prefix and no `error:` token.
10. `ocx --version` and `-V` fail; `ocx self --help` advertises completions that live under `ocx shell completion`.
11. Installer ends at "verify" with no first command; the grim installer has no verify line at all.
12. An unsigned install prints `no trust policy covers ...` on every install, in the stderr stream, without `warning:`, which trains users to ignore the one security-relevant line.

## Patterns worth encoding

Each is checkable. The rule text a later pass writes should carry its check.

1. Every error message has four parts: what happened, why, a runnable next step, the offending input. Check: a unit test or fixture that runs each reachable failing command and asserts a next-step verb (`run`, `pass`, `set`, `use`) and the quoted input appear. Positive exemplar: `project_context.rs:35`, `ocx_index/src/error.rs:255`.
2. Every next step named in an error is a command that parses. Check: extract backtick spans from error strings in source and run `<cmd> --help` for each. Row 4 fails this today.
3. Did-you-mean is on for every dispatch layer. Check: run `<cli> <typo-of-top-level>` and `<cli> <group> <typo>`; both print a `tip:` with a candidate. grim passes both; ocx passes one.
4. Colour obeys one decision object. Check: run a command that logs, with `--color never` and with stdout piped, and `grep -c $'\x1b'` on the combined stream equals 0. grim fails on logs; ocx passes on the run measured.
5. Progress is terminal-gated and has a machine mode. grim's `--progress json` and ocx's `--quiet` are the two shapes. Check: piped run emits no `\r` and no `\x1b[`.
6. Exit codes are sysexits-style and documented in the same help text that introduces the flag (ocx exemplar: global options in `ocx --help`).
7. Help carries one worked example per leaf command. Check: `<cli> <cmd> --help` contains a line starting with the binary name inside an "Examples" block; neither CLI passes yet.
8. Quickstart length bound. Check: words from the README top to the first working command stay under 300 and commands stay at or under 3 (both READMEs pass: 97 and 257 words, 3 commands each).
9. Installer ends with the first command, not only "restart your shell". Check: the success banner contains the quickstart's first command (ocx prints `ocx about`; grim prints none).
10. Installer failure names the exit code class and the user's lever (`OCX_INSTALL_*` or a flag). ocx exemplar: `install.sh:5` plus `:402`, `:453`.

## What this contradicts in the frame

- The frame lists "the CLIs ocx and grim and their installers" as one surface class with "READMEs and release notes". The measurements say the CLI is the primary UX surface of both products, with its own failure modes: error text, help layout, colour, did-you-mean. These are not documentation problems. The frame's coverage note ("CLI stream and exit-code contracts in the language sets") covers streams and exit codes; it does not cover help layout, example presence, command ordering, error wording or next-step correctness. All four were measured here and are not covered by the existing rules.
- The frame's hypothesis that `ux-quality` may split CLI from GUI ("UX guidance for command-line tools and for graphical interfaces shares too little to live in one rule") is supported: nothing in section 3 or 4 has a graphical counterpart, and the checks (exit code, ANSI count, did-you-mean) are scriptable in a way that graphical checks are not.
- The frame treats `installer-script` and `shell-integration` as already covered. The measured installer behaviours (success banner content, next-step line, quiet flag, stream contract) are covered for ocx's script but the grim installer is a cargo-dist output outside the repo, so a repo-level rule cannot reach its wording.
- Smaller correction: the frame calls the fleet "developer tools sold to engineers" and assumes marketing surfaces dominate. For these two tools the first 10 minutes are spent in the terminal and the install script, not on a website; the READMEs are 94 and 110 lines (`wc -l ocx-sh/ocx/README.md grimoire-rs/grimoire/README.md`, run from `/home/mherwig/dev`).
