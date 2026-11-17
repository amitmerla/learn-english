// Present Simple helpers: verb forms, mixed Hebrew/English text and speech,
// a question generator (one rule per question), and the widget that shows a question.

import { el, esc, confettiAt } from '../util.js';
import { speak, speakParts, parseMixed, hasVoice } from '../ai.js';
import { RULES, SUBJECTS, VERBS, TIME_WORDS, ruleById } from './data.js';

/* ---------------------------------------------------------------- grammar */

export const ending = v => v === 'have' ? 'has' : /(s|sh|ch|x|z|o)$/.test(v) ? 'es' : /[^aeiou]y$/.test(v) ? 'ies' : 's';

export function third(v) {
    switch (ending(v)) {
        case 'has': return 'has';
        case 'es': return `${v}es`;
        case 'ies': return `${v.slice(0, -1)}ies`;
        default: return `${v}s`;
    }
}

const RULE_OF_ENDING = { s: 2, es: 3, ies: 4, has: 5 };
export const ruleOf = (subject, v) => subject.p === 3 ? RULE_OF_ENDING[ending(v)] : 1;

// Forms a pupil might wrongly write, for the multiple-choice options.
function wrongForms(v, subject) {
    if (subject.p !== 3) return [third(v)];
    switch (ending(v)) {
        case 'has': return ['have', 'haves'];
        case 'es': return [`${v}s`, v];
        case 'ies': return [`${v}s`, `${v}es`];
        default: return [v, `${v}es`];
    }
}

export const norm = s => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\bdoes not\b/g, "doesn't").replace(/\bdo not\b/g, "don't").replace(/[.?!,]/g, '').replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------- mixed text + speech */

/** "שלום [[apple]]" → HTML with the English kept left-to-right. */
export const mixed = str => esc(str).replace(/\[\[(.+?)\]\]/g, '<bdi class="en" dir="ltr">$1</bdi>');

/** Say a Hebrew line with English words in it; English only when there is no Hebrew voice. */
export function say(he, en, opts) {
    if (he && hasVoice('he')) return speakParts(parseMixed(he).parts, opts);
    return speak(en, opts);
}
export const sayEn = (text, opts) => speak(text.replace(/_{2,}/g, ', hmm, '), opts);

/* ---------------------------------------------------------------- generator */

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const cap = s => s[0].toUpperCase() + s.slice(1);
const low = t => /^(I|Dana|Tom)$/.test(t) ? t : t[0].toLowerCase() + t.slice(1);

function scene({ p, pets = true, verbs } = {}) {
    for (let i = 0; i < 50; i++) {
        const subject = pick(SUBJECTS.filter(s => (p == null || s.p === p) && (pets || !s.pet)));
        const pool = VERBS.filter(x => (!verbs || verbs(x.v)) && (!subject.pet || x.pet));
        if (!pool.length) continue;
        const verb = pick(pool);
        return { subject, v: verb.v, rest: pick(subject.pet ? verb.pet : verb.rest) };
    }
    return { subject: SUBJECTS[4], v: 'play', rest: 'football' };
}

const formOf = (subject, v) => subject.p === 3 ? third(v) : v;

const BUILDERS = {
    1: () => formQuestion(scene({ p: 1 })),
    2: () => formQuestion(scene({ p: 3, verbs: v => ending(v) === 's' })),
    3: () => formQuestion(scene({ p: 3, verbs: v => ending(v) === 'es' })),
    4: () => formQuestion(scene({ p: 3, verbs: v => ending(v) === 'ies' })),
    5: () => formQuestion(scene({ p: 3, verbs: v => v === 'have' })),
    6: () => (Math.random() < .3 ? fixQuestion(6) : Math.random() < .5 ? orderQuestion('neg') : negQuestion()),
    7: () => (Math.random() < .5 ? orderQuestion('q') : askQuestion()),
    8: () => timeQuestion(),
    9: () => specialQuestion(),
};

/** One new question. `rules`: which rule ids to ask about. */
export function makeQuestion(rules = RULES.map(r => r.id)) {
    const rule = pick(rules);
    // Now and then, "find the mistake" for the he / she / it rules.
    if ([1, 2].includes(rule) && Math.random() < .25) return fixQuestion(rule);
    return BUILDERS[rule]();
}

