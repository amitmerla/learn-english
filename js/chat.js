// (c) Buddy chat: suggestions + typing + voice. Three brains, best first:
//   - Gemini Nano with native tool calling (experimental switch),
//   - Gemini Nano with a JSON tool plan (responseConstraint),
//   - simple built-in rules when there is no on-device model.

import { $, el, esc, toast, confetti } from './util.js';
import { store } from './store.js';
import { engine } from './engine.js';
import { SYSTEM, lmReady, getChatSession, resetChatSession, streamPrompt, nativeTools, listen, speak, translate, state, bus } from './ai.js';
import { PLAN_SCHEMA, NATIVE_TOOLS, callTool, toolCatalog, setNativeRun, hooks } from './tools.js';
import { addFromText } from './words.js';
import { talk, talkDynamic } from './voice.js';

const log = $('#chat-log');
const input = $('#chat-input');
const sugg = $('#suggestions');
let quiz = null;      // { word, tries } while a spelling quiz is running
let busy = false;

const AGENT_SYSTEM = `${SYSTEM}

You help the child learn the words on their word list. You can use these tools:
${toolCatalog()}

Always answer with JSON: {"tool": <tool name or "none">, "args": {...}, "reply": <what you say to the child>}.
- Use a tool when the child asks you to do something (add, remove, translate, say, show, star a word, or start the tour).
- After a tool runs you get a message that starts with TOOL RESULT. Then answer the child with tool "none".
- Only use "none" when you just want to talk.`;

const NATIVE_SYSTEM = `${SYSTEM}

You help the child learn the words on their word list. You have tools to add, remove, list, translate, speak, show and star words, and to start the page tour. Use them when the child asks you to do something.`;

/* ---------------------------------------------------------------- messages */

function msg(who, text = '') {
    const bubble = el('div', { class: 'bubble' });
    const wrap = el('div', {}, bubble);
    const node = el('div', { class: `msg ${who}` }, el('div', { class: 'av', text: who === 'me' ? '🧒' : '🦊' }), wrap);
    if (text) setText(bubble, text);
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return { node, bubble, wrap };
}

