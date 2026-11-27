# Fixture registry for the draft checks

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| LI-F01 | linkedin | post text limit | 3,000 characters | https://www.linkedin.com/help/linkedin/answer/a528176 | none | 2026-11-27 | 180 | platform | 3,?000 characters |
| YT-F03 | youtube | trigger: a real person shown saying or doing something they did not | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | real person appear to say |
| YT-F07 | youtube | exemption: AI help with a script | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | outline, script |
