---
title: What the first screen of a software-service offer page must say
program: product
topic: marketing-first-screen-copy
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 26
---

# What the first screen of a software-service offer page must say

## Question

Wave 1 scoped services in and measured none ("Open questions", [marketing-first-screen-copy.md](../marketing-first-screen-copy.md)). The question: what must the first screen of a software-service offer page say (scope of the engagement, who delivers it, a price or engagement signal, the next step)? Measure at least 15 exemplar service pages.

## Answer

Measured corpus: 21 service pages (software consultancies, agencies, vendor professional-services pages), re-fetched and re-scored by script on 2026-11-27 for this repair pass. The market norm is a service noun and a contact button. It is **not** the four elements the question lists. Counts over the hero segment, from `score.py` and `verify12.sh` below, then read by hand where the script is known to misfire:

| Element | Script filter matches (n=21) | After reading the matches |
|---|---|---|
| Names the service type in H1 or subhead | 16 | 14 to 16 (p8 CloudBees "software development" and p19 Vinsol "design, engineering" are the two disputed pages; I count 14, a reader may count 16) |
| Names the buyer (explicit audience noun) | 2 (p2, p10) | 1 (p2 "enterprises"; p10 matched "CTO" inside a job-function dropdown of its contact form) |
| Verifiable proof of the deliverer (number or named partner tier) | 4 (p18, p31, p33, p35) | 4 |
| Price figure anywhere in the full page text | 0 real (3 currency matches, all non-prices) | 0 |
| Engagement-model signal in the hero | 2 (p10 "Packages", p14 "in weeks") | 2 |
| Contact call to action | 16 | 15 (p5 matched only the nav item "Contact"); p14 "Find your solution" is a CTA the regex does not see |
| Next step that says what happens after the click | 0 | 0 |

Two facts decide the ruleset. First, no page of the 21 printed a currency price in server-rendered text. The only "fixed price" statements (Monterail) sit in an FAQ and a case study, below the first screen. Second, the primary evidence on price is old and partly mixed: Nielsen Norman Group reported in 2013 that business customers rank price as the top information need; a 2025 vendor dataset of SaaS pages finds transparent pricing lowers form-fill rate but raises pipeline quality; no 2020s study of service-firm pages was found (searches below). No conversion data exists here for or against any element.

So the answer is a split. What the corpus shows is descriptive. What the rule should say is normative and rests on NN/g (2013) plus Forrester (2019, opinion), not on the corpus. The rules below are therefore SHOULD or CONSIDER.

## Method

### Fetch (command and output)

`~/.cache/research-lang/exemplars/product/wave2/scripts-r2/fetch.sh` reads `urls.tsv` (page number, URL) and runs, per URL, `curl -sL -m 25 -A 'Mozilla/5.0 (research)' -o p<N>.html -w '%{http_code}' <url>`, then prints page, HTTP status, bytes, URL. Output of the run on 2026-11-27 (also in `wave2/fetch-r2.log`):

```
1	200	96286 bytes	https://thoughtbot.com/
2	200	212406 bytes	https://www.thoughtworks.com/
5	200	71786 bytes	https://10up.com/
7	200	401350 bytes	https://www.percona.com/services/
8	200	159145 bytes	https://www.cloudbees.com/services
10	200	427284 bytes	https://www.mongodb.com/services/consulting
11	200	213893 bytes	https://about.gitlab.com/services/
12	200	532318 bytes	https://www.redhat.com/en/services/consulting
13	200	174404 bytes	https://www.eqengineered.com/
14	200	236894 bytes	https://rangle.io/
16	200	581202 bytes	https://www.elastic.co/consulting
18	200	135966 bytes	https://ministryofprogramming.com/
19	200	17013 bytes	https://www.vinsol.com/
31	200	112753 bytes	https://softwaremill.com/
32	200	292312 bytes	https://www.netguru.com/
33	200	122599 bytes	https://www.monterail.com/
35	200	256634 bytes	https://www.praecipio.com/
38	200	839601 bytes	https://www.databricks.com/forward-deployed-engineering
39	200	170073 bytes	https://www.stxnext.com/
41	200	203604 bytes	https://sparkbox.com/
44	200	256324 bytes	https://www.codecentric.de/en
d1	403	4551 bytes	https://www.toptal.com/
d2	403	5438 bytes	https://lullabot.com/
d3	429	25128 bytes	https://www.hashicorp.com/professional-services
d4	403	765 bytes	https://www.globant.com/
d5	403	5370 bytes	https://www.epam.com/
d6	403	4554 bytes	https://postlight.com/
d7	200	6135 bytes	https://railsware.com/
d8	200	49333 bytes	https://www.cognizant.com/us/en/services
d9	404	200800 bytes	https://canonical.com/ubuntu/pro
```

