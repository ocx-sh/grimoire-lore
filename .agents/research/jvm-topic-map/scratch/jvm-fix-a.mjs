export const meta = {
  name: 'jvm-fix-a',
  description: 'JVM research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality.md",
  "model": "opus",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality.md",
    "line": 1,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "(split from a finding on lint-gate.md) The set contradicts itself about which Error Prone checks must be promoted. JAVA-LINT-02 names nine and the index non-negotiable 1 states \"the nine named checks ... are promoted to `ERROR`, before any rule below is claimed to hold\"; lint-gate.md line 12 declares \"`JAVA-LINT` states the flag, and the flag is written once\". But three depth files gate on promotions absent from that nine: errors-and-resources.md:56-61 requires `InterruptedExceptionSwallowed` (\"Fewer than three names is the finding\"), security-and-untrusted-input.md:35-38 requires `BanSerializableRead` and `BanJNDI` (\"Empty output is the finding\"), and platform-and-versions.md:111 requires `DefaultCharset` (\"Empty output is the finding\"). A build that satisfies the index's non-negotiable 1 exactly is reported as violating three depth gates, one of them a MUST the index also hoists (JAVA-PLAT-10).",
    "fix": "Apply ONLY the part of this fix that names YOUR file (rules/java-quality.md), nothing else: In rules/java-quality/lint-gate.md line 50, append to JAVA-LINT-02's Rule cell after the nine names: \" Four further names are required by sibling rules and are promoted alongside these: `InterruptedExceptionSwallowed` (`JAVA-ERR-01`), `BanSerializableRead` and `BanJNDI` (`JAVA-SEC-01`, `JAVA-SEC-04`), and `DefaultCharset` (`JAVA-PLAT-10`).\" In rules/java-quality.md line 67, replace \"the nine named checks \u2014 the two locale checks among them \u2014 are promoted to `ERROR`\" with \"the nine named checks \u2014 the two locale checks among them \u2014 plus the four named for `JAVA-ERR`, `JAVA-SEC` and `JAVA-PLAT` are promoted to `ERROR`\". In rules/java-quality.md line 22-23, replace \"Eight of the nine Error Prone checks this rule set leans on ship in `DISABLED_CHECKS`\" with \"Eight of the nine Error Prone checks in `JAVA-LINT-02`'s promotion list ship in `DISABLED_CHECKS`\"."
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality.md",
    "line": 1,
    "severity": "fix",
    "kind": "trigger",
    "finding": "(split from a finding on testing.md) JAVA-TEST-03, -04 and -05 govern `junit-platform.properties` (the file is named in the rule text, in the routing prose, and in the wrong/right snippet pair at lines 51-62), but the index glob is `**/*.java` and no glob in any of the program's four rule sets reaches `junit-platform.properties` \u2014 gradle-build's list carries `**/gradle.properties` only. An agent creating or editing the file these three MUSTs are about loads none of them. The glob list itself is bound verbatim by authoring note \u00a71, so the fix is a routing line, exactly as note \u00a71 handles `MVN-BUILD-15`'s `.github/workflows/` residual.",
    "fix": "Apply ONLY the part of this fix that names YOUR file (rules/java-quality.md), nothing else: In rules/java-quality.md, in the \"Where the Depth Is\" table, replace the testing row with: `| Writing or reviewing a test, parallelising a suite, picking a JUnit major, editing a `junit-platform.properties` file, or deciding whether a coverage number means anything | [java-quality/testing.md](java-quality/testing.md) |`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/api-and-evolution.md",
  "model": "sonnet",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/api-and-evolution.md",
    "line": 63,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "This is the only file in the set with no verification-date anchor, and several version-specific rows carry a version with no date. JAVA-API-01 (MUST) cites \"JLS SE 25 \u00a713.4.14 and \u00a713.4.15\", JAVA-API-03 cites \"JLS SE 25 \u00a713.5.3\", JAVA-API-04 cites \"JLS SE 25 \u00a713.4.9\", JAVA-API-05 says \"JDK 9 and later\", and the Sealed Hierarchies intro (line 124) says \"Sealed types are JDK 17 (JEP 409), pattern-switch exhaustiveness is JDK 21 (JEP 441)\" \u2014 none dated. Authoring note \u00a77: \"A row that names a version without a date is the finding in review.\" Every sibling depth file carries either a per-row date or a file-level anchor.",
    "fix": "Insert after line 27 (the Contents block) a new paragraph: \"Every version, JEP and JLS reference in this file was verified **2026-09-12** unless a row says otherwise.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/data-and-patterns.md",
  "model": "sonnet",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/data-and-patterns.md",
    "line": 81,
    "severity": "fix",
    "kind": "style",
    "finding": "JAVA-DATA-03's verification writes a file into the tree under review: `grep -rl ... src > eq-files.txt`, then `xargs -r grep -L ... < eq-files.txt`. Run against planted fixtures it goes red and green correctly, but it leaves `eq-files.txt` behind in the working directory both times \u2014 a check that mutates the repository it is auditing, and one that will show up in the very `git diff` JAVA-CORE-01 tells the reviewer to read.",
    "fix": "On line 81, replace \"`grep -rl --include='*.java' -e 'boolean equals(Object' src > eq-files.txt`, then `xargs -r grep -L -e 'int hashCode()' < eq-files.txt`\" with \"`grep -rl --include='*.java' -e 'boolean equals(Object' src | xargs -r grep -L -e 'int hashCode()'`\"."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/errors-and-resources.md",
  "model": "opus",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/errors-and-resources.md",
    "line": 122,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "Every verification cell and gate block in this file writes `--include=*.java` / `--include=*.gradle.kts` / `--include=pom.xml` unquoted. The session shell is zsh, where a non-matching glob word aborts the command: run verbatim against a planted violating fixture, `grep -rl --include=*.java 'implements Serializable' src/ | xargs -r grep -L 'serialVersionUID'` printed `no matches found: --include=*.java` and produced EMPTY output with exit 0 \u2014 which the block immediately above calls \"Empty output is the pass\". The JAVA-ERR-08 check therefore reads green on a class that has no serialVersionUID. Quoting the include restores correct behaviour (red on the violating fixture, green on the compliant one, both verified). The same defect makes JAVA-ERR-03's and JAVA-ERR-07's \"empty output is the pass\" cells unable to go red. Affected lines: 57, 58, 66, 67, 68, 91, 100, 101, 122, 129, 138.",
    "fix": "Quote every `--include` value in this file: replace `--include=*.java` with `--include='*.java'`, `--include=*.gradle.kts` with `--include='*.gradle.kts'`, `--include=*.gradle` with `--include='*.gradle'`, and `--include=pom.xml` with `--include='pom.xml'` (all occurrences, lines 57, 58, 66, 67, 68, 91, 100, 101, 122, 129, 138)."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/lint-gate.md",
  "model": "opus",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/lint-gate.md",
    "line": 49,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "Same defect as errors-and-resources.md: every JAVA-LINT verification cell uses unquoted `--include=*.gradle.kts --include=*.gradle --include=pom.xml`. Under zsh the command aborts before grep runs and prints nothing, so JAVA-LINT-03 (\"Empty output means no opt-outs exist, which is the pass\"), JAVA-LINT-10 and JAVA-LINT-11 (\"Empty output is the pass\") all report a pass without having examined anything. Affected lines: 49, 50, 51, 52, 53, 54, 79, 104, 105, 106, 107.",
    "fix": "Quote every `--include` value in this file: `--include='*.gradle.kts'`, `--include='*.gradle'`, `--include='pom.xml'`, `--include='*.java'`, `--include='*.toml'`, `--include='*.versions.toml'` (all occurrences, lines 49, 50, 51, 52, 53, 54, 79, 104, 105, 106, 107)."
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/lint-gate.md",
    "line": 49,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "JAVA-LINT-01's rationale asserts \"Nineteen of the corpus's twenty-one unlinted repos reach for style tooling first.\" No consolidation states this. `jvm-quality-gates.md` verdict 2 says only \"19/32 exemplars run neither\" \u2014 a count that topic-map contradiction 8 explicitly supersedes (\"Every 'N/32' in `JAVA-LINT`'s shipped text becomes 11/32 Error Prone, 2/32 SpotBugs-as-gate, 21/32 run neither\"). The 19 has survived the correction by being re-framed as a nineteen-of-twenty-one sub-count that nothing measured.",
    "fix": "On line 49, replace \"Nineteen of the corpus's twenty-one unlinted repos reach for style tooling first.\" with \"Twenty-one of the thirty-two repositories measured 2026-09-12 wire neither Error Prone nor SpotBugs.\""
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/lint-gate.md",
    "line": 50,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "The set contradicts itself about which Error Prone checks must be promoted. JAVA-LINT-02 names nine and the index non-negotiable 1 states \"the nine named checks ... are promoted to `ERROR`, before any rule below is claimed to hold\"; lint-gate.md line 12 declares \"`JAVA-LINT` states the flag, and the flag is written once\". But three depth files gate on promotions absent from that nine: errors-and-resources.md:56-61 requires `InterruptedExceptionSwallowed` (\"Fewer than three names is the finding\"), security-and-untrusted-input.md:35-38 requires `BanSerializableRead` and `BanJNDI` (\"Empty output is the finding\"), and platform-and-versions.md:111 requires `DefaultCharset` (\"Empty output is the finding\"). A build that satisfies the index's non-negotiable 1 exactly is reported as violating three depth gates, one of them a MUST the index also hoists (JAVA-PLAT-10).",
    "fix": "In rules/java-quality/lint-gate.md line 50, append to JAVA-LINT-02's Rule cell after the nine names: \" Four further names are required by sibling rules and are promoted alongside these: `InterruptedExceptionSwallowed` (`JAVA-ERR-01`), `BanSerializableRead` and `BanJNDI` (`JAVA-SEC-01`, `JAVA-SEC-04`), and `DefaultCharset` (`JAVA-PLAT-10`).\" In rules/java-quality.md line 67, replace \"the nine named checks \u2014 the two locale checks among them \u2014 are promoted to `ERROR`\" with \"the nine named checks \u2014 the two locale checks among them \u2014 plus the four named for `JAVA-ERR`, `JAVA-SEC` and `JAVA-PLAT` are promoted to `ERROR`\". In rules/java-quality.md line 22-23, replace \"Eight of the nine Error Prone checks this rule set leans on ship in `DISABLED_CHECKS`\" with \"Eight of the nine Error Prone checks in `JAVA-LINT-02`'s promotion list ship in `DISABLED_CHECKS`\"."
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/lint-gate.md",
    "line": 53,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Topic-map contradiction 12 binds the drafters to \"`JAVA-PLAT-03` states the precondition only and `JAVA-LINT-05` cites PLAT-03 for the JDK/vendor matrix instead of restating it. Neither file carries the matrix twice.\" JAVA-LINT-05 restates the whole matrix (JDK 22+, or 17.0.19/21.0.8+ on OpenJDK-family with `-XDaddTypeAnnotationsToSymbol=true`) plus the Temurin 13/32 / Zulu 10/32 / Oracle 0/32 vendor counts, and JAVA-PLAT-03 (platform-and-versions.md:45) carries the identical matrix. The row's own disclaimer (\"`JAVA-PLAT-03` owns the JDK and vendor matrix itself, and this row states only the lint precondition\") is contradicted by the text around it.",
    "fix": "On line 53, replace JAVA-LINT-05's Rule cell text \"Before setting `jspecifyMode = true`, confirm the toolchain is JDK 22 or newer, or JDK 17.0.19 / 21.0.8 or newer on an OpenJDK-family distribution with `-XDaddTypeAnnotationsToSymbol=true` passed to `javac`. `JAVA-PLAT-03` owns the JDK and vendor matrix itself, and this row states only the lint precondition.\" with \"Before setting `jspecifyMode = true`, confirm the module's toolchain satisfies `JAVA-PLAT-03`'s JDK-and-vendor matrix, which this row does not restate.\" and delete the vendor-count sentence \"Nobody has hit this yet because the corpus runs Temurin 13/32 and Zulu 10/32 against Oracle 0/32 (verified 2026-09-12).\" from its Rationale cell."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/platform-and-versions.md",
  "model": "opus",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/platform-and-versions.md",
    "line": 87,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "JAVA-PLAT-08's row has four cells, not five: the pipe before \"The two-stage SequencedCollection scan in the gate block above.\" is missing, so the verification text is absorbed into the Rationale cell. As rendered, the Verification column reads \"SHOULD\" and the Severity column is empty \u2014 the row ships with a nonsense verification and no tier. (The scan itself is sound: run against planted fixtures it printed the self-declared `getFirst()` on the violating tree and nothing on the compliant one, so \"Empty output from the second stage is the pass\" is true.)",
    "fix": "On line 87, insert ` | ` immediately before \"The two-stage SequencedCollection scan in the gate block above.\" so the row reads `... reads like an unrelated DSL bug. | The two-stage SequencedCollection scan in the gate block above. Empty output from the second stage is the pass, and every hit it prints needs reading against its own type's supertypes. | SHOULD |`."
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/platform-and-versions.md",
    "line": 111,
    "severity": "blocker",
    "kind": "style",
    "finding": "JAVA-PLAT-10's row contains five unescaped `|` characters inside the grep ERE `'new String\\([^,)]*\\)|\\.getBytes\\(\\)|new FileReader\\(|new InputStreamReader\\([^,)]*\\)|new PrintStream\\([^,)]*\\)|new Scanner\\([^,)]*\\)'`. Markdown splits cells on `|` even inside backticks, so this MUST row renders as 10 columns in a 5-column table: the verification cell is truncated after `new String\\([^,)]*\\)` and the `MUST` severity is dropped entirely. It also violates authoring note \u00a79 (\"One `-e` per alternative, never alternation inside a single pattern\").",
    "fix": "On line 111, replace the single ERE with one `-e` per alternative: `grep -rn -E --include='*.java' -e 'new String\\([^,)]*\\)' -e '\\.getBytes\\(\\)' -e 'new FileReader\\(' -e 'new InputStreamReader\\([^,)]*\\)' -e 'new PrintStream\\([^,)]*\\)' -e 'new Scanner\\([^,)]*\\)' .`"
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/platform-and-versions.md",
    "line": 112,
    "severity": "fix",
    "kind": "style",
    "finding": "JAVA-PLAT-11's row contains two unescaped `|` inside `'new HashMap|new HashSet|ServiceLoader\\.load'`, rendering the row as 7 columns in a 5-column table and dropping the `SHOULD` severity. Same authoring-note \u00a79 violation as JAVA-PLAT-10.",
    "fix": "On line 112, replace `grep -rnE --include='*.java' 'new HashMap|new HashSet|ServiceLoader\\.load' .` with `grep -rn -E --include='*.java' -e 'new HashMap' -e 'new HashSet' -e 'ServiceLoader\\.load' .`"
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/platform-and-versions.md",
    "line": 112,
    "severity": "blocker",
    "kind": "style",
    "finding": "JAVA-PLAT-11's row has 8 pipe characters against a 6-pipe header: a `|` inside a backticked command splits the Markdown cell, so the Verification and Severity columns render shifted and the row loses its tier.",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row: split a grep alternation into one -e per alternative, and write a shell pipe or a `||` as `\\|` (GFM escapes a pipe inside a code span with a backslash). Re-count: the row must have exactly 6 pipes."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/security-and-untrusted-input.md",
  "model": "sonnet",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/security-and-untrusted-input.md",
    "line": 19,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Topic-map contradiction 19 binds the drafters to \"`security-and-untrusted-input.md` cites `JAVA-CONC-12` for the environment half.\" The file's owns/does-not-own paragraph cites `JAVA-CONC` only for `CompletableFuture` exception loss, and JAVA-SEC-06 (the subprocess row) says nothing about the child environment \u2014 so the three-MUST subprocess call site is cross-cited in only one direction (concurrency.md:12 correctly cites `JAVA-SEC-06`).",
    "fix": "On line 19, replace \"and `CompletableFuture` exception loss\\nis `JAVA-CONC` (`concurrency.md`).\" with \"`CompletableFuture` exception loss is `JAVA-CONC` (`concurrency.md`), and the environment a subprocess inherits is `JAVA-CONC-12` there \u2014 this file owns only the argv (`JAVA-SEC-06`).\""
   },
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/security-and-untrusted-input.md",
    "line": 70,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Topic-map contradiction 6 binds the drafters to \"`JAVA-SEC-08` keeps the security half and cites LINT-10.\" No JAVA-LINT-10 citation appears anywhere in security-and-untrusted-input.md, so a reader of JAVA-SEC-08 is never sent to the rule that decides whether SpotBugs is in the gate at all \u2014 and lint-gate.md's amended JAVA-LINT-10 (the lock/null-dataflow second clause) reads as a separate, unrelated decision.",
    "fix": "On line 70, append to JAVA-SEC-08's Rationale cell: \" Whether SpotBugs earns a gate slot at all is `JAVA-LINT-10`'s decision, in `lint-gate.md`; this row owns only what wiring it without `find-sec-bugs` fails to cover.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/testing.md",
  "model": "sonnet",
  "checker_target": "rules/java-quality.md",
  "findings": [
   {
    "set": "rules/java-quality.md + rules/java-quality/*.md (9 depth files)",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/java-quality/testing.md",
    "line": 47,
    "severity": "fix",
    "kind": "trigger",
    "finding": "JAVA-TEST-03, -04 and -05 govern `junit-platform.properties` (the file is named in the rule text, in the routing prose, and in the wrong/right snippet pair at lines 51-62), but the index glob is `**/*.java` and no glob in any of the program's four rule sets reaches `junit-platform.properties` \u2014 gradle-build's list carries `**/gradle.properties` only. An agent creating or editing the file these three MUSTs are about loads none of them. The glob list itself is bound verbatim by authoring note \u00a71, so the fix is a routing line, exactly as note \u00a71 handles `MVN-BUILD-15`'s `.github/workflows/` residual.",
    "fix": "In rules/java-quality.md, in the \"Where the Depth Is\" table, replace the testing row with: `| Writing or reviewing a test, parallelising a suite, picking a JUnit major, editing a `junit-platform.properties` file, or deciding whether a coverage number means anything | [java-quality/testing.md](java-quality/testing.md) |`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build.md",
  "model": "opus",
  "checker_target": "rules/maven-build.md",
  "findings": [
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build.md",
    "line": 2,
    "severity": "fix",
    "kind": "trigger",
    "finding": "The frontmatter glob list matches authoring notes \u00a71 verbatim, and the one residual the notes name (MVN-BUILD-15's CI-injected `.mvn/extensions.xml`, reached through the routing line at line 122) is carried. Three further rule subjects that the rules instruct the reader to write sit outside every glob with no routing line: MVN-PUB-06 tells the reader to put the Portal token in a `settings.xml` `<server>` entry and its verification says 'A hit inside a `<server>` block in a committed `settings.xml` is the same finding' \u2014 no glob reaches `settings.xml`; MVN-BUILD-18/-19 turn on a `toolchains.xml` that may be 'committed, CI-generated, or plugin-generated' \u2014 no glob reaches a committed one; MVN-ANT-02 (MUST) governs a line written into a `*.gradle.kts`, which only the `gradle-build` glob reaches, so the reader adding `ant.importBuild()` never loads it.",
    "fix": "Add one row to 'Where the Depth Is', immediately after the existing MVN-BUILD-15 routing row (line 122): '| Writing a `settings.xml` `<server>` entry, a committed `toolchains.xml`, or the `*.gradle.kts` line that would bridge an Ant build | [maven-build/publishing.md](maven-build/publishing.md), [maven-build/lifecycle-and-plugins.md](maven-build/lifecycle-and-plugins.md), [maven-build/ant-legacy.md](maven-build/ant-legacy.md), read from here, because no glob in this rule reaches those three files, so `MVN-PUB-06`, `MVN-BUILD-18`/`-19` and `MVN-ANT-02` load only through this line |'"
   },
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build.md",
    "line": 93,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Index non-negotiable 13 states an unconditional, merge-blocking, **pinned** floor: 'Publishing goes through `central-publishing-maven-plugin` at 0.7.0 or later.' The depth row it cites, MVN-PUB-01 (publishing.md:59), conditions that floor: 'Pin `central-publishing-maven-plugin` to at least 0.7.0 **before relying on a SNAPSHOT channel**', and the consolidation (jvm-publishing.md:133) is conditional in the same words. Two rows in one set answer 'must a release-only project pin 0.7.0?' differently: the index blocks a 0.6.x pin, the depth file does not.",
    "fix": "Replace the Rule cell of index row 13 with: '**pinned.** Publishing goes through `central-publishing-maven-plugin`; pin 0.7.0 or later before relying on a SNAPSHOT channel. `oss.sonatype.org`, `s01.oss.sonatype.org` and `nexus-staging-maven-plugin` are dead paths: OSSRH ended 2025-06-30.'"
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build.md",
    "line": 107,
    "severity": "blocker",
    "kind": "style",
    "finding": "MVN-CORE-01's row has 9 pipe characters against a 6-pipe header: a `|` inside a backticked command splits the Markdown cell, so the Verification and Severity columns render shifted.",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row: split a grep alternation into one -e per alternative, and write a shell pipe or a `||` as `\\|`. Re-count: the row must have exactly 6 pipes."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/lifecycle-and-plugins.md",
  "model": "opus",
  "checker_target": "rules/maven-build.md",
  "findings": [
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/lifecycle-and-plugins.md",
    "line": 53,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "MVN-BUILD-01 (MUST) names guava as the example of a *correct* `<source>`/`<target>` hit: 'A hit paired with a `release` in the same execution (a multi-release jar's base layer, as in guava) is correct, not a finding.' Both admissible sources make guava the finding, not the pass. jvm-maven-and-ant.md Violated table: 'google__guava@5fb424c43a:pom.xml:215-216,255-256,324 \u2014 <source>1.8</source><target>1.8</target> hard-coded ... Neither sets release, so neither pins an API baseline.' Topic map contradiction 2: MVN-BUILD-01's 'surviving complaint against guava narrows to the true one: no maven.compiler.release property at all and the literal 1.8 repeated three times.' A reviewer applying the cell as written passes a guava-shaped POM, which is the single most common violation shape the family measured.",
    "fix": "In MVN-BUILD-01's Verification cell, replace '(a multi-release jar's base layer, as in guava)' with '(a multi-release jar's base layer)', and after the sentence 'Empty grep output with a `release` present is also a pass.' insert: 'guava is the counter-example, not the example: it hard-codes `1.8` in three places with no `maven.compiler.release` anywhere, which is the finding.'"
   },
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/lifecycle-and-plugins.md",
    "line": 55,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "MVN-BUILD-16's config check (`grep -rl --include=pom.xml 'annotationProcessorPaths' . > proc-poms.txt`, then `xargs -r grep -L 'maven.compiler.proc' < proc-poms.txt`) reports a false positive on the exact shape the consolidation endorses. jvm-maven-and-ant.md Applied table calls apache/maven 'the canonical shape for both rules: turn it on at the parent, declare the exception explicitly' \u2014 the property is set once reactor-wide in the parent POM and modules inherit it. A module POM carrying `annotationProcessorPaths` and inheriting `maven.compiler.proc` is printed by this pipeline and read as the finding. Verified red/green on planted fixtures: the pipeline prints the path for a POM with no local property and prints nothing for one that sets it locally, so it cannot distinguish inherited from absent.",
    "fix": "Append to MVN-BUILD-16's Verification cell, immediately after 'Any path printed is the finding and empty output is the pass.': 'A printed path whose parent POM sets the property is a false positive: confirm with `mvn -q help:effective-pom -Doutput=effective-pom.xml` and `grep -c 'maven.compiler.proc' effective-pom.xml` before recording it. Setting it once at the parent, with a `<proc>none</proc>` override on every module that defines annotations but consumes no processor, is the endorsed shape.'"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
  "model": "opus",
  "checker_target": "rules/maven-build.md",
  "findings": [
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
    "line": 41,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "MVN-PUB-04 through MVN-PUB-10 (lines 41, 42, 60, 61, 100, 101, 110) are seven rule IDs no consolidation defines. jvm-publishing.md \u00a7MVN-PUB ships exactly three rows and states 'MVN-PUB tally \u2014 3 rules, all MUST' (line 137). Authoring notes \u00a72 names '[jvm-publishing.md] \u00a7MVN-PUB' as publishing.md's only source and says 'Nothing else is a source.' The seven new rows are Maven transpositions of GRADLE-PUB-01 (namespace), -02 (tag vs version), -08 (credentials), -04 (POM elements), -05 (sources/javadoc), -06 (signing) and -14 (autoPublish/waitUntil). The content is well supported and the parallel-row principle in notes \u00a74 is compatible with it, but \u00a74 enumerates only two sanctioned parallel pairs and the drafter allocated seven IDs on its own authority. Consequence: a reviser looking up MVN-PUB-07 in the corpus finds nothing, and the notes' '283 IDs' inventory is off by seven.",
    "fix": "Owner decision, default (a). (a) Record the seven IDs in `.agents/research/jvm-publishing.md` \u00a7MVN-PUB as parallel Maven rows, each naming the GRADLE-PUB row it transposes (MVN-PUB-04<-GRADLE-PUB-01, -05<--02, -06<--08, -07<--04, -08<--05, -09<--06, -10<--14); update that file's 'MVN-PUB tally \u2014 3 rules, all MUST' line to '10 rules, all MUST'; and change the topic map's authoring-notes \u00a72 'Draws from' cell for `publishing.md` to read '[jvm-publishing.md](jvm-publishing.md) \u00a7MVN-PUB + \u00a7GRADLE-PUB Groups 1, 2 and 4, transposed to the `pom.xml` glob per notes \u00a74'. (b) Otherwise delete rows MVN-PUB-04..-10 and the index non-negotiable rows 14, 15 and 16 that cite them."
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
    "line": 60,
    "severity": "blocker",
    "kind": "style",
    "finding": "MVN-PUB-06's row has 7 pipe characters against a 6-pipe header (a `|` inside code splits the cell).",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row (one -e per alternative; a shell pipe or `||` written as `\\|`). Re-count to exactly 6 pipes."
   },
   {
    "set": "maven-build (index + 4 depth files) and the bazel-quality Java handoff",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
    "line": 61,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "MVN-PUB-07's verification cannot go red on the exact defect its own rationale names. Planted /tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/review-a/maven-build-and-bazel-handoff/pub-bad/pom.xml with name, description, licenses, developers and a full <scm><url>u</url></scm> but NO project-level <url>. Ran the cell verbatim: it printed nothing (pass) on the violation, and nothing on the compliant fixture too. `grep -q \"<url>\"` is a whole-file substring search, so the <url> inside <scm> satisfies it. The rationale says 'url is present in 8 of 32 measured repositories against 15 to 17 for licenses, developers and scm, so a check that covers the familiar three still passes a POM Central will reject' \u2014 this check is that check. The cell's 'Any output is the finding, empty output is the pass' is therefore false for the only shape the rule exists to catch.",
    "fix": "Replace the Verification cell body with: `python3 -c \"import xml.etree.ElementTree as E;r=E.parse('pom.xml').getroot();ns=r.tag[:r.tag.find('}')+1] if '}' in r.tag else '';[print('MISSING '+e) for e in ('name','description','url','licenses','developers','scm') if r.find(ns+e) is None]\"`. Any output is the finding, empty output is the pass. Run it against every module that is deployed, not only the aggregator. A `grep -q` over the file text passes on a POM whose only `<url>` sits inside `<scm>`, which is exactly the shape Central rejects, so the check must read the element's parent."
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
    "line": 61,
    "severity": "blocker",
    "kind": "style",
    "finding": "MVN-PUB-07's row has 8 pipe characters against a 6-pipe header (a `|` inside code splits the cell).",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row (one -e per alternative; a shell pipe or `||` written as `\\|`). Re-count to exactly 6 pipes. Apply this together with the reviewer's MVN-PUB-07 verification fix on the same row."
   },
   {
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/rules/maven-build/publishing.md",
    "line": 110,
    "severity": "blocker",
    "kind": "style",
    "finding": "MVN-PUB-10's row has 7 pipe characters against a 6-pipe header (a `|` inside code splits the cell).",
    "fix": "Rewrite the command so no unescaped `|` remains inside the row (one -e per alternative; a shell pipe or `||` written as `\\|`). Re-count to exactly 6 pipes."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md",
  "model": "sonnet",
  "checker_target": "skills/jvm-dependency-triage",
  "findings": [
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md",
    "line": 184,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "Line 198 says a `<systemPath>` hit with no sibling `<scope>system</scope>` is the finding, but the grep prints one line and no context, so the two cases are indistinguishable from its output. Planted fixtures: a dependency with `<systemPath>` and no scope, and one with `<scope>system</scope>` on the preceding line, produced byte-identical single-line output. MVN-DEP-08's own cell uses `-B4` for this reason.",
    "fix": "Replace `grep -rnE -e '</?systemPath>' --include='pom.xml' .` with `grep -rnE -B 4 -e '</?systemPath>' --include='pom.xml' .`"
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md",
    "line": 185,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "Lines 200-203 say a hit passes only when a nested `<goal>enforce</goal>` is visible inside an `<executions>` block in the same `<plugin>`. Planted fixture: a conventionally formatted, correctly wired enforcer block (groupId, artifactId, version, `<configuration><rules>` with three rules, then `<executions>`) printed only through `</configuration>` under `-A 8`, so the stated reading rule turns a compliant POM into an MVN-DEP-03 MUST finding. The violating fixture (rules, no executions) went red as intended, so the check goes red in both directions.",
    "fix": "Replace `grep -rn -A 8 -e 'maven-enforcer-plugin' --include='pom.xml' .` with `grep -rn -A 24 -e 'maven-enforcer-plugin' --include='pom.xml' .` (verified: the correctly wired fixture's `<goal>enforce</goal>` is inside the 24-line window)."
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md",
    "line": 278,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "Lines 284-285 state this grep *is* the gate for GRADLE-DEP-07, and MUST row 7 names \"a range\" as one of the violation classes. The third alternative requires a colon before the version, so it matches a coordinate string only. Planted fixtures: `implementation(\"com.google.guava:guava:[33.0,34.0)\")` and a catalog entry `guava = \"33.+\"` in a `*.versions.toml` both produced empty output, while the compliant fixture stayed green and the `+`/`latest.release`/`-SNAPSHOT` fixture went red. Line 286 discusses `[1.0,2.0)` three lines below a gate that cannot see it.",
    "fix": "Replace line 278 with: `grep -rnE -e '-SNAPSHOT' -e 'latest\\.(release|integration)' -e ':[0-9][^\"]*\\.\\+' -e '\"[0-9][^\"]*\\.\\+\"' -e '[:\"]\\[[0-9]' \\` (verified: red on `+`, `latest.*`, `-SNAPSHOT`, a `[33.0,34.0)` range and a catalog `\"33.+\"`; green on a concrete-version fixture)."
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-dependency-triage/SKILL.md",
    "line": 285,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "\"The two enforcer runs must exit zero, and they only run where an `<execution>` binds the `enforce` goal\" is wrong for a direct CLI goal invocation: `mvn enforcer:enforce -Drules=...` invokes the goal with the rules supplied on the command line and does not consult execution bindings. jvm-dependencies.md gives exactly these two commands as MVN-DEP-04's and MVN-DEP-05's unconditional verification, with no binding precondition; the binding is a separate rule (MVN-DEP-03) precisely because a lifecycle run is what skips an unbound plugin. As written, a reader skips the check on the POM most likely to violate it.",
    "fix": "Replace `The two enforcer runs must exit zero, and they only run where an `<execution>` binds the `enforce` goal.` with `The two enforcer runs must exit zero. They invoke the goal directly and do not need an `<execution>`, which is why the binding is its own finding (MVN-DEP-03): without it nothing runs during `mvn verify`.`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
  "model": "opus",
  "checker_target": "skills/jvm-release",
  "findings": [
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
    "line": 135,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "Step 3's verification for the binary-compatibility gate is `mvn -X deploy`. That is not a dry run: it executes the full lifecycle and uploads. In a file whose opening thesis is that Central is immutable and that every gate must run before the artifact leaves the machine, the check for \"is the gate upstream of the upload\" performs the upload. The Gradle half of the same sentence correctly uses `--dry-run`; Maven has no equivalent, and the ordering fact is decided by the execution's bound phase, which is readable without running anything.",
    "fix": "Replace `For Maven, `mvn -X deploy` must show the same ordering.` with: `For Maven the ordering is the bound phase, not a run: `grep -rn -A 6 --include='pom.xml' -e 'japicmp-maven-plugin' .` must show an `<execution>` whose `<phase>` is `verify` or earlier, which the lifecycle puts ahead of `deploy`. An execution with no phase, or empty output, is the finding. Never run `mvn deploy` to inspect ordering.`"
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
    "line": 137,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The grep includes `*.gradle.kts` and `pom.xml` but not `*.gradle`. Every other verification grep in this file (lines 216, 249, 279) includes both Gradle spellings, and authoring note 8 records that a Groovy build is not itself a finding and that Groovy build files are common in the corpus (spring-boot ships 736 to 54 Kotlin). Planted fixture: the same `ignoreMissingClasses` violation in a `build.gradle` produced no output, so the check reports a pass on a suppressed ABI gate.",
    "fix": "Replace `--include='*.gradle.kts' --include='pom.xml' .` with `--include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` on line 137."
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
    "line": 178,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "The required-POM-element loop greps the whole file for `<url>`, but `<url>` also appears inside `<scm>` and inside each `<licenses>` entry. Planted fixture: a POM with no project-level `<url>` but a normal `<scm><url>` block produced no output, i.e. the check passed the exact defect the two lines above it single out (\"`url` is the element that goes missing... a check that covers the other three and skips `url` passes builds Central still rejects\"). It also never checks `<connection>` or `<developerConnection>`, which the step's own table row demands as part of \"a full `scm` block\". Verified: violation fixture green, so the check cannot go red for its own named failure.",
    "fix": "Replace the code block at lines 176-181 with:\n```bash\n# every required POM element present at project level. Any output is the finding, empty output is the pass\nfor f in build/publications/*/pom-default.xml; do\n  bare=$(sed -e '/<scm>/,/<\\/scm>/d' -e '/<licenses>/,/<\\/licenses>/d' -e '/<developers>/,/<\\/developers>/d' \"$f\")\n  for e in name description url; do\n    printf '%s' \"$bare\" | grep -q \"<$e>\" || echo \"MISSING $e in $f\"\n  done\n  for e in licenses developers scm connection developerConnection; do\n    grep -q \"<$e>\" \"$f\" || echo \"MISSING $e in $f\"\n  done\ndone\n```"
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
    "line": 186,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The staged-bundle check only demands `.asc`, `.md5` and `.sha1` beside the base jar. Central requires them per deployed file, and the step's own table row says `.asc`, `.md5` and `.sha1` per deployed file. Planted fixture: a bundle whose `-sources.jar` and `-javadoc.jar` carry no `.asc` and whose `.pom` carries no signature or checksums at all produced empty output, i.e. passed. That is the exact shape a publication-scoped `signing` block or a mis-bound `maven-gpg-plugin` produces, which is what MUST row 5 (GRADLE-PUB-06) exists to catch.",
    "fix": "Replace the code block at lines 183-191 with:\n```bash\n# staged bundle: every base jar carries its siblings, and every deployed file its signature and checksums.\n# Any output is the finding, empty output is the pass.\nfind . -type f -not -name '*.asc' -not -name '*.md5' -not -name '*.sha1' \\\n  -not -name '*.sha256' -not -name '*.sha512' -print0 |\n  xargs -r -0 -I{} sh -c '\n    case \"$1\" in\n      *-sources.jar|*-javadoc.jar) ;;\n      *.jar) for s in -sources.jar -javadoc.jar; do [ -e \"${1%.jar}$s\" ] || echo \"MISSING ${1%.jar}$s\"; done ;;\n    esac\n    for x in .asc .md5 .sha1; do [ -e \"$1$x\" ] || echo \"MISSING $1$x\"; done\n  ' _ {}\n```"
   },
   {
    "set": "jvm skills: jvm-release + jvm-dependency-triage",
    "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/skills/jvm-release/SKILL.md",
    "line": 359,
    "severity": "fix",
    "kind": "duplication",
    "finding": "The MUST table's own preamble says the rows are restated \"so a review that runs this procedure without the rule files loaded still reports them with the right ID\", and the file covers Gradle and Maven side by side. Seven merge-blocking Maven rows now exist in rules/maven-build/publishing.md (MVN-PUB-04 namespace, -05 tag-vs-version, -06 literal credentials, -07 the six POM elements, -08 sources/javadoc, -09 signing and per-file checksums, -10 autoPublish/waitUntil) and none of them appears. Row 10 already carries a paired ID (`GRADLE-PUB-16, MVN-PUB-03`), so the shape is established in the same table; a review of a Maven repository run from this skill reports Gradle IDs that a pom.xml edit never loads.",
    "fix": "Append the Maven ID to each affected row's Rule cell, matching row 10's `GRADLE-PUB-16, MVN-PUB-03` form: row 1 -> `GRADLE-PUB-01, MVN-PUB-04`; row 2 -> `GRADLE-PUB-02, MVN-PUB-05`; row 3 -> `GRADLE-PUB-04, MVN-PUB-07`; row 4 -> `GRADLE-PUB-05, MVN-PUB-08`; row 5 -> `GRADLE-PUB-06, MVN-PUB-09`; row 6 -> `GRADLE-PUB-08, MVN-PUB-06`; row 8 -> `GRADLE-PUB-14, MVN-PUB-10`."
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
