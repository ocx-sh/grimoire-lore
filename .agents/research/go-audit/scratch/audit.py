#!/usr/bin/env python3
"""Exemplar runtime-posture audit. Reads filelists/<repo>.txt (already filtered:
non-test, non-generated, non-vendor/testdata/third_party .go files), runs a battery
of line/window-based regex heuristics per axis, and emits:
  - results.tsv   : axis \t pattern \t repo \t count \t files_with_hit
  - citations/<pattern>.txt : up to 8 file:line:snippet hits per pattern, corpus-wide,
                              for spot-reading false positive rate.
Deterministic, read-only. Run: python3 scratch/audit.py
"""
import re, os, sys, collections

ROOT = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/scratch"
EXROOT = "/home/mherwig/.cache/research-lang/exemplars/go"
FILELISTS = os.path.join(ROOT, "filelists")
CITDIR = os.path.join(ROOT, "citations")
os.makedirs(CITDIR, exist_ok=True)

repos = sorted(f[:-4] for f in os.listdir(FILELISTS) if f.endswith(".txt"))

# repo -> list of (path, [lines])
data = {}
for repo in repos:
    with open(os.path.join(FILELISTS, repo + ".txt")) as fh:
        paths = [l.strip() for l in fh if l.strip()]
    files = []
    for p in paths:
        try:
            with open(p, errors="replace") as fh:
                lines = fh.read().split("\n")
        except OSError:
            continue
        files.append((p, lines))
    data[repo] = files

loc = {}
for repo, files in data.items():
    loc[repo] = sum(len(lines) for _, lines in files)

results = collections.defaultdict(lambda: collections.defaultdict(int))  # pattern -> repo -> count
filehits = collections.defaultdict(lambda: collections.defaultdict(int))  # pattern -> repo -> distinct files with >=1 hit
citations = collections.defaultdict(list)  # pattern -> [(repo, path, lineno, snippet)]
MAXCIT = 10

def relpath(p, repo):
    prefix = os.path.join(EXROOT, repo) + "/"
    return p[len(prefix):] if p.startswith(prefix) else p

def record(pattern, repo, path, lineno, snippet):
    results[pattern][repo] += 1
    citations[pattern].append((repo, relpath(path, repo), lineno, snippet.strip()[:160]))

PKG_MAIN_RX = re.compile(r'^\s*package\s+main\s*$')

def is_main_file(lines):
    for line in lines[:20]:
        if PKG_MAIN_RX.match(line):
            return True
        s = line.strip()
        if s and not s.startswith("//") and not s.startswith("/*"):
            # first non-comment, non-blank line should be the package clause
            if s.startswith("package "):
                return False
    return False

def line_scan(pattern, regex, skip_main=False):
    """Count regex matches, one per matching line (not overlapping count).
    skip_main=True excludes files whose package clause is `package main`
    (per task: some patterns are asked for in non-main, non-test code)."""
    seen_files = collections.defaultdict(set)
    for repo, files in data.items():
        for path, lines in files:
            if skip_main and is_main_file(lines):
                continue
            for i, line in enumerate(lines, 1):
                if regex.search(line):
                    record(pattern, repo, path, i, line)
                    seen_files[repo].add(path)
    for repo, s in seen_files.items():
        filehits[pattern][repo] = len(s)

def substr_import_scan(pattern, needle):
    """Count files containing a quoted import path containing `needle`."""
    rx = re.compile(r'"[^"\n]*' + re.escape(needle) + r'[^"\n]*"')
    for repo, files in data.items():
        cnt = 0
        for path, lines in files:
            for i, line in enumerate(lines, 1):
                if rx.search(line) and ('import' in line or line.strip().startswith('"') or True):
                    m = rx.search(line)
                    record(pattern, repo, path, i, line)
                    cnt += 1
                    break  # count file once
        filehits[pattern][repo] = cnt
        results[pattern][repo] = cnt  # for imports, "count" == files importing

def windowed_pair(pattern, regexA, regexB, window):
    """Count occurrences where a line matches regexA and one of the next `window` lines matches regexB."""
    seen_files = collections.defaultdict(set)
    for repo, files in data.items():
        for path, lines in files:
            n = len(lines)
            for i in range(n):
                if regexA.search(lines[i]):
                    lo, hi = i + 1, min(n, i + 1 + window)
                    for j in range(lo, hi):
                        if regexB.search(lines[j]):
                            record(pattern, repo, path, i + 1, lines[i] + "  //-->  " + lines[j].strip())
                            seen_files[repo].add(path)
                            break
    for repo, s in seen_files.items():
        filehits[pattern][repo] = len(s)

