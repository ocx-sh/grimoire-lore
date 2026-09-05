import re,sys,pathlib
def strip(t):
    out=[];fence=False;fm=False
    for i,l in enumerate(t.splitlines()):
        if i==0 and l.strip()=='---': fm=True; out.append(''); continue
        if fm:
            out.append('')
            if l.strip()=='---': fm=False
            continue
        if re.match(r'^\s*(```|~~~)',l): fence=not fence; out.append(''); continue
        if fence: out.append(''); continue
        if re.match(r'^\s*#',l) or re.match(r'^\s*\|',l) or re.match(r'^\s*\[[^\]]+\]:',l): out.append(''); continue
        out.append(re.sub(r'`[^`]*`','',l))
    return '\n'.join(out)
for p in sys.argv[1:]:
    print(f'===FILE {p}')
    print(strip(pathlib.Path(p).read_text(errors='replace')))
