#!/usr/bin/env python3
"""Emit the phase-7 authoring plan (from jvm-topic-map.md › Authoring notes §1-2, §10-11)
and generate the batch workflow scripts from jvm-author.template.mjs.

usage: mkplan.py <date> [--kt-err]   # --kt-err adds kotlin-quality/errors-and-resources.md (wave-4 decision)
"""
import json
import sys

DATE = sys.argv[1]
KT_ERR = '--kt-err' in sys.argv
SC = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/.agents/research/jvm-topic-map/scratch'
CORE_HINT = 'the three CORE rows (never weaken the check; watched go red; empty output stated) per Authoring notes §3'

java = {
    'rule': 'java-quality', 'core_family': 'JAVA-CORE', 'glob_list': ['**/*.java'],
    'index_sources': ['jvm-quality-gates.md', 'jvm-language-api.md', 'jvm-java-runtime-safety.md', 'jvm-platform-and-toolchains.md', 'jvm-concurrency.md'],
    'depth': [
        {'file': 'api-and-evolution.md', 'family': 'JAVA-API', 'sources': ['jvm-language-api.md', 'jvm-platform-and-toolchains.md'], 'task_hint': 'changing a public signature, annotating nullness on an API, choosing a return type, deciding what a library exposes, wiring japicmp'},
        {'file': 'data-and-patterns.md', 'family': 'JAVA-DATA', 'sources': ['jvm-topic-map.md', 'jvm-topic-map/canonical-java.md', 'jvm-language-api.md'], 'task_hint': 'writing a record, a sealed hierarchy, a switch over a closed type, equals/hashCode, or an Optional (map rows M-L-01..08; no consolidation — draw from the canonical-java scout and Error Prone / SonarJava checks named there)'},
        {'file': 'nullness.md', 'family': 'JAVA-NULL', 'sources': ['jvm-topic-map.md', 'jvm-quality-gates.md', 'jvm-language-api.md'], 'task_hint': 'adding a nullness annotation, choosing between JSpecify and older flavours, marking a package @NullMarked (map rows M-M-01..07; tooling rows are JAVA-LINT-04/05/06 and contract rows JAVA-API-09/10/11 — cite, do not restate)'},
        {'file': 'concurrency.md', 'family': 'JAVA-CONC', 'sources': ['jvm-concurrency.md'], 'task_hint': 'starting a thread or virtual thread, choosing a lock, bounding a fan-out, spawning a subprocess, using a preview concurrency API'},
        {'file': 'errors-and-resources.md', 'family': 'JAVA-ERR', 'sources': ['jvm-java-runtime-safety.md'], 'task_hint': 'catching, rethrowing, closing a resource, handling InterruptedException, exiting'},
        {'file': 'security-and-untrusted-input.md', 'family': 'JAVA-SEC', 'sources': ['jvm-java-runtime-safety.md'], 'task_hint': 'deserialising, parsing XML, building a path or a command from outside data, picking a random source, wiring find-sec-bugs'},
        {'file': 'platform-and-versions.md', 'family': 'JAVA-PLAT', 'sources': ['jvm-platform-and-toolchains.md'], 'task_hint': 'choosing a JDK floor or --release, writing module-info, touching charset, locale or timezone, reacting to a removed JDK API'},
        {'file': 'lint-gate.md', 'family': 'JAVA-LINT', 'sources': ['jvm-quality-gates.md', 'jvm-java-runtime-safety.md'], 'task_hint': 'wiring Error Prone, NullAway, Checkstyle or SpotBugs, choosing -Xlint keys, suppressing a warning'},
        {'file': 'testing.md', 'family': 'JAVA-TEST', 'sources': ['jvm-quality-gates.md', 'jvm-platform-and-toolchains.md'], 'task_hint': 'writing a JUnit test, configuring parallel execution, setting a coverage floor, picking JUnit 5 or 6'},
    ],
}
kotlin = {
    'rule': 'kotlin-quality', 'core_family': 'KT-CORE', 'glob_list': ['**/*.kt', '**/*.kts'],
    'index_sources': ['jvm-language-api.md', 'jvm-concurrency.md', 'jvm-platform-and-toolchains.md', 'jvm-quality-gates.md'],
    'depth': [
        {'file': 'api-and-abi.md', 'family': 'KT-API', 'sources': ['jvm-language-api.md'], 'task_hint': 'changing a public Kotlin signature, a default parameter, a data class in an API, explicit API mode, BCV or abiValidation'},
        {'file': 'coroutines.md', 'family': 'KT-CORO', 'sources': ['jvm-concurrency.md'], 'task_hint': 'launching a coroutine, choosing a dispatcher, handling cancellation or an exception in a coroutine, testing with runTest'},
        {'file': 'java-interop.md', 'family': 'KT-INTEROP', 'sources': ['jvm-topic-map.md', 'jvm-topic-map/canonical-kotlin.md', 'jvm-language-api.md'], 'task_hint': 'exposing Kotlin to Java callers or calling Java from Kotlin: @JvmStatic/@JvmOverloads/@Throws, platform types, nullability flags (map rows M-V-01..08; no consolidation — draw from the canonical-kotlin scout)'},
        {'file': 'compiler-and-toolchain.md', 'family': 'KT-COMP', 'sources': ['jvm-platform-and-toolchains.md'], 'task_hint': 'setting jvmToolchain or jvmTarget, a -X compiler flag, K2 migration, KSP versus kapt, Kotlin version floors'},
        {'file': 'lint-gate.md', 'family': 'KT-LINT', 'sources': ['jvm-topic-map.md', 'jvm-concurrency.md', 'jvm-quality-gates.md'], 'task_hint': 'wiring detekt or ktlint, activating rules, .editorconfig for ktlint (map rows M-R-07..11; the detekt-activation row is KT-CORO-01 — cite it)'},
        {'file': 'testing.md', 'family': 'KT-TEST', 'sources': ['jvm-topic-map.md', 'jvm-platform-and-toolchains.md', 'jvm-concurrency.md'], 'task_hint': 'writing a Kotlin test, Kover coverage and its check wiring, kotlinx-coroutines-test (map rows M-S-03/10/11; cite KT-CORO-11/12/13)'},
    ],
}
if KT_ERR:
    kotlin['depth'].append({'file': 'errors-and-resources.md', 'family': 'KT-ERR', 'sources': ['jvm-java-runtime-safety.md'], 'task_hint': 'catching in Kotlin, runCatching and CancellationException, use {} for resources, @Throws on a published API, exitProcess'})
