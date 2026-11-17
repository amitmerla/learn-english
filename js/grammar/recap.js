// Quick recap: one line per rule. Fill in the blank and say which rule it is.

import { $, el, confetti } from '../util.js';
import { RULES, RECAP, ruleById } from './data.js';
import { mixed, norm, sayEn, say } from './gen.js';

const rows = [];

function legend() {
    $('#rule-legend').append(...RULES.map(r => el('button', {
        class: 'legend-chip', type: 'button', style: { '--c': r.color },
        'data-tip': `Rule ${r.id}: ${r.en}. Tap to read it.`,
        html: `<b>${r.id}</b> ${r.icon} <span>${mixed(r.title)}</span>`,
        onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: r.id })),
    })));
}

function row(line, n) {
    const [before, after] = line.q.split('___');
    const input = el('input', { class: 'blank-input', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'aria-label': `Sentence ${n}: the missing word` });
    input.style.width = `${Math.max(6, line.answers[0].length + 2)}ch`;
    let picked = null;
    const picks = el('div', { class: 'rule-pick', dir: 'rtl', role: 'radiogroup', 'aria-label': 'Which rule?' },
        el('span', { class: 'rp-label', text: 'אֵיזֶה כְּלָל?' }),
        RULES.map(r => el('button', {
            class: 'rp', type: 'button', role: 'radio', 'aria-checked': 'false', style: { '--c': r.color },
            'data-tip': `Rule ${r.id}: ${r.en}`, text: r.id,
            onclick: e => {
                picked = r.id;
                picks.querySelectorAll('.rp').forEach(b => b.setAttribute('aria-checked', String(b === e.currentTarget)));
                li.classList.remove('checked');
            },
        })));
    const result = el('div', { class: 'recap-result', dir: 'rtl' });
    const li = el('li', { class: 'recap-row' },
        el('div', { class: 'recap-line' },
            el('span', { class: 'recap-n', text: n }),
            el('div', { class: 'qsentence', dir: 'ltr' }, before, input, after,
                line.hint ? el('span', { class: 'qhint', text: `(${line.hint})` }) : '',
                line.hintHe ? el('span', { class: 'qhint he', dir: 'rtl', text: `(${line.hintHe})` }) : ''),
            el('button', { class: 'btn-icon qsay', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the sentence.', text: '🔊',
                onclick: () => sayEn(`${before}___${after}`) })),
        picks, result);
    input.addEventListener('input', () => li.classList.remove('checked'));
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        (rows[n]?.input ?? $('#recap-check')).focus();
    });
    rows.push({ line, li, input, result, picked: () => picked, reset: () => {
        picked = null;
        input.value = '';
        input.className = 'blank-input';
        picks.querySelectorAll('.rp').forEach(b => b.setAttribute('aria-checked', 'false'));
        li.className = 'recap-row';
        result.replaceChildren();
    } });
    return li;
}

function check() {
    let score = 0;
    for (const r of rows) {
        const word = r.input.value.trim();
        const wordOk = r.line.answers.some(a => norm(a) === norm(word));
        const ruleOk = r.picked() === r.line.rule;
        score += wordOk + ruleOk;
        r.input.classList.toggle('right', wordOk);
        r.input.classList.toggle('wrong', !wordOk);
        r.li.className = `recap-row checked ${wordOk && ruleOk ? 'ok' : 'bad'}`;
        const rule = ruleById(r.line.rule);
        r.result.replaceChildren(
            el('span', { class: wordOk ? 'good' : 'miss', html: wordOk ? '✓ הַמִּילָּה נְכוֹנָה' : `✗ הַמִּילָּה: <bdi class="en" dir="ltr">${r.line.answers[0]}</bdi>` }),
            el('span', { class: ruleOk ? 'good' : 'miss', text: ruleOk ? `✓ כְּלָל ${rule.id}` : `✗ זֶה כְּלָל ${rule.id}` }),
            ruleOk ? '' : el('button', { class: 'rule-chip', type: 'button', style: { '--c': rule.color }, 'data-tip': 'Tap to read this rule again.',
                html: `<b>${rule.icon} ${rule.id}</b> <span>${mixed(rule.short)}</span>`,
                onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: rule.id })) }));
    }
    const max = rows.length * 2;
    const box = $('#recap-score');
    box.hidden = false;
    const stars = score === max ? '⭐⭐⭐' : score >= max * .75 ? '⭐⭐' : score >= max / 2 ? '⭐' : '💪';
    box.innerHTML = `<b>${stars}</b> <span dir="rtl">${score} מִתּוֹךְ ${max} נְכוֹנוֹת</span>`;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    if (score === max) {
        confetti(innerWidth / 2, innerHeight / 3, 160);
        say('מוּשְׁלָם! אַתֶּם יוֹדְעִים אֶת כָּל הַכְּלָלִים!', 'Perfect! You know all the rules!');
    } else if (score >= max * .75) {
        say('יָפֶה מְאוֹד! תַּקְּנוּ אֶת מַה שֶּׁמְּסוּמָּן בְּאָדוֹם וְנַסּוּ שׁוּב.', 'Very good! Fix the red ones and try again.');
    } else {
        say('כָּל הַכָּבוֹד עַל הַנִּיסָּיוֹן! הַצִּיצוּ בַּכְּלָלִים וְנַסּוּ שׁוּב.', 'Good try! Look at the rules and try again.');
    }
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function initRecap() {
    legend();
    $('#recap-list').append(...RECAP.map((line, i) => row(line, i + 1)));
    $('#recap-check').addEventListener('click', check);
    $('#recap-reset').addEventListener('click', () => {
        rows.forEach(r => r.reset());
        $('#recap-score').hidden = true;
        rows[0].input.focus();
    });
}
