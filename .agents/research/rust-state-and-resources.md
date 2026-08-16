---
title: "Rust State and Resources: durability, teardown, and ownership shape"
topic: rust-state-and-resources
model: opus
consolidates:
  - rust-state-and-resources/atomic-writes-and-interruption-safety.md
  - rust-state-and-resources/drop-guards-panics-and-lock-poisoning.md
  - rust-state-and-resources/ownership-shapes-clones-and-interior-mutability.md
  - rust-state-and-resources/cas-hardlinks-and-concurrent-publish.md
date: 2026-08
revised: 2026-08
---

# Rust State and Resources

Four commissioned briefs (topic-map.md:210–212, plus the CAS/hardlink follow-up
this artifact commissioned in its first round) merged into one ruleset: the
durable-write contract, what actually runs on the way down, the four scales of
borrow-checker appeasement, and how a content-addressed store that hardlinks
into install trees stays correct under concurrency. All four are the same
question asked at different altitudes — **who owns this state, and what is true
about it when the process stops mid-sentence?**

## Verdict

1. **One durable-write helper, or the contract does not exist.** 50 atomic-write
   sites across ocx_lib and grimoire (errors-async-security.md:63) cannot each
   carry their own correctness story. grimoire already has the right one at
   `src/store/atomic_write.rs`; ocx does not.
2. **fsync is not optional and it is not retriable.** ocx has *zero* `sync_all`
   or `sync_data` calls in `crates/` — every ocx atomic write is
   crash-atomic-for-readers but not durable across power loss. That is the single
   largest concrete gap this wave found.
3. **Temp files live in the target's parent directory, always.** Both codebases
   already do this (`NamedTempFile::new_in`), and it is the structural fix for
   the `TMPDIR`-is-tmpfs `EXDEV` trap — and, on Windows, for the same-volume
   requirement of `CreateHardLinkW`. Codify it before someone regresses it.
4. **Recovery is the only cleanup path.** No SIGINT handler, no panic hook, no
   `Drop` guard is load-bearing for crash safety. Staging goes in one well-known
   place; a sweep at the *start* of every run is the correctness mechanism.
   ocx has the sweep (`TempStore::stale_entries`) but only wires it into
   `ocx clean` — one call site short of correct.
5. **`Drop` is a tidiness backstop, never a durability mechanism.** Both
   codebases' `Drop` impls are already well-shaped (`let _ = …`, no unwraps);
   keep that, and forbid `.unwrap()`/`panic!` inside `drop` explicitly since it
   is exactly what an LLM writes when asked for "robust cleanup".
6. **`panic = "abort"` is a per-profile decision, not a project-wide ban.** The
   drop-guards brief says never; ocx sets it in `[profile.shim]` for a
   Drop-free single-purpose Windows shim and *deliberately refuses it* for
   `[profile.dist]` with the reasoning written in the manifest
   (Cargo.toml:27–29, 52). ocx is right; the rule is scoped, not absolute.
7. **Multi-file installs collapse to one visible rename — but the blob half is
   never a rename at all.** The *pointer* (or staged directory) is published by
   exactly one atomic replace; the CAS blob under its digest name is published
   by a **persist-if-absent** primitive and written exactly once, forever. The
   follow-up round settled this: replace semantics on a digest-named path is a
   correctness bug, not an implementation detail (STATE-28).
8. **Resumed downloads verify the whole assembled blob, never the suffix.**
   Non-negotiable; a suffix check verifies nothing about the earlier attempt.
9. **The blob store needs no lock; mutable artifacts need one each.** ocx's
   inode-stability locking rule (rules-inventory.md:917–923) is strictly more
   precise than the generic "one lock per artifact" and supersedes it. The
   lock-free claim is conditional on STATE-28, not on rename semantics.
10. **`&mut self` on a cache getter is a finding, not a style nit.** Neither
    codebase currently has one — write the rule down before the first one lands.
11. **`.clone()`, `&mut self`, `Arc<Mutex<_>>`, and `RefCell` are the four tools
    that silence *any* borrow error without answering it.** No lint distinguishes
    the load-bearing use from the appeasement use. The review question is the
    deliverable: *would this exist if the borrow checker had said nothing?*
12. **std `Mutex` in async is house convention already** (46 std hits, zero
    `tokio::sync::Mutex` across three codebases, errors-async-security.md:57).
    Encode it, because an LLM's default is the opposite.
13. **A hardlink is not a copy, and a digest is a claim about bytes, not about an
    inode.** Two distinct hazards follow, and they fail differently: in-place
    mutation of a store blob corrupts *every* install sharing that inode
    instantly and silently; replace-by-rename leaves the bytes intact but
    detaches the store's bookkeeping from the inode installs actually hold, so a
    mark-and-sweep GC can delete a live install's target. Read-only blobs
    (STATE-31) close the first; persist-if-absent (STATE-28) closes the second.
14. **GC liveness comes from scanning what references a blob, never from
    `st_nlink`** — and the delete phase runs under an exclusive lock with an
    explicit re-check, because the reachability snapshot goes stale.
15. **Documented gap: Windows durability.** The parent-directory fsync is
    `#[cfg(unix)]` and has no Windows equivalent, so the durable-write sequence
    delivers *no researched power-loss guarantee on Windows*. `ReplaceFileW` is
    a documented multi-step operation with partial-failure error codes, not a
    kernel transaction. Whether `FlushFileBuffers` on the file suffices for a
    `MoveFileExW` publish on NTFS/ReFS is unanswered, and the transactional-NTFS
    deprecation leaves no obvious replacement. This is load-bearing — ocx ships
    a Windows shim binary and hardlinks published shim blobs — and is the
    highest-value remaining research round.
16. **Documented gap: `CreateHardLinkW`'s behaviour on an existing
    destination is undocumented.** Microsoft's own reference page is silent;
    `ERROR_ALREADY_EXISTS` is community observation, not a guarantee. Rust's
    `std::fs::hard_link` *does* document destination-exists as an error on every
    backend, so route through std rather than keying logic on a raw
    `GetLastError()` value (STATE-35). Related settled facts: `CreateHardLinkW`
    is explicitly **unsupported on ReFS**, caps at 1023 links per file, and
    Windows shows stale directory-entry size/attribute data for links other than
    the one a change was made through.
17. **Documented gap: no surveyed CAS re-verifies the existing blob on
    `EEXIST`.** cacache-rs, pnpm and Nix all trust the addressing scheme; none
    compares the winner's on-disk bytes against the loser's computed digest. A
    tampering threat model would need that comparison added deliberately — it is
    not something any of them promise.
18. **Documented gaps carried from the follow-up, not to be treated as
    settled:** whether ostree's shared→exclusive escalation actually closes the
    "object linked after the reachability snapshot" window (unverified from the
    fetched excerpt — so STATE-32 mandates an explicit re-check rather than
    copying the pattern on faith); whether Nix literally chmods store paths to
    444 (folklore, only the abstract immutability invariant is sourced); whether
    cacache-rs re-verifies on every `get`; whether Windows has any true
    single-call `RENAME_NOREPLACE` (`FILE_RENAME_INFO_EX` unverified); and
    cargo's registry-cache internals, which were not reachable in the research
    pass — **do not cite cargo as a hardlink-CAS reference.**