gradle = {
    'rule': 'gradle-build', 'core_family': 'GRADLE-CORE',
    'glob_list': ['**/*.gradle.kts', '**/*.gradle', '**/gradle.properties', '**/*.versions.toml', '**/gradle/wrapper/gradle-wrapper.properties', '**/gradle/verification-metadata.xml', '**/gradle.lockfile', '**/buildscript-gradle.lockfile'],
    'index_sources': ['jvm-gradle-core.md', 'jvm-gradle-settings.md', 'jvm-dependencies.md', 'jvm-gradle-plugin-dev.md'],
    'depth': [
        {'file': 'structure-and-conventions.md', 'family': 'GRADLE-STRUCT', 'sources': ['jvm-gradle-core.md', 'jvm-gradle-settings.md'], 'task_hint': 'adding a subproject or a convention plugin, choosing buildSrc or build-logic, wiring a version catalog, editing settings.gradle.kts or gradle.properties'},
        {'file': 'dependencies.md', 'family': 'GRADLE-DEP', 'sources': ['jvm-dependencies.md'], 'task_hint': 'declaring a dependency, choosing api/implementation/compileOnly, importing a BOM or platform, resolving a conflict, locking or verifying dependencies, bumping a version'},
        {'file': 'caching-and-correctness.md', 'family': 'GRADLE-CACHE', 'sources': ['jvm-gradle-core.md'], 'task_hint': 'writing a task or a build script that must survive the configuration cache, declaring task inputs and outputs, reading an environment variable or a file at configuration time, running with --configuration-cache in CI'},
        {'file': 'toolchains-and-compilation.md', 'family': 'GRADLE-TOOL', 'sources': ['jvm-topic-map.md', 'jvm-platform-and-toolchains.md', 'jvm-gradle-core.md'], 'task_hint': 'declaring a Java toolchain, options.release, encoding, the foojay resolver, compiler flags in a build file (map rows M-E-01..08 plus JAVA-PLAT-12 Gradle half and JAVA-PLAT-13 relocated here per frame correction 72)'},
        {'file': 'plugin-authoring.md', 'family': 'GRADLE-PLUG', 'sources': ['jvm-gradle-plugin-dev.md', 'jvm-gradle-settings.md'], 'task_hint': 'writing a Gradle plugin or a Settings plugin: task and property annotations, ValueSource and BuildService, TestKit matrix, validatePlugins, publishing to the Plugin Portal, Gradle version floors'},
        {'file': 'distribution.md', 'family': 'GRADLE-DIST', 'sources': ['jvm-distribution.md'], 'task_hint': 'shipping an application: shadow jar, application plugin, jlink, jpackage, Jib, Spring Boot repackaging; deciding whether a library may shade at all (DIST-03 rewritten and DIST-13 rationale replaced per contradictions 1 and 22)'},
        {'file': 'publishing.md', 'family': 'GRADLE-PUB', 'sources': ['jvm-publishing.md'], 'task_hint': 'publishing to Maven Central from Gradle: publications, POM metadata, signing, Gradle Module Metadata, mavenLocal, version schemes'},
        {'file': 'ci.md', 'family': 'GRADLE-CI', 'sources': ['jvm-topic-map.md', 'jvm-audit/exemplar-publishing-ci-bazel.md', 'jvm-gradle-core.md'], 'task_hint': 'writing a CI workflow that runs Gradle: setup-gradle, cache read-only on PRs, wrapper validation, JDK matrix, dependency submission (map rows M-I-01..07; cross-reference GRADLE-STRUCT-12)'},
    ],
}
maven = {
    'rule': 'maven-build', 'core_family': 'MVN-CORE',
    'glob_list': ['**/pom.xml', '**/.mvn/**', '**/mvnw', '**/mvnw.cmd', '**/build.xml', '**/ivy.xml', '**/ivysettings.xml'],
    'index_sources': ['jvm-maven-and-ant.md', 'jvm-dependencies.md', 'jvm-publishing.md'],
    'depth': [
        {'file': 'dependencies.md', 'family': 'MVN-DEP', 'sources': ['jvm-dependencies.md'], 'task_hint': 'declaring a Maven dependency or BOM import, scopes, dependencyManagement, enforcer rules, resolving nearest-wins surprises'},
        {'file': 'lifecycle-and-plugins.md', 'family': 'MVN-BUILD', 'sources': ['jvm-maven-and-ant.md'], 'task_hint': 'binding a plugin to a phase, compiler release and annotation processing, surefire and failsafe, the wrapper and .mvn config, Maven 4 readiness'},
        {'file': 'publishing.md', 'family': 'MVN-PUB', 'sources': ['jvm-publishing.md'], 'task_hint': 'publishing to Maven Central from Maven: central-publishing-maven-plugin, signing, sources and javadoc jars, reproducible outputTimestamp'},
        {'file': 'ant-legacy.md', 'family': 'MVN-ANT', 'sources': ['jvm-maven-and-ant.md'], 'task_hint': 'opening a build.xml or an Ivy file: what it encodes, what a migration must preserve, maven-antrun-plugin'},
    ],
}

