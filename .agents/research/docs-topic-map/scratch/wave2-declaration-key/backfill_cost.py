"""Price the doc_type backfill: how many of the fleet's pages can a mechanical
pre-fill propose with high confidence, and how many need a human/agent read."""
import os, re
ROOT="/home/mherwig/dev"
MK={"ocx-catalog":"docs","grimoire-indexer":"docs","ocx-mcp":"docs","ocx-mirror":"docs",
    "ocx-mirror-sdk":"docs","ocx-sdk-python":"docs","ocx-indexbot":"docs"}
OTHER={"ocx":"website/src","grimoire":"docs/src","kate-middlechild":"docs",
       "creeptd-ng":"docs","grimoire-lore":"docs"}
GROUP2TYPE={"Reference":"reference","API reference":"reference","Schema":"reference",
            "How-To":"how-to","Recipes":"how-to","Getting started":"how-to",
            "Explanation":"explanation","Concepts":"explanation"}
AMBIG={"Guide","Ops","Contributing"}
def nav_map(repo, sub):
    t=open(f"{ROOT}/{repo}/mkdocs.yml").read()
    m=re.search(r'^nav:\n((?:[ \t].*\n|\n)+)', t, re.M); out={}
    cur=None
    for line in m.group(1).split("\n"):
        if not line.strip(): continue
        ind=len(line)-len(line.lstrip())
        lab=re.match(r'\s*-\s*([^:]+):\s*$', line); leaf=re.search(r'([\w./-]+\.md)\s*$', line)
        if ind<=4 and lab and not leaf: cur=lab.group(1).strip()
        elif leaf: out[leaf.group(1)] = ("(top)" if ind<=4 else cur)
    return out
conf=amb=0; buckets={}
def note(k): buckets[k]=buckets.get(k,0)+1
for repo, sub in list(MK.items())+list(OTHER.items()):
    base=f"{ROOT}/{repo}/{sub}"
    if not os.path.isdir(base): continue
    nm = nav_map(repo, sub) if repo in MK else {}
    for dp,_,fns in os.walk(base):
        if re.search(r"/(node_modules|\.git|dist|\.vitepress/dist|\.worktrees)/", dp+"/"): continue
        for fn in sorted(fns):
            if not fn.endswith((".md",".mdx")) or fn=="SUMMARY.md": continue
            rel=os.path.relpath(os.path.join(dp,fn), base)
            g=nm.get(rel)
            if fn.lower().startswith("changelog"): conf+=1; note("changelog (filename)"); continue
            if rel=="index.md" or rel=="docs/index.md": conf+=1; note("landing (site root index)"); continue
            if "troubleshoot" in fn: conf+=1; note("troubleshooting (filename)"); continue
            if g in GROUP2TYPE: conf+=1; note(f"{GROUP2TYPE[g]} (nav group {g!r})"); continue
            if g in AMBIG or g=="(top)" or g is None:
                amb+=1; note(f"NEEDS READ (nav group {g!r}, repo {repo})"); continue
print(f"confident pre-fill: {conf}   needs a read: {amb}   total {conf+amb}  ({100*amb/(conf+amb):.1f}% need a read)")
for k,v in sorted(buckets.items(), key=lambda x:-x[1]): print(f"  {v:4d}  {k}")
