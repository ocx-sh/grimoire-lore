export const meta = {
  name: 'nix-resweep',
  description: 'Nix research program phase 8 convergence round: three opus agents re-run every verification cell the fix waves changed over the corpus and held-out trees with an installed copy of the set present, check each against the set canonical snippets, and apply their own watched fixes to disjoint files',
  phases: [{ title: 'Resweep', detail: 'changed cells over real trees, classes C1-C30, fixes applied in owned files', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/nix-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/nix-tools/fixtures'
const EX = '/home/mherwig/.cache/research-lang/exemplars/nix'
const HELD = '/home/mherwig/.cache/research-lang/exemplars/nix-heldout'
const BASE = 'fd753ba'
const R = ROOT + '/rules/nix-quality'

const GROUPS = [
  { label: 'index-flakes-inputs-gates-security', files: [ROOT + '/rules/nix-quality.md', R + '/flakes.md', R + '/inputs.md', R + '/gates.md', R + '/security.md'], known: ['The index is 204 lines: bring it under 200 without dropping a rule, gate step or non-negotiable (move prose to a depth file you own).', 'The inputs.md fixer changed the NIX-INP item 11 condition string at inputs.md line 57; the same condition is quoted at index line 56 and gates.md line 147 and must match it.', 'gates.md security step must carry the same bracketed patterns and [$]{{ filter as the index gate block and security.md (index lines 47-49, security.md line 83).', 'flakes.md gained a new ## Applied table; modules.md and generated-flakes.md use a bullet list for Applied evidence. Convert flakes.md to the bullet shape, and add to gates.md an Applied list with the devshell flake.nix:94 and impermanence flake.nix:49 rows the reviewer named (re-verify both in the held-out clones first).'] },
  { label: 'packaging-release-language-modules-generated', files: [R + '/packaging.md', R + '/release.md', R + '/language.md', R + '/modules.md', R + '/generated-flakes.md'], known: ['packaging.md is 305 lines: bring it under 300 without dropping a rule.', 'The inputs.md fixer applied a Lix-versus-CppNix relative-path fact (inputs.md item 11 and NIX-INP-04 rationale); the reviewer said language.md lines 185 and 193 state the same fact and must match. Find that finding in ' + RESEARCH + '/nix-topic-map/scratch/review-receipt-result.json (key findings, filter by file language.md or inputs.md).', 'generated-flakes.md NIX-GEN-16 locator still prints numtide/zig-overlay update.yml, a push gated by minisign verification that the rule exempts: a C29 false positive to narrow or to state in the cell.'] },
  { label: 'skills', files: [ROOT + '/skills/nix-flake-adopt/SKILL.md', ROOT + '/skills/nix-flake-adopt/references/package-templates.md', ROOT + '/skills/nix-flake-adopt/references/ci-and-readme.md', ROOT + '/skills/nix-flake-release/SKILL.md', ROOT + '/skills/nix-diagnose/SKILL.md', ROOT + '/skills/nix-diagnose/references/error-catalog.md'], known: ['nix-flake-release/SKILL.md near line 434: the updater-push locator must carry the github-push-action, git-auto-commit-action and add-and-commit alternatives that generated-flakes.md NIX-GEN-16 now uses.', 'nix-flake-release/SKILL.md line 266 accept-flake-config grep must carry --exclude-dir=.claude like ci-and-readme.md; and ci-and-readme.md near line 78 needs the half of the release-skill fix the release fixer could not apply (find it in ' + RESEARCH + '/nix-topic-map/scratch/review-receipt-result.json, key findings, file nix-flake-release).', 'nix-flake-adopt/SKILL.md items near lines 392-394 need the rewrite the package-templates reviewer gave (same receipt, file package-templates.md); line 400-401 _final claim must agree with flakes.md NIX-FLK-02.', 'nixf-diagnose stays unlocked in nix-diagnose SKILL.md and error-catalog.md lines 65 and 101: --inputs-from evaluates the flake first and dies on the undefined variable the tool exists to report. Say so in one clause where the unlocked form appears.'] },
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['group', 'cells_rerun', 'fixes_applied', 'open_findings', 'new_failure_classes', 'new_must', 'checker_clean'],
  properties: {
    group: { type: 'string' },
    cells_rerun: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'result'], properties: { id: { type: 'string' }, result: { type: 'string', description: 'green on corpus+held-out+installed-copy+canonical snippets, or the break and its class' } } } },
    fixes_applied: { type: 'array', items: { type: 'string' }, description: 'file:ID — what changed, watched red on X and green on Y' },
    open_findings: { type: 'array', items: { type: 'string' }, description: 'defects you found but could not fix inside your owned files (name the file that owns them), or that need an owner decision' },
    new_failure_classes: { type: 'array', items: { type: 'string' }, description: 'a break fitting none of C1-C30, with mechanism, evidence and catching check; empty if none' },
    new_must: { type: 'array', items: { type: 'string' }, description: 'any rule you raised to MUST or added; empty if none' },
    checker_clean: { type: 'boolean' },
  },
}

