---
name: python-quality-reference
description: Depth files and checks scripts behind the python-quality rule, loaded on demand. Use when the python-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the python-quality rule
  keywords: python,quality,standards,review,ruff,typing,reference
  claude.user-invocable: "false"
---

# python-quality-reference

Depth for the `python-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-surface.md](api-surface.md) | public functions, classes and exceptions imported from outside |
| [async.md](async.md) | async, awaiting, spawning, cancellation, timeouts |
| [ci-gate.md](ci-gate.md) | turning on a lint, wiring a CI job, adopting a gate |
| [cli-contract.md](cli-contract.md) | exit status, argv parsing, stdout contract |
| [data-modelling.md](data-modelling.md) | dataclasses, enums, `TypedDict`, sentinels, serialization |
| [http.md](http.md) | network requests, responses, retries, pagination |
| [observability.md](observability.md) | log lines, warnings, diagnostic output |
| [processes.md](processes.md) | spawning processes, capturing output, driving a CLI, PTYs |
| [security.md](security.md) | archives, untrusted input, credentials |
| [single-file-tools.md](single-file-tools.md) | scripts that run with no third-party dependencies |
| [testing.md](testing.md) | tests, fixtures, markers, coverage settings |
| [typing.md](typing.md) | annotations, generics, `cast`, type-checker settings |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/python-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/python-quality-reference/checks` when installed globally).
