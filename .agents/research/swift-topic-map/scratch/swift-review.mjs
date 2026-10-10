export const meta = {
  name: 'swift-review-fix',
  description: 'Swift research program phase 8: per-unit adversarial review (verification cells run red/green on plants and swept over real exemplar trees, skills run literally on real trees), pipelined into a per-unit fixer, then one cross-set consistency pass',
  phases: [
    { title: 'Review', detail: 'one sonnet reviewer per unit; findings only, no edits' },
    { title: 'Fix', detail: 'one sonnet fixer per unit, own files only' },
    { title: 'Consistency', detail: 'cross-set IDs, routing, duplication, cross-unit findings' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const SLK = '/home/mherwig/.cache/research-lang/swift-tools/swiftlint-sk.sh'
const FIX = '/home/mherwig/.cache/research-lang/swift-tools/fixtures'
const EX = '/home/mherwig/.cache/research-lang/exemplars/swift'
const MAP = RESEARCH + '/swift-topic-map.md'
const CHECK = 'python3 -I ' + ROOT + "/.claude/skills/research-lang/scripts/check-artifacts.py rules/swift-quality.md rules/swift-package.md skills/swift-upgrade skills/swift-diagnose skills/swift-release --root " + EX + "/apple__containerization --allow-absent '**/.swiftformat' --allow-absent '**/.swiftlint.yml' --allow-absent '**/Package@swift-*.swift' --allow-absent '**/.swift-quality-depth-on-demand' --allow-absent '**/.swift-package-depth-on-demand' --forbid /home/ --forbid .cache/research-lang --forbid swiftlint-sk.sh"

const ENV = `ENVIRONMENT (context for you, not content to reproduce):
- Repository root: ${ROOT} (a git worktree; never cd to /home/mherwig/dev/grimoire-lore). The Swift set under review: rules/swift-quality.md + rules/swift-quality/ (10 depth files + checks/ scripts), rules/swift-package.md + rules/swift-package/ (manifest.md, gates.md, release.md), skills/swift-upgrade, skills/swift-diagnose, skills/swift-release, rules/bazel-quality/swift.md. These ship to strangers and are loaded by coding agents with no human in the loop.
- Binding decisions: ${MAP} from line 2199 ("## Authoring notes (binding on the drafters)", N-1..N-14) and the two "(e) Cross-consolidation contradictions" lists (lines 1618-1687 and 1969-2198). The consolidations under ${RESEARCH}/swift-<group>.md are the evidence base; their sub-artifacts under ${RESEARCH}/swift-<group>/ hold the recorded verification runs.
- Method references: ${ROOT}/.claude/skills/research-lang/references/validation.md (Content Review, Trigger Evals) and rule-distillation.md.
- Toolchain: '${RUN} <cmd>' runs Docker swift:6.4 (SWIFT_VERSION=6.3 or 6.2.0 for other legs; cwd must be under /home/mherwig/.cache/research-lang or ${ROOT}; build with --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/<your-label>-<n>; seccomp unconfined so TSan works; static swiftlint on PATH silently skips custom_rules). SourceKit SwiftLint: '${SLK} lint --no-cache ...'. Plants and twins go under ${FIX}/review-<your-label>/ (never /tmp, never inside an exemplar). Exemplar corpus (read-only; copy before any write): ${EX}/<owner>__<repo>, 40 repos. No macOS, no Windows Swift.
- Checker: from ${ROOT} run: ${CHECK}
`

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['unit', 'cells_run', 'cells_red_ok', 'sweep_trees', 'findings', 'failure_classes'],
  properties: {
    unit: { type: 'string' },
    cells_run: { type: 'number', description: 'verification cells executed against a plant and its twin' },
    cells_red_ok: { type: 'number', description: 'cells that went red on the plant and green on the twin' },
    sweep_trees: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'file', 'rule_id', 'class', 'evidence', 'fix', 'owner_unit'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'fix', 'nit'] },
          file: { type: 'string' }, rule_id: { type: 'string', description: 'ID, or "-" for file-level' },
          class: { type: 'string', description: 'failure class by mechanism, e.g. "check cannot go red", "false positive on real tree", "contradicts sibling ID", "stale/unverified version claim", "rule an agent already follows", "unescaped pipe in cell", "skill step fails on real tree", "notes N-x not applied"' },
          evidence: { type: 'string', description: 'command + exit code + output line, or file:line quote' },
          fix: { type: 'string', description: 'the concrete edit, exact replacement text where possible' },
          owner_unit: { type: 'string', description: 'which unit owns the file to edit (this unit, or another unit label for a cross-unit finding)' },
        },
      },
    },
    failure_classes: { type: 'array', items: { type: 'string' }, description: 'distinct classes seen, each with the check that catches it' },
  },
}

