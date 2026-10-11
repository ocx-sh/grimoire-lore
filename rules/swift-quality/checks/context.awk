# context.awk: the context lines of grep (lines after and before a hit) in POSIX awk. Usage: PAT='ERE' [A=n] [B=n] xargs -0 -r awk -f context.awk -- FILES
# A match prints FILE:LINE:text, a context line FILE-LINE-text (grep's own shape). No -- separator between groups.
BEGIN { pat = ENVIRON["PAT"]; a = ENVIRON["A"] + 0; b = ENVIRON["B"] + 0 }
FNR == 1 { left = 0; last = 0; split("", buf) }
{
  if ($0 ~ pat) {
    for (k = FNR - b; k < FNR; k++) if (k > last && k >= 1) print FILENAME "-" k "-" buf[k]
    print FILENAME ":" FNR ":" $0; last = FNR; left = a
  } else if (left > 0) { print FILENAME "-" FNR "-" $0; last = FNR; left-- }
  buf[FNR] = $0; delete buf[FNR - b - 1]
}
