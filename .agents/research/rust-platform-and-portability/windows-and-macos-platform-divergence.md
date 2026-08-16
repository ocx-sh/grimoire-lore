---
title: "Windows and macOS Divergence for a Binary-Shipping CLI"
agent: rust-platform-researcher-windows-macos
model: sonnet
date_researched: 2026-08
sources_count: 22
scope: >
  Non-Linux filesystem, process-execution, and code-signing behaviours that break a package
  manager which downloads, caches, links, and executes binaries (grim / ocx / ocx-mirror).
  Windows: MAX_PATH and long-path opt-in, sharing-violation locking during cache replacement
  and self-update, case-insensitive-but-preserving filesystems, reserved names and invalid
  archive-entry characters, rename/replace atomicity guarantees, symlink privilege and its
  junction/hardlink fallbacks, PATHEXT and the ocx_shim launcher. macOS: case-insensitive APFS
  and HFS+ NFD normalization, com.apple.quarantine / Gatekeeper / notarization, SIP-protected
  paths and legitimate cache locations.
---

# Windows and macOS Divergence for a Binary-Shipping CLI

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Windows: MAX_PATH and the long-path opt-in](#1-windows-max_path-and-the-long-path-opt-in)
   2. [Windows: sharing violations, locked files, and self-update](#2-windows-sharing-violations-locked-files-and-self-update)
   3. [Windows: case-insensitive-but-preserving filesystems](#3-windows-case-insensitive-but-preserving-filesystems)
   4. [Windows: reserved names and the archive-entry validation list](#4-windows-reserved-names-and-the-archive-entry-validation-list)
   5. [Windows: what rename/replace actually guarantees](#5-windows-what-renamereplace-actually-guarantees)
   6. [Windows: symlinks, junctions, hardlinks](#6-windows-symlinks-junctions-hardlinks)
   7. [Windows: executable semantics and the ocx_shim rationale](#7-windows-executable-semantics-and-the-ocx_shim-rationale)
   8. [macOS: case-insensitive APFS and HFS+ NFD normalization](#8-macos-case-insensitive-apfs-and-hfs-nfd-normalization)
   9. [macOS: quarantine, Gatekeeper, notarization](#9-macos-quarantine-gatekeeper-notarization)
   10. [macOS: SIP and legitimate cache locations](#10-macos-sip-and-legitimate-cache-locations)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `MAX_PATH` (260) is a Win32-API limit, not a filesystem limit; NTFS supports paths up to ~32,767 UTF-16 units, reachable only through the `\\?\` verbatim prefix or the Windows-10-1607+ per-app opt-in (registry key **and** manifest, both required).
2. Under a `\\?\` prefix, Windows disables all string parsing: forward slashes are not converted to backslashes, and `.`/`..` are taken literally instead of being resolved — so a verbatim path must already be fully-qualified and backslash-clean before you prepend the prefix.
3. `std::fs::canonicalize` on Windows returns a `\\?\`-prefixed path itself, which then cannot be safely joined with forward slashes, handed to another process's command line, or compared byte-for-byte against a non-canonicalized path.
4. A locked/open file on Windows blocks delete and (usually) overwrite with `ERROR_SHARING_VIOLATION`; it does **not** reliably block *rename* — this asymmetry is the entire basis of rustup's self-update mechanism and of the recommended cache-replacement pattern.
5. `ReplaceFileW`, despite existing specifically for atomic-looking replacement, is documented by Microsoft as internally multi-step ("combines several steps within a single function") and ships three distinct partial-failure error codes — it is not a single atomic operation the way POSIX `rename(2)` is.
6. Same-volume `MoveFileExW`/`rename` on NTFS is, in practice, a single filesystem-metadata transaction — but this is folklore/implied behaviour, not a guarantee Microsoft's own docs state in as many words. Treat it as "usually true," `ReplaceFileW`'s partial-failure codes as "documented and guaranteed."
7. `MOVEFILE_DELAY_UNTIL_REBOOT` requires administrator/LocalSystem privilege, cannot combine with `MOVEFILE_COPY_ALLOWED`, and only deletes empty directories — it is a last-resort escape hatch, not a routine cache-replacement tool.
8. NTFS and APFS are both case-insensitive-but-case-preserving by default; a lockfile or cache index that treats `Foo` and `foo` as distinct keys will silently collide on disk on both platforms even though the comparison logic that produced those keys ran and passed on Linux CI.
9. Windows reserves `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9` (plus superscript-digit variants `COM¹`/`COM²`/`COM³`), `LPT1`–`LPT9` as filenames — including with any extension (`NUL.txt` is invalid) — and rejects filenames ending in a trailing space or period; an archive extractor that trusts entry names verbatim will fail (or worse, silently write to a device namespace) on these.
10. Creating a Windows symlink requires either administrator elevation or Developer Mode plus the `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE` flag — neither is guaranteed on an arbitrary user machine or CI runner, so "link the cached blob into place" must fall back to hardlinks (same-volume, files only) or junctions (directories only, no privilege required).
11. There is no POSIX executable bit on Windows; `Command::new("foo")` will locate `foo.exe` with the extension omitted, but any other extension (`.bat`, `.cmd`, `.ps1`) must be given explicitly — this is `CreateProcess`'s own `.exe`-completion, distinct from `PATHEXT`, which only `cmd.exe` and the shell consult.
12. A symlink to a downloaded executable on Windows still just launches that executable with none of the process-lifecycle guarantees a launcher needs; ocx's WinAPI shim exists to wrap the child in a Job Object so it is reliably torn down if the shim itself is killed — a guarantee neither a symlink nor a bare `CreateProcess` call gives you.
13. Legacy HFS+ silently normalizes filenames to NFD (decomposed) form on write; current default APFS does **not** normalize at all and preserves whatever byte sequence you gave it — meaning macOS filename-equality bugs that "went away" in the APFS era can reappear the moment a user's cache lives on an HFS+-formatted external or Time Machine volume.
14. `com.apple.quarantine` is applied by the *downloading application itself* opting in (browsers, mail clients do; most CLI tools, including a Rust HTTP client writing bytes with `std::fs::write`, do not) — writing a file yourself does not automatically trigger Gatekeeper on it, which is a deliberate design point a package manager has to decide about, not a side effect to be surprised by.
15. Homebrew Cask — the closest real-world analogue to grim/ocx — explicitly re-applies `com.apple.quarantine` via `xattr` to every cask download specifically so Gatekeeper still runs its check, rather than relying on the (safer-looking but actually weaker) fact that its own downloader never set the flag.
16. SIP protects `/System`, `/bin`, `/sbin`, and `/usr` except `/usr/local`; user-writable, SIP-exempt locations for caches are `~/Library/Caches` (Apple's own convention, what the `directories` crate returns) or `~/.cache` (XDG, what `etcetera`'s XDG-everywhere strategy returns) — both are legitimate, the choice is a policy call, not a constraint.
17. Directory `fsync` is a POSIX-durability idiom with no confirmed Windows analogue in Microsoft's own file-I/O documentation surveyed here; do not port "fsync the parent directory after a rename" to Windows code without first establishing whether it does anything there.
18. A Linux-only CI matrix cannot observe *any* of: `MAX_PATH`/long-path failures, `ERROR_SHARING_VIOLATION` locking, case-insensitive collisions (ext4 is case-sensitive), reserved-device-name rejection, symlink-privilege failures, PATHEXT/`.exe`-completion behaviour, quarantine/Gatekeeper/notarization, SIP path restrictions, or HFS+/APFS normalization drift — these categories are not "less tested" on Linux-only CI, they are **structurally invisible** to it.
19. Because the failure modes above cluster around *file identity and lifecycle* (does this rename survive a concurrent reader, is this the same path as that one, can I even create this link), the right boundary is one `platform` module with a single trait/fn surface (`replace_file`, `link_blob`, `is_locked_err`) — not `#[cfg(windows)]` sprinkled at each call site, because the call sites need to reason about *outcomes* (did the swap happen atomically, do I need to retry), and that reasoning is identical across platforms even though the implementation is not.
20. rustup and ripgrep both independently rediscovered the same lesson in public: BurntSushi ("I am not a Windows programmer... someone will need to explain the actual problem in depth," ripgrep #364) and rustup's own multi-year-open #2441 both show that this class of bug is not found by intuition or code review from a Linux-primary maintainer — it is found by a Windows user filing a reproducible issue, which is exactly what Linux-only CI cannot substitute for.

## Findings

### 1. Windows: MAX_PATH and the long-path opt-in

`MAX_PATH` is 260 characters and is a **Win32 API** ceiling, not an NTFS ceiling: "In the Windows API (with some exceptions...), the maximum length for a path is MAX_PATH, which is defined as 260 characters" ([Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)). The same document gives ripgrep-cloning-a-repo as its own example of when this bites.

Two independent ways past it:

- **The `\\?\` verbatim prefix**, usable on any Windows version, extends the limit to "32,767 wide characters" ([Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)). Cost: "it turns off automatic expansion of the path string" — the prefix "also allows the use of '..' and '.' in the path names" *because it stops resolving them*, not because it resolves them correctly. The Maximum Path Length doc is explicit that under this prefix "you cannot use forward slashes to represent path separators, or a period to represent the current directory, or double dots to represent the parent directory," and "you cannot use the '\\?\' prefix with a relative path" — the path handed to it must already be fully-qualified and backslash-only.
- **The Windows 10 1607+ per-app opt-in**, which needs *both*:
  - Registry: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem` value `LongPathsEnabled` (`REG_DWORD` = `1`), also settable via Group Policy at `Computer Configuration > Administrative Templates > System > Filesystem > Enable Win32 long paths`. This is machine-wide and "cached by the system (per process) after the first call... a reboot might be required."
  - Application manifest: `<ws2:longPathAware>true</ws2:longPathAware>` inside `<application>`.
  - Even then, only a specific enumerated function list is affected (`CreateFileW`, `DeleteFileW`, `MoveFileW`, `MoveFileExW`, `ReplaceFileW`, `CreateSymbolicLinkW`, `CreateHardLinkW`, and about a dozen more) — anything outside that list, or any ANSI variant, still enforces `MAX_PATH`.

ripgrep #364 is the concrete failure shape: a filename alone (well under 260 chars) inside a shallow directory tree exceeded the joined path length, and `rg "foobar"` failed with `os error 3` ("The system cannot find the path specified") on stock Windows 10 1607 — invisible until the user manually prepended `\\?\%cd%` ([ripgrep#364](https://github.com/BurntSushi/ripgrep/issues/364)). BurntSushi's own comment is worth keeping verbatim as a caution about self-assessed Windows competence: *"I am not a Windows programmer. I know almost nothing about it or its ecosystem... If standard Windows tooling doesn't support long file paths, then I'm not sure what to do."* ripgrep never fixed this; it is documented as a known limitation, which is itself the lesson — this is not a corner case a determined Linux-primary maintainer eventually handles, it stays broken unless someone treats it as a first-class requirement from the start.

A second, Rust-specific trap compounds this: `std::fs::canonicalize` on Windows *returns* a `\\?\`-prefixed path. Per the stdlib docs, this "converts the path to use extended length path syntax," and as a result "you can only join backslash-delimited paths to it" and it "may be incompatible with other applications" if passed on a command line or written to a file another tool reads ([`std::fs::canonicalize`](https://doc.rust-lang.org/std/fs/fn.canonicalize.html)). A lockfile that stores a canonicalized path on Windows and a non-canonicalized one on Linux is not storing the "same kind" of path across platforms.

```rust
// WRONG: canonicalize then treat the result as an ordinary joinable/displayable path
let real = std::fs::canonicalize(&cache_dir)?;
let child = format!("{}/blob.bin", real.display()); // \\?\-prefixed string, forward slash — breaks

// RIGHT: canonicalize only at the point you need the OS-guaranteed identity
// (e.g. for a HashSet dedup key); build child paths with PathBuf::join, never string format!
let real = std::fs::canonicalize(&cache_dir)?;
let child = real.join("blob.bin"); // PathBuf::join stays backslash-correct under \\?\
```

### 2. Windows: sharing violations, locked files, and self-update

Opening a file for execution or read on Windows takes out a lock; a subsequent delete or overwrite attempt from another process — including the same tool trying to replace its own cache entry — fails with `ERROR_SHARING_VIOLATION`/`ERROR_ACCESS_DENIED` unless the original handle was opened with `FILE_SHARE_DELETE`. This is not a rare condition: rustup's issue tracker has a live, still-open thread from 2025 showing exactly this shape during ordinary `rustup update`:

```
error: could not rename component file from '...\rustc_driver-fa0e808d9c2eec55.dll'
to '...\uolyu3cicva0thxt_file': The process cannot access the file because it is
being used by another process. (os error 32)
```

The issue explicitly attributes this to *anything* that can transiently hold a handle without `FILE_SHARE_DELETE` — indexers, antivirus/EDR, or another concurrent rustup/rustc process — and links to the exact Win32 requirement: a file "typically" needs `FILE_SHARE_DELETE` granted by whoever opened it, which most tools do not set by default ([rustup#4181](https://github.com/rust-lang/rustup/issues/4181), citing [`CreateFileW`](https://learn.microsoft.com/windows/win32/api/fileapi/nf-fileapi-createfilew)).

The harder case is **replacing your own running executable**, which rustup's design issue lays out precisely: *"on Windows, when a binary is executed, it gets a read lock taken out on it. This prevents deleting (or replacing) the file until the process has exited. Renaming seems possible."* ([rustup#2441](https://github.com/rust-lang/rustup/issues/2441)). That asymmetry — rename of an open file usually succeeds, delete/overwrite usually does not — is exactly the "rename a running executable" trick from the task brief, and it is rustup's actual production mechanism, confirmed by reading rustup's own source: a `spawn_uninstall_gc` helper "spawn[s] a temporary `rustup-gc-$random.exe` to finish Windows uninstall after the original `rustup.exe` process exits," using the `DELETE_ON_CLOSE`-plus-inheritable-handle technique credited to catch22.net, precisely *because* "on Windows you can't delete files while they are open, like when they are running" ([rustup `self_update/windows.rs`](https://raw.githubusercontent.com/rust-lang/rustup/master/src/cli/self_update/windows.rs)).

The primitive Microsoft ships for the reboot-deferred case is `MoveFileExW` with `MOVEFILE_DELAY_UNTIL_REBOOT`:

- Registers the pending op in `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations` (`REG_MULTI_SZ`), processed at next boot, before paging files are created.
- Requires the caller to be an administrator or `LocalSystem` — not usable by a per-user CLI install.
- Cannot combine with `MOVEFILE_COPY_ALLOWED`; the source cannot be on a remote share.
- Only deletes a directory at reboot "if it is empty" — files inside must already be gone.
- The call's own return value only reflects whether the *registry entry* was written, not whether the eventual move succeeds ([`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)).

Given the elevation requirement, `MOVEFILE_DELAY_UNTIL_REBOOT` is not a routine cache-replacement mechanism for a per-user tool; it belongs to installer/uninstaller code paths only, if at all.

The four-way mitigation menu, ranked by how it maps onto grim/ocx's actual cache-replace and self-update paths:

| Mitigation | Applies to | Cost |
|---|---|---|
| Retry with backoff | Transient locks (indexer, AV scan) | Cheap, needed everywhere on Windows regardless of the other three |
| Move-then-delete (rename out of the way, delete later/on next run) | Cache blob replacement | No elevation; matches the documented rename-succeeds/delete-fails asymmetry |
| Rename the running executable + spawn a delete-on-close helper | Self-update of your own `.exe` | No elevation; this is rustup's actual mechanism |
| `MOVEFILE_DELAY_UNTIL_REBOOT` | Only when nothing else worked and the caller is already elevated | Admin/LocalSystem only |

### 3. Windows: case-insensitive-but-preserving filesystems

Microsoft's own naming guidance states the rule directly: "Do not assume case sensitivity. For example, consider the names OSCAR, Oscar, and oscar to be the same... Note that NTFS supports POSIX semantics for case sensitivity but this is not the default behavior" ([Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)). This is case-preserving (the exact bytes you wrote are what `readdir` gives back) but case-*insensitive for lookup* — two lockfile entries `"Foo/pkg"` and `"foo/pkg"` are two different keys in a `HashMap<String, _>`, but exactly one filesystem entry on disk. Whichever entry writes second silently clobbers the first's cache blob, and the lockfile now has one stale entry pointing at the other package's content. macOS APFS defaults to the same behaviour (see §8) — this is a shared Windows/macOS gap that ext4-based Linux CI cannot reproduce at all, since ext4 is case-sensitive by construction.

### 4. Windows: reserved names and the archive-entry validation list

The naming document is the canonical archive-entry validation source. An extractor that writes archive-member paths without validating them against this list will fail (best case) or silently target a device namespace (worst case, since `CON`, `NUL`, `COM1` etc. are live device aliases in the Win32 namespace, not merely disallowed strings):

- **Reserved device names** (case-insensitive, and reserved *with any extension*): `CON, PRN, AUX, NUL, COM1`–`COM9, COM¹, COM², COM³, LPT1`–`LPT9, LPT¹, LPT², LPT³`. "Also avoid these names followed immediately by an extension; for example, NUL.txt and NUL.tar.gz are both equivalent to NUL." Windows also recognizes the ISO-8859-1 superscript digits ¹²³ as valid parts of these names, so `COM¹` is reserved too.
- **Reserved characters**: `< > : " / \ | ? *`, the NUL byte, and control characters 1–31 (except inside alternate-data-stream names).
- **Trailing dot or space**: "Do not end a file or directory name with a space or a period" — the underlying filesystem may store it, but the Win32 API/shell strips or rejects it, so a name that round-trips fine through one code path can silently lose its trailing dot through another.
- Any archive entry whose *resolved* path (after joining with the extraction root) needs backslash traversal validation too — Windows converts `/` to `\` as part of NT-name conversion "except when using the '\\?\' prefix," so `..`-based zip-slip validation must run on the joined, normalized path, not on the raw archive-entry string, and must run *before* any `\\?\`-prefixed write, since that prefix is exactly what disables `..` resolution.

```rust
// Minimum viable archive-entry gate before any write on Windows:
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL",
    "COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
    "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
];
fn is_reserved_windows_name(stem: &str) -> bool {
    RESERVED.iter().any(|r| stem.eq_ignore_ascii_case(r))
}
fn has_trailing_dot_or_space(name: &str) -> bool {
    name.ends_with('.') || name.ends_with(' ')
}
```

### 5. Windows: what rename/replace actually guarantees

This is the sharpest guaranteed-vs-usually-true distinction in the whole brief. `ReplaceFileW` exists specifically to *look* like an atomic swap, and Microsoft's own remarks say the opposite of what the name implies: "The ReplaceFile function combines several steps within a single function. An application can call ReplaceFile instead of calling separate functions to save the data to a new file, rename the original file using a temporary name, rename the new file to have the same name as the original file, and delete the original file" ([`ReplaceFileW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew)). That sentence is a description of a multi-step algorithm, not a single filesystem transaction — and the function's error table proves it, with three *distinct, named, partial-failure states*:

| Error code | Meaning | State left behind |
|---|---|---|
| `ERROR_UNABLE_TO_MOVE_REPLACEMENT` (1176) | replacement file could not be renamed | both files keep original names |
| `ERROR_UNABLE_TO_MOVE_REPLACEMENT_2` (1177) | replacement file could not be moved | replacement has inherited attrs/streams but old file survives under a different name |
| `ERROR_UNABLE_TO_REMOVE_REPLACED` (1175) | replaced file could not be deleted | both files retain original names |

By contrast, `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING` is a simpler primitive — "If a file named lpNewFileName exists, the function replaces its contents... provided that security requirements regarding ACLs are met" — with no equivalent documented partial-failure taxonomy for the same-volume case. In practice, a same-volume `MoveFileExW`/`rename` on NTFS *is* a single filesystem-metadata operation (this matches decades of observed behaviour and is why Rust, rustup, Cargo, and essentially every other tool rely on it for atomic cache swaps) — but that atomicity is **not** a sentence you will find in Microsoft's public API reference the way POSIX's `rename(2)` man page states it. Treat it as "reliable in practice, undocumented as a formal guarantee" and reserve "documented guarantee" language for the things Microsoft's docs actually commit to (ACL/attribute preservation via `ReplaceFileW`, the specific partial-failure codes, the registry-based deferred-rename mechanism).

Rust's `std::fs::rename` layers its own platform split on top of this: on Windows it "corresponds to MoveFileExW or SetFileInformationByHandle," and *only* on "Windows 10 1607+ with FileRenameInfoEx support" does its type-checking behaviour match Unix (`from` a directory requires `to` to also be an empty directory); on older Windows, "`from` can be anything" but "`to` must not be a directory" ([`std::fs::rename`](https://doc.rust-lang.org/std/fs/fn.rename.html)) — another place where "what Linux CI verified" is not what ships on a Windows box running an older build.

| Operation | Windows: guaranteed | Windows: usually-true only |
|---|---|---|
| Rename (same volume) | Destination name updates | Whole operation is a single atomic transaction (undocumented but reliable in practice) |
| Replace (`ReplaceFileW`) | Three named partial-failure states on error | "Atomic" in the colloquial sense — it is not, by Microsoft's own description |
| Delete | Fails with `ERROR_SHARING_VIOLATION` if any handle lacks `FILE_SHARE_DELETE` | — |
| Symlink create | Succeeds if elevated, or Developer Mode + unprivileged flag | Silent success on an arbitrary user machine |
| Execute | `.exe` extension may be omitted for `Command::new` | Any other extension resolves without it (it does not) |

### 6. Windows: symlinks, junctions, hardlinks

`CreateSymbolicLinkW`'s `dwFlags` documents the unprivileged path explicitly: `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE` (0x2) — "Specify this flag to allow creation of symbolic links when the process is not elevated. Developer Mode must first be enabled on the machine before this option will function" ([`CreateSymbolicLinkW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createsymboliclinkw)). Without either elevation or Developer Mode, the call fails. Rust's own docs for the wrapper say it plainly: *"Windows treats symlink creation as a privileged action... This function is likely to fail unless the user configures their system to permit symlink creation"* ([`std::os::windows::fs::symlink_file`](https://doc.rust-lang.org/std/os/windows/fs/fn.symlink_file.html)).

Neither condition is something a package manager can assume: end users rarely run as admin day-to-day, and Developer Mode is off by default on a stock Windows install and on GitHub-hosted Windows CI runners (widely-documented gotcha — CMake's own source carries a comment checking for exactly this: *"does not have SeCreateSymbolicLinkPrivilege, or if developer mode is not [enabled]"* in `Source/cmcmd.cxx`). This directly affects "link the cached blob into place":

- **Hardlinks** (`CreateHardLinkW`) — no privilege required, same-volume only, files only (not directories). This is the natural fallback for "link a single cached blob file into a toolchain/bin directory."
- **Junctions** (NTFS reparse points, `mklink /J` equivalent) — no privilege required, directories only, always resolve to an absolute local path (no cross-machine/UNC junction targets, no relative targets). This is the fallback when the unit being linked is a whole extracted-package directory rather than a single file.
- **Symlinks** — richest semantics (works for files or directories, can be relative, can target UNC paths) but privilege-gated as above.

The practical rule: prefer hardlink-or-junction as the default link strategy on Windows (matches what the *filesystem*, not the *user's privilege state*, actually requires), and treat symlink support as an opportunistic upgrade you probe for, never depend on.

### 7. Windows: executable semantics and the ocx_shim rationale

There is no executable bit. `std::process::Command`'s own docs describe Windows resolution precisely: when the program name is not an absolute path, Windows searches (1) the child's `PATH` if explicitly set, (2) the current executable's directory, (3) the system directory, (4) the Windows directory, (5) the parent's `PATH` — and "`.exe` files: the extension may be omitted... other extensions must be explicitly included" ([`std::process::Command`](https://doc.rust-lang.org/std/process/struct.Command.html)). That `.exe`-completion is `CreateProcess`'s own narrow behaviour, not the shell's `PATHEXT` mechanism — `PATHEXT` (`.COM;.EXE;.BAT;.CMD;...` by default) governs extension-less lookup in `cmd.exe` and `CreateProcess`'s `SearchPath`-based resolution when *neither* full path nor extension is given, and a bare Rust `Command::new("mytool")` spawn does not walk the full `PATHEXT` list the way typing `mytool` at a `cmd.exe` prompt does.

Why a symlink is not a substitute for `ocx_shim`, even where symlink creation is permitted:

1. **Privilege**: as above, symlink creation may simply fail on the install machine; a shim binary that is itself an ordinary `.exe` file needs no special privilege to place.
2. **Process-lifecycle guarantees a symlink cannot provide**: a symlink just makes `mytool.exe` resolve to the real target; it gives you no hook to enforce that the real child process dies when *the shim* is killed. `ocx_shim` wraps the child spawn in a Job Object specifically for this: "a job object allows groups of processes to be managed as a unit... [including] terminating all processes associated with a job" ([Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)) — the mechanism `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` gives is "closing the last job object handle terminates all associated processes," which is exactly "if the shim dies, so does what it launched," a guarantee Windows does not give you for free the way a POSIX process group + `SIGKILL` does.
3. **~25 unsafe FFI sites** is the cost of doing this correctly: `CreateProcessW`, `CreateJobObjectW`, `AssignProcessToJobObject`, `SetInformationJobObject`, handle lifetime management — all raw WinAPI, all fallible in ways `std::process::Command` alone does not expose (no direct job-object integration in std as of this research pass).

### 8. macOS: case-insensitive APFS and HFS+ NFD normalization

Two separate axes, easy to conflate:

- **Case sensitivity**: APFS defaults to case-insensitive-but-case-preserving (same class of behaviour as NTFS, §3) — a case-sensitive APFS variant exists but is not the out-of-box default on a normal macOS install.
- **Unicode normalization**: legacy HFS+ silently normalized filenames to NFD (decomposed) form on write; current default APFS (since macOS 10.13 High Sierra) does **not** normalize — it preserves the exact byte sequence given. ripgrep's issue #845 is a clean, reproducible demonstration: three files created with three different byte-encodings of "ü" (precomposed via `fopen`, decomposed via `fopen`, and via shell `touch`) all collapsed to the *same* decomposed on-disk form under HFS+ (10.12), but stayed as three visibly-identical-but-byte-distinct filenames under APFS (10.13) — `ls` showed `aü bü cü` under both, but glob matching (`rg -g '*ü'`) only worked under HFS+'s normalized form ([ripgrep#845](https://github.com/BurntSushi/ripgrep/issues/845)). BurntSushi's own diagnosis: *"ripgrep doesn't handle normalization at all... if you search for a composed Unicode codepoint, you won't find files that contain the same glyph in decomposed form and vice versa,"* and concludes fixing it generally would require canonical-equivalence support in the regex engine itself — out of scope, filed as effectively wontfix.

The consequence for grim/ocx: because APFS is the modern default, a normalization bug can pass every CI run and every developer's local testing (all on APFS) and then reappear the instant a user's `$OCX_HOME`/cache lives on an HFS+-formatted external drive, a Time Machine volume, or an old install carried forward — exactly the kind of environment a package manager's cache directory ends up on when a user points it somewhere non-default. The fix is not "detect HFS+" (ripgrep's own analysis shows that's not tractable in general) but "never rely on filesystem-returned byte-equality for a name you also stored elsewhere (lockfile, cache index) — normalize to one form (NFC, via `unicode-normalization` or similar) in your own code before using a package name as a comparison or hash key," independent of what the filesystem underneath happens to do.

### 9. macOS: quarantine, Gatekeeper, notarization

Gatekeeper's default behaviour: "by default, all software in macOS is checked for known malicious content the first time it's opened," verifying "the software originates from an identified developer," is "notariz[ed]... as malware-free," and is unaltered, with user consent requested "before users open downloaded software initially" ([Gatekeeper and runtime protection](https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web)).

The trigger for that check is the `com.apple.quarantine` extended attribute, and — this is the load-bearing, easy-to-miss fact — it is **opt-in per downloading application**, not automatic on every file write: "This attribute is added by the application that downloads the file, such as a web browser or email client... application developers will need to implement this feature into their applications and is not implemented by the system" ([Gatekeeper (macOS) — Wikipedia](https://en.wikipedia.org/wiki/Gatekeeper_(macOS)), summarizing Apple's own quarantine documentation). Concretely: a Rust HTTP client (`reqwest`, `ureq`) writing downloaded bytes via `std::fs::write` does **not** cause `com.apple.quarantine` to appear on that file — that xattr only shows up if the process explicitly sets it, or if the download went through an API that sets it for you (Apple's `URLSession`/`LSFileQuarantineEnabled` machinery), which a Rust HTTP stack does not use.

This means "does downloading-then-writing a file yourself avoid the quarantine flag" is literally true, but the framing matters: it is a decision to make deliberately, not a convenient side effect to lean on. The real-world precedent, and the closest analogue to grim/ocx that exists, is Homebrew Cask, which does the opposite of "avoid the flag" — it explicitly *re-applies* it. Reading Homebrew's own `quarantine.rb`: it shells out to `/usr/bin/xattr` to set `com.apple.quarantine` on every cask download in the format `flags;epoch;download_agent;event_id`, and on upgrade it deliberately *preserves* the user's prior Gatekeeper approval bit (`0x0040`) while still leaving the quarantine attribute in place, citing Apple's own developer-forum guidance to "preserve quarantine provenance so Gatekeeper still checks the upgraded app while carrying forward the user's approval" ([Homebrew `cask/quarantine.rb`](https://raw.githubusercontent.com/Homebrew/brew/master/Library/Homebrew/cask/quarantine.rb)).

The user-visible workaround for a legitimately-trusted binary that got flagged is `xattr -d com.apple.quarantine <path>`, which is exactly the mechanism Homebrew's `quarantine.rb` calls to *release* (not avoid) quarantine after its own verification step passes. For grim/ocx, this is a real decision point: rely on digest verification as the sole trust boundary and skip quarantine entirely (matches "writing it yourself doesn't flag it" — but means Gatekeeper/notarization checks on the *published* artifact, if any exist upstream, never run), or apply the xattr deliberately after your own verification, mirroring Homebrew, so Gatekeeper adds a second, independent check on top of your digest check. Either is defensible; picking neither by accident is not.

### 10. macOS: SIP and legitimate cache locations

System Integrity Protection restricts write access to `/System`, `/bin`, `/sbin`, and most of `/usr` — but explicitly *excludes* `/usr/local` from that `/usr` restriction, along with user home directories and third-party (non-Apple-preinstalled) entries under `/Applications` ([System Integrity Protection — Wikipedia](https://en.wikipedia.org/wiki/System_Integrity_Protection), consistent with Apple's own SIP support documentation). Homebrew's traditional `/usr/local` install root is the textbook example of a package manager operating entirely within SIP-exempt space.

For grim/ocx's own cache, the two legitimate, SIP-untouched conventions are:

- `~/Library/Caches/<reverse-domain-or-qualifier>` — Apple's own "Standard Directories" convention, what the `directories` crate returns for `ProjectDirs::cache_dir()` on macOS ([`directories` docs](https://docs.rs/directories/latest/directories/)).
- `~/.cache/<app>` — XDG, if the project has standardized on XDG paths across all three platforms via `etcetera`'s `choose_base_strategy()`/XDG-everywhere mode; `etcetera`'s own docs note this is what "most CLI tools... on each platform" use, in contrast to native-per-OS conventions better suited to GUI apps ([`etcetera` docs](https://docs.rs/etcetera/latest/etcetera/)).

Both are fine; the failure mode to avoid is picking a location by copy-pasting a Linux-only XDG helper that doesn't know about macOS at all and ending up writing into something SIP-adjacent or into a location Spotlight/Time Machine treat specially without a deliberate choice.

## Normative guidance candidates

1. **Never build a raw string path under a `\\?\` prefix.** Rationale: forward slashes and `.`/`..` stop being resolved under the verbatim prefix, so string concatenation silently produces a broken path where `PathBuf::join` would not. VERIFICATION: `grep -rn '\\\\?\\\\' --include=*.rs` (or `grep -rn 'verbatim\|extended.length' src/`) and confirm every hit builds the tail via `Path`/`PathBuf` methods, never `format!`.
2. **Treat `std::fs::canonicalize`'s output as an opaque identity key, never a joinable/displayable path, on Windows.** Rationale: the returned path is `\\?\`-prefixed; joining with `/`, printing it to the user, or writing it into a lockfile another tool parses will all misbehave. VERIFICATION: `grep -rn 'canonicalize' src/ | grep -v 'PathBuf::join\|HashSet\|HashMap'` — flag any canonicalize result whose only subsequent use is a `format!`/`display()`/string comparison against a non-canonicalized path.
3. **Every rename/replace/delete on a path that a background scanner, another instance of the tool, or the OS loader might have open must retry on `ERROR_SHARING_VIOLATION`/`os error 32`/`os error 5`, not fail on first attempt.** Rationale: rustup's own tracker shows this recurring in production against real antivirus/indexer contention, not a hypothetical. VERIFICATION: `grep -rn 'fn.*rename\|fn.*replace\|std::fs::rename\|std::fs::remove_file' src/ -l`, then confirm each call site is behind a retry-with-backoff wrapper, not a bare `?`.
4. **Cache-blob replacement uses move-then-delete (or `ReplaceFileW`-equivalent with its documented partial-failure codes handled), never a bare overwrite-in-place.** Rationale: overwrite hits the open-handle sharing violation directly; a documented partial-failure API at least gives you a name for the state to recover from. VERIFICATION: read every cache-write path and confirm it writes to a temp name, then renames into place — `grep -rn 'tempfile\|\.tmp"\|persist(' src/cache*`.
5. **Self-update on Windows renames the running executable to a side name and spawns a delete-on-close/next-run cleanup — it does not attempt to delete or overwrite the running `.exe` directly.** Rationale: this is the documented, production-proven rustup pattern; a direct overwrite attempt will hit the read lock every time. VERIFICATION: reading heuristic — find the self-update code path and confirm the Windows branch renames-then-schedules-cleanup rather than calling `fs::write`/`fs::remove_file` on the currently-executing binary's own path.
6. **Never use a `HashMap<String, _>` or filesystem path as a package-identity key without first normalizing case (Windows + macOS) and Unicode form (macOS).** Rationale: both target platforms are case-insensitive by default, and macOS additionally may not preserve the byte-form of non-ASCII names depending on the underlying filesystem. VERIFICATION: `grep -rn 'HashMap<String\|BTreeMap<String' src/` on any type that models a package/component name, confirm keys are lowercased/NFC-normalized at construction, not compared ad hoc.
7. **Every archive extractor validates each entry name against the reserved-device-name list, trailing dot/space, and the Win32 reserved-character set — before the joined path is computed, and again after.** Rationale: reserved names are reserved with any extension attached, so a naive "check the exact string" gate misses `NUL.txt`; the second check (post-join) catches encoded traversal that only becomes visible after normalization. VERIFICATION: `grep -rn 'fn.*extract\|fn.*unpack' src/` then confirm a shared validation function (see §4 code) runs on every entry, not only on entries that "look suspicious."
8. **Blob-linking on Windows tries hardlink (files) or junction (directories) first, and only attempts a true symlink as an opportunistic upgrade behind a capability probe, never as the sole implementation.** Rationale: symlink creation is privilege-gated and will fail silently for a large fraction of real users and for CI runners that haven't enabled Developer Mode. VERIFICATION: `grep -rn 'symlink_file\|symlink_dir\|CreateSymbolicLink' src/` and confirm every call site has a documented fallback path, not a bare `?`.
9. **Any behaviour claimed as "atomic" on Windows must cite which specific API guarantee backs that claim** (same-volume rename's undocumented-but-reliable transactionality is not the same tier of guarantee as `ReplaceFileW`'s documented partial-failure codes). Rationale: conflating "usually true" with "guaranteed" is exactly how a Windows-only data-loss bug survives review by someone who only tested on Linux. VERIFICATION: reading heuristic on any code comment or doc string containing the word "atomic" in a Windows code path — it must name the API and, ideally, link the table in §5.
10. **The launcher for a downloaded/cached executable is the `ocx_shim`-style wrapper with a Job Object on Windows, never a plain symlink or a bare re-exec.** Rationale: neither a symlink nor an un-jobbed `CreateProcess` guarantees the child dies with the parent, which a package-manager-installed shim must guarantee to avoid orphaned processes after an update or uninstall. VERIFICATION: `grep -rn 'CreateProcessW\|Command::new' src/ | grep -i shim` and confirm any Windows launcher path also calls `CreateJobObjectW`/`AssignProcessToJobObject`.
11. **Decide explicitly, in one place, whether downloaded macOS binaries get `com.apple.quarantine` applied by grim/ocx itself — do not leave it as an accidental side effect of using a Rust HTTP client.** Rationale: a plain `std::fs::write` does not set the flag; silence here is a security posture, not a neutral default. VERIFICATION: `grep -rn 'quarantine\|xattr' src/` on macOS-specific code — the absence of any hit is itself the signal to raise in review, not proof the topic was considered.
12. **macOS/Windows cache and config directories come from one platform-conventions module (`directories` or `etcetera`, picked once), never a hand-rolled `if cfg!(target_os = "macos")` branch per call site.** Rationale: SIP-exempt vs SIP-adjacent, and XDG-vs-native, are project-wide policy choices, not per-call-site judgment calls. VERIFICATION: `grep -rn 'HOME\|USERPROFILE\|Library/Caches\|APPDATA' src/ | grep -v 'directories::\|etcetera::'` — any hit outside the platform-conventions module is a violation.
13. **One `platform` module owns `replace_file`, `link_blob`, `is_locked_err`, and equivalents — call sites branch on the *outcome* of these functions, not on `cfg(windows)`/`cfg(target_os)` directly.** Rationale: the reasoning at call sites (retry? fall back to hardlink? surface to the user?) is identical across platforms even though the underlying syscalls are not; scattering `cfg` blocks duplicates that reasoning and drifts. VERIFICATION: `grep -rn '#\[cfg(windows)\]\|#\[cfg(target_os = "macos")\]\|#\[cfg(unix)\]' src/ --include=*.rs | grep -v 'src/platform/'` — any hit outside the platform module is a candidate to consolidate.

## AI-agent angle

An LLM writing this codebase's Rust defaults to Unix assumptions because that's the statistically dominant training distribution for "how does file I/O work" — and because it is graded by whether the code compiles and passes tests, both of which happen on the Linux sandbox it runs in. Concretely, an agent will:

- Write `format!("{}/{}", dir.display(), name)` instead of `dir.join(name)` — invisible on Linux, breaks the instant `dir` is a canonicalized `\\?\`-prefixed Windows path (§1). **Mechanical check**: `grep -rn 'format!.*display()' src/` — any hit building a path (not a log message) is a defect.
- Assume `fs::rename` overwriting an existing destination "just works" the same everywhere, missing that pre-1607 Windows without `FileRenameInfoEx` support enforces a stricter type match, and that `ReplaceFileW`'s partial-failure states exist at all (§5). **Mechanical check**: search the diff for `fs::rename`/`ReplaceFile` calls with no adjacent error-match arm naming a Windows-specific error code.
- Model `HashMap<String, PackageId>` keys as byte-equal across platforms, missing case-insensitivity (Windows/macOS) and NFC/NFD drift (macOS/HFS+) (§3, §8). **Mechanical check**: `cargo clippy` will not catch this — it requires a reading pass on any type deriving `Hash`/`Eq` over a `String` that originated from a filesystem path or user-typed package name, checking for a `.to_lowercase()`/NFC-normalize step at construction.
- Write a Windows symlink call with no fallback and no error handling beyond `?`, because the agent's mental model of "create a link" comes from Unix where it unconditionally works for an unprivileged user (§6). **Mechanical check**: `grep -rn 'symlink' src/` — the fix isn't a lint, it's confirming a `match`/fallback exists, not a bare propagate.
- Never consider `com.apple.quarantine` at all, because nothing in a typical Rust HTTP-download tutorial mentions it — the omission won't show up as a compiler warning or a failing Linux/macOS-CI-without-a-real-Gatekeeper-check test (§9). **Mechanical check**: this is not clippy-catchable; it needs an explicit line item in a macOS-specific code-review checklist asking "was quarantine handling a deliberate decision," since its absence produces no signal at all — the code just silently behaves as "never quarantines," which looks identical to "we decided not to."
- Claim something is "atomic" in a doc comment on a Windows code path without checking which specific guarantee it's leaning on (§5) — the word reads as correct English regardless of whether it's `ReplaceFileW`'s documented behaviour or same-volume rename's folklore reliability. **Mechanical check**: `grep -rn 'atomic' src/ --include=*.rs -B2 -A2` on any Windows-`cfg`'d block, and require the accompanying comment name the specific API.

The single highest-leverage catch across all of the above: a Windows and a macOS CI job that actually *runs* (not just compiles) the cache-replace, self-update, and archive-extraction code paths against fixtures containing a case-variant pair, a reserved-device-name entry, and a locked-file contention scenario. None of these are things `cargo check` or Linux CI can see (Summary #18) — they require execution on the real OS.

## Contested / evolving

- **Windows long-path opt-in is per-machine (registry) plus per-app (manifest), and both requirements are stated by Microsoft as necessary — yet in practice the `\\?\` prefix bypasses the opt-in entirely on any Windows version.** Which one grim/ocx should rely on (ship a manifest and hope the machine-wide registry key is set, or always prepend `\\?\` internally and accept its stricter parsing rules) is a genuinely open design choice, not a settled one; ripgrep never resolved it and still documents it as a known limitation years later.
- **NTFS same-volume rename's atomicity is treated as safe-to-rely-on by essentially the entire Rust ecosystem (Cargo, rustup) despite Microsoft's public docs never stating it as a formal guarantee the way `ReplaceFileW`'s error codes are documented.** This research pass could not find a Microsoft source that commits to it in writing; the practice is universal, the citation is not there. Flag this explicitly rather than silently upgrading "everyone relies on it" to "it's guaranteed."
- **Directory `fsync`-for-durability has no confirmed Windows analogue in the primary sources read for this pass.** `FlushFileBuffers` exists for file handles; whether it does anything meaningful called on a directory handle was not established here and should not be assumed either way without a dedicated follow-up against `FlushFileBuffers` documentation specifically.
- **HFS+ is legacy (APFS has been the default since 10.13, 2017) but not dead** — external drives, some Time Machine backup formats, and old installs can still present HFS+ to a modern macOS process. Whether grim/ocx should spend engineering effort defending against HFS+ NFD drift, versus documenting it as an unsupported configuration, is a product decision this research does not settle — it only establishes that the failure mode is real and not purely historical (ripgrep's issue is from 2018 but the underlying HFS+ behaviour it describes hasn't changed).
- **Whether a Rust package manager should apply `com.apple.quarantine` itself (Homebrew's choice) or rely purely on digest verification (the "avoid the flag by writing it yourself" reading) is unresolved industry practice, not a settled convention** — Homebrew's own comments cite informal Apple developer-forum guidance, not a published Apple spec, as the basis for its approach. Expect this to keep shifting as Apple's own notarization requirements tighten.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) | Microsoft Win32 primary doc | Updated 2024-08 | Canonical source for MAX_PATH, `\\?\`, reserved names, invalid characters, trailing dot/space |
| [Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation) | Microsoft Win32 primary doc | Updated 2024-07 | The long-path opt-in: exact registry key, manifest snippet, and the enumerated function list it affects |
| [MoveFileExW function](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw) | Microsoft Win32 API reference | Updated 2025-07 | Flags, `PendingFileRenameOperations` registry mechanism, elevation requirement for `MOVEFILE_DELAY_UNTIL_REBOOT` |
| [ReplaceFileW function](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) | Microsoft Win32 API reference | Updated 2025-07 | Proves `ReplaceFile` is multi-step, not atomic — the three named partial-failure error codes |
| [CreateSymbolicLinkW function](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createsymboliclinkw) | Microsoft Win32 API reference | Updated 2025-07 | `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE` + Developer Mode requirement, stated exactly |
| [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) | Microsoft Win32 conceptual doc | Updated 2025-07 | Basis for the `ocx_shim` child-lifecycle-guarantee rationale (`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`) |
| [Environment Variables (Win32)](https://learn.microsoft.com/en-us/windows/win32/procthread/environment-variables) | Microsoft Win32 conceptual doc | Updated 2025-07 | General environment-block mechanics referenced when discussing `PATHEXT`/child process env |
| [`std::fs::rename`](https://doc.rust-lang.org/std/fs/fn.rename.html) | Rust std library docs | Current stable | Platform-specific behaviour section: pre-/post-1607 Windows type-check divergence |
| [`std::fs::canonicalize`](https://doc.rust-lang.org/std/fs/fn.canonicalize.html) | Rust std library docs | Current stable | The `\\?\`-prefix-on-return footgun, stated by the stdlib itself |
| [`std::os::windows::fs::symlink_file`](https://doc.rust-lang.org/std/os/windows/fs/fn.symlink_file.html) | Rust std library docs | Current stable | Stdlib's own warning that symlink creation "is likely to fail" without configuration |
| [`std::process::Command`](https://doc.rust-lang.org/std/process/struct.Command.html) | Rust std library docs | Current stable | Windows executable-resolution order and `.exe`-extension-omission behaviour, exact wording |
| [rustup#4181 — os error 32 file-in-use on update](https://github.com/rust-lang/rustup/issues/4181) | GitHub issue, still open (2025) | 2025 | Production-scale, recent evidence of `ERROR_SHARING_VIOLATION`-class failures during ordinary use |
| [rustup#2441 — Windows file locking design issue](https://github.com/rust-lang/rustup/issues/2441) | GitHub design-discussion issue | 2020–present | States the rename-succeeds/delete-fails asymmetry explicitly; frames the self-update problem space |
| [rustup `self_update/windows.rs` (raw source)](https://raw.githubusercontent.com/rust-lang/rustup/master/src/cli/self_update/windows.rs) | Production source code | Current `master` | The actual "rename a running executable + delete-on-close helper" implementation, with rationale comments |
| [ripgrep#364 — long file name support](https://github.com/BurntSushi/ripgrep/issues/364) | GitHub issue, closed as wontfix/limitation | 2017 | Concrete `MAX_PATH` failure with exact repro and error code; maintainer's own admission of Windows unfamiliarity |
| [ripgrep#845 — glob patterns and umlauts on HFS vs APFS](https://github.com/BurntSushi/ripgrep/issues/845) | GitHub issue, closed as wontfix | 2018 | Direct, reproducible proof that HFS+ normalizes to NFD and APFS does not — corrects the "HFS+ NFD legacy" framing precisely |
| [Gatekeeper and runtime protection](https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web) | Apple Platform Security Guide | Current | Apple's own statement of what Gatekeeper checks and when it prompts the user |
| [Homebrew `cask/quarantine.rb` (raw source)](https://raw.githubusercontent.com/Homebrew/brew/master/Library/Homebrew/cask/quarantine.rb) | Production source code | Current `master` | The closest real-world package-manager analogue: explicitly re-applies `com.apple.quarantine` after its own download, with cited rationale |
| [Gatekeeper (macOS) — Wikipedia](https://en.wikipedia.org/wiki/Gatekeeper_(macOS)) | Secondary, Apple-sourced summary | Current | States the "quarantine is opt-in per downloading app, not automatic" fact plainly, with the BitTorrent-client counterexample |
| [System Integrity Protection — Wikipedia](https://en.wikipedia.org/wiki/System_Integrity_Protection) | Secondary, Apple-sourced summary | Current | SIP's protected-path list and the `/usr/local` carve-out |
| [`directories` crate docs](https://docs.rs/directories/latest/directories/) | Crate documentation | Current | Native per-OS convention crate (Known Folder API / XDG / Apple Standard Directories) |
| [`etcetera` crate docs](https://docs.rs/etcetera/latest/etcetera/) | Crate documentation | Current | XDG-everywhere-vs-native strategy choice, with the crate author's own guidance on when to prefer which |