def brace_scan(pattern, trigger_rx, inner_rx, max_lines, present):
    """For each trigger match, scan forward counting braces (from first '{' on/after
    trigger line) until balanced or max_lines; record if inner_rx present==expected."""
    seen_files = collections.defaultdict(set)
    for repo, files in data.items():
        for path, lines in files:
            n = len(lines)
            for i in range(n):
                if trigger_rx.search(lines[i]):
                    depth = lines[i].count("{") - lines[i].count("}")
                    j = i
                    found_inner = bool(inner_rx.search(lines[i]))
                    steps = 0
                    while depth > 0 and j + 1 < n and steps < max_lines:
                        j += 1
                        steps += 1
                        depth += lines[j].count("{") - lines[j].count("}")
                        if inner_rx.search(lines[j]):
                            found_inner = True
                    ok = found_inner if present else (not found_inner)
                    if ok:
                        record(pattern, repo, path, i + 1, lines[i])
                        seen_files[repo].add(path)
    for repo, s in seen_files.items():
        filehits[pattern][repo] = len(s)

def defer_after(pattern, varname_rx, window, group=2):
    """context.WithCancel/WithTimeout/WithDeadline without a deferred cancel of the
    captured var within `window` lines. varname_rx group(`group`) = cancel-func var name."""
    seen_files = collections.defaultdict(set)
    total_triggers = collections.defaultdict(int)
    for repo, files in data.items():
        for path, lines in files:
            n = len(lines)
            for i in range(n):
                m = varname_rx.search(lines[i])
                if not m:
                    continue
                total_triggers[repo] += 1
                cancelvar = m.group(group)
                hi = min(n, i + 1 + window)
                found = False
                for j in range(i, hi):
                    if re.search(r'\bdefer\s+' + re.escape(cancelvar) + r'\s*\(', lines[j]):
                        found = True
                        break
                if not found:
                    record(pattern, repo, path, i + 1, lines[i])
                    seen_files[repo].add(path)
    for repo, s in seen_files.items():
        filehits[pattern][repo] = len(s)
    return total_triggers

# ---------------------------------------------------------------- axis 1: errors
def classify_errorf():
    """Single-line balanced-paren scan of fmt.Errorf(...) calls, classifying by
    whether %w is present (good) or a %v/%s formats a trailing err-named arg
    while %w is absent anywhere in the same call (poor: breaks errors.Is/As).
    Calls whose parens don't balance within one line (rare multi-line Errorf)
    are skipped — undercounts both patterns slightly; see Gaps."""
    trailer_rx = re.compile(r',\s*([\w.]*[Ee]rr[\w.]*(?:\(\))?)\s*\)\s*$')
    for repo, files in data.items():
        for path, lines in files:
            for i, line in enumerate(lines, 1):
                idx = line.find("fmt.Errorf(")
                if idx == -1:
                    continue
                start = idx + len("fmt.Errorf(") - 1  # index of '('
                depth = 0
                j = start
                in_str = False
                str_ch = ""
                esc = False
                end = -1
                while j < len(line):
                    c = line[j]
                    if in_str:
                        if esc:
                            esc = False
                        elif c == "\\":
                            esc = True
                        elif c == str_ch:
                            in_str = False
                    else:
                        if c in '"`':
                            in_str = True
                            str_ch = c
                        elif c == "(":
                            depth += 1
                        elif c == ")":
                            depth -= 1
                            if depth == 0:
                                end = j
                                break
                    j += 1
                if end == -1:
                    continue  # multi-line call, skip (see docstring)
                span = line[idx:end + 1]
                has_w = "%w" in span
                has_vs = ("%v" in span) or ("%s" in span)
                if has_w:
                    record("err.errorf_w", repo, path, i, line)
                elif has_vs and trailer_rx.search(span):
                    record("err.errorf_vs_of_err", repo, path, i, line)
    for pat in ("err.errorf_w", "err.errorf_vs_of_err"):
        for repo in data:
            filehits[pat][repo] = results[pat].get(repo, 0)

