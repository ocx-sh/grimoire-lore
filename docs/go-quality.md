# go-quality

Standards for writing and reviewing Go: the gate, eighteen merge-blocking
non-negotiables, and ten depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/go-quality
```

Loads on `**/*.go`. The index is 179 lines and always present; a depth file
is read only when the work calls for it.

## It starts by assuming your gate is quieter than it looks

golangci-lint's `standard` set enables five linters. Most of what this set
leans on, `noctx`, `containedctx`, `errorlint`, `nilerr`, `thelper` and
`usetesting`, sits outside that set, so a module on the default config
lints exactly like a module with the whole set turned on and reads as gated
when it is not. Across 35 upstream repositories measured, golangci-lint v2
runs in 23. The other 12 include Go-team repositories and top libraries, so
absence is not a smell by itself, but it does mean `go vet` alone is
carrying the weight, and `go vet` only runs 12 of its 35 analyzers inside
`go test`.

So the first instruction is not a rule about code. It is: read the module's
`go` line and confirm it copied one of the three pinned golangci-lint files
whole, then trust the rest. Rows across every depth family are gated by that
`go` line, a fixer that declines below its floor and a stdlib symbol that
compiles clean on a newer toolchain both read as passing when they are not
being run.

## What agents get wrong by default, measured

Generated Go clusters on habits that predate the language's own fixes for
them. Across the 35-repository corpus: the `sort.Slice` family outnumbers
`slices`/`maps`/`cmp` 1,496 to 8,692 in the other direction, `interface{}`
is 62 percent migrated to `any`, and 142 loop-variable copies remain from
before Go 1.22 made them unnecessary. `errors.Is`/`As` usage is real but
incomplete: `%w` wrapping outnumbers `%v`-of-error 9,310 to 2,300, yet 222
sites still compare `err == io.EOF` and 91 match on error text. Goroutine
fan-out is the weakest spot: 78 percent of `errgroup.Go` call sites carry no
`SetLimit`.

## What is in it

The index carries the gate, eighteen non-negotiables, and five cross-cutting
rules it owns outright. 203 rules in total, 126 of them merge-blocking,
spread over ten depth files: language and versioning, errors, concurrency,
API design, testing, the CLI contract, filesystem and process I/O, network
and registry clients, security, and observability.

Every rule carries an ID, a rationale, a runnable verification and a
severity. Nothing routes through a topic index. You read the file for the
work you are about to do, and those files do not point at each other.

Several verifications are inverted, so each one states which way empty
output reads. A missing `errors.As` target, an unbounded `errgroup.Go`, and
a hand-edited generated file are each the finding a grep for the compliant
shape would miss, so the rule set greps for the violation instead and reads
empty output as the pass.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact, and they
are marked pinned so a later reader does not re-litigate them. Go 1.27.1,
golangci-lint v2.14.0 and govulncheck v1.8.0 are the measured toolchain,
pinned exactly, never `latest`, moved only through the `go-upgrade` skill.
Libraries and the SDK declare `go 1.26.0`. CLIs declare `go 1.27.0` with a
`toolchain` line. The SDK shape is a stdlib-only library wrapping the
project's CLI binary, go-cmp and goleak as its only test dependencies, held
at 100 percent coverage. Cobra plus pflag is the CLI framework for
multi-command tools. Windows is a first-class CI leg. golangci-lint's three
files and the ten-step gate are chained into one named target, `check`, and
CI and every agent loop call that target, never a hand-copied subset.

Each is a default an adopter overrides once, in their own `go.mod` or copied
config, never per package and never per call site. Overriding one is a
decision, recorded with its reason. Ignoring one is a violation.

## What it does not cover

No architecture, no folder layout, and no restatement of the language
specification or the standard library, which are already in the model. It
names traps, not maps: the shape of a particular codebase is discoverable
by reading it.

It also does not cover the files a compiler never checks. `go.mod`, `go.sum`,
`go.work`, golangci-lint, goreleaser and `staticcheck.conf` files are the
`go-modules` sibling's, on globs this set deliberately does not touch, so a
`.go` edit never pays for them.

## Siblings

`go-modules` covers what a module declares and what fails its build: the
`go` and `toolchain` lines, dependencies, and the gate's own YAML and release
config. It loads on `go.mod`, `go.sum`, `go.work` and the tool-config files
this index's glob does not reach, so a config edit always pays for it and a
source edit never does.

`bazel-quality` carries a Go depth file for `rules_go`, Gazelle and `go_deps`
if you adopt Bazel for Go. It has no glob of its own, and its `nogo` wiring
is not a substitute for this set's language-depth checks.

`go-release`, `go-upgrade` and `go-diagnose` are procedures that cite this
set's rule IDs by number and never restate them. Bundled with `go-modules`
as `go-essentials`.
