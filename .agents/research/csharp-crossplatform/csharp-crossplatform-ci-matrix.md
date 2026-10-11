---
title: "The CI matrix that proves \"all platforms\" for a .NET library: runner labels, TFM legs, musl, caches, merge gates"
topic: csharp-crossplatform-ci-matrix
agent: deep-dive researcher (group csharp-crossplatform, "Portable code, and the proof it runs everywhere")
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-10
sources_count: 36
scope: |
  Covers the GitHub Actions matrix that turns "Windows, Linux, macOS x x64, arm64" into a tested property of a .NET 8 / .NET 10 library: runner labels current in October 2026 (and their retirement dates), the musl leg, per-TFM legs from one SDK 10 install, the NuGet cache key, fail-fast, which legs block merge and which run nightly, per-leg cost, and the reviewer checks (actionlint plus a grep script). Every command and result below was run on the pinned toolchain (SDK 10.0.401, runtimes 8.0.31 / 10.0.12), in Alpine containers (x64 native, arm64 under QEMU), or on the Windows 11 host (SDK 10.0.102).
  Does not cover: what the platform-dependent code itself must do (paths, culture, quoting: see csharp-crossplatform-paths-culture-guards), the fake-CLI test harness (csharp-crossplatform-fake-cli-harness), package signing/publishing workflows, or Azure DevOps / GitLab pipelines. macOS (arm64 and Intel) and native Windows arm64 / Linux arm64 runners are UNVERIFIED locally: no macOS host exists here, and arm64 was exercised only under QEMU emulation. Nothing was pushed and no workflow was dispatched. .NET 11 / C# 15 RC1: only the support-policy facts and the DOTNET_TEST_RUNNER note are 11-specific.
---