classify_errorf()
line_scan("err.sentinel_var", re.compile(r'^\s*(var\s+Err\w+|Err\w+\s*=\s*errors\.New)\b'))
line_scan("err.custom_type", re.compile(r'^\s*func\s*\([^)]*\)\s*Error\(\)\s*string\s*{'))
line_scan("err.errors_is", re.compile(r'\berrors\.Is\('))
line_scan("err.errors_as", re.compile(r'\berrors\.As(Type)?\('))
line_scan("err.errors_join", re.compile(r'\berrors\.Join\('))
substr_import_scan("err.pkgerrors_import", "github.com/pkg/errors")
substr_import_scan("err.xerrors_import", "golang.org/x/xerrors")
substr_import_scan("err.cockroachdberrors_import", "github.com/cockroachdb/errors")
line_scan("err.direct_eof_compare", re.compile(r'==\s*io\.EOF\b|io\.EOF\s*==\s*'))
line_scan("err.stringmatch", re.compile(r'strings\.Contains\([^)]*\.Error\(\)'))
line_scan("err.panic", re.compile(r'\bpanic\('))
line_scan("err.recover", re.compile(r'\brecover\(\)'))
line_scan("err.ignored_assign", re.compile(r'^\s*_\s*=\s*\w[\w.]*\('))
line_scan("err.bare_close", re.compile(r'^\s*(defer\s+)?\w[\w.]*\.(Close|Flush)\(\)\s*$'))
line_scan("err.bare_write", re.compile(r'^\s*\w[\w.]*\.Write\([^)]*\)\s*$'))

# ---------------------------------------------------------------- axis 2: context
line_scan("ctx.background", re.compile(r'context\.Background\(\)'))
line_scan("ctx.todo", re.compile(r'context\.TODO\(\)'))
line_scan("ctx.background_nonmain", re.compile(r'context\.Background\(\)'), skip_main=True)
line_scan("ctx.todo_nonmain", re.compile(r'context\.TODO\(\)'), skip_main=True)
line_scan("ctx.struct_field", re.compile(r'^\s*[A-Za-z_]\w*\s+context\.Context\s*(//.*)?$'))
line_scan("ctx.withoutcancel", re.compile(r'context\.WithoutCancel\('))
line_scan("ctx.afterfunc", re.compile(r'context\.AfterFunc\('))
line_scan("ctx.withcancelcause", re.compile(r'context\.WithCancelCause\('))
line_scan("ctx.cause", re.compile(r'context\.Cause\('))
line_scan("ctx.notifycontext", re.compile(r'signal\.NotifyContext\('))
line_scan("ctx.notify_plain", re.compile(r'signal\.Notify\('))
_defer_triggers = defer_after(
    "ctx.withcancel_nodefer",
    re.compile(r'(\w+)\s*,\s*(\w+)\s*:?=\s*context\.With(?:Cancel|Timeout|Deadline)\('),
    12,
)
line_scan("ctx.func_param_ctx_notfirst", re.compile(r'^func\s+(?:\([^)]*\)\s*)?\w+\([^)]*,\s*ctx\s+context\.Context'))

# ---------------------------------------------------------------- axis 3: goroutines/sync
line_scan("go.go_statement", re.compile(r'(^|[^.\w])go\s+(func\s*\(|[A-Za-z_][\w.]*\()'))
substr_import_scan("go.errgroup_import", "golang.org/x/sync/errgroup")
line_scan("go.errgroup_setlimit", re.compile(r'\.SetLimit\('))
line_scan("go.waitgroup", re.compile(r'sync\.WaitGroup\b'))
line_scan("go.errgroup_go_call", re.compile(r'\.Go\(func\(\)\s*error\b'))
line_scan("go.waitgroup_go_method", re.compile(r'\.Go\(func\(\)\s*\{'))
substr_import_scan("go.semaphore_import", "golang.org/x/sync/semaphore")
line_scan("go.chan_semaphore", re.compile(r'make\(chan\s+struct\{\}\s*,\s*\w+\)'))
line_scan("go.time_after", re.compile(r'time\.After\('))
line_scan("go.time_tick", re.compile(r'time\.Tick\('))
line_scan("go.mutex_embedded_exported", re.compile(r'^\s*sync\.Mutex\s*$'))
line_scan("go.mutex_field", re.compile(r'^\s*[A-Za-z_]\w*\s+sync\.(Mutex|RWMutex)\s*$'))
line_scan("go.syncmap", re.compile(r'sync\.Map\b'))
line_scan("go.atomic_typed", re.compile(r'atomic\.(Int32|Int64|Uint32|Uint64|Bool|Value|Pointer)\b'))
line_scan("go.atomic_func", re.compile(r'atomic\.(AddInt|AddUint|LoadInt|LoadUint|StoreInt|StoreUint|CompareAndSwap)\w*\('))
substr_import_scan("go.goleak_import", "go.uber.org/goleak")
line_scan("go.chan_close", re.compile(r'\bclose\(\w+\)'))
windowed_pair("go.forloop_go_within3", re.compile(r'for\b.*\{'), re.compile(r'\bgo\s+func\s*\('), 3)