const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['unit', 'applied', 'refused', 'checker_clean', 'rewatched'],
  properties: {
    unit: { type: 'string' },
    applied: { type: 'array', items: { type: 'string' }, description: 'one line per finding applied: rule_id + what changed' },
    refused: { type: 'array', items: { type: 'string' }, description: 'finding + reason it was not applied' },
    checker_clean: { type: 'boolean' },
    rewatched: { type: 'number', description: 'changed or new verification commands watched red on a plant and green on a twin' },
  },
}

const SWEEP_DEFAULT = 'apple__swift-log, swiftlang__swiftly, hummingbird-project__hummingbird, kean__Nuke, apple__swift-nio'

const UNITS = [
  { label: 'q-core', files: ['rules/swift-quality.md', 'rules/swift-quality/checks/ (every script and data file)'], sources: ['swift-procedures.md', 'swift-gates.md'],
    focus: 'The index: 200-line body cap, non-negotiables list matches N-3 (every ID named there present, each line ends in its ID, text agrees with the owning depth row), routing table has one row per family and resolves each ID family to the right file, gate block commands match SW-GATE-01 exactly, owner defaults Q1-Q8, SW-CORE rows 01..06 and 09..21 present, 07/08 retired. The checks/ scripts: run EVERY script on a plant and a twin and confirm the exit-code contract in its header (k07.sh, never-gate.sh, swiftlint-gate.sh, tsan-check.sh, weaken-check.sh, canary.sh, generated-touch.sh, silence-check.sh, fold-check.sh, and the apple awk/oracle files); run k07.sh and never-gate.sh over 3 real exemplar trees and classify every hit; bash -n and shellcheck (if present) each script; check bash 3.2 portability (no mapfile, no ${x,,}, no associative arrays).' },
  { label: 'q-lang-conc', files: ['rules/swift-quality/language.md', 'rules/swift-quality/concurrency.md'], sources: ['swift-language.md', 'swift-concurrency.md'] },
  { label: 'q-err-api', files: ['rules/swift-quality/errors.md', 'rules/swift-quality/api-design.md'], sources: ['swift-errors.md', 'swift-api.md'] },
  { label: 'q-test-cli', files: ['rules/swift-quality/testing.md', 'rules/swift-quality/cli-contract.md'], sources: ['swift-testing.md', 'swift-cli.md'] },
  { label: 'q-io-net-sec', files: ['rules/swift-quality/io.md', 'rules/swift-quality/network.md', 'rules/swift-quality/security.md'], sources: ['swift-io.md', 'swift-network.md', 'swift-security.md'] },
  { label: 'q-apple', files: ['rules/swift-quality/apple.md'], sources: ['swift-apple.md'], sweep: 'Dimillian__IceCubesApp, element-hq__element-x-ios, pointfreeco__swift-composable-architecture',
    focus: 'Read-only framing (owner Q5): every macOS/Xcode behaviour labelled "unverified: read only"; greps and awk heuristics swept over the two app exemplars with every hit classified.' },
  { label: 'pkg', files: ['rules/swift-package.md', 'rules/swift-package/manifest.md', 'rules/swift-package/gates.md', 'rules/swift-package/release.md'], sources: ['swift-package.md', 'swift-gates.md', 'swift-release.md'],
    focus: 'The 8 globs in N-1 order; SW-PKG-01..38 all defined once across the index and manifest.md; the shipped .swift-format body is valid JSON and swift format accepts it (run swift format lint --strict --configuration on a sample package and on 2 exemplars and count findings by rule); the .swiftlint.yml body parses and the SourceKit image runs it (red on a plant, green on a twin); the gate block runs end to end on one fixture package; release rows checked against the static Linux SDK facts in the consolidation (do not install the SDK unless the consolidation shows it already installed under the swift-tools home).' },
  { label: 'skill-upgrade', files: ['skills/swift-upgrade/ (SKILL.md and references/)'], sources: ['swift-procedures.md', 'swift-concurrency.md', 'swift-package.md', 'swift-language.md'], skill: true,
    focus: 'RUN THE SKILL LITERALLY on a real tree: copy ' + EX + '/pointfreeco__swift-snapshot-testing (Swift 5 mode at tools 6.0) to ' + FIX + '/review-skill-upgrade/snapshot and follow SKILL.md step by step, exactly as written, to move it to Swift 6 language mode on swift 6.4 (and the floor leg it names). Record every step: command, exit code, whether the instruction was executable as written, where you had to improvise (each improvisation is a finding), and the final receipt. If it completes quickly, do a second run on a copy of ' + EX + '/Alamofire__Alamofire (tools 6.4 with .v5). Trigger evals: write 3 should-trigger user utterances and 1 should-not neighbour and judge the description against each.' },
  { label: 'skill-diagnose', files: ['skills/swift-diagnose/ (SKILL.md and references/)'], sources: ['swift-procedures.md', 'swift-concurrency.md', 'swift-errors.md', 'swift-testing.md'], skill: true,
    focus: 'RUN THE SKILL LITERALLY on planted failures in a small executable package under ' + FIX + '/review-skill-diagnose/: (a) a force-unwrap trap on main, (b) a trap on a worker thread while main sleeps (expect exit 0 with "Program crashed:" under the default backtracer, per N-7), (c) a leaked CheckedContinuation hang, (d) a DispatchSemaphore deadlock inherited from @MainActor, (e) a data race caught by TSan, (f) an expression that hits "unable to type-check this expression in reasonable time". For each, follow SKILL.md from its entry step as an agent would, record whether the route table sent you to the right reference and whether the prescribed capture and fix steps worked as written. Each improvisation is a finding. Trigger evals as for the other skills.' },
  { label: 'skill-release', files: ['skills/swift-release/ (SKILL.md and references/)'], sources: ['swift-release.md', 'swift-gates.md', 'swift-package.md'], skill: true,
    focus: 'RUN THE SKILL LITERALLY on a real executable: copy ' + EX + '/apple__swift-argument-parser to ' + FIX + '/review-skill-release/ap (it has example executables, e.g. math or repeat) and follow SKILL.md to produce a release build of one executable, with the static Linux SDK if the skill requires it (install it only through the exact command the skill gives; if the download is over 1 GB or fails, record that and continue with the steps that do not need it), checksums, the CycloneDX SBOM, the glibc floor check and the API-breakage step. Record every step with exit codes; each improvisation is a finding. The SKILL.md body must be under 500 lines (it was drafted at 504 total lines; check the body count the checker uses). Trigger evals as for the other skills.' },
  { label: 'bazel', files: ['rules/bazel-quality/swift.md', 'rules/bazel-quality.md (only the Swift edits: git diff -- rules/bazel-quality.md)', 'docs/bazel-quality.md (git diff)', 'publish.toml (only the bazel-quality hunk: git diff -- publish.toml)'], sources: ['swift-bazel.md'], sweep: 'bazelbuild__rules_swift, realm__SwiftLint, tuist__tuist',
    focus: 'Bazel binaries are in the ocx index (the bazel consolidation installed 8.8.0 and 9.2.0 from it; find them under /home/mherwig/.cache/research-lang). Re-run the greps and queries on the three Bazel-carrying exemplars. Check the BZL-HERM-07 carve-out decision and whether hermeticity.md needs a one-clause edit (report as a cross-unit finding owned by "bazel", the fixer may make that one-clause edit).' },
]

