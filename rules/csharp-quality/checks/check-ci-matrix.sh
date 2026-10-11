#!/usr/bin/env bash
# check-ci-matrix.sh [gha]: CS-CI-07, the workflow rules R1-R16, GitHub Actions only. Usage: [CONTRACT_VAR=NAME] [CI_SHAPE=ocx] [GJ=path/to/global.json] check-ci-matrix.sh <workflows-dir>
# R1 five native legs plus the exact-tag Alpine SDK image, all inside the job named test   R2 fail-fast: false on every job whose strategy: has a matrix:   R3 retired or retiring labels, and a -latest runs-on or os: item outside a job named canary
# R4 no forced roll-forward   R5 EXPECTED_TRIPLE passed   R6 permissions: at the top of the file, or on every job of it   R7 third-party actions pinned to a 40-hex SHA (or an image @sha256: digest); an actions/* or github/* action may sit on a version tag
# R8 an always() gate job   R9 no ignored exit code (an --ignore-exit-code 8 beside a step named "CS-TEST-11: at least one test ran" passes), and [mtp] only no VSTest-era flag   R10 contract tier armed ([cli-wrapper] only: runs when CONTRACT_VAR is set, else one SKIP line)
# R11 no floating Alpine SDK tag   R12 no NuGet cache unless keyed on a packages.lock.json hash with a locked restore (CS-BUILD-25, CS-BUILD-27)   R13 no continue-on-error on a test run step or a test job (CS-TEST-11; an upload or report step is not a test run), except a step with an id that a later step in the same job gates with steps.<id>.outcome and exit 1
# R14 timeout-minutes on every job   R15 every Alpine SDK tag starts with the global.json sdk.version (only when a dotnet/sdk: alpine tag exists; GJ, else <root>/global.json, else <root>/src/global.json, root = <workflows-dir>/../..; needs jq)
# R16 the ci-ok job needs exactly [test]
# R1, R5, R8 and R16 bind the reference shape: they run when some workflow has a `ci-ok` job or CI_SHAPE=ocx is set, and print one SKIP line otherwise.
# Comment lines are ignored; CRLF and a BOM are normalised first. R1, R5, R8 and R10 read the workflow file that holds the `ci-ok` job (the PR workflow); with
# CI_SHAPE=ocx and no `ci-ok` job R8 fails and R1, R5 and R10 read the whole directory.
# R10 is off unless CONTRACT_VAR is set: a [cli-wrapper] sets its own contract-tier switch (the reference consumer's is OCX_SDK_CONTRACT) and every
# gate file must then set it to '1'; any other repository leaves it unset and gets one SKIP line.
# Exit: 0 every rule holds (prints "OK all rules"); 1 at least one FAIL line printed; 2 the directory operand is missing or not a directory.
# Watched red on a bad workflow (15 FAIL lines, R13 added after), and green on the merged workflow (measured 2026-10-11).
set -u; dir="${1:-}"; fail=0
[ -n "$dir" ] || { echo 'usage: check-ci-matrix.sh <workflows-dir>' >&2; exit 2; }
[ -d "$dir" ] || { echo "check-ci-matrix: not a directory: $dir" >&2; exit 2; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
# a copy with CRLF and a BOM removed and every whole-line comment blanked (line numbers survive), so a comment never satisfies or trips a rule and a CRLF checkout does not defeat the job splitter
(cd "$dir" && find . -type f -print0) | while IFS= read -r -d '' f; do
  mkdir -p "$tmp/$(dirname "$f")"; tr -d '\r' < "$dir/$f" | sed -e '1s/^\xEF\xBB\xBF//' -e 's/^[[:space:]]*#.*$//' > "$tmp/$f"; done
bad() { echo "FAIL ${1//"$tmp"/$dir}"; fail=1; }
hits() { [ -n "$2" ] && { printf '%s\n' "${2//"$tmp"/$dir}" | sed "s/^/FAIL $1: /"; fail=1; }; return 0; }
gate=$(grep -rlE -e '^  ci-ok:[[:space:]]*$' "$tmp")
scope=${gate:-$tmp}
# the reference shape (R1, R5, R8, R16) binds a repository that has a ci-ok job or says CI_SHAPE=ocx; any other repository gets one SKIP line
shape=0; { [ -n "$gate" ] || [ "${CI_SHAPE:-}" = ocx ]; } && shape=1
[ "$shape" = 1 ] || echo "SKIP R1 R5 R8 R16: no ci-ok job under $dir (set CI_SHAPE=ocx to require the reference shape)"
# One awk prefix splits a workflow into its jobs (a two-space key under jobs:); the R1, R2, R14 and R16 END blocks judge a job on its own text.
# shellcheck disable=SC2016  # the awk programs are single-quoted on purpose
jobsplit='
  FNR == 1 { inj = 0; name = "" }
  /^jobs:/ { inj = 1; next }
  /^[^ \t#]/ { inj = 0; name = "" }
  inj && /^  [A-Za-z0-9_-]+:[ \t]*(#.*)?$/ { name = $1; sub(/:$/, "", name); key = FILENAME ":" name; order[++n] = key; jf[key] = FILENAME; jn[key] = name; next }
  inj && name != "" { body[key] = body[key] "\n" $0 }'
yml() { find "$@" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0; }
# R1: the legs live in the job named test (the one ci-ok needs), not anywhere in the file; R2: every job with a matrix sets fail-fast: false itself
# shellcheck disable=SC2086  # $scope is a list of workflow paths that carry no spaces
if [ "$shape" = 1 ]; then
  testjob=$(yml $scope | xargs -0 -r awk "$jobsplit"' END { for (i = 1; i <= n; i++) if (jn[order[i]] == "test") print body[order[i]] }')
  [ -n "$testjob" ] || bad "R1 no job named test"
  for pat in 'ubuntu-24\.04([^-.0-9]|$)' 'ubuntu-24\.04-arm' 'windows-2025([^-.0-9]|$)' 'windows-11-arm' 'macos-26([^-.0-9]|$)' 'sdk:[0-9]+\.[0-9]+\.[0-9]+-alpine'; do
    printf '%s\n' "$testjob" | grep -qE -e "$pat" || bad "R1 the test job misses a leg matching /$pat/"; done
fi
# a matrix counts only under the job's own four-space strategy: key (a job output named matrix is not one)
hits "R2 matrix without fail-fast: false" "$(yml "$tmp" | xargs -0 -r awk "$jobsplit"' END { for (i = 1; i <= n; i++) { k = order[i]; m = split(body[k], L, "\n"); st = 0; mx = 0
    for (j = 1; j <= m; j++) { if (L[j] ~ /^    strategy:/) st = 1; else if (L[j] ~ /^    [A-Za-z0-9_-]+:/) st = 0; else if (st && L[j] ~ /^      matrix:/) mx = 1 }
    if (mx && body[k] !~ /fail-fast:[ \t]*false/) print jf[k] ": job " jn[k] } }')"
hits "R3 retired-or-retiring label" "$(grep -rnE -e '(macos-(11|12|13|14)|ubuntu-(18|20|22)\.04|windows-2019)([^0-9]|$)' "$tmp")"
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
# only a runs-on or os: item is a label (a -latest inside a pwsh string, an env expression or a comparison is not one)
# and only in a job that runs dotnet test (a backticked mention in prose is not a run), outside a workflow whose only trigger is workflow_dispatch
# (a manual job gates nothing): a release, docs or housekeeping job may use -latest
latest='function flush() { if (nh > 0 && !manual && jt ~ /(^|[^`\\a-z-])dotnet[ \t]+test/) for (i = 1; i <= nh; i++) print H[i]; nh = 0; jt = "" }
  FNR == 1 { flush(); job = ""; inon = 0; wd = 0; other = 0; manual = 0 }
  /^on:/ { inon = 1 } /^[^ \t#o]/ || /^o[^n]/ { inon = 0 }
  inon && /workflow_dispatch/ { wd = 1 }
  inon && (/^  (push|pull_request|pull_request_target|schedule|workflow_call|workflow_run):/ || /^on:.*(push|pull_request|schedule|workflow_call|workflow_run)/) { other = 1 }
  /^jobs:/ { manual = (wd && !other) }
  /^  [A-Za-z0-9_-]+:[ \t]*$/ { flush(); job = $1 }
  { jt = jt "\n" $0 }
  /(ubuntu|windows|macos)-latest/ && job !~ /canary/ && (/^[ \t]*(-[ \t]+)?(runs-on|os)[ \t]*:/ || /^[ \t]*-[ \t]*["\047]?(ubuntu|windows|macos)-latest/) { H[++nh] = FILENAME ":" FNR ":" $0 }
  END { flush() }'
hits "R3 -latest label in a job that runs dotnet test, outside a canary job" "$(find "$tmp" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0 | xargs -0 -r awk "$latest")"
hits "R4 forced roll-forward" "$(grep -rnE -e 'DOTNET_ROLL_FORWARD|RollForward' "$tmp")"
# shellcheck disable=SC2086
{ [ "$shape" = 0 ] || grep -rqE -e 'EXPECTED_TRIPLE' $scope; } || bad "R5 no leg passes EXPECTED_TRIPLE"
# R6: a file sets permissions: at the top, or every job in it sets its own (a job-level block is the tighter form)
hits "R6 no top-level permissions: and a job without its own" "$(yml "$tmp" | xargs -0 -r awk "$jobsplit"' /^permissions:/ { top[FILENAME] = 1 } END { for (i = 1; i <= n; i++) { k = order[i]; if (!(jf[k] in top) && body[k] !~ /\n    permissions:/) print jf[k] ": job " jn[k] } }')"
hits "R7 unpinned third-party action (an actions or github first-party action may sit on a version tag)" "$(grep -rnE -e '^\s*-?\s*uses:\s+[^./]' "$tmp" | grep -vE -e '@[0-9a-f]{40}' -e '@sha256:[0-9a-f]{64}' -e 'uses:\s+(actions|github)/[^@ ]+@v?[0-9]')"
if [ "$shape" = 0 ]; then :
elif [ -n "$gate" ]; then
  # shellcheck disable=SC2086
  grep -qE -e 'if:\s*always\(\)' $gate || bad "R8 the ci-ok job has no always() gate"
else bad "R8 no ci-ok gate job"; fi
# R9: the exit-code-silencing half binds every repository; the VSTest-flag half binds [mtp] only, so a repository that references
# Microsoft.NET.Test.Sdk, xunit.runner.visualstudio or coverlet.collector (the cs-test-10 test) keeps its --logger and --collect
root="$dir/../.."
vstest=$(grep -rlE --include='*.csproj' --include='*.props' --include='*.targets' -e 'Include="(Microsoft\.NET\.Test\.Sdk|xunit\.runner\.visualstudio|coverlet\.collector)"' "$root" 2> /dev/null | grep -vE '/(bin|obj|node_modules)/' | head -1)
if [ -n "$vstest" ]; then r9='ignore-exit-code|TESTINGPLATFORM_EXITCODE_IGNORE'; else r9='--(blame|logger|collect)|ignore-exit-code|TESTINGPLATFORM_EXITCODE_IGNORE|vstest'; fi
# an --ignore-exit-code 8 passes beside a workflow step named "CS-TEST-11: at least one test ran" (the solution-level count of a filter fan-out)
i8='^$'; grep -rqF -e 'CS-TEST-11: at least one test ran' "$tmp" && i8='--ignore-exit-code 8([^0-9]|$)'
hits "R9 exit-code-silencing flag, or a VSTest-era flag in an [mtp] repository" "$(grep -rnE -e "$r9" "$tmp" | grep -vE -e "$i8")"
if [ -n "${CONTRACT_VAR:-}" ]; then
  # shellcheck disable=SC2086
  grep -rqE -e "${CONTRACT_VAR}:\s*'?\"?1" $scope || bad "R10 contract tier never armed (${CONTRACT_VAR}: '1')"
else echo "SKIP R10: CONTRACT_VAR is unset (a [cli-wrapper] names its contract-tier switch)"; fi
hits "R11 floating Alpine SDK tag" "$(grep -rnE -e 'dotnet/sdk:([0-9]+\.[0-9]+-|[a-z])' "$tmp")"
# R12: a NuGet cache (an actions/cache step that names nuget, or setup-dotnet with cache: true) is allowed only when keyed on a packages.lock.json hash AND the restore is locked
# (--locked-mode in a workflow, or RestoreLockedMode in a build file): CS-BUILD-25 adopts lock files "when CI caching must key on a lock hash"; any other cache restores past the CS-BUILD-27 source mapping.
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
r12='
  function flush(   t, c) { if (s != "") { t = tolower(s)
      c = (t ~ /actions\/cache(\/restore)?@/ && t ~ /nuget/) || (t ~ /setup-dotnet/ && t ~ /\n[ \t]*cache:[ \t]*["\047]?true/)
      if (c && ((t ~ /packages\.lock\.json/) == (mode == "keyed"))) print fn ":" sl ": " first }
    s = "" }
  FNR == 1 { flush() }
  /^[ \t]*-[ \t]+[A-Za-z-]+:/ { flush(); sl = FNR; first = $0 }
  { fn = FILENAME; s = s "\n" $0 }
  END { flush() }'
hits "R12 NuGet cache not keyed on a packages.lock.json hash (CS-BUILD-27: restore into an empty folder)" "$(find "$tmp" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0 | xargs -0 -r awk -v mode=unkeyed "$r12")"
keyed=$(find "$tmp" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0 | xargs -0 -r awk -v mode=keyed "$r12")
if [ -n "$keyed" ] && ! { grep -rqE -e '--locked-mode' -e 'RestoreLockedMode' "$tmp" || grep -rqE --include='*.csproj' --include='*.props' --include='*.targets' -e 'RestoreLockedMode' "$root" 2> /dev/null; }; then
  bad "R12 a lock-keyed NuGet cache with no locked restore (--locked-mode or RestoreLockedMode): ${keyed%%$'\n'*}"; fi
# R13: a step that runs dotnet test, a test-project dotnet run, dotnet-coverage collect or vstest-action with continue-on-error set to true or an expression (an upload or report step, coveralls or codecov included, is not a test run), and a
# job whose own (four-space) continue-on-error is set and whose body runs tests or whose key names tests or coverage. Steps start at a list item,
# jobs at a two-space key; a canary job that only builds passes. The one sanctioned step: it has an id and a later step in the same job reads
# steps.<id>.outcome and exits 1 (upload steps run after a failure, the job still fails); that gate step is detected, never printed.
# The second sanctioned form is a regenerate-and-commit baseline job: its workflow's only trigger is workflow_dispatch (a human starts it) and a
# later step of the same job runs git commit or git push, so the test step may fail without failing the job; push, pull_request, schedule,
# workflow_call and workflow_run triggers lose the exemption.
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
r13='
  function t(s) { return s ~ /dotnet[ \t]+(test|run[^\n]*test)|dotnet-coverage[ \t]+collect|uses:[ \t]*microsoft\/vstest-action/ }
  function flush(   i, j, id, ok, s) {
    for (i = 1; i <= ns; i++) { s = S[i]
      if (s ~ /continue-on-error:[ \t]*(true|.true.|\$\{\{)/ && t(s)) {
        id = ""
        if (match(s, /(^|\n)[ \t-]*id:[ \t]*[A-Za-z0-9_-]+/)) { id = substr(s, RSTART, RLENGTH); sub(/^.*id:[ \t]*/, "", id) }
        ok = 0
        if (manual) for (j = i + 1; j <= ns; j++) if (S[j] ~ /git[ \t]+(commit|push)/) ok = 1
        if (id != "") for (j = i + 1; j <= ns; j++) if (S[j] ~ ("steps\\." id "\\.outcome") && S[j] ~ /exit[ \t]+1/) ok = 1
        if (!ok) print fn ":" SL[i] ": " SF[i] } }
    ns = 0 }
  function judgejob() { if (jobcoe && !(manual && job ~ /git[ \t]+(commit|push)/) && (t(job) || jfirst ~ /(^|[^a-z])(test|tests|coverage)([^a-z]|$)/)) print fn ":" jstart ": job-level continue-on-error: " jfirst }
  FNR == 1 { flush(); judgejob(); seg = ""; job = ""; jobcoe = 0; inon = 0; wd = 0; other = 0; manual = 0 }
  /^on:/ { inon = 1 } /^[^ \t#o]/ || /^o[^n]/ { inon = 0 }
  inon && /workflow_dispatch/ { wd = 1 }
  inon && (/^  (push|pull_request|pull_request_target|schedule|workflow_call|workflow_run):/ || /^on:.*(push|pull_request|schedule|workflow_call|workflow_run)/) { other = 1 }
  /^jobs:/ { manual = (wd && !other) }
  /^  [A-Za-z0-9_-]+:[ \t]*$/ { flush(); judgejob(); job = ""; jobcoe = 0; jstart = FNR; jfirst = $0 }
  /^[ \t]*-[ \t]+[A-Za-z-]+:/ || /^  [A-Za-z0-9_-]+:[ \t]*$/ { ns++; SL[ns] = FNR; SF[ns] = $0; S[ns] = "" }
  { l = tolower($0); if (ns > 0) S[ns] = S[ns] "\n" l; job = job "\n" l; fn = FILENAME; if (l ~ /^    continue-on-error:[ \t]*(true|.true.|\$\{\{)/) jobcoe = 1 }
  END { flush(); judgejob() }'
hits "R13 continue-on-error on a test run step or a test job (CS-TEST-11)" "$(find "$tmp" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0 | xargs -0 -r awk "$r13")"
hits "R14 job without timeout-minutes" "$(yml "$tmp" | xargs -0 -r awk "$jobsplit"' END { for (i = 1; i <= n; i++) { k = order[i]; if (body[k] !~ /\n    timeout-minutes:/ && body[k] !~ /\n    uses:/) print jf[k] ": job " jn[k] } }')"
# R15: every Alpine SDK image tag starts with the global.json sdk.version (the exact pin of CS-CI-05); it runs only when a dotnet/sdk: tag exists.
# GJ names the global.json; unset, the build root (two levels above the workflows directory) and then its src/ are searched.
if grep -rqE -e 'dotnet/sdk:' "$tmp"; then
  gj="${GJ:-}"; for c in "$dir/../../global.json" "$dir/../../src/global.json"; do [ -n "$gj" ] || { [ -f "$c" ] && gj="$c"; }; done
  if ! command -v jq >/dev/null 2>&1; then bad "R15 needs jq on PATH"
  elif [ ! -f "$gj" ]; then bad "R15 no global.json (set GJ=<path>; looked in $dir/../.. and its src/: the exact SDK pin of CS-BUILD-21 lives there)"
  else
    ver=$(jq -r '.sdk.version // empty' "$gj")
    [ -n "$ver" ] || bad "R15 $gj has no sdk.version"
    hits "R15 Alpine SDK tag differs from global.json $ver" "$(grep -rnoE -e 'dotnet/sdk:[^ "\x27]+' "$tmp" | grep -v -e "dotnet/sdk:$ver-alpine")"
  fi
fi
# R16: ci-ok exists and needs exactly test, in the flow-list, scalar or block-list spelling
[ "$shape" = 1 ] && hits "R16 ci-ok does not need exactly [test]" "$(yml "$tmp" | xargs -0 -r awk "$jobsplit"' END {
  for (i = 1; i <= n; i++) { k = order[i]; if (jn[k] != "ci-ok") continue; seen = 1; list = ""
    m = split(body[k], L, "\n")
    for (j = 1; j <= m; j++) if (L[j] ~ /^    needs:/) { v = L[j]; sub(/^    needs:[ \t]*/, "", v); sub(/[ \t]*#.*$/, "", v)
      if (v != "") list = v; else for (q = j + 1; L[q] ~ /^      -/; q++) { x = L[q]; sub(/^      -[ \t]*/, "", x); list = list "," x } }
    gsub(/[^A-Za-z0-9_,-]/, "", list); sub(/^,/, "", list)
    if (list != "test") print jf[k] ": needs [" list "]" }
  if (!seen) print "no ci-ok job" }')"
[ "$fail" -eq 0 ] && echo "OK all rules"; exit "$fail"
