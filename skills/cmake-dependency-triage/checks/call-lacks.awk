# call-lacks.awk: a CMake call (or quoted string) that matches NEED and does not match LACK, across line breaks.
# POSIX awk stand-in for a multi-line grep with lookahead. A call runs from HEAD to the first END character.
# Usage: git ls-files -z ... | LC_ALL=C xargs -0 -r awk -v head=ERE [-v need=ERE] [-v need2=ERE] [-v strip=ERE] \
#          [-v lack=ERE] [-v nofile=ERE] [-v wb=1] [-v cs=1] [-v end=C] [-v files=1] -f call-lacks.awk --
#   head    start of the call, matched case-insensitively unless cs=1 (so write it in lower case)
#   need, need2   the call text must match both (STRIP is removed from the text first)
#   lack    the call text must not match
#   nofile  skip a file whose whole text matches
#   wb=1    HEAD must start at a word boundary (so "set(" is not "unset(")
#   end     closing character, default ")"
#   files=1 print each file name once instead of each call
# Patterns take no backslash (awk -v would rewrite it): spell a literal paren as [(].
# Output: FILE:LINE: the call text on one line. Empty output is the pass.
# Watched red on a planted call and green on a clean twin, under gawk 5.3.2 and busybox awk 1.37.
function flush(   lt, off, p, hl, e, seg, body, ln, pre) {
  if (txt == "" || (nofile != "" && txt ~ nofile)) return
  lt = cs ? txt : tolower(txt); off = 0
  while (match(substr(lt, off + 1), head)) {
    p = off + RSTART; hl = RLENGTH
    if (wb && p > 1 && substr(lt, p - 1, 1) ~ /[A-Za-z0-9_]/) { off = p; continue }
    e = index(substr(txt, p + hl), end)
    seg = e ? substr(txt, p, hl + e) : substr(txt, p)
    off = p + length(seg) - 1
    body = seg; if (strip != "") gsub(strip, "", body)
    if (need != "" && body !~ need) continue
    if (need2 != "" && body !~ need2) continue
    if (lack != "" && seg ~ lack) continue
    if (files) { print name; return }
    pre = substr(txt, 1, p - 1); ln = gsub(/\n/, "&", pre) + 1; gsub(/[ \t\n]+/, " ", seg)
    print name ":" ln ": " seg
  }
}
BEGIN { if (end == "") end = ")" }
FNR == 1 { flush(); txt = "" }
{ name = FILENAME; txt = (FNR == 1 ? $0 : txt "\n" $0) }
END { flush() }
