# context.awk: grep with -A/-B context, in POSIX awk. A hit prints FILE:LINE:TEXT, context prints FILE-LINE-TEXT.
# Usage: git ls-files -z ... | xargs -0 -r awk -v re=ERE [-v A=n] [-v B=n] [-v icase=1] -f context.awk --
# re takes no backslash (awk -v would rewrite it): spell a literal paren as [(] and a dot as [.].
# icase=1 lowercases the line and the pattern, so write the pattern's classes in lower case.
# Watched red on a planted hit (hit plus following lines) and green on a clean twin, under gawk 5.3.2 and busybox awk 1.37.
BEGIN { A += 0; B += 0; if (icase) re = tolower(re) }
FNR == 1 { last = 0; pend = 0; for (k in buf) delete buf[k] }
{
  t = icase ? tolower($0) : $0
  if (t ~ re) {
    for (k = (FNR - B > last + 1 ? FNR - B : last + 1); k < FNR; k++) print FILENAME "-" k "-" buf[k]
    print FILENAME ":" FNR ":" $0; last = FNR; pend = A
  } else if (pend > 0) { print FILENAME "-" FNR "-" $0; last = FNR; pend-- }
  buf[FNR] = $0; delete buf[FNR - B]
}
