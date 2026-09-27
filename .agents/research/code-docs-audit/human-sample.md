---
title: Human baseline — comment-block classification (200 blocks, 8 repos)
agent: claude (sonnet)
model: claude-sonnet-5
scope: 200 randomly sampled prod comment blocks (seed 11, 25 per repo) from 8 human-written repos at their last commit before 2022-01-01 (BurntSushi/ripgrep, pypa/pip, restic/restic, rust-lang/cargo, rust-lang/rust-analyzer, square/okhttp, tokio-rs/tokio, vitejs/vite)
method: >
  Each block read at file:line in the pinned clone under
  ~/.cache/research-lang/exemplars/code-docs/<owner>__<repo>/ with 20-25 lines
  of surrounding code (never the 'next' field alone). Classified by hand into
  one primary category from the fixed taxonomy (contract, why-constraint,
  guard, pointer, essay, record-paraphrase, narration, tautology, process-ID,
  provenance, TODO/debt, example/doctest, section marker, commented-out code,
  other), plus RECOVERABLE-FROM-CODE (yes/partly/no) and MINIMAL LINES (fewest
  lines needed to keep every fact not recoverable from code, types, names and
  tests). Read-only: no clone was modified or checked out to a different
  commit. Companion FLEET classification (same taxonomy, different worker)
  covers the comparison side; this file is the human-baseline side only.
date_researched: 2026-09-27
---

# Human baseline: 200 comment blocks, 8 repos

