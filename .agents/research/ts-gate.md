---
title: The TypeScript Gate — what runs, in what order, and what it costs
topic: ts-gate
model: claude-opus-5
consolidates:
  - ts-gate/type-aware-rollout.md
  - ts-gate/biome-eslint-parity.md
  - ts-gate/rule-text-residue.md
date: 2026-08-29
---

## Verdict

1. **`projectService: true` is the fleet default, not setup-ocx's legacy `project`.** setup-ocx is the fleet's only wired type-aware config and it is on the *old* path — it hand-built `tsconfig.eslint.json` to solve exactly what `allowDefaultProject` exists to solve. Copying the fleet's one "working reference" propagates the deprecated shape. Decided against the reference implementation, on the parser docs plus a live reproduction.
2. **`allowDefaultProject` is mandatory in every repo, not an edge case.** All seven in-scope main tsconfigs `include` only `src`; none includes its own `eslint.config.js`. A bare `projectService: true` throws hard parsing errors — reproduced live on 11 files in grimoire-indexer and 16 in ocx-catalog.
3. **Two repos additionally need a `files`-scoped legacy `project` block.** `projectService` auto-discovery only walks up for files literally named `tsconfig.json`; `ocx-catalog/tsconfig.theme.json` and `creeptd-ng/web/e2e/tsconfig.e2e.json` are invisible to it. Confirmed live for ocx-catalog. Solution-style roots (`fma`) need nothing — measured, zero errors.
4. **Typed lint does not replace `tsc --noEmit`; setup-ocx is wrong to have dropped it.** Measured: typed ESLint costs 2.23× bare `tsc` on grimoire-indexer, 2.01× on fma — it rebuilds the program in its own process rather than reusing anything, and it only reports what specific rules probe for, not TypeScript's diagnostic set. setup-ocx has *no* typecheck script; its type coverage is an undocumented side effect of lint. Both stay, everywhere.
5. **Keep two linters.** One prose file binds typescript-eslint and Biome — every name/config difference is mechanical, never semantic. The one exception is structural: Biome has **no** equivalent to the `no-unsafe-*` family, in any group, at any severity. That contract must be labelled unenforced-by-tooling in the Biome repo rather than silently assumed covered.
6. **Two claimed parity gaps are refuted.** `no-unsafe-type-assertion` is in *no* typescript-eslint preset either — both sides opt-in, no gap. `prefer-readonly` carries no config badge at all — `useReadonlyClassProperties` is not weaker. The real gaps are `noFloatingPromises`, `noMisusedPromises` (nursery/off vs recommended-type-checked/on) and `useThrowOnlyError` (style/off vs recommended-type-checked/on).
7. **Counts: 13 type-aware rules ship in no preset, not 12; 61 type-aware rules total; Biome JS/TS is 442/210, not 441/224.** Read from generated config source at `v8.68.0` and the live rules index, against rendered tables that gave inconsistent counts. The sweep's own "34 adopt-as-rule-text from typescript-eslint" reconciles to **16**. Do not carry any of these numbers forward without re-measuring.
8. **The `adopt-as-rule-text` residue mostly drops.** Of 30 rows triaged, 18 drop, 7 become prose, 5 become a Biome config change. `detect-object-injection` (391 sites, all typed lookups), `detect-child-process` (the shell-injection risk it proxies is already measured at zero), `detect-possible-timing-attacks` (no credential comparison exists), `prefer-enum-initializers` (zero hand-written enums fleet-wide) all drop on measurement. `no-loop-func` drops as deprecated upstream — a live catalogue-rot correction to the sweep.
9. **The gate's real failure is severity, not coverage.** vscode-ocx runs its sibling's identical rule set at `warn`, with a lint script that has no `--max-warnings 0` and a `src`-only glob. That is a gate that reports and blocks nothing — the same silent-pass class as creeptd-ng/web's config-less `lint` script.
10. **kate-middlechild is exempt from every typescript-eslint change and still binds to the gate** via five `biome.json` keys: `nursery.noFloatingPromises`, `nursery.noMisusedPromises`, `style.useThrowOnlyError`, `complexity.noExcessiveCognitiveComplexity`, `complexity.noExcessiveLinesPerFunction`. Those three nursery/style keys put it *ahead* of five of the seven ESLint repos, which do not run these rules either.
11. Cross-reference: enabling a type-checked preset at all is **TS-TOOL-03**; the `typescript` version pin that makes it possible is **TS-TOOL-01**; tsgolint gating is **TS-TOOL-02**; a `lint` script resolving to a real config is **TS-TOOL-04**; `as unknown as T` at fake call sites is **TS-TOOL-10**; banned tooling is **TS-TOOL-16**; unmeasured speed claims are **TS-TOOL-17**. This topic owns only what happens *after* the preset is on.