function review(u) {
  const sweep = u.sweep || SWEEP_DEFAULT
  return agent(`Model rationale: sonnet at high effort — adversarial content review with real command runs; the user's routing policy puts review and verification on sonnet.

${ENV}

YOUR UNIT: ${u.label}
FILES UNDER REVIEW (read each in full): ${u.files.map(f => ROOT + '/' + f).join(', ')}
EVIDENCE (consolidations; read the sections for the IDs in your files): ${u.sources.map(s => RESEARCH + '/' + s).join(', ')}
${u.focus ? '\nUNIT FOCUS:\n' + u.focus + '\n' : ''}
YOUR JOB: find what is wrong, prove it, and say how to fix it. Do NOT edit any file under ${ROOT}. Default stance: skeptical. Every finding carries evidence a fixer can re-run.
${u.skill ? '' : `1. VERIFICATION HONESTY: for EVERY rule row with a runnable verification cell, build a minimal plant (violation) and twin (compliant) under ${FIX}/review-${u.label}/ and run the cell exactly as written (copy it verbatim; a cell that cannot be run as written is itself a finding). Expected: the cell's stated failure signal on the plant, its stated pass signal on the twin. Record cells_run and cells_red_ok.
2. REAL-TREE SWEEP: run every grep/awk/script cell over these exemplar trees: ${sweep} (read-only operands). Classify a sample of hits per cell (true positive / false positive / noise on idiomatic code); a cell with a high false-positive rate on mature code is a finding (narrow it, or demote to a reading heuristic, or note the expected-noise in the row).`}
${u.skill ? '1. Follow the UNIT FOCUS literally. 2. Then check every command the skill names that you did not already run: run it on a plant or the real tree.' : ''}
3. CONTENT REVIEW per validation.md: notes compliance (N-1..N-14 items that bind your files, especially N-6 drops and rejected claims, N-9 dating, N-10 cell shape), contradiction sweep against sibling IDs your files cite (grep the other files for each cited ID and compare text), single source of truth (a fact owned by another file restated here), era check (every version-specific claim dated), deletion test (a rule a capable model already follows unprompted is a "nit: delete"), portability (no research-host paths, fixture names or run IDs), budget (depth file under 300 lines, index body under 200, SKILL.md body under 500).
4. Run the checker and report any finding in your files.
Group what you found into failure classes by mechanism, each with the check that would catch it.

Return ONLY the structured receipt. Severity: blocker = wrong guidance or a check that cannot go red on a MUST; fix = a real defect a reader would trip on; nit = polish. owner_unit is your unit label unless the file to edit belongs to another unit (labels: ${UNITS.map(x => x.label).join(', ')}).`,
    { label: 'review:' + u.label, phase: 'Review', model: 'sonnet', effort: 'high', schema: FINDINGS_SCHEMA })
}

