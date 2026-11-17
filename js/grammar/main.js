// Present Simple page: tabs, the rule cards, and Buddy's talk-through.

import { $, $$, el, sleep, confettiAt } from '../util.js';
import { initTooltips } from '../tooltip.js';
import { bus, hasVoice, listen, stopSpeaking } from '../ai.js';
import { store } from '../store.js';
import { badgeSVG } from '../profile.js';
import { INTRO, RULES, ruleById } from './data.js';
import { mixed, say, sayEn, norm, questionCard } from './gen.js';
import { initRecap } from './recap.js';
import { initPractice } from './practice.js';
import { initQuiz } from './quiz.js';
import { progress } from './progress.js';

initTooltips();

/* ---------------------------------------------------------------- header */

function paintHeader() {
    const best = progress.get().quizBest;
    $('#g-best b').textContent = best == null ? '–' : `${best}/10`;
    const p = store.prefs.profile;
    const me = $('#g-me');
    if (p?.badge) {
        me.hidden = false;
        me.innerHTML = `<span class="gm-badge">${badgeSVG(p.badge, p.name, { small: true })}</span><b>${p.name}</b>`;
        me.dataset.tip = `This is you, ${p.name}! Tap to go back to Word Wizard.`;
    }
}
function paintVoice() {
    const he = hasVoice('he');
    const box = $('#g-voice');
    box.classList.toggle('mixed', he);
    box.querySelector('span').textContent = he ? 'עִבְרִית + English' : 'English';
    box.dataset.tip = he
        ? 'Buddy talks in Hebrew and says the English words in English.'
        : 'This computer has no Hebrew voice, so Buddy talks in English. Add a Hebrew voice (like “Carmit” on Mac) and reload the page.';
}
bus.addEventListener('voices', paintVoice);
document.addEventListener('grammar:progress', paintHeader);
paintHeader();
paintVoice();

/* ---------------------------------------------------------------- niqqud on screen */

// All the Hebrew on this page is written with full niqqud (and spoken that way).
// With the switch off, every text node is shown without the marks; the pointed text is kept to switch back.
const MARKS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const HAS_MARKS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/;
const pointed = new WeakMap();
const niqqudOn = () => store.prefs.niqqud !== false;

function paintText(node) {
    if (!pointed.has(node)) {
        if (!HAS_MARKS.test(node.data)) return;
        pointed.set(node, node.data);
    }
    const text = niqqudOn() ? pointed.get(node) : pointed.get(node).replace(MARKS, '');
    if (node.data !== text) node.data = text;
}
function paintTree(root) {
    if (root.nodeType === Node.TEXT_NODE) return paintText(root);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) paintText(walk.currentNode);
}
function paintNiqqud() {
    const on = niqqudOn();
    document.body.classList.toggle('niqqud', on);
    $('#g-niqqud').setAttribute('aria-pressed', String(on));
    paintTree(document.body);
}
// New cards, feedback and Buddy's lines are painted as they appear.
new MutationObserver(list => {
    for (const m of list) m.addedNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE || n.nodeType === Node.ELEMENT_NODE) paintTree(n); });
}).observe(document.body, { childList: true, subtree: true });
$('#g-niqqud').addEventListener('click', () => {
    store.setPref('niqqud', !niqqudOn());
    paintNiqqud();
    requestAnimationFrame(moveInk);
});
paintNiqqud();

/* ---------------------------------------------------------------- tabs */

const TABS = ['rules', 'recap', 'practice', 'quiz'];
const ink = $('.g-tab-ink');

function moveInk() {
    const b = $('.g-tabs [aria-selected="true"]');
    ink.style.width = `${b.offsetWidth}px`;
    ink.style.transform = `translateX(${b.offsetLeft}px)`;
}

