---
title: "BZL-ARCH — layout, granularity, visibility, platforms, migration state"
topic: bazel-architecture-monorepo
family: BZL-ARCH
model: opus
consolidates:
  - bazel-architecture-monorepo/package-granularity-visibility-and-generation.md
  - bazel-architecture-monorepo/platforms-selects-transitions-and-migration-state.md
  - bazel-followups/gazelle-plugin-maturity-per-language.md
  - bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md
  - bazel-followups/adoption-go-no-go-gate-and-coupling-query.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
  - bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md
  - bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md
grounded_in:
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-topic-map.md § "How to read this" (shapes A–F, source keys)
  - bazel-topic-map.md § "Conflicts resolved" (18 settled facts, esp. 8, 9, 12, 16)
  - bazel-topic-map.md § "The map" › G (M-G-01 … M-G-24)
  - bazel-topic-map.md § "Selected for wave 2" › group 5
  - bazel-frame.md § Corrections (waves 1, 2, 3a, 4a, 3b, and the eight post-map decisions)
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-ARCH

## Verdict

Twenty decisions. Two dives, three commissioned follow-up rounds and one
cross-version measurement on real 8.7.0/8.8.0/9.2.0 binaries; 37 primary sources
in the dives plus 53 in the follow-ups. One fleet Bazel repo that exhibits
eleven of the thirty-five rules and is structurally unable to exhibit
seventeen.

1. **Granularity is not an independent choice — it is downstream of generator
   maturity, and we pin that as the decision procedure.** Fine-grained targets
   buy a narrower affected-test set; their cost is BUILD-file labour that both
   Bazel's own best-practices page and SWE-at-Google ch. 18 say is "mitigated"
   only by generation tooling
   (`bazel-architecture-monorepo/package-granularity-visibility-and-generation.md:91-95`).
   The wave-4a follow-up re-measured every plugin and the split is sharper than
   the party label: **production** for Go and protobuf (bazel-gazelle core
   `v0.54.0`, roughly monthly releases) and for Python (`rules_python`'s own
   `gazelle/`, `2.3.3`, but only paired with a pytest wrapper); **usable with
   care** for JS/TS; **experimental** for Rust (`gazelle_rust`, one maintainer,
   one tag `v0.1.0` since 2026-05-05)
   (`bazel-followups/gazelle-plugin-maturity-per-language.md` Q5). Go
   fine-grained only where a maintained generator exists; stay coarse
   (package-per-directory, hand-kept) everywhere else. This is BZL-ARCH-11,
   marked **pinned**.
2. **Two sequencing decisions, because the dives overlap here and neither states
   the order.** The shared-output-directory question is decided *before* target
   granularity (`platforms-selects-transitions-and-migration-state.md:385-390`),
   and granularity is decided before any BUILD file is authored (decision 1).
   Reason: Bazel's output-tree constraint has exactly two resolutions — one root
   `BUILD` file, or a per-package restructure (`:240-259`) — and both of them
   *are* granularity decisions. Discovering it afterwards means redrawing
   package boundaries twice.
3. **Bazel has three visibility mechanisms, and the third exists on Bazel 9 —
   corrected by measurement.** Target visibility and load visibility are
   separate systems that a public BUILD target does not unify
   (`package-granularity…:148-165`). `transitive_visibility` was recorded here
   on 2026-09-05 as "absent from both the 8.1.0 and 9.1.0 versioned snapshots,
   confirm with `bazel help package`". Both halves of that were wrong. Running
   it on the binaries: 8.7.0 and 8.8.0 reject the keyword outright, **9.2.0
   accepts it** and type-checks the argument as a single `package_group` label
   *string* — not a list, not the `//visibility:public` sentinel — and a
   `filegroup` under it builds clean
   (`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md` Q2).
   And **`bazel help package` is not a subcommand on any of the three
   versions**; the only probe is two lines in a throwaway `BUILD.bazel`. It now
   gets a rule row, BZL-ARCH-34, version-gated. The ship version is measured,
   not bracketed: 9.0.0 and 9.1.0 both accept the `package_group`-label form,
   so the boundary is the 8→9 major line itself and the row reads **9.0.0+**
   (`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md` Q3).
4. **`default_visibility = ["//visibility:public"]` is a MUST-avoid with one
   named exemption, and we disagree with the dive about the fleet's second
   instance.** The dive reads both `rules_ocx` sites as "deliberate public
   façade, not accidental sprawl" (`package-granularity…:369`). `ocx/BUILD.bazel:6`
   is the façade and is exempt. `ocx/private/BUILD.bazel:6` is a package
   literally named `private` whose *target* visibility is public; only the
   separate per-file `visibility()` load-gate makes it safe
   (`bazel-audit/starlark-code-shape.md:268`). Decision: the rule requires the
   reason to be written at the site. One compensating control that is invisible
   two files away is not a stated exemption.
5. **Map correction — M-G-05's verification does not exist as written, and the
   corrected form is never wired for you.** The map names "`gazelle -mode=diff`
   produces no diff". Gazelle's own README documents no such CLI mode; the
   runnable check is the Bazel-native `gazelle_test` rule, whose `mode`
   attribute defaults to `"diff"` in `@gazelle//:def.bzl`
   (`package-granularity…:203-237`). The wave-4a follow-up then read all four
   ecosystems' own canonical examples — bazel-gazelle's own root `BUILD.bazel`,
   rules_python 2.3.3's install doc, `gazelle_rust`'s example, and Aspect's
   `aspect_gazelle()` macro — and **none wires `gazelle_test`**; every one ships
   only the `gazelle()`/`sh_binary` half. Worse, Aspect's
   `aspect_gazelle(with_check = True)` produces an `sh_binary`, not an
   `sh_test`, so it is invisible to `bazel test //...` and to any CI
   aggregation that counts test results
   (`bazel-followups/gazelle-plugin-maturity-per-language.md` Q7). BZL-ARCH-12
   ships the corrected form **and** says the gate is hand-wired.
6. **Brief correction — the package-per-directory rule is on the wrong page.**
   Wave 2's own brief names `bazel.build/concepts/build-files` as a source for
   it. That page does not contain the rule; `bazel.build/configure/best-practices`
   does, verbatim (`package-granularity…:71-78`). Any shipped citation pointing
   at `concepts/build-files` for this is citing the wrong page.
7. **Conflict 8 in the map cuts both ways: a `bazel.build` prose page can be
   *ahead* of the numbered releases, not only behind — and a versioned snapshot
   can still be wrong about the binary.** Three instances now:
   `transitive_visibility` present on HEAD and absent from 8.1.0/9.1.0 while
   *live* on 9.2.0 (decision 3); the live platforms page having *dropped* the
   "Migrating to Platforms" title, the "biggest challenge" sentence and the
   per-language status table that the 8.7.0 snapshot still carries in full
   (`platforms-selects…:157, 442`); and the CLI-reference read behind
   BZL-ARCH-09, which the binaries contradict outright (decision 14). Decision:
   every version-specific claim in this family cites a versioned snapshot
   (`bazel.build/versions/<v>/…`), a release note, or the output of
   `bazel help build --long` / `bazel help startup_options` **on that binary** —
   never the rolling page alone, and never a doc page where the binary can be
   asked directly.
8. **The transition-explosion measurement is settled, and it is `cquery`.** The
   canonical transitions page ends its own `2^n` failure-mode section with a
   literal "TODO: Add strategies for measurement and mitigation"
   (`platforms-selects…:159-161`). `aquery` structurally cannot answer it —
   same-`execPath` actions under different configurations render as separate
   entries, documented, not a bug (`:174-176`). The confirmed invocation is
   `bazel cquery 'deps(//t)' 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn`,
   which is the same grouping Bazel's own `ctexplain --analysis=summary` runs
   internally (`:178-187`). BZL-ARCH-19.
9. **`ctexplain` is the summary tool, not the explain tool — no rule may depend
   on it beyond that.** Three of its four analyses (`culprits`, `forked_targets`,
   `cloned_targets` — the ones that would name *which* flag forked a target) have
   printed a literal "this analysis not yet implemented" stub since a 2020
   header, through a commit touching the file on 2026-09-04
   (`platforms-selects…:189-208`). It also ships only inside the `bazelbuild/bazel`
   source tree: no BCR module, no release. It gets no rule row; it goes to
   failure modes.
10. **Migration state: the language's own manifest is the sole hand-edited
    source of dependency truth, and the Bazel-side lockfile is one-way
    generated.** The IDE decides this, not Bazel — `rust-analyzer`, Pyright and
    tsserver read `Cargo.toml`/`pyproject.toml`/`package.json`, never the Bazel
    graph, and `crate_universe` ignores path dependencies regardless, so
    internal deps stay hand-declared either way (`platforms-selects…:219-223`).
    MUST, all languages, all majors.
11. **Bazel does not read `.gitignore`, and the fleet has the live bug to prove
    the cost.** `.bazelignore`'s own definition never mentions git
    (`platforms-selects…:229-238`); without `.agents/worktrees` listed,
    `bazel test //...` glob-expanded into a live agent worktree's `examples/`
    and failed (`bazel-audit/config-inventory.md:70`). MUST.
