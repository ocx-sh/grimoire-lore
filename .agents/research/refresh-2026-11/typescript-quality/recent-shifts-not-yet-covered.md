---
title: TypeScript and Node quality shifts not yet covered, 2026-08-29 to 2026-11-27
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 9
---

# TypeScript and Node quality shifts not yet covered

This is a delta against `.agents/research/typescript-topic-map/recent-shifts.md` (researched 2026-08-29). It reports only what that baseline does not mention and what would change `rules/typescript-quality.md` or a file under `skills/typescript-quality-reference/`. The TypeScript 6/7/7.1 compiler and typescript-eslint 8.73 material is already covered by the sibling file `typescript-compiler-6-and-7.md` and is not repeated here. Package.json, tsconfig, exports and publish verification belong to the typescript-packaging pair.

## Summary

- Two new rule-level shifts: coding-agent and editor config files are now a worm persistence channel (Shai-Hulud family, keyv/cacheable, August 2026 with new October variants), and GitHub Actions release workflows can emit valid provenance for a malicious publish (TanStack, May 2026).
- One stale-training-data trap in testing: Vitest 5.0 (2026-09-03) flips defaults that agents rely on.
- One tooling item: oxlint type-aware mode on tsgolint v7 is stable (2026-07-22, before the window but absent from the baseline and from gate.md). gate.md needs a short section, not a rule change.
- Nothing found that retires an existing rule.
- Could not determine: Node fetch timeout option, a stable `Readable.prototype.map`, Biome/Vite blog items in the window, State of JS 2026, Playwright and Zod changes, TC39 November 2026 (meeting 117 is 2026-11-30 to 2026-12-03, after this research date).

## Ranked candidates

### 1. security.md: agent and editor config files as a worm persistence channel. Verdict: adopt

- Target file: `skills/typescript-quality-reference/security.md`, new row after TS-SEC-14 (id TS-SEC-16 or similar), plus a bullet in What Agents Get Wrong.
- Draft rule: "Treat `.claude/`, `.vscode/` and `.github/workflows/` as executable code: they are covered by CODEOWNERS and reviewed like source, and a change to a hook or folder-open task (`SessionStart`, `folderOpen`) in a dependency-update or 'config tidy' commit is a blocking finding."
- Rationale: the keyv/cacheable worm (2026-08-04) committed a `SessionStart` hook into `.claude/settings.json` and a `folderOpen` task into `.vscode/tasks.json`, so the payload runs when a developer opens the repo or starts an agent session, without `npm install`. TS-SEC-13 (install scripts off) does not stop this. Commits were disguised with an author named `claude` and a spoofed bot badge. Socket's page (updated 2026-10-15) records the same technique in the October keyv/cacheable and tensorlake waves.
- Verification: `git ls-files -z -- .claude .vscode | xargs -0 -r grep -H -n -E -e SessionStart -e folderOpen -e runOn` and `git log --diff-filter=AM --format='%h %an %s' -- .claude/settings.json .vscode/tasks.json`; a hit is not a violation by itself, an unreviewed hit is. Empty output means no such hooks exist.
- Note: the baseline says to rotate tokens after a compromise. Both WorkOS and Socket report a dead-man's switch that fires when a stolen GitHub token is revoked, so incident response must look for persistence artifacts (LaunchAgent, systemd user service) before revoking. That belongs in one sentence of the rule's rationale, not a separate rule.
- Sources: https://workos.com/blog/npm-worm-coding-agent-config-credentials (2026-08-06, incident 2026-08-04); https://www.socket.dev/glossary/shai-hulud (last updated 2026-10-15). Caveat: the incident itself predates the window by 25 days; the baseline's supply-chain section ends at Shai-Hulud V2 and ChainDrop-era material and does not mention this vector. Search results disagreed on which script the two hooks call; the rule does not depend on that detail.

### 2. security.md: provenance and trusted publishing are not proof of an honest publish; staged publishing exists. Verdict: adopt

