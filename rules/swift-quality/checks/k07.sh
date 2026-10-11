#!/usr/bin/env bash
# k07.sh: the K-07 agent-tell set. Enforces SW-GATE-10 in its SW-CORE-06 form (generated files skipped) behind the
# SW-CORE-03 canary. Run from the repository root. OUTPUT IS THE VIOLATION.
# Usage:
#   bash k07.sh                    canary, then every tell over the whole tree (a new repository)
#   BASE=origin/main bash k07.sh   the same, keeping only lines in Swift files changed since the merge base (an adopted
#                                  repository; file granularity: a touched legacy file prints its legacy hits)
#   bash k07.sh e01 e06            inventory: the raw grep of single entries (e01 to e09, e11 to e16, hatches), a
#                                  justified hatch prints too; exits 0 after the canary
# Exit: 0 and no output = pass; 1 = any output line, a failed canary, a BASE that does not resolve, or a scan that exited
#       with an error status (grep 2, xargs 123, git 128: the step fails closed); 64 an unknown entry name.
# A scan is judged by its exit status, never by stderr: git prints `warning: unable to access 'Benchmarks/.gitignore': Too
# many levels of symbolic links` for a symlinked .gitignore (vapor/jwt-kit) and exits 0, so the warning stays visible and
# does not fail the run. Red on an unreadable file and on a non-git directory, green on a twin with a symlinked .gitignore
# beside a subdirectory (the old stderr test exited 1 with no violation line there; measured 2026-10-10).
# E01 E02 E03 E06 (the hatches) pass only when their line or the line above carries a comment of at least three
# words that states the guard; hatches() prints the ones that lack it. The check proves a reason exists, not that it is true.
# `@preconcurrency import X` for a libc or OS shim (Glibc, Musl, WASILibc, Android, Bionic, Darwin, CRT, WinSDK, Dispatch,
# EmscriptenLibc) is the SW-CONC-10 allow-list: hatches() skips it, no comment needed (E06 inventory still lists it).
# Expect noise on mature code: E08 reports simulated-work sleeps, E09 and E14 match comment text, E12 matches a library
# that still supports ObservableObject. Justify a hit in the pull request; a hit is a lead, not proof.
# Generated files (*.pb.swift, *.grpc.swift, *.generated.swift, *+Generated.swift, Generated/, generated/), Tests and
# the directories that ship no library code (Demo*, Example*, *Example, Sample*, Docs, Benchmarks, *TestUtils, *TestSupport, Fixtures, *.playground) are excluded by design,
# except E08 (reads only Tests) and E15 (tests included, generated skipped). A sample app or tool directory under another
# name prints: justify it in the pull request. Lines whose first token is `//` (a comment or doc comment) are dropped from
# every entry except E15, whose tells are comments. The inventory form (`k07.sh e01`) stays the raw grep. E10 is not issued.
# Blind spots: a tell split over two lines, `@unchecked  Sendable` with two spaces, a typealias alias, a tell in a
# test-like directory not named Tests. A repository with no Tests directory gets a silent e08.
# File list: every scan reads `git ls-files -z --cached --others --exclude-standard`, tracked and untracked files with
# .gitignore applied, so a path with a space is one operand and no recursive-grep option is needed. A symlinked file is one list
# entry that grep reads, so a symlink farm (RxSwift `Sources/` links into `RxSwift/`) scans in full and prints a hit under
# both paths. A symlinked directory is one entry the list does not descend: name its real directory. The canary counts the
# same list, and canary.sh agrees with it. A tracked file deleted from the work tree makes grep exit 2 and the scan fail
# closed: stage the deletion or restore the file.
# E14 skips a line that carries the comment `// floor: iOS 14` (any text after `floor:`): the one lock wrapper of a library
# whose Apple floor is below iOS 16 (SW-APPLE-04). Every other NSLock line prints.
# Test-support targets, golden fixtures and playgrounds are skipped: SwiftGen printed 20+ E15 lines from SwiftGen.playground and
# Sources/TestUtils/TestLogger.swift:12 (E04) before, none after (measured 2026-10-10).
# Needs git 2.30 or newer for --merge-base. Watched red and green on planted trees, Swift 6.4.0 and 6.3.3 images
# (measured 2026-10-10; the comment, Demo and Docs filters 2026-10-10): whole tree red, BASE-scoped clean file green, bare hatch red, hatch with a reason green,
# `// ok` red, committed and untracked tells red, branch behind main green, empty tree red at the canary; the libc import
# chain green (only a swift-format-ignore-file line, an E15 item, prints); a nested Pkgs/Sub/Tests hatch green.
GEN=(':(exclude,glob)**/*.pb.swift' ':(exclude,glob)**/*.grpc.swift' ':(exclude,glob)**/*.generated.swift' ':(exclude,glob)**/*+Generated.swift' ':(exclude,glob)**/Generated/**' ':(exclude,glob)**/generated/**')
SIDE=(':(exclude,glob)**/Fixtures/**' ':(exclude,glob)**/*.playground/**')
NOSHIP=(':(exclude,glob)**/Demo*/**' ':(exclude,glob)**/Example*/**' ':(exclude,glob)**/*Example/**' ':(exclude,glob)**/Sample*/**' ':(exclude,glob)**/Docs/**' ':(exclude,glob)**/Benchmarks/**' ':(exclude,glob)**/*TestUtils/**' ':(exclude,glob)**/*TestSupport/**')
P=(':(glob)**/*.swift' ':(exclude,glob)**/.build/**' ':(exclude,glob)**/Tests/**' "${GEN[@]}" "${SIDE[@]}" "${NOSHIP[@]}")
# list PATHSPEC...: the git-fed file list. gx ARGS...: grep ARGS over that list, exit 0 for a hit or none and 2 for an error
# (xargs alone reports 123 for both). tag: the ./ prefix every printed line carries.
list() { git ls-files -z --cached --others --exclude-standard -- "$@"; }
gx() { xargs -0 -r sh -c 'grep -H -n "$@"; [ "$?" -le 1 ]' sh "$@"; }
tag() { sed 's|^|./|'; }
scan_p() { list "${P[@]}" | gx "$@" -- | tag; }
# E01 @unchecked Sendable, E02 nonisolated(unsafe), E03 Task.detached (SW-CONC; E01 E02 E03 E06 run through hatches() in the gate)
e01() { scan_p -F -e '@unchecked Sendable'; }
e02() { scan_p -F -e 'nonisolated(unsafe)'; }
e03() { scan_p -F -e 'Task.detached'; }
# E04 GCD; E05 MainActor.run (a tell, not a ban)
e04() { scan_p -F -e 'DispatchQueue.' -e 'DispatchQueue(' -e 'DispatchSemaphore' -e 'DispatchGroup'; }
e05() { scan_p -F -e 'MainActor.run'; }
# E06 isolation hatches that need a justification; E07 blocking or legacy sleeps in production code
e06() { scan_p -F -e '@preconcurrency' -e 'MainActor.assumeIsolated'; }
e07() { scan_p -e 'Thread\.sleep' -e '[^.A-Za-z_]usleep(' -e 'Task\.sleep(nanoseconds'; }
# E08 sleeps in tests, whole-tree form (reads only Tests; silent when there is no Tests directory)
e08() { [ -d Tests ] || return 0; list ':(glob)Tests/**/*.swift' | gx -e '^usleep(' -e '^nanosleep(' -e '^sleep(' -e '[^[:alnum:]_]usleep(' -e '[^[:alnum:]_]nanosleep(' -e '[^[:alnum:]_]sleep(' -- | tag | awk '!/func +(sleep|usleep|nanosleep)\(/'; }
# E09 force try and force cast; E11 Foundation.Process; E12 pre-Observation SwiftUI state
e09() { scan_p -F -e 'try!' -e ' as! '; }
e11() { scan_p -e '[^A-Za-z_]Process()' -e NSTask -e '\.launchPath'; }
e12() { scan_p -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject'; }
# E13 completion-handler APIs; E14 pre-Mutex locks
e13() { scan_p -e 'completion[A-Za-z]*: *@escaping' -e '@escaping *(Result<'; }
e14() { scan_p -F -e 'NSLock' -e 'NSRecursiveLock' -e 'os_unfair_lock' -e 'pthread_mutex'; }
# E15 linter suppressions, tests included
e15() { list ':(glob)**/*.swift' ':(exclude,glob)**/.build/**' "${GEN[@]}" "${SIDE[@]}" | gx -F -e 'swift-format-ignore' -e 'swiftlint:disable' -e 'swiftformat:disable' -- | tag; }
# E16 exit() outside the entry point, one -e per alternative
e16() { scan_p -e '^exit(' -e '[^.[:alnum:]_]exit(' -e '\bGlibc\.exit(' -e '\bDarwin\.exit(' -e '\bMusl\.exit(' -e '\bFoundation\.exit(' -e '\bucrt\.exit(' -e '\b_exit('; }
# E01 E02 E03 E06 pass only with a multi-word comment on the line or the line above: print the unjustified ones
hatches() {
  local files; files=$(mktemp) || return 2
  git ls-files -z --cached --others --exclude-standard -- '*.swift' ':(exclude,glob)**/Tests/**' ':(exclude)*.pb.swift' ':(exclude)*.grpc.swift' ':(exclude)*.generated.swift' ':(exclude)*+Generated.swift' ':(exclude,glob)**/Generated/**' ':(exclude,glob)**/generated/**' ':(exclude,glob)**/Demo*/**' ':(exclude,glob)**/Example*/**' ':(exclude,glob)**/*Example/**' ':(exclude,glob)**/Sample*/**' ':(exclude,glob)**/Docs/**' ':(exclude,glob)**/Benchmarks/**' ':(exclude,glob)**/*TestUtils/**' ':(exclude,glob)**/*TestSupport/**' ':(exclude,glob)**/Fixtures/**' ':(exclude,glob)**/*.playground/**' > "$files" || { rm -f "$files"; return 2; }
  # shellcheck disable=SC2016  # the awk program is single-quoted on purpose
  xargs -r -0 awk '
    FNR == 1 { prev = "" }
    /^[[:space:]]*(@[A-Za-z_]+[[:space:]]+)*@preconcurrency[[:space:]]+((public|package|internal|private|fileprivate)[[:space:]]+)?import[[:space:]]+((struct|class|enum|func|var|let|typealias|protocol)[[:space:]]+)?(Glibc|Musl|WASILibc|Android|Bionic|Darwin|CRT|WinSDK|Dispatch|EmscriptenLibc)([.[:space:]]|$)/ { prev = $0; next }
    /@unchecked[[:space:]]+Sendable|nonisolated\(unsafe\)|Task\.detached|@preconcurrency|MainActor\.assumeIsolated/ {
      if ($0 !~ /\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/ &&
          prev !~ /^[[:space:]]*\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/)
        print "./" FILENAME ":" FNR ": " $0
    }
    { prev = $0 }' < "$files"
  local rc=$?; rm -f "$files"; return "$rc"
}
canary() { list ':(glob)**/*.swift' ':(exclude,glob)**/.build/**' | xargs -0 -r grep -c -e '' -- | awk 'END { if (NR == 0) { print "K07 CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }'; }

canary || exit 1
if [ $# -gt 0 ]; then
  for id in "$@"; do
    case "$id" in
      e0[1-9] | e1[1-6] | hatches) "$id" ;;
      *) echo "k07: unknown entry: $id" >&2; exit 64 ;;
    esac
  done
  exit 0
