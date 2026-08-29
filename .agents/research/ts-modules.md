---
title: "ts-modules — resolution, the import graph, and the shipped shape"
topic: ts-modules
model: claude-opus-5
consolidates:
  - ts-modules/resolution-per-shape.md
  - ts-modules/publish-verification.md
  - ts-modules/import-graph.md
  - ts-modules/import-type-and-interop.md
grounded_in:
  - typescript-audit/config-inventory.md
  - typescript-audit/code-shape.md
  - typescript-audit/implemented-contracts.md
  - typescript-audit/runtime-posture.md
date: 2026-08-29
revised: 2026-08-29
---

## Verdict

1. **`moduleResolution` is decided by the *host* — whichever program last reads
   the import specifiers as written, before anything executes.** Not "target
   runtime", not "consumer toolchain": TypeScript's own handbook defines the term
   this way and it subsumes both ([theory.html](https://www.typescriptlang.org/docs/handbook/modules/theory.html)).
   If a bundler always intervenes, the bundler is the host. If Node loads the
   emitted files by path, Node is.
2. **`NodeNext` for anything Node loads or anything outside the repo imports;
   `Bundler` only when one specific bundler always intervenes AND no external
   consumer exists.** `bundler` mode is documented as "infectious" — it silently
   permits specifiers that only work in bundlers. The burden of proof sits on
   `Bundler`, not on `NodeNext`.
3. **We take plain `NodeNext`, not the frozen `"module": "node18"`/`"node20"`
   pin.** The handbook now recommends the frozen pairing for libraries; Andrew
   Branch's 2023 post recommends plain `nodenext`. Resolved for `nodenext`: no
   fleet repo has shown a break attributable to nodenext's movement, and the
   frozen pin buys a hypothetical stability for a certain recurring cost (a
   manual bump per Node major, on a fleet that already has three repos floored
   on an EOL runtime). Revisit only on an actual movement-induced break.
4. **`vscode-ocx` is not a live defect — the audit's "real NodeNext trap" call is
   overturned.** `typescript-audit/code-shape.md:497-513` reads 11/11 extensionless
   relative imports under `Node16` as a violation. `tsc --noEmit` exits 0 on both
   TS 6.0.3 and 7.0.2 (resolution-per-shape §8), because the `.js` rule is triggered
   by module *format*, and `vscode-ocx/package.json` carries no `"type": "module"`.
   The real finding is worse in a different way: the setting is **inert**, and one
   unrelated `"type"` edit turns 11 sites red at once.
5. **Therefore: grep is not the verifier for extension discipline; `tsc --noEmit`
   is.** Every extension rule below verifies by compiler, never by pattern.
6. **The two CLIs are not libraries.** Both declare `export {};` stubs;
   `ocx-catalog` has no `"."` export at all. Publish verification is re-scoped to
   the `bin`: the library-triangle rules in publint/attw are moot or noisy, and
   the rules that bind are the `bin`, `files`, condition-order and metadata ones.
7. **A pack-smoke that stops at publint + attw is not verification.** Those tools
   check that the manifest *declares* correctly. Only install-the-tarball-and-run-
   the-installed-bin proves the artifact works, and only `npm publish --dry-run`
   catches npm's silent manifest auto-correction — `npm pack` structurally cannot.
8. **Import-graph hygiene is a real, wholly uncovered gap: zero of nine repos run
   any import-graph rule.** It is cheap here (≤734ms per repo) and buys a
   mechanical guard on an invariant the fleet currently hand-enforces in comments.
9. **`eslint-plugin-import` is *not* unmaintained — the wave-1 brief overstated
   it.** It is at v2.32.0 and documents flat-config support. `import-x` is still
   the right install, on maintenance velocity, not on "the other one cannot run."
10. **Do not write a rule against the `index.ts` filename.** 12 files are named
    that; ~3 are barrels; one of those three has zero callers. A filename rule
    would be 9 false positives per real hit.
11. **`verbatimModuleSyntax` becomes a fleet floor — gated on *shape*, not
    applied fleet-wide.** Free on `Bundler` and on `NodeNext`/`Node16` *with*
    `"type": "module"`: measured against real `tsc` on `grimoire-indexer`,
    `ocx-catalog`, `fma` (app+node) and `grimoire-vscode` — **zero**
    verbatim-specific errors on all four. Structurally impossible on
    `Node16`/`NodeNext` *without* `"type": "module"`: `vscode-ocx` produces
    **62** errors, 42× `TS1295` + 20× `TS1287`, none of them fixable by adding
    `type` keywords. The gating condition is the module-format pair, not the
    product category — the two VS Code extensions land on opposite sides of it
    purely from a `moduleResolution` choice (import-type-and-interop §4, §9).
12. **`isolatedModules` is not a weaker `verbatimModuleSyntax` — they are
    disjoint guarantees.** Measured on 6.0.3: `isolatedModules` alone forces
    `export type` on re-exports (`TS1205`) and compiles an unmarked type-only
    *import* clean; only `verbatimModuleSyntax` raises `TS1484` there. Both VS
    Code extensions have `isolatedModules` and neither has import-side
    enforcement (§3). Any prose pairing them as stronger/weaker is wrong.
13. **The `eslint-import-resolver-typescript`-on-NodeNext question is closed:
    it works.** A live fixture (`resolver@4.4.5` + `import-x@4.17.1` +
    `typescript@6.0.3`, current `resolver-next` API) resolves
    `import { helper } from './util.js'` → `util.ts` clean, flags only the one
    genuinely missing file, and false-positives on nothing (§10). TS-MOD-11
    ships without an assumption behind it.
14. **Two documented gaps, not answers.** (a) *The TypeScript handbook is
    contradicted by the compiler on `import x = require()` in an ESM-format
    file.* The modules reference shows it as `❌ Not allowed`; tsc 6.0.3
    compiles it clean — exit 0, synthesizing a `createRequire` shim — for both
    a relative `.cjs` target and a bare CJS package, with and without
    `verbatimModuleSyntax`. Which of the two is stale could not be established
    from outside the compiler source. Treat the pinned compiler as
    authoritative and re-test rather than repeat either claim (§4, Contested).
    (b) *`kate-middlechild/packages/web` could not be measured.* Astro's type
    infrastructure is not installed in this snapshot, so the one package that
    drops `verbatimModuleSyntax` via its `extends` target is the one package
    whose cost of turning it back on is unknown. Inferred low-risk by shape
    (Bundler-family), explicitly unverified (§8, §9).
15. **Three wave-2 baselines were re-measured and corrected.**
    `verbatimModuleSyntax` is set in **3 repos, not 2** — `creeptd-ng/web` has
    carried it since `573db9fa` (2026-05-30) — for 4 literal and **5 of 13
    effective** tsconfigs once `extends` chains are traced. `import type` sites
    are 254, not 255. Real `require(` calls fleet-wide are **zero, not one**:
    the single grep hit is inside a `//` comment, and the only `module.exports`
    matches are string literals in a test fixture. No `export =` and no
    `import x = require()` exists in any fleet repo's real source (§8, §12).

## The ruleset

Families owned by this topic: **`TS-MOD`** (module system, resolution, import
graph) and **`TS-PKG`** (`package.json`, distribution, publish verification).
`TS-CFG` owns the strictness flags these sit beside and is not touched here.

### TS-MOD — module system and import graph

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **TS-MOD-01** | Choose `moduleResolution` by answering "what program reads these specifiers last, before anything runs?" — `NodeNext` when Node loads the emitted files, or when any code outside this repo `import`s the package; `Bundler` only when one bundler always intervenes and no external importer exists. | `bundler` is "infectious": it accepts specifiers that crash in Node, with no compiler error (theory.html; resolution-per-shape §1). | `tsc --showConfig` for the effective value, then `jq '.exports' package.json` — a non-null `exports` with real consumers forbids `bundler`. | MUST |
| **TS-MOD-02** | Never write `"moduleResolution": "node"`, `"node10"`, `"node18"`, or `"node20"`. Only `node16`, `nodenext`, `bundler` are legal values. | `node10`/`node` deprecated in TS 6.0 (`TS5107`) and hard-removed in 7.0.2 (`TS5108`, no `ignoreDeprecations` escape); `node18`/`node20` exist only as `module` values and produce `TS6046` here — both verified against live 6.0.3 and 7.0.2 compilers (resolution-per-shape §2, §6). | `grep -rn '"moduleResolution"' --include='tsconfig*.json' .` — every hit must read `node16`, `nodenext`, or `bundler`. | MUST |
| **TS-MOD-03** | After any edit to `module` or `moduleResolution`, run `tsc --showConfig` — not a JSON-schema check — and read the resolved pair. | `--showConfig` prints implied values: it is the only thing that surfaces both an invalid value and an unexpected implied pairing (e.g. `module: node18` silently implying `moduleResolution: node16`) in one command. | `tsc --showConfig -p <tsconfig>` | MUST |
| **TS-MOD-04** | In a package with `"type": "module"` under `node16`/`nodenext`, every relative import carries an explicit `.js`/`.mjs`/`.cjs` extension. | `TS2835` otherwise; the ESM loader has no extension search (resolution-per-shape §4). | `tsc --noEmit` — authoritative and free. Do **not** verify by grep. | MUST |
| **TS-MOD-05** | A package declaring `node16`/`nodenext` must also declare `"type": "module"`, or carry an inline comment stating why it stays CommonJS-format. | Without it the extension check is a silent no-op — the setting stops doing the work its name implies, and one unrelated `package.json` edit turns every relative import red at once (resolution-per-shape §4, §8). It also **forecloses `verbatimModuleSyntax` entirely** (TS-MOD-16/17): this exact pair is what produces `vscode-ocx`'s 62 structural `TS1295`/`TS1287` errors, so the missing `"type"` field costs a fleet-floor flag, not only the extension check (import-type-and-interop §4, §9). | For each tsconfig whose `moduleResolution` is `node16`/`nodenext`: `jq -r '.type' <same package>/package.json` must be `module`, or the tsconfig carries the comment. | SHOULD |
| **TS-MOD-06** | Before bulk-editing import extensions, resolve the **effective** tsconfig for the specific file — respecting `include`/`exclude` and sibling `tsconfig.*.json` — not the repo's top-level one. | `ocx-catalog` has 139 deliberately extensionless imports under `src/theme` governed by a separate `Bundler` config; a fleet-wide "always suffix `.js`" edit would corrupt every one (code-shape.md:497-505; resolution-per-shape §7). | `tsc --showConfig -p <the config whose include covers the file>`; confirm the file is actually matched before editing. | MUST |
| **TS-MOD-07** | Two packages with the same host (same runtime, same bundler, same "who imports this" answer) must declare the same `module`/`moduleResolution`, or the diverging config must carry a comment naming the forcing constraint. | An undocumented divergence between structurally identical packages is the strongest available signal of drift; `ocx-catalog/tsconfig.theme.json` shows what a *reasoned* divergence looks like (resolution-per-shape §9). | Diff `compilerOptions.module`/`moduleResolution` across packages with identical build tooling; any mismatch needs a fix or a comment. | SHOULD |
| **TS-MOD-08** | `allowImportingTsExtensions: true` must resolve, in the effective post-`extends` config, alongside one of `noEmit`, `emitDeclarationOnly`, or `rewriteRelativeImportExtensions`. | `TS5096` otherwise — `tsc` refuses to emit a `.js` file containing a literal `.ts` specifier (verified, resolution-per-shape §5). | `tsc --showConfig` and read the resolved set. | MUST |
| **TS-MOD-09** | Enable `import-x/no-cycle` (`ignoreExternal: true`, no `maxDepth` cap) in ESLint repos, or Biome `noImportCycles` in Biome repos. | The fleet's only 4 cycles are TDZ-safe today *by hand-enforced discipline documented in a source comment* — the rule makes it mechanical before an edit breaks it. Measured cost tops out at 734ms/68 files, inside an on-save budget (import-graph §2, §7). | `npx madge --circular --extensions ts,tsx <src>` for the baseline; the enabled rule thereafter. Re-time if a repo passes ~500 files. | SHOULD |
| **TS-MOD-10** | When breaking a reported cycle, decide by **when the binding is read**, not by `const`-vs-`function`. A `const` read only inside a function body is exactly as safe as a hoisted function. | The TDZ hazard is eager top-level evaluation, not the declaration keyword; `grimoire-indexer` already moved one `const` to a third file for precisely this reason (import-graph §7). | For each binding crossing a reported cycle edge, grep its use sites in the importing file and confirm none sit at module top level. | SHOULD |
| **TS-MOD-11** | In an ESLint flat-config repo, install `eslint-plugin-import-x`, and wire the resolver via `import-x/resolver-next` + `createTypeScriptImportResolver(...)` — never the legacy `settings['import/resolver'].typescript` object. | `import-x` is the fork that ships the TypeScript-era fixes (upstream declined the `exports`-field requests that produced it); the legacy settings shape is what training-era examples show and it is a no-op against `import-x >= 4.5.0` (import-graph §1, §5). The NodeNext caveat this rule shipped with is **withdrawn**: a live fixture (`eslint-import-resolver-typescript@4.4.5` + `import-x@4.17.1` + `typescript@6.0.3`) resolves the `./util.js`→`util.ts` rewrite this fleet's two published CLIs depend on, with zero false positives (import-type-and-interop §10). | `grep '"eslint-plugin-import"' package.json` returns nothing; `grep "'import/resolver'" eslint.config.*` returns nothing where `import-x` is installed. | SHOULD |
| **TS-MOD-12** | When enabling **any** Biome `project`-domain rule (`noImportCycles`, `noUndeclaredDependencies`, `noUnresolvedImports`, `noPrivateImports`), set `linter.domains.project` in the same change. | The rule name alone under `linter.rules` is very plausibly a silent no-op — Biome only builds the module graph when the domain is on (import-graph §6). | `grep -A2 '"domains"' biome.json` shows `"project"` whenever any of those rule names appears in the file. | MUST |
| **TS-MOD-13** | Enable `import-x/no-extraneous-dependencies` (with `packageDir` per package in a monorepo) / Biome `noUndeclaredDependencies`, ignoring `vscode`; and do not treat a green run as meaningful in a checkout without `node_modules`. | Catches undeclared-dependency breakage on a clean clone; measured zero real hits fleet-wide once `vscode` (extension-host-injected) is excluded, so any future failure is real. 5 of 9 repos lack `node_modules` on a bare checkout, where the rule silently no-ops (import-graph §3, §8). | `test -d node_modules || echo "install first"` before trusting the run; the rule config's ignore list contains `vscode`. | SHOULD |
| **TS-MOD-14** | Do not flag a file as a barrel because it is named `index.ts`. Target the re-export fan-out pattern instead. | 12 files fleet-wide are named `index.ts`; ~3 are re-export barrels, and one of those has zero callers. A filename rule flags 9 CLI entry points, subsystem main files and Vue Router configs per real hit (import-graph §10). | For each `index.ts`: `grep -c '^export\s.*\bfrom\b' <file>` against its total line count — mostly re-exports is a barrel, substantial own logic is a main file. | SHOULD |
| **TS-MOD-15** | Do not reach across a workspace package boundary with a relative path — not even from a test. Fix it by relocating the fixture, not by rewriting the specifier to the package's bare name. | `import-x/no-relative-packages`' auto-fix rewrites the specifier, but if the target is not in the other package's `exports` map the "fix" just moves the failure to `no-unresolved`. Biome has no rule covering this at all (import-graph §9). | `grep -rn "\.\./\.\./\(web\|core\|tokens\)/" packages --include='*.ts*'` returns nothing. | SHOULD |
| **TS-MOD-16** | Set `verbatimModuleSyntax: true` in every tsconfig whose **effective** `moduleResolution` is `Bundler`, or is `NodeNext`/`Node16` **and** whose nearest `package.json` declares `"type": "module"`. Prove it with the CLI override before editing any file. | `isolatedModules` does not enforce `import type` on the import side — it only forces `export type` on re-exports (`TS1205`); the import-side gap (`TS1484`) is exactly what this flag closes. Measured cost on all four fleet repos that qualify and lack it: **zero** verbatim-specific errors (import-type-and-interop §3, §9). | `tsc -p <tsconfig> --noEmit --verbatimModuleSyntax` exits 0 — *then* commit the flag. Filter output for `TS1484`/`TS1205`/`TS1287`/`TS1295`/`TS1202`; everything else is pre-existing. | MUST |
| **TS-MOD-17** | Never set `verbatimModuleSyntax` on a package whose `moduleResolution` is `Node16`/`NodeNext` while its nearest `package.json` has no `"type": "module"`. Fix the module format first (add `"type"`, or move to `Bundler`). | ES `import`/`export` syntax in a file `tsc` classifies as CommonJS-format is a hard `TS1295`/`TS1287` — structural, not lint-fixable, and no number of `type` keywords touches it. `vscode-ocx`: 62 errors (42× `TS1295`, 20× `TS1287`), which its own `check-types` script would surface in CI (import-type-and-interop §4, §9). | `jq -r '.type' package.json` before flipping the flag: `null` plus `Node16`/`NodeNext` means blocked, not "try it and see". | MUST |
| **TS-MOD-18** | Wherever `verbatimModuleSyntax` is on, also enable `@typescript-eslint/no-import-type-side-effects`; Biome's `useImportType` in `auto` style already covers it. | An import whose specifiers are **all** inline-`type` is not elided — it emits `import {} from "mod"`, a bare side-effect import, with **zero** tsc diagnostics (verified against real 6.0.3 emit, not `--noEmit`). One live instance today: `grimoire-vscode/src/test/extension.test.ts:23` (import-type-and-interop §6). | `grep -rnE "import \{ *type [^}]*\} from" --include='*.ts*' src` and confirm every hit has at least one non-`type` specifier; plus the rule name in `eslint.config.*`. | MUST |
| **TS-MOD-19** | Never assume a `typescript-eslint` preset supplies `consistent-type-imports` or `no-import-type-side-effects`. Both must be named explicitly in the config. | Verified against the plugin actually installed in this fleet (`8.61.0`, `dist/configs/flat/*.js`): both rules appear only in `all` — not in `recommended`, `recommended-type-checked`, `strict`, `strict-type-checked`, `stylistic`, or `stylistic-type-checked`. `setup-ocx` runs `strictTypeChecked` + `stylisticTypeChecked` and gets neither (import-type-and-interop §7). | `grep -l "consistent-type-imports\|no-import-type-side-effects" node_modules/@typescript-eslint/eslint-plugin/dist/configs/flat/*.js` returns only `all.js`; therefore the rule name must appear in `eslint.config.*` itself. | MUST |
| **TS-MOD-20** | In a repo blocked from the compiler flag by TS-MOD-17, wire `@typescript-eslint/consistent-type-imports: "error"` as the substitute. | Autofixable, requires no module-format migration, and catches the same import-side pattern. It does **not** give the export-side elision determinism — naming that shortfall is the point; do not record the repo as compliant with TS-MOD-16 (import-type-and-interop §7). | The rule name in `eslint.config.*`; `eslint --fix` then a clean re-run. | SHOULD |
| **TS-MOD-21** | Never write `importsNotUsedAsValues` or `preserveValueImports` in any tsconfig. | Deprecated in TS 5.0, no-op from 5.5, and a hard build failure from 6.0 — reproduced on 6.0.3: `error TS5102: Option 'importsNotUsedAsValues' has been removed. ... Use 'verbatimModuleSyntax' instead.` (exit 2). The fleet's pin is `^6.0.x`, so this is a broken build, not a warning (import-type-and-interop §1). | `grep -rn "importsNotUsedAsValues\|preserveValueImports" --include='tsconfig*.json' .` returns nothing. | MUST |
| **TS-MOD-22** | In an `extends`-chain monorepo, verify each base-level compiler flag survives **every** package's own `extends` line, by reading the resolved config — not the base config, and not the package file's text. | A package that extends a third-party preset instead of the repo base silently drops the base's flags. `kate-middlechild/packages/web` extends `astro/tsconfigs/strict` rather than `../../tsconfig.base.json`, losing `verbatimModuleSyntax` inside an otherwise-enforcing monorepo — invisible from either file alone (import-type-and-interop §8). | `tsc -p <each package tsconfig> --showConfig \| grep <flag>` — the resolved value, per package. | MUST |
| **TS-MOD-23** | A rule file, README or docblock may assert a compiler-enforced guarantee only if `tsc --showConfig` confirms the flag in that repo's resolved config. Otherwise state it as a convention and say it is unenforced. | Two of six fleet rule files assert `verbatimModuleSyntax: true` "forces `import type`" in repos where the flag is **not set** — in identical wording, so one was copied from the other and neither author checked the tsconfig. An agent consuming that claim at face value is worse off than with no claim at all (import-type-and-interop §11). | For every compiler flag a rule file names: `tsc -p <tsconfig> --showConfig \| grep <flag>`. A miss means fix the flag or fix the prose — never leave both standing. | MUST |

### TS-PKG — distribution and publish verification

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **TS-PKG-01** | A `bin`-primary package's CI must pack the tarball, install it into a scripts-disabled sandbox outside the repo, and **execute the installed bin**, asserting its output. publint + attw against the source tree is not sufficient. | Those tools verify the manifest *declares* correctly; only install-and-run proves the packed artifact works. `@ocx-sh/catalog@0.1.0` shipped without its `bin` past a lesser check (publish-verification §4). | The verification script contains `npm install --ignore-scripts <tarball>` in a `mkdtemp` dir, followed by executing `node_modules/.bin/<name>` and asserting on its output. | MUST |
| **TS-PKG-02** | Run that pack-smoke on every PR, not only at tag/release time. | A release-only gate finds the bug after it is already on `main` (publish-verification §11). | `grep -l "pack-smoke\|publint\|attw" .github/workflows/ci.yml` matches — the CI workflow, not only `release.yml`. | MUST |
| **TS-PKG-03** | Also run `npm publish --dry-run` and fail on the string `"auto-corrected"`; gate it on network availability and treat only the exact `E403`/"cannot publish over the previously published versions" rejection as non-fatal. | Only `publish` calls `pkgJson.fix()` — `pack` goes through pacote and never normalizes, so a pack-only check *structurally cannot* catch this class (npm/cli `lib/commands/publish.js` vs `lib/commands/pack.js`; publish-verification §5). Between releases the version is already live, so an unfiltered dry-run fails on every PR for an unrelated reason. | Two distinct command invocations in the script (`npm pack` **and** `npm publish --dry-run`); the error branch matches the npm rejection text, never a bare non-zero exit. | MUST |
| **TS-PKG-04** | Order `exports` conditions `types` first, `default` last. | Node's resolver treats key order as match priority, not decoration; alphabetizing breaks it silently (Node conditional-exports docs; publint `EXPORTS_TYPES_SHOULD_BE_FIRST` / `EXPORTS_DEFAULT_SHOULD_BE_LAST`). | `publint run <tarball>` in the pack-smoke. | MUST |
| **TS-PKG-05** | Every `bin` target file starts with `#!/usr/bin/env node`, and the build explicitly chmods it executable. | npm's `bin-links`/`fix-bin.js` self-heals the POSIX mode on every real install (even under `--ignore-scripts`) but never inserts a missing shebang — the shebang is the half npm cannot fix, and the mode bit still matters for any non-npm-mediated consumer of the tarball (publish-verification §6). Never ship a `postinstall` that chmods for the consumer. | `publint`'s `BIN_FILE_NOT_EXECUTABLE` gates the PR; `ls -l dist/<bin>` after a clean build shows the executable bit. | SHOULD |
| **TS-PKG-06** | When attw reports `cjs-resolves-to-esm` on a pure-ESM package with no CJS entrypoint, ignore exactly that rule — never disable attw wholesale or widen the ignore list. | It is the expected shape of an ESM-only package; a broad disable also hides `NoResolution`/`InternalResolutionError`, which are real (publish-verification §3). | The attw invocation's `--ignore-rules` contains exactly `cjs-resolves-to-esm`. | SHOULD |
| **TS-PKG-07** | A subpath export that ships raw `.ts`/`.mts`/`.vue` source must be excluded from attw's graph **and** covered by its own dedicated `tsc -p` pass. An excluded entrypoint with no replacement check is untested, not merely unverified. | attw's TS-graph resolver cannot evaluate bundler-only specifiers and false-positives on every relative import inside them (publish-verification §7). | The subpath appears in `--exclude-entrypoints`, and a `tsc -p <tsconfig>` invocation exists whose `include` covers that subtree. | MUST |
| **TS-PKG-08** | For a package deliberately without a `"."` export, suppress publint's `EXPORTS_MISSING_ROOT_ENTRYPOINT` per-package with a comment — never add a root export to silence it. | A root export added to satisfy a linter creates a real, unintended public API surface (publish-verification §2). | The publint ignore list carries that one code plus a comment naming the CLI-only shape. | SHOULD |
| **TS-PKG-09** | The pack-smoke's dependency-completeness walk must extract dynamic `import()` and `require()` specifiers, not only static `import ... from`. | A dependency reachable only through a lazy `import()` is invisible to a static grep and can sit in `devDependencies` until a consumer's install breaks — a real prior incident in `ocx-catalog` (publish-verification §4 step 6). Fleet-wide there are 134 dynamic `import()` sites (code-shape §5). | The extraction logic handles both call forms; the walk resolves bare specifiers against a sandbox `node_modules` populated only from `dependencies`/`peerDependencies`. | SHOULD |
| **TS-PKG-10** | Never declare an `engines.node` floor on a Node line that has reached end-of-life, and back the floor with a CI leg pinned to the **literal** declared version — not "latest of that major". | `engines.node` is advisory-only without `engine-strict`, and publint's `USE_ENGINES_NODE` only checks the field's *presence*, never its currency — nothing in a normal pipeline verifies the number is true (publish-verification §9). Node 20 went EOL 2026-03-24. | Compare the floor against [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases); confirm the CI matrix contains the exact version string from `engines.node`. | MUST |
| **TS-PKG-11** | Do not add a dual CJS/ESM build to support `require()` consumers once `engines.node` is at or above v20.19.0 / v22.12.0. | `require(esm)` is unflagged and warning-free at exactly those versions (Stable at v25.4.0); a dual build adds real build and test surface for a problem that no longer exists at the package's own floor. The one surviving constraint is top-level `await` (`ERR_REQUIRE_ASYNC_MODULE`) (publish-verification §8). | Compare `engines.node` against those thresholds, and `grep -rn '^await\|^const .* = await' src/` for top-level await on a `require()`-reachable path. | SHOULD |

## Applied to the fleet

**Already satisfied.**
- `setup-ocx` satisfies TS-MOD-01/04 fully — 18/18 relative imports carry `.js`
  under `nodenext`, and its `esbuild.js` sets `platform: "node"` +
  `conditions: ["node","import"]`, i.e. the bundler was configured to *imitate*
  Node rather than relax it. Three resolvers (tsc, esbuild, `bun test`) touch the
  same source and all three agree (resolution-per-shape §7, §10).
- `ocx-catalog` satisfies TS-MOD-06/07 (`tsconfig.theme.json:9-18` splits to
  `bundler` **with the reason in an inline comment**), and TS-PKG-01/02/03/06/07/09
  via `scripts/pack-smoke.mjs`, wired at `ocx-catalog/.github/workflows/ci.yml:89`
  and re-run in `release.yml`'s gate (implemented-contracts §4).
- `grimoire-vscode` satisfies TS-MOD-01 — `ESNext`/`Bundler`
  (`grimoire-vscode/tsconfig.json:2-21`) matches its real host, esbuild.
- Both browser SPAs and `kate-middlechild` satisfy TS-MOD-01; `kate-middlechild/packages/web`'s
  `Bundler` is preset-inherited from `astro/tsconfigs/strict` → `base.json`,
  verified against Astro's own source — correct indirection, not drift.
- TS-MOD-08 is satisfied everywhere it applies: `fma/tsconfig.app.json:2-20` and
  `creeptd-ng/web/e2e/tsconfig.e2e.json:2-18` both pair `allowImportingTsExtensions`
  with `noEmit: true`.
- TS-MOD-13's baseline is clean: zero real extraneous or unresolved imports
  fleet-wide, after excluding five false-positive shapes (`@/` aliases, `vscode`,
  `astro:content`, `bun:test`, and Node package self-reference) (import-graph §8).
- **TS-MOD-16 is satisfied in 3 repos**: `setup-ocx/tsconfig.json`,
  `creeptd-ng/web/tsconfig.json` (+ its standalone `e2e/tsconfig.e2e.json`), and
  `kate-middlechild/tsconfig.base.json` → inherited by `packages/core`. Five of
  13 tsconfigs effective.
- **TS-MOD-18 is satisfied in exactly one repo, and not via ESLint**:
  `kate-middlechild/biome.json:51` sets `useImportType: "error"`, whose `auto`
  style cannot produce the all-inline-`type` shape in the first place.
- **TS-MOD-21 is satisfied fleet-wide**: zero occurrences of either removed flag
  across all 15 tsconfigs. Worth a permanent gate rather than a one-time check,
  since the fleet's TS floor is where those flags stopped being a silent no-op.

**Violated.**
- **`grimoire-indexer` violates TS-PKG-01, -02, -03, -05.** Neither `publint` nor
  `@arethetypeswrong/cli` is in `devDependencies`, no pack-smoke script exists,
  and neither name appears in `ci.yml` or `release.yml` — despite shipping the
  *more* complex export surface of the two CLIs (`.` + `./integration`, both
  pointing at `dist/`) (config-inventory §5; implemented-contracts §4). Its only
  shape check is the bare `"auto-corrected"` grep, run once at tag-push time,
  post-merge. Its `dist/cli/index.js` also ships `0o644` — no chmod in its build
  (publish-verification §6).
- **`ocx-catalog` violates TS-PKG-10.** `"engines": { "node": ">=20.19" }`
  (config-inventory §5) claims a line that went EOL 2026-03-24, five months ago.
  `grimoire-vscode` and `vscode-ocx` (`node: >=20`) violate it identically.
- **`vscode-ocx` violates TS-MOD-05 and TS-MOD-07.** `Node16`/`Node16`
  (`vscode-ocx/tsconfig.json:2-21`) with no `"type"` field, so the extension check
  is inert; and it diverges from its structurally identical sibling
  `grimoire-vscode` with no comment anywhere explaining why. The fix is one line —
  match the sibling's `ESNext`/`Bundler` — not eleven import edits.
- **`kate-middlechild` violates TS-MOD-15.** `packages/core/src/map.test.ts:12`
  imports `../../web/src/data/ph-regions.geojson.json`, running backwards the
  contract `packages/core/src/index.ts` states in its own header. Single
  occurrence, test-only; no non-test case exists (import-graph §9).
- **All nine repos violate TS-MOD-09, -11, -12, -13** — zero import-graph rules
  are installed or enabled anywhere in the fleet (import-graph §Summary).
  `grimoire-indexer` carries the 4 cycles this would report.
- **`creeptd-ng/web` has a precondition failure before any of TS-MOD-09/11/13/18/19
  can land**: a `"lint": "eslint src"` script, no `eslint.config.*` on `main`, and
  no `eslint` package in its manifest — the script cannot run today. It is also
  the sharpest case of the gap: it *has* `verbatimModuleSyntax` and therefore the
  TS-MOD-18 footgun, with nothing in the repo able to catch it. (The missing-config
  defect itself is TS-TOOL-04's; not restated as a TS-MOD rule.)
- **Four repos violate TS-MOD-16 at zero measured cost**: `grimoire-indexer`
  (NodeNext + `"type": "module"`), `ocx-catalog` (same), `fma` (Bundler, both
  configs) and `grimoire-vscode` (Bundler) all compile clean under
  `--verbatimModuleSyntax`. This is a four-line change, not a migration.
- **`grimoire-vscode` and `vscode-ocx` violate TS-MOD-23.** Both
  `.claude/rules/quality-typescript.md` files state `verbatimModuleSyntax: true`
  "forces `import type`… enforced"; neither tsconfig sets it. Identical wording in
  both — a copied template nobody checked. For `grimoire-vscode` the fix is to make
  the claim true (TS-MOD-16, free); for `vscode-ocx` it is to correct the prose,
  because TS-MOD-17 blocks the flag until its module format is resolved.
- **`grimoire-vscode` carries the fleet's one live TS-MOD-18 instance**:
  `src/test/extension.test.ts:23`, `import { type GrimoireApi } from '../extension';`.
  Harmless only because the flag is off. Fixing TS-MOD-16 there without fixing this
  line first introduces a silent side-effect import of the extension entry point
  into a test file — fix the line in the same commit.
- **`kate-middlechild/packages/web` violates TS-MOD-22**: it extends
  `astro/tsconfigs/strict` rather than the repo's `tsconfig.base.json`, dropping
  `verbatimModuleSyntax` in the one package of an otherwise-enforcing monorepo.
- **No ESLint repo satisfies TS-MOD-19.** None of the six wires
  `consistent-type-imports` or `no-import-type-side-effects` by name, including
  `setup-ocx`, whose `strictTypeChecked` + `stylisticTypeChecked` supplies neither.
- **`vscode-ocx` is blocked by TS-MOD-17, not in violation of TS-MOD-16.** Its 62
  `TS1295`/`TS1287` errors resolve only through the module-format decision already
  open below — it is the same decision as its TS-MOD-05/07 violation, now with a
  third consequence attached.

**New commitments (nothing in the fleet does these yet).**
- TS-MOD-03 (`tsc --showConfig` after any `module`/`moduleResolution` edit) — no
  repo has this in a script or a rule file.
- TS-MOD-09/10 as mechanical rules: `grimoire-indexer`'s cycle-safety invariant is
  currently enforced only by a prose comment in `src/ratings/provider.ts`.
- TS-MOD-14's re-export-fan-out heuristic — six repos ship a
  `quality-typescript.md` and none of them mentions barrels.
- TS-PKG-10's literal-floor CI leg: `grimoire-indexer`'s matrix runs `["22","24"]`
  (latest patch of each major), never `22.14.0` itself.

**Noted, not a violation.** `fma/src/render/index.ts` is a true barrel with zero
callers — `fma/src/graph/runner.ts` imports `Renderer.ts` directly. Dead weight,
not dev-server cost; delete it rather than write a rule for it.

## AI-agent failure modes

Ranked by how often it bites, most first. Items 18-24 were added by the
import-type/interop round and are appended rather than re-ranked, so the
cross-references in 1-17 stay valid.

1. **Editing tsconfig without running the compiler.** Every trap below surfaces
   instantly under `tsc --showConfig` / `tsc --noEmit` and is invisible to a
   JSON-schema check. This is the parent failure of items 2, 3 and 6.
2. **Reaching for `"moduleResolution": "node"` from pretraining.** It was the only
   Node-flavored value before 2022. Still parses in TS 6.x with a deprecation
   warning easy to lose in noisy output; hard-fails in 7.0.
3. **Inventing `"moduleResolution": "node18"`/`"node20"`** by extrapolating from
   the real, similarly named `module` values. `TS6046` — loud, but only once
   something runs `tsc`.
4. **"Just remove the extension" as a fix for `TS2307`.** The path-of-least-
   resistance response to a resolution error, and it is the wrong fix for two of
   the three causes: it trades `TS2307` for `TS2835` under `node16`/`nodenext`,
   or ships code that fails only under real Node. Check the effective
   `moduleResolution` first — dropping an extension is legitimate only under
   `bundler`.
5. **Applying an extension fix uniformly across a repo.** An agent fixing one
   package's extensionless imports "helpfully" rewrites `ocx-catalog/src/theme`'s
   139 correct ones, 61 of which are `.vue` specifiers that take no `.js` under
   any mode.
6. **Enabling a Biome `project`-domain rule by name alone**, shipping a config
   that looks enforced and is very plausibly a no-op.
7. **Reflexively proposing a dual CJS/ESM build.** Pre-2024 "best practice"
   (`tsup --format cjs,esm`) applied without checking the package's own
   `engines.node` against the `require(esm)` thresholds.
8. **Alphabetizing `exports` conditions** because it reads as tidier JSON, when
   Node treats key order as match priority.
9. **Flagging every `index.ts` as barrel debt** on filename alone — 9 false
   positives per real hit in this fleet.
10. **Assuming `npm pack` and `npm publish --dry-run` validate the same things.**
    Both get described as "a dry run of publishing"; only one runs `pkgJson.fix()`.
11. **Assuming Biome's `noUnresolvedImports` is ESLint's `no-unresolved`.** Same
    name shape, different checks — named-export existence vs. path resolution.
    An agent porting a rule across the fleet's ESLint/Biome split leaves a real
    gap either way.
12. **Installing `eslint-plugin-import` and writing the legacy
    `settings['import/resolver']` shape** — both are what training-era examples
    show, and the settings shape is inert against `import-x >= 4.5.0`.
13. **Breaking a cycle by flipping `const` ↔ `function`** without checking whether
    the value is read at module top level — the keyword is not what determines TDZ
    safety.
14. **Auto-fixing a cross-package relative import to the bare specifier**, when
    the target is not in that package's `exports` map — the failure just moves.
15. **Hallucinating attw flags.** The real set is `--ignore-rules`,
    `--exclude-entrypoints`/`--include-entrypoints`, `--entrypoints`,
    `--entrypoints-legacy`, `--profile`, `--pack`.
16. **Writing a `postinstall` that chmods the package's own bin** — redundant
    (npm's `bin-links` already does it, script-independent) and actively harmful.
17. **Hard-coding a tool's rule/problem count.** The brief said publint had "27
    errors, 14 warnings, 7 suggestions" and attw "11 problem codes"; the sources
    read 21/15/7 = 43 and 12. Derive from the source, never from a cached number.
18. **Treating `isolatedModules` as covering imports** because the two flags are
    almost always named in the same sentence. It covers re-exports only. After
    adding `verbatimModuleSyntax`, the new `TS1484`s *are* the imports that were
    silently relying on default elision — they are the work, not noise.
19. **Answering "unused import" with `import { type X }` instead of
    `import type { X }`.** Both are valid TypeScript, but an import where every
    specifier ends up inline-`type` collapses to `import {} from "mod"` — a bug
    the agent cannot see in its own diff, because it only exists in emitted JS
    the agent never reads, and `tsc` prints nothing.
20. **Emitting `importsNotUsedAsValues`/`preserveValueImports` into a fresh
    tsconfig** from pre-5.0 training data, especially when asked to "make type
    imports explicit". On this fleet's TS floor that is `TS5102`, a hard build
    failure — invisible to an agent that writes the config and never runs `tsc`.
21. **Assuming a `typescript-eslint` preset already includes
    `consistent-type-imports`.** No preset but `all` does; `strictTypeChecked`
    does not. An agent "confirming the rule is on" by pointing at the preset is
    reading a config that never contained it.
22. **Declaring `verbatimModuleSyntax` unsafe from a raw error count.** A naive
    cross-repo `tsc` run on `ocx-catalog` prints 121 alarming lines that are
    entirely pre-existing missing-`@types/node` noise; `vscode-ocx`'s 62 are
    100% structural and unfixable by the flag's own remedy. Filter for
    `TS1484`/`TS1205`/`TS1287`/`TS1295`/`TS1202` before concluding anything.
23. **Repeating the handbook's claim that `import x = require()` is forbidden in
    an ESM-format file under NodeNext.** tsc 6.0.3 compiles it clean via a
    synthesized `createRequire` shim. The documentation and the compiler
    disagree; cite the compiler you pin, and re-run the check.
24. **Writing `import x = require()` under `module: esnext`/`es2022`** — this
    one *does* fail hard and reliably (`TS1202`), unlike 23. It is caught by any
    type-check on the 5 of 9 repos using a Bundler/ESNext `module` setting, so
    the exposure is exactly the agent that edits without ever invoking `tsc`.

## Open questions

**Needs a human decision.**
- **`vscode-ocx`: align to `Bundler` or make `Node16` true?** Aligning with
  `grimoire-vscode` is zero source changes and removes the fragility; adding `.js`
  to 11 imports buys a portability guarantee VS Code never uses. Recommendation is
  the former, but it is a "do the two extensions converge?" call, not a technical one.
  **The follow-up raised the stakes**: the same choice also decides whether the repo
  can ever take `verbatimModuleSyntax` (TS-MOD-16/17). `Bundler` makes the flag free
  and correct the rule file in one move; adding `"type": "module"` instead makes the
  flag legal but must first be proven against the extension host and `@vscode/test-cli`.
  Until it is decided, `vscode-ocx` runs TS-MOD-20 as the substitute.
- **`grimoire-indexer`'s `"."` export: stub or future API?** It decides
  `npm-shrinkwrap.json` (npm recommends it for CLIs, discourages it for libraries),
  whether TS-PKG-11's ESM-only reasoning holds, and whether the `.` entry should
  exist at all today. Deliberately left out of the ruleset until answered.
- **The three EOL `engines.node` floors** (`ocx-catalog >=20.19`, both extensions
  `>=20`) — raising them is a consumer-facing break, not a lint fix.
- **`creeptd-ng/web`'s missing ESLint config**, which blocks six TS-MOD rules
  from landing there at all — and leaves its `verbatimModuleSyntax` unaccompanied
  by TS-MOD-18.
- **Is `kate-middlechild/packages/web`'s Astro `extends` a deliberate exception or
  drift?** `astro/tsconfigs/strict` may be load-bearing for `.astro` type-checking
  in a way that will not simply accept `verbatimModuleSyntax` layered on top. The
  cost is unmeasured (Verdict §14b) and closing it is a five-minute
  `tsc -p packages/web --noEmit --verbatimModuleSyntax` **once the Astro toolchain
  is installed** — an environment gap, not a research question. Decide whether the
  package is an exception before running the test, so a green result is not read as
  permission to change an intentional choice.

**Deserves another research round.**

Nothing further is commissioned for this topic. Both wave-2 items — the
`import type`/interop subarea and the `eslint-import-resolver-typescript`
NodeNext question — were settled by
[import-type-and-interop.md](ts-modules/import-type-and-interop.md) and now sit in
the Verdict (§11-15) and rules TS-MOD-16..23. The two things that remain unknown
are documented gaps, not unresearched ground: the handbook/compiler disagreement
on `import x = require()` (Verdict §14a), which needs a compiler-source reading or
an upstream issue rather than another dive, and the `packages/web` measurement
above, which needs an installed toolchain.

## Sub-artifacts

- [resolution-per-shape.md](ts-modules/resolution-per-shape.md) — which axis decides
  `moduleResolution`, the format-not-name trigger for the `.js` rule, and the
  empirical acquittal of `vscode-ocx`; verified against live TS 6.0.3 and 7.0.2.
- [publish-verification.md](ts-modules/publish-verification.md) — what publint/attw
  actually bind for a `bin`-primary package, the `npm pack` vs `publish --dry-run`
  normalization gap read out of npm's own source, and the exact CI command set.
- [import-graph.md](ts-modules/import-graph.md) — measured cycles, extraneous and
  unresolved imports across all nine repos, the barrel-file census, and the
  ESLint/Biome rule split with its two silent-no-op traps.
- [import-type-and-interop.md](ts-modules/import-type-and-interop.md) — the
  per-shape `verbatimModuleSyntax` decision measured against real `tsc` in every
  repo it could reach, the `isolatedModules` disjointness proof, the
  all-inline-`type` emit footgun, the preset-membership check read out of the
  installed plugin, and the NodeNext resolver fixture. Commissioned by this
  document's own wave-2 open questions; folded in 2026-08-29.

## Key sources

| URL | Why |
|---|---|
| [TS handbook — Modules: Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html) | Defines *host* as the deciding concept; source of "bundler is infectious" and the format-based module-kind algorithm. |
| [TS handbook — Modules: Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | Per-mode behavior table; needed empirical correction on node18/20-as-moduleResolution. |
| [Andrew Branch — Is nodenext right for libraries that don't target Node.js?](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) | The strongest argument for `nodenext` even in bundler-consumed packages; one half of the resolved conflict in Verdict §3. |
| [TypeScript 5.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html) | `rewriteRelativeImportExtensions` semantics — exactly what it rewrites and what it leaves alone. |
| [Announcing TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/) | Origin and constraints of `moduleResolution: bundler` and `allowImportingTsExtensions`. |
| [nodejs.org — Modules: Packages](https://nodejs.org/api/packages.html) | Canonical condition order, the ESM mandatory-extension rule, conditional-exports ordering, and package self-reference. |
| [nodejs.org — require(esm)](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) | The exact unflag / no-warning / Stable version thresholds behind TS-PKG-11. |
| [nodejs.org — previous releases](https://nodejs.org/en/about/previous-releases) | Node 20 EOL 2026-03-24 — the verification target for TS-PKG-10. |
| [npm/cli — lib/commands/publish.js](https://github.com/npm/cli/blob/latest/lib/commands/publish.js) | The `pkgJson.fix()` call that `pack.js` does not have — proof for TS-PKG-03. |
| [npm/bin-links — fix-bin.js](https://github.com/npm/bin-links/blob/main/lib/fix-bin.js) | Proves npm self-heals the POSIX mode independent of lifecycle scripts. |
| [publint — core.js](https://github.com/publint/publint/blob/master/packages/publint/src/shared/core.js) | `BIN_FILE_NOT_EXECUTABLE` is a shebang-content check, not a mode check. |
| [attw — problems.ts](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/core/src/problems.ts) | The canonical problem-kind list; derive the count, never cache it. |
| [docs.npmjs.com — package.json engines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines) | Advisory-only without `engine-strict` — why TS-PKG-10 needs a CI leg. |
| [biomejs.dev — linter domains](https://biomejs.dev/linter/domains/) | The `project`-domain opt-in that makes TS-MOD-12 a real trap. |
| [biomejs.dev — noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/) | Establishes it checks named-export existence, not path resolution. |
| [un-ts/eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x) | The fork's own origin story — the evidence that softened "unmaintained" to "declined the fixes". |
| [esbuild — resolve conditions](https://esbuild.github.io/api/#resolve-extensions) | `platform: node` auto-injects the `node` condition, independent of any tsc config. |
| [TSConfig — verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) | Canonical description of the flag and its (mis-stated everywhere else) relation to `isolatedModules` — the basis of TS-MOD-16. |
| [TSConfig — isolatedModules](https://www.typescriptlang.org/tsconfig/#isolatedModules) | What it actually restricts; cross-checked against real `tsc` to prove the two flags are disjoint, not ranked. |
| [TypeScript 5.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) | `importsNotUsedAsValues`/`preserveValueImports` became no-ops here and a `TS5102` error in 6.0 — TS-MOD-21. |
| [typescript-eslint — no-import-type-side-effects](https://typescript-eslint.io/rules/no-import-type-side-effects/) | The `import {} from "mod"` emit footgun behind TS-MOD-18, reproduced against real 6.0.3 emit. |
| [typescript-eslint — consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/) | Options and the decorator-metadata caveat (irrelevant here: zero `emitDecoratorMetadata` fleet-wide) — TS-MOD-20. |
| [Biome — useImportType](https://biomejs.dev/linter/rules/use-import-type/) | On by default in `recommended`, unlike the typescript-eslint pair; its `auto` style cannot produce the TS-MOD-18 shape. |
| [Vite — TypeScript](https://vite.dev/guide/features.html#typescript) | Vite 8 transpiles via Oxc, not esbuild; same per-file type erasure, so `import type` correctness is required independent of any tsc flag. |
| [import-js/eslint-import-resolver-typescript](https://github.com/import-js/eslint-import-resolver-typescript) | The `resolver-next` / `createTypeScriptImportResolver` API used verbatim in the fixture that closed the NodeNext question. |

## Revision log

**2026-08-29 — folded in `ts-modules/import-type-and-interop.md`** (commissioned
by this document's own wave-2 open questions). Rule IDs are a hard contract: no
existing ID was renumbered, reordered or reused.

- **Added TS-MOD-16..23** — the `import type`/interop subarea, which none of the
  three wave-2 dives had covered. 16/17: the per-shape `verbatimModuleSyntax`
  floor and its one structural exclusion. 18: `no-import-type-side-effects`
  alongside the flag. 19: no preset supplies these rules. 20: the ESLint-only
  substitute for repos blocked by 17. 21: the two removed pre-5.0 flags. 22:
  base flags surviving an `extends` chain. 23: a rule file may not assert an
  unset compiler flag.
- **Changed TS-MOD-05 (rationale)** — an absent `"type": "module"` under
  `node16`/`nodenext` was described as costing only the extension check. It also
  forecloses `verbatimModuleSyntax` outright (62 measured `TS1295`/`TS1287` on
  `vscode-ocx`). Rule text and severity unchanged; the consequence was
  understated.
- **Changed TS-MOD-11 (rationale)** — the rule shipped over an unverified
  assumption that `eslint-import-resolver-typescript` handles NodeNext's
  `./foo.js`→`foo.ts` rewrite. A live fixture confirms it does; the caveat is
  withdrawn rather than left implicit. This is the overclaim class: the rule was
  right, but nothing behind it was.
- **Verdict §11-15 added.** §11 the per-shape floor; §12 `isolatedModules` and
  `verbatimModuleSyntax` are disjoint, not ranked; §13 the resolver question
  closed; §14 two *documented gaps* — the handbook/compiler disagreement on
  `import x = require()`, and `kate-middlechild/packages/web` being unmeasurable
  in this snapshot; §15 three corrected wave-2 baselines (3 repos not 2 carry the
  flag, 254 not 255 `import type` sites, zero not one real `require(`).
- **Open questions: both wave-2 research items removed** (subarea and resolver —
  both settled). `vscode-ocx`'s module-format decision gained a third
  consequence. `creeptd-ng/web`'s missing ESLint config now blocks six rules, not
  four. Added the `packages/web` Astro `extends` call, which is a decision plus
  an environment gap, not a research question.
- **AI failure modes 18-24 appended, not re-ranked** — items 1-17 cross-reference
  each other by number, so the new entries sit at the end and the intro says so.
- **Applied to the fleet** gained TS-MOD-16/18/21's satisfied set, the four
  free-at-zero-cost TS-MOD-16 violations, the two drifted rule files (TS-MOD-23),
  the single live TS-MOD-18 instance in `grimoire-vscode`, `packages/web`'s
  TS-MOD-22 violation, and the fleet-wide TS-MOD-19 miss.
- **Not written as rules, deliberately.** (a) A rule banning `import x = require()`
  under `module: esnext` — `TS1202` is loud, immediate, and fires on any
  type-check; it is AI-failure-mode 24 instead. (b) Anything about
  `creeptd-ng/web`'s missing linter config — TS-TOOL-04 already owns it; TS-MOD
  records only the consequence.
