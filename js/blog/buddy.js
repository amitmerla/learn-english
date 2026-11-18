// Buddy helps while the pupil writes: checks the blog, watches each finished sentence,
// gives ideas when they are stuck, and says Hebrew in English. Gemini Nano when it is on
// (every call shows up in the AI Engine Room); simple rules when it is not.

import { $, el, esc, sleep } from '../util.js';
import { ask, lmReady, toEnglish, speak } from '../ai.js';
import { engine } from '../engine.js';
import { mixed, say } from '../grammar/gen.js';
import { PLAN, CHECK_HE } from './data.js';
import { checkText, stats } from './checks.js';

const CHECK_SCHEMA = {
    type: 'object',
    properties: {
        praise: { type: 'string', maxLength: 120 },
        fixes: { type: 'array', maxItems: 5, items: { type: 'object', properties: { wrong: { type: 'string' }, right: { type: 'string' }, why: { type: 'string', maxLength: 80 } }, required: ['wrong', 'right', 'why'] } },
        next: { type: 'string', maxLength: 140 },
    },
    required: ['praise', 'fixes', 'next'],
};
const SENTENCE_SCHEMA = {
    type: 'object',
    properties: { ok: { type: 'boolean' }, fixed: { type: 'string' }, tip: { type: 'string', maxLength: 70 } },
    required: ['ok', 'fixed', 'tip'],
};
const IDEA_SCHEMA = {
    type: 'object',
    properties: { idea: { type: 'string', maxLength: 90 }, starter: { type: 'string', maxLength: 40 } },
    required: ['idea', 'starter'],
};

const CHEERS = {
    me: 'יוֹפִי! כְּתַבְתֶּם עַל עַצְמְכֶם 🙋',
    family: 'מְעוּלֶּה! עַכְשָׁיו יֵשׁ גַּם מִשְׁפָּחָה 👨‍👩‍👧',
    free: 'אֵיזֶה כֵּיף! כְּתַבְתֶּם מָה אַתֶּם עוֹשִׂים אַחֲרֵי בֵּית הַסֵּפֶר ⚽',
    bye: 'וְיֵשׁ סִיּוּם! הַקּוֹרְאִים יִשְׂמְחוּ לַעֲנוֹת 💬',
};

