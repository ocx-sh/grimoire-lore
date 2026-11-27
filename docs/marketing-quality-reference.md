# marketing-quality-reference

The support skill of the `marketing-quality` rule. It carries the six depth files and checks scripts the rule's index routes to, so the rule itself stays a short, path-scoped index.

It installs automatically with the rule, and with the `positioning-brief` and `marketing-review` skills. Add the rule, not the skill.

```sh
grim add ghcr.io/ocx-sh/lore/marketing-quality
```

The skill is not user-invocable. The agent loads it when the rule points at one of its files.