RESEARCH = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/.agents/research'
ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
standalone = [
    {'kind': 'skill', 'path': f'{ROOT}/skills/jvm-release/SKILL.md',
     'sources': ['jvm-publishing.md', 'jvm-language-api.md', 'jvm-maven-and-ant.md', 'jvm-bazel-java.md', f'{ROOT}/skills/docs-plan/SKILL.md', f'{ROOT}/.claude/skills/research-lang/references/validation.md'],
     'brief': 'Write the jvm-release skill per Authoring notes §10: a procedure, not a standard. Frontmatter as skills/docs-plan/SKILL.md (name = directory, a third-person description with a "Use when" clause under 1024 chars that a user would type, license Apache-2.0, metadata.summary and metadata.keywords). Body under 400 lines: open with the Central Portal immutability statement (the dropped GRADLE-PUB-03), then the ordered runbook — verify the namespace, check the tag against the declared version before any build, run the binary-compatibility gate (japicmp or BCV) before sign/checksum/upload, assemble the required per-file set (sources jar, javadoc or Dokka jar, per-file signature, checksums, complete POM), set autoPublish and waitUntil = published, treat OSSRH and nexus-staging-maven-plugin as dead paths, and the Bazel line (Bazel hands off to Gradle or Maven for publishing; cite jvm-bazel-java.md if it settled java_export). Cover Gradle and Maven side by side where only the plugin differs. Duplicate the MUST rows this procedure enforces in a | # | Finding | Rule | table with the rule ID LAST. Add a references/ file only if the SKILL.md would exceed 400 lines. Run the checker on the skill directory.'},
    {'kind': 'skill', 'path': f'{ROOT}/skills/jvm-dependency-triage/SKILL.md',
     'sources': ['jvm-dependencies.md', 'jvm-gradle-core.md', 'jvm-audit/exemplar-publishing-ci-bazel.md', f'{ROOT}/skills/docs-plan/SKILL.md'],
     'brief': 'Write the jvm-dependency-triage skill per Authoring notes §10: three entry points — (1) a version you did not choose (dependencyInsight / dependency:tree -Dverbose, nearest-wins vs highest-wins vs version_conflict_policy, the Guava listenablefuture 9999.0 case), (2) a declaration that is wrong (dependency-analysis plugin projectHealth, api versus implementation, compileOnly needed at runtime), (3) a version you are about to bump (resolve every coordinate against the real repository before emitting it, and the Dependabot-versus-Renovate interaction in one sentence). Frontmatter as skills/docs-plan/SKILL.md. Body under 350 lines, each entry point an ordered procedure with the exact commands for Gradle and Maven and what each output shape means. Duplicate the MUST rows it enforces in a | # | Finding | Rule | table with the rule ID LAST. Run the checker on the skill directory.'},
    {'kind': 'handoff', 'path': f'{RESEARCH}/handoff/bazel-quality-java.md',
     'sources': ['jvm-bazel-java.md', '/home/mherwig/dev/grimoire-lore/rules/bazel-quality/rust.md', '/home/mherwig/dev/grimoire-lore/rules/bazel-quality.md'],
     'brief': 'Write the Bazel-Java depth file per Authoring notes §11, in the EXACT shape of the shipped rules/bazel-quality/rust.md: frontmatter title + summary only (no paths); "# Java and Kotlin under Bazel"; the owns / does-not-own paragraph naming what BZL-JAVA owns, what java-quality / kotlin-quality / gradle-build / maven-build own, and the sibling families cited never restated; a Contents line; the measurement paragraph with the pinned versions (Bazel 8.7.0 / 8.8.0 / 9.2.0, rules_jvm_external 7.1 of 2026-07-23, rules_kotlin v2.4.10 of 2026-08-20), the date, the "no bazel binary was run" disclosure and rust.md\'s two-help-surfaces rule; sections grouped by the check that clears them matching jvm-bazel-java.md groups A to F, then "## Gaps" and "## What Agents Get Wrong Here". Aim for about 250 lines. Route into siblings by their SHIPPED names (bzlmod.md, hermeticity.md, caching.md, testing.md, flags.md, architecture.md, starlark.md, ci.md). Fix BZL-JAVA-14\'s cross-reference (contradiction 17) and drop BZL-JAVA-17 and BZL-JAVA-20 per §6. Also write a second file at the same directory, bazel-quality-index-row.md, containing only the one routing row to add after the cpp.md row of bazel-quality.md\'s "Where the Depth Is" table, exactly as §11 gives it. Run the checker on the handoff file.'},
]

plan_a = {'rules': [java, maven], 'standalone': standalone}
plan_b = {'rules': [kotlin, gradle], 'standalone': []}
tpl = open(f'{SC}/jvm-author.template.mjs').read()
for name, plan in (('a', plan_a), ('b', plan_b)):
    s = tpl.replace('__BATCH__', name).replace('__DATE__', DATE).replace('__PLAN__', json.dumps(plan, ensure_ascii=False))
    for ph in ('__BATCH__', '__DATE__', '__PLAN__'):
        assert ph not in s
    open(f'{SC}/jvm-author-{name}.mjs', 'w').write(s)
    n = sum(len(r['depth']) for r in plan['rules'])
    print(f'batch {name}: {len(plan["rules"])} rules, {n} depth, {len(plan["rules"])} index, {len(plan["standalone"])} standalone -> {n + len(plan["rules"]) + len(plan["standalone"])} agents')
json.dump({'a': plan_a, 'b': plan_b}, open(f'{SC}/author-plan.json', 'w'), indent=1)