export function showTab(name, { scroll = true } = {}) {
    if (!TABS.includes(name)) name = 'rules';
    $$('.g-tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    TABS.forEach(t => { $(`#tab-${t}`).hidden = t !== name; });
    $(`#tab-${name}`).classList.remove('enter');
    void $(`#tab-${name}`).offsetWidth;
    $(`#tab-${name}`).classList.add('enter');
    moveInk();
    if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
    if (name !== 'rules') stopTalk();
    if (scroll) scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.g-tabs [role="tab"]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
addEventListener('resize', moveInk);
addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// "Read this rule again" from any feedback: jump to its card.
document.addEventListener('grammar:rule', e => {
    showTab('rules', { scroll: false });
    const card = $(`#rule-${e.detail}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.classList.remove('flash');
    void card?.offsetWidth;
    card?.classList.add('flash');
});

/* ---------------------------------------------------------------- rule cards */

const checkItem = r => {
    const [before, after] = r.check.q.split('___');
    return { rule: r.id, kind: 'pick', before, after, hint: r.check.hint, hintHe: r.check.hintHe, options: r.check.options, answers: [r.check.answer], full: r.check.q.replace('___', r.check.answer) };
};

const highlight = (text, word) => {
    const i = text.indexOf(word);
    if (i < 0) return el('span', { text });
    return el('span', {}, text.slice(0, i), el('mark', { text: word }), text.slice(i + word.length));
};

// A rule as spoken lines: { he, en } each. English-only lines leave `he` empty.
function script(r, { withTitle = true } = {}) {
    const lines = [];
    if (withTitle) lines.push(r.id ? { he: `כְּלָל ${r.id}: ${r.title}`, en: `Rule ${r.id}: ${r.en}.` } : { he: r.title, en: `${r.en}` });
    const [first, ...points] = [r.he].flat();
    lines.push({ he: first, en: r.say }, ...points.map(he => ({ he, en: '' })));
    for (const ex of r.examples) lines.push({ he: `לְדוּגְמָה: [[${ex.en}]] ${ex.he}`, en: `For example: ${ex.en}`, ex });
    if (r.tip) lines.push({ he: r.tip, en: '' });
    return lines;
}

function ruleCard(r) {
    const tryBox = el('div', { class: 'rc-try' });
    const card = el('article', { class: `rule-card${r.id ? '' : ' intro'}`, id: `rule-${r.id}`, style: { '--c': r.color } },
        el('header', { class: 'rc-head' },
            el('span', { class: 'rc-num', text: r.id || '★' }),
            el('span', { class: 'rc-icon', 'aria-hidden': 'true', text: r.icon }),
            el('div', { class: 'rc-titles' },
                el('h3', { dir: 'rtl', html: mixed(r.title) }),
                el('small', { text: r.en }))),
        el('div', { class: 'formula', dir: 'ltr' }, r.formula.map(([t, k]) => el('span', { class: `f-chip ${k ?? ''}`, text: t }))),
        el('p', { class: 'rc-text', dir: 'rtl', html: mixed([r.he].flat()[0]) }),
        Array.isArray(r.he) ? el('ul', { class: 'rc-points', dir: 'rtl' }, r.he.slice(1).map(p => el('li', { html: mixed(p) }))) : '',
        el('ul', { class: 'rc-examples' }, r.examples.map(ex => el('li', {},
            el('button', { class: 'btn-icon rc-say', type: 'button', 'aria-label': `Listen: ${ex.en}`, 'data-tip': 'Listen: English first, then Hebrew.', text: '🔊',
                onclick: () => say(`[[${ex.en}]] ${ex.he}`, ex.en) }),
            el('div', {},
                el('div', { class: 'ex-en', dir: 'ltr' }, highlight(ex.en, ex.hl)),
                el('div', { class: 'ex-he', dir: 'rtl', text: ex.he }))))),
        el('div', { class: 'rc-tip', dir: 'rtl', html: `💡 ${mixed(r.tip)}` }),
        el('div', { class: 'rc-actions', dir: 'rtl' },
            el('button', { class: 'btn btn-primary btn-sm', type: 'button', 'data-tip': 'Buddy explains this rule out loud.', text: '🔊 הַסְבִּירוּ לִי',
                onclick: () => talk([r], { ask: false }) }),
            r.check ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-tip': 'Try one quick question about this rule.', text: '🎯 נַסּוּ אוֹתִי',
                onclick: () => {
                    tryBox.replaceChildren(questionCard(checkItem(r), ok => { if (ok) progress.markRule(r.id); }));
                    tryBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } }) : ''),
        tryBox);
    if (progress.get().rules?.[r.id]) card.classList.add('done');
    return card;
}

$('#rules-grid').append(...[INTRO, ...RULES].map(ruleCard));
document.addEventListener('grammar:progress', () => {
    for (const r of RULES) $(`#rule-${r.id}`).classList.toggle('done', !!progress.get().rules?.[r.id]);
});

/* ---------------------------------------------------------------- talk-through */

const bar = {
    root: $('#buddy-bar'), fox: $('#bb-fox'), step: $('#bb-step'), say: $('#bb-say'), ask: $('#bb-ask'),
    play: $('#bb-play'), next: $('#bb-next'), stop: $('#bb-stop'),
};
let run = 0;            // bumped to cancel a running talk
let paused = false;
let resume = null;      // continues the current line after a pause
let skip = null;        // jumps to the next rule

async function line(l, my) {
    bar.say.innerHTML = mixed(hasVoice('he') || !l.en ? l.he : `[[${l.en}]]`);
    bar.say.dir = hasVoice('he') || !l.en ? 'rtl' : 'ltr';
    bar.say.classList.remove('in');
    void bar.say.offsetWidth;
    bar.say.classList.add('in');
    if (!hasVoice('he') && !l.en) { await sleep(2200); return; }
    bar.fox.classList.add('talking');
    await say(l.he, l.en);
    bar.fox.classList.remove('talking');
    while (paused && my === run) await new Promise(r => { resume = r; });
}

// Ask the rule's check question in the bar; resolves after the pupil answers.
function askCheck(r, my) {
    return new Promise(resolve => {
        const item = checkItem(r);
        let mic = null;
        const card = questionCard(item, async ok => {
            mic?.remove();
            if (ok) progress.markRule(r.id);
            await sleep(400);
            if (my !== run) return resolve();
            await say(ok ? `כָּל הַכָּבוֹד! [[${item.full}]]` : `כִּמְעַט! הַתְּשׁוּבָה הַנְּכוֹנָה הִיא [[${item.answers[0]}]]. [[${item.full}]]`,
                ok ? `Great job! ${item.full}` : `Almost! The answer is ${item.answers[0]}. ${item.full}`);
            await sleep(700);
            resolve();
        }, { speakFull: false });
        if (globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition) {
            mic = el('button', { class: 'btn btn-ghost btn-sm bb-mic', type: 'button', 'data-tip': 'Say your answer out loud in English.', text: '🎤 אִמְרוּ אֶת הַתְּשׁוּבָה',
                onclick: async () => {
                    mic.classList.add('on');
                    mic.textContent = '🎤 מַקְשִׁיב…';
                    const heard = await listen().promise;
                    mic.classList.remove('on');
                    mic.textContent = '🎤 אִמְרוּ אֶת הַתְּשׁוּבָה';
                    const said = [heard?.text, ...(heard?.alternatives ?? [])].filter(Boolean).map(norm);
                    // Longest option first, so "doesn't" wins over "does".
                    const hit = [...item.options].sort((a, b) => b.length - a.length).find(o => said.some(s => s.split(' ').includes(norm(o)) || s === norm(o)));
                    const btn = hit && [...card.querySelectorAll('button.opt')].find(b => b.textContent === hit);
                    if (btn) btn.click();
                    else say('לֹא שָׁמַעְתִּי טוֹב. נַסּוּ שׁוּב, אוֹ לַחֲצוּ עַל הַתְּשׁוּבָה.', 'I did not catch that. Try again, or tap your answer.');
                } });
            card.querySelector('.opts')?.append(mic);
        }
        bar.ask.replaceChildren(card);
        bar.ask.hidden = false;
    });
}

async function talk(rules, { ask = true } = {}) {
    stopTalk();
    const my = ++run;
    paused = false;
    bar.root.hidden = false;
    bar.play.textContent = '⏸';
    document.body.classList.add('talking');
    for (let i = 0; i < rules.length && my === run; i++) {
        const r = rules[i];
        const jump = new Promise(res => { skip = res; });
        bar.step.textContent = rules.length > 1 ? `${i + 1} / ${rules.length}` : '';
        $$('.rule-card.speaking').forEach(c => c.classList.remove('speaking'));
        const card = $(`#rule-${r.id}`);
        card.classList.add('speaking');
        // Top of the card under the tabs, so Buddy's bar at the bottom doesn't cover it.
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        bar.ask.hidden = true;
        let skipped = false;
        const steps = (async () => {
            for (const l of script(r)) {
                if (my !== run || skipped) break;
                await line(l, my);
            }
            if (ask && r.check && my === run && !skipped) {
                await line({ he: `עַכְשָׁיו תּוֹרְכֶם! [[${r.check.q.replace('___', '...')}]] מַה נָּכוֹן?`, en: 'Your turn! Which word is right?' }, my);
                if (my === run && !skipped) await askCheck(r, my);
            }
        })();
        await Promise.race([steps, jump.then(() => { skipped = true; stopSpeaking(); })]);
    }
    if (my !== run) return;
    $$('.rule-card.speaking').forEach(c => c.classList.remove('speaking'));
    if (rules.length > 1) {
        bar.ask.hidden = true;
        confettiAt(bar.fox, 120);
        await line({ he: 'סִייַּמְנוּ אֶת כָּל הַכְּלָלִים! עַכְשָׁיו אֶפְשָׁר לַעֲבוֹר לַחֲזָרָה הַמְּהִירָה ⚡', en: 'We finished all the rules! Now try the quick recap.' }, my);
    }
    if (my === run) setTimeout(() => { if (my === run) stopTalk(); }, 1500);
}

function stopTalk() {
    run += 1;
    paused = false;
    resume?.();
    stopSpeaking();
    bar.root.hidden = true;
    bar.ask.hidden = true;
    bar.fox.classList.remove('talking');
    document.body.classList.remove('talking');
    $$('.rule-card.speaking').forEach(c => c.classList.remove('speaking'));
}

$('#talk-start').addEventListener('click', () => talk([INTRO, ...RULES]));
bar.stop.addEventListener('click', stopTalk);
bar.next.addEventListener('click', () => { paused = false; resume?.(); skip?.(); });
bar.play.addEventListener('click', () => {
    paused = !paused;
    bar.play.textContent = paused ? '▶' : '⏸';
    bar.play.setAttribute('aria-label', paused ? 'Continue' : 'Pause');
    if (paused) globalThis.speechSynthesis?.pause();
    else { globalThis.speechSynthesis?.resume(); resume?.(); }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !bar.root.hidden) stopTalk(); });

/* ---------------------------------------------------------------- the other tabs */

initRecap();
initPractice();
initQuiz();
showTab(location.hash.slice(1) || 'rules', { scroll: false });
// Tab widths change once the web fonts arrive.
document.fonts?.ready.then(moveInk);
requestAnimationFrame(moveInk);
