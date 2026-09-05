import os, re, json, sys
ROOT="/home/mherwig/dev"
SURFACES = {
 "ocx": "ocx/website/src",
 "ocx-catalog": "ocx-catalog/docs",
 "grimoire": "grimoire/docs/src",
 "grimoire-indexer": "grimoire-indexer/docs",
 "ocx-mcp": "ocx-mcp/docs",
 "ocx-mirror": "ocx-mirror/docs",
 "ocx-mirror-sdk": "ocx-mirror-sdk/docs",
 "ocx-sdk-python": "ocx-sdk-python/docs",
 "ocx-indexbot": "ocx-indexbot/docs",
 "kate-middlechild": "kate-middlechild/docs",
 "creeptd-ng": "creeptd-ng/docs",
 "grimoire-lore": "grimoire-lore/docs",
}
EXCL = re.compile(r"/(node_modules|\.git|target|dist|\.worktrees|\.lhci|\.dev-indexes|external|\.claude|\.agents|\.serena)/")
tot=fm=0
rows=[]
for repo, rel in SURFACES.items():
    d=os.path.join(ROOT, rel)
    if not os.path.isdir(d): rows.append((repo,"MISSING",0,0)); continue
    n=0; f=0; keys={}
    for dp,_,fns in os.walk(d):
        if EXCL.search(dp+"/"): continue
        for fn in fns:
            if not fn.endswith((".md",".mdx")): continue
            p=os.path.join(dp,fn)
            try: head=open(p, encoding="utf-8", errors="replace").read(4000)
            except Exception: continue
            n+=1
            if head.startswith("---\n") or head.startswith("---\r\n"):
                f+=1
                blk=head.split("\n---",1)[0]
                for line in blk.split("\n")[1:]:
                    m=re.match(r"^([A-Za-z_][\w.-]*):", line)
                    if m: keys[m.group(1)]=keys.get(m.group(1),0)+1
    tot+=n; fm+=f
    rows.append((repo,rel,n,f,sorted(keys.items(), key=lambda x:-x[1])[:6]))
for r in rows: print(r)
print("TOTAL pages:", tot, " with frontmatter:", fm, f" ({100*fm/max(tot,1):.1f}%)")
