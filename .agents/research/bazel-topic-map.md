---
title: "Bazel topic map — wave 1 deduplicated, adjudicated, wave 2 commissioned"
phase: 3
model: opus
date: 2026-09-05
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 13
candidates_deduplicated: 217
---

# Bazel topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject area — a question a rule can later
   answer with a named verification. "Performance" is a wave; "does a
   per-edge transition multiply the action count, and how would you measure
   it" is a topic.

2. **Coverage** is measured against two ledgers, not against Bazel-in-general.
   The first is `rules_ocx`'s own normative content — `AGENTS.md` (37 claims)
   plus `.claude/rules/starlark.md` (8 claims), enumerated row by row in
   [cfg §2](bazel-audit/config-inventory.md). The second is the six sibling
   lore rule sets, which say nothing about Bazel at all
   ([cfg §3](bazel-audit/config-inventory.md): zero hits for "bazel", "build
   system", "hermetic" or "reproducib" across 808 lines). So `covered` is rare
   and always means "a rule exists and is right". `partial` almost always
   means "`AGENTS.md` asserts it in prose with no re-runnable check" — 31 of
   45 ledger rows are in that state. `covered-in-practice` means the fleet
   *does* the right thing today with nothing written down that would keep it
   that way.

3. **Priority is against THIS fleet**, not against Bazel adopters generally.
   The fleet is: one Bazel repository (`rules_ocx`, 5,851 lines of Starlark,
   0 `rule()` declarations, 0 `cc_*`/`py_*`/`js_*`/`rust_*` targets); sixteen
   repositories that do not build with Bazel and have no plan to; zero `.proto`
   files; zero Go; zero C++ consumers. A topic that is P0 for a Google-scale
   monorepo and inert here is P2. The reverse happens too — repository-rule
   and module-extension mechanics are a footnote in most Bazel curricula and
   are P0 here, because that is the entire public surface of the one repo that
   exists.

4. **Shapes** a row binds, named from
   [fleet](bazel-audit/fleet-bazel-readiness.md)'s own "Repo shapes" table:

   | Shape | What it is | Repos |
   |---|---|---|
   | **A** | Starlark ruleset publishing to the BCR | `rules_ocx` |
   | **B** | Rust CLI + Python acceptance harness (incl. plain Rust workspaces) | `ocx`, `grimoire`, `ocx-mirror`, `bob`, `rust-oci-client` |
   | **C** | Rust + TypeScript monorepo | `creeptd-ng` |
   | **D** | Python library or automation | `ocx-sdk-python`, `ocx-mirror-sdk`, `arcana/nox`, `index/bot-tools`, `ocx-indexbot` |
   | **E** | TypeScript package, extension or Action | `ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `fma`, `setup-ocx`, `kate-middlechild`, `creeptd-ng/web` |
   | **F** | Future polyglot Bazel monorepo — the adopting repo, and `rules_ocx`'s own users ("Bazel monorepo maintainers", per its `AGENTS.md`) | none today |

   `all` binds every shape. Shape F carries most of the per-language rows: no
   fleet repo uses a language rule today, so those rows are grounded on the
   rulesets' own docs and the practitioner corpus, never on fleet code.

5. **Source keys** are links:
   [frame](bazel-frame.md) ·
   [cfg](bazel-audit/config-inventory.md) ·
   [shape](bazel-audit/starlark-code-shape.md) ·
   [ci](bazel-audit/build-contracts-and-ci-posture.md) ·
   [fleet](bazel-audit/fleet-bazel-readiness.md) ·
   [canon](bazel-topic-map/canonical-bazel.md) ·
   [prac](bazel-topic-map/practitioner-and-conferences.md) ·
   [cod](bazel-topic-map/codified-and-lint-catalogue.md) ·
   [fail](bazel-topic-map/failure-corpus.md) ·
   [lang](bazel-topic-map/language-rulesets-canonical.md) ·
   [pain](bazel-topic-map/language-pain-points.md) ·
   [rbe](bazel-topic-map/rbe-and-caching.md) ·
   [arch](bazel-topic-map/architecture-and-monorepo-practice.md) ·
   [shift](bazel-topic-map/recent-shifts-and-research.md).

6. **Every P0 is checkable** — the priority column names the command, lint
   name, query or reading heuristic. A P0 with no check is a P1 in disguise.

7. **Version-specific rows carry the era.** Bazel 9.2.0 is Active LTS, Bazel
   8.8.0 is Maintenance, `rules_ocx` pins 8.7.0. Rulesets as of 2026-09-05:
   rules_js 3.4.1, rules_python 2.3.3, rules_rust 0.74.0, rules_ts ≥2.0,
   rules_lint 2.9.0, toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0.

## Conflicts resolved

Eighteen places where two wave-1 artifacts disagree, or where an artifact
disagrees with the frame. Evidence ranking used throughout: **normative**
(a spec, a protocol, a release note) > **measured** (a command and its output)
> **codified** (a linter, a registry policy) > **argued** (a reasoned blog
post) > **asserted** (prose with no support).

**1. `bazel-diff` versus one whole-repo green pipeline.** Aspect calls
`bazel-diff` "very incorrect" and target-determinator "very slow", and
recommends a single shared-green pipeline ([prac §11](bazel-topic-map/practitioner-and-conferences.md));
Tinder's BazelCon 2025 talk reports 93 percent CI time saved with it, and Canva
built its own `bazel-diff`-based input hasher rather than take either vendor's
advice ([prac §14, §17](bazel-topic-map/practitioner-and-conferences.md)).
Both are argued, not measured against each other. **The tie is broken by the
tools' own documentation, which is normative for their own behaviour**:
`bazel-diff`'s README concedes it "is incorrect and will sometimes miss
affected targets"; `target-determinator`'s README concedes its results cache
key "excludes home- and system-level `.bazelrc`, environment variables, and
host hardware/OS" ([rbe §26](bazel-topic-map/rbe-and-caching.md)). **Resolved:
neither is a default.** The default is whole-repo green *plus* a stated
determinism precondition, and target selection is a scale decision the map
puts to the owner (Q3). Canva's own sequencing is the decisive detail — they
fixed the non-hermetic steps (shared `localstack` containers, a11y suites)
*before* any selection strategy could be trusted. That precondition, not the
tool choice, is the P0.

**2. Whether to adopt Bazel at all.** `arch` and `prac` both carry adoption
case studies (Uber, Canva, Snowflake) written from a "here is how to do it
well" stance. Against them: roughly 11 percent of adopters abandon Bazel
around year two ([prac §17](bazel-topic-map/practitioner-and-conferences.md),
citing an empirical study presented at BazelCon 2024); RabbitMQ removed its
Bazel files in March 2025 in a real, dated PR; the 2026 comparison consensus
is that small, single-language or JS-only repos should often not adopt
([fail §14](bazel-topic-map/failure-corpus.md)). **Resolved for the sceptics,
on measured evidence over argued.** The decisive number is not the abandonment
rate — it is [shift §22](bazel-topic-map/recent-shifts-and-research.md)'s
383-project study finding **31.23 percent of Bazel projects with CI configured
never invoke Bazel inside that CI**. Adoption that does not reach CI is
adoption that bought nothing. Consequence for the artifact set: `bazel-adopt`
opens with a go/no-go gate, not a migration checklist, and "does CI actually
run Bazel" is a P0 row (M-F-04).

**3. Symbolic macros: recommended, or performance-overclaimed?** `canon §3`
and `arch §11` both report symbolic macros as the Bazel 8 default and the
recommended encapsulation layer. `fail §5` (Tweag, 2025-11-20 — the most
recent primary-adjacent source in the whole corpus) reports that lazy
evaluation, their headline performance promise, is **still unshipped**, and
Bazel's own macros page confirms it is "currently being considered for a
future Bazel release". `prac §17` adds that Google engineers pushed back
internally over lazy macros encouraging oversized BUILD packages. **Resolved:
both are true and the rule must say both.** Symbolic macros are correct for
typing, visibility scoping and naming safety — all shipped. They are not yet a
performance fix. A rule that says "switch to symbolic macros for a performance
win" is overclaiming as of 2026-09-05 and must be dated.

**4. What rules_python's uv support actually is.** The frame assumes
"rules_python 1.x with uv support" settles the fleet's uv-everywhere posture.
Three artifacts disagree with the frame and mildly with each other:
[lang §10](bazel-topic-map/language-rulesets-canonical.md) reads the current
docs and states "Currently `rules_python` only supports `requirements.txt`
format", with `pylock.toml` open as gh-issue #2787 and `uv pip compile` marked
experimental; [fail §11](bazel-topic-map/failure-corpus.md) says the uv
integration "does not consume a `uv.lock` file at all" and points users
wanting the full story at `aspect_rules_py`;
[pain §8](bazel-topic-map/language-pain-points.md) reads the CHANGELOG and
finds a `pip.parse(uv_lock=...)` parameter that exists but "still does not
expose uv workspace/root members". **Resolved for `pain`, which read the
changelog rather than the prose docs**: the parameter exists, is narrower than
its name suggests, and there is no path from a fleet `uv.lock` to a hermetic
Bazel Python graph today. The frame's correction 7 already says this; this map
adds the version (`rules_python` 2.1.0, 2026-06-17) and the consequence — every
one of the fleet's seven `uv.lock` files is a *migration cost*, not an asset.

**5. Build without the Bytes: default, or load-bearing liability?** `canon §16`
and `rbe §6` present BwoB as the documented fix for network-bound builds.
`prac §10` and `fail §3` present it as the thing that made the remote cache
load-bearing infrastructure, with a named failure class ("Failed to fetch blobs
because they do not exist remotely") recurring across four independent trackers,
and a BuildBuddy measurement of one build's downloads jumping 1.8 MB → 640 MB
when a long-lived server outlived the 3-hour cache TTL. **Resolved: not a
conflict, a sequencing error.** The normative source ([rbe §16](bazel-topic-map/rbe-and-caching.md),
the current command-line reference) settles the facts: `--remote_download_outputs`
already defaults to `toplevel` since Bazel 7, exit code **39** exists for lost
inputs, and `--experimental_remote_cache_eviction_retries` defaults to 5. So
BwoB is not a flag to turn on — it is on, and the real topic is whether the
*eviction* path is handled. The rule's row is M-D-08 (handle exit 39), not "set
`--remote_download_minimal`".

**6. Which hermetic C++ toolchain.** `rules_cc`'s own README states it "does
not yet offer a hermetic toolchain distribution" and names four third-party
projects without endorsing one ([lang §22](bazel-topic-map/language-rulesets-canonical.md)).
`lang` then observes toolchains_llvm gaining ground for anything needing the
newest features (C++ named modules, Bazel 9.2 + LLVM 22) while
`hermetic_cc_toolchain` (zig) has no equivalent roadmap item and ships two
documented traps: UBSAN on by default (a clean-elsewhere program crashes with
`SIGILL`) and a Zig cache outside Bazel's output base that `bazel clean
--expunge` never clears. `pain §22` adds Pigweed's account and the upstreamed
modular toolchain API in `rules_cc` 0.0.10. `frame` notes `rules_ocx`'s own
developer box points `CC` at a zig wrapper. **Resolved: no single winner, and
the rule must say so — but the choice is not free-form.** Decision tree by
constraint, not by preference: needs C++20 named modules or the newest
sanitizer story → `toolchains_llvm`; needs trivial cross-compilation to many
targets and can absorb UBSAN-by-default → `hermetic_cc_toolchain`; needs a
toolchain shaped exactly to one platform → the modular `rules_cc` API. The
fleet's own zig arrangement is **not** an endorsement — it is a workaround for
a missing `g++` on one developer machine, and it governs zero targets
([ci Headline](bazel-audit/build-contracts-and-ci-posture.md): 0 `cc_*`
targets anywhere in the repo).

**7. Dev-tool provisioning has three patterns and no winner.** `cod §11` names
`rules_multitool` and `bazel_env.bzl` and observes that no source read compares
them head to head; `arch §17-18` describes both mechanisms in more detail;
`cfg` Contradiction 2 adds a *fourth* option nobody documents as a named
pattern — `bazel`, `bazelisk`, `buildifier`, `buildozer` and `bazel-lsp` are
already published OCX packages, and `rules_ocx` dogfoods its own module
extension for its dev toolchain. **Resolved: this is a genuine open choice and
the rule states it as one**, with the selection criterion named rather than
the winner: `rules_multitool` when the tools must be pinned per platform in a
lockfile and used only inside the build; `bazel_env.bzl` when developers and
IDEs must see the same versions on `PATH`; a package-manager extension when
the organisation already runs one. The fleet is in the third case by accident,
not by decision — worth stating as a decision so nobody re-litigates it.

**8. Are official docs or blogs the safer source?** The frame's hypothesis 3
says the real pain lives in blogs. `cfg` Contradiction 4 measures the fleet's
own research note citing official docs 4:1 over blogs. `fail` and `prac` find
the pain distributed across GitHub issues and BazelCon talks as much as blogs.
And `rbe §10` finds Bazel's own `remote/ci` page still instructing readers to
add a `bazel-toolchains` WORKSPACE dependency and an `rbe_autoconfig` target —
flatly impossible on Bazel 9. **Resolved: neither corpus is uniformly safer;
recency is what decides.** Operational rule for every dive: a claim about
current behaviour must come from the release notes, the command-line reference,
or a ruleset's own changelog — the three sources with a version attached. A
`bazel.build` prose page is *not* automatically current
([canon Contested](bazel-topic-map/canonical-bazel.md) finds the Bzlmod
migration guide's own dates already a year stale). Blogs and talks are the
better source for *failure modes* and for anything the docs admit they do not
answer.

**9. Is `rules_ocx` an exemplar or a cautionary tale?** The frame lists glob
misuse, `select()` explosion and repository-rule hermeticity as suspected pain
points. `shape` measures the opposite on every count: 0 real `**` globs, 1 real
`select()`, 9 `getenv` and 4 `watch` sites funnelled through 2 individually
tested helpers, both `download` sites carrying `sha256`, 51/51 production attrs
documented, 0 `native.*` uses, and module-extension purity documented in a
source comment. `ci §6` independently diffs `AGENTS.md`'s CLI contract against
the code and finds **no mismatch anywhere**, including the deliberate absences.
**Resolved for the measurements: exemplar.** The real smells are elsewhere and
narrower — the 4 repository-rule `_impl` functions have zero `analysistest`
coverage of their own orchestration (M-B-20), `repo_utils.bzl` spans 7 concerns
in 1,602 lines, generated BUILD content is raw string concatenation in 4 places
invisible to buildifier (M-A-17), and there is no `MODULE.bazel.lock` freshness
guard (M-B-01). See "Explicitly not a defect" so no later wave re-investigates
the cleared suspicions.

**10. Is RBE even relevant to this fleet?** The frame's hypothesis 2 makes
remote execution first-class. `ci` Contradiction 2 and `ci §4` show it is not
merely absent but architecturally excluded: `rules_ocx`'s launchers resolve
absolute `OCX_HOME` store paths (the nixpkgs model, `README.md:246-249`), which
an RBE worker cannot reproduce. `rbe §7` adds that dynamic execution
structurally cannot run against a cache-only backend either. **Resolved: RBE
guidance in the shipped set is for shape F, never for shape A**, and the
`rules_ocx` case ships as the worked counter-example — "some designs must
change shape before `--remote_executor` is even a question" (M-D-12). The
*caching* half of the topic stays first-class for shape A: there is a live HTTP
cache, a trust-boundary split, and a plaintext write credential where
`--credential_helper` has been stable since Bazel 7.0 (M-D-03).

**11. The LTS pin.** `canon §23` and `shift §8` both read the live support
matrix: Bazel 9 Active (9.2.0), Bazel 8 Maintenance (8.8.0), Bazel 7
Maintenance, Bazel 6 Deprecated. `ci §2` measures `rules_ocx` pinned at 8.7.0
— behind both the newest 8.x patch and the Active major — with a CI matrix of
8.7.0 / 9.x / rolling. **Resolved on the normative source: the pin is one major
behind Active and one patch behind its own major.** But this map does not
decide the pin, because the cost is real and measured: the docs-freshness
golden files only match 8.7.0's stardoc output (`ci.yml:57-62`), so moving the
pin means regenerating goldens and losing the 8.x signal. Put to the owner as
Q2. The *rule* is version-agnostic either way: every version-specific row
carries the major it applies to, and the shipped set covers 8 and 9 in
parallel until Bazel 8's December 2027 EOL.

**12. Target granularity: 1:1:1 or coarse?** `arch` reports Pants coined
"1:1:1", that Bazel's own docs never use the phrase but converge on the same
rule, and that Google's justification is narrower affected-test sets. It also
reports the cost — fine-grained targets are only sustainable with BUILD-file
generation, which is why Google invests in tooling and why Uber credits Gazelle
as load-bearing. `lang §25` measures the catch: Gazelle's plugin maturity is
**uneven by language** — Python's is first-party inside `rules_python`, JS/TS is
Aspect's, Rust's is the third-party `Calsign/gazelle_rust`, C/C++ is
`EngFlow/gazelle_cc`. **Resolved: granularity is downstream of generator
maturity, not an independent choice.** The rule states it as a conditional —
go fine-grained where a maintained generator exists for that language, stay
coarse where BUILD files would be hand-maintained. For this fleet that means
fine-grained is available for Python and TS, marginal for Rust, and the
"1:1:1" phrase is flagged as Pants vocabulary so nobody cites it as Bazel's.

**13. The lockfile's own version number.** `shift §4` reads the current docs
and reports lockfile version **10**. `ci §3` runs `json.load` on the actual
committed file and reports `lockFileVersion` **24**. **Resolved for `ci` —
measured beats documented, and the gap is the finding**: the published docs are
stale about their own format version by fourteen revisions. Consequence: no
rule may cite a lockfile version number from documentation. The verification is
`python3 -c "import json;print(json.load(open('MODULE.bazel.lock'))['lockFileVersion'])"`
against the file in hand, and the *rule* is about the failure mode (a version
mismatch makes an old lock unreadable) rather than about any particular number.

**14. A flag the frame named does not exist.** The frame lists
`--experimental_remote_merkle_tree_cache` among the shifts to check, and
`cod §4` repeats it inside Aspect's recommended always-on flag list. `rbe §16`
fetched and parsed the current command-line reference in full: the flag is not
there. The live flag is `--experimental_remote_discard_merkle_trees`, default
**true**, with *inverted* intent — it discards in-memory Merkle trees to save
memory rather than caching them. **Resolved for `rbe`, on the normative
source.** This is the cleanest illustration in the corpus of why flag guidance
must be re-derived from the reference rather than from memory or a blog: two
independent wave-1 artifacts carried the phantom flag forward.

**15. `compatibility_level`: dead ceremony or still presubmit-checked?**
`canon §14` quotes the Bzlmod FAQ: "You should stop using `compatibility_level`
… starting with Bazel 8.6.0 and 9.1.0, both `compatibility_level` and
`max_compatibility_level` are no-ops." `cod §7` reads the BCR's own policy doc
and finds presubmit still validating a version's `compatibility_level` against
its predecessor, with `@bazel-io skip_check compatibility_level` as the
override. **Resolved: both hold, at different layers.** The Bazel *resolver*
ignores the field on 8.6+/9.1+; the BCR *registry* still gates on it as a
change-review signal. So a BCR-published module must keep the field consistent
to get through presubmit while getting no resolution behaviour from it — a
distinction a rule must draw explicitly, because "it's a no-op" reads as
"delete it" and would fail `rules_ocx`'s next submission.

**16. The fleet is smaller than the frame says, and the scouts inherited the
error.** The frame's table gives `creeptd-ng` 65 `Cargo.toml`, 15 `build.rs`
and 6 `package.json`. `fleet` Contradiction 1 measures 13, 3 and 3 — the first
two inflated 5× by counting four `.worktrees/` checkouts as code, the third a
separate miscount matching neither reading. **Resolved for `fleet`, measured.**
This matters beyond arithmetic: `prac`'s candidate row 138 and `fail`'s row 166
both frame a scale question around "the fleet's largest repo, 65 `Cargo.toml`",
and at 13 the answer changes. **No repo in this fleet is at monorepo scale.**
Every wave-2/3 brief that reasons from fleet size must use `fleet`'s numbers,
and the adoption question (M-G-22) starts from "probably not, here is what
would change that" rather than "which repo first".

**17. Ruleset versions are one to two majors past the frame.** The frame names
"rules_js 2.x, rules_python 1.x, rules_rust 0.6x". `shift §10-12` and `lang`
read the release pages: rules_js **3.4.1** (3.0 dropped Bazel 6, WORKSPACE and
pnpm <9 outright), rules_python **2.3.3** (2.0 made Windows use venvs and
enabled the Bazel downloader by default), rules_rust **0.74.0** (2026-08-28,
still shipping `crate_universe` lockfile fixes). **Resolved for the release
pages, normative.** Consequence for the per-language dives: any snippet or
claim inherited from model training data is presumed one major stale, and every
per-language brief below names the version to verify against.

**18. Is the buildifier gate a gate?** `cod §1` reads the config source and
establishes that `-lint` defaults to `off`, that an empty `-warnings` resolves
to all-but-`unsorted-dict-items`, and that `rules_ocx`'s `buildifier.check`
runs `lint_mode="warn"` with `mode="diff"`. `shape §5` reaches the same reading
independently and states the consequence: "CI's lint gate is a hard
format-check plus a soft (non-blocking) lint report". **Resolved — both agree,
and the agreement is the finding.** A real lint violation passes CI today
unless something downstream inspects the warning output. That is M-A-02, P0,
and its verification is concrete: seed a `depset-union` violation, run
`bazel run //:buildifier.check`, and check the exit code.

## The map

217 deduplicated questions from ~370 raw candidate rows, grouped by the depth
file that will own them. One `BZL-<FAMILY>` per section; the section header
names it, the column repeats it so a row survives being quoted alone.

### A. `starlark.md` — Starlark, BUILD and `.bzl` authoring · Family `BZL-LARK`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-A-01 | Does every public `.bzl` symbol carry a docstring and every `attr.*()` a `doc=`? | A, F | covered ([cfg](bazel-audit/config-inventory.md) #39-40; [shape](bazel-audit/starlark-code-shape.md) §2 measures 51/51) | P2 — already true in the one exemplar; the rule pins the bar. Check: buildifier `function-docstring` + paren-balance scan | `BZL-LARK` |
| M-A-02 | Does the buildifier gate actually fail CI on a lint finding, or only on formatting drift? | A, F | partial ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §1; [shape](bazel-audit/starlark-code-shape.md) §5) | P0 — `lint_mode="warn"` prints and passes. Check: seed a `depset-union` violation, run `bazel run //:buildifier.check`, read the exit code | `BZL-LARK` |
| M-A-03 | Which buildifier warnings are backed by an `--incompatible_*` flag (≈40 of ≈84) and which are style-only? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §1) | P1 — conflating "style nit" with "breaks on next major" mis-tiers every finding. Check: the `WARNINGS.md` flag cross-reference column | `BZL-LARK` |
| M-A-04 | Is `unsorted-dict-items` — the one default-off warning — worth enabling for tag-class and attr dicts? | A | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §1) | P3 — deliberate upstream opt-out; needs an explicit yes/no, not silent inheritance | `BZL-LARK` |
| M-A-05 | Does any `.bzl` build a depset inside a loop with itself as `transitive`? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §1; [canon](bazel-topic-map/canonical-bazel.md) §8) | P1 — O(N²) analysis cost, no `--incompatible_*` will ever catch it. Check: buildifier `overly-nested-depset` | `BZL-LARK` |
| M-A-06 | Does a rule implementation flatten a depset outside debugging? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §8) | P1 — named the #1 rule-implementation performance pitfall. Check: `grep -n '\.to_list()'` plus `--experimental_generate_json_trace_profile` | `BZL-LARK` |
| M-A-07 | Does Starlark dict or set iteration order leak into an action command line or a generated file? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §24; [shift](bazel-topic-map/recent-shifts-and-research.md)) | P0 — silent action-key instability. Check: two `--execution_log_compact_file` runs diffed with `execlog:parser` | `BZL-LARK` |
| M-A-08 | Does a rule implementation return a legacy `struct` instead of declared providers? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) `rule-impl-return`; [canon](bazel-topic-map/canonical-bazel.md) §5) | P1 — `--incompatible_disallow_struct_provider_syntax` is a permanent no-op on 9.0. Check: buildifier `rule-impl-return` | `BZL-LARK` |
| M-A-09 | Does every `provider()` declare `fields` and a doc string? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) `provider-params`) | P2 — undeclared fields make a later field addition backward-incompatible by construction; 0 providers in the fleet today | `BZL-LARK` |
| M-A-10 | Symbolic macro, legacy macro, or a real rule — what forces the choice? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §3; [arch](bazel-topic-map/architecture-and-monorepo-practice.md) §11; [fail](bazel-topic-map/failure-corpus.md) §5) | P0 — the default is now symbolic (Bazel 8), and legacy is a fallback with named exceptions (`glob()`, untyped params). Reading heuristic: does it need `glob()` or an untyped param? | `BZL-LARK` |
| M-A-11 | Does a symbolic macro create a target whose name does not start with the macro's own `name`? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §5, Tweag 2025-11-20) | P0 — hard load-time error, greppable before Bazel sees it. Check: grep target names in the macro body against `name` | `BZL-LARK` |
| M-A-12 | Does macro code mutate `kwargs` (a frozen dict) or call `.append()` on a `select()`-wrapped attribute? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §5) | P0 — legacy macros allowed both silently; symbolic macros throw. Check: grep for `kwargs[` assignment and `.append(` on an attr | `BZL-LARK` |
| M-A-13 | Do attributes inherited via `inherit_attrs` default to `None` rather than the wrapped rule's real default? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §3; [fail](bazel-topic-map/failure-corpus.md) §5) | P1 — code assuming an empty-list default breaks on port. Reading heuristic: every inherited attr needs an explicit `None` branch | `BZL-LARK` |
| M-A-14 | Is symbolic-macro lazy evaluation shipped, or still pending? | A, F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §5; [prac](bazel-topic-map/practitioner-and-conferences.md) §17) | P0 — prevents a false-promise rule. Answer as of 2026-09-05: unshipped | `BZL-LARK` |
| M-A-15 | Do rule or macro call sites use positional arguments, blocking a symbolic-macro migration? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) `positional-args`) | P1 — no autofix exists; it is the named migration blocker. Check: buildifier `positional-args` | `BZL-LARK` |
| M-A-16 | Does every `.bzl` under a `private/` tree carry a `visibility()` load-gate? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #38; [shape](bazel-audit/starlark-code-shape.md) Patterns §1) | P1 — BUILD-target visibility does not gate `load()`. Check: `grep -L '^visibility(' <dir>/*.bzl` must print nothing | `BZL-LARK` |
| M-A-17 | Is BUILD content generated as a Starlark string, invisible to buildifier, stardoc and every grep-based audit? | A, F | uncovered ([shape](bazel-audit/starlark-code-shape.md) Smells §3) | P0 — 4 sites in `rules_ocx`; a typo in a generated `package()` passes every static check. Check: an integration test that actually builds a target from the generated repo | `BZL-LARK` |
| M-A-18 | Does a Bazel-dialect Starlark file use a top-level `if` or `for` statement? | A, F | uncovered ([cfg](bazel-audit/config-inventory.md) Patterns §1) | P0 — parse-time failure that reds every target at once; shipped broken twice in `ocx-contrib`. Check: `grep -nE '^(if\|for\|while) '` over `.bzl`, `.star`, `.scl` | `BZL-LARK` |
| M-A-19 | Does an `analysistest` `expect_failure` pass vacuously because the expected fragment also appears at the test's own call site? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #45) | P0 — a genuinely portable Bazel-testing trap; verbatim reuse candidate. Check: hold the fragment in a constant the call site cannot spell, and see the test red once | `BZL-LARK` |
| M-A-20 | Does a function have a some-but-not-all-paths return, or read a local before every branch assigns it? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) `return-value`/`uninitialized`) | P2 — real correctness traps with no flag behind them. Check: those two buildifier warnings | `BZL-LARK` |
| M-A-21 | Are BUILD files being made DRY at the cost of readability, inverting the BUILD-versus-`.bzl` style split? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §20) | P2 — the two style guides have opposite priorities; a shared dependency-list variable is the named smell. Reading heuristic: a list variable used by more than one target | `BZL-LARK` |
| M-A-22 | Does a `.bzl` export more public symbols than are ever used together? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §3) | P2 — no mechanical check exists; grep-and-judge only | `BZL-LARK` |

