// My Blog: plan (model + tips + ideas), write (editor with live checks and Buddy), publish.

import { $, $$, el, esc, confetti, confettiAt } from '../util.js';
import { initTooltips } from '../tooltip.js';
import { checkAll, lmReady, speak, stopSpeaking } from '../ai.js';
import { initEngine } from '../engine.js';
import { store } from '../store.js';
import { badgeSVG } from '../profile.js';
import { initNiqqudView } from '../niqqud-view.js';
import { mixed, say, sayEn } from '../grammar/gen.js';
import { MODEL, TIPS, PLAN, CHECK_HE } from './data.js';
import { checkText, applyFix, stats } from './checks.js';
import { initBuddy } from './buddy.js';

initTooltips();
initEngine();

/* ---------------------------------------------------------------- saved work */

const KEY = 'wordwizard.blog.v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } })();
const blog = { name: '', notes: {}, text: '', ...saved };
let saveTimer = 0;
const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(blog)); } catch { /* private mode */ } }, 300);
};

const profile = store.prefs.profile;
const latinName = /^[A-Za-z][A-Za-z' -]*$/.test(profile?.name ?? '') ? profile.name.trim() : '';
if (!blog.name) blog.name = latinName ? `${latinName}'s Blog` : 'My Blog';

/* ---------------------------------------------------------------- header + tabs */

initNiqqudView($('#g-niqqud'), () => requestAnimationFrame(moveInk));

const TABS = ['plan', 'write', 'publish'];
const ink = $('.g-tab-ink');
function moveInk() {
    const b = $('.g-tabs [aria-selected="true"]');
    ink.style.width = `${b.offsetWidth}px`;
    ink.style.transform = `translateX(${b.offsetLeft}px)`;
}
function showTab(name) {
    if (!TABS.includes(name)) name = 'plan';
    $$('.g-tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    TABS.forEach(t => { $(`#tab-${t}`).hidden = t !== name; });
    const panel = $(`#tab-${name}`);
    panel.classList.remove('enter');
    void panel.offsetWidth;
    panel.classList.add('enter');
    moveInk();
    if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
    stopSpeaking();
    if (name === 'write') { paintEditor(); setTimeout(() => ui.text.focus({ preventScroll: true }), 300); }
    if (name === 'publish') paintPublish();
    scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.g-tabs [role="tab"]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
addEventListener('resize', moveInk);
document.fonts?.ready.then(moveInk);
// Tab widths also change when the ניקוד switch or the fonts change the labels.
new ResizeObserver(moveInk).observe($('.g-tabs'));

/* ---------------------------------------------------------------- the blog window (model + yours) */

const paragraphsOf = text => text.split(/\n+/).map(p => p.trim()).filter(Boolean);

function blogWindow({ title, avatar, paragraphs, labels = [], counts, when }) {
    return el('div', { class: 'bw' },
        el('div', { class: 'bw-bar', 'aria-hidden': 'true' },
            el('span', { class: 'bw-dots' }, el('i'), el('i'), el('i')),
            el('span', { class: 'bw-url', text: `www.${title.toLowerCase().replace(/[^a-z]+/g, '') || 'myblog'}.com` })),
        el('nav', { class: 'bw-nav', 'aria-hidden': 'true' }, ['HOME', 'ABOUT ME', 'BLOG', 'GALLERY', 'CONTACT'].map(t => el('span', { class: t === 'BLOG' ? 'on' : '', text: t }))),
        el('div', { class: 'bw-body' },
            el('div', { class: 'bw-side' },
                el('div', { class: 'bw-bubble', text: title }),
                el('div', { class: 'bw-avatar', html: avatar }),
                el('div', { class: 'bw-doodles', 'aria-hidden': 'true', text: '🎸 ⭐ 🐱 🎵' })),
            el('div', { class: 'bw-post', dir: 'ltr' },
                paragraphs.map((p, i) => el('p', { class: 'bw-p', style: { animationDelay: `${i * 120}ms` } },
                    labels[i] ? el('span', { class: 'bw-label', style: { '--c': labels[i].color }, dir: 'rtl', html: `${labels[i].icon} ${mixed(labels[i].title)}` }) : '',
                    el('span', { class: 'bw-text', text: p }))),
                el('div', { class: 'bw-foot' },
                    el('span', { text: when }),
                    el('span', { class: 'bw-count', 'data-n': counts[0], text: '💬 0' }),
                    el('span', { class: 'bw-count', 'data-n': counts[1], text: '👍 0' }),
                    el('span', { class: 'bw-count', 'data-n': counts[2], text: '↪ 0' })))));
}

// Counters roll up like a real page getting likes.
function rollCounts(root) {
    root.querySelectorAll('.bw-count').forEach(c => {
        const n = +c.dataset.n;
        const icon = c.textContent.split(' ')[0];
        const t0 = performance.now();
        const step = t => {
            const k = Math.min(1, (t - t0) / 1400);
            c.textContent = `${icon} ${Math.round(n * (1 - (1 - k) ** 3))}`;
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

/* ---------------------------------------------------------------- 1 · plan */

function paintModel() {
    const caps = $('#model-caps').getAttribute('aria-pressed') === 'true';
    const parts = $('#model-parts').getAttribute('aria-pressed') === 'true';
    const w = blogWindow({ title: "ALI'S BLOG", avatar: '<span class="bw-emoji">👦🏽</span>', paragraphs: MODEL.paragraphs, labels: parts ? PLAN : [], counts: [20, 36, 11], when: 'Jan 20 15:42' });
    if (caps) w.querySelectorAll('.bw-text').forEach(t => { t.innerHTML = esc(t.textContent).replace(/[A-Z]/g, '<mark class="cap">$&</mark>'); });
    $('#model-blog').replaceChildren(w);
    rollCounts(w);
}
for (const id of ['#model-caps', '#model-parts']) {
    $(id).addEventListener('click', e => {
        const b = e.currentTarget;
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        b.classList.toggle('btn-primary', b.getAttribute('aria-pressed') === 'true');
        b.classList.toggle('btn-ghost', b.getAttribute('aria-pressed') !== 'true');
        paintModel();
    });
}
$('#model-say').addEventListener('click', () => sayEn(MODEL.paragraphs.join(' ')));

$('#tips-grid').append(...TIPS.map((t, i) => el('article', { class: `tip-card${t.from === 'book' ? ' book' : ''}`, style: { animationDelay: `${i * 50}ms` } },
    el('div', { class: 'tip-head' },
        el('span', { class: 'tip-icon', text: t.icon }),
        el('div', {}, el('h3', { html: mixed(t.title) }), el('small', { dir: 'ltr', text: t.en })),
        t.from === 'book' ? el('span', { class: 'tip-book', text: '📖 מֵהַסֵּפֶר' }) : ''),
    el('p', { html: mixed(t.he) }),
    el('div', { class: 'tip-ex', dir: 'ltr' },
        el('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the example.', text: '🔊', onclick: () => sayEn(t.ex) }),
        el('span', { text: t.ex })),
    t.link ? el('a', { class: 'tip-link', href: t.link.href, text: t.link.text, 'data-tip': 'Practice the Present Simple on its own page.' }) : '',
    el('button', { class: 'tip-say', type: 'button', 'aria-label': 'Listen to the tip', 'data-tip': 'Buddy reads this tip to you.', text: '🔊', onclick: () => say(t.he, t.en) }))));

$('#plan-grid').append(...PLAN.map((p, i) => el('article', { class: 'plan-card', style: { '--c': p.color, animationDelay: `${i * 70}ms` } },
    el('div', { class: 'plan-head', dir: 'rtl' },
        el('span', { class: 'plan-no', text: i + 1 }),
        el('span', { class: 'plan-icon', text: p.icon }),
        el('div', {}, el('h3', { html: mixed(p.title) }), el('small', { dir: 'ltr', text: p.en }))),
    el('ul', { class: 'plan-ask', dir: 'ltr' }, p.ask.map(q => el('li', {},
        el('button', { class: 'btn-icon', type: 'button', 'aria-label': `Listen: ${q}`, text: '🔊', onclick: () => sayEn(q) }), q))),
    el('textarea', { class: 'plan-notes', rows: 3, dir: 'auto', 'data-id': p.id, 'aria-label': `My ideas: ${p.en}`, placeholder: i === 0 && latinName ? `${latinName}, ...` : '…',
        oninput: e => { blog.notes[p.id] = e.target.value; save(); } }, blog.notes[p.id] ?? ''))));

const nameInput = $('#blog-name');
nameInput.value = blog.name;
nameInput.addEventListener('input', () => { blog.name = nameInput.value.trim() || 'My Blog'; save(); });
$('#go-write').addEventListener('click', () => showTab('write'));

/* ---------------------------------------------------------------- 2 · write */

const ui = { text: $('#editor-text'), mirror: $('#editor-mirror'), issues: $('#issues'), stats: $('#editor-stats'), tracker: $('#tracker'), starters: $('#starters') };
const names = [latinName].filter(Boolean);
const seenParts = new Set(Object.entries(stats(blog.text).parts).filter(([, v]) => v).map(([k]) => k));
let buddy;

ui.text.value = blog.text;

function insertAtCursor(snippet) {
    const t = ui.text;
    const a = t.selectionStart, b = t.selectionEnd;
    const before = t.value.slice(0, a);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    t.setRangeText(pad + snippet, a, b, 'end');
    // A starter with a gap ("I'm  years old.") puts the cursor in the gap.
    const gap = snippet.indexOf('  ');
    if (gap >= 0) { const at = a + pad.length + gap + 1; t.setSelectionRange(at, at); }
    t.focus();
    onEdit();
}

function setText(text) {
    ui.text.value = text;
    onEdit();
}

function paintEditor() {
    $('#editor-title').textContent = blog.name;
    const text = ui.text.value;
    const issues = checkText(text, { names });
    // The mirror sits under the textarea and draws the marks.
    let html = '';
    let at = 0;
    for (const x of issues) {
        html += esc(text.slice(at, x.start)) + `<mark class="m-${x.kind}">${esc(text.slice(x.start, x.end))}</mark>`;
        at = x.end;
    }
    ui.mirror.innerHTML = `${html}${esc(text.slice(at))}\n`;
    // The textarea grows with the text, so the marks under it always line up.
    ui.text.style.height = 'auto';
    ui.text.style.height = `${ui.text.scrollHeight}px`;

    const s = stats(text);
    ui.stats.innerHTML = `<span>📝 ${s.words} words</span><span>✏️ ${s.sentences} sentences</span><span>🧱 ${s.paragraphs} paragraphs</span>`;
    ui.tracker.replaceChildren(...PLAN.map((p, i) => el('button', {
        class: `track${s.parts[p.id] ? ' on' : ''}`, type: 'button', style: { '--c': p.color },
        'data-tip': `${p.en}: ${p.ask.join(' ')}`,
        onclick: () => buddy.showPart(p, blog.notes[p.id]),
    }, el('b', { text: s.parts[p.id] ? '✓' : i + 1 }), el('span', { html: `${p.icon} ${mixed(p.title)}` }))));
    for (const p of PLAN) {
        if (s.parts[p.id] && !seenParts.has(p.id)) {
            seenParts.add(p.id);
            confettiAt(ui.tracker.children[PLAN.indexOf(p)], 30);
            buddy?.cheer(p);
        }
    }

    // Show the whole word ("my → My"), not just the letter that changes.
    const wordOf = x => {
        let a = x.start, b = x.end;
        while (a > 0 && /[A-Za-z']/.test(text[a - 1])) a--;
        while (b < text.length && /[A-Za-z']/.test(text[b])) b++;
        return [text.slice(a, b), x.fix == null ? null : text.slice(a, x.start) + x.fix + text.slice(x.end, b)];
    };
    ui.issues.replaceChildren(...issues.slice(0, 8).map(x => {
        const [before, after] = wordOf(x);
        return el('div', { class: `issue i-${x.kind}` },
        el('button', { class: 'issue-word', type: 'button', dir: 'ltr', text: before.trim() || '·', 'data-tip': 'Show me where it is.',
            onclick: () => { ui.text.focus(); ui.text.setSelectionRange(x.start, x.end); } }),
        x.fix ? el('span', { class: 'issue-arrow', text: '→' }) : '',
        x.fix ? el('b', { class: 'issue-fix', dir: 'ltr', text: after }) : '',
        el('span', { class: 'issue-msg', dir: 'rtl', html: mixed(CHECK_HE[x.kind]) }),
        x.fix ? el('button', { class: 'btn btn-primary btn-xs', type: 'button', text: '✓ Fix', 'data-tip': 'Fix it for me.',
            onclick: () => setText(applyFix(ui.text.value, x)) }) : '');
    }));
    if (issues.length > 8) ui.issues.append(el('div', { class: 'issue more', text: `+${issues.length - 8}` }));
}

function onEdit() {
    blog.text = ui.text.value;
    save();
    paintEditor();
    buddy?.typed(ui.text.value);
}

ui.text.addEventListener('input', onEdit);

ui.starters.append(...PLAN.map(p => el('div', { class: 'starter-group', style: { '--c': p.color } },
    el('span', { class: 'sg-icon', text: p.icon, title: p.en }),
    p.starters.map(st => el('button', { class: 'starter', type: 'button', text: st.replace(/\s+$/, ' …').replace(/  /, ' … '), onclick: () => insertAtCursor(st) })))));

$('#go-publish').addEventListener('click', () => showTab('publish'));

/* ---------------------------------------------------------------- 3 · publish */

const RUBRIC = [
    { icon: '🔠', he: 'אוֹתִיּוֹת גְּדוֹלוֹת', ok: (s, issues) => !issues.some(x => ['start', 'i', 'name'].includes(x.kind)) },
    { icon: '⏺️', he: 'נְקוּדָה בְּסוֹף כָּל מִשְׁפָּט', ok: (s, issues, t) => !issues.some(x => ['end', 'question'].includes(x.kind)) && /[.!?]\s*$/.test(t) },
    { icon: '🧱', he: 'לְפָחוֹת שָׁלוֹשׁ פִּסְקָאוֹת', ok: s => s.paragraphs >= 3 },
    { icon: '🧩', he: 'כָּל אַרְבַּעַת הַחֲלָקִים', ok: s => Object.values(s.parts).every(Boolean) },
    { icon: '⏰', he: '[[he / she / it]] + [[s]]', ok: (s, issues) => !issues.some(x => ['s', 'noS'].includes(x.kind)) },
    { icon: '💬', he: 'שְׁאֵלָה לַקּוֹרְאִים', ok: (s, issues, t) => /\?/.test(t) },
    { icon: '📏', he: 'לְפָחוֹת 40 מִילִּים', ok: s => s.words >= 40 },
    { icon: '🛡️', he: 'בְּלִי פְּרָטִים אִישִׁיִּים', ok: (s, issues) => !issues.some(x => x.kind === 'private') },
];

function paintPublish() {
    const text = ui.text.value.trim();
    if (!text) {
        $('#my-blog').replaceChildren(el('div', { class: 'pub-empty', dir: 'rtl' },
            el('div', { text: '📝' }), el('p', { html: mixed('עוֹד לֹא כְּתַבְתֶּם כְּלוּם. בּוֹאוּ נַתְחִיל!') }),
            el('button', { class: 'btn btn-glow', type: 'button', text: '✍️ Write', onclick: () => showTab('write') })));
        $('#rubric').replaceChildren();
        return;
    }
    const avatar = profile?.badge ? badgeSVG(profile.badge, profile.name) : '<span class="bw-emoji">🦊</span>';
    const now = new Date();
    const when = `${now.toLocaleString('en', { month: 'short' })} ${now.getDate()} ${now.toTimeString().slice(0, 5)}`;
    const w = blogWindow({ title: blog.name.toUpperCase(), avatar, paragraphs: paragraphsOf(text), counts: [12 + text.length % 17, 25 + text.length % 31, 5 + text.length % 9], when });
    $('#my-blog').replaceChildren(w);
    rollCounts(w);

    const s = stats(text);
    const issues = checkText(text, { names });
    const results = RUBRIC.map(r => ({ ...r, pass: r.ok(s, issues, text) }));
    const n = results.filter(r => r.pass).length;
    $('#rubric').replaceChildren(
        el('h3', { class: 'rubric-title', html: `${'⭐'.repeat(Math.round(n / RUBRIC.length * 5)) || '💪'} <span>${n} / ${RUBRIC.length}</span>` }),
        el('div', { class: 'rubric-list' }, results.map((r, i) => el('div', { class: `rb${r.pass ? ' ok' : ''}`, style: { animationDelay: `${300 + i * 80}ms` } },
            el('span', { class: 'rb-mark', text: r.pass ? '✓' : '·' }), el('span', { text: r.icon }), el('span', { html: mixed(r.he) })))));
    if (n === RUBRIC.length) {
        confetti(innerWidth / 2, innerHeight / 3, 220);
        say('וואו! הַבְּלוֹג שֶׁלָּכֶם מוּשְׁלָם!', 'Wow! Your blog is perfect!');
    } else if (n >= RUBRIC.length - 2) {
        confetti(innerWidth / 2, innerHeight / 3, 100);
    }
}

$('#pub-say').addEventListener('click', () => speak(paragraphsOf(ui.text.value).join(' ')));
$('#pub-edit').addEventListener('click', () => showTab('write'));
$('#pub-print').addEventListener('click', () => print());

/* ---------------------------------------------------------------- AI + engine room */

const fab = $('#engine-fab');
const drawer = $('#engine-drawer');
fab.addEventListener('click', () => { drawer.hidden = !drawer.hidden; });
$('#engine-close').addEventListener('click', () => { drawer.hidden = true; });
new MutationObserver(() => fab.classList.toggle('busy', $('#engine-now').classList.contains('busy')))
    .observe($('#engine-now'), { attributes: true, attributeFilter: ['class'] });

buddy = initBuddy({
    getText: () => ui.text.value,
    setText,
    insert: insertAtCursor,
    notes: () => blog.notes,
    name: latinName,
});

paintModel();
showTab(location.hash.slice(1) || (blog.text ? 'write' : 'plan'));
requestAnimationFrame(moveInk);

await checkAll();
const ai = $('#b-ai');
ai.querySelector('span').textContent = lmReady() ? 'Gemini Nano' : 'Basic helper';
ai.classList.toggle('mixed', lmReady());
ai.dataset.tip = lmReady()
    ? 'Buddy uses Gemini Nano, the AI inside your browser, to help you write.'
    : 'Gemini Nano is not on in this browser, so Buddy helps with simple rules. Turn on the AI flags in Chrome for more help.';
buddy.ready();