Reading of the output: the 21 pages are the 21 usable ones. The six `d1` to `d6` rows are the 403/429 drops (toptal, lullabot, hashicorp, globant, epam, postlight); a 403 or 429 body of 0.8 to 25 KB is a bot-block page. `d7` railsware.com returns 200 with 6135 bytes, which is a shell with no page content (the drop reason "6 KB" is confirmed). `d9` canonical.com/ubuntu/pro returns 404 as first fetched. `d8` cognizant: the URL I guessed this time returns 200 (49333 bytes); the URL used in the first pass is not recorded and returned 404, so the "404" drop for cognizant is not reproduced here and cognizant is simply not in the corpus (a gap, not a finding). Not re-run: pivotal.io, pivotallabs.com (unreachable in the first pass), support.planetscale.com (403/429), bitovi (vercel checkpoint), and the non-service pages stackoverflow.co, pragmaticengineer.com, infoq.com, crunchydata.com, gruntwork.io. Their drop reasons come from the first pass and have no output saved. The corpus pages themselves were fetched twice; the second fetch (above) is the one scored here, and some hero texts changed between the two (p32, p39, p41), so a service page's first screen is not stable even over hours. Mix: 11 independent consultancies or agencies, 10 vendor professional-services pages. Every page is the vendor's own pitch, so its claims are self-description. None prints a page date.

### First screen (command and complete output)

The same definition as wave 1's "pitch" page proxy: text from the first `<h1>` to the next `<h2>`, capped at 600 characters, with `<script>`, `<style>`, `<svg>` and `<noscript>` removed. This is a source proxy, not a rendered screenshot. `hero.py` implements it for all 21 pages; command and full output (21 lines, in page order, saved to `wave2/hero-r2.txt`):

```sh
cd ~/.cache/research-lang/exemplars/product/wave2/scripts-r2 && python3 -I hero.py
```