# ---------------------------------------------------------------- axis 4: logging/observability
substr_import_scan("log.slog_import", "log/slog")
substr_import_scan("log.zap_import", "go.uber.org/zap")
substr_import_scan("log.zerolog_import", "github.com/rs/zerolog")
substr_import_scan("log.logrus_import", "github.com/sirupsen/logrus")
substr_import_scan("log.klog_import", "k8s.io/klog")
line_scan("log.stdlib_log_import", re.compile(r'^\s*"log"\s*$'))
line_scan("log.slog_handler", re.compile(r'slog\.New(JSONHandler|TextHandler)\('))
substr_import_scan("log.otel_import", "go.opentelemetry.io")
substr_import_scan("log.prometheus_import", "github.com/prometheus/client_golang")
line_scan("log.expvar_import", re.compile(r'^\s*"expvar"\s*$'))
line_scan("log.pprof_import", re.compile(r'net/http/pprof'))
line_scan("log.setmemorylimit", re.compile(r'debug\.SetMemoryLimit\('))
line_scan("log.gomemlimit_env", re.compile(r'GOMEMLIMIT'))
substr_import_scan("log.automaxprocs_import", "go.uber.org/automaxprocs")

# ---------------------------------------------------------------- axis 5: HTTP hygiene
line_scan("http.get_post_default", re.compile(r'\bhttp\.(Get|Post|Head|PostForm)\(|http\.DefaultClient\b'))
brace_scan("http.client_notimeout", re.compile(r'&http\.Client\{'), re.compile(r'Timeout:'), 15, present=False)
brace_scan("http.client_timeout", re.compile(r'&http\.Client\{'), re.compile(r'Timeout:'), 15, present=True)
brace_scan("http.server_no_readheadertimeout", re.compile(r'&http\.Server\{'), re.compile(r'ReadHeaderTimeout:'), 15, present=False)
brace_scan("http.server_readheadertimeout", re.compile(r'&http\.Server\{'), re.compile(r'ReadHeaderTimeout:'), 15, present=True)
line_scan("http.limitreader", re.compile(r'io\.LimitReader\(|http\.MaxBytesReader\('))
line_scan("http.body_close", re.compile(r'resp\.Body\.Close\(\)|\.Body\.Close\(\)'))
line_scan("http.readall_body", re.compile(r'io\.ReadAll\([^)]*\.Body\)'))
substr_import_scan("http.retryablehttp_import", "hashicorp/go-retryablehttp")
substr_import_scan("http.backoff_import", "cenkalti/backoff")
line_scan("http.insecureskipverify", re.compile(r'InsecureSkipVerify:\s*true'))
line_scan("http.tls_minversion", re.compile(r'MinVersion:\s*tls\.'))

