---
name: go-quality-reference
description: Depth files and checks scripts behind the go-quality rule, loaded on demand. Use when the go-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the go-quality rule
  keywords: go,golang,quality,errors,concurrency,testing,cli,iterators,generics,slog,net/http,reference
  claude.user-invocable: "false"
---

# go-quality-reference

Depth for the `go-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-design.md](api-design.md) | Exported API, package layout, functional options, doc comments, deprecation, SDKs wrapping a CLI |
| [cli-contract.md](cli-contract.md) | `main` package, exit codes, cobra, signals, SIGPIPE, stdout discipline, prompts |
| [concurrency.md](concurrency.md) | Goroutines, fan-out, contexts, shared state |
| [errors.md](errors.md) | Wrapping, matching and exposing errors, panics, exits, closing writable files |
| [io.md](io.md) | Atomic writes, `os.Root` path confinement, archive extraction, locks, `os/exec` lifecycle |
| [language.md](language.md) | Go-version idioms, generics, iterators, JSON, maps, `time.Time`, runes |
| [network.md](network.md) | HTTP clients and servers, timeouts, body bounds, retries, OCI registry content |
| [observability.md](observability.md) | Logging, pprof and metrics endpoints, runtime tuning, performance claims |
| [security.md](security.md) | Tokens, TLS, credentials, HTML templates, `unsafe`, cgo, untrusted decoding |
| [testing.md](testing.md) | Test style, fuzz targets, benchmarks, golden files, helper-process fakes, coverage gates |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/go-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/go-quality-reference/checks` when installed globally).
