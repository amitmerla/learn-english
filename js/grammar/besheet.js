// The "Verb To Be" worksheet: am / is / are, negative sentences, questions, and WH words.
// Each part has its own Check button, like checking one exercise at a time in class.

import { $, el, confetti } from '../util.js';
import { BE_SHEET, ruleById } from './data.js';
import { mixed, norm, say, sayEn } from './gen.js';
import { progress } from './progress.js';

// "isn't" and "is not" are both right; compare the long forms.
const longForm = s => norm(s)
    .replace(/\bisn't\b/g, 'is not').replace(/\baren't\b/g, 'are not').replace(/\bi'm\b/g, 'i am');

function ruleChip(id) {
    const rule = ruleById(id);
    return el('button', { class: 'rule-chip', type: 'button', style: { '--c': rule.color }, 'data-tip': 'Tap to read this rule again.',
        html: `<b>${rule.icon} ${rule.id}</b> <span>${mixed(rule.short)}</span>`,
        onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: rule.id })) });
}

function scoreBanner(box, ok, all) {
    box.hidden = false;
    box.innerHTML = `<b>${ok === all ? '⭐⭐⭐' : ok >= all * .7 ? '⭐⭐' : ok >= all / 2 ? '⭐' : '💪'}</b> <span dir="rtl">${ok} מִתּוֹךְ ${all} נְכוֹנוֹת</span>`;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    if (ok === all) {
        confetti(innerWidth / 2, innerHeight / 3, 140);
        say('מוּשְׁלָם! כָּל הַתְּשׁוּבוֹת נְכוֹנוֹת!', 'Perfect! All the answers are right!');
    } else {
        say('יָפֶה! תַּקְּנוּ אֶת מַה שֶּׁמְּסוּמָּן בְּאָדוֹם וּבִדְקוּ שׁוּב.', 'Nice! Fix the red ones and check again.');
    }
}

// Tap one of the options for each blank.
function choosePart(part, n) {
    const rows = part.lines.map(([before, after, answer], i) => {
        const blank = el('span', { class: 'blank', text: '?' });
        let picked = null;
        const opts = el('div', { class: 'be-opts', dir: 'ltr', role: 'radiogroup', 'aria-label': `Sentence ${i + 1}` }, part.options.map(o => el('button', {
            class: 'be-opt', type: 'button', role: 'radio', 'aria-checked': 'false', text: o,
            'data-tip': part.meanings ? `${o} = ${part.meanings[o].replace(/[֑-ׇ]/g, '')}` : `Put “${o}” in the blank.`,
            onclick: e => {
                picked = o;
                opts.querySelectorAll('.be-opt').forEach(b => b.setAttribute('aria-checked', String(b === e.currentTarget)));
                blank.textContent = o;
                blank.className = 'blank chosen';
                li.className = 'sheet-row';
                result.replaceChildren();
            },
        })));
        const result = el('div', { class: 'recap-result', dir: 'rtl' });
        const li = el('li', { class: 'sheet-row' },
            el('div', { class: 'recap-line' },
                el('span', { class: 'recap-n', text: i + 1 }),
                el('div', { class: 'qsentence', dir: 'ltr' }, before, blank, after),
                el('button', { class: 'btn-icon qsay', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the sentence.', text: '🔊',
                    onclick: () => sayEn(`${before}___${after}`) })),
            opts, result);
        return {
            li,
            check() {
                const ok = picked === answer;
                li.className = `sheet-row checked ${ok ? 'ok' : 'bad'}`;
                blank.className = `blank ${ok ? 'right' : 'fixed'}`;
                if (!ok) blank.textContent = answer;
                result.replaceChildren(ok ? '' : el('span', { class: 'miss', html: `✗ <bdi class="en" dir="ltr">${answer}</bdi>` }),
                    !ok && part.meanings ? el('span', { class: 'note', html: mixed(`[[${answer}]] = ${part.meanings[answer]}`) }) : '',
                    !ok && part.rule ? ruleChip(part.rule) : '');
                if (part.rule) progress.practiced(part.rule, ok);
                return ok;
            },
            reset() {
                picked = null;
                blank.textContent = '?';
                blank.className = 'blank';
                opts.querySelectorAll('.be-opt').forEach(b => b.setAttribute('aria-checked', 'false'));
                li.className = 'sheet-row';
                result.replaceChildren();
            },
        };
    });
    return section(part, n, rows);
}

// Write the whole sentence again in the negative.
function rewritePart(part, n) {
    const rows = part.lines.map(([given, answer], i) => {
        const input = el('input', { class: 'rewrite-input', type: 'text', dir: 'ltr', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off',
            placeholder: '…', 'aria-label': `Sentence ${i + 1} in the negative` });
        const result = el('div', { class: 'recap-result', dir: 'rtl' });
        input.addEventListener('input', () => { input.classList.remove('right', 'wrong'); li.className = 'sheet-row'; result.replaceChildren(); });
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const next = li.nextElementSibling?.querySelector('input');
            if (next) next.focus(); else li.closest('.sheet-part').querySelector('.be-check').focus();
        });
        const li = el('li', { class: 'sheet-row' },
            el('div', { class: 'recap-line' },
                el('span', { class: 'recap-n', text: i + 1 }),
                el('div', { class: 'qsentence', dir: 'ltr', text: given }),
                el('button', { class: 'btn-icon qsay', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the sentence.', text: '🔊',
                    onclick: () => sayEn(given) })),
            el('div', { class: 'rewrite-line', dir: 'ltr' }, el('span', { class: 'rewrite-arrow', text: '🚫' }), input),
            result);
        return {
            li,
            check() {
                const ok = !!input.value.trim() && longForm(input.value) === longForm(answer);
                input.classList.toggle('right', ok);
                input.classList.toggle('wrong', !ok);
                li.className = `sheet-row checked ${ok ? 'ok' : 'bad'}`;
                result.replaceChildren(ok ? '' : el('span', { class: 'miss', html: `✗ <bdi class="en" dir="ltr">${answer}</bdi>` }), ok ? '' : ruleChip(part.rule));
                progress.practiced(part.rule, ok);
                return ok;
            },
            reset() { input.value = ''; input.classList.remove('right', 'wrong'); li.className = 'sheet-row'; result.replaceChildren(); },
        };
    });
    return section(part, n, rows);
}

function section(part, n, rows) {
    const banner = el('div', { class: 'score-banner', hidden: true });
    return el('div', { class: 'sheet-part' },
        el('h3', { dir: 'rtl' }, el('span', { class: 'part-no', text: n }), el('span', { html: mixed(part.title) })),
        part.help ? el('p', { class: 'part-help', dir: 'rtl', html: mixed(part.help) }) : '',
        el('ol', { class: 'sheet-list', dir: 'ltr' }, rows.map(r => r.li)),
        el('div', { class: 'g-actions' },
            el('button', { class: 'btn btn-glow be-check', type: 'button', 'data-tip': 'Check this part.', text: '✓ בִּדְקוּ אוֹתִי · Check',
                onclick: () => scoreBanner(banner, rows.filter(r => r.check()).length, rows.length) }),
            el('button', { class: 'btn btn-ghost', type: 'button', 'data-tip': 'Clear this part and try again.', text: '↺ שׁוּב · Again',
                onclick: () => { rows.forEach(r => r.reset()); banner.hidden = true; } })),
        banner);
}

export function initBeSheet() {
    $('#sheet-be').append(...BE_SHEET.map((part, i) => (part.kind === 'rewrite' ? rewritePart : choosePart)(part, i + 1)));
}
