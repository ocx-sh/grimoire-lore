export const meta = {
  name: 'csharp-heldout-round',
  description: 'C# research-lang held-out round: sweep every verification cell and run every skill on fresh trees, opus-classify failure classes vs known, fix new classes',
  phases: [
    { title: 'Sweep', detail: 'sonnet: verification cells per rule family over the round trees, plus literal skill runs' },
    { title: 'Classify', detail: 'opus: known vs new classes, new MUST, fix list', model: 'opus' },
    { title: 'Fix', detail: 'sonnet fixer per file group' },
  ],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp'
const R = WT + '/.agents/research'
const HO = '/home/mherwig/.cache/research-lang/heldout/csharp'
const FIX = '/home/mherwig/.cache/research-lang/dotnet-tools/fixtures'
const RUN = '/home/mherwig/.cache/research-lang/dotnet-tools/run.sh'
const ROUND = args.round
const TREES = args.trees
const TREELIST = TREES.map(t => HO + '/' + t).join(', ')
const CHECKER = 'python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/csharp/microsoft__testfx --allow-absent \'**/nuget.config\' --allow-absent \'**/NuGet.Config\' --allow-absent \'**/.csharp-quality-depth-on-demand\' --allow-absent \'**/.dotnet-build-depth-on-demand\' --forbid /home/ --forbid .cache/research-lang --forbid .agents/research --forbid consolidate-csharp'

const KNOWN = 'Known failure classes: read ' + R + '/csharp-topic-map/review-classes.md' + (ROUND > 1 ? ' and every "## Held-out round" section in ' + R + '/csharp-topic-map.md' : '') + '. A failure is NEW only if its mechanism matches no known class; a new instance of a known class is not new.'

const COMMON = 'Phase 8 held-out round ' + ROUND + ' of the research-lang C# / .NET program. Worktree ' + WT + ' (branch csharp) is READ-ONLY for you. The round trees (fresh, never seen by authors or reviewers): ' + TREELIST + '. Never modify a held-out clone: copy what you need to ' + FIX + '/heldout' + ROUND + '-<your-key>/ first. Toolchain: ' + RUN + ' (SDKs 8.0.425, 10.0.401, 11 RC1; a tree\'s global.json may need another SDK - record that as a finding only if the skills/rules mishandle it). DISK: /tmp is a shared 16 GB tmpfs - never point NUGET_PACKAGES, --packages, TMPDIR or any cache at /tmp or mktemp; when a shipped block uses mktemp, run it with TMPDIR=' + FIX + '/heldout' + ROUND + '-tmp and delete what it leaves before you return. ' + KNOWN + '\n'

const OUT = {
  type: 'object',
  properties: {
    report: { type: 'string' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          rule_id: { type: 'string' },
          tree: { type: 'string' },
          class: { type: 'string' },
          known: { type: 'boolean' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
          proposes_new_must: { type: 'boolean' },
        },
        required: ['file', 'class', 'known', 'problem', 'evidence', 'fix', 'proposes_new_must'],
      },
    },
    cells_run: { type: 'number' },
  },
  required: ['report', 'failures', 'cells_run'],
}

const SWEEPS = [
  { key: 'processes-binaries', files: 'rules/csharp-quality/processes.md, rules/csharp-quality/binaries.md' },
  { key: 'async-language', files: 'rules/csharp-quality/async.md, rules/csharp-quality/language.md' },
  { key: 'api-errors-json', files: 'rules/csharp-quality/api-design.md, rules/csharp-quality/errors.md, rules/csharp-quality/json.md' },
  { key: 'platform-perf-testing', files: 'rules/csharp-quality/platform-and-paths.md, rules/csharp-quality/performance.md, rules/csharp-quality/testing.md' },
  { key: 'security-obs', files: 'rules/csharp-quality/security.md, rules/csharp-quality/observability.md' },
  { key: 'build', files: 'rules/dotnet-build.md, rules/dotnet-build/packaging.md, rules/dotnet-build/checks/*', extra: 'Also install the shipped posture (the files the index tells an adopter to add: analyzers props/globalconfig, BannedSymbols, gate block) into a COPY of two of the trees, build them with the toolchain, and judge whether the resulting diagnostics are real defects or posture noise the rules should have predicted (record the counts). Check every dotnet-build glob for liveness on all round trees.' },
  { key: 'quality-index', files: 'rules/csharp-quality.md, rules/csharp-quality/checks/*', extra: 'Run every shipped checks/ script and the index gate block on copies of the trees; check the routing table: for 10 real edits you can imagine in these trees, does the index route the agent to the depth file holding the rule it needs?' },
]

const SKILLS = [
  { key: 'upgrade', skill: 'skills/dotnet-upgrade', task: 'Pick the round tree whose TFMs/SDK pin are oldest and perform the upgrade the skill describes (to net10.0 / SDK 10.0.401, LangVersion per the skill) on a copy, literally step by step, running every command.' },
  { key: 'diagnose', skill: 'skills/dotnet-diagnose', task: 'Build and test copies of the round trees with the toolchain until you hit real failures (restore, build, analyzer, test, SDK selection, workload, AOT/trim - whatever occurs; if all are green, break one realistically: delete a global.json pin, add a downgrade, flip a TFM). Diagnose each failure literally with the skill, step by step, and judge whether its catalogue routed you to the right fix fast.' },
  { key: 'release', skill: 'skills/dotnet-release', task: 'Pick the round tree that is a NuGet library and run the skill\'s release procedure as a dry run on a copy (no push, no publish, no network writes): pack, package validation, SourceLink/determinism checks, every gate it names; also its app-publish path on one console/tool project if any tree has one (self-contained, single-file, AOT where possible on linux-x64).' },
]

