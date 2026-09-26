# Dated re-probes for a linter bump

Load this from step A6 of the go-upgrade procedure. Each probe re-proves one
fact that a GO-GATE or GO-ERR row states about a specific tool version, so a
bump that changes the fact is caught before the old wording keeps shipping.

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0 (built with
go1.27.1, bundled staticcheck 0.8.1) and standalone staticcheck 2026.2.1.

Contents: [How to run a probe](#how-to-run-a-probe) ·
[P1. Unattended fix safety](#p1-unattended-fix-safety) ·
[P2. errcheck receiver matching](#p2-errcheck-receiver-matching) ·
[P3. The gosec roster](#p3-the-gosec-roster) ·
[P4. QF1009 blocks](#p4-qf1009-blocks) ·
[P5. SA4023 and test files](#p5-sa4023-and-test-files) ·
[P6. Overlay completeness](#p6-overlay-completeness)

## How to run a probe

Put each probe's plant in its own scratch module outside the repository (`go
mod init example.com/probe`), because the plants reuse names. Copy the module's
own `.golangci.yml` into it, so the probe runs the settings the gate runs. Run the new tool version. A result that
matches the "measured" line means the rule text still holds. A result that
differs is the finding: record it against the rule ID named in the probe, and
change the pin only after the owning rule is revised.

## P1. Unattended fix safety

Re-proves GO-GATE-21: errorlint's `--fix` is unsafe, so it stays off the
unattended allowlist.

```go
package probe

// MyErr is a leaf error type.
type MyErr struct{}

func (*MyErr) Error() string { return "mine" }

// Classify inspects only the outermost error, by design.
func Classify(err error) string {
	switch err.(type) {
	case *MyErr:
		return "mine"
	default:
		return "other"
	}
}
```

```go
package probe

import (
	"fmt"
	"testing"
)

func TestClassifyOutermostOnly(t *testing.T) {
	if got := Classify(fmt.Errorf("wrapped: %w", &MyErr{})); got != "other" {
		t.Fatalf("Classify(wrapped) = %q, want %q", got, "other")
	}
}
```

```sh
golangci-lint run --enable-only=errorlint --fix ./...
go build ./... && go test ./...
```

Measured on v2.14.0: the fix run exits 0 and prints `0 issues.`, then
`go build` fails with `undefined: errors`. After `goimports -w`, `go test` fails
with `Classify(wrapped) = "mine", want "other"`, because `errors.As` walks the
wrap chain and the type switch did not. Exit 0 from both commands would mean the
fixer changed. The same plant under
`golangci-lint run --enable-only=misspell,whitespace --fix ./...` builds and
tests with exit 0, which is the allowlist behaving.

## P2. errcheck receiver matching

Re-proves GO-GATE-20: `exclude-functions` matches the declared receiver type,
so `(io.ReadCloser).Close` clears an HTTP body close and never a `*os.File`
close.

```go
package probe

import (
	"io"
	"net/http"
	"os"
)

// ReadFile leaves a read-only *os.File close unchecked: errcheck must still flag it.
func ReadFile(name string) ([]byte, error) {
	f, err := os.Open(name)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

// Get closes a declared io.ReadCloser: the exemption must clear it.
func Get(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
```

```sh
golangci-lint run --enable-only=errcheck ./...
```

Measured on v2.14.0: exactly one finding, ``Error return value of `f.Close` is
not checked``, exit 1, and nothing on `resp.Body.Close`. Any other result means
the matching changed. As a control, the same plant under a config whose only
exclusion is `(*os.File).Close` flags `resp.Body.Close` and silences `f.Close`.

## P3. The gosec roster

Re-proves GO-GATE-14: the excludes are exactly `G104`, `G115` and `G304`, and
each one is still load-bearing.

```go
package probe

import "os"

func Load(path string) ([]byte, error) { return os.ReadFile(path) }
```

Make a copy of the config with `gosec.excludes: []`, check it with
`golangci-lint config verify --config noexcl.yml`, then run both:

```sh
golangci-lint run --config noexcl.yml --default=none --enable-only=gosec ./...
golangci-lint run --default=none --enable-only=gosec ./...
```

Measured on v2.14.0: the no-excludes copy reports `G304: Potential file
inclusion via variable`, exit 1. The pinned config reports `0 issues.`, exit 0.
Then run the no-excludes copy over the real repository. Every hit of a rule ID
outside the old roster is new and is read by hand before the pin moves. Every
hit of `G104`, `G115` or `G304` is re-justified against GO-GATE-14's rationale.
Empty output from the no-excludes run on the plant means gosec dropped or
renamed G304.

## P4. QF1009 blocks

Re-proves the claim that staticcheck `QF1009` blocks alongside revive
`time-equal` (GO-LANG-07, GO-GATE-15).

```go
package probe

import "time"

func Same(a, b time.Time) bool { return a == b }
```

```sh
golangci-lint run --enable-only=staticcheck ./...
```

Measured on v2.14.0: `QF1009: probably want to use time.Time.Equal instead`,
exit 1. The twin with `a.Equal(b)` gives `0 issues.`, exit 0. Exit 0 on the
plant means QF1009 left the default `checks`. `time-equal` then carries the rule
alone, and nothing else changes.

## P5. SA4023 and test files

Re-proves the blind spot GO-ERR-05 depends on: SA4023 does not report an
impossible nil comparison that sits only in a `_test.go` file. Run it on every
staticcheck bump. The command is standalone staticcheck, and golangci-lint's
bundled copy was not probed.

```go
package probe

type MyErr struct{}

func (*MyErr) Error() string { return "boom" }

func do(fail bool) *MyErr {
	if fail {
		return &MyErr{}
	}
	return nil
}

// Run returns a nil *MyErr inside a non-nil error.
func Run(fail bool) error { return do(fail) }
```

```go
package probe

import "testing"

func TestRun(t *testing.T) {
	if Run(false) == nil {
		t.Log("never reached")
	}
}
```

```sh
staticcheck -tests=true -checks SA4023 ./...
```

Measured on staticcheck 2026.2.1: exit 0 with empty output, which is the blind
spot, not a pass. A positive control that moves the comparison into `p.go`
(`func OK() bool { return Run(false) == nil }`) reports `this comparison is never
true (SA4023)`, exit 1. When the test-only plant starts exiting 1, the blind
spot is closed: record it against GO-ERR-05, whose reading heuristic stays until
that rule is revised.

## P6. Overlay completeness

Re-proves GO-GATE-22 on the three golangci-lint files (`baseline.golangci.yml`,
`cli.golangci.yml`, `lib-sdk.golangci.yml`) wherever they are
maintained. `config verify` alone passes a fragment, so the superset check runs
beside it.

```sh
# Any "verify failed" line is the finding.
for f in baseline.golangci.yml cli.golangci.yml lib-sdk.golangci.yml; do
  golangci-lint config verify --config "$f" || echo "verify failed: $f"
done
```

```bash
# Any output is the finding: a baseline linter missing from an overlay.
en() { golangci-lint linters --config "$1" | sed -n '/^Enabled/,/^$/p' | grep -oE '^[a-z0-9_]+:' | sort; }
for overlay in cli.golangci.yml lib-sdk.golangci.yml; do
  comm -23 <(en baseline.golangci.yml) <(en "$overlay") | sed "s|^|$overlay missing |"
done
```

Measured on v2.14.0: all three files verify with exit 0 and the superset check
prints nothing. A v1-schema file in any slot prints its `verify failed` line. A five-linter fragment standing in for the library/SDK file also
verifies with exit 0, and the superset check prints one line for each baseline linter the fragment omits (the count depends on the fragment). Then count the `revive.rules` entries in each file: 3 in the baseline and
CLI files, 4 in the library/SDK file (GO-GATE-15).