```
--- p1: When the stakes are high, experience matters Our senior team partners with you to deliver reliable software and strengthen your team, even under complex constraints. Let’s talk
--- p2: Change the economics of how your business runs and grows AI that works Thoughtworks is a global technology consultancy that helps enterprises find where technology will pay off, then build it. We modernize core systems, redesign workflows around AI agents and launch new products. We bring decades of engineering, our own AI platforms and the freedom to use yours. Bring us your challenge
--- p5: 10up Toggle Main Navigation About Us Our Work Blog Careers Giving Back Contact Our WordPress and CMS expertise is now part of . Our new brand . We are now a part of .
--- p7: We Don't Sell Databases. We Make Sure They Run. Support and services that span your entire database stack. No agenda. No bias. Talk to an Expert View Services One Stack, One Team Get support across upstream open source, Percona distributions, and cloud-managed databases — all from a single vendor. Real, Honest Answers Our recommendations are based on technical merit, not quotas or platform loyalty. Total Freedom Move between engines, clouds, and distributions while keeping the same team. Database Services
--- p8: Achieve your digital transformation goals Take your software development to the next level, Cloudbees has the tools, expertise, and experience you need. Contact sales
--- p10: Professional Services MongoDB Consulting Accelerate your most important initiatives. Arm your teams with the deepest bench of MongoDB expertise, enabling them to drive success and reduce risk at every stage of your digital transformation and application development journey. View Packages Contact Us Contact Us Business Email* First Name* Last Name* Company* Business Phone Select Job Function IT Executive (CIO, CTO, VP Engineering, etc.) Business Executive (CEO, COO, CMO, etc.) Architect Business Development / Alliance Manager DBA Technical Operations Director / Development Manager Product / Pro
--- p11: GitLab Services Accelerate development cycles, enhance security practices, or optimize your DevSecOps workflows with the help of our Success and Professional Services teams. Contact sales
--- p12: Build customized solutions with expert guidance Optimize your IT infrastructure and maximize the value of your Red Hat® technology investments with the help of Red Hat experts. From AI strategies to platform migration and modernization roadmaps, we’re here to help you meet your needs—now and in the future. Talk to a consultant Jump to section Jump to section
--- p13: Drive Clarity. Create Energy. Deliver Success. HOW CAN WE HELP YOU AND YOUR TEAM? LET's TALK. Our Work
--- p14: Agentic Product Engineering, on infrastructure you actually own. Small expert teams shipping production software in weeks, on a sovereign substrate that keeps working when the platforms don't. Find your solution See it in production Small expert teams shipping production software in weeks, on a sovereign substrate that keeps working when the platforms don't. Find your solution See it in production Live webinar What's a Developer's Job When Agents Do the Building? Tuesday, December 15 · 12:30 PM ET · Live Save my seat → Live webinar Designing the Moment an Agent Asks for Permission Tuesday, Dec
--- p16: Outcome-based consulting services for your success Elastic Professional Services offerings include tailored consulting and implementation services with outcomes such as implementing, managing, and optimizing Elastic environments. We cover a wide range of needs, from initial architecture strategy and planning to deployment, migration, custom development, and optimization. Contact us
--- p18: Building the future of FinTech HealthTech AI together. Your AI-first product/engineering partner, from spec to production. We build intelligent products that solve real problems. Explore Our Impact Let’s Build the Future Products Built 100+ Market Value Created €500M+ Years in Business 10+ Clients from Referrals 90%
--- p19: Bringing brands to life with design and end-to-end solutions Bringing brands to life with design and end-to-end solutions A look into our process We stand by a holistic approach to strategy, product, engineering, content, business, and the customer-side experience. We orient ourselves from technology to business orientation. Ideate Turn your idea from concept to MVP Design Sketch out the product to match user needs Develop Convert designs to live application Deploy Launching the application to the market Meet Our Brands Gift with any one of our brands (we’re always adding more!), and abracadab
--- p31: Engineering expertise for high-throughput, real-time systems We build distributed platforms combining streaming, observability, and infrastructure at scale with Apache Kafka expertise as a leading IBM/Confluent partner. Contact us
--- p32: AI-native commerce We power digital commerce with AI-driven platforms, scalable marketplaces, and omnichannel experiences. Trusted by:
--- p33: Agentic software development and product design company Trusted by 400+ companies worldwide to build web, mobile, and AI products since 2010 Start a project See our work TRUSTED BY:
--- p35: Claude + Atlassian Don’t let disorganized data and isolated systems hinder your AI and Cloud Strategy. Partner with Praecipio, North America's largest pure-play Atlassian Platinum Solution Partner and a member of the Claude Partner Network, to create a solid foundation for intelligent operations. Schedule a Consultation Today TRUSTED BY THE BEST WE KNEW THIS DAY WOULD COME...
--- p38: Databricks Forward Deployed Engineering Contact us to learn more Accelerating customer outcomes and platform adoption through world-class technical expertise, setting the standard for delivery excellence and enablement. Databricks Forward Deployed Engineering can help you at any point in your data and AI journey.
--- p39: Engineered for what’s next We turn isolated AI experiments into resilient operational systems for the Industrial and Financial sectors. GET IN TOUCH BUILT ON _ EXCELLENCE
--- p41: Trusted Digital Collaboration Trusted Digital Collaboration Design systems that drive meaningful change for you.
--- p44: Software projects are complex – we make them successful From strategy to operations: with technical depth that extends beyond consulting. AI, cloud, modernization, security – we build and run what your business truly needs.
```

p5 shows the rebrand banner and nav; p13 shows only a slogan; both have no element present. p10 and p14 hero segments run into a contact form and webinar cards because no `<h2>` follows soon; this is the source of the p10 "CTO" false positive.

### Scoring (command and complete output)

`score.py` applies one regex per element to each hero (and the price, fixed-price and free-step regexes to the full text). Patterns are in `scripts-r2/score.py`; the key ones:

```
E1 service : \b(consult\w*|implementation|migration|engineering|development|support|training|audit|review|design|services?)\b
E2 buyer   : \b(enterprises?|founders?|startups?|scale-ups?|platform teams?|CTOs?|engineering leaders?|[a-z]+ teams)\b
E3 price   : [$€£][0-9]|\bfrom [$€£]|\bpackages?\b|\bfixed[- ](price|fee|scope)\b|\bper (hour|day|week|month)\b|\bin [0-9]+ (days|weeks|months)\b|price on request
E4 next    : within [0-9]+|[0-9]+[- ]minute|\bfree\b|\bwe reply\b|\bwe respond\b|first (call|workshop|assessment|deliverable)
CTA        : contact|let.s talk|talk to|get in touch|schedule|start a project|bring us|build the future|consultation
PROOF      : [0-9][0-9,.]*\+|\b[0-9]+ years|since [0-9]{4}|\bplatinum\b|\bpartner\b
full text  : PRICE [$€£]\s?[0-9][0-9,.]*(\s?[MKkBb]\b)? ; FIXED fixed[- ](price|fee|scope) ; FREE free (consultation|call|assessment|discovery)|within (one|1|\d+) (business )?(day|hour)s?|\d+[- ]minute (call|chat|consult)|no obligation
```

