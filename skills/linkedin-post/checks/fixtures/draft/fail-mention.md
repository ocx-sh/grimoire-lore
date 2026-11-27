platform: linkedin
account: https://www.linkedin.com/in/example-person
action: draft
labels: ai_line=false brand_partnership=false
ai_role: heavy
sponsored: false
spend: none
open_asks: none
approved_by:
approved_at:
author: Ada Example
goal: repo-traffic
metric: github-referrers
format: text
visual: none
human_rewrite: yes
value_exchanged: false
reviewed_by: Ada Example
connection: maintainer of mytool
first_hand: Cold install of 40 packages: 38 s before, 9 s now.
source: 38 s, 9 s, 40 packages, 10 runs: hyperfine --runs 10 'mytool install --all'
consented: Grace Hopper
source: 0.9: git tag v0.9.0 in the mytool repository
---
I maintain mytool. Version 0.9 installs faster.
Cold install of 40 packages: 38 s before, 9 s now.
The cause was the cache key.

The timing is hyperfine over 10 runs. I found the cause by reading the lockfile diff of two runs. The timestamp changed on every run, so nothing hit the cache.

Repository: https://example.com/mytool

Thanks @alice for the review.
