"""Summarise exemplars/*.json into exemplar-summary.json, band medians and the per-repo table."""
import csv, glob, json, os, statistics as st

meta = {r[0].replace("/", "__"): r for r in csv.reader(open("../exemplars.tsv"), delimiter="\t")}
FAM = {"kotlin": ("kotlin", "java"), "java": ("java", "kotlin"), "ts": ("ts", "js")}
rows = []
for f in sorted(glob.glob("exemplars/*.json")):
    name, which = os.path.basename(f)[:-5].split("@")
    m = meta[name]
    lang, kind = m[1], m[2]
    a = {"code": 0, "doc": 0, "line": 0, "cc": 0, "mc": 0, "db": [], "lb": []}
    for k, v in json.load(open(f)).items():
        l, sc = k.split("|")
        if sc != "prod" or l not in FAM.get(lang, (lang,)):
            continue
        for x in ("code", "doc", "line"):
            a[x] += v[x]
        a["cc"] += v["code_chars"]; a["mc"] += v["comment_chars"]
        if v["doc_blocks"].get("count"): a["db"].append(v["doc_blocks"])
        if v["line_blocks"].get("count"): a["lb"].append(v["line_blocks"])
    s = lambda bl, q: sum(b.get(q, 0) for b in bl)
    mx = lambda bl, q: max((b[q] for b in bl), default=0)
    rows.append(dict(repo=name.split("__")[1], lang=lang, kind=kind, which=which, code=a["code"],
        ratio=round((a["doc"] + a["line"]) / a["code"], 3), doc=round(a["doc"] / a["code"], 3), line=round(a["line"] / a["code"], 3),
        chars=round(a["mc"] / a["cc"], 3), dp90=mx(a["db"], "p90"), lp90=mx(a["lb"], "p90"),
        gt10=s(a["db"], "gt10") + s(a["lb"], "gt10")))
json.dump(rows, open("exemplar-summary.json", "w"), indent=1)
med = lambda xs: round(st.median(xs), 3)
print("| Scope | n | Ratio median | IQR | Doc | Plain | Char ratio | Doc p90 | Plain p90 | Blocks >10 / kLOC |")
print("|---|---|---|---|---|---|---|---|---|---|")
for which, lab in (("snap", "pre-2022"), ("head", "HEAD")):
    for kind, kl in (("app", "Apps"), ("lib", "Libraries")):
        rs = [r for r in rows if r["which"] == which and r["kind"] == kind]
        q = st.quantiles([r["ratio"] for r in rs], n=4)
        print(f"| {kl}, {lab} | {len(rs)} | {med([r['ratio'] for r in rs])} | {q[0]:.3f}-{q[2]:.3f} | {med([r['doc'] for r in rs])} | {med([r['line'] for r in rs])} | {med([r['chars'] for r in rs])} | {med([r['dp90'] for r in rs])} | {med([r['lp90'] for r in rs])} | {med([1000*r['gt10']/r['code'] for r in rs]):.2f} |")
print()
print("| Repo | Lang | Kind | At | Code | Ratio | Doc | Plain | Char ratio | Doc p90 | Plain p90 | Blocks >10 per kLOC |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in sorted(rows, key=lambda r: (r["kind"], r["lang"], r["repo"], r["which"])):
    print(f"| {r['repo']} | {r['lang']} | {r['kind']} | {r['which']} | {r['code']:,} | {r['ratio']} | {r['doc']} | {r['line']} | {r['chars']} | {r['dp90']} | {r['lp90']} | {round(1000*r['gt10']/r['code'],2)} |")
