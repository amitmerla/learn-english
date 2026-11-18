# Word Wizard · Learn English 🪄

A single-page app (HTML + CSS + vanilla JS, no build) that helps 5th–6th graders learn English words with the AI built into the browser.

**Live:** [Word Wizard](https://amitmerla.github.io/learn-english/) · [Present Simple](https://amitmerla.github.io/learn-english/grammar.html) · [My Blog](https://amitmerla.github.io/learn-english/blog.html) (GitHub Pages, updated on every push to `main`). Progress is saved in the browser, so it doesn't carry over between the live site and localhost.

## Run

```bash
./serve.py        # http://localhost:8787
```

A local server is needed: the built-in AI APIs need a secure context (localhost counts), and ES modules don't load from `file://`.

## What's inside

| Panel | What it does |
|---|---|
| **🪄 Magic badge** | On the first visit the pupil writes their name and picks boy / girl, then their school, city and class in Hebrew (English letters are refused with a gentle Hebrew hint). Gemini Nano designs a badge for the name (picture, colors, shape, a hero title like “Brave Dragon”, and a motto) as JSON, and the app draws it as an animated SVG with confetti, with a ribbon showing the school and class and the city under the name. “Make another” designs a new one (earlier ones stay as thumbnails to go back to); “I love it!” puts it in the header. Tap the header badge to see it again, make a new one, or change the details. Profiles saved without school / city / class are asked for them on the next visit. Without Nano, “magic dice” design it. Saved in the prefs (`profile`). |
| **📘 Present Simple** (`grammar.html`, 📘 button in the header) | A second page with four tabs. **Rules**: an intro card plus 9 rule cards in Hebrew (rule 9: special words: be, can / must / should, everyone + s, says / does) (formula, two examples with translation, a memory tip, 🔊 per example), “🔊 הסבירו לי” per rule, and **🎙️ Talk it through**: Buddy explains every rule in Hebrew with the English said in English, then asks a question you answer by tapping or by voice. **Recap**: one line per rule; fill the blank and pick the rule number. **Practice**: two class worksheets with a switch: *Present simple* (sort 13 verbs into s / es / ies by drag or tap, then complete 8 sentences) and *Verb To Be* (am / is / are, negative sentences, questions, WH words; each part checked on its own), then endless generated questions on chosen rules. **Quiz**: 10 questions (pick, type, put words in order, find the mistake), stars, best score, rules to review. A **ניקוד** switch in the header shows the Hebrew with or without niqqud (on by default); Buddy always reads the pointed text. Progress is saved in `localStorage` (`wordwizard.grammar.v1`). |
| **✍️ My Blog** (`blog.html`, ✍️ button in the header) | Write a short blog about yourself, in three steps. **Plan**: Ali's model blog from the class book (Workbook, Writing, page 32) as a web page, with 🔊, a 🔠 capital-letters highlight and a 🧱 paragraph view; 8 writing tips in Hebrew (the book's capital letters, plus full stops, four paragraphs, Present Simple, how often, joining words, staying safe online, ending with a question); and four idea boxes (About me, My family, After school, Goodbye) with questions. **Write**: an editor that marks mistakes under the words as you type (capital letters, I, days and months, full stops, ? on questions, he/she + s, no s after I/we/they, private details, Hebrew), each with a one-tap fix; a tracker that lights up the four parts; sentence starters; and Buddy: ✨ check my blog (Nano finds up to 5 mistakes with fixes, praise and a next idea), 👀 reads each finished sentence, 💡 I'm stuck, and 🌍 Hebrew → English. Without Nano, Buddy uses the same rules. **Publish**: your blog as a web page in Ali's style (your magic badge as the picture), an 8-point checklist with stars, 🔊 and 🖨️. Saved in `localStorage` (`wordwizard.blog.v1`); AI runs show in a small Engine Room drawer. |
| **AI Powers** | Live status of every built-in AI feature, with a power meter, download buttons and progress. |
| **My Words** | Add words by typing (commas, lines, or another language → auto-translated to English), upload / drop / paste a photo, or upload / drop a **Word file** (.docx, .doc, .rtf): the words are read in the browser, shown in a “choose your words” window (worksheet labels like *name* / *date* start unchosen, words you already have are greyed out), and Hebrew written next to a word, in the next table cell, or on the line under it becomes its translation. Each card: Say (normal + slow), Translate, Meaning, Try it (speech check), Got it ⭐. |
| **Photo reader** | Progress bar, live log, found / recognized / not sure / skipped counters. Unclear words are shown as cropped pictures with "What is this word?". |
| **Fix a word** | After a photo scan, every recognized word is a chip: tap it to fix the spelling (shows the cropped photo of that word), ✕ to remove it. On any card: ✏️ or double-click the word. |
| **🏆 Word Challenge** | Quiz on the ⭐ words. Round 1 Meaning (Nano meanings → translations → "which word did you hear"), Round 2 Writing (hear it, spell it, letter-by-letter feedback, 2 tries), Round 3 Sentence (Nano grades a sentence, only with Nano). Pass meaning + spelling → 🏆 mastered; miss one → star removed for more practice. Offered automatically every 3 stars. |
| **🗣️ Hebrew voice** | Header switch, shown when Hebrew is the translation language. Buddy, the tour, quiz feedback and photo-reader messages are spoken (and the tour is shown) in Hebrew with a Hebrew voice; English words are said with the English voice. Fixed phrases are hand-written Hebrew; Buddy's AI answers are translated piece by piece, keeping **bold** words in English. Disabled with a tip when the computer has no Hebrew voice. |
| **📤 Export / 📥 Import** | Save the whole list (stars, trophies, translations, meanings, memory pairs, example sentences) to `word-wizard-words-YYYY-MM-DD.json`, and load it in another session or computer: 📥 button or drop the file on My Words. The import dialog shows what's in the file; choose **Add new words** (keeps your progress, fills missing translations) or **Replace my list**. Bad items are skipped with a reason. |
| **🔗 Memory pair** | Each word gets an easy everyday phrase to remember it by ("return" → "return home") with its translation, shown as a "Remember it" chip with 🔊 (with the Hebrew voice on, the Hebrew translation is said after it). New words get one from a built-in list of ~250 common words; 💡 Meaning asks Gemini Nano for the best pair; 🌐 Translate also translates the pair. The quiz's writing round shows it with the word blanked out ("_ _ _ _ _ _ home"). Exported as `pair` / `pairTranslations`. |
| **🔀 Words with several meanings** | 🌐 Translate finds every common meaning of a word ("light" = אור / קל, "watch" = לצפות / שעון יד). The card shows them all, each with an emoji hint, and asks *Which one is in your lesson?*. Tapping one keeps it, and the memory pair and example switch to fit that meaning; the 🔀 button shows all of them again. Until one is picked, the quiz shows both ("אור / קל"). Built-in list of ~57 school words (js/senses.js): instant, no AI. Other words show the Translator's translation at once; Gemini Nano then looks for more meanings in the background (🔎 on the card) and adds them if it finds any. Hebrew from a Word file picks the matching meaning by itself. Exported as optional `senses` / `sense`. |
| **💬 Example sentence** | Every card shows a simple sentence with the word highlighted, a 🔊 button (with the Hebrew voice on, the Hebrew translation is said after it), and **🌍 בעברית** to explain the sentence in the home language (Translator, or Gemini Nano). Built-in sentences cover the same ~250 words as the memory pairs; 💡 Meaning or **✨ Make an example** asks Nano for one for any other word. Exported as `example` / `exampleTranslations`. |
| **Buddy** | Chat with idea bubbles, typing or voice. Spelling quiz works with or without AI. |
| **AI Engine Room** | Every AI call: prompt, live steps, tool calls, streamed answer, token usage, timing. |
| **Tour** | Spotlight tour, read out loud with word-by-word highlighting. Pause, back, next, mute, jump with dots, keyboard ←/→/Space/Esc. |
| **Tooltips** | Every panel and important button has a kid-friendly tip. |

