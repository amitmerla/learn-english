// Export the word list to a JSON file, and import one back (in this or another session).
// The format is described in schema/word-list.v1.schema.json.

import { $, el, toast, confettiAt } from './util.js';
import { store, cleanWord } from './store.js';
import { builtinPair, builtinExample } from './pairs.js';

export const FORMAT = 'word-wizard.word-list';
export const VERSION = 1;
const MAX_WORDS = 5000;
const MAX_FILE = 5 * 1024 * 1024;
const SOURCES = new Set(['typed', 'image', 'buddy', 'demo', 'imported']);
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const WORD = /^[a-z][a-z' -]*$/;

/* ---------------------------------------------------------------- export */

export function toExport() {
    const s = store.stats;
    return {
        format: FORMAT,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        app: 'Word Wizard 1.0',
        homeLanguage: store.lang,
        stats: { total: s.total, learned: s.learned, mastered: store.words.filter(w => w.mastered).length },
        words: store.words.map(w => {
            const out = { text: w.text, learned: !!w.learned, mastered: !!w.mastered, source: SOURCES.has(w.source) ? w.source : 'imported' };
            if (w.added) out.addedAt = new Date(w.added).toISOString();
            const tr = Object.fromEntries(Object.entries(w.tr ?? {}).filter(([k, v]) => LANG.test(k) && typeof v === 'string' && v));
            if (Object.keys(tr).length) out.translations = tr;
            if (w.meaning) out.meaning = w.meaning;
            if (w.example) {
                out.example = w.example;
                const etr = Object.fromEntries(Object.entries(w.exampleTr ?? {}).filter(([k, v]) => LANG.test(k) && typeof v === 'string' && v));
                if (Object.keys(etr).length) out.exampleTranslations = etr;
            }
            if (w.pair) {
                out.pair = w.pair;
                const ptr = Object.fromEntries(Object.entries(w.pairTr ?? {}).filter(([k, v]) => LANG.test(k) && typeof v === 'string' && v));
                if (Object.keys(ptr).length) out.pairTranslations = ptr;
            }
            return out;
        }),
    };
}

export function exportWords() {
    if (!store.words.length) return toast('Your list is empty. Add some words first!', { icon: '📭' });
    const json = JSON.stringify(toExport(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = el('a', { href: url, download: `word-wizard-words-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Saved ${store.words.length} words to a file 📤`, { icon: '✅' });
}

/* ---------------------------------------------------------------- validate */

/**
 * Check imported data and turn it into store words.
 * Accepts the full format, or (to be friendly) a plain array of words.
 * Throws for a file that is not a word list; skips single bad words with a reason.
 */
export function validate(data) {
    let list;
    let meta = {};
    if (Array.isArray(data)) {
        list = data;
    } else if (data && typeof data === 'object') {
        if (data.format !== FORMAT) throw new Error('This file is not a Word Wizard word list.');
        if (!Number.isInteger(data.version)) throw new Error('The file has no version number.');
        if (data.version > VERSION) throw new Error(`This file was made by a newer Word Wizard (version ${data.version}).`);
        if (!Array.isArray(data.words)) throw new Error('The file has no "words" list.');
        list = data.words;
        meta = { exportedAt: data.exportedAt, homeLanguage: data.homeLanguage };
    } else {
        throw new Error('This file is not a Word Wizard word list.');
    }
    if (list.length > MAX_WORDS) throw new Error(`Too many words (${list.length}). The limit is ${MAX_WORDS}.`);

    const words = [];
    const skipped = [];
    const seen = new Set();
    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

    list.forEach((item, n) => {
        const raw = typeof item === 'string' ? item : item?.text;
        if (typeof raw !== 'string') return skipped.push({ n, word: '?', reason: 'has no text' });
        const text = cleanWord(raw);
        if (!text || !WORD.test(text) || text.length > 40) return skipped.push({ n, word: raw, reason: 'is not an English word' });
        if (seen.has(text)) return skipped.push({ n, word: raw, reason: 'is in the file twice' });
        seen.add(text);

        const o = typeof item === 'object' ? item : {};
        const langMap = m => {
            const out = {};
            if (m && typeof m === 'object' && !Array.isArray(m)) for (const [k, v] of Object.entries(m)) if (LANG.test(k) && str(v, 200)) out[k] = str(v, 200);
            return out;
        };
        const tr = langMap(o.translations);
        // Missing pair / example: use the built-in one if the word has one.
        const pair = str(o.pair, 80) || builtinPair(text);
        const example = str(o.example, 200) || builtinExample(text);
        const added = Date.parse(o.addedAt);
        words.push({
            text,
            source: SOURCES.has(o.source) ? o.source : 'imported',
            learned: o.learned === true,
            mastered: o.mastered === true,
            added: Number.isFinite(added) ? added : Date.now(),
            tr,
            meaning: str(o.meaning, 500),
            pair,
            pairTr: o.pair ? langMap(o.pairTranslations) : {},
            example,
            exampleTr: o.example ? langMap(o.exampleTranslations) : {},
        });
    });
    return { words, skipped, meta };
}

/* ---------------------------------------------------------------- import */

const modal = $('#import-modal');

function summary(file, result) {
    const fresh = result.words.filter(w => !store.has(w.text)).length;
    const already = result.words.length - fresh;
    const learned = result.words.filter(w => w.learned).length;
    const rows = [
        ['📄', 'File', file.name],
        ['📚', 'Words in the file', result.words.length],
        ['✨', 'New for your list', fresh],
        ['👀', 'Already on your list', already],
        ['⭐', 'Marked as learned', learned],
    ];
    if (result.meta.exportedAt) rows.push(['🗓️', 'Saved on', new Date(result.meta.exportedAt).toLocaleString()]);
    const box = $('#import-summary');
    box.replaceChildren(...rows.map(([i, k, v]) => el('li', {}, el('span', { text: i }), el('span', { text: k }), el('b', { text: v }))));
    const skip = $('#import-skipped');
    skip.hidden = !result.skipped.length;
    if (result.skipped.length) {
        skip.replaceChildren(
            el('summary', { text: `⚠️ ${result.skipped.length} item${result.skipped.length > 1 ? 's' : ''} will be skipped` }),
            el('ul', {}, ...result.skipped.slice(0, 30).map(s => el('li', { text: `“${String(s.word).slice(0, 40)}” ${s.reason}` }))));
    }
    $('#import-replace').hidden = !store.words.length;
    $('#import-merge').textContent = store.words.length ? `Add ${fresh} new word${fresh === 1 ? '' : 's'}` : `Import ${result.words.length} words`;
}

export async function importFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE) return toast('This file is too big for a word list.', { icon: '😕' });
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        return toast('This file is not valid JSON, so I can’t read it.', { icon: '😕', ms: 5000 });
    }
    let result;
    try {
        result = validate(data);
    } catch (e) {
        return toast(e.message, { icon: '😕', ms: 5000 });
    }
    if (!result.words.length) return toast('I could not find any English words in this file.', { icon: '🤔' });

    summary(file, result);
    modal.returnValue = '';
    modal.showModal();
    const choice = await new Promise(r => modal.addEventListener('close', () => r(modal.returnValue), { once: true }));
    if (choice !== 'merge' && choice !== 'replace') return;

    const r = store.importWords(result.words, choice);
    const parts = [r.added.length && `${r.added.length} new`, r.updated.length && `${r.updated.length} updated`].filter(Boolean).join(', ');
    toast(`Imported! ${parts || 'Nothing new'} 📥`, { icon: '✅', ms: 4000 });
    if (r.added.length) confettiAt($('#words-panel'), 80);
    // Use the file's home language if the pupil hasn't picked something else on purpose.
    const lang = result.meta.homeLanguage;
    if (lang && lang !== store.lang && $(`#target-lang option[value="${lang}"]`)) {
        toast(`This list was made with ${$(`#target-lang option[value="${lang}"]`).textContent}. Switch to it?`, {
            icon: '🌍', ms: 8000,
            action: { label: 'Switch', run: () => { const sel = $('#target-lang'); sel.value = lang; sel.dispatchEvent(new Event('change')); } },
        });
    }
}

export function initTransfer() {
    $('#export-words').addEventListener('click', exportWords);
    const input = $('#import-input');
    $('#import-words').addEventListener('click', () => input.click());
    input.addEventListener('change', () => { importFile(input.files[0]); input.value = ''; });
    // Dropping a .json file on the words panel imports it (photos are handled by the photo reader).
    $('#words-panel').addEventListener('drop', e => {
        const f = [...e.dataTransfer.files].find(f => f.type === 'application/json' || f.name.endsWith('.json'));
        if (f) importFile(f);
    });
}