## The ruleset

`TS-GATE-nn`. Every rule is a gate mechanic an agent gets wrong; nothing here is
model common knowledge. No verification, no rule.

**TS-GATE-01 — MUST.** Every config that sets `projectService` also sets `allowDefaultProject`, listing every file the repo's tsconfigs do not `include` — at minimum `eslint.config.*`, plus its test directory, `vitest.config.ts`, `vite.config.ts`, `playwright.config.ts`.
*Rationale:* all seven in-scope main tsconfigs `include` only `src`; a bare flip throws `was not found by the project service` on the very file that defines the lint config. Reproduced live: 11 files in grimoire-indexer, 16 under `ocx-catalog/src/theme/**`.
*Verify:* run `eslint .` (whole repo, not `src`) after the flip — any `"was not found by the project service"` line means the list is incomplete. Never resolve one by adding the file to `ignores`.

**TS-GATE-02 — MUST.** A repo holding a tsconfig not literally named `tsconfig.json` gets a `files`-scoped block using the legacy `project` option (with `projectService: false` inside that block) for exactly that tree.
*Rationale:* `projectService` auto-discovery walks up directories looking only for `tsconfig.json`, and has no config surface to add a second name. Setting both options in one block is an error.
*Verify:* `find <repo> -iname "tsconfig*.json" -not -path "*/node_modules/*" | grep -v '/tsconfig\.json$'` — every hit needs its own block or its `include` tree is silently unlinted. Today: `ocx-catalog/tsconfig.theme.json`, `creeptd-ng/web/e2e/tsconfig.e2e.json`.

**TS-GATE-03 — MUST.** A repo that enables typed linting keeps its standalone `tsc --noEmit` / `vue-tsc --noEmit` script and runs it as a separate gate step.
*Rationale:* measured, typed ESLint costs *more* wall time than the bare `tsc` it is compared against (2.23× on grimoire-indexer, 2.01× on fma) — it rebuilds the program, it does not reuse one. And it is not a diagnostic superset: a plain type mismatch with no matching rule produces no ESLint output at all.
*Verify:* `time npm run typecheck` and `time npx eslint .` on the same repo. If ESLint's time is *lower*, something is caching across them and this rule is revisitable; the fleet's measured pattern says it will not be.

**TS-GATE-04 — MUST.** A `no-unsafe-*` rule may only be disabled inside a block carrying a `files:` array naming the files that touch the untyped surface, with a comment naming that surface.
*Rationale:* setup-ocx disables all five repo-wide for `@actions/*` seams that appear at 14 import sites across 9 files of 1,082 LOC. The config is more permissive than its own comment claims, and this family is the fleet's only mechanical defense against `any` leaking through the 164 double-casts.
*Verify:* for any `"@typescript-eslint/no-unsafe-*": "off"`, confirm a sibling `files:` key in the same object; then `grep -c` the stated third-party import against the files that block actually covers — a few-uses-vs-whole-repo ratio is the failure.

**TS-GATE-05 — MUST.** Every repo has one named aggregate target that chains lint → typecheck → test, and CI invokes that target rather than restating its steps.
*Rationale:* six of nine repos have it; the three that do not are exactly the repos with a broken or absent gate. A hand-copied CI step list drifts from the local gate silently — grimoire-indexer's 1:1 `task check` is the reference.
*Verify:* the target exists (`taskfile.yml` target or an npm script that chains all three), and a CI job's `run:` line names that target verbatim. Failing today: `fma` (four unchained scripts, no CI at all), `vscode-ocx` (no Taskfile; gate exists only via npm's implicit `pretest` hook), `creeptd-ng/web`.