## The ruleset

### Durability and atomicity

**STATE-1 — Route every write to a cache, lockfile, or install-tree path through
one crate-local durable-write helper.** MUST
*Rationale:* 50 ad-hoc sites converge on one audited correctness story instead of
50 slightly different ones.
*Verify:* `rg -n 'fs::write\(|File::create\(|tokio::fs::write\(' <src>` returns
zero hits outside the helper module; enforce with `clippy.toml`
`disallowed-methods = ["std::fs::write", "std::fs::File::create"]`.

**STATE-2 — Create the temp file in the final target's own directory
(`NamedTempFile::new_in(parent)` / `Builder::tempfile_in`), never
`NamedTempFile::new()`, `tempfile::tempfile()`, or `env::temp_dir()`.** MUST
*Rationale:* makes the subsequent rename same-filesystem by construction; the
global temp dir is a tmpfs in containers and CI, so `EXDEV` fires in production
and never in dev. The same rule carries the Windows half: `CreateHardLinkW` is
same-volume-only, so a blob staged in `%TEMP%` cannot be linked into place at
all. Note `link(2)`'s stricter condition — same *mount*, not merely same
filesystem; a bind-mounted second view of one filesystem still returns `EXDEV`.
*Revised 2026-08:* extended with the Windows same-volume and same-mount
conditions (was unix/`EXDEV`-only).
*Verify:* `rg -n 'NamedTempFile::new\(\)|tempfile::tempfile\(\)|env::temp_dir\(\)' <src>`
— zero hits on any path that is later persisted.

**STATE-3 — Sync the temp file before `persist`/`rename`, and fsync the parent
directory after it, `#[cfg(unix)]`-gated.** MUST
*Rationale:* `NamedTempFile::persist` documents that it syncs neither contents
nor directory; the parent fsync is what makes the *rename itself* survive power
loss. Use `sync_all`; `sync_data` is permitted only when no metadata mutation
(`set_permissions`, `set_times`) follows the sync — otherwise the mode change is
not durable. There is no Windows equivalent of the parent fsync; omit the step
rather than stubbing a no-op that reads as done — **and do not then describe the
Windows write as durable.** On Windows this sequence buys atomicity-for-readers
only; the power-loss half is an open gap (Verdict 15), so any doc comment,
error message, or commit message claiming Windows durability is wrong.
This rule governs *mutable* targets (cache, lockfile, index, pointer). A CAS
blob's canonical path additionally takes STATE-28's persist-if-absent step in
place of the replacing rename.
*Revised 2026-08:* the original text presented the sequence-minus-one-step as
the Windows answer, which reads as a durability guarantee that no research
supports; the claim is now explicitly withheld.
*Verify:* read the one helper from STATE-1; plus an integration test that writes,
hard-exits via `std::process::exit` (no unwind), and re-reads the target in a
fresh process.

**STATE-4 — Treat a failed `fsync`/`sync_all` as fatal for that data. Never
retry it and continue.** MUST
*Rationale:* Linux may mark the failed page clean, so a subsequent successful
`fsync` is a false signal — the fsyncgate consensus adopted by Postgres, InnoDB,
and WiredTiger.
*Verify:* `rg -n -B3 -A3 'sync_all\(\)|sync_data\(\)' <src>` — no hit is inside a
retry loop or followed by `.ok()`/`let _ =`.

**STATE-5 — Make a multi-file install atomic with a content-addressed store plus
exactly one externally visible rename (pointer file or staged-directory swap) as
the final step.** MUST
*Rationale:* `rename` is atomic per path only; N independent renames means a
concurrent reader can observe a half-installed package. OCI blobs are already
digest-addressed, so the CAS half is free. **The one permitted replacing rename
is the pointer, never a blob:** a digest-named path is written once via
STATE-28 and never replaced, so "exactly one rename" counts pointer swaps only.
*Revised 2026-08:* scoped the single-rename allowance to the pointer; the
original wording admitted a replacing rename onto a digest-named path, which
STATE-28 forbids.
*Verify:* reading heuristic — grep `.persist(|fs::rename(` in the install module;
exactly one hit may target a path a concurrent reader consults, and no hit may
target a digest-named path.

**STATE-6 — Verify the digest of the fully assembled blob after a resumed
download, never only the newly fetched byte range or the `Content-Range`
header.** MUST
*Rationale:* corruption in the first attempt survives a clean resume of the
remainder; a suffix check verifies nothing.
*Verify:* trace the hasher's input in the resume path — it must be fed from byte
0 or the file re-opened end-to-end. Fault-injection test: corrupt byte 0 of a
partial file, resume, assert rejection.

**STATE-7 — Put every staging file/directory under one fixed, well-known
location, and never rely on a signal handler, panic hook, or `Drop` guard to
remove it.** MUST
*Rationale:* `Drop` does not run on `SIGKILL`, on the default `SIGINT`
disposition, or past a `panic = "abort"`. Recovery-as-the-only-cleanup-path
collapses every interruption mode onto one tested code path.
*Verify:* `rg -n 'impl Drop for' <install/extract modules>` — any hit calling
`remove_dir_all`/`remove_file` as its *correctness* story (not as best-effort
tidying) is a finding.

**STATE-8 — Run the orphan sweep at the start of every run, before any new work
— not only from an explicit `clean` subcommand.** SHOULD
*Rationale:* STATE-7's recovery path only exists if it actually executes;
sweeping only on demand means interrupted runs never converge.
*Verify:* `rg -n 'stale_entries|fn sweep_|fn gc_' <src>` and confirm a caller on
the normal startup path. Integration test: plant a plausible orphan, run the
normal command, assert it is gone.

**STATE-9 — No lock for content-addressed blob writes. One exclusive advisory
lock per *mutable* artifact, and choose its location by inode stability: lock
the data file itself when its inode is stable, a dedicated locks directory when
the data is atomic-rename-replaced.** SHOULD
*Rationale:* two writers of the same digest write identical bytes — locking them
only serializes non-conflicting work. **The lock-free claim rests on STATE-28,
not on rename semantics:** "last writer's rename wins, the bytes are identical
either way" is false once hardlinks exist, because the loser's rename rebinds
the canonical name to a *different inode* than the one installs already linked,
orphaning live content from the store's bookkeeping. Lock-free is correct only
because the loser never writes at all. Rename-replaced *mutable* data rotates
its inode, so a lock held on the old inode guards nothing; a sidecar next to the
guarded data is the specific broken form.
*Revised 2026-08:* the "identical bytes, last rename wins" rationale was an
overclaim under hardlinks; the lock-free conclusion survives but for a different
reason.
*Verify:* `rg -n '\.lock_exclusive\(|lock_shared\(|LockedFile' <src>` — hits
cluster on lockfile/index/pointer code, not blob writes; each lock target is in
the locks directory unless its inode provably never rotates.

