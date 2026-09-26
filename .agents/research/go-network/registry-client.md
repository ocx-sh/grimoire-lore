---
title: "OCI registry clients: verification, staging, concurrent ingest and store format"
topic: "network/registry-client (GO-NET) — wave 3, revised after wave 2"
agent: go-network/registry-client
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/registry-client/
scope: >
  Covers verify-before-use for downloaded OCI content, OCI digest-string
  parsing, where and how a content-addressed store stages an incoming blob,
  what "concurrent ingest of one digest" must and must not do, on-disk
  format/schema versioning for a store's own metadata, and the credential-
  helper contract a fleet OCI client must honour. Does not cover HTTP
  transport, timeouts, retry/backoff or redirect handling (network/
  http-client-server, GO-NET, a sibling dive) or the generic atomic-write
  and tmp-sweep shape (GO-IO-11/12, go-io.md), which this file takes as
  settled and specializes for content-addressed blobs.
---

## Table of contents

1. [Verify-before-use](#1-verify-before-use)
2. [Digest parsing](#2-digest-parsing)
3. [Staging off the final path](#3-staging-off-the-final-path)
4. [Concurrent ingest of one digest](#4-concurrent-ingest-of-one-digest)
5. [Crash mid-ingest and the startup sweep](#5-crash-mid-ingest-and-the-startup-sweep)
6. [On-disk format versioning](#6-on-disk-format-versioning)
7. [Credential resolution](#7-credential-resolution)
8. [Client library choice](#8-client-library-choice)
9. [Normative guidance candidates](#normative-guidance-candidates)
10. [Verification runs](#verification-runs)
11. [Exemplar evidence](#exemplar-evidence)
12. [AI-agent angle](#ai-agent-angle)
13. [Contested / evolving](#contested--evolving)
14. [Sources](#sources)

## Summary

- Verification is caller discipline, not a library guarantee: `verify.ReadCloser` and `go-digest.Verifier` both only check at `io.EOF`, so a caller that stops draining early gets no error and no verification — never bound a verified copy with anything less than a full `io.Copy`/`io.ReadAll` to EOF.
- Size must be checked exactly, digest must be checked exactly (full string), and neither may ever be checked via prefix or substring comparison — a wrong-size payload can share an 8+ hex-character digest prefix with the real one by construction.
- The OCI digest grammar (`algorithm:encoded`) allows any well-formed-but-unregistered algorithm name to pass with a distinct "unsupported" error, but a *registered* algorithm (`sha256`, `sha512`, `blake3`) MUST reject uppercase hex and any length but the fixed one (64/128/64 hex chars) — `go-digest`'s own anchored regex is lower-case-only.
- `go-digest` (the reference Go digest library) implements only `sha256`/`sha384`/`sha512`; it does **not** implement `blake3` even though image-spec registers it — a client that must verify a blake3 digest needs its own hasher, not this library.
- Stage every incoming blob in a uniquely-named temp file in the store directory, verify size-then-digest, and only then `os.Rename` into `blobs/<alg>/<hex>` — writing directly at the final path (oras-go's `pushFile` shape) lets a concurrent second writer's `os.Create` truncate the same inode a first writer is mid-write on, producing a spliced, corrupted file *at the trusted final path*.
- For a **content-addressed** store, two writers racing to ingest the *same verified digest* need no cross-process lock for correctness: each stages to its own temp file, verifies independently, and `os.Rename` is an atomic full-file replace on POSIX — the loser's rename just re-delivers byte-identical content.
- containerd's own local content store still takes an **in-process, advisory** lock keyed by `Ref` (`plugins/content/local/locks.go`) — but that lock is about serializing *resumable, partial* ingests of one ref inside one daemon, not about cross-process digest safety, which the verify-then-atomic-rename shape already provides.
- A crash (SIGKILL) between "temp file created" and "renamed" must leave the final path absent — verified behaviourally: a naive direct-to-final-path ingest leaves a partial, unverified blob at the trusted path; the staged design never does.
- A store MUST sweep orphaned `*.tmp` files on open (GO-IO-11's rule, specialized here): any `*.tmp` found in a store directory at open time is, by construction, an ingest nobody is actively writing.
- Every on-disk format a Go tool owns — index, lock file, cache metadata, the store's own layout — MUST carry an explicit version marker checked on open, in both directions: OCI's own `oci-layout` file's `imageLayoutVersion` field and containerd's `schemaVersion`/`dbVersion` pair (with an ordered migration table run in `DB.Init`) are the two working precedents; the failure mode this catches is a newer binary's layout being silently misread by an older one, not just the reverse.
- A go vet clean, gosec-clean naive credential resolver that swallows a failed `exec.Command` and returns the zero credential is indistinguishable from "no helper configured" to its caller — the fix is to treat a *configured* helper's failure as a hard error, never as "proceed anonymously."
- All three read exemplar registry-client libraries (go-containerregistry, oras-go, regclient) build credential resolution on the same protocol: a `docker-credential-<suffix>` binary on `PATH`, invoked with `get`, fed the server address on stdin, returning `{ServerURL, Username, Secret}` JSON on stdout — resolved from `config.json`'s `credHelpers` map (per-host) falling back to `credsStore` (global).
- `errcheck`/gosec `G104` catches the "ignored `json.Unmarshal` error" half of a naive credential resolver, but not the "treated exec failure as absent auth" half — that half is a reading heuristic, not a lint.
- The fleet's actual, working answer for verifying a *mirrored Go binary* release (not a registry blob) is `github_asset_digest: true` in `mirror-base.yml` — GitHub's own computed digest, never a registry pull — so this dive's rules bind an OCI registry **client** a fleet CLI/SDK writes, not the existing binary-mirroring pipeline.
- oras-go's own `resolveWritePath` (v3, `content/file/file.go`) already had to add a symlink-escape re-check after its lexical `..`-prevention (GHSA-8xwf-rjm4-xvhv) — path safety and content safety are two different bugs in the same store, and this file only owns the content-safety half (GO-IO-04/05 own the path half).
- oras-go's credential store went from a single `NewStoreWithFallbacks` helper in v2 to a documented `NamespaceMatcher` interface and `Hierarchical` option in the read exemplar (module path now `oras-project/oras-go/v3`), supporting Podman/Buildah-style `containers-auth.json` longest-prefix matching alongside Docker's exact-hostname `config.json` — a fleet client that only special-cases Docker's shape will misresolve credentials against that newer convention.

## Findings

### 1. Verify-before-use

`go-containerregistry`'s `internal/verify.ReadCloser` wraps a blob's `io.ReadCloser` in an `io.TeeReader` into a hasher, optionally `io.LimitReader`-bounded to the expected size, and only compares size-then-digest **inside `Read`'s handling of `io.EOF`** — [`verify.go:52-70,81-99`](https://github.com/google/go-containerregistry/blob/main/internal/verify/verify.go) (read at `google__go-containerregistry@0c8bedb78437:internal/verify/verify.go`). The doc comment states the contract explicitly: "The reader will only be read up to size bytes... If EOF is returned before size bytes are read, an error is returned" — but that error only fires if the caller's `Read` loop reaches that final call.

`opencontainers/go-digest`'s `Verifier` is the same shape, independently implemented: `io.Writer` + `Verified() bool`, and the doc comment says outright "Users instantiate a Verifier... write the data under test to it **then** check the result with the Verified method" ([verifiers.go](https://github.com/opencontainers/go-digest/blob/main/verifiers.go), vendored at `google__go-containerregistry@0c8bedb78437:vendor/.../go-digest/verifiers.go:23-33`). Calling `Verified()` before every byte is written just answers "does the hash of what I've seen so far equal the whole expected digest" — for anything but the complete content, that is `false`, not `true`, so this specific class of bug does not silently claim success; the OCI-side risk is a caller that never calls `Verified()`/never reaches the `io.EOF` branch and proceeds anyway.

`fetcher.go` shows the real call sites: `verify.ReadCloser(resp.Body, size, h)` at [`fetcher.go:348,426`](https://github.com/google/go-containerregistry/blob/main/pkg/v1/remote/fetcher.go) wraps the **live HTTP response body** and hands the wrapped reader straight back to the caller — go-containerregistry does not itself force a full drain; every downstream consumer (a layer-extraction loop, a `crane blob` command, an SDK's own copy-to-disk) must drain to `io.EOF` with `io.Copy`/`io.ReadAll`, never a single fixed-size `Read` or a truncated `io.CopyN`.

Image-spec's own guidance orders the checks: "Before calculating the digest, the size of the content SHOULD be verified to reduce hash collision space. Heavy processing before calculating a hash SHOULD be avoided" ([`descriptor.md`](https://raw.githubusercontent.com/opencontainers/image-spec/main/descriptor.md)) — size first, digest second, matching `verifyReader.Read`'s own order (size check, then hash comparison, both gated on `io.EOF`).

```go
// WRONG — never reaches the EOF branch on a stream longer than 32KiB,
// so "no error" gets treated as "verified."
buf := make([]byte, 32*1024)
n, _ := verifyingReader.Read(buf)
dst.Write(buf[:n])

// RIGHT — drains to io.EOF, where the size+digest check actually runs.
_, err := io.Copy(dst, verifyingReader)
if err != nil { return err }
```

### 2. Digest parsing

The grammar, verbatim from `descriptor.md` ([`opencontainers/image-spec`](https://raw.githubusercontent.com/opencontainers/image-spec/main/descriptor.md)):

```
digest               ::= algorithm ":" encoded
algorithm            ::= algorithm-component (algorithm-separator algorithm-component)*
algorithm-component  ::= [a-z0-9]+
algorithm-separator  ::= [+._-]
encoded              ::= [a-zA-Z0-9=_-]+
```

Registered algorithms and their encoded length: `sha256` (64 lower-hex), `sha512` (128 lower-hex), `blake3` (64 lower-hex, 256-bit output). The spec explicitly asks implementations to be permissive about algorithms they don't recognize but grammatically valid: "Implementations SHOULD allow digests with unrecognized algorithms to pass validation if they comply with the above grammar" — i.e. an unsupported-but-well-formed algorithm is a *different* error than a malformed one, and a strict "reject anything I can't hash" implementation is stricter than the spec asks for (acceptable for a fleet client that will only ever verify, never merely route, digests).

`opencontainers/go-digest`'s own implementation (vendored, read at `google__go-containerregistry@0c8bedb78437:vendor/.../go-digest/{algorithm,digest}.go`) is stricter still and is the reference behaviour a Go client should match: it anchors a per-algorithm regex —

```go
anchoredEncodedRegexps = map[Algorithm]*regexp.Regexp{
    SHA256: regexp.MustCompile(`^[a-f0-9]{64}$`),
    SHA384: regexp.MustCompile(`^[a-f0-9]{96}$`),
    SHA512: regexp.MustCompile(`^[a-f0-9]{128}$`),
}
```
[`algorithm.go:58-62`](https://github.com/opencontainers/go-digest/blob/main/algorithm.go) — lower-case only, exact length, no substring match ever taken. `Algorithm.Validate` checks length *and* the anchored regex; `Digest.Validate` uses a second, looser `DigestRegexpAnchored` (`[a-zA-Z0-9=_-]+` in the encoded part, uppercase allowed) only as the fallback for an algorithm it does **not** recognize, at which point it returns `ErrDigestUnsupported` rather than `ErrDigestInvalidFormat` — [`digest.go:62-117`](https://github.com/opencontainers/go-digest/blob/main/digest.go). **This package does not implement `blake3`** — its `algorithms` map has only `SHA256`/`SHA384`/`SHA512` (`algorithm.go:50-54`) — so a client needing to verify a blake3-digested artifact needs its own `hash.Hash` registered, this library alone is not enough.

```go
// WRONG — the AI-agent mistake: a prefix check accepts uppercase hex,
// wrong lengths, and anything with the right prefix.
func looksLikeDigest(s string) bool {
    return strings.HasPrefix(s, "sha256:") || strings.HasPrefix(s, "sha512:")
}

// RIGHT — exact grammar + exact per-algorithm length + lower-case-only hex.
d, err := digestx.Parse(s) // fixtures/registry-client/digestx/digestx.go
```

### 3. Staging off the final path

oras-go's `content.file.Store.pushFile` writes the incoming blob **directly at the final path**: `os.Create(target)` then a verifying copy, with an explicit failure-path removal comment — "Do not leave content that failed verification, or was only partly written, at the target path, where it looks like a pulled file" — [`file.go:499-518`](https://github.com/oras-project/oras-go/blob/main/content/file/file.go) (`oras-project__oras-go@cb6d6dc79f83:content/file/file.go:499-518`). That comment names the exact risk this rule closes for the *single-writer, single-attempt* case — but it does not close the *concurrent-writer* case: two `pushFile` calls for the same ref both call `os.Create(target)`, and `os.Create` truncates the **same inode** in place rather than creating a new one, so a second writer's open can truncate bytes a first writer's already-open handle is still writing into.

containerd's local content store takes the opposite shape. `writer.Commit` ([`writer.go:79-205`](https://github.com/containerd/containerd/blob/main/plugins/content/local/writer.go), `containerd__containerd@934434dde54b:plugins/content/local/writer.go`) syncs and closes the *ingest* file first, re-hashes if the caller's digest algorithm doesn't match what was being computed, checks size and digest, and only **then** `os.Rename`s from `ingest/<hash(ref)>/data` into the final `blobs/<alg>/<hex>` path (`writer.go:138-158`). If the target already exists it aborts with `errdefs.ErrAlreadyExists` and removes the now-redundant ingest directory (`writer.go:148-154`) — treating "already there" as a terminal, non-error-worthy outcome for the caller (most callers of `Ingester.Writer`/`Commit` in this codebase check for and swallow `ErrAlreadyExists`), not as a collision to resolve by overwriting. The store's own doc comment on `Writer` states the general contract: "`Commit` commits the blob (but no roll-back is guaranteed on an error)... `Commit` always closes the writer, even on error. `ErrAlreadyExists` aborts the writer" — [`content.go:146-159`](https://github.com/containerd/containerd/blob/main/core/content/content.go).

```go
// WRONG (oras-go's own shape, single-writer only) — os.Create truncates
// the target's inode in place; a second concurrent writer to the same
// path corrupts whichever writer is mid-Write.
f, _ := os.Create(target)
f.Write(part1)
// ... another goroutine/process os.Create()s the same target here ...
f.Write(part2) // lands on top of whatever the other writer left

// RIGHT — stage in a uniquely-named temp file, verify, then rename.
tmp, _ := os.CreateTemp(dir, ".ingest-*.tmp")
tmp.Write(content); tmp.Sync(); tmp.Close()
if verifiedOK(tmp.Name()) { os.Rename(tmp.Name(), target) } else { os.Remove(tmp.Name()) }
```

### 4. Concurrent ingest of one digest

The decisive property a **content-addressed** store gets for free that a mutable ref-store (containerd's ingest-by-ref) does not: once content is verified, two independently-staged, independently-verified temp files for the *same digest* are byte-identical by definition. `os.Rename` on Linux is an atomic full-file replace of the target directory entry — there is no observable intermediate state where the target is half-old/half-new, and whichever rename lands second simply re-delivers the same bytes. **No cross-process lock is required for correctness** in this case; a lock (containerd's in-process, `Ref`-keyed advisory lock, [`locks.go:32-55`](https://github.com/containerd/containerd/blob/main/plugins/content/local/locks.go)) exists to serialize **resumable partial writes to one ref inside one daemon** (so two callers don't both `Write` into the same in-progress ingest file), not to prevent digest-safety races — that lock is scoped to `store.locks map[string]*lock` guarded by a plain `sync.Mutex`, entirely in-process; it says nothing about a second *process* racing the same store directory.

The staged shape's correctness under concurrency was watched directly (see [Verification runs](#verification-runs), `concurrent-ingest`): two goroutines writing the *same* target through `NaiveWriteInPlace` (oras-go's shape) produced a deterministic, reproducible splice — 2048 bytes matching neither writer's content — while the identical race through `SafeStagedWrite` always left the target as one writer's complete, unmodified, byte-for-byte content, with zero leftover temp files.

### 5. Crash mid-ingest and the startup sweep

This specializes GO-IO-11/12 (`go-io.md`) for a content-addressed blob store. A SIGKILL between "temp file opened and partially written" and "renamed into the final path" must never leave anything observable at the final path — the store's readers have no way to distinguish a half-written blob from a real one except by its digest, and a caller that skips re-verification on read (reasonable, since ingest is supposed to have already verified it) would trust it. Watched directly (`fixtures/registry-client/sigkill-sweep/`): the naive direct-to-final-path shape leaves `"PARTIAL-UNVERIFIED-CONTENT"` sitting at the final path after a SIGKILL; the staged shape leaves the final path absent and an orphaned `*.tmp` in the store directory, which a startup sweep (`filepath.Glob(dir/*.tmp)` + `os.Remove`) then clears — matching GO-IO-11's rationale verbatim ("An orphaned `*.tmp` is the only crash residue; a store sweeps these on open").

### 6. On-disk format versioning

Two independent, working precedents settle M-G-15, previously unanswered by wave 2:

1. **The OCI image-layout spec itself carries a version marker.** The `oci-layout` file at the root of an OCI image layout directory is a JSON object with one required field, `imageLayoutVersion`, whose value "will align with the OCI Image Specification version at the time changes to the layout are made, and will pin a given version until changes to the image layout are required" ([`image-layout.md`](https://raw.githubusercontent.com/opencontainers/image-spec/main/image-layout.md)). This is the spec's own answer to "how does a reader know it understands this on-disk layout" for exactly the kind of directory a Go OCI client reads and writes.
2. **containerd's metadata store versions its schema and migrates forward.** `schemaVersion = "v1"` (a bucket namespace) and `dbVersion = 4` (an in-schema counter) are constants read on every open; `DB.Init` walks a `migrations` table in reverse to find the highest version already on disk, runs every migration strictly newer than that version in order, and only then writes the current `dbVersion` back — [`db.go:43-54,155-230`](https://github.com/containerd/containerd/blob/main/core/metadata/db.go) (`containerd__containerd@934434dde54b:core/metadata/db.go`). Nothing in this path ever silently reinterprets an unrecognized version as the current one.

The failure mode this rule exists to catch runs in the direction both a naive AI-agent implementation and a first release of a hand-rolled format tend to miss: not "can I read an *older* store" (the obvious migration case everyone plans for) but "what happens when *this* binary opens a store a **newer** version of the same tool wrote" — a downgrade, a rollback, two fleet machines on different tool versions sharing a store path. Watched directly (`fixtures/registry-client/layout-version/`): a naive opener that never checks a version marker silently "opens OK" on a store written by a newer, incompatible layout version; a versioned opener that checks both directions refuses it with a clear, actionable error.

### 7. Credential resolution

All three read registry-client libraries build on the same external contract — the docker credential-helpers protocol: a `docker-credential-<suffix>` binary discovered on `PATH`, invoked as `docker-credential-<suffix> get` with the server address written to stdin, returning `{"ServerURL":...,"Username":...,"Secret":...}` JSON on stdout ([`docker/docker-credential-helpers`](https://github.com/docker/docker-credential-helpers)).

- **oras-go** (`registry/remote/credentials`, read at `cb6d6dc79f83`, module path now `oras-project/oras-go/v3`): `configfile.Config` parses `config.json`'s `credHelpers` map (per-host) and `credsStore` string (global fallback) — field names confirmed at [`configfile.go:36-39`](https://github.com/oras-project/oras-go/blob/main/registry/remote/internal/configfile/configfile.go). `DynamicStore.getHelperSuffix` resolves in the documented order: server-specific `credHelpers` entry, then `credsStore`, then a detected platform default (`wincred`/`osxkeychain`/`pass`-or-`secretservice`) — [`store.go:233-246`](https://github.com/oras-project/oras-go/blob/main/registry/remote/credentials/store.go). `NewStoreWithFallbacks(primary, fallbacks...)` chains stores, returning the first non-empty credential ([`store.go:280-309`](https://github.com/oras-project/oras-go/blob/main/registry/remote/credentials/store.go)). The read exemplar has grown a `NamespaceMatcher` interface and a `Hierarchical` `StoreOptions` field since the v2 API the brief cited, adding longest-prefix namespace matching compatible with Podman/Buildah's `containers-auth.json` alongside Docker's exact-hostname `config.json` — a client hard-coding exact-match assumptions will misresolve against that newer convention.
- **go-containerregistry** (`pkg/authn`, read at `0c8bedb78437`): `DefaultKeychain` interprets the docker config file directly; `NewKeychainFromHelper(h Helper)` wraps the *same* upstream `docker-credential-helpers` `Helper` interface by name in its own doc comment ([`keychain.go:60-61,198-206`](https://github.com/google/go-containerregistry/blob/main/pkg/authn/keychain.go)) — a third, independent implementation of the identical protocol.
- **regclient** (`config/docker.go`, read at `43d2acb9fafd`): `DockerLoad`/`dockerParse` read the same `credsStore`/`credHelpers` JSON fields (`json:"credsStore,omitempty"`, `json:"credHelpers,omitempty"`, [`docker.go:49-50`](https://github.com/regclient/regclient/blob/main/config/docker.go)) and construct a helper binary name with a `dockerHelperPre` (`docker-credential-`) prefix. Its README also advertises "Automatically import logins from the docker CLI" ([README](https://raw.githubusercontent.com/regclient/regclient/main/README.md)).

The AI-agent-shaped failure mode here is not protocol ignorance (three libraries independently converge on the same shape) but **error-swallowing**: a resolver that returns the zero `Credential` both when no helper is configured *and* when a configured helper's `exec.Command` fails is unable to tell "this host is intentionally anonymous" from "the credential helper is broken/missing," and a caller silently proceeds unauthenticated in the second case. Watched directly (`fixtures/registry-client/credhelper/`): `errcheck`/gosec `G104` catch the *unrelated* ignored-`json.Unmarshal`-error half of the naive implementation, but neither flags the swallowed-`exec`-error half — that is a semantic decision no analyzer can make for you.

### 8. Client library choice

Direct dependence on `google/go-containerregistry` was measured at 6/35 exemplars (`go-audit/exemplar-modules-and-release.md` §2, cited by the map at M-H-10). No exemplar in this corpus depends on `oras-project/oras-go` or `regclient/regclient` as a direct import (both appear only as the repos *implementing* those tools). The fleet's own existing OCI-adjacent pipeline — `mirror-bazelbuild/mirror-base.yml:22-24`'s `verify: {github_asset_digest: true}` — verifies a **mirrored release binary** via GitHub's own computed asset digest, not by pulling and digest-checking an OCI blob; it is a different mechanism for a different artifact (a GitHub release asset, not a registry blob) and does not decide what a Go OCI *registry* client should build on ([go-audit/config-inventory.md §5](../go-audit/config-inventory.md)). Given the SDK's stdlib-only runtime commitment (owner Q2) and the fact that none of `go-containerregistry`/`oras-go`/`regclient` is a wrap-only-CLI concern (there is no `ocx`-analogue OCI CLI wrapped here — this is genuinely new client code), a fleet Go OCI client wraps `google/go-containerregistry`'s narrower, more stable `pkg/v1/remote` + `pkg/authn` + `internal/verify`-equivalent surface for pull/push, rather than oras-go's broader (and, per §7, currently v2→v3-migrating) content-store abstraction or regclient's retry-internals-with-known-gaps (§11's `Retry-After` delay-seconds-only parsing, owned by the sibling `http-client-server` dive) — and implements its own store staging/versioning per §§3-6 above rather than adopting any of the three libraries' store code wholesale.

## Normative guidance candidates

1. **GO-NET-01 (MUST) — Never treat a partial read as verified; drain every content stream to `io.EOF` before trusting it.**
   *Rationale:* `verify.ReadCloser`/`go-digest.Verifier` both gate their check on `io.EOF`; a caller using a fixed-size `Read` or a capped `io.CopyN` never reaches it and gets neither an error nor a verification.
   *Verify:* reading heuristic — no analyzer distinguishes "drains to EOF" from "reads a prefix." `grep -rn --include='*.go' -e '\.Read(buf' -e 'io\.CopyN(' . | xargs -r echo` flags candidate call sites for review against the surrounding verify-wrapper's contract; empty output means no obvious short-read pattern to review (not proof of correctness).
   *Watched red:* yes — `fixtures/registry-client/verify/`, `TestNaiveIngest_IsTheViolation_AcceptsShortRead`.

2. **GO-NET-02 (MUST) — Compare size and digest by exact value, never by prefix or substring.**
   *Rationale:* a wrong-size payload can be constructed to share an arbitrary-length digest prefix with the expected value; only full-length comparison is safe.
   *Verify:* reading heuristic — `grep -rn --include='*.go' -e 'HasPrefix(' -e 'strings\.Contains(' . | xargs -r grep -l -i digest` finds candidates; empty output means no digest comparison uses a substring helper (not proof every comparison is length-checked too).
   *Watched red:* yes — `fixtures/registry-client/verify/`, `TestNaivePrefixCompare_IsTheViolation_AcceptsWrongSize`.

3. **GO-NET-03 (MUST) — Validate a digest string against the full OCI grammar and the algorithm's exact encoded length and case before using it; a well-formed-but-unimplemented algorithm is a distinct error from a malformed one.**
   *Rationale:* `descriptor.md`'s grammar is permissive about unknown algorithms but strict about the encoded charset per algorithm; a `strings.HasPrefix("sha256:")`-style check accepts uppercase hex and wrong lengths.
   *Verify:* `go test ./fixtures/registry-client/digestx/...` — the same table of malformed inputs run through both `Parse` (must reject every case) and `NaiveAccepts` (documents which ones a prefix check wrongly lets through). Empty diff between "malformed inputs" and "inputs `Parse` rejects" is the pass condition.
   *Watched red:* yes — `fixtures/registry-client/digestx/`, `TestNaiveAccepts_IsTheViolation` (6/9 malformed inputs wrongly accepted by the naive check).

4. **GO-NET-04 (MUST) — Stage an incoming content-addressed blob in a uniquely-named temp file in the store directory; verify size-then-digest; rename into `blobs/<alg>/<hex>` only after verification succeeds. Never `os.Create`/`os.OpenFile(O_TRUNC)` directly at the final path.**
   *Rationale:* `os.Create` truncates the existing inode in place rather than allocating a new one; a second writer to the same final path corrupts a first writer's in-flight content, and a crash mid-write leaves a partial or unverified blob at a path callers trust.
   *Verify:* reading heuristic (same shape as GO-IO-11's) scoped to a store's blob-write path — `grep -rn --include='*.go' -e 'os\.Create(' -e 'O_TRUNC' . | xargs -r echo`, then classify each hit as "writes a content-addressed blob at its final path" (violation) or something else (config write, log file — exempt). Empty output means no candidate to classify, not that every blob write is staged.
   *Watched red:* yes — `fixtures/registry-client/concurrent-ingest/`, `TestNaiveWriteInPlace_IsTheViolation_ExposesASplice`; `fixtures/registry-client/sigkill-sweep/run-violation.sh`.

5. **GO-NET-05 (SHOULD) — A content-addressed store needs no cross-process lock to serialize concurrent ingest of the same digest, provided every writer independently stages-verifies-renames (GO-NET-04); a lock is only needed to avoid two writers *sharing* one in-progress temp/ingest file (a mutable-ref concern, not a digest-safety one).**
   *Rationale:* verified-identical content renamed atomically by two independent writers is safe by construction (`os.Rename` is an atomic full-file replace on POSIX); containerd's own `Ref`-keyed lock (`plugins/content/local/locks.go`) exists for resumable single-ref writes inside one daemon, not for this property.
   *Verify:* behavioural fixture only; no static check distinguishes "needs a lock" from "doesn't," since it depends on whether staging (GO-NET-04) is already in place.
   *Watched red:* yes — `fixtures/registry-client/concurrent-ingest/`, `TestSafeStagedWrite_NeverExposesASplice` (green with no lock at all) against `TestNaiveWriteInPlace_IsTheViolation_ExposesASplice` (red, also with no lock — the lock was never the fix; staging was).

6. **GO-NET-06 (MUST) — On startup, sweep every `*.tmp` in a store directory before serving reads; on ingest, never rename a partially-verified temp file.**
   *Rationale:* specializes GO-IO-11/12's atomic-write sweep for a blob store: an orphaned `*.tmp` after a crash is the only residue, and a store that never sweeps it accumulates dead files (or, worse, a badly-written sweep that matches too broadly could remove a live ingest's temp file mid-write — scope the glob to files this store's own naming scheme produces).
   *Verify:* behavioural fixture (crash timing).
   *Watched red:* yes — `fixtures/registry-client/sigkill-sweep/run.sh` (staged design: 0 leftover `*.tmp` and no final blob after SIGKILL+sweep) against `run-violation.sh` (naive design: partial blob left at the final path).

7. **GO-NET-07 (MUST) — Every on-disk format a Go tool owns (index, lock file, cache metadata, a content store's own layout) carries an explicit version marker (a magic/schema field, checked on open) — refuse a **newer** version explicitly, not just an older one.**
   *Rationale:* the OCI `oci-layout` file's `imageLayoutVersion` and containerd's `schemaVersion`/`dbVersion`-plus-migration-table are two independent, working precedents; the miss an AI agent (and a first release) makes is planning only for "read an older format," not "refuse a format this binary is too old to understand."
   *Verify:* reading heuristic — for each on-disk format the codebase owns, confirm a version/magic field exists and that its opener has a branch for "found version > supported version," not only "< supported."
   *Watched red:* yes — `fixtures/registry-client/layout-version/run.sh` (naive opener silently "opens OK" on a newer-version store; versioned opener refuses it with an actionable error).

8. **GO-NET-08 (MUST) — Resolve registry credentials through `config.json`'s `credHelpers`/`credsStore` and the `docker-credential-<suffix> get` protocol; treat a *configured* helper's failure (missing binary, non-zero exit, unparseable output) as a hard error, never as "no credentials, proceed anonymously."**
   *Rationale:* three independent libraries (go-containerregistry, oras-go, regclient) converge on the same external protocol; the fleet-shaped bug is error-swallowing, which makes a broken credential helper indistinguishable from an intentionally anonymous host.
   *Verify:* `errcheck`/gosec `G104` catch an ignored `json.Unmarshal` error on the helper's stdout (partial coverage — config: `golangci-lint run --enable-only=errcheck,gosec ./...`); the "exec failure treated as absent auth" half has no analyzer and is a reading heuristic: read every `Store.Get`/credential-resolution function for a code path where `err != nil` from `exec.Command`/`cmd.Run`/`cmd.Output` returns the zero credential with a nil error.
   *Watched red:* yes (partially by lint, fully by test) — `fixtures/registry-client/credhelper/`: `TestNaiveResolve_IsTheViolation_LooksAnonymousWhenHelperMissing` plus `golangci-lint run --enable-only=errcheck,gosec` flagging the unrelated ignored-unmarshal-error line.

9. **GO-NET-09 (SHOULD) — A fleet Go OCI client wraps `google/go-containerregistry`'s `pkg/v1/remote` + `pkg/authn` for pull/push and credential resolution, and implements its own store staging (GO-NET-04/05/06) and format versioning (GO-NET-07) rather than adopting oras-go's or regclient's store/retry internals wholesale.**
   *Rationale:* no exemplar directly depends on oras-go or regclient; go-containerregistry's surface is narrower and its verify/authn internals were the ones read and matched across all three libraries anyway; oras-go's own credential-store API is still evolving (v2→v3 module path change observed mid-corpus) and regclient's retry-header parsing has a known gap (`network/http-client-server`'s scope, not this file's).
   *Verify:* not independently checkable; a design decision recorded for the SDK/CLI's `go.mod` review, not a lint.
   *Watched red:* no — a library-choice decision, not a behavioural property.

10. **GO-NET-10 (SHOULD) — A client that must verify a `blake3`-digested artifact registers its own hasher; do not assume `opencontainers/go-digest` supports every algorithm image-spec registers.**
    *Rationale:* `go-digest`'s `algorithms` map (`algorithm.go:50-54`) has only `SHA256`/`SHA384`/`SHA512`; `blake3` is spec-registered but not implemented by the reference library a Go client is most likely to import.
    *Verify:* reading heuristic — `grep -rn --include='*.go' -e 'blake3' . | xargs -r echo` at any call site claiming go-digest handles it; empty output means no such claim was found (not proof blake3 support exists elsewhere).
    *Watched red:* no — confirmed by reading `go-digest`'s source directly (`algorithm.go`), not by a planted fixture; there is no local blake3-digest exemplar to construct a violation against.

## Verification runs

All commands below are `cd`ed into the named fixture directory first; every one was run via `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`).

| Fixture | Command | Violation exit | Twin exit | Relevant output |
|---|---|---|---|---|
| `digestx/` | `go test ./... -v` | n/a (single binary asserts both) | 0 | `TestParse_RejectsEveryMalformedInput`: PASS on all 9 cases. `TestNaiveAccepts_IsTheViolation`: PASS, logging 6/9 malformed inputs wrongly accepted by the prefix check (uppercase hex, wrong length ×2, no-op empty encoded, non-hex). |
| `verify/` | `go test ./... -v` | n/a | 0 | `TestSafeIngest_RejectsShortRead` / `...WrongSizeMatchingDigestPrefix`: PASS, both wrap `ErrVerification`. `TestNaiveIngest_IsTheViolation_AcceptsShortRead`: PASS, logs "wrote 100 unverified bytes to dst with no error". `TestNaivePrefixCompare_IsTheViolation_AcceptsWrongSize`: PASS, logs "accepted 2048 bytes (wanted size 4096) on an 8-char digest-prefix match". |
| `concurrent-ingest/` | `go test ./... -v -count=1` | n/a | 0 | `TestSafeStagedWrite_NeverExposesASplice`: PASS, final content is exactly one writer's 2048 bytes, 0 leftover `.ingest-*.tmp`. `TestNaiveWriteInPlace_IsTheViolation_ExposesASplice`: PASS, logged final content is a ~1900-byte run of `B` followed by a run of `A` — 2048 bytes matching **neither** writer's clean content (reproduced deterministically via channel-forced interleaving, not a flaky race). |
| `sigkill-sweep/run.sh` | `bash run.sh` | — | 0 | `OK: no blob at the final path after the SIGKILL`; `orphaned *.tmp before sweep: 1`; `swept: blob-<n>.tmp`; `orphaned *.tmp after sweep: 0`. |
| `sigkill-sweep/run-violation.sh` | `bash run-violation.sh` | 0 (violation reproduces) | — | `VIOLATION reproduced: partial blob at final path: PARTIAL-UNVERIFIED-CONTENT`. |
| `layout-version/run.sh` | `bash run.sh` | — | 0 | `open-safe` on a version-3 store: `REJECTED: store layout version 3 is newer than this binary supports (2); upgrade to open it` (exit 1, expected). `open-naive` on the same store: `opened OK (no version check)` — violation reproduced. `open-safe` on a matching version-2 store: `opened OK` (twin passes). |
| `credhelper/` | `go test ./... -v` | n/a | 0 | `TestSafeResolve_UsesConfiguredHelper` / `...FailsLoudlyWhenHelperMissing`: PASS. `TestNaiveResolve_IsTheViolation_LooksAnonymousWhenHelperMissing`: PASS, logs the zero-Credential ambiguity. |
| `credhelper/` (lint) | `golangci-lint run --no-config --enable-only=errcheck,gosec ./...` | 7 issues (gosec), 4 issues (errcheck) | n/a | Both flag `resolve.go:98` (`json.Unmarshal(out, &cred)` unchecked) — the *unrelated* half of the naive resolver's bug. Neither flags the swallowed `exec.Command`/`cmd.Output` error that actually causes the ambiguity (`resolve.go:88-90`) — confirms that half is a reading heuristic, not a lint catch. |
| all six fixture dirs | `go vet ./...` | — | 0 (every dir) | Empty output in every directory — confirms every violation planted above is a semantic/logic bug invisible to `go vet`, consistent with each rule's "reading heuristic" verification cell. |

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| GO-NET-01/02 | `google/go-containerregistry@0c8bedb78437:internal/verify/verify.go:52-70` implements the size-then-digest-at-EOF shape correctly, called from `pkg/v1/remote/fetcher.go:348,426` on every blob GET. | `oras-project/oras-go@cb6d6dc79f83:content/file/file.go:490` (`saveFile`) drives its own `ioutil.CopyBuffer` to completion internally, so it does not exhibit the short-read gap itself — the gap is in any *caller* of a bare `verify.ReadCloser`/`Verifier` that doesn't fully drain it, which this corpus's libraries don't do wrong, but nothing stops a fleet client from doing so. |
| GO-NET-03 | `opencontainers/go-digest`'s `algorithm.go`/`digest.go` (vendored in `google__go-containerregistry@0c8bedb78437:vendor/...`) implement the full grammar + exact-length + lower-case-only check. | No exemplar in this corpus implements a *naive* prefix-based digest check — the violation here is a hypothetical AI-agent mistake, not a measured exemplar defect; confirmed by absence rather than presence. |
| GO-NET-04/05 | `containerd/containerd@934434dde54b:plugins/content/local/writer.go:79-158` stages in `ingest/<hash(ref)>/data`, verifies, then renames, treating collision as `ErrAlreadyExists` rather than overwrite. | `oras-project/oras-go@cb6d6dc79f83:content/file/file.go:499-518` writes directly at the target path — the exemplar this rule is written against, not a hypothetical. |
| GO-NET-06 | `containerd/containerd@934434dde54b:plugins/content/local/store.go:654-679` (`ingestRoot`/`ensureIngestRoot`) scopes all in-flight ingests under one `ingest/` subdirectory, a natural sweep target, though the read source does not show a *startup* sweep call site in the local store package itself — GO-IO-11's own audit ([go-io.md](../go-io.md) §"Watched red") already established the general sweep-on-open pattern from `[fa]`'s behavioural fixtures; this file specializes it, it does not re-derive it from a new exemplar. | — |
| GO-NET-07 | `containerd/containerd@934434dde54b:core/metadata/db.go:43-54,155-230` (`schemaVersion`, `dbVersion`, `DB.Init`'s migration walk); `opencontainers/image-spec`'s `oci-layout`/`imageLayoutVersion` (normative, not an exemplar). | No exemplar library in this corpus's registry-client set (`go-containerregistry`, `oras-go`, `regclient`) was found, on a targeted read, to write its *own* additional on-disk format with a version marker beyond the OCI-defined ones it already consumes — each treats the OCI layout's own versioning as sufficient for its own concerns. This is a gap worth flagging to a future dive, not a contradiction. |
| GO-NET-08 | `google/go-containerregistry@0c8bedb78437:pkg/authn/keychain.go:60-61,198-206`; `oras-project/oras-go@cb6d6dc79f83:registry/remote/credentials/store.go:233-337`; `regclient/regclient@43d2acb9fafd:config/docker.go:49-50` — three independent, converging implementations of the same protocol. | None of the three swallows a configured helper's failure the way this rule's planted violation does; the AI-agent mistake is not measured in this corpus, consistent with it being a common *generation-time* mistake rather than a pattern that survives review in a library people actually use. |
| GO-NET-09 | `go-audit/exemplar-modules-and-release.md` §2: 6/35 exemplars depend directly on `go-containerregistry`; 0 on `oras-go`/`regclient` as a dependency (both appear only as the tool being built). | — |

## AI-agent angle

- **Treating "no error from `Read`" as "verified."** The single most likely mistake: an LLM asked to "download and verify a blob" writes a `Read`-loop that stops at the first short read (a common enough shape when copying from a `net/http` response body that a proxy can truncate) and never notices the verification never ran. **Smallest check:** read the function's `Read`/`io.CopyN` calls; if the loop can exit before an `io.EOF`, the verification never fires — a code-review-time reading heuristic, not a lint (confirmed: `go vet` is silent on both the naive and safe implementations in `fixtures/registry-client/verify/`).
- **`golang/mock`, `github.com/pkg/errors`, `io/ioutil` in a hand-written registry client.** None of these appeared in the registry-client-specific code paths read for this dive, but they remain the general-purpose AI-agent tells this program's other consolidations already own ([go-frame.md](../go-frame.md) H1); a registry client is not a special case for them.
- **Assuming `opencontainers/go-digest` supports every image-spec-registered algorithm.** An LLM that reads `descriptor.md`'s "registered algorithms" table and then imports `go-digest` expecting `blake3` support will compile clean and panic or silently mis-hash at runtime — `go-digest`'s `Algorithm.Hash()` panics on an unavailable algorithm rather than erroring (`algorithm.go:118-136`). **Smallest check:** `grep -rn --include='*.go' -e 'blake3' . | xargs -r echo` at any call site that also imports `github.com/opencontainers/go-digest` without a custom `crypto.RegisterHash`.
- **Hallucinating a `verify.Reader`/`digest.Verifier` API that auto-checks on every `Write`/`Read` call, not just at EOF.** Both real APIs are documented to check only once, at completion; an agent that "remembers" a streaming API that raises immediately on a mismatch will write code that is correct against its own mental model but silently wrong against the real library — this is exactly the shape of bug a compile-clean, `go vet`-clean, even test-passing (if the test also only checks a full stream) program hides. **Smallest check:** read the actual verify/digest package's doc comment before trusting any assumption about *when* a check fires, not just *whether* one exists.
- **Reaching for a cross-process file lock (flock/LockFileEx) to "fix" concurrent ingest, per M-G-16's general file-locking guidance, when the real fix is staging.** An agent that recognizes "concurrent writers, same file" as a locking problem and adds a `flock` around the *existing* direct-to-final-path write pattern still leaves the underlying bug (a crash between lock-acquire and write-complete still corrupts the target) while adding real complexity (GO-IO-19's GOOS split) that GO-NET-05 shows is unnecessary once staging is in place. **Smallest check:** if a PR adds a lock around a content-addressed write path, first ask whether GO-NET-04's staging shape alone already makes the lock unnecessary.
- **Copy-pasting `os.Create(target)` from a tutorial (oras-go's own README examples use this shape) into new store code without noticing it is documented, in the source, as single-writer-safe only.** The doc comment at `file.go:510-511` ("Do not leave content that failed verification... at the target path") reads like a completeness statement but is scoped to the single-attempt failure case; nothing in the public README calls out the concurrent-writer gap. **Smallest check:** any `os.Create`/`os.OpenFile(..., O_TRUNC, ...)` on a path derived from a content digest or external ref is a candidate for GO-NET-04's reading heuristic, regardless of which tutorial it was copied from.
- **Trusting `credentialHelper.Get()` returning `(Credential{}, nil)` as "definitely no auth needed here."** An LLM writing the happy path first, then a `defer`/error-handling pass second, commonly collapses "helper not configured" and "helper failed" into the same return shape, because that's the shape `err == nil` naturally produces once the exec error is (accidentally or deliberately) swallowed. **Smallest check:** `golangci-lint run --enable-only=errcheck,gosec` catches an *adjacent* ignored-JSON-error mistake in the same function about half the time (confirmed on this dive's own fixture), which is a useful trigger to go read the function by hand — but it will not catch the swallowed-`exec`-error mistake itself.

## Contested / evolving

- **oras-go's credential-store API is mid-migration.** The exemplar read at `cb6d6dc79f83` already ships a `NamespaceMatcher` interface and `Hierarchical` matching for `containers-auth.json` compatibility, and its module path has moved to `oras-project/oras-go/v3` — later than the `v2` API surface (`credentials.NewStoreWithFallbacks`) the original wave-2/3 brief named. As of 2026-09-26 this is a library still actively broadening its credential-resolution contract; a fleet client pinning to this library's credential package should expect another shape change before it stabilizes, and should not assume Docker's exact-hostname `config.json` is the only convention it needs to support going forward.
- **Whether GO-NET-05's "no lock needed" claim generalizes past this fixture's two-writer case.** The argument (verified content + atomic rename ⇒ safe) holds for exactly-two, exactly-matching-digest writers. It has not been checked against N-way fan-in under real process-level (not goroutine-level) concurrency, or against a filesystem where `rename(2)` is not atomic across the store's directory (e.g. a network filesystem) — GO-IO-11's own atomic-write rule already scopes itself to same-filesystem renames (`oras-project/oras-go@cb6d6dc79f83:content/file/file.go:713-714`'s cross-filesystem-rename failure is the reason that rule exists at all), and that scoping applies here unchanged.
- **containerd's own local content store has no on-disk *layout* version of its own beyond the metadata boltdb's schema/db version** — the blob-store directory shape (`blobs/<alg>/<hex>`, `ingest/<hash>/`) is not itself versioned; only the surrounding metadata database is. Whether a future containerd release would need to version the blob-store layout independently of the metadata schema is not settled in the read source, and this dive found no exemplar answering it either way.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [opencontainers/image-spec `descriptor.md`](https://raw.githubusercontent.com/opencontainers/image-spec/main/descriptor.md) | Primary spec | Fetched 2026-09-26, current `main` | The digest grammar, registered algorithms, and the size-then-digest verification order — the normative basis for §§1-2. |
| [opencontainers/image-spec `image-layout.md`](https://raw.githubusercontent.com/opencontainers/image-spec/main/image-layout.md) | Primary spec | Fetched 2026-09-26, current `main` | `oci-layout`'s `imageLayoutVersion` field — the spec's own on-disk-format-versioning precedent for §6/GO-NET-07. |
| [opencontainers/distribution-spec `spec.md`](https://raw.githubusercontent.com/opencontainers/distribution-spec/main/spec.md) | Primary spec | Fetched 2026-09-26, current `main` | `Docker-Content-Digest` header semantics and client-side verification language for pulled blobs/manifests. |
| [opencontainers/go-digest, `algorithm.go`/`digest.go`/`verifiers.go`](https://github.com/opencontainers/go-digest) | Primary — library's own source (vendored copy read at `google__go-containerregistry@0c8bedb78437`) | Vendored copy as fetched 2026-09-26 | The exact anchored-regex, exact-length, lower-case-only validation this dive's `digestx` fixture matches; the `Verifier` "write-then-check" contract behind §1. |
| [pkg.go.dev/github.com/opencontainers/go-digest](https://pkg.go.dev/github.com/opencontainers/go-digest) | Primary — package doc | Fetched 2026-09-26 | Confirms the package's supported-algorithm set (sha256/384/512, no blake3) against the vendored source. |
| [google/go-containerregistry, `internal/verify/verify.go`, `pkg/v1/remote/fetcher.go`, `pkg/authn/keychain.go`](https://github.com/google/go-containerregistry) | Primary — tool's own source | Read at exemplar SHA `0c8bedb78437`, fetched 2026-09-26 | The verify-at-EOF implementation actually used to fetch blobs (§1); the `DefaultKeychain`/`NewKeychainFromHelper` credential resolution (§7). |
| [oras-project/oras-go, `content/file/file.go`, `registry/remote/credentials/store.go`, `.../internal/configfile/configfile.go`](https://github.com/oras-project/oras-go) | Primary — tool's own source | Read at exemplar SHA `cb6d6dc79f83`, fetched 2026-09-26 | The write-in-place staging shape this rule set argues against (§3); the `credHelpers`/`credsStore` resolution order and its newer `NamespaceMatcher`/`Hierarchical` surface (§7). |
| [containerd/containerd, `core/metadata/db.go`, `plugins/content/local/{store,writer,locks}.go`, `core/content/content.go`](https://github.com/containerd/containerd) | Primary — tool's own source | Read at exemplar SHA `934434dde54b`, fetched 2026-09-26 | The staged-ingest/atomic-rename/collision-as-success shape (§3-5); the schema-versioned, migrating metadata store (§6). |
| [regclient/regclient, `internal/reghttp/http.go`, `config/docker.go`](https://github.com/regclient/regclient) | Primary — tool's own source | Read at exemplar SHA `43d2acb9fafd`, fetched 2026-09-26 | A third, independent `credHelpers`/`credsStore` implementation (§7); confirms the retry/backoff gap owned by the sibling `http-client-server` dive rather than re-litigated here. |
| [regclient/regclient `README.md`](https://raw.githubusercontent.com/regclient/regclient/main/README.md) | Secondary — project docs | Fetched 2026-09-26, current `main` | Corroborates the docker-CLI-config-import claim independently of the source read. |
| [docker/docker-credential-helpers](https://github.com/docker/docker-credential-helpers) | Primary — the protocol's own reference implementation and docs | Fetched 2026-09-26 | The `get`/`store`/`erase`/`list` stdin/stdout JSON contract all three registry-client libraries in §7 build on. |
| [go-topic-map/domain.md §9-14](../go-topic-map/domain.md) | Secondary — this program's own wave-1 grounding audit | 2026-09-26 | First-pass source survey this dive re-verified against live source rather than re-reading from scratch; §9-14 map directly onto this file's §§1-3,7. |
| [go-io.md, GO-IO-11/12/16/18](../go-io.md) | Secondary — this program's own wave-2 consolidation | 2026-09-26 | The atomic-write and tmp-sweep shape (GO-IO-11/12) this file specializes for blobs, and GO-IO-18 itself, which this dive absorbs and takes to a MUST/SHOULD verdict per candidate. |
| [go-audit/config-inventory.md §3,5](../go-audit/config-inventory.md) | Secondary — this program's own wave-1 house/fleet audit | 2026-09-26 | The fleet's actual (non-registry) binary-verification mechanism (`github_asset_digest`), used in §8 to scope what this dive's rules do and do not bind. |

