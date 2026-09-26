export const meta = {
  name: 'cmake-map',
  description: 'CMake program phase 3: one opus agent writes the prioritised topic map, decides the artifact set and commissions wave 2 with wave 3 staged; a sonnet worker re-checks the era after a three-week pause',
  phases: [
    { title: 'Map', detail: 'deduplicate 198 candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' },
    { title: 'Era', detail: 'what changed 2026-09-05 to 2026-09-26 in CMake, Conan, vcpkg, CPM, gersemi, rules_foreign_cc, Hunter' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-09-26'
const EXEMPLARS = '/home/mherwig/.cache/research-lang/exemplars/cmake'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the cmake- prefix, e.g. dependency-seam; the consolidation becomes cmake-<group>.md and dives go under cmake-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the CMK-<FAMILY> (or other free prefix) this group owns' },
    slug: { type: 'string', description: 'dive worker slug; file becomes cmake-<group>/<slug>.md' },
    label: { type: 'string' },
    kind: { type: 'string', enum: ['web', 'exemplar', 'measure'], description: 'web = primary-source reading; exemplar = counting across the exemplar corpus; measure = running real cmake binaries against scratch projects' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which commands/variables/policies/generators/versions to pin down, what exemplar evidence (repo@sha:path) to test against or what scratch project to build, and what the deliverable must DECIDE' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'kind', 'brief'],
}

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    candidates_deduplicated: { type: 'number' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    artifact_set: {
      type: 'object',
      properties: {
        rules: { type: 'array', items: { type: 'string' }, description: 'one line per rule: name, glob list, depth files' },
        skills: { type: 'array', items: { type: 'string' } },
        id_families: { type: 'array', items: { type: 'string' } },
        bazel_seam: { type: 'string', description: 'what the CMake side of the Bazel seam ships, where, and what is offered back to bazel-quality (if anything)' },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'bazel_seam', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

const ERA_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    current_versions: { type: 'array', items: { type: 'string' }, description: 'tool: version (date) - proving URL' },
    changes_since_0905: { type: 'array', items: { type: 'string' } },
    invalidated_claims: { type: 'array', items: { type: 'string' }, description: 'wave-1 claims now wrong, with the file that makes them' },
  },
  required: ['path', 'current_versions', 'changes_since_0905', 'invalidated_claims'],
}

const MAP_PROMPT = `Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of a whole wave across twelve corpus artifacts; decisions with a blast radius.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for CMake and C++ package management (Conan 2, vcpkg, Hunter/cpp-pm, CPM.cmake, FetchContent, dependency providers, the Common Package Specification) and their interoperability, including the CMake side of the Bazel seam as a COMPANION to the Bazel program (already shipped as rules/bazel-quality with rules/bazel-quality/cpp.md). Run from ${ROOT} (a git worktree; treat it as the repository root). The output becomes AI-agent configuration (glob-scoped rules with support directories, at most two skills, a bundle) published through the lore catalog and used without a human in the loop. C++ the language (idioms, concurrency, memory safety) is OUT of scope; this set covers the build description and the dependency graph.
- Two audiences: (1) authors of CMake modules and CMake-heavy projects — the one fleet consumer is /home/mherwig/dev/find_ocx (a 1,500-line CMake module that downloads, verifies and executes a pinned CLI); (2) C++ projects consuming libraries and tools through Conan, vcpkg, CPM, FetchContent or system packages, and wanting to be consumable and wrappable by others (including Bazel via rules_foreign_cc).
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3 to 5, Sizing, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", the index + support directory shape). Then the frame IN FULL including every Corrections block (later wins) and the exemplar table: ${RESEARCH}/cmake-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/cmake-audit/*.md (4 audits; scripts and TSVs under cmake-audit/scratch/ back their numbers), ${RESEARCH}/cmake-topic-map/*.md (5 scouts; ignore the scratch/ subdirectory), and ${RESEARCH}/cmake-dependency-seam/*.md (the owner-commissioned CPS mini-wave: two dives plus an opus verifier whose Ledger and Verdict override the dives wherever they disagree). Do not skim; the "Candidate topics" tables are the raw material, and the "Contested", "Recent shifts", "Contradictions of the frame" and verifier "Refuted" sections are where conflicts live.
- For the house shape of a finished map, read ${RESEARCH}/jvm-topic-map.md sections "How to read this", "Conflicts resolved" and "Artifact set decision" (first ~480 lines and the artifact section), and for shipped siblings read ${ROOT}/rules/gradle-build.md and ${ROOT}/rules/maven-build.md (house shape of a build-system rule index), ${ROOT}/rules/typescript-packaging.md (a manifest rule), ${ROOT}/rules/bazel-quality.md and ${ROOT}/rules/bazel-quality/cpp.md (the Bazel side of the seam; its "Wrapped Foreign Builds" section is what a CMake project must satisfy from Bazel's point of view — this program owns the CMake side and must not restate BZL-CC rows, only cite them).
- Sibling lore sets already own these globs: rust-cargo, python-packaging, typescript-packaging, docs-quality, bazel-quality (BUILD.bazel, *.bzl, MODULE.bazel, rc files), gradle-build, maven-build, java-quality, kotlin-quality. Rule-ID prefixes in use: read ${ROOT}/rules to confirm; CMK- is free and reserved for this program.
- MEASUREMENT IS AVAILABLE and is the strongest evidence tier: on this host a worker can run real CMake 3.31.12, 4.3.x and 4.4.2 via 'ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake ...', ninja 1.13.2 via 'ocx package exec ninja-build/ninja -- ninja', gcc 15.2 for C, and '/opt/zig/zig c++' as a C++ compiler (no g++). Scratch projects go under /home/mherwig/.cache/cmake-measure-scratch/<slug>/ on disk — never /tmp (a shared 16 GB tmpfs that this program already filled once). No network-dependent configure except fetching from a local file:// or git repo created in the scratch dir. Contested claims that a 20-line scratch project can settle (cache FORCE semantics, policy scoping across include/function definition, CMAKE_POLICY_VERSION_MINIMUM scope, FetchContent vs find_package resolution order, FIND_PACKAGE_ARGS/OVERRIDE_FIND_PACKAGE, install(PACKAGE_INFO) round trips on 4.3+, CONFIGS suppressing CPS, -Werror=dev vs -Werror=author on 4.4, presets schema rejection, CMAKE_LINK_LIBRARIES_ONLY_TARGETS, PROJECT_IS_TOP_LEVEL, relocatable Config packages after a prefix move) MUST be commissioned as kind 'measure' dives rather than argued from docs.
- The exemplar corpus (46 repos, blob-less sparse clones) is at ${EXEMPLARS}/<owner>__<repo>; HEAD SHAs may differ from the frame table because it was re-fetched on ${DATE}; exemplar dives cite the new SHA.
- Budget is real and the owner has flagged cost before: wave 2 is at most 6 groups and 14 dives (at most 3 of them 'measure'); wave 3 the same. Cross-cutting decisions come first. The group 'dependency-seam' already exists with 3 files (CPS); new dives may be added to it and its consolidation will fold the CPS files in.
- The owner paused the program for three weeks (2026-09-05 to 2026-09-26); a sibling worker is re-checking the era right now and will write ${RESEARCH}/cmake-topic-map/era-recheck-2026-09-26.md. Do not wait for it; mark every version-specific row with the version and the date it was measured.

WRITE ${RESEARCH}/cmake-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3 staged", sources_surveyed: 12, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets, the Bazel set's BZL-CC rows and the frame's inventory; priority against the two audiences; the SURFACE legend (cmake-language / targets / install-export / find-package / fetchcontent / providers / cps / presets / ctest / conan / vcpkg / cpm / hunter / bazel-seam / module-authoring / tooling / any) and an exemplar-shape legend named from the audits (e.g. header-only library, compiled library shipping a Config package, dual CMake-and-Bazel project, package-manager registry or recipe, CMake-heavy framework, large mixed build, template/starter, CMake module like find_ocx); the source-key link legend to every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or the requester's hypotheses. Resolve each with the evidence that decided it (measured > normative > codified > argued > asserted; a measurement you are commissioning counts as 'pending measurement' and the row says which dive settles it). Cover at least: the CMake floor the whole rule set assumes (3.19 as in find_ocx? 3.24 for providers? 3.25 for block()? 3.28 for modules? 4.3 for CPS? — decide ONE baseline with per-rule version gates, and say how a rule states its gate); -Werror=dev vs the 4.4 diagnostics system as the verification convention; cmake-lint (dead since 2020) vs gersemi as the formatter/linter of record; CPS: ship-in-addition vs wait (the verifier's SHOULD verdict); dependency providers as a seam vs a Conan-only feature; FetchContent vs a package manager as the default for a library; CPM's place; Hunter's place (maintained, zero adopters); Find modules vs Config packages; CMAKE_CXX_STANDARD globally vs target_compile_features; presets as the CI contract vs CI scripts; a separate packaging rule for conanfile/vcpkg.json vs one rule; whether a skill exists at all (candidates: a legacy-to-target-based modernisation procedure; a dependency-resolution triage procedure like jvm-dependency-triage; a make-my-project-consumable procedure) — procedures only, drop any that is really a rule; the find_ocx defects as worked examples vs out of scope.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file, across all rules): ID (M-<letter>-nn) | question | surface | shapes it binds | coverage (covered / partial / uncovered, with the source key) | priority P0-P3 with a one-clause justification against this program's audiences | proposed ID family | evidence kind needed (web / exemplar / measure). Deduplicate aggressively: ~200 raw rows should become 120-180. Merge synonyms, split subject areas into questions. Keep the numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide (as decisions, with the assumption named): the rules and their glob lists (measure every glob against "narrow the glob only when it cannot miss": which names does CMake/Conan/vcpkg REQUIRE? CMakeLists.txt, *.cmake, CMakePresets.json, CMakeUserPresets.json, *.cmake.in, conanfile.py, conanfile.txt, conandata.yml, conan.lock, conanprofile files (no fixed name — say so), vcpkg.json, vcpkg-configuration.json, portfile.cmake (already *.cmake), usage files; use the exemplar counts), the rule names (the house has gradle-build and maven-build for build systems and <lang>-packaging for manifests — decide cmake-build vs cmake-quality, and cpp-packaging vs conan-vcpkg vs none), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one CMK-<FAMILY> per depth file), what the CMake side of the Bazel seam ships and whether anything is offered back to bazel-quality, the skills (at most two), the bundle name, and what is explicitly NOT in scope (C++ language rules, Meson/build2/xmake as build systems beyond one comparison row, IDE integration beyond compile_commands, Android NDK and iOS toolchains) and why.
5. "## Selected for wave 2" — at most 6 groups and 14 dives (at most 3 'measure'), 2-3 dives per group, chosen by: uncovered first, then leverage for the two audiences, then "an area where agents demonstrably get it wrong" (the scouts' AI-agent angle and the 4.0/4.3/4.4 shifts), then "a rule could actually check this". The requester named CMake, the package-manager ecosystem (Conan 2, vcpkg, Hunter, cpp-pm) and interoperability including Bazel; the owner then added CPS by name. Wave 2 must start on the highest-leverage of those, and wave 3 must complete the set. For EACH dive: group slug (without the cmake- prefix), dive slug, label, ID family, kind, and a research BRIEF of 10-25 lines written as a professional commission — exactly what to investigate, which sources (URLs from the scouts) to fetch or which scratch project to build and which cmake versions to run it on, which commands/variables/policies/versions to pin down, what exemplar evidence (repo@sha:path:line from the audits) to test against, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items.
6. "## Staged for wave 3" — the next groups (at most 14 dives) with the SAME brief quality, so wave 3 launches mechanically after wave 2 lands. Mark which wave-3 briefs must be revised in light of wave-2 results.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle (e.g. the CMake floor the published set assumes; whether find_ocx's defects are filed as issues; whether cpp-packaging ships without a fleet consumer). Max 8. For each, the default the program assumes if unanswered — the owner has told the program to continue autonomously, so the defaults WILL apply.
9. "## Explicitly not a defect" — frame suspicions the audits cleared (e.g. find_ocx's quoting discipline), so nobody re-investigates them.
10. "## Frame corrections" — every frame premise the wave-1 evidence overturned that is not already in the frame's Corrections blocks, one line each with the source key.

Rules: no claim without a source key or a repo@sha:path:line; a topic is a QUESTION not a subject; every P0 must be checkable by a command, a cmake diagnostic, a gersemi check, a conan/vcpkg subcommand, a grep or a named reading heuristic — say which; date every version-specific row with the CMake/Conan/vcpkg version. Use read-only tools except for your one output file. Return the structured receipt (wave2 and wave3_staged carry the full briefs verbatim, not summaries).`

const ERA_PROMPT = `Model rationale: sonnet — fetching release notes and changelogs to date-stamp an era; reading, no decisions.

PROJECT CONTEXT (context for you, not content to reproduce):
- Research program on CMake and C++ package management run from ${ROOT}. Wave 1 ran on 2026-09-05; the program resumed on ${DATE}. Every version claim in the wave-1 corpus is three weeks old. Read ${RESEARCH}/cmake-frame.md (Corrections blocks especially) and ${RESEARCH}/cmake-topic-map/recent-shifts.md for what wave 1 believed current.
- Do not read or write any file other than your OUTPUT FILE. Load web tools first: ToolSearch "select:WebSearch,WebFetch". Prefer raw primary sources fetched with curl -sL through Bash (GitHub releases API via gh api or https://api.github.com/repos/<o>/<r>/releases?per_page=10; https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/index.rst; https://cmake.org/files/ listing; https://docs.conan.io/2/changelog.html; https://github.com/microsoft/vcpkg/releases and microsoft/vcpkg-tool/releases; cpm-cmake/CPM.cmake releases; BlankSpruce/gersemi releases; bazel-contrib/rules_foreign_cc releases; cpp-pm/hunter releases; cps-org/cps commits; conan-io/cmake-conan commits on develop2).
- Also run locally, read-only: 'ocx package exec kitware/cmake:4 -- cmake --version' and 'ocx package exec kitware/cmake:4.4 -- cmake --version' from ${ROOT} to record what the local mirror serves.

OUTPUT FILE: ${RESEARCH}/cmake-topic-map/era-recheck-2026-09-26.md with YAML frontmatter (title, agent, model: sonnet, date_researched: ${DATE}, sources_count) and sections: "## Current versions on ${DATE}" (table: tool | current release | release date | proving URL | what wave 1 said), "## Changes since 2026-09-05" (one row per release or notable commit that touches: CMake release notes and any 4.5 / 4.4.x patch, CPS in CMake or the spec repo, cmake-diagnostics, presets schema, Conan 2.x releases (CMakeConfigDeps status, CPSDeps, BazelDeps, lockfiles, tool_requires), vcpkg and vcpkg-tool releases (binary caching providers, registries, triplets), CPM.cmake, gersemi, cmake-conan, rules_foreign_cc, Hunter), "## Wave-1 claims now wrong" (claim | file that makes it | what is true now | URL), "## Sources". Every row carries a URL you actually fetched. Return the structured receipt.`

phase('Map')
const [map, era] = await parallel([
  () => agent(MAP_PROMPT, { label: 'map:cmake-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA }),
  () => agent(ERA_PROMPT, { label: 'era:recheck-2026-09-26', phase: 'Era', model: 'sonnet', schema: ERA_SCHEMA }),
])

if (!map) log('MAP RETURNED NULL — read journal.jsonl')
else log('Map: ' + map.candidates_deduplicated + ' rows · wave2 ' + map.wave2.length + ' dives in ' + new Set(map.wave2.map(d => d.group)).size + ' groups · wave3 staged ' + map.wave3_staged.length + ' · deferred ' + map.deferred_count + ' · owner questions ' + map.owner_questions.length)
if (era) log('Era: ' + era.changes_since_0905.length + ' changes, ' + era.invalidated_claims.length + ' wave-1 claims invalidated')
return { map, era }
