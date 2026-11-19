---
name: typescript-quality-reference
description: Depth files and checks scripts behind the typescript-quality rule, loaded on demand. Use when the typescript-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the typescript-quality rule
  keywords: typescript,quality,standards,review,lint,node,reference
  claude.user-invocable: "false"
---

# typescript-quality-reference

Depth for the `typescript-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [async.md](async.md) | outbound calls, timers, `await`, async callbacks, array fan-out |
| [browser.md](browser.md) | rendering HTML, URL binding, CSP, generated clients, bundle growth |
| [cli-contract.md](cli-contract.md) | pinned exit-code table, exit status in Node, stdout/stderr split |
| [errors.md](errors.md) | throwing, catching, rethrowing, typed parsing of untrusted payloads |
| [extension-host.md](extension-host.md) | VS Code or Electron extension host code: `activate()`, webviews, host bundle |
| [gate.md](gate.md) | type-aware lint wiring, Biome/ESLint parity, one command for local and CI |
| [modules.md](modules.md) | import specifiers, `module`/`moduleResolution`, package `"type"` |
| [observability.md](observability.md) | log lines, non-rethrowing catches, `.sort()`, formatted dates |
| [resources.md](resources.md) | child processes, intervals, open handles, `using` |
| [security.md](security.md) | outside data reaching shells, paths, keys, regexes, HTML sinks, credentials |
| [testing.md](testing.md) | tests, coverage thresholds, type-level assertions, fakes |
| [types.md](types.md) | `as`, `any`, type predicates, `enum`, union arms, `declare` |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/typescript-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/typescript-quality-reference/checks` when installed globally).
