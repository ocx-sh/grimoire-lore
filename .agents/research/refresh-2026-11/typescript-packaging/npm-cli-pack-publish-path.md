---
title: npm CLI pack and publish path, delta 2026-08-29 to 2026-11-27
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 7
---

# npm CLI pack and publish path: delta against the 2026-08-29 baseline

This is a delta update. The baseline research recorded npm 12.0.0 (released 2026-07-08). In the window the registry shows these releases: npm 12.1.0 (2026-09-22), 12.2.0 (2026-09-30), 12.2.1 (2026-10-15), 12.2.2 (2026-11-04), 12.2.3 (2026-11-18, `latest`), and on the 11.x line 11.20.0, 11.21.0, 11.21.1, 11.21.2 and 11.21.3 (`next-11`). Release dates come from `npm view npm time`.

Method: the npm 12.2.3 tarball (`npm pack npm@12.2.3`) was unpacked and its `lib/commands/publish.js`, `lib/commands/pack.js`, `node_modules/bin-links/lib/fix-bin.js`, config definitions and docs were read. A throwaway package was then run through that exact 12.2.3 binary. GitHub release notes for v12.1.0 through v12.2.3 and the 11.x releases were read with `gh release view -R npm/cli`.

## Result per claim

All five claims are unchanged. Only one matched string or glob needs a decision (TS-PKG-13 and the shrinkwrap glob), and one docs link moves. Nothing in the window touched the manifest-normalization path, the warning text, or the rejection text.

### TS-PKG-03: only publish normalizes the manifest. UNCHANGED.

- `lib/commands/publish.js` (12.2.3), `#getManifest`: `const pkg = await pkgJson.fix(spec.fetchSpec, { changes })`, followed by `log.warn(this.#command, 'npm auto-corrected some errors in your package.json when publishing.  Please run "npm pkg fix" to address these errors.')`.
- `lib/commands/pack.js` (12.2.3) calls only `pacote.manifest(...)` and `libpack(...)`. It has no `fix` call.
- Observed with npm 12.2.3 on a package with `"bin":"bin/cli.js"` and `"repository":"github.com/foo/bar"`:
  - `npm publish --dry-run` printed `npm warn publish npm auto-corrected some errors in your package.json when publishing.  Please run "npm pkg fix" to address these errors.` then `errors corrected:` with `"bin" was converted to an object` and `"repository" was changed from a string to an object`.
  - `npm pack --dry-run` on the same package printed no warning at all (grep for warn, auto, error returned nothing).
- The string `auto-corrected` is therefore still emitted verbatim.
- Rejection text, `publish.js`: `throw new Error(\`You cannot publish over the previously published versions: ${manifest.version}.\`)`. The substring "cannot publish over the previously published versions" is unchanged. The throw is gated by `if (!force)`, and `dryRun` does not skip it.
- Does `publish --dry-run` still contact the registry? Yes by source: with `!force`, `#registryVersions` calls `pacote.packument(..., { preferOnline: true, registry })` even under dry-run. Its errors are swallowed (`catch (e) { return { versions: [], highestVersion: null } }`), so an unreachable registry silently skips the over-publish check instead of failing. I could not observe the version-exists rejection live because no published throwaway name was available; the source reading stands for that.
- Related new text, same block: `Cannot implicitly apply the "latest" tag because previously published version ${highestVersion} is higher than the new version ${manifest.version}. You must specify a tag using --tag.` This is a second non-zero outcome of a dry-run that the rule's "exact rejection" filter would treat as fatal. It existed before the window in intent, but the TS-PKG-03 text does not mention it. Candidate below.
- Dry-run without credentials only warns: `npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)` and exits zero (observed).

### TS-PKG-01: `npm install --ignore-scripts <tarball>` in a mktemp sandbox. UNCHANGED, and still meaningful but redundant.

- Observed with npm 12.2.3: `npm install --ignore-scripts <path>.tgz` in an empty sandbox with `{}` as package.json succeeded (`added 1 package`) and linked `node_modules/.bin/lore-smoke-zz -> ../lore-smoke-zz/bin/cli.js`. The package's `postinstall` did not run.
- Observed without the flag: the install also succeeded and the install script was blocked, not run: `npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:` ... `lore-smoke-zz@1.0.0 (postinstall: ...)`. The sentinel file was never written.
- Config text in 12.2.3 (`definitions.js`, allow-scripts): "`--ignore-scripts` and `--dangerously-allow-all-scripts` both override this setting." So the flag is accepted and still wins. On npm 12 it is redundant for blocking, but it keeps the sandbox safe under npm 11 and under any `.npmrc` that sets `dangerously-allow-all-scripts`. Keep it.
- Local tarball needs no allow flag: `allow-file` defaults to `all` (`definitions.js`: `'allow-file': ... default: 'all'`); `allow-remote` defaults to `none` but covers only URL dependencies ("dependencies that point to a tarball url"). `npm config get allow-file` printed `all`, `allow-remote` printed `none`. A local path is a file spec, so the install worked with no extra flag.
- One new fact: in a project-scoped `npm install`, passing `--allow-scripts` on the command line is an error (same definition). The rule does not use `--allow-scripts`, so no impact.
- Caveat: because npm 12 prints the "blocked" warning, a verification script that fails on any `npm warn` in the install step would now fail on a package that has install scripts. The rule does not require such a check.

### TS-PKG-05: npm self-heals mode, never inserts a shebang. UNCHANGED.

- `bin-links@7.0.1` (shipped inside npm 12.2.3; 12.2.2 changelog line: "`bin-links@7.0.1`", 11.x got `bin-links@6.0.3` in 11.21.x). `lib/fix-bin.js` only calls `chmod` when `(st.mode & mode) !== mode`, and rewrites a CRLF hashbang to LF if one exists. Its header comment: "make sure that bins are executable, and that they don't have windows line-endings on the hashbang line." It never writes a shebang.
- Observed: a bin file packed at mode 644 was installed at `.rwxrwxr-x`.

