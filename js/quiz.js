// Word Challenge: a quiz for the words the pupil thinks they know (⭐).
// Round 1 · Meaning  - pick the right meaning (Nano), translation (Translator), or word you hear (no AI).
// Round 2 · Writing  - hear the word and spell it, with letter-by-letter feedback.
// Round 3 · Sentence - write a sentence with the word; Gemini Nano checks it (only when Nano is ready).
// Pass meaning + spelling → the word is mastered 🏆. Miss one → it goes back to practice.

import { $, el, toast, confetti, confettiAt, sleep, RTL, LANG_NAMES } from './util.js';
import { store } from './store.js';
import { lmReady, ask, translate, speak, state } from './ai.js';
import { talk, talkDynamic } from './voice.js';
import { wordIn } from './pairs.js';

const MAX_WORDS = 6;
const MAX_SENTENCES = 3;

const ui = {
    root: $('#quiz'), body: $('#quiz-body'), round: $('#quiz-round'),
    bar: $('#quiz-bar'), score: $('#quiz-score'), step: $('#quiz-step'),
};

let quiz = null;

const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const timeout = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]);

/* ---------------------------------------------------------------- building the quiz */

async function meaningItems(words) {
    // Best: Gemini Nano writes simple meanings plus wrong answers.
    if (lmReady()) {
        try {
            const r = await ask({
                title: `Make a meaning quiz for ${words.length} words`, icon: '🏆',
                prompt: `Make a multiple-choice quiz for a child in 5th grade. For each English word, write its correct meaning in very simple English (max 9 words, do not use the word itself), and 3 wrong meanings that sound possible but are clearly wrong.\nWords: ${words.join(', ')}`,
                schema: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: { word: { type: 'string' }, meaning: { type: 'string' }, wrong: { type: 'array', items: { type: 'string' } } },
                                required: ['word', 'meaning', 'wrong'],
                            },
                        },
                    },
                    required: ['items'],
                },
            });
            const by = Object.fromEntries(r.items.map(i => [i.word.toLowerCase().trim(), i]));
            if (words.every(w => by[w]?.wrong?.length >= 2)) {
                return words.map(w => ({
                    type: 'meaning', word: w, mode: 'meaning',
                    ask: `What does “${w}” mean?`,
                    answer: by[w].meaning,
                    options: shuffle([by[w].meaning, ...by[w].wrong.slice(0, 3)]),
                }));
            }
        } catch { /* fall through */ }
    }

    // Next: translations into the home language, wrong answers are the other words' translations.
    const lang = store.lang;
    const cached = words.every(w => store.find(w)?.tr?.[lang]);
    if (cached || ['available', 'emulated'].includes(state.translator.status)) {
        try {
            const pool = shuffle(store.words.map(w => w.text)).filter(w => !words.includes(w)).slice(0, 6);
            const all = [...words, ...pool];
            const tr = {};
            for (const w of all) {
                tr[w] = store.find(w)?.tr?.[lang] || await timeout(translate(w, lang, { quiet: true }), 8000);
                if (store.has(w) && !store.find(w).tr?.[lang]) store.update(w, { tr: { ...store.find(w).tr, [lang]: tr[w] } });
            }
            if (Object.values(tr).length >= 4) {
                return words.map(w => ({
                    type: 'meaning', word: w, mode: 'translation',
                    ask: `What is “${w}” in ${LANG_NAMES[lang]}?`,
                    answer: tr[w],
                    options: shuffle([tr[w], ...shuffle(all.filter(x => x !== w && tr[x] !== tr[w]).map(x => tr[x])).slice(0, 3)]),
                    dir: RTL.has(lang) ? 'rtl' : 'ltr',
                }));
            }
        } catch { /* fall through */ }
    }

    // No AI at all: listen and pick the word you hear.
    return words.map(w => ({
        type: 'meaning', word: w, mode: 'listen',
        ask: 'Listen 🔊 Which word did you hear?',
        answer: w,
        options: shuffle([w, ...shuffle(store.words.map(x => x.text).filter(x => x !== w)).slice(0, 3)]),
    }));
}

