# secret-option.awk: SW-SEC-15. A property declared with @Option or @Argument (the var sits on the attribute's line or the
# next one) whose name carries password, token or secret and not File, Stdin or Env. Prints FILE:LINE: the attribute line.
# Usage: xargs -0 -r awk -f secret-option.awk -- FILES
function nameok(t) { return t !~ /^[a-zA-Z]*(File|Stdin|Env)/ && t ~ /^[a-zA-Z]*([pP]assword|[tT]oken|[sS]ecret)/ }
function hasvar(s,   t) {
  while (match(s, /(^|[^[:alnum:]_])var /)) {
    t = substr(s, RSTART + RLENGTH)
    if (nameok(t)) return 1
    s = t
  }
  return 0
}
FNR == 1 { pend = "" }
pend != "" { if (hasvar($0)) print FILENAME ":" (FNR - 1) ": " pend; pend = "" }
match($0, /@(Option|Argument)/) {
  rest = substr($0, RSTART + RLENGTH)
  if (rest ~ /(^|[^[:alnum:]_])var /) { if (hasvar(rest)) print FILENAME ":" FNR ": " $0 }
  else if (rest !~ /(^|[^[:alnum:]_])var($|[^[:alnum:]_])/) pend = $0
}
