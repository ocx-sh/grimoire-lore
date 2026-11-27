---
title: "Follow-up q1: does Barik et al. (FSE 2018) support resolution over structure?"
program: product
topic: ux-interface-text
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 2
---

# Follow-up q1: does the full text of Barik et al. support "resolution over structure"?

Question (from `ux-interface-text.md`, Verdict 1): only the abstract was read. What are the method and the effect size, and does the finding hold?

## Answer

Partly. The full text supports a narrow version of the claim and not the wide one. The narrow version: in one forced-choice pair, 46 of 68 professional developers (68%) preferred a short claim-plus-fix message over a longer explanatory message that had no fix. The wide version, "a next step matters more than anything else in an error message", is not what the paper tests. One pair carries the whole resolution result, the paper's own p-value for it does not reproduce from its own counts (the true value is smaller, so the conclusion survives), and the measure is stated preference, not task success. The ranking of UX-TEXT-02 and UX-TEXT-04 as MUSTs still rests on the fleet and exemplar measurement, as Verdict 1 already says. The study is a second, weak, corroborating source. It also adds two things the ruleset lacks: grounds ("because ...") beat a bare claim by a large margin when no fix exists (2 of 68 and 20 of 68 chose the bare claim), and the authors say a fix is the right shape only when the fix is obvious.

## Source and how it was read