fi

changed=$(mktemp)
raw=$(mktemp)
scan=$(mktemp)
out=$(mktemp)
trap 'rm -f "$changed" "$raw" "$scan" "$out"' EXIT
if [ -n "${BASE:-}" ]; then
  git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || { echo "K07: BASE does not resolve: $BASE" >&2; exit 1; }
  git add -A -- '*.swift'
  git diff --name-only -z --diff-filter=ACMR --merge-base "$BASE" -- '*.swift' > "$raw" || { echo 'K07: git diff failed' >&2; exit 1; }
  tr '\0' '\n' < "$raw" | sed -e 's|^|./|' -e 's|$|:|' > "$changed"
fi
# A scan fails by its exit status (grep 2, xargs 123, git 128), never by what it wrote to stderr: git warns about a
# symlinked .gitignore and still exits 0. stderr stays visible. A filter after grep is awk, so pipefail keeps grep's status.
set -o pipefail
fail=0
scan() { "$@"; local rc=$?; if [ "$rc" -gt 1 ]; then fail=1; echo "K07: $1 exited $rc" >&2; fi; return 0; }
e14f() { e14 | awk '!/\/\/[[:space:]]*floor:/'; }
{ scan e04; scan e05; scan e07; scan e08; scan e09; scan e11; scan e12; scan e13; scan e14f; scan e16; scan hatches; } > "$scan"
awk '!/^[^:]+:[0-9]+:[[:space:]]*\/\//' "$scan" > "$raw"
scan e15 >> "$raw"
if [ "$fail" -ne 0 ]; then echo 'K07: a scan exited with an error status; the result cannot be trusted' >&2; exit 1; fi
if [ -n "${BASE:-}" ]; then awk 'FILENAME == ARGV[1] { n++; p[n] = $0; next } { for (i = 1; i <= n; i++) if (index($0, p[i]) > 0) { print; next } }' "$changed" "$raw" > "$out"; else cat "$raw" > "$out"; fi
cat "$out"
[ ! -s "$out" ]
