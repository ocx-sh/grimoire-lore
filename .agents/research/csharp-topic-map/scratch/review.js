export const meta = {
  name: 'csharp-review-fix',
  description: 'C# research-lang phase 8: per-unit adversarial review (verification cells watched red/green) pipelined into fixers, then an opus consistency pass with full gates',
  phases: [
    { title: 'Review', detail: 'sonnet reviewer per unit' },
    { title: 'Fix', detail: 'sonnet fixer per unit, own files only' },
    { title: 'Consistency', detail: 'opus cross-unit pass + gates', model: 'opus' },
  ],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp'
const R = WT + '/.agents/research'
const FIX = '/home/mherwig/.cache/research-lang/dotnet-tools/fixtures'
const RUN = '/home/mherwig/.cache/research-lang/dotnet-tools/run.sh'

const UNITS = [
  { key: 'processes', files: ['rules/csharp-quality/processes.md', 'rules/csharp-quality/binaries.md'], cons: ['csharp-process.md', 'csharp-packaging.md'] },
  { key: 'async', files: ['rules/csharp-quality/async.md'], cons: ['csharp-async.md'], extra: 'CS-ASYNC-26 rationale names IDE0044 and CA2211, which are not in the posture files: drop those names from the rationale (do not add posture lines).' },
  { key: 'api-errors', files: ['rules/csharp-quality/api-design.md', 'rules/csharp-quality/errors.md'], cons: ['csharp-api.md'] },
  { key: 'json', files: ['rules/csharp-quality/json.md'], cons: ['csharp-json.md'] },
  { key: 'platform-perf', files: ['rules/csharp-quality/platform-and-paths.md', 'rules/csharp-quality/performance.md'], cons: ['csharp-crossplatform.md', 'csharp-performance.md'] },
  { key: 'testing', files: ['rules/csharp-quality/testing.md'], cons: ['csharp-testing.md', 'csharp-crossplatform.md'], extra: 'Owner-side decision taken by the orchestrator: CA1515 fails public helper types in executable test projects under 10.0-all. Add a carve-out line to CS-TEST-12 (test projects set CA1515 to none, like the other test relaxations there), watched red/green.' },
  { key: 'language', files: ['rules/csharp-quality/language.md'], cons: ['csharp-language.md'] },
  { key: 'security-obs', files: ['rules/csharp-quality/security.md', 'rules/csharp-quality/observability.md'], cons: ['csharp-security.md', 'csharp-observability.md'] },
  { key: 'build', files: ['rules/dotnet-build.md', 'rules/dotnet-build/packaging.md', 'rules/dotnet-build/checks'], cons: ['csharp-build.md', 'csharp-packaging.md'] },
  { key: 'quality-index', files: ['rules/csharp-quality.md', 'rules/csharp-quality/checks'], cons: ['csharp-build.md', 'csharp-procedures.md'], extra: 'The index body is 193 lines vs the N-1 185 target and the 200 hard cap: tighten if any line fails the deletion test.' },
  { key: 'upgrade', files: ['skills/dotnet-upgrade'], cons: ['csharp-procedures.md', 'csharp-build.md'], skill: true },
  { key: 'diagnose', files: ['skills/dotnet-diagnose'], cons: ['csharp-procedures.md'], skill: true },
  { key: 'release', files: ['skills/dotnet-release'], cons: ['csharp-procedures.md', 'csharp-packaging.md'], skill: true },
  { key: 'adr-docs', files: ['.agents/research/csharp-ocx-sdk/adr_ocx_csharp_sdk.md', 'docs/csharp-quality.md', 'docs/dotnet-build.md', 'docs/dotnet-upgrade.md', 'docs/dotnet-diagnose.md', 'docs/dotnet-release.md', 'docs/dotnet-essentials.md', 'bundles/dotnet-essentials.toml'], cons: ['csharp-process.md', 'csharp-api.md', 'csharp-packaging.md'], extra: 'The ADR calls ocx-sh/ocx#604 open; check its real state with gh and fix. Every count in the docs pages must match the shipped files (count them).' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    report: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          file: { type: 'string' },
          rule_id: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          class: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
          cross_unit: { type: 'boolean' },
        },
        required: ['id', 'file', 'severity', 'class', 'problem', 'evidence', 'fix', 'cross_unit'],
      },
    },
    cells_run: { type: 'number' },
    cells_failed: { type: 'number' },
    trigger_eval: { type: 'string' },
  },
  required: ['report', 'findings', 'cells_run', 'cells_failed'],
}