### B. `bzlmod.md` — modules, lockfile, extensions, repository rules, BCR · Family `BZL-MOD`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-B-01 | Is `MODULE.bazel.lock` verified fresh against `MODULE.bazel` anywhere in CI? | A, F | uncovered ([ci](bazel-audit/build-contracts-and-ci-posture.md) §3: absent, not merely unasserted) | P0 — every other supply-chain surface in `rules_ocx` has a guard; this one has none. Check: `bazel mod deps --lockfile_mode=error` | `BZL-MOD` |
| M-B-02 | What is the lockfile's own format version, and can a newer Bazel read an older lock? | A, F | uncovered, and the two artifacts disagree ([shift](bazel-topic-map/recent-shifts-and-research.md) §4 says 10 per docs; [ci](bazel-audit/build-contracts-and-ci-posture.md) §3 measured 24) | P0 — no rule may cite a version from documentation. Check: read `lockFileVersion` out of the file in hand | `BZL-MOD` |
| M-B-03 | When `MODULE.bazel.lock` conflicts in git, is the fix reset-and-`bazel mod deps`, or a hand-edit? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §10; [fail](bazel-topic-map/failure-corpus.md) §2) | P0 — agents hand-edit generated files by default; only two fields are safe to merge. Check: the documented reset sequence, or a configured `jq` merge driver | `BZL-MOD` |
| M-B-04 | Should `MODULE.bazel.lock` be committed at all, or gitignored during a migration? | A, F | uncovered, contested ([fail](bazel-topic-map/failure-corpus.md) Contested) | P1 — `moduleFileHash` thrashes on nearly any dependency edit; neither mitigation dominates | `BZL-MOD` |
| M-B-05 | Is a module extension's implementation a pure function of its tags, with all host and env access pushed into the repository rules it instantiates? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #2, #15; [shape](bazel-audit/starlark-code-shape.md) Patterns §2) | P0 — asserted in prose with no mechanical check. Check: `grep -n 'ctx\.os\.\|ctx\.getenv(' <extension>.bzl` must be empty | `BZL-MOD` |
| M-B-06 | Does the extension declare `reproducible = True`, and is the claim actually true? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §3) | P0 — gates lockfile exclusion and both Bazel-9 repo-contents caches; a false claim breaks reproducibility silently. Check: same grep, plus a two-run lockfile diff | `BZL-MOD` |
| M-B-07 | Does a repository rule declare every environment variable and path it reads? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #41; [ci](bazel-audit/build-contracts-and-ci-posture.md) §5) | P0 — an undeclared read escapes Bazel's re-fetch trigger entirely. Check: enumerate reads, then assert a matching `getenv`/`watch` for each | `BZL-MOD` |
| M-B-08 | Does every `download`/`download_and_extract` call carry `sha256`? | A, F | covered-in-practice ([shape](bazel-audit/starlark-code-shape.md) §2: 2 of 2), uncodified | P0 — an unchecksummed fetch is both non-hermetic and a supply-chain hole. Check: `grep -n 'ctx\.download'` filtered for lines without `sha256` | `BZL-MOD` |
| M-B-09 | Does any code depend on a canonical repository name? | A, F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §6-9; [fail](bazel-topic-map/failure-corpus.md) §1; [shift](bazel-topic-map/recent-shifts-and-research.md)) | P0 — the format changed twice inside 18 months (`~`→`+` in 8.0, `use_repo_rule` renaming in 9.0). Check: `grep -n '@@'` over `.bzl`, scripts and rc files | `BZL-MOD` |
| M-B-10 | Does an extension try to instantiate a repository and `load()` from it in the same extension? | A, F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §6-9; [fail](bazel-topic-map/failure-corpus.md) §1) | P1 — produces `Circular definition of repositories`; the fix is splitting into two extensions | `BZL-MOD` |
| M-B-11 | Does the extension force consumers to `use_repo()` toolchain internals they never reference? | A, F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §6-9, "toolchainization") | P1 — `rules_ocx` is exactly this shape; the fix moves verbosity from consumer to maintainer | `BZL-MOD` |
| M-B-12 | Is `bazel mod tidy` safe to run unattended in CI? | A, F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §5) | P1 — it rewrites `MODULE.bazel`; an agent-driven workflow needs a verification, not a vibe. It is also absent from the canonical `mod` docs page | `BZL-MOD` |
| M-B-13 | Is `compatibility_level` still being maintained after it became a resolver no-op on 8.6/9.1? | A | uncovered, and the two layers disagree ([canon](bazel-topic-map/canonical-bazel.md) §14 vs [cod](bazel-topic-map/codified-and-lint-catalogue.md) §7) | P1 — the resolver ignores it; BCR presubmit still gates on it. Deleting it fails the next submission | `BZL-MOD` |
| M-B-14 | Does the published module pass BCR's anonymous-module / test-module build? | A | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §26; [cod](bazel-topic-map/codified-and-lint-catalogue.md) §7) | P1 — `rules_ocx`'s `e2e/bzlmod` is build-only, so consumption-as-a-dependency is only partly proven | `BZL-MOD` |
| M-B-15 | Is the module's publicly visible target set kept as small as BCR asks? | A | partial ([shape](bazel-audit/starlark-code-shape.md) §7) | P2 — BCR's maintainer playbook names forgotten `//visibility:public` as a recurring PR fix | `BZL-MOD` |
| M-B-16 | Does a `single_version_override` pinning below a `bazel_dep` requirement now hard-error? | A, F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §3) | P1 — silently ignored on 8, hard error on 9, with no error-message change to grep for beforehand | `BZL-MOD` |
| M-B-17 | Does `--vendor_dir` actually deliver an offline build, and what does it miss? | A, F | uncovered, contested ([canon](bazel-topic-map/canonical-bazel.md) §11 and [rbe](bazel-topic-map/rbe-and-caching.md) §11 vs [shift](bazel-topic-map/recent-shifts-and-research.md) §6's open issues) | P2 — the docs assert it; two open issues show registry content and `mod tidy`-added deps escaping | `BZL-MOD` |
| M-B-18 | Is `VENDOR.bazel`'s `pin()` silently freezing a dependency past its intended update? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §11) | P2 — a lockfile-staleness bug specific to vendor mode, with no error on the stale path | `BZL-MOD` |
| M-B-19 | Does the repository cache cover this repo's repository rules, or do they shell out past `rctx.download()`? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §25) | P1 — `rules_ocx`'s rules `ctx.execute` the ocx CLI, so the repository cache covers almost nothing for them. Check: which fetches go through `ctx.download` | `BZL-MOD` |
| M-B-20 | Do the repository-rule `_impl` functions have any offline test coverage of their own orchestration? | A | uncovered ([shape](bazel-audit/starlark-code-shape.md) §4, Smells §1) | P0 — 4 of 4 uncovered; this is exactly where a hermeticity regression ships unseen. Check: `analysistest.make()` against the production rule, not a fixture | `BZL-MOD` |
| M-B-21 | Is a root-only tag class enforced with `fail()` or silently ignored, and which is right for a security-relevant tag? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #12, Patterns §5) | P1 — the ecosystem default is silent-ignore; a policy tag deliberately breaks with it. Pinned decision worth stating so nobody "fixes" it | `BZL-MOD` |
| M-B-22 | Does a `fail()` reachable from a repository rule name the exact user-fixable command? | A, F | partial ([cfg](bazel-audit/config-inventory.md) #16, #44; [ci](bazel-audit/build-contracts-and-ci-posture.md) Patterns) | P1 — the single most reusable idiom in the fleet's Bazel code. Check: every `fail(` string ends in a runnable command | `BZL-MOD` |

### C. `hermeticity.md` — determinism, sandboxing, environment, generated files · Family `BZL-HERM`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-C-01 | What is the recurring cause list for Bazel action non-determinism? | all | uncovered ([pain](bazel-topic-map/language-pain-points.md) §30; [canon](bazel-topic-map/canonical-bazel.md) §22) | P0 — timestamps, PIDs/UIDs, hash-table iteration order, hidden toolchain files, `/dev/random`, network. Reading heuristic: the six-item list applied per action | `BZL-HERM` |
| M-C-02 | How do you prove a specific action's key is non-deterministic? | all | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §4) | P0 — the aggregate cache-hit line cannot answer it. Check: two `--execution_log_compact_file` runs through `//src/tools/execlog:parser` | `BZL-HERM` |
| M-C-03 | Does a genrule or action emit timestamps, absolute paths, or unstable ordering into its output? | all | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §22) | P0 — the Build Encyclopedia publishes this as a literal checklist. Check: the genrule "General Advice" list, item by item | `BZL-HERM` |
| M-C-04 | Does `genrule`'s PATH pass-through defeat caching, and when should a purpose-built rule replace it? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §7) | P1 — any `PATH` change re-executes the action regardless of behaviour. Check: `grep -n 'genrule('` and ask what each one shells out to | `BZL-HERM` |
| M-C-05 | Does `--incompatible_strict_action_env` — now default true — change what a build inherits? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §16) | P1 — pinned `PATH`, no `LD_LIBRARY_PATH` inheritance; guidance that says "turn this on" is now redundant and guidance that omits it may describe pre-flip behaviour | `BZL-HERM` |
| M-C-06 | Are `--action_env` and `--repo_env` used for the right halves of the build? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §1) | P1 — the wrong one silently breaks cross-machine cache sharing. Check: read every `_env` line in every rc file and say which phase it targets | `BZL-HERM` |
| M-C-07 | Does `--stamp`'s stable-status file carry a genuinely variable value? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §18) | P1 — the volatile file is exempted from invalidation on purpose; the stable file is not, and a real regression shipped that way | `BZL-HERM` |
| M-C-08 | Does the C/C++ toolchain fall back to host autodetection, and what turns that off? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) Headline; [frame](bazel-frame.md) correction 4) | P0 — autodetection probes for a host compiler even when no `cc_*` target exists. Check: `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` and see what breaks | `BZL-HERM` |
| M-C-09 | Is a non-hermetic override that currently governs zero targets a live bug or a latent trap? | A | covered-by-audit ([ci](bazel-audit/build-contracts-and-ci-posture.md) Contradictions) | P2 — a distinction the rule must preserve rather than flatten; it becomes live the moment any dependency pulls in a `cc_library` | `BZL-HERM` |
| M-C-10 | Does the sandbox mount host paths read-only by default, letting a build depend on host system libraries? | F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §18) | P0 — named Bazel's "original sin" #1, with a real GNU-versus-BSD tool mismatch traced to it. Check: `--sandbox_debug` and read the mount set | `BZL-HERM` |
| M-C-11 | Is `--sandbox_default_allow_network=false` set, and which action or test breaks first? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §4; [pain](bazel-topic-map/language-pain-points.md) §30) | P1 — the cheapest way to find a network-dependent action before RBE finds it for you | `BZL-HERM` |
| M-C-12 | Which repository-rule operations are non-hermetic, and what is the runnable way to find them? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §9) | P0 — `execute`, unchecksummed `download`, `.file`, `.os`, `.symlink`, `.which`. Check: `bazel clean --expunge` then `--experimental_workspace_rules_log_file` through the workspacelog parser | `BZL-HERM` |
| M-C-13 | Can a cache hash silently depend on a developer's absolute workspace path? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §152) | P1 — an embedded manifest is the usual carrier. Check: build the same target from two different absolute paths and diff the action keys | `BZL-HERM` |
| M-C-14 | Does `--incompatible_disallow_empty_glob` catch a different bug from `constant-glob`? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §1 sets the flag; [cod](bazel-topic-map/codified-and-lint-catalogue.md) §1 names the gap) | P2 — empty-match and literal-pattern are two bugs, and only one is currently guarded | `BZL-HERM` |
| M-C-15 | Does a recursive `**` glob silently stop at a subpackage boundary? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §16) | P0 — adding a BUILD file in a subdirectory shrinks an existing glob's matches elsewhere, with no warning. Check: `bazel query` the glob's actual expansion, do not read the pattern | `BZL-HERM` |
| M-C-16 | Does every checked-in generated file have a `diff_test` or `write_source_files` pair? | A, F | partial ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §10; `rules_ocx` has one hand-rolled instance) | P0 — without it a developer works against a stale file until CI says otherwise. Check: `bazel test //...` fails and names the `bazel run` fix | `BZL-HERM` |
| M-C-17 | Is a golden-diff test pinned to one Bazel major, leaving the other majors in the matrix unguarded? | A | uncovered ([shape](bazel-audit/starlark-code-shape.md) Smells §5; [ci](bazel-audit/build-contracts-and-ci-posture.md) §7; [cod](bazel-topic-map/codified-and-lint-catalogue.md)) | P1 — a live, dated instance: stardoc emits an extra `repo_mapping` row on 9+, so docs freshness runs only on the 8.7.0 leg | `BZL-HERM` |
| M-C-18 | Does a deliberately uncached CI job actually prove determinism, or only cache-miss correctness? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §5) | P1 — the offline job proves store-warmth, which is not the same as action-key stability. Check: what the job would still pass with a non-deterministic action | `BZL-HERM` |

