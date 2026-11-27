---
title: GitHub Actions, setup-go, golangci-lint-action, govulncheck-action and Dependabot delta (go-modules)
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 16
---

# Delta: GitHub Actions, setup-go, Dependabot (2026-09-26 to 2026-11-27)

This is a delta update. Claims not listed here stay as they are. Release dates marked "inferred" come from a GitHub releases page that shows only day and month, so the year is read from sequence; the GitHub API was rate-limited and could not confirm them.

## Per-claim verdicts

### GO-MOD-16 (setup-go, go-version-file, check-latest, aliases)

Verdict: changed in one respect (the version label), unchanged in behavior.

- The rule text cites "setup-go v6, read 2026-09-26". Current major is v7. v7.0.0 was released 2026-07-16 (inferred), which is BEFORE the baseline read date, so the baseline's "v6" was already stale. v7.1.0 was released 2026-11-17 (inferred), inside the window. Source: https://github.com/actions/setup-go/releases
- v7.0.0 notes: "Migrate to ESM and upgrade dependencies" and an `@actions/cache` bump. The README states: "No changes to action inputs, outputs, or behavior." Source: https://github.com/actions/setup-go/blob/main/README.md
- v7.1.0 (2026-11-17, inferred) adds: Go environment variables as action outputs, native Go version syntax accepted in `go-version`, and "adds rc and beta versions from the go.mod file" (#701). The last item is the only go-version-file related change: a go.mod naming a pre-release can now be resolved. It does not touch toolchain-directive precedence or patch handling.
- go-version-file semantics, current docs/advanced-usage.md: "Uses the `toolchain` directive if present, otherwise the action falls back to the `go` directive." A `go` line with a patch version installs exactly that patch ("If a patch version is specified, that specific patch version will be used"); omitting the patch searches for the latest patch. Unchanged. This toolchain behavior dates from v6.0.0 (2025-09-04).
- check-latest: default `false`; docs say it checks whether the cached version is current and downloads a newer one. No change. The docs say nothing that contradicts "cannot move an exact patch".
- Aliases: `stable` resolves to the latest stable release, `oldstable` to the latest patch of the previous minor. Unchanged.
- Caching: v6.3.0 (2026-02-26, inferred, before the window) made the default module cache key derive from go.mod. Caching default is `cache: true`. Nothing new in the window.
- Action for the file: change "setup-go v6, read 2026-09-26" to "setup-go v7, read 2026-11-27". The `uses:` examples in docs should say v7 (as a SHA with a `# v7.1.0` trailer under GO-REL-12).

Normative candidate: none to add. Verification of the label edit: `grep -rn "setup-go v6" rules skills` returns nothing after the edit.

### GO-GATE-08 (golangci-lint-action version)

Verdict: unchanged.

- No golangci-lint-action release exists after v9.3.0 (2026-06-29, inferred); the action's README still shows `golangci/golangci-lint-action@v9` and `version: v2.13` style input, no default stated, and `install-mode` defaults to `binary`. `version-file` exists since v9.2.0 and works only with `install-mode: binary`. Source: https://github.com/golangci/golangci-lint-action/releases and README.
- Side finding: v9.2.1 is noted as the "first immutable release" of the action (GitHub immutable releases are therefore in use by at least some action authors). Not a rule change.
- Caveat to the baseline wording: the README example uses a short form (`v2.13`); the rule's exact `v2.14.0` remains the stricter pin and is still valid. Whether the action's golangci-lint version list moved past v2.14.0 was not examined (outside this commission).

### GO-MOD-17 and the Dependabot open question

Verdict for the open question: could not determine from GitHub documentation; the definite answer is that GitHub documents no behavior.

- The Dependabot options reference (https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) and the supported-ecosystems page (https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories) were read in full for gomod. Neither mentions the `toolchain` directive, the `go` directive, or the `tool` directive. gomod is listed as supported for version and security updates and vendoring, not for private registries.
- Groups: the `dependency-type` group option is documented as supported by `bundler`, `composer`, `mix`, `maven`, `npm`, `pip`, not gomod. Grouping by `patterns` and `update-types` is not described for gomod specifically, so grouping a gomod block is permitted but its interaction with directive bumps is undocumented.
- Cooldown: gomod supports `default-days` and `semver-major-days`, `semver-minor-days`, `semver-patch-days`. This is useful for GO-MOD-17 as a review-time buffer (new, in the docs; date of introduction not established).
- Evidence outside docs: dependabot-core issue 7895 (closed 2023-09-18) says Dependabot sets `GOTOOLCHAIN=local` internally so a `go` line does not trigger a toolchain download; a maintainer wrote that Dependabot should handle a toolchain directive "or update the go directive", which is an expectation, not a documented feature. A separate issue reports Dependabot does not update `tool` dependencies. Sources: https://github.com/dependabot/dependabot-core/issues/7895. No GitHub changelog entry in the window concerns gomod, toolchain or go-line bumps (Dependabot changelog entries in the window: Agent Package Manager support 2026-11-03, Python 3.15 2026-11-03, alert pause on inactive repositories 2026-11-10, dismissal requests 2026-11-16).
- Conclusion for the corpus: do not claim that Dependabot opens PRs for the `toolchain` line or `go` bumps. The only supported claim is that it opens module-dependency PRs and may incidentally raise the `go` line when a dependency requires it. The `toolchain` line must therefore still be moved by the cadence step.
- GO-MOD-17 itself (grouped gomod block, human review): unchanged. Its rationale and grep stay valid.

### GO-REL-12 (SHA pinning)

Verdict: changed. The rationale sentence is no longer supported by GitHub's text, and a stronger mechanism now exists.

- Old text: "GitHub calls a full SHA the only immutable way to use an action." The current secure-use page (https://docs.github.com/en/actions/reference/security/secure-use) does not use the word "immutable" and does not call SHA the only way. It still recommends "Pin actions to a full-length commit SHA", and it now says the best measure is a workflow lockfile: "This is the strongest protection available, and supersedes SHA pinning for repositories that adopt it."
- GitHub changelog: "GitHub Actions workflow lockfiles in public preview" (2026-10-14) and "GitHub Actions workflow lockfiles are generally available" (2026-10-28), https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available. The `gh actions-lock` extension writes `.github/workflows/actions.lock`, recording commits for actions and transitive dependencies, so workflows can keep readable tag refs while running the locked commits. Admins can enforce adoption with a "Require lockfile" policy. Dependabot regenerates the lockfile entry in the same PR for an onboarded workflow, with no configuration. The page says lockfiles "don't determine whether a dependency is safe".
- No SHA-pinning enforcement policy or immutable-actions announcement was found in the window (no title in the Actions changelog matched; the secure-use page names none).
- Pin-check grep: still correct as written for repositories that pin by SHA. A lockfile-onboarded repository would legitimately contain tag refs in `uses:`, which the current `pin-check` would flag. Candidate rule change (SHOULD, needs owner decision): reword the rationale to "tags are mutable; a full SHA or an enforced workflow lockfile fixes the code that runs", and let `pin-check` pass a tag ref only when `.github/workflows/actions.lock` exists and a stale-lockfile check runs in CI. Verification: `test -f .github/workflows/actions.lock` plus the lockfile's own stale-check command (name not confirmed in the fetched pages; could not determine). Until the owner decides, keep the SHA rule and replace only the quoted sentence.
- Also relevant, and outside GO-REL-12 text: "pull_request_target blocked by default December 2" (changelog 2026-11-02) was not opened; flag for the CI-security pairs.

### GO-MOD-18 (GOPRIVATE, GOAUTH)

Verdict: unchanged. go.dev/ref/mod: "GOPRIVATE is a default value for GONOPROXY and GONOSUMDB"; GONOPROXY and GONOSUMDB default to GOPRIVATE when unset. The GOAUTH variable entry itself was in the unread tail (characters beyond 200000); the Private modules text describes GOAUTH for Go 1.24 and later. The rule's `GOAUTH=off` clause was not re-verified against the entry text: could not determine.

### govulncheck-action (not in a rule, checked as commissioned)

Verdict: unchanged. README still labels the action "currently experimental and is under active development", usage `golang/govulncheck-action@v1`, inputs include `go-version-input`, `go-version-file`, `go-package`, `work-dir`, `check-latest`, `cache`, `output-format`. The repo shows no GitHub releases; no deprecation notice. The rule corpus does not cite it, so no edit.

## Is the `go-upgrade` cadence step still needed?

Yes. Reasons: (1) Dependabot docs do not state that gomod PRs cover the `toolchain` line or `go` bumps; (2) setup-go still reads the `toolchain` line verbatim, so a stale line pins a vulnerable patch; (3) golangci-lint exact-pin bumps remain manual (the action has no auto-bump, and Dependabot's github-actions ecosystem does not touch the `version:` input). The step also needs to bump the pinned setup-go to v7.

## Sources fetched

setup-go releases, README, advanced-usage.md, v7.0.0 release page; golangci-lint-action releases and README; govulncheck-action repo page; Dependabot options reference; supported ecosystems page; dependabot-core issue 7895; GitHub secure-use page (twice); GitHub changelog index, Actions label, Dependabot label; lockfile GA and preview changelog entries; go.dev/ref/mod (two ranges).

## Not done

GitHub API release dates (rate limited), the GOAUTH variable entry, the lockfile docs page and `gh actions-lock` stale-check command, the pull_request_target change, and the Dependabot gomod behavior by experiment.