**STATE-10 — Either detect a network-filesystem cache directory and degrade
explicitly, or document that the cache must be local.** CONSIDER
*Rationale:* `rename(2)` failure over NFS is documented as ambiguous (the file
may or may not have been renamed), `flock`/NLM has known split-brain behaviour,
`renameat2(RENAME_NOREPLACE)` returns `EINVAL` on NFS, and `O_EXCL` is
unreliable on pre-NFSv3 — silently reusing the local-disk code path there is an
untested assumption. `link(2)` is the portable create-if-absent primitive the
`open(2)` man page itself recommends for exactly this reason.
*Revised 2026-08:* extended with the NFS-specific failure modes of the
persist-if-absent primitives.
*Verify:* documentation/design review of the cache-directory-selection function.

### Content-addressed store and hardlinks

**STATE-28 — Publish a CAS blob with a persist-if-absent primitive; a
digest-named path is written exactly once and never replaced.** MUST
*Rationale:* replace semantics on a digest-named path is one of two silent
corruptions (Verdict 13) — either the store's canonical name now points at an
inode no install holds, stranding live content outside GC's reachable set, or an
in-place variant torn-writes every hardlinked consumer at once. Because content
is determined by the digest, there is never a legitimate reason to overwrite.
Primitives: `std::fs::hard_link` (documented to error on an existing
destination on every platform backend — the portable choice),
`renameat2(RENAME_NOREPLACE)` (Linux ≥3.15, per-filesystem; not NFS),
`renamex_np(RENAME_EXCL)` (macOS, gated on `VOL_CAP_INT_RENAME_EXCL`),
`open(O_CREAT|O_EXCL)`, `clonefile(2)` (macOS, also `EEXIST`), or
`CreateHardLinkW` + `DeleteFile` of the temp name (Windows, which has no
`RENAME_NOREPLACE`). The temp name must live in the canonical path's own
directory (STATE-2).
*Verify:* every write targeting a digest-named path uses a NOREPLACE/EXCL/link
primitive; a plain `rename`/`persist`/`File::create` onto such a path is a bug.
Race test: two writers persisting the same digest, both succeed, no temp file
left behind.

**STATE-29 — Treat `EEXIST`/`ERROR_ALREADY_EXISTS` from a CAS persist as
success: discard the loser's temp file and continue.** MUST
*Rationale:* under content addressing the destination already existing means
someone else published byte-identical content. This is `cacache-rs`'s literal
implementation. Surfacing it as an error invites the "fix" that reintroduces
replace semantics (`--force`, overwrite-on-conflict), which is the bug STATE-28
exists to prevent. Agent-facing messages must read "already published, expected
under concurrency", not as a failure to route around.
*Verify:* the persist call site maps `AlreadyExists` to `Ok`; grep the publish
path for `force`/`overwrite` flags reachable from a conflict handler — there
should be none.

**STATE-30 — A blob's canonical digest path must not exist until its content is
completely written and verified; absence means "not yet published", never
"corrupt".** MUST
*Rationale:* this is what makes "the path exists" a usable readiness signal for
every other process. A linker that finds the path missing waits, polls, or
fetches — it must not conclude the store is damaged, and must not conclude
presence implies partial content.
*Verify:* kill the writer mid-write in a test; assert the canonical path never
appears. Read paths treat `NotFound` on a digest path as not-yet-published.

