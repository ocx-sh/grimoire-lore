# dotnet-release

An ordered runbook for cutting a .NET release. It covers two scopes in one table: a NuGet library or SDK shipped as a package, and an application shipped as a framework-dependent, self-contained, single-file, trimmed or AOT artifact, or as a container. It is a list of gates rather than a list of steps, because every step before the tag push must pass or stop the release.

```sh
grim add ghcr.io/ocx-sh/lore/dotnet-release
```

Run it when tagging or releasing a .NET project, writing a release workflow, choosing a publish mode, or deciding a version bump. It also covers checksums, an attestation and a release that went out wrong. Install the bundle (`dotnet-build` and `csharp-quality` with it), because it cites their rule IDs; if the rules did not load, the skill still reports its restated findings.

## A pushed tag is the only publishing step

Everything before the tag push is a gate that fails on the working tree, the packed artifact or the published binary, never on an exit code alone. The tag push is the only step that publishes, and it runs only when the owner asked for the release. A package version on nuget.org cannot be replaced, so a defect found before the push costs a commit and a defect found after it costs a version number. There is no fix-the-release path: no unlist-and-reuse, no moved tag, no re-uploaded asset, and a bad release is followed by the next patch version.

The runbook numbers its steps 0 to 16: steps 0 to 12 are gates, step 13 is the tag push, and steps 14 to 16 verify the published artifact, close out the release and handle one that went out wrong. Nothing in this skill was pushed to a registry. The nuget.org write paths are `unverified: read only`: the push, the Trusted Publishing exchange and prefix reservation.

## The library path

14 steps, R1 to R14, citing CS-PKG and CS-SEC-09 and CS-SEC-10. The order matters. The checkout is a full clone at an exact tag, and the job uses the newest SDK from `global.json`, never the floor, because SDK 8 fails NETSDK1045 on `net10.0` and ignores `SOURCE_DATE_EPOCH`. Restore runs into an empty packages folder with the audit asserted, and a library ships no lock file. Then build and test, pack with package validation and the snupkg, check the tag against the packed version, check the nuspec metadata and dependency budget, and run the dotnet-validate loop on every nupkg.

A reproducibility job packs a fresh clone in another directory and compares the two nupkg digests. Only the publish job pushes, with Trusted Publishing and `--skip-duplicate`, never a long-lived API key, and it never rebuilds. After the push the skill validates the remote package, tests the symbol package with SourceLink and sets the validation baseline to the released version in the next commit.

## The app path

14 steps, DN-REL-01 to DN-REL-14, picked from a mode table in `references/app-modes.md`. Go top to bottom and the first row that fits wins. The 8 rows run from a file-based app and a framework-dependent publish, through a container with or without `PublishAot`, to a standalone single-file, trimmed or AOT binary, and end on the code that is never AOT and never trimmed. Each row carries measured size and startup on linux-x64 SDK 10.0.401 and the run-the-artifact check that goes with it.

Publish properties live in the project, not as `-p:` in CI. `--self-contained` is written on every `dotnet publish -r`, because on net8 and later `-r` alone is framework-dependent and silent. Publish runs under warnings as errors, which ILLink inherits, and gates on zero IL diagnostics: IL2026 and IL3050 are warnings by default, the publish exits 0 and the artifact exits 134. Every published artifact is executed from an empty directory, in its target environment, before release. `SHA256SUMS` and a provenance attestation come from the tag job only.

## What agents get wrong by default

Measured 2026-10-11 on SDK 10.0.401, linux-x64, with a hello-world app and a library fixture. Agents report success from an exit code: a publish with IL warnings exits 0 and the artifact exits 134, and a `docker stop` that killed the app with no cleanup exits 143. They assume `-r` implies self-contained, and get a 116 KB framework-dependent exe against 74 MB. They read `Assembly.Location` in a single-file bundle, where it is the empty string. They set `InvariantGlobalization` to fix an ICU crash. They cross-compile Native AOT for another OS on a Linux runner, or ship a glibc build to Alpine.

For the library path they hand-set `<Version>`, push with an API key, rebuild in the publish job, and set the validation baseline to the version being released, which fails restore with NU1102.

## What it does not cover

macOS, arm64 and Windows artifacts are built but not run here and say `unverified: read only`. App frameworks, installers and store packaging are not covered. Rule text stays with `dotnet-build` and `csharp-quality`. Moving to a new SDK is `dotnet-upgrade` and a failing publish is `dotnet-diagnose`.

## Siblings

The runbook restates its merge-blocking findings by rule ID. `dotnet-build` owns the pack properties it relies on. Bundled with `csharp-quality` and `dotnet-build` as `dotnet-essentials`.
