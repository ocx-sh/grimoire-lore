export const meta = {
  name: 'shell-wave1-map',
  description: 'Shell research program phase 3: one opus agent reads the 7 audits + 5 scouts + frame and writes the prioritised topic map, decides the artifact set, and commissions wave 2 with wave 3 staged',
  phases: [{ title: 'Map', detail: 'deduplicate the candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell'
const RESEARCH = ROOT + '/.agents/research'
const TOOLS = '/home/mherwig/.cache/research-lang/shell-tools'
const FIX = TOOLS + '/fixtures'
const DATE = '2026-10-10'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the shell- prefix, e.g. errexit; the consolidation becomes shell-<group>.md and dives go under shell-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the ID family this group owns, e.g. SH-ERR, SH-PORT, PS-COMPAT, SH-EMIT' },
    slug: { type: 'string', description: 'dive worker slug; file becomes shell-<group>/<slug>.md' },
    label: { type: 'string' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which builtins/options/versions/SC codes/PSSA rules to pin down, what fleet or exemplar evidence (file:line or repo@sha:path:line) to test against, what to RUN through matrix.sh against planted fixtures, and what the deliverable must DECIDE' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'brief'],
}

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    candidates_deduplicated: { type: 'number' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    artifact_set: {
      type: 'object',
      properties: {
        rules: { type: 'array', items: { type: 'string' }, description: 'one line per rule: name, glob list, depth files' },
        skills: { type: 'array', items: { type: 'string' } },
        id_families: { type: 'array', items: { type: 'string' } },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' }, description: 'every frame premise the audits or scouts overturned, one line each with the evidence key' },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

const PROMPT = `Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of a whole wave across twelve corpus artifacts; this is the program's architecture decision, and a wrong priority wastes a wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for SHELL SCRIPTING ACROSS OPERATING SYSTEMS AND SHELLS (late 2026): POSIX sh and its implementations, bash 3.2 to 5.3, zsh, ksh family, fish 3/4, nushell, elvish, Windows PowerShell 5.1 and PowerShell 7.x, the userland underneath, CI shells, and code that emits shell code for many shells. Run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The output becomes AI-agent configuration (glob-scoped rules with support directories, skills, a bundle) published through the lore catalog and used by coding agents without a human in the loop.
- The owner's brief: "Bash, or shell scripting generally, with focus on compatibility across OSes including their default shell and which features work in which version (default bash on different distros or macOS). Include fish, elvish, nushell, PowerShell incl. Core, and variants like ksh, dash, zsh. Bash in particular has a lot of online resources, incl. pitfalls." The brief is a seed: the scouts and audits are your topic source, and anything they surfaced beyond the brief that is load-bearing must be on the map.
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3-5, Sizing, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", index + support directory shape). Then the frame IN FULL: ${RESEARCH}/shell-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/shell-audit/*.md (7 audits: config-inventory, fleet-shell-shape, ocx-emitter, installers, exemplar-shape, emitters-compared, platform-matrix) and ${RESEARCH}/shell-topic-map/*.md (5 scouts: canonical, practitioner, codified, failure, shifts). Do not skim; the "Candidate topics" tables are the raw material, and "Contested", "Recent shifts" and "Contradictions of the frame" are where conflicts live. If a file is missing, say so and proceed.
- For the house shape of a finished map read ${RESEARCH}/swift-topic-map.md sections "How to read this", "Conflicts resolved" and "Artifact set decision" (grep the headings for line numbers; read those sections only), and ${ROOT}/rules/swift-quality.md plus ${ROOT}/rules/go-quality.md (published per-language sets this one mirrors).
- Sibling lore sets own other languages; the Rust set's cli-contract depth file is the fleet's exit-code and stream contract that shell scripts should mirror rather than reinvent. Generic CI concerns belong to whichever set already owns them — check config-inventory.md.
- MEASUREMENT: ${TOOLS}/matrix.sh <family> <script> runs a script across interpreters (families posix, bash 3.2-5.3, zsh 5.0-5.9, fish 3.6-4.9, nu 0.105/0.116, elvish, pwsh 7.4/7.6 + Windows PowerShell 5.1, win = Git Bash + PS 5.1 on the real Windows host); ${TOOLS}/run.sh puts shellcheck 0.11.0, shfmt 3.13.1, fish, nu, elvish, pwsh on PATH. Dives CAN and MUST run verifications against planted fixtures under ${FIX}/<slug>/ (never /tmp): every candidate rule's verification is watched red on a planted violation and green on its fixed twin, and every version claim ("works since bash 4.4", "fails on dash", "7.3+ only") is settled by a matrix run, not by reading. No macOS host: BSD-userland claims are read-only and labelled.
- Budget: wave 2 is at most 7 groups and 14 dives; wave 3 the same. Cross-cutting decisions come first (dialect policy and the version floor table, error-handling model, quoting/expansion, the gate of record, PowerShell 5.1/7 compatibility, the multi-shell emission contract).

WRITE ${RESEARCH}/shell-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3 staged", sources_surveyed: 12, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets (config-inventory.md); priority against the consumers (the fleet's scripts and CI, ocx's multi-shell emitter and installers, and external adopters of the published set); a SURFACE legend (posix / bash / zsh / ksh / fish / nu / elvish / pwsh / userland / ci / emitter / installer / testing / lint-format / security); a source-key legend linking every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or H1-H9. Resolve each with the evidence that decided it (normative > measured > codified > argued > asserted). Cover at least: set -e / errexit as a default vs explicit error checks (Wooledge vs strict-mode advocates; what the strict long-lived projects measured actually do); POSIX sh vs bash as the default dialect, and the bash floor (3.2 vs 4.x vs 5.x) per script kind; whether POSIX.1-2024 additions (pipefail, dollar-single-quote, read -d, -print0) are usable yet given measured implementation support; shellcheck enable=all vs defaults vs a curated optional set, and which codes to relax (use the measured disable census); shfmt style of record; PowerShell target (5.1-compatible vs 7-only) per script kind and the PSScriptAnalyzer profile; one shell rule with per-shell depth files vs separate rules per shell family (posix/bash/zsh vs PowerShell vs fish/nu/elvish), and how a rule can load for extensionless scripts (no glob matches a shebang — decide the mechanism, using config-inventory.md's finding); whether GitHub workflow run: blocks and taskfile cmds belong to this set or to a CI set (and "Narrow the Glob Only When It Cannot Miss"); the era rows the shifts scout overturned.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file, across all rules): ID (M-<letter>-nn) | question | surface | coverage (covered / partial / uncovered, with source key) | priority P0-P3 with a one-clause justification | proposed ID family. Deduplicate aggressively: several hundred raw rows should become 160-240. Keep numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide, with the assumption named: the rules and their glob lists (which extensions and file names are safe: *.sh, *.bash, *.zsh, *.ksh, .shellcheckrc, *.ps1, *.psm1, *.psd1, *.fish, *.nu, *.elv, rc files such as .bashrc/.zshrc/config.fish/config.nu/Microsoft.PowerShell_profile.ps1 — with the audits' counts), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one family per depth file), the skills (procedures only — candidates from the frame: shell-integration / multi-shell emission, installer-script, shell-port, shell-diagnose; drop any that is really a rule, add any the evidence demands), the bundle name, and what is explicitly NOT in scope and why.
5. "## Selected for wave 2" — at most 7 groups and at most 14 dives total, 1-3 dives per group, chosen by: uncovered first, then leverage for the consumers, then "an area where agents demonstrably get it wrong", then "a rule could actually check this". For EACH dive: group slug (without shell- prefix), dive slug, label, ID family, and a research BRIEF of 10-25 lines written as a professional commission — what to investigate, which URLs to fetch (from the scouts), which builtins/options/versions/SC codes/PSSA rules to pin down, what fleet/exemplar evidence (file:line) to test against, what planted fixtures to RUN through matrix.sh, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items: places the audits found something the frame did not name and that is load-bearing (e.g. measured emitter defects, version-churn breakage rates, platform-matrix surprises).
6. "## Staged for wave 3" — the next groups (at most 14 dives) with the SAME brief quality. Mark which must be revised in light of wave-2 results.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle. Max 8. For each, propose the default the program assumes if unanswered (the program runs autonomously; the defaults WILL be applied). Re-examine the frame's Q1-Q6 in light of the evidence.
9. "## Explicitly not a defect" — frame suspicions the audits cleared.
10. "## Frame corrections" — every frame premise the wave-1 evidence overturned, one line each with the source key; the orchestrator appends these to the frame verbatim.

Rules: no claim without a source key or file:line; a topic is a QUESTION not a subject; every P0 must be checkable by a shellcheck code, a PSScriptAnalyzer rule, a parse/matrix run, a grep, or a named reading heuristic — say which; date every version-specific row with the shell/tool version. Use read-only tools except for your one output file. Return the structured receipt (wave2 and wave3_staged carry the full briefs verbatim, not summaries).`

phase('Map')
const map = await agent(PROMPT, { label: 'map:shell-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA })

if (!map) { log('MAP RETURNED NULL — read journal.jsonl'); return { map: null } }
log('Map: ' + map.candidates_deduplicated + ' rows · wave2 ' + map.wave2.length + ' dives in ' + new Set(map.wave2.map(d => d.group)).size + ' groups · wave3 staged ' + map.wave3_staged.length + ' · deferred ' + map.deferred_count + ' · owner questions ' + map.owner_questions.length + ' · frame corrections ' + map.frame_corrections.length)
return { map }
