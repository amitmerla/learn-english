// (d) My Words board: add, remove, filter, and the per-word AI actions.

import { $, $$, el, toast, confirmBox, confettiAt, RTL, LANG_NAMES, sleep, inlineEdit } from './util.js';
import { store, splitInput, DEMO_WORDS } from './store.js';
import { hooks } from './tools.js';
import { talk, homeVoiceOn } from './voice.js';
import { ask, lmReady, translate, speak, speakParts, hasVoice, listen, detectLanguage, toEnglish, state } from './ai.js';
import { builtinPair, wordIn } from './pairs.js';
import { builtinSenses, findSenses, pickPatch, senseText, allMeanings } from './senses.js';

const grid = $('#words-grid');
const empty = $('#words-empty');
const cards = new Map(); // word id -> node
let filter = 'all';
let query = '';

const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/* ---------------------------------------------------------------- card */

function chip(cls, label, content, attrs = {}) {
    return el('div', { class: `chip-out ${cls}`, ...attrs }, el('span', { class: 'lbl', text: label }), content);
}

function paintInfo(w, node) {
    const info = node.querySelector('.word-info');
    info.replaceChildren();
    const lang = store.lang;
    node.querySelector('.word-text').textContent = w.text;
    node.style.setProperty('--hue', hue(w.text));
    const senses = sensesOf(w, lang);
    if (senses) info.append(sensesChip(w, senses, lang));
    else if (w.tr?.[lang]) info.append(chip('tr', LANG_NAMES[lang], document.createTextNode(w.tr[lang]), { dir: RTL.has(lang) ? 'rtl' : 'ltr', lang }));
    if (w.meaning) info.append(chip('mean', 'Meaning', document.createTextNode(w.meaning)));
    if (w.pair) info.append(pairChip(w, lang));
    if (w.example) info.append(exampleChip(w, lang));
    else info.append(chip('example empty', '💬 Example', el('button', {
        class: 'ex-explain', 'data-act': 'makeExample',
        'data-tip': 'Ask the AI to write a simple sentence with this word.', text: '✨ Make an example',
    })));
    node.classList.toggle('learned', !!w.learned && !w.mastered);
    node.classList.toggle('mastered', !!w.mastered);
    node.querySelector('[data-act="learn"]').classList.toggle('on', !!w.learned);
}

// A word with more than one meaning: its own list, or (for a word translated before) the built-in one.
function sensesOf(w, lang) {
    const list = w.senses?.length > 1 ? w.senses : (!w.senses && w.tr?.[lang] ? builtinSenses(w.text, lang) : null);
    return list?.some(s => senseText(s, lang)) ? list : null;
}

// The translation chip of a word with several meanings. Not chosen yet: every meaning, each one a button.
// Chosen: that meaning, and a small button to see the others again.
function sensesChip(w, senses, lang) {
    const dir = RTL.has(lang) ? 'rtl' : 'ltr';
    const he = lang === 'he';
    const i = Number.isInteger(w.sense) && senses[w.sense] ? w.sense : -1;
    if (i >= 0) {
        const s = senses[i];
        return chip('tr', LANG_NAMES[lang], el('div', { class: 'sense-one' },
            el('span', { dir, lang, text: senseText(s, lang) }),
            s.hint ? el('small', { class: 'sense-hint', text: s.hint }) : '',
            el('button', {
                class: 'sense-more', 'data-act': 'showSenses',
                'data-tip': he ? `“${w.text}” has ${senses.length} meanings. Tap to see them all. · למילה יש ${senses.length} משמעויות` : `“${w.text}” has ${senses.length} meanings. Tap to see them all.`,
                text: `🔀 ${senses.length}`,
            })), { dir: 'ltr' });
    }
    return chip('tr senses', `${LANG_NAMES[lang]} · ${senses.length} meanings`, el('div', { class: 'sense-body' },
        el('div', { class: 'sense-ask' }, el('span', { text: 'Which one is in your lesson? Tap it!' }),
            he ? el('span', { dir: 'rtl', lang: 'he', text: 'איזו משמעות מתאימה לשיעור?' }) : ''),
        ...senses.map((s, n) => el('button', {
            class: 'sense-pick', 'data-act': 'pickSense', 'data-i': n,
            'data-tip': `Tap if this is the meaning in your lesson. The memory pair and the example will fit it too.`,
        }, el('b', { dir, lang, text: senseText(s, lang) || '?' }), s.hint ? el('small', { text: s.hint }) : ''))));
}

