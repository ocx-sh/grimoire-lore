---
name: csharp-quality-reference
description: Depth files and checks scripts behind the csharp-quality rule, loaded on demand. Use when the csharp-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the csharp-quality rule
  keywords: csharp,dotnet,quality,nullable,async,process,json,api-design,testing,security,reference
  claude.user-invocable: "false"
---

# csharp-quality-reference

Depth for the `csharp-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-design.md](api-design.md) | public types, options and results, DI registration, unions, `PublicAPI`, SemVer and release order |
| [async.md](async.md) | async methods, cancellation, `ConfigureAwait`, timeouts, locks, disposal, callbacks, stderr pump |
| [binaries.md](binaries.md) | resolving, pinning, downloading, verifying and caching a native binary the library launches |
| [errors.md](errors.md) | exception hierarchy, exit-code table, passthrough exits, catch-alls, message text, behaviour table |
| [json.md](json.md) | System.Text.Json: serializer contexts, converters, open enums, tagged unions, required keys, decode failures |
| [language.md](language.md) | nullability, C# 14 and 15 features, primary constructors, records, switches, generated-code markers, `unsafe` |
| [observability.md](observability.md) | `ILogger`, log levels, `ActivitySource`, `Meter`, stderr callback, trace-context environment |
| [performance.md](performance.md) | CA18xx gate, allocations, generated regexes, `Span`, `ArrayPool`, benchmark proof |
| [platform-and-paths.md](platform-and-paths.md) | P/Invoke, path joining, home resolution, filenames, number and date formatting, Windows-only APIs, clocks |
| [processes.md](processes.md) | launching and stopping the wrapped tool: argv, resolver, environment scrub, stream draining, tree kill, exit mapping |
| [security.md](security.md) | security analyzers, ban file, regex timeouts, type resolution, randomness, dependency budget, licences, signatures |
| [testing.md](testing.md) | test tiers, fake-CLI harness, MTP runner, zero-test gate, coverage, snapshots, CI matrix |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/csharp-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/csharp-quality-reference/checks` when installed globally).
