// Word lists from Word files (.docx and the older .doc), read right here in the browser:
// nothing is uploaded. .docx is a zip with the text in word/document.xml; .doc is a
// "compound file" whose text is found through its piece table. RTF or web pages saved
// with a .doc name are read too. Then the pupil picks which of the found words to add.

import { $, el, toast, confettiAt } from './util.js';
import { store, cleanWord, TINY } from './store.js';
import { builtinSenses, matchSense, pickPatch } from './senses.js';

const WORD_TYPES = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf', 'text/rtf',
];
export const isWordFile = f => !!f && (WORD_TYPES.includes(f.type) || /\.(docx?|dotx?|rtf)$/i.test(f.name ?? ''));

/* ---------------------------------------------------------------- reading the file */

const concat = parts => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
};

// One file out of a zip (.docx), using the browser's own inflate.
async function unzip(buf, name) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let end = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('This Word file looks broken.');
    let p = dv.getUint32(end + 16, true);
    for (let i = dv.getUint16(end + 10, true); i > 0; i--) {
        const method = dv.getUint16(p + 10, true);
        const size = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true);
        const skip = nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
        const local = dv.getUint32(p + 42, true);
        if (new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen)) === name) {
            const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
            const data = buf.subarray(start, start + size);
            if (method === 0) return data;
            if (method !== 8) throw new Error('This Word file is packed in a way I cannot open.');
            const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        }
        p += 46 + skip;
    }
    return null;
}

// Paragraphs become lines; table cells in a row are kept on one line, split by tabs,
// so "apple | תפוח" in a table stays together.
function docxText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    let out = '';
    const walk = (node, inCell) => {
        for (const c of node.children) {
            switch (c.localName) {
                case 't': out += c.textContent; break;
                case 'tab': out += '\t'; break;
                case 'br': case 'cr': out += inCell ? ' ' : '\n'; break;
                case 'instrText': case 'delText': break;
                case 'tc': walk(c, true); out += '\t'; break;
                case 'tr': walk(c, inCell); out += '\n'; break;
                case 'p': walk(c, inCell); out += inCell ? ' ' : '\n'; break;
                default: walk(c, inCell);
            }
        }
    };
    walk(doc.documentElement, false);
    return out;
}

// The streams inside an old-style compound file (.doc).
function compoundFile(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const ss = 1 << dv.getUint16(0x1E, true);
    const ms = 1 << dv.getUint16(0x20, true);
    const sector = s => buf.subarray((s + 1) * ss, (s + 2) * ss);

    const fatSectors = [];
    for (let i = 0; i < 109; i++) { const s = dv.getInt32(0x4C + i * 4, true); if (s >= 0) fatSectors.push(s); }
    for (let d = dv.getInt32(0x44, true), k = dv.getUint32(0x48, true); d >= 0 && k > 0; k--) {
        const sdv = new DataView(buf.buffer, buf.byteOffset + (d + 1) * ss, ss);
        for (let i = 0; i < ss / 4 - 1; i++) { const s = sdv.getInt32(i * 4, true); if (s >= 0) fatSectors.push(s); }
        d = sdv.getInt32(ss - 4, true);
    }
    const ints = bytes => { const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); return Array.from({ length: bytes.length / 4 }, (_, i) => v.getInt32(i * 4, true)); };
    const fat = fatSectors.flatMap(s => ints(sector(s)));
    // A chain ends on a negative number; the length guard stops a broken file from looping forever.
    const chain = (start, table) => { const out = []; for (let s = start; s >= 0 && out.length <= table.length; s = table[s]) out.push(s); return out; };
    const big = (start, size = Infinity) => concat(chain(start, fat).map(sector)).subarray(0, size);

    const dir = big(dv.getInt32(0x30, true));
    const ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    const entries = [];
    for (let o = 0; o + 128 <= dir.length; o += 128) {
        const len = ddv.getUint16(o + 0x40, true);
        entries.push({
            name: new TextDecoder('utf-16le').decode(dir.subarray(o, o + Math.max(0, len - 2))),
            type: dir[o + 0x42], start: ddv.getInt32(o + 0x74, true), size: ddv.getUint32(o + 0x78, true),
        });
    }
    const mini = big(entries[0].start, entries[0].size);
    const miniFat = concat(chain(dv.getInt32(0x3C, true), fat).map(sector));
    const miniTable = ints(miniFat);
    const small = (start, size) => concat(chain(start, miniTable).map(s => mini.subarray(s * ms, (s + 1) * ms))).subarray(0, size);
    const cutoff = dv.getUint32(0x38, true);
    return name => {
        const e = entries.find(x => x.name === name && x.type === 2);
        return e ? (e.size < cutoff ? small(e.start, e.size) : big(e.start, e.size)) : null;
    };
}

