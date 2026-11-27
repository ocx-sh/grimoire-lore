# ux-quality-reference

The support skill of the `ux-quality` rule. It carries the eleven depth files and the checks scripts the rule's index routes to, so the rule itself stays a short, path-scoped index.

It installs automatically with the rule, and with the `ux-cli`, `ux-agent-interfaces` and `ux-review` skills. Add the rule, not the skill.

```sh
grim add ghcr.io/ocx-sh/lore/ux-quality
```

The skill is not user-invocable. The agent loads it when the rule points at one of its files.