**STATE-31 — Mark store blobs read-only immediately after persist, on every
platform, and say why when a write to one is refused.** MUST
*Rationale:* the store's read-only bit is the only thing that turns "someone
edited an installed, hardlinked file in place" from silent corruption of every
project on the machine into an immediate `EACCES`/`EPERM`. This is
specifically an agent-containment control: nothing about the path tells an agent
the file is shared, so the failure must come from the filesystem. The error
surfaced to a caller should name the cause ("shared, immutable package-store
entry — change the source package or use a local override"), not a bare errno.
Note the metadata-durability interaction with STATE-3: cap permissions *before*
the sync, or use `sync_all`.
*Verify:* after a normal install, open an installed file for writing outside the
package manager and assert it fails; `rg -n 'set_permissions' <store>` shows the
read-only cap on the publish path.

**STATE-32 — Compute GC liveness by scanning what references a blob
(lockfiles, manifests, install-tree state), never from `st_nlink`; run
reachability under a shared lock, delete under an exclusive lock, and re-check
liveness for anything newly referenced between the two phases.** MUST
*Rationale:* `st_nlink` counts directory entries the package manager does not
know about and goes stale relative to its own bookkeeping in both directions.
The two-phase escalation is ostree's pattern; the fetched source did **not**
confirm ostree closes the "object linked after the reachability snapshot,
before the exclusive lock" window (Verdict 18), so the re-check is mandatory
here rather than inherited on faith.
*Verify:* race test — start the reachability scan, install a new object
concurrently, let the delete phase run, assert the new object survives. Second
test: uninstall one of two projects sharing a digest, run GC, assert the digest
survives.

**STATE-33 — Verify a blob's digest on write (mandatory), never on link
(pointless), and make on-read verification an explicit opt-in command.** SHOULD
*Rationale:* on write you already hold the bytes, and it is the only point where
verification is close to free — a size mismatch and a hash mismatch are both
hard errors before persist. A hardlink touches zero bytes, so re-verifying on
link would re-read every blob on every install and destroy the reason for
hardlinking. `pnpm store status` exists as a separate command precisely because
it is not implicit. Note the trust boundary: nothing here defends against
tampering between the winner's write and a later read (Verdict 17); a threat
model that needs that must add the comparison deliberately.
*Verify:* the write path hashes before persist; the link path contains no
hashing; an explicit `verify`/`status` subcommand exists and is not called from
the normal install path.

**STATE-34 — Materialise into an install tree by trying reflink/clonefile,
then hardlink, then copy — selected by catching the failure of each, not by
pre-detecting filesystem type.** SHOULD
*Rationale:* CoW clones (`FICLONE` on btrfs/XFS-with-reflink/OCFS2,
`clonefile(2)` on APFS, ReFS block cloning on Server 2016+) make the
"user edits the installed file" hazard structurally impossible rather than
merely permission-denied, but their support matrix is far narrower than
hardlinks and ReFS block cloning carries real constraints (cluster alignment,
4 GB region cap, 8175 shares per region, matching integrity-stream and sparse
settings). Detecting support by trying the call and handling
`EOPNOTSUPP`/`ENOTSUP`/`EXDEV` is the only form that stays correct across
mounts. Never let a stage of the ladder silently no-op.
*Verify:* test matrix across same-fs, different-fs, and different-device
targets; assert correct content in all three and that the chosen stage is
observable (logged/reported), never skipped silently.

**STATE-35 — Do not depend on undocumented or unavailable Windows link
behaviour.** MUST
*Rationale:* four separate facts, each of which breaks a plausible design:
(a) `CreateHardLinkW`'s reference page is silent on an existing destination, so
`ERROR_ALREADY_EXISTS` is inference — route through `std::fs::hard_link`, whose
error-on-existing contract *is* documented, rather than branching on a raw
`GetLastError()`; (b) `CreateHardLinkW` is explicitly unsupported on ReFS, so a
volume chosen for block cloning cannot also serve the hardlink rung of STATE-34;
(c) links cap at 1023 per file, a hard limit that must fall back to copy, not a
performance cliff; (d) Windows updates a link's directory-entry size and
attribute data only through the link the change was made on, so cached
directory-listing metadata about a hardlinked file is not trustworthy — open it.
*Verify:* a CI test on the actual Windows runner that hardlinks onto an existing
destination and asserts+logs the observed behaviour, re-run when the image
changes; `rg -n 'GetLastError|ERROR_ALREADY_EXISTS' <src>` — no publish-path
logic keys on the literal code; the 1024th link falls back to copy in a test.

### Teardown, panics, and poisoning

**STATE-11 — No `.unwrap()`, `.expect()`, or `panic!` in a `Drop::drop` body.**
MUST
*Rationale:* a panic in `drop` during an in-progress unwind is a double panic and
aborts the process immediately, discarding every remaining guard.
*Verify:* `rg -n -U 'impl Drop for [\s\S]{0,400}?\}' <src>` then scan the matched
bodies for `unwrap(|expect(|panic!`; or `rg -n -A8 'impl Drop for' <src> | rg '\.unwrap\(\)|\.expect\(|panic!'`.

**STATE-12 — Fallible or blocking teardown gets an explicit
`close()`/`commit()`/`shutdown()` returning `Result`; `Drop` is a synchronous,
non-blocking, best-effort backstop only.** SHOULD
*Rationale:* `C-DTOR-FAIL` and `C-DTOR-BLOCK`; `Drop` cannot be `async` and there
is no stable `AsyncDrop`, so awaiting teardown from `drop` is not expressible and
`block_in_place` panics on a `current_thread` runtime.
*Verify:* `rg -n -A10 'impl Drop for' <src> | rg '\.lock\(\)|std::fs::|reqwest::|block_on|block_in_place'`
— each hit is acceptable only if provably fast and local, and says so in a
comment.

**STATE-13 — A "you forgot to `commit()`" `debug_assert!` bomb in `Drop` must be
guarded by `!std::thread::panicking()`.** MUST
*Rationale:* unguarded, it fires *during* an unrelated unwind and converts one
failure into an abort — exactly the failure it was meant to surface.
*Verify:* `rg -n -A6 'impl Drop for' <src> | rg 'debug_assert'` — every hit is in
the same body as `thread::panicking()`.

**STATE-14 — `panic = "abort"` may only be set on a profile whose binary owns no
`Drop`-based cleanup and no `resume_unwind` propagation, and the manifest must
say why.** MUST
*Rationale:* abort skips every `Drop` on every thread, silently disabling
temp-file, lock-file, and partial-write guards. It is legitimate for a
self-contained shim with no such guards; it is not a routine size tweak.
*Resolves a conflict:* the source brief bans it workspace-wide. Scoping to the
profile is strictly better and matches what ocx already reasoned out.
*Verify:* `rg -n 'panic\s*=\s*"abort"' Cargo.toml */Cargo.toml` — each hit sits
under a profile with a comment naming the binary and asserting it is guard-free.

**STATE-15 — Never call `std::process::exit` (or `libc::_exit`) after any
`Drop`-bearing guard has been constructed.** MUST
*Rationale:* the same hazard as STATE-14, triggered by a call instead of a build
profile. Primary rule and grep live in `rust-cli-contract/exit-codes.md`;
restated here because it is the same mechanism.
*Verify:* `rg -n 'process::exit\(' <src>` — hits allowed only in `main`'s final
statement after all guards have dropped.

**STATE-16 — Every `.lock().unwrap()` / `.read().unwrap()` / `.write().unwrap()`
carries a one-line poison-policy comment: fatal, recover, or non-poisoning.**
SHOULD
*Rationale:* blanket `.unwrap()` conflates "this corruption must halt the
process" with "this is fine to keep using"; one panicking thread then wedges
state that was never corrupted. Poison detection is also documented as
best-effort, so an unpoisoned lock is not proof of consistency.
*Verify:* `rg -n '\.lock\(\)\.unwrap\(\)|\.write\(\)\.unwrap\(\)|\.read\(\)\.unwrap\(\)' <src>`
— every hit has an adjacent `// poison-policy: …`. Recovery shape is
`.unwrap_or_else(|e| e.into_inner())`, optionally with `clear_poison()`.

**STATE-17 — Do not migrate `once_cell::sync::Lazy`/`OnceCell` to
`std::sync::LazyLock`/`OnceLock` without auditing the init closure for panics.**
SHOULD
*Rationale:* `once_cell` leaves the cell empty on a panicking init and retries on
next access; `LazyLock` poisons *unrecoverably* — every future access panics
forever, with no `into_inner` escape. A mechanical "drop the dependency" refactor
silently changes recoverability.
*Verify:* `rg -n 'once_cell::sync::(Lazy|OnceCell)' <src>` before any such PR; any
init closure containing I/O, parsing, `?`, `unwrap`, or `expect` is a
do-not-migrate.

**STATE-18 — Prefer `std::thread::scope` over `std::thread::spawn` for parallel
work whose lifetime is bounded by the enclosing function.** CONSIDER
*Rationale:* scoped threads auto-join before `scope()` returns and propagate
panics, making "forgot to join" — and the dropped-guard cleanup it silently
skips — structurally impossible instead of a review obligation.
*Verify:* `rg -n 'thread::spawn' <src>` — each hit either deliberately outlives
the function (rare in a CLI) or converts to `thread::scope`.

**STATE-19 — When a `Drop` impl reads `self.<other_field>`, confirm that field is
declared *after* the guard field.** CONSIDER
*Rationale:* struct fields drop in declaration order (locals in reverse); a guard
declared after the resource it reaches for runs against already-dropped state,
and the borrow checker does not catch this for non-lifetime-tracked resources.
*Verify:* reading heuristic — no grep substitutes for comparing the `Drop` body
against the struct definition's field order.

### Ownership shape

**STATE-20 — A cache/memoization getter takes `&self` and has one of exactly
three shapes: `fn get(&self, k) -> Option<&V>` (append-only, never evicts),
`fn get(&self, k) -> Option<Arc<V>>`/`Option<Rc<V>>` (evicting), or no getter at
all (precompute the map, pass it in).** MUST
*Rationale:* `&mut self` on a getter is viral — every caller up the graph must
take `&mut self` too, and the type system's read/write distinction is destroyed
for the whole chain. An evicting cache must never hand out `&V`, because the next
call can evict the slot behind it.
*Verify:* `rg -n 'fn (get|lookup|fetch|cached)\w*\(&mut self' <src>` — any hit on
a type with more than one caller is a finding.

**STATE-21 — Never wrap `Cell`/`RefCell` in `Arc`. Pick the interior-mutability
type at the point the value's concurrency boundary is designed, not when a panic
reveals it.** MUST
*Rationale:* `Arc<T>` is `Send + Sync` regardless of `T`; the `!Sync` interior is
what breaks, and it breaks either as a distant `Send`-bound error or as a runtime
`BorrowMutError` under an interleaving single-threaded tests never produce.
*Verify:* `cargo clippy` (`clippy::arc_with_non_send_sync`, warn-by-default) plus
`rg -n 'Arc<(std::)?(cell::)?(Ref)?Cell<' <src>` for the nested cases the lint's
direct-construction scope misses.

**STATE-22 — `std::sync::Mutex` is the default lock in async code;
`tokio::sync::Mutex` requires a comment explaining why the critical section must
span an `.await`.** SHOULD
*Rationale:* Tokio's own guidance — the std lock is "ok and often preferred" when
contention is low and no guard crosses an await. Reaching for the async mutex is
usually a signal the critical section is drawn too large. (Guards actually held
across `.await` are `rust-async`'s rule via `clippy::await_holding_lock`; not
restated here.)
*Verify:* `rg -n 'tokio::sync::Mutex' <src>` — every hit has a justifying comment.

**STATE-23 — A newly introduced `Arc<Mutex<T>>`/`Arc<RwLock<T>>` with exactly one
lock call site is compiler appeasement, not a design decision.** SHOULD
*Rationale:* atomic refcounting, lock/unlock cost, and poisoning risk bought for
a value that never crosses a thread. No lint exists for this — contention is a
runtime property.
*Verify:* `rg -n 'Arc<(std::sync::)?(Mutex|RwLock)<' <diff>`, then count distinct
`.lock()`/`.read()`/`.write()` sites for the type; one site total is the finding.

**STATE-24 — For every `.clone()` on non-`Arc`/`Rc` data, answer: "if I mutate
the clone, should the original see it?" Yes → the clone is wrong.** SHOULD
*Rationale:* `clippy::redundant_clone` proves only that a clone was *wasted*
(target provably dead); its own docs call the analysis "conservative and
limited". It cannot see cross-function redundancy, semantic redundancy, or
divergence bugs — the review question lives exactly in that gap.
*Verify:* `cargo clippy -- -W clippy::redundant_clone` as the mechanical floor;
a `// clone: <why>` comment convention makes the non-obvious ones greppable
after the fact.

**STATE-25 — Write `Arc::clone(&x)` / `Rc::clone(&x)`, not `x.clone()`, for
smart-pointer clones.** CONSIDER
*Rationale:* makes the cheap refcount bump visually distinct from an owned-data
clone, so a reviewer scanning for STATE-24 candidates does not have to resolve
the type first. Matters at this codebase's clone density (1864 + 1110 sites).
*Verify:* enable `clippy::clone_on_ref_ptr` in `[workspace.lints]` — it is a
`restriction` lint and allow-by-default, so silence means unmade decision.

**STATE-26 — An in-process cache over immutable content-addressed data (OCI
manifests, blobs, verified layer paths) uses `OnceLock`/`elsa::FrozenMap`, or a
precomputed plain `HashMap` when the key set is known before the read-heavy
phase — not `RefCell<HashMap<..>>` or `Mutex<HashMap<..>>`.** CONSIDER
*Rationale:* a digest-keyed entry never needs invalidation, so a lock or a
runtime borrow check buys nothing and drags an eviction question that does not
apply. The *on-disk* CAS is not an in-process cache question at all — its
concurrency is handled by write-once persist-if-absent (STATE-28), so do not
guard it with a `Mutex` either.
*Revised 2026-08:* the rationale credited "the filesystem serializes it via
atomic rename", which is the replace-semantics claim STATE-28 retires.
*Verify:* `rg -n 'RefCell<HashMap|Mutex<HashMap' <src>`; if the key is a digest,
it is a refactor candidate.

**STATE-27 — When a shared `Mutex<T>` starts guarding *behavior* (staleness
checks, size bounds, refresh ordering) rather than a plain field, escalate to an
owned task + channel.** CONSIDER
*Rationale:* Tokio's own escalation ladder terminates here: an actor enforces the
invariant once, in the owner, instead of re-deriving it at every lock site.
Not free — bounded-channel cycles deadlock like lock-ordering violations, and
handle cycles block clean shutdown.
*Verify:* reading heuristic — if more than ~3 `.lock()` sites on one type each
re-implement the same check-then-mutate-then-maybe-refresh sequence, that
duplication is the signal.

## Applied to OCX

Working-tree evidence below was verified directly against
`/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` on 2026-08-14; audit
citations are to `.agents/research/ocx-codebase-audit/`.

### Satisfied

- **STATE-2** — every persisted temp file already uses the same-parent
  constructor: `crates/ocx_lib/src/file_structure/blob_store.rs:173`,
  `index_store.rs:186` and `:794`, and `grimoire/src/store/atomic_write.rs:52`.
  Zero `NamedTempFile::new()` / `env::temp_dir()` hits in either tree.
- **STATE-1/3 (grimoire only)** — `grimoire/src/store/atomic_write.rs:32–67` is
  the reference implementation of the whole sequence: `new_in(parent)` →
  `write_all` → `sync_data` → perms cap → `persist` → `#[cfg(unix)]` parent-dir
  `sync_all`. Its module doc names itself as the single primitive every store
  mutator funnels through. Adopt this verbatim into ocx.
- **STATE-11/12/13** — every `impl Drop` in ocx is already non-panicking and
  best-effort: `crates/ocx_lib/src/cli/progress.rs:278` and `:402`,
  `oci/index/chained_index.rs:2986`, `package/bin_scan.rs:916` — all `let _ = …`
  or an infallible call. No unwraps, no blocking I/O, no `?`.
- **STATE-14** — `Cargo.toml:52` sets `panic = "abort"` only for
  `[profile.shim]` (the standalone Windows shim), and `Cargo.toml:27–29`
  explicitly *refuses* it for `[profile.dist]` with the reason recorded: the 13
  `resume_unwind(join_err.into_panic())` sites would lose spawned-task panic
  propagation, "and abort removes that mechanism *silently* — it compiles clean."
  This is the rule already reasoned out correctly; it is why STATE-14 is scoped
  per-profile rather than banned outright.
- **STATE-20/21** — no `fn get*(&mut self)` cache getter anywhere in `crates/`,
  and only 7 `RefCell` hits total, none behind an `Arc`.
- **STATE-22** — 46 `std::sync::Mutex` hits and **zero** `tokio::sync::Mutex`
  across all three codebases (errors-async-security.md:57, :119) — the house
  convention already matches Tokio's guidance. It is nowhere written down; that
  is what STATE-22 fixes.
- **STATE-9 (partial)** — ocx already has the more precise inode-stability
  locking policy as a rule (rules-inventory.md:917–923) plus the RAII primitives
  to implement it: `utility::fs::LockedFile`, `LockedJsonFile<T>`,
  `LockedTomlFile<T>` (rules-inventory.md:904–906).
- **STATE-28 (partial)** — `utility/fs.rs:219` `persist_temp_file_if_absent` is
  the persist-if-absent primitive, and it exists because ocx hit the hazard
  empirically: for a hardlinked shim blob, replace-semantics `persist` orphans
  the record the winner published, so a losing racer must converge on the
  winner's file. The reasoning is right; the coverage is the open item below.

### Violated

- **STATE-3 — ocx has zero `sync_all`/`sync_data` calls in `crates/`.** Its whole
  atomic-publish path (`crates/ocx_lib/src/utility/fs.rs:197–260`,
  `persist_temp_file` → `persist_with_retry` → `NamedTempFile::persist`) renames
  without ever syncing the file or the parent directory. `persist` documents that
  it synchronizes neither. Every ocx cache/lockfile/index write is therefore
  atomic with respect to concurrent readers but **not durable across power
  loss** — the 31 ocx_lib persist/rename sites counted at
  errors-async-security.md:63 all inherit this. grimoire's helper is the fix.
- **STATE-3 (grimoire, minor) — `set_permissions` runs *after* `sync_data`**
  (`grimoire/src/store/atomic_write.rs:54–57`). `sync_data` explicitly may skip
  metadata, so the capped mode is not covered by the sync that precedes it.
  Either move the perms call before the sync or promote it to `sync_all`.
  STATE-31's read-only cap lands in the same place — fix both in one edit.
- **STATE-8 — the sweep exists but is not on the startup path.**
  `crates/ocx_lib/src/file_structure/temp_store.rs:186` `stale_entries()`
  discovers both unlocked entries and orphan directories, and
  `temp_store.rs:196` handles the no-lock-file orphan case correctly — but its
  only production caller is `package_manager/tasks/clean.rs:451`, i.e. the
  explicit `ocx clean` command. An interrupted install converges only if a human
  remembers to run `clean`.
- **STATE-16 — grimoire has 37 `.lock().unwrap()` sites** in `src/`, none
  carrying a poison policy. Per the source brief's own mapping, the
  credential-cache and lockfile-mirror cases belong in "fatal" and the
  progress/telemetry counters in "recover" or "non-poisoning" — right now they
  are all the same unexamined default.
- **STATE-23 (open, unmeasured)** — 45 `Arc<Mutex<…>>`/`Arc<RwLock<…>>`
  constructions in ocx `crates/`, against 116/150/8 total `Arc` hits
  (errors-async-security.md:57). The per-site "how many lock call sites does this
  actually have" count has never been run; it is the cheapest available audit.
- **STATE-28 (unmeasured) — the no-clobber variant is scoped to the hardlinked
  shim case.** Every other digest-named write appears to route through the
  replace-semantics `persist_temp_file`. Which digest-named paths still take the
  replacing path has not been enumerated; that enumeration is the first job.
- **STATE-31 (unmeasured)** — no evidence either tree marks store blobs
  read-only after persist. Until it does, an agent's `Edit`/`Write` on an
  installed hardlinked file silently corrupts every other consumer of that
  digest.

### New commitments

- **Port `grimoire/src/store/atomic_write.rs` into ocx** as the single durable
  write primitive, and route `utility::fs::persist_temp_file`'s callers through
  it — keeping ocx's Windows transient-lock retry schedule
  (`utility/fs.rs:235–260`, rules-inventory.md:909–910), which grimoire lacks.
  The merged helper is strictly better than either half. It must expose two
  publish modes: replacing (mutable targets) and persist-if-absent (digest-named
  paths, STATE-28).
- **Enumerate every digest-named write and move it onto
  `persist_temp_file_if_absent`**, then delete the replacing path's access to
  digest-named targets so a future contributor cannot reintroduce it.
- **Cap store blobs read-only on publish (STATE-31)** and give the resulting
  `EACCES` a message that explains shared-inode identity — this is the cheapest
  agent-containment control available in either tree.
- **Wire `TempStore::stale_entries` into the normal startup path**, not only
  `ocx clean`, with the liveness check already implied by its lock-held test.
- **Add the poison-policy comment convention** to grimoire's 37 lock sites, and
  add STATE-16's grep to the review checklist next to the existing "no
  `MutexGuard` across `.await`" line (rules-inventory.md:334).
- **Adopt STATE-9's inode-stability rule as portable guidance** rather than an
  ocx-local table — it is more precise than the generic per-artifact locking
  advice and grimoire has no equivalent.
- **Add the Windows hardlink CI probe (STATE-35)** — one test on the real
  runner that records what an existing-destination link actually does, since the
  vendor documentation does not say.
- **Do not add `clippy::await_holding_lock` here** — errors-async-security.md:105
  flags it as unverified and the `rust-async` wave owns it; this wave's
  contribution is STATE-22 (which lock type), not the guard-lifetime check.

## AI-agent failure modes

Ranked by how often each bites an unattended agent working in this codebase.

1. **`.clone()` the instant `cannot borrow` or `value moved` appears**, without
   asking whether the two values are meant to diverge. Highest frequency by a
   wide margin — 1864 + 1110 existing clone sites are the ambient pressure, and
   the codebase's own checklist already names it (rules-inventory.md:167, :336).
   `redundant_clone` catches only the provably-dead subset. → STATE-24.
2. **`persist()` treated as "durable" because the temp-file idiom looks
   familiar.** The tempfile docs' disclaimer is a one-sentence caveat an LLM
   pattern-matching "standard atomic write" skips — and ocx's live tree is the
   proof this happens to humans too. → STATE-1, STATE-3.
3. **Editing a file inside an install tree in place**, because nothing in the
   path says the file is a hardlink into a shared store. The blast radius —
   every project on the machine using that digest — is invisible from the
   directory the agent is looking at, and the corruption is instant and silent.
   The defence cannot be instruction, it has to be the read-only bit.
   → STATE-31.
4. **`Arc<Mutex<T>>` as the reflex answer to any sharing question**, including
   single-threaded paths, because it makes the type `Clone` and interior-mutable
   in one move. Nothing warns; contention is invisible to static analysis.
   → STATE-23, STATE-27.
5. **"Fixing" an `AlreadyExists` error from a publish step** by adding a force /
   overwrite path — reintroducing exactly the replace-semantics bug the CAS
   design exists to rule out. The error looks like a failure to route around;
   it is the concurrency protocol working. → STATE-28, STATE-29.
6. **A `Drop` impl that deletes the staging directory, presented as the
   interruption-safety story.** RAII-cleans-up is the idiomatic Rust reflex, and
   the model does not distinguish "runs on unwind and scope exit" from "runs on
   every interruption". → STATE-7.
7. **`NamedTempFile::new()` instead of `new_in(parent)`**, because the bare
   constructor is what autocomplete surfaces and it passes every local test where
   `/tmp` and `$HOME` share a filesystem. → STATE-2.
8. **`.lock().unwrap()` everywhere**, because it is what every tutorial shows;
   `into_inner()`/`clear_poison()` never appear unprompted. → STATE-16.
9. **`RefCell` reached for to turn `&mut self` into `&self`**, without checking
   whether the type ever crosses a `tokio::spawn`. The most dangerous of the
   ownership set: `cargo build` and single-threaded `cargo test` both pass
   silently. → STATE-21.
10. **Trusting `st_nlink` as the "is anything still using this blob" signal**
    when writing GC, because it is the obvious kernel-provided counter and looks
    authoritative. It counts entries the package manager never recorded and
    misses ones it did. → STATE-32.
11. **Adding `panic = "abort"` because a summary calls it "smaller and faster"**,
    with no connection drawn to Drop-based cleanup. Generic Rust advice that is
    actively wrong for a guard-heavy binary. → STATE-14.
12. **`.unwrap()` inside `Drop::drop` when asked for "cleanup that handles
    errors".** The `?` variant fails to compile so the compiler catches it; the
    `.unwrap()` variant compiles and only misbehaves during an unwind.
    → STATE-11.
13. **Branching on a specific Windows error code** copied from a forum answer —
    `ERROR_ALREADY_EXISTS` from `CreateHardLinkW` is not in the vendor docs at
    all, and the code compiles and passes on the one Windows image CI happens to
    run. → STATE-35.
14. **`once_cell::Lazy` → `LazyLock` as a behaviour-preserving "modernize to std"
    pass.** Compiles, passes happy-path tests, and permanently bricks a static
    the first time a fallible init panics. → STATE-17.
15. **`&mut self` on a cache getter**, because it is the first signature that
    stops the borrow checker complaining and the agent cannot see the callers it
    will cost later. → STATE-20.
16. **`thread::spawn` + a `JoinHandle` nobody joins**, because `spawn` dominates
    training data over `scope`. → STATE-18.
17. **Wrapping blob-store writes in an advisory lock "to be safe"**, not
    reasoning that content-addressing plus persist-if-absent makes them
    non-conflicting. Not wrong, but it signals the design distinction was
    missed. → STATE-9.

## Open questions

- **Windows durability has no researched answer.** STATE-3's parent-dir fsync is
  `#[cfg(unix)]`, and the research establishes only that `ReplaceFileW` is a
  documented *multi-step* operation with its own partial-failure error codes, not
  a kernel transaction. What actually makes a `MoveFileExW` publish survive power
  loss on NTFS/ReFS — whether `FlushFileBuffers` on the file suffices, and what
  the transactional-NTFS deprecation leaves available — is unanswered. **This is
  the next research round**, and the highest-value one: ocx ships a Windows shim
  binary, hardlinks published shim blobs, and already carries a Windows
  transient-lock retry schedule, so the platform is load-bearing, not incidental.
  The CAS follow-up settled the Windows *containment* half (STATE-35); the
  durability half is untouched.
- **What should a second concurrent `install` do on a held lock?** Block, block
  with timeout, or fail fast with a distinct exit code — and does the answer
  differ for the blob store (no lock) versus the lockfile? `acquire_with_timeout`
  exists at `temp_store.rs:161` but the policy is unstated. Sits between this
  wave and `registry-resilience-timeouts-and-retries`; assign it explicitly.
- **Is the startup sweep safe when concurrent installs are legal?** STATE-8's
  "delete anything left over" is only correct under single-in-flight-install;
  ocx's `TempStore` already uses lock-held-ness as the liveness test, which is
  the better answer, but the interaction with STATE-9's lock-location rule (locks
  live in a *separate* directory from the staging dir they guard) has not been
  checked for a race between sweeping the staging dir and acquiring its lock.
  STATE-32 gives the shape of the answer (shared scan, exclusive delete,
  re-check) but the sweep has not been rewritten against it.