**TS-GATE-06 — MUST.** The lint invocation covers the whole repo, and no file that ships or executes appears in the config's `ignores`.
*Rationale:* a narrowed glob or an `ignores` entry removes *all* rules from those files, not just type-aware ones — `setup-ocx/eslint.config.js:8` drops `scripts/build.ts` and `eslint.config.js` from even `no-unused-vars`, and `vscode-ocx` lints `src` only while its sibling lints `.`.
*Verify:* the `lint` script's argument is `.`, and every `ignores` entry resolves to build output or `node_modules`. `allowDefaultProject` (TS-GATE-01) is the fix for out-of-tsconfig files, never `ignores`.

**TS-GATE-07 — MUST.** A repo whose config sets any rule to `warn` runs its linter with `--max-warnings 0`.
*Rationale:* `warn` without that flag exits 0. `vscode-ocx/eslint.config.mjs:19-26` downgrades to `warn` every rule its sibling sets to `error`, and `vscode-ocx/package.json` runs `eslint src` with no threshold — the rules fire and nothing fails. `grimoire-vscode` gets this right.
*Verify:* `grep -n '"lint"' package.json` shows `--max-warnings 0` wherever `grep -c "'warn'" eslint.config.*` is non-zero.

**TS-GATE-08 — SHOULD.** Time `tsc --noEmit` and the typed-lint run on the target repo before adding typed linting to a gate that has a time budget; expect roughly 2× the typecheck, not "the same as your build."
*Rationale:* the upstream claim is "lint times should be roughly the same as your build times"; measured on this fleet it is 2.0–2.23× because ESLint's own overhead sits on top. The two largest repos (`ocx-catalog` 28.5k, `grimoire-vscode` 38.5k LOC) have **never been timed** — no installed `node_modules` — so their cost is extrapolation, not measurement.
*Verify:* a PR enabling typed lint carries a before/after `time` on that repo. (This is TS-TOOL-17's discipline applied to the gate's own cost, not a second copy of it.)

**TS-GATE-09 — MUST.** A Biome rule key is written nested under its group (`linter.rules.<group>.<ruleName>`); never at the top of `rules`.
*Rationale:* an ungrouped key is **silently ignored** — not a config error. ESLint's flat namespace trains exactly the wrong reflex, so the tell is a lint run showing zero new diagnostics after "enabling" a rule, not a validation failure.
*Verify:* run `biome lint` before and after the edit; an unchanged diagnostic count means the key did not take. Group membership is not derivable from the rule name — look it up per rule.

**TS-GATE-10 — MUST.** The Biome repo sets `linter.rules.nursery.noFloatingPromises`, `nursery.noMisusedPromises`, and `style.useThrowOnlyError` to `"error"`.
*Rationale:* these are the only three real default-severity gaps against `recommendedTypeChecked`. Biome's own team measures `noFloatingPromises` at ~75% of typescript-eslint's catch rate — partial coverage of a live risk (127 async/`.catch`-adjacent call sites in kate-middlechild) beats none.
*Verify:* `grep -A3 '"nursery"' biome.json` and `grep -A3 '"style"' biome.json` show all three keys at `"error"`. Budget for the Scanner: any `types`-domain rule triggers a full-project scan — time `biome check` before and after.

**TS-GATE-11 — MUST.** The `any`-flow contract ("no `any` crosses a typed parameter, property, or return without an explicit narrowing check") is written as prose binding all repos, and explicitly labelled unenforced-by-tooling in the Biome repo.
*Rationale:* Biome has no equivalent to `no-unsafe-assignment`/`-member-access`/`-call`/`-argument`/`-return` in any group as of v2.5.11 — confirmed against both the rules index and the cross-reference. A reviewer who assumes Biome catches it is wrong, and nothing in the tool tells them.
*Verify:* on ESLint repos, the five rules are at `"error"` under a `*TypeChecked` config. On the Biome repo, the rule file itself carries the "no linter enforces this here" sentence — its absence is the defect.