- Target file: `skills/typescript-quality-reference/security.md`, new row in "Install-Time Supply Chain" or a new "Publish-Time" group; coordinate with typescript-packaging so publish verification is stated once.
- Draft rule: "A release workflow publishes through trusted publishing and stages the version (`npm stage publish`, or a stage-only token where trusted publishing is not yet possible) so a human approves with 2FA before it becomes installable. Valid provenance is never treated as evidence the publish was benign."
- Rationale: in the TanStack compromise (2026-05-11) a fork's `pull_request_target` workflow poisoned a pnpm cache the release workflow restored; attacker code read the OIDC token from runner memory and published 84 versions across 42 packages with valid provenance. Staged publishing entered preview 2026-05-20, stage-only tokens shipped 2026-09-18 (requires npm 11.15.0+, Node 22.14.0+), staging for new packages 2026-10-02, and npm targets January 2027 to remove direct publishing for 2FA-bypass tokens. Stage-only tokens can still move dist-tags and deprecate versions.
- Verification: `grep -rn -E -e 'npm stage' -e 'stage only' .github/workflows` and `grep -rn 'npm publish' .github/workflows`; the first empty with the second non-empty on a published package is the finding.
- Sources: https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation (2026-09-18); https://github.blog/changelog/2026-05-22-staged-publishing-and-new-install-time-controls-for-npm (2026-05-22, surfaced in search, not opened); TanStack detail from the Socket glossary above (secondary).

### 3. security.md: CI workflow hardening that the worm waves exploited. Verdict: adopt

- Target file: `skills/typescript-quality-reference/security.md` (CI workflow permissions are already in its scope line; no rule found for these two points; verified by grep for "pull_request_target" and SHA pinning, no hits in the pair).
- Draft rule: "Third-party actions are pinned to a full commit SHA, and a workflow that triggers on `pull_request_target` never restores a cache that a release workflow also restores."
- Rationale: on 2026-09-16 two `actions-cool` actions were re-enabled with tags still pointing at the payload, and only SHA pins from before 2026-05-18 avoided it; the TanStack cache-poisoning chain above needed exactly that shared cache.
- Verification: `grep -rn -E 'uses: [^@]+@[^0-9a-f]' .github/workflows | grep -v -E '@[0-9a-f]{40}'` lists tag-pinned actions; `grep -ln pull_request_target .github/workflows/*` then read each for `actions/cache` or setup-node cache. Empty output on the first means every action is SHA-pinned.
- Source: https://www.socket.dev/glossary/shai-hulud (updated 2026-10-15). Single secondary source; open the original TanStack post-mortem before writing the rule text.

### 4. testing.md: Vitest 5 changed defaults agents rely on. Verdict: adopt

- Target file: `skills/typescript-quality-reference/testing.md`, a What Agents Get Wrong item and any row that assumes `clearMocks` is off or that un-awaited `resolves` only warns.
- Draft rule: "On Vitest 5, `await` every `expect(...).resolves`, `.rejects` and `toMatchFileSnapshot` (an un-awaited one now fails the test), do not rely on mock calls recorded in `beforeAll` surviving into a test (`clearMocks` now defaults to `true`), and write benchmarks as `test('...', async ({ bench }) => ...)`."
- Rationale: Vitest 5.0 (2026-09-03) requires Node 22.12.0+ and Vite 6.4.0+; `clearMocks` defaults to `true`; `expect.poll` rejects on timeout and passes an `AbortSignal`; `Temporal` is faked by default under fake timers; locators are strict by default in browser mode; reporter output moves to `.vitest`. Agents trained on Vitest 3/4 write the old forms.
- Verification: `grep -rn -E 'expect\(.*\)\.(resolves|rejects)' --include=*.test.ts . | grep -v await` for un-awaited assertions; `grep -rn "import .*\bbench\b.* from 'vitest'"` for the old bench import. Empty output means no hit.
- Source: https://vitest.dev/blog/vitest-5 (2026-09-03). The migration guide host was unreachable; the claims about `vi.mock` hoisting throwing outside top level, `toThrow('')` and ancestor config lookup come only from search snippets and are excluded from the draft rule. Also check the existing testing.md text for Vitest 4 statements.

### 5. gate.md: add a short oxlint and tsgolint section. Verdict: adopt (informational, no new mandatory rule)

- Target file: `skills/typescript-quality-reference/gate.md`, a section parallel to "Biome", and a mention in `rules/typescript-quality.md` line 34 area where typed linting is described.
- Draft text: "Oxlint type-aware mode is stable. It runs on tsgolint pinned to TypeScript 7.0.2 (`pnpm add -D oxlint oxlint-tsgolint@7`, `oxlint --type-aware`, optionally `--type-check`), covers 59 of typescript-eslint's 61 type-aware rules, and is the only typed-lint path that works on TypeScript 7 stable today. typescript-eslint gained an experimental TypeScript 7.1 backend in 8.73.0 (2026-11-16) but its stable peer range still stops below 6.1. Verify any port the same way as TS-GATE-12: hand-check that `no-floating-promises` and `no-misused-promises` equivalents are on, and name the two missing rules before claiming parity."
- Rationale: the baseline verdict ("tsgolint is the right destination and the wrong thing to do today") rested on no typed-lint path for TS 7. The stable release closed the tool gap on 2026-07-22, which predates the 2026-08-29 baseline but is not in gate.md or the baseline. Config keys `options.typeAware` and `options.typeCheck` are root-only, CLI flags override them.
- Verification: `grep -n -E 'typeAware|type-aware|oxlint-tsgolint' package.json oxlint.config.ts .oxlintrc.json`; planted-violation check per TS-CORE-02 with a floating promise.
- Source: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable (dated by URL slug, 2026-07-22; the page text has no date). Benchmarks there (12 to 18 times faster than typescript-eslint) are vendor numbers, do not copy them into a rule. The two missing rules are not named in the post: could not determine which. InfoQ coverage in 2026-09 was seen only as a search result.

