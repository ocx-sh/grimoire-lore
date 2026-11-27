---
title: nuget.org service rules and publish pipeline, delta 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 17
---

# Scope

Delta update of the baseline read on 2026-10-11 (corpus: `.agents/research/csharp-packaging/csharp-packaging-nuget-release.md`). Each claim at risk is marked unchanged, changed or could not determine. All reads were on 2026-11-27. The GitHub API hit its rate limit late in the run, so a few GitHub checks (the exact content of the image-domain list file, dotnet-validate repository commits) are missing and are listed as gaps.

## Verdict table

| Claim | Status | Evidence |
|---|---|---|
| NN 12 / CS-PKG-11: `NuGet/login@<40-hex sha>`, `user:` profile name, `id-token: write` on publish job only, `environment:` | unchanged | The Trusted Publishing page (ms.date 7/29/2026, updated_at 2026-09-01) still shows `NuGet/login@v1`, `permissions: id-token: write` on the job, `user:` as profile name and not email, and an optional environment field. The docs repository has no commit to `docs/nuget-org/` after 2026-08-24. NuGet/login latest release is still v1.2.0 (2026-04-24, commit `8d196754b4036150537f80ac539e15c2f1028841`, the SHA the corpus pins); no commit or release in the window. |
| "The temporary key lives 1 hour and is single-use" | unchanged | Same page: keys valid for 1 hour; one token yields one key. Side note: dotnet-releaser 0.24.1 (2026-11-06) fixed "NuGet trusted publishing key expiring before publication", a reminder to request the key right before the push. |
| Open question: policy scoped to a package ID that does not exist yet can publish v0.1.0 | still undecidable from documentation | The "Select Scopes" section (added 2026-08-24, before the window) says scopes decide whether publishing new packages or new versions of existing packages is allowed, with a glob pattern that targets packages. It never says a glob may match an ID that is not yet owned, nor what happens on the first push. The 2026-11-17 staged-publishing post adds that policies can be restricted to staging only, and says nothing on new IDs. Needs one live push (see Decisions). |
| Open question: prefix-reservation channel still current | unchanged, still the documented channel | The page still says to mail account@nuget.org; ms.date 2019-09-07, updated_at 2022-09-20; last docs-repo commit 2022-04-22. No newer replacement found. The page does not mention Trusted Publishing. |
| CS-PKG-12: versions immutable, no delete; `--skip-duplicate` | no change found (partly unverified) | No docs-repo commit touched `docs/nuget-org/` in the window. The policies page URL I tried returned 404, so the immutability sentence itself was not re-read. New context: staged publishing (below) lets a version be held privately before release; the post does not say whether a staged version can be replaced. Immutability of released versions is not contradicted. |
| CS-PKG-13: nuget.org countersigns every package; certificate registration forces signing | unchanged | Signed Packages reference (updated_at 2021-04-14) still says all uploads are automatically repository signed and that a signing certificate must be registered ahead of time. The staged-publishing post confirms "repository signing" runs during staged validation. A nuget.org signing-certificate blog post dated 2026-09-23 is outside the window and was not opened. |
| CS-PKG-14: readme image allow-list includes `img.shields.io`, `raw.githubusercontent.com` | unchanged for those hosts; list grew | Readme page (updated_at 2026-07-07) still lists both hosts, plus `devpod.sh` (added 2025-12-20). NuGetGallery PR #11062, merged 2026-10-29, adds `api.scorecard.dev` and `api.securityscorecards.dev` to `Trusted-Image-Domains.json` (both redirect to `img.shields.io`). The learn page does not list them yet. |
| CS-PKG-04: symbol server rejects `.symbols.nupkg`, accepts snupkg | unchanged | Snupkg page (updated_at 2026-05-05) still: "NuGet.org's symbol server only accepts the new symbol package format - .snupkg". |
| CS-PKG-01: nuget.org accepts the bare package; check for new license/readme/metadata requirement | no new requirement found | No docs-repo or blog change in the window requires license, readme or other metadata. The ID-prefix page still lists license and icon only as best practices for prefix owners. This is absence of evidence from changelogs, not a push test. |
| CS-PKG-10: dotnet-validate 0.0.1-preview.582, `package local` | unchanged | nuget.org page: latest is 0.0.1-preview.582 published 2026-02-12; no later version. Output lines were not re-measured (no new version to measure). |
| CS-PKG-08: strong naming "no benefits on .NET Core/5+" | unchanged | Page (ms.date 2026-03-23) still reads "Strong naming has no benefits on .NET Core/5+" and "not required for libraries that target .NET Core/5+ only". |
| CS-BUILD-21: `actions/setup-dotnet` with `global-json-file` | unchanged, version moved | v6.1.0 released 2026-11-03: new `check-latest`, `skip-lts-prepass` and fallback-install-directory inputs, docs on `sdk.version` validation with `rollForward`. No change to `global-json-file`. Earlier (before window): v5.4.0 (2026-06-26) made wildcard (`10.0.*`) and runtime-style `sdk.version` fail validation; v6.0.0 (2026-07-16) ESM. |
| CS-PKG-11: dotnet-releaser with `[nuget] trusted_publishing = true` | no change found; key name not re-read | Releases 0.24.1 (2026-11-06, trusted publishing key expiring before publication fixed), 0.25.0 (2026-11-11, .NET 11 SDK build fix, runs on newer runtime), 0.25.1 and 0.25.2 (2026-11-23, MSBuild target outputs fixes). No release notes rename or remove the setting. I did not open the configuration documentation. |

