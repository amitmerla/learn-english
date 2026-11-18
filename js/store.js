// The word list. One source of truth, saved in localStorage, with change events.

import { builtinPair, builtinExample } from './pairs.js';

const KEY = 'wordwizard.words.v1';
const PREFS = 'wordwizard.prefs.v1';

export const DEMO_WORDS = ['adventure', 'brave', 'curious', 'jungle', 'whisper', 'giant', 'rainbow', 'treasure'];

// Tiny words we skip when reading a photo (the user can switch this off).
export const TINY = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'of', 'to', 'in', 'on', 'at', 'it', 'and', 'or', 'be', 'by', 'as', 'for', 'with', 'i', 'my', 'we', 'he', 'she', 'you', 'they', 'this', 'that', 'was', 'do', 'no', 'so', 'up']);

function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep in memory */ }
}

export function cleanWord(raw) {
    return String(raw ?? '')
        .trim()
        .replace(/[‘’`´]/g, "'")
        .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
        .toLowerCase();
}

export const isEnglishWord = w => /^[a-z]+(?:['-][a-z]+)*$/.test(w);

// Split free text ("apple, brave\njungle") into candidate words or short phrases.
export function splitInput(text) {
    const parts = String(text).split(/[,;\n\r\t]+|\s{2,}/);
    // A single line with no commas is treated as space-separated words.
    const flat = parts.length === 1 ? parts[0].split(/\s+/) : parts;
    return flat.map(cleanWord).filter(Boolean);
}

class Store extends EventTarget {
    constructor() {
        super();
        this.words = load(KEY, []);
        // Words without a pair / example get the built-in one when there is one.
        for (const w of this.words) {
            if (!w.pair) { w.pair = builtinPair(w.text); w.pairTr = {}; }
            if (!w.example) { w.example = builtinExample(w.text); w.exampleTr = {}; }
        }
        this.prefs = { lang: 'he', ...load(PREFS, {}) };
    }

    emit(type, detail) {
        save(KEY, this.words);
        this.dispatchEvent(new CustomEvent('change', { detail: { type, ...detail } }));
    }

    setPref(key, value) {
        this.prefs[key] = value;
        save(PREFS, this.prefs);
        this.dispatchEvent(new CustomEvent('prefs', { detail: { key } }));
    }

    get lang() { return this.prefs.lang; }
    set lang(v) { this.prefs.lang = v; save(PREFS, this.prefs); this.dispatchEvent(new CustomEvent('lang')); }

    find(text) {
        const w = cleanWord(text);
        return this.words.find(x => x.text === w);
    }

    has(text) { return !!this.find(text); }

    // Returns { added: [...], dupes: [...], bad: [...] }
    add(list, source = 'typed') {
        const out = { added: [], dupes: [], bad: [] };
        for (const raw of [].concat(list)) {
            const w = cleanWord(raw);
            if (!w) continue;
            if (!/^[a-z][a-z' -]*$/.test(w) || w.length > 40) { out.bad.push(raw); continue; }
            if (this.has(w) || out.added.includes(w)) { out.dupes.push(w); continue; }
            this.words.unshift({ id: crypto.randomUUID(), text: w, source, learned: false, added: Date.now(), tr: {}, meaning: '', pair: builtinPair(w), pairTr: {}, example: builtinExample(w), exampleTr: {} });
            out.added.push(w);
        }
        if (out.added.length) this.emit('add', { words: out.added });
        return out;
    }

    remove(text) {
        const w = this.find(text);
        if (!w) return false;
        this.words = this.words.filter(x => x !== w);
        this.emit('remove', { words: [w.text] });
        return true;
    }

    clear() {
        this.words = [];
        this.emit('clear', {});
    }

    update(text, patch) {
        const w = this.find(text);
        if (!w) return null;
        Object.assign(w, patch);
        this.emit('update', { words: [w.text], patch });
        return w;
    }

    // Fix a misread or misspelled word. Returns { ok, word, merged, error }.
    rename(oldText, newText) {
        const w = this.find(oldText);
        const to = cleanWord(newText);
        if (!w) return { ok: false, error: `“${oldText}” is not on the list` };
        if (!isEnglishWord(to)) return { ok: false, error: 'Please type an English word.' };
        if (to === w.text) return { ok: true, word: to };
        // The new spelling is already on the list: just drop the wrong one.
        if (this.has(to)) {
            this.words = this.words.filter(x => x !== w);
            this.emit('remove', { words: [w.text] });
            return { ok: true, word: to, merged: true };
        }
        const from = w.text;
        // Translation, meaning, pair and example belonged to the old spelling.
        Object.assign(w, { text: to, tr: {}, senses: undefined, sense: undefined, meaning: '', pair: builtinPair(to), pairTr: {}, example: builtinExample(to), exampleTr: {}, fixedFrom: from });
        this.emit('rename', { words: [from, to] });
        return { ok: true, word: to };
    }

    /**
     * Bring in already-validated words (see transfer.js).
     * mode 'merge': add new words on top, and for words already here keep the best progress
     *   and fill in missing translations / meaning.
     * mode 'replace': the list becomes exactly the imported words.
     */
    importWords(items, mode = 'merge') {
        const out = { added: [], updated: [] };
        if (mode === 'replace') this.words = [];
        const fresh = [];
        for (const it of items) {
            const ex = this.find(it.text);
            if (ex) {
                ex.learned ||= it.learned;
                ex.mastered ||= it.mastered;
                ex.tr = { ...it.tr, ...ex.tr };
                ex.meaning ||= it.meaning;
                if (!ex.senses?.length && it.senses?.length) { ex.senses = it.senses; ex.sense = it.sense; }
                if (!ex.pair && it.pair) { ex.pair = it.pair; ex.pairTr = it.pairTr; } else if (ex.pair === it.pair) ex.pairTr = { ...it.pairTr, ...ex.pairTr };
                if (!ex.example && it.example) { ex.example = it.example; ex.exampleTr = it.exampleTr; } else if (ex.example === it.example) ex.exampleTr = { ...it.exampleTr, ...ex.exampleTr };
                out.updated.push(ex.text);
            } else {
                fresh.push({ id: crypto.randomUUID(), ...it });
                out.added.push(it.text);
            }
        }
        // Keep the file's order, with imported words at the top of the list.
        this.words = mode === 'replace' ? fresh : [...fresh, ...this.words];
        this.emit('import', { words: [...out.added, ...out.updated] });
        return out;
    }

    get stats() {
        const total = this.words.length;
        const learned = this.words.filter(w => w.learned).length;
        return { total, learned, pct: total ? Math.round(learned / total * 100) : 0 };
    }
}

export const store = new Store();
