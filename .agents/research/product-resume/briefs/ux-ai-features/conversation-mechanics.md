# Commission: ux-ai-features / conversation-mechanics

Topic question: What must a human-facing LLM interface disclose, show and refuse to render, and which of those duties are now law?

Investigate the interaction mechanics of chat and agent UIs, including how streamed output reaches assistive technology.
Primary sources to fetch:
- AI SDK chatbot and tool-usage docs, for part states (https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage);
- Shape of AI (https://www.shapeof.ai/);
- the Microsoft guidelines for human-AI interaction (https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/);
- PAIR errors and failing (https://pair.withgoogle.com/chapter/errors-failing/);
- the OpenAI Apps SDK UI guidelines (https://developers.openai.com/apps-sdk/concepts/ui-guidelines);
- WCAG 2.2 Understanding for 4.1.3, and the Guidepup virtual screen reader docs (https://github.com/guidepup/virtual-screen-reader).
Measure, do not cite:
- build a minimal streaming chat page under the cache directory with three live-region strategies: per token, per sentence, on completion;
- for each, record the virtual screen reader's spoken-phrase log (with the tool version), the number of announcements per 500 streamed tokens, and content that is never announced;
- if the tool does not log live-region output, measure DOM mutation counts per region instead and label every spoken-output claim UNVERIFIED.
Start from M167 to M173 and scout rows AI2, AI11, AI27 to AI29, AI31, AI32 and PR47.
The deliverable must decide:
- the tool-call render-state list;
- the stop and regenerate rule;
- the streaming announcement rule;
- the failure and hand-back rule;
- the memory controls rule and the capability-hint rule for empty chats.
Out of scope: discrete status announcements (UX-A11Y announcements-and-motion).