function fix(u, rv) {
  const mine = (rv.findings || []).filter(f => f.owner_unit === u.label)
  if (!mine.length) return Promise.resolve({ unit: u.label, applied: [], refused: [], checker_clean: true, rewatched: 0 })
  return agent(`Model rationale: sonnet at high effort — applying reviewed fixes to rule text and scripts, re-running each changed check.

${ENV}

YOUR UNIT: ${u.label}
FILES YOU MAY EDIT (and only these): ${u.files.map(f => ROOT + '/' + f).join(', ')}${u.label === 'bazel' ? ', and one clause in ' + ROOT + '/rules/bazel-quality/hermeticity.md if a finding asks for it' : ''}
EVIDENCE: ${u.sources.map(s => RESEARCH + '/' + s).join(', ')}

REVIEW FINDINGS FOR YOUR FILES (${mine.length}):
${JSON.stringify(mine, null, 1)}

Apply every blocker and fix finding, and every nit that is a one-line change. Rules:
- RULE ID STABILITY IS A HARD CONTRACT: never renumber, never reuse an ID, never move a row to another family. A dropped rule leaves a one-line "retired" row only if the owning index cites it; otherwise remove it and grep ${ROOT}/rules ${ROOT}/skills for citations of the ID and report each in refused as a cross-unit follow-up.
- A changed or new verification command must be watched red on a plant and green on a twin under ${FIX}/fix-${u.label}/ before it ships (count it in rewatched). A command you cannot make go red becomes a named reading heuristic.
- Keep budgets (depth file under 300 lines, index body under 200, SKILL.md body under 500; move depth to references/ for skills) and the N-10 cell shape. No research-host paths.
- Refuse a finding only with a reason (wrong evidence, contradicts a binding note, out of scope); put it in refused.
- Run the checker after your edits and fix what it reports in your files.
Return ONLY the structured receipt.`,
    { label: 'fix:' + u.label, phase: 'Fix', model: 'sonnet', effort: 'high', schema: FIX_SCHEMA })
}