# ---------------------------------------------------------------- axis 6: process/filesystem
line_scan("proc.exec_command", re.compile(r'exec\.Command\('))
line_scan("proc.exec_commandcontext", re.compile(r'exec\.CommandContext\('))
line_scan("proc.waitdelay", re.compile(r'\.WaitDelay\s*='))
line_scan("proc.cmd_cancel", re.compile(r'\bcmd\.Cancel\s*='))
line_scan("proc.shell_c", re.compile(r'exec\.Command(Context)?\(\s*"(/bin/)?(ba)?sh"\s*,\s*"-c"'))
line_scan("fs.os_writefile", re.compile(r'os\.WriteFile\('))
line_scan("fs.createtemp_rename", re.compile(r'os\.CreateTemp\('))
line_scan("fs.rename_pattern", re.compile(r'os\.Rename\('))
substr_import_scan("fs.renameio_import", "google/renameio")
substr_import_scan("fs.atomic_import", "natefinch/atomic")
line_scan("fs.os_root", re.compile(r'os\.OpenInRoot\(|os\.Root\b'))
line_scan("fs.filepath_islocal", re.compile(r'filepath\.IsLocal\('))
line_scan("fs.filepath_clean", re.compile(r'filepath\.Clean\('))
substr_import_scan("fs.archive_tar_import", "archive/tar")
substr_import_scan("fs.archive_zip_import", "archive/zip")
line_scan("fs.tar_traversal_guard", re.compile(r'strings\.Contains\([^)]*"\.\."\)|filepath\.IsLocal\(|!strings\.HasPrefix\('))
line_scan("fs.archive_extract_sites", re.compile(r'tar\.NewReader\(|zip\.OpenReader\(|zip\.NewReader\('))
windowed_pair(
    "fs.archive_extract_guarded",
    re.compile(r'tar\.NewReader\(|zip\.OpenReader\(|zip\.NewReader\('),
    re.compile(r'filepath\.IsLocal\(|filepath\.Clean\(|strings\.Contains\([^)]*"\.\."|ErrInsecurePath|zip[Ss]lip|filepath\.Rel\('),
    40,
)
line_scan("fs.mkdirall_0755", re.compile(r'os\.MkdirAll\([^)]*0[o]?755'))
line_scan("fs.mkdirall_0777", re.compile(r'os\.MkdirAll\([^)]*0[o]?777'))
line_scan("fs.chmod", re.compile(r'os\.Chmod\('))
line_scan("fs.mode_0644_legacy", re.compile(r'(?<![0-9oO])0644\b'))
line_scan("fs.mode_0o644", re.compile(r'0o644\b'))
line_scan("h1.ioutil_import", re.compile(r'^\s*"io/ioutil"\s*$'))

# ---------------------------------------------------------------- axis 7: security-sensitive
line_scan("sec.mathrand_import", re.compile(r'^\s*"math/rand"\s*$'))
line_scan("sec.mathrandv2_import", re.compile(r'^\s*"math/rand/v2"\s*$'))
substr_import_scan("sec.cryptorand_import", "crypto/rand")
line_scan("sec.constanttimecompare", re.compile(r'subtle\.ConstantTimeCompare\('))
line_scan("sec.sql_sprintf", re.compile(r'fmt\.Sprintf\([^)]*(SELECT|INSERT|UPDATE|DELETE)\b', re.IGNORECASE))
substr_import_scan("sec.htmltemplate_import", "html/template")
substr_import_scan("sec.texttemplate_import", "text/template")
line_scan("sec.unsafe_import", re.compile(r'^\s*"unsafe"\s*$'))
line_scan("sec.reflect_import", re.compile(r'^\s*"reflect"\s*$'))
line_scan("sec.nolint_gosec", re.compile(r'//\s*nolint:gosec|#nosec\b'))

# ---------------------------------------------------------------- axis 8: time
line_scan("time.now", re.compile(r'\btime\.Now\('))
line_scan("time.since", re.compile(r'\btime\.Since\('))
line_scan("time.round0", re.compile(r'\.Round\(0\)'))
line_scan("time.local", re.compile(r'\btime\.Local\b'))
line_scan("time.loadlocation", re.compile(r'time\.LoadLocation\('))
substr_import_scan("time.clockwork_import", "jonboulle/clockwork")
substr_import_scan("time.benbjohnson_clock_import", "benbjohnson/clock")
substr_import_scan("time.k8sutilsclock_import", "k8s.io/utils/clock")

# ---------------------------------------------------------- write results
with open(os.path.join(ROOT, "results.tsv"), "w") as out:
    out.write("pattern\trepo\tcount\tfiles_with_hit\tloc\tper10k\n")
    for pattern in sorted(results):
        for repo in repos:
            c = results[pattern].get(repo, 0)
            fh = filehits[pattern].get(repo, 0)
            l = loc[repo]
            per10k = round(c * 10000 / l, 3) if l else 0.0
            out.write(f"{pattern}\t{repo}\t{c}\t{fh}\t{l}\t{per10k}\n")

with open(os.path.join(ROOT, "loc_summary.tsv"), "w") as out:
    out.write("repo\tloc\n")
    for repo in repos:
        out.write(f"{repo}\t{loc[repo]}\n")
    out.write(f"TOTAL\t{sum(loc.values())}\n")

for pattern, cits in citations.items():
    with open(os.path.join(CITDIR, pattern + ".txt"), "w") as out:
        for repo, path, lineno, snippet in cits[:200]:
            out.write(f"{repo}:{path}:{lineno}: {snippet}\n")

print("repos:", len(repos), "total LOC:", sum(loc.values()))
print("patterns:", len(results))