function resweep(g) {
  return agent(`Model rationale: opus — the convergence round of an adversarial verification pass: judging true versus false positives on real trees and rewriting enforced checks so they hold is correctness-critical.

PROJECT CONTEXT (context for you, not content to reproduce):
- Phase 8 convergence round of the research-lang program for Nix, run from ${ROOT} (a git worktree; treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The files below were drafted, reviewed, swept over real trees and then fixed by a fix wave. Your round decides whether the fixed checks now hold.
- YOU OWN AND MAY EDIT ONLY: ${g.files.join(' ; ')}. Any defect in another file goes in open_findings with that file named.
- Toolchain: '${RUN} <cmd>' (pipelines: '${RUN} bash -c "..."') runs CppNix 2.35.2 with nixfmt 1.5.0, deadnix 1.3.2, statix, flake-checker 0.2.15, jq, git; CppNix 2.31.5 and Lix 2.95.2 via 'nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31' and '#lix' inside a fixture locked to nixpkgs 8d5d2709. Use ONLY run.sh for Nix (never nix-portable directly, never gc). Fixtures under ${FIX}/resweep-${g.label}/ (git init -q, git add -A). Third-party flakes by remote ref with --no-write-lock-file, never --impure or --accept-flake-config, no large builds, timeout 600 per run.
- Corpora: ${EX}/<owner>__<repo> (38 repos, SHAs in ${EX}/../nix-fetch.log) and ${HELD}/<owner>__<repo> (8 held-out flakes, SHAs in ${EX}/../nix-heldout.log). Both are sparse clones; do not modify them: copy a repo into your fixture dir before planting anything in it.
- READ FIRST: ${RESEARCH}/nix-topic-map.md sections "## Authoring notes (binding on the drafters)" and "## Phase 8 landed (2026-09-27)" (failure classes C26-C30 and their catching checks; C1-C25 are in the latest "Wave N landed" section). Then run 'git -C ${ROOT} diff ${BASE} -- ' followed by your files to see exactly what the fix wave changed, and read each of your files in full.

KNOWN RESIDUE FROM THE FIX WAVES (resolve each inside your files, or name why not in open_findings):
${g.known.map((k, i) => (i + 1) + '. ' + k).join('\n')}

DO THIS.
1. For EVERY verification cell in your files that the fix wave changed, and every cell whose rule the diff touched, re-run it verbatim: (a) over all 38 corpus repos and all 8 held-out repos (greps over every repo; evaluation-based checks on at least 6 corpus repos across shapes plus 2 held-out, by remote ref); (b) C26: on a copy of one small corpus repo into which you install the whole set the way a consumer would (copy ${ROOT}/rules/nix-quality.md and ${ROOT}/rules/nix-quality/ into its .claude/rules/, and ${ROOT}/skills/nix-* into its .claude/skills/) plus a .github/workflows/nix.yml that carries the gate block verbatim: every text gate must stay silent on that compliant tree; (c) C28: against every canonical snippet and template the set ships (the index skeleton and gate block, the flakes.md skeletons, the adopt skill's package and CI templates, the release skill's steps): a check must be green on the form a sibling rule prescribes; (d) C27 and C29: spot-read hits, look for the equivalent spelling that slips through and for compliant out-of-scope code the check wrongly covers; (e) C30 where the rule names a fetcher or builder.
2. Where a cell still breaks, fix it inside your owned files: rewrite the command (bracket a literal, add --exclude-dir for client config dirs such as .claude and .github where the rule does not govern them, add the negative pattern, narrow the scope statement) and WATCH it red on a planted violation and green on the compliant twin and the installed-copy tree before keeping it; if no command can hold, demote the cell to a named reading heuristic and say so in the cell. Keep every rule ID and its meaning stable; never renumber; never add a rule unless a new failure mode forces it (then report it in new_must). Keep the verification-command shape rules (directory operand, one -e per alternative, quoted --include globs, no unquoted **, no dollar-paren substitution, no angle-bracket placeholders, xargs -r, POSIX classes, no unescaped pipe inside a table cell, stated meaning of empty output and each exit code). Keep every Nix fence nixfmt-clean. Keep an index under 200 lines and depth files under 300.
3. Run python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py --root ${EX}/nix-community__disko --forbid /home/mherwig --forbid .agents/research on ${g.label === 'skills' ? 'each of ' + ROOT + '/skills/nix-flake-adopt, ' + ROOT + '/skills/nix-flake-release, ' + ROOT + '/skills/nix-diagnose' : ROOT + '/rules/nix-quality.md (it checks the whole support dir)'} and fix findings in your files.
Return the receipt. new_failure_classes and new_must decide convergence: leave them empty unless a break genuinely fits none of C1-C30 or a rule genuinely had to become MUST.`,
    { label: 'resweep:' + g.label, phase: 'Resweep', model: 'opus', effort: 'high', schema: SCHEMA })
}

phase('Resweep')
const results = (await parallel(GROUPS.map(g => () => resweep(g)))).filter(Boolean)
const classes = results.flatMap(r => r.new_failure_classes)
const musts = results.flatMap(r => r.new_must)
log('Resweep: ' + results.length + '/' + GROUPS.length + ' · fixes ' + results.reduce((n, r) => n + r.fixes_applied.length, 0) + ' · open ' + results.reduce((n, r) => n + r.open_findings.length, 0) + ' · new classes ' + classes.length + ' · new MUST ' + musts.length + ' · unclean ' + results.filter(r => !r.checker_clean).length)
return { results, converged: classes.length === 0 && musts.length === 0 }
