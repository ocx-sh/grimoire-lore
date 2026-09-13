export const meta = {
  name: 'jvm-wave4-dive-revise',
  description: 'JVM research program phases 4+5 for one wave: sonnet deep dives per commissioned subtopic, pipelined into one opus consolidation (or revision) per group',
  phases: [
    { title: 'Dive', detail: 'one sonnet researcher per commissioned subtopic; each persists a cited artifact' },
    { title: 'Consolidate', detail: 'one opus consolidator or reviser per group; writes jvm-<group>.md', model: 'opus' },
  ],
}

// args: { wave: number, date: 'YYYY-MM-DD', selection: SELECTION_ITEM[], already_covered: string[], existing_groups: string[] }
const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
const RESEARCH = `${ROOT}/.agents/research`
const FRAME = `${RESEARCH}/jvm-frame.md`
const MAP = `${RESEARCH}/jvm-topic-map.md`
const EX = '/home/mherwig/dev/.tmp-jvm-exemplars'
const WAVE = 4
const DATE = "2026-09-12"
const SELECTION = [{"group": "java-runtime-safety", "group_label": "Java runtime safety — the gate that may not exist", "id_family": "JAVA-SEC", "slug": "find-sec-bugs-viability", "label": "Is find-sec-bugs a gate, or is JAVA-SEC grep-only?", "brief": "JAVA-SEC-08 (SHOULD) tells an adopter to wire find-sec-bugs alongside SpotBugs wherever a module parses, deserialises, extracts or executes untrusted input, and six of the nine JAVA-SEC rules name a find-sec-bugs rule id as their only automated check (the eight XXE_* rules, COMMAND_INJECTION, PATH_TRAVERSAL_IN/OUT, PREDICTABLE_RANDOM). Adoption is 0/32. Nobody measured whether the tool still works. Settle it.\n\nFetch, do not search: the find-sec-bugs GitHub releases page and tags, its issue tracker filtered to open issues mentioning SpotBugs 4.9, JDK 21/25, or Java 21+ bytecode, its README's stated SpotBugs compatibility range, and its bug list at find-sec-bugs.github.io/bugs.htm. Cross-check against SpotBugs' own release notes for detector-API breaks between 4.7 and 4.9, and against the com.github.spotbugs Gradle plugin's 6.4.x compatibility statement.\n\nDecide four things. (1) Latest release, its date, and the newest SpotBugs it declares support for. (2) Whether it analyses class files compiled at release 21 and 25 without erroring — look for issues reporting unsupported class-file major versions. (3) What the maintainers say about maintenance status, in their own words, with a link. (4) Any credible signal on false-positive rate for the XXE_* and PATH_TRAVERSAL_* families specifically — issue reports, a published evaluation, or a maintainer statement; report 'none found' rather than inventing a number.\n\nThe deliverable is a severity recommendation, not a survey. If the tool is alive and current, JAVA-SEC-08 stays SHOULD and the six rules keep their automated verification. If it is unmaintained against current SpotBugs or current bytecode, say so and rewrite those six verification cells as grep plus a named reading heuristic, and say explicitly whether each rule survives at MUST with only a grep — rule-distillation's bar is 'a command, a lint, a grep, or a named reading heuristic a reviewer can apply without re-deriving the rule', so a grep is a legal verification and a MUST can survive it. Also name any live alternative (a maintained SpotBugs security plugin, a Semgrep ruleset, a SonarJava rule set) with its own adoption evidence; do not recommend one you have not fetched. Every claim carries a URL and a fetch date."}, {"group": "java-runtime-safety", "group_label": "Java runtime safety — the Kotlin half", "id_family": "KT-ERR", "slug": "kotlin-errors-resources-and-throws", "label": "Does kotlin-quality need a KT-ERR depth file, or do KT-CORO and KT-INTEROP absorb it?", "brief": "java-quality ships nine JAVA-ERR rules on **/*.java. kotlin-quality ships zero error-and-resource rules, because JAVA-ERR's depth file does not load on **/*.kt and nothing was ever commissioned for the Kotlin side. That is a structural hole in a published artifact, and it is an artifact-set decision the authoring pass must not take on its own.\n\nFetch the primary sources: kotlinlang.org on exceptions and the absence of checked exceptions, on `use` and AutoCloseable, on runCatching/Result (including the Result restrictions page), on @Throws, and the kotlinx.coroutines docs on CancellationException transparency. Read detekt's shipped rule catalogue at the pinned SHA already in the corpus (detekt@45672efb8b:detekt-core/src/main/resources/default-detekt-config.yml plus the rule modules) and record, per candidate rule, whether a detekt rule exists and whether it is active by default — the same measurement KT-CORO-01 rests on. Read ktlint's rule set only to confirm it carries none of this.\n\nEstablish, with a rule candidate or an explicit 'no rule' for each: (a) runCatching as a blanket catch(Throwable) that swallows CancellationException — how it differs from JAVA-ERR-01, and whether KT-CORO-05 already covers it or whether a non-coroutine runCatching needs its own row; (b) `use {}` as the try-with-resources analogue and what it does not cover (a wrapping stream, a Sequence or Flow holding a handle); (c) @Throws placement on a published API and whether that is KT-INTEROP's row rather than a new family's; (d) exception chaining — whether Kotlin's Throwable(message, cause) shape makes JAVA-ERR-04 automatic or whether the same message-string mistake appears; (e) System.exit/exitProcess from library code; (f) what Result as a public return type does to binary compatibility (KT-API already owns the API half — cite it, do not restate it).\n\nThe deliverable decides one thing: does kotlin-quality grow a 28th depth file errors-and-resources.md with a KT-ERR family, or do two or three rows land in the existing coroutines.md and java-interop.md? Answer with a count — a family earns a file when it has enough rows to route to; three rows do not. State the recommendation, the ID list under each option, and which existing IDs each new row would have to cite rather than duplicate."}, {"group": "maven-and-ant", "group_label": "Maven compilation configuration", "id_family": "MVN-BUILD", "slug": "maven-annotation-processing-and-toolchains", "label": "Does a modern JDK silently stop running annotation processors, and what is Maven's toolchain seat?", "brief": "Two questions, one doc set, one worker. Both are Maven-side gaps that leave a shipped MUST incomplete.\n\nFirst, annotation processing. MVN-BUILD-02 is a MUST requiring every processor to be declared in <annotationProcessorPaths> with an explicit version. Nobody established the javac side: modern JDKs no longer enable annotation processing implicitly, and apache__maven@ea4a417bd2:pom.xml:135 sets <maven.compiler.proc> — which nothing in the corpus explains. Fetch the javac tool specification for JDK 21, 25 and the current release and find the exact release in which implicit annotation processing stopped, the exact warning or error text emitted, and what -proc:full / -proc:none / -proc:only now mean. Fetch maven-compiler-plugin's own docs for the `proc` parameter and <maven.compiler.proc>, including its default and the plugin version that introduced it. Decide whether MVN-BUILD-02 must gain a <maven.compiler.proc>full</maven.compiler.proc> conjunct, whether that is a second rule, and what the verification is — critically, whether a build whose processors silently stopped running is distinguishable from one where they ran, because 'the build is green and the generated sources are absent' is the failure shape. Do the Gradle-side equivalence check too and hand it back rather than ruling on it: does the Gradle Java plugin pass -proc: explicitly, so GRADLE-TOOL needs a matching row?\n\nSecond, Maven toolchains. JAVA-PLAT-01 owns toolchain-versus---release for Gradle and MVN-BUILD-01 owns the <release> half for Maven, but MVN-BUILD has no toolchain row at all. google__guava@5fb424c43a:.github/workflows/ci.yml:53,56 passes -Dtoolchain.skip and -Dsurefire.toolchain.version, implying a live toolchain configuration no audit read. Fetch the maven-toolchains-plugin docs, the ~/.m2/toolchains.xml guide, and Surefire's jvm/toolchain parameters. Read guava's POM at the pinned SHA for its toolchains binding. Decide: what is Maven's equivalent of Gradle's java { toolchain { } }, whether it is maven-toolchains-plugin plus toolchains.xml or the setup-java matrix in practice, whether Surefire can run tests on a different JDK than the compile, and whether this earns one MVN-BUILD row or two.\n\nEvery version claim carries the artifact version and the fetch date. Do not read any released version off the Maven site's banner — query maven-metadata.xml on Central, per frame correction 38."}, {"group": "gradle-settings", "group_label": "Settings-plugin verification", "id_family": "GRADLE-PLUG", "slug": "settings-plugin-testkit-verification", "label": "How is a Plugin<Settings> exercised under TestKit, and do the Plugin<Project> traps hold at settings scope?", "brief": "GRADLE-PLUG-22 through -28 are seven rules, six of them MUST, and every one is verified by reading source — because nothing in waves 2 or 3 established how a Plugin<Settings> is exercised under TestKit at all. GRADLE-PLUG-12's version matrix and GRADLE-PLUG-14's compileOnly/withPluginClasspath trap were both researched for Plugin<Project>. rule-distillation's bar is explicit: no verification, no rule. The OCX Gradle plugin is a Settings plugin and is the named consumer of all seven rows.\n\nFetch: the Gradle TestKit user guide, the GradleRunner javadoc (every method, especially withPluginClasspath, withGradleVersion, withArguments, withProjectDir, withTestKitDir), the Plugin<Settings> and Settings javadocs, and the pluginManagement {} section of the settings-file reference. Read source, not docs, where the docs are silent: gradle/gradle's own functional tests for settings plugins, and ktor's build-settings-logic at the pinned SHA (ktorio__ktor@f92fad0435) for any test harness it ships.\n\nAnswer five things, each with a runnable command or an explicit 'no mechanism exists'. (1) How does a TestKit test apply a Settings plugin to a generated test project — a generated settings.gradle.kts with a pluginManagement { repositories { maven(...) } } block pointing at a locally published repository, or does withPluginClasspath() reach settings scope at all? (2) Does the compileOnly x withPluginClasspath incompatibility behave identically at settings scope, and does the exception still name the wrong class? (3) Can a TestKit build assert that a shared BuildService registered from Plugin<Settings>.apply() was created exactly once across projects, and what does the assertion read — a file the service writes, a build-scan value, or nothing? (4) Does --configuration-cache in withArguments exercise a settings plugin's cache behaviour, so GRADLE-PLUG-10's separate leg covers GRADLE-PLUG-23's 'Reusing configuration cache.' verification? (5) What does ./gradlew help -Dorg.gradle.isolated-projects.diagnostics=true print for a settings plugin, and can a TestKit test assert on it (GRADLE-PLUG-27)?\n\nDeliver rewritten verification cells for GRADLE-PLUG-22 through -28 — the same IDs, the same rule text, runnable checks. Where no mechanism exists, say so in the cell and keep the reading heuristic, naming it as a reading heuristic rather than dressing it as a command."}, {"group": "concurrency", "group_label": "Java concurrency — the residual rows", "id_family": "JAVA-CONC", "slug": "java-concurrency-residual-rows", "label": "Which of M-N-05..11 earn a rule, and which are JAVA-LINT configuration?", "brief": "Seven JAVA-CONC map rows were adjudicated P0/P1 in wave 1 and dived by nobody: M-N-05 (CPU-bound work on ForkJoinPool/parallel streams versus I/O-bound on virtual threads — the map calls it 'a genuine 2026 decision point the corpus does not fully resolve'), M-N-06 (ExecutorService shutdown on every exit path, and newVirtualThreadPerTaskExecutor()'s blocking close() under try-with-resources), M-N-07 (CompletableFuture chains with no terminal exceptionally/handle/whenComplete), M-N-08 (double-checked locking on a non-volatile field), M-N-09 (SimpleDateFormat in a shared static), M-N-10 (@GuardedBy/@Immutable/@ThreadSafe documentation), M-N-11 (the ReentrantReadWriteLock 65,536-reader ceiling and StampedLock.asReadWriteLock()). Concurrency is the corpus's largest agent-failure surface and these seven have no rule.\n\nThe question is not 'are they true' — it is which are rules and which are JAVA-LINT configuration. Error Prone and SpotBugs already catch four of them mechanically (DoubleCheckedLocking, DC_DOUBLECHECK, DateFormatConstant, GuardedBy), and rule-distillation says to drop a rule that only repeats what the linter already denies and state the lint config instead, one line. So: for each of the seven, establish from primary sources whether a default-on or promotable check exists, and in which of Error Prone's three lists it sits — read BuiltInCheckerSuppliers.java directly, per frame correction 30; the docs-site severity field is a different axis.\n\nThen decide, per row, exactly one of: (a) a JAVA-CONC rule row, with rule text, rationale, verification and severity; (b) a name added to JAVA-LINT-02's nine-check promotion list, with the exact -Xep: spelling; (c) a line in JAVA-LINT-10's SpotBugs residual clause; (d) prose in concurrency.md with no ID; (e) dropped. M-N-05 is the one that cannot be settled by a lint: fetch JEP 444's own scoping plus the ForkJoinPool.commonPool javadoc and produce a two-branch reading rule (CPU-bound stays on a sized pool; blocking-style I/O goes one-virtual-thread-per-task), not a preference. M-N-06's close() half is already JAVA-ERR-05 — cite it and do not duplicate it; this dive owns only pool sizing and the virtual-thread regime. M-N-11's citation is a single newsletter: either find a primary source (JDK source, javadoc, a JBS issue) or recommend it stay deferred, and say which.\n\nDeliver at most four new rule rows. A dive that returns seven rules has not done the filtering it was commissioned for."}, {"group": "bazel-java", "group_label": "Bazel-Java testing and coverage", "id_family": "BZL-JAVA", "slug": "bazel-java-testing-and-coverage", "label": "What is the minimum wiring that makes bazel test //... run a JUnit 5 suite and emit a readable coverage report?", "brief": "Conditional on owner Q6: if bazel-quality declines the thirteenth depth file, this dive is void. Assuming the standing default (draft it and offer it), BZL-JAVA is the only family in the program with no test and no coverage row. rules_java ships no first-party JUnit 5 rule, contrib_rules_jvm's java_junit5_test is the only path and BZL-JAVA-23 currently rates the whole ruleset CONSIDER for its lint wrappers alone, and coverage_report_generator is customised by 0/6 exemplars. The sibling testing.md owns sizing, timeouts, tags and `manual` semantics — not JUnit-platform wiring — so this is a real hole between two files, not a duplicate.\n\nFetch: bazel.build/reference/be/java for java_test's attributes (test_class, runtime_deps, use_testrunner, main_class) and its implicit outputs; bazel.build's Java coverage and code-coverage-with-Bazel pages for JAVA_COVERAGE_TOOL/jacoco wiring, --combined_report, and coverage_report_generator; bazel-contrib/rules_jvm's README and docs for java_junit5_test and java_test_suite, including its apple_rules_lint dependency and whether that dependency is required for the test rules or only for the lint wrappers. Read the six Bazel-carrying exemplars at their pinned SHAs for any JUnit 5 target and any coverage configuration; report honestly if there is none.\n\nSettle four things. (1) The minimum BUILD-file wiring for a JUnit 5 suite under Bazel: exactly which deps, which rule, and whether Bazel's own java_test with a hand-written JUnit Platform launcher main_class is a viable second path. (2) Whether adopting java_junit5_test drags in apple_rules_lint, and whether that changes BZL-JAVA-23's CONSIDER rating for the test rules specifically — BZL-JAVA-23 explicitly calls the test rules 'a separate, unblocked decision', so answer it. (3) What `bazel coverage //...` emits for Java by default, whether it is a format a JAVA-TEST-style floor can read, and what a coverage_report_generator customisation buys. (4) Whether a per-target floor is expressible under Bazel at all, or whether coverage enforcement is necessarily a CI step over the combined report.\n\nDeliver two to four BZL-JAVA rows with runnable verifications, each stating what empty output means, plus one explicit sentence naming which parts route to the sibling testing.md rather than living here. Every flag carries the Bazel version it was read against; no bazel binary is available, so a flag claim is a doc claim and must say so."}]
const ALREADY = (["jvm-bazel-java.md — \"Bazel: the file the sibling set does not have\" (families BZL-JAVA)", "jvm-concurrency.md — \"Concurrency: the correctness surface agents get wrong most (JAVA-CONC + KT-CORO)\" (families - JAVA-CONC)", "jvm-dependencies.md — \"Dependencies — what version wins, and can you trust it\" (families - GRADLE-DEP)", "jvm-distribution.md — \"Distribution: what actually ships (GRADLE-DIST)\" (families GRADLE-DIST)", "jvm-gradle-core.md — \"Gradle: the build that configures itself correctly\" (families [GRADLE-CACHE, GRADLE-STRUCT])", "jvm-gradle-plugin-dev.md — \"Gradle: the plugin as a product\" (families GRADLE-PLUG)", "jvm-gradle-settings.md — \"Gradle: the settings-time surface\" (families GRADLE-PLUG)", "jvm-java-runtime-safety.md — \"Java runtime safety: untrusted input and failure handling\" (families [JAVA-SEC, JAVA-ERR])", "jvm-language-api.md — \"Language: the surface the SDK publishes\" (families [JAVA-API, KT-API])", "jvm-maven-and-ant.md — \"Maven and Ant: the other half of the ecosystem (MVN-BUILD)\" (families MVN-BUILD)", "jvm-platform-and-toolchains.md — \"Platform and toolchains: JDK floors, determinism, and the Kotlin toolchain\" (families [JAVA-PLAT, KT-COMP])", "jvm-publishing.md — \"Publishing: getting an artifact out, and keeping consumers working\" (families GRADLE-PUB)", "jvm-quality-gates.md — \"Quality gates: what fails the build (JAVA-LINT + JAVA-TEST)\" (families - JAVA-LINT)"]).map(s => `- ${s}`).join('\n') || '- (nothing consolidated yet)'
const EXISTING = new Set(["bazel-java", "concurrency", "dependencies", "distribution", "gradle-core", "gradle-plugin-dev", "gradle-settings", "java-runtime-safety", "language-api", "maven-and-ant", "platform-and-toolchains", "publishing", "quality-gates"])

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- This is wave ${WAVE} of the research program that makes an AI-agent fleet expert in the JVM ecosystem: Java, Kotlin/JVM, Gradle (including plugin development), Maven, Ant as legacy, Bazel for Java/Kotlin, SDK authoring, dependency management, fat/shadow jars and distribution, linting, testing and coverage. Its output becomes AI-agent configuration (glob-scoped rules with support directories, at most two skills, a bundle) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore).
- Read the frame first (${FRAME}, including its Corrections), then the topic map (${MAP}): its "Conflicts resolved", "Artifact set decision" and the row(s) your brief cites. The map's decisions bind you; your job is depth, not re-deciding the artifact shape.
- THE FLEET HAS NO JAVA OR KOTLIN CODE. Evidence comes from the exemplar corpus of 32 upstream repositories under ${EX}/<owner>__<repo> (blob-less depth-1 clones; \`git -C <dir> ls-tree -r --name-only HEAD\` lists paths, build files are checked out, \`git -C <dir> show HEAD:<path>\` fetches any other file). The four audits under ${RESEARCH}/jvm-audit/ already measured them — cite the audits, and re-measure only what your brief needs. Never run gradle, mvn, bazel or java; none is installed.
- The two future consumers the artifacts must serve on day one: an OCX SDK for the JVM (mirroring /home/mherwig/dev/ocx-sdk-python) and an OCX Gradle plugin (mirroring /home/mherwig/dev/rules_ocx and /home/mherwig/dev/setup-ocx). See jvm-audit/config-inventory.md for their contracts.
- Sibling lore sets own Cargo/pyproject/package.json/docs/Bazel-core topics; the sibling Bazel program (read-only at /home/mherwig/dev/grimoire-lore/.agents/research/bazel-*) owns bzlmod, hermeticity, caching, CI and flags — a Bazel-Java dive covers rules_java/rules_jvm_external/rules_kotlin only.
- Use read-only tools everywhere; the only file you may create or modify is your own OUTPUT FILE. Date everything ${DATE}; version-tag every Java/Kotlin/Gradle/Maven/Bazel-specific claim.

ALREADY COVERED (do not re-tread; cite these consolidations' rule IDs instead):
${ALREADY}
`

const DIVE_CONTRACT = (path) => `OUTPUT FILE: ${path}
Write it with the Write tool; create parent directories as needed.

Structure, in this order:
1. YAML frontmatter: title, topic, agent (your label), model: sonnet, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone actionable claim.
4. "## Findings" — numbered subsections. EVERY non-obvious claim carries an inline citation as a markdown link to the exact URL read, or a repo@sha:path:line into the exemplar corpus. Correct and incorrect code or build-script side by side wherever a rule is easier shown than told (Kotlin DSL for Gradle examples unless the map says otherwise). Exact plugin ids, task names, flag names, lint/check names, artifact coordinates, exact command lines, exact numeric thresholds, with the version/era they apply to.
5. "## Normative guidance candidates" — numbered, crisp, checkable imperative rules distilled from the findings, each with: the rule, a one-line rationale, and how a reviewer VERIFIES it (a grep, a lint or Error Prone/detekt check name, a Gradle task or Maven goal, a plugin's report, or a named reading heuristic). This is the section that matters most — make it dense and specific.
6. "## Exemplar evidence" — which exemplars already satisfy, violate or contradict each candidate, with repo@sha:path:line (from the audits or your own re-measurement).
7. "## AI-agent angle" — what an LLM characteristically gets WRONG here (outdated idioms it was trained on — Groovy-era Gradle, JUnit 4, javax, kapt, OSSRH, pre-K2 Kotlin; hallucinated plugin ids or APIs; patterns that build but are wrong) and the smallest mechanical check that catches each mistake.
8. "## Contested / evolving" — where practice genuinely disagrees or recently changed, and which way it is trending, as of when.
9. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 12 distinct sources, at least 6 primary (official docs, JEPs, the tool's own repository or release notes, specs, talks).

Hard requirements:
- Call ToolSearch with query "select:WebSearch,WebFetch" FIRST to load the web tools, then research. For GitHub-hosted markdown prefer \`curl -sL https://raw.githubusercontent.com/...\` through Bash so you read the whole file.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE}; flag historical-only guidance with the version it stopped applying.
- No "it depends" without saying what it depends on.
- Do not modify any file other than your output file.`

const DIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'sources_count', 'top_rules', 'surprises'],
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    top_rules: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    surprises: { type: 'array', items: { type: 'string' }, maxItems: 6, description: 'findings the brief did not anticipate and that deserve their own round' },
  },
}

const CONSOLIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'rule_ids', 'conflicts_resolved', 'needs_another_round', 'must_count'],
  properties: {
    path: { type: 'string' },
    rule_ids: { type: 'array', items: { type: 'string' }, description: 'ID — imperative, one per rule' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    needs_another_round: { type: 'array', items: { type: 'string' }, description: 'subarea + the question, one per line' },
    must_count: { type: 'number' },
  },
}

function dive(item) {
  const path = `${RESEARCH}/jvm-${item.group}/${item.slug}.md`
  return agent(
    `Model rationale: sonnet — online research and source digestion; volume work whose cost is in pages read, not in judgment.

${CONTEXT}

YOUR SUBAREA: ${item.label} (group: ${item.group_label}; rule family: ${item.id_family})

RESEARCH BRIEF (from the topic map; follow it exactly):
${item.brief}

${DIVE_CONTRACT(path)}

Return ONLY the structured receipt: the output path, source count, your 8 strongest normative rules as one-liners, and up to 6 surprises.`,
    { label: `dive:${item.group}/${item.slug}`, phase: 'Dive', model: 'sonnet', effort: 'high', schema: DIVE_SCHEMA },
  )
}

function consolidate(group, items) {
  const path = `${RESEARCH}/jvm-${group}.md`
  const dir = `${RESEARCH}/jvm-${group}/`
  const families = [...new Set(items.map(i => i.id_family))]
  const family = families.join(' + ')
  const label = items[0].group_label
  const revise = EXISTING.has(group)
  const task = revise
    ? `You are REVISING an existing consolidated artifact to fold in a follow-up round it itself commissioned.

Read ${path} IN FULL, then every file in ${dir} in full — including the new artifact(s) this round produced: ${items.map(i => i.slug + '.md').join(', ')}.

Rewrite ${path} in place, preserving its structure:
- ID STABILITY IS A HARD CONTRACT. Every existing rule ID keeps its number and its meaning. Do not renumber, do not reorder into different IDs, do not reuse a retired number.
- New rules get NEW IDs continuing the sequence.
- If the follow-up CONTRADICTS an existing rule, change that rule's text in place and record the change — never leave both standing. A rule that overclaims a guarantee the new research shows does not exist is the most dangerous kind; fix it explicitly.
- Update the Verdict for whatever the follow-up settled, and REMOVE from Open questions whatever it answered. Where the research established a GAP rather than an answer, move it into the Verdict as a documented gap.
- Add or extend a "## Revision log": one line per change — what, which IDs, why.
- Update the frontmatter's consolidates list and add a revised: ${DATE} key.`
    : `You are consolidating a topic into the single authoritative artifact a later author works from.

Read EVERY file in ${dir} (list it first; read each in full), plus the four audits under ${RESEARCH}/jvm-audit/ and the topic map's rows for this group.

Write ${path}:
1. YAML frontmatter: title, topic, model: opus, id_family: ${families.join(', ')}, consolidates (the file list), date: ${DATE}.
2. "## Verdict" — 5-15 lines: the position this program takes, stated as DECISIONS, not as a survey. Where sub-researchers disagreed, decide and say why. Name the consumer kind each decision binds (library / application / Gradle plugin / CLI / SDK) when it differs.
3. "## The ruleset" — merged, de-duplicated, numbered rules, one subsection per ID family this group owns (${families.join(', ')} — each dive's brief names its family; a family's rules are the ones an agent needs while editing that family's file kind, so keep GRADLE- and MVN- rows apart even when they answer the same question). Each entry: ID (<FAMILY>-nn), the rule as an imperative sentence, rationale (one line), verification (exact command, task, lint or check name, or grep), severity (MUST / SHOULD / CONSIDER), and the version floor it assumes if any. Drop rules that are generic model common knowledge and would not change behaviour; keep the ones an agent gets wrong without being told. Smallest set with the highest yield. Group rows by the check that catches them.
4. "## Applied to the exemplars and the two future consumers" — which rules the strict exemplars already satisfy, which prominent exemplars violate (repo@sha:path:line from the audits or sub-artifacts), and which are new commitments for the OCX SDK and the OCX Gradle plugin.
5. "## AI-agent failure modes" — merged, ranked by how often it bites, each with the mechanical check.
6. "## Open questions" — what needs an owner decision, and which subarea deserves ANOTHER research round (name the subarea and the question).
7. "## Sub-artifacts" — relative markdown links to each jvm-${group}/<file>.md with a one-line description.
8. "## Key sources" — the 10-15 best URLs across all sub-artifacts.

Merge rules: no claim without a citation that traces to a sub-artifact or a URL; no duplicated rules; prefer the more specific formulation; when two sub-artifacts conflict, state the conflict and resolve it with a reason. A consolidation with no resolved conflict and no "violated" row is a survey wearing a verdict's clothes — do not produce one.`

  return agent(
    `Model rationale: opus — synthesis across conflicting sources plus normative decisions that later become enforced rules.

${CONTEXT}

TOPIC: ${label} (family ${family})

${task}

Do not modify any file other than ${path}.

Return ONLY the structured receipt: path, rule IDs with one-line imperatives, conflicts resolved, subareas needing another round, and the MUST count.`,
    { label: `${revise ? 'revise' : 'consolidate'}:${group}`, phase: 'Consolidate', model: 'opus', effort: 'high', schema: CONSOLIDATE_SCHEMA },
  )
}

