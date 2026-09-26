export const meta = {
  name: 'cmake-wave4',
  description: 'CMake research program wave 4 (convergence test): measure the three things the host was wrongly recorded as unable to measure (a real Bazel 9 rules_foreign_cc wrap, CMake 4.0 to 4.2) and run both skills literally on real trees; an opus applier per topic edits only its own shipped files and reports new MUST rows and new failure modes',
  phases: [
    { title: 'Measure', detail: 'sonnet measurers, opus for the skill dry run' },
    { title: 'Apply', detail: 'one opus applier per topic, disjoint file sets' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const R = ROOT + '/.agents/research'
const SCR = '/home/mherwig/.cache/cmake-measure-scratch/w4'
const CHECK = 'python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research --forbid research-lang/exemplars --forbid find_ocx --forbid ocx.sh/ --forbid ocx.lock'

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You work in wave 4 of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). The rule set is already drafted and reviewed: rules/cmake-build.md with rules/cmake-build/*.md, rules/cpp-packaging.md with rules/cpp-packaging/*.md, skills/cmake-dependency-triage/ and skills/cmake-modernize/. Wave 4 is a convergence test: the program stops when a wave adds no new MUST rule and no new failure mode, so report honestly in both directions. A confirmation is a result. Do not invent findings to look busy.
- Binding decisions live in ${R}/cmake-topic-map.md section "## Authoring notes (binding on the drafters)". Read section 4 (pinned decisions) and section 7 (verification-command shape) before you judge anything.
- CMake binaries: 'ocx package exec kitware/cmake:<tag> -- cmake' from ${ROOT}, where tag is 3.31, 4.0, 4.1, 4.2, 4.3 or 4.4 (these resolve to 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4 and 4.4.2; print cmake --version once per tag and record it). ninja: 'ocx package exec ninja-build/ninja -- ninja'. C compiler: host gcc. There is no g++ on this host: use C-only fixtures, or /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh as CMAKE_CXX_COMPILER when C++ is unavoidable.
- All scratch on real disk under the directory named in your task, never /tmp and never the repository. Delete build trees you no longer need; keep the fixtures and a run.sh that reproduces every number you report.
- Every claim you record carries the exact command, the CMake or tool version, the exit code and a short output excerpt. Date is 2026-09-26.`

const TOPICS = [
  {
    key: 'bazel-wrap',
    measureModel: 'sonnet',
    ledger: R + '/cmake-bazel-seam/wave4-real-wrap.md',
    owns: [ROOT + '/rules/cmake-build/bazel-seam.md'],
    checkTarget: 'rules/cmake-build.md',
    measure: `Model rationale: sonnet — measurement against a fixed checklist; the rule decisions are made by the opus applier after you.

${COMMON}

YOUR TASK: the CMake side of the rules_foreign_cc seam was shipped grounded read-only because the corpus believed this host had no Bazel. It has one. Measure it.
- Read in full: ${ROOT}/rules/cmake-build/bazel-seam.md (the rows under test), ${ROOT}/rules/bazel-quality/cpp.md section "Wrapped Foreign Builds" (read only, the wrapper side), ${R}/cmake-bazel-seam.md (the consolidation and its open questions).
- Provision Bazel exactly like this, from your scratch directory: USE_BAZEL_VERSION=9.2.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk --output_user_root=/home/mherwig/.cache/bazel-measure-scratch/cmake-bzl/out <command>. Never run Bazel inside /home/mherwig/dev/rules_ocx. Never open, read, copy or quote /home/mherwig/dev/rules_ocx/.bazelrc.user: it holds a credential. Never create a WORKSPACE file: MODULE.bazel only. Network to the Bazel Central Registry is allowed.
- Workspace: /home/mherwig/.cache/bazel-measure-scratch/cmake-bzl/ws. bazel_dep on rules_foreign_cc at the newest version the BCR serves today and on rules_cc; record both versions. Plant small C-only CMake projects (LANGUAGES C) wrapped with the cmake() rule: one that complies with every CMK-BZL MUST row, and for each MUST row whose claim is observable in a Bazel build, a variant that violates only that row.
- For every CMK-BZL row, MUST rows first: state the row's claim in one line, what you ran, what Bazel and rules_foreign_cc did, and a verdict: confirmed, refuted, partly (say which part), or not observable in a wrap (say why). Also answer the file's own "Unmeasured as of 2026-09-26" list: the -fPIC seed of rules_foreign_cc issue 1129, and which CMake version rules_foreign_cc uses by default (the BZL-08 table). BazelDeps under Bzlmod needs Conan: run it only if 'uvx conan==2.32.0 --version' works, else record why not.
- Also run each CMK-BZL row's Verification cell exactly as written against the compliant and the violating fixture, and record whether it went red and green as its empty-output clause says.
- Look for failure modes the file does not name: anything that broke the wrap, surprised you, or passed when it should not have. Each is a candidate new failure mode with its reproduction.

Write the ledger to ${R}/cmake-bazel-seam/wave4-real-wrap.md: frontmatter (title, date 2026-09-26, bazel and rules_foreign_cc versions), a Verdict table (ID, claim, verdict, evidence pointer), then per-row evidence, then "Candidate new failure modes" and "Candidate new MUST rows" (both may be empty). Scratch: /home/mherwig/.cache/bazel-measure-scratch/cmake-bzl/. Return the ledger path, the verdict counts, and the candidate lists.`,
  },
  {
    key: 'era-4x',
    measureModel: 'sonnet',
    ledger: R + '/cmake-versions-and-gate/wave4-4x-matrix.md',
    owns: [ROOT + '/rules/cmake-build.md', ROOT + '/rules/cmake-build/versions-and-policies.md', ROOT + '/rules/cmake-build/presets-and-ci.md', ROOT + '/rules/cmake-build/language.md', ROOT + '/rules/cmake-build/dependencies.md', ROOT + '/rules/cmake-build/install-and-export.md'],
    checkTarget: 'rules/cmake-build.md',
    measure: `Model rationale: sonnet — a version matrix over commands that already exist; no rule text is decided here.

${COMMON}

YOUR TASK: every version-specific claim in the set was measured on 3.31.12, 4.3.4 and 4.4.2 only, because the corpus believed 4.0 to 4.2 were not provisionable. They are. Fill the matrix.
- Read in full: ${ROOT}/rules/cmake-build.md (the index and its gate), ${ROOT}/rules/cmake-build/versions-and-policies.md, ${ROOT}/rules/cmake-build/presets-and-ci.md, and the CPS rows in ${ROOT}/rules/cmake-build/install-and-export.md and ${ROOT}/rules/cmake-build/dependencies.md (grep -n -e CPS -e cps -e package_info for them).
- On 4.0.7, 4.1.6 and 4.2.7, and on 3.31.12, 4.3.4 and 4.4.2 as the control, run: (1) the index gate block and both canaries exactly as written, with -Werror=dev and with -Werror=author, recording exit codes; which spelling fails the configure on which line is the load-bearing question, since the index pins -Werror=dev on 4.3 and older and -Werror=author on 4.4 and newer; (2) every Verification cell in versions-and-policies.md, against a compliant and a violating two-line fixture; (3) the presets schema version each binary accepts, and whether each rejects errors.dev or warnings.dev at its top schema; (4) the claims that name 4.0, 4.1 or 4.2 anywhere in the set: grep -rn -P 'CMake 4\\.[012](?![.0-9])' ${ROOT}/rules ${ROOT}/skills and read each hit; (5) CPS import and export on each binary: whether the experimental gate is needed, which UUID each accepts (read Help/dev/experimental.rst from each binary's share directory, found via ocx package exec kitware/cmake:<tag> -- cmake --system-information or the install prefix), and whether a valid .cps wins over a Config package; (6) CMAKE_POLICY_VERSION_MINIMUM and the less-than-3.5 hard error on each line.
- For each claim: consistent with the shipped text, inconsistent (quote the text and give the measured truth), or newly true or false on a line nobody measured.

Write the ledger to ${R}/cmake-versions-and-gate/wave4-4x-matrix.md: frontmatter (title, date 2026-09-26, the six exact versions), a matrix table per question, then "Inconsistencies with shipped text" (file:line, quoted text, measured truth, proposed replacement text), then "Candidate new failure modes" and "Candidate new MUST rows" (both may be empty). Scratch: ${SCR}/era-4x/. Return the ledger path, the inconsistency count, and the candidate lists.`,
  },
  {
    key: 'skills-real',
    measureModel: 'opus',
    ledger: R + '/cmake-skills/wave4-real-tree.md',
    owns: [ROOT + '/skills/cmake-dependency-triage/SKILL.md', ROOT + '/skills/cmake-dependency-triage/references/reading-the-answers.md', ROOT + '/skills/cmake-modernize/SKILL.md', ROOT + '/skills/cmake-modernize/references/inventory.md', ROOT + '/skills/cmake-modernize/references/proofs.md'],
    checkTarget: 'skills/cmake-modernize',
    measure: `Model rationale: opus — an adversarial evaluation of two procedures an agent will follow unsupervised; judging whether a step misleads is review work.

${COMMON}

YOUR TASK: both skills were proven only on tiny planted projects. Run each one literally, as an agent that loaded it would, on real code, and report every place it misleads, stalls, or produces something other than what it says.
- Read in full: ${ROOT}/skills/cmake-modernize/ (SKILL.md and references) and ${ROOT}/skills/cmake-dependency-triage/ (SKILL.md and references). Resolve cited rule IDs in ${ROOT}/rules/cmake-build/*.md and ${ROOT}/rules/cpp-packaging/*.md as you go.
- cmake-modernize: pick one small real open-source C or C++ library with a legacy, directory-scoped CMake build (include_directories, add_definitions, global CMAKE_C_FLAGS or CMAKE_CXX_FLAGS, no install(EXPORT)) that is NOT libuv and NOT rapidjson, the two trees the skill already worked. Shallow-clone it (git clone --depth 1) into ${SCR}/skills-real/modernize/ and record the URL and commit. Follow the procedure step by step, making the edits it prescribes in that clone, through the install-move-consume round trip and the as-subproject smoke if the tree allows it within reason. At each step record: what the skill told you, what you did, the exit check result, and a verdict: worked, misled (the text led to a wrong edit), stalled (the text did not say what to do), or wrong (the exit check does not test what it says).
- cmake-dependency-triage: build a realistic wrong-copy scenario from real packages, not a stub. For example: install one version of a small real library (fmt, zlib, or cJSON, shallow clone and install to a prefix) and have a consumer that ALSO gets a different version through FetchContent or a second prefix, so that find_package or the link picks the one you did not expect. Then play the user: start from the symptom only, run the skill from its first step, and record each step as above until the skill names which copy, which version and which mechanism, and the rule that fixes it. Do a second, different scenario if the first resolves at step one (for example a re-pointed _ROOT hint that has no effect, or a FETCHCONTENT_TRY_FIND_PACKAGE_MODE surprise).
- For every misled, stalled or wrong step, give the exact replacement text for the skill file and line. Also list anything the real trees did that neither skill anticipates: each is a candidate new failure mode.

Write the ledger to ${R}/cmake-skills/wave4-real-tree.md: frontmatter (title, date 2026-09-26, the trees and commits), a step table per skill run, then "Fixes" (file:line, verdict, exact replacement text), then "Candidate new failure modes" and "Candidate new MUST rows" (both may be empty). Scratch: ${SCR}/skills-real/. Return the ledger path, the step verdict counts per skill, and the candidate lists.`,
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

function measure(t) {
  return agent(t.measure, { label: 'measure:' + t.key, phase: 'Measure', model: t.measureModel, effort: 'high' })
}

function apply(t, report) {
  return agent(`Model rationale: opus — deciding whether measured evidence changes an enforced MUST row, adds one, or adds a failure mode is a rule decision.

${COMMON}

YOUR TASK: you are the applier for wave-4 topic ${t.key}. A measurer just wrote the ledger ${t.ledger}. Its return note was:
---
${String(report).slice(0, 6000)}
---
1. Read the ledger in full and spot-check its three most consequential claims by re-running their commands from the scratch run.sh (a claim you cannot reproduce is rejected, with the reason).
2. Decide, per finding: (a) an existing row's text, verification or floor is wrong or incomplete: edit it in place, keeping its ID; (b) a severity is wrong: change it and say why; (c) a genuinely new rule an agent would get wrong without, with evidence: add it with the next free ID in that family (never a reserved ID: CONAN-19, VCPKG-19, VCPKG-20, PKG-05 to PKG-07), MUST only if it passes the MUST bar in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; (d) a new failure mode: add it to the owning file's failure-mode list; (e) a claim that was read-only-grounded and is now measured: replace the read-only wording with the measurement and its date and versions. Reject candidates that are restatements, taste, or unsupported, each with one line of reason.
3. YOUR FILES (the only files you may edit): ${t.owns.join(' ; ')}. An edit needed anywhere else goes in handbacks as path:line plus the exact replacement text. Keep every verification in the section-7 command shape with an explicit empty-output clause, prose free of em dashes and semicolons outside code and tables, and file budgets (index 200 lines, depth file 300, SKILL.md 500).
4. Append a section "## Wave 4 applied (2026-09-26)" to the ledger listing what you changed, added and rejected.
5. Run: ${CHECK} ${t.checkTarget}  and fix anything it reports in your files. If you edited a cmake fence, run 'uvx gersemi==0.29.1 --check' on a copy of it.
Return the structured result. converged is true only when you added no new MUST row and no new failure mode.`,
    { label: 'apply:' + t.key, phase: 'Apply', model: 'opus', effort: 'high', schema: APPLY_SCHEMA })
}

const results = await pipeline(TOPICS, t => measure(t), (report, t) => apply(t, report))
const ok = results.filter(Boolean)
const nm = ok.reduce((n, r) => n + r.new_must_rows.length, 0)
const nf = ok.reduce((n, r) => n + r.new_failure_modes.length, 0)
log('Wave 4: ' + ok.length + '/' + TOPICS.length + ' topics · new MUST ' + nm + ' · new failure modes ' + nf + ' · rows changed ' + ok.reduce((n, r) => n + r.rows_changed.length, 0) + ' · handbacks ' + ok.reduce((n, r) => n + r.handbacks.length, 0))
return { results: ok, new_must: nm, new_failure_modes: nf }
