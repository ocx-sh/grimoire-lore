export const meta = {
  name: 'go-wave1-ground-and-scout',
  description: 'Go research program wave 1: five grounding audits over the lore catalog and a 35-repo Go exemplar corpus, and seven landscape scouts over the Go corpora',
  phases: [
    { title: 'Ground', detail: 'numbers-first audits of sibling config and a 35-repo exemplar corpus, with real tool runs' },
    { title: 'Scout', detail: 'seven corpus surveys that discover candidate topics' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/go'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/go-frame.md'
const EX = '/home/mherwig/.cache/research-lang/exemplars/go'
const RUN = '/home/mherwig/.cache/research-lang/go-tools/run.sh'
const DATE = '2026-09-26'

const PREAMBLE = (rationale) => `Model rationale: sonnet — ${rationale}

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program that makes an AI-agent fleet expert in Go and its ecosystem: the language as of Go 1.27, the go command and toolchain management, modules, go vet / staticcheck / golangci-lint, testing, concurrency and context, errors, the standard library's newer packages, performance tooling, security, release and distribution (goreleaser, ko, OCI images, signing, SBOM), and Bazel for Go (rules_go, gazelle). Its output becomes AI-agent configuration (a glob-scoped rule with a support directory, a go.mod rule, one to three skills, a bundle, and a Go depth file offered to the published bazel-quality set) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root and never cd to /home/mherwig/dev/grimoire-lore itself).
- Read the frame first, in full: ${FRAME}. It names the era hypotheses (Go 1.27.1 current, golangci-lint 2.14.0, staticcheck 2026.2.1), the future fleet consumers (an OCX SDK for Go mirroring /home/mherwig/dev/ocx-sdk-python; Go CLIs in the mould of the Rust repos /home/mherwig/dev/ocx and /home/mherwig/dev/grimoire; Go release artifacts the fleet mirrors), the orchestrator's hypotheses H1-H8, and the intended artifact set.
- THE FLEET HAS ZERO GO CODE (measured). Grounding runs against an EXEMPLAR CORPUS of 35 upstream repositories cloned depth-1 under ${EX}/<owner>__<repo> (kubernetes__kubernetes is a sparse, config-only checkout; the other 34 have full source). The frame's table records every SHA. Always cite <repo>@<sha12>:<path>:<line>.
- A REAL GO TOOLCHAIN is available: run anything as '${RUN} <command> [args]' (Go 1.27.1 plus staticcheck, golangci-lint v2.14.0, govulncheck, gofumpt, goimports, deadcode, modernize on PATH inside the wrapper; GOPATH, GOCACHE and GOMODCACHE live on disk under /home/mherwig/.cache/research-lang/go-tools). Never write build output or caches under /tmp or into an exemplar clone other than what the go command itself caches; never run 'go mod tidy', 'go get', 'go fix -w' or any writing command inside an exemplar (they mutate the clone). Read-only commands (go list, go vet, staticcheck, golangci-lint run, govulncheck, modernize without -fix) are fine; they download module dependencies into the shared on-disk cache, which is expected. Bound each tool run with 'timeout 600'.
- Sibling lore rule sets already exist under ${ROOT}/rules/ (rust-quality, rust-cargo, python-quality, python-packaging, typescript-quality, typescript-packaging, java-quality, kotlin-quality, gradle-build, maven-build, bazel-quality, docs-quality, css-theming) and skills under ${ROOT}/skills/. A Go topic that is really a generic docs, CI, or Bazel-core topic belongs to those sets — mark it covered-elsewhere.
- The orchestrator's hypotheses H1-H8 in the frame are HYPOTHESES to test, never premises. Contradicting one with evidence is the most valuable result you can produce.
- Do not read under any .agents/worktrees/ other than ${ROOT} itself, nor under node_modules/, vendor/ (unless measuring vendoring), .git/ objects. The only file you may create or modify is your own OUTPUT FILE.
- Date everything you write as researched ${DATE}. Flag anything Go-version-specific with the version it applies to.

ALREADY COVERED: nothing — this is the first wave of the Go program. Adjacent coverage: the sibling lore sets named above.
`

const GROUND_CONTRACT = (subject, path) => `You are producing a numbers-first audit of ${subject} so a later authoring pass is grounded in what is actually there.

Write ${path} with YAML frontmatter (title, agent, model, scope, method, date_researched: ${DATE}). 'method' must describe the exact commands used so every number is re-runnable; inline each command next to its result. Record the exemplar SHAs you measured (they are in the frame's table).

The orchestrator's hypotheses are HYPOTHESES, not premises. If the measurements contradict one, say so plainly and show the counts. That is the most valuable result this audit can produce.

Every claim needs a <repo>@<sha12>:<path>:<line> or file:line citation. Where docs and config disagree, say which one is authoritative in practice.

Counting discipline: exclude vendor/, testdata/, third_party/, and generated files (a first line matching 'Code generated .* DO NOT EDIT') unless the axis is about them, and say so. Report per-repo tables AND corpus totals; name the repos at both extremes. A grep count is a hypothesis — spot-read 3 hits per pattern to confirm the pattern measures what you claim, and report the false-positive rate you saw.

Structure: frontmatter, a table of contents, "## Headline numbers", one "## <axis>" section per numbered demand below (each with commands inline, tables over prose), "## Smells (ranked)", "## Patterns worth encoding", "## Contradictions of the frame", "## Gaps". Aim for 300-600 lines; density over prose.

Use read-only tools on every repository. Do not modify anything outside your output file. Return the structured receipt.`

const SCOUT_CONTRACT = (corpusName, path) => `You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert must be expert in, ranked by how much each changes real code quality.

YOUR CORPUS: ${corpusName}

OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, corpus, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone claim about what this corpus says matters.
4. "## Survey" — numbered subsections, one per source or source cluster actually read: what it argues or lists, with an inline markdown link to the exact URL read. Quote exact function names, analyzer names, lint names, check IDs, flags, env vars, directives, command lines, version numbers, numeric thresholds.
5. "## Candidate topics" — a table: topic (a QUESTION, not a subject area) | why it matters | source (URL) | already-covered? (yes/partial/no, against the sibling lore sets) | which surface it binds (lang / stdlib / concurrency / errors / testing / lint / toolchain / modules / release / bazel-go / cli / sdk / http / fs / security / perf / any) | priority for THIS project shape (P0-P3, one clause of justification). Aim for 30-50 candidates. Be exhaustive and specific. Include the topics that sound boring but bite: encoding and byte/rune handling, path handling and Windows, time and monotonic clocks, map iteration order and output determinism, resource cleanup and Close errors, cancellation, idempotency, on-disk format versioning, atomic file writes, signal handling, exit codes, locale-free formatting, GODEBUG behaviour changes, deprecation timelines.
6. "## Recent shifts seen in this corpus" — what changed in the last 18-24 months (Go 1.23 to 1.27, and the tools) and what older advice it invalidates, with the version and date.
7. "## Contested" — where sources disagree, and which way it is trending.
8. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 15 distinct sources, at least 8 primary (go.dev docs, the spec, release notes, proposals on github.com/golang/go/issues, the tool's own repository or docs, talk recordings or slides, papers).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub-hosted markdown (README, docs/, CHANGELOG, rule indexes, analyzer lists) prefer fetching the raw file verbatim with 'curl -sL https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path>' through Bash, because WebFetch returns a summary and a catalogue sweep needs the full list. Use 'gh api' for GitHub issue or PR lists where it helps (read-only). go.dev pages can be fetched with curl too; pkg.go.dev pages list every symbol.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE} (Go 1.27 era); flag historical-only guidance.
- A candidate is a question a rule could later answer with a verification command. "Concurrency" is a wave; "when must a goroutine launched by a library be owned by an errgroup or WaitGroup the caller can wait on, and how does a reviewer spot one that is not" is a topic.
- Do not modify any file other than your output file. Return the structured receipt with the candidate list as structured data.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline_numbers: { type: 'array', items: { type: 'string' } },
    top_smells: { type: 'array', items: { type: 'string' } },
    patterns_worth_encoding: { type: 'array', items: { type: 'string' } },
    contradictions_of_frame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline_numbers', 'top_smells', 'patterns_worth_encoding', 'contradictions_of_frame'],
}

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    primary_sources_count: { type: 'number' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          why: { type: 'string' },
          source: { type: 'string' },
          covered: { type: 'string', enum: ['yes', 'partial', 'no'] },
          surface: { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
        },
        required: ['slug', 'why', 'source', 'covered', 'surface', 'priority'],
      },
    },
    recent_shifts: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'sources_count', 'primary_sources_count', 'candidates', 'recent_shifts'],
}

const FULL_NOTE = `The 34 full-source clones are every directory under ${EX} except kubernetes__kubernetes. Loop with a shell for-loop over them and print a per-repo table for each axis.`

// ---------------------------------------------------------------- Ground
const GROUNDERS = [
  {
    key: 'config-inventory',
    prompt: `${PREAMBLE('inventory and faithful digesting of existing catalog config and fleet prior art; no judgment that becomes a rule')}
${GROUND_CONTRACT("the lore catalog's house conventions and the fleet prior art a Go set must fit", RESEARCH + '/go-audit/config-inventory.md')}

Measurement axes:
1. House conventions. For each of ${ROOT}/rules/rust-quality.md, java-quality.md, kotlin-quality.md, python-quality.md, typescript-quality.md, rust-cargo.md, gradle-build.md: frontmatter (globs, description), line count, number of index-owned rules, depth files (names and line counts), ID family scheme, routing table shape, verification cell shape, severity tiers. Read ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md and validation.md and run 'python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py --help'. Record exactly what a new rule, skill and bundle must satisfy to be published (publish.toml entry shape, bundles/*.toml shape, docs/<name>.md companion, assets/lore-<name>.svg mark, the taskfile.yml 'artifacts' task and how it passes --root and --allow-absent for a language the fleet does not contain — the JVM entries are the precedent).
2. The Bazel set's Go gap: ${ROOT}/rules/bazel-quality.md and rules/bazel-quality/java.md (the most recent per-language depth file): its structure, ID family, line count, what it defers to bazel-core depth files, and what a go.md must contain to slot in (routing row, family prefix). Grep the Bazel research corpus under ${RESEARCH}/bazel-* for every mention of rules_go, gazelle, go_deps, nogo, or 'golang' and quote it with file:line.
3. The SDK template: /home/mherwig/dev/ocx-sdk-python — README.md, pyproject.toml, src/ layout, the public API surface (count), how it wraps the ocx CLI (subprocess calls, cite), error and exit-code mapping, test and coverage gate, CI workflows, release. Summarise as a table: commitment | where stated | Go analogue to research (name the Go package or mechanism only when the analogue is obvious, else 'open').
4. The CLI contract a Go CLI must mirror: ${ROOT}/rules/rust-quality/cli-contract.md (exit codes, stdout/stderr discipline, TTY detection, signals, terminal-injection sanitising) — digest every rule ID with its one-line content; mark each as language-neutral (a Go CLI inherits it verbatim) or Rust-specific.
5. What the fleet expects of a Go-built RELEASE it mirrors: grep /home/mherwig/dev/ocx-mirror and /home/mherwig/dev/mirror-* (read-only, excluding target/ and node_modules/) for goreleaser, checksums.txt, sbom, cosign, '.tar.gz', 'linux_amd64', 'Darwin_x86_64' and similar asset-name conventions; quote the config that selects assets from upstream GitHub releases for golang/go, goreleaser, ko, crane, hugo. This is the fleet's real contract with Go release engineering.
6. docs-quality's tested-example material: ${ROOT}/skills/docs-instrument/references/ (grep -n -i ' go\\b\\|golang\\|Example' across it) — what it says for Go today, verbatim, and what is missing (Go example tests are a first-class doc mechanism).
7. Gaps: which concerns from the frame's domain list have NO existing config anywhere in the catalog. One line each.`,
  },
  {
    key: 'exemplar-code-shape',
    prompt: `${PREAMBLE('counting and measuring source shape across 34 exemplar repositories; volume work with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (source and module shape)', RESEARCH + '/go-audit/exemplar-code-shape.md')}

${FULL_NOTE} Measurement axes:
1. Module and package layout per repo: number of go.mod files (multi-module repos), top-level dirs (cmd/, internal/, pkg/, api/, tools/, hack/, test/), count of packages ('${RUN} go list ./... | wc -l' only where cheap; otherwise count directories containing non-test .go files), internal/ usage depth, pkg/ usage (and whether the repo's docs justify it), where main packages live. Non-test LOC and file count per repo; the 10 largest non-generated files across the corpus with a one-line cohesion judgment each.
2. Test placement: _test.go file count and LOC ratio to production; external test packages ('package foo_test') vs internal; testdata/ dirs; Example functions ('func Example'); fuzz targets ('func Fuzz'); benchmarks ('func Benchmark') and b.Loop vs 'for i := 0; i < b.N' counts.
3. Modern-language adoption (count per repo, and per 10k LOC): type parameters (func or type declarations with '[' type-param lists — design a grep and validate it), 'interface{}' vs 'any', iter.Seq / iter.Seq2 / range-over-func, range over int ('for i := range N' with a number or len), min(/max( builtins vs math.Min, slices./maps./cmp. package use vs sort.Slice / sort.Sort / sort.Strings, 'x/exp/slices' or 'x/exp/maps' imports, io/ioutil imports, math/rand vs math/rand/v2, 'rand.Seed', errors.Join, sync.OnceFunc/OnceValue, atomic.Int64 style types vs atomic.AddInt64 functions, strings.Cut, 'for _, x := range' followed by 'x := x' loop-var copies (post-1.22 dead code), unique., weak., os.Root, t.Context(), testing/synctest, wg.Go(.
4. Global state and init: func init() count per repo; package-level 'var' declarations of mutable non-error, non-sentinel values (design a heuristic and state its false-positive rate); panic( calls in non-test non-main code; os.Exit / log.Fatal outside main packages.
5. Build constraints and platform code: '//go:build' lines by tag (linux, windows, darwin, !windows, cgo, integration, e2e, custom tags), '// +build' legacy lines still present, _windows.go / _unix.go files, import "C" (cgo) count, unsafe imports, //go:linkname count, //go:generate directives (and the generators they call: stringer, mockgen, protoc, enumer, moq, counterfeiter, go-bindata, sqlc), //go:embed count.
6. Interfaces and API shape: exported identifiers per package (median, max), interfaces declared vs implemented where declared (consumer-side vs producer-side — sample 20 interfaces and classify), constructors returning interfaces vs concrete types (sample), functional options pattern ('type Option func' or 'Option interface') count, context.Context as a struct field.
7. RUN modernize (analyzer, no -fix) on these small and medium repos, each with 'cd <clone> && timeout 600 ${RUN} modernize ./... 2>&1 | tail -n +1': spf13__cobra, google__go-cmp, stretchr__testify, uber-go__zap, junegunn__fzf, ko-build__ko, oras-project__oras-go, regclient__regclient, urfave__cli, golang__vuln, charmbracelet__bubbletea, google__go-containerregistry. Tally diagnostics by category (the text after the position, e.g. 'Loop can be simplified using slices.Contains', 'for loop can be modernized using range over int'). This is the measured size of pre-modern idiom in real code (hypothesis H1). If a repo fails to load, record the error and move on.
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'exemplar-quality-gates',
    prompt: `${PREAMBLE('measuring lint, test and CI gate configuration across 35 exemplar repositories and running the linters; counts and commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (lint, static analysis, test and CI gates)', RESEARCH + '/go-audit/exemplar-quality-gates.md')}

Measure over ALL 35 clones under ${EX} (kubernetes is config-only, which is enough for this axis). Measurement axes:
1. golangci-lint config per repo: file name used (.golangci.yml / .yaml / .toml / .json, or elsewhere such as hack/golangci.yaml), 'version: "2"' present (v2 schema) or v1, 'linters: default:' value (none / standard / all / fast) or v1 'disable-all/enable-all', the enabled linters list, disabled linters, the linters-settings of note (govet enable-all, errcheck check-type-assertions / exclude-functions, revive rules, gocritic enabled-tags, staticcheck checks, gosec excludes, errorlint, wrapcheck, depguard rules, forbidigo patterns, nolintlint require-explanation/require-specific), 'formatters:' section (gofmt, gofumpt, goimports, gci, golines), exclusions (presets, generated, paths, rules count), issues max-issues-per-linter / max-same-issues / new-from-rev. Table: linter | repos enabling it | notable settings. Then which linters are enabled by >= 1/3 of configured repos — the de-facto consensus set (hypothesis H4).
2. Other analyzers: staticcheck.conf files and their checks lists; 'go vet' invocations in Makefiles / CI with flags; custom analyzers or nogo; revive.toml; gosec config; errcheck standalone; typos/misspell; editorconfig.
3. CI workflows (.github/workflows/*.yml and Makefile/Taskfile/magefile targets): go test flag census (-race, -shuffle=on, -count=1, -cover, -coverprofile, -covermode=atomic, -coverpkg, -timeout, -failfast, -p, -short, -tags), gotestsum usage, coverage upload or threshold enforcement (any fail-under?), govulncheck (action or command), fuzzing in CI (go test -fuzz with -fuzztime), benchmarks in CI (benchstat), actions/setup-go config (go-version vs go-version-file, cache, check-latest), the OS matrix (windows/macos present?), Go version matrix (how many versions, 'stable'/'oldstable'), 'go mod tidy' diff check, 'go generate' diff check, gofmt/goimports check. Table per repo.
4. Test-library census across the 34 full clones: imports of github.com/stretchr/testify (assert vs require vs suite vs mock), github.com/google/go-cmp/cmp, gotest.tools/v3, github.com/frankban/quicktest, github.com/onsi/ginkgo and gomega, github.com/matryer/is, go.uber.org/goleak, github.com/rogpeppe/go-internal/testscript, go.uber.org/mock or github.com/golang/mock, github.com/google/go-cmp/cmp/cmpopts, golden-file helpers (files named *.golden, a -update flag), testing/synctest, httptest, t.Parallel() call count, t.Setenv, t.TempDir, t.Cleanup, t.Context. Count test FILES importing each, per repo (hypothesis H5).
5. RUN the linters: for each of spf13__cobra, google__go-cmp, stretchr__testify, uber-go__zap, junegunn__fzf, ko-build__ko, oras-project__oras-go, regclient__regclient, urfave__cli, golang__vuln: 'cd <clone> && timeout 600 ${RUN} go vet ./... 2>&1 | tail -50' and 'timeout 600 ${RUN} staticcheck -f text ./... 2>&1' and, where the repo has its own .golangci config, 'timeout 900 ${RUN} golangci-lint run ./... 2>&1 | tail -60' (its OWN config; note v1 configs fail under v2 — record that as a finding). Tally staticcheck findings by check ID (SA*, S1*, ST1*, QF*, U1000) and go vet findings by analyzer. Then run once with a strict ad-hoc config on three repos (cobra, oras-go, ko): create the config OUTSIDE the clone under /home/mherwig/.cache/research-lang/go-tools/wave1-golangci-strict.yml with 'version: "2"', 'linters: default: all' and pass it with --config; tally findings by linter (--max-issues-per-linter=0 --max-same-issues=0 and '--output.text.path=stdout' or the v2 equivalent — check 'golangci-lint run --help'). This measures which linters are noise versus signal on well-maintained code: a linter that fires hundreds of times on cobra is noise for a MUST rule.
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'exemplar-runtime-posture',
    prompt: `${PREAMBLE('measuring error, context, concurrency, I/O and security patterns across 34 exemplar repositories; counts with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (runtime posture: errors, context, concurrency, I/O, security, observability)', RESEARCH + '/go-audit/exemplar-runtime-posture.md')}

${FULL_NOTE} For every axis, count in NON-TEST, NON-GENERATED code unless stated, per repo and per 10k LOC. Measurement axes:
1. Errors: fmt.Errorf with %w vs fmt.Errorf with %v or %s of an err value (design and validate the grep), errors.New sentinel declarations ('var Err' / 'Err... = errors.New'), custom error types (methods 'Error() string'), errors.Is / errors.As / errors.AsType calls, errors.Join, github.com/pkg/errors and golang.org/x/xerrors imports, '== io.EOF'-style direct comparisons vs errors.Is, 'err.Error()' string matching (strings.Contains(err.Error()), panic/recover use, ignored errors ('_ = ' of a call returning error, and bare calls to Close/Write/Flush without checking — design a heuristic). Show 3 exemplary and 3 poor error-handling snippets with citations.
2. Context: context.Background() and context.TODO() in non-main, non-test code; functions taking ctx not as first param; context.Context stored in struct fields; context.WithCancel/WithTimeout without a deferred cancel (heuristic); context.WithoutCancel, context.AfterFunc, context.WithCancelCause/Cause usage; signal.NotifyContext vs signal.Notify.
3. Goroutines and sync: 'go ' statements (go func / go x.y()) count; golang.org/x/sync/errgroup use and SetLimit; sync.WaitGroup and wg.Go; semaphores (x/sync/semaphore, buffered-channel semaphores); time.After inside for/select loops; time.Tick; sync.Mutex embedded in exported structs; sync.Map; atomic typed vs function; unbounded goroutine-per-item loops (heuristic: 'for ... {' followed within 3 lines by 'go func'); goleak usage in tests; channel close patterns.
4. Logging and observability: log/slog vs go.uber.org/zap vs github.com/rs/zerolog vs github.com/sirupsen/logrus vs log (stdlib) vs klog imports per repo (hypothesis H7); slog handlers configured; OpenTelemetry (go.opentelemetry.io) imports; prometheus client; expvar; net/http/pprof import (and whether it is behind a flag); runtime/debug.SetMemoryLimit / GOMEMLIMIT; automaxprocs (go.uber.org/automaxprocs) now redundant under Go 1.25 container-aware GOMAXPROCS.
5. HTTP client and server hygiene: http.Get / http.Post / http.DefaultClient uses (no timeout); &http.Client{ with Timeout set vs not; http.Server with ReadHeaderTimeout set vs not (gosec G112); io.LimitReader / http.MaxBytesReader; resp.Body.Close; io.ReadAll on network bodies; retries (hashicorp/go-retryablehttp, cenkalti/backoff); TLS: InsecureSkipVerify, MinVersion.
6. Processes and filesystem: exec.Command vs exec.CommandContext; cmd.WaitDelay and cmd.Cancel; shell invocations ('sh', '-c'); os.WriteFile; atomic write patterns (CreateTemp + Rename; github.com/google/renameio; natefinch/atomic); os.Root / OpenInRoot; filepath.IsLocal / filepath.Clean on archive paths; archive/tar and archive/zip extraction with and without traversal guards (the zip-slip shape); os.MkdirAll permissions (0o755 vs 0777); os.Chmod; file mode literals (0644 vs 0o644).
7. Security-sensitive APIs: math/rand used for tokens or keys; crypto/rand; crypto/subtle.ConstantTimeCompare; SQL built with fmt.Sprintf; html/template vs text/template for HTML; unsafe; reflect; os/exec with user input; hardcoded credentials heuristics; 'gosec' nolint annotations census (grep '//nolint:gosec' and '#nosec').
8. Time: time.Now() in non-test code vs an injected clock (clockwork, benbjohnson/clock, k8s.io/utils/clock); time.Since for durations; monotonic clock loss via Round(0) / serialisation; time zones (time.Local, LoadLocation).
End with a ranked smells list (smell | repos | count | citation) and a patterns-worth-encoding list (pattern | exemplar citation).`,
  },
  {
    key: 'exemplar-modules-and-release',
    prompt: `${PREAMBLE('measuring go.mod, dependency, release and distribution configuration across 35 exemplar repositories; counts with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (modules, dependencies, release engineering, distribution, Bazel-for-Go)', RESEARCH + '/go-audit/exemplar-modules-and-release.md')}

Measure over ALL 35 clones under ${EX}. Measurement axes:
1. go.mod census (every go.mod, excluding vendor/ and testdata/): the 'go' directive value distribution (1.21 / 1.22 / 1.23 / 1.24 / 1.25 / 1.26 / 1.27, with or without a patch component such as 1.24.0 vs 1.24), 'toolchain' directive present and its value (hypothesis H6), 'tool' directive and tool blocks (1.24+) vs tools.go with a '//go:build tools' constraint, 'godebug' directives, 'retract' blocks, 'replace' directives (local path vs module; count), 'exclude', direct vs indirect require counts, module path major version suffix (/v2+), 'ignore' directive (1.25+). go.work files committed (and go.work.sum); vendor/ directories committed (vendor/modules.txt).
2. Dependency posture: direct dependency count per root module; the most common direct dependencies across the corpus (top 30); presence of deprecated or archived modules (github.com/pkg/errors, github.com/golang/mock, golang.org/x/exp, github.com/satori/go.uuid, github.com/dgrijalva/jwt-go, github.com/ghodss/yaml, gopkg.in/yaml.v2 vs v3 vs sigs.k8s.io/yaml vs go.yaml.in/yaml/v3, github.com/gorilla/*, github.com/mitchellh/* archived modules, github.com/hashicorp/go-multierror now replaceable by errors.Join); cloud and heavy-weight deps. Run govulncheck on 6 repos with a root module: ko-build__ko, oras-project__oras, regclient__regclient, junegunn__fzf, restic__restic, google__go-containerregistry with 'cd <clone> && timeout 900 ${RUN} govulncheck ./... 2>&1 | tail -40' and record called vs imported-only findings (govulncheck distinguishes symbol-level reachability — record how many module-level findings were NOT reachable, which is the argument for govulncheck over module-level scanners).
3. Release engineering: .goreleaser.yml/.yaml files — 'version: 2' present, builds (env CGO_ENABLED=0, flags -trimpath, ldflags content: -s -w, -X main.version etc., mod_timestamp '{{ .CommitTimestamp }}', goos/goarch matrix), archives (formats, name_template), checksum, sboms (syft), signs (cosign keyless), docker / dockers_v2 / kos, brews / homebrew_casks, nfpms, snapcrafts, winget, scoops, release.draft/prerelease, changelog. Table per repo. Also .ko.yaml configs; Dockerfiles building Go (base images: scratch, distroless static, alpine; multi-stage; CGO; -trimpath); Makefile release/build targets with their go build flags.
4. Version stamping: -ldflags -X usage vs runtime/debug.ReadBuildInfo (Main.Version, Settings vcs.revision / vcs.time / vcs.modified) in code; '-buildvcs' flags; 'version' subcommands and what they print.
5. Supply chain in CI: goreleaser-action, slsa-framework/slsa-github-builder, actions/attest-build-provenance, cosign installs, SBOM generation, OpenSSF Scorecard workflow, pinned action SHAs vs tags (count per repo), dependabot/renovate config for gomod (and grouping).
6. Bazel for Go: which exemplars carry MODULE.bazel / WORKSPACE / BUILD.bazel with rules_go and gazelle (count BUILD files, gazelle directives '# gazelle:' census, go_deps / go_sdk extensions in MODULE.bazel, nogo config); in bazel-contrib__rules_go and bazelbuild__bazel-gazelle themselves, read docs/ and the README for the current recommended bzlmod setup and record the versions and the stated best practices verbatim with citations (this seeds the bazel-quality go.md offer).
7. Build constraints for distribution: CGO usage vs CGO_ENABLED=0 releases (which CLIs must ship cgo and why — e.g. sqlite, OS keychains); cross-compile targets (GOOS/GOARCH lists); GOAMD64/GOARM levels; windows/arm64 presence.
Headline numbers first. Every number with its command.`,
  },
]

// ---------------------------------------------------------------- Scout
const SCOUTS = [
  {
    key: 'canonical',
    corpus: `CANONICAL GUIDES — sweep tables of contents; every section, item and checklist entry is a candidate.
Survey (fetch each; enumerate its sections): the Go spec (go.dev/ref/spec, the sections added or changed since 1.21), Effective Go (and its own disclaimer about being dated), Go Code Review Comments (go.dev/wiki/CodeReviewComments), Go Test Comments (go.dev/wiki/TestComments), the Google Go Style Guide in all three parts (google.github.io/styleguide/go/guide, /decisions, /best-practices), the Go FAQ, the Go memory model (go.dev/ref/mem), Go doc comments (go.dev/doc/comment), Organizing a Go module (go.dev/doc/modules/layout), the module reference (go.dev/ref/mod) and the modules release workflow and version numbering docs, Go security best practices (go.dev/doc/security/best-practices), fuzzing (go.dev/doc/security/fuzz), PGO (go.dev/doc/pgo), diagnostics (go.dev/doc/diagnostics), the GC guide (go.dev/doc/gc-guide), the data race detector (go.dev/doc/articles/race_detector), 'Go toolchains' (go.dev/doc/toolchain), 'Go, backwards compatibility, and GODEBUG' (go.dev/doc/godebug), the Go blog's design posts index (go.dev/blog/all — enumerate the posts from 2022 onward and name the ones that set practice: error handling, iterators, range functions, generic aliases, slog, loopvar, telemetry, os.Root, synctest, json/v2, green tea GC, go fix modernizers), and the Go Proverbs. For each document record which sections are still current and which are superseded by a newer Go release.`,
  },
  {
    key: 'codified',
    corpus: `CODIFIED PRACTICE — rules somebody thought worth ENFORCING. Enumerate the complete catalogues, fetched not recalled.
Survey: the full go vet analyzer list for Go 1.27 (run 'go tool vet help' via ${RUN} and cross-check golang.org/x/tools/go/analysis/passes on pkg.go.dev, including analyzers that are in gopls but not in vet: modernize, the gopls analyzers list at go.dev/gopls/analyzers), staticcheck's complete check index (staticcheck.dev/docs/checks — every SA, S, ST, QF check with its one-liner, plus which are default-off and which are in the default set), golangci-lint v2's complete linter roster (golangci-lint.run/docs/linters — every linter, which are in the 'standard' default set, deprecated ones, formatters), gosec's rule list (G101-G6xx), revive's rule list, gocritic's checker list by tag (diagnostic / style / performance / security / experimental), errcheck / errorlint / wrapcheck / contextcheck / containedctx / noctx / bodyclose / sqlclosecheck / rowserrcheck / exhaustive / nilnil / nilerr / forcetypeassert / paralleltest / tparallel / thelper / usetesting / intrange / copyloopvar / perfsprint / sloglint / spancheck / protogetter behaviour, CodeQL's Go query suite (github/codeql go/ql/src — the security and correctness query list), the Uber Go Style Guide (github.com/uber-go/guide style.md — every section heading), and govulncheck's documented modes. Deliverable is coverage: for each catalogue, which checks catch mistakes an LLM-written diff characteristically makes, which are noise on idiomatic code, and which overlap. Run 'golangci-lint help linters' via ${RUN} for the installed roster (v2.14.0).`,
  },
  {
    key: 'practitioner',
    corpus: `PRACTITIONER WRITING — argued positions with the reasoning, and when the book rule is wrong.
Survey authors and outlets the community cites by name: Russ Cox (research.swtch.com; his Go-team design docs on compatibility, toolchains, telemetry, iterators), Rob Pike, Dave Cheney (errors, API design, 'Practical Go'), Mat Ryer ('How I write HTTP services in Go after 13 years', Grafana blog 2024), Teiva Harsanyi (100 Go Mistakes, the online companion 100go.co, and his 2024-2026 posts), Bill Kennedy / Ardan Labs (design philosophy, mechanical sympathy), Eli Bendersky (thegreenplace.net Go posts), Alex Edwards (alexedwards.net), Anton Zhiyanov (antonz.org — the interactive release notes for Go 1.23 through 1.27), Jonathan Amsterdam (slog, iterators), Filippo Valsorda (crypto, os.Root, FIPS, his newsletter), Michael Stapelberg, Axel Wagner (Merovius), Carlana Johnson, Bitfield Consulting (John Arundel), Applied Go, Redowan Delowar (rednafi.com), the Go Time / Cup o' Go podcasts show notes, GopherCon (US/EU/UK) 2024-2026 talk lists. Extract argued POSITIONS: interfaces at the consumer, accept interfaces return structs (and its critics), errors as values vs handling boilerplate proposals (the 2025 decision to stop pursuing syntax changes), package naming and layout (the 'no pkg/' argument, flat vs layered), dependency minimalism, testing style (table tests, no assertion libraries vs testify), functional options vs config structs, generics restraint, context misuse, logging with slog, project layout myths (golang-standards/project-layout is not official).`,
  },
  {
    key: 'failure',
    corpus: `FAILURE CORPUS — antipatterns, recurring review objections, postmortems, CVE shapes. This corpus finds what no curriculum lists.
Survey: 100 Go Mistakes (100go.co — sweep all 100 and mark each still-current or obsoleted by a Go release, e.g. loop-variable capture fixed in 1.22, time.After leak fixed in 1.23), the Uber study 'A Study of Real-World Data Races in Golang' (PLDI 2022 / Uber engineering blog), 'Understanding Real-World Concurrency Bugs in Go' (ASPLOS 2019, Tu et al.), goroutine-leak literature (uber-go/goleak docs; the Go 1.26/1.27 goroutine leak profile if it exists), the Go vulnerability database (vuln.go.dev / github.com/golang/vulndb reports — classify the recurring CWE shapes in stdlib and popular modules 2023-2026: path traversal, zip slip, decompression bombs, HTTP request smuggling, header injection, ReDoS, unbounded reads, TOCTOU in os, symlink following), Go postmortems and incident writeups (Cloudflare, Discord's switch away from Go and why, Uber, Grafana, Tailscale's blog on netip and GC, Datadog's Go memory and GC posts), recurring review objections in golang/go Gerrit CLs and in large repos (kubernetes review comments on error wrapping and context; tailscale code review norms; the Go team's 'CodeReviewComments' origin), nil interface vs nil pointer, typed nil errors, slice aliasing through append, map concurrent write fatal error, copying sync types (copylocks), defer in loops, shadowed err, unchecked Close on writable files, http.Response bodies not drained, json.Unmarshal into interface{} and number precision, time.Time comparison with ==, integer overflow in conversions (gosec G115), unkeyed struct literals across module boundaries, init order surprises, goroutines without cancellation in libraries, os.Exit skipping defers, log.Fatal in libraries, fmt.Sprintf for SQL, and LLM-specific failure reports where findable (hallucinated stdlib APIs, pre-generics idioms, outdated module layout).`,
  },
  {
    key: 'shifts',
    corpus: `RECENT SHIFTS — what changed in the last 18-24 months and what old advice it invalidates. Produce a 'use X not Y as of <version>' table.
Survey the release notes of Go 1.22, 1.23, 1.24, 1.25, 1.26 and 1.27 (go.dev/doc/go1.NN — fetch every one; 1.27 shipped August 2026, verify), the Go blog posts announcing them, the accepted-proposals stream for 2025-2026 (github.com/golang/go issues labelled Proposal-Accepted — use 'gh api' search), GODEBUG settings added or removed per release (go.dev/doc/godebug history), the deprecations and removals (io/ioutil status, reflect.SliceHeader/StringHeader, crypto/elliptic low-level, net/http/httputil ReverseProxy Director deprecation, math/rand globals, the x/exp packages promoted to std), and tool churn: golangci-lint v1 to v2 migration (golangci-lint.run/product/migration-guide), staticcheck release notes 2024-2026, gopls releases and the 'go fix' modernizer suite in Go 1.26, gofumpt, govulncheck, the 'tool' directive, GOTOOLCHAIN semantics, telemetry opt-in, the go.mod 'ignore' directive, testing/synctest GA, encoding/json/v2 status, container-aware GOMAXPROCS, the Green Tea GC, FIPS 140-3 module, os.Root, weak pointers, unique, iterators and the iter-returning functions in strings/bytes/maps/slices, sync.WaitGroup.Go, new(expr), errors.AsType, generic type aliases, and what 1.27 added. Ecosystem churn: github.com/pkg/errors retired, golang/mock archived for go.uber.org/mock, x/exp/slices and maps superseded, gorilla/mux status, logrus maintenance mode, zap vs slog, viper vs koanf, urfave/cli v3, cobra status, testify v2 plans, protobuf-go and grpc-go API changes, OpenTelemetry Go stability, automaxprocs redundancy. For each shift, name the agent-visible symptom: the stale idiom an LLM trained on older code would still emit.`,
  },
  {
    key: 'ecosystem-tooling',
    corpus: `ECOSYSTEM AND TOOLING — the go command, modules, build, release, CI, Bazel, codegen, docs, observability.
Survey the primary docs: 'go help' topics for the installed toolchain (run '${RUN} go help' and enumerate: build flags, buildconstraint, cache, environment, gopath, goproxy, importpath, modules, module-auth, packages, private, testflag, testfunc, vcs, buildjson, coverage), go.dev/ref/mod (MVS, go.sum, GOPROXY protocol, checksum database, GOPRIVATE/GONOSUMDB/GONOSUMCHECK/GOINSECURE, retract, major versions, workspaces, vendoring), 'go mod' and 'go work' subcommands, GOTOOLCHAIN, 'go tool' with the tool directive, go generate conventions (stringer, mockgen/go.uber.org/mock, protobuf with buf, sqlc, enumer), coverage for integration tests (go build -cover, GOCOVERDIR, go tool covdata), PGO (default.pgo), pprof and the execution tracer and runtime/trace FlightRecorder, runtime/metrics, reproducible builds (the Go toolchain's own reproducibility, -trimpath, -buildvcs, CGO and reproducibility), goreleaser docs (goreleaser.com — builds, archives, checksums, sboms, signs, kos, homebrew_casks since the brews deprecation, nfpms, SLSA/provenance, reproducible builds guide), ko (ko.build), cosign keyless, actions/setup-go (caching behaviour, go-version-file), golang/govulncheck-action, rules_go and gazelle under bzlmod (github.com/bazel-contrib/rules_go docs/go/core/bzlmod.md, gazelle README and directives), pkg.go.dev conventions and doc rendering, example tests as documentation, OpenTelemetry Go, Prometheus client_golang. For each, which decisions a project must make and which defaults are wrong.`,
  },
  {
    key: 'domain',
    corpus: `FLEET-SHAPED DOMAIN — the Go the fleet would write: CLIs that talk to OCI registries and manage content-addressed stores, and SDKs that wrap a CLI.
Survey: CLI construction and contract (spf13/cobra docs and its user guide, spf13/pflag, urfave/cli v3 docs, the Command Line Interface Guidelines at clig.dev, exit-code conventions in Go CLIs — gh's cmdutil exit codes, os.Exit and deferred cleanup, signal.NotifyContext and graceful shutdown, TTY detection with golang.org/x/term and mattn/go-isatty, NO_COLOR, stdout vs stderr, terminal-escape injection when printing untrusted strings, charmbracelet libraries for TUIs), OCI and registry clients (google/go-containerregistry's pkg/v1/remote and crane, oras-project/oras-go v2 content stores, regclient, containerd's content store, opencontainers/image-spec and distribution-spec Go types, digest verification with opencontainers/go-digest, auth via docker credential helpers), content-addressed and on-disk stores (atomic rename, fsync of file and directory, renameio, lock files with flock and Windows LockFileEx, os.Root for traversal-safe access, symlink handling, Windows path semantics, long paths, case-insensitive filesystems, file modes), HTTP client hygiene (timeouts per phase, retries with backoff and Retry-After, bounded body reads, redirect policy and credential leakage across hosts, proxy env, TLS), wrapping a CLI from Go (os/exec: CommandContext, Cancel, WaitDelay, process groups via SysProcAttr, stdout/stderr pipes deadlocks, exit-code extraction via exec.ExitError, environment inheritance, LookPath and the Go 1.19 relative-path security change), and SDK/library API design for a small typed client (functional options vs config struct, context on every call, typed errors mapped from exit codes, zero-dependency posture, API compatibility and gorelease/apidiff checks, semantic import versioning). Read the actual source of 3 of these libraries where a doc is thin. Compare with how the Rust fleet repos /home/mherwig/dev/ocx and /home/mherwig/dev/grimoire solve the same problem (read-only; cite file:line) so candidates name the Go analogue of an existing fleet contract.`,
  },
]

phase('Ground')
const grounds = GROUNDERS.map(g => () => agent(g.prompt, { label: 'ground:' + g.key, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' }))

phase('Scout')
const scouts = SCOUTS.map(s => () => agent(
  PREAMBLE('corpus survey and web reading; discovery, not decisions') + '\n' + SCOUT_CONTRACT(s.corpus, RESEARCH + '/go-topic-map/' + s.key + '.md'),
  { label: 'scout:' + s.key, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' }))

const results = await parallel([...grounds, ...scouts])
const out = { ground: {}, scout: {} }
GROUNDERS.forEach((g, i) => { out.ground[g.key] = results[i] })
SCOUTS.forEach((s, i) => { out.scout[s.key] = results[GROUNDERS.length + i] })
log('wave 1: ' + results.filter(Boolean).length + '/' + results.length + ' workers returned')
return out