const FIXED = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    refused: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } },
    checker_clean: { type: 'boolean' },
    new_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['fixed', 'refused', 'checker_clean'],
}

const CHECKER = 'python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/csharp/microsoft__testfx --allow-absent \'**/nuget.config\' --allow-absent \'**/NuGet.Config\' --allow-absent \'**/.csharp-quality-depth-on-demand\' --allow-absent \'**/.dotnet-build-depth-on-demand\' --forbid /home/ --forbid .cache/research-lang --forbid .agents/research --forbid consolidate-csharp'

const results = await pipeline(
  UNITS,
  (u) => agent(
    'Model rationale: sonnet - adversarial review with toolchain verification; findings are mechanical to check.\n\n' +
    'You are an ADVERSARIAL REVIEWER in phase 8 of the research-lang C# / .NET program. Worktree ' + WT + ' (branch csharp). READ-ONLY on the worktree: you write nothing there. Fixtures only under ' + FIX + '/review-' + u.key + '/ via ' + RUN + '. Date ' + args.date + '.\n\n' +
    'UNIT: ' + u.files.join(', ') + '\nSource of truth: the consolidations ' + u.cons.map(c => R + '/' + c).join(', ') + ' and the binding "## Authoring notes (binding on the drafters)" + "## Integration log" sections of ' + R + '/csharp-topic-map.md (notes win over consolidations). Siblings for contradiction checks: rules/csharp-quality.md, rules/dotnet-build.md and every rules/csharp-quality/*.md (rule rows only).\n' +
    (u.extra ? 'ORCHESTRATOR DIRECTIVE: ' + u.extra + '\n' : '') + '\n' +
    'Do all of this, with evidence:\n' +
    '1. VERIFICATION HONESTY: extract EVERY runnable verification cell (rg/grep pattern, script, dotnet command, MSBuild property check) from the unit and run it, verbatim, against a planted RED fixture (a minimal project or file that violates the rule) and its GREEN twin. A cell that cannot go red, goes red on the green twin, errors, or uses a placeholder is a finding. Also run each rg/grep cell over 3 real trees under /home/mherwig/.cache/research-lang/heldout/csharp/ (pick ones that fit: restsharp__RestSharp, open-telemetry__opentelemetry-dotnet, NLog__NLog, microsoft__kiota-dotnet, grpc__grpc-dotnet ...) and judge false positives / misses by reading the hits (sample up to 10 hits per cell).\n' +
    '2. FIDELITY: each rule row matches its consolidation rule (same meaning, same severity unless an authoring note changed it), IDs stable, retired IDs marked.\n' +
    '3. CONTRADICTION: any unit rule that conflicts with a sibling rule (same subject, different instruction).\n' +
    '4. DELETION TEST: rows an agent would not get wrong without being told, or pure restatement of an analyzer already on in the posture.\n' +
    '5. ERA + PORTABILITY: version-specific claims carry their version/date; no ocx instance leaks into published rules beyond labelled examples (75 as a labelled sysexits example is accepted); no /home/ paths.\n' +
    '6. READING: house voice per rule-distillation.md, imperative, no hedging, tables of contents on files over 100 lines, links resolve.\n' +
    (u.skill ? '7. SKILL RUN + TRIGGER EVAL: walk the skill literally, step by step, on one held-out tree (copy it to ' + FIX + '/review-' + u.key + '/tree first; never modify the held-out clone), executing every command it tells you to run with the toolchain; any step that fails, misleads, or needs knowledge the skill does not give is a finding. Then write 3 should-trigger user utterances and 1 should-not-trigger neighbour, and judge against the descriptions of ALL skills in ' + WT + '/skills/*/SKILL.md whether this skill (and only it) would be picked; record in trigger_eval.\n' : '') +
    'Classify every finding with a short mechanism class (e.g. dead-pattern, false-positive-pattern, placeholder, contradiction, stale-era, unfaithful, leak, redundant-row, broken-step, missing-toc). Mark cross_unit=true when the fix belongs in a file outside the unit. Put your full narrative in report (it is filed as the review record).\n' +
    'Return findings (each with a concrete fix), cells_run, cells_failed, trigger_eval.',
    { label: 'review:' + u.key, phase: 'Review', schema: FINDINGS, model: 'sonnet', effort: 'high' }),
  (rev, u) => {
    const own = rev.findings.filter(f => !f.cross_unit)
    if (!own.length) return { unit: u.key, review: rev, fix: { fixed: [], refused: [], checker_clean: true } }
    return agent(
      'Model rationale: sonnet - applying decided review findings to rule text within one unit.\n\n' +
      'You are the FIXER for unit "' + u.key + '" in phase 8 of the C# / .NET program. Worktree ' + WT + ' (branch csharp); do not commit. Edit ONLY: ' + u.files.join(', ') + '. Binding: "## Authoring notes (binding on the drafters)" and "## Integration log" in ' + R + '/csharp-topic-map.md; consolidations ' + u.cons.map(c => R + '/' + c).join(', ') + '.\n\n' +
      'Findings to resolve (JSON):\n' + JSON.stringify(own, null, 1) + '\n\n' +
      'For each: apply the fix, or refuse with a reason if the finding is wrong (re-check its evidence yourself first). Every changed verification cell must be watched red on a planted fixture and green on its twin under ' + FIX + '/fix-' + u.key + '/ via ' + RUN + '. Rule IDs never renumber; retired IDs stay marked retired. Keep size budgets (rule index < 200 lines, depth files carry a TOC over 100 lines, skill body < 500 lines). Then run: cd ' + WT + ' && ' + CHECKER + ' ' + u.files.filter(f => !f.startsWith('.agents') && !f.startsWith('docs') && !f.startsWith('bundles')).join(' ') + ' and fix until clean (skip the checker if the unit has no rule/skill file).\n' +
      'Return fixed ids, refused (id + reason), checker_clean, new_issues for the consistency pass.',
      { label: 'fix:' + u.key, phase: 'Fix', schema: FIXED, model: 'sonnet' }).then(fx => ({ unit: u.key, review: rev, fix: fx }))
  },
)

