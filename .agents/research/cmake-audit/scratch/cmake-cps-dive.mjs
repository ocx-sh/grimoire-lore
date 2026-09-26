export const meta = {
  name: 'cmake-cps-dive',
  description: 'Owner-commissioned deep dive on the Common Package Specification (CPS) in CMake 4.x: two sonnet dives with distinct lenses, then an opus pass that re-verifies every version and status claim against primary sources',
  phases: [
    { title: 'Dive', detail: 'spec + CMake implementation; ecosystem adoption + interop' },
    { title: 'Verify', detail: 'opus re-fetches every version/status claim', model: 'opus' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/cmake-frame.md'
const GROUP = RESEARCH + '/cmake-dependency-seam'
const DATE = '2026-09-05'

const PREAMBLE = (model, rationale) => 'Model rationale: ' + model + ' — ' + rationale + `

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program that makes an AI-agent fleet expert in CMake and in C++ package management (Conan 2, vcpkg, Hunter/cpp-pm, CPM.cmake, dependency providers) including the CMake side of Bazel interoperability. Its output becomes AI-agent configuration (rules) used without a human in the loop, published through the lore catalog at ` + ROOT + `.
- Read the frame first, in full: ` + FRAME + `. It names the era (CMake 4.x current, September 2026), the adopting codebases (one CMake consumer, find_ocx; zero C++ in the fleet; a 46-repo exemplar corpus), the companion contract with the Bazel program, and the artifact set.
- The owner commissioned THIS dive by name: research the Common Package Specification (CPS) as CMake now implements it, starting from https://www.kitware.com/navigating-cmake-dependencies-with-cps/ . CPS is the candidate neutral seam between CMake, Conan, vcpkg, pkg-config, Meson and Bazel, so it is load-bearing for the whole interoperability question the program exists to answer.
- Sibling research on the same seam runs concurrently (wave 1 scouts under ` + RESEARCH + `/cmake-topic-map/ and audits under cmake-audit/). Do not read or write those files; write only your own OUTPUT FILE.
- Date everything you write as researched ` + DATE + `. CPS support is experimental and moving: every claim about what CMake, Conan, vcpkg or Meson can do MUST carry the exact version it applies to and the URL that proves it. A version you cannot prove is written as "unverified" — never guessed.
- Use read-only tools everywhere except your OUTPUT FILE. Never run cmake, conan, vcpkg or a build.
`

const DIVE_CONTRACT = (path, scopeLine) => `OUTPUT FILE: ` + path + `

Structure, in this order:
1. YAML frontmatter: title, topic: cps-common-package-specification, group: cmake-dependency-seam, agent, model, date_researched: ` + DATE + `, sources_count, primary_sources_count, scope (2-3 lines: ` + scopeLine + `).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone actionable claim, each carrying the version it applies to.
4. "## Findings" — numbered subsections. EVERY non-obvious claim carries an inline citation as a markdown link to the exact URL read. Correct and incorrect usage side by side wherever a rule is easier shown than told (a CMake snippet, a .cps JSON fragment, a command line). Exact command names, variable names, experimental-feature gate names and their UUID values if published, exact version numbers, exact JSON field names from the spec.
5. "## Normative guidance candidates" — numbered, crisp, checkable imperative rules distilled from the findings, each with: the rule, a one-line rationale, and how a reviewer VERIFIES it (a grep over CMakeLists.txt or *.cps, a cmake command line, a JSON-schema check, or a named reading heuristic). State which way empty output reads. This is the section that matters most — dense and specific.
6. "## AI-agent angle" — what an LLM characteristically gets WRONG here (it was trained before CPS landed in CMake: hallucinated commands, confusing CPS with Config packages or pkg-config, wrong gate names, wrong version floors, treating experimental as stable) and the smallest mechanical check that catches each mistake.
7. "## Contested / evolving" — where practice genuinely disagrees or is still moving (spec versions, the experimental gate, adoption by each package manager, the ISO C++ SG15 position), and which way it is trending, as of ` + DATE + `.
8. "## Open questions for the map" — what this dive could not settle and which question a follow-up should chase.
9. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 12 distinct sources, at least 6 primary (the spec, CMake's own documentation and release notes, the Kitware blog, the tools' own repositories and docs, talk recordings or slides, standards papers).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub- or GitLab-hosted markdown and reStructuredText prefer fetching the raw file verbatim through Bash with curl -sL (raw.githubusercontent.com; gitlab.kitware.com/cmake/cmake/-/raw/master/Help/...), because WebFetch summarises and a spec sweep needs the full text.
- Actually FETCH the primary sources; never write from search snippets or from memory.
- Reflect current practice as of ` + DATE + `; flag historical-only guidance and anything experimental.
- No "it depends" without saying what it depends on.
- Do not modify any file other than your output file. Return max 30 lines as the structured receipt.`

const DIVE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    primary_sources_count: { type: 'number' },
    top_rules: { type: 'array', items: { type: 'string' } },
    version_claims: { type: 'array', items: { type: 'string' }, description: 'every claim of the form "<tool> <version> does X", one per line, so the verifier can re-check them' },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'sources_count', 'primary_sources_count', 'top_rules', 'version_claims', 'open_questions'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    claims_checked: { type: 'number' },
    confirmed: { type: 'number' },
    refuted: { type: 'array', items: { type: 'string' } },
    unverifiable: { type: 'array', items: { type: 'string' } },
    conflicts_between_dives: { type: 'array', items: { type: 'string' } },
    verdict_for_map: { type: 'string' },
  },
  required: ['path', 'claims_checked', 'confirmed', 'refuted', 'unverifiable', 'conflicts_between_dives', 'verdict_for_map'],
}

const DIVES = [
  {
    key: 'cps-spec-and-cmake-implementation',
    scope: 'the CPS specification itself and how CMake 4.x produces and consumes .cps files; not the other package managers',
    brief: `Establish what the Common Package Specification is, precisely, and what CMake can do with it today, version by version.
Fetch and read in full: the Kitware post https://www.kitware.com/navigating-cmake-dependencies-with-cps/ (and every Kitware blog post it links or that links to it — search kitware.com/blog for CPS, "package info", PACKAGE_INFO, 2024-2026); the CPS specification at https://cps-org.github.io/cps/ (every page: overview, schema, the .cps JSON fields — name, version, version_schema, compat_version, components, configurations, requires, default_components, platform, prefix, cps_version, cps_path — the semantics of requires and component references, the version schemas simple / custom / rpm / dpkg, the search algorithm and prefix resolution, the transitive requirement model) and its GitHub repository https://github.com/cps-org/cps (the schema JSON, the changelog or release tags, open issues about ambiguity); the CMake documentation for install(PACKAGE_INFO ...) (raw: gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst), export(PACKAGE_INFO ...) (Help/command/export.rst), find_package's CPS search behaviour and the CPS section of cmake-packages(7) (Help/manual/cmake-packages.7.rst), the experimental-features page (Help/dev/experimental.rst — the exact gate variable names and UUIDs for CPS export and CPS import, per CMake version), the release notes of every CMake version that touched CPS (Help/release/4.0.rst, 4.1.rst, 4.2.rst, 4.3.rst, 4.4.rst and the newest dev notes) and the CMake issue tracker items for CPS (search gitlab.kitware.com/cmake/cmake issues for "CPS" and "PACKAGE_INFO"; read the tracking issue). Also the cps-config reference implementation (https://github.com/cps-org/cps-config) if it exists — what it is, who maintains it, whether it is what pkg-config-style consumers would use.
Pin down: which CMake version introduced install(PACKAGE_INFO) and behind which gate; whether export(PACKAGE_INFO) exists; whether find_package consumes .cps files and since which version and gate; where CMake searches for .cps files (the prefix layout: <prefix>/cps/, <prefix>/lib/cps/, <prefix>/share/cps/? — quote the documented search paths verbatim); how a .cps file maps onto imported targets (component to target name, namespace, INTERFACE_* properties, configurations to IMPORTED_CONFIGURATIONS, requires to INTERFACE_LINK_LIBRARIES); what CANNOT be expressed in CPS that a hand-written Config.cmake can (arbitrary CMake logic, find_dependency with options, generator expressions, custom properties) and what the Kitware post says to do about it; whether CPS files are relocatable by construction (the prefix field and the @prefix@ handling); how version compatibility is declared (compat_version, version_schema) and how find_package version ranges interact; whether one .cps file can describe multiple configurations (Debug/Release) and how multi-config generators consume it; the interaction with BUILD_INTERFACE / INSTALL_INTERFACE generator expressions on the exporting target; what install(PACKAGE_INFO) requires of the target (EXPORT set, install(TARGETS ... EXPORT), FILE_SET headers?) and what it refuses; and the ISO C++ SG15 / WG21 papers on CPS (search open-std.org for CPS, "Common Package Specification", and the Ecosystem IS) — what the standards direction is and its current status.
Deliverable must DECIDE, in the normative candidates: whether a library project should ship a .cps file today (and under which gate and CMake floor), whether it should ship it INSTEAD of or ALONGSIDE a Config.cmake, and the smallest checkable rule for each.`,
  },
  {
    key: 'cps-ecosystem-adoption-and-interop',
    scope: 'how the package managers, other build systems and the standards effort adopt or ignore CPS; not the CMake command reference',
    brief: `Establish who, outside CMake itself, produces or consumes CPS today, and what that means for the interoperability seam this program exists to map.
Fetch and read: the Kitware post https://www.kitware.com/navigating-cmake-dependencies-with-cps/ (for the ecosystem claims it makes); the Conan documentation and blog for CPS (search docs.conan.io/2 and blog.conan.io for CPS, "CPSDeps", "package_info" and CMakeConfigDeps — is there a CPS generator, since which Conan version, experimental or not? read the generator reference page and the changelog rows); the vcpkg repository and docs for CPS (search github.com/microsoft/vcpkg and microsoft/vcpkg-tool issues and discussions, and learn.microsoft.com/vcpkg, for "CPS" — is there any support, plan or stated position?); Meson (mesonbuild.com docs and github.com/mesonbuild/meson issues for CPS — Meson's dependency() consuming CPS, since which version, gate?); pkg-config and pkgconf (is CPS positioned as a replacement? what does the pkgconf maintainer say? search github.com/pkgconf/pkgconf issues for CPS); build2 and xmake positions if any; Bazel: rules_foreign_cc issues or docs mentioning CPS, the Bazel Central Registry position, and whether any Bazel rule consumes .cps (likely none — prove the negative by search and say so); the cps-config tool (github.com/cps-org/cps-config — who maintains it, what it does, whether it is the pkg-config drop-in for non-CMake consumers) and Bloomberg's involvement (Bret Brown's CppCon and C++Now talks 2023-2025 on packaging and CPS — find the talk pages and slides; the "Packaging for the future" and "Common Package Specification" talks; the Bloomberg engineering blog); the C++ standards side (WG21 SG15 tooling study group papers on CPS: search open-std.org/jtc1/sc22/wg21/docs/papers for CPS and for the Ecosystem International Standard, and isocpp.org; what P-numbers exist, what they propose, current status of the Ecosystem IS effort); the CPS GitHub organisation's other repositories and its governance (who are the maintainers, how are spec changes decided, how many releases); adoption evidence in the wild: search GitHub code for files named *.cps with cps_version (use the GitHub code search web UI or gh api search/code if available; count and name the notable projects), and search for install(PACKAGE_INFO in CMakeLists.txt across GitHub (count, notable projects); the Kitware and CMake discourse threads (discourse.cmake.org) on CPS since 2024; and any critique posts (Hacker News, r/cpp threads on CPS — read the top comments).
Pin down: for EACH of Conan, vcpkg, Meson, pkg-config/pkgconf, build2, Bazel: produces .cps? consumes .cps? since which version? experimental? stated position with URL. Then the interoperability consequence: does CPS remove the need for Conan's CMakeDeps-generated Config files or vcpkg's toolchain-file integration, or does it add a third path alongside them? What does a CMake project that wants to be consumable by ALL of Conan, vcpkg, Meson and a Bazel rules_foreign_cc wrap have to ship in 2026 — Config.cmake, .pc, .cps, all three? — and which of those does each consumer actually read today.
Deliverable must DECIDE, in the normative candidates: whether a 2026 rule set should tell library authors to ship CPS now, to prepare for it (how), or to wait — with the evidence for the decision — and the checkable rule for a project that wants maximal consumability across build systems.`,
  },
]

const VERIFY_PROMPT = (dives) => PREAMBLE('opus', 'adversarial verification of fast-moving version and status claims that will become MUST rules; a wrong version floor propagates into every future diff') + `
You are the CLAIM VERIFIER for two deep dives on the Common Package Specification (CPS). The dives were written by a cheaper model from web reading; your job is to try to REFUTE their load-bearing claims by re-fetching the primary source for each, and to record the outcome in a ledger a later consolidator will trust.

Read IN FULL, first: ` + dives.map(d => d.path).join(' and ') + `.
Their self-reported version claims, one per line:
` + dives.flatMap(d => (d.version_claims || []).map(c => '- [' + d.key + '] ' + c)).join('\n') + `

Then, for EVERY claim of the form "<tool> <version> does/introduced/supports/gates X" in either file (not only the ones listed above — sweep the Findings and Summary sections), re-fetch the primary source (CMake release notes and Help/*.rst on gitlab.kitware.com raw; the CPS spec pages; Conan, vcpkg, Meson docs and changelogs; the talk page) through Bash curl -sL or WebFetch after ToolSearch "select:WebSearch,WebFetch", and classify it: CONFIRMED (quote the sentence and URL), REFUTED (what the source actually says, with URL — this is the finding), or UNVERIFIABLE (the source is not fetchable or does not state it; say what you tried). Default to REFUTED when the source does not say what the dive says it says; default to UNVERIFIABLE, not CONFIRMED, when you could not fetch it. Also check: every experimental-gate variable name and UUID against Help/dev/experimental.rst for the CMake version cited; every .cps JSON field name against the spec's schema; every "since version" against the release note that introduced it; and whether either dive treats an experimental feature as stable.

Then compare the two dives against each other: where they disagree (a version, a status, a "does Conan produce CPS" answer), state both positions and which the sources support.

Write ` + GROUP + `/cps-verification.md with YAML frontmatter (title, topic: cps-common-package-specification, group: cmake-dependency-seam, agent, model: opus, date_researched: ` + DATE + `, verifies: the two file paths), a table of contents, "## Ledger" (table: # | claim | dive | verdict | evidence URL | what the source actually says), "## Refuted claims and the corrections" (each with the corrected sentence the consolidator should use), "## Conflicts between the dives" (resolved with the source), "## Unverifiable" (with what would verify it), "## Verdict for the map" (5-10 lines: is CPS a MUST-, SHOULD- or CONSIDER-grade topic for a 2026 CMake rule set, which claims are safe to build rules on, which are not, and what the dependency-seam consolidation must decide). Do not edit the dive files. Return max 30 lines as the structured receipt.`

// ---------------------------------------------------------------- Run
phase('Dive')
log('CPS: ' + DIVES.length + ' sonnet dives, then one opus verifier')

const diveResults = await parallel(DIVES.map(d => () =>
  agent(
    PREAMBLE('sonnet', 'web reading and cited enumeration of a spec and its implementations; volume work, decisions deferred to the verifier and the consolidator') + '\n' +
      DIVE_CONTRACT(GROUP + '/' + d.key + '.md', d.scope) + '\n\nRESEARCH BRIEF:\n' + d.brief,
    { label: 'dive:' + d.key, phase: 'Dive', model: 'sonnet', schema: DIVE_SCHEMA },
  ).then(r => (r ? { key: d.key, ...r } : null))))

const dives = diveResults.filter(Boolean)
const dropped = DIVES.filter((d, i) => !diveResults[i]).map(d => d.key)
if (dropped.length) log('DROPPED (returned null): ' + dropped.join(', '))
if (!dives.length) return { dives, dropped, verify: null }

phase('Verify')
const verify = await agent(VERIFY_PROMPT(dives), { label: 'verify:cps-claims', phase: 'Verify', model: 'opus', schema: VERIFY_SCHEMA })

log('CPS: dives ' + dives.length + '/' + DIVES.length + ' · claims checked ' + (verify ? verify.claims_checked : 'n/a') + ' · refuted ' + (verify && verify.refuted ? verify.refuted.length : 'n/a'))
return { dives, dropped, verify }
