---
name: bazel-quality-reference
description: Depth files and checks scripts behind the bazel-quality rule, loaded on demand. Use when the bazel-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the bazel-quality rule
  keywords: bazel,starlark,bzlmod,module-extension,lockfile,remote-cache,hermeticity,reference
  claude.user-invocable: "false"
---

# bazel-quality-reference

Depth for the `bazel-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [architecture.md](architecture.md) | BUILD layout, visibility, select() and transitions, code generators (BZL-ARCH) |
| [bzlmod.md](bzlmod.md) | MODULE.bazel, lockfile, module extensions, repository rules, registry submission (BZL-MOD) |
| [caching.md](caching.md) | Remote and disk cache, cache credentials, RBE readiness, reading a cache miss (BZL-CACHE) |
| [ci.md](ci.md) | CI jobs, matrix legs, release lockstep, target selection, build event stream (BZL-CI) |
| [cpp.md](cpp.md) | cc_* targets, C++ toolchains, layering_check, sanitizers, wrapping CMake or Autotools (BZL-CC) |
| [flags.md](flags.md) | Bazel version bumps, rc-file and PROJECT.scl flags, ruleset Bazel floors (BZL-FLAG) |
| [go.md](go.md) | Go under Bazel: Gazelle, go_deps, nogo, x_defs stamping, cross-compiling (BZL-GO) |
| [hermeticity.md](hermeticity.md) | Genrules, actions, globs, sandbox and env flags, determinism claims (BZL-HERM) |
| [java.md](java.md) | Java and Kotlin under Bazel: JDK flags, Error Prone, maven_install pinning, deploy jars (BZL-JAVA) |
| [python.md](python.md) | py_* targets, python.toolchain(), pip.parse(), pytest, Gazelle for Python (BZL-PY) |
| [rust.md](rust.md) | Rust under Bazel: crate dependencies, repinning, build.rs, rust_test, clippy, prost (BZL-RUST) |
| [starlark.md](starlark.md) | .bzl, BUILD, macros, rules and the lint gate, including generated Starlark (BZL-LARK) |
| [swift.md](swift.md) | Swift under Bazel: rules_swift toolchains and features, swift_test, rules_swift_package_manager (BZL-SWIFT) |
| [testing.md](testing.md) | Test targets, size and timeout, sharding, Starlark tests, coverage reports (BZL-TEST) |
| [typescript.md](typescript.md) | ts_project, npm_translate_lock, pnpm lockfile, JS tests, Gazelle for JS (BZL-JS) |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/bazel-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/bazel-quality-reference/checks` when installed globally).
