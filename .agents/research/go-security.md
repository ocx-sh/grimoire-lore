---
title: "Go-specific, checkable security rules — randomness, TLS, secrets, templates, unsafe and input bounds (GO-SEC)"
topic: go-security
model: opus
id_family: GO-SEC
consolidates:
  - go-security/untrusted-input-and-crypto.md
date: 2026-09-26
toolchain: "Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 with its bundled gosec, via /home/mherwig/.cache/research-lang/go-tools/run.sh"
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/untrusted-input-and-crypto/   # the dive's
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-security-consolidation/     # this consolidation's
---

# Go security rules (GO-SEC)

Tags used below:
- **[UIC]** = [untrusted-input-and-crypto](go-security/untrusted-input-and-crypto.md). Its runs are cited as [UIC run n].
- **[run]** = [go-audit/exemplar-runtime-posture.md](go-audit/exemplar-runtime-posture.md). **[shape]** = [go-audit/exemplar-code-shape.md](go-audit/exemplar-code-shape.md). **[gates]** = [go-audit/exemplar-quality-gates.md](go-audit/exemplar-quality-gates.md).
- **[C-n]** = a run made for this consolidation. The table is in "Consolidation verification runs" at the end of the ruleset.

Scope is the map's rows M-I-04..09 ([go-topic-map.md](go-topic-map.md) §I). The other security rows are owned elsewhere, and this file cites them without restating them:
- govulncheck triage and binary audits: GO-MOD-12 and GO-MOD-13.
- The gosec baseline, its excludes and its thresholds: GO-GATE-09 and GO-GATE-14. GO-SEC-01 amends both.
- Secrets in argv: GO-IO-09. Secret file modes (0o600): GO-IO-04. Archive traversal (G305) and decompression bombs (G110): GO-IO-02 and GO-IO-03.
- Secret flags and prompts: GO-CLI-09. pprof exposure (G108): GO-OBS-05.
- Server timeouts (G112 and G114): GO-NET-09. Response-body `io.ReadAll` bounds: GO-NET-03.
- M-I-10..12 (FIPS 140-3, CodeQL-only shapes, post-quantum signing) stay deferred, as the map ruled.

## Verdict

