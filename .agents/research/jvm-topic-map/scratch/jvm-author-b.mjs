export const meta = {
  name: 'jvm-author-b',
  description: 'JVM research program phase 7: opus drafters write the depth files of each rule from the consolidations, pipelined into one index drafter per rule; skills and the Bazel-Java handoff draft alongside',
  phases: [
    { title: 'Depth', detail: 'one opus drafter per depth file', model: 'opus' },
    { title: 'Index', detail: 'one opus drafter per rule index, after its depth files exist', model: 'opus' },
    { title: 'Standalone', detail: 'skills and the Bazel-Java handoff', model: 'opus' },
  ],
}

// Filled by the generator: PLAN = { rules: [{ rule, glob_list, summary_hint, depth: [{ file, family, sources, task_hint }] }], standalone: [{ kind, path, sources, brief }] }
const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const DATE = '2026-09-12'
const PLAN = {"rules": [{"rule": "kotlin-quality", "core_family": "KT-CORE", "glob_list": ["**/*.kt", "**/*.kts"], "index_sources": ["jvm-language-api.md", "jvm-concurrency.md", "jvm-platform-and-toolchains.md", "jvm-quality-gates.md"], "depth": [{"file": "api-and-abi.md", "family": "KT-API", "sources": ["jvm-language-api.md"], "task_hint": "changing a public Kotlin signature, a default parameter, a data class in an API, explicit API mode, BCV or abiValidation"}, {"file": "coroutines.md", "family": "KT-CORO", "sources": ["jvm-concurrency.md"], "task_hint": "launching a coroutine, choosing a dispatcher, handling cancellation or an exception in a coroutine, testing with runTest"}, {"file": "java-interop.md", "family": "KT-INTEROP", "sources": ["jvm-topic-map.md", "jvm-topic-map/canonical-kotlin.md", "jvm-language-api.md"], "task_hint": "exposing Kotlin to Java callers or calling Java from Kotlin: @JvmStatic/@JvmOverloads/@Throws, platform types, nullability flags (map rows M-V-01..08; no consolidation — draw from the canonical-kotlin scout)"}, {"file": "compiler-and-toolchain.md", "family": "KT-COMP", "sources": ["jvm-platform-and-toolchains.md"], "task_hint": "setting jvmToolchain or jvmTarget, a -X compiler flag, K2 migration, KSP versus kapt, Kotlin version floors"}, {"file": "lint-gate.md", "family": "KT-LINT", "sources": ["jvm-topic-map.md", "jvm-concurrency.md", "jvm-quality-gates.md"], "task_hint": "wiring detekt or ktlint, activating rules, .editorconfig for ktlint (map rows M-R-07..11; the detekt-activation row is KT-CORO-01 — cite it)"}, {"file": "testing.md", "family": "KT-TEST", "sources": ["jvm-topic-map.md", "jvm-platform-and-toolchains.md", "jvm-concurrency.md"], "task_hint": "writing a Kotlin test, Kover coverage and its check wiring, kotlinx-coroutines-test (map rows M-S-03/10/11; cite KT-CORO-11/12/13)"}, {"file": "errors-and-resources.md", "family": "KT-ERR", "sources": ["jvm-java-runtime-safety.md"], "task_hint": "catching in Kotlin, runCatching and CancellationException, use {} for resources, @Throws on a published API, exitProcess"}]}, {"rule": "gradle-build", "core_family": "GRADLE-CORE", "glob_list": ["**/*.gradle.kts", "**/*.gradle", "**/gradle.properties", "**/*.versions.toml", "**/gradle/wrapper/gradle-wrapper.properties", "**/gradle/verification-metadata.xml", "**/gradle.lockfile", "**/buildscript-gradle.lockfile"], "index_sources": ["jvm-gradle-core.md", "jvm-gradle-settings.md", "jvm-dependencies.md", "jvm-gradle-plugin-dev.md"], "depth": [{"file": "structure-and-conventions.md", "family": "GRADLE-STRUCT", "sources": ["jvm-gradle-core.md", "jvm-gradle-settings.md"], "task_hint": "adding a subproject or a convention plugin, choosing buildSrc or build-logic, wiring a version catalog, editing settings.gradle.kts or gradle.properties"}, {"file": "dependencies.md", "family": "GRADLE-DEP", "sources": ["jvm-dependencies.md"], "task_hint": "declaring a dependency, choosing api/implementation/compileOnly, importing a BOM or platform, resolving a conflict, locking or verifying dependencies, bumping a version"}, {"file": "caching-and-correctness.md", "family": "GRADLE-CACHE", "sources": ["jvm-gradle-core.md"], "task_hint": "writing a task or a build script that must survive the configuration cache, declaring task inputs and outputs, reading an environment variable or a file at configuration time, running with --configuration-cache in CI"}, {"file": "toolchains-and-compilation.md", "family": "GRADLE-TOOL", "sources": ["jvm-topic-map.md", "jvm-platform-and-toolchains.md", "jvm-gradle-core.md"], "task_hint": "declaring a Java toolchain, options.release, encoding, the foojay resolver, compiler flags in a build file (map rows M-E-01..08 plus JAVA-PLAT-12 Gradle half and JAVA-PLAT-13 relocated here per frame correction 72)"}, {"file": "plugin-authoring.md", "family": "GRADLE-PLUG", "sources": ["jvm-gradle-plugin-dev.md", "jvm-gradle-settings.md"], "task_hint": "writing a Gradle plugin or a Settings plugin: task and property annotations, ValueSource and BuildService, TestKit matrix, validatePlugins, publishing to the Plugin Portal, Gradle version floors"}, {"file": "distribution.md", "family": "GRADLE-DIST", "sources": ["jvm-distribution.md"], "task_hint": "shipping an application: shadow jar, application plugin, jlink, jpackage, Jib, Spring Boot repackaging; deciding whether a library may shade at all (DIST-03 rewritten and DIST-13 rationale replaced per contradictions 1 and 22)"}, {"file": "publishing.md", "family": "GRADLE-PUB", "sources": ["jvm-publishing.md"], "task_hint": "publishing to Maven Central from Gradle: publications, POM metadata, signing, Gradle Module Metadata, mavenLocal, version schemes"}, {"file": "ci.md", "family": "GRADLE-CI", "sources": ["jvm-topic-map.md", "jvm-audit/exemplar-publishing-ci-bazel.md", "jvm-gradle-core.md"], "task_hint": "writing a CI workflow that runs Gradle: setup-gradle, cache read-only on PRs, wrapper validation, JDK matrix, dependency submission (map rows M-I-01..07; cross-reference GRADLE-STRUCT-12)"}]}], "standalone": []}
const NOTES_ANCHOR = 'Authoring notes (binding on the drafters)'

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- You are a drafter in phase 7 (Author) of the research-lang program for the JVM ecosystem, run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore, read it only). The artifacts you write are published through the lore catalog and loaded by coding agents without a human in the loop. Merging to main publishes; you write files, you never commit.
- BINDING INPUTS, read in this order before writing a line: (1) ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md in full — selection, placement, index+support shape, rule anatomy, severity, writing for an agent reader, portability; (2) ${RESEARCH}/jvm-topic-map.md section "## ${NOTES_ANCHOR}" in full, plus "Cross-consolidation contradictions" in the section "Wave 3 landed" — these are decisions already taken; you apply them, you do not re-take them; (3) the house exemplars: ${ROOT}/rules/typescript-quality.md (an index) and ${ROOT}/rules/typescript-quality/async.md (a depth file) — match their structure, register and density, not their content; (4) the consolidation(s) named in your brief, in full.
- The checker every file must pass: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py <path>. Run it on your own output before returning and fix every finding. Verification-cell shape rules it enforces: give grep a directory operand and -r, never a bare shell glob like .github/workflows/*.yml; one -e per alternative, never \\| inside a pattern; no <angle-bracket> placeholder inside a quoted pattern — bind it first (NAME=example; grep -rn -e "$NAME" src/); never feed operands from $(git ls-files ...); use --include= instead of an unquoted **; pipe into xargs -r; every table row whose first cell is a rule ID is a rule definition, so a duplicate MUST list in a skill uses | # | Finding | Rule | with the ID last. State in every verification cell whether empty output is the pass or the finding.
- Formatting constraints: this repo runs ruff format --check over markdown, so a fenced python block must be ruff-stable; Gradle snippets are fenced kotlin (Kotlin DSL) unless the notes name a Groovy exception, and BUILD or .bzl snippets are fenced starlark. Every version-specific row names the version and the date verified (${DATE} unless the consolidation dates it). No em dashes in prose; no semicolons in prose. Files over 100 lines carry a Contents line. Depth files never link to other depth files; they cite sibling families by ID and say which file owns them.
- Portability: the artifacts ship to strangers. No fleet paths, no OCX-internal hostnames, no repo@sha citations in the shipped text (those live in the corpus); an exemplar may be named ("kafka pins ...") only when it is public and the fact is load-bearing. A pinned decision is written as a default the adopter overrides once, and marked pinned.
- Budget: an index under 200 lines; a depth file under 300 lines and usually 150 to 250; a SKILL.md under 500 lines. Rules that fail the four selection tests (agent gets it wrong unaided, checkable, changes a diff, no contradiction) are dropped, and the drop is recorded in your receipt with the ID, not silently.
- Use read-only tools everywhere except your own OUTPUT FILE(S). Do not edit a consolidation. Do not edit another drafter's file.
`

const DEPTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'rule_ids_shipped', 'rule_ids_dropped', 'checker_clean', 'hoist_to_index'],
  properties: {
    path: { type: 'string' }, lines: { type: 'number' },
    rule_ids_shipped: { type: 'array', items: { type: 'string' } },
    rule_ids_dropped: { type: 'array', items: { type: 'string' }, description: 'ID: reason' },
    checker_clean: { type: 'boolean' },
    hoist_to_index: { type: 'array', items: { type: 'string' }, description: 'the 1-3 MUST rows from this file that belong in the index non-negotiables, as "ID: one-line rule"' },
    routing_row: { type: 'string', description: 'the task-worded "Doing..." phrase for the index routing table' },
  },
}

const INDEX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'non_negotiables', 'core_rule_ids', 'checker_clean', 'globs'],
  properties: {
    path: { type: 'string' }, lines: { type: 'number' },
    non_negotiables: { type: 'number' }, core_rule_ids: { type: 'array', items: { type: 'string' } },
    checker_clean: { type: 'boolean' }, globs: { type: 'array', items: { type: 'string' } },
  },
}

const STANDALONE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['paths', 'checker_clean', 'notes'],
  properties: { paths: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, notes: { type: 'array', items: { type: 'string' } } },
}

function depth(rule, d) {
  const out = `${ROOT}/rules/${rule.rule}/${d.file}`
  return agent(`Model rationale: opus — text that becomes an enforced rule; a wrong MUST propagates into every future diff.

${CONTEXT}

YOUR FILE: ${out}  (depth file of the \`${rule.rule}\` rule; ID family ${d.family}; loads when the index routes here for: ${d.task_hint})
SOURCES (read in full): ${d.sources.map(s => `${RESEARCH}/${s}`).join(', ')}

Write the depth file: frontmatter (title, summary naming the family and what it owns), a one-paragraph scope stating what the family owns and which sibling families own the neighbours (by family name, never by file link), a Contents line, then sections grouped by the check that catches them — each section opens with the gate command(s) stated once and a rule table (| ID | Rule | Rationale | Verification | Severity |) whose rows keep their consolidation IDs verbatim, followed by at most one minimal wrong/right snippet pair per section where the mistake is easier shown than told, then "## What Agents Get Wrong Here" ranked from the consolidation's failure modes. Apply the authoring notes: drop the IDs they name, keep the pinned defaults they set, mark pinned rows, cite the version floors. Where two consolidations conflict, the "Cross-consolidation contradictions" resolution wins. Then run the checker on your file, fix, and return the receipt (hoist_to_index names the 1-3 rows the index must carry as non-negotiables).`,
    { label: `depth:${rule.rule}/${d.file}`, phase: 'Depth', model: 'opus', effort: 'high', schema: DEPTH_SCHEMA })
}

function index(rule, depthReceipts) {
  const out = `${ROOT}/rules/${rule.rule}.md`
  const ok = depthReceipts.filter(Boolean)
  return agent(`Model rationale: opus — the index is the always-loaded surface; every line is paid for in every session.

${CONTEXT}

YOUR FILE: ${out}  (the index of the \`${rule.rule}\` rule)
GLOBS (decided by the map and the authoring notes; copy exactly): ${JSON.stringify(rule.glob_list)}
DEPTH FILES already written by sibling drafters (read each in full): ${ok.map(r => r.path).join(', ')}
Their receipts (hoist candidates and routing phrases): ${JSON.stringify(ok.map(r => ({ path: r.path, hoist: r.hoist_to_index, routing: r.routing_row })))}
CONSOLIDATIONS for the index-owned CORE family and the gate: ${rule.index_sources.map(s => `${RESEARCH}/${s}`).join(', ')}

Write the index in the exact shape of ${ROOT}/rules/typescript-quality.md: frontmatter (paths = the globs above, summary, keywords, license Apache-2.0, repository https://github.com/ocx-sh/grimoire-lore), a two-line stance, Contents, "## The Gate" (the exact commands, narrowest first, through the project's pin never PATH, chained into one named target), "## Non-Negotiables" (a numbered table of 12-18 merge-blocking rows, each citing depth IDs; hoist from the receipts, then prune to what must be true in every edit), "## Rules This File Owns" (the ${rule.core_family} rows: the never-weaken-the-check rule, the watched-go-red rule, the empty-output rule, plus anything the notes assign to the index), "## Where the Depth Is" (one task-worded row per depth file, routed by what the reader is doing, plus the sibling-set rows the notes name), "## Severity", "## Siblings". Under 200 lines. Every depth ID cited must exist in a depth file (grep them). Run the checker on the rule file with its support directory, fix, return the receipt.`,
    { label: `index:${rule.rule}`, phase: 'Index', model: 'opus', effort: 'high', schema: INDEX_SCHEMA })
}

function standalone(item) {
  return agent(`Model rationale: opus — ${item.kind === 'skill' ? 'a procedure agents run unattended; its steps and its refusal conditions are decisions' : 'a depth file offered to a published sibling set; it must match that set\'s contract exactly'}.

${CONTEXT}

YOUR OUTPUT: ${item.path}
SOURCES (read in full): ${item.sources.map(s => s.startsWith('/') ? s : `${RESEARCH}/${s}`).join(', ')}

${item.brief}

Run the checker on your output, fix, return the receipt.`,
    { label: `${item.kind}:${item.path.split('/').slice(-2).join('/')}`, phase: 'Standalone', model: 'opus', effort: 'high', schema: STANDALONE_SCHEMA })
}

// ---------------------------------------------------------------- Run
const nDepth = PLAN.rules.reduce((n, r) => n + r.depth.length, 0)
log(`Authoring batch b: ${PLAN.rules.length} rules, ${nDepth} depth files, ${PLAN.standalone.length} standalone`)

const ruleResults = pipeline(
  PLAN.rules,
  rule => parallel(rule.depth.map(d => () => depth(rule, d))),
  (receipts, rule) => {
    const ok = receipts.filter(Boolean)
    if (ok.length < rule.depth.length) log(`${rule.rule}: ${rule.depth.length - ok.length} depth drafter(s) dropped; index proceeds with ${ok.length}`)
    if (!ok.length) return { rule: rule.rule, depth: receipts, index: null }
    return index(rule, ok).then(ix => ({ rule: rule.rule, depth: receipts, index: ix }))
  },
)
const standaloneResults = parallel(PLAN.standalone.map(item => () => standalone(item)))
const [rules, standaloneOut] = await Promise.all([ruleResults, standaloneResults])

const dropped = rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).flatMap(d => d.rule_ids_dropped || []))
const unclean = [
  ...rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).filter(d => !d.checker_clean).map(d => d.path)),
  ...rules.filter(Boolean).filter(r => r.index && !r.index.checker_clean).map(r => r.index.path),
  ...standaloneOut.filter(Boolean).filter(s => !s.checker_clean).flatMap(s => s.paths),
]
log(`Batch done: ${rules.filter(r => r && r.index).length}/${PLAN.rules.length} indexes · ${dropped.length} IDs dropped at authoring · ${unclean.length} files still unclean`)
return { rules, standalone: standaloneOut, dropped_ids: dropped, unclean }