phase('Sweep')
const sweepJobs = SWEEPS.map(s => () => agent(
  'Model rationale: sonnet - mechanical cell sweeps with evidence; classification is decided by opus.\n\n' + COMMON +
  'YOUR FILES: ' + s.files + '. Extract EVERY verification cell (rg/grep, script, dotnet/MSBuild check, reading heuristic) and run each one verbatim over every round tree. For each cell: hits per tree; read up to 10 hits per cell and judge true/false positive; look for violations the cell misses (grep the tree for the rule\'s subject a second, independent way). Also judge whether each rule\'s instruction is right for these real codebases (a rule that real, well-run code violates for a good reason is a finding). ' + (s.extra || '') + '\nRecord every failure with its mechanism class and known=true/false against the known classes; proposes_new_must=true only if a missing rule would be MUST. Full narrative in report.',
  { label: 'sweep:' + s.key, phase: 'Sweep', schema: OUT, model: 'sonnet', effort: 'high' }))
const skillJobs = SKILLS.map(k => () => agent(
  'Model rationale: sonnet - literal skill execution on a real tree with evidence.\n\n' + COMMON +
  'YOUR SKILL: ' + WT + '/' + k.skill + ' (read SKILL.md and its references fully, follow it LITERALLY - do not use knowledge it does not give you, and note every place you had to). TASK: ' + k.task + '\nEvery step that fails, misleads, is ambiguous, is slow past its stated budget, or misses the real problem is a failure with a mechanism class and known=true/false. Full narrative (commands, exit codes, outcome) in report.',
  { label: 'skill:' + k.key, phase: 'Sweep', schema: OUT, model: 'sonnet', effort: 'high' }))
const sweeps = (await parallel([...sweepJobs, ...skillJobs])).filter(Boolean)
const all = sweeps.flatMap(s => s.failures)
log('round ' + ROUND + ': ' + all.length + ' failures, ' + all.filter(f => !f.known).length + ' claimed new, ' + all.filter(f => f.proposes_new_must).length + ' propose new MUST')

const CLS = {
  type: 'object',
  properties: {
    new_classes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, mechanism: { type: 'string' }, check: { type: 'string' } }, required: ['name', 'mechanism', 'check'] } },
    new_must: { type: 'array', items: { type: 'string' } },
    fix_groups: {
      type: 'array',
      items: { type: 'object', properties: { key: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, items: { type: 'string' } }, required: ['key', 'files', 'items'] },
    },
    converged: { type: 'boolean' },
    owner: { type: 'array', items: { type: 'string' } },
  },
  required: ['new_classes', 'new_must', 'fix_groups', 'converged'],
}

phase('Classify')
const cls = await agent(
  'Model rationale: opus - deciding which failures are new classes and which become MUST rules.\n\n' +
  'You are the CLASSIFIER for held-out round ' + ROUND + ' of the C# / .NET program. Worktree ' + WT + '. ' + KNOWN + '\n\nRound failures (JSON):\n' + JSON.stringify(all, null, 1) + '\n\nSweep reports are summarised in the failures; if a claim looks shaky, verify it yourself on the trees (' + TREELIST + ') with ' + RUN + ' (fixtures under ' + FIX + '/heldout' + ROUND + '-classify/).\n\n' +
  'Decide: (1) which claimed-new failures are genuinely new mechanism classes (each with the check that catches it) vs instances of known classes; (2) which proposed MUSTs are real (a missing rule an agent gets wrong, checkable, diff-changing) - new_must lists them as "file: ID-or-new: rule"; (3) fix_groups: every failure worth fixing (new class or known class instance with a real defect), grouped by file so no two groups touch the same file, each with an items text block (finding, evidence, fix); (4) converged = true only if there is no new class AND no new MUST. Append "## Held-out round ' + ROUND + ' (' + args.date + ')" to ' + R + '/csharp-topic-map.md: trees + SHAs, cells run, failures by class, new classes, new MUST, verdict. Edit nothing else. owner: only items that genuinely need the owner.',
  { label: 'classify', phase: 'Classify', schema: CLS, model: 'opus' })

phase('Fix')
const fixes = await parallel(cls.fix_groups.map(g => () => agent(
  'Model rationale: sonnet - applying classified held-out findings within one file group.\n\n' +
  'You are a FIXER for held-out round ' + ROUND + ' of the C# / .NET program. Worktree ' + WT + ' (branch csharp); do not commit. Edit ONLY: ' + g.files.join(', ') + '. Binding: authoring notes, integration log, phase 8 review log and held-out round sections in ' + R + '/csharp-topic-map.md.\n\nItems:\n' + g.items + '\n\n' +
  'Apply each (or refuse with a reason after re-checking its evidence). Every new or changed verification cell is watched red on a planted fixture and green on its twin under ' + FIX + '/heldout' + ROUND + '-fix-' + g.key + '/ via ' + RUN + ', and re-run over the round trees (' + TREELIST + ') to confirm the false positive/miss is gone. New rules get new IDs continuing their family; never renumber. Keep size budgets. Then run: cd ' + WT + ' && ' + CHECKER + ' rules/csharp-quality.md rules/dotnet-build.md skills/dotnet-upgrade skills/dotnet-diagnose skills/dotnet-release - fix findings in your files until clean.\nReturn a short receipt: applied, refused with reasons, checker result.',
  { label: 'fix:' + g.key, phase: 'Fix', model: 'sonnet' })))

return { round: ROUND, trees: TREES, failures: all.length, claimed_new: all.filter(f => !f.known).length, cls, fixes, reports: sweeps.map(s => s.report) }
