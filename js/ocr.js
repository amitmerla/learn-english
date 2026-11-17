// Photo → words. Readers, best first: Shape Detection TextDetector, Gemini Nano
// image input, Tesseract.js (loaded from a CDN only when needed).
// Shows a progress bar, a live log, counters, and asks about words it can't read.

import { $, el, clock, sleep, toast, confettiAt, inlineEdit } from './util.js';
import { store, cleanWord, isEnglishWord, TINY } from './store.js';
import { engine } from './engine.js';
import { state, visionReady, lmReady, readImageWithNano, ask, speak } from './ai.js';
import { fixWord } from './words.js';
import { talk } from './voice.js';

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

const ui = {
    scan: $('#scan'), img: $('#scan-img'), stage: $('#scan-stage'), engine: $('#scan-engine'),
    bar: $('#scan-bar'), pct: $('#scan-pct'), log: $('#scan-log'),
    found: $('#ss-found'), ok: $('#ss-ok'), unsure: $('#ss-unsure'), skip: $('#ss-skip'),
    unsureBox: $('#unsure'), unsureList: $('#unsure-list'),
    recogBox: $('#recog'), recogList: $('#recog-list'),
};
let counts = { found: 0, ok: 0, unsure: 0, skip: 0 };
let bitmap = null;
let running = false;

/* ---------------------------------------------------------------- ui helpers */

function progress(p, stage) {
    const v = Math.max(0, Math.min(100, Math.round(p)));
    ui.bar.style.width = `${v}%`;
    ui.pct.textContent = `${v}%`;
    if (stage) ui.stage.textContent = stage;
}

function line(icon, text, cls = '') {
    ui.log.append(el('li', {}, el('time', { text: clock() }), el('span', { class: cls, text: `${icon} ${text}` })));
    ui.log.scrollTop = ui.log.scrollHeight;
}

function count(key, n = 1) {
    counts[key] += n;
    const node = ui[key];
    node.textContent = counts[key];
    node.parentElement.classList.remove('bump');
    void node.offsetWidth;
    node.parentElement.classList.add('bump');
}

function reset(file) {
    counts = { found: 0, ok: 0, unsure: 0, skip: 0 };
    ['found', 'ok', 'unsure', 'skip'].forEach(k => { ui[k].textContent = '0'; });
    ui.log.replaceChildren();
    ui.unsureList.replaceChildren();
    ui.unsureBox.hidden = true;
    ui.recogList.replaceChildren();
    ui.recogBox.hidden = true;
    ui.scan.hidden = false;
    ui.scan.classList.remove('done');
    ui.img.src = URL.createObjectURL(file);
    progress(0, 'Opening your photo…');
    ui.scan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------------------------------------------------------------- readers */

// Each reader returns [{ text, conf (0-100 or null), sure (bool or null), box ({x,y,w,h} or null) }]

async function readTextDetector(run) {
    const s = run.step('🔤', 'TextDetector is scanning the photo');
    progress(20, 'Looking for text…');
    const blocks = await new TextDetector().detect(bitmap);
    s.done(`${blocks.length} lines`);
    const out = [];
    for (const b of blocks) {
        const raw = b.rawValue ?? '';
        const box = b.boundingBox;
        const total = raw.length || 1;
        let idx = 0;
        for (const piece of raw.split(/(\s+)/)) {
            if (piece.trim()) {
                out.push({
                    text: piece, conf: null, sure: null,
                    box: { x: box.x + box.width * idx / total, y: box.y, w: box.width * piece.length / total, h: box.height },
                });
            }
            idx += piece.length;
        }
    }
    progress(60);
    return out;
}

async function readNano(run, file) {
    progress(15, 'Gemini Nano is looking at your photo…');
    let p = 15;
    const tick = setInterval(() => { p = Math.min(65, p + 1.5); progress(p); }, 250);
    try {
        const words = await readImageWithNano(file, run);
        return words.flatMap(w => String(w.text).split(/\s+/).map(t => ({ text: t, conf: null, sure: w.sure, box: null })));
    } finally { clearInterval(tick); progress(65); }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (globalThis.Tesseract) return resolve();
        const s = el('script', { src, onload: resolve, onerror: () => reject(new Error('Could not download Tesseract (are you online?)')) });
        document.head.append(s);
    });
}

