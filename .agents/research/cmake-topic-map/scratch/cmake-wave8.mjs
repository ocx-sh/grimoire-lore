export const meta = {
  name: 'cmake-wave8',
  description: 'CMake research program wave 8 (class-convergence re-test): a held-out cmake-dependency-triage run on two fresh mechanisms classified against its eight classes, and a real-repository check of the rows wave 7 added or changed; opus appliers',
  phases: [
    { title: 'Holdout', detail: 'fresh triage scenarios and fresh repositories' },
    { title: 'Apply', detail: 'one opus applier per holdout topic' },
    { title: 'Handbacks', detail: 'cross-file edits' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const R = ROOT + '/.agents/research'
const SCR = '/home/mherwig/.cache/cmake-measure-scratch/w8'
const CHECK = 'python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research --forbid research-lang/exemplars --forbid find_ocx --forbid ocx.sh/ --forbid ocx.lock'
const USED = 'Scenarios already used, never reuse: cJSON two copies, vcpkg baseline and toolchain-after-first-configure, Conan graph and cmake-conan fallback, spdlog bundled fmt, CPM lock and local packages, zig aarch64 sysroot, zstd pkg-config copy beside a Config copy, json-c ExternalProject superbuild. The ledgers are ' + R + '/cmake-skills/wave4-real-tree.md, wave5-triage-pm.md, wave6-triage-real.md and wave7-holdout-triage.md.'

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You work in wave 8 of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The rule set is already drafted and reviewed: rules/cmake-build.md with rules/cmake-build/*.md, rules/cpp-packaging.md with rules/cpp-packaging/*.md, skills/cmake-dependency-triage/ and skills/cmake-modernize/. Wave 8 is the class-convergence re-test. In wave 7 the rules and cmake-modernize met the stop condition on held-out trees (no new class, no new MUST row) and cmake-dependency-triage found one new class (C8) and one new MUST row (CMK-DEP-34). Waves 4 to 6 added 10, 14 and 17 failure modes from real trees, most of them instances of a few recurring mechanisms, so a count of new failure modes never reaches zero. Wave 7 groups failure modes into classes, makes the skills check classes rather than instances, then runs a held-out test: the program has converged when fresh trees produce no new class and no new MUST row: the program stops when a wave adds no new MUST rule and no new failure mode, so report honestly in both directions. A confirmation is a result. Do not invent findings to look busy.
- Binding decisions live in ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Read section 4 (pinned decisions) and section 7 (verification-command shape) before you judge anything.
- CMake binaries: 'ocx package exec kitware/cmake:<tag> -- cmake' from ${ROOT}, where tag is 3.31, 4.0, 4.1, 4.2, 4.3 or 4.4 (these resolve to 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4 and 4.4.2; print cmake --version once per tag and record it). ninja: 'ocx package exec ninja-build/ninja -- ninja'. C compiler: host gcc. There is no g++ on this host: use C-only fixtures, or /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as CMAKE_CXX_COMPILER when C++ is unavoidable.
- All scratch on real disk under the directory named in your task, never /tmp and never the repository. Delete build trees you no longer need; keep the fixtures and a run.sh that reproduces every number you report.
- Every claim you record carries the exact command, the CMake or tool version, the exit code and a short output excerpt. Date is 2026-09-26.`

const HOLD = [
  {
    key: 'triage', skill: 'triage', model: 'opus',
    ledger: R + '/cmake-skills/wave8-holdout-triage.md',
    owns: [ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md', ROOT + '/skills/cmake-dependency-triage/references/failure-modes.md'],
    checkTarget: 'skills/cmake-dependency-triage',
    brief: `Run cmake-dependency-triage literally on TWO fresh real scenarios of mechanisms no round has tried. Candidates: a package with COMPONENTS where the components resolve from two prefixes (Boost or a smaller multi-component package), a Find module that finds a header from one prefix and the library from another (the classic ZLIB or PNG split, with CMAKE_PREFIX_PATH and a system copy), an imported target whose IMPORTED_LOCATION_<CONFIG> is chosen by CMAKE_MAP_IMPORTED_CONFIG or a Debug-only package on a Release build, or a Hunter-managed dependency. Build them from real packages under ${SCR}/holdout-triage/ so the symptom is real, start from the symptom only.`,
  },
]

function holdout(h, gen) {
  return agent(`Model rationale: opus — a held-out adversarial evaluation that decides whether the program has converged; classifying a failure against a class list is judgement.

${COMMON}

YOUR TASK: the held-out test for the ${h.skill} skill. ${USED}
- The skill was just generalized. Read in full: every file under ${h.owns[0].replace('/SKILL.md', '')}, and the class list ${R}/cmake-skills/fm-classes-${h.skill}.md (the generalizer reported: ${JSON.stringify(gen || {}).slice(0, 1500)}). Resolve cited IDs in ${ROOT}/rules/cmake-build/*.md and ${ROOT}/rules/cpp-packaging/*.md.
- ${h.brief} Record URLs and commits.
- Follow the skill step by step. For every problem you hit, classify it: (i) an instance of class Cn that the skill's class-level check caught (the skill worked), (ii) an instance of class Cn the check did not catch (a check defect: give the exact fix), (iii) a NEW CLASS no Cn covers (state it generally, with its reproduction and the check that would catch it), or (iv) a plain text defect (misled or stalled wording: give the exact fix). Be strict about (iii): a new tree-specific detail of a known mechanism is (i) or (ii), not a new class.
Write the ledger to ${h.ledger}: frontmatter (title, date, trees and commits), a step table per tree, a classification table (problem, category i to iv, class, evidence), then "Fixes" and "New classes" (either may be empty). Scratch under ${SCR}/ with a run.sh. Return the ledger path, the counts per category, and the new classes.`,
    { label: 'holdout:' + h.key, phase: 'Holdout', model: h.model, effort: 'high' })
}

function rulesCheck() {
  return agent(`Model rationale: sonnet — running a handful of verification cells on real repositories and recording false positives and misses; rule decisions are the applier's.

${COMMON}

YOUR TASK: wave 7 added or changed these rows, each proven only on the tree that motivated it: CMK-DEP-34 and CMK-DEP-33 in ${ROOT}/rules/cmake-build/dependencies.md, CMK-TGT-05 and the two per-language guard_scan lines of the gate in ${ROOT}/rules/cmake-build/targets.md, CMK-INST-01, CMK-INST-04, CMK-INST-19 and CMK-INST-24 in ${ROOT}/rules/cmake-build/install-and-export.md, CMK-TC-08 and CMK-TC-11 in ${ROOT}/rules/cmake-build/toolchains-and-providers.md. Read each row in full.
- Pick FOUR fresh real repositories not named in any ledger under ${R}/cmake-audit/ or ${R}/cmake-skills/: two superbuilds that use ExternalProject_Add with forwarded search paths (for DEP-34), one C library that sets CMAKE_C_STANDARD (for TGT-05), and one library with a hand-written install and a version file (for INST-04 and INST-24). Shallow-clone into ${SCR}/rules-check/, record URLs and commits.
- Run each row's Verification cell exactly as written against each repository it applies to. Record hit or no hit, true finding or false positive, true pass or miss (read the files, cite path:line), and any command error.
Write ${R}/cmake-audit/wave8-rules-check.md: frontmatter, a results table, "False positives, misses and errors" (row, command, repository, output, proposed replacement text, and a re-run showing it fixes without losing true hits), "Candidate new MUST rows" (only with a reproduction and a harm no row covers). Scratch ${SCR}/rules-check/ with a run.sh. Return the ledger path and the false-positive, miss and error counts.`,
    { label: 'holdout:rules', phase: 'Holdout', model: 'sonnet', effort: 'high' })
}

const RULES_HOLD = {
  key: 'rules', ledger: R + '/cmake-audit/wave8-rules-check.md',
  owns: [ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/toolchains-and-providers.md'],
  checkTarget: 'rules/cmake-build.md',
}

const APPLY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['topic', 'ledger', 'new_classes', 'new_must_rows', 'new_failure_modes', 'rows_changed', 'severity_changes', 'rejected_candidates', 'handbacks', 'checker_clean', 'converged'],
  properties: {
    topic: { type: 'string' }, ledger: { type: 'string' },
    new_classes: { type: 'array', items: { type: 'string' }, description: 'each genuinely new failure class you added; empty when the holdout found none' },
    new_must_rows: { type: 'array', items: { type: 'string' } },
    new_failure_modes: { type: 'array', items: { type: 'string' }, description: 'rules only: a failure mode added to a rule depth file' },
    rows_changed: { type: 'array', items: { type: 'string' } },
    severity_changes: { type: 'array', items: { type: 'string' } },
    rejected_candidates: { type: 'array', items: { type: 'string' } },
    handbacks: { type: 'array', items: { type: 'string' } },
    checker_clean: { type: 'boolean' },
    converged: { type: 'boolean', description: 'true only when you added no new class, no new MUST row and no new rule failure mode' },
  },
}

function apply(t, report) {
  return agent(`Model rationale: opus — deciding whether held-out evidence is a new failure class, a check defect or a new MUST row is a rule decision.

${COMMON}

YOUR TASK: you are the wave-7 applier for holdout topic ${t.key}. The ledger is ${t.ledger}. The holdout agent returned:
---
${String(report).slice(0, 8000)}
---
1. Read the ledger in full. Re-run the commands behind its three most consequential claims from the scratch run.sh. A claim you cannot reproduce is rejected.
2. Apply: category (ii) check defects and (iv) text defects as exact edits. Category (iii) new classes only after checking the class list for ${t.key === 'rules' ? 'the rule depth files failure-mode lists' : R + '/cmake-skills/fm-classes-' + t.key + '.md'} yourself: a class that is really an instance of an existing one is added as an instance, not a class. A new MUST row only with a reproduction and a harm no row covers, passing the MUST bar in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md, next free ID in its family, never a reserved ID (CONAN-19, VCPKG-19, VCPKG-20, PKG-05 to PKG-07).
3. YOUR FILES: ${t.owns.join(' ; ')}${t.key === 'rules' ? '' : ' ; and ' + R + '/cmake-skills/fm-classes-' + t.key + '.md'}. Anything else is a handback: path:line plus exact replacement text. Budgets: SKILL.md 470 lines, reference 300, rule index 200, depth file 300. Section-7 command shape, empty-output clauses, no em dashes or semicolons in prose.
4. Append "## Wave 7 applied (2026-09-26)" to the ledger. Run: ${CHECK} ${t.checkTarget}  and fix what it reports in your files.
Return the structured result. converged is true only when you added no new class, no new MUST row and no new rule failure mode.`,
    { label: 'apply:' + t.key, phase: 'Apply', model: 'opus', effort: 'high', schema: APPLY_SCHEMA })
}

function handbackApplier(label, source, owns) {
  return agent(`Model rationale: opus — each handback edits an enforced rule row from another agent's measurement; applying it is a rule decision.

${COMMON}

YOUR TASK: apply handbacks: exact edits other appliers needed in files they did not own. ${source}
YOUR FILES (the only files you may edit): ${owns.join(' ; ')}.
For each handback: read the row it targets and the evidence it cites (the ledger named with it, and the scratch run.sh the ledger names), re-run the one command that carries its measurement, and apply the edit if it reproduces and does not contradict ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Adjust wording to fit the row (no em dashes or semicolons in prose, verification in the section-7 command shape with an empty-output clause, file budgets: depth file 300 lines), keep every ID, and never change a severity unless the handback asks and the evidence supports it. Reject a handback that does not reproduce, with the reason. Append what you applied and rejected to the ledger the handback came from, under "## Handbacks applied (2026-09-26)". Then run: ${CHECK} rules/cmake-build.md rules/cpp-packaging.md  and fix anything it reports in your files.
Return the structured result: topic = ${label}, ledger = the ledgers you appended to, new_must_rows and new_failure_modes empty unless a handback added one, rows_changed per applied handback, rejected_candidates per rejected handback, handbacks = anything you still could not apply, converged = true when you added no new MUST row and no new failure mode.`,
    { label: 'handbacks:' + label, phase: 'Handbacks', model: 'opus', effort: 'high', schema: APPLY_SCHEMA })
}

const [tri, rules] = await Promise.all([
  (async () => { const h = HOLD[0]; return apply(h, await holdout(h, { note: 'generalized in wave 7, C8 added by the wave-7 applier' })) })(),
  (async () => apply(RULES_HOLD, await rulesCheck()))(),
])
const ok = [tri, rules].filter(Boolean)
const pending = ok.flatMap(r => r.handbacks.map(h => ({ from: r.topic, ledger: r.ledger, edit: h })))
if (pending.length) {
  const owns = RULES_HOLD.owns.concat([ROOT + '/rules/cmake-build.md', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/module-authoring.md', ROOT + '/rules/cmake-build/testing.md', ROOT + '/rules/cmake-build/presets-and-ci.md', ROOT + '/rules/cmake-build/bazel-seam.md', ROOT + '/rules/cpp-packaging.md', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md'], HOLD[0].owns)
  const hbr = await handbackApplier('wave8', 'There are ' + pending.length + ' of them, as JSON (apply every one): ' + JSON.stringify(pending), owns)
  if (hbr) ok.push(hbr)
}
const count = k => ok.reduce((n, r) => n + (r[k] ? r[k].length : 0), 0)
log('Wave 8: new classes ' + count('new_classes') + ' · new MUST ' + count('new_must_rows') + ' · new rule FMs ' + count('new_failure_modes') + ' · handbacks ' + pending.length)
return { results: ok }