// "Remember it" chip: the memory pair with the word highlighted, its translation, and a speak button.
function pairChip(w, lang) {
    const phrase = el('span', { class: 'pair-phrase' });
    const m = w.pair.match(wordIn(w.text));
    if (m) {
        phrase.append(w.pair.slice(0, m.index), el('mark', { text: m[0] }), w.pair.slice(m.index + m[0].length));
    } else phrase.textContent = w.pair;
    const tr = w.pairTr?.[lang];
    return chip('pair', '🔗 Remember it', el('div', { class: 'pair-body' },
        el('div', { class: 'pair-row' }, phrase,
            el('button', { class: 'pair-say', 'data-act': 'sayPair', 'data-tip': 'Hear this pair. Say it out loud with me!', 'aria-label': `Say ${w.pair}`, text: '🔊' })),
        tr ? el('div', { class: 'pair-tr', dir: RTL.has(lang) ? 'rtl' : 'ltr', lang, text: tr }) : ''));
}

// The English text with the word itself highlighted.
function highlighted(text, word, cls) {
    const out = el('span', { class: cls });
    const m = text.match(wordIn(word));
    if (m) out.append(text.slice(0, m.index), el('mark', { text: m[0] }), text.slice(m.index + m[0].length));
    else out.textContent = text;
    return out;
}

// "Example" chip: a simple sentence, a speak button, and its explanation in the home language.
function exampleChip(w, lang) {
    const tr = w.exampleTr?.[lang];
    const he = lang === 'he';
    const explain = tr ? '' : el('button', {
        class: 'ex-explain', 'data-act': 'explainExample',
        'data-tip': he ? 'Explain this sentence in Hebrew. · הסבר בעברית' : `Show this sentence in ${LANG_NAMES[lang]}.`,
        text: he ? '🌍 בעברית' : `🌍 ${LANG_NAMES[lang]}`,
    });
    return chip('example', '💬 Example', el('div', { class: 'pair-body' },
        el('div', { class: 'pair-row' }, highlighted(w.example, w.text, 'ex-sentence'),
            el('button', { class: 'pair-say', 'data-act': 'sayExample', 'data-tip': he ? 'Hear the sentence in English, then in Hebrew. Then say it yourself!' : 'Hear this sentence, then say it yourself!', 'aria-label': `Say: ${w.example}`, text: '🔊' })),
        tr ? el('div', { class: 'pair-tr', dir: RTL.has(lang) ? 'rtl' : 'ltr', lang, text: tr }) : explain));
}

// Translate an extra (pair or example) into the home language, quietly.
async function translateExtra(w, field, trField) {
    const lang = store.lang;
    const text = w[field];
    if (!text || w[trField]?.[lang]) return;
    try {
        const t = await Promise.race([translate(text, lang, { quiet: true }), sleep(10000).then(() => { throw new Error('timeout'); })]);
        const cur = store.find(w.text);
        if (cur?.[field] === text) store.update(w.text, { [trField]: { ...cur[trField], [lang]: t } });
    } catch (e) {
        if (field === 'example') toast(`I could not translate the sentence here (${e.message === 'timeout' ? 'the translator did not answer' : e.message}).`, { icon: '🌍' });
    }
}
const translatePair = w => translateExtra(w, 'pair', 'pairTr');
const translateExample = w => translateExtra(w, 'example', 'exampleTr');

