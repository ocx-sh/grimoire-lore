export const meta = {
  name: 'jvm-fix-b',
  description: 'JVM research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build.md",
  "model": "sonnet",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build.md",
    "line": 168,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The Siblings bullet states \"Bazel does not publish to Central itself\" as settled fact. The topic map's Wave 4 landed section lists it as still open: \"java_export / Maven Central publishing from Bazel \u2014 does rules_jvm_external's java_export/maven_publish produce a Central-Portal-acceptable bundle ... or is Bazel a non-publisher that always hands off to Gradle or Maven? (carried, unchanged)\". An open question stated flatly in an always-loaded index is the shape the program elsewhere flags as teaching a fiction.",
    "fix": "Replace \"Bazel does not publish to Central itself, and that half is governed here.\" with \"Whether `rules_jvm_external`'s `java_export` can produce a Portal-acceptable bundle was unresolved as of 2026-09-12; the hand-off-to-Gradle path, which is dagger's own answer, is governed here.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/ci.md",
  "model": "sonnet",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/ci.md",
    "line": 127,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "GRADLE-CI-09's verification writes `uses-lines.txt` into the working tree (an untracked artifact a reviewer then has to clean up, and one that lands in the diff if the check runs before `git add -A`), and `-h` strips the filename so the printed findings carry a bare line number that cannot be traced to a workflow file. Run against a planted tag-pinned fixture it did go red and against a SHA-pinned one it went green, but in both runs it also printed the `./`-prefixed local action the cell has to except by hand.",
    "fix": "Replace the two-command form with a single pipeline that needs no temp file and applies the local-action exemption mechanically: `grep -rn --include='*.yml' --include='*.yaml' -e 'uses:' .github/workflows/ \\| grep -vE -e '@[0-9a-f]{40}' -e 'uses:[[:space:]]*\\./'`. Every line printed is the finding, and empty output is the pass."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/dependencies.md",
  "model": "sonnet",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/dependencies.md",
    "line": 65,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "GRADLE-DEP-07 forbids four things and the rationale calls the grep \"the whole gate\", but the grep detects only three. Planted and run: a fixture declaring `implementation(\"com.acme:widget:[1.0,2.0)\")` \u2014 a version range, the rule's first named violation \u2014 produced no output, i.e. the MUST reads as a pass. The `+` suffix, `latest.*` and `-SNAPSHOT` fixtures all went red correctly and the compliant fixture went green. Separately, `-e '\\-SNAPSHOT'` makes GNU grep 3.8+ print `grep: warning: stray \\ before -` on every run, so a clean pass is never actually clean output.",
    "fix": "Replace the command with: `grep -rnE --include='*.gradle.kts' --include='*.gradle' --include='*.versions.toml' -e '[0-9]\\.\\+' -e 'latest\\.release' -e 'latest\\.integration' -e '[-]SNAPSHOT' -e ':[[:space:]]*\\[[0-9]' -e ':[[:space:]]*\\([0-9]' .`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/distribution.md",
  "model": "opus",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/distribution.md",
    "line": 65,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "GRADLE-DIST-05's static half is an inverted check with no empty-output clause, which is exactly what GRADLE-CORE-03 (SHOULD, same rule set) forbids. `grep -n -e '.RSA' build.gradle.kts` printing nothing means there is no signature-exclusion list at all \u2014 the violation \u2014 not the pass. It also takes a bare root-file operand rather than a directory plus `--include`, against authoring note 9, so it never reaches the shading module in a multi-module build, which is where every shadowJar in the measured corpus lives.",
    "fix": "Replace \"Statically, `grep -n -e '.RSA' build.gradle.kts` and confirm `.EC` sits in the same list.\" with \"Statically, `grep -rn --include='build.gradle.kts' --include='build.gradle' --include='pom.xml' -e 'META-INF/\\*\\.RSA' .` and confirm `.EC` sits in the same list. **Empty output here is the finding, not the pass**, because it means no signature exclusion exists anywhere.\""
   },
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/distribution.md",
    "line": 102,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "GRADLE-DIST-12 (MUST) states \"Shadow 9.3.0 and above require Gradle 9.0 and Java 17, current line 9.6.1\". GRADLE-PLUG-21 in plugin-authoring.md:151 states \"Shadow 9.5.0 and later need Gradle 9.2 and Java 17\". Both are copied verbatim from their consolidations (jvm-distribution.md DIST-12 floor column; jvm-gradle-plugin-dev.md PLUG-21 floor column) and the topic map's Cross-consolidation contradictions table never resolved them. As shipped, DIST-12's \"and above\" is falsified for 9.5.0+ by its own sibling, and it names 9.6.1 as the current line in the same breath \u2014 so an agent on Gradle 9.0 reading distribution.md adopts Shadow 9.6.1 and the build hard-fails.",
    "fix": "In GRADLE-DIST-12's Rationale, replace \"Shadow 9.3.0 and above require Gradle 9.0 and Java 17, current line 9.6.1 (2026-07-22, verified 2026-09-12).\" with \"Shadow 9.3.0 requires Gradle 9.0 and Java 17, and 9.5.0 and later raise that to Gradle 9.2 (`GRADLE-PLUG-21` carries the same floor); current line 9.6.1 (2026-07-22, verified 2026-09-12).\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/plugin-authoring.md",
  "model": "sonnet",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/plugin-authoring.md",
    "line": 82,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "GRADLE-PLUG-24's grep half states only what a hit means (\"A hit inside a class implementing `ValueSource` is a violation on sight\") and never what empty output means. Empty output from `grep -rn -e 'MessageDigest' -e 'sha256' src` on a plugin that provisions a binary means no hash is computed anywhere, which is the MUST violated outright \u2014 the strongest possible finding read as a clean pass. GRADLE-CORE-03 names this defect class and this cell is an instance of it.",
    "fix": "After \"...and the `check(...)` must sit in the service or a task action.\" insert: \"**Empty grep output is the finding, not the pass, on a plugin that provisions a binary: it means no hash is computed at all.**\""
   },
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/plugin-authoring.md",
    "line": 151,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "GRADLE-PLUG-21 (SHOULD) and GRADLE-DIST-12 (MUST, distribution.md:102) define the same finding \u2014 a `com.github.johnrengelman.shadow` hit \u2014 at two severities, and both verification cells say \"a `johnrengelman` hit is the violation\". A review of a plugin module inherits MUST or SHOULD purely from which depth file happened to load, which is the tiering breakage rule-distillation's Severity section exists to prevent. The topic map's contradiction 1 named PLUG-21 as the surviving text for the *shading-is-opt-in* claim only and never adjudicated the dead-id half.",
    "fix": "In GRADLE-PLUG-21's Rule, replace \"Shading a plugin's own dependencies is opt-in through `com.gradleup.shadow`, never the dead `com.github.johnrengelman.shadow` id, and it does not imply relocation.\" with \"Shading a plugin's own dependencies is opt-in through `com.gradleup.shadow` (`GRADLE-DIST-12` owns the dead-id rule at MUST), and it does not imply relocation.\" In its Verification, replace \"A `johnrengelman` hit is the violation and empty output is the pass.\" with \"A `johnrengelman` hit is `GRADLE-DIST-12`'s finding, not this row's; empty output is the pass.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/publishing.md",
  "model": "opus",
  "checker_target": "rules/gradle-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/publishing.md",
    "line": 90,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "GRADLE-PUB-04's verification cannot go red for the one element its own rationale singles out. Planted and run: a generated POM carrying name/description/licenses/developers/scm but NO project-level <url> printed nothing \u2014 the loop passed. `grep -qE \"</?url>\"` matches the `<url>` inside the `<scm>` block, which every compliant POM has, so the check is satisfied by the scm URL alone. The rationale says \"`url` is the element that goes missing: present in 8 of 32\", i.e. the row exists precisely for the case the check cannot detect. The cell's \"empty output is the pass\" statement is therefore false. Same defect in MVN-PUB-07's `grep -q \"<$e>\"`, which is out of this set.",
    "fix": "Replace the verification cell with: `for e in name description url licenses developers scm; do [ \"$(xmllint --xpath \"boolean(/*/*[local-name()='$e'])\" build/publications/mavenJava/pom-default.xml 2>/dev/null)\" = true ] \\|\\| echo \"MISSING $e\"; done`. Any output is the finding, empty output is the pass. A grep on the element name cannot work here: `<url>` also appears inside `<scm>`, so a POM missing the project-level `url` \u2014 the element this row exists for \u2014 passes a grep. Run it against every publication that is deployed, not only the primary one."
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/publishing.md",
    "line": 90,
    "severity": "blocker",
    "kind": "style",
    "finding": "GRADLE-PUB-04's row has 8 pipe characters against a 6-pipe header (a `|` inside code splits the cell).",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row (one -e per alternative; a shell pipe or `||` written as `\\|`). Re-count to exactly 6 pipes."
   },
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/publishing.md",
    "line": 117,
    "severity": "fix",
    "kind": "style",
    "finding": "GRADLE-PUB-13's verification cell contains an unescaped `|` (`find . -maxdepth 3 -iname pom.xml | xargs -r dirname`), which ends the markdown cell. The row renders with six columns instead of five, so the Severity column shows `xargs -r dirname` and the real severity is lost. A 5-column table parse does not see this line as a rule definition at all, which is why GRADLE-PUB-13 reads as an undefined ID to any tool that scans rule rows. GRADLE-PUB-04:90 has the same defect via its `||`.",
    "fix": "Escape the pipe: change `` `find . -maxdepth 3 -iname pom.xml | xargs -r dirname` `` to `` `find . -maxdepth 3 -iname pom.xml \\| xargs -r dirname` ``. Apply the same `\\|\\|` escaping to GRADLE-PUB-04's cell at line 90."
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/gradle-build/publishing.md",
    "line": 117,
    "severity": "blocker",
    "kind": "style",
    "finding": "GRADLE-PUB-13's row has 7 pipe characters against a 6-pipe header (a `|` inside code splits the cell).",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row (one -e per alternative; a shell pipe or `||` written as `\\|`). Re-count to exactly 6 pipes."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality.md",
  "model": "sonnet",
  "checker_target": "rules/kotlin-quality.md",
  "findings": [
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality.md",
    "line": 68,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The index says six JAVA-* IDs; the table cites seven, and not one line each. The preamble to Non-Negotiables says \"The six `JAVA-*` IDs are defined in the `java-quality` sibling set and duplicated here as one line each\". The table cites seven distinct JAVA-* IDs \u2014 JAVA-PLAT-01 (row 4), JAVA-PLAT-10 and JAVA-LINT-02 (row 16), JAVA-API-09, JAVA-API-10, JAVA-API-12 and JAVA-SEC-01 (row 17) \u2014 and they are not one line each: rows 16 and 17 each bundle several. Authoring notes \u00a74 counts six shared *facts* (JSpecify is one fact carried by two IDs), not six IDs.",
    "fix": "In rules/kotlin-quality.md line 68, replace \"The six `JAVA-*` IDs are defined in the `java-quality` sibling\" / \"set and duplicated here as one line each, because a Kotlin-only adopter never\" / \"loads that set.\" with \"The six shared facts below are defined in the `java-quality` sibling set and duplicated here as a bare line citing their IDs, because a Kotlin-only adopter never loads that set.\""
   },
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality.md",
    "line": 83,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "The index carries five KT-ERR IDs where the notes bind it to two. The wave-4 authoring decision (jvm-topic-map.md \"Decision carried into authoring\" and \"Conflicts resolved in revision\" item 11) reads: \"Index budget resolved at two KT-ERR rows (KT-ERR-01, KT-ERR-03) in `rules/kotlin-quality.md`\", and jvm-java-runtime-safety.md restates it with the reason: \"`KT-ERR-02` is reviewer-facing, and `KT-ERR-04`/`KT-ERR-05` are detekt-config facts\". The shipped index carries three KT-ERR non-negotiable rows citing five IDs: row 10 (KT-ERR-01, KT-ERR-02), row 11 (KT-ERR-03), row 12 (KT-ERR-04, KT-ERR-05). Three of the five reach the always-loaded list against an explicit budget decision.",
    "fix": "In rules/kotlin-quality.md, in row 10 replace the Rule cell with \"Never wrap code that may throw a JVM `Error` or a test assertion in `runCatching { }`, because it catches `Throwable`, not `Exception`.\" and the ID cell with \"KT-ERR-01\". Delete row 12 entirely (the `| 12 | An exception constructed from a caught one passes it as the cause... | KT-ERR-04, KT-ERR-05 |` line) and renumber the following rows 13-18 down to 12-17."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/coroutines.md",
  "model": "opus",
  "checker_target": "rules/kotlin-quality.md",
  "findings": [
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/coroutines.md",
    "line": 89,
    "severity": "blocker",
    "kind": "style",
    "finding": "KT-CORO-02's row has 8 pipe characters against a 6-pipe header: a `|` inside a backticked command splits the Markdown cell, so the Verification and Severity columns render shifted and the row loses its tier.",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row: split a grep alternation into one -e per alternative, and write a shell pipe or a `||` as `\\|` (GFM escapes a pipe inside a code span with a backslash). Re-count: the row must have exactly 6 pipes."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/errors-and-resources.md",
  "model": "sonnet",
  "checker_target": "rules/kotlin-quality.md",
  "findings": [
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/errors-and-resources.md",
    "line": 18,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "KT-ERR routes `kotlin.Result` to KT-API, but the rule lives in KT-INTEROP-08. Three places in this file send the reader to `KT-API` / `api-and-abi.md` for `kotlin.Result` as a public return type: line 17-18 (\"`kotlin.Result<T>` as a public return type is `KT-API`'s (`api-and-abi.md`)\"), line 57 (\"The live question is the API-design one `KT-API` owns\") and line 158 (\"it lives in `KT-API`\"). api-and-abi.md contains no `Result` rule and does not claim the topic in its scope paragraph. The rule is KT-INTEROP-08 in java-interop.md, which is where authoring notes \u00a72 and topic-map row M-V-07 put it (\"M-V-07 | Is `kotlin.Result<T>` used as a public return type... | KT-INTEROP\"). A reader following the pointer reaches a file that does not say what was claimed.",
    "fix": "In rules/kotlin-quality/errors-and-resources.md: line 18, replace \"type is `KT-API`'s (`api-and-abi.md`).\" with \"type is `KT-INTEROP`'s (`java-interop.md`).\"; line 57, replace \"`KT-API` owns.\" with \"`KT-INTEROP` owns.\"; line 158, replace \"API-design one and it lives in `KT-API`.\" with \"API-design one and it lives in `KT-INTEROP`.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/java-interop.md",
  "model": "sonnet",
  "checker_target": "rules/kotlin-quality.md",
  "findings": [
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/java-interop.md",
    "line": 62,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "KT-INTEROP-03 asserts \"Checker Framework, JetBrains, Android, Eclipse, Lombok, RxJava3 and Vert.x are all in that set\" and gives `-Xnullability-annotations=@org.checkerframework.checker.nullness.qual:strict` as the worked example. The only admissible source for this file (canonical-kotlin.md \u00a713, the page-by-page read of kotlinlang's interop docs, which authoring notes \u00a72 names as `java-interop.md`'s sole source) lists the flavours as \"JetBrains, JSpecify, Android, JSR-305, FindBugs, Eclipse, Lombok, RxJava3, Vert.x\" \u2014 Checker Framework is not among them and FindBugs has been dropped from the shipped list. SHOULD row, so fix rather than blocker.",
    "fix": "In rules/kotlin-quality/java-interop.md line 62, replace \"Checker Framework, JetBrains, Android, Eclipse, Lombok, RxJava3 and Vert.x are all in that set.\" with \"JetBrains, Android, FindBugs, Eclipse, Lombok, RxJava3 and Vert.x are all in that set, and any flavour outside it \u2014 Checker Framework included \u2014 needs the same treatment.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/lint-gate.md",
  "model": "opus",
  "checker_target": "rules/kotlin-quality.md",
  "findings": [
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/lint-gate.md",
    "line": 59,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "Unquoted `--include=*.x` aborts the whole grep under zsh. Every verification cell in this file writes `--include=` unquoted (lines 58, 59, 60, 104, 105, 122), e.g. `grep -rn -e 'detekt-formatting' -e 'detekt-rules-ktlint-wrapper' --include=*.gradle.kts --include=*.gradle --include=*.toml .`. Ran verbatim under zsh (the project shell) against a planted violating fixture: zsh's nomatch aborts the command before grep runs \u2014 `zsh:1: no matches found: --include=*.gradle.kts`, rc=1, no output. KT-LINT-02 reads \"Empty output from the first is the pass\" and KT-LINT-03 reads \"empty output is the pass\", so both report a pass on a tree that violates them: these two verifications cannot go red. KT-LINT-01, -06, -07 and -08 fail the other way (false finding). `check-artifacts.py` reports the set clean, so nothing catches this. Every other depth file in the set quotes its `--include` arguments; this file is the only one that does not.",
    "fix": "In rules/kotlin-quality/lint-gate.md, quote every `--include=` argument that contains a `*`, on lines 58, 59, 60, 104, 105 and 122: replace `--include=*.gradle.kts` with `--include='*.gradle.kts'`, `--include=*.gradle` with `--include='*.gradle'`, `--include=*.toml` with `--include='*.toml'`, `--include=*.kt` with `--include='*.kt'`, and `--include=*.kts` with `--include='*.kts'`. Leave `--include=.editorconfig` on lines 85 and 86 unchanged \u2014 it carries no glob character and already runs correctly."
   },
   {
    "set": "rules/kotlin-quality.md + rules/kotlin-quality/ (7 depth files) \u2014 JVM research-lang phase 8, review B",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/kotlin-quality/lint-gate.md",
    "line": 104,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "KT-LINT-06 mandates extraWarnings while KT-COMP-12 forbids requiring it. KT-LINT-06 (SHOULD) says \"Turn on `extraWarnings` in exactly one convention plugin\" and its verification says \"Empty output means the bundle is off, which is the finding on a module you author\". KT-COMP-12 (compiler-and-toolchain.md:136, CONSIDER) says the opposite in the same words: \"Do not add `extraWarnings` or `-Wextra` to a build as a hardening step, and never state either as a requirement... Absence is **never** a finding, and a review comment demanding it is the invented pattern\", and compiler-and-toolchain.md failure mode 9 lists adding `extraWarnings = true` as a thing agents get wrong. Both files load on the same `**/*.kt` glob and the index routes compiler work to one and lint work to the other, so the reader gets opposite instructions for the same knob. KT-COMP-12 is the consolidation-backed side (jvm-platform-and-toolchains.md KT-COMP-12: \"Treat `extraWarnings` / `-Wextra` as opt-in, never a MUST... absence is not a violation\"); KT-LINT has no consolidation.",
    "fix": "In rules/kotlin-quality/lint-gate.md line 104, replace the Rule cell's first two sentences \"Turn on `extraWarnings` in exactly one convention plugin, on the same `compilerOptions` block that sets `jvmTarget`. Treat it as an opt-in that carries its Kotlin version, because it is Experimental as of Kotlin 2.1 and still Experimental at 2026-09-12.\" with \"Where a build opts in to `extraWarnings`, declare it in exactly one convention plugin, on the same `compilerOptions` block that sets `jvmTarget`, and carry its Kotlin version. Whether to opt in at all is `KT-COMP-12`'s, which forbids stating it as a requirement, because it is Experimental as of Kotlin 2.1 and still Experimental at 2026-09-12.\" In the same row's Verification cell, replace \"Empty output means the bundle is off, which is the finding on a module you author and informational on an adopter's.\" with \"Empty output means the bundle is off, which is never a finding (`KT-COMP-12`).\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/lifecycle-and-plugins.md",
  "model": "sonnet",
  "checker_target": "rules/maven-build.md",
  "findings": [
   {
    "set": "rules/gradle-build.md + rules/gradle-build/*.md (GRADLE-CORE index and eight GRADLE-STRUCT / DEP / CACHE / TOOL / PLUG / DIST / PUB / CI depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/lifecycle-and-plugins.md",
    "line": 137,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Cross-set check on a JVM fact, not a build-system fact: gradle-build makes explicit source encoding merge-blocking (index non-negotiable 3, JAVA-PLAT-12 MUST in toolchains-and-compilation.md:85) on the ground that javac's source-reading default is a separate fallback point from JEP 400. jvm-platform-and-toolchains.md's JAVA-PLAT-12 states both halves \u2014 `options.encoding` for Gradle AND `<project.build.sourceEncoding>` for Maven \u2014 but the Maven half ships nowhere: `grep -rni 'encoding|utf-8' rules/maven-build*` returns zero hits across the index and all four depth files. A Maven-only adopter, who by the set's own design never loads `gradle-build` or `java-quality`, gets no encoding rule at all, so the two sets answer one JVM fact with MUST and with silence.",
    "fix": "Add a row to the MVN-BUILD table: `| MVN-BUILD-20 | Set `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>` in every published POM or its parent, regardless of the JDK floor. | `javac`'s source-reading default is a separate fallback point from the runtime default [JEP 400](https://openjdk.org/jeps/400) changed, so a JDK 25 toolchain still reads sources in the host's charset and a non-ASCII literal compiles differently on Windows than on Linux. Maven warns \"platform encoding ... is platform dependent\" and builds anyway. | `grep -rn --include='pom.xml' -e 'project.build.sourceEncoding' .` **Empty output is the finding, not the pass.** A value other than `UTF-8` is a second finding. `JAVA-PLAT-12` is the Gradle statement of the same decision, on a glob a Maven-only adopter never loads. | MUST |`"
   }
  ]
 }
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'applied', 'refused', 'checker_clean', 'lines_after'],
  properties: {
    file: { type: 'string' },
    applied: { type: 'array', items: { type: 'number' }, description: 'finding line numbers applied' },
    refused: { type: 'array', items: { type: 'string' }, description: 'line: reason, only when applying the fix would contradict the authoring notes or a consolidation' },
    checker_clean: { type: 'boolean' },
    lines_after: { type: 'number' },
  },
}

function fix(item) {
  const isOpus = item.model === 'opus'
  return agent(`Model rationale: ${isOpus ? 'opus — at least one finding is a blocker on an enforced rule, so applying it is a judgement about what the rule says' : 'sonnet — mechanical edits from exact fix text a reviewer already decided'}.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a fixer in phase 8 (Validate) of the research-lang program for the JVM ecosystem, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILE against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/jvm-topic-map.md (section "## Authoring notes (binding on the drafters)") and returned findings with exact fix text. Apply them.
- YOUR FILE (the only file you may edit): ${item.file}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content.
- After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py ${item.checker_target}  and fix any finding it reports in YOUR FILE (a finding in another file is not yours; report it in refused with the path). Then report the file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. line ${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.file.split('/').slice(-2).join('/')}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
