---
title: "Follow-up q2: US state and UK AI-labelling duties for a non-EU software marketer"
program: product
topic: marketing-voice-ai-authorship
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 31
---

# Follow-up q2: do US state or UK rules oblige a non-EU software marketer to label AI text or media on its own site?

Repair pass 2026-11-27. Every statutory quotation below was re-read from the legislature's own text on that date, and the command that produced it is in section 7. Where a claim still rests on a law-firm or tracker page, it is labelled "secondary" and the page was opened, not taken from a search snippet.

## Answer

**For text: no.** No US state statute and no UK rule found obliges a software marketer to label AI-generated text on its own site. Pennsylvania's Act 99 defines "synthetic content" to include text, then exempts content "limited to text" in Section 4(b)(3): verified in the enrolled Act (section 3). California SB 1050 as amended 2026-06-11 reaches only an "audio, video, or audiovisual message" (committee analysis, section 1.2). New York reaches a performance that is "audiovisual and/or visual" (S.8420-A, section 2). UK law has no AI-labelling duty for advertising.

**For media: yes, in three US states, and only for advertising.** New York (in force 2026-06-09), Pennsylvania (in force 2026-12-21) and California SB 1050 (2027-01-01 per three law firms, one dissent, see section 1.2) require a conspicuous disclosure in an advertisement that contains an AI-generated human performer (NY, CA), or AI-modified or AI-generated image, video, audio or text-plus-media that creates a false consumer perception about the nature, origin or authenticity of the goods or services (PA). A landing-page hero video with a generated person is plausibly an "advertisement". A README screenshot is not clearly one. None of this reaches an ordinary generated sentence on a page.

**The California AI Transparency Act binds the maker of a generative system, not the publisher of its output.** A marketer who uses someone else's model owes nothing under it. A software company that ships a publicly accessible generative feature to Californians is probably a "covered provider" after SB 1000 removed the 1,000,000-user threshold (committee analysis; chaptered SB 1000 text not retrievable, see gaps). That is a product-compliance question for the owner, already in the topic's owner list.

**UK: no.** CAP states "There is no blanket legal requirement in the UK to disclose the use of AI in ads." The test is misleadingness, and a label does not cure a misleading ad.

## 1. California

### 1.1 AI Transparency Act (SB 942 as amended by AB 853 and SB 1000)

