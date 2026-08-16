---
title: Clocks, Timestamps, and Cache Freshness in Rust
agent: rust-time-researcher
model: sonnet
date_researched: 2026-08
sources_count: 13
scope: >
  Instant vs SystemTime semantics and platform guarantees; filesystem mtime
  granularity as a (non-)input to cache freshness; clock skew and negative
  duration handling; time-crate selection (jiff/time/chrono) for a 2026
  Rust CLI workspace; on-disk timestamp serialization format; HTTP freshness
  headers as untrusted input. Written for grim/ocx: package managers over
  OCI registries with lockfiles, TTL caches, and cross-platform binaries.
---

## Table of contents

1. [Instant vs SystemTime](#1-instant-vs-systemtime)
2. [Platform precision divergence](#2-platform-precision-divergence)
3. [Filesystem mtime as a freshness input](#3-filesystem-mtime-as-a-freshness-input)
4. [Clock skew, NTP steps, and negative durations](#4-clock-skew-ntp-steps-and-negative-durations)
5. [Crate selection: jiff vs time vs chrono](#5-crate-selection-jiff-vs-time-vs-chrono)
6. [Serialized timestamp format](#6-serialized-timestamp-format)
7. [HTTP caching headers as untrusted input](#7-http-caching-headers-as-untrusted-input)
8. [Normative guidance candidates](#normative-guidance-candidates)
9. [AI-agent angle](#ai-agent-angle)
10. [Contested / evolving](#contested--evolving)
11. [Sources](#sources)

## Summary

1. **`Instant` for elapsed-time and TTL math, `SystemTime` for anything persisted.** Never use `SystemTime` subtraction to decide "has N seconds passed" — it is not monotonic.
2. `SystemTime` **can go backwards between two sequential reads** on the same thread; this is documented behavior, not a bug to work around with `.unwrap()`.
3. `Instant` is **not guaranteed steady** either — ticks can vary in length, and behavior across suspend/resume is unspecified and OS-dependent.
4. `SystemTime::duration_since` returns `Result<Duration, SystemTimeError>`; a bare `.unwrap()`/`.expect()` on it is a **panic waiting for an NTP step or a manually-set clock**.
5. `Instant::duration_since`/`elapsed` do **not** panic on a monotonicity violation — they saturate to zero. `checked_duration_since` is the only way to detect the violation instead of silently getting `0`.
6. `SystemTime::now() + Duration::from_nanos(1)` is **not guaranteed to read back as +1ns** — Windows' realtime clock moves in ~100ns/15.6ms-ish ticks depending on API, so treat **milliseconds** as the practical precision floor for any cross-platform freshness comparison.
7. Filesystem mtime granularity varies by orders of magnitude: ext4 ~nanosecond, NTFS 100ns (but access time can be an hour stale), **FAT write-time resolution is 2 seconds and access time is 1 day** — a same-second write-then-check can read "unchanged."
8. **mtime is not a safe freshness predicate at all**, independent of granularity: copies, `rename`, and archive extraction routinely reset or preserve mtime in ways that don't correlate with content change, and it can be *older* than the actual write due to filesystem staging (NTFS delays access-time updates up to 1 hour).
9. Replace "mtime newer than X" with one of: **content digest** (already the deployed answer for OCI blobs — reuse it), a **monotonically increasing generation counter** in the cache index, or an **explicit cache-entry metadata record** written atomically alongside the artifact recording fetch time + TTL + validators.
10. A wall clock stepping backwards mid-run (NTP correction, manual clock set, VM migration) is a **routine event to handle, not an edge case** — every TTL check must treat "now < recorded_time" as a valid, non-panicking outcome (treat as expired, log, move on).
11. **One time crate per workspace.** Two crates that both model "instant in time" (e.g. `chrono::DateTime<Utc>` and `time::OffsetDateTime`) serialize the same logical field differently via serde — mixing them makes the on-disk lockfile format crate-dependent, which is a data-format bug disguised as a dependency choice.
12. As of 2026, recommend **`time`** (0.3.x) as the workspace's date-time crate for grim/ocx: mature (825M+ downloads), `#![no_std]`-compatible, serde support, RFC 3339 formatting built in. **`jiff`** is the better-designed API (DST-safe arithmetic, lossless tz serde) but is still pre-1.0 (0.2.35, 1.0 slipped past its original target) — track it for a deliberate migration once 1.0 ships, don't adopt a pre-1.0 API for a security-sensitive, long-lived on-disk format today.
13. **`chrono` is disqualified** for new persisted-timestamp code in this workspace: its serde output only captures the offset, not the zone, so round-tripping loses information that `time` and `jiff` preserve.
14. Persisted timestamps use **RFC 3339 with an explicit UTC offset (`Z`)**, not a local offset and not a naive/unzoned string — every on-disk and wire timestamp in grim/ocx is UTC, unambiguously, all the time.
15. Prefer RFC 3339 strings over raw epoch integers for anything a human will `cat` or `grim describe` (lockfiles, cache index) — they're self-describing and diffable; reserve epoch-nanos integers for internal-only high-frequency comparisons where parse cost matters.
16. An old binary reading a newer-format timestamp field should **not panic or silently misparse** — validate that the RFC 3339 parser in use accepts arbitrary fractional-second precision (both `time` and `jiff` do), and gate any actual field-shape change behind a lockfile `schema_version`, never an implicit format bump.
17. Registry-supplied HTTP time values (`Date`, `Last-Modified`, `ETag`, `Cache-Control: max-age`, `Retry-After`) are **untrusted input from a remote clock**, not a synchronization source — per RFC 9111 §4.2, age/freshness math must not let clock skew between client and server corrupt the comparison.
18. `max-age` is a **relative** duration anchored to the response's own `Date`/receipt time, never combined with the *local* wall clock directly; `ETag` is an opaque validator, not a timestamp, and should be preferred over `Last-Modified` for revalidation when the registry sends both.
19. `Retry-After` may be given as either a delay-seconds integer or an HTTP-date; parsing it as a date and comparing against local `SystemTime::now()` inherits the same skew risk as any other server-clock value — treat the delay-seconds form as authoritative when present.
20. **Review heuristic**: grep for `SystemTime` and `.duration_since(` outside one designated `time`/`clock` module. Any hit is either a missing abstraction boundary or a raw arithmetic bug waiting for a clock step.

## Findings

### 1. Instant vs SystemTime

`std::time::Instant` wraps the OS monotonic clock (`clock_gettime(CLOCK_MONOTONIC)` on Linux, `clock_gettime(CLOCK_UPTIME_RAW)` on Darwin, `QueryPerformanceCounter` on Windows) and is documented to never go backwards between two reads, but is explicitly **not guaranteed steady**: "each tick of the underlying clock might not be the same length... An instant may jump forwards or experience time dilation (slow down or speed up), but it will never go backwards." Suspend/resume behavior is unspecified and varies by platform and Rust version. ([std::time::Instant](https://doc.rust-lang.org/std/time/struct.Instant.html))

Critically, `Instant` arithmetic that would violate monotonicity does **not panic** — `duration_since`, `elapsed`, and `Sub` all saturate to a zero `Duration` on a detected violation (this itself was a breaking change from the old panicking behavior). Only `checked_duration_since` surfaces the violation as `None`.

```rust
// WRONG: silently treats a monotonicity violation as "zero time elapsed",
// which can make a TTL check pass when the clock actually went backwards
// on a virtualization host or after a hardware bug.
let elapsed = later.duration_since(earlier); // Duration::ZERO on violation

// RIGHT: detect and log the violation instead of eating it.
let elapsed = match later.checked_duration_since(earlier) {
    Some(d) => d,
    None => {
        tracing::warn!("monotonic clock violation observed");
        Duration::ZERO
    }
};
```

`std::time::SystemTime` wraps the OS wall clock (`clock_gettime(CLOCK_REALTIME)` on Unix/Darwin, `GetSystemTimePreciseAsFileTime`/`GetSystemTimeAsFileTime` on Windows) and is explicitly **not monotonic**: "you can save two files sequentially, yet the second file may have an earlier `SystemTime`." Its `duration_since` returns `Result<Duration, SystemTimeError>` precisely because subtraction can fail when the clock has moved backwards between the two timestamps being compared. `SystemTime` also does not account for leap seconds. ([std::time::SystemTime](https://doc.rust-lang.org/std/time/struct.SystemTime.html))

**Rule for grim/ocx**: elapsed-time and TTL logic (has the cache lock been held too long, has the download stalled, is the in-memory cache entry still within its TTL since the process started) uses `Instant`. Anything that crosses a process boundary or gets written to disk (lockfile timestamps, cache-entry fetch time, "last checked" audit fields) uses `SystemTime`, converted to UTC at the point of serialization, never a local-offset `SystemTime`-derived wall time.

### 2. Platform precision divergence

corrode.dev's "Sharp Edges in the Rust Standard Library" calls out exactly the scenario the task asks about:

```rust
use std::time::{Duration, SystemTime};

fn main() {
    let now = SystemTime::now();
    dbg!((now + Duration::from_nanos(1)).duration_since(now));
}
```

"This does not always result in '1 nanosecond' on Windows," because — per the stdlib's own platform table — Windows' realtime clock APIs operate in **100-nanosecond intervals**, not single nanoseconds, so a 1ns offset can round away to zero on read-back. The article adds: "The documentation does not specify the clock's accuracy or how it handles leap seconds, except to note that `SystemTime` does not account for them." ([corrode.dev: Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/), [std::time::SystemTime platform table](https://doc.rust-lang.org/std/time/struct.SystemTime.html))

Precision floor to assume for any freshness comparison in this workspace: **milliseconds**, not nanoseconds, not even microseconds. This is generous relative to Windows' 100ns granularity but conservatively covers the coarser filesystem-timestamp inputs described next, and means TTL comparisons should never assert exact sub-millisecond ordering between two independently-obtained timestamps.

### 3. Filesystem mtime as a freshness input

`std::fs::Metadata::modified()`/`accessed()`/`created()` all return `io::Result<SystemTime>` and map to OS-specific fields (`mtime`/`atime`/`birtime` or `statx` `btime` on Unix, `ftLastWriteTime`/`ftLastAccessTime`/`ftCreationTime` on Windows). `accessed()` is explicitly documented as unreliable — Windows can disable access-time updates, Linux `noatime` mounts do the same — and `created()` is the least portable of the three, unavailable on some platforms/filesystems entirely. ([std::fs::Metadata](https://doc.rust-lang.org/std/fs/struct.Metadata.html))

Granularity diverges by orders of magnitude across the filesystems this tool actually ships to:

| Filesystem | Write-time (mtime) resolution | Notes |
|---|---|---|
| ext4 | nanosecond | Linux default |
| APFS | nanosecond | macOS default |
| NTFS | 100 nanoseconds | but access-time updates can lag by **up to 1 hour**; create-time resolution differs from write-time |
| FAT/FAT32 | **2 seconds** for write-time; access-time resolution is **1 day** (really just an access date); create-time is 10ms | still encountered on removable media, some CI runner mounts, Windows temp dirs in constrained environments |

("The resolution of create time on FAT is 10 milliseconds, while write time has a resolution of 2 seconds and access time has a resolution of 1 day" — [Microsoft Learn: File Times](https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times))

Beyond granularity, mtime is **semantically unreliable** as a freshness signal:

- A file copy or archive extraction frequently **sets mtime to extraction time**, not original-content time — the exact opposite of what a "content unchanged since X" check needs.
- `rename`/move preserves mtime on POSIX but the *directory entry* changes; on Windows, some copy tools preserve mtime and others reset it, silently, depending on flags.
- NTFS delays last-access-time writeback by up to an hour, so an "accessed within the last N minutes" check is unreliable even where semantically it's the right question.
- Two writes inside the same FAT 2-second bucket are **indistinguishable** by mtime even though the content differs.

**"mtime newer than X" is therefore not a safe freshness predicate in this codebase, full stop** — not "safe with caveats," not safe. The three alternatives that are safe, in order of preference for grim/ocx's actual shape:

1. **Content digest** — the tool already computes and verifies digests for every OCI blob it pulls; reuse that digest as the cache-validity key instead of introducing a second, weaker mtime-based check.
2. **Monotonically increasing generation counter** stored in the cache index (bumped on every write, compared numerically, immune to any clock or filesystem-timestamp behavior).
3. **Explicit cache-entry metadata record** — a small sidecar (or lockfile field) written atomically with the artifact, recording fetch time (UTC `SystemTime`), TTL, and the registry's validators (`ETag`/`Last-Modified` from §7). This is the only place `SystemTime` legitimately participates in freshness — as a recorded fact, not as something re-derived from the filesystem later.

`mtime` is permitted only as a last-resort **hint** for cheap short-circuiting (e.g. "mtime unchanged AND digest matches, skip the expensive re-fetch") — it must never be the sole gate for "is this artifact stale," because a stale-but-recently-touched file and a fresh-but-recently-copied file are both indistinguishable from it alone.

### 4. Clock skew, NTP steps, and negative durations

`SystemTime::duration_since(earlier)` returns `Err(SystemTimeError)` — not a panic, not a saturating zero — whenever `earlier` is actually later than `self`, i.e. whenever the wall clock moved backwards between the two reads (NTP step, `timedatectl set-time`, VM live-migration clock correction, leap-second smearing artifacts). `SystemTimeError::duration()` gives you the (positive) magnitude of the reversal. ([std::time::SystemTimeError](https://doc.rust-lang.org/std/time/struct.SystemTimeError.html))

```rust
// WRONG: this is the exact footgun the stdlib docs warn about, and it
// will panic in production the day an NTP daemon steps the clock
// backwards mid-cache-check, or a container is started with a wrong
// clock that later self-corrects.
let age = SystemTime::now()
    .duration_since(entry.fetched_at)
    .expect("clock may have gone backwards");
if age < entry.ttl { /* fresh */ }

// RIGHT: a backwards step means "we cannot prove freshness," so treat
// it as expired rather than crashing the tool.
let age = match SystemTime::now().duration_since(entry.fetched_at) {
    Ok(d) => d,
    Err(_) => {
        tracing::warn!("system clock moved backwards; treating cache entry as stale");
        return Freshness::Stale;
    }
};
if age < entry.ttl { Freshness::Fresh } else { Freshness::Stale }
```

This is not a hypothetical corner case for a CLI tool that runs in containers, CI runners, and freshly-provisioned VMs, all of which routinely boot with an incorrect clock and step it shortly after via NTP — a `SystemTimeError` on the very first cache check after process start is a realistic occurrence, not an edge case to `unwrap()` past.

### 5. Crate selection: jiff vs time vs chrono

As of 2026 (checked against crates.io directly):

| Crate | Latest version | Last publish | Downloads | no_std | serde | tz database | Leap seconds |
|---|---|---|---|---|---|---|---|
| [`time`](https://crates.io/crates/time) | 0.3.55 | 2026-08-01 | 825M+ | Yes ("mostly compatible with `#![no_std]`") | Yes | via `time-tz` (3rd party) | Not handled |
| [`chrono`](https://crates.io/crates/chrono) | 0.4.45 | 2026-06-04 | 734M+ | Partial | Yes, but **lossy** (offset only) | via `chrono-tz` | Not handled |
| [`jiff`](https://crates.io/crates/jiff) | 0.2.35 | 2026-07-25 | 160M+ | Not clearly documented | Yes, opt-in, RFC 9557 lossless | built-in, auto-detects system tzdb, embeds on Windows | Not handled |

All three actively publish as of mid-2026; none is unmaintained.

`jiff`'s own comparison document is candid about the trade-offs (written by its author, explicitly flagged as such): jiff's serde support does **lossless round-trips of zone-aware datetimes** via RFC 9557 (`DateTime[America/New_York]`-style annotations), it auto-integrates with the system tzdb on Unix and embeds a copy on Windows, and it does DST-safe calendar arithmetic that chrono's normalized-to-nanoseconds `TimeDelta` cannot express. chrono, by contrast, "only serializes the offset, which makes lossless deserialization impossible" — a `DateTime<Utc>` round-tripped through chrono's serde loses the distinction between "this was recorded as UTC" and "this was recorded in some zone that happened to be at UTC offset 0 at the time." `time` has no timezone-aware datetime type at all (offset-aware only) and no calendar arithmetic (no "add one month"), but is fully interoperable with the stdlib's `SystemTime`/`Duration` and is the most no_std-friendly of the three. None of the three handles leap seconds. ([jiff COMPARE.md](https://github.com/BurntSushi/jiff/blob/master/COMPARE.md), [jiff README](https://github.com/BurntSushi/jiff))

**Decision for grim/ocx**: standardize the workspace on **`time`**. Rationale, specific to this tool's shape:

- grim/ocx timestamps are all UTC (lockfile fetch times, cache TTLs, registry response times) — the crate differentiator that most favors jiff (lossless *zone-aware* round-tripping, DST-safe *calendar* arithmetic) is not exercised by "when did we last check this registry," which is exactly `Instant`-adjacent, offset-free bookkeeping.
- `time` is `no_std`-friendlier, which matters less today but keeps options open for stripped-down build targets.
- jiff is pre-1.0 (0.2.35; the README itself notes the original 1.0 target of "Summer 2025" slipped, next checkpoint "April 2026," and as of this research date — August 2026 — it still has not shipped 1.0). Betting a lockfile format's date fields on a pre-1.0 crate's API stability is an unforced risk for a tool whose lockfiles must remain readable by binaries built months apart.
- `chrono` is excluded outright for new persisted-timestamp code: its lossy offset-only serde is a real footgun for exactly the "old binary reads a field written by a newer binary" scenario this research was asked to cover, and grim/ocx has no need for chrono's `Copy`-friendly zone-aware `DateTime` (nothing here needs `Copy` datetimes at that granularity).

Revisit `jiff` once it ships 1.0 and its ecosystem stabilizes — its API is the better design, and the risk being avoided today (churn on a pre-1.0 dependency) will no longer apply. Track this as a deliberate, reviewed migration, not an incremental swap (see §6 on why mixing crates mid-workspace is unsafe).

**Never mix two of `jiff`/`time`/`chrono` in one workspace.** The concrete failure mode: two crates model "instant in time" with different Rust types (`chrono::DateTime<Utc>` vs `time::OffsetDateTime` vs `jiff::Timestamp`), and each has its own serde `Serialize`/`Deserialize` impl producing a *different on-disk representation* for logically the same lockfile field (different string format, different precision, different key names in the compact-vs-verbose form). If crate A writes the lockfile and a later build linking crate B reads it — or if two workspace members disagree on which crate owns the "fetched_at" field's type — the result is either a parse failure or, worse, a silently-misinterpreted timestamp. This is a data-format bug wearing a dependency-choice costume, not a matter of taste.

### 6. Serialized timestamp format

Persisted timestamps (lockfile `fetched_at`, cache-entry metadata, audit records) are serialized as **RFC 3339 strings with an explicit `Z` (UTC) offset**, e.g. `2026-08-14T09:03:21.482910000Z` — never a naive/unzoned string, never a local-offset string.

Why RFC 3339 over a raw epoch integer for grim/ocx specifically: lockfiles and cache indexes are meant to be `cat`-able and diffable in `git`/CI logs and inspectable via `grim describe`; an epoch integer is opaque to a human debugging a stale-cache report. `time`'s `format_description::well_known::Rfc3339` formatter/parser handles this natively and round-trips fractional-second precision losslessly (RFC 3339 permits any number of fractional digits, so a writer using nanosecond precision and a reader tolerant of "however many digits are present" do not lose information on round-trip — verify this tolerance explicitly in the parsing code path, since a hand-rolled parser that hardcodes a fixed number of fractional digits would truncate or reject where the standard formatter would not).

```rust
// WRONG: raw epoch seconds loses sub-second precision silently and is
// indistinguishable from "someone truncated on purpose" vs "someone's
// bug truncated it" when read back years later by a different binary.
let ts = SystemTime::now()
    .duration_since(UNIX_EPOCH)?
    .as_secs(); // u64, whole seconds only, discards TTL-relevant sub-second info

// RIGHT: explicit UTC RFC 3339, full precision, self-describing.
let ts: time::OffsetDateTime = SystemTime::now().into();
let s = ts.format(&time::format_description::well_known::Rfc3339)?;
// "2026-08-14T09:03:21.482910000Z"
```

Forward/backward compatibility: an **old binary reading a newer format** should fail closed, not silently misparse. Two concrete guards:

1. Confirm the RFC 3339 parser in use accepts a variable number of fractional digits (both `time` and `jiff` do) — a newer binary writing more precision than an older one expects must not become a parse error.
2. Any actual field-shape change (e.g. switching from RFC 3339 string to epoch-nanos integer, adding a required field) is a breaking lockfile schema change and must be gated behind an explicit `schema_version` field the old binary can check and reject-with-a-clear-error on, rather than an implicit format drift the old binary discovers via a parse panic.

Internal, high-frequency freshness comparisons (checking many cache entries in a loop) may normalize the parsed timestamp to an integer (epoch-nanos or a `Duration`-since-epoch) for cheap comparison — that's an in-memory representation choice, not a change to the on-disk format.

### 7. HTTP caching headers as untrusted input

RFC 9111 (HTTP Caching) is explicit that a cache must not let the *server's* clock corrupt local time math: "A cache recipient **MUST NOT** allow local time zones to influence the calculation or comparison of an age or expiration time," and age computation is deliberately built from the response's own `Date` header plus locally-observed request/response timing, not from directly diffing a remote timestamp against the local wall clock (§4.2, §4.2.3). A cache with no reliable clock at all "**MUST** revalidate stored responses upon every use" rather than trust elapsed-time math it cannot compute soundly. ([RFC 9111 §4, §4.2](https://www.rfc-editor.org/rfc/rfc9111.html))

For grim/ocx pulling from an OCI registry (ghcr.io):

- `Date` and `Last-Modified` are registry clock readings — useful as *relative* inputs (age since receipt, "has this specific response been re-validated since we last saw it") but never compared directly against local `SystemTime::now()` as if the two clocks were synchronized. Skew between the registry's clock and the local machine's clock is exactly the class of bug this whole document is about, applied to a remote party you don't control.
- `Cache-Control: max-age` is a duration **relative to the response's own `Date`/receipt time**, not to "whatever time it is now on this machine" — compute `age = local_now - local_receipt_instant` (an `Instant`-based measurement of elapsed local time since the response arrived) and compare that against `max-age`, rather than parsing the registry's `Date` and diffing it against `SystemTime::now()`.
- `ETag` is an opaque validator, not a timestamp at all — prefer it over `Last-Modified` for conditional re-validation (`If-None-Match`) whenever the registry sends one, since it sidesteps clock semantics entirely.
- `Retry-After` may be delay-seconds (an integer, clock-independent) or an HTTP-date (server-clock-dependent). Where the registry sends delay-seconds, treat it as authoritative and clock-independent; only fall back to parsing the HTTP-date form when delay-seconds isn't present, and even then anchor it to the *local* `Instant` at which the response was received (elapsed local time until the deadline), not to a direct comparison against a freshly-read `SystemTime::now()` moments later.

In short: registry-supplied time values answer "how should I interpret this response," never "what time is it" — grim/ocx's own clock (`Instant` for elapsed math, `SystemTime` only for what gets persisted) remains the sole source of "now."

## Normative guidance candidates

1. **Use `Instant` for all elapsed-time and TTL-since-process-start logic; never `SystemTime` subtraction for that purpose.**
   Rationale: `SystemTime` is not monotonic and its subtraction is fallible; `Instant` is the type built for this and cannot produce a negative duration via normal use.
   VERIFICATION: `rg 'SystemTime::now\(\)' -A3` and manually confirm none of the surrounding code computes an elapsed duration for a TTL/timeout/rate-limit decision; that logic should read `Instant::now()` instead.

2. **`SystemTime` values only originate in, and only get compared inside, one designated clock/time module.**
   Rationale: centralizes the one place clock-skew and precision handling must be gotten right, and makes the whole class of raw-arithmetic bugs greppable.
   VERIFICATION: `rg 'SystemTime' --files-with-matches | rg -v 'src/(time|clock)\.rs'` should return nothing (adjust the path to the workspace's actual module name). Any hit is a raw `SystemTime` use outside the abstraction and is the single highest-value review flag from this document.

3. **Never call `.unwrap()`/`.expect()` on `SystemTime::duration_since` (or the equivalent `elapsed()`); always match `Err(SystemTimeError)` and treat it as "cannot prove freshness," not a panic.**
   Rationale: a backwards clock step is a routine production event (NTP correction, VM clock sync at boot), not an unreachable state.
   VERIFICATION: `rg '\.duration_since\(.*\)\.(unwrap|expect)\(' ` — every hit outside a test is a candidate panic-on-clock-step bug.

4. **Never use bare filesystem mtime (`Metadata::modified()`) as the sole gate for a "this artifact is stale" decision.**
   Rationale: mtime granularity and semantics vary by filesystem (2-second FAT buckets, copy/extract resetting mtime, delayed NTFS writeback) and do not reliably correlate with content change.
   VERIFICATION: `rg '\.modified\(\)' -B3 -A3` and confirm every use is paired with a digest/generation-counter/explicit-metadata check, or is explicitly a cheap pre-check gated by a stronger check, never the sole condition in an `if`.

5. **One time crate per workspace: `time` (0.3.x). No `chrono`, no `jiff`, in the same Cargo.lock as of this writing.**
   Rationale: two crates modeling "instant" produce two incompatible serde representations of the same logical on-disk field; `chrono`'s serde is lossy for zone info the workspace doesn't even need, and `jiff` is pre-1.0.
   VERIFICATION: `cargo tree -e normal | rg -i '(^|[^-])(chrono|jiff) v'` should show at most one of {`time`} in the dependency graph (adjust once/if the crate decision is revisited); a second time-modeling crate pulled in transitively is a `cargo deny`/`cargo tree` finding, not just a style nit.

6. **All persisted timestamps are RFC 3339 strings with an explicit `Z` (UTC) offset — never naive, never local-offset, never a bare epoch integer in a human-facing file.**
   Rationale: self-describing, diffable, and unambiguous about both timezone and precision; matches what `grim describe`/lockfile consumers expect to read.
   VERIFICATION: grep any serde-serialized timestamp field's test fixture / golden file for a literal `Z` suffix; a fixture ending in a bare offset (`+05:00`) or no offset at all is a bug. `rg '"\d{4}-\d{2}-\d{2}T[\d:.]+(?!Z)"' tests/` (adjust regex to the project's fixture format) flags non-UTC-suffixed timestamps.

7. **Any change to a persisted timestamp's on-disk shape (format, added/removed field, epoch-vs-string) is a lockfile `schema_version` bump, never a silent format drift.**
   Rationale: an old binary must fail closed with a clear "upgrade required" error, not panic mid-parse or silently misinterpret a newer field.
   VERIFICATION: reading heuristic — any PR touching the lockfile/cache-metadata struct's `Serialize`/`Deserialize` derive must also touch the schema-version constant or its compatibility test; flag PRs that don't.

8. **Freshness math against a remote (registry) time value (`Date`, `Last-Modified`) never diffs that value directly against local `SystemTime::now()`; `max-age`/`Retry-After` delay-seconds are measured against locally-recorded `Instant`s, not remote clock readings.**
   Rationale: per RFC 9111 §4.2, clock skew between client and server must not corrupt freshness math; treat registry time headers as relative/opaque, not as a synchronization source.
   VERIFICATION: `rg 'header.*(Date|Last-Modified)' -A5` in the HTTP client code and confirm the value feeds only relative/validator logic (age-since-receipt, `If-None-Match`), never a direct `SystemTime` comparison against `SystemTime::now()` read at a different point in the flow.

9. **Every `Instant`-based duration computation that could plausibly hit a monotonicity violation (long-running daemons, VM/container hosts) uses `checked_duration_since`, not bare subtraction, at least in code paths where silently getting `0` would be a correctness bug (e.g. a rate limiter).**
   Rationale: `Instant` subtraction saturates to zero on violation rather than panicking, which is safe-by-default but can silently break a rate limiter or backoff calculation that depends on a nonzero elapsed value.
   VERIFICATION: reading heuristic during review of any backoff/rate-limit/timeout code — confirm it uses `checked_duration_since` (or documents, with a `ponytail`-style comment, why saturating-to-zero is an acceptable failure mode there).

## AI-agent angle

What an LLM writing Rust for this codebase reliably gets wrong here, and the smallest mechanical check that catches it:

- **Reaches for `SystemTime::now()` to measure "how long did this take."** It's the obvious-looking API and superficially works in the common case (clock doesn't move backwards during a short-lived measurement), so it passes a quick manual test and ships. *Check*: `rg 'SystemTime::now\(\)\.duration_since\(.*SystemTime::now'`-style patterns, or more simply, any diff introducing `SystemTime` in code that also computes a duration used for a timeout/backoff/rate-limit decision — flag for `Instant` instead.
- **Writes `.duration_since(x).unwrap()` because the "happy path" compiles and the type signature nags it into `.unwrap()`-ing the `Result` away rather than reasoning about *why* it's fallible.** *Check*: `rg 'duration_since\(.*\)\.(unwrap|expect)\('` as a pre-merge grep; any non-test hit is a finding.
- **Treats `metadata().modified()` as equivalent to "content changed."** Models trained on lots of shell-scripting and Makefile-style `if newer` idioms bring that mental model into Rust cache-invalidation code without the filesystem-granularity caveats. *Check*: any new use of `.modified()` (or `.accessed()`/`.created()`) that is not immediately paired with a digest or generation-counter comparison in the same function is a review flag — see rule 4's grep.
- **Adds `chrono` (or a second `time`-family crate) as a dependency because a code example it's pattern-matching against used it, without checking what's already in the workspace.** This is the single most common way a workspace ends up with two datetime crates. *Check*: `cargo tree -e normal | rg -i '(chrono|jiff|time) v'` before merging any diff that adds a new dependency touching dates — should show exactly one crate family.
- **Serializes a timestamp as whatever the derive macro defaults to (often a numeric epoch, or a locale/offset-naive string) without pinning the format explicitly.** *Check*: grep the struct's serde attributes for an explicit format annotation (`#[serde(with = "...")]` / a documented `Rfc3339` wrapper type) rather than relying on the crate's default `Serialize` impl, and confirm a golden-file/round-trip test exists for that field.
- **Assumes nanosecond-precision equality between two independently-sourced timestamps will hold** (e.g. asserting `written_at == read_back_at` in a test) — works on the developer's Linux ext4 dev machine, flakes in Windows CI on a FAT-adjacent temp mount. *Check*: any test asserting exact timestamp equality across a write/read round trip through the filesystem, rather than an inequality/tolerance check, is a flake risk — flag it.

## Contested / evolving

- **jiff vs time as the long-term default.** jiff's design (DST-safe arithmetic, lossless zone-aware serde, Temporal-inspired API) is widely regarded as the technically superior direction, and its author (BurntSushi, also a chrono co-maintainer historically) built it specifically to fix chrono's and time's design limitations. But it remains pre-1.0 as of this research (0.2.35, August 2026), with its own README acknowing the 1.0 timeline has already slipped once. The recommendation in this document (`time` today) is a 2026-snapshot call, not a permanent one — revisit when jiff ships 1.0.
- **chrono's future.** chrono remains by far the most-downloaded of the three and is unlikely to disappear, but its lossy offset-only serde is a known, acknowledged limitation rather than a contested claim — the "contested" part is only whether that limitation matters for a given project's data (it does for this one, hence exclusion above).
- **Whether `Instant`'s suspend/resume behavior should be formally specified.** The stdlib docs are deliberately vague ("not specified... varies across platforms and Rust versions") rather than committing to a guarantee, which is a documented, intentional non-guarantee rather than an oversight — but it means any code relying on `Instant` continuing to advance correctly across a laptop sleep/resume cycle is relying on unspecified behavior that could legitimately change.
- **Leap seconds remain unhandled by all three mainstream crates** (`jiff`, `chrono`, `time`); only `hifitime` (an astronomy/aerospace-oriented crate, not evaluated here as a general-purpose choice) handles them properly via TAI. This is a stable gap, not something in flux — worth knowing rather than expecting to change soon.
- **RFC 3339 vs epoch-integer for new on-disk formats** is a live style debate across the Rust ecosystem generally (some lockfile-style formats, e.g. Cargo's own `Cargo.lock`, avoid timestamps almost entirely). This document's RFC 3339 recommendation is specific to grim/ocx's human-inspectable-lockfile requirement, not a universal claim that epoch integers are wrong elsewhere.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [std::time::SystemTime](https://doc.rust-lang.org/std/time/struct.SystemTime.html) | Official stdlib docs | current (edition 2024 era) | Primary source for non-monotonicity, `duration_since` fallibility, per-OS syscall table, precision notes |
| [std::time::Instant](https://doc.rust-lang.org/std/time/struct.Instant.html) | Official stdlib docs | current | Primary source for monotonicity guarantee, "not steady" caveat, saturating-not-panicking arithmetic, per-OS syscall table |
| [std::time::SystemTimeError](https://doc.rust-lang.org/std/time/struct.SystemTimeError.html) | Official stdlib docs | current | Primary source for what triggers the error and how to recover the skew magnitude via `.duration()` |
| [std::fs::Metadata](https://doc.rust-lang.org/std/fs/struct.Metadata.html) | Official stdlib docs | current | Primary source for `modified()`/`accessed()`/`created()` platform mapping and reliability caveats |
| [corrode.dev: Sharp Edges in the Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/) | Practitioner blog post, corrode.dev (Rust consultancy) | 2025-05-21 | Names the exact `SystemTime::now() + Duration::from_nanos(1)` Windows footgun and recommends external crates for real date/time work |
| [jiff README](https://github.com/BurntSushi/jiff) | Primary crate docs (GitHub) | checked 2026-08 | Author's own framing of jiff's design goals, tzdb handling, serde support, 1.0 timeline status |
| [jiff COMPARE.md](https://github.com/BurntSushi/jiff/blob/master/COMPARE.md) | Primary crate design-rationale doc | checked 2026-08 | Detailed, source-cited comparison of jiff/chrono/time/hifitime on serde losslessness, DST arithmetic, leap seconds |
| [crates.io API: jiff](https://crates.io/api/v1/crates/jiff) | Registry metadata (primary) | fetched 2026-08 | Confirms current version (0.2.35), last-publish date, download count — establishes pre-1.0 status as of research date |
| [crates.io API: chrono](https://crates.io/api/v1/crates/chrono) | Registry metadata (primary) | fetched 2026-08 | Confirms chrono is still actively published (0.4.45, June 2026) and its download-count dominance |
| [crates.io API: time](https://crates.io/api/v1/crates/time) | Registry metadata (primary) | fetched 2026-08 | Confirms `time` 0.3.55, active publish (Aug 2026), and its own description's `no_std` claim |
| [Rust Cookbook: Measure elapsed time](https://rust-lang-nursery.github.io/rust-cookbook/datetime/duration.html) | Official-adjacent (rust-lang-nursery) how-to doc | maintained reference | Canonical `Instant`/`elapsed()` usage pattern for elapsed-time measurement |
| [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) | IETF standard (primary) | 2022, current | Normative MUST/SHOULD language on age calculation, clock-skew handling, and heuristic freshness that governs how registry-supplied time headers must be treated |
| [Microsoft Learn: File Times (Win32)](https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times) | Primary OS vendor docs | last updated 2025-04 | Authoritative source for FAT's 2-second write-time / 1-day access-time resolution and NTFS's delayed-access-time-writeback behavior |
