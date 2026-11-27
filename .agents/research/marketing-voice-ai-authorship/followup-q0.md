---
title: What published software-vendor incident, outage and security notices measure for exclamation marks, apology count and a named next step
program: product
topic: marketing-voice-ai-authorship
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 32
---

# Follow-up q0: exclamation marks, apologies and a next step in vendor notices

Question: what do published software-vendor incident, outage and security notices measure for exclamation marks, apology count and a named next step? MKT-VOICE-13 cannot leave CONSIDER without it.

This is the repaired version. The earlier measurement table was hand-trimmed and showed `0 0` rows with no word counts. Text extraction was sound (every file has 246 to 3,584 words, shown below), so the zero counts are real zeros. The repair reproduces the scripts and the raw output, fixes two internal contradictions, replaces the dates that had come from titles and fetch time, and removes the "No action is required" clause that no notice contained.

## Answer

1. **Exclamation marks: 0 in 32 of 32 notices.** The only `!` in the 32 extracted texts is the Cloudflare page chrome line "Thanks for subscribing! You're all set to receive our newest blog posts." (13 of 13 Cloudflare files, one each, 13 characters in the whole corpus). Removing that line leaves 0. The no-exclamation half of MKT-VOICE-13 matches practice.
2. **Apologies: an apology is optional, and where vendors give one the pattern is 2 sentences, not 1.** Of 13 Cloudflare notices, 10 carry 2 apology sentences (the first within the opening 16% of the text, the last within the closing 19%), 2 carry 1 (both in the closing 8%), and 1 carries 0. Of the other 19 notices, 1 carries an apology (Redocly, 1 sentence) and 18 carry none: 0 of 10 GitHub availability reports, 0 of 5 security advisories, bulletins and the Vercel middleware postmortem, and 0 of 3 other small-vendor postmortems (Nebius, Buttondown 0023 and 0031). The old cap "at most once" contradicts 10 of the 13 Cloudflare posts. A cap of 2 contradicts none of the 32.
3. **A named reader action is a feature of security and breach notices, not of outage postmortems.** Five security or breach notices tell customers to act, and each names the act with a version, a credential or a link: [React](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) (2025-12-03), [Next.js CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478) (2025-12-03), the [Vercel April 2026 bulletin](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident) (2026-04-19, updated 2026-10-16), [Chainstack](https://chainstack.com/security-incident-nov-2026/) (2026-11-03), and the Cloudflare [Salesloft Drift response](https://blog.cloudflare.com/response-to-salesloft-drift-incident/) (2025-09-02). The sixth security-flavoured notice, the [Vercel middleware postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) (2025-03-25), is partial: it recaps an older workaround and invites readers to a partner mailing list. The other 26 notices (12 Cloudflare postmortems, 10 GitHub availability reports, Redocly, Nebius, Buttondown 0023 and 0031) tell the reader to do nothing. They name what the vendor changed or will change.

Note on grouping, because the first version muddled it: the Salesloft Drift post sits in the Cloudflare group (13) and is the fifth notice that gives a reader action. The security group (5: React, Next.js, Vercel bulletin, Chainstack, Vercel middleware postmortem) therefore holds 4 notices with a clear reader action and 1 partial.

## Corpus and method

32 notices, fetched on 2026-11-27 into `~/.cache/research-lang/exemplars/product/wave2/q0/raw/` (32 `.html` files, one per notice; the exact list is the first column of the output below). The sample is a convenience sample of well-known engineering blogs. It is not random and it is skewed to Cloudflare (13) and GitHub (10). All are vendor-authored, so they show what vendors choose to publish, not what readers prefer.

| Group | n | Publication dates (from the page's own metadata or byline) | Source pattern |
|---|---|---|---|
| Cloudflare postmortems and incident posts | 13 | 2023-11-04 to 2026-02-21 | `https://blog.cloudflare.com/<slug>/`, listed from the [post-mortem tag](https://blog.cloudflare.com/tag/post-mortem/) |
| GitHub availability reports, January to October 2026 | 10 | 2026-02-11 to 2026-11-13 (each report appears the month after its period) | `https://github.blog/news-insights/company-news/github-availability-report-<month>-2026/` |
| Security advisories, bulletins and a vulnerability postmortem | 5 | 2025-03-25 to 2026-11-03 | links in Answer 3 |
| Small-vendor postmortems | 4 | 2026-01-02 to 2026-09 | [Redocly](https://redocly.com/blog/jan-2026-outage-postmortem) (Jan 27, 2026), [Nebius](https://nebius.com/blog/posts/incident-post-mortem-analysis-us-central1-service-disruption-on-march-10) (2026-03-20), [Buttondown 0023](https://buttondown.com/blog/incident-0023) (2026-01-02), [Buttondown 0031](https://buttondown.com/blog/incident-0031) (2026-07-23) |

Publication dates in this table come from `article:published_time` or `datePublished` metadata in the fetched HTML (extracted with `dt.py`, a regex over `raw/*.html` for `article:published_time`, `datePublished` and `dateModified`, kept beside the other scripts), or from the on-page byline for React (December 3, 2025), Redocly (Jan 27, 2026) and the Vercel bulletin (19 Apr 2026, "Last updated October 16, 2026").

### Extractor (`ex.py`), run as `cd ~/.cache/research-lang/exemplars/product/wave2/q0 && python3 -I ex.py`

It reads `raw/*.html`, keeps text inside `<article>` or `<main>`, drops `script`, `style`, `nav`, `footer`, `header`, `svg`, `noscript`, `pre` and `code`, and writes `txt/*.txt`.

```python
import sys,re,html,glob,os
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.skip=0; s.art=0; s.out=[]; s.title=''; s.intitle=0; s.code=0
    def handle_starttag(s,t,a):
        if t=='title': s.intitle=1
        if t=='article' or (t=='main'): s.art+=1
        if t in('script','style','nav','footer','header','svg','noscript'): s.skip+=1
        if t in('pre','code'): s.code+=1
        if t in('p','li','h1','h2','h3','h4','br','div','tr'): s.out.append('\n')
    def handle_endtag(s,t):
        if t=='title': s.intitle=0
        if t=='article' or t=='main': s.art=max(0,s.art-1)
        if t in('script','style','nav','footer','header','svg','noscript'): s.skip=max(0,s.skip-1)
        if t in('pre','code'): s.code=max(0,s.code-1)
    def handle_data(s,d):
        if s.intitle: s.title+=d
        if s.art and not s.skip and not s.code: s.out.append(d)
for f in sorted(glob.glob('raw/*.html')):
    p=P(); p.feed(open(f,errors='ignore').read())
    t=re.sub(r'[ \t]+',' ',''.join(p.out)); t=re.sub(r'\n\s*\n+','\n',t).strip()
    open('txt/'+os.path.basename(f)[:-5]+'.txt','w').write(t)
    print(os.path.basename(f),len(t.split()),p.title.strip()[:70])
```

### Counter (`m.py`), run as `python3 -I m.py`

```python
import re,glob,os
act=re.compile(r"(?im)^\W*(please\s+)?(update|upgrade|rotate|review|check|run|install|visit|contact|see|subscribe|follow|apply|patch|reset|revoke|monitor|read|refer|ensure|enable|disable|audit|submit|reach out)\b[^.\n]{0,160}|\b(you (should|must|need to|can)|customers (should|must|are advised|are encouraged)|users (should|must)|we (strongly )?(recommend|urge|advise)|we ask (that )?(you|customers))\b[^.\n]{0,160}|\bplease\b [^.\n]{0,120}")
print('file\twords\texcl\tsorry\taction_hits\tfirst_action')
rows=[]
for f in sorted(glob.glob('txt/*.txt')):
    t=open(f).read(); w=len(t.split())
    ex=len(re.findall(r'!(\s|$)',t)); sy=len(re.findall(r'(?i)\b(sorry|apologi[sz]e[sd]?|apolog(y|ies)|regret)\b',t))
    a=[m.group(0).strip() for m in act.finditer(t)]
    rows.append((os.path.basename(f)[:-4],w,ex,sy,len(a)))
    print(f"{os.path.basename(f)[:-4]}\t{w}\t{ex}\t{sy}\t{len(a)}\t{(a[0][:70] if a else '-')}")
```

Raw output, unedited except that the tab-separated columns are left as printed. `words` is the whitespace word count of the extracted text, so a non-zero value shows the extraction returned text. `excl` counts `!` followed by whitespace or end of text. `sorry` counts word matches, not sentences (a sentence with "apologize ... regret" counts twice). `action_hits` and `first_action` come from a deliberately broad regex that also matches page chrome ("Follow on Social Media", "Explore more from GitHub ... Everything you need to master GitHub"), so those two columns are not used for any claim. The narrow next-step count is below.

```
file	words	excl	sorry	action_hits	first_action
cf_18-november-2025-outage	2924	1	2	2	Follow on Social Media
cf_5-december-2025-outage	1405	1	1	2	Follow on Social Media
cf_cloudflare-incident-march-21-2025	2105	1	3	3	Monitor operational dashboards and logs to validate change over
cf_cloudflare-incident-on-august-21-2025	1389	1	2	3	You can see some of the attempts by AWS to alleviate the congestion by
cf_cloudflare-incident-on-february-6-2025	2289	1	2	2	Follow on Social Media
cf_cloudflare-outage-february-20-2026	2760	1	2	3	Review, improve, and test failure modes of all systems handling networ
cf_cloudflare-service-outage-june-12-2025	2633	1	2	2	Follow on Social Media
cf_deep-dive-into-cloudflares-sept-12-dashboard-and-api-outage	1148	1	2	2	Follow on Social Media
cf_major-data-center-power-failure-again-cloudflare-code-orange-tested	2291	1	1	3	you can read more about that here
cf_post-mortem-on-cloudflare-control-plane-and-analytics-outage	3288	1	2	4	you should see no data loss in most analytics across our dashboard and
cf_rearchitecting-workers-kv-for-redundancy	3423	1	0	3	you need to store billions of very small values with minimal per-value
cf_response-to-salesloft-drift-incident	3399	1	2	7	we strongly urge you to rotate any credentials that you may have share
cf_route-leak-incident-january-22-2026	1452	1	2	6	you can refer to this detailed background section, or refer to the for
gh_april	2568	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_august	3584	0	0	10	You can read more about these incidents in a blog post we published la
gh_february	1342	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_january	659	0	0	7	Please note that the incidents that occurred on February 9, 2026, will
gh_july	3164	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_june	1986	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_march	1128	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_may	2436	0	0	5	Follow our status page for real-time updates on status changes and pos
gh_october	3359	0	0	7	Audit log events were affected the longest
gh_september	1531	0	0	5	Follow our status page for real-time updates on status changes and pos
sec_nextjs.org_blog_CVE-2025-66478	534	0	0	5	users should upgrade to a patched version immediately
sec_react.dev_blog_2025_12_03_critical-security-vulnerability-in-react-server-components	789	0	0	21	We recommend upgrading immediately
sec_vercel.com_blog_postmortem-on-next-js-middleware-bypass	984	0	0	3	you can early redirect to the logged-in application (or block specific
v_buttondown_com_blog_incident-0023	401	0	0	0	-
v_buttondown_com_blog_incident-0031	246	0	0	0	-
v_chainstack_com_security-incident-nov-2026_	3578	0	0	3	Update, November 10, 2026: We added technical details of the intrusion
v_nebius_com_blog_posts_incident-post-mortem-analysis-us-central1-service-disruption-on-march-10	1039	0	0	0	-
v_redocly_com_blog_jan-2026-outage-postmortem	1025	0	1	0	-
v_vercel_com_kb_bulletin_vercel-april-2026-security-incident	1015	0	0	8	you should follow:
```

Every extracted text has words (minimum 246, Buttondown 0031; maximum 3,584, Chainstack). The earlier `0 0` rows were shorthand for `excl 0`, `sorry 0`; they were not empty files.

### Exclamation marks

```
grep -nE '!(\s|$)' txt/*.txt | cut -c1-120 | sed 's#^txt/##'
```

```
cf_5-december-2025-outage.txt:62:Thanks for subscribing! You're all set to receive our newest blog posts.
cf_cloudflare-incident-march-21-2025.txt:113:Thanks for subscribing! You're all set to receive our newest blog posts
cf_cloudflare-incident-on-august-21-2025.txt:63:Thanks for subscribing! You're all set to receive our newest blog po
cf_cloudflare-incident-on-february-6-2025.txt:107:Thanks for subscribing! You're all set to receive our newest blog 
cf_18-november-2025-outage.txt:117:Thanks for subscribing! You're all set to receive our newest blog posts.
cf_route-leak-incident-january-22-2026.txt:61:Thanks for subscribing! You're all set to receive our newest blog post
cf_cloudflare-outage-february-20-2026.txt:117:Thanks for subscribing! You're all set to receive our newest blog post
cf_response-to-salesloft-drift-incident.txt:155:Thanks for subscribing! You're all set to receive our newest blog po
cf_cloudflare-service-outage-june-12-2025.txt:108:Thanks for subscribing! You're all set to receive our newest blog 
cf_major-data-center-power-failure-again-cloudflare-code-orange-tested.txt:59:Thanks for subscribing! You're all set
cf_deep-dive-into-cloudflares-sept-12-dashboard-and-api-outage.txt:49:Thanks for subscribing! You're all set to rece
cf_post-mortem-on-cloudflare-control-plane-and-analytics-outage.txt:64:Thanks for subscribing! You're all set to rec
cf_rearchitecting-workers-kv-for-redundancy.txt:69:Thanks for subscribing! You're all set to receive our newest blog
```

13 hits, all the same line. Check that nothing else remains:

```
grep -vE "^Thanks for subscribing! You're all set" txt/*.txt | grep -cE '!(\s|$)'
0
```

### Apology sentences (`ap.py`), run as `python3 -I ap.py $PWD`

```python
import re,glob,os,sys
os.chdir(sys.argv[1])
pat=re.compile(r'(?i)\b(sorry|apologi[sz]e[sd]?|apolog(y|ies))\b')
for f in sorted(glob.glob('txt/*.txt')):
    t=open(f).read()
    ss=[s for s in re.split(r'(?<=[.!?])\s+|\n',t) if pat.search(s)]
    print(os.path.basename(f)[:-4][:60],len(ss),sep='\t')
    for s in ss: print('   >',s.strip()[:230])
```

Raw output (sentences truncated at 230 characters by the script):

```
cf_18-november-2025-outage	2
   > We are sorry for the impact to our customers and to the Internet in general.
   > On behalf of the entire team at Cloudflare, I would like to apologize for the pain we caused the Internet today.
cf_5-december-2025-outage	1
   > On behalf of the team at Cloudflare we want to apologize for the impact and pain this has caused again to our customers and the Internet as a whole.
cf_cloudflare-incident-march-21-2025	2
   > We’re deeply sorry for this incident and the disruption it may have caused to you or your users.
   > Again, we sincerely apologize for this incident and deeply regret any disruption it has caused you or your users.
cf_cloudflare-incident-on-august-21-2025	2
   > We’re very sorry for this incident.
   > We are sorry for the disruption this incident caused for our customers.
cf_cloudflare-incident-on-february-6-2025	2
   > We’re deeply sorry for this incident: this was a failure of a number of controls, and we are prioritizing work to implement additional system-level controls related not only to our abuse processing systems, but so that we continue
   > We understand this was a serious incident, and we are painfully aware of — and extremely sorry for — the impact it caused to customers and teams building and running their businesses on Cloudflare.
cf_cloudflare-outage-february-20-2026	2
   > We are sorry for the impact to our customers.
   > We deeply apologize for this incident today and how it affected the service we provide our customers, and also the Internet at large.
cf_cloudflare-service-outage-june-12-2025	2
   > We’re deeply sorry for this outage: this was a failure on our part, and while the proximate cause (or trigger) for this outage was a third-party vendor failure, we are ultimately responsible for our chosen dependencies and how we 
   > Again we are deeply sorry for the impact and are working diligently to improve our service resiliency.
cf_deep-dive-into-cloudflares-sept-12-dashboard-and-api-outa	2
   > We’re very sorry about the disruption.
   > We’re very sorry about the disruption.
cf_major-data-center-power-failure-again-cloudflare-code-ora	1
   > Once again, we are very sorry for the impact to our customers, particularly those that rely on the Analytics engine who were unable to access that product feature during the incident.
cf_post-mortem-on-cloudflare-control-plane-and-analytics-out	2
   > I am sorry and embarrassed for this incident and the pain that it caused our customers and our team.
   > As I said earlier, I am sorry and embarrassed for this incident and the pain that it caused our customers and our team.
cf_rearchitecting-workers-kv-for-redundancy	0
cf_response-to-salesloft-drift-incident	2
   > For that, we sincerely apologize.
   > For this, we sincerely apologize.
cf_route-leak-incident-january-22-2026	2
   > We sincerely apologize to the users, customers, and networks we impacted yesterday as a result of this BGP route leak.
   > Most importantly, we would again like to apologize for the impact we caused users and customers of Cloudflare, as well as any impact felt by external networks.
gh_april	0
gh_august	0
gh_february	0
gh_january	0
gh_july	0
gh_june	0
gh_march	0
gh_may	0
gh_october	0
gh_september	0
sec_nextjs.org_blog_CVE-2025-66478	0
sec_react.dev_blog_2025_12_03_critical-security-vulnerabilit	0
sec_vercel.com_blog_postmortem-on-next-js-middleware-bypass	0
v_buttondown_com_blog_incident-0023	0
v_buttondown_com_blog_incident-0031	0
v_chainstack_com_security-incident-nov-2026_	0
v_nebius_com_blog_posts_incident-post-mortem-analysis-us-cen	0
v_redocly_com_blog_jan-2026-outage-postmortem	1
   > For that, we apologize.
v_vercel_com_kb_bulletin_vercel-april-2026-security-incident	0
```

Sentence counts: Cloudflare 2 in 10 notices, 1 in 2, 0 in 1; Redocly 1; every other notice 0. In the Sept 12, 2025 Cloudflare post the same sentence, "We're very sorry about the disruption.", appears twice, so the 2 there is a repeated sentence, not two distinct apologies.

Where the apologies sit (`pos.py`, fraction of the way through the extracted text for each match; run as `python3 -I pos.py $PWD`):

```python
import re,glob,os,sys
os.chdir(sys.argv[1])
pat=re.compile(r'(?i)\b(sorry|apologi[sz]e[sd]?|apolog(y|ies))\b')
for f in sorted(glob.glob('txt/cf_*.txt'))+['txt/v_redocly_com_blog_jan-2026-outage-postmortem.txt']:
    t=open(f).read(); n=len(t)
    print(os.path.basename(f)[:45],[round(m.start()/n,2) for m in pat.finditer(t)])
```

```
cf_18-november-2025-outage.txt [0.09, 0.86]
cf_5-december-2025-outage.txt [0.92]
cf_cloudflare-incident-march-21-2025.txt [0.12, 0.97]
cf_cloudflare-incident-on-august-21-2025.txt [0.11, 0.95]
cf_cloudflare-incident-on-february-6-2025.txt [0.06, 0.96]
cf_cloudflare-outage-february-20-2026.txt [0.08, 0.96]
cf_cloudflare-service-outage-june-12-2025.txt [0.05, 0.98]
cf_deep-dive-into-cloudflares-sept-12-dashboa [0.16, 0.94]
cf_major-data-center-power-failure-again-clou [0.96]
cf_post-mortem-on-cloudflare-control-plane-an [0.09, 0.96]
cf_rearchitecting-workers-kv-for-redundancy.t []
cf_response-to-salesloft-drift-incident.txt [0.06, 0.81]
cf_route-leak-incident-january-22-2026.txt [0.11, 0.96]
v_redocly_com_blog_jan-2026-outage-postmortem [0.11]
```

Each pair is one early match and one late match. The late match sits in the closing 19% (position 0.81 or later) in all 10 two-apology Cloudflare posts. The Salesloft Drift post's second apology is at 0.81, the earliest closing one. The "once near the start and once near the end" shape holds for all 10, which is the shape the new rule text uses.

Operative passages, with each post's own publication date from its metadata:

- [Cloudflare, 2025-11-18](https://blog.cloudflare.com/18-november-2025-outage/): "We are sorry for the impact to our customers and to the Internet in general." and, at the close, "On behalf of the entire team at Cloudflare, I would like to apologize for the pain we caused the Internet today."
- [Cloudflare route leak, published 2026-01-23](https://blog.cloudflare.com/route-leak-incident-january-22-2026/): "We sincerely apologize to the users, customers, and networks we impacted yesterday as a result of this BGP route leak." and "Most importantly, we would again like to apologize for the impact we caused users and customers of Cloudflare".
- [Redocly, Jan 27, 2026](https://redocly.com/blog/jan-2026-outage-postmortem): one sentence, "For that, we apologize."
- [Cloudflare power failure post, 2024-04-08](https://blog.cloudflare.com/major-data-center-power-failure-again-cloudflare-code-orange-tested/): one apology, at the close: "Once again, we are very sorry for the impact to our customers".
- Zero apology: [Cloudflare Workers KV re-architecture, 2025-08-08](https://blog.cloudflare.com/rearchitecting-workers-kv-for-redundancy/), all 10 GitHub reports, and the React, Next.js, Vercel bulletin, Chainstack and Nebius texts.

GitHub's [October 2026 report](https://github.blog/news-insights/company-news/github-availability-report-october-2026/) (published 2026-11-13) has no apology sentence (`gh_october 0` above). The passage that describes its incidents, from the extracted text: "Audit log events were affected the longest. Recent activity took longer to appear when customers searched their audit logs, with delays of up to 1 hour and 50 minutes. Audit log events were fully caught up after about 6 hours and 46 minutes." It states impact in minutes and gives no apology.

### Next step: a narrow reader-action count (`ns.py`), run as `python3 -I ns.py $PWD`

The broad `m.py` regex matched page chrome, so a narrower one was written. It counts phrases that address the reader with an instruction (`we recommend|urge|encourage|advise`, `customers|users|you should|must|need to <verb>`, `please reach|contact|upgrade|update|rotate`, `rotate the|your|any <noun>`, `upgrade immediately|to`, `ask customers to <verb>`), and separately counts remediation-section words (`next steps`, `remediation`, `what we are doing`, `steps we are taking`, `no action is required`, `no customer action`).

```python
import re,glob,os,sys
os.chdir(sys.argv[1])
act=re.compile(r"(?i)\b(we (strongly )?(recommend|urge|encourage|advise)|(customers|users|you) (should|must|need to) \w+|please (reach|contact|upgrade|update|rotate)|rotate (the|your|any) \w+|upgrade (immediately|to)|ask customers to \w+)")
rem=re.compile(r"(?i)next steps|remediation|what we are doing|what we.re doing|steps we are taking|no action is required|no customer action")
print('file\taction_hits\tremediation_hits\tfirst_action_hit')
for f in sorted(glob.glob('txt/*.txt')):
    t=open(f).read().replace('\n',' ')
    a=[m.group(0) for m in act.finditer(t)]; r=rem.findall(t)
    print(f"{os.path.basename(f)[:-4][:48]}\t{len(a)}\t{len(r)}\t{a[0] if a else '-'}")
```

```
file	action_hits	remediation_hits	first_action_hit
cf_18-november-2025-outage	0	1	-
cf_5-december-2025-outage	0	0	-
cf_cloudflare-incident-march-21-2025	0	2	-
cf_cloudflare-incident-on-august-21-2025	0	2	-
cf_cloudflare-incident-on-february-6-2025	0	11	-
cf_cloudflare-outage-february-20-2026	0	5	-
cf_cloudflare-service-outage-june-12-2025	0	3	-
cf_deep-dive-into-cloudflares-sept-12-dashboard-	0	2	-
cf_major-data-center-power-failure-again-cloudfl	0	0	-
cf_post-mortem-on-cloudflare-control-plane-and-a	1	1	you should see
cf_rearchitecting-workers-kv-for-redundancy	1	0	you need to store
cf_response-to-salesloft-drift-incident	4	3	we strongly urge
cf_route-leak-incident-january-22-2026	0	0	-
gh_april	2	0	upgrade to
gh_august	1	0	you need to master
gh_february	1	0	you need to master
gh_january	1	0	you need to master
gh_july	1	0	you need to master
gh_june	1	0	you need to master
gh_march	1	1	you need to master
gh_may	1	2	you need to master
gh_october	1	0	you need to master
gh_september	1	0	you need to master
sec_nextjs.org_blog_CVE-2025-66478	5	0	we strongly encourage
sec_react.dev_blog_2025_12_03_critical-security-	11	0	We recommend
sec_vercel.com_blog_postmortem-on-next-js-middle	1	3	Please reach
v_buttondown_com_blog_incident-0023	0	2	-
v_buttondown_com_blog_incident-0031	0	0	-
v_chainstack_com_security-incident-nov-2026_	4	1	customers need to do
v_nebius_com_blog_posts_incident-post-mortem-ana	0	0	-
v_redocly_com_blog_jan-2026-outage-postmortem	0	2	-
v_vercel_com_kb_bulletin_vercel-april-2026-secur	4	3	you should follow
```

Reading the non-zero hits in the 26 non-security notices, each checked in the text: Cloudflare control plane "you should see no data loss in most analytics" and Workers KV "you need to store billions of very small values" are descriptions, not instructions; the nine GitHub reports with `you need to master` hit the footer "Everything you need to master GitHub" (page chrome); `gh_april` `upgrade to` is "a routine infrastructure upgrade to the messaging system" (vendor-side). None tells the reader to act. The five notices with a real reader instruction are the five named in Answer 3, plus the Vercel middleware postmortem's "Please reach out to to be included" (a mailing-list invitation).

Passages for the five, with page dates:

| Notice (date) | Reader-action passage |
|---|---|
| [React](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) (December 3, 2025) | "We recommend upgrading immediately." and "please upgrade to any of the fixed versions immediately", with fixed versions listed |
| [Next.js CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478) (2025-12-03) | "All users should upgrade to the latest patched version in their release line" under a "Required Action" heading, and "we strongly encourage you to rotate any secrets it uses" |
| [Vercel April 2026 bulletin](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident) (19 Apr 2026, updated October 16, 2026) | "Review and rotate environment variables that were not marked as \"sensitive.\"" |
| [Chainstack](https://chainstack.com/security-incident-nov-2026/) (2026-11-03, updated 2026-11-10) | "Rotate the node credentials. Self-service rotation is now available in the console." |
| [Cloudflare Salesloft Drift response](https://blog.cloudflare.com/response-to-salesloft-drift-incident/) (2025-09-02) | "we strongly urge you to rotate any credentials that you may have shared with us through this channel" |

How the 26 end: Cloudflare's 12 other posts end on a timeline or remediation list and then the page chrome (the 5 December 2025, route-leak and power-failure posts have no `next steps` or `remediation` heading at all); GitHub's reports end on a status-page pointer; Nebius ends on a "Post-incident action plan" that lists vendor drills; Buttondown 0031 ends "Going forward, when we know a dependency bug can affect us, we'll track the fix through to upgrade". A remediation heading is therefore not universal (14 of the 26 notices have no remediation-section phrase at all in the `ns.txt` column `remediation_hits`), so the earlier postmortem check in MKT-VOICE-19 would have failed on real notices and is removed.

`No action is required`: `grep -c -iE 'no action is required|no customer action|no action required' txt/*.txt` printed 0 for all 32 files, so that phrase has no support and is not in the rules below.

### Humour

Humour has no mechanical test and none was built. A read of the opening and closing paragraphs of the 5 security and breach notices and 13 Cloudflare posts found none (a reading, not a count).

## Effect on the ruleset

The two cited style guides behind the current MKT-VOICE-13 are vendor guides, listed in the consolidation: [Atlassian](https://atlassian.design/foundations/content/voice-tone) says errors should be "less bold and more prescriptive" ((c) 2026), and [Monzo](https://monzo.com/tone-of-voice/) (undated) apologises once and keeps humour out of serious moments. They stay as context. The measurement here is the only corpus evidence and is vendor practice only.

### MKT-VOICE-13: change; promote the measured parts to SHOULD

Exact new text:

- **MKT-VOICE-13 (SHOULD).** "In a notice about a failure, outage, security fix, regression or breaking change (a release note, email, status post or advisory), use no exclamation mark and no joke. An apology is optional. If you apologise, use at most 2 sentences, one near the start and one near the end, and never apologise mid-notice. Do not apologise for a change that harms no one."
  - Rationale: 0 of 32 sampled vendor notices use an exclamation mark outside page chrome. 10 of 13 sampled Cloudflare postmortems carry exactly 2 apology sentences (one in the opening 16%, one in the closing 19%) and the other 19 notices carry 0 or 1, so a cap of 1 contradicts the best-known postmortems and a cap of 2 contradicts none (measured 2026-11-27, vendor data, convenience sample, `followup-q0.md`). Atlassian and Monzo remain supporting vendor style guides for tone and humour.
  - Verification: `python3 -I "$DQ/strip_prose.py" <notice> | grep -nE '!(\s|$)'` returns nothing, and `python3 -I "$DQ/strip_prose.py" <notice> | grep -ciE '\b(sorry|apologi[sz]e[sd]?|apolog(y|ies))\b'` prints at most 2 (it counts matching lines, which is a sentence count when the notice is one sentence per line; count by sentence with the split in `ap.py` if the text wraps). Run it on page text, never on built HTML, which carries newsletter chrome with `!`. Humour stays a reading check.

### MKT-VOICE-19 (new, SHOULD): a reader action in a security or breach notice

- **MKT-VOICE-19 (SHOULD).** "A security advisory, vulnerability notice or breach notice that asks customers to act must name each action with a command, a fixed version, a credential to rotate, or a link, in the imperative mood ('Rotate the node credentials.', 'Upgrade to 19.2.1.'). An outage or incident postmortem needs no reader-action line: state what the vendor changed or will change, and add a reader step only when customers have something to do."
  - Rationale: 5 of 5 security and breach notices measured that tell customers to act name the action with a version, credential or link. 0 of the 26 outage and incident postmortems and availability reports tell the reader to do anything, and 14 of the 26 have no remediation heading. Binding postmortems to a reader step, as the old MKT-VOICE-13 text did, would force invented advice. Vendor data, convenience sample.
  - Verification: for an advisory, `grep -nE '^(Update|Upgrade|Rotate|Review|Run|Install|Revoke|Reset)\b|(should|must) (upgrade|update|rotate)|we (strongly )?(recommend|urge|encourage)' <advisory>` prints at least one line, and that line, or one within 3 lines, matches `grep -E '[0-9]+\.[0-9]+|`[^`]+`|https?://'` (a version, a command in backticks or a link). For a postmortem there is no pass or fail check: the rule only forbids inventing an action, and review catches that.
  - Severity SHOULD, not MUST: the sample is small and vendor-only.

MKT-VOICE-13 therefore leaves CONSIDER for the exclamation and apology parts. The old clause "name the next step the reader takes" moves to MKT-VOICE-19 and is limited to security and breach notices. The "No action is required" line proposed in the first version is dropped because 0 of 32 notices contain it.

### Other rules touched

- MKT-VOICE-15: confirm. These notices are exactly its public-interest class. MKT-VOICE-13 and -19 govern tone and content, MKT-VOICE-15 the review.
- MKT-VOICE-03: confirm, unaffected. Em dashes in notices were not measured here. (One incidental sighting: the Cloudflare 2025-02-06 apology sentence contains an em dash; that is vendor text, not a rule input.)

## Dated facts

| Fact | Source | Publication date |
|---|---|---|
| Cloudflare 18 Nov 2025 outage post apologises in opening and closing | [post](https://blog.cloudflare.com/18-november-2025-outage/) | 2025-11-18 (metadata) |
| Cloudflare route leak post apologises twice | [post](https://blog.cloudflare.com/route-leak-incident-january-22-2026/) | 2026-01-23 (metadata) |
| Cloudflare Salesloft Drift response urges credential rotation | [post](https://blog.cloudflare.com/response-to-salesloft-drift-incident/) | 2025-09-02 (metadata) |
| Cloudflare control plane and analytics postmortem (oldest in sample), 2 apologies by the CEO | [post](https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/) | 2023-11-04 (metadata) |
| React advisory recommends upgrading immediately | [react.dev](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) | December 3, 2025 (byline) |
| Next.js CVE-2025-66478 requires upgrade | [nextjs.org](https://nextjs.org/blog/CVE-2025-66478) | 2025-12-03 (metadata) |
| Vercel middleware postmortem recaps a workaround and invites readers to a mailing list | [Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) | 2025-03-25 (metadata) |
| Vercel bulletin tells customers to review and rotate environment variables | [Vercel](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident) | 19 Apr 2026, last updated October 16, 2026 (byline) |
| Chainstack asks customers to rotate node credentials | [Chainstack](https://chainstack.com/security-incident-nov-2026/) | 2026-11-03, modified 2026-11-11 (metadata) |
| GitHub October 2026 availability report carries no apology and states audit-log delay of up to 1 hour 50 minutes | [GitHub](https://github.blog/news-insights/company-news/github-availability-report-october-2026/) | 2026-11-13 (metadata) |
| Redocly apologises once | [Redocly](https://redocly.com/blog/jan-2026-outage-postmortem) | Jan 27, 2026 (byline) |
| Nebius, Buttondown 0023, Buttondown 0031: no apology, no reader action | [Nebius](https://nebius.com/blog/posts/incident-post-mortem-analysis-us-central1-service-disruption-on-march-10), [0023](https://buttondown.com/blog/incident-0023), [0031](https://buttondown.com/blog/incident-0031) | 2026-03-20, 2026-01-02, 2026-07-23 (metadata) |

All 32 pages were fetched on 2026-11-27. Some pages report a later "modified" time than their publication date (Cloudflare pages show a 2026-07 modified time for older posts); the table gives the publication date.

## What could not be determined

- Whether readers respond better to notices that follow this shape. Every figure is vendor practice, not a reader-outcome measure.
- Humour: no mechanical measure exists and none was built. Only a reading supports "none".
- The corpus is a convenience sample of 32 (13 Cloudflare, 10 GitHub, 9 other). Missing: solo-maintainer open-source advisories (GitHub Security Advisories for small packages), the notices an agent in this fleet is likelier to write. The GitHub advisory API needs no login, but it was not run in this pass.
- Whether `ap.py`'s sentence split mis-splits abbreviations such as "e.g."; the 10 two-sentence Cloudflare results were each read in the output above and are real sentences.
- Position fractions in `pos.txt` are of the extracted text, which excludes code blocks and page chrome but includes the post's own timeline tables, so "opening 16%" is approximate.
