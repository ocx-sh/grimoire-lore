---
title: typescript-packaging delta refresh, 2026-08-29 to 2026-11-27
pair: typescript-packaging
date: 2026-11-27
window_start: 2026-08-29
model: opus
consolidates:
  - .agents/research/refresh-2026-11/typescript-packaging/typescript-compiler-releases.md
  - .agents/research/refresh-2026-11/typescript-packaging/node-runtime-schedule-and-loaders.md
  - .agents/research/refresh-2026-11/typescript-packaging/npm-cli-pack-publish-path.md
  - .agents/research/refresh-2026-11/typescript-packaging/publint-attw-codes.md
  - .agents/research/refresh-2026-11/typescript-packaging/lockfiles-and-package-manager-pin.md
  - .agents/research/refresh-2026-11/typescript-packaging/lint-config-pointer-facts.md
  - .agents/research/refresh-2026-11/typescript-packaging/recent-shifts-packaging.md
revises:
  - .agents/research/ts-modules.md
  - .agents/research/ts-modules/publish-verification.md
  - .agents/research/ts-modules/resolution-per-shape.md
  - .agents/research/typescript-topic-map.md
  - .agents/research/typescript-topic-map/ci-supply-chain-tooling.md
  - .agents/research/typescript-tooling-landscape.md
---

# typescript-packaging delta refresh

