---
title: Publish Verification for Shape 1 (bin-primary CLI, no library API)
topic: ts-modules/publish-verification
agent: scout-publish-verification
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 18
scope: >
  Covers what publint/attw/npm actually check for an npm-distributed CLI whose
  declared entry points are `export {};` stubs (ocx-catalog, grimoire-indexer),
  and the exact CI commands that verification requires. Does not cover
  library-shaped packages (dual-purpose packages with a real `.` API are
  shape 2, out of scope), VS Code extension packaging, or the Bun/GitHub
  Action shape (setup-ocx).
---

## Table of contents

1. [The shape and why it changes which rules bind](#1-the-shape-and-why-it-changes-which-rules-bind)
2. [publint rule triage for shape 1](#2-publint-rule-triage-for-shape-1)
3. [attw problem-code triage for shape 1](#3-attw-problem-code-triage-for-shape-1)
4. [What a pack-smoke must actually do for a CLI](#4-what-a-pack-smoke-must-actually-do-for-a-cli)
5. [`npm pack` vs `npm publish --dry-run`: the manifest-normalization gap](#5-npm-pack-vs-npm-publish---dry-run-the-manifest-normalization-gap)
6. [The bin executable bit: shebang (publint) vs POSIX mode (npm self-heals)](#6-the-bin-executable-bit-shebang-publint-vs-posix-mode-npm-self-heals)
7. [Shipping `.mts` source through an `exports` subpath](#7-shipping-mts-source-through-an-exports-subpath)
8. [ESM-only vs dual publishing, given `require(esm)`](#8-esm-only-vs-dual-publishing-given-requireesm)
9. [`engines.node`: checkable claim or decoration](#9-enginesnode-checkable-claim-or-decoration)
10. [`npm-shrinkwrap.json` for a CLI that is also importable](#10-npm-shrinkwrapjson-for-a-cli-that-is-also-importable)
11. [The compliance gap: ocx-catalog vs grimoire-indexer](#11-the-compliance-gap-ocx-catalog-vs-grimoire-indexer)

---

## Summary

- Shape 1 = a package whose value is `bin`, not `exports`: both fleet CLIs (`ocx-catalog`, `grimoire-indexer`) declare `"type": "module"` and a `bin` entry, and their only importable-looking export is `export {};` — a stub with no real API surface today.
- publint has 43 total rules (21 error / 15 warning / 7 suggestion) as read from [publint.dev/rules](https://publint.dev/rules) and cross-checked against 43 distinct `case` labels in publint's own [`message.js`](https://github.com/publint/publint/blob/master/packages/publint/src/shared/message.js) — 7 of those bind shape 1 directly (bin/files/types-order/engines), and 4 are preventive-only while the fleet stays ESM-only.
- attw currently reports **12** problem kinds, not 11 — verified against the live [`problemKindInfo`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/core/src/problems.ts) object on `main`; treat "11" as stale, attw adds kinds between minors.
- `npm pack` and `npm publish --dry-run` are **not** the same validation: only `publish` calls the manifest-fix path (`pkgJson.fix()`) that emits the `"auto-corrected"` warning — confirmed by reading [`lib/commands/publish.js`](https://github.com/npm/cli/blob/latest/lib/commands/publish.js) (has the call) against [`lib/commands/pack.js`](https://github.com/npm/cli/blob/latest/lib/commands/pack.js) (does not). A pack-smoke that never runs `publish --dry-run` cannot catch this class of silent rewrite.
- A pack-smoke for a `bin`-shaped package must, at minimum: pack → publint the tarball → attw `--pack` the tarball → install the tarball into a scripts-disabled sandbox → run the **installed** bin and assert its version/output → resolve every declared subpath export → assert no `"auto-corrected"` string in a `publish --dry-run`. `ocx-catalog`'s `scripts/pack-smoke.mjs` implements exactly this contract; nothing less catches the class of bug that shipped `@ocx-sh/catalog@0.1.0` without its `bin`.
- publint's `BIN_FILE_NOT_EXECUTABLE` checks **file content for a shebang line**, not the POSIX executable bit — confirmed by reading the check in [`core.js`](https://github.com/publint/publint/blob/master/packages/publint/src/shared/core.js#L1381-L1389) (`startsWithShebang(binContent)`). Both fleet CLIs already carry `#!/usr/bin/env node`; this rule already passes fleet-wide and needs no fixing, only wiring into grimoire-indexer's CI.
- The POSIX `+x` bit is a separate, publint-invisible concern npm largely self-heals: [`npm/bin-links`'s `fix-bin.js`](https://github.com/npm/bin-links/blob/main/lib/fix-bin.js) chmods the real bin target to `0o777 & ~umask` on every real `npm install`/`npm ci` that creates the symlink — verified this runs even under `--ignore-scripts` (bin-linking is arborist reify, not a lifecycle script). Fleet evidence: `ocx-catalog/dist/cli/index.js` ships `0o755` (explicit `postbuild` chmod); `grimoire-indexer/dist/cli/index.js` ships `0o644` (no chmod step) — self-heals for real npm consumers, but the tarball itself still carries the wrong mode, which is a real difference for any non-npm-mediated consumer.
- `ocx-catalog`'s `./theme` subpath ships raw `.mts` source (no compiled `.js`/`.d.ts`) through `exports`; this is defensible **only** because its sole real consumer is a Vite-based bundler (VitePress) that resolves `.mts`/`.vue` directly — it is not a general library export, which is why attw is explicitly excluded from that entrypoint (attw's TS-graph resolver doesn't understand `.vue`) and why correctness there is enforced by a second `tsc -p tsconfig.theme.json` pass, not by publint/attw.
- `require(esm)` is Stable as of Node **v25.4.0**, lost its experimental warning at **v23.5.0 / v22.13.0 / v20.19.0**, and was unflagged at **v23.0.0 / v22.12.0 / v20.19.0** — read directly off [nodejs.org/api/modules.html](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require). Both fleet CLIs' declared floors (`>=20.19`, `>=22.14.0`) sit at or above the "no flag, no warning" threshold, so a CJS consumer can already `require()` either package's synchronous ESM without a flag — dual CJS/ESM publishing buys the fleet nothing today.
- `engines.node` is advisory-only for `npm install` unless the installer sets `engine-strict` — confirmed on [docs.npmjs.com's package-json engines section](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines). Neither fleet repo sets `engine-strict` in an `.npmrc`, neither has an `eslint-plugin-n`-style syntax-vs-engines lint, and neither CI matrix tests exactly the declared floor — `engines.node` is pure decoration in both repos today.
- Node 20 reached end-of-life **2026-03-24** ([nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases)), five months before this research. `ocx-catalog`'s `engines.node: ">=20.19"` claims support for a dead runtime; publint's `USE_ENGINES_NODE` only checks the field's *presence*, never its *currency*, so no tool in the fleet's own chain catches this.
- npm's own docs recommend `npm-shrinkwrap.json` precisely for "daemons and command-line tools intended as global installs" and discourage it for libraries, "since that would prevent end users from having control over transitive dependency updates" ([npm-shrinkwrap-json docs](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json)). `ocx-catalog` (no `.` export at all) fits the recommended case cleanly; `grimoire-indexer` (a live, if stubbed, `.` export) does not — shrinkwrapping it now would pin transitive deps for a future library consumer that doesn't exist yet, but would need to be revisited the day `src/index.ts` stops being `export {};`.
- **Compliance verdict**: `ocx-catalog` runs the correct verification set today — `publint` + `attw --pack` + install-and-run-bin + dependency-completeness + a network-gated `publish --dry-run` auto-correction guard, wired into both `ci.yml` (every PR) and `release.yml` (every tag). `grimoire-indexer` runs **none of it** — no `publint`/`attw` in `devDependencies`, no pack-smoke script, `task check` is lint+typecheck+test+smoke only, and `release.yml`'s only pack-shape check is the bare `"auto-corrected"` grep on `npm publish --dry-run`, which runs once at tag-push time (post-merge) rather than on every PR.
- The exact CI verification set for shape 1 (commands, in order): `npm pack --pack-destination <dir> --json` → `publint run <tarball>` → `attw <tarball> --ignore-rules cjs-resolves-to-esm` (or `--pack .` if packing from source) → `npm install --ignore-scripts <tarball>` in a throwaway sandbox with its own `package.json` → run `./node_modules/.bin/<bin-name> --version` and assert output → `node --input-type=module -e 'await import.meta.resolve("<pkg>/<subpath>")'` for every declared `exports` subpath → (network job only) `npm publish --dry-run --provenance --access public` scanned for `"auto-corrected"`, tolerating only the exact `E403`/"cannot publish over the previously published versions" rejection text.

## Findings

### 1. The shape and why it changes which rules bind

Both CLIs declare `"type": "module"`, a `bin` map, and a stub library entry point:

```jsonc
// grimoire-indexer/src/index.ts (the "." export target)
export {}; // ponytail: placeholder — init/build/validate land here later
```

`ocx-catalog` goes further and has **no `"."` export at all** — its `exports` map only has `./theme` (raw `.mts` source for the VitePress theme, see §7) and `./package.json`. This is the load-bearing fact for this whole research: publint and attw both ship rules whose entire purpose is validating a *library's* `import`/`require`/`types` triangle across module systems. For a package with no real `.` API, those rules are either moot (nothing resolves through them) or actively noisy (they'd flag the CLI's absent library surface as if it were a bug). The rules that still bind are the ones that check the `bin` field itself, the packed file set, and the metadata every package needs regardless of shape.

### 2. publint rule triage for shape 1

Read from [publint.dev/rules](https://publint.dev/rules) and cross-checked against the 43 `case` labels in [`message.js`](https://github.com/publint/publint/blob/master/packages/publint/src/shared/message.js) (21 error / 15 warning / 7 suggestion = 43, matching the docs page's per-severity grouping).

| Code | Severity | Still binds shape 1? | Why |
|---|---|---|---|
| `EXPORTS_TYPES_SHOULD_BE_FIRST` | error | **Yes** | `./theme`'s conditions must still order `types` first — Node's own [conditional-exports doc](https://nodejs.org/api/packages.html#conditional-exports) states the same rule for any `exports` map, `bin`-primary or not. |
| `EXPORTS_DEFAULT_SHOULD_BE_LAST` | error | **Yes**, if `default` is ever added | Same Node.js primary rule; today neither package's `exports` map uses a `default` condition at all, so the rule is currently vacuously satisfied, not absent. |
| `BIN_FILE_NOT_EXECUTABLE` | error | **Yes — the load-bearing bin check** | Checks the shebang line in the actual `bin` file content (§6); this is the rule most specific to a `bin`-primary package and neither fleet publint/attw config should ever ignore it. |
| `FILE_DOES_NOT_EXIST` | error | **Yes** | Fires on any `bin`/`exports`/`files` entry pointing at a path absent from the tarball — the exact class of bug pack-smoke exists to catch (see §4, §11). |
| `FILE_NOT_PUBLISHED` | error | **Yes** | Complementary to the above: a file that exists locally but isn't in the packed tarball because `files` doesn't cover it. Directly relevant given `ocx-catalog`'s `files` array lists five separate source directories individually. |
| `USE_FILES` | suggestion | **Yes** | A `bin`-only package with no `files` array ships the whole repo (`node_modules`, tests, `.github`) in the tarball; both fleet repos already declare `files`. |
| `USE_TYPE` | suggestion | **Yes** | `"type": "module"` presence check — both repos already comply; keep it because a future contributor could delete the field without noticing (module-detection heuristics would silently start guessing per-file). |
| `USE_ENGINES_NODE` | suggestion | **Yes, but weak** | Only checks the field *exists*, not that it's current — see §9 for why this needs a companion check, not just publint. |
| `EXPORTS_MISSING_ROOT_ENTRYPOINT` | warning | **No — expected for `ocx-catalog`, moot for `grimoire-indexer`** | `ocx-catalog` deliberately has no `"."` export; this warning is a false positive there and should be suppressed per-package, not fixed by adding a fake root export. `grimoire-indexer` already has a `"."` entry (even if it's a stub), so the rule doesn't fire there at all. |
| `FalseCJS` / `FalseESM` (message-level, not a publint code but the equivalent framing) | — | **Preventive only, ESM-only fleet** | See attw table below — publint doesn't have a direct equivalent code; noted here for completeness since the brief groups these together. |

Everything else in publint's 43 (the `IMPORTS_*` family, `EXPORTS_MODULE_SHOULD_*`, `browser`-field rules, `jsnext` deprecation, etc.) targets library-consumption paths (`imports` field, bundler `module` condition, browser shimming) that neither CLI uses and has no reason to add.

### 3. attw problem-code triage for shape 1

attw's full set, read from [`problems.ts`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/core/src/problems.ts) on `main` (12 kinds, not 11 — see [Contested](#contested--evolving)):

| Kind | Still binds shape 1? | Why |
|---|---|---|
| `NoResolution` | **Yes** | A subpath (`./theme`) that fails to resolve at all is exactly the WP-08-class regression pack-smoke exists to catch. |
| `UntypedResolution` | **Yes** | Types missing for a declared subpath — still a real defect even with no `.` export. |
| `InternalResolutionError` | **Yes** | An internal `import` inside the shipped `.d.ts`/type graph that fails to resolve. |
| `FalseCJS` | Preventive only | Fleet is `"type": "module"` everywhere; nothing currently claims CJS types over an ESM implementation. Keep enabled — it's what stops a future accidental CJS `.d.ts` from shipping unnoticed. |
| `FalseESM` | Preventive only | Mirror case: an accidental ESM `.d.ts` over a CJS implementation. Neither repo ships any CJS output today. |
| `CJSOnlyExportsDefault` | Preventive only | Only fires on a CJS entrypoint; the fleet has none. |
| `MissingExportEquals` | Preventive only | Same — a `node16`/CJS-interop concern that doesn't exist while the fleet stays ESM-only. |
| `CJSResolvesToESM` | **Explicitly tolerated, not disabled** | This is the *expected* shape of a pure-ESM package with no CJS entry — `require()` from a CJS consumer resolving to an ESM file is not a bug here, it's the whole point of §8. `ocx-catalog`'s own attw invocation passes `--ignore-rules cjs-resolves-to-esm` for exactly this reason (see its `scripts/pack-smoke.mjs`). |
| `FallbackCondition` | **Yes** | A TypeScript resolution bug class (resolving through a fallback condition it shouldn't) that can appear regardless of package shape. |
| `NamedExports` | **Yes, conditionally** | Only matters if a CJS-facing entrypoint claims named ESM-style exports — currently moot fleet-wide but cheap to leave on. |
| `FalseExportDefault` | Library-only | Concerns a `.d.ts` using `export default` over a `module.exports =` implementation; not reachable from a stub `export {};`. |
| `UnexpectedModuleSyntax` | **Yes** | Catches a file whose syntax contradicts its declared module kind — applies to any shipped file, `bin` included. |

**CLI usage that matters for this shape**, from the [attw CLI README](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md):

```bash
# Pack a tarball first, then check it (what ocx-catalog does — it already
# has the tarball path from `npm pack --json`):
attw ./ocx-sh-catalog-0.5.1.tgz --ignore-rules cjs-resolves-to-esm --exclude-entrypoints ./theme

# Or let attw do the packing itself:
attw --pack . --ignore-rules cjs-resolves-to-esm
```

`--exclude-entrypoints` removes an entrypoint from attw's own resolution graph entirely (still a real export for consumers — just not one attw's TypeScript-based resolver can evaluate, since it doesn't understand `.vue` specifiers). `--pack` only supports npm (`npm pack` under the hood); pnpm/yarn users must pack themselves first — moot for this fleet, which is npm-only (`package-lock.json`, `npm ci` everywhere).

### 4. What a pack-smoke must actually do for a CLI

`ocx-catalog/scripts/pack-smoke.mjs` is the fleet's only implementation of this contract, and it is the right shape for a `bin`-primary package. Distilled to its load-bearing steps (full script: `/home/mherwig/dev/ocx-catalog/scripts/pack-smoke.mjs`):

1. **`npm pack --pack-destination <dir> --json`** — produce the real tarball, not a simulation.
2. **`publint run <tarball>`** on the packed tarball (not the source tree — publint on source can pass while the packed artifact is broken, e.g. a `files` entry that silently drops a directory).
3. **`attw <tarball> --pack` semantics** — type-resolution correctness across module systems, tolerating the one expected `cjs-resolves-to-esm` warning (§3) and excluding entrypoints attw's resolver can't evaluate.
4. **Install the tarball into a scripts-disabled sandbox** (`npm install --ignore-scripts <tarball>` inside a `mkdtemp`'d dir with its own throwaway `package.json`) — this is the step that actually exercises the `bin` field: run the installed shim (`node_modules/.bin/<name>`) and assert its output (e.g. `--version` matches `package.json`'s own version). This is the only step that proves the *installed* artifact works, as opposed to the source tree.
5. **Resolve every declared subpath** via `import.meta.resolve()` from inside that same sandbox — proves both the `exports` entry and its `files`-covered target survived packing. A full evaluation (e.g. actually running the VitePress theme through Vite) is out of scope for a smoke check; resolution alone catches the regression class that matters (a missing `exports` entry or a `files` edit that drops the target file).
6. **Dependency completeness**: walk every shipped source file in the sandbox's `node_modules/<pkg>`, extract every static *and* dynamic `import()`/`require()` specifier, and resolve each bare specifier against the sandbox's `node_modules` (which only has what `dependencies`/`peerDependencies` installed — never the repo's own `devDependencies`). This is the step that catches a dependency declared in the wrong `package.json` section; `ocx-catalog`'s docblock cites a real prior incident (`ReadmePane.vue` importing `markdown-it`/`highlight.js` only via dynamic `import()`, invisible to a static-import grep).
7. **Fail hard on `"auto-corrected"`** in `npm pack --json`'s own output, and (network-gated) in `npm publish --dry-run`'s output too — see §5.
8. **Pin the verification to a known-good npm major** and fail loudly on drift (`EXPECTED_NPM_MAJOR = 11` in the script) — npm is free to change pack-tarball format and manifest-normalization wording across a major; a silent pass under an unverified npm major defeats the whole point of the gate.

None of steps 4–6 are things publint or attw do on their own — they check the *manifest declares things correctly*, not that *the packed artifact, once installed, actually runs*. A pack-smoke that stops at "run publint and attw" (which is what most CLI blog posts describe) is not sufficient for a `bin`-primary package; it never proves the bin executes or that a subpath actually resolves post-install.

### 5. `npm pack` vs `npm publish --dry-run`: the manifest-normalization gap

This is the single most concrete, most surprising finding, and it is not documented anywhere in npm's own docs pages — only in npm's source. `npm publish` silently rewrites ("auto-corrects") an invalid manifest and only warns:

```js
// npm/cli, lib/commands/publish.js (https://github.com/npm/cli/blob/latest/lib/commands/publish.js)
if (spec.type === 'directory') {
  const changes = []
  const pkg = await pkgJson.fix(spec.fetchSpec, { changes })
  if (changes.length && logWarnings) {
    log.warn(this.#command, 'npm auto-corrected some errors in your package.json when publishing.  ' +
      'Please run "npm pkg fix" to address these errors.')
  }
```

`lib/commands/pack.js` (https://github.com/npm/cli/blob/latest/lib/commands/pack.js) has no equivalent call — it goes through `libnpmpack`/`pacote` directly, never `pkgJson.fix()`. This is exactly why `ocx-catalog`'s own pack-smoke docblock states it "verified empirically: a `bin` path of `"./dist/cli/index.js"` only warned under `publish`, never under `pack`" — the source confirms the empirical finding precisely. **A pack-smoke that only ever runs `npm pack` cannot catch this class of bug** — this is how `@ocx-sh/catalog@0.1.0` published without its `bin` field the first time (cited in `pack-smoke.mjs`'s own docblock as the "grim 0.1.0 precedent").

The practical complication: `npm publish --dry-run` needs live registry connectivity — `ocx-catalog`'s script gates it behind `OCX_CATALOG_PACK_SMOKE_NETWORK=1` because it "hangs against an unreachable registry rather than failing fast" (empirically verified, not documented by npm). npm's own docs on [`npm-publish`](https://docs.npmjs.com/cli/v11/commands/npm-publish) describe `--dry-run` only as "report what it would have done" and don't mention the registry-hang behavior or the auto-correction pass at all — this is a real documentation gap, not a misreading. The fleet's answer: run the offline-safe `npm pack`-only smoke on every developer machine and every PR (`ci.yml`'s `pack-verify` job sets `OCX_CATALOG_PACK_SMOKE_NETWORK: "1"` because GitHub-hosted runners *do* have registry access), and treat `release.yml`'s own always-on dry-run guard as the non-optional copy of the same check at actual release time.

One expected, non-fatal exception the guard must special-case: between a release and the next version bump, `package.json` already names a version that's live on the registry, so `publish --dry-run` can only ever fail with `E403` ("cannot publish over the previously published versions") — that's expected on every non-release PR and must not fail the gate, while every other non-zero exit stays fatal.

### 6. The bin executable bit: shebang (publint) vs POSIX mode (npm self-heals)

Two independent concerns get conflated by publint's rule name (`BIN_FILE_NOT_EXECUTABLE`) but are mechanically different:

**What publint actually checks** — file *content*, not filesystem mode:

```js
// publint, core.js (https://github.com/publint/publint/blob/master/packages/publint/src/shared/core.js#L1381-L1389)
// Check that file has shebang
if (!startsWithShebang(binContent)) {
  messages.push({ code: 'BIN_FILE_NOT_EXECUTABLE', args: {}, path: currentPath, type: 'error' })
}
```

Both fleet CLIs already pass this — both `src/cli/index.ts` entries start with `#!/usr/bin/env node`, confirmed by reading both files directly.

**What the POSIX `+x` bit actually needs** — and this is *not* what publint checks — is handled by npm itself on real installs, not by the package author:

```js
// npm/bin-links, fix-bin.js (https://github.com/npm/bin-links/blob/main/lib/fix-bin.js)
const execMode = 0o777 & (~process.umask())
const fixBin = (file, mode = execMode) => stat(file)
  .then(st => (st.mode & mode) === mode ? null : chmod(file, mode))
  ...
```

`link-bin.js` calls `fixBin` every time npm creates the `node_modules/.bin/<name>` symlink — this runs as part of npm's own arborist reify step, not a lifecycle script, so it happens even under `npm install --ignore-scripts` (confirmed: `ocx-catalog`'s pack-smoke installs with `--ignore-scripts` and its bin-invocation step still succeeds). **This means the POSIX mode bit is self-healing for any real `npm install`/`npm ci`/`npm i -g` consumer**, regardless of what mode the tarball itself carries.

Fleet evidence that the two repos diverge anyway:

```
ocx-catalog/dist/cli/index.js:      -rwxr-xr-x   # explicit postbuild: chmodSync(..., 0o755)
grimoire-indexer/dist/cli/index.js: -rw-r--r--   # no chmod step in its build script
```

`grimoire-indexer`'s `build` script (`tsc -p tsconfig.json && ... && node scripts/prune-template-maps.mjs`) never chmods its compiled bin. This is **not** a broken install for a real npm-mediated consumer (bin-links fixes it), but it does mean the *tarball itself* ships the wrong mode — relevant for anyone reading the tarball directly, and for whichever future package manager or archive tool doesn't run npm's own bin-linking. Cheap, zero-risk fix: match `ocx-catalog`'s `postbuild` chmod pattern.

### 7. Shipping `.mts` source through an `exports` subpath

`ocx-catalog`'s `exports` map:

```jsonc
"exports": {
  "./theme": {
    "types": "./src/theme/index.mts",
    "import": "./src/theme/index.mts"
  },
  "./package.json": "./package.json"
}
```

**This is defensible, but only under one specific condition**: the *only* real consumer of `@ocx-sh/catalog/theme` is VitePress, which resolves imports through Vite — a bundler that transforms `.mts`/`.vue` on the fly, the same way it transforms the consuming project's own source. Node's native ESM loader cannot execute a `.mts` file without `--experimental-strip-types` (or equivalent), so `import("@ocx-sh/catalog/theme")` from a plain Node script, or from `ts-morph`/`tsc`'s module resolution in `node16`/`nodenext` mode expecting compiled output, would not work the way a normal library subpath does. That is exactly why:

- attw is *excluded* from this entrypoint (`--exclude-entrypoints ./theme`) — its TypeScript-graph resolver doesn't understand `.vue` specifiers and would report every relative import inside the theme as unresolvable, a false positive from a resolver limitation, not a real break.
- Correctness for this subpath is enforced by a **separate `tsc` pass** — `"typecheck": "tsc --noEmit && tsc -p tsconfig.theme.json"` — not by publint or attw at all.
- `pack-smoke.mjs`'s own docblock is explicit about the ceiling: `import.meta.resolve()` proves the file exists and the export entry survived packing, but "a full VitePress evaluation of the theme needs a Vue/Vite pipeline this script doesn't have."

**Verdict**: shipping raw `.mts` through `exports` is a latent break for any *general* library consumer, but not for this specific subpath, whose contract is "importable by a Vite-family bundler only," not "importable by Node." The failure mode this shape risks is a false sense of security from `exports` looking like a normal library entry when it structurally isn't one — a reviewer should not treat `./theme`'s presence in `exports` as evidence the package has library-grade type resolution, and should not extend the same pattern to a genuine `.` export without adding compiled output.

### 8. ESM-only vs dual publishing, given `require(esm)`

Read directly from Node's own docs, [`nodejs.org/api/modules.html#loading-ecmascript-modules-using-require`](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require):

| Milestone | Versions | Meaning |
|---|---|---|
| Unflagged (no `--experimental-require-module` needed) | v23.0.0, v22.12.0, v20.19.0 | `require()` of a synchronous ESM file works without any flag. |
| No experimental warning by default | v23.5.0, v22.13.0, v20.19.0 | The one-time stderr warning on first use is gone. |
| Marked **Stable** (no longer experimental) | v25.4.0 | The feature itself is no longer labeled experimental in the docs. |

Constraint that never goes away: `require()` only works on a **fully synchronous** ESM module (no top-level `await` anywhere in its graph, including transitively imported modules) — an async module throws `ERR_REQUIRE_ASYNC_MODULE`, forcing the CJS consumer to `import()` instead.

Cross-referenced against the fleet's declared floors: `ocx-catalog` (`>=20.19`) and `grimoire-indexer` (`>=22.14.0`) both sit **at or above** the "unflagged + no warning" threshold (20.19.0 hit both milestones in the same release; 22.14.0 is above 22.13.0). Neither CLI's shipped code uses top-level await in a path a CJS consumer would `require()` (grepped: neither repo's `src/cli/` uses top-level `await` outside an async `main()` function). **Conclusion: dual CJS/ESM publishing buys this fleet nothing today** — any CJS consumer on a Node version that can even run these packages (both floors are well above Node 18) can already `require()` them directly. This was a genuinely open question as recently as Node 20.18/22.11 (flag required); it is closed as of the fleet's own declared floors.

### 9. `engines.node`: checkable claim or decoration

npm's own docs, quoted exactly from [`docs.npmjs.com/cli/v11/configuring-npm/package-json#engines`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines):

> "Unless the user has set the `engine-strict` config flag, this field is advisory only and will only produce warnings when your package is installed as a dependency."

Fleet-wide grep confirms: no `.npmrc` in either repo sets `engine-strict`; neither `package.json` has an `eslint-plugin-n`-style (`n/no-unsupported-features/es-syntax`) dependency that would cross-check actual syntax/API usage against the declared floor; neither CI matrix tests the exact declared floor version (`grimoire-indexer`'s matrix runs `["22", "24"]` — latest patch of each major, never `22.14.0` itself). **`engines.node` is decoration in both repos as of today** — it communicates intent to a human reader but nothing in the pipeline verifies it's true.

It also drifted stale: Node 20 reached end-of-life **2026-03-24** ([nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases)) — five months before this research. `ocx-catalog`'s `"engines": { "node": ">=20.19" }` claims support for a dead runtime line, and publint's `USE_ENGINES_NODE` (a suggestion-severity rule) only fires when the field is **absent**; it has no opinion on whether the declared floor is current. Making `engines.node` a genuinely checkable claim needs one of: (a) an actual CI matrix leg pinned to the literal declared floor version (not "latest of that major"), or (b) a periodic manual/scripted check against Node's release schedule (the fleet has no automated version here today).

### 10. `npm-shrinkwrap.json` for a CLI that is also importable

npm's own guidance, quoted from [`docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json`](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json):

> "The recommended use-case for `npm-shrinkwrap.json` is applications deployed through the publishing process on the registry: for example, daemons and command-line tools intended as global installs or `devDependencies`."
>
> "It's strongly discouraged for library authors to publish this file, since that would prevent end users from having control over transitive dependency updates."

Applied per-repo:

- **`ocx-catalog`**: no `"."` export, `bin` is the entire public surface → fits npm's recommended case cleanly. A `npm-shrinkwrap.json` here pins exactly what the CLI's own runtime resolves at global-install time, with no library consumer whose transitive-dep control it could take away.
- **`grimoire-indexer`**: has a live (if currently stubbed) `"."` export declared in `exports` → does **not** fit the recommended case as cleanly. Shrinkwrapping today would cost nothing (the export is `export {};`), but the day `src/index.ts` grows a real API, a shrinkwrap left in place would start fighting every downstream library consumer's own dependency resolution. **Verdict**: not wrong today, but a decision that needs revisiting the moment the stub entry point is filled in — flag it as a one-line note in whichever file tracks that entry point's TODO, not as a rule to adopt now.

Neither repo currently ships `npm-shrinkwrap.json` (confirmed: only `package-lock.json` in both).

### 11. The compliance gap: ocx-catalog vs grimoire-indexer

Both ship the identical `bin` + `exports` shape family. Concretely, as read from each repo's `package.json`, `taskfile.yml`, and `.github/workflows/`:

| | `ocx-catalog` | `grimoire-indexer` |
|---|---|---|
| `publint` in `devDependencies` | `^0.3.14` | **absent** |
| `@arethetypeswrong/cli` in `devDependencies` | `^0.18.2` | **absent** |
| Dedicated pack-smoke script | `scripts/pack-smoke.mjs` (8-step contract, §4) | **none** |
| `task` target for it | `pack-smoke` (in `verify`) | **none** — `check` = lint, typecheck, test, smoke only |
| Runs on every PR | Yes — `ci.yml`'s `pack-verify` job, network-enabled | **No** |
| Runs at release/tag time | Yes — `release.yml`'s `gate` job re-runs `task pack-smoke` | Only the bare `"auto-corrected"` grep on `npm publish --dry-run`, in `release.yml` |
| Bin-execution proof (installed, not source) | Yes (§4 step 4) | **No** |
| Subpath resolution proof | Yes (§4 step 5) | N/A (no subpath exports beyond `.`/`./integration`, untested either way) |
| Dependency-completeness proof | Yes (§4 step 6) | **No** |

**`grimoire-indexer` is out of compliance** in one specific, fixable way: it has *zero* publint/attw/pack-verification coverage anywhere in its pipeline, on PRs or at release. Its only defense against a shipped-broken package is the same `"auto-corrected"` string-grep `ocx-catalog` also runs — but `grimoire-indexer` runs it once, at tag-push time, against a version that's about to actually publish, with no earlier PR-time gate and no check of `bin`-execution, subpath resolution, or dependency completeness at all. This is precisely the class of gap the `ocx-catalog@0.1.0` incident (cited in `pack-smoke.mjs`'s own docblock) came from, and `grimoire-indexer` is currently one bad `files`/`bin` edit away from repeating it with no PR-time signal.

## Normative guidance candidates

1. **Every `bin`-primary package's CI must run a pack-smoke that installs the tarball into a sandbox and executes the installed bin — not just `publint`/`attw` against the source tree.** Rationale: publint/attw validate manifest declarations; only a real install-and-run proves the packed artifact works. Verify: the repo's `task`/`npm` script list contains a step that does `npm install --ignore-scripts <tarball>` followed by executing `node_modules/.bin/<name>`, in a directory outside the repo (a `mkdtemp` sandbox).
2. **Run this pack-smoke on every PR, not only at release/tag time.** Rationale: a release-only gate finds the bug after it's already merged to `main`; a PR-time gate finds it before merge. Verify: `grep -l "pack.*smoke\|publint\|attw" .github/workflows/*.yml` returns the CI workflow (not just the release workflow) for every `bin`-shaped package.
3. **Never rely on `npm pack`'s output alone to catch manifest auto-correction — also run `npm publish --dry-run` and scan for `"auto-corrected"`.** Rationale: only `publish` calls `pkgJson.fix()` (§5); `pack` never does, so a `pack`-only check structurally cannot catch this bug class. Verify: grep the pack-verification script for two separate command invocations (`npm pack` and `npm publish --dry-run`), not one.
4. **Gate the `publish --dry-run` step behind network availability, and special-case exactly the `E403`/"cannot publish over the previously published versions" text as non-fatal — every other non-zero exit stays fatal.** Rationale: a version already on the registry (the normal state between releases) makes this dry-run fail for a reason unrelated to the artifact; failing to special-case it makes the check useless noise every PR. Verify: read the guard's error-handling branch; it must match the specific npm rejection string, never a bare non-zero exit code.
5. **For a package whose `exports` has no `"."` entry by design, suppress publint's `EXPORTS_MISSING_ROOT_ENTRYPOINT` per-package rather than adding a fake root export to silence it.** Rationale: adding a root export that exists only to satisfy a linter creates a real, unintended public API surface. Verify: check the publint invocation's ignore-list or config for an explicit, commented suppression of this one warning, tied to a comment explaining the CLI-only shape.
6. **When attw reports `cjs-resolves-to-esm` on a pure-ESM package with no CJS entrypoint, ignore that one rule explicitly — never ignore attw wholesale to silence it.** Rationale: this is the expected shape of an ESM-only package (§3, §8); a wholesale `--ignore-rules` list or dropping attw entirely would also hide `NoResolution`/`InternalResolutionError`, which are real bugs. Verify: the attw invocation's `--ignore-rules` list contains exactly `cjs-resolves-to-esm` (or its equivalent), never a broader disable.
7. **A subpath export that ships raw `.ts`/`.mts`/`.vue` source (not compiled output) must be excluded from attw's resolution graph and covered by its own dedicated `tsc --noEmit` pass instead.** Rationale: attw's resolver doesn't understand bundler-only specifiers and will false-positive; the real correctness check for a bundler-only subpath is a type-check under the bundler's own module-resolution mode, not a Node-oriented type-resolution tool. Verify: the subpath appears in `--exclude-entrypoints`, and a separate `tsconfig.*.json`/`tsc -p` invocation exists that covers exactly that subpath's source tree.
8. **`engines.node` must be backed by something that actually checks it — a CI matrix leg pinned to the literal declared floor, or a scheduled check against Node's own EOL schedule — not left as an unverified suggestion-level publint pass.** Rationale: publint's `USE_ENGINES_NODE` only checks the field's presence; npm itself only warns without `engine-strict`; nothing else in a typical pipeline verifies the number is still true. Verify: either the CI matrix includes the exact version string from `engines.node` (not just "latest of that major"), or a dated comment/schedule exists recording when the floor was last checked against Node's EOL table.
9. **Never declare an `engines.node` floor on a Node release line that has reached end-of-life.** Rationale: an EOL floor is a claim of support the maintainers are no longer actually testing against (security patches have stopped). Verify: compare the floor's major.minor against [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases)'s current status column; flag any floor whose line shows EOL.
10. **A CLI-only package (no `"."` export, or one that will realistically stay a stub) is a legitimate candidate for `npm-shrinkwrap.json`; a package with any live library export is not.** Rationale: npm's own docs recommend shrinkwrap for exactly the CLI case and discourage it for libraries, because a published shrinkwrap removes downstream dependency control (§10). Verify: check whether `exports["."]` resolves to real code (not `export {};`) before shrinkwrapping; re-check this decision whenever that entry point changes.
11. **Do not add a CJS build/dual-publish path solely to support `require()` consumers, once the package's declared `engines.node` floor is at or above Node v20.19.0/v22.12.0.** Rationale: `require(esm)` is unflagged and warning-free at those exact versions (§8); a dual build adds real build/test surface for a compatibility problem that no longer exists at the package's own declared floor. Verify: compare `engines.node` against the version table in §8; if the floor clears both thresholds and no top-level `await` sits on a path a CJS consumer would `require()`, a dual build is unjustified complexity.
12. **The bin file's own build step must explicitly `chmod` the compiled entry to an executable mode (`0o755` or via the platform umask), even though npm's own installer self-heals this on real installs.** Rationale: the tarball itself should carry correct metadata independent of whether every consumer installs through npm's bin-links path (§6); it's a one-line, zero-risk step. Verify: `ls -la dist/cli/<entry>.js` after a clean build shows the executable bit set, or the build script contains an explicit `chmodSync`/`chmod +x` step.
13. **Every `bin` entry file must start with `#!/usr/bin/env node`, checked in CI via publint, not by manual review.** Rationale: this is the one thing npm's own bin-linking does *not* fix — it chmods the mode bit but never inserts a missing shebang, and a bin file the OS can't shebang-exec fails at the shell level regardless of the mode bit. Verify: `publint`'s `BIN_FILE_NOT_EXECUTABLE` code is enabled (default) and the pack-verification job's exit code gates the PR.
14. **A pack-smoke's dependency-completeness check must include dynamic `import()`/`require()` calls, not just static `import ... from` statements.** Rationale: a dependency reachable only through a dynamic import (e.g. lazy-loaded UI code) is invisible to a static-import grep and can be declared in the wrong `package.json` section (`devDependencies` instead of `dependencies`) without any test catching it until a real consumer's install breaks. Verify: the pack-smoke script's specifier-extraction logic explicitly handles both `import()` and `require()` call forms, not only `import ... from "..."`.

## AI-agent angle

- **Reflexively proposing a dual CJS/ESM build.** An LLM trained on pre-2024 patterns (`tsup --format cjs,esm`, `exports.require`/`exports.import` pairs) will default to dual publishing as "best practice" without checking the package's actual `engines.node` floor against the `require(esm)` thresholds in §8. Smallest check: compare the proposed `engines.node` value against Node v20.19.0/v22.12.0 before accepting a dual-build suggestion; if the floor already clears it, the dual build is unnecessary complexity, not safety.
- **Getting `exports` condition order wrong.** A model will often alphabetize keys (`"default"` before `"import"`, or `"import"` before `"types"`) because that reads as "tidier" JSON, when Node's own resolver treats key order as match priority, not decoration (§2). Smallest check: run `publint` — `EXPORTS_TYPES_SHOULD_BE_FIRST`/`EXPORTS_DEFAULT_SHOULD_BE_LAST` catch this immediately and are cheap to run on every generated `package.json`.
- **Assuming `npm publish --dry-run` and `npm pack` validate the same things.** Because both are described colloquially as "a dry run of publishing," a model will often suggest only one, usually `npm pack` (it's faster and doesn't need registry access), missing that only `publish` triggers the `pkgJson.fix()` auto-correction path (§5). Smallest check: grep the generated CI/verification script for both command names; a script with only one is under-verified regardless of which one is missing.
- **Overstating `engines.node` enforcement.** A model will frequently describe `engines.node` as something npm "enforces" or "requires," when by default it's advisory-only and only becomes a hard install failure under `engine-strict` (§9), a flag almost nobody sets. Smallest check: grep for `engine-strict` in any `.npmrc` the model points to as "why this is enforced" — if it's absent, the enforcement claim is false and the field is decorative until either a CI matrix or a lint checks it.
- **Assuming npm won't fix the bin's executable bit, and hand-writing an install-time or `postinstall` chmod step for consumers.** A model unaware of npm's own `bin-links` behavior (§6) will sometimes propose shipping a `postinstall` script that chmods the bin for the *installer* — which is both redundant (npm already does this via `fix-bin.js`) and actively harmful (a `postinstall` script is exactly the kind of thing a security-conscious consumer runs `--ignore-scripts` to avoid, and `bin-links`' chmod happens independent of scripts anyway). Smallest check: any `postinstall` whose only job is chmod-ing the package's own `bin` file should be deleted, not fixed — the correct fix is a `postbuild` chmod in the *publisher's own* build, so the tarball ships the right mode already.
- **Treating a subpath export that ships raw TypeScript/framework source (like `ocx-catalog`'s `./theme`) as validated once attw passes.** A model unaware that attw's resolver can't evaluate `.vue`/bundler-only specifiers will either (a) not realize the entrypoint needs excluding at all and let noisy false-positive attw failures block a PR, or (b) exclude it and stop there, missing that a *separate* type-check pass is still required for real correctness (§7). Smallest check: for any excluded attw entrypoint, confirm a dedicated `tsc -p <tsconfig>` (or equivalent) invocation exists that actually covers that subpath's source files — an excluded entrypoint with no replacement check is untested, not merely unverified-by-attw.
- **Hallucinating attw flag names.** Because attw's flags read similarly to other CLI tools' (`--ignore`, `--exclude`, `--skip-entrypoints`), a model will sometimes invent plausible-but-wrong flag names. Smallest check: `attw --help` (or the README table in §3) — the real flags are `--ignore-rules`, `--exclude-entrypoints`/`--include-entrypoints`, `--entrypoints`, `--entrypoints-legacy`, `--profile`, and `--pack`; anything else is fabricated.

## Contested / evolving

- **attw's problem-code count is a moving target.** This research's own brief cited "11 problem codes"; the live source on `main` lists 12 ([`problems.ts`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/core/src/problems.ts), read 2026-08-29). Whether the brief's "11" reflects an older attw version (attw is at `0.18.5`, published 2026-07-09 per the npm registry) or a miscount could not be established from within this research — treat any hard-coded problem-code count as stale the moment it's written down, and re-derive it from `problemKindInfo`'s keys rather than a cached list.
- **`require(esm)`'s stability marking is very recent and still settling.** It only reached the "no longer experimental" label at Node v25.4.0; as recently as v22.12.0/v20.19.0 (the fleet's own declared floors) it was unflagged and warning-free but still formally "experimental" in the docs. Trend: clearly heading toward "just use `require()` on ESM, dual publishing is legacy" — but a package supporting a floor below v20.19/v22.12 still needs the old calculus, so this guidance has a hard version cliff, not a gradual one.
- **Whether `BIN_FILE_NOT_EXECUTABLE`'s shebang-only check is sufficient given npm's own POSIX-mode self-healing is not addressed anywhere in publint's own documentation.** This research reasoned through the interaction from primary source (§6) but found no publint or npm doc that discusses the two mechanisms together — worth treating as an open question if a future publint release changes what the rule actually inspects (a mode-bit check inside a tarball is technically possible and would be a meaningfully different, stronger rule than the current content-only check).
- **Node's own "dual package hazard" writeup is referenced but not fully inlined by the current docs page.** [`nodejs.org/api/packages.html#dual-commonjses-module-packages`](https://nodejs.org/api/packages.html#dual-commonjses-module-packages) points to an external `nodejs/package-examples` repository for worked examples rather than stating the hazard's mechanics in full on the page itself — this research did not chase that repository down; anyone needing the exact hazard mechanics (duplicate module instances across the CJS/ESM boundary) should read it directly rather than relying on secondhand paraphrase.
- **Whether ESM-only is now the fleet-wide right default, or only right for these two CLIs specifically**, could not be settled from this research alone — it depends on every other package's own `engines.node` floor and whether any of them have a real CJS-consuming audience today, which is out of this document's scope (shape 1 only).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [publint.dev/rules](https://publint.dev/rules) | publint's own rules reference page | current, publint 0.3.x era | Authoritative per-rule severity and description, cross-checked against source. |
| [github.com/publint/publint — `message.js`](https://github.com/publint/publint/blob/master/packages/publint/src/shared/message.js) | publint source, message-formatting switch | `master` branch, read 2026-08-29 | Ground truth for every rule code that actually exists (43, matching the docs page). |
| [github.com/publint/publint — `core.js`](https://github.com/publint/publint/blob/master/packages/publint/src/shared/core.js) | publint source, detection logic | `master` branch, read 2026-08-29 | Confirms `BIN_FILE_NOT_EXECUTABLE` is a shebang-content check, not a mode-bit check (§6). |
| [github.com/arethetypeswrong/arethetypeswrong.github.io — `problems.ts`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/core/src/problems.ts) | attw source, the canonical problem-kind list | `main` branch, read 2026-08-29 | Ground truth for attw's 12 problem kinds — resolves the brief's "11" discrepancy. |
| [github.com/arethetypeswrong/arethetypeswrong.github.io — CLI README](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md) | attw CLI usage docs | `main` branch, read 2026-08-29 | Exact `--pack`, `--ignore-rules`, `--exclude-entrypoints`, `--profile` syntax. |
| [nodejs.org/api/modules.html — require(esm)](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) | Node.js official API docs | current as of Node's latest published docs, read 2026-08-29 | The exact version thresholds for unflagging, no-warning, and Stable status (§8). |
| [nodejs.org/en/blog/release/v22.12.0](https://nodejs.org/en/blog/release/v22.12.0) | Official Node.js release blog post | 2024-era release, read 2026-08-29 | Primary confirmation of the v22.12.0 unflag, with the exact PR reference. |
| [nodejs.org/api/packages.html — conditional exports](https://nodejs.org/api/packages.html#conditional-exports) | Node.js official API docs | current, read 2026-08-29 | Node's own (not publint's) authority for `types`-first/`default`-last ordering. |
| [nodejs.org/api/packages.html — dual package hazard](https://nodejs.org/api/packages.html#dual-commonjses-module-packages) | Node.js official API docs | current, read 2026-08-29 | Node's own framing of the dual-publish tradeoff (partial — see Contested). |
| [docs.npmjs.com — package.json engines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines) | npm CLI v11 official docs | current, read 2026-08-29 | Exact wording that `engines.node` is advisory-only without `engine-strict` (§9). |
| [docs.npmjs.com — npm-shrinkwrap.json](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json) | npm CLI v11 official docs | current, read 2026-08-29 | Direct recommendation of shrinkwrap for CLIs, discouragement for libraries (§10). |
| [docs.npmjs.com — npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish) | npm CLI v11 official docs | current, read 2026-08-29 | `--dry-run` framing (though it omits the auto-correction/registry-hang behavior — a doc gap noted in §5). |
| [docs.npmjs.com — npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack) | npm CLI v11 official docs | current, read 2026-08-29 | Confirms `pack`'s scope (tarball creation) with no mention of manifest normalization. |
| [docs.npmjs.com — generating provenance statements](https://docs.npmjs.com/generating-provenance-statements) | npm official docs | current, read 2026-08-29 | Minimum npm `9.5.0+` for provenance; supported CI providers for trusted publishing. |
| [github.com/npm/cli — `lib/commands/publish.js`](https://github.com/npm/cli/blob/latest/lib/commands/publish.js) | npm CLI source | `latest` branch, read 2026-08-29 | The exact line that proves `publish` (not `pack`) runs `pkgJson.fix()` (§5). |
| [github.com/npm/cli — `lib/commands/pack.js`](https://github.com/npm/cli/blob/latest/lib/commands/pack.js) | npm CLI source | `latest` branch, read 2026-08-29 | Confirms the absence of any `pkgJson.fix()`/normalization call in `pack`. |
| [github.com/npm/bin-links — `fix-bin.js`, `link-bin.js`](https://github.com/npm/bin-links/blob/main/lib/fix-bin.js) | npm's bin-linking source | `main` branch, read 2026-08-29 | Proves npm self-heals the POSIX executable bit on every real install (§6). |
| [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) | Official Node.js release-line status table | current, read 2026-08-29 | Node 20 EOL date (2026-03-24) and current LTS lines (22, 24) (§9). |