## Built-in AI used (with fallbacks)

| Feature | API | Fallback |
|---|---|---|
| Chat brain | Prompt API `LanguageModel` (Gemini Nano), streaming | Simple rules (basic mode) |
| Tool calling | JSON plan via `responseConstraint`; optional **native** `tools` (switch on the Tool Calling card) | Rules call the same tools |
| WebMCP | `navigator.modelContext` (`provideContext` / `registerTool`), 8 `wordwizard_*` tools | — |
| Word files | Read in the browser, no library: .docx unzipped with `DecompressionStream`, old .doc read from its compound-file piece table, RTF / HTML saved as .doc too (js/docfile.js) | — |
| Photo reading | `TextDetector` → Prompt API image input → Tesseract.js (CDN, loaded only when needed) | next reader in the list |
| Misread check | Prompt API with JSON schema double-checks OCR words | confidence only |
| Translation | `Translator` API | Prompt API |
| Typed in another language | `LanguageDetector` + `Translator` → English | Prompt API |
| Voice | `speechSynthesis` (tour, words, Buddy). Spoken Hebrew gets niqqud on words a voice may misread (js/niqqud.js); the screen stays plain. | — |
| Listening | `SpeechRecognition` (chat mic, Try it) | — |

Chrome flags that help: `#prompt-api-for-gemini-nano`, `#prompt-api-for-gemini-nano-multimodal-input`, `#translation-api`, `#language-detection-api`, `#enable-experimental-web-platform-features` (TextDetector), `#enable-webmcp-testing`.