function formQuestion({ subject, v, rest }) {
    const answer = formOf(subject, v);
    const full = `${subject.t} ${answer} ${rest}.`;
    const kind = Math.random() < .4 ? 'type' : 'pick';
    return {
        rule: ruleOf(subject, v), kind, before: `${subject.t} `, after: ` ${rest}.`, hint: v,
        options: kind === 'pick' ? shuffle([answer, ...wrongForms(v, subject)]) : null,
        answers: [answer], full,
    };
}

function negQuestion() {
    const { subject, v, rest } = scene({});
    const answer = subject.p === 3 ? "doesn't" : "don't";
    return {
        rule: 6, kind: 'pick', before: `${subject.t} `, after: ` ${v} ${rest}.`,
        options: ["don't", "doesn't"], answers: [answer], full: `${subject.t} ${answer} ${v} ${rest}.`,
    };
}

function askQuestion() {
    const { subject, v, rest } = scene({});
    const answer = subject.p === 3 ? 'Does' : 'Do';
    return {
        rule: 7, kind: 'pick', before: '', after: ` ${low(subject.t)} ${v} ${rest}?`,
        options: ['Do', 'Does'], answers: [answer], full: `${answer} ${low(subject.t)} ${v} ${rest}?`,
    };
}

function orderQuestion(type) {
    const { subject, v, rest } = scene({ pets: false });
    const aux = type === 'q' ? (subject.p === 3 ? 'Does' : 'Do') : (subject.p === 3 ? "doesn't" : "don't");
    const words = type === 'q'
        ? [aux, low(subject.t), v, ...rest.split(' ')]
        : [subject.t, aux, v, ...rest.split(' ')];
    const full = `${words.join(' ')}${type === 'q' ? '?' : '.'}`;
    // Tiles are whole phrases where that keeps it short enough for young pupils.
    const tiles = [words[0], words[1], words[2], words.slice(3).join(' ')];
    return {
        rule: type === 'q' ? 7 : 6, kind: 'order', tiles, mark: type === 'q' ? '?' : '.',
        promptHe: type === 'q' ? 'סַדְּרוּ אֶת הַמִּילִּים לִשְׁאֵלָה:' : 'סַדְּרוּ אֶת הַמִּילִּים לְמִשְׁפַּט שְׁלִילָה:',
        answers: [norm(tiles.join(' '))], full,
    };
}

function timeQuestion() {
    const { subject, v, rest } = scene({});
    const word = pick(TIME_WORDS);
    const options = shuffle([word, ...shuffle(TIME_WORDS.filter(w => w !== word)).slice(0, 2)]).map(w => w.en);
    const form = formOf(subject, v);
    return {
        rule: 8, kind: 'pick', before: `${subject.t} `, after: ` ${form} ${rest}.`, hintHe: word.he,
        options, answers: [word.en], full: `${subject.t} ${word.en} ${form} ${rest}.`,
    };
}

// Rule 9, the words that don't follow the rules: be, can, everyone.
const BE_REST = { people: ['happy today', 'at school', 'very kind', 'in the kitchen'], pets: ['hungry', 'very small', 'in the garden'] };
const CAN_VERBS = ['swim', 'ride', 'sing', 'read', 'fly', 'play', 'catch', 'fix', 'carry', 'walk', 'teach'];
const beForm = s => s.t === 'I' ? 'am' : s.p === 3 ? 'is' : 'are';