**TS-GATE-12 — MUST.** After `biome migrate eslint`, hand-check that `noFloatingPromises`, `noMisusedPromises`, `noUnsafeTypeAssertion`, and `useReadonlyClassProperties` were actually ported.
*Rationale:* Biome's published `rules-sources` table — which the migration draws from — omits all four typescript-eslint counterparts entirely, even though three state their source on their own rule page. The tool's silence is not evidence the rule does not exist.
*Verify:* `grep -E 'noFloatingPromises|noMisusedPromises|noUnsafeTypeAssertion|useReadonlyClassProperties' biome.json` after migrating — none will appear unless added by hand.

**TS-GATE-13 — MUST.** Enabling a typescript-eslint extension rule turns its same-named core ESLint rule `'off'` in the same config object.
*Rationale:* 25 typescript-eslint rules shadow a core rule; with both on, either both fire or the later-declared one silently wins depending on config order. `no-throw-literal` → `only-throw-error` and `no-return-await` → `return-await` are full renames, not deprecations — the old names are gone.
*Verify:* for every `@typescript-eslint/<name>` in a rules block, `grep -n '"<name>"' eslint.config.*` shows the bare core name set to `"off"` or absent entirely.

**TS-GATE-14 — MUST.** Never add `prefer-readonly-parameter-types`, `detect-object-injection`, `detect-non-literal-require`, `detect-child-process`, or `detect-possible-timing-attacks` to any repo.
*Rationale:* the first is self-disqualifying by its own docs ("skip this rule if your project does not attempt to enforce strong immutability guarantees of parameters" — no fleet repo does). The four security rules each target a pattern measured at zero or already-clean: 391 bracket-notation sites all typed lookups, 0 dynamic `require`, 0 interpolated-exec shell injection, 0 real credential comparisons. `eslint-plugin-security`'s own README concedes it "finds a lot of false positives which need triage by a human" — a direct conflict with a fleet that has no human in the loop.
*Verify:* `grep -nE 'prefer-readonly-parameter-types|detect-object-injection|detect-non-literal-require|detect-child-process|detect-possible-timing-attacks' eslint.config.*` returns nothing; any hit is review-blocking.

**TS-GATE-15 — SHOULD.** Do not hand-pick a type-aware rule outside the repo's chosen preset unless a measured hit on that repo's own code justifies it.
*Rationale:* 13 of the 61 type-aware rules ship in no preset at all, and every rule with a real measured hit this program (`no-floating-promises`, `no-misused-promises`, the five `no-unsafe-*`, `no-unnecessary-type-assertion`, `no-implied-eval`) is already inside `recommendedTypeChecked`. "More rules is safer" is how a config becomes unmaintainable.
*Verify:* diff the config's rules block against the preset's generated source at the pinned tag; every addition traces to a named finding. Special case: `no-unnecessary-condition` needs a real run before adoption in the three repos that set `noUncheckedIndexedAccess`.

**TS-GATE-16 — SHOULD.** The Biome repo sets `linter.rules.complexity.noExcessiveCognitiveComplexity` and `noExcessiveLinesPerFunction` to `"error"`.
*Rationale:* both are single-threshold, zero-config, stable (defaults 15 and 50), currently off. This is the maintainability class an agent editing without human review most needs a mechanical backstop for, at the cost of a one-line config change.
*Verify:* `grep -A3 '"complexity"' biome.json` shows both keys; `biome lint` in the gate.

**TS-GATE-17 — SHOULD.** Write `x!` only immediately on a DOM/ref API call already known non-null in context; anywhere else narrow the type or handle the nullable case.
*Rationale:* ~18 genuine uses fleet-wide, concentrated exactly in the DOM/ref carve-out the rule's own docs name as its main false-positive source (`fma/src/main.tsx:7`, `fma/src/audio/FFTBars.tsx:20`). `no-non-null-assertion` lives in `strict` only, and its blanket ban would fire on the legitimate sites.
*Verify:* `grep -rEon "[A-Za-z0-9_$)\]]!(\.[A-Za-z_$]|[;,)\]}])" --include='*.ts' --include='*.tsx'`, excluding `.test.` files and `!==`/`!=`; inspect each hit's call site. A count rising past the DOM/ref carve-out is the signal.