function buildCard(w) {
    const act = (a, icon, label, tip) => el('button', { class: 'wa', 'data-act': a, 'data-tip': tip, 'aria-label': `${label} ${w.text}` },
        el('span', { text: icon }), el('small', { text: label }));
    const node = el('article', { class: 'word-card', 'data-id': w.id, style: { '--hue': hue(w.text) } },
        el('div', { class: 'word-top' },
            el('div', {},
                el('div', { class: 'word-text', text: w.text }),
                el('div', { class: 'word-src', text: { typed: '✏️ typed', image: '📷 from photo', buddy: '🦊 added by Buddy', demo: '✨ practice' }[w.source] ?? w.source })),
            el('div', { class: 'word-tools' },
                el('button', { class: 'word-x', 'data-act': 'edit', 'data-tip': 'Fix the spelling of this word. Tip: you can also double-click the word.', 'aria-label': `Fix ${w.text}`, text: '✏️' }),
                el('button', { class: 'word-x', 'data-act': 'remove', 'data-tip': 'Remove this word from your list.', 'aria-label': `Remove ${w.text}`, text: '✕' }))),
        el('div', { class: 'word-info' }),
        el('div', { class: 'word-actions' },
            act('say', '🔊', 'Say', 'Hear how to say this word: first normal, then slow.'),
            act('tr', '🌐', 'Translate', 'See this word in your language.'),
            act('mean', '💡', 'Meaning', 'Ask the AI what this word means, with an example sentence.'),
            act('try', '🎤', 'Try it', 'Say the word out loud. I will listen and tell you how you did!'),
            act('learn', '⭐', 'Got it', 'Tap when you know this word. It gets a gold star! Then take the 🏆 Quiz to master it.')));
    paintInfo(w, node);
    return node;
}

function visible(w) {
    if (filter === 'new' && w.learned) return false;
    if (filter === 'learned' && !w.learned) return false;
    return !query || w.text.includes(query);
}

function sync(detail = {}) {
    const ids = new Set(store.words.map(w => w.id));
    for (const [id, node] of cards) {
        if (!ids.has(id)) {
            cards.delete(id);
            node.classList.add('removing');
            setTimeout(() => node.remove(), 350);
        }
    }
    let delay = 0;
    store.words.forEach((w, i) => {
        let node = cards.get(w.id);
        if (!node) {
            node = buildCard(w);
            node.style.animationDelay = `${Math.min(delay++, 12) * 45}ms`;
            cards.set(w.id, node);
        } else if (detail.words?.includes(w.text)) {
            paintInfo(w, node);
        }
        node.hidden = !visible(w);
        if (grid.children[i] !== node) grid.insertBefore(node, grid.children[i] ?? null);
    });
    empty.hidden = store.words.length > 0;
    grid.hidden = store.words.length === 0;
    stats();
}

function stats() {
    const s = store.stats;
    $('#stat-total').textContent = s.total;
    $('#stat-learned').textContent = s.learned;
    $('#stat-pct').textContent = `${s.pct}%`;
    const ring = $('#progress-ring');
    const c = 2 * Math.PI * 15.5;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c * (1 - s.pct / 100);
}

export function showWord(text) {
    const w = store.find(text);
    const node = w && cards.get(w.id);
    if (!node) return;
    if (node.hidden) { filter = 'all'; query = ''; $('#word-search').value = ''; setFilterUI(); sync(); }
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.remove('flash');
    void node.offsetWidth;
    node.classList.add('flash');
}

export function celebrate(text) {
    const w = store.find(text);
    const node = w && cards.get(w.id);
    if (node) confettiAt(node, 60);
}

/* ---------------------------------------------------------------- fixing */

/** Fix the spelling of a word on the list (used by cards and the photo reader). */
export function fixWord(oldText, newText) {
    const r = store.rename(oldText, newText);
    if (!r.ok) toast(r.error, { icon: '✏️' });
    else if (r.merged) toast(`“${r.word}” was already on your list, so I removed “${oldText}”.`, { icon: '👀' });
    else if (r.word !== oldText) {
        toast(`Fixed: “${oldText}” → “${r.word}”`, { icon: '✏️' });
        showWord(r.word);
    }
    return r;
}

function editCard(w, node) {
    if (node.querySelector('.inline-edit')) return;
    inlineEdit(node.querySelector('.word-text'), w.text, v => fixWord(w.text, v));
}

