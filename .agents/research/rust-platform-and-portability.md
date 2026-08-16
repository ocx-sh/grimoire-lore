---
title: "Platform and portability: paths, Windows/macOS divergence, clocks"
topic: rust-platform-and-portability
model: opus
consolidates:
  - .agents/research/rust-platform-and-portability/cross-platform-path-and-filename-handling.md
  - .agents/research/rust-platform-and-portability/windows-and-macos-platform-divergence.md
  - .agents/research/rust-platform-and-portability/time-clocks-and-cache-freshness.md
  - .agents/research/rust-platform-and-portability/windows-durability-and-atomic-replace.md
  - .agents/research/rust-platform-and-portability/windows-reparse-tags-and-containment.md
  - .agents/research/ocx-codebase-audit/rules-inventory.md
  - .agents/research/ocx-codebase-audit/errors-async-security.md
  - .agents/research/ocx-codebase-audit/crate-architecture.md
date: 2026-08
revised: 2026-08
---

# Platform and portability: paths, Windows/macOS divergence, clocks

## Verdict

ocx builds paths from wire data at 1,664 `std::fs`/`tokio::fs` call sites, grimoire at 906
(`crate-architecture.md:221`). Everything below is ordered by that exposure.

1. **`Path::join` is not a security boundary and never will be.** The language team closed
   `rust-lang/rust#16507` WONTFIX in 2015 and said in the thread that guarding untrusted joins
   is the caller's job. Every join of a trusted root onto an external-origin component routes
   through one greppable helper, or it is a finding.