**TS-GATE-18 — SHOULD.** A function taking more than four positional parameters takes an options object instead.
*Rationale:* today's fleet baseline is 4 hits total (2 in creeptd-ng/web, 2 in kate-middlechild) — low enough that the count itself is the gate, and an options-object refactor of an existing site changes every caller, so this is a rule for new code.
*Verify:* `grep -rEn '^\s*(export )?(async )?function \w+\(([^()]*,){4,}[^()]*\)'` per repo, against a baseline of 4.

**TS-GATE-19 — SHOULD.** Three practices stay prose because no linter in this fleet can express them without mass suppression — state them with their grep, never with a rule name.
*Rationale:* `detect-non-literal-fs-filename` would flag ≥707 legitimate calls in three repos whose whole job is file I/O; `detect-unsafe-regex` needs a real ReDoS analyzer; `noAwaitInLoops` (Biome `performance`, not nursery) cannot tell ordered from independent iterations.
*Verify:* (a) `grep -rn "fs\.\(rm\|unlink\|writeFile\)" --include='*.ts'` — trace each path argument to its source; it must be resolved and confined to its intended root. (b) `grep -rn "new RegExp(" --include='*.ts' | grep -v '\.test\.'` — each production site is try/catch-wrapped and built from a bounded source; today that is one site, `grimoire-vscode/src/webview/settings/model.ts:311`, already correct. (c) a `for`/`while` body containing `await` carries a comment naming why iterations are sequential, or becomes `Promise.all`.

## Applied to the fleet

### Satisfies

| commitment | where it already holds |
|---|---|
| TS-GATE-05 (one gate, CI invokes it) | `grimoire-indexer/taskfile.yml:37-43` — `task check` = lint → typecheck → test → smoke, and `.github/workflows/ci.yml` runs exactly that, nothing added or missing; the fleet's only 1:1 |
| TS-GATE-05 (local half, most complete) | `kate-middlechild/Taskfile.yml:47-54` — lint → fmt:check → typecheck → test → build → test:e2e; superset of every other local gate (but nothing invokes it — see Violates) |
| TS-GATE-05 + superset CI | `ocx-catalog/taskfile.yml:20-25` `task verify`, with CI a strict superset adding pack-verify, zizmor, gitleaks, Lighthouse |
| TS-GATE-06 + TS-GATE-07 | `grimoire-vscode/package.json:9-21` — `"lint": "eslint . --max-warnings 0"`, whole-repo glob, all rules at `error` (`eslint.config.mjs:19-26`) |
| TS-GATE-03 (typecheck kept separate) | `ocx-catalog/package.json:23-29`, `grimoire-indexer/package.json:9-13`, `fma/package.json:6-13`, `creeptd-ng/web/package.json:8-17`, both extensions' `check-types` — six repos already run a standalone typecheck |
| TS-GATE-02 (no special-casing needed) | `fma/tsconfig.json:1-7` solution-style root — measured, zero parsing errors under bare `projectService: true` |
| suppression discipline | `kate-middlechild/packages/web/src/islands/` — 5 `biome-ignore` comments, every one carrying a stated reason; 0 type-safety suppressions fleet-wide |

### Violates