function specialQuestion() {
    const r = Math.random();
    if (r < .55) {
        const subject = pick(r < .4 ? SUBJECTS : SUBJECTS.filter(s => s.t !== 'I'));
        const rest = pick(subject.pet ? BE_REST.pets : BE_REST.people);
        if (r < .4) {
            const answer = beForm(subject);
            return { rule: 9, kind: 'pick', before: `${subject.t} `, after: ` ${rest}.`, hint: 'be', options: ['am', 'is', 'are'], answers: [answer], full: `${subject.t} ${answer} ${rest}.` };
        }
        // A question with be starts with Is / Are, not Does.
        const answer = subject.p === 3 ? 'Is' : 'Are';
        return { rule: 9, kind: 'pick', before: '', after: ` ${low(subject.t)} ${rest}?`, options: ['Is', 'Are', 'Does'], answers: [answer], full: `${answer} ${low(subject.t)} ${rest}?` };
    }
    if (r < .8) {
        // "can" is about what someone is able to do, so only verbs that sound right after it.
        const { subject, v, rest } = scene({ p: 3, verbs: x => CAN_VERBS.includes(x) });
        return { rule: 9, kind: 'pick', before: `${subject.t} can `, after: ` ${rest}.`, hint: v, options: shuffle([v, third(v)]), answers: [v], full: `${subject.t} can ${v} ${rest}.` };
    }
    const who = pick(['Everyone', 'Everybody', 'Everyone in my class']);
    const { v, rest } = scene({ p: 3, pets: false, verbs: x => x !== 'have' });
    const answer = third(v);
    const kind = Math.random() < .5 ? 'type' : 'pick';
    return { rule: 9, kind, before: `${who} `, after: ` ${rest}.`, hint: v, options: kind === 'pick' ? shuffle([answer, v]) : null, answers: [answer], full: `${who} ${answer} ${rest}.` };
}

// A sentence with one wrong word: tap it.
function fixQuestion(rule) {
    let s, words, at, right;
    if (rule === 1) {
        s = scene({ p: 1 });
        words = [s.subject.t, third(s.v), ...s.rest.split(' ')];
        at = 1; right = s.v;
    } else if (rule === 2) {
        s = scene({ p: 3, verbs: v => ending(v) === 's' });
        words = [s.subject.t, s.v, ...s.rest.split(' ')];
        at = 1; right = third(s.v);
    } else {
        s = scene({ p: 3, pets: false, verbs: v => v !== 'have' });
        words = [s.subject.t, "doesn't", third(s.v), ...s.rest.split(' ')];
        at = 2; right = s.v;
    }
    const fixed = words.slice();
    fixed[at] = right;
    return { rule, kind: 'fix', words, at, right, answers: [String(at)], full: `${fixed.join(' ')}.` };
}

/* ---------------------------------------------------------------- question widget */

/**
 * Show a question. Calls onDone(ok, item) once, after the pupil answers.
 * Returns the element.
 */