# Findings that are new in the window

1. **Staged publishing on nuget.org** (blog 2026-11-17 [staged-publishing post](https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/); gallery PR #11056 merged 2026-10-23). Opt-in; existing `dotnet nuget push` workflows keep working. Uploads go through validation, stay invisible to restore and search, and are promoted on the website by a 2FA-enabled authorized user. CLI: `dotnet package stage push <nupkg> --source https://api.nuget.org/v3/index.json --api-key <key> [--group <id>]`, basic support in the .NET 11 RC2 SDK. Staging-only API keys and staging-only Trusted Publishing policies exist.
2. **Image allow-list grew** (above). The corpus rule stays correct; the "SHOULD" heuristic is unaffected.
3. **setup-dotnet 6.1.0 and dotnet-releaser 0.25.x** released; neither changes a rule text.

# Decisions

- **First-publish question:** documentation does not answer it. The scope text and the staging post leave open whether a glob policy can create a new package ID. One live push of a throwaway or the real v0.1.0 (ideally via staged publishing, which can be abandoned) is still required. Keep the corpus open question open; add that scopes exist and that the page says nothing on new IDs.
- **Prefix reservation:** keep the mail channel, mark its page as dated 2022.
- **Strings to keep:** "1 hour", "single-use", profile name, environment: all still true. CS-PKG-14 may add the two scorecard hosts only after the learn page lists them (until then they are code-only, so keep the rule text as is).

# Grep impact

- `workflow-pins`: not broken. The pinned SHA `8d196754b4036150537f80ac539e15c2f1028841` is still the latest tag, and no new NuGet/login release exists.
- `push-gate`: not broken today, but a blind spot. A release using `dotnet package stage push` is not matched by a `dotnet nuget push` pattern and so prints N/A or fails the count test; `--skip-duplicate` may not apply to it. Decide whether staged publishing is allowed before adding any rule.
- `signing-gate`: not broken. No signing-flag or fingerprint change.

# Normative candidates

1. If a release uses staged publishing, the publish job still carries `needs:`, `id-token: write`, a SHA-pinned `NuGet/login` and no stored API key. Rationale: staging changes the push command, not the credential model. Verify: the `workflow-pins` greps plus `grep -nE 'dotnet (package stage|nuget) push'` on the release file. Confidence: low until the owner decides whether the push-gate should accept the new verb.
2. State that no staging flag was found on `dotnet nuget push` and that the stage verb needs a .NET 11 SDK (RC2 at the post date); a net10 `global.json` pin would not have it. Verify: `dotnet package stage --help` under the pinned SDK.

# Could not determine / gaps

- Immutability and delete sentence (policies page 404).
- Whether nuget.org now requires any metadata beyond what the corpus lists (no push test).
- The contents of the dotnet-releaser configuration reference and of NuGet/dotnet-validate repository commits (rate limit).
- Whether the 2026-09-23 signing certificate post changes CS-PKG-13 (outside window, not opened).

# Sources

| URL | What | Date read / era |
|---|---|---|
| https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing | Trusted Publishing docs | read 2026-11-27, ms.date 2026-07-29 |
| https://github.com/NuGet/docs.microsoft.com-nuget/commits (path docs/nuget-org, since 2026-10-11) | docs change log | read 2026-11-27 |
| https://github.com/NuGet/login/releases | NuGet/login releases (v1.2.0, 2026-04-24) | read 2026-11-27 |
| https://github.com/actions/setup-dotnet/releases | v6.1.0 2026-11-03 | read 2026-11-27 |
| https://github.com/xoofx/dotnet-releaser/releases | 0.24.1 to 0.25.2 | read 2026-11-27 |
| https://www.nuget.org/packages/dotnet-validate | version history | read 2026-11-27 |
| https://learn.microsoft.com/en-us/nuget/nuget-org/package-readme-on-nuget-org | readme domains | read 2026-11-27, updated 2026-07-07 |
| https://github.com/NuGet/NuGetGallery/pull/11062 | scorecard hosts added | merged 2026-10-29 |
| https://github.com/NuGet/NuGetGallery/pull/11056 | package and symbol staging | merged 2026-10-23 |
| https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/ | staged publishing announcement | 2026-11-17 |
| https://devblogs.microsoft.com/nuget/ | blog index (no TP, policy, signing or readme posts in window) | read 2026-11-27 |
| https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation | prefix reservation | updated 2022-09-20 |
| https://learn.microsoft.com/en-us/nuget/reference/signed-packages-reference | signing reference | updated 2021-04-14 |
| https://learn.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg | snupkg | updated 2026-05-05 |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/strong-naming | strong naming | ms.date 2026-03-23 |
| https://github.com/actions/setup-dotnet/releases/tag/v6.1.0 | 6.1.0 notes | 2026-11-03 |
| https://github.com/NuGet/docs.microsoft.com-nuget/commit/529631d4 | scope section added | 2026-08-24 |
