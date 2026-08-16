---
title: Windows Atomic Replace and Crash Durability
topic: rust-platform-and-portability
agent: windows-durability-and-atomic-replace
model: sonnet
date_researched: 2026-08
sources_count: 17
scope: >
  What Windows actually documents (and does not document) about durable, crash-safe
  file replacement for a Rust CLI that publishes installs by rename and self-updates
  its own running executable: MoveFileExW + MOVEFILE_REPLACE_EXISTING/WRITE_THROUGH,
  ReplaceFileW and its per-error-code partial-failure states, SetFileInformationByHandle
  with FileRenameInfo/FileRenameInfoEx and POSIX-semantics rename, FlushFileBuffers on
  file vs. directory handles, NTFS vs. ReFS metadata journaling, the ERROR_SHARING_VIOLATION
  / ERROR_ACCESS_DENIED reality from antivirus and open handles, replacing a running
  executable (rename-aside, MOVEFILE_DELAY_UNTIL_REBOOT), and what tempfile, fs-err,
  atomicwrites, atomic-write-file, rustup, and self-replace actually implement on
  Windows (read from their source, not inferred). Distinguishes documented guarantee
  from observed behaviour from folklore throughout; states explicitly where Microsoft's
  documentation is silent rather than assuming a guarantee it does not make.
---

## Table of contents