// ---------------------------------------------------------------- Run
const groups = {}
for (const item of SELECTION) (groups[item.group] = groups[item.group] || []).push(item)
const entries = Object.entries(groups)
log(`Wave ${WAVE}: ${SELECTION.length} dives across ${entries.length} groups (${entries.map(([g, i]) => `${g}×${i.length}`).join(', ')}); revising: ${entries.filter(([g]) => EXISTING.has(g)).map(([g]) => g).join(', ') || 'none'}`)

const results = await pipeline(
  entries,
  ([group, items]) => parallel(items.map(item => () => dive(item).then(r => ({ slug: item.slug, ...(r || {}) , ok: !!r })))),
  (dives, [group, items]) => {
    const ok = dives.filter(Boolean).filter(d => d.ok)
    if (!ok.length) { log(`SKIP consolidate:${group} — every dive dropped`); return { group, dives, consolidation: null } }
    if (ok.length < items.length) log(`consolidate:${group} proceeding with ${ok.length}/${items.length} dives`)
    return consolidate(group, items).then(c => ({ group, dives, consolidation: c }))
  },
)

const out = results.filter(Boolean)
const surprises = out.flatMap(r => (r.dives || []).filter(Boolean).flatMap(d => (d.surprises || []).map(s => `${r.group}/${d.slug}: ${s}`)))
const another = out.flatMap(r => ((r.consolidation && r.consolidation.needs_another_round) || []).map(s => `${r.group}: ${s}`))
const musts = out.reduce((n, r) => n + ((r.consolidation && r.consolidation.must_count) || 0), 0)
log(`Wave ${WAVE} done: ${out.length}/${entries.length} groups consolidated · ${musts} MUST rules · ${surprises.length} surprises · ${another.length} follow-ups`)
return { wave: WAVE, groups: out, surprises, needs_another_round: another, must_count: musts }
