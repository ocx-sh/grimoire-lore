# code-docs-reference

The support skill of the `code-docs` rule. It carries the depth files and checks scripts the rule's index routes to, so the rule itself stays a short, path-scoped index.

It installs automatically with the rule. Add the rule, not the skill.

```sh
grim add ghcr.io/ocx-sh/lore/code-docs
```

The skill is not user-invocable. The agent loads it when the rule points at one of its files.