Command: `cd ~/.cache/research-lang/exemplars/product/wave2/scripts-r2 && python3 -I score.py`. Output (match counts per page; columns are hero matches for E1 to PROOF, then full-page matches for price, fixed, free):

```
page	E1svc	E2buyer	E3price	E4next	CTA	proof	|full: price fixed free
p1	0	0	0	0	1	0	0	0	0
p2	2	1	0	0	1	0	0	0	0
p5	0	0	0	0	1	0	0	0	0
p7	5	0	0	0	1	0	0	0	0
p8	1	0	0	0	1	0	0	0	0
p10	6	2	1	0	2	0	0	0	0
p11	3	1	0	0	1	0	0	0	0
p12	2	0	0	0	1	0	0	0	0
p13	0	0	0	0	1	0	0	0	0
p14	1	2	0	0	0	0	0	0	0
p16	8	0	0	0	1	0	0	0	0
p18	1	0	1	0	1	3	1	0	0
p19	4	0	0	0	0	0	0	0	0
p31	1	0	0	0	1	1	0	0	0
p32	0	0	0	0	0	0	0	0	0
p33	2	0	0	0	1	2	1	2	0
p35	1	0	0	0	2	4	1	0	0
p38	2	0	0	0	1	0	0	0	0
p39	0	0	0	0	1	0	0	0	1
p41	1	0	0	0	0	0	0	0	0
p44	1	0	0	0	0	0	0	0	0
pages with >=1 match (of 21):	16	4	2	0	16	4	3	1	1
```

The raw counts include false positives, so `ctx2.py` prints the matched strings (`python3 -I ctx2.py`, saved to `wave2/ctx-r2.txt`). The decisive lines:

```
p2  E2 ['enterprises']            p10 E2 ['your teams', 'CTO']   p11 E2 ['Services teams']   p14 E2 ['expert teams','expert teams']
p10 E3 ['Packages']               p18 E3 ['€5']                   p14 E3 []
p18 proof ['partner','100+','10+']   p31 proof ['partner']   p33 proof ['400+','since 2010']   p35 proof ['Partner','Platinum','Partner','Partner']
p18 price: ...e Future Products Built 100+ Market Value Created €500M+ Years in Business 10+ Clients from Ref...
p33 price: ...ams of close to 20 people. Seat Unique has raised £52M to date, sold 500,000+ premium tickets ...
p33 fixed: ...rst scheduling platform, live in seven weeks at a fixed price. Planners now schedule the entire workf...
p33 fixed: ...ngagement models does Monterail offer? We offer fixed-price projects for well-defined scopes, time-...
p35 price: ...prove AI Outputs Watch Now ⟶ CASE STUDY Solving a $100M Problem for a Leading CPG Brand Read Mo...
p39 free: ...Luber July 3, 2026 READ NOW Let's talk Schedule a free consultation to see how we can get you results faste...
```

Reading: the buyer filter's `[a-z]+ teams` term is wrong (p10 "your teams", p11 "Services teams", p14 "expert teams" are the deliverer or generic). Only p2 names a buyer. The 3 currency hits in full text are a market-value figure (p18), a customer's funding (p33) and a case-study title (p35): 0 prices. The E3 pattern missed p14 "in weeks" (its `in [0-9]+ weeks` needs a digit) and matched p18 "€500M" market value (false positive). Both are fixed in MKT-PAGE-12 below. The free-first-step phrase appears on 1 of 21 pages (p39, STX Next, "Schedule a free consultation" in a blog-teaser area, not the hero). The engagement-model signal is p10 "View Packages" and p14 "in weeks". Context of Monterail's two "fixed price" hits is above: a case study and an FAQ, neither in the hero.

### Manual coding

Service type (14, p8 and p19 disputed), buyer (1), proof (4) and CTA were first coded by reading. The script now gives its own counts (table above) and the disagreements are named: E1 16 vs 14 (p8, p19), CTA 16 vs 15 (p5 nav). One rater plus a script, no second human rater, so no agreement statistic exists.

### Limits

Server-rendered HTML only: a page that injects its hero with JavaScript reads as having no H1, and pricing could sit behind a script or on a `/pricing` page not fetched. The corpus skews to English-language consultancies and large vendors that sell through a sales team, which is the population that hides price, so productized fixed-price services (a code audit at a list price) are under-represented. None was found among the URLs tried.

## What the primary sources say

