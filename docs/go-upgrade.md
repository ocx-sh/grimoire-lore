# go-upgrade

An order-sensitive procedure for moving a Go module to a new toolchain release
or triaging a dependency finding, with the exact command for each step and the
before/after check that tells a reviewer whether it changed anything. A
sequence, not a checklist to run in whatever order feels convenient.

```sh
grim add ghcr.io/ocx-sh/lore/go-upgrade
```

Reach for it when bumping the `go` or `toolchain` directive, adopting a new Go
minor or point release, bumping golangci-lint or staticcheck, answering a
`govulncheck` finding or a Dependabot `gomod` PR, replacing a deprecated or
archived module, or asking why a green build changed behaviour after a Go
bump.

## The order is the finding

Three facts make the sequence load-bearing rather than stylistic. `go fix`
declines a rewrite silently below its floor, so running it before the `go`
line moves reads an under-modernized tree as already modern. Dependabot never
opens a PR for the `toolchain` line alone, so a CLI that waits for a bot ships
a stdlib CVE that a point release already fixed. And a behaviour change from a
Go bump arrives with no compile error, so the `GODEBUG` diff between the old
and new line is the only place it shows up before it reaches production. Two
runbooks follow from that: Runbook A moves a module to a new release across
nine steps, and Runbook B triages a dependency finding across five, kept as a
separate diff so a reviewer can tell a behaviour change from a dependency
change.

## What is measured, not asserted

Every dated fact in the procedure was re-run against the pinned toolchain
before being written down: `go fix -a -diff` on Go 1.27.1 prints its declined
rewrites only on an uncached run, six commands under "Dated re-check" exist
because a linter or Go point release moved the fact under them before, and the
six probes in `references/probes.md` are runnable plants, not descriptions,
so a golangci-lint or staticcheck bump can be re-checked against the same
fixture rather than trusted on its changelog. Measured 2026-09-26 against Go
1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and
gopls v0.23.0, against a 35-repository upstream exemplar corpus rather than
the fleet's own code, which carries no Go module of its own.

## It distrusts the convenient reading

`govulncheck -format json` and `-format sarif` both exit 0 on the same finding
that text mode reports with exit 3, so only text mode gates and every finding
is read for a reachability trace before it blocks a release. A `replace X =>
fork` never answers a vulnerability, because it applies only in the main
module and every consumer keeps the vulnerable code. And a library never
raises its `go` line to adopt a language feature, because that forces every
consumer onto the new release for a change that never touched their code.

## Pinned decisions

A library or SDK declares the oldest supported release's `.0` and carries no
`toolchain` line. A CLI declares the current release's `.0` plus a
`toolchain` line naming the latest patch, bumped within a week of each Go
point release. The golangci-lint pin moves only through the linter-bump step,
to an exact version, never `latest`. The gopls pin for the iterator-yield
check is `v0.23.0`, dropped once `go vet` or golangci-lint carries the
analyzer itself. Each row is a default an adopter overrides once, in their
own repository, never per module.

## What it does not cover

Cutting and signing a release, `retract`, and the binary-mode audit belong to
`go-release`. Choosing which linter rules apply to a Go source file, and the
non-negotiable rows a change must clear, belong to `go-quality`. Diagnosing a
hung, leaking, racy or slow process belongs to `go-diagnose`. All three are
read for their own procedures, and this skill cites their rule IDs rather
than restating them.

## Siblings

Twenty-six merge-blocking rows are restated at the end of the procedure as
findings with their rule IDs, a hedge against the `go-quality` and
`go-modules` rule sets not being loaded, where the rule text and full
verification live. `go-release` is the release-engineering half of the same
lifecycle, and `go-diagnose` is the runtime-behaviour half. Bundled as
`go-essentials`.