- Duty holder. AB 853 chaptered text (Chapter 674, Statutes of 2025), Section 22757.1(d): "'Covered provider' means a person that creates, codes, or otherwise produces a generative artificial intelligence system that has over 1,000,000 monthly visitors or users and is publicly accessible within the geographic boundaries of the state" ([AB 853 chaptered text](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-ab853-california-ai-transparency-act.pdf?la=en), Legislative Counsel authenticated copy hosted by Sidley, fetched 2026-11-27; section 7.1).
- Content duty. The bill digest in the same text: "Existing law requires a covered provider to include a latent disclosure in AI-generated image, video, or audio content, or content that is any combination thereof". Text is named in the definition of generative AI, not in the disclosure duty ([Assembly Privacy Committee analysis of SB 1000, hearing 2026-06-16](https://apcp.assembly.ca.gov/media/1177)).
- Penalty. Section 22757.4(a)(1) as amended by AB 853: "A violator of this chapter shall be liable for a civil penalty in the amount of five thousand dollars ($5,000) per violation to be collected in a civil action filed by the Attorney General, a city attorney, or a county counsel." Section 22757.6: "This chapter shall become operative on August 2, 2026." (same AB 853 text, section 7.1).
- SB 1000, committee analysis as amended 2026-06-09, hearing 2026-06-16: "Expands the act to cover all GenAI systems, not only those that have over 1 million monthly visitors or users" and the bill "Includes an urgency clause" (so it takes effect on signature). MoFo and Eversheds Sutherland report signature on 2026-09-30 ([MoFo, 2026-10-01](https://www.mofo.com/resources/insights/261001-california-revamps-ai-transparency-requirements), secondary). The chaptered SB 1000 text was not retrievable: leginfo, Justia, LegiScan and CalMatters return HTTP 403 to `curl` with a browser User-Agent (section 7.5).
- Who is not bound. [Eversheds Sutherland, 2026](https://www.eversheds-sutherland.com/en/czech-republic/insights/california-modifies-ai-transparency-law-weeks-after-it-took-effect-what-sb-1000-changes) (secondary): "The article imposes no SB 1000 duty on" businesses that publish content.
- Large online platform and hosting duties start 2027-01-01 and capture devices 2028-01-01 (AB 853 digest, same text).

### 1.2 SB 1050, synthetic performers in advertising (Bus. & Prof. Code 17610)

- Signed 2026-09-16 ([Governor's release, 2026-09-16](https://www.gov.ca.gov/2026/09/16/governor-newsom-signs-new-law-to-protect-workers-require-disclosures-on-ai-generated-advertising/)). It requires "the explicit disclosure on any video or audio advertisement that uses AI-generated performers". The release gives no effective date.
- Scope, from the bill as amended 2026-06-11 ([Assembly Privacy Committee analysis, hearing 2026-06-16](https://apcp.assembly.ca.gov/media/1170), government document, read 2026-11-27): the bill defines advertisement as an "audio, video, or audiovisual message, statement, audiovisual recording, digital communication, or other representation disseminated in any manner or by any means, including through online platforms, that is intended to induce, or that is reasonably expected to induce, the purchase of goods or services". It defines the synthetic performer as a "digital figure, voice, or representation created in whole or in part using GenAI, that creates the impression that the asset is engaging in an audio, audiovisual, or visual performance of a human performer who is not recognizable as any identifiable natural performer". It makes it unlawful to publish an advertisement with a synthetic performer "without a clear and conspicuous disclosure". A violation falls under the False Advertising Law and is enforceable through the Unfair Competition Law. A text-only ad is not an "audio, video, or audiovisual message".
- "Prominently" threshold, secondary: [Morgan Lewis, 2026-10-29](https://www.morganlewis.com/pubs/2026/10/california-requires-disclosures-for-ai-generated-performers-in-advertising) says disclosure applies when the performer appears "prominently", meaning in the foreground demonstrating or illustrating the product, giving the narration or message, or reacting to it. [Honigman, 2026-11-16](https://www.honigman.com/the-matrix/understanding-californias-synthetic-performer-disclosure-law-impacts-businesses-steps-remain-compliant) lists the same three. The wording is "substantially similar to" "this performance features a synthetic performer" or "no human performer is depicted" (Honigman; [National Law Review, 2026-09-25](https://natlawreview.com/article/governor-newsom-signs-california-bill-requiring-disclosures-ai-generated)).
- Effective date, conflicting secondary sources. 2027-01-01: [Reed Smith, 2026-09-21](https://www.reedsmith.com/our-insights/blogs/viewpoints/102o1m6/fake-performer-more-penalties-californias-synthetic-performer-law-enters-the-c/) ("effective January 1, 2027"), Morgan Lewis ("effective January 1, 2027"), Honigman ("takes effect Jan. 1, 2027"), Skadden ([2026-10](https://www.skadden.com/insights/publications/2026/10/california-joins-new-york-in-regulating-ai)). Immediately: National Law Review ("goes into effect immediately"). The committee analysis lists no urgency clause for SB 1050 (the word does not occur in it: `grep -ci urgency` returns 0, section 7.5), which points to the 2027-01-01 general rule. The chaptered text would settle it and was not retrievable.

## 2. New York, synthetic performers in advertisements

Primary text, S.8420-A, General Business Law 396-b ([printed bill, 2025-2026 session](https://legislation.nysenate.gov/pdf/bills/2025/S8420A), decompressed and read 2026-11-27; command and output in section 7.2):

- "Synthetic performer" means "a digitally created asset created, reproduced, or modified by computer, using generative artificial intelligence or a software algorithm, that is intended to create the impression that the asset is engaging in an audiovisual and/or visual performance of a human performer who is not recognizable as any identifiable natural performer."
- Duty: "Any person engaged in the business of dealing in any property or service who for any commercial purpose produces or creates an advertisement respecting any such property or service, in any medium or media in which such advertisement appears, shall conspicuously disclose in such advertisement that a synthetic performer is in such advertisement, where such person has actual knowledge."
- Penalty: "one thousand dollars for a first violation, and five thousand dollars for any subsequent violation."
- Exemptions: ads for expressive works consistent with the work; audio advertisements; AI used "solely" for language translation of a human performer.
- Effective "on the one hundred eightieth day after it shall have become a law".
- Signing and effective date. The Governor's release returned HTTP 403 to `curl` and WebFetch, so it was not read. Two opened sources date the signature: [Cooley, 2026-01-29](https://www.cooley.com/news/insight/2026/2026-01-29-new-york-enacts-synthetic-performer-disclosure-law-for-advertisements-including-those-using-generative-ai) ("December 11, 2025", effective "June 9, 2026", penalties $1,000 and $5,000) and [BroadwayWorld, 2025-12-11](https://www.broadwayworld.com/article/NY-Governor-Kathy-Hochul-Signs-Bills-to-Boost-AI-Transparency-in-the-Film-Industry-20251211) ("Legislation S.8420-A/A.8887-B requires persons who produce or create an advertisement to identify if it includes AI generated synthetic performers."). Date arithmetic: 2025-12-11 plus 180 days is 2026-06-09 (section 7.2), matching Cooley. [Multistate.ai](https://www.multistate.ai/updates/vol-114-state-ai-advertising-laws) says it "took effect in June". Both secondary. The signed chapter could still differ from the printed "A" version, and neither source says it does.

## 3. Pennsylvania, Act 99 of 2026 (SB 806)

Primary text, enrolled Act 99 ([General Assembly statute page, "Enacted from SB 806 on Thursday Oct. 22, 2026"](https://www.palegis.us/statutes/unconsolidated/law-information?sessYr=2026&sessInd=0&actNum=99), text read from the page's HTML view, section 7.3). Operative passages:

- Section 3, "Synthetic content": "Information, including an image, video, audio clip or text, that has been significantly modified or generated by artificial intelligence."
- Section 4(a): "An advertiser may not create and disseminate or cause to be created and disseminated an advertisement that uses synthetic content in a manner that creates a false consumer perception about the nature, origin or authenticity of the goods or services being advertised, without clear and conspicuous disclosure. A disclosure under this section must state that the advertisement contains content that was modified or generated using artificial intelligence. This disclosure must be: (1) Displayed in the first instance whenever the synthetic content is presented to the consumer. (2) Presented in the same medium as the synthetic content. (3) To the extent technically feasible, permanent or extraordinarily difficult to remove from the synthetic content."
- Section 4(b): "Subsection (a) shall not include content that is: (1) evidently fictional based on the content or context of the depiction; (2) parody, satire, commentary or criticism; or (3) limited to text."
- Section 5(c): "A civil fine that does not exceed $3,000" and "Actual attorney fees and court costs"; enforcement by "the Attorney General or the appropriate district attorney". Section 6: "This act shall take effect in 60 days." The statute page records enactment 2026-10-22, so the effective date is 2026-12-21 (section 7.3 arithmetic).
- Secondary cross-check: [Loeb & Loeb, 2026-10-23](https://www.loeb.com/fr/insights/passle/2026/10/a-new-ai-disclosure-law-from-pennsylvania-but-what-does-it-actually-cover) states the same fine, enforcer, text exemption and 2026-12-21 date.
- Reading. The test is a false consumer perception about the goods, so a generated product screenshot shown as the real product on an ordinary business's page is within reach. The Act does not define "advertiser" or "advertisement". Whether a README is one is untested.

## 4. Other US state and federal rules checked

| Rule | What it says | Reaches a marketer's text? | Source |
|---|---|---|---|
| Utah SB 226, 13-75-103 and -104 (in force 2025-05-07) | A supplier using generative AI to interact with an individual in a consumer transaction must disclose it is AI when asked. Safe harbor if the AI "clearly and conspicuously discloses" at the outset. Administrative fine "of up to $2,500 for each violation". Section 13-75-102: "It is not a defense to the violation of any statute administered and enforced by the division under Section 13-2-1 that generative artificial intelligence: (1) made the violative statement". | No. It governs a chatbot, not published copy. The no-defence clause matters: an agent's false claim is the marketer's. | [Utah SB 226 enrolled](https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf), read 2026-11-27 (section 7.4) |
| Utah SB 332 (2025) | Amends 63I-2-213(5): "Title 13, Chapter 72, Artificial Intelligence Policy Act, is repealed [May 1, 2025] July 1, 2027." That is Chapter 72, not the Chapter 75 duties above. SB 226's version of 63I-2-213 lists the same Chapter 72 repeal and no repeal of Chapter 75. | Not relevant to text. Corrects an earlier note that said the disclosure law repeals 2027-07-01. | [Utah SB 332 enrolled](https://le.utah.gov/Session/2025/bills/enrolled/SB0332.pdf), read 2026-11-27 (section 7.4) |
| FTC 16 CFR 465.2 (in force 2024-10-21) | Unfair or deceptive for a business to "write, create, or sell a consumer review, consumer testimonial, or celebrity testimonial" that misrepresents "That the reviewer or testimonialist exists" or their experience. The FTC release names "AI-generated fake reviews". | Only invented testimonials. Not a labelling duty: a label does not cure a fake. Already MKT-CLAIM-20. | [eCFR 465.2](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465), [FTC release 2024-08-14](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) |
| Maine LD 517 (132nd Legislature) | The committee amendment enacts 21-A M.R.S. 1014 sub-5-C: a public communication that requires a disclosure and "contains synthetic media" must carry "THIS COMMUNICATION CONTAINS AUDIO, VIDEO AND/OR IMAGES THAT HAVE BEEN MANIPULATED OR ALTERED". "Synthetic media" means an image, audio or video "depicting a candidate's appearance, speech or conduct". | No. Political communications about candidates. A tracker labels it "Synthetic Media in Advertising", which misleads. Final enactment status was not verified, and does not matter for a commercial marketer. | [LD 517 committee amendment H-837 PDF](https://lldc.mainelegislature.org/Open/LDs/132/132-LD-0517-CA_A_H837.pdf), read 2026-11-27 (section 7.4); the PDF text is OCR-noisy |
| California SB 243 (companion chatbots, Ch. 677 Stats 2025) | Section 22602(a): "If a reasonable person interacting with a companion chatbot would be misled to believe that the person is interacting with a human, an operator shall issue a clear and conspicuous notification indicating that the companion chatbot is artificially generated and not human." | No. A chatbot platform duty. | [SB 243 chaptered text](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf?la=en) read 2026-11-27; [Skadden, 2025-10-17](https://skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law) |
| California AB 2025 (Ch. 572 Stats 2026, signed 2026-09-27) and AB 723 | Digitally altered images in rental (AB 2025) and sale (AB 723) advertisements must be disclosed, on or adjacent to the image, by real-estate licensees and persons acting for them. Routine lighting, cropping and colour correction do not count. | No. Real-estate listings only. AB 723 is in force since 2026-01-01. | AB 2025: [GovBuddy summary](https://www.govbuddy.com/california/bills/ab-2025/) (tracker, secondary, effective date not stated). AB 723: [California DRE chaptered-bill summary](https://dre.ca.gov/Newsroom/DRE_Updates/2026_05_06_EOY_Bill_Summaries_2025.html), read 2026-11-27 |

## 5. United Kingdom

- ASA and CAP, 2025-05-29: "There is no blanket legal requirement in the UK to disclose the use of AI in ads." "our existing rules apply regardless of how content is generated, edited, or targeted." "disclosure alone is very unlikely to mitigate the harm caused by a fundamentally misleading message." Two questions: "Is the audience likely to be misled if the use of AI is not disclosed?" and whether any disclosure "is clarifying the ad's message or contradicting it?" ([ASA, 2025-05-29](https://www.asa.org.uk/news/disclosure-of-ai-in-advertising-striking-the-balance-between-creativity-and-responsibility.html)). The page does not address text specifically.
- ASA, 2026-06-11: "The Code is media-neutral, meaning the rules apply regardless of how the content was created." The page frames deepfakes as misleadingness and endorsement issues and does not mention labels ([ASA, 2026-06-11](https://www.asa.org.uk/news/ai-and-deepfakes-four-things-advertisers-need-to-know-before-they-hit-run.html)).
- Fake reviews: Schedule 20, paragraph 13 of the DMCC Act 2024 bans fake reviews. CMA208 (2025-04-04) lists as prohibited "Buying reviews which look like they have been written by individual consumers but have in fact been generated by software applications (such as bots)" ([CMA208](https://assets.publishing.service.gov.uk/media/67eeb64fe9c76fa33048c790/CMA208_-_Fake_reviews_guidance.pdf)). Same character as 16 CFR 465: a ban on invention, not a labelling duty.
- No UK statute labelling AI-generated marketing text or media was found. UK online-safety and intimate-image deepfake offences were not searched; they concern harmful content, not marketing.

## 6. Does the new caption wording collide with the existing checks?

The new rule text would require three caption wordings. They were run against `CHATBOT_RE` (DOC-PLAIN-08, `/home/mherwig/dev/ocx-sh/catalog/.claude/rules/docs-quality/checks/prose.py` lines 67 to 74) and `authorship.re` (block MKT-VOICE-14 in the topic file) on 2026-11-27, in the scratch directory `~/.cache/research-lang/exemplars/product/wave2/mvq2-repair/`. Full commands and `cat` output are in section 7.1. Result:

| Caption | CHATBOT_RE | authorship.re |
|---|---|---|
| This performance features a synthetic performer | no hit | no hit |
| No human performer is depicted | no hit | no hit |
| This ad contains content that was modified or generated using artificial intelligence | no hit | no hit |
| Generated with AI (the existing MKT-VOICE-16 caption, control) | no hit | HIT (the documented exempt caption) |

The earlier version of this file said all four passed `authorship.re`. That was wrong for the fourth line: `Generated with AI` hits, which is the exemption the MKT-VOICE-14 block already documents. The three new wordings pass both checks without a checker change.

## 7. Commands and output

Scratch directory for every command: `W=~/.cache/research-lang/exemplars/product/wave2/mvq2-repair`. Downloads are untrusted data and were opened with `python3 -I`. The PDF extractor `pdftxt.py` (no `pdftotext` on this machine) inflates each FlateDecode stream and joins the `TJ`/`Tj` strings:

```python
import re, sys, zlib
d = open(sys.argv[1], "rb").read()
out = []
for m in re.finditer(rb"stream\r?\n(.*?)endstream", d, re.S):
    try: s = zlib.decompress(m.group(1))
    except Exception: continue
    for blk in re.findall(rb"\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj", s, re.S):
        a = blk[0] or blk[1]
        out.append("".join(x.decode("latin1") for x in re.findall(rb"\(((?:\\.|[^\\)])*)\)", a)) if blk[0] else a.decode("latin1"))
    out.append("\n")
print(" ".join(out))
```

### 7.1 The two existing checks against the new captions

```text
$ R=/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/marketing-voice-ai-authorship.md
$ P=/home/mherwig/dev/ocx-sh/catalog/.claude/rules/docs-quality/checks/prose.py
$ sed -n '/^cat > authorship.re <<.EOF.$/,/^EOF$/p' $R | sed '1d;$d' > authorship.re
$ sed -n 67,74p $P > chatbot_re.py.txt
$ cat chatbot_re.py.txt
CHATBOT_RE = re.compile(
    r"I hope this helps|as an AI|as of my last update|knowledge cutoff|"
    r"let me know if|feel free to ask|contentReference|oaicite|\[cite: [0-9]|"
    r"AI-generated|AI-assisted|"
    r"written with (?:the )?(?:help|assistance) of (?:AI|Claude|ChatGPT|Copilot|Gemini)|"
    r"assisted by (?:AI|Claude|ChatGPT|Copilot|Gemini)",
    re.IGNORECASE,
)
$ cat run_check.py
import re, sys
src = open(sys.argv[1]).read()
ns = {"re": re}
exec(src, ns)
for line in open(sys.argv[2]).read().splitlines():
    print("CHATBOT_RE", bool(ns["CHATBOT_RE"].search(line)), line)
$ cat cap.txt
This performance features a synthetic performer
No human performer is depicted
This ad contains content that was modified or generated using artificial intelligence
Generated with AI
$ python3 -I run_check.py chatbot_re.py.txt cap.txt
CHATBOT_RE False This performance features a synthetic performer
CHATBOT_RE False No human performer is depicted
CHATBOT_RE False This ad contains content that was modified or generated using artificial intelligence
CHATBOT_RE False Generated with AI
$ grep -niE -f authorship.re cap.txt; echo "grep exit=$?"
4:Generated with AI
grep exit=0
```

`authorship.re` had 4 patterns (`grep -c . authorship.re` printed 4), matching the four-pattern block in the topic file.

### 7.2 New York S.8420-A and the 180-day date

```text
$ curl -sL -A "$UA" -o src/s8420a.pdf https://legislation.nysenate.gov/pdf/bills/2025/S8420A     # plain curl without a browser User-Agent also works here
$ python3 -I pdftxt.py src/s8420a.pdf | tr -s ' ' > src/s8420a.n.txt
$ grep -oE 'Any person engaged.{0,420}' src/s8420a.n.txt
Any person engaged in the business of dealing in any property or 39 service who for any commercial purpose produces or creates an advertise- 40 ment respecting any such property or service, in any medium or media in 41 which such advertisement appears, shall conspicuously disclose in such 42 advertisement that a synthetic performer is in such advertisement, where 43 such person has actual knowledge. A violation of this subdivision sha
$ grep -oE 'one thousand dollars.{0,120}' src/s8420a.n.txt
one thousand dollars for a first violation, 45 and five thousand dollars for any subsequent violation. 46 4. This section shall not apply to
$ grep -oE 'hundred eightieth.{0,80}' src/s8420a.n.txt
hundred eightieth day after 24 it shall have become a law.
$ grep -oE '(shall not apply|exempt|solely).{0,300}' src/s8420a.n.txt | head -2
shall not apply to advertisements and promotional 47 materials for expressive works, including but not limited to, motion 48 pictures, television programs, streaming content, documentaries, video 49 games, or other similar audiovisual works, provided that the use of a synthetic performer in the advertisement or
shall not apply to advertisements and promotional 4 materials in any of the following circumstances: 5 \(a\) Audio advertisements; or 6 \(b\) Where the use of artificial intelligence solely involves the 7 language translation of a human performer. 8 8. Nothing in this section shall apply to any medium used for adv
$ python3 -I -c 'import datetime as d;print(d.date(2025,12,11)+d.timedelta(180), d.date(2026,10,22)+d.timedelta(60))'
2026-06-09 2026-12-21
```

The definition passage in the printed text reads `"Synthetic performer" means a digitally created asset created, 22 reproduced, or modified by computer, using generative artificial intel- 23 ligence or a software algorithm, that is intended to create the` and continues on the next page as quoted in section 2.

### 7.3 Pennsylvania Act 99

```text
$ curl -sL -A "$UA" 'https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?99&iFrame=true&txtType=HTM&SessYr=2026&ActNum=0099.&SessInd=0' -o src/act99i.html     # the iframe URL the statute page's script builds; the plain HTM link returns an empty shell
$ python3 -I -c '(strip tags, collapse whitespace)' src/act99i.html src/act99i.txt
$ grep -oE "Exceptions.{0,500}" src/act99i.txt | head -2
Exceptions.--Subsection (a) shall not include content that is: (1) evidently fictional based on the content or context of the depiction; (2) parody, satire, commentary or criticism; or (3) limited to text. (c) Construction.--Disclosure of the use of AI under subsection (a) shall not be construed to limit any recourse under law. 20260099u5s Section 5. Enforcement. ...
$ grep -oE "civil fine.{0,100}" src/act99i.txt
civil fine that does not exceed $3,000. (2) Actual attorney fees and court costs. 20260099u6s Section 6. Effec
$ grep -oE "take effect.{0,40}" src/act99i.txt
take effect in 60 days.
```

The Section 3 and 4(a) quotations in section 3 come from the same file (`python3 -I` print of `src/act99i.txt` from "Section 1."). The earlier printer's-number copy, PN 1808 (Senate-passed print, "AS AMENDED ON THIRD CONSIDERATION, JUNE 10, 2026"), has identical Section 4(a), 4(b) and 5(c) text, so the enrolled Act matches the Senate print on these passages.

### 7.4 Utah, Maine, California SB 243 and AB 853 text

```text
$ python3 -I pdftxt.py src/sb332.pdf | tr -s ' \n' ' ' | grep -oE '\(5\) Title 13, Chapter 72.{0,70}'
(5) Title 13, Chapter 72, Artificial Intelligence Policy Act, is repealed [ May ] July 1, [ 2025 ] 31 2027 .
$ python3 -I pdftxt.py src/sb226.pdf | tr -s ' \n' ' ' | grep -oE 'administrative fine of up to \$2,500.{0,60}'
administrative fine of up to $2,500 for each 145 violation of this chapter; and
$ python3 -I pdftxt.py src/sb226.pdf | tr -s ' \n' ' ' | grep -oE 'It is not a defense.{0,160}'
It is not a defense to the violation of any statute administered and enforced by the 92 division under Section 13-2-1 that generative artificial intelligence: 93 \(1\) made the violative statement;
$ python3 -I pdftxt.py src/ld517.pdf | tr -s ' \n' ' ' | grep -oE '5-C\. Use of synthetic media.{0,260}'
5-C. Use of synthetic media. Whenever a public communication that requires a 12 disclosure under subsections 1. 2. 2-A or 2-B contains synthetic media, the public 13 communication must include, in addition to any other required disclosure, the words "THIS 14 COMMUNICATION CONTAINS AUDIO. VIDEO AND/OR IMAGES THAT HAVE
```

AB 853 (the PDF needs a browser User-Agent: plain `curl` gets a Cloudflare page) has odd letter spacing after extraction, so whitespace was removed before matching:

```text
$ curl -sL -A "$UA" -o src/ab853.pdf 'https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-ab853-california-ai-transparency-act.pdf?la=en'
$ python3 -I pdftxt.py src/ab853.pdf | tr -s ' \n' ' ' > src/ab853.n.txt
$ python3 -I -c 'import re;s=re.sub(r"\s+","",open("src/ab853.n.txt").read());m=re.search(r"Coveredprovider.{0,3}means",s);print(s[m.start():m.end()+230])'
Coveredprovider\000\000ºmeansapersonthatcreates,codes,orotherwiseproducesagenerativearti®cialintelligencesystemthathasover1,000,000monthlyvisitorsorusersandispubliclyaccessiblewithinthegeographicboundariesofthestate.
$ (same script) pattern "fivethousanddollars" prints
...Aviolatorofthischaptershallbeliableforacivilpenaltyintheamountof®vethousanddollars\($5,000\)perviolationtobecollectedinacivilaction®ledbytheAttorneyGeneral,acityattorney,oracountycounsel...
$ (same script) pattern "August2,2026" prints
...22757.6.ThischaptershallbecomeoperativeonAugust2,2026.SEC.7...
```

SB 243: `python3 -I pdftxt.py src/sb243.pdf` then whitespace removed and matched on `22602\.` prints `22602.\(a\)\000\000Ifareasonablepersoninteractingwithacompanionchatbotwouldbemisledtobelievethatthepersonisinteractingwithahuman,anoperatorshallissueaclearandconspicuousnoti®cationindicatingthatthecompanionchatbotisarti®ciallygeneratedandnothuman.`

### 7.5 California committee analyses and the 403s

```text
$ curl -sL -A "$UA" -o src/apcp1170.pdf https://apcp.assembly.ca.gov/media/1170
$ python3 -I pdftxt.py src/apcp1170.pdf | tr -s ' \n' ' ' > src/apcp1170.txt
$ head -c 160 src/apcp1170.txt
SB 1050 Page 1 Date of Hearing: June 16, 2026 Fiscal: Yes ASSEMBLY COMMITTEE ON PRIVACY AND CONSUMER PROTECTION Rebecca Bauer - Kahan , Chair SB 1050 ( Ashby ) As Amended June 11, 2026 
$ grep -ci urgency src/apcp1170.txt
0
$ python3 -I pdftxt.py src/apcp1177.pdf | tr -s ' \n' ' ' | grep -oE 'Expands the act.{0,80}'
Expands the act to cover all GenAI systems, not only those that have over 1 million monthly visitors or users.
$ for u in leginfo.../billTextClient.xhtml?bill_id=202520260SB1050 leginfo.../billNavClient.xhtml?bill_id=202520260SB1050 calmatters.digitaldemocracy.org/bills/ca_202520260sb1050 legiscan.com/CA/text/SB1050/id/3100000 www.governor.ny.gov/news/governor-hochul-signs-legislation-protect-consumers-and-boost-ai-transparency-film-industry; do curl -sL -A "$UA" -o /dev/null -w '%{http_code} %{size_download} '"$u"'\n' "$u"; done
403 5763 leginfo.../billTextClient.xhtml?bill_id=202520260SB1050
403 5760 leginfo.../billNavClient.xhtml?bill_id=202520260SB1050
403 5696 calmatters.digitaldemocracy.org/bills/ca_202520260sb1050
403 5595 legiscan.com/CA/text/SB1050/id/3100000
403 5985 www.governor.ny.gov/news/governor-hochul-signs-legislation-protect-consumers-and-boost-ai-transparency-film-industry
```

(The SB 1050 analysis is the Assembly committee's, for the bill as amended 2026-06-11. A later amendment before enactment could have changed the text.)

### 7.6 The MKT-VOICE-16 structural check (new)

The check the old verification lacked. It uses only the Python standard library. `check_performer.py`:

```python
import re, sys
from html.parser import HTMLParser
CAP = re.compile(r"synthetic performer|no human performer is depicted|modified or generated using artificial intelligence", re.I)
PERSON = re.compile(r"\b(person|people|presenter|host|actor|actress|avatar|spokesperson|speaker|narrator|voiceover|man|woman)\b", re.I)
MEDIA = {"img", "video", "audio"}
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.stack = []; s.figs = []; s.loose = []
    def handle_starttag(s, tag, a):
        a = dict(a)
        if tag == "figure":
            f = {"flag": "data-synthetic-performer" in a, "media": 0, "cap": "", "incap": False}
            s.figs.append(f); s.stack.append((tag, f))
        elif tag == "figcaption" and s.stack:
            s.stack[-1][1]["incap"] = True
        elif tag in MEDIA:
            f = next((x[1] for x in reversed(s.stack) if x[0] == "figure"), None)
            alt = a.get("alt", "") + " " + a.get("aria-label", "")
            if f is not None: f["media"] += 1
            if PERSON.search(alt) and not (f and f["flag"]): s.loose.append(alt.strip())
    def handle_endtag(s, tag):
        if tag == "figcaption" and s.stack: s.stack[-1][1]["incap"] = False
        if tag == "figure" and s.stack: s.stack.pop()
    def handle_data(s, d):
        if s.stack and s.stack[-1][1]["incap"]: s.stack[-1][1]["cap"] += d
p = P(); p.feed(open(sys.argv[1]).read()); bad = 0
for f in p.figs:
    if f["flag"] and not (f["media"] and CAP.search(f["cap"])):
        print("FAIL flagged figure has no media or no matching figcaption inside it"); bad = 1
for alt in p.loose: print("READ media alt names a person but its figure is not flagged:", alt)
print("exit", bad); sys.exit(bad)
```

Fixtures and output (run 2026-11-27):

```text
$ cat fx/good.html
<figure data-synthetic-performer><video src="a.mp4" aria-label="Presenter explains the CLI"></video><figcaption>This performance features a synthetic performer</figcaption></figure>
$ cat fx/footer.html
<figure data-synthetic-performer><video src="a.mp4" aria-label="Presenter"></video></figure><footer>This performance features a synthetic performer</footer>
$ cat fx/otherfig.html
<figure data-synthetic-performer><img src="a.png" alt="Host"></figure><figure><img src="b.png" alt="chart"><figcaption>This performance features a synthetic performer</figcaption></figure>
$ cat fx/unflagged.html
<figure><img src="a.png" alt="A smiling spokesperson holds a laptop"></figure>
$ for f in good footer otherfig unflagged; do echo "--- $f"; python3 -I check_performer.py fx/$f.html; done
--- good
exit 0
--- footer
FAIL flagged figure has no media or no matching figcaption inside it
exit 1
--- otherfig
FAIL flagged figure has no media or no matching figcaption inside it
exit 1
--- unflagged
READ media alt names a person but its figure is not flagged: A smiling spokesperson holds a laptop
exit 0
```

The script proves the caption sits inside the same `<figure>` as the media, and finds media whose alt text names a person but that nobody flagged. It cannot see a face in pixels. Whether a flagged or unflagged asset shows a human performer is a reading check, as in the existing rule. It reads HTML, so Astro or TSX copy needs the built page (`dist/index.html`, as in the MKT-VOICE-14 block).

## Effect on the ruleset

| Rule | Effect | Text and reason |
|---|---|---|
| MKT-VOICE-14 | **confirm** | No US state or UK rule requires a text authorship label. PA exempts content "limited to text" (enrolled Act 99, section 4(b)(3)), CA SB 1050 reaches audio, video and audiovisual messages, and NY an audiovisual or visual performance. The "no authorship statement" rule stands. Add nothing. |
| MKT-VOICE-15 | **confirm** | It rests on EU Art. 50(4) only. No US or UK analogue for public-interest text was found. Keep the scope note "EU law". |
| MKT-VOICE-16 | **change** | **Rule column, append:** "If the media shows a human or human-like performer (face, body or voice) in an advertisement or on a pitch page, wrap the media and its caption in one `<figure data-synthetic-performer>` and put the caption `This performance features a synthetic performer` in that figure's `<figcaption>` instead of `Generated with AI`, and publish it only with the owner's written yes. If an AI-modified or AI-generated image or video of the product could mislead about the goods, the caption is `This content was modified or generated using artificial intelligence`, in the same figure." **Rationale column, append:** "New York GBL 396-b (in force 2026-06-09, penalties $1,000 then $5,000) and California SB 1050 (2027-01-01 per Reed Smith, Morgan Lewis, Honigman and Skadden, one source says immediately) require a conspicuous disclosure of a synthetic performer in an audio, video or audiovisual advertisement. Pennsylvania Act 99 (2026-12-21, fine up to $3,000) requires a disclosure that the advertisement 'contains content that was modified or generated using artificial intelligence', in the same medium as the content, where synthetic content creates a false consumer perception about the goods, and exempts content 'limited to text'. UK has no labelling duty (ASA 2025-05-29). Not legal advice." **Verification column, replace the grep with:** "Run `python3 -I check_performer.py <built page>` (block MKT-VOICE-16b: stdlib HTML parser, 25 lines, tested on four fixtures 2026-11-27). Exit 0 means every `<figure data-synthetic-performer>` holds at least one `img`, `video` or `audio` and a `<figcaption>` inside that same figure matching `synthetic performer|no human performer is depicted|modified or generated using artificial intelligence`. A `READ` line lists media whose alt or aria-label names a person but whose figure is not flagged: the agent flags it or states in the PR body why it shows no human performer. Keep the existing `grep -n -iE 'generated with ai\|edited with ai'` check for the plain labels. The agent states in the PR body `Performer media: none` or the file list. Reading check unchanged." Severity stays MUST. |
| MKT-VOICE-17 | **confirm** | PA's "nature, origin or authenticity of the goods or services" trigger adds a second legal basis for a rule that already bans generated product transcripts and screenshots. |
| MKT-VOICE-06 | **confirm** | Utah 13-75-102 (an AI statement is no defence) and 16 CFR 465.2 support the fabrication basis. Testimonial invention is MKT-CLAIM-20, so add no new rule here. |
| MKT-VOICE-01 to -05, -07 to -13, -18 | no effect | Outside this question. |
| **NEW MKT-VOICE-19** | new, severity MUST | **Rule:** Never generate a human performer (face, body or voice) for an advertisement, pitch page, release video or social post. Use a real recording, a screenshot of the shipped product or a drawn illustration. If the owner asks for a synthetic performer, ask for the owner's written yes first, then apply MKT-VOICE-16's caption. **Rationale:** NY GBL 396-b and CA SB 1050 regulate the synthetic performer, penalties start at $1,000 (NY), and a legally mandatory label on a software pitch also costs the credibility the page needs. The rule removes the legal exposure by removing the asset. **Verification:** (1) `git diff --name-only --diff-filter=A origin/main... \| grep -E '\.(mp4\|webm\|mp3\|wav\|png\|jpe?g\|webp)$'` lists new media for a human to read, and the PR body states `Performer media: none` or names the files. (2) `python3 -I check_performer.py <built page>` prints no `READ` line, or each `READ` line is explained in the PR body. (3) `grep -rnE 'synthetic performer\|avatar\|ai[- ]generated (person\|presenter\|voice)' <copy paths>` lists hits for a human to read. Whether the stricter "never" is the right default or the label-and-ship rule of MKT-VOICE-16 is enough is an owner choice: this evidence supports either. Mark CONSIDER if the owner declines. |

## Dated facts

| Fact | Date | Source |
|---|---|---|
| NY synthetic-performer disclosure signed | 2025-12-11 | Cooley 2026-01-29; BroadwayWorld 2025-12-11 (Governor's release returned 403) |
| NY disclosure in force | 2026-06-09 (180 days after signing) | S.8420-A text; Cooley |
| CA AI Transparency Act covered-provider duties operative | 2026-08-02 | AB 853 chaptered text, Section 22757.6 |
| CA SB 1000 (no user threshold, urgency clause) | amended 2026-06-09, hearing 2026-06-16; signed 2026-09-30 per secondary | Assembly committee analysis; MoFo 2026-10-01 |
| CA SB 1050 signed | 2026-09-16 | Governor's release |
| CA SB 1050 effective | 2027-01-01 per four law firms; "immediately" per one; chaptered text unread | Reed Smith 2026-09-21, Morgan Lewis 2026-10-29, Honigman 2026-11-16, Skadden 2026-10; National Law Review 2026-09-25 |
| PA Act 99 signed | 2026-10-22 | palegis.us statute page |
| PA Act 99 effective | 2026-12-21 | Act 99 Section 6 plus signing date; Loeb 2026-10-23 |
| CA AB 2025 signed | 2026-09-27 | GovBuddy (tracker, secondary) |
| CA platform and hosting duties | 2027-01-01; capture devices 2028-01-01 | AB 853 digest |
| Utah AI Policy Act (Title 13 Chapter 72) repeal | 2027-07-01 | SB 332 enrolled, SB 226 enrolled |
| Utah SB 226 consumer disclosure duties | in force 2025-05-07 | SB 226 enrolled |
| ASA/CAP "no blanket legal requirement" | 2025-05-29 | ASA |
| ASA media-neutral Code statement | 2026-06-11 | ASA |
| FTC fake-review rule | released 2024-08-14, in force 2024-10-21 | FTC; eCFR |
| CMA208 fake-reviews guidance | 2025-04-04 | CMA |

## What could not be determined

- **Chaptered text of California SB 1000 and SB 1050.** leginfo, Justia, LegiScan and CalMatters return HTTP 403 to `curl` with a browser User-Agent and to WebFetch (section 7.5). Missing: a browser that can read leginfo, or a pasted copy. What is now known: the committee analysis of each bill as amended in June 2026 (government documents), and four law firms that quote the SB 1050 wording and date. What is still open: the SB 1050 effective date (2027-01-01 per four firms, "immediately" per one, no urgency clause in the June analysis), and whether a later amendment changed the audio, video or audiovisual scope or the "prominently" test.
- **Whether the New York signed chapter matches the printed S.8420-A.** The Governor's release returned 403. Two opened secondary sources describe the same duty and penalties. The chapter number was not found.
- **Whether a software company's own landing-page video is an "advertisement" under NY, CA or PA.** No guidance or case was found. PA does not define "advertiser" or "advertisement". Counsel's call, not research.
- **Whether a project that ships a generative feature is a California "covered provider".** The SB 1000 analysis says all GenAI systems are covered, but SB 1000's chaptered definition was not read.
- **California AB 2025's effective date.** The GovBuddy tracker does not state it. It is out of scope for text and media on a software page, so it was not pursued.
- **Other states and federal preemption.** Only NY, CA, PA, UT and ME were examined. The remaining states' 2026 session laws and any federal preemption measure were not surveyed. Trackers list other states (Washington, Connecticut) as having "general AI disclosure" laws. None was verified.
- **UK online-safety, data-protection and Ofcom rules** were not searched, since they do not address marketing copy.
- **Not legal advice.** The owner or counsel decides on any adopter's exposure.
