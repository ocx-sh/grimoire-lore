---
title: Content-addressed stores, hardlinks, and concurrent publish
topic: cas-hardlinks-and-concurrent-publish
agent: rust-state-and-resources
model: sonnet
date_researched: 2026-08
sources_count: 21
scope: >
  How content-addressed blob stores that hardlink into install trees stay
  correct under concurrency: the identity problem replace-semantics creates,
  the persist-if-absent primitives (link, renameat2 RENAME_NOREPLACE, O_EXCL,
  CreateHardLinkW), concurrent-publish races, refcounting/GC, verification
  timing, permissions/immutability, copy-on-write alternatives, cross-fs
  fallback, and what cargo/pnpm/nix/uv/bazel/ostree/cacache actually chose.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [The identity problem](#f-identity)
   - [Primitives per platform](#f-primitives)
   - [Concurrent publish of the same digest](#f-concurrent)
   - [Reference counting and GC](#f-gc)
   - [Verification timing](#f-verify)
   - [Permissions and immutability](#f-perms)
   - [Copy-on-write alternatives](#f-cow)
   - [Cross-filesystem fallback](#f-crossfs)
   - [Real implementations surveyed](#f-real)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. A CAS blob's name (its digest) is a claim about its *bytes*, not about a
   particular inode — but a hardlink makes multiple directory entries share
   one inode. Any operation that replaces what a path points to therefore
   risks silently detaching the store's bookkeeping from what installs
   actually have linked, without corrupting bytes and without erroring.
2. The correct write primitive for a CAS is **persist-if-absent**, not
   **replace**: `link(2)`, `renameat2(..., RENAME_NOREPLACE)`,
   `open(..., O_CREAT|O_EXCL)`, or `CreateHardLinkW` — all fail with
   `EEXIST`/`ERROR_ALREADY_EXISTS` instead of overwriting.
3. `link(2)`'s own man page is explicit: "If newpath exists, it will not be
   overwritten" — EEXIST, no silent clobber ([man7 link(2)](https://man7.org/linux/man-pages/man2/link.2.html)).
4. `renameat2(RENAME_NOREPLACE)` support arrived per-filesystem, not with the
   syscall: ext4 (Linux 3.15), btrfs/tmpfs/cifs (3.17), xfs (4.0),
   ext2/minix/reiserfs/jfs/vfat (4.9); NFS is not in the supported list and
   returns `EINVAL` ([man7 rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html)).
5. `O_EXCL` is unreliable on old NFS (pre-NFSv3 / pre-2.6 kernel); the
   `open(2)` man page itself recommends `link(2)` as the portable atomic
   "create if absent" primitive for exactly this reason
   ([man7 open(2)](https://man7.org/linux/man-pages/man2/open.2.html)).
6. macOS has a direct equivalent, `renamex_np(..., RENAME_EXCL)` → `EEXIST`
   if destination exists, gated behind the `VOL_CAP_INT_RENAME_EXCL` volume
   capability ([Darwin renamex_np(2)](https://www.unix.com/man-page/mojave/2/renamex_np/)).
7. Windows' `CreateHardLinkW` is silent in its own reference page about
   behavior when the destination exists — this is a **documented gap**, not
   a confirmed guarantee (see Finding 2). `std::fs::hard_link` on Rust,
   however, documents the destination-exists case as an error uniformly
   across platforms ([Rust std::fs::hard_link](https://doc.rust-lang.org/std/fs/fn.hard_link.html)).
8. Two writers racing to publish the same digest is safe *by construction*
   if both use persist-if-absent and the digest scheme is collision-resistant:
   the loser's call fails, the loser discards its temp file, and both
   processes end up looking at the same bytes. `cacache-rs` implements
   exactly this: a failed `persist()` is treated as success once the
   destination is confirmed to exist ([cacache-rs write.rs](https://github.com/zkat/cacache-rs/blob/main/src/content/write.rs)).
9. The still-streaming case is handled by *never* exposing the digest path
   until the write is verified complete: writers write to a private temp
   file first and only persist into the canonical digest path afterward.
   A linker that finds the digest path absent must treat that as "not yet
   published," not "corrupt" — same contract as the store's own durable-write
   rule.
10. GC racing an in-progress install is the same race as #8/#9 in reverse:
    GC must not delete an object between "discovered reachable" and "actually
    unlinked." ostree solves this with an explicit lock hierarchy —
    `OSTREE_REPO_LOCK_SHARED` while computing reachability, escalated to
    `OSTREE_REPO_LOCK_EXCLUSIVE` only for the deletion phase
    ([ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c)).
11. Nix (`nix-store --optimise`) and pnpm both do reference-counted-by-scan
    GC rather than trusting the filesystem link count: pnpm's `store prune`
    explicitly documents mark-and-sweep over which projects still reference
    which store entries ([pnpm store CLI](https://pnpm.io/cli/store)); Nix's
    optimiser dedups by comparing NAR-serialized file identity (contents +
    exec bit), not by inode ([nix-store --optimise](https://nix.dev/manual/nix/stable/command-ref/nix-store/optimise)).
12. Verification is cheapest and most meaningful **on write** (you already
    have the bytes in hand and are about to name them); it is effectively
    free to skip **on link** (linking touches zero bytes — that's the whole
    point of a hardlink); and most production CAS implementations skip
    routine **on-read** verification, relying instead on write-time
    verification plus read-only permissions to keep the store honest between
    runs — `pnpm store status` exists as an explicit, opt-in offline check
    precisely because it is *not* run implicitly ([pnpm store CLI](https://pnpm.io/cli/store)).
13. Read-only permissions on CAS blobs are not a hardening afterthought —
    they are what keeps a hardlink-based store correct at all. If a blob is
    writable and a user (or an agent) edits an installed file in place
    (open + write, not unlink + recreate), every other install sharing that
    inode is corrupted instantly and invisibly, because a hardlink is not a
    copy.
14. Copy-on-write clone primitives — Linux `FICLONE`/reflink, macOS
    `clonefile(2)`, Windows ReFS block cloning via
    `FSCTL_DUPLICATE_EXTENTS_TO_FILE` — solve the "user edits an installed
    file" hazard structurally: the clone is a real second inode that only
    *shares storage* until either side writes, at which point the filesystem
    forks the shared blocks automatically. None of them require the blob to
    be read-only.
15. `clonefile(2)` also refuses to overwrite: destination-exists is `EEXIST`,
    matching the persist-if-absent contract exactly
    ([Apple clonefile(2)](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/man/man2/clonefile.2)).
16. Reflink/clonefile/block-cloning are all same-filesystem-only, generally
    narrower in support than hardlinks (btrfs/XFS-with-reflink/OCFS2 on
    Linux; APFS only on macOS, not HFS+; ReFS v2 on Windows Server 2016+
    only, not NTFS at all).
17. The practical fallback ladder used across every real implementation
    surveyed is **reflink → hardlink → copy**, selected per-pair by whichever
    call succeeds; `uv`'s docs state the consequence plainly: if the cache
    and the target environment aren't on the same filesystem, uv "will not
    be able to link files from the cache into the environment and will
    instead need to fallback to slow copy operations"
    ([uv cache docs](https://docs.astral.sh/uv/concepts/cache/)).
18. Nix store objects are documented as immutable at the store-object model
    level ("once created, they do not change") — this is a stated invariant
    of the abstract model, not something the fetched manual page ties to a
    specific POSIX permission bit; treat the common "Nix chmods store paths
    444" claim as observed/folklore unless verified against source
    ([nix.dev store-object](https://nix.dev/manual/nix/stable/store/store-object)).
19. Windows has no single documented equivalent of `link(tmp) + unlink(tmp)`
    convenience — but the same trick works: create the temp file in the same
    directory as the canonical path (hard links are same-volume-only on
    Windows too), `CreateHardLinkW` it to the canonical name, then
    `DeleteFile` the temp name. `CreateHardLinkW` is NTFS-only and explicitly
    **not supported on ReFS** as of the Windows 8 / Server 2012 compatibility
    table in its own doc page
    ([CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw)).
20. None of cargo, uv, or Bazel's public docs describe a hardlink-based CAS
    with the identity guarantees this project needs as explicitly as
    pnpm/Nix/ostree do — cargo's registry cache in particular is not
    documented as content-addressed-with-hardlinks in any source reachable
    in this research pass; do not cite cargo as a hardlink-CAS reference
    without further source-diving.

## Findings

<a id="f-identity"></a>
### The identity problem

**1. What "replace" actually does to a hardlinked path, and why it's two separate hazards, not one.**

A CAS blob is addressed by digest under the invariant "same digest ⇒ same
bytes ⇒ one canonical inode that every consumer shares via hardlink." Two
distinct operations can violate this, with very different failure shapes:

- **In-place mutation** (`open(path, O_WRONLY|O_TRUNC)` then write, or any
  edit that doesn't go through unlink-and-recreate) mutates the *inode*
  directly. Because a hardlink is not a copy, every directory entry pointing
  at that inode — the store's canonical path *and* every install tree that
  hardlinked it — sees the new bytes immediately, including a torn/partial
  write mid-flight. This is the worst case: silent, instant, and shared by
  every consumer with no atomicity at all.
- **Replace-by-rename** (`rename(tmp, canonical_path)` where
  `canonical_path` is a name for an inode that is *also* hardlinked
  elsewhere, e.g., into an install tree) does not corrupt the old inode's
  bytes — `rename(2)` only swaps a directory entry, so anyone still holding
  the old name (the install tree's hardlink) keeps seeing the old,
  untouched content. The bug is subtler: the store's canonical path now
  points at a *different* inode than the one the install tree is actually
  using. The CAS's own bookkeeping (whatever maps digest → path for GC
  liveness, verification-skipping, etc.) is now lying about what's linked
  where. A mark-and-sweep GC that walks from the canonical path will happily
  keep the *new* inode alive and — depending on how liveness is computed —
  may find the *old* one (still referenced only by the install tree, not by
  anything the store recognizes) unreachable and delete-able, orphaning a
  live install. This is precisely the persist-if-absent primitives (link(2),
  O_EXCL, RENAME_NOREPLACE, CreateHardLinkW) are designed to prevent: by
  construction, a canonical CAS path is written *exactly once*, so there is
  never a legitimate reason to replace it.

<a id="f-primitives"></a>
### The primitives, per platform

**2. `CreateHardLinkW`'s own reference page does not state what happens when
the destination already exists.** The fetched Microsoft Learn page documents
parameters, the 1023-links-per-file cap, `ERROR_PATH_NOT_FOUND` for long
paths, and the NTFS-only / no-directories restriction — but says nothing
about an existing `lpFileName`. Widely observed behavior (community reports,
not confirmed against Microsoft source in this pass) is `ERROR_ALREADY_EXISTS`
(183). **Treat this as an inferred behavior, not a documented guarantee** —
verify empirically before depending on the exact error code in
platform-specific retry logic
([CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw)).

**3. `CreateHardLinkW` is explicitly unsupported on ReFS** per its own
Windows 8/Server 2012 technology-compatibility table (SMB 3.0: yes, CsvFS:
yes, ReFS: **No**). A store built on ReFS for block-cloning reasons cannot
also use `CreateHardLinkW` for the hardlink half of a reflink→hardlink→copy
ladder on that same volume — this needs to be designed around, not assumed
away
([CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw)).

**4. `link(2)` is cross-filesystem-restricted (`EXDEV`), including across
bind-mount-style multiple mount points of the *same* underlying filesystem**:
"Linux permits a filesystem to be mounted at multiple points, but link() does
not work across different mounts, even if the same filesystem is mounted on
both" ([man7 link(2)](https://man7.org/linux/man-pages/man2/link.2.html)).
This matters for any design that assumes "store and target are the same
filesystem type" is sufficient — it must be the same *mount*.

**5. `renameat2`'s `RENAME_NOREPLACE` is a Linux-only syscall extension** (no
raw glibc wrapper before glibc 2.28, syscall introduced Linux 3.15); macOS's
equivalent is `renamex_np(..., RENAME_EXCL)`, gated on the
`VOL_CAP_INT_RENAME_EXCL` volume capability
([Darwin renamex_np(2)](https://www.unix.com/man-page/mojave/2/renamex_np/)).
Windows has no single win32 call that is a drop-in `RENAME_NOREPLACE` — see
Finding 19's `link+unlink` workaround.

**6. `std::fs::hard_link` documents non-overwrite as an error uniformly**
across its platform backends (`CreateHardLink` on Windows, `linkat` with no
flags on most Unix, `link` on Android/VxWorks/Redox/older macOS) — "The
function will return an error if the `link` path already exists" is a
language-level guarantee even where the underlying platform doc is silent
([Rust std::fs::hard_link](https://doc.rust-lang.org/std/fs/fn.hard_link.html)).
This makes `std::fs::hard_link` itself a reasonable direct persist-if-absent
primitive in Rust, cross-platform, *for the "does it fail on collision"
question* — it says nothing about atomicity guarantees beyond that.

<a id="f-concurrent"></a>
### Concurrent publish of the same digest

**7. The safe interleaving is: both writers compute the digest from bytes
they hold before ever touching the canonical path.** Writer A finishes,
persists (`link`/`rename NOREPLACE`/`O_EXCL`), succeeds. Writer B finishes
later, attempts the same persist, gets `EEXIST`, and — because content is
determined purely by the digest — treats that as "already published,
nothing to do," discarding its own temp file. `cacache-rs` implements this
literally: `NamedTempFile::persist()` failing is caught, the code then just
checks `cpath.exists()` and moves on, explicitly commented "we might run
into conflicts sometimes when persisting files. This is ok. We can deal."
([cacache-rs write.rs](https://github.com/zkat/cacache-rs/blob/main/src/content/write.rs)).

**8. The still-streaming case is handled by scope, not by locking.** Because
the canonical digest-named path is only created by the *final* persist step
(temp file elsewhere → verify → persist), a third process (an installer
trying to `link()` the blob into an install tree) that finds the canonical
path absent must interpret that as "not yet published" and either wait/poll
or trigger its own fetch — never assume presence implies completeness, and
never assume absence implies corruption. This is the same contract as the
project's already-established unix durable-write rule (temp-in-target-parent
→ fsync → rename → fsync-parent) applied to the *store* side rather than the
*install* side.

**9. Trust boundary caveat, not covered by any source fetched here:** the
"EEXIST from a second writer means it's fine" logic is only correct if the
digest function is collision-resistant *and* nothing has tampered with the
existing blob between the winner's write and the loser's check. None of
cacache-rs, pnpm, or Nix's fetched docs describe re-verifying the *existing*
file's hash against the *new* writer's computed hash before treating EEXIST
as success — they trust the addressing scheme. A store that wants defense
against store corruption/tampering (not just benign races) would need to add
that comparison explicitly; this is a gap in all the surveyed
implementations' public documentation, not something any of them promise.

<a id="f-gc"></a>
### Reference counting and garbage collection

**10. Filesystem link count (`st_nlink`) is not a usable liveness signal on
its own**, because it counts *all* directory entries across *every*
consumer, including ones the store's own bookkeeping doesn't necessarily
know about (an install tree that was deleted by `rm -rf` outside the
package manager's control still decremented the kernel's nlink correctly,
but a store that deleted its own bookkeeping entry without the OS-level link
actually being removed yet — e.g., mid-uninstall — would see a stale nlink).
Every mark-and-sweep implementation surveyed computes liveness by *scanning
what refers to what* (refs/manifests/lockfiles), not by trusting nlink as
the source of truth:
- ostree: reachability computed by walking refs/commits under a **shared**
  lock, deletion done under an **exclusive** lock
  ([ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c)).
- pnpm: `store prune` removes "packages that are not used by any projects on
  the system," and with the global virtual store enabled, does "mark-and-sweep
  garbage collection" on the links directory to track active project usage
  ([pnpm store CLI](https://pnpm.io/cli/store)).

**11. GC-vs-install race is solved by lock escalation, not by a global lock
held for the whole GC.** ostree's `ostree_repo_prune()` takes
`OSTREE_REPO_LOCK_EXCLUSIVE`; `traverse_reachable_internal()` (the
reachability computation) uses `OSTREE_REPO_LOCK_SHARED` instead — meaning
readers/installers proceeding concurrently under shared locks are fine, but
the exclusive-locked deletion phase is what actually removes bytes, keeping
the expensive/slow reachability walk from blocking installs and keeping the
cheap/fast deletion phase from racing a fresh install that just grabbed a
shared lock and is about to reference something GC thinks is dead
([ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c)).
The fetched source did not reveal what specifically prevents "install
acquires shared lock and links a *brand new* object after reachability was
computed but before the exclusive lock is taken" — this needs verification
against the full source before treating it as airtight; the visible pattern
only proves deletion itself is serialized against other lock holders, not
that the reachability snapshot can't go stale in that exact window.

**12. Nix's `nix-store --optimise` dedups files that are already independently
present, using NAR-serialized identity (same contents *and* same executable
bit) rather than a refcount file** — it is not a GC mechanism at all, it's a
post-hoc disk-space optimizer that runs *after* both files independently
exist and turns two inodes into one via hardlinking. The fetched manual page
does not document locking or staging-directory (`.links`) mechanics for this
specific command — flagged as a documentation gap, not confirmed absent
([nix-store --optimise](https://nix.dev/manual/nix/stable/command-ref/nix-store/optimise)).

<a id="f-verify"></a>
### Verification

**13. On write: mandatory in every implementation surveyed that documents
it.** cacache-rs computes and checks the SRI hash and byte count before
`commit()`/`persist()` — a size mismatch is a hard `SizeMismatch` error, a
hash mismatch fails the integrity check
([cacache-rs put.rs](https://github.com/zkat/cacache-rs/blob/main/src/put.rs)).
This is the only point where verification is close to free: you already have
the bytes in memory/in the temp file.

**14. On link: not verified by any surveyed implementation**, and
structurally shouldn't be — a hardlink touches zero bytes of the target, so
re-verifying on every link would mean re-reading and re-hashing the entire
blob on every single install, destroying the whole performance point of
hardlinking. No source fetched contradicts this; it is consistent across
pnpm, Nix, ostree, and cacache-rs's designs.

**15. On read: mixed, and mostly opt-in.** pnpm ships `pnpm store status`
as a *separate, explicitly-invoked* command that "checks for modified
packages in the store" and exits nonzero if a package's on-disk content no
longer matches what was recorded at unpack time — this only exists because
it is *not* run implicitly on every read
([pnpm store CLI](https://pnpm.io/cli/store)). cacache-rs's crate
description claims "consistency guarantees on read and write (full data
verification)," suggesting its default `get` path *does* re-verify — the
two designs disagree, and neither claim was checked against the other's
actual read-path source in this pass. **Do not assume "verify on read" is
free or universal — confirm per-implementation.**

<a id="f-perms"></a>
### Permissions and immutability

**16. Read-only store blobs are the primary defense against in-place
mutation corrupting every hardlinked consumer at once** (see Finding 1). A
read-only file makes an editor's "open, truncate, write" sequence fail with
`EACCES`/`EPERM` up front instead of corrupting shared bytes silently.
Nix's store-object model documents immutability as an invariant of the
*abstract model* ("once created, they do not change") but the fetched manual
page did not tie this to a specific POSIX mode bit (444/555) — the common
claim that Nix literally chmods store paths to 444 is treated here as
**observed/folklore, not confirmed against the fetched primary source**
([nix.dev store-object](https://nix.dev/manual/nix/stable/store/store-object)).

**17. Windows hardlinks propagate attribute changes but not directory-entry
metadata visibility uniformly**: "changes to that file's attributes
propagate to all the hard links… [but] the directory entry size and
attribute information of the file are visibly updated only at the link
through which the change was made" — meaning `dir`/Explorer can show stale
size/attribute info for a hardlink until it's the one opened, even though
the underlying data is genuinely shared and current
([Hard Links and Junctions](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions)).
This is a real footgun for any code that trusts cached directory-listing
metadata (size, read-only flag) about a hardlinked install-tree file without
opening it.

**18. Windows hard links cap at 1023 per file via `CreateHardLinkW`** — a
digest that becomes extremely popular (linked into 1024+ install trees on
one machine) will start failing hardlink creation and must fall back to copy;
this is a documented hard limit, not a performance cliff
([CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw)).

<a id="f-cow"></a>
### Copy-on-write alternatives

**19. `clonefile(2)` refuses to overwrite an existing destination — `EEXIST`
— matching the persist-if-absent contract, and is atomic ("either all new
objects are created successfully or none are created at all")**
([Apple clonefile(2)](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/man/man2/clonefile.2)).
Filesystem support must be checked at runtime via `getattrlist(2)`'s
`VOL_CAP_INT_CLONE` — APFS supports it, HFS+ does not.

**20. Linux `FICLONE`/reflink gives copy-on-write "the filesystem guarantees
writes to a shared region remain private to the file being written" —
concurrent-safe by construction, no explicit locking needed on the caller's
side.** Confirmed filesystem support in the fetched page: btrfs (originally
`BTRFS_IOC_CLONE`, Linux 4.5+ generic `FICLONE`), XFS (with the caveat that
overlapping reflink ranges *within the same file* aren't supported — this is
about self-overlap, not cross-file reflink). `EOPNOTSUPP` if the filesystem
or inode type doesn't support it; `EXDEV` across filesystems
([ioctl_ficlone(2)](https://man7.org/linux/man-pages/man2/ioctl_ficlone.2.html)).

**21. Windows ReFS block cloning (`FSCTL_DUPLICATE_EXTENTS_TO_FILE`) has
real structural constraints beyond "same volume"**: source/destination
regions must be cluster-aligned, the cloned region must be under 4 GB, at
most 8175 file regions may map to the same physical region, both files must
have matching Integrity Streams settings, sparse-ness must match, and it
breaks Level 2 (shared) opportunistic locks. It requires ReFS formatted with
Windows Server 2016+ and, since Windows 11 24H2/Server 2025, participates in
native copy operations automatically
([Block cloning on ReFS](https://learn.microsoft.com/en-us/windows-server/storage/refs/block-cloning),
[FSCTL_DUPLICATE_EXTENTS_TO_FILE](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ni-winioctl-fsctl_duplicate_extents_to_file)).
This is meaningfully narrower and fussier than Linux reflink or macOS
clonefile — treat "we'll just reflink on Windows" as false for anything
except ReFS volumes meeting all of the above.

<a id="f-crossfs"></a>
### Cross-filesystem

**22. The fallback ladder — reflink, then hardlink, then copy — is implicit
in every implementation's docs that discuss it, and explicit in uv's**: "It
is important for performance for the cache directory to be located on the
same file system as the Python environment… Otherwise, uv will not be able
to link files from the cache into the environment and will instead need to
fallback to slow copy operations"
([uv cache docs](https://docs.astral.sh/uv/concepts/cache/)). uv's fetched
docs do not explicitly distinguish "reflink attempted before hardlink" —
this granularity is not confirmed for uv specifically, only the overall
link-or-copy fallback.

<a id="f-real"></a>
### Real implementations surveyed

**23. pnpm**: content-addressable global store, files hardlinked into each
project's `node_modules`; partial updates add only the changed files to the
store rather than duplicating whole packages; `pnpm store status` is an
explicit offline integrity check against unpack-time state; `pnpm store
prune` does mark-and-sweep GC, including over the virtual-store links
directory when global virtual stores are enabled
([pnpm motivation](https://pnpm.io/motivation), [pnpm store CLI](https://pnpm.io/cli/store)).

**24. Nix**: store objects are immutable by model invariant; `nix-store
--optimise` is a separate, non-default, opt-in dedup pass using
hardlinking, keyed on NAR-serialized content+exec-bit identity, not run
automatically and not part of GC
([nix.dev store-object](https://nix.dev/manual/nix/stable/store/store-object),
[nix-store --optimise](https://nix.dev/manual/nix/stable/command-ref/nix-store/optimise)).

**25. ostree**: explicitly designed as "the source of a 'hardlink farm',
where each operating system checkout is merely links into it"; content
addressed by SHA-256; GC (`ostree prune`) is reachability-from-refs with
shared/exclusive lock escalation as described in Findings 10–11
([ostree repo format](https://ostreedev.github.io/ostree/repo/),
[ostree prune](https://ostreedev.github.io/ostree/man/ostree-prune.html),
[ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c)).

**26. cacache-rs (Rust crate, used by tools in the npm/JS-adjacent
ecosystem, e.g. orogene)**: temp file created via `NamedTempFile::new_in()`
inside a `tmp/` subdirectory of the cache root; hash and size verified
before `persist()`; `persist()` targets a digest-derived `content_path`;
persist failures are treated as benign once the destination is confirmed to
exist (Finding 7); explicit `link_to` (symlink) mode also exists as an
alternative to copying content into the cache; garbage collection is a bulk
`cacache::rm::all`, not incremental mark-and-sweep, in the parts of the API
surface fetched
([cacache-rs](https://github.com/zkat/cacache-rs),
[put.rs](https://github.com/zkat/cacache-rs/blob/main/src/put.rs),
[content/write.rs](https://github.com/zkat/cacache-rs/blob/main/src/content/write.rs)).

**27. uv**: cache design documented per-dependency-type (registry/HTTP
caching headers, git commit hash, local mtime, flat-index immutability) more
than as a single unified CAS; the one hard architectural fact confirmed is
the same-filesystem requirement for linking with copy as the fallback
([uv cache docs](https://docs.astral.sh/uv/concepts/cache/)). uv's docs do
not describe content-addressing by hash for the on-disk cache layout in the
material fetched here — do not over-claim uv as a byte-identical hardlink
CAS without further digging into its source.

**28. Bazel disk cache**: documented as a *remote-cache-shaped* local
directory (`--disk_cache=`), with automatic GC added in Bazel 7.4
(`--experimental_disk_cache_gc_max_size`/`_max_age`, idle-triggered). The
fetched docs explicitly do not cover content-addressing internals, blob
verification, hardlinking, or concurrency safety for the disk cache — a
confirmed documentation gap, not a design absence
([Bazel remote caching](https://bazel.build/remote/caching)).

**29. cargo**: no source fetched in this pass documents cargo's registry
cache as a hardlink-based CAS. GitHub code search for `hard_link` in
`rust-lang/cargo` required authentication and returned no results in this
pass. **Do not cite cargo as a worked hardlink-CAS example** without
dedicated follow-up research directly against the cargo source tree.

## Normative guidance candidates

1. **Never write into a CAS blob's canonical path with replace semantics.**
   Always use a persist-if-absent primitive (`link` + `unlink` the temp name,
   `renameat2(RENAME_NOREPLACE)`, `open(O_CREAT|O_EXCL)`, or
   `CreateHardLinkW` + `DeleteFile` the temp name). *Rationale: replace
   semantics either torn-write every hardlinked consumer at once (in-place
   mutate) or silently detach the store's bookkeeping from what's actually
   linked elsewhere (replace-by-rename) — see Finding 1.*
   **VERIFICATION**: grep the store-write code path for any `rename()`/`open()`
   call targeting a digest-named path that is not preceded by an existence
   check or does not use a NOREPLACE/EXCL flag; each such call is a bug.

2. **Treat `EEXIST` / `ERROR_ALREADY_EXISTS` on a CAS persist call as success,
   not failure — discard the loser's temp file and move on.** *Rationale:
   under content addressing, the destination already existing means someone
   else already published byte-identical content — see Finding 7.*
   **VERIFICATION**: unit test that spawns two writers racing to persist the
   same digest and asserts both return success (or one success + one
   handled-EEXIST) with no leaked temp files afterward.

3. **A CAS blob's canonical path must not exist until its content is fully
   written and (at minimum) size-verified.** Write to a private temp file
   first; persist only after the write completes. *Rationale: this is what
   makes "path exists" mean "content is ready" for every other reader/linker
   — without it, a linker or installer can observe a partially-written blob
   — see Finding 8.*
   **VERIFICATION**: kill the writer process mid-write in a test and assert
   the canonical digest path never appears (no orphaned partial file at the
   final name).

4. **On Windows, place the temp file in the same directory as the canonical
   blob path before hardlinking it in, since `CreateHardLinkW` requires the
   same volume.** *Rationale: cross-volume hardlink attempts fail outright;
   staging in a different temp root (e.g., `%TEMP%`) breaks this — see
   Finding 4 (POSIX EXDEV) and the CreateHardLinkW same-volume requirement.*
   **VERIFICATION**: integration test with the store on a non-system-drive
   volume; assert publish still succeeds without falling back to copy.

5. **Do not assume `CreateHardLinkW`'s exact error code for an existing
   destination without testing it directly on the target Windows/filesystem
   combination the project ships on.** *Rationale: Microsoft's own reference
   page is silent on this — Finding 2 — so any retry/loser logic keyed on a
   specific `GetLastError()` value is inferring undocumented behavior.*
   **VERIFICATION**: a small standalone test binary that calls
   `CreateHardLinkW` against an existing destination on CI's actual Windows
   runner and asserts + logs the observed `GetLastError()`; re-run whenever
   the CI Windows image changes.

6. **Mark store blobs read-only immediately after persist, on every
   platform.** *Rationale: this is the only thing that turns "someone edited
   an installed, hardlinked file in place" from silent shared corruption
   into an immediate, loud `EACCES`/`EPERM` — see Findings 1 and 16.*
   **VERIFICATION**: after a normal install, attempt to open an installed
   (hardlinked) file for writing without going through the package manager;
   assert it fails.

7. **Do GC in two phases with lock escalation: compute reachability under a
   shared/read lock, delete only under an exclusive lock, and re-check
   liveness for anything newly referenced between the two phases before
   deleting it.** *Rationale: this is the ostree pattern (Findings 10–11);
   the fetched source did not confirm the re-check step exists in ostree
   itself, so this project should implement it explicitly rather than assume
   the pattern is airtight as-is.*
   **VERIFICATION**: race test — start a GC's reachability scan, then start
   an install of a *new* object concurrently, then let GC's delete phase
   run; assert the newly-installed object survives.

8. **GC liveness must be computed by scanning what actually references a
   blob (lockfiles/manifests/install-tree state), never by trusting
   filesystem link count alone.** *Rationale: nlink can be stale relative to
   the package manager's own bookkeeping in ways that don't correspond to
   "still needed" — see Finding 10.*
   **VERIFICATION**: test that uninstalling one of two projects sharing a
   digest, then running GC, leaves the digest intact (still referenced by
   the second project) even though nlink dropped.

9. **Re-verify a blob's digest on write (mandatory); never on link (pointless
   — zero bytes touched); treat on-read verification as an explicit, opt-in
   operation, not an implicit default, unless a specific corruption threat
   model requires otherwise.** *Rationale: Findings 13–15 — this is the
   consistent shape of every implementation surveyed that documents its
   verification points, and matches the performance rationale for
   hardlinking in the first place.*
   **VERIFICATION**: benchmark a full install with and without a
   hypothetical "verify on every link" flag; the delta should be large
   enough to prove why no surveyed implementation does it by default.

10. **On filesystems/volumes where reflink or clonefile is available (btrfs,
    XFS-with-reflink, OCFS2 on Linux; APFS on macOS), prefer it over
    hardlink for the install-tree side of publish**, keeping the CAS store
    blob itself as the source. *Rationale: CoW clones make the "user edits
    the installed file" hazard structurally impossible rather than merely
    permission-denied — see Findings 14, 19–21 — at the cost of narrower
    filesystem support than hardlinks.*
    **VERIFICATION**: on a btrfs test volume, install a package, edit the
    installed (reflinked) copy, and assert the CAS store's original blob is
    byte-identical to what it was before the edit.

11. **Implement the fallback ladder explicitly and in this order: reflink/
    clonefile attempt → hardlink attempt → full copy**, catching
    `EOPNOTSUPP`/`ENOTSUP`/`EXDEV`/platform-equivalent at each stage rather
    than pre-detecting filesystem type. *Rationale: this is what every
    surveyed implementation that documents fallback does, and matches uv's
    explicit statement of the consequence of skipping it (Finding 22).*
    **VERIFICATION**: test matrix across same-fs, different-fs-same-device-
    class, and different-device installs; assert the ladder produces correct
    content in all three without ever silently no-op'ing.

## AI-agent angle

An AI agent operating "fix a bug in this installed package" or "edit this
dependency's file" without understanding hardlink identity is the exact
failure mode this research subarea exists to prevent: opening an installed
file under `node_modules/`, `site-packages/`, or an install tree in general
and editing it in place (rather than through the package manager) will, if
that file is a read-write hardlink into the CAS store, silently corrupt
**every other project on the machine that shares that digest** — not just
the one the agent was asked to fix. This is worse than a normal "edited a
vendored file" mistake because the blast radius is invisible from the
directory the agent is looking at: nothing about the file path indicates it
is shared.

Concretely, this project's tooling should:
- Make store blobs read-only (Normative rule 6) specifically so an agent's
  well-intentioned `Edit`/`Write` tool call fails loudly with a permissions
  error instead of corrupting the store, and should surface that failure
  with a message that says *why* ("this file is a shared, immutable package
  store entry — modify the source package or use a local override
  mechanism instead"), not a bare `EACCES`.
- Never present an agent with a code path that does `open(O_TRUNC)` or
  in-place edit against anything under the store or install tree without
  going through the package manager's own publish primitive — an agent
  asked to "fix the durable-write helper" should not be able to introduce a
  replace-semantics write into the CAS path without that being caught by
  the persist-if-absent invariant tests in Normative rules 1–3.
- Treat `EEXIST` from a persist call as success in agent-facing error
  handling too — an agent that sees a raw `AlreadyExists` error from a
  publish step and "fixes" it by adding `--force`/overwrite logic would be
  reintroducing exactly the replace-semantics bug this document exists to
  rule out (Normative rule 2). Any agent-facing error message for this case
  should say "already published, this is expected under concurrency," not
  present it as an error to route around.

## Contested / evolving

- **Whether Windows has a true single-syscall `RENAME_NOREPLACE` equivalent
  at all is unresolved in this research pass.** Some Windows versions
  support `FILE_RENAME_FLAG_POSIX_SEMANTICS` via `SetFileInformationByHandle`
  with `FILE_RENAME_INFO_EX` on newer NTFS, but this was not confirmed
  against a primary Microsoft Learn source in this pass — do not build on it
  without dedicated verification. The `CreateHardLinkW` + `DeleteFile`
  workaround (Finding 19) is the only primitive confirmed here to give
  Windows persist-if-absent semantics.
- **Whether Nix literally sets POSIX mode 444 on store objects** is treated
  here as unconfirmed against the specific manual page fetched (Finding 18)
  — it is extremely widely repeated as fact in the Nix community, but this
  research pass could only confirm the abstract "immutable" model claim, not
  the filesystem-level mechanism.
- **Whether cacache-rs's default read path re-verifies hashes on every
  `get`** is unresolved — the crate's top-level description claims "full
  data verification" on read and write, but the specific read-path source
  file was not fetched in this pass to confirm whether that's the default or
  an opt-in variant (Finding 15).
- **ostree's reachability-then-delete lock escalation** was confirmed at the
  API-call level (Finding 11), but whether it fully closes the "newly
  installed object goes unreferenced because it was linked after the
  reachability snapshot but before the exclusive lock" race was not
  confirmed from the fetched source excerpt — this project should not copy
  the pattern assuming it's proven airtight; verify against the full
  `traverse_reachable_internal` → `prune` call sequence, or design in an
  explicit re-check step regardless (Normative rule 7).
- **Cargo's registry cache internals** were not successfully investigated in
  this pass (GitHub code search required auth, direct file-path guesses
  404'd) — this project's own earlier research on cargo, if any, should be
  treated as more authoritative than this document for cargo specifics.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [man7 link(2)](https://man7.org/linux/man-pages/man2/link.2.html) | Linux man-pages primary reference | current (man-pages project) | States EEXIST-on-existing-destination and EXDEV cross-mount restriction verbatim — the core persist-if-absent guarantee. |
| [man7 rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html) | Linux man-pages primary reference | current | Documents `renameat2`/`RENAME_NOREPLACE` per-filesystem kernel-version support matrix and NFS non-support. |
| [man7 open(2)](https://man7.org/linux/man-pages/man2/open.2.html) | Linux man-pages primary reference | current | `O_EXCL` semantics, NFS caveat, and the man page's own recommendation to use `link()` instead for portability. |
| [man7 ioctl_ficlone(2)](https://man7.org/linux/man-pages/man2/ioctl_ficlone.2.html) | Linux man-pages primary reference | current | `FICLONE`/`FICLONERANGE` reflink semantics, CoW guarantee, error codes, partial filesystem support list. |
| [Microsoft Learn: CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw) | Official Win32 API reference | updated 2025-07-01 | Primary source for Windows hardlink limits (1023/file), NTFS-only + no-ReFS support table, and the documented-gap on existing-destination behavior. |
| [Microsoft Learn: Hard Links and Junctions](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions) | Official Win32 conceptual doc | updated 2025-07-08 | Same-volume restriction, attribute-propagation vs directory-entry-visibility distinction, deletion-order independence. |
| [Microsoft Learn: FSCTL_DUPLICATE_EXTENTS_TO_FILE](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ni-winioctl-fsctl_duplicate_extents_to_file) | Official Win32 IOCTL reference | updated 2024-02-22 | The actual API behind ReFS block cloning; SMB/CsvFS/ReFS support table. |
| [Microsoft Learn: Block cloning on ReFS](https://learn.microsoft.com/en-us/windows-server/storage/refs/block-cloning) | Official Windows Server storage doc | updated 2024-09-23 | Full constraint list for ReFS block cloning (cluster alignment, 4 GB cap, 8175 region-share cap, version gating). |
| [Darwin renamex_np(2) mirror](https://www.unix.com/man-page/mojave/2/renamex_np/) | macOS/Darwin man page mirror | Mojave-era, still current API | `RENAME_EXCL` = macOS's `RENAME_NOREPLACE`, gated on `VOL_CAP_INT_RENAME_EXCL`. |
| [Apple clonefile(2) source (xnu)](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/man/man2/clonefile.2) | Apple open-source XNU man page | current apple-oss-distributions | Primary source for CoW clone semantics, EEXIST-on-existing-destination, atomicity claim, `getattrlist` capability check. |
| [Rust std::fs::hard_link](https://doc.rust-lang.org/std/fs/fn.hard_link.html) | Official Rust std library docs | current stable | Cross-platform contract (errors on existing destination) and the exact platform syscall each backend uses. |
| [nix.dev: store object](https://nix.dev/manual/nix/stable/store/store-object) | Official Nix manual (current home, redirected from nixos.org) | current | States the immutability invariant of Nix store objects at the model level. |
| [nix.dev: nix-store --optimise](https://nix.dev/manual/nix/stable/command-ref/nix-store/optimise) | Official Nix manual | current | Confirms hardlink-based dedup keyed on NAR-serialized content+exec-bit identity; documents the reported 25-35% savings figure. |
| [ostree: repository format](https://ostreedev.github.io/ostree/repo/) | Official ostree docs | current | Explicit "hardlink farm" design statement, content object model, SHA-256 addressing. |
| [ostree: ostree prune](https://ostreedev.github.io/ostree/man/ostree-prune.html) | Official ostree man page | current | `--refs-only`, `--depth`, reachability-based GC description. |
| [ostree-repo-prune.c](https://github.com/ostreedev/ostree/blob/main/src/libostree/ostree-repo-prune.c) | Primary implementation source | current main branch | Ground truth for the shared→exclusive lock escalation pattern between reachability computation and deletion. |
| [pnpm: motivation](https://pnpm.io/motivation) | Official pnpm docs | current | Hardlink-from-global-store design rationale, partial-update disk savings claim. |
| [pnpm: store CLI](https://pnpm.io/cli/store) | Official pnpm CLI reference | current | `store status` (integrity check) and `store prune` (mark-and-sweep GC) documented as explicit, opt-in operations. |
| [uv: cache concepts](https://docs.astral.sh/uv/concepts/cache/) | Official uv (Astral) docs | current | Explicit statement of the same-filesystem requirement for linking and the copy fallback consequence. |
| [Bazel: remote caching](https://bazel.build/remote/caching) | Official Bazel docs | current | Disk-cache config flags and GC flags (7.4+); explicit doc gap on CAS internals, verification, and hardlinking for the local disk cache. |
| [cacache-rs (GitHub)](https://github.com/zkat/cacache-rs) | Rust crate, primary source repo | current | Real Rust CAS crate; feature list (atomic writes, multi-hash, lockless concurrency, SRI support). |
| [cacache-rs: src/put.rs](https://github.com/zkat/cacache-rs/blob/main/src/put.rs) | Primary implementation source | current main branch | Shows size/hash verification gating `commit()` — the on-write verification point. |
| [cacache-rs: src/content/write.rs](https://github.com/zkat/cacache-rs/blob/main/src/content/write.rs) | Primary implementation source | current main branch | Shows the actual temp-file → verify → `persist()` flow and the EEXIST-is-fine handling for racing writers — the concrete worked example of Findings 7-9. |