- **Does poisoning policy survive the `resume_unwind` sites?** ocx propagates
  spawned-task panics through 13 `resume_unwind` calls (Cargo.toml:28). Whether
  a lock poisoned on a worker thread and then re-panicked on the parent produces
  a comprehensible error, or a double-poison the user sees as a wedge, is
  untested.
- **Unresolved upstream:** whether `Mutex` poisoning should be opt-in remains a
  live Rust design question — `clear_poison()` (1.77) is an incremental
  concession, not a resolution. Revisit STATE-16 if std ships a non-poisoning
  variant. Likewise `AsyncDrop` remains unshipped; STATE-12's explicit-teardown
  convention becomes a language-checked contract if it lands.

## Revision log

- **2026-08 — folded in `cas-hardlinks-and-concurrent-publish.md`** (the
  follow-up this artifact commissioned). Frontmatter `consolidates` extended,
  `revised: 2026-08` added.
- **New rules STATE-28 … STATE-35** — persist-if-absent publish (28),
  EEXIST-is-success (29), canonical path only appears when complete (30),
  read-only store blobs (31), GC liveness by reference scan with two-phase
  locking and re-check (32), verification timing write/link/read (33),
  reflink→hardlink→copy ladder by error, not by fs detection (34), and the
  Windows link-behaviour rule (35).