12. **What we deliberately did not ship as rules.** The "size the `select()`
    rewrite and the transition rewrite separately" heuristic
    (`platforms-selects…:301-306`) is planning, not a standard — it belongs to
    the `bazel-adopt` skill. The pnpm-workspace-declares-`web`-but-`web`-is-npm
    drift (`package-granularity…:351-354, 371`) is `package.json` hygiene —
    covered by `typescript-packaging`; BZL-ARCH cites it as evidence for
    decision 1 and moves on. Every `config_setting`-sprawl threshold stays
    CONSIDER because no primary source publishes a number
    (`platforms-selects…:136, 413-418`), and the rule-count-to-source-file ratio
    stays CONSIDER for the same reason (`package-granularity…:239-248`). Four
    facts the follow-ups established belong to other families and are cited, not
    restated: the Bazel-9 explicit-`load()` requirement for `proto_library`
    (BZL-LARK's autoload row), `prefer_prebuilt_protoc`'s path move and default
    flip at protobuf 34.0 (BZL-FLAG), `ts_proto_library`'s deprecation in
    rules_ts 3.10.1 (BZL-JS), and the Bazel-9 implicit `test` exec group
    (BZL-TEST).
13. **Version boundaries the decisions rest on.** Load visibility: Bazel 6.0+.
    Platform-based C++/Android toolchain resolution by default: Bazel 7.0+.
    `REPO.bazel`'s `ignore_directories()`: Bazel **8.0.0+ only** — recommending
    it on a 7.x pin is a version-floor miss with no error until someone runs it.
    Path-mapping action dedup: Bazel 7.4.0+, flag still `off` and "highly
    experimental" on 8.7.0 and 9.2.0 alike, and its accepted value set differs
    between them (8.7.0: `off, content or strip`; 9.2.0: `off or strip`).
    `package(transitive_visibility = …)`: **absent through 8.8.0, live on
    9.0.0, 9.1.0 and 9.2.0** — the 8→9 major line is the boundary, measured on
    all five binaries. Flag defaults read from the binaries 2026-09-05, not
    from a doc page: `--incompatible_enforce_config_setting_visibility` **true**
    on both
    8.7.0 and 9.2.0; `--incompatible_config_setting_private_default_visibility`
    **false** on both (so an unspecified-visibility `config_setting` is public
    *today* on both majors); `--incompatible_fix_package_group_reporoot_syntax`
    **true** on both; `--incompatible_package_group_has_public_syntax` **true**
    on both; `--check_bzl_visibility` **true** on both; and
    `--incompatible_no_implicit_file_export` **false** on both — see decision 14.
    Ruleset floors: `gazelle_rust` 0.1.0 needs `rules_rust >= 0.40.0` (fleet is
    at 0.74.0, cleared) and declares `bazel_compatibility >= 7.0.0`;
    `gazelle_cc` 0.1.0 needs `gazelle >= 0.42.0` and `rules_cc >= 0.1.1`;
    `aspect_gazelle_prebuilt` 0.0.25 declares `>= 7.6.0`. Everything else here
    holds unchanged across 7, 8 and 9.
14. **Measured contradiction — `--incompatible_no_implicit_file_export` is
    `false`, not `true`, and BZL-ARCH-09 overclaimed on it.** The dive read the
    live CLI reference and recorded the default as `true`, and the rule shipped
    a rationale saying a file mentioned only in a rule's `srcs=` is already
    package-private. Read from the binaries: **`default: "false"` on both 8.7.0
    and 9.2.0**. A two-package probe run here confirms the behaviour, not just
    the help text — a `genrule` in `//pkg_b` consuming `//pkg_a:f.txt`, which
    `//pkg_a` never exports, builds clean on both majors, and fails on both the
    moment the flag is passed, with `Visibility error: target '//pkg_a:f.txt'
    is not visible from … To set the visibility of that source file target, use
    the exports_files() function`. The rule stands — Bazel's own visibility page
    is imperative ("Always write an `exports_files` declaration whenever a
    source file target needs non-private visibility") and the flip is a
    one-line change away — but its failure is **latent, not live**, and its
    verification is now a runnable canary rather than a claim about today's
    default. This is the most dangerous shape of error this family had: a rule
    that told an agent a guarantee was already in force.
15. **Aspects, not macros, carry a cross-cutting concern — and the arithmetic
    is definitional, not measured.** A macro that instantiates *N* rules adds
    exactly *N* labels per wrapped target, and any `_test` among them joins
    `bazel test //...`'s closure and is billed on every run whether or not
    anyone wanted the lint result; an aspect adds none. `rules_lint`'s own
    stated design reason is this exact trade-off, in its own words
    (`bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md` §1).
    A third path exists and is worth naming: Go's `nogo` runs inside the
    existing `GoCompilePkg` action — zero targets *and* no `--aspects`
    invocation — but it is available only to whoever authors the compile
    action, never to a downstream consumer of someone else's ruleset.
    BZL-ARCH-30, SHOULD; settles M-G-13.
16. **Protobuf: one `proto_library`, N language attachments — and no source
    anywhere recommends the alternative.** Four rulesets' own source converges:
    C++ through a forwarding macro, Python through protobuf's *own*
    `py_proto_library` aspect (not `rules_python`'s), Rust through
    `rust_prost_library`'s single mandatory `proto=` attribute
    (`attr.label(providers=[ProtoInfo], aspects=[rust_prost_aspect])`), and the
    experimental JS path through a plain `deps=` reference with no wrapper rule
    at all. Because no source states the prohibition outright, this ships SHOULD,
    not MUST. One conflation to block: `rules_buf`'s `buf` Gazelle language
    (`v0.5.4`, pre-1.0) generates `buf_lint_test`/`buf_breaking_test`/
    `buf_dependencies` and **never** `proto_library` — that stays bazel-gazelle
    core's job. BZL-ARCH-31; settles M-G-12.
17. **Execution groups earn their place only across two execution platforms,
    and the reviewer check is a live upstream defect, not a style preference.**
    The docs' one motivating case is genuine cross-compilation (compile on a
    remote worker, link locally); each declared group is its own
    toolchain-resolution unit at analysis time, a cost no source quantifies, so
    the threshold row is CONSIDER. The scoping row is stronger: two `py_test`s
    over one `.py` file, one carrying a bare `exec_properties` key and one not,
    produce the identically-named precompiled output under two differing action
    configurations and the build fails with an action conflict —
    rules_python#2445, open since 2024-11-26, widened by its maintainer
    2025-09-17, with the group-scoped key (`py_precompile.foo`, not `foo`) as
    the documented workaround and no fix landed. BZL-ARCH-32 and -33; settles
    M-G-11.
18. **Documented gap: there is no adoption threshold, at any scale, in any
    source.** The wave-4a adoption follow-up verified the corpus end to end and
    found zero numeric go/no-go cutoffs — not repo count, not language count,
    not target count, not CI-minutes. What *is* sourced: 31.23 percent of
    Bazel projects that configure a CI service never invoke Bazel in it
    (arXiv:2405.00796, denominator verified as the CI-adopting subset); 1.5
    percent of ~35,000 surveyed GitHub projects ever adopted Bazel and 11
    percent of *those* churned around year two (BazelCon 2024 talk, no paper
    located); RabbitMQ's removal was explicit and non-defect. Aspect's only
    scale anchor argues the opposite direction — a 2M-SLOC / 500-engineer
    customer runs whole-repo shared-green with no predictive tooling. For the
    narrower *target-selection* question, [BZL-CI-01](bazel-ci-and-target-selection.md)
    has since named ~40 minutes median whole-repo CI wall-clock as the lead
    signal and ~300 rule targets as the tripwire; cite that row, do not restate
    its derivation here. `bazel-adopt`'s opening gate is therefore a checklist
    of sourced yes/no questions, never a threshold table — which is where the
    frame already routes it. M-G-22 and M-G-23 stay deliberately not rules.
19. **Documented gap resolved into a precondition: the coupling query exists;
    the fleet has nothing to point it at.** `bazel mod graph --extension_info`,
    `bazel mod show_repo` and `bazel mod explain` are confirmed present with
    identical descriptions on the 8.7.0 and 9.1.0 versioned command pages (no
    9.2.0 snapshot exists — Bazel archives docs per LTS minor). The blocker for
    the `ocx` → `grimoire` → `ocx-mirror` lineage is not a missing query: none
    of the three, nor either vendored fork, is a Bzlmod module, so there is no
    graph to query. That is BZL-ARCH-28's own stated precondition, now sharpened
    into its verification. M-G-21 closes here.
20. **M-G-24 stays with `BZL-MOD`, confirmed.** The frame's wave-2 correction 10
    settles it: `MODULE.bazel.lock`-as-an-editable-file is lockfile mechanics,
    not architecture. The measurement adds the fact that makes the split
    obviously right — `lockFileVersion` is **24** on 8.7.0 and **28** on both
    8.8.0 and 9.2.0, with a new `factsVersions` key, so the schema boundary is
    crossed by a Maintenance-release bump, not only by a major. BZL-ARCH-24
    covers the *language* lockfiles only and deliberately does not extend to
    `MODULE.bazel.lock`.

## The ruleset

**This topic owns `BZL-ARCH` exclusively.** Thirty-five rules. Rows are ordered
so that one invocation covers a run of them: **01–02** both fire the moment a
BUILD file is added or moved; **04–10** are one reading pass over a package's
`BUILD` file plus two greps; **11–15** are the generator decision and its
checks; **16–23** are the platforms/transition family, of which 16–18 share a
single `grep` over `BUILD*` and `*.bzl`; **24–29** are migration state;
**30–33** are design-time reading with no shared command; **34–35** are
version-gated traps that fire loudly at load or analysis time.

Rules marked **pinned** record a project decision rather than a derived fact.
Rules resting only on argued or asserted sources are CONSIDER, never MUST.
Shapes are the map's A–F. Where a rule says "F", the fleet has no instance today
and the grounding is upstream-only, by the map's own Shape-F framing.
**Every grep-based verification below has one shared blind spot: BUILD or `.bzl`
content generated as a Starlark string into another repository is invisible to
it** (`bazel-audit/starlark-code-shape.md:274`; frame wave-2 correction 9). Only
an integration test that actually builds from the generated repo sees that text.

| ID | Rule | Rationale (the failure) | Verification — and how EMPTY reads | Sev | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-ARCH-01 | Give every directory that contains buildable source files its own `BUILD`/`BUILD.bazel`, and never list a bare relative path into a subdirectory in `srcs`/`hdrs`/`data`. | The day a `BUILD` file appears in that subdirectory, every such reference breaks and every reverse dependency must be updated; scope creep and inadvertent cycles accumulate until then. | Reading heuristic over `BUILD*`: any `srcs`/`hdrs`/`data` entry containing `/` that does **not** start with `:` or `//` is a bare path into a subpackage-to-be. Seed grep: `grep -rnE '(srcs\|hdrs\|data) *= *\[' --include='BUILD*' .` then read each list. **Empty (no bare paths) = pass; any hit = finding.** | SHOULD | Bazel 7/8/9; core Starlark; F | M-G-01 |
| BZL-ARCH-02 | Re-run `bazel query` over every globbed target under a directory before and after adding a `BUILD` file anywhere beneath it. | `glob()` never matches into a subpackage and the shrink is **silent** — no error, the files just stop being included; the call site alone cannot show it. | `bazel query 'kind("source file", //path/to/globbed/pkg:*)'` before and after, then `diff`. **Empty diff = pass; any removed entry = finding.** | SHOULD | Bazel 7/8/9; core Starlark; F | M-G-01 |
| BZL-ARCH-03 | Decide, in writing, between one root `BUILD` file and a per-package output restructure *before* drawing package boundaries in any repo whose tooling writes to a shared top-level output directory; when the legacy build must keep working, redirect stale config references (e.g. `tsconfig.json` `paths`) with a generated copy, never an in-place edit. | Bazel requires a package's outputs to live under that package's own output directory. A shared `dist/` above several intended `BUILD` boundaries has exactly two resolutions and no third; finding this out mid-migration means redrawing boundaries twice. | `find . -maxdepth 2 -type d \( -name dist -o -name build -o -name out \)`. **Empty = pass, no decision forced; any hit above an intended per-package `BUILD` location = the decision is now owed in writing.** | MUST (decide, not defer) | All Bazel majors; documented via rules_js, constraint is Bazel's own output tree; E, F | M-G-18 |
| BZL-ARCH-04 | Never set `default_visibility = ["//visibility:public"]` at package level, except in a package that *is* the module's public API surface — and write the reason at that site. | Bazel's own docs name it an anti-pattern; **no buildifier warning checks it** (full `WARNINGS.md` read: zero occurrences of `default_visibility`), so accidental public surface grows silently with the codebase. | `grep -rn 'default_visibility.*//visibility:public' --include='BUILD*' .`. **Empty = pass; every hit needs an adjacent comment stating why it is intentional.** Two caveats the rule must carry: a value assembled through a Starlark variable or a macro parameter is not a literal and will not be caught, and BUILD text generated as a string into another repo is out of this grep's reach entirely. | MUST | Bazel 7/8/9; core; A, F | M-G-03 |
| BZL-ARCH-05 | Grant cross-project visibility with `//other/pkg:__subpackages__`, not `//other/pkg:__pkg__`. | `__pkg__` needs a new visibility entry every time the granted project adds a subpackage — documented churn, and the churn lands on the *granting* team. | Reading heuristic: a `visibility` entry of the form `"//<not-my-tree>:__pkg__"` is the candidate. No mechanical grep distinguishes "another team's tree"; a reviewer decides. | SHOULD | Bazel 7/8/9; core; F | M-G-03 |
| BZL-ARCH-06 | Replace a `visibility = [...]` list with a `package_group` as soon as the same list appears on a second target. | Copy-pasted allowlists skew; `package_group(name, packages, includes)` is the documented reusable mechanism and is itself always publicly visible. | Compare `grep -rc 'visibility = \[' --include='BUILD*' .` against `grep -rc 'package_group(' --include='BUILD*' .`, then `sort`/`uniq -d` the extracted lists. **No duplicate list = pass; three or more identical lists with zero `package_group` = finding.** | SHOULD | Bazel 7/8/9; core; F | M-G-04 |
| BZL-ARCH-07 | Never assume a negated `packages` spec in one `package_group` filters a group it `includes`. | Each group's set is computed **independently** and the results are then unioned — so `A` excluding `//foo/tests/...` does not remove them when `A` includes a `B` that grants them. Reads backwards on a skim; there is no query for the resulting semantic error. | Reading heuristic: any `package_group` carrying both a `-`-prefixed `packages` entry and a non-empty `includes` needs a comment stating the negation binds only its own `packages` list, or a hand-traced union. **No such group = pass.** | CONSIDER | Bazel 7/8/9 (`--incompatible_fix_package_group_reporoot_syntax` and `--incompatible_package_group_has_public_syntax` both measured `true` on 8.7.0 and 9.2.0, so `//...` = this repo only and `"public"` must be spelled out); core; F | M-G-04 |
| BZL-ARCH-08 | Declare `visibility(...)` explicitly in every `.bzl` file — non-public for anything under a `private/` or `internal/` directory — and never treat a BUILD target's visibility as covering it. | Load visibility defaults to **public**: a `.bzl` file with no `visibility()` call is `load()`-able from anywhere, regardless of how narrow its `bzl_library` target is. The two mechanisms gate different edges. | `grep -L '^visibility(' path/to/private/*.bzl`. **Empty = pass (every file gated); any filename listed = finding.** On a PR: `git diff --diff-filter=A -- '*.bzl'` and check each new file's first ten lines. `--check_bzl_visibility` is measured `true` on 8.7.0 and 9.2.0, so a violation is an error, not a warning. | MUST for a `private/`/`internal/` tree; SHOULD elsewhere | Bazel 6.0+ (feature), 8/9 (era); core; A, F | M-G-06 |
| BZL-ARCH-09 | Write an `exports_files()` declaration for every source file consumed from outside its own package; never rely on implicit export. | Bazel's own visibility page is imperative: "Always write an `exports_files` declaration whenever a source file target needs non-private visibility." **Corrected 2026-09-06 — the failure is latent, not live.** `--incompatible_no_implicit_file_export` reads `default: "false"` on both 8.7.0 and 9.2.0 (`bazel help build --long` on each binary), so implicit export still works today; the earlier "defaults true" rationale was a doc-page misread. The failure is that the whole tree is coupled to a legacy default one `.bazelrc` line — or one future major — away from flipping, at which point every such reference fails at analysis time at once. | Runnable canary, which is also how you make the latent failure fire on demand: `bazel build --incompatible_no_implicit_file_export //...`. **Clean build with the flag on = pass; a `Visibility error: target '//pkg:f.txt' is not visible from …` naming a *source-file* label = finding** — the error text itself names `exports_files()` as the fix (measured verbatim on 8.7.0 and 9.2.0). Static proxy: for each package whose files are referenced cross-package by label, `grep -L 'exports_files' <pkg>/BUILD*`; **empty = pass**, but no single grep suffices (the consumer side must be cross-referenced) and generated-repo BUILD text is out of its reach. | MUST | Bazel 8/9 (flag present and `false` on both 8.7.0 and 9.2.0); core; F | M-G-03 (extension) |
| BZL-ARCH-10 | State a `config_setting`'s `visibility` explicitly whenever it is meant to be package-scoped. | `--incompatible_enforce_config_setting_visibility` is **true** but `--incompatible_config_setting_private_default_visibility` is still **false** — both measured on 8.7.0 and 9.2.0 — so an unspecified-visibility `config_setting` is `//visibility:public` today *even under a narrow package `default_visibility`*. "Visibility is now enforced" reads exactly backwards here. | `grep -rn -A3 'config_setting(' --include='BUILD*' .` and check each declaration for an explicit `visibility =`. **Every declaration carrying one = pass; a missing one under a narrow-`default_visibility` package = finding.** | SHOULD | Bazel 8/9; core; F | M-G-03 (exception case) |
| BZL-ARCH-11 | Go fine-grained (roughly one target per module) only for a language whose Gazelle-family generator is production-grade — Go, protobuf, and Python paired with a pytest wrapper; keep BUILD files coarse and hand-maintained at directory level for JS/TS (usable with care) and Rust (experimental). Quote the maturity of the module you actually depend on, not its most-mature sibling. **pinned** | Fine-grained targets are only sustainable with generation, and maturity is uneven: `gazelle_rust` is one maintainer at one tag (`v0.1.0`), and Aspect's `aspect_gazelle_js` language is BCR `1.2.1` while `aspect_gazelle_prebuilt` — the distribution its own README recommends — is still `0.0.25`. Hand-fine-graining without a generator buys the maintenance cost and none of the tooling; adopting on the sibling's version number buys a semver promise nobody made. | Decision procedure: (1) `curl https://bcr.bazel.build/modules/<module>/metadata.json` for the module you will actually depend on — a version number recalled from memory is the failure here; (2) name the plugin's own default generation mode from its own directive docs (Go and Python default to package-level, `gazelle_rust` defaults to **one target per file** — parity is not the default); (3) wire the `gazelle_test` gate yourself (BZL-ARCH-12) and confirm it passes. **All three answered → fine-grained is supported. A pre-1.0 module, or no plugin from a maintained org → coarse is correct; do not fine-grain by hand.** The gate's absence is never evidence about the plugin — no ecosystem ships it. | MUST as the procedure; the per-language call is SHOULD | Bazel 8/9; bazel-gazelle core 0.54.0 (baseline), `rules_python` 2.3.3 first-party plugin, `aspect_gazelle_js` 1.2.1 / `aspect_gazelle_prebuilt` 0.0.25, `gazelle_rust` 0.1.0 + `rules_rust` ≥0.40.0, `gazelle_cc` 0.1.0 + `gazelle` ≥0.42.0 / `rules_cc` ≥0.1.1; F | M-G-02, M-G-05 |
| BZL-ARCH-12 | Verify generated BUILD files with the `gazelle_test` rule from `@gazelle//:def.bzl`, hand-wired — not with a bare `gazelle -mode=diff` shell invocation, and not by assuming the plugin supplied a gate. | The CLI mode is undocumented at the invocation level and runs outside Bazel; `gazelle_test`'s own `mode` attribute defaults to `"diff"`, so the check is hermetic and part of `bazel test //...`. **No Gazelle ecosystem wires it by default** — bazel-gazelle's own root `BUILD.bazel`, rules_python 2.3.3's install doc, `gazelle_rust`'s example and Aspect's `aspect_gazelle()` macro all ship only the `gazelle()`/`sh_binary` half. Aspect's `with_check = True` is the false friend: its `<name>.check` target is an `sh_binary`, so `bazel test //...` never runs it and no test-result aggregation sees it. | `bazel test //:gazelle_test`. **Passing (empty diff) = generation is in sync; non-zero exit with a printed diff = finding.** Confirm the target is a test at all: `bazel query 'kind("sh_test", //:gazelle*)'` — **empty output on a repo that believes it has a freshness gate is itself the finding.** For Python, a second, distinct target covers manifest freshness (`//:gazelle_python_manifest.test`); conflating the two is a finding. | MUST wherever a generator is adopted | Bazel 8/9; `bazel-gazelle` 0.54.0 (any version shipping `def.bzl`'s `gazelle_test`); F | M-G-05 |
| BZL-ARCH-13 | Review the regenerated BUILD diff by hand on every version bump of a pre-1.0 third-party Gazelle plugin; never auto-merge it. | `gazelle_rust`, `gazelle_cc` and `aspect_gazelle_prebuilt` are all pre-1.0 — semver promises nothing there, and none is first-party to the ruleset it generates for. `gazelle_rust` is additionally a single-maintainer project whose roadmap is a personal backlog issue the maintainer describes as "non-exhaustive, and I may change it", with main-branch activity continuing months past its only tag. | The `MODULE.bazel` diff bumping the plugin and the regenerated-BUILD diff must land in the **same** PR and be reviewed as code. **Bump-only PR with no BUILD diff, or a squashed regeneration = finding.** | SHOULD | Bazel 8/9; `gazelle_rust` 0.1.0, `gazelle_cc` 0.1.0, `aspect_gazelle_prebuilt` 0.0.25; F | M-G-05, M-G-06 |
| BZL-ARCH-14 | Report a rule-count-to-source-file ratio as a discussion input only; never gate CI or a review on it, and never compare the ratio across languages. | No Bazel or Gazelle document publishes a numeric target — this is a constructed heuristic, and the house standard caps argued-only evidence at CONSIDER. Cross-language comparison is worse than useless: the plugins' own default generation modes differ (`gazelle_rust` one-target-per-file, Go and `rules_python` package-level), so the same source tree yields ratios an order of magnitude apart depending only on which plugin ran. | `bazel query 'kind(rule, //...)' \| wc -l` against `git ls-files -- '*.<ext>' \| wc -l`, **per language, with the generation mode named beside the number**. **No pass/fail: report the ratio.** A ratio far below 1 is the expected, acceptable shape wherever no maintained generator exists. | CONSIDER | Bazel 7/8/9; F | M-G-02 |
| BZL-ARCH-15 | Never attribute the phrase "1:1:1" to Bazel in generated guidance, review comments or shipped rule text. | "1:1:1" is Pants' own coined idiom, confirmed in Pants' own words; neither `configure/best-practices` nor `concepts/build-files` contains the string. Bazel converges on the same practice without ever naming it that way, so the citation is a checkable misattribution. | `grep -n '1:1:1' <artifact>`. **Empty = pass. Any hit must name Pants in the same sentence, or be removed.** | MUST (artifact-correctness bar) | All majors; any shipped guidance; all shapes | M-G-02 |
| BZL-ARCH-16 | Key every `config_setting` on `constraint_values` once any rule in the graph resolves toolchains through `--platforms`; never leave it on `values = {"cpu": …}` alone. | `select()`s on `--cpu`/`--crosstool_top` "don't understand `--platforms`" — they silently stop tracking reality once toolchain resolution flips, which for C++ and Android is the default since Bazel 7.0. | `grep -rln 'values = {' --include='BUILD*' --include='*.bzl' . \| xargs grep -Ln 'constraint_values'` restricted to files declaring `config_setting`. **Empty = pass; any file listed has a legacy-only `config_setting`.** Runtime signal on 9.2.0 only (measured): building a target whose `select()` reads such a setting prints `WARNING: … select() on cpu is deprecated. Use platform constraints instead` — 8.7.0 prints nothing, so a repo pinned there gets no warning and the grep is the whole check. Generated-repo BUILD text is out of the grep's reach. | MUST | Bazel 7+; all rulesets; F | M-G-07 |
| BZL-ARCH-17 | Never let a Starlark transition write a legacy flag key (`//command_line_option:cpu`, `:crosstool_top`, `:compiler`) in a repo where any consuming rule reads `--platforms`. | The transitioned value becomes invisible downstream — no error, just a rule that never sees it. Bazel's own migration page names this the "biggest challenge" of a platforms migration for exactly this reason. | `grep -rn '"//command_line_option:\(cpu\|crosstool_top\|compiler\)"' --include='*.bzl' .`. **Empty = pass.** | MUST once toolchain resolution is platform-based; SHOULD (tech debt) during a `platform_mappings` bridge | Bazel 7+; F | M-G-07, M-G-09 |
| BZL-ARCH-18 | Treat a `platform_mappings` file as a dated bridge with an owner and an end, not as the mechanism. | The docs call it "a temporary API… a blunt tool… expect to eventually eliminate it" in its own defining paragraph. A calcified mapping keeps a repo permanently half-migrated. | `test -f platform_mappings && git log -1 --format=%ad -- platform_mappings`. **No file = pass; a file untouched for over a year = finding (it has calcified, not bridged).** | SHOULD | Bazel 6+; F | M-G-07 |
| BZL-ARCH-19 | Measure configured-target duplication with `cquery` before adding or debugging any custom transition. | A per-edge transition that never resets configuration produces `2^n` configured targets down a depth-`n` tree — the canonical docs show it and then leave their own mitigation section as a literal TODO. | `bazel cquery 'deps(//path/to:target)' 2>/dev/null \| awk '{print $1}' \| sort \| uniq -c \| sort -rn`. **Every label at count 1 = pass; any label with count > 1 is built under more than one configuration = finding.** Follow up with `bazel config <hash>` and `--transitions=full`. Named assumption: this measures *configured-target* duplication, not action duplication — confirm with `aquery` on the flagged label before calling it wasted work. | MUST wherever a non-native transition exists | All Bazel majors (`cquery`'s `label (confighash)` output predates Bzlmod); F | M-G-09, M-G-10 |
| BZL-ARCH-20 | Never derive an action count from `aquery` output by counting lines or deduplicating on output path. | `aquery` documents that two actions whose outputs share an identical `execPath` under different configurations still render as **separate** entries, and that its output order is unspecified. A naive line count silently under- or over-counts. | Negative check: no script in the repo parses `aquery --output=text` positionally or counts its lines as a proxy for unique actions. **Absence of such a script = pass; one that does = finding.** | MUST for any tooling built on `aquery` | All Bazel majors; F | M-G-10 |
| BZL-ARCH-21 | Before shipping an outgoing reset transition as the fix for duplicate builds, trace every target downstream of the reset point for a reader of the value being reset. | A reset transition silently hands the **wrong** value to anything genuinely downstream — no error, no warning, a successful build with wrong output. The lucidsoftware demo reproduces exactly this. | For each target reachable through the reset boundary, look for a `select()`/`config_setting` reading the same setting. **No downstream reader = pass; one found = the reset is not the fix.** | MUST (review gate) | All Bazel majors; F | M-G-09 |
| BZL-ARCH-22 | Do not adopt `--experimental_output_paths=strip` as a production default, and never carry its value across a major upgrade unread. | Default `off` and labelled "highly experimental" on **both** 8.7.0 and 9.2.0 (read from each binary), two LTS majors after Bazel 7.4.0 shipped the action-dedup behaviour it depends on. Its accepted value set is not stable either: 8.7.0 takes `off, content or strip`; 9.2.0 takes `off or strip` — an rc file carrying `content` is a clean build on the old pin and a flag-parse failure on the new one. | `grep -rn 'experimental_output_paths' .bazelrc*`. **Empty = pass; presence outside an explicitly labelled experiment or CI canary leg = finding; the literal value `content` on a 9.x leg = finding regardless.** | CONSIDER (track for graduation) | Bazel 7.4.0+; value set differs 8 vs 9; F | M-G-09, M-G-10 |
| BZL-ARCH-23 | When several `config_setting`s in a package vary along an axis `@platforms` (or an already-declared `constraint_setting`) covers, reference the existing `constraint_value`s instead of adding another raw-flag `config_setting`; if the axis is genuinely new, declare the `constraint_setting` once. | This is sprawl standing in for a constraint that already exists or should be declared once. No primary source publishes a count threshold, so this is argued, not measured. | Reading heuristic: `grep -rn 'config_setting' --include='BUILD*' .` per package, then ask by hand whether the same os/cpu/toolchain axis recurs. **No pass/fail count exists — a reviewer decides.** | CONSIDER | Bazel 7/8/9; F | M-G-08 |
| BZL-ARCH-24 | Keep the language's own manifest (`Cargo.toml`, `pyproject.toml` + lockfile, `package.json` + lockfile) as the sole hand-edited source of dependency truth, and regenerate the Bazel-side lockfile (`cargo-bazel-lock.json`, `requirements_lock.txt`, an `npm_translate_lock` ingestion) from it — never hand-edit it to fix a drift. | Two independent declarations is the failure. The IDE's own language server reads the manifest, not the Bazel graph, and `crate_universe` ignores path dependencies regardless — so a hand-edit on the Bazel side reintroduces the second source of truth invisibly. | (a) `git log --name-only <manifest>`: a manifest change should carry the Bazel-side lockfile in the **same** commit (`CARGO_BAZEL_REPIN=1` run before commit). (b) `git log -p --follow <bazel-side-lockfile>`: a commit touching only it, with no manifest change and no repin marker in the message, is the smell. **No manifest-only and no lockfile-only commits = pass.** Scope: language lockfiles only — `MODULE.bazel.lock` is BZL-MOD's (M-G-24). | MUST | All languages, all Bazel majors; B, C, D, E, F | M-G-14 |
| BZL-ARCH-25 | Run both the legacy build and Bazel on the same code path, on the same trigger, as required checks, for the whole duration of a migration. | With two systems claiming to build the same code, only a shared gate catches the day one stops representing what ships. **No primary source names this pattern** — it is inferred from the source-of-truth decision, so it ships as CONSIDER, not MUST. | `grep -l 'bazel ' .github/workflows/*.yml` and `grep -l '<legacy tool>' .github/workflows/*.yml` both non-empty, on the same trigger, both required. **Either empty, or either not a required check = finding — unless the legacy job has been retired on purpose.** | CONSIDER | All Bazel majors; C, F | M-G-15 |
| BZL-ARCH-26 | List in `.bazelignore` every directory a legacy build system, a parallel checkout or a worktree owns; never assume `.gitignore` covers it. | Bazel does not read `.gitignore` — the word does not appear in `.bazelignore`'s own definition. The failure is `bazel test //...` glob-expanding into a directory nobody meant it to see, and it has happened in this fleet. | For every top-level directory `.gitignore` excludes that contains buildable files or is a parallel checkout location, confirm it also appears in `.bazelignore`. **Both lists agreeing = pass; a directory in one and not the other = finding.** | MUST | All Bazel majors; A, F | M-G-16, M-G-17 |
| BZL-ARCH-27 | On Bazel 8+, move any `.bazelignore` entry that is standing in for a wildcard into `REPO.bazel`'s `ignore_directories()`. | `.bazelignore` "does not permit glob semantics" by its own definition; `ignore_directories()` was added in 8.0.0 explicitly "to provide a migration path off of that weird single-purpose configuration file". | Read `.bazelignore` for near-duplicate lines or a comment of the "and every directory like this" shape. **No such entries = pass, no migration needed.** Check `.bazelversion` first — the directive does not exist on 7.x. | SHOULD | Bazel **8.0.0+ only**; A, F | M-G-16 |
| BZL-ARCH-28 | Treat a git submodule that is also a build dependency as an open Bzlmod question, not a settled pattern — and check the fork's own remote for a `MODULE.bazel` before proposing `git_override` at all. | Bzlmod has **no submodule-equivalent primitive**. The nearest analogue, `git_override`, requires the vendored fork to itself declare a `MODULE.bazel` — which a vendored fork generally does not. Until it does, the whole lineage is invisible to `bazel mod`: the query is not the blocker, the missing module is. | `git config -f .gitmodules --get-regexp path`, then check each path against the `Cargo.toml`/`package.json`/`pyproject.toml` dependency graph. For each hit that is a real build dependency, probe the **fork's own remote** — `git ls-remote <remote>` plus a raw fetch of `MODULE.bazel` at its default branch. **No submodule that is also a build dependency = pass; one whose fork has no `MODULE.bazel` = `git_override` is not an option yet, only future work on the fork.** Once modules exist, `bazel mod graph --extension_info`, `bazel mod explain <repo>` and `bazel mod show_repo <repo>` make the lineage visible — all three confirmed present with identical descriptions on the 8.7.0 and 9.1.0 versioned command pages (no 9.2.0 snapshot exists). **Empty `bazel mod` output on a repo with no `MODULE.bazel` means the query is aspirational, never that the coupling is absent.** | CONSIDER | Bzlmod era (Bazel 7+; WORKSPACE deleted in 9); B, F | M-G-20, M-G-21 |
| BZL-ARCH-29 | Name the generator for every checked-in generated file and back it with a `diff_test` (or `write_source_files`) regeneration gate before treating it as source. | A generator that silently diverges from its checked-in output is a correctness bug wearing the costume of a source-of-truth question — and the divergence is invisible until someone regenerates. | `grep -L 'diff_test\|write_source_files' <pkg>/BUILD*` for every package containing a `gen/`-shaped directory. **Empty = pass; any package listed has generated content with no gate.** Then confirm the gate's CI reach — **with the [BZL-HERM-22](bazel-hermeticity-determinism.md) carve-out: where the generated file's shape is Bazel-major-dependent, one authoritative leg plus a comment naming the major adjacent to the excluding condition is the correct shape, and "every leg" is wrong.** A gate excluded from some legs with no such comment is the finding; a gate on one leg *with* the comment is a pass. | SHOULD | All Bazel majors; C, F | M-G-19 |
| BZL-ARCH-30 | Carry a cross-cutting check (lint, format, docs freshness, codegen consistency) with an `aspect`, not with a BUILD-file wrapper macro. Reserve a macro for a check that must be addressable by its own label — something another rule `deps=` on, or a result a CI system gates on by test-target name. | Measured on a live graph on 8.7.0 and 9.2.0, not merely definitional: a legacy macro emitting three rules per call (the wrapped `filegroup` plus an `sh_test` and a `genrule`) adds **two net-new query-visible labels per call** — *N* rules per call minus the wrapped target itself, which already existed — and its `_test` joins `bazel test //...`'s closure, so a five-package macro tree runs five tests on every invocation while the identical aspect-only tree has no test closure at all. An **aspect adds zero** labels under any invocation: it is requested with `--aspects=<label>%<name>`, read back through `--output_groups`, and its reports land in `bazel-bin` with the label list byte-identical to the no-aspect run (`bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md` Q1). `rules_lint`'s own stated design reason is exactly this ("you don't need to add lint wrapper macros, and lint doesn't appear in `bazel query` output"). One Bazel-9 migration cost only the macro path pays, reproduced live: a legacy macro calling a bare `native.sh_test(...)` — or any other autoloaded native rule — dies with `Error: no native function or rule 'sh_test'` until an explicit `bazel_dep` plus `load("@rules_shell//shell:sh_test.bzl", "sh_test")` is added; an aspect touches no native rule symbol and never pays it. Autoload is [BZL-LARK-10](bazel-starlark-and-build.md)'s and [BZL-FLAG-16](bazel-flags-and-versions.md)'s row — cite, do not restate. | Two diffs, and the aspect side must use `cquery`. Macro side: `diff <(bazel query '//...' --output=label) <(bazel query '//...' --output=label)` over the tree before and after the check is wired. **Empty diff = pass; a non-empty diff = the macro changed the graph, and its added-line count is the rules-per-call minus one, per call** (10 added lines for five three-rule calls, measured) — a finding unless the label is genuinely needed. Aspect side: `diff <(bazel cquery '//...' --output=label) <(bazel cquery '//...' --output=label --aspects='<label>%<aspect>' --output_groups=<group>)`. **Empty diff = pass (it really is an aspect).** Plain `query` rejects `--aspects` outright (`Unrecognized option`, both majors), so a reader who reaches for it gets an error, not a false empty. Third and cheapest check, the test-closure one: `diff` of `bazel query 'tests(//...)'` before and after. **Empty diff = pass, the check added nothing that `bazel test //...` will bill**; one new test target per wrapped target is the macro's per-run bill. On a tree whose only would-be tests are the check itself the signal is blunter and needs no diff — `bazel test //...` exits **4** with `No test targets were found, yet testing was requested` (measured), and that exit 4 is the pass. Named third option, available only to whoever authors the compile action: fold the check into it (rules_go's `nogo` runs inside `GoCompilePkg` — zero targets and no `--aspects`). A downstream consumer of someone else's ruleset cannot reach that path. | SHOULD | All Bazel majors; arithmetic measured live on 8.7.0 and 9.2.0; core; `rules_lint` as the worked example; A, F | M-G-13 |
| BZL-ARCH-31 | Declare one `proto_library` per `.proto` set and attach each consuming language through its own wrapper or aspect; never duplicate the `proto_library` per language. | Four rulesets' own source converges on one `proto_library` plus N attachments — a forwarding macro for `cc_proto_library`, protobuf's *own* `py_proto_library` aspect (not `rules_python`'s), `rust_prost_library`'s single mandatory `proto=` attribute, and a plain `deps=` reference for the experimental JS path — and none documents a per-language duplicate. Two descriptor sets for one schema drift silently until a wire-format mismatch. No source states the prohibition outright, which caps this at SHOULD. | `bazel query 'kind(proto_library, //...)'`, then check no two targets name the same `.proto` in `srcs`. **One `proto_library` per `.proto` set = pass; two naming the same source = finding.** Do not expect `rules_buf`'s `buf` Gazelle language to produce them — it emits `buf_lint_test`/`buf_breaking_test`/`buf_dependencies` only, and `proto_library` generation stays bazel-gazelle core's `proto` language. The Bazel-9 explicit-`load()` requirement is [BZL-LARK](bazel-starlark-and-build.md)'s autoload row, and `ts_proto_library`'s deprecation is [BZL-JS](bazel-typescript.md)'s — cite, do not restate. | SHOULD | Bazel 8/9; protobuf ≥33.4 (Bazel 9's enforced module-graph minimum), rules_rust 0.74.0, bazel-gazelle 0.54.0, rules_buf 0.5.4; F | M-G-12 |
| BZL-ARCH-32 | Declare an `exec_group` only when a single target's actions genuinely need two different execution platforms; never as a general property-scoping device. | Each declared group is its own toolchain-resolution unit at analysis time. No source publishes that cost as a number, so this stays CONSIDER. The docs' one motivating case is genuine cross-compilation — compile on a remote Linux worker, link locally on macOS — expressed as a group with its own `exec_compatible_with`. | `grep -rn 'exec_group(' --include='*.bzl' .`, then read each declaration. **No declarations = pass; a group whose `exec_compatible_with` is absent, or identical to the rule's own execution platform, is a finding — it is scoping dressed as platform separation.** Bazel 9's implicit `test` exec group is not a declaration and not this rule's business; it belongs to [BZL-TEST](bazel-testing.md). | CONSIDER | Bazel 8/9; core; F | M-G-11 |
| BZL-ARCH-33 | Scope every `exec_properties` key to its owning execution group (`<group>.<key>`) wherever two targets in one package can share a source file; never set a bare key on one of a pair and not the other. | A bare key applies to **every** exec group on the target, including an implicit one both targets share. Two `py_test`s over one `.py` file — one with `exec_properties = {"foo": "bar"}`, one with the rule's defaults — generate the identically-named precompiled output under two differing action configurations, and Bazel refuses the build with an action conflict. rules_python#2445, filed 2024-11-26, still open, widened by its own maintainer on 2025-09-17; the maintainer's documented workaround is exactly this scoping (`py_precompile.foo`, not `foo`), and the rule cannot fix it for you because a target-level `exec_properties` deliberately outranks anything the rule sets. | For each file named in more than one target's `srcs` in a package — `bazel query 'same_pkg_direct_rdeps(<file label>)'` — compare those targets' `exec_properties`. **Identical, or absent from all of them = pass; a bare key present on one and not another = finding.** No grep resolves the pairing; the query plus a reviewer decides. | SHOULD | All Bazel majors; rules_python 2.3.3 as the reproduced instance, mechanism is core; F | M-G-11 |
| BZL-ARCH-34 | Never write `package(transitive_visibility = …)` on a pin below Bazel 9, and where it is available pass it a **single `package_group` label as a string** — not a list, and not `//visibility:public`. | Measured on the binaries, not read off a page: 8.7.0 and 8.8.0 fail with `Error in package: unexpected keyword argument: transitive_visibility`; **9.0.0, 9.1.0 and 9.2.0** accept the parameter and type-check it as a `string`, so the list form every doc example suggests fails with `expected value of type 'string' for package() argument 'transitive_visibility', but got [...] (list)`. Both failures are loud and at load time — the real cost is an agent that read only the rolling docs page emitting the list form on every major and burning a build cycle per attempt. | `grep -rn 'transitive_visibility' --include='BUILD*' .` cross-read against `.bazelversion`. **Empty = pass.** Any hit on a pin below 9 is a hard package-load error; any hit passing a list is a hard type error. To settle availability on an unfamiliar pin there is **no `bazel help package` subcommand** (measured absent on all five binaries tested — 8.7.0, 8.8.0, 9.0.0, 9.1.0, 9.2.0) — write the two-line probe (`package(transitive_visibility = ":g")` plus a `package_group(name = "g", …)`) into a throwaway package and run `bazel build --nobuild //...`. | MUST | **Bazel 9.0.0+ exactly** — absent through the whole of 8.x (8.7.0 and 8.8.0 measured), present and functional on 9.0.0, 9.1.0 and 9.2.0; core; F | new (measurement Q2, ship version Q3) |
| BZL-ARCH-35 | Never let one `select()` carry both a `values=`-keyed and a `constraint_values=`-keyed `config_setting` arm that can match the same build, unless one is unambiguously more specialized or both arms resolve to the same value. | Neither arm subsumes the other, so Bazel refuses the target outright: `Illegal ambiguous match on configurable attribute … Multiple matches are not allowed unless one is unambiguously more specialized or they resolve to the same value.` Reproduced byte-for-byte on 8.7.0 **and** 9.2.0 — bazelbuild/bazel#14604 is live, not historical as this file previously recorded it. It fires only under a platform that makes both arms true, so it can sit dormant through every local build and break one CI leg. | Reading heuristic first — for each `select()`, check whether two arms' `config_setting`s are keyed on different mechanisms; no grep resolves the arms. The decisive check is to build under each platform the matrix runs: `bazel build --platforms=//:<platform> //<target>`, per platform. **A clean build under every platform = pass; the `Illegal ambiguous match` error = finding.** On 9.2.0 the `values=` arm also emits a deprecation warning before the fatal error, which is the cheap early signal 8.7.0 does not give. | MUST | Bazel 8.7.0 and 9.2.0, both measured; core; F | M-G-07 (extension) |

## Applied to rules_ocx

`rules_ocx` is shape A (a Starlark ruleset publishing to the BCR), pinned at
Bazel **8.7.0** (`.bazelversion`, `bazel-audit/build-contracts-and-ci-posture.md:111`).
It exhibits eleven of the thirty-five rules, violates one, has one it satisfies
in a way the rule's own verification cannot see, and is structurally unable to
exhibit seventeen.

**Satisfied, and worth shipping as the worked example.**

- **BZL-ARCH-08** — all seven `ocx/private/*.bzl` declare `visibility(["//ocx", "//ocx/tests"])`
  (`project.bzl:31`, `download.bzl:15`, `platforms.bzl:10`, `versions.bzl:13`,
  `package.bzl:31`, `manifest.bzl:11`, `repo_utils.bzl:10`;
  `bazel-audit/starlark-code-shape.md:268`). Verified live: `grep -L '^visibility(' ocx/private/*.bzl`
  returns empty. This is the two-mechanism split the rule teaches, in production.
- **BZL-ARCH-17** — the repo's one transition writes `//command_line_option:platforms`,
  not a legacy flag key (`examples/cross_platform/transition.bzl:4,9`, read live).
  It is the modern form on the first try.
- **BZL-ARCH-26** — `.bazelignore` is three lines (`examples`, `e2e`,
  `.agents/worktrees`), and the third is the documented fix for the live
  glob-into-a-worktree failure (`bazel-audit/config-inventory.md:70,75`).
- **BZL-ARCH-29 — now fully satisfied, revised 2026-09-06.** `docs/BUILD.bazel:38-47`
  generates one `diff_test` per stardoc output with the failure message naming
  the regeneration command, and `docs/BUILD.bazel:65` is the `update` binary
  that regenerates. The gate runs only on the 8.7.0 CI leg (`ci.yml:62` excludes
  `//docs/...` whenever `matrix.bazel != '8.7.0'`) — and `ci.yml:57-60` carries
  the comment naming the reason and the major, which is exactly the shape
  [BZL-HERM-22](bazel-hermeticity-determinism.md) blesses and the carve-out
  BZL-ARCH-29 now writes down. The earlier reading of this as "partial, with a
  named hole" was the rule overreaching, not the repo underdelivering.
- **BZL-ARCH-30** — `docs/BUILD.bazel:38-47` is the *macro* branch, correctly
  chosen: the freshness result has to be a named test target that
  `bazel test //...` runs and CI can gate on, which is the rule's own stated
  exemption. The repo has no aspect-shaped cross-cutting check to weigh against
  it because it has no linting aspect at all (buildifier runs as a separate
  `bazel run` gate).
- **BZL-ARCH-09** — one real `exports_files` (`dist/BUILD.bazel:4`), correctly
  declared rather than relied on implicitly. Under the corrected rationale this
  is forward-proofing, not compliance with a default already in force.
- **BZL-ARCH-01, -02, -06, -14, -35** — vacuously satisfied and correctly so:
  one real `glob()` (`ocx/private/BUILD.bazel:10`, over `*.bzl` in its own
  package), zero real `**` globs, zero `package_group` declarations at two
  public sites with no duplicate visibility lists
  (`bazel-audit/starlark-code-shape.md:154-155`; `package-granularity…:370`),
  and one real `select()` (`docs/BUILD.bazel:19`, a single
  `@platforms//os:windows` arm plus a default) whose arms cannot collide. The
  rules' triggers never fire. Absence here is proportionate, not a gap.

**Violated.**

- **BZL-ARCH-04** — `ocx/private/BUILD.bazel:6` sets
  `package(default_visibility = ["//visibility:public"])` on a package literally
  named `private` (read live; `bazel-audit/starlark-code-shape.md:157`). The
  compensating control is real — the seven load-gates above — but it lives in
  seven other files and no comment at the site says so. `ocx/BUILD.bazel:6` is
  the module's public façade and is the rule's named exemption. **This is where
  we overrule the dive**, which reads both sites as deliberate
  (`package-granularity…:369`): one is, one is a wider target visibility than
  the design intends with an undocumented reason. Fix is one comment, or
  `//ocx:__subpackages__`.

**Satisfied, but the rule's own verification cannot see it — the blind spot to
ship with the rule.**

- **BZL-ARCH-16** — `_ocx_package_hub_impl` generates `config_setting` targets
  keyed on `constraint_values`, never on raw flag `values=`
  (`ocx/private/package.bzl:383-386`, read live; `platforms-selects…:422`). But
  the whole `BUILD.bazel` is written as a Starlark string into a *different*
  repository, so it is invisible to buildifier and to BZL-ARCH-16's own grep of
  this repo's `.bzl` sources — which would find nothing and falsely conclude
  the pattern is unused. The fleet audit already flags generated-BUILD-as-string
  as a general blind spot (`bazel-audit/starlark-code-shape.md:274`), and the
  ruleset preamble now states it once for every grep-based row. An integration
  test that actually builds from the generated repo is the only check that
  sees it.

**New commitments — rules the repo does not currently meet any test of.**

- **BZL-ARCH-19** — a real custom transition exists
  (`examples/cross_platform/transition.bzl:6`) and nothing measures
  configured-target duplication in that graph. The cquery invocation is a new
  standing check, cheap to add to the examples leg.
- **BZL-ARCH-20** — no `aquery`-parsing tooling exists today; the rule is a
  standing prohibition, not a fix.
- **BZL-ARCH-27** — no `REPO.bazel` exists and none is needed: the three
  `.bazelignore` entries are literal paths with no wildcard intent. The pin
  (8.7.0) clears the 8.0.0 floor, so this is an available option, not a debt.
- **BZL-ARCH-15** — clean today: `grep -rn '1:1:1' --include='*.md' .` over the
  repo returns nothing. The rule guards future generated guidance, not
  existing text.
- **BZL-ARCH-34** — zero occurrences of `transitive_visibility`, and on the
  8.7.0 pin the parameter does not exist at all, so the rule binds here purely
  as a prohibition. It becomes an available mechanism only if the frame's
  decision-table row 2 (move to 9.x) is ever taken.

**Cannot exhibit — and what the fleet would have to build to.**

Seventeen rules have no instance anywhere in the fleet, and the reason is
structural, not accidental: **`rules_ocx` contains zero `cc_*`, `py_*`, `js_*`
or `rust_*` targets, zero `.proto` files, zero `exec_group` declarations, and
the other sixteen repositories do not build with Bazel at all**
(`bazel-audit/starlark-code-shape.md:293`; map §"How to read this" ¶3).
Specifically: BZL-ARCH-03 (no shared output directory — `dist/BUILD.bazel` is
four lines), BZL-ARCH-05, -07, -10 (no cross-team visibility grants, no
`package_group`, no real `config_setting` in this repo's own graph),
BZL-ARCH-11, -12, -13 (no Gazelle plugin, no language rules, nothing to
generate), BZL-ARCH-18, -21, -22, -23 (no `platform_mappings`, no reset
transition, no rc-file path-mapping flag, no `config_setting` sprawl),
BZL-ARCH-24, -25 (no language manifest inside a Bazel graph and no legacy build
system running alongside — the map's Shape F is "none today"), BZL-ARCH-28 (no
`.gitmodules` in `rules_ocx`; the two submodule instances are in `ocx` and
`grimoire`, which do not build with Bazel — `bazel-audit/fleet-bazel-readiness.md`
Smells §2), BZL-ARCH-31 (zero `.proto` files fleet-wide), and BZL-ARCH-32, -33
(no `exec_group`, no `exec_properties`, and no two targets sharing a source
file).

**To exhibit them, the fleet would have to build one polyglot repository with
Bazel.** The frame's own candidate is `bob` (nine crates, clean DAG, no Python
or TypeScript, no CI to preserve) — but `bob` exhibits almost none of this
family either: no shared output directory, no submodules, no second build
system worth keeping green, one language. The repository that would exercise
BZL-ARCH-03, -11, -24, -25, -29 and -31 together is **`creeptd-ng`**: 12 crates
plus three JavaScript package managers, checked-in protobuf-generated TypeScript
with no regeneration gate (`creeptd-ng/web/src/gen/creeptd/**/*_pb.ts`), and a
declared pnpm workspace member that is actually npm-managed
(`bazel-audit/fleet-bazel-readiness.md` Smells §4, Layout signals). Until one
of those two is actually taken into Bazel, every rule above marked shape F is
grounded on upstream sources alone, exactly as the map's Shape-F framing and
the frame's decision 7 (ship `cpp.md` with no fleet consumer) already accept.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds on
  visibility (04, 08, 09), the Bazel-visible boundary (26, 27), the
  generated-content gate (29, with the BZL-HERM-22 carve-out it now carries),
  and the aspect/macro choice (30, where the repo's `diff_test` loop is the
  macro branch chosen correctly). The generated-repo BUILD text defeats every
  grep-based verification here, which the ruleset preamble now says out loud
  once for all of them.
- **B — Rust CLI + Python harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`).** Binds only on migration state: 24 (manifest stays
  authoritative, `crate_universe` ignores path deps regardless) and 28 (two
  repos vendor the same forks as submodules; `git_override` needs those forks to
  carry a `MODULE.bazel`, and none does — so `bazel mod` has nothing to query
  and the coupling stays invisible until that changes). Generation here is
  BZL-ARCH-11's **experimental** branch: `gazelle_rust` at one tag, with
  platform-conditional deps and crate-name collisions needing hand-authored
  escape hatches that gazelle then respects on every regeneration (BZL-ARCH-13
  applies directly). Python sits below any generator threshold — hand-written
  `py_library`/`py_test` is the correct default, not a deferral.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** The densest binding in the
  fleet and none of it live: 03 (three JS package managers, one of which writes
  a shared output root), 24, 25 and 29 (checked-in `_pb.ts` with an untraced
  generator and no `diff_test`), and 31 if the protobuf ever moves into Bazel.
  **Corrected 2026-09-06:** generation is *not* simply available on the TS half.
  Aspect's plugin never emits a `transpiler=` attribute and rules_ts has hard-
  `fail()`ed without one since 2.0, so every generated `ts_project` needs either
  a hand-patched line or the repo-wide `default_to_tsc_transpiler` flag adopted
  as a documented, reviewed exception — the shape BZL-JS-13 already names as a
  defect when left permanent. The pnpm/npm workspace drift itself is
  `typescript-packaging`'s row, not ours.
- **D — Python library or automation.** Binds on 24 only, and weakly: every uv
  lockfile in the fleet is a *migration cost*, not an asset (map Conflict 4), so
  the manifest-authoritative rule is the whole of what applies until
  `rules_python` can consume a `uv.lock`.
- **E — TypeScript package, extension or Action.** Binds on 03 (the shared
  `dist/` constraint is documented through `rules_js` but is Bazel's own
  output-tree design) and 11–13. **Corrected 2026-09-06:** this file previously
  called E "the one shape in the fleet where the granularity conditional
  resolves to yes". It does not. Aspect's plugin is `usable with care`, not
  production: the transpiler gap above, a `pnpm-lock.yaml` parser that
  dispatches on lockfile major 5, 6 or 9 only (pnpm 12's multi-document format
  is an open bug, aspect-gazelle#461), and two fleet packages that are
  bun-locked with no `npm_translate_lock` ingestion path at all — the plugin
  cannot reach their imports regardless of the transpiler question. Coarse,
  hand-maintained BUILD files per directory is the correct default here today.
- **F — future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Binds on
  all thirty-five. This is the shape the family is written for; twenty-four rows
  have no other consumer today.

## AI-agent failure modes

Ranked by how often it bites, most frequent first. Each carries the check that
catches it mechanically.

1. **Writes `config_setting(values = {"cpu": "x86"})` because it is shorter and
   was the only form for years.** Pre-2022 training data is dense with it.
   *Check:* BZL-ARCH-16's grep — a `config_setting` with `values = {` and no
   `constraint_values` in the same target. On 9.2.0 the build also warns; on
   8.7.0 it does not.
2. **Assumes Bazel honours `.gitignore`.** Ports a repo into Bazel, copies no
   ignore rules, and the first `bazel test //...` globs into a worktree or a
   vendor tree. *Check:* diff the `.gitignore` and `.bazelignore` directory
   lists (BZL-ARCH-26). This one has a live fleet instance, which is why it
   ranks this high.
3. **States a flag's default from a doc page instead of from the binary.** This
   file shipped one such error for a day: `--incompatible_no_implicit_file_export`
   was recorded as defaulting `true` from a CLI-reference read; both 8.7.0 and
   9.2.0 report `false`. *Check:* `bazel help build --long | grep -A2 <flag>` on
   the target binary, **and** `bazel help startup_options` — a flag can live in
   either and a check of only one silently misses it. A default quoted with no
   binary behind it is a finding (BZL-ARCH-09).
4. **Hallucinates a buildifier lint for `default_visibility = public`.** Asked
   "how do I catch a public default visibility", a model names a category that
   does not exist. *Check:* demand the exact category from
   `buildtools/WARNINGS.md`; there is none — the correct answer is "no lint
   exists, use this grep" (BZL-ARCH-04).
5. **Cites "1:1:1" as Bazel's own recommended pattern.** Training-data blogs
   conflate Pants and Bazel vocabulary constantly. *Check:* `grep -n '1:1:1'`
   the generated text; present without naming Pants is wrong (BZL-ARCH-15).
6. **Recommends a hand-written outgoing reset transition as "the fix" for
   duplicate builds.** It looks correct, builds successfully, and produces
   silently wrong output downstream. *Check:* trace every target downstream of
   the reset boundary for a reader of the reset setting (BZL-ARCH-21).
7. **Counts `bazel aquery … | wc -l` to answer "did this transition double my
   build".** The obvious tool, and the docs say this exact comparison is
   unreliable. *Check:* BZL-ARCH-20's negative check for positional parsing.
8. **Treats `aspect_gazelle(with_check = True)` as "the CI gate is now wired".**
   Asked to add a freshness check for a JS/TS repo, a model stops there and
   reports the job done. It produces an `sh_binary`, so `bazel test //...` never
   runs it. The same class of error is recommending `gazelle -mode=diff` as a
   shell command. *Check:* `bazel query 'kind("sh_test", //:gazelle*)'` — empty
   output on a repo that believes it has a freshness gate is the finding
   (BZL-ARCH-12).
9. **Presents `transitive_visibility` as available on Bazel 8, or passes it a
   list.** It is a hard `unexpected keyword argument` through 8.8.0 and takes a
   single `package_group` label string on 9.2.0 — the list form in the docs'
   own example is a type error there. *Check:* read `.bazelversion`, then the
   two-line probe; there is **no** `bazel help package` subcommand to grep, on
   any of the three versions (BZL-ARCH-34).
10. **Reads `//foo/...` inside a `package_group.packages` list as "public".**
    That was pre-Bazel-6 behaviour; the current default restricts it to the
    current repository. *Check:* a `package_group` intended as a public
    allowlist must spell out `"public"`, not rely on `"//..."`.
11. **Treats every Gazelle plugin as equal in trust and equal in default
    granularity.** "Gazelle supports Rust and C++" erases a real maturity gap
    (`gazelle_rust` is one maintainer at one tag), and porting Go's package-level
    rule of thumb to Rust gets the opposite of `gazelle_rust`'s actual default
    (one target per file). *Check:* does the guidance name the plugin's version,
    maintainer and own default mode, fetched from
    `bcr.bazel.build/modules/<name>/metadata.json` and that plugin's own
    directive docs — or does it state support as a flat fact (BZL-ARCH-11)?
12. **Proposes `REPO.bazel`'s `ignore_directories()` on a Bazel 7 pin.** A
    version-floor miss with no error until someone runs it. *Check:* read
    `.bazelversion` first (BZL-ARCH-27).
13. **Suggests `ctexplain --analysis=culprits` to find which flag forked a
    target.** Three of its four analyses are one-line "not yet implemented"
    stubs, six years on, and the tool ships only inside the `bazelbuild/bazel`
    source tree. *Check:* run it — the literal string
    `"this analysis not yet implemented"` is the confirmation. Only `summary`
    works, and BZL-ARCH-19's cquery one-liner already computes what `summary`
    computes.
14. **Reaches for a wrapper macro to add a lint or format check "because that is
    what a `_test` target is for".** Years of macro-heavy examples make it the
    default reach, and the cost — N new labels per wrapped target, billed on
    every `bazel test //...` — is invisible in the diff. *Check:* the
    before/after `bazel query //pkg:*` diff; non-empty for a check whose output
    is only ever read as a report is the finding (BZL-ARCH-30).
15. **Sets a bare `exec_properties` key on one test of a pair that shares a
    source file.** Looks local and harmless; produces an action conflict because
    the bare key spans every exec group, including the implicit one both targets
    share. *Check:* `bazel query 'same_pkg_direct_rdeps(<file>)'` and compare the
    `exec_properties` of everything it returns (BZL-ARCH-33).
16. **Reaches for `bind()` to swap an implementation by platform.** WORKSPACE-era
    and explicitly deprecated in favour of `alias()`. *Check:*
    `grep -rn 'bind(' --include='*.bzl' --include='*.bazel' . WORKSPACE*` — any
    hit on a Bzlmod-only repo is dead weight at best.
17. **Invents a numeric adoption threshold.** Asked "should repo X adopt Bazel",
    a model produces a target count or a team-size cutoff because that is the
    shape adoption advice takes in training data. No such number exists in the
    sourced corpus, at any scale. *Check:* require the exact source and a
    verbatim quote for any number offered as a go/no-go criterion; if it cannot
    be quoted, it must be dropped for the checklist form (Verdict 18).

## Open questions

### Needs a human decision

1. **Does any fleet repository actually adopt Bazel?** Seventeen of thirty-five
   rules have no possible fleet instance until one does, and the two candidates
   pull in opposite directions: `bob` is the cheapest pilot and exercises almost
   none of this family; `creeptd-ng` exercises six of the highest-priority rows
   and carries a live-Postgres compile dependency that has to be fixed first
   (`bazel-audit/fleet-bazel-readiness.md` Smells §1). The frame's decision 1
   already marks the pilot as the owner's; this family is where the cost of
   *not* piloting is largest. Note that the research cannot help pick a
   threshold for this — Verdict 18 establishes that none exists in any source.
2. **`ocx/private/BUILD.bazel:6` — comment, or narrow?** One line either way.
   The rule as written requires one of the two.

### Deserves another research round

None. Both rows this file carried into the wave-5 convergence round closed
there: `transitive_visibility` ships at **9.0.0**, probed on the 9.0.0 and
9.1.0 binaries (`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md`
Q3), and BZL-ARCH-30's arithmetic and query-diff verification ran against a
live five-package graph on 8.7.0 and 9.2.0
(`bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md`
Q1). Two limits that round recorded stay **documented gaps**, not open
questions: the macro-versus-aspect *analysis-time* cost at fleet scale is
unmeasured — the fixture's 5–15 trivial targets are noise-dominated, and
Skymeld merges the loading/analysis phase marker so `--profile` cannot split
them on either major — and no 9.x release after 9.2.0 was tested.

### M-G rows this ruleset does not settle

| Row | Why not |
|---|---|
| M-G-22 (should this repo adopt Bazel at all) | Deliberately not a rule, and now with the evidence to say why: no source in the corpus gives a numeric threshold at any scale (Verdict 18). The map already resolved the *stance* (Conflict 2) and the frame routes the *procedure* to `bazel-adopt`'s opening gate. A go/no-go gate is a skill, not a standard. |
| M-G-23 (is a narrower fix considered first) | Same reason as M-G-22 — it is the second question of the same gate. The follow-up mapped the cheaper fix per fleet shape (cargo/sccache/nextest, uv, pnpm+Nx/Turborepo) and found no source stating when any of them stops being enough; two of the three shapes have sourced arguments that they *never* need to climb further. It ships as a checklist item ("name the narrower fix and why it was rejected"), never as a measured comparison. |

## Sub-artifacts

- [`bazel-architecture-monorepo/package-granularity-visibility-and-generation.md`](bazel-architecture-monorepo/package-granularity-visibility-and-generation.md)
  — package boundaries and the silent `glob()` shrink, all three visibility
  mechanisms with their current flag defaults, `package_group`'s composition
  trap, and the per-language Gazelle-plugin maturity table that turns granularity
  into a conditional. Settles M-G-01 … M-G-06.
- [`bazel-architecture-monorepo/platforms-selects-transitions-and-migration-state.md`](bazel-architecture-monorepo/platforms-selects-transitions-and-migration-state.md)
  — the platform/constraint model against `select()`-on-raw-flags, why the
  transition half of a platforms migration is the hard half, the `2^n`
  configured-target explosion with the cquery measurement that fills the docs'
  own TODO, and the five migration-state standards. Settles M-G-07 … M-G-10 and
  M-G-14 … M-G-20.

### Follow-up rounds this file commissioned (wave 4a, 2026-09-05/06)

- [`bazel-followups/gazelle-plugin-maturity-per-language.md`](bazel-followups/gazelle-plugin-maturity-per-language.md)
  — the per-language maturity table re-measured against BCR metadata and each
  plugin's own source: the JS/TS transpiler gap, the pnpm-12 lockfile parser
  bug, `gazelle_rust`'s single-maintainer one-tag state, and the finding that
  **no** ecosystem wires `gazelle_test` by default. Revises BZL-ARCH-11, -12,
  -13, -14.
- [`bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md`](bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md)
  — settles the three uncovered map rows: the aspect-versus-macro decision rule
  and its query-diff verification (M-G-13), the one-`proto_library`-plus-wrappers
  model verified in four rulesets' source (M-G-12), and execution groups with
  the `exec_properties`-scoping defect (M-G-11). Adds BZL-ARCH-30 … -33.
- [`bazel-followups/adoption-go-no-go-gate-and-coupling-query.md`](bazel-followups/adoption-go-no-go-gate-and-coupling-query.md)
  — verifies the 383-project study and the abandonment figures against their
  primary sources, establishes that **no** adoption threshold exists in the
  corpus, and confirms the `bazel mod` coupling trio on 8.7.0 and 9.1.0.
  Revises BZL-ARCH-28; closes M-G-21 and confirms M-G-22/-23 as skill content.

### Measurement this file's open questions triggered

- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — real 8.7.0/8.8.0/9.2.0 binaries on a WSL2 host. Settles
  `transitive_visibility`'s per-version existence and argument type, reproduces
  the ambiguous-`select()` failure on both majors, and records the flag-default
  table this file's Verdict 13 now cites. Adds BZL-ARCH-34 and -35.
- [`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md`](bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md)
  — wave 5, same WSL2 host, five binaries (8.7.0, 8.8.0, 9.0.0, 9.1.0, 9.2.0).
  Q3 settles `transitive_visibility`'s ship version at 9.0.0 and re-confirms
  that `bazel help package` is not a subcommand on any of the five. Revises
  BZL-ARCH-34.
- [`bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md`](bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md)
  — wave 5. Q1 runs the macro-versus-aspect arithmetic against a live
  five-package graph on 8.7.0 and 9.2.0: two net-new labels per macro call,
  zero for the aspect, `bazel test //...` exit 4 on the aspect-only tree, and
  the Bazel-9 autoload break of a bare `native.sh_test`. Revises BZL-ARCH-30.

## Revision log

Every line is one change made on **2026-09-06**, folding the three wave-4a
follow-ups, the cross-version measurement, and the frame's Corrections blocks 4,
5 and 6. Rule IDs are a stable contract: no number was reused, reordered or
retired.

| What changed | IDs | Why | Input |
|---|---|---|---|
| Rationale rewritten and verification replaced with a runnable canary — `--incompatible_no_implicit_file_export` defaults **`false`**, not `true`, on 8.7.0 and 9.2.0. The rule had told an agent a guarantee was already in force that is not. Severity held at MUST, re-anchored on Bazel's own imperative docs sentence rather than on the flag's default. | BZL-ARCH-09 | The dive's CLI-reference read was wrong; `bazel help build --long` on both binaries reports `default: "false"`, and a two-package probe built clean without `exports_files()` on both majors and failed on both with the flag passed. Measured this revision, 2026-09-06, on the WSL2 host — flag defaults are compiled into the binary, so no runner caveat applies. | This revision (live `bazel help` + build probe) |
| Verification gains the hand-wiring finding and the `sh_test` check; text now says no plugin supplies the gate and Aspect's `with_check = True` is an `sh_binary`. | BZL-ARCH-12 | Four ecosystems' own canonical examples read directly; none wires `gazelle_test`. Aspect's `runner/rules.bzl` imports only `gazelle`, never `gazelle_test`. | gazelle follow-up Q7 (measured) |
| Rule text restated around the follow-up's maturity verdicts; decision procedure now starts with a BCR metadata fetch for the module actually depended on, names the plugin's own default generation mode, and says the gate's absence is not evidence about the plugin. | BZL-ARCH-11 | `aspect_gazelle_js` is BCR 1.2.1 while `aspect_gazelle_prebuilt` is 0.0.25; quoting the mature sibling overstates the promise. | gazelle follow-up Q5, proposed revision row 3 (measured) |
| Rationale extended with `gazelle_rust`'s single-maintainer / one-tag / private-backlog state; `aspect_gazelle_prebuilt` added to the pre-1.0 list. | BZL-ARCH-13 | Same round; the "review every regenerated diff" standard now has its strongest instance named. | gazelle follow-up Q3 (measured) |
| Added "never compare the ratio across languages" plus the per-plugin default-mode clause. | BZL-ARCH-14 | `gazelle_rust` defaults to one target per file where Go and rules_python default to package-level, so the same tree yields ratios an order of magnitude apart. | gazelle follow-up Q3/Q5 (measured) |
| "Also confirm the gate runs on **every** CI leg, not one" replaced with the BZL-HERM-22 carve-out: one authoritative leg plus an adjacent comment naming the major is correct where the generated file's shape is Bazel-major-dependent. | BZL-ARCH-29 | Two rules could not both hold on the same exhibit as written. `rules_ocx` `ci.yml:57-60` carries exactly that comment above `ci.yml:62`'s exclusion. | Frame Corrections wave 3b §8; BZL-CI Verdict 5 (normative) |
| `rules_ocx` re-scored from "partial, with a named hole" to fully satisfied on -29; the matching human-decision open question ("should the `//docs/...` gate run on more than the 8.7.0 leg?") removed as answered. | BZL-ARCH-29 | Consequence of the carve-out above — the repo was compliant; the rule overreached. | Frame Corrections wave 3b §8 |
| Verification gains the fork-remote `MODULE.bazel` probe and the confirmed `bazel mod graph --extension_info` / `show_repo` / `explain` trio, with "empty `bazel mod` output on a repo with no `MODULE.bazel` is not evidence of no coupling". Row now also settles M-G-21. | BZL-ARCH-28 | The coupling query exists and is stable across 8.7.0/9.1.0; the blocker is the missing module, which was already this rule's stated precondition. | adoption follow-up Q4 (normative, versioned docs) |
| Rationale extended: value set differs across majors (8.7.0 `off, content or strip`; 9.2.0 `off or strip`), so a carried-over `content` breaks on upgrade. "Highly experimental / default off" confirmed on both binaries rather than on a rolling page. | BZL-ARCH-22 | Read from each binary's own `help build --long` this revision. | This revision (live `bazel help`) |
| Runtime signal added: on 9.2.0 a `values=`-keyed `config_setting` in a `select()` prints a deprecation warning; 8.7.0 prints nothing, so the grep is the whole check there. | BZL-ARCH-16 | Observed alongside the ambiguous-match reproduction. | measurement Q5 (measured) |
| Flag-default cells re-stated from the binaries rather than the CLI reference for `--incompatible_enforce_config_setting_visibility`, `--incompatible_config_setting_private_default_visibility`, `--incompatible_fix_package_group_reporoot_syntax`, `--incompatible_package_group_has_public_syntax`, `--check_bzl_visibility`. All five confirmed unchanged from what the dives claimed. | BZL-ARCH-07, -08, -10 | The one flag that *was* wrong (BZL-ARCH-09) made re-reading the rest mandatory rather than optional. | This revision (live `bazel help`) |
| Blanket generated-repo blind-spot sentence added to the ruleset preamble, so every grep-based row carries it without repeating it in thirty cells; BZL-ARCH-04's own cell keeps the explicit note. | preamble, BZL-ARCH-04 | Frame wave-2 correction 9 requires every grep-based verification in the shipped set to say so. | Frame Corrections wave 2 §9 (normative) |
| NEW — aspect-versus-macro decision rule with the before/after `bazel query` diff as its verification, and `nogo`'s compile-action path named as the third option available only to rule authors. SHOULD (ruleset design rationale plus definitional docs, no normative prohibition). | BZL-ARCH-30 | M-G-13 was the highest-value unsettled row in family G and had no research behind it. | aspects follow-up NEW-1/NEW-2 (codified/normative) |
| NEW — one `proto_library` per `.proto` set, N language attachments, never a per-language duplicate; `rules_buf`'s `buf` Gazelle language explicitly excluded as a `proto_library` generator. SHOULD, capped below MUST because no source states the prohibition outright. | BZL-ARCH-31 | Four rulesets' source converges and no counter-example exists. The buf conflation is folded in as a clause rather than a separate row — same failure family, one check. | aspects follow-up NEW-6 (codified); gazelle follow-up NEW-6 (measured) |
| NEW — `exec_group` only for a genuine two-execution-platform need. CONSIDER: the analysis-time cost is real but unquantified in every source. | BZL-ARCH-32 | M-G-11, previously unsettled. | aspects follow-up NEW-7 (argued → CONSIDER, as the house standard requires) |
| NEW — `exec_properties` keys scoped to their exec group wherever two targets share a source file. SHOULD, not CONSIDER: this rests on a reproduced, still-open upstream defect with a maintainer-documented workaround, not on argument. | BZL-ARCH-33 | rules_python#2445, open since 2024-11-26, widened 2025-09-17. | aspects follow-up NEW-8 (measured) |
| NEW — `transitive_visibility` is version-gated and takes a single `package_group` label string. MUST. | BZL-ARCH-34 | The old Verdict 3 decision ("it gets no rule row") rested on the parameter being unavailable everywhere; it is live on 9.2.0, so the trap is now real and needs a row. | measurement Q2 (measured) |
| NEW — mixed `values=`/`constraint_values=` `select()` arms are an `Illegal ambiguous match` on both majors. MUST. | BZL-ARCH-35 | bazelbuild/bazel#14604 was recorded here as "historical, not confirmed-current"; it reproduces byte-for-byte on 8.7.0 and 9.2.0. | measurement Q5 (measured) |
| Verdict 3 rewritten: `transitive_visibility` present on 9.2.0, absent through 8.8.0, takes a string not a list; and **`bazel help package` is not a subcommand on any tested version** — the verification the old text and failure mode 9 both prescribed does not exist. | Verdict 3, failure mode 9 | Same measurement. Two errors in one sentence: an availability claim and a non-existent command. | measurement Q2 (measured) |
| Verdict 13 (version boundaries) re-stated from the binaries, with the `transitive_visibility` boundary, the `--experimental_output_paths` value-set split, the corrected `--incompatible_no_implicit_file_export` default, and the ruleset floors from the gazelle follow-up. | Verdict 13 | Consolidates every version-specific fact this revision touched into one place. | measurement Q1; this revision; gazelle follow-up |
| Verdicts 14–20 added: the measured flag contradiction, aspects/macros, protobuf modelling, exec groups, the adoption **gap**, the coupling-query **precondition**, and M-G-24's confirmed reallocation to BZL-MOD. | Verdict | The instruction to move established gaps into the Verdict rather than leave them as open questions. | all four inputs |
| All seven "Deserves another research round" rows removed as answered; two new, narrower rows added (the exact 9.x minor for `transitive_visibility`; BZL-ARCH-30's verification untested on a live graph). Human-decision item 3 removed as answered. | Open questions | Six of the seven were answered by the follow-ups and the measurement; the seventh (adoption gate) resolved into a documented gap. | all four inputs |
| M-G-11, -12, -13, -21 and -24 rows removed from "M-G rows this ruleset does not settle" — the first four are now settled by rules or by Verdict 19, and M-G-24's reallocation to BZL-MOD is confirmed in Verdict 20. Only M-G-22 and M-G-23 remain, now with the evidence for *why* they stay skill content. | M-G table | Instruction (c), plus the follow-ups' coverage. | Frame Corrections wave 2 §10; aspects and adoption follow-ups |
| Shape E's claim that it is "the one shape in the fleet where the granularity conditional resolves to yes" corrected: the transpiler gap, the pnpm-12 parser bug and two bun-locked packages make coarse hand-maintained BUILD files the correct default there today. Shape C corrected the same way for its TS half. Shape B gains the Rust/Python generator reality. | Applied to the fleet shapes | An overclaim about an availability guarantee that the follow-up shows does not exist. | gazelle follow-up Q1/Q6 (measured) |
| Failure modes renumbered in place with four added (flag-default-from-a-doc-page, `with_check=True` false friend folded into the gazelle entry, wrapper-macro-for-lint, bare `exec_properties`, invented adoption threshold) and the plugin-trust entry extended with the default-granularity trap. | AI-agent failure modes | Each new entry is the agent-facing face of a rule this revision added or corrected. | all four inputs |
| Arithmetic fix: the "Applied to rules_ocx" preamble said the repo "is structurally unable to exhibit twelve" while the list below it named fourteen (9+1+1+4+12 = 27, not 29). Corrected and re-derived for thirty-five rules: eleven exhibited, one violated, one invisible, five new commitments, seventeen unable. | Applied to rules_ocx | Pre-existing counting error in the 2026-09-05 text, found while re-scoring. | — |
| Frontmatter: four inputs added to `consolidates`, `revised: 2026-09-06` added, `grounded_in` extended to all six Corrections blocks. Sub-artifacts section split into dives, follow-ups and the measurement. | frontmatter, Sub-artifacts | Housekeeping so a later author can diff the provenance. | — |

**Wave 5 convergence round, 2026-09-06** (`revised_wave5`). Row-scoped: only
BZL-ARCH-30, BZL-ARCH-34 and the sentences carrying their two open questions
changed. No rule was added, renumbered, reordered or retired; no severity moved.

| What changed | IDs | Why | Input |
|---|---|---|---|
| `Applies to` now reads **Bazel 9.0.0+ exactly**; the rationale names 9.0.0/9.1.0/9.2.0 rather than 9.2.0 alone, and the "no `bazel help package`" note widens from three binaries to five. | BZL-ARCH-34 | The two-line probe is accepted on 9.0.0 and 9.1.0, so the boundary is the 8→9 major line, not an untested later 9.x minor. | `bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md` Q3 (measured) |
| Verdict 3's "Documented gap: the exact 9.x minor … untested" sentence replaced with the measured ship version and its headline narrowed-claim ("the third exists on 9.2.0") widened to "on Bazel 9"; Verdict 13's boundary clause widened from "live on 9.2.0" to 9.0.0/9.1.0/9.2.0. | Verdict 3, Verdict 13 | Same measurement. A gap sentence left standing beside a 9.0.0+ row would contradict it. | `bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md` Q3 (measured) |
| Rationale re-anchored from definitional to measured: **two** net-new labels per macro call, not *N* (the wrapped target already existed), zero for the aspect under any invocation, and the aspect-only tree has no test closure. | BZL-ARCH-30 | The old "*N* labels per wrapped target" over-counts by one per call against the live graph; the arithmetic is now measured on both majors. | `bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md` Q1 (measured) |
| Verification split into a macro-side `query` diff and an aspect-side **`cquery`** diff, plus a third test-closure check — a `bazel query 'tests(//...)'` diff, with the measured `bazel test //...` exit 4 / `No test targets were found` named as the *pass* on a tree whose only would-be tests are the check itself. | BZL-ARCH-30 | Plain `query` rejects `--aspects` with `Unrecognized option` on both majors, so the old single-`query` cell sent a reader into an error rather than an empty diff. | `bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md` Q1 (measured) |
| Bazel-9 autoload cost of the macro path recorded as a clause with a cross-reference to BZL-LARK-10 and BZL-FLAG-16, not restated. | BZL-ARCH-30 | A bare `native.sh_test` in a legacy macro breaks on 9.2.0 until an explicit `rules_shell` `load()` is added — reproduced live, and a cost the aspect variant never pays. | `bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md` Q1 (measured) |
| Both "Deserves another research round" rows closed; the round's own unsettled limits (fleet-scale analysis cost, no 9.x after 9.2.0) recorded there as documented gaps instead. | Open questions | Both were answered outright; the residue is a gap, not a question worth commissioning. | both wave-5 inputs |
| Frontmatter gains `revised_wave5: 2026-09-06` and the two measurement inputs in `consolidates`; both added to Sub-artifacts. | frontmatter, Sub-artifacts | Provenance for the next author. | — |

## Key sources

| URL | Why it is here |
|---|---|
| [bazel.build/configure/best-practices](https://bazel.build/configure/best-practices) | The package-per-directory rule verbatim, and the fine-grained-dependencies goal statement. The *only* page that carries it. |
| [bazel.build/concepts/visibility](https://bazel.build/concepts/visibility) | All three visibility mechanisms, exact label forms, symbolic-macro default, the explicit warnings against public `default_visibility` and against `__pkg__` across a project boundary, and the imperative sentence BZL-ARCH-09 now rests on. |
| Live `bazel help build --long` and `bazel help startup_options` on **8.7.0, 8.8.0 and 9.2.0** | The only trustworthy source for a flag default in this family. It contradicted the CLI-reference read behind BZL-ARCH-09 and confirmed five other rows. There is no `bazel help package` subcommand on any of them. |
| [bazel.build/versions/8.1.0/concepts/visibility](https://bazel.build/versions/8.1.0/concepts/visibility) · [9.1.0](https://bazel.build/versions/9.1.0/concepts/visibility) | The negative evidence that made `transitive_visibility` look unavailable everywhere — superseded for 9.2.0 by the binary itself, and kept here as the worked example of why a versioned snapshot is not the last word. |
| [bazel.build/reference/be/functions](https://bazel.build/reference/be/functions) | `package_group`'s exact signature and the independently-computed-then-unioned composition trap; `glob()`'s subpackage boundary. |
| [bazel.build/versions/8.7.0/concepts/platforms](https://bazel.build/versions/8.7.0/concepts/platforms) | Titled "Migrating to Platforms": the "biggest challenge" quote, the `select()`-doesn't-understand-`--platforms` sentence, `platform_mappings`' own "temporary… blunt tool" framing — all dropped from the live page. |
| [bazel.build/extending/platforms](https://bazel.build/extending/platforms) | `platform`/`constraint_setting`/`constraint_value` and `target_compatible_with`'s skip-on-expansion semantics. |
| [bazel.build/extending/config](https://bazel.build/extending/config) | The `2^n` worked example and the literal "TODO: Add strategies for measurement and mitigation" this family fills. |
| [bazel.build/extending/aspects](https://bazel.build/extending/aspects) · [/extending/macros](https://bazel.build/extending/macros) | The definitional basis for BZL-ARCH-30: a macro instantiates rules (so N calls = N labels), an aspect creates no targets and is requested with `--aspects`/`--output_groups`. |
| [aspect-build/rules_lint README](https://raw.githubusercontent.com/aspect-build/rules_lint/main/README.md) | A widely-used ruleset stating the aspect-over-macro trade-off as its own design rationale — the citable half of BZL-ARCH-30. |
| [bazel.build/extending/exec-groups](https://bazel.build/extending/exec-groups) | `exec_group` syntax, per-group toolchain resolution, and the compile-remote/link-local case that is the only motivating example anywhere. |
| [bazelbuild/rules_python#2445](https://github.com/bazelbuild/rules_python/issues/2445) | Open since 2024-11-26, widened 2025-09-17: the reproduced action conflict behind BZL-ARCH-33 and the maintainer's own group-scoped-key workaround. |
| [bazel.build/query/cquery](https://bazel.build/query/cquery) | The `label (confighash)` default output that makes BZL-ARCH-19's one-liner work, plus `bazel config <hash>` and `--transitions=full`. |
| [bazel.build/query/aquery](https://bazel.build/query/aquery) | The documented `execPath`-duplicate rendering and unspecified output order — why BZL-ARCH-20 is a prohibition. |
| [bazel.build/versions/8.7.0/external/mod-command](https://bazel.build/versions/8.7.0/external/mod-command) · [9.1.0](https://bazel.build/versions/9.1.0/external/mod-command) | `bazel mod graph --extension_info`/`show_repo`/`explain` present with identical descriptions on both; no 9.2.0 snapshot exists (Bazel archives per LTS minor). BZL-ARCH-28's coupling half. |
| [bazel.build/run/bazelrc](https://bazel.build/run/bazelrc) (source: [site/en/run/bazelrc.md](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/run/bazelrc.md)) | `.bazelignore`'s exact contract — no glob semantics, no mention of git — and the `REPO.bazel`/`ignore_directories()` Bazel-8.0.0 note. |
| [bazelbuild/bazel PR #24203](https://github.com/bazelbuild/bazel/pull/24203) | The stated motive for `ignore_directories()`: "a migration path off of that weird single-purpose configuration file". |
| [bazelbuild/bazel#14604](https://github.com/bazelbuild/bazel/issues/14604) | The ambiguous-match report closed in 2022 — recorded here as historical until the measurement reproduced it byte-for-byte on 8.7.0 and 9.2.0. BZL-ARCH-35. |
| [github.com/bazel-contrib/bazel-gazelle](https://github.com/bazel-contrib/bazel-gazelle) (README, `def.bzl`, root `BUILD.bazel`, `language/proto/reference.md`) | The maturity baseline at `v0.54.0`; the `mode` attribute that makes `gazelle_test` the real "no diff" check; the `sh_binary`-versus-`sh_test` split; and proof its own root `BUILD.bazel` wires only `gazelle()`. |
| [aspect-build/aspect-gazelle](https://github.com/aspect-build/aspect-gazelle) (`language/js/kinds.go`, `pnpm/parser.go`, `runner/rules.bzl`, `e2e/smoke/.bazelrc`) | Direct proof of the three JS/TS gaps: no `transpiler=` attribute anywhere, a pnpm-lock parser dispatching on majors 5/6/9 only, and `with_check=True` calling plain `gazelle()`. |
| [github.com/Calsign/gazelle_rust](https://github.com/Calsign/gazelle_rust) (README, `MODULE.bazel`, issues [#15](https://github.com/Calsign/gazelle_rust/issues/15), [#16](https://github.com/Calsign/gazelle_rust/issues/16)) · [EngFlow/gazelle_cc](https://github.com/EngFlow/gazelle_cc) | Both third-party and pre-1.0, with their `rules_rust`/`gazelle`/`rules_cc` floors, the one-target-per-file default, and the maintainer's own backlog issue standing in for a roadmap. |
| [github.com/bazelbuild/buildtools](https://github.com/bazelbuild/buildtools) `WARNINGS.md` | Read in full: zero occurrences of `default_visibility`. The negative evidence behind BZL-ARCH-04's grep, and the antidote to a hallucinated lint name. |
| [protocolbuffers/protobuf `bazel/*.bzl`](https://github.com/protocolbuffers/protobuf/tree/v33.4/bazel) · [bazelbuild/rules_rust `prost.bzl` 0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/extensions/prost/private/prost.bzl) | The one-`proto_library`-plus-attachments model in four rulesets' own source: forwarding macros for C++, protobuf's own `py_proto_library` aspect, and `rust_prost_library`'s single `proto=` attribute. BZL-ARCH-31. |
| [github.com/lucidsoftware/bazel-build-graph-explosion](https://github.com/lucidsoftware/bazel-build-graph-explosion) | Four packages that walk from no duplication through the reset transition's own silent-wrong-value failure to path mapping's fix, with real command output. |
| [bazelbuild/bazel `tools/ctexplain`](https://github.com/bazelbuild/bazel/tree/master/tools/ctexplain) | Bazel's own answer to its own TODO — and first-hand confirmation that three of its four analyses are stubs. |
| [abseil.io/resources/swe-book/html/ch18.html](https://abseil.io/resources/swe-book/html/ch18.html) | The canonical argument for fine-grained targets *and* its stated cost, with Google's own scale numbers. The half most citations drop. |
| [aspect-build/rules_js `docs/faq.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | The shared-output-directory constraint quoted verbatim, with both resolutions and no third. |
| [tweag.io — Building a Rust workspace with Bazel](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/) | The manifest-authoritative migration pattern, `CARGO_BAZEL_REPIN=1`, and `crate_universe`'s path-dependency blind spot. |
| [arXiv:2405.00796](https://arxiv.org/abs/2405.00796) · [RabbitMQ PR #13514](https://github.com/rabbitmq/rabbitmq-server/pull/13514) · [BazelCon 2024 schedule](https://bazelcon2024.sched.com/) | The adoption evidence base behind Verdict 18: 31.23 percent of CI-configured Bazel projects never invoke Bazel in CI (denominator verified); an explicit non-defect departure; and the 1.5 percent / 11 percent figures traced to a named talk, not a paper. |
| [v1.pantsbuild.org/build_files.html](https://v1.pantsbuild.org/build_files.html) | Pants attributing "1:1:1" to itself, in its own words. |