- Paper: Barik, Ford, Murphy-Hill, Parnin, "How Should Compilers Explain Problems to Developers?", ESEC/FSE 2018, November 4-9, 2018, [DOI 10.1145/3236024.3236040](https://doi.org/10.1145/3236024.3236040). Publication page [microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/](https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/) (November 2018, fetched 2026-11-27).
- Full text: [barik_fse18.pdf](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/10/barik_fse18.pdf), 11 pages, fetched 2026-11-27. Page numbers are not cited because the extract does not keep them. Section numbers are.
- Scratch directory (all commands below run in it, all files named below are in it): `~/.cache/research-lang/exemplars/product/wave2/ux-interface-text-q1/`. It holds `barik.pdf`, `barik.txt`, `extract.py`, `stats.py`, `bonf.py`, `check31.sh`, `corpus/`.
- The built-in fetch tool returned no body text for the compressed PDF, so the text was extracted locally. Fetch and hash, then extract (a re-fetch on 2026-11-27 gave the same hash as the first copy):

```
$ curl -sSL -o barik-refetch.pdf -w '%{http_code} %{size_download}\n' https://www.microsoft.com/en-us/research/wp-content/uploads/2019/10/barik_fse18.pdf
200 724581
$ sha256sum barik-refetch.pdf barik.pdf
0ecfc9b0b4dc4abcc73f50a3b8ccd7cb51792dc513e0ed26bbbe93da76c1f176  barik-refetch.pdf
0ecfc9b0b4dc4abcc73f50a3b8ccd7cb51792dc513e0ed26bbbe93da76c1f176  barik.pdf
$ cat extract.py
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
open(sys.argv[2], "w").write("\n".join(p.extract_text() for p in r.pages))
print("pages", len(r.pages))
$ uv run --quiet --with pypdf python -I extract.py barik.pdf barik2.txt
Multiple definitions in dictionary at byte 0xaab41 for key /ToUnicode
Multiple definitions in dictionary at byte 0xaaf83 for key /ToUnicode
pages 11
$ cmp barik.txt barik2.txt && echo IDENTICAL; wc -c barik.txt
IDENTICAL
65954 barik.txt
```

The two pypdf warnings are non-fatal and the text read cleanly. Sections 3 to 8 were read in full from `barik.txt`.
- Everything below marked "paper" is quoted or counted from that text. Everything marked "recomputed" is my arithmetic on the paper's counts, with the script source and its output below.

## Method (paper, sections 3 and 4)

Two phases.

**Phase I, the comparative evaluation (the only phase that tests preference).**
- Materials: Java code listings that fail to compile, with the error text from two compilers, OpenJDK and Jikes. The first author wrote 49 listings, tagged each Jikes message with Toulmin argument labels, and found 30 Jikes messages with at least a simple argument and 7 OpenJDK messages with one. From those the authors "deliberately selected 5" pairs (Table 1, tags E1 to E5). Two compiler experts were consulted to form a hypothesis per pair (section 3.2).
- Participants: 300 full-time developers at one large software company were invited and 68 responded (22.7%). Mean experience 6.3 years. 45 reported Java proficiency and 23 another object-oriented language.
- Task: a forced binary choice per pair, with message order randomised, shown beside the source listing. Mean completion time seven minutes. The measure is which message the participant "would prefer in their compiler" (section 1). It is a preference, not a fix time, a fix rate or a comprehension score.
- Analysis: a chi-squared test per pair against a 50/50 null, alpha 0.05, no correction for five tests (section 4.1).

**Phase II, Stack Overflow.** 210 question and accepted-answer pairs about compiler errors across seven languages, coded qualitatively against Toulmin's model by the authors. The permutation test compared argument layouts of the error text in the question with the accepted answer (Jaccard ratio Rj = 1.6, p = 0.008 plus or minus 0.001). This phase shows what accepted human answers contain. It does not test what users prefer.

## Results (paper, Table 3 and Figure 3)

| Pair | What differs | OpenJDK | Jikes | Paper p | Reading |
|---|---|---|---|---|---|
| E1 | OpenJDK claim only; Jikes adds grounds ("because the loop may execute more than once") | 2 (3%) | 66 (97%) | .001 | grounds beat bare claim |
| E2 | OpenJDK claim only; Jikes adds grounds plus a rebuttal and a near-miss name | 20 (29%) | 48 (71%) | .014 | grounds beat bare claim |
| E3 | OpenJDK claim plus resolution; Jikes extended argument, no resolution | 46 (68%) | 22 (32%) | .037 | resolution beat richer argument |
| E4 | Two different claims, both extended arguments | 20 (29%) | 48 (70%) | .014 | content, not structure |
| E5 | Same claim, same structure, minor wording | 36 (53%) | 32 (47%) | .732 | coin flip, as designed |

The sentence that supports the finding, section 5.1: "We did not know if developers would prefer a claim-resolution structure or an extended argument, given that the extended argument did not provide a resolution. Developers significantly preferred having a resolution over a more elaborate argument."

The E3 messages, verbatim from Table 1:
- OpenJDK (claim plus resolution): "static method should be qualified by type name, Foo, instead of by an expression."
- Jikes (extended argument, no resolution): "Invoking the class method "f" via an instance is discouraged because the method invoked will be the one in the variable's declared type, not the instance's dynamic type."

Stack Overflow layouts (Figure 3, counts of compiler error messages "CEM" against accepted answers "SO", out of 210 each): claim-only CEM 191, SO 0; claim-resolution CEM 10, SO 59; simple argument CEM 8, SO 49; extended argument CEM 1, SO 102. The authors report "we did not find any instances in which Stack Overflow accepted answers solely rephrased the compiler error message".

### Recomputation of the statistics

The five reported p-values do not reproduce from the five count pairs. Source and output, run 2026-11-27 in the scratch directory:

```
$ cat stats.py
from math import comb, erfc, sqrt
rows={'E1':(2,66),'E2':(20,48),'E3':(46,22),'E4':(20,48),'E5':(36,32)}
rep={'E1':.001,'E2':.014,'E3':.037,'E4':.014,'E5':.732}
for k,(a,b) in rows.items():
    n=a+b
    chi=(a-n/2)**2/(n/2)+(b-n/2)**2/(n/2)
    p_chi=erfc(sqrt(chi/2))
    m=max(a,b)
    p_bin=min(1,2*sum(comb(n,i) for i in range(m,n+1))/2**n)
    # Wilson 95% CI for proportion preferring OpenJDK(a)
    z=1.96;ph=a/n
    c=(ph+z*z/(2*n))/(1+z*z/n);h=z*sqrt(ph*(1-ph)/n+z*z/(4*n*n))/(1+z*z/n)
    print(k,a,b,n,"chi2=%.2f p_chi=%.4f p_binom=%.4f reported=%s OpenJDK share=%.1f%% CI=[%.1f,%.1f]"%(chi,p_chi,p_bin,rep[k],100*ph,100*(c-h),100*(c+h)))
$ python3 -I stats.py
E1 2 66 68 chi2=60.24 p_chi=0.0000 p_binom=0.0000 reported=0.001 OpenJDK share=2.9% CI=[0.8,10.1]
E2 20 48 68 chi2=11.53 p_chi=0.0007 p_binom=0.0009 reported=0.014 OpenJDK share=29.4% CI=[19.9,41.1]
E3 46 22 68 chi2=8.47 p_chi=0.0036 p_binom=0.0049 reported=0.037 OpenJDK share=67.6% CI=[55.8,77.6]
E4 20 48 68 chi2=11.53 p_chi=0.0007 p_binom=0.0009 reported=0.014 OpenJDK share=29.4% CI=[19.9,41.1]
E5 36 32 68 chi2=0.24 p_chi=0.6276 p_binom=0.7163 reported=0.732 OpenJDK share=52.9% CI=[41.2,64.3]
```

`stats.py` computes a one-degree-of-freedom chi-squared against 50/50, an exact two-sided binomial p, and a Wilson 95% interval on the share choosing the first message. Reading: the paper's p-values are all larger (more conservative) than the recomputed ones, so no significance conclusion flips at alpha 0.05. The cause of the mismatch is not stated in the paper. Effect size for E3: 67.6% preferring the resolution message, 95% interval 55.8% to 77.6%, a lower bound barely above a coin flip. The paper reports no effect size beyond the counts.

## Threats to the "resolution beats structure" reading

1. **Confound in the one pair that tests it.** E3 differs from a pure resolution test in length, wording and hedging. The OpenJDK message is one short sentence. The Jikes message is longer and says only "discouraged". The paper itself describes the Jikes message as the more explanatory one (design principle I: "despite the fact that the Jikes version is more explanatory"). A reader may simply prefer the shorter message. The paper has no pair that adds a resolution to an otherwise identical message.
2. **One pair, not predicted.** The authors state they "did not know" which way E3 would go. It is an exploratory result, and it is the only resolution-versus-argument comparison among the five.
3. **No multiple-test correction.** Five tests at alpha 0.05. Bonferroni threshold 0.05/5 = 0.01. The reported E3 p of .037 would not pass. The recomputed 0.0036 (chi-squared) and 0.0049 (binomial) would. Command and output (the recomputed values are copied from the `stats.py` output above; E5 is the designed null):

```
$ cat bonf.py
# Bonferroni for 5 tests at family alpha 0.05 -> per-test 0.01
reported={'E1':.001,'E2':.014,'E3':.037,'E4':.014,'E5':.732}
chi={'E3':.0036}; binom={'E3':.0049}
thr=0.05/5
print("threshold=%.2f"%thr)
for k,v in reported.items(): print(k,"reported",v,"PASS" if v<thr else "FAIL")
print("E3 recomputed chi",chi['E3'],"PASS" if chi['E3']<thr else "FAIL")
print("E3 recomputed binom",binom['E3'],"PASS" if binom['E3']<thr else "FAIL")
$ python3 -I bonf.py
threshold=0.01
E1 reported 0.001 PASS
E2 reported 0.014 FAIL
E3 reported 0.037 FAIL
E4 reported 0.014 FAIL
E5 reported 0.732 FAIL
E3 recomputed chi 0.0036 PASS
E3 recomputed binom 0.0049 PASS
```

   The E3 conclusion therefore depends on which p-value is believed. Recomputed from the counts it survives correction. As printed in the paper it does not.
4. **Sample.** 68 of 300 invited, one company, Java compilers only. Section 6 says the messages "are not necessarily representative in terms of either difficulty or type of error message" and that the authors chose them, so "we may have also unintentionally introduced a bias".
5. **Preference, not performance.** No participant fixed anything. A message people like is not shown to be one they fix faster.
6. **Domain.** Compiler diagnostics read by developers at a keyboard. The ruleset applies to CLI errors, toasts and web UI text read by a wider audience. Section 6 also notes that IDE quick fixes sit outside the message, so compiler error text "is likely to significantly underrepresent claim-resolution layouts". The 191 of 210 claim-only count describes a sample of confusing messages that prompted a question, not the general rate.

## What the paper adds that the ruleset does not yet say

- **Grounds win when there is no fix** (E1 97%, E2 71%). A message that says why it is a problem beats one that only says that it is. UX-TEXT-01 requires "what failed" and the input, and UX-TEXT-03 requires a checked cause. Neither asks for a stated reason when no next step exists.
- **A fix is the right shape only when the fix is obvious.** Design principle II: "A claim-resolution structure is appropriate when the resolution is obvious." For E4, where the fix depends on what the developer meant, "a simple argument structure would perhaps be more appropriate". This is the same boundary UX-TEXT-02 draws with its "when no action exists, say so" clause, and it warns against inventing a single fix where several intents are possible (an UX-TEXT-04 risk: a wrong suggestion is worse than none).
- **Progressive elaboration** (principle I): a short message by default with a link or `--explain` for the full argument. The paper names Rust and Dotty `--explain` and Error Prone's link. This supports UX-TEXT-12 (explain entry with a code) and UX-TEXT-13 (detail behind a link) and needs no change to them.

## Effect on the ruleset

| Target | Effect | Detail |
|---|---|---|
| UX-TEXT-01 | confirm | No change. |
| UX-TEXT-02 | confirm | Severity and text stay. The paper corroborates but does not raise or lower it: one pair, 68% preference, confounded by length. The paper's own boundary (fix only when obvious) is already in the rule's last sentence. |
| UX-TEXT-03 | confirm | The paper supports "state a cause only when you can" indirectly: E4 shows a wrong or unwanted claim loses to content that matches the developer's intent. No text change. |
| UX-TEXT-04 | confirm | The "wrong suggestion is worse than none" rationale is the project's own measurement (`ocx install`). The paper adds only the E4 hint that a presumed intent can be wrong. |
| Topic file, Verdict 1 (not a rule) | text edit | Replace the last two sentences with the text below. Check A below. |
| Topic file, Key sources Barik line (not a rule) | text edit | Replace line with the text below. Check B below. |
| UX-TEXT-31 | NEW | CONSIDER. See below. |

Checks for the two text edits, run from the research directory after the edit (A and B are pass/fail; each prints the expected number):

```
A: grep -c 'abstract only\|full text was not read\|were not checked' ux-interface-text.md   # expect 0 after the edit (before it: 2 on lines 29 and 354)
A: grep -c 'pair E3' ux-interface-text.md                                                      # expect >= 1
B: grep -c 'barik_fse18.pdf' ux-interface-text.md                                              # expect >= 2 (Verdict 1 and Key sources)
B: grep -c 'full text not read' ux-interface-text.md                                           # expect 0
```

**Exact new text for Verdict 1, last two sentences** (replacing "One independent study points the same way ... not on this study."):

> One independent study points the same way, with caveats (full text read 2026-11-27): in a forced choice among 68 developers at one company, 46 (68%, 95% interval 55.8% to 77.6%, recomputed) preferred a short claim-plus-fix Java compiler message over a longer explanation with no fix ([Barik et al., ESEC/FSE, November 2018](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/10/barik_fse18.pdf), section 5.1, pair E3). It is one pair, confounded by message length, and measures preference, not fix success. The ranking rests on the fleet and exemplar measurement, not on this study.

**Exact new text for the Key sources Barik line:**

> https://www.microsoft.com/en-us/research/wp-content/uploads/2019/10/barik_fse18.pdf (Barik et al., ESEC/FSE, November 2018: full text read 2026-11-27; 68 developers, five Java compiler message pairs, one pair tests resolution)

**NEW rule, UX-TEXT-31 (CONSIDER).** When an error has no next step (UX-TEXT-02's "no action exists" case), the message states the ground in one clause that the code has checked: `<what failed> because <checked condition>`, or an equivalent with `must`, `cannot ... when` or `only`.
- Why: Barik et al. section 5.1, pairs E1 and E2: when neither message offered a fix, 97% (66 of 68) and 71% (48 of 68) preferred the message that gave grounds over a bare claim (Java compiler messages, one company, stated preference). The checked-condition limit comes from UX-TEXT-03, which forbids an invented cause. It is CONSIDER, not SHOULD, because two pairs in one domain, chosen by the authors, are thin.
- Verify: run `sh check31.sh <snapshot-dir>` over the UX-TEXT-05 snapshot corpus (one rendered diagnostic per `.txt` file). It exits 0 and prints `PASS <dir>` when every snapshot whose last non-blank line does not start with `help:` contains one of `because|must |cannot |can only|requires|is not allowed`. It exits 1 and prints one `FAIL <file>` line per offender otherwise. The pattern is a proxy for "states a ground"; whether the stated condition was actually checked (UX-TEXT-03) stays a reviewer judgement and is not part of the pass/fail. Tested 2026-11-27 on a three-file toy corpus (`a.txt` ends in `help:`, `b.txt` says `cannot`, `c.txt` is `error: bad thing`):

```
$ cat check31.sh
#!/bin/sh
# usage: check31.sh DIR   (DIR holds one rendered diagnostic per *.txt file)
# exit 0 = every snapshot without a final help: line states a ground; exit 1 = list of offenders
bad=0
for f in "$1"/*.txt; do
  last=$(grep -v '^[[:space:]]*$' "$f" | tail -n 1)
  case "$last" in help:*) continue;; esac
  grep -q -E 'because|must |cannot |can only|requires|is not allowed' "$f" || { echo "FAIL $f"; bad=1; }
done
[ $bad -eq 0 ] && echo "PASS $1"; exit $bad
$ sh check31.sh corpus; echo "exit=$?"
FAIL corpus/c.txt
exit=1
```

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Barik et al. published at ESEC/FSE 2018, 11 pages, DOI 10.1145/3236024.3236040 | the PDF, front matter | November 4-9, 2018 (fetched 2026-11-27) |
| 68 respondents of 300 invited, mean 6.3 years experience, 45 Java-proficient | PDF section 3.2 | 2018 |
| E3: 46 of 68 (68%) preferred the claim-plus-resolution message | PDF Table 3 | 2018 |
| Paper's E3 p is .037; recomputed chi-squared 0.0036, exact binomial 0.0049; Bonferroni 0.01 passed only by the recomputed values | `stats.py` and `bonf.py` output above | computed 2026-11-27 |
| PDF sha256 0ecfc9b0...f176, 724581 bytes, HTTP 200 | `curl` and `sha256sum` output above | fetched 2026-11-27 |
| 210 Stack Overflow pairs; claim-only 191 of 210 compiler messages, 0 of 210 accepted answers | PDF Figure 3 | 2018 |
| Authors: Titus Barik (Microsoft), Denae Ford, Emerson Murphy-Hill, Chris Parnin (NC State). The paper is academic work with NSF funding (grants 1559593 and 1714538), not a vendor claim, but one author's employer provided the participants | PDF front matter and acknowledgments | 2018 |

## What could not be determined

- Why the reported p-values differ from the recomputed ones. The paper does not name the test variant (continuity correction, one-sided, or a different statistic). Missing: the authors' analysis script or data. The raw responses are not published in the paper, and I did not search for a replication package beyond the publication page.
- Whether anyone has replicated the E3 result or tested a clean resolution-added-only pair. I did not run a literature search for follow-up studies, so "no replication" is not established, only "none found in this paper's text".
- Whether the finding transfers from Java compiler messages read by developers to CLI errors and GUI toasts. That needs a study with the product's own messages. Missing: a participant pool and a task measure, neither available here.
- Page numbers for quotes. The local extract loses them.
