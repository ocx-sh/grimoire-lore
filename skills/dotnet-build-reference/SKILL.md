---
name: dotnet-build-reference
description: Depth files and checks scripts behind the dotnet-build rule, loaded on demand. Use when the dotnet-build rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the dotnet-build rule
  keywords: dotnet,msbuild,csproj,nuget,analyzers,globalconfig,packaging,nupkg,reference
  claude.user-invocable: "false"
---

# dotnet-build-reference

Depth for the `dotnet-build` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [packaging.md](packaging.md) | nupkg metadata, SourceLink, symbols, deterministic packing, MinVer, package validation, Trusted Publishing, signing |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/dotnet-build-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/dotnet-build-reference/checks` when installed globally).