- **STATE-3 changed** — previously implied the unix sequence minus the
  parent-dir fsync was still the Windows durability answer. It is not: the rule
  now withholds any Windows durability claim and points at the documented gap.
  This is the overclaim the follow-up round most directly contradicted.
- **STATE-9 changed** — its rationale rested on "last writer's rename wins, the
  bytes are identical either way", which is false under hardlinks (the loser's
  rename rebinds the name to a different inode and strands the one installs
  hold). The lock-free conclusion stands, now justified by STATE-28 instead.
- **STATE-5 changed** — "exactly one externally visible rename" now explicitly
  means the *pointer*; a replacing rename onto a digest-named path is forbidden
  by STATE-28.
- **STATE-26 changed** — dropped "the filesystem serializes it via atomic
  rename" from the rationale for the same reason; the on-disk CAS is serialized
  by write-once persist-if-absent.
- **STATE-2 extended** — added the Windows same-volume (`CreateHardLinkW`) and
  the `link(2)` same-*mount* conditions alongside the existing `EXDEV`/tmpfs
  rationale.
- **STATE-10 extended** — added the NFS failure modes of the persist-if-absent
  primitives (`RENAME_NOREPLACE` → `EINVAL`, unreliable `O_EXCL`).
- **Verdict 7 and 9 reworded**, Verdict **13–18 added** (hardlink identity, GC
  liveness, and four documented gaps: Windows durability, `CreateHardLinkW`
  existing-destination behaviour, no CAS re-verifies on EEXIST, and the
  unconfirmed ostree/Nix/cacache/cargo claims).
