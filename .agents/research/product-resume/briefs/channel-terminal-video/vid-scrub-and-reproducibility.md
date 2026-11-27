# Commission: channel-terminal-video / vid-scrub-and-reproducibility

Topic question: Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

Investigate how a recording leaks secrets, and how to stop it. Leak paths: tokens, hostnames, home paths and usernames in the cast JSON; environment output and shell prompts; registry credentials.
Also cover how a recording stays reproducible: a pinned environment, a scripted session, a fixed prompt, fixed time and seeds.
Start from VP#2, VP#5, VP#6, VP#30. Read the fleet's cast_recorder.py and cast files as described in marketing-topic-map/channel-video-production-software.md (read only).
Fetch and cite with dates: the asciinema CLI docs (environment capture, idle limits); the VHS docs (Env, Hide and Show commands); the gitleaks and trufflehog docs on custom rules and file types; the GitHub secret-scanning docs (supported file types and push protection).
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: two upstream projects that generate demos in CI, found among the 16 READMEs with demos.
Measure, do not cite:
- copy the fleet cast directories to ~/.cache/research-lang/exemplars/product/ and run gitleaks detect --no-git --source <copy>;
- grep the copy for /home/, /Users/, hostnames and email patterns;
- report counts, never the values;
- record every command.
Decide:
- the scrub gate a recording must pass before commit or upload;
- the reproducibility requirements (scripted source committed, environment pinned);
- whether the gate belongs in the channel-publishing rule or the terminal-demo skill.