### D. `caching-rbe.md` — remote cache, BwoB, RBE readiness, cache trust · Family `BZL-CACHE`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-D-01 | What exactly enters a REAPI action key, and what never does? | all | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §1) | P0 — every cache-miss diagnosis depends on this. In: command digest, sorted env, input Merkle root, platform, timeout, salt. Out: host toolchain drift, system headers | `BZL-CACHE` |
| M-D-02 | Are a `Command`'s environment variables and a `Directory`'s children emitted in lexicographic order? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §1) | P0 — spec-mandated; an unsorted list is self-inflicted cache-key instability everywhere downstream. Check: read any custom rule that builds either list | `BZL-CACHE` |
| M-D-03 | Is a bare `--remote_header` token used where `--credential_helper` belongs? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §13, Contested) | P0 — the helper has been stable since Bazel 7.0; the fleet still embeds a write credential in a gitignored rc file. Check: `grep -n 'remote_header' *.bazelrc*` | `BZL-CACHE` |
| M-D-04 | Do untrusted PR builds get a read-only cache and no write credential? | A, F | covered-in-practice ([ci](bazel-audit/build-contracts-and-ci-posture.md) §4), uncodified | P0 — a fork build that can write can plant a backdoored compiler a trusted build later executes. Check: `--remote_upload_local_results=false` on the untrusted lane, and the secret gated on `event_name == 'push'` | `BZL-CACHE` |
| M-D-05 | Beyond write-poisoning, is a public unauthenticated cache a read-side disclosure risk? | A, F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §159) | P2 — a distinct threat from poisoning; anonymous reads expose build inputs | `BZL-CACHE` |
| M-D-06 | Is Build without the Bytes set per CI-runner role, or left at the Bazel-7 `toplevel` default? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §6) | P1 — a runner that never needs artifacts should be `minimal`; an IDE-feeding one should not | `BZL-CACHE` |
| M-D-07 | Does a long-lived Bazel server outlive the remote-cache TTL and silently re-download whole artifacts? | F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §10) | P1 — measured 1.8 MB → 640 MB on one build. Check: `--experimental_remote_cache_ttl` against the vendor's real TTL | `BZL-CACHE` |
| M-D-08 | Is exit code 39 (lost inputs) handled by retry rather than treated as a build failure? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §6) | P1 — a named failure mode with a numeric signature and a retry flag defaulting to 5 | `BZL-CACHE` |
| M-D-09 | Is `--remote_download_regex` used to force IDE-consumed files down under an otherwise-minimal profile? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §16) | P2 — the alternative is regressing the whole build to `all` for one file | `BZL-CACHE` |
| M-D-10 | Does a cache-only setup fall back to local execution when the cache is unavailable? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §16) | P1 — `--incompatible_remote_local_fallback_for_remote_cache` defaults false, so a cache outage is an availability gap | `BZL-CACHE` |
| M-D-11 | Is dynamic execution ever proposed against a cache-only backend? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §7) | P1 — the docs state a cache miss would be read as a failed action. Falsify the shortcut before someone tries it | `BZL-CACHE` |
| M-D-12 | Is this design structurally compatible with remote execution at all? | A | covered-by-audit ([ci](bazel-audit/build-contracts-and-ci-posture.md) §4, `README.md:246-249`) | P0 — absolute host-store paths cannot be reproduced by an RBE worker. The worked counter-example to "just add `--remote_executor`" | `BZL-CACHE` |
| M-D-13 | What must a rule satisfy before RE is turned on? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §3) | P1 — no host `PATH`/`JAVA_HOME` lookups, every tool dependency declared, no host-mutating repository rules | `BZL-CACHE` |
| M-D-14 | Is a deliberately uncached CI job a hermeticity assertion rather than a performance regression? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) Patterns; one of three such jobs carries no rationale) | P1 — "when a job's job is to prove something works without help, giving it help defeats the job". Check: every cache-free job carries a comment saying why | `BZL-CACHE` |
| M-D-15 | Which of the six Bazel caches is actually under discussion? | all | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §24) | P0 — Skyframe, repository, output-tree/action, remote action+CAS, disk, remote execution. Most "why is it still slow" confusion is conflating two of them | `BZL-CACHE` |
| M-D-16 | Does the disk or repository cache grow unbounded, and what GC exists per Bazel version? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §12; [rbe](bazel-topic-map/rbe-and-caching.md) §2) | P2 — disk-cache GC arrived in 7.4; repository-cache GC is still an open request | `BZL-CACHE` |
| M-D-17 | Does `--remote_cache_compression` help, given two independent measurements found it hurting? | F | uncovered, contested ([prac](bazel-topic-map/practitioner-and-conferences.md) Contested; [rbe](bazel-topic-map/rbe-and-caching.md) §16) | P3 — defaults false and is a no-op below 100 bytes; the counter-evidence is second-hand | `BZL-CACHE` |
| M-D-18 | Does the deployed cache server's protocol match the scheme the `--remote_cache` URI declares? | A, F | partial ([rbe](bazel-topic-map/rbe-and-caching.md) §19) | P2 — `--remote_cache` defaults to `grpcs` when unspecified, and the fleet's backend is HTTP | `BZL-CACHE` |
| M-D-19 | Does the cache server enforce `SymlinkAbsolutePathStrategy=DISALLOWED`? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §1) | P2 — a server-operator choice invisible to the Bazel client, and `ALLOWED` permits non-hermetic builds by spec | `BZL-CACHE` |
| M-D-20 | Does the Merkle-tree flag the frame named exist? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) Recent shifts) | P1 — `--experimental_remote_merkle_tree_cache` does not; `--experimental_remote_discard_merkle_trees` does, default true, with inverted intent | `BZL-CACHE` |
| M-D-21 | Is `--experimental_remote_cache_chunking` usable at the pinned Bazel version? | A | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §5) | P2 — the floor is 8.7 or 9.1+, and the fleet pins exactly 8.7.0 | `BZL-CACHE` |
| M-D-22 | Is a cache-miss diagnosed from the execution log, or from the aggregate hit-count line? | A, F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §4, §23) | P0 — the exact methodology exists upstream and is easy to skip. Check: sort cache requests by start time and read the earliest divergent action first | `BZL-CACHE` |

### E. `testing.md` — test contract, sizing, sharding, flakiness, Starlark tests · Family `BZL-TEST`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-E-01 | Does every test target declare an explicit `size`? | all | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §14; [canon](bazel-topic-map/canonical-bazel.md) §21) | P0 — `size` sets RAM (20/100/300/800 MB), CPU and the default timeout; the silent `medium` default either wastes CI slots or times out. Check: `bazel query 'attr(size, "", tests(//...))'` | `BZL-TEST` |
| M-E-02 | Does `shard_count` do anything, given the runner must implement the protocol? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21; [rbe](bazel-topic-map/rbe-and-caching.md) §17) | P1 — capped at 50, and a shard-unaware runner fails loudly only because it never touches `TEST_SHARD_STATUS_FILE` | `BZL-TEST` |
| M-E-03 | Is `flaky = True` masking genuine non-determinism? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21) | P1 — three reruns and a pass on any success, described by the docs as "generally discouraged". Check: `grep -n 'flaky'` and demand a linked cause per hit | `BZL-TEST` |
| M-E-04 | When should `--runs_per_test` isolate a flaky test rather than a rerun mask it? | F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md)) | P2 — the pass/fail semantics of `--flaky_test_attempts` are documented as surprising in their own tracking issue | `BZL-TEST` |
| M-E-05 | Does a test assume a writable absolute path, stable atimes, or a mutable runfiles tree? | all | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21; [rbe](bazel-topic-map/rbe-and-caching.md) §17) | P0 — `TEST_TMPDIR` and `TEST_UNDECLARED_OUTPUTS_DIR` are the only writable paths. Check: run under `--sandbox_default_allow_network=false` and a strict sandbox | `BZL-TEST` |
| M-E-06 | Do tests that need the network carry `requires-network`, and what breaks when the sandbox denies it? | F | uncovered ([rbe](bazel-topic-map/rbe-and-caching.md) §17; [canon](bazel-topic-map/canonical-bazel.md) §21) | P1 — silent failure the instant RBE or a stricter sandbox arrives | `BZL-TEST` |
| M-E-07 | Does `manual` remove a target from `build`/`test` but leave it visible to `query`? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21) | P1 — the canonical "why didn't CI run this" asymmetry. Check: compare `bazel query //...` against `bazel test //...`'s selected set | `BZL-TEST` |
| M-E-08 | Which `tags` change cache, sandbox or remote behaviour, and do they mean the same thing on a test, a genrule and a Starlark action? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21) | P0 — the same string is read from both `tags` and `execution_requirements` with different effects. Check: the tag taxonomy applied per action kind | `BZL-TEST` |
| M-E-09 | Are `no-remote-cache` and `no-remote-cache-upload` used interchangeably? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §21) | P1 — one skips caching entirely, the other only the upload half; the wrong one silently over- or under-caches | `BZL-TEST` |
| M-E-10 | Do repository-rule and module-extension implementations have `analysistest` coverage, or only their pure helpers? | A | uncovered ([shape](bazel-audit/starlark-code-shape.md) §4, Smells §1) | P0 — 34 helper tests and 0 orchestration tests in the one real example. Check: count `analysistest.make(` calls that target a production rule | `BZL-TEST` |
| M-E-11 | Do hand-rolled `ctx` fakes make offline Starlark unit tests possible? | A | partial ([shape](bazel-audit/starlark-code-shape.md) Patterns §5) | P1 — 76 targets, zero network, 34 data-driven guard cases; the fleet's own reusable template | `BZL-TEST` |
| M-E-12 | Does a "no network" test target actually avoid the network on a clean checkout? | A | uncovered ([shape](bazel-audit/starlark-code-shape.md) Smells §4) | P1 — two dogfood `sh_test`s sit inside the same `//...` the taskfile calls network-free. Check: run from a cold repository cache | `BZL-TEST` |
| M-E-13 | Does coverage need a runfiles tree, and does it fail silently on Windows without `--enable_runfiles`? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §16) | P2 — documented for JS; worth confirming for Rust and Python before a rule generalises it | `BZL-TEST` |

### F. `ci.md` — target selection, matrices, gates, release · Family `BZL-CI`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-F-01 | Does CI run every test on every PR, or select affected targets? | all | uncovered, contested ([prac](bazel-topic-map/practitioner-and-conferences.md) §11 vs §17; [rbe](bazel-topic-map/rbe-and-caching.md) §26; [arch](bazel-topic-map/architecture-and-monorepo-practice.md) §7-8) | P0 — the central CI architecture fork. Check: run the chosen tool and diff its selection against "ran everything" on a known-affected commit | `BZL-CI` |
| M-F-02 | If target selection is used, is its specific false-negative mode understood and accepted? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §7-8; [rbe](bazel-topic-map/rbe-and-caching.md) §26) | P0 — both tools document their own gaps; blind trust is the failure. Reading heuristic: name the class of change your tool will miss | `BZL-CI` |
| M-F-03 | Are non-hermetic CI steps found and isolated before any selection or caching strategy is trusted? | F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §14) | P0 — a precondition, not an optimisation; Canva had to fix shared containers and a11y suites first | `BZL-CI` |
| M-F-04 | Does CI invoke Bazel at all, or is Bazel local-only? | F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §22) | P0 — 31.23 percent of Bazel projects with a CI service never run Bazel in it. Check: grep the workflow files for a `bazel`/`bazelisk` invocation | `BZL-CI` |
| M-F-05 | Does the CI matrix cover the pinned major, the Active LTS, and rolling — and which legs block? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §2) | P1 — testing a Maintenance major as the gate and the Active one as advisory is a defensible choice that must be stated | `BZL-CI` |
| M-F-06 | Is the `rolling` leg a canary that never blocks? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §2) | P1 — `continue-on-error: true`, forward-compat early warning only. Pinned decision worth writing down | `BZL-CI` |
| M-F-07 | Does every job's cache scope carry a stated reason? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) Smells §1: two of three do, one does not) | P1 — a reader cannot tell an oversight from a deliberate omission. Check: each cache-free job has a comment | `BZL-CI` |
| M-F-08 | Does the lint job actually fail on a lint finding? | A, F | partial ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §1; [shape](bazel-audit/starlark-code-shape.md) §5) | P0 — see M-A-02; the same defect seen from the CI side | `BZL-CI` |
| M-F-09 | Does CI lint the BUILD files that `.bazelignore` removes from the package graph? | A | uncovered ([ci](bazel-audit/build-contracts-and-ci-posture.md) Smells §4) | P2 — the example and e2e modules are excluded from the root graph and have no lint step of their own | `BZL-CI` |
| M-F-10 | Is the registry's presubmit matrix reproduced in-repo, and at what real shard count? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §7: 4 platforms × 2 majors = 8, not 4) | P2 — matters for CI-minute estimates and for catching a break before the submission PR does | `BZL-CI` |
| M-F-11 | Is a deterministic text guard cheaper than exercising the real matrix? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) Patterns) | P1 — a `grep -c` count-match caught a whole class of missing-platform bug with no Bazel invocation and no flakiness | `BZL-CI` |
| M-F-12 | Does the release flow move every version that must move in lockstep? | A | partial ([cfg](bazel-audit/config-inventory.md) #14; [ci](bazel-audit/build-contracts-and-ci-posture.md) §7) | P1 — a `--check` mode that shares code with the refresh path cannot drift from it | `BZL-CI` |
| M-F-13 | Can an untrusted fork PR ever hold a cache write credential? | A, F | covered-in-practice ([ci](bazel-audit/build-contracts-and-ci-posture.md) §4) | P0 — the secret is gated on `github.event_name == 'push'`; every PR gets the empty string. Generalise it | `BZL-CI` |
| M-F-14 | Are lint and format runs Bazel-native aspects, or ad hoc per-language CLI invocations outside the graph? | F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §10; [arch](bazel-topic-map/architecture-and-monorepo-practice.md) §9) | P1 — an aspect needs no BUILD-file change, does not appear in `bazel query`, and gets remote caching for free | `BZL-CI` |

### G. `architecture.md` — layout, granularity, visibility, platforms, migration state · Family `BZL-ARCH`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-G-01 | Does every directory with buildable files own a BUILD file, or does a glob reach into a subdirectory? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §5) | P0 — a BUILD file referencing a subdirectory's files is the documented sign one is missing there. Check: `bazel query` for cross-directory `srcs` | `BZL-ARCH` |
| M-G-02 | Is target granularity closer to one-per-module or one-per-directory, and what does the choice cost? | F | uncovered, resolved-as-conditional ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §5-6) | P0 — fine-grained narrows the affected-test set and is only sustainable with a generator. Check: `bazel query 'kind(rule, //...)' \| wc -l` against source-file count | `BZL-ARCH` |
| M-G-03 | Is `default_visibility` ever `//visibility:public` at package level? | A, F | partial ([shape](bazel-audit/starlark-code-shape.md) §2 finds 2 real sites) | P1 — named anti-pattern with no mechanical check but a trivial grep | `BZL-ARCH` |
| M-G-04 | Are `package_group` allowlists used for cross-team boundaries instead of per-target lists? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §2) | P2 — the documented mechanism for enforcing boundaries at scale | `BZL-ARCH` |
| M-G-05 | Are BUILD files hand-written for a language a generator already covers? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §22; [prac](bazel-topic-map/practitioner-and-conferences.md) §17) | P0 — "70 percent have trouble writing BUILD files" at 4,000 engineers. Check: `gazelle -mode=diff` produces no diff | `BZL-ARCH` |
| M-G-06 | Which Gazelle plugin is first-party and which is third-party, per language? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §25) | P1 — Python's ships inside `rules_python`; Rust's is a separate third-party project. Decides whether generation is even available | `BZL-ARCH` |
| M-G-07 | Is multi-platform modelled with `platform`/`constraint_value`/`target_compatible_with`, or with `select()` on raw flags? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §3) | P1 — `select()`-on-flags is the legacy path, and migrating transitions is the hard half | `BZL-ARCH` |
| M-G-08 | When does `config_setting` sprawl signal a missing platform rather than a missing setting? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md); [shift](bazel-topic-map/recent-shifts-and-research.md)) | P1 — the mechanical smell is `config_setting` count per package and select nesting depth | `BZL-ARCH` |
| M-G-09 | Does a transition fail to reset configuration at a dependency boundary, multiplying the action count? | F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §4; [fail](bazel-topic-map/failure-corpus.md) §8) | P0 — the canonical docs show `2^n` growth and their own mitigation section is a literal TODO. A runnable repro exists | `BZL-ARCH` |
| M-G-10 | How do you measure a transition-induced action-count explosion, given `aquery` cannot answer it cheaply? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §8) | P0 — shared-`execPath` actions still render separately. Check: count distinct configuration hashes per target | `BZL-ARCH` |
| M-G-11 | Are execution groups used where a target's actions genuinely need different execution platforms? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §15) | P3 — mostly a mobile and cross-compile concern; no fleet consumer | `BZL-ARCH` |
| M-G-12 | Is protobuf modelled as one `proto_library` plus per-language wrappers, or duplicated per language? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §13) | P2 — zero `.proto` files in the fleet; forward-looking guidance only | `BZL-ARCH` |
| M-G-13 | Is a cross-cutting concern an aspect, or a BUILD-file macro that pollutes `bazel query`? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §9) | P1 — aspects leave BUILD files untouched and inherit remote caching. Check: does the concern appear in `bazel query` output | `BZL-ARCH` |
| M-G-14 | During a migration, which system is the declared source of truth for dependencies and for the IDE? | B, C, D, E, F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §21; [pain](bazel-topic-map/language-pain-points.md) §15-16) | P0 — two independent declarations is the failure; the named pattern keeps the language's own manifest authoritative | `BZL-ARCH` |
| M-G-15 | Is there a CI job proving both build systems stay green during a migration? | C, F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §21) | P1 — a distinct sub-topic from "which is authoritative"; without it one silently rots | `BZL-ARCH` |
| M-G-16 | Is the boundary between Bazel-visible and Bazel-invisible code documented and enforced? | A, F | partial ([cfg](bazel-audit/config-inventory.md), `hex.md`) | P1 — the incremental-adoption question nobody writes down. Check: `.bazelignore` contents against the intended boundary | `BZL-ARCH` |
| M-G-17 | Does `.bazelignore` carry entries Bazel will never infer from `.gitignore`? | A, F | partial ([cfg](bazel-audit/config-inventory.md), `hex.md:50-51`) | P1 — a live fleet bug: without `.agents/worktrees` listed, `bazel test //...` globs into a live worktree's `examples/` and fails | `BZL-ARCH` |
| M-G-18 | Does a shared top-level output directory survive Bazel's output-tree constraint? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §16 FAQ) | P1 — a shared `dist/` across `packages/*` forces either one large root BUILD file or a per-package restructure | `BZL-ARCH` |
| M-G-19 | Is checked-in generated code sitting beside its generator with no regeneration gate? | C, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) Layout signals) | P1 — one fleet instance, and the generator was not traceable from the tree. Check: a `diff_test` exists and the generator is named | `BZL-ARCH` |
| M-G-20 | Do git submodules have a Bzlmod equivalent, or must they become `bazel_dep`/`git_override`? | B, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) Patterns) | P1 — two fleet occurrences of fork-as-submodule; Bzlmod has no submodule analogue at all | `BZL-ARCH` |
| M-G-21 | Is a repo's real coupling visible in its module graph, or hidden behind a vendored tree? | B, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) Smells §2) | P2 — three fleet repos read as independent and are one dependency lineage two submodules deep | `BZL-ARCH` |
| M-G-22 | Should this repo adopt Bazel at all, measured against its size, language mix and dominant pain? | all | uncovered, contested ([prac](bazel-topic-map/practitioner-and-conferences.md) §18; [fail](bazel-topic-map/failure-corpus.md) §14; [arch](bazel-topic-map/architecture-and-monorepo-practice.md) §20) | P0 — gates the whole programme. Reading heuristic: language count, target count, and whether the pain is actually build time | `BZL-ARCH` |
| M-G-23 | If the pain is one slow step, is a narrower fix considered before a build-system swap? | all | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §20) | P1 — the honest alternative most comparison posts name and most adoption stories skip | `BZL-ARCH` |
| M-G-24 | Is `MODULE.bazel.lock` treated as a file an agent may read or edit? | A, F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md); [frame](bazel-frame.md)) | P0 — 166 KB of generated JSON, and hand-editing it discards every other module's pin. Direct agent-instruction risk | `BZL-ARCH` |