- **Open questions: the CAS-with-hardlinks round removed** — it is answered and
  now lives in the ruleset. The Windows-durability round stays open; the
  startup-sweep question is narrowed by STATE-32.
- **AI-agent failure modes** gained in-place install-tree editing (3),
  force-overwriting an `AlreadyExists` (5), `st_nlink`-as-liveness (10), and
  Windows error-code branching (13); the list was re-ranked accordingly.

## Sub-artifacts

- [rust-state-and-resources/atomic-writes-and-interruption-safety.md](rust-state-and-resources/atomic-writes-and-interruption-safety.md)
  — the five-step durable-write sequence, `EXDEV`/tmpfs trap, Windows rename
  equivalents, multi-file install atomicity patterns, recovery-only cleanup, and
  cache locking granularity.
- [rust-state-and-resources/drop-guards-panics-and-lock-poisoning.md](rust-state-and-resources/drop-guards-panics-and-lock-poisoning.md)
  — the three mandated `Drop` body shapes, `panic = "abort"` as a failure model,
  poisoning policy per state category, `LazyLock`-vs-`once_cell` divergence,
  scoped threads, and drop-order hazards.
- [rust-state-and-resources/ownership-shapes-clones-and-interior-mutability.md](rust-state-and-resources/ownership-shapes-clones-and-interior-mutability.md)
  — borrow-checker appeasement at four scales: `.clone()`, `&mut self` cache
  getters, interior-mutability selection, and `Arc<Mutex<T>>` sprawl versus the
  actor escalation, with grimoire's TUI as the counter-example.