1. [MoveFileExW: MOVEFILE_REPLACE_EXISTING and MOVEFILE_WRITE_THROUGH](#1-movefileexw-movefile_replace_existing-and-movefile_write_through)
2. [ReplaceFileW: what it adds, and its documented partial-failure states](#2-replacefilew-what-it-adds-and-its-documented-partial-failure-states)
3. [SetFileInformationByHandle, FileRenameInfoEx, and POSIX-semantics rename](#3-setfileinformationbyhandle-filerenameinfoex-and-posix-semantics-rename)
4. [FlushFileBuffers: file handles vs. the directory-handle gap](#4-flushfilebuffers-file-handles-vs-the-directory-handle-gap)
5. [NTFS vs. ReFS: what the journal protects and what it doesn't](#5-ntfs-vs-refs-what-the-journal-protects-and-what-it-doesnt)
6. [The sharing-violation reality: AV, indexers, and why delete isn't immediate](#6-the-sharing-violation-reality-av-indexers-and-why-delete-isnt-immediate)
7. [Replacing a running executable: rename-aside and real implementations](#7-replacing-a-running-executable-rename-aside-and-real-implementations)
8. [What Rust crates actually do on Windows](#8-what-rust-crates-actually-do-on-windows)
9. [Normative guidance candidates](#normative-guidance-candidates)
10. [AI-agent angle](#ai-agent-angle)
11. [Contested / evolving](#contested--evolving)
12. [Sources](#sources)

## Summary

1. `MoveFileExW`'s own documentation never uses the word "atomic." `MOVEFILE_REPLACE_EXISTING` is documented only as "replaces its contents... provided that security requirements regarding ACLs are met" — no statement about concurrent readers, no statement about power loss.
2. `MOVEFILE_WRITE_THROUGH`'s documented guarantee is scoped to "a move performed as a copy and delete operation" — i.e. the cross-volume fallback path. Microsoft's own text never states it does anything for a same-volume, metadata-only NTFS rename, which is the common case for a package-manager publish. Treat this as an open gap, not a guarantee.
3. `ReplaceFileW` documents three specific partial-failure error codes with the exact post-failure filesystem state for each — and one of them (`ERROR_UNABLE_TO_MOVE_REPLACEMENT`, 1176) can leave the **target path with no file at all** if `lpBackupFileName` is `NULL`. Always pass a backup path.
4. `REPLACEFILE_WRITE_THROUGH` is documented as "This value is not supported." `ReplaceFileW` has no flush/durability knob whatsoever.
5. `SetFileInformationByHandle` with `FileRenameInfoEx` (class 21) and the `FILE_RENAME_FLAG_POSIX_SEMANTICS` flag (value `2`) requires Windows 10 version 1607 (RS1) or later, and per-filesystem-driver support — FAT32 is a documented exception. Unsupported combinations fail with `ERROR_NOT_SUPPORTED` or `ERROR_INVALID_PARAMETER`.
6. Rust's own `std::fs::rename` on Windows calls `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` as the **primary** path, and only falls back to `SetFileInformationByHandle(FileRenameInfoEx, …)` when that call fails with `ERROR_ACCESS_DENIED` — specifically to handle read-only-attribute files, not for durability. It never sets `MOVEFILE_WRITE_THROUGH`.
7. `FlushFileBuffers`'s documentation describes exactly two scopes: a single file handle, and (with admin privileges) an entire volume handle. It says nothing about directory handles at all. There is no confirmed Windows analogue to "fsync the parent directory" — the gap is real, not an oversight in this research.
8. NTFS's own overview page documents a "transaction-based log file" that "restore[s] file system consistency" after a crash by "replaying its transaction log" — this is Microsoft's own wording, and it is scoped to filesystem *consistency*, not to arbitrary file *data*. A rename can be crash-durable via this log while the renamed file's just-written data, sitting in the buffered write cache, is not.
9. ReFS's official overview makes no equivalent journaling/crash-recovery claim; its headline resiliency features (integrity streams, Storage Spaces repair) are about *detecting and repairing* corruption after the fact, a different property from "was this rename durable across an immediate power loss." Treat ReFS's same-volume-rename crash-consistency as **undocumented**, not as "at least as good as NTFS."
10. `ERROR_SHARING_VIOLATION` (32) and `ERROR_ACCESS_DENIED` (5) are the two codes SQLite's own Windows I/O layer retries by default, with a documented rationale: "probably caused by antivirus software." SQLite retries up to 10 times with linearly increasing 25 ms steps (~1.4 s total).
11. `CreateFileW`'s own documentation states that opening a file pending deletion (from a prior `DeleteFileW`) fails with `ERROR_ACCESS_DENIED` — not the more specific `ERROR_DELETE_PENDING` (303) that also exists in `WinError.h`. A retry predicate that only special-cases 303 will miss the code Microsoft actually documents for this case.
12. `FILE_SHARE_DELETE` in `CreateFileW`'s `dwShareMode` "allows both delete and rename operations" for other openers. A handle opened without it blocks every other process's attempt to rename or delete that file — including a self-updater's own attempt to replace the running executable.
13. Windows will not let you delete or overwrite a running executable's own file in place, but it will let you **rename** it aside on the same volume, because the OS loader opens the running image with `FILE_SHARE_DELETE`. This one fact is the entire basis for the "rename-aside" self-update pattern used by rustup and the `self-replace` crate.
14. `MOVEFILE_DELAY_UNTIL_REBOOT` defers the actual move to next boot via the `PendingFileRenameOperations` registry value, and its return value reflects only whether that registry entry was written — not whether the move will ultimately succeed. No self-updater examined here uses it for the primary update path; it exists for cleanup of files that genuinely cannot be touched while running (older uninstall scenarios).
15. rustup's actual self-replace mechanism is **not** an atomic rename: `install_bins()` explicitly `remove_file`s the old `rustup.exe` then `copy`s the new one in, with the comment "Even on Linux we can't just copy the new binary over the (running) old binary; we must unlink it first." Safety comes from `wait_for_parent()` blocking until the old process has fully exited first — process-lifecycle serialization, not filesystem atomicity.
16. Of the Windows-facing Rust crates read for this report, **none** call `ReplaceFileW`, and only Rust's own `std::fs::rename` calls `FileRenameInfoEx`/POSIX-semantics rename (and only as an access-denied fallback). `tempfile`, `atomicwrites`, and `self-replace` all use plain `MoveFileExW`.
17. `atomicwrites` (untitaker/rust-atomicwrites) is the one crate examined that sets `MOVEFILE_WRITE_THROUGH` on Windows — and it does so on **every** rename, both the replace and no-clobber paths — but it has **no Windows equivalent at all** to the parent-directory `fsync` it performs on its Unix path. The gap this report is chartered to investigate is visible directly in this crate's source.
18. `atomic-write-file` (andreacorbellini), a crate whose entire purpose is atomic file writes, has **no Windows-specific implementation** as of the version read: its `imp/mod.rs` routes Windows through the same "generic" `std::fs::rename` fallback used for any non-Unix target, with a `// TODO` comment describing the Windows-specific design (`CreateFileW` + `FILE_ATTRIBUTE_HIDDEN` + `FILE_FLAG_DELETE_ON_CLOSE` + `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`) that has not yet been built.
19. Every Windows-specific durability claim in this report is either a direct quote from Microsoft documentation, a fact read from real crate/compiler source code, or is explicitly labeled as undocumented/folklore. Where a plausible-sounding guarantee could not be traced to a primary source, this report says so rather than asserting it.

## Findings

### 1. MoveFileExW: MOVEFILE_REPLACE_EXISTING and MOVEFILE_WRITE_THROUGH

The [`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw) documentation defines `dwFlags` as a bitmask; the two relevant values, quoted verbatim:

> **MOVEFILE_REPLACE_EXISTING** — 1 (0x1) — If a file named *lpNewFileName* exists, the function replaces its contents with the contents of the *lpExistingFileName* file, provided that security requirements regarding access control lists (ACLs) are met. For more information, see the Remarks section of this topic. If *lpNewFileName* names an existing directory, an error is reported.
>
> **MOVEFILE_WRITE_THROUGH** — 8 (0x8) — The function does not return until the file is actually moved on the disk. Setting this value guarantees that a move performed as a copy and delete operation is flushed to disk before the function returns. The flush occurs at the end of the copy operation. This value has no effect if MOVEFILE_DELAY_UNTIL_REBOOT is set.

Two gaps to call out explicitly, because the documentation makes no statement either way:

- **Atomicity with respect to a concurrent reader.** Nothing in the `MoveFileExW` page says a reader that has the destination path open, or that opens it mid-operation, will observe either the fully-old or fully-new file and never a torn/partial state. NTFS implements a same-volume rename as a directory-index (B-tree) update rather than a data copy, which is *why* practitioners generally treat it as effectively atomic to readers — but this is inference from filesystem architecture, not a documented Win32 contract. Treat it as **observed behavior**, not a **documented guarantee**.
- **Atomicity with respect to power loss.** Not addressed at all. The doc describes `MOVEFILE_WRITE_THROUGH`'s flush guarantee as applying to "a move performed as a copy and delete operation" — explicitly the fallback path used when `MOVEFILE_COPY_ALLOWED` triggers a cross-volume copy, or implicitly any other case where the OS internally implements the move as copy+delete. It does **not** say this flag forces a flush for the ordinary case: a same-volume `MOVEFILE_REPLACE_EXISTING` rename that NTFS executes as a pure metadata operation. Whether setting `MOVEFILE_WRITE_THROUGH` does anything at all in that case is undocumented.

A related but distinct data point, from [`CreateFileW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)'s Caching Behavior remarks (not about `MoveFileExW` — about the `FILE_FLAG_WRITE_THROUGH` flag on a file *handle*):

> A write-through request via **FILE_FLAG_WRITE_THROUGH** also causes NTFS to flush any metadata changes, such as a time stamp update or a rename operation, that result from processing the request.

This confirms NTFS *can* flush a rename's metadata as part of a write-through request — but it is documented for `FILE_FLAG_WRITE_THROUGH` on a `CreateFile` handle performing I/O, not for `MOVEFILE_WRITE_THROUGH` on a bare `MoveFileExW` call with no associated write. Do not conflate the two; Microsoft never states they behave identically.

### 2. ReplaceFileW: what it adds, and its documented partial-failure states

[`ReplaceFileW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) exists to do more than `MoveFileExW`: it preserves attributes of the replaced file that a plain rename would not carry over —

> **ReplaceFile** not only copies the new file data, but also preserves the following attributes of the original file: Creation time · Short file name · Object identifier · DACLs · Security resource attributes · Encryption · Compression · Named streams not already in the replacement file.
>
> The backup file, replaced file, and replacement file must all reside on the same volume.

`REPLACEFILE_WRITE_THROUGH` (0x1) is documented, verbatim, as: **"This value is not supported."** `ReplaceFileW` has no durability/flush option at all, despite the flag existing in the enum.

The failure modes are individually documented with the exact post-failure filesystem state — unusually thorough for a Win32 API, and directly answers what the calling code must assume happened:

| Code | Value | Documented state after failure |
|---|---|---|
| `ERROR_UNABLE_TO_MOVE_REPLACEMENT` | 1176 (0x498) | "The replacement file could not be renamed. If *lpBackupFileName* was specified, the replaced and replacement files retain their original file names. **Otherwise, the replaced file no longer exists and the replacement file exists under its original name.**" |
| `ERROR_UNABLE_TO_MOVE_REPLACEMENT_2` | 1177 (0x499) | "The replacement file could not be moved. The replacement file still exists under its original name; however, it has inherited the file streams and attributes from the file it is replacing. The file to be replaced still exists with a different name. If *lpBackupFileName* is specified, it will be the name of the replaced file." |
| `ERROR_UNABLE_TO_REMOVE_REPLACED` | 1175 (0x497) | "The replaced file could not be deleted. The replaced and replacement files retain their original file names." |
| any other error (e.g. `ERROR_INVALID_PARAMETER`) | — | "the replaced and replacement files will retain their original file names. In this scenario, a backup file does not exist and it is not guaranteed that the replacement file will have inherited all of the attributes and streams of the replaced file." |

The `ERROR_UNABLE_TO_MOVE_REPLACEMENT` row is the important one: read literally, with `lpBackupFileName == NULL`, this failure mode deletes the original file and leaves the replacement sitting under **its own temporary name**, not under the target path. **The target path can end up with nothing at that name.** This is exactly the "worse than doing nothing" partial-failure shape this report was chartered to find. The mitigation the documentation itself implies is simple: always pass a backup path, even one you plan to delete on success, because its presence changes this specific failure's outcome from "target path empty" to "both files retain their original names" (a safe, recoverable state).

### 3. SetFileInformationByHandle, FileRenameInfoEx, and POSIX-semantics rename

[`SetFileInformationByHandle`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle) (Vista+) documents `FileRenameInfo` (class `3`) taking a [`FILE_RENAME_INFO`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_rename_info) struct. That struct's own page shows the newer shape but the Microsoft Learn page for it does not itself explain the POSIX-semantics flag or version requirements — those had to be confirmed from primary source code (below), which is exactly the kind of gap this report is asked to flag rather than paper over:

```c
typedef struct _FILE_RENAME_INFO {
  union {
    BOOLEAN ReplaceIfExists;  // used with FileInformationClass == FileRenameInfo
    DWORD   Flags;            // used with FileInformationClass == FileRenameInfoEx
  } DUMMYUNIONNAME;
  HANDLE  RootDirectory;
  DWORD   FileNameLength;
  WCHAR   FileName[1];
} FILE_RENAME_INFO, *PFILE_RENAME_INFO;
```

The exact numeric values — confirmed from Rust's `windows_sys` bindings (auto-generated from Microsoft's win32metadata, i.e. effectively primary-source-derived) at [`library/std/src/sys/pal/windows/c/windows_sys.rs`](https://github.com/rust-lang/rust/blob/master/library/std/src/sys/pal/windows/c/windows_sys.rs):

```rust
pub const FILE_RENAME_FLAG_REPLACE_IF_EXISTS: u32 = 1u32;
pub const FILE_RENAME_FLAG_POSIX_SEMANTICS: u32 = 2u32;
pub const FileRenameInfo: FILE_INFO_BY_HANDLE_CLASS = 3i32;
pub const FileRenameInfoEx: FILE_INFO_BY_HANDLE_CLASS = 21i32;
// the lower-level NT syscall (NtSetInformationFile) uses a *different* enum:
pub const FileRenameInformation: FILE_INFORMATION_CLASS = 10i32;
pub const FileRenameInformationEx: FILE_INFORMATION_CLASS = 65i32;
```

Note there are two distinct enums at two API layers for the same feature: `FILE_INFO_BY_HANDLE_CLASS` (`FileRenameInfo`=3, `FileRenameInfoEx`=21) is what `SetFileInformationByHandle` takes; `FILE_INFORMATION_CLASS` (`FileRenameInformation`=10, `FileRenameInformationEx`=65) is what the lower-level `NtSetInformationFile`/`ZwSetInformationFile` syscall takes. Don't confuse the two when reading ntifs.h-derived driver documentation against Win32 documentation.

Version and filesystem-support caveats — from Rust's own std source comment on the sibling `FILE_DISPOSITION_FLAG_POSIX_SEMANTICS` feature (added in the same OS release as rename's POSIX flag), at [`library/std/src/sys/fs/windows.rs`](https://github.com/rust-lang/rust/blob/master/library/std/src/sys/fs/windows.rs):

```rust
/// Delete using POSIX semantics.
///
/// Files will be deleted as soon as the handle is closed. This is supported
/// for Windows 10 1607 (aka RS1) and later. However some filesystem
/// drivers will not support it even then, e.g. FAT32.
///
/// If the operation is not supported for this filesystem or OS version
/// then errors will be `ERROR_NOT_SUPPORTED` or `ERROR_INVALID_PARAMETER`.
```

**What Rust std actually does with it** (`pub fn rename` in the same file): `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` is the primary and only normal-path call. It falls back to opening the source file (with `DELETE` access, `FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS`) and calling `SetFileInformationByHandle(FileRenameInfoEx, …)` with `Flags = FILE_RENAME_FLAG_REPLACE_IF_EXISTS | FILE_RENAME_FLAG_POSIX_SEMANTICS` **only when the first `MoveFileExW` call fails with `ERROR_ACCESS_DENIED`** — the comment in the source explains this is to handle renaming/replacing files that have the read-only attribute set, not for any atomicity or durability reason:

```rust
pub fn rename(old: &WCStr, new: &WCStr) -> io::Result<()> {
    if unsafe { c::MoveFileExW(old.as_ptr(), new.as_ptr(), c::MOVEFILE_REPLACE_EXISTING) } == 0 {
        let err = api::get_last_error();
        // if `MoveFileExW` fails with ERROR_ACCESS_DENIED then try to move
        // the file while ignoring the readonly attribute.
        // This is accomplished by calling `SetFileInformationByHandle` with `FileRenameInfoEx`.
        if err == WinError::ACCESS_DENIED {
            // ... opens a handle, builds a FILE_RENAME_INFO, calls
            // SetFileInformationByHandle(..., c::FileRenameInfoEx, ...)
```

So: `std::fs::rename` on Windows never sets `MOVEFILE_WRITE_THROUGH`, and only reaches the POSIX-semantics/`FileRenameInfoEx` path as an `ERROR_ACCESS_DENIED` recovery, not as its default behavior.

### 4. FlushFileBuffers: file handles vs. the directory-handle gap

[`FlushFileBuffers`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)'s documentation describes exactly two scopes, and only two:

> The file handle must have the **GENERIC_WRITE** access right... **FlushFileBuffers** writes all the buffered information for a specified file to the device or pipe.
>
> To flush all open files on a volume, call **FlushFileBuffers** with a handle to the **volume**. The caller must have administrative privileges.

There is **no mention of a directory handle anywhere on this page** — not "unsupported," not "no-op," not "supported since version X." It simply never comes up, in contrast to the explicit callouts for file handles, communications-device handles, named-pipe handles, and volume handles. [`CreateFileW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) confirms a directory handle *can* be obtained (`FILE_FLAG_BACKUP_SEMANTICS`: "You must set this flag to obtain a handle to a directory"), but neither page connects that handle to `FlushFileBuffers`, and `FlushFileBuffers` itself requires `GENERIC_WRITE` — an access right that doesn't map cleanly onto "write data to a directory" the way it does for a file.

This is stated plainly per the task's instruction rather than inferred: **Microsoft's documentation gives no confirmed Windows analogue to POSIX's "open the parent directory, `fsync` it."** A tool that calls `FlushFileBuffers` on a `FILE_FLAG_BACKUP_SEMANTICS`-opened directory handle and treats it as the Windows equivalent of a Unix directory `fsync` is relying on undocumented behavior — see [Contested / evolving](#contested--evolving) for what little practitioner signal exists.

### 5. NTFS vs. ReFS: what the journal protects and what it doesn't

Microsoft's own [NTFS overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview) states, under "Increased reliability":

> NTFS enhances reliability by maintaining a transaction-based log file and checkpoint information. If a system failure occurs, NTFS uses this log to automatically restore file system consistency during the next startup, minimizing the risk of data loss... after a system crash, NTFS can recover changes by replaying its transaction log, helping to maintain data integrity and reduce downtime.

Read this precisely: the documented guarantee is scoped to **file system consistency** and is demonstrated with the example of **recovering changes** via log replay. It does not say "your file's newly written bytes are guaranteed present." This document's position — consistent with how every log-based metadata journal (NTFS's `$LogFile`, ext3/ext4 in `data=ordered` mode, XFS's metadata journal) is understood across the industry — is that this journal protects **metadata operations** (the MFT record updates and directory-index changes that constitute a rename, a create, an attribute change) and says nothing about **file data** written through the ordinary buffered cache. That interpretation is **not** a direct Microsoft quote, and is labeled here as **widely-corroborated technical understanding, not a specific documented Microsoft statement** — Microsoft's own wording ("data integrity") is genuinely ambiguous enough that a careless reading could claim more than it supports.

The practical consequence for a rename-published file: write data with a normal buffered `WriteFile`, then call `MoveFileExW`/`ReplaceFileW` to publish it, then crash before the OS's normal cache-flush interval — the rename itself can be durably recorded by NTFS's journal (the directory now points at the new file) while the file's *content* is still sitting in the write cache and is lost or truncated on recovery. The published file exists at the target path; its bytes may not match what was written. **Flushing the file's data before the rename is not optional if the goal is "the published file's bytes survive a crash," and no documented behavior of the rename step itself covers this for you.**

[ReFS's overview](https://learn.microsoft.com/en-us/windows-server/storage/refs/refs-overview) makes **no equivalent journaling/crash-recovery claim at all**. Its documented resiliency features are:

> **Integrity-streams** - ReFS uses checksums for metadata and optionally for file data, giving ReFS the ability to reliably detect corruptions... **Salvaging data** - If a volume becomes corrupted and an alternate copy of the corrupted data doesn't exist, ReFS removes the corrupt data from the namespace.

This is a *detect-and-repair* story (checksums + Storage Spaces mirror/parity repair), which is a different property from "was a rename that returned success guaranteed present after an immediate power loss." The same overview page's feature-comparison table lists **Transactions: ❌ (unavailable on ReFS)** — meaning Transactional NTFS (TxF) has no ReFS equivalent either. Nothing in Microsoft's ReFS documentation states whether same-volume-rename crash-consistency is stronger, weaker, or equivalent to NTFS's. Treat this as **undocumented**, not as "ReFS is at least as safe as NTFS by construction."

### 6. The sharing-violation reality: AV, indexers, and why delete isn't immediate

Exact documented text from [System Error Codes (0-499)](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-):

> **ERROR_ACCESS_DENIED** — 5 (0x5) — Access is denied.
> **ERROR_SHARING_VIOLATION** — 32 (0x20) — The process cannot access the file because it is being used by another process.
> **ERROR_DELETE_PENDING** — 303 (0x12F) — The file cannot be opened because it is in the process of being deleted.

But [`CreateFileW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)'s own "Files" remarks specify a different code for the delete-pending case than the dedicated constant above:

> If you call **CreateFile** on a file that is pending deletion as a result of a previous call to **DeleteFile**, the function fails. The operating system delays file deletion until all handles to the file are closed. **GetLastError** returns **ERROR_ACCESS_DENIED**.

So a retry predicate written against `ERROR_DELETE_PENDING` (303) alone will miss the code Microsoft's own `CreateFileW` documentation says is actually returned (`ERROR_ACCESS_DENIED`, 5) for this exact scenario. Handle both.

`dwShareMode` on `CreateFileW` governs who else can touch the file while a handle is open:

> **FILE_SHARE_DELETE** — 0x00000004 — Enables subsequent open operations on a file or device to request delete access. Otherwise, no process can open the file or device if it requests delete access. If this flag is not specified, but the file or device has been opened for delete access, the function fails. **Note** Delete access allows both delete and rename operations.

This is why a file kept open without `FILE_SHARE_DELETE` blocks not just deletion but *renaming* by any other process — including a self-updater trying to replace the file that some other reader (an AV scanner, an indexer, the tool's own leftover handle) is holding open.

Real-world documented retry practice, from [SQLite's `os_win.c`](https://github.com/sqlite/sqlite/blob/master/src/os_win.c):

```c
/*
** The number of times that a ReadFile(), WriteFile(), and DeleteFile()
** will be retried following a locking error - probably caused by
** antivirus software.  Also the initial delay before the first retry.
** The delay increases linearly with each retry.
*/
#ifndef SQLITE_WIN32_IOERR_RETRY
# define SQLITE_WIN32_IOERR_RETRY 10
#endif
#ifndef SQLITE_WIN32_IOERR_RETRY_DELAY
# define SQLITE_WIN32_IOERR_RETRY_DELAY 25
#endif
...
#define winIoerrCanRetry1(a) (((a)==ERROR_ACCESS_DENIED)        || \
                              ((a)==ERROR_SHARING_VIOLATION)    || \
                              ((a)==ERROR_LOCK_VIOLATION)       || \
                              ((a)==ERROR_DEV_NOT_EXIST)        || \
                              ((a)==ERROR_NETNAME_DELETED)      || \
                              ((a)==ERROR_SEM_TIMEOUT)          || \
                              ((a)==ERROR_NETWORK_UNREACHABLE))
```

Default: up to 10 retries, delay increasing linearly by 25 ms each time (25, 50, 75, … ms), ~1.4 s total worst case. This is empirical, practitioner-derived engineering from one of the most portability-obsessive C codebases in existence, not a Microsoft-published table — treat the code list as well-tested folklore, not specification (see [Contested / evolving](#contested--evolving)).

Why a Windows delete isn't immediate: `DeleteFileW` (and the underlying `FILE_DISPOSITION_INFO.DeleteFile = TRUE`) marks a file for deletion; the actual on-disk removal happens only once the **last** open handle to it closes — including handles held by other processes. That's the direct mechanism behind `ERROR_ACCESS_DENIED`/delete-pending races: any straggling reader (an AV real-time scanner opening the file to inspect it, a search indexer) keeps the deletion — and by extension a rename over that path — pending until it releases its handle.

### 7. Replacing a running executable: rename-aside and real implementations

[`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)'s `MOVEFILE_DELAY_UNTIL_REBOOT` (0x4) is documented to register the operation in the registry rather than perform it immediately:

> The system does not move the file until the operating system is restarted... This value can be used only if the process is in the context of a user who belongs to the administrators group or the LocalSystem account.
>
> Because the actual move and deletion operations specified with the MOVEFILE_DELAY_UNTIL_REBOOT flag take place after the calling application has ceased running, the return value cannot reflect success or failure in moving or deleting the file. Rather, it reflects success or failure in **placing the appropriate entries into the registry**.

Entries go into `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations`, applied in order at the next boot before paging files are created. This requires admin rights and delays the effect until reboot — unacceptable UX for a CLI self-updater that wants the new version active on next invocation, not next reboot. None of the real implementations examined use it for the primary update path.

**rustup's actual mechanism**, from [`src/cli/self_update/windows.rs`](https://github.com/rust-lang/rustup/blob/master/src/cli/self_update/windows.rs) and [`src/cli/self_update.rs`](https://github.com/rust-lang/rustup/blob/master/src/cli/self_update.rs), is process-lifecycle serialization, not an atomic filesystem primitive:

```rust
pub(crate) fn run_update(setup_path: &Path, process: &Process) -> Result<utils::ExitCode> {
    Command::new(setup_path)
        .arg("--self-replace")
        .spawn()
        .context("unable to run updater")?;
    // ... old process then exits
}

pub(crate) fn self_replace(process: &Process) -> Result<utils::ExitCode> {
    wait_for_parent()?;      // blocks (CreateToolhelp32Snapshot + OpenProcess +
                              // WaitForSingleObject) until the OLD rustup.exe fully exits
    install_bins(process)?;
    Ok(utils::ExitCode(0))
}

fn install_bins(process: &Process) -> Result<()> {
    let bin_path = process.cargo_home()?.join("bin");
    let this_exe_path = utils::current_exe()?;
    let rustup_path = bin_path.join(format!("rustup{EXE_SUFFIX}"));
    utils::ensure_dir_exists("bin", &bin_path)?;
    // NB: Even on Linux we can't just copy the new binary over the (running)
    // old binary; we must unlink it first.
    if rustup_path.exists() {
        utils::remove_file("rustup-bin", &rustup_path)?;
    }
    utils::copy_file_symlink_to_source(&this_exe_path, &rustup_path)?;
    utils::make_executable(&rustup_path)?;
    install_proxies(process)
}
```

This is **delete-then-copy, not rename** — and the code comment says so explicitly. It's safe only because `wait_for_parent()` has already guaranteed the old process (and, by extension, whatever exclusive lock it held on its own binary) is gone before `install_bins` runs. Atomicity here comes from *serialization*, not from a durable-rename primitive.

For **uninstall self-deletion** (a related but distinct problem — deleting a running exe rather than replacing it), rustup's own comment documents the "rename-aside" trick and its origin:

> Spawn a temporary `rustup-gc-$random.exe` to finish Windows uninstall after the original rustup.exe process exits. On Unix, the running executable can be deleted directly. On Windows you can't delete files while they are open, like when they are running.
>
> Here's what we're going to do:
> - Copy rustup.exe to a temporary file... Open the gc exe with the `FILE_FLAG_DELETE_ON_CLOSE` and `FILE_SHARE_DELETE` flags... Run the gc exe, which waits for the original rustup.exe process to close, then deletes CARGO_HOME... Finally, spawn yet another system binary with the inherit handles flag...
>
> This is the DELETE_ON_CLOSE method from https://www.catch22.net/tuts/win32/self-deleting-executables

The purpose-built [`self-replace`](https://github.com/mitsuhiko/self-replace) crate (`mitsuhiko/self-replace`) implements the general-purpose version of the same pattern, and its own source comment attributes the technique to rustup and a (now-dead) blog post, with a surviving mirror linked. From [`src/windows.rs`](https://github.com/mitsuhiko/self-replace/blob/main/src/windows.rs):

```rust
fn schedule_self_deletion_on_shutdown(
    exe: &Path,
    protected_path: Option<&Path>,
) -> Result<(), io::Error> {
    let first_choice = env::temp_dir();
    let relocated_exe = get_temp_executable_name(&first_choice, RELOCATED_SUFFIX);
    if fs::rename(exe, &relocated_exe).is_ok() {
        // renamed the RUNNING executable's own file aside, same volume —
        // this works because the OS loader opened it with FILE_SHARE_DELETE
        let tmp_exe = get_temp_executable_name(&first_choice, SELFDELETE_SUFFIX);
        fs::copy(&relocated_exe, &tmp_exe)?;
        spawn_tmp_exe_to_delete_parent(tmp_exe, relocated_exe)?;
    }
    // ... fallback branches when the temp dir isn't on the same volume
}
```

The spawned helper copy is opened with `CreateFileW(..., FILE_SHARE_READ | FILE_SHARE_DELETE, ..., FILE_FLAG_DELETE_ON_CLOSE, 0)`, its handle duplicated and inherited down a short chain of processes (ending in a throwaway `cmd.exe /c exit`), so that when the *last* process holding that inherited handle exits, Windows finally deletes the temp file — the same `FILE_FLAG_DELETE_ON_CLOSE` + `FILE_SHARE_DELETE` mechanism rustup's uninstaller uses, credited in-source to `https://0x00sec.org/t/self-deleting-executables/33702`.

**The one fact underlying both implementations**: Windows will not let you delete or overwrite a running executable's own backing file directly (`ERROR_SHARING_VIOLATION`/`ERROR_ACCESS_DENIED`, since the loader typically does not grant `FILE_SHARE_WRITE` on the running image) — but it *will* let you rename that file aside on the same volume, because the loader does open it with `FILE_SHARE_DELETE`, and "delete access allows both delete and rename operations" per `CreateFileW`'s own documentation (§6 above). Rename-aside-then-delayed-cleanup is not a workaround for a missing Windows feature; it is the direct, documented consequence of that one sharing-mode fact.

### 8. What Rust crates actually do on Windows

Read directly from source, not inferred from crate descriptions:

- **`tempfile`** ([`src/file/imp/windows.rs`](https://github.com/Stebalien/tempfile/blob/master/src/file/imp/windows.rs)) — `persist()` first calls `SetFileAttributesW(..., FILE_ATTRIBUTE_NORMAL)` to clear the temp file's `FILE_ATTRIBUTE_TEMPORARY` flag, and aborts if that fails, with the comment: *"We don't want to claim to have successfully persisted a file still marked as temporary because this file won't have the same consistency guarantees."* Only then does it call `MoveFileExW` — with `MOVEFILE_REPLACE_EXISTING` if `overwrite` was requested, and **`0` flags otherwise**. It never sets `MOVEFILE_WRITE_THROUGH`.
- **`atomicwrites`** ([`src/lib.rs`](https://github.com/untitaker/rust-atomicwrites/blob/master/src/lib.rs)) — the one crate here that does set `MOVEFILE_WRITE_THROUGH`, on both its `replace_atomic` (`MOVEFILE_WRITE_THROUGH | MOVEFILE_REPLACE_EXISTING`) and `move_atomic` (`MOVEFILE_WRITE_THROUGH` alone, relying on `MoveFileExW`'s natural fail-if-exists behavior without `REPLACE_EXISTING`) Windows paths. Its Unix path explicitly opens and `sync_all()`s both parent directories after `renameat`; its Windows path has **no directory-flush step of any kind** — the gap this report was chartered to investigate is directly visible by diffing this crate's two platform modules.
- **`atomic-write-file`** ([`src/imp/mod.rs`](https://github.com/andreacorbellini/rust-atomic-write-file/blob/master/src/imp/mod.rs)) — routes Windows (and every other non-Unix target) through a `generic` module that does a plain `std::fs::rename`, no `CreateFileW` flags, no explicit flush, no directory handling at all. The module carries its own acknowledgment that this is incomplete:

  ```rust
  #[cfg(unix)]
  pub(crate) mod unix;
  #[cfg(not(unix))]
  pub(crate) mod generic;
  // TODO On Windows, use CreateFileW with FILE_ATTRIBUTE_HIDDEN, FILE_FLAG_DELETE_ON_CLOSE +
  // MoveFileEx with MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH
  ```

- **`fs-err`** ([`src/lib.rs`](https://github.com/andrewhickman/fs-err/blob/master/src/lib.rs)) — a path-context-on-error wrapper around `std::fs`; contains no Windows-specific rename or durability logic of its own (no reference to `rename`, `MoveFile`, or any Windows API in the crate's Rust source beyond what it re-exports from `std`). It inherits whatever `std::fs::rename` does on Windows (§3 above) unchanged.
- **`rustix`** — Unix-only for the filesystem calls relevant here (`renameat`, `linkat`, `unlinkat`); `atomicwrites` guards its `rustix` usage behind `#[cfg(unix)]` and uses raw `windows_sys` calls on Windows instead. Nothing in scope calls `rustix` on Windows.
- **`self-replace`** ([`src/windows.rs`](https://github.com/mitsuhiko/self-replace/blob/main/src/windows.rs)) — see §7. Uses `fs::rename` (std) for the rename-aside step and raw `CreateFileW`/`DeleteFileW`/`FILE_FLAG_DELETE_ON_CLOSE` for the delayed-delete helper. No `ReplaceFileW`, no `SetFileInformationByHandle`, no explicit data flush anywhere — it is solving a process-lifecycle problem, not a data-durability one, and doesn't claim to.
- **`std::fs::rename`** (the compiler's own implementation) — see §3: `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` primary, `FileRenameInfoEx`/POSIX-semantics fallback on `ERROR_ACCESS_DENIED` only, no `MOVEFILE_WRITE_THROUGH` ever.

Net finding: **no Rust crate examined here calls `ReplaceFileW`.** The crate that most needs a durability answer for this exact problem (`atomic-write-file`) documents in its own source that it doesn't have one yet on Windows.

## Normative guidance candidates

1. **Flush the temp file's data (`FlushFileBuffers` on the open file handle) before renaming it into place on Windows; never rely on `MOVEFILE_WRITE_THROUGH` to do this for you.** Rationale: `MOVEFILE_WRITE_THROUGH`'s documented guarantee is scoped to "a move performed as a copy and delete operation" — not the ordinary same-volume metadata rename a publish step actually performs — and NTFS's journal (§5) protects metadata, not unflushed file data. VERIFICATION: crash-inject test — write N MB via buffered `WriteFile` without flush, `MoveFileExW`-rename into place, force-kill/power-cut before the OS's natural cache-flush interval, reboot, hash the published file. Must fail without the explicit flush step and pass with it, across ≥20 trials.

2. **Always pass a real `lpBackupFileName` to `ReplaceFileW`, never `NULL`, if you use it at all.** Rationale: on `ERROR_UNABLE_TO_MOVE_REPLACEMENT` (1176) with `lpBackupFileName == NULL`, the documented post-failure state deletes the original and leaves the replacement under its own temp name — the target path can end up with no file. With a backup path, that same failure retains both files under their original names. VERIFICATION: unit test that forces this specific error (e.g. by holding a blocking handle on the target directory during the final internal rename step) and asserts target-path existence differs between the `NULL` and non-`NULL` backup configurations.

3. **Prefer `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` as the primary Windows publish-rename call — matching what `std::fs::rename` already does — rather than reaching for `ReplaceFileW` or a POSIX-semantics `SetFileInformationByHandle` call by default.** Rationale: `ReplaceFileW`'s ACL/attribute/stream-merging side effects are unwanted for freshly-published install-tree content (it would inherit compression/encryption/DACL state from the file being replaced, which is not the intent of a package-manager publish), and `FileRenameInfoEx`/POSIX semantics carries a Windows 10 1607+ floor with documented per-filesystem exceptions (FAT32). Matching `std::fs::rename`'s own fallback shape (`MoveFileExW` first, `FileRenameInfoEx` only on `ERROR_ACCESS_DENIED`) keeps behavior consistent with what the rest of a mixed-platform codebase already gets from plain `fs::rename`. VERIFICATION: code review — the Windows durable-publish helper should call `std::fs::rename` directly, or reimplement its exact fallback sequence, rather than introducing a second, divergent rename code path.

4. **Do not fabricate a "flush the parent directory" step on Windows by calling `FlushFileBuffers` on a `FILE_FLAG_BACKUP_SEMANTICS`-opened directory handle and treating it as equivalent to the Unix directory-fsync step.** Rationale: `FlushFileBuffers`'s documentation describes only file-handle and (admin-only) volume-handle scopes; it never mentions directory handles, in contrast to its explicit callouts for other handle types. There is no confirmed Windows analogue to this Unix durability step — a rule that pretends one exists is worse than a rule that documents the gap. VERIFICATION: code review checklist — any `cfg(windows)` branch of the durable-write helper that calls `FlushFileBuffers` against a directory handle must carry a comment citing a primary source for what that call actually does; absent one, delete the call rather than keep an unverified no-op.

5. **Treat `ERROR_SHARING_VIOLATION` (32) and `ERROR_ACCESS_DENIED` (5) as transient and retry with backoff on every Windows rename/delete/open in the publish and self-update paths — including for the `ERROR_ACCESS_DENIED` that `CreateFileW`'s own documentation says is returned for a delete-pending file, not just the dedicated `ERROR_DELETE_PENDING` (303).** Rationale: these are the two codes SQLite's own Windows I/O layer retries by default, with its comment attributing the cause to antivirus/indexer contention — normal operating conditions on Windows, not error states — and Microsoft's own `CreateFileW` documentation confirms `ERROR_ACCESS_DENIED` (not 303) is what a delete-pending race actually surfaces. VERIFICATION: run the publish/delete path against a directory under active Windows Defender real-time scanning (or, in CI, a background process holding a handle without `FILE_SHARE_DELETE`) and confirm the retry loop succeeds within its budget without surfacing a hard failure.

6. **Open every file the durable-write pipeline might later need to rename or delete out from under a concurrent reader — including the running executable itself, if it self-updates — with `FILE_SHARE_DELETE` in its share mode.** Rationale: `CreateFileW`'s documentation states plainly that "Delete access allows both delete and rename operations," and a handle opened without `FILE_SHARE_DELETE` blocks every other process's rename/delete attempt on that path until it closes — the direct mechanism behind `ERROR_SHARING_VIOLATION`. VERIFICATION: grep all `CreateFile`/`std::fs::OpenOptions::open`/`share_mode` call sites in the install-tree and blob-store read paths for a share mode that omits `FILE_SHARE_DELETE`, and confirm each omission is intentional (i.e. that path genuinely needs exclusive access).

7. **Never attempt to overwrite or delete the currently-running executable's own backing file directly; use the rename-aside pattern (rename the running file to a same-volume temp name, spawn a short-lived `FILE_FLAG_DELETE_ON_CLOSE`+`FILE_SHARE_DELETE` helper to remove it) for self-delete, or serialize on the old process's exit (as rustup does with `wait_for_parent` + delete-then-copy) for self-replace.** Rationale: the OS loader does not grant `FILE_SHARE_WRITE` on a running image, so direct delete/overwrite fails with `ERROR_SHARING_VIOLATION`/`ERROR_ACCESS_DENIED`, but it does grant `FILE_SHARE_DELETE`, which is why rename-aside works — this is documented Win32 sharing-mode behavior (§6), not folklore. VERIFICATION: run the compiled updater end-to-end, trigger self-update, and confirm the old process exits cleanly, the new binary is active on next launch, and no orphaned temp `.exe` files remain in the temp/install directory a few seconds after completion.

8. **Do not unconditionally use `FileRenameInfoEx`/`FILE_RENAME_FLAG_POSIX_SEMANTICS` as the primary Windows rename path; gate it behind an `ERROR_NOT_SUPPORTED`/`ERROR_INVALID_PARAMETER`-triggered fallback to plain `MoveFileExW`, matching `std::fs::rename`'s own shape.** Rationale: it requires Windows 10 version 1607 (RS1) or later and is documented as unsupported on some filesystem drivers even on supported OS versions (FAT32 is the documented example) — ocx and grim ship as binaries that may run on older Windows Server / LTSC images or removable FAT32 media, where this call must fail gracefully, not hard-error. VERIFICATION: run the publish path against a FAT32-formatted volume (or a pre-1607 Windows image, e.g. via VM) and confirm the fallback path activates rather than surfacing an unhandled error.

## AI-agent angle

An AI agent maintaining this durable-publish/self-update code without a human in the loop should internalize four things this report establishes directly, because each is an easy, plausible-looking mistake:

- **Do not literally translate "fsync the parent directory" into a Windows `FlushFileBuffers` call on a directory handle and call it done.** The pattern-match from the Unix rule to "open the directory, flush it" is exactly the move that produces a rule "worse than documenting the gap," per the brief for this report. §4 establishes that Microsoft's documentation is silent on this, not permissive of it. The correct `cfg(windows)` branch is: flush the file's data before the rename, and stop — there is no confirmed directory-level step to add.
- **A Unix `rename()` failing is rare and usually fatal; a Windows rename/delete failing with `ERROR_SHARING_VIOLATION`/`ERROR_ACCESS_DENIED` is routine and usually transient.** An agent that migrates Unix-shaped error handling (log-and-abort on any rename failure) onto Windows without adding the retry-with-backoff loop in guidance #5 will manifest as flaky CI or user-visible failures misdiagnosed as "a race condition in our code," when the actual cause is Windows Defender or a search indexer holding a transient handle — a condition SQLite's decades-old Windows VFS layer has retried around since before this project existed.
- **"Make it atomic on Windows too" is not `s/rename/MoveFileExW/`.** Because NTFS's crash-durability journal (§5) covers metadata, not data, achieving the same end-to-end guarantee the Unix path has requires *adding* an explicit data-flush step before the rename that has no Unix equivalent to copy from — an agent that only swaps the API name and declares the Windows path "equivalent" has silently dropped the data-durability half of the guarantee.
- **Version- and filesystem-gate any use of `FileRenameInfoEx`/POSIX-semantics rename, and default to plain `MoveFileExW` as the primary path** (guidance #8) — an agent reaching for the "more POSIX-like" API because it sounds more correct, without the Windows-10-1607+/FAT32-exception fallback that `std::fs::rename` itself implements, will work in development (a recent Windows 11 dev box) and fail unpredictably on the oldest supported target, which is exactly the kind of gap that doesn't show up until a real user hits it.
- ocx already ships a Windows launcher shim (`ocx_shim`) specifically to deal with the running-executable-replacement problem; any new self-update logic should be checked against what that shim already does before re-deriving the rename-aside pattern from scratch — duplicating rustup's/`self-replace`'s reinvention inside a codebase that may have already solved half the problem is wasted, and potentially inconsistent, effort.

## Contested / evolving

- **`MOVEFILE_WRITE_THROUGH`'s effect on an ordinary same-volume `MOVEFILE_REPLACE_EXISTING` rename is genuinely unconfirmed.** Community discussion (Stack Overflow, various blog posts) often claims it universally forces an NTFS metadata flush; the literal Microsoft documentation scopes the guarantee to "a move performed as a copy and delete operation." Until Microsoft documents the same-volume case explicitly, treat any blanket "it makes the rename durable" claim as folklore, not established fact.
- **Whether `FlushFileBuffers` on a directory handle does anything on NTFS or ReFS could not be confirmed from any Microsoft source found for this report.** No page states it's supported; none states it's rejected or a no-op. This report's position (§4) is the conservative one — don't rely on it — but that is a stance taken in the absence of evidence, not a documented negative.
- **ReFS's same-volume-rename crash-consistency relative to NTFS is undocumented.** ReFS's allocate-on-write B+-tree metadata model is architecturally different from NTFS's log-based journal, and it is plausible either design gives equal, stronger, or weaker guarantees for "was this specific rename durable across an immediate power loss" — no source found here addresses the question directly for either filesystem in those terms.
- **`atomic-write-file`'s Windows implementation is an acknowledged work-in-progress** (the `// TODO` comment in its own source, §8). Any claim in this report that it "has no Windows-specific durability logic" is accurate for the version read at research time and should be re-verified against whatever version is actually vendored before being repeated as current fact.
- **SQLite's antivirus-retry error-code list is empirical, not specified.** No Microsoft source enumerates "these are the codes third-party AV products produce during a scan-induced lock." SQLite's list is decades of practitioner experience baked into a `#define`, which is strong evidence but not a guarantee that it's exhaustive or that it stays accurate as AV vendors change behavior.
- **The exact scope of what NTFS's `$LogFile` protects is stated here as industry-standard understanding of log-based metadata journaling, not as a direct Microsoft citation** — Microsoft's own NTFS overview page uses genuinely ambiguous language ("data integrity," "file system consistency") that a less careful reading could stretch to cover file data. This report's metadata-only reading is the standard one but is explicitly flagged as inference, per this report's own rule against asserting an unconfirmed guarantee.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [MoveFileExW — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw) | Primary API doc | live, checked 2026-08 | Defines `MOVEFILE_REPLACE_EXISTING`/`MOVEFILE_WRITE_THROUGH`/`MOVEFILE_DELAY_UNTIL_REBOOT`; no atomicity claim made anywhere on the page — the absence is itself the finding. |
| [ReplaceFileW — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) | Primary API doc | live, checked 2026-08 | Only Win32 rename-family API with per-error-code documented partial-failure filesystem state; source of the `ERROR_UNABLE_TO_MOVE_REPLACEMENT` no-backup data-loss finding. |
| [FlushFileBuffers — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) | Primary API doc | live, checked 2026-08 | Establishes the directory-handle documentation gap by exhaustively listing every scope it *does* cover (file, volume) and omitting directories entirely. |
| [SetFileInformationByHandle — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle) | Primary API doc | live, checked 2026-08 | Enumerates `FileRenameInfo`/`FileDispositionInfo`/etc. classes and TxF transactional-handle interaction; the base doc the newer `*Ex` classes extend. |
| [FILE_RENAME_INFO structure — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_rename_info) | Primary API doc | live, checked 2026-08 | Shows the `Flags`/`ReplaceIfExists` union shape used by `FileRenameInfoEx`, though it doesn't itself document the POSIX-semantics flag or version floor — had to be cross-checked against source. |
| [CreateFileW — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) | Primary API doc | live, checked 2026-08 | Source of `FILE_SHARE_DELETE`'s "delete access allows both delete and rename" text, the delete-pending → `ERROR_ACCESS_DENIED` mapping, `FILE_FLAG_BACKUP_SEMANTICS` for directory handles, and the `FILE_FLAG_WRITE_THROUGH` metadata-flush note. |
| [System Error Codes (0-499) — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-) | Primary reference | live, checked 2026-08 | Exact canonical text for `ERROR_ACCESS_DENIED` (5), `ERROR_SHARING_VIOLATION` (32), `ERROR_DELETE_PENDING` (303) used verbatim in this report. |
| [NTFS overview — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview) | Primary product doc | updated 2025-06/2026-02 | Microsoft's own (deliberately quoted, deliberately hedged) statement of what the NTFS transaction log recovers after a crash. |
| [ReFS overview — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/storage/refs/refs-overview) | Primary product doc | updated 2025-07 | Establishes ReFS has *no* documented equivalent to NTFS's journaling claim, and the NTFS-vs-ReFS feature comparison table (Transactions unavailable on ReFS). |
| [`rust-lang/rust` — `library/std/src/sys/fs/windows.rs`](https://github.com/rust-lang/rust/blob/master/library/std/src/sys/fs/windows.rs) | Primary source (compiler std lib) | current `master`, checked 2026-08 | Ground truth for exactly what `std::fs::rename`/`remove_file` do on Windows: `MoveFileExW` primary, `FileRenameInfoEx`/POSIX-semantics fallback on `ERROR_ACCESS_DENIED` only; comments document the Windows-10-1607/FAT32 caveat. |
| [`rust-lang/rust` — `windows_sys.rs` bindings](https://github.com/rust-lang/rust/blob/master/library/std/src/sys/pal/windows/c/windows_sys.rs) | Primary source (win32metadata-derived constants) | current `master`, checked 2026-08 | Exact numeric values for `FILE_RENAME_FLAG_POSIX_SEMANTICS`=2, `FileRenameInfoEx`=21, `FileRenameInformationEx`=65, and the sibling `FILE_DISPOSITION_FLAG_*` constants. |
| [Stebalien/tempfile — `src/file/imp/windows.rs`](https://github.com/Stebalien/tempfile/blob/master/src/file/imp/windows.rs) | Primary source (widely-used crate) | current `master`, checked 2026-08 | Ground truth for `NamedTempFile::persist` on Windows: clears `FILE_ATTRIBUTE_TEMPORARY` first, then bare `MoveFileExW`, never `MOVEFILE_WRITE_THROUGH`. |
| [untitaker/rust-atomicwrites — `src/lib.rs`](https://github.com/untitaker/rust-atomicwrites/blob/master/src/lib.rs) | Primary source (widely-used crate) | current `master`, checked 2026-08 | Only crate examined that sets `MOVEFILE_WRITE_THROUGH`; its Unix-vs-Windows module diff is the clearest direct evidence of the parent-directory-fsync gap. |
| [andreacorbellini/rust-atomic-write-file — `src/imp/mod.rs`](https://github.com/andreacorbellini/rust-atomic-write-file/blob/master/src/imp/mod.rs) | Primary source (crate under active development) | current `master`, checked 2026-08 | Live `// TODO` comment showing a purpose-built atomic-write crate has not yet built Windows-specific durability logic — strong "contested/evolving" evidence, not to be cited as permanent fact. |
| [rust-lang/rustup — `src/cli/self_update/windows.rs`](https://github.com/rust-lang/rustup/blob/master/src/cli/self_update/windows.rs) | Primary source (production self-updating CLI) | current `master`, checked 2026-08 | Real implementation of both self-replace (delete-then-copy, serialized on parent exit) and self-delete (rename-aside + `DELETE_ON_CLOSE` helper chain), with in-source attribution to the technique's origin. |
| [mitsuhiko/self-replace — `src/windows.rs`](https://github.com/mitsuhiko/self-replace/blob/main/src/windows.rs) | Primary source (purpose-built self-replace crate) | current `main`, checked 2026-08 | General-purpose implementation of the same rename-aside + `FILE_FLAG_DELETE_ON_CLOSE` pattern, confirming it's a recognized idiom rather than one project's one-off hack. |
| [sqlite/sqlite — `src/os_win.c`](https://github.com/sqlite/sqlite/blob/master/src/os_win.c) | Primary source (production embedded DB, decades of Windows-portability hardening) | current `master`, checked 2026-08 | Empirical, in-source-commented retry policy for `ERROR_ACCESS_DENIED`/`ERROR_SHARING_VIOLATION` explicitly attributed to antivirus interference — the best available evidence for "documented retry practice" since Microsoft itself publishes no such table. |
