---
title: Durable writes, content-addressed stores, path types and traversal (Swift, SW-IO)
topic: Files, processes and formats — durable file replace, CAS blob publish, FilePath vs URL vs String, archive traversal guard, temp files, permissions, locks
agent: files-and-paths
model: sonnet
date_researched: 2026-10-10
sources_count: 31
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/files-and-paths/
scope: >
  Covers rows M-G-01..05, M-G-17..19 and M-I-04 on Linux (Swift 6.4.0 and 6.3.3 via the Docker toolchain): what Data.write(.atomic),
  FileManager.replaceItemAt and NIOFS replaceItem really do, a durable-write helper, the CAS publish recipe, the path-type choice,
  the two-layer traversal guard, temp-file/permission/lock rules. Apple-platform and Windows behaviour is READ ONLY and marked
  "unverified: read only" (no macOS, no Xcode, owner Q7 not granted). Not covered: subprocess (M-G-06..09), JSON determinism, network clients.
---

# Durable writes, CAS stores, path types and traversal

Everything below was measured on 2026-10-10. `FIX` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/files-and-paths`.
Exemplar citations are `repo@sha12:path:line` into `~/.cache/research-lang/exemplars/swift/`. Cross-language principles
(durability ladder, persist-if-absent, orphan sweep) are already in `rules/rust-quality/durable-state.md` (STATE-1..8, 28..35); this file
supplies the Swift-specific mechanics and does not restate them.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. What `Data.write(.atomic)` does on Linux](#1-what-datawriteatomic-does-on-linux-swift-64-and-63)
   - [2. `FileManager.replaceItemAt` and NIOFS `replaceItem`](#2-filemanagerreplaceitemat-and-niofs-replaceitem-are-not-the-durable-replace)
   - [3. The durable-write helper (verbatim, compiled, traced)](#3-the-durable-write-helper-verbatim)
   - [4. The CAS write recipe](#4-the-cas-write-recipe)
   - [5. Path type: FilePath, URL, String](#5-path-type-filepath-url-string)
   - [6. Traversal guard for archive extraction](#6-traversal-guard-for-archive-extraction-two-layers)
   - [7. Temp files, EXDEV, permissions and umask](#7-temp-files-exdev-permissions-and-umask)
   - [8. Lock files](#8-lock-files)
   - [9. Windows (unverified: read only)](#9-windows-unverified-read-only)
   - [10. Apple platforms (unverified: read only)](#10-apple-platforms-unverified-read-only)
   - [11. Tooling facts discovered while verifying](#11-tooling-facts-discovered-while-verifying)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `Data.write(to:options: .atomic)` on Linux 6.3.3 and 6.4.0 writes a `.dat.nosync<hexpid>.XXXXXX` temp **in the target's directory**, `fsync`s the file, `rename`s it, and **never fsyncs the directory**; strace shows no `fsync` on the directory fd (fixture a, red on both toolchains).
- `.atomic` is atomic for readers, not durable against power loss: a durable replace is temp-in-same-dir, `write`, `fchmod`, `fsync(fd)`, checked `close`, `rename`, `fsync(dirfd)`; the 25-line helper in §3 does exactly this and goes green under strace.
- `Data.write(to:)` without `.atomic` is `open(O_WRONLY|O_CREAT|O_TRUNC)` on the final name followed by `fsync`; it truncates in place and leaves torn files under the final name, so it must never write a digest-named blob.
- `.atomic` does **not** preserve the mode of the file it replaces on Linux 6.3.3 or 6.4.0 (0600 became 0644 under umask 022); swift-foundation `main` @aadd9259be07 adds an `fstatat`/`fchmod` restore, `release/6.3` does it only under `FOUNDATION_FRAMEWORK`. Set the mode explicitly with `fchmod` before `fsync`.
- `FileManager.replaceItemAt` on Linux 6.4.0 is `renameat2(RENAME_EXCHANGE)` + `unlink(staged)` + `chmod`, requires the target to exist, and never fsyncs the directory; on Linux **6.3.3 it is destructive**: `renameat` is called with swapped arguments, the target vanishes and the staged file ends up holding the OLD bytes (measured, fixture r).
- NIOFS/`_NIOFileSystem` `replaceItem(at:withItemAt:)` documents "Uses the `rename(2)` system call" but is `removeItem(destination)`, `moveItem`, `removeItem(existing)`: strace shows `unlink(target)` before `rename`, so a crash in between loses the target.
- The published SwiftNIO library product is `_NIOFileSystem` (module `NIOFileSystem`, `SystemPackage.FilePath`); the `NIOFS` target with `NIOFilePath` exists in the repo but `.product(name: "NIOFS", package: "swift-nio")` fails to resolve at swift-nio 2.104.0.
- CAS write recipe: stage in a directory on the same filesystem as the store, hash while writing, compare to the expected digest **before** publishing, unlink the temp on mismatch, publish with `link()` (EEXIST means already published), `fchmod 0444`, `fsync` file then blobs directory. The naive write-then-compare leaves a blob under the digest name (fixture b red); the recipe leaves zero files (green, 6.4 and 6.3).
- `FilePath` is **not** in the Swift 6.4 stdlib: `cannot find 'FilePath' in scope` on 6.4.0 and 6.3.3 with only `import Foundation`; `import System` does not exist on Linux (`no such module 'System'`). Use `import SystemPackage` (swift-system 1.8.1, resolved 2026-10-10; 1.7+ needs Swift 6.1+). SE-0529 was accepted with modifications on 2026-06-05 but no 6.4 release note lists it.
- swift-system has no public `openat`, `mkdirat`, `renameat`, `fsync`, `flock`; anything fd-anchored comes from `Glibc`/`Musl`/`Darwin`, so the traversal guard and the durable helper import the C module next to `SystemPackage`.
- Path-join traps measured: `URL.appendingPathComponent("../evil")` gives `/srv/store/../evil`; `FilePath.appending("../evil")` the same; `FilePath.pushing("/etc/passwd")` **replaces** the base; `String.hasPrefix("/srv/store")` accepts `/srv/store-evil/x` while `FilePath.starts(with:)` is component-wise.
- A traversal guard needs two layers. Lexical-only (reject absolute and `..`, including swift-system's `lexicallyResolving`) passes a `link -> ..` symlink entry followed by `link/pwned` and writes outside the root (fixture c, red); an `openat(O_NOFOLLOW|O_DIRECTORY)` walk per component refuses it (green, errno 20 `ENOTDIR`). `O_NOFOLLOW` alone only guards the final component.
- Stage in the destination's directory, never `NSTemporaryDirectory()`/`FileManager.temporaryDirectory`: `rename` across filesystems returns `EXDEV` and `FileManager.moveItem` then silently falls back to copy+delete, which is neither atomic nor durable.
- Permissions: files created through `open(…, 0o666)`, `Data.write`, `FileManager.createFile` get `0666 & ~umask` (600 under 077, 644 under 022); `createDirectory` gets `0777 & ~umask`; only `fchmod`/`open` with an explicit `0o600` is umask-independent for secrets.
- A create-exclusive PID lock file (swiftly `FileLock`, `Data.write(.withoutOverwriting)`) stays stuck after `SIGKILL` (second invocation refused, rc 75); `flock(fd, LOCK_EX | LOCK_NB)` is released by the kernel at process death (green).
- `String` is lossy for paths: a file name with byte `0xFF` is listed by `FileManager.contentsOfDirectory` as a name with U+FFFD and `fileExists(atPath:)` on it returns false, while `FilePath(platformString:)` still stats it.
- Windows and macOS rows are read-only: Foundation's Windows branch uses `FILE_RENAME_FLAG_POSIX_SEMANTICS` then `MoveFileExW`; NIOFS stubs `fsync` with `fatalError` on Windows; no Windows durability claim is admissible; macOS needs `F_FULLFSYNC` and 0 of 40 exemplars use it.
- SwiftLint 0.65.1's static binary here cannot run `custom_rules` ("SourceKit access is prohibited"), so no SwiftLint ban was watched red; the grep forms in §Normative are the admissible checks.

## Findings

### 1. What `Data.write(.atomic)` does on Linux (Swift 6.4 and 6.3)

Source read (main, [swift-foundation@aadd9259be07](https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Data/Data%2BWriting.swift)):

- Temp name is `.dat.nosync<hex pid>.XXXXXX`, created next to the target with `O_CREAT|O_EXCL|O_RDWR` and retried up to 7 times: `swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:188-197` (template), `:214,278-280` (open flags).
- The fd is `fsync`ed for every write, atomic or not: `:403` (`let res = fsync(fd)`); `EINVAL` from special files is ignored on Linux `:408-411`.
- The rename is `renameat(tempDirfd, aux, destDirfd, basename)`: `:669`, with an `EINVAL` swap fallback `:670-698` and an `EBUSY` non-atomic retry `:701-706`.
- The destination directory is opened once (`minimalOpenFlagsForDirectories`) and pinned, so the temp lands in the intended directory even if a directory symlink is swapped (`:584-596` comment). There is **no `fsync` on that directory descriptor anywhere in the file** (grep: the only `fsync(` is `:403`).
- main restores the mode of an existing file: `fstatat(... AT_SYMLINK_NOFOLLOW)` `:612`, temp opened `0o600` when replacing / `0o666` when new `:620`, `fchmod(fd, mode)` before the rename `:658`. The 0o600 floor is `:91-95`.
- Release 6.3 only captures the old mode under `FOUNDATION_FRAMEWORK` (Darwin): [swift-foundation release/6.3 Data+Writing.swift:481-506](https://github.com/swiftlang/swift-foundation/blob/release/6.3/Sources/FoundationEssentials/Data/Data%2BWriting.swift); on Linux `mode` stays nil.

Measured (fixture `ae`, executable `fx`, strace 7.2 inside the `swift:6.4` image, `-f -y -e trace=fsync,fdatasync,rename,renameat,renameat2`):

```text
9  fsync(3<…/work/a-naive/.dat.nosync9.fVb1lu>) = 0
9  rename("…/work/a-naive/.dat.nosync9.fVb1lu", "…/work/a-naive/target") = 0
                                      (no fsync of …/work/a-naive>)
```

6.3.3 (static-stdlib build run in the 6.4 image, see §11) gives the same two lines with `.dat.nosyncA.hsQqUO`. Mode (fixture `e`, 6.4.0 and 6.3.3 identical, `diff` empty): replacing a 0600 file under umask 022 with `.atomic` leaves `0644`.

Non-atomic `Data.write(to:)` (fixture `h-datawrite`, strace):

```text
openat(AT_FDCWD<…>, "work/h-datawrite/blob", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 3<…/blob>
fsync(3<…/blob>) = 0                         # no rename, no temp: the final name is truncated in place
```

Why this matters: `.atomic` gives "old bytes or new bytes" to concurrent readers; it gives no ordering guarantee between the rename and the directory entry reaching disk. The kernel docs say so directly: `fsync` on the file "does not necessarily ensure that the entry in the directory containing the file has also reached disk. For that an explicit fsync() on a file descriptor for the directory is also needed" ([fsync(2)](https://man.archlinux.org/man/fsync.2.en)); the canonical sequence is "create a new temp file (on the same file system!), write data, fsync() the temp file, rename, fsync() the containing directory" ([LWN, Ensuring data reaches disk](https://lwn.net/Articles/457667/)). No exemplar calls `fsync` on a directory (0/40; the 3 repos with `fsync(` use it on data files or tests; swift-nio's `synchronize()` is only ever called on handles in tests/loggers).

### 2. `FileManager.replaceItemAt` and NIOFS `replaceItem` are not the durable replace

**Foundation, Linux, 6.4.0** (fixture `ae`, `r-replace`, strace with `unlink,chmod` added):

```text
fsync(3<work/r-replace/target.staged>) = 0       # from writing the staged file, not from replaceItemAt
renameat2(AT_FDCWD, "work/r-replace/target.staged", AT_FDCWD, "work/r-replace/target", RENAME_EXCHANGE) = 0
unlink("work/r-replace/target.staged") = 0
chmod("work/r-replace/target", 0644) = 0         # old permissions re-applied AFTER the swap
```

Source: [swift-corelibs-foundation main FileManager+POSIX.swift:465-560](https://github.com/swiftlang/swift-corelibs-foundation/blob/main/Sources/Foundation/FileManager%2BPOSIX.swift): `attributesOfItem(atPath: original)` first, so a missing target throws (`NSCocoaErrorDomain Code=4`); `renameat2(RENAME_EXCHANGE)` when `_CFHasRenameat2 && kernelSupportsRenameat2`, else `renameat`; then `removeItem(newItemURL)` and `setAttributes(permissions)`. No directory `fsync`; the final `chmod` is a second, non-atomic step. [PR 5454](https://github.com/swiftlang/swift-corelibs-foundation/pull/5454) (merged 2026-04-15) added the cleanup of the swapped item.

**Foundation, Linux, 6.3.3: destructive.** [release/6.3 FileManager+POSIX.swift:527,534](https://github.com/swiftlang/swift-corelibs-foundation/blob/release/6.3/Sources/Foundation/FileManager%2BPOSIX.swift) passes `(originalFS, newItemFS)` where main passes `(newItemFS, originalFS)`. Measured on 6.3.3 (target held `old`, staged held `payload`):

```text
renameat(AT_FDCWD, "work/r-replace63/target", AT_FDCWD, "work/r-replace63/target.staged") = 0
chmod("work/r-replace63/target", 0644) = -1 ENOENT
=> directory holds only target.staged containing "old"; the new content is gone and the call throws
```

**NIOFS** (`swift-nio@e12881f2a691`): the docstring says "Uses the `rename(2)` system call" but the body is `removeItem(at: destination)`, `moveItem`, `removeItem(at: existing)`: `Sources/NIOFS/FileSystem.swift:577-590` and `Sources/_NIOFileSystem/FileSystem.swift:569-582`. `moveItem` falls back to copy+remove on `.differentLogicalDevices`: `Sources/NIOFS/FileSystem.swift:543-556`. Measured on swift-nio 2.104.0 through the public `_NIOFileSystem` product (fixture `f-niofs`):

```text
fsync(6<…/#13781974>(deleted)) = 0           # my explicit h.synchronize() on the staged handle
unlink("work/f-niofs/target") = 0            # <-- the old target is gone here
rename("work/f-niofs/target.staged", "work/f-niofs/target") = 0
```

A crash between the `unlink` and the `rename` leaves no target and (until recovery) a staged file only. Handles expose `synchronize()` (`Sources/NIOFS/FileHandleProtocol.swift:112`), but nothing in NIOFS fsyncs a directory after a rename. On Windows the NIOFS `fsync` is a stub: `Sources/NIOFS/Internal/System Calls/SystemPackage+Windows.swift:265-266` (`fatalError("fsync is unavailable on Windows")`) (unverified: read only).

### 3. The durable-write helper (verbatim)

Compiled with `-Xswiftc -warnings-as-errors` on 6.4 in language mode 6 (tools 6.2), run under strace on 6.4 and (as a 6.3.3 static build) 6.3. `Foundation` supplies `URL`, `UUID`, `POSIXError`; the libc module supplies the syscalls (swift-system has none of them publicly, §11). The `canImport(Musl)` branch is untested (no static-Linux SDK here).

```swift
import Foundation
#if canImport(Glibc)
import Glibc
#elseif canImport(Musl)
import Musl
#elseif canImport(Darwin)
import Darwin
#endif

/// Durable atomic replace (POSIX): temp in the target's own directory, fsync the
/// file, rename, fsync the directory. Any failure unlinks the temp and throws.
func durableWrite(_ bytes: [UInt8], to target: String, mode: mode_t = 0o644) throws {
    func check(_ rc: Int32, _ op: String) throws { if rc != 0 { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO, userInfo: ["op": op]) } }
    let dir = URL(fileURLWithPath: target).deletingLastPathComponent().path
    let tmp = dir + "/.tmp-" + UUID().uuidString
    let fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, mode)
    try check(fd < 0 ? -1 : 0, "open")
    var published = false
    defer { if !published { unlink(tmp) } }
    do {
        var off = 0
        while off < bytes.count {
            let n = bytes[off...].withUnsafeBytes { write(fd, $0.baseAddress, $0.count) }
            if n < 0 { if errno == EINTR { continue }; try check(-1, "write") }
            off += n
        }
        try check(fchmod(fd, mode), "fchmod")  // before fsync; independent of umask
        try check(fsync(fd), "fsync")          // failure is fatal, never retried
    } catch { close(fd); throw error }
    try check(close(fd), "close")
    try check(rename(tmp, target), "rename")
    published = true
    let dfd = open(dir, O_RDONLY | O_DIRECTORY | O_CLOEXEC)
    try check(dfd < 0 ? -1 : 0, "open dir")
    defer { close(dfd) }
    try check(fsync(dfd), "fsync dir")         // makes the rename survive power loss
}
```

Strace of the helper (green): `fsync(3<work/a-durable/.tmp-D3FE…>) = 0`, `rename("work/a-durable/.tmp-D3FE…", "work/a-durable/target") = 0`, `fsync(3<work/a-durable>) = 0`.

Properties worth keeping when an agent edits it: temp in the same directory (same filesystem by construction); `O_EXCL|O_NOFOLLOW` on the temp; `fchmod` before `fsync` (a later metadata change would not be covered by `fdatasync`); `rename` replaces a symlink at `target` rather than following it; temp unlinked on every failure; a `fsync(dirfd)` failure after the rename still throws (the data is visible but not durable, the caller must know). The helper does not sweep orphan `.tmp-*` files after a crash: run the orphan sweep from `rust-quality/durable-state.md` STATE-7/8 at start-up.

### 4. The CAS write recipe

Exemplar reading (`containerization@3e7bc39e66b3`):

- Good shape: `Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:168-184` streams the blob into `ingestDir/<UUID>` (`fetchBlob … into: tempFile`), compares `digest.digestString == descriptor.digest`, throws `digest mismatch` otherwise, then `moveItem` to `ingestDir/<digest>`, treating `NSFileWriteFileExistsError` as success. The hash is computed while writing (`RegistryClient+Fetch.swift:197-234`, one `SHA256` updated per chunk).
- `ContentWriter.create(from:)` copies in 1 MiB chunks to a UUID temp in the store directory, hashes while copying, `moveItem`s to the digest name and swallows "already exists": `Sources/ContainerizationOCI/Content/ContentWriter.swift:58-70,109-136`. `copy(from:)` opens the source with `O_RDONLY|O_NOFOLLOW`, requires `S_IFREG` (`:80-96`) and creates the destination `O_CREAT|O_EXCL` (`:98`).
- Anti-pattern in the same file: `ContentWriter.write(_ data:)` is `try data.write(to: destination)` on the digest-named path: `ContentWriter.swift:50` (non-atomic, §1 trace: `O_TRUNC` in place).
- `LocalContentStore.completeIngestSession` trusts the temp file's name as its digest, uses `fileExists` then `moveItem` (a TOCTOU, harmless only because the content is addressed): `Sources/ContainerizationOCI/Content/LocalContentStore.swift:194-198`. No `fsync` anywhere in the store path (grep: the only `fsync(` in the repo is a test and `NBDServer.swift:355`).
- Digest to path is validated once: `ParsedDigest.path(in:)` resolves the root once and checks the parent equals the root: `Sources/ContainerizationOCI/Content/Digest.swift:119-131`, and `validatedDigestEncoding()` returns an allow-listed component (`:134+`).

Fixture `b-cas` (swift-crypto `Crypto.SHA256`), the recipe verbatim:

```swift
func putVerified(store: String, expected: String, src: String) throws {
    let tmp = "\(store)/ingest/.tmp-\(UUID().uuidString)"      // ingest/ and blobs/ share a filesystem
    let final = "\(store)/blobs/\(expected)"
    let fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0o600)
    try chk(fd < 0 ? -1 : 0, "open tmp")
    defer { unlink(tmp) }                      // temp never outlives the call, success or failure
    do {
        let actual = try copyHashing(from: src, toFD: fd)       // hash while writing
        guard actual == expected else { throw DigestMismatch(expected: expected, actual: actual) }
        try chk(fchmod(fd, 0o444), "fchmod")   // read-only blob
        try chk(fsync(fd), "fsync")
    } catch { close(fd); throw error }
    try chk(close(fd), "close")
    if link(tmp, final) != 0 && errno != EEXIST { throw Posix(op: "link", code: errno) }  // EEXIST = already published = success
    let dfd = open("\(store)/blobs", O_RDONLY | O_DIRECTORY | O_CLOEXEC)
    try chk(dfd < 0 ? -1 : 0, "open blobs dir"); defer { close(dfd) }
    try chk(fsync(dfd), "fsync blobs dir")
}
```

`link()` is the persist-if-absent primitive (STATE-28); `rename()` would silently replace an existing blob's inode. The `try` on `link` fails with `EXDEV` if `ingest/` and `blobs/` are on different mounts: keep both under one store root and never bind-mount one of them.

### 5. Path type: FilePath, URL, String

Availability (fixture `d-filepath`, package with `swift-system` 1.8.1 resolved 2026-10-10):

```text
Sources/Bare/main.swift:  import Foundation ; let p = FilePath("/var/www/index.html")
error: cannot find 'FilePath' in scope                      # 6.4.0 exit 1, 6.3.3 exit 1
Sources/WithSys/main.swift: import SystemPackage ; … FilePath(...)  -> Build complete, runs: "/var/www index.html"   # exit 0 on both
import System   ->  error: no such module 'System'          # Linux, 6.4.0 (swiftc -typecheck)
CommandLine.executablePath -> error: type 'CommandLine' has no member 'executablePath'   # SE-0513, also not in 6.4
```

[SE-0529](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md) is "Accepted with modifications"; John McCall's acceptance post is dated 2026-06-05 ([forums](https://forums.swift.org/t/accepted-with-modifications-se-0529-filepath/87125)). Its source-compat sketch is `#if compiler(>=6.4) // or whichever version this lands in` then `public typealias FilePath = Swift.FilePath`; 6.4.0 does not contain it and the [6.4 release blog](https://www.swift.org/blog/swift-6.4-released/) never mentions `FilePath`, so do **not** guard on `compiler(>=6.4)`. Lexical resolve-beneath was **deferred** out of SE-0529 ("part of the original pitch … deferred to future work", line 601); `resolve()` is `@available(*, noasync)` and the review thread records the TOCTOU objections ([review](https://forums.swift.org/t/se-0529-add-filepath-to-the-standard-library/86194)); John McCall there: `..` "cannot be normalized away on Unix-like systems because of symbolic links".

swift-system facts (`swift-system@486d48c80fce`): README table, 1.7.0-1.8.x need Swift >= 6.1 (`README.md:90-91`); Windows source stability is "Unstable" (`README.md:58-64`); public `FileDescriptor` surface is `open` (absolute-path), `close`, `seek`, `read`, `pread`, `write`, `pwrite`, `duplicate`, `pipe`, `resize` (`Sources/System/FileOperations.swift`, `FileDescriptor.swift`) with `OpenOptions.noFollow` (`FileDescriptor.swift:232`); `openat` exists only as an internal `system_openat` (`Internals/Syscalls.swift:261`); `fsync` is internal; the `FileSystem/` folder is `Stat`/`FileFlags`/`FileMode` types. `FilePath.lexicallyResolving(_:)` returns `nil` when `..` escapes the base and its own doc says "escaping symlinks nested inside of `self` can still be targeted" (`Sources/System/FilePath/FilePathSyntax.swift:405-426`).

Behaviour (fixture `g-paths`, Linux, 6.4.0 and 6.3.3 output byte-identical):

```text
URL("/srv/store").appendingPathComponent("../evil").path               /srv/store/../evil
  … .standardized.path                                                  /srv/evil
URL … appendingPathComponent("/etc/passwd").path                        /srv/store/etc/passwd
URL(fileURLWithPath: "C:\\a\\b").path                                   <cwd>/C:\a\b   (relative on Linux)
FilePath("/srv/store").appending("../evil")                             /srv/store/../evil
FilePath("/srv/store").pushing("/etc/passwd")                           /etc/passwd          (base discarded)
FilePath("/srv/store").lexicallyResolving("../evil")                    nil
FilePath("/srv/store").lexicallyResolving("/etc/passwd")                /srv/store/etc/passwd
FilePath("/srv/store").lexicallyResolving("link/pwned")                 /srv/store/link/pwned  (planted symlink 'link' not seen)
FilePath("C:\\a\\b") on Linux: isAbsolute=false, components=1
FilePath("a/./b/../c").components kinds: regular, currentDirectory, regular, parentDirectory, regular
"/srv/store-evil/x".hasPrefix("/srv/store") = true ; FilePath(...).starts(with: "/srv/store") = false
non-UTF-8 name 0xFF: contentsOfDirectory -> name with U+FFFD, fileExists(that String) = false; FilePath(platformString:) stat ok = true
```

A compile trap seen while building the guard: `FilePath.ComponentView` is a `RangeReplaceableCollection`, so `p.components.filter { … }` returns a `ComponentView`, not an array (`cannot convert return expression of type 'FilePath.ComponentView' to return type '[FilePath.Component]'`); wrap in `Array(…)` first.

Exemplar split (measured, 40 clones): `import SystemPackage` in 9 repos (container, containerization, swift-nio, swift-system, swift-build, swiftly, swift-package-manager, tuist, vapor); `URL(fileURLWithPath` in 32; `FilePath` appears in 26. swiftly's lock and temp helpers take `FilePath` (`swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:19-28`, `FileManager+FilePath.swift:98-102`); containerization's extractor is `FilePath`+`FileDescriptor` end to end (`ArchiveReader.swift:269-300`).

### 6. Traversal guard for archive extraction (two layers)

Plants (`FIX/work/c-tars/*.tar`, built by `mk-tars.sh` with GNU tar `--format=ustar -P`): `dotdot.tar` = `ok.txt` + `../evil`; `symlink.tar` = symlink `link -> ..` followed by regular file `link/pwned`; `good.tar` = `ok.txt`, `sub/dir/file`. Extractors in fixture `c-tar` (swift-system `FilePath` for components, `Glibc` for syscalls):

- `naive`: `root.appendingPathComponent(name)` + `createDirectory(withIntermediateDirectories: true)` + `Data.write(to:)`.
- `lexical`: reject absolute and `..` components through `FilePath.components` (`kind == .parentDirectory`), then the same naive writes (this is what `lexicallyResolving` alone gives you).
- `guarded`: lexical check, then a walk from an open root fd: per component `openat(cur, c, O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC)`, `mkdirat` on `ENOENT`, leaf `openat(O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC)` after `unlinkat` (last entry wins), symlink entries via `symlinkat` and never followed.

| tar | naive | lexical | guarded |
|---|---|---|---|
| `dotdot.tar` | `work/…/evil` written OUTSIDE root (exit 1) | refused, nothing outside (exit 0) | `REFUSED ../evil: '..' component` (exit 0) |
| `symlink.tar` | `work/…/pwned` written OUTSIDE root through the symlink (exit 1) | `pwned` written OUTSIDE root (exit 1) | `REFUSED link/pwned: symlink or non-directory in path (errno 20)` (exit 0) |
| `good.tar` | 4 entries, all inside (exit 0) | n/a | 4/4 entries inside (exit 0) |

The lexical-only row is the load-bearing result: a purely textual check cannot see a symlink that an earlier archive entry planted. Why `ENOTDIR` (20) and not `ELOOP`: `O_NOFOLLOW|O_DIRECTORY` on a symlink fails with `ENOTDIR` on Linux 6.x; plain `O_NOFOLLOW` gives `ELOOP`. And `O_NOFOLLOW` only covers the **last** component: "Symbolic links in earlier components of the pathname will still be followed" ([open(2)](https://man.archlinux.org/man/open.2.en)), hence one `openat` per component. Linux 5.6+ `openat2(RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS)` is the kernel-side equivalent ([openat2(2)](https://man.archlinux.org/man/openat2.2.en)); the exemplar only enables `O_RESOLVE_BENEATH` on Darwin 15.4+ (`containerization@3e7bc39e66b3:Sources/ContainerizationOS/FileDescriptorOps.swift:89-94,190,288,336`).

Exemplar (`containerization@3e7bc39e66b3`): `FileDescriptorOps` is a namespace of fd-relative primitives ("Use these in place of path-based `FileManager` or `open(2)` calls whenever any part of a path comes from somewhere you do not control", `FileDescriptorOps.swift:44-47`); typed `Error` with `invalidRelativePath`, `cannotFollowSymlink`, `conflict(EntryType)` (`:104-124`); `ArchiveReader.extractContents` opens the root once, strips a leading `/` like bsdtar (`relativeMemberPath` `:337-343`), rejects `..` (`:269-274` doc), creates files `O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC` (`:369`), creates symlinks with `symlinkat` and never follows them (`:382-396`) and returns the rejected names instead of failing the whole archive. Reject-vs-strip for absolute names is a policy choice; the fixture rejects, the exemplar strips: pick one and document it.

Cross-language analogue: Python's `tarfile` refuses by default only from 3.14 ("Since Python 3.14, the default (`data`) will prevent the most dangerous security issues. However, it will not prevent all unintended or insecure behavior"; "Never extract archives from untrusted sources without prior inspection") ([tarfile docs](https://docs.python.org/3/library/tarfile.html#extraction-filters)).

### 7. Temp files, EXDEV, permissions and umask

Temp location. `FileManager.default.temporaryDirectory` / `NSTemporaryDirectory()` is `/tmp`, which is a different filesystem in containers and CI. Fixture `x-exdev` (inside the Docker image, `/tmp` on the overlay, the bind-mounted workdir elsewhere):

```text
rename(/tmp/fx-exdev-10, work/check-x-x-exdev/moved) rc=-1 errno=18 Invalid cross-device link
FileManager.moveItem fell back and succeeded; source gone=true      # copy + delete, not atomic
```

`FileManager.moveItem` falls back to copy on `EXDEV` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/FileManager/FileOperations.swift:769`), NIOFS `moveItem` likewise (§2). Staging in the destination directory (`x-same`) returns `rc=0`. `Data.write(.atomic)` already stages in the destination directory; the Darwin `url(for: .itemReplacementDirectory …)` path is `FOUNDATION_FRAMEWORK`-only (`Data+Writing.swift:325-366`, unverified: read only). Name temp files with a random component and `O_EXCL` (UUID or Foundation's own `.dat.nosync<pid>.XXXXXX`) and sweep orphans on start-up; a `defer` cleanup does not run after `SIGKILL`.

Mode and umask (fixture `e`; identical on 6.4.0 and 6.3.3; `fx e <path> <how> <umask>` calls `umask()` first):

| how | umask 077 | umask 022 |
|---|---|---|
| `open(path, O_CREAT, 0o666)` | 600 | 644 |
| `open(path, O_CREAT, 0o600)` | 600 | 600 |
| `Data.write(to:)` | 600 | 644 |
| `Data.write(to:, options: .atomic)` | 600 | 644 |
| `FileManager.createFile(atPath:contents:)` | 600 | 644 |
| `FileManager.createFile(…, attributes: [.posixPermissions: 0o600])` | 600 | 600 |
| `FileManager.createDirectory(atPath:withIntermediateDirectories: false)` | 700 | 755 |
| `durableWrite(…, mode: 0o600)` (helper, `fchmod`) | 600 | 600 |
| `.atomic` replacing an existing 0600 file | 600 | **644** (mode not preserved) |
| `durableWrite(…, mode: 0o600)` replacing an existing 0600 file | 600 | 600 |

So a "world-readable by accident" secret needs only a permissive umask; `createFile(…, attributes:)` and `open` with an explicit mode are the portable umask-independent forms, and `fchmod` on the fd is the only one that survives a restrictive-then-permissive umask change mid-process. Foundation's own temp floor is `0o600` (`Data+Writing.swift:91-95`: "we don't want to leave unreadable temporary files around…").

### 8. Lock files

swiftly's lock is a create-exclusive PID file: `Data(pid).write(to: url, options: .withoutOverwriting)`, catch `CocoaError.fileWriteFileExists`, poll every 1 s up to 300 s with jitter, `unlock()` removes the file: `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:34-100` (the lock state is the file's existence, the PID is only a hint in the error message). Fixture `ae` `l-pidfile` vs `l-flock`: holder `SIGKILL`ed (rc 137) while holding the lock, then the next invocation:

```text
l-pidfile: LOCK REFUSED: … NSPOSIXErrorDomain Code=17 "File exists"   rc=75     # stuck until a human deletes the file
l-flock:   acquired flock lock                                          rc=0
```

`flock(2)` is advisory, per open-file-description, released by the kernel at process death; it is unreliable on some network filesystems (same caveat as STATE-10 in the Rust file: document "local filesystem only"). swift-system has no `flock` wrapper (grep: `flock(` appears in 6 exemplar repos, all through the libc module). CAS blob writes themselves need no lock (STATE-9): the lock is for read-modify-write of shared state files.

### 9. Windows (unverified: read only)

Nothing in this section was run; owner Q7 default is "unverified" and no Windows host was touched.

- Foundation's Windows replace: `SetFileInformationByHandle(FileRenameInfoEx)` with `FILE_RENAME_FLAG_POSIX_SEMANTICS | FILE_RENAME_FLAG_REPLACE_IF_EXISTS` (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:529`), clearing `FILE_ATTRIBUTE_READONLY` and retrying once, then falling back to `MoveFileExW(MOVEFILE_COPY_ALLOWED | MOVEFILE_REPLACE_EXISTING)` on `ERROR_NOT_SAME_DEVICE`, `ERROR_NOT_SUPPORTED`, `ERROR_FILE_SYSTEM_LIMITATION`, `ERROR_INVALID_PARAMETER` (`:569-579`). File data flush is `_commit(fd)` only when `GetFileType == FILE_TYPE_DISK` (`:395-398`).
- No documented Windows analogue of the parent-directory fsync exists in the sources read; `MOVEFILE_WRITE_THROUGH` "guarantees that a move performed as a copy and delete operation is flushed to disk", i.e. it covers the cross-volume copy case, not a same-volume rename ([MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)). `ReplaceFileW` is multi-step with partial-failure codes (`ERROR_UNABLE_TO_REMOVE_REPLACED` 1175, `ERROR_UNABLE_TO_MOVE_REPLACEMENT` 1176/1177: "the replaced file no longer exists and the replacement file exists under its original name") ([ReplaceFileW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew)). Treat Windows as atomicity-for-readers with **no** researched power-loss guarantee, as the Rust file's Platform Gaps section already says; never write "durable" in a Windows comment.
- `MAX_PATH` is 260 unless the app opts in: Windows 10 1607+ removes the limit only with the registry value and `longPathAware` in the manifest ([Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)); `\\?\` verbatim paths bypass normalisation. Reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`…, `LPT1`…, and superscript variants) are invalid components even with an extension ([Naming Files](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)); treat them as traversal-adjacent when a name comes from an archive or a digest-derived path.
- `FilePath` on Windows: anchors `C:\`, `C:`, `\\server\share\`, `\\?\C:\`, `\\.\`; `\foo` and `C:foo` are **relative**; `/` and `\` both separate; in `\\?\` paths `.` and `..` are ordinary components ([SE-0529](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md), "Windows path styles", lines 203-264 and 312). swift-system Windows is "Unstable". A Linux build cannot exercise any of it (`FilePath("C:\\a\\b")` on Linux is one relative component, measured), so any Windows path code needs `#if os(Windows)` branches plus a local Windows run (route: cross-compile with xwin and run via `cmd.exe` from a `C:` cwd, per the machine notes) before it is trusted.
- NIOFS has no Windows `fsync` (`SystemPackage+Windows.swift:265`, `fatalError`). Extracting an archive with symlink entries on Windows needs `SeCreateSymbolicLinkPrivilege`; not researched (unverified).

### 10. Apple platforms (unverified: read only)

- `fsync(2)` on Darwin does not flush the drive's write cache; `fcntl(fd, F_FULLFSYNC)` is the stronger call. SQLite documents the same: "Only Mac OS-X supports F_FULLFSYNC" ([PRAGMA fullfsync](https://www.sqlite.org/pragma.html#pragma_fullfsync)). 0/40 exemplars call `F_FULLFSYNC`. A durable helper for Apple targets should try `F_FULLFSYNC` and fall back to `fsync` on `ENOTSUP`; not run (no macOS).
- Foundation's Darwin branch captures the old mode via `getattrlist` and `fchmod`s it only if the path is unchanged (`release/6.3 Data+Writing.swift:601-622`); Darwin `replaceItemAt` uses `renameatx_np(RENAME_SWAP)`; sandboxed processes get the temp from `.itemReplacementDirectory`, which is a different directory (not always the destination's) — read only.
- `/.nofollow/` and `/.resolve/N/` anchors in `FilePath` are Darwin 26-era kernel features (SE-0529 §Anchor); not available on Linux.

### 11. Tooling facts discovered while verifying

- The `swift:6.4` image has no `strace`. A Fedora 43 `strace-7.2` RPM was unpacked into `FIX/tools/strace-rpm` with its non-libc shared libraries copied to `FIX/tools/lib`, and runs inside the image via `run.sh env LD_LIBRARY_PATH=$FIX/tools/lib $FIX/tools/strace-rpm/usr/bin/strace …`.
- The `swift:6.3` image has an older glibc and the copied libs fail (`GLIBC_ABI_GNU2_TLS not found`); the 6.3.3 runs therefore use a `--static-swift-stdlib` build made by the 6.3 image (default native build system) and executed in the 6.4 image under strace. A dynamic 6.4 binary cannot run on the Fedora host (`GLIBC_2.43 not found`). `swift build --static-swift-stdlib` fails under the default Swift Build engine in 6.4 (`undefined reference to 'swift_ures_getByKey'`); it links with `--build-system native` (deprecated flag).
- SwiftLint 0.65.1 (static binary) skips `custom_rules` with "requires SourceKit and SourceKit access is prohibited", also with `LINUX_SOURCEKIT_LIB_PATH=/usr/lib`.

## Normative guidance candidates

Family SW-IO (`swift-quality/io.md`). "RUN" = watched red on a planted violation and green on a compliant twin, details in [Verification runs](#verification-runs). Shell variables below are fixture-local; the output of every grep **is** the violation (empty output = pass).

**SW-IO-01 — One durable-write helper.** Route every write of durable state (store, cache, lockfile, config, install tree) through one module-local helper shaped like §3; the call sites `Data.write(to:options:.atomic)`, `String.write(toFile:atomically:)`, `FileManager.replaceItemAt`, `replaceItem(at:withItemAt:)` (NIOFS) and plain `Data.write(to:)` into a digest-named or lock path are findings.
Rationale: each of the five has a different, partly destructive, never-durable behaviour (§1, §2).
Verify: `grep -rnF --include='*.swift' -e '.atomic' -e 'atomically:' -e 'replaceItemAt(' -e 'replaceItem(at' Sources` (restrict to added lines on a diff: `git diff -U0 -G'\.atomic' -- '*.swift'`; test targets legitimately write scratch files). RUN: yes, `FIX/lint/violation` 5 hits (exit 0), `FIX/lint/compliant` empty (exit 1).

**SW-IO-02 — The helper sequence.** Temp in the target's own directory (`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`), write loop that handles short writes and `EINTR`, `fchmod` to the explicit mode, `fsync(fd)` (failure fatal, never retried), checked `close`, `rename`, then `open(dir, O_RDONLY|O_DIRECTORY)` and `fsync(dirfd)`; unlink the temp on any failure.
Rationale: the directory fsync is what makes the rename survive power loss; `.atomic` omits it (§1).
Verify: run the code path under `strace -f -y -e trace=fsync,fdatasync,rename,renameat,renameat2 -o "$W/trace.txt" <binary>`, then `grep -L -F -e "$W>) = 0" "$W/trace.txt"` where `W` is the directory that holds the target: a printed file name means no directory fsync (violation). RUN: yes, `FIX/check-a.sh`: `a-naive` exit 1 (prints trace), `a-durable` exit 0, on 6.4.0 and 6.3.3; `grep -L` form: naive prints the trace file (exit 1), durable prints nothing (exit 0). Reading heuristic for review: the helper must contain `fsync` twice (file, then directory).

**SW-IO-03 — `.atomic` is not durability and not mode preservation.** Never describe `Data.write(.atomic)` as crash-safe, and never rely on it to keep an existing file's mode on Linux; pass the mode explicitly via the helper.
Rationale: no directory fsync (§1); mode restored only on Darwin (6.3) / swift-foundation main, measured 0600 to 0644 on 6.3.3 and 6.4.0.
Verify: `FIX/check-e.sh <fx> atomic-over-0600` (replace an existing 0600 file under umask 022, expect `mode=600`). RUN: yes, `atomic-over-0600` exit 1 (`mode=644`), `durable-over-0600` exit 0 (`mode=600`), both toolchains.

**SW-IO-04 — No `FileManager.replaceItemAt` for durable replace; never on Linux with tools older than 6.4.** On 6.4+ it is merely non-durable (swap, unlink, chmod, no dir fsync, target must exist); on Linux 6.3.x it destroys the new content.
Rationale: §2 measurement; fixes landed in the 6.4 branch of swift-corelibs-foundation.
Verify: grep of SW-IO-01 (`replaceItemAt(`); behavioural: `FIX/check-repl.sh <fx>` (target must hold `payload` afterwards). RUN: yes, 6.4.0 exit 0, 6.3.3 exit 1 (`target.staged: old`, target missing).

**SW-IO-05 — Do not use NIOFS/`_NIOFileSystem` `replaceItem(at:withItemAt:)` as an atomic replace.** It is `unlink(destination)` then `rename`; its docstring ("Uses the `rename(2)` system call") is wrong. Use the helper, or `moveItem` only when the destination may be absent.
Rationale: crash window with no target (§2).
Verify: SW-IO-01 grep (`replaceItem(at`); trace form `FIX/check-r.sh "$W/trace.txt" "$W/target"` (violation when `unlink(target)` precedes the rename). RUN: yes, NIOFS exit 1, Foundation `replaceItemAt` exit 0 (it exchanges, no unlink of the target), helper exit 0.

**SW-IO-06 — CAS publish recipe.** (1) Stage in a directory on the same filesystem as `blobs/` (e.g. `store/ingest/.tmp-<UUID>`), never `/tmp`; (2) hash while writing; (3) compare to the expected digest before any publish step; (4) on mismatch or any error unlink the temp; (5) publish with `link(tmp, final)` and treat `EEXIST` as success (persist-if-absent, never `rename` over an existing blob); (6) `fchmod 0o444`, `fsync(fd)`, then `fsync` the blobs directory.
Rationale: a digest-named path must not exist until its content is complete and verified (STATE-30); `Data.write(to: final)` truncates in place and leaves torn blobs (§1).
Verify: bad-digest fixture: `find "$STORE" -type f` after a failed put prints nothing. RUN: yes, `FIX/check-b.sh <cas> naive|verified`: naive leaves `blobs/sha256:000…1` (exit 1), verified leaves zero files and a 0444 blob after a good put (exit 0); 6.4.0 and 6.3.3.

**SW-IO-07 — A digest or archive name becomes a path only as one validated component.** Parse the digest (algorithm allow-list, lowercase hex, exact length, compared as bytes) and join the allow-listed encoding as a single `FilePath.Component`; never `appendingPathComponent` an unvalidated string.
Rationale: `URL.appendingPathComponent("../evil")` yields `/srv/store/../evil`; `FilePath.appending("../evil")` the same (§5); containerization's `ParsedDigest.path(in:)` is the model.
Verify: `grep -rn --include='*.swift' -e 'appendingPathComponent(' Sources` then read each hit for the origin of its argument (named reading heuristic: a hit whose argument is not a literal, an enum case, or a validated component type is a finding). RUN: grep yes (`FIX/lint/violation/StoreBad.swift:8` hit, compliant none); the origin judgement is a reading heuristic.

**SW-IO-08 — Path type at each boundary.** `FilePath` from `SystemPackage` for any path that is stored, compared, composed or untrusted; `URL` only at the edge of a Foundation/NIO API that requires it; `String` never for a composed path. Add `.package(url: "https://github.com/apple/swift-system.git", from: "1.6.4")` (1.7+ needs Swift 6.1+) and `import SystemPackage`. Do not write `#if compiler(>=6.4)` around stdlib `FilePath`, and never `import System` in a package that builds on Linux.
Rationale: stdlib `FilePath` is not in 6.4.0; `import System` is Darwin-only (§5).
Verify: `swift build` on Linux (Docker); diagnostics `cannot find 'FilePath' in scope` and `no such module 'System'`. RUN: yes (fixture `d-filepath`, `Bare` exit 1 on 6.4 and 6.3, `WithSys` exit 0).

**SW-IO-09 — Compose with `FilePath.appending(Component)`; treat `push`/`pushing` and `+ "/" +` as findings on untrusted input.** `pushing("/abs")` discards the base; string concatenation and `URL(fileURLWithPath:)` mis-handle `C:\…` and non-UTF-8 names. Test containment with component-wise `FilePath.starts(with:)`, never `String.hasPrefix`.
Rationale: `/srv/store-evil/x`.`hasPrefix("/srv/store")` is `true` (§5).
Verify: `grep -rnF --include='*.swift' -e '+ "/" +' Sources`; `grep -rnF --include='*.swift' -e '.hasPrefix(' Sources` reviewed where the receiver is a path; `grep -rn --include='*.swift' -e 'pushing(' -e '.push(' Sources`. RUN: yes for the `+ "/" +` grep (violation hit, compliant empty); `hasPrefix`/`pushing` forms are reading heuristics backed by the §5 measurement.

**SW-IO-10 — Archive extraction uses both layers of the traversal guard.** Layer 1 (lexical): reject empty, absolute (or strip the root, one policy) and any `..` component. Layer 2 (filesystem): open the root once, then per component `openat(..., O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC)`, leaf `O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC` after `unlinkat`; symlink entries are created with `symlinkat` and never traversed; refused entries are reported (non-zero exit), not silently skipped.
Rationale: lexical-only passes `link -> ..` + `link/pwned` (§6); `O_NOFOLLOW` guards only the final component.
Verify (a): any file that extracts archives must mention the flag: `grep -rlE --include='*.swift' -e 'extract' -e 'untar' Sources | xargs -r grep -L -e 'O_NOFOLLOW' -e 'noFollow'` (printed file = violation). RUN: yes (`FIX/lint`: violation prints `violation/Untar.swift`, xargs exit 123; compliant prints nothing, exit 0).
Verify (b): behavioural, `FIX/check-c.sh <untar> guarded dotdot|symlink|good`: no regular file outside the root. RUN: yes: `naive` dotdot exit 1, `naive` symlink exit 1, `lexical` symlink exit 1, `guarded` all exit 0 (refusals exit 65 from the tool itself); 6.4.0 and 6.3.3.

**SW-IO-11 — No path-based `FileManager` calls on names from outside the process.** For archive members, remote peers and registry-supplied names, use fd-relative primitives only; `FileManager.createDirectory`, `createSymbolicLink`, `Data.write(to:)`, `copyItem`, `moveItem` on a joined path are findings.
Rationale: each re-resolves the whole path and follows symlinks (containerization `FileDescriptorOps.swift:44-47`).
Verify: reading heuristic on the extraction function's call graph, backed by SW-IO-10(b). RUN: via SW-IO-10(b) only.

**SW-IO-12 — Stage in the destination's directory, never the system temp directory.** Forbid `NSTemporaryDirectory()` and `FileManager.default.temporaryDirectory` for anything that is later renamed or linked into place; remember `moveItem` hides `EXDEV` behind copy+delete.
Rationale: `/tmp` is a separate filesystem in containers and CI (§7).
Verify: `grep -rnE --include='*.swift' -e 'NSTemporaryDirectory\(\)' -e '\.temporaryDirectory\b' Sources` (a hit that only feeds a throwaway test fixture is not a finding). RUN: yes (violation 2 hits exit 0; compliant empty exit 1); behaviour: `FIX/check-x.sh <fx> x-exdev` exit 1 (`errno=18`), `x-same` exit 0.

**SW-IO-13 — Sweep orphan temp files at start-up; do not rely on `defer`, `deinit` or signal handlers.** Fixed, well-known staging locations make the sweep trivial (STATE-7/8).
Rationale: `SIGKILL` skips `defer`; `Data.write(.atomic)` and the helper both leave `.dat.nosync*`/`.tmp-*` behind after a hard kill.
Verify: reading heuristic (start-up path calls a sweep before new work). RUN: no.

**SW-IO-14 — Permissions are set with `fchmod` or an explicit `open` mode, never inherited from the umask.** Secrets and tokens: create with mode `0o600` through `open(…, O_EXCL, 0o600)` plus `fchmod`; blobs `0o444`; directories created for private data use `mkdirat(…, 0o700)`; never `FileManager.createFile(atPath:contents:)` without `attributes:` for sensitive data.
Rationale: default creation modes are `0666 & ~umask` / `0777 & ~umask` (600/700 under 077, 644/755 under 022) (§7).
Verify: `grep -rn --include='*.swift' -e 'createFile(atPath' -e 'createDirectory(at' -e 'createDirectory(atPath' Sources` and read for sensitive data; behavioural: the helper `mode` parameter under umask 077/022. RUN: yes for the mode table (`FIX/run-e.sh`) and `check-e.sh`; the grep is a reading heuristic.

**SW-IO-15 — Cross-process locks are `flock(2)` on a lock file, not a create-exclusive PID file.** Document "local filesystem only"; hold the descriptor for the whole critical section; CAS blob writes need no lock.
Rationale: a PID file is stuck after `SIGKILL` (rc 75) while `flock` is released by the kernel.
Verify: `grep -rnF --include='*.swift' -e '.withoutOverwriting' Sources` (lock-path hits are findings); behavioural `FIX/check-l.sh <fx> l-pidfile|l-flock`. RUN: yes, `l-pidfile` exit 75, `l-flock` exit 0, both toolchains.

**SW-IO-16 — No durability claim on Windows; Windows path code is `#if os(Windows)`-gated and verified on a Windows run.** Atomic-for-readers only (`FILE_RENAME_FLAG_POSIX_SEMANTICS` / `MoveFileExW`), no parent-directory fsync analogue, `MAX_PATH` 260 without `longPathAware`, reserved device names invalid, `\foo` and `C:foo` relative. Mark as `unverified: read only` until owner Q7 grants a Windows host.
Rationale: §9.
Verify: `grep -rn --include='*.swift' -e 'durable' -e 'crash-safe' Sources` on lines inside `#if os(Windows)`, reading heuristic. RUN: no (Windows read only).

**SW-IO-17 — Apple targets: use `F_FULLFSYNC` where durability matters, and say the leg is unverified.** `fcntl(fd, F_FULLFSYNC)` with `fsync` fallback on `ENOTSUP`.
Rationale: Darwin `fsync` leaves the drive cache unflushed; 0/40 exemplars call it.
Verify: `grep -rn --include='*.swift' -e 'F_FULLFSYNC' Sources` on any helper compiled for Darwin. RUN: no (no macOS).

**SW-IO-18 — Listing and reopening names that may be non-UTF-8 goes through `FilePath`/`withPlatformString`, not `String`.** `contentsOfDirectory` returns a lossy `String` that cannot be reopened.
Rationale: measured U+FFFD round trip (§5).
Verify: reading heuristic (a `String` produced by directory enumeration is used as a path again). RUN: the failure itself yes (`FIX/g-paths`, `fileExists = false`), the grep no.

## Verification runs

All runs 2026-10-10. `FIX` as above; `R` = `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; default `SWIFT_VERSION=6.4`. Fixtures build with `swift build --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/files-and-paths-<x>`. 6.3.3 runs of strace-based checks use a static-stdlib build run in the 6.4 image (§11).

| # | Fixture | Command | Violation | Twin | Key output lines |
|---|---|---|---|---|---|
| a1 | `ae` (`fx`, `Durable.swift`) | `FIX/check-a.sh $FX a-naive $FIX/work/a-naive` ; `… a-durable …` (6.4) | exit 1 | exit 0 | `VIOLATION: no fsync of directory …/a-naive` + `fsync(3<…/.dat.nosync9.fVb1lu>) = 0`, `rename(…)`; durable: `fsync(3<work/a-durable>) = 0` |
| a2 | same, 6.3.3 static build | same, `FX=…/files-and-paths-ae-63s/debug/fx`, `SWIFT_VERSION=6.4` for the runner | exit 1 | exit 0 | `fsync(3<…/.dat.nosyncA.hsQqUO>) = 0` then `rename`, no dir fsync |
| a3 | `ae` `r-replace` | `TRACE=… ./strace-a.sh`, then `check-a.sh $FX r-replace $FIX/work/a-replace` | exit 1 | (a-durable exit 0) | `renameat2(…, RENAME_EXCHANGE) = 0`, `unlink(…staged)`, `chmod(…, 0644)`, no dir fsync |
| a4 | `lint` (grep form of a1) | `grep -L -F -e "$W>) = 0" "$W/trace.txt"` | prints `work/a-naive/trace.txt`, exit 1 | prints nothing, exit 0 | — |
| b1 | `b-cas` | `R ./check-b.sh $CAS naive` (6.4) | exit 1 | `verified` exit 0 | `DIGEST MISMATCH … rc=65`; `find store-bad -type f` prints `blobs/sha256:000…001`; twin prints nothing; good put: `444 blobs/sha256:a2e9ce54…` |
| b2 | `b-cas` 6.3.3 | same with `SWIFT_VERSION=6.3` | exit 1 | exit 0 | identical |
| c1 | `c-tar` | `R ./check-c.sh $U naive dotdot` | exit 1 | `guarded dotdot` exit 0 | `work/c-naive-dotdot/evil` outside root; guarded: `REFUSED ../evil: '..' component`, `untar rc=65` |
| c2 | `c-tar` | `R ./check-c.sh $U naive symlink` | exit 1 | `guarded symlink` exit 0 | `work/c-naive-symlink/pwned` outside; guarded: `REFUSED link/pwned: symlink or non-directory in path (errno 20)` |
| c3 | `c-tar` | `R ./check-c.sh $U lexical symlink` (lexical-only) | exit 1 | `guarded symlink` exit 0 | `work/c-lexical-symlink/pwned` outside; `lexical dotdot` exit 0 (refused) |
| c4 | `c-tar` 6.3.3 | c1-c3 with `SWIFT_VERSION=6.3` | exits 1,1,1 | guarded 0,0, `good` 0 | identical |
| d1 | `d-filepath` | `R swift build --scratch-path …-d --product Bare` ; `--product WithSys` | exit 1 | exit 0 | `error: cannot find 'FilePath' in scope`; WithSys prints `/var/www index.html` |
| d2 | `d-filepath` 6.3.3 | same with `SWIFT_VERSION=6.3` | exit 1 | exit 0 | same error text |
| d3 | `d-sys` | `R swiftc -typecheck m.swift` / `m2.swift` | exit 1 | — | `no such module 'System'`; `type 'CommandLine' has no member 'executablePath'` |
| e1 | `ae` `e` | `R ./run-e.sh $FX 64` (and `63`) | table §7 | — | `diff work/e-64.txt work/e-63.txt` empty |
| e2 | `ae` `e` | `R ./check-e.sh $FX atomic-over-0600` | exit 1 | `durable-over-0600` exit 0 | `before=600`, `atomic-over-0600 umask=022 mode=644` / `mode=600`; both toolchains |
| f1 | `f-niofs` (swift-nio 2.104.0) | `TRACE=…,unlink,unlinkat,rmdir ./strace-a.sh …/nr r-x $W` ; `./check-r.sh $W/trace.txt $W/target` | exit 1 | Foundation r-replace exit 0 | `unlink("work/f-niofs/target") = 0` before `rename("…target.staged", "…target") = 0`; `VIOLATION: unlink(target) at trace line 2 precedes rename at line 3` |
| r1 | `ae` `r-replace` | `R ./check-repl.sh $FX` (6.4) / `SWIFT_VERSION=6.3` | 6.3.3 exit 1 | 6.4.0 exit 0 | 6.3.3: `NSCocoaErrorDomain Code=4`, `entry: target.staged`, `target.staged: old`; 6.4: `target: payload` |
| l1 | `ae` `l-pidfile`/`l-flock` | `R ./check-l.sh $FX l-pidfile` / `l-flock` | pidfile exit 75 | flock exit 0 | `holder rc=137`; `LOCK REFUSED … Code=17 "File exists"`; `acquired flock lock`; both toolchains |
| x1 | `ae` `x-exdev`/`x-same` | `R ./check-x.sh $FX x-exdev` / `x-same` | exit 1 | exit 0 | `rename(/tmp/fx-exdev-10, …) rc=-1 errno=18 Invalid cross-device link`, `FileManager.moveItem fell back and succeeded`; `rename(same dir) rc=0` |
| g1 | `g-paths` | `R $B/…/gp $FIX/work/g` (6.4) and 6.3 | n/a (measurement) | — | table in §5; `diff work/g63.txt work/g64.txt` identical |
| h1 | `ae` `e … datawrite` | strace `-e trace=openat,rename,renameat,fsync,ftruncate` | measurement | — | `openat(…"work/h-datawrite/blob", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 3`, `fsync(3<…/blob>) = 0`, no rename |
| s1 | `lint` V1x | `grep -rnF --include='*.swift' -e '.atomic' -e 'atomically:' -e 'replaceItemAt(' -e 'replaceItem(at' violation` | 5 hits, exit 0 | `compliant` empty, exit 1 | `StoreBad.swift:3,4,10,11,12` |
| s2 | `lint` V2 | `grep -rnE --include='*.swift' -e 'NSTemporaryDirectory\(\)' -e '\.temporaryDirectory\b' violation` | 2 hits, exit 0 | empty, exit 1 | `StoreBad.swift:5,6` |
| s3 | `lint` V3 | `grep -rnF --include='*.swift' -e '+ "/" +' violation` | 1 hit, exit 0 | empty, exit 1 | `StoreBad.swift:7` |
| s4 | `lint` V5 | `grep -rn --include='*.swift' -e 'appendingPathComponent(' violation` | hit, exit 0 | empty, exit 1 | `StoreBad.swift:8` (review hit, needs origin judgement) |
| s5 | `lint` V6 | `grep -rlE --include='*.swift' -e 'extract' -e 'untar' violation \| xargs -r grep -L -e 'O_NOFOLLOW' -e 'noFollow'` | prints `violation/Untar.swift`, exit 123 | `compliant` prints nothing, exit 0 | — |

**Not red.** SwiftLint `custom_rules` (`FIX/lint/.swiftlint.yml`, rules `no_atomic_write_option`, `no_system_temp_for_staging`, `no_string_slash_join`): `swiftlint lint --strict --config .swiftlint.yml violation` exited 0 with `Found 0 violations` on the violation file and `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.`, with and without `LINUX_SOURCEKIT_LIB_PATH=/usr/lib`. Cause: the static SwiftLint binary cannot load SourceKit here. These rules are therefore not admissible as checks in this file; the grep forms (s1-s5) are.

**Not run.** Windows, macOS, `O_RESOLVE_BENEATH`/`openat2`, Musl (static Linux SDK), a crash-injection test of the durable helper (strace proves syscall order, not on-disk state after power loss), `F_FULLFSYNC`. Fixture caveat: the EXDEV demonstration depends on `/tmp` being a different filesystem from the workdir, which is true inside this Docker image and in typical CI/tmpfs setups but not on every machine.

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SW-IO-01/02 durable helper | Nobody fully: `swift-foundation@aadd9259be07:…/Data+Writing.swift:403,669` has file fsync + rename, **no dir fsync** | `swiftly@c8cf2e35bfca` uses `.atomic` at `Sources/Swiftly/Config.swift:48`, `Init.swift:175,185,332`, `Update.swift:145`, `Install.swift:142`, `SelfUninstall.swift:94`; `containerization@3e7bc39e66b3` at `ImageStore+ReferenceManager.swift:73`, `ArchiveReader.swift:252`; `.atomic` appears in 14 of 40 repos; 0/40 fsync a directory after a rename |
| SW-IO-02 explicit mode | `Data+Writing.swift:612-658` (main) restores the mode with `fstatat`+`fchmod`; `container@f70ecbb926d9` `ConfigurationLoader.swift:186-217` copies to a hidden sibling, `chmod`s, `rename(2)`s (per the domain scout; no fsync) | release 6.3 / measured 6.4.0: `.atomic` does not preserve the mode on Linux |
| SW-IO-05 NIOFS replaceItem | — | `swift-nio@e12881f2a691:Sources/NIOFS/FileSystem.swift:577-590` and `Sources/_NIOFileSystem/FileSystem.swift:569-582`: remove, move, remove; docstring claims `rename(2)` |
| SW-IO-06 CAS recipe | `containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:168-184` (temp UUID in ingest, digest compare, then move, `EEXIST` ok); `ContentWriter.swift:58-70,109-136` (same-dir temp, hash while copying, move) | `ContentWriter.swift:50` writes straight to the digest-named path; `LocalContentStore.swift:194-198` trusts the temp name as the digest and uses `fileExists`+`moveItem`; no fsync in the store; on mismatch `ImageStore+Import.swift:173-176` throws without removing `tempFile` (it sits in the ingest dir, cleaned only when the session is cancelled/completed, `LocalContentStore.swift:181,221`) |
| SW-IO-07 digest as component | `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:119-131,134+` (`path(in:)`, `validatedDigestEncoding()`) | — |
| SW-IO-08 path type | `swiftly` (`FilePath` in `FileLock.swift:19-28`), `containerization` (`ArchiveReader.swift:269-300`, `FileDescriptorOps.swift`), `swift-nio` NIOFS (`NIOFilePath` wraps `SystemPackage.FilePath`, `NIOFilePath.swift:31-42`); 9 repos import `SystemPackage` | 32 repos use `URL(fileURLWithPath` (tuist 47 files, containerization 32, container 26, sourcekit-lsp 24, swift-package-manager 23) |
| SW-IO-10 two-layer guard | `containerization@3e7bc39e66b3:Sources/ContainerizationOS/FileDescriptorOps.swift:44-124,190,288,336` and `ArchiveReader.swift:269-396`; `container@f70ecbb926d9:Sources/ContainerBuild/BuildPipelineHandler.swift:46` ("directory traversal uses `openat(O_NOFOLLOW)`") | no exemplar uses `lexicallyResolving` as its only guard; `O_NOFOLLOW` appears in only 4 of 40 repos (container, containerization, swift-foundation, swift-system) |
| SW-IO-12 stage beside target | `Data+Writing.swift:188-197` (temp beside target); `ContentWriter.swift:58-61` (UUID temp in the store dir) | `NSTemporaryDirectory`/`temporaryDirectory` in non-test code: tuist 14, element-x-ios 12, swift-foundation 9, container 8, swift-build 7 (not all for staging; judged by reading each hit, not done here) |
| SW-IO-15 flock | — | `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:34-100` create-exclusive PID file; `flock(` appears in tuist (3 files), swift-foundation, swift-build, swift-system, containerization |
| SW-IO-16 Windows | `Data+Writing.swift:395-398,520-580` handles `_commit`, POSIX rename semantics and the `MoveFileExW` fallback | `swift-nio` NIOFS `SystemPackage+Windows.swift:265-266` `fatalError` stub for `fsync`; swift-system Windows "Unstable" (`README.md:58-64`) |

Corpus counts (grep over the 40 clones, 2026-10-10): `.atomic` 14 repos, `import SystemPackage` 9, `import System` 6, `fsync(` 3, `F_FULLFSYNC` 0, `O_NOFOLLOW` 4, `flock(` 6, `withoutOverwriting` 2, `umask(` 2, `posixPermissions` 11, `renameat` 3, `fchmod` 3, `mkstemp|mkdtemp` 9. Counts include tests unless a table cell says "non-test".

## AI-agent angle

| What an LLM characteristically does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| `try data.write(to: url, options: .atomic)` for a store, cache or lockfile and comments "atomic, crash-safe" | No directory fsync; no mode preservation on Linux 6.3.3/6.4.0 | SW-IO-01 grep (`-e '.atomic' -e 'atomically:'`); `check-a.sh` strace form |
| `FileManager.default.replaceItemAt(a, withItemAt: b)` as "the safe replace" | 6.4: swap + unlink + chmod, target must exist, no dir fsync; 6.3.x Linux: target lost, content destroyed | SW-IO-01 grep (`replaceItemAt(`), `check-repl.sh` |
| `fs.replaceItem(at:withItemAt:)` (NIOFS) trusting its docstring | remove-then-rename | SW-IO-01 grep (`replaceItem(at`), `check-r.sh` |
| `import System` and `FilePath` (or `#if compiler(>=6.4)` around stdlib `FilePath`), or `CommandLine.executablePath` | Not in 6.4; `System` is Darwin-only; WWDC26 wording suggests otherwise | `swift build` on Linux (`cannot find 'FilePath' in scope`, `no such module 'System'`) |
| Staging in `NSTemporaryDirectory()` / `FileManager.default.temporaryDirectory`, then `moveItem` | `EXDEV` hidden by a copy+delete fallback | SW-IO-12 grep; `check-x.sh` |
| `root.appendingPathComponent(entry.name)` for tar members, then `Data.write`; or only `hasPrefix(root.path)` after `.standardized` | `..` and planted symlinks escape; `hasPrefix` accepts `/srv/store-evil` | SW-IO-10(a) grep; `check-c.sh`; `hasPrefix` hit review |
| Lexical-only "sanitise": drop `..` and leading `/`, believe it is safe | passes `link -> ..` + `link/pwned` | `check-c.sh lexical symlink` (exit 1) |
| Writes the CAS blob first (`data.write(to: blobURL)`), compares the digest after, leaves the file | blob under its digest name with wrong or partial content | `check-b.sh` (find prints the leftover) |
| `rename`/`moveItem` over an existing digest path to "publish" | replaces the inode other installs hold | SW-IO-06 reading heuristic; look for `link(` + `EEXIST` |
| `FileManager.createFile(atPath:contents:)` for tokens, assuming 0600 | `0666 & ~umask` (644 under 022) | `run-e.sh` table; SW-IO-14 grep |
| Hallucinated helpers: `FileDescriptor.openat(...)`, `FileDescriptor.synchronize()`, `FilePath.isLexicallyContained(in:)` from swift-system | not public API in swift-system 1.8.x; use libc `openat`/`fsync` or `lexicallyResolving` | `swift build` (compile error); `grep` of the swift-system public surface |
| `p.components.filter { … }` assigned to `[FilePath.Component]` | `filter` on a `RangeReplaceableCollection` returns the collection type | compile error shown in §5 |
| PID-file lock (`.withoutOverwriting`) "to prevent concurrent runs" | stale after `SIGKILL` | SW-IO-15 grep; `check-l.sh` |
| `String` paths from `contentsOfDirectory` re-opened later | lossy for non-UTF-8 names | reading heuristic (SW-IO-18) |
| `try? FileManager.default.removeItem` / `try? unlink` as cleanup everywhere, and `createFile` result ignored | swallows the failure that decides durability | `grep -rn --include='*.swift' -e 'try? FileManager.default.removeItem' Sources` (review hits in store code) |
| Wraps raw descriptors in a class marked `@unchecked Sendable` to silence Swift 6 errors | hides lifetime/close-once bugs | owned by SW-CONC; a reviewer greps `@unchecked Sendable` near `open(` |

## Contested / evolving

- **Stdlib `FilePath` timeline.** Accepted with modifications 2026-06-05; WWDC26 session 262 says a filepath type was added, SE-0529's own compat sketch assumes `compiler(>=6.4)`, but 6.4.0 does not ship it (measured 2026-10-10). Trend: lands in 6.5 or later; `SystemPackage.FilePath` becomes a typealias then. Until a toolchain ships it, depend on SystemPackage unconditionally.
- **`resolve()` and lexical resolve-beneath.** The review was long and split on whether a blocking, TOCTOU-prone `resolve()` belongs in the stdlib; lexical `resolve-beneath` was dropped from SE-0529 (line 601). swift-system's `lexicallyResolving` stays the only lexical guard, and its doc admits symlinks defeat it. Trend: fd-anchored walks stay the secure answer; as of 2026-06 the core team's stated position is that "the correct fix … is often to stop trying to resolve the path in the first place".
- **`Data.write(.atomic)` mode preservation.** swift-foundation main restores the mode on all POSIX; the 6.3.x and 6.4.0 releases measured here do not. Expect 6.5; do not write code that depends on either behaviour.
- **`FileManager.replaceItemAt` on Linux.** Unusable on 6.3.x, merely non-durable on 6.4.0; main keeps changing it (PR 5454). Treat as unstable surface.
- **NIOFS naming.** `NIOFS`/`NIOFilePath` is in the repo but only `_NIOFileSystem` (underscore, `SystemPackage.FilePath`) is a library product at 2.104.0; the API and the `replaceItem` implementation may change when `NIOFS` is exported. Re-check before pinning code to either spelling.
- **Directory fsync necessity.** Filesystem-dependent: ext4 with `auto_da_alloc` and XFS give stronger replace-via-rename ordering in practice, but the man page and LWN guidance require it for portability; this file follows the portable position. Reject-vs-strip for absolute archive names (bsdtar, containerization strip; fixture rejects) is policy, not a correctness question.
- **`F_FULLFSYNC`.** Standard advice on Darwin, unused by every exemplar; whether a CLI's cache needs it is a threat-model decision, not researched here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md | SE-0529 `FilePath` in the stdlib (primary) | accepted 2026-06-05 | Path syntax by platform, anchors, deferred resolve-beneath, `compiler(>=6.4)` compat sketch |
| https://forums.swift.org/t/accepted-with-modifications-se-0529-filepath/87125 | Acceptance post by review manager John McCall (primary) | 2026-06-05 | LSG reasoning on `resolve()`, platform-conditional APIs |
| https://forums.swift.org/t/se-0529-add-filepath-to-the-standard-library/86194 | SE-0529 review thread (primary) | 2026-04-23 | "`..` cannot be normalized away on Unix-like systems because of symbolic links" |
| https://github.com/apple/swift-system/blob/main/README.md | swift-system README, source stability and Swift-version table (primary) | 1.8.1, 2026-08 | Windows "Unstable"; 1.7+ needs Swift 6.1 |
| https://github.com/apple/swift-system/blob/main/Sources/System/FilePath/FilePathSyntax.swift | `lexicallyResolving`, `push`, `appending` (primary) | 2026 | The lexical guard and its documented limit |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Data/Data%2BWriting.swift | `Data.write` implementation, main @aadd9259be07 (primary) | 2026-10 | Temp naming, fsync, renameat, Windows branch |
| https://github.com/swiftlang/swift-foundation/blob/release/6.3/Sources/FoundationEssentials/Data/Data%2BWriting.swift | Same file on the 6.3 branch (primary) | 6.3.x | Mode captured only under `FOUNDATION_FRAMEWORK` |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/main/Sources/Foundation/FileManager%2BPOSIX.swift | `replaceItemAt` implementation (primary) | main 2026-10 | `renameat2(RENAME_EXCHANGE)` path |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/release/6.3/Sources/Foundation/FileManager%2BPOSIX.swift | Same file on the 6.3 branch (primary) | 6.3.x | Reversed `renameat` arguments (line 534) |
| https://github.com/swiftlang/swift-corelibs-foundation/pull/5454 | PR "Cleanup swapped item after renameat2 call in FileManager" (primary) | merged 2026-04-15 | History of the Linux replace path |
| https://github.com/apple/swift-nio/blob/main/Sources/NIOFS/FileSystem.swift | NIOFS `replaceItem`, `moveItem` (primary, exemplar @e12881f2a691) | 2026-10 | Docstring vs body mismatch |
| https://github.com/apple/containerization/blob/main/Sources/ContainerizationArchive/ArchiveReader.swift | fd-anchored tar extraction (primary, exemplar @3e7bc39e66b3) | 2026-10 | Reference traversal guard |
| https://github.com/apple/containerization/blob/main/Sources/ContainerizationOS/FileDescriptorOps.swift | fd-relative primitives, `O_RESOLVE_BENEATH` note (primary) | 2026-10 | The primitives layer to copy |
| https://github.com/apple/containerization/blob/main/Sources/ContainerizationOCI/Content/ContentWriter.swift | CAS writer (primary) | 2026-10 | Good `create(from:)`, bad `write(_:)` |
| https://github.com/swiftlang/swiftly/blob/main/Sources/SwiftlyCore/FileLock.swift | PID-file lock (primary) | 2026-10 | Stale-lock design |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release announcement (primary) | 2026-09-14 | No `FilePath` or atomic-write change listed |
| https://man.archlinux.org/man/fsync.2.en | Linux man-pages fsync(2) | current | Directory fsync sentence |
| https://man.archlinux.org/man/rename.2.en | Linux man-pages rename(2) | current | Atomic replace wording, `RENAME_NOREPLACE`/`EXCHANGE`, `EXDEV` |
| https://man.archlinux.org/man/open.2.en | Linux man-pages open(2) | current | `O_NOFOLLOW` guards only the last component |
| https://man.archlinux.org/man/openat2.2.en | Linux man-pages openat2(2) | Linux 5.6+ | `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS` |
| https://lwn.net/Articles/457667/ | LWN, "Ensuring data reaches disk" | 2011, still the reference | The temp, fsync, rename, fsync-directory recipe |
| https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw | MoveFileExW | current | `MOVEFILE_WRITE_THROUGH` scope |
| https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew | ReplaceFileW | current | Partial-failure codes 1175-1177 |
| https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation | Maximum path length | Win10 1607+ | `longPathAware` opt-in |
| https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file | Naming files | current | Reserved device names |
| https://docs.python.org/3/library/tarfile.html#extraction-filters | Python tarfile extraction filters | 3.14 | Cross-language precedent for default-deny extraction |
| https://www.sqlite.org/pragma.html#pragma_fullfsync | SQLite PRAGMA fullfsync | current | `F_FULLFSYNC` is a Darwin-only stronger fsync |
| rules/rust-quality/durable-state.md (this repo) | Fleet durable-state depth file | 2026 | STATE-1..8, 28..35, Platform Gaps |
| .agents/research/swift-topic-map.md (this repo) | Topic map rows M-G-01..05, 17..19, M-I-04 | 2026-10-10 | Decisions this file serves |
| .agents/research/swift-topic-map/domain.md (this repo) | Domain scout notes | 2026-10-10 | Its "`.atomic` restores mode" claim is main-only, corrected here |
| https://github.com/apple/swift-nio/blob/main/Package.swift | swift-nio manifest | 2.104.0 | `_NIOFileSystem` is the exported product, `NIOFS` is not |
| https://github.com/apple/containerization/blob/main/Sources/Containerization/Image/ImageStore/ImageStore%2BImport.swift | Verify-then-move blob import (primary) | 2026-10 | The exemplar's digest check before publish |