### H. `flags-and-versions.md` — Bazel majors, LTS policy, flag churn, rc files · Family `BZL-FLAG`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-H-01 | Where does the pinned Bazel version sit against the live LTS matrix, and when does the pin go stale? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §23; [shift](bazel-topic-map/recent-shifts-and-research.md) §8) | P0 — 9.2.0 Active, 8.8.0 Maintenance, pin at 8.7.0. Check: `bazel.build/release` re-read quarterly against `.bazelversion` | `BZL-FLAG` |
| M-H-02 | Which native rules disappear under `--incompatible_autoload_externally=""`, and what `load()` replaces each? | A, F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §3; [cod](bazel-topic-map/codified-and-lint-catalogue.md) §6; [lang](bazel-topic-map/language-rulesets-canonical.md) §26) | P0 — the biggest concrete 8→9 breakage; every `cc_*`/`java_*`/`py_*`/`sh_*`/`proto_library` needs an explicit load. Check: the `native-cc-*`/`native-java-*`/`native-py`/`native-sh-*` buildifier families | `BZL-FLAG` |
| M-H-03 | Is a `WORKSPACE`, `WORKSPACE.bazel` or `WORKSPACE.bzlmod` file still present? | A, F | covered-by-audit ([shape](bazel-audit/starlark-code-shape.md) Headline: 0 files), uncovered as a rule | P0 — the code is deleted in 9.0, and `--enable_workspace` is a no-op. Check: `find . -iname 'WORKSPACE*'` returns nothing | `BZL-FLAG` |
| M-H-04 | What is the authoritative current list of `--incompatible_*` flags, now that the policy page names none? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §6) | P0 — a rule pointing at `bazel.build/release/backward-compatibility` sends the reader to a page that defers elsewhere. The list lives in BCR's `incompatible_flags.yml` | `BZL-FLAG` |
| M-H-05 | Which flags flipped default in the last 18 months change sandbox or hermeticity behaviour? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) Recent shifts) | P1 — cgroups, native repo rules, strict action env, autoload. These break the 9.x and rolling legs first | `BZL-FLAG` |
| M-H-06 | Is a flag flip tested before the major that flips it lands? | A, F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §9) | P1 — `bazelisk --migrate` plus `BAZELISK_INCOMPATIBLE_FLAGS` is the documented mechanism and nothing in the fleet uses it | `BZL-FLAG` |
| M-H-07 | Is `rolling` or `last_green` ever a repo's default pin rather than a canary? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §2) | P1 — no patches are ever backported to a rolling release. Check: `.bazelversion` holds a semver | `BZL-FLAG` |
| M-H-08 | Does `.bazelrc` set any community-recommended always-on flag, and would any break the existing fetch pattern? | A, F | uncovered ([cod](bazel-topic-map/codified-and-lint-catalogue.md) §4) | P1 — none of the five are set today, and `--sandbox_default_allow_network=false` in particular could break an unsandboxed repository-rule fetch | `BZL-FLAG` |
| M-H-09 | Is a production build ever run with `--experimental_*` or `--incompatible_*`, against the stated "never"? | A, F | partial, contested ([canon](bazel-topic-map/canonical-bazel.md) §23 and Contested) | P1 — the rolling lane is a sanctioned exception; the rule must say which side of the line a job is on | `BZL-FLAG` |
| M-H-10 | Do personal `--config` names collide with shared CI configs? | A, F | uncovered ([canon](bazel-topic-map/canonical-bazel.md) §17) | P3 — the docs recommend a leading underscore for personal configs | `BZL-FLAG` |
| M-H-11 | Does a tuning value in an rc file carry its rationale? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §1: `--remote_timeout=60` has none) | P2 — every other uncommented flag in that file is self-explanatory; a timeout is not | `BZL-FLAG` |
| M-H-12 | Does `try-import`-ing a developer rc file let a machine silently diverge from CI? | A, F | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §1) | P1 — the fleet's developer file overrides `CC` and disables `layering_check`, and CI never sees it. Check: what CI would fail if it did read the file | `BZL-FLAG` |
| M-H-13 | Which ruleset major is current, and how far behind is the pin? | A, F | uncovered ([shift](bazel-topic-map/recent-shifts-and-research.md) §10-12; [lang](bazel-topic-map/language-rulesets-canonical.md)) | P0 — rules_js 3.4.1, rules_python 2.3.3, rules_rust 0.74.0; the frame's own guesses were one to two majors behind. Check: `gh api` the releases page per ruleset | `BZL-FLAG` |
| M-H-14 | Does a ruleset declare a `bazel_compatibility` floor, or only an undocumented CI matrix? | A, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md)) | P2 — rules_js/rules_ts/rules_lint declare one; rules_rust, rules_cc and rules_go do not | `BZL-FLAG` |
| M-H-15 | What is `PROJECT.scl`, and does it replace `.bazelrc`'s per-target flag conventions? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §15) | P2 — a Bazel-9-era file format for mapping targets to flags; emerging, not settled | `BZL-FLAG` |
| M-H-16 | Does a stardoc golden file drift across Bazel majors, and who owns freshness? | A | partial ([ci](bazel-audit/build-contracts-and-ci-posture.md) §7; [cod](bazel-topic-map/codified-and-lint-catalogue.md)) | P1 — a concrete, dated regression that any repo adopting stardoc will hit. Generalise to "a golden file names the Bazel major that owns it" | `BZL-FLAG` |

### I. `rust.md` — rules_rust and crate_universe · Family `BZL-RUST`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-I-01 | `crates_repository` or `crates_vendor` — which fits this repo's publication model? | B, C, F | uncovered, contested ([lang](bazel-topic-map/language-rulesets-canonical.md) §6, Contested) | P0 — fetch-time external repo versus checked-in BUILD files; picking wrong yields unreviewable generated files or an un-vendorable repo | `BZL-RUST` |
| M-I-02 | Why do `Cargo.lock` and `cargo-bazel-lock.json` drift, and how does CI force a repin failure? | B, C, F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §9; [pain](bazel-topic-map/language-pain-points.md) §132; [lang](bazel-topic-map/language-rulesets-canonical.md) §6) | P0 — two lockfiles for one dependency set, and the sibling `rust-cargo` set owns only the first. Check: repin in CI and fail on a non-empty diff | `BZL-RUST` |
| M-I-03 | What is the exact repin command, and is it idempotent if interrupted? | B, C, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §16; [arch](bazel-topic-map/architecture-and-monorepo-practice.md) §21) | P1 — `CARGO_BAZEL_REPIN=1` is the one command every source repeats, and `bazel sync` is removed in Bazel 9 | `BZL-RUST` |
| M-I-04 | Why does adding a platform triple slow splicing superlinearly? | B, C, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §6) | P1 — `O(N²)` per triple, stated in the ruleset's own source comment; the shipped supported list is a curated seven | `BZL-RUST` |
| M-I-05 | What non-hermetic behaviour does a `cargo_build_script` introduce, and what fixes it? | B, C, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §16) | P0 — network, `pkg-config` host lookups, `OUT_DIR` leakage, and a sandbox with no `.git`. The fleet has a real `vergen-gix` script that reads git provenance | `BZL-RUST` |
| M-I-06 | Does `crate_universe` ignore path dependencies, forcing hand-written internal BUILD deps? | B, C, F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §21; [pain](bazel-topic-map/language-pain-points.md) §16) | P1 — breaks the "Cargo is the source of truth" claim exactly at workspace boundaries | `BZL-RUST` |
| M-I-07 | Why must proc-macro crates build for the host during cross-compilation, and what is still broken? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §19) | P1 — a monolithic toolchain bundles rustc, cargo, clippy and stdlib, preventing independent host/target resolution. Zero proc-macro crates in the fleet | `BZL-RUST` |
| M-I-08 | What can `crate.annotation()` change about a third-party crate without forking it? | B, C, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §6) | P0 — `build_script_env`, `build_script_use_cc_toolchain`, `override_targets`, `additive_build_file_content`. The whole escape hatch for crate_universe pain | `BZL-RUST` |
| M-I-09 | Does rust-analyzer work under Bazel, and at what codebase size does it stop working? | B, C, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §2; [pain](bazel-topic-map/language-pain-points.md) §15) | P1 — a one-shot installer exists and is the most mature IDE story of the four languages, but one account reports it choking at real scale | `BZL-RUST` |
| M-I-10 | Which flags make clippy and rustfmt build-blocking versus CI-only, and is the clippy aspect sandbox-stable? | B, C, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §3; [pain](bazel-topic-map/language-pain-points.md) §20) | P1 — aspect plus output-group registration in `.bazelrc`, never a per-target attribute; a live intermittent failure is open | `BZL-RUST` |
| M-I-11 | Does `rust_test(crate=…)` instrument `#[cfg(test)]` code even without `--instrument_test_targets`? | B, C, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §4) | P2 — a documented break from the Bazel-wide coverage convention | `BZL-RUST` |
| M-I-12 | Does a `rust_test` target set reach parity with `cargo test`? | B, C, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §137) | P1 — Cargo auto-discovers doc tests and integration tests; Bazel requires explicit targets, so a silent gap is the default outcome | `BZL-RUST` |
| M-I-13 | Does a git submodule or a pinned-rev git dependency have a crate_universe path? | B, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) §Rust) | P1 — the fleet has two fork-submodules and four pinned-rev git crates, and neither has a clean registry-lookup analogue | `BZL-RUST` |
| M-I-14 | Does `rules_rust` require a C++ toolchain even for a pure-Rust build? | B, C, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §17) | P2 — a surprising hidden dependency that lands straight on the hermetic-toolchain question | `BZL-RUST` |
| M-I-15 | Is a Rust binary under test reachable from a Python test through runfiles rather than an env var and a fixed path? | B, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) Patterns) | P1 — two of two fleet harnesses use `<TOOL>_COMMAND` with a `test/bin/<name>` fallback a CI step must populate. `py_test(data=[…])` removes the seam | `BZL-RUST` |
| M-I-16 | Is keeping Cargo as the IDE and dependency source of truth a stable end state or a migration phase? | B, C, F | uncovered, contested ([pain](bazel-topic-map/language-pain-points.md) Contested) | P1 — two independent accounts land on it as stable; the ruleset's own discussion shows resolution mismatches that keep it "stable in practice, not airtight" | `BZL-RUST` |

### J. `python.md` — rules_python, toolchains, PyPI, packaging · Family `BZL-PY`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-J-01 | Is `python_register_toolchains()` actually called, or does `py_binary` silently use the host interpreter? | D, F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §12) | P0 — hermeticity is opt-in and available since 2022; omitting it is the default footgun. Check: grep the module file for the registration | `BZL-PY` |
| M-J-02 | Does `pip.parse()` thread the resolved hermetic interpreter through explicitly? | D, F | uncovered ([prac](bazel-topic-map/practitioner-and-conferences.md) §12; [pain](bazel-topic-map/language-pain-points.md) §9) | P1 — repository rules run before toolchain resolution, so the interpreter must be passed as a target, not inferred | `BZL-PY` |
| M-J-03 | What does rules_python's uv integration actually do, and does it consume `uv.lock`? | D, F | uncovered, contested and resolved ([fail](bazel-topic-map/failure-corpus.md) §11; [lang](bazel-topic-map/language-rulesets-canonical.md) §10; [pain](bazel-topic-map/language-pain-points.md) §8) | P0 — the fleet is uv-everywhere and the answer is "no path today". Every `uv.lock` is a migration cost, not an asset | `BZL-PY` |
| M-J-04 | Which PyPI lock format does rules_python support today, and what is tracked but unshipped? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §10) | P0 — `requirements.txt` only as of 2.3.3; `pylock.toml` is an open issue. Check: the version in `MODULE.bazel` against the docs for that version | `BZL-PY` |
| M-J-05 | Does the uv `lock()` rule's project-root auto-detection get a monorepo wrong? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §10) | P1 — a shortest-path heuristic the docs themselves warn about, with `project=` as the fix and no drift-check target generated | `BZL-PY` |
| M-J-06 | What changes between the `system_python` and `script` bootstraps, and which is the default now? | D, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §8) | P1 — `sys.path` ordering and `PYTHONSAFEPATH` inheritance, version-gated three times since 2024 and defaulted differently in 2.0.0 | `BZL-PY` |
| M-J-07 | Does the `imports` attribute add a `sys.path` entry that silently shadows a module? | D, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §125) | P1 — the classic Python-under-Bazel import trap; failure is a wrong module, not an error | `BZL-PY` |
| M-J-08 | Does precompiling silently drop `.pyc` files when two `PyInfo` implementations mix? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §11) | P1 — a silent interoperability trap between a custom rule and rules_python's own | `BZL-PY` |
| M-J-09 | Do a `py_binary` and `py_library` sharing sources with different exec properties collide? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §11) | P1 — an action conflict, visible as a build failure with a non-obvious cause | `BZL-PY` |
| M-J-10 | What causes a `pypi` hub-name collision across modules, and does the fix flag resolve it or only warn? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §12) | P1 — default is warn-only; the collision persists unless the environment variable is set | `BZL-PY` |
| M-J-11 | How many `config_setting` combinations does multi-platform PyPI selection need before naming breaks down? | D, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §13) | P1 — every one of the fleet's seven locks carries platform-tagged wheels, and the ruleset's own doc stops solving naming past a couple of axes | `BZL-PY` |
| M-J-12 | Which pytest wrapper is current, and what conftest or plugin-discovery gap does each close? | B, D, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §11) | P1 — Bazel requires explicit test targets where pytest expects discovery; both fleet harnesses are pytest roots with 156 and 67 test files | `BZL-PY` |
| M-J-13 | What happens when `gazelle_python.yaml` is missing or stale? | D, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §13) | P2 — generation silently fails to resolve third-party import names rather than erroring | `BZL-PY` |
| M-J-14 | Does `PYTHONHASHSEED` leak ordering into a Python action's output? | D, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §131) | P2 — the Python instance of the general determinism taxonomy; the sibling set owns the general topic, not this one | `BZL-PY` |
| M-J-15 | Is a zero-dependency zipapp CLI a `py_binary` with zip output, or does it need Bazel at all? | D | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) Patterns) | P2 — the fleet's "this needs nothing from Bazel" example, worth naming as such rather than converting | `BZL-PY` |
| M-J-16 | Does a `requires-python` floor spread across 3.10-3.13 force one toolchain per project? | D, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) §Python) | P1 — seven projects, no shared floor; toolchain registration must pick a version nothing in-repo states | `BZL-PY` |

### K. `javascript-typescript.md` — rules_js, rules_ts, pnpm · Family `BZL-JS`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-K-01 | Why does `bazel build` on a `ts_project` succeed with a type error, and which target gates it? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §18) | P0 — the sharpest agent failure mode in the whole corpus: only the generated `[name]_typecheck_test` gates, and only under `bazel test` | `BZL-JS` |
| M-K-02 | Which transpiler must a `ts_project` select since rules_ts 2.0, and what does SWC risk versus `tsc`? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §17) | P0 — there is no default; every 1.x-era snippet hard-errors, and SWC has documented output differences | `BZL-JS` |
| M-K-03 | What does the validation-action typecheck flag cost, and why is it discouraged? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §18) | P1 — it reintroduces exactly the cost a custom transpiler exists to avoid; a real per-team speed-versus-safety decision | `BZL-JS` |
| M-K-04 | What does "the working directory is `bazel-out`" cost every custom rule and genrule author? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §15) | P0 — the architecture-defining fact of the whole JS stack; every node action must carry `BAZEL_BINDIR` and re-path its inputs | `BZL-JS` |
| M-K-05 | Why does rules_js require pnpm specifically? | E, F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §10) | P0 — pnpm's virtual store is the only layout Bazel actions can reproduce. Six of eight fleet packages are npm and two are bun | `BZL-JS` |
| M-K-06 | Is there any rules_js ingestion path for a `bun.lock`? | E, F | uncovered ([fleet](bazel-audit/fleet-bazel-readiness.md) §TypeScript) | P1 — `npm_translate_lock` does not consume it; two fleet packages have no path at all today | `BZL-JS` |
| M-K-07 | What is the diagnosis path for a runtime `require` of an undeclared dependency? | E, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §1) | P0 — named the most common error rules_js users encounter, with a three-branch remedy: first-party fix, upstream `packageExtensions`, or plugin hoisting | `BZL-JS` |
| M-K-08 | What phantom dependencies does npm or yarn hoisting hide that rules_js turns into build failures? | E, F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §10) | P1 — the predictable migration-day surprise, findable before migrating with a phantom-dependency check | `BZL-JS` |
| M-K-09 | When does a plugin-pattern tool need `public_hoist_packages`? | E, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §1) | P2 — eslint and prettier discover plugins by walking `node_modules`, which the strict layout breaks | `BZL-JS` |
| M-K-10 | Do two `ts_project` targets share a `.ts` file in `srcs`? | E, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §2) | P1 — conflicting `.js` outputs when built together, build-order-dependent when built separately. Check: `bazel aquery` the project and read what tsc received | `BZL-JS` |
| M-K-11 | What does `isolatedDeclarations` plus `isolated_typecheck` change in the action graph? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §19) | P1 — collapses a sequential type-check chain into two parallel stages; measured at 73-81 percent fewer type-check actions per PR at 40,000 packages | `BZL-JS` |
| M-K-12 | Is caching npm-extract actions net-negative in a cache-only setup? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §16) | P1 — tree artifacts are fetched file by file, so re-extracting locally can beat the cache. Counter-intuitive and worth a named exception | `BZL-JS` |
| M-K-13 | Do ESM imports still escape the runfiles tree and the sandbox? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §15) | P1 — on the ruleset's own known-issues list, unresolved | `BZL-JS` |
| M-K-14 | Does a framework that owns its own output layout work under Bazel's sandbox? | E, F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §5, §7) | P1 — Next.js standalone, Astro and SvelteKit all assume a writable source tree and a real `node_modules` | `BZL-JS` |
| M-K-15 | Does partial Bazelification of a JS monorepo pay off, or is there a coverage cliff? | E, F | uncovered, contested ([pain](bazel-topic-map/language-pain-points.md) Contested) | P1 — vendor guides describe staged success; the sharpest independent account describes an all-or-nothing cliff | `BZL-JS` |
| M-K-16 | Does a JS test's coverage count against its own `size` and `timeout` budget? | E, F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §16) | P2 — V8-to-lcov conversion is proportional to instrumented-file count and runs inside the test's budget | `BZL-JS` |

### L. `cpp.md` — rules_cc, hermetic toolchains, strict deps · Family `BZL-CC`

| ID | Question | Shapes | Coverage | Priority | Family |
|---|---|---|---|---|---|
| M-L-01 | Does rules_cc ship a hermetic toolchain, and what turns host autodetection off? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §22) | P0 — the README says no outright, and `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` is the only way off autodetection rather than merely alongside it | `BZL-CC` |
| M-L-02 | Which hermetic C++ toolchain, and on what criterion? | F | uncovered, contested and resolved-as-decision-tree ([lang](bazel-topic-map/language-rulesets-canonical.md) Contested) | P0 — three incompatible maintained projects and no upstream endorsement; the criterion is the constraint, not the preference | `BZL-CC` |
| M-L-03 | Why does `zig cc` crash programs with `SIGILL` that build clean elsewhere? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §24) | P1 — UndefinedBehaviorSanitizer is on by default, unlike mainstream clang and gcc. Invisible until the crash | `BZL-CC` |
| M-L-04 | What are the four concrete symptoms of Bazel's autodetected default toolchain? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §22) | P0 — non-hermetic, gcc-preferred over clang, CI-versus-local divergence, and flags settable only through rc files. The root cause behind "start with a hermetic toolchain" | `BZL-CC` |
| M-L-05 | Should a C++ guide pre-empt the stated intent to remove the default-toolchain concept entirely? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §149) | P1 — a dated roadmap statement, so guidance should treat always-explicit registration as coming rather than hypothetical | `BZL-CC` |
| M-L-06 | How does `layering_check` work, and why does it stop enforcing anything outside a sandbox? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §6; [pain](bazel-topic-map/language-pain-points.md) §23) | P0 — an unsandboxed compile loads transitive module maps Bazel never declared, producing a silent false negative. The fleet disables it on one machine | `BZL-CC` |
| M-L-07 | What blocks `layering_check` adoption in practice? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §23) | P1 — most systems ship no Clang module maps for the standard library; Bazel supplies a generator script. Rollout is per-package, never a repo-wide flip | `BZL-CC` |
| M-L-08 | Does the newest C++ named-modules feature disable `layering_check`, and at what floor? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §23) | P2 — tested only at Bazel 9.2 plus LLVM 22; Bazel 7 and 8 do not expose the required API at all | `BZL-CC` |
| M-L-09 | What is the difference between `includes`, `strip_include_prefix` and `include_prefix`? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §143) | P1 — one of the three silently breaks cross-package include hygiene, and the three read as interchangeable | `BZL-CC` |
| M-L-10 | Does `cc_library` use `implementation_deps` to keep private compile deps off the public surface? | F | uncovered ([arch](bazel-topic-map/architecture-and-monorepo-practice.md) §12) | P2 — prevents accidental public re-export of an internal dependency | `BZL-CC` |
| M-L-11 | What is the standard sanitizer config set, and which flags must pair with it? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §29; [lang](bazel-topic-map/language-rulesets-canonical.md) §23) | P1 — `--config=asan` needs `-fno-omit-frame-pointer`, `-O1`, a matching `linkopt` and `--strip=never`; toolchains_llvm exposes them as features that reset in the exec configuration | `BZL-CC` |
| M-L-12 | Why does MemorySanitizer need a separately built instrumented libc++? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §23) | P2 — no official prebuilt exists, so MSan is materially harder than the other three | `BZL-CC` |
| M-L-13 | When does wrapping a CMake or Autotools dependency become the dominant cost? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §26) | P1 — every input a foreign build system auto-discovers must be hand-declared, and `layering_check` cannot be turned on for those targets at all | `BZL-CC` |
| M-L-14 | What is the current status of native C++20 modules under Bazel? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §27) | P2 — an open, unmerged PR as of the 2025 sources; interim rulesets fill the gap. Must be dated in the guide | `BZL-CC` |
| M-L-15 | How is `compile_commands.json` generated without a full build, and how is staleness detected? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §25) | P1 — the de facto generator asks Bazel through `aquery` rather than building; IDE support is the top-ranked C++ adoption blocker | `BZL-CC` |
| M-L-16 | What breaks in Linux-to-Windows C++ cross-compilation under `platforms`? | F | uncovered ([pain](bazel-topic-map/language-pain-points.md) §28) | P2 — MSVC path style, and a Starlark transition setting legacy flags is invisible to rules that read `--platforms` | `BZL-CC` |
| M-L-17 | Does moving the sandbox base to `/dev/shm` trade hermeticity for roughly 100 ms per action? | F | uncovered ([lang](bazel-topic-map/language-rulesets-canonical.md) §23) | P2 — a real speed-versus-correctness knob with a documented cost on both sides | `BZL-CC` |
| M-L-18 | Does symlinked-sandbox construction dominate cost for high-input-count actions? | F | uncovered ([fail](bazel-topic-map/failure-corpus.md) §6) | P2 — linear in input count, reported costly around 300K files, and up to 2.5× slower than the native toolchain on macOS | `BZL-CC` |