1. **The fleet gosec config drops golangci's `common-false-positives` preset and excludes G304 by name (GO-SEC-01).** [UIC] blamed "vendored-gosec drift" for G103's silence. The measured cause is the preset: it filters out G103, G204 and G304 by message text (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:64-89`). With the preset in place, the reasoned `//nolint:gosec // G204` that GO-IO-13 prescribes fails `nolintlint` [C-2]. So the config the drafters would copy fails its own gate. This is the same mechanism as the `std-error-handling` contradiction that go-gates/config-revision fixed. It binds every code kind.
2. **Every token, key, nonce, salt or resource ID comes from `crypto/rand` (GO-SEC-02).** `math/rand/v2` is allowed only for jitter, shuffling and sampling, and only with a reasoned G404 suppression.
3. **`InsecureSkipVerify` never appears outside `_test.go`, not even behind a `--insecure` flag (GO-SEC-03).** Registry CLIs follow ocx's contract instead. Extra trust comes through `RootCAs`, from a CA file. Plaintext is an exact `host:port` allow-list (`OCX_INSECURE_REGISTRIES`, `ocx@2691d3c1638e:website/src/docs/reference/environment.md:463-476`). oras and oras-go are the counter-examples.
4. **Credentials live in a redacting `Secret` type (GO-SEC-07), and that is the "secrets out of logs" rule.** gosec G117 covers marshalling only: it is silent on `slog` and `%+v` [C-6]. `slog.JSONHandler` ignores `LogValue` on nested struct fields, so the type must also implement `MarshalText` [C-7]. This binds the SDK and CLIs. Wire DTOs that must carry the secret are unexported, filled through `Reveal()`, and annotated for G117 (GO-SEC-04).
5. **G101 is not a scope-limited check.** It catches high-entropy or vendor-shaped literals at any scope. It misses low-entropy and composed literals at any scope [C-4]. This overturns [go-gates/golangci-config](go-gates/golangci-config.md) §4 and go-gates.md failure mode 12. GO-SEC-08 pairs G101 with a name-and-literal grep.
6. **Nothing untrusted is decoded without a byte bound (GO-SEC-05).** Request bodies use `http.MaxBytesReader`, and G120 enforces it for multipart forms. Response bodies, files and archive members use `io.LimitReader(r, max+1)`. This absorbs the [GO-NET-11 candidate](go-network/http-client-server.md) and binds all code kinds.
7. **Four rules have no analyzer and stay reading heuristics with a triage grep:** constant-time comparison (GO-SEC-09), `html/template` for HTML sinks (GO-SEC-10), `unsafe`/`//go:linkname`/cgo, where G103 covers only the `unsafe` calls (GO-SEC-06), and credential-shaped literals G101 cannot resolve (GO-SEC-08).
8. **ReDoS is not a finding against stdlib `regexp` (GO-SEC-11).** RE2 is linear by construction, so agents must not spend effort rewriting regexes.

## The ruleset

Severity legend: a **MUST** has a normative or measured source and a check that was watched red on a planted violation and green on its twin. A reading-heuristic MUST says why no mechanical check exists. **SHOULD** and **CONSIDER** say why they fall short. Empty output or exit 0 means pass unless the row says otherwise. Every grep takes a directory operand (`DIR`), and its output is a candidate list for review. Grep rows gate on output, not on exit status.

### GO-SEC — the gosec configuration the family assumes

The amendment to GO-GATE-09/14. It is applied on top of go-gates/config-revision, which already dropped `std-error-handling`:

```yaml
linters:
  settings:
    gosec:
      excludes:
        - G104 # duplicates errcheck
        - G115 # ignores prior bounds checks (securego/gosec#1187)
        - G304 # file inclusion via variable; untrusted names go through os.Root (GO-IO-02)
  exclusions:
    presets: [comments]   # never common-false-positives: it hides G103 and G204
```

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-SEC-01 | Never list `common-false-positives` under `linters.exclusions.presets`. Exclude G304 by name in `gosec.excludes` instead. Every G103 and G204 finding is then either fixed or suppressed as `//nolint:gosec // G103: ADR-nnnn …` or `// G204: …`. | The preset filters out G103, G204 and G304 by message text (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:64-89`). That hides every `unsafe` call GO-SEC-06 governs. It also makes GO-IO-13's prescribed G204 suppression an "unused directive" under `nolintlint allow-unused: false`, so the fleet gate fails on compliant SDK code. 13 of the 23 exemplar configs carry the preset because v1 defaults were migrated. Popularity is not the test here. G304 alone clears the admission bar for exclusion: 42 hits in 126k LOC across 6 exemplars (3.3/10k) [C-3], and GO-IO-02's `os.Root` owns untrusted file names. G204 stays on: 8 hits in the same code (0.6/10k). | `grep -rn --include='*golangci*' -e 'common-false-positives' DIR`: any output is the finding. Then `golangci-lint run ./...` | yes: [C-1] under the fleet config the `unsafe` probe gives `0 issues.` and exit 0. Under the amended config it gives 3× `G103: Use of unsafe calls should be audited` and exit 1, and the ADR-annotated twin gives exit 0. [C-2] under the fleet config, a reasoned G204 `//nolint` gives `directive … is unused for linter "gosec" (nolintlint)` and exit 1. Under the amended config it gives exit 0. `os.ReadFile(path)` is silent under both [C-1 openvar]. | MUST | golangci-lint v2 |

### GO-SEC — caught by gosec under the fleet config (`golangci-lint run ./...`)

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-SEC-02 | Generate every token, key, nonce, salt, session ID and upload/resource ID with `crypto/rand.Text()` or `crypto/rand.Read`. Never use `math/rand` or `math/rand/v2` for these, at any Go version. Non-secret randomness (backoff jitter, load shuffling, sampling) uses `math/rand/v2` and carries `//nolint:gosec // G404: <use>, not a secret`. | Neither `math/rand` package is unpredictable to an observer. v2 changed the API, not the security model ([pkg.go.dev/crypto/rand](https://pkg.go.dev/crypto/rand), OWASP Go-SCP). An ID minted with `math/rand` and returned as a URL path segment is a session-hijack shape. | gosec **G404** | yes: [UIC run 1] `mathrand-token/bad` → `G404` at `bad/bad.go:13:31`, exit 1; `good` (`rand.Text()`) → exit 0. [C-3] G404 fires on exemplar jitter and ID sites. | MUST | 1.24 for `rand.Text` |
| GO-SEC-03 | Never set `InsecureSkipVerify` in non-test code. That includes a value taken from a flag, env var or config. To trust a private registry, add its CA to `tls.Config.RootCAs` (for example a `--ca-file`). For a plaintext registry, dial HTTP only for hosts in an exact `host:port` allow-list, as ocx's `OCX_INSECURE_REGISTRIES` does. Never lower `MinVersion` below `tls.VersionTLS12`. Never set `CipherSuites` or `CurvePreferences`, because the 1.27 defaults already include TLS 1.2 as the minimum and the ML-KEM hybrids. | `InsecureSkipVerify` accepts any certificate for any host, which is a full MITM bypass ([pkg.go.dev/crypto/tls](https://pkg.go.dev/crypto/tls)). A global `--insecure` flag turns it on for every registry the process touches, including the credential exchange. A per-host plaintext list is at least explicit about what it downgrades. | gosec **G402**. It fires on a literal `true` and on a variable value ("may be set to true"). Test code is excluded by GO-GATE-09. | yes: [UIC run 5] literal → `G402`, exit 1; twin → exit 0. [C-5] `tlsbad` (`InsecureSkipVerify: o.Insecure`) → `G402: TLS InsecureSkipVerify may be set to true.`, exit 1; `tlsgood` (`RootCAs` + `MinVersion`) → exit 0 | MUST | — |
| GO-SEC-04 | A struct that reaches `encoding/json`, yaml, xml or toml marshalling never carries a secret-named field (`password`, `secret`, `token` by gosec's pattern). If a wire protocol requires the secret, as a credential-helper payload or a token-printing command does, the field lives on an unexported DTO filled from `Secret.Reveal()` at the send site. It carries `//nolint:gosec // G117: <protocol> requires the secret on the wire`. | An untagged credential field reaches every log line, error and API response that serializes the struct. | gosec **G117** | yes: [UIC run 3] `Password` + `json.Marshal` → `G117`, exit 1; `json:"-"` twin → exit 0. [C-6] `slogfield` (tagged `json:"password"`) still fires G117, exit 1, so a tag rename is not a way around the rule. | MUST | gosec with G117 (bundled in golangci-lint 2.14.0) |
| GO-SEC-05 | Bound every untrusted stream before a decoder or parser reads it. For a request body, set `r.Body = http.MaxBytesReader(w, r.Body, max)` before `json.NewDecoder`, `io.ReadAll` or `ParseMultipartForm`. A smaller `maxMemory` argument alone is not the fix. For a response body, file or archive member, use `json.NewDecoder(io.LimitReader(r, max+1))`. | Otherwise an attacker-sized body is read to completion. `ParseMultipartForm`'s `maxMemory` bounds only the in-memory part and spills the rest to disk (gosec `analyzers/form_parsing_limits.go`). A registry manifest decoded straight off `resp.Body` has no ceiling, and GO-NET-03's `io.ReadAll` grep does not see a decoder. | Multipart: gosec **G120**. Decoders, a triage grep: `grep -rl --include='*.go' -e 'json\.NewDecoder(' DIR \| xargs -r grep -l -e '\.Body' \| xargs -r grep -L -e 'MaxBytesReader' -e 'LimitReader'`. Output is the candidate file. | yes: [UIC run 8] `ParseMultipartForm(0)` → G120; `ParseMultipartForm(10<<20)` without `MaxBytesReader` → **still** G120; `MaxBytesReader` first → exit 0. [UIC run 7/7b] request decoder: full roster 0 issues on both, grep flags `bad/bad.go`, empty on `good/`. [C-8] response decoder: grep flags `decbad/d.go`, empty on `decgood` | MUST | — |

### GO-SEC — gosec plus a grep: policy the analyzer only partly sees

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-SEC-06 | `unsafe`, `//go:linkname` and `import "C"` are forbidden in fleet code without a merged ADR. The ADR names the symbol or pattern, why the safe stdlib path is insufficient, and, for linkname, the risk that a future Go release moves the target. Each `unsafe` call carries `//nolint:gosec // G103: ADR-nnnn <invariant>`. An `unsafe.String`/`unsafe.Slice` site also has a test that mutates the source buffer after the call and asserts that the string did not change. | All three leave the type system or portability guarantees. `unsafe.String` over a buffer that is later mutated silently breaks string immutability ([pkg.go.dev/unsafe#String](https://pkg.go.dev/unsafe#String)). Since Go 1.23 the linker rejects new linkname pulls of unmarked stdlib symbols ([go.dev/doc/go1.23](https://go.dev/doc/go1.23)). Real exceptions are rare and named after their purpose: real cgo appears in 2 of 35 repos, and pebble's `manual` and `rawalloc` packages are the model. | gosec **G103** under GO-SEC-01, plus `grep -rn --include='*.go' -e '"unsafe"' -e '//go:linkname' -e 'import "C"' DIR`. Output outside an ADR'd path is the finding. For the immutability contract: `go test` on the site. | yes: [C-1] G103 red and ADR twin green under the amended config. [UIC run 9] `unsafe-string/bad` `go test` → `got "Xello"`, exit 1; `good` (`string(buf)`) → exit 0. The grep matches `g103probe/probe.go` and `unsafe-string/bad/bad.go` [UIC §5]. Whether a match falls under an ADR is a reading step. | MUST | 1.23 (linkname) |
| GO-SEC-07 | Hold every credential in a redacting type, never in a `string` or `[]byte` field that can reach a log, an error or a `fmt` verb. The type implements `String`, `GoString`, `LogValue` and `MarshalText`, each returning `[REDACTED]`, and exposes the value only through `Reveal()` at the send site. The SDK exports it, for example `ocx.Secret`, and prove it with one redaction test covering `slog` text and JSON handlers and `%v`, `%+v`, `%#v`. | G117 misses logging entirely: `slog.Info("login", "creds", c)` and `fmt.Errorf("%+v", c)` print the password with 0 gosec findings [C-6]. `LogValue` alone is not enough, because `slog.JSONHandler` marshals nested struct fields with encoding/json and bypasses it [C-7]. This mirrors ocx-sdk-python's redacted process input ([go-io.md](go-io.md) GO-IO-09 evidence). | Triage grep for raw secret fields: `grep -rnE --include='*.go' -e '^[[:space:]]+[A-Za-z]*(Password\|Passwd\|Token\|Secret\|APIKey\|ApiKey\|PrivateKey)[[:space:]]+(string\|\[\]byte)([[:space:]]\|$)' DIR`. A hit that is not an unexported wire DTO (GO-SEC-04) is the finding. Behaviour: the redaction test. | yes: [C-7] same test against a raw-`string` struct → `secret leaked: … Password:hunter2`, exit 1. `Secret` with `String`, `GoString` and `LogValue` only → leaked through `JSONHandler`, exit 1. Adding `MarshalText` → `PASS`, exit 0. The grep flags `slogbad/s.go:11`, empty on `sloggood/`. | MUST (SDK, CLI) | 1.21 (`slog.LogValuer`) |
| GO-SEC-08 | Never commit a credential literal. Treat gosec G101 as covering only high-entropy or vendor-shaped literals, at any scope. Back it with a name-and-literal grep that catches low-entropy, concatenated and indirected values. A deliberately public value, such as a native-app OAuth client secret, carries a comment saying why it is safe. | G101 checks `:=`, `const`/`var`, comparisons and composite literals alike. It fires only when zxcvbn entropy clears its threshold or a vendor regex matches, so `"Sup3rS3cr3t!2026Password"` or `"a" + "b"` slip through at every scope. An agent told "don't hardcode it" tends to split or indirect the literal. | gosec **G101** plus `grep -rniE --include='*.go' -e 'password[[:space:]]*:?=[[:space:]]*"' -e 'secret[[:space:]]*:?=[[:space:]]*"' -e 'token[[:space:]]*:?=[[:space:]]*"' -e 'apikey[[:space:]]*:?=[[:space:]]*"' -e 'api_key[[:space:]]*:?=[[:space:]]*"' -e 'credential[[:space:]]*:?=[[:space:]]*"' DIR`. Each hit is cleared against a runtime source (env, file, keychain). | yes: [C-4] package-scope low-entropy `const` → `0 issues.`, exit 0 (miss); local high-entropy `:=` → `G101`, exit 1; concatenated → exit 0 (miss). The grep flags all three and is empty on the `os.Getenv` twin. [UIC runs 4, 4b, 10, 11] show the full 10-variant table. | MUST | — |

### GO-SEC — reading heuristics (no analyzer exists)

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-SEC-09 | Code that verifies a caller-supplied secret compares it with `crypto/subtle.ConstantTimeCompare` or, for MACs, `hmac.Equal`. It never uses `==`, `bytes.Equal` or a map lookup keyed by the secret. This covers API keys, bearer tokens, webhook signatures and local-IPC tokens. Comparing a digest of downloaded content is not secret verification, and `==` is fine there. | `==` short-circuits on the first differing byte, which is a timing oracle ([pkg.go.dev/crypto/subtle](https://pkg.go.dev/crypto/subtle)). | A reading heuristic. No gosec or golangci rule fires [UIC run 2]. The triage grep is `grep -rlE --include='*.go' -e 'func.*[Kk]ey' -e 'func.*[Ss]ecret' -e 'func.*[Tt]oken' -e 'func.*[Pp]assword' DIR \| xargs -r grep -l -e '==' \| xargs -r grep -L -e 'subtle\.ConstantTimeCompare' -e 'hmac\.Equal'`, then read each function that authenticates a caller. It is a reading heuristic because the grep returned 83 candidate files across 5 exemplars [C-9], and a narrower name-based grep missed the planted violation [C-9]. | grep red/green: yes [UIC run 2b] (`bad/bad.go` flagged, `good/` empty). Its precision is too low for a gate. | MUST (code that authenticates a caller) | — |
| GO-SEC-10 | Render every HTML sink (an HTTP response, an HTML email, a generated HTML file) with `html/template`. Never `Parse` template *source* from untrusted input with either package. `text/template` stays on operator-authored templates producing non-HTML output. A deviation documents its trust boundary in the same file, as caddy does. | `text/template` escapes nothing, which gives reflected XSS. `html/template` escapes data in a trusted template but does nothing about server-side template injection (SSTI) through untrusted template text (`caddyserver/caddy@54937914234b:modules/caddyhttp/templates/templates.go:36-42`). | Triage grep: `grep -rl --include='*.go' -e '"text/template"' DIR \| xargs -r grep -l -e 'http\.ResponseWriter'`. Then read where the template *text* comes from and where the output goes. gosec G203/G708 did not fire on this shape [UIC §4]. | yes: [UIC run 6] full roster → 0 issues on both. [UIC run 6b] grep flags `bad/bad.go`, empty on `good/good.go`. | MUST | — |
| GO-SEC-11 | Do not raise ReDoS findings, or rewrite patterns "for safety", against stdlib `regexp`. Bound the input length through GO-SEC-05 instead. Reserve ReDoS review for code that calls a non-RE2 engine. | `regexp` is guaranteed linear in input size, with no backreferences or lookaround ([pkg.go.dev/regexp](https://pkg.go.dev/regexp)). "Fixing" it is churn that can introduce real bugs. | Reading heuristic: confirm the engine is `regexp` or `regexp/syntax` before accepting a ReDoS finding. | no: normative citation only. No code shape can show the guarantee failing [UIC §6]. | SHOULD | — |

Dropped from [UIC]'s candidates:
- `crypto/subtle.WithDataIndependentTiming` (1.24). It has zero corpus adoption; it goes to `go-upgrade` as a note.
- Candidate 7 (the caddy trust-boundary doc) as a standalone rule. It is merged into GO-SEC-10's deviation clause.
- Candidate 9 (`unsafe.String` immutability) as a standalone rule. It is merged into GO-SEC-06, because it only arises under an ADR.

### Consolidation verification runs

Every command ran through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0) on 2026-09-26. Fixture root: `F=/home/mherwig/.cache/research-lang/go-tools/fixtures/go-security-consolidation`. The fleet config is `F/g103-preset/.golangci.yml`, which is the GO-GATE-09 config as used by [UIC]. The amended config is `F/proposed.golangci.yml`: GO-SEC-01's `presets: [comments]` plus the G304 exclude.

| # | fixture | command | violation | twin | relevant output |
|---|---|---|---|---|---|
| C-1 | `F/g103-preset`, `F/cfgprobe/{unsafebad,unsafeadr,openvar}` | `golangci-lint run -c <config> ./<pkg>/...` under both configs | `unsafebad`: fleet exit 0 (`0 issues.`); amended exit 1 | `unsafeadr` (ADR `//nolint:gosec // G103: …`): amended exit 0; `openvar` exit 0 under both | `probe.go:6:9: G103: Use of unsafe calls should be audited (gosec)` ×3 only once the preset is gone |
| C-2 | `F/g204-nolint`, `F/cfgprobe/spawn` | same, both configs | fleet exit 1 | amended exit 0 | `run.go:10:54: directive //nolint:gosec // G204: argv is the wrapped CLI's contract is unused for linter "gosec" (nolintlint)`; the same happens for the G103 ADR line in `unsafeadr` |
| C-3 | 6 exemplars (oras-go, ko, regclient, cobra, go-containerregistry, oras) | `golangci-lint run -c F/gosec-census.yml ./...` (gosec only, no preset, G104/G115 excluded, tests excluded) | census | — | G304: 14/4/0/9/10/5; G204: 1/6/0/0/1/0; G103: 0; G404: oras-go 1, ggcr 3; G402: oras-go 1, oras 1; G117: oras-go 1, ggcr 2; G101: oras-go 1. Non-test LOC is 126,179. regclient reports 0 because it carries 67 suppressions |
| C-4 | `F/sec/{g101pkglow,g101localhigh,g101concat,secretgood}` | amended config; then the GO-SEC-08 grep | `g101localhigh` exit 1 | `g101pkglow` exit 0, `g101concat` exit 0 (both misses) | `c.go:5:2: G101: Potential hardcoded credentials`. The grep flags pkglow, concat and localhigh, and is empty on `secretgood` |
| C-5 | `F/sec/{tlsbad,tlsgood}` | amended config | exit 1 | exit 0 | `t.go:9:77: G402: TLS InsecureSkipVerify may be set to true.` |
| C-6 | `F/sec/{slogbad,slogfield}` | amended config | `slogbad` (slog + `%+v` of `Password string`) exit 0, the G117 gap | `slogfield` exit 1 | `s.go:12:47: G117: Marshaled struct field "Password" (JSON key "password") matches secret pattern` |
| C-7 | `F/sec/{slogbadtest,sloggood}` | `go test ./sloggood/`, `go test ./slogbadtest/` | exit 1 | exit 0 after adding `MarshalText` | bad: `secret leaked: … creds="{Username:u Password:hunter2}"`. Before `MarshalText`, the JSON handler leaked `"Password":"hunter2"`. The raw-field grep flags `slogbad/s.go:11:	Password string` and is empty on `sloggood` |
| C-8 | `F/sec/{decbad,decgood}` | the GO-SEC-05 decoder grep | prints `decbad/d.go` | empty | the golangci roster is silent on the decoder in both. The only finding is an errcheck on `resp.Body.Close` in both, unrelated to GO-SEC-05 |
| C-9 | 5 exemplars (oras-go, ggcr, cli, regclient, ko) | GO-SEC-09 triage grep, excluding `_test.go`, testdata and vendor | 11/14/50/7/1 files | — | an 83-file triage list. A narrower `(token\|secret\|…)[!=]=` grep printed nothing on [UIC]'s `secret-eq/bad` (`supplied == want`), so it misses the canonical shape |

## Applied to the exemplars and the future consumers

**Already satisfied by strict exemplars:**
- GO-SEC-06: `cockroachdb/pebble@13596f1e1cea` confines `//go:linkname` into runtime to purpose-named packages: `internal/manual/manual_cgo.go:19`, `internal/rawalloc/rawalloc_go1.9.go:26`, `sstable/colblk/base.go:56,59`. Its `internal/base/filenames.go:186` is the safe `unsafe.String` shape: a fresh buffer, never touched again [UIC §5].
- GO-SEC-10: `caddyserver/caddy@54937914234b:modules/caddyhttp/fileserver/browse.html:308,929,1068` (`{{html .Name}}`) and `:31` (`pathEscape`) escape manually, with a per-request CSP nonce. `templates/templates.go:36-42` documents its trust boundary. This is the deviation bar.
- GO-SEC-08 exception form: `cli/cli@9b031151a825:internal/authflow/flow.go:23-24` has "This value is safe to be embedded in version control" above the public OAuth client secret. The grep hits it, and the comment clears it.
- Reasoned suppressions: `aquasecurity/trivy@ae561f8cca36:pkg/iac/adapters/terraform/aws/provider/adapt.go:12` (`//#nosec G101 -- False positive`) [run §7]. `google/go-containerregistry@0c8bedb78437:pkg/v1/random/image.go:81` annotates `math/rand` for a fake test image [UIC §1].

**Violated by prominent exemplars:**
- GO-SEC-01: 13 of 23 configs carry `common-false-positives`, among them `google/go-containerregistry@0c8bedb78437:.golangci.yaml:46`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:27`, `sigstore/cosign@907c3d899c0e:.golangci.yml:60`, `oras-project/oras@a0cd4de5cfcd:.golangci.yml:60`, `spf13/cobra@adbc8813901b:.golangci.yml:57` and `tailscale/tailscale@6b3a45f14ef6:.golangci.yml:88`.
- GO-SEC-02: `google/go-containerregistry@0c8bedb78437:pkg/registry/blobs.go:389` mints an upload-session ID with `rand.Int63()` (G404 [C-3]). It is a dev registry, but the shape is copyable. Unannotated jitter: `oras-project/oras-go@cb6d6dc79f83:registry/remote/retry/policy.go:99` and `google/go-containerregistry@0c8bedb78437:internal/retry/wait/kubernetes_apimachinery_wait.go:36`.
- GO-SEC-03: `oras-project/oras-go@cb6d6dc79f83:registry/remote/builder.go:152` and `oras-project/oras@a0cd4de5cfcd:cmd/oras/internal/option/remote.go:265` set `InsecureSkipVerify: <flag>` for the whole client (G402 [C-3]).
- GO-SEC-04: `google/go-containerregistry@0c8bedb78437:cmd/crane/cmd/auth.go:104,193` and `oras-project/oras-go@cb6d6dc79f83:registry/remote/credentials/native_store.go:117` marshal token and secret fields without annotation. The serialization is intentional (token printing, the credential-helper protocol), and the fleet form annotates it.
- GO-SEC-07: raw secret fields are the norm in registry clients. Non-test hits of the grep: oras-go 12 (`internal/authtype/authtype.go:39`), go-containerregistry 10 (`pkg/v1/google/auth.go:143`), regclient 11 (`regclient/regclient@43d2acb9fafd:internal/auth/auth.go:75`), cosign 4 (`sigstore/cosign@907c3d899c0e:cmd/cosign/cli/options/key.go:30`). Of 35 repos, 7 non-test files implement `LogValue()` at all.
- G101 false positive: `oras-project/oras-go@cb6d6dc79f83:registry/remote/credentials/native_store.go:29` (`remoteCredentialsPrefix = "docker-credential-"`) [C-3]. Name matching produces noise, so GO-SEC-08's grep needs a human clear, not a gate.

**New commitments for the fleet's Go code:**
- **The Go SDK** (ocx wrapper):
  - exports `Secret` (GO-SEC-07) for `login` and `Input` parameters;
  - carries the one G204 suppression at GO-IO-13's spawn point, which is valid only under GO-SEC-01;
  - does no TLS of its own, because ocx does it;
  - holds no `unsafe` (GO-SEC-06).
- **Go CLIs**:
  - replace `--insecure` with `--ca-file` plus a per-host plaintext list mirroring `OCX_INSECURE_REGISTRIES` (GO-SEC-03);
  - bound every manifest/index decode with `io.LimitReader` (GO-SEC-05);
  - generate IDs with `rand.Text()` (GO-SEC-02);
  - annotate credential-helper DTOs (GO-SEC-04).
- **Every repo**: the amended gosec block (GO-SEC-01), applied through GO-GATE-09/14 by the go-gates drafters.

## AI-agent failure modes

Ranked by how often each bites fleet-shaped code:

1. **Copying `common-false-positives` from an exemplar config** (13/23 have it), which silently disables the unsafe audit and breaks GO-IO-13's suppression. Check: GO-SEC-01's grep.
2. **Logging a config or credential struct** (`slog.Info(…, "creds", c)`, `fmt.Errorf("%+v", c)`) and trusting "gosec covers secrets". Check: GO-SEC-07's grep plus its redaction test. G117 is silent [C-6].
3. **Adding `LogValue` and stopping there.** `JSONHandler` still leaks nested fields. Check: GO-SEC-07's test with both handlers [C-7].
4. **Reaching for `math/rand` or `math/rand/v2` for "a random ID"**, which is the idiomatic-looking choice. Check: G404 (GO-SEC-02).
5. **Wiring a `--insecure` flag to `InsecureSkipVerify`**, copying oras. Check: G402 fires on the variable form too (GO-SEC-03).
6. **Decoding `resp.Body` or `r.Body` straight into `json.NewDecoder`**, or "fixing" `ParseMultipartForm` with a smaller `maxMemory`. Check: the GO-SEC-05 grep plus G120.
7. **Answering "don't hardcode the secret" by splitting or indirecting the literal**, or believing G101 misses only locals. Check: GO-SEC-08's grep; G101 misses composition at every scope [C-4].
8. **Using `text/template` for an HTML response**, because the file already imports it. Check: the GO-SEC-10 grep.
9. **Copying an `unsafe.String` zero-copy trick** without proving that the buffer is never mutated. Check: G103 plus the GO-SEC-06 grep and the ADR's mutation test.
10. **Comparing a bearer token with `==`.** Check: the GO-SEC-09 reading step.
11. **"Hardening" a stdlib regex against ReDoS.** Check: GO-SEC-11, which says not to.

## Open questions

**Owner decisions** (the program applies each default):
- **Amending GO-GATE-09/14 from GO-SEC.** Default: the go-gates drafters take GO-SEC-01's block verbatim (`presets: [comments]`, G304 excluded by name). GO-GATE-14's exclude list becomes G104, G115 and G304.
- **The `--insecure` contract for Go CLIs.** Default: no global flag. `--ca-file` plus an exact-host plaintext list, mirroring ocx. A CLI that must interoperate with oras-style `--insecure` maps it to "plaintext for the named host", never to skipping verification.
- **Is `Secret` in the SDK's public API?** Default: yes. `ocx.Secret` with `Reveal()`, and GO-API's sdk-surface cites GO-SEC-07.

**Subareas that deserve another round:**
- **gosec G7xx taint rules under the amended config.** Question: with the preset gone, do G701–G708 (for example G703, which fired on ko at `pkg/build/gobuild.go:436` [gates] §5) meet the ≤1 FP/10k admission bar on the 8 named exemplars, or does GO-GATE-14 need taint-rule excludes?
- **G204 volume on multi-spawn CLIs.** Question: GO-IO-13 is a CONSIDER for CLIs, and ko has 6 G204 hits in 9k LOC [C-3]. Is a per-call reasoned suppression acceptable for CLIs, or should CLIs also route through one spawn function?
- **`Secret` and json/v2.** Question: under the 1.27 default json/v2 (`GOEXPERIMENT=nojsonv2` opt-out), does `MarshalText` still govern `slog.JSONHandler` and `encoding/json` v1-API output for a nested `Secret`, including under `omitzero`/`omitempty`? And does a `MarshalJSONTo` method take precedence? [C-7] passed on 1.27.1 defaults only.

## Sub-artifacts

- [go-security/untrusted-input-and-crypto.md](go-security/untrusted-input-and-crypto.md): the wave-3 dive on M-I-04..09. It covers `crypto/rand` vs `math/rand`, TLS defaults and G402, G117 and constant-time comparison, the G101 scope correction, `html/template` vs `text/template` with the caddy SSTI counter-example, the `unsafe`/linkname/cgo policy, and input bounds (G120, decoders, RE2), with 11 fixture runs.

## Key sources

- https://pkg.go.dev/crypto/rand: `Text` (1.24), `Read` guarantees.
- https://pkg.go.dev/crypto/tls: `InsecureSkipVerify` semantics, the TLS 1.2 default minimum, default cipher suites and curves.
- https://pkg.go.dev/crypto/subtle: `ConstantTimeCompare`, `WithDataIndependentTiming`.
- https://pkg.go.dev/html/template: contextual autoescaping, "use instead of text/template whenever the output is HTML".
- https://pkg.go.dev/unsafe: the valid `Pointer` patterns and `unsafe.String`'s immutability contract.
- https://pkg.go.dev/regexp: RE2 syntax and the linear-time guarantee.
- https://pkg.go.dev/log/slog: `LogValuer`, and handler behaviour for nested values.
- https://go.dev/doc/go1.23: the `//go:linkname` linker restriction and `-checklinkname=0`.
- https://raw.githubusercontent.com/securego/gosec/master/RULES.md: the G101–G120, G4xx and G7xx roster with per-rule config.
- https://raw.githubusercontent.com/securego/gosec/master/rules/hardcoded_credentials.go: G101's node kinds, entropy gate and vendor regexes.
- https://raw.githubusercontent.com/securego/gosec/master/analyzers/form_parsing_limits.go: why `maxMemory` never silences G120.
- https://github.com/golangci/golangci-lint/blob/main/pkg/result/processors/exclusion_presets.go: the `common-false-positives` preset (G103, G204, G304). Read at `032d962e0399`.
- https://raw.githubusercontent.com/OWASP/Go-SCP/master/src/cryptographic-practices/pseudo-random-generators.md: an independent framing of the `math/rand` pitfall.
- https://go.dev/doc/security/best-practices: the Go team's security page. It covers govulncheck, fuzzing and vet, not crypto or secrets, which is a negative finding.
