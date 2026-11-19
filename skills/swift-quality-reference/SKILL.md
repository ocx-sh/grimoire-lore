---
name: swift-quality-reference
description: Depth files and checks scripts behind the swift-quality rule, loaded on demand. Use when the swift-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the swift-quality rule
  keywords: swift,swiftpm,quality,concurrency,sendable,errors,testing,cli,networking,security,reference
  claude.user-invocable: "false"
---

# swift-quality-reference

Depth for the `swift-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-design.md](api-design.md) | public surface of a library or SDK: access levels, Sendable intent, enum evolution, deprecation, logging, CLI-wrapping SDKs |
| [apple.md](apple.md) | Xcode build settings, `.xcconfig`, `project.pbxproj`, default isolation, `#available`, SwiftUI, Observation and Combine |
| [cli-contract.md](cli-contract.md) | executable contract: exit codes, argument parsing, stdout and stderr, SIGPIPE, signals, config, prompts |
| [concurrency.md](concurrency.md) | Sendable escapes, `Mutex`, actors, `@MainActor`, `Task` lifetime, continuations, streams, cancellation |
| [errors.md](errors.md) | typed throws, error shape, `try?`, force operations, traps, which layer logs |
| [io.md](io.md) | spawning processes, durable writes, content-addressed stores, external paths, archives, hashed encodings |
| [language.md](language.md) | Linux portability, toolchain floor, hallucinated APIs, existentials, `self` capture, type-check limit, `~Copyable` |
| [network.md](network.md) | HTTP client choice, timeouts, proxy and CA trust, bearer tokens, streamed blobs, retries, network error text |
| [security.md](security.md) | untrusted parsing, integer conversion, unsafe pointers, credentials, terminal-safe text, tokens, advisory floors |
| [testing.md](testing.md) | Swift Testing vs XCTest, waits, global state, exit tests, CLI harness, fixtures, coverage, sanitizer legs |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/swift-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/swift-quality-reference/checks` when installed globally).
