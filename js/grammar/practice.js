// Practice: the class worksheet (sort the verbs into s / es / ies, then complete the sentences),
// and after it, endless extra questions on the rules the pupil picks.

import { $, $$, el, confetti, confettiAt } from '../util.js';
import { RULES, SORT_VERBS, SHEET, ruleById } from './data.js';
import { ending, third, mixed, norm, say, sayEn, makeQuestion, questionCard } from './gen.js';
import { progress } from './progress.js';
import { initBeSheet } from './besheet.js';

/* ---------------------------------------------------------------- part 1: sort */

let selected = null;

// Why a verb belongs in its basket, in Hebrew.
function why(v) {
    switch (ending(v)) {
        case 'es': return `[[${v}]] נִגְמָר בְּ־[[${v.match(/(sh|ch|s|x|z|o)$/)[0]}]], אָז מוֹסִיפִים [[es]]: [[${third(v)}]].`;
        case 'ies': return `[[${v}]] נִגְמָר בְּאוֹת וְעוֹד [[y]], אָז [[y]] הוֹפֶכֶת לְ־[[ies]]: [[${third(v)}]].`;
        default: return /y$/.test(v)
            ? `לִפְנֵי הַ־[[y]] בְּ־[[${v}]] יֵשׁ [[${v.at(-2)}]], אָז רַק מוֹסִיפִים [[s]]: [[${third(v)}]].`
            : `[[${v}]] הוּא פּוֹעַל רָגִיל, אָז רַק מוֹסִיפִים [[s]]: [[${third(v)}]].`;
    }
}

function sortMsg(html, kind) {
    const m = $('#sort-msg');
    m.innerHTML = html;
    m.className = `sort-msg ${kind}`;
    void m.offsetWidth;
    m.classList.add('in');
}

function drop(chip, basket) {
    const v = chip.dataset.verb;
    const right = ending(v) === basket.dataset.end;
    if (!right) {
        chip.classList.remove('shake');
        void chip.offsetWidth;
        chip.classList.add('shake');
        basket.classList.add('nope');
        setTimeout(() => basket.classList.remove('nope'), 500);
        sortMsg(`🤔 ${mixed(why(v))}`, 'miss');
        selected = null;
        chip.classList.remove('selected');
        $$('.basket').forEach(b => b.classList.remove('ready'));
        say(`לֹא בְּדִיּוּק. ${why(v)}`, `Not quite. ${v} becomes ${third(v)}.`);
        return;
    }
    chip.classList.remove('selected', 'shake');
    chip.draggable = false;
    chip.textContent = '';
    chip.append(el('b', { text: v }), el('span', { class: 'arrow', text: '→' }), el('i', { text: third(v) }));
    chip.classList.add('placed');
    basket.querySelector('.basket-body').append(chip);
    basket.classList.add('yum');
    setTimeout(() => basket.classList.remove('yum'), 500);
    confettiAt(chip, 18);
    sortMsg(`✅ ${mixed(why(v))}`, 'good');
    sayEn(`${v}, ${third(v)}`);
    selected = null;
    $$('.basket').forEach(b => b.classList.remove('ready'));
    if (!$('#verb-bank .verb-chip')) {
        confetti(innerWidth / 2, innerHeight / 3, 140);
        sortMsg('🎉 כָּל הַפְּעָלִים בַּמָּקוֹם! כָּל הַכָּבוֹד!', 'good done');
        say('כָּל הַפְּעָלִים בַּמָּקוֹם! כָּל הַכָּבוֹד!', 'All the verbs are in the right place. Well done!');
        progress.set('sortDone', true);
    }
}

