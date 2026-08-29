---
title: Unbounded concurrency in Promise.all(arr.map(async …)) — measured, not assumed
topic: ts-async-concurrency-bounds
agent: dive-concurrency-bounds
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 12
scope: >
  Whether an unbounded-concurrency rule (a mandatory limiter on
  `Promise.all`/`allSettled` over `.map(async …)`) belongs in the TypeScript
  quality rule set for this fleet, settled by finding and classifying every
  such site under /home/mherwig/dev by the source of the array's length, then
  surveying p-limit/p-map/p-queue/Node's native `readable.map()`/hand-rolled
  semaphores as candidate primitives. Does not cover retry/backoff design,
  AbortSignal/timeout composition (see `cancellation-and-timeouts.md`), or
  `Promise.all` vs `allSettled` error-isolation choice (see
  `promise-observability.md`) — this file only asks "how many concurrent
  operations run at once," not "how long until one gives up" or "does one
  failure sink the rest."
---

## Table of contents

1. [The inventory: 4 literal `.map(async …)` sites, 2 lookalikes, zero live bugs](#1-the-inventory-4-literal-mapasync--sites-2-lookalikes-zero-live-bugs)
2. [`pages.ts`: the one deliberately bounded site, and what its Semaphore actually protects](#2-pagests-the-one-deliberately-bounded-site-and-what-its-semaphore-actually-protects)
3. [`mirror.ts`: the same bound, reused not reinvented, with a measured number](#3-mirrorts-the-same-bound-reused-not-reinvented-with-a-measured-number)
4. [`walker.ts:708`: the site that looks unbounded and isn't — a dated incident and its fix](#4-walkerts708-the-site-that-looks-unbounded-and-isnt--a-dated-incident-and-its-fix)
5. [`detailsCache.ts`: two unbounded sites that are provably safe](#5-detailscachets-two-unbounded-sites-that-are-provably-safe)
6. [`path.ts`/git sources: serial by construction — the opposite failure mode](#6-pathtsgit-sources-serial-by-construction--the-opposite-failure-mode)
7. [What a bound actually protects against, ranked by what's real at this fleet's scale](#7-what-a-bound-actually-protects-against-ranked-by-whats-real-at-this-fleets-scale)
8. [p-limit, p-map, p-queue, Node's `readable.map()`, and the hand-rolled `Semaphore` compared](#8-p-limit-p-map-p-queue-nodes-readablemap-and-the-hand-rolled-semaphore-compared)
9. [No lint checks this — confirmed against `no-floating-promises`'s own docs](#9-no-lint-checks-this--confirmed-against-no-floating-promisess-own-docs)

- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Fleet-wide, exactly **4** sites match `.map(async …)` wrapped in `Promise.all`/`allSettled`: `ocx-catalog/src/build/pages.ts:213`, `ocx-catalog/test/build/engine_real_build.test.ts:94` (test-only), `grimoire-vscode/src/detailsCache.ts:190`, `grimoire-vscode/src/detailsCache.ts:235`. A widened search (any `.map(fn)` — async keyword or not — feeding `Promise.all`) adds exactly 2 more production sites: `ocx-catalog/src/sources/walker.ts:708` and `detailsCache.ts:242`. That is the entire fleet-wide population; `vscode-ocx`, `setup-ocx`, `fma`, and `kate-middlechild` have **zero** `Promise.all`/`allSettled` call sites of any shape.
- Of the 6 production sites, only **2** have an array whose length is genuinely external (HTTP response body): `pages.ts:213` (`options.packages`, traced to a resolved catalog built from `url`/`git`/`path` sources) and `walker.ts:708` (`entries`, parsed straight from a fetched `c/index.json`). **Both are already bounded** — `pages.ts` via an explicit `Semaphore(16)` around the write, `walker.ts` via a `Semaphore(16)` three call-frames down inside `loadOrFetch`, plus a hard `entries.length > 50_000` throw before the loop even starts.
- `walker.ts`'s bound was added as a **named, dated fix**: a comment at `walker.ts:342-346` records a 2026-08-22 security-panel finding that the cache read used to run *before* acquiring the semaphore, so "`Promise.all` over a hostile index with thousands of cheap entries fanned out that many concurrent disk reads at once, unbounded." The fix moved the gate to wrap the *entire* per-entry operation (cache read + network fetch), not the `Promise.all`/`.map()` call site itself — this fleet's own precedent is "bound the I/O, not the array."
- The remaining 4 sites are **local-filesystem-only and small-N by construction**: `detailsCache.ts:190` iterates the VS Code sidebar's currently-rendered card list (bounded by realistic catalog size, today in the tens); `detailsCache.ts:235`/`:242` iterate a cache directory explicitly capped at `MAX_ENTRIES = 256` (`detailsCache.ts:131`). None does a network fetch; none has ever needed a limiter.
- `ocx-catalog/src/sources/path.ts`'s directory walker (`git`/`path` sources) has **zero** `Promise.all` fan-out at all — `walkTree()` (`path.ts:167-198`) recurses with a plain `for...of` loop and `await`s each `realpath`/`stat`/`readFile`/recursive call in sequence. This is the *opposite* failure mode (no concurrency, not too much) and is out of this file's scope — it is a performance question, not a resource-exhaustion one.
- Zero fleet repos depend on `p-limit`, `p-map`, or `p-queue` — confirmed by grepping every `package.json` under the fleet. The only concurrency-bounding primitive in production anywhere in the fleet is a hand-rolled `Semaphore` class (`ocx-catalog/src/sources/walker.ts:179-205`), and it is correctly **reused**, not reinvented: `mirror.ts:11` imports it rather than writing a second one.
- `p-limit@7.3.1` (published 2026-07-20), `p-queue@9.3.3` (2026-07-22), and `p-map@7.0.7` (2026-08-27 — 2 days before this research) are all actively maintained, ESM-only (`"type": "module"`), and require Node `>=20`/`>=20`/`>=18` respectively — [npm registry](https://registry.npmjs.org/p-limit). Every fleet repo that declares an `engines.node` floor already meets or exceeds `>=20` (`ocx-catalog` `>=20.19`, `grimoire-indexer` `>=22.14.0`, `grimoire-vscode`/`vscode-ocx` `>=20`, `setup-ocx` `>=24`), so none of the three is blocked on the Node floor if adopted.
- `p-map`'s `concurrency` option **defaults to `Infinity`** — [p-map README](https://raw.githubusercontent.com/sindresorhus/p-map/main/readme.md). Adopting it without *always* passing an explicit `{ concurrency: N }` provides zero protection and looks safer than it is.
- `p-queue`'s headline features — `intervalCap`/rate-limiting, priority, pause/resume — solve a problem this fleet does not have today: no fleet HTTP dependency is documented as rate-limited, and no fleet code currently implements or needs request prioritization. Recommending it here would be adopting ceremony for capability nobody asked for.
- Node's `Readable.prototype.map(fn, { concurrency })` (default concurrency **1**) exists natively — added v17.4.0/v16.14.0, still **Experimental (stability 1)** as of the current `stream.md` docs — [Node stream docs](https://raw.githubusercontent.com/nodejs/node/main/doc/api/stream.md). `stream.pipeline()` itself has no concurrency option; the primitive is the `Readable` instance method. It requires converting a plain array into a `Readable` and back, which is more ceremony than a one-line `p-limit` call or the fleet's existing 25-line `Semaphore` for the array-in/array-out shape every one of these 6 sites actually has.
- Node's global `fetch()` runs on undici, whose default connection `Pool` sets `connections: null`, meaning **"the pool creates an unlimited number of clients"** per origin — [undici Pool docs](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Pool.md). Nothing in the runtime auto-throttles concurrent outbound fetches; a bound is only as real as code that adds one.
- `@typescript-eslint/no-floating-promises` and `no-misused-promises` — the fleet's only type-aware promise lints, wired in exactly 1 of the fleet's repos (`setup-ocx`) — check only whether a promise is *observed* (awaited, `.then()`'d, `.catch()`'d, or `void`'d); their own docs confirm neither evaluates concurrency bounds or resource limits — [typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/). `[1,2,3].map(async x => x + 1)` wrapped in `Promise.all(...)` satisfies both rules regardless of the array's real-world size. No lint in this fleet's toolchain — today or after the type-aware rollout already decided elsewhere — will ever catch an unbounded-but-observed `Promise.all`.
- **Decision: do not ship a blanket rule** ("every `Promise.all`/`allSettled` over a dynamically-sized `.map()` needs an explicit limiter"). Measured evidence shows 2 of the fleet's 2 real wire-sized cases are already correctly bounded using the fleet's own established pattern, and a blind AST-shaped rule would false-positive on the other 4 sites, which are genuinely safe (local-fs-only, N ≤ 256) — ceremony with no corresponding defect. Ship a **narrow** rule instead (§ Normative guidance candidates #1) scoped to the one axis this fleet has ever actually gotten wrong: a network-response-decoded array feeding per-element I/O with no bound anywhere in the call chain.

## Findings

### 1. The inventory: 4 literal `.map(async …)` sites, 2 lookalikes, zero live bugs

```bash
$ find <fleet repos> -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dist/*' \
    | xargs grep -n '\.map(async'
ocx-catalog/src/build/pages.ts:213:              ...options.packages.map(async (route) => {
ocx-catalog/test/build/engine_real_build.test.ts:94:            ].map(async (file) => {
grimoire-vscode/src/detailsCache.ts:190:      repos.map(async (repo) => {
grimoire-vscode/src/detailsCache.ts:235:      files.map(async (name) => {
```

That is the complete fleet-wide result — verified across `ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `fma`, `creeptd-ng`, `kate-middlechild`. A second pass widened to any `Promise.all(...)`/`Promise.allSettled(...)` call site (regardless of whether the mapped callback literally says `async`) found every other production site is a **fixed-arity literal array** — `Promise.all([a, b, c])` parallelizing 2–3 independent, hardcoded operations (dynamic imports in `grimoire-indexer/src/cli/{build,dev,enrich}.ts`; independent writes in `ocx-catalog/src/build/config_gen.ts:448,464`; independent refreshes in `grimoire-vscode/src/extension.ts:145,225`, `scopes.ts:782`, `installer.ts:289`, `views/details.ts:901,991`, `views/settings.ts:394`; a 2-element RPC pair in `creeptd-ng/web/src/stores/useLeaderboardStore.ts:402`). These carry no array-length classification question at all — the length is a code-controlled constant (a literal count of distinct operations), matching the brief's own "not applicable" category, so they are not analyzed further here.

Two more production sites match the *shape* (a variable-length array feeding `Promise.all`) without the literal `async` keyword on `.map`:

- `ocx-catalog/src/sources/walker.ts:708` — `entries.map(([qualifiedId, digest]) => processPackage(qualifiedId, digest, ctx, files))`, where `processPackage` is itself `async`; identical risk shape, no `async` token on the arrow because it just forwards to an already-async function.
- `grimoire-vscode/src/detailsCache.ts:242` — `stats.slice(this.maxEntries).map((s) => fs.rm(s.full, { force: true }).catch(() => {}))`, a non-`async` arrow returning a `Promise<void>` directly.

Total production population analyzed: **6 sites**. This small a count, for a fleet spanning ~130k LOC across 8 repos, is itself evidence about how rare this shape is here — see [§9](#9-no-lint-checks-this--confirmed-against-no-floating-promisess-own-docs) and the Decision in the Summary.

### 2. `pages.ts`: the one deliberately bounded site, and what its Semaphore actually protects

```ts
// ocx-catalog/src/build/pages.ts:196-221
/** C-304: caps in-flight package-page writes — an unbounded `Promise.all`
 * over every resolved package opened one `mkdir`+`writeFile` pair per
 * package simultaneously, which a large index (thousands of packages) turns
 * into thousands of concurrent filesystem operations at once. Same cap as
 * `walker.ts`'s own fetch queue (`MAX_CONCURRENCY`) — one bounded-
 * concurrency policy, not a per-caller-tuned number. */
const PAGE_WRITE_CONCURRENCY = 16;

export async function synthesizePages(options: SynthesizePagesOptions): Promise<void> {
  const srcRoot = join(options.scratchRoot, options.srcDir);
  await mkdir(srcRoot, { recursive: true });

  const semaphore = new Semaphore(PAGE_WRITE_CONCURRENCY);

  await Promise.all([
    writeFile(join(srcRoot, "index.md"), CATALOG_PAGE_CONTENT, "utf8"),
    writeFile(join(srcRoot, "404.md"), NOT_FOUND_PAGE_CONTENT, "utf8"),
    ...options.packages.map(async (route) => {
      const release = await semaphore.acquire();
      try {
        const filePath = join(srcRoot, ...route.segments.slice(0, -1), `${route.segments[route.segments.length - 1]}.md`);
        await mkdir(join(filePath, ".."), { recursive: true });
        await writeFile(filePath, packagePageContent(route), "utf8");
      } finally {
        release();
      }
    }),
  ]);
  // ...
}
```

`options.packages` is `catalog.routes` (`ocx-catalog/src/build/sources_pipeline.ts:96`, wired through `engine.ts:94`/`dev_worker.ts:116`), documented as "one route per DISTINCT package **across every source**" — the result of resolving `url` (HTTP-fetched), `git`, and `path` (local) sources and merging them. This is exactly the brief's "HTTP response body" category, and the fleet's own comment confirms the risk axis explicitly: **filesystem-write throughput/fd pressure, not memory** — "thousands of concurrent filesystem operations at once." The bound (`Semaphore`, cap 16) lives directly inside the `.map(async …)` callback, wrapping the `mkdir`+`writeFile` pair — this is the site the axis question in the brief (`pages.ts` bounds writes, not memory or wire-sized input) is asking about, and the comment settles it in the code's own words.

### 3. `mirror.ts`: the same bound, reused not reinvented, with a measured number

```ts
// ocx-catalog/src/sources/mirror.ts:11,16-18,142-160
import { Semaphore } from "./walker.js";

/** In-flight write cap for the mirror copy, matching `walker.ts`'s fetch cap
 * (16). The per-source trees are written concurrently through one bounded
 * `Semaphore` rather than serially awaited file-by-file — a large index is
 * thousands of small writes whose latency is otherwise fully serialized
 * (rev-perf, 2026-08-22, ~2.6x). */
const MAX_WRITE_CONCURRENCY = 16;

export async function mirrorSources(/* ... */): Promise<MirrorResult> {
  const written: string[] = [];
  const semaphore = new Semaphore(MAX_WRITE_CONCURRENCY);
  const writes: Promise<void>[] = [];

  const enqueue = (relPath: string, bytes: Uint8Array | string): void => {
    writes.push(
      (async () => {
        const release = await semaphore.acquire();
        try {
          await writeDistFile(distDir, relPath, bytes, written);
        } finally {
          release();
        }
      })(),
    );
  };
  // ... (for loop pushes into `writes` via enqueue, not `.map()`)
  await Promise.all(writes);
}
```

This is not a `.map(async …)` literally — `writes` is built by a `for` loop calling `enqueue()` — but it is the same shape (a dynamically-sized `Promise<void>[]` awaited via one `Promise.all`) with the same fix already applied. Two things are worth taking as fleet convention: (1) `Semaphore` is **imported from `walker.ts`**, not redefined — the fleet already treats this as shared, reusable infrastructure rather than a per-call-site reinvention; (2) the comment cites a *measured* number for why the bound exists at all — "rev-perf, 2026-08-22, ~2.6x" — meaning the fleet's own prior investigation found *serializing* file writes here cost 2.6x wall-clock versus bounded concurrency. **The bound in this fleet is doing double duty: it exists for throughput (this file) and for fd/write-pressure safety (§2's comment) — not, in either case, for wire-input memory.**

### 4. `walker.ts:708`: the site that looks unbounded and isn't — a dated incident and its fix

```ts
// ocx-catalog/src/sources/walker.ts:697-708
const { packages } = JSON.parse(new TextDecoder().decode(indexBytes)) as { packages: Record<string, string> };
const entries = Object.entries(packages);
if (entries.length > MAX_INDEX_ENTRIES) {
  throw new Error(
    `${indexUrl}: c/index.json declares ${entries.length} packages, exceeding the ${MAX_INDEX_ENTRIES}-package maximum`,
  );
}
await Promise.all(entries.map(([qualifiedId, digest]) => processPackage(qualifiedId, digest, ctx, files)));
```

`MAX_INDEX_ENTRIES = 50_000` (`walker.ts:81`). At a glance, this `Promise.all(entries.map(...))` has **no visible bound at the call site** — a rule that only looks at the `Promise.all`/`.map()` line itself would flag this as unbounded, and it would be looking in the wrong place. `processPackage` (`walker.ts:512-542`) calls `loadOrFetch` for the package root and (in a further inner loop) for every tag digest and optional asset; `loadOrFetch` is where the real gate lives:

```ts
// ocx-catalog/src/sources/walker.ts:339-354
async function loadOrFetch(ctx: WalkerContext, wirePath: WirePath, digest: string, ext: string): Promise<Uint8Array> {
  const cacheFile = casCachePath(ctx.cacheDir, digest, ext);

  // Security panel WARN (2026-08-22): the cache READ used to run before
  // acquiring the semaphore, so `Promise.all` over a hostile index with
  // thousands of cheap entries fanned out that many concurrent disk reads
  // at once, unbounded — everything this function does now happens inside
  // the SAME gate as the network leg.
  const release = await ctx.semaphore.acquire();
  try {
    const cached = await readVerifiedCache(cacheFile, digest);
    if (cached !== null) return cached;
    const response = await retryFetch(ctx.fetchImpl, `${ctx.baseUrl}/${wirePath}`, /* ... */);
    // ...
  } finally { release(); }
}
```

`ctx.semaphore` is `new Semaphore(MAX_CONCURRENCY)` with `MAX_CONCURRENCY = 16` (`walker.ts:25,655`) — the **same constant** `pages.ts` reuses. This is the fleet's one documented real incident matching the brief's premise exactly ("a hostile index with thousands of cheap entries"), dated 2026-08-22, and the fix the fleet actually shipped teaches the load-bearing lesson for this whole topic: **the bound belongs on the I/O operation, not on the promise-array construction.** Creating 50,000 pending promises that immediately queue on `semaphore.acquire()` is cheap — a `Promise` plus a closure is on the order of a few hundred bytes, and none of them touches a socket or file descriptor until `acquire()` resolves. The dangerous resource (sockets, fds, disk I/O) is what the semaphore actually gates, three call-frames below the `Promise.all` a naive rule would inspect.

### 5. `detailsCache.ts`: two unbounded sites that are provably safe

```ts
// grimoire-vscode/src/detailsCache.ts:186-198 (presentCardMeta)
async presentCardMeta(repos: string[]): Promise<Map<string, CachedCardMeta>> {
  const names = new Set(await fs.readdir(this.dir).catch(() => [] as string[]));
  const out = new Map<string, CachedCardMeta>();
  await Promise.all(
    repos.map(async (repo) => {
      if (!names.has(hashName(repo))) return;
      const entry = await this.load(repo);   // one fs.readFile
      const meta = cardMetaOf(entry);
      if (meta) out.set(repo, meta);
    }),
  );
  return out;
}
```

`repos` traces to `sidebar.ts:772`: `cards.map((c) => c.repo)`, where `cards` is `this.lastReady?.cards` concatenated with `.installed` — the sidebar's currently-rendered card list, sourced from a `grim search`/registry-query result plus the locally resolved installed set. This *is* wire-derived in origin, but each iteration does exactly one local `fs.readFile` on a hashed cache filename — no network call, no write, no fd held across an `await` boundary longer than one read. The realistic bound on `repos.length` today is the fleet's own catalog size (tens of packages); nothing here opens a socket per element.

```ts
// grimoire-vscode/src/detailsCache.ts:131,229-244 (prune)
const MAX_ENTRIES = 256;
// ...
private async prune(): Promise<void> {
  const names = await fs.readdir(this.dir).catch(() => [] as string[]);
  const files = names.filter((n) => n.endsWith('.json'));
  if (files.length <= this.maxEntries) return;
  const stats = await Promise.all(
    files.map(async (name) => {
      const full = path.join(this.dir, name);
      const stat = await fs.stat(full).catch(() => null);
      return { full, mtime: stat ? stat.mtimeMs : 0 };
    }),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  await Promise.all(
    stats.slice(this.maxEntries).map((s) => fs.rm(s.full, { force: true }).catch(() => {})),
  );
}
```

Array source: `fs.readdir(this.dir)` — a **directory listing**, filtered to `.json`, of a directory the same class actively prunes back to `MAX_ENTRIES = 256` on every `save()`. `prune()` only runs when the count already exceeds the cap, and each element does one `fs.stat`/`fs.rm` — local-fs-only, and self-limiting by the cache's own design (it cannot accumulate far past 256 under normal operation; the only way it grows large is external interference with the cache directory, which is a different threat model). Neither of these two sites, nor `presentCardMeta`, has ever needed a limiter, and adding one would be pure ceremony.

### 6. `path.ts`/git sources: serial by construction — the opposite failure mode

```ts
// ocx-catalog/src/sources/path.ts:167-198 (walkTree, abbreviated)
async function walkTree(rootReal, root, wirePrefix, out, visited): Promise<void> {
  const entries = await readdir(join(root, ...wirePrefix.split("/")), { withFileTypes: true });
  for (const dirent of entries) {
    const real = await realpath(join(...));
    const stats = await stat(real);
    if (stats.isDirectory()) {
      await walkTree(rootReal, root, childWire, out, visited);   // recurse, awaited
    } else if (/* wire asset */) {
      out.set(childWire, await readFile(real));                  // awaited
    }
  }
}
```

`git`/`path` sources (the local-filesystem counterpart to the `url` source `walker.ts` handles) walk their tree with a plain `for...of` loop, `await`ing every `realpath`/`stat`/`readFile`/recursive call — **zero concurrency**, not unbounded concurrency. This is out of scope for the brief's question (which is about *too much* concurrency) but worth recording because it means the fleet's local-source path has no `Promise.all(...)` fan-out to classify at all, and a rule that mechanically hunts for ".map(async" would never even see it — correctly, since there is nothing to bound here.

### 7. What a bound actually protects against, ranked by what's real at this fleet's scale

| Resource | Real at this fleet's measured scale? | Evidence |
|---|---|---|
| **Filesystem write throughput/latency** | **Yes — the only axis with a measured number.** | `mirror.ts`'s own comment: serial writes cost ~2.6x wall-clock vs. bounded-concurrent (rev-perf, 2026-08-22). This is the fleet's actual, cited reason for both existing `Semaphore` uses. |
| **File descriptor exhaustion (EMFILE)** | Plausible at `walker.ts`'s upper bound (50,000 entries) but not measured; already mitigated by the same `Semaphore(16)`. | The classic Node failure mode this resembles is well-documented by the `graceful-fs` package, built specifically to queue `open`/`readdir` calls and retry once something closes on `EMFILE` — ["trade EMFILE errors for slower fs operations"](https://raw.githubusercontent.com/isaacs/node-graceful-fs/main/README.md). The fleet does not depend on `graceful-fs`; its own `Semaphore` prevents ever reaching this condition instead of recovering from it. |
| **Socket/connection exhaustion** | Structurally possible, not observed. | Node's global `fetch()` (undici) has **no default cap** on concurrent connections per origin — `Pool`'s `connections` option defaults to `null`, explicitly "unlimited" — [undici Pool docs](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Pool.md). `walker.ts` is the fleet's only per-element-fetch loop and it is already gated at 16. |
| **Process memory (the array itself, or buffered response bodies)** | **Not the fleet's real risk today.** | `walker.ts` already caps blob size at 8 MiB per asset (`MAX_RESPONSE_BYTES`, per `mirror.ts`'s own comment) and entry count at 50,000; 50,000 pending `Promise` objects awaiting a semaphore, each holding a closure over a couple of strings, is on the order of tens of MB at absolute worst — not a credible OOM vector at this fleet's scale. The brief's own framing (the dives already declared this "not memory") is confirmed by the numbers, not just asserted. |
| **The remote server's rate limit** | **No fleet dependency documents one.** | No fleet `url` source, registry, or API client in this codebase carries a stated rate limit or 429-handling path (a separate, already-covered gap — see `cancellation-and-timeouts.md`'s retry/backoff findings). A concurrency bound is not a substitute for rate-limit handling, and this fleet has neither today. |

The general engineering framing for *why* any of this matters — isolating a pool of resources so that overload from one consumer/dependency doesn't exhaust what others need — is the **Bulkhead pattern**: "partition service instances into different groups... consider using processes, thread pools, and semaphores" for consumer-side isolation — [Microsoft Azure Architecture Center, Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) (updated 2026-06-24). This fleet's `Semaphore` **is** a bulkhead in miniature: one pool (16 concurrent fs writes, or 16 concurrent fetch+cache-read units) shared across every element of a batch, so one hostile/oversized batch degrades to slow instead of to resource-starved.

### 8. p-limit, p-map, p-queue, Node's `readable.map()`, and the hand-rolled `Semaphore` compared

| Primitive | Current version (fetched 2026-08-29) | Maintenance | API shape | Fit for this fleet |
|---|---|---|---|---|
| Hand-rolled `Semaphore` (`walker.ts:179-205`) | N/A — 25 lines, already in the fleet | Already tested (`ocx-catalog/test/sources/*concurrency*.test.ts`), already reused (`mirror.ts`) | `const s = new Semaphore(n); const release = await s.acquire(); try { ... } finally { release(); }` | **Best fit where it already exists.** Ladder rung 2 ("already in this codebase") — no reason for `ocx-catalog` or a sibling repo to add a dependency for what it already has, correctly, twice. |
| [`p-limit`](https://raw.githubusercontent.com/sindresorhus/p-limit/main/readme.md) | `7.3.1`, published 2026-07-20 — [npm](https://registry.npmjs.org/p-limit) | Active (5-week-old release as of this research) | `const limit = pLimit(16); await Promise.all(arr.map(x => limit(() => doThing(x))))` | **Best fit for a first adoption in a repo that has nothing yet.** Smallest API of the three libraries, ESM (`"type":"module"`), requires Node `>=20` — met by every fleet repo with an `engines.node` floor. |
| [`p-map`](https://raw.githubusercontent.com/sindresorhus/p-map/main/readme.md) | `7.0.7`, published 2026-08-27 — [npm](https://registry.npmjs.org/p-map) | Active (2 days old as of this research) | `await pMap(arr, mapper, { concurrency: 16 })` | Ergonomic wrapper, but **`concurrency` defaults to `Infinity`** — the option must always be passed explicitly or it provides nothing. Marginal win over `p-limit` for an array-in/array-out shape; not worth adding as a *second* dependency alongside `p-limit`. |
| [`p-queue`](https://raw.githubusercontent.com/sindresorhus/p-queue/main/readme.md) | `9.3.3`, published 2026-07-22 — [npm](https://registry.npmjs.org/p-queue) | Active | `const q = new PQueue({ concurrency: 16, intervalCap, interval }); await q.add(() => doThing())` | **Overbuilt for this fleet.** Its differentiators — rate-limiting (`intervalCap`), priority, pause/resume — solve a problem (an external rate limit; a need to reprioritize in-flight work) that no fleet dependency has today (§7). Adopting it here is capability nobody asked for. |
| `Readable.prototype.map(fn, { concurrency })` | Node native, added v17.4.0/v16.14.0 | N/A (ships with Node) — still **Experimental (Stability 1)** — [Node stream docs](https://raw.githubusercontent.com/nodejs/node/main/doc/api/stream.md) | `await Array.fromAsync(Readable.from(arr).map(fn, { concurrency: 16 }))` | Zero-dependency, but Experimental stability and the array↔stream round-trip is more ceremony than `p-limit`'s one-liner for a shape (bounded array-in, array-out) this fleet's 6 sites all share. `stream.pipeline()` itself carries **no** concurrency option — the primitive is this `Readable` instance method, not `pipeline`. Watch, don't adopt. |

### 9. No lint checks this — confirmed against `no-floating-promises`'s own docs

`no-floating-promises`'s own incorrect/correct pair is, verbatim, the same shape this whole file is about:

Incorrect:
```ts
[1, 2, 3].map(async x => x + 1);
```
Correct:
```ts
await Promise.all([1, 2, 3].map(async x => x + 1));
```
[typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) (page banner v8.68.0). The rule's entire job stops at "is the promise observed" — its docs confirm it does not evaluate concurrency bounds or resource limits at all. Every one of this fleet's 6 sites is already "correct" by this rule's own example, including the 2 that carry no bound (§5) and the 1 that is bound 3 frames away from the call site (§4). No amount of turning on `strictTypeChecked` fleet-wide (already decided elsewhere as the type-aware-rollout target) will ever flag an unbounded — but observed — `Promise.all`. Anything this rule set says about concurrency bounds has to be enforced as a **reading heuristic**, not a lint, because no off-the-shelf lint rule looks at the array's *source*, only at whether its result is awaited.

## Normative guidance candidates

1. **A `Promise.all`/`Promise.allSettled` array built from data decoded off a network response (`await response.json()`, `JSON.parse(<fetched bytes>)`) that drives its own per-element network fetch or filesystem write MUST have a concurrency bound (a `Semaphore`/`p-limit`) somewhere in the call chain reached by each element, before that element's first `fetch()`/`fs.write*`/`spawn` call.** The bound does not have to sit at the `Promise.all` call site — `walker.ts`'s own precedent (§4) puts it inside the leaf I/O function instead, deliberately. **Rationale:** this is the one shape the fleet has ever gotten wrong (the 2026-08-22 `walker.ts` incident), and it is the one shape where a real, cited, unbounded-fanout failure is possible at this fleet's scale (§7). **Verify (reading heuristic, not a lint — §9):** `grep -rn "Promise\.\(all\|allSettled\)(" --include="*.ts" -B3` and check whether the array traces to a `.json()`/`JSON.parse` call; if it does, grep the mapped function and everything it calls (one or two levels) for `Semaphore\|acquire(\|pLimit\|new PQueue` — a hit anywhere in that chain satisfies the rule, an absence anywhere in it does not.
2. **Do NOT add a blanket "every `Promise.all(arr.map(async …))` needs a limiter" rule.** **Rationale:** measured fleet-wide (§1–§6), 4 of the 6 production sites are local-filesystem-only with a hard or self-limiting cap (N ≤ 256) and have never needed one; a blind AST-shaped rule would flag them as false positives while adding zero real protection, which is exactly the ceremony this program's own charter (a fleet this size, sonnet-authored rule set with no human in the loop) exists to avoid. **Verify:** if a future lint/rule PR proposes flagging every dynamically-sized `.map()` inside `Promise.all` regardless of what the mapped callback does, reject it and point at this file's §5/§6.
3. **When a repo needs this bound for the first time and has no existing `Semaphore` to reuse, reach for `p-limit`, not `p-queue` and not a fresh hand-rolled class.** **Rationale:** `p-queue`'s rate-limiting/priority surface is unneeded ceremony here (§7, §8); a fresh hand-rolled semaphore reinvents ~25 already-tested lines `ocx-catalog` already has for exactly this reason (ladder: reuse beats rewrite, and once you're past "already in this codebase," a maintained one-liner beats a new hand roll). **Verify:** a new concurrency-bounding class introduced in a repo that could instead `import` `ocx-catalog`'s pattern or add `p-limit` should be treated as a design-review flag, not a routine merge.
4. **If `p-map` is used, `concurrency` must always be passed explicitly — never rely on the default.** **Rationale:** `p-map`'s default is `Infinity` (§ Summary) — the exact opposite of a bound, and a reviewer skimming `pMap(arr, fn)` without the option present has no signal anything is wrong. **Verify:** `grep -rn "pMap(" --include="*.ts"` — every hit's call must include a `concurrency:` key in its options argument.
5. **A hardcoded concurrency cap, when one is needed, should default to 16 unless a specific measurement says otherwise** — matching the fleet's own two independently-chosen constants (`PAGE_WRITE_CONCURRENCY`, `MAX_WRITE_CONCURRENCY`, `MAX_CONCURRENCY`, all `= 16`). **Rationale:** consistency with an already-established, comment-justified fleet convention beats a fresh arbitrary number; §3's cited "walker.ts's own fetch queue (MAX_CONCURRENCY)" language shows the fleet already treats 16 as "the" number, not a per-caller tuning knob. **Verify:** a new concurrency constant that isn't 16 should carry its own comment explaining why it differs (a measured number, per §3's `mirror.ts` precedent, or a documented resource ceiling), the same bar `pages.ts`/`mirror.ts` already meet.
6. **A wire-decoded array feeding `Promise.all(arr.map(...))` should validate an upper bound on `arr.length` before the loop, in addition to (not instead of) the concurrency bound inside it.** **Rationale:** `walker.ts`'s `MAX_INDEX_ENTRIES = 50_000` throw (§4) is a second, independent layer — the concurrency bound limits how many operations run *at once*, the length cap limits how much total work a single hostile/oversized response can demand at all; neither substitutes for the other, and the fleet already does both at its one real risk site. **Verify:** for the same sites rule #1 flags, confirm a `length >` check (or equivalent) exists near where the array is decoded, separate from the semaphore/limiter check.

## AI-agent angle

- **Reaching for `Promise.all(arr.map(async …))` as the reflexive "make it parallel" pattern the moment a loop does `await` work, without asking what `arr`'s length depends on.** This is the single most idiomatic, most-trained-on concurrency pattern in the language, and it is *correct* for a fixed-arity list of 2-3 known operations (the fleet's dominant use, §1) — the failure mode is applying the exact same reflex to a network-response-sized array without noticing the difference. **Smallest check:** rule #1's grep — trace the array's origin before accepting the diff; a `.map(async` whose array traces to a `.json()`/`fetch()` result with no `Semaphore`/`p-limit` anywhere downstream is the pattern to flag.
- **Adding the bound at the `Promise.all` call site and declaring the job done, without checking whether the *real* I/O happens several calls deeper (walker.ts's own pre-2026-08-22 bug).** An agent asked to "bound this Promise.all" will very plausibly wrap the array-construction line itself (`Promise.all(pLimit_wrapped_map)`) while the actual fetch/read that does the resource-consuming work lives inside a helper function called from the mapped callback — exactly the shape the fleet's own incident was. **Smallest check:** for any newly-added bound, trace the mapped callback's full call graph and confirm the *last* unguarded I/O call inside it (not just the first line) is inside the gate — a semaphore acquired, then released, then a fetch/write that happens *after* release is not bounded by it.
- **Reaching for `p-queue` because its README reads as "the professional choice" (rate limiting, priority, pause) without checking whether the fleet actually needs any of that.** An agent optimizing for "looks production-grade" will over-select capability. **Smallest check:** if a diff adds `p-queue`, grep for actual use of `intervalCap`/`priority`/`pause()` — if the diff only ever calls `.add(fn)` with a bare `concurrency` option, it is `p-limit` with extra dependency weight and should be flagged in review (rule #3).
- **Trusting `p-map`'s call signature to imply a bound exists, because the function is named "p-map" and takes an `options` argument, without checking what happens when `concurrency` is omitted.** **Smallest check:** rule #4's grep — every `pMap(` call must show `concurrency:` in the same call.
- **Assuming `tsc --noEmit --strict` or the fleet's currently-wired lints (`no-floating-promises`/`no-misused-promises` where present) would catch an unbounded `Promise.all` if it were actually a problem, because "the linter didn't complain."** Confirmed false (§9) — neither rule, nor the compiler, evaluates the array's source or size. **Smallest check:** a green `tsc`/`eslint` run is not evidence a concurrency-bound review can be skipped; this is a reading-heuristic-only gate (rule #1), and a reviewer/agent should not treat CI passing as covering it.

## Contested / evolving

- **Whether `Readable.prototype.map()`'s Experimental (Stability 1) status is close to graduating: could not establish as of 2026-08-29.** The current `stream.md` docs list it at Stability 1 with no changelog note in the fetched excerpt about a pending promotion; this file treats it as "watch, don't adopt" on that basis alone, independent of the ergonomics argument in §8.
- **Whether any fleet-adjacent registry (the `url`-source origin `walker.ts` fetches from) enforces a server-side rate limit today: could not establish as of 2026-08-29** from source alone — this would require checking the actual remote service's documented limits, which is outside this file's read-only-fleet-code scope. If one exists, `p-queue`'s `intervalCap` (§8, rejected here as unneeded) would become the relevant primitive and this file's Decision would need revisiting for that one call site specifically — the rejection above is scoped to "no *fleet code* evidence of a rate limit today," not a permanent claim about the remote service.
- **The general industry trend is toward *not* hand-rolling concurrency primitives** — `p-limit`'s and `p-map`'s continued, frequent (weeks-old) releases as of this research suggest the ecosystem still treats this as a maintained-dependency problem, not a solved-by-the-language one; TC39 has not standardized a bounded-concurrency `Promise` combinator as of the versions read here. This fleet's own choice to hand-roll (`Semaphore`) rather than depend on `p-limit` predates this research and is not contested here — reuse of the existing class, not a rewrite, is what rule #3 recommends, precisely because rewriting a working, tested, already-shared 25-line class to match an outside trend would itself be the kind of unrequested churn this program should avoid.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/sindresorhus/p-limit — readme.md](https://raw.githubusercontent.com/sindresorhus/p-limit/main/readme.md) | Official README, primary source | Fetched 2026-08-29; package v7.3.1 published 2026-07-20 | The exact `limit(fn, ...args)` usage shape recommended in rule #3. |
| [github.com/sindresorhus/p-queue — readme.md](https://raw.githubusercontent.com/sindresorhus/p-queue/main/readme.md) | Official README, primary source | Fetched 2026-08-29; package v9.3.3 published 2026-07-22 | Confirms ESM-only status and the `intervalCap`/priority feature set this file rejects as overbuilt for the fleet (§8). |
| [github.com/sindresorhus/p-map — readme.md](https://raw.githubusercontent.com/sindresorhus/p-map/main/readme.md) | Official README, primary source | Fetched 2026-08-29; package v7.0.7 published 2026-08-27 | The `concurrency: Infinity` default that makes rule #4 necessary. |
| [registry.npmjs.org/p-limit](https://registry.npmjs.org/p-limit) | npm registry metadata, primary source | Queried 2026-08-29 | Exact latest-version publish timestamp and `engines.node` (`>=20`) used for the fleet Node-floor comparison. |
| [registry.npmjs.org/p-queue](https://registry.npmjs.org/p-queue) | npm registry metadata, primary source | Queried 2026-08-29 | Same, for `p-queue` (`engines.node >=20`, published 2026-07-22). |
| [registry.npmjs.org/p-map](https://registry.npmjs.org/p-map) | npm registry metadata, primary source | Queried 2026-08-29 | Same, for `p-map` (`engines.node >=18`, published 2026-08-27). |
| [github.com/nodejs/node — doc/api/stream.md](https://raw.githubusercontent.com/nodejs/node/main/doc/api/stream.md) | Node.js official docs, primary source | Fetched 2026-08-29 | `readable.map(fn, { concurrency })`'s exact signature, default `concurrency: 1`, Experimental stability, and confirmation `stream.pipeline()` itself has no concurrency option. |
| [github.com/nodejs/undici — docs/docs/api/Pool.md](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Pool.md) | undici official docs, primary source | Fetched 2026-08-29 | `connections: null` default = unlimited concurrent connections per origin — the reason a bare `fetch()` loop has no runtime-provided ceiling. |
| [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) | Node.js official API docs, primary source | Fetched 2026-08-29 (Node v26.8.1 docs) | `fork()`'s own resource-allocation warning against spawning many child processes concurrently — the process-count analog of this file's fs/socket findings. |
| [github.com/isaacs/node-graceful-fs — README.md](https://raw.githubusercontent.com/isaacs/node-graceful-fs/main/README.md) | Widely-used community package README | Fetched 2026-08-29 | Canonical explanation of the `EMFILE` failure mode a bound protects against, and the alternative strategy (queue-and-retry) the fleet's own `Semaphore` avoids needing by preventing the condition instead. |
| [learn.microsoft.com/azure/architecture/patterns/bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) | Microsoft Azure Architecture Center, vendor-neutral pattern reference | Content updated 2026-06-24 | The general Bulkhead-pattern framing ("partition... using processes, thread pools, and semaphores") this file's §7 uses to name what a concurrency bound is doing conceptually. |
| [typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | Official typescript-eslint rule docs, primary source | Fetched 2026-08-29; page banner v8.68.0 | Confirms, in the rule's own words, that it checks only whether a promise is observed — not concurrency bounds — settling §9's "no lint catches this" claim directly rather than by inference. |

Fleet code read (not web sources, cited inline in Findings by path:line): `ocx-catalog/src/build/pages.ts`, `ocx-catalog/src/build/sources_pipeline.ts`, `ocx-catalog/src/build/engine.ts`, `ocx-catalog/src/build/dev_worker.ts`, `ocx-catalog/src/sources/walker.ts`, `ocx-catalog/src/sources/mirror.ts`, `ocx-catalog/src/sources/path.ts`, `grimoire-vscode/src/detailsCache.ts`, `grimoire-vscode/src/views/details.ts`, `grimoire-vscode/src/views/sidebar.ts`, `grimoire-vscode/src/extension.ts`, `grimoire-vscode/src/scopes.ts`, `grimoire-vscode/src/installer.ts`, `grimoire-vscode/src/views/settings.ts`, `grimoire-indexer/src/cli/{build,dev,enrich}.ts`, `ocx-catalog/src/build/config_gen.ts`, `creeptd-ng/web/src/stores/useLeaderboardStore.ts`, and every fleet repo's `package.json` (dependency and `engines` grep).
