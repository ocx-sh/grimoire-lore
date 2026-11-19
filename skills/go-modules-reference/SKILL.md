---
name: go-modules-reference
description: Depth files and the three golangci-lint config files behind the go-modules rule, loaded on demand. Use when the go-modules rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and golangci-lint configs behind the go-modules rule
  keywords: go,golang,go.mod,go.sum,go.work,toolchain,godebug,replace,retract,depguard,govulncheck,golangci-lint,staticcheck,goreleaser,ko,cosign,setup-go,dependabot,release,reference
  claude.user-invocable: "false"
---

# go-modules-reference

Depth for the `go-modules` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

The `golangci/` directory holds the three golangci-lint v2 files (`baseline`, `cli`, `lib-sdk`) the rule tells you to copy whole to `.golangci.yml`.

| File | Holds |
|---|---|
| [gates.md](gates.md) | CI gate steps, golangci-lint and staticcheck config, go vet, race, govulncheck |
| [release.md](release.md) | Release binaries: reproducible flags, version stamping, goreleaser, ko, signing, workflow pinning |