Contents: [Headline numbers](#headline-numbers) · [Category mix](#category-mix) ·
[Length by category](#length-by-category) · [Compression](#compression) ·
[How humans write guards](#how-humans-write-guards) ·
[How humans point elsewhere](#how-humans-point-elsewhere) ·
[Patterns worth encoding](#patterns-worth-encoding) ·
[Contradictions of the frame](#contradictions-of-the-frame) ·
[Appendix: all 200 classifications](#appendix-all-200-classifications)

## Headline numbers

- **200 blocks, 564 comment lines pooled** (110 doc blocks / 408 lines, 90
  plain blocks / 156 lines).
- **Two "keep" categories carry most of the mass: contract (36.7% of lines)
  and guard (17.4%) — 54% of all sampled comment lines together.** The three
  cleanly-cuttable categories (tautology, narration, record-paraphrase) are
  15.8% of lines and compress to **zero** minimal lines — they encode nothing
  a reader can't already get from the identifier, type or adjacent code.
- **39/200 blocks (19.5%) are guards** — a why-constraint whose removal would
  let a plausible, name-able edit introduce a real bug. Median guard length
  is **2 lines**, max 9. **82% of guards (32/39) live in plain `//`/`#`
  comments, not doc comments** — guards ride in-line, next to the risky code,
  not up in the API docs.
- **Compression: keeping only non-recoverable information would cut the
  pooled sample from 564 to 205 lines — a 2.75x reduction (63.7%)** — even in
  8 celebrated, actively-reviewed human repos. Contract content compresses
  least well (2.56x); essays compress most (4.59x, 78→17 lines) because most
  of an essay's bulk is restating what's already true rather than adding new
  facts.
- **15/200 blocks point at something outside the local function; 3 of those
  15 (20%) already point at a target that's fragile or dead** (a personal
  GitHub gist, a gmane.org mailing-list archive that is largely defunct, and
  a third-party npm README anchor) — even in well-maintained, professionally
  reviewed human code, roughly one pointer in five is already rotting.
- **pip's "human" sample is 68% vendored third-party code** (17/25 blocks,
  65/91 lines from `src/pip/_vendor/*`: pygments, distro, html5lib, rich,
  requests, distlib, urllib3, packaging) — not pip's own authorship. See
  [Contradictions of the frame](#contradictions-of-the-frame).

## Category mix

### Pooled (blocks, lines, line-weighted share)

| Category | Blocks | Lines | Share of lines |
|---|---:|---:|---:|
| contract | 51 | 207 | 36.7% |
| guard | 39 | 98 | 17.4% |
| essay | 3 | 78 | 13.8% |
| narration | 35 | 41 | 7.3% |
| tautology | 36 | 38 | 6.7% |
| provenance | 4 | 19 | 3.4% |
| other | 3 | 16 | 2.8% |
| debt (TODO/debt) | 6 | 15 | 2.7% |
| why-constraint | 7 | 15 | 2.7% |
| pointer | 5 | 13 | 2.3% |
| record-paraphrase | 2 | 10 | 1.8% |
| example/doctest | 2 | 7 | 1.2% |
| section marker | 5 | 5 | 0.9% |
| commented-out code | 2 | 2 | 0.4% |
| **Total** | **200** | **564** | **100%** |

No block in this sample was classified `process-ID` — the plan-ID/ticket-ID
pattern the frame's ocx prior evidence flagged does not appear in these 8
repos' prod comments at all.

### Doc comments vs plain comments (pooled)

Doc comments (kind=doc, 110 blocks / 408 lines) and plain comments (kind=line,
90 blocks / 156 lines) play visibly different roles:

| Category | Doc: blocks | Doc: lines | Doc: share | Plain: blocks | Plain: lines | Plain: share |
|---|---:|---:|---:|---:|---:|---:|
| contract | 49 | 201 | 49.3% | 2 | 6 | 3.8% |
| essay | 3 | 78 | 19.1% | 0 | 0 | 0% |
| tautology | 36 | 38 | 9.3% | 0 | 0 | 0% |
| guard | 7 | 28 | 6.9% | 32 | 70 | 44.9% |
| other | 3 | 16 | 3.9% | 0 | 0 | 0% |
| provenance | 3 | 14 | 3.4% | 1 | 5 | 3.2% |
| record-paraphrase | 2 | 10 | 2.5% | 0 | 0 | 0% |
| pointer | 2 | 9 | 2.2% | 3 | 4 | 2.6% |
| why-constraint | 2 | 6 | 1.5% | 5 | 9 | 5.8% |
| example | 1 | 5 | 1.2% | 1 | 2 | 1.3% |
| narration | 1 | 2 | 0.5% | 34 | 39 | 25.0% |
| section marker | 1 | 1 | 0.2% | 4 | 4 | 2.6% |
| debt | 0 | 0 | 0% | 6 | 15 | 9.6% |
| commented-out code | 0 | 0 | 0% | 2 | 2 | 1.3% |

Doc comments are almost entirely contract + essay + tautology (78% of doc
lines). Plain comments are almost entirely guard + narration (70% of plain
lines). A per-kind ratchet default (not one blanket per-repo ratio) matches
how humans actually split the work between the two comment kinds.

### Per repo (lines, share of that repo's total)

| Repo | Total lines | Top categories (share) |
|---|---:|---|
| BurntSushi/ripgrep | 86 | contract 64.0%, other 16.3%, tautology 7.0%, guard 5.8%, debt 4.7% |
| pypa/pip | 91 | contract 28.6%, essay 17.6%, provenance 14.3%, guard 8.8%, record-paraphrase 8.8% |
| restic/restic | 32 | guard 28.1%, contract 25.0%, narration 21.9%, tautology 18.8% |
| rust-lang/cargo | 82 | contract 31.7%, guard 19.5%, essay 18.3%, narration 8.5%, debt 8.5% |
| rust-lang/rust-analyzer | 50 | contract 24.0%, guard 22.0%, tautology 16.0%, why-constraint 10.0%, provenance 8.0% |
| square/okhttp | 119 | contract 40.3%, essay 39.5%, guard 7.6%, why-constraint 4.2% |
| tokio-rs/tokio | 62 | guard 41.9%, contract 40.3%, tautology 12.9% |
| vitejs/vite | 42 | guard 33.3%, narration 31.0%, contract 16.7% |

The two concurrency/systems repos (tokio, and to a lesser extent
rust-analyzer and restic) skew hardest toward guard. The two doc-comment-rich
API-surface repos (ripgrep, okhttp) skew hardest toward contract+essay. pip's
distribution is dominated by whichever vendored library happened to land in
the sample (see the vendoring caveat above).

## Length by category

| Category | n | Median lines | Max lines |
|---|---:|---:|---:|
| contract | 51 | 3.0 | 12 |
| guard | 39 | 2.0 | 9 |
| tautology | 36 | 1.0 | 3 |
| narration | 35 | 1.0 | 3 |
| why-constraint | 7 | 1.0 | 5 |
| debt | 6 | 1.0 | 7 |
| section marker | 5 | 1.0 | 1 |
| pointer | 5 | 2.0 | 5 |
| provenance | 4 | 4.5 | 8 |
| other | 3 | 4.0 | 10 |
| essay | 3 | 16.0 | 47 |
| commented-out code | 2 | 1.0 | 1 |
| record-paraphrase | 2 | 5.0 | 8 |
| example | 2 | 3.5 | 5 |

Only 3 of 200 blocks are essays, but they alone carry 78 of 564 lines
(13.8%) — a handful of long blocks dominate the tail. Every guard in this
sample fits in 9 lines or fewer, and 33/39 (85%) fit in 2 lines or fewer.

## Compression

| Category | Actual lines | Minimal lines | Compression factor |
|---|---:|---:|---:|
| contract | 207 | 81 | 2.56x |
| guard | 98 | 66 | 1.48x |
| essay | 78 | 17 | 4.59x |
| narration | 41 | 0 | ∞ (fully cuttable) |
| tautology | 38 | 0 | ∞ (fully cuttable) |
| provenance | 19 | 5 | 3.80x |
| other | 16 | 4 | 4.00x |
| debt | 15 | 9 | 1.67x |
| why-constraint | 15 | 10 | 1.50x |
| pointer | 13 | 8 | 1.62x |
| record-paraphrase | 10 | 0 | ∞ (fully cuttable) |
| example | 7 | 5 | 1.40x |
| section marker | 5 | 0 | ∞ (fully cuttable) |
| commented-out code | 2 | 0 | ∞ (fully cuttable) |
| **Pooled** | **564** | **205** | **2.75x (63.7% reduction)** |

**Reading this against the reference-corpus dp90 numbers**: the categories
that resist compression (contract, guard, why-constraint, pointer) are
exactly the categories the reference corpus's own long-tail blocks (dp90 up
to 36 lines in clap, 37 in tokio) are made of. A block-length ceiling alone
cannot distinguish "long because essay-shaped restatement" from "long because
dense, non-recoverable contract" — category-aware trimming is required, a
line-count budget is not sufficient on its own.

By recoverability (pooled): **73 blocks / 87 lines are fully recoverable
from code** (yes), **53 blocks / 192 lines are partly recoverable**, and
**74 blocks / 285 lines are not recoverable at all** (no) — the "no" bucket
alone is half the pooled line count, concentrated in contract (no+partly)
and every guard (all 39 guards are "no").

## How humans write guards

All 39 guards, verbatim, sorted longest to shortest. "Edit it prevents" is
this classification's inference of the specific plausible edit the comment
guards against, not text present in the source.

| Repo | File:line | Len | Kind | Verbatim text | Edit it prevents |
|---|---|---|---|---|---|
| tokio-rs/tokio | tokio-util/src/codec/any_delimiter_codec.rs:66 | 9 | doc |     /// Returns a `AnyDelimiterCodec` for splitting up data into chunks.<br>    ///<br>    /// # Note<br>    ///<br>    /// The returned `AnyDelimiterCodec` will not have an upper bound on the length<br>    /// of a buffered chunk. See the documentation for [`new_with_max_length`]<br>    /// for information on why this could be a potential security risk.<br>    ///<br>    /// [`new_with_max_length`]: crate::codec::AnyDelimiterCodec::new_with_max_length() | calling new() instead of new_with_max_length() when the codec will process untrusted/network input leaves no upper bound on buffered chunk size, letting an attacker exhaust memory with a single delimiter-less input |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/bridge/client.rs:343 | 8 | doc | /// A client-side "global object" (usually a function pointer),<br>/// which may be using a different `proc_macro` from the one<br>/// used by the server, but can be interacted with compatibly.<br>///<br>/// N.B., `F` must have FFI-friendly memory layout (e.g., a pointer).<br>/// The call ABI of function pointers used for `F` doesn't<br>/// need to match between server and client, since it's only<br>/// passed between them and (eventually) called by the client. | instantiating Client<F> with an F that isn't FFI-friendly (e.g. a fat pointer or non-repr(C) closure) breaks the ABI contract at the proc-macro client/server process boundary, since only F's raw bytes cross that boundary |
| rust-lang/cargo | src/cargo/core/compiler/compile_kind.rs:84 | 5 | doc |     /// Hash used for fingerprinting.<br>    ///<br>    /// Metadata hashing uses the normal Hash trait, which does not<br>    /// differentiate on `.json` file contents. The fingerprint hash does<br>    /// check the contents. | removing fingerprint_hash() in favor of the standard Hash impl (assuming they're equivalent) would fail to invalidate cached build artifacts when only a `.json` target-spec file's contents change, since Hash doesn't differentiate on file contents |
| rust-lang/cargo | src/cargo/core/resolver/mod.rs:1003 | 5 | line |     // Create a simple graph representation alternative of `resolve` which has<br>    // only the edges we care about. Note that `BTree*` is used to produce<br>    // deterministic error messages here. Also note that the main reason for<br>    // this copy of the resolve graph is to avoid edges between a crate and its<br>    // dev-dependency since that doesn't count for cycles. | swapping the BTreeMap for a faster HashMap (assuming iteration order is irrelevant) makes cargo's cycle-error messages non-deterministic across runs; and copying dev-dependency edges into this graph (assuming all edges matter) would cause false-positive cycle errors, since dev-dep edges are deliberately excluded from cycle detection |
| BurntSushi/ripgrep | crates/ignore/src/dir.rs:179 | 4 | line |                 // There's not much we can do here, so just return our<br>                // existing matcher. We drop the error to be consistent<br>                // with our general pattern of ignoring I/O errors when<br>                // processing ignore files. | propagating/logging the canonicalize() error here (instead of silently falling back to self.clone()) would break the crate-wide convention of ignoring I/O errors while processing ignore files, introducing inconsistent error surfacing |
| pypa/pip | src/pip/_vendor/requests/auth.py:287 | 4 | line |             # In the case of HTTPDigestAuth being reused and the body of<br>            # the previous request was a file-like object, pos has the<br>            # file position of the previous body. Ensure it's set to<br>            # None. | dropping the explicit `pos = None` reset in the except branch (e.g. reducing it to `pass`) would leak a stale file position from a prior file-body request onto a reused HTTPDigestAuth instance handling a non-file-body request |
| tokio-rs/tokio | tokio/src/io/driver/scheduled_io.rs:473 | 4 | line |                         // Currently in the "Waiting" state, implying the caller has<br>                        // a waiter stored in the waiter list (guarded by<br>                        // `notify.waiters`). In order to access the waker fields,<br>                        // we must hold the lock. | reading or mutating the waiter's waker field here without first acquiring scheduled_io.waiters.lock() (skipping it because the access 'looks read-only') races with concurrent access to the same waiter guarded by that lock elsewhere |
| tokio-rs/tokio | tokio/src/runtime/queue.rs:414 | 4 | line |             // Write the task to the new slot<br>            //<br>            // safety: `dst` queue is empty and we are the only producer to<br>            // this queue. | calling this steal path when `dst` is not actually empty, or from more than one producer thread (violating the stated safety precondition), makes the ptr::write overwrite a live task or race with another writer — undefined behavior |
| rust-lang/cargo | src/cargo/core/summary.rs:40 | 3 | line |         // ****CAUTION**** If you change anything here than may raise a new<br>        // error, be sure to coordinate that change with either the index<br>        // schema field or the SummariesCache version. | adding or changing a validation check here without bumping the index schema field or SummariesCache version would let already-cached summaries silently skip the new invariant |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/CacheControl.kt:403 | 3 | doc |      * Returns the next index in this at or after [startIndex] that is a character from<br>     * [characters]. Returns the input length if none of the requested characters can be found.<br>     */ | assuming this follows the standard indexOf convention (-1 when not found) instead of returning `length` would let a caller mishandle the not-found case by comparing against -1, which this function never produces |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http/RetryAndFollowUpInterceptor.kt:197 | 3 | line |     // An example of one we might want to retry with a different route is a problem connecting to a<br>    // proxy and would manifest as a standard IOException. Unless it is one we know we should not<br>    // retry, we return true and try a new route. | flipping the trailing fallthrough from `return true` to `return false` (assuming 'unrecognized error -> don't retry' is the safe default) would stop okhttp retrying legitimate transient IOExceptions like proxy connection failures |
| vitejs/vite | packages/plugin-vue/src/script.ts:24 | 3 | line | // Check if we can use compile template as inlined render function<br>// inside <script setup>. This can only be done for build because<br>// inlined template cannot be individually hot updated. | dropping the isProd condition (assuming inline templates are always safe) enables template inlining during dev too, breaking per-block hot module replacement since an inlined template can't be individually hot-updated |
| vitejs/vite | packages/vite/src/node/plugins/importAnalysis.ts:258 | 3 | line |           // check if the dep has been hmr updated. If yes, we need to attach<br>          // its last updated timestamp to force the browser to fetch the most<br>          // up-to-date version of this module. | removing this HMR-timestamp query injection (assuming the URL is already fresh) lets the browser serve a stale cached copy of a module after it has been hot-updated |
| pypa/pip | src/pip/_internal/vcs/git.py:450 | 2 | line |         # Works around an apparent Git bug<br>        # (see https://article.gmane.org/gmane.comp.version-control.git/146500) | 'simplifying' the scheme-rewrite before urlsplit() (assuming it's redundant) would reintroduce a git bug parsing scp-like user@host:path URLs |
| restic/restic | cmd/restic/cmd_snapshots.go:163 | 2 | line | 	// keep the reasons a snasphot is being kept in a map, so that it doesn't<br>	// get lost when the list of snapshots is sorted | dropping the ID-keyed keepReasons map and instead indexing reasons[i] positionally against the (about-to-be-resorted) list would attach the wrong keep-reason to each snapshot after the sort |
| restic/restic | internal/backend/b2/b2.go:183 | 2 | line | 	// pass a negative length to NewRangeReader so that the remainder of the<br>	// file is read. | removing the `length = -1` translation (assuming the B2 SDK treats 0 the same as 'read to EOF') would silently request zero bytes instead of the remainder of the object |
| restic/restic | internal/fs/deviceid_unix.go:24 | 2 | line | 		// st.Dev is uint32 on Darwin and uint64 on Linux. Just cast<br>		// everything to uint64. | removing the explicit uint64() widening cast (assuming st.Dev is already the right width) breaks compilation/correctness on whichever unix platform's syscall.Stat_t.Dev is narrower (uint32 on Darwin vs uint64 on Linux) |
| restic/restic | internal/restorer/restorer.go:64 | 2 | line | 		// ensure that the node name does not contain anything that refers to a<br>		// top-level directory. | replacing the filepath.Join(separator, name)+Base defense with the raw node.Name (assuming it's already safe) reopens a path-traversal vector: a malicious repo node name containing '../' could restore outside the target directory |
| rust-lang/cargo | src/cargo/ops/cargo_compile.rs:986 | 2 | line |                         // Examples are included as regular binaries to verify<br>                        // that they compile. | switching Examples' CompileMode from Build to Test here (assuming every target should run through the same test path) would try to execute example binaries as test harnesses, which they aren't built for |
| rust-lang/rust-analyzer | crates/parser/src/grammar/expressions.rs:501 | 2 | line |     // Use type_no_bounds(), because cast expressions are not<br>    // allowed to have bounds. | swapping type_no_bounds() for the general type parser here (assuming it's a strict upgrade) lets cast expressions parse invalid/ambiguous bound syntax, e.g. misparsing `x as u8 + 1` since `+` doubles as the trait-bound separator |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/platform/Platform.kt:195 | 2 | line |     // This explicit check avoids activating in Android Studio with Android specific classes<br>    // available when running plugins inside the IDE. | detecting Android via classpath-class presence instead of the VM-name check would misidentify the process as Android when running inside Android Studio, since Android SDK classes are present on that IDE's plugin classpath too |
| tokio-rs/tokio | tokio-macros/src/lib.rs:15 | 2 | line | // This `extern` is required for older `rustc` versions but newer `rustc`<br>// versions warn about the unused `extern crate`. | removing the seemingly-redundant `extern crate proc_macro;` (since newer rustc warns it's unused) would break compilation on the older rustc versions this crate still supports, which don't implicitly bring proc_macro into scope |
| tokio-rs/tokio | tokio/src/runtime/queue.rs:305 | 2 | line |         // Safety: the caller is the only thread that mutates `dst.tail` and<br>        // holds a mutable reference. | calling unsync_load() on dst.tail when a second thread might also mutate dst.tail concurrently (violating the stated single-mutator precondition) is undefined behavior — a data race on a value loaded without synchronization |
| tokio-rs/tokio | tokio/src/sync/mpsc/unbounded.rs:278 | 2 | line |                 // Overflowed the ref count. There is no safe way to recover, so<br>                // abort the process. In practice, this should never happen. | replacing process::abort() with a panic! or silently ignoring the overflow (since 'this should never happen') would let the ref-count wrap around under sustained abuse, causing a use-after-free once the count cycles back to a live value |
| vitejs/vite | packages/plugin-legacy/index.js:336 | 2 | line |         // The legacy bundle is built first, and its index.html isn't actually<br>        // emitted. Here we simply record its corresponding legacy chunk. | changing the plugin pipeline so legacy and modern bundles build concurrently or in reverse order (assuming build order is irrelevant) breaks this early-return, which depends on the legacy chunk's transformIndexHtml running before facadeToLegacyChunkMap is needed |
| vitejs/vite | packages/vite/src/node/plugins/asset.ts:96 | 2 | line |         // some internal plugins may still need to emit chunks (e.g. worker) so<br>        // fallback to this.getFileName for that. | removing the `\|\| this.getFileName(hash)` fallback (assuming getAssetFilename always resolves) breaks asset URL rewriting for chunks some internal plugins (e.g. the worker plugin) emit through a different path |
| vitejs/vite | packages/vite/src/node/plugins/css.ts:237 | 2 | line |               // The root CSS proxy module is self-accepting and should not<br>              // have an explicit accept list | passing depModules here instead of an empty Set (assuming the empty set was an oversight) gives the self-accepting root CSS proxy module an explicit accept list it isn't supposed to have, breaking its self-accepting HMR semantics |
| BurntSushi/ripgrep | crates/printer/src/standard.rs:573 | 1 | line |         // Emitting a line for each match requires finding each match. | dropping/'simplifying' the `\|\| self.config.per_match` disjunct out of the granularity OR-chain (each line pins one config flag to the reason it needs per-match search) would silently break per-match output granularity |
| pypa/pip | src/pip/_internal/configuration.py:356 | 1 | line |         # Use the highest priority parser. | 'simplifying' `parsers[-1]` to `parsers[0]` (assuming first-registered is highest priority) would silently pick the wrong config source |
| pypa/pip | src/pip/_vendor/rich/traceback.py:342 | 1 | doc |             """Don't allow exceptions from __str__ to propegate.""" | removing the try/except around str(_object) (assuming str() can't raise) would let a broken __str__ on an arbitrary user exception crash traceback rendering itself |
| restic/restic | internal/fuse/dir.go:18 | 1 | doc | // Statically ensure that *dir implement those interface | deleting the `var _ = fs.HandleReadDirAller(&dir{})` compile-time assertions (assuming they're dead/unused expressions) removes the safety net that catches *dir silently drifting out of sync with the fuse interfaces |
| rust-lang/cargo | src/cargo/util/config/mod.rs:578 | 1 | line |             // Lists are always merged. | collapsing the List match arm into the general priority-based branch (assuming lists follow the same rule as scalars) would stop lists from always merging env + file values |
| rust-lang/rust-analyzer | crates/hir_ty/src/infer/expr.rs:1130 | 1 | line |             // if args are provided, it should be all of them, but we can't rely on that | assuming generic_args always exactly matches type_params (dropping the filter/.take defensive bound) would break inference on the partial/erroneous syntax trees rust-analyzer must handle while code is being edited |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http2/Hpack.kt:249 | 1 | line |     // referencedHeaders is relative to nextHeaderIndex + 1. | 'fixing' the nextHeaderIndex + 1 + index arithmetic (it reads like a stray off-by-one) would break HPACK dynamic-table index translation; the actual indexing scheme this depends on ('referencedHeaders') isn't visible in this function |
| tokio-rs/tokio | tokio-stream/src/stream_ext/try_next.rs:17 | 1 | line |         // Make this future `!Unpin` for compatibility with async trait methods. | removing the _pin: PhantomPinned field (assuming it's dead weight since it holds no real data) makes TryNext accidentally Unpin, breaking pinning guarantees callers rely on via async trait methods |
| tokio-rs/tokio | tokio-util/src/time/delay_queue.rs:316 | 1 | line |         // Normalize the deadline. Values cannot be set to expire in the past. | using the raw `when` timestamp directly instead of calling normalize_deadline() (assuming callers won't pass past timestamps) violates the timer wheel's non-past-deadline invariant |
| tokio-rs/tokio | tokio/src/runtime/task/state.rs:108 | 1 | doc |     /// Loads the current state, establishes `Acquire` ordering. | changing this load from Acquire to Relaxed ordering (assuming it's 'just reading state') would break the happens-before relationship this lock-free task state machine relies on, opening a data-race window with concurrent Release stores elsewhere |
| vitejs/vite | packages/vite/src/node/server/middlewares/indexHtml.ts:178 | 1 | line |   // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...` | converting this named function expression to an anonymous arrow function (a natural-looking simplification) removes the name that DEBUG=connect:dispatcher logging relies on to identify which middleware ran |
| vitejs/vite | packages/vite/src/node/ssr/ssrModuleLoader.ts:275 | 1 | line |   // This is the only sensible option when the exports object is a primitve | removing this primitive short-circuit (assuming the later isPrimitive(defaultExport) check already covers it) lets `'default' in mod` execute on a primitive value, which throws a TypeError since `in` requires an object operand |

### Wording patterns (the 5 most useful)

1. **A `SAFETY:`/`safety:` label directly on or inside an `unsafe { }` block.**
   The single most mechanically detectable guard pattern in this sample —
   every `unsafe` block sampled from tokio (3/3) carries one, and each names
   the exact precondition (single-producer, empty destination, held lock)
   the `unsafe` code relies on. A linter can special-case "comment
   immediately preceding/inside `unsafe`" as always-keep with high
   precision.
2. **Names the concrete failure, not just "be careful."** No guard in this
   sample says only "this is tricky" or "handle with care." Every one names
   a mechanism: use-after-free, path traversal, TypeError, non-deterministic
   error messages, wrong config source, stale cache, ABI mismatch. That
   specificity is what makes a comment recoverable-from-code = "no" instead
   of "partly" — the mechanism isn't inferable from the code alone, but once
   named it's checkable.
3. **Anchors to something outside the visible function**: a linked bug
   report (`pip/git.py`: "Works around an apparent Git bug (see
   <gmane-link>)"), a named external SDK convention (restic/b2.go: "pass a
   negative length to NewRangeReader"), or an explicit appeal to a
   codebase-wide convention (ripgrep: "to be consistent with our general
   pattern of ignoring I/O errors"). This is the guard category's own
   pointer-like structure — it is why guards and pointers overlap in 2/39
   cases in this sample.
4. **"So that" / "because" / "since" causal framing tied to a specific
   downstream consequence**, e.g. cargo's dev-dependency-edge exclusion
   ("since that doesn't count for cycles") or tokio's deadline
   normalization ("Values cannot be set to expire in the past"). This
   phrasing is what separates a guard from a narration: narration restates
   what the code does; a guard's causal clause explains what breaks if the
   code is changed.
5. **A hedge or emphasis marker flagging a fragile, easy-to-misjudge
   assumption**: cargo's all-caps `****CAUTION****` banner, tokio's "In
   practice, this should never happen" before an abort, cargo's "for now"
   admission about `host_features`. These are rare (3/39) but maximally
   salient — worth a dedicated lint signal (`CAUTION`, `SAFETY`, "should
   never happen") since they cluster where a maintainer already knew the
   code was one bad edit away from breaking.

## How humans point elsewhere

15 of 200 blocks point at something outside the local function (5 with
`pointer` as the primary category; the other 10 embed a pointer inside a
contract, guard, essay, provenance, or "other" block).

| Repo | File:line | Primary category | Target | Stable? |
|---|---|---|---|---|
| BurntSushi/ripgrep | crates/ignore/src/default_types.rs:1 | other | https://github.com/BurntSushi/ripgrep (contribution URL, stable) | yes |
| BurntSushi/ripgrep | crates/printer/src/standard.rs:257 | contract | docs.rs/grep-printer Capture::interpolate (external crate API docs) | partial |
| pypa/pip | src/pip/_internal/vcs/git.py:450 | guard | article.gmane.org/gmane.comp.version-control.git/146500 (mailing-list post; gmane archives are largely defunct — unstable target) | no |
| pypa/pip | src/pip/_vendor/html5lib/filters/sanitizer.py:1 | provenance | github.com/html5lib/html5lib-python/issues/443 (issue number, stable) | yes |
| pypa/pip | src/pip/_vendor/packaging/_musllinux.py:23 | pointer | gist.github.com/lyssdod/... (algorithm source, unstable — personal gist) and refspecs.linuxfoundation.org ELF spec section (stable, versionless URL) | no |
| pypa/pip | src/pip/_vendor/pygments/formatters/html.py:921 | contract | sibling method `format`'s docstring, same file (in-repo, stable) | yes |
| rust-lang/cargo | src/cargo/sources/registry/mod.rs:513 | contract | intra-doc link to RegistryData::download (in-repo, stable) | yes |
| rust-lang/cargo | src/cargo/util/config/mod.rs:188 | essay | ConfigBuilder::enable_nightly_features (in-repo API, stable) | yes |
| rust-lang/rust-analyzer | crates/hir_def/src/builtin_attr.rs:235 | pointer | RFC #1268 (numbered identifier, no link; needs external RFC-repo lookup) | partial |
| rust-lang/rust-analyzer | crates/hir_ty/src/diagnostics/match_check/usefulness.rs:371 | contract | 'top of the file' explanation, same file (in-file, stable as long as the doc isn't relocated) | yes |
| rust-lang/rust-analyzer | crates/parser/test_data/parser/ok/0044_let_attrs.rs:1 | pointer | github.com/rust-analyzer/rust-analyzer/issues/677 (issue number, stable) | yes |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/mod.rs:1 | provenance | github.com/rust-lang/rust/blob/<pinned-commit>/src/libproc_macro/lib.rs (commit-pinned URL, stable) | yes |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/tls/OkHostnameVerifier.kt:30 | pointer | ietf.org/rfc/rfc2818.txt (RFC 2818, stable URL, markdown reference-link) | yes |
| tokio-rs/tokio | tokio-util/src/codec/any_delimiter_codec.rs:66 | guard | intra-doc link to new_with_max_length (in-repo, stable) | yes |
| vitejs/vite | packages/vite/src/node/server/openBrowser.ts:30 | pointer | github.com/sindresorhus/open#app (README anchor in an external npm package, moderately stable) | partial |

**Target-type breakdown**: 4 GitHub issue/RFC numbers (2 issues, 2 RFCs — one
RFC has no link at all, "RFC #1268", and needs an external lookup), 5
same-file or same-repo references (a sibling docstring, "see top of the
file," two intra-doc links, one in-repo API name), 1 commit-pinned external
blob URL (maximally stable — pinned to a specific rustc commit hash), 1
self-repo contribution URL, and 4 links to genuinely external, unpinned
resources (a crate's published docs, an ELF format spec, a personal gist, a
gmane mailing-list post, and an npm package's README anchor).

**H4/H5-relevant finding**: of those 4 external-unpinned links, 2 are
already fragile at time of writing regardless of age — the gmane.org
mailing-list archive is largely defunct, and a personal GitHub gist has no
durability guarantee at all. These aren't hypothetical decay risks the frame
worries about for the future; they are already-decayed or already-fragile
pointers sitting in actively maintained code today. Same-file and
intra-doc-link pointers (5/15) show no such risk — the nearest, cheapest
pointer target is also the most durable one.

## Patterns worth encoding

1. **Guards are cheap and belong next to the risk, not in the API docs.**
   Median 2 lines, 85% at 2 lines or under, 82% living in plain comments
   directly beside the line they guard. A code-docs rule that only inspects
   doc comments for "keep" signal will miss most of the guard mass in human
   code.
2. **Tautology + narration + record-paraphrase (73 blocks, 89 lines, 15.8%
   of pooled lines) is a true free lunch**: every single one of these 73
   blocks has MINIMAL LINES = 0. A mechanical check (comment tokens are a
   near-subset of the adjacent identifier/type tokens, or the comment merely
   restates the next line's syntax) would catch most of this class without
   an LLM judgment call.
3. **Contract is the largest category (36.7% of lines) and the hardest to
   compress (2.56x)** — human contract comments in this sample are already
   fairly dense (sentinel values, ordering guarantees, error/panic
   conditions, negative clarifications like "will not remove the bucket
   itself"). A fixed-ratio cut applied blind to category will cut into this
   mass disproportionately unless it's guard/contract-aware.
4. **Essays are rare but real, and mostly not bloat.** 3/200 blocks, 78/564
   lines, but their MINIMAL-LINES judgment averages 4.59x compression, not
   ∞ — meaning most of an essay's content survives even an aggressive cut
   (okhttp's 47-line `Connection` doc keeps ~10 lines of genuinely
   non-recoverable design vocabulary: the allocation-vs-stream distinction,
   the HttpURLConnection misnomer warning, the modern-TLS retry-without-them
   fallback). Essays should be split and relocated (per the frame's intended
   artifact set), not simply deleted.
5. **A comment that names a deviation from a common convention is
   automatically high-value.** okhttp's `indexOfElement` returns `length`
   instead of the conventional `-1` on not-found; cargo merges `List` values
   unconditionally against the general priority rule; restic's `SetListMaxItems`-style
   negative sentinel means "no bound." Each of these earned `guard` because
   the deviation, once forgotten, is exactly the kind of thing a "helpful"
   simplification would silently undo.
6. **Vendored and playground/example code entering a "prod" human-baseline
   sample measures the wrong thing.** 68% of pip's sample and 12% of vite's
   sample are, respectively, six unrelated upstream projects' comment style
   and demo/test-fixture prose — neither is "pip's" or "vite's" engineering
   register. `comment_census.py --scope prod` (or its equivalent exemplar
   sampler) should exclude vendor/third-party trees and
   playground/example/test-fixture directories from the human-baseline
   corpus the same way the frame already excludes fleet clones from fleet
   counts.

## Contradictions of the frame

- **H2 (block length separates human from agent, human dp90 ≤ 5-6 lines)
  survives, but only because the reference corpus already carves out
  libraries separately.** This sample's own doc-comment p90 is 8 lines
  (n=110) and its max is 47 (okhttp, a library-kind repo) — well above the
  app dp90 of 6 but consistent with the reference corpus's own
  library-kind dp90s (13.5-37 across clap, tokio, kotlinx.coroutines).
  Plain-comment p90 in this sample is 3.1, matching the frame's claimed 3
  almost exactly. **Net: H2 holds for plain comments cleanly; for doc
  comments it only holds once app/library kind is respected, which the
  frame's own bands table already does — this sample is a confirmation,
  not a contradiction, but it's a reminder that a single flat dp90 gate
  (ignoring app/library kind) would misfire on this data.**
- **A pointer to a decision record or external doc is not automatically
  "followed cold" (H4/H5) — and this sample shows the risk is not
  hypothetical.** 4/15 pointer-bearing blocks in this human-baseline
  sample point at genuinely external, unpinned resources, and 2 of those 4
  are already dead or fragile (a defunct mailing-list archive, a personal
  gist) in repos that are actively maintained and heavily reviewed today.
  If this is the failure rate in the best human-authored case, a code-docs
  rule that lets agents write "see the design doc" pointers with no
  inlined fallback fact is likely to fare worse, not better.
- **A fixed cross-category ratchet risks cutting the wrong 63.7%.** The
  frame's H7 already anticipates a per-package ratchet over a fixed ratio
  gate; this sample sharpens why: the pooled compression factor (2.75x) is
  driven almost entirely by narration/tautology/record-paraphrase (89
  lines, 100% cuttable) and only secondarily by trimming contract/guard/
  essay (411 lines, 1.5-4.6x cuttable). A ratio-only ratchet blind to
  category would happily "hit its number" by cutting guards and contracts
  instead of the free-lunch categories, which is exactly the failure mode
  H7 and the prior evidence's adversarial critique both flag.
- **No `process-ID`-style artifact appeared anywhere in 200 human blocks.**
  The prior-evidence finding that "Plan IDs (`C-018`) collide across plans;
  pointers to untracked plans are dead" describes an agent-fleet failure
  mode (ocx) with no counterpart in this human sample — humans in this
  corpus point at issues, RFCs, and file/pointer targets, never at an
  internal ticket ID. This is a difference *of kind* between fleet and
  human commenting, not a matter of degree, worth stating plainly when the
  fleet-comparison worker's results land.

## Appendix: all 200 classifications

| Repo | File:line | Lines | Kind | Category | Recoverable | Minimal | Note |
|---|---|---|---|---|---|---|---|
| BurntSushi/ripgrep | crates/cli/src/pattern.rs:71 | 6 | doc | contract | partly | 2 | failure mode + error content contract |
| BurntSushi/ripgrep | crates/cli/src/process.rs:287 | 1 | doc | tautology | yes | 0 | restates r#async constructor name |
| BurntSushi/ripgrep | crates/core/app.rs:237 | 2 | doc | contract | partly | 1 | explains meaning of empty Option field |
| BurntSushi/ripgrep | crates/core/app.rs:435 | 9 | doc | contract | partly | 3 | panic condition + note that using this suppresses clap's auto value-listing in --help |
| BurntSushi/ripgrep | crates/core/args.rs:570 | 4 | doc | other | partly | 1 | impl-block banner: purpose + 'sorted alphabetically' organizing convention |
| BurntSushi/ripgrep | crates/core/args.rs:856 | 5 | doc | contract | partly | 2 | return type purpose + error condition |
| BurntSushi/ripgrep | crates/core/main.rs:179 | 1 | line | narration | yes | 0 | restates fallthrough to err_message |
| BurntSushi/ripgrep | crates/core/messages.rs:71 | 1 | doc | contract | partly | 1 | adds 'non-fatal' nuance over bare fn name |
| BurntSushi/ripgrep | crates/core/path_printer.rs:67 | 5 | doc | contract | partly | 1 | documents default terminator byte, not visible at call site |
| BurntSushi/ripgrep | crates/globset/src/glob.rs:124 | 1 | doc | tautology | yes | 0 | restates is_match name |
| BurntSushi/ripgrep | crates/ignore/src/default_types.rs:1 | 10 | doc | other | no | 2 | POINTER: https://github.com/BurntSushi/ripgrep (contribution URL, stable); scope guidance for the list + formatting convention (sorted, 79 cols) + contribution pointer |
| BurntSushi/ripgrep | crates/ignore/src/dir.rs:112 | 2 | doc | contract | partly | 1 | Option field populate condition not derivable from type alone |
| BurntSushi/ripgrep | crates/ignore/src/dir.rs:179 | 4 | line | guard | no | 2 | GUARD: propagating/logging the canonicalize() error here (instead of silently falling back to self.clone()) would break the crate-wide convention of ignoring I/O errors while processing ignore files, introducing inconsistent error surfacing; explicitly invokes 'our general pattern of ignoring I/O errors' as the reason |
| BurntSushi/ripgrep | crates/ignore/src/dir.rs:500 | 1 | doc | contract | partly | 1 | 'including this one' is a non-obvious inclusion semantic for an iterator named parents() |
| BurntSushi/ripgrep | crates/ignore/src/gitignore.rs:33 | 1 | doc | tautology | yes | 0 | restates field name 'original' |
| BurntSushi/ripgrep | crates/ignore/src/gitignore.rs:313 | 6 | doc | contract | partly | 2 | root-path matching semantics for the builder |
| BurntSushi/ripgrep | crates/ignore/src/gitignore.rs:606 | 1 | doc | tautology | yes | 0 | restates expand_tilde name/behavior |
| BurntSushi/ripgrep | crates/ignore/src/lib.rs:261 | 1 | doc | tautology | yes | 0 | restates with_path name |
| BurntSushi/ripgrep | crates/ignore/src/lib.rs:424 | 1 | doc | tautology | yes | 0 | restates is_none over enum variant |
| BurntSushi/ripgrep | crates/ignore/src/types.rs:233 | 2 | doc | contract | partly | 1 | disambiguates 'empty' meaning match-nothing vs match-everything |
| BurntSushi/ripgrep | crates/printer/src/lib.rs:25 | 1 | doc | section-marker | no | 0 | rustdoc markdown heading '# Example' |
| BurntSushi/ripgrep | crates/printer/src/standard.rs:257 | 10 | doc | contract | partly | 3 | POINTER: docs.rs/grep-printer Capture::interpolate (external crate API docs); behavior/format contract + trailing pointer to sibling crate for capture-group interpolation format |
| BurntSushi/ripgrep | crates/printer/src/standard.rs:573 | 1 | line | guard | no | 1 | GUARD: dropping/'simplifying' the `\|\| self.config.per_match` disjunct out of the granularity OR-chain (each line pins one config flag to the reason it needs per-match search) would silently break per-match output granularity; one of a stack of aligned why-lines explaining each OR-chain disjunct |
| BurntSushi/ripgrep | crates/printer/src/summary.rs:497 | 6 | doc | contract | partly | 2 | stats() only Some if requested via builder |
| BurntSushi/ripgrep | crates/regex/src/literal.rs:308 | 4 | line | debt | partly | 2 | admits heuristic is incomplete, names what a fix would need |
| pypa/pip | src/pip/_internal/configuration.py:356 | 1 | line | guard | no | 1 | GUARD: 'simplifying' `parsers[-1]` to `parsers[0]` (assuming first-registered is highest priority) would silently pick the wrong config source; depends on invariant (list built in ascending priority order) that isn't visible at this call site |
| pypa/pip | src/pip/_internal/network/auth.py:88 | 12 | doc | contract | partly | 3 | precondition (url must be stripped of creds already) + return-None conditions |
| pypa/pip | src/pip/_internal/network/xmlrpc.py:20 | 3 | doc | tautology | yes | 0 | restates class name/purpose |
| pypa/pip | src/pip/_internal/operations/prepare.py:464 | 2 | line | narration | yes | 0 | restates the following download-dir check |
| pypa/pip | src/pip/_internal/utils/logging.py:34 | 3 | doc | contract | partly | 1 | exception class trigger condition |
| pypa/pip | src/pip/_internal/vcs/git.py:281 | 2 | line | narration | yes | 0 | restates the very next if-condition |
| pypa/pip | src/pip/_internal/vcs/git.py:450 | 2 | line | guard | no | 2 | POINTER: article.gmane.org/gmane.comp.version-control.git/146500 (mailing-list post; gmane archives are largely defunct — unstable target); GUARD: 'simplifying' the scheme-rewrite before urlsplit() (assuming it's redundant) would reintroduce a git bug parsing scp-like user@host:path URLs; workaround-for-external-bug comment with a now-fragile pointer |
| pypa/pip | src/pip/_internal/vcs/versioncontrol.py:275 | 1 | line | contract | partly | 1 | class attribute purpose/consumer not named in the identifier |
| pypa/pip | src/pip/_vendor/distlib/locators.py:2 | 5 | line | provenance | no | 0 | vendored (distlib); copyright/license header |
| pypa/pip | src/pip/_vendor/distro.py:637 | 16 | doc | essay | partly | 3 | vendored (distro); class-level usage guide: singleton default instance vs custom instances |
| pypa/pip | src/pip/_vendor/html5lib/filters/sanitizer.py:1 | 8 | doc | provenance | no | 2 | POINTER: github.com/html5lib/html5lib-python/issues/443 (issue number, stable); vendored (html5lib); module deprecation notice + replacement pointer |
| pypa/pip | src/pip/_vendor/html5lib/html5parser.py:1003 | 1 | line | debt | partly | 1 | vendored (html5lib); perf concern flagged, no action, no explanation of why |
| pypa/pip | src/pip/_vendor/packaging/_musllinux.py:23 | 5 | doc | pointer | no | 2 | POINTER: gist.github.com/lyssdod/... (algorithm source, unstable — personal gist) and refspecs.linuxfoundation.org ELF spec section (stable, versionless URL); vendored (packaging); byte-parsing logic below is unreadable without the two reference links |
| pypa/pip | src/pip/_vendor/pkg_resources/__init__.py:3031 | 1 | line | narration | yes | 0 | vendored (pkg_resources); minor domain-vocab addition over the loop |
| pypa/pip | src/pip/_vendor/pygments/formatters/html.py:921 | 5 | doc | contract | partly | 2 | POINTER: sibling method `format`'s docstring, same file (in-repo, stable); vendored (pygments); behavior + pointer to sibling docstring |
| pypa/pip | src/pip/_vendor/pygments/formatters/terminal256.py:280 | 1 | line | commented-out-code | yes | 0 | vendored (pygments); dead debug print left commented |
| pypa/pip | src/pip/_vendor/pygments/lexers/__init__.py:137 | 1 | line | narration | yes | 0 | vendored (pygments); restates the dict literal's purpose, already clear from next line's exec() |
| pypa/pip | src/pip/_vendor/requests/auth.py:287 | 4 | line | guard | no | 2 | GUARD: dropping the explicit `pos = None` reset in the except branch (e.g. reducing it to `pass`) would leak a stale file position from a prior file-body request onto a reused HTTPDigestAuth instance handling a non-file-body request; vendored (requests); explains state-reuse hazard across requests sharing one auth instance |
| pypa/pip | src/pip/_vendor/rich/color_triplet.py:5 | 1 | doc | tautology | yes | 0 | vendored (rich); restates NamedTuple field names |
| pypa/pip | src/pip/_vendor/rich/layout.py:48 | 1 | doc | tautology | yes | 0 | vendored (rich); exception class name already says this |
| pypa/pip | src/pip/_vendor/rich/palette.py:59 | 1 | doc | tautology | yes | 0 | vendored (rich); restates function name |
| pypa/pip | src/pip/_vendor/rich/style.py:617 | 8 | doc | record-paraphrase | yes | 0 | vendored (rich); Google-style Args/Returns restates existing type hints and fn name |
| pypa/pip | src/pip/_vendor/rich/traceback.py:342 | 1 | doc | guard | no | 1 | GUARD: removing the try/except around str(_object) (assuming str() can't raise) would let a broken __str__ on an arbitrary user exception crash traceback rendering itself; vendored (rich); 1-line docstring is the whole justification for wrapping str() in try/except |
| pypa/pip | src/pip/_vendor/urllib3/contrib/securetransport.py:858 | 1 | line | debt | partly | 1 | vendored (urllib3); 'for now' framing flags a known limitation (no custom cipher support) without follow-up |
| pypa/pip | src/pip/_vendor/urllib3/contrib/securetransport.py:880 | 5 | doc | contract | partly | 1 | vendored (urllib3); exception condition contract |
| restic/restic | build.go:231 | 1 | doc | contract | partly | 1 | names the concrete consumer (go build -ldflags) beyond the fn name |
| restic/restic | cmd/restic/cmd_prune.go:444 | 1 | line | narration | yes | 0 | restates the if-condition directly below |
| restic/restic | cmd/restic/cmd_snapshots.go:163 | 2 | line | guard | no | 2 | GUARD: dropping the ID-keyed keepReasons map and instead indexing reasons[i] positionally against the (about-to-be-resorted) list would attach the wrong keep-reason to each snapshot after the sort; explains why the map must be built before the subsequent sort |
| restic/restic | cmd/restic/cmd_stats.go:190 | 1 | line | narration | yes | 0 |  |
| restic/restic | internal/archiver/archiver.go:110 | 2 | doc | contract | partly | 1 | clarifies copy-not-mutate + only-unset-fields semantics |
| restic/restic | internal/backend/azure/azure.go:75 | 2 | doc | contract | partly | 1 | idempotent-create semantics not implied by the name alone |
| restic/restic | internal/backend/b2/b2.go:183 | 2 | line | guard | no | 2 | GUARD: removing the `length = -1` translation (assuming the B2 SDK treats 0 the same as 'read to EOF') would silently request zero bytes instead of the remainder of the object; documents external SDK's negative-length-means-EOF convention |
| restic/restic | internal/backend/gs/gs.go:54 | 1 | line | narration | yes | 0 |  |
| restic/restic | internal/backend/gs/gs.go:161 | 1 | doc | tautology | yes | 0 |  |
| restic/restic | internal/backend/layout_rest.go:18 | 1 | doc | tautology | yes | 0 |  |
| restic/restic | internal/backend/local/config.go:20 | 1 | doc | tautology | yes | 0 |  |
| restic/restic | internal/backend/local/local_windows.go:7 | 1 | doc | why-constraint | no | 1 | explains why the stub silently no-ops rather than being unfinished work |
| restic/restic | internal/backend/s3/s3.go:505 | 1 | doc | contract | partly | 1 | negative clarification (bucket itself is untouched) not implied by 'Delete' |
| restic/restic | internal/bloblru/cache.go:45 | 2 | doc | contract | partly | 1 | return value is a reusable evicted buffer, not just a status/copy |
| restic/restic | internal/cache/backend.go:64 | 1 | line | narration | yes | 0 |  |
| restic/restic | internal/checker/checker.go:241 | 1 | doc | tautology | yes | 0 | fields (ID, []error) already say this |
| restic/restic | internal/fs/deviceid_unix.go:24 | 2 | line | guard | no | 2 | GUARD: removing the explicit uint64() widening cast (assuming st.Dev is already the right width) breaks compilation/correctness on whichever unix platform's syscall.Stat_t.Dev is narrower (uint32 on Darwin vs uint64 on Linux); platform-quirk explanation for an otherwise-odd explicit conversion |
| restic/restic | internal/fs/vss_windows.go:570 | 1 | doc | tautology | yes | 0 |  |
| restic/restic | internal/fuse/dir.go:18 | 1 | doc | guard | no | 1 | GUARD: deleting the `var _ = fs.HandleReadDirAller(&dir{})` compile-time assertions (assuming they're dead/unused expressions) removes the safety net that catches *dir silently drifting out of sync with the fuse interfaces; explains an otherwise-mysterious blank-identifier idiom |
| restic/restic | internal/fuse/snapshots_dir.go:307 | 1 | line | section-marker | no | 0 | bare one-word label before an if-block |
| restic/restic | internal/repository/master_index.go:67 | 1 | line | narration | yes | 0 | already stated in the function-level doc two lines above |
| restic/restic | internal/restic/tree_stream.go:114 | 1 | line | narration | yes | 0 | restates the struct literal built on the next line |
| restic/restic | internal/restorer/filerestorer.go:31 | 1 | doc | tautology | yes | 0 |  |
| restic/restic | internal/restorer/restorer.go:64 | 2 | line | guard | no | 1 | GUARD: replacing the filepath.Join(separator, name)+Base defense with the raw node.Name (assuming it's already safe) reopens a path-traversal vector: a malicious repo node name containing '../' could restore outside the target directory; security-relevant path-traversal defense in the restore path |
| restic/restic | internal/ui/table/table.go:91 | 1 | line | narration | yes | 0 |  |
| rust-lang/cargo | crates/cargo-test-support/src/registry.rs:79 | 1 | doc | contract | partly | 1 | test-helper field semantics not obvious from the bool name alone |
| rust-lang/cargo | crates/cargo-test-support/src/registry.rs:490 | 5 | doc | example | partly | 4 | TOML snippet showing the exact table name/shape produced, not derivable from the Rust call |
| rust-lang/cargo | crates/cargo-util/src/paths.rs:108 | 4 | doc | contract | partly | 1 | behavior + error condition |
| rust-lang/cargo | src/cargo/core/compiler/build_context/target_info.rs:73 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/cargo | src/cargo/core/compiler/compile_kind.rs:84 | 5 | doc | guard | no | 2 | GUARD: removing fingerprint_hash() in favor of the standard Hash impl (assuming they're equivalent) would fail to invalidate cached build artifacts when only a `.json` target-spec file's contents change, since Hash doesn't differentiate on file contents; distinguishes two similarly-named hashing mechanisms with different sensitivity |
| rust-lang/cargo | src/cargo/core/dependency.rs:358 | 1 | doc | contract | partly | 1 | maps a bool return to dependency-kind semantics (dev-dep vs normal/build) |
| rust-lang/cargo | src/cargo/core/package.rs:159 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/cargo | src/cargo/core/package.rs:1126 | 1 | line | narration | yes | 0 |  |
| rust-lang/cargo | src/cargo/core/profiles.rs:113 | 1 | line | narration | yes | 0 |  |
| rust-lang/cargo | src/cargo/core/profiles.rs:975 | 3 | line | why-constraint | no | 2 | 'for now'/deprecated framing on why host_features is hardcoded false for plugins |
| rust-lang/cargo | src/cargo/core/resolver/mod.rs:595 | 6 | doc | contract | partly | 2 | params + return-value contract for the core resolver step function |
| rust-lang/cargo | src/cargo/core/resolver/mod.rs:1003 | 5 | line | guard | no | 3 | GUARD: swapping the BTreeMap for a faster HashMap (assuming iteration order is irrelevant) makes cargo's cycle-error messages non-deterministic across runs; and copying dev-dependency edges into this graph (assuming all edges matter) would cause false-positive cycle errors, since dev-dep edges are deliberately excluded from cycle detection; two distinct guards stacked in one block: determinism choice + deliberate edge exclusion |
| rust-lang/cargo | src/cargo/core/summary.rs:40 | 3 | line | guard | no | 2 | GUARD: adding or changing a validation check here without bumping the index schema field or SummariesCache version would let already-cached summaries silently skip the new invariant; explicit '****CAUTION****' banner naming the two things a change here must be coordinated with |
| rust-lang/cargo | src/cargo/core/summary.rs:354 | 1 | line | narration | yes | 0 | restates the validation check below, which also has its own bail! message |
| rust-lang/cargo | src/cargo/core/workspace.rs:1501 | 1 | line | narration | yes | 0 | the surrounding block already carries a longer why-comment above |
| rust-lang/cargo | src/cargo/ops/cargo_compile.rs:986 | 2 | line | guard | no | 1 | GUARD: switching Examples' CompileMode from Build to Test here (assuming every target should run through the same test path) would try to execute example binaries as test harnesses, which they aren't built for |
| rust-lang/cargo | src/cargo/ops/cargo_package.rs:443 | 5 | line | contract | partly | 2 | enumerates git-status categories the collection covers, incl. include/.gitignore conflicts |
| rust-lang/cargo | src/cargo/ops/resolve.rs:251 | 7 | line | debt | no | 3 | states a real behavioral constraint (non-registry sources locked to one revision) but explicitly flags it with 'TODO: ... hokey reason' admitting the rationale is weak |
| rust-lang/cargo | src/cargo/ops/resolve.rs:787 | 2 | line | narration | yes | 0 | closely restates the match block's own diagnostic-message logic |
| rust-lang/cargo | src/cargo/sources/registry/mod.rs:394 | 1 | line | narration | yes | 0 | restates the unwrap_or(false) directly below |
| rust-lang/cargo | src/cargo/sources/registry/mod.rs:513 | 2 | doc | contract | partly | 1 | POINTER: intra-doc link to RegistryData::download (in-repo, stable); enum purpose tied to a specific trait method via rustdoc link |
| rust-lang/cargo | src/cargo/util/config/mod.rs:188 | 15 | doc | essay | no | 4 | POINTER: ConfigBuilder::enable_nightly_features (in-repo API, stable); 15-line enumeration of every condition under which a field should be true/false, plus an ordering note and a pointer to the preferred test API |
| rust-lang/cargo | src/cargo/util/config/mod.rs:578 | 1 | line | guard | no | 1 | GUARD: collapsing the List match arm into the general priority-based branch (assuming lists follow the same rule as scalars) would stop lists from always merging env + file values; a merge-policy exception embedded in a match pattern |
| rust-lang/cargo | src/cargo/util/config/mod.rs:1970 | 1 | line | section-marker | no | 0 | one-word label distinguishing this branch from the sibling login-token-write branch |
| rust-lang/cargo | src/cargo/util/graph.rs:90 | 7 | doc | contract | partly | 2 | documents exact tuple-vec shape via an ASCII diagram, not derivable from the signature alone |
| rust-lang/rust-analyzer | crates/flycheck/src/lib.rs:120 | 5 | doc | why-constraint | no | 2 | STALE: doc talks about 'WatchThread' but documents field `cargo_handle: Option<CargoHandle>' — a rename left the doc's subject wrong; the blocking-IO rationale itself is still accurate |
| rust-lang/rust-analyzer | crates/hir_def/src/body.rs:229 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/rust-analyzer | crates/hir_def/src/body/scope.rs:66 | 1 | doc | contract | partly | 1 | clarifies the None case for non-block scopes |
| rust-lang/rust-analyzer | crates/hir_def/src/builtin_attr.rs:235 | 1 | line | pointer | no | 1 | POINTER: RFC #1268 (numbered identifier, no link; needs external RFC-repo lookup); one-line provenance tag on a table entry, repeated pattern throughout this file (RFC 2412, RFC 2867 elsewhere in the same sample) |
| rust-lang/rust-analyzer | crates/hir_expand/src/eager.rs:205 | 1 | line | narration | yes | 0 |  |
| rust-lang/rust-analyzer | crates/hir_ty/src/diagnostics/decl_check/case_conv.rs:72 | 2 | doc | contract | partly | 1 | the None-means-no-change return condition isn't implied by the fn name |
| rust-lang/rust-analyzer | crates/hir_ty/src/diagnostics/match_check/usefulness.rs:371 | 6 | doc | contract | no | 2 | POINTER: 'top of the file' explanation, same file (in-file, stable as long as the doc isn't relocated); dense math-notation contract for a ported pattern-usefulness algorithm; relies on file-level context |
| rust-lang/rust-analyzer | crates/hir_ty/src/infer/expr.rs:1130 | 1 | line | guard | no | 1 | GUARD: assuming generic_args always exactly matches type_params (dropping the filter/.take defensive bound) would break inference on the partial/erroneous syntax trees rust-analyzer must handle while code is being edited |
| rust-lang/rust-analyzer | crates/ide/src/lib.rs:413 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/rust-analyzer | crates/ide/src/syntax_highlighting.rs:342 | 1 | line | narration | yes | 0 |  |
| rust-lang/rust-analyzer | crates/ide_db/src/helpers/import_assets.rs:41 | 3 | doc | contract | partly | 2 | maps struct fields to a concrete source-syntax example (receiver_ty/assoc_item_name) |
| rust-lang/rust-analyzer | crates/mbe/src/token_map.rs:29 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/rust-analyzer | crates/mbe/src/token_map.rs:32 | 1 | doc | tautology | yes | 0 | near-duplicate of the struct-level doc 3 lines above (see block at line 29) |
| rust-lang/rust-analyzer | crates/parser/src/grammar/expressions.rs:501 | 2 | line | guard | no | 2 | GUARD: swapping type_no_bounds() for the general type parser here (assuming it's a strict upgrade) lets cast expressions parse invalid/ambiguous bound syntax, e.g. misparsing `x as u8 + 1` since `+` doubles as the trait-bound separator; grammar-ambiguity guard |
| rust-lang/rust-analyzer | crates/parser/test_data/parser/ok/0044_let_attrs.rs:1 | 1 | line | pointer | no | 1 | POINTER: github.com/rust-analyzer/rust-analyzer/issues/677 (issue number, stable); test fixture file; the link is the only reason this exact snippet is the regression case |
| rust-lang/rust-analyzer | crates/proc_macro_api/src/version.rs:21 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_47/proc_macro/diagnostic.rs:117 | 1 | doc | tautology | yes | 0 | canonical setter doc |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/bridge/client.rs:252 | 1 | line | commented-out-code | yes | 0 | real client-dispatch logic kept commented inside a macro whose body now just panics |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/bridge/client.rs:343 | 8 | doc | guard | no | 3 | GUARD: instantiating Client<F> with an F that isn't FFI-friendly (e.g. a fat pointer or non-repr(C) closure) breaks the ABI contract at the proc-macro client/server process boundary, since only F's raw bytes cross that boundary; N.B. safety invariant on a generic parameter of a #[repr(C)] type |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/mod.rs:1 | 4 | doc | provenance | no | 2 | POINTER: github.com/rust-lang/rust/blob/<pinned-commit>/src/libproc_macro/lib.rs (commit-pinned URL, stable); module-doc declaring this file is a manual port of a specific rustc source snapshot |
| rust-lang/rust-analyzer | crates/proc_macro_srv/src/abis/abi_1_56/proc_macro/diagnostic.rs:97 | 2 | doc | record-paraphrase | yes | 0 | restates parameter names already visible in the signature |
| rust-lang/rust-analyzer | crates/project_model/src/cargo_workspace.rs:203 | 1 | doc | tautology | yes | 0 |  |
| rust-lang/rust-analyzer | crates/rust-analyzer/src/diagnostics/to_proto.rs:32 | 1 | line | debt | partly | 1 | explicit HACK label on a special-cased match arm bypassing the normal lint-group matcher for the literal 'warnings' meta-lint |
| rust-lang/rust-analyzer | crates/syntax/src/lib.rs:156 | 1 | doc | tautology | yes | 0 | doc on a re-export restating the aliased type's purpose |
| rust-lang/rust-analyzer | editors/code/src/main.ts:299 | 2 | line | example | partly | 1 | pins the exact cursor-position convention ('\|') used by the regex below |
| square/okhttp | mockwebserver/src/main/kotlin/mockwebserver3/MockWebServer.kt:345 | 7 | doc | contract | no | 2 | @throws condition tied to an unrelated setter (setDispatcher) elsewhere in the class |
| square/okhttp | okhttp-sse/src/main/kotlin/okhttp3/sse/internal/ServerSentEventReader.kt:90 | 1 | line | narration | yes | 0 |  |
| square/okhttp | okhttp-tls/src/main/kotlin/okhttp3/tls/internal/der/CertificateAdapters.kt:297 | 7 | doc | contract | partly | 5 | inlined ASN.1 grammar excerpt (X.509 Name CHOICE) the adapter must match; not derivable from the Kotlin DSL call alone |
| square/okhttp | okhttp/build.gradle.kts:45 | 1 | line | why-constraint | no | 1 | justifies an otherwise-unreferenced compile-only dependency (GraalVM native-image); removing it as 'unused' would break a build target most contributors don't exercise |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/CacheControl.kt:403 | 3 | doc | guard | no | 2 | GUARD: assuming this follows the standard indexOf convention (-1 when not found) instead of returning `length` would let a caller mishandle the not-found case by comparing against -1, which this function never produces; deliberate deviation from the usual indexOf(-1) convention |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/Connection.kt:22 | 47 | doc | essay | no | 10 | 47-line interface doc: misnomer warning vs HttpURLConnection, a '## Modern TLS' section on SNI/ALPN retry-without-them fallback, and a '## Connection Reuse' section defining the allocation-vs-stream lifecycle model used nowhere else in the visible code |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/Cookie.kt:84 | 1 | doc | tautology | yes | 0 |  |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/EventListener.kt:223 | 7 | doc | contract | no | 2 | ordering guarantee relative to another callback + multiplicity, on an empty-bodied open fun |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/EventListener.kt:394 | 4 | doc | contract | no | 1 | ordering guarantee on an empty-bodied open fun |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/MultipartBody.kt:237 | 3 | doc | contract | partly | 1 | enumerates the conventional multipart subtype constants, not just the runtime require() check |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/ResponseBody.kt:117 | 6 | doc | contract | partly | 2 | OOM risk on large bodies + streaming alternative; repeated verbatim on the sibling byteString() method |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/cache/CacheInterceptor.kt:64 | 1 | line | narration | yes | 0 | glosses the following null-check condition in domain language |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/connection/ExchangeFinder.kt:190 | 1 | line | narration | yes | 0 | parallels the sibling branch's comment below it |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/connection/RealConnectionPool.kt:70 | 7 | doc | contract | no | 3 | explains the routes param's HTTP/2-connection-coalescing purpose across related domains |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http/RetryAndFollowUpInterceptor.kt:197 | 3 | line | guard | no | 2 | GUARD: flipping the trailing fallthrough from `return true` to `return false` (assuming 'unrecognized error -> don't retry' is the safe default) would stop okhttp retrying legitimate transient IOExceptions like proxy connection failures; explains why the default (after several explicit false cases) is true |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http2/Hpack.kt:249 | 1 | line | guard | no | 1 | GUARD: 'fixing' the nextHeaderIndex + 1 + index arithmetic (it reads like a stray off-by-one) would break HPACK dynamic-table index translation; the actual indexing scheme this depends on ('referencedHeaders') isn't visible in this function; HTTP/2 header-compression correctness |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http2/Http2Connection.kt:94 | 1 | doc | contract | partly | 1 | clarifies this is a caller-supplied callback, not internal state |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http2/Http2Connection.kt:110 | 3 | line | why-constraint | no | 2 | engineering trade-off behind the 16MiB flow-control window constant |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/http2/Http2Writer.kt:138 | 1 | doc | contract | partly | 1 | cross-references the byteCount contract of a different method (data()) |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/platform/Platform.kt:195 | 2 | line | guard | no | 2 | GUARD: detecting Android via classpath-class presence instead of the VM-name check would misidentify the process as Android when running inside Android Studio, since Android SDK classes are present on that IDE's plugin classpath too |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/tls/BasicCertificateChainCleaner.kt:99 | 5 | doc | contract | partly | 2 | documents the -1 sentinel meaning for minIntermediates |
| square/okhttp | okhttp/src/jvmMain/kotlin/okhttp3/internal/tls/OkHostnameVerifier.kt:30 | 4 | doc | pointer | no | 2 | POINTER: ietf.org/rfc/rfc2818.txt (RFC 2818, stable URL, markdown reference-link) |
| square/okhttp | okhttp/src/jvmTest/java/okhttp3/RecordedResponse.java:122 | 1 | doc | tautology | yes | 0 | test-helper doc restating method name, matching sibling methods' style |
| square/okhttp | samples/guide/src/main/java/okhttp3/recipes/kt/WiresharkExample.kt:104 | 1 | line | why-constraint | no | 1 | explains an otherwise-magic Thread.sleep(2000) in demo code |
| square/okhttp | samples/guide/src/main/java/okhttp3/recipes/kt/YubikeyClientAuth.kt:83 | 1 | line | narration | yes | 0 | sample/guide code |
| tokio-rs/tokio | tokio-macros/src/lib.rs:15 | 2 | line | guard | no | 2 | GUARD: removing the seemingly-redundant `extern crate proc_macro;` (since newer rustc warns it's unused) would break compilation on the older rustc versions this crate still supports, which don't implicitly bring proc_macro into scope |
| tokio-rs/tokio | tokio-stream/src/stream_ext/try_next.rs:17 | 1 | line | guard | no | 1 | GUARD: removing the _pin: PhantomPinned field (assuming it's dead weight since it holds no real data) makes TryNext accidentally Unpin, breaking pinning guarantees callers rely on via async trait methods |
| tokio-rs/tokio | tokio-test/src/task.rs:1 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio-util/src/codec/any_delimiter_codec.rs:66 | 9 | doc | guard | no | 2 | POINTER: intra-doc link to new_with_max_length (in-repo, stable); GUARD: calling new() instead of new_with_max_length() when the codec will process untrusted/network input leaves no upper bound on buffered chunk size, letting an attacker exhaust memory with a single delimiter-less input; security-relevant caution steering callers away from the unbounded default constructor |
| tokio-rs/tokio | tokio-util/src/time/delay_queue.rs:143 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio-util/src/time/delay_queue.rs:203 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio-util/src/time/delay_queue.rs:316 | 1 | line | guard | no | 1 | GUARD: using the raw `when` timestamp directly instead of calling normalize_deadline() (assuming callers won't pass past timestamps) violates the timer wheel's non-past-deadline invariant |
| tokio-rs/tokio | tokio-util/src/time/mod.rs:1 | 9 | doc | contract | no | 1 | the 'must be used within the Runtime' constraint is the load-bearing sentence; the rest is a module overview |
| tokio-rs/tokio | tokio-util/src/time/wheel/stack.rs:17 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio/src/io/driver/scheduled_io.rs:473 | 4 | line | guard | no | 2 | GUARD: reading or mutating the waiter's waker field here without first acquiring scheduled_io.waiters.lock() (skipping it because the access 'looks read-only') races with concurrent access to the same waiter guarded by that lock elsewhere |
| tokio-rs/tokio | tokio/src/io/mod.rs:272 | 1 | line | debt | partly | 1 | TODO acknowledging an intentional but unresolved rename |
| tokio-rs/tokio | tokio/src/net/tcp/socket.rs:362 | 8 | doc | contract | no | 3 | documents SO_LINGER OS-socket-option semantics not derivable from the one-line delegation to std |
| tokio-rs/tokio | tokio/src/net/windows/named_pipe.rs:2204 | 1 | doc | contract | partly | 1 | names the Windows API requirement (wide, null-terminated) not visible from the fn name alone |
| tokio-rs/tokio | tokio/src/process/mod.rs:568 | 3 | doc | contract | partly | 2 | underlying syscall + failure-mode contract |
| tokio-rs/tokio | tokio/src/runtime/queue.rs:305 | 2 | line | guard | no | 2 | GUARD: calling unsync_load() on dst.tail when a second thread might also mutate dst.tail concurrently (violating the stated single-mutator precondition) is undefined behavior — a data race on a value loaded without synchronization; SAFETY comment |
| tokio-rs/tokio | tokio/src/runtime/queue.rs:405 | 1 | line | narration | yes | 0 |  |
| tokio-rs/tokio | tokio/src/runtime/queue.rs:414 | 4 | line | guard | no | 2 | GUARD: calling this steal path when `dst` is not actually empty, or from more than one producer thread (violating the stated safety precondition), makes the ptr::write overwrite a live task or race with another writer — undefined behavior; SAFETY comment justifying an unsafe ptr::write |
| tokio-rs/tokio | tokio/src/runtime/task/state.rs:108 | 1 | doc | guard | no | 1 | GUARD: changing this load from Acquire to Relaxed ordering (assuming it's 'just reading state') would break the happens-before relationship this lock-free task state machine relies on, opening a data-race window with concurrent Release stores elsewhere; memory-ordering contract invisible in the function signature |
| tokio-rs/tokio | tokio/src/signal/unix.rs:87 | 4 | doc | contract | no | 2 | OS signal semantics (trigger condition + default disposition) not derivable from the libc constant |
| tokio-rs/tokio | tokio/src/signal/unix/driver.rs:42 | 1 | line | section-marker | no | 0 | '===== impl X =====' banner dividing impl blocks in a multi-type file |
| tokio-rs/tokio | tokio/src/sync/mpsc/unbounded.rs:278 | 2 | line | guard | no | 2 | GUARD: replacing process::abort() with a panic! or silently ignoring the overflow (since 'this should never happen') would let the ref-count wrap around under sustained abuse, causing a use-after-free once the count cycles back to a live value; justifies an abrupt process::abort() for what looks like unreachable code |
| tokio-rs/tokio | tokio/src/time/interval.rs:517 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio/src/time/timeout.rs:132 | 1 | doc | tautology | yes | 0 | standard 'returned by' cross-reference idiom for a future wrapper type |
| tokio-rs/tokio | tokio/src/time/timeout.rs:153 | 1 | doc | tautology | yes | 0 |  |
| tokio-rs/tokio | tokio/src/util/slab.rs:131 | 1 | doc | tautology | yes | 0 | terse struct doc |
| vitejs/vite | packages/playground/legacy/main.js:30 | 1 | line | narration | yes | 0 | playground/demo file |
| vitejs/vite | packages/playground/ssr-react/src/forked-deadlock/middle-module.js:4 | 2 | doc | other | no | 1 | test-fixture graph-position label ('module Y' in a deadlock repro topology); not recoverable from the generic export name |
| vitejs/vite | packages/playground/ssr-vue/src/entry-server.js:18 | 3 | line | narration | partly | 0 | playground/demo teaching comment explaining the SSR manifest's shape |
| vitejs/vite | packages/plugin-legacy/index.js:336 | 2 | line | guard | no | 2 | GUARD: changing the plugin pipeline so legacy and modern bundles build concurrently or in reverse order (assuming build order is irrelevant) breaks this early-return, which depends on the legacy chunk's transformIndexHtml running before facadeToLegacyChunkMap is needed; depends on an inter-plugin build-ordering assumption invisible at this call site |
| vitejs/vite | packages/plugin-vue/src/script.ts:24 | 3 | line | guard | partly | 2 | GUARD: dropping the isProd condition (assuming inline templates are always safe) enables template inlining during dev too, breaking per-block hot module replacement since an inlined template can't be individually hot-updated; the isProd check is visible in the return statement; the HMR reason for it is not |
| vitejs/vite | packages/vite/src/node/build.ts:137 | 2 | doc | provenance | no | 1 | @deprecated tag naming the replacement (esbuild) for a still-present `any`-typed option |
| vitejs/vite | packages/vite/src/node/build.ts:578 | 1 | line | narration | yes | 0 |  |
| vitejs/vite | packages/vite/src/node/plugin.ts:118 | 2 | doc | narration | yes | 0 | restates the visible `options: { ssr?: boolean }' type annotation right below it |
| vitejs/vite | packages/vite/src/node/plugins/asset.ts:96 | 2 | line | guard | no | 2 | GUARD: removing the `\|\| this.getFileName(hash)` fallback (assuming getAssetFilename always resolves) breaks asset URL rewriting for chunks some internal plugins (e.g. the worker plugin) emit through a different path |
| vitejs/vite | packages/vite/src/node/plugins/css.ts:237 | 2 | line | guard | no | 2 | GUARD: passing depModules here instead of an empty Set (assuming the empty set was an oversight) gives the self-accepting root CSS proxy module an explicit accept list it isn't supposed to have, breaking its self-accepting HMR semantics |
| vitejs/vite | packages/vite/src/node/plugins/css.ts:1111 | 3 | doc | contract | no | 1 | states the CSS-preprocessing requirement (relative url() rebasing) that justifies the whole function's existence |
| vitejs/vite | packages/vite/src/node/plugins/css.ts:1151 | 1 | line | section-marker | no | 0 | one-word label distinguishing this preprocessor implementation from sibling sass/scss/stylus sections in the same large file |
| vitejs/vite | packages/vite/src/node/plugins/importAnalysis.ts:258 | 3 | line | guard | no | 2 | GUARD: removing this HMR-timestamp query injection (assuming the URL is already fresh) lets the browser serve a stale cached copy of a module after it has been hot-updated |
| vitejs/vite | packages/vite/src/node/plugins/importAnalysisBuild.ts:275 | 1 | line | narration | yes | 0 |  |
| vitejs/vite | packages/vite/src/node/plugins/preAlias.ts:7 | 2 | doc | contract | no | 1 | states the specific double-aliasing problem the plugin exists to prevent; not derivable from the fn name alone |
| vitejs/vite | packages/vite/src/node/plugins/resolve.ts:632 | 1 | line | narration | yes | 0 |  |
| vitejs/vite | packages/vite/src/node/plugins/resolve.ts:819 | 1 | line | narration | partly | 0 | labels the else-branch feeding the 'not defined by exports' error below |
| vitejs/vite | packages/vite/src/node/server/index.ts:69 | 2 | doc | contract | partly | 1 | 'regardless of whether deps have changed' clarifies the override beyond the field name |
| vitejs/vite | packages/vite/src/node/server/middlewares/indexHtml.ts:178 | 1 | line | guard | no | 1 | GUARD: converting this named function expression to an anonymous arrow function (a natural-looking simplification) removes the name that DEBUG=connect:dispatcher logging relies on to identify which middleware ran; identical comment recurs verbatim on the sibling static-middleware function in this same sample, i.e. it's a deliberate house convention |
| vitejs/vite | packages/vite/src/node/server/middlewares/static.ts:42 | 1 | line | narration | yes | 0 |  |
| vitejs/vite | packages/vite/src/node/server/openBrowser.ts:30 | 2 | line | pointer | no | 2 | POINTER: github.com/sindresorhus/open#app (README anchor in an external npm package, moderately stable); the browser string's accepted value format is defined only in the linked external package |
| vitejs/vite | packages/vite/src/node/server/openBrowser.ts:80 | 1 | line | narration | yes | 0 | marks an intentionally-empty catch block; the idiom is largely self-signalling |
| vitejs/vite | packages/vite/src/node/server/pluginContainer.ts:350 | 1 | line | why-constraint | no | 1 | names the specific scenario (css preprocessor errors from an included file) this otherwise-generic-looking else-if branch handles |
| vitejs/vite | packages/vite/src/node/ssr/ssrModuleLoader.ts:275 | 1 | line | guard | no | 1 | GUARD: removing this primitive short-circuit (assuming the later isPrimitive(defaultExport) check already covers it) lets `'default' in mod` execute on a primitive value, which throws a TypeError since `in` requires an object operand; looks like a redundant early-return but is actually required for correctness |
| vitejs/vite | packages/vite/src/node/utils.ts:486 | 1 | line | narration | yes | 0 |  |
