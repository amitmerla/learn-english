// (a) AI Powers panel: one live card per built-in AI feature.

import { $, el } from './util.js';
import { FEATURES, state, bus, checkAll, downloadFeature, setNativeTools, nativeTools } from './ai.js';

const list = $('#features-list');
const nodes = {};

const STATUS_TIPS = {
    available: 'Ready to use right now!',
    emulated: 'Works, but in a simpler way.',
    downloadable: 'Your browser can download this. Click the button to get it.',
    downloading: 'Downloading… please wait.',
    unavailable: 'Your browser does not have this yet.',
    checking: 'Checking…',
    active: 'Working right now!',
};

function build(f, i) {
    const badge = el('span', { class: 'badge' }, el('i'), el('span'));
    const side = el('div', { class: 'feature-side' }, badge);
    const card = el('div', { class: 'feature', style: { animationDelay: `${i * 50}ms` } },
        el('div', { class: 'feature-icon', text: f.icon }),
        el('div', { class: 'feature-body' },
            el('div', { class: 'feature-name', text: f.name }),
            el('div', { class: 'feature-desc', text: f.desc }),
            el('div', { class: 'feature-api', text: f.api })),
        side,
        el('div', { class: 'feature-progress' }));

    if (f.id === 'tools') {
        const sw = el('input', { type: 'checkbox', onchange: e => setNativeTools(e.target.checked) });
        sw.checked = nativeTools;
        side.append(el('label', { class: 'switch', 'data-tip': 'Experimental: let Gemini Nano call the tools by itself (native tool use). When off, Buddy plans tool calls with JSON.' }, 'native', sw));
    }

    const dl = el('button', { class: 'btn btn-xs', text: 'Get it', hidden: true, 'data-tip': 'Download this AI model to your computer. It can take a few minutes the first time.', onclick: () => downloadFeature(f.id) });
    side.append(dl);
    nodes[f.id] = { card, badge, dl };
    return card;
}

function paint(id) {
    const f = FEATURES.find(x => x.id === id);
    const s = state[id];
    const n = nodes[id];
    n.card.dataset.status = s.status;
    n.badge.lastChild.textContent = s.label;
    const canDownload = s.status === 'downloadable' && ['prompt', 'vision', 'translator', 'detector'].includes(id);
    n.dl.hidden = !canDownload;
    n.card.querySelector('.feature-progress').style.width = s.status === 'downloading' ? `${(s.progress || 0) * 100}%` : '0';
    const tip = [STATUS_TIPS[s.status], s.note, s.status === 'unavailable' && f.flag ? `To turn it on, try ${f.flag}` : ''].filter(Boolean).join(' ');
    n.card.dataset.tip = `${f.name}: ${tip}`;
    meter();
}

function meter() {
    const total = FEATURES.length;
    const ready = FEATURES.filter(f => ['available', 'active', 'emulated'].includes(state[f.id].status)).length;
    const checking = FEATURES.some(f => state[f.id].status === 'checking');
    $('#power-count').textContent = ready;
    $('#power-total').textContent = `/${total}`;
    const c = 2 * Math.PI * 27;
    const ring = $('#power-ring');
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c * (1 - ready / total);
    $('#power-headline').textContent = checking ? 'Checking your browser…'
        : ready === total ? 'Full power! 🚀'
        : ready >= total * .6 ? 'Great! Most powers are on ⚡'
        : ready >= 3 ? 'Some powers are on 🙂'
        : 'Basic mode 🐢';
    const dl = FEATURES.filter(f => state[f.id].status === 'downloadable').length;
    $('#power-sub').textContent = checking ? 'Looking for AI powers' : `${ready} of ${total} ready${dl ? ` · ${dl} can be downloaded` : ''}`;
}

/* ---------------------------------------------------------------- folding */

const FOLD_KEY = 'wordwizard.features.folded';

function setFolded(on) {
    document.body.classList.toggle('features-folded', on);
    const btn = $('#features-fold');
    btn.setAttribute('aria-expanded', String(!on));
    btn.setAttribute('aria-label', on ? 'Open AI Powers' : 'Fold AI Powers');
    btn.dataset.tip = on ? 'Open the AI Powers panel.' : 'Fold this panel to make more room.';
    try { localStorage.setItem(FOLD_KEY, on ? '1' : '0'); } catch { /* not saved, still works */ }
}

function initFold() {
    // Folded by default; stays open only after the pupil opens it.
    let folded = true;
    try { folded = localStorage.getItem(FOLD_KEY) !== '0'; } catch { /* ignore */ }
    setFolded(folded);
    $('#features-fold').addEventListener('click', e => {
        e.stopPropagation();
        setFolded(!document.body.classList.contains('features-folded'));
    });
    // When folded, a click anywhere on the slim panel opens it again.
    $('#features-panel').addEventListener('click', e => {
        if (document.body.classList.contains('features-folded') && !e.target.closest('button')) setFolded(false);
    });
}

export async function initFeatures() {
    FEATURES.forEach((f, i) => list.append(build(f, i)));
    FEATURES.forEach(f => paint(f.id));
    bus.addEventListener('feature', e => paint(e.detail.id));
    $('#features-refresh').addEventListener('click', () => checkAll());
    initFold();
    await checkAll();
}