## Artifact set decision

Decisions, not options. Each names the assumption it rests on.

### The rule and its glob list

One glob-scoped rule, `bazel-quality.md`, plus a `bazel-quality/` support
directory. The glob list:

```yaml
paths:
  - "**/BUILD.bazel"
  - "**/BUILD"
  - "**/*.bzl"
  - "**/MODULE.bazel"
  - "**/MODULE.bazel.lock"
  - "**/.bazelrc"
  - "**/*.bazelrc"
  - "**/.bazelversion"
  - "**/.bazelignore"
  - "**/WORKSPACE"
  - "**/WORKSPACE.bazel"
  - "**/WORKSPACE.bzlmod"
  - "**/*.star"
  - "**/*.scl"
```

Every entry is a name the build system or its launcher requires, measured
against rule-distillation's bar ("narrow the glob only when it cannot miss"):

- `BUILD.bazel`, `BUILD`, `*.bzl`, `MODULE.bazel` — Bazel's own file-name
  contract. Cannot miss.
- `.bazelversion` — bazelisk's contract. `.bazelignore` — Bazel's; and the
  fleet has a live bug that only this file fixes (M-G-17).
- `.bazelrc` is Bazel's name; `*.bazelrc` covers the convention names
  (`ci.bazelrc`, `.bazelrc.user`, `user.bazelrc`) that `try-import` pulls in.
  Both are listed because a leading dot is not reliably matched by `*` across
  glob engines, and a missed rc file is exactly where the fleet's one
  non-hermetic override lives (M-H-12).
- **`MODULE.bazel.lock` is IN**, reversing the frame's guess. The frame's
  objection is real — it is 166 KB of generated JSON and loading a rule while
  editing it looks like noise. But the single highest-value moment in this
  entire rule set is the moment an agent opens that file to resolve a merge
  conflict, because the documented recovery is reset-and-regenerate and the
  intuitive action (hand-edit the conflicting hunk) silently discards every
  other module's pin ([canon §10](bazel-topic-map/canonical-bazel.md),
  [fail §2](bazel-topic-map/failure-corpus.md)). The rule that fires there is
  M-B-03 and M-G-24. The cost is one index load, under 200 lines; the file's
  own content is never read into context by the rule.
- **`WORKSPACE*` are IN**, even though Bazel 9 deleted the supporting code.
  Encountering one of these files *is* the finding (M-H-03): it means the repo
  is pre-9 legacy and the rule's first instruction is to delete it. A glob that
  never matches costs nothing; a glob that matches once catches a real
  migration blocker.
- **`*.star` and `*.scl` are IN.** `.star` is Bazel-dialect Starlark outside a
  Bazel build — the fleet has a measured instance (`ocx-contrib`'s package
  smoke tests) that shipped the top-level-statement parse bug twice
  ([cfg](bazel-audit/config-inventory.md) Patterns §1, Contradiction 1).
  `.scl` is the Bazel-9-era `PROJECT.scl` format (M-H-15). Both are extension
  globs, both cannot miss.

Deliberately **out**: `**/.bcr/*.yml`. It is a directory glob, and while
`publish-to-bcr` does require the directory name, exactly one repo in the world
this rule ships to has one. The BCR rows (M-B-13, M-B-14, M-B-15) load through
the index whenever `MODULE.bazel` is open, which is the file a BCR change
touches anyway.

