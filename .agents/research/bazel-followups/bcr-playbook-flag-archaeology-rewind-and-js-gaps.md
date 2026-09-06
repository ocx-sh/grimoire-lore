---
title: "BCR visibility playbook, the 8.8.0-to-9.0.0 remote-flag removals, --rewind_lost_inputs, bazel-remote's HTTP behaviour, and two JS structural gaps"
slug: bcr-playbook-flag-archaeology-rewind-and-js-gaps
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-06
sources_count: 46
primary_sources_count: 45
answers_for:
  - bazel-bzlmod-and-repo-rules.md
  - bazel-caching-rbe.md
  - bazel-typescript.md
affects_rule_ids: [M-B-15, BZL-CACHE-12, BZL-JS-29, NEW-MOD-34, NEW-CACHE-35, NEW-CACHE-36, NEW-CACHE-37, NEW-JS-33]
---

# BCR playbook, flag archaeology, rewind, and JS gaps

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [1. BCR module surface: what reviewers ask for, and the query that verifies it](#1-bcr-module-surface-what-reviewers-ask-for-and-the-query-that-verifies-it)
  - [2. What removed the two 8.x remote flags, and the chunking-function PR](#2-what-removed-the-two-8x-remote-flags-and-the-chunking-function-pr)
  - [3. `--rewind_lost_inputs`: mechanism, defaults, and the rewind ceiling](#3---rewind_lost_inputs-mechanism-defaults-and-the-rewind-ceiling)
  - [4. bazel-remote's HTTP behaviour vs. Bazel's Netty client](#4-bazel-remotes-http-behaviour-vs-bazels-netty-client)
  - [5. Two JS structural gaps: mixed pnpm/npm under Gazelle, and `@vscode/test-electron`](#5-two-js-structural-gaps-mixed-pnpmnpm-under-gazelle-and-vscodetest-electron)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)
- [Scratch left on disk](#scratch-left-on-disk)

## Summary

- **BCR's own playbook names both directions.** `docs/bcr-policies.md`'s "BCR maintainer playbook" says, verbatim: "Encourage PR authors to keep the set of publicly visible targets small," in the same bullet that says authors "sometimes forget `//visibility:public`" for the one target that should carry it. The repo's automated Gemini reviewer compresses this to one line: "visibility is minimal but includes `//visibility:public` for intended APIs."
- **15 sampled merged PRs confirm one consistent pattern, both human and bot review.** `package(default_visibility = ["//visibility:private"])` plus exactly one public target (often via a private-target-plus-public-alias split) is what gets requested; a `package(default_visibility = ["//visibility:public"])` gets a change request every time it's found (PRs #6739, #7354, #6920, #8498, #10068).
- **`attr(visibility, "//visibility:public", //...)` is the correct verification query; `visible(//..., //...)` is not**, and this was measured, not just read. `visible(predicate, input)` keeps `x ∈ input` only if `x` is visible to **every** target in `predicate` — with `predicate = input = //...`, that is "visible to literally everything in the workspace," a far stricter and differently-shaped bar than "is `//visibility:public`." In a two-package fixture, `visible(//..., //...)` silently included a target scoped `//visibility:public` and one scoped to a single sibling package, and excluded a private one — never matching the actual "externally reachable" set on repos larger than one package.
- **`visible()` is still a live query function on 9.2.0**, confirmed identical on 8.7.0 and 9.2.0 (same grammar, same result on the same fixture). **`cquery` explicitly does not support it** — documented ("`cquery` supports all but ... `visible`") and reproduced ("`visible() is not supported on configured targets`") on both versions. `attr(visibility, ...)` works under both `query` and `cquery`.
- **`cquery` enforces visibility; plain `query` does not.** Measured: `bazel query 'deps(//consumer:consumer)'` happily walked an edge into a private target with no error; `bazel cquery '//consumer:consumer'` on the identical graph failed with the same "Visibility error" `bazel build` produces, on both 8.7.0 and 9.2.0. Visibility is an analysis-time check; `query` never reaches analysis.
- **Both "phantom" 8.x remote flags have named commits, and they are two different PRs, not one.** `--incompatible_remote_use_new_exit_code_for_lost_inputs` was deleted by [`91b1e8e2`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3) (2025-02-20, closing [PR #25334](https://github.com/bazelbuild/bazel/pull/25334), closed unmerged the same day — a community PR whose fix landed instead via Google's internal sync). `--experimental_remote_merkle_tree_cache`(`_size`) was deleted eight months later by an unrelated commit, [`30ca50950f`](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d) ("Rework the Merkle tree cache," 2025-10-14, closing [PR #25650](https://github.com/bazelbuild/bazel/pull/25650), same closed-unmerged pattern). The corpus had attributed both to #25334; that citation is only correct for the exit-code flag.
- **The 9.0.0 release-notes appendix under-documents the merkle-tree removal.** The exit-code flag is itemised under "The following flags have been removed"; the merkle-tree flag is not — its removal is described only narratively ("reworked... up to 30% wall time... reduction"), with no flag name.
- **`--experimental_remote_cache_chunking_function` never merged.** [PR #30585](https://github.com/bazelbuild/bazel/pull/30585) (targeting `release-8.8.0`) is closed, `merged: false`, zero comments; `ChunkingFunction` in 8.8.0's `GrpcCacheClient.java` still only ever sets `FAST_CDC_2020`. Confirmed absent from 8.8.0 and 9.0.0 source directly (not just a CLI-reference grep).
- **`--rewind_lost_inputs` is not "absent from 8.7.0" — it is present, functional, and hidden.** Direct source at every tag from 8.7.0 through 9.1.0 shows the flag with `documentationCategory = UNDOCUMENTED` (invisible to `bazel help build --long`, which is how the earlier measurement concluded "absent"); it flips to `documentationCategory = REMOTE` (publicly documented) only at 9.2.0. Empirically confirmed: `bazel build --rewind_lost_inputs //pkg:x` **succeeds** on a real 8.7.0 binary. The 9.0.0 release notes never mention it; 9.1.0's release notes announce it ("Bazel now has experimental support for `--rewind_lost_inputs`... to recover from (remote or disk) cache evictions," [#28958](https://github.com/bazelbuild/bazel/pull/28958)) while the flag is *still* `UNDOCUMENTED` in that same tag's source.
- **The "#21" rewind ceiling is not the constant — it's the constant plus one.** `ActionRewindStrategy.java`'s `MAX_REPEATED_LOST_INPUTS = 20` is identical, byte-for-byte, on 8.7.0, 8.8.0, 9.0.0, 9.1.0 and 9.2.0. The failure fires at `losses > 20`, i.e. on the 21st repeated loss of the same input for the same action, and the error text substitutes the current `losses` value (21) — so "#21" is what a *failure at the ceiling* looks like, not the ceiling itself.
- **Bazel's Netty HTTP cache client documents, in its own Javadoc, that it does not send `Expect: 100-CONTINUE`** ("as this would incur an additional roundtrip for every upload... with little practical value"), unchanged from 8.7.0 through 9.2.0. `HttpUploadHandler.buildRequest` sets no `Expect` header. The earlier measurement fixture's framing ("Bazel's Netty client sends Expect: 100-continue on PUT") is not supported by source and is very likely a fixture-side artefact, not a Bazel behaviour to defend against.
- **The empty-response `Content-Length` requirement is real, but real `bazel-remote` never hits it.** `buchgr/bazel-remote`'s successful-PUT path (`server/http.go`) never calls `w.Header().Set("Content-Length", ...)` or `w.WriteHeader()` at all — it relies on Go's `net/http` server, which supplies `Content-Length: 0` automatically for a handler that writes no body. The ad hoc Python `http.server`-based measurement fixture needed the explicit fix only because Python's raw handler does not do this for free. **Verdict: fixture-side, not Bazel-side, on both ends of the wire.**
- **`aspect_gazelle_js`'s pnpm-project model is lockfile-driven, not workspace-glob-driven** — a package is a "project" only if its directory is an `importers:` key in the one configured `pnpm-lock.yaml`, regardless of what `pnpm-workspace.yaml` globs match. `creeptd-ng`'s exact shape (`web` glob-listed in `pnpm-workspace.yaml`, actually npm-managed, so absent from `pnpm-lock.yaml`'s importers) means `IsProject("web")` is false, `npm_link_all_packages` never gets generated for it, and every third-party import inside it resolves to `Resolution_NotFound`. With the plugin's own default (`js_validate_import_statements = error`), that is a **hard, named, generation-time failure** ("Import ... is an unknown javascript dependency"), not a silent gap — the same "loud, not silent" shape the corpus already found for rules_python's import validation.
- **`@vscode/test-electron` under Bazel is a solved (if costly) problem, not a structural non-starter — there is a real, working, production example.** `angular/angular`'s own monorepo runs `vscode-ng-language-service`'s `@vscode/test-electron` + `xvfb` integration suite as a genuine `js_test`, with `tags = ["e2e", "no-remote-exec", "requires-network"]`. This corrects BZL-JS-29's "no Bazel path at all" for this specific tool. The real costs, read straight from that BUILD file and its `index.ts`: `requires-network` (VS Code is downloaded at test-run time, every clean invocation, with no Bazel-level caching of the ~100MB+ binary); `no-remote-exec` (RBE workers have no Xvfb); Xvfb itself comes from an **npm package that shells out to a host-installed `Xvfb` binary** — not a Bazel toolchain, so CI images must provide it; and a documented Bazel-sandbox gotcha (writing VS Code's user-data lock socket directly under `TEST_TMPDIR` fails `EROFS`, worked around with a separate `mkdtemp` under the host tmpdir).

## Answers

### 1. BCR module surface: what reviewers ask for, and the query that verifies it

**Findings.**

`docs/bcr-policies.md`'s "BCR maintainer playbook" section is the closest thing to a canonical policy statement, and it says two things in the same bullet:

> "When a PR contains C++ modules with BUILD patches or overlays, double check visibility specifications. PR authors sometimes forget `//visibility:public`, and this is often not caught unless the presubmit.yml has a test module. Encourage PR authors to keep the set of publicly visible targets small." — [`docs/bcr-policies.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/bcr-policies.md)

The repository's automated PR reviewer config, `.gemini/styleguide.md` (Gemini Code Assistant, active on real PRs — its comments show up verbatim in the sample below), compresses the same rule to one line under "Strong suggestions": *"For C++ overlays: ensure a public target named after the module (or alias `libfoo` -> `foo`); visibility is minimal but includes `//visibility:public` for intended APIs."* ([`.gemini/styleguide.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/.gemini/styleguide.md)). No automated visibility check exists in `tools/bcr_validation.py` — enforcement is entirely human/bot review plus whatever a module's own optional `presubmit.yml` test-module build happens to catch.

Fifteen merged PRs, sampled via `gh api search/issues?q=repo:bazelbuild/bazel-central-registry+visibility+is:pr+is:merged` and read for comment content (#10186, #10068, #9879, #9486, #9218, #9021, #9764, #8498, #8448, #6739, #7354, #7744, #8202, #7698, #6920), show one consistent shape:

- **#10068** (`libgps`): "The pattern in this file is a private target plus a public alias, so please drop `visibility` from the `gpsmm` rule and let `:libgpsmm` be the single public entry point."
- **#9879** (`liburing`): "Please add `visibility(\"private\")` so that this can't be depended on by other modules."
- **#8498** (`opentelemetry-cpp`): "We try to avoid this since any public target becomes public API we can't touch without potentially breaking users. How about only making the primary target publicly visible?"
- **#6739** (`sqlite_orm`) and **#6920**: the Gemini bot flags `package(default_visibility = ["//visibility:public"])` as "too permissive," quoting the styleguide line, and a human reviewer separately writes: "According to the BCR style guide, visibility should be minimal... It's better to set a restrictive default visibility for the package and explicitly export the public API target."
- **#7698** (`meson`): "If you don't need to import Meson's internals, then keeping it private helps reduce the API surface area of the Bazel module and therefore makes backwards-compatibility easier to reason about." (Author's reply: "no need to expose internal library anymore.")
- **#7354**: a reviewer quotes the styleguide line by name ("See style guide line 20") against an overlay that made everything public.

None of the fifteen asked for *more* public surface than "the one intended entry point." The "forgot `//visibility:public`" half of the playbook line is real but narrower in practice than the map row's framing suggested — it fires specifically when a C++ overlay's canonical, module-named target itself lacks the visibility it needs to be usable at all (e.g. #9764, where `rules_qt`'s own upstream setting wasn't public and broke the presubmit).

For the query half: three candidates were verified directly against real 8.7.0 and 9.2.0 binaries (`bazelisk` via `ocx exec`, not read from documentation alone), on a fixture with a `//visibility:private`-default package holding a `//visibility:public` target, a `//visibility:private` target, and a target scoped to one sibling package (`//other:__pkg__`), plus a second package with its own private target.

```
$ bazel query 'attr(visibility, "//visibility:public", //...)'
//pkg:public_lib                                    # correct on both 8.7.0 and 9.2.0

$ bazel query 'visible(//..., //...)'
//pkg:custom_vis_lib
//pkg:public_lib                                     # WRONG: includes the sibling-scoped target,
                                                      # excludes nothing that a real audit needs excluded
                                                      # by accident of this fixture's shape, not by design
```

`site/en/query/language.md` (tag-pinned, both 8.7.0 and 9.2.0, byte-identical wording) defines `visible(predicate, input)` precisely: *"a `visible` expression evaluates to the set containing all targets x such that x is a member of the set input, and for all targets y in predicate, x is visible to y."* With `predicate = input = //...`, this asks "is x visible to **every** target that exists in the queried universe" — a target scoped to one sibling package, `//other:__pkg__`, passes this bar as long as every *other* target in the universe happens to also satisfy it trivially or by grant; a genuinely `//visibility:private` target in a single-package fixture also passes (same-package visibility is always trivially satisfied when `predicate` never leaves that package). The two-package repro above is what exposes the difference: `visible(//..., //...)` returned the sibling-scoped target and dropped the private one, which is a *different set* from "the externally reachable public surface," and it gets more expensive and more different from the intended semantics as package count grows — not a query that "cannot miss," in this program's usual phrasing.

`cquery`'s own doc, at both tags, states support explicitly: *"Of the set of functions supported by `query`, `cquery` supports all but `allrdeps`, `buildfiles`, `rbuildfiles`, `siblings`, `tests`, and `visible`."* ([`site/en/query/cquery.md`](https://github.com/bazelbuild/bazel/blob/9.2.0/site/en/query/cquery.md)) Reproduced: `bazel cquery 'visible(//..., //...)'` fails identically on 8.7.0 and 9.2.0 with `ERROR: Error doing post analysis query: Evaluation failed: visible() is not supported on configured targets`. `attr(visibility, ...)` works fine under `cquery` on both versions.

Separately — and this answers "does `cquery` respect visibility" more usefully than the `visible()` question does — `cquery`, because it configures targets like a real build, **enforces** visibility restrictions on dependency edges; plain `query` does not, because visibility is an analysis-time check and `query` only inspects the loading-phase target graph. Measured: `bazel query 'deps(//consumer:consumer)'` against a `consumer` target with an illegal dependency on a private target returned the edge with no complaint on both versions; `bazel cquery '//consumer:consumer'` on the identical graph produced the same `Visibility error: target '//pkg:private_lib' is not visible from target '//consumer:consumer'` that `bazel build` produces, on both 8.7.0 and 9.2.0, byte-identical error text.

**Answer.** BCR reviewers — human and the repo's own Gemini bot — consistently ask for the narrower of the two possible readings: `package(default_visibility = ["//visibility:private"])` plus exactly one public target (the module's canonical entry point, sometimes via a private-target-plus-public-alias split), never a package-wide `//visibility:public` default. The verification that matches this is `bazel query 'attr(visibility, "//visibility:public", //...)'`, which works identically and correctly on 8.7.0 and 9.2.0 under both `query` and `cquery`. `visible(//..., //...)` is a real, unchanged, still-live query function on both versions, but it computes a different and stricter thing ("visible to literally every target in the queried universe") that does not track "externally reachable" once a repo has more than one package, and it is explicitly unsupported under `cquery`. `cquery` enforces visibility on real dependency edges (an illegal edge fails cquery exactly as it fails build); plain `query` never enforces it at all.

### 2. What removed the two 8.x remote flags, and the chunking-function PR

**Findings.**

`--incompatible_remote_use_new_exit_code_for_lost_inputs`: confirmed absent from `RemoteOptions.java`/`ExecutionOptions.java` at the 9.0.0 tag, present at 8.8.0. `git log --oneline 8.8.0..9.0.0 -- src/main/java/.../exec/ExecutionOptions.java` names one commit that touches it: [`91b1e8e28afc7f76ed5930b469b23fd13303eda3`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3), "Delete `--incompatible_remote_use_new_exit_code_for_lost_inputs`," authored by Fabian Meumertzheim, 2025-02-20:

> "The flag has been flipped in Bazel 7 and constitutes a very minor change that nonetheless complicates remote execution exception handling. RELNOTES: Flag `--incompatible_remote_use_new_exit_code_for_lost_inputs` is deleted. Closes #25334."

[PR #25334](https://github.com/bazelbuild/bazel/pull/25334) — same title, `state: closed`, `merged_at: null` — confirms the corpus's "closed unmerged" observation exactly, and explains the mechanism: a community PR proposing the deletion was superseded by Google's internal Copybara/Piper sync landing the identical change (`PiperOrigin-RevId: 729102270`) the same day, which then closed the GitHub PR by reference without a GitHub-side merge. The diff itself (`AbstractSpawnStrategy.java`, `RemoteSpawnRunner.java`) removes a conditional — before this commit, `Code.REMOTE_CACHE_EVICTED` (exit 39) fired only when `useNewExitCodeForLostInputs || remoteRetryOnTransientCacheError > 0`; since the flag defaulted `true` since Bazel 7 per the commit message, the condition was already unconditionally true in practice, and this change only deletes now-dead branches. It does not alter the eviction-retry logic itself. It is itemised in the 9.0.0 release notes both under "Remote Execution" (`**[Incompatible]** Flag ... is deleted.`) and in the closing "Appendix: The following flags have been removed" list.

`--experimental_remote_merkle_tree_cache` (and its sibling `_size`): confirmed absent from 9.0.0's `RemoteOptions.java`, present at 8.8.0. The corpus's earlier citation of #25334 for this flag as well does **not** hold — `git log --oneline 8.8.0..9.0.0` on that same file surfaces a *different*, unrelated commit: [`30ca50950fdaff032925efe64c2690a9f05e074d`](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d), "Rework the Merkle tree cache," same author, dated 2025-10-14 (eight months later, and a much larger 38-file, 1562/2486-line change):

> "This change introduces a different approach: The final proto messages describing the tree are generated directly from just the sorted list of spawn inputs... Merkle trees are cached for composite, self-contained artifacts... Work towards #21378. Closes #25650."

The diff directly removes the `experimental_remote_merkle_tree_cache`/`_size` `@Option` blocks from `RemoteOptions.java` (24 lines deleted, nothing added back under those names). [PR #25650](https://github.com/bazelbuild/bazel/pull/25650) shows the identical closed-unmerged pattern as #25334: same author, `merged_at: null`, closed the same day the internal commit landed. This is a memory/perf rewrite of the Merkle-tree-construction pipeline itself (issue #21378, about caching proper subtrees rather than re-merging arbitrary ones) — it has nothing to do with the lost-input/eviction-retry path, so "did anything else in the same change alter the eviction path?" is answered **no** for both commits: the exit-code commit only deletes a dead conditional in the *already-unconditional* eviction-error path, and the Merkle-tree commit is an unrelated perf rewrite.

One documentation gap worth flagging on its own: the 9.0.0 release notes' "Appendix: flags removed" list contains the exit-code flag by name, but **not** the merkle-tree flag — its removal is described only narratively under "Remote Execution" ("The Merkle tree implementation used by remote caching and execution has been reworked, resulting in up to a 30% wall time and 70% peak heap reduction"), with no flag name attached. An agent that greps only the appendix list for removed flags would miss this one.

`--experimental_remote_cache_chunking_function` / [PR #30585](https://github.com/bazelbuild/bazel/pull/30585): `state: closed`, `merged: false`, base branch `release-8.8.0`, zero comments, closed 2026-08-05 — about a month before this session's era date. The PR's own description confirms the corpus's premise (it would add `--experimental_remote_cache_chunking_function={auto,fast_cdc_2020,rep_max_cdc}`, negotiated against server capabilities), including an author disclaimer that the Java port of the reference Go algorithm was written with AI assistance and manually reviewed. Direct source confirms it never landed: `GrpcCacheClient.java` at both 8.8.0 and 9.0.0 hardcodes `ChunkingFunction.Value.FAST_CDC_2020` at every call site, and no `chunking_function`-named option exists anywhere in either tag's `RemoteOptions.java`. The corpus's "zero hits" CLI-reference finding is correct and now has a source-level explanation: the PR that would add it never merged.

**Answer.** Two separate commits, not one: `91b1e8e2` (2025-02-20, closing #25334) deleted the exit-code flag; `30ca50950f` (2025-10-14, closing #25650) deleted the merkle-tree-cache flags as an incidental side effect of an unrelated Merkle-tree-construction rewrite. Both PRs are community submissions that Google's internal sync process superseded and closed unmerged on GitHub the same day their internal counterpart landed — this is the general shape to expect for a "closed unmerged" Bazel PR that nonetheless clearly shipped, not evidence the change was rejected. Neither commit touches the eviction-retry mechanism itself. `--experimental_remote_cache_chunking_function` from PR #30585 never merged anywhere and does not exist in any shipped Bazel version through 9.2.0.

### 3. `--rewind_lost_inputs`: mechanism, defaults, and the rewind ceiling

**Findings.**

The flag lives in `BuildRequestOptions.java` (not a dedicated `RewindingOptions` file, and not under `remote/options/`, despite `documentationCategory = REMOTE`):

```java
@Option(
    name = "rewind_lost_inputs",
    defaultValue = "false",
    documentationCategory = OptionDocumentationCategory.REMOTE, // 9.2.0 only
    effectTags = {OptionEffectTag.EXECUTION},
    help = "Whether to use action rewinding to recover from lost inputs.")
public boolean rewindLostInputs;
```

Fetched and diffed directly against every relevant tag (`raw.githubusercontent.com/bazelbuild/bazel/<tag>/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java`):

| Tag | Present? | `documentationCategory` |
|---|---|---|
| 8.7.0 | yes | `UNDOCUMENTED` |
| 8.8.0 | yes | `UNDOCUMENTED` |
| 9.0.0 | yes | `UNDOCUMENTED` |
| 9.1.0 | yes | `UNDOCUMENTED` |
| 9.2.0 | yes | `REMOTE` |

`UNDOCUMENTED` means the flag is invisible to `bazel help build --long` (which is exactly the surface the earlier measurement used to conclude "absent"), not that the flag is missing or non-functional. Verified live on the real 8.7.0 binary in this session: `bazel build --rewind_lost_inputs //pkg:public_lib` **succeeds**, and `bazel help build --long | grep -c rewind_lost_inputs` returns `0` on the same binary — the flag is real, settable, and simultaneously invisible to the help surface the corpus's table was built from. The corpus's own flag-defaults table ([`bazel-caching-rbe.md:74`](../bazel-caching-rbe.md)) lists `--rewind_lost_inputs` as "**absent**" on both 8.7.0 and 8.8.0; that is correct only for `--long` help output, and should read "present, `UNDOCUMENTED`" for both.

The release-note trail confirms the hiding was deliberate, not an oversight: the 9.0.0 release notes never mention `--rewind_lost_inputs` at all (`gh api repos/bazelbuild/bazel/releases/tags/9.0.0 --jq .body | grep -i rewind` returns nothing). The 9.1.0 release notes announce it in prose while the flag *itself* is still `UNDOCUMENTED` in that same tag's source:

> "Bazel now has experimental support for `--rewind_lost_inputs`, which can rerun actions within a single build to recover from (remote or disk) cache evictions." ([PR #28958](https://github.com/bazelbuild/bazel/pull/28958))

This is the primary-source answer to "what it recovers": **remote or disk cache evictions**, in Bazel's own words — not a general "someone deleted my output tree" scenario. The 9.2.0 release notes carry one further, narrower fix: "a spurious remote-execution failure with `--experimental_output_paths=strip` where a lost input in a tree artifact shared between actions could not be recovered by action rewinding" ([PR #30193](https://github.com/bazelbuild/bazel/pull/30193)) — evidence the mechanism was already load-bearing enough by 9.2.0 to have its own edge-case bugfix.

`ActionRewindStrategy.java`'s class doc states the mechanism precisely: *"Given an action that failed to execute because of lost inputs which were generated by other actions, finds the actions which generated them and the set of Skyframe nodes which must be rewound in order to recreate the lost inputs."* This is Skyframe-level re-execution of the actions that *produced* the missing intermediate — it recovers an evicted/missing artifact by regenerating it from its own generating action within the same build graph, which is exactly the shape of a CAS-eviction or disk-cache-eviction loss, not an arbitrary local file deletion of a source input (which has no "generating action" to rewind).

The rewind ceiling: `MAX_REPEATED_LOST_INPUTS = 20`, a `@VisibleForTesting static final int` in `ActionRewindStrategy.java`, confirmed byte-identical (same value, same surrounding code shape) at 8.7.0, 8.8.0, 9.0.0, 9.1.0 and 9.2.0. The check is `if (losses > MAX_REPEATED_LOST_INPUTS)` where `losses` is the post-increment count (so the 21st occurrence trips it), and the failure message is built from that same `losses` variable:

```java
String message = String.format(
    "lost input too many times (#%s) for the same action. lostInput: %s, "
        + "lostInput digest: %s, failedAction: %.10000s",
    losses, lostInput, digest, failedAction);
```

This is the literal source of the "#21" the earlier measurement observed and could not trace: the fixed constant is 20 (repeated losses tolerated), and the observed number in any failure message is always one more than that. A separate, unrelated constant, `MAX_ACTION_REWIND_EVENTS = 5`, caps only telemetry-sample recording (`rewindEventSamples`) and has no bearing on retry behaviour.

`--experimental_remote_cache_eviction_retries` (default `5` on both majors, confirmed again directly from `ExecutionOptions.java` at 9.2.0) is a wholly separate, higher-level mechanism: it retries the **entire invocation** with a fresh invocation ID on a transient remote-cache error, where `--rewind_lost_inputs` rewinds specific Skyframe nodes **within** one invocation. Both existed as independent knobs by the time `--rewind_lost_inputs` shipped; nothing in either flag's help text or source makes one imply the other, though the corpus's existing measurement (`exit-39-and-bwob-on-cache-only-build.md` Q4d) already tested the two extremes (both effectively off; rewind on with client retry off) and found the internal Skyframe ceiling reachable independently of the client-level retry count.

**Answer.** `--rewind_lost_inputs` recovers lost inputs that are *outputs of other actions in the same build* — evicted from a remote cache or a local disk cache — by rewinding (re-running) the actions that generated them; it is not a mechanism for recovering an arbitrary deleted local file with no generating action. Default is `false` on every version it exists in (8.7.0 through 9.2.0); it exists as real, functional, settable code from 8.7.0 onward but is hidden from `bazel help --long` (category `UNDOCUMENTED`) through 9.1.0, becoming a documented, public flag only at 9.2.0 — the fleet's 8.7.0 pin can use it today, contrary to what "absent" implied. It interacts with `--experimental_remote_cache_eviction_retries` (default 5, unchanged across majors) as a second, independent, lower-level recovery layer, not a superset or subset of it. The documented ceiling is a fixed source constant, `MAX_REPEATED_LOST_INPUTS = 20`, stable across every checked version — a failure fires on the 21st repeated loss of the same input for the same action, which is why observed failure text always reads "#21," never "#20."

### 4. bazel-remote's HTTP behaviour vs. Bazel's Netty client

**Findings.**

Bazel's own `HttpCacheClient.java` (the class implementing the exact PUT path in question) carries this class-level Javadoc, unchanged from 8.7.0 through 9.2.0:

> "Uploads do not use `Expect: 100-CONTINUE` headers, as this would incur an additional roundtrip for every upload and with little practical value as we would expect most uploads to be accepted."

`HttpUploadHandler.buildRequest()` confirms this in code — it sets `HOST`, `ACCEPT`, `CONTENT_LENGTH` and `CONNECTION: keep-alive`, and nothing named `Expect` anywhere in the file. Netty never adds an `Expect: 100-continue` header on its own; a caller must opt in explicitly (`HttpUtil.set100ContinueExpected`), and Bazel's client does not. This is authoritative, version-checked, primary-source evidence that Bazel's client does **not** send `Expect: 100-continue` on PUT, contradicting the earlier measurement fixture's stated assumption. (An attempt to capture the literal request bytes off the wire in this session's sandbox hit a network-binding permission wall on the raw-socket listener used for the attempt; the source-level Javadoc plus the fact that it is a documented, deliberate design decision — not an implementation accident — is treated as the stronger and sufficient evidence here.)

`buchgr/bazel-remote`'s `server/http.go` handles a successful `PUT` with:

```go
default:
    // ... blob written to cache ...
} else {
    h.logResponse(http.StatusOK, r)
}
```

— no explicit `w.Header().Set("Content-Length", ...)`, no explicit `w.WriteHeader(http.StatusOK)`. This relies entirely on Go's `net/http` server defaults: a handler that writes no body and never calls `WriteHeader` gets an automatic `200 OK` with an automatically-computed `Content-Length: 0` (a well-known, documented `net/http` behaviour — see `pkg.go.dev/net/http#ResponseWriter`). Nowhere in `server/http.go` or `server/grpc*.go` does bazel-remote's own code mention `Expect` or `100-continue`; Go's standard library `net/http` transparently sends the `100 Continue` interim response for any request carrying that header, with zero application code required.

This closes the loop precisely: the earlier ad hoc Python `http.server`-based measurement fixture needed an explicit `Content-Length: 0` fix on its empty-body 200 response because Python's raw `BaseHTTPRequestHandler` does **not** compute this automatically — the application code must set it. A real `bazel-remote` deployment (Go, `net/http`) gets the same correctness property for free, without needing the fix the fixture needed. Combined with Bazel's own documented refusal to send `Expect: 100-continue` at all, neither half of the fixture's diagnosed quirk describes a real `bazel-remote ↔ Bazel` interaction — the ambiguous-framing risk under HTTP/1.1 keep-alive that the fixture correctly reasoned about in the abstract (no `Content-Length`, no chunked encoding, no connection-close on a keep-alive response is genuinely ambiguous to any conformant client) never actually arises between these two real, production pieces of software, because both sides independently already do the right thing by construction.

**Answer.** Bazel's Netty-based `HttpCacheClient` explicitly does not send `Expect: 100-continue` (documented in its own Javadoc, stable across the fleet's version range) — the earlier fixture's framing of that half is not supported by source and reads as a fixture-side artefact. The empty-body-response `Content-Length` requirement is a real HTTP/1.1 keep-alive mechanic, but real `bazel-remote` never needs the explicit fix the Python measurement fixture needed, because Go's `net/http` supplies `Content-Length: 0` on an empty-body response automatically. **Last night's fixture quirk was fixture-side on both counts** — an artefact of building an ad hoc server on Python's low-level HTTP primitives, not a Bazel-side requirement or a real `bazel-remote` behaviour to defend against.

### 5. Two JS structural gaps: mixed pnpm/npm under Gazelle, and `@vscode/test-electron`

**Findings — (a) `aspect_gazelle_js` against a mixed pnpm/npm workspace.**

Traced directly through `aspect_gazelle_js` 1.2.1's Go source (`language/js/{configure,generate,resolve,config}.go`, `language/js/pnpm/workspace.go`):

1. `readConfigurations()` in `configure.go` parses **exactly one** `pnpm-lock.yaml` per configured scope (`# gazelle:js_pnpm_lockfile`, inherited to subdirectories, default `pnpm-lock.yaml`), and separately records **every** directory with a `package.json` in `packageJsonDirs` regardless of pnpm membership ("packages - pnpm or arbitrary package.json files"). `web`'s `package.json` is discovered either way.
2. `addPnpmLockfile()` builds the `PnpmProjectMap` purely from that lockfile's parsed `importers:` map (`for project, packages := range parsedLockfile.(...WorkspacePackageVersionMap)`) — **not** from `pnpm-workspace.yaml`'s glob patterns. A directory that `pnpm-workspace.yaml` lists but that `pnpm` itself never actually installed (because it's npm-managed) simply never appears as an importer, so it is not a "project" by this plugin's model, no matter what the workspace file says.
3. `generate.go`: `isPnpmPackage := ts.pnpmProjects.IsProject(args.Rel)` gates **both** the public `npm_package`/`js_library` target and (separately, at the `addLinkAllPackagesRule` call site) the `npm_link_all_packages` target. For `web`, this is `false`, so neither gets generated.
4. `resolve.go`'s `findPackage()` resolves a bare-specifier import (e.g. `import react from 'react'`) by walking `ts.pnpmProjects.GetProject(from)` up the directory tree to the nearest registered pnpm project, then looking up the import name in *that* project's own `packages` map (itself built from that project's own pnpm-lock entries). For a source file inside `web`, this either finds no project at all, or — if a pnpm-lock `importers: "."` root entry exists (typical even in workspace setups) — finds the *root* project, whose own dependency list does not include `web`'s npm-managed dependencies either way. Either path yields `Resolution_NotFound`.
5. `resolve.go`'s import-validation loop treats `Resolution_NotFound` as an error whenever `cfg.ValidateImportStatements() != ValidationOff`, and `config.go` sets the default to `validateImportStatements: ValidationError` (the README documents the same default: `js_validate_import_statements error|warn|off` → default `error`). On `ValidationError`, every unresolved import produces `common.ImportErrorf(c, "Failed to validate dependencies for target %q:%v\n", from, joinedErrs)` — a hard Gazelle-generation failure naming the exact import and target, not a silent gap in the generated BUILD file.

No documented account of exactly this scenario exists — searches across `aspect-build/aspect-gazelle` issues and PRs for "pnpm-workspace," "npm_link_all_packages," "mixed," and "not a pnpm" returned nothing on point (the one live, adjacent issue, [#461](https://github.com/aspect-build/aspect-gazelle/issues/461), is the already-known pnpm-12-lockfile-format parser bug, unrelated to package-manager mixing). This is a source-traced mechanism finding, not a documented-attempt finding — consistent with the prior round's own framing that nobody has run this fixture.

**Answer (a).** Against creeptd-ng's exact shape, `aspect_gazelle_js` discovers `web`'s `package.json` (files are walked independent of pnpm membership) but never treats it as a pnpm project (membership is decided by the lockfile's `importers:` keys, never by `pnpm-workspace.yaml`'s glob patterns), so it generates **no** `npm_link_all_packages` target and **no** public package target for `web` at all. Every third-party import inside `web` resolves to "not found," and with the plugin's own default (`error`), Gazelle generation for `web` **fails outright** with a named "unknown javascript dependency" error per unresolved import — loud, not silent, mirroring the corpus's existing rules_python finding. What it requires to work: `web` must actually become a pnpm-workspace member (real `pnpm install` at the workspace root, converting off `package-lock.json` entirely, so it appears as a genuine `importers:` entry) — there is no other third-party-resolution path in this plugin (no npm/yarn/bun lockfile ingestion exists alongside the pnpm one). Short of that conversion, the only non-error options are `# gazelle:js_validate_import_statements off` (or `warn`) scoped to `web`, or excluding `web` from JS/TS generation entirely and hand-maintaining its BUILD file — both of which forfeit automatic third-party dependency wiring for that package.

**Findings — (b) `@vscode/test-electron` under Bazel.**

A GitHub code search for `"@vscode/test-electron" bazel` surfaces a real, currently-live example: `angular/angular`'s own monorepo runs `vscode-ng-language-service`'s integration/e2e suite — a genuine `@vscode/test-electron` + `xvfb` test — as a Bazel target.

[`vscode-ng-language-service/integration/e2e/BUILD.bazel`](https://github.com/angular/angular/blob/main/vscode-ng-language-service/integration/e2e/BUILD.bazel):

```python
load("@aspect_rules_js//js:defs.bzl", "js_test")

js_test(
    name = "test",
    data = [":e2e", ...],
    entry_point = ":index.js",
    env = {"DBUS_SESSION_BUS_ADDRESS": "/dev/null"},
    tags = [
        "e2e",
        "no-remote-exec",   # "Cannot use RBE as Xvfb is not available."
        "requires-network",
    ],
)
```

[`integration/e2e/index.ts`](https://github.com/angular/angular/blob/main/vscode-ng-language-service/integration/e2e/index.ts) drives it: `import {runTests} from '@vscode/test-electron'; import Xvfb from 'xvfb';` — a plain npm `xvfb` package that shells out to a **host-installed** `Xvfb` binary (not provisioned by any Bazel toolchain or repository rule anywhere in this chain), started/stopped around a `runTests({version: '1.102.0', ...})` call that lets `@vscode/test-electron` download and cache the pinned VS Code build itself, under a `cachePath` inside the test's own `TEST_TMPDIR` — meaning every clean sandboxed invocation re-downloads VS Code fresh; there is no Bazel-level (CAS/repository-rule) caching of that binary in this example. Chromium/Electron launch flags used: `--disable-extensions --disable-gpu --no-sandbox --disable-dev-shm-usage --preserve-symlinks --disable-software-rasterizer`. One genuinely novel, previously-undocumented Bazel-sandbox interaction is recorded directly in the source as a code comment:

```ts
// Using `process.env['TEST_TMPDIR']` here causes:
// Error: listen EROFS: read-only file system /xxxx/.cache/bazel/_bazel_alanagius/
// .../sandbox/linux-sandbox/7161/execroot/_main/_tmp/.../user-data/1.10-main.sock
const tmpDirUserData = await mkdtemp(join(tmpdir(), 'vscode-e2e-user-data-'));
```

— VS Code's own user-data lock file is a Unix domain socket, and creating it directly under Bazel's sandboxed `TEST_TMPDIR` fails `EROFS`; the workaround is a separate `mkdtemp` under the *host's* `tmpdir()`, outside Bazel's sandbox tree entirely. `test_constants.ts` confirms `PROJECT_PATH` points at a checked-in fixture project inside the same repo (`integration/project`), not something downloaded at test time.

**Answer (b).** Not a structural non-starter, and not merely unattempted — there is a real, working, currently-live production example (`angular/angular`). `@vscode/test-electron` can run as an ordinary `js_test`, provided the test declares `requires-network` (VS Code is fetched live, per invocation, from Microsoft's CDN — no Bazel-cached VS Code repository rule exists in this example or anywhere else found) and `no-remote-exec` (Xvfb is unavailable on RBE workers, so this is local-execution-only), and provided the CI image has a real `Xvfb` binary on `PATH` (supplied via a plain npm wrapper package, not a Bazel toolchain — genuinely non-hermetic). A sandboxed test action attempting this needs, in order: the two tags above; a host-provisioned Xvfb; and awareness that writing VS Code's user-data socket directly under `TEST_TMPDIR` fails with `EROFS` under Bazel's sandbox, requiring a separate host-tmpdir workaround. This corrects BZL-JS-29's "no Bazel path at all" for `@vscode/test-electron` specifically (`bun test` remains genuinely path-less — no ruleset or ingestion mechanism exists for it at all, which is a different and stronger kind of gap than this one).

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| NEW-MOD-34 | New rule for `bazel-bzlmod-and-repo-rules.md` (fills M-B-15): default a BCR-published module to `package(default_visibility = ["//visibility:private"])` with exactly one explicit `//visibility:public` target per logical entry point (module-name-matching target, or a private-target-plus-public-alias pair). Verify with `bazel query 'attr(visibility, "//visibility:public", //...)'` — read the output as the module's actual public surface, and treat a wide or empty result as a finding. Do not use `visible(//..., //...)` for this: it is a live query function on both 8.7.0 and 9.2.0 but computes a different, stricter thing ("visible to literally every target in the workspace") that stops tracking "externally reachable" once a repo has more than one package. | `docs/bcr-policies.md`, `.gemini/styleguide.md`, 15 sampled merged PRs, and a measured 8.7.0/9.2.0 `query`+`cquery` repro | measured |
| NEW-CACHE-35 | Retire any citation of PR #25650 or #25334 as interchangeable for "the flags removed at 9.0.0" — they are two separate, unrelated commits (`91b1e8e2` for the exit-code flag, `30ca50950f` for the merkle-tree flags, eight months apart). Add: the 9.0.0 release-notes "flags removed" appendix names the exit-code flag but omits the merkle-tree flag by name — do not rely on that appendix alone to enumerate a version's removed flags. Add: `--experimental_remote_cache_chunking_function` (PR #30585) never merged into any branch; treat any reference to `rep_max_cdc` selection as aspirational, not shipped, through 9.2.0. | Direct commit/PR archaeology, this file § Answer 2 | measured |
| BZL-CACHE-12 | No text change needed to the rule itself (its guidance — never key on exit 39, leave retries at default 5 — is already correct), but its supporting flag-defaults table (`bazel-caching-rbe.md:74`) needs its `--rewind_lost_inputs` row corrected: "absent" on 8.7.0/8.8.0 is true only of `bazel help build --long` output; the flag is present, functional (`UNDOCUMENTED` category) and settable on both. | Direct source diff across 5 tags plus a live 8.7.0 build with the flag passed | measured |
| NEW-CACHE-36 | New rule: on the fleet's 8.7.0 pin, `--rewind_lost_inputs` is a real, working, `UNDOCUMENTED` flag (present since 8.7.0, not a 9.x-only feature) that can be enabled today for CAS/disk-cache-eviction recovery; it only becomes a *documented* flag at 9.2.0. Its internal repeated-loss ceiling is a fixed source constant, `MAX_REPEATED_LOST_INPUTS = 20` (stable 8.7.0 → 9.2.0) — a failure message reading "#21" reports the ceiling-plus-one, not a different, undocumented limit. Never confuse this with `--experimental_remote_cache_eviction_retries` (default 5, whole-invocation retry) — the two are independent layers. | `BuildRequestOptions.java` and `ActionRewindStrategy.java` across 5 tags; 9.1.0/9.2.0 release notes | measured |
| NEW-CACHE-37 | New rule / correction to the `exit-39-and-bwob-on-cache-only-build.md` fixture note: do not generalize "Bazel sends `Expect: 100-continue` on PUT" from that fixture — Bazel's own `HttpCacheClient` Javadoc explicitly disclaims sending it, on every version 8.7.0–9.2.0. Separately, do not assume a real `bazel-remote` deployment needs the fixture's explicit `Content-Length: 0` fix — `bazel-remote`'s Go `net/http`-based success path supplies that header automatically; the fix was needed only because the ad hoc Python fixture used a lower-level HTTP primitive that doesn't. | `HttpCacheClient.java`, `HttpUploadHandler.java` (both tags), `buchgr/bazel-remote/server/http.go` | measured |
| BZL-JS-29 | Narrow the claim: `@vscode/test-electron` has a real, working Bazel path (`js_test` + `requires-network` + `no-remote-exec` + host-provisioned Xvfb + no Bazel-cached VS Code binary), demonstrated in production by `angular/angular`. `bun test` remains genuinely path-less (no ruleset, no ingestion mechanism at all) — keep that half of the rule as-is; it is a materially different and stronger kind of gap than the vscode-test-electron half. | `angular/angular` `vscode-ng-language-service/integration/e2e/{BUILD.bazel,index.ts,test_constants.ts}` | primary, working example |
| NEW-JS-33 | New rule: `aspect_gazelle_js`'s pnpm-project membership is decided solely by a directory's presence as an `importers:` key in the one configured `pnpm-lock.yaml` — never by `pnpm-workspace.yaml`'s glob patterns. A workspace member whose dependencies are actually managed by a different package manager (creeptd-ng's `web`: npm-managed, glob-listed in `pnpm-workspace.yaml`) gets no `npm_link_all_packages` and no public package target, and with the plugin's own default (`js_validate_import_statements = error`) every third-party import inside it becomes a hard, named Gazelle-generation failure, not a silent gap. Fix is full pnpm conversion (real `pnpm install` at the workspace root) — no other third-party lockfile ingestion path exists in this plugin. | Direct trace of `aspect_gazelle_js` 1.2.1's `configure.go`/`generate.go`/`resolve.go`/`pnpm/workspace.go`, cross-checked against the plugin's own README defaults | measured (source-traced; no documented external account exists) |

## AI-agent angle

- **"Absent from `--long` help" is not "does not exist."** `--rewind_lost_inputs` on 8.7.0 and `--experimental_remote_repo_contents_cache` (a startup-only flag, per the frame's own measurement wave) are two independent instances of the same trap in this corpus. An agent auditing flag availability by grepping `bazel help build --long` will silently miss any `UNDOCUMENTED`-category or startup-only flag that is nonetheless real and settable. The mechanical fix is the same one the frame already applies to startup flags: check the actual `@Option` source for the flag name, not only the rendered help text, before declaring a flag absent on a given version.
- **A "closed unmerged" GitHub PR against `bazelbuild/bazel` is not evidence the change was rejected.** Both flag-removal commits in this file's Q2 landed via Google's internal Copybara/Piper sync the same day a matching community PR was closed unmerged. An agent that reads "merged: false" as "did not ship" will get the direction of the finding backwards; the correct check is whether the named commit (or its `Closes #N` reference) actually exists in the tagged source tree, not the PR's own merge state.
- **`visible()` reads like the obviously-right query function for "is this reachable," and measurably is not.** Its name and one-line description invite exactly the reading this task set out to test; only running it against a real multi-package fixture (not a single-package toy) exposes that it computes visibility-to-everyone, not visibility-to-the-public. `attr(visibility, "//visibility:public", //...)` is the boring, correct answer, and an agent should default to it over any query whose name merely sounds more precise.
- **A "no path exists" verdict for a tool integration is a claim about the searcher's search, not always about the tool.** The prior round's `@vscode/test-electron` conclusion was reasoned entirely by mechanism (network fetch + GUI process inside a sandbox) and was structurally plausible, but a five-minute `gh api search/code` for the exact import string surfaced a real, current, production counter-example. Before shipping a "structurally impossible" verdict for a JS/TS tool, search GitHub code search for the tool's own import/require string plus "bazel" or "BUILD.bazel" — the corpus's existing "no path" claims for `bun test` (checked again here) survive that search; this one did not.

## Contested / evolving

- **Whether BCR's "keep the public surface small" guidance should be read as a MUST or a SHOULD for `rules_ocx` specifically.** The sampled evidence is entirely from C++ overlay modules (BCR's own playbook language is explicitly scoped to "C++ modules with BUILD patches or overlays"); `rules_ocx` ships zero `cc_*` targets and no overlays, so whether the same norm applies with equal force to a pure-Starlark `repository_rule`/`module_extension` module is not directly evidenced by any of the 15 sampled PRs, all of which are C++ modules. This document takes the position that the underlying rationale (public target = public API commitment) is language-agnostic and applies regardless, but that inference is not itself sampled.
- **Whether the angular/angular `@vscode/test-electron` example generalizes cleanly to `grimoire-vscode`/`vscode-ocx`'s actual shape.** angular/angular is a very large, well-resourced monorepo with an existing Bazel CI fleet that already provisions Xvfb and accepts `requires-network` test legs; whether a much smaller repo's CI image already has (or is willing to add) a host `Xvfb` binary, and whether its runners permit `requires-network` test tags at all, is a fleet-CI-posture question this document does not answer.

## Not settled

- **A literal packet capture of Bazel's PUT request against a live server was not obtained in this session.** The sandbox's raw-socket listener attempt was denied by the host's command-approval system before it could complete a capture; the Q4 answer rests on Bazel's own class-level Javadoc (an explicit, dated design statement, not inferred behaviour) rather than an observed byte stream. A future round with looser network-binding permissions could capture the literal wire bytes to remove any residual doubt.
- **Whether `bazel-cache.ocx.sh` (the fleet's actual deployed cache, per BZL-CACHE-24) is genuinely `buchgr/bazel-remote` and not a fork or a different server entirely** was not re-verified in this round — this file's Q4 answer describes the *upstream* `buchgr/bazel-remote` project's behaviour, which the corpus already treats as the identified backend, but a config/version check against the live endpoint was out of scope here.
- **Whether a repo with `web` genuinely converted to pnpm (rather than left mixed) still trips any other `aspect_gazelle_js` row** — this document traces only the mixed-manager failure mode, not the post-conversion state, which the corpus's existing BZL-JS-01 (convert to pnpm) already covers in general but not against creeptd-ng's specific `web` shape.

## Sources

| URL | What it is | Primary? |
|---|---|---|
| [bazel-central-registry docs/bcr-policies.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/bcr-policies.md) | BCR maintainer playbook, verbatim visibility guidance | primary |
| [bazel-central-registry .gemini/styleguide.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/.gemini/styleguide.md) | Automated PR-reviewer config, active on real PRs | primary |
| [bazel-central-registry docs/README.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | Contribution guidelines, structure, metadata schema | primary |
| [PR #10068 — Add libgpsmm](https://github.com/bazelbuild/bazel-central-registry/pull/10068) | Sampled merged PR: private-target/public-alias pattern requested | primary |
| [PR #9879 — liburing](https://github.com/bazelbuild/bazel-central-registry/pull/9879) | Sampled merged PR: explicit `visibility("private")` request | primary |
| [PR #8498 — opentelemetry-cpp](https://github.com/bazelbuild/bazel-central-registry/pull/8498) | Sampled merged PR: "only making the primary target publicly visible" | primary |
| [PR #6739 — sqlite_orm](https://github.com/bazelbuild/bazel-central-registry/pull/6739) | Sampled merged PR: styleguide-quoted "visibility should be minimal" | primary |
| [PR #7698 — meson](https://github.com/bazelbuild/bazel-central-registry/pull/7698) | Sampled merged PR: reduce API surface / backwards-compat rationale | primary |
| [PR #7354, #9764, #6920, #10186, #9486, #9218, #9021, #8448, #7744, #8202](https://github.com/bazelbuild/bazel-central-registry/pulls) | Remaining 10 of the 15 sampled merged PRs mentioning visibility | primary |
| [Bazel query/language.md at tag 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/site/en/query/language.md) | `visible()`'s exact grammar/semantics, tag-pinned | primary |
| [Bazel query/language.md at tag 8.7.0](https://github.com/bazelbuild/bazel/blob/8.7.0/site/en/query/language.md) | Same, confirmed byte-identical wording | primary |
| [Bazel query/cquery.md at tag 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/site/en/query/cquery.md) | `cquery` function-support list, explicitly excludes `visible` | primary |
| In-session measurement: `bazel query`/`cquery` on real 8.7.0 and 9.2.0 binaries | `attr(visibility,...)` vs. `visible(...)` on a 2-package fixture; visibility enforcement under `cquery` vs. `query` | primary (measured) |
| [Commit 91b1e8e2 — Delete the exit-code flag](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3) | Named removal commit, RELNOTES line, diff | primary |
| [PR #25334](https://github.com/bazelbuild/bazel/pull/25334) | Closed-unmerged community PR matching the commit above | primary |
| [Commit 30ca50950f — Rework the Merkle tree cache](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d) | Named removal commit for the merkle-tree flags | primary |
| [PR #25650](https://github.com/bazelbuild/bazel/pull/25650) | Closed-unmerged community PR matching the commit above | primary |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Flags-removed appendix; merkle-tree narrative-only mention | primary |
| [Bazel 9.1.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.1.0) | `--rewind_lost_inputs` announcement, PR #28958 | primary |
| [Bazel 9.2.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.2.0) | Action-rewinding edge-case bugfix, PR #30193 | primary |
| [PR #30585 — RepMaxCDC chunking function](https://github.com/bazelbuild/bazel/pull/30585) | Closed, unmerged, zero comments | primary |
| `RemoteOptions.java`, `ExecutionOptions.java`, `GrpcCacheClient.java` at 8.8.0/9.0.0 raw source | Confirms both flags' presence/absence and the chunking-function hardcode | primary |
| `BuildRequestOptions.java` at 8.7.0/8.8.0/9.0.0/9.1.0/9.2.0 raw source | `--rewind_lost_inputs` presence and `documentationCategory` across all five tags | primary |
| `ActionRewindStrategy.java` at 8.7.0 and 9.2.0 raw source | `MAX_REPEATED_LOST_INPUTS = 20`, the failure-message format, class-level mechanism doc | primary |
| In-session measurement: real 8.7.0 binary, `bazel build --rewind_lost_inputs` | Confirms the flag is functional despite being `UNDOCUMENTED` | primary (measured) |
| `HttpCacheClient.java` at 8.7.0 and 9.2.0 raw source | Explicit Javadoc disclaiming `Expect: 100-CONTINUE` | primary |
| `HttpUploadHandler.java` at 9.2.0 raw source | `buildRequest()` sets no `Expect` header | primary |
| [buchgr/bazel-remote server/http.go](https://raw.githubusercontent.com/buchgr/bazel-remote/master/server/http.go) | Successful-PUT path, no explicit `Content-Length`/`WriteHeader` | primary |
| Go `net/http` package docs (`pkg.go.dev/net/http#ResponseWriter`) | Documents automatic `Content-Length` on an unwritten body | secondary (well-known stdlib behaviour) |
| [bazel-measurements/exit-39-and-bwob-on-cache-only-build.md](../bazel-measurements/exit-39-and-bwob-on-cache-only-build.md) | Prior fixture's own quirk description and rewind-ceiling observation | primary (internal) |
| [aspect-build/aspect-gazelle README.md at js-v1.2.1](https://raw.githubusercontent.com/aspect-build/aspect-gazelle/js-v1.2.1/language/js/README.md) | Documented defaults incl. `js_validate_import_statements` | primary |
| `language/js/{configure,generate,resolve,config}.go`, `language/js/pnpm/workspace.go` at js-v1.2.1 | Source trace of pnpm-project membership and import-validation failure path | primary |
| [bazel-followups/gazelle-plugin-maturity-per-language.md](gazelle-plugin-maturity-per-language.md) | Prior round's version pin and open-question framing for this exact scenario | primary (internal) |
| [angular/angular vscode-ng-language-service/integration/e2e/BUILD.bazel](https://github.com/angular/angular/blob/main/vscode-ng-language-service/integration/e2e/BUILD.bazel) | Real, working `@vscode/test-electron` `js_test` target and its tags | primary |
| [angular/angular .../integration/e2e/index.ts](https://github.com/angular/angular/blob/main/vscode-ng-language-service/integration/e2e/index.ts) | Xvfb wiring, VS Code version pin, the `EROFS` sandbox gotcha | primary |
| [angular/angular .../integration/test_constants.ts](https://github.com/angular/angular/blob/main/vscode-ng-language-service/integration/test_constants.ts) | Confirms `PROJECT_PATH` is a checked-in fixture, not downloaded | primary |
| [bazel-followups/js-test-runners-bundlers-and-editor-support.md](js-test-runners-bundlers-and-editor-support.md) | Prior round's BZL-JS-29 "no path found" claim, now corrected | primary (internal) |

## Scratch left on disk

- `/home/mherwig/.cache/bazel-measure-scratch/bazel-src` — the blobless partial clone of `bazelbuild/bazel` used for `git log -S` archaeology (independently confirmed both flag-removal commits by name). **Not deleted, per instructions.** Grew from 113M to **212M** over this session (blob fetches for the touched-file diffs).
- `/tmp/bazel-{8.8.0,9.0.0,9.1.0,9.2.0}.tar.gz` and their extracted `src/main/java` trees (`/tmp/bazel-{8.8.0,9.0.0,9.1.0,9.2.0}-src`) — used for fast, reliable cross-version Java source diffing after `git grep` on the blobless clone proved too slow over the network. Roughly **210M** combined. A cleanup pass (`rm -rf`) was attempted and denied by the host's command-approval system before it could run; left in place, nothing sensitive.
- `/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/946b693c-7b64-4917-9d73-8efea67c92ab/scratchpad/bcr-visibility-query-repro/` — the small (40K) hand-written `MODULE.bazel`/`BUILD.bazel` fixture used for the Q1 `query`/`cquery` visibility repro, plus `/tmp/bq-src2/` (8K), a second tiny fixture for an abandoned raw-HTTP-capture attempt.
- Two real Bazel server output roots this session started and explicitly shut down (`bazel shutdown`, confirmed no `A-server.jar` process remains): `/tmp/bq-out-870` (8.7.0, ~358M before shutdown) and `/tmp/bq-out-920` (9.2.0, ~189M before shutdown). Both requested for deletion and denied by the same approval gate; left in place.
- No fleet repository (`rules_ocx` or any other) was modified. No bazel server was left running.
