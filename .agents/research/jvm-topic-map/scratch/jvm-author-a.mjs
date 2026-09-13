export const meta = {
  name: 'jvm-author-a',
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
const PLAN = {"rules": [{"rule": "java-quality", "core_family": "JAVA-CORE", "glob_list": ["**/*.java"], "index_sources": ["jvm-quality-gates.md", "jvm-language-api.md", "jvm-java-runtime-safety.md", "jvm-platform-and-toolchains.md", "jvm-concurrency.md"], "depth": [{"file": "api-and-evolution.md", "family": "JAVA-API", "sources": ["jvm-language-api.md", "jvm-platform-and-toolchains.md"], "task_hint": "changing a public signature, annotating nullness on an API, choosing a return type, deciding what a library exposes, wiring japicmp"}, {"file": "data-and-patterns.md", "family": "JAVA-DATA", "sources": ["jvm-topic-map.md", "jvm-topic-map/canonical-java.md", "jvm-language-api.md"], "task_hint": "writing a record, a sealed hierarchy, a switch over a closed type, equals/hashCode, or an Optional (map rows M-L-01..08; no consolidation — draw from the canonical-java scout and Error Prone / SonarJava checks named there)"}, {"file": "nullness.md", "family": "JAVA-NULL", "sources": ["jvm-topic-map.md", "jvm-quality-gates.md", "jvm-language-api.md"], "task_hint": "adding a nullness annotation, choosing between JSpecify and older flavours, marking a package @NullMarked (map rows M-M-01..07; tooling rows are JAVA-LINT-04/05/06 and contract rows JAVA-API-09/10/11 — cite, do not restate)"}, {"file": "concurrency.md", "family": "JAVA-CONC", "sources": ["jvm-concurrency.md"], "task_hint": "starting a thread or virtual thread, choosing a lock, bounding a fan-out, spawning a subprocess, using a preview concurrency API"}, {"file": "errors-and-resources.md", "family": "JAVA-ERR", "sources": ["jvm-java-runtime-safety.md"], "task_hint": "catching, rethrowing, closing a resource, handling InterruptedException, exiting"}, {"file": "security-and-untrusted-input.md", "family": "JAVA-SEC", "sources": ["jvm-java-runtime-safety.md"], "task_hint": "deserialising, parsing XML, building a path or a command from outside data, picking a random source, wiring find-sec-bugs"}, {"file": "platform-and-versions.md", "family": "JAVA-PLAT", "sources": ["jvm-platform-and-toolchains.md"], "task_hint": "choosing a JDK floor or --release, writing module-info, touching charset, locale or timezone, reacting to a removed JDK API"}, {"file": "lint-gate.md", "family": "JAVA-LINT", "sources": ["jvm-quality-gates.md", "jvm-java-runtime-safety.md"], "task_hint": "wiring Error Prone, NullAway, Checkstyle or SpotBugs, choosing -Xlint keys, suppressing a warning"}, {"file": "testing.md", "family": "JAVA-TEST", "sources": ["jvm-quality-gates.md", "jvm-platform-and-toolchains.md"], "task_hint": "writing a JUnit test, configuring parallel execution, setting a coverage floor, picking JUnit 5 or 6"}]}, {"rule": "maven-build", "core_family": "MVN-CORE", "glob_list": ["**/pom.xml", "**/.mvn/**", "**/mvnw", "**/mvnw.cmd", "**/build.xml", "**/ivy.xml", "**/ivysettings.xml"], "index_sources": ["jvm-maven-and-ant.md", "jvm-dependencies.md", "jvm-publishing.md"], "depth": [{"file": "dependencies.md", "family": "MVN-DEP", "sources": ["jvm-dependencies.md"], "task_hint": "declaring a Maven dependency or BOM import, scopes, dependencyManagement, enforcer rules, resolving nearest-wins surprises"}, {"file": "lifecycle-and-plugins.md", "family": "MVN-BUILD", "sources": ["jvm-maven-and-ant.md"], "task_hint": "binding a plugin to a phase, compiler release and annotation processing, surefire and failsafe, the wrapper and .mvn config, Maven 4 readiness"}, {"file": "publishing.md", "family": "MVN-PUB", "sources": ["jvm-publishing.md"], "task_hint": "publishing to Maven Central from Maven: central-publishing-maven-plugin, signing, sources and javadoc jars, reproducible outputTimestamp"}, {"file": "ant-legacy.md", "family": "MVN-ANT", "sources": ["jvm-maven-and-ant.md"], "task_hint": "opening a build.xml or an Ivy file: what it encodes, what a migration must preserve, maven-antrun-plugin"}]}], "standalone": [{"kind": "skill", "path": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md", "sources": ["jvm-publishing.md", "jvm-language-api.md", "jvm-maven-and-ant.md", "jvm-bazel-java.md", "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/docs-plan/SKILL.md", "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/.claude/skills/research-lang/references/validation.md"], "brief": "Write the jvm-release skill per Authoring notes §10: a procedure, not a standard. Frontmatter as skills/docs-plan/SKILL.md (name = directory, a third-person description with a \"Use when\" clause under 1024 chars that a user would type, license Apache-2.0, metadata.summary and metadata.keywords). Body under 400 lines: open with the Central Portal immutability statement (the dropped GRADLE-PUB-03), then the ordered runbook — verify the namespace, check the tag against the declared version before any build, run the binary-compatibility gate (japicmp or BCV) before sign/checksum/upload, assemble the required per-file set (sources jar, javadoc or Dokka jar, per-file signature, checksums, complete POM), set autoPublish and waitUntil = published, treat OSSRH and nexus-staging-maven-plugin as dead paths, and the Bazel line (Bazel hands off to Gradle or Maven for publishing; cite jvm-bazel-java.md if it settled java_export). Cover Gradle and Maven side by side where only the plugin differs. Duplicate the MUST rows this procedure enforces in a | # | Finding | Rule | table with the rule ID LAST. Add a references/ file only if the SKILL.md would exceed 400 lines. Run the checker on the skill directory."}, {"kind": "skill", "path": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md", "sources": ["jvm-dependencies.md", "jvm-gradle-core.md", "jvm-audit/exemplar-publishing-ci-bazel.md", "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/docs-plan/SKILL.md"], "brief": "Write the jvm-dependency-triage skill per Authoring notes §10: three entry points — (1) a version you did not choose (dependencyInsight / dependency:tree -Dverbose, nearest-wins vs highest-wins vs version_conflict_policy, the Guava listenablefuture 9999.0 case), (2) a declaration that is wrong (dependency-analysis plugin projectHealth, api versus implementation, compileOnly needed at runtime), (3) a version you are about to bump (resolve every coordinate against the real repository before emitting it, and the Dependabot-versus-Renovate interaction in one sentence). Frontmatter as skills/docs-plan/SKILL.md. Body under 350 lines, each entry point an ordered procedure with the exact commands for Gradle and Maven and what each output shape means. Duplicate the MUST rows it enforces in a | # | Finding | Rule | table with the rule ID LAST. Run the checker on the skill directory."}, {"kind": "handoff", "path": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/.agents/research/handoff/bazel-quality-java.md", "sources": ["jvm-bazel-java.md", "/home/mherwig/dev/grimoire-lore/rules/bazel-quality/rust.md", "/home/mherwig/dev/grimoire-lore/rules/bazel-quality.md"], "brief": "Write the Bazel-Java depth file per Authoring notes §11, in the EXACT shape of the shipped rules/bazel-quality/rust.md: frontmatter title + summary only (no paths); \"# Java and Kotlin under Bazel\"; the owns / does-not-own paragraph naming what BZL-JAVA owns, what java-quality / kotlin-quality / gradle-build / maven-build own, and the sibling families cited never restated; a Contents line; the measurement paragraph with the pinned versions (Bazel 8.7.0 / 8.8.0 / 9.2.0, rules_jvm_external 7.1 of 2026-07-23, rules_kotlin v2.4.10 of 2026-08-20), the date, the \"no bazel binary was run\" disclosure and rust.md's two-help-surfaces rule; sections grouped by the check that clears them matching jvm-bazel-java.md groups A to F, then \"## Gaps\" and \"## What Agents Get Wrong Here\". Aim for about 250 lines. Route into siblings by their SHIPPED names (bzlmod.md, hermeticity.md, caching.md, testing.md, flags.md, architecture.md, starlark.md, ci.md). Fix BZL-JAVA-14's cross-reference (contradiction 17) and drop BZL-JAVA-17 and BZL-JAVA-20 per §6. Also write a second file at the same directory, bazel-quality-index-row.md, containing only the one routing row to add after the cpp.md row of bazel-quality.md's \"Where the Depth Is\" table, exactly as §11 gives it. Run the checker on the handoff file."}]}
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
log(`Authoring batch a: ${PLAN.rules.length} rules, ${nDepth} depth files, ${PLAN.standalone.length} standalone`)

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