// **bold** only, everything else escaped.
function setText(bubble, text) {
    bubble.innerHTML = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function typing(bubble) {
    bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
}

function addSpeakButton(m, text) {
    m.wrap.append(el('div', { class: 'msg-actions' },
        el('button', { 'data-tip': 'Read this message out loud.', text: '🔊', onclick: () => talkDynamic(text) })));
}

function buddySays(text, { voice = false } = {}) {
    const m = msg('bot', text);
    addSpeakButton(m, text);
    if (voice) talkDynamic(text);
    return m;
}

function toolChips(m, calls) {
    if (!calls.length) return;
    m.bubble.append(el('div', {}, ...calls.map(c => el('span', { class: 'tool-chip', text: `🛠 ${c}` }))));
}

/* ---------------------------------------------------------------- suggestions */

function renderSuggestions() {
    const words = store.words;
    const pick = () => words[Math.floor(Math.random() * words.length)]?.text;
    const w = pick();
    const list = quiz
        ? [['💡 Give me a hint', 'hint'], ['🔊 Say it again', 'say it again'], ['🏳️ I give up', 'I give up'], ['⏹ Stop quiz', 'stop quiz']]
        : [
            words.some(x => x.learned) && ['🏆 Word Challenge (meaning + writing)', 'Start the Word Challenge'],
            words.length && ['🎯 Spelling quiz', 'Quiz me!'],
            w && [`💡 What does “${w}” mean?`, `What does "${w}" mean?`],
            w && [`🌐 Translate “${w}”`, `Translate ${w}`],
            words.length > 1 && ['✍️ Make a story with my words', 'Make a short story with my words'],
            w && [`🔊 How do I say “${w}”?`, `How do I say ${w}?`],
            ['➕ Add the word “dragon”', 'Add the word dragon'],
            words.length && ['📋 What words do I have?', 'What words do I have?'],
            ['🧭 Show me around', 'Start the tour'],
        ].filter(Boolean);
    sugg.replaceChildren(...list.map(([label, text], i) =>
        el('button', { class: 'sugg', style: { animationDelay: `${i * 40}ms` }, text: label, onclick: () => send(text) })));
}

/* ---------------------------------------------------------------- spelling quiz (works with or without AI) */

function startQuiz() {
    const pool = store.words.filter(w => !w.learned);
    const list = pool.length ? pool : store.words;
    if (!list.length) return buddySays('Add some words first, then I can quiz you! 📚');
    const w = list[Math.floor(Math.random() * list.length)];
    quiz = { word: w.text, tries: 0 };
    buddySays('🎯 **Spelling quiz!** Listen carefully and type the word you hear.');
    setTimeout(() => speak(w.text, { rate: .75 }), 400);
    renderSuggestions();
}

function quizAnswer(text) {
    const t = text.trim().toLowerCase();
    const w = quiz.word;
    if (/stop quiz|^stop$/.test(t)) { quiz = null; renderSuggestions(); return buddySays('Quiz stopped. You can start again any time! 👍'); }
    if (/say it again|again|repeat/.test(t)) { speak(w, { rate: .7 }); return buddySays('Here it is again 🔊'); }
    if (/hint/.test(t)) return buddySays(`Hint: it starts with **${w[0].toUpperCase()}** and has **${w.length}** letters: ${w[0]}${' _'.repeat(w.length - 1)}`);
    if (/give up/.test(t)) {
        quiz = null; renderSuggestions();
        speak(w);
        return buddySays(`The word was **${w}**. You'll get it next time! 💪`);
    }
    if (t === w) {
        quiz = null;
        confetti(innerWidth - 220, innerHeight / 3, 120);
        talk('Correct! Well done!', 'נכון! כל הכבוד!');
        store.update(w, { learned: true });
        buddySays(`✅ Correct! **${w}** is right! I gave it a gold star ⭐`);
        renderSuggestions();
        return;
    }
    quiz.tries += 1;
    speak(w, { rate: .6 });
    buddySays(quiz.tries >= 2
        ? `Almost! Hint: it starts with **${w.slice(0, 2)}**… Try again 🙂`
        : 'Not quite. Listen again and try one more time 🔁');
}

/* ---------------------------------------------------------------- brains */

function wordsContext() {
    const list = store.words.map(w => w.learned ? `${w.text}⭐` : w.text).join(', ') || '(empty)';
    return `[Word list: ${list}] [Home language: ${store.lang}]`;
}

async function nanoPlan(text, run, m) {
    const session = await getChatSession({ system: AGENT_SYSTEM });
    const calls = [];
    let input = `${wordsContext()}\nChild: ${text}`;
    for (let turn = 0; turn < 4; turn++) {
        const s = run.step('💭', turn ? 'Reading the tool result and planning the next step' : 'Planning: talk, or use a tool?');
        const raw = await streamPrompt(session, input, { responseConstraint: PLAN_SCHEMA }, t => {
            run.stream(t);
            const partial = t.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
            if (partial) try { setText(m.bubble, JSON.parse(`"${partial[1].replace(/\\$/, '')}"`)); } catch { /* half an escape */ }
        });
        const plan = JSON.parse(raw);
        s.done(plan.tool === 'none' ? 'reply' : `→ ${plan.tool}`);
        run.setUsage(session);
        if (plan.tool === 'none' || !plan.tool) return { reply: plan.reply, calls };
        calls.push(plan.tool);
        const result = await callTool(plan.tool, plan.args, run);
        input = `TOOL RESULT for ${plan.tool}: ${JSON.stringify(result)}\nNow tell the child what happened, with tool "none".`;
    }
    return { reply: 'Done! ✅', calls };
}

async function nanoNative(text, run, m) {
    const session = await getChatSession({ system: NATIVE_SYSTEM, native: NATIVE_TOOLS });
    setNativeRun(run);
    const s = run.step('💭', 'Thinking (Gemini Nano may call tools by itself)');
    const before = run.steps.querySelectorAll('.tool').length;
    const reply = await streamPrompt(session, `${wordsContext()}\nChild: ${text}`, undefined, t => { run.stream(t); setText(m.bubble, t); });
    s.done();
    run.setUsage(session);
    setNativeRun(null);
    const calls = [...run.steps.querySelectorAll('.tool code')].slice(before).map(c => c.textContent);
    return { reply, calls };
}

// No on-device model: understand a few simple kinds of requests.
async function rules(text, run) {
    const t = text.trim();
    const lower = t.toLowerCase();
    const s = run.step('📏', 'No AI brain here, so I use simple rules');
    const q = s => s.replace(/["“”'?.!]/g, '').trim();
    let m;
    const calls = [];
    const use = async (name, args) => { calls.push(name); return callTool(name, args, run); };
    let reply;

    if ((m = lower.match(/^(?:please )?add(?: the)?(?: words?)? (.+)/))) {
        const r = await addFromText(q(m[1]), 'buddy');
        reply = r.added.length ? `Added **${r.added.join(', ')}** to your list! 🎉` : 'Those words are already on your list 👀';
    } else if ((m = lower.match(/(?:remove|delete)(?: the)?(?: word)? (.+)/))) {
        const r = await use('remove_word', { word: q(m[1]) });
        reply = r.removed ? `Removed **${q(m[1])}** 🗑️` : `I can't find **${q(m[1])}** on your list.`;
    } else if ((m = lower.match(/translate (.+)/))) {
        const word = q(m[1]).replace(/^my words$/, '');
        if (!word) {
            const out = [];
            for (const w of store.words.slice(0, 12)) out.push(`${w.text} → ${(await use('translate_word', { word: w.text })).translation ?? '?'}`);
            reply = out.join('\n') || 'Your list is empty.';
        } else {
            const r = await use('translate_word', { word });
            reply = r.translation ? `**${word}** → ${r.translation}` : `Sorry, I could not translate **${word}** here.`;
        }
    } else if ((m = lower.match(/(?:how do i say|say|pronounce)(?: the word)? (.+)/))) {
        const word = q(m[1]);
        await use('speak', { text: word });
        reply = `Listen: **${word}** 🔊 Now you try!`;
    } else if (/what words|my words|list/.test(lower)) {
        const r = await use('list_words', {});
        reply = r.words.length ? `You have ${r.words.length} words:\n${r.words.map(w => (w.learned ? '⭐ ' : '• ') + w.word).join('\n')}` : 'Your list is empty. Add some words! ✏️';
    } else if (/tour|show me around|help/.test(lower)) {
        await use('start_tour', {});
        reply = "Let's take the tour! 🧭";
    } else if ((m = lower.match(/what does (.+?) mean/))) {
        const word = q(m[1]);
        const tr = await translate(word, store.lang, { quiet: true }).catch(() => null);
        reply = tr ? `I need the Gemini Nano brain to explain meanings, but here is the translation: **${word}** → ${tr}` : 'I need the Gemini Nano AI brain to explain meanings. Check the AI Powers panel!';
    } else if (/story/.test(lower)) {
        reply = 'Stories need the Gemini Nano AI brain 🧠. Try a spelling quiz instead!';
    } else {
        reply = "I'm in basic mode, so I understand things like: “add apple”, “translate brave”, “say jungle”, “quiz me”, or “what words do I have?” 🙂";
    }
    s.done();
    return { reply, calls };
}

/* ---------------------------------------------------------------- send */

export async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    input.value = '';
    msg('me', text);

    if (quiz) { quizAnswer(text); return; }
    if (/word challenge|big quiz/i.test(text)) {
        buddySays('🏆 Here comes the **Word Challenge**! Good luck!');
        hooks.startQuiz();
        return;
    }
    if (/^(quiz me|spelling quiz|test me)/i.test(text)) { startQuiz(); return; }

    busy = true;
    const m = msg('bot');
    typing(m.bubble);
    const brain = lmReady() ? (nativeTools ? 'Nano + native tools' : 'Nano + JSON tools') : 'Basic rules';
    const run = engine.start({ title: 'Buddy chat', icon: '🦊', prompt: text, engine: brain });
    try {
        const { reply, calls } = lmReady()
            ? await (nativeTools ? nanoNative : nanoPlan)(text, run, m)
            : await rules(text, run);
        setText(m.bubble, reply);
        toolChips(m, calls);
        addSpeakButton(m, reply);
        run.finish(true, reply);
    } catch (e) {
        setText(m.bubble, `Oops, my brain got stuck 😵 (${e.message}). Let's try again!`);
        run.step('⚠️', 'Error').fail(e.message);
        run.finish(false, e.message);
        resetChatSession();
    } finally {
        busy = false;
        log.scrollTop = log.scrollHeight;
        renderSuggestions();
    }
}

function paintMode() {
    const pill = $('#chat-mode');
    const nano = lmReady() || state.prompt.status === 'active';
    pill.className = `mode-pill ${nano ? 'nano' : 'basic'}`;
    pill.textContent = nano ? (nativeTools ? '🧠 Nano · native tools' : '🧠 Gemini Nano') : '📏 Basic mode';
}

function greet() {
    log.replaceChildren();
    const n = store.words.length;
    buddySays(n
        ? `Hi! I'm **Buddy** 🦊 You have **${n} words** to learn. Want a quiz, a story, or help with a word?`
        : "Hi! I'm **Buddy** 🦊 your English helper. Add some words, or upload a photo of your word list, and we'll learn them together!");
    renderSuggestions();
}

export function initChat() {
    $('#chat-form').addEventListener('submit', e => { e.preventDefault(); send(input.value); });
    $('#chat-reset').addEventListener('click', () => { resetChatSession(); quiz = null; greet(); });

    const mic = $('#chat-mic');
    let rec = null;
    mic.addEventListener('click', async () => {
        if (state.stt.status === 'unavailable') return toast('Your browser cannot listen yet. Try Chrome or Edge!', { icon: '🎤' });
        if (rec) return rec.stop();
        mic.classList.add('live');
        input.placeholder = 'Listening… speak now';
        rec = listen({ onInterim: t => { input.value = t; } });
        const heard = await rec.promise;
        rec = null;
        mic.classList.remove('live');
        input.placeholder = 'Ask Buddy anything…';
        if (heard?.text) send(heard.text);
    });

    store.addEventListener('change', e => { if (['add', 'remove', 'clear', 'import'].includes(e.detail.type)) renderSuggestions(); });
    bus.addEventListener('feature', e => { if (['prompt', 'tools'].includes(e.detail.id)) paintMode(); });
    paintMode();
    greet();
}