export function initBuddy({ getText, setText, insert, notes, name }) {
    const logBox = $('#bp-log');
    const fox = $('#bp-fox');
    const watch = $('#bp-watch');
    let busy = false;
    let watchTimer = 0;
    const checked = new Set();

    // One message from Buddy. `he` is Hebrew with [[English]] marks; `en` is said when there is no Hebrew voice.
    function bubble({ he, en, html, actions = [], kind = '' }) {
        const b = el('div', { class: `bp-msg ${kind}` },
            el('div', { class: 'bp-text', dir: he ? 'rtl' : 'ltr', html: html ?? (he ? mixed(he) : esc(en)) }),
            actions.length ? el('div', { class: 'bp-msg-actions' }, actions) : '');
        if (he || en) b.prepend(el('button', { class: 'bp-say', type: 'button', 'aria-label': 'Listen', text: '🔊', onclick: () => (he ? say(he, en ?? '') : speak(en)) }));
        logBox.append(b);
        while (logBox.children.length > 30) logBox.firstElementChild.remove();
        logBox.scrollTop = logBox.scrollHeight;
        fox.classList.remove('hop');
        void fox.offsetWidth;
        fox.classList.add('hop');
        return b;
    }

    // Replace the first place where `wrong` is written, if it is still there.
    const fixButton = (wrong, right) => el('button', { class: 'btn btn-primary btn-xs', type: 'button', text: '✓ Fix it', 'data-tip': 'Change it in my blog.',
        onclick: e => {
            const text = getText();
            const at = text.indexOf(wrong);
            if (at < 0) { e.currentTarget.textContent = '✓'; e.currentTarget.disabled = true; return; }
            setText(text.slice(0, at) + right + text.slice(at + wrong.length));
            e.currentTarget.textContent = '✓ Fixed';
            e.currentTarget.disabled = true;
        } });

    async function withThinking(fn) {
        if (busy) return;
        busy = true;
        fox.classList.add('thinking');
        const dots = bubble({ html: '<span class="bp-dots"><i></i><i></i><i></i></span>', kind: 'thinking' });
        try { return await fn(); } finally { dots.remove(); fox.classList.remove('thinking'); busy = false; }
    }

    /* ------------------------------------------------ check the whole blog */

    async function checkBlog() {
        const text = getText().trim();
        if (text.split(/\s+/).length < 5) {
            bubble({ he: 'כִּתְבוּ קוֹדֶם כַּמָּה מִשְׁפָּטִים, וְאָז אֶבְדּוֹק אוֹתָם 😊', en: 'Write a few sentences first, then I will check them.' });
            return;
        }
        await withThinking(async () => {
            if (lmReady()) {
                try {
                    const r = await ask({
                        title: 'Check my blog', icon: '✨', schema: CHECK_SCHEMA,
                        prompt: `A pupil in 5th grade (age 11) wrote this short blog about themself in English. English is their second language; their home language is Hebrew.
Blog:
"""${text}"""
Find up to 5 mistakes in spelling, grammar, capital letters or full stops. For each one, copy the exact wrong words from the blog ("wrong"), write them fixed ("right"), and say why in very easy English, at most 10 words ("why").
Do not change their ideas, and do not rewrite sentences that are already right.
"praise": one short, warm sentence about something good in the blog.
"next": one short idea to make the blog better, in easy English (for example a missing part: about me, family, after school, or a question for the readers).`,
                    });
                    bubble({ en: `🌟 ${r.praise}`, kind: 'praise' });
                    const fixes = r.fixes.filter(f => f.wrong && f.right && f.wrong !== f.right && text.includes(f.wrong));
                    for (const f of fixes) {
                        bubble({ html: `<span class="bp-wrong">${esc(f.wrong)}</span> → <b class="bp-right">${esc(f.right)}</b><small>${esc(f.why)}</small>`, en: f.why, actions: [fixButton(f.wrong, f.right)], kind: 'fix' });
                    }
                    if (!fixes.length) bubble({ he: 'לֹא מָצָאתִי טָעוּיוֹת. כָּל הַכָּבוֹד! 🎉', en: 'I found no mistakes. Well done!' });
                    if (r.next) bubble({ en: `💡 ${r.next}`, kind: 'idea' });
                    speak(r.praise);
                    return;
                } catch { /* rules below */ }
            }
            await sleep(500);
            const issues = checkText(text, { names: [name].filter(Boolean) });
            const kinds = [...new Set(issues.map(x => x.kind))];
            if (!issues.length) bubble({ he: 'בָּדַקְתִּי אוֹתִיּוֹת גְּדוֹלוֹת, נְקוּדוֹת וְ־[[s]]. הַכּוֹל נִרְאֶה טוֹב! 🎉', en: 'I checked capital letters, full stops and s. It all looks good!', kind: 'praise' });
            else for (const k of kinds) bubble({ he: `${CHECK_HE[k]} (${issues.filter(x => x.kind === k).length})`, en: '', kind: 'fix' });
            const missing = PLAN.filter(p => !stats(text).parts[p.id]);
            if (missing.length) bubble({ he: `עוֹד חָסֵר: ${missing.map(p => `${p.icon} ${p.title}`).join(', ')}`, en: `Still missing: ${missing.map(p => p.en).join(', ')}.`, kind: 'idea' });
        });
    }

    /* ------------------------------------------------ watch each finished sentence */

    function typed(text) {
        clearTimeout(watchTimer);
        if (!watch.checked || !lmReady()) return;
        watchTimer = setTimeout(async () => {
            const sentences = text.match(/[^.!?\n]*[A-Za-z][^.!?\n]*[.!?]/g) ?? [];
            const last = sentences.at(-1)?.trim();
            if (!last || checked.has(last) || last.split(/\s+/).length < 3 || busy) return;
            checked.add(last);
            try {
                const r = await ask({
                    title: 'Read my sentence', icon: '👀', schema: SENTENCE_SCHEMA,
                    prompt: `An 11-year-old who is learning English wrote this sentence: "${last}"
Is it correct English (spelling, grammar, capital letters, full stop)? If there is a mistake, write the fixed sentence ("fixed"), changing as little as you can, and a tip in at most 8 easy words ("tip"). If it is correct, "ok" is true, "fixed" is the same sentence, and "tip" is a short cheer.`,
                });
                const fixed = r.fixed?.trim();
                if (!r.ok && fixed && fixed !== last && getText().includes(last)) {
                    bubble({ html: `👀 <span class="bp-wrong">${esc(last)}</span><br>→ <b class="bp-right">${esc(fixed)}</b><small>${esc(r.tip)}</small>`, en: r.tip, actions: [fixButton(last, fixed)], kind: 'fix' });
                }
            } catch { /* Buddy stays quiet if the AI is busy */ }
        }, 2600);
    }

    /* ------------------------------------------------ ideas when stuck */

    async function idea() {
        const text = getText();
        const missing = PLAN.filter(p => !stats(text).parts[p.id]);
        const part = missing[0] ?? PLAN[PLAN.length - 1];
        await withThinking(async () => {
            if (lmReady()) {
                try {
                    const r = await ask({
                        title: "I'm stuck", icon: '💡', schema: IDEA_SCHEMA,
                        prompt: `An 11-year-old is writing a short blog about themself in easy English (name, city, age, birthday, school, family, pets, hobbies in the afternoons, and a question for the readers).
What they wrote so far:
"""${text || '(nothing yet)'}"""
Parts still missing: ${missing.map(p => p.en).join(', ') || 'none'}.
Their notes for "${part.en}": ${notes()[part.id] || '(none)'}
Give one friendly question that helps them write the next sentence ("idea", at most 12 easy words) and the first words of a sentence they can finish ("starter", 2 to 6 words, no full stop).`,
                    });
                    const starter = r.starter.replace(/[.…]+$/, '').trim();
                    bubble({ en: `💡 ${r.idea}`, actions: [el('button', { class: 'btn btn-ghost btn-xs', type: 'button', text: `✍️ ${starter} …`, onclick: () => insert(`${starter} `) })], kind: 'idea' });
                    speak(r.idea);
                    return;
                } catch { /* rules below */ }
            }
            await sleep(400);
            const q = part.ask[Math.floor(Math.random() * part.ask.length)];
            const st = part.starters[Math.floor(Math.random() * part.starters.length)];
            bubble({ en: `💡 ${part.icon} ${q}`, actions: [el('button', { class: 'btn btn-ghost btn-xs', type: 'button', text: `✍️ ${st.trim()} …`, onclick: () => insert(st) })], kind: 'idea' });
            speak(q);
        });
    }

    /* ------------------------------------------------ how do I say it in English? */

    async function translate(he) {
        await withThinking(async () => {
            const run = engine.start({ title: `How do I say “${he}” in English?`, icon: '🌍', prompt: he, engine: 'Translator API' });
            const s = run.step('🌍', 'Hebrew → English');
            let en = null;
            // Some browsers never answer when the translator is created, so give up after 8 seconds.
            try { en = await Promise.race([toEnglish(he, 'he'), sleep(8000).then(() => null)]); } catch { /* none */ }
            if (en) { s.done(); run.finish(true, en); } else { s.fail('No translator here'); run.finish(false, 'no translator'); }
            if (!en) {
                bubble({ he: 'אֵין כָּאן מְתַרְגֵּם 😕 נַסּוּ לִשְׁאוֹל מְבוּגָּר, אוֹ לִכְתּוֹב אֶת זֶה בְּמִילִּים אֲחֵרוֹת.', en: 'There is no translator here. Ask a grown-up, or try other words.' });
                return;
            }
            bubble({ html: `<span dir="rtl">${esc(he)}</span> → <b class="bp-right">${esc(en)}</b>`, en,
                actions: [el('button', { class: 'btn btn-ghost btn-xs', type: 'button', text: '✍️ Add to my blog', onclick: () => insert(en) })], kind: 'idea' });
            speak(en);
        });
    }

    $('#bp-check').addEventListener('click', checkBlog);
    $('#bp-idea').addEventListener('click', idea);
    $('#bp-ask').addEventListener('submit', e => {
        e.preventDefault();
        const input = $('#bp-ask-input');
        if (input.value.trim()) translate(input.value.trim());
        input.value = '';
    });

    return {
        typed,
        cheer(part) { bubble({ he: CHEERS[part.id], en: `Great! You wrote about ${part.en.toLowerCase()}.`, kind: 'praise' }); },
        showPart(part, note) {
            bubble({ he: `${part.icon} ${part.title}`, html: `<b>${part.icon} ${esc(part.en)}</b><ul>${part.ask.map(q => `<li>${esc(q)}</li>`).join('')}</ul>${note ? `<small dir="auto">📝 ${esc(note)}</small>` : ''}`, en: part.ask.join(' ') });
        },
        ready() {
            $('#bp-mode').textContent = lmReady() ? 'Gemini Nano' : 'Simple rules';
            watch.closest('label').hidden = !lmReady();
            bubble({ he: name ? `הַיי [[${name}]]! אֲנִי כָּאן כְּדֵי לַעֲזוֹר לָכֶם לִכְתּוֹב. כִּתְבוּ, וַאֲנִי אֶעֱזוֹר בַּדֶּרֶךְ ✍️` : 'הַיי! אֲנִי כָּאן כְּדֵי לַעֲזוֹר לָכֶם לִכְתּוֹב. כִּתְבוּ, וַאֲנִי אֶעֱזוֹר בַּדֶּרֶךְ ✍️',
                en: `Hi${name ? ` ${name}` : ''}! I'm here to help you write. You write, and I help along the way.` });
        },
    };
}