- NN/g, "State the Price to Give B2B Sites a Competitive Advantage", Hoa Loranger, 2013-12-01 (https://www.nngroup.com/articles/show-price/, fetched 2026-11-27). Business customers report "pricing as the top most needed piece of information online"; "we watch participants go to competitors' sites when websites do not show prices". For impractical exact prices it suggests "showing prices for typical scenarios, price range, or manufacturer's suggested retail price (MSRP)". Usability study, 13 years old, not a conversion test.
- NN/g, Jakob Nielsen, 2006-04-09 (https://www.nngroup.com/articles/show-prices-for-common-scenarios/, fetched 2026-11-27): "you can help prospective customers by showing sample prices for a set of typical orders". It rests on one observed participant ("illustrative", not statistical).
- Forrester, Lisa Singer, 2019-12-04 (http://www.forrester.com/blogs/prices-public-on-website/, fetched 2026-11-27; analyst opinion, no survey data cited): "There is a strong argument for publishing prices, as such transparency can often accelerate the sales process"; "You don't need to publish all your pricing." It lists six factors, among them "offering novelty and complexity", and says complex or highly customized offerings may be better kept private. It supports SHOULD, not MUST, for services.
- HockeyStack (vendor of B2B analytics), 2025-12-15 (https://hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages, fetched 2026-11-27): 31M unique visitors across 80 B2B SaaS companies ($5M to $1B ARR). "When there's transparent pricing, this conversion rate drops to 2.8%" against 4.6% without; submit-to-pipeline 17.50% with transparent pricing against 10.31% without ("1.7x better"). Correlational, SaaS only, the report does not mention services firms. It is the only 2020s conversion-shaped data found, and it points both ways (fewer form fills, better pipeline).
- Clutch, press release, 2020-02-26 (https://clutch.co/press-releases/b2b-buyers-most-concerned-about-transparent-costs-b2b-companies-websites, fetched 2026-11-27; Clutch is a services-review platform with a commercial interest): survey of 451 employees who helped hire a service provider or buy software in the last 12 months; "One in four B2B buyers (25%) rank transparent cost information as the most important element of a software or services company's website". This is the only survey that covers services directly. Six years old, vendor, self-reported. The "74%" headline repeated in secondary posts (DesignRush) was not opened and is not used.

Neither NN/g article names a "first screen"; placing the price signal there is this topic's operationalisation, as with the category noun in MKT-PAGE-03. The wave-1 NN/g homepage article already cited in MKT-PAGE-03 (https://www.nngroup.com/articles/homepage-design-principles/, 2024-03-15) supplies element 1: the homepage should convey what the organization does.

### The search for 2020s service-page studies (queries and results)

Two WebSearch calls on 2026-11-27, mode standard.

1. Query: `B2B services website pricing transparency study buyers conversion 2024 2025 research`. 16 results. Opened: NN/g show-price (above), HockeyStack (above), Clutch (above), Forrester blog (above). Not opened, so not used: DesignRush news, G2 learn page, eMarketer (cites TrustRadius, year not stated in the snippet), eight25media, leadfeeder, chilipiper, PYMNTS 2015, agilitypr, Benzinga, Forrester report RES181236 ("Price reigns as the most important factor for B2B buyers", paywalled). Result: no study of service-firm pages with conversion data.
2. Query: `professional services website hero call to action what buyers want first screen study 2025 NN/g OR Gartner OR Forrester`. 15 results, all agency or hosting-vendor blogs (elementor.com, hostinger.com, redefineweb.com, huemor.rocks, hingemarketing.com and similar), none cited primary research; a "60% lower engagement" statistic in two of them has no source. None opened; not used. Result: no primary study of professional-services hero content.

So the negative result is: after these two queries and four opened pages, no 2020s primary study of service-firm hero or price display was found. It is bounded by two queries; a search of Gartner and Forrester paywalled reports and of Google Scholar was not done.

## Effect on the ruleset

**MKT-PAGE-01: change.** New text: "Apply marketing first-screen rules only to a page declared `doc_surface: pitch`, to the first screen of the repository-root README of a repository that publishes a release or a package, and to a page declared `doc_surface: offer` (a page that sells a service engagement). Never scope such a rule to `doc_type: landing`." Rationale: a service offer page is a third pitch surface with no README or product-site `/` route to anchor it. Severity unchanged, MUST. Verification, three commands (run 2026-11-27 on a scratch rule file with the proposed wording, and on a file declaring `offer`, in `~/.cache/research-lang/exemplars/product/wave2/q0-r2-scratch/`):

```sh
grep -n 'doc_type: landing' <rule file>          # exit 0 (a match) = the rule scope is wrong, fail review; exit 1 = pass
grep -c -E 'doc_surface: *offer' <rule file>      # must print >= 1: the scope names the offer surface
head -12 <offer page source> | grep -c -E 'doc_surface: *offer'   # must print 1 for every page the owner calls an offer page
```

Output on the scratch files: the good rule printed exit 1 for the first command, `1` for the second; the bad rule (`Scope: every page tagged doc_type: landing.`) printed `1:Scope: ...` with exit 0 and `0` for the second; the offer file printed `1` for the third. Blocked on CR-3: `grep -c doc_surface ocx-sh/ocx/.claude/rules/docs-quality/checks/doc_declaration.py` prints `0` today (measured), so the checker cannot yet read any `doc_surface` value, `offer` included; CR-3 must add `offer` to the same value list as `pitch` and `home`. Until CR-3, an offer page is identified by owner declaration and the three commands above.

**MKT-PAGE-03: confirm, with a scope note.** Category-noun rule stays for `pitch`; on an `offer` page the equivalent is the service noun (MKT-PAGE-12 element 1). 14 to 16 of 21 offer heroes name the service type (this file, `score.py`), against 22 of 25 product heroes naming a category (two blind model raters, Claude Haiku and Codex, 23 of 25 label agreement, kappa 0.88, no human: [marketing-first-screen-copy.md](../marketing-first-screen-copy.md) Verdict 5 and [page-hero-status.md §3](page-hero-status.md)). No source URL exists for that figure beyond those local files, because it was measured by the wave-1 workers, not taken from the web.

**NEW MKT-PAGE-12.** Imperative: On the first screen of an `offer` page, state in text, in this order: (1) the service you deliver, as a noun phrase naming what the client receives; (2) the buyer, as a noun for who hires you; (3) a price or engagement signal: a price range, the price of one or more typical engagements, a package list, or a stated engagement model with a time box; (4) one next step, written as a verb phrase that says what happens after the click (a response time, a call length, a free first step or the first deliverable). When the owner has not approved publishing any price figure, state the engagement model and time box and put "price on request" in the hero; never leave the price question unanswered without a reason. Rationale: NN/g 2013 reports price as the top-ranked information need and participants leaving sites that omit it; Clutch 2020 finds 25% of 451 services and software buyers rank transparent cost the most important website element; the measured norm (0 of 21 print a price, 1 names the buyer, 0 say what the next step is) leaves all three gaps open. The 2025 HockeyStack SaaS data shows the cost: fewer form fills, but better pipeline, so the rule asks for a price signal, not necessarily a number. Forrester 2019 says complex offerings may keep prices private, hence the "engagement model and time box" fallback. Severity: SHOULD (the price figure is a business decision an agent cannot make: ask-first). Verification (reading heuristic with mechanical aids), on line 3 of `hero_text` (wave-1 definition) of the built page. Patterns revised after the 21-page run (E2 loses the generic `[a-z]+ teams`; E3 gains `in weeks` without a digit and requires digits after a currency sign to be followed by space, end or `/`):

```sh
H=$(hero_text dist/<offer-page>.html | sed -n 3p)
echo "$H" | grep -i -c -E '\b(consult\w*|implementation|migration|engineering|development|support|training|audit|review|design)\b'     # element 1: at least 1
echo "$H" | grep -i -c -E '\b(enterprises?|founders?|startups?|scale-ups?|platform teams?|CTOs?|engineering leaders?)\b'   # element 2: at least 1
echo "$H" | grep -i -c -E '[$€£][0-9]+([.,][0-9]+)?[kK]?( |$|/)|\bfrom [$€£]|\bpackages?\b|\bfixed[- ](price|fee|scope)\b|\bper (hour|day|week|month)\b|\bin ([0-9]+ )?(days|weeks|months)\b|price on request'   # element 3: at least 1
echo "$H" | grep -i -c -E 'within [0-9]+|[0-9]+[- ]minute|\bfree\b|\bwe (reply|respond)\b|first (call|workshop|assessment|deliverable)'   # element 4: at least 1
```

Run on all 21 corpus pages (`scripts-r2/verify12.sh`, which defines wave-1's `hero_text` verbatim and applies the four greps; output saved to `wave2/verify12-r2.txt`):

```
page	E1	E2	E3	E4
p1	0	0	0	0
p2	1	1	0	0
p5	NO-H1
p7	1	0	0	0
p8	1	0	0	0
p10	1	1	1	0
p11	1	0	0	0
p12	1	0	0	0
p13	0	0	0	0
p14	1	0	1	0
p16	1	0	0	0
p18	1	0	0	0
p19	1	0	0	0
p31	1	0	0	0
p32	0	0	0	0
p33	1	0	0	0
p35	1	0	0	0
p38	1	0	0	0
p39	0	0	0	0
p41	1	0	0	0
p44	1	0	0	0
```

Result: E1 passes 16 pages, E2 passes 2 (p2 true; p10 false, the "CTO" from a form dropdown), E3 passes 2 (p10 "Packages", p14 "in weeks", both true), E4 passes 0. This now agrees with the manual coding for E3 and E4, differs for E1 (16 vs 14, two disputed pages) and for E2 on p10. `hero_text` itself fails on p5 (no `<h1>` inside the section it picks): an agent must treat a page with no extractable `<h1>` as a failed first screen, not a pass. The patterns are filters, not proof: a reviewer reads each match, and a hit on a list of job functions in a form does not count as naming the buyer.

**NEW MKT-PAGE-13.** Imperative: On an `offer` page, put a verifiable proof point in the hero only when a claims record backs it (MKT-CLAIM-04: the number, its date and its source); never write "decades of experience", "world-class", "deepest bench" or "trusted by the best" without a number. Rationale: 4 of 21 heroes carry a number or named partner tier (p18 "100+ products", p33 "400+ companies ... since 2010", p31 "leading IBM/Confluent partner", p35 "Atlassian Platinum Solution Partner"); 5 carry an unquantified boast (p2 "decades", p10 "deepest bench", p31 "leading", p35 "TRUSTED BY THE BEST", p38 "world-class"). Each of these is the vendor's self-description on its own page (URLs in the Sources table; p18 https://ministryofprogramming.com/, p31 https://softwaremill.com/, p33 https://www.monterail.com/, p35 https://www.praecipio.com/, all fetched 2026-11-27, undated). A reader cannot check any of them from the hero. Severity: CONSIDER, since the corpus gives no evidence that proof moves a decision (MKT-CLAIM-02 and -16 hold the grade words). Verification, run on the 21 heroes with `hero.py`:

```sh
python3 -I -c "import re,sys;sys.path.insert(0,'.');from hero import hero,PAGES
for p in PAGES:
  m=re.findall(r'\b(world-class|best-in-class|deepest|leading|trusted by the best|decades)\b',hero(p),flags=re.I)
  print('p%d'%p,m) if m else None"
```

Output: `p2 ['decades']`, `p10 ['deepest']`, `p31 ['leading']`, `p35 ['TRUSTED BY THE BEST']`, `p38 ['world-class']`. In the rule, the same grep on `echo "$H"` must be empty unless a matching `[[claim]]` row exists in `claims.toml`.

**MKT-PAGE-04: confirm.** The competitor-swap test applies to offer heroes unchanged. Slogan heroes in the corpus (p39 "Engineered for what's next", p13 "Drive Clarity. Create Energy. Deliver Success.", p32 "AI-native commerce") fail name removal and swap.

**MKT-PAGE-05: confirm, with note.** Command and output (title and hero scanned for `AI-native|AI-first|agentic|AI-driven|AI-powered|AI`): 10 of 21 pages use AI framing in the hero or `<title>`: p2 (hero "AI"), p12 (hero), p14 (hero and title "Agentic Product Engineering"), p18 ("AI-first" in hero), p32 ("AI-native commerce", "AI-driven" in hero), p33 (hero and title "Agentic software development"), p35 (title "Atlassian AI Consulting"), p38 (hero), p39 (title "AI/ML, Data, and AI-Augmented Software Development Company"), p44 (title "AI-Native Software Development + Consulting"). Of these, the explicit "agentic" or "AI-native" wording is on p14, p32, p33, p44; p35 uses plain "AI". The URLs are the corpus URLs in the Sources table, fetched 2026-11-27. The rule's recorded-noun exception is the only guard; no new text.

**MKT-PAGE-06, -07, -08, -09, -10, -11: no effect.** They concern product maturity and docs homes. An offer page has no version number.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Business customers rank price the top needed information; participants leave for competitors when absent; show ranges or typical scenarios | https://www.nngroup.com/articles/show-price/ (Hoa Loranger, NN/g) | 2013-12-01, fetched 2026-11-27 |
| Sample prices for typical orders help prospective customers; basis is one observed participant | https://www.nngroup.com/articles/show-prices-for-common-scenarios/ (Jakob Nielsen, NN/g) | 2006-04-09, fetched 2026-11-27 |
| "Strong argument for publishing prices"; complex or customized offerings may keep them private; no data cited | http://www.forrester.com/blogs/prices-public-on-website/ (Lisa Singer, Forrester, analyst opinion) | 2019-12-04, fetched 2026-11-27 |
| 25% of 451 buyers rank transparent cost the most important website element (vendor survey, services and software) | https://clutch.co/press-releases/b2b-buyers-most-concerned-about-transparent-costs-b2b-companies-websites (Clutch) | 2020-02-26, fetched 2026-11-27 |
| SaaS pages: form-fill 2.8% (transparent pricing) vs 4.6% (not); submit-to-pipeline 17.50% vs 10.31%; 31M visitors, 80 SaaS companies, correlational, vendor data | https://hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages (HockeyStack) | 2025-12-15, fetched 2026-11-27 |
| 0 of 21 service pages print a currency price; 1 names the buyer; 0 say what the next step is; 2 give an engagement signal | this worker, one rater plus scripts `score.py`, `verify12.sh`, server HTML, output above | measured 2026-11-27 |
| Monterail states "fixed-price projects for well-defined scopes, time-and-materials..." in an FAQ below the first screen (vendor self-description) | https://www.monterail.com/ | fetched 2026-11-27 |
| p18 "100+ products"; p33 "400+ companies ... since 2010"; p35 "Atlassian Platinum Solution Partner" and "Claude Partner Network"; p31 "leading IBM/Confluent partner" (vendor self-description, undated) | https://ministryofprogramming.com/ ; https://www.monterail.com/ ; https://www.praecipio.com/ ; https://softwaremill.com/ | fetched 2026-11-27 |
| 22 of 25 product heroes name a category (two LLM raters, kappa 0.88, no human); 14 to 16 of 21 offer heroes name a service type | local files [marketing-first-screen-copy.md](../marketing-first-screen-copy.md), [page-hero-status.md](page-hero-status.md), and this file | 2026-11-27 |

## What could not be determined

- Whether a price or engagement signal in the hero changes enquiry rates for services. Missing: conversion or A/B data on service pages. HockeyStack covers SaaS only; NN/g and Forrester are usability observation or opinion. Two searches (queries above) found no 2020s primary study of service-firm pages. Not searched: Gartner and Forrester paywalled reports, Google Scholar.
- A second rater for the codings. Missing: a human or second model rating the element definitions blind. The scripts and the one reader disagree on E1 (16 vs 14) and on p10 for E2.
- Pricing hidden behind JavaScript, behind a form, or on a separate `/pricing` page. Missing: a rendered-DOM crawl; only raw HTML was fetched, so "0 of 21" is a statement about server HTML.
- Productized, fixed-price service pages. Missing: an exemplar set; none found. They are most likely to pass element 3 and could move MKT-PAGE-12 to MUST.
- Drop reasons for pivotal.io, pivotallabs.com, support.planetscale.com, bitovi and the five non-service pages: no output saved from the first pass and not re-fetched. The cognizant 404 did not reproduce under the URL tried here.
- Whether `doc_surface: offer` is the right declaration. That is an owner decision tied to CR-3; none of the fleet's pages is an offer page, so no fleet application row exists.
- Agent behaviour: no test was run of what an agent writes on a service hero with or without the rule.

## Sources

| URL | What | Date |
|---|---|---|
| https://www.nngroup.com/articles/show-price/ | NN/g, price is the top need | 2013-12-01 |
| https://www.nngroup.com/articles/show-prices-for-common-scenarios/ | NN/g, sample prices | 2006-04-09 |
| https://www.nngroup.com/articles/homepage-design-principles/ | NN/g homepage principles (cited from wave 1, not re-fetched) | 2024-03-15 |
| http://www.forrester.com/blogs/prices-public-on-website/ | Forrester blog, publish prices? | 2019-12-04 |
| https://clutch.co/press-releases/b2b-buyers-most-concerned-about-transparent-costs-b2b-companies-websites | Clutch survey press release | 2020-02-26 |
| https://hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages | HockeyStack SaaS pricing-page dataset | 2025-12-15 |
| https://thoughtbot.com/ , https://www.thoughtworks.com/ , https://10up.com/ , https://www.percona.com/services/ , https://www.cloudbees.com/services , https://www.mongodb.com/services/consulting , https://about.gitlab.com/services/ , https://www.redhat.com/en/services/consulting , https://www.eqengineered.com/ , https://rangle.io/ , https://www.elastic.co/consulting , https://ministryofprogramming.com/ , https://www.vinsol.com/ , https://softwaremill.com/ , https://www.netguru.com/ , https://www.monterail.com/ , https://www.praecipio.com/ , https://www.databricks.com/forward-deployed-engineering , https://www.stxnext.com/ , https://sparkbox.com/ , https://www.codecentric.de/en | 21 service pages, vendor self-description | fetched 2026-11-27 |
| 9 drop-check URLs in the fetch output above (toptal, lullabot, hashicorp, globant, epam, postlight, railsware, cognizant, canonical) | bot-block, shell or 404 responses | fetched 2026-11-27 |