- [rust-state-and-resources/cas-hardlinks-and-concurrent-publish.md](rust-state-and-resources/cas-hardlinks-and-concurrent-publish.md)
  — *(follow-up round, 2026-08)* hardlink identity and the two replace hazards,
  persist-if-absent primitives per platform, racing publishers, refcounting and
  GC lock escalation, verification timing, read-only blobs, CoW alternatives and
  the cross-filesystem fallback ladder, plus what pnpm/Nix/ostree/cacache/uv/
  Bazel/cargo actually do and where their documentation runs out.

## Key sources

| URL | Why |
|---|---|
| [man7.org — rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html) | The atomicity contract, the `EXDEV` condition, the NFS ambiguity caveat, and `renameat2(RENAME_NOREPLACE)`'s per-filesystem support matrix |
| [man7.org — link(2)](https://man7.org/linux/man-pages/man2/link.2.html) | "If newpath exists, it will not be overwritten" — the core persist-if-absent guarantee behind STATE-28, plus the same-*mount* restriction |
| [man7.org — open(2)](https://man7.org/linux/man-pages/man2/open.2.html) | `O_EXCL`'s NFS caveat and the man page's own recommendation to prefer `link(2)` for portable create-if-absent |
| [std::fs::File — sync_all / sync_data](https://doc.rust-lang.org/std/fs/struct.File.html#method.sync_data) | The exact std surface and the metadata distinction STATE-3 turns on |
| [std::fs::hard_link](https://doc.rust-lang.org/std/fs/fn.hard_link.html) | Documents error-on-existing-destination uniformly across platform backends — the portable primitive STATE-35 routes through |
| [docs.rs — tempfile::NamedTempFile](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html) | States plainly that `persist` syncs neither contents nor directory — the sentence ocx's tree skipped |
| [danluu.com — Files are hard / deconstruct-files](https://danluu.com/deconstruct-files/) | Best single survey of filesystem-specific rename/fsync gotchas and why "just fsync" is insufficient |
| [LWN 752063 — PostgreSQL's fsync surprise](https://lwn.net/Articles/752063/) | The reference incident behind STATE-4's fatal-not-retriable posture |
| [wiki.postgresql.org — Fsync Errors](https://wiki.postgresql.org/wiki/Fsync_Errors) | Cross-database convergence (Postgres, InnoDB, WiredTiger) on PANIC-on-fsync-failure |
| [Microsoft Learn — ReplaceFileW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) | Evidence Windows' closest rename analog is a multi-step operation with partial-failure error codes — the durability gap in Verdict 15 |
| [Microsoft Learn — CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw) | 1023-link cap, NTFS-only / no-ReFS support table, and the documented silence on existing-destination behaviour behind STATE-35 |
| [Microsoft Learn — Hard Links and Junctions](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions) | Same-volume restriction and the stale directory-entry metadata footgun |
| [Microsoft Learn — Block cloning on ReFS](https://learn.microsoft.com/en-us/windows-server/storage/refs/block-cloning) | The full constraint list that makes "we'll just reflink on Windows" false outside qualifying ReFS volumes |
| [Apple — clonefile(2)](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/man/man2/clonefile.2) | CoW clone semantics, `EEXIST` on existing destination, atomicity claim, `getattrlist` capability check |
| [man7.org — ioctl_ficlone(2)](https://man7.org/linux/man-pages/man2/ioctl_ficlone.2.html) | Linux reflink semantics and error codes for STATE-34's first rung |
| [nixos.org — How Nix Works](https://nixos.org/guides/how-nix-works) | The content-addressed store + atomic pointer swap pattern STATE-5 prescribes, from its originating project |
| [ostree — ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c) | Ground truth for the shared→exclusive GC lock escalation STATE-32 adapts (and the window it does not visibly close) |
| [pnpm — store CLI](https://pnpm.io/cli/store) | `store status` and `store prune` as explicit, opt-in operations — the evidence behind STATE-33's read-verification posture |
| [cacache-rs — content/write.rs](https://github.com/zkat/cacache-rs/blob/main/src/content/write.rs) | The worked Rust example of temp → verify → persist with EEXIST-is-fine handling (STATE-29) |
| [uv — cache concepts](https://docs.astral.sh/uv/concepts/cache/) | The plainest statement of the same-filesystem requirement and the copy fallback (STATE-34) |
| [Rust API Guidelines — Dependability](https://rust-lang.github.io/api-guidelines/dependability.html) | `C-DTOR-FAIL` and `C-DTOR-BLOCK`, the normative basis for STATE-11 and STATE-12 |
| [Rustonomicon — Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html) | Why unwinding exists, that it is the only mechanism running `Drop` on a panic path, and the double-panic abort |
| [std::sync::Mutex](https://doc.rust-lang.org/std/sync/struct.Mutex.html) | Poisoning triggers, `into_inner`, `clear_poison`, and the "detection is not ideal" caveat behind STATE-16 |
| [std::sync::LazyLock](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) | States its own poisoning is *unrecoverable*, explicitly contrasted with `poison::Mutex` — the STATE-17 hazard |
| [std::thread::scope](https://doc.rust-lang.org/std/thread/fn.scope.html) | Auto-join guarantee and panic propagation behind STATE-18 |
| [matklad — Caches in Rust](https://matklad.github.io/2022/06/11/caches-in-rust.html) | The `&mut self`-is-viral diagnosis and the three-shape decision table STATE-20 encodes |
| [Tokio tutorial — Shared State](https://tokio.rs/tokio/tutorial/shared-state) | Runtime maintainers' own std-Mutex-preferred guidance (STATE-22) and the actor escalation ladder (STATE-27) |
| [Alice Ryhl — Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/) | The task/handle split for STATE-27, and its own failure modes (bounded-channel cycles, shutdown) |
| [rust-unofficial — Clone to satisfy the borrow checker](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html) | The canonical statement of the divergence bug STATE-24's review question targets |
| [corrode.dev — Hardening Rust Code for Production](https://corrode.dev/blog/hardening-rust/) | Source of the generic `panic = "abort"` recommendation STATE-14 deliberately scopes down, plus panic-hook caveats |