function initSort() {
    const bank = $('#verb-bank');
    bank.replaceChildren(...SORT_VERBS.map((v, i) => el('button', {
        class: 'verb-chip', type: 'button', draggable: 'true', 'data-verb': v, text: v,
        style: { animationDelay: `${i * 40}ms` },
        ondragstart: e => { e.dataTransfer.setData('text/plain', v); e.currentTarget.classList.add('dragging'); },
        ondragend: e => e.currentTarget.classList.remove('dragging'),
        onclick: e => {
            const chip = e.currentTarget;
            if (chip.classList.contains('placed')) return;
            selected = selected === chip ? null : chip;
            $$('.verb-chip').forEach(c => c.classList.toggle('selected', c === selected));
            $$('.basket').forEach(b => b.classList.toggle('ready', !!selected));
            if (selected) sayEn(v);
        },
    })));
    for (const b of $$('.basket')) {
        b.querySelector('.basket-body').replaceChildren();
        b.ondragover = e => { e.preventDefault(); b.classList.add('over'); };
        b.ondragleave = () => b.classList.remove('over');
        b.ondrop = e => {
            e.preventDefault();
            b.classList.remove('over');
            const chip = bank.querySelector(`[data-verb="${e.dataTransfer.getData('text/plain')}"]`);
            if (chip) drop(chip, b);
        };
        b.onclick = () => { if (selected) drop(selected, b); };
    }
    $('#sort-msg').replaceChildren();
}

/* ---------------------------------------------------------------- part 2: complete */

const blanks = [];

function initSheet() {
    $('#sheet-list').replaceChildren(...SHEET.map((s, i) => {
        const line = el('div', { class: 'qsentence' });
        s.parts.forEach((p, j) => {
            line.append(p);
            const b = s.blanks[j];
            if (!b) return;
            const input = el('input', { class: 'blank-input', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'aria-label': `Sentence ${i + 1}: ${b.hint}` });
            input.style.width = `${Math.max(7, b.answer.length + 2)}ch`;
            input.addEventListener('input', () => input.classList.remove('right', 'wrong'));
            input.addEventListener('keydown', e => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const k = blanks.findIndex(x => x.input === input);
                (blanks[k + 1]?.input ?? $('#sheet-check')).focus();
            });
            blanks.push({ input, ...b, sentence: s });
            line.append(input, el('span', { class: 'qhint', text: `(${b.hint})` }));
        });
        const full = s.parts.map((p, j) => p + (s.blanks[j]?.answer ?? '')).join('');
        return el('li', { class: 'sheet-row' },
            el('div', { class: 'recap-line' },
                el('span', { class: 'recap-n', text: i + 1 }),
                line,
                el('button', { class: 'btn-icon qsay', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the sentence.', text: '🔊',
                    onclick: () => sayEn(s.parts.join('___')) })),
            el('div', { class: 'recap-result', dir: 'rtl', 'data-full': full }));
    }));
}

function checkSheet() {
    let ok = 0;
    for (const row of $$('.sheet-row')) row.querySelector('.recap-result').replaceChildren();
    for (const b of blanks) {
        const right = norm(b.input.value) === b.answer;
        ok += right;
        b.input.classList.toggle('right', right);
        b.input.classList.toggle('wrong', !right);
        progress.practiced(b.rule, right);
        if (right) continue;
        const rule = ruleById(b.rule);
        const res = b.input.closest('.sheet-row').querySelector('.recap-result');
        res.append(
            el('span', { class: 'miss', html: `✗ <bdi class="en" dir="ltr">${b.answer}</bdi>` }),
            el('button', { class: 'rule-chip', type: 'button', style: { '--c': rule.color }, 'data-tip': 'Tap to read this rule again.',
                html: `<b>${rule.icon} ${rule.id}</b> <span>${mixed(rule.short)}</span>`,
                onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: rule.id })) }),
            b.sentence.note ? el('span', { class: 'note', html: `💡 ${mixed(b.sentence.note)}` }) : '');
    }
    const box = $('#sheet-score');
    box.hidden = false;
    const all = blanks.length;
    box.innerHTML = `<b>${ok === all ? '⭐⭐⭐' : ok >= all - 2 ? '⭐⭐' : ok >= all / 2 ? '⭐' : '💪'}</b> <span dir="rtl">${ok} מִתּוֹךְ ${all} נְכוֹנוֹת</span>`;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    if (ok === all) {
        confetti(innerWidth / 2, innerHeight / 3, 160);
        say('מוּשְׁלָם! סִייַּמְתֶּם אֶת דַּף הָעֲבוֹדָה! רוֹצִים עוֹד תִּרְגּוּל? הוּא כָּאן לְמַטָּה.', 'Perfect! You finished the worksheet. Want more practice? It is right below.');
        progress.set('sheetDone', true);
        $('#part-more').classList.add('unlocked');
    } else {
        say('יָפֶה! תַּקְּנוּ אֶת הַמִּשְׁפָּטִים שֶׁמְּסוּמָּנִים בְּאָדוֹם וּבִדְקוּ שׁוּב.', 'Nice! Fix the red ones and check again.');
    }
}