Contents: [Verdict](#verdict) · [Changed rules](#changed-rules) ·
[New rules](#new-rules) · [Confirmed unchanged](#confirmed-unchanged) ·
[Open questions](#open-questions) · [Revision log](#revision-log) ·
[Edit list](#edit-list) · [Spillover round](#spillover-round)

## Verdict

- Edit `rules/typescript-packaging.md` in place. Rule bump: minor, because one new rule (TS-PKG-16) is added. No reference skill exists and none is created; skill bump: none.
- Correct three rule rows in place, keeping their IDs and meaning: TS-PKG-10 (the Node 20 end-of-life date), TS-PKG-11 (the warning-free thresholds), and TS-PKG-13 (the lockfile list and the package-manager pin check).
- Correct four non-ID lines: the type-stripped runtime row of the shape table no longer names the obsolete `--experimental-strip-types` flag; the compiler stamp moves to 2026-11-27 and records that 7.1 is beta only; the unknown-key sentence records that `--showConfig` does not validate; the two removed-option rows of the Version-Gated Flags table give the per-major error codes.
- Add TS-PKG-16: publish from CI through npm trusted publishing (OIDC) with no long-lived token, never from an `issue_comment` or `pull_request_target` trigger, and expect stage-only publishing for new trusted publishers. Every fact it rests on changed inside the window (2026-09-03, 2026-09-18, 2026-10-02) and was read from npm's own docs and GitHub's changelog. This is the "dated, thin TS-PKG section" the baseline topic map named as the promotion path for supply chain.
- Do not add the install-script allowlist or release-cooldown candidates. Both mechanisms landed before the window (npm 12 on 2026-07-08, Dependabot on 2026-07-14), nothing about them changed inside it, and the baseline's decision to wait stands.
- Do not add the tsconfig `contentMappers` candidate. TypeScript 7.1 is beta (2026-10-20) with no GA.
- Do not extend TS-PKG-03 with the `Cannot implicitly apply the "latest" tag` rejection. It is real in npm 12.2.3 source, but it is not a window change, it was not reproduced, and it only hits a maintenance-branch PR. It goes to open questions.
- Leave the "Editing a Lint Config" pointers unchanged. The Biome sentence could not be confirmed or refuted; it is owned by `TS-MOD-12` in the sibling, so it is spillover plus an open question.
- Budget after the edits: the file grows from 184 to about 199 lines, of which about 181 are body. Under 200; the existing table of contents stays.

## Changed rules

### TS-PKG-10

- Old text (rationale, last sentence): "Node 20 reached EOL on 2026-03-24."
- New text: "Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24."
- Rule sentence, verification and severity (MUST) are unchanged. The conclusion (Node 20 is EOL) held at baseline and holds now; only the date meant the wrong event.
- Source: https://raw.githubusercontent.com/nodejs/Release/main/schedule.json (`v20.end` is 2026-04-30); https://nodejs.org/en/about/previous-releases (v20 status EOL, "Last updated" 2026-03-24).

### TS-PKG-11

- Old text (rationale, first sentence): "`require(esm)` is unflagged and warning-free from exactly those versions."
- New text: "`require(esm)` is unflagged from exactly those versions, and warning-free from 20.19.0 / 22.13.0."
- Rule sentence, thresholds 20.19.0 / 22.12.0, verification and severity (SHOULD) are unchanged. On 22.12.x the experimental warning is still emitted; the threshold for the rule is "no flag needed", which is 22.12.0.
- Source: https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require (History: no flag from v23.0.0, v22.12.0, v20.19.0; no experimental warning from v23.5.0, v22.13.0, v20.19.0).

### TS-PKG-13

- Old text (verification): "`git ls-files --cached --others --exclude-standard -- package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb` — more than one line is the violation. Then `jq -r '.packageManager // empty' package.json` must name the manager that produces the surviving one."
- New text (verification): "see block TS-PKG-13. The first command printing more than one line is the violation, and so is any `npm-shrinkwrap.json` line: npm 12 neither reads nor writes that file, so rename it to `package-lock.json`. The second command reads both pin fields and must print only the manager that produces the surviving lockfile; empty output means no pin, and two different managers is the violation."
- New block TS-PKG-13 holds the two commands (the `jq` expression contains a pipe, which cannot sit in a table cell).
- Rule sentence, rationale and severity (SHOULD) are unchanged.
- Measured: the new `jq` expression prints `pnpm@12.0.0` for a `packageManager`-only manifest, `pnpm` for a `devEngines.packageManager`-only object, both names for the array form, both `yarn@4.18.0` and `pnpm` for a manifest that disagrees with itself, and nothing for `{}`. The old expression printed nothing for the `devEngines`-only case, a false "no pin". The extended `git ls-files` list printed `npm-shrinkwrap.json` beside `package-lock.json` in a fixture, which the old list missed.
- Sources: https://github.com/nodejs/corepack#readme and https://github.com/nodejs/corepack/releases (v0.36.0, 2026-08-28: `devEngines.packageManager` is the fallback when `packageManager` is missing; Corepack not bundled from Node 25.0.0); https://pnpm.io/package_json and https://github.com/pnpm/pnpm/releases/tag/v12.0.0 (pnpm 12 writes the pin into either field, keeping only one); https://docs.npmjs.com/cli/v11/configuring-npm/package-json#devengines (array or object form); npm 12.2.3 shipped docs `docs/content/configuring-npm/package-lock-json.md` ("As of npm v12, `npm-shrinkwrap.json` is no longer read or written by npm").

### Non-ID lines (same file)

- Shape table, type-stripped runtime row. Old: "Bun, or `node --experimental-strip-types`". New: "Bun, or Node running `.ts` directly (type stripping is on by default, with no flag, from 22.18.0; Node 26 removed `--experimental-transform-types`)". Source: https://nodejs.org/api/typescript.html (History: enabled by default v23.6.0 / v22.18.0; Stable v25.2.0 / v24.12.0; transform flag removed v26.0.0); https://nodejs.org/en/blog/release/v26.0.0.
- Version-Gated Flags stamp. Old: "Compiler versions as of 2026-08-29: TS 7.0 is the current stable release, 6.0 is a common working floor". New: "Compiler versions as of 2026-11-27: TS 7.0.2 is the current stable release (7.1 is in beta since 2026-10-20; assume none of its keys), 6.0.3 is a common working floor". Source: `npm view typescript dist-tags time` (latest 7.0.2, beta 7.1.0-beta on 2026-10-20); https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/.
- Unknown-key sentence. Appended: "Only a real `tsc -p <tsconfig> --noEmit` run reports it; `--showConfig` prints unknown keys and removed values without an error." Source: typescript 7.0.2 and 7.1.0-beta run against throwaway configs (`TS5023` on `tsc -p`, none under `--showConfig`; `moduleResolution: node10` printed as `"node"` with exit 0 under `--showConfig`).
- `importsNotUsedAsValues` row. Old: "Hard `TS5102` and exit 2". New: "Hard error, `TS5102` on 6.x and `TS5023` (unknown option) on 7.x". Source: typescript 6.0.3, 7.0.2 and 7.1.0-beta runs.
- `moduleResolution: node` row. Old: "`TS5107` then `TS5108`, with no `ignoreDeprecations` escape. Legal values are `node16`, `nodenext`, `bundler`". New: "`TS5107` on 6.x, which `"ignoreDeprecations": "6.0"` silences; `TS5108` on 7.x, with no escape. Legal values are `node16` (only with `module: node16`), `nodenext`, `bundler`". Source: typescript 6.0.3 run (the 6.0 message itself names the escape, and it works); 7.0.2 and 7.1.0-beta runs (`TS5108` with the escape set; `TS5110` for `node16` without `module: node16`).
- Ownership sentence. "publish verification)" becomes "publish verification, publish credentials)", so the scope line names what TS-PKG-16 adds.

## New rules

### TS-PKG-16

- Rule: Publish from CI through npm trusted publishing (OIDC): the publish job has `id-token: write`, no long-lived publish token comes from a secret, and only `push`, `release` or `workflow_dispatch` triggers it. A trusted publisher created after 2026-09-03 is stage-only by default, so the job runs `npm stage publish` and a maintainer approves the version with 2FA.
- Rationale: npm rejects OIDC tokens from `issue_comment` and `pull_request_target` runs (the `issue_comment` rejection since 2026-10-02), so such a trigger fails on release day, not in review. A secret-held publish token outlives the job and works wherever it leaks; an OIDC token is minted per run. The shape agents write from older training, `npm publish` with `NPM_TOKEN`, is what a stage-only publisher rejects (stage-only tokens since 2026-09-18), and npm is targeting removal of direct publishing with 2FA-bypass tokens, a target rather than a date as of 2026-11-27. Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27). The fleet's shape 1 publishes `bin` packages to npm from CI, so the rule binds.
- Verification: block TS-PKG-16 lists the publish line and the credential lines of every workflow that publishes for real (dry-runs excluded). Each listed workflow must show an `id-token: write` line; any `issue_comment`, `pull_request_target` or `NPM_TOKEN` line is the violation, and so is a `NODE_AUTH_TOKEN` line unless it feeds only a read-only install. Empty output means no workflow publishes. Watched red on a fixture with `on: [push, issue_comment]` and `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (both lines printed), green on the same file reduced to `on: push`, `id-token: write` and `npm stage publish` (only those two lines printed), and empty with no publish workflow.
- Severity: SHOULD. The removal date is a target and staged approval is a release-process choice; an adopter who keeps direct OIDC publish states why in the commit body.
- Sources: https://docs.npmjs.com/trusted-publishers (stage-only default for configurations after 2026-09-03; OIDC cannot approve or install; provenance automatic on GitHub Actions); https://docs.npmjs.com/staged-publishing (CLI 11.15.0, Node 22.14.0); https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation; https://github.blog/changelog/2026-10-02-unvalidated-npm-trusted-publishing-configurations-now-expire.

## Confirmed unchanged

- `strict` still covers exactly the nine listed flags; no 7.1 change to it.
- `verbatimModuleSyntax` 5.0, `isolatedDeclarations` 5.5, `noUncheckedSideEffectImports` 5.6, `strictBuiltinIteratorReturn` 5.6, `erasableSyntaxOnly` 5.8: no window release touched them.
- `tsc --showConfig -p` still exists on 7.0.2 and 7.1.0-beta and still prints implied `module`/`moduleResolution` values. No new 7.x deprecation or removal is scheduled.
- `engines.node` is still advisory without `engine-strict`. The previous-releases URL is still canonical.
- `ERR_REQUIRE_ASYNC_MODULE` still rejects top-level await under `require()`; 26.5.0 / 24.20.0 only added diagnostic properties.
- TS-PKG-03: only `publish` normalizes (npm 12.2.3 `publish.js` calls `pkgJson.fix`, `pack.js` does not); the `auto-corrected` warning and the "cannot publish over the previously published versions" text are verbatim unchanged.
- TS-PKG-01: `npm install --ignore-scripts <tarball>` still works and still overrides npm 12's allowlist; a local tarball needs no allow flag (`allow-file` defaults to `all`).
- TS-PKG-05: npm (`bin-links@7.0.1`) still fixes the mode and never writes a shebang; publint 0.3.25 checks the shebang only, never the mode bit, so the `ls -l` half stays.
- TS-PKG-15: `npm pack --dry-run` still prints the tarball listing; the default publish set is unchanged.
- publint codes `EXPORTS_TYPES_SHOULD_BE_FIRST`, `EXPORTS_DEFAULT_SHOULD_BE_LAST`, `BIN_FILE_NOT_EXECUTABLE`, `EXPORTS_MISSING_ROOT_ENTRYPOINT`, `USE_FILES`, `USE_ENGINES_NODE` (presence-only) and `publint run <tarball>` are unchanged. attw is still 0.18.5 with `--ignore-rules`, `cjs-resolves-to-esm`, `NoResolution` and `InternalResolutionError` unchanged; it bundles TypeScript 5.6.1-rc, so it runs in a TS 7 repo.
- Frontmatter globs: `pnpm-lock.yaml` (the experimental v13 format keeps the name), `yarn.lock`, `bun.lock`, `bun.lockb` (still read by Bun 1.4.x), `pnpm-workspace.yaml` and `npm-shrinkwrap.json` all stay. The shrinkwrap glob stays because a committed shrinkwrap is now a silent stale lock a reviewer must see.
- Lint pointers: typescript-eslint stayed on v8 (8.74.0); `projectService` is still required for type-aware rules and the grep still holds, including for the opt-in `projectService.EXPERIMENTAL_backend: 'tsgo'`. Neither `consistent-type-imports` nor `no-import-type-side-effects` is in a preset. Biome's key is still `linter.domains.project`.

## Open questions

- Biome project domain: does naming one project-domain rule without `linter.domains.project` run it? The 2.6.2 changelog suggests it does, which would make "a rule name alone is a no-op" too strong. Settle with a two-file fixture under Biome 2.6.9; the sentence is owned by `TS-MOD-12` in `typescript-quality`.
- TS-PKG-03: should the dry-run filter also treat `Cannot implicitly apply the "latest" tag ...` as non-fatal, or pass `--tag`? Present in npm 12.2.3 source; not reproduced; whether it predates the window is unknown.
- TS-PKG-08: publint emits `EXPORTS_MISSING_ROOT_ENTRYPOINT` only when `main` or `module` exists, so a bin-only package with neither needs no suppression. Should the verification become conditional on those fields? Not a window change.
- TS-PKG-16: the exact day npm removes bypass-2FA direct publish (target January 2027 as of 2026-09-18), and whether provenance attaches to a staged publish (undocumented as of 2026-11-27).
- Install-script allowlists and release cooldowns stay deferred; re-check whether the fleet's install defaults should become a dated TS-PKG rule at the next refresh.
- `contentMappers` and `--runExternalCode`: revisit when TypeScript 7.1 reaches GA.
- Not verified: npm 11.21.x `auto-corrected` text (only 12.2.3 was run); pnpm 11.x releases between 2026-08-29 and 2026-11-13 (page truncated); Node 22.x/24.x release posts from September and October.
- The "`tsc --init` default since TS 5.0" wording could not be confirmed from the TSConfig page; left as written.

## Revision log

- Shape table: type-stripped runtime row names the default-on Node behaviour instead of `--experimental-strip-types`.
- Version-Gated Flags: stamp moved to 2026-11-27, 7.1 recorded as beta.
- Version-Gated Flags: `--showConfig` does not validate unknown keys or removed values.
- Version-Gated Flags: `importsNotUsedAsValues` row gives `TS5102` (6.x) and `TS5023` (7.x).
- Version-Gated Flags: `moduleResolution: node` row records the 6.x `ignoreDeprecations` escape and the `node16` pairing.
- TS-PKG-10: Node 20 end-of-life date corrected to 2026-04-30.
- TS-PKG-11: warning-free thresholds split from the unflagged thresholds.
- TS-PKG-13: lockfile list gains `npm-shrinkwrap.json`; pin check reads `devEngines.packageManager` too; commands moved to block TS-PKG-13.
- TS-PKG-16: new rule, trusted publishing and stage-only publish.
- Ownership sentence names publish credentials.
- Spillover round, TS-PKG-10: rationale records that Node 25 is end of life and Node 26 entered LTS on 2026-10-28.
- Spillover round, TS-PKG-16: rationale records the 2026-05-11 TanStack compromise as the reason staged approval is a human step.

## Edit list

All entries apply to `rules/typescript-packaging.md`. Apply them in order.

1. Find:

   ```
   engines, exports, bin, scripts, dependency placement, publish verification).
   ```

   Replace with:

   ```
   engines, exports, bin, scripts, dependency placement, publish verification, publish credentials).
   ```

2. Find:

   ```
   | **Type-stripped runtime** — Bun, or `node --experimental-strip-types` | the runtime's stripper |
   ```

   Replace with:

   ```
   | **Type-stripped runtime** — Bun, or Node running `.ts` directly (type stripping is on by default, with no flag, from 22.18.0; Node 26 removed `--experimental-transform-types`) | the runtime's stripper |
   ```

3. Find:

   ```
   Compiler versions as of 2026-08-29: TS 7.0 is the current stable release,
   6.0 is a common working floor, and two-majors-behind repos are normal.
   ```

   Replace with:

   ```
   Compiler versions as of 2026-11-27: TS 7.0.2 is the current stable release
   (7.1 is in beta since 2026-10-20; assume none of its keys), 6.0.3 is a common
   working floor, and two-majors-behind repos are normal.
   ```

4. Find:

   ```
   so an over-new flag fails loudly, which is the good case.
   ```

   Replace with:

   ```
   so an over-new flag fails loudly, which is the good case. Only a real
   `tsc -p <tsconfig> --noEmit` run reports it; `--showConfig` prints unknown keys and removed values without an error.
   ```

5. Find:

   ```
   | removed in 6.0 | Hard `TS5102` and exit 2 — never write either; `verbatimModuleSyntax` replaced both |
   ```

   Replace with:

   ```
   | removed in 6.0 | Hard error, `TS5102` on 6.x and `TS5023` (unknown option) on 7.x — never write either; `verbatimModuleSyntax` replaced both |
   ```

6. Find:

   ```
   | `TS5107` then `TS5108`, with no `ignoreDeprecations` escape. Legal values are `node16`, `nodenext`, `bundler` |
   ```

   Replace with:

   ```
   | `TS5107` on 6.x, which `"ignoreDeprecations": "6.0"` silences; `TS5108` on 7.x, with no escape. Legal values are `node16` (only with `module: node16`), `nodenext`, `bundler` |
   ```

7. Find:

   ```
   Nothing in a normal pipeline verifies the number is true. Node 20 reached EOL on 2026-03-24. |
   ```

   Replace with:

   ```
   Nothing in a normal pipeline verifies the number is true. Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24. |
   ```

8. Find:

   ```
   | `git ls-files --cached --others --exclude-standard -- package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb` — more than one line is the violation. Then `jq -r '.packageManager // empty' package.json` must name the manager that produces the surviving one. | SHOULD |
   ```

   Replace with:

   ```
   | see block TS-PKG-13. The first command printing more than one line is the violation, and so is any `npm-shrinkwrap.json` line: npm 12 neither reads nor writes that file, so rename it to `package-lock.json`. The second command reads both pin fields and must print only the manager that produces the surviving lockfile; empty output means no pin, and two different managers is the violation. | SHOULD |
   ```

9. Insertion. Anchor (the end of block TS-PKG-12):

   ````
   jq -r '.dependencies // {} | keys[]' package.json | grep -E -e '^@types/' -e '^@testing-library/' -e jsdom -e vitest -e jest -e playwright -e eslint -e prettier -e '^typescript$' -- -
   ```
   ````

   Insert after it:

   ````

   ```sh
   # TS-PKG-13
   git ls-files --cached --others --exclude-standard -- package-lock.json npm-shrinkwrap.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb
   jq -r '.packageManager // empty, (.devEngines.packageManager // empty | if type=="array" then .[].name else .name end)' package.json
   ```
   ````

10. Find:

    ```
    `require(esm)` is unflagged and warning-free from exactly those versions.
    ```

    Replace with:

    ```
    `require(esm)` is unflagged from exactly those versions, and warning-free from 20.19.0 / 22.13.0.
    ```

11. Insertion. Anchor (the end of the TS-PKG-11 row):

    ```
    then see block TS-PKG-11 for top-level await on a `require()`-reachable path. | SHOULD |
    ```

    Insert after it, as the next table row:

    ```
    | **TS-PKG-16** | Publish from CI through npm trusted publishing (OIDC): the publish job has `id-token: write`, no long-lived publish token comes from a secret, and only `push`, `release` or `workflow_dispatch` triggers it. A trusted publisher created after 2026-09-03 is stage-only by default, so the job runs `npm stage publish` and a maintainer approves the version with 2FA. | npm rejects OIDC tokens from `issue_comment` and `pull_request_target` runs, so such a trigger fails on release day, not in review. A secret-held publish token outlives the job and works wherever it leaks; an OIDC token is minted per run. The shape agents write from older training, `npm publish` with `NPM_TOKEN`, is what a stage-only publisher rejects, and npm is targeting removal of direct publishing with 2FA-bypass tokens (a target, not a date, as of 2026-11-27). Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27). | see block TS-PKG-16 — it lists the publish and credential lines of every workflow that publishes for real. Each listed workflow must show an `id-token: write` line; any `issue_comment`, `pull_request_target` or `NPM_TOKEN` line is the violation, and so is a `NODE_AUTH_TOKEN` line unless it feeds only a read-only install. Empty output means no workflow publishes. | SHOULD |
    ```

12. Insertion. Anchor (the end of block TS-PKG-11):

    ````
    git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.ts' | xargs -0 -r grep -H -n -E -e '^await ' -e '^const .* = await ' --
    ```
    ````

    Insert after it:

    ````

    ```sh
    # TS-PKG-16
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -H -E -e 'npm (stage )?publish' -- | grep -v -e '--dry-run' | cut -d: -f1 | sort -u | xargs -r grep -H -n -E -e 'npm (stage )?publish' -e 'id-token: *write' -e 'NPM_TOKEN' -e 'NODE_AUTH_TOKEN' -e 'issue_comment' -e 'pull_request_target' --
    ```
    ````

## Spillover round

Input: the typescript-quality spillover check for this pair, which has four items. All four are confirmed by a primary source. One of them (item 1) needs no change because the target is already correct.

### Verdict

- Make two rationale-only edits in `rules/typescript-packaging.md`, to TS-PKG-10 and TS-PKG-16. No rule sentence, verification or severity changes, and no new rule is added, so this round alone is a patch bump. The first round's minor bump for the file stands. No reference skill exists and none is created; skill bump: none.
- Both edits append one sentence inside an existing table cell, so the line count does not change. The body stays under 200 lines and the table of contents stays.
- Neither edit contradicts the first round. TS-PKG-10 keeps the Node 20 dates the first round set, and TS-PKG-16 keeps every sentence the first round wrote.

### Changed rules

#### TS-PKG-10

- Old text (rationale, last sentence): "Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24."
- New text: "Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24. Node 25 is also end of life; Node 26 entered LTS on 2026-10-28 (26.13.0)."
- Why: Node 26 entering LTS falls inside the window. Node 25 being end of life is a second line the rule forbids as a floor, and an agent trained before the change still reads 26 as "Current" and 25 as supported. The rule sentence, verification and severity (MUST) are unchanged. The verification still reads the previous-releases page, which lists both facts.
- Sources: https://raw.githubusercontent.com/nodejs/Release/main/schedule.json (v26: lts 2026-10-28, maintenance 2027-10-20, end 2029-04-30); https://nodejs.org/dist/index.json (v26.13.0, 2026-10-28, first Lithium LTS release); https://nodejs.org/en/about/previous-releases (Node 26 LTS, Node 25 End-of-Life).

#### TS-PKG-16

- Old text (rationale, last sentence): "Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27)."
- New text: "Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27). OIDC alone does not make a publish benign: in the 2026-05-11 TanStack compromise, attacker code from a poisoned Actions cache took the job's OIDC token from runner memory and published 84 versions through the trusted-publisher binding, which is why approving a staged version is a human step."
- Why: the rationale explained why OIDC beats a stored token, but not why the staged version needs a human approval. The SHOULD severity lets an adopter keep direct OIDC publish with a stated reason, and this incident is the fact that reason has to answer. The sentence makes no claim about provenance attestations, because the post-mortem does not address them. The rule sentence, verification and severity are unchanged.
- Sources: https://tanstack.com/blog/npm-supply-chain-compromise-postmortem (2026-05-11, 19:20 to 19:26 UTC; 84 malicious versions across 42 `@tanstack/*` packages; `pull_request_target`, cache poisoning and OIDC token extraction from runner memory; publishes authenticated through the trusted-publisher binding); https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation (stage-only tokens; npm CLI 11.15.0+, Node 22.14.0+), which confirms that the existing staged-publishing facts need no change.

### New rules

None.

### Declined

- Item 1, the typescript-eslint 8.74.0 peer range and the optional `@typescript/native` peer: no change needed. The target says nothing about the peer range. Its compiler stamp (7.0.2 stable, 7.1 beta since 2026-10-20) and its `projectService` pointer are already correct. The fact belongs to typescript-quality TS-TOOL-01.
- Item 3, npm 12 defaulting `allow-git` and `allow-remote` to `none`: declined, although the npm CLI changelog confirms it. The change predates the window (12.0.0 on 2026-07-08), and the first round kept the baseline's decision to defer install-default rules. TS-PKG-01 already catches the packaging consequence: a package with a git or tarball-URL dependency fails its own sandbox `npm install` on npm 12. The fact belongs to typescript-quality TS-SEC-13.
- Item 4, the Commander 15 half (ESM-only, `engines.node >=22.12.0`): no change. The target does not mention Commander, and the fact belongs to typescript-quality TS-CLI-04. The Node 26 LTS half of item 4 is applied above.

### Edit list (spillover round)

All entries apply to `rules/typescript-packaging.md`. Apply them in order, after the first-round edit list.

1. Find:

   ```
   Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24. |
   ```

   Replace with:

   ```
   Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24. Node 25 is also end of life; Node 26 entered LTS on 2026-10-28 (26.13.0). |
   ```

2. Find:

   ```
   Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27). |
   ```

   Replace with:

   ```
   Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27). OIDC alone does not make a publish benign: in the 2026-05-11 TanStack compromise, attacker code from a poisoned Actions cache took the job's OIDC token from runner memory and published 84 versions through the trusted-publisher binding, which is why approving a staged version is a human step. |
   ```