phase('Review')
const results = await pipeline(
  UNITS,
  u => review(u),
  (rv, u) => rv ? fix(u, rv).then(fx => ({ unit: u.label, review: rv, fix: fx })) : { unit: u.label, review: null, fix: null },
)

const done = results.filter(Boolean)
const cross = done.flatMap(r => ((r.review && r.review.findings) || []).filter(f => f.owner_unit !== r.unit).map(f => ({ from: r.unit, ...f })))
const refused = done.flatMap(r => ((r.fix && r.fix.refused) || []).map(x => r.unit + ': ' + x))
log('Reviewed ' + done.filter(r => r.review).length + '/' + UNITS.length + ' · findings ' + done.reduce((n, r) => n + ((r.review && r.review.findings.length) || 0), 0) + ' · cross-unit ' + cross.length + ' · refused ' + refused.length)

phase('Consistency')
const consistency = await agent(`Model rationale: sonnet at xhigh effort — cross-set consistency after parallel per-unit fixes; the one place every file is read together.

${ENV}

Every unit has been reviewed and fixed in parallel. Your job is the cross-set pass, and you MAY edit any file of the Swift set (and rules/bazel-quality.md, docs/bazel-quality.md) to fix what you find.

CROSS-UNIT FINDINGS that no per-unit fixer could apply (apply each, or refuse with a reason):
${JSON.stringify(cross, null, 1)}

FIXER REFUSALS AND FOLLOW-UPS (resolve the ones that are cross-unit citation updates):
${JSON.stringify(refused, null, 1)}

Then sweep the whole set:
1. Every rule ID cited anywhere in the set is defined in exactly one table row (the checker reports the mechanical half; also check the cited text still says what the citing line claims).
2. The swift-quality index non-negotiables and routing table agree with the depth files as they now stand; the swift-package index agrees with manifest.md, gates.md, release.md; the skills' | # | Finding | Rule | rows cite IDs whose rule text matches the finding.
3. No fact owned by one file (N-4 table) restated in another.
4. Run the checker; it must be clean. Also run it over rules/bazel-quality.md with --forbid /home/mherwig --forbid .agents/research.
Return a receipt: applied, refused (with reasons), checker_clean, and residual_classes (any failure class still present that a later round should target).`,
  { label: 'consistency', phase: 'Consistency', model: 'sonnet', effort: 'xhigh',
    schema: { type: 'object', additionalProperties: false, required: ['applied', 'refused', 'checker_clean', 'residual_classes'],
      properties: { applied: { type: 'array', items: { type: 'string' } }, refused: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, residual_classes: { type: 'array', items: { type: 'string' } } } } })

const classes = [...new Set(done.flatMap(r => (r.review && r.review.failure_classes) || []))]
return { units: done, cross_count: cross.length, consistency, classes }
