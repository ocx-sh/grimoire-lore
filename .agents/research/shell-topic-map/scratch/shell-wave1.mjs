export const meta = {
  name: 'shell-wave1-ground-and-scout',
  description: 'Shell research program wave 1: seven grounding audits (fleet, ocx emitter, installers, exemplar corpus, emitters, platform matrix, config) and five landscape scouts over the shell corpora',
  phases: [
    { title: 'Ground', detail: 'numbers-first audits with real multi-shell runs' },
    { title: 'Scout', detail: 'five corpus surveys that discover candidate topics' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/shell-frame.md'
const EX = '/home/mherwig/.cache/research-lang/exemplars/shell'
const TOOLS = '/home/mherwig/.cache/research-lang/shell-tools'
const FIX = TOOLS + '/fixtures'
const DATE = '2026-10-10'

const PREAMBLE = (rationale) => `Model rationale: sonnet — ${rationale}

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program that makes an AI-agent fleet expert in SHELL SCRIPTING ACROSS OPERATING SYSTEMS AND SHELLS as of late 2026: POSIX sh and its implementations (dash, busybox ash, bash --posix, mksh, ksh93, yash, posh, FreeBSD sh), bash 3.2 (macOS /bin/bash) through 5.3, zsh, fish (3.x and the 4.x Rust rewrite), nushell, elvish, Windows PowerShell 5.1 and PowerShell 7.x, the userland underneath (GNU coreutils vs BSD/macOS vs busybox vs uutils), CI shells (GitHub Actions run: defaults, taskfile cmds), and code that EMITS shell code for many shells (activation, hooks, rc blocks, completions, installers). Focus: compatibility across OSes, each OS's default shell, and which features work in which version. Its output becomes AI-agent configuration (glob-scoped rules with support directories, skills, a bundle) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root and never cd to /home/mherwig/dev/grimoire-lore itself).
- Read the frame first, in full: ${FRAME}. It names the era facts, the adopting codebases, the hypotheses H1-H9, the owner-question defaults Q1-Q6, and the intended artifact set.
- MEASUREMENT TOOLCHAIN (use it; a claim you ran beats a claim you read): '${TOOLS}/matrix.sh <family> <script> [args]' runs one script under every interpreter of a family and prints '== <interp>', output, '-> exit N'. Families: posix (dash, busybox ash 1.35 and 1.37, mksh, ksh93u+m x2, yash, posh, bash 3.2 and 5.2 --posix, zsh --emulate sh), bash (3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3), zsh (5.0.8 5.3.1 5.8 5.9), fish (3.6.0 4.0.2 4.7.0 4.9.3), nu (0.105.1 0.116.0), elvish (0.21.0), pwsh (7.4 LTS, 7.6.6, Windows PowerShell 5.1 on the real Windows host), win (Git Bash and Windows PowerShell 5.1 on the Windows host). '${TOOLS}/run.sh <cmd>' puts fish, nu, elvish, pwsh 7.6.6, shellcheck 0.11.0 and shfmt 3.13.1 on PATH. Docker images available: bash:<ver>, zshusers/zsh:<ver>, shellzoo:deb12 and shellzoo:deb13 (Debian shell packages incl. dash mksh ksh yash posh busybox fish), alpine:3.22, busybox:1.37, ubuntu:24.04, mcr.microsoft.com/powershell:lts-7.4-ubuntu-22.04; you may docker pull other small official distro images when your axis needs them. Scripts passed to matrix.sh must live under /home/mherwig/.cache/research-lang. Put fixtures ONLY under ${FIX}/<your-key>/ — never /tmp (tmpfs nearly full), never inside an exemplar clone or a fleet repo. Bound every run with 'timeout 300'. No macOS host: macOS-only claims are read-only and must say so; bash:3.2 reproduces /bin/bash 3.2.57 semantics but not BSD userland.
- EXEMPLAR CORPUS: 41 upstream repos cloned depth-1 under ${EX}/<owner>__<repo> (large ones sparse to shell sources). SHAs: ${RESEARCH}/shell-audit/scratch/exemplar-shas.md. Cite <repo>@<sha12>:<path>:<line>.
- THE FLEET is /home/mherwig/dev. When counting it, EXCLUDE: any .worktrees/ or .agents/worktrees/ dir, .tmp/ and .tmp-*/ and .probe-*/ dirs, node_modules/, target/, .git/, .venv/, venv/, .cache/, bazel-* symlinks, vendor/, external/, and the sibling clones ocx-sion, ocx-soraka, ocx-evelynn, ocx-save, index-claims, index-fix67, find_ocx-ocx06; dedupe repos by git remote. Run find/grep through 'bash -c' (the login shell is zsh, which does not word-split unquoted variables).
- Sibling lore rule sets exist under ${ROOT}/rules/ and skills under ${ROOT}/skills/ (rust, python, typescript, jvm, go, cmake, nix, bazel, swift, docs, code-docs, css). Shell-adjacent content there (CI notes, checks/*.sh, the rust cli-contract depth file) is prior art; a topic that is really generic CI or docs belongs to those sets.
- The hypotheses H1-H9 in the frame are HYPOTHESES, never premises. Contradicting one with evidence is the most valuable result you can produce.
- The only file you may create or modify is your own OUTPUT FILE (plus throwaway fixtures under ${FIX}/<your-key>/). Read-only everywhere else. Never run a fleet or exemplar script that writes outside fixtures, touches the network beyond fetching docs, or needs root; installers are run only in syntax-check or dry-run modes, or inside a throwaway container.
- Date everything as researched ${DATE}. Flag every claim that is version-specific with the version (bash 4.0+, pwsh 7.3+, nu 0.110+, fish 4.0+ ...).

ALREADY COVERED: nothing — first wave of the shell program.
`

const GROUND_CONTRACT = (subject, path) => `You are producing a numbers-first audit of ${subject} so a later authoring pass is grounded in what is actually there.

Write ${path} with YAML frontmatter (title, agent, model, scope, method, date_researched: ${DATE}). 'method' must describe the exact commands used so every number is re-runnable; inline each command next to its result.

The orchestrator's hypotheses are HYPOTHESES, not premises. If the measurements contradict one, say so plainly and show the counts. That is the most valuable result this audit can produce.

Every claim needs a file:line or <repo>@<sha12>:<path>:<line> citation. A grep count is a hypothesis: spot-read 3 hits per pattern, report the false-positive rate you saw, and prefer a short python3 -I parse where a regex is fragile. Report per-repo tables AND totals; name the extremes. Where you can RUN something through matrix.sh to settle a behaviour question, run it and paste the trimmed output.

Structure: frontmatter, a table of contents, "## Headline numbers", one "## <axis>" section per numbered demand below (commands inline, tables over prose), "## Smells (ranked)", "## Patterns worth encoding", "## Contradictions of the frame", "## Gaps". Aim for 300-600 lines; density over prose. Return the structured receipt.`

const SCOUT_CONTRACT = (corpusName, path) => `You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert must be expert in, ranked by how much each changes real script quality and portability.

YOUR CORPUS: ${corpusName}

OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, corpus, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone claim about what this corpus says matters.
4. "## Survey" — numbered subsections, one per source or source cluster actually read: what it argues or lists, with an inline markdown link to the exact URL read. Quote exact option names, builtins, parameter-expansion forms, SC codes, PSScriptAnalyzer rule names, version numbers, command lines.
5. "## Candidate topics" — a table: topic (a QUESTION, not a subject area) | why it matters | source (URL) | already-covered? (yes/partial/no, against sibling lore sets) | shells/surface it binds (posix / bash / zsh / ksh / fish / nu / elvish / pwsh / userland / ci / emitter / installer / testing / lint-format / security / any) | priority for THIS project shape (P0-P3, one clause). Aim for 30-50 candidates. Include the topics that sound boring but bite: word splitting and globbing, IFS, locale and LC_ALL, encoding and BOMs, CRLF line endings, filenames with newlines/leading dashes, exit status propagation through pipes and subshells, signal handling and traps, temp files and cleanup, concurrency and lockfiles, atomic file replacement, PATH lookup and command hashing, here-doc quoting, arithmetic overflow and octal, time and date, sort order and determinism, idempotent rc-file edits.
6. "## Recent shifts seen in this corpus" — what changed in the last 24 months and what older advice it invalidates, with version and date.
7. "## Contested" — where sources disagree, and which way it is trending.
8. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 15 distinct sources, at least 8 primary (specs, official manuals, NEWS/CHANGES/changelogs, the tool's own repo or docs, official Microsoft docs).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For long reference pages and GitHub-hosted files prefer fetching the raw file verbatim with 'curl -sL <url>' through Bash (WebFetch returns a summary; a catalogue sweep needs the full list). Save nothing outside your output file except under ${FIX}/<your-key>/.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE}; flag historical-only guidance.
- A candidate is a question a rule could later answer with a verification command. "Portability" is a wave; "which bash features a script that may run on macOS /bin/bash 3.2 must avoid (assoc arrays, mapfile, case-modifying expansions, [[ -v ]], negative array indices), and how a reviewer detects them mechanically" is a topic.
- Return the structured receipt with the candidate list as structured data.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline_numbers: { type: 'array', items: { type: 'string' } },
    top_smells: { type: 'array', items: { type: 'string' } },
    patterns_worth_encoding: { type: 'array', items: { type: 'string' } },
    contradictions_of_frame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline_numbers', 'top_smells', 'patterns_worth_encoding', 'contradictions_of_frame'],
}

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    primary_sources_count: { type: 'number' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          why: { type: 'string' },
          source: { type: 'string' },
          covered: { type: 'string', enum: ['yes', 'partial', 'no'] },
          surface: { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
        },
        required: ['slug', 'why', 'source', 'covered', 'surface', 'priority'],
      },
    },
    recent_shifts: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'sources_count', 'primary_sources_count', 'candidates', 'recent_shifts'],
}

// ---------------------------------------------------------------- Ground
const GROUNDERS = [
  {
    key: 'config-inventory',
    prompt: `${PREAMBLE('inventory and faithful digesting of existing config; no judgment that becomes a rule')}
${GROUND_CONTRACT("the lore catalog's house conventions and every existing piece of AI config or tool config touching shell", RESEARCH + '/shell-audit/config-inventory.md')}
Measurement axes:
1. House conventions. For ${ROOT}/rules/swift-quality.md, go-quality.md and nix-quality.md: frontmatter (globs/paths, description, metadata), line count, section skeleton, how non-negotiables and rule IDs are laid out, the depth-file routing table, the gate block, depth-file count and sizes, and how depth files avoid autoloading (the never-matching paths glob convention). Then two skills (${ROOT}/skills/swift-diagnose/ and ${ROOT}/skills/go-release/): frontmatter, step layout, the duplicated MUST table shape, references/. One bundle (${ROOT}/bundles/swift-essentials.toml) and the publish.toml entries for the Swift set. Digest the conventions a shell set must follow, verbatim where they are rules.
2. The artifact checker contract: read ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py and list every check (budgets, glob liveness, verification-command lints, ID-table parsing) with line numbers; plus the hard budgets in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md and validation.md. Note specifically which glob forms the checker can prove live, because shell scripts are often extensionless (a rule cannot glob a shebang) — how could a shell rule load for bin/foo with '#!/bin/sh'? Report what other sets do for extensionless files, if anything.
3. Shell touchpoints already in the catalog: grep -rn -i -e shellcheck -e shfmt -e 'set -e' -e pipefail -e bashism -e posix -e powershell -e pwsh -e '#!/' over ${ROOT}/rules ${ROOT}/skills ${ROOT}/docs: per-file hit counts and the normative ones quoted. Run shellcheck (via run.sh) over every checks/*.sh and every shell code block a rule or skill ships as a verification command sample (sample 40 fenced sh/bash blocks; report how many are not POSIX, how many would fail under zsh, which assume GNU tools). This measures whether the catalog's own verification commands are portable to macOS — they run on adopters' machines.
4. The CLI contract a shell script should mirror: ${ROOT}/rules/rust-quality/cli-contract.md (and platform-and-paths.md if present): digest each rule ID with its one-line imperative, and mark which translate to shell (exit codes, stderr vs stdout, signals 128+n), which need shell-specific mechanisms, which are Rust-only.
5. Fleet AI config about shell: grep the fleet's CLAUDE.md, AGENTS.md, .claude/rules, .claude/skills, .cursor, .github/copilot-instructions.md files (excluding the lore catalog itself) for shell guidance (bash, sh, zsh, pwsh, PowerShell, shellcheck, set -e). Quote the normative lines with file:line.
6. Fleet tool config: every .shellcheckrc, .editorconfig with shell sections (shfmt reads editorconfig), pre-commit hooks running shellcheck/shfmt/PSScriptAnalyzer, CI steps running them, PSScriptAnalyzerSettings.psd1. Report which repos gate shell code at all.
7. Gaps: which concerns from the frame have NO existing config anywhere. One line each.`,
  },
  {
    key: 'fleet-shell-shape',
    prompt: `${PREAMBLE('counting and running linters over fleet shell code; volume work with commands, no rule decisions')}
${GROUND_CONTRACT("the fleet's shell code (files, inline CI/taskfile shell, PowerShell, fish/nu)", RESEARCH + '/shell-audit/fleet-shell-shape.md')}
Measurement axes:
1. Inventory, deduplicated per the exclusion list: per repo, count of *.sh, *.bash, *.zsh, *.ps1/*.psm1/*.psd1, *.fish, *.nu, *.elv, and extensionless executable files by shebang. The frame saw ~1100 extensionless '#!/bin/sh' files: find out what they are (generated shims? git hooks? test fixtures? snapshot outputs?) with path-prefix histograms, and say which count as authored code. Separate authored scripts from generated, vendored and fixture files and say how you decided.
2. Dialect census over authored scripts: shebang distribution (#!/bin/sh, #!/usr/bin/env bash, #!/bin/bash, #!/usr/bin/env sh, none); for every '#!/bin/sh' or '#!/usr/bin/env sh' script run 'shellcheck -s sh -f gcc' and count SC3xxx (bashisms) per file — what share of sh scripts would break under dash? Confirm 5 of them by actually running them (or their extracted bashism lines) through 'matrix.sh posix' with a harmless fixture copy.
3. Full shellcheck run (shellcheck 0.11.0 via run.sh, dialect from shebang, -f json or gcc) over all authored scripts: SC code histogram (top 30 with counts and one-line meaning), findings per KLOC per repo, the worst 10 files. Then 'shfmt -d -i 2' and 'shfmt -d' (tabs) counts: how many files are already shfmt-clean under some style, and which indent style dominates.
4. Error-handling census: set -e, set -u, set -o pipefail, set -euo pipefail, 'set -eu', IFS=, trap ... EXIT/ERR/INT, 'local x=$(...)' (masks status), '|| true', 'cd ... ||' guards, 'mktemp' use. Per repo counts and which combos.
5. Bash-version features used in bash scripts (each with its minimum bash version): declare -A, mapfile/readarray, '\${x,,}' / '\${x^^}', '[[ -v', 'local -n'/'declare -n', 'wait -n', '\${x@Q}', printf -v, '&>>', '|&', coproc, EPOCHSECONDS/EPOCHREALTIME, negative array subscripts, globstar, BASH_REMATCH. Which of those scripts plausibly run on macOS developer machines (taskfiles, scripts/ invoked from task, install scripts, git hooks) — those are bash-3.2 risks. Run 3 of them under 'matrix.sh bash' to show where they break.
6. Inline shell: GitHub workflow run: blocks (count per repo, shell: keys and defaults.run.shell used, runs-on OS mix, run blocks on windows runners without shell:, '\${{ ... }}' interpolated directly into run: scripts — a script-injection smell; count those whose expression is attacker-controllable like github.event.* or inputs.*), and taskfile.yml cmds (count; note taskfile cmds run under mvdan/sh, an in-process POSIX-ish interpreter — find any bash-only syntax in them). Use python3 -I with a YAML parser if available (or careful grep) and say which.
7. PowerShell files: count, #Requires lines, PSEdition/version checks, Set-StrictMode, ErrorActionPreference, use of 7-only syntax (ternary ?:, &&/||, ??, -Parallel, null-conditional ?.) in scripts that must run on 5.1 (installers), BOM presence and encoding of each .ps1 ('file' command), CRLF vs LF. Run each .ps1 through a parse-only check on Windows PowerShell 5.1 and pwsh 7.6 if you can do it without executing (e.g. a small fixture that calls [System.Management.Automation.Language.Parser]::ParseFile and prints errors) via matrix.sh pwsh.
8. fish/nu/elv files: what they are (completions, activation, configs, scripts), and whether they parse on the oldest interpreter in the matrix (fish --no-execute, nu --ide-check or a parse-only approach you verify, elvish -compileonly).
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'ocx-emitter',
    prompt: `${PREAMBLE('auditing a real multi-shell code emitter and running its output through every target interpreter; measurement, not rule decisions')}
${GROUND_CONTRACT("ocx's multi-shell emitter and setup code (/home/mherwig/dev/ocx, read-only)", RESEARCH + '/shell-audit/ocx-emitter.md')}
Measurement axes:
1. Map the surface: /home/mherwig/dev/ocx/crates/ocx_shell (shell.rs, escape.rs, hook.rs, reconcile/), crates/ocx_setup (rc_block.rs, profiles.rs, shims.rs, lib.rs), crates/ocx_cli (command/self_group/activate.rs, conventions.rs, api/data/shell_state.rs). For each supported shell: which files emit for it, the escape function used (quote it with file:line), the hook mechanism, the rc/profile file it edits, how activation is undone, and the tests that cover it (file:line). Produce a table: shell | escape fn | hook | rc file | deactivate | tests.
2. Escaping correctness, MEASURED: build a value corpus of hostile strings (single quote, double quote, dollar, backtick, backslash, newline, carriage return, tab, percent, caret, semicolon, braces, parentheses, hash, tilde at start, leading dash, empty string, trailing backslash, non-ASCII UTF-8, emoji, NUL is illegal so skip, very long value, Windows path with backslashes and spaces, a value that looks like an option). Reimplement or extract each shell's escape logic faithfully (prefer calling the real code: is there a test binary, a CLI subcommand such as 'ocx shell env --shell <x>' or 'ocx self activate', or can you run 'cargo test -p ocx_shell' read-only into a target dir under ${FIX}/ocx-emitter/target with CARGO_TARGET_DIR? If you build, set CARGO_TARGET_DIR there and bound it with timeout 900). Then for each shell run the emitted assignment in the real interpreter (matrix.sh families) and compare the resulting variable to the input byte-for-byte. Report a pass/fail matrix shell x value with interpreter versions; for each failure a minimal reproducer and the file:line of the defect. The installed ocx binary is on PATH (check 'ocx --help' for activation/env subcommands and use them if they emit shell code).
3. Version floors: does the emitted code use features beyond each shell's oldest common version (bash 3.2 on macOS, zsh 5.0, fish 3.x vs 4.x, nu 0.105 vs 0.116, pwsh 5.1 vs 7)? Run the emitted activation scripts under the oldest interpreter of each family and report.
4. rc-file editing: idempotency of the rc block (markers, re-run behaviour, removal), file locations per shell and OS (bash: .bashrc vs .bash_profile on macOS login shells; zsh: .zshrc vs .zprofile vs ZDOTDIR; fish: conf.d; nu: config.nu/env.nu and the autoload dirs in recent nu; pwsh: $PROFILE variants on 5.1 vs 7 and the OneDrive-redirected Documents folder on Windows; elvish: rc.elv location changes), CRLF and BOM handling, permission and symlinked-rc handling. Cite code and compare against each shell's documented startup-file order (fetch the docs).
5. Shims: what shims.rs generates per OS (sh script? .cmd? .ps1? hardlinks?), argument forwarding correctness ("$@" vs $*), exit-code propagation, and a run of a generated shim with hostile arguments if you can produce one.
6. Install scripts for ocx and grimoire: find them (ocx website/, packaging/, grimoire repo, setup-ocx / setup-grimoire actions) — only list and cite them here; a separate audit covers installers in depth.
7. Compare briefly with zoxide/starship/direnv/mise in ${EX} (same concerns, one line each) so the reader sees whether ocx is behind or ahead of prior art.
Do NOT modify anything in /home/mherwig/dev/ocx. Report defects as evidence with reproducers; do not fix them.`,
  },
  {
    key: 'installers',
    prompt: `${PREAMBLE('auditing installer scripts across the fleet and exemplars with real multi-shell syntax runs; measurement, not rule decisions')}
${GROUND_CONTRACT('installer and bootstrap scripts (curl | sh and irm | iex style) in the fleet and in the exemplar corpus', RESEARCH + '/shell-audit/installers.md')}
Measurement axes:
1. Locate the fleet installers: ocx (website/ public install.sh / install.ps1, packaging/), grimoire, setup-ocx and setup-grimoire GitHub actions (/home/mherwig/dev/setup-grimoire and any setup-ocx), www-setup, rust-devcontainer-cli, anything named install*.sh / install*.ps1 / get*.sh. List with size, shebang, dialect.
2. Exemplar installers: rustup (rustup-init.sh), deno_install (install.sh, install.ps1), Homebrew/install (install.sh), docker-install, k3s install.sh, cargo-dist installer templates (find the jinja templates for install.sh and install.ps1), dotnet-install.sh / dotnet-install.ps1, ScoopInstaller/Install install.ps1, nvm install.sh, acme.sh, vcpkg bootstrap. For EACH installer (fleet and exemplar) fill a comparison table: dialect and declared floor; platform detection (uname -s / -m mapping, how Rosetta / arm64 macOS, musl vs glibc detection (ldd --version? /lib/ld-musl?), WSL, MINGW/MSYS/Cygwin are handled); downloader (curl vs wget fallback, flags like --proto =https --tlsv1.2 -fsSL, retries); integrity verification (sha256sum vs shasum -a 256 vs openssl dgst, signature checks, what happens when no hasher exists); temp dir and cleanup (mktemp forms, trap); the 'wrap everything in a function called at the last line' guard against truncated downloads; root/sudo handling; install location and PATH/profile editing (which rc files, idempotent?); non-interactive / CI modes and env-var knobs; uninstall story; exit codes. Cite every cell.
3. RUN: for every POSIX installer, 'sh -n' under every interpreter in 'matrix.sh posix' (copy each installer into ${FIX}/installers/ and wrap: 'sh -n' is not portable to every shell — design a per-shell parse-only invocation, verify it detects a planted syntax error in each shell, then run). Report a parse matrix installer x shell. Then 'shellcheck -s sh' on each with SC counts. For PowerShell installers run a parse-only check on Windows PowerShell 5.1 and pwsh 7.4/7.6 (Parser::ParseFile fixture via matrix.sh pwsh) and grep for 7-only syntax and for 5.1-sensitive calls (Invoke-WebRequest without -UseBasicParsing, missing [Net.ServicePointManager]::SecurityProtocol TLS 1.2, Expand-Archive version differences, $IsWindows / $IsMacOS use, Join-Path with more than two arguments, ConvertFrom-Json -AsHashtable, -Encoding utf8NoBOM).
4. Where cheap, run the fleet installers' platform-detection functions in isolation under alpine (busybox), debian (dash) and bash:3.2 containers with stubbed uname to see the detected target — only with extracted functions in fixtures, never the full installer against the network.
5. Ranked list of the defensive patterns the best installers share and the gaps in the fleet's installers, each with evidence.`,
  },
  {
    key: 'exemplar-shape',
    prompt: `${PREAMBLE('counting and linting shell code across 41 exemplar repositories; volume work with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (POSIX/bash/zsh scripts, PowerShell, fish/nu/elvish code)', RESEARCH + '/shell-audit/exemplar-shape.md')}
The corpus is every directory under ${EX} (skip koalaman__shellcheck.wiki and actions__runner-images, which are documents). Group by shape: POSIX installers, bash tools (pyenv rbenv nvm bats-core shellspec pure-bash-bible acme.sh), git t/, oils spec, zsh (ohmyzsh powerlevel10k zsh-autosuggestions), emitters (zoxide direnv fzf starship mise atuin conda oh-my-posh), fish/nu/elvish, PowerShell (PowerShell tools/, PSScriptAnalyzer, Pester, Scoop, posh-git). Measurement axes:
1. Dialect and floor census: shebangs; declared compatibility floors (grep READMEs/docs/CI for 'bash 3.2', 'POSIX', 'dash', 'busybox', 'zsh 5.', 'PowerShell 5.1', '#Requires -Version', fish/nu minimum versions) and whether CI actually tests that floor (look at .github/workflows matrices: which shells and OS images are tested).
2. Error-handling census per repo: set -e / -u / pipefail / errexit-free styles (explicit '|| return' / '|| exit'), trap usage, 'local x=$(..)' masking, '|| true'. Which strict, long-lived POSIX projects (git t/, acme.sh, rustup-init, nvm) avoid set -e and why (cite their comments or docs).
3. Bash-version feature usage per bash repo (same feature list as: declare -A, mapfile, case-mod expansions, [[ -v, namerefs, wait -n, @Q, printf -v, &>>, |&, coproc, EPOCH*, negative subscripts, globstar) mapped to each repo's declared floor: violations of its own floor are the interesting finding. Run 3 suspicious ones under 'matrix.sh bash' to confirm.
4. shellcheck 0.11.0 over each repo's scripts (dialect from shebang; cap at 300 files per repo, say if capped): SC histogram per group and corpus top 30; .shellcheckrc and inline 'shellcheck disable=' census (top disabled codes and the justifications given). Which codes do well-maintained projects disable most? That is a signal for which checks to relax.
5. Formatting: shfmt adoption (.editorconfig shell sections, CI steps), shfmt -d cleanliness rate by style; indentation conventions.
6. Testing: bats/shellspec/shunit2/git test-lib/Pester/fish tests/nu tests: which repos test their shell code, how (framework, CI matrix of shells), and coverage tools (kcov, shellspec --kcov).
7. PowerShell corpus: PSScriptAnalyzer settings files and the rules they enable/disable; Set-StrictMode and ErrorActionPreference usage; 5.1 compatibility patterns ($PSVersionTable.PSVersion.Major / PSEdition checks, compatibility shims); module manifest fields (CompatiblePSEditions, PowerShellVersion); Pester version used (v5 syntax?). Run PSScriptAnalyzer if you can install it into a cache-local module path: 'run.sh pwsh -NoProfile -c "Save-Module PSScriptAnalyzer -Path ${FIX}/exemplar-shape/modules"' then import from there; else say it was unavailable.
8. fish/nu/elvish corpus: what idioms dominate (fish functions/completions/conf.d/events; nu modules, def --env, export-env, hooks; elvish modules/use), and run the parse check of a 30-file sample of nu_scripts under nu 0.105.1 and 0.116.0 and of fish share/functions under fish 3.6 vs 4.9 (use the parse-only flags, verify each detects a planted error first). Report the breakage rate across versions — this measures version churn directly (frame H9).
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'emitters-compared',
    prompt: `${PREAMBLE('comparative reading and running of eight multi-shell emitters; measurement, not rule decisions')}
${GROUND_CONTRACT('the multi-shell emitters in the exemplar corpus: zoxide, direnv, fzf, starship, mise, atuin, conda, oh-my-posh', RESEARCH + '/shell-audit/emitters-compared.md')}
Measurement axes:
1. Support matrix: for each emitter, which shells it targets (bash, zsh, fish, nushell, elvish, pwsh, powershell 5.1, xonsh, tcsh, cmd, ion, murex, posix sh, ksh), where each template lives (file:line), and the minimum shell versions it documents or tests.
2. Escaping: quote each emitter's per-shell quoting/escaping function (or note where it interpolates without escaping) with file:line. Compare the strategies: POSIX single-quote with '\\'' splicing; bash $'...'; fish single-quote rules (only \\' and \\\\ are special); nu raw strings r#'...'# and its quoting rules; elvish single-quote ('' doubling); PowerShell single-quote ('' doubling) and the backtick escape; how each handles newlines and non-ASCII. Extract three representative escape functions into fixtures and run the same hostile value corpus (single quote, dollar, backtick, backslash, newline, CR, percent, unicode, leading dash, empty) through the real interpreters via matrix.sh to check correctness. Report pass/fail.
3. Hooks: per shell, which mechanism each emitter uses (bash PROMPT_COMMAND (string vs array form in bash 5.1+), DEBUG trap, zsh precmd_functions / chpwd_functions / add-zsh-hook, fish --on-variable PWD / fish_prompt / fish_preexec events, nu hooks.env_change.PWD / pre_prompt in config, elvish after-chdir / before-readline, PowerShell prompt function wrapping or PSReadLine handlers), and how each avoids clobbering other tools' hooks (append vs overwrite, idempotent re-sourcing guards).
4. Init model: eval "$(tool init bash)" vs sourcing a generated file vs autoload dirs (fish conf.d, nu vendor/autoload in nu 0.101+?, elvish rc) — which emitters cache generated code to disk and how they invalidate it; startup-time costs.
5. Deactivation/unload and environment restoration (direnv's diff model, mise's __MISE_DIFF, conda deactivate) and PATH manipulation (dedupe, prepend, Windows ; vs :, nu's list-typed PATH/Path, PowerShell $env:PATH separator [IO.Path]::PathSeparator).
6. Tests: how each emitter tests its shell output (snapshot tests? real-interpreter CI? which shells in CI?). Cite.
7. Version churn: from git history is not available (depth-1), so read CHANGELOGs for entries about nushell/fish/pwsh breakage (e.g. 'nushell 0.xx compatibility') and count them per shell — measures which target shell breaks emitters most (frame H9).
Write a final "## Prior-art patterns" section: the strategies that converge across emitters (strong signal) vs the ones that differ.`,
  },
  {
    key: 'platform-matrix',
    prompt: `${PREAMBLE('measuring default shells and userland across OS images and reading platform docs; fact gathering, no rule decisions')}
${GROUND_CONTRACT('default shells, shell versions and userland across operating systems and CI images', RESEARCH + '/shell-audit/platform-matrix.md')}
Measurement axes:
1. MEASURE in containers (docker pull small official images; skip any that fail and say so): debian:11, debian:12, debian:13, ubuntu:20.04, ubuntu:22.04, ubuntu:24.04, ubuntu:25.10 (or the newest available, check for Rust uutils coreutils and sudo-rs), alpine:3.22, almalinux:8, almalinux:9, almalinux:10 (if available), amazonlinux:2, amazonlinux:2023, fedora:latest, opensuse/leap:latest, archlinux:latest, busybox:1.37, gcr.io/distroless? (skip), nixos/nix (optional). For each: what /bin/sh is (readlink -f, and 'ls -l /bin/sh'), bash version if installed by default, other shells present (dash, zsh, ksh), coreutils flavour and version ('ls --version' / 'busybox' / uutils), presence of: readlink -f, realpath, mktemp -d, sha256sum, shasum, curl, wget, which, command -v, getopt (GNU enhanced?), timeout, flock, xargs -r and -0, sed -i (GNU vs busybox), find -print0, date -d, stat -c, install, tar flags, gzip/xz/zstd, unzip, file, iconv, locale (C.UTF-8 available?), and /usr/bin/env path. Write one probe script under ${FIX}/platform-matrix/ and run it in every image; paste a compact table.
2. CI runner images (read ${EX}/actions__runner-images/images/**/*.md readmes and toolset JSONs): for ubuntu-22.04, ubuntu-24.04, macos-14/15/26 (whatever exists), windows-2022/2025: installed bash, zsh, fish, pwsh, Windows PowerShell, Git Bash/MSYS2, dash, coreutils versions, and the GitHub Actions default shell per OS (fetch docs.github.com workflow syntax 'defaults.run.shell' and the 'shell' keyword table: exact command lines such as 'bash --noprofile --norc -eo pipefail {0}' for shell: bash vs 'bash -e {0}' when unspecified; pwsh vs powershell; cmd). Cite.
3. macOS (READ-ONLY, say so): /bin/bash version (3.2.57), /bin/zsh version in macOS 14/15/26, /bin/sh implementation and the /private/var/select/sh switch, /bin/dash presence, BSD vs GNU userland differences that bite scripts (sed -i '', date -v/-j, stat -f, readlink -f availability (added in macOS 12.3?), mktemp -t semantics, grep -P absence, xargs, base64 -d/-D, sha256sum availability (added in macOS 14?), realpath (added in 13?)). Verify each version claim against primary sources (opensource.apple.com, Apple man pages online, release notes) and mark which are unverified.
4. Windows (partly MEASURED on the host via matrix.sh win/pwsh): Windows PowerShell 5.1 build, whether pwsh is preinstalled (no), Git Bash version and its userland (GNU via MSYS2), WSL, cmd; default encodings (5.1 [Console]::OutputEncoding, $OutputEncoding, Out-File default encoding UTF-16LE in 5.1 vs UTF-8 no BOM in 7), execution policy defaults (Restricted on client, RemoteSigned on server), and path/line-ending behaviours. Run a probe .ps1 on 5.1 and 7.x and paste the table.
5. FreeBSD/OpenBSD/NetBSD and Android (READ-ONLY): /bin/sh implementations (FreeBSD ash-derived sh, OpenBSD ksh (pdksh), NetBSD sh, Android mksh / toybox), bash not in base. Cite man pages.
6. Cross-shell behaviour divergences from the oils spec suite: in ${EX}/oils-for-unix__oils/spec/*.test.sh, cases carry annotations like '## OK dash', '## N-I mksh', '## BUG zsh', '## status: ...'. Count annotations by shell x kind (OK / N-I / BUG) and by spec file, and list the 30 spec areas with the most divergence. This is a measured portability map. Explain the annotation semantics from oils docs (fetch).
Final section "## The portability floor table": for each target (Linux distros, Alpine, macOS, Windows+Git Bash, BSDs, CI runners) the guaranteed shell and version and the safe userland subset.`,
  },
]

// ---------------------------------------------------------------- Scout
const SCOUTS = [
  {
    key: 'canonical',
    corpus: `CANONICAL SPECS AND MANUALS. Survey their tables of contents and normative sections; every chapter, builtin, option and documented incompatibility is a candidate topic.
- POSIX.1-2024 (IEEE Std 1003.1-2024 / SUSv5) XCU: Shell Command Language chapter (pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) and the utilities pages most scripts use (sh, test, printf, read, set, trap, command, getopts, find, xargs, sed, mktemp?, realpath, readlink); note what 2024 added versus 2008 (pipefail, \$'...' dollar-single-quotes, read -d, find -print0, xargs -0, realpath, readlink, mktemp? — verify each).
- GNU Autoconf manual chapter 'Portable Shell Programming' (gnu.org/software/autoconf/manual/autoconf.html, Portable Shell section) — the classic catalogue of shell and utility incompatibilities.
- Bash Reference Manual (gnu.org/software/bash/manual), the bash COMPAT file and NEWS/CHANGES (version-by-version feature list 3.2 to 5.3), bash POSIX mode list ('Bash POSIX Mode' section).
- zsh manual (zsh.sourceforge.io/Doc), especially options, emulation, expansion differences from sh/bash, startup files.
- dash man page, busybox ash docs, mksh manual, ksh93u+m docs, yash manual (POSIX conformance notes).
- fish documentation (fishshell.com/docs/current: language, 'fish for bash users', release notes 4.x), nushell book (nushell.sh/book: coming from bash, nu as a shell, scripts, modules, hooks, configuration) and cookbook, elvish reference (elv.sh/ref/language.html, learn/unique-semantics).
- PowerShell docs (learn.microsoft.com/powershell): about_* topics most relevant to scripting (about_Quoting_Rules, about_Parsing, about_Preference_Variables, about_Error_Handling? about_Try_Catch_Finally, about_Character_Encoding, about_Profiles, about_Execution_Policies, about_Requires), 'Differences between Windows PowerShell 5.1 and PowerShell 7.x', 'What's New in PowerShell 7.4/7.5/7.6', the PowerShell support lifecycle page.
Extract TOCs and the documented incompatibilities between shells; each is a candidate.`,
  },
  {
    key: 'practitioner',
    corpus: `PRACTITIONER WRITING — the influential guides, wikis and blogs. Extract the argued positions, not the author list.
- Greg's Wiki (mywiki.wooledge.org): BashGuide, BashFAQ (all entries — list the ones about portability, set -e (BashFAQ/105), reading lines (001), arrays, getopts (035), temp files (062), locking (045), process management), BashPitfalls (read in full), ProcessManagement, Quotes, WordSplitting, ParsingLs, BashFAQ/031 [[ vs [.
- Rich's sh (POSIX shell) tricks (etalabs.net/sh_tricks.html); Sven Mascheck's Bourne-family pages (in-ulm.de/~mascheck/bourne/ and various/) on shell history and portability.
- pure-bash-bible and pure-sh-bible (dylanaraps), the Bash Hackers wiki (archived mirror, e.g. bash-hackers.gabe565.com or wiki.bash-hackers.org via archive.org).
- 'Unofficial bash strict mode' (Aaron Maxwell, redsymbol.net) and its critiques (BashFAQ/105, 'set -e is not your friend' style posts, Wooledge's errexit page), 'Minimal safe Bash script template' (betterdev.blog), Julia Evans's bash posts, Chris Down's shell posts, Dan Luu on shell, 'Shell scripts are a portability trap' style essays; 'Writing Safe Shell Scripts' (MIT SIPB).
- Zsh: the zsh FAQ/guide (zsh.sourceforge.io/Guide), romkatv's zsh notes (powerlevel10k docs on startup files and instant prompt).
- fish: 'fish for bash users', fish design document; nushell blog release posts (nushell.sh/blog) and 'nushell for bash users'.
- PowerShell: PowerShell Team blog (devblogs.microsoft.com/powershell), the PowerShell Practice and Style guide (poshcode.gitbook.io/powershell-practice-and-style), Kevin Marquette's powershellexplained.com posts on errors, splatting, hashtables, and the 'everything about $null' article; posts on native command error handling in 7.3+/7.4 ($PSNativeCommandUseErrorActionPreference) and argument passing ($PSNativeCommandArgumentPassing).
- Unix & Linux Stack Exchange canonical answers (Stéphane Chazelas): 'Why is printf better than echo?', 'Why does my shell script choke on whitespace or other special characters?', 'Security implications of forgetting to quote a variable', 'Why is using a shell loop to process text considered bad practice?'.
The owner notes bash has a very large online pitfall literature — mine it thoroughly and record each distinct pitfall class as a candidate.`,
  },
  {
    key: 'codified',
    corpus: `CODIFIED PRACTICE AND TOOLING — style guides, lint catalogs, formatters, test frameworks, security guidance: topics somebody already thought worth enforcing.
- Google Shell Style Guide (google.github.io/styleguide/shellguide.html) — every rule.
- ShellCheck: the full SC code catalogue. A local clone of the wiki is at ${EX}/koalaman__shellcheck.wiki (one .md per SC code) — enumerate every code, group by family (SC1xxx parse, SC2xxx semantic, SC3xxx POSIX-portability), and identify the codes with the highest real-world signal; also shellcheck's optional checks (--list-optional, enable=all: require-variable-braces, check-unassigned-uppercase, add-default-case, avoid-nullary-conditions, quote-safe-variables, require-double-brackets, deprecate-which, check-set-e-suppressed, check-extra-masked-returns), directives (source-path, shell=, external-sources), .shellcheckrc semantics. Run 'run.sh shellcheck --list-optional' to get the exact list.
- shfmt (mvdan/sh): options (-i, -ci, -bn, -sr, -ln posix|bash|mksh|bats|zsh?, -s simplify), editorconfig keys, and whether zsh is parsed now (check the README and CHANGELOG).
- checkbashisms (Debian devscripts) and Debian Policy 10.4 (what /bin/sh scripts may assume: echo -n, local, test -a/-o ...); Ubuntu DashAsBinSh wiki; Alpine/busybox guidance.
- Testing: bats-core docs, shellspec docs (POSIX shells matrix), shunit2, kcov coverage; Pester 5 docs; fish's own test tools; nushell 'std assert' and testing docs.
- PowerShell: PSScriptAnalyzer rule catalogue (every rule name, incl. PSUseCompatibleSyntax/PSUseCompatibleCommands/PSUseCompatibleCmdlets compatibility rules and their target-profile settings, PSAvoidUsingInvokeExpression, PSUseBOMForUnicodeEncodedFile, PSAvoidUsingWriteHost), its settings presets (CodeFormatting, CmdletDesign, PSGallery), Invoke-Formatter; the PowerShell Gallery publishing requirements.
- Security: CWE-78 OS command injection, OWASP command-injection cheat sheet, GitHub Actions security hardening (script injection via \${{ }} into run:, using env: indirection), Shellshock (CVE-2014-6271) and what it changed, PowerShell security guidance (Invoke-Expression, execution policy is not a security boundary, constrained language mode, AMSI), 'curl | sh' integrity debates and mitigations (checksums, signatures, function-wrapping against truncation).
- oils/YSH (oils.pub): its list of shell design flaws it fixes (a codified critique of POSIX/bash).
Record every enforceable rule family as a candidate.`,
  },
  {
    key: 'failure',
    corpus: `FAILURE CORPUS — antipattern catalogs, postmortems, recurring bug reports, the complaints that keep resurfacing, and what AI agents get wrong.
- Wooledge BashPitfalls (all entries, numbered — classify them into failure classes), BashFAQ entries that exist because of a recurring bug.
- ShellCheck's most-triggered warnings (the wiki pages and any published stats), plus the GitHub issue trackers of shellcheck, shfmt and bats for recurring false negatives — things shellcheck CANNOT catch (a key input: rules whose verification cannot be shellcheck).
- Postmortems and famous incidents: Steam's 'rm -rf "$STEAMROOT/"*' (valvesoftware/steam-for-linux#3671), Bumblebee 'rm -rf /usr /lib/nvidia-current/xorg/xorg' (MrMEEE/bumblebee-Old-and-abbandoned#123), Shellshock, truncated 'curl | sh' downloads, GitHub Actions script injection advisories (GitHub Security Lab 'untrusted input' posts), Homebrew and nvm issues about bash 3.2 and zsh, CRLF breaking shebangs ('/bin/bash^M: bad interpreter'), BOM breaking shebangs, locale-dependent sort/regex bugs ([a-z] ranges, LC_COLLATE), 'set -e' surprises, PATH hijacking, IFS bugs, word splitting of filenames with spaces in CI, PowerShell 5.1 vs 7 breakages (encoding, Invoke-WebRequest IE engine, native argument quoting changes in 7.3, $ErrorActionPreference not applying to native commands), fish 4.0 breaking changes (removed features), nushell breaking changes per release (blog 'breaking changes' sections 0.100 to 0.116), zsh word-splitting surprises when sourcing bash code, dash 'local' and 'echo' differences, busybox applet gaps.
- Recurring Stack Overflow / Unix SE questions with very high vote counts for the above (cite the canonical ones).
- AI-agent failures: search for writeups/issues about LLM-generated shell scripts (bashisms under /bin/sh, hallucinated flags, set -euo pipefail misuse, unquoted variables, GNU-only flags on macOS, PowerShell 7-only syntax in scripts for Windows PowerShell, outdated nushell syntax such as removed commands — check the nushell changelogs for renamed/removed commands since 0.80 and list them as concrete agent traps).
For each failure class: mechanism, an example, the shells/versions/OSes it bites, and whether a mechanical check (shellcheck code, PSScriptAnalyzer rule, grep, matrix run) catches it. Rank by frequency x damage.`,
  },
  {
    key: 'shifts',
    corpus: `RECENT SHIFTS (2024-2026) — what changed and which older advice it invalidates. Verify every version/date against primary sources (NEWS files, release pages, official blogs).
- bash 5.2 (2022) and 5.3 (2025): NEWS/CHANGES items that matter to scripts (funsubs '\${ cmd; }' and '\${| cmd; }', GLOBSORT, array_expand_once, patsub_replacement default, 'source -p', compat levels, read -E, new shopt options); bash 5.3 adoption in distros by late 2026.
- POSIX.1-2024 (published 2024): which formerly-nonportable features are now standard (set -o pipefail, \$'...', read -d, find -print0 / xargs -0, realpath, readlink, mktemp?, sh -c with --, the 'local' question) and how fast implementations shipped them (dash 0.5.13? busybox, FreeBSD sh, macOS sh).
- dash 0.5.12/0.5.13 changes; busybox 1.36/1.37; mksh R59c/R60? ; ksh93u+m 1.0.x (the revived ksh93); yash 2.5x; zsh 5.9 and any 5.10/6.0 release; oils/OSH and YSH 0.2x+.
- fish 4.0 (2025, Rust port) through 4.9: breaking changes and removals vs 3.x, new features (abbreviations, key binding syntax changes, $fish_ ... vars), which distros still ship 3.x.
- nushell 0.100 through 0.116: breaking changes per release (commands renamed/removed/deprecated such as 'str upcase' deprecated in 0.114; config file changes like env.nu/config.nu split and autoload dirs; hooks; 'def --env'; 'path add'; '\$env.PATH' list handling), the 1.0 roadmap status.
- elvish 0.19 to 0.21+ changes (and whether 0.22 exists).
- PowerShell 7.4 LTS, 7.5, 7.6 (LTS?) release notes: experimental features graduated ($PSNativeCommandUseErrorActionPreference, PSNativeCommandArgumentPassing default changes, ternary was 7.0), support lifecycle dates (7.4 EOL Nov 2026?), .NET version baselines; Windows PowerShell 5.1 status (still shipped; PowerShell 2.0 engine removed from Windows in 2025), winget/sudo for Windows, Windows Terminal defaults.
- macOS 15 / macOS 26: shell and userland changes (bash still 3.2.57? zsh 5.9; new utilities added to base like sha256sum?), Xcode CLT effects.
- Linux: Ubuntu 25.10/26.04 Rust uutils coreutils and sudo-rs by default (what flags differ, what broke), Debian 13 trixie changes (dash version, /usr-merge completed, fish 4), Fedora/RHEL 10 shells, Alpine busybox versions.
- Tooling: shellcheck 0.10 to 0.11 new checks; shfmt 3.8 to 3.13 (zsh support? new -ln options); bats-core 1.11+; PSScriptAnalyzer 1.2x/2.0; Pester 5.x/6; GitHub Actions runner image changes (default shells, bash versions on macOS runners, ubuntu-24.04 default).
Each shift: what changed, version and date, which old advice is now wrong, and the risk an agent trained on older text carries.`,
  },
]

phase('Ground')
const groundJobs = GROUNDERS.map((g) => () =>
  agent(g.prompt, { label: 'ground:' + g.key, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' }),
)
phase('Scout')
const scoutJobs = SCOUTS.map((s) => () =>
  agent(`${PREAMBLE('corpus survey and enumeration; cheap-tier volume reading, no rule decisions')}
${SCOUT_CONTRACT(s.corpus, RESEARCH + '/shell-topic-map/' + s.key + '.md')}`, { label: 'scout:' + s.key, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' }),
)
const results = await parallel([...groundJobs, ...scoutJobs])
const ground = results.slice(0, GROUNDERS.length)
const scouts = results.slice(GROUNDERS.length)
log('ground ok: ' + ground.filter(Boolean).length + '/' + GROUNDERS.length + ', scouts ok: ' + scouts.filter(Boolean).length + '/' + SCOUTS.length)
return {
  ground: ground.map((r, i) => ({ key: GROUNDERS[i].key, r })),
  scouts: scouts.map((r, i) => ({ key: SCOUTS[i].key, path: r && r.path, sources: r && r.sources_count, primary: r && r.primary_sources_count, n: r ? r.candidates.length : 0, shifts: r && r.recent_shifts })),
}