async function readTesseract(run, file) {
    const s1 = run.step('📦', 'Downloading the Tesseract reader');
    progress(8, 'Getting the word reader ready…');
    await loadScript(TESSERACT_URL);
    s1.done();
    const s2 = run.step('🔤', 'Tesseract is reading the photo');
    let lastStatus = '';
    const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
            if (m.status !== lastStatus) { lastStatus = m.status; line('⚙️', m.status, 'info'); }
            const base = m.status.includes('recogniz') ? 30 : 10;
            const span = m.status.includes('recogniz') ? 35 : 18;
            progress(base + span * (m.progress || 0), m.status.includes('recogniz') ? 'Reading the words…' : 'Getting the word reader ready…');
            s2.set(`${m.status} ${Math.round((m.progress || 0) * 100)}%`);
        },
    });
    const { data } = await worker.recognize(file);
    await worker.terminate();
    s2.done(`${data.words?.length ?? 0} words`);
    return (data.words ?? []).map(w => ({
        text: w.text, conf: w.confidence, sure: null,
        box: { x: w.bbox.x0, y: w.bbox.y0, w: w.bbox.x1 - w.bbox.x0, h: w.bbox.y1 - w.bbox.y0 },
    }));
}

const READERS = {
    textdetector: { name: 'Text Detector', ok: () => state.ocr.status === 'available', run: readTextDetector },
    nano: { name: 'Gemini Nano vision', ok: () => visionReady(), run: readNano },
    tesseract: { name: 'Tesseract (web)', ok: () => true, run: readTesseract },
};

/* ---------------------------------------------------------------- checking words */

// Ask Nano which tokens are real English words, to catch misreads like "jungie".
async function aiCheck(words) {
    if (!lmReady() || !words.length || words.length > 80) return {};
    try {
        const r = await ask({
            title: `Check ${words.length} words from the photo`, icon: '🔍',
            prompt: `These words were read from a photo of a child's English word list. Some may be misread. For each, say if it is a real English word. If not, suggest the most likely real word it was meant to be (or empty).\nWords: ${words.join(', ')}`,
            schema: {
                type: 'object',
                properties: { words: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, real: { type: 'boolean' }, fix: { type: 'string' } }, required: ['text', 'real', 'fix'] } } },
                required: ['words'],
            },
        });
        return Object.fromEntries(r.words.map(w => [cleanWord(w.text), w]));
    } catch { return {}; }
}

function crop(box) {
    if (!box || !bitmap) return null;
    const pad = 6;
    const sx = Math.max(0, box.x - pad), sy = Math.max(0, box.y - pad);
    const sw = Math.min(bitmap.width - sx, box.w + pad * 2), sh = Math.min(bitmap.height - sy, box.h + pad * 2);
    if (sw < 2 || sh < 2) return null;
    const c = el('canvas');
    const scale = Math.min(3, 54 / sh);
    c.width = sw * scale; c.height = sh * scale;
    c.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
}

