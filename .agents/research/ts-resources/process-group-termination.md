---
title: Process group termination
topic: killing a spawned child's descendants (not just the child) — POSIX process groups, Windows tree-terminate, execa vs. tree-kill vs. hand-rolled, and whether the fleet should adopt a child-process wrapper library
agent: scout-process-group-termination
model: sonnet
date_researched: 2026-08-29
sources_count: 14
scope: the specific gap left after a `timeout` is added to a child_process call — descendant processes (ssh/askpass under git, lifecycle scripts under npm, a shell's real command) surviving `subprocess.kill()`. Does not re-derive the timeout/maxBuffer/EPIPE findings already covered by the sibling report `process-and-timer-lifecycle.md` (cited, not repeated); does not cover fetch()/HTTP timeouts or non-process resource cleanup.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Node core's termination contract, read from source](#1-node-cores-termination-contract-read-from-source)
  2. [The descendant-survives-kill gap is open and undecided in Node core](#2-the-descendant-survives-kill-gap-is-open-and-undecided-in-node-core)
  3. [POSIX: `detached` + negative-PID kill](#3-posix-detached--negative-pid-kill)
  4. [Windows: no process groups reachable from Node — `taskkill /T /F`](#4-windows-no-process-groups-reachable-from-node--taskkill-tf)
  5. [execa: current version, and exactly what `killDescendants`/`forceKillAfterDelay`/`cancelSignal` do](#5-execa-current-version-and-exactly-what-killdescendantsforcekillafterdelaycancelsignal-do)
  6. [tree-kill and other alternatives](#6-tree-kill-and-other-alternatives)
  7. [Bun.spawn has the same single-PID limitation](#7-bunspawn-has-the-same-single-pid-limitation)
  8. [Fleet measurement: every child-process call site, and which one actually needs this](#8-fleet-measurement-every-child-process-call-site-and-which-one-actually-needs-this)
  9. [The decision](#9-the-decision)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- **Decision: hand-roll, in one file.** `ocx-catalog/src/sources/git.ts:20-38`'s `runGit` is the only fleet call site that both (a) spawns something spawn-capable of surviving descendants (`git` → `ssh`/`GIT_ASKPASS` on a `ssh://` remote) and (b) runs unattended, not under a human's or CI job's own supervision. Add `detached` + a manual group-kill timer there; do not add `execa` anywhere in the fleet.
- Node core's `subprocess.kill()` **only ever targets the direct child PID** — verbatim from [Node's own docs](https://nodejs.org/api/child_process.html#subprocesskillsignal): "On Linux, child processes of child processes will not be terminated when attempting to kill their parent." This applies identically to the `timeout`/`killSignal` options (they call `.kill()` internally) and to `AbortSignal`-driven termination.
- This is a **live, unresolved** Node core limitation, not folklore: [nodejs/node#64406](https://github.com/nodejs/node/issues/64406) ("add cross-platform `subprocess.killTree()`"), filed 2026-07-10, is **still open** as of 2026-08-29 with zero maintainer engagement — a volunteer offered to draft a PR twice (2026-07-10, 2026-08-20) and was not answered. Its 2021 predecessor, [nodejs/node#40438](https://github.com/nodejs/node/issues/40438), was closed **stale, not on the merits** — Node collaborator `tniessen` explained why it's hard (not every subtree owns a process group; deciding what/how/in-what-order to kill is OS-specific and race-prone), the issue then sat 5 months with no further comment, and a bot auto-closed it.
- **POSIX fix, zero dependencies:** spawn with `detached: true` (makes the child the leader of a new process group — [Node docs](https://nodejs.org/api/child_process.html#optionsdetached)), then on timeout call `process.kill(-child.pid, signal)`. The negative PID is POSIX `kill(2)`'s own "signal the whole group" convention; Node exposes it but never documents it under `child_process` (confirmed: no anchor or paragraph in the child_process docs mentions negative-PID group kill at all — it's simply POSIX `kill(2)` passed through `process.kill()` unmodified).
- **This does not exist on Windows.** Windows has no POSIX signals and no group Node can address by PID sign. `detached: true` on Windows means something different and unrelated — "the child gets its own console window and can outlive the parent" ([Node docs](https://nodejs.org/api/child_process.html#optionsdetached)) — setting it purely to get group-kill semantics has the side effect of popping a visible console window on Windows unless gated by `process.platform`.
- **Windows fix:** shell out to `taskkill /pid <pid> /t /f`. `/t` is documented as "Ends the specified process **and any child processes started by it**"; `/f` forces it ([Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill)). This is what `execa`, `tree-kill`, and Node core's own open `killTree` proposal all converge on for Windows — there is no second opinion in the ecosystem here.
- The "real" Windows primitive is **Job Objects** (`CreateJobObject` / `AssignProcessToJobObject` / `TerminateJobObject`, [Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)) — more robust than `taskkill /T` because it doesn't depend on the OS's parent-PID bookkeeping staying intact, but it requires a native addon (Win32 API calls); no pure-JS path reaches it, and nothing in the fleet's dependency set (Node core, `execa`, `tree-kill`, `@actions/exec`) uses it. `taskkill /T` walks the recorded parent-PID chain instead, which — like the Unix tree-walk approach — can miss a process whose recorded parent already exited.
- **execa 10.0.1** (current `latest` on npm as of this read) ships `killDescendants` (opt-in boolean, default `false`): puts the subprocess in its own process group on Unix and uses `taskkill` on Windows, applying to every termination path (`.kill()`, `cancelSignal`, `timeout`, `maxBuffer`, `cleanup`). It also ships `forceKillAfterDelay` (default `5000`ms, SIGTERM→SIGKILL escalation) and `cancelSignal`/`gracefulCancel` for `AbortController`-driven cancellation — all confirmed from [execa's own termination guide](https://github.com/sindresorhus/execa/blob/main/docs/termination.md) and [api reference](https://github.com/sindresorhus/execa/blob/main/docs/api.md).
- execa 10.0.1 is **ESM-only** (`"type": "module"`, no CJS entry — confirmed from its `package.json` on the npm registry) and **requires Node ≥22** (`engines.node: ">=22"`). That directly conflicts with `ocx-catalog`'s own published floor, `>=20.19` (`ocx-catalog/package.json`), and is orthogonal to `grimoire-vscode`/`vscode-ocx`, whose actual runtime Node version is fixed by the bundled VS Code/Electron host, not by `npm install` — a repo can't "just bump engines" to satisfy a dependency there.
- `tree-kill` (last real commit [2020-06-17](https://api.github.com/repos/pkrumins/node-tree-kill), last npm publish `1.2.2` on [2019-12-11](https://registry.npmjs.org/tree-kill)) takes the *other* strategy — a true process-tree walk via `pgrep -P`/`ps --ppid` on Unix, `taskkill /T /F` on Windows — reading its actual [source](https://raw.githubusercontent.com/pkrumins/node-tree-kill/master/index.js) confirms it does not use process groups at all. This catches descendants that escaped into their own process group (which defeats execa's approach) but is effectively unmaintained six years on; not a live option to add today.
- **Bun.spawn is not an escape hatch.** Its `timeout`/`killSignal` options ([bun.com/docs/api/spawn](https://bun.com/docs/api/spawn)) mirror Node core's shape exactly — single-process signal delivery, no `detached`, no process-group concept documented anywhere on that page. Adopting Bun wouldn't have solved this even if it were relevant.
- **It isn't relevant anyway**: `setup-ocx`'s brief description as "GitHub Action on Bun" describes its *dev tooling only* (`bun scripts/build.ts`, `bun test` — confirmed in `setup-ocx/package.json` scripts and `bunfig.toml`). The shipped, executing action runs under **`node24`** (`setup-ocx/action.yml:62`, `runs.using: node24`) via `@actions/exec`, not `Bun.spawn`. Correction to the brief's framing.
- `@actions/exec`'s `ExecOptions` has no `timeout`/`signal` field at all (confirmed by reading [its `interfaces.ts`](https://github.com/actions/toolkit/blob/main/packages/exec/src/interfaces.ts) directly) — its only internal timer is a 10-second **post-exit stdio drain**, not an execution bound (confirmed in [`toolrunner.ts`](https://github.com/actions/toolkit/blob/main/packages/exec/src/toolrunner.ts), `ExecState.HandleTimeout`). This is a separate, pre-existing gap (already flagged by the sibling report as a scoped-exception candidate, not this report's decision).
- **Measured fleet-wide**: 9 first-party child-process call sites outside tests/dist/build-artifacts. Of those, only `ocx-catalog/src/sources/git.ts`'s `runGit` spawns a genuinely spawn-capable, network-facing, unattended command (`git`, over a config-supplied remote that can be `ssh://`) with zero descendant protection. Every other spawn-capable site (`npm install`/`npm publish` in `grimoire-indexer/src/cli/init.ts` and `ocx-catalog/scripts/pack-smoke.mjs`) runs under human/CI supervision, not an AI-agent-invoked runtime path; every unattended, agent-facing site that isn't `runGit` spawns a single first-party Rust binary (`grim`, `ocx`) directly, not a shell or a package manager.
- **Given one call site, `execa` fails the proportionality test on its own numbers**: it adds ~11 transitive dependencies (`figures`, `is-stream`, `get-stream`, `signal-exit`, `yoctocolors`, `is-plain-obj`, `npm-run-path`, `human-signals`, `which-command`, `strip-final-newline`, `@sindresorhus/merge-streams` — read directly off its `package.json`) to solve what a ~15-line, dependency-free addition to one existing function solves just as correctly for this fleet's actual shape.

## Findings

### 1. Node core's termination contract, read from source

Fetched directly from [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) (page title confirms **Node.js v26.8.1 Documentation** — current stable as of this read):

- `subprocess.kill([signal])` ([`#subprocesskillsignal`](https://nodejs.org/api/child_process.html#subprocesskillsignal)): "sends a signal to the child process. If no argument is given, the process will be sent the `'SIGTERM'` signal… While the function is called `kill`, the signal delivered to the child process may not actually terminate the process." Then, verbatim: **"On Linux, child processes of child processes will not be terminated when attempting to kill their parent. This is likely to happen when running a new process in a shell or with the use of the `shell` option of `ChildProcess`."** The docs' own repro:
  ```js
  const subprocess = spawn('sh', ['-c',
    `node -e "setInterval(() => { console.log(process.pid, 'is alive') }, 500);"`
  ], { stdio: ['inherit', 'inherit', 'inherit'] });
  setTimeout(() => {
    subprocess.kill(); // Does not terminate the Node.js process in the shell.
  }, 2000);
  ```
- `options.timeout` / `options.killSignal` on `spawn()`: history table on the same page shows **`timeout` was added to `spawn()` in v15.13.0/v14.18.0**, and **AbortSignal-driven `killSignal` in v15.11.0/v14.18.0** — before that, `spawn()` had no `timeout` at all (only `exec`/`execFile` did). Every fleet repo floors well above this (`>=20`+), so this is a non-issue for the fleet, but it means "does `spawn` even have `timeout`" is a real question on anything older.
- `options.detached` ([`#optionsdetached`](https://nodejs.org/api/child_process.html#optionsdetached)): on POSIX, "the child process will be made the leader of a new process group and session." On Windows: "makes it possible for the child process to continue running after the parent exits. The child process will have its own console window. Once enabled for a child process, it cannot be disabled." These are two unrelated behaviors sharing one flag name.
- `subprocess.kill()`'s Windows section, same page: `'SIGKILL'`, `'SIGTERM'`, `'SIGINT'`, `'SIGQUIT'` all terminate forcefully (Windows has no real signal delivery); `'SIGWINCH'` throws `ENOSYS`; an unknown-on-Windows signal name throws `ERR_UNKNOWN_SIGNAL`.

None of this is folklore — it's the literal doc text for the current stable line, and the "child processes of child processes" sentence has apparently been stable wording for years (it predates this read and is still there).

### 2. The descendant-survives-kill gap is open and undecided in Node core

This is not a settled question with a documented workaround Node considers sufficient — it is an **active, unresolved feature request** as of the date of this report.

[nodejs/node#64406](https://github.com/nodejs/node/issues/64406), "child_process: add cross-platform `subprocess.killTree([signal])`," filed **2026-07-10**, labeled `child_process`, **state: open** as of 2026-08-29. The issue body names exactly the fleet's shape of problem:

> `subprocess.kill([signal])` only targets the direct child PID. Descendants often keep running, especially when: `shell: true`… the child is a build driver (`bash`/`make`/`ninja`) that spawns grandchildren… on Windows, where POSIX signals are not real and `kill()` does not terminate a process tree.

It proposes `subprocess.killTree([signal])` / `child_process.killTree(pid[, signal])`, explicitly citing the userland workarounds (`detached`+negative-PID, `taskkill /pid <pid> /T /F`, `tree-kill`) as the status quo it wants to replace. As of 2026-08-21 (its most recent comment), a contributor (`ahmetalicc`) has twice asked to be assigned and draft a PR; **no Node collaborator has responded**.

This is the second attempt. Its predecessor, [nodejs/node#40438](https://github.com/nodejs/node/issues/40438) ("be able to kill all descendent processes for a given process"), opened 2021-10-13, got a substantive technical reply from collaborator `tniessen` the next day — the core difficulty, in his words:

> The problem that I usually come across when I try to implement something like this is that whether the proposed behavior is correct depends more on the spawned process tree than on the process that spawned the process… On Linux, [the `kill` function] has a built-in feature to kill all processes belonging to a certain process group… However, not every subtree has its own process group.

The issue's author then closed it voluntarily ("it's not safe at all and seems a bit tricky"); `tniessen` asked to keep it open for visibility; it got no further comment and was **auto-closed by a stale-issue bot** on 2022-05-14 with `state_reason: completed` — despite nothing having actually shipped. Read together, the two issues establish: this is a known, technically-hard, currently-unaddressed gap in Node core, still open five years later, not a bug anyone is actively working.

### 3. POSIX: `detached` + negative-PID kill

The mechanism, assembled from §1's citations (Node documents each half separately; it never documents the combination as a "how to kill a tree" recipe):

1. Spawn with `detached: true`. The child becomes the leader of a new process group; its PGID equals its PID.
2. To signal the whole group, call `process.kill(-pid, signal)` — the negative sign is POSIX `kill(2)`'s convention for "signal every process in this process group," which Node's `process.kill()` passes straight through to the OS syscall. This is **not** documented anywhere under `child_process` — it's ordinary POSIX behavior, invoked through Node's low-level `process.kill()`, not through `ChildProcess#kill()`.
3. Do **not** rely on the built-in `timeout` option to do this: `timeout`'s internal kill calls `child.kill(killSignal)` — the single-child-PID method — never the group form. A timeout option and group-kill are two independent things that happen to both be called "kill."
4. Do **not** call `.unref()` unless you actually want the parent to stop waiting for the child — `detached` and `unref()` are independent; you can have a group-killable child that the parent still awaits normally.

Caveat, from execa's own docs (§5) and confirmed by `tniessen`'s comment (§2): a descendant that calls `setsid()`/starts its own daemon session escapes the parent's process group entirely. This is inherent to the process-group strategy, not an implementation bug in any particular library.

### 4. Windows: no process groups reachable from Node — `taskkill /T /F`

Windows has no POSIX signals and no notion Node exposes for "the process group of PID N." `detached: true` on Windows does something unrelated (§1). The only cross-platform-adjacent primitive every tool in this space converges on is shelling out to the `taskkill` command, fetched directly from [Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill):

```
taskkill [/s <computer> ...] {[/fi <filter>] [...] [/pid <processID> | /im <imagename>]} [/f] [/t]
```

- `/t` — **"Ends the specified process and any child processes started by it."**
- `/f` — "Specifies that processes be forcefully ended."

So: `taskkill /pid <pid> /t /f`. This is what `tree-kill` does (§6, verified from its literal source: `exec('taskkill /pid ' + pid + ' /T /F', callback)`), what `execa`'s `killDescendants` does on Windows (§5, from its own docs), and what Node core's own open `killTree` proposal (§2) names as "today's" Windows approach.

`taskkill /T` walks the process tree using the OS's own recorded parent-PID for each running process — the same structural weakness the Unix tree-walk tools have (§6): if an intermediate process has already exited and its child got re-parented, the recorded chain is stale and that grandchild is missed. The more robust Windows primitive is a **Job Object** — `CreateJobObject`, `AssignProcessToJobObject`, and `TerminateJobObject`, which "terminate[s] all processes currently associated with a job" as a first-class OS object, independent of the parent-PID bookkeeping ([Microsoft Learn, Job objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)). Nothing in this fleet's reachable dependency set (Node core, `execa`, `tree-kill`, `@actions/exec`) uses Job Objects — it requires native Win32 API calls, not something `child_process`/`execa`/`Bun.spawn` expose from pure JS.

### 5. execa: current version, and exactly what `killDescendants`/`forceKillAfterDelay`/`cancelSignal` do

Fetched from the npm registry (`registry.npmjs.org/execa/latest`) and execa's own docs on GitHub `main`. Current `latest`: **`10.0.1`**. Package metadata: `"type": "module"` (ESM-only — no `main`, `exports` only has `types`/`default`), `"engines": {"node": ">=22"}`, description "Process execution for humans," 11 runtime dependencies (`figures`, `is-stream`, `get-stream`, `signal-exit`, `yoctocolors`, `is-plain-obj`, `npm-run-path`, `human-signals`, `which-command`, `strip-final-newline`, `@sindresorhus/merge-streams`).

From [`docs/api.md`](https://github.com/sindresorhus/execa/blob/main/docs/api.md) and [`docs/termination.md`](https://github.com/sindresorhus/execa/blob/main/docs/termination.md), each option's exact contract:

| Option | Default | What it actually does |
|---|---|---|
| `timeout` | `0` (disabled) | Terminates the subprocess (via `killSignal`) if it runs longer than this. Sets `error.timedOut = true`. |
| `killSignal` | `'SIGTERM'` | The signal used for every Execa-initiated termination path. |
| `killDescendants` | `false` | "When the subprocess is terminated by Execa, also terminate all of its descendant processes." On Unix: spawns the subprocess in its own process group, signals the group. On Windows: uses `taskkill`. Applies to `.kill()`, `cancelSignal`, `timeout`, `maxBuffer`, and `cleanup`-triggered termination alike. Explicitly documented as **best-effort**: "descendant processes that create their own process group or session… escape termination." Also documented side effect: because the subprocess now runs in its own process group, `Ctrl-C` no longer forwards `SIGINT` to it from the terminal. Cannot be combined with execa's synchronous methods. |
| `forceKillAfterDelay` | `5000` (ms), or `false` to disable | If the subprocess doesn't exit after being terminated, sends `SIGKILL` after this delay. Sets `error.isForcefullyTerminated = true`. Documented as **not working on Windows** ("Windows doesn't support signals: `SIGKILL` and `SIGTERM` both terminate the subprocess immediately") and **not working** when termination came from a specific-signal `.kill(signal)` call, `process.kill(subprocess.pid)`, or an external `kill` command — only Execa-initiated generic termination escalates. |
| `cancelSignal` | none | An `AbortSignal`; when aborted, sends `SIGTERM` (or triggers graceful cancellation, see next). |
| `gracefulCancel` | `false` | When `cancelSignal` aborts, do **not** send `SIGTERM` — instead resolve the `AbortSignal` returned by `getCancelSignal()` inside the subprocess (Node-file subprocesses only), letting it clean up and exit on its own terms. |
| `cleanup` | `true` | Kill the subprocess when the *current* (parent) process exits. |

Correct vs. incorrect usage, per execa's own example (`docs/termination.md`):

```js
// Correct: killDescendants terminates the whole tree
const subprocess = execa({shell: true, killDescendants: true})`sleep 60`;
subprocess.kill();
await subprocess; // both the shell and `sleep` are gone

// Incorrect (the default): only the shell dies, `sleep` keeps running
const subprocess = execa({shell: true})`sleep 60`;
subprocess.kill();
```

### 6. tree-kill and other alternatives

[`tree-kill`](https://www.npmjs.com/package/tree-kill) (npm registry: `latest` = `1.2.2`, published **2019-12-11**; GitHub repo `pkrumins/node-tree-kill`: `pushed_at` **2020-06-17**, 23 open issues, not archived) takes a structurally different approach from execa/Node's process-group idiom. Reading its [source](https://raw.githubusercontent.com/pkrumins/node-tree-kill/master/index.js) directly:

```js
switch (process.platform) {
  case 'win32':
    exec('taskkill /pid ' + pid + ' /T /F', callback);
    break;
  case 'darwin':
    buildProcessTree(pid, tree, pidsToProcess,
      (parentPid) => spawn('pgrep', ['-P', parentPid]),
      () => killAll(tree, signal, callback));
    break;
  default: // Linux
    buildProcessTree(pid, tree, pidsToProcess,
      (parentPid) => spawn('ps', ['-o', 'pid', '--no-headers', '--ppid', parentPid]),
      () => killAll(tree, signal, callback));
    break;
}
```

It does a **real recursive tree walk** (`pgrep -P` / `ps --ppid`, following actual parent-PID relationships down through every generation), not a process-group signal — so unlike execa's approach, it *can* reach a descendant that started its own session/process group, as long as the parent-PID chain to it is still intact. The trade-off: it needs `N` extra process spawns to discover the tree (one `ps`/`pgrep` per generation) before it can kill anything, which is both slower and itself another layer of "what if one of *those* discovery spawns hangs." Given its staleness (no commit in 6 years, last publish nearly 7 years ago as of 2026-08-29), it is not a live candidate to add to this fleet regardless of its technical merits.

Other names encountered but not separately evaluated in depth (out of proportion for a fleet with one call site in scope): `taskkill` (npm package, a thin `execa`-maintained wrapper around the Windows command, referenced from execa's own `forceKillAfterDelay` docs as the fail-safe-on-Windows option); the general "process tree" npm ecosystem otherwise consists of forks/wrappers around one of these two strategies.

### 7. Bun.spawn has the same single-PID limitation

Fetched from [bun.com/docs/api/spawn](https://bun.com/docs/api/spawn):

```js
const proc = Bun.spawn({
  cmd: ["sleep", "10"],
  timeout: 5000,       // kill after 5s
  killSignal: "SIGKILL", // default is SIGTERM
});
```

`Bun.spawn`'s `timeout`/`killSignal` shape is a direct mirror of Node core's — a single-process signal on timeout. The word "group," "tree," or "detached" does not appear anywhere on that documentation page. Bun.spawn is not a hidden third option that sidesteps this problem; it has the identical gap, undocumented for the identical reason (it doesn't try to solve it).

This matters only academically here: `setup-ocx`'s package scripts (`"build": "bun scripts/build.ts"`, `"test": "bun test"` — `setup-ocx/package.json`) use Bun as the **dev/build/test** runtime, evidenced further by its `bunfig.toml`. The shipped artifact the GitHub Action actually executes is declared with `runs: {using: node24, main: dist/setup/index.js}` (`setup-ocx/action.yml:61-63`) — it runs under GitHub's own Node 24, not Bun, and its process-spawning is entirely through `@actions/exec` (`src/project.ts:136,144`; `src/managed-config.ts:59`), which itself wraps `child_process`, not `Bun.spawn`. The brief's framing of `setup-ocx` as a live "`Bun.spawn` is native" case is not what the repo's own `action.yml` and `package.json` show.

### 8. Fleet measurement: every child-process call site, and which one actually needs this

Measured read-only under `/home/mherwig/dev`, excluding `node_modules/`, `dist/`, `out/`, `.worktrees/`, and test files (which spawn things deliberately, under a test runner's own timeout). `fma`, `kate-middlechild`, and `creeptd-ng/web` have **zero** child-process call sites — confirmed by grep, not by absence of effort.

| Call site | Spawns | Spawn-capable of its own descendants? | Currently protected? | Who invokes it |
|---|---|---|---|---|
| `ocx-catalog/src/sources/git.ts:29` `runGit` | `git` (config-supplied remote, can be `ssh://`) | **Yes** — `git fetch`/`clone` over SSH spawns `ssh`, which can spawn `GIT_ASKPASS` | No `timeout`, no `detached` | Unattended — driven by whatever config an agent or CI feeds the catalog builder |
| `grimoire-indexer/src/cli/init.ts:237` `gitRemoteUrl` | `git remote get-url origin` | Local, read-only, no network — negligible hang risk | No `timeout` | `grimoire-indexer init` (interactive scaffold) |
| `grimoire-indexer/src/cli/init.ts:970` `initGit` | `git init -b main` | Local only | No `timeout` | Same interactive scaffold |
| `grimoire-indexer/src/cli/init.ts:992` `writeLockfile` | `npm install` | **Yes** — lifecycle scripts, git-based deps | No `timeout` | Same interactive scaffold — human-supervised, one-shot |
| `ocx-catalog/scripts/pack-smoke.mjs:72,96,488` | generic `run()`, `npm --version`, `npm publish --dry-run` | **Yes** (`npm`) | No `timeout` (`spawnSync` has none by default) | CI/prepublish script only, never shipped to the CLI's users |
| `ocx-catalog/scripts/quality-css-cascade.mjs` | (dev-only lint script) | Not evaluated in depth — dev tooling, out of proportion | — | CI only |
| `ocx-catalog/src/build/dev.ts:112` | `fork()` of the repo's own `dev_worker.js` | No — known, first-party code, not an arbitrary external command | N/A | Dev server (`ocx-catalog dev`) |
| `grimoire-vscode/src/installer.ts:244` `extract()` | `tar -xf` | Not really — a single static binary, no shell, doesn't fork further | No `timeout` (flagged already by the sibling report, orthogonal to this one) | Extension install flow |
| `grimoire-vscode/src/grim.ts:596-633` `runJson` | `grim` (first-party Rust CLI) | Unconfirmed either way — `grim`'s own internals are out of this TS fleet's scope | `timeout: 120_000`, `maxBuffer: 16MiB` | The fleet's exemplar |
| `grimoire-indexer/src/enrich/index.ts:66` `spawnGrim` | `grim` | Same as above | `timeout: 60_000`, `maxBuffer: 16MiB` | Unattended (enrichment pipeline) |
| `vscode-ocx/src/ocx.ts:105,141,207` (3 sites) | `ocx` (first-party Rust CLI) | Same as above | `maxBuffer: 4MiB` on 2 of 3; **no `timeout` on any of the 3** | Unattended (VS Code commands) |
| `setup-ocx/src/project.ts:136,144`, `managed-config.ts:59` | `ocx` (via `@actions/exec`) | Same as `grim`/`ocx` above | `@actions/exec` has no timeout capability at all (§ summary) | GitHub Actions runner |

Only one row combines "spawns something that can itself fork a lingering descendant" with "runs unattended, with no human or CI-job-level supervision to notice and Ctrl-C it": **`ocx-catalog/src/sources/git.ts`'s `runGit`**. The `npm install`/`npm publish` sites are real spawn-capable commands too, but both run inside a one-shot, human-triggered scaffold or a CI job that already has its own outer job-timeout and process-tree cleanup at the runner level — the fleet-specific reason a bare `timeout` addition there (already recommended by the sibling report) is proportionate, and a group-kill addition is not.

### 9. The decision

Weighed against the ladder this fleet's dependency count already reflects (per-repo `dependencies` counts are small; the brief itself frames execa as "a dependency added to repos that currently have very few"):

- **Fleet-wide `execa` adoption**: rejected. It would touch every repo shape in the fleet (npm CLIs, VS Code extensions, a Bun-tooled Action, browser SPAs, a Biome monorepo) to solve a problem that exists in exactly one file. `fma`, `creeptd-ng/web`, and `kate-middlechild` have zero child-process call sites — there is nothing there to wrap.
- **`execa` scoped to "repos that spawn spawn-capable children"** (`ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`): still rejected. `ocx-catalog`'s own `engines.node` is `>=20.19` — execa 10.0.1's `>=22` floor would force bumping it for one call site. `grimoire-vscode`/`vscode-ocx`'s actual runtime is the VS Code extension host's bundled Node, not something `npm install`-selectable — even setting `engines` wouldn't guarantee the running Node actually satisfies `>=22` on every VS Code version the extension supports. `grimoire-indexer`'s own two spawn-capable sites (`git`, `npm install`) are the human-supervised scaffold path, not something that benefits from a runtime dependency.
- **Hand-roll, in the one wrapper that needs it**: adopted. `runGit`'s existing shape (`execFile` callback, deliberately not `promisify`d — per its own comment and the sibling report's independent confirmation this is still required for its `vi.mock('node:child_process')` test) is preserved; only the options object and a manual timer change.

Migration cost: one file, `ocx-catalog/src/sources/git.ts`, roughly +18/−2 lines, zero new dependencies, zero `package.json`/lockfile changes, zero `engines` change.

```ts
import { execFile as execFileCb, spawn } from "node:child_process";

/** Best-effort tree-terminate for a child spawned with `detached: true`.
 *  POSIX: negative PID signals the whole process group (POSIX kill(2), not
 *  documented under Node's child_process — plain OS behavior passed through
 *  process.kill()). Windows has no process-group concept Node can address;
 *  ask the OS's own tree-terminate facility instead (taskkill /T /F —
 *  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill). */
function killTree(pid: number, signal: NodeJS.Signals): void {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"]);
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    // group already gone — nothing to do
  }
}

function runGit(
  args: readonly string[],
  options: { readonly cwd?: string; readonly timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // `detached` on POSIX makes `git` the leader of its own process group,
    // so a hung `ssh`/GIT_ASKPASS child it spawns can be reached by group
    // kill. On win32 this only pops a console window, so it's gated off.
    const child = execFileCb(
      "git",
      [...args],
      { cwd: options.cwd, detached: process.platform !== "win32" },
      (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error) {
          (error as NodeJS.ErrnoException & { stderr?: string }).stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );

    // NOT execFile's own `timeout` option: that calls child.kill(), which
    // only ever reaches the `git` PID, never a descendant ssh/askpass.
    const timer = setTimeout(() => {
      if (child.pid !== undefined) killTree(child.pid, "SIGTERM");
      // escalate if git ignores SIGTERM — mirrors execa's forceKillAfterDelay
      setTimeout(() => {
        if (child.pid !== undefined) killTree(child.pid, "SIGKILL");
      }, 5000).unref();
    }, options.timeoutMs ?? 30_000);
    timer.unref();
  });
}
```

```ts
// Before (current code, ocx-catalog/src/sources/git.ts:20-38): no timeout,
// no group kill. `git fetch` on a hostile/hung ssh:// remote blocks forever,
// and even a future bare `timeout` addition would leave a spawned `ssh` or
// GIT_ASKPASS process running after the kill (§1, §2).
function runGit(args: readonly string[], options: { readonly cwd?: string } = {}) {
  return new Promise((resolve, reject) => {
    execFileCb("git", [...args], options, (error, stdout, stderr) => { /* … */ });
  });
}
```

## Normative guidance candidates

1. **Any child-process call that spawns `git`, a package manager (`npm`/`pnpm`/`yarn`/`bun`), or `shell: true` — and runs unattended, not under a human or CI job's own supervision — must pair its `timeout` with a group-kill fallback** (`detached` + negative-PID on POSIX, `taskkill /T /F` on Windows), not rely on `timeout` alone. *Rationale*: `timeout`'s built-in kill is single-PID (§1); these commands are the ones documented to spawn further children. *Verify*: for each such call site, confirm the options object sets `detached` and the timeout handler calls a platform-branching group-kill, not `child.kill()`.
2. **Never claim a bare `timeout` addition "fixes hangs" for a command that can itself spawn a child** without separately confirming descendant-kill is out of scope for that call. *Rationale*: this is the exact split the brief's own file names — `timeout` closes "hangs forever," not "descendant survives the kill." *Verify*: reading heuristic — does the spawned command's own docs mention forking a helper process (git→ssh/askpass, npm→lifecycle scripts, `make`/`ninja`→build tools)? If yes, `timeout` alone is insufficient.
3. **Do not add `execa` (or any tree-kill library) fleet-wide, or to a repo, for fewer than a handful of call sites that actually need `killDescendants` semantics.** *Rationale*: measured at exactly 1 qualifying call site fleet-wide (§8); execa pulls ~11 transitive dependencies and a Node ≥22 floor for it. *Verify*: count call sites matching rule 1's criteria in the target repo; if ≤2, hand-roll per §9's sketch instead.
4. **Before adding `execa` to any repo, diff its `engines.node` floor against the target repo's own `package.json#engines.node`, and against the actual runtime if that runtime isn't `npm install`-selectable** (a VS Code extension host, a GitHub Action's declared `runs.using`). *Rationale*: execa 10.0.1 requires Node ≥22 and is ESM-only; `ocx-catalog` alone already floors below that (`>=20.19`). *Verify*: `npm view execa engines.node`, compare against the target's `engines` field and, for VS Code extensions, the minimum supported VS Code version's bundled Node.
5. **Never pass `killDescendants`, `forceKillAfterDelay`, `cancelSignal`, or `gracefulCancel` as options to a bare `child_process.exec`/`execFile`/`spawn` call.** *Rationale*: these are `execa`-only option names; Node's loosely-typed options bag accepts and silently ignores unknown keys — TypeScript won't catch it either. *Verify*: `grep` for those four identifiers as object keys near an `execFile(`/`exec(`/`spawn(` call in a file that does **not** `import … from 'execa'`.
6. **`detached: true` must be gated to non-Windows platforms unless a visible console window is an accepted side effect.** *Rationale*: on Windows, `detached` means "own console window + outlives parent," not "own process group" (§1, §4) — an ungated `detached: true` pops an unwanted window on every Windows run. *Verify*: every `detached: true` site is written as `detached: process.platform !== 'win32'` (or an equivalent explicit platform check), never a bare `true`.
7. **On Windows, tree-terminate must go through `taskkill /pid <pid> /t /f`** (or accept its parent-PID-chain limitation as-is) — there is no negative-PID equivalent to fall back to. *Rationale*: confirmed from Microsoft's own `taskkill` docs (§4); every tool surveyed here (execa, tree-kill, Node core's own open proposal) converges on the same command. *Verify*: any Windows-branch of a kill-tree helper shells out to `taskkill` with both `/t` and `/f`; a bare `process.kill(-pid, …)` on the Windows branch is a bug (it will not do what the author intended, and may throw).
8. **`ocx-catalog/src/sources/git.ts`'s `runGit` should gain `detached` + the group-kill timer from §9's sketch, alongside the `timeout` addition the sibling report already flags.** *Rationale*: this is the fleet's one measured call site meeting rule 1's bar (§8). *Verify*: `grep -n "execFileCb(" ocx-catalog/src/sources/git.ts` shows the options object passing `detached`, and a `setTimeout` in the surrounding function calls a platform-branching kill helper, not `child.kill()`.
9. **A dev-only or CI-only spawn (build scripts, prepublish smoke tests, an interactive `init` scaffold's `npm install`) does not need group-kill hardening** even if the command it runs (`npm`) is spawn-capable. *Rationale*: it runs under a human's or CI job's own supervision and outer timeout/cleanup — over-applying rule 1 here is scope creep, not safety. *Verify*: is the call reachable from a runtime command path an AI agent or unattended process invokes repeatedly, or only from a one-shot human/CI-triggered script? Only the former needs rule 1.
10. **Do not treat `Bun.spawn`'s `timeout`/`killSignal` as solving descendant-kill for a Bun-targeted call site** — it has the identical single-PID limitation as Node core (§7), confirmed on Bun's own docs page, which never mentions process groups. *Verify*: reading heuristic only — `Bun.spawn`'s docs page has no `detached` option and no group/tree-kill facility documented; treat it exactly like bare `child_process` for this concern.

## AI-agent angle

- **Assuming `timeout` kills the whole tree.** An agent asked to "add a timeout so this doesn't hang" on a `git`/`npm`/shell-spawning call will correctly add `timeout` and stop there — Node's own docs bury the caveat in the `kill()` section, not the `timeout` option's own paragraph, so a model reading only the option's doc entry won't see it. **Check**: for any newly-added `timeout` on a call that spawns `git`/a package manager/`shell: true`, confirm a group-kill mechanism was added alongside it, not `timeout` alone.
- **Copying the POSIX negative-PID idiom onto a Windows code path unguarded.** `process.kill(-pid, signal)` is a natural, well-documented-elsewhere pattern a model has likely seen in many POSIX-only codebases; without an explicit platform check it will get pasted into cross-platform code (VS Code extensions in this fleet run on Windows) where it either throws or, worse, silently no-ops (the PID sign may resolve to nothing rather than erroring). **Check**: every `process.kill(-` call site is inside (or guarded by) a `process.platform !== 'win32'` branch.
- **Hallucinating execa's option names onto bare `child_process` calls.** `killDescendants`, `forceKillAfterDelay`, `cancelSignal` are real, well-documented options — on `execa`. A model that has recently reasoned about `execa` (or was shown its docs in context) will sometimes carry an option name onto a raw `execFile`/`spawn` call in the same session; TypeScript's structural typing on a loosely-typed options object won't flag the excess key as an error, and Node ignores it silently at runtime — no crash, no warning, just quietly not doing what was asked. **Check**: grep those four identifiers as object-literal keys adjacent to `execFile(`/`exec(`/`spawn(` in any file not importing from `'execa'`.
- **Reaching for `execa` as the "correct" fix the moment descendant-kill comes up**, because it is the best-documented, most-discoverable answer to "how do I kill a process tree in Node" — without first counting how many call sites in the actual target repo need it, or checking the repo's own `engines.node` floor against execa's. **Check**: before adding `execa` to any repo's `package.json`, run rule 3/4's verification steps; a PR adding `execa` for a single call site, or one that also bumps `engines.node`, is a signal the ladder wasn't climbed.
- **Pairing `detached: true` with a reflexive `.unref()`.** A model that recognizes "detached" as "background process" idiom will often add `.unref()` right alongside it, changing the process's lifecycle (the parent stops waiting for it) when the actual intent was only "give this child its own killable process group while the caller still awaits it normally." **Check**: any `detached: true` site whose result is `await`ed or otherwise still needed by the caller should not also call `.unref()` on the same child.

## Contested / evolving

- **Node core's own tree-kill API is unresolved, actively re-proposed, as of 2026-08-29.** [nodejs/node#64406](https://github.com/nodejs/node/issues/64406) is open with a volunteer wanting to implement it and no maintainer response across six weeks (2026-07-10 → 2026-08-21). Its 2021 predecessor ([#40438](https://github.com/nodejs/node/issues/40438)) was closed on staleness after a collaborator laid out real technical difficulty, not rejected on the merits. Trend: renewed interest in 2026, still unshipped, direction genuinely undecided — could land as a core API in a future major, or could stall again the way its predecessor did. Nothing here should be written as "Node will soon ship X."
- **Process-group signaling (execa, the hand-rolled POSIX idiom) vs. true process-tree walk (`tree-kill`) is a real, unresolved trade-off, not a settled "one is better."** Process-group signaling is simpler and faster but is defeated by any descendant that starts its own session (`setsid()`) — execa's own docs say so outright. Tree-walking catches those but costs extra discovery spawns per generation and is what the one maintained-until-2020 implementation (`tree-kill`) does; nothing actively maintained implements the tree-walk approach as of this read. The ecosystem has, in practice, converged on process-group signaling by default (it's what a maintained, current library — execa — ships as its opt-in), accepting the narrower coverage as "good enough," not because the tree-walk approach was proven wrong.
- **Job Objects remain the technically superior Windows primitive, unreached by any tool surveyed here.** `taskkill /T`'s reliance on the OS's parent-PID bookkeeping is a known, accepted limitation industry-wide (it's the same limitation Unix `ps --ppid`-based tree-walking has) — nobody surveyed in this report (Node core's own proposal, execa, tree-kill) uses Job Objects, because doing so needs native Win32 bindings, not a pure-JS `child_process` call. Whether that changes (e.g., if Node core's own `killTree` proposal eventually ships a native Job-Object-backed Windows implementation) is exactly the open question in §2's issue — could not establish a timeline as of 2026-08-29.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) | Primary — Node.js official docs, current stable (page confirms **v26.8.1**) | read 2026-08-29 | Ground truth for `timeout`/`killSignal`/`detached`/`kill()` semantics, including the verbatim "child processes of child processes will not be terminated" caveat |
| [github.com/nodejs/node/issues/64406](https://github.com/nodejs/node/issues/64406) | Primary — open Node core feature request | filed 2026-07-10, open as of 2026-08-29 | Proves the descendant-kill gap is live and unresolved *today*, not historical; names the exact userland workarounds this report evaluates |
| [github.com/nodejs/node/issues/40438](https://github.com/nodejs/node/issues/40438) | Primary — closed (stale) Node core feature request, with maintainer comment | opened 2021-10-13, closed 2022-05-14 | Node collaborator `tniessen`'s technical explanation of *why* this is hard, not just *that* it's unimplemented |
| [github.com/sindresorhus/execa](https://github.com/sindresorhus/execa) (readme + `docs/api.md` + `docs/termination.md`) | Primary — execa's own maintainer documentation, `main` branch | read 2026-08-29 | Exact contract for `killDescendants`, `forceKillAfterDelay`, `cancelSignal`, `gracefulCancel`, including documented best-effort limitations |
| [registry.npmjs.org/execa/latest](https://registry.npmjs.org/execa/latest) | Primary — npm registry package metadata | read 2026-08-29 | Confirms current version `10.0.1`, ESM-only (`type: module`, no `main`), `engines.node: ">=22"`, and the exact transitive dependency list |
| [github.com/pkrumins/node-tree-kill](https://raw.githubusercontent.com/pkrumins/node-tree-kill/master/index.js) | Primary — `tree-kill`'s actual source | read 2026-08-29 | Confirms it uses a real process-tree walk (`pgrep`/`ps --ppid`/`taskkill /T /F`), not process groups — the structural alternative to execa's approach |
| [registry.npmjs.org/tree-kill](https://registry.npmjs.org/tree-kill) + [api.github.com/repos/pkrumins/node-tree-kill](https://api.github.com/repos/pkrumins/node-tree-kill) | Primary — npm registry + GitHub repo metadata | latest publish 2019-12-11, last push 2020-06-17, read 2026-08-29 | Establishes the package is effectively unmaintained (~6 years since any real commit) as of this report's date |
| [learn.microsoft.com — `taskkill`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill) | Primary — Microsoft's own command reference | read 2026-08-29 | Exact, current documentation for `/t` ("ends the specified process and any child processes") and `/f` |
| [learn.microsoft.com — Job objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) | Primary — Microsoft's own Win32 API conceptual doc | read 2026-08-29 | The more robust Windows primitive `taskkill /T` doesn't use; establishes why it's out of reach from pure JS |
| [bun.com/docs/api/spawn](https://bun.com/docs/api/spawn) | Primary — Bun's own official documentation | read 2026-08-29 | Confirms `Bun.spawn`'s `timeout`/`killSignal` mirror Node core's single-PID limitation exactly; no process-group facility documented |
| [github.com/actions/toolkit — `exec/src/interfaces.ts`](https://github.com/actions/toolkit/blob/main/packages/exec/src/interfaces.ts) | Primary — GitHub's own Actions toolkit source, `main` branch | read 2026-08-29 | Confirms `ExecOptions` has no `timeout`/`signal` field at all |
| [github.com/actions/toolkit — `exec/src/toolrunner.ts`](https://github.com/actions/toolkit/blob/main/packages/exec/src/toolrunner.ts) | Primary — same toolkit, implementation | read 2026-08-29 | Confirms the only internal timer (`ExecState.HandleTimeout`, default 10s) is a post-exit stdio-drain delay, not an execution bound |
| `ocx-catalog/src/sources/git.ts`, `setup-ocx/action.yml`, `setup-ocx/package.json`, `grimoire-vscode/src/grim.ts`, `vscode-ocx/src/ocx.ts`, and the other fleet call sites in §8 (local, read in full) | This project's own code | read 2026-08-29 | Ground truth for the fleet measurement in §8 — every claim about which call site spawns what, and whether it's protected, traces to a specific `file:line` read directly |
| `.agents/research/ts-resources/process-and-timer-lifecycle.md` (this session's sibling report) | Internal — prior research in the same program, same date | 2026-08-29 | Independently covers `timeout`/`maxBuffer` for every fleet call site and explicitly scopes out the execa-adoption decision this report settles; cited rather than re-derived to avoid duplicating its `file:line` inventory |

