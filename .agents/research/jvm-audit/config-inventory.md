---
title: JVM config inventory — the fleet's existing rules, the sibling Bazel program, and the SDK/plugin prior art
agent: config-inventory (jvm-audit)
model: sonnet
scope: >
  /home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake (rules/, skills/,
  publish.toml, bundles/*.toml, taskfile.yml, .claude/skills/research-lang);
  /home/mherwig/dev/grimoire-lore/.agents/research/bazel-frame.md,
  bazel-topic-map.md, bazel-topic-map/*.md, bazel-audit/*.md (read-only, main
  checkout); /home/mherwig/dev/ocx-sdk-python (read-only);
  /home/mherwig/dev/rules_ocx/AGENTS.md, /home/mherwig/dev/setup-ocx (read-only)
method: >
  Every number below is produced by the shell command printed directly above
  or beside it — grep -n / -c, wc -l, ls, sed -n <range>p, find — run from the
  repo root named in each command. No exemplar-corpus file was read for this
  axis; the JVM exemplar SHAs from jvm-frame.md are recorded here only because
  the task requires it, not because this file measured them.
date_researched: 2026-09-05
---

# JVM config inventory

Numbers-first audit of what already exists so a later JVM authoring pass has
a floor to stand on. Every claim below carries the command that produced it
or a `file:line` citation. Nothing here writes rules — it inventories what a
`java-quality`/`kotlin-quality`/`gradle-build` rule set must fit into.

## Contents

- [Headline numbers](#headline-numbers)
- [Exemplar corpus (recorded, not measured here)](#exemplar-corpus-recorded-not-measured-here)
- [Axis 1 — Lore catalog sibling rule sets & publish contract](#axis-1--lore-catalog-sibling-rule-sets--publish-contract)
- [Axis 2 — Sibling Bazel program](#axis-2--sibling-bazel-program)
- [Axis 3 — SDK template: ocx-sdk-python](#axis-3--sdk-template-ocx-sdk-python)
- [Axis 4 — Tool-provisioning prior art: rules_ocx + setup-ocx](#axis-4--tool-provisioning-prior-art-rules_ocx--setup-ocx)
- [Axis 5 — docs-quality's tested-example table](#axis-5--docs-qualitys-tested-example-table)
- [Axis 6 — Domain concerns with zero existing config](#axis-6--domain-concerns-with-zero-existing-config)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

1. **Zero.** `grep -rn -i -E '\b(java|kotlin|gradle|maven|jvm|jar)\b' rules/ skills/` returns **no matches at all** — the catalog's 8 rule sets and 2 skills contain not one JVM-adjacent word. There is no overlap surface to avoid and no house convention to reverse-engineer from a stray mention; every convention below is inferred from shape, not from JVM text.
2. **4 free ID prefixes confirmed live-free.** `JAVA-`, `KT-`, `GRADLE-`, `MVN-` appear nowhere in `rules/` (same grep, `-oE '\bJAVA-|KT-|GRADLE-|MVN-\b'`, zero hits) — the frame's claim holds.
3. **101 → 61.** `find rules -mindepth 2 -name '*.md' | wc -l` reports 101, but 40 of those are docs-quality's own planted-violation fixtures under `checks/fixtures/`. The real depth-file count across all 6 multi-file rule sets is **61** (§Axis 1.1).
4. **0 of 12.** The Bazel program's finalized depth-file list (`bazel-topic-map.md:715-753`) has twelve `BZL-` families and **no Java one** — `rules_java`/`rules_kotlin` are explicitly out of scope (`bazel-topic-map.md:792-799`), so a `java.md` depth file is a 13th addition to a structure that does not yet reserve a slot for it.
5. **116 public names, ~10,400 source lines.** `ocx-sdk-python`'s entire public surface is one `__all__` list of 116 names (`src/ocx_sdk/__init__.py:162-`); everything else across 13 modules / 10,406 lines is underscore-private. `fail_under = 100` is a hard coverage gate (`pyproject.toml`).
6. **Zero docs-quality coverage for Java/Kotlin.** `grep -n -i java|kotlin|gradle|maven` on both `docs-instrument` reference tables returns nothing — no doctest-equivalent row, no Dokka/Javadoc generator-wiring row (§Axis 5).
7. **rules_ocx's CLI contract names 14 sysexits** (`AGENTS.md:161-178`) that `ocx-sdk-python` mirrors as a 16-member `ExitCode(IntEnum)` (`_errors.py:28-46`) — the number any JVM SDK/plugin must reproduce byte-for-byte.

## Exemplar corpus (recorded, not measured here)

The 32-repo exemplar corpus (SHAs below) was fetched for the grounding wave; this audit's six axes are about the fleet's *own* config and prior art, not about JVM code, so no exemplar file was opened for this file. Recorded per the task's instruction to carry the SHAs forward.

| repo | sha | repo | sha |
|---|---|---|---|
| android/nowinandroid | `12f80da651` | google/error-prone | `c1f99ad5d3` |
| apache/ant | `8c96cd6869` | google/guava | `5fb424c43a` |
| apache/kafka | `940c100fab` | gradle/actions | `a27deee331` |
| apache/maven | `ea4a417bd2` | gradle/gradle | `ea17004a31` |
| apollographql/apollo-kotlin | `c145295b72` | GradleUp/shadow | `541b3be475` |
| assertj/assertj | `485502bad2` | grpc/grpc-java | `fc4314419d` |
| bazelbuild/bazel | `948b8c70e2` | JetBrains/Exposed | `4be9aee04c` |
| bazelbuild/rules_java | `4206909b6d` | junit-team/junit-framework | `35c56a8e02` |
| bazelbuild/rules_kotlin | `7c51dd1210` | Kotlin/kotlinx.coroutines | `f63a04bacb` |
| bazel-contrib/rules_jvm_external | `449754dcbb` | ktorio/ktor | `f92fad0435` |
| cashapp/sqldelight | `4580923af3` | micronaut-projects/micronaut-core | `d5842045bb` |
| detekt/detekt | `45672efb8b` | mockito/mockito | `5a676bcd9e` |
| diffplug/spotless | `dc2a4cb9a3` | pinterest/ktlint | `4c933394a3` |
| FasterXML/jackson-databind | `a906e1782b` | spring-projects/spring-boot | `93b23c40c2` |
| google/dagger | `4fbc045d2b` | square/okhttp | `dfcfab3824` |
| — | — | testcontainers/testcontainers-java | `a4d3a033d8` |
| — | — | uber/NullAway | `519a1bb826` |

Source: `.agents/research/jvm-frame.md:194-227`.

## Axis 1 — Lore catalog sibling rule sets & publish contract

### 1.1 Shape table

```
ls rules/ skills/
for f in rules/{rust-quality,rust-cargo,python-quality,python-packaging,typescript-quality,typescript-packaging,docs-quality,css-theming}.md; do wc -l "$f"; done
find rules/<set> -name '*.md' | wc -l   # per set, excluding fixtures
```

| Rule set | Glob (frontmatter `paths`) | Lines | Non-neg. rows (index) | Index-owned rules | Depth files | ID family |
|---|---|---:|---:|---:|---:|---|
| `rust-quality` | `**/*.rs` | 114 | 20 | 0 (all route out) | 18 | bare: `ARCH-`,`ASYNC-`,`CLI-`,`ERR-`,`EXIT-`,`LINT-`,`STATE-`,`TEST-`,`DATA-*` |
| `rust-cargo` | `**/Cargo.toml`, `clippy.toml`, `rustfmt.toml`, `deny.toml`, `rust-toolchain.toml` | 194 | 43 (flat table, no #-numbered index list) | — | 1 (`crates-of-record.md`) | bare: `CI-`,`DEP-`,`LINT-`,`REL-`,`TOOL-` |
| `python-quality` | `**/*.py` | 122 | 15 | 8 (`PY-CORE-01..08`, "Rules This File Owns") | 12 | `PY-<FAMILY>-NN` |
| `python-packaging` | `**/pyproject.toml`, `**/uv.lock` | 78 | 10 (flat) | — | 0 (no support dir) | `PY-PKG-NN` |
| `typescript-quality` | `**/*.ts`,`.tsx`,`.mts`,`.cts` | 142 | 16 | 3 (`TS-CORE-01..03`, "Rules This File Owns") | 12 | `TS-<FAMILY>-NN` |
| `typescript-packaging` | `**/package.json`, `**/tsconfig*.json`, eslint/biome configs | 158 | 20 (flat) | — | 0 | `TS-<FAMILY>-NN` |
| `docs-quality` | READMEs, CHANGELOG, `docs/**`, generator configs | 196 | 18 | 0 (index cites, depth owns) | 7 (+ 11 verification scripts under `checks/`, +40 fixture `.md`) | `DOC-<FAMILY>-NN` |
| `css-theming` | 24 extension/framework globs | 229 | 15 | 0 | 11 | `CSS-<FAMILY>-NN` |

**Total genuine depth files across the catalog: 18+1+12+0+12+0+7+11 = 61.**
`find rules -mindepth 2 -name '*.md' | wc -l` → 101; the 40-file gap is `rules/docs-quality/checks/fixtures/*.md` (planted-violation test fixtures, not depth content) — `find rules/docs-quality/checks/fixtures -name '*.md' | wc -l` → 40.

**ID scheme, stated plainly:** Rust (the first set built) uses bare families with no language prefix. Every set after it — Python, TypeScript, Docs, CSS — prefixes the family with a 2-4 letter language/domain code: `PY-`, `TS-`, `DOC-`, `CSS-`. The JVM set should follow the post-Rust convention: `JAVA-<FAMILY>-NN`, `KT-<FAMILY>-NN`, `GRADLE-<FAMILY>-NN`, `MVN-<FAMILY>-NN` — matching the frame's reserved prefixes exactly.

**Severity tiers, verbatim, both spellings in use:**
- Rust: `MUST = Block … SHOULD = Warn … CONSIDER = Suggest` (`rules/rust-quality.md:100-102`).
- Every other set's rule tables use the bare words `MUST` / `SHOULD` / `CONSIDER` as a table column (e.g. `rules/python-quality.md` verification-table rows end in `MUST`).

**Routing-table shape** (`rust-quality.md:72-96`, mirrored in every other index): a 2-column `| Doing… | Read |` table, one row per task description, never a topic name — "Adding a type, trait, or module…", "Anything that ends a process, picks an exit status…". Depth files "do not point at each other" (`rust-quality.md:75`) — one level deep only.

**Verification-cell shape** (from `python-quality.md`'s "Rules This File Owns" table and `typescript-quality.md:95`): a 4-5 column table — `ID | Rule | Rationale (sometimes folded into Rule) | Verification (a literal runnable command + what its output means) | Severity`. Every verification cell states whether empty output is a pass or the finding (`PY-CORE-08`, `TS-CORE-03` exist purely to enforce that).

### 1.2 JVM-relevant text overlap

```
grep -rn -i -E '\b(java|kotlin|gradle|maven|jvm|jar)\b' rules/ skills/
grep -rn -i -E 'lockfile|reproducible build|coverage threshold|ci cach' rules/ skills/
```

First grep: **zero hits, both directories.** Second grep hits (all Rust/Python/TS/Docs, none JVM):

| file:line | text |
|---|---|
| `rules/rust-cargo.md:125` | `CI-04`: every `cargo` invocation in CI carries `--locked` |
| `rules/typescript-quality.md:95` | `TS-CORE-01`: never reach green via "no lowered coverage threshold" |
| `rules/python-packaging.md:38` | `PY-PKG-05`: lockfile committed and verified via `uv lock --check` in CI |
| `rules/typescript-packaging.md:95` | `TS-PKG-13`: exactly one lockfile kind per workspace |
| `rules/rust-quality/durable-state.md:35` | `STATE-1`: every write to a cache/lockfile/install-tree routes through one durable-write helper |

**Conclusion:** there is no overlap surface a JVM rule set must avoid duplicating, and no existing lockfile/coverage/CI-caching row that a `gradle-build.md` could piggyback on — every one of those rows is language-specific to Rust/Python/TS's own manifest format. A JVM set inherits the *pattern* (a packaging rule loads on the manifest, not the source glob) but none of the *content*.

### 1.3 Publish contract

```
cat publish.toml bundles/*.toml
grep -n -A30 'artifacts:' taskfile.yml
python3 .claude/skills/research-lang/scripts/check-artifacts.py --help
```

| Requirement | Source | What a new `java-quality`/`gradle-build`/`jvm-essentials` triple must do |
|---|---|---|
| Flat registry namespace, `com.grimoire.kind` carries type | `publish.toml:12-19` | Publish as `[rules.java-quality]`, `[rules.gradle-build]`, `[bundles.jvm-essentials]` — no `rules/` path segment in the OCI ref |
| No catalog-wide `version`; each entry versions itself | `publish.toml:21-34` | New entries start at `version = "0.1.0"`; bump only the entry that changed |
| `[announce]` table required or `grim publish --announce` targets the wrong repo | `publish.toml:36-46,99-101` | Already set catalog-wide (`repository=…grimoire-lore`, `namespace="ocx-sh"`) — inherited, nothing to add |
| `[metadata]` (authors/vendor/url/documentation) and `[support]` are catalog-wide, inert until an entry's next version bump | `publish.toml:69-97` | Inherited automatically; no per-JVM-entry action |
| `[description]` per entry: `readme` + `logo`, else falls back to the repo README for every package (a shipped bug) | `publish.toml:121-220` | Each JVM entry needs `description = { readme = "docs/<name>.md", logo = "assets/lore-java.svg" }` — none of `docs/jvm-*.md` or `assets/lore-java.svg` exist yet (confirmed: `ls docs/ assets/` below) |
| Bundle members carry no tag, not even `latest` | `bundles/*.toml` comments (every file, identical wording) | `bundles/jvm-essentials.toml` must omit any version pin on its `[rules]`/`[skills]` entries |
| Support directory auto-discovered from a rule's sibling dir | `publish.toml:113-116` | `rules/java-quality/` ships in the same layer as `rules/java-quality.md` automatically — no manifest entry needed for depth files |
| `check-artifacts.py` validates: name parity, context budgets, link resolution, TOC presence, description hygiene, rule-table completeness, glob liveness | `--help` output | Run `check-artifacts.py --root <a JVM-bearing exemplar or fleet root> rules/java-quality.md rules/gradle-build.md …` before publish; exit 0 required, 65 (`check-artifacts.py`'s own convention, not sysexits-related) = findings, 2 = bad invocation |
| Glob-liveness root must actually contain the language | `taskfile.yml:57-92` (the `artifacts` task's own comments) | No JVM-bearing repo exists in the fleet (confirmed by the frame) — CI would hit the same "no consumer" branch already coded for Rust/Python (`if [ -d "{{.CONSUMER}}" ]`), and the honest fallback is running `check-artifacts.py` with no `--root` and printing the "not checked" note, exactly as done today |
| CSS/docs precedent for globs no single tree satisfies | `taskfile.yml:97-118` | If Gradle/Maven/Ant globs together can't be validated against one exemplar tree, checking with **no** `--root` is the documented, precedented fallback — not a blocker |

`docs/` currently holds 14 files (one `.md` per published rule/skill/bundle — `rust-quality.md`, `python-packaging.md`, … `docs-essentials.md`); zero begin with `jvm-` or `java-`. `assets/` holds 8 SVGs (`lore-{rust,python,typescript,css,docs,git,subsystem}.svg`, `lore.svg`) plus `assets/glyphs/` with 7 matching glyphs; zero for Java/JVM. This is the frame's claim, independently confirmed: `ls docs/ assets/ assets/glyphs/` (2026-09-05).

## Axis 2 — Sibling Bazel program

Read-only, main checkout: `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-frame.md`, `bazel-topic-map.md`, and everything under `bazel-topic-map/` and `bazel-audit/`.

```
grep -n '^## ' /home/mherwig/dev/grimoire-lore/.agents/research/bazel-topic-map.md
sed -n '630,804p' bazel-topic-map.md   # Artifact set decision
grep -rn -i -E 'rules_java|rules_jvm_external|rules_kotlin|java_toolchain|incompatible_autoload_externally' bazel-topic-map/ bazel-audit/
```

### 2.1 What the program already decided (verbatim facts)

- **One rule, `bazel-quality.md` + `bazel-quality/`**, glob is 14 build-system-guaranteed names: `**/BUILD.bazel`, `**/BUILD`, `**/*.bzl`, `**/MODULE.bazel`, `**/MODULE.bazel.lock`, `**/.bazelrc`, `**/*.bazelrc`, `**/.bazelversion`, `**/.bazelignore`, `**/WORKSPACE`, `**/WORKSPACE.bazel`, `**/WORKSPACE.bzlmod`, `**/*.star`, `**/*.scl` (`bazel-topic-map.md:634-656`). **No manifest globs** (`Cargo.toml`/`pyproject.toml`/`package.json`) are claimed — routing happens through the index's task table instead, because editing a JVM dependency in a Bazel repo always touches a `BUILD.bazel` or `MODULE.bazel` too (`bazel-topic-map.md:697-712`). A `java.md` depth file must follow the identical rule: **no `pom.xml`/`build.gradle*` glob of its own.**
- **Twelve depth files finalized, one per `BZL-` family** (`bazel-topic-map.md:715-732`): `starlark.md` (BZL-LARK), `bzlmod.md` (BZL-MOD), `hermeticity.md` (BZL-HERM), `caching-rbe.md` (BZL-CACHE), `testing.md` (BZL-TEST), `ci.md` (BZL-CI), `architecture.md` (BZL-ARCH), `flags-and-versions.md` (BZL-FLAG), `rust.md` (BZL-RUST), `python.md` (BZL-PY), `javascript-typescript.md` (BZL-JS), `cpp.md` (BZL-CC). **No `java.md` in this list.** A Java depth file is a 13th addition, family `BZL-JAVA`, matching the "Building `<lang>` under Bazel: …" one-line shape the other four per-language rows use (`bazel-topic-map.md:729-732`).
- **`Explicitly out of scope` table, verbatim row:** `rules_java`, `rules_kotlin`, `rules_scala` → *"Zero fleet consumers, zero `rules_ocx` users named. Java's Starlarkification is referenced once in `flags-and-versions.md` because `--incompatible_autoload_externally` covers `java_*` too, and that is all"* (`bazel-topic-map.md:794`).
- **Skills:** `bazel-adopt` (go/no-go + migration) and `bazel-diagnose` (slow / non-hermetic / cache-miss) — no third skill, no per-language skill (`bazel-topic-map.md:753-777`).
- **Bundle:** `bazel-essentials` = the rule + support dir + both skills, members untagged (`bazel-topic-map.md:779-782`).
- **`BZL-` is reserved and currently free** — confirmed by this program's own audit citation, `bazel-audit/config-inventory.md` headline 4: *"the catalog uses only `CI-`, `LINT-`, `REL-`, `TOOL-` today"* (`bazel-topic-map.md:784-791`) — that citation predates this file and did not know about `PY-`/`TS-`/`DOC-`/`CSS-`, which this axis-1 measurement shows are also in use; the two audits do not contradict each other, `BZL-` is simply a fifth family never claimed by any of them.

### 2.2 Java/Kotlin/Maven mentions found by grep, verbatim

The `--incompatible_autoload_externally` grep across `bazel-topic-map/*.md` and `bazel-audit/*.md` returns 15 hits, every one about the **flag**, not about `rules_java` as a build system:

> `codified-and-lint-catalogue.md:37`: *"The 18-name `native-cc-*` and the ~14-name `native-java-*` family all resolve to one flag, `--incompatible_autoload_externally`…"*
> `recent-shifts-and-research.md:29`: *"…every one of those rules must be `load()`ed from `rules_android`/`rules_cc`/**`rules_java`**/`protobuf`/`rules_python`/`rules_shell`."*

No hit for `rules_jvm_external` or `java_toolchain` anywhere in either directory (`grep -c` on both terms → 0). `maven` appears exactly once outside the frame/topic-map body, as a benchmark baseline in an academic citation: *"…benchmarked against Maven… 31.23% of Bazel projects that have a CI service configured don't invoke Bazel there"* (`bazel-topic-map/recent-shifts-and-research.md:155`) — not a build-system claim. `kotlin` appears twice, both about IDE tooling (JetBrains moving IntelliJ's Java/Kotlin intelligence to LSP, August 2026), never about `rules_kotlin` (`bazel-topic-map/architecture-and-monorepo-practice.md:52,126,183`).

### 2.3 What a `java.md` worker must NOT re-derive

The twelve existing depth files already own these mechanics; a Bazel-Java file routes into them rather than restating:

| Mechanic | Owned by | Java-specific residue for `java.md` |
|---|---|---|
| bzlmod, lockfile hygiene, module extensions | `bzlmod.md` (BZL-MOD) | Only: what `rules_jvm_external`'s `maven_install` extension declares and how its lockfile differs from `crate_universe`'s two-lockfile pattern |
| Determinism, sandboxing, generated-file freshness | `hermeticity.md` (BZL-HERM) | Only: JDK toolchain hermeticity (remote JDK vs host `JAVA_HOME` leakage), annotation-processor determinism |
| Remote cache / RBE | `caching-rbe.md` (BZL-CACHE) | Only: `java_binary` deploy-jar action-key sensitivity, header compilation's effect on cache hit rate |
| CI target selection, matrices, gates | `ci.md` (BZL-CI) | Only: Java-specific test sizing/sharding if it differs from the generic `testing.md` contract |
| Bazel majors, flag churn, `--incompatible_autoload_externally` | `flags-and-versions.md` (BZL-FLAG) | Already carries the one Java-relevant flag fact; `java.md` should link back, not restate |
| Package/target granularity, visibility, platforms | `architecture.md` (BZL-ARCH) | Only: `java_library`/`java_binary` granularity conventions if they diverge from the generic guidance |

`java.md`'s own residue, by elimination: `rules_java` load-and-toolchain registration post-Starlarkification, `rules_jvm_external`'s `maven_install` + its lockfile/repin command, `rules_kotlin`'s `kt_jvm_library`/`kt_jvm_binary` and its two-compiler-daemon model, header compilation and strict deps for Java specifically, Error Prone under Bazel, and `java_binary` deploy-jar shape — matching the frame's own list (`jvm-frame.md:39-44`).

## Axis 3 — SDK template: ocx-sdk-python

```
cat pyproject.toml README.md
find src -name '*.py' | xargs wc -l
grep -rn '^class \|^def ' --include='*.py' src/ocx_sdk | grep -v __pycache__
grep -rn -E 'subprocess\.(run|Popen)|asyncio\.create_subprocess' src/ocx_sdk
cat .github/workflows/{ci,release,docs,acceptance}.yml
```

| Commitment | Where stated | JVM analogue to research |
|---|---|---|
| Zero runtime dependencies, stdlib only | `README.md:39-40`, `pyproject.toml` `dependencies = []` | Open — a zero-dep JVM SDK means no bundled HTTP/JSON library (`java.net.http` + a hand-rolled JSON reader, or `kotlinx.serialization` if Kotlin-first breaks the zero-dep claim) |
| `py.typed` ships in the wheel; every public signature typed and covered | `pyproject.toml` `[tool.hatch.build.targets.wheel]`, `[tool.pyright] strict = ["src"]` | JPMS `module-info.java` + `Automatic-Module-Name`, or Kotlin `explicitApi()` mode — which one the SDK is authored in decides this row |
| 100% branch coverage floor (`fail_under = 100`), `show_missing`, XML+HTML reports | `pyproject.toml` `[tool.coverage.report]` | JaCoCo (Java) or Kover (Kotlin) with an equivalent hard `fail_under`; open whether 100% is realistic given the `rules_ocx` audit found no fleet Rust project enforces one either |
| pyright strict on `src/`, standard on `tests/` | `pyproject.toml` `[tool.pyright]` | NullAway + JSpecify strict mode (Java) or Kotlin's own null-safety (already strict by default) — asymmetric strictness between prod and test code is the transferable idea |
| 116-name `__all__` is the entire public surface; everything else is underscore-prefixed and private | `src/ocx_sdk/__init__.py:19-24,162-` | Java package-private + a curated exported package list in `module-info.java`; Kotlin `internal` visibility modifier — either gives the same "one file states the whole contract" property |
| Subprocess boundary via `_process.py`: injectable `PopenFactory`/`ExecFactory` seams for both sync and async paths, one-shot `run_command`/`spawn`, a kill ladder | `src/ocx_sdk/_process.py:101-105,383-421,444-457,762-799` | `ProcessBuilder` wrapped behind an interface with a test seam (constructor-injected factory), matching Java's lack of a built-in mockable process API |
| Exit code IS the error category: 16-member `ExitCode(IntEnum)` (0,1,64,65,69,74,75,77-85), mapped to an exception hierarchy, never parsed from stderr text | `src/ocx_sdk/_errors.py:28-46,65-` | Direct carry-over — same sysexits table (§Axis 4), a Java/Kotlin enum + a checked-or-unchecked exception hierarchy mirroring `OcxError`/`OcxProcessError`/`UsageError`/etc. |
| Doctest harness: Sybil collects `README.md`, `docs/`, `src/` doctests; `testpaths` lists all four locations explicitly | `pyproject.toml` `[tool.pytest.ini_options] testpaths` | **No native equivalent in Java** — this is the gap axis 5 confirms; a JVM SDK either writes a `checks/doc_examples`-style harness (per `tested-examples-by-language.md`'s "Anything else" fallback row) or accepts untested prose examples |
| CI matrix: ubuntu/macos/windows × Python 3.12/3.13/3.14; coverage gate enforced Linux-only (platform branches make 100% unreachable elsewhere) | `.github/workflows/ci.yml` `unit-matrix` job | JDK-version matrix analogue: e.g. 21 (LTS) × 25 (LTS) × latest, same OS spread; same Linux-only-gate reasoning applies if the SDK has POSIX-only code paths |
| Acceptance tier isolated from per-PR path: push-to-main + nightly cron + `workflow_dispatch` only, brings up two registry containers via docker compose | `.github/workflows/acceptance.yml` | Testcontainers-based acceptance suite on an identical trigger set — direct carry-over, no JVM-specific translation needed |
| Canary job: same suite against `ocx`'s `latest` release, nightly-only, `continue-on-error: true` | `.github/workflows/acceptance.yml:33-45` | Same pattern against the JVM CLI's `latest` release — direct carry-over |
| `repo-checks` job: lint GH Actions workflows, check links, scan for committed secrets — all language-agnostic | `.github/workflows/ci.yml:96-108` | No JVM-specific work; reuse as-is |
| Release: tag must match `pyproject.toml` version or the job fails; wheel+sdist attached to the GH release; PyPI publish via **trusted publishing** (OIDC, `id-token: write`, no stored token) | `.github/workflows/release.yml` | Central Portal publishing supports OIDC-based trusted publishing too (post-OSSRH-sunset) — direct analogue; tag-vs-`build.gradle.kts`-version check is the same idea, different file |
| Docs: mkdocs-material + `mkdocstrings[python]` (introspects live Python via `griffe`) + `mkdocs-git-revision-date-localized-plugin`, deployed to GH Pages, `docs:build` runs strict | `pyproject.toml` `[project.optional-dependencies.docs]`, `.github/workflows/docs.yml` | **No JVM equivalent of `mkdocstrings`/`griffe`** — Dokka generates its own static site rather than feeding an existing generator; if the JVM docs pattern must live inside `docs-quality`'s generator table (mkdocs/VitePress/mdBook/Docusaurus/Starlight/Sphinx), Dokka does not fit any wiring row today (§Axis 5 gap) |
| Exit-code-to-exception mapping table (0=OK,1=FAILURE,64=USAGE,65=DATA_ERR,69=UNAVAILABLE,74=IO_ERR,75=TEMP_FAIL,77=NO_PERM,78=CONFIG,79=NOT_FOUND,80=AUTH,81=POLICY_BLOCKED,82=DIRTY_RC_BLOCK,83=TRANSPARENCY_LOG_UNAVAILABLE,84=REFERRERS_UNSUPPORTED,85=UNSUPPORTED_KEY_BACKEND) | `src/ocx_sdk/_errors.py:28-46` | This is the exact table a JVM SDK's exception hierarchy must reproduce — see Axis 4's identical 14-sysexit table from `rules_ocx`, confirming the two prior-art sources agree byte-for-byte |

## Axis 4 — Tool-provisioning prior art: rules_ocx + setup-ocx

```
sed -n '1,251p' /home/mherwig/dev/rules_ocx/AGENTS.md
cat /home/mherwig/dev/setup-ocx/action.yml
sed -n '1,190p' /home/mherwig/dev/setup-ocx/README.md
```

| Commitment | Source | Gradle concept an OCX Gradle plugin would model |
|---|---|---|
| One extension with tag classes `download`/`project`/`policy` (root-only) and `package` (any module) | `AGENTS.md:9-12` | A **Settings plugin** exposing a root-only `ocx { download {}; policy {} }` block plus a per-project `ocx.project {}`/`ocx.package {}` extension — mirrors Bazel's root-vs-any-module tag-class split |
| `@ocx_tool`: pinned binary from a vendored `dist.json`, sha256-enforced, version floor gate | `AGENTS.md:13-18` | Open — likely a custom `JavaToolchainResolver`-style provisioning step or a `BuildService`-backed download-and-verify, comparable to the Foojay toolchain resolver plugin's shape |
| Project tier pipeline: watch `ocx.toml`+`ocx.lock` → `ocx lock --check` → `ocx pull` → `ocx --format json env` → `ocx --format json inspect --closure` | `AGENTS.md:25-27` | A `ValueSource` (Gradle's documented config-cache-safe mechanism for one-shot external-process reads at configuration time) feeding a `BuildService` that holds the resolved env/closure for the rest of the build |
| Package tier: `package install/which/env` then `package inspect --closure`, symlinked `content/`+`entrypoints/` | `AGENTS.md:28-33` | Open — plausibly a custom `Configuration`-like resolution exposing `Provider<Directory>` per tool, or an `ArtifactTransform` |
| Shared `OCX_HOME`, two independent opt-outs (`isolated_home`, `no_config`) | `AGENTS.md:34-39` | Extension property mapped to a cache-dir `Provider`, analogous to Gradle's own `~/.gradle` global cache with a project-local override |
| Policy tier is root-only, explicit-only env (`OCX_NO_VERIFY`, `OCX_ALLOW_YANKED` — **never** read ambient, always written from the resolved policy) | `AGENTS.md:40-54` | Matches Gradle's own root-enforced, explicit-config pattern for dependency verification metadata / dependency locking — same shape, no new concept needed |
| Invariant: never reimplement OCI/registry logic in Starlark; `--format json` is the only parse surface | `AGENTS.md:58-62` | Direct carry-over: a Gradle plugin shells to `ocx --format json …` and parses JSON, never touches OCI itself |
| Invariant: extension impls get no `module_ctx.os`/getenv — repository rules only | `AGENTS.md:65` | **Direct structural analogue: Gradle's configuration cache.** Anything read to decide task behavior must be a declared task `@Input`/a `ValueSource` key, exactly the same discipline Bazel's repo-rule/extension-impl split enforces — this is the single most load-bearing carry-over fact in the whole file |
| Every reachable sysexit maps to a `fail()` naming the fix; sysexit 75 is retried before ever failing | `AGENTS.md:66-72` | Task/`ValueSource` exceptions map sysexit → a typed `GradleException` subclass with an actionable message; a retry loop precedes any exception for 75 |
| Config precedence: system → user config dir → `$OCX_HOME/config.toml` → managed-config snapshot → `OCX_CONFIG` → `--config` (6 rungs) | `AGENTS.md:179-185` | Open — needs its own precedence table designed against Gradle's `gradle.properties`/project-property/env-var/system-property layering |
| Sigstore trusted-root: independent 6-rung ladder (`--sigstore-trusted-root` → env → config tiers → `$OCX_HOME` file → Rekor cache → live TUF fetch) | `AGENTS.md:186-200` | Open |
| Two-tier CLI JSON contract: `env` (ordered entries + 3 always-present sibling arrays), `package install/which/env`, `inspect --closure` (surface = union of `binaries`+`entrypoints`, dedup by name), `lock --check` (exit 0/65/78) | `AGENTS.md:103-159` | Direct carry-over — no Gradle-specific translation, just JSON parsing against the same shapes |
| `OCX_ENV_CLASSES`: 4 classes — site (10, forwarded verbatim), translucent (4, ambient-unless-overridden), explicit (2, never ambient), pinned (5, fixed every invocation) | `AGENTS.md:211-249` | Ties directly to Gradle's `ExecOperations`/`ProcessBuilder` explicit-environment forking, which config-cache compatibility already forces — a plugin's spawned-process env must be built the same classified way |
| `version` input, default `"latest"` | `setup-ocx/action.yml:8-11` | Extension property / version-catalog entry, mirrors the Foojay resolver's version spec syntax |
| `libc` input, auto-detected (`gnu`/`musl`) | `action.yml:15-18` | Classifier-based artifact resolution, the same pattern Gradle already uses for native/OS-specific dependency artifacts (e.g. grpc-netty) |
| `project` input activates `ocx.toml` (runs `ocx pull`, puts tools on PATH for later steps); empty string opts out | `action.yml:19-23`, README "Usage"/"Binary-only mode" | A Settings-plugin-provisioned `BuildService` initialized once per build, exposing tool paths via `Provider<RegularFile>` to every task that declares it as an input |
| `groups` input: comma-separated project groups to pre-warm (`ocx pull -g`); empty pulls everything in `ocx.lock` | `action.yml:24-27` | Open — extension DSL for selective pre-warming |
| `cache` (default true): binary cache keyed on target-triple+version; object-store cache keyed on `os/arch/libc + ocx version + sha256(ocx.lock)`; volatile subdirs (`symlinks/`,`projects/`,`state/`,`temp/`) excluded | `action.yml:28-31`, README "Caching" | A Gradle plugin needs the identical two-tier cache-key discipline for GH Actions cache integration — direct carry-over of the *pattern*, keys change to whatever the JVM CLI's lockfile is called |
| `managed-config` input adopts an org-wide `[managed]` config tier before project activation; hard-fails on adoption error (no silent fallback) | `action.yml:35-38`, README "Managed config" | Open — plausibly an included-build / convention-plugin layering an org config before per-project provisioning |
| Outputs: `version`, `ocx-path`, `cache-hit`, `project-loaded`, `project-cache-hit`, `managed-config-adopted` | `action.yml:39-52` | Extension properties/`Provider`s exposed to the consuming build script, e.g. `ocx.version`, `ocx.projectLoaded` |

## Axis 5 — docs-quality's tested-example table

```
cat skills/docs-instrument/references/tested-examples-by-language.md
cat skills/docs-instrument/references/wiring-by-generator.md
grep -n -i -E 'java|kotlin|gradle|maven|dokka|javadoc' skills/docs-instrument/references/*.md
```

**Result: zero matches.** The per-language table (`tested-examples-by-language.md:33-44`) has rows for Shell, Python, Rust (two rows: doc comments via `cargo test --doc`, mdBook fences via `mdbook test`), TypeScript/JavaScript (three rows: Twoslash, Deno's `--doc`, subprocess-per-example), Go (two rows), and a generic fallback ("globs the example tree, runs each file as a subprocess, asserts the exit code", measured floor ~55 lines). **No Java or Kotlin row exists.**

The generator-wiring table (`wiring-by-generator.md:23-30`) lists MkDocs Material, VitePress, mdBook, Docusaurus, Starlight, Sphinx — every entry a documentation-*site* generator, none a JVM API-doc generator. **No Javadoc or Dokka row exists anywhere in either file.**

What's missing, named against the decision order the file itself states (`tested-examples-by-language.md:12-18`, "does the language ship a doctest runner… use it"):

1. **No native JVM doctest mechanism is named as a decision-order step 1 candidate.** Java has none built in; Kotlin has none built in either (KDoc code fences are not executed by any stock tool). Both languages fall to the generic harness by default — that is itself the finding worth writing into the depth file, not a gap in the audit.
2. **No Dokka row in the generator-wiring table.** Dokka (Kotlin's API-doc generator, also documents Java) produces its own static output rather than feeding into mkdocs/VitePress/etc., so it does not fit the existing table's shape at all — a JVM-authoring pass must either add a genuinely new row shape or treat Dokka/Javadoc output as out of `docs-quality`'s scope entirely and say so explicitly.
3. **The "dead tools" warning section (`tested-examples-by-language.md:139-144`) names only JS/TS packages** — no equivalent staleness warning exists for any JVM doctest-adjacent tool, because none has been researched yet.

## Axis 6 — Domain concerns with zero existing config

One line per concern from the frame's domain list (`jvm-frame.md:16-56`), each confirmed absent by the greps above (no result in `rules/`, `skills/`, `bazel-topic-map*`, or `bazel-audit/`) unless otherwise noted:

- **Java language rules** (records, sealed hierarchies, pattern matching, virtual threads/structured concurrency, FFM API, JSpecify, `--release`, JPMS, `jlink`/`jpackage`) — zero.
- **Kotlin/JVM** (K2, coroutines, explicit API mode, binary-compatibility validation, KSP) — zero.
- **Gradle** (config cache, isolated projects, `build-logic`/`buildSrc`, version catalogs, toolchains/foojay, lazy task/property APIs, dependency verification/locking, wrapper, `gradle/actions`, build scans, plugin development/TestKit/Plugin Portal) — zero.
- **Maven** (POM/BOM/enforcer, Central Portal, Maven 4) — zero.
- **Ant** (legacy recognition/migration) — zero.
- **Bazel-for-Java** (`rules_java`, `rules_jvm_external`, `rules_kotlin`, remote JDK toolchains, deploy jars, header compilation/strict deps, Error Prone under Bazel) — zero in the fleet catalog; confirmed also excluded from the sibling Bazel program by name (Axis 2.1).
- **SDK development for the JVM** (japicmp/revapi/BCV, nullness contracts, BOM publishing, JPMS metadata, `Automatic-Module-Name`, multi-release jars, shading/relocation policy, Javadoc/Dokka, Central signing/provenance) — zero; `ocx-sdk-python` (Axis 3) is the only same-shape prior art, in a different language.
- **Fat/shadow jars & distribution shapes** (application-plugin distributions, `jlink` images, `jpackage`, Spring Boot layered repackaging, Jib container images, `java_binary` deploy jars) — zero.
- **Quality gates** (Error Prone, NullAway, Checkstyle, PMD, SpotBugs, detekt, ktlint, Spotless, SonarQube; JUnit 5/6, Kotest, Mockito, AssertJ, Testcontainers; JaCoCo/Kover; dependency-vulnerability scanning; reproducible builds) — zero.
- **docs-quality's per-language tested-example and generator-wiring tables** — zero JVM rows (Axis 5) — this is a *sibling-set* gap, not just a fleet gap, and is fixable by editing an existing file rather than shipping a new one.
- **Lore description-companion assets** (`docs/jvm-*.md`, `assets/lore-java.svg`, `assets/glyphs/java.svg`) — zero; confirmed by direct `ls` (Axis 1.3).
- **Rule-ID namespace** (`JAVA-`, `KT-`, `GRADLE-`, `MVN-`) — free everywhere checked: the fleet catalog (Axis 1) and the Bazel program's own family list (`BZL-` is the only 2026-vintage reservation, Axis 2.1).

## Smells (ranked)

1. **`docs-quality`'s generator-wiring table has no shape for an output-only doc generator.** Every existing row (MkDocs/VitePress/mdBook/Docusaurus/Starlight/Sphinx) assumes a site generator that consumes Markdown pages; Dokka/Javadoc produce their own static site from source comments and fit none of the table's columns (Detection/Declaration carrier/Link checking/Fence tags/Navigation/Search). A JVM docs pass will either force-fit Dokka into a table built for a different shape, or the table needs a new column set — decide before writing, not while writing.
2. **The Bazel program's "twelve depth files, finalized" language (`bazel-topic-map.md:715`) reads as closed**, but the frame explicitly wants a 13th (`java.md`). Handing that file to the Bazel program means editing a file this audit's sibling program already marked as a completed decision — a coordination step, not a technical one, but worth flagging before the authoring pass assumes it's a simple drop-in.
3. **`python-packaging.md` and `typescript-packaging.md` both ship zero depth files** (Axis 1.1) — their whole content lives flat in the index. If `gradle-build.md` follows the frame's plan of carrying plugin authoring, dependency management, and fat-jar/distribution rules all in one file, it is already scoped larger than either packaging precedent and closer in shape to a `-quality` index (12-18 depth files) than a `-packaging` one (0). The frame's own artifact-set table calls this out as open ("Maven and Ant … either extra globs on the same rule … or a thin sibling — the map decides on measured overlap") — this audit adds the numeric argument for treating `gradle-build` as *quality-shaped*, not *packaging-shaped*.
4. **No JVM-bearing repository exists anywhere the catalog's own CI can glob-check against** (Axis 1.3) — the `check-artifacts.py --root` liveness check has no consumer, same as CSS and docs today. Precedented, not a blocker, but worth stating so the authoring pass doesn't try to invent a fix nobody asked for.
5. **`ocx-sdk-python`'s zero-runtime-dependency commitment (Axis 3) may be unreachable for a Kotlin-first SDK** the moment it needs JSON parsing beyond what `java.net.http` + hand-rolled parsing gives — the frame leaves "Java-first with Kotlin-friendly API, or Kotlin-first with Java interop" as an open owner decision, and this constraint should feed that decision, not surprise it later.

## Patterns worth encoding

- **Index/depth split with one-level-deep, task-worded routing** — every rule set does this identically; the JVM rule set should too, with `java-quality.md`/`gradle-build.md` as the index and depth files answering "doing X → read Y", never "topic Y → read Y".
- **Language prefix on every family since Rust** (`PY-`, `TS-`, `DOC-`, `CSS-`) — carry `JAVA-`/`KT-`/`GRADLE-`/`MVN-` forward, not bare families.
- **A packaging-shaped rule loads on the manifest, not the source glob** (`python-packaging` on `pyproject.toml`, `typescript-packaging` on `package.json`) — `gradle-build.md` should load on `*.gradle.kts`/`*.gradle`/`settings.gradle*`/`gradle.properties`/`libs.versions.toml`/wrapper properties, never on `*.java`/`*.kt`.
- **A Bazel-Java depth file routes into the existing six mechanic-owning files rather than restating them** (Axis 2.3) — the same discipline the catalog's own routing tables already enforce ("depth files do not point at each other" is about *sibling* depth files; a per-language Bazel file pointing *up* into the mechanic files is the established pattern for `rust.md`/`python.md`/`javascript-typescript.md`/`cpp.md` too).
- **Sysexits as the sole error classification, never stderr text-matching** — both `ocx-sdk-python` (Axis 3) and `rules_ocx` (Axis 4) independently commit to this, with matching 14-16-member tables. A JVM SDK/plugin pair should reproduce the exact numeric table, not re-derive its own.
- **Config-cache discipline (Gradle) ≈ repository-rule/extension-impl purity (Bazel)** — the single clearest transferable constraint from Axis 4: anything a Gradle plugin reads to decide behavior must be a declared task input or `ValueSource` key, exactly mirroring `rules_ocx`'s "no `module_ctx.os`, no getenv — repository rules only" invariant.
- **Verification cells that state what empty output means** — three separate rule sets (`PY-CORE-08`, `TS-CORE-03`, and implicitly every rust-quality verification cell) independently arrived at requiring this; a JVM rule set's verification column should too.

## Contradictions of the frame

1. **Frame hypothesis: "Bazel-for-Java … fills the `rules_java`/`rules_kotlin` gap that program declared out of scope" (hypothesis 5) — confirmed, not contradicted**, but with a sharper edge than the frame states: the Bazel program didn't just decline to cover Java, its finalized depth-file list (twelve files, `bazel-topic-map.md:715-732`) treats the set as *closed*. The frame's plan to hand over "a `java.md` depth-file candidate" is correct in substance but should be phrased as reopening a closed decision, not slotting into an anticipated gap — no placeholder or 13th-family reservation exists in the Bazel program's own artifact-set decision.
2. **Frame's assumption that JVM rule authoring can lean on existing catalog conventions for lockfiles/coverage/CI-caching is weaker than implied.** The frame lists `rust-cargo`, `python-packaging`, `typescript-packaging` as sibling sets "whose globs and rules a JVM set must not silently duplicate" (`jvm-frame.md:119-127`) — true, but the audit found *zero* shared content to duplicate in the first place (Axis 1.2): every lockfile/coverage/CI rule found is manifest-format-specific prose, not a generalizable pattern the JVM set can cite or extend. The non-duplication risk the frame worries about doesn't exist; the real work is starting from zero, not avoiding overlap.
3. **Nothing in this audit contradicts hypotheses 1-4 or 6** (Gradle-over-Maven depth, fat-jars as their own topic, Gradle-plugin-dev as its own artifact, linting/testing prominence, SDK-dev load-bearing for the future OCX SDK) — this axis measures fleet/catalog/sibling-program config, not JVM ecosystem practice, so those hypotheses are untestable from this file's sources and remain open for the topic-map/scout waves.

## Gaps

- **This audit did not open any exemplar-corpus file.** All 32 SHAs are recorded (per instruction) but unmeasured here — the "requester's hypotheses" that need JVM-ecosystem evidence (Gradle-vs-Maven depth, fat-jar antipattern status, plugin-dev distinctness) are out of this file's method entirely and belong to the topic-map/scout waves.
- **No fleet repository exists to test a real `check-artifacts.py --root` run against JVM globs** — the liveness-check numbers in Axis 1.3 are structural (what the task/script *would* do), not an executed run, because no consumer tree exists.
- **The Gradle-concept mappings in Axis 4's rightmost column are honestly "open" for six of nineteen rows** — `rules_ocx`/`setup-ocx` are Bazel/GitHub-Actions artifacts with no Gradle equivalent built yet anywhere the fleet or catalog can be grepped; those cells are this audit's best inference, not a measured fact, and should be re-verified against real Gradle plugin-development exemplars (`shadow`, `detekt`, `sqldelight`, `spotless`, `ktlint`, `gradle/actions` in the corpus table) before being treated as settled.
- **Whether Dokka fits `docs-quality` at all, or should be marked "not studied" the way `rules/css-theming.md:164` and `rules/docs-quality.md:167` both carry explicit "Not Studied" sections**, is a decision this audit surfaces but does not make — Axis 5 names the shape mismatch; resolving it is an authoring-pass decision.
- **`bazel-quality`'s ownership of a `java.md` depth file is a cross-program coordination question this audit cannot resolve** — it can state what the file would need to contain and where it would slot in (Axis 2.3), but not whether the Bazel program's orchestrator will accept a 13th family into an artifact set its own corrections section already called finalized.