# The CI matrix that proves "all platforms"

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Platform coverage is a matrix property; the corpus barely gates it](#1-platform-coverage-is-a-matrix-property-the-corpus-barely-gates-it)
   2. [Runner labels as of October 2026](#2-runner-labels-as-of-october-2026)
   3. [Retirement and drift calendar](#3-retirement-and-drift-calendar)
   4. [The decided matrix: required, nightly, canary](#4-the-decided-matrix-required-nightly-canary)
   5. [Per-TFM legs from one SDK 10 install](#5-per-tfm-legs-from-one-sdk-10-install)
   6. [The musl leg: docker run, not a job container](#6-the-musl-leg-docker-run-not-a-job-container)
   7. [Legs must prove who they are](#7-legs-must-prove-who-they-are)
   8. [What a matrix catches and what a pure table already catches](#8-what-a-matrix-catches-and-what-a-pure-table-already-catches)
   9. [NuGet cache keys](#9-nuget-cache-keys)
   10. [fail-fast, timeouts, concurrency, permissions](#10-fail-fast-timeouts-concurrency-permissions)
   11. [Merge gating: one aggregate job, not N matrix names](#11-merge-gating-one-aggregate-job-not-n-matrix-names)
   12. [Cost per leg](#12-cost-per-leg)
   13. [The Python SDK anti-pattern (S5, S6)](#13-the-python-sdk-anti-pattern-s5-s6)
   14. [Linting the workflow: what actionlint knows and does not](#14-linting-the-workflow-what-actionlint-knows-and-does-not)
   15. [Verified on the toolchain](#15-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- "All platforms" is a CI-matrix property, not a TFM property: a linux-x64-only workflow passed a planted library whose PATH splitting, `.exe` suffix, arm64 detection and musl detection were all wrong (12/12 tests green, both TFMs), while the same tests failed on Windows (2 failures), Alpine x64 (1), Alpine arm64 (1) and Debian arm64 (1) (section 15).
- The required PR matrix is five native legs: `ubuntu-24.04` (linux-x64), `ubuntu-24.04-arm` (linux-arm64), `windows-2025` (win-x64), `windows-11-arm` (win-arm64), `macos-26` (osx-arm64); musl x64 and arm64 ride on the two Linux legs as a `docker run` step.
- Intel macOS still exists in October 2026 only as `macos-15-intel` and `macos-26-intel`; `macos-13` was retired 2025-12-04 and GitHub says Intel macOS ends when the macOS 15 image retires in fall 2027, so osx-x64 is a nightly leg, not a PR gate.
- Pin matrix legs to versioned labels, not `-latest`: `ubuntu-latest` moves to Ubuntu 26.04 between 2026-10-19 and 2026-11-19, `macos-latest` already moved to macOS 26 in June 2026, and `windows-11-arm` moved to the VS 2026 image in late September 2026.
- Two labels in common use are about to die: `macos-14` is fully unsupported on 2026-11-02 and `ubuntu-22.04` on 2027-04-17; actionlint 1.7.12 flags neither (it flagged `macos-13` only because that label had already been removed from its list).
- Per-TFM legs come from one SDK 10 install with `dotnet test -f net8.0` and `-f net10.0`, but only if the 8.0 runtime is present: without it the leg aborts with exit 1 ("You must install or update .NET"); with `DOTNET_ROLL_FORWARD=Major` it "passes" on the .NET 10 runtime, which is false evidence.
- Make each leg prove its identity: pass the expected target triple as `EXPECTED_TRIPLE` from the matrix and assert it, and assert `Environment.Version.Major` equals the TFM under test; the second assertion was the only thing that failed under the forced roll-forward (11 of 12 tests still passed).
- Test the musl leg with `docker run mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24` as a step, not a `container:` job: the runner ships Alpine builds of Node only for linux-x64 (`externals.sh`), so JavaScript actions in an Alpine job container cannot work on `ubuntu-24.04-arm`.
- Detect musl by the loader file (`/lib/ld-musl-*.so.1`), not the RID string: Microsoft's Alpine image reports `linux-musl-x64`, but `apk add dotnet10-sdk` reports `alpine.3.24-x64`, and a `StartsWith("linux-musl")` check returned the glibc triple there (test red).
- Split platform code into a pure `Compose(os, arch, musl)` table and a thin detector: the table test covers all 8 ocx targets on every leg (including x86_64-apple-darwin, which no PR leg runs); the native legs exist to test detection.
- `actions/setup-dotnet` cache keys are `dotnet-cache-${RUNNER_OS}-${hash}` with no architecture and no restore-keys, and the action throws if no `packages.lock.json` is found; for a mixed-arch matrix use `actions/cache` with `runner.os` and `runner.arch` in the key.
- Set `fail-fast: false` on every matrix (17 of the 20 matrix-using exemplars do) and make one `ci-ok` job with `if: always()` the only required status check; a skipped dependent job reports "Success" and silently passes branch protection otherwise.
- VSTest returns exit 0 when a filter matches zero tests (measured), so an empty leg is green; MTP returns 8 for zero tests and 9 when `--minimum-expected-tests` is unmet (measured), which closes the hole.
- Cost for private repos is dominated by macOS: at $0.062/min against $0.006 (Linux x64), $0.005 (Linux arm64) and $0.010 (Windows), one macOS PR leg is about 62% of an illustrative $0.60 matrix run; public repos pay nothing for any of these labels.
- Windows 11 Arm and macOS runners have no usable Docker (Docker was removed from Windows ARM images 2026-08-31; macOS has no nested virtualization), so any Testcontainers-style test is Ubuntu-only.
- The reviewer's mechanical gate is `actionlint` (run in a git checkout, with newly-GA labels declared in `.github/actionlint.yaml`) plus an 8-rule grep script; both were watched red on a planted workflow and green on its fixed twin.

## Findings

### 1. Platform coverage is a matrix property; the corpus barely gates it

The 35-repo exemplar corpus confirms the earlier audit: of 204 workflow files, 11 repos use any macOS label and 3 use an explicit arm64 label (re-counted for this note with `find ... | xargs grep -l`):

| claim | repos |
|---|---|
| any macOS runner | simple-exec, Polly, cake, coverlet, BenchmarkDotNet, GitVersion, npgsql, nuke, octokit.net, pulumi-dotnet, xunit (11) |
| explicit arm64 runner (`ubuntu-24.04-arm`, `windows-11-arm`) | simple-exec, BenchmarkDotNet, GitVersion (3) |
| both macOS architectures in one test job | BenchmarkDotNet (`macos-latest` arm64 + `macos-26-intel` x64), cake (`macos-latest` + `macos-15-intel`) |
| any musl / Alpine test leg | 0 (the only `alpine` hit is an agentic workflow lockfile in testfx, not a test) |
| `fail-fast: false` among repos that use a matrix | 17 of 20 |
| forces `DOTNET_ROLL_FORWARD=Major` in workflows | GitVersion only (10 workflow files) |

Citations: `adamralph__simple-exec@f80913246993:.github/workflows/ci.yml:13-24` (macos-26 + ubuntu-24.04-arm + windows-11-arm, `fail-fast: false` at :14); `dotnet__BenchmarkDotNet@61ebda8a50ae:.github/workflows/run-tests.yaml:22,65,108,147-150`; `cake-build__cake@08885933e936:.github/workflows/build.yml:26-28`; `GitTools__GitVersion@5057cdbcc177:.github/workflows/_unit_tests.yml:12,25`; `microsoft__testfx@7226b0c74729:.github/workflows/q.lock.yml:905` (the single Alpine hit).

The strongest exemplar for the owner's requirement is simple-exec's three-job matrix, where each OS leg is a different architecture: `macos-26` (arm64), `ubuntu-24.04-arm`, `windows-11-arm` (`ci.yml:17-22`). Its weakness: no x64 Linux or Windows leg at all, so x64 is untested. The decided matrix (section 4) is the union of simple-exec's arm legs and Polly's x64 legs (`App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:44-54`: `macos-26`, `ubuntu-24.04`, `windows-2025`).

Two exemplars are instructive negatives: Tyrrrz__CliWrap delegates its whole matrix to an unpinned org-level reusable workflow (`Tyrrrz__CliWrap@7dbc252fa773:.github/workflows/main.yml:26`, `uses: Tyrrrz/.github/.github/workflows/nuget.yml@prime`), so the platform claim cannot be read from the repo at all; testcontainers-dotnet runs a dynamic per-project `runs-on` matrix without `fail-fast: false` (`testcontainers__testcontainers-dotnet@04cbb73fcc58:.github/workflows/cicd.yml:59-64`, only `max-parallel: 6` at :60), so the first red leg cancels the rest.

### 2. Runner labels as of October 2026

The authoritative list is the runner-images README plus the GitHub-hosted runner reference ([runner-images README](https://github.com/actions/runner-images/blob/main/README.md), read via the GitHub API on 2026-10-10; [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)):

| target (ocx triple) | label to use | architecture | notes |
|---|---|---|---|
| linux-x64 glibc | `ubuntu-24.04` | x64 | `ubuntu-latest` alias until Nov 2026; `ubuntu-26.04` is GA |
| linux-arm64 glibc | `ubuntu-24.04-arm` | arm64 | also `ubuntu-26.04-arm` (GA per [#14747](https://github.com/actions/runner-images/issues/14747), 2026-09-17) |
| win-x64 | `windows-2025` | x64 | `windows-latest` and `windows-2025-vs2026` resolve to the same Server 2025 VS 2026 image |
| win-arm64 | `windows-11-arm` | arm64 | label switched to the VS 2026 image 2026-09-21..30 ([#14602](https://github.com/actions/runner-images/issues/14602)); `windows-11-vs2026-arm` is the explicit label |
| osx-arm64 | `macos-26` | arm64 (M1) | `macos-latest` points here since June 2026 ([#14167](https://github.com/actions/runner-images/issues/14167)); `macos-15` also current |
| osx-x64 | `macos-26-intel` or `macos-15-intel` | x64 | the only Intel macOS labels; `macos-13` is gone |
| linux musl x64/arm64 | no runner; Alpine container on the two Linux legs | n/a | section 6 |

Specs for public repos: Linux/Windows/arm64 4 vCPU / 16 GB; macOS arm64 3 vCPU / 7 GB; macOS Intel 4 vCPU / 14 GB. In private repos the Linux/Windows/arm64 runners have 2 vCPU / 8 GB ([runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners); arm64 in private repos only since 2026-01-29, [changelog](https://github.blog/changelog/2026-01-29-arm64-standard-runners-are-now-available-in-private-repositories)). arm64 runners were free for public repos from [2025-08-07 (GA)](https://github.blog/changelog/2025-08-07-arm64-hosted-runners-for-public-repositories-are-now-generally-available/). Since 2026-05-14 GitHub itself maintains the Arm64 images that Arm Limited used to build ([#14100](https://github.com/actions/runner-images/issues/14100)).

Preinstalled .NET SDKs (images dated 2026-09/10): Ubuntu 24.04, Ubuntu 24.04 Arm64, Ubuntu 26.04 and Windows 2025 VS 2026 list `8.0.425, 9.0.318, 10.0.401`; Windows 11 Arm64 adds 6.0.428; macOS 26 / 15 arm64 list `8.0.424` and `10.0.400` (not 10.0.401). Consequence: a `global.json` that pins `10.0.401` is satisfied on Linux/Windows without installing anything but not on macOS, and the README of setup-dotnet itself says preinstalled versions "are subject to change" ([setup-dotnet README](https://github.com/actions/setup-dotnet/blob/main/README.md)). Always run `actions/setup-dotnet` with `global-json-file`.

### 3. Retirement and drift calendar

All facts from GitHub's own announcement issues and changelogs (fetched 2026-10-10):

| date | event | source |
|---|---|---|
| 2025-12-04 | `macos-13` (and `-large`, `-xlarge`) retired; Intel replacement `macos-15-intel`; "GitHub will no longer support this architecture on macOS after the macOS 15 runner image is retired in Fall 2027" | [changelog 2025-09-19](https://github.blog/changelog/2025-09-19-github-actions-macos-13-runner-image-is-closing-down/) |
| 2026-06-15..07-15 | `macos-latest` migrates to `macos-26` | [#14167](https://github.com/actions/runner-images/issues/14167) |
| 2026-07-06 | `macos-14` deprecation begins (longer queues); brownouts through 2026-10-30 | [#13518](https://github.com/actions/runner-images/issues/13518) |
| 2026-08-31 | Docker removed from Windows ARM images (nested virtualization unsupported) | [#14632](https://github.com/actions/runner-images/issues/14632) |
| 2026-09-17 | Ubuntu 22.04 deprecation begins; Ubuntu 26.04 GA | [#14254](https://github.com/actions/runner-images/issues/14254), [#14747](https://github.com/actions/runner-images/issues/14747) |
| 2026-09-21..30 | `windows-11-arm` becomes the VS 2026 image | [#14602](https://github.com/actions/runner-images/issues/14602) |
| 2026-10-19..11-19 | `ubuntu-latest` becomes Ubuntu 26.04 (kernel 6.17 to 7.0, systemd 255 to 259) | [#14748](https://github.com/actions/runner-images/issues/14748) |
| **2026-11-02** | **`macos-14` fully unsupported** | [#13518](https://github.com/actions/runner-images/issues/13518) |
| 2026-11-10 | .NET 8 and .NET 9 end of support | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) |
| 2027-04-17 | `ubuntu-22.04` and `ubuntu-22.04-arm` fully unsupported | [#14254](https://github.com/actions/runner-images/issues/14254) |
| fall 2027 | macOS 15 image retires; Intel macOS support ends per the 2025 announcement | changelog above |

Retirement is by brownout: jobs on a retiring label fail on scheduled windows first, so a workflow that "worked yesterday" breaks. This is why a retiring-label grep belongs in the reviewer's checklist (rule 3).

### 4. The decided matrix: required, nightly, canary

```yaml
# required on every PR (blocks merge through the ci-ok job, section 11)
strategy:
  fail-fast: false
  matrix:
    include:
      - { os: ubuntu-24.04,     rid: linux-x64,   triple: x86_64-unknown-linux-gnu,  musl: x86_64-unknown-linux-musl,  tfms: 'net8.0 net10.0', sdk8: '8.0.x' }
      - { os: ubuntu-24.04-arm, rid: linux-arm64, triple: aarch64-unknown-linux-gnu, musl: aarch64-unknown-linux-musl, tfms: 'net8.0 net10.0', sdk8: '8.0.x' }
      - { os: windows-2025,     rid: win-x64,     triple: x86_64-pc-windows-msvc,    musl: '',                           tfms: 'net8.0 net10.0', sdk8: '8.0.x' }
      - { os: windows-11-arm,   rid: win-arm64,   triple: aarch64-pc-windows-msvc,   musl: '',                           tfms: 'net10.0',        sdk8: '' }
      - { os: macos-26,         rid: osx-arm64,   triple: aarch64-apple-darwin,      musl: '',                           tfms: 'net10.0',        sdk8: '' }
```

Nightly (`schedule`, `push` to main, `workflow_dispatch`; not `pull_request`), reporting by issue or notification rather than blocking:

| leg | why nightly, not PR |
|---|---|
| `macos-26-intel` osx-x64, net8.0 + net10.0 | the only x64 macOS label; costs the same $0.062/min as arm64; Apple and GitHub are ending Intel; mapping already table-tested on every leg (section 8) |
| `macos-26` net8.0 | floor TFM on the most expensive runner; the runtime difference net8 vs net10 on osx-arm64 is smaller than the OS difference already covered by the net10 PR leg |
| `windows-11-arm` net8.0 | same reasoning; Windows ARM is net10-first |
| `ubuntu-26.04` net8.0 + net10.0 | canary for the `ubuntu-latest` migration (kernel 7.0) before it lands on the PR legs |
| `ubuntu-latest` / `windows-latest` / `macos-latest` canary | `-latest` as an early warning of label drift; allowed to fail |
| .NET 11 RC (`dotnet-version: 11.0.x`, `dotnet-quality: preview`) | era canary; `dotnet-quality` is a single input shared by all versions in the step, so run it as a separate setup step ([setup-dotnet README](https://github.com/actions/setup-dotnet/blob/main/README.md)); in a separate `global.json` per the sibling note |

A `net472` leg is required only if `csharp-build-tfm-reach` keeps `netstandard2.0` for a named consumer class, and then only on a Windows runner (the sibling note's measured conclusion: "only with a `net472` test leg on a Windows runner"); with `net8.0;net10.0` there is no net472 leg.

Why PR legs run both TFMs on Linux x64, Linux arm64 and Windows x64 only: the .NET 8 runtime reaches end of support on 2026-11-10 ([support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)), so net8.0 coverage is an insurance leg for the remaining net8 consumers, not a platform claim; the cheapest runners carry it.

### 5. Per-TFM legs from one SDK 10 install

`dotnet test -f <tfm>` runs the tests for one target framework of a multi-targeted test project; the option is documented as "The target framework moniker (TFM) of the target framework to run tests for. The target framework must also be specified in the project file" ([dotnet test (MTP)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp); the VSTest page has the same `-f`). Building is separate: `dotnet build -c Release --no-restore` once, then loop `dotnet test -c Release --no-build -f "$tfm"` (npgsql does the same split: `npgsql__npgsql@9c47244547c2:.github/workflows/build.yml:313,320`; its minimal-TFM `net8.0` leg is commented out at :52-56, an exemplar of the net8 leg being dropped in practice).

The SDK is independent of the runtime a TFM runs on ([version selection](https://learn.microsoft.com/en-us/dotnet/core/versions/selection): "You can target different runtime versions of .NET using the same SDK tools"), but the test host needs the matching runtime. Roll-forward default is `Minor`: "Roll-forward to the next available higher minor version ... if requested minor version is missing"; a different major never rolls forward unless `Major`/`LatestMajor` is set. So `-f net8.0` on a machine with only the .NET 10 runtime fails; measured (section 15, V5).

How the 8.0 runtime gets there: `actions/setup-dotnet` installs multiple SDKs from a multi-line `dotnet-version`, and "In case both `dotnet-version` and `global-json-file` inputs are used, versions from both inputs will be installed" ([README](https://github.com/actions/setup-dotnet/blob/main/README.md)). Correct and incorrect:

```yaml
# INCORRECT: only SDK 10 (from global.json); a -f net8.0 leg has no 8.0 runtime on a clean machine
- uses: actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0
  with:
    global-json-file: global.json
# INCORRECT: "fixes" the missing runtime by running net8.0 tests on the .NET 10 runtime
env:
  DOTNET_ROLL_FORWARD: Major        # GitVersion does this: _unit_tests.yml:12
# CORRECT: both installed explicitly; the 8.0 SDK carries the 8.0 runtime
- uses: actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0
  with:
    global-json-file: global.json
    dotnet-version: ${{ matrix.sdk8 }}     # '8.0.x' on legs that test net8.0, '' otherwise
```

GitVersion's `DOTNET_ROLL_FORWARD: "Major"` in 10 workflow files (`GitTools__GitVersion@5057cdbcc177:.github/workflows/_unit_tests.yml:12`) is correct for a tool whose tests exercise one build on several SDKs, and wrong for a library claiming per-TFM coverage: it makes the net8.0 leg a second net10.0 run (V5, V6).

`global.json` interplay: `rollForward` must be paired with a fully-qualified `sdk.version`; wildcards are not supported (setup-dotnet README; [global.json](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)). With package lock files Microsoft documents `rollForward: disable` "so the SDK version and dependency graph stay in lockstep" (footnote on the same page). setup-dotnet installs the exact pinned version, so the `macos-26` image's `10.0.400` is replaced by `10.0.401`.

`dotnet test` under MTP (selected in `global.json` with `"test": {"runner": "Microsoft.Testing.Platform"}`, .NET 10 SDK and MTP >= 1.7) keeps `-f`, `--no-build`, `-c`; it rejects `-f` together with `--test-modules`; and from .NET 11 Preview 6 an env var `DOTNET_TEST_RUNNER` selects the runner and overrides `global.json` ([dotnet test](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test)). Use `--project` / `--solution` for MTP, not a bare positional path, per the sibling note.

### 6. The musl leg: docker run, not a job container

.NET 10 supports Alpine 3.21 to 3.24 on x64, arm64 and arm32 ([.NET 10 supported OS](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md), last updated 2026-09-28), and Microsoft's RID catalog lists `linux-musl-x64` and `linux-musl-arm64` ([RID catalog](https://learn.microsoft.com/en-us/dotnet/core/rid-catalog)). There are two ways to run an Alpine leg in GitHub Actions, and only one is uniform:

| approach | works on x64 | works on arm64 | why |
|---|---|---|---|
| `container: mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24` on the job | yes | **no** | JavaScript actions (`checkout`, `setup-dotnet`) run with the runner's Node mounted into the container; `externals.sh` downloads `node20_alpine` / `node24_alpine` only for `linux-x64`, the `linux-arm64` branch fetches only glibc Node ([actions/runner `src/Misc/externals.sh`, lines 174-186](https://github.com/actions/runner/blob/main/src/Misc/externals.sh)). Job containers also default `run` steps to `sh` ([workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)). |
| a normal job on `ubuntu-24.04` / `ubuntu-24.04-arm`, then a step `docker run mcr.microsoft.com/dotnet/sdk:...-alpine...` | yes | yes | Docker Server 28.0.4 is on the Ubuntu arm64 image; the MCR tag is a multi-arch manifest (`amd64`, `arm`, `arm64` verified with `docker manifest inspect`) |

The step (verified shape; non-root so the checkout is not left root-owned, V3):

```yaml
- name: test on musl (Alpine) on this same runner
  if: matrix.musl != ''
  env:
    EXPECTED_TRIPLE: ${{ matrix.musl }}
  run: >
    docker run --rm -v "$PWD:/w" -w /w -u "$(id -u):$(id -g)"
    -e HOME=/tmp -e DOTNET_CLI_HOME=/tmp -e NUGET_PACKAGES=/tmp/nuget
    -e DOTNET_NOLOGO=1 -e EXPECTED_TRIPLE
    mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24
    dotnet test tests -c Release -f net10.0 --blame-hang-timeout 5m
```

Pin the image tag to the exact SDK in `global.json` plus the Alpine release (`10.0.401-alpine3.24` exists; the floating `10.0-alpine` ships whatever SDK is current and will not satisfy an exact `global.json` pin). Docker is unavailable where it would be needed elsewhere: it was removed from Windows ARM images on 2026-08-31 because nested virtualization is unsupported ([#14632](https://github.com/actions/runner-images/issues/14632)), and macOS arm64 runners state "Nested-virtualization is not supported" ([runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)); the macOS image README lists no Docker. Therefore Docker-based tests (musl, Testcontainers) are Ubuntu-only, and no exemplar tests musl (section 1).

### 7. Legs must prove who they are

A matrix leg is a claim ("this ran on win-arm64, TFM net8.0"). Two claims are cheap to make falsifiable and both failed silently in the measurements:

1. **Platform identity.** The matrix declares the expected target triple; the workflow passes it as `EXPECTED_TRIPLE`; one test asserts the library's detected triple equals it and fails if the variable is missing. In the planted run on Alpine arm64 under QEMU the detector returned `x86_64-unknown-linux-gnu` and the test said `Expected: "aarch64-unknown-linux-musl"` (V4). This is the check that would have caught a leg silently running under emulation or on the wrong architecture.
2. **Runtime identity.** A test asserts `Environment.Version.Major` equals the TFM under test (`#if NET10_0 ... #elif NET8_0 ... #else #error add the new TFM here`). Under the forced roll-forward it was the only red test: `Expected: 8, Actual: 10` (V6). Note the sibling note's advice to use `NET8_0_OR_GREATER` in product code is about feature gating; an exact-identity assertion in a test is the legitimate use of the exact symbol, hence the `#error` fallback.
3. **Non-empty legs.** VSTest does not fail an empty run: `dotnet test --filter "FullyQualifiedName~NoSuchTest"` printed "No test matches the given testcase filter" and exited 0 (V9). MTP does fail: zero tests exit 8, and `--minimum-expected-tests 2` with one test exits 9 (V9; [dotnet test MTP](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp): "the test run fails with exit code 9"). With VSTest, rely on the always-run identity test; with MTP add `--minimum-expected-tests <n>` per leg.

### 8. What a matrix catches and what a pure table already catches

Platform logic has two halves, and only one needs a native runner. The fixture splits them:

```csharp
// pure, table-tested on EVERY leg: covers all eight ocx targets, incl. osx-x64 which no PR leg runs
public static string Compose(string os, Architecture arch, bool musl) { ... }

// thin detector: needs the native leg
public static string TargetTriple() =>
    Compose(CurrentOs(), RuntimeInformation.OSArchitecture, IsMusl());
```

Measured on linux-x64: the 8-row `[Theory]` over `Compose` passed on the buggy library too (it is correct there), so mapping mistakes are caught anywhere; the bugs that escaped were all in detection or in OS conventions (PATH separator, `.exe`, arm64 reported as x64 via `Environment.Is64BitOperatingSystem`, musl never detected). That defines what each native leg buys: Windows catches separators and suffixes; arm64 catches architecture detection; Alpine catches libc detection. It also justifies osx-x64 being nightly: its only unique content is the `x86_64-apple-darwin` row, already covered by the table.

Correct and incorrect musl detection (V7):

```csharp
// INCORRECT: RID string is opaque; distro-built runtimes report e.g. "alpine.3.24-x64"
var musl = RuntimeInformation.RuntimeIdentifier.StartsWith("linux-musl", StringComparison.Ordinal);

// CORRECT: ask the loader; works for Microsoft's and Alpine's own .NET builds
static bool IsMusl() => OperatingSystem.IsLinux() && Directory.Exists("/lib")
    && Directory.EnumerateFiles("/lib", "ld-musl-*.so.1").Any();
```

`RuntimeInformation.RuntimeIdentifier` is documented as "an opaque string ... it's not recommended to parse the string", and "some Linux distributions provide their own packages ... which may return more specific RIDs like `ubuntu.24.10-x64`" ([API docs](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.runtimeidentifier)); the RID catalog says "Don't try to parse RIDs to retrieve component parts" ([RID catalog](https://learn.microsoft.com/en-us/dotnet/core/rid-catalog)). Measured: on `alpine:3.24` with `apk add dotnet10-sdk` (SDK 10.0.303) `dotnet --info` shows `RID: alpine.3.24-x64`, and the RID-sniffing detector returned `x86_64-unknown-linux-gnu` (red); the loader check returned the musl triple (green).

### 9. NuGet cache keys

What `actions/setup-dotnet` does (read from source, [`src/cache-restore.ts`](https://github.com/actions/setup-dotnet/blob/main/src/cache-restore.ts), v6.0.0):

- primary key = `dotnet-cache-${process.env.RUNNER_OS}-${fileHash}`: OS only, no architecture, no `restoreKeys`;
- `lockFilePatterns = ['packages.lock.json']` searched in the repository root only; if none is found the action throws; `cache-dependency-path` accepts globs for lock files in subdirectories ([README, "Caching NuGet Packages"](https://github.com/actions/setup-dotnet/blob/main/README.md));
- it caches only the `global-packages` folder, so a restore can print NU1403 unless `DisableImplicitNuGetFallbackFolder` is set (same README section).

Consequences for this matrix: `windows-2025` and `windows-11-arm` both have `RUNNER_OS=Windows`, and both Linux legs have `Linux`, so x64 and arm64 legs share one cache entry and whichever saves first wins; runtime-specific packs missing from it are simply downloaded, so this is waste and non-determinism, not corruption. With a mixed-arch matrix use `actions/cache` directly (SHA `55cc8345...` is v6.1.0):

```yaml
# INCORRECT for a mixed-arch matrix: key has no arch, setup-dotnet throws without packages.lock.json
- uses: actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0
  with: { global-json-file: global.json, cache: true }
# CORRECT
- uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
  with:
    path: ${{ env.NUGET_PACKAGES }}
    key: nuget-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('**/packages.lock.json') }}
```

Cache semantics (GitHub, [dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)): runs restore caches from the current branch or the default branch (PRs also from the base branch), never from sibling branches; limit 10 GB per repository; entries untouched for 7 days are evicted, oldest-access first; "You cannot change the contents of an existing cache. Instead, you can create a new cache with a new key", so the key must contain the content hash and need not use `restore-keys`. The corpus keys on `Directory.Packages.props` (testcontainers `cicd.yml:79`), `**/*.csproj` plus `global.json` (nuke), or `**/Directory.Build.targets` (npgsql `build.yml:305`): none includes the architecture, and the Directory.Packages.props key goes stale when only a transitive version moves. The lock file hashes the resolved graph, so it is the right input; it requires `RestorePackagesWithLockFile` and `dotnet restore --locked-mode` (sibling note csharp-build-sdk-and-restore-pinning). A warm global-packages folder bypasses package source mapping (that sibling's V19), which is acceptable here only because `--locked-mode` pins content hashes.

`NUGET_PACKAGES` placement: Polly moves it to `D:\.nuget\packages` on Windows runners and `~/.nuget/packages` elsewhere (`App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:58-72`) for I/O speed; keep it under `${{ github.workspace }}` unless a measurement shows otherwise.

### 10. fail-fast, timeouts, concurrency, permissions

- `strategy.fail-fast` "defaults to `true`" and cancels all in-progress and queued matrix jobs when any fails ([workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)). For a platform-proof matrix, the failing leg is the information; cancelling the others hides whether Windows and Alpine also fail. Measured value of seeing all legs: one bad library produced distinct failures on 4 of 5 environments (section 15).
- `timeout-minutes` defaults to 360; set 20 on PR legs, 30 on nightly (GitVersion 45, Polly 20: `_unit_tests.yml:32`, `build.yml:27`). `ubuntu-slim` jobs time out at 15 minutes regardless.
- `concurrency` with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` so a force-push cancels the old PR run but a main-branch run is never cancelled (BDN cancels everything, `run-tests.yaml:13-15`).
- `permissions: contents: read` at workflow level; explicit `persist-credentials: false` on checkout (simple-exec: `permissions: read-all` at `ci.yml:7`, `persist-credentials: false` at :33). Pin third-party actions to a full 40-hex SHA: "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release" ([secure use](https://docs.github.com/en/actions/reference/security/secure-use)); the actions used here and their verified SHAs: `actions/checkout` v7.0.1 `3d3c42e5aac5...`, `actions/setup-dotnet` v6.0.0 `a98b56852c35...`, `actions/cache` v6.1.0 `55cc8345863c...`, `actions/upload-artifact` v7.0.2 `cf430e030ddb...` (resolved with the GitHub API on 2026-10-10).
- Never interpolate untrusted contexts (`github.head_ref`) into `run:`: pass through `env:` ([secure use](https://docs.github.com/en/actions/reference/security/secure-use)); actionlint flags it (V8).

### 11. Merge gating: one aggregate job, not N matrix names

Facts ([troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)): a workflow skipped by path/branch filtering leaves its checks "Pending" and blocks merging ("Avoid requiring workflows that can be skipped"); a job skipped by a conditional "reports Success"; a job that depends on a failed job "is skipped and may not block merging", with `always()` plus `needs` recommended for required checks. Matrix leg names change whenever a leg is added or renamed, so listing them in branch protection is brittle and a renamed leg turns into a permanently pending required check.

Decision: branch protection requires exactly one check, `ci-ok`:

```yaml
ci-ok:
  name: ci-ok
  if: always()
  needs: [test]
  runs-on: ubuntu-slim          # 1 vCPU, 15 min cap; fall back to ubuntu-24.04 if the label is unavailable
  timeout-minutes: 5
  steps:
    - name: fail unless every required leg succeeded
      env:
        RESULT: ${{ needs.test.result }}
      run: test "$RESULT" = success
```

`needs.test.result` for a matrix job is `success` only if every leg succeeded; `skipped` and `cancelled` also fail the gate. The nightly job is deliberately not in `needs`. This was linted but could not be executed locally (no Actions runner), so the gating semantics rest on the GitHub documentation above. What blocks merge: `ci-ok` (the five native legs, their TFMs, and the two musl steps), the format/analyzer gate from the sibling gate notes on the Linux leg, and actionlint on workflow changes. What does not block: osx-x64, net8.0 on macOS/win-arm, the `-latest` canary, the .NET 11 RC lane.

### 12. Cost per leg

Per-minute list prices for standard GitHub-hosted runners ([billing](https://docs.github.com/en/billing/reference/actions-runner-pricing), fetched 2026-10-10): Linux x64 $0.006, Linux arm64 $0.005, Windows x64 $0.010, Windows arm64 $0.010, macOS (M1 or Intel) $0.062; jobs round up to whole minutes. The page lists no minute multipliers. Public repos: standard runners are "free and unlimited" ([runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)); private repos draw on plan minutes, and arm64 Linux/Windows in private repos has been available only since 2026-01-29.

Illustrative PR run (the wall times are assumptions, not measurements; billing = minutes x rate):

| leg | assumed min | $/min | cost |
|---|---|---|---|
| ubuntu-24.04 (net8+net10 + musl x64) | 7 | 0.006 | 0.042 |
| ubuntu-24.04-arm (net8+net10 + musl arm64) | 7 | 0.005 | 0.035 |
| windows-2025 (net8+net10) | 8 | 0.010 | 0.080 |
| windows-11-arm (net10) | 8 | 0.010 | 0.080 |
| macos-26 (net10) | 6 | 0.062 | 0.372 |
| ci-ok (slim, 1 min) | 1 | <= 0.006 | <= 0.006 |
| **PR total** | | | **about $0.62** |

macOS is 60% of that on one leg; a second macOS PR leg (osx-x64) would add $0.37 and push it to $0.99, which is why it is nightly. The arm64 Linux leg is the only leg cheaper than its x64 twin. These are list prices; check the owner's plan and the repository visibility before using the figures as a budget.

### 13. The Python SDK anti-pattern (S5, S6)

`ocx-sdk-python@80136dde4162:.github/workflows/ci.yml:55-56` runs the unit matrix on `[ubuntu-latest, macos-latest, windows-latest]` x 3 Pythons, but the contract tier (the only tier that runs the real `ocx`, so the only one that exercises the child-process kill path) is one job on `runs-on: ubuntu-latest` (`ci.yml:81-91`, after `needs: verify`). The audit's smells S5 (Windows kill path never run: `TerminateProcess` on a single pid, `pragma: no cover`) and S6 (no arm64 Linux/Windows leg although `uname_to_triple` supports them) are the same defect in two forms: the platform-specific behaviour lives in the tier that runs on one platform. The C# SDK should invert it: the tier that spawns a process and selects a binary is the one that runs on every leg in section 4. In the fixture the equivalent is a library whose unit tests ran everywhere but whose environment-dependent behaviour was exercised only on Linux: 12/12 green on the single leg, 5 environments red on 4.

### 14. Linting the workflow: what actionlint knows and does not

actionlint 1.7.12 (released 2026-03-30, latest at the time of research) checks runner labels, expressions, shellcheck on `run:` and untrusted input ([checks reference](https://github.com/rhysd/actionlint/blob/main/docs/checks.md)). Measured behaviour (all V8):

| input | result |
|---|---|
| `macos-13`, `ubuntu-latest-arm64`, `ubuntu-24.04-arm64`, `windows-latest-arm64`, `macos-latest-intel`, `macos-14-arm64`, `windows-11-arm64`, `ubuntu-arm` | flagged `label "..." is unknown` (7 hallucinated + 1 retired) |
| `ubuntu-26.04`, `ubuntu-26.04-arm`, `windows-11-vs2026-arm` (valid, GA per GitHub) | **false positive** "unknown": the built-in list predates them. Fix: declare them under `self-hosted-runner.labels` in `.github/actionlint.yaml`; then exit 0 |
| `macos-14` (retires 2026-11-02), `macos-15-intel`, `macos-26-intel`, `windows-2025-vs2026`, `ubuntu-22.04` | accepted: actionlint does not know deprecation dates |
| `run: echo "${{ github.head_ref }}"` | flagged "potentially untrusted ... pass it through an environment variable" |

Two operational notes: actionlint exits 3 with "no project was found in any parent directories" outside a git checkout (use `git init` in a scratch tree, or pass explicit files plus `-config-file`), and it cannot say whether a matrix covers the required platforms; that is the job of the grep script in the normative section (`check-ci-matrix.sh`, 8 rules, watched red/green in V8).

### 15. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-ci-matrix/`. Layout: `bad/` and `good/` (each `src/Ocx.Platform.csproj` + `src/Host.cs`, `tests/Ocx.Platform.Tests.csproj` + `tests/HostTests.cs`, xUnit 2.9.3 on VSTest, both `net8.0;net10.0`, 12 tests, `.github/workflows/ci.yml`), `check-ci-matrix.sh`, `env-no8.sh` (SDK 10.0.401 + runtime 10.0.12 only, built by hard-linking the SDK and runtime into `dotnet-no8/`), `mtp/` (MSTest.Sdk 4.0.2 on MTP), `tools/x/actionlint` (1.7.12), `nuget.config.windows-host`. `bad/src/Host.cs` plants five defects: `Split(':')` for PATH, no `.exe` suffix, arch via `Environment.Is64BitOperatingSystem` (reports x64 on arm64), libc never detected, and (original variant) an unmapped arm64. `good/src/Host.cs` fixes each. Every environment below ran `EXPECTED_TRIPLE=<leg triple> dotnet test -f <tfm>`.

**V1 (red = the single-leg CI is blind).** linux-x64 glibc, toolchain `run.sh`:

```
bad  net8.0   Passed!  - Failed: 0, Passed: 12, Total: 12 (net8.0)
bad  net10.0  Passed!  - Failed: 0, Passed: 12, Total: 12 (net10.0)
good net8.0   Passed!  - Failed: 0, Passed: 12, Total: 12 (net8.0)
good net10.0  Passed!  - Failed: 0, Passed: 12, Total: 12 (net10.0)
```

The buggy library is green on the leg a "ubuntu-latest only" workflow runs.

**V2 Windows host** (Windows 11, SDK 10.0.102, staged at `C:\Users\ecom\csharp-wintest\csharp-crossplatform-ci-matrix\`, `cmd.exe /c "cd /d ...\\<v>\tests && set EXPECTED_TRIPLE=x86_64-pc-windows-msvc&& dotnet test -f net10.0"`):

```
bad:  Failed SplitPath_uses_the_native_separator   Expected: ["a","b"]  Actual: ["a;b"]
      Failed ExeName_adds_exe_only_on_windows      Expected: "ocx.exe"  Actual: "ocx"
      Failed!  - Failed: 2, Passed: 10, Total: 12 (net10.0)
good: Passed!  - Failed: 0, Passed: 12, Total: 12 (net10.0)
```

Windows-host quirk (host configuration, not .NET): `dotnet nuget list source` printed "No sources found", so restore failed with NU1100 until a repo-level `nuget.config` naming nuget.org was added; a committed `nuget.config` makes a leg independent of the runner's NuGet configuration. The Windows host has only the 10.0.2 runtime, so net8.0 was not run there.

**V3 Alpine musl x64** (`mcr.microsoft.com/dotnet/sdk:10.0-alpine`, Alpine 3.24.2, `RID: linux-musl-x64`):

```
bad:  Failed TargetTriple_matches_the_legs_declared_triple
      Expected: "x86_64-unknown-linux-musl"   Actual: "x86_64-unknown-linux-gnu"
      Failed!  - Failed: 1, Passed: 11, Total: 12 (net10.0)
good: Passed!  - Failed: 0, Passed: 12, Total: 12 (net10.0)
```

The workflow-shaped invocation (`docker run -u "$(id -u):$(id -g)" ... mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24 dotnet test tests -f net10.0`) also passed 12/12 on good; the first attempt hit `Access to the path '/w/good/src/obj/...' is denied` because earlier root-run containers had left root-owned `obj/` in the same bind mount (red), cleared by using a fresh directory (green): never mix root and non-root containers on one workspace.

**V4 arm64 under QEMU** (docker `--platform linux/arm64`; emulated, so a correctness check of detection logic, not evidence of native arm64 behaviour):

```
alpine 3.24 arm64 (RID linux-musl-arm64)
  bad:  Expected: "aarch64-unknown-linux-musl"  Actual: "x86_64-unknown-linux-gnu"   Failed: 1, Passed: 11
  good: Passed!  - Failed: 0, Passed: 12
debian sdk:10.0 arm64 (RID linux-arm64)
  bad:  Expected: "aarch64-unknown-linux-gnu"   Actual: "x86_64-unknown-linux-gnu"   Failed: 1, Passed: 11
  good: Passed!  - Failed: 0, Passed: 12
```

(The first iteration of `bad`, with an unmapped arm64 case, threw `System.PlatformNotSupportedException : Operation is not supported on this platform.` on the same arm64 Alpine container; both shapes of the arm64 bug are real and neither is visible on x64.)

**V5 per-TFM runtime requirement** (`env-no8.sh`: SDK 10.0.401, `dotnet --list-runtimes` shows only `Microsoft.NETCore.App 10.0.12`; good library, `EXPECTED_TRIPLE=x86_64-unknown-linux-gnu`):

```
$ env-no8.sh dotnet test -f net8.0 --no-restore
Testhost process for source(s) '.../good/tests/bin/Debug/net8.0/Ocx.Platform.Tests.dll' exited with error: You must install or update .NET to run this application.
Test Run Aborted.                                   exit=1
$ env-no8.sh dotnet test -f net10.0 --no-restore    Passed! 12/12 (net10.0)
$ run.sh dotnet test -f net8.0  (runtimes 8.0.31 + 10.0.12 present)   Passed! 12/12 (net8.0)
```

A first attempt with `sdk/` and `shared/` as symlinks into the full toolchain silently passed because the SDK's `DOTNET_HOST_PATH` resolved through the symlink to the full install, so `-f net8.0` found runtime 8 anyway; the isolation had to use hard links (`cp -al`). A real consequence for CI: the `dotnet` that VSTest launches is the one the SDK resolves, not necessarily the first on PATH.

**V6 forced roll-forward is false evidence** (same no-8.0-runtime root):

```
$ DOTNET_ROLL_FORWARD=Major env-no8.sh dotnet test -f net8.0
  Failed Runtime_major_equals_the_tfm_under_test   Expected: 8   Actual: 10
  Failed!  - Failed: 1, Passed: 11, Total: 12 (net8.0)            exit=1
$ ... --filter "FullyQualifiedName!~Runtime_major"
  Passed!  - Failed: 0, Passed: 11, Total: 11 (net8.0)
```

With the identity test removed, the "net8.0" leg is green while executing on .NET 10.

**V7 musl detection by RID string** (`alpine:3.24` + `apk add dotnet10-sdk`, SDK 10.0.303, `RID: alpine.3.24-x64`):

```
RID-sniffing detector:  Expected "x86_64-unknown-linux-musl"  Actual "x86_64-unknown-linux-gnu"   Failed: 1, Passed: 11
loader-file detector:   Passed!  - Failed: 0, Passed: 12     (also green on MS Alpine x64/arm64, Debian arm64, glibc x64, Windows)
```

**V8 workflow lint** (`tools/x/actionlint` 1.7.12; fixtures need a `.git`, otherwise exit 3 "no project was found"):

```
bad/.github/workflows/ci.yml  (ubuntu-latest + macos-13, tag-pinned actions, DOTNET_ROLL_FORWARD, head_ref in run:)
  ci.yml:10:29: label "macos-13" is unknown. available labels are ... [runner-label]
  ci.yml:18:33: "github.head_ref" is potentially untrusted ... [expression]          exit=1
good/.github/workflows/ci.yml (+ .github/actionlint.yaml declaring ubuntu-26.04, ubuntu-26.04-arm, windows-11-vs2026-arm)   exit=0
labels probe, no config:  ubuntu-26.04, ubuntu-26.04-arm, windows-11-vs2026-arm flagged unknown (false positives); with config exit=0
hallucinated labels: ubuntu-latest-arm64, ubuntu-24.04-arm64, windows-latest-arm64, macos-latest-intel, macos-14-arm64, windows-11-arm64, ubuntu-arm  -> all 7 flagged
```

Reviewer script (`check-ci-matrix.sh <dir>`, rules R1-R8 as in rule 22 below):

```
$ ./check-ci-matrix.sh bad/.github/workflows         exit=1
FAIL R1 missing leg matching /ubuntu-24\.04([^-.0-9]|$)/  ... /ubuntu-24\.04-arm/ ... /windows-(2025|latest)... /windows-11-arm/ ... /macos-(26|latest).../ ... /alpine/
FAIL R2 bad/.github/workflows/ci.yml has a matrix without fail-fast: false
FAIL R3 retired-or-retiring label: bad/.github/workflows/ci.yml:10:        os: [ubuntu-latest, macos-13]
FAIL R4 forced roll-forward: bad/.github/workflows/ci.yml:4:  DOTNET_ROLL_FORWARD: Major
FAIL R5 no leg passes EXPECTED_TRIPLE
FAIL R6 bad/.github/workflows/ci.yml has no top-level permissions:
FAIL R7 unpinned action: ...ci.yml:12:      - uses: actions/checkout@v4   (and :13 setup-dotnet@v4)
FAIL R8 no always() gate job
$ ./check-ci-matrix.sh good/.github/workflows       OK all rules   exit=0
```

(An earlier draft of the script used `grep | sed && fail=1`, which always set the failure flag because the pipeline status is `sed`'s: the good tree exited 1 with no output. Fixed with a `hits()` helper that tests the captured output.)

**V9 empty-leg behaviour.**

```
VSTest:  dotnet test -f net10.0 --filter "FullyQualifiedName~NoSuchTest"
         "No test matches the given testcase filter ..."                     exit=0
MTP (MSTest.Sdk 4.0.2, global.json test.runner = Microsoft.Testing.Platform, 1 test):
         dotnet test -f net10.0                                              exit=0
         dotnet test -f net10.0 --minimum-expected-tests 2                   "non-success exit code: 9"
         dotnet test -f net8.0  --minimum-expected-tests 1                   exit=0
         dotnet test -f net10.0 -- --filter "FullyQualifiedName~Nope"        "non-success exit code: 8"
```

(MSTest.Sdk needs `using Microsoft.VisualStudio.TestTools.UnitTesting;`; without it the first attempt failed with CS0246 on `TestClass`.)

**Not verified locally:** macOS runners (arm64 and Intel), native Windows arm64, native Linux arm64, GitHub Actions execution of the `ci-ok` gate and `container:` behaviour on arm64 (the Alpine-node limitation is read from `externals.sh`, not run), actual wall-clock minutes and cache hit rates.

## Normative guidance candidates

1. **Run the five native legs on every PR: `ubuntu-24.04`, `ubuntu-24.04-arm`, `windows-2025`, `windows-11-arm`, `macos-26`.** Rationale: one leg per OS x architecture proves "Windows/Linux/macOS x x64/arm64" except osx-x64 (rule 6); the Python SDK's ubuntu-only contract tier shows what is lost otherwise. Verify: `for l in 'ubuntu-24\.04([^-.0-9]|$)' 'ubuntu-24\.04-arm' 'windows-(2025|latest)([^-.0-9]|$)' 'windows-11-arm' 'macos-(26|latest)([^-.0-9]|$)'; do grep -rqE -e "$l" .github/workflows || echo "MISSING $l"; done` prints nothing.
2. **Pin matrix legs to versioned labels; use `-latest` only in a scheduled canary job.** Rationale: `ubuntu-latest` moves to 26.04 during 2026-10-19..11-19 and `macos-latest` moved to 26 in June 2026, so a `-latest` leg changes meaning without a commit. Verify: `grep -rnE -e 'os: *\[[^]]*-latest' -e 'runs-on: *(ubuntu|windows|macos)-latest' .github/workflows` has hits only in the job named `canary`.
3. **Never use a retired or retiring runner label: `macos-11`, `macos-12`, `macos-13`, `macos-14` (unsupported 2026-11-02), `ubuntu-18.04`, `ubuntu-20.04`, `ubuntu-22.04` (unsupported 2027-04-17), `windows-2019`.** Rationale: retirement is enforced by brownouts that fail jobs before the cut-off; actionlint knows only removed labels, not dates. Verify: `grep -rnE -e '(macos-(11|12|13|14)|ubuntu-(18|20|22)\.04|windows-2019)([^0-9]|$)' .github/workflows` prints nothing; update the pattern when a new retirement is announced in `actions/runner-images` issues.
4. **Set `fail-fast: false` on every matrix.** Rationale: a failing leg is the signal; the default cancels the other platforms' results. Verify: `for f in $(grep -rlE -e '^\s+matrix:' .github/workflows); do grep -qE -e 'fail-fast:\s*false' "$f" || echo "$f"; done` prints nothing.
5. **Each matrix leg declares its expected target triple and passes it to the tests as `EXPECTED_TRIPLE`; one test asserts equality and fails when the variable is unset.** Rationale: proves the leg ran on the platform it claims (emulation, wrong arch, wrong libc all fail it). Verify: `grep -rn -e 'EXPECTED_TRIPLE' .github/workflows tests --include=*.yml --include=*.cs` shows a workflow `env:` and a test reading it with `Assert.False(string.IsNullOrEmpty(...))`.
6. **osx-x64 (`macos-26-intel`) is a nightly leg; the mapping to `x86_64-apple-darwin` is covered on every leg by a pure `Compose(os, arch, musl)` table test.** Rationale: Intel macOS ends with the macOS 15 image in fall 2027 and costs $0.062/min. Verify: `grep -rn -e 'macos-26-intel' -e 'macos-15-intel' .github/workflows` hits only under a job with `if: github.event_name != 'pull_request'`; `grep -rn -e 'x86_64-apple-darwin' tests` finds the table row.
7. **Test the platform-selection logic in two halves: a pure table function tested on all eight targets, and a thin detector tested on the native leg.** Rationale: the table caught nothing on the buggy library because it was correct; all five planted bugs lived in detection. Verify: reading heuristic: `rg -n 'OSArchitecture|ProcessArchitecture|RuntimeIdentifier|Is64Bit' src` appears only inside the detector, never inside the mapping function; the test file has an 8-row `[Theory]`/`[InlineData]`.
8. **Never use `Environment.Is64BitOperatingSystem`, `Environment.Is64BitProcess` or `IntPtr.Size` to choose a binary or triple; use `RuntimeInformation.OSArchitecture`.** Rationale: arm64 reports 64-bit true and the planted detector returned the x86_64 triple on arm64 (V4). Verify: `grep -rnE --include='*.cs' -e 'Is64Bit(Operating|Process)' -e 'IntPtr\.Size' src` prints nothing, or enforce with Microsoft.CodeAnalysis.BannedApiAnalyzers (RS0030, severity `error` in `.globalconfig`) and a `BannedSymbols.txt` line `P:System.Environment.Is64BitOperatingSystem`.
9. **Detect musl from the loader (`/lib/ld-musl-*.so.1`), never by parsing `RuntimeInformation.RuntimeIdentifier`.** Rationale: the RID is opaque; Alpine's own .NET reports `alpine.3.24-x64` and a `linux-musl` prefix check misdetects it (V7). Verify: `grep -rnE --include='*.cs' -e 'RuntimeIdentifier' src | grep -E -e 'StartsWith|Contains|Split|Equals'` prints nothing.
10. **Install every runtime a leg tests: `actions/setup-dotnet` with `global-json-file` plus `dotnet-version: 8.0.x` on legs whose `tfms` include `net8.0`.** Rationale: preinstalled SDKs "are subject to change" and the macOS images lack 10.0.401. Verify: `grep -n -A6 'setup-dotnet' .github/workflows/ci.yml | grep -E -e 'global-json-file' -e 'dotnet-version'` shows both on the test job.
11. **Do not set `DOTNET_ROLL_FORWARD` or `<RollForward>` to make a missing runtime disappear.** Rationale: a net8.0 leg then runs on the .NET 10 runtime (V6). Verify: `grep -rnE -e 'DOTNET_ROLL_FORWARD' -e 'RollForward' .github/workflows tests --include=*.yml --include=*.csproj --include=*.props` prints nothing.
12. **Test projects assert the runtime major equals the TFM they were built for, with an `#error` fallback for unknown TFMs.** Rationale: the only test that turned red under a forced roll-forward. Verify: `grep -rn -e 'Environment.Version.Major' tests` finds the assertion and `grep -rn -B2 -e '#error' tests` shows the fallback.
13. **Build once, then loop `dotnet test -c Release --no-build -f "$tfm"` over the leg's declared `tfms`; do not test a multi-targeted project without `-f` in CI.** Rationale: `-f` makes each TFM an explicit, named run and the declared set per leg reviewable. Verify: `grep -rn 'dotnet test' .github/workflows` shows `-f` (or the `$tfm` loop) on every invocation.
14. **Run musl with a `docker run` step on the two Ubuntu legs using an image tag that equals the `global.json` SDK (`mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24`); do not use `container:` for it.** Rationale: the runner has Alpine Node only for linux-x64 (`externals.sh`), so a `container:` job fails on `ubuntu-24.04-arm`; a floating `-alpine` tag breaks the exact SDK pin. Verify: `grep -rn -e 'container:' .github/workflows` is empty for Alpine images; `grep -rnE 'sdk:[0-9]+\.[0-9]+\.[0-9]+-alpine[0-9.]+' .github/workflows` matches and the SDK equals `grep -o '"version": *"[^"]*"' global.json`.
15. **Docker-dependent tests run on Ubuntu legs only.** Rationale: Docker was removed from Windows ARM images (2026-08-31) and macOS has no nested virtualization. Verify: any step using `docker` or Testcontainers is guarded by `if: runner.os == 'Linux'`, by a matrix field that only the Ubuntu legs set (the fixture uses `matrix.musl != ''`), or sits in an Ubuntu-only job: `grep -rn -B3 -e 'docker run' .github/workflows` and read the guard.
16. **Key the NuGet cache on OS, architecture and the lock-file hash: `nuget-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('**/packages.lock.json') }}`, with `NUGET_PACKAGES` set and `dotnet restore --locked-mode`.** Rationale: setup-dotnet's own key omits the architecture and throws without a root lock file. Verify: `grep -rn -e 'hashFiles' .github/workflows | grep -v -e 'runner.arch'` prints nothing for cache keys; `grep -rn -e 'cache: true' .github/workflows` prints nothing in a mixed-arch matrix.
17. **Set `timeout-minutes` on every job (PR legs 20, nightly 30).** Rationale: the default is 360 minutes and a hung test would bill a macOS runner for six hours. Verify: `for f in .github/workflows/*.yml; do awk '/^  [a-z0-9_-]+:$/{j=$1} /runs-on:/{r[j]=1} /timeout-minutes:/{t[j]=1} END{for(k in r) if(!(k in t)) print FILENAME": "k}' "$f"; done` prints nothing.
18. **Protect the branch with exactly one required check, `ci-ok` (`if: always()`, `needs: [test]`, fails unless `needs.test.result == 'success'`); never list matrix leg names as required checks.** Rationale: skipped dependents report Success; leg names change when legs change. Verify: `grep -rn -A8 -e 'ci-ok:' .github/workflows` shows `if: always()` and the result comparison; `gh api repos/{owner}/{repo}/branches/main/protection --jq '.required_status_checks.contexts'` returns `["ci-ok"]`.
19. **A leg must not be able to pass with zero tests: under MTP add `--minimum-expected-tests <n>`; under VSTest keep the identity tests (V9).** Rationale: VSTest exits 0 on an empty filter match. Verify: `grep -rn -e 'minimum-expected-tests' .github/workflows tests` (MTP) or the identity tests of rules 5 and 12 exist (VSTest).
20. **`permissions: contents: read` at workflow level, `persist-credentials: false` on checkout, every third-party `uses:` pinned to a 40-hex SHA with a `# vX.Y.Z` comment, untrusted contexts only via `env:`.** Rationale: GitHub: a full-length SHA is "the only way to use an action as an immutable release". Verify: `grep -rnE -e '^\s*-?\s*uses:\s+[^./]' .github/workflows | grep -vE '@[0-9a-f]{40}'` prints nothing; actionlint reports no `[expression]` findings.
21. **Run actionlint 1.7.12 or newer on every workflow change, from a git checkout, with `.github/actionlint.yaml` declaring valid labels that its built-in list lacks (`ubuntu-26.04`, `ubuntu-26.04-arm`, `windows-11-vs2026-arm`); re-check the list when upgrading.** Rationale: it catches hallucinated and removed labels (8/8) and script injection, but has false positives on new labels and no deprecation dates. Verify: `actionlint; echo $?` prints `0`.
22. **Gate the matrix itself with the reviewer script** (rules 1, 3, 4, 5, 11, 18, 20 in one pass):

    ```bash
    #!/usr/bin/env bash
    # usage: check-ci-matrix.sh <workflows-dir>   -- exit 1 when any rule fails
    set -u; dir="${1:?workflows dir}"; fail=0
    bad() { echo "FAIL $1"; fail=1; }
    hits() { [ -n "$2" ] && { printf '%s\n' "$2" | sed "s/^/FAIL $1: /"; fail=1; }; return 0; }
    for pat in 'ubuntu-24\.04([^-.0-9]|$)' 'ubuntu-24\.04-arm' 'windows-(2025|latest)([^-.0-9]|$)' 'windows-11-arm' 'macos-(26|latest)([^-.0-9]|$)' 'alpine'; do
      grep -rqE -e "$pat" "$dir" || bad "R1 missing leg matching /$pat/"; done
    for f in $(grep -rlE -e '^\s+matrix:' "$dir"); do
      grep -qE -e 'fail-fast:\s*false' "$f" || bad "R2 $f has a matrix without fail-fast: false"; done
    hits "R3 retired-or-retiring label" "$(grep -rnE -e '(macos-(11|12|13|14)|ubuntu-(18|20|22)\.04|windows-2019)([^0-9]|$)' "$dir")"
    hits "R4 forced roll-forward" "$(grep -rnE -e 'DOTNET_ROLL_FORWARD|RollForward' "$dir")"
    grep -rqE -e 'EXPECTED_TRIPLE' "$dir" || bad "R5 no leg passes EXPECTED_TRIPLE"
    for f in $(grep -rlE -e '^jobs:' "$dir"); do
      grep -qE -e '^permissions:' "$f" || bad "R6 $f has no top-level permissions:"; done
    hits "R7 unpinned action" "$(grep -rnE -e '^\s*-?\s*uses:\s+[^./]' "$dir" | grep -vE -e '@[0-9a-f]{40}')"
    grep -rqE -e 'if:\s*always\(\)' "$dir" || bad "R8 no always() gate job"
    [ "$fail" -eq 0 ] && echo "OK all rules"; exit "$fail"
    ```

    Rationale: actionlint cannot judge coverage. Verify: `bash check-ci-matrix.sh .github/workflows` exits 0 (red on the planted workflow: 14 FAIL lines; green on the fixed twin: `OK all rules`).
23. **Keep the nightly lane for what PRs skip: osx-x64, net8.0 on macOS and Windows ARM, `ubuntu-26.04`, a `-latest` canary, and the .NET 11 RC lane; its failure opens an issue and never blocks merge.** Rationale: keeps PR cost at about $0.62 (illustrative) while still exercising the rest. Verify: nightly jobs have `if: github.event_name != 'pull_request'` and are absent from `ci-ok`'s `needs`: `grep -n -A3 -e 'ci-ok:' .github/workflows/ci.yml | grep needs`.
24. **Commit a `nuget.config` that clears sources and names nuget.org (with package source mapping per the sibling note).** Rationale: the Windows 11 host had no configured source (`No sources found`), so restore failed with NU1100 until one was supplied; legs should not depend on runner-local NuGet configuration. Verify: `test -f nuget.config && grep -c '<clear' nuget.config` prints `1`.

## AI-agent angle

| what an LLM characteristically does | why it is wrong or stale | smallest mechanical check |
|---|---|---|
| Writes `os: [ubuntu-latest, windows-latest, macos-latest]` and calls it cross-platform | no arm64 leg; `ubuntu-latest` is mid-migration to 26.04; only the arm64 mac comes free | rule 1 loop / `check-ci-matrix.sh` R1 |
| Uses `macos-13` or `macos-12` for "Intel", or `macos-14` | retired 2025-12-04 / retiring 2026-11-02; Intel is `macos-26-intel` / `macos-15-intel` | R3 grep; actionlint for `macos-13` only |
| Invents labels: `ubuntu-latest-arm64`, `ubuntu-24.04-arm64`, `windows-latest-arm64`, `macos-latest-intel`, `windows-11-arm64` | the real ones are `ubuntu-24.04-arm`, `windows-11-arm`, `macos-26-intel` | actionlint `[runner-label]` flagged all 7 tried |
| Lists a matrix of SDKs (`dotnet: [6.0.x, 7.0.x, 8.0.x]`) to cover versions | the unit of coverage is the TFM from one SDK 10; 6.0 and 7.0 are long EOL | grep `dotnet-version: \[` / `matrix.dotnet` in workflows |
| Adds `DOTNET_ROLL_FORWARD: Major` (or `<RollForward>Major`) to cure "framework not found" | turns the net8.0 leg into a .NET 10 run (V6) | R4 grep; runtime-major identity test |
| Installs only `10.0.x` and then runs `-f net8.0` | fails with exit 1 and "You must install or update .NET" (V5) | rule 10 grep |
| Runs the Alpine leg as `container: alpine:latest` or `mcr...-alpine` on the job, including on arm runners | arm64 runner has no Alpine Node; floating tag breaks the SDK pin | rule 14 greps |
| Detects musl by `RuntimeIdentifier.Contains("musl")`, arch by `Is64BitOperatingSystem`, PATH by `Split(':')`, `.exe` by hand | all five fail on a platform the dev machine is not (V1 to V7) | rules 8, 9 greps; the native legs |
| Caches `~/.nuget/packages` keyed on `**/*.csproj`, or uses `cache: true` without a lock file | stale on transitive change; setup-dotnet throws without `packages.lock.json`; no arch in key | rule 16 grep |
| Pins actions to old majors (`checkout@v3`, `setup-dotnet@v3`) or floating tags | v3 targets Node 16; current: checkout v7.0.1, setup-dotnet v6.0.0, cache v6.1.0 | R7 grep |
| Omits `fail-fast: false` and lists every leg as a required check | first red cancels the rest; renamed legs become permanently pending | R2 grep; `gh api ... required_status_checks.contexts` |
| Forgets `timeout-minutes` and `permissions:` | 360-minute default; write-all token | R6; rule 17 awk |
| Declares the platform matrix "done" after the workflow lints clean | actionlint says nothing about coverage | R1 to R8 |
| Runs Docker/Testcontainers tests on `windows-11-arm` or macOS legs | Docker removed / no nested virtualization | rule 15 grep |

## Contested / evolving

- **Pinned labels vs `-latest`.** The corpus is split: 256 `ubuntu-latest`, 48 `windows-latest`, 18 `macos-latest` mentions against 64 `ubuntu-24.04`, 6 `macos-26`, 5 `windows-2025` (counts over the 204 workflow files, as of this research). Trend since 2025: major projects (Polly, npgsql, GitVersion, simple-exec, testcontainers) pin versioned labels, because `-latest` flips cause surprise (macOS 15 to 26 brought OpenSSL 1.1.1w to 3.6.2 and Xcode/clang changes per [#14167](https://github.com/actions/runner-images/issues/14167)). Pinning trades surprise for a retirement calendar, which is why rule 3 exists; the compromise here is pinned required legs plus a `-latest` canary.
- **Intel macOS is time-boxed and the story is mixed.** The 2025 changelog says Intel macOS support ends when the macOS 15 image retires in fall 2027, yet `macos-26-intel` exists in October 2026. Treat the osx-x64 nightly as a leg to delete in 2027 and check the runner-images README at each release; this note does not claim `macos-26-intel` survives past fall 2027.
- **Arm64 is converging to first-class.** Linux/Windows arm64 went from public preview (2025-01) to public-repo GA (2025-08-07) to private repos (2026-01-29) to GitHub-maintained images (2026-05-14). The direction is that an arm64 PR leg is as ordinary as an x64 one; only 3 of 35 exemplars have one today.
- **netstandard2.0 / net472 leg** exists only if `csharp-build-tfm-reach` keeps the target; that note recommends `net8.0;net10.0`. With .NET 8 and .NET 9 both ending support on 2026-11-10 (.NET 10 LTS to 2028-11-14), the net8.0 PR legs are scheduled for removal when the package drops net8.0 (a major-version event per the sibling note). .NET 11 (RC1 2026-09-08, GA expected November 2026) adds `DOTNET_TEST_RUNNER` and many MTP options (RC1 or Preview 6/7 features per the dotnet test page): do not depend on them for the PR matrix before GA.
- **VSTest vs MTP.** VSTest remains the .NET 10 SDK default; MTP is opt-in via `global.json`, and an MTP solution must be MTP everywhere ("It is an error if any of the test projects use VSTest"). MTP gives the zero-test and minimum-test exit codes that VSTest lacks, so new projects trend to MTP (the sibling harness note chose xUnit v3 on MTP); the fixture here used both.
- **`ubuntu-slim`** for the gate job is new (15-minute cap, 1 vCPU, containerized: no Docker-in-Docker); it is documented in the runner reference but its price is not on the billing page, so the cost figure treats it as at most the Linux rate.
- **Whether QEMU arm64 is acceptable evidence.** It validated detection logic here (the bug showed up under emulation) but is not native evidence: no behaviour that depends on the kernel, signals or process groups should be accepted from it. Native `ubuntu-24.04-arm` stays the required leg.
- **Windows ARM runner image drift.** The `windows-11-arm` label moved to the VS 2026 image in September 2026; Docker is gone from it; Android CMake 3.30.5 etc. are changing ([#14826](https://github.com/actions/runner-images/issues/14826)). Expect continued churn; the label list in rule 21 needs periodic review.

## Sources

| URL | what it is | date / era | why worth reading |
|---|---|---|---|
| https://github.com/actions/runner-images/blob/main/README.md | runner-images "Available Images" table: every YAML label and architecture; read via GitHub API | live 2026-10-10 | the authoritative label list; shows `macos-13` absent, Intel labels, `ubuntu-26.04`, `windows-11-vs2026-arm` |
| https://docs.github.com/en/actions/reference/runners/github-hosted-runners | GitHub-hosted runner reference: labels, vCPU/RAM, public vs private, macOS arm64 limitations | 2026 | specs per label; "free and unlimited" for public repos; nested virtualization unsupported on macOS arm64 |
| https://github.com/actions/runner-images/issues/13518 | announcement: macOS 14 deprecation 2026-07-06, unsupported 2026-11-02, brownout dates | 2026-01 | exact retirement calendar for `macos-14` |
| https://github.com/actions/runner-images/issues/14748 | announcement: `ubuntu-latest` becomes Ubuntu 26.04, 2026-10-19..11-19 | 2026-09 | the drift that makes `-latest` legs change meaning; kernel and systemd diff |
| https://github.com/actions/runner-images/issues/14602 | announcement: `windows-11-arm` label moves to VS 2026 image, 2026-09-21..30 | 2026-08 | arm64 Windows image drift |
| https://github.com/actions/runner-images/issues/14632 | announcement: Docker removed from Windows ARM images, 2026-08-31 | 2026-08 | why Docker-based tests are Ubuntu-only |
| https://github.com/actions/runner-images/issues/14254 | announcement: Ubuntu 22.04 deprecation 2026-09-17, retirement 2027-04-17 | 2026-06 | retirement date and brownout policy |
| https://github.com/actions/runner-images/issues/14167 | announcement: `macos-latest` becomes `macos-26`, with the software diff table | 2026-05 | concrete cost of a `-latest` flip (Xcode, clang, OpenSSL) |
| https://github.com/actions/runner-images/issues/14100 | notice: Arm64 images now maintained by GitHub | 2026-05 | arm64 image provenance |
| https://github.blog/changelog/2025-09-19-github-actions-macos-13-runner-image-is-closing-down/ | changelog: macos-13 retired 2025-12-04, `macos-15-intel` replacement, Intel ends fall 2027 | 2025-09 | the Intel macOS story |
| https://github.blog/changelog/2025-08-07-arm64-hosted-runners-for-public-repositories-are-now-generally-available/ | changelog: arm64 runners GA for public repos | 2025-08 | free arm64 Linux and Windows, labels |
| https://github.blog/changelog/2026-01-29-arm64-standard-runners-are-now-available-in-private-repositories | changelog: arm64 in private repos, 2 vCPU | 2026-01 | supersedes the 2025 "public only" restriction |
| https://docs.github.com/en/billing/reference/actions-runner-pricing | per-minute prices per runner SKU | 2026 | the cost table (macOS $0.062 vs Linux $0.006) |
| https://github.com/actions/setup-dotnet/blob/main/README.md | setup-dotnet v6 usage: multi-version, global-json-file, caching, dotnet-quality | v6.0.0 (2026-07-16) | `global-json-file` + `dotnet-version` install both; cache requires packages.lock.json |
| https://github.com/actions/setup-dotnet/blob/main/src/cache-restore.ts | setup-dotnet cache implementation | v6.0.0 | proves the key is `dotnet-cache-${RUNNER_OS}-${hash}` with no arch and no restore-keys |
| https://github.com/actions/runner/blob/main/src/Misc/externals.sh | runner packaging script: which Node builds ship per platform | main, 2026 | Alpine Node only for linux-x64: why `container:` Alpine cannot work on arm64 |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | workflow syntax: fail-fast, matrix include/exclude, 256-job cap, timeout default 360, container shell | 2026 | exact semantics of `fail-fast` and `container:` |
| https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching | caching rules: scope, 10 GB limit, 7-day eviction, immutability | 2026 | cache key design |
| https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks | required-check pitfalls: skipped jobs, pending checks, `always()` | 2026 | why one aggregate `ci-ok` job |
| https://docs.github.com/en/actions/reference/security/secure-use | secure use: SHA pinning, script injection via env | 2026 | rule 20 |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test | `dotnet test` overview: VSTest vs MTP, `global.json` runner, `DOTNET_TEST_RUNNER` (.NET 11 Preview 6) | 2026-09 | runner selection facts |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp | `dotnet test` with MTP: `-f`, `--no-build`, `--minimum-expected-tests`, exit codes | 2026-09 | exit 9 / zero-test behaviour |
| https://learn.microsoft.com/en-us/dotnet/core/versions/selection | which SDK and runtime .NET picks; `RollForward` values and precedence | 2026-05 | `Minor` default, `DOTNET_ROLL_FORWARD`, SDK independent of runtime |
| https://learn.microsoft.com/en-us/dotnet/core/tools/global-json | global.json schema: `rollForward`, `test.runner`, lock-file note | 2026-03 | `disable` with package lock files |
| https://learn.microsoft.com/en-us/dotnet/core/rid-catalog | RID catalog: portable RIDs incl. `linux-musl-*`, "don't parse RIDs" | 2026-06 | musl RIDs; why not to sniff the RID |
| https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.runtimeidentifier | `RuntimeInformation.RuntimeIdentifier` API docs | net5.0 to net11.0 | "opaque", distro builds report specific RIDs |
| https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | .NET support policy table | 2026-10 | .NET 8/9 EOL 2026-11-10; .NET 10 LTS to 2028-11-14; .NET 11 RC1 |
| https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md | .NET 10 supported OS and architectures | updated 2026-09-28 | Alpine 3.21 to 3.24 on x64/arm64; Windows 11 Arm64; macOS 27/26/15 |
| https://github.com/rhysd/actionlint/blob/main/docs/checks.md | actionlint checks reference (runner labels, expressions, injection) | v1.7.12, 2026-03-30 | what the linter does and, measured, does not know |
| https://github.com/adamralph/simple-exec (clone at f80913246993, `.github/workflows/ci.yml:13-24`) | exemplar: arm64 Linux + arm64 Windows + macOS arm64 matrix | 2026 | the corpus's best arm64 matrix |
| https://github.com/dotnet/BenchmarkDotNet (clone at 61ebda8a50ae, `run-tests.yaml:22,65,108,147-150`) | exemplar: windows-latest + windows-11-arm, ubuntu x64 + arm, macOS arm64 + `macos-26-intel` | 2026 | only exemplar with both macOS architectures in PR tests |
| https://github.com/GitTools/GitVersion (clone at 5057cdbcc177, `_unit_tests.yml:12,25`) | exemplar: 3 OS x TFM matrix, `DOTNET_ROLL_FORWARD: Major` | 2026 | the roll-forward anti-pattern |
| https://github.com/App-vNext/Polly (clone at e4476096da5b, `build.yml:44-54`) | exemplar: macos-26 / ubuntu-24.04 / windows-2025, SHA-pinned | 2026 | pinned-label x64 baseline |
| https://github.com/npgsql/npgsql (clone at 9c47244547c2, `build.yml:34-56,305,320`) | exemplar: TFM-parameterised test legs, commented-out net8.0 floor leg | 2026 | `-f` matrix field, cache key |
| https://github.com/testcontainers/testcontainers-dotnet (clone at 04cbb73fcc58, `cicd.yml:59-91`) | exemplar: dynamic per-project `runs-on`, Docker daemon wait on Windows | 2026 | negative: no `fail-fast: false`; Docker-on-Windows flake |
| https://github.com/ocx-sh/ocx-sdk-python (local clone ~/dev/ocx-sdk-python at 80136dde4162, `ci.yml:55-56,81-91`) | the Python SDK's CI: 3-OS unit matrix, ubuntu-only contract tier | 2026 | the S5/S6 anti-pattern to avoid copying |