2. **Guard strictness tracks the provenance of the path, not the codebase.** Locally-authored
   trees (publish targets, the user's own config dirs) may keep canonicalize-and-compare with a
   named CWE-367 residual-risk comment — the shape `grimoire/src/path_safety.rs:1-52` already
   ships. Registry-supplied archive entries get a directory-handle resolver. That split is
   already decided by the security wave's SEC-10; this artifact does not re-litigate it and now
   supplies the Windows half of the handle-resolver story (PLAT-38 through PLAT-42).
3. **`dunce::canonicalize` is the default for paths that get displayed, re-joined, or handed to
   a spawned process — and it is *not* the function a containment comparison uses.** ocx already
   made the dunce call (`rules-inventory.md:315-317`, 67 `dunce::canonicalize` sites) and then
   leaked ~10 bare `fs::canonicalize` sites past it. Both halves matter: dunce is a *string-level*
   rewrite applied after `std::fs::canonicalize` has already done all the resolving, so it changes
   only how a resolved path is spelled. Containment compares the un-rewritten canonical forms
   (PLAT-05); dunce is applied afterwards, for display and re-use (PLAT-06). This corrects the
   earlier framing that treated the two as one rule.
4. **Reject camino as a MUST.** The path researcher recommends adopting `camino::Utf8PathBuf`
   end-to-end. Overruled to CONSIDER: the actual bug class is lossy conversion in *record*
   call sites, which PLAT-11/PLAT-12 fix by grep at a fraction of the cost; and camino cannot
   represent a non-UTF-8 tar entry, so the one boundary that matters survives the migration
   anyway. 43 `to_str()`/`to_string_lossy()` hits in `grimoire/src` is a review surface, not a
   port mandate.
5. **Reject the `time`-crate migration.** The time researcher disqualifies `chrono` and
   standardizes on `time` 0.3. Overruled: both codebases already depend on `chrono`
   (`ocx/Cargo.toml:165`, `grimoire/Cargo.toml:45`) and chrono's one disqualifying defect —
   offset-only lossy serde — is inert once PLAT-31 mandates UTC `Z` for every persisted
   timestamp. Porting a shipped lockfile's date fields to buy a property we mandate anyway is
   pure cost. The rule that survives is the one that actually matters: **exactly one datetime
   crate in the graph**, and today that is chrono.
6. **mtime is not a freshness predicate.** Not "with caveats" — FAT buckets writes into 2-second
   granularity, extraction resets mtime, NTFS delays access-time writeback by up to an hour. We
   already compute a SHA-256 digest for every blob; that is the freshness key. mtime survives
   only as a throttle window, which is exactly how
   `ocx_lib/src/file_structure/state_store.rs:172-187` uses it.
7. **A backwards wall clock is a routine event, not a panic site.** Containers and CI runners
   boot with a wrong clock and NTP-step it minutes later. Every `SystemTime::duration_since`
   error means "cannot prove freshness" → treat as stale, log, continue.
8. **Linux CI cannot see any of the Windows/macOS failure classes.** MAX_PATH, sharing
   violations, case collisions, reserved device names, symlink privilege, Gatekeeper, HFS+ NFD
   drift — these are not under-tested on Linux CI, they are structurally invisible to it. The
   single highest-leverage investment in this whole group is a Windows and a macOS job that
   *runs* the cache-replace, extraction, and link paths against adversarial fixtures. The
   follow-up round supplies the fixture list that job needs (PLAT-26).
9. **"Atomic" is a claim that must name an API on Windows.** `ReplaceFileW` is documented by
   Microsoft as multi-step with three named partial-failure codes. `MoveFileExW`'s own page never
   uses the word "atomic" anywhere, for any flag or code path — same-volume atomicity is
   universal practice with no Microsoft sentence behind it. Conflating the two is how a
   Windows-only data-loss bug survives review by a Linux-primary reviewer.
10. **ocx is the reference implementation for most of this group and grimoire is the gap.**
    Windows retry, junction fallback, hardlink wrapper, quarantine posture, the whole
    Cross-Platform Path Handling rule section — ocx has them, grimoire has none of them
    (`rules-inventory.md:303`, `:965`). The port direction is ocx → grimoire, not fresh design.
11. **The Windows durable-write recipe is settled, and it is one step shorter than the unix one:
    flush the file's data, rename, stop.** There is no third step, because there is no Windows
    analogue to "fsync the parent directory" — `FlushFileBuffers` documents exactly two scopes,
    a file handle and (admin-only) a volume handle, and never mentions directory handles at all.
    The flush step is not optional: NTFS's `$LogFile` is a *metadata* journal, so a rename can be
    durably recorded while the renamed file's buffered bytes are lost. Three things stay
    **documented gaps**, not answers, and the design must not depend on any of them: (a) whether
    `MOVEFILE_WRITE_THROUGH` does anything for a same-volume metadata rename — Microsoft scopes
    its guarantee in writing to "a move performed as a copy and delete operation"; (b) whether a
    same-volume rename is atomic with respect to a concurrent reader — observed behaviour from
    NTFS's B-tree directory index, never a documented contract; (c) whether ReFS's same-volume
    rename is crash-consistent at all — ReFS's overview makes no journaling claim, lists
    Transactions as unavailable, and supports no hardlinks.
12. **Two Windows publish primitives are traps, and the fix for both is to not reach for them.**
    `ReplaceFileW` with a `NULL` backup path has a documented failure (`ERROR_UNABLE_TO_MOVE_
    REPLACEMENT`, 1176) that deletes the original and leaves the replacement under its temp name —
    the target path ends up with **no file**, strictly worse than doing nothing. And
    `FileRenameInfoEx`/POSIX-semantics rename carries a Windows-10-1607 floor with documented
    per-driver exceptions (FAT32). Plain `std::fs::rename` already does the right thing:
    `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` primary, `FileRenameInfoEx` only as an
    `ERROR_ACCESS_DENIED` recovery, never `MOVEFILE_WRITE_THROUGH`. Use it (PLAT-35).
13. **Windows containment is a userspace component walk, and that is the ceiling.** There is no
    `openat2`/`RESOLVE_BENEATH` analogue: `FILE_FLAG_OPEN_REPARSE_POINT` governs only the *final*
    component, and intermediate components are reparse-followed before it is reached. cap-std's
    Windows backend proves this by construction — it is the same `manually::open` component-walk
    it uses on Unix targets without `openat2`, holding a handle per ancestor and rejecting a
    mid-walk `PrefixOrRootDir` outright. So SEC-10's cap-std mandate **does** hold on Windows, but
    as "the maintained implementation of the walk", not "the same kernel guarantee as Linux".
    cap-std's own docs add one Windows-only caveat: the `Dir`'s file must be opened *without*
    `FILE_SHARE_DELETE` to close a race. Whether that walk is airtight against every reparse tag
    is not certifiable from docs or source — a documented gap, not an open question.
14. **The reparse-tag caveat this artifact previously shipped was wrong in its details, and the
    error made containment look worse in one place and better in another.** Rust's `std::fs`
    classifies by the name-surrogate bit (`tag & 0x2000_0000`), not a tag allowlist — so
    junctions, `LX_SYMLINK`, `WCI_LINK`, `WCI_TOMBSTONE`, `GLOBAL_REPARSE`, and
    `PROJFS_TOMBSTONE` all report `is_symlink() == true`, and any future Microsoft surrogate tag
    will too. The real hole is the **non**-surrogate tags — `APPEXECLINK`, plain `WCI`, the
    `CLOUD*` family, `PROJFS` — which read as ordinary files. They cannot redirect resolution, but
    they carry provider round-trips and offline/sparse semantics that make "just write through it"
    unsafe. PLAT-18 was corrected in place and PLAT-38 states the positive rule. A second
    consequence: `read_link()` decodes only `SYMLINK` and `MOUNT_POINT`, so `is_symlink()` true
    followed by an unconditional `read_link()` is a live error path on a WSL symlink (PLAT-39).

## The ruleset

Verification commands assume repo root. `MUST` = blocks merge. `SHOULD` = blocks merge absent a
written exception. `CONSIDER` = raise in review.

### Path construction and containment

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-01 | Never join an external-origin component (archive entry, manifest field, lockfile value, CLI arg used as a sub-path, env var) onto a trusted root directly. Route it through the one shared containment helper — `path_safety::contain`, `AnchoredPath::resolve`, or ocx's `utility::fs::path::escapes_root`. | `Path::join`/`PathBuf::push` return the RHS unchanged when it is absolute or carries a Windows drive prefix; [rust-lang/rust#16507](https://github.com/rust-lang/rust/issues/16507) was closed WONTFIX with the maintainers stating explicitly that guarding this is the caller's job. | `grep -rn --include='*.rs' '\.join(' src crates \| grep -v 'contain(\|AnchoredPath\|escapes_root\|// TRUSTED:'` — every surviving hit joins compile-time literals or carries the marker. | MUST |
| PLAT-02 | Reject `Component::ParentDir \| RootDir \| Prefix` before any filesystem call, and require at least one `Normal` component. | Pre-filesystem rejection needs no syscall and works on paths that do not exist yet — the extraction case, where canonicalize cannot run. This is Layer 1 of the shipped guard. | `grep -rn --include='*.rs' 'Component::ParentDir\|Component::RootDir\|Component::Prefix' src crates` — the matches should be confined to the guard module(s). | MUST |
| PLAT-03 | `debug_assert!` is never the sole guard on an external-origin path. | It is compiled out under `--release`; a check absent from the shipped binary is not a check. It also only tests `is_relative()`, which admits `..`. | `grep -rn --include='*.rs' 'debug_assert.*is_relative\|debug_assert.*is_absolute' src crates` — every hit must be paired with a real guard on the same path. | MUST |
| PLAT-04 | Deny `clippy::join_absolute_paths` in `[workspace.lints]`. | Free typo-catcher. Fires only on string *literals* starting with `/` or `\` ([lint source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/methods/join_absolute_paths.rs)), so it is a complement to PLAT-01, never a substitute. | `cargo clippy --workspace --all-targets -- -D clippy::join_absolute_paths` | SHOULD |
| PLAT-05 | Never decide containment or path identity with `==`, a string comparison, or a string-prefix check. Resolve **both** sides through the same function and then `Path::starts_with`. For a containment or identity *decision* that function is `std::fs::canonicalize` (or a handle-based resolution), never a `dunce`-rewritten path and never a raw string. | `Path`'s `PartialEq` is lexical: it does not resolve `..` or symlinks. This is CVE-2026-35363 in uutils `chmod --preserve-root` verbatim. A string prefix also passes `/base` against `/base-evil`. **Revised:** `dunce` is a string-level rewrite layered over an already-canonical path — it strips `\\?\` only when the remainder is unambiguously re-expressible and keeps the verbatim form otherwise (`\\?\UNC\…`), so root and candidate can come back spelled differently from the same resolver. Comparing raw strings additionally loses to an 8.3 short-name alias and to a trailing dot/space the Win32 layer silently strips after your check ran. | `grep -rn --include='*.rs' '== Path::new\|== path\b\|starts_with(&format!' src crates` — any path comparison not preceded by canonicalization of both sides is a finding; a `starts_with` whose operands came from `dunce::canonicalize` is also a finding. | MUST |
| PLAT-06 | Paths that will be **displayed, re-joined, written to a record, or handed to a spawned process** are canonicalized through `dunce::canonicalize`. Bare `std::fs::canonicalize`/`tokio::fs::canonicalize` for one of those uses requires an inline comment naming why a verbatim `\\?\` path is genuinely needed. Conversely, a containment comparison uses the bare canonical output (PLAT-05) and applies dunce only afterwards, if at all. | Bare canonicalize returns the `\\?\` extended-length form on Windows, which breaks `Display`, string comparison against a non-canonical path, and hand-off to a spawned process. **Revised:** the previous wording made dunce the universal default, including for containment. dunce's own docs describe it as a compatibility re-spelling of an already-resolved path — it is not a resolver and not a containment mechanism, and using it as the gate is the mistake the reparse-tag round flagged. | `grep -rn --include='*.rs' 'fs::canonicalize' src crates \| grep -v dunce` — every hit is either a containment comparison (correct, per PLAT-05) or carries the comment. | MUST |
| PLAT-07 | Build paths with `Path::join`/`PathBuf::push` only. Never `format!("{}/{}", p.display(), x)` or any string concatenation. | Forward slashes and `.`/`..` stop being resolved under a `\\?\` prefix, so a formatted path that works on Linux silently breaks the moment the base came from canonicalize on Windows. | `grep -rn --include='*.rs' 'format!("{}[/\\\\]' src crates` and `grep -rn --include='*.rs' 'display())' src crates \| grep -v 'log\|warn\|error\|info\|debug\|write!\|msg'` | MUST |
| PLAT-08 | Every check-then-act pair on the same path is a bug until proven otherwise. Replace with one handle-based operation: `OpenOptions::new().create_new(true)`, a `Dir`-relative open, or `File::metadata` on an already-open handle. | `std::fs::remove_dir_all` itself shipped a symlink TOCTOU for years ([RUSTSEC-2022-0090](https://rustsec.org/advisories/RUSTSEC-2022-0090.html), fixed in 1.58.1). Re-resolving the same path twice is the whole bug class. | `grep -rn -B2 -A3 --include='*.rs' '\.exists()\|\.is_dir()\|\.is_file()' src crates` — flag any hit whose next statement acts on the same path variable. | MUST |
| PLAT-09 | Create files and directories with their final permissions in the creation call (`OpenOptionsExt::mode`, `DirBuilderExt::mode`). Never `create` then `set_permissions(path, …)`. | Between the two calls the entry exists at the default umask and any local user can `open()` it; the later chmod does not revoke an already-open handle. | `grep -rn -B4 --include='*.rs' 'fs::set_permissions(' src crates` — no preceding `create_dir`/`File::create` on the same path in the same function. Prefer `grep -rn --include='*.rs' 'DirBuilderExt\|OpenOptionsExt'` to confirm the atomic form is in use. | MUST |
| PLAT-10 | Every `fs::`/`File::` error carries the path it was operating on. Adopt `fs_err as fs` or route all filesystem I/O through one internal wrapper — partial coverage is worse than none. | `std::io::Error` carries neither path nor backtrace; a production failure degrades to `os error 2` with no filename. Cross-listed with the error-handling wave; this entry scopes it to the filesystem surface. Note `fs-err` adds no Windows durability or rename logic of its own — it inherits `std::fs::rename` unchanged, so it composes with PLAT-34/PLAT-35 rather than substituting for them. | `grep -rn --include='*.rs' '^use std::fs' src crates` — empty if `fs-err` is adopted; otherwise every `std::fs::` outside the wrapper module is a finding. | SHOULD |

### Encoding at the path boundary

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-11 | Choose lossy vs strict vs bytes by call-site class, never globally. **Display** (log, progress, error text) → `to_string_lossy()`. **Comparison** (containment, dedup, cache key) → stay in `OsStr`/`Path`. **On-disk record** (lockfile, manifest we write) and **wire record** (registry manifest, OCI annotation) → `to_str().ok_or(…)?`, and the schema documents the field as UTF-8-only. | Lossy conversion rewrites invalid bytes to U+FFFD, which makes two different on-disk paths compare equal and silently, irreversibly corrupts a written record. This is CVE-2026-35346 in uutils `comm`. | Reading pass on every `to_string_lossy()` hit; a record-class hit is a finding. | MUST |
| PLAT-12 | Every deliberate lossy conversion carries a `// LOSSY-OK: <class>` marker. | Makes "was this intentional" answerable by grep instead of re-deriving the call-site class on every review. | `grep -rn --include='*.rs' 'to_string_lossy()' src crates \| grep -v 'LOSSY-OK'` — every remaining hit is triage. Baseline: 43 hits in `grimoire/src` (measured 2026-08). | MUST |
| PLAT-13 | Consider `camino::Utf8Path`/`Utf8PathBuf` for path types that cross a manifest, lockfile, or display boundary, keeping raw `Path`/`OsString` at the archive-entry read point with an explicit non-panicking rejection for a non-UTF-8 name. | Concentrates the fallible conversion at one checked boundary instead of scattering `to_str()`. Downgraded from the sub-artifact's MUST: PLAT-11/12 fix the real defect class far more cheaply, and camino cannot represent the one path that legitimately may not be UTF-8 (a Unix tar entry), so the boundary survives the migration regardless. | `grep -rn --include='*.rs' 'Utf8PathBuf::try_from\|Utf8Path::from_path' src crates` — a small, stable count means adoption is clean; a growing one means `Path` is leaking back into business logic. | CONSIDER |

### Windows

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-14 | Every rename, replace, or delete on a path another process might hold open retries on `ERROR_SHARING_VIOLATION` (32) **and `ERROR_ACCESS_DENIED` (5)** with jittered backoff, through one shared helper. `ERROR_ACCESS_DENIED` is not optional in that predicate: `CreateFileW`'s own docs state that opening a file pending deletion returns 5, **not** the dedicated `ERROR_DELETE_PENDING` (303). | An indexer, antivirus, or a concurrent instance transiently holds a handle without `FILE_SHARE_DELETE`; this is a live, still-open production issue on rustup's tracker ([rustup#4181](https://github.com/rust-lang/rustup/issues/4181)). A delete on Windows only takes effect when the *last* handle closes, so the pending-delete window is a normal operating condition. SQLite's Windows VFS is the best-tested public schedule: 10 attempts, linearly increasing 25 ms steps, ~1.4 s total, on a code list that starts with exactly these two. | `grep -rn --include='*.rs' 'fs::rename(\|fs::remove_file(' src crates \| grep -v rename_with_windows_retry` — every hit is a candidate. Confirm the retry predicate names both 32 and 5. | MUST |
| PLAT-15 | Cache and blob replacement writes to a temp name, **flushes the temp file's data (PLAT-34)**, and renames into place (or moves the old entry aside and deletes it later). Never overwrite in place. | An overwrite hits the open-handle sharing violation directly; rename of an open file usually succeeds where delete/overwrite does not — that asymmetry is the entire basis of the pattern ([rustup#2441](https://github.com/rust-lang/rustup/issues/2441)). **Revised:** temp-then-rename alone is not a durability story on Windows. NTFS's journal covers the rename's metadata, not the renamed file's buffered bytes, so the published path can exist after a crash holding truncated or absent content. | Read every cache-write path; `grep -rn --include='*.rs' 'persist(\|persist_temp_file\|NamedTempFile' src crates` should account for all of them, and each must sync the file before persisting. | MUST |
| PLAT-16 | Self-update never deletes or overwrites the currently-executing `.exe`. Exactly two shapes are sanctioned: **serialize** — spawn the new binary, have it block until the old process has fully exited, then replace the file; or **rename-aside** — rename the running image to a same-volume side name and spawn a `FILE_FLAG_DELETE_ON_CLOSE` + `FILE_SHARE_DELETE` helper to remove it later. `MOVEFILE_DELAY_UNTIL_REBOOT` is never the primary path. | Executing a binary takes a read lock on it; a direct overwrite fails every time. Rename-aside works for one documented reason: the loader opens the running image with `FILE_SHARE_DELETE`, and per `CreateFileW`, "delete access allows both delete and rename operations". `MOVEFILE_DELAY_UNTIL_REBOOT` requires admin/LocalSystem and its return value reflects only that a `PendingFileRenameOperations` registry entry was written, not that the move will succeed. **Revised:** the prior text attributed rename-aside to rustup's self-update. Its source says otherwise — `install_bins()` does `remove_file` then `copy`, with an in-source comment saying the unlink is mandatory, and safety comes from `wait_for_parent()` serializing on the old process's exit. Rename-aside is rustup's *uninstall* path and the `self-replace` crate's mechanism. Both shapes are valid; the citation was wrong. | Reading heuristic on the self-update path: the Windows branch must serialize on parent exit or rename-then-schedule, never `fs::write`/`fs::remove_file` on a live `current_exe()`. | MUST |
| PLAT-17 | Every archive extractor validates each entry name against the reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM0`–`COM9`, `LPT0`–`LPT9`, including the superscript variants, **and with any extension attached**), the reserved characters `< > : " / \ \| ? *` plus control bytes, and a trailing dot or space — before the join and again after normalization. The check runs on the name prefix before the first `.`, at **every** directory level, not just the extraction root. | These are live device aliases in the Win32 namespace, not merely disallowed strings; `NUL.txt` is `NUL`. A naive exact-string check misses every extension form. cap-std independently re-implements this exact blocklist before every open rather than trusting `CreateFile` — a strong signal it belongs at application level. The `:` ban also covers Alternate Data Streams, which are a *sanctioned* exception to Windows' own reserved-character rule: `readme.txt:evil:$DATA` writes a stream of an existing file and passes any "reasonable" character filter. | `grep -rn --include='*.rs' 'fn.*extract\|fn.*unpack' src crates`, then confirm one shared validator runs on every entry unconditionally. | MUST |
| PLAT-18 | Windows link placement tries hardlink (files, same volume) or junction (directories) first. A true symlink is an opportunistic upgrade behind a capability probe, never the sole implementation. Containment code that relies on `is_symlink()` must state the *correct* limitation: it catches every **name-surrogate** reparse tag, and misses the non-surrogate ones. | `CreateSymbolicLinkW` requires elevation or Developer Mode plus `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE`; neither holds on a stock user machine or a GitHub-hosted runner. Junctions need neither, which is why they are the link type CI can always exercise. **Revised:** the prior text claimed `is_symlink()` "does not cover `LX_SYMLINK`, `APPEXECLINK`, WCI". Two thirds of that is wrong. Rust classifies by `tag & 0x2000_0000`, so `MOUNT_POINT` (junction), `SYMLINK`, `LX_SYMLINK`, `WCI_LINK`, `WCI_TOMBSTONE`, `GLOBAL_REPARSE`, and `PROJFS_TOMBSTONE` all return `true`. The genuinely uncovered tags are `APPEXECLINK`, plain `WCI`, the `CLOUD*` family, and `PROJFS` — see PLAT-38. | `grep -rn --include='*.rs' 'symlink_file\|symlink_dir\|CreateSymbolicLink' src crates` — every call site has a documented fallback, not a bare `?`. Grep the codebase's own doc comments for the stale `LX_SYMLINK, APPEXECLINK, WCI` phrasing and correct it. | MUST |
| PLAT-19 | Any comment, doc string, or commit message claiming a Windows operation is "atomic" names the specific API guarantee behind the claim. | `ReplaceFileW` is documented by Microsoft as multi-step and ships three named partial-failure codes (1175/1176/1177). `MoveFileExW`'s page never uses the word "atomic" for any flag or path, and scopes `MOVEFILE_WRITE_THROUGH`'s flush guarantee in writing to "a move performed as a copy and delete operation" — the cross-volume fallback, not the same-volume metadata rename a publish actually performs. Conflating "guaranteed" with "usually true" is how a Windows-only data-loss bug passes Linux review. | `grep -rn -B2 -A2 --include='*.rs' 'atomic' src crates` inside any `cfg(windows)` block. | SHOULD |
| PLAT-20 | Never construct a path under a `\\?\` prefix by string manipulation; the prefix must be applied to an already fully-qualified, backslash-only path and every subsequent component appended with `Path::join`. | The verbatim prefix disables all string parsing: forward slashes are not converted and `.`/`..` are taken literally rather than resolved — which also means traversal validation must run *before* the prefix is applied. `GetFinalPathNameByHandleW` returns this form by default, and stripping four characters off a `\\?\UNC\server\share\…` result produces a wrong path, not a legacy one. | `grep -rn --include='*.rs' '\\\\\\\\?\\\\' src crates` — every hit builds its tail via `Path`/`PathBuf`. | MUST |
| PLAT-21 | The launcher for a downloaded/cached executable on Windows is the job-object shim, never a plain symlink and never a bare `CreateProcess`. | Neither gives the guarantee a package-manager launcher needs — that the child dies when the launcher dies. `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` is the only mechanism that provides the POSIX process-group equivalent. | `grep -rn --include='*.rs' 'CreateProcessW' crates` — must be accompanied by `CreateJobObjectW`/`AssignProcessToJobObject`. | MUST |
| PLAT-34 | On Windows, the durable-publish sequence is: write the temp file, **`File::sync_all()` (i.e. `FlushFileBuffers` on the open handle) before the rename**, then rename. Never substitute `MOVEFILE_WRITE_THROUGH` for that flush. | NTFS's `$LogFile` restores *filesystem consistency* after a crash by replaying metadata operations; it makes no claim about file data sitting in the buffered write cache. So a crash after the rename can leave the published path pointing at a file whose bytes were never written — the rename is durable, the content is not. `MOVEFILE_WRITE_THROUGH` does not close this: its documented guarantee is scoped to a move performed as a copy-and-delete, and Rust's own `std::fs::rename` never sets it. `atomicwrites` is the one crate that does set it, and its Windows path still has no data-flush equivalent to the `sync_all` its Unix path performs. | `grep -rn -B6 --include='*.rs' 'persist(\|fs::rename(' src crates` — every publish-rename must be preceded by a `sync_all`/`sync_data` on the temp file handle in the same function. A crash-injection test (write N MB unflushed, rename, hard-kill, reboot, hash) is the only real proof. | MUST |
| PLAT-35 | The Windows publish-rename is `std::fs::rename` (or an exact reimplementation of its fallback sequence). Do not reach for `ReplaceFileW`, and do not make `SetFileInformationByHandle(FileRenameInfoEx, POSIX_SEMANTICS)` the primary path. If `ReplaceFileW` is used anywhere for any reason, `lpBackupFileName` is **never** `NULL`. | `std::fs::rename` already does the correct thing: `MoveFileExW(MOVEFILE_REPLACE_EXISTING)` primary, `FileRenameInfoEx` only as an `ERROR_ACCESS_DENIED` recovery for read-only-attribute files. `ReplaceFileW` merges the replaced file's DACLs, compression, encryption, object ID, and named streams into the replacement — wrong for freshly-published install content — and with a `NULL` backup path, error 1176 is documented to leave **the target path with no file at all**, while a non-NULL backup turns that same failure into "both files retain their original names". `FileRenameInfoEx` requires Windows 10 1607+ and is documented as unsupported by some drivers (FAT32) even then, failing with `ERROR_NOT_SUPPORTED`/`ERROR_INVALID_PARAMETER` — real for binaries that run on LTSC images and removable media. | `grep -rn --include='*.rs' 'ReplaceFile\|FileRenameInfoEx\|SetFileInformationByHandle' src crates` — ideally empty. Any `ReplaceFile` hit must pass a backup path and handle 1175/1176/1177 by name. | MUST |
| PLAT-36 | Never call `FlushFileBuffers` on a `FILE_FLAG_BACKUP_SEMANTICS`-opened directory handle as a stand-in for the POSIX "fsync the parent directory" step. The Windows branch of a durable-write helper flushes the file and stops. | `FlushFileBuffers`'s documentation enumerates its scopes — a file handle, and with admin privileges a volume handle — and calls out communications-device and named-pipe handles explicitly, while never mentioning directory handles anywhere. It also requires `GENERIC_WRITE`, which does not map onto a directory. No Microsoft source states the call is supported, rejected, or a no-op there. A rule that fabricates the analogue is worse than a rule that documents the gap: the call is either an unverified no-op or a hang, and either way it reads to the next maintainer as a guarantee that was never obtained. | `grep -rn --include='*.rs' 'FlushFileBuffers\|sync_all' src crates` inside any `cfg(windows)` block — any invocation against a directory handle must cite a primary source, or be deleted. | MUST |
| PLAT-37 | Every open of a file the publish or self-update pipeline might later need to rename or delete out from under a reader specifies `FILE_SHARE_DELETE` in its share mode. Any omission is deliberate and commented. | `CreateFileW` states that "delete access allows both delete and rename operations", so a handle held without `FILE_SHARE_DELETE` blocks every other process's rename *and* delete of that path until it closes — this is the direct mechanism behind the `ERROR_SHARING_VIOLATION` PLAT-14 retries around, and holding the handle ourselves is the one instance of it we control. One documented counter-case: cap-std's `Dir::from_std_file` requires the opposite (opened *without* `FILE_SHARE_DELETE`) to close a Windows race — that is the kind of exception the comment exists for. | `grep -rn --include='*.rs' 'share_mode\|FILE_SHARE_' src crates` — every share mode omitting `FILE_SHARE_DELETE` in an install-tree or blob-store read path is a review question. | SHOULD |
| PLAT-38 | Classify Windows reparse points by the name-surrogate bit (`tag & 0x2000_0000`), never by matching a list of known tags. Separately, before writing to a destination path, check `FILE_ATTRIBUTE_REPARSE_POINT` on that path **and every ancestor** — a non-surrogate reparse point is not a redirect but is still not a plain file. | The bit test is what `std::fs` does and what `cap-std` therefore inherits, and it fails safe for every future Microsoft surrogate tag. Narrowing it to `match tag { SYMLINK \| MOUNT_POINT }` — the "helpful" refactor — silently stops catching `WCI_LINK`, `GLOBAL_REPARSE`, `PROJFS_TOMBSTONE`, and anything Microsoft adds next. The second clause covers what the bit test cannot: `APPEXECLINK`, `WCI`, `CLOUD*`, and `PROJFS` are not surrogates and read as ordinary files, yet writing through a cloud placeholder or a ProjFS virtual file triggers a provider round-trip rather than a plain write. Their payload formats are explicitly undocumented ("server-side interpretation only"), so an unrecognized reparse point is refused, never parsed. | `grep -rn --include='*.rs' 'IO_REPARSE_TAG\|reparse' src crates` — any tag allowlist is a finding; the surrogate-bit test plus an attribute check is the shape. Unit-test the classification against the full tag table. | MUST |
| PLAT-39 | Never call `read_link()` unconditionally after `is_symlink()` returns true on Windows. Handle the "Unsupported reparse point type" error as refuse-to-follow, not as an unreachable state. | `is_symlink()` is true for any name-surrogate tag, but `std::fs`'s `readlink` decodes only `IO_REPARSE_TAG_SYMLINK` and `IO_REPARSE_TAG_MOUNT_POINT` payloads; everything else falls through to an `Uncategorized` error. A WSL-created `LX_SYMLINK` visible in a Windows-accessible tree hits exactly this: reports as a symlink, refuses to say where it points. It fails safe only if the error path exists. | `grep -rn -B3 --include='*.rs' 'read_link(' src crates` — every hit preceded by an `is_symlink()` branch must match the `Err` arm, not `?`-propagate into a path that assumes a target was obtained. | MUST |
| PLAT-40 | Containment resolution for registry-supplied entries on Windows walks the path component by component against open directory handles, re-verifying at every segment. A single up-front canonicalize-then-compare is not a containment mechanism there. Use `cap-std` rather than hand-rolling the walk. | Windows has no `openat2`/`RESOLVE_BENEATH`: `FILE_FLAG_OPEN_REPARSE_POINT` governs only the final component, and every intermediate component is reparse-followed by the filesystem before it is reached. cap-std's Windows backend is the proof — it is the same `manually::open` component-walk used on Unix targets lacking `openat2`, holding a handle per ancestor so a `..` pops to a handle already held rather than re-resolving a string, and rejecting a mid-walk `PrefixOrRootDir` outright. Every CVE in the tar and zip crates (CVE-2018-20990, CVE-2021-38511, CVE-2026-33056, CVE-2025-29787) is the same shape: an entry validated once, then written through something an *earlier entry in the same archive* placed on disk. | `grep -rn --include='*.rs' 'fn.*extract\|fn.*unpack' src crates` — the extraction function must take a `cap_std::fs::Dir` and never construct an absolute `PathBuf` from an entry name. `grep -rn --include='*.rs' 'std::fs::File::\(open\|create\)' <extraction module>` should be empty. | MUST |
| PLAT-41 | An extractor rejects (or applies a written last-wins policy to) an entry whose name collides **case-insensitively** with a name already materialized in the same destination directory. Do not rely on the filesystem to report the collision. | NTFS and APFS are case-insensitive-but-preserving by default; the second write silently overwrites the first with no OS-level error, and for a package manager that means one cache entry's content sitting under another entry's name. ext4 CI reproduces none of it. This is the extraction-time twin of PLAT-23's identity-key rule — PLAT-23 governs our own maps, this governs what we write to disk. | Fixture archive containing `Foo.txt` and `foo.txt`; assert a defined, tested outcome rather than incidental filesystem behaviour. | MUST |
| PLAT-42 | For an archive `hardlink` or `symlink` entry, apply the full containment and reparse check to the link's **source** path, not only to the new name being created. A source path that "already passed containment when it was created" is not evidence it still does. | `CreateHardLinkW` documents that hardlinking a path which is itself a symlink creates a hardlink *to the symlink* — a second reparse-carrying name that an is-the-new-name-a-symlink check at creation time never sees. Generalized, this is CVE-2018-20990 in the tar crate: entry N plants a link, entry N+1 writes through it. Within a single extraction, the check-time path and the write-time path are not the same path. | Fixture: entry N creates a link at `root/link` pointing outside `root`; entry N+1 names `root/link` as a hardlink source. Assert refusal. | MUST |
| PLAT-43 | Windows hardlink placement handles the documented limits as ordinary outcomes, not errors to propagate: NTFS only (not ReFS, not FAT), files only (never directories), same volume only, and a hard cap of **1023 links per file**. Past any of those, fall back to a copy. | A content-addressed blob store that hardlinks one popular store blob into many install trees will hit 1023 in normal use, not as an attack — and the failure surfaces as an opaque link error at install time on one user's machine. ReFS support is a documented `No` in Microsoft's own table, so a user whose cache lives on a ReFS volume gets zero hardlinks, not degraded ones. | `grep -rn --include='*.rs' 'hard_link\|CreateHardLink' src crates` — every call site has a copy fallback and does not treat link failure as fatal. | MUST |

### macOS

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-22 | The `com.apple.quarantine` posture is one explicit, documented decision in one module — apply it, or strip it, or never touch it — and the choice is stated in the security docs. | A Rust HTTP client writing bytes with `fs::write` never sets the xattr, so silence produces "never quarantines" that looks identical to "we decided not to". Homebrew Cask deliberately re-applies it; ocx deliberately strips it and ad-hoc-signs instead. Both are defensible; an accident is not. | `grep -rn --include='*.rs' 'quarantine\|xattr' src crates` — **zero hits is itself the finding to raise**, not evidence the topic was settled. | MUST |
| PLAT-23 | Any key that identifies a package, component, or cache entry and originates from a filesystem path or user-typed name is case-folded and NFC-normalized at construction, not compared ad hoc. | NTFS and APFS are both case-insensitive-but-preserving by default, so `Foo` and `foo` are two map keys but one file — the second write silently clobbers the first. Legacy HFS+ additionally normalizes to NFD on write, so byte-equality against a stored name breaks on an external or Time Machine volume. ext4 CI reproduces neither. | Reading pass on every `HashMap<String, _>`/`BTreeMap<String, _>` whose key models a package or path identity; confirm normalization happens in the constructor. | MUST |
| PLAT-24 | Cache and config directories come from one platform-conventions module (`directories` or `etcetera`, chosen once), never a per-call-site `cfg(target_os)` branch or raw `HOME`/`APPDATA` lookup. | SIP-exempt vs SIP-adjacent, and XDG vs native, are project-wide policy choices. `/usr/local` is carved out of SIP; `~/Library/Caches` and `~/.cache` are both legitimate — picking one by accident per call site is not. | `grep -rn --include='*.rs' 'HOME\|USERPROFILE\|Library/Caches\|APPDATA' src crates \| grep -v 'directories::\|etcetera::'` — any hit outside the conventions module. | SHOULD |

### Platform boundary and CI

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-25 | New platform divergence in *file identity and lifecycle* operations — replace, link, lock-error classification, executable resolution — goes behind a named platform module exposing outcome-shaped functions (`replace_file`, `link_blob`, `is_locked_err`). Call sites branch on the returned outcome, not on `cfg(windows)`. | The reasoning at the call site (retry? fall back to hardlink? surface to the user?) is identical across platforms even though the syscalls are not; scattered `cfg` blocks duplicate that reasoning and drift. Scoped to *new* code deliberately: ocx has 287 `cfg` platform sites and grimoire 56, so this is a direction of travel, not a gate that can pass today. | `grep -rn --include='*.rs' '#\[cfg(windows)\]\|#\[cfg(target_os' src crates` on the diff only; a new hit outside the platform module in a file-lifecycle path is a review question. | SHOULD |
| PLAT-26 | CI **runs** — not merely compiles — the cache-replace, archive-extraction, link-placement, and self-update paths on Windows and macOS runners. The Windows fixture set is: a case-variant filename pair, a reserved-device-name entry (with an extension), an entry name containing a colon, a locked-file contention scenario, **a junction swapped under an already-validated ancestor mid-extraction, and a hardlink fan-out past 1023 links**. Symlink-creation fixtures sit behind a startup capability probe that reports *skipped-with-reason*, never a bare `#[ignore]`. | MAX_PATH, sharing violations, case collisions, reserved names, symlink privilege, Gatekeeper, and HFS+/APFS normalization drift are structurally invisible to Linux CI. The junction fixture is the load-bearing addition: junctions need neither elevation nor Developer Mode, so the one reparse type an unprivileged runner *can* create is also the one that exercises the containment walk — "we can't test reparse points without admin" is false and is how this coverage gets skipped. Real NTFS symlinks genuinely do need `SeCreateSymbolicLinkPrivilege` or Developer Mode, which is a coverage boundary to declare, not to swallow. | Read the CI matrix: a `windows-latest`/`macos-latest` job that only runs `cargo check` or `cargo build` does not satisfy this. Confirm the probe exists and its skip is visible in the log. | MUST |

### Time, clocks, and cache freshness

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PLAT-27 | `Instant` for every elapsed-time, TTL, timeout, backoff, and rate-limit decision. `SystemTime` only for values that get persisted or crossed a process boundary. | `SystemTime` is not monotonic — the stdlib docs state two sequential writes can read back out of order. `Instant` cannot produce a negative duration through normal use. | `grep -rn -A3 --include='*.rs' 'SystemTime::now()' src crates` — none of the surrounding code may compute an elapsed duration for a TTL/timeout decision. | MUST |
| PLAT-28 | Never `.unwrap()`/`.expect()` a `SystemTime::duration_since` or `SystemTime::elapsed`. Match the `Err(SystemTimeError)` and treat it as "cannot prove freshness" → stale, logged, non-fatal. | A backwards clock step is routine: NTP correction, `timedatectl`, VM live migration, a container booting with a wrong clock that self-corrects seconds later. A `SystemTimeError` on the first cache check after process start is realistic. | `grep -rn --include='*.rs' 'duration_since(.*)\.\(unwrap\|expect\)\|elapsed()\.\(unwrap\|expect\)' src crates` — every non-test hit is a panic-on-clock-step bug. | MUST |
| PLAT-29 | Filesystem mtime is never the sole gate for "is this artifact stale". Use the content digest we already compute, a monotonic generation counter in the cache index, or an explicit cache-entry metadata record written atomically alongside the artifact. mtime is permitted only as a cheap short-circuit paired with a stronger check, or as a throttle window where being wrong costs one redundant operation. | FAT buckets write-time into 2-second granularity and access-time into a day; NTFS delays access-time writeback up to an hour; extraction and copy routinely reset mtime to *now*, the exact inverse of "content unchanged since X". | `grep -rn -B3 -A3 --include='*.rs' '\.modified()' src crates` — every production hit is paired with a digest/counter check or is an explicit throttle. | MUST |
| PLAT-30 | Exactly one datetime crate in the dependency graph. Today that is `chrono`, already deployed in both codebases. Adding `time` or `jiff` alongside it is a `cargo deny` bans finding, not a style nit. | Two crates modeling "instant in time" emit two different serde representations of the same logical lockfile field; a binary linking one and reading a file written by the other either fails to parse or silently misinterprets. This overrules the sub-artifact's `time`-0.3 recommendation: chrono's only disqualifying defect is offset-only lossy serde, which PLAT-31 renders inert, and porting a shipped on-disk format to buy a property we already mandate is pure cost. | `cargo tree -e normal \| grep -iE '(^\|[^-])(chrono\|jiff\|time) v'` — exactly one family. | MUST |
| PLAT-31 | Every persisted timestamp is RFC 3339 with an explicit `Z` UTC offset. Never a local offset, never a naive/unzoned string, never a bare epoch integer in a file a human will `cat` or a tool will diff. | Self-describing, diffable, unambiguous about both zone and precision — and it is precisely what makes chrono's offset-only serde a non-issue. An epoch integer is opaque to anyone debugging a stale-cache report and silently discards sub-second precision. | Grep the golden fixtures for the literal `Z` suffix on every timestamp field; a bare `+05:00` or an unsuffixed value is a bug. Confirm each field pins its format via `#[serde(with = …)]` rather than relying on the derive default. | MUST |
| PLAT-32 | Registry-supplied time values are untrusted readings of a remote clock, never a synchronization source. Never diff `Date`/`Last-Modified` against a local `SystemTime::now()`. Measure `Cache-Control: max-age` and `Retry-After` against a locally-recorded `Instant` taken when the response arrived; prefer `ETag` + `If-None-Match` over `Last-Modified` whenever the registry sends both. | [RFC 9111 §4.2](https://www.rfc-editor.org/rfc/rfc9111.html) is normative that clock skew between client and server must not corrupt age or freshness math. `Retry-After`'s delay-seconds form is clock-independent and authoritative when present. | `grep -rn -A5 --include='*.rs' 'Last-Modified\|max-age\|Retry-After' src crates` — the value may feed only relative or validator logic. | MUST |
| PLAT-33 | In backoff, rate-limit, and deadline code, use `Instant::checked_duration_since` rather than bare subtraction, or document why saturating to zero is acceptable there. | `Instant` arithmetic saturates to `Duration::ZERO` on a monotonicity violation rather than panicking — safe by default, but it silently turns a rate limiter or a backoff calculation into a no-op. | Reading heuristic on any backoff/rate-limit path; `grep -rn --include='*.rs' 'checked_duration_since' src crates` should be non-empty there. | CONSIDER |

## Applied to OCX

### Already satisfied

- **PLAT-01, PLAT-02, PLAT-05 (grimoire).** `grimoire/src/path_safety.rs:1-52` is the reference
  two-layer guard: Layer 1 rejects `ParentDir`/`RootDir`/`Prefix` pre-filesystem, Layer 2
  canonicalizes both sides and `starts_with`-checks when the candidate exists, with a named
  CWE-367 residual-risk doc comment stating what is accepted and why
  (`errors-async-security.md:65`). `install/path_anchor.rs::AnchoredPath::resolve` is the
  stricter install-side sibling — it additionally rejects `CurDir`, because grim's own writer
  never emits one so a surviving `.` is a tamper signal. The divergence is documented as
  deliberate; do not unify it. ocx's equivalents are
  `utility::fs::path::{lexical_normalize, escapes_root, validate_symlinks_in_dir}`
  (`rules-inventory.md:907-908`). *Caveat added by the follow-up:* Layer 2 canonicalizes through
  `dunce::canonicalize` and compares the rewritten forms, which PLAT-05 now says not to do.
  See Violated.
- **PLAT-06 (ocx, mostly).** ocx's `quality-rust.md` carries a ~35-line Cross-Platform Path
  Handling section mandating `dunce::canonicalize` over bare `std::fs::canonicalize`, canonicalize-
  both-sides before any equality assertion, and never asserting a POSIX-absolute literal against
  a resolved path (`rules-inventory.md:303-325`). 67 `dunce::canonicalize` call sites across the
  two repos confirm it is practice, not aspiration. The display/join half of PLAT-06 is satisfied;
  the containment half now belongs to PLAT-05.
- **PLAT-14, PLAT-15 (retry half).** `ocx_lib/src/utility/fs.rs:60-75` routes atomic publish through
  `rename_with_windows_retry`, with `persist_temp_file` alongside
  (`rules-inventory.md:909-910`). `ocx_lib/src/file_structure/blob_store.rs:104` documents the
  `ERROR_SHARING_VIOLATION` (32) / `ERROR_ACCESS_DENIED` (5) retry contract — both codes, which is
  the correct predicate — and `blob_store.rs:596` has a regression test that deliberately provokes
  it. Call sites at `package_manager/tasks/layer_staging.rs:49` and `tasks/prepare_lazy.rs:447`
  use it. Broader atomic-write discipline: `tempfile`/`NamedTempFile` in 90 ocx_lib / 70 grimoire
  files, `persist`/`rename` at 31/19 sites (`errors-async-security.md:63`).
- **PLAT-17.** `ocx_lib/src/archive/error.rs:26-29` names path-traversal-via-tar-entry and
  symlink-escape as *distinct* typed error variants rather than a generic "extraction failed"
  (`errors-async-security.md:67, :81`); grimoire's `install/materializer.rs::safe_relative_path`
  is the equivalent zip-slip guard (`rules-inventory.md:806-807`).
- **PLAT-18 (link strategy half).** `ocx_lib/src/symlink.rs:11` documents NTFS junction points
  as a transparent Windows fallback and `symlink.rs:58` reports junctions from `is_link`;
  `ocx_lib/src/hardlink.rs:77-84` is the single sanctioned `std::fs::hard_link` wrapper.
  `ocx_lib/src/script/guard.rs:133-134` explicitly reasons about junction-based containment
  escape. Test-side, `assert_symlink_exists()` is mandated over `path.is_symlink()` precisely
  for Windows junctions (`skills-agents-inventory.md:124-125`).
- **PLAT-21.** `ocx_shim` is a dedicated 2,870-LOC workspace member whose sole job is the
  Windows launcher (`crate-architecture.md:53`), with ~25 `unsafe` WinAPI sites for job-object
  and process creation — inherent to the design, not a smell (`errors-async-security.md:73`).
  It carries its own ADR-justified exit-code taxonomy (`exit-codes-and-cli.md:57`). It is also the
  first place to look before writing any new self-update logic (PLAT-16) — it already owns the
  running-executable problem.
- **PLAT-22 (ocx).** `ocx_lib/src/codesign.rs:49` strips `com.apple.quarantine` recursively via
  `/usr/bin/xattr -dr` (`codesign.rs:188-190`) and then ad-hoc code-signs the Mach-O content —
  the deliberate opposite of Homebrew Cask's re-apply posture, with `OCX_NO_CODESIGN` as the
  documented escape hatch. The decision is made and localized in one module. It is also already
  in the security checklist (`rules-inventory.md:798`).
- **PLAT-29 (the compliant exception).**
  `ocx_lib/src/file_structure/state_store.rs:172-187` (`is_throttled`) uses `metadata.modified()`
  as the sole input — legitimately, because it gates an update-check *throttle window*, not
  artifact validity, and it handles the future-mtime case by returning "throttled" rather than
  panicking. This is exactly the carve-out PLAT-29 permits; cite it as the model.

### Violated

- **PLAT-05 in grimoire — MED, newly identified.** `path_safety.rs`'s Layer 2 canonicalizes both
  sides with `dunce::canonicalize` and then `starts_with`-compares the rewritten strings. dunce's
  rewrite is conditional — it keeps the verbatim form for `\\?\UNC\…` and anything else it cannot
  unambiguously simplify — so root and candidate are not guaranteed to come out in the same
  spelling. Do the comparison on the `std::fs::canonicalize` output and apply dunce afterwards for
  the returned, caller-facing path. Same fix for `AnchoredPath::resolve`.
- **PLAT-06 in ocx — MED, rescoped.** ~10 bare `fs::canonicalize` sites survive the dunce rule.
  `ocx_lib/src/oci/index/file_transport.rs:254-255` is no longer the worst of them: it
  canonicalizes both the resolved path and the root with bare `tokio::fs::canonicalize` for a
  `starts_with` comparison, which under the revised PLAT-05 is the *correct* form for the
  comparison. The residual defect there is narrower — the verbatim `\\?\` result is handed onward
  without a dunce rewrite. The rest still need a dunce swap or the PLAT-06 comment:
  `ocx_cli/src/command/launcher/exec.rs:290,303,310`,
  `ocx_lib/src/script/ocx_module.rs:373,388`,
  `ocx_lib/src/oci/host_capabilities.rs:576,1266`,
  `ocx_lib/src/project/registry.rs:196`.
- **PLAT-06, PLAT-14, PLAT-18, PLAT-22 in grimoire — HIGH, all one root cause.** grimoire's
  `quality-rust.md` is an earlier snapshot of ocx's and is missing the entire ~35-line
  Cross-Platform Path Handling section (`rules-inventory.md:303, :965`). Correspondingly
  grimoire has the `dunce` dependency (`grimoire/Cargo.toml:61`) and uses it in `path_safety.rs`
  but has **no** Windows retry helper, **no** junction/hardlink fallback module, and **no**
  quarantine handling at all. ocx is the reference implementation for all four; this is a port,
  not a design task.
- **PLAT-18 doc text — LOW but load-bearing, both repos.** `path_anchor.rs`'s
  `Containment::AllowRelocatedAncestor` doc comment states that `is_symlink()` "does not cover
  every reparse tag (`LX_SYMLINK`, `APPEXECLINK`, WCI)". Two of those three are wrong:
  `LX_SYMLINK` and `WCI_LINK` are name-surrogates and *are* caught. Leaving the wrong list in a
  doc comment is how the next maintainer narrows the check to a tag allowlist and breaks
  PLAT-38. Correct it to name the non-surrogate tags.
- **PLAT-25 — direction, not a gate.** 287 `cfg(windows)`/`cfg(target_os)` sites in ocx and 56
  in grimoire, against a partial platform surface (`symlink.rs`, `hardlink.rs`, `codesign.rs`,
  `utility/fs.rs`). The abstraction exists; it is not the only door. Scoped to new code, as
  written.
- **PLAT-12 — unmeasured, both repos.** 43 `to_str()`/`to_string_lossy()` hits in `grimoire/src`
  and none of them carries a `LOSSY-OK` marker, so no reviewer can tell a display conversion
  from a record conversion without re-deriving the class each time.

### New commitments

- **PLAT-34 — HIGH, both repos.** No evidence that any publish path flushes the temp file's data
  before renaming it into place on Windows. `persist_temp_file` and `NamedTempFile::persist` do
  not do it for you — `tempfile`'s Windows `persist()` clears `FILE_ATTRIBUTE_TEMPORARY` and calls
  `MoveFileExW`, with no flush and no `MOVEFILE_WRITE_THROUGH`. This is the one item in the
  follow-up round that is a live crash-durability hole rather than a hardening improvement.
- **PLAT-36.** Nothing in either repo currently fabricates a directory fsync on Windows. The rule
  exists to keep it that way when the unix durable-write rules get ported — "fsync the parent dir
  after rename" is exactly the line an agent will translate mechanically.
- **PLAT-37, PLAT-43.** No `FILE_SHARE_DELETE` audit and no 1023-link handling in ocx's
  `hardlink.rs`. The link cap is not hypothetical for a store that hardlinks shared blobs into
  many install trees.
- **PLAT-38, PLAT-39, PLAT-40, PLAT-41, PLAT-42.** The Windows containment story. Every
  path-escape test in both repos is `#[cfg(unix)]` (`rules-inventory.md:805-806`), so none of
  these has ever been exercised. PLAT-40 is the structural one — it decides whether the extraction
  path routes through `cap-std` on Windows or hand-rolls a walk.
- **PLAT-26.** No evidence of a Windows or macOS CI job that *executes* the cache-replace,
  extraction, or link paths. `linux_self_contained.rs` and `macos_self_contained.rs` exist as
  integration tests (`crate-architecture.md:275`) but there is no equivalent Windows file and no
  adversarial fixture set. This remains the single highest-value item in this group, and the
  follow-up round has now specified exactly which fixtures it needs.
- **PLAT-10.** Neither repo uses `fs-err` nor routes all filesystem I/O through one wrapper;
  ocx's `utility::fs` covers the atomic-publish and locking primitives but not the general
  `std::fs::read`/`write` surface — `ocx_lib/src/package/description.rs:51` is a named example of
  a direct `std::fs::read` with no seam (`crate-architecture.md:225`).
- **PLAT-23.** No evidence of case-folding or NFC normalization at the construction of any
  package-identity key in either repo. Nothing on ext4 CI will ever surface it.
- **PLAT-31 verification.** Both repos use chrono, but there is no golden-fixture check that
  every persisted timestamp carries an explicit `Z`. `grimoire/src/catalog/registry_catalog.rs:921`
  does freshness math via `signed_duration_since(t.with_timezone(&chrono::Utc))`, which is
  correct in shape but unpinned by a format test.
- **PLAT-13.** camino is in neither dependency graph and is deliberately not being adopted now.
  Recorded so the decision is visible rather than re-opened per PR.

## AI-agent failure modes

Ranked by how often it bites, worst first.

1. **Writes `dest.join(entry_name)` for an untrusted name.** The intuitive, cross-language
   "join just concatenates" model, reinforced by far more Python `os.path.join`-adjacent
   training data than rust-lang WONTFIX threads. Highest-value mechanical check in the group:
   PLAT-01's grep, run on every diff touching extraction, install, or cache-write code.
2. **Ports "fsync the parent directory" to Windows as `FlushFileBuffers` on a directory handle.**
   The unix rule is written down, the translation is one obvious step, and the resulting call
   compiles, returns, and is never questioned again — while being either an unverified no-op or a
   hang. The correct Windows branch is *shorter* than the unix one, which is the shape a model
   pattern-matching across platforms will not produce on its own. PLAT-36.
3. **"Makes it atomic on Windows too" by swapping the API name.** `s/rename/MoveFileExW/` and
   declare parity. This silently drops the data-durability half: the Windows path needs an
   *added* flush step that has no unix line to copy from, because unix's `fsync(file)` is already
   there and the model treats the rename as the whole mechanism. PLAT-34.
4. **Reaches for `to_string_lossy()` as the friction-free way to make a `Path` a `String`.**
   It is the option with no `Result` to handle, so it is what a model under token pressure
   emits — without noticing the surrounding function serializes the result to disk. Check the
   containing function for `serde::Serialize`, `fs::write`, or a network client on the same
   value; PLAT-12's marker exists to make this one grep.
5. **Builds paths with `format!("{}/{}", dir.display(), name)`.** Invisible on Linux, breaks the
   instant `dir` came from `canonicalize` on Windows. PLAT-07's grep.
6. **"Fixes" a TOCTOU report by adding a check immediately before the act.** The symptom ("path
   might not exist") is directly answered by `if path.exists()`, and there is no local test that
   fails to prove the fix is wrong. Treat any diff that answers a race report with an
   `.exists()`/`.is_dir()` call rather than `create_new(true)` or a handle-based operation as
   unverified — make the model name the handle-based alternative it rejected.
7. **Narrows a reparse check to `match tag { SYMLINK | MOUNT_POINT => … }`.** It reads as a
   tightening and as more explicit code, and it silently stops catching `WCI_LINK`,
   `GLOBAL_REPARSE`, `PROJFS_TOMBSTONE`, and every future Microsoft surrogate tag that the
   bit test caught for free. PLAT-38. State the bit-test dependency in the code comment so the
   next maintainer does not "helpfully" enumerate it.
8. **Treats a Windows rename/delete failure the way a unix one deserves — log and abort.** On
   unix a `rename()` failure is rare and usually fatal; on Windows `ERROR_SHARING_VIOLATION`/
   `ERROR_ACCESS_DENIED` from a Defender scan or an indexer is routine and transient. The
   resulting flake gets misdiagnosed as "a race condition in our code". PLAT-14.
9. **`.duration_since(x).unwrap()`.** The type signature nags for a `Result` and `.unwrap()` is
   the shortest way past it; the model never reasons about *why* it is fallible. PLAT-28's grep.
10. **`SystemTime::now()` to measure how long something took.** Superficially works in the common
    case and passes a manual test, then panics or mis-decides on the first NTP step. PLAT-27.
11. **Treats `metadata().modified()` as "content changed"** — imported wholesale from Makefile
    and shell `if newer` idioms. PLAT-29.
12. **Adds `chrono`/`time`/`jiff` because the example it pattern-matched used one**, without
    checking the workspace. The single most common route to two datetime crates in one Cargo.lock.
    PLAT-30's `cargo tree`.
13. **Leaves bare `std::fs::canonicalize` when asked to "make this cross-platform".** The word
    "normalize" pulls it toward canonicalize, and no Linux reviewer or Linux CI runner can see the
    resulting `\\?\` regression. PLAT-06.
14. **Writes a Windows symlink call with no fallback beyond `?`**, because the Unix mental model
    is that unprivileged symlink creation always works. PLAT-18.
15. **Concludes "reparse-point containment can't be tested without admin" and skips the test.**
    True for real NTFS symlinks, false for junctions, which need no privilege at all and exercise
    the same walk. PLAT-26.
16. **Never considers `com.apple.quarantine`.** Its absence produces no compiler warning, no
    failing test, and no signal of any kind — the code just silently behaves as "never
    quarantines", which is indistinguishable from a deliberate decision. Only a checklist line
    catches this; PLAT-22 makes zero hits the finding.
17. **Writes "atomic" in a Windows doc comment.** The word reads as correct English regardless of
    whether `ReplaceFileW`'s documented partial-failure taxonomy or same-volume rename folklore
    is behind it. PLAT-19.

## Open questions

- **Long-path strategy is undecided.** Always prepend `\\?\` internally (works on every Windows
  version, but imposes the stricter no-forward-slash/no-`..` parsing everywhere) versus ship a
  `longPathAware` manifest and hope the machine-wide registry key is set. ripgrep never resolved
  it and documents it as a permanent limitation. This is a product decision, not a research gap.
- **Should grimoire adopt ocx's quarantine posture (strip + ad-hoc sign) or the Homebrew posture
  (apply)?** ocx's choice is coherent for a toolchain manager that must run the binary
  immediately. grim installs config files, not executables — the answer may legitimately be
  "neither, and say so".
- **HFS+ defence or documented non-support?** The NFD-drift failure is real but only reachable on
  an external or Time Machine volume. PLAT-23's normalize-your-own-keys rule covers it cheaply;
  whether anything further is warranted is a product call.
- **PLAT-10 ownership.** Path-context-on-`io::Error` sits between this group and the
  error-handling wave. It is stated here because the filesystem surface is where it bites;
  confirm it is not double-stated when the two rulesets are merged into shipped rules.
- **`jiff` at 1.0.** PLAT-30 pins chrono on cost grounds, not merit. If jiff ships 1.0 and a
  lockfile schema bump is happening for another reason, re-evaluate — but as one deliberate,
  reviewed migration, never an incremental swap.

## Revision log

2026-08 — folded in `windows-durability-and-atomic-replace.md` and
`windows-reparse-tags-and-containment.md`, the two rounds this artifact commissioned. All
pre-existing IDs keep their numbers and meaning.

- **New: PLAT-34** — flush the temp file's data before the Windows publish rename; never
  substitute `MOVEFILE_WRITE_THROUGH`. NTFS's journal is a metadata journal, so the rename can
  outlive the bytes.
- **New: PLAT-35** — the Windows publish-rename is `std::fs::rename`; `ReplaceFileW` is not the
  default and never takes a `NULL` backup path (error 1176 can empty the target).
- **New: PLAT-36** — never fake a parent-directory fsync on Windows; `FlushFileBuffers`
  documents only file and volume scopes.
- **New: PLAT-37** — `FILE_SHARE_DELETE` on opens in the publish/self-update paths.
- **New: PLAT-38** — classify reparse points by the name-surrogate bit, and separately detect
  `FILE_ATTRIBUTE_REPARSE_POINT` on the destination and every ancestor before writing.
- **New: PLAT-39** — handle `read_link()`'s "Unsupported reparse point type" as refuse-to-follow;
  `is_symlink()` true does not imply the target is readable.
- **New: PLAT-40** — Windows containment is a component-by-component walk against open handles
  (use cap-std); there is no `openat2`/`RESOLVE_BENEATH` analogue.
- **New: PLAT-41** — extractors reject case-insensitive collisions against already-materialized
  names rather than relying on the filesystem to report them.
- **New: PLAT-42** — apply containment and reparse checks to a link entry's *source* path, not
  only the new name.
- **New: PLAT-43** — handle the Windows hardlink limits (NTFS only, files only, same volume,
  1023 per file) as outcomes with a copy fallback.
- **Changed: PLAT-05** — a containment or identity decision now compares `std::fs::canonicalize`
  output, explicitly *not* `dunce`-rewritten paths. dunce's rewrite is conditional, so two sides
  from the same resolver can be spelled differently; raw-string comparison also loses to 8.3
  short names and Win32 trailing-dot/space stripping. This is a containment-guarantee fix.
- **Changed: PLAT-06** — scoped to display, re-join, record, and process hand-off. The rule
  previously read as "dunce everywhere including containment", which overstated what dunce
  provides: it is a compatibility re-spelling of an already-resolved path, not a resolver.
- **Changed: PLAT-14** — the retry predicate must name `ERROR_ACCESS_DENIED` (5) explicitly,
  because `CreateFileW` documents 5, not `ERROR_DELETE_PENDING` (303), for a delete-pending open.
  Added SQLite's tested schedule as the reference budget.
- **Changed: PLAT-15** — temp-then-rename is no longer stated as sufficient; it now requires the
  PLAT-34 flush. The prior wording implied a durability guarantee on Windows that the rename
  alone does not provide.
- **Changed: PLAT-16** — corrected the citation and widened the rule to two sanctioned shapes
  (serialize-on-parent-exit, or rename-aside). rustup's self-*replace* is delete-then-copy gated
  on `wait_for_parent()`, not the rename-aside the prior text attributed to it; rename-aside is
  its uninstall path and the `self-replace` crate's mechanism. Added the
  `MOVEFILE_DELAY_UNTIL_REBOOT` exclusion.
- **Changed: PLAT-18** — the reparse-tag caveat was factually wrong. `LX_SYMLINK` and `WCI_LINK`
  are name-surrogates and *are* caught by `is_symlink()`; the uncovered tags are `APPEXECLINK`,
  plain `WCI`, `CLOUD*`, and `PROJFS`. A containment rule that names the wrong gap is worse than
  none, because it invites a "fix" in the wrong place.
- **Changed: PLAT-19** — added that `MoveFileExW`'s page never uses the word "atomic" at all, and
  that `MOVEFILE_WRITE_THROUGH`'s guarantee is scoped in writing to copy-and-delete moves.
- **Changed: PLAT-26** — fixture list extended with the mid-extraction junction swap and the
  1023-hardlink fan-out, plus a capability probe for symlink creation that reports
  skipped-with-reason. Junctions need no privilege, so the "can't test this without admin"
  excuse is closed.
- **Changed: PLAT-17** — added the per-directory-level scope, `COM0`/`LPT0`, and the ADS colon
  rationale (a sanctioned exception to Windows' own reserved-character rule).
- **Changed: PLAT-10** — noted that `fs-err` adds no Windows rename or durability logic, so it
  composes with PLAT-34/35 rather than covering them.
- **Verdict** — items 3 and 9 amended; items 11–14 added (the Windows durable-write recipe and
  its three documented gaps; the two publish-primitive traps; Windows containment as a userspace
  walk; the corrected reparse-tag picture).
- **Open questions** — removed the three the follow-up answered: the Windows atomic-replace and
  durability round, the Windows reparse-tag containment round, and the cap-std Windows guarantee
  question. What they established as *gaps* rather than answers now lives in Verdict 11 and 13:
  `MOVEFILE_WRITE_THROUGH` on a same-volume rename, same-volume rename atomicity vs a concurrent
  reader, ReFS crash-consistency, the absence of any directory-fsync analogue, the
  non-certifiability of cap-std's Windows walk against every tag, undocumented reparse payload
  formats, and the unknowability of 8.3 short-name presence.

## Sub-artifacts

- [rust-platform-and-portability/cross-platform-path-and-filename-handling.md](rust-platform-and-portability/cross-platform-path-and-filename-handling.md)
  — `Path::join`'s absolute-RHS WONTFIX, the four-way `OsStr`→`String` call-site table, canonicalize
  vs `starts_with` vs `==`, camino's cost, `cap-std::Dir`'s actual boundary, TOCTOU shapes, and a
  read of grimoire's own `path_safety.rs`/`path_anchor.rs` as the reference containment design.
- [rust-platform-and-portability/windows-and-macos-platform-divergence.md](rust-platform-and-portability/windows-and-macos-platform-divergence.md)
  — MAX_PATH and the long-path opt-in, sharing violations and rustup's self-update mechanism,
  case-insensitivity, reserved device names, what `ReplaceFileW` actually guarantees, symlink
  privilege and its junction/hardlink fallbacks, the job-object shim rationale, APFS/HFS+
  normalization, Gatekeeper and quarantine, SIP-exempt cache locations.
- [rust-platform-and-portability/time-clocks-and-cache-freshness.md](rust-platform-and-portability/time-clocks-and-cache-freshness.md)
  — `Instant` vs `SystemTime` guarantees, per-OS precision floors, filesystem mtime granularity as
  a non-input to freshness, clock-skew handling, the jiff/time/chrono comparison, RFC 3339
  serialization, and RFC 9111 treatment of registry time headers.
- [rust-platform-and-portability/windows-durability-and-atomic-replace.md](rust-platform-and-portability/windows-durability-and-atomic-replace.md)
  *(follow-up, commissioned by this artifact)* — what `MoveFileExW`, `MOVEFILE_WRITE_THROUGH`,
  `ReplaceFileW`, `FileRenameInfoEx`/POSIX-semantics rename, and `FlushFileBuffers` do and do not
  document; NTFS's metadata-only journal vs ReFS's silence; the delete-pending error-code trap;
  the running-executable rename-aside mechanism read from rustup and `self-replace` source; and
  what `tempfile`, `atomicwrites`, `atomic-write-file`, `fs-err`, and `std::fs::rename` actually
  implement on Windows.
- [rust-platform-and-portability/windows-reparse-tags-and-containment.md](rust-platform-and-portability/windows-reparse-tags-and-containment.md)
  *(follow-up, commissioned by this artifact)* — the full reparse-tag table with the
  name-surrogate bit computed per tag, what `std::fs` and `cap-std` actually detect,
  `GetFinalPathNameByHandleW` and dunce's real role, the missing `RESOLVE_BENEATH`, cap-std's
  Windows component-walk read from source, the tar/zip extraction CVEs, `CreateHardLinkW`'s
  constraints, and the fixture matrix including what needs Developer Mode.

## Key sources

| URL | Why |
|---|---|
| [rust-lang/rust#16507](https://github.com/rust-lang/rust/issues/16507) | The WONTFIX thread with maintainer quotes declining to make `join` a security boundary — the load-bearing fact for PLAT-01 |
| [Bugs Rust Won't Catch — corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/) | The uutils audit: CVE-2026-35346/35355/35363 mapped to lossy conversion, check-then-act, and create-then-chmod, each with vulnerable/fixed code |
| [Pitfalls of Safe Rust — corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/) | Independent `Path::join` writeup plus the `remove_dir_all` TOCTOU case study and the clippy-lint limitation |
| [RUSTSEC-2022-0090 (`remove_dir_all` symlink race)](https://rustsec.org/advisories/RUSTSEC-2022-0090.html) | In-stdlib TOCTOU precedent grounding PLAT-08 in more than blog analysis |
| [Naming Files, Paths, and Namespaces (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) | Canonical source for `\\?\`, reserved device names with any extension, reserved characters, trailing dot/space, case-insensitivity — the PLAT-17 validation list |
| [Maximum Path Length Limitation (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation) | The long-path opt-in: exact registry key, manifest attribute, and the enumerated function list it affects |
| [MoveFileExW (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw) | Never uses the word "atomic"; scopes `MOVEFILE_WRITE_THROUGH` to copy-and-delete moves; documents `MOVEFILE_DELAY_UNTIL_REBOOT`'s registry mechanism — PLAT-16, PLAT-19, PLAT-34 |
| [ReplaceFileW (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew) | Multi-step by Microsoft's own description, with per-error-code post-failure state — including the 1176/`NULL`-backup case that empties the target path (PLAT-35) |
| [FlushFileBuffers (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) | Enumerates file and volume scopes and never mentions directory handles — the documentation silence behind PLAT-36 |
| [CreateFileW (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) | `FILE_SHARE_DELETE` ("delete access allows both delete and rename"), delete-pending → `ERROR_ACCESS_DENIED`, `FILE_FLAG_BACKUP_SEMANTICS` — PLAT-14, PLAT-16, PLAT-37 |
| [NTFS overview (Microsoft)](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview) / [ReFS overview](https://learn.microsoft.com/en-us/windows-server/storage/refs/refs-overview) | NTFS's journal is scoped to filesystem consistency; ReFS makes no equivalent claim and lists Transactions unavailable — the evidence for PLAT-34 and Verdict 11 |
| [`rust-lang/rust` — `library/std/src/sys/fs/windows.rs`](https://github.com/rust-lang/rust/blob/main/library/std/src/sys/fs/windows.rs) | Ground truth for `std::fs::rename`'s Windows fallback shape (PLAT-35) and `FileType::new`'s name-surrogate-bit test plus `readlink`'s decode limits (PLAT-38, PLAT-39) |
| [\[MS-FSCC\]: Reparse Tags](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-fscc/c8e77b37-3909-4fe6-a4ea-2b9d423b1ee4) / [Reparse Point Tags](https://learn.microsoft.com/en-us/windows/win32/fileio/reparse-point-tags) | Every tag's hex value plus the M/R/N/D bit layout — the table the surrogate/non-surrogate split in PLAT-18 and PLAT-38 is computed from |
| [CreateSymbolicLinkW (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createsymboliclinkw) / [CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw) | Developer Mode + `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE` (PLAT-18, PLAT-26); NTFS-only, files-only, same-volume, 1023-link cap, hardlink-to-symlink behaviour (PLAT-42, PLAT-43) |
| [Job Objects (Microsoft)](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) | `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` — the guarantee that justifies `ocx_shim` over a symlink |
| [rustup#2441 — Windows file locking design](https://github.com/rust-lang/rustup/issues/2441) / [rustup#4181 — os error 32 on update](https://github.com/rust-lang/rustup/issues/4181) | The rename-succeeds/delete-fails asymmetry PLAT-15 rests on, and live 2025 evidence that sharing violations are routine |
| [rustup `self_update/windows.rs`](https://github.com/rust-lang/rustup/blob/master/src/cli/self_update/windows.rs) / [mitsuhiko/self-replace](https://github.com/mitsuhiko/self-replace/blob/main/src/windows.rs) | The two real self-update shapes read from source — serialize-on-parent-exit and rename-aside — and the correction to PLAT-16's earlier attribution |
| [sqlite/sqlite — `src/os_win.c`](https://github.com/sqlite/sqlite/blob/master/src/os_win.c) | The best-tested public Windows retry policy (10 tries, +25 ms linear) with its in-source antivirus rationale — PLAT-14's budget |
| [bytecodealliance/cap-std](https://github.com/bytecodealliance/cap-std) | `Dir`'s boundary and its explicit "not a sandbox for untrusted Rust code"; the Windows backend's manual component walk, reserved-name blocklist, and `FILE_SHARE_DELETE` caveat — PLAT-40 |
| [GHSA-j4xf-2g29-59ph / CVE-2026-33056](https://github.com/advisories/GHSA-j4xf-2g29-59ph), [GHSA-2367-c296-3mp2](https://github.com/advisories/GHSA-2367-c296-3mp2), [GHSA-94vh-gphv-8pm8 / CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8) | tar and zip extraction CVEs: `metadata` where `symlink_metadata` was needed, hardlink re-use, and an unrevalidated symlink from an earlier entry — the failure shape PLAT-40 and PLAT-42 close |
| [ripgrep#845 — HFS+ vs APFS normalization](https://github.com/BurntSushi/ripgrep/issues/845) | Reproducible proof that HFS+ normalizes to NFD and APFS does not — corrects the lazy "HFS+ is legacy" framing |
| [std::time::SystemTime](https://doc.rust-lang.org/std/time/struct.SystemTime.html) / [Instant](https://doc.rust-lang.org/std/time/struct.Instant.html) | Non-monotonicity, fallible `duration_since`, saturating-not-panicking `Instant` arithmetic, per-OS syscall and precision tables |
| [Microsoft Learn: File Times](https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times) | FAT's 2-second write-time / 1-day access-time resolution and NTFS's delayed writeback — the evidence for PLAT-29 |
| [RFC 9111 §4.2 (HTTP Caching)](https://www.rfc-editor.org/rfc/rfc9111.html) | Normative MUST language that clock skew between client and server must not corrupt freshness math — PLAT-32 |
| [Homebrew `cask/quarantine.rb`](https://raw.githubusercontent.com/Homebrew/brew/master/Library/Homebrew/cask/quarantine.rb) | The closest real-world package-manager analogue, taking the opposite quarantine posture to ocx — the reason PLAT-22 demands an explicit choice |
