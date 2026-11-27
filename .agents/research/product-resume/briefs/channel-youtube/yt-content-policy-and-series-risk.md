# Commission: channel-youtube / yt-content-policy-and-series-risk

Topic question: What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

Investigate the YouTube policies an agent-assisted channel can break:
- malicious clickbait and misleading metadata;
- thumbnail policy strikes and their window (the scout claims 90 days);
- inauthentic (templated or mass-produced) content, which the live "OCX Shorts NN" series design may approach (the scout dates a policy rename to 2025-07-15);
- Content ID claims from background music or third-party footage in screen recordings and live coding.
Start from YS#14, YS#15, YS#28, YP#8, YP#9, YP#29, VP#28, AE#34, AE#35. Read product-audit/distribution-posture.md section 4 for the two live Shorts titles and descriptions.
Fetch and cite with dates: YouTube Help 2801973 (spam and deceptive practices), 9229980 (thumbnail policy), 1311392 (YPP policies and inauthentic content), 3376882 (Audio Library) and the Content ID help pages; the YouTube Audio Library terms.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: three templated developer series in the audit corpus that remain in good standing.
Measure, do not cite:
- compare the fleet's two Shorts titles and descriptions against the policy examples;
- measure text similarity across a templated series in the audit corpus (python3 -I with difflib SequenceMatcher ratio) to show what "templated" looks like;
- record every command.
Decide:
- the policy checks a draft title, thumbnail and description must pass;
- the minimum per-episode variation rule for a numbered series;
- the music-source rule for demos.