export function questionCard(item, onDone, { speakFull = true } = {}) {
    let done = false;
    const card = el('div', { class: 'qcard' });
    const feedback = el('div', { class: 'qfeedback', 'aria-live': 'polite' });

    const finish = (ok, given) => {
        if (done) return;
        done = true;
        card.classList.add(ok ? 'ok' : 'bad');
        card.querySelectorAll('button.opt, input, .tile').forEach(b => { b.disabled = true; });
        const rule = ruleById(item.rule);
        feedback.replaceChildren(
            el('div', { class: 'qf-head', text: ok ? pick(['✅ כָּל הַכָּבוֹד!', '✅ מְצוּיָּן!', '✅ נָכוֹן מְאוֹד!', '🌟 בְּדִיּוּק!']) : '💡 כִּמְעַט!' }),
            ok ? '' : el('div', { class: 'qf-right' }, el('span', { text: 'הַתְּשׁוּבָה הַנְּכוֹנָה: ' }), el('bdi', { class: 'en', dir: 'ltr', text: item.full })),
            el('button', {
                class: 'rule-chip', style: { '--c': rule.color }, type: 'button',
                'data-tip': 'Tap to read this rule again.',
                onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: rule.id })),
                html: `<b>${rule.icon} ${rule.id}</b> <span dir="rtl">${mixed(rule.short)}</span>`,
            }),
        );
        if (ok) confettiAt(card, 30);
        if (speakFull) sayEn(item.full);
        onDone?.(ok, item, given);
    };

    const sentence = (blank) => el('div', { class: 'qsentence', dir: 'ltr' },
        item.before, blank, item.after,
        item.hint ? el('span', { class: 'qhint', text: `(${item.hint})` }) : '',
        item.hintHe ? el('span', { class: 'qhint he', dir: 'rtl', text: `(${item.hintHe})` }) : '');
    const sayBtn = el('button', { class: 'btn-icon qsay', type: 'button', 'aria-label': 'Listen', 'data-tip': 'Listen to the sentence.', text: '🔊',
        onclick: () => sayEn(item.kind === 'fix' ? `${item.words.join(' ')}.` : item.kind === 'order' ? item.promptHe : `${item.before}___${item.after}`) });

    if (item.kind === 'pick') {
        const blank = el('span', { class: 'blank', text: '?' });
        card.append(el('div', { class: 'qrow' }, sentence(blank), sayBtn),
            el('div', { class: 'opts' }, item.options.map(o => el('button', {
                class: 'opt', type: 'button', text: o,
                onclick: e => {
                    const ok = item.answers.includes(o);
                    e.currentTarget.classList.add(ok ? 'right' : 'wrong');
                    blank.textContent = ok ? o : item.answers[0];
                    blank.classList.add(ok ? 'right' : 'fixed');
                    if (!ok) card.querySelectorAll('button.opt').forEach(b => { if (item.answers.includes(b.textContent)) b.classList.add('right'); });
                    finish(ok, o);
                },
            }))));
    } else if (item.kind === 'type') {
        const input = el('input', { class: 'blank-input', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'aria-label': 'Write the verb' });
        input.style.width = `${Math.max(5, item.answers[0].length + 2)}ch`;
        const check = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Check ✓', 'data-tip': 'Check your answer.' });
        const go = () => {
            if (!input.value.trim() || done) return;
            const ok = item.answers.some(a => norm(a) === norm(input.value));
            input.classList.add(ok ? 'right' : 'wrong');
            if (!ok) input.value = `${input.value} → ${item.answers[0]}`;
            check.disabled = true;
            finish(ok, input.value);
        };
        check.addEventListener('click', go);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        card.append(el('div', { class: 'qrow' }, sentence(input), sayBtn), el('div', { class: 'opts' }, check));
        setTimeout(() => input.focus({ preventScroll: true }), 50);
    } else if (item.kind === 'order') {
        const line = el('div', { class: 'order-line', dir: 'ltr' });
        const bank = el('div', { class: 'order-bank', dir: 'ltr' });
        const placed = [];
        const paint = () => {
            line.replaceChildren(...placed.map((t, i) => el('button', { class: 'tile in', type: 'button', text: t, onclick: () => { placed.splice(i, 1); paint(); } })),
                el('span', { class: 'order-mark', text: item.mark }));
            line.classList.toggle('empty', !placed.length);
            bank.querySelectorAll('.tile').forEach(b => { b.hidden = placed.filter(p => p === b.textContent).length >= item.tiles.filter(t => t === b.textContent).length; });
            if (placed.length === item.tiles.length) {
                const ok = norm(placed.join(' ')) === item.answers[0];
                line.classList.add(ok ? 'right' : 'wrong');
                finish(ok, placed.join(' '));
            }
        };
        let tiles = shuffle(item.tiles);
        if (tiles.join() === item.tiles.join()) tiles = [...tiles.slice(1), tiles[0]];
        bank.append(...tiles.map(t => el('button', { class: 'tile', type: 'button', text: t, onclick: () => { if (!done) { placed.push(t); paint(); } } })));
        card.append(el('div', { class: 'qrow' }, el('div', { class: 'qprompt', dir: 'rtl', html: mixed(item.promptHe) }), sayBtn), line, bank);
        paint();
    } else if (item.kind === 'fix') {
        const words = el('div', { class: 'fix-line', dir: 'ltr' }, item.words.map((w, i) => el('button', {
            class: 'fix-word', type: 'button', text: w,
            onclick: e => {
                const ok = i === item.at;
                e.currentTarget.classList.add(ok ? 'right' : 'wrong');
                const bad = words.children[item.at];
                bad.classList.add('fixed');
                bad.dataset.right = item.right;
                finish(ok, String(i));
            },
        })), el('span', { text: '.' }));
        card.append(el('div', { class: 'qrow' }, el('div', { class: 'qprompt', dir: 'rtl', text: 'יֵשׁ כָּאן מִילָּה אַחַת לֹא נְכוֹנָה. לַחֲצוּ עָלֶיהָ!' }), sayBtn), words);
    }
    card.append(feedback);
    return card;
}
