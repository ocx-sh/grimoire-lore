export const meta = {
  name: 'shell-author',
  description: 'Shell research program phase 7: sonnet drafters write 20 depth files (pipelined into the two rule indexes), four skills alongside, then the plumbing unit (publish.toml, docs, bundle, taskfile, logo)',
  phases: [
    { title: 'Depth', detail: 'one sonnet drafter per depth file (U2-U15, U17-U22) plus its checks/ scripts' },
    { title: 'Index', detail: 'one sonnet drafter per rule index (U1, U16), after its depth files exist' },
    { title: 'Skills', detail: 'U23-U26' },
    { title: 'Plumbing', detail: 'U27 after everything else' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-10-11'
const TOOLS = '/home/mherwig/.cache/research-lang/shell-tools'
const FIX = TOOLS + '/fixtures'
const MAP = RESEARCH + '/shell-topic-map.md'
const CHECKER = 'python3 -I ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py'
const CHECK_TAIL = "--root /home/mherwig/dev/www-setup --allow-absent '**/*.zsh' --allow-absent '**/*.ksh' --allow-absent '**/.shellcheckrc' --allow-absent '**/action.yml' --allow-absent '**/action.yaml' --allow-absent '**/.github/workflows/*.yaml' --allow-absent '**/Taskfile.yml' --allow-absent '**/.gitlab-ci.yml' --allow-absent '**/.gitlab-ci/*.yml' --allow-absent '**/.shell-quality-depth-on-demand' --allow-absent '**/.powershell-quality-depth-on-demand' --forbid /home/ --forbid .cache/research-lang --forbid matrix.sh"

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- You are a drafter in phase 7 (Author) of the research-lang program for SHELL SCRIPTING ACROSS OPERATING SYSTEMS AND SHELLS (POSIX sh implementations, bash 3.2-5.3, zsh, ksh, fish, nushell, elvish, Windows PowerShell 5.1 and PowerShell 7.x, userland, CI shells, multi-shell emitters, installers), run from ${ROOT} (a git worktree; treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The artifacts you write are published through the lore catalog and loaded by coding agents without a human in the loop. Merging to main publishes; you write files, you never commit.
- BINDING INPUTS, read in this order before writing a line: (1) ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md in full; (2) ${MAP} from the heading "## Authoring notes (binding on the drafters)" to the end of the file, IN FULL (sections 1-13). These are decisions already taken: you apply them, you do not re-take them. Where a note and a consolidation disagree, the note wins. Section 3 names YOUR unit's exact source line ranges, held-out amendments (shell-heldout.md sections A-F and RW) and edits; section 4 gives final IDs for provisional rows; section 5 lists changes to fold; section 6 the drop list; section 7 the verification dialect; section 8 portability; section 9 your line cap; section 10 dating; section 11 pinned decisions; section 12 skill scope. Also skim "## Wave 4 landed" for the X59-X83 resolutions your unit touches. (3) House exemplars for shape, register and density (not content): ${ROOT}/rules/swift-quality.md (an index), ${ROOT}/rules/swift-quality/concurrency.md (a depth file with a never-matching paths glob), ${ROOT}/rules/go-quality.md, ${ROOT}/skills/swift-diagnose/SKILL.md (a skill). (4) Your unit's sources, in full.
- The checker every file must pass: ${CHECKER} <your paths> ${CHECK_TAIL}. Run it on your own output before returning and fix every finding for YOUR files (findings in files other drafters have not written yet can be ignored). A table row whose first cell is a rule ID is a rule definition: define each ID in exactly one file. Section 7's dialect binds every command you ship: git-fed file lists, the portable grep option set, one -e per alternative, -- before operands, xargs -0 -r, quoted pathspecs, no $(...) or backticks or angle-bracket placeholders in a cell, the PREFLIGHT line opening each block, pass = empty stdout and stderr, commands in fenced sh blocks never in table cells (tables name the cell ID), lookaround/multi-line/byte checks as POSIX awk scripts under checks/.
- REAL INTERPRETERS for verification: '${TOOLS}/matrix.sh <family> <script>' (families posix, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6.0-4.9.3, nu 0.105.1/0.116.0, elvish 0.21.0, pwsh 7.4/7.6.6 plus Windows PowerShell 5.1 on the Windows host, win = Git Bash plus WinPS 5.1; scripts must live under /home/mherwig/.cache/research-lang) and '${TOOLS}/run.sh <cmd>' (shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh 7.6.6 on PATH). Docker images: bash:<ver>, zshusers/zsh:<ver>, shellzoo:deb12, shellzoo:deb13, alpine:3.22 (busybox; apk add git inside a throwaway container for git-fed cells), busybox:1.37, ubuntu:24.04, mcr.microsoft.com/powershell:lts-7.4-ubuntu-22.04.
- VERIFICATION HONESTY: a verification the consolidation or shell-heldout.md records as watched red may be copied with its Watched line. A NEW or REWORDED command, or a translated cell (section 7), that you have not run keeps the Watched line "translated ${DATE}, re-watch pending"; if you can, run it on a planted violation and a compliant twin under ${FIX}/author-<your-file-stem>/ (never /tmp) and write "watched red (measured ${DATE})". Every shipped checks/ script MUST be run by you red and green and pass ShellCheck 0.11.0 at default severity, shfmt -d (4 spaces, -ci), and the SH-DIAL-04 interpreter set (dash, busybox ash, bash 3.2 --posix) where it is #!/bin/sh. Research-host specifics never appear in shipped text: no matrix.sh, no run.sh, no /home or .cache paths, no fixture names, no run IDs, no repo@sha citations unless load-bearing (then name the public project), no .agents/research links in rules or skills.
- Formatting: this repo runs ruff format --check over markdown, so a fenced python block must be ruff-stable; shell fenced sh (or bash where bash-only), PowerShell fenced powershell, YAML fenced yaml, nu fenced nu, fish fenced fish. No em dashes and no semicolons in prose. Files over 100 lines carry a Contents line in the first 40 lines. Depth files never link to other depth files; cross-family IDs appear only as attribution "(also SH-XXX-NN)".
- Use read-only tools everywhere except your own OUTPUT FILE(S), the checks/ scripts section 3 assigns to your unit, and your fixture directory. Do not edit a consolidation. Do not edit another drafter's file.
`

const DEPTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'rule_ids_shipped', 'rule_ids_dropped', 'checks_written', 'checker_clean', 'hoist_to_index', 'routing_row', 'commands_watched', 'commands_pending'],
  properties: {
    path: { type: 'string' }, lines: { type: 'number' },
    rule_ids_shipped: { type: 'array', items: { type: 'string' } },
    rule_ids_dropped: { type: 'array', items: { type: 'string' }, description: 'ID: reason' },
    checks_written: { type: 'array', items: { type: 'string' }, description: 'checks/ script paths this unit wrote, each with "red+green" or "pending"' },
    checker_clean: { type: 'boolean' },
    hoist_to_index: { type: 'array', items: { type: 'string' }, description: 'the 1-3 MUST rows the index must carry as non-negotiables, as "ID: one-line rule"' },
    routing_row: { type: 'string', description: 'the task-worded phrase for the index routing table' },
    commands_watched: { type: 'number' }, commands_pending: { type: 'number' },
  },
}
const INDEX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'non_negotiables', 'core_rule_ids', 'checker_clean', 'globs'],
  properties: { path: { type: 'string' }, lines: { type: 'number' }, non_negotiables: { type: 'number' }, core_rule_ids: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, globs: { type: 'array', items: { type: 'string' } } },
}
const STANDALONE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['paths', 'checker_clean', 'notes'],
  properties: { paths: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, notes: { type: 'array', items: { type: 'string' } } },
}

const D = (unit, file, family, task_hint) => ({ unit, file, family, task_hint })
const PLAN = [
  {
    rule: 'shell-quality', unit: 'U1', core: 'SH-CORE', depth_glob: '**/.shell-quality-depth-on-demand',
    depth: [
      D('U2', 'dialect.md', 'SH-DIAL', 'choosing #!/bin/sh vs bash, declaring a bash floor, enabling pipefail in sh, using POSIX.1-2024 features, local in sh, shebang arguments'),
      D('U3', 'userland.md', 'SH-USER', 'calling sed, grep, find, xargs, mktemp, readlink, date, stat, timeout, sha256sum, curl or wget portably across GNU, BSD/macOS, busybox and uutils'),
      D('U4', 'errors.md', 'SH-ERR', 'set -e/-u/pipefail by script kind, traps and cleanup, exit codes and signals, empty arrays under set -u, glob loops, error propagation through subshells and pipes'),
      D('U5', 'expansion.md', 'SH-EXP', 'quoting, word splitting, globbing, IFS, echo vs printf, here-docs, arithmetic, read loops, parameter expansion'),
      D('U6', 'security.md', 'SH-SEC', 'eval and indirection, sourcing files, secrets in argv or env, temp files, PATH and command injection, curl-to-shell, credentials for git and cargo'),
      D('U7', 'gates.md', 'SH-GATE', 'setting up or changing ShellCheck, shfmt, .shellcheckrc, .editorconfig, parse gates per shell, the gate script, line endings and file modes, or writing verification cells'),
      D('U8', 'testing.md', 'SH-TEST', 'writing or running bats tests, test isolation, skip budgets, census of tests, version matrices for shell tests'),
      D('U9', 'ci.md', 'SH-CI', 'editing GitHub Actions run: steps, composite actions, Taskfile cmds, or GitLab CI scripts: default shells, expression injection, pipefail scope, Windows runners'),
      D('U10', 'zsh.md', 'SH-ZSH', 'writing or sourcing zsh code: emulation, word splitting, arrays, options, startup files, zsh version floors'),
      D('U11', 'fish.md', 'SH-FISH', 'writing fish functions, completions, conf.d snippets or fish code generated for users across fish 3.6 to 4.9'),
      D('U12', 'nushell.md', 'SH-NU', 'writing nushell scripts, modules, env/config/autoload snippets, or generated nu code across nu releases'),
      D('U13', 'elvish.md', 'SH-ELV', 'writing elvish modules or rc.elv snippets, or generated elvish code'),
      D('U14', 'emit.md', 'SH-EMIT', 'generating shell code for several target shells: per-shell quoting, rc and profile locations, prompt and directory hooks, activation and undo, completion registration, PATH edits, Batch'),
      D('U15', 'installers.md', 'SH-INST', 'writing or reviewing an install.sh: truncation guard, platform detection, download and verify, privilege, PATH edits, exit codes'),
    ],
  },
  {
    rule: 'powershell-quality', unit: 'U16', core: 'PS-CORE', depth_glob: '**/.powershell-quality-depth-on-demand',
    depth: [
      D('U17', 'compat.md', 'PS-COMPAT', 'writing PowerShell that must run on both Windows PowerShell 5.1 and PowerShell 7.x: syntax, cmdlets and parameters by edition, platform detection'),
      D('U18', 'errors.md', 'PS-ERR', 'error handling: ErrorActionPreference, terminating vs non-terminating errors, try/catch/finally, StrictMode, CI run steps'),
      D('U19', 'native.md', 'PS-NATIVE', 'calling native executables from PowerShell: argument passing, exit codes, stderr'),
      D('U20', 'encoding.md', 'PS-ENC', 'file and console encoding, BOMs, writing runner files such as GITHUB_ENV, non-ASCII in scripts'),
      D('U21', 'gates.md', 'PS-GATE (+ SH-TEST-18..22)', 'setting up PSScriptAnalyzer, the 5.1 parse gate, the gate wrapper, command-resolution checks, or Pester tests'),
      D('U22', 'security.md', 'PS-SEC', 'writing or reviewing an install.ps1 or anything run via irm | iex: hashes and signatures, TLS, exit vs throw, Invoke-Expression, URL overrides'),
    ],
  },
]
const SKILLS = [
  { unit: 'U23', name: 'shell-integration' },
  { unit: 'U24', name: 'installer-script' },
  { unit: 'U25', name: 'shell-port' },
  { unit: 'U26', name: 'shell-diagnose' },
]

function depth(rule, d) {
  const out = ROOT + '/rules/' + rule.rule + '/' + d.file
  return agent(`Model rationale: sonnet at high effort — drafting rule text from consolidations whose decisions are already taken; the routing policy puts implementation and docs on sonnet.

${CONTEXT}

YOUR UNIT: ${d.unit} in section 3 of the authoring notes.
YOUR FILE: ${out}  (depth file of the ${rule.rule} rule; ID family ${d.family}; the index routes here for: ${d.task_hint}; line cap from section 9)
Also write the checks/ scripts section 3 assigns to ${d.unit} under ${ROOT}/rules/${rule.rule}/checks/ (new names prefixed with your file stem unless section 3 fixes the name).

Write the depth file: frontmatter exactly in the form of ${ROOT}/rules/swift-quality/concurrency.md's frontmatter (the house comment line, then paths with the single never-matching glob "${rule.depth_glob}"), then title and a summary naming the family and what it owns, one line naming the shell and tool versions the rows bind to (section 10), a one-paragraph scope stating what the family owns and which sibling families own the neighbours (by family ID, never by file link), a Contents line, then sections grouped by the check that catches them: each section states its check once (a fenced sh block opening with the PREFLIGHT line, or a checks/ script name) and a rule table (| ID | Rule | Rationale | Verification | Severity |) whose rows keep their consolidation IDs verbatim, each row followed by or carrying its Scope (kinds, shells, versions, dates, provisional: true where section 4 says so), plus at most one minimal wrong/right snippet pair per section where the mistake is easier shown than told; then "## What Agents Get Wrong Here", ranked. Apply sections 4-6 for your unit. Run the checker, fix, return the receipt.`,
    { label: 'depth:' + rule.rule + '/' + d.file, phase: 'Depth', model: 'sonnet', effort: 'high', schema: DEPTH_SCHEMA })
}

function index(rule, receipts) {
  const out = ROOT + '/rules/' + rule.rule + '.md'
  const ok = receipts.filter(Boolean)
  return agent(`Model rationale: sonnet at xhigh effort — the index is the always-loaded surface; every line is paid for in every session, and it must agree with every depth file.

${CONTEXT}

YOUR UNIT: ${rule.unit} (sections 1, 2 and 3 of the authoring notes).
YOUR FILE: ${out}  (the index of the ${rule.rule} rule; globs exactly as section 1 lists them, one per line, double-quoted, in that order)
DEPTH FILES already written by sibling drafters (read each in full): ${ok.map(r => r.path).join(', ')}
Their receipts (hoist candidates, routing phrases, checks scripts): ${JSON.stringify(ok.map(r => ({ path: r.path, hoist: r.hoist_to_index, routing: r.routing_row, checks: r.checks_written })))}
${rule.unit === 'U1' ? 'Also write rules/shell-quality/checks/ items section 3 assigns to U1, if any, and verify the gate block calls checks/shell-gate.sh exactly as U7 wrote it (read it).' : 'PS-CORE-01..03 are assigned by you exactly as section 2 says; verify the gate wrapper name against what U21 wrote under rules/powershell-quality/checks/.'}

Write the index in the shape of ${ROOT}/rules/swift-quality.md and ${ROOT}/rules/go-quality.md: frontmatter (paths = the globs, summary, keywords, license Apache-2.0, repository https://github.com/ocx-sh/grimoire-lore — copy the exact field set those indexes use), a two-line stance, Contents, the gate block, the content section 2 orders for this index, the routing table ("Where the Depth Is", one task-worded row per depth file, a task may name two files), Severity, Siblings (code-docs; the other rule of this set). Under 200 lines. Every ID cited must be defined somewhere in the set (grep the depth files and the other index). Run the checker on the rule file plus its support directory, fix, return the receipt.`,
    { label: 'index:' + rule.rule, phase: 'Index', model: 'sonnet', effort: 'xhigh', schema: INDEX_SCHEMA })
}

function skill(s) {
  const out = ROOT + '/skills/' + s.name + '/SKILL.md'
  return agent(`Model rationale: sonnet at high effort — a procedure agents run unattended; its steps and refusal conditions follow decisions already taken.

${CONTEXT}

YOUR UNIT: ${s.unit} (section 3 "Skills and plumbing" and section 12 of the authoring notes).
YOUR OUTPUT: ${out} plus ${ROOT}/skills/${s.name}/references/ as section 3 says.
The rule depth files may still be in progress; cite rule IDs from the consolidations and the authoring notes (IDs are stable), never restate rule text, and do not depend on another drafter's wording. House shape: ${ROOT}/skills/swift-diagnose/SKILL.md and ${ROOT}/skills/go-release/SKILL.md (frontmatter fields, step layout, the | # | Finding | Rule | table with the ID last, references/). Description under 1024 characters, third person, a "Use when" clause with the exact phrases a user or agent would type. Body at most 500 lines as the checker counts it (target 460). Any script in references/ is run by you red and green. Run the checker on the skill directory, fix, return the receipt.`,
    { label: 'skill:' + s.name, phase: 'Skills', model: 'sonnet', effort: 'high', schema: STANDALONE_SCHEMA })
}

function plumbing() {
  return agent(`Model rationale: sonnet at medium effort — mechanical catalog plumbing with a decided shape.

${CONTEXT}

YOUR UNIT: U27 (section 3 "Skills and plumbing" and section 1 of the authoring notes). Every rule, depth file, skill and checks/ script now exists under ${ROOT}/rules/shell-quality*, ${ROOT}/rules/powershell-quality*, ${ROOT}/skills/{shell-integration,installer-script,shell-port,shell-diagnose}. Read them (frontmatter and headings at least).
Write, following the Swift set's precedent exactly (read ${ROOT}/publish.toml swift entries, ${ROOT}/bundles/swift-essentials.toml, ${ROOT}/docs/swift-*.md, ${ROOT}/assets/lore-swift.svg, and the taskfile.yml swift block):
1. publish.toml entries for shell-quality, powershell-quality, shell-integration, installer-script, shell-port, shell-diagnose and the shell-essentials bundle, all 0.1.0, inserted where the house order puts them.
2. bundles/shell-essentials.toml with untagged members exactly as section 1 lists (bundles never pin).
3. docs/<artifact>.md for each of the six artifacts and the bundle, in the docs/swift-*.md shape.
4. assets/lore-shell.svg in the house logo style.
5. The taskfile.yml block that runs the checker over the shell set with liveness root /home/mherwig/dev/www-setup via a variable defaulting the way the other sets do (adopters without that path must not break CI: copy how the swift block handles an absent consumer) and the --allow-absent list of section 1.
6. README.md catalog table rows if the README lists sets.
Then run: the checker over rules/shell-quality.md rules/shell-quality rules/powershell-quality.md rules/powershell-quality and the four skill dirs with the tail; 'task ci' if it runs offline in reasonable time (report what failed); 'ruff format --check .'. Fix what is yours; report the rest.`,
    { label: 'plumbing:U27', phase: 'Plumbing', model: 'sonnet', effort: 'medium', schema: STANDALONE_SCHEMA })
}

// ---------------------------------------------------------------- Run
log('Authoring: 2 rules, ' + PLAN.reduce((n, r) => n + r.depth.length, 0) + ' depth files, ' + SKILLS.length + ' skills, plumbing last')
const rulesP = pipeline(
  PLAN,
  rule => parallel(rule.depth.map(d => () => depth(rule, d))),
  (receipts, rule) => {
    const ok = receipts.filter(Boolean)
    if (ok.length < rule.depth.length) log(rule.rule + ': ' + (rule.depth.length - ok.length) + ' depth drafter(s) dropped; index proceeds with ' + ok.length)
    if (!ok.length) return { rule: rule.rule, depth: receipts, index: null }
    return index(rule, ok).then(ix => ({ rule: rule.rule, depth: receipts, index: ix }))
  },
)
const skillsP = parallel(SKILLS.map(s => () => skill(s)))
const [rules, skills] = await Promise.all([rulesP, skillsP])
phase('Plumbing')
const plumb = await plumbing()

const dropped = rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).flatMap(d => d.rule_ids_dropped || []))
const pending = rules.filter(Boolean).reduce((n, r) => n + (r.depth || []).filter(Boolean).reduce((m, d) => m + (d.commands_pending || 0), 0), 0)
const unclean = [
  ...rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).filter(d => !d.checker_clean).map(d => d.path)),
  ...rules.filter(Boolean).filter(r => r.index && !r.index.checker_clean).map(r => r.index.path),
  ...skills.filter(Boolean).filter(s => !s.checker_clean).flatMap(s => s.paths),
]
log('Done: ' + rules.filter(r => r && r.index).length + '/2 indexes · ' + skills.filter(Boolean).length + '/4 skills · ' + dropped.length + ' IDs dropped · ' + pending + ' cells re-watch pending · ' + unclean.length + ' files unclean')
return { rules, skills, plumbing: plumb, dropped_ids: dropped, pending, unclean }
