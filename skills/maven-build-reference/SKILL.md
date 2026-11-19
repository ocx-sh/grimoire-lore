---
name: maven-build-reference
description: Depth files behind the maven-build rule, loaded on demand. Use when the maven-build rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the maven-build rule
  keywords: maven,pom,mvn,mvnw,enforcer,surefire,central,reference
  claude.user-invocable: "false"
---

# maven-build-reference

Depth for the `maven-build` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [ant-legacy.md](ant-legacy.md) | build.xml, Ivy, bridging or porting an Ant build (MVN-ANT) |
| [dependencies.md](dependencies.md) | Dependency scopes, BOM imports, version mediation, enforcer rules (MVN-DEP) |
| [lifecycle-and-plugins.md](lifecycle-and-plugins.md) | Compiler release, annotation processors, plugin binding, Surefire, .mvn and wrapper, Maven 4 (MVN-BUILD) |
| [publishing.md](publishing.md) | Central Portal plugin, credentials, signing, sources and javadoc jars, settings.xml servers (MVN-PUB) |