/* ---------------------------------------------------------------- actions */

async function busy(btn, fn) {
    btn.classList.add('busy');
    try { await fn(); } catch (e) { toast(e.message, { icon: '😕' }); } finally { btn.classList.remove('busy'); }
}

const ACTIONS = {
    async say(w, btn) {
        btn.classList.add('busy');
        await speak(w.text, { rate: .9 });
        await sleep(250);
        await speak(w.text, { rate: .55 });
        btn.classList.remove('busy');
    },

    async tr(w, btn) {
        await busy(btn, async () => {
            const lang = store.lang;
            const senses = await findSenses(w.text, lang, LANG_NAMES[lang]);
            if (senses.length > 1) {
                // Several meanings: show them all until the pupil picks one (or keep the one already picked).
                const keep = Number.isInteger(w.sense) && senseText(w.senses?.[w.sense] ?? {}, lang) && w.senses.length === senses.length ? w.sense : null;
                store.update(w.text, keep === null ? { senses, sense: null, tr: { ...w.tr, [lang]: allMeanings(senses, lang) } } : pickPatch(w, senses, keep, lang));
                if (keep === null) {
                    toast(`“${w.text}” has ${senses.length} meanings! Tap the one from your lesson.`, { icon: '🔀', ms: 5000 });
                    talk(`${w.text} has ${senses.length} meanings. Tap the one from your lesson.`, `למילה [[${w.text}]] יש ${senses.length === 2 ? 'שתי' : 'שלוש'} משמעויות. בחרו את המשמעות מהשיעור.`);
                }
            } else {
                store.update(w.text, { senses: [], sense: null, tr: { ...w.tr, [lang]: senseText(senses[0], lang) } });
            }
            await translatePair(w);
            await translateExample(w);
        });
    },

    pickSense(w, btn) {
        const lang = store.lang;
        const senses = sensesOf(w, lang);
        const i = Number(btn.dataset.i);
        if (!senses?.[i]) return;
        confettiAt(btn, 30);
        store.update(w.text, pickPatch(w, senses, i, lang));
        translatePair(store.find(w.text));
    },

    showSenses(w) {
        const lang = store.lang;
        const senses = sensesOf(w, lang);
        if (senses) store.update(w.text, { senses, sense: null, tr: { ...w.tr, [lang]: allMeanings(senses, lang) } });
    },

    // Always English first, then the Hebrew explanation (translated first if needed).
    async sayExample(w, btn) {
        btn.classList.add('busy');
        const parts = [{ text: w.example, lang: 'en', start: 0 }];
        if (store.lang === 'he' && hasVoice('he')) {
            if (!w.exampleTr?.he) await translateExample(w);
            const tr = store.find(w.text)?.exampleTr?.he;
            if (tr) parts.push({ text: tr, lang: 'he', start: w.example.length });
        }
        await speakParts(parts, { rate: .8 });
        btn.classList.remove('busy');
    },

    async makeExample(w, btn) {
        if (!lmReady()) return toast('Writing a new example needs the Gemini Nano AI brain 🧠. Check the AI Powers panel!', { icon: '💬', ms: 5000 });
        await busy(btn, async () => {
            const r = await ask({
                title: `Example sentence for “${w.text}”`, icon: '💬',
                prompt: `Write one short, simple English sentence (max 9 words, easy words only) that a child in 5th grade understands, using the word "${w.text}" in its most common meaning.`,
                schema: { type: 'object', properties: { sentence: { type: 'string' } }, required: ['sentence'] },
            });
            if (!wordIn(w.text).test(r.sentence)) throw new Error('The AI forgot to use the word. Try again!');
            store.update(w.text, { example: r.sentence.trim(), exampleTr: {} });
            await translateExample(w);
        });
    },

    async explainExample(w, btn) {
        btn.classList.add('busy');
        btn.disabled = true;
        await translateExample(w);
        btn.classList.remove('busy');
        btn.disabled = false;
    },

    async sayPair(w, btn) {
        btn.classList.add('busy');
        const tr = w.pairTr?.he;
        const parts = [{ text: w.pair, lang: 'en', start: 0 }];
        // With the Hebrew voice on, the pair is followed by its Hebrew translation.
        if (homeVoiceOn() && tr) parts.push({ text: tr, lang: 'he', start: w.pair.length });
        await speakParts(parts, { rate: .85 });
        btn.classList.remove('busy');
    },

    async mean(w, btn) {
        const chosenSense = x => {
            const s = Number.isInteger(x.sense) && x.senses?.[x.sense];
            return s ? `\nUse this meaning of the word only: ${s.hint || ''} (in ${LANG_NAMES[store.lang]}: ${senseText(s, store.lang)}).` : '';
        };
        if (!lmReady()) {
            const pair = builtinPair(w.text);
            toast(pair ? 'Meanings need the Gemini Nano AI brain. Here is the translation and a pair to remember it!' : 'Meanings need the Gemini Nano AI brain. Showing the translation instead!', { icon: '🧠' });
            if (pair && pair !== w.pair) store.update(w.text, { pair, pairTr: {} });
            return ACTIONS.tr(w, btn);
        }
        await busy(btn, async () => {
            const r = await ask({
                title: `What does “${w.text}” mean?`, icon: '💡',
                prompt: `Explain the English word "${w.text}" to a child in 5th grade.${chosenSense(w)}
Give: a very simple meaning (max 12 words), one short and simple example sentence that uses the word (max 9 words, easy words only), one emoji that fits,
and a memory pair: the easiest, most common 2-3 word phrase with "${w.text}" that a 10-year-old hears every day, so the word is easy to remember.
Good memory pairs: return -> "return home", brave -> "brave lion", borrow -> "borrow a book", delicious -> "delicious pizza".`,
                schema: {
                    type: 'object',
                    properties: { meaning: { type: 'string' }, example: { type: 'string' }, emoji: { type: 'string' }, pair: { type: 'string' } },
                    required: ['meaning', 'example', 'emoji', 'pair'],
                },
            });
            // The pair must really contain the word; otherwise use the built-in one (if any).
            let pair = r.pair.trim().replace(/^["“]|["”.]$/g, '');
            if (!wordIn(w.text).test(pair) || pair.split(/\s+/).length > 4) pair = builtinPair(w.text) || '';
            const example = wordIn(w.text).test(r.example) ? r.example.trim() : w.example;
            store.update(w.text, {
                meaning: `${r.emoji} ${r.meaning}`,
                ...(pair !== w.pair ? { pair, pairTr: {} } : {}),
                ...(example !== w.example ? { example, exampleTr: {} } : {}),
            });
            await translatePair(w);
            await translateExample(w);
        });
    },

    async try(w, btn) {
        if (state.stt.status === 'unavailable') return toast('Your browser cannot listen yet. Try Chrome or Edge!', { icon: '🎤' });
        btn.classList.add('live');
        const close = toast(`Say “${w.text}” now…`, { icon: '🎤', ms: 6000 });
        const rec = listen();
        setTimeout(() => rec.stop(), 4500);
        const heard = await rec.promise;
        btn.classList.remove('live');
        close();
        if (!heard) return toast('I did not hear anything. Try again a bit louder!', { icon: '👂' });
        const ok = heard.alternatives.some(a => a.split(/\s+/).includes(w.text) || a === w.text);
        if (ok) {
            confettiAt(btn, 70);
            toast(`Perfect! You said “${w.text}” 🎉`, { icon: '🏆' });
            talk('Great job!', 'כל הכבוד!');
        } else {
            toast(`I heard “${heard.text}”. Listen and try again!`, { icon: '🔁' });
            speak(w.text, { rate: .6 });
        }
    },

    learn(w, btn) {
        const learned = !w.learned;
        store.update(w.text, { learned, mastered: false });
        if (!learned) return;
        confettiAt(btn, 50);
        talk(`${w.text}. Nice!`, `[[${w.text}]]. יופי!`);
        // Every few stars, invite the pupil to prove it.
        const ready = store.words.filter(x => x.learned && !x.mastered).length;
        const allDone = store.words.every(x => x.learned);
        if (ready && (ready % 3 === 0 || allDone)) {
            setTimeout(() => toast(`You know ${ready} new word${ready > 1 ? 's' : ''}! Ready to prove it?`, {
                icon: '🏆', ms: 8000, action: { label: 'Take the quiz', run: () => hooks.startQuiz() },
            }), 900);
        }
    },

    edit(w, btn) {
        editCard(w, btn.closest('.word-card'));
    },

    remove(w) {
        const snapshot = { ...w };
        store.remove(w.text);
        toast(`Removed “${w.text}”`, {
            icon: '🗑️', ms: 5000,
            action: { label: 'Undo', run: () => { store.words.unshift(snapshot); store.emit('add', { words: [snapshot.text] }); } },
        });
    },
};