function askUnsure(item) {
    ui.unsureBox.hidden = false;
    const inp = el('input', { value: item.guess, placeholder: 'Type the word', 'aria-label': 'What is this word?' });
    const node = el('div', { class: 'unsure-item' });
    const pic = crop(item.box);
    const done = (text, cls = 'resolved') => {
        node.classList.add(cls);
        node.querySelector('.unsure-row').replaceChildren(el('span', { class: 'guess', text }));
    };
    const add = () => {
        const w = cleanWord(inp.value);
        if (!isEnglishWord(w)) { inp.focus(); return toast('Please type an English word.', { icon: '✏️' }); }
        const r = store.add(w, 'image');
        line('🙌', `You told me “${item.raw}” is “${w}”`, 'ok');
        done(r.added.length ? `✅ Added “${w}”` : `👀 “${w}” is already on the list`);
        if (r.added.length) { count('ok'); confettiAt(node, 30); }
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    node.append(
        pic ?? el('div', { class: 'guess', text: '(no picture for this one)' }),
        el('div', { class: 'guess', html: `I read: <b>${item.raw.replace(/[<>&]/g, '')}</b>${item.hint ? ` · maybe <b>${item.hint}</b>?` : ''}` }),
        el('div', { class: 'unsure-row' }, inp,
            el('button', { class: 'btn btn-xs btn-primary', text: 'Add', 'data-tip': 'Add this word to your list.', onclick: add }),
            el('button', { class: 'btn btn-xs', text: 'Skip', 'data-tip': 'This is not a word. Skip it.', onclick: () => { done('⏭ Skipped'); line('⏭', `Skipped “${item.raw}”`); } })));
    ui.unsureList.append(node);
}

// A recognized word the child can still fix (or remove) if the reader got it wrong.
function reviewChip(item) {
    let current = item.word;
    const label = el('span', { class: 'rc-word', text: current });
    const sure = item.conf != null ? el('small', { text: `${Math.round(item.conf)}%` }) : null;
    const chip = el('span', { class: 'recog-chip', 'data-tip': 'Tap to fix this word if I read it wrong.' });

    const edit = () => {
        if (chip.classList.contains('editing') || chip.classList.contains('removed')) return;
        if (!store.has(current)) return toast(`“${current}” is not on your list anymore.`, { icon: '👀' });
        chip.classList.add('editing');
        const pic = crop(item.box);
        if (pic) chip.prepend(pic);
        inlineEdit(label, current, v => {
            const before = current;
            const r = fixWord(before, v);
            if (!r.ok) return;
            current = r.word;
            label.textContent = current;
            sure?.remove();
            chip.classList.add('fixed');
            line('✏️', `You fixed “${before}” → “${current}”`, 'ok');
        }, () => { pic?.remove(); chip.classList.remove('editing'); });
    };

    const remove = el('button', { class: 'rc-x', text: '✕', 'aria-label': `Remove ${current}`, 'data-tip': 'This is not a real word. Remove it from my list.' });
    remove.addEventListener('click', e => {
        e.stopPropagation();
        store.remove(current);
        chip.classList.add('removed');
        line('🗑', `Removed “${current}”`);
    });

    chip.append(label, sure ?? '', remove);
    chip.addEventListener('click', edit);
    chip.tabIndex = 0;
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === chip) edit(); });
    ui.recogList.append(chip);
}

/* ---------------------------------------------------------------- main */

