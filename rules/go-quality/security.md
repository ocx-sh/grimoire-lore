---
title: Randomness, TLS, Secrets, Templates, Unsafe and Input Bounds
summary: The GO-SEC family. The gosec preset that must stay off, crypto/rand for every token, TLS without InsecureSkipVerify, credentials in a redacting type, credential literals, byte bounds before a decoder, html/template for HTML sinks, unsafe and linkname behind a decision record, and why stdlib regexp needs no ReDoS review
---

# Randomness, TLS, Secrets, Templates, Unsafe and Input Bounds

Binds to Go 1.27.1 and golangci-lint v2.14.0 with its bundled gosec (measured 2026-09-26).

Owns the Go-specific, checkable security rows: where random bytes come from, how a
TLS client decides whom to trust, how a credential is held, logged, marshalled and
committed, which template package renders HTML, when `unsafe`, `//go:linkname` and
cgo are allowed, and the byte bound that sits in front of every decoder of
untrusted input. It does not own the neighbours. The gosec config text and its
excludes are GO-GATE-09 and GO-GATE-14 in `GO-GATE` (the lint gate), and GO-SEC-01
amends them. govulncheck triage and binary audits are GO-MOD-12 and GO-MOD-13 in
`GO-MOD` (modules). Secrets in argv are GO-IO-09, secret file modes GO-IO-04,
archive traversal (G305) and decompression bombs (G110) GO-IO-02 and GO-IO-03, and
the one reasoned G204 spawn suppression GO-IO-13, all in `GO-IO` (files and
processes). Secret flags and prompts are GO-CLI-09 in `GO-CLI`. Server timeouts
(G112, G114) are GO-NET-01 and HTTP-body `io.ReadAll` bounds, including a handler's
request body, are GO-NET-07, both in `GO-NET` (network). pprof exposure (G108) is
GO-OBS-05 in `GO-OBS`. FIPS 140-3 mode, CodeQL-only query shapes and post-quantum
signing are not covered.

