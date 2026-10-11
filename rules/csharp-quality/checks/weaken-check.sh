#!/usr/bin/env bash
# weaken-check.sh: CS-CORE-01, lines a change adds that weaken a check and gate lines it removes.
# Usage: BASE=origin/main bash weaken-check.sh [dir]   (dir defaults to "."; run it from inside the repository; BASE = the merge target)
# Output: one "FILE: +added line" or "FILE: -removed line" per hit, or "FILE: <why>" for the severity and generated_code hits.
# Every printed line needs a one-line written reason in the pull request. Empty output is a pass.
# What prints (the CS-CORE-01 list):
#   NoWarn or nowarn carrying any code (NU1900-NU1905 included, CS-BUILD-26), WarningsNotAsErrors carrying any code but NU1900-NU1905 (outside *.cs),
#     also on the continuation lines of a multi-line NoWarn or WarningsNotAsErrors element (read from the working tree);
#     a $(NoWarn.Replace(...)) or $(NoWarn.Remove(...)) expression removes codes and is a tightening, so it is not read;
#   #pragma warning disable with no reason (a trailing // comment), or [SuppressMessage] / [UnconditionalSuppressMessage] with no Justification = "..." or
#     Justification = <constant> (anywhere in the attribute: an added attribute that spans up to 8 lines is joined first; a SuppressMessage that sits inside a string literal is generator text); empty and placeholder reasons such as TODO or <Pending>, a comment that only
#     restates the diagnostic's title or message (the text a "suppress" quick fix writes, e.g. // Type or member is obsolete) and a comment that is only the
#     diagnostic ID count as none;
#   dotnet_diagnostic / dotnet_analyzer_diagnostic severity lowered, newly set to none, silent, suggestion or default, or its line deleted;
#   a deleted BannedSymbols*.txt entry or AdditionalFiles line; TreatWarningsAsErrors false (also with a Condition) or -warnaserror-;
#   SuppressTrimAnalysisWarnings true (it hides every IL2xxx and IL3xxx diagnostic of the project); EnableTrimAnalyzer, EnableAotAnalyzer, EnableSingleFileAnalyzer,
#     EnableNETAnalyzers, RunAnalyzers, RunAnalyzersDuringBuild or EnforceCodeStyleInBuild set to false (element or `Name=false`); AnalysisMode or AnalysisLevel set to
#     none, minimum or default; a numeric WarningLevel of three digits or fewer (a pinned warning wave); `if: false` on a workflow step or job;
#   --ignore-exit-code, TESTINGPLATFORM_EXITCODE_IGNORE, continue-on-error true, `dotnet ... || true`; a continue-on-error in a workflow file that also
#     gates on a step `outcome` (`steps.<id>.outcome`) is the sanctioned pair of csharp-quality Conventions and is not printed;
#   an added rollForward, allowPrerelease or version line in a global.json;
#   generated_code = true under a section that is none of: an obj/ glob, the committed-generator-output section
#     `[**/*.{Designer,designer,generated,Generated}.cs]`, the two vendored-directory sections and `[*_AssemblyInfo.cs]` of analyzers.editorconfig; #nullable disable (plain or `disable warnings`); <Nullable>disable or <Nullable>annotations (not in *.fsproj or *.vbproj);
#   #if false in a *.cs or *.csx file; [Ignore("TODO")] or [Skip("...")] with an empty or placeholder reason, and a Justification that is a placeholder such as "Reviewed." or "Fine.";
#   a dotnet test or dotnet format line that a workflow, script or Cake file loses or comments out without adding one back (an edited line nets zero);
#   Skip as an attribute argument (`(Skip = ""`, `, Skip = null`) with an empty or placeholder reason, and [Ignore] or [Skip] taking its reason from a trailing // comment;
#     a file that loses more [Fact], [Theory], [Test], [TestCase], [TestMethod] or [DataTestMethod] lines than it adds (an edited attribute line nets zero).
# Not printed: #nullable enable or restore in any form; `#nullable disable annotations` with a same-line // reason (the public-API pair of csharp-quality Conventions);
#   a BOM before a first-line directive is stripped, so it hides nothing.
# CRLF files: a trailing carriage return is stripped before any rule reads the line, so `severity = none\r` is read as `none`.
# Not read: an extensionless script, an attribute spread over more than 8 added lines or whose first line is not in the diff, and the paths
#   the diff leaves out: `.claude`, `.agents`, `obj/`, snapshot output (*.verified.*, *.received.*, a *snapshots* path) and vendored trees (ThirdParty, third_party,
#   vendor, submodules, eng/common). A weakening there is the vendor's, and generated output is not edited by hand.
# Exit: 0 and no output = nothing weakened; 1 = at least one line printed; 64 BASE unset; 66 BASE does not resolve, dir is
#       not a directory, or the diff failed (a shallow clone: fetch the merge target with full history, fetch-depth: 0 in CI).
# The diff is merge-base scoped (a branch behind main is not charged for main's edits) and sees committed, uncommitted and
# untracked files (`git add -N` marks new files, in a throwaway copy of the index: your own index and stash are untouched).
# Needs git 2.30 or newer. Watched red on one planted commit per item and green on a clean commit (measured 2026-10-11, git 2.54);
# the round-2 changes (joined attributes, BOM, snapshot and vendored paths, [Ignore] comments, #nullable forms, restated messages) were watched red and green on planted
# commits and re-run over the five round-2 trees; the round-3 shapes (analyzer switches, AnalysisMode, WarningLevel, Nullable annotations, multi-line NoWarn, `if: false`,
# a removed or commented dotnet test step, #if false, [Ignore("TODO")], placeholder Justification, CRLF) were watched red on one plant and green on its twin, and the four
# round-3 trees print only added lines (the CommandLineUtils AOT sample, Ocelot's "Reviewed." and WarningLevel 8).
set -u
[ -n "${BASE:-}" ] || { echo 'weaken-check: set BASE to the merge target, for example origin/main' >&2; exit 64; }
cd "${1:-.}" 2> /dev/null || { echo "weaken-check: not a directory: ${1:-.}" >&2; exit 66; }
git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || { echo "weaken-check: BASE does not resolve: $BASE" >&2; exit 66; }
idx=$(mktemp)
rm -f "$idx"
cp "$(git rev-parse --git-path index)" "$idx" 2> /dev/null || :
export GIT_INDEX_FILE=$idx
git add -N . > /dev/null
raw=$(mktemp)
out=$(mktemp)
gen=$(mktemp)
trap 'rm -f "$raw" "$out" "$gen" "$idx"' EXIT
og=$(git ls-files -z -- '*.yml' '*.yaml' | xargs -0 -r grep -lE 'steps\.[A-Za-z0-9_-]+\.outcome' | tr '\n' '\t')
git diff -U0 --relative --merge-base "$BASE" -- '*.cs' '*.csproj' '*.fsproj' '*.vbproj' '*.props' '*.targets' '*.editorconfig' '*.globalconfig' '*.rsp' \
  '*.yml' '*.yaml' '*.sh' '*.ps1' '*.cmd' '*.bat' '*.cake' '*.csx' '*akefile*' '*[Jj]ustfile' 'BannedSymbols*.txt' '*global.json' ':(exclude).claude' ':(exclude).agents' \
  ':(exclude,glob)**/obj/**' ':(exclude,glob)**/*.verified.*' ':(exclude,glob)**/*.received.*' ':(exclude,glob)**/*[Ss]napshots*' ':(exclude,glob)**/*[Ss]napshots*/**' \
  ':(exclude,glob,icase)**/thirdparty/**' ':(exclude,glob,icase)**/third_party/**' ':(exclude,glob,icase)**/vendor/**' ':(exclude,glob)**/submodules/**' ':(exclude,glob)eng/common/**' > "$raw" || { echo 'weaken-check: git diff failed' >&2; exit 66; }
