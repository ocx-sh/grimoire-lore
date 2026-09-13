export const meta = {
  name: 'jvm-wave1-map',
  description: 'JVM research program phase 3: one opus agent reads the 4 audits + 9 scouts + frame and writes the prioritised topic map, decides the artifact set, and commissions wave 2 with wave 3 staged',
  phases: [{ title: 'Map', detail: 'deduplicate the candidates, resolve conflicts, decide the artifact set, commission wave 2', model: 'opus' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const DATE = '2026-09-05'

const SELECTION_ITEM = {
  type: 'object',
  properties: {
    group: { type: 'string', description: 'topic slug WITHOUT the jvm- prefix, e.g. gradle-dependencies; the consolidation becomes jvm-<group>.md and dives go under jvm-<group>/' },
    group_label: { type: 'string' },
    id_family: { type: 'string', description: 'the <PREFIX>-<FAMILY> this group owns, e.g. GRADLE-DEP, JAVA-CONC, KT-CORO, BZL-JAVA' },
    slug: { type: 'string', description: 'dive worker slug; file becomes jvm-<group>/<slug>.md' },
    label: { type: 'string' },
    brief: { type: 'string', description: '10-25 lines written as a professional research commission: exactly what to investigate, which sources (URLs from the scouts) to fetch, which APIs/flags/plugin ids/rule names/versions to pin down, what exemplar evidence (repo@sha:path) to test against, and what the deliverable must DECIDE' },
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
        bazel_java_handoff: { type: 'string', description: 'how the Bazel-Java depth file is delivered to the sibling bazel-quality set' },
        rationale: { type: 'string' },
      },
      required: ['rules', 'skills', 'id_families', 'bazel_java_handoff', 'rationale'],
    },
    wave2: { type: 'array', items: SELECTION_ITEM },
    wave3_staged: { type: 'array', items: SELECTION_ITEM },
    deferred_count: { type: 'number' },
    owner_questions: { type: 'array', items: { type: 'string' } },
    frame_corrections: { type: 'array', items: { type: 'string' }, description: 'every frame premise the audits or scouts overturned, one line each with the evidence key' },
  },
  required: ['path', 'candidates_deduplicated', 'conflicts_resolved', 'artifact_set', 'wave2', 'wave3_staged', 'deferred_count', 'owner_questions', 'frame_corrections'],
}

phase('Map')
const map = await agent(`Model rationale: opus — topic prioritisation, conflict resolution, the artifact-set decision and the commissioning of a whole wave across thirteen corpus artifacts; these are decisions with a blast radius, and a wrong priority wastes a wave of workers.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are phase 3 (Map) of the research-lang program for the JVM ecosystem (Java, Kotlin/JVM, Gradle with plugin development as the requester's emphasis, Maven, Ant as legacy, Bazel for Java/Kotlin as a complement to the concurrent Bazel program, SDK authoring, dependency management, fat/shadow jars and distribution, linting, testing and coverage), run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The output becomes AI-agent configuration (glob-scoped rules with support directories, at most two skills, a bundle) published through the lore catalog and used without a human in the loop; it must also serve two future fleet products on day one — an OCX SDK for the JVM and an OCX Gradle plugin.
- Read the method first: ${ROOT}/.claude/skills/research-lang/references/wave-plan.md (Phase 3: Map, Phase 4, Phase 5, Sizing, Budget) and ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md (Selection, Placement, "Narrow the Glob Only When It Cannot Miss", the index + support directory shape). Then the frame IN FULL including its Corrections section and the exemplar table: ${RESEARCH}/jvm-frame.md.
- Then read EVERY wave-1 artifact in full (list the directories first): ${RESEARCH}/jvm-audit/*.md (4 audits) and ${RESEARCH}/jvm-topic-map/*.md (9 scouts). Do not skim; the "Candidate topics" tables are the raw material and the "Contested", "Recent shifts" and "Contradictions of the frame" sections are where conflicts live. If a file is missing (a worker dropped), say so in the map and proceed.
- For the house shape of a finished map, read ${RESEARCH}/typescript-topic-map.md sections "How to read this" and "Conflicts resolved" (first ~120 lines), and /home/mherwig/dev/grimoire-lore/.agents/research/bazel-topic-map.md section "Artifact set decision" (read-only; it is the sibling set a Bazel-Java depth file must slot into).
- Sibling lore sets already own these globs: rust-cargo (**/Cargo.toml), python-packaging (**/pyproject.toml, **/uv.lock), typescript-packaging (**/package.json, **/tsconfig*.json, lint configs), docs-quality (README/CHANGELOG/docs sites), the in-flight bazel-quality (BUILD.bazel, *.bzl, MODULE.bazel, rc files). A JVM topic that is really one of theirs is covered-elsewhere.
- Budget is real: two programs share the account tonight. Wave 2 is at most 6 groups and 14 dives; wave 3 the same. Cross-cutting decisions come first.

WRITE ${RESEARCH}/jvm-topic-map.md with YAML frontmatter (title, phase: 3, model: opus, date: ${DATE}, wave: "1 consolidated → 2 commissioned, 3 staged", sources_surveyed: 13, candidates_deduplicated: N) and these sections, in order:

1. "## How to read this" — the row-is-a-question rule; coverage measured against the sibling lore sets and the frame's inventory (config-inventory.md), never against a fleet codebase (there is none — say so); priority against the two future consumers (SDK, Gradle plugin) and the general JVM adopter; the SURFACE legend (java / kotlin / gradle / maven / ant / bazel-java / sdk / plugin-dev / any) and the exemplar-shape legend (name the shapes from exemplar-build-shape.md: e.g. A = Kotlin library on Gradle Kotlin DSL publishing to Central, B = Java library on Gradle with build-logic, C = Java library on Maven, D = Gradle plugin as product, E = Java under Bazel or dual-build, F = legacy Groovy DSL / Ant); the source-key link legend to every wave-1 file.
2. "## Conflicts resolved" — every place two wave-1 artifacts disagree, or an artifact disagrees with the frame or with the requester's hypotheses. Resolve each with the evidence that decided it (normative > measured > codified > argued > asserted). Known ones you must cover: fat/shadow jar as best practice vs anti-pattern (per consumer kind: library / app / plugin / CLI); one jvm-quality rule vs separate java-quality and kotlin-quality; whether Maven and Ant share the Gradle rule or get their own; buildSrc vs included build-logic; Kotlin DSL vs Groovy DSL for the rule's examples; Gradle plugin development as a depth file vs a skill; JUnit 6 vs 5 baseline; JSpecify vs the older nullness annotations; Error Prone + NullAway vs Checkstyle/PMD/SpotBugs as the Java gate of record; detekt vs ktlint vs both; JaCoCo vs Kover for Kotlin; coverage thresholds — enforce or not, on what; virtual threads vs reactive for the SDK; Java-first vs Kotlin-first for the OCX SDK (frame the decision, do not make it for the owner); Bazel-Java depth file: ship here or hand to bazel-quality; explicit API mode default; the era rows the recent-shifts scout overturned.
3. "## The map" — EVERY deduplicated candidate as a table row grouped under lettered sections (one section per future depth file, across all rules): ID (M-<letter>-nn) | question | surface | shapes it binds | coverage (covered / partial / uncovered, with the source key) | priority P0-P3 with a one-clause justification against this program's consumers | proposed ID family. Deduplicate aggressively: several hundred raw rows should become 180-260. Merge synonyms, split subject areas into questions. Keep the numbering stable — later waves cite M-IDs.
4. "## Artifact set decision" — decide (as decisions, with the assumption named): the rules and their glob lists (measure every glob against rule-distillation's "narrow the glob only when it cannot miss": which names does Gradle/Maven/Ant/the JDK REQUIRE? build.gradle.kts, settings.gradle.kts, gradle.properties, gradle/libs.versions.toml, gradle/wrapper/gradle-wrapper.properties, gradle/verification-metadata.xml, pom.xml, .mvn/**, build.xml, module-info.java, *.java, *.kt, *.kts — say which are safe and why, using the exemplar counts), the depth-file list per rule with one line each (route by task, never by topic name), the ID-family allocation (one family per depth file; the prefixes JAVA-, KT-, GRADLE-, MVN- are free; BZL-JAVA belongs to the sibling), how the Bazel-Java depth file is delivered to bazel-quality (a file drafted in this program's corpus that the sibling's authoring pass copies in — name the path and the family), the skills (at most two; procedures only — confirm or rename gradle-plugin-dev / jvm-dependency-triage / jvm-release; drop any that is really a rule), the bundle name, and what is explicitly NOT in scope (Android, KMP, Compose, Scala, Groovy-the-language, Spring-the-framework beyond build/packaging facts, app servers, Jakarta EE) and why.
5. "## Selected for wave 2" — at most 6 groups and at most 14 dives total, 2-3 dives per group, chosen by: uncovered first, then leverage for the two future consumers, then "an area where agents demonstrably get it wrong", then "a rule could actually check this". The requester explicitly wants modern Gradle depth, Gradle plugin development, SDK development and dependency management, fat/shadow jars and best practices, Bazel-for-Java, linting, and test suite/coverage — wave 2 must start on the highest-leverage of those and wave 3 must complete the set; Java and Kotlin language topics (concurrency, API design, nullness, errors) must not be starved. For EACH dive: group slug (without the jvm- prefix), dive slug, label, the ID family, and a research BRIEF of 10-25 lines written as a professional commission — exactly what to investigate, which sources (URLs from the scouts) to fetch, which flags/APIs/plugin ids/rule names/versions to pin down, what exemplar evidence (repo@sha:path:line from the audits) to test against, and what the deliverable must DECIDE. The brief is handed to a sonnet worker verbatim; a vague brief is a wasted worker. Name the "chase the surprise" items: any place the scouts or audits found something the frame did not name and that is load-bearing.
6. "## Staged for wave 3" — the next 5-6 groups (at most 14 dives) with the SAME brief quality, so wave 3 launches mechanically after wave 2 lands. Mark which wave-3 briefs must be revised in light of wave-2 results.
7. "## Deferred" — everything else with its M-ID, one line on why, and what would promote it.
8. "## Questions for the owner" — only decisions no research can settle (Java-first or Kotlin-first SDK; minimum JDK for the SDK; whether the Gradle plugin targets Gradle 8.x too; Groovy DSL examples in the rule or Kotlin only; whether Maven gets its own rule). Max 8. For each, propose the default the program will assume if unanswered.
9. "## Explicitly not a defect" — frame suspicions the audits cleared, so nobody re-investigates them.
10. "## Frame corrections" — every frame premise (era, hypotheses, artifact set) the wave-1 evidence overturned, one line each with the source key; the orchestrator appends these to the frame verbatim.

Rules: no claim without a source key or a repo@sha:path:line; a topic is a QUESTION not a subject; every P0 must be checkable by a command, a lint, a plugin task, a grep or a named reading heuristic — say which; date every version-specific row with the Java/Kotlin/Gradle/Maven/Bazel version. Use read-only tools except for your one output file. Return the structured receipt (wave2 and wave3_staged carry the full briefs verbatim, not summaries).`,
  { label: 'map:jvm-topic-map', phase: 'Map', model: 'opus', schema: MAP_SCHEMA })

if (!map) { log('MAP RETURNED NULL — read journal.jsonl'); return { map: null } }
log(`Map: ${map.candidates_deduplicated} rows · wave2 ${map.wave2.length} dives in ${new Set(map.wave2.map(d => d.group)).size} groups · wave3 staged ${map.wave3_staged.length} · deferred ${map.deferred_count} · owner questions ${map.owner_questions.length} · frame corrections ${map.frame_corrections.length}`)
return { map }