const ok = results.filter(Boolean)
const cross = ok.flatMap(r => r.review.findings.filter(f => f.cross_unit).map(f => ({ unit: r.unit, ...f })))
const newIssues = ok.flatMap(r => (r.fix && r.fix.new_issues || []).map(i => r.unit + ': ' + i))
log('reviewed ' + ok.length + '/' + UNITS.length + '; findings ' + ok.reduce((n, r) => n + r.review.findings.length, 0) + '; cross-unit ' + cross.length)

phase('Consistency')
const cons = await agent(
  'Model rationale: opus - cross-unit resolution decides contradictions between enforced rules.\n\n' +
  'You are the CONSISTENCY pass closing phase 8 review of the C# / .NET set. Worktree ' + WT + ' (branch csharp); do not commit. Read the authoring notes + integration log in ' + R + '/csharp-topic-map.md.\n\n' +
  'Cross-unit findings to resolve (apply or refuse with reason):\n' + JSON.stringify(cross, null, 1) + '\n\nFixer-reported new issues:\n' + newIssues.map(i => '- ' + i).join('\n') + '\n\n' +
  'Then: every cited rule ID defined once; index routing covers every family; no two rules contradict; skill tables match their owning rows. Run the full checker: cd ' + WT + ' && ' + CHECKER + ' rules/csharp-quality.md rules/dotnet-build.md skills/dotnet-upgrade skills/dotnet-diagnose skills/dotnet-release ; task ci CSHARP_CONSUMER=/home/mherwig/.cache/research-lang/exemplars/csharp/microsoft__testfx ; ruff format --check . ; grim publish --dry-run (read its warnings). Fix until clean.\n' +
  'Write the review record: ' + R + '/csharp-topic-map/scratch/review-receipt.json is written by the orchestrator; you append "## Phase 8 review log" to ' + R + '/csharp-topic-map.md with: per unit findings count and classes, cross-unit resolutions, gates with exit codes. Also write ' + R + '/csharp-topic-map/review-classes.md: every finding class across units (mechanism, count, the check that catches it, which files), since held-out rounds converge on classes.\n' +
  'Return a receipt: gates + exit codes, classes list, unresolved items (only things genuinely needing the owner).',
  { label: 'consistency', phase: 'Consistency', model: 'opus' })

return { units: ok.map(r => ({ unit: r.unit, findings: r.review.findings.length, classes: [...new Set(r.review.findings.map(f => f.class))], cells_run: r.review.cells_run, cells_failed: r.review.cells_failed, trigger: r.review.trigger_eval || null, fixed: r.fix.fixed.length, refused: r.fix.refused, clean: r.fix.checker_clean })), reviews: ok.map(r => ({ unit: r.unit, report: r.review.report, findings: r.review.findings })), cross: cross.length, consistency: cons }
