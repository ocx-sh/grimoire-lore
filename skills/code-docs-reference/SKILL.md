---
name: code-docs-reference
description: Depth files and checks scripts behind the code-docs rule, loaded on demand. Use when the code-docs rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the code-docs rule
  keywords: comments,code-comments,doc-comments,docstrings,reference
  claude.user-invocable: "false"
---

# code-docs-reference

Depth for the `code-docs` rule, installed with it. The rule index says which file fits the task. Read that one file. Do not read the set.

| File | Holds |
|---|---|
| [guards.md](guards.md) | GRD rules: what a guard comment must say, where it sits, when a test, lint or type owns it |
| [length.md](length.md) | LEN rules: the per-block caps, how the census counts, and the per-file ratchet baseline |
| [linkage.md](linkage.md) | LNK rules: process IDs, record pointers and how they resolve, keeping citations alive across renames |
| [routing.md](routing.md) | RTE rules: which store holds each clause, and where essays, history and invariants go |
| [surfaces.md](surfaces.md) | SRF rules: doc text a generator publishes, banned tokens, summary lines and module front pages |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/code-docs-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/code-docs-reference/checks` when installed globally).