| violation | citation | rule |
|---|---|---|
| The fleet's only typed-lint repo has **no typecheck script at all** — type coverage is an undocumented side effect of lint | `setup-ocx/package.json:9-16` and `setup-ocx/taskfile.yml:34-40`; `config-inventory.md` §3 | TS-GATE-03 |
| Five `no-unsafe-*` rules off repo-wide for a surface that is 14 import sites across 9 files of 1,082 LOC | `setup-ocx/eslint.config.js:20-26` (block at `:13-32` carries no `files:`) | TS-GATE-04 |
| `scripts/build.ts` and `eslint.config.js` dropped from **all** linting, not just type-aware rules | `setup-ocx/eslint.config.js:8` | TS-GATE-06 |
| Legacy `project` + a hand-built `tsconfig.eslint.json` that `allowDefaultProject` replaces | `setup-ocx/eslint.config.js:16`, `setup-ocx/tsconfig.eslint.json:1-5` | TS-GATE-01 |
| Every rule its sibling sets to `error` downgraded to `warn`, with a lint script that has no `--max-warnings 0` and a `src`-only glob | `vscode-ocx/eslint.config.mjs:19-26`, `vscode-ocx/package.json:9-20` | TS-GATE-07, TS-GATE-06 |
| No aggregate gate target at all; gate exists only via npm's implicit `pretest` hook | `vscode-ocx/package.json:9-20` — no Taskfile in the repo | TS-GATE-05 |
| Four unchained scripts, no Taskfile, no CI directory | `fma/package.json:6-13`; no `.github/workflows/` | TS-GATE-05 |
| Most complete local gate in the fleet, invoked by nothing | `kate-middlechild/Taskfile.yml:47-54`; no `.github/workflows/` | TS-GATE-05 |
| No `nursery` rules enabled — `noFloatingPromises`/`noMisusedPromises` off, `useThrowOnlyError` off | `kate-middlechild/biome.json:36-44` | TS-GATE-10 |
| Neither complexity threshold enabled | `kate-middlechild/biome.json:36-44` | TS-GATE-16 |
| All seven in-scope main tsconfigs `include` only `src` — each will throw on its own `eslint.config.js` the moment `projectService` is flipped | `ocx-catalog/tsconfig.json:12`, `grimoire-indexer/tsconfig.json`, `grimoire-vscode/tsconfig.json:2-21`, `vscode-ocx/tsconfig.json:2-21`, `fma/tsconfig.app.json`, `creeptd-ng/web/tsconfig.json:2-19`, `setup-ocx/tsconfig.json:2-17` | TS-GATE-01 |
| Sibling tsconfig invisible to `projectService` — 16 files under `src/theme/**` fail on a bare flip (reproduced) | `ocx-catalog/tsconfig.theme.json:9-18` against `ocx-catalog/tsconfig.json:12` `"exclude": ["src/theme"]` | TS-GATE-02 |
| Second instance of the same shape — Playwright e2e specs and `playwright.config.ts` outside the root config's reach | `creeptd-ng/web/e2e/tsconfig.e2e.json:2-18` | TS-GATE-02 |
| A `lint` script, no config anywhere in the tree, and a CI job that never calls it | `creeptd-ng/web/package.json:14`; `creeptd-ng/.github/workflows/ci.yml` `web-check` | TS-TOOL-04 (cited, not restated) |
| Two rule files claim type-aware ESLint their configs do not wire | `vscode-ocx/.claude/rules/quality-typescript.md:478` and its `grimoire-vscode` twin | TS-TOOL-03 (cited) |

### New commitments

`projectService: true` + a per-repo `allowDefaultProject` list in all seven ESLint
configs; a `files`-scoped legacy `project` block in `ocx-catalog` and
`creeptd-ng/web`; a restored `typecheck` script in `setup-ocx`; setup-ocx's
`no-unsafe-*` block re-scoped to the 9 files that import `@actions/*` (and
`tsconfig.eslint.json` deleted); `--max-warnings 0` plus a repo-wide glob in
`vscode-ocx`; an aggregate gate target in `vscode-ocx` and `fma`, plus CI for
`fma` and `kate-middlechild`; five `biome.json` keys in `kate-middlechild`; a
timed before/after recorded per repo at the moment typed linting lands there.

## AI-agent failure modes

Ranked by how often each will bite on this fleet.

1. **Flipping `projectService: true` and stopping.** Every repo then throws
   `was not found by the project service` on its own `eslint.config.js` and test
   tree — and the agent's next move is `ignores`, which silently removes those
   files from *all* linting. *Check:* run `eslint .` over the whole repo once
   after the flip; any such line means the config is incomplete, not that the
   files should be ignored.
2. **Copying setup-ocx wholesale as "the fleet's working example."** That
   propagates the legacy `project` path, its hand-built extra tsconfig, and — far
   worse — an unscoped five-rule `no-unsafe-*` disable into a repo with no
   `@actions/*` seam, deleting the fleet's only defense against the 164
   double-casts. *Check:* a `no-unsafe-*: "off"` with no adjacent `files:` array
   in the same object.
3. **Dropping `tsc --noEmit` because "typed lint covers it."** setup-ocx already
   made this call and documents it nowhere. *Check:* both a `typecheck` script and
   a typed lint step appear in the gate; typed lint being *slower* than the
   typecheck is the proof it is not reusing that work.
