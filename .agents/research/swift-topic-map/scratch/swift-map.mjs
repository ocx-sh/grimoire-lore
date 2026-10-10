export const meta = {
  name: 'swift-wave1-map',
  description: 'Swift research program phase 3: one opus agent reads the 5 audits + 7 scouts + frame and writes the prioritised topic map, decides the artifact set, and commissions wave 2 with wave 3 staged',
  phases: [{ title: 'Map', detail: 'deduplicate the candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/swift-tools/fixtures'
const DATE = '2026-10-10'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the swift- prefix, e.g. concurrency; the consolidation becomes swift-<group>.md and dives go under swift-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the SW-<FAMILY> this group owns, e.g. SW-CONC, SW-ERR, SW-PKG, SW-TEST, BZL-SWIFT' },
    slug: { type: 'string', description: 'dive worker slug; file becomes swift-<group>/<slug>.md' },
    label: { type: 'string' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which APIs/compiler flags/lints/versions to pin down, what exemplar evidence (repo@sha:path:line) to test against, what to RUN with the local toolchain against planted fixtures, and what the deliverable must DECIDE' },
  },
  required: ['group', 'group_label', 'id_family', 'slug', 'label', 'brief'],
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
        bazel_swift_handoff: { type: 'string', description: 'how the Bazel-Swift depth file is delivered to the published bazel-quality set' },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'bazel_swift_handoff', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' }, description: 'every frame premise the audits or scouts overturned, one line each with the evidence key' },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

const PROMPT = `Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of a whole wave across twelve corpus artifacts; this is the program's architecture decision, and a wrong priority wastes a wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for Swift and its ecosystem (Swift 6.4 era: the language in Swift 6 mode, strict concurrency and approachable-concurrency settings, SwiftPM and the build, swift-format / SwiftLint / SwiftFormat, Swift Testing vs XCTest, DocC, cross-platform Linux / static SDK / Windows / Wasm / Android / Embedded, Apple-platform apps as read-only depth, release and distribution, Bazel rules_swift), run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The output becomes AI-agent configuration (glob-scoped rules with support directories, one to three skills, a bundle, and a Swift depth file offered to the published bazel-quality set) published through the lore catalog and used by coding agents without a human in the loop.
- The brief was one word, "swift": the agenda is entirely self-directed. The scouts and audits are your only topic source; the frame's hypotheses H1-H8 are to be confirmed or overturned by them.
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3: Map, Phase 4, Phase 5, Sizing, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", the index + support directory shape). Then the frame IN FULL including its Corrections section: ${RESEARCH}/swift-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/swift-audit/*.md (5 audits) and ${RESEARCH}/swift-topic-map/*.md (7 scouts). Do not skim; the "Candidate topics" tables are the raw material and the "Contested", "Recent shifts" and "Contradictions of the frame" sections are where conflicts live. If a file is missing (a worker dropped), say so in the map and proceed.
- For the house shape of a finished map, read ${RESEARCH}/go-topic-map.md sections "How to read this", "Conflicts resolved" and "Artifact set decision" (lines 1-150 and 831-947), and ${ROOT}/rules/go-quality.md, ${ROOT}/rules/go-modules.md plus ${ROOT}/rules/bazel-quality/go.md (the most recent published per-language set and Bazel depth file a Swift one mirrors).
- Sibling lore sets already own these globs and subjects: rust-*, python-*, typescript-*, java-quality, kotlin-quality, gradle-build, maven-build, go-quality, go-modules, cmake-build, cpp-packaging, nix-quality, bazel-quality (BUILD.bazel, *.bzl, MODULE.bazel, rc files; bzlmod, hermeticity, caching, CI, flags), docs-quality and code-docs (doc pages, doc comments in general), css-theming. A Swift topic that is really one of theirs is covered-elsewhere. The Rust set's cli-contract and durable-state depth files are the fleet's CLI and atomic-write contract: a Swift CLI mirrors them rather than inventing a new exit-code table.
- A real Swift 6.4 toolchain (Docker; SWIFT_VERSION=6.3 for the prior line) with bundled swift-format, swiftlint 0.65.1 and swiftformat 0.63.1 is available through ${RUN}; there is no macOS and no Xcode. Dives CAN and SHOULD run verifications against planted fixtures (small throwaway packages under ${FIX}/<slug>/, never under /tmp), building with --scratch-path into the swift-tools build dir. Write briefs that demand it wherever a rule's verification is a compiler diagnostic, an upcoming-feature flag, a lint, or a formatter rule: the verification must be watched going red on a planted fixture and green on its twin. Apple-only topics (SwiftUI, Xcode settings, iOS runtime) get reading heuristics or greps and must say so.
- Budget: wave 2 is at most 7 groups and 14 dives; wave 3 the same. Cross-cutting decisions come first.

WRITE ${RESEARCH}/swift-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3 staged", sources_surveyed: 12, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets (config-inventory.md), never against a fleet codebase (there is none — say so); priority against the consumers (general Swift adopters of the published set: packages, servers, CLIs, Apple apps; and the future fleet: a Swift SDK wrapping the ocx CLI, Swift CLIs in the ocx/grimoire mould, OCI tooling in the apple/containerization mould); the SURFACE legend and an exemplar-shape legend named from the audits (e.g. A = core library, B = CLI/tool, C = server/service, D = community library, E = Apple app, F = Bazel/other-platform); the source-key link legend to every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or hypotheses H1-H8. Resolve each with the evidence that decided it (normative > measured > codified > argued > asserted). Known ones you must cover: the formatter and linter of record (bundled swift-format vs SwiftFormat vs SwiftLint — use the audit's measured noise on idiomatic code); Swift Testing vs XCTest per test kind; default MainActor isolation and NonisolatedNonsendingByDefault for libraries vs apps vs executables; actors vs Mutex vs global actors for shared mutable state, and when @unchecked Sendable is acceptable; typed throws restraint vs adoption; Package.resolved commit policy by package kind; swift-tools-version and language-mode floors for libraries vs applications (the compatibility tension measured in H1); warnings-as-errors policy and SE-0443 warning groups; StrictMemorySafety adoption; macros and the swift-syntax dependency cost; Foundation vs FoundationEssentials on Linux; one swift-quality rule with depth files vs separate rules (language vs concurrency vs Apple UI); whether Package.swift, Package.resolved, .swift-format, .swiftlint.yml, .swiftformat, Xcode project files, and CI workflows join a package-rule glob or get routed by subject (apply "Narrow the Glob Only When It Cannot Miss" with the audits' counts); the era rows the recent-shifts scout overturned.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file, across all rules): ID (M-<letter>-nn) | question | surface | shapes it binds | coverage (covered / partial / uncovered, with the source key) | priority P0-P3 with a one-clause justification against this program's consumers | proposed ID family. Deduplicate aggressively: several hundred raw rows should become 160-240. Merge synonyms, split subject areas into questions. Keep the numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide (as decisions, with the assumption named): the rules and their glob lists (which file names does SwiftPM or the tool REQUIRE? *.swift, Package.swift, Package@swift-*.swift, Package.resolved, .swift-format, .swiftlint.yml, .swiftformat, project.yml, Project.swift, *.xcconfig — say which are safe and why, with the audit counts), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one family per depth file, SW-<FAMILY>; BZL-SWIFT for the Bazel depth file), how the Bazel-Swift depth file is delivered to bazel-quality (drafted in this program and added to rules/bazel-quality/ with a version bump, the precedent being go.md), the skills (one to three; procedures only — candidates: swift-concurrency-migrate / swift-upgrade, swift-diagnose, swift-release; drop any that is really a rule), the bundle name, and what is explicitly NOT in scope and why.
5. "## Selected for wave 2" — at most 7 groups and at most 14 dives total, 1-3 dives per group, chosen by: uncovered first, then leverage for the consumers, then "an area where agents demonstrably get it wrong" (the recent-shifts scout and the concurrency audit measure this), then "a rule could actually check this". Cross-cutting decisions (the concurrency and isolation model, the gate of record, the test style, the package/manifest policy, error contracts) go in wave 2. For EACH dive: group slug (without the swift- prefix), dive slug, label, the ID family, and a research BRIEF of 10-25 lines written as a professional commission — exactly what to investigate, which sources (URLs from the scouts) to fetch, which APIs/flags/lints/versions to pin down, what exemplar evidence (repo@sha:path:line from the audits) to test against, what planted fixtures to RUN the candidate verification against, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items: any place the scouts or audits found something the frame did not name and that is load-bearing.
6. "## Staged for wave 3" — the next groups (at most 14 dives) with the SAME brief quality, so wave 3 launches mechanically after wave 2 lands. Mark which wave-3 briefs must be revised in light of wave-2 results.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle. Max 8. For each, propose the default the program will assume if unanswered (the owner runs this autonomously; the defaults WILL be applied).
9. "## Explicitly not a defect" — frame suspicions the audits cleared, so nobody re-investigates them.
10. "## Frame corrections" — every frame premise (era, hypotheses, artifact set) the wave-1 evidence overturned, one line each with the source key; the orchestrator appends these to the frame verbatim.

Rules: no claim without a source key or a repo@sha:path:line; a topic is a QUESTION not a subject; every P0 must be checkable by a compiler diagnostic, a lint, a formatter rule, a grep, a SwiftPM subcommand or a named reading heuristic — say which; date every version-specific row with the Swift or tool version. Use read-only tools except for your one output file. Return the structured receipt (wave2 and wave3_staged carry the full briefs verbatim, not summaries).`

phase('Map')
const map = await agent(PROMPT, { label: 'map:swift-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA })

if (!map) { log('MAP RETURNED NULL — read journal.jsonl'); return { map: null } }
log('Map: ' + map.candidates_deduplicated + ' rows · wave2 ' + map.wave2.length + ' dives in ' + new Set(map.wave2.map(d => d.group)).size + ' groups · wave3 staged ' + map.wave3_staged.length + ' · deferred ' + map.deferred_count + ' · owner questions ' + map.owner_questions.length + ' · frame corrections ' + map.frame_corrections.length)
return { map }