## Word list file format

Defined by [`schema/word-list.v1.schema.json`](schema/word-list.v1.schema.json) (JSON Schema 2020-12).

```json
{
  "format": "word-wizard.word-list",
  "version": 1,
  "exportedAt": "2026-10-19T11:54:10.883Z",
  "app": "Word Wizard 1.0",
  "homeLanguage": "he",
  "stats": { "total": 2, "learned": 1, "mastered": 1 },
  "words": [
    { "text": "ocean", "learned": false, "mastered": false, "source": "image",
      "addedAt": "2026-10-19T05:25:45.697Z", "translations": { "he": "אוקיינוס" },
      "meaning": "🌊 a very big sea",
      "pair": "blue ocean", "pairTranslations": { "he": "אוקיינוס כחול" } },
    { "text": "castle", "learned": true, "mastered": true, "source": "typed" }
  ]
}
```

Only `format`, `version` and each word's `text` are required. Import also accepts a plain array like `["apple", "brave"]`. Files with a higher `version` are refused with a clear message.

## Files

```
index.html
css/app.css
js/app.js        bootstrap
js/ai.js         feature detection, Prompt API, Translator, detector, speech
js/tools.js      shared tool definitions, native tools, WebMCP
js/features.js   AI Powers panel
js/words.js      word board + card actions
js/ocr.js        photo reader
js/docfile.js    words from Word files (.docx / .doc / .rtf)
js/niqqud-view.js  the ניקוד switch (shared by grammar.html and blog.html)
blog.html        My Blog page
css/blog.css
js/blog/data.js     model blog, tips, the four-part plan, check messages
js/blog/checks.js   live writing checks + stats
js/blog/buddy.js    Buddy's help (Nano with rule fallbacks)
js/blog/main.js     steps, model, editor, publish
js/quiz.js       Word Challenge quiz
js/voice.js      Hebrew voice: talk() / talkDynamic()
js/transfer.js   export / import of the word list (JSON)
js/profile.js    pupil name, boy / girl, AI magic badge
js/pairs.js      built-in memory pairs
js/senses.js     words with several meanings (built-in list + Nano)
js/chat.js       Buddy chat (Nano JSON tools / native tools / rules)
js/engine.js     AI Engine Room
js/tour.js       guided tour
js/tooltip.js    tooltips
js/store.js      word list (localStorage)
js/util.js       DOM helpers, toasts, confetti
js/niqqud.js     niqqud for spoken Hebrew
grammar.html     Present Simple page
css/grammar.css
js/grammar/data.js      rules, recap lines, worksheet, word bank (Hebrew with [[English]] marks)
js/grammar/gen.js       verb forms, question generator, question card, say()
js/grammar/main.js      tabs, rule cards, Buddy's talk-through
js/grammar/recap.js     quick recap
js/grammar/practice.js  worksheet switch, Present simple worksheet, more practice
js/grammar/besheet.js   Verb To Be worksheet
js/grammar/quiz.js      quiz
js/grammar/progress.js  saved progress
```
