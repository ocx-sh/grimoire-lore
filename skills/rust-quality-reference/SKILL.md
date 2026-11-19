---
name: rust-quality-reference
description: Depth files and checks scripts behind the rust-quality rule, loaded on demand. Use when the rust-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the rust-quality rule
  keywords: rust,quality,standards,review,reference
  claude.user-invocable: "false"
---

# rust-quality-reference

Depth for the `rust-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-and-idioms.md](api-and-idioms.md) | public signatures, derive sets, conversions |
| [architecture.md](architecture.md) | types, traits, modules, crate boundaries |
| [async.md](async.md) | async, spawning, locks, timeouts, retries, cancellation |
| [cli-contract.md](cli-contract.md) | pinned exit-code table, argv parsing, stdout contract |
| [current-apis.md](current-apis.md) | crate choice and API drift since training data |
| [data-and-formats.md](data-and-formats.md) | serialization, on-disk and wire formats, parseable output |
| [diff-integrity.md](diff-integrity.md) | detecting a gate turned green by weakening it |
| [docs-and-tracing.md](docs-and-tracing.md) | doc comments, log lines, spans, diagnostic output |
| [durable-state.md](durable-state.md) | atomic writes, fsync, locks, guards, `Drop` |
| [errors.md](errors.md) | error types and what a failure returns or prints |
| [package-manager-domain.md](package-manager-domain.md) | registry resilience, retries, partial batch failure |
| [performance.md](performance.md) | changes made for speed or that could cost it |
| [platform-and-paths.md](platform-and-paths.md) | paths, filenames, archive entries, `cfg(target_os)`, the clock |
| [restructuring.md](restructuring.md) | large moves: extracting a type, splitting a crate, codemods |
| [reviewing-a-diff.md](reviewing-a-diff.md) | reviewing a diff someone else or something else wrote |
| [security.md](security.md) | registry content, archives, subprocesses, credentials, TLS |
| [testing.md](testing.md) | tests, fixtures, snapshots, test seams |
| [tui.md](tui.md) | terminal UI rendering, events, keybindings, terminal state |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/rust-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/rust-quality-reference/checks` when installed globally).