export async function scanImage(file) {
    if (!file?.type?.startsWith('image/')) return toast('Please choose a picture file 🖼️', { icon: '🤔' });
    if (running) return toast('I am still reading the last photo. One moment!', { icon: '⏳' });
    running = true;
    reset(file);
    const run = engine.start({ title: `Read words from “${file.name || 'pasted photo'}”`, icon: '📷', prompt: `${file.type}, ${(file.size / 1024).toFixed(0)} KB` });

    try {
        bitmap = await createImageBitmap(file);
        line('📷', `Photo loaded: ${bitmap.width}×${bitmap.height} pixels`, 'info');
        progress(5);

        // Pick a reader, falling back down the list when one fails.
        const choice = $('#ocr-engine').value;
        const order = choice === 'auto' ? ['textdetector', 'nano', 'tesseract'] : [choice, ...['textdetector', 'nano', 'tesseract'].filter(x => x !== choice)];
        let tokens = null;
        for (const id of order) {
            const r = READERS[id];
            if (!r.ok()) { if (id === choice) line('⚠️', `${r.name} is not available here, trying another reader`, 'warn'); continue; }
            ui.engine.textContent = r.name;
            run.meta.textContent = r.name;
            line('🔍', `Reading with ${r.name}…`, 'info');
            try {
                tokens = await r.run(run, file);
                break;
            } catch (e) {
                line('⚠️', `${r.name} had a problem: ${e.message}`, 'err');
            }
        }
        if (!tokens) throw new Error('No reader could read this photo.');

        counts.found = 0;
        count('found', tokens.length);
        line('🧩', `Found ${tokens.length} pieces of text`, 'info');
        progress(70, 'Checking each word…');

        // Sort tokens into skip / recognized / unsure.
        const skipTiny = $('#skip-tiny').checked;
        const seen = new Set();
        const good = [];
        const unsure = [];
        let skipped = { number: 0, tiny: 0, dupe: 0 };
        for (const t of tokens) {
            const w = cleanWord(t.text);
            if (!w || /^\d+$/.test(t.text.replace(/[^\w]/g, ''))) { skipped.number++; continue; }
            if (skipTiny && TINY.has(w)) { skipped.tiny++; continue; }
            if (seen.has(w) || store.has(w)) { skipped.dupe++; continue; }
            seen.add(w);
            const clear = isEnglishWord(w) && (w.length > 1 || w === 'a' || w === 'i') && (t.conf == null || t.conf >= 70) && t.sure !== false;
            (clear ? good : unsure).push({ ...t, raw: t.text, word: w, guess: w.replace(/[^a-z'-]/g, '') });
        }

        // Second opinion from Nano on the "clear" words, for readers without confidence.
        const verdict = (choice !== 'nano' && ui.engine.textContent !== 'Gemini Nano vision') ? await aiCheck(good.map(g => g.word)) : {};
        if (Object.keys(verdict).length) line('🧠', 'Gemini Nano double-checked the words', 'info');

        const sk = skipped.number + skipped.tiny + skipped.dupe;
        if (sk) {
            count('skip', sk);
            line('⏭', `Skipped ${sk}: ${skipped.number} numbers/marks, ${skipped.tiny} tiny words, ${skipped.dupe} already on the list`);
        }

        const toAdd = [];
        const goodItems = [];
        const all = [...good, ...unsure];
        for (let i = 0; i < all.length; i++) {
            const g = all[i];
            const v = verdict[g.word];
            const isGood = i < good.length && (!v || v.real);
            if (isGood) {
                toAdd.push(g.word);
                goodItems.push(g);
                count('ok');
                line('✅', `Recognized “${g.word}”${g.conf != null ? ` (${Math.round(g.conf)}% sure)` : ''}`, 'ok');
            } else {
                count('unsure');
                const hint = v?.fix && cleanWord(v.fix) !== g.word ? cleanWord(v.fix) : '';
                line('❓', `Not sure about “${g.raw}”${g.conf != null ? ` (${Math.round(g.conf)}% sure)` : ''}${hint ? `, maybe “${hint}”` : ''}`, 'warn');
                askUnsure({ ...g, hint, guess: hint || g.guess });
            }
            progress(70 + 25 * (i + 1) / all.length);
            await sleep(Math.min(90, 1400 / all.length));
        }

        const added = new Set(store.add(toAdd, 'image').added);
        goodItems.filter(g => added.has(g.word)).forEach(reviewChip);
        ui.recogBox.hidden = !added.size;
        progress(100, counts.unsure ? `Done! Please help me with ${counts.unsure} word${counts.unsure > 1 ? 's' : ''} 👇` : 'All done! 🎉');
        ui.scan.classList.add('done');
        const summary = `Found ${counts.found} · recognized ${counts.ok} · not sure ${counts.unsure} · skipped ${counts.skip}`;
        line('🏁', summary, 'ok');
        run.step('🏁', summary).done('', '✅');
        run.finish(true, `Added: ${toAdd.join(', ') || '(none)'}${counts.unsure ? `\nNeeds help: ${unsure.map(u => u.raw).join(', ')}` : ''}`);
        if (toAdd.length) {
            confettiAt(ui.scan, 100);
            talk(`I found ${toAdd.length} new word${toAdd.length > 1 ? 's' : ''}!${counts.unsure ? ' Can you help me with the others?' : ''}`,
                `${toAdd.length === 1 ? 'מצאתי מילה חדשה אחת!' : `מצאתי ${toAdd.length} מילים חדשות!`}${counts.unsure ? ' אפשר לעזור לי עם השאר?' : ''}`);
        } else if (counts.unsure) talk('Can you help me read these words?', 'אפשר לעזור לי לקרוא את המילים האלה?');
    } catch (e) {
        progress(100, 'Oh no, I could not read this photo 😕');
        ui.scan.classList.add('done');
        line('❌', e.message, 'err');
        run.finish(false, e.message);
    } finally {
        running = false;
    }
}

export function initOcr() {
    const drop = $('#drop');
    const file = $('#file-input');
    file.addEventListener('change', () => { if (file.files[0]) scanImage(file.files[0]); file.value = ''; });

    const panel = $('#words-panel');
    ['dragenter', 'dragover'].forEach(t => panel.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => panel.addEventListener(t, e => {
        if (t === 'dragleave' && panel.contains(e.relatedTarget)) return;
        drop.classList.remove('over');
    }));
    panel.addEventListener('drop', e => {
        e.preventDefault();
        const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
        if (f) scanImage(f);
    });

    document.addEventListener('paste', e => {
        const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
        if (item) { e.preventDefault(); scanImage(item.getAsFile()); }
    });

    $('#scan-close').addEventListener('click', () => { if (!running) ui.scan.hidden = true; });
}
