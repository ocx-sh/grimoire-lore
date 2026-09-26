export const meta = {
  name: 'cmake-wave6',
  description: 'CMake research program wave 6 (third convergence test): run every cmake-build verification cell against real repositories in two halves, and a third real-tree round for each skill; an opus applier per topic, then one applier for cross-file handbacks',
  phases: [
    { title: 'Measure', detail: 'sonnet sweeps over real repos, opus skill runs' },
    { title: 'Apply', detail: 'one opus applier per topic, disjoint file sets' },
    { title: 'Handbacks', detail: 'one opus applier for the edits the topic appliers could not make' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const R = ROOT + '/.agents/research'
const SCR = '/home/mherwig/.cache/cmake-measure-scratch/w6'
const CHECK = 'python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research --forbid research-lang/exemplars --forbid find_ocx --forbid ocx.sh/ --forbid ocx.lock'
const PRIOR = 'ALREADY TRIED, do not reuse (read the ledgers): ' + R + '/cmake-skills/wave4-real-tree.md (Chipmunk2D, cJSON two copies), ' + R + '/cmake-skills/wave5-modernize-real.md (jsoncpp, tinyformat), ' + R + '/cmake-skills/wave5-triage-pm.md (vcpkg and Conan scenarios). libuv and rapidjson are the skill\'s own worked examples.'
const REPOS = 'Pick SIX real open-source repositories with non-trivial CMake builds, spread over shapes: two modern consumable libraries (install(EXPORT), Config package), one application with FetchContent or CPM dependencies, one legacy directory-scoped tree, one project that ships CMake modules for others (a Find module or helper module), and one with CMakePresets.json and CI workflows. Shallow-clone each (git clone --depth 1) into the scratch directory; record URL and commit. You may reuse clones already under /home/mherwig/.cache/research-lang/exemplars/cmake (blob-less sparse clones: check the files you need are present).'

function sweep(key, files, label) {
  return {
    key,
    measureModel: 'sonnet',
    ledger: R + '/cmake-audit/wave6-sweep-' + key + '.md',
    owns: files.map(f => ROOT + '/rules/' + f),
    checkTarget: 'rules/cmake-build.md',
    measure: `Model rationale: sonnet — running existing verification cells against real repositories and recording what they print; rule decisions are the applier's.

${COMMON}

YOUR TASK: the cmake-build verification cells were proven on planted fixtures and the exemplar corpus counts, never run as written against whole real repositories the way an agent will run them. Sweep ${label}.
- Read in full: ${files.map(f => ROOT + '/rules/' + f).join(', ')}.
- ${REPOS} Scratch: ${SCR}/sweep-${key}/.
- Run every Verification cell of every row in your files, exactly as written, from each repository's root (configure-based cells on 4.4 unless the cell names a line; skip a cell only when it needs a platform this host lacks, and say so). Record per row and repository: hit or no hit, and for each hit whether it is a true finding or a false positive, and for a clean result whether it is a true pass or a miss (read the repository's files to decide, citing path:line). A false positive, a miss, a command that errors, or an empty-output clause that lies is the most valuable thing you can find. Also note any cell that takes over a minute on a large tree.
- List candidate new failure modes and candidate new MUST rows, each with its reproduction.

Write the ledger to ${R}/cmake-audit/wave6-sweep-${key}.md: frontmatter (title, date, repositories and commits, CMake version), a row-by-repository results table, then "False positives, misses and errors" (file:line, the command, the repository, what it printed, the proposed replacement text, and the re-run showing the replacement fixes it without losing the true hits), then "Candidate new failure modes" and "Candidate new MUST rows". Return the ledger path, the false-positive, miss and error counts, and the candidate lists.`,
  }
}

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You work in wave 6 of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The rule set is already drafted and reviewed: rules/cmake-build.md with rules/cmake-build/*.md, rules/cpp-packaging.md with rules/cpp-packaging/*.md, skills/cmake-dependency-triage/ and skills/cmake-modernize/. Wave 6 is the third convergence test (wave 5 added two MUST rows and fourteen failure modes, all from real trees; the cmake-build verification cells have never been run against real repositories): the program stops when a wave adds no new MUST rule and no new failure mode, so report honestly in both directions. A confirmation is a result. Do not invent findings to look busy.
- Binding decisions live in ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Read section 4 (pinned decisions) and section 7 (verification-command shape) before you judge anything.
- CMake binaries: 'ocx package exec kitware/cmake:<tag> -- cmake' from ${ROOT}, where tag is 3.31, 4.0, 4.1, 4.2, 4.3 or 4.4 (these resolve to 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4 and 4.4.2; print cmake --version once per tag and record it). ninja: 'ocx package exec ninja-build/ninja -- ninja'. C compiler: host gcc. There is no g++ on this host: use C-only fixtures, or /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as CMAKE_CXX_COMPILER when C++ is unavoidable.
- All scratch on real disk under the directory named in your task, never /tmp and never the repository. Delete build trees you no longer need; keep the fixtures and a run.sh that reproduces every number you report.
- Every claim you record carries the exact command, the CMake or tool version, the exit code and a short output excerpt. Date is 2026-09-26.`

const TOPICS = [
  sweep('a', ['cmake-build.md', 'cmake-build/versions-and-policies.md', 'cmake-build/language.md', 'cmake-build/module-authoring.md', 'cmake-build/testing.md', 'cmake-build/presets-and-ci.md'], 'half A: the index and the versions, language, module-authoring, testing and presets-and-ci depth files'),
  sweep('b', ['cmake-build/targets.md', 'cmake-build/install-and-export.md', 'cmake-build/dependencies.md', 'cmake-build/toolchains-and-providers.md'], 'half B: the targets, install-and-export, dependencies and toolchains-and-providers depth files'),
  {
    key: 'modernize-real-3',
    measureModel: 'opus',
    ledger: R + '/cmake-skills/wave6-modernize-real.md',
    owns: [ROOT + '/skills/cmake-modernize/SKILL.md', ROOT + '/skills/cmake-modernize/references/inventory.md', ROOT + '/skills/cmake-modernize/references/proofs.md'],
    checkTarget: 'skills/cmake-modernize',
    measure: `Model rationale: opus — an adversarial evaluation of a procedure an agent follows unsupervised; judging whether a step misleads is review work.

${COMMON}

YOUR TASK: a third real-tree round for cmake-modernize, on shapes no round has tried. ${PRIOR}
- Read in full: ${ROOT}/skills/cmake-modernize/ (SKILL.md and references), resolving cited IDs in ${ROOT}/rules/cmake-build/*.md.
- Tree 1: a real project with several libraries and an executable in one build, configure_file-generated headers, and a vendored third_party directory. Tree 2: a real library whose legacy build already has a hand-written install() (no EXPORT) or a hand-written Config or .pc file that consumers use today. Shallow-clone each into ${SCR}/modernize/, record URL and commit.
- Follow the procedure step by step, making its edits, through the round trip and the smoke. Record per step: what the skill told you, what you did, the exit check result, and a verdict: worked, misled, stalled or wrong. For every misled, stalled or wrong step give the exact replacement text for the file and line. List what the trees did that the skill does not anticipate: each is a candidate new failure mode with its reproduction.
- Budget: SKILL.md is 436 lines of a 500-line budget. Prefer fixes that replace text over fixes that add it, and propose moving detail into references/ where a fix needs room.

Write the ledger to ${R}/cmake-skills/wave6-modernize-real.md (frontmatter with trees and commits, a step table per tree, then "Fixes", "Candidate new failure modes", "Candidate new MUST rows"). Scratch: ${SCR}/modernize/ with a run.sh. Return the ledger path, verdict counts per tree, and the candidate lists.`,
  },
  {
    key: 'triage-real-3',
    measureModel: 'opus',
    ledger: R + '/cmake-skills/wave6-triage-real.md',
    owns: [ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md'],
    checkTarget: 'skills/cmake-dependency-triage',
    measure: `Model rationale: opus — an adversarial evaluation of a triage procedure an agent follows unsupervised.

${COMMON}

YOUR TASK: a third real round for cmake-dependency-triage, on mechanisms no round has tried. ${PRIOR}
- Read in full: ${ROOT}/skills/cmake-dependency-triage/ (SKILL.md and references), resolving cited IDs in ${ROOT}/rules/cmake-build/*.md and ${ROOT}/rules/cpp-packaging/*.md.
- Scenario A: a library that bundles a copy of its own dependency and can also use an external one (spdlog with its bundled fmt against an installed fmt is the classic, SPDLOG_FMT_EXTERNAL), consumed by a project that also links the external fmt directly, so two fmt copies meet in one link or one binary. Scenario B: a CPM.cmake project where CPM_USE_LOCAL_PACKAGES, CPM_SOURCE_CACHE or a package-lock changes which copy is used. Scenario C: a cross-compile (zig cc -target aarch64-linux-gnu through a toolchain file with CMAKE_SYSROOT) where find_package or find_library resolves a host copy instead of the sysroot one. Build each from real packages so the symptom is real, then play the user: start from the symptom only, run the skill from its first step until it names which copy, which version and which mechanism, and the rule that fixes it. Record per step what the skill told you, what you ran, the output, and a verdict: worked, misled, stalled or wrong. For every misled, stalled or wrong step give the exact replacement text. List candidate new failure modes with reproductions.
- Budget: SKILL.md is 499 lines of a 500-line budget. Every fix that adds text must move an equal amount of existing detail into references/ (name what moves where), or replace text.

Write the ledger to ${R}/cmake-skills/wave6-triage-real.md (frontmatter with packages, versions and tool versions, a step table per scenario, then "Fixes", "Candidate new failure modes", "Candidate new MUST rows"). Scratch: ${SCR}/triage/ with a run.sh. Return the ledger path, verdict counts per scenario, and the candidate lists.`,
  },
]

const APPLY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['topic', 'ledger', 'new_must_rows', 'new_failure_modes', 'rows_changed', 'severity_changes', 'rejected_candidates', 'handbacks', 'checker_clean', 'converged'],
  properties: {
    topic: { type: 'string' },
    ledger: { type: 'string' },
    new_must_rows: { type: 'array', items: { type: 'string' }, description: 'ID and one line, for each MUST row you added; empty when none' },
    new_failure_modes: { type: 'array', items: { type: 'string' }, description: 'file and one line, for each failure mode you added to a shipped file' },
    rows_changed: { type: 'array', items: { type: 'string' }, description: 'ID: what changed, for each existing row whose text or verification you edited' },
    severity_changes: { type: 'array', items: { type: 'string' } },
    rejected_candidates: { type: 'array', items: { type: 'string' }, description: 'candidate: why rejected' },
    handbacks: { type: 'array', items: { type: 'string' }, description: 'path:line: exact edit needed in a file you do not own' },
    checker_clean: { type: 'boolean' },
    converged: { type: 'boolean', description: 'true only when this topic added no new MUST row and no new failure mode' },
  },
}

function apply(t, report) {
  return agent(`Model rationale: opus — deciding whether measured evidence changes an enforced MUST row, adds one, or adds a failure mode is a rule decision.

${COMMON}

YOUR TASK: you are the applier for wave-6 topic ${t.key}. A measurer just wrote the ledger ${t.ledger}. Its return note was:
---
${String(report).slice(0, 6000)}
---
1. Read the ledger in full and spot-check its three most consequential claims by re-running their commands from the scratch run.sh (a claim you cannot reproduce is rejected, with the reason).
2. Decide, per finding: (a) an existing row's text, verification or floor is wrong or incomplete: edit it in place, keeping its ID; (b) a severity is wrong: change it and say why; (c) a genuinely new rule an agent would get wrong without, with evidence: add it with the next free ID in that family (never a reserved ID: CONAN-19, VCPKG-19, VCPKG-20, PKG-05 to PKG-07), MUST only if it passes the MUST bar in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; (d) a new failure mode: add it to the owning file's failure-mode list; (e) a claim that was read-only-grounded and is now measured: replace the read-only wording with the measurement and its date and versions. Reject candidates that are restatements, taste, or unsupported, each with one line of reason.
3. YOUR FILES (the only files you may edit): ${t.owns.join(' ; ')}. An edit needed anywhere else goes in handbacks as path:line plus the exact replacement text. Keep every verification in the section-7 command shape with an explicit empty-output clause, prose free of em dashes and semicolons outside code and tables, and file budgets (index 200 lines, depth file 300, SKILL.md 500).
4. Append a section "## Wave 6 applied (2026-09-26)" to the ledger listing what you changed, added and rejected.
5. Run: ${CHECK} ${t.checkTarget}  and fix anything it reports in your files. If you edited a cmake fence, run 'uvx gersemi==0.29.1 --check' on a copy of it.
Return the structured result. converged is true only when you added no new MUST row and no new failure mode.`,
    { label: 'apply:' + t.key, phase: 'Apply', model: 'opus', effort: 'high', schema: APPLY_SCHEMA })
}

function measure(t) {
  return agent(t.measure, { label: 'measure:' + t.key, phase: 'Measure', model: t.measureModel, effort: 'high' })
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

const topics = await pipeline(TOPICS, t => measure(t), (report, t) => apply(t, report))
const ok = topics.filter(Boolean)
const pending = ok.flatMap(r => r.handbacks.map(h => ({ from: r.topic, ledger: r.ledger, edit: h })))
if (pending.length) {
  const owns = [ROOT + '/rules/cmake-build.md', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/module-authoring.md', ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/toolchains-and-providers.md', ROOT + '/rules/cmake-build/testing.md', ROOT + '/rules/cmake-build/presets-and-ci.md', ROOT + '/rules/cmake-build/bazel-seam.md', ROOT + '/rules/cpp-packaging.md', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md', ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md', ROOT + '/skills/cmake-modernize/SKILL.md', ROOT + '/skills/cmake-modernize/references/inventory.md', ROOT + '/skills/cmake-modernize/references/proofs.md']
  // ponytail: whole list inline, no slice; wave 5 lost handbacks to a 20k cut
  const hb = await handbackApplier('wave6', 'There are ' + pending.length + ' of them, as JSON (apply every one): ' + JSON.stringify(pending), owns)
  if (hb) ok.push(hb)
}
const nm = ok.reduce((n, r) => n + r.new_must_rows.length, 0)
const nf = ok.reduce((n, r) => n + r.new_failure_modes.length, 0)
log('Wave 6: ' + ok.length + ' results · new MUST ' + nm + ' · new failure modes ' + nf + ' · rows changed ' + ok.reduce((n, r) => n + r.rows_changed.length, 0) + ' · handbacks ' + pending.length)
return { results: ok, new_must: nm, new_failure_modes: nf }
