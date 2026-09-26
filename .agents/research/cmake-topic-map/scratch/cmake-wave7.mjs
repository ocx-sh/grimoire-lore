export const meta = {
  name: 'cmake-wave7',
  description: 'CMake research program wave 7 (class convergence): group each skill failure modes into recurring classes and compact the skill under budget, then a held-out test on fresh trees and fresh repositories classified against those classes; opus appliers add only new classes and real defects',
  phases: [
    { title: 'Generalize', detail: 'one opus agent per skill: classes, class-level checks, budget' },
    { title: 'Holdout', detail: 'fresh trees and repositories, classified against the classes' },
    { title: 'Apply', detail: 'one opus applier per holdout topic' },
    { title: 'Handbacks', detail: 'cross-file edits' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const R = ROOT + '/.agents/research'
const SCR = '/home/mherwig/.cache/cmake-measure-scratch/w7'
const CHECK = 'python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research --forbid research-lang/exemplars --forbid find_ocx --forbid ocx.sh/ --forbid ocx.lock'
const USED = 'Trees and scenarios already used, never reuse: libuv, rapidjson, slembcke/Chipmunk2D, open-source-parsers/jsoncpp, c42f/tinyformat, uclouvain/openjpeg, madler/zlib, cJSON two copies, vcpkg baseline and toolchain-after-first-configure, Conan graph and cmake-conan fallback, spdlog bundled fmt, CPM lock and local packages, zig aarch64 sysroot. The ledgers are ' + R + '/cmake-skills/wave4-real-tree.md, wave5-modernize-real.md, wave5-triage-pm.md, wave6-modernize-real.md, wave6-triage-real.md.'

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You work in wave 7 of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The rule set is already drafted and reviewed: rules/cmake-build.md with rules/cmake-build/*.md, rules/cpp-packaging.md with rules/cpp-packaging/*.md, skills/cmake-dependency-triage/ and skills/cmake-modernize/. Wave 7 changes the convergence test. Waves 4 to 6 added 10, 14 and 17 failure modes from real trees, most of them instances of a few recurring mechanisms, so a count of new failure modes never reaches zero. Wave 7 groups failure modes into classes, makes the skills check classes rather than instances, then runs a held-out test: the program has converged when fresh trees produce no new class and no new MUST row: the program stops when a wave adds no new MUST rule and no new failure mode, so report honestly in both directions. A confirmation is a result. Do not invent findings to look busy.
- Binding decisions live in ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Read section 4 (pinned decisions) and section 7 (verification-command shape) before you judge anything.
- CMake binaries: 'ocx package exec kitware/cmake:<tag> -- cmake' from ${ROOT}, where tag is 3.31, 4.0, 4.1, 4.2, 4.3 or 4.4 (these resolve to 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4 and 4.4.2; print cmake --version once per tag and record it). ninja: 'ocx package exec ninja-build/ninja -- ninja'. C compiler: host gcc. There is no g++ on this host: use C-only fixtures, or /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as CMAKE_CXX_COMPILER when C++ is unavoidable.
- All scratch on real disk under the directory named in your task, never /tmp and never the repository. Delete build trees you no longer need; keep the fixtures and a run.sh that reproduces every number you report.
- Every claim you record carries the exact command, the CMake or tool version, the exit code and a short output excerpt. Date is 2026-09-26.`

const SKILLS = [
  { key: 'modernize', dir: ROOT + '/skills/cmake-modernize', files: ['SKILL.md', 'references/inventory.md', 'references/proofs.md'] },
  { key: 'triage', dir: ROOT + '/skills/cmake-dependency-triage', files: ['SKILL.md', 'references/reading-the-answers.md'] },
]

const GEN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['skill', 'classes_file', 'class_count', 'instances_mapped', 'unmapped', 'lines_after', 'checker_clean'],
  properties: {
    skill: { type: 'string' }, classes_file: { type: 'string' }, class_count: { type: 'number' },
    instances_mapped: { type: 'number' }, unmapped: { type: 'array', items: { type: 'string' } },
    lines_after: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' },
  },
}

function generalize(sk) {
  return agent(`Model rationale: opus — restructuring an unsupervised procedure around failure classes without losing any measured check is a design decision on shipped text.

${COMMON}

YOUR TASK: generalize and compact the ${sk.key} skill at ${sk.dir}.
1. Read in full every file of the skill and every wave ledger that fed it: ${USED}
2. Group every failure mode the skill lists (and every misled, stalled or wrong step the ledgers record) into CLASSES. A class is one mechanism stated generally enough that it would recur on a tree nobody has tried, with the check that catches it. Example shape: "a proof that exercises one consumer kind passes a package another consumer kind cannot use" is a class; "Chipmunk2D's sincos" is an instance of it. Aim for the fewest classes that still separate different checks. Write ${R}/cmake-skills/fm-classes-${sk.key}.md: frontmatter (title, date 2026-09-26), one section per class (C1, C2, ...) with the general statement, the check in the skill that catches it, and every instance mapped to it with its ledger; then a table mapping every existing failure-mode number to exactly one class.
3. Rewrite the skill so its failure-mode section lists the classes, one short entry each, and its procedure checks classes rather than instances wherever an instance-specific check exists today. Move per-instance detail and worked evidence into a new ${sk.dir}/references/failure-modes.md (one level deep, linked from SKILL.md). Keep every rule ID citation, every MUST table row, every command that a ledger measured, and every exit check. Nothing measured may be deleted: move it, do not drop it.
4. Budgets: SKILL.md at most 450 lines, each reference file at most 300 lines. Prose without em dashes or semicolons outside code and tables. Commands in the section-7 shape with an explicit empty-output clause.
5. Run: ${CHECK} ${sk.dir.replace(ROOT + '/', '')}  and fix what it reports. Re-run two commands you moved, from the ledger scratch, to confirm they still read the same after the move.
YOUR FILES: everything under ${sk.dir} and ${R}/cmake-skills/fm-classes-${sk.key}.md. Return the structured result.`,
    { label: 'generalize:' + sk.key, phase: 'Generalize', model: 'opus', effort: 'high', schema: GEN_SCHEMA })
}

const HOLD = [
  {
    key: 'modernize', skill: 'modernize', model: 'opus',
    ledger: R + '/cmake-skills/wave7-holdout-modernize.md',
    owns: [ROOT + '/skills/cmake-modernize/SKILL.md', ROOT + '/skills/cmake-modernize/references/inventory.md', ROOT + '/skills/cmake-modernize/references/proofs.md', ROOT + '/skills/cmake-modernize/references/failure-modes.md'],
    checkTarget: 'skills/cmake-modernize',
    brief: `Run cmake-modernize literally on TWO fresh real trees of shapes the program has not tried (for example a library that builds as both shared and static from one target list with a generated export header, and a project that installs CMake modules alongside its library). Shallow-clone into ${SCR}/holdout-modernize/.`,
  },
  {
    key: 'triage', skill: 'triage', model: 'opus',
    ledger: R + '/cmake-skills/wave7-holdout-triage.md',
    owns: [ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md', ROOT + '/skills/cmake-dependency-triage/references/failure-modes.md'],
    checkTarget: 'skills/cmake-dependency-triage',
    brief: `Run cmake-dependency-triage literally on TWO fresh real scenarios of mechanisms the program has not tried (for example a package with COMPONENTS found partly from two prefixes, and a pkg-config IMPORTED_TARGET copy competing with a Config-package copy, or an ExternalProject superbuild whose inner configure sees a different prefix). Build them from real packages under ${SCR}/holdout-triage/ so the symptom is real, start from the symptom only.`,
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

const RULES_HOLD = {
  key: 'rules', ledger: R + '/cmake-audit/wave7-holdout-rules.md',
  owns: [ROOT + '/rules/cmake-build.md', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/module-authoring.md', ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/toolchains-and-providers.md', ROOT + '/rules/cmake-build/testing.md', ROOT + '/rules/cmake-build/presets-and-ci.md', ROOT + '/rules/cmake-build/bazel-seam.md', ROOT + '/rules/cpp-packaging.md', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md'],
  checkTarget: 'rules/cmake-build.md rules/cpp-packaging.md',
}

function rulesHoldout() {
  return agent(`Model rationale: sonnet — running existing MUST verification cells on fresh repositories and recording false positives and misses; rule decisions are the applier's.

${COMMON}

YOUR TASK: the held-out test for the two rules. Wave 6 swept every cmake-build cell over six repositories (ledgers ${R}/cmake-audit/wave6-sweep-a.md and wave6-sweep-b.md; read their repository lists and do not reuse any of them, nor the wave-5 manifests in ${R}/cmake-package-managers/wave5-real-manifests.md).
- Pick FOUR fresh real repositories: two libraries others consume, one application that pulls dependencies through a package manager (Conan or vcpkg manifest), and one large multi-directory project. Shallow-clone into ${SCR}/holdout-rules/, record URLs and commits.
- Run the Verification cell of every MUST row in ${ROOT}/rules/cmake-build.md, ${ROOT}/rules/cmake-build/*.md, ${ROOT}/rules/cpp-packaging.md and ${ROOT}/rules/cpp-packaging/*.md (a row whose Severity cell starts with MUST), exactly as written, against each repository it applies to. Record per row and repository: hit or no hit, true finding or false positive, true pass or miss (read the files to decide, citing path:line), and any command that errors.
- Candidate new MUST rows only with a reproduction and a named harm that no existing row covers.
Write ${R}/cmake-audit/wave7-holdout-rules.md: frontmatter, a results table, "False positives, misses and errors" (row, command, repository, output, proposed replacement text, the re-run showing it fixes without losing true hits), "Candidate new MUST rows". Scratch ${SCR}/holdout-rules/ with a run.sh. Return the ledger path and the false-positive, miss and error counts.`,
    { label: 'holdout:rules', phase: 'Holdout', model: 'sonnet', effort: 'high' })
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
3. YOUR FILES: ${t.owns.join(' ; ')}${t.key === 'rules' ? '' : ' ; and ' + R + '/cmake-skills/fm-classes-' + t.key + '.md'}. Anything else is a handback: path:line plus exact replacement text. Budgets: SKILL.md 450 lines, reference 300, rule index 200, depth file 300. Section-7 command shape, empty-output clauses, no em dashes or semicolons in prose.
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

const [skillResults, rulesResult] = await Promise.all([
  parallel(HOLD.map(h => async () => {
    const gen = await generalize(SKILLS.find(s => s.key === h.skill))
    const report = await holdout(h, gen)
    const applied = await apply(h, report)
    return { gen, applied }
  })),
  (async () => apply(RULES_HOLD, await rulesHoldout()))(),
])
const ok = [...skillResults.filter(Boolean).map(r => r.applied), rulesResult].filter(Boolean)
const pending = ok.flatMap(r => r.handbacks.map(h => ({ from: r.topic, ledger: r.ledger, edit: h })))
if (pending.length) {
  const owns = RULES_HOLD.owns.concat(HOLD.flatMap(h => h.owns))
  const hbr = await handbackApplier('wave7', 'There are ' + pending.length + ' of them, as JSON (apply every one): ' + JSON.stringify(pending), owns)
  if (hbr) ok.push(hbr)
}
const count = k => ok.reduce((n, r) => n + (r[k] ? r[k].length : 0), 0)
log('Wave 7: classes ' + skillResults.filter(Boolean).map(r => r.gen ? r.gen.skill + '=' + r.gen.class_count : '?').join(',') + ' · new classes ' + count('new_classes') + ' · new MUST ' + count('new_must_rows') + ' · new rule FMs ' + count('new_failure_modes') + ' · handbacks ' + pending.length)
return { generalized: skillResults.filter(Boolean).map(r => r.gen), results: ok }
