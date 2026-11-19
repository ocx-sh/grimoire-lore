---
name: docs-quality-reference
description: Depth files and checks scripts behind the docs-quality rule, loaded on demand. Use when the docs-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the docs-quality rule
  keywords: documentation,docs,technical-writing,diataxis,reference
  claude.user-invocable: "false"
---

# docs-quality-reference

Depth for the `docs-quality` rule, installed with it. The rule index says which file fits the task. Read that one file. Do not read the set.

| File | Holds |
|---|---|
| [checks.md](checks.md) | Per-script reference: what each check does, how to run it, what its fixtures prove |
| [examples.md](examples.md) | DOC-EX rules: code fences, tested examples, casts, tabs, tooltips and sandboxes |
| [machine-readers.md](machine-readers.md) | What a site owes an agent reader: the Markdown twin, llms.txt, agent-directed prose |
| [navigation.md](navigation.md) | Sidebar depth cap, page-length trigger, explicit anchors, zero-result search loop |
| [observability.md](observability.md) | Link and drift gates, signal manifest, error identifiers that resolve to docs anchors |
| [page-types.md](page-types.md) | The nine page types, the declaration comment, tier and tutorial rules |
| [plain-english.md](plain-english.md) | DOC-PLAIN rules: sentence and prose limits, each with its check and measured hit count |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/docs-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/docs-quality-reference/checks` when installed globally).