// The main text of a Word 97–2003 document, found through its piece table.
function docText(buf) {
    const stream = compoundFile(buf);
    const wd = stream('WordDocument');
    if (!wd) throw new Error('I could not find any text in this Word file.');
    const dv = new DataView(wd.buffer, wd.byteOffset, wd.byteLength);
    if (dv.getUint16(0, true) !== 0xA5EC) throw new Error('This Word file is too old for me. Save it again as .docx and try once more.');
    const flags = dv.getUint16(0x0A, true);
    if (flags & 0x0100) throw new Error('This Word file is locked with a password.');
    const table = stream(flags & 0x0200 ? '1Table' : '0Table');
    const ccpText = dv.getInt32(0x4C, true);
    const fcClx = dv.getUint32(0x1A2, true);
    const clx = table.subarray(fcClx, fcClx + dv.getUint32(0x1A6, true));
    const cdv = new DataView(clx.buffer, clx.byteOffset, clx.byteLength);
    let p = 0;
    while (clx[p] === 0x01) p += 3 + cdv.getUint16(p + 1, true);
    if (clx[p] !== 0x02) throw new Error('This Word file looks broken.');
    const plc = p + 5;
    const n = (cdv.getUint32(p + 1, true) - 4) / 12;
    let text = '';
    for (let i = 0; i < n && text.length < ccpText; i++) {
        const len = cdv.getInt32(plc + (i + 1) * 4, true) - cdv.getInt32(plc + i * 4, true);
        let fc = cdv.getUint32(plc + (n + 1) * 4 + i * 8 + 2, true);
        if (fc & 0x40000000) {
            fc = (fc & ~0x40000000) / 2;
            text += new TextDecoder('windows-1252').decode(wd.subarray(fc, fc + len));
        } else {
            text += new TextDecoder('utf-16le').decode(wd.subarray(fc, fc + len * 2));
        }
    }
    return text.slice(0, ccpText)
        // Fields (links, page numbers): drop the instruction, keep what is shown.
        .replace(/\x13[^\x13\x14\x15]*\x14/g, '').replace(/\x13[^\x13\x14\x15]*\x15/g, '').replace(/[\x14\x15]/g, '')
        // Each table cell ends with a mark; a second mark ends the row.
        .replace(/\x07\x07/g, '\t\n').replace(/\x07/g, '\t').replace(/\r/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
}

// Groups that hold settings, not text (fonts, colors, styles, lists, pictures).
const RTF_SKIP = /^\{\\(\*|fonttbl|colortbl|stylesheet|info|listtable|listoverridetable|pict|header|footer|themedata|latentstyles)/;

function rtfText(rtf) {
    let out = '';
    for (let i = 0; i < rtf.length; i++) {
        if (rtf[i] === '{' && RTF_SKIP.test(rtf.slice(i, i + 24))) {
            for (let depth = 0; i < rtf.length; i++) {
                if (rtf[i] === '\\') i++;
                else if (rtf[i] === '{') depth++;
                else if (rtf[i] === '}' && --depth === 0) break;
            }
            continue;
        }
        out += rtf[i];
    }
    return out
        .replace(/\\(par|line|row)\b ?/g, '\n').replace(/\\(cell|tab)\b ?/g, '\t')
        // \u1488? is a Unicode letter (Hebrew is written this way), followed by a stand-in for old readers.
        .replace(/\\u(-?\d+) ?(\\'[0-9a-f]{2}|\?)?/gi, (_, n) => String.fromCharCode(n < 0 ? +n + 65536 : +n))
        .replace(/\\'[0-9a-f]{2}/gi, ' ')
        .replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
}

/** The text of a Word file, lines for paragraphs and tabs between table cells. */
export async function readWordFile(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0x50 && buf[1] === 0x4B) {
        const xml = await unzip(buf, 'word/document.xml');
        if (!xml) throw new Error('I could not find any text in this Word file.');
        return docxText(new TextDecoder().decode(xml));
    }
    if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return docText(buf);
    const head = new TextDecoder().decode(buf.subarray(0, 2000));
    if (head.startsWith('{\\rtf')) return rtfText(new TextDecoder('windows-1252').decode(buf));
    if (/<html|<body|<p[\s>]/i.test(head)) {
        const doc = new DOMParser().parseFromString(new TextDecoder().decode(buf), 'text/html');
        doc.querySelectorAll('td, th').forEach(c => c.append('\t'));
        doc.querySelectorAll('p, div, li, tr, br, h1, h2, h3').forEach(c => c.append('\n'));
        return doc.body?.textContent ?? '';
    }
    throw new Error('This does not look like a Word file.');
}

/* ---------------------------------------------------------------- finding the words */

const HEBREW = /[֐-׿]/;

// Words that are usually part of the worksheet, not the word list. They are shown, but not chosen.
const LABELS = new Set(['name', 'date', 'unit', 'page', 'lesson', 'words', 'word', 'worksheet', 'exercise', 'learn']);

/**
 * Words and short phrases (up to 2 words, like "ice cream") from the text. Hebrew next to one
 * English word, like "apple - תפוח", a table row "apple | תפוח", or on the line right under it,
 * is kept as its translation. Returns [{ text, he, label }].
 */
export function findWords(text) {
    const found = new Map();
    let last = null;
    for (const raw of text.split('\n')) {
        const items = [];
        const hebrew = [];
        for (let piece of raw.split(/\t|[,;•·|/()[\]]|\s[-–—=:]\s?|\s?[–—=:]\s/)) {
            piece = piece.replace(/^\s*(\d+|[a-z])\s*[.)]\s+/i, '').replace(/^\s*\d+\s*/, '');
            if (HEBREW.test(piece)) hebrew.push(piece.replace(/[^֐-׿\s'"׳״-]/g, '').trim());
            const latin = piece.replace(/[’‘`]/g, "'").replace(/[^A-Za-z' -]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (!/[A-Za-z]{2}/.test(latin)) continue;
            const words = latin.split(' ');
            if (words.length <= 2) items.push(latin);
            // A whole sentence: keep its real words, not the tiny ones.
            else items.push(...words.filter(w => w.length > 1 && !w.includes("'") && !TINY.has(w.toLowerCase())));
        }
        const he = hebrew.filter(Boolean).join(' ').trim();
        // A Hebrew-only line translates the single English word on the line above it.
        if (!items.length) {
            if (he && last && !last.he && he.split(/\s+/).length <= 3) last.he = he;
            last = null;
            continue;
        }
        last = null;
        for (const it of items) {
            const w = cleanWord(it);
            if (!w || !/^[a-z][a-z' -]*$/.test(w)) continue;
            let word = found.get(w);
            if (!word) found.set(w, word = { text: w, he: '', label: LABELS.has(w) });
            if (items.length === 1) {
                if (he && !word.he) word.he = he;
                last = word;
            }
        }
    }
    return [...found.values()];
}

/* ---------------------------------------------------------------- choose and add */

const ui = {};

function paintCount() {
    const n = ui.words.querySelectorAll('.doc-word[aria-pressed="true"]').length;
    ui.add.disabled = !n;
    ui.add.textContent = n === 1 ? 'Add 1 word' : `Add ${n} words`;
}

/** Read a Word file, show the words found in it, and add the ones the pupil keeps. */
export async function importWordFile(file) {
    let text;
    try {
        text = await readWordFile(file);
    } catch (e) {
        toast(e.message || 'I could not open this Word file.', { icon: '😕', ms: 6000 });
        return;
    }
    const found = findWords(text);
    if (!found.length) {
        toast(`I could not find English words in “${file.name}”.`, { icon: '🤔', ms: 6000 });
        return;
    }
    const fresh = found.filter(w => !store.has(w.text)).length;
    ui.title.textContent = `I found ${found.length} word${found.length === 1 ? '' : 's'}!`;
    ui.text.textContent = `In “${file.name}”. Tap a word to leave it out${fresh < found.length ? ', words you already have are greyed out' : ''}.`;
    ui.words.replaceChildren(...found.map((w, i) => {
        const have = store.has(w.text);
        return el('button', {
            class: `doc-word${have ? ' have' : ''}`, type: 'button', disabled: have,
            'aria-pressed': String(!have && !w.label), 'data-word': w.text, 'data-he': w.he || null,
            style: { animationDelay: `${Math.min(i, 30) * 25}ms` },
            title: have ? 'Already on your list' : null,
            onclick: e => { const b = e.currentTarget; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); paintCount(); },
        }, el('b', { text: w.text }), w.he ? el('small', { dir: 'rtl', text: w.he }) : '');
    }));
    paintCount();
    ui.modal.returnValue = '';
    ui.modal.showModal();
}

function addChosen() {
    const chosen = [...ui.words.querySelectorAll('.doc-word[aria-pressed="true"]')];
    const r = store.add(chosen.map(b => b.dataset.word), 'file');
    // Translations written in the file, kept as the Hebrew translation of the word.
    for (const b of chosen) {
        if (!b.dataset.he || !r.added.includes(b.dataset.word)) continue;
        const w = store.find(b.dataset.word);
        if (!w || w.tr?.he) continue;
        // A word with several meanings: the file's Hebrew tells which one the lesson means.
        const senses = builtinSenses(w.text, 'he');
        const i = senses ? matchSense(senses, b.dataset.he, 'he') : -1;
        store.update(w.text, i >= 0 ? { ...pickPatch(w, senses, i, 'he'), tr: { ...w.tr, he: b.dataset.he } } : { senses: [], tr: { ...w.tr, he: b.dataset.he } });
    }
    if (r.added.length) {
        toast(r.added.length === 1 ? `Added “${r.added[0]}”!` : `Added ${r.added.length} words from your file!`, { icon: '📄' });
        confettiAt($('#drop'), 30 + r.added.length * 3);
    }
}

export function initDocFile() {
    Object.assign(ui, { modal: $('#docfile-modal'), title: $('#docfile-title'), text: $('#docfile-text'), words: $('#docfile-words'), add: $('#docfile-add') });
    $('#docfile-all').addEventListener('click', () => { ui.words.querySelectorAll('.doc-word:not(.have)').forEach(b => b.setAttribute('aria-pressed', 'true')); paintCount(); });
    $('#docfile-none').addEventListener('click', () => { ui.words.querySelectorAll('.doc-word').forEach(b => b.setAttribute('aria-pressed', 'false')); paintCount(); });
    ui.modal.addEventListener('close', () => { if (ui.modal.returnValue === 'add') addChosen(); });
}
