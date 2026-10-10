export const meta = {
  name: 'swift-converge2',
  description: 'Swift research program convergence: fix held-out round 2 findings and refused halves by file owner, then held-out round 3 on three fresh trees',
  phases: [{ title: 'Fix' }, { title: 'Held-out 3' }],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const HO = '/home/mherwig/.cache/research-lang/heldout/swift'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const SC = WT + '/.agents/research/swift-topic-map/scratch/'
const CHECK = 'python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/swift/apple__containerization --forbid /home/mherwig --forbid .agents/research --allow-absent \'**/.swiftformat\' --allow-absent \'**/.swiftlint.yml\' --allow-absent \'**/Package@swift-*.swift\' --allow-absent \'**/.swift-quality-depth-on-demand\' --allow-absent \'**/.swift-package-depth-on-demand\' rules/swift-quality.md rules/swift-package.md skills/swift-upgrade skills/swift-diagnose skills/swift-release'

const OWNERS = [
  { label: 'fix-q-core', files: 'rules/swift-quality.md, rules/swift-quality/checks/*, rules/swift-quality/language.md, rules/swift-quality/concurrency.md, rules/swift-quality/apple.md, rules/swift-quality/api-design.md' },
  { label: 'fix-q-rest', files: 'rules/swift-quality/errors.md, io.md, network.md, security.md, testing.md, cli-contract.md (all under rules/swift-quality/)' },
  { label: 'fix-pkg', files: 'rules/swift-package.md, rules/swift-package/manifest.md, gates.md, release.md' },
  { label: 'fix-skills', files: 'skills/swift-upgrade/**, skills/swift-diagnose/**, skills/swift-release/**, and bundles/bazel-essentials.toml (its description still says thirteen depth files and lists the old languages; docs/bazel-essentials.md now says 390 rules across fifteen depth files, so match it)' },
]

const FIX = {
  type: 'object',
  properties: {
    unit: { type: 'string' },
    applied: { type: 'array', items: { type: 'string' } },
    refused: { type: 'array', items: { type: 'string' } },
    checker_clean: { type: 'boolean' },
  },
  required: ['unit', 'applied', 'refused', 'checker_clean'],
}

phase('Fix')
const fixes = await parallel(OWNERS.map(o => () => agent(
  'Model rationale: implementation edits to a decided finding list, sonnet default per routing policy.\n\n' +
  'Worktree ' + WT + ' holds a Swift lore set. Held-out round 2 on fresh trees produced the findings in ' + SC + 'heldout2-findings.json: key round2 (31 items with file, rule_id, evidence and a proposed fix; trees under ' + HO + ') and key refused_halves (25 cross-file halves the previous fixers could not apply because the file was not theirs; apply every one that lands in your files). Also: the checker reports skills/swift-upgrade/SKILL.md body 548 lines and skills/swift-release/SKILL.md body 526 lines, max 500; the skills owner moves detail into references/ until both bodies are at or under 500. ' +
  'You own ONLY these files: ' + o.files + '. Other fixers edit the other files in parallel; never touch a file outside your list. A finding that spans files: apply your half and say in refused what the other half needs.\n\n' +
  'For every finding that lands in your files: reproduce it first on the named tree (toolchain wrapper ' + RUN + ' runs commands inside swift:6.4; cwd must be under ' + HO + ' or the worktree), then fix it, then watch the changed command red on a plant and green on a twin and on the tree that raised it. Prefer the smallest change that makes the rule say the true thing. Two findings opened NEW classes; give them general fixes: (a) a check that treats benign git stderr (for example a symlinked .gitignore warning) as a scan failure: every script must judge failure by exit status of the scan, not by stderr presence, and keep stderr visible; sweep every checks/ script and cell for the same pattern; (b) manifests evaluated with environment-dependent or side-effecting code (ProcessInfo.environment, file reads in Package.swift): add a rule only if the evidence shows a real merge-blocking risk, otherwise a one-line note in manifest.md.\n\n' +
  'Contracts: rule IDs are stable, never renumber or delete an ID (reword in place, or mark superseded); keep each index file body at or under 200 lines (frontmatter excluded); verification commands use directory operands, -e alternatives, xargs -r, no placeholders in angle brackets; no home paths. Date any new measurement 2026-10-10. Then run from the worktree root: ' + CHECK + ' and fix until it prints clean. Do not commit.',
  { label: o.label, phase: 'Fix', schema: FIX, model: 'sonnet', effort: 'high' },
)))

const SCHEMA = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    trees_done: { type: 'array', items: { type: 'string' } },
    cells_run: { type: 'number' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          rule_id: { type: 'string' },
          known_class: { type: 'string', description: 'number from review-classes.md, or one of the three round-1 NEW class names, or NEW' },
          new_class: { type: 'string' },
          new_must: { type: 'boolean' },
          severity: { type: 'string', enum: ['blocker', 'fix', 'nit'] },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['file', 'rule_id', 'known_class', 'severity', 'evidence', 'fix'],
      },
    },
  },
  required: ['group', 'trees_done', 'cells_run', 'findings'],
}

const GROUPS = [
  { label: 'ho3', trees: ['apple__swift-nio-ssh', 'swift-server__RediStack', 'mxcl__PromiseKit'], focus: 'full swift-quality set (index, every depth file, every checks/ script) plus swift-package all depth files; run swift-upgrade as a dry-run on PromiseKit and swift-diagnose literally on one planted crash and one planted hang in a scratch copy of RediStack.' },
]

phase('Held-out 3')
const round2 = await parallel(GROUPS.map(g => () => agent(
  'Model rationale: verification pass over real trees, sonnet default per routing policy.\n\n' +
  'You are held-out round 3 of a research program that wrote a Swift lore set in the worktree ' + WT + ' (rules/swift-quality.md and rules/swift-quality/, rules/swift-package.md and rules/swift-package/, skills/swift-upgrade, skills/swift-diagnose, skills/swift-release). ' +
  'Known failure classes: ' + SC + 'review-classes.md, plus three from round 1: symlinked Sources blind spot; replacement API unavailable at the tree floor; procedure step assumes preconditions it never establishes. Round 1 and 2 findings, now fixed: ' + SC + 'heldout1-findings.json and ' + SC + 'heldout2-findings.json; round 2 added two classes: benign git stderr treated as scan failure; side-effecting manifest code. Read both first.\n\n' +
  'Your trees, never seen by the set authors: ' + g.trees.map(t => HO + '/' + t).join(', ') + '. Read-only; copy into ' + HO + '/scratch-' + g.label + ' for plants or builds. Toolchain: ' + RUN + ' runs commands inside swift:6.4 (SWIFT_VERSION=6.3 for the older leg); cwd must be under ' + HO + ' or the worktree. SourceKit SwiftLint image: ghcr.io/realm/swiftlint:0.65.1.\n\n' +
  'Focus: ' + g.focus + '\n\n' +
  'Run every verification cell and script as written on each tree, decide each hit true or false by reading the code, read exit codes against what the row says. Report only failures of the SET, each mapped to a known class or marked NEW with a general class name; mark new_must only for a real merge-blocking defect class in a tree that no rule covers. Do not edit the worktree.',
  { label: g.label, phase: 'Held-out 3', schema: SCHEMA, model: 'sonnet', effort: 'high' },
)))

return { fixes: fixes.filter(Boolean), round2: round2.filter(Boolean) }
