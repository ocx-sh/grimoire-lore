---
title: Atomic Writes, Crash Consistency, and Interruption Safety
agent: rust-state-and-resources / atomic-writes-and-interruption-safety
model: sonnet
date_researched: 2026-08
sources_count: 15
scope: >
  Durable-write sequence (temp file, flush, sync_all/sync_data, rename, parent-dir
  fsync); tempfile::NamedTempFile::persist semantics; rename atomicity and EXDEV;
  Windows rename equivalents; multi-file/package-install atomicity patterns
  (staged-dir rename, content-addressed store + pointer swap, journal replay);
  SIGINT/panic-strategy interaction with Drop-based cleanup; idempotent
  convergence and resumable downloads; advisory locking and lock-free
  content-addressed writes for concurrent cache access. Scoped to what a Rust
  CLI package manager over an OCI registry (grim/ocx) needs for its cache,
  lockfile, and install tree on Linux/macOS/Windows.
---

## Table of contents

1. [The durable-write sequence](#1-the-durable-write-sequence)
2. [What `NamedTempFile::persist` does and does not give you](#2-what-namedtempfilepersist-does-and-does-not-give-you)
3. [Rename atomicity in practice: same-filesystem, EXDEV, Windows](#3-rename-atomicity-in-practice-same-filesystem-exdev-windows)
4. [Multi-file atomicity: package installs are N files](#4-multi-file-atomicity-package-installs-are-n-files)
5. [Interruption: SIGINT, Drop, and panic strategy](#5-interruption-sigint-drop-and-panic-strategy)
6. [Idempotency, convergence, and resumable downloads](#6-idempotency-convergence-and-resumable-downloads)
7. [Concurrent processes: locking the cache](#7-concurrent-processes-locking-the-cache)
8. [Normative guidance candidates](#normative-guidance-candidates)
9. [AI-agent angle](#ai-agent-angle)
10. [Contested / evolving](#contested--evolving)
11. [Sources](#sources)

## Summary

1. A durable write is five steps, not two: write temp file → `flush` (if buffered) → `sync_all` the file → `rename` over the target → `sync` (fsync/open+fsync) the **parent directory**. Skipping the last step means a crash can leave the rename itself unrecorded on some filesystems/configurations.
2. `sync_data` skips metadata (mtime, size-on-disk bookkeeping) sync where the platform distinguishes it; use it for content-only durability where the file's identity/timestamp doesn't matter for correctness — otherwise use `sync_all`. On many platforms they're the same syscall.
3. `tempfile::NamedTempFile::persist` renames but explicitly does **not** sync file contents or the containing directory first — you must call `.as_file().sync_all()` before `persist`, and fsync the parent dir yourself after.
4. `rename(2)` atomicity is a same-mounted-filesystem guarantee only; cross-device renames fail with `EXDEV`, and `persist` on `tempfile` fails the same way, returning the file back to you via `PersistError` for a manual copy-then-delete fallback.
5. `TMPDIR` defaulting to a tmpfs (common in containers, some CI, `/tmp` on many Linux distros) is a live trap: a temp file created via the OS temp dir and then renamed into a different-filesystem cache directory hits `EXDEV` in production but not in a dev environment where `/tmp` and the cache share a filesystem. The fix is structural: always create the temp file in the *same directory* as the final target, never in a global tmp dir.
6. Windows has no exact `rename(2)` equivalent with the same atomicity story; `ReplaceFile`/`MoveFileExW` with `MOVEFILE_REPLACE_EXISTING` are the closest, and both require same-volume operation for the swap to be near-atomic; `std::fs::rename` on Windows maps to `MoveFileExW`.
7. Package installs are inherently multi-file; POSIX `rename` is only atomic per single path. The only ways to make N-file installs atomic are: (a) stage everything in a temp directory then rename the directory in one call, (b) content-addressed store + single atomic pointer/symlink swap (nix, pnpm shape), or (c) a journal/intent log replayed on next start. For an OCI-blob-backed store, (b) is the natural fit because blobs are already content-addressed by digest.
8. `Drop` runs on unwind and on normal scope exit — it does **not** run on `SIGKILL`, does not reliably run on `SIGINT` unless you've installed a handler that turns the signal into a graceful shutdown, and does not run at all under `panic = "abort"` after the abort point. Do not rely on `Drop` as the only cleanup mechanism for anything crash-safety-relevant.
9. The correct model is "recovery is the only cleanup path": never try to clean up perfectly on the way down (signal handlers racing real work are fragile); instead make every staging area easily identifiable (fixed naming convention, e.g. `.tmp-<pid>-<random>` or a `staging/` subdirectory) and garbage-collect orphaned staging dirs unconditionally at the start of the next run.
10. "Torn" state must be cheaply detectable without a full re-verify: presence of a staging marker/lockfile, or absence of the final atomic-rename target, is enough — don't re-hash every blob on every startup just to check for interruption.
11. Idempotent convergence means: re-running install after a torn run reaches the same final state as an uninterrupted run, without erroring on "already exists" and without re-downloading data that's already correctly in the content-addressed store.
12. Partial downloads may be resumed via HTTP `Range` requests, but the resumed download must still be verified against the digest of the **complete** blob after concatenation — verifying only the newly-fetched suffix (or trusting a `Content-Range` header) is not integrity verification of anything.
13. Advisory locks (`fs4`, `fd-lock`) are necessary wherever two processes must serialize on a *mutable* resource (writing a lockfile, updating an index) but are unnecessary — and a bottleneck — for the content-addressed blob store itself, where concurrent writers writing the same digest to the same content-addressed path are safe by construction (last writer's atomic rename wins, content is identical either way).
14. Advisory locks do not work reliably over NFS in general (lock daemon quirks, split-brain on network partition) and stale-lock detection (PID-liveness checks, lock-file age) is needed for any lock held across a network filesystem or across process crashes.
15. SQLite's rollback-journal is the canonical worked example of the general pattern: write the *undo* information durably before mutating the primary structure, and treat "journal present at startup" as "last operation didn't complete — replay/rollback it." The hot-journal-detection idea generalizes directly to any staging-directory or journal-file recovery scheme.
16. PostgreSQL's "fsyncgate" (2018) established that a failed `fsync()` cannot be safely retried on Linux — the kernel may mark the failed page clean and silently drop the dirty data, so a later successful `fsync()` on retry is a false signal, not a fixed error. The operational consequence adopted industry-wide (Postgres, MySQL/InnoDB, MongoDB/WiredTiger) is: treat `fsync` failure as fatal / process-terminating for that data, not as "retry and continue."
17. No code path anywhere in the cache/install tree should call `fs::write`, `File::create`+`write_all`, or any other direct-to-target write. Every write to a path the cache/lockfile/install-tree logic considers "real" must go through one reusable "durable write" helper that owns the temp-file-same-dir → sync → rename → parent-fsync sequence.
18. `NamedTempFile` created via `tempfile::Builder::new().tempfile_in(target_dir)` (not the bare global-tmp-dir constructor) is the correct building block — it guarantees same-filesystem-as-target by construction, closing the EXDEV trap structurally rather than by convention.
19. Directory fsync is a Unix concept with no Windows equivalent; on Windows, `MoveFileExW`/`ReplaceFile` durability instead rests on `FlushFileBuffers` on the file (and there is no portable "sync the directory entry" primitive) — the reusable helper needs a `cfg(unix)` branch for the parent-dir fsync step and must not attempt it on Windows.
20. Cloudflare's "ecdysis" framing (state transition that is never worse than either the pre- or post-state) is the correct mental model to hold the whole scheme to: at every observable point (before write, mid-write, after crash, after resumed run), the on-disk state must resolve to "old", "new", or "recoverable to either" — never an in-between state a reader can observe as real.

## Findings

### 1. The durable-write sequence

The sequence that actually earns a durability claim, in order:

1. **Create the temp file in the same directory as the final target** (not `/tmp`, not `std::env::temp_dir()`). This is what makes step 4's rename same-filesystem by construction.
2. **Write the content**, then `flush()` if using a buffered writer (`BufWriter` etc. — `flush` only moves data out of the Rust-level buffer into the OS, it is not durability).
3. **`sync_all()`** (or `sync_data()` when metadata durability genuinely doesn't matter) on the temp file. This is the step that actually asks the kernel to push the data to stable storage and wait for confirmation. Per the Rust std docs: `sync_all` "attempts to ensure that all in-memory data reaches the filesystem"; `sync_data` "might not synchronize file metadata to the filesystem... Note that some platforms may simply implement this in terms of `sync_all`" — [doc.rust-lang.org std::fs::File](https://doc.rust-lang.org/std/fs/struct.File.html#method.sync_data). Use `sync_data` only when you specifically don't need the metadata (e.g., you're going to `rename` immediately after, so the temp file's own mtime is irrelevant) — otherwise default to `sync_all`, the metadata sync is cheap relative to the data sync on most platforms.
4. **`rename()`** the temp file over the final path. On the same filesystem this is atomic w.r.t. readers — per POSIX/Linux: "If newpath already exists, it will be atomically replaced, so that there is no point at which another process attempting to access newpath will find it missing" — [man7.org rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html).
5. **fsync the parent directory** (Unix only — open the directory, call `fsync` on that fd). This is required because the rename operation itself is a directory-entry mutation, and that mutation can be lost on crash even though the file's own data was synced in step 3. Dan Luu's file-consistency notes make this explicit: "In order to make sure we can easily find the file when we restore from a crash, we need to fsync the parent of the newly created log" — [danluu.com/deconstruct-files](https://danluu.com/deconstruct-files/).

Which steps are required for which claim:

| Claim | Steps required |
|---|---|
| "readers never see a half-written file" | 1–4 (rename atomicity alone gives this even without any fsync, as long as the process doesn't crash — this is in-memory / same-process crash resilience) |
| "the write survives a crash of the *writing process* (not the OS)" | 1–4, `sync_all` optional (data may still be in page cache, but a process crash doesn't lose page cache) |
| "the write survives a kernel panic / power loss" | 1–5, all steps, no exceptions |
| "the rename itself (the fact that new content now lives at that path) survives power loss" | step 5 specifically — this is the one people skip |

### 2. What `NamedTempFile::persist` does and does not give you

`tempfile::NamedTempFile::persist` performs the rename but is explicit that it is not a durability primitive on its own: "neither the file contents nor the containing directory are synchronized, so the update may not yet have reached the disk when persist returns" — [docs.rs/tempfile NamedTempFile](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html). It does give you atomic replacement of the target (rename semantics), and it fails with the underlying `io::Error` (which will carry `EXDEV`) if the temp file and target are on different filesystems — "Temporary files cannot be persisted across filesystems" (same page).

On failure, `persist` returns a `PersistError<F>` which hands the `NamedTempFile` back to you (`error` + `file` fields, with `From<PersistError<F>> for NamedTempFile<F>`) — [docs.rs/tempfile PersistError](https://docs.rs/tempfile/latest/tempfile/struct.PersistError.html) — so the correct cross-device fallback is: catch the error, `io::copy` the temp file's contents to a new temp file created in the target's directory, sync, and retry the rename there; or better, never let this happen by always creating the temp file in the target directory in the first place (see §3).

```rust
// Wrong: persist alone, and a temp dir that may not share the target's filesystem.
let tmp = tempfile::NamedTempFile::new()?;         // tempfile::env::temp_dir() — may be tmpfs!
write_all(&tmp, data)?;
tmp.persist(target_path)?;                          // EXDEV risk + no fsync guarantee

// Right: temp file lives in the target's own directory; sync before persist; fsync parent after.
let dir = target_path.parent().expect("target has a parent");
let mut tmp = tempfile::Builder::new()
    .prefix(".tmp-")
    .tempfile_in(dir)?;                              // same filesystem by construction
tmp.write_all(data)?;
tmp.as_file().sync_all()?;                           // durability of content
tmp.persist(target_path)?;                           // atomic rename, same fs guaranteed
#[cfg(unix)]
{
    let parent = std::fs::File::open(dir)?;
    parent.sync_all()?;                              // durability of the rename itself
}
```

### 3. Rename atomicity in practice: same-filesystem, EXDEV, Windows

`rename(2)` is atomic only within a single mounted filesystem; "rename() does not work across different mount points, even if the same filesystem is mounted on both," returning `EXDEV` — [man7.org rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html). The man page also flags an NFS-specific caveat worth carrying into the "concurrent processes" contract: "On NFS filesystems, you cannot assume that if the operation failed, the file was not renamed" — a failed rename over NFS may or may not have taken effect.

The tmpfs trap: many environments mount `/tmp` (and therefore `$TMPDIR`, and therefore the default target of `tempfile::NamedTempFile::new()` / `std::env::temp_dir()`) as tmpfs, while the actual cache/install tree lives on a persistent disk-backed filesystem. Code that creates its temp file via the global temp-dir default and then tries to `persist`/`rename` it into the cache will work in every local dev environment (where `/tmp` and `$HOME` often share a filesystem) and fail in production or CI containers with a distinct tmpfs `/tmp`. The only robust fix is structural, not a runtime check: always call `tempfile::Builder::new().tempfile_in(<same dir as target>)`, never the bare `NamedTempFile::new()`.

Windows has no single primitive with identical semantics. Two building blocks:

- `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING` — closest analog to POSIX rename-with-overwrite; `std::fs::rename` uses this under the hood on Windows.
- `ReplaceFileW` — purpose-built "replace one file with another," and unlike a bare move, it's documented to preserve attributes/ACLs/streams of the original and is explicitly a multi-step operation "combined... within a single function" (save new data, rename original to temp name, rename new file into place, delete original) rather than a single atomic syscall — [learn.microsoft.com ReplaceFileW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew). Its own error codes (`ERROR_UNABLE_TO_MOVE_REPLACEMENT`, `ERROR_UNABLE_TO_MOVE_REPLACEMENT_2`, `ERROR_UNABLE_TO_REMOVE_REPLACED`) describe partially-completed states explicitly — evidence it is not a single atomic kernel transaction the way POSIX rename is. Both `ReplaceFile` and `MoveFileEx` require the files to be **on the same volume**; there is no cross-volume atomic move on Windows either.
- There is no Windows equivalent of "fsync the parent directory" — NTFS directory-entry durability is instead a function of `FlushFileBuffers` on the file handle and the NTFS journal; the reusable write helper's parent-dir-fsync step must be `#[cfg(unix)]`-gated and simply omitted on Windows, not stubbed to a no-op that looks like it did something.

### 4. Multi-file atomicity: package installs are N files

A package install writes many files under one logical unit, but `rename` is a single-path primitive — there is no multi-file transaction in the filesystem. Three real patterns, in increasing order of fit for an OCI-blob-backed store:

**(a) Stage-then-rename-the-directory.** Build the whole package tree under `install/.staging-<id>/`, then a single `rename(staging_dir, final_dir)` swaps it in atomically (rename is atomic per-path regardless of how many files are inside the renamed directory — the directory-entry rename is one operation). Downside: still needs `EXDEV` avoidance (staging dir must be on the same filesystem as `final_dir`'s parent) and doesn't dedupe content across packages.

**(b) Content-addressed store + atomic pointer swap.** Files are stored once, named by content digest, in an immutable, never-mutated store (`store/<algo>/<digest>`); a package "version" is just a directory of symlinks/hardlinks into that store, and *that* directory is what gets atomically swapped in (rename or symlink-swap) as the last step. This is the nix and pnpm shape: nix's `/nix/store` paths are content-hash-named and immutable — "packages aren't overwritten... rebuilt and installed in a different path... so it doesn't interfere with the old version," with atomicity coming from symlink/profile swapping such that on crash "the system will either boot in the old or the new configuration" — [nixos.org How Nix Works](https://nixos.org/guides/how-nix-works). pnpm stores every package version once, content-addressed, and links files into `node_modules` via hard links from that single store — [pnpm.io Motivation](https://pnpm.io/motivation). Because store entries are immutable and named by their own content, concurrent writers of the same digest never conflict (see §7), and a half-written store entry is simply never referenced by any pointer, so it's invisible until it's complete and atomically linked.

**(c) Journal/intent record replayed on next start.** Write an intent record ("installing package X, expected files: [...]") durably before starting file operations; on next startup, if the record exists without a matching completion marker, replay (finish or roll back) the operation. This is SQLite's rollback-journal shape: write undo/redo information durably first, then mutate, then delete the journal as the commit point — "If power fails... SQLite detects the 'hot journal' on restart and replays its contents" — [sqlite.org Atomic Commit](https://sqlite.org/atomiccommit.html). This pattern is the most general (works for non-file-tree operations too) but is strictly more machinery than (b) requires when the underlying data is already content-addressed.

**Which fits an OCI-blob-backed store:** (b). OCI blobs are already addressed by digest (`sha256:...`), so the "immutable content-addressed store" half of the pattern is already the data model — a blob cache keyed by digest needs no locking and no journal to be internally consistent (§7). The remaining work is making the "package version" pointer (whatever names a set of blobs as "installed package X @ version Y") a single atomically-swapped artifact: a directory of links, or a single small pointer file (itself written via the §1 sequence) that names the content-addressed paths making up that version. A staged-directory rename (a) is a reasonable *implementation detail* of building that pointer target, not a competing top-level strategy.

### 5. Interruption: SIGINT, Drop, and panic strategy

What SIGINT mid-extraction actually leaves behind: whatever files had been created and renamed into their final location before the signal arrived, plus a staging directory (if pattern 4a/4b is used) containing a partial write — because the default SIGINT disposition terminates the process immediately, with no unwinding, no `Drop` execution, at the instruction boundary the signal is delivered.

`Drop` is not a signal handler and must not be treated as one:

- `Drop::drop` runs during normal scope exit and during **unwinding** panics. It does not run on `SIGKILL` (uncatchable), does not run on the default disposition of `SIGINT`/`SIGTERM` (process just exits), and does not run past the point of `std::process::abort()` or a `panic = "abort"` panic.
- corrode.dev's hardening guide is explicit about the abort case: "panic hooks only run for unwinding panics. If your program aborts on panic, or if the panic is caused by a stack overflow or out-of-memory condition, your hook won't execute" — [corrode.dev Hardening Rust Code for Production](https://corrode.dev/blog/hardening-rust/). The same logic applies transitively to any cleanup wired through a panic hook or through `Drop` guards that assume unwinding — a `panic = "abort"` profile (common in release builds, e.g. to shrink binary size or because `catch_unwind` isn't needed) silently disables that cleanup path.
- If you install a SIGINT handler to attempt graceful shutdown, that handler runs in a signal-handler context with its own restrictions (async-signal-safety), and racing it against in-flight filesystem work to "clean up" is exactly the kind of code that produces heisenbugs no test suite will reliably reproduce.

The case for recovery-as-the-only-cleanup-path: don't try to clean up on the way down at all. Give every staging directory/file a name that unambiguously marks it as disposable-if-orphaned (fixed prefix, PID + timestamp, or a location like `<cache>/tmp/` that nothing else ever reads from), and at the *start* of every run — before doing any new work — sweep that location: anything older than "this run could plausibly still be using it" (a liveness check, or simply "anything left over from a previous process, since only one install should be staging into a given slot at a time") gets deleted. This turns every kind of interruption (SIGKILL, power loss, panic-abort, OOM-kill) into the same recovery code path, instead of requiring N different graceful-shutdown handlers to each get it right.

### 6. Idempotency, convergence, and resumable downloads

**Convergence, defined per operation:**
- *Blob fetch*: converges when `store/<digest>` exists and its content hashes to `<digest>`. Re-running when it already converged is a no-op (check existence, skip fetch) — this is the free win content-addressing gives you.
- *Package install (pointer/link step)*: converges when the version's pointer/link-set exists and every link target exists in the content store. Re-running after a torn install re-derives the intended link set from the manifest and re-does only the atomic swap (§4b) — it does not need to know whether the previous run got partway through, only what the *end state* should look like, and drive toward it.
- *Lockfile update*: converges when the lockfile's content matches what the current resolution would produce; re-running re-resolves and re-writes via the §1 sequence, unconditionally — lockfile writes are cheap enough that "idempotent" here just means "deterministic given the same inputs," not "skip if already done."

**Detecting torn state without a full re-verify:** a full content re-hash of every blob on every startup defeats the purpose of caching. Cheaper signals, in order of preference: (1) presence of a staging marker (a `.staging-*` directory or file left in a well-known location — its mere existence *is* the "torn" signal, no hashing needed); (2) absence of the final atomically-renamed artifact where the manifest says one should exist; (3) only as a last resort, spot-verify (not full-tree-verify) by re-hashing the specific entries whose presence was ambiguous from (1)/(2).

**Resumable downloads:** partial blob downloads may be resumed with HTTP `Range` requests, but resuming is purely a network-efficiency optimization — it must not weaken the integrity check. The correct sequence: resume via `Range: bytes=<offset>-`, append to the local partial file, and once the declared total length is reached, hash the **entire assembled file** and compare against the expected digest before it is ever renamed into the content-addressed store. Verifying only the newly-fetched suffix, or trusting the server's `Content-Range`/`Content-Length` without an end-to-end digest check, verifies nothing about the bytes that were already on disk from the earlier attempt — a corrupted first attempt plus a clean resume of the remainder still produces a corrupted whole file that a suffix-only check would pass.

### 7. Concurrent processes: locking the cache

Two `grim install` runs against one cache need different treatment for different parts of the cache:

- **The content-addressed blob store** (`store/<digest>`): lock-free by construction is not just possible but *better* than locking. Two processes writing the same digest to the same path write byte-identical content (that's what content-addressing guarantees) — whichever one's atomic rename lands last simply overwrites an identical file. No lock is needed, and adding one would only serialize two writers that don't actually conflict. This is the strongest practical argument for pattern 4b over 4a/4c in a concurrent-process world.
- **Mutable shared state** (the lockfile, an index/manifest, a "which version is currently linked" pointer): needs a real advisory lock. `fs4`'s `FileExt`/`AsyncFileExt` traits provide `lock_exclusive`/`lock_shared`/`try_lock_exclusive` over a `rustix`-backed Unix implementation and a `windows-sys`-backed Windows implementation — [docs.rs/fs4](https://docs.rs/fs4/latest/fs4/). `fd-lock` provides a narrower `RwLock`/`RwLockReadGuard`/`RwLockWriteGuard` API over a file descriptor with the same two-backend split, and is explicit that these are **advisory**: "can be used to coordinate file access, but not prevent access" — [docs.rs/fd-lock](https://docs.rs/fd-lock/latest/fd_lock/). Advisory means every writer must opt in to taking the lock; a code path that forgets to lock bypasses protection silently, which is exactly why "no direct writes, only through the helper" (§ normative rules) has to be the enforced boundary, not "remember to lock."
- **Lock scope/granularity**: prefer one lock per mutable artifact (one lock guarding the lockfile, a separate lock guarding the index) over one global cache lock — a global lock turns concurrent installs of unrelated packages into a serial queue for no correctness reason, given the blob store itself needs no lock.
- **Stale lock detection**: advisory locks held via `flock`/`LockFileEx` are automatically released when the holding process dies (even via `SIGKILL`), which is the main practical advantage of OS-level advisory locks over a hand-rolled "lock file containing a PID" scheme — the latter requires you to reimplement liveness detection (check `/proc/<pid>` exists, or `kill(pid, 0)`) and races when a PID is reused. Prefer OS-level advisory locks specifically because they don't need stale-lock detection at all on a local filesystem.
- **NFS caveat**: `rename(2)`'s own man page warns that failed renames over NFS leave ambiguous state (§3), and advisory locking over NFS has a long history of unreliable `lockd`/NLM behavior and doesn't survive network partitions cleanly. Treat any cache directory that might be NFS-mounted as a case needing its own explicit design decision (e.g., refuse to run, or fall back to a coarser single-global-lock-with-timeout-and-manual-recovery posture), not as "the same fs4 lock just works."

## Normative guidance candidates

1. **No code path may write directly to a path inside the cache, lockfile, or install tree via `fs::write`, `File::create`, or any std filesystem-mutation call.** All such writes go through one crate-local helper (e.g. `durable_write(target: &Path, contents: &[u8]) -> io::Result<()>`) that implements the §1 sequence.
   - *Rationale*: a single audited implementation of temp-same-dir + sync + rename + parent-fsync is the only way ~50 ad-hoc call sites converge on one correctness story instead of fifty slightly-different ones.
   - *VERIFICATION*: `grep -rnE 'fs::write\(|File::create\(' --include=*.rs src/ | grep -v <helper module path>` should return zero hits inside cache/install-tree modules; add a `#[deny]`-level custom clippy disallowed-methods lint (`clippy.toml` `disallowed-methods = ["std::fs::write", "std::fs::File::create"]` scoped via module-level `#![allow]` only in the helper itself) so `cargo clippy` fails the build on a bypass.

2. **The temp file for any durable write must be created in the same directory as its final target, via `tempfile::Builder::new().tempfile_in(target.parent().unwrap())`, never via `NamedTempFile::new()` / `std::env::temp_dir()`.**
   - *Rationale*: this is what makes the subsequent rename same-filesystem by construction, closing the `TMPDIR`-is-tmpfs `EXDEV` trap structurally instead of relying on deployment-environment luck.
   - *VERIFICATION*: `grep -rn 'NamedTempFile::new()\|tempfile::tempfile()\|env::temp_dir()' --include=*.rs src/` should return zero hits outside genuinely-scratch (non-persisted) uses; a code-review grep, since clippy can't distinguish call intent here.

3. **Every durable write calls `sync_all()` (or documents in a comment why `sync_data()` suffices) on the temp file *before* calling `persist`/`rename`, and — on Unix — opens and `sync_all()`s the parent directory *after* the rename succeeds.**
   - *Rationale*: `persist` alone gives you atomic replacement but explicitly zero durability guarantee per the tempfile docs (§2); skipping the parent-dir fsync leaves the rename itself un-recorded on crash even though the content is safe.
   - *VERIFICATION*: the helper from rule 1 is the only place this needs auditing — code review of that one function, plus a `#[cfg(unix)]`-gated integration test that (a) performs a durable write, (b) truncates/kills the process via `std::process::exit` immediately after (no unwind), (c) in a fresh process, confirms the target file exists with correct content — proving the sequence survived a hard process exit.

4. **Package/version installs use a content-addressed blob store keyed by digest plus a single atomically-swapped pointer (directory rename or pointer-file rename) as the last step of install — never N independent per-file renames as the install's atomicity boundary.**
   - *Rationale*: `rename` is only atomic per-path; treating "the install" as atomic requires collapsing it to one rename, and content-addressing makes the blob-level work of getting there lock-free and dedupe-friendly for free (§4b, §7).
   - *VERIFICATION*: reading heuristic — the install code path should have exactly one call to a rename/persist function whose target is "the thing that makes this version visible" (a version pointer or version directory); if there are N renames each independently visible to a concurrent reader mid-install, the rule is violated. Grep for `rename(` / `.persist(` call sites in the install module and manually confirm only one is on the "externally visible" path.

5. **Every staging/temp directory used during install or extraction lives under one well-known, fixed-prefix location (e.g. `<cache>/tmp/` or `<install-root>/.staging-*`) and is never cleaned up on the way down (no SIGINT handler, no panic hook, no `Drop` guard relied on for correctness) — cleanup happens exclusively via a sweep at the start of the next run.**
   - *Rationale*: `Drop` doesn't run on `SIGKILL`/default-`SIGINT`/`panic = "abort"` (§5); a recovery-only cleanup model converges every interruption mode (crash, kill, power loss, panic-abort) onto one tested code path instead of requiring each interruption mode to be separately handled correctly.
   - *VERIFICATION*: grep for `impl Drop for` in install/extraction modules — any `Drop` impl there that does more than release an in-process handle (e.g. one that calls `fs::remove_dir_all`) is a rule violation to flag for review; separately, confirm a startup-sweep function exists and is called before any new staging directory is created (`grep -rn 'fn sweep_orphaned\|fn gc_staging'`).

6. **On startup, before any new operation begins, unconditionally sweep the fixed staging location and remove entries not belonging to a currently-live process (or simply all entries, if only one install can be in flight against a given cache at a time).**
   - *Rationale*: this is the recovery path from rule 5 — without it, orphaned staging directories accumulate forever and interrupted runs never converge to a clean state.
   - *VERIFICATION*: an integration test that (a) creates a fake orphaned staging dir with a plausible name, (b) runs the CLI's normal startup path, (c) asserts the orphan is gone afterward.

7. **Blob writes to the content-addressed store require no lock; writes to any *mutable* shared artifact (lockfile, index, "current version" pointer) must hold an `fs4`/`fd-lock` exclusive advisory lock scoped to that one artifact, held only for the duration of the write.**
   - *Rationale*: content-identical concurrent blob writes are safe by construction (§7) and locking them only adds contention with no correctness benefit; mutable shared state has no such guarantee and needs real mutual exclusion.
   - *VERIFICATION*: grep for every `fs::write`/helper-call site touching the lockfile or index and confirm each is preceded by a `lock_exclusive`/`RwLock::write` call in the same function or an enclosing guard; a lock-scope reading heuristic, since it's a call-ordering property clippy can't check.

8. **Resumed/partial downloads must verify the digest of the fully-assembled blob after resume completes, never the digest of only the newly-fetched byte range.**
   - *Rationale*: a suffix-only or `Content-Range`-trusting check cannot detect corruption that happened in bytes fetched during an earlier, interrupted attempt (§6); the whole point of content-addressing is that the final digest check is the only integrity boundary that matters.
   - *VERIFICATION*: grep the download/resume code path for the digest-verification call and confirm its input is the full assembled file (e.g. re-opened and hashed end-to-end, or a running hasher fed from byte 0) rather than a hasher constructed partway through a `Range` response; a reading heuristic on the specific function, since this is a data-flow property.

9. **No lockfile/cache-mutation code path assumes advisory locks work correctly if the cache directory is on a network filesystem (NFS/SMB); either document that the cache must be local, or add an explicit degraded-mode/refuse-to-run check.**
   - *Rationale*: NFS `rename` failure semantics are explicitly ambiguous per POSIX (§3, §7) and `flock`/NLM-based locking over NFS has known reliability gaps — silently trusting the same locking code path on NFS as on local disk is an unverified assumption, not a tested guarantee.
   - *VERIFICATION*: a documentation/design-review check (not automatable) — confirm the cache-directory-selection code either rejects/warns on detected network filesystems (e.g. via `statfs` filesystem-type check on Unix) or the project's docs explicitly scope out network-filesystem cache locations.

## AI-agent angle

An LLM writing this kind of code reliably gets these wrong without a mechanical check:

- **Reaches for `NamedTempFile::new()` or `tempfile::tempfile()` instead of `tempfile_in(target_dir)`** because the plain constructor is the first thing autocomplete/training data surfaces, and it "works" in every local test since dev machines rarely have a distinct-filesystem `/tmp`. **Check**: the grep in normative rule 2 — this is a pure text-pattern match, cheap to run in CI on every diff.
- **Calls `persist()` and considers the write "durable" because the function name and the temp-file pattern look familiar from a tutorial**, without adding `sync_all()` first or a parent-directory fsync after — because the tempfile docs' explicit disclaimer ("neither the file contents nor the containing directory are synchronized") is exactly the kind of one-sentence caveat that gets skipped when an LLM pattern-matches "this looks like the standard atomic-write idiom" rather than reading the linked docs. **Check**: rule 1's clippy `disallowed-methods` config plus rule 3's process-kill integration test — the test catches the missing-fsync case even if the code review misses it, because "content survives an actual hard process exit" is a behavioral assertion, not a style check.
- **Adds a `Drop` impl that deletes the staging directory "for cleanliness"** and treats that as the interruption-safety story, because RAII-cleans-up-on-scope-exit is the idiomatic Rust reflex and the model doesn't distinguish "cleans up on the happy path and on unwinding panics" from "cleans up on every kind of interruption." **Check**: grep for `impl Drop for` in install/extraction modules (rule 5) — any hit doing filesystem removal there is a flag for human review, since the intended design has cleanup live only in the startup sweep.
- **Treats a resumed HTTP download's `200 OK` vs `206 Partial Content` handling as "done" once bytes are written to disk**, and verifies only the freshly-downloaded range (or skips verification "because it already passed once"), because chaining a `Range` request onto an existing partial file reads as obviously correct without the digest-of-whole-file step made explicit. **Check**: rule 8's data-flow grep, or better, a fault-injection test that corrupts byte 0 of a partially-downloaded file, resumes the download, and asserts the final install is rejected.
- **Wraps every filesystem operation in an `fs4` lock "to be safe," including blob-store writes**, because "add a lock" reads as the safe default for concurrency questions and the model doesn't reason about content-addressing making the lock unnecessary. **Check**: rule 7's grep — lock acquisition calls should only appear near lockfile/index/pointer code, not near blob-store writes; a diff that adds a lock call inside the blob-store write path is worth a second look even though it isn't strictly wrong, since it signals the design distinction wasn't understood.

## Contested / evolving

- **`fsync` error semantics are still not fully fixed at the kernel level.** The LWN discussion of PostgreSQL's fsyncgate ends without a settled kernel-side resolution — proposals included direct I/O adoption, a `syncfs`-based per-filesystem error counter, and netlink-based I/O error reporting, with "no single, immediate fix" — [lwn.net/Articles/752063](https://lwn.net/Articles/752063/). The pragmatic, still-current mitigation is application-level: treat fsync failure as fatal for that data rather than retriable, which is what Postgres, MySQL/InnoDB, and MongoDB/WiredTiger converged on — [wiki.postgresql.org Fsync Errors](https://wiki.postgresql.org/wiki/Fsync_Errors). This is a real disagreement between "the kernel should give stronger guarantees" (aspirational, unresolved) and "applications must assume the weaker guarantee" (current practice) — the second is what this brief's rules assume.
- **Whether `rename` is crash-atomic (not just atomic w.r.t. concurrent readers) is filesystem- and mount-option-dependent, and this keeps shifting.** Dan Luu's notes report that even btrfs — the filesystem most often cited as "safe" here — only guarantees crash-atomicity for *replacing an existing file*, not creating a new one, and that "numerous rename atomicity bugs" have been found on btrfs specifically, including recently introduced ones — [danluu.com/deconstruct-files](https://danluu.com/deconstruct-files/). Treat "rename is crash-atomic" as a claim that needs the explicit parent-directory-fsync step (§1) to be true on any filesystem, not as a property you get for free from any particular filesystem choice.
- **Whether content-addressed-store-plus-pointer-swap or journal/WAL-based replay is the "right" default for package managers is still an active design split across the ecosystem** — nix and pnpm chose content-addressing; apt/dpkg and most traditional package managers still lean on a mix of ordered operations plus a separate transaction log; cargo's own registry cache is closer to content-addressed-but-not-store-immutable. For an OCI-blob-backed tool this brief comes down on content-addressing (§4) because the data model already matches, but this is a design decision worth revisiting if the tool ever needs to support mutable/rewritable blobs (which OCI in principle allows via re-pushing a tag, unlike a true CAS).
- **`sync_data` vs `sync_all` portability is murky in practice**: the Rust std docs themselves note "some platforms may simply implement this in terms of `sync_all`" — [doc.rust-lang.org std::fs::File::sync_data](https://doc.rust-lang.org/std/fs/struct.File.html#method.sync_data) — so treating `sync_data` as a meaningful performance optimization is platform-dependent and should be measured, not assumed, on any given target triple.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.rs/tempfile NamedTempFile](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html) | Primary crate docs | current (2026) | Defines exactly what `persist` does/doesn't guarantee; the crate this ecosystem should standardize on |
| [docs.rs/tempfile PersistError](https://docs.rs/tempfile/latest/tempfile/struct.PersistError.html) | Primary crate docs | current (2026) | Shows the EXDEV failure shape and the file-recovery-on-error API |
| [sqlite.org Atomic Commit In SQLite](https://sqlite.org/atomiccommit.html) | Primary vendor doc | long-standing, actively maintained | Canonical worked example of journal-based crash consistency; the pattern §4c and the recovery model in §5/§6 generalize from it |
| [danluu.com/deconstruct-files](https://danluu.com/deconstruct-files/) | Independent technical survey | widely cited, periodically updated | Best single source on filesystem-specific rename/fsync gotchas and why "just fsync" isn't sufficient |
| [lwn.net/Articles/752063 — fsync() PostgreSQL discussion](https://lwn.net/Articles/752063/) | Primary technical journalism on a real incident | 2018, still the reference incident | The definitive account of why retrying a failed fsync is unsafe, driving rule 9's fatal-on-fsync-failure posture |
| [wiki.postgresql.org Fsync Errors](https://wiki.postgresql.org/wiki/Fsync_Errors) | Primary project wiki | 2018–ongoing | Postgres's own summary of the fix adopted (PANIC on fsync failure) and cross-DB industry convergence |
| [docs.rs/atomicwrites](https://docs.rs/atomicwrites/latest/atomicwrites/) | Primary crate docs | current (2026) | Alternative/reference implementation of the same temp+fsync+rename idiom, useful to compare API shape against a hand-rolled helper |
| [docs.rs/fs4](https://docs.rs/fs4/latest/fs4/) | Primary crate docs | current (2026) | The advisory-lock crate this brief recommends for lockfile/index mutation; documents the Unix/Windows backend split |
| [docs.rs/fd-lock](https://docs.rs/fd-lock/latest/fd_lock/) | Primary crate docs | current (2026) | Narrower advisory RwLock API; explicit about advisory-only semantics, important for rule 7's "opt-in" caveat |
| [man7.org rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html) | Primary OS reference (Linux man-pages) | authoritative, versioned with kernel | The actual atomicity contract, EXDEV condition, and the NFS ambiguity caveat rules 3/7/9 rest on |
| [doc.rust-lang.org std::fs::File (sync_all/sync_data)](https://doc.rust-lang.org/std/fs/struct.File.html#method.sync_data) | Primary language stdlib docs | current (2026, edition-2024 era) | The exact std API surface and the sync_all-vs-sync_data distinction the brief specifies |
| [learn.microsoft.com ReplaceFileW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) | Primary OS vendor reference | current, long-stable API | Windows' closest analog to atomic rename-with-overwrite, and evidence it is a multi-step (not single-syscall) operation with its own partial-failure error codes |
| [nixos.org How Nix Works](https://nixos.org/guides/how-nix-works) | Primary project documentation | current (2026) | The content-addressed-store + atomic-pointer-swap pattern this brief recommends for multi-file package installs, described by its originating project |
| [pnpm.io Motivation](https://pnpm.io/motivation) | Primary project documentation | current (2026) | Second real-world implementation of the same content-addressed-store shape, at package-manager scale directly comparable to grim/ocx |
| [corrode.dev Hardening Rust Code for Production](https://corrode.dev/blog/hardening-rust/) | Practitioner blog, Rust-consultancy authored | 2026-07-23 | Direct source for the panic=abort-skips-Drop-and-panic-hooks claim underpinning §5's "Drop is not a signal handler" argument |