4. **Writing a Biome rule key ungrouped.** `{"rules": {"noFloatingPromises":
   "error"}}` is silently ignored — no validation error — so a clean lint run
   reads as success. *Check:* diagnostic count before and after the edit.
5. **Trusting `biome migrate eslint` or the `rules-sources` page.** Four rules
   that matter here are absent from Biome's own published cross-reference.
   *Check:* grep the resulting `biome.json` for the four names.
6. **Reaching for `eslint-plugin-security`'s full recommended set when asked to
   "harden" a CLI**, because the plugin advertises itself as recommended-by-default
   while its README concedes high false-positive rates. *Check:* grep the fleet for
   the pattern the rule targets and compare hits to file count — above roughly
   1-in-5 files is a noise signal, not a coverage signal.
7. **Writing `onClick={async () => …}`.** Not hypothetical: six measured sites in
   `fma` (`SpotifyPanel.tsx:73,91-93`, `EditorPage.tsx:140,147`,
   `LibraryPage.tsx:54,91`), plus two genuinely floating promises at
   `PlayerPage.tsx:71,142`. Nothing in the fleet's current non-typed configs can
   see the return type. *Check:* `no-misused-promises` under a `*TypeChecked`
   preset, which is the whole point of TS-TOOL-03.
8. **Enabling a typescript-eslint extension rule beside its core twin.** 25 rules
   shadow a core name; both fire, or config order decides. *Check:* TS-GATE-13's grep.
9. **Citing a stale catalogue number** — "441 rules / 224 recommended", Biome's
   "500 rules" headline (whole-product, not JS/TS), or "12 none-preset type-aware
   rules". *Check:* re-measure against the live index or the generated config
   source at a pinned tag; never a blog post, never a rendered rules table.

## Open questions

**Human decisions.**

- **Is `fma` in the fleet or not?** It has no CI, no `CLAUDE.md`, no AI config of
  any kind, and four unchained scripts — yet it is where every typed-lint rule was
  live-fired and found real bugs. Adding a gate to it is the single highest-yield
  item in this document; deciding it is out of scope is also defensible. Someone
  has to choose.
- **Does `creeptd-ng/web` get a flat config built from scratch, or leave the
  fleet?** It has a dead `lint` script, no config in the tree, no lint step in CI,
  two lockfile kinds, and test-only packages in runtime `dependencies`. Typed
  linting is not even a question there until a baseline config exists.
- **Does `setup-ocx` stay the reference implementation after this?** Four of the
  Violates rows are its. It is simultaneously the only repo doing the hard thing
  and the repo doing it in the four wrong ways.

**Unresolved, needs a run rather than a decision.**

- **Does `no-unsafe-type-assertion` catch `x as unknown as T`?** Its docs show only
  single-step narrowing; the double-cast — the fleet's actual 164-occurrence escape
  hatch — appears in no example. Unproven either way. Grep for the literal string
  regardless of what the linter reports.
- **`no-unnecessary-condition` × `noUncheckedIndexedAccess`**, in the three repos
  that set that flag (`grimoire-vscode`, `vscode-ocx`, `creeptd-ng/web`) — a
  documented interaction, not measured here.
- **Do the two VS Code extensions need their own `no-unsafe-*` carve-out?** The
  `vscode.*` API surface is looser in places than app code, and those two repos hold
  84 of the 164 double-casts. Canary before committing to "no exceptions."

**The subarea deserving another round: the flip itself, measured.** Everything in
this document about cost rests on two repos (grimoire-indexer 8.3k LOC, fma 4.5k).
The two largest — `ocx-catalog` 28.5k and `grimoire-vscode` 38.5k — have **never
been timed**, because neither has installed `node_modules` in this environment, and
`grimoire-vscode` is also where the double-cast concentration is worst. A round that
installs, flips `projectService` + `recommendedTypeChecked` on those two, and
records the real diagnostic count and wall clock would either confirm the 2× model
or overturn the cost half of this verdict.

## Sub-artifacts

