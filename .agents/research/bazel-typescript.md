---
title: "BZL-JS — rules_js, rules_ts and pnpm under Bazel 8 and 9"
topic: bazel-typescript
family: BZL-JS
model: opus
consolidates:
  - bazel-typescript/rules-js-architecture-and-dependency-resolution.md
  - bazel-typescript/rules-ts-typecheck-and-transpiler.md
  - bazel-followups/js-test-runners-bundlers-and-editor-support.md
  - bazel-followups/gazelle-plugin-maturity-per-language.md
  - bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md (§ protobuf, the `ts_proto_library` deprecation only)
  - bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md (the Bazel-core coverage generalisation only)
  - bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md (§ 5 only — the two JS structural gaps)
grounded_in:
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-topic-map.md (§ How to read this; § Conflicts resolved; § The map › K, 16 rows; § Selected for wave 2 › Group 6)
  - bazel-frame.md (§ Corrections, waves 1, post-map, 2, 3a, 4a, 3b, 5)
  - in-session measurement, 2026-09-06, this WSL2 host — `bazel help build --long` at 8.7.0 and 9.2.0 for every Bazel flag named below
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-JS

## Verdict

Version boundaries every decision below depends on: **Bazel 8.7.0 / 9.x**,
**`aspect_rules_js` 3.4.1** (floor 3.0.0, 2026-03-02; its own
`bazel_compatibility` is `>=7.6.0` at the tag and on `main`), **`aspect_rules_ts`
3.10.1** (behaviour floor 2.0.0, 2023-09-07), **pnpm ≥ 9**, **TypeScript ≥ 5.5**
for the isolated-declarations rows. A claim inherited from model training data
is presumed one to two majors stale (map § Conflicts resolved #17).

1. **`bazel build` is not a gate for TypeScript, and this is the one fact the
   whole family hangs on.** With `transpiler`, `declaration_transpiler`,
   `no_emit` or `isolated_typecheck` set — and `transpiler` is mandatory since
   rules_ts 2.0, so this is *every* target — the default output group is
   JavaScript only and the typechecker never runs
   (`bazel-typescript/rules-ts-typecheck-and-transpiler.md:66-79`, confirmed at
   the rule-implementation level at `:75`). The gate is the generated
   `[name]_typecheck_test` under `bazel test`. Every other BZL-JS rule is worth
   less than this one.
2. **Where the two dives disagreed on the CI verb, the stronger wins.** Dive 6.1
   accepts `grep "bazel build\|bazel test"` in CI as proof that a rules_js
   adoption reached CI
   (`bazel-typescript/rules-js-architecture-and-dependency-resolution.md:217`);
   dive 6.2 requires `bazel test` specifically
   (`bazel-typescript/rules-ts-typecheck-and-transpiler.md:272-275`). **Resolved
   for 6.2.** A `bazel build //...`-only pipeline is precisely the false green
   of point 1, so 6.1's disjunction would pass a repo that structurally cannot
   see a type error. One rule, BZL-JS-12, requires the `test` verb.
3. **We pin `tsc` as the starting transpiler and treat SWC as an opt-in with a
   check — reversing dive 6.2's recommendation.** 6.2 recommends SWC by default
   for speed (`:261-263`) while conceding the two known output gaps rest on a
   GitHub Discussion, i.e. argued evidence (`:159-164`). The payoff is build
   speed; the failure is a **silent runtime miscompile** under
   `emitDecoratorMetadata` or CJS export mutation. That asymmetry, plus zero
   measured type-check bottleneck anywhere in the fleet (six of eight TS
   packages are `tsc`- or bundler-only builds,
   `bazel-audit/fleet-bazel-readiness.md:157-164`), makes tsc-first the correct
   default. SWC is reachable, not forbidden: BZL-JS-14 names the two checks and
   the profile that unlock it. **Pinned project decision, reversible in one row.**
4. **Dive 6.2's headline verification is broken and is corrected here — and the
   same break recurs in a wave-4a follow-up, so it is stated twice on purpose.**
   `bazel query 'kind(ts_project, //...)'` (`:269`) matches *rule* kinds;
   `ts_project` is a macro wrapping a private rule, so the query can return
   empty on a repo full of `ts_project` targets — and empty reads as "pass".
   Replace with `bazel query 'filter("_typecheck_test$", //...)'` (label regex,
   macro-name-independent) for the graph view and `buildozer '...' //pkg:%ts_project`
   for BUILD-file-level checks, since buildozer matches the call name written in
   the file. Empty output from the filter query on a repo with `.ts` sources is a
   **finding**, never a pass. The Gazelle follow-up proposed its new rule with
   the same broken query (`gazelle-plugin-maturity-per-language.md:212`); it is
   folded into BZL-JS-33 with the query replaced, not copied.
5. **Dive 6.1's raw-`ctx.actions.run` grep is corrected too.** As written
   (`:201`) it flags every `ctx.actions.run` in any Starlark repo — it would
   report dozens of false positives in `rules_ocx`, which has no JS at all. The
   check is only meaningful in `.bzl` files that also `load` a rules_js symbol;
   BZL-JS-05 scopes it that way.
6. **pnpm is not a preference, it is the ingestion surface.** The virtual store
   is the only `node_modules` layout that decomposes into discrete cacheable
   Bazel actions (`.../rules-js-architecture-and-dependency-resolution.md:65-67`).
   `npm_translate_lock` has exactly three lockfile attributes — `pnpm_lock`,
   `npm_package_lock`, `yarn_lock` — read from the ruleset's own source
   (`:128-138`). **There is no `bun_lock` and nobody has even filed for one.**
   Two fleet packages therefore have no path at all
   (`bazel-audit/fleet-bazel-readiness.md:162-166`), and the wave-4a round
   confirms the gap runs one level deeper: `bun test` has no ruleset either
   (BZL-JS-29).
7. **Adopting rules_js for a repo not already on pnpm is a "no" as a starting
   move**, and we keep dive 6.1's decision (`:185`) with its assumption intact:
   the answer flips only when the JS package is a minority slice of a polyglot
   migration already justified by other languages. The cost — pnpm conversion,
   `hoist: false`, phantom-dependency fixes — is paid before any Bazel benefit,
   and **rules_js ships no migration guide at all as of 2026-09-05**: `migrate.md`,
   `migrate_2.md`, `migrate_3.md` are all 404 and the vendor's redirect chain
   dead-ends at the same 404 (`:179-181`). Nobody can hand an adopting team an
   upstream checklist; BZL-JS-07 is the assembled substitute.
8. **Three named upstream constraints are open and must stay open in the prose.**
   `bazelbuild/bazel#15470` (the `BAZEL_BINDIR` relief, open since 2022-05-11),
   `aspect-build/rules_js#362` (ESM imports escape the sandbox, open since
   2022-08-05, on the ruleset's own Known Issues) and `aspect-build/rules_js#1215`
   (auto-consuming yarn's extensions database, open since 2023-08-14). They are
   old, which is exactly why an agent asserts they are fixed. One rule with one
   check covers all three (BZL-JS-06). **New in this revision:** #362 also wears
   a disguise — `fremtind/rules_vitest`'s "vite, vitest, react and jsdom must be
   installed at root" workaround, whose own docs say "we have not figured out
   why yet" and link #362. BZL-JS-06 now names that symptom so an agent lands on
   the known bug instead of opening a new investigation.
9. **Map correction, now adopted — `**/REPO.bazel` is in the glob list.** The
   map fixed fourteen glob names (`bazel-topic-map.md:640-657`) and omitted
   `REPO.bazel`, yet on Bazel 8+ it is the file carrying `ignore_directories()`,
   the mechanism that keeps Bazel's directory walk out of pnpm's `node_modules`
   (`.../rules-js-architecture-and-dependency-resolution.md:210`). The frame's
   wave-2 corrections took the decision: the glob list gains a fifteenth entry
   (`bazel-frame.md` § Wave 2 consolidations, item 4). No longer an open
   question.
10. **The rules_ts and rules_js floors were re-checked and neither moved.**
    rules_ts is still **v3.10.1 (2026-08-21)**; nothing has tagged past it, and
    its released `MODULE.bazel` still declares **no** `bazel_compatibility`
    floor. `main` is 27 commits ahead and carries
    `bazel_compatibility = [">=7.7.0"]` plus an `aspect_rules_js` floor bumped
    from 2.0.0 to 3.4.0 — still unreleased
    (`js-test-runners-bundlers-and-editor-support.md` § 3). rules_js is still
    **v3.4.1**, `bazel_compatibility = [">=7.6.0"]` at the tag and on `main`.
    Cite the branch, not "current". Neither floor comes near the fleet's 8.7.0
    pin, so there is no version-floor risk to the pin today. **The trap is in
    how you look**: `gh api repos/aspect-build/rules_js/releases/latest` returns
    **v2.9.3**, a 2.x-line patch published 110 minutes after v3.4.1 on the same
    day, because GitHub's "latest" is newest by clock, not by semver. BZL-JS-32
    ships the correct check.
11. **The depth file's checks read files the rule never loads on, by design.**
    `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `tsconfig.json`
    are deliberately outside the glob (`bazel-topic-map.md:706-714`) because the
    sibling sets own them. Consequence, stated rather than papered over: twelve
    of the thirty-six rows below verify against a file that only reaches
    context through index routing from an open `BUILD.bazel` or `MODULE.bazel`.
    The frame's Decision 4 stands — `bazel-essentials` ships self-contained and
    the Q4 pointer edit into `typescript-packaging.md` is proposed as separate
    work. **Until that edit lands this is a documented gap, not an open
    question** (`bazel-frame.md` § Decisions after the map, row 4; § Wave 2
    consolidations, item 11).
12. **Lockfile-kind hygiene is covered by `typescript-packaging`** (TS-PKG-13,
    `bazel-audit/config-inventory.md:245`) and is not re-derived here.
13. **The overlapping-`srcs` trap is the family's only silent-corruption bug**
    and deserves its MUST: built together it errors on conflicting `.js`
    outputs; built separately — two CI shards, or a developer building one target
    at a time — whichever ran last wins the output path, with no error at all
    (`bazel-typescript/rules-ts-typecheck-and-transpiler.md:198-202`). Its
    downstream signature, `TS5033: EPERM`, reads as a filesystem permissions
    problem and is not one; prevention and diagnosis merge into one row.
14. **`isolated_typecheck` is a real win with a single-source evidence base.**
    Canva's numbers (73–81% fewer type-check actions per PR, P95 down 53–60% at
    ~40,000 packages) come from a recorded BazelCon 2025 talk relayed by the
    ruleset vendor's own docs site — measured, but one data point, vendor-adjacent
    (`:234-243`, `:360`). Shipped as SHOULD above monorepo scale, CONSIDER below,
    with the hard prerequisite (`isolatedDeclarations` in `tsconfig.json`) as a
    MUST because flipping the Bazel flag alone buys nothing.
15. **M-K-15 is not settled, and after a dedicated search round it is now a
    documented gap rather than an open question.** Whether partial Bazelification
    of a JS monorepo pays off before full coverage was searched across Aspect's
    full 81-post blog index, Canva's and Wix's engineering blogs and the BazelCon
    2025 recap: **no source anywhere states a coverage threshold before cache or
    CI benefit appears for a JS monorepo**
    (`js-test-runners-bundlers-and-editor-support.md` § 4). The only primary-ish
    position is Aspect's "Principles of a Bazel Migration", which argues for
    gradual accrual without measuring it. Argued on one side, unmeasured on
    both. It stays out of the ruleset, and the gap — not the question — is the
    finding.
16. **Of the fleet's four real JS test runners, three have a Bazel path and one
    has none — corrected in the wave-5 round.** vitest → `fremtind/rules_vitest`, a genuinely Bazel-aware rule
    (its own sequencer, snapshot reporter, config template), but community-run
    and seven months since its last tag: CONSIDER, never MUST (BZL-JS-28).
    Playwright → `mrmeku/rules_playwright`, BCR-published, with a same-named
    unrelated 0-star project waiting to be wired up by mistake (BZL-JS-30).
    `@vscode/test-electron` → **no ruleset, but a proven path**: a plain
    `js_test` tagged `e2e`/`no-remote-exec`/`requires-network` with
    host-provisioned Xvfb, running in `angular/angular` today (BZL-JS-29).
    `bun test` → **no ruleset and no ingestion path at all**, the stronger half
    of the same row (BZL-JS-29).
    Four of six surveyed bundler/test rulesets are current (`rules_jest`,
    `rules_esbuild`, `rules_swc`, `rules_webpack`, all released within five weeks
    of 2026-09-05); `rules_rollup` (18 months) and `fremtind/rules_vitest`
    (7 months) are stale. **The fleet's vitest count is four packages, not
    three** — `creeptd-ng/web` is a fourth consumer, which pulls the runner
    question into shape C as well as shape E.
17. **Editor support is mundane, and lives entirely outside Bazel.** With
    `node_modules` under `bazel-out`, tsserver needs exactly two things: a real
    `node_modules` at the source root from an ordinary `pnpm install`, and a
    `paths` entry in a committed root `tsconfig.json` for first-party workspace
    imports — rules_js's own `docs/faq.md` § "Making the editor happy" and
    rules_ts's own example config comment. `npm_link_all_packages()` is **not**
    part of the editor story: it generates `//:node_modules/<pkg>` Bazel-graph
    targets that tsserver never sees. The two docs the earlier round expected to
    answer this (`path_mapping.md`, `use_execroot_entry_point.md`) are about
    build-action path handling and have no editor content at all. **Documented
    gap:** `rootDirs` (plural) appears nowhere in either ruleset's docs — a repo
    that needs it is in unguided territory. BZL-JS-31 ships the prescription.
18. **Aspect's JS/TS Gazelle plugin is usable without the Aspect CLI, and ships
    two gaps that change what "generated, never hand-written" can mean.**
    `aspect_gazelle_js` 1.2.1 plus `aspect_gazelle_prebuilt` 0.0.25 are plain
    BCR dependencies; no CLI, no paid Workflows. But the plugin **never emits
    `transpiler=`** — the attribute is absent from its own `Kinds()` map and
    from all of `generate.go`, and its own e2e smoke test papers over the
    resulting `fail()` with the repo-wide `default_to_tsc_transpiler` flag that
    BZL-JS-13 calls a defect as a permanent state. No open issue even tracks it.
    And its `pnpm-lock.yaml` parser dispatches on lockfile major 5, 6 or 9 only:
    **pnpm 12's multi-document format does not parse** (aspect-gazelle#461, two
    competing fix PRs unmerged). BZL-JS-33 and BZL-JS-34. Quote the version of
    the module you actually depend on: the language is past 1.0, the prebuilt
    distribution the README recommends is still 0.0.x. One more false friend,
    owned by BZL-ARCH-12 and cross-referenced here: `aspect_gazelle(with_check
    = True)` produces an `sh_binary`, not an `sh_test` — `bazel test //...` will
    not catch BUILD drift for a JS/TS repo.
19. **The coverage claims in this family are Bazel-core properties, not rules_js
    quirks — and BZL-JS-24's old empty-output reading was unsafe.**
    `collect_coverage.sh` is substituted for the test binary by
    `TestActionBuilder.java` for every ruleset, and
    `--experimental_split_coverage_postprocessing` and
    `--experimental_fetch_all_coverage_outputs` both default **false** on 8.7.0
    and 9.2.0 (re-measured in-session on this WSL2 host with
    `bazel help build --long`; the follow-up read the same defaults from
    `TestConfiguration.java` at the 8.8.0 and 9.2.0 tags). So by default the
    collector runs inside the test's own spawn and budget — the rules_js caveat
    generalises. The unsafe part: the old rule read "no timeout, no runfiles
    error" as a pass, but with `--instrumentation_filter` unset Bazel
    auto-computes it from the **test target's own package**, so a `//lib/foo`
    implementation exercised from `//tests/foo` is instrumented not at all and
    reports a silent 0%. BZL-JS-24 now requires a non-zero `DA:` count.
20. **`ts_proto_library` is deprecated and no row here may name it as current.**
    Its own docstring at rules_ts v3.10.1 reads "This API has been replaced by
    rules_js"; the replacement in `rules_js`'s `js/proto.bzl` drops the wrapper
    rule entirely (one ordinary `proto_library` referenced from a `js_library`'s
    `deps`, with a `js_proto_toolchain` behind it) and ships marked
    **EXPERIMENTAL**. No row in the previous revision cited it — checked — so
    this ships as a new prohibition (BZL-JS-35) rather than a correction.
21. **bun is settled as a policy, not as a technique.** The frame's wave-2
    corrections took the decision for `bazel-adopt`: "convert to pnpm or do not
    adopt", with no bun branch (`bazel-frame.md` § Wave 2 consolidations, item
    11). BZL-JS-03 and BZL-JS-29 are the two halves of it — no lockfile
    ingestion, no test runner. No longer an open question.
22. **The wave-5 convergence round changes exactly two things here, and one of
    them is a retraction.** `@vscode/test-electron` was called a structural
    non-starter, reasoned by mechanism; `angular/angular` runs one as a plain
    `js_test` today, so BZL-JS-29 becomes "run it only under these tags and
    costs", never "do not attempt". The retraction's own lesson is the durable
    part: a "structurally impossible" verdict for a JS tool is a claim about the
    searcher's search, and a GitHub code search for the tool's own import string
    plus `BUILD.bazel` is what settles it — `bun test` survives that search, this
    did not. Second, the last open research row closes as a rule:
    `aspect_gazelle_js` decides pnpm membership **solely** from
    `pnpm-lock.yaml`'s `importers:` keys, never from `pnpm-workspace.yaml`'s
    globs, so `creeptd-ng`'s npm-managed `web` gets no `npm_link_all_packages`
    and fails generation outright (BZL-JS-36). Both are source-traced, not
    argued (`bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` § 5; frame
    § Wave 5, items 9–10).

## The ruleset

Thirty-six rules, de-duplicated across both dives and the wave-4a and wave-5
follow-up rounds. Rows are ordered so that one invocation covers a run: **01–04** are the
adoption/version gate (two greps and a `test -f`); **05–06** are the
architecture constraints; **07–10** are dependency resolution; **11–15** are the
typecheck gate and the transpiler; **16–22** are `ts_project` defects and
diagnosis; **23–27** are cache, coverage and framework fit; **28–35** are the
wave-4a follow-up round — test runners, editor support, ruleset-health checks,
Gazelle and protobuf; **36** is the wave-5 convergence round. **pinned** marks a
project decision rather than a derived fact.

Every grep- and buildozer-based row below reads the repository's **own
checked-in** BUILD, `.bzl`, rc and JSON files. BUILD or `.bzl` text generated
into an external repository — by `npm_translate_lock`, `npm_link_all_packages`
or any module extension — is out of all of their reach; a clean grep says
nothing about it.

| ID | Rule | Rationale (the failure) | Verification — and how EMPTY reads | Sev | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-JS-01 | Confirm a real `pnpm-lock.yaml` at pnpm ≥ 9 exists before wiring any `npm_translate_lock`; convert the repo to pnpm first (`pnpm import`) rather than pointing the rule at an npm or yarn lockfile "for now". | rules_js's linker only decomposes into cacheable actions for pnpm's virtual store; an npm/yarn repo gets a one-shot conversion, not a partial path (`rules-js…:65-67`). | `test -f pnpm-lock.yaml && head -1 pnpm-lock.yaml` (expect `lockfileVersion: 9` or higher). **Empty/missing file = finding** (unmigrated repo). If a Gazelle plugin is also in play, BZL-JS-34 constrains the version further. | MUST | Bazel 8, 9; rules_js ≥ 3.0.0; shapes C, E, F | M-K-05 |
| BZL-JS-02 | Reject any rules_js snippet that configures the ruleset through `WORKSPACE`, targets Bazel 6, assumes pnpm < 9, or passes `prod=`, `dev=`, `defs_bzl_filename=`, `link_workspace=`, `additional_file_contents=`, `root_package=` or `link_packages=`. | 3.0.0 deleted Bazel 6, WORKSPACE and pnpm<9 support outright and removed those attributes; a training-data-era snippet hard-errors (`rules-js…:57-63`). | `grep -rn "aspect_rules_js" WORKSPACE* 2>/dev/null` **and** `grep -nE "prod *=\|dev *=\|defs_bzl_filename\|link_workspace\|additional_file_contents\|root_package\|link_packages" MODULE.bazel`. **Empty from both = pass**; on a Bzlmod-only repo the first is trivially empty, so the second grep is the one that bites. | MUST | Bazel 8, 9; rules_js ≥ 3.0.0; shapes C, E, F | M-K-05 |
| BZL-JS-03 | Never point a lockfile attribute at a `bun.lock` and never write `bun_lock =` — the attribute does not exist; a bun-locked repo must fully convert to pnpm before rules_js can see any dependency. | `npm_translate_lock` defines exactly `pnpm_lock`, `npm_package_lock`, `yarn_lock`, read from the ruleset source; no feature request has ever been filed (`rules-js…:128-138`). The fleet policy that follows from it is "convert to pnpm or do not adopt", with no bun branch (frame § Wave 2, item 11). | `grep -n 'attr\.' npm/private/npm_translate_lock.bzl \| grep -i lock` on the vendored source (or the file on GitHub). **Absence of a `bun_lock` line = pass** — the absence is the confirmation, not a gap in the check. | MUST | rules_js 3.4.1 and prior; shapes E, F | M-K-06 |
| BZL-JS-04 | Keep pnpm's `node_modules` out of Bazel's directory walk with `ignore_directories(["**/node_modules"])` in `REPO.bazel` (Bazel 8+) or an entry in `.bazelignore`; never rely on `npm_translate_lock(verify_node_modules_ignored=…)` as the guard. | That attribute is the deprecated Bazel-7.x path; a snippet carried forward keeps it and gets no protection on 8+, and Bazel's walk then collides with pnpm's tree (`rules-js…:210`). | `grep -n "ignore_directories" REPO.bazel; grep -n node_modules .bazelignore` on a repo whose `.bazelversion` is ≥ 8. **Both empty on a repo that has a `pnpm-lock.yaml` = finding.** | MUST | Bazel 8, 9; rules_js all; shapes C, E, F | M-K-05 |
| BZL-JS-05 | Route every custom rule, macro or `genrule` that runs a Node tool through `js_run_binary` or `js_binary_lib.run_binary_action`; never call `ctx.actions.run` on a JS binary directly. | rules_js runs Node tools with cwd inside `bazel-out`; a raw call sets no `BAZEL_BINDIR` and re-paths nothing, producing spurious "file not found" (`rules-js…:69-94`). | Restrict to `.bzl` files that load a rules_js symbol: `grep -rl "aspect_rules_js" --include=*.bzl . \| xargs grep -n "ctx.actions.run(" \| grep -v run_binary_action`. **Empty = pass.** (Correcting the dive's unscoped grep, which fires on every Starlark repo.) | MUST | Bazel 8, 9; rules_js 2.x/3.x; shapes A, F | M-K-04 |
| BZL-JS-06 | Never state that the `BAZEL_BINDIR` tax, the ESM sandbox escape, or automatic consumption of yarn's extensions database has been fixed without checking the issue state first; and read `fremtind/rules_vitest`'s "vite, vitest, react and jsdom must be installed at root" workaround as a symptom of the same ESM bug, not as a separate mystery to solve. | All three are old and open — `bazelbuild/bazel#15470` (2022-05-11), `rules_js#362` (2022-08-05, on the ruleset's own Known Issues), `rules_js#1215` (2023-08-14) — and age is exactly what makes an agent assume closure (`rules-js…:73,140-142,112`). The vitest ruleset's own troubleshooting doc says "we have not figured out why yet" and links #362, so the bug reappears wearing a different costume (`js-test-runners…` § 1). | `gh issue view 15470 -R bazelbuild/bazel --json state -q .state`, same for `362` and `1215` in `aspect-build/rules_js`. **`OPEN` = pass, the constraint holds as written; `CLOSED` = re-verify the whole finding before repeating it.** | MUST | Bazel 8, 9; rules_js all; shapes E, F | M-K-04, M-K-13 |
| BZL-JS-07 | Before writing a single BUILD target, set `hoist: false` in `pnpm-workspace.yaml`, run `pnpm install`, and get the full existing build and test suite green under plain pnpm. | This is the ruleset's own documented pre-check and the cheapest way to surface every phantom dependency rules_js will reject, at zero Bazel iteration cost — there is no upstream migration guide to follow instead (`rules-js…:124-126,179-193`). | `pnpm install && pnpm -r build && pnpm -r test` with `hoist: false` set. **A green run is a pass but proves nothing about code paths the suite never exercises — say so when reporting.** A red run enumerates the work; each failure routes to BZL-JS-08. | MUST | Bazel 8, 9; rules_js all; shapes C, E, F | M-K-08 |
| BZL-JS-08 | Classify every "module not found" into exactly one of three branches before fixing: a first-party `require` (add the package to the target's `data` and to `package.json#dependencies`), a genuine upstream under-declaration (add `pnpm.packageExtensions` **and re-run `pnpm install`**, because rules_js reads only the lockfile), or a plugin-discovery tool (`public_hoist_packages`). | It is the most common rules_js error, and guessing the branch — typically reaching for hoisting when the fix is a `data` dep — widens the hoist surface and hides the real bug (`rules-js…:100-122`). | Reading heuristic: does the failing `require` originate in first-party `srcs` (branch a), or inside `node_modules/<pkg>` — then read that package's own `package.json` to decide (b) versus a runtime string/glob plugin walk (c). For branch (b), check yarn's extensions database before hand-writing the entry; rules_js does not consume it. **No grep substitutes; there is no empty-output reading.** | MUST | Bazel 8, 9; rules_js all; shapes C, E, F | M-K-07 |
| BZL-JS-09 | When a plugin-pattern tool (eslint, prettier) needs `public_hoist_packages`, still declare an explicit dependency on the hoisted target. | Hoisting changes the tree layout, not the dependency graph; a hoist without the `data` edge still fails, and the second failure looks like the first (`rules-js…:113-122`). | For each entry in `public_hoist_packages`, grep the BUILD files for a matching `//:node_modules/<pkg>` dep. **Empty dep list for a hoisted package = finding.** | SHOULD | Bazel 8, 9; rules_js all; shapes E, F | M-K-09 |
| BZL-JS-10 | Review `lifecycle_hooks` / `lifecycle_hooks_exclude` / `lifecycle_hooks_execution_requirements` for any package whose install hooks matter, instead of trusting the default. | Hooks run as real, cacheable Bazel actions with `no-sandbox` set by default for speed; a hook that needs isolation to be correct misbehaves silently (`rules-js…:96-98`). | `jq '.pnpm.onlyBuiltDependencies // .pnpm.allowBuilds' package.json` cross-checked against `lifecycle_hooks*` in `MODULE.bazel`. **Empty (no hook allow-list at all) = pass, nothing needs attention.** | CONSIDER | rules_js all; pnpm ≥ 10.26 for the `onlyBuiltDependencies` name; shapes E, F | M-K-05 |
| BZL-JS-11 | Never report a `ts_project` as clean on the strength of `bazel build`; run `bazel test //pkg:name_typecheck_test` or `bazel build --output_groups=typecheck //pkg:name` before making the claim. | With any transpiler set — mandatory since rules_ts 2.0 — the default output group is JavaScript only and the typechecker never runs; the build goes green with a live type error (`rules-ts…:44-47,66-79`). | `bazel query 'filter("_typecheck_test$", //...)'` enumerates the gates; per target, confirm the label exists. **Empty output on a repo containing `.ts` sources under BUILD files is a FINDING, not a pass** — either no target generates the gate, or the wrong query was used. Do not use `kind(ts_project, …)`: it matches rule kinds and `ts_project` is a macro. (`--output_groups` verified present on 8.7.0 and 9.2.0.) | MUST | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F | M-K-01 |
| BZL-JS-12 | Make `bazel test` the CI verb of record for any package tree containing `ts_project` targets, over a target set that includes every `_typecheck_test`. | A `bazel build //...`-only pipeline is structurally incapable of failing on a type error, so BZL-JS-11's per-target gate is inert; and adoption that never reaches CI bought nothing (map § Conflicts resolved #2, 31.23% of the CI-adopting subset of Bazel projects never invoke Bazel there). | `grep -rn "bazel test" .github/workflows/` scoped to the migrated tree, then diff its target patterns against `bazel query 'filter("_typecheck_test$", //...)'`. **No `bazel test` anywhere = the whole repo is ungated (finding); a narrower pattern than `//...` needs the diff run explicitly.** | MUST | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F (cross-refs M-F-04) | M-K-01 |
| BZL-JS-13 | Name a `transpiler` on every hand-written `ts_project`; do not adopt `--@aspect_rules_ts//ts:default_to_tsc_transpiler` repo-wide as a way of never deciding. **pinned** | rules_ts removed the default in 2.0 precisely because none is universally right; the escape hatch is legitimate as a migration step and a defect as a permanent state (`rules-ts…:95-155,277-280`). | `grep -rn "ts_project(" --include=BUILD.bazel --include=BUILD .` then `buildozer 'print transpiler' //pkg:%ts_project` per package; plus `grep -rn "default_to_tsc_transpiler" --include='*bazelrc*' .`. **Empty from both (every call site names one, flag unset) = pass.** Where BUILD files come from Aspect's Gazelle plugin, BZL-JS-33 owns the case — the plugin cannot satisfy this row. | SHOULD | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F | M-K-02 |
| BZL-JS-14 | Start from `transpiler = "tsc"`; move a target to SWC only after confirming its `tsconfig.json` does not set `emitDecoratorMetadata`, that no runtime code mutates a named CJS export, and that a profile shows `tsc` on the critical path. **pinned** | SWC's two documented gaps — type-only import elision and ESM→CJS export mutability — are argued evidence from a GitHub Discussion, and both fail *at runtime*, not at build time; the reward is only speed (`rules-ts…:157-164,261-263`). Reverses that dive's SWC-first recommendation on evidence asymmetry, not on new facts. | `grep -rn "emitDecoratorMetadata" **/tsconfig*.json`; read the package for named-export mutation across a CJS boundary; `bazel build --profile=…` for the tsc share. **Empty first grep = SWC is the lower-risk option for that target; a hit = stay on tsc or escalate, never silently keep SWC.** | CONSIDER | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F | M-K-02 |
| BZL-JS-15 | Do not set `--@aspect_rules_ts//ts:validation_typecheck` in a checked-in rc file without an adjacent comment naming the tradeoff it accepts. | The flag turns type-checking into a validation action on *every* `bazel build`, reintroducing exactly the cost a custom transpiler and `isolated_typecheck` exist to avoid; the ruleset calls it discouraged (`rules-ts…:81-93`). | `grep -rn "validation_typecheck" --include='*bazelrc*' .`. **Empty = pass (flag unset, fast path intact).** A hit with a comment is an accepted exception; a hit without one is the finding. | MUST | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F | M-K-03 |
| BZL-JS-16 | Never let two `ts_project` targets list the same `.ts` path in `srcs`; and read `TS5033: EPERM` on a `bazel-out` path as that defect, never as a filesystem permission problem to fix with `chmod`, a retry, or `--sandbox_writable_path`. | Bazel allows one producer per output: built together the two targets error on conflicting `.js`; built separately the last one written wins silently — the family's only no-error corruption. `EPERM` is its downstream signature and pattern-matches OS permission errors in training data (`rules-ts…:179-202,312-315`). | Per package with more than one `ts_project`: `buildozer 'print srcs' //pkg:%ts_project` and intersect the lists. **Empty intersection = pass.** For a live failure, `--listFiles` plus `--explainFiles` shows whether a `.ts` was resolved where the sibling `.d.ts` belonged. (`--sandbox_writable_path` verified present on 8.7.0 and 9.2.0 — it exists, and is still the wrong reach.) | MUST | Bazel 8, 9; rules_ts any; shapes C, E, F | M-K-10 |
| BZL-JS-17 | On an unexplained `ts_project` compile failure — `TS6059` above all — run `bazel aquery` on the target and pass `--explainFiles` before editing `tsconfig.json` or `srcs`. | Bazel remaps output dirs and may include files the author never expected; guessing at glob edits wastes a cycle and can silently drop a file that belonged (`rules-ts…:302-310`). | `bazel aquery 'mnemonic("TsProject", //pkg:target)'` and read `Inputs:`/`Command Line:`; add `--explainFiles` (TypeScript ≥ 4.2) for the "The file is in the program because:" trailer. **Empty aquery output for a target that supposedly built means the wrong label was queried — re-run, do not read it as clean.** | SHOULD | Bazel 8, 9; rules_ts any; TypeScript ≥ 4.2; shapes C, E, F | — |
| BZL-JS-18 | Do not edit `outDir` or `declarationDir` in a `tsconfig.json` feeding a `ts_project` expecting output to move. | Bazel ignores both and always writes under `bazel-out/…/bin`; `validate = True` checks alignment but nothing stops a plausible, inert value from misleading the next reader (`rules-ts…:292-295`). | `grep -nE '"outDir"\|"declarationDir"' tsconfig.json` in packages with a `ts_project`. **Empty = nothing to check; a hit is not automatically wrong but must be read as decoration, not configuration.** | CONSIDER | Bazel 8, 9; rules_ts ≥ 2.0; shapes C, E, F | — |
| BZL-JS-19 | Answer `TS2786`/`TS7016` by fixing the offending package's declared dependencies (or a scoped `pnpm.packageExtensions`), not by turning on `skipLibCheck` repo-wide. | The error is a real defect npm's flat hoisting used to hide — a package exposing a type from its own `devDependency`; blanket `skipLibCheck` disables checking inside *every* dependency to silence one (`rules-ts…:187-196,317-319`). | Read the named package's own `package.json` for whether the `@types/*` entry belongs in `dependencies`. **Reading heuristic; no grep substitutes.** A new repo-wide `skipLibCheck` appearing in the same diff as the error is the finding. | SHOULD | Bazel 8, 9; rules_ts any; rules_js strict deps; shapes C, E, F | — |
| BZL-JS-20 | Never set `isolated_typecheck = True` on a target whose `tsconfig.json` lacks `"isolatedDeclarations": true`. | The action-graph split without the tsconfig option removes no sequential cost, and the option may not even be legal until the codebase's exported symbols carry explicit annotations (`rules-ts…:204-232,327-330`). | `grep '"isolatedDeclarations"' tsconfig.json` for the target's config, and confirm `tsc --noEmit` is green under it before touching the BUILD file. **Absence = finding.** | MUST | Bazel 8, 9; TypeScript ≥ 5.5; rules_ts with `isolated_typecheck`; shapes E, F | M-K-11 |
| BZL-JS-21 | Roll `isolated_typecheck` out per target, starting from the highest-fan-out, slowest-to-typecheck libraries; never flip it repo-wide in one change. | The measured win came from an incremental ~90% migration; `isolatedDeclarations` demands source changes, so an all-at-once flip is a large diff with no checkpoint (`rules-ts…:234-245,322-325`). Single vendor-relayed data point — sized accordingly. | `bazel query 'rdeps(//..., //candidate:lib)'` to rank candidates; confirm the `_typecheck` target green before and after each flip. **Empty rdeps = a leaf, i.e. a poor candidate, not a pass.** | CONSIDER (SHOULD above ~a few hundred `ts_project` targets) | Bazel 8, 9; TypeScript ≥ 5.5; shapes E, F | M-K-11 |
| BZL-JS-22 | Replace any ported `ts_project(supports_workers = True/False)` with the tri-state `-1`/`0`/`1`, or drop the attribute. | The attribute changed type in rules_ts 2.0 and persistent-worker mode is no longer the default; a boolean either errors or means something the author did not intend (`rules-ts…:332-335`). | `grep -rn "supports_workers" --include=BUILD.bazel --include=*.bzl .` and check each value. **Empty = nothing to check — now the common case.** | MUST | Bazel 8, 9; rules_ts ≥ 2.0; shapes E, F | — |
| BZL-JS-23 | Profile `NpmPackageExtract` before adding `--modify_execution_info=NpmPackageExtract=+no-remote-cache`, and never add it in a repo configured with `--remote_executor`. | Tree artifacts are fetched file-by-file, so in a cache-only setup re-extracting locally can beat the cache — the ruleset declines a universal default. Under RBE the extracted outputs must reach the CAS regardless, so the opt-out forces redundant re-extraction on every worker (`rules-js…:144-153`). | `bazel build --profile=/tmp/p.json …` then sum the `NpmPackageExtract` mnemonic; plus `grep -l remote_executor .bazelrc*` and `grep -l "NpmPackageExtract=+no-remote-cache" .bazelrc*` — **both matching is the smell; both empty = pass.** No `NpmPackageExtract` entries in the profile = the exception does not apply. (`--modify_execution_info`, `--remote_executor`, `--remote_download_minimal` all verified present on 8.7.0 and 9.2.0.) | SHOULD | Bazel 8, 9; rules_js all; shapes E, F | M-K-12 |
| BZL-JS-24 | Give a `js_test` or `vitest_test` with many instrumented files a larger `size`/`timeout` for `bazel coverage` than for `bazel test`, and prove the run instrumented something — a runfiles tree **and** a non-zero `DA:` count — before quoting any coverage number. | The lcov conversion runs inside the test's own spawn and budget. That is a Bazel-core property, not a rules_js quirk: `collect_coverage.sh` is substituted for the test binary by `TestActionBuilder.java` for every ruleset, and `--experimental_split_coverage_postprocessing` / `--experimental_fetch_all_coverage_outputs` both default **false** on 8.7.0 and 9.2.0 (re-measured in-session on this WSL2 host; a CI runner with those flags flipped on splits post-processing into its own spawn, which still belongs to the same `TestRunnerAction` and can still TIMEOUT). Without runfiles the report is empty while the test passes. And with `--instrumentation_filter` unset Bazel auto-computes it from the **test target's own package**, so a `//lib/foo` implementation exercised from `//tests/foo` is instrumented not at all — a silent 0%, no error (`rules-js…:155-164`; `coverage-across-rulesets…` §§ 1–2). | `bazel coverage //pkg:target`, then all three: grep the log for `code coverage requires a runfiles tree`; read back the `--instrumentation_filter` Bazel prints as an INFO line and confirm it covers the code under test, not just the test's package; and `grep -c '^DA:' <the _coverage_report.dat path Bazel prints>`. **Absence of a timeout and absence of the runfiles string is NOT a pass — a zero `DA:` count is exactly the failure this row exists to catch.** Enumerate candidates with `bazel query 'kind("js_test\|vitest_test", //...)'`. | SHOULD | Bazel 8, 9; rules_js all; `fremtind/rules_vitest` where used; Windows needs `--enable_runfiles`; shapes E, F | M-K-16 |
| BZL-JS-25 | Depend on first-party code under test as a `js_library`, never as a repackaged `npm_package`, whenever that code's coverage matters. | `npm_package` produces a store copy with no link back to sources, so coverage reports empty by design, not by bug (`rules-js…:162`). | `bazel query 'kind("js_test\|vitest_test", //...)'`, then per test `bazel query 'deps($t) intersect kind(npm_package, //...)'`. **Empty = pass — but only from the widened kind pattern: `kind(js_test, …)` alone silently misses every `fremtind/rules_vitest` target, and an empty result from the narrow query on a vitest repo is a wrong query, not a clearance.** | MUST (where coverage of that code is required) | rules_js all; shapes E, F | M-K-16 |
| BZL-JS-26 | Check a framework's own config for output-layout assumptions — Next.js `output: "standalone"`, Astro, SvelteKit dev codegen — before wiring it to `js_binary`/`js_run_binary`. | These tools write into their own idea of `node_modules`/`src` and fail Bazel's tree-artifact validation with a symlink-resolution error, not a recognisable import error, and no blanket fix exists (`rules-js…:166-177`). | Reading heuristic: grep the framework config for `output: "standalone"`, an `outDir` inside `src`, or docs requiring a real `node_modules`. **Heuristic; no single grep covers every framework, so empty output is not a clearance.** | SHOULD | rules_js all; shapes E, F | M-K-14 |
| BZL-JS-27 | Pick one of the two documented shapes for a monorepo's shared `dist/` — a single root BUILD file, or per-package `dist` under each package — rather than improvising a genrule copy chain. | A package's outputs must live under its own output tree; an arbitrary layout does not build, and the error invites ever-larger copy-chain workarounds instead of a restructure (`rules-js…:216`). | Read the BUILD layout against the two shapes; the build's own "output file … is not under this package's directory" error is the trigger. **Structural decision, not a lint — no empty-output reading.** | CONSIDER | Bazel 8, 9; rules_js all; shapes C, E, F | M-K-14 |
| BZL-JS-28 | Route a vitest package to `fremtind/rules_vitest`'s `vitest_test` rather than hand-rolling a `js_test` around the vitest CLI — and record in the same commit that it is community-run, and that watch mode, `vitest.config.ts` auto-discovery and vitest's own worker-pool concurrency do not survive the move. | It is a real Bazel-aware rule (its own `bazel_sequencer.mjs`, snapshot reporter and generated config), not a bare wrapper — but it is a fork of Aspect's `rules_jest` by a third party, seven months since its last tag, with an admitted unsolved bug it links to `rules_js#362` (BZL-JS-06). Under `bazel test` a one-shot process replaces the long-running watcher; `config` accepts only `.js`/`.cjs`/`.mjs`, so a TS config must be pre-transpiled; sharding is reconciled by the ruleset, not by the user (`js-test-runners…` § 1). | `gh api repos/fremtind/rules_vitest/tags --jq '.[].name' \| sort -V \| tail -3` and `gh api repos/fremtind/rules_vitest --jq .pushed_at`, compared against today's date, before pinning. **An absent repo or MODULE.bazel means the fork moved or was deleted — re-derive from scratch, never read it as "no constraint".** | CONSIDER | Bazel 8, 9; rules_js ≥ 2.0.0 (the ruleset's own floor); shapes C, E, F | — |
| BZL-JS-29 | Never wire a `bun test` suite to a Bazel target on the assumption a ruleset exists — none does; the package converts to pnpm first (BZL-JS-01/03) before the test question is even reachable. A `@vscode/test-electron` suite **does** have a path — an ordinary `js_test`, no ruleset — but wire it only with `tags = ["e2e", "no-remote-exec", "requires-network"]`, a host-installed `Xvfb` binary on every runner image, VS Code re-downloaded on each clean run, and the user-data socket created under the host tmpdir; never present that target as cacheable, remote-executable or hermetic. | There is still no `rules_bun`, no bun-test ruleset and no lockfile ingestion path (BZL-JS-03) — a materially stronger gap than the other half. **Corrected in the wave-5 round:** the vscode-test conclusion had been reasoned by mechanism, and the mechanism argument was wrong. `angular/angular` runs `vscode-ng-language-service`'s `@vscode/test-electron` + Xvfb suite as a real `js_test` today. Its four costs are read straight from that BUILD file and `index.ts`: `requires-network` because `@vscode/test-electron` downloads the pinned VS Code build per invocation with no Bazel-level caching of the ~100MB binary; `no-remote-exec` because RBE workers have no Xvfb; the `xvfb` npm package shells out to a **host-installed** binary, so the action is non-hermetic by construction; and VS Code's user-data lock socket fails `EROFS` under `TEST_TMPDIR`, worked around with a `mkdtemp` under the host's own tmpdir (`bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` § 5b; frame § Wave 5, item 10). | `gh search repositories "rules_bun"` — **no purpose-built ruleset in the result is the pass for bun's "no path exists"; record the query, because empty here is evidence, not a failed search.** For a vscode-test target: `buildozer 'print tags' //pkg:target` must list all three of `e2e`, `no-remote-exec`, `requires-network`, and the runner image must answer `command -v Xvfb`. **A missing tag, or empty output from `command -v Xvfb`, is the finding — an empty tag list is never a pass.** Before declaring any *other* JS tool a structural non-starter, run `gh api search/code` for its own import string plus `BUILD.bazel` and record the query; that search is what overturned this row. | MUST | rules_js all; shapes E, F | — |
| BZL-JS-30 | Route a Playwright suite to the BCR module `rules_playwright`, and confirm from BCR metadata that the name resolves to `github:mrmeku/rules_playwright` before adding the `bazel_dep`. | Two unrelated GitHub projects carry that display name. Only `mrmeku/rules_playwright` is BCR-published (v0.5.4, pushed 2026-03-06) and provides sha256-pinned browser downloads through a module extension composed with `npm_link_all_packages()` and a plain `js_test`. The other (`collider-bazel-extensions`) has 0 stars, is not on the BCR, and pins Playwright 1.49 with macOS support "validation pending" (`js-test-runners…` § 1). | `gh api repos/bazelbuild/bazel-central-registry/contents/modules/rules_playwright/metadata.json --jq .content \| base64 -d` and confirm `"repository": ["github:mrmeku/rules_playwright"]`. **A different repository string, or a 404, means stop — never fall back to a GitHub name search, which is what surfaces the wrong project.** | MUST (where a Playwright suite is being Bazelified) | Bazel 8, 9; rules_js all; shapes C, F | — |
| BZL-JS-31 | Prescribe exactly two things for editor and tsserver resolution in a rules_js/rules_ts repo — a real `node_modules` at the source root from an ordinary, non-Bazel `pnpm install`, and a `paths` entry in a committed root `tsconfig.json` for first-party workspace imports. Never offer `npm_link_all_packages()`, a `bazel run` link step, or a symlinked `node_modules` as the editor mechanism. | rules_js's own `docs/faq.md` § "Making the editor happy" prescribes exactly those two and nothing else; `npm_link_all_packages()` generates `//:node_modules/<pkg>` **Bazel-graph targets** that tsserver never sees. rules_ts's own example config carries the inline comment that `paths` is "for the editor to resolve packages within the workspace… this isn't needed for Bazel". `path_mapping.md` and `use_execroot_entry_point.md` are build-action documents with no editor content (`js-test-runners…` § 2). | `test -d node_modules` at the source root, and `jq '.compilerOptions.paths' tsconfig.json` on the committed root config. **A missing source-root `node_modules`, or `null` from `jq` on a repo whose sources import a first-party workspace package, is the finding.** An inline-dictionary `tsconfig` attribute with no on-disk file is a finding for the same reason — rules_ts's own doc warns that editors then skew. | MUST | Bazel 8, 9; rules_js ≥ 3.0.0; rules_ts ≥ 2.0; shapes C, E, F | — |
| BZL-JS-32 | Never judge a JS ruleset's health by grepping its README for "maintained" or "deprecated", and never read GitHub's `/releases/latest` as the current version — read the tag list sorted by semver and compare the newest tag's date against today. | None of the six surveyed bundler/test rulesets uses either word, so the grep returns nothing on a five-week-old release and on an 18-month-stale one alike. And `gh api repos/aspect-build/rules_js/releases/latest` returns **v2.9.3**, a 2.x-line patch published 110 minutes after v3.4.1 the same day, because "latest" is newest by clock, not by semver — an agent trusting it reports the wrong major (`js-test-runners…` §§ 1, 3). The usable second signal is doc rot: a `WORKSPACE`-snippet instruction sitting beside an existing `MODULE.bazel` (`rules_rollup`, `fremtind/rules_vitest`). | `gh api repos/<org>/<repo>/tags --jq '.[].name' \| sort -V \| tail -5` plus `gh api repos/<org>/<repo> --jq .pushed_at`. **An empty README grep for "maintained"/"deprecated" reads as nothing at all — never as "unknown, proceed with caution", and never as a clearance.** | MUST | any JS ruleset; shapes C, E, F | — |
| BZL-JS-33 | Never assume Aspect's JS/TS Gazelle plugin sets `transpiler=` on a generated `ts_project` — it never emits the attribute. Resolve it one of exactly two ways and write down which: hand-patch each generated target with a `# keep`-anchored `transpiler=`, or adopt `--@aspect_rules_ts//ts:default_to_tsc_transpiler` as a reviewed, commented exception. | `transpiler` is absent from the plugin's own `Kinds()` map and from all 1,810 lines of `generate.go`, and the generated call loads the native `ts_project` macro, so nothing downstream can inject a default; rules_ts ≥ 2.0 hard-`fail()`s without one. The plugin's own e2e smoke test sets the repo-wide flag permanently, and no open issue tracks the gap at all (`gazelle-plugin-maturity…` § Q1). This is the one row that makes "BUILD files are generated, never hand-written" unachievable for shapes C and E without a named exception. | `buildozer 'print transpiler' //pkg:%ts_project` per package — buildozer matches the call name in the file, so it survives the macro — plus `grep -rn "default_to_tsc_transpiler" --include='*bazelrc*' .`. **A `ts_project` with an empty `transpiler` and no adjacent `# keep`, or a flag hit with no comment, is the finding; empty from both = pass.** Do not substitute `bazel query 'kind(ts_project, …)'`: the follow-up proposed exactly that, and it matches rule kinds, so it returns empty on a repo full of `ts_project` calls (Verdict 4). | MUST | Bazel 8, 9; rules_ts ≥ 2.0; `aspect_gazelle_js` 1.2.1; shapes C, E, F | — |
| BZL-JS-34 | Read `pnpm-lock.yaml`'s `lockfileVersion` before adopting Aspect's JS/TS Gazelle plugin: only majors 5, 6 and 9 resolve at `aspect_gazelle_js` 1.2.1. | The plugin's `pnpm/parser.go` reads the first `lockfileVersion:` line and dispatches on the major, erroring on anything else. pnpm 12's multi-document lockfile is an open bug (aspect-gazelle#461, filed 2026-09-01, with two competing fix PRs unmerged as of 2026-09-05), so npm-import resolution fails outright on a pnpm-12-locked workspace (`gazelle-plugin-maturity…` § Q1). | `head -1 pnpm-lock.yaml`. **A major outside {5, 6, 9} with this plugin pinned is a finding; a missing file is BZL-JS-01's finding, not this row's pass.** | SHOULD | `aspect_gazelle_js` 1.2.1; pnpm ≥ 9; shapes C, E, F | — |
| BZL-JS-35 | Never name `ts_proto_library` as the current TypeScript protobuf path. Its replacement is `rules_js`'s `js/proto.bzl` — one ordinary `proto_library` referenced from an ordinary `js_library`'s `deps`, with a `js_proto_toolchain` behind it — and it ships marked EXPERIMENTAL, so name that status every time you recommend it. | `ts_proto_library`'s own docstring at rules_ts v3.10.1 reads "**This API has been replaced** by rules_js", and the replacement's own header warns it "is subject to breaking changes outside our usual semver policy" (`aspects-vs-macros-protobuf-and-execution-groups.md` § 2, NEW-5). An agent citing the deprecated rule ships a migration the ruleset already abandoned; an agent citing the replacement as stable ships a dependency on an unstable API. | `grep -rn "ts_proto_library" --include=BUILD.bazel --include=BUILD --include=*.bzl .` — **empty = pass.** Before recommending the replacement, re-read the header of `rules_js`'s `js/proto.bzl`: **removal of the EXPERIMENTAL banner, not a version number, is what makes it citable as stable.** | MUST | Bazel 8, 9; rules_ts 3.10.1; rules_js `main`; shapes E, F | — |
| BZL-JS-36 | Before running Aspect's JS/TS Gazelle plugin, confirm that **every** directory holding a `package.json` it will visit appears as an `importers:` key in the one configured `pnpm-lock.yaml`; a directory that `pnpm-workspace.yaml` globs but pnpm never installed (an npm- or yarn-managed member) must become a real pnpm workspace member first — there is no `# gazelle:` directive that fixes it, only `off`/`warn` validation or hand-maintaining that package's BUILD file. | `aspect_gazelle_js` 1.2.1 decides pnpm-project membership **solely** from the lockfile's parsed `importers:` map (`addPnpmLockfile()` in `configure.go`), never from `pnpm-workspace.yaml`'s glob patterns, while `readConfigurations()` records every `package.json` directory regardless. For a non-importer directory `IsProject()` is false, so neither the public package target nor `npm_link_all_packages` is generated, and `resolve.go` returns `Resolution_NotFound` for every bare-specifier import; under the plugin's own default `js_validate_import_statements = error` that is a hard, named generation-time failure ("Import … is an unknown javascript dependency"), not a silent gap — the same loud shape the corpus found for rules_python's import validation. `creeptd-ng`'s `web` (glob-listed, npm-managed) is exactly this shape, and full pnpm conversion is the only fix: no npm/yarn/bun lockfile ingestion path exists in this plugin (`bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` § 5a, source-traced at `js-v1.2.1`; frame § Wave 5, item 9). | Against the lockfile the `# gazelle:js_pnpm_lockfile` directive names (default `pnpm-lock.yaml`): `awk '/^importers:/{f=1;next} /^[^[:space:]]/{f=0} f&&/^  [^[:space:]]+:/{sub(/:[[:space:]]*$/,"");gsub(/^ +/,"");print}' pnpm-lock.yaml \| sort > /tmp/imp` and `find . -name package.json -not -path '*/node_modules/*' \| xargs -n1 dirname \| sed 's#^\./##' \| sort > /tmp/pkg`, then `comm -13 /tmp/imp /tmp/pkg`. **Empty `comm` output = pass. Every line it prints is a directory Gazelle will visit and refuse to resolve — a will-fail-generation finding, not a warning to defer. An empty importer extraction on a repo that HAS a `pnpm-lock.yaml` means the lockfile carries no `importers:` block at all (a single-project lockfile, not a workspace) — a wrong query for this check, never a clearance.** | MUST | `aspect_gazelle_js` 1.2.1; pnpm ≥ 9 (majors 5/6/9 per BZL-JS-34); shapes C, E, F | — |

## Applied to rules_ocx

`rules_ocx` has **zero JS or TypeScript targets**: greps for `rules_js`,
`rules_ts`, `ts_project`, `npm_translate_lock`, `js_binary`, `pnpm` and
`node_modules` over every `.bzl`, `BUILD.bazel` and `MODULE.bazel` return
nothing (re-run 2026-09-05; matches
`bazel-audit/starlark-code-shape.md:293` and
`bazel-audit/config-inventory.md`'s own pass). There is no `package.json`
anywhere in the repo. So the honest statement is: **this group has no fleet
instance today, and thirty-two of the thirty-six rules cannot be exhibited
by any fleet repository.** What the fleet would have to build to exhibit them is
named at the end of this section.

**Satisfies (by construction, not by choice)**

- BZL-JS-01/02/03: no lockfile of any kind is wired into Bazel; the only
  committed lockfile in the repo is `MODULE.bazel.lock`
  (`bazel-audit/build-contracts-and-ci-posture.md:41`).
- BZL-JS-13/15/22/35: no `ts_project`, no `validation_typecheck`, no
  `supports_workers`, no `ts_proto_library` — `grep -rn
  "validation_typecheck\|supports_workers\|ts_proto_library"` returns nothing.

**Violates, or would violate on the first JS target**

- **BZL-JS-12 — the fleet's one Bazel repo already ships build-only CI legs.**
  `.bcr/presubmit.yml` runs a single `verify_test_module` task *building*
  `//...` across 8 cells (`build-contracts-and-ci-posture.md:252`), and
  `e2e/bzlmod`'s own module docstring calls itself a "Build-only smoke test"
  (`:287`). Those legs are correct for what they assert today; the day a
  `ts_project` lands in `e2e/` they become a false green, because a build-only
  invocation cannot fail on a type error. This is the pattern BZL-JS-12 exists
  to catch, present in the fleet now.
- **BZL-JS-04 — no `REPO.bazel` exists** (`ls /home/mherwig/dev/rules_ocx/REPO.bazel`
  → absent) and `.bazelignore` lists exactly `examples`, `e2e`,
  `.agents/worktrees` (`/home/mherwig/dev/rules_ocx/.bazelignore:1-3`). A repo
  pinned to Bazel 8.7.0 whose CI also runs 9.x has no `ignore_directories()`
  file at all; adding any pnpm workspace without that line is a walk collision
  on day one.

**New commitments this consolidation makes**

- BZL-JS-11's corrected verification (`filter("_typecheck_test$", …)`, never
  `kind(ts_project, …)`) is new — it did not exist in either dive and it
  reverses an empty-output reading from "pass" to "finding". BZL-JS-33 rejects
  the same broken query a second time, this time against a follow-up that
  proposed it.
- The tsc-first pin (BZL-JS-14) is new and contradicts the dive it consolidates.
- BZL-JS-24's empty-output reading was **narrowed** in this revision: "no
  timeout, no runfiles error" no longer reads as a pass, because it does not
  exclude the auto-computed `--instrumentation_filter` measuring nothing.
- BZL-JS-25's and BZL-JS-24's target enumeration was **widened** to
  `kind("js_test|vitest_test", …)`: the previous narrow kind silently missed
  every `fremtind/rules_vitest` target.
- Twelve rows verify against `package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `tsconfig.json` or a source-root `node_modules` —
  files deliberately outside the glob (`bazel-topic-map.md:706-714`). They reach
  context only via index routing, and the closing edit is not yet done.

**What the fleet would have to build to exhibit this group**: one `MODULE.bazel`
with `npm_translate_lock` against a converted `pnpm-lock.yaml` in a TypeScript
package — `ocx-catalog` or `grimoire-indexer` are the cheapest, being npm,
`tsc`-only, no bundler, mapping straight onto `ts_project`
(`bazel-audit/fleet-bazel-readiness.md:157-158,261`). Until then every rule here
is grounded on the rulesets' own docs and source plus the practitioner corpus —
shape F, per the map's own framing (`bazel-topic-map.md:13-82`, item 4).

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds through
  two rows only: BZL-JS-05 the day it ships a Node-based action, and BZL-JS-12,
  whose build-only-CI failure mode is already present (`ci` audit `:252,:287`).
- **B — Rust CLI + Python harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`).** Does not bind — no TypeScript in any of them.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** Binds fully, and is the
  fleet's most tangled instance: `pnpm-workspace.yaml` declares `web` as the sole
  member while `web` is actually managed with npm
  (`bazel-audit/fleet-bazel-readiness.md:164,273`), so BZL-JS-01's conversion is
  half-done on paper and undone in fact; checked-in protobuf-generated `.ts`
  under `src/gen/` (`:164`) is a live BZL-JS-16 hazard the moment two targets
  glob it, and the shape where BZL-JS-35 would bite if that codegen were ever
  Bazelified. **Corrected this revision:** `creeptd-ng/web` is a *fourth* vitest
  consumer (BZL-JS-28), and the repo's e2e WASM smoke test is the fleet's only
  Playwright suite (BZL-JS-30) — so the runner rows land in shape C, not only in
  shape E. Its mixed pnpm/npm workspace is the exact shape BZL-JS-36 now owns —
  source-traced in the wave-5 round, no longer an open question: `web` is
  glob-listed in `pnpm-workspace.yaml` but absent from `pnpm-lock.yaml`'s
  `importers:`, so Aspect's `js` plugin never treats it as a pnpm project and
  Gazelle generation fails outright until `web` is a real pnpm member.
- **D — Python library or automation.** Binds only at `index/bot-tools`, the
  fleet's one repo where a `rules_js` VitePress build would sit beside
  `py_binary` targets in the same `MODULE.bazel` (`:259`).
- **E — TypeScript package, extension or Action (8 packages).** The primary
  consumer. Six npm packages need the BZL-JS-01 conversion; `setup-ocx` and
  `kate-middlechild` are bun-locked with **no ingestion path and no test-runner
  path** (`:162-163,166,264-265`; BZL-JS-03 and BZL-JS-29 are the two halves).
  `ocx-catalog` and `grimoire-indexer` map onto `transpiler = "tsc"` with zero
  friction (`:157-158,261`) and are vitest packages (BZL-JS-28);
  `grimoire-vscode`/`vscode-ocx` need the transpiler extension point for esbuild
  (`:159-160,262`) and run `@vscode/test-electron`, which does have a Bazel path
  but only under BZL-JS-29's three tags, a runner image that ships `Xvfb`, and a
  CI posture that permits `requires-network` — untested against these two
  packages' actual CI; `kate-middlechild`'s Astro build is the exact BZL-JS-26 trap
  (`:163,265`). Every package in this shape also needs BZL-JS-31's editor setup,
  because none of them stops using an editor when Bazel arrives.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Every one
  of the thirty-six rows binds. This is the shipping audience, and the reason
  the group ships despite having no fleet instance.

## AI-agent failure modes

Ranked by how often it bites, each with its mechanical check. Items 13–19 come
from the wave-4a follow-up round and are appended rather than re-ranked.

1. **Reports "the build passed" after `bazel build //pkg:my_ts_project` and
   stops.** The sharpest failure mode in the entire corpus. Check: BZL-JS-11 —
   `bazel test //pkg:my_ts_project_typecheck_test` before the claim
   (`rules-ts…:348`).
2. **Ports a 1.x/2.x-era snippet.** No `transpiler=` (hard-fails with "Required
   Transpiler Selection"), `npm_install`/`yarn_install` from the unmaintained
   `build_bazel_rules_nodejs`, removed `npm_translate_lock` attributes,
   `supports_workers = True`. Check: BZL-JS-02 and BZL-JS-22's greps
   (`rules-js…:231-232`, `rules-ts…:349,352`).
3. **Silences `TS2786`/`TS7016` with a blanket `skipLibCheck`.** A plausible
   one-line fix that disables checking inside every dependency. Check:
   BZL-JS-19 — read the failing package's `package.json` first
   (`rules-ts…:350`).
4. **Reaches for `public_hoist_packages` when the fix is a `data` dep.** Widens
   the hoist surface and buries the real under-declaration. Check: BZL-JS-08's
   three-branch classification before any edit (`rules-js…:204`).
5. **Treats `TS5033: EPERM` as an OS permissions problem** and reaches for
   `chmod`, a sandbox flag, or a retry loop. Check: BZL-JS-16 — intersect the
   `srcs` of the package's `ts_project` targets (`rules-ts…:351`).
6. **Writes `ctx.actions.run` against a JS binary in a custom rule.** No
   `BAZEL_BINDIR`, no re-pathing, spurious "file not found". Check: BZL-JS-05's
   scoped grep (`rules-js…:75-94`).
7. **Invents `bun_lock =` on `npm_translate_lock`** because bun "is basically
   npm". Check: BZL-JS-03 — the attribute list in the ruleset source
   (`rules-js…:233`).
8. **Edits `outDir`/`declarationDir` to relocate Bazel's output.** Bazel ignores
   both. Check: BZL-JS-18 (`rules-ts…:354`).
9. **Flips `isolated_typecheck = True` without touching `tsconfig.json`.** The
   parallelism win is contingent on `isolatedDeclarations`. Check: BZL-JS-20
   (`rules-ts…:353`).
10. **Assumes an old open issue was "surely fixed by now"** — `#362`, `#15470`,
    `#1215`. Check: BZL-JS-06's `gh issue view` (`rules-js…:235`).
11. **Wires Next.js standalone, Astro or SvelteKit straight into `js_binary`**,
    assuming bazel-out-as-cwd makes any Node tool work. Check: BZL-JS-26
    (`rules-js…:236`).
12. **Relies on `verify_node_modules_ignored` alone on Bazel 8+.** Check:
    BZL-JS-04 (`rules-js…:234`).
13. **Reports the current rules_js version from `/releases/latest`** and names
    2.9.3 — an old 2.x patch published 110 minutes after 3.4.1. Check:
    BZL-JS-32 — the tag list sorted by semver, never the `latest` shortcut.
14. **Runs Aspect's Gazelle, sees BUILD files appear, and reports success.**
    The generated `ts_project` carries no `transpiler=`; the failure arrives
    later as `fail("Required Transpiler Selection")` — or never, if an earlier
    migration already left `default_to_tsc_transpiler` set repo-wide. Check:
    BZL-JS-33.
15. **Treats `aspect_gazelle(with_check = True)` as "the CI gate is wired".**
    It produces an `sh_binary`, so `bazel test //...` catches no BUILD drift.
    Check: `bazel query 'kind("sh_test", //:gazelle*)'` — empty on a repo that
    believes it has a freshness gate is the finding (owned by BZL-ARCH-12,
    named here because JS/TS is where the false friend lives).
16. **Prescribes `npm_link_all_packages()` — or a symlinked `node_modules`, or
    a `bazel run` link step — as the fix for a broken editor.** None of the
    three is what the rulesets prescribe; the answer is a plain `pnpm install`
    plus tsconfig `paths`. Check: BZL-JS-31.
17. **Reaches for `ts_proto_library` for proto-to-TypeScript.** Deprecated in
    its own docstring at 3.10.1. Check: BZL-JS-35 — and name the replacement's
    EXPERIMENTAL status rather than quietly dropping it.
18. **Reports coverage green because the test passed and no runfiles error
    appeared**, with zero `DA:` records because the auto-computed
    `--instrumentation_filter` matched only the test's own package. Check:
    BZL-JS-24's three-part verification.
19. **Grep a README for "maintained"/"deprecated" and reports the ruleset's
    health from the result.** Neither word appears in any of the six surveyed
    JS rulesets, so the grep is empty for a five-week-old release and an
    18-month-stale one alike. Check: BZL-JS-32.

## Open questions

**Needs a human decision**

1. **Keep the tsc-first pin (BZL-JS-14), or follow the ruleset's SWC-first
   recommendation?** Default taken here: tsc-first, because the risk is a silent
   runtime miscompile on argued evidence and the reward is speed with no fleet
   measurement. One row edit reverses it.
2. **Is `fremtind/rules_vitest` acceptable as a dependency at all, or is a
   hand-rolled `js_test` around the vitest CLI the safer trade?** Default taken
   here: CONSIDER the ruleset (BZL-JS-28), because it carries real
   Bazel-sharding and snapshot integration a wrapper would lose. The cost is a
   dependency on a seven-month-stale community fork with one admitted unsolved
   bug. Reversible in one row; no fleet package exercises either path today, so
   there is nothing to measure against.

**Deserves another research round**

None. The wave-5 convergence round answered both rows that stood here, and each
became a rule rather than a question: Aspect's `js` Gazelle plugin against a
mixed package-manager workspace → **BZL-JS-36** (source-traced: membership comes
from `importers:`, generation fails outright, full pnpm conversion is the only
fix), and `@vscode/test-electron` under Bazel → **BZL-JS-29**, corrected from
"structural non-starter" to a working `js_test` with named tags and costs. The
program declares convergence for this family (frame § Wave 5, convergence
verdict).

**Documented gaps — findings, not questions**

- **M-K-15, the "0 to 100%" partial-Bazelification cliff.** Searched across
  Aspect's full 81-post blog index, Canva's and Wix's engineering blogs and the
  BazelCon 2025 recap: no organisation anywhere publishes cache-hit rate or CI
  time as a function of percentage-of-codebase-under-Bazel for a JS/TS monorepo.
  Aspect's "Principles of a Bazel Migration" argues for gradual accrual without
  measuring it; no counter-measurement exists either. Writing a rule on it would
  ship a preference as a finding. It stays out of the ruleset.
- **`rootDirs` (plural) is undocumented in both rulesets.** Neither rules_js nor
  rules_ts mentions it anywhere; only singular `rootDir` and `paths` appear. A
  repo that genuinely needs the virtual-merge behaviour is in unguided
  territory as of 2026-09-05.
- **Twelve rows verify against files the rule never loads on.** The frame's
  Decision 4 ships `bazel-essentials` self-contained and defers the Q4 pointer
  edit into `typescript-packaging.md` to separate work; until that lands, an
  agent editing `package.json`, `pnpm-lock.yaml` or `tsconfig.json` inside a
  Bazel repo is not routed here (frame § Decisions after the map, row 4; § Wave
  2, item 11; map M-I-02).
- **`aspect_gazelle(with_check = True)` gives JS/TS no `bazel test` freshness
  gate.** The macro emits an `sh_binary`; a real gate needs `gazelle_test`
  hand-wired against the prebuilt binary. Owned by BZL-ARCH-12; recorded here
  because JS/TS is the ecosystem where the convenience flag looks most like the
  gate it is not.

**M-K rows this ruleset does not settle**

- **M-K-15** — the only one, now with its search perimeter recorded above.

All fifteen other rows — M-K-01 through M-K-14 and M-K-16 — are settled by the
table above.

## Revision log

One line per change. This is what a later author diffs against.

| Date | What changed | IDs | Why | Input |
|---|---|---|---|---|
| 2026-09-06 | Rule count 27 → 35; MUST count 15 → 21. Preamble gains a blanket statement that every grep/buildozer row reads checked-in files only and cannot see generated external-repo BUILD text. | — | House standard; frame § Wave 2, item 9. | frame |
| 2026-09-06 | **Empty-output reading narrowed from pass to finding.** "No timeout, no runfiles error" no longer clears a coverage run; a non-zero `DA:` count and a read-back `--instrumentation_filter` are now required. Rationale re-grounded on Bazel-core `collect_coverage.sh` rather than a rules_js quirk. | BZL-JS-24 | The old reading passed a run that instrumented nothing, because Bazel auto-computes the filter from the *test's* package. This is the overclaim class. | coverage follow-up; frame § Wave 4a, item 3; in-session flag measurement |
| 2026-09-06 | Target enumeration widened from `kind(js_test, …)` to `kind("js_test\|vitest_test", …)`; narrow-kind empty output explicitly reclassified as a wrong query, not a clearance. | BZL-JS-24, BZL-JS-25 | A repo on `fremtind/rules_vitest` has zero `js_test` targets; both rows were silently inert there. | js-test-runners follow-up (proposed revision, measured) |
| 2026-09-06 | Rule text and rationale extended to name the vitest "install at root" workaround as a `rules_js#362` symptom. Verification unchanged. | BZL-JS-06 | Same open bug, different presentation; an agent otherwise opens a fresh investigation. | js-test-runners follow-up (proposed revision, codified) |
| 2026-09-06 | Scoped to *hand-written* `ts_project`; bazelrc grep widened to `--include='*bazelrc*'`; cross-reference added to BZL-JS-33 for the generated case. Severity unchanged (SHOULD). | BZL-JS-13 | Aspect's Gazelle plugin structurally cannot satisfy this row, so hardening it to MUST would ship a rule the generator path always violates. | gazelle follow-up § Q1 |
| 2026-09-06 | Same bazelrc-grep widening. | BZL-JS-15 | Consistency; a nested or per-environment rc file was out of the old glob. | — |
| 2026-09-06 | Flag names in every touched verification cell re-verified present on both majors: `--output_groups`, `--sandbox_writable_path`, `--modify_execution_info`, `--remote_executor`, `--remote_download_minimal`, `--enable_runfiles`, `--instrumentation_filter`, `--instrument_test_targets`, `--experimental_split_coverage_postprocessing`, `--experimental_fetch_all_coverage_outputs`. The last two measured `default: "false"` on both. | BZL-JS-11, 16, 23, 24 | Era discipline; the coverage defaults contradicted an earlier wave-3a dive. | `bazel help build --long` at 8.7.0 and 9.2.0, this WSL2 host, 2026-09-06. A CI runner that sets either coverage flag splits post-processing into its own spawn — still inside the same `TestRunnerAction`. |
| 2026-09-06 | Cross-reference to BZL-JS-34 added (Gazelle constrains the lockfile version further than "9 or higher"). | BZL-JS-01 | Two rows now read the same first line of the same file for different reasons. | gazelle follow-up |
| 2026-09-06 | Rationale extended with the settled fleet policy ("convert to pnpm or do not adopt", no bun branch). | BZL-JS-03 | Frame decision, previously an open question here. | frame § Wave 2, item 11 |
| 2026-09-06 | New: vitest → `fremtind/rules_vitest`, CONSIDER, with watch mode / config discovery / concurrency losses named. | BZL-JS-28 | Fills the gap BZL-JS-24/25 assumed away — neither dive covered a test runner. | js-test-runners follow-up (NEW-JS-28, measured) |
| 2026-09-06 | New: `bun test` and `@vscode/test-electron` have no ruleset; the vscode conclusion carries its reasoned-by-mechanism caveat. | BZL-JS-29 | Two fleet packages each, with no path; an agent otherwise invents one. | js-test-runners follow-up (NEW-JS-29, measured) |
| 2026-09-06 | New: Playwright → BCR metadata check for `github:mrmeku/rules_playwright`, never a name search. | BZL-JS-30 | Two unrelated projects share the display name; only one is BCR-published. | js-test-runners follow-up (NEW-JS-30, measured) |
| 2026-09-06 | New: editor/tsserver = source-root `pnpm install` + tsconfig `paths`, and an explicit rejection of `npm_link_all_packages()` as the mechanism. | BZL-JS-31 | Closes the "Editor and language-server support" open question; the answer was in `docs/faq.md`, not in either doc the earlier round named. | js-test-runners follow-up (NEW-JS-31, normative) |
| 2026-09-06 | New: ruleset-health check by semver-sorted tags and `pushed_at`, never a README word grep and never `/releases/latest`. | BZL-JS-32 | The `/releases/latest` trap makes an agent report rules_js 2.9.3 as current. | js-test-runners follow-up (NEW-JS-32, measured); cross-family note (a) |
| 2026-09-06 | New: Aspect's Gazelle `js` plugin never emits `transpiler=`; two named resolutions, and the follow-up's own `kind(ts_project, …)` verification replaced with buildozer. | BZL-JS-33 | Applied as MUST, but the proposed verification was the exact query Verdict 4 already retired. | gazelle follow-up (NEW-1, measured) — verification corrected on fold |
| 2026-09-06 | New: `lockfileVersion` must be major 5, 6 or 9 for `aspect_gazelle_js` 1.2.1; pnpm 12 does not parse. | BZL-JS-34 | Open upstream bug with unmerged fixes; silently breaks npm-import resolution. | gazelle follow-up (NEW-2, measured) |
| 2026-09-06 | New: `ts_proto_library` is deprecated; replacement named with its EXPERIMENTAL status. Checked first — no previous row cited it, so this is an addition, not a correction. | BZL-JS-35 | Normative deprecation in the shipped source. | aspects/protobuf follow-up (NEW-5, normative); cross-family note (d) |
| 2026-09-06 | Verdict 9 rewritten from proposal to adopted decision; Verdict 10 rewritten with the re-checked floors plus the `/releases/latest` trap; Verdict 11 recast as a documented gap; Verdict 15 recast from "next round" to documented gap. Verdicts 16–21 added. | — | The follow-ups settled four of five research-round rows and the frame settled two of four human-decision rows. | all inputs |
| 2026-09-06 | Open questions: removed "Add `**/REPO.bazel` to the glob?" (frame took it), "Extend the Q4 cross-set pointer?" (frame deferred it as separate work → documented gap), "Does `bazel-adopt` carry bun?" (frame decided: no bun branch), and the four research-round rows the follow-ups answered. Added two new research-round rows and a "Documented gaps" block. | — | Instruction: a settled gap is a finding, not a question. | frame §§ Wave 2, Decisions after the map; both follow-ups |
| 2026-09-06 | Fleet shapes C and E corrected: `creeptd-ng/web` is a fourth vitest consumer and `creeptd-ng` holds the fleet's only Playwright suite, so the runner rows bind in shape C too. | — | The earlier round counted three vitest packages. | js-test-runners follow-up § 1 |
| 2026-09-06 | Failure modes 13–19 appended (appended, not re-ranked, so earlier references to 1–12 still resolve). | — | Seven new agent traps from the follow-up round. | both follow-ups |
| 2026-09-06 (wave 5) | **Correction, not a narrowing: the `@vscode/test-electron` half is retracted.** "No Bazel path at all / stays outside Bazel until a ruleset appears" replaced with a working `js_test` shape and its four costs (`requires-network`, `no-remote-exec`, host-installed Xvfb, `EROFS` user-data socket). The `bun test` half is unchanged and now explicitly named the stronger gap. Verification rebuilt: the `vscode-test bazel` repo search is gone (it found nothing because there is no ruleset, which was never the question); the checks are now a tag list, `command -v Xvfb`, and a `gh api search/code` heuristic before any future "structurally impossible" verdict. Severity stays MUST. | BZL-JS-29 | The old row was reasoned by mechanism and a production counter-example exists (`angular/angular`); leaving it standing would have an agent refuse a shape that ships today. | `bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` § 5b (primary, working example); frame § Wave 5, item 10 |
| 2026-09-06 (wave 5) | New rule: `aspect_gazelle_js` pnpm membership comes from `pnpm-lock.yaml`'s `importers:` keys only, never from `pnpm-workspace.yaml` globs; an npm-managed member gets no `npm_link_all_packages` and fails generation under the default `js_validate_import_statements = error`. Verification is a `comm` of importer keys against `package.json` directories, with the empty-extraction case read as a wrong query. Rule count 35 → 36; MUST count 21 → 22. | BZL-JS-36 | Closes the last "deserves another research round" row with a source trace instead of a fixture; `creeptd-ng`'s `web` is exactly this shape. | `bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` § 5a (measured, source-traced at `js-v1.2.1`); frame § Wave 5, item 9. The verification pipeline itself was exercised on this WSL2 host, 2026-09-06, against a synthetic lockfileVersion 9 workspace (root + one importer + one non-importer `package.json` + a `node_modules` decoy): it printed exactly the non-importer directory. POSIX `awk`/`find`/`comm` only — no GNU-only flags, so a CI runner reads the same. |
| 2026-09-06 (wave 5) | Verdict 16 corrected (three of four runners have a path, not two) and Verdict 22 added for the round; preamble counts and row-range sentence updated; "thirty-one of the thirty-five" → "thirty-two of the thirty-six"; shape C's Gazelle sentence rewritten from open question to BZL-JS-36; shape E's vscode clause rewritten with the CI-posture caveat the input flags as contested; both research-round open questions removed; the "eleven rows verify against a file outside the glob" count follows the new row to twelve (Verdict 11, New commitments, Documented gaps). | — | ID stability held: no existing ID moved, nothing was retired. | both wave-5 sources |

## Sub-artifacts

- [rules_js architecture and dependency resolution](bazel-typescript/rules-js-architecture-and-dependency-resolution.md)
  — the pnpm requirement, bazel-out-as-cwd and its `BAZEL_BINDIR` tax, lifecycle
  hooks as actions, the three-branch module-not-found diagnosis, phantom
  dependencies, `bun.lock`'s non-path, the ESM sandbox escape, npm-extract cache
  economics, coverage caveats, framework output-layout failures.
- [rules_ts: the typecheck gate and the mandatory transpiler choice](bazel-typescript/rules-ts-typecheck-and-transpiler.md)
  — why `bazel build` goes green with a type error, the forcing flag and its
  cost, the mandatory transpiler selection since 2.0, SWC's documented output
  differences, the four `ts_project` failure signatures, `isolatedDeclarations`
  plus `isolated_typecheck`.
- [JS test-runner/bundler ruleset maintenance, editor support, and the version floor](bazel-followups/js-test-runners-bundlers-and-editor-support.md)
  — which of six bundler/test rulesets are current, the fleet's four runners
  mapped to a path or to none, vitest's real ruleset and what breaks under it,
  the `/releases/latest` trap, the `rules_playwright` name collision, the
  editor prescription from `docs/faq.md`, and the M-K-15 search that found
  nothing.
- [Gazelle plugin maturity per language](bazel-followups/gazelle-plugin-maturity-per-language.md)
  — § Q1 and § Q7 only for this family: Aspect's `js` plugin is a plain BCR
  dependency, never emits `transpiler=`, and reads only pnpm lockfile majors
  5/6/9; `aspect_gazelle(with_check = True)` is an `sh_binary`, not a test.
- [Aspects vs macros, protobuf, and execution groups](bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md)
  — § 2 only for this family: `ts_proto_library` is deprecated at rules_ts
  3.10.1 in favour of rules_js's EXPERIMENTAL `js/proto.bzl`.
- [BCR playbook, flag archaeology, rewind, and JS gaps](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md)
  — § 5 only for this family: `aspect_gazelle_js` decides pnpm membership from
  `pnpm-lock.yaml`'s `importers:` keys and never from `pnpm-workspace.yaml`
  globs (BZL-JS-36), and `angular/angular`'s live `@vscode/test-electron`
  `js_test` retires BZL-JS-29's "no Bazel path at all".
- [Coverage across rulesets and the test exec group](bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md)
  — §§ 1–2 only for this family: the coverage collector runs inside the test's
  own spawn for every ruleset, the split-coverage flags default false, and the
  auto-computed `--instrumentation_filter` is how a coverage run measures
  nothing without erroring.

## Key sources

| URL | Why it is here |
|---|---|
| [rules_js README](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md) | The design tension, bazel-out-as-cwd, and "Known issues" verbatim |
| [rules_js docs/pnpm.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md) | Hoisting, `packageExtensions`, lifecycle hooks, lockfile attribute semantics, and `npm_link_all_packages()`'s actual job |
| [rules_js docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md) | Three-branch module-not-found, npm-extract cache economics, all four coverage caveats |
| [rules_js docs/faq.md § Making the editor happy](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | The only place either ruleset prescribes editor/tsserver setup — settles BZL-JS-31 |
| [npm/private/npm_translate_lock.bzl](https://raw.githubusercontent.com/aspect-build/rules_js/main/npm/private/npm_translate_lock.bzl) | Ground truth that only `pnpm_lock`/`npm_package_lock`/`yarn_lock` exist — settles bun by inspection |
| [rules_js v3.0.0 release](https://github.com/aspect-build/rules_js/releases/tag/v3.0.0) | The Bazel 6 / WORKSPACE / pnpm<9 removals and every removed attribute |
| [rules_js releases list](https://github.com/aspect-build/rules_js/releases) | Exposes the `/releases/latest` trap: v2.9.3 published 110 minutes after v3.4.1 |
| [rules_js js/proto.bzl](https://github.com/aspect-build/rules_js/blob/main/js/proto.bzl) | The EXPERIMENTAL replacement for `ts_proto_library` — one `proto_library`, a `deps=` reference, a `js_proto_toolchain` |
| [rules_js #362](https://github.com/aspect-build/rules_js/issues/362) | ESM imports escape the sandbox — open since 2022-08-05, and the root cause `rules_vitest` cannot explain either |
| [bazel #15470](https://github.com/bazelbuild/bazel/issues/15470) | The `BAZEL_BINDIR` relief request — open since 2022-05-11 |
| [rules_js #2715](https://github.com/aspect-build/rules_js/issues/2715) | Origin of the npm-extract cache guidance, with real timings |
| [bazelbuild/examples #382](https://github.com/bazelbuild/examples/issues/382) | Exact tree-artifact symlink error for Next.js standalone under the sandbox |
| [rules_ts docs/transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md) | Mandatory transpiler choice and the macro-expansion target list |
| [rules_ts docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) | The typecheck-gate fact, `validation_typecheck`, all four failure signatures |
| [rules_ts docs/tsconfig.md + examples/simple/tsconfig.json](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/tsconfig.md) | "Editors agree with rules_ts" root-config guidance, and the inline comment settling `paths` as an editor-only mechanism |
| [ts/private/ts_project.bzl](https://raw.githubusercontent.com/aspect-build/rules_ts/main/ts/private/ts_project.bzl) | Source-level confirmation of the default output group and the transpiler `fail()` |
| [rules_ts ts/proto.bzl at v3.10.1](https://github.com/aspect-build/rules_ts/blob/v3.10.1/ts/proto.bzl) | "This API has been replaced by rules_js" — the deprecation in the shipped source |
| [rules_ts v2.0.0 release](https://github.com/aspect-build/rules_ts/releases/tag/v2.0.0) | Dated primary source for the mandatory transpiler and `supports_workers` change |
| [rules_ts Discussion #398](https://github.com/aspect-build/rules_ts/discussions/398) | The only source naming SWC's two concrete output gaps — argued, hence CONSIDER |
| [Aspect: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md) | The Canva numbers, the oxc benchmark, and the migration steps |
| [BazelCon 2025 — Improving Bazel TypeScript Type-Checks With IsolatedDeclarations](https://www.youtube.com/watch?v=26CoMExb6FE) | Primary record of the measured before/after the vendor page relays |
| [fremtind/rules_vitest](https://github.com/fremtind/rules_vitest) | The only vitest ruleset: a real `vitest_test` rule, community-run, with its own admitted unsolved bug |
| [aspect-build/rules_jest troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_jest/main/docs/troubleshooting.md) | The verbatim "long running application… conflicts with Bazel" watch-mode caveat both test rulesets share |
| [mrmeku/rules_playwright + BCR metadata.json](https://github.com/bazelbuild/bazel-central-registry/blob/main/modules/rules_playwright/metadata.json) | Settles which of two same-named projects the BCR module actually is |
| [aspect-build/aspect-gazelle `language/js`](https://github.com/aspect-build/aspect-gazelle) | `kinds.go` (no `transpiler` attribute), `pnpm/parser.go` (majors 5/6/9), and the e2e `.bazelrc` that sets the escape-hatch flag permanently |
| [aspect-gazelle #461](https://github.com/aspect-build/aspect-gazelle/issues/461) | The open pnpm-12 lockfile parse bug, with two competing unmerged fixes |
| [Bazel `InstrumentationFilterSupport.java` (9.2.0)](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/InstrumentationFilterSupport.java) | How an unset `--instrumentation_filter` measures the test's package, not the library's |
| [pow.rs — Bazel is incompatible with JavaScript](https://pow.rs/blog/bazel-is-incompatible-with-javascript/) | The sharpest dissent; independent corroboration of the framework-layout trap |
