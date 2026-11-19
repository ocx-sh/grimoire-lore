# go-modules-reference

The support skill of the `go-modules` rule. It carries the depth files and the three golangci-lint config files the rule's index routes to, so the rule itself stays a short, path-scoped index.

It installs automatically with the rule. Add the rule, not the skill.

```sh
grim add ghcr.io/ocx-sh/lore/go-modules
```

The skill is not user-invocable; the agent loads it when the rule points at one of its files.
