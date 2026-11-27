---
title: "Follow-up q3: is a security advisory or incident post public-interest text under Art. 50(4)?"
program: product
topic: marketing-voice-ai-authorship
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
---

# Follow-up q3: security advisories and incident posts under Art. 50(4)

This is the repaired version. Every grep below is shown with its literal command and output. All 19 sources are in the table, each with a URL and a date. Nineteen sources were opened: 16 in this repair pass and 3 (DLA Piper, Praxikon, headlesslaw) in the first pass only. Those three are marked, and nothing here rests on them alone.

## Question

Has a national authority or a Commission Q&A said whether a software security advisory or incident post is public-interest text under Art. 50(4) of the AI Act? Rule concerned: MKT-VOICE-15, whose trigger is a `CVE-` or `GHSA-` identifier or an advisory, incident, outage or postmortem title.

## Answer

No. As of 2026-11-27 no Commission text and no national authority text that I could open says whether a software security advisory or incident post is public-interest text. The Commission guidelines, the Commission Art. 50 FAQ, the AI Act Service Desk FAQ (pages 1 to 7), the German authority (BNetzA) pages and slides, the Spanish authority (AESIA) pages, the Austrian regulator (RTR) slides and five law-firm commentaries are silent on it. The anchors are indirect: the topic list says "public security" and "consumer safety", and one example is a weather-warning post. Whether an advisory is in scope is an inference, and MKT-VOICE-15 must say so.

Coverage of other national authorities is partial and stated as such: Spain (AESIA) and Germany (BNetzA) and Austria (RTR) were read as first-party text. France, Italy, the Netherlands and Ireland returned no first-party Art. 50(4) guidance in the searches below, but I did not open their authority sites, so that is "not found", not "does not exist".

## Sources

All fetched 2026-11-27.