### 6. security.md or modules.md: Node permission model, documented limits. Verdict: watch

- Target file: none yet; if the pair adds a sandboxing rule it belongs in `security.md`.
- Draft rule (not adopted): "Never describe `node --permission` as a sandbox for untrusted code; it is a seat belt against accidental access."
- Facts from the Node 26 docs: stable since 22.13.0/23.5.0, `process.permission.drop()` revokes irreversibly, `--allow-ffi` exists, and the documented gaps include symlinks followed outside granted paths, `--env-file` and `--openssl-config` read before initialization, fd-based bypass, and ungated `process._debugProcess`. The docs state it is not a security boundary. The pair does not mention the permission model, so this is not a stale item, only a possible future addition.
- Source: https://nodejs.org/docs/latest-v26.x/api/permissions.html (current page, no per-change dates fetched; the date of `process.permission.drop` could not be determined, a search snippet places it in May 2026).

### 7. Node 26 became LTS on 2026-10-28. Verdict: watch

- Target: any sentence in the pair that names the current Node LTS or Current line.
- Fact: Node 26.13.0 moved 26.x to LTS ("Lithium", supported to end of April 2029); the page lists no code-level changes versus 26.12.1.
- Verification: `grep -rn -E 'Node (2[0-9])|node2[0-9]|current LTS' rules/typescript-quality.md skills/typescript-quality-reference`. Floor and engines decisions belong to typescript-packaging.
- Source: https://nodejs.org/en/blog/release/v26.13.0 (2026-10-28).

### 8. TC39 September 2026 Stage 4: Iterator Join, Includes, Chunking. Verdict: ignore

- Reached Stage 4 at the 2026-09 plenary (per community notes at https://scrapbox.io/petamoriken/2026-09_%E3%81%AE_TC39_meeting, secondary, no meeting dates given). Stage 4 is not runtime availability, and no TypeScript or Node shipping evidence was found; do not add a rule until the TypeScript `lib` types and a Node LTS carry them.

## Items checked and dropped

- Express: the official support page (https://expressjs.com/en/support, fetched 2026-11-27) lists 4.x as "ongoing" with no end date. Third-party sources cite "no sooner than 2026-10-01". Could not determine a change; not a trap.
- React Router 8 shipped 2026-06-17, before the window; not new here.
- AI-agent failure patterns: the MSR '26 paper on agents using `any` 9 times more than humans is dated February 2026 (arXiv 2602.17955, seen as a search result), before the baseline and consistent with existing type rules; dropped as a restatement. No vendor TypeScript-specific study in the window was found.
- Worm incidents restating TS-SEC-13 and TS-SEC-14 (install scripts, cooldown) add nothing beyond items 1 to 3; npm 12 install defaults are in the baseline.
- TypeScript 7.1 beta and typescript-eslint 8.73.0: covered by the sibling delta file.

## Claim status

| Claim at risk | Status | Evidence |
|---|---|---|
| gate.md has no oxlint/tsgolint content | changed: stable release exists | oxc.rs blog, 2026-07-22 |
| TS-SEC-13 and TS-SEC-14 cover the worm class | changed: agent-config persistence, staged publishing and valid-provenance abuse are uncovered | Socket glossary 2026-10-15; GitHub changelog 2026-09-18 |
| Vitest 4 behavior in testing.md | changed | vitest.dev/blog/vitest-5, 2026-09-03 |
| Node permission model description | unchanged (pair has none) | Node 26 permissions docs |
| Native fetch timeout option, stable `Readable.prototype.map` | could not determine | No Node source fetched that mentions either |
| State of JS 2026, Biome/Vite/V8 blogs, TC39 November 2026 | could not determine | Not fetched; November plenary is after research date |
