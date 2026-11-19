---
name: rust-cargo-reference
description: Depth files and checks scripts behind the rust-cargo rule, loaded on demand. Use when the rust-cargo rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the rust-cargo rule
  keywords: rust,cargo,clippy,lints,supply-chain,reference
  claude.user-invocable: "false"
---

# rust-cargo-reference

Depth for the `rust-cargo` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [crates-of-record.md](crates-of-record.md) | the crate for each job, the superseded crate models reach for, DEP-01 to DEP-08 |
| [gates.md](gates.md) | the commands behind every `see block ID` cell in the rule |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/rust-cargo-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/rust-cargo-reference/checks` when installed globally).