function hintFor(word, meaningQ) {
    const w = store.find(word);
    if (meaningQ?.mode === 'meaning') return meaningQ.answer;
    if (w?.tr?.[store.lang]) return w.tr[store.lang];
    return '';
}

async function build(words) {
    const meanings = await meaningItems(words);
    const qs = [...meanings];
    words.forEach((w, i) => {
        const pair = store.find(w)?.pair ?? '';
        const m = pair.match(wordIn(w));
        // "return home" -> "______ home": the pair helps, but the pupil still writes the word.
        const blank = m ? `${pair.slice(0, m.index)}${'_ '.repeat(w.length).trim()}${pair.slice(m.index + m[0].length)}` : '';
        qs.push({ type: 'spell', word: w, hint: hintFor(w, meanings[i]), pair: blank });
    });
    if (lmReady()) shuffle(words).slice(0, MAX_SENTENCES).forEach(w => qs.push({ type: 'sentence', word: w }));
    return qs;
}

/* ---------------------------------------------------------------- screens */

const ROUNDS = {
    meaning: { label: '🧠 Round 1 · Meaning', color: 'var(--accent)' },
    spell: { label: '✍️ Round 2 · Writing', color: 'var(--pink)' },
    sentence: { label: '📝 Round 3 · Sentence', color: 'var(--orange)' },
};

function head() {
    const q = quiz.qs[quiz.i];
    const r = q ? ROUNDS[q.type] : { label: '🏆 Results', color: 'var(--yellow)' };
    ui.round.textContent = r.label;
    ui.round.style.setProperty('--c', r.color);
    ui.bar.style.width = `${(quiz.i / quiz.qs.length) * 100}%`;
    ui.score.textContent = quiz.score;
    ui.step.textContent = q ? `${quiz.i + 1} / ${quiz.qs.length}` : '';
}

function bumpScore() {
    quiz.score += 1;
    ui.score.textContent = quiz.score;
    ui.score.parentElement.classList.remove('bump');
    void ui.score.offsetWidth;
    ui.score.parentElement.classList.add('bump');
}

function nextButton(label = 'Next ➜') {
    const b = el('button', { class: 'btn btn-primary quiz-next', text: label, onclick: () => next() });
    setTimeout(() => b.focus(), 50);
    return b;
}

function speakBtn(word, tip = 'Hear the word again.') {
    return el('button', { class: 'quiz-speak', 'data-tip': tip, 'aria-label': 'Hear the word', text: '🔊', onclick: () => speak(word, { rate: .75 }) });
}

function renderMeaning(q) {
    const feedback = el('div', { class: 'quiz-feedback' });
    const opts = el('div', { class: 'quiz-options' });
    let answered = false;
    q.options.forEach((o, n) => {
        const b = el('button', { class: 'quiz-opt', dir: q.dir, style: { animationDelay: `${n * 70}ms` } },
            el('span', { class: 'quiz-key', text: n + 1 }), el('span', { text: o }));
        b.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            const ok = o === q.answer;
            b.classList.add(ok ? 'right' : 'wrong');
            [...opts.children].forEach(c => { c.disabled = true; if (c.lastChild.textContent === q.answer) c.classList.add('right'); });
            quiz.result(q.word).meaning = ok;
            if (ok) {
                bumpScore();
                confettiAt(b, 40);
                feedback.replaceChildren(el('b', { text: '✅ Correct! ' }), document.createTextNode(['Great job!', 'You got it!', 'Super!', 'Well done!'][Math.floor(Math.random() * 4)]));
                talk('Correct!', 'נכון!');
            } else {
                feedback.replaceChildren(el('b', { text: '💡 Not this time. ' }), document.createTextNode(`The answer is “${q.answer}”.`));
                if (q.mode === 'listen') speak(q.word); else talk('Good try!', 'ניסיון יפה!');
            }
            feedback.append(nextButton());
        });
        opts.append(b);
    });
    ui.body.replaceChildren(
        el('div', { class: 'quiz-q' },
            q.mode === 'listen' ? speakBtn(q.word) : el('div', { class: 'quiz-word', text: q.word }, speakBtn(q.word)),
            el('h3', { text: q.ask })),
        opts, feedback);
    if (q.mode === 'listen') setTimeout(() => speak(q.word, { rate: .8 }), 300);
    quiz.keys = e => { if (/^[1-4]$/.test(e.key)) opts.children[+e.key - 1]?.click(); };
}

