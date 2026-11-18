# Word Wizard · Learn English

English-words learning page for 5th–6th grade pupils (home language: Hebrew), built on Chrome's built-in AI. README.md lists every feature, the AI APIs used with their fallbacks, the export format and the file layout — read it first.

## Run

```bash
./serve.py        # http://localhost:8787
```

Vanilla HTML + CSS + ES modules, no build step. Needs a server (secure context for the AI APIs, modules don't load from file://). The server is threaded on purpose: the single-threaded one dropped module requests.

## Decisions already made (don't undo without asking)

- Every word card uses the same 27px font. Per-word shrinking and "size from the longest word" were both rejected. Long words fit because the ✏️ ✕ buttons float over the card corner.
- The AI Powers panel is folded by default (icon rail); it stays open only after the pupil opens it.
- No "say it like" / syllable guide — removed. The Say button speaks the word normal, then slow.
- The example sentence 🔊 always says English first, then the Hebrew translation (regardless of the Hebrew-voice switch). The memory-pair 🔊 adds Hebrew only when the switch is on.
- The pupil's profile (name, boy / girl, school / city / class in Hebrew, badge) lives in `store.prefs.profile`. Gender is used only for the gendered Hebrew lines in js/profile.js (ברוך הבא / ברוכה הבאה); the rest of the app's Hebrew stays plural.
- Memory pair = the easiest everyday phrase with the word ("return" → "return home"), shown with its translation.
- All English shown or spoken must suit 5th–6th graders. Hebrew text is natural and gender-neutral (plural). Every component and important button has a kid-friendly tooltip. The look is "WOW": dark glass, gradients, animation, confetti.

## Conventions

- Spoken Hebrew goes through `utter()` in js/ai.js, which adds niqqud from js/niqqud.js (spoken only, never shown). When a voice misreads a word, add it there.
- The My Blog page (blog.html, js/blog/) writes its Hebrew the same pointed way and shares the ניקוד switch (js/niqqud-view.js). Its AI calls go through `ask()`, so they show in its Engine Room drawer; every Buddy feature has a rules-only fallback.
- The Present Simple page (grammar.html, js/grammar/) has no AI calls; its content is in js/grammar/data.js. All its Hebrew is written with full niqqud on top of the full spelling (פּוֹעַל, not פֹּעַל), so removing the marks gives normal spelling: the ניקוד switch shows it with or without marks, and Buddy always reads the pointed text. New Hebrew there must be written the same way. The Practice tab holds the class worksheets “Present simple.pdf” and “Verb To Be.pdf” (`SHEET`, `BE_SHEET`); keep them as written, typos included.

- Every AI call goes through `engine.start()` so it appears in the AI Engine Room with its steps.
- Spoken output: `talk(en, he)` for fixed phrases (Hebrew may mark English words as `[[word]]`), `talkDynamic(text)` for AI text, `speakParts()` for mixed English/Hebrew.
- Tools are defined once in js/tools.js and shared by Buddy's JSON plan, native Prompt API tools and WebMCP.
- Built-in pairs and example sentences (~250 words) live in js/pairs.js; new or imported words get them automatically.
- Export format: schema/word-list.v1.schema.json. Add new word fields as optional and keep old files importable.
- All availability checks have timeouts: in some builds `Translator.availability()` never resolves.

## Not verified yet

The test browser had no Gemini Nano and no working Translator, so these paths were never seen working: Nano meanings/pairs/examples, Nano badge design (only the magic-dice fallback was seen), the blog page's Nano check / sentence watch / ideas (only the rule fallbacks were seen), quiz sentence grading, native tool calling, WebMCP, real translations (word, pair, example). Check them in Chrome with the AI flags on (list in README).