### TS-PKG-15: pack listing and default publish set. UNCHANGED.

- `npm pack --dry-run` still prints a `Tarball Contents` listing and `Tarball Details` (observed; the file listing lines are `npm notice <size> <path>`). The default set is still all files not ignored; the `files` allowlist behavior was not touched in any release note in the window.
- Note: the 12.2.3 `pack --dry-run` and `publish --dry-run` outputs both list `bin/cli.js` and `package.json` (total files: 2). The tail-truncated pack run showed the same detail block.
- Window changes touching pack: 12.1.0 "exempt explicit pack targets from allow-directory" ([#9756](https://github.com/npm/cli/pull/9756), back-ported to 11.x as [#9916](https://github.com/npm/cli/pull/9916)) and "pack: select workspace through config" ([#9961](https://github.com/npm/cli/pull/9961)); neither changes the listing or the file set. 12.1.0 "keep dry-run output valid json" ([#9823](https://github.com/npm/cli/pull/9823)) matters only with `--json`.

### Globs and TS-PKG-13: `**/npm-shrinkwrap.json`. CHANGED in recommendation, not in upstream fact.

- Upstream fact is the same as the baseline recorded, now confirmed in the shipped 12.2.3 docs (`docs/content/configuring-npm/package-lock-json.md`): "As of npm v12, `npm-shrinkwrap.json` is no longer read or written by npm. Projects that previously committed `npm-shrinkwrap.json` should rename it to `package-lock.json`; the file format is identical. When npm v12 encounters a dependency that ships an `npm-shrinkwrap.json` inside its tarball, the file is ignored."
- Observed: in a directory with only `package.json` and `npm-shrinkwrap.json`, `npm pack --dry-run` did not list it as an error, and `npm install` there failed with an ENOENT before any lockfile use (my fixture was malformed, so treat that as inconclusive; the doc quote is the evidence).
- Decision: keep the glob. The rule's globs select which files trigger the rule for review. A repository still committing `npm-shrinkwrap.json` is exactly a file the reviewer must see, because on npm 12 it is silently inert and on npm 11 it is still honored, so lockfile intent diverges by npm version. Removing the glob would hide that.
- Decision: do change the TS-PKG-13 check. Its grep `-- package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb` does not list `npm-shrinkwrap.json`. Add it, so a committed shrinkwrap beside `package-lock.json` counts as the "two lockfiles" violation and a lone shrinkwrap is flagged for rename.

Exact replacement for the TS-PKG-13 verification command:

`git ls-files --cached --others --exclude-standard -- package-lock.json npm-shrinkwrap.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb` — more than one line is the violation, and so is any `npm-shrinkwrap.json` line (npm 12 ignores it; rename it to `package-lock.json`).

### Docs link v11 to v12. CHANGED (low impact).

- `https://docs.npmjs.com/cli/v12/configuring-npm/package-json` resolves (HTTP 200 after redirect) and contains the `engines` section. The v11 URL also still redirects, so nothing is broken, but `npm` `latest` is now 12.2.3. The files containing `cli/v11` are `.agents/research/ts-modules.md`, `.agents/research/ts-modules/publish-verification.md`, `.agents/research/typescript-topic-map/hardening.md` and `recent-shifts.md`. The rule file itself contains no `cli/v11` link (grep over `rules/` found none), so no rule string changes; only research key-source links should move to `.../cli/v12/...`. I did not re-verify that the engines wording itself is identical on v12; the page has the `engines` heading.

## Normative candidates

1. TS-PKG-03, add the second dry-run outcome. Rationale: `publish --dry-run` can also fail with `Cannot implicitly apply the "latest" tag because previously published version ... is higher`, which on a maintenance-branch PR would be fatal for an unrelated reason, like the over-publish rejection. Suggested text to append to the rule row: "also treat the `Cannot implicitly apply the "latest" tag` rejection as non-fatal, or pass `--tag` in the dry-run." Verification: grep the script for both rejection strings or a `--tag` argument. Priority: SHOULD. Confidence: medium, because this error exists in 12.2.3 source but I did not test whether it also existed before 2026-08-29; it is not a window change.
2. TS-PKG-13, add `npm-shrinkwrap.json` to the file list (text above). Rationale: npm 12 ignores the file, so an old shrinkwrap is a silent stale lock. Verification: the `git ls-files` command above.
3. TS-PKG-03, optional note: because the registry-version lookup swallows its errors, a dry-run on an offline CI runner passes without checking over-publish. This changes nothing for the rule's check but means the "treat only the exact rejection as non-fatal" branch is simply never reached offline.

## Could not determine

- Whether npm 11.21.x still prints the identical `auto-corrected` text: not run. The local npm is 11.20.0 but I only ran 12.2.3. The 11.x release notes list no change to publish normalization in the window, and the v11 publish path shares the baseline research's reading.
- A live "previously published versions" rejection against a real registry: not reproduced.

## Sources

- https://github.com/npm/cli/releases/tag/v12.1.0, v12.2.0, v12.2.1, v12.2.2, v12.2.3 (and the 11.19.1 to 11.21.3 releases)
- npm 12.2.3 tarball source: `lib/commands/publish.js`, `lib/commands/pack.js`, `node_modules/bin-links/lib/fix-bin.js`, `node_modules/@npmcli/config/lib/definitions/definitions.js`, `docs/content/configuring-npm/package-lock-json.md`
- `npm view npm time` and `npm view npm dist-tags` (registry)
- https://docs.npmjs.com/cli/v12/configuring-npm/package-json