/* ---------------------------------------------------------------- adding */

export async function addFromText(text, source = 'typed') {
    const tokens = splitInput(text);
    const latin = [];
    for (const t of tokens) {
        if (/^[a-z' -]+$/.test(t)) { latin.push(t); continue; }
        // Not English letters: maybe the child typed it in their own language.
        const lang = (await detectLanguage(t))?.detectedLanguage ?? store.lang;
        const en = await toEnglish(t, lang).catch(() => null);
        if (en) {
            latin.push(en);
            toast(`“${t}” in English is “${en}”`, { icon: '🌍' });
        } else toast(`I could not turn “${t}” into English.`, { icon: '🤔' });
    }
    const r = store.add(latin, source);
    if (r.added.length) {
        toast(r.added.length === 1 ? `Added “${r.added[0]}”!` : `Added ${r.added.length} words!`, { icon: '✅' });
        confettiAt($('#add-form'), 25 + r.added.length * 4);
    }
    if (r.dupes.length) toast(`Already on your list: ${r.dupes.join(', ')}`, { icon: '👀' });
    if (r.bad.length) toast(`These don't look like English words: ${r.bad.join(', ')}`, { icon: '🤔' });
    return r;
}

function setFilterUI() {
    $$('#word-filter button').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
}

export function initWords() {
    store.addEventListener('change', e => sync(e.detail));
    store.addEventListener('lang', () => cards.forEach((node, id) => paintInfo(store.words.find(w => w.id === id), node)));

    grid.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const w = store.words.find(x => x.id === btn.closest('.word-card').dataset.id);
        if (w) ACTIONS[btn.dataset.act](w, btn);
    });

    grid.addEventListener('dblclick', e => {
        const text = e.target.closest('.word-text');
        if (!text) return;
        const node = text.closest('.word-card');
        const w = store.words.find(x => x.id === node.dataset.id);
        if (w) editCard(w, node);
    });

    $('#add-form').addEventListener('submit', async e => {
        e.preventDefault();
        const input = $('#add-input');
        if (!input.value.trim()) return input.focus();
        const text = input.value;
        input.value = '';
        await addFromText(text);
    });

    $('#word-search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); sync(); });
    $('#word-filter').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        filter = b.dataset.filter;
        setFilterUI();
        sync();
    });

    $('#demo-words').addEventListener('click', () => {
        store.add(DEMO_WORDS, 'demo');
        confettiAt($('#words-panel'), 80);
    });

    $('#clear-words').addEventListener('click', async () => {
        if (!store.words.length) return;
        if (await confirmBox('Remove all words?', `This will remove all ${store.words.length} words from your list.`)) store.clear();
    });

    $('#say-all').addEventListener('click', async e => {
        const btn = e.currentTarget;
        if (btn.dataset.on) { delete btn.dataset.on; return; }
        btn.dataset.on = '1';
        btn.textContent = '⏹ Stop';
        for (const w of store.words.filter(visible)) {
            if (!btn.dataset.on) break;
            showWord(w.text);
            await speak(w.text, { rate: .85 });
            await sleep(450);
        }
        delete btn.dataset.on;
        btn.textContent = '🔊 All';
    });

    sync();
}
