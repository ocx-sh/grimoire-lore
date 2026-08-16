---
title: Paths and Filenames — Joins, Encodings, and Containment
agent: inv-paths (Rust domain researcher)
model: sonnet
date_researched: 2026-08
sources_count: 15
scope: >
  How a filesystem-heavy Rust CLI (OCX/Grimoire family) must handle paths that
  originate outside the process — archive entries, registry manifests,
  lockfiles, CLI args, env vars. Covers Path::join's absolute-RHS trap,
  OsStr/OsString → String conversion policy, path comparison vs identity,
  camino::Utf8PathBuf adoption, cap-std::Dir as a containment primitive,
  TOCTOU (check-then-act, create-then-chmod), and io::Error path context.
  Uses grimoire's own src/path_safety.rs and src/install/path_anchor.rs as
  the reference containment design.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [`Path::join` silently discards the LHS on an absolute RHS — and it is WONTFIX](#1-pathjoin-silently-discards-the-lhs-on-an-absolute-rhs--and-it-is-wontfix)
   2. [The OsStr/OsString → String decision is per-call-site, not global](#2-the-osstrosstring--string-decision-is-per-call-site-not-global)
   3. [Path comparison: string equality, `Path::starts_with`, and `canonicalize` are three different tools](#3-path-comparison-string-equality-pathstarts_with-and-canonicalize-are-three-different-tools)
   4. [`camino::Utf8PathBuf`: when it pays for itself and what it costs](#4-caminoutf8pathbuf-when-it-pays-for-itself-and-what-it-costs)
   5. [`cap-std::Dir`: the containment primitive, and its actual boundary](#5-cap-stddir-the-containment-primitive-and-its-actual-boundary)
   6. [TOCTOU: check-then-act and create-then-chmod](#6-toctou-check-then-act-and-create-then-chmod)
   7. [`io::Error` carries no path — attaching one is not optional](#7-ioerror-carries-no-path--attaching-one-is-not-optional)
   8. [The grimoire reference design: `path_safety.rs` / `install/path_anchor.rs`](#8-the-grimoire-reference-design-path_safetyrs--installpath_anchorrs)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

1. `Path::join`/`PathBuf::push` return the RHS **unchanged** when the RHS is absolute (or, on Windows, carries a drive prefix) — this is intentional POSIX/`os.path.join` parity, and `rust-lang/rust#16507` was closed **WONTFIX** by the language team in 2015 with no plan to revisit.
2. Every join of a trusted root onto an **untrusted** component (archive entry, manifest field, lockfile value, CLI arg treated as a sub-path) needs an explicit guard — the stdlib will not add one, and neither will clippy for the general case.
3. `clippy::join_absolute_paths` (since 1.76.0, `suspicious`, warn-by-default) only fires when the joined argument is a **string literal** starting with `/` or `\`. It is a typo-catcher, not a security control — a variable holding an untrusted absolute path is invisible to it.
4. Reject-before-join is cheaper and more correct than "assert after": walk `Path::components()` and refuse any `Component::ParentDir | RootDir | Prefix` before the untrusted value ever touches a trusted root. This is Layer 1 of grimoire's `contain()`/`AnchoredPath::resolve` and needs no filesystem access.
5. `debug_assert!(component.is_relative())` at a join site is a decent second line of defense in dev/test builds but is **compiled out in release** — it must never be the only guard on an untrusted input.
6. The OsStr→String conversion decision is per call-site class, not a single global rule: **display** (lossy, `to_string_lossy()`, UI/log text only) · **comparison** (stay in `OsStr`/`Path`, never round-trip through `String`) · **on-disk record** (strict — reject non-UTF-8 at the boundary, `to_str().ok_or(...)`) · **wire record** (strict, same reasoning, plus explicit schema documentation that the field is UTF-8-only).
7. `to_string_lossy()` silently rewrites invalid bytes to U+FFFD — the uutils `comm` CVE-2026-35346 in the corrode.dev audit is exactly this: a lossy conversion in the *stream contents* path corrupted binary comparison output. The fix was to stay in bytes (`&[u8]`, `write_all`), not to fall back to lossy at all.
8. String equality on paths is wrong for containment: it misses `.`, `..`, repeated/trailing separators, and symlink-equal forms. Use component-walking (Layer 1 shape) for pre-filesystem rejection, and `Path::starts_with` on two **canonicalized** paths (never a string-prefix check) for post-existence containment.
9. `canonicalize()` requires the path to **exist** (errors on ENOENT) and, on Windows, returns the `\\?\` extended-length prefix form — use `dunce::canonicalize` when the result must also be usable by non-UNC-aware tooling (spawned processes, display, further joins against non-canonical paths).
10. For **containment** checks (is X still inside root Y?) use canonicalize-both-sides + `starts_with`, done at the last possible moment before the filesystem operation. For **identity** checks (is X the same *file* as Y, symlinks and hardlinks included) canonicalize is still the right primitive, but the CVE-2026-35363 (`chmod --preserve-root`) lesson is: never substitute string equality for it.
11. `camino::Utf8PathBuf`/`Utf8Path` pay for themselves when a codebase's paths are load-bearing strings throughout (manifest keys, lockfile records, display, hashing) — conversions from `OsStr`-based `Path` are **fallible** (`TryFrom`, `FromPathError`), so adopting camino end-to-end still needs exactly one checked boundary conversion, done once, instead of the scattered `to_str().unwrap()` calls it replaces.
12. camino's stated cost: non-UTF-8 paths cannot be represented at all — the crate's own docs argue this is acceptable because "non-Unicode paths are vanishingly uncommon," but an archive-extraction or registry-mirroring tool that must legitimately **round-trip** an arbitrary tarball entry (including a non-UTF-8 name on Unix) needs a documented fallback (raw `Path`/`OsString`) for that one boundary, not a blanket camino rewrite.
13. `cap-std::Dir` is a capability, not ambient authority: every open/create call is relative to an already-open directory handle, and on Linux 5.6+ it uses `openat2` (`RESOLVE_BENEATH`-equivalent) as a single syscall; on older kernels it walks components manually, still refusing `..`/symlink escapes.
14. `cap-std::Dir` does **not** sandbox the whole process — it is not a defense against untrusted *Rust code* (which can always reach for `std::fs` directly) — it only removes ambient-authority path traversal from code that consistently routes through the `Dir` handle. Every call site in a pipeline (download → stage → extract → publish) must actually use the `Dir`, or the guarantee has a hole.
15. TOCTOU is a named, closed root-cause class, not a hypothetical: `std::fs::remove_dir_all` itself had a symlink TOCTOU (CVE-2022-21658, fixed in 1.58.1) that the Rust core team missed for years. The fix pattern is always handle-based: open once (`O_NOFOLLOW`/`create_new(true)`/`Dir::open`), then operate on the handle (`File::metadata`, `File::set_permissions`) — never re-resolve the same path twice.
16. The create-then-chmod window (`fs::create_dir` then `fs::set_permissions(path, ...)`) is a real, distinct TOCTOU: the file exists at default (often world-readable) permissions between the two calls. Fix: create with the permissions already applied (`OpenOptions::mode()`, `DirBuilderExt::mode()` on Unix), or use the handle-based `File::set_permissions`/`file.set_permissions()` before any other process can open the path.
17. `std::io::Error` carries neither the path nor a backtrace — every `fs::` call site needs the path attached at the error site, non-optionally. `fs-err` is a drop-in (`use fs_err as fs;`) that wraps every stdlib error with the operation and path; an internal thin wrapper module is the alternative when a dependency can't be added, but it must cover every `fs::`/`File::` call, not just the obvious ones.
18. Grimoire's own `src/path_safety.rs` + `src/install/path_anchor.rs` already implement the two-layer guard this subarea asks for — component-reject before the filesystem, canonicalize-and-`starts_with` after — and explicitly accept a residual CWE-367 (TOCTOU) risk between validation and use, scoped to "grim manages the user's own config dirs; an attacker who can swap a directory under those roots already has the user's privileges." That residual-risk framing is directly reusable, but it is **not** transitively true for *download/extraction* of untrusted archive content, where the attacker supplying the untrusted path names is exactly the adversary the guard exists to stop — see Finding 8.
19. The reference design deliberately diverges its `CurDir` (`.`) handling between the two call sites — `path_safety::contain` ignores a leading `./` (join-neutral, and idiomatic in hand-authored manifests) while `AnchoredPath::resolve` rejects any `CurDir` in a *stored* value (because grim's own writer never emits one, so one surviving is a tamper signal). This is the right shape: the guard's strictness should track the *trust class of the input*, not be uniform across the codebase.
20. A single normalizing helper module (one `contain()`/`join_checked()` function that every untrusted join routes through) beats scattering `debug_assert!` calls: it is greppable, unit-testable in isolation, and the one place a reviewer needs to re-audit when the threat model changes.

---

## Findings

### 1. `Path::join` silently discards the LHS on an absolute RHS — and it is WONTFIX

```rust
use std::path::Path;
let base = Path::new("/usr");
let joined = base.join("/local/bin");
assert_eq!(joined, Path::new("/local/bin")); // NOT "/usr/local/bin"
```

This is not a bug and the maintainers will not change it. [`rust-lang/rust#16507`](https://github.com/rust-lang/rust/issues/16507), filed in 2014 by @carllerche asking that `join` concatenate-and-normalize like Ruby/Go do, was closed WONTFIX in 2015 by @aturon:

> "I'm going to close this particular issue as WONTFIX: we plan to stay with the current join semantics. (If someone strongly disagrees, at this point I think an RFC would probably be warranted, as the current behavior is from an approved RFC)."

Earlier in the same thread, @aturon and @lilyball ground the decision in prior art and give the actual rationale — the semantics deliberately match what POSIX-family and `.NET`/`os.path`-family libraries already do:

> "The only sensible operation when joining an absolute path onto some other path is to get the absolute path back. Doing anything else is just weird, and only makes sense if you actually think of paths as strings, where 'join' is 'append, then normalize'." — @lilyball

> "FWIW Ruby actually matches our join... `Pathname("a").join(Pathname("/b")) == Pathname("/b")`." — @lilyball, and @Boddlnagg confirms .NET's `Path.Combine` documents the identical rule: *"If path2 contains an absolute path, this method returns path2."*

Critically, the security angle was raised **in the same thread** and the maintainers explicitly declined to make `join` a security boundary:

> "The `join()` function is often misused and leads to security vulnerabilities... The `join()` could return something like `Result<PathBuf, PathError>` to exclude an absolute path as argument." — @l0kod

> "Note that this talks about not just absolute paths, but also relative paths that begin with `..` for example. I don't think that simply ruling out joining absolute paths... is enough to solve this problem, and I'm not sure that `std` should be legislating policy at this level." — @aturon

> "If you need security guarantees when taking in user-supplied paths, you need to enforce those guarantees yourself, because different people have different expectations." — @lilyball

This is the load-bearing fact for a filesystem-heavy CLI: **the stdlib has told you, in writing, that path-join safety is your job.** corrode.dev's independent write-up reaches the same practical verdict — [Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/) calls it "pretty counterintuitive and a potential source of bugs," and [Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) labels it "a footgun," flagging that `#![deny(clippy::join_absolute_paths)]` catches only the literal-string case (see Finding on the lint below).

**Guard shape decision.** Three shapes were evaluated per the task brief:

| Shape | What it is | Verdict |
|---|---|---|
| Validated relative-component newtype | A `RelPath(PathBuf)` whose constructor rejects non-`Normal` components, so illegal values are unrepresentable | Best for a value that is **stored** (lockfile, manifest field) and re-validated on every read — this is what `AnchoredPath.relative: String` in grimoire effectively is, minus the newtype wrapper (it uses a doc-comment invariant + a resolve-time re-check instead) |
| `debug_assert!(c.is_relative())` at every join | Cheap, in-code | **Insufficient alone** — compiled out in `--release`, and does not stop `ParentDir` components, only `is_relative()`'s narrower absolute-check |
| Single normalizing helper module | One `contain()`/`join_checked()` every untrusted join routes through | **Best default.** Greppable (`rg 'base\.join\('` should show either this helper or a documented exception), unit-testable once, and the one place a future threat-model change gets applied |

The newtype and the helper module are not mutually exclusive — grimoire uses both: `AnchoredPath` is a structured, serializable value whose invariant is documented and re-checked, and `path_safety::contain` is the reusable helper the *pure* algorithm lives in. `debug_assert!` alone is the wrong choice for anything touching untrusted input; it belongs in the "assert what should always be true anyway" category (e.g. asserting your *own* code never constructs an illegal value), not in the trust boundary itself.

### 2. The OsStr/OsString → String decision is per-call-site, not global

Rust's `OsStr`/`OsString` hold "an unspecified, platform-specific, self-synchronizing superset of UTF-8" — [`std::ffi::OsStr` docs](https://doc.rust-lang.org/std/ffi/struct.OsStr.html). Three conversion strategies exist and the corrode.dev [uutils audit](https://corrode.dev/blog/bugs-rust-wont-catch/) names all three with a concrete CVE for the wrong choice:

```rust
// 1. Lossy — silently rewrites invalid bytes to U+FFFD.
let s: std::borrow::Cow<str> = os_str.to_string_lossy();

// 2. Strict — fails or panics on non-UTF-8.
let s: &str = os_str.to_str().ok_or(Error::NonUtf8Path)?;   // fail (correct)
let s: &str = os_str.to_str().unwrap();                      // panic (wrong for untrusted input)

// 3. Stay in bytes — never converts.
let bytes: &[u8] = os_str_bytes_or_platform_specific;
```

The audit's `comm` case (CVE-2026-35346) is the canonical failure of choice #1 applied to the wrong call-site class:

```rust
// Vulnerable — corrupts binary files by lossily "stringifying" stream content:
print!("{}", String::from_utf8_lossy(ra));

// Correct — comparison/stream-content stays in bytes:
out.write_all(ra)?;
```

> "GNU `comm` works on binary files... uutils replaced anything that wasn't valid UTF-8 with U+FFFD, which silently corrupted the output." — [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

The audit's own rule generalizes cleanly to four call-site classes, which this research adopts as the canonical split:

| Call-site class | Rule | Rationale |
|---|---|---|
| **Display** (log line, progress bar, error message) | Lossy (`to_string_lossy()`) is fine | A human reading the terminal tolerates a `�`; correctness of the *displayed* string is not load-bearing |
| **Comparison** (containment check, dedup, cache key) | Stay in `OsStr`/`Path` — never round-trip through `String` | A round-trip through lossy `String` can make two *different* on-disk paths compare equal (both collapse to the same U+FFFD-substituted string) |
| **On-disk record** (lockfile field, manifest entry grim writes itself) | Strict — `to_str().ok_or(...)?` | The record must be portable and diffable; a lossy write silently and irreversibly discards information the user's filesystem actually has |
| **Wire record** (registry manifest field, OCI annotation) | Strict, same reasoning, plus the schema must say the field is UTF-8-only so a non-UTF-8 producer gets a clear rejection instead of corrupted bytes on the other end | Cross-machine/cross-language interop assumes UTF-8; silently corrupting is worse than refusing |

"Stay in bytes" (class 3) is the audit's stated default for *stream contents and environment variables* on Unix systems code, not for filesystem paths themselves — for paths, "on-disk record"/"wire record" strict-or-reject is the right frame because grimoire's paths are almost always destined to become `String` in a lockfile or manifest, not raw byte streams.

### 3. Path comparison: string equality, `Path::starts_with`, and `canonicalize` are three different tools

String equality on two `Path`/`PathBuf` values is wrong for both identity and containment. corrode.dev's uutils audit gives the concrete regression, CVE-2026-35363 in `chmod --preserve-root`:

```rust
// Vulnerable — string/structural equality misses `.`, `..`, and symlinks:
if recursive && preserve_root && file == Path::new("/") {
    return Err(PreserveRoot);
}
```

`Path`'s `PartialEq` is lexical (component-wise after normalization of `.`/repeated separators, but **not** `..` resolution and **not** symlink resolution), so `/../`, `/usr/..`, and a symlink that resolves to `/` all bypass the check. The fix:

```rust
fn is_root(file: &Path) -> bool {
    matches!(std::fs::canonicalize(file), Ok(p) if p == Path::new("/"))
}
```

> "Resolve Paths Before Comparing Them." — [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

`canonicalize()`'s own contract, from [the stdlib docs](https://doc.rust-lang.org/std/path/struct.Path.html#method.canonicalize): "Returns the canonical, absolute form of the path with all intermediate components normalized and symbolic links resolved," and it **errors if the path does not exist** — "This method will return an error in the following situations, but is not limited to just these cases: `path` does not exist." That existence requirement is the reason grimoire's two-layer guard only runs canonicalize in Layer 2 (candidate exists or is a symlink) and falls back to a purely lexical Layer-1-passed join for a not-yet-created target.

On Windows, `std::fs::canonicalize` returns the `\\?\`-prefixed extended-length form, which many other Windows APIs and CLI tools do not accept unmodified. [`dunce`](https://docs.rs/dunce/latest/dunce/)'s `canonicalize` is the fix: "Like `std::fs::canonicalize()`, but on Windows it outputs the most compatible form of a path instead of UNC" — it "leaves UNC paths as-is when they can't be unambiguously expressed in a simpler way." Grimoire's own guard uses `dunce::canonicalize` for exactly this reason (see Finding 8).

**Decision for this codebase:**

| Question | Tool | Why |
|---|---|---|
| "Is this candidate still contained under this trusted root?" (containment) | Canonicalize **both** sides with `dunce::canonicalize`, then `Path::starts_with` — never a string/prefix check | Component-granular; a string-prefix check on `/base` vs `/base-evil` would wrongly pass |
| "Is this the root itself / a specific sentinel path?" (identity against one known path) | `canonicalize()` then structural `==` | Same reasoning as the `chmod --preserve-root` fix |
| "Are these two untrusted, possibly-nonexistent paths the same file?" | Not generally decidable without both existing — canonicalize both, compare; if either doesn't exist, fall back to lexical component comparison and document that it is an approximation | `canonicalize` cannot run on an absent path |
| Pre-filesystem rejection of a value before it ever gets joined | `Path::components()` walk, reject non-`Normal` | No syscall, works on paths that will never exist (archive entries not yet extracted) |

### 4. `camino::Utf8PathBuf`: when it pays for itself and what it costs

[camino's docs](https://docs.rs/camino/latest/camino/) state the value proposition directly: check UTF-8 validity **once**, then manipulate as `&str` from there on, versus std's `Path`/`PathBuf` which force a `to_str().unwrap()`/lossy dance at every string-shaped operation. camino's own framing of the tradeoff:

> "non-Unicode paths are vanishingly uncommon" — because of Unicode adoption, cross-platform compatibility, and because "many systems, such as Cargo, only support UTF-8 paths."

Conversion is **fallible in one direction**: `Utf8PathBuf::try_from(PathBuf) -> Result<_, FromPathBufError>` (and the borrowed/`OsStr` variants `FromPathError`, `FromOsStrError`, `FromOsStringError`). Adopting camino end-to-end does not eliminate the boundary conversion — it **concentrates** it: instead of scattered `to_str().unwrap()` calls throughout business logic, there is exactly one checked conversion at the process boundary (CLI arg parse, archive-entry read, manifest deserialize), after which every downstream function signature can honestly declare `Utf8Path`/`Utf8PathBuf` and never touch `OsStr` again.

**When it beats `Path` + boundary conversion:** when paths are load-bearing strings throughout the codebase — hashed into lockfile keys, displayed, string-matched, split on `/`, embedded in manifests — i.e. exactly grimoire's domain (OCI tag strings, install-state JSON, glob patterns over skill names). Every one of those operations on a raw `Path` needs its own ad-hoc `to_str()` call today; `grep -c 'to_string_lossy\|to_str()' src/` in grimoire currently returns **42** hits, which is the size of the conversion surface camino would collapse to a handful of true boundary points.

**What it costs:** the crate cannot represent a non-UTF-8 path at all — not lossily, not as a fallback variant. A tool whose contract is "extract this tarball exactly, byte for byte" (relevant to `grim`/`ocx` archive extraction, since OCI/tar archives are not required to have UTF-8 entry names on Unix) needs a **documented exception**: the archive-entry-name read path stays on raw `OsString`/`Path` until the name is validated UTF-8, and only then is promoted into `Utf8PathBuf` for the rest of the pipeline — with an explicit, actionable error (not silent skip) when a real-world archive carries a non-UTF-8 name. This is the one boundary a full camino migration does not remove; it relocates it to a single, auditable spot instead of leaving it implicit everywhere.

### 5. `cap-std::Dir`: the containment primitive, and its actual boundary

[bytecodealliance/cap-std](https://github.com/bytecodealliance/cap-std)'s `Dir` is capability-based filesystem access: instead of "ambient authority to request any file or network handle simply by providing its name," code must hold "a `Dir`, representing an open directory," and every subsequent open/create is relative to that handle. Concretely:

```rust
// dir.open("../hidden.txt")            -> PermissionDenied, refused before any data leaves the sandbox
// symlink planted inside dir pointing  -> PermissionDenied when the traversal would escape dir
//   outside, then dir.open("link")
```

On Linux 5.6+, cap-std implements `Dir::open` "with a single system call in common cases" using `openat2` (the kernel primitive with `RESOLVE_BENEATH`/`RESOLVE_NO_SYMLINKS`-class flags); on FreeBSD 13.0+ it uses `openat(O_RESOLVE_BENEATH)`; on older/other platforms it "opens each component of a path individually, in order to specially handle `..` and symlinks" — i.e. it degrades to the manual component-walk this codebase would otherwise have to hand-roll, but does so consistently and with a maintained implementation.

**What it does NOT cover, stated explicitly in the docs:**

> "cap-std is not a sandbox for untrusted Rust code. Among other things, untrusted Rust code could use `unsafe` or the unsandboxed APIs in `std::fs`."

This is the critical scoping fact: `Dir` protects a pipeline that **consistently routes through it**, not the process as a whole. A single stray `std::fs::File::open(absolute_path)` anywhere in the extraction path is invisible to `Dir` and bypasses the guarantee entirely — cap-std gives you a discipline, not an OS-level sandbox (that would require `cap-std`'s sibling crate `cap-std::ambient_authority()` boundary being the *only* filesystem entry point in the binary, which is a stronger, whole-crate architectural commitment).

**Wiring it into download → stage → extract → publish:**

1. **Download**: writes to a plain temp file (no path from the network payload is used yet) — no `Dir` needed.
2. **Stage**: `let stage_dir = Dir::open_ambient_dir(&staging_root, ambient_authority())?;` opens the one legitimate entry point into the staging tree.
3. **Extract**: for every archive entry, the entry's name (untrusted) is passed as the `path` argument to `stage_dir.create(entry_name)` / `stage_dir.open_with(...)` — **never** joined onto `staging_root` with `std::path::Path::join` first. This is the actual containment enforcement: the untrusted name never becomes an absolute path the process could accidentally use with ambient `std::fs`.
4. **Publish**: promotion out of staging into the real install location is a rename/move done through a **second** `Dir` (the destination anchor), so the untrusted name is never resolved against ambient authority even at the final step.

What `Dir` does **not** cover, and what the pipeline still needs on top of it: TOCTOU between staging-complete and publish-time if the staging root itself can be concurrently tampered with (same-uid adversary — see Finding 6's scoping note, which mirrors grimoire's own accepted-risk framing), and archive-entry semantic validation (a `..`-free but absurdly deep or huge entry is still a resource-exhaustion risk `Dir` does not address).

### 6. TOCTOU: check-then-act and create-then-chmod

TOCTOU is not hypothetical for this domain — `std::fs::remove_dir_all` itself carried a symlink race for years:

> [RustSec CVE-2022-21658](https://rustsec.org/advisories/RUSTSEC-2022-0090.html) (actually filed as `rust/std/CVE-2022-21658.md` in the advisory DB): "an attacker with unprivileged access to a system could trick a privileged program using `std::fs::remove_dir_all` into deleting files they don't have access to delete by creating a symlink in a directory that would be removed... due to a Time-of-check time-of-use race condition around this function's check for symbolic links." Fixed in `std` **1.58.1**.

corrode.dev's uutils audit generalizes the root cause and gives the fix shape for both variants named in the task brief:

**Check-then-act on a path (install's overwrite case, CVE-2026-35355):**

```rust
// Vulnerable:
fs::remove_file(to)?;
let mut dest = File::create(to)?;   // follows symlinks, truncates — attacker relinked `to` in the gap
copy(from, &mut dest)?;

// Fixed:
let mut dest = OpenOptions::new()
    .write(true)
    .create_new(true)               // fails if ANYTHING exists at `to`, symlink included
    .open(to)?;
```

> "No file is allowed to exist at the target location, also no (dangling) symlink." — [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/), on `create_new(true)`.

> "Anchor your operations on a file descriptor instead [of repeatedly resolving the same path]. If you act on the same path twice, assume it's a TOCTOU bug."

[Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) gives the same shape for a directory-removal check:

```rust
// Vulnerable — the directory-ness is checked, then acted on by path again:
if !path.is_dir() {
    return Err(io::Error::new(io::ErrorKind::NotADirectory, "not a directory"));
}
remove_dir_impl(path) // path could have been swapped for a symlink in between

// Fix direction: open with O_NOFOLLOW | O_DIRECTORY first, then operate on the
// resulting handle — never re-derive a second path-based operation from a
// path-based check.
```

**Create-then-chmod (permission window):**

```rust
// Vulnerable — the directory briefly exists at default (often world-readable) perms:
fs::create_dir(&path)?;
fs::set_permissions(&path, Permissions::from_mode(0o700))?;

// Fixed — permissions applied atomically at creation:
DirBuilder::new().mode(0o700).create(&path)?;   // DirBuilderExt (Unix)
// or, for files:
OpenOptions::new().mode(0o600).write(true).create_new(true).open(&path)?;
```

> "Other users can `open()` the directory during the brief moment it exists with default permissions, and the later `chmod` doesn't take it away." — [Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/)

The general fix pattern the brief asks for is confirmed across both cases: **handle-based, not path-based**. Once a `File`/`Dir` handle exists, `File::set_permissions`/`Dir`-relative operations act on the *inode already opened*, immune to a filesystem-level swap of what the path currently points to — this is exactly why [`File::set_permissions`](https://doc.rust-lang.org/std/fs/struct.File.html#method.set_permissions) is the safe primitive ("Changes the permissions on the underlying file" — the already-open file, not whatever the path currently resolves to) versus the free function `std::fs::set_permissions(path, ...)`, which re-resolves the path and is exactly the race in the vulnerable example above.

### 7. `io::Error` carries no path — attaching one is not optional

`std::io::Error` is a bare `{kind, message, (raw_os_error)}` — no path field, no backtrace by default. Every `fs::`/`File::` call site that can fail needs the path attached at the call site, or debugging a production failure degrades to "The system cannot find the file specified. (os error 2)" with no indication of *which* file. [`fs-err`](https://docs.rs/fs-err/latest/fs_err/) is the documented drop-in fix:

> "a drop-in replacement for `std::fs` that provides more helpful messages on errors... Extra information includes which operation was attempted and any involved paths."

Before/after, quoted from the docs:

```
std::fs:  "The system cannot find the file specified. (os error 2)"
fs_err:   "failed to open file `does not exist.txt`: The system cannot find the file specified. (os error 2)"
```

> "fs-err's API is the same as std::fs, so migrating code to use it is easy" — typically `use fs_err as fs;` in place of `use std::fs;`.

For a codebase that cannot add the dependency (or that already has an internal `fs` wrapper module for other reasons — atomic writes, retry-on-Windows-`ERROR_SHARING_VIOLATION`, etc.), the equivalent internal thin module must wrap **every** `fs::`/`File::` call, not just the "important" ones — a partially-covered wrapper is worse than none, because it trains reviewers to trust error messages that are silently path-less half the time.

### 8. The grimoire reference design: `path_safety.rs` / `install/path_anchor.rs`

`grim`'s own [`src/path_safety.rs`](file:///home/mherwig/dev/grimoire/src/path_safety.rs) and [`src/install/path_anchor.rs`](file:///home/mherwig/dev/grimoire/src/install/path_anchor.rs) already implement the two-layer guard this subarea's brief asks for, and both are worth reading as the concrete answer to "what does the guard actually look like in production Rust." Summary of the shared algorithm (`contain()` is the free-standing core; `AnchoredPath::resolve` is the stateful sibling with a `Containment` policy parameter):

- **Layer 1 (always, no filesystem access):** walk `relative.components()`; any `Component::ParentDir | RootDir | Prefix` → reject (`Traversal`/`TraversalAttempt`). Require at least one `Normal` component (rejects `""`, `"."`, `"./"`  — these name the base itself, not a file inside it).
- **Layer 2 (only when the candidate exists or `is_symlink()` is true — checked via `symlink_metadata`, since `exists()` is false for a dangling symlink):** `dunce::canonicalize` both `base`/`root` and the joined candidate, then assert `canon_candidate.starts_with(&canon_base)` — **never** a string-prefix check. Returns the canonicalized path (not the raw join) specifically to close the TOCTOU window between validation and use: "callers act on the validated, symlink-resolved path" rather than re-deriving a path-based operation afterward (directly matching the Finding-6 fix pattern).
- **Deliberate divergence between the two call sites:** `path_safety::contain` treats a leading `CurDir` (`./`) as join-neutral and ignores it (its input is a *user-authored* manifest, where `./foo` is idiomatic), while `AnchoredPath::resolve` rejects any `CurDir` in a *stored* remainder (its input is grim's own previously-written state, whose writer never emits `.`, so one surviving is a tamper signal, not a style choice). The doc comment is explicit that any future unification "must preserve that stricter `CurDir` rejection on the install side" — this is the right shape for the guidance in this report: **the guard's strictness tracks the trust class of the input**, not a single codebase-wide constant.
- **Explicitly accepted residual risk (CWE-367):** "when the candidate does not yet exist Layer 2 is skipped and the plain join is returned, so a caller that later reads that path carries a TOCTOU window... if the tree mutates between this check and the read. Accepted because publish trusts the local operator's own tree." `AnchoredPath::resolve` states the same acceptance more elaborately, adding: *never cache a validated root or path prefix across `resolve()` calls* (citing the gitoxide symlink-prefix-reuse worktree escape, GHSA-f89h-2fjh-2r9q, as the concrete failure shape "someone would later 'optimize' into"), and *grim must not be run elevated* — the threat model rests on grim holding no more privilege than the owner of the directories it manages.

**Where this reference design is appropriately strict, and where a reviewer should not blindly copy it elsewhere in the codebase:**

- **Appropriately strict for its stated scope** (local-operator publish, install-state re-resolution against the user's own vendor config dirs): the same-uid threat model is honest and the residual TOCTOU is genuinely low-severity there — an attacker who can race a symlink swap under `~/.claude` already has the user's own write access to `~/.claude`.
- **Under-strict if reused verbatim for archive extraction of untrusted registry content.** The brief's own framing ("archive entries, registry manifests... originate outside the process") names a *different* adversary than `path_anchor.rs`'s: a malicious OCI manifest or tarball is attacker-controlled data arriving from the network, not the local operator's own layout. For that pipeline, Layer 1 (component rejection) is still correct and sufficient as a *first* gate, but Layer 2's "skip canonicalize when the candidate doesn't exist yet" is exactly backwards for extraction — the candidate legitimately does not exist yet (that's the whole point of extracting it), so the TOCTOU-accepting fallback fires on **every single extracted entry**, not as a rare edge case. The correct primitive for that pipeline is `cap-std::Dir` (Finding 5) — the untrusted entry name is never resolved against ambient authority at all, so there is no join to canonicalize after the fact. Grimoire's guard and `cap-std::Dir` are complementary, not redundant: use the anchor-guard shape for *stored, previously-validated* paths being re-resolved (install state, publish targets), and `Dir`-relative opens for *freshly arriving, adversarial* names (archive extraction, download staging).
- **Not over-strict anywhere observed** — the `CurDir`-handling divergence and the `Containment::AllowRelocatedAncestor` carve-out (permits an escape through a *symlinked ancestor*, Unix-only, read-only callers only, logged at `warn!`) are both narrowly scoped with documented rationale, not blanket relaxations.

---

## Normative guidance candidates

1. **Never join an untrusted component onto a trusted root without passing it through a single reject-or-contain helper first.** *Rationale:* `Path::join` is not a security boundary by design (WONTFIX, Finding 1) — this is the one fact every join site must respect. *VERIFICATION:* `rg '\.join\(' src/ -g '!*test*'` and manually confirm each hit either (a) joins two compile-time-known literals, (b) routes through the shared `contain()`/`AnchoredPath::resolve` helper, or (c) has a `// SAFETY:`-style comment naming why the RHS is trusted.

2. **Reject non-`Normal` path components (`ParentDir`, `RootDir`, `Prefix`) before any filesystem call, for every value that crossed a process boundary** (CLI arg used as a sub-path, archive entry name, manifest field, env var). *Rationale:* pre-filesystem rejection is cheaper, works on paths that don't exist yet, and is the correct Layer 1 for every trust class. *VERIFICATION:* `rg -n 'fn contain\(|Component::ParentDir|Component::RootDir|Component::Prefix' src/` should show the guard function(s) exist and are the only places these variants are matched for rejection purposes; a reviewer reading a new `fs::` call site with an external-origin path asks "does this path go through that function?"

3. **Never use `debug_assert!` as the sole guard on an untrusted join.** *Rationale:* `debug_assert!` compiles out under `--release`/`cfg(not(debug_assertions))` — a check that vanishes in the shipped binary is not a check. *VERIFICATION:* `rg -n 'debug_assert.*is_relative|debug_assert.*is_absolute' src/` — every hit must be paired with a non-debug guard (the reject-before-join helper) on the same or a wrapping code path; a bare `debug_assert!` with no such pairing is a finding.

4. **Ban `Path::join`/`PathBuf::push` with a string **literal** starting with `/` or `\` — enforce via clippy, not just review.** *Rationale:* this is almost always a copy-paste bug or a misunderstanding of join semantics (Finding 1); the literal case is the one clippy can catch mechanically. *VERIFICATION:* `cargo clippy -- -D clippy::join_absolute_paths` in CI; note this only fires on literals (confirmed by reading the lint's [source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/methods/join_absolute_paths.rs)) — it does **not** replace rule 1/2 for runtime values.

5. **Classify every `OsStr`/`OsString` → `String` conversion by call-site class before choosing lossy vs. strict vs. bytes** (Finding 2's four-way table). *Rationale:* a single global "always lossy" or "always strict" rule is wrong for at least one of the four classes — lossy corrupts on-disk/wire records, strict panics inappropriately on display paths that happen to contain odd bytes. *VERIFICATION:* `rg -n 'to_string_lossy\(\)' src/` — every hit needs a same-line or adjacent comment naming the call-site class (`// display:` / `// on-disk:` etc.); a hit with no such marker and a call-site class of "on-disk record" or "wire record" is a finding. Grimoire currently has 42 `to_string_lossy()`/`to_str()` hits in `src/` — auditing that a change didn't move a display-class conversion into a record-writing path is the concrete review action.

6. **Mark every deliberate lossy conversion with a machine-greppable exception marker** — e.g. `// LOSSY-OK: display only, see <rule>` — required whenever `to_string_lossy()` (or an equivalent lossy path) appears anywhere near a `fs::write`, a struct field that gets `Serialize`d, or a network call. *Rationale:* the brief requires a lossy-conversion rule with a machine-checkable exception marker; this makes "is this lossy conversion intentional and safe" answerable by grep instead of by re-deriving the call-site class from scratch on every review. *VERIFICATION:* `rg -n 'to_string_lossy\(\)' src/ | rg -v 'LOSSY-OK'` should be empty, or every remaining hit is a new finding to triage.

7. **Never compare paths for containment or identity with `==`/string equality; use canonicalize + `Path::starts_with`.** *Rationale:* structural/string equality misses `.`, `..`, repeated separators, and symlinks (CVE-2026-35363, Finding 3). *VERIFICATION:* `rg -n 'Path::new\("/"\)|== Path::new|path == |file == Path' src/` — any comparison against a path-shaped literal or between two `Path`/`PathBuf` values that isn't preceded by a `canonicalize()`/`dunce::canonicalize()` call on both sides is a finding.

8. **Always canonicalize through `dunce::canonicalize`, never bare `std::fs::canonicalize`, anywhere the result may be displayed, re-joined, or handed to a spawned process.** *Rationale:* bare `canonicalize` returns `\\?\`-prefixed paths on Windows that many downstream consumers reject or mishandle. *VERIFICATION:* `rg -n '\bfs::canonicalize\(|\.canonicalize\(\)' src/ | rg -v 'dunce::'` should be empty (grimoire's own guard already does this — use it as the template).

9. **Route every archive-extraction and cache-write path through a `cap-std::Dir` handle opened once at the tree root; never resolve an untrusted entry name against an absolute path via `std::fs`.** *Rationale:* `Dir` removes ambient authority from the exact place adversarial names arrive (Finding 5); the alternative (canonicalize-after-join) is a TOCTOU trap for content that legitimately doesn't exist yet at check time (Finding 8's under-strict warning). *VERIFICATION:* `rg -n 'fn extract|fn stage|fn download' src/` then confirm the function's body takes a `&Dir`/`cap_std::fs::Dir` and never constructs a `std::path::PathBuf` by joining the archive entry name onto an absolute root; `rg -n 'std::fs::File::(open|create)\(' src/<extraction-module>` should be empty (all opens should be `Dir`-relative).

10. **Every check-then-act pair on the same path is a bug until proven otherwise — replace with a single handle-based operation.** *Rationale:* CVE-2022-21658 (`remove_dir_all`) and the corrode.dev `install`/`chmod`-adjacent cases show this is not theoretical (Finding 6). *VERIFICATION:* reading heuristic — grep for any function containing two separate `fs::`/`Path::` calls that name the same path variable (`rg -n -B2 -A2 '\.exists\(\)|\.is_dir\(\)|\.is_file\(\)' src/` and manually check whether the very next statement acts on the same path again); replace with `OpenOptions::new().create_new(true)` or a `Dir`-relative equivalent.

11. **Create every file/directory with its final permissions in the creation call — never `create` then `set_permissions(path, ...)`.** *Rationale:* the create-then-chmod window is a distinct, independently exploitable TOCTOU from check-then-act (Finding 6). *VERIFICATION:* `rg -n 'fs::set_permissions\(' src/` — every hit's preceding lines should NOT contain a `fs::create_dir`/`File::create` on the same path within the same function; prefer `rg -n 'DirBuilderExt|OpenOptionsExt.*mode\(' src/` to confirm the atomic-creation pattern is actually used where a file/dir with non-default permissions is created.

12. **Attach the path to every `io::Error` at the call site — no bare `fs::`/`File::` call without path context on the error path.** *Rationale:* `io::Error` carries neither path nor backtrace (Finding 7); an unattached error is undebuggable in production. *VERIFICATION:* if `fs-err` is adopted, `rg -n '^use std::fs' src/` should be empty (everything routes through `fs_err as fs`); if using an internal wrapper, `rg -n 'std::fs::|std::io::' src/ | rg -v '<wrapper-module-path>'` should be empty outside the wrapper module itself.

13. **Adopt `camino::Utf8PathBuf` for every path type that crosses a manifest/lockfile/display boundary; keep raw `OsString`/`Path` only at the single archive-entry-name read point, with an explicit, actionable (non-panicking) rejection for a non-UTF-8 name.** *Rationale:* concentrates the fallible boundary conversion instead of scattering `to_str()` calls (Finding 4); explicitly preserves correctness for the one legitimate non-UTF-8 case (tarball entries) instead of silently corrupting or panicking on it. *VERIFICATION:* `rg -n 'Utf8PathBuf::try_from|Utf8Path::from_path' src/` — the count of conversion points should be small and stable (ideally one per true process boundary: CLI parse, archive-entry read, manifest deserialize); a growing count over time signals camino adoption is incomplete/leaking `Path` into business logic.

---

## AI-agent angle

An LLM asked to "extract this archive into `dest_dir`" or "resolve this install target" reliably gets three things wrong, in order of frequency:

1. **Writes `dest_dir.join(entry_name)` directly**, trusting that `join` "just concatenates" — because that is the intuitive, cross-language-common-sense behavior, and the model has almost certainly seen far more Python `os.path.join`-adjacent code (which shares the trap) than the rust-lang WONTFIX thread. This is the single highest-value mechanical check: **`rg '\.join\(' <new-or-changed-files> | rg -v 'contain\(|AnchoredPath|// SAFETY'` on every diff that touches extraction/install code**, flagging any join whose RHS is not a compile-time-provably-relative literal.

2. **Reaches for `to_string_lossy()` reflexively** whenever a `Path`/`OsStr` needs to become a `String` for a `format!`/error message, without noticing the surrounding context is actually a record being written to disk or serialized — because `to_string_lossy()` is the "just works, no `Result` to handle" option and models default to the path of least friction under time/token pressure. Mechanical check: **grep every new `to_string_lossy()` call and check whether the containing function's return value or a nearby variable is later passed to `serde::Serialize`, `fs::write`, or a network client** — if so, it should be `to_str().ok_or(...)?` instead, or the call needs a `// LOSSY-OK:` marker (rule 6) proving it was a deliberate choice, not a default.

3. **"Fixes" a TOCTOU report by adding a check immediately before the act**, rather than replacing the pair with a handle-based operation — because the visible symptom ("path might not exist") is directly answered by adding `if path.exists() { ... }`, and the model has no way to observe the race window itself (there is no test that fails locally to prove the fix is wrong). Mechanical check: **any diff whose fix for a "path might not exist / might be wrong type" bug report adds an `.exists()`/`.is_dir()`/`.is_file()` call rather than switching to `create_new(true)`, `OpenOptions`, or a `Dir`-relative open should be treated as unverified** — ask the model (or a reviewer) to name the specific handle-based alternative it considered and rejected, not accept the check-then-act patch as done.

A fourth, lower-frequency but higher-severity failure: an LLM given "make this cross-platform" as a goal will often reach for `canonicalize()` to "normalize" a path for comparison **and leave it as bare `std::fs::canonicalize`**, introducing a Windows `\\?\`-prefix regression that has no Linux/macOS-only reviewer or CI runner to catch it. Mechanical check: rule 8's grep, run specifically in CI on a Windows runner or as a pure static grep (no runtime needed) — `rg -n '\bfs::canonicalize\(|\.canonicalize\(\)' | rg -v 'dunce::'`.

---

## Contested / evolving

- **`Path::join`'s absolute-RHS semantics are settled, not contested** — the WONTFIX is a decade-plus old and the discussion thread (last substantive comment ~2020, per the "several years late to the party" framing in the thread) shows no sign of the language team revisiting it. Treat this as permanent, not "current practice as of 2026 that might change."
- **`camino` adoption is genuinely a judgment call, not settled doctrine.** The crate's own docs concede the non-UTF-8 cost rather than dismiss it, and this research's recommendation (adopt end-to-end except the archive-entry boundary) is a synthesis, not a documented camino-maintainer position — a reviewer should treat rule 13 as the strongest available guidance, not an industry consensus.
- **`cap-std`'s Windows story is less mature than its Unix/`openat2` story.** The fetched README establishes the Linux 5.6+/FreeBSD 13.0+ fast paths explicitly; it does not make an equivalently strong claim for Windows, and grimoire's own `path_anchor.rs` independently notes (in the `Containment::AllowRelocatedAncestor` doc comment) that `is_symlink()` "does not cover every reparse tag (`LX_SYMLINK`, `APPEXECLINK`, WCI)" on Windows — i.e. the symlink-based reasoning both `cap-std` and the two-layer guard rely on is weaker on Windows than on Unix. Any cross-platform CLI in this family should treat Windows path-escape defenses as the least-verified part of the design and re-review them separately, not assume Unix test coverage transfers.
- **Whether `openat2`/`RESOLVE_BENEATH`-class kernel primitives should be used *directly* (bypassing `cap-std`) for the hottest extraction path is an open performance-vs-dependency-surface question** this research did not find a settled answer to — `cap-std` is the maintained, audited option; hand-rolling `openat2` calls would need `unsafe`, which conflicts with grimoire's stated `forbid(unsafe_code)` policy (visible in `path_anchor.rs`'s own doc comments explaining why it avoids `std::env::set_var`). This tips the decision toward `cap-std` for this specific codebase, but the underlying tradeoff (a maintained safe wrapper vs. a hand-tuned unsafe fast path) is a live one in the broader ecosystem.
- **The "stay in bytes" default for Unix systems code (Finding 2, class 3) is itself contested within the Rust ecosystem** — it's the right answer for `comm`-style stream-content tools per the uutils audit, but the broader "should Rust CLIs target `Vec<u8>` or `OsString` as their primary string type on Unix" debate is unresolved upstream (visible in the long-running `os_str_bytes`/`bstr` crate ecosystem existing at all, as a workaround for gaps in what `std::ffi` exposes). This research scopes its recommendation narrowly to *paths* (Finding 2's table), not to general stream/argument handling, where the tradeoff is genuinely less settled.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rust-lang/rust#16507](https://github.com/rust-lang/rust/issues/16507) | GitHub issue, closed WONTFIX | Filed 2014, closed 2015, active discussion through ~2020 | The primary source for *why* `Path::join` behaves this way — direct maintainer quotes (`@aturon`, `@lilyball`), cross-language comparison (Ruby, Go, .NET, C++), and the security angle raised and explicitly declined in the same thread |
| [Sharp Edges in the Rust Standard Library — corrode.dev](https://corrode.dev/blog/sharp-edges-in-rust-std/) | Blog post, Rust consultancy (Matthias Endler) | 2026 (recent) | Independent confirmation of the `join` footgun and the `OsStr`→`String` "awkward dance," with the camino recommendation |
| [Bugs Rust Won't Catch — corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/) | Blog post analyzing the uutils coreutils Rust security audit | 2026 (recent) | The single richest source in this report — concrete CVEs (CVE-2026-35355/35346/35348/35363/35368/35369) mapped to TOCTOU, lossy-conversion, and permission-race root causes, each with vulnerable/fixed code pairs |
| [Pitfalls of Safe Rust — corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/) | Blog post | 2026 (recent) | Independent `Path::join` footgun writeup plus the `remove_dir_all` TOCTOU case study and the `clippy::join_absolute_paths` pointer |
| [bytecodealliance/cap-std (GitHub)](https://github.com/bytecodealliance/cap-std) | Primary crate README, maintained by Bytecode Alliance | Ongoing (fetched 2026) | Authoritative statement of what `Dir` protects (ambient-authority removal, `openat2` fast path) and what it explicitly does not (`"not a sandbox for untrusted Rust code"`) |
| [camino docs.rs](https://docs.rs/camino/latest/camino/) | Primary crate docs | Ongoing (fetched 2026) | Authoritative statement of the UTF-8-only tradeoff and the fallible-conversion API shape (`FromPathError` etc.) |
| [fs-err docs.rs](https://docs.rs/fs-err/latest/fs_err/) | Primary crate docs | Ongoing (fetched 2026) | Exact before/after error-message example and the drop-in API-compatibility claim |
| [dunce docs.rs](https://docs.rs/dunce/latest/dunce/) | Primary crate docs | Ongoing (fetched 2026) | Explains the Windows `\\?\` UNC-vs-legacy-path problem `canonicalize` creates and how `dunce::canonicalize` avoids it — directly matches grimoire's own usage |
| [Path::canonicalize — std docs](https://doc.rust-lang.org/std/path/struct.Path.html#method.canonicalize) | Primary stdlib docs | Rust 1.5.0+, current | Confirms the existence requirement and the symlink-resolution contract that shapes the two-layer guard's Layer 2 gating |
| [OsStr — std docs](https://doc.rust-lang.org/std/ffi/struct.OsStr.html) | Primary stdlib docs | Current | `to_str()` vs `to_string_lossy()` exact contracts; the "self-synchronizing superset of UTF-8" framing |
| [File::set_permissions — std docs](https://doc.rust-lang.org/std/fs/struct.File.html#method.set_permissions) | Primary stdlib docs | Since 1.16.0, current | Confirms the handle-based ("underlying file," not path-based) contract that is the fix for the create-then-chmod race |
| [clippy::join_absolute_paths source — rust-lang/rust-clippy](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/methods/join_absolute_paths.rs) | Primary lint implementation source, read directly via `gh api` | Lint added 1.76.0, source read 2026 | Proves the lint only fires on `ExprKind::Lit` string literals — the load-bearing limitation for the AI-agent-angle and verification sections; not documented this precisely anywhere else fetched |
| [RustSec CVE-2022-21658 advisory](https://rustsec.org/advisories/RUSTSEC-2022-0090.html) (advisory text itself sourced via `gh api repos/RustSec/advisory-db`) | Primary vulnerability database entry | Disclosed 2022-01-16, patched in std 1.58.1 | The concrete, closed-root, in-stdlib TOCTOU precedent (`remove_dir_all` symlink race) that grounds Finding 6 in more than blog-post analysis |
| [`grim`'s `src/path_safety.rs`](file:///home/mherwig/dev/grimoire/src/path_safety.rs) | Internal reference implementation, read directly from the sibling `grimoire` checkout | Current (this repo, 2026) | The reference two-layer containment guard the task brief names explicitly; the pure, base-agnostic core of the algorithm |
| [`grim`'s `src/install/path_anchor.rs`](file:///home/mherwig/dev/grimoire/src/install/path_anchor.rs) | Internal reference implementation, read directly from the sibling `grimoire` checkout | Current (this repo, 2026) | The stateful sibling of the above — `AnchoredPath`, `Containment` policy, and the explicitly documented CWE-367 residual-risk acceptance this report's Finding 8 evaluates |
