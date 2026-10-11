# ctrl-bytes.awk: SW-SEC-17 (b). Counts the input lines that carry a terminal-control or invisible-format byte sequence:
# any control character, a C1 control (C2 80..9F), soft hyphen, Arabic letter mark, zero-width and bidi marks, word joiners,
# the BOM and the tag characters. Prints the count (0 = clean), like grep -c. Run it with LC_ALL=C so the ranges are bytes:
#   LC_ALL=C awk -f ctrl-bytes.awk
/[[:cntrl:]]|\302[\200-\237]|\302\255|\330\234|\342\200[\213-\217\250-\256]|\342\201[\240-\257]|\357\273\277|\363\240[\200-\201]/ { n++ }
END { print n + 0 }
