# span.awk: the lookahead, lookbehind and multi-line half of a PCRE or NUL-data grep cell, in POSIX awk.
# Usage: RE='ERE' [HAS='ERE'] [LACKS='ERE'] [NOTBEFORE='ERE'] [AFTER='ERE'] [NOTAFTER='ERE'] [WHOLE=1] \
#          xargs -0 -r awk -f span.awk -- FILES
# Prints every span that matches RE, has HAS inside it, lacks LACKS inside it, whose preceding text does not match
# NOTBEFORE (end-anchored: put $ at its end), and whose following text matches AFTER and does not match NOTAFTER
# (start-anchored: put ^ at its start). Preceding and following text stay on the span's line unless WHOLE=1.
# Line mode (default) prints FILE:LINE:the line. WHOLE=1 reads each file as one string, so a span may cross lines, and
# prints FILE:LINE: the span with newlines turned into spaces. A backslash-n in any variable means a newline.
# Variables, not -v, because awk -v unescapes backslashes and ENVIRON does not.
function nl(s) { gsub(/\\n/, "\n", s); return s }
function ok(pre, span, post) {
  if (has != "" && span !~ has) return 0
  if (lacks != "" && span ~ lacks) return 0
  if (nb != "" && pre ~ nb) return 0
  if (af != "" && post !~ af) return 0
  if (naf != "" && post ~ naf) return 0
  return 1
}
function scan(text, first, file, whole,   acc, pre, span, post, ln, tmp, n) {
  acc = ""
  while (text != "" && match(text, re)) {
    n = (RLENGTH > 0 ? RLENGTH : 1)
    pre = acc substr(text, 1, RSTART - 1); span = substr(text, RSTART, RLENGTH); post = substr(text, RSTART + RLENGTH)
    if (ok(pre, span, post)) {
      if (whole) { tmp = pre; ln = first + gsub(/\n/, "\n", tmp); gsub(/\n/, " ", span); print file ":" ln ": " span }
      else { print file ":" first ":" text0; return }
    }
    acc = acc substr(text, 1, RSTART - 1 + n)
    text = substr(text, RSTART + n)
  }
}
function flush() { if (whole && fname != "") scan(buf, 1, fname, 1); buf = "" }
BEGIN {
  re = nl(ENVIRON["RE"]); has = nl(ENVIRON["HAS"]); lacks = nl(ENVIRON["LACKS"]); nb = nl(ENVIRON["NOTBEFORE"])
  af = nl(ENVIRON["AFTER"]); naf = nl(ENVIRON["NOTAFTER"]); whole = (ENVIRON["WHOLE"] != "")
}
FNR == 1 { flush(); fname = FILENAME }
{ if (whole) buf = buf $0 "\n"; else { text0 = $0; scan($0, FNR, FILENAME, 0) } }
END { flush() }