**Per-language depth files do NOT get a `Cargo.toml`, `pyproject.toml` or
`package.json` glob.** Two reasons, both measured. First, the sibling sets
already own those names, and `rust-cargo`, `python-packaging` and
`typescript-packaging` say nothing about Bazel at all
([cfg §3](bazel-audit/config-inventory.md)) — so adding those globs here means
two rule sets loading on every manifest edit in sixteen repos that will never
build with Bazel. Second, the routing works without it: in a Bazel repo,
changing a Rust dependency means editing a `BUILD.bazel` or a `MODULE.bazel`,
which loads the index, whose routing table points at `rust.md` by task ("adding
or repinning a third-party crate → `bazel-quality/rust.md`"). The one genuine
miss is an agent that edits only `Cargo.toml` inside a Bazel repo and forgets
to repin (M-I-02). **Assumption named:** adopters install both `bazel-essentials`
and the matching language set, so the fix is a one-line cross-set pointer added
to `rust-cargo.md`, `python-packaging.md` and `typescript-packaging.md` — "if
this repo has a `MODULE.bazel`, the lockfile you just changed has a second half;
see `bazel-quality/<lang>.md`". If the owner declines that (Q4), the miss stands
and is recorded here rather than papered over.

### Depth files

Twelve, one per `BZL-` family, all under `bazel-quality/`. Route by task, never
by topic name.

| File | Family | One line |
|---|---|---|
| `starlark.md` | `BZL-LARK` | Writing or reviewing a `.bzl`, BUILD or `.star` file: macro-versus-rule choice, buildifier's warning taxonomy and which warnings are flag-backed, depset and ordering traps, the dialect and `analysistest` traps that ship broken silently |
| `bzlmod.md` | `BZL-MOD` | Touching `MODULE.bazel`, its lockfile, a module extension, a repository rule, or a registry submission: purity, `reproducible`, re-fetch triggers, canonical names, lockfile hygiene, BCR gates |
| `hermeticity.md` | `BZL-HERM` | Chasing a rebuild that should not have happened, or hardening an action: the non-determinism cause list, sandbox and environment control, host-toolchain leakage, glob boundaries, generated-file freshness |
| `caching-rbe.md` | `BZL-CACHE` | Configuring or debugging a remote cache, or deciding whether remote execution is even reachable: action keys, the six caches, BwoB and eviction, the trust boundary, credentials |
| `testing.md` | `BZL-TEST` | Writing or reviewing a test target: sizing, sharding, flakiness, the tag taxonomy, the hermetic-test contract, and unit-testing Starlark itself without the network |
| `ci.md` | `BZL-CI` | Standing up or reviewing a Bazel CI pipeline: target selection and its false negatives, matrix and gate design, cache-write scoping by trust, lint and docs gates, release and registry flow |
| `architecture.md` | `BZL-ARCH` | Deciding how a repository is laid out for Bazel, or running two build systems side by side: package and target granularity, visibility, platforms versus `select()`, generators, migration-state boundaries |
| `flags-and-versions.md` | `BZL-FLAG` | Choosing or moving a Bazel or ruleset version, or editing an rc file: LTS staging, the `--incompatible_*` surface and where its real list lives, rc-file hygiene, ruleset version floors |
| `rust.md` | `BZL-RUST` | Building Rust under Bazel: crate_universe's two lockfiles and repin, `cargo_build_script` hermeticity, proc-macro host/target, IDE and lint aspects |
| `python.md` | `BZL-PY` | Building Python under Bazel: toolchain registration, what the uv integration actually is, bootstrap and `sys.path`, PyPI platform selection, pytest and generation |
| `javascript-typescript.md` | `BZL-JS` | Building JS or TS under Bazel: the pnpm requirement, the `bazel-out`-as-cwd tax, why a type error still builds, dependency resolution failures, framework conflicts |
| `cpp.md` | `BZL-CC` | Building C or C++ under Bazel: getting off host autodetection, choosing among three hermetic toolchains, strict-deps enforcement, sanitizers, foreign builds, IDE support |

Three notes on what is *not* a depth file:

- **No `performance.md`.** Performance is a wave, not a topic. Its standards
  split to where their checks already live: depset flattening and macro
  expansion cost to `starlark.md` (buildifier already names them), transitions
  and `select()` explosion to `architecture.md`, cache-hit economics to
  `caching-rbe.md`. Its *procedures* — profiling, execution logs, `aquery`,
  JVM heap — go to `bazel-diagnose`, which is exactly the rules-carry-standards
  / skills-carry-procedures split.
- **No `adoption.md`.** The go/no-go decision is a procedure and belongs to
  `bazel-adopt`. The standards that outlive the decision — which build system
  is authoritative, how the Bazel-visible boundary is drawn, whether both stay
  green — are architecture, and live in `architecture.md`.
- **No `windows.md`.** Windows facts are real but thin and scattered across
  five families; they ship as marked rows inside the file that owns each check
  (runfiles in `testing.md`, junctions in `hermeticity.md`, path length in
  `cpp.md`).

### Skills

Both working names are confirmed.

**`bazel-adopt`** — take a repository into Bazel, or decide not to. Opens with
a go/no-go gate rather than a migration checklist, because the strongest
measured evidence in the corpus is that adoption which never reaches CI bought
nothing (31.23 percent of Bazel projects with CI configured never invoke
Bazel there). Then: measure the repo, pick wrap-or-split per language against
generator maturity, choose the source of truth, draw the `.bazelignore`
boundary, stand up the gate, and prove both systems stay green. It carries the
comparison set (Buck2, Pants, Nx/Turborepo) only as a "should you be here at
all" branch.

**`bazel-diagnose`** — find why a build is slow, non-hermetic, or missing the
cache. Three entry points because the symptoms are distinct: *slow* (profile,
analysis versus execution, depset flattening, transition explosion, JVM heap),
*non-hermetic* (execution-log diff, workspace-rules log, sandbox debug,
action-key comparison), *missing the cache* (which of the six caches, cache
request ordering, eviction and exit 39, action-key divergence between two runs).

No third skill. The Bazel 8→9 migration is real work but it is a checklist with
a verification (`bazelisk --migrate`, the `native-*` buildifier families), so it
ships as a section of `flags-and-versions.md` rather than as a procedure nobody
runs twice.

### Bundle

`bazel-essentials` — the rule, its support directory, and the two skills.
Members carry no tag at all, per the catalog's bundle convention.

### Rule ID families

`BZL-` is reserved for this set and is currently free
([cfg](bazel-audit/config-inventory.md) headline 4: the catalog uses only
`CI-`, `LINT-`, `REL-`, `TOOL-` today). One family per depth file, twelve
total: `BZL-LARK`, `BZL-MOD`, `BZL-HERM`, `BZL-CACHE`, `BZL-TEST`, `BZL-CI`,
`BZL-ARCH`, `BZL-FLAG`, `BZL-RUST`, `BZL-PY`, `BZL-JS`, `BZL-CC`.

### Explicitly out of scope

| Not covered | Why |
|---|---|
| `rules_java`, `rules_kotlin`, `rules_scala` | Zero fleet consumers, zero `rules_ocx` users named. Java's Starlarkification is referenced once in `flags-and-versions.md` because `--incompatible_autoload_externally` covers `java_*` too, and that is all |
| `rules_go` and `nogo` | Zero Go in the fleet. The *Gazelle mechanism* is in scope (`architecture.md`) because it is the load-bearing answer to fine-grained granularity in every language; `rules_go`'s own rules are not. `nogo` appears only as the comparison baseline for "no other language ships an always-on static-analysis gate" |
| `rules_android`, `rules_swift`, iOS and Android toolchains | No consumer, no fleet evidence, and the sources would be documentation with nothing to verify against. Writing them would violate the corpus's own bar |
| `proto_library` beyond one architecture row | Zero `.proto` files fleet-wide ([frame](bazel-frame.md), confirmed by [fleet](bazel-audit/fleet-bazel-readiness.md)). One row (M-G-12) states the language-neutral-plus-wrappers shape for the day a repo grows one |
| Buck2, Pants, Nx, Turborepo as build systems | In scope only as a "should you adopt Bazel" branch inside `bazel-adopt`. Not a rule surface: nothing about them changes a diff in a Bazel repo |
| REAPI *server* operation (Buildbarn, Buildfarm, NativeLink deployment) | The fleet runs a cache, not an executor, and structurally cannot run one for its ruleset (M-D-12). Server-side policy appears only where it changes client behaviour (M-D-19) |
| RBE cost economics | [shift](bazel-topic-map/recent-shifts-and-research.md) Contested found no numerically grounded, cited source. Writing it would be vibes with a citation shape |

## Selected for wave 2

Six groups, fifteen dives. Selection order was: uncovered first, then leverage
for the fleet, then "an area where agents demonstrably get it wrong", then "a
rule could actually check this". The requester asked for per-language guides,
RBE and caching, Bazel-friendly architecture, pain points, and recent talks;
wave 2 takes the highest-leverage of those and wave 3 completes the set. The
one per-language guide that starts now is TypeScript, because it carries the
single sharpest agent failure mode in the corpus (a `ts_project` builds green
with type errors) and its ruleset is two majors past what the frame assumed.

Every dive writes `.agents/research/<group>/<slug>.md` against the phase-4
output contract. Every brief below is handed to a sonnet worker verbatim.

### Group 1 — `bazel-starlark-and-build` · family `BZL-LARK`

**1.1 `buildifier-taxonomy-and-style`**
> Build the authoritative, current picture of what a linter and the two style
> guides already enforce for BUILD and `.bzl` files, and what they do not.
> Fetch `https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md`
> in full, plus `warn/warn.go`, `buildifier/buildifier.go` and
> `buildifier/config/config.go` from the same repo, and both style guides
> (`bazel.build/build/style-guide`, `bazel.build/rules/bzl-style`).
> Pin down, with names not paraphrase: which warnings are on by default (the
> wave-1 scout found exactly one is not — verify `unsorted-dict-items` is still
> the sole entry in `nonDefaultWarnings`); which warnings cross-reference an
> `--incompatible_*` flag and which are pure style with no flag and no future
> removal; which are marked obsolete or "not supported by the latest version"
> and must therefore never be cited in a rule (`load-on-top`,
> `out-of-order-load`, `same-origin-load`, `attr-package-metadata` are the
> known four — confirm and look for more).
> Then settle the gate question, which wave 1 raised twice and answered
> neither time: with `mode="diff"` and `lint_mode="warn"`, does a lint finding
> change the exit code? Determine this from the `buildifier_prebuilt` rule's
> own source and the CLI's exit-code behaviour, and state the exact
> configuration that makes a lint violation fail CI.
> Deliverable must DECIDE: the shipped warning set (default, `all`, or an
> explicit list) with a reason; the gate configuration; and a table of the ~15
> warnings worth promoting to `BZL-LARK` rules of their own versus the
> remainder that a rule should cover with one line naming the invocation.
> Also list every style-guide rule that has NO mechanical check — the wave-1
> estimate is roughly half of ~45 — because those become reading heuristics,
> not verifications. Test against `rules_ocx`'s two `buildifier()` targets in
> `BUILD.bazel:6-18` and its four `# buildifier: disable=` suppressions.

**1.2 `macros-rules-and-symbolic-macros`**
> Establish the decision procedure for symbolic macro versus legacy macro
> versus a real `rule()`, dated to Bazel 8 and 9, and catalogue the porting
> traps.
> Sources to fetch: `bazel.build/extending/macros`, `bazel.build/extending/rules`,
> `https://www.tweag.io/blog/2025-11-20-migrating-bazel-symbolic-macros/`, the
> Bazel 8.0.0 and 9.0.0 release notes on GitHub, and `bazel.build/rules/bzl-style`
> for the positional-args-blocks-migration claim.
> Name and verify: the target-naming schema a symbolic macro enforces (must
> equal `name` or start with it followed by `_`, `.` or `-`); the frozen-kwargs
> failure and its exact error string; the configurable-by-default behaviour
> that makes `.append()` on a `select()`-wrapped attribute fail, and the
> `alias`-with-non-configurable-`attr.label()` workaround; `inherit_attrs` and
> the `None`-default rule for inherited attributes; what a legacy macro can
> still do that a symbolic one cannot (`glob()`, untyped params, finalizers);
> and the Bazel 9 change that started enforcing Starlark computation-step
> limits inside symbolic macros.
> **Chase the surprise:** lazy evaluation — symbolic macros' headline
> performance promise — was still unshipped as of 2025-11-20 per Tweag, while
> the docs describe it as "being considered". Establish its status as of the
> research date from the macros page and the 9.x release notes, and state it
> flatly, because a rule that promises a performance win here would be wrong.
> Deliverable must DECIDE: the trigger conditions for converting a legacy
> macro (a visibility leak? a need for typed attrs? a `select()`-carrying
> caller?), and whether the shipped rule recommends symbolic macros for
> performance at all. Note that `rules_ocx` has zero symbolic macros and zero
> `rule()` declarations (`shape` §2), so this dive is grounded entirely
> upstream — say so in the artifact.

**1.3 `starlark-dialect-and-determinism-traps`**
> Catalogue the Starlark-level traps that produce a silent wrong answer rather
> than an error, and the check for each.
> Fetch the Starlark spec (`github.com/bazelbuild/starlark/blob/master/spec.md`),
> `bazel.build/rules/performance`, `bazel.build/extending/rules` (the action
> purity contract and the deprecated-API list), and
> `ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md:13-58`
> from the local fleet for the dialect trap.
> Pin down: the statement-position rule (no top-level `if`/`for`/`while`
> statements at module scope — a parse-time failure that reds every target at
> once) and both legal workarounds; whether dict and set iteration order is
> specified, and how insertion order leaks into an action command line or a
> generated file; depset ordering guarantees and what `.to_list()` costs; the
> `overly-nested-depset` shape; which runfiles APIs are on the deprecated list
> (`collect_data`, `collect_default`, `DefaultInfo.data_runfiles`) and what
> replaces them; and legacy struct-based providers versus `provider()`.
> Also cover the two portable testing traps the fleet already documented and
> nobody outside it has: the `analysistest`/`expect_failure` vacuous pass
> (`rules_ocx/.claude/rules/starlark.md:34-39`), where the expected fragment
> matches the traceback's echo of the test's own call site; and generated BUILD
> content authored as a Starlark string, which is invisible to buildifier,
> stardoc and every grep-based audit (`shape` Smells §3 names four sites:
> `download.bzl:17-26`, `project.bzl:124-127,228-230`, `package.bzl:284-295,367-406`).
> Deliverable must DECIDE: for each trap, the verification and which way empty
> output reads. These two fleet-discovered traps are the strongest verbatim
> reuse candidates in the whole corpus — write them so they can be lifted into
> the rule with the ocx names parameterised out.

### Group 2 — `bazel-bzlmod-and-repo-rules` · family `BZL-MOD`

**2.1 `module-file-and-lockfile-hygiene`**
> Settle how `MODULE.bazel` and `MODULE.bazel.lock` are kept honest, and what
> an agent must never do to either.
> Fetch `bazel.build/external/lockfile`, `bazel.build/external/module`,
> `bazel.build/external/mod-command` (and cross-check against the raw source at
> `site/en/external/mod-command.md`, because two live subcommands are missing
> from the rendered page), `bazel.build/external/registry`, and the 8.0.0 and
> 9.0.0 release notes.
> Pin down: the four `--lockfile_mode` values and which belongs on a developer
> machine versus CI versus a determinism canary; the exact merge policy (only
> `registryFileHashes` and `selectedYankedVersions` are safe to resolve by
> hand, everything else is reset-and-regenerate, and a `jq` merge driver is the
> automatic path); what `bazel mod tidy` rewrites and whether it is safe
> unattended; `bazel mod graph`/`explain`/`show_repo` as the "why was this
> version selected" tools; and `single_version_override` below a `bazel_dep`
> requirement becoming a hard error in 9.0.
> **Chase the surprise:** the lockfile carries its own format version,
> independent of Bazel's, and wave 1 found the docs and the fleet's actual file
> disagreeing by fourteen revisions — the docs say 10, `rules_ocx`'s committed
> lock reads `lockFileVersion: 24`. Establish what the version number governs,
> what a mismatch does, and state as a rule that no guidance may cite a
> lockfile version from documentation.
> Deliverable must DECIDE: the freshness verification for CI (there is none in
> the fleet today — `ci` §3 confirms `grep -rn "bazel mod"` over the taskfile
> and every workflow returns nothing); whether the lockfile is committed; and
> the exact instruction an agent gets when it opens a conflicted lockfile.
> Test against `rules_ocx/MODULE.bazel` (32 lines, 5 `bazel_dep`, 3 of them
> dev) and its 166,136-byte lock with 141 `registryFileHashes` entries from one
> registry.

**2.2 `module-extension-purity-and-repo-contents-cache`**
> Establish what makes a module extension reproducible, how that is verified
> rather than asserted, and what the Bazel 9 caches now give in return.
> Fetch `bazel.build/external/extension`, `bazel.build/external/repo`,
> `https://github.com/bazelbuild/bazel/discussions/27509` (the remote
> repo-contents cache), the 9.0.0 release notes for `--repo_contents_cache` and
> `--experimental_remote_repo_contents_cache`, and EngFlow's module-extension
> and toolchainization posts
> (`blog.engflow.com/2025/01/16/...module-extensions/`,
> `blog.engflow.com/2025/05/14/...toolchainization/`).
> Pin down: what `reproducible = True` (via `extension_metadata`, and
> `repository_ctx.repo_metadata` on the repo-rule side) actually promises and
> what Bazel does with it — lockfile exclusion, skipped re-evaluation, and
> eligibility for both new caches; the exact exclusion for the remote cache
> ("only repo rules without dependencies added at runtime, e.g. via
> `repository_ctx.watch` or `.getenv`") and whether that rules out the fleet's
> own rules; the `bzlTransitiveDigest`/`usagesDigest` keying that decides
> re-evaluation; the `Circular definition of repositories` error from
> instantiating a repo and loading from it in one extension; and why
> `native.register_toolchains()`/`native.bind()` are unavailable inside an
> extension, with the toolchainization pattern as the fix.
> Deliverable must DECIDE: the verification that an extension's impl is
> actually pure — wave 1's best candidate is `grep -n 'ctx\.os\.\|ctx\.getenv('`
> over the extension file returning empty while the repository rules it
> dispatches to use both freely — and whether that is sufficient or needs a
> two-run lockfile diff behind it.
> Test against `rules_ocx/ocx/extensions.bzl`: one `module_extension()` at
> :333, four `tag_class()` at :19,38,112,122, `reproducible = True` at :331,
> and a purity boundary documented in a source comment at :6-10.

**2.3 `repository-rule-hermeticity-and-bcr`**
> Two halves of the same surface: what a repository rule may read without
> lying to Bazel, and what a registry demands of a published module.
> Fetch `bazel.build/external/repo` (the precise re-fetch trigger list),
> `bazel.build/remote/workspace` (the runnable non-hermetic-behaviour detection
> method), `bazel.build/external/faq`, and from the BCR repo:
> `docs/bcr-policies.md`, `docs/contributing.md`, `docs/README.md`,
> `docs/attestations.md`, and `incompatible_flags.yml`.
> Pin down: exactly what triggers a re-fetch (attribute change, implementation
> change, a `getenv`-declared env var, a `watch`ed path — including paths
> implicitly watched by `read()`, `execute()`, `extract()`, `watch_tree()`,
> `path.readdir()`) and what therefore escapes it; what `configure` and `local`
> change; the `--incompatible_no_implicit_watch_label` flip in 8.0 (an
> attribute alone no longer implicitly watches a label); the six non-hermetic
> operations `remote/workspace` names and the
> `--experimental_workspace_rules_log_file` method for finding them; the
> add-only guarantee and the anonymous-module test on the registry side; and
> the `compatibility_level` split established in this map's conflict 15 — a
> resolver no-op on 8.6+/9.1+ but still presubmit-gated.
> Deliverable must DECIDE: the greppable inventory rule for "every env var
> consulted has a matching `getenv`, every label read has a matching `watch`"
> (the fleet documents this convention in prose and has no check for it), and
> whether a published module needs a test module beyond a build-only e2e.
> Test against `rules_ocx`: 9 `getenv` sites (`download.bzl:36,44`,
> `repo_utils.bzl:630,632,659,724,728`), 4 `watch`/`watch_tree` sites
> (`package.bzl:168`, `repo_utils.bzl:708,722,735`), both `ctx.download` sites
> carrying `sha256` (`download.bzl:38,45`), three hand-built paths that fail
> open (`ambient_config_paths`, `sigstore_trust_root_path`, `manifest_sha256`),
> and `.bcr/presubmit.yml` running a build-only module across 4 platforms × 2
> Bazel versions.

### Group 3 — `bazel-caching-rbe` · family `BZL-CACHE`

**3.1 `action-keys-and-cache-hygiene`**
> Establish exactly what a cache key is made of, what it silently omits, and
> how to prove a specific action's key is unstable.
> Fetch the REAPI v2 spec
> (`github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto`)
> and read the `Action`, `Command`, `Platform`, `Directory`, `SymlinkNode`,
> `Digest`, `DigestFunction` and `SymlinkAbsolutePathStrategy` messages
> directly; then `bazel.build/remote/caching`,
> `bazel.build/remote/cache-remote`, and
> `github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md`.
> Pin down: the exact contents of an action digest (command digest, sorted
> environment, input-root Merkle digest, platform, timeout, `do_not_cache`,
> operator `salt`); the two spec-mandated sort orders (`Command`'s environment
> variables lexicographically by name; a `Directory`'s children by path) and
> what an unsorted list costs; the stated omissions ("Bazel currently does not
> track tools outside a workspace"); the stamping split, where the volatile
> status file is deliberately exempt from invalidation but the stable one is
> not; and the `SymlinkAbsolutePathStrategy` server-policy choice that permits
> non-hermetic builds without any client-side signal.
> Deliverable must DECIDE: the standard diagnostic loop, written as a runnable
> sequence — build twice with `--execution_log_compact_file`, diff with
> `//src/tools/execlog:parser`, use `--noremote_accept_cached` to isolate, and
> read the earliest divergent action first — and a decision on whether the
> shipped rule ever recommends `salt`.
> **Chase the surprise:** wave 1 established that
> `--experimental_remote_merkle_tree_cache`, named in the frame and repeated by
> a second scout, does not exist in the current CLI reference; the live flag is
> `--experimental_remote_discard_merkle_trees`, default true, with inverted
> intent. Re-verify against `bazel.build/reference/command-line-reference` and
> make the general point in the artifact: flag guidance must be re-derived from
> the reference, never from memory or a blog.

**3.2 `bwob-eviction-and-cache-flags`**
> Get the current, dated defaults for every remote-cache flag that matters, and
> the failure modes each one causes or prevents.
> Fetch and parse `bazel.build/reference/command-line-reference` for the exact
> current defaults; then `blog.bazel.build/2023/10/06/bwob-in-bazel-7.html`,
> `https://www.buildbuddy.io/blog/unusual-builds-w-bytes/`, and
> `blog.engflow.com/2024/05/13/the-many-caches-of-bazel/`.
> Pin down, each with its default and the Bazel version it changed in:
> `--remote_download_outputs` (and the three aliases), `--remote_download_regex`,
> `--remote_upload_local_results`, `--remote_accept_cached`, `--remote_timeout`,
> `--remote_retries`, `--remote_cache_compression` and its byte threshold,
> `--remote_verify_downloads`, `--incompatible_remote_local_fallback_for_remote_cache`,
> `--experimental_remote_cache_ttl`, `--experimental_remote_cache_lease_extension`,
> `--experimental_remote_cache_eviction_retries`,
> `--experimental_remote_cache_chunking` and its 8.7/9.1 version floor,
> `--disk_cache` with its 7.4-era GC flags, and exit code 39.
> Then the six-cache taxonomy: in-memory Skyframe, repository cache, output-tree
> and local action cache, remote action cache plus CAS, disk cache, remote
> execution. State which of the six a given symptom implicates, because wave 1
> found conflating two of them is the most common source of "why is this still
> slow" confusion.
> **Chase the surprise:** BwoB made the remote cache load-bearing rather than
> optional, and the documented consequence is a long-lived server outliving the
> cache TTL and silently re-downloading whole artifacts — one measured build
> went from 1.8 MB to 640 MB of downloads. Establish whether the mitigation
> flags are still experimental and whether the retry flag's own documented gap
> is closed.
> Deliverable must DECIDE: the per-role BwoB default (CI runner, developer
> machine, IDE-feeding build), and whether the shipped rule recommends TTL
> tuning proactively or only after an exit-39 sighting.

**3.3 `rbe-readiness-and-cache-trust-boundary`**
> Two decisions a team makes once: is remote execution reachable at all, and
> who may write to the cache.
> Fetch `bazel.build/remote/rbe`, `bazel.build/remote/rules`,
> `bazel.build/remote/dynamic`, `bazel.build/docs/sandboxing`,
> `bazel.build/remote/bep`, the credential-helper design proposal
> (`github.com/bazelbuild/proposals/blob/main/designs/2022-06-07-bazel-credential-helpers.md`),
> `github.com/bazelbuild/bazel/issues/4276`, and the bazel-discuss thread on
> public HTTP cache security.
> Pin down: the mandatory constraints `remote/rules` places on an RE-compatible
> rule (no host `PATH`/`JAVA_HOME` lookups, every tool dependency declared, no
> host-mutating repository rules, platform-appropriate tool binaries); the
> stated impossibility of dynamic execution against a cache-only backend and
> why; the cache-poisoning threat model and the two-tier token mitigation; and
> `--credential_helper`'s graduation from experimental in Bazel 7.0.
> **Chase the surprise the audits found, and treat it as the centrepiece:**
> `rules_ocx` cannot use RBE at all, and not for a configuration reason. Its
> launchers resolve absolute `OCX_HOME` store paths — the nixpkgs model,
> stated at `README.md:246-249` — which an RBE worker cannot reproduce. Write
> this up as the portable lesson that some designs must change shape before
> `--remote_executor` is even a question, and derive the general readiness
> check from it.
> Deliverable must DECIDE: the RE-readiness checklist (a short ordered gate,
> not prose); the portable form of the trust-boundary pattern the fleet already
> implements correctly (`.github/actions/remote-cache/action.yml:27-34` plus
> `ci.yml:30,56` — write credential supplied only on `push`, PRs and forks get
> `--remote_upload_local_results=false` and anonymous read); and whether the
> shipped rule states `--credential_helper` as MUST or SHOULD for a new setup,
> given a plaintext write credential in a gitignored rc file is the fleet's
> current state.

### Group 4 — `bazel-hermeticity-determinism` · family `BZL-HERM`

**4.1 `action-nondeterminism-taxonomy`**
> Produce the short, complete cause list for a Bazel action that is not a pure
> function of its declared inputs, and the check for each cause.
> Fetch `https://jmmv.dev/2025/07/bazel-action-determinism.html` (the clearest
> taxonomy found in wave 1), `bazel.build/basics/hermeticity`,
> `bazel.build/reference/skyframe`, `bazel.build/reference/be/general` (the
> genrule "General Advice" determinism checklist, verbatim),
> `bazel.build/extending/rules` (the action purity contract), and
> `github.com/bazelbuild/bazel/issues/14341` and `/6786` for the stamping
> semantics.
> Pin down each cause with its symptom and its check: embedded timestamps;
> PIDs, UIDs and GIDs; hash-table or set iteration order leaking into an
> emitted list; network access during a build; hidden system-toolchain files
> outside the declared inputs; local-versus-remote execution divergence; nested
> foreign build systems; and reads from `/dev/random`. Then the mitigations,
> named as flags rather than principles: `--action_env`, `--host_action_env`,
> `--incompatible_strict_action_env` (now default true — say what that changed),
> `--nosandbox_default_allow_network`, and `--execution_log_json_file` for
> CI-versus-local diffing.
> Ground the whole thing in Skyframe's own stated invariant — "if all input
> data of all functions is recorded, Bazel can invalidate only the exact set of
> nodes that need to be invalidated" — because every rule in this family
> reduces to "did you read something without declaring it".
> Deliverable must DECIDE: the ordered triage a reviewer runs when an action
> rebuilds unexpectedly, and which causes are worth a MUST rule versus a
> reading heuristic. Note explicitly that this taxonomy is language-independent
> — the per-language files should cite it, not restate it.

**4.2 `sandbox-environment-and-toolchain-leakage`**
> Establish how a build reaches the host despite the sandbox, and what closes
> each path.
> Fetch `bazel.build/docs/sandboxing`, `bazel.build/remote/workspace`,
> `https://fzakaria.com/2025/06/22/bazel-s-original-sins`,
> `raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md` (for the
> autodetection escape hatch), `github.com/bazelbuild/bazel/issues/16711`
> (symlinked-sandbox cost) and `/11482` (Windows path length), and
> `bazel.build/reference/be/functions` plus
> `github.com/bazelbuild/bazel/issues/4194` for the glob package-boundary trap.
> Pin down: the three sandbox strategies and what each does and does not
> isolate, with `processwrapper-sandbox` named as the only cross-platform one
> and therefore the weakest; the read-only mount of host paths that lets a
> build silently depend on host system libraries, with the GNU-versus-BSD tool
> mismatch as the worked example; `--sandbox_debug` as the inspection tool and
> why it must not stay on; `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` as the only
> way off C++ autodetection (which probes for a host compiler whether or not
> any `cc_*` target exists); the `--repo_env` versus `--action_env` split; and
> the recursive-glob package-boundary trap, where adding a BUILD file in a
> subdirectory silently shrinks an existing glob's matches elsewhere.
> **Chase the surprise:** the fleet's own non-hermetic override is *inert*, not
> live — `rules_ocx`'s developer rc file points `CC` at a zig wrapper and
> disables `layering_check`, and the repo compiles zero `cc_*` targets
> (`ci` Headline). The portable finding is the distinction itself: a
> non-hermetic override that nothing currently exercises is a latent trap, not
> an active bug, and it becomes live the moment any dependency pulls in a
> `cc_library`. Do not flatten this.
> Deliverable must DECIDE: the checked-in-generated-file pattern (a `diff_test`
> or `write_source_files` pair, with `bazel run`'s `BUILD_WORKSPACE_DIRECTORY`
> as the mechanism that makes it possible and `bazel build`/`test`'s refusal as
> the reason it is safe), and whether a golden-diff test must name the Bazel
> major that owns it — the fleet has a live instance where stardoc output gained
> a `repo_mapping` row on Bazel 9+ and docs freshness now runs on one CI leg of
> three (`ci.yml:57-62`).

### Group 5 — `bazel-architecture-monorepo` · family `BZL-ARCH`

**5.1 `package-granularity-visibility-and-generation`**
> Settle how a repository is laid out so Bazel is cheap, and what makes that
> layout maintainable.
> Fetch `bazel.build/configure/best-practices`, `bazel.build/concepts/build-files`,
> `bazel.build/concepts/visibility`, `abseil.io/resources/swe-book/html/ch18.html`,
> `github.com/bazel-contrib/bazel-gazelle` (the README's per-language plugin
> ownership list), and the Uber Go-monorepo case study
> (`uber.com/us/en/blog/go-monorepo-bazel/`) for what generation actually buys.
> Pin down: the package-per-directory rule and its stated signal (a BUILD file
> referencing a subdirectory's files means a BUILD file is missing there); the
> fine-grained-targets argument and its cost; the three visibility mechanisms
> (target, load, transitive) and the explicit warning against package-level
> `//visibility:public`; `package_group` as the reusable allowlist; and the
> per-language generator maturity split — Python's plugin lives inside
> `rules_python`, JS/TS is Aspect's, Rust's is the third-party `gazelle_rust`,
> C/C++ is `EngFlow/gazelle_cc`.
> **Resolve, do not restate, the granularity question.** Wave 1 established
> that fine-grained targets are only sustainable with a generator, and that
> generator maturity is uneven by language. The deliverable must DECIDE a
> conditional rule — go fine-grained where a maintained generator exists for
> that language, stay coarse where BUILD files would be hand-maintained — and
> give the verification for each side (`gazelle -mode=diff` producing no diff;
> a rule-count-to-source-file ratio as the coarse-side proxy).
> Also flag that "1:1:1" is Pants vocabulary that Bazel's own docs never use,
> so the shipped rule must not cite it as Bazel's.
> Test against the fleet's real shapes: `rules_ocx` has 2 real
> `package(default_visibility = public)` sites and a `visibility()` load-gate on
> all 7 private `.bzl` modules; `creeptd-ng` has 13 crates, 3 `package.json`
> across three package managers, and one declared pnpm workspace member that is
> actually npm-managed.

**5.2 `platforms-selects-transitions-and-migration-state`**
> Two coupled questions: how configuration is modelled, and what a
> half-migrated repository looks like.
> Fetch `bazel.build/extending/platforms`, `bazel.build/configure/attributes`,
> `bazel.build/extending/config` (read the transitions "badly-behaved builds"
> case study in full), `github.com/lucidsoftware/bazel-build-graph-explosion`,
> `github.com/bazelbuild/bazel/issues/14236`, `bazel.build/query/aquery`, and
> `https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/`
> for the dual-build-system pattern.
> Pin down: the platform/constraint model and `target_compatible_with` as the
> alternative to broad `select()`; why `select()`-on-raw-flags is the legacy
> path and why migrating the transitions is the hard half; the exponential
> configured-target growth from a per-edge transition down a binary dependency
> tree; and the `aquery` limitation that makes the resulting explosion hard to
> see (two shared actions with the same `execPath` still render separately).
> **Chase the surprise, because the canonical docs admit it:** the transitions
> page ends its own failure-mode section with "TODO: Add strategies for
> measurement and mitigation of these issues". This dive fills a documented
> hole. The deliverable must DECIDE the measurement — the wave-1 candidate is
> counting distinct configuration hashes per target via `cquery`, and the dive
> must confirm the exact invocation or replace it with one that works.
> Second half: the migration-state standards. Which build system is the
> declared source of truth for dependencies and for the IDE; how the
> Bazel-visible boundary is drawn and enforced (`.bazelignore`, and note that
> Bazel does not read `.gitignore` — the fleet has a live bug where a missing
> `.agents/worktrees` entry made `bazel test //...` glob into a live worktree);
> and whether a CI job proves both systems stay green.
> Deliverable must DECIDE all three, plus the shared-output-directory
> constraint (a top-level `dist/` shared across `packages/*` forces either one
> large root BUILD file or a per-package restructure).

### Group 6 — `bazel-typescript` · family `BZL-JS`

**6.1 `rules-js-architecture-and-dependency-resolution`**
> Establish what adopting `rules_js` actually costs and why, at the current
> major.
> Fetch, from `aspect-build/rules_js` at `main`: `README.md`,
> `docs/pnpm.md`, `docs/troubleshooting.md`, `docs/faq.md`; then the v2.0.0 and
> v3.0.0 release pages on GitHub, and
> `https://pow.rs/blog/bazel-is-incompatible-with-javascript/` as the sharpest
> dissent.
> **Version first:** the frame assumed rules_js 2.x; wave 1 measured 3.4.1,
> with 3.0 dropping Bazel 6, WORKSPACE and pnpm <9 outright. Confirm the
> current version and state the floor every claim applies to.
> Pin down: why pnpm specifically is required (the virtual store is the only
> `node_modules` layout Bazel actions can reproduce, and pnpm's linker has
> semantics expressible as discrete actions); the "working directory is inside
> `bazel-out`" decision, what it fixes (TypeScript `rootDirs` resolution) and
> what it costs (every custom rule and genrule author re-paths inputs and
> outputs and carries `BAZEL_BINDIR`, with the upstream issue that would
> relieve it still open); npm lifecycle hooks executed as cacheable actions;
> the three-branch diagnosis for "module not found" (first-party missing `data`
> dependency, genuine upstream under-declaration fixed with pnpm
> `packageExtensions`, or a plugin-pattern tool needing `public_hoist_packages`);
> phantom dependencies that hoisting hid and this model surfaces; the
> still-open ESM sandbox escape; and the coverage caveats.
> **Chase the surprise:** caching npm-extract actions can be net-*negative* in
> a cache-only setup, because tree artifacts are fetched file by file — the
> ruleset's own troubleshooting doc offers a `--modify_execution_info` opt-out
> as an experiment and explicitly declines to prescribe it. Establish when the
> opt-out wins.
> Deliverable must DECIDE: whether the shipped guidance recommends adopting
> `rules_js` for a repo that is not already on pnpm, and the pre-migration
> checklist that finds phantom dependencies before migration day. Test against
> the fleet: 6 of 8 TypeScript packages use npm, 2 use bun, and `bun.lock` has
> no `npm_translate_lock` ingestion path at all (`fleet` §TypeScript).

**6.2 `rules-ts-typecheck-and-transpiler`**
> Establish the single most consequential fact about TypeScript under Bazel and
> everything that follows from it.
> Fetch, from `aspect-build/rules_ts` at `main`: `README.md`,
> `docs/transpiler.md`, `docs/troubleshooting.md`; then
> `https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md`
> and the Canva BazelCon 2025 talk page for the measured numbers.
> **The headline finding to nail down and write first:** with a `transpiler`,
> `declaration_transpiler`, `no_emit` or `isolated_typecheck` set,
> `bazel build //path:my_ts_project` succeeds *without ever type-checking*,
> because only JavaScript is in the default output group. The gate is the
> auto-generated `[name]_typecheck_test` under `bazel test`. Establish this
> precisely, name the forcing flag
> (`--@aspect_rules_ts//ts:validation_typecheck`), and state why the ruleset
> itself calls that flag discouraged and off by default. This is the corpus's
> clearest case of an agent shipping a type error while seeing green.
> Then: the mandatory transpiler choice since rules_ts 2.0 (no default at all —
> SWC recommended for speed with documented output differences, `tsc` simplest
> and slowest, and a flag that restores 1.x behaviour for teams not ready to
> choose); the concrete failure signatures `TS6059`, `TS5033: EPERM` and
> `TS2786`/`TS7016`, each with its cause and its `--explainFiles` or `aquery`
> diagnosis; and the overlapping-`srcs` trap where two `ts_project` targets
> sharing a `.ts` file produce conflicting outputs when built together and
> build-order-dependent results when built separately.
> Finally `isolatedDeclarations` (TypeScript 5.5) plus `isolated_typecheck`:
> what it changes in the action graph, and the measured result at 40,000
> packages (73-81 percent fewer type-check actions per PR, P95 wall time down
> 53-60 percent).
> Deliverable must DECIDE: whether `bazel build` alone is ever an acceptable
> gate for a `ts_project` (the answer is no — write the rule that says so and
> the verification that catches it), and the transpiler recommendation with its
> risk stated.

## Staged for wave 3

Six groups, fifteen dives, written to the same brief quality so wave 3 launches
mechanically once wave 2 lands. Three groups must be revised first; the
revision trigger is named on each.

### Group 7 — `bazel-rust` · family `BZL-RUST` · *minor revision after wave 2*

Revision trigger: dive 2.1 settles the lockfile-freshness verification for
`MODULE.bazel.lock`; reuse its shape for the crate_universe lockfile rather
than inventing a second one.

**7.1 `crate-universe-lockfiles-and-repin`**
> Establish how `rules_rust` resolves third-party crates, why it keeps two
> lockfiles, and how CI catches drift.
> Fetch, from `bazelbuild/rules_rust` at `main`:
> `crate_universe/private/crates_repository.bzl`,
> `crate_universe/private/crates_vendor.bzl`, `crate_universe/private/crate.bzl`
> (read the `crate.annotation()` docstring in full), and the rendered
> `bazelbuild.github.io/rules_rust/crate_universe_bzlmod.html`; then the 0.74.0
> release notes, `github.com/bazelbuild/rules_rust/issues/1522`, and
> `discussions/2879`.
> Pin down: the concrete difference between `crates_repository` (BUILD files
> generated into an external repo at fetch time) and `crates_vendor` (real,
> checked-in BUILD files, `mode = "remote"` or `"local"`, for workspaces
> consumed by other workspaces) and which publication model each serves;
> `determine_repin()` and the `repository_ctx.watch()` calls over both
> lockfiles and every manifest; the `O(N²)`-per-platform-triple splicing cost
> stated in the ruleset's own source comment and why `SUPPORTED_PLATFORM_TRIPLES`
> ships as a curated seven; the exact repin invocation as of 0.74.0, noting
> that `bazel sync` was removed in Bazel 9 so any `CARGO_BAZEL_REPIN=1 bazel
> sync --only=crate_index` recipe needs a replacement; and whether an
> interrupted repin can leave a corrupt lockfile.
> **Chase the surprise:** the 0.74.0 changelog is entirely `crate_universe`
> correctness fixes (cargo-lock v10→v11, a non-root-repo checksum bug, Windows
> GNU staticlib naming). This machinery is under active repair, not stable
> legacy code — state that, with the date, so no rule overclaims stability.
> Deliverable must DECIDE: the default between the two rules with the
> criterion named; the CI drift check (repin and fail on a non-empty diff, or
> a `--locked`-equivalent if one exists); and whether `crate_universe`'s
> two-lockfile model needs its own `BZL-RUST` rule separate from the generic
> `BZL-MOD` lockfile rule.
> Fleet evidence to test against: 42 distinct `Cargo.toml` across 6 repos, 0
> MSRV pins fleet-wide, 3 of 6 repos with no `rust-toolchain.toml`, 4
> pinned-rev git dependencies on `astral-sh/uv` internals in
> `ocx-mirror/crates/ocx_python/Cargo.toml:29-32`, and two fork-as-submodule
> vendorings with no Bzlmod analogue.

**7.2 `cargo-build-scripts-and-cross-compilation`**
> Establish where Rust-under-Bazel hermeticity actually breaks and what fixes
> it without forking a crate.
> Fetch `raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/cargo.md`,
> the `crate.annotation()` docstring again for `build_script_env`,
> `build_script_use_cc_toolchain` and `override_targets`,
> `https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/`,
> `https://blog.fahhem.com/2024/09/bazel-build-new-rust-project/`,
> `github.com/bazelbuild/rules_rust/issues/205`, and `discussions/815`.
> Pin down: what `cargo_build_script` does with `cargo:*` directives and what
> it cannot see (a sandboxed action has no `.git`, no host `pkg-config`, no
> network); the exact annotation shape that pins a build script's environment;
> why proc-macro crates must build for the host during cross-compilation and
> why the monolithic `ToolchainInfo` (rustc, cargo, clippy, rustfmt, stdlib in
> one unit) prevents an independent resolution, with `extra_exec_rustc_flags_triples`
> as the partial mitigation; and whether `rules_rust` still requires a C++
> toolchain for a pure-Rust build.
> Also: `crate_universe` ignores path dependencies, so internal workspace-crate
> edges must be hand-declared in BUILD files — establish whether that is still
> true at 0.74.0 and what keeps the hand-written list in sync.
> Deliverable must DECIDE: the rule for a crate whose `build.rs` reads
> repository state, tested against the fleet's real one —
> `ocx/crates/ocx_cli/build.rs:1-118` uses `vergen-gix` to bake git, build,
> rustc and CI provenance into `cargo:rustc-env`, consumed through
> `option_env!()` with a documented fallback for tarball builds
> (`build.rs:14-21`). Say what that build script becomes under Bazel, and
> whether the fallback path is the answer or a `--workspace_status_command` is.

**7.3 `rust-ide-lint-and-test-parity`**
> Establish the developer-experience surface: does the editor work, do the
> lints run, and does the test set match what `cargo test` would have run.
> Fetch, from `bazelbuild/rules_rust` at `main`: `docs/src/rust_analyzer.md`,
> `docs/src/clippy.md`, `docs/src/rustfmt.md`, `docs/src/coverage.md`; then
> `github.com/bazelbuild/rules_rust/issues/2510` and
> `https://mmapped.blog/posts/17-scaling-rust-builds-with-bazel`.
> Pin down: the `rust_analyzer:setup` one-shot installer, which editors it
> covers, that it needs no host Rust install, the per-developer
> `user_config.json` toggles, and what `--per-package-workspaces` sacrifices
> ("find usages" misses callers in other packages); the stated non-working
> VSCode debug codelens and its `gen_launch_json` workaround; the aspect plus
> output-group registration in `.bazelrc` that gates clippy and rustfmt
> (never a per-target attribute), the `no-clippy` opt-out tag, the
> recommendation that rustfmt be CI-only, and the open intermittent failure of
> the clippy aspect on unsandboxed tests; and the coverage inconsistency where
> `rust_test(crate = …)` instruments `#[cfg(test)]` code without
> `--instrument_test_targets`.
> **Chase the surprise:** `rules_rust`'s IDE story is materially the most
> mature of the four languages in this programme, and one independent account
> still reports it choking on a real codebase where it worked in a prototype.
> Establish the scale boundary if the sources support one, and say plainly if
> they do not.
> Then test parity: Cargo auto-discovers doc tests, integration tests and unit
> tests; Bazel requires explicit targets. Establish the checklist that proves a
> `rust_test` set covers what `cargo test` did, including `crate_root` and
> `data` for fixtures.
> Deliverable must DECIDE: the IDE setup a `bazel-adopt` run must perform
> before handing a Rust repo back, and the test-parity verification.

### Group 8 — `bazel-python` · family `BZL-PY` · *launch as written*

**8.1 `python-toolchains-and-pypi-resolution`**
> Establish how Python becomes hermetic under Bazel, and exactly how far the
> uv story goes.
> Fetch, from `bazel-contrib/rules_python` at `main`: `README.md`,
> `BZLMOD_SUPPORT.md`, `docs/toolchains.md`, `docs/pypi/lock.md`,
> `docs/howto/multi-platform-pypi-deps.md`, `docs/environment-variables.md`,
> and `CHANGELOG.md`; then `https://blog.aspect.build/python-toolchains` and
> `github.com/bazel-contrib/rules_python/issues/1463`.
> **Version first:** confirm the current release (wave 1 measured 2.3.3,
> 2026-09-04) and state the floor every claim applies to.
> Pin down: that hermeticity is opt-in — without `python_register_toolchains()`,
> `py_binary` and `py_test` fall back to whatever interpreter is on the host
> PATH; the ordering trap where `pip.parse()` runs as a repository rule
> *before* toolchain resolution, so the resolved interpreter must be threaded
> through explicitly; the toolchain-selection flags (`py_linux_libc`,
> `py_freethreaded`); the distinction between the raw interpreter target and
> the repl target with respect to `PYTHONSAFEPATH`; the `pypi` hub-name
> collision across Bzlmod modules and whether the environment variable that
> addresses it resolves or only warns; and the multi-platform PyPI selection
> pattern with its stated naming breakdown past a couple of axes.
> **Chase the surprise, and make it the artifact's headline:** the fleet is
> uv-everywhere — seven projects, every one locked through `uv.lock`, every
> lock carrying platform-tagged wheels — and rules_python's uv integration
> does *not* consume `uv.lock`. Establish precisely what it does (`uv pip
> compile` as a faster `pip-compile` feeding a generated `requirements.txt`
> into `pip.parse()`), what the `pip.parse(uv_lock=…)` parameter actually
> covers as of 2.1.0, what `pylock.toml` support is tracked under, and where
> `aspect_rules_py` sits relative to it. State the consequence plainly: every
> `uv.lock` in this fleet is a migration cost, not an asset.
> Deliverable must DECIDE: the hermetic-Python setup a rule mandates, the
> lockfile path a uv-based repo actually takes, and whether the project-root
> auto-detection heuristic needs an explicit `project=` in a monorepo.

**8.2 `python-bootstrap-imports-and-precompiling`**
> Establish the runtime shape of a Bazel-built Python binary and the traps that
> produce a wrong module rather than an error.
> Fetch `raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md`,
> the same repo's `CHANGELOG.md` (read the 0.33.0, 0.35.0, 1.5.0, 2.0.0, 2.1.0
> and 2.3.x entries), `docs/environment-variables.md`, and
> `github.com/bazel-contrib/rules_python/issues/2212`.
> Pin down, each with the version it changed in: the `system_python` versus
> `script` bootstrap, what each does to `sys.path` ordering and
> `PYTHONSAFEPATH` inheritance, which is forced on Windows, and which is the
> default now (2.0.0 changed it); the venv-per-target model introduced at 2.0
> and what it replaced; the `imports` attribute and the `sys.path` entries it
> adds, with the shadowing failure spelled out; and the three named
> precompiling caveats — `.pyc` dropped when rules_python's `PyInfo` mixes with
> the builtin one, pre-3.11 interpreters never loading the precompiled files
> because of `sys.path[0]` ordering, and the action conflict from a `py_binary`
> and `py_library` sharing sources with different exec properties.
> **Chase the surprise:** precompiling shipped in 0.33.0 (2024-06-12) and its
> per-binary opt-in still had an open correctness bug years later. Treat
> "shipped in version X" and "works per-target" as two separate claims
> throughout, and check the current status of that issue.
> Also: `PYTHONHASHSEED` and `__pycache__` as a Bazel-action-cache concern
> specifically, distinct from the general Python hygiene the sibling
> `python-packaging` set already owns.
> Deliverable must DECIDE: whether the shipped rule recommends precompiling at
> all, the bootstrap a new repo should pin, and the check that catches an
> `imports`-induced shadowing before it produces a wrong answer.

**8.3 `python-tests-and-build-generation`**
> Establish how Python tests and BUILD files get written under Bazel without a
> human writing each target.
> Fetch `https://pytest-bazel.readthedocs.io/latest/`,
> `https://rules-python.readthedocs.io/en/latest/gazelle.html` and
> `raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/directives.md`;
> then the rules_python CHANGELOG for the Gazelle-plugin version floor.
> Pin down: why Bazel needs explicit test targets where pytest expects
> discovery, and what each available wrapper solves (`pytest-bazel` versus the
> older macro) — conftest handling, plugin discovery, `--test_filter`
> plumbing, and sharding; the Gazelle Python plugin's directives
> (`python_extension`, `python_root` for monorepos where Python does not own
> the workspace root, `python_manifest_file_name`), the `gazelle_python.yaml`
> manifest requirement and what happens when it is missing or stale (generation
> silently fails to resolve third-party imports rather than erroring); and the
> plugin's own rules_python version floor and the stdlib-list bug below it.
> Fleet evidence to test against: the two acceptance harnesses are pytest roots
> with no `[build-system]` (`ocx/test`: 156 test files, 92 subprocess call
> sites, 11 files touching `sys.path`; `grimoire/test`: 67 test files, 16
> subprocess sites), and both resolve the binary under test through an env var
> with a fixed relative-path fallback (`ocx/test/conftest.py:211-219`,
> `grimoire/test/conftest.py:300-305`). Establish concretely what a `py_test`
> with the binary as a `data` dependency replaces there, and whether runfiles
> resolution removes the env var entirely.
> Deliverable must DECIDE: the recommended pytest wrapper with its version, and
> whether Gazelle generation is worth standing up for a Python project at the
> fleet's scale or only above some target count.

### Group 9 — `bazel-cpp` · family `BZL-CC` · *revise after wave 2*

Revision trigger: dive 4.2 settles the host-toolchain-leakage and autodetection
findings. Fold its conclusion in before commissioning 9.1, and drop whatever
9.1 would otherwise re-derive about `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN`.

**9.1 `hermetic-cc-toolchain-choice`**
> Decide, on stated criteria, which hermetic C++ toolchain a repository should
> adopt — and establish why the question exists at all.
> Fetch `raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md`,
> `raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md`,
> `raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md`,
> `https://pigweed.dev/blog/06-better-cpp-toolchains.html`, and the Bazel 9.0
> release notes for the C++ rule externalisation.
> Pin down: that `rules_cc` states outright it "does not yet offer a hermetic
> toolchain distribution" and names third-party projects without endorsing one;
> the four concrete symptoms of the autodetected default toolchain
> (non-hermetic, gcc/binutils preferred over clang/llvm, CI-versus-local
> divergence, flags settable only through rc files) and the trace from
> `pw_cc_toolchain` through the modular-toolchain SEED to the upstreamed
> `rules_cc` 0.0.10 API; `toolchains_llvm`'s sanitizer features and their
> `--host_features` reset in the exec configuration, its bring-your-own-sysroot
> cross-compilation model, the Yocto-versus-Debian include-layout override, and
> its brand-new C++ named-modules support gated at Bazel 9.2 plus LLVM 22 with
> Bazel 7 and 8 not exposing the API at all; and `hermetic_cc_toolchain`'s
> UBSAN-on-by-default behaviour (a program that builds clean elsewhere crashes
> with `SIGILL`), its Zig cache living outside Bazel's output base so
> `bazel clean --expunge` never clears it, its unimplemented OSX sysroot, and
> its stated compatibility limited to `rules_go`, `rules_rust` and
> `rules_foreign_cc`.
> **Chase the surprise:** the newest capability and the oldest strict-deps
> feature interact — without the `cpp_modules` feature, `toolchains_llvm`
> deliberately disables C++ named modules to preserve the Clang module-map
> behaviour `layering_check` depends on. Establish that interaction precisely.
> Deliverable must DECIDE: a decision tree keyed on constraints, not
> preference — needs named modules or the newest sanitizer story; needs easy
> cross-compilation and can absorb UBSAN-by-default; needs a toolchain shaped
> to exactly one platform. State explicitly that the fleet's own zig
> arrangement is a missing-`g++` workaround governing zero targets
> (`ci` Headline: 0 `cc_binary`/`cc_library`/`cc_toolchain` anywhere), not an
> endorsement.

**9.2 `layering-check-includes-and-sanitizers`**
> Establish how C++ dependency hygiene is mechanically enforced under Bazel,
> and where the enforcement silently stops.
> Fetch `https://maskray.me/blog/2022-09-25-layering-check-with-clang`,
> `github.com/bazelbuild/bazel/issues/21592`, the Build Encyclopedia's C/C++
> page for `features`, `implementation_deps`, `includes`,
> `strip_include_prefix` and `include_prefix`, the `toolchains_llvm` README's
> sanitizer section, and `blog.bazel.build/2021/02/08/rules-fuzzing.html` for
> the fuzzing config shape.
> Pin down: how Bazel converts `hdrs` to textual headers, `srcs` to private
> textual headers and `deps` to module "use" declarations in generated
> `.cppmap` files, then compiles with `-fmodules-strict-decluse` and
> `-Wprivate-header`; that it catches only direct `#include`s, so
> Include-What-You-Use should run first; that most systems ship no Clang module
> maps for the standard library, making Bazel's own generator script the
> adoption unblocker; and — the sharp one — that `layering_check` **silently
> stops enforcing anything** once compilation runs unsandboxed, because Clang
> can then load transitive module maps Bazel never declared as inputs. That is
> a false negative, not a failure, and the documented rollout is per-package
> opt-in rather than a repo-wide flip.
> Then the include-path trio: establish which of `includes`,
> `strip_include_prefix` and `include_prefix` breaks cross-package include
> hygiene and how to tell them apart, because they read as interchangeable.
> Then sanitizers: the standard `--config=asan|tsan|msan` flag set with
> `-fno-omit-frame-pointer`, `-O1`, the matching `linkopt` and `--strip=never`;
> the `--host_features` reset that keeps build tools uninstrumented; and why
> MSan additionally needs a separately built instrumented libc++ with no
> official prebuilt.
> Deliverable must DECIDE: the `layering_check` rollout procedure, the
> verification that it is actually enforcing (not merely enabled), and the
> shipped sanitizer config block.

**9.3 `foreign-builds-modules-and-cpp-tooling`**
> Establish the three remaining C++ adoption blockers and their current status,
> dated.
> Fetch `github.com/bazel-contrib/rules_foreign_cc/issues/1221` and
> `bazelbuild/rules_foreign_cc/issues/720`, `github.com/bazelbuild/bazel/pull/19940`
> and `discussions/19939` for C++20 modules,
> `github.com/hedronvision/bazel-compile-commands-extractor`,
> `github.com/bazelbuild/bazel/issues/19208` for Linux-to-Windows
> cross-compilation, `github.com/bazelbuild/bazel/issues/16711` for sandbox
> cost, and
> `https://medium.com/@Vertexwahn/what-blocks-c-developers-from-using-bazel-in-2024-4774fbc4d356`.
> Pin down: why wrapping a CMake or Autotools project means hand-declaring
> every input a foreign build system would auto-discover, why `layering_check`
> cannot be enabled for those targets at all, and the platform-specific
> slowness reports; the current status of native C++20 module support versus
> interim rulesets, stated with a date because it is moving; how the de facto
> `compile_commands.json` generator uses `aquery` to ask Bazel for the exact
> commands rather than doing a full build, and how staleness is detected; the
> MSVC path-style and wrong-architecture-resolution failures in
> Linux-to-Windows cross-compilation, plus the general rule that a Starlark
> transition setting legacy flags is invisible to rules reading `--platforms`;
> and the symlinked-sandbox construction cost, linear in input count and
> reported dominant around 300K files.
> **Chase the surprise:** one practitioner ranking puts missing IDE integration
> *above* missing C++20 modules and both above the learning curve, as the
> reason C++ teams do not adopt Bazel. Treat that as a hypothesis to test
> against the rest of this corpus rather than a finding to repeat — it is a
> single self-described "gut feeling" ranking.
> Deliverable must DECIDE: whether the shipped C++ file recommends
> `rules_foreign_cc` at all or treats it as a last resort, and the IDE setup a
> C++ repo needs before Bazel is usable day to day. Note in the artifact that
> this file has no fleet consumer (the fleet has one CMake probe directory and
> zero C++ targets) and is therefore grounded entirely on upstream sources.

### Group 10 — `bazel-ci-and-target-selection` · family `BZL-CI` · *revise after wave 2*

Revision trigger: dives 3.1 and 4.1 determine what makes an action key stable.
Target selection is only trustworthy on top of that, so 10.1's determinism
precondition must cite their conclusions rather than assert its own.

**10.1 `target-selection-and-the-determinism-precondition`**
> Settle the fleet's default for deciding what CI runs, and the precondition
> that makes any answer trustworthy.
> Fetch `github.com/Tinder/bazel-diff` and
> `github.com/bazel-contrib/target-determinator` (both READMEs in full, including
> their self-documented limitations), `https://aspect.build/blog/monorepo-shared-green`,
> `https://www.canva.dev/blog/engineering/faster-ci-builds-at-canva/`,
> `abseil.io/resources/swe-book/html/ch23.html` (TAP's numbers),
> `arxiv.org/abs/1810.05286` (Predictive Test Selection), and
> `arxiv.org/abs/2405.00796` (the 383-project empirical study).
> Pin down: what each tool actually diffs (content hashes of the whole graph
> versus cquery-based configured-target comparison); `bazel-diff`'s own
> admission that it "is incorrect and will sometimes miss affected targets";
> `target-determinator`'s own admission that its results cache key excludes
> home- and system-level rc files, environment variables and host hardware;
> Aspect's shared-green counter-position; Tinder's reported 93 percent CI time
> reduction; and Canva's third path — a custom input-hashing layer over BwoB —
> together with the step they had to take first, carving out non-hermetic
> steps (shared containers, unbounded a11y suites) before any selection could
> be trusted.
> **Chase the surprise, and lead with it:** 31.23 percent of Bazel projects
> with a CI service configured never invoke Bazel inside that CI, and another
> 27.76 percent of those that do need extra tooling to make it work. Adoption
> that never reaches CI bought nothing. Establish what that measurement implies
> for a hand-off checklist.
> Deliverable must DECIDE: the fleet default with its scale threshold named
> (whole-repo green below some target count, selection above it), the
> determinism precondition as an ordered gate, and — for each tool — the class
> of change it will miss, written so a reviewer can state it without re-reading
> the README. Test the threshold against real fleet numbers, not the frame's:
> `creeptd-ng` has 13 crates, 3 `package.json` and 3 build scripts, so no repo
> in this fleet is at monorepo scale.

**10.2 `ci-matrix-gates-and-release-flow`**
> Establish what a Bazel CI pipeline must contain, what each job proves, and
> which jobs must deliberately refuse help.
> Fetch `bazel.build/remote/ci` (and note that it is stale — it still
> instructs readers to add a WORKSPACE-era `bazel-toolchains` dependency and an
> `rbe_autoconfig` target, impossible on Bazel 9, which makes it a live example
> of official-doc staleness), `github.com/bazelbuild/bazelisk` for
> `.bazelversion` values and `--migrate`, `github.com/aspect-build/rules_lint`,
> and the BCR `docs/contributing.md` plus `publish-to-bcr`'s own README.
> Pin down: the matrix shape that actually earns its cost (pinned major as the
> gate, Active LTS as a second gate or an advisory leg, rolling as a
> non-blocking canary); the lint gate and what makes it a gate rather than a
> report; a registry-parity job and its real shard count; a deterministic text
> guard as a cheaper substitute for exercising a whole platform matrix; and the
> aspect-based lint mechanism as the Bazel-native replacement for per-language
> CLI invocations, including that lint findings become ordinary actions and so
> inherit remote caching.
> **Chase the surprise:** three CI patterns in the fleet are worth generalising
> verbatim, and all three are about *refusing* help. Two jobs deliberately run
> with no remote cache because a cache hit would mask exactly what the job
> exists to prove (registry parity must build what the registry's own presubmit
> builds; offline determinism must fail against an empty store) — and a third
> job omits the cache with no stated reason at all, which a reader cannot
> distinguish from an oversight. Write the rule as "a job that proves something
> is possible without help must not be given help, and must say so in a
> comment".
> Evidence to test against: `.github/actions/remote-cache/action.yml:27-34`,
> `ci.yml:30,56,98-100,143-168,171-172,179-180`, `.bcr/presubmit.yml`, and the
> three-step offline job that warms a store, refetches offline against it
> (must succeed), then refetches offline against an empty store (must fail).
> Deliverable must DECIDE: the minimum job set for a Bazel repo, and which of
> them may share the warm cache.

### Group 11 — `bazel-testing` · family `BZL-TEST` · *launch as written*

**11.1 `test-contract-sizing-and-flakiness`**
> Establish the contract every Bazel test signs, and the attributes that decide
> whether CI is fast, honest, or neither.
> Fetch `bazel.build/reference/test-encyclopedia` and
> `bazel.build/reference/be/common-definitions` in full, plus
> `bazel.build/docs/sandboxing` for what the sandbox denies a test.
> Pin down, with numbers: the `size` enum and its implied RAM (20/100/300/800 MB),
> CPU assumption and default timeout (60/300/900/3600 s), and that `timeout` is
> independently overridable; the sharding contract, the cap of 50, and that a
> runner which never touches `TEST_SHARD_STATUS_FILE` fails the test loudly
> rather than silently running everything per shard; `flaky = True`'s three
> reruns and the docs' own "generally discouraged"; the surprising pass/fail
> semantics of `--flaky_test_attempts`; the full sandbox and cache tag taxonomy
> (`no-sandbox`, `no-cache`, `no-remote-cache`, `no-remote-cache-upload`,
> `no-remote-exec`, `no-remote`, `local`, `requires-network`, `block-network`,
> `requires-fakeroot`, `exclusive`, `manual`, `external`) and — critically —
> that the same string means different things at different action types, being
> read from both `tags` and `execution_requirements`; and the environment
> invariants a test must not violate (only `TEST_TMPDIR` and
> `TEST_UNDECLARED_OUTPUTS_DIR` are writable, no absolute-path assumptions, no
> atime assumptions, no mutation of the runfiles tree mid-run).
> **Chase the surprise:** `manual` removes a target from `build`, `test` and
> `test_suite` expansion but *not* from `query`. That asymmetry is the
> canonical "why didn't CI run this" and is worth its own rule with a check
> that diffs the two.
> Deliverable must DECIDE: whether `size` is MUST or SHOULD; the shipped
> position on `flaky`; and the tag-to-effect table, written once for tests and
> once for Starlark actions rather than merged into a single misleading list.

**11.2 `testing-starlark-and-coverage`**
> Establish how to test Bazel's own extension code, and what coverage costs
> under Bazel.
> Fetch `bazel.build/rules/testing`, bazel-skylib's `unittest.bzl` and
> `analysistest` documentation, `bazel.build/configure/coverage`, and the
> per-ruleset coverage caveats already gathered in wave 1 (rules_rust's
> `docs/src/coverage.md`, rules_js's `docs/troubleshooting.md`).
> Pin down: the difference between `unittest` and `analysistest`, when
> `expect_failure` is the right shape, and how to test a `repository_rule` or
> `module_extension` implementation rather than only its pure helpers; the
> hand-rolled-`ctx`-fake technique that makes offline Starlark unit tests
> possible with zero network and zero sandboxing; data-driven test generation
> from dict literals; and the `analysistest`/`expect_failure` vacuous-pass trap
> (wave-2 dive 1.3 documents it — cite, do not re-derive).
> Then coverage: which languages need a runfiles tree, what fails silently on
> Windows without `--enable_runfiles`, whether coverage counts against a test's
> own `size` and `timeout` budget, and the `--instrumentation_filter` shape for
> a repo with vendored dependencies.
> Fleet evidence to test against: `rules_ocx` has 76 `analysistest`/`unittest`
> targets across five files, 34 of them generated data-driven from two dicts
> (`launcher_test.bzl:1058,1135,1184`), three hand-rolled `ctx` fakes
> (`launcher_test.bzl:40-197`), and exactly zero `analysistest.make()` calls
> against a production rule — the two that exist target hand-written test
> fixtures (`launcher_test.bzl:1169,1299`). Its four repository-rule `_impl`
> functions are proven only by live-registry example tests.
> Deliverable must DECIDE: the coverage bar for a ruleset's own public surface
> (is "the impl functions have an `analysistest`" a MUST?), and the offline-test
> pattern written portably enough to lift.

### Group 12 — `bazel-flags-and-versions` · family `BZL-FLAG` · *revise after wave 2*

Revision trigger: dive 2.1's lockfile-version finding and dive 1.1's
buildifier-to-flag mapping both feed this group. Fold both in; 12.1 should
inherit the flag/warning cross-reference rather than rebuild it.

**12.1 `lts-policy-and-incompatible-flag-churn`**
> Establish where the authoritative version and flag information lives, and the
> procedure for moving a pin.
> Fetch `bazel.build/release`, `bazel.build/release/backward-compatibility`,
> `blog.bazel.build/2020/11/10/long-term-support-release.html`,
> `blog.bazel.build/2021/06/15/bazel-rolling-releases.html`, the 7.0.0, 8.0.0
> and 9.0.0 release notes in full including their flag appendices,
> `raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml`,
> and `github.com/bazelbuild/bazelisk`.
> Pin down: the Active/Maintenance/Deprecated lifecycle, the two-year
> Maintenance window, the LTS cadence and the rolling cadence; the live staging
> as of the research date with version numbers; `.bazelversion`'s accepted
> values including `rolling` and `last_green` and why neither belongs as a
> default pin; and `bazelisk --migrate` plus `BAZELISK_INCOMPATIBLE_FLAGS` as
> the mechanism for testing a flip before the major that flips it lands.
> **Chase the surprise, and make it the artifact's central finding:** the
> official backward-compatibility page names *no flags at all* — it describes
> only the process and defers to the issue tracker. A rule that sends a reader
> there for the current flag list sends them nowhere. The authoritative,
> narrow, actually-tested list is BCR's `incompatible_flags.yml` (wave 1 found
> six active entries plus one commented out pending a bug), and the broad list
> is the `incompatible-change` issue label. Establish both, and say which to
> use for which question.
> Then the 8→9 migration itself: which native rules stopped autoloading, what
> `load()` replaces each, and which of the ~19 flags that flipped in 9.0 affect
> a pure-Starlark repository-rule and module-extension codebase versus only
> C++/Java/Android users. That reduction is the deliverable's most useful
> table.
> Deliverable must DECIDE: the ordered 8→9 migration checklist with its
> verification at each step, and the rule for how long a shipped artifact must
> carry guidance for a Maintenance major.

**12.2 `bazelrc-hygiene-and-ruleset-version-floors`**
> Establish what belongs in an rc file, what must never be there, and how a
> repository tracks its ruleset versions.
> Fetch `bazel.build/run/bazelrc`, `https://aspect.build/blog/bazelrc-flags`,
> `raw.githubusercontent.com/bazel-contrib/bazelrc-presets/main/README.md`, the
> `MODULE.bazel` of rules_js, rules_ts, rules_python, rules_rust, rules_cc and
> rules_lint for their declared `bazel_compatibility` ranges, and each
> ruleset's releases page for the current version.
> Pin down: rc-file precedence and the `--config` mechanism; the version-gated
> flag syntax for flags removed in newer versions; the leading-underscore
> convention for personal `--config` names; the community always-on flag list
> and, for each, what it costs and what it could break — specifically whether
> `--sandbox_default_allow_network=false` breaks an unsandboxed repository-rule
> fetch; the presets generator's explicit not-semver-safe stance and why that
> makes a vendored, code-reviewed snippet the right shape; and the current
> major of every ruleset in the shipped set, dated.
> **Chase the surprise:** `try-import` of a developer rc file is how a machine
> silently diverges from CI. In the fleet, that file overrides `CC` and disables
> a C++ strictness check, and CI never reads its committed content because the
> CI action recreates the file from scratch with only cache flags. Establish
> the general rule: what may live in a `try-import`ed file, and what must be
> committed because CI has to see it.
> Also: a tuning value with no stated rationale (`--remote_timeout=60` in the
> fleet, with no comment saying why 60) — decide whether the shipped rule
> requires a rationale comment for any numeric knob.
> Deliverable must DECIDE: the shipped baseline `.bazelrc` for a new Bazel repo
> at Bazel 9, flag by flag with a one-line reason each; the split between
> committed and `try-import`ed configuration; and the check that a ruleset pin
> is not more than one major behind.

## Deferred

Everything below is in the map and reachable by ID, but no wave-2 or wave-3
brief commissions it. Twenty-four rows, each with what would promote it.

| ID | Why deferred | What promotes it |
|---|---|---|
| M-A-04 (`unsorted-dict-items`) | Buildifier's own maintainers call it too noisy for general use | Someone actually enabling it on a dict-heavy `.bzl` file and measuring the diff churn |
| M-A-21 (BUILD DRY-versus-readability) | A style judgement with no mechanical check | A reviewer citing it twice on real diffs |
| M-A-22 (over-exported `.bzl` symbols) | Grep-and-judge only | A `bazel query` formulation that makes it checkable |
| M-B-15 (BCR visibility surface) | One repo in the world this ships to has a BCR submission | A second fleet module heading for the registry |
| M-B-17, M-B-18 (vendor mode, `pin()`) | Vendor mode's own offline guarantee is contested and two open issues show gaps | An air-gapped build requirement, or the open issues closing |
| M-C-09 (inert-versus-live override) | A framing distinction, already settled by the audit | Nothing — it ships as one line inside `hermeticity.md` |
| M-C-14 (`constant-glob` versus empty glob) | Two bugs, one already guarded by a flag the fleet sets | A repo hitting the literal-pattern case |
| M-D-05 (read-side cache disclosure) | Distinct from poisoning, but no fleet exposure today | The cache becoming reachable outside the org |
| M-D-16 (cache GC) | Disk-cache GC landed in 7.4; repository-cache GC is an upstream open request | A CI runner filling its disk |
| M-D-17 (cache compression) | Defaults false, no-op below 100 bytes, counter-evidence is second-hand | A measurement on real artifact sizes |
| M-D-18, M-D-19 (protocol scheme, symlink strategy) | Server-operator questions with one deployment in scope | Adopting a second cache backend |
| M-D-21 (cache chunking) | Version floor is exactly the pinned major, so the win is untested here | Moving the pin to 9.1+ |
| M-E-04 (`--runs_per_test`) | Flakiness has no fleet instance yet | A flaky test that survives one triage round |
| M-E-13 (coverage runfiles on Windows) | Documented for JS only; generalising it needs verification per language | Any fleet repo running coverage on Windows |
| M-F-09 (linting ignored directories) | Cosmetic until an example module breaks | A `.bazelignore`d directory shipping a broken BUILD file |
| M-F-10 (registry parity shard count) | An estimate correction, already recorded | A CI-minutes budget review |
| M-G-04 (`package_group`) | Needs cross-team boundaries the fleet does not have | A second team on the same repo |
| M-G-11 (execution groups) | Mobile and cross-compile concern with no consumer | A target whose actions genuinely need two platforms |
| M-G-12 (protobuf model) | Zero `.proto` files fleet-wide | The first `.proto` file |
| M-G-21 (hidden coupling in the module graph) | Diagnostic, not a standard | A submodule chain actually being Bazelified |
| M-H-10 (personal `--config` collisions) | Trivial and rare | A collision costing someone an hour |
| M-H-15 (`PROJECT.scl`) | Emerging Bazel-9-era format, not settled | It appearing in a ruleset the fleet depends on |
| M-J-15 (zipapp CLI) | It is the "needs nothing from Bazel" example, which is the finding | Nothing — it ships as one line |
| M-L-17, M-L-18 (sandbox base, symlink cost) | Real knobs, no C++ consumer to tune them for | A C++ build in the fleet |

## Questions for the owner

Eight decisions no amount of research settles. Each names the default the
programme assumes if the question goes unanswered.

1. **Does the fleet pilot Bazel in a real repository, and which?**
   *Default if unanswered:* no pilot. The artifacts ship grounded in upstream
   sources plus `rules_ocx`, and `bazel-adopt` names `bob` as the pilot
   candidate if one is ever run — 9 `Cargo.toml`, one clean DAG, no Python, no
   TypeScript, no CI to preserve, and nothing else to touch
   ([fleet](bazel-audit/fleet-bazel-readiness.md) Repo shapes).

2. **Does `rules_ocx` move its pin from 8.7.0 (Maintenance) to 9.x (Active)?**
   The cost is real: the stardoc golden files only match 8.7.0's output, so a
   move means regenerating them and losing the 8.x docs-freshness signal.
   *Default:* the pin stays, the artifacts carry dated guidance for both
   majors, and the map records that the pin is one major and one patch behind.

3. **Is target determination or whole-repo green the fleet default?**
   *Default:* whole-repo green, because no repo in this fleet is at monorepo
   scale once the worktree miscount is removed (`creeptd-ng` is 13 crates, not
   65), and because both selection tools document real correctness gaps.
   Selection becomes the default above a target count wave-3 dive 10.1 will
   name.

4. **Does `bazel-essentials` ship cross-set pointers into `rust-cargo`,
   `python-packaging` and `typescript-packaging`?** A one-line pointer in each
   sibling index closes the "agent edits only `Cargo.toml` in a Bazel repo and
   forgets to repin" gap without giving the Bazel rule those globs.
   *Default:* propose the three pointer PRs separately and ship
   `bazel-essentials` self-contained; the miss stands until they land.

5. **Is `MODULE.bazel.lock` in the rule's glob list?** This map says yes: the
   moment an agent opens a conflicted lockfile is the highest-value moment in
   the set, and the intuitive action silently discards every other module's
   pin. The cost is one index load whenever a 166 KB generated file is opened.
   *Default:* in.

6. **Is the remote-cache write credential migrated to `--credential_helper`?**
   The helper has been stable since Bazel 7.0; the fleet embeds a static token
   in a gitignored rc file today. *Default:* the shipped rule states the helper
   as MUST for a new setup and SHOULD for an existing one, and the fleet fix is
   filed as separate work rather than treated as this programme's deliverable.

7. **Does the C++ depth file ship with no fleet consumer?** It is grounded
   entirely on upstream sources and cannot be validated against fleet code.
   *Default:* ship it, marked as such in the file itself — `rules_ocx`'s stated
   audience is Bazel monorepo maintainers, and C++ is where Bazel's hermeticity
   story is hardest and least well documented.

8. **Does `bazel-quality` claim `**/*.star` and `**/*.scl`?** These are
   Bazel-dialect Starlark outside a Bazel build. The fleet has a measured
   instance that shipped the top-level-statement parse bug twice.
   *Default:* yes, claimed — an extension glob that cannot miss, covering a
   twice-shipped bug class.

## Explicitly not a defect

The frame listed these as suspected findings. The audits cleared them with
measurements. Nobody should re-investigate them; the evidence is here so a
later wave does not spend a worker on it.

| Frame suspicion | What was measured | Source |
|---|---|---|
| `glob` misuse | 0 real `**` globs in the repo's own build graph. The single `**` hit is inside a string template written into a *consumer's* generated repo, never evaluated by this repo's Bazel invocation | [shape](bazel-audit/starlark-code-shape.md) §2 |
| `select()` explosion | 1 real `select()` call, in `docs/BUILD.bazel:19`, excluding Windows from the stardoc graph. The other 7 raw hits are docstring prose or string templates | [shape](bazel-audit/starlark-code-shape.md) §2 |
| Repository-rule hermeticity (`getenv`, `watch`, unsandboxed fetches) | 9 `getenv` and 4 `watch`/`watch_tree` call sites, all funnelled through 2 documented, individually tested helpers rather than scattered; both `ctx.download` sites carry `sha256`; the one raw-shell `ctx.execute` carries an explicit CWE-426 rationale | [shape](bazel-audit/starlark-code-shape.md) §2, [ci](bazel-audit/build-contracts-and-ci-posture.md) §5 |
| Module-extension purity and `reproducible` | Already correct and deliberate: `reproducible = True` at `extensions.bzl:331`, with the purity boundary documented at `:6-10`, and `grep` for `module_ctx.os`/`getenv` in the extension returns nothing | [shape](bazel-audit/starlark-code-shape.md) Patterns §2, [ci](bazel-audit/build-contracts-and-ci-posture.md) §6 |
| Doc-versus-code drift in the ocx CLI contract | None. Every sysexit and every JSON-shape claim in `AGENTS.md` has a currently-correct code site, including the deliberate absences (sysexit 82 explained identically in both places) | [ci](bazel-audit/build-contracts-and-ci-posture.md) §6 |
| The `.bazelrc.user` C-toolchain override as a live hermeticity bug | Real, non-hermetic, correctly flagged — and **inert**. The repo defines 0 `cc_binary`/`cc_library`/`cc_toolchain` targets, so the flag pair governs nothing today. A latent trap, not an active bug | [ci](bazel-audit/build-contracts-and-ci-posture.md) Headline and Contradictions, [frame](bazel-frame.md) correction 4 |
| Sparse attribute documentation | 51 of 51 production `attr.*()` declarations carry `doc=`; 10 of 10 public declarations documented. The 5 undocumented attrs are all in test and example scaffolding | [shape](bazel-audit/starlark-code-shape.md) §2, §6 |
| `native.*` usage in `.bzl` files | 0 anywhere, including BUILD files, which call native rules unprefixed and correctly | [shape](bazel-audit/starlark-code-shape.md) §2 |
| Lingering WORKSPACE files | 0. `find . -iname 'WORKSPACE*'` returns nothing — pure Bzlmod from birth | [shape](bazel-audit/starlark-code-shape.md) Headline |
| Untrusted-PR cache poisoning | Already mitigated by construction: the write credential is gated on `github.event_name == 'push'`, so every PR including same-repo PRs gets read-only anonymous access via `--remote_upload_local_results=false`. The fleet already implements the corpus's recommended fix | [ci](bazel-audit/build-contracts-and-ci-posture.md) §4 |
| Visibility discipline on the private surface | All 7 `ocx/private/*.bzl` modules declare a `visibility()` load-gate layered under a public BUILD-target visibility — the two mechanisms doing different jobs, correctly | [shape](bazel-audit/starlark-code-shape.md) §7 |
| Remote execution missing from CI | Not missing — a stated architectural non-goal with a written reason (`README.md:246-249`), and no `--remote_executor` anywhere. Corroborated independently by two audits | [cfg](bazel-audit/config-inventory.md) Contradiction 5, [ci](bazel-audit/build-contracts-and-ci-posture.md) §4 |