# Pass 1: join an added attribute that opens a parenthesis it does not close (up to 8 more added lines), so a Justification = or Skip = on a later line is read with it.
# shellcheck disable=SC2016  # the awk programs are single-quoted on purpose
LC_ALL=C awk '
  function bal(s,  t, o, c) { t = s; gsub(/@?"([^"\\]|\\.)*"/, "", t); o = gsub(/\(/, "", t); c = gsub(/\)/, "", t); return o - c }
  function flush() { if (acc != "") { print acc; acc = "" } }
  /^diff --git / { flush(); hdr = 1; cs = 0; print; next }
  /^@@/ { flush(); hdr = 0; print; next }
  hdr { if ($0 ~ /^\+\+\+ .*\.cs\t?$/) cs = 1; print; next }
  { if (acc != "") { if (substr($0, 1, 1) == "+") { acc = acc " " substr($0, 2); d += bal(substr($0, 2)); if (d <= 0 || ++n >= 8) flush(); next } flush() }
    if (cs && substr($0, 1, 1) == "+" && substr($0, 2) ~ /^[[:space:]]*\[[A-Za-z]/ && (d = bal(substr($0, 2))) > 0) { acc = $0; n = 0; next }
    print }
  END { flush() }
' "$raw" | LC_ALL=C awk -v gen="$gen" -v og="$og" '
  BEGIN { BOM = sprintf("%c%c%c", 239, 187, 191); split("typeormemberisobsolete missingxmlcommentforpubliclyvisibletypeormember convertingnullliteralorpossiblenullvaluetononnullabletype possiblenullreferenceassignment dereferenceofapossiblynullreference possiblenullreferencereturn possiblenullreferenceargument unboxingapossiblynullvalue cannotconvertnullliteraltononnullablereferencetype nonnullablefieldmustcontainanonnullvaluewhenexitingconstructor nonnullablepropertymustcontainanonnullvaluewhenexitingconstructor adefaultexpressionintroducesanullvalueforatypeparameter parametermusthaveanonnullvaluewhenexitinginsomecondition nullabilityofreferencetypesintypeofparameterdoesntmatchimplicitlyimplementedmemberpossiblybecauseofnullabilityattributes thevariableisdeclaredbutneverused thevariableisassignedbutitsvalueisneverused becausethiscallisnotawaitedexecutionofthecurrentmethodcontinuesbeforethecalliscompleted fieldisneverassignedtoandwillalwayshaveitsdefaultvalue specifyiformatprovider specifycultureinfo specifystringcomparisonforclarity avoidzerolengtharrayallocations considercallingconfigureawaitontheawaitedtask donotcatchgeneralexceptiontypes validateargumentsofpublicmethods markmembersasstatic identifiersshouldnotcontainunderscores identifiersshouldnotmatchkeywords disposeobjectsbeforelosingscope removeunnecessarysuppression constantsandliteralsshouldbetheexpectedargument thetypecannotbeusedastypeparameterinthegenerictypeormethodnullabilityoftypeargumentdoesntmatchconstrainttype", T, " ") }
  function title(r,  i) { r = tolower(r); gsub(/[^a-z0-9]+/, "", r); for (i in T) if (index(r, T[i]) == 1 && length(r) <= length(T[i]) + 12) return 1; return 0 }
  function gated(f) { return index("\t" og, "\t" f "\t") > 0 }
  function lvl(v) { v = tolower(v); return v == "error" ? 4 : v == "warning" ? 3 : v == "suggestion" || v == "default" ? 2 : v == "silent" ? 1 : v == "none" ? 0 : 3 }
  function weak(r,  q) { q = r; gsub(/\047[^\047 ]*\047/, "", q); if (title(q)) return 1; r = tolower(r); gsub(/[^a-z0-9<>]+/, "", r); return length(r) < 4 || r ~ /^(todo|tbd|fixme|wip|skip|skipped|flaky|ignore|ignored|temp|disabled|broken|pending|<pending>|reviewed|okay|fine|suppressed|justified|intentional|none|wontfix|accepted|approved|checked)$/ }
  function idonly(r, ids,  t, n, a, i) { t = tolower(r); n = split(tolower(ids), a, /[^a-z0-9]+/); for (i = 1; i <= n; i++) if (a[i] ~ /^[a-z]*[0-9]+$/) gsub(a[i], "", t); return weak(t) }
  function trail(b,  r) { r = ""; if (match(b, /\/\/.*/)) r = substr(b, RSTART + 2); return r }
  function hit(m) { print file ": " m }
  { sub(/\r$/, "") }
  /^diff --git / { hdr = 1; next }
  /^@@/ { hdr = 0; if (match($0, /\+[0-9]+/)) nl = substr($0, RSTART + 1, RLENGTH - 1) + 0; next }
  hdr && /^--- / { if ($0 !~ /^--- \/dev\/null/) { file = substr($0, 7); sub(/\t$/, "", file) } next }
  hdr && /^\+\+\+ / { if ($0 !~ /^\+\+\+ \/dev\/null/) { file = substr($0, 7); sub(/\t$/, "", file) } next }
  hdr { next }
  { cs = (file ~ /\.csx?$/); sign = substr($0, 1, 1); body = substr($0, 2); sub(/\r$/, "", body); if (index(body, BOM) == 1) body = substr(body, 4); lc = tolower(body); if (sign == "+") { ln = nl; nl++ } }
  !cs && body !~ /^[[:space:]]*(#|\/\/|::|rem[[:space:]])/ && lc ~ /dotnet(\.exe)?"? +(test|format)([[:space:]]|$)/ && file ~ /\.(ya?ml|sh|ps1|cmd|bat|cake|csx)$|akefile|[Jj]ustfile$/ { if (sign == "-") { rmS[file]++; rmsl[file] = $0 } else if (sign == "+") addS[file]++ }
  sign == "-" && !cs && file ~ /BannedSymbols[^\/]*\.txt$/ && body ~ /[^[:space:]]/ && body !~ /^[[:space:]]*(\/\/|#)/ { hit($0); next }
  sign == "-" && !cs && body ~ /AdditionalFiles/ { hit($0); next }
  sign == "-" && cs && body ~ /^[[:space:]]*\[(Fact|Theory|Test|TestCase|TestMethod|DataTestMethod)[],( ]/ { rmT[file]++; rml[file] = $0; next }
  sign == "+" && cs && body ~ /^[[:space:]]*\[(Fact|Theory|Test|TestCase|TestMethod|DataTestMethod)[],( ]/ { addT[file]++ }
  sign == "-" && body ~ /^[[:space:]]*dotnet_(analyzer_)?diagnostic[^=]*severity[[:space:]]*=/ { k = lc; sub(/[[:space:]]*=.*/, "", k); v = body; sub(/^[^=]*=[[:space:]]*/, "", v); sub(/[[:space:]]*#.*/, "", v); old[file SUBSEP k] = lvl(v); oldl[file SUBSEP k] = $0; next }
  sign != "+" { next }
  body ~ /^[[:space:]]*dotnet_(analyzer_)?diagnostic[^=]*severity[[:space:]]*=/ { k = lc; sub(/[[:space:]]*=.*/, "", k); v = body; sub(/^[^=]*=[[:space:]]*/, "", v); sub(/[[:space:]]*#.*/, "", v); nw[file SUBSEP k] = lvl(v); nwl[file SUBSEP k] = $0; next }
  cs && body ~ /^[[:space:]]*#pragma[[:space:]]+warning[[:space:]]+disable/ { ids = body; if (match(body, /\/\/.*/)) ids = substr(body, 1, RSTART - 1); if (idonly(trail(body), ids)) hit($0); next }
  cs && body ~ /SuppressMessage/ && (pre = substr(body, 1, index(body, "SuppressMessage") - 1)) && gsub(/"/, "\"", pre) % 2 == 1 { next }
  cs && body ~ /SuppressMessage[[:space:]]*\(/ { r = ""; if (match(body, /Justification[[:space:]]*=[[:space:]]*/)) { r = substr(body, RSTART + RLENGTH); if (r ~ /^[$@]*"/) { sub(/^[$@]*"/, "", r); sub(/".*$/, "", r) } else { sub(/[^A-Za-z0-9_.].*$/, "", r); if (r ~ /^(null|[Ss]tring\.Empty)$/) r = "" } } if (weak(r)) hit($0); next }
  cs && body ~ /^[[:space:]]*#nullable/ { if (body ~ /^[[:space:]]*#nullable[[:space:]]+(enable|restore)/) next; if (body ~ /^[[:space:]]*#nullable[[:space:]]+disable[[:space:]]+annotations/ && !weak(trail(body))) next; hit($0); next }
  cs && (body ~ /[(,][[:space:]]*Skip[[:space:]]*=[[:space:]]*(""|@""|string\.Empty|null)/ || body ~ /\[(Ignore|Skip)\(""\)/) { hit($0); next }
  cs && body ~ /^[[:space:]]*#if[[:space:]]+(false|0)([[:space:]]|\/\/|$)/ { hit($0); next }
  cs && match(body, /\[(Ignore|Skip)\("[^"]*"\)/) { r = substr(body, RSTART, RLENGTH); sub(/^[^"]*"/, "", r); sub(/"\)$/, "", r); if (weak(r)) hit($0); next }
  cs && body ~ /\[(Ignore|Skip)(\(\))?\]/ { if (weak(trail(body))) hit($0); next }
  cs && match(body, /[(,][[:space:]]*Skip[[:space:]]*=[[:space:]]*"[^"]*"/) { r = substr(body, RSTART, RLENGTH); sub(/^[^"]*"/, "", r); sub(/"$/, "", r); if (weak(r)) hit($0); next }
  cs { next }
  file ~ /(^|\/)global\.json$/ { if (body ~ /"(rollForward|allowPrerelease|version)"/) hit($0); next }
  body ~ /^[[:space:]]*(#|\/\/|<!--)/ { next }
  file ~ /\.(csproj|props|targets)$/ && lc !~ /<(nowarn|warningsnotaserrors)/ && body ~ /[A-Za-z]{2,}[0-9]{3,}/ { cf[++nc] = file; cn[nc] = ln; cb[nc] = $0 }
  lc ~ /^[[:space:]-]*if:[[:space:]]*(false|.false.|\$\{\{[[:space:]]*false[[:space:]]*\}\})[[:space:]]*(#.*)?$/ { hit($0); next }
  lc ~ /<(enabletrimanalyzer|enableaotanalyzer|enablesinglefileanalyzer|enablenetanalyzers|runanalyzers|runanalyzersduringbuild|runanalyzersduringlivelinting|enforcecodestyleinbuild)[^>]*>[[:space:]]*false/ || lc ~ /(enabletrimanalyzer|enableaotanalyzer|enablesinglefileanalyzer|enablenetanalyzers|runanalyzers|runanalyzersduringbuild|runanalyzersduringlivelinting|enforcecodestyleinbuild)[[:space:]]*=[[:space:]]*.?false/ { hit($0); next }
  lc ~ /<analysis(mode|level)[a-z]*[^>]*>[[:space:]]*[^<]*(none|minimum|default)/ || lc ~ /<warninglevel[^>]*>[[:space:]]*[0-9]{1,3}[^0-9]/ || lc ~ /warninglevel[[:space:]]*=[[:space:]]*.?[0-9]{1,3}([^0-9]|$)/ { hit($0); next }
  lc ~ /generated_code[[:space:]]*=[[:space:]]*true/ { print file "\t" ln "\t" $0 >> gen; next }
  (lc ~ /<nullable>[[:space:]]*(disable|annotations)/ && file !~ /\.(fs|vb)proj$/) || lc ~ /treatwarningsaserrors[^a-z]*false/ || lc ~ /treatwarningsaserrors[^>]*>[[:space:]]*false/ || lc ~ /warnaserror-/ || lc ~ /suppresstrimanalysiswarnings[^a-z]*true/ { hit($0); next }
  lc ~ /continue-on-error:[[:space:]]*(true|.true.|\$\{\{)/ && gated(file) { next }
  lc ~ /ignore-exit-code|testingplatform_exitcode_ignore|continue-on-error:[[:space:]]*(true|.true.|\$\{\{)/ || lc ~ /(^|[^[:alnum:]._\/-])dotnet[[:space:]][^|]*\|\|[[:space:]]*(true|:)/ { hit($0); next }
  lc ~ /nowarn|warningsnotaserrors/ { t = body; gsub(/\$\([Nn][Oo][Ww][Aa][Rr][Nn]\.(Replace|Remove)\([^)]*\)\)/, "", t); if (lc ~ /warningsnotaserrors/) gsub(/NU190[0-5]/, "", t); if (t ~ /[A-Za-z]+[0-9]+|[;,>=:][0-9][0-9][0-9]+|\*/) hit($0) }
  END {
    for (f in rmS) if (rmS[f] > addS[f]) print f ": " rmS[f] - addS[f] " dotnet test or format line(s) net removed or commented out: " rmsl[f]
    for (i = 1; i <= nc; i++) if (!(cf[i] in scanned)) { scanned[cf[i]] = 1; open = 0; k = 0; while ((getline l < cf[i]) > 0) { k++; ll = tolower(l); sub(/\r$/, "", ll); if (open) inw[cf[i], k] = open; if (ll ~ /<(nowarn|warningsnotaserrors)[ >]/ && ll !~ /<\/(nowarn|warningsnotaserrors)>/ && ll !~ /\/>[[:space:]]*$/) open = (ll ~ /<warningsnotaserrors/) ? 2 : 1; if (ll ~ /<\/(nowarn|warningsnotaserrors)>/) open = 0 }; close(cf[i]) }
    for (i = 1; i <= nc; i++) if ((cf[i], cn[i]) in inw) { t = cb[i]; gsub(/\$\([Nn][Oo][Ww][Aa][Rr][Nn]\)/, "", t); gsub(/\$\([Nn][Oo][Ww][Aa][Rr][Nn]\.(Replace|Remove)\([^)]*\)\)/, "", t); if (inw[cf[i], cn[i]] == 2) gsub(/NU190[0-5]/, "", t); if (t ~ /[A-Za-z]+[0-9]+|[;,>=:][0-9][0-9][0-9]+|\*/) print cf[i] ": " cb[i] }
    for (f in rmT) if (rmT[f] > addT[f]) print f ": " rmT[f] - addT[f] " test attribute line(s) net deleted: " rml[f]
    for (key in nw) if (!(key in old) && nw[key] <= 2 || (key in old) && nw[key] < old[key]) { split(key, p, SUBSEP); print p[1] ": severity lowered or silenced: " nwl[key] }
    for (key in old) if (!(key in nw) && old[key] >= 3) { split(key, p, SUBSEP); print p[1] ": severity line deleted: " oldl[key] }
  }
' > "$out"
# generated_code = true is allowed only under an obj/ section: find the section header above the added line
while IFS=$'\t' read -r f n line; do
  sec=$(awk -v n="$n" 'NR <= n && /^\[/ { s = $0 } END { print s }' "$f" 2> /dev/null)
  case "$sec" in *obj/* | '[**/*.{Designer,designer,generated,Generated}.cs]'* | '[**/{ThirdParty,third_party,Third-Party,vendor,Vendor,vendored,External,external}/**.cs]'* | '[{ThirdParty,third_party,Third-Party,vendor,Vendor,vendored,External,external}/**.cs]'* | '[*_AssemblyInfo.cs]'*) ;; *) echo "$f: generated_code = true outside obj/ and the shipped generated-code sections (section ${sec:-none}): $line" >> "$out" ;; esac
done < "$gen"
cat "$out"
[ ! -s "$out" ]
