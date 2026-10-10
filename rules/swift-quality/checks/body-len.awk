# body-len.awk: SW-APPLE-12, the length of every SwiftUI `var body: some View {` (or Scene) block.
# Usage: find -L . -name '*.swift' -not -path './.build/*' -print0 | xargs -0 -r awk -f body-len.awk | awk '$2 > 100'
# Output: one "FILE:LINE BODY_LINES" per body, where LINE is the line of the `var body` declaration and BODY_LINES counts
# the lines between it and the closing brace at the same indent. The trailing `awk '$2 > 100'` keeps the bodies over 100
# lines, which are a review prompt to extract subviews and not a violation. An empty result means no body is over the
# limit when the find lists at least one file (run canary.sh first).
# Reads declarations of the form `var body: some View {` or `some Scene {`, optionally public, package, private or fileprivate,
# with the opening brace on the same line. Another spelling is not measured.
# Watched red on a 122-line body (printed `Big.swift:3 122`) and green on a 10-line twin (measured 2026-10-10); a `package var body` plant of 122 lines prints (measured 2026-10-10).
/^[[:space:]]*(public |package |private |fileprivate )?var body: some (View|Scene) \{[[:space:]]*$/ {
  match($0, /^[[:space:]]*/); ind = RLENGTH; start = FNR; infile = FILENAME; inbody = 1; next }
inbody { match($0, /^[[:space:]]*/); if (RLENGTH == ind && $0 ~ /^[[:space:]]*\}/) { print infile ":" start, FNR - start - 1; inbody = 0 } }