- [ts-gate/type-aware-rollout.md](ts-gate/type-aware-rollout.md) — `projectService` vs legacy `project`, `allowDefaultProject` mechanics, measured typed-lint cost, rule-value ranking, the 13 none-preset rules
- [ts-gate/biome-eslint-parity.md](ts-gate/biome-eslint-parity.md) — Biome v2.5.11 vs typescript-eslint 8.68.0 rule-by-rule parity, the `no-unsafe-*` structural gap, the migration tool's omissions
- [ts-gate/rule-text-residue.md](ts-gate/rule-text-residue.md) — triage of the sweep's 30 `adopt-as-rule-text` rows: 18 drop, 7 prose, 5 Biome config

Cross-referenced, not consolidated here:
[typescript-tooling-landscape.md](typescript-tooling-landscape.md) (TS-TOOL ruleset),
[typescript-audit/config-inventory.md](typescript-audit/config-inventory.md),
[typescript-audit/runtime-posture.md](typescript-audit/runtime-posture.md),
[typescript-audit/code-shape.md](typescript-audit/code-shape.md),
[typescript-audit/implemented-contracts.md](typescript-audit/implemented-contracts.md),
[typescript-topic-map/lint-catalogue-sweep.md](typescript-topic-map/lint-catalogue-sweep.md).

## Key sources

| URL | Why it is load-bearing here |
|---|---|
| [typescript-eslint.io/packages/parser](https://typescript-eslint.io/packages/parser/) | `projectService` option shape, `allowDefaultProject`/`defaultProject` semantics, the `maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING` cap, and the "simpler configurations" rationale that decides TS-GATE-01/02 |
| [typescript-eslint.io/getting-started/typed-linting](https://typescript-eslint.io/getting-started/typed-linting/) | The canonical two-step enable sequence the fleet's one wired repo predates |
| [typescript-eslint.io/troubleshooting/typed-linting/performance](https://typescript-eslint.io/troubleshooting/typed-linting/performance/) | The "lint time ≈ build time" claim that TS-GATE-03/08 measure against and find conservative |
| [disable-type-checked.ts @ v8.68.0](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/disable-type-checked.ts) | Authoritative list of all 61 type-checked rules — the rendered rules table gave inconsistent counts across repeated fetches |
| [recommended-type-checked-only.ts @ v8.68.0](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/recommended-type-checked-only.ts) | Exact preset membership; with `strict-`/`stylistic-type-checked-only.ts` it yields 48 covered, hence 13 in no preset |
| [typescript-eslint.io/rules/no-unsafe-type-assertion](https://typescript-eslint.io/rules/no-unsafe-type-assertion/) | Confirms it is in no preset (refuting the parity-gap framing) and demonstrates only single-step narrowing — the open question on `as unknown as T` |
| [typescript-eslint.io/rules/prefer-readonly-parameter-types](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/) | The self-disqualifying caveat behind TS-GATE-14 |
| [typescript-eslint.io/rules/only-throw-error](https://typescript-eslint.io/rules/only-throw-error/) | Confirms `recommended-type-checked` membership — the one real severity mismatch against Biome |
| [typescript-eslint.io/rules/no-loop-func](https://typescript-eslint.io/rules/no-loop-func/) | Upstream deprecation notice; corrects the sweep's `Dep: No` tag |
| [biomejs.dev/linter/javascript/rules/](https://biomejs.dev/linter/javascript/rules/) | Live JS/TS rule index — 442/210 at v2.5.11, superseding the 441/224 figure; re-measure, never cite |
| [biomejs.dev/linter/rules-sources/](https://biomejs.dev/linter/rules-sources/) | The 42-pair cross-reference and its four omissions — the basis for TS-GATE-12 |
| [biomejs.dev/linter/domains/](https://biomejs.dev/linter/domains/) | The `types`-domain Scanner trigger and its stated cost, budgeted in TS-GATE-10 |
| [biomejs.dev/blog/vercel-partners-biome-type-inference/](https://biomejs.dev/blog/vercel-partners-biome-type-inference/) | "We have no intention to rebuild `tsc`" and the false-negative-tolerant design goal behind TS-GATE-11 |
| [biomejs.dev/blog/biome-v2/](https://biomejs.dev/blog/biome-v2/) | The ~75% `noFloatingPromises` parity figure, self-described as preliminary |
| [github.com/eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) | "Finds a lot of false positives which need triage by a human" — the sentence that disqualifies four of its rules for a no-human fleet |