Contents: [Dates and Floors](#dates-and-floors) ·
[The gosec Preset That Must Stay Off](#the-gosec-preset-that-must-stay-off) ·
[Caught by gosec](#caught-by-gosec) ·
[gosec Plus a Grep](#gosec-plus-a-grep) ·
[Reading Heuristics](#reading-heuristics) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0 unless a row says otherwise.

- **`crypto/rand.Text`** (go 1.24, go-line gated). A module whose `go` line is
  older uses `crypto/rand.Read` into a byte slice and encodes it.
- **`slog.LogValuer`** (go 1.21, go-line gated). GO-SEC-07's redaction test was
  watched on Go 1.27.1 defaults only. Re-run it after every toolchain bump,
  because the json/v2 default can change how a nested value marshals.
- **`//go:linkname` pulls** of unmarked stdlib symbols are rejected by the
  linker since Go 1.23 (toolchain gated, read 2026-09-26 from the 1.23 release notes).
- **`crypto/tls` defaults** on Go 1.27.1 (read 2026-09-26): minimum version TLS
  1.2, and the default key exchanges already include the ML-KEM hybrids. Leaving
  `MinVersion`, `CipherSuites` and `CurvePreferences` unset is the secure choice.
- **gosec rule IDs** (G101, G103, G117, G120, G402, G404, G708) are those bundled
  in golangci-lint v2.14.0. G117 is recent, so an older golangci-lint is silent on
  GO-SEC-04.

Every grep below is a violation locator with an explicit `.` operand. Empty
output is the pass unless the row says otherwise. Piped greps gate on output,
not on exit status, because a pipeline's exit code is the last stage's.

## The gosec Preset That Must Stay Off

```bash
grep -rn -E --include='*golangci*' -e '^[^#]*common-false-positives' .
golangci-lint run ./...
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-SEC-01 | Never list `common-false-positives` under `linters.exclusions.presets`. Exclude G304 by name in the gosec `excludes` instead, which makes GO-GATE-14's list G104, G115 and G304. Every G103 and G204 finding is then either fixed or suppressed with its reason, as `//nolint:gosec // G103: ADR-0042 buffer never mutated after the call` or `//nolint:gosec // G204: argv is the wrapped CLI's contract`. | The preset filters G103, G204 and G304 by message text, so every `unsafe` call GO-SEC-06 governs goes silent, and GO-IO-13's reasoned G204 suppression becomes an "unused directive" that fails `nolintlint`. 13 of 23 surveyed exemplar configs carry it, because golangci v1 defaults were migrated, so copying a popular config copies the defect. G304 alone earns exclusion (3.3 hits per 10k LOC, and GO-IO-02's `os.Root` owns untrusted file names). | The grep above: any output is the finding, and empty output is the pass. The anchored `^[^#]` keeps a comment that names the preset from false-redding. Then `golangci-lint run ./...`: a planted `unsafe.String` gives `0 issues.` with the preset and `G103: Use of unsafe calls should be audited`, exit 1, without it. | MUST |

## Caught by gosec

```bash
golangci-lint run ./...
```

Two rows add a grep for the half gosec does not see. Both are in the block under the table.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-SEC-02 | Generate every token, key, nonce, salt, session ID and upload or resource ID with `crypto/rand.Text()` or `crypto/rand.Read`. Never use `math/rand` or `math/rand/v2` for these, at any Go version. Non-secret randomness (backoff jitter, load shuffling, sampling) uses `math/rand/v2` and carries `//nolint:gosec // G404: retry jitter, not a secret`. | Neither `math/rand` package is unpredictable to an observer, and v2 changed the API, not the security model. An ID minted with `math/rand` and returned as a URL path segment is a session-hijack shape. | gosec **G404** fires on both packages. No output is the pass. A jitter site without the reasoned suppression is also a finding. | MUST |
| GO-SEC-03 | Never set `InsecureSkipVerify` in non-test code, including from a flag, env var or config value. To trust a private registry, add its CA to `tls.Config.RootCAs` (a `--ca-file` flag). For a plaintext registry, dial HTTP only for hosts in an exact `host:port` allow-list (pinned default: mirror the wrapped CLI's list, which is `OCX_INSECURE_REGISTRIES` for ocx and which the adopter renames). Never lower `MinVersion` below `tls.VersionTLS12`, and never set `CipherSuites` or `CurvePreferences`. | `InsecureSkipVerify` accepts any certificate for any host, a full MITM bypass. A global `--insecure` flag turns it on for every registry the process touches, including the credential exchange. A per-host plaintext list names exactly what it downgrades. A hand-written cipher or curve list freezes out the defaults' future upgrades. | gosec **G402** fires on a literal `true`, on a variable (`may be set to true`) and on `MinVersion: tls.VersionTLS10` (`TLS MinVersion too low`). It is silent on a hand-set secure `CipherSuites` list, so also run `grep -rn --include='*.go' -e 'CipherSuites:' -e 'CurvePreferences:' .`, where any output is the finding. `_test.go` is excluded from gosec by GO-GATE-09. | MUST |
| GO-SEC-04 | A struct that reaches `encoding/json`, yaml, xml or toml marshalling never carries a secret-named field (`password`, `secret`, `token`, by gosec's pattern). When a wire protocol requires the secret, as a credential-helper payload or a token-printing command does, the field lives on an unexported DTO filled from `Secret.Reveal()` at the send site, with `//nolint:gosec // G117: credential-helper protocol requires the secret on the wire`. | An untagged credential field reaches every log line, error and API response that serializes the struct. Renaming the JSON tag does not help: G117 still fires on `json:"password"`, which is correct. | gosec **G117**. No output is the pass. | MUST |
| GO-SEC-05 | Bound every untrusted stream before a decoder or parser reads it. For a request body, set `r.Body = http.MaxBytesReader(w, r.Body, max)` before `json.NewDecoder`, `io.ReadAll` or `ParseMultipartForm`, and a smaller `maxMemory` argument alone is not the fix. For a response body, file or archive member, use `json.NewDecoder(io.LimitReader(r, max+1))`. GO-NET-07 owns the `io.ReadAll` form and GO-IO-03 owns decompression. | Otherwise an attacker-sized body is read to completion. `ParseMultipartForm`'s `maxMemory` bounds only the in-memory part and spills the rest to disk. A registry manifest decoded straight off `resp.Body` has no ceiling, and GO-NET-07's `io.ReadAll` grep cannot see a decoder. | Multipart: gosec **G120**, which still fires on `ParseMultipartForm(10<<20)` until `MaxBytesReader` comes first. Decoders: the `decoder-bound` grep below, whose output is the candidate file list. Empty output is the pass. The full linter roster is silent on an unbounded decoder. | MUST |

```bash
# decoder-bound (GO-SEC-05): files that decode a body with no bound. Empty output is the pass.
grep -rl --include='*.go' -e 'json\.NewDecoder(' . \
  | xargs -r grep -l -e '\.Body' \
  | xargs -r grep -L -e 'MaxBytesReader' -e 'LimitReader'
```

```go
// Wrong: a hostile registry streams an unbounded manifest into memory.
err = json.NewDecoder(resp.Body).Decode(&m)

// Right: cap the bytes before the decoder sees them.
err = json.NewDecoder(io.LimitReader(resp.Body, maxManifest+1)).Decode(&m)
```

## gosec Plus a Grep

gosec sees part of each row. The grep sees the rest and its hits are read, not auto-failed.

```bash
golangci-lint run ./...
grep -rn --include='*.go' -e '"unsafe"' -e '//go:linkname' -e 'import "C"' .
# raw-secret-field (GO-SEC-07): credential-named string or []byte fields. Empty output is the pass.
grep -rniwE --include='*.go' \
  -e '^[[:space:]]+[a-z]*passw(or)?d[[:space:]]+string' \
  -e '^[[:space:]]+[a-z]*passw(or)?d[[:space:]]+\[\]byte' \
  -e '^[[:space:]]+[a-z]*token[[:space:]]+string' \
  -e '^[[:space:]]+[a-z]*token[[:space:]]+\[\]byte' \
  -e '^[[:space:]]+[a-z]*secret[[:space:]]+string' \
  -e '^[[:space:]]+[a-z]*secret[[:space:]]+\[\]byte' \
  -e '^[[:space:]]+[a-z]*apikey[[:space:]]+string' \
  -e '^[[:space:]]+[a-z]*apikey[[:space:]]+\[\]byte' \
  -e '^[[:space:]]+[a-z]*privatekey[[:space:]]+string' \
  -e '^[[:space:]]+[a-z]*privatekey[[:space:]]+\[\]byte' .
# credential-literal (GO-SEC-08): a credential name assigned a string literal. Empty output is the pass.
grep -rniE --include='*.go' \
  -e 'password[[:space:]]*:?=[[:space:]]*"' -e 'secret[[:space:]]*:?=[[:space:]]*"' \
  -e 'token[[:space:]]*:?=[[:space:]]*"' -e 'apikey[[:space:]]*:?=[[:space:]]*"' \
  -e 'api_key[[:space:]]*:?=[[:space:]]*"' -e 'credential[[:space:]]*:?=[[:space:]]*"' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-SEC-06 | `unsafe`, `//go:linkname` and `import "C"` are forbidden without a merged design record (ADR). The record names the symbol or pattern, why the safe stdlib path is insufficient, and for linkname the risk that a future Go release moves the target. Each `unsafe` call carries `//nolint:gosec // G103: ADR-0042` plus its invariant. An `unsafe.String` or `unsafe.Slice` site also has a test that mutates the source buffer after the call and asserts the result did not change. Confine accepted uses to a purpose-named package (pebble's `manual` and `rawalloc` are the model). Pinned default: the SDK holds no `unsafe` at all. | All three leave the type system or the portability guarantees. `unsafe.String` over a buffer that is later mutated silently breaks string immutability. Since Go 1.23 the linker rejects new linkname pulls of unmarked stdlib symbols. Real exceptions are rare: real cgo appears in 2 of 35 surveyed repos. | gosec **G103** (only once GO-SEC-01 holds) plus the `"unsafe"` grep above. A hit outside a path the record names is the finding, and empty output is the pass. For the immutability contract, `go test` on the site. | MUST |
| GO-SEC-07 | Hold every credential in a redacting type, never in a `string` or `[]byte` field that can reach a log, an error or a `fmt` verb. The type implements `String`, `GoString`, `LogValue` and `MarshalText`, each returning `[REDACTED]`, and exposes the value only through `Reveal()` at the send site. Pinned default: the SDK exports it as `Secret` (for example `ocx.Secret`, renamed per module) and proves it with one redaction test covering the `slog` text and JSON handlers and `%v`, `%+v` and `%#v`. | G117 misses logging entirely: `slog.Info("login", "creds", c)` and `fmt.Errorf("%+v", c)` print the password with 0 gosec findings. `LogValue` alone is not enough, because `slog.JSONHandler` marshals nested struct fields with `encoding/json` and bypasses it. | The `raw-secret-field` grep above. A hit that is not an unexported wire DTO under GO-SEC-04 is the finding, and empty output is the pass. Behaviour: the redaction test, which fails with `"Password":"hunter2"` once `MarshalText` is removed. | MUST (SDK, CLI) |
| GO-SEC-08 | Never commit a credential literal. Treat gosec G101 as covering only high-entropy or vendor-shaped literals, at any scope, and back it with the `credential-literal` grep, which catches low-entropy, concatenated and indirected values. A deliberately public value, such as a native-app OAuth client secret, carries a comment saying why it is safe to commit. | G101 checks `:=`, `const`, `var`, comparisons and composite literals alike, but fires only when entropy clears its threshold or a vendor regex matches. `"Sup3rS3cr3t!2026Password"` and `"a" + "b"` slip through at every scope. An agent told "don't hardcode it" tends to split or indirect the literal. | gosec **G101** plus the `credential-literal` grep above. Clear each hit against a runtime source (env, file, keychain) or the safe-to-commit comment. Empty output is the pass. The grep is noisy on name-only matches, so it is read, never gated. | MUST |

```go
// Wrong: every slog handler, %+v and json.Marshal prints the password.
type Creds struct{ User, Password string }

// Right: the field renders as [REDACTED] everywhere. Reveal() is called at the send site only.
type Secret string

func (Secret) String() string               { return "[REDACTED]" }
func (Secret) GoString() string             { return `"[REDACTED]"` }
func (Secret) LogValue() slog.Value         { return slog.StringValue("[REDACTED]") }
func (Secret) MarshalText() ([]byte, error) { return []byte("[REDACTED]"), nil }
func (s Secret) Reveal() string             { return string(s) }
```

## Reading Heuristics

No analyzer gates these rows. The triage greps narrow the reading list, and their output is candidates, not findings.

```bash
# secret-compare (GO-SEC-09): files with credential-named funcs that use == and no constant-time compare.
grep -rlE --include='*.go' -e 'func.*[Kk]ey' -e 'func.*[Ss]ecret' -e 'func.*[Tt]oken' -e 'func.*[Pp]assword' . \
  | xargs -r grep -l -e '==' \
  | xargs -r grep -L -e 'subtle\.ConstantTimeCompare' -e 'hmac\.Equal'
# text-template-sink (GO-SEC-10): text/template in a file that writes an HTTP response.
grep -rl --include='*.go' -e '"text/template"' . \
  | xargs -r grep -l -e 'http\.ResponseWriter'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-SEC-09 | Code that verifies a caller-supplied secret compares it with `crypto/subtle.ConstantTimeCompare` or, for MACs, `hmac.Equal`. It never uses `==`, `bytes.Equal` or a map lookup keyed by the secret. This covers API keys, bearer tokens, webhook signatures and local-IPC tokens. Comparing a digest of downloaded content is not secret verification, and `==` is correct there. | `==` short-circuits on the first differing byte, which is a timing oracle. | Reading heuristic. No gosec or golangci rule fires on `supplied == want`. The `secret-compare` grep flags the planted file and is empty on the `subtle` twin, but it returned 83 candidate files across 5 exemplars, too imprecise for a gate. Read each function that authenticates a caller. | MUST (code that authenticates a caller) |
| GO-SEC-10 | Render every HTML sink (an HTTP response, an HTML email, a generated HTML file) with `html/template`. Never `Parse` template source from untrusted input with either package. `text/template` stays on operator-authored templates producing non-HTML output. A deviation documents its trust boundary in the same file, as caddy's templates module does. | `text/template` escapes nothing, which gives reflected XSS. `html/template` escapes data in a trusted template but does nothing about server-side template injection through untrusted template text. | The `text-template-sink` grep, then read where the template text comes from and where the output goes. Empty output is the pass. gosec **G708** fires only when request data reaches `Execute` directly and is silent once the value is wrapped in a struct (measured 2026-09-26), so it is not the check. | MUST |
| GO-SEC-11 | Do not raise ReDoS findings, or rewrite patterns "for safety", against stdlib `regexp`. Bound the input length through GO-SEC-05 instead. Reserve ReDoS review for code that calls a non-RE2 engine. | `regexp` is guaranteed linear in input size, with no backreferences or lookaround. "Fixing" it is churn that can introduce real bugs. | Reading heuristic: confirm the engine is `regexp` or `regexp/syntax` before accepting a ReDoS finding. | SHOULD |

## What Agents Get Wrong Here

1. **Copying `common-false-positives` from an exemplar config.** 13 of 23 carry
   it. It silently disables the `unsafe` audit and breaks the reasoned G204
   suppression. GO-SEC-01's grep catches it.
2. **Logging a credential struct and trusting "gosec covers secrets".**
   `slog.Info(…, "creds", c)` and `fmt.Errorf("%+v", c)` leak with zero G117
   findings. GO-SEC-07's grep and redaction test catch it.
3. **Adding `LogValue` and stopping there.** `slog.JSONHandler` still prints the
   nested field through `encoding/json`. Only `MarshalText` closes it (GO-SEC-07).
4. **Reaching for `math/rand` or `math/rand/v2` for "a random ID".** It is the
   idiomatic-looking choice and G404 flags it (GO-SEC-02).
5. **Wiring a `--insecure` flag to `InsecureSkipVerify`,** copying popular
   registry CLIs. G402 fires on the variable form too (GO-SEC-03).
6. **Decoding `resp.Body` or `r.Body` straight into `json.NewDecoder`,** or
   "fixing" `ParseMultipartForm` with a smaller `maxMemory`. The `decoder-bound`
   grep and G120 catch them (GO-SEC-05).
7. **Answering "don't hardcode the secret" by splitting or indirecting the
   literal,** or believing G101 checks only package-scope values. G101 misses
   low-entropy and composed literals at every scope (GO-SEC-08).
8. **Using `text/template` for an HTML response because the file already imports
   it,** and reading G708's silence as a pass (GO-SEC-10).
9. **Copying an `unsafe.String` zero-copy trick** without proving the buffer is
   never mutated. G103 plus the record's mutation test catch it (GO-SEC-06).
10. **Comparing a bearer token with `==`.** No linter fires, so only the reading
    step catches it (GO-SEC-09).
11. **"Hardening" a stdlib regex against ReDoS.** RE2 is linear, so the rewrite
    is pure risk (GO-SEC-11).
