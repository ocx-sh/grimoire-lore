---
title: TypeScript/Node Hardening Topic Map
corpus: nodejs.org security best practices, OWASP Node.js/NPM/Prototype-Pollution cheat sheets, OpenSSF (npm best practices, Scorecard, Concise Guides), zod/valibot/typebox/ajv + standard-schema, Node.js official API docs, eslint-plugin-security/regexp, React/Vue/DOMPurify/MDN CSP, npm/Renovate/GitHub registry+Actions docs, VS Code workspace trust
agent: hardening scout
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 24
scope: |
  Landscape survey of published DEFENSIVE guidance for Node.js and TypeScript,
  for a code-review checklist AI agents load while editing this fleet's own
  code: published ESM library + commander CLI on NodeNext (Node >=20/>=22);
  VS Code extensions; a GitHub Action on Bun; browser SPAs (React+Vite,
  Vue+Vite); one Biome monorepo. TS ^5.7. Excludes generic security posture,
  generic dependency policy, and generic CI gates already covered by the
  prior Rust and Python programs — returns only the TS/Node-specific
  instance. Does not select or rank rules for adoption; that is the next
  program phase.
---

## Table of contents

- [Summary](#summary)
- [Guidance walk](#guidance-walk)
  - [Node.js official security best practices](#nodejs-official-security-best-practices)
  - [OWASP Node.js Security Cheat Sheet](#owasp-nodejs-security-cheat-sheet)
  - [OWASP NPM Security Cheat Sheet](#owasp-npm-security-cheat-sheet)
  - [OWASP Prototype Pollution Prevention Cheat Sheet](#owasp-prototype-pollution-prevention-cheat-sheet)
  - [OpenSSF Concise Guide for Developing More Secure Software](#openssf-concise-guide-for-developing-more-secure-software)
  - [OpenSSF Concise Guide for Evaluating Open Source Software](#openssf-concise-guide-for-evaluating-open-source-software)
  - [OpenSSF npm best practices guide](#openssf-npm-best-practices-guide)
  - [OpenSSF Scorecard checks](#openssf-scorecard-checks)
  - [Input validation at the trust boundary](#input-validation-at-the-trust-boundary)
  - [Safe-by-construction Node APIs](#safe-by-construction-node-apis)
  - [Regular-expression safety](#regular-expression-safety)
  - [Browser output encoding](#browser-output-encoding)
  - [Supply-chain hygiene (registries' own docs)](#supply-chain-hygiene-registries-own-docs)
  - [GitHub Actions hardening](#github-actions-hardening)
  - [VS Code extension guidance](#vs-code-extension-guidance)
- [Safe-by-construction table](#safe-by-construction-table)
- [Candidate topics](#candidate-topics)
- [Sources](#sources)

## Summary

- **`npm audit signatures` and provenance are two different guarantees, and the fleet publishes packages** — one verifies the registry didn't tamper with the tarball (ECDSA registry signature), the other verifies which source commit and CI job produced it (Sigstore-signed attestation); a review checklist for the publish workflow needs both, not either.
- **`min-release-age` is now a first-class install-time control across all four major package managers**, not just a Renovate PR-gating concept: npm 11.10.0 (Feb 2026), pnpm 10.16 (Sep 2025), plus Yarn and Bun each shipped their own cooldown flag in late 2025 — this fleet's `.npmrc`/`bunfig.toml` is a real place to check, and pnpm 11 turns it on by default.
- **`ignore-scripts` has a documented gap that a checklist must call out**: it suppresses `preinstall`/`install`/`postinstall`, but `npm start`/`test`/`run-script` still execute the named script even with the flag set — only their own pre/post hooks are skipped. A reviewer checking ".npmrc has ignore-scripts=true" is not verified against every lifecycle.
- **Corepack's distribution status changed mid-corpus**: the Node.js TSC voted to stop bundling Corepack from Node 25+; it remains in Node 24 LTS and earlier, and is still installable standalone. The `packageManager` field in `package.json` itself is unaffected and still the source of truth for pinning the package manager version.
- **Two ESLint plugins cover two different regex problems and neither subsumes the other**: `eslint-plugin-security`'s `detect-unsafe-regex`/`detect-non-literal-regexp` catch known-bad literal patterns and dynamically-built `RegExp()` from untrusted input; `eslint-plugin-regexp`'s `no-super-linear-backtracking`/`no-super-linear-move` do structural backtracking analysis on regex literals regardless of source. A ReDoS-focused rule set wants both.
- **`path.isAbsolute()` carries an explicit Node-docs disclaimer that it is "not safe for mitigating path traversals"** — and `path.resolve()`'s own docs give zero traversal guidance. The safe pattern (resolve, then verify the result starts with the trusted root + path separator) is not in the API docs at all; it's a composition the reviewer must know independently — flag as a reading heuristic, not something the docs hand you.
- **React's own docs do not recommend DOMPurify or any sanitizer** — the `dangerouslySetInnerHTML` page's only guidance is "only use with trusted and sanitized data," leaving the sanitizer choice and its placement entirely to the app. Vue's security guide is more concrete: it names DOMPurify explicitly for `v-html` content that isn't fully trusted, plus a *separate* URL-injection concern (`:href`) that isn't an HTML-injection problem at all and needs its own control (`@braintree/sanitize-url` or backend-side allowlisting).
- **`vue/no-v-html` is a default-on ESLint rule in Vue's recommended config; there is no equivalent default-on rule for React's `dangerouslySetInnerHTML`** in React's own tooling — `eslint-plugin-react`'s `no-danger` is opt-in. This is a real asymmetry between the fleet's two SPA stacks that a shared checklist must state per-framework, not once.
- **CSP delivered via `<meta http-equiv>` (the only option for a static Vite-built SPA with no controllable server) cannot carry `report-uri`/`report-to` or `frame-ancestors`** — MDN is explicit about this gap. A Vite SPA's CSP checklist item is therefore "as strict as `'self'`/nonce/hash policy allows, with the known-missing directives named," not "matches the header-delivered ideal."
- **Standard Schema is not a fifth validation library — it's a ~60-line interface that zod, valibot, arktype (and others) already implement**, letting a library accept `StandardSchemaV1` and support all of them without adapters. The fleet's choice is still "which validator," but *where the fleet writes reusable validation-accepting code* (e.g. shared CLI-option or RPC-input helpers), targeting the standard interface instead of one library's type is the TS-specific move.
- **Ajv and Zod make the same trust-boundary claim in different vocabulary**: Ajv frames its compiled validators as TypeScript *type guards* that narrow `unknown` on success; Zod frames `.parse()`/`.safeParse()` as turning "untrusted data" into a typed value. Both converge on the same rule for this fleet: any `JSON.parse()`, `fetch()` response body, CLI arg, env var, or RPC payload is `unknown` until it has passed through one of these, never asserted with `as`.
- **Node's `fs/promises` silently returns a `Buffer` instead of a string if no encoding is passed to `readFile`** — this is a correctness footgun as much as a security one (mismatched encoding assumptions on user-supplied file paths/content), and it's a mechanical grep: any `readFile(` call without an `encoding`/`'utf8'` option nearby.
- **The GitHub Actions `dist/` drift check has a concrete reference implementation** (`actions/typescript-action`'s `check-dist.yml`): `rimraf dist && npm ci && npm run bundle`, then `git diff --ignore-space-at-eol --text dist/` must be empty. This is directly relevant if the fleet's GitHub Action (on Bun) ships a committed bundle — the check command is exact and copy-pasteable, just needs `bun` verbs substituted for `npm`.
- **`pull_request_target` is not "avoid it" advice — GitHub's own docs describe legitimate uses** (labeling/commenting on fork PRs) and the actual rule is narrower: never explicitly check out the PR head ref under `pull_request_target`, because the trigger runs with base-branch privileges and secrets while a naive checkout still pulls untrusted fork code into that privileged context.
- **Script-injection prevention in `run:` blocks has three documented mitigation tiers, not one**: prefer an action over inline script; if inline is unavoidable, pass the `${{ }}` expression through an intermediate `env:` var (never string-interpolate directly into the shell); quote every shell variable. A reviewer flags any bare `${{ github.event.*.title/body }}` (or similar attacker-controlled field) inside `run:` as the top-priority pattern.
- **VS Code's workspace-trust model is binary at the `package.json` capability level but the failure mode is silent**: `untrustedWorkspaces.supported: true` means "I never need trust," and an extension that reads workspace config files, spawns processes, or loads workspace-provided modules before checking `vscode.workspace.isTrusted` while declaring `true` is misrepresenting itself — this is a review-time cross-check between the manifest capability and the activation-path code, not something a single grep catches on its own.
- **Prototype-pollution mitigation is graduated, and the strongest tool (`Object.freeze(MyObject.prototype)`) has an explicit compatibility caveat**: freezing built-in prototypes can break dependencies that patch them, so OWASP's own list orders mitigations from "use `Map`/`Set` instead of a plain-object lookup table" (no compatibility risk) up through `Object.create(null)`, explicit `__proto__: null`, and only then freezing — a checklist should preserve that ordering, not present freeze as the default fix.
- **Timing-safe comparison is a named, specific API (`crypto.timingSafeEqual`), not a general "be careful with `===`" heuristic** — the mechanical check is any `===`/`==` comparing a secret/token/HMAC value pulled from user input against a stored value, which is a narrow and greppable pattern (comparisons involving variables named/typed as `token`, `secret`, `signature`, `hmac`, `apiKey`).

## Guidance walk

### Node.js official security best practices

Source: [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices).

- **DoS via unhandled socket errors / missing server timeouts (CWE-400)** — set `headersTimeout`, `requestTimeout`, `timeout`, `keepAliveTimeout`, `agent.maxSockets`/`maxTotalSockets`/`maxFreeSockets`, `server.maxRequestsPerSocket`; every socket needs an `'error'` handler. Check: grep HTTP server setup for these timeout options being unset, and for `net`/`tls` socket creation without `.on('error', ...)`. *(partially model-known: the existence of timeouts is common knowledge; the exact option names and defaults are not.)*
- **DNS rebinding via the inspector** — remove `--inspect` in production; handle `SIGUSR1` deliberately since it toggles the inspector. Check: grep deploy/start scripts and `Dockerfile`/`package.json` `scripts` for `--inspect` outside a dev script.
- **Sensitive info exposure through published npm packages (CWE-552)** — use `files` (allowlist, preferred) or `.npmignore` (denylist), and always `npm publish --dry-run` before a real publish. Check: `grep -q '"files"' package.json` or `test -f .npmignore`; CI step running `npm publish --dry-run` and diffing the file list.
- **HTTP request smuggling (CWE-444)** — never set `insecureHTTPParser: true`. Check: `grep -r "insecureHTTPParser" .` should find nothing, or only `false`.
- **Timing attacks (CWE-208)** — use `crypto.timingSafeEqual()` for comparing secrets/tokens/signatures, not `===`. Check: comparisons of variables plausibly holding secrets against `===`/`==` (see Summary). *(model knows constant-time comparison exists; the exact Node API name is worth stating.)*
- **Malicious third-party modules (CWE-1357)** — pin versions, use lockfiles, `npm ci` in CI, `npm audit`, `--ignore-scripts`, and the new `--min-release-age`/`min-release-age` config (npm >=11.10.0) to avoid freshly-published packages. Check: `.npmrc` for `ignore-scripts=true` and `min-release-age=<n>`; CI uses `npm ci` not `npm install`.
- **Memory access violation (CWE-284)** — `--secure-heap=n` in production. Niche; low priority for this fleet unless handling raw crypto material directly. *(model knows this exists only weakly — worth keeping as a low-priority item.)*
- **Monkey patching (CWE-349)** — `--frozen-intrinsics` (experimental) and/or `Object.freeze(globalThis)`. Note experimental-flag caveat: do not require this in production without accepting the "may have breaking changes" tradeoff the page itself states.
- **Prototype pollution (CWE-1321)** — `--disable-proto=delete`, `Object.create(null)`, `Object.freeze(MyObject.prototype)`, `Object.hasOwn(obj, key)` instead of `key in obj`/`obj[key]` on external input, plus schema validation for external request bodies. Check: see [dedicated cheat sheet](#owasp-prototype-pollution-prevention-cheat-sheet) below and its grep patterns. *(the `Object.hasOwn` idiom is worth flagging — less universally known than the rest.)*
- **Node permission model** — `--permission` plus `--allow-fs-read`/`--allow-fs-write`/`--allow-child-process`/`--allow-worker` to restrict what a process can touch. Relevant to the CLI/Action shapes running against untrusted inputs. Check: presence of `--permission` in the process's launch args when the threat model calls for it.
- **Experimental-feature caution** — the page itself flags `--frozen-intrinsics` as experimental; treat any Node CLI flag doc-tagged experimental as needing an explicit opt-in discussion, not silent adoption.

### OWASP Node.js Security Cheat Sheet

Source: [Nodejs Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html).

- **Input validation** — `validator`, `express-mongo-sanitize`; allowlist over denylist. *(model knows this)*
- **Output escaping** — `escape-html`, `DOMPurify`, `sanitize-html`. See [Browser output encoding](#browser-output-encoding) for the SPA-specific version.
- **Don't block the event loop** — flag synchronous I/O (`readFileSync`, `execSync`) in request-handling paths. Check: `grep -rE "Sync\(" src/` inside server/handler code.
- **Anti-CSRF**: the historically-recommended `csurf` package is deprecated — flag any dependency on it. Check: `grep csurf package.json`.
- **HTTP Parameter Pollution** — `hpp` middleware. *(model knows the vulnerability class; the specific middleware name is useful.)*
- **Security headers via `helmet`**: HSTS, frameguard (clickjacking), `noSniff`, `hidePoweredBy`, CSP. Check: `npm list helmet` and `app.use(helmet())` present; per-sub-protection greps for `helmet.<fn>`.
- **Cookie flags** — `secure`, `httpOnly`, `sameSite` on session cookies. Check: `grep -E "(secure|httpOnly|sameSite)"` near cookie/session config. *(model knows this)*
- **Avoid `eval()` and `child_process.exec()`** — see [Safe-by-construction table](#safe-by-construction-table). *(model knows to avoid `eval`; the `exec` vs `execFile` distinction is the non-obvious part, covered separately.)*
- **ReDoS avoidance and `eslint-plugin-security`/regex linters** — see [Regular-expression safety](#regular-expression-safety).
- **`"use strict"`** — largely moot for this fleet: TS compiles to strict-mode-implying module output and ESM is strict by default; flag only if the fleet emits non-module CJS without it. *(model knows this; near-fully superseded by module format for this fleet.)*

### OWASP NPM Security Cheat Sheet

Source: [NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html).

- **Avoid publishing secrets** — `files` allowlist or `.npmignore`, `npm publish --dry-run`. (Duplicate of Node.js best-practices item above — same control, same check.)
- **Enforce the lockfile** — `npm ci` / `yarn install --frozen-lockfile`. Check: CI workflow greps for `npm ci`, not bare `npm install`.
- **Minimize attack surface: ignore run-scripts** — `--ignore-scripts`, `.npmrc` `ignore-scripts=true`, or `@lavamoat/allow-scripts` for an explicit allowlist when *some* scripts are genuinely needed (native addon builds). Check: `.npmrc` content; presence of a lavamoat allowlist if scripts are re-enabled selectively.
- **Project health** — `npm outdated`, `npm doctor`. Low-value as an automated gate; more a periodic-maintenance item.
- **Vulnerability auditing** — `npm audit`; SCA tooling (Dependency-Track and similar) for deeper coverage.
- **Artifact governance / SBOM / signing** — `@cyclonedx/cyclonedx-npm` for SBOM generation, Sigstore/cosign for artifact signing, private registry with access control for internal packages. Relevant if the fleet's published library ships an SBOM — currently not stated as required, flag as a candidate the fleet should decide on rather than assume.
- **Responsible disclosure** — a `SECURITY.md` with a reporting channel. Check: `test -f SECURITY.md`.
- **2FA on the publishing npm account** — `npm profile enable-2fa auth-and-writes`. Not machine-checkable from the repo; an account-level control to confirm out of band.
- **Author tokens, scoped/read-only where possible** — `npm token create --read-only --cidr=<range>`. Relevant to CI publish credentials specifically.
- **Typosquatting/slopsquatting checks before adding a dependency** — `npm view <pkg>`, check download counts, GitHub repo existence/history. A reading heuristic for the intake step, not something CI enforces automatically — see also the [OpenSSF evaluation checklist](#openssf-concise-guide-for-evaluating-open-source-software).
- **Trusted publishers (OIDC)** — replaces long-lived npm tokens in CI with short-lived OIDC-issued credentials; provenance attestation becomes automatic. Directly relevant to this fleet's own publish workflow for the library — see [Supply-chain hygiene](#supply-chain-hygiene-registries-own-docs).
- **Dependency confusion prevention** — scoped package names (`@org/pkg`) plus a registered organization/scope on the public registry, even for packages the fleet never intends to publish there, to block name-squatting of the internal scope.
- **Verify documentation code samples before running them** — a reading heuristic (review copy-pasted install/setup snippets rather than trusting them verbatim), not a mechanical check.

### OWASP Prototype Pollution Prevention Cheat Sheet

Source: [Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html).

Ordered from lowest to highest compatibility risk (see Summary note on why order matters):

1. **Use `Map`/`Set` instead of a plain object as a lookup table** for any data whose keys come from external input. Check: object-literal-as-lookup-table patterns fed by request bodies/CLI args/RPC payloads — a review heuristic more than a clean grep.
2. **`Object.create(null)`** for objects that need to be plain-object-shaped but hold externally-controlled keys.
3. **`{ __proto__: null }`** as an inline equivalent when `Object.create(null)` isn't ergonomic.
4. **`Object.freeze()`/`Object.seal()`** on security-sensitive objects/prototypes — *caveat: can break dependencies that patch built-in prototypes; use narrowly.*
5. **`--disable-proto=delete` (or `=throw`)** Node flag — *limitation stated in the cheat sheet itself: does not stop `constructor.prototype`-based pollution*, only direct `__proto__` access.
6. **`Object.hasOwn(obj, key)`** instead of `key in obj` or unguarded `obj[key]` when iterating/merging externally-controlled objects.

### OpenSSF Concise Guide for Developing More Secure Software

Source: [Concise Guide for Developing More Secure Software](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software.html).

Selected items with a Node/TS-relevant angle (full list is generic and mostly out of scope per the brief):

- MFA for privileged repo access (GitHub org owners/npm publishers). *(model knows this — org-policy, not code-review.)*
- CI security-scanning tools; OpenSSF's own "guide to security tools" as the pointer. *(model knows CI scanning is good practice generically; the specific OpenSSF tool-guide pointer is new.)*
- Dependency evaluation before adoption — see [Concise Guide for Evaluating Open Source Software](#openssf-concise-guide-for-evaluating-open-source-software).
- Dependabot/GitLab dependency scanning for known-vuln monitoring. *(model knows this)*
- Improve/track the project's own OpenSSF Scorecard score — see [Scorecard checks](#openssf-scorecard-checks); directly actionable for this fleet's published packages.
- Sign releases (Sigstore/cosign) — ties to npm provenance for the published library.
- Publish an SBOM (SPDX/CycloneDX) — `@cyclonedx/cyclonedx-npm` tool named explicitly for npm.
- **Prefer memory-safe languages** and **source packages contain only VCS content** (no pre-generated files in what you publish) — the second item is the generic form of the fleet's own `dist/` drift concern for its GitHub Action; see [GitHub Actions hardening](#github-actions-hardening).
- **Load assets only from controlled domains** — relevant to the SPA shapes' CSP/`script-src` posture, see [Browser output encoding](#browser-output-encoding).

### OpenSSF Concise Guide for Evaluating Open Source Software

Source: [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html) — fetched in full (36-item checklist), grouped:

- **Necessity & authenticity**: can the dependency be avoided; confirm it's the real project (not a fork/typosquat) by name, repo links, foundation affiliation, creation date, popularity.
- **Maintenance signals**: commit activity and last release within 12 months, multiple maintainers across organizations, version stability (flag bare `0.x`/alpha/beta).
- **Security practice signals**: OpenSSF Best Practices badge, Scorecard score, deps.dev score, existing security audits, documented vulnerability-response process/timeliness, LTS support.
- **Interface/default-security signals**: secure-by-default configuration, stable/versioned API, documented secure-usage guidance, a vulnerability-reporting channel.
- **Adoption/licensing**: OSI-approved license fit, adoption level as a scrutiny proxy, name-similarity check against a more-popular package (typosquat direction), actual problem-fit over hype.
- **Hands-on vetting** (highest-effort, reserve for high-risk/high-privilege dependencies): read install scripts for exfiltration/obfuscation, sandbox-run the package, review source for input validation/parameterization evidence, run its own test suite.

This is the fullest "how to vet a new dependency" checklist in the corpus and maps directly onto a PR-review step for `package.json` diffs adding a new dependency.

### OpenSSF npm best practices guide

Source: [ossf/package-manager-best-practices — npm.md](https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md) (35-item checklist; most CI/lockfile items overlap the OWASP NPM cheat sheet above — only the non-overlapping, TS/Node-fleet-relevant items below).

- **CI least privilege**: `permissions: contents: read` at workflow level, elevate per-job only as needed — ties directly into [GitHub Actions hardening](#github-actions-hardening).
- **Library vs. CLI vs. application lockfile policy differs by artifact type** — this is the sharpest, most fleet-relevant distinction in the guide:
  - *Libraries* (the fleet's published ESM package) should **ignore the lockfile in CI tests** (`npm install --no-package-lock`) to exercise the real semver range consumers will resolve, and should **never publish `npm-shrinkwrap.json`** — it would freeze consumers' resolution.
  - *Applications* (the SPA repos, the monorepo's app targets) **should commit and use the lockfile** (`package-lock.json`), always installed via `npm ci`.
  - *CLIs* (the fleet's commander CLI) sit in between: a standalone CLI *may* publish `npm-shrinkwrap.json` for reproducible installs, but not if it's also consumed as a library dependency elsewhere.
  - Check: which `npm install`/`npm ci` variant and lockfile-commit status a repo uses should match its artifact type — a mismatch (e.g., the published library's CI trusting its own narrow lockfile instead of testing the semver range) is a real, checkable finding.
- **Remove unused dependencies** — `npm prune`. *(model knows the concept; the specific command is minor.)*
- **CIDR-scoped automation tokens** for CI publish credentials, on top of using an automation token at all. *(the CIDR-scoping specifically is not common knowledge.)*
- **Own the scope/org name on the public registry** even for packages never meant to be public, specifically to prevent name-hijacking of an otherwise-private `@scope`.
- **Private registry immutability**: if the fleet ever uses a private/internal registry, it must not silently fall back to the public registry for a removed/missing package, and must not merge manifests from upstream — both are name-hijack vectors; a misconfigured private registry should fail loudly (404), not resolve quietly to something else.

### OpenSSF Scorecard checks

Source: [scorecard/docs/checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md).

Full list with risk tier; the ones with a `*` are directly actionable from this repo's own config/workflows rather than needing org-level changes:

| Check | Risk | Note |
|---|---|---|
| Dangerous-Workflow* | Critical | Overlaps directly with [GitHub Actions hardening](#github-actions-hardening) items (script injection, `pull_request_target` misuse). |
| Webhooks | Critical | Org/repo-admin setting, not code-review. |
| Binary-Artifacts* | High | Relevant to the committed `dist/` question for the GitHub Action — a *compiled* artifact is fine if source-verifiable and rebuildable (see `check-dist.yml` pattern); an opaque binary is not. |
| Branch-Protection | High | Repo setting. |
| Code-Review | High | Repo/process setting. |
| Dependency-Update-Tool* | High | Detects Dependabot/Renovate presence — directly checkable: `test -f .github/dependabot.yml -o -f renovate.json*`. |
| Maintained | High | Project-level, not per-PR. |
| Signed-Releases* | High | Ties to npm provenance/trusted publishing for the published library. |
| Token-Permissions* | High | Directly the `permissions:` block check in every workflow file. |
| Vulnerabilities* | High | `npm audit` / OSV, same control as elsewhere in this doc. |
| Fuzzing | Medium | Low priority for this fleet's shape (no parser/binary-format surface stated). |
| Packaging | Medium | Whether the project publishes packages via a recognized flow (npm publish workflow) — relevant to the library and CLI. |
| Pinned-Dependencies* | Medium | Both npm deps (lockfile) and, separately, GitHub Actions pinned to commit SHA — two different meanings of "pinned" under one check name; don't conflate them in the rule text. |
| SAST | Medium | CodeQL or equivalent enabled. |
| SBOM | Medium | Ties to the SBOM item above. |
| Security-Policy* | Medium | `SECURITY.md` presence, same as the OWASP NPM cheat sheet item. |
| CI-Tests | Low | Tests run before merge. |
| CII-Best-Practices | Low | OpenSSF Best Practices badge. |
| Contributors | Low | Org-diversity signal, not actionable per-PR. |
| License* | Low | Published license file presence. |

### Input validation at the trust boundary

- **Standard Schema** ([standard-schema/standard-schema](https://github.com/standard-schema/standard-schema)) — a ~60-line TypeScript interface (`StandardSchemaV1`), not a validator itself. `validate(value: unknown, options?) => Result<Output> | Promise<Result<Output>>`. Zod, Valibot, ArkType and others implement it; a library that accepts `StandardSchemaV1` supports all of them with zero adapters. TS-specific move for this fleet: shared validation-accepting helpers (CLI-option parsing, RPC-input helpers used across the monorepo) should type against `StandardSchemaV1`, not against one library's own schema type, if they need to stay validator-agnostic.
- **Zod** ([zod.dev](https://zod.dev/)) — `.parse()` throws on invalid input, `.safeParse()` returns a `Result`-shaped value instead of throwing; both turn `unknown` into a statically-inferred typed value. Any `JSON.parse()` output, `fetch()` response body, `process.env` read, or CLI-arg value should pass through one of these before being treated as typed data. Check: grep for `as <Type>` casts immediately after `JSON.parse(`, `.env[`, `fetch(...).json()` — a strong signal validation was skipped in favor of an unchecked assertion. *(model knows Zod exists; the `.parse` vs `.safeParse` throw/no-throw distinction and the "cast after parse = validation skipped" grep are the concrete, checkable parts.)*
- **Ajv** ([ajv.js.org — TypeScript guide](https://ajv.js.org/guide/typescript.html)) — compiled validators act as TypeScript type guards, narrowing `unknown` to a typed interface on success; pairs with `JSONSchemaType<T>`/`JTDSchemaType<T>` to derive the schema from (or generate types from) a single source of truth. Relevant where the fleet already has JSON Schema (e.g. RPC/tool-definition schemas) rather than hand-writing a second Zod schema for the same shape.
- **Valibot / TypeBox** — not independently fetched (npm-registry/ecosystem pages, not primary "official guidance" pages); noted from Standard Schema's own adopter list and general ecosystem knowledge as the modular/small-bundle option (Valibot) and the JSON-Schema-native option (TypeBox, useful when the schema itself must be portable to non-TS consumers). *(model knows these libraries exist; the trust-boundary framing above is the checkable content — which library is a fleet choice, not something this scout should resolve.)*
- **The core rule, stated once for a checklist**: a parsed `unknown` (env var, CLI arg, fetch response, IPC/RPC message, `JSON.parse` result) must be validated by one of these before it is treated as typed data; a bare type annotation or `as` cast on unchecked external input is not validation and the type system will not catch the gap. *(model knows the general principle; the specific grep — casts right after known untrusted-input sources — is the enforceable part.)*

### Safe-by-construction Node APIs

Fetched directly from `nodejs.org/api/*` — see per-API notes in the [Safe-by-construction table](#safe-by-construction-table) below for the mechanical greps. Key official-doc quotes:

- **`child_process`**: `execFile()`/`spawn()` do not spawn a shell by default and take an argv array. Both `exec()` and `spawn()`/`execFile()` with `shell: true` carry the identical explicit warning in Node's own docs: *"Never pass unsanitized user input to this function. Any input containing shell metacharacters may be used to trigger arbitrary command execution."* [Node docs](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback)
- **`path.isAbsolute()`**: Node's own docs state it is *"not safe for mitigating path traversals."* `path.resolve()`'s docs give no traversal guidance at all — the resolve-then-containment-check pattern is not documented anywhere in the API reference and must be applied as outside knowledge. [Node docs](https://nodejs.org/api/path.html)
- **`structuredClone()`**: global WHATWG-standard deep clone (Node >=17), preserves `Date`, `Map`, `Set`, `TypedArray`, `RegExp` — types that `JSON.parse(JSON.stringify())` silently drops or corrupts, without resorting to `eval`-based clone libraries. [Node docs](https://nodejs.org/api/globals.html#structuredclonevalue)
- **`crypto.randomUUID()` / `crypto.getRandomValues()`**: cryptographically secure; the doc split is UUID identifiers vs. arbitrary random byte buffers (tokens/keys). `Math.random()` is implicitly excluded from any security-sensitive identifier/token use — not cryptographically secure. [Node docs](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions)
- **`fs/promises`**: `readFile()` returns a `Buffer` unless `encoding` is explicitly passed; `writeFile()` has the same implicit-encoding gap. [Node docs](https://nodejs.org/api/fs.html#promises-api)
- **`Object.create(null)` / `Map`** for wire-controlled keys — covered under [Prototype Pollution Prevention](#owasp-prototype-pollution-prevention-cheat-sheet) above.

### Regular-expression safety

- **`eslint-plugin-security`** ([eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)) — `detect-unsafe-regex` (known-bad literal patterns via a signatures database), `detect-non-literal-regexp` (flags `new RegExp(variable)` built from non-literal, potentially-untrusted input). Both are part of the plugin's `recommended` config.
- **`eslint-plugin-regexp`** ([ota-meshi.github.io/eslint-plugin-regexp](https://ota-meshi.github.io/eslint-plugin-regexp/rules/)) — structural backtracking analysis independent of input source: `no-super-linear-backtracking` (exponential/polynomial backtracking shapes), `no-super-linear-move` (quadratic-move quantifier patterns), plus supporting hygiene rules `no-unused-capturing-group`, `optimal-quantifier-concatenation`, `optimal-lookaround-quantifier`.
- **The two plugins are complementary, not redundant**: `eslint-plugin-security` mostly cares *where the regex source comes from* (dynamic/untrusted), `eslint-plugin-regexp` cares *whether the pattern itself is structurally vulnerable* regardless of source — a literal regex hand-written by the fleet's own developer can still be catastrophic, and only the second plugin catches that case.
- **Safe alternative pattern**: prefer well-tested, narrowly-scoped literal regexes; for user-facing pattern matching (e.g. search/filter features), consider a non-backtracking engine or explicit length/complexity caps rather than trusting lint alone to catch every case — a review heuristic beyond what either plugin mechanically enforces.

### Browser output encoding

- **React** ([react.dev — dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)) — exact doc warning: *"This is dangerous. As with the underlying DOM `innerHTML` property, you must exercise extreme caution! Unless the markup is coming from a completely trusted source, it is trivial to introduce an XSS vulnerability this way."* Requires the `{ __html: ... }` object shape (a deliberate friction point, per React's own design rationale). **React's docs name no sanitizer** — sanitization strategy and placement are left entirely to the app. Check: `grep -rn "dangerouslySetInnerHTML" src/` and manually verify a sanitizer (e.g. DOMPurify) sits between the untrusted source and the prop. `eslint-plugin-react`'s `no-danger` rule flags all uses but is **not** in React's own recommended config — must be opted in.
- **Vue** ([vuejs.org/guide/best-practices/security](https://vuejs.org/guide/best-practices/security.html)) — auto-escapes `{{ }}` interpolation and `:attr` bindings by default; `v-html` renders raw, unescaped HTML and Vue's own guide explicitly names **DOMPurify** for content that isn't fully trusted. Separately flags **URL injection** (`:href="userProvidedUrl"`) as its own, non-HTML-injection risk needing backend-side sanitization or a URL-specific sanitizer (`@braintree/sanitize-url`), and **style injection** (`:style` bound wholesale to user input) as a clickjacking vector — restrict to specific properties, never bind an entire user-controlled style object. Also: never compile a user-provided string as a template (`template: userString`) — arbitrary expression execution, not just markup injection. `vue/no-v-html` is **on by default** in `eslint-plugin-vue`'s recommended config (asymmetric with React's opt-in `no-danger`, per Summary).
- **DOMPurify** ([cure53/DOMPurify](https://github.com/cure53/DOMPurify)) — sanitizes HTML/SVG/MathML before it reaches `innerHTML`/`dangerouslySetInnerHTML`/`v-html`. Explicit warning: sanitizing first and then further modifying the output can void the sanitization — sanitize as the last step before insertion, not earlier in a pipeline. `RETURN_TRUSTED_TYPE` option integrates with the browser Trusted Types API where available; `ALLOWED_TAGS` narrows the allow-list below DOMPurify's own safe default set.
- **Content-Security-Policy** ([MDN CSP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)) — for this fleet's Vite-built SPAs: `script-src`/`style-src`/`default-src` are the load-bearing directives; `'unsafe-inline'` and `'unsafe-eval'` both defeat most of CSP's XSS protection and should not appear in a production policy. Nonce- or hash-based `script-src` (with `'strict-dynamic'`) is MDN's own recommended strict pattern over broad allowlists. **Delivery-method gap specific to a static SPA**: HTTP-header delivery supports the full directive set (including `report-uri`/`frame-ancestors`); `<meta http-equiv="Content-Security-Policy">` — the only option with no controllable server — does **not** support those directives. State this gap explicitly in any CSP checklist item for the Vite SPAs rather than treating meta-tag CSP as equivalent to header CSP. *(model knows CSP exists broadly; the meta-tag directive gap and the nonce/`strict-dynamic` recommendation over broad allowlisting are the less-known, checkable specifics.)*

### Supply-chain hygiene (registries' own docs)

State as of 2026-08-29 — flagged per the brief as an area that changed recently:

- **npm provenance** ([docs.npmjs.com — generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/)) — publishing via trusted publishing (OIDC) from GitHub Actions or GitLab CI/CD now generates provenance attestations **automatically**, no `--provenance` flag needed, and eliminates long-lived npm tokens in CI entirely. Provenance is a verifiable, Sigstore-signed link between the published version, the exact source commit, and the build system — **not** an assertion the code is free of malicious content; it's a "you can now go audit this" link, not a clean bill of health. Gap: provenance generation is not supported for CircleCI-based trusted publishing as of this writing.
- **`npm audit signatures`** ([docs.npmjs.com — npm-audit](https://docs.npmjs.com/cli/v11/commands/npm-audit)) — verifies registry-level ECDSA signatures and provenance attestations on already-downloaded packages (tamper/integrity check), distinct from `npm audit`'s known-vulnerability scan. Requires npm >=8.15.0. Both should run in CI; they check different things and neither substitutes for the other.
- **`min-release-age` / cooldown** ([Renovate docs](https://docs.renovatebot.com/key-concepts/minimum-release-age/), corroborated across npm/pnpm/Yarn/Bun) — delays a freshly-published version from being installable/suggested for a configured window, reducing exposure to malicious packages that rely on being consumed before takedown. npm's own CLI flag landed in 11.10.0 (Feb 2026) as `min-release-age`; Renovate's `minimumReleaseAge` (PR-gating, default strict — no PR opens until the timestamp requirement is met, security updates exempted) is a different layer from the package manager's own install-time cooldown — a fleet can and arguably should set both. Naming varies by tool: `min-release-age` (npm), `minimumReleaseAge` (pnpm, Renovate), Bun and Yarn have their own flag names — check each tool's own config file, don't assume one setting propagates.
- **`ignore-scripts`** ([docs.npmjs.com — config](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts)) — `.npmrc` `ignore-scripts=true` or `npm install --ignore-scripts`; default is `false`. Documented gap (see Summary): `npm start`/`test`/`run-script` still run their *named* script under this setting, only pre/post hooks are suppressed — a checklist claiming "scripts disabled" needs this caveat attached.
- **`packageManager` field / Corepack** — the field itself is unaffected and remains the pinning source of truth (name + version + optional integrity hash). Corepack's *distribution* changed: Node's TSC voted to stop bundling it starting Node 25+; it remains bundled through Node 24 LTS, and is independently installable (`npm install -g corepack`) for newer runtimes. For this fleet's Bun-run GitHub Action specifically, Corepack/`packageManager` is moot — Bun has its own lockfile/manager, not npm/Yarn/pnpm-via-Corepack.
- **Dependabot / Renovate conventions** — the OpenSSF npm guide names both as acceptable automated-update tools; current-state advice (from Renovate's own docs, corroborated by multiple 2026 comparison sources rather than one primary doc) is to set an explicit `timezone`/`schedule`/PR-limit rather than relying on defaults (unscheduled PRs cause notification fatigue), and to use `packageRules`/`groups` to collapse related updates into single PRs. *(Renovate's own minimumReleaseAge doc is primary; the scheduling/grouping best-practice framing above is aggregated from secondary comparison sources, not a single official page — flag as lower-confidence than the rest of this section.)*

### GitHub Actions hardening

Source: [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions), [events that trigger workflows — pull_request_target](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target), [actions/typescript-action check-dist.yml](https://github.com/actions/typescript-action/blob/main/.github/workflows/check-dist.yml).

- **Pin third-party actions to a full-length commit SHA** — GitHub's own docs: *"pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release."* Check: `grep -E "uses:\s*[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+@[a-f0-9]{40}"` against `uses:` lines that reference a tag/branch instead. *(model knows "pin your actions" generically; the SHA-specifically-not-tag distinction and the exact regex are the enforceable part.)*
- **`GITHUB_TOKEN` least privilege** — set `permissions: contents: read` at workflow level, elevate per-job only where needed. Check: every workflow file has a top-level `permissions:` block; no job silently inherits a broader-than-needed default.
- **Script injection into `run:` blocks** — three tiers, in preference order: (1) use an action instead of an inline script wherever possible; (2) if inline is required, pass the `${{ }}` expression through an intermediate `env:` variable rather than interpolating directly into the shell string; (3) double-quote shell variables. Check: `grep -rn 'run:.*\${{' .github/workflows/` for any `run:` block that interpolates a `${{ }}` expression directly rather than via `env:` — highest-priority pattern is attacker-controlled fields (`github.event.pull_request.title/body`, issue/comment bodies, branch names).
- **`pull_request_target` / `workflow_run`** — GitHub's own docs run *in the context of the base repository* with elevated privileges/secrets, unlike `pull_request`. Legitimate uses exist (labeling/commenting on fork PRs); the actual rule is narrower than "avoid it": **never explicitly check out the PR head ref** under this trigger without additional isolation, since that pulls untrusted fork code into a privileged execution context. Check: any workflow with `on: pull_request_target` combined with `actions/checkout` using `ref: ${{ github.event.pull_request.head.sha }}` (or similar) and no further sandboxing is a finding.
- **Third-party action vetting** — a compromised action has access to every secret configured for that job. Prefer "Verified creator" actions; audit source for unexpected credential handling/logging before adopting a new one, in addition to SHA-pinning.
- **OIDC for cloud credentials** — replaces long-lived cloud secrets with short-lived tokens via `ACTIONS_ID_TOKEN_REQUEST_URL`/`ACTIONS_ID_TOKEN_REQUEST_TOKEN`. Check: `grep -E "(AWS_|AZURE_|GCP_).*SECRET" .github/workflows/` as a signal long-lived cloud creds may still be in use where OIDC would apply.
- **Self-hosted runners** — never for public repos without ephemeral/JIT isolation; a persistent self-hosted runner can be compromised across jobs. Not directly relevant unless the fleet adopts self-hosted runners — flag as low priority absent evidence of that.
- **Committed `dist/` drift (Bun Action-specific)** — `actions/typescript-action`'s reference workflow: remove `dist/`, reinstall, rebuild (`npm ci && npm run bundle`), then `git diff --ignore-space-at-eol --text dist/` must produce no diff; on failure it uploads the freshly-built `dist/` as an artifact for the developer to reconcile. Directly portable to this fleet's Bun-run Action with `bun install`/`bun run build` substituted for the npm verbs. This is also the concrete, checkable form of OpenSSF's generic "source packages should contain only VCS content" item and Scorecard's `Binary-Artifacts` check.
- **Dependabot / dependency-review-action for workflow files themselves** — Dependabot tracks semver-tagged action versions but does **not** monitor SHA-pinned actions for updates; a `dependency-review-action` gate on PRs touching `.github/workflows/` is the complementary control GitHub's own guide names.

### VS Code extension guidance

Source: [Workspace Trust Extension Guide](https://code.visualstudio.com/api/extension-guides/workspace-trust).

- **Declare trust support in `package.json`** via `capabilities.untrustedWorkspaces.supported`: `true` (fully works in Restricted Mode, no trust needed — extension must genuinely execute no workspace-provided code), `false` (extension stays deactivated entirely until trust is granted), or `'limited'` (activates always, but gates specific trust-sensitive features behind the `isTrusted` check below; must also list any vulnerable settings in `restrictedConfigurations`, which VS Code then automatically serves only the user-level value for in Restricted Mode).
- **Runtime check**: `vscode.workspace.isTrusted: boolean` plus the `onDidGrantWorkspaceTrust` event to re-enable gated features once trust arrives later in the session.
- **What "must not do before trust" concretely means**: no loading/executing workspace-provided Node modules, no executing JavaScript or other config files that could control extension behavior, no acting on workspace-defined settings that could serve as an attack vector before the trust check.
- **UI-level gating**: the `isWorkspaceTrusted` context key in `when` clauses, to hide commands/menu items tied to gated functionality in Restricted Mode.
- **The checkable finding is a cross-reference, not a single grep**: an extension declaring `untrustedWorkspaces.supported: true` while its activation path (or code reachable before any `isTrusted` check) reads workspace config files, spawns a child process using a workspace-provided path/command, or `require()`s a module resolved from the open workspace is misrepresenting its own manifest — review the activation function against the declared capability, not just the manifest in isolation.

## Safe-by-construction table

| Risky API | Safe replacement | Why the swap removes the whole class | Grep that finds the risky form |
|---|---|---|---|
| `child_process.exec(cmdString)` | `child_process.execFile(file, argsArray)` / `spawn(file, argsArray)` (no `shell: true`) | No shell is invoked, so shell metacharacters in an argument can't be reinterpreted — argv array vs. concatenated string is the entire vulnerability class. | `grep -rn "\.exec(\`\|\.exec('" src/` and any `exec(`/`spawn(` call with `shell: true` |
| `spawn(cmd, args, { shell: true })` with untrusted `args`/`cmd` | `spawn(file, argsArray)` without `shell: true` | Same as above — Node's own docs give the identical "never pass unsanitized user input" warning for this form. | `grep -rn "shell:\s*true" src/` |
| `eval(str)` / `new Function(str)` | A parser/validator specific to the data (JSON.parse + schema, or a real expression evaluator library) | Removes arbitrary code execution from untrusted strings entirely, rather than trying to sanitize them. | `grep -rn "eval(\|new Function(" src/` |
| Hand-rolled deep clone (`JSON.parse(JSON.stringify(x))` or a recursive custom cloner) | `structuredClone(x)` | Built-in, standards-based, correctly preserves `Date`/`Map`/`Set`/`RegExp`/`TypedArray`; no `eval`/reflection-based cloning needed. | `grep -rn "JSON.parse(JSON.stringify(" src/` |
| `Math.random()` for a token/session-id/UUID | `crypto.randomUUID()` / `crypto.getRandomValues()` | Cryptographically secure PRNG vs. a non-cryptographic one — the former is predictable/seedable, the latter is not. | `grep -rn "Math.random()" src/` then filter for identifier/token/session context |
| Plain object literal as an externally-keyed lookup table (`const map = {}`) | `new Map()` / `new Set()` | No `__proto__`/`constructor` prototype-chain surface to pollute; `Map`/`Set` keys never touch the object prototype. | Review heuristic — object literal populated from request/CLI/RPC input used as a dictionary |
| `{}` / `new Object()` when the object must stay plain-object-shaped but holds external keys | `Object.create(null)` or `{ __proto__: null, ... }` | No inherited prototype at all, so `__proto__`/`constructor.prototype` writes have nothing to pollute. | Review heuristic (see Prototype Pollution section for ordering/caveats) |
| `key in obj` / `obj[key]` on an object built by merging untrusted input | `Object.hasOwn(obj, key)` before access | Skips inherited (possibly polluted) prototype properties; only sees the object's own keys. | `grep -rn "in obj\|obj\[" src/` near merge/assign logic — heuristic, not a clean grep |
| `===`/`==` comparing a secret/token/signature against user input | `crypto.timingSafeEqual(a, b)` | Constant-time comparison; `===` short-circuits on first mismatched byte, leaking timing information about how much of the secret was guessed correctly. | Review heuristic — comparisons involving vars named/typed `token`/`secret`/`signature`/`hmac`/`apiKey` |
| `new RegExp(untrustedString)` | Fixed literal regex, or explicit input-length/complexity caps before constructing dynamically | Removes attacker control over the pattern itself, which is the precondition for a ReDoS attack via pattern injection. | `eslint-plugin-security`'s `detect-non-literal-regexp` |
| A regex literal with nested quantifiers over overlapping character classes (e.g. `/(a+)+b/`) | Rewrite to a non-backtracking-prone shape (possessive-style, atomic grouping via lookahead trick, or split into simpler alternation) | Removes the exponential/polynomial backtracking shape itself, regardless of where the pattern came from. | `eslint-plugin-regexp`'s `no-super-linear-backtracking` / `no-super-linear-move` |
| `path.join(root, userSuppliedSegment)` used directly as a filesystem path | `path.resolve(root, userSuppliedSegment)` **then verify the result starts with `root + path.sep`** before use | `resolve()` collapses `..`/absolute-path tricks into a final path you can then contain-check; `join()` alone does not stop traversal, and neither does `path.isAbsolute()` per Node's own docs. | Review heuristic — any `path.join`/`path.resolve` fed a request param, CLI arg, or archive-entry name with no subsequent containment check |
| `readFile(path, callback)` / `fsPromises.readFile(path)` with no `encoding` | `readFile(path, { encoding: 'utf8' })` (or `'utf8'` shorthand) | Without it you silently get a `Buffer`, not a string — a correctness/consistency gap that also affects any downstream text-safety assumption (e.g. sanitizing what you assumed was already a string). | `grep -rn "readFile(" src/` then check for a nearby `encoding`/`'utf8'` option |
| `dangerouslySetInnerHTML={{ __html: untrustedString }}` with no sanitizer in the pipeline | Sanitize with DOMPurify immediately before setting, e.g. `{ __html: DOMPurify.sanitize(untrustedString) }` | Strips dangerous elements/attributes/event handlers before the browser ever parses the string as HTML. | `grep -rn "dangerouslySetInnerHTML" src/` — manually verify a sanitizer sits between source and prop |
| `v-html="untrustedString"` with no sanitizer | `v-html="DOMPurify.sanitize(untrustedString)"`, or avoid `v-html` for anything not fully trusted | Same mechanism as the React row; Vue's own security guide names DOMPurify explicitly. | `eslint-plugin-vue`'s `vue/no-v-html` (on by default in recommended config) |
| `:href="userProvidedUrl"` with no scheme/allowlist check | Validate against an allowlisted scheme (`http:`/`https:`) or sanitize with `@braintree/sanitize-url` before binding | Blocks `javascript:`-scheme and similar URL-based script execution that HTML-escaping alone doesn't catch (it's not an HTML-injection problem). | Review heuristic — any `:href`/`href=` bound to user-controlled data with no scheme check |
| `:style="userProvidedStyleObject"` (whole object) | Bind only specific, individually-validated CSS properties (`:style="{ color: safeColor }"`) | Prevents attacker-controlled `position`/`opacity`/`z-index` combinations used for clickjacking-style UI redress. | Review heuristic — `:style` bound to an entire externally-sourced object rather than individual properties |
| CSP with `'unsafe-inline'` / `'unsafe-eval'` in `script-src` | Nonce- or hash-based `script-src` (+ `'strict-dynamic'`) | Removes the most common XSS execution vector (inline script/handler injection) instead of allowlisting around it. | `grep -rn "unsafe-inline\|unsafe-eval" .` in CSP config/headers/meta tags |
| GitHub Actions `uses: org/action@v3` (tag/branch) for a third-party action | `uses: org/action@<full 40-char commit SHA>` | Tags/branches are mutable; only a commit SHA is an immutable reference to reviewed code. | `grep -rE "uses:\s*[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+@(v[0-9]|main|master)" .github/workflows/` |
| `run: echo "${{ github.event.pull_request.title }}"` (direct interpolation) | `env: TITLE: ${{ github.event.pull_request.title }}` then `run: echo "$TITLE"` | The expression is substituted as an environment variable's *value*, not spliced into the shell command text, so it can't be parsed as shell syntax. | `grep -rn 'run:.*\${{' .github/workflows/` |
| `npm install` in CI | `npm ci` | Fails fast on a lockfile/manifest mismatch instead of silently re-resolving and potentially drifting from what was reviewed/audited. | `grep -rn "npm install" .github/workflows/` (outside a one-off local-dev doc) |
| No `.npmrc` script policy | `.npmrc` with `ignore-scripts=true` (plus an explicit allowlist tool like `@lavamoat/allow-scripts` if some scripts are genuinely required) | Removes arbitrary install-time code execution from the default `npm install` path — the single largest npm supply-chain attack vector. | `test -f .npmrc && grep -q "ignore-scripts=true" .npmrc` |

## Candidate topics

| Topic | Why it matters | Source | Already-covered? | Priority | Enforceable by |
|---|---|---|---|---|---|
| `execFile`/`spawn` argv-array over shell-string `exec` | Removes shell-injection class entirely for this fleet's CLI (spawns subprocesses) and GitHub Action | Node docs | no | high | grep (`shell:\s*true`, `\.exec(`) |
| Timing-safe secret comparison (`crypto.timingSafeEqual`) | Named, specific API; narrow greppable pattern | nodejs.org best practices | no | med | review heuristic / grep near secret-typed vars |
| Prototype-pollution graduated mitigation (Map/Set → `Object.create(null)` → freeze) | Ordering matters (compat risk), not just "use one fix" | OWASP Prototype Pollution CS | partial (generic PP known; ordering/caveats not) | high | review heuristic + `--disable-proto` flag check |
| `ignore-scripts` lifecycle-script gap (`npm start`/`test` still run) | Common misconfiguration: reviewer trusts a flag that doesn't cover everything | npm docs, OWASP NPM CS | no | high | `.npmrc` grep + caveat noted in rule text |
| `min-release-age` / cooldown across npm/pnpm/Yarn/Bun | New (2025-2026) install-time control, tool-name varies | npm/Renovate docs, Socket.dev | no | med | per-tool config file grep |
| npm provenance vs. `npm audit signatures` — two different guarantees | Easy to conflate; fleet publishes a package so both apply | npm docs | no | high | CI step running `npm audit signatures`; publish workflow using trusted publishing |
| Standard Schema for validator-agnostic shared helpers | TS-specific composition pattern, not just "pick a validator" | standard-schema.dev/GitHub | no | med | type-check: shared helper accepts `StandardSchemaV1` |
| Cast-after-parse anti-pattern (`JSON.parse(...) as T`) | Silent validation-skip; type system gives no signal | Zod/Ajv docs | partial (generic "validate input" known; this specific grep is not) | high | grep for `as <Type>` after `JSON.parse(`/`.env[`/`fetch(...).json()` |
| `fs/promises` missing-encoding Buffer gap | Correctness + security-adjacent (mismatched string assumptions) | Node docs | no | med | grep `readFile(` without nearby `encoding` |
| `path.resolve` + containment check (no built-in traversal guard) | Node docs explicitly disclaim `path.isAbsolute()` for this; no documented safe pattern exists | Node docs | no | high | review heuristic (no clean grep) |
| ReDoS: `eslint-plugin-security` vs `eslint-plugin-regexp` (source vs. structure) | Two plugins, neither subsumes the other | eslint-plugin-security/-regexp | no | high | lint config check (both plugins enabled) |
| `dangerouslySetInnerHTML` — no default lint, no named sanitizer in React docs | Asymmetric with Vue; easy to assume React's docs endorse a sanitizer (they don't) | react.dev | partial (XSS-via-innerHTML generically known) | high | grep + `eslint-plugin-react`'s `no-danger` (opt-in) |
| `v-html` — DOMPurify named explicitly, `no-v-html` on by default | Concrete, already-enforced-by-default in Vue tooling | vuejs.org, eslint-plugin-vue | partial | high | `vue/no-v-html` in lint config |
| `:href`/`:style` binding risks distinct from HTML injection | Non-obvious: not an innerHTML problem, needs its own control | vuejs.org | no | med | review heuristic |
| CSP meta-tag delivery gap for static Vite SPAs | No controllable server → meta tag is the only option → known directive gap (`report-uri`, `frame-ancestors`) | MDN CSP | no | med | review heuristic (delivery-method-aware CSP check) |
| GitHub Actions: pin third-party actions to commit SHA | Tags/branches mutable; only SHA is immutable | GitHub docs | no | high | grep (`uses:.*@(v[0-9]\|main\|master)`) |
| `GITHUB_TOKEN` least privilege (`permissions:` block) | Default token is broader than most jobs need | GitHub docs | no | high | grep for missing top-level `permissions:` |
| Script injection via `${{ }}` in `run:` blocks | Three-tier mitigation (action > env var > quoting); common real-world CI vuln | GitHub docs | no | high | grep `run:.*\${{` |
| `pull_request_target` + explicit checkout of PR head | Nuanced: not "avoid the trigger," but "never checkout untrusted ref under it" | GitHub docs | no | high | grep for trigger + checkout ref pattern |
| Committed `dist/` drift check for the Bun GitHub Action | Concrete reference implementation exists (`check-dist.yml`), directly portable | actions/typescript-action | no | high | CI job: rebuild + `git diff --exit-code dist/` |
| Dependabot/dependency-review-action doesn't track SHA-pinned actions | Coverage gap once you adopt SHA-pinning (the recommended practice) | GitHub docs | no | med | `dependency-review-action` on workflow-file PRs |
| Library vs. CLI vs. app lockfile policy (fleet has all three shapes) | Sharpest fleet-specific distinction in the corpus — wrong policy per artifact type is a real, checkable mismatch | OpenSSF npm best practices | no | high | review heuristic (install-command + lockfile-commit status vs. artifact type) |
| Never publish `npm-shrinkwrap.json` from the library | Would freeze consumer resolution; narrow, specific, easy to get backwards from CLI-shrinkwrap advice | OpenSSF npm best practices | no | med | `test ! -f npm-shrinkwrap.json` in the library's publish check |
| Own the `@scope` on the public registry even if never publishing there | Prevents silent name-hijack of internal packages | OpenSSF npm best practices | no | low | account-level check, not repo-level |
| `packageManager` field unaffected by Corepack bundling change | Avoid stale advice ("Corepack removed" ≠ "packageManager field deprecated") | Node TSC vote (Socket.dev), npm docs | no | med | `grep packageManager package.json` presence check |
| VS Code: manifest capability vs. activation-path code cross-check | Not a single grep — declared trust support must match what activation actually does before checking `isTrusted` | code.visualstudio.com | no | high | review heuristic (manifest + activation function) |
| OpenSSF Scorecard `Pinned-Dependencies` conflates two meanings of "pinned" | npm lockfile pinning vs. GitHub Actions SHA pinning — same check name, different artifacts, don't conflate in rule text | ossf/scorecard | no | med | n/a (documentation-precision item for the rule author) |
| SBOM generation for the published library (`@cyclonedx/cyclonedx-npm`) | Named tool, currently undecided whether fleet requires it | OWASP NPM CS, OpenSSF Concise Guide | no | low | CI step producing `sbom.json`, if adopted |
| Renovate/Dependabot explicit schedule + grouping | Prevents notification fatigue; lower-confidence (aggregated from secondary sources) | Renovate docs + secondary 2026 comparisons | no | low | config file review |
| Node permission model (`--permission`) for the CLI/Action | Restricts FS/child-process/worker access at the process level; recently stabilized | nodejs.org best practices | no | low | launch-arg check where threat model applies |
| `--frozen-intrinsics` / `Object.freeze(globalThis)` (monkey-patch defense) | Experimental flag caveat matters | nodejs.org best practices | no | low | launch-arg check, with experimental-flag caveat |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nodejs.org — Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices) | Official Node.js docs | Current (fetched 2026-08-29) | Primary, canonical Node runtime security guidance with exact flag/API names |
| [OWASP — Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) | OWASP Cheat Sheet Series | Living doc | Broadest single checklist for Node app-layer hardening, incl. headers/middleware |
| [OWASP — NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) | OWASP Cheat Sheet Series | Living doc | The npm-specific supply-chain checklist (tokens, publishing, typosquatting) |
| [OWASP — Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html) | OWASP Cheat Sheet Series | Living doc | JS-specific vulnerability class with ordered, graduated mitigations |
| [OpenSSF — Concise Guide for Developing More Secure Software](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software.html) | OpenSSF Best Practices WG | Living doc | Cross-ecosystem baseline; ties into Scorecard and SBOM/signing practice |
| [OpenSSF — Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html) | OpenSSF Best Practices WG | Living doc | Full 36-item dependency-intake checklist, directly maps to PR review of `package.json` diffs |
| [ossf/package-manager-best-practices — npm.md](https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md) | OpenSSF WG, npm-specific guide | Living doc | Sharpest library-vs-CLI-vs-app lockfile policy distinction in the corpus |
| [ossf/scorecard — checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md) | OpenSSF Scorecard project | Living doc | Canonical list of automatable supply-chain checks with risk tiers |
| [docs.npmjs.com — Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/) | npm official docs | Current | Defines what provenance is and isn't (link to source, not a malware guarantee) |
| [docs.npmjs.com — Trusted publishers](https://docs.npmjs.com/trusted-publishers/) | npm official docs | Current (2026 feature) | OIDC-based publishing, replaces long-lived CI tokens |
| [docs.npmjs.com — npm-audit](https://docs.npmjs.com/cli/v11/commands/npm-audit) | npm official CLI docs | Current | Distinguishes `npm audit` (known-vuln scan) from `npm audit signatures` (integrity) |
| [docs.npmjs.com — ignore-scripts config](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts) | npm official CLI docs | Current | Documents the lifecycle-script coverage gap most reviewers miss |
| [docs.renovatebot.com — minimumReleaseAge](https://docs.renovatebot.com/key-concepts/minimum-release-age/) | Renovate official docs | Current (2026) | Primary source for the cooldown/min-release-age mechanism and its exemptions |
| [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) | Node.js API reference | Current | Exact shell-injection warning language and execFile/exec/spawn distinction |
| [nodejs.org/api/crypto.html](https://nodejs.org/api/crypto.html) | Node.js API reference | Current | `randomUUID`/`getRandomValues` vs. `Math.random()` |
| [nodejs.org/api/path.html](https://nodejs.org/api/path.html) | Node.js API reference | Current | Explicit disclaimer that `path.isAbsolute()` doesn't mitigate traversal |
| [nodejs.org/api/globals.html#structuredclonevalue](https://nodejs.org/api/globals.html#structuredclonevalue) | Node.js API reference | Current | `structuredClone` as the safe deep-clone primitive |
| [nodejs.org/api/fs.html#promises-api](https://nodejs.org/api/fs.html#promises-api) | Node.js API reference | Current | Buffer-vs-string encoding gap in `readFile`/`writeFile` |
| [react.dev — dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) | React official docs | Current | Exact warning language; confirms React names no sanitizer itself |
| [vuejs.org — Security](https://vuejs.org/guide/best-practices/security.html) | Vue official docs | Current | Names DOMPurify explicitly; separates HTML/URL/style injection as distinct risks |
| [github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify) | DOMPurify project docs (README) | Current | Sanitizer's own placement guidance (sanitize last, not first) and config caveats |
| [developer.mozilla.org — CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) | MDN | Current | Directive reference, meta-tag delivery limitation, strict-CSP recommendation |
| [github.com/eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) | ESLint plugin docs | Current | Source-of-input-focused regex/injection lint rules |
| [ota-meshi.github.io/eslint-plugin-regexp/rules](https://ota-meshi.github.io/eslint-plugin-regexp/rules/) | ESLint plugin docs | Current | Structural-backtracking-focused regex lint rules, complements eslint-plugin-security |
| [github.com/standard-schema/standard-schema](https://github.com/standard-schema/standard-schema) | Standard Schema project (README) | Current (2025-2026 spec) | Interop interface across zod/valibot/arktype for trust-boundary validation |
| [zod.dev](https://zod.dev/) | Zod official docs | Current | `.parse`/`.safeParse` framing of untrusted-to-typed data |
| [ajv.js.org — TypeScript guide](https://ajv.js.org/guide/typescript.html) | Ajv official docs | Current | Compiled validators as TS type guards; JSON-Schema-native validation |
| [docs.github.com — Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) | GitHub official docs | Current | Canonical Actions hardening guide: SHA-pinning, permissions, script injection, OIDC |
| [docs.github.com — pull_request_target](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) | GitHub official docs | Current | Precise privilege/checkout distinction vs. `pull_request` |
| [github.com/actions/typescript-action — check-dist.yml](https://github.com/actions/typescript-action/blob/main/.github/workflows/check-dist.yml) | GitHub's own TypeScript Action template | Current | Exact, reusable `dist/` drift-check implementation |
| [code.visualstudio.com — Workspace Trust Extension Guide](https://code.visualstudio.com/api/extension-guides/workspace-trust) | VS Code official docs | Current | `untrustedWorkspaces` capability, `isTrusted` API, `restrictedConfigurations` |

Secondary/corroborating (not counted toward the primary-source minimum, used only to confirm the 2026 state of a fast-moving area): [Socket.dev — npm introduces minimumReleaseAge and bulk OIDC configuration](https://socket.dev/blog/npm-introduces-minimumreleaseage-and-bulk-oidc-configuration); [Socket.dev — Node.js TSC votes to stop distributing Corepack](https://socket.dev/blog/node-js-tsc-votes-to-stop-distributing-corepack).
