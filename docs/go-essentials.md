# go-essentials

The OCX Go set in one install: two rules for the files you edit, and three
skills for the procedures you run occasionally.

```sh
grim add ghcr.io/ocx-sh/lore/go-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `go-quality` | rule | 18 non-negotiables and 122 MUST rows across ten depth files: the Go-version and idiom gate, errors and closing, goroutines and context, API and SDK design, testing, the CLI contract, files and processes, network and registry clients, security, and observability and performance |
| `go-modules` | rule | 17 non-negotiables and the 18 GO-MOD rows on `go.mod`, dependencies and tags, plus the golangci-lint gate config and the release-engineering rules, installed on 13 glob patterns beyond `go.mod` itself |
| `go-release` | skill | An eleven-step gate-ordered release runbook for a CLI's per-platform binaries or a library's module tag, built around a proxied module version's permanence |
| `go-upgrade` | skill | Two order-sensitive runbooks, nine steps to move a module to a new Go release and five to triage a dependency finding, with re-probed linter facts kept dated |
| `go-diagnose` | skill | Consent-gated, symptom-routed diagnosis across nine failure modes, from a hang to a performance claim, for a Go process or test that is already wrong |

## Why two rules and not one

The globs differ, which is the only thing that justifies a second rule file.
A `.go` edit is not a `go.mod` edit, and loading the release-engineering and
golangci-lint-config depth while you touch a function body is pure cost.

So the split follows what the file under edit is. `go-quality` carries the
language and API standards and loads on every `**/*.go` file. `go-modules`
carries what a module and its build config claim about themselves, files no
compiler checks, and loads on `go.mod`, `go.sum`, `go.work` and the
golangci-lint, goreleaser, ko and staticcheck config files, 13 patterns in
all. The two never load on the same edit.

## Why three skills and not more rules

All three skills are procedures, not standards. One runs per release, one per
toolchain bump or dependency incident, one per live failure. None has a
reason to load on every edit, and any of them loaded per edit would be dead
weight in the context budget.

They carry no rules of their own. Each restates the merge-blocking rows it
enforces as findings with the rule IDs, so a review that runs the procedure
without the rule sets loaded still reports them correctly. Each says
explicitly that the rule text and its verification are settled in `go-quality`
or `go-modules`, never in the skill.

## The premise

golangci-lint's own `standard` preset activates five linters. Most of what
this set enforces depends on a linter that preset leaves off entirely
(`noctx`, `containedctx`, `errorlint`, `nilerr`, `thelper`, `usetesting`), so a
module on the default config reads exactly like a gated one until someone
copies the pinned config in whole. Of 35 measured upstream repositories, 23
wire golangci-lint v2 at all, and the 12 that do not include Go-team
repositories and widely used libraries.

`go vet` itself is not one thing. `go test` runs 12 of its 35 analyzers, so a
green test suite is not a vet pass. Several checks invert: `govulncheck`
exits 3 on a finding in text mode and 0 on the same finding in JSON, and a
wrong module root prints `0 issues.` and exits 7. So every rule here states
which way empty output reads, and the gate block runs each tool for its own
sake rather than trusting another tool's green to imply it.

## What is not in it

Bazel. A repository that builds Go with Bazel gets that from the
`bazel-quality` set's Go depth file, which owns `go_*` targets, Gazelle and
`go_deps`. Go `Example` functions, READMEs and CHANGELOGs belong to
`docs-instrument` and `docs-quality`, which already own that ground.

The bundle names its members without a tag. It says these five belong
together. Your `grimoire.lock` is what freezes them.

## Siblings

- **`bazel-quality`**: its Go depth file covers `rules_go`, Gazelle, `go_deps`
  and `nogo` for a repository that adopts Bazel for Go. It has no glob of its
  own, and `nogo` is not a substitute for `go-quality`'s language checks.
- **`docs-instrument`** and **`docs-quality`**: own Go `Example` functions,
  README and CHANGELOG content, never duplicated here.
