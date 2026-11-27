# Commission: ux-interface-text / strings-that-survive

Topic question: What must runtime interface text contain, and which words and string constructions must an agent never ship?

Investigate how strings must be built so they stay correct when read alone, pluralised, formatted or later translated.
Primary sources to fetch:
- WCAG 2.2 Understanding for 2.5.3 Label in Name (https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html);
- CLDR plural rules (https://cldr.unicode.org/index/cldr-spec/plural-rules);
- MDN `Intl.PluralRules`, `DateTimeFormat`, `RelativeTimeFormat` and `ListFormat`;
- ICU MessageFormat (https://unicode-org.github.io/icu/userguide/format_parse/messages/);
- MessageFormat 2 (https://messageformat.unicode.org/).
Measure, do not cite, statically only (no live-region runs; announcements-and-motion owns those):
- grep the theme, the extension and both CLIs for string concatenation around counts, hand-written plurals (`s` suffixes, `(s)`), hand-formatted dates, sizes and durations, and `aria-label` values that do not start with the visible text;
- list every status-message string and record whether it names its subject and outcome without visual context;
- report counts with commands.
Start from M100 to M105 and scout rows CD9, CD14, CD20 to CD24 and CD39.
The deliverable must decide:
- the whole-string rule and the plural rule;
- which formatter serves each value type in TypeScript and in Rust (name the crates, from their docs);
- the label-in-name rule;
- the self-sufficient status-string rule;
- a Detect line for each.
Out of scope: full localisation workflow (deferred) and live-region mechanics (UX-A11Y).