/* ---------------------------------------------------------------- more practice */

let chosen = new Set(RULES.map(r => r.id));
let streak = 0;

function paintStats() {
    const p = progress.get().practice ?? {};
    const ok = Object.values(p).reduce((n, r) => n + r.ok, 0);
    $('#more-stats').innerHTML = `<span class="ms">🔥 רֶצֶף: <b>${streak}</b></span><span class="ms">✅ נְכוֹנוֹת: <b>${ok}</b></span>`;
}

function nextQuestion() {
    const box = $('#more-box');
    const card = questionCard(makeQuestion([...chosen]), (ok, item) => {
        streak = ok ? streak + 1 : 0;
        progress.practiced(item.rule, ok);
        paintStats();
        if (ok && streak && streak % 5 === 0) {
            confetti(innerWidth / 2, innerHeight / 3, 120);
            say(`וואו! ${streak} תְּשׁוּבוֹת נְכוֹנוֹת בָּרֶצֶף!`, `Wow! ${streak} in a row!`);
        }
        $('#more-next').hidden = false;
        $('#more-next').focus({ preventScroll: true });
    });
    box.replaceChildren(card);
    $('#more-next').hidden = true;
}

function initMore() {
    $('#rule-filter').replaceChildren(...RULES.map(r => el('button', {
        class: 'legend-chip on', type: 'button', style: { '--c': r.color }, 'aria-pressed': 'true',
        'data-tip': `Rule ${r.id}: ${r.en}. Tap to turn it on or off.`,
        html: `<b>${r.id}</b> ${r.icon}`,
        onclick: e => {
            const b = e.currentTarget;
            if (chosen.has(r.id) && chosen.size === 1) return;
            chosen.has(r.id) ? chosen.delete(r.id) : chosen.add(r.id);
            b.classList.toggle('on', chosen.has(r.id));
            b.setAttribute('aria-pressed', String(chosen.has(r.id)));
            nextQuestion();
        },
    })));
    $('#more-next').addEventListener('click', nextQuestion);
    if (progress.get().sheetDone) $('#part-more').classList.add('unlocked');
    paintStats();
    nextQuestion();
}

function showSheet(name) {
    $$('.sheet-switch [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sheet === name)));
    $$('.sheet').forEach(s => {
        s.hidden = s.id !== `sheet-${name}`;
        if (!s.hidden) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
    });
    progress.set('sheet', name);
}

export function initPractice() {
    initBeSheet();
    $$('.sheet-switch [role="tab"]').forEach(b => b.addEventListener('click', () => showSheet(b.dataset.sheet)));
    showSheet(progress.get().sheet === 'be' ? 'be' : 'ps');
    initSort();
    initSheet();
    initMore();
    $('#sheet-check').addEventListener('click', checkSheet);
    $('#sheet-reset').addEventListener('click', () => {
        blanks.forEach(b => { b.input.value = ''; b.input.classList.remove('right', 'wrong'); });
        $$('.sheet-row .recap-result').forEach(r => r.replaceChildren());
        $('#sheet-score').hidden = true;
        blanks[0].input.focus();
    });
}
