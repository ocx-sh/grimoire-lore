export const meta = {
  name: 'cmake-wave5',
  description: 'CMake research program wave 5 (second convergence test): apply the ten wave-4 rule handbacks, run cmake-modernize on two more real trees, run cmake-dependency-triage through real vcpkg and Conan scenarios, and check cpp-packaging against real manifests; an opus applier per topic, then one applier for the new handbacks',
  phases: [
    { title: 'Measure', detail: 'real-tree runs: opus for the skills, sonnet for the manifests' },
    { title: 'Apply', detail: 'wave-4 handbacks plus one opus applier per topic, disjoint file sets' },
    { title: 'Handbacks', detail: 'one opus applier for the edits the topic appliers could not make' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const R = ROOT + '/.agents/research'
const SCR = '/home/mherwig/.cache/cmake-measure-scratch/w5'
const CHECK = 'python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research --forbid research-lang/exemplars --forbid find_ocx --forbid ocx.sh/ --forbid ocx.lock'
const PRIOR = 'ALREADY FOUND, do not re-report (read the ledger): ' + R + '/cmake-skills/wave4-real-tree.md covers slembcke/Chipmunk2D for modernize and cJSON two-copy scenarios for triage. libuv and rapidjson are the skill\'s own worked examples.'

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You work in wave 5 of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The rule set is already drafted and reviewed: rules/cmake-build.md with rules/cmake-build/*.md, rules/cpp-packaging.md with rules/cpp-packaging/*.md, skills/cmake-dependency-triage/ and skills/cmake-modernize/. Wave 5 is the second convergence test (wave 4 added no MUST row but ten failure modes, eight of them from running the skills on one real tree each): the program stops when a wave adds no new MUST rule and no new failure mode, so report honestly in both directions. A confirmation is a result. Do not invent findings to look busy.
- Binding decisions live in ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Read section 4 (pinned decisions) and section 7 (verification-command shape) before you judge anything.
- CMake binaries: 'ocx package exec kitware/cmake:<tag> -- cmake' from ${ROOT}, where tag is 3.31, 4.0, 4.1, 4.2, 4.3 or 4.4 (these resolve to 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4 and 4.4.2; print cmake --version once per tag and record it). ninja: 'ocx package exec ninja-build/ninja -- ninja'. C compiler: host gcc. There is no g++ on this host: use C-only fixtures, or /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as CMAKE_CXX_COMPILER when C++ is unavoidable.
- All scratch on real disk under the directory named in your task, never /tmp and never the repository. Delete build trees you no longer need; keep the fixtures and a run.sh that reproduces every number you report.
- Every claim you record carries the exact command, the CMake or tool version, the exit code and a short output excerpt. Date is 2026-09-26.`

const TOPICS = [
  {
    key: 'modernize-real-2',
    measureModel: 'opus',
    ledger: R + '/cmake-skills/wave5-modernize-real.md',
    owns: [ROOT + '/skills/cmake-modernize/SKILL.md', ROOT + '/skills/cmake-modernize/references/inventory.md', ROOT + '/skills/cmake-modernize/references/proofs.md'],
    checkTarget: 'skills/cmake-modernize',
    measure: `Model rationale: opus — an adversarial evaluation of a procedure an agent follows unsupervised; judging whether a step misleads is review work.

${COMMON}

YOUR TASK: run cmake-modernize literally, as an agent that loaded it would, on TWO more real trees whose shape differs from every tree already tried. ${PRIOR}
- Read in full: ${ROOT}/skills/cmake-modernize/ (SKILL.md and references), resolving cited rule IDs in ${ROOT}/rules/cmake-build/*.md as you go.
- Tree 1: a real C++ library with a legacy directory-scoped build spread over several subdirectories, with its own tests (C++ through the zig wrapper). Tree 2: a real header-only C or C++ library with a legacy or absent install story. Shallow-clone each (git clone --depth 1) into ${SCR}/modernize/, record URL and commit.
- Follow the procedure step by step, making the edits it prescribes in the clone, through the install-move-consume round trip and the as-subproject smoke. At each step record what the skill told you, what you did, the exit check result, and a verdict: worked, misled, stalled or wrong.
- For every misled, stalled or wrong step, give the exact replacement text for the skill file and line. List anything the trees did that the skill does not anticipate: each is a candidate new failure mode, with its reproduction.

Write the ledger to ${R}/cmake-skills/wave5-modernize-real.md: frontmatter (title, date 2026-09-26, trees and commits), a step table per tree, then "Fixes", "Candidate new failure modes" and "Candidate new MUST rows" (both may be empty). Scratch: ${SCR}/modernize/ with a run.sh. Return the ledger path, the step verdict counts per tree, and the candidate lists.`,
  },
  {
    key: 'triage-pm',
    measureModel: 'opus',
    ledger: R + '/cmake-skills/wave5-triage-pm.md',
    owns: [ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md'],
    checkTarget: 'skills/cmake-dependency-triage',
    measure: `Model rationale: opus — an adversarial evaluation of a triage procedure an agent follows unsupervised, across two package managers.

${COMMON}

YOUR TASK: cmake-dependency-triage has only been run on plain-CMake scenarios. Run it literally through the two package managers it claims to read. ${PRIOR}
- Read in full: ${ROOT}/skills/cmake-dependency-triage/ (SKILL.md and references), resolving cited IDs in ${ROOT}/rules/cmake-build/*.md and ${ROOT}/rules/cpp-packaging/*.md.
- Provision: Conan through 'uvx conan==2.32.0' (conancenter over the network is allowed; build small packages from source with --build=missing; a scratch CONAN_HOME under ${SCR}/triage-pm/conan-home, never the user's). vcpkg: git clone --depth 1 https://github.com/microsoft/vcpkg into ${SCR}/triage-pm/vcpkg and run its bootstrap-vcpkg.sh -disableMetrics; use a manifest project, small ports only (zlib, fmt, cjson). Record the Conan version, the vcpkg-tool version and the registry commit.
- Scenario A (vcpkg): a manifest project where the configure silently resolves a dependency from somewhere other than the vcpkg installed tree, for example a host copy on CMAKE_PREFIX_PATH or a FetchContent declare, or a baseline or override that yields a version the author did not expect. Scenario B (Conan): a CMakeDeps or cmake-conan provider project where the consumer gets a different copy or version than conan graph info reports, or where the provider never supplies the package. Build each so the symptom is real, then play the user: start from the symptom only and run the skill from its first step until it names which copy, which version and which mechanism, and the rule that fixes it. Record each step: what the skill told you, what you ran, the output, and a verdict: worked, misled, stalled or wrong.
- For every misled, stalled or wrong step, give the exact replacement text for the skill file and line. List anything the scenarios did that the skill does not anticipate: each is a candidate new failure mode, with its reproduction.

Write the ledger to ${R}/cmake-skills/wave5-triage-pm.md: frontmatter (title, date, tool versions), a step table per scenario, then "Fixes", "Candidate new failure modes" and "Candidate new MUST rows". Scratch: ${SCR}/triage-pm/ with a run.sh. Return the ledger path, the step verdict counts per scenario, and the candidate lists.`,
  },
  {
    key: 'packaging-real',
    measureModel: 'sonnet',
    ledger: R + '/cmake-package-managers/wave5-real-manifests.md',
    owns: [ROOT + '/rules/cpp-packaging.md', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md'],
    checkTarget: 'rules/cpp-packaging.md',
    measure: `Model rationale: sonnet — running existing verification cells against real repositories and recording what they print; rule decisions are the applier's.

${COMMON}

YOUR TASK: the cpp-packaging rules were verified on planted fixtures only. Run them against real projects.
- Read in full: ${ROOT}/rules/cpp-packaging.md, ${ROOT}/rules/cpp-packaging/conan.md, ${ROOT}/rules/cpp-packaging/vcpkg.md.
- Pick six real open-source projects that ship package-manager files: three with a conanfile.py or conanfile.txt used to CONSUME dependencies (not a conan-center-index recipe), two with a vcpkg.json manifest (one with vcpkg-configuration.json or a baseline), and one conan-center-index recipe plus one vcpkg port from the official registry. Shallow-clone each into ${SCR}/packaging-real/ (for the two registries, a sparse checkout of the one recipe and one port). Record URL and commit.
- Run every Verification cell of every row in the three files, exactly as written, against each project it applies to. Record per row and project: hit or no hit, and whether a hit is a true finding or a false positive, and whether a clean result is a true pass or a miss (read the file to decide). A false positive or a miss on a real project is the most valuable thing you can find.
- For two of the consumer projects (one Conan through uvx conan==2.32.0 with a scratch CONAN_HOME under ${SCR}/packaging-real/conan-home, one vcpkg through a --depth 1 clone of microsoft/vcpkg bootstrapped with -disableMetrics), run the install and the CMake configure the rules prescribe, on 4.4, and record whether the rules' MUST rows describe what actually happens.
- List candidate new failure modes and candidate new MUST rows, each with its reproduction.

Write the ledger to ${R}/cmake-package-managers/wave5-real-manifests.md: frontmatter (title, date, projects and commits, tool versions), a row-by-project results table, then "False positives and misses" (file:line, the command, the project, what it printed, proposed replacement text), then "Candidate new failure modes" and "Candidate new MUST rows". Scratch: ${SCR}/packaging-real/ with a run.sh. Return the ledger path, the false-positive and miss counts, and the candidate lists.`,
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

YOUR TASK: you are the applier for wave-5 topic ${t.key}. A measurer just wrote the ledger ${t.ledger}. Its return note was:
---
${String(report).slice(0, 6000)}
---
1. Read the ledger in full and spot-check its three most consequential claims by re-running their commands from the scratch run.sh (a claim you cannot reproduce is rejected, with the reason).
2. Decide, per finding: (a) an existing row's text, verification or floor is wrong or incomplete: edit it in place, keeping its ID; (b) a severity is wrong: change it and say why; (c) a genuinely new rule an agent would get wrong without, with evidence: add it with the next free ID in that family (never a reserved ID: CONAN-19, VCPKG-19, VCPKG-20, PKG-05 to PKG-07), MUST only if it passes the MUST bar in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; (d) a new failure mode: add it to the owning file's failure-mode list; (e) a claim that was read-only-grounded and is now measured: replace the read-only wording with the measurement and its date and versions. Reject candidates that are restatements, taste, or unsupported, each with one line of reason.
3. YOUR FILES (the only files you may edit): ${t.owns.join(' ; ')}. An edit needed anywhere else goes in handbacks as path:line plus the exact replacement text. Keep every verification in the section-7 command shape with an explicit empty-output clause, prose free of em dashes and semicolons outside code and tables, and file budgets (index 200 lines, depth file 300, SKILL.md 500).
4. Append a section "## Wave 5 applied (2026-09-26)" to the ledger listing what you changed, added and rejected.
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
    { label: 'handbacks:' + label, phase: label === 'wave4' ? 'Apply' : 'Handbacks', model: 'opus', effort: 'high', schema: APPLY_SCHEMA })
}

const W4_OWNS = [ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/testing.md']
const [w4, topics] = await Promise.all([
  handbackApplier('wave4', 'They are listed in ' + R + '/cmake-topic-map/scratch/wave4-handbacks.json (read it in full; each entry names its ledger and the exact edit, and the measurements live in /home/mherwig/.cache/cmake-measure-scratch/w4/skills-real/).', W4_OWNS),
  pipeline(TOPICS, t => measure(t), (report, t) => apply(t, report)),
])
const ok = [w4, ...topics].filter(Boolean)
const pending = topics.filter(Boolean).flatMap(r => r.handbacks.map(h => ({ from: r.topic, ledger: r.ledger, edit: h })))
let hb = null
if (pending.length) {
  const owns = [ROOT + '/rules/cmake-build.md', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/module-authoring.md', ROOT + '/rules/cmake-build/targets.md', ROOT + '/rules/cmake-build/install-and-export.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/toolchains-and-providers.md', ROOT + '/rules/cmake-build/testing.md', ROOT + '/rules/cmake-build/presets-and-ci.md', ROOT + '/rules/cmake-build/bazel-seam.md', ROOT + '/rules/cpp-packaging.md', ROOT + '/rules/cpp-packaging/conan.md', ROOT + '/rules/cpp-packaging/vcpkg.md', ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-modernize/SKILL.md']
  hb = await handbackApplier('wave5', 'They are, as JSON: ' + JSON.stringify(pending).slice(0, 20000), owns)
  if (hb) ok.push(hb)
}
const nm = ok.reduce((n, r) => n + r.new_must_rows.length, 0)
const nf = ok.reduce((n, r) => n + r.new_failure_modes.length, 0)
log('Wave 5: ' + ok.length + ' results · new MUST ' + nm + ' · new failure modes ' + nf + ' · rows changed ' + ok.reduce((n, r) => n + r.rows_changed.length, 0) + ' · handbacks pending ' + pending.length)
return { results: ok, new_must: nm, new_failure_modes: nf }