function letters(guess, word) {
    const box = el('div', { class: 'quiz-letters' });
    const n = Math.max(guess.length, word.length);
    for (let i = 0; i < n; i++) {
        const g = guess[i], w = word[i];
        box.append(el('span', { class: g === w ? 'ok' : g == null ? 'miss' : 'bad', text: g ?? '_', style: { animationDelay: `${i * 40}ms` } }));
    }
    return box;
}

function renderSpell(q) {
    let tries = 0;
    const input = el('input', { class: 'quiz-input', placeholder: 'Type the word you hear', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Spell the word' });
    const feedback = el('div', { class: 'quiz-feedback' });
    const check = el('button', { class: 'btn btn-primary', text: 'Check ✓', 'data-tip': 'Check your spelling.' });
    const form = el('form', { class: 'quiz-write' }, input, check);
    form.addEventListener('submit', e => {
        e.preventDefault();
        const guess = input.value.trim().toLowerCase();
        if (!guess) return input.focus();
        tries += 1;
        const ok = guess === q.word;
        feedback.replaceChildren(letters(guess, q.word));
        if (ok) {
            quiz.result(q.word).spell = true;
            bumpScore();
            confettiAt(input, 60);
            talk('Perfect spelling!', 'איות מושלם!');
            input.disabled = check.disabled = true;
            feedback.append(el('p', {}, el('b', { text: '✅ Perfect spelling!' })), nextButton());
        } else if (tries < 2) {
            speak(q.word, { rate: .6 });
            feedback.append(el('p', { text: `Almost! Green letters are right. Listen again and try once more. It starts with “${q.word.slice(0, Math.min(2, q.word.length - 1))}”.` }));
            input.select();
        } else {
            quiz.result(q.word).spell = false;
            input.disabled = check.disabled = true;
            speak(`${q.word}. ${q.word.split('').join(', ')}`, { rate: .8 });
            feedback.append(el('p', {}, document.createTextNode('The right spelling is '), el('b', { class: 'quiz-answer', text: q.word })), nextButton());
        }
    });
    ui.body.replaceChildren(
        el('div', { class: 'quiz-q' },
            el('button', { class: 'quiz-speak big', 'data-tip': 'Hear the word again (slowly).', 'aria-label': 'Hear the word', text: '🔊', onclick: () => speak(q.word, { rate: .7 }) }),
            el('h3', { text: 'Listen and write the word' }),
            q.hint ? el('p', { class: 'quiz-hint', dir: 'auto' }, el('span', { text: 'Hint: ' }), document.createTextNode(q.hint)) : '',
            q.pair ? el('p', { class: 'quiz-hint pair' }, el('span', { text: '🔗 Remember: ' }), document.createTextNode(q.pair)) : ''),
        form, feedback);
    setTimeout(() => { speak(q.word, { rate: .8 }); input.focus(); }, 300);
    quiz.keys = null;
}

function renderSentence(q) {
    const input = el('textarea', { class: 'quiz-input area', rows: 2, placeholder: `Write a sentence with “${q.word}”…`, 'aria-label': 'Your sentence' });
    const feedback = el('div', { class: 'quiz-feedback' });
    const check = el('button', { class: 'btn btn-primary', text: 'Check my sentence ✓' });
    const skip = el('button', { class: 'btn btn-ghost', text: 'Skip', onclick: () => next() });
    const form = el('form', { class: 'quiz-write col' }, input, el('div', { class: 'quiz-row' }, skip, check));
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const text = input.value.trim();
        if (text.split(/\s+/).length < 3) return toast('Write a whole sentence, at least 3 words 🙂', { icon: '✏️' });
        check.disabled = skip.disabled = input.disabled = true;
        feedback.replaceChildren(el('p', { class: 'quiz-thinking' }, el('span', { class: 'typing' }, el('i'), el('i'), el('i')), ' Buddy is reading your sentence…'));
        try {
            const r = await ask({
                title: `Check a sentence with “${q.word}”`, icon: '📝',
                prompt: `A child in 5th grade wrote this sentence to show they understand the English word "${q.word}":\n"${text}"\nDoes the sentence use "${q.word}" correctly and with the right meaning? Small grammar mistakes are OK. Give 1-3 stars, short kind feedback (max 20 words), and a corrected version of their sentence (same idea, fixed grammar).`,
                schema: { type: 'object', properties: { correct: { type: 'boolean' }, stars: { type: 'integer', minimum: 1, maximum: 3 }, feedback: { type: 'string' }, better: { type: 'string' } }, required: ['correct', 'stars', 'feedback', 'better'] },
            });
            quiz.result(q.word).sentence = r.correct;
            if (r.correct) { bumpScore(); confettiAt(input, 50); }
            const same = r.better.trim().toLowerCase() === text.toLowerCase();
            feedback.replaceChildren(
                el('div', { class: 'quiz-stars', text: '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars) }),
                el('p', {}, el('b', { text: r.correct ? '✅ ' : '💡 ' }), document.createTextNode(r.feedback)),
                same ? '' : el('p', { class: 'quiz-better' }, el('span', { text: 'Even better: ' }), document.createTextNode(r.better)),
                nextButton());
            talkDynamic(r.feedback, { keep: [q.word] });
        } catch {
            feedback.replaceChildren(el('p', { text: 'Buddy could not check this one. Let’s go on!' }), nextButton());
        }
    });
    ui.body.replaceChildren(
        el('div', { class: 'quiz-q' },
            el('div', { class: 'quiz-word', text: q.word }, speakBtn(q.word)),
            el('h3', { text: 'Write a sentence that uses this word' })),
        form, feedback);
    setTimeout(() => input.focus(), 100);
    quiz.keys = null;
}

function renderResults() {
    const max = quiz.qs.length;
    const pct = Math.round(quiz.score / max * 100);
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;
    const rows = [];
    for (const [word, r] of quiz.results) {
        const mastered = r.meaning && r.spell;
        const w = store.find(word);
        if (w) store.update(word, mastered ? { learned: true, mastered: true } : { learned: false, mastered: false });
        rows.push(el('li', { class: mastered ? 'ok' : 'again' },
            el('span', { class: 'qr-icon', text: mastered ? '🏆' : '🔁' }),
            el('b', { text: word }),
            el('span', { class: 'qr-marks' },
                el('span', { 'data-tip': 'Meaning', text: r.meaning ? '🧠✅' : '🧠❌' }),
                el('span', { 'data-tip': 'Spelling', text: r.spell ? '✍️✅' : '✍️❌' }),
                r.sentence == null ? '' : el('span', { 'data-tip': 'Sentence', text: r.sentence ? '📝✅' : '📝❌' })),
            el('small', { text: mastered ? 'Mastered!' : 'Practice again' })));
    }
    const masteredCount = rows.filter(r => r.classList.contains('ok')).length;
    const title = pct >= 90 ? 'Word Champion! 🏆' : pct >= 60 ? 'Great work! 🎉' : 'Good try! 💪';
    ui.body.replaceChildren(
        el('div', { class: 'quiz-results' },
            el('div', { class: 'quiz-big-stars' }, ...[0, 1, 2].map(n => el('span', { class: n < stars ? 'on' : '', style: { animationDelay: `${300 + n * 250}ms` }, text: '⭐' }))),
            el('h3', { text: title }),
            el('p', { class: 'quiz-pct' }, el('b', { text: `${quiz.score} / ${max}` }), document.createTextNode(` points · ${pct}%`)),
            el('p', { class: 'quiz-sub', text: masteredCount ? `${masteredCount} word${masteredCount > 1 ? 's' : ''} mastered 🏆. Words with 🔁 lost their star, so you can practice them again.` : 'Words with 🔁 lost their star, so you can practice them again.' }),
            el('ul', { class: 'quiz-result-list' }, rows),
            el('div', { class: 'quiz-row center' },
                el('button', { class: 'btn btn-ghost', text: 'Close', onclick: closeQuiz }),
                el('button', { class: 'btn btn-glow', text: '🔁 Quiz again', onclick: () => startQuiz({ words: [...quiz.results.keys()] }) }))));
    ui.bar.style.width = '100%';
    if (pct >= 60) {
        confetti(innerWidth / 2, innerHeight / 3, 160);
        setTimeout(() => confetti(innerWidth / 3, innerHeight / 2, 100), 500);
    }
    const heTitle = pct >= 90 ? 'אלופי המילים!' : pct >= 60 ? 'עבודה מצוינת!' : 'ניסיון יפה!';
    talk(`${title.replace(/[^\w\s!']/g, '')} You got ${quiz.score} out of ${max}.`, `${heTitle} קיבלתם ${quiz.score} נקודות מתוך ${max}.`);
    quiz.keys = null;
}

function next() {
    quiz.i += 1;
    show();
}

function show() {
    head();
    const q = quiz.qs[quiz.i];
    ui.body.classList.remove('enter');
    void ui.body.offsetWidth;
    ui.body.classList.add('enter');
    if (!q) return renderResults();
    ({ meaning: renderMeaning, spell: renderSpell, sentence: renderSentence })[q.type](q);
}

/* ---------------------------------------------------------------- public */

export async function startQuiz({ words } = {}) {
    let list = words?.length ? words : store.words.filter(w => w.learned && !w.mastered).map(w => w.text);
    if (!list.length) list = store.words.filter(w => w.learned).map(w => w.text);
    if (!list.length) {
        if (!store.words.length) return toast('Add some words first, then take the quiz! 📚', { icon: '🏆' });
        toast('No ⭐ words yet, so the quiz uses all your words.', { icon: '🏆' });
        list = store.words.map(w => w.text);
    }
    list = shuffle(list).slice(0, MAX_WORDS);

    quiz = { qs: [], i: 0, score: 0, results: new Map(), keys: null };
    quiz.result = w => { if (!quiz.results.has(w)) quiz.results.set(w, {}); return quiz.results.get(w); };
    list.forEach(w => quiz.result(w));

    ui.root.hidden = false;
    ui.round.textContent = '🏆 Word Challenge';
    ui.bar.style.width = '0';
    ui.score.textContent = '0';
    ui.step.textContent = '';
    ui.body.replaceChildren(el('div', { class: 'quiz-loading' },
        el('div', { class: 'quiz-trophy', text: '🏆' }),
        el('h3', { text: 'Word Challenge!' }),
        el('p', { text: `Buddy is making a quiz for ${list.length} word${list.length > 1 ? 's' : ''}: ${list.join(', ')}` }),
        el('span', { class: 'typing' }, el('i'), el('i'), el('i'))));
    talk('Get ready for the Word Challenge!', 'מתחילים את אתגר המילים! בהצלחה!');

    const mine = quiz;
    const qs = await build(list);
    if (quiz !== mine || ui.root.hidden) return;
    quiz.qs = qs;
    show();
}

export function closeQuiz() {
    quiz = null;
    ui.root.hidden = true;
    globalThis.speechSynthesis?.cancel();
}

export function initQuiz() {
    $('#quiz-btn').addEventListener('click', () => startQuiz());
    $('#quiz-close').addEventListener('click', closeQuiz);
    addEventListener('keydown', e => {
        if (ui.root.hidden || !quiz) return;
        if (e.key === 'Escape') closeQuiz();
        else if (!e.target.closest('input, textarea')) quiz.keys?.(e);
    });
}