| # | Source | Type | Date on the page | Result for advisory, vulnerability or incident post |
|---|---|---|---|---|
| 1 | [Commission guidelines PDF, section 6.2](https://ec.europa.eu/newsroom/dae/redirection/document/131215) | Commission, non-binding | Brussels 2026-11-05, C(2026) 7702 | No. See the greps below. |
| 2 | [Commission library page](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems) | Commission | Publication 20 July 2026, last update 5 November 2026 | n/a, dates only. Lists no C(2026) number. |
| 3 | [Commission Art. 50 FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act) | Commission Q&A | "24 July 2026" | No. Repeats the topic list. "security", "cybersecurity", "advisory", "incident" occur nowhere else on the page. |
| 4 | [AI Act Service Desk FAQ](https://ai-act-service-desk.ec.europa.eu/en/faq), pages 1 to 7 via `?page=N` | Commission Q&A | undated | No. See the measurement below. |
| 5 | [BNetzA Leitlinie page](https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/4_Transparenzpflichten/Leitlinien/artikel.html) | German authority, German rendering of the guidelines | "© Bundesnetzagentur - 2026", no date | No. "KI-MIG", "Cybersicherheit", "Sicherheitswarnung", "Schwachstelle" do not appear. |
| 6 | [BNetzA Praxisleitfaden page](https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/4_Transparenzpflichten/Praxisleitfaden/start.html) | German authority, summary of the Code of Practice | "© Bundesnetzagentur - 2026", no date | No. "Cybersicherheit" appears only in Code measures on provider watermark security (2.1.3(h), 3.3). |
| 7 | [BNetzA press release](https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260729_KI_VO.html?nn=659906) | German authority | "Erscheinungsdatum 29.07.2026" | n/a. Enforcement and competence, see Dated facts. |
| 8 | [BNetzA network-meeting slides](https://bundesnetzagentur.de/DE/Fachthemen/Digitales/Aktuelles/_function/Netzwerktreffen/20260909.pdf) | German authority, slides | 2026-09-09 | No advisory text. Gives the enforcement statement, see Dated facts. |
| 9 | [Commission opinion on the Code of Practice](https://digital-strategy.ec.europa.eu/en/library/commission-opinion-assessment-code-practice-transparency-ai-generated-content) | Commission | "Publication 09 July 2026", "Last update 31 July 2026" | n/a, dates only. |
| 10 | [RTR (Austria) webinar PDF](https://www.rtr.at/rtr/service/ki-servicestelle/2026-07-02_Webinar-Art.-50-RTR.pdf) | Austrian regulator service desk, slides, 24 pages | 2026-07-02 | No. Text extracted, see the measurement below. |
| 11 | [AESIA, citizens' rights sheet for Art. 50](https://aesia.digital.gob.es/storage/media/derechosciudadania-art50.pdf) | Spanish authority, 7 pages | undated | No. One line on public-interest text. |
| 12 | [AESIA, transparency rules key data](https://aesia.digital.gob.es/storage/media/normas-de-transparencia-datos-clave.pdf) | Spanish authority, 2 pages | undated | No. One definition of "texto de interés público". |
| 13 | [AESIA, transparency guide](https://aesia.digital.gob.es/storage/media/08-guia-transparencia.pdf) | Spanish authority, 56 pages | undated | No. It concerns high-risk transparency (Art. 13), not Art. 50(4). |
| 14 | [Reed Smith, "Transparency obligations for AI-generated content"](https://www.reedsmith.com/our-insights/blogs/viewpoints/102nbz0/transparency-obligations-for-ai-generated-content-the-code-of-practice-adequacy/) | Law firm | 28 July 2026 | No. Only a "Fraud Alert" footer link. |
| 15 | [Orrick, "EU AI Act Transparency Obligations for AI-Generated Content (Article 50)"](https://www.orrick.com/en/Insights/2026/08/EU-AI-Act-Transparency-Obligations-for-AI-Generated-Content-Article-50) | Law firm | 14 August 2026 | No. "public security" in its list, "doesn't say whether that covers cybersecurity content". |
| 16 | [certifico.com page on C/2026/6005](https://www.certifico.com/component/acym/archive/5108-comunicazione-commissione-c-2026-6005-del-12-novembre-2026-orientamenti-obblighi-di-trasparenza-sistemi-ia-ai-act-art-50) | Italian secondary site | OJ C series, 12 November 2026 | n/a, see Date correction. |
| 17 | [DLA Piper](https://www.dlapiper.com/en-at/insights/publications/2026/08/the-eus-new-guidelines-on-ai-transparency) (first pass only) | Law firm | 10 August 2026 | No. Nearest text is "public security". |
| 18 | [Praxikon](https://www.praxikon.com/en/posts/ai-text-public-interest-labelling-ai-act-2026) (first pass only) | Blog | 2026-06-29, updated 2026-11-20 | No. Ordinary commercial text "generally falls outside". |
| 19 | [headlesslaw page for the guidelines](https://www.headlesslaw.com/ai-act/level-3/guidelines/commission-c-2026-5054-transparency-obligations) (first pass only) | Secondary tracker | undated | n/a, returned the 7702 text. |

## Measurements

### Guidelines PDF, three greps

The PDF is 51 pages. Commands run in `~/.cache/research-lang/exemplars/product/wave2/mva-q3-repair/`:

```sh
curl -sL -o g.pdf "https://ec.europa.eu/newsroom/dae/redirection/document/131215"
uv run --no-project --with pypdf python -I -c "import pypdf;r=pypdf.PdfReader('g.pdf');open('g.txt','w').write('\n'.join(f'=== PAGE {i+1}\n'+(p.extract_text() or '') for i,p in enumerate(r.pages)))"
```

First grep, literal output (the SDK, licence and "security and confidentiality" lines are all that match besides line 1996):

```
$ grep -n -iE "software|cyber|security" g.txt
451:(24) By contrast, providers of free and open-source AI components that cover software, data, 
469:(11) Recital 102 AI Act explains that a release of software and data under free and open-source licence “allows 
1121:Software Development Kits (SDKs), Structured Query Language (SQL), 
1124:specifications, Application Programming Interfaces (APIs & software libraries); 
1157:that allows software applications to easily identify, recognise and extract them without 
1405:data minimisation and the security and confidentiality principles. For example, for the 
1408:as the purpose of detection is fulfilled, security and confidentiality must be ensured, etc. 
1996:justice and law enforcement, the protection of fundamental rights, public security, 
```

Second grep, literal output, cut to 200 characters per line:

```
$ grep -n -iE "public interest|public security|cybersecur|advisor|critical infrastructure|incident" g.txt | cut -c1-200
78:6.2.1. Text published with the purpose of informing the public on matters of public interest .................... 41 
198:public interest 
254:AI Act if the output of their AI system is used in the Union (4). However, incidental, 
364:publications on matters of public interest under other applicable legal or deontological 
615:- AI hotline for incidents, fraud or other reporting, (humanoid) robots/cobots, AI companions; 
1559:public on matters of public interest except in defined cases. These labelling obligations 
1880:(34) This equally applies to published texts informing the public on matters of public interest. 
1954:purpose of informing the public on matters of public interest; 
1964:the public (iii) on matters of public interest. 
1990:iii. On matters of public interest: The text should inform the public ‘on matters of 
1991:public interest’. In general, such matters should be understood to cover those 
1994:considered to address public interest matters if they cover topics on politics and 
1996:justice and law enforcement, the protection of fundamental rights, public security, 
2013:matters of public interest falling outside the scope of Article 50(4) AI Act: 
2031:on matters of public interest to disclose that such text has been artificially generated or 
2125:the public on matters of public interest without human review (e.g. an AI-generated 
2223:manipulated text publication on matters of public interest, or when encountering AI-
2368:retroactively. The same applies to texts on matters of public interest falling within scope
2387:national market surveillance authorities through the AI Board, the AI Advisory forum, 
```

Notes on the hits: The line 254 hit is the word "incidental", not an incident post, and line 2387 is the "AI Advisory forum" body, not an advisory. No line mentions cybersecurity, a security advisory or a vulnerability disclosure.

A narrower grep, the one MKT-VOICE-15's re-check uses, with its literal output:

```
$ grep -ciE "cybersecurity|security advisor|security incident|data breach|CVE-|GHSA-" g.txt
0
```

Paragraph locations, literal output:

```
$ grep -niE "^\(13[1-8]\)|i\. Published|indeterminate|easily findable|=== PAGE 4[2-5]" g.txt | cut -c1-200
1929:=== PAGE 42
1962:(131) For the purpose of clarifying the scope of Article 50(4), second subparagraph, AI Act, 
1965:i. Published text: The AI-generated or manipulated text should be published. This 
1966:means that the text should be accessible by an indeterminate, fairly large number 
2029:(132) Article 50(4), second subparagraph, AI Act obliges deployers of AI systems that 
2046:(133) Article 50(4), second subparagraph, AI Act foresees an exception to the transparency 
2053:(134) The first condition for the exception to Article 50(4), second subparagraph, AI Act to 
2065:(135) Superficial, solely formal or procedural checks (e.g. spell-checking or grammatical 
2074:(136) Where AI systems are used to modify, supplement, or reformulate content following 
2079:(137) In light of Article 50(7) AI Act, deployers may adhere to a code of practice, assessed as 
2086:(138) The second condition for the exception to Article 50(4), second subparagraph, AI Act 
2093:editorial responsibility should be made publicly available on an easily findable location 
```

### RTR slides, extraction command and output

```sh
curl -sL -o rtr.pdf "https://www.rtr.at/rtr/service/ki-servicestelle/2026-07-02_Webinar-Art.-50-RTR.pdf"
uv run --no-project --with pypdf python -I -c "import pypdf;r=pypdf.PdfReader('rtr.pdf');open('rtr.txt','w').write('\n'.join(f'=== PAGE {i+1}\n'+(p.extract_text() or '') for i,p in enumerate(r.pages)))"
```

The PDF has 24 pages and the extraction yields 424 lines (14,686 bytes), so the slides are text, not images (the first-pass claim that they were mostly images was wrong). Search:

```
$ grep -n -iE "cyber|sicherheit|incident|öffentlich|interesse|security" rtr.txt | cut -c1-200
31:(Cyber-)
32:Sicherheit
349:▪ Juristische oder natürliche Person, die Letztverantwortung für veröffentlichten Inhalt trägt
408:veröffentlichter Text
```

Lines 31 and 32 are a one-word label on a slide (page 2) listing the AI Act's goals ("(Cyber-) Sicherheit", next to "Grundrechte", "Demokratie", "Umwelt, Gesundheit"). It is a statement of the Act's purposes, not guidance on advisories. The slides do not say whether an advisory is public-interest text. Their text-related slides repeat the exception conditions: review by a person with authority to approve, change or reject; a legal or natural person "die Letztverantwortung" for the published content; and, on slide 23, "Eindeutige Identifikation der verantwortlichen natürlichen oder juristischen Person (Name, Rolle, Kontaktdaten)".

### BNetzA slides, enforcement statement, literal output

The PDF was saved by the fetch and read with pypdf (49 pages):

```
$ grep -n -iE "Art\. ?50|KI-MIG|Transparenz|durchgesetzt|Durchsetz" bn.txt | sed -n 1,12p
4:9. September 2026
27:KI-MIG1
31:1 KI-MIG
40:09.09.2026
46:KI-MIG1
50:1 KI-MIG
68:• Art. 5 KI-VO gilt bereits und wird seit dem Inkrafttreten des KI-MIG durchgesetzt
73:Transparenzpflichten
74:• Art. 50 KI-VO gilt bereits und wird seit dem Inkrafttreten des KI-MIG durchgesetzt
80:KI-Marktüberwachungsbehörden (§ 2 KI-MIG)
81:• Bundesnetzagentur (§ 2 Abs. 1 KI-MIG)
82:• Bundes- oder Landes-Marktüberwachungsbehörde (§ 2 Abs. 2 KI-MIG)
```

### AESIA PDFs, grep output

```
$ grep -n -iE "inter[eé]s p[uú]blico|ciberseguridad|seguridad|vulnerab|incidente|alerta" derechosciudadania-art50.txt normas-de-transparencia-datos-clave.txt
normas-de-transparencia-datos-clave.txt:34:marcar el texto sobre asuntos de interés público con etiquetas 
normas-de-transparencia-datos-clave.txt:41:público sobre asuntos de interés público que no fueron sometidos 
normas-de-transparencia-datos-clave.txt:43:TEXTO DE INTERÉS PÚBLICO
derechosciudadania-art50.txt:30:✓ Los textos de interés público 
```

The key-data sheet defines it as: "Texto generado o manipulado por IA publicado para informar al público sobre asuntos de interés público que no fueron sometidos a revisión humana ni control editorial." No example mentions software. The 56-page guide matches "ciberseguridad" only in Art. 15 high-risk metrics text (lines 351 to 1727), unrelated.

### Service Desk FAQ, pages 1 to 7

Each page was fetched with `curl -sL "https://ai-act-service-desk.ec.europa.eu/en/faq?page=N"` (N = 1..7, HTTP 200, 33 to 63 kB each) and its visible text searched with a Python script (`python3 -I sd.py`, which strips tags and lists question titles ending in `?` plus any line matching `public interest|advisory|vulnerab|cybersecur`). Literal output:

```
-- page 1: 10 question titles
   What are the obligations for high-risk, transparency-risk, and minimal-risk AI systems?
  HIT: Report an IT vulnerability
-- page 2: 10 question titles
  HIT: Report an IT vulnerability
-- page 3: 10 question titles
   Are biometric systems (e.g., facial recognition for bank security) permitted?
  HIT: The AI Act introduces a number of support measures tailored to small and medium-sized enterprises (SMEs). These include the possibility to prepare simplified technical documentation and to implement s
  HIT: Report an IT vulnerability
-- page 4: 10 question titles
  HIT: Report an IT vulnerability
-- page 5: 10 question titles
   What are AI regulatory sandboxes, and how can providers/deployers participate?
  HIT: ensure adequate cybersecurity protection for both the model and its physical infrastructure, to prevent unauthorised access, theft, or leakage.
  HIT: Providers of general-purpose AI models with systemic risk need to keep track of, document, and report, without undue delay, to the AI Office and, as appropriate, to national competent authorities, rel
  HIT: Report an IT vulnerability
-- page 6: 1 question titles
  HIT: Report an IT vulnerability
-- page 7: 0 question titles
  HIT: Report an IT vulnerability
```

Pages 6 and 7 returned little static content (35 kB and 34 kB, 1 and 0 question titles), so the list may load by script there. "Report an IT vulnerability" is the site footer link. No Art. 50(4) answer exists in the static text of pages 1 to 7. The FAQ is not exhaustive for pages 6 and 7.

### Searches run for other national authorities

Each query was run once on 2026-11-27 with the WebSearch tool, mode standard (the last two) or extended (the first). Each result was a list of secondary pages, and the tool's summary named no first-party authority guidance on Art. 50(4) text, except Spain, where AESIA pages were then opened (sources 11 to 13).

| Country | Query | First-party Art. 50(4) guidance found |
|---|---|---|
| Multi | `AESIA OR CNIL OR ARCOM OR AgID OR "Autoriteit Persoonsgegevens" article 50 AI Act text public interest labelling guidance 2026 cybersecurity advisory` | None named. Only EU-level material. |
| Spain | `AESIA artículo 50 Reglamento IA textos interés público etiquetado guía transparencia 2026` | AESIA pages found and opened (sources 11 to 13). None addresses software advisories. |
| France | `CNIL OR Arcom OR DGCCRF article 50 règlement IA texte intérêt public étiquetage contenus générés guide 2026` | None. The tool said no CNIL, Arcom or DGCCRF document appeared. |
| Italy | `AgID ACN articolo 50 AI Act testi interesse pubblico obbligo trasparenza linee guida autorità 2026` | None. A commentary names ACN as market-surveillance authority and AgID with a role not stated in the result. |
| Netherlands | `Autoriteit Persoonsgegevens OR RDI artikel 50 AI-verordening tekst algemeen belang transparantie AI-gegenereerde teksten 2026` | None. Only a Flemish government news page and trackers. |
| Ireland | `Ireland AI Office OR Coimisiún Meán Article 50 AI Act AI-generated text public interest guidance 2026` | None. Law-firm commentary only. |
| Software-specific | `"Article 50(4)" AI-generated "security advisory" OR "vulnerability disclosure" OR "incident report" OR "security bulletin" public interest text labelling` | None. The tool reported nothing on security advisories. |
| Software-specific, German | `AI Act Art. 50 Abs. 4 KI-generierte Texte Sicherheitshinweis Cybersicherheit Schwachstellenmeldung öffentliches Interesse Kennzeichnung Unternehmen` | None. The tool said the results held nothing on cybersecurity or vulnerability reporting. |

I did not open any French, Italian, Dutch or Irish authority site.

## What the guidelines say (primary text)

Title page: "Brussels, 5.11.2026, C(2026) 7702 final, Guidelines on the implementation of the transparency obligations for certain AI systems under Article 50 of Regulation (EU) 2024/1689".

Section 6.2.1, para 131, element (i) "Published text" (page 42): the text "should be accessible by an indeterminate, fairly large number of unrelated, potential readers simultaneously and/or successively, whether or not against payment (e.g. subscriptions)". Not published: "private, interpersonal correspondence (for professional purposes), or organisation-internal texts or communications".

Element (ii): the text "should intend to communicate knowledge, opinions or facts. By contrast, short texts which do not materially communicate knowledge, opinions or facts, cannot be deemed to inform the public."

Element (iii), page 43, lines 1990 to 2000 of the extraction:

> "In general, such matters should be understood to cover those relevant to society at large, whether at a local, national, Union or international level, and meriting public debate or scrutiny. In that regard, texts should be considered to address public interest matters if they cover topics on politics and democratic processes, public administration and services, the administration of justice and law enforcement, the protection of fundamental rights, public security, public health, environmental protection, consumer safety, and any economic, financial, political, scientific, or cultural development that may be relevant subject of public debate. Matters that may be considered to be of public interest can evolve over time and across contexts."

In-scope examples (page 43): a council-decision summary on a newspaper site; a diet-comparison article; "AI-manipulated corporate reports published on a listed company's website containing investor information"; "AI-generated message on a meteorological institute's social media profile warning citizens about stormy weather and related precautionary measures." Out of scope: fantasy novels; "AI-manipulated text that is part of a company's advertisement or product descriptions (not including any claims related to e.g. health, consumer safety or sustainability)"; a private chatbot news summary; "AI-manipulated text by a consultant for a client advice regarding measures to be taken for regulatory compliance with applicable legislation."

Exception, paras 133 to 138 (pages 43 to 45): para 133 sets "two cumulative conditions": human review or editorial control, and a legal or natural person holding editorial responsibility. Para 135: superficial checks such as spell-checking do not count. Para 136: AI modification after review voids it. Para 138: "the identity and contact details of the legal person, the natural person or the function with editorial responsibility should be made publicly available on an easily findable location (if not yet otherwise available). This can happen online through e.g. a website's terms and conditions or other user-facing legal information."

## Reading for a software advisory (inference, labelled as such)

No text decides this. Three signals, which do not agree:

1. For scope: the weather warning shows that a hazard warning with precautions on an organisation's public profile is in scope. A security advisory that tells the public how to protect itself has the same shape. "public security" and "consumer safety" are on the list, and nothing limits "public security" to state security.
2. Against scope: the guidelines exclude "advertisement or product descriptions" and a consultant's compliance advice, and require matters "relevant to society at large" and "meriting public debate or scrutiny". An advisory for a niche developer tool read by a few hundred users may be neither.
3. No reach threshold exists. The only reach test is "an indeterminate, fairly large number of unrelated, potential readers", which any public GitHub advisory meets.

Verdict for the rule: treat a public advisory or incident post as in scope. The cost of the review is low and the weather-warning example is the closest. Do not state that any authority has ruled so.

## Date correction

The library page (source 2) shows "Publication 20 July 2026" and "Last update 5 November 2026". DLA Piper (10 August 2026), Reed Smith (28 July 2026) and Orrick (14 August 2026) all cite the Guidelines as published 20 July 2026. The wave-1 file cites only "dated 2026-11-05". That is the date of the C(2026) 7702 text now online, so it is correct for the text. A first version came out on 2026-07-20. The headlesslaw page and secondary sites call the 20 July text C(2026) 5054; the library page lists no number.

A new item: the certifico.com page (source 16) says the Commission published the guidelines in the Official Journal C series on 12 November 2026 as "C/2026/6005", with the sentence "I presenti orientamenti non sono vincolanti." It does not mention 5054 or 7702, so the relation of C/2026/6005 to C(2026) 7702 is unknown. I did not open the Official Journal. MKT-VOICE-15 keeps citing C(2026) 7702 of 2026-11-05 and the library page for the re-check.

What changed between the 20 July and 5 November versions was not determined.

## Dated facts

- Commission guidelines: publication 2026-07-20, last update 2026-11-05, text C(2026) 7702 dated 2026-11-05 ([library page](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems), fetched 2026-11-27).
- Art. 50 applies from 2026-08-02. Commission FAQ, "Last-updated 24 July 2026": "Article 50 of the AI Act applies as from 2 August 2026." ([FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)). Guidelines para 153: "According to Article 113 AI Act, Article 50 AI Act will apply as from 2 August 2026." The AI Omnibus gives providers of generative systems already on the market until 2026-12-02 for Art. 50(2) marking only (para 153, [PDF](https://ec.europa.eu/newsroom/dae/redirection/document/131215), 2026-11-05).
- Retroactive labelling, para 154 (same PDF, page 51, line 2367 of the extraction): "texts on matters of public interest falling within scope of Article 50(4), second subparagraph, AI Act that have been AI-generated or manipulated and published before 2 August 2026" need no retroactive label. "Conversely, if texts that have been generated or manipulated before 2 August 2026 are published on or after that date, they need to be labelled." BNetzA agrees: "Werden solche Texte jedoch ab dem 2. August 2026 veröffentlicht, müssen sie gekennzeichnet werden." (Leitlinie page, source 5, 2026). Reed Smith, 2026-07-28: for such text "the relevant date is the date of publication".
- Code of Practice: published 2026-06-10 (Reed Smith: "Published on 10 June 2026"; BNetzA Praxisleitfaden, 2026: "Der am 10. Juni 2026 veröffentlichte CoP"). No source says "finalised" on that date; the first-pass word "finalised" is replaced by "published".
- Commission adequacy opinion 2026-07-08, AI Board assessment 2026-07-09 (Commission opinion page, publication date 09 July 2026, last update 31 July 2026: "On July 8, the Commission concluded that the Code of Practice on Transparency of AI-generated Content adequately covers the obligations provided for in Articles 50(2), (4) and (5) AI Act" and "The following day, the AI Board adopted its Adequacy Assessment code." Reed Smith: "On 8 and 9 July 2026, the European Commission and the AI Board, respectively"). BNetzA's Praxisleitfaden says "am 9. Juli 2026 von der Kommission als angemessen eingestuft", which matches the opinion page's publication date, not the 8 July opinion date. The one-day difference is settled: the opinion is dated 8 July and published 9 July.
- BNetzA competence and enforcement: press release dated 29.07.2026: "Die Bundesnetzagentur wird damit zur Marktüberwachungsbehörde, Anlaufstelle und Beschwerdestelle für die KI-Verordnung", the KI-MIG "welches heute in Kraft tritt", and the agency "überwacht ... zudem die Einhaltung der Transparenzpflichten" ([press release](https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260729_KI_VO.html?nn=659906)). Slides of 2026-09-09: "Art. 50 KI-VO gilt bereits und wird seit dem Inkrafttreten des KI-MIG durchgesetzt" ([slides](https://bundesnetzagentur.de/DE/Fachthemen/Digitales/Aktuelles/_function/Netzwerktreffen/20260909.pdf), line 74 above). BNetzA slides cite "§ 2 Abs. 1 KI-MIG" for its role. I did not open the KI-MIG text itself. This replaces the first-pass claim that came from a search summary.
- Commission FAQ topic list, para 131 (iii): same as quoted above, no software example.

## Effect on the ruleset

Every row carries a check an agent can run or apply. Commands that I ran are shown with their output in the Measurements section or in the "Verification run" block below.

| Rule | Effect | Exact new text or note | Verification |
|---|---|---|---|
| MKT-VOICE-15 rationale and re-check | change | Replace the first rationale sentence with: "Art. 50(4) covers published text that informs the public on matters of public interest; the guidelines list public security, public health, environmental protection and consumer safety (C(2026) 7702, para 131, 2026-11-05). No Commission text and no national authority text opened on 2026-11-27 says whether a software security advisory or incident post is such text. The rule treats it as in scope by analogy to the guidelines' weather-warning example, an inference, not a ruling." Add to the re-check clause: "At each refresh, run `curl -sL https://ec.europa.eu/newsroom/dae/redirection/document/131215 -o g.pdf`, extract the text, and run `grep -ciE 'cybersecurity\|security advisor\|security incident\|data breach\|CVE-\|GHSA-' g.txt`. The baseline on 2026-11-05 text is 0. A result above 0 means the Commission has addressed the case: read those lines before the next publish and change this rationale." | The text edit: `grep -c "No Commission text and no national authority text" <rule file>` prints 1. The re-check: the command in the cell prints 0 today (measured, Measurements section). |
| MKT-VOICE-15 editorial responsibility | change | Add to the rule text: "Before publishing, write `Editorial responsibility: <name or function>, <https URL>` in the PR body. The URL must be a public page that names that person or function and gives an email address or phone number (guidelines para 138). If the site publishes none, do not publish; ask the owner." | Run with `URL=<the URL> NAME=<the name>`: `curl -sfL "$URL" \| grep -cF "$NAME"` prints 1 or more, and `curl -sfL "$URL" \| grep -cE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}\|tel:'` prints 1 or more. Both fail on a page that says "No Impressum accompanies this page, deliberately" (the grimoire `privacy.html` line quoted in the consolidation). Tested on two local files with `file://` URLs, 2026-11-27: the page with "Editorial responsibility: Jane Doe, jane@example.org" printed `1` and `1`; the page with the "No Impressum" sentence printed `0` and `0`. |
| MKT-VOICE-15 trigger | confirm | The `CVE-`/`GHSA-` and title triggers stay. Nothing in the sources narrows or widens them. | Run the rule's own commands on a scratch repo (`git init`, a base commit set as `origin/main`, three staged files): `docs/adv.md` ("# Security advisory: token leak", with `CVE-2026-12345` and `GHSA-abcd-efgh-ijkl`), `docs/sec.md` ("# Security features", "Report a vulnerability by email") and `docs/out.md` ("# Outage on 2026-11-20"). Output: the identifier count prints `1` (the one line with both ids); the title grep (`grep -liE '^(# \|title: ).*\b(security advisory\|incident\|outage\|post-?mortem)\b'` over added files) prints `docs/adv.md` and `docs/out.md` and not `docs/sec.md`. So the trigger fires on the advisory and the outage post and not on a docs page about security features. |
| MKT-VOICE-15 scope | change (one clause) | Add after the topic list: "A notice sent only to named customers, or kept internal, is not published text and is out of scope (guidelines para 131 (i): 'private, interpersonal correspondence (for professional purposes), or organisation-internal texts')." | The PR body states `Channel: <public URL or list>`. The check: for a URL, `curl -sfL -o /dev/null -w '%{http_code}' <URL>` prints `200` with no login; for a mailing list, the sign-up page loads without an invitation. A channel that fails both is out of scope and the PR body says "Art. 50(4): not published". |
| Verdict 9 and "What an agent must ask a human" | change | Add the sentence "No authority has ruled on software advisories. The default is in scope. The owner may record the opposite." to Verdict 9, and add to the "What an agent must ask a human" item on borderline public-interest text the text: "An owner who wants advisories treated as out of scope sets `art50_advisory = \"out\"` in `.agents/voice.toml`." | The key is optional and the default is `in`. Check: `python3 -I -c "import tomllib;d=tomllib.load(open('.agents/voice.toml','rb'));assert d.get('art50_advisory','in') in ('in','out')"` exits 0 when the key is absent, `in` or `out`, and exits 1 for any other value. The agent applies MKT-VOICE-15's review when the value read is `in`; the PR body states the value read: `Advisory scope: in`. |
| Verdict 8, MKT-VOICE-14 | confirm | The guidelines still exclude "advertisement or product descriptions", with the carve-out for health, consumer-safety or sustainability claims. | Re-run at refresh: `grep -n -iE "advertisement or product descriptions" g.txt` prints one line. Today it prints the line in the section 6.2.1 out-of-scope list (page 43). |
| Decay table, MKT-VOICE-15 | change | Add C/2026/6005 (OJ C, 2026-11-12, per one secondary page) to the refresh checklist: "Open the Official Journal entry and record whether C/2026/6005 replaces C(2026) 7702." | At refresh, the entry in the Revision log names the OJ page and its date, or states "not found". |

New rule: none. The answer is a gap in authority, not a new behaviour.

### Verification run

The trigger test, run in a scratch git repository under `~/.cache/research-lang/exemplars/product/wave2/mva-q3-repair/scratch` (not an existing repository):

```
$ git diff --cached -U0 origin/main -- docs | grep '^+' | grep -cE 'CVE-[0-9]{4}-[0-9]{4,}|GHSA(-[0-9a-z]{4}){3}'
1
$ git diff --cached --name-only --diff-filter=A origin/main | xargs -r grep -liE '^(# |title: ).*\b(security advisory|incident|outage|post-?mortem)\b'
docs/adv.md
docs/out.md
```

The editorial-responsibility test, with `NAME="Jane Doe"`:

```
legal-ok.html: name count 1, contact count 1
legal-no.html: name count 0, contact count 0
```

## What could not be determined

- Whether France, Italy, the Netherlands or Ireland have published guidance on Art. 50(4) text. Searches returned none, and their authority sites were not opened. Missing: a read of each site, or a local-language search by someone with access to those pages.
- Whether any national authority or the Commission will address advisories. No such text existed on 2026-11-27, and no court or enforcement decision was found. Art. 50(4) has applied for under four months.
- What changed between the 2026-07-20 and 2026-11-05 versions of the guidelines. Missing: the July text, or a Commission corrigendum notice.
- Whether C/2026/6005 (OJ, 2026-11-12, one secondary page) is the same guidance as C(2026) 7702. Missing: the Official Journal entry.
- The text of the KI-MIG (§ 2 and the enforcement provisions). I read BNetzA's own slides that cite it, but not the statute at gesetze-im-internet.de.
- Pages 6 and 7 of the Service Desk FAQ yielded almost no static text (1 and 0 question titles). Missing: a browser that runs the page script, or a human reading.
- The Spanish AESIA transparency guide pages were searched by keyword only; its 56 pages were not read in full.
