---
title: Atomic writes, os.Root confinement, archive extraction, paths and permissions
topic: files-and-atomicity
agent: go-io/files-and-atomicity
model: sonnet
date_researched: 2026-09-26
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/files-and-atomicity/
scope: >
  How Go code commits state that must survive a crash (temp-file-then-rename,
  fsync discipline, Windows replace, on-disk format versioning, cross-process
  locks) and how it opens paths it does not trust (os.Root, filepath.IsLocal,
  archive/tar and archive/zip traversal defenses, permission literals).
  Excludes subprocess I/O (GO-IO's other dive, `subprocess-contract`), network
  I/O, and general error handling.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Atomic writes: the crash-consistency contract](#1-atomic-writes-the-crash-consistency-contract)
   2. [The `defer os.Remove(tmp)` trap](#2-the-defer-osremovetmp-trap)
   3. [Windows: atomic replace has no portable guarantee](#3-windows-atomic-replace-has-no-portable-guarantee)
   4. [os.Root: what it guarantees and what it explicitly does not](#4-osroot-what-it-guarantees-and-what-it-explicitly-does-not)
   5. [filepath.IsLocal / Localize: lexical-only, blind to symlinks](#5-filepathislocal--localize-lexical-only-blind-to-symlinks)
   6. [archive/tar and archive/zip: insecure by default](#6-archivetar-and-archivezip-insecure-by-default)
   7. [Decompression bombs: bound before you copy](#7-decompression-bombs-bound-before-you-copy)
   8. [Permission literals and umask](#8-permission-literals-and-umask)
   9. [Windows-reserved names from untrusted input](#9-windows-reserved-names-from-untrusted-input)
   10. [On-disk format versioning](#10-on-disk-format-versioning)
   11. [Cross-process file locks](#11-cross-process-file-locks)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A crash between `Write` and `Rename` on a `CreateTemp`-in-target-dir writer leaves the original file byte-for-byte intact; the same crash against `os.WriteFile` leaves the file truncated to whatever was flushed, because `O_TRUNC` destroys the old content at `open()` time, before any new byte lands — measured directly on this sandbox (§Verification runs, fixture `crash-write`).
- An unconditional `defer os.Remove(tmp.Name())` after a *successful* `Rename` is a real, forceable bug, not a theoretical one: once the rename commits, `tmp.Name()` is a free path, and the deferred remove fires regardless, deleting whatever now occupies it — track a `renamed` bool instead (§2, fixture `defer-remove`).
- `archive/tar.Reader.Next()` and `archive/zip.OpenReader`/`NewReader` do **not** reject a `../`-traversal entry name by default in Go 1.27.1 — `GODEBUG=tarinsecurepath=0` / `zipinsecurepath=0` must be set explicitly to get `ErrInsecurePath`; the permissive behavior is the default, not the opt-in (§6, fixture `extract`, confirmed by direct run).
- Even with the strict `GODEBUG` setting, `zip.NewReader`/`OpenReader` still populates the returned `Reader.File` slice while also returning `ErrInsecurePath` — a caller who checks `err != nil` correctly bails, but a caller who discards the error (`zr, _ := zip.NewReader(...)`) gets the malicious entries anyway.
- `filepath.IsLocal` rejects `..`-traversal and absolute names but is **purely lexical** and does not see symlinks: a two-entry archive (a symlink named `link` pointing outside the destination, then a file named `link/victim.txt`) sails through an `IsLocal`-guarded extractor untouched, while `os.Root` rejects the same entry with `openat ...: path escapes from parent` — measured directly (§4–6, fixture `extract`).
- `os.Root` (Go 1.24, method set completed 1.25 — `Chmod`/`Chown`/`Chtimes`/`Link`/`Lchown` etc. landed then) is the confinement MUST for any name Go code did not choose itself; its own doc explicitly disclaims protection against Linux bind mounts, `/proc`, Unix device files, and states `Root.Chmod`/`Chown`/`Chtimes` race if the target flips from file to symlink mid-operation.
- 4 of 5 re-read "unguarded" archive-extraction sites from the runtime-posture audit's 9/92 sample are in fact guarded — by a named helper (`fs.RootPath`, `safepaths`+`ghzip`) or by never trusting the entry name as a path at all (matching only a fixed basename and writing to a hardcoded destination); the audit's 10% figure is a real lower bound on the *inline four-idiom* count, not on actual guard coverage (§Exemplar evidence).
- `google/renameio`'s three documented subtleties (state-tracked remove, same-filesystem temp dir respecting `TMPDIR`, required `fsync`) are the correct MUST shape; the library itself exports nothing on Windows because atomic replace there has no equivalent guarantee (golang/go#22397) — Windows needs its own bounded remove-then-rename retry, not a port of the Unix idiom.
- A 0o777 permission literal is a real finding regardless of the running umask: it is a *request* the umask filters (0o777 under umask 0o022 → 0o755 on disk, measured), but the call site does not own the umask and a hostile or relaxed one (0o000, some containers) turns the request directly into a world-writable file.
- `filepath.IsLocal`'s Windows-reserved-name check (`CON`, `NUL`, `COM1`, …) is compiled only into the Windows build of `internal/filepathlite`; run on `GOOS=linux`, `filepath.IsLocal("CON")` returns `true` — measured directly — so a tag-derived filename check that runs `IsLocal` on a Linux CI runner and trusts the verdict for a Windows artifact is a false negative.
- gosec's own docs disagree with each other about `G307`: `RULES.md` says the old meaning ("deferring a method that returns an error") is retired and the ID now means file-creation permissions, but `README.md`'s "excluded by default" list still describes the old meaning — an agent that reads only the README will mis-cite `G307`.
- `os.Root` alone stops the local-filesystem half of zip-slip (nothing written outside the root) but does nothing about parsing the entry names themselves; a defense-in-depth extractor still checks `filepath.IsLocal` (or rejects on sight) before ever calling into `os.Root`, because the two checks catch different things.
- CVE-2025-3445 (`mholt/archiver`, GHSA-7vpp-9cxj-q8gv) is a live, current-era instance of exactly this bug class: a crafted zip with traversal/symlink entries escapes the extraction directory via `Unarchive()`; the maintainers' fix was to delete the vulnerable API in the successor project (`mholt/archives`) rather than patch it.
- There is no cross-platform stdlib file-lock API; the working pattern in the exemplar corpus (`cli/cli@9b031151a825:internal/flock/`) is a two-file GOOS split — `syscall.Flock(fd, LOCK_EX|LOCK_NB)` on Unix, `golang.org/x/sys/windows.LockFileEx(..., LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY)` on Windows — unified behind one `TryLock`/`ErrLocked` API; `github.com/gofrs/flock` is the off-the-shelf equivalent when a dependency is acceptable.
- A decompression bomb is bounded the same way whether the vector is tar or zip: `io.LimitReader(entryReader, cap)` before `io.Copy`, or checking the header's declared size against a cap before copying at all — measured: an unbounded copy of a 51,969-byte zip pulls 52,428,800 bytes (50 MiB, ~1000×) with no error; the bounded twin aborts at 8 MiB with a non-zero exit.
- No linter in golangci-lint's roster, staticcheck, or `go vet` checks for the atomic-write shape, `os.Root` adoption, or archive-extraction guards; `gosec` (`G110`, `G301`–`G307`, `G305`) is the only codified coverage, and it is opt-in (not in golangci-lint's `standard` 5-linter default) — this whole family is enforced by review or by `go build` failing a planted fixture, not by a gate command.

## Findings

### 1. Atomic writes: the crash-consistency contract

The de facto idiom across the exemplar corpus is create-temp-then-rename: `os.CreateTemp` and `os.Rename` appear at a near 1:1 ratio (105 vs 101 call sites) — [exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md). No exemplar imports a dedicated atomic-write library (`google/renameio` and `natefinch/atomic` are both 0 corpus-wide); everyone hand-rolls the two-syscall pattern, and `os.WriteFile` (single-syscall, non-atomic) is still the majority idiom at 388 sites, meaning most file writes in this corpus accept non-atomicity by default.

`google/renameio`'s README states the correct shape precisely and is the best available normative source, since the pattern itself is not documented as a recipe anywhere in `go.dev`:

1. **State-tracked cleanup.** "a remove must not be attempted if the rename succeeded, as a new file might have been created with the same name" — a bare `defer os.Remove(t.Name())` is wrong; see [§2](#2-the-defer-osremovetmp-trap). [renameio README](https://github.com/google/renameio/blob/master/README.md)
2. **Same filesystem, respecting `TMPDIR`.** `Rename` across filesystems fails (`EXDEV`); the temp file must be created in the *target directory* (or another location on the same mount), not the OS default temp dir, while still respecting `TMPDIR` when the caller wants that. `oras-project/oras-go`'s `tempFile()` gets this wrong for the general case — `os.CreateTemp("", "oras_file_*")` uses the OS default temp directory, not a sibling of the working directory — though in that codebase it is scoped to gzip staging, not the final blob path ([domain.md §10](../go-topic-map/domain.md)).
3. **`fsync` before `Rename`.** POSIX guarantees `rename(2)` is atomic for concurrent *readers*, but says nothing about durability across a crash: without an `fsync` on the temp file, a crash immediately after `Rename` can still surface a 0-length or stale-cached file. [danluu.com/file-consistency](https://danluu.com/file-consistency/) generalizes further: `fsync` semantics vary by OS and filesystem (macOS requires `fcntl(F_FULLFSYNC)`; some Linux ext3 configurations only flush on inode change; some disks ignore flush directives outright), and **the directory must also be fsynced** after the rename for the new directory entry itself to be durable, not just the file's data.

The MUST shape, in order: `os.CreateTemp(targetDir, pattern)` → write → `tmp.Sync()` → `tmp.Close()` (check the error — a buffered write that failed can still return a nil error from `Write` and only surface on `Close`/`Sync`) → `os.Rename(tmp.Name(), target)` → (optionally) `fsync` the containing directory via `os.Open(dir); f.Sync()`. Directory fsync is the step most hand-rolled implementations skip, because it requires opening the *directory* as a file descriptor and calling `Sync()` on it — legal on Unix, meaningless on Windows (directories aren't independently syncable there).

**Correct (the MUST shape):**
```go
tmp, err := os.CreateTemp(targetDir, "state.*.tmp")
if err != nil { return err }
renamed := false
defer func() { if !renamed { os.Remove(tmp.Name()) } }()
if _, err := tmp.Write(data); err != nil { tmp.Close(); return err }
if err := tmp.Sync(); err != nil { tmp.Close(); return err }
if err := tmp.Close(); err != nil { return err }        // checked Close: buffered errors surface here
if err := os.Rename(tmp.Name(), target); err != nil { return err }
renamed = true
if dir, err := os.Open(targetDir); err == nil { dir.Sync(); dir.Close() } // best-effort on Unix
return nil
```
**Wrong (the majority idiom, non-atomic):**
```go
return os.WriteFile(target, data, 0o644) // O_TRUNC destroys the old content before any new byte is durable
```

Confirmed on this sandbox by killing a writer mid-write (§Verification runs, `crash-write`): the atomic version leaves the target byte-identical to its pre-crash content (an orphaned `.tmp` file is the only artifact — a real consequence, see [§10](#10-on-disk-format-versioning)); the `os.WriteFile`-shaped version leaves the target truncated to only the first chunk written, permanently destroying the old content even though the crash happened before the *new* content was complete.

`renameio` itself (v2) is a reasonable **recommendation, not a MUST**: it gets the same three subtleties right with less code than hand-rolling, but it "does not export any functions on Windows" ([§3](#3-windows-atomic-replace-has-no-portable-guarantee)), so a cross-platform codebase still needs its own Windows branch regardless of whether it uses `renameio` on Unix.

### 2. The `defer os.Remove(tmp)` trap

Planted and watched directly (fixture `defer-remove`): a function that does `tmp, _ := os.CreateTemp(dir, "up.*.tmp"); defer os.Remove(tmp.Name())` unconditionally, then writes, closes, and successfully renames `tmp.Name()` onto the target — the deferred `Remove` still fires on return. If anything creates a new file at that now-free path before the deferred call runs (a genuine race in production: another writer's own `CreateTemp` on a low-entropy pattern, or — more realistically — the *same* process reusing the pattern in a retry loop), the unconditional defer deletes it. The fix is a tracked boolean, checked inside the deferred closure, not the bare `defer os.Remove(name)` written at the top of the function before the outcome is known.

### 3. Windows atomic replace has no portable guarantee

[golang/go#22397](https://github.com/golang/go/issues/22397#issuecomment-498856679) (linked from the `renameio` README) is the operative citation: unlike POSIX `rename(2)`, Windows' `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING` can fail transiently — most commonly `ERROR_ACCESS_DENIED` or `ERROR_SHARING_VIOLATION` — when another process (an AV scanner, a search indexer, a second reader) holds the target file open, even briefly. There is no way to make this fail-proof from user code; the accepted pattern (and the one `renameio` explicitly refuses to paper over by exporting *nothing* on Windows) is a **bounded remove-then-rename retry with backoff**, matching the Rust fleet's own `rename_replace`/`rename_race_backoff` in `crates/ocx_util/src/fs/symlink.rs:172-357` ([domain.md §22](../go-topic-map/domain.md)). A Go port: retry `os.Rename` (which calls `MoveFileEx` under the hood on Windows) a small bounded number of times (e.g. 5–10) with short exponential backoff (starting around 1–10ms), treating `windows.ERROR_SHARING_VIOLATION` and `windows.ERROR_ACCESS_DENIED` as retryable and everything else as fatal. This was not planted as a fixture in this pass — it requires a Windows runtime, unavailable in this sandbox (see [§Verification runs](#verification-runs)) — and is cited from source, not measured.

### 4. os.Root: what it guarantees and what it explicitly does not

`os.Root` (introduced Go 1.24; `Chmod`/`Chown`/`Chtimes`/`Link`/`Lchown`/`MkdirAll`/`ReadFile`/`Readlink`/`RemoveAll`/`Rename`/`Symlink`/`WriteFile` completed the method set in 1.25) confines every operation to a directory tree, following symlinks *within* the root but rejecting any that would escape it. Its own doc comment ([go1.27.1:src/os/root.go:34-67](https://raw.githubusercontent.com/golang/go/master/src/os/root.go)) is the authoritative gap list, quoted directly because every clause matters:

> "Methods on Root do not prohibit traversal of filesystem boundaries, Linux bind mounts, /proc special files, or access to Unix device files."
> "On Unix, `Root.Chmod`, `Root.Chown`, and `Root.Chtimes` are vulnerable to a race condition. If the target of the operation is changed from a regular file to a symlink while the operation is in progress, the operation may be performed on the link rather than the link target."
> "When GOOS=js, Root is vulnerable to TOCTOU ... and cannot ensure that operations will not escape the root." "When GOOS=plan9 or GOOS=js, Root does not track directories across renames." "WASI preview 1 (GOOS=wasip1) does not support `Root.Chmod`." Windows additionally disallows reserved device names (`NUL`, `COM1`, …) inside a Root.

`rootMaxSymlinks = 8` (matching POSIX's `SYMLOOP_MAX` floor) bounds symlink-following depth to avoid an infinite loop, not a security control per se.

Measured directly (fixture `extract`, mode `root`): given an entry named `../escape-dotdot.txt` and a two-step symlink escape (`link` → an outside directory, then `link/via-symlink.txt`), `os.Root.WriteFile`/`Symlink` reject **both** with `openat ../escape-dotdot.txt: path escapes from parent` and `openat link/via-symlink.txt: path escapes from parent` respectively — no file lands outside the root either way.

`aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-42` is the strongest exemplar of *using* `os.Root` correctly for a real consumer need: it wraps `*os.Root` and adds `Join(name)`, which validates via `filepath.IsLocal` plus an existence probe (an existing symlink that escapes is rejected; a not-yet-existing name is allowed so a caller can resolve a destination before creating it) and *documents its own residual risk in the doc comment*: "The result is a plain string, so it is not protected against a later symlink swap (TOCTOU): use it to hand a confined path to an external tool, and use the os.Root methods directly for ordinary I/O." This is the right pattern for the OCX SDK's `os/exec` boundary: do all filesystem operations through `os.Root` directly, and only ever degrade to a plain string path at the last moment, for handing to a subprocess that cannot take a `Root`-relative handle.

### 5. filepath.IsLocal / Localize: lexical-only, blind to symlinks

`filepath.IsLocal(path)` (Go 1.20) returns true iff the path is within the subtree rooted at "here," not absolute, not empty, and (only on the Windows build) not a reserved device name — and it says so about its own limits: "IsLocal is a purely lexical operation. In particular, it does not account for the effect of any symbolic links that may exist in the filesystem." [pkg.go.dev/path/filepath#IsLocal](https://pkg.go.dev/path/filepath#IsLocal). `filepath.Localize` (Go 1.23) is the inverse direction: it turns a slash-separated `io/fs`-style path into a valid OS path, guaranteed local, erroring if the OS cannot represent it (e.g., a literal backslash on Windows, where `\` is a separator).

Measured directly (fixture `extract`, mode `islocal`): an extractor that checks `filepath.IsLocal(name)` before `filepath.Join` correctly rejects `../escape-dotdot.txt` ("rejected non-local name") — but **extracts `link/via-symlink.txt` without complaint**, because that name has no `..` and is lexically local; the escape happens only because `link` itself was created as a symlink pointing outside the destination on an *earlier* entry in the same archive, something `IsLocal`'s lexical analysis cannot see. This is the precise, reproducible boundary between what `IsLocal` catches (traversal by name) and what it doesn't (traversal by symlink) — `os.Root` catches both ([§4](#4-osroot-what-it-guarantees-and-what-it-explicitly-does-not)).

**The rule this measurement supports:** `os.Root` is the MUST for extracting or opening any archive/path whose entries include (or might include) symlinks — i.e., essentially all real tar/zip input; `filepath.IsLocal` alone is acceptable only for a format that structurally cannot contain a symlink (e.g., a flat manifest of names with no interposed directory-creation step), and even then it is a SHOULD-pair-with-`os.Root`-anyway given how cheap `os.Root` is once available (Go ≥1.24).

### 6. archive/tar and archive/zip: insecure by default

Both packages' own doc comments state the check exists and is off by default; measured directly on Go 1.27.1 (fixture `extract`, modes `tar-godebug`/`zip-godebug`):

| | default (`GODEBUG` unset) | `GODEBUG=tarinsecurepath=0` / `zipinsecurepath=0` |
|---|---|---|
| `tar.Reader.Next()` on a `../escape-dotdot.txt` entry | returns the header, **no error** | returns `archive/tar: insecure file path` |
| `zip.NewReader`/`OpenReader` on the same entry | `err == nil`; entry present in `.File` | returns `zip: insecure file path`; entry **still present** in `.File` |

Source: [go1.27.1:src/archive/tar/reader.go:44-57](https://raw.githubusercontent.com/golang/go/master/src/archive/tar/reader.go) — `Next` doc: "If Next encounters a non-local file name (as defined by filepath.IsLocal) and the GODEBUG environment variable contains `tarinsecurepath=0`, Next returns the header with an ErrInsecurePath error. A future version of Go may introduce this behavior by default." [go1.27.1:src/archive/zip/reader.go:68-116,162-175](https://raw.githubusercontent.com/golang/go/master/src/archive/zip/reader.go) is symmetric for zip, and additionally treats a backslash in the name as insecure (the zip spec mandates forward slashes). [doc/godebug.md](https://raw.githubusercontent.com/golang/go/master/doc/godebug.md) confirms both settings default to `=1` (permissive); `=0` is the strict opt-in, and "a future version of Go may introduce this behavior by default" is still true as of 1.27.1 — it has not happened yet.

**The load-bearing consequence for a caller:** setting the strict `GODEBUG` value is necessary but the return contract still requires checking the error and *stopping* — `zip.NewReader` returns a non-nil `Reader` alongside the non-nil `ErrInsecurePath`, precisely so a caller who wants to permit insecure names deliberately can do so, but that means a caller who writes `zr, _ := zip.NewReader(r, size)` (discarding the error) and then iterates `zr.File` gets every insecure entry back regardless of the `GODEBUG` setting.

`os.Root` closes the *destination-write* half of this independently of any `GODEBUG` setting or manual `IsLocal` check — see [go.dev/blog/osroot](https://go.dev/blog/osroot): "This closes the local-filesystem half of the zip-slip problem ... but does not itself validate archive entry names." The two layers are complementary, not redundant: reject the entry name (via strict `GODEBUG` or manual `IsLocal`) *and* write through `os.Root`, because each stops a distinct attack (a rejected-name check stops a `..`-shaped name from ever reaching disk; `os.Root` stops a symlink planted by an *earlier* entry from redirecting a *later*, lexically-innocent entry).

CVE-2025-3445 / [GHSA-7vpp-9cxj-q8gv](https://github.com/advisories/GHSA-7vpp-9cxj-q8gv) is the current live instance of this bug class: `mholt/archiver`'s `Unarchive()` let a crafted zip (traversal and/or symlink entries) write outside the destination; the fix that shipped was deleting the vulnerable API entirely in the successor module (`mholt/archives`) rather than patching it in place — "the ecosystem's fix was deletion, not a patch" ([failure.md §15](../go-topic-map/failure.md)), which is itself the strongest possible argument against hand-rolling extraction without both layers above.

### 7. Decompression bombs: bound before you copy

The zip (and tar+gzip) format lets a declared/actual uncompressed size vastly exceed the compressed archive size. Measured directly (fixture `zip-bomb`): a 51,969-byte zip entry (`compress/flate`, `BestCompression`, all-zero payload) declares — and, on `io.Copy(io.Discard, rc)`, actually produces — 52,428,800 bytes (50 MiB, a ~1000× ratio), with `err == nil`. Wrapping the entry reader in `io.LimitReader(rc, cap)` before the copy aborts once the cap is reached; checked against the declared cap after the copy (`n >= cap`), the bounded run returns a non-nil error and stops at exactly the 8 MiB cap instead of continuing to the full 50 MiB. gosec's `G110` ("Detect io.Copy instead of io.CopyN when decompressing") is the codified form of this exact rule ([codified.md §6](../go-topic-map/codified.md)); `io.LimitReader` is the more idiomatic mechanism in current Go (`io.CopyN` also works but requires a manual loop-and-check if the caller wants to know how much was actually available versus truncated).

`syncthing/syncthing`'s self-updater layers three independent bounds on the same untrusted download — `io.LimitReader(resp.Body, maxArchiveSize)` on the whole stream, a `maxArchiveMembers` count limit on the loop, and `if hdr.Size > maxBinarySize { break }` per-entry before even attempting to process it ([exemplar evidence](#exemplar-evidence)) — a good model for "bound the whole archive, bound the entry count, bound each entry," rather than a single check.

### 8. Permission literals and umask

Measured directly (fixture `umask-perms`): `os.Mkdir(dir, 0o777)` under `umask 022` produces `0o755` on disk; under `umask 077` it produces `0o700`. The literal in source is a **request**; the umask filters it at `open`/`mkdir` time (Unix only — Windows has no umask, and Go's `os.FileMode`→Windows-ACL mapping is coarser still, another reason a permission literal review needs a platform note). This means:

- `0o777`/`0o666` literals are a finding **independent of the observed umask on any one machine**, because the call site does not control or know the umask at every place it will run (a container image can set umask 0, a CI runner might differ from a developer's shell). Measured: 64 `os.MkdirAll(..., 0777)` call sites corpus-wide, all confirmed genuine (not a regex false positive) on spot-read, concentrated in `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153` (a build-tool temp-dir helper) ([exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md)).
- Bare-octal (`0644`) vs `0o`-prefixed (`0o644`) is a style question, not a security one, but the legacy bare form is still the majority (212 vs 123, 63%) even in 2026-era code, and it is what `go fix`'s `omitzero`-adjacent modernizers do *not* touch — no fixer in `go tool fix help`'s 26-analyzer roster rewrites bare octal to `0o`-prefixed.
- gosec's rule catalogue covers this family as `G301` (directory creation), `G302` (file creation/`chmod`), `G306` (`WriteFile`), `G307` (`os.Create`) — [securego/gosec RULES.md](https://raw.githubusercontent.com/securego/gosec/master/RULES.md). **`G307`'s ID was reassigned**: RULES.md states "G307 (old meaning: deferred method error handling) is retired; the ID now refers to file creation permissions," but `README.md`'s excluded-by-default rule list still describes the *old* meaning ("Deferring a method which returns an error") — the two files in gosec's own repository disagree as of this read (2026-09-26); cite `RULES.md`, not `README.md`, for what `G307` currently means. `G305` is specifically "File path traversal when extracting zip archive" — the zip-slip rule, distinct from the permission family.
- `G303` ("Creating tempfile using a predictable path") is the rule that would flag hand-rolled temp names (e.g., a fixed `/tmp/myapp.tmp` instead of `os.CreateTemp`'s random suffix) — relevant to [§1](#1-atomic-writes-the-crash-consistency-contract): the atomic-write MUST already uses `os.CreateTemp`, which is `G303`-clean by construction.

### 9. Windows-reserved names from untrusted input

Go's own Windows-reserved-name check (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, case-insensitive, with a documented Windows-11-era relaxation for names with an extension) lives in `internal/filepathlite.isReservedName` and is compiled **only** into the Windows-target build of the package ([GOROOT]/src/internal/filepathlite/path_windows.go:93-130, read from the locally installed Go 1.27.1 toolchain). `filepath.IsLocal`'s doc says "on Windows, is not a reserved name such as NUL" — true, but only when the binary itself is built for `GOOS=windows`.

Measured directly on this sandbox (`GOOS=linux`, fixture `reserved-name`): `filepath.IsLocal("CON")`, `filepath.IsLocal("NUL")`, `filepath.IsLocal("com1")` all return `true`. A tag- or digest-derived filename check that runs on a Linux CI runner or a Linux-hosted agent and trusts `IsLocal`'s verdict as "safe everywhere" is systematically blind to this class — relevant to any Go CLI or SDK that derives an on-disk filename from an OCI tag, a git ref, or other externally-controlled string that might later be read on, or the same binary might later run on, Windows (`regclient`, `oras-go`, and the OCX SDK's own content-addressed/tag-derived paths all do this). The portable fix is a manual, OS-independent reserved-name table (shown working in the fixture) checked in addition to `IsLocal`, not instead of it — `IsLocal` still catches everything else (traversal, absolute paths, empty names).

### 10. On-disk format versioning

No normative Go-specific guidance exists for this (it is a general format-design practice, not a language feature); the map correctly rates it P2, uncovered. The atomic-write fixture in [§1](#1-atomic-writes-the-crash-consistency-contract) surfaces the concrete, Go-specific consequence that motivates it: a crash between `CreateTemp` and `Rename` leaves an orphaned `.tmp` file in the target directory — confirmed present after the kill in the fixture run. Any on-disk state directory that uses this pattern needs, at minimum: (1) a recognizable temp-file naming pattern (`os.CreateTemp`'s default already gives one: a fixed prefix plus a random suffix) so a startup sweep can find and remove orphans older than some threshold, and (2) a version/magic marker in the *committed* file format so a reader can distinguish "this file is from an older schema" from "this file is corrupt." `tailscale/tailscale`'s self-update ([exemplar evidence](#exemplar-evidence)) demonstrates the multi-file version of the same idea: extract every file to a `.new` sibling, verify all of them, and only then `os.Rename` each into place — "only place the files in final locations after everything extracted correctly," making a multi-file update atomic-as-a-set even though the filesystem gives no multi-file transaction primitive.

### 11. Cross-process file locks

The stdlib has no portable file-lock API — `flock(2)` and `LockFileEx` are OS-specific syscalls with different semantics (POSIX advisory locking that any process can ignore vs. Windows mandatory byte-range locking tied to a specific handle). The working exemplar pattern, `cli/cli@9b031151a825:internal/flock/` (three files: `flock.go` for the shared `ErrLocked` sentinel and doc, `flock_unix.go` under `//go:build !windows`, `flock_windows.go` under `//go:build windows`):

```go
// flock_unix.go, //go:build !windows
func TryLock(path string) (f *os.File, unlock func(), err error) {
    f, err = os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)
    if err != nil { return nil, nil, err }
    if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
        f.Close()
        if errors.Is(err, syscall.EWOULDBLOCK) { return nil, nil, ErrLocked }
        return nil, nil, err
    }
    return f, func() { syscall.Flock(int(f.Fd()), syscall.LOCK_UN); f.Close() }, nil
}
```
```go
// flock_windows.go, //go:build windows
func TryLock(path string) (f *os.File, unlock func(), err error) {
    f, err = os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)
    if err != nil { return nil, nil, err }
    ol := new(windows.Overlapped)
    handle := windows.Handle(f.Fd())
    err = windows.LockFileEx(handle, windows.LOCKFILE_EXCLUSIVE_LOCK|windows.LOCKFILE_FAIL_IMMEDIATELY, 0, 1, 0, ol)
    if err != nil {
        f.Close()
        if errors.Is(err, windows.ERROR_LOCK_VIOLATION) { return nil, nil, ErrLocked }
        return nil, nil, err
    }
    return f, func() { windows.UnlockFileEx(handle, 0, 1, 0, ol); f.Close() }, nil
}
```
The doc comment on both is worth keeping verbatim: "The caller should read/write through the returned file to avoid platform differences with mandatory locking on Windows" — because Windows' lock is tied to the specific open handle, not the path, a second `os.Open` of the same path from the *same* process bypasses the lock entirely on Windows in a way it would not on Unix. This mirrors the Rust fleet's own `FileLock` note on `LockFileEx` locking "a byte range on a *specific handle*" ([domain.md §22](../go-topic-map/domain.md)). `github.com/gofrs/flock` packages the same two syscalls behind one portable type when a dependency is acceptable (it is the de facto standard third-party choice — used by Terraform and other HashiCorp tools); nothing in the exemplar corpus suggested a reason to prefer it over the ~35-line hand-rolled version for a project already splitting other code by `GOOS`.

## Normative guidance candidates

1. **Every write to a file that must survive a process crash uses `os.CreateTemp(targetDir, pattern)` → write → `Sync()` → checked `Close()` → `os.Rename` — never `os.WriteFile`/`os.Create` directly on the final path.**
   Rationale: `os.WriteFile` truncates the target before the new content is durable; a crash mid-write destroys the old content with no new content to replace it, which `CreateTemp`+`Rename` cannot do (the target is only touched by the single atomic `rename(2)`).
   Verify: reading heuristic — `rg -n -e 'os\.WriteFile\(' -e 'os\.Create\(' . --include='*.go'` in any package directory, then manually check whether the target is a state file this rule protects (a cache, config, index, lock metadata) vs. a genuinely disposable output (a log, a report); no analyzer distinguishes these automatically.
   RUN: **yes** — fixture `crash-write` (`/home/mherwig/.cache/research-lang/go-tools/fixtures/files-and-atomicity/crash-write/`), see Verification runs. Watched red (naive, truncated) and green (atomic, intact) on the same kill signal and timing.

2. **A `defer` that removes a temp file must check whether the rename it followed actually succeeded before removing; never `defer os.Remove(tmp.Name())` unconditionally after a rename in the same function.**
   Rationale: once `Rename` commits, the temp path is free; anything that reoccupies it before the deferred call runs gets deleted by code that has no business touching it.
   Verify: reading heuristic — grep for the shape `defer os.Remove(` appearing before a later `os.Rename(` call using the same variable in the same function body; no analyzer flags this (staticcheck/govet have no defer-vs-rename-ordering check).
   RUN: **yes** — fixture `defer-remove`. Buggy mode destroys a same-named "collision victim" file created after a successful rename; safe mode (a tracked `renamed` bool) leaves it intact.

3. **Any path built from an untrusted or externally-derived name (an archive entry, a URL path segment, a git ref, an OCI tag) that is used to open, create, or write a file on disk goes through `os.Root` (Go ≥1.24), never through `filepath.Join(base, untrusted)` followed by a plain `os.*` call.**
   Rationale: `os.Root` rejects both lexical traversal (`..`, absolute) and symlink-based escapes at the syscall level (`openat`-family); `filepath.Join`+`os.Create` rejects neither.
   Verify: `os.Root`/`os.OpenInRoot` adoption — reading heuristic: `rg -n -e 'os\.Root' -e 'os\.OpenInRoot' -e 'os\.OpenRoot' . --include='*.go'`; absence in a package that does `filepath.Join(dest, entryName)` on any archive/network-derived name is the finding. No lint or vet analyzer checks this; gosec's `G304`/`G305` are the closest codified proxies (tainted path, zip traversal) but do not know about `os.Root` as the fix.
   RUN: **yes** — fixture `extract`, mode `root` vs `naive`/`islocal`. `os.Root` rejected both the dotdot entry and the symlink-escape entry that `filepath.Join`(naive) and `filepath.IsLocal`(islocal, partially) let through.

4. **`filepath.IsLocal` alone is not a sufficient traversal guard for any archive or path set that could contain a symlink entry — pair it with `os.Root`, or use `os.Root` alone.**
   Rationale: `IsLocal` is lexical-only by its own documentation; it cannot see that an earlier entry created a symlink that redirects a later, lexically-clean name.
   Verify: reading heuristic — any extraction loop that checks `filepath.IsLocal(name)` and then still calls a plain `os.Symlink`/`os.Create` (not through `os.Root`) for typeflags that include `tar.TypeSymlink`/`TypeLink` is under-guarded.
   RUN: **yes** — same `extract` fixture, mode `islocal`: rejected the dotdot entry, silently extracted `link/via-symlink.txt` through the earlier symlink.

5. **Set `GODEBUG=tarinsecurepath=0` and `GODEBUG=zipinsecurepath=0` (via `//go:debug` directive in `main` or the process environment) on any binary that parses tar/zip archives from outside the binary's own build, and check the returned error before using the reader — the default in Go 1.27.1 is permissive.**
   Rationale: without this, `tar.Reader.Next()` and `zip.NewReader`/`OpenReader` silently accept non-local entry names; this is a one-line, zero-risk hardening (it can only reject archives that were already going to be mishandled).
   Verify: `rg -n 'GODEBUG' go.mod .github .; rg -rn -e 'tarinsecurepath' -e 'zipinsecurepath' . --include='*.go'` (directory operand required either way) — empty output means the setting is not pinned anywhere in the repo (the finding); a `//go:debug tarinsecurepath=0` line in the `main` package or a `GODEBUG=` env assignment in the deploy manifest is the fix.
   RUN: **yes** — fixture `extract`, modes `tar-godebug`/`zip-godebug`, both the default and `GODEBUG=...=0` env cases executed and compared.

6. **Any decompression of untrusted or externally-fetched data (a tar/gzip stream, a zip entry, an HTTP response body) is copied through `io.LimitReader(src, cap)`, never a bare `io.Copy(dst, src)`.**
   Rationale: a compressed payload with a declared or actual size far exceeding its compressed size (a decompression bomb) otherwise exhausts memory or disk with no upper bound.
   Verify: gosec `G110` ("Detect io.Copy instead of io.CopyN when decompressing") — enable via `golangci-lint run --enable gosec` with `G110` not excluded, or `gosec ./...` directly; reading heuristic if gosec is unavailable: `rg -n -B3 'io\.Copy\(' . --include='*.go'` then check whether the source is a `gzip.Reader`/`flate.Reader`/`zip.File.Open()` result three lines up.
   RUN: **yes** — fixture `zip-bomb`. Unbounded copy: 51,969 compressed bytes → 52,428,800 bytes copied, `err == nil`. Bounded copy (`io.LimitReader(rc, 8<<20)`): stops at 8,388,608 bytes, non-nil error, exit 1.

7. **A permission literal above `0o755` for a directory or `0o644` for a file, anywhere in the codebase, is a finding independent of any locally observed umask.**
   Rationale: the umask is process- and environment-dependent (a container, a CI runner, and a developer's shell can all differ); the literal in source is what the call site actually asks the kernel for, and a permissive umask turns that request directly into a permissive file.
   Verify: gosec `G301` (directory), `G302` (chmod/general create), `G306` (`WriteFile`), `G307` (`os.Create`) — enable in `golangci-lint`'s gosec settings (not in the `standard` 5-linter default, must be added explicitly); reading heuristic: `rg -n -e '0o?777' -e '0o?666' . --include='*.go'` (both bare-octal and `0o`-prefixed forms, since 63% of the corpus still uses bare octal).
   RUN: **yes** — fixture `umask-perms`: `0o777` request under `umask 022` → `0o755` on disk; under `umask 077` → `0o700` on disk, confirming the literal-vs-umask interaction directly rather than asserting it from documentation alone.

8. **A filename derived from external input (a tag, digest, git ref, or archive entry) that might ever be read on, or run on, Windows is checked against the Windows-reserved-device-name list explicitly — do not rely on `filepath.IsLocal` unless the binary is actually built for `GOOS=windows`.**
   Rationale: the reserved-name check inside `filepath.IsLocal` is compiled only into the Windows build; a Linux-built agent or CI job validating a filename with `IsLocal` gets a false "safe" verdict for names like `CON`, `NUL`, `COM1`.
   Verify: reading heuristic only — there is no analyzer or lint for this; the check is: does the code path that validates an externally-derived filename run (or get tested) on `GOOS=windows`, or does it carry its own OS-independent reserved-name table?
   RUN: **yes** — fixture `reserved-name`, executed on this sandbox's native `GOOS=linux`: `filepath.IsLocal("CON")` → `true` (the gap, demonstrated); the fixture's portable manual table correctly flags it regardless of `GOOS`.

9. **Extraction from an archive with genuinely untrusted origin (a downloaded release asset, a container/OCI layer, a CI artifact) never derives its final on-disk path directly from the entry name unless that path also passes through `os.Root` — match against a fixed allowlist of expected basenames and write to hardcoded destinations where the format allows it.**
   Rationale: this is the pattern that made 4 of 5 re-read "unguarded" exemplar sites actually safe despite using none of the four inline guard idioms an automated audit searches for — see Exemplar evidence; it sidesteps the traversal question rather than trying to detect every escape shape.
   Verify: reading heuristic only, by design — this is a structural choice (allowlist-and-fixed-destination vs. name-derived-destination), not something a single grep pattern detects; the audit-grade proxy is: does the extraction loop's `switch`/`if` key off `filepath.Base(entry.Name)` against a small constant set, or does it join the full `entry.Name` into a destination path?
   RUN: no — structural/reading heuristic only; not a mechanical check that can be planted as a red/green fixture without re-modeling the entire calling convention of each exemplar.

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/go-tools/run.sh go ...` (Go 1.27.1) unless noted; fixtures live under `/home/mherwig/.cache/research-lang/go-tools/fixtures/files-and-atomicity/`.

**`crash-write`** (`crash-write/main.go`, `crash-write/run.sh`) — a writer process is started, `SIGKILL`ed 0.6s in (mid-sleep, before the second chunk/rename), and the target file is inspected.
```
$ ./run.sh naive
before: OLD-CONTENT-V1------
after (naive): AAAAAAAAAAAAAAAAAAAA
```
Target truncated to only the first chunk (20 of the intended 40 new bytes); the pre-crash content is gone. Exit path: killed process, no explicit exit code (SIGKILL).
```
$ ./run.sh atomic
before: OLD-CONTENT-V1------
after (atomic): OLD-CONTENT-V1------
dir contents: target.1843973147.tmp (orphaned), target.txt (unchanged)
```
Target byte-identical to pre-crash content; an orphaned `.tmp` file is the only trace (see [§10](#10-on-disk-format-versioning)).

**`defer-remove`** (`defer-remove/main.go`) — `go run . buggy|safe <dir>`, prints the temp path, then a "collision victim" file is written to that same path 50ms after a successful rename, then the function returns (firing its defer).
```
$ go run . buggy /tmp/.../dr-buggy
/tmp/.../dr-buggy/up.3917514566.tmp
$ ls /tmp/.../dr-buggy/     # only target.txt remains — the .tmp/victim file is gone
$ go run . safe /tmp/.../dr-safe
/tmp/.../dr-safe/up.3941175591.tmp
$ cat /tmp/.../dr-safe/up.3941175591.tmp
COLLISION-VICTIM                          # survives
```
Exit code 0 both times (no crash involved — this is a logic bug, not a signal); the observable is file presence, not exit status.

**`extract`** (`extract/main.go`) — builds an in-memory tar/zip and runs each mode.

*GODEBUG default vs strict:*
```
$ ./extract tar-godebug                                 # GODEBUG unset
tar.Next() returned the dotdot header WITHOUT error (insecure default)
$ GODEBUG=tarinsecurepath=0 ./extract tar-godebug
tar.Next() error: archive/tar: insecure file path
$ ./extract zip-godebug                                 # GODEBUG unset
zip.NewReader() error: <nil>
  entry present in r.File: "../escape-dotdot.txt"
$ GODEBUG=zipinsecurepath=0 ./extract zip-godebug
zip.NewReader() error: zip: insecure file path
  entry present in r.File: "../escape-dotdot.txt"        # still populated, error must be checked
```
Exit code 0 in all four cases (informational tool, not a gate) — the finding is in the printed text, not the exit code, which is why the rule's Verify step above prescribes checking the returned error explicitly rather than trusting a process exit code.

*Extraction methods, dotdot + symlink-escape entries, `naive`/`islocal`/`root`:*
```
$ ./extract naive   dest-naive   outside-region
entry "../escape-dotdot.txt"   -> extracted        # ESCAPED one level above dest
entry "link/via-symlink.txt"   -> extracted         # ESCAPED into outside-region
$ ./extract islocal dest-islocal outside-region
entry "../escape-dotdot.txt"   -> REJECTED: rejected non-local name "../escape-dotdot.txt"
entry "link/via-symlink.txt"   -> extracted         # STILL ESCAPES — IsLocal is lexical-only
$ ./extract root    dest-root   outside-region
entry "../escape-dotdot.txt"   -> REJECTED: openat ../escape-dotdot.txt: path escapes from parent
entry "link/via-symlink.txt"   -> REJECTED: openat link/via-symlink.txt: path escapes from parent
```
Exit code 0 for all three (the harness records per-entry outcomes rather than failing the process); confirmed on disk with `find` after each run — `outside-region/via-symlink.txt` and the sibling `escape-dotdot.txt` exist after `naive`, `via-symlink.txt` still lands after `islocal` (the dotdot one is blocked), neither exists after `root`.

**`zip-bomb`** (`zip-bomb/main.go`) — builds a 50 MiB-of-zeros zip entry, then copies it unbounded vs. bounded.
```
$ ./zipbomb unbounded
compressed archive size: 51969 bytes
declared UncompressedSize64: 52428800 bytes
copied 52428800 bytes, err=<nil>
$ echo $?
0
$ ./zipbomb bounded
copied 8388608 bytes, err=declared/actual size exceeds 8388608 byte bound, aborting
$ echo $?
1
```
Violation (unbounded): exit 0, full 50 MiB copied. Compliant twin (bounded, 8 MiB cap): exit 1, stopped at the cap.

**`reserved-name`** (`reserved-name/main.go`) — checks `filepath.IsLocal` against Windows-reserved names, natively on this sandbox's `GOOS=linux`.
```
$ go run .
tag="CON"    IsLocal=true  windowsReserved(extra check)=true  -> naive-verdict-from-IsLocal-alone=safe portable-verdict=UNSAFE
tag="NUL"    IsLocal=true  windowsReserved(extra check)=true  -> naive-verdict-from-IsLocal-alone=safe portable-verdict=UNSAFE
```
Exit 0 (a report, not a gate); the finding is the `naive-verdict=safe` column for a name that is in fact reserved — that column is what a rule relying on bare `IsLocal` on Linux would compute.

**`umask-perms`** (`umask-perms/main.go`) — `os.Mkdir(dir, 0o777)` then `os.Stat` the result, under two umasks.
```
$ umask 022 && ./umaskperms /tmp/.../perm-test-022
requested=777 actual-on-disk=755
$ umask 077 && ./umaskperms /tmp/.../perm-test-077
requested=777 actual-on-disk=700
```
Exit 0 both times; the observable is the printed `actual-on-disk` value, confirming the umask-filters-the-literal claim directly rather than asserting it.

**Not run (documented from source only, with why):**
- **Windows atomic-replace retry** ([§3](#3-windows-atomic-replace-has-no-portable-guarantee)): requires a Windows runtime; none is available in this sandbox (`wine` is not installed, `GOOS=windows go build` cross-compiles but produces a `.exe` this environment cannot execute). Cited from `golang/go#22397` and the `renameio` README's own refusal to export functions on Windows.
- **Cross-process file lock behavior** ([§11](#11-cross-process-file-locks)): the recommended shape is quoted verbatim from a real, exercised exemplar (`cli/cli`'s own test suite covers this package upstream) rather than replanted here; a genuinely convincing runnable demonstration needs two real concurrent OS processes racing on the same file, which is a heavier fixture than this pass's budget covered — flagged as a reading-citation, not a gap in the underlying claim.

## Exemplar evidence

- **Atomic-write idiom, at scale:** `os.CreateTemp` 105 call sites, `os.Rename` 101, near 1:1, vs. `os.WriteFile` 388 (non-atomic majority) — [exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md).
- **`os.Root` real-world adoption:** 19 measured hits, concentrated and early; `aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-42` is the clearest wrapper, adding a `Join` helper with an explicit TOCTOU caveat in its own doc comment ([exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md); read directly).
- **Guarded extraction (audit-recognized idiom):** `regclient/regclient@43d2acb9fafd:pkg/archive/tar.go:141` — `filepath.Join(path, filepath.Clean("/"+hdr.Name))`, which neutralizes leading `..` by forcing the joined path through a synthetic root before cleaning.
- **Guarded extraction, re-measured this pass (idiom the audit's regex did not recognize as a guard — corrects the 9/92 figure downward as a true-positive count, upward as a true-guard-rate estimate):**
  - `containerd/containerd@934434dde54b:pkg/archive/tar.go:264-273` — `ppath, err = fs.RootPath(root, ppath)` (a symlink-resolving root-confinement helper, containerd's own pre-`os.Root` equivalent) followed by `filepath.Join(ppath, filepath.Join("/", base))`, applied to `hdr.Name` from an untrusted OCI layer diff-tar (`Apply`'s own doc: "applies a tar stream of an OCI style diff tar"). Genuinely untrusted input, genuinely guarded, missed by the inline-idiom regex because the guard is a named helper function.
  - `cli/cli@9b031151a825:pkg/cmd/copilot/copilot.go:377-403` (`extractZip`) — delegates to `internal/safepaths.ParseAbsolute` + `absPath.Join(f.Name)` pre-validation, then `internal/zip.ExtractZip`; the doc comment explains the pre-validation exists specifically because the shared `ghzip.ExtractZip` helper *silently skips* unsafe entries by default and this call site wants a hard error instead. Guarded; missed by the regex for the same reason.
  - `cli/cli@9b031151a825:pkg/cmd/run/download/http.go:30-66` (`downloadArtifact`) — downloads a GitHub Actions artifact zip from a server-supplied URL ("the artifact download URL is supplied by the API"), then extracts via the same `ghzip.ExtractZip` + `safepaths.Absolute`. Genuinely untrusted (workflow artifacts, a known abuse surface in forked-PR CI); guarded via the same delegated helper.
  - `syncthing/syncthing@94c3c1cdef71:lib/upgrade/upgrade_supported.go:245-291` (`readTarGz`/`readZip`) — bounds the whole stream with `io.LimitReader(resp.Body, maxArchiveSize)`, caps entry count via `maxArchiveMembers`, and — the traversal-relevant part — `archiveFileVisitor` (line 342) uses `path.Base(archivePath)` **only to match against a fixed set of expected basenames** (`"syncthing"`, `"syncthing.exe"`, `"release.sig"`) and writes to a caller-supplied, hardcoded destination (`writeBinary(dir, ...)`), never to a path derived from the untrusted entry name itself. Structurally immune to traversal by never trusting the name as a path component.
  - `tailscale/tailscale@6b3a45f14ef6:clientupdate/clientupdate.go:1053-1108` (`unpackLinuxTarball`) — identical structural pattern: `filepath.Base(th.Name)` used only for a `switch` against `"tailscale"`/`"tailscaled"`, writing to `tailscale+".new"`/`tailscaled+".new"` (fixed, pre-resolved paths), then `os.Rename` into place only "after everything extracted correctly" (a multi-file atomic-as-a-set commit, tying back to [§10](#10-on-disk-format-versioning)).
  - **Net correction to the audit's headline:** of 5 re-read "unguarded" sites, 4 were in fact guarded (via a named helper the regex didn't match, or via never using the untrusted name as a destination path at all); 0 of the 5 showed evidence of an actual exploitable gap reaching untrusted input unguarded. The audit's 9/92 (10%) figure is accurate as a count of the *four specific inline idioms* it searched for; it understates real guard coverage among sites that actually face untrusted input, because production code frequently guards through delegation or allowlisting instead.
- **Permission literal, exact site:** `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153` — `os.MkdirAll(out, 0777)`; confirmed present at that exact line on direct read, a build-tool temp-directory helper, not attacker-facing but a genuine world-writable-directory request nonetheless.
- **Cross-process lock, GOOS-split pattern:** `cli/cli@9b031151a825:internal/flock/flock_unix.go` (`syscall.Flock`, `LOCK_EX|LOCK_NB`) and `flock_windows.go` (`golang.org/x/sys/windows.LockFileEx`, `LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY`), unified behind one `TryLock`/`ErrLocked` API. Eight further exemplars implement the same GOOS-split shape independently (`etcd-io/etcd`, `kubernetes-sigs/controller-runtime`, `prometheus/prometheus`, `golangci/golangci-lint`, `containerd/containerd`, `syncthing/syncthing`), none importing `gofrs/flock` — the hand-rolled ~35-line version is, empirically, the more common choice in this corpus even though a maintained dependency exists.
- **`oras-project/oras-go` temp-file placement gap:** `content/file/file.go:713-714` — `os.CreateTemp("", "oras_file_*")` uses the OS default temp directory rather than a sibling of the working directory, contradicting `renameio`'s same-filesystem subtlety in general, though scoped in that codebase to gzip staging rather than the final blob path (`pushFile` at `file.go:499-518` writes the final blob directly to its target path with no temp-then-rename step at all, relying instead on "remove the target on verification failure" as its consistency mechanism — a different, weaker strategy than atomic rename, documented in its own comment: "Do not leave content that failed verification... at the target path").

## AI-agent angle

- **Reaching for `os.WriteFile` (or `ioutil.WriteFile`) for anything the agent should recognize as "state that must survive a crash."** `os.WriteFile` is the shortest, most idiomatic-*looking* one-liner for "write this file," and an LLM has no crash-timing intuition — it will not spontaneously reach for the four-step temp-then-rename sequence unless the prompt or surrounding code already models it. Smallest check: `rg -n -B5 'os\.WriteFile\(' . --include='*.go'` and manually classify the target (empty output on a package with no such calls is a pass; any hit needs a human/reviewer classification of "disposable output" vs. "durable state" — no analyzer makes this call automatically).
- **Writing `defer os.Remove(tmp.Name())` immediately after `CreateTemp`, before checking anything.** This is the single most natural placement for a human or an LLM to put that line — right next to the resource acquisition, mirroring the idiomatic `defer f.Close()` pattern everywhere else in Go — and it is exactly the ordering that makes the bug in [§2](#2-the-defer-osremovetmp-trap) unconditional. Smallest check: grep for `defer os.Remove(` appearing textually before a later `os.Rename(` on the same variable within one function; flag for manual confirmation that the removal is conditioned on the rename's outcome.
- **Treating `filepath.Clean` or `filepath.Join` as a security boundary.** Both are extremely common in generated code because they "look like" path safety (they normalize `..` and slashes), and neither is: `Clean`/`Join` *resolve* `..` lexically but do not *reject* a path that ends up outside the base after resolution, and neither has any symlink awareness. Smallest check: any call to `filepath.Join(trustedBase, untrustedInput)` immediately followed by an `os.*` file operation with no `filepath.IsLocal` check before it and no `os.Root` in the surrounding function is a near-certain finding; `gosec G304` (tainted file path) is the closest automatable proxy, though it flags the taint, not specifically this pattern.
- **Assuming `filepath.IsLocal` is a complete traversal guard because its doc comment sounds authoritative.** An LLM reading `pkg.go.dev/path/filepath#IsLocal` in isolation, without also reading the doc's own "purely lexical" caveat carefully, will present `IsLocal`-guarded code as fully safe against archive extraction — measured directly in this pass ([§5](#5-filepathislocal--localize-lexical-only-blind-to-symlinks)) to still allow a symlink-escape. Smallest check: any extraction/traversal-guard code path that handles `tar.TypeSymlink`/`TypeLink` entries (or any zip entry with the Unix symlink mode bit set) using `IsLocal` alone, with no `os.Root`, is a finding — reading heuristic, no analyzer.
- **Assuming `archive/tar`/`archive/zip` reject unsafe paths automatically because Go is "a memory-safe, secure-by-default language."** This is a plausible-sounding but false generalization an LLM can produce with high confidence; the actual default in Go 1.27.1 is permissive, and the opt-in is a `GODEBUG` string, not a function argument or an obvious API surface a model would naturally surface. Smallest check: `rg -n -e 'tarinsecurepath' -e 'zipinsecurepath' . --include='*.go' --include='*.mod'` — empty output on a repository that parses tar/zip from untrusted sources is the finding (the setting is not pinned anywhere).
- **Hallucinating a portable stdlib file-lock function** (something like a nonexistent `os.Lock`/`filelock.Lock`) because the request "lock this file across processes" sounds like it should have a one-call stdlib answer, the way `os.Root` now exists for path confinement. Smallest check: `rg -n 'syscall\.Flock\|windows\.LockFileEx\|gofrs/flock' . --include='*.go'` — no hits alongside a claim of cross-process locking is the finding; the correct answer is always either the two-file `GOOS`-split pattern or an explicit third-party import, never a bare stdlib call.
- **Citing gosec `G307` as "deferred method error handling" (its pre-current-catalogue meaning).** This meaning is genuinely present in older training data and even in gosec's *own* current README (see [§8](#8-permission-literals-and-umask)), so a model correcting itself only partway will get this specific ID wrong with unusual confidence. Smallest check: cite `RULES.md`, not `README.md`, and confirm with `gosec -help` or the installed version's own `-list` style output if available, rather than the ID's older reputation.

## Contested / evolving

- **Whether `os.Root`'s default behavior for symlink escapes should be treated as fully closing the problem, or as "the destination half only."** [go.dev/blog/osroot](https://go.dev/blog/osroot) is explicit that entry-name validation is still the caller's job; some practitioner writing (not independently verified in this pass beyond the blog itself) treats `os.Root` adoption as sufficient on its own. This pass's own measurement ([§4](#4-osroot-what-it-guarantees-and-what-it-explicitly-does-not), [§6](#6-archivetar-and-archivezip-insecure-by-default)) supports the blog's more conservative framing: `os.Root` stops the write, but a defense-in-depth extractor still rejects the entry name too, because *rejecting* early is cheaper and more debuggable than relying on a syscall-level denial deep in an extraction loop. As of 2026-09-26, "os.Root alone is enough" is a minority, unverified position; "os.Root plus a name check" is what the primary sources and this pass's measurement both support.
- **Whether `archive/tar`/`archive/zip` will flip `tarinsecurepath`/`zipinsecurepath` to strict-by-default.** Both doc comments say "a future version of Go may introduce this behavior by default" — unresolved as of Go 1.27.1 (August 2026). If/when this flips, the Normative rule in [§Normative guidance candidates](#normative-guidance-candidates) item 5 (pin the `GODEBUG` explicitly) becomes a no-op rather than wrong, so the rule is written to survive the flip either way — but a rule set authored today should not assume the flip has happened.
- **`renameio` vs. hand-rolled atomic write, as a recommendation strength.** This pass treats `renameio` as a SHOULD, not a MUST, because: (a) it exports nothing on Windows, so a cross-platform codebase needs its own Windows branch regardless; (b) zero exemplars in the 35-repo corpus import it, meaning the hand-rolled shape is what real Go code actually does; (c) the hand-rolled shape is short enough (roughly the 12-line block in [§1](#1-atomic-writes-the-crash-consistency-contract)) that a dependency buys little. A stricter position (MUST use `renameio` on Unix) is defensible but not what current practice in this corpus supports.
- **The precise numeric default thresholds gosec's `G301`/`G302`/`G306`/`G307` enforce out of the box.** `RULES.md`'s only published numbers (`0o600`/`0o750`) appear in a worked *custom-configuration* example, not stated as the built-in default in the fetched docs; this pass does not assert a specific built-in default threshold and instead recommends explicit configuration (pin the thresholds in `.golangci.yml`'s `gosec` settings) rather than relying on whatever the shipped default happens to be — this is a gap in the available primary documentation, not a settled fact either way.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/os#Root](https://pkg.go.dev/os#Root) | Go standard library reference | Go 1.24–1.27 (current) | Full `Root` method set and the `OpenRoot`/`OpenInRoot` constructors — primary source for the confinement API. |
| [go1.27.1:src/os/root.go](https://raw.githubusercontent.com/golang/go/master/src/os/root.go) | Go stdlib source, doc comment on `Root` | 1.27.1 | The actual documented gap list (bind mounts, `/proc`, device files, `Chmod` race, `js`/`plan9` divergence) — more complete than the rendered pkg.go.dev page returned in this pass. |
| [go.dev/blog/osroot](https://go.dev/blog/osroot) | Official Go blog post | Published with Go 1.24 (2025) | Explains *why* `os.Root` exists and explicitly scopes it to "the local-filesystem half" of zip-slip, not entry-name validation. |
| [pkg.go.dev/path/filepath#IsLocal](https://pkg.go.dev/path/filepath#IsLocal) | Go standard library reference | Go 1.20 (`IsLocal`), 1.23 (`Localize`) | Primary source for the lexical-only limitation, quoted directly in this pass. |
| `internal/filepathlite/path_windows.go` (local Go 1.27.1 GOROOT) | Go stdlib internal source | 1.27.1 | The actual Windows-reserved-name table and the fact it is Windows-build-only — not documented on pkg.go.dev at all; only found by reading the source directly. |
| [go1.27.1:src/archive/tar/reader.go](https://raw.githubusercontent.com/golang/go/master/src/archive/tar/reader.go) | Go stdlib source | 1.27.1 | `Next()`'s doc comment and the `tarinsecurepath` check — states the permissive default explicitly. |
| [go1.27.1:src/archive/zip/reader.go](https://raw.githubusercontent.com/golang/go/master/src/archive/zip/reader.go) | Go stdlib source | 1.27.1 | Same for zip; also documents the backslash-as-insecure check and that `.File` is populated regardless of the returned error. |
| [doc/godebug.md](https://raw.githubusercontent.com/golang/go/master/doc/godebug.md) | Go release/compatibility documentation | Current (tracks each release) | States the `tarinsecurepath=1`/`zipinsecurepath=1` defaults explicitly, confirming the permissive-by-default reading of the source comments. |
| [google/renameio README](https://github.com/google/renameio/blob/master/README.md) | Library README, primary source for the library's own design rationale | v2, current | The three-subtlety enumeration (state-tracked remove, same-filesystem temp, required fsync) and the explicit Windows non-support statement, both load-bearing for this dive's normative rules. |
| [golang/go#22397](https://github.com/golang/go/issues/22397#issuecomment-498856679) | GitHub issue, accepted/tracked | Long-standing, still open as of 2026-09-26 | The authoritative statement that Windows atomic replace has no equivalent guarantee to POSIX `rename(2)`. |
| [GHSA-7vpp-9cxj-q8gv / CVE-2025-3445](https://github.com/advisories/GHSA-7vpp-9cxj-q8gv) | GitHub Security Advisory | Disclosed 2025 | Current-era, real-world instance of the exact archive-extraction escape class this dive covers; the "fix was deletion, not a patch" detail is a strong argument for defense-in-depth over trusting any one library. |
| [danluu.com/file-consistency](https://danluu.com/file-consistency/) | Practitioner deep-dive, widely cited | 2015, still current in substance | The directory-fsync requirement and the cross-platform `fsync` unreliability caveats that motivate the full atomic-write MUST shape, not just temp-then-rename. |
| [securego/gosec RULES.md](https://raw.githubusercontent.com/securego/gosec/master/RULES.md) | Tool's own rule catalogue, primary source | Current (`master`) | Authoritative current meaning of `G301`/`G302`/`G303`/`G304`/`G305`/`G306`/`G307`/`G110`, including the explicit `G307` ID-reassignment note. |
| [securego/gosec README.md](https://raw.githubusercontent.com/securego/gosec/master/README.md) | Tool's own README | Current (`master`), but stale on this point | Read specifically to surface the `G307` self-contradiction against `RULES.md` — a genuine, citable inconsistency in the tool's own docs. |
| [go-audit/exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md) | This program's own measurement audit | 2026-09-26 | The corpus-wide `CreateTemp`/`Rename`/`WriteFile`/permission-literal/extraction-guard counts this dive builds on and re-measures against. |
| [go-topic-map/domain.md §8, §18, §22](../go-topic-map/domain.md) | This program's own consolidation | 2026-09-26 | `os/root.go` doc excerpt, `renameio` README excerpt, and the Rust-fleet `FileLock`/`rename_replace` cross-reference used to frame the Go-equivalent recommendations. |
| [go-topic-map/failure.md §15, §16](../go-topic-map/failure.md) | This program's own consolidation | 2026-09-26 | CVE-2025-3445 summary and the `os.Root`/Go 1.24 release-note framing, cross-checked against this dive's own primary-source reads. |
