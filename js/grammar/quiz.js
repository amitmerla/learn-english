// Quiz: ten questions, one on each rule plus two more, then stars and a per-rule review.

import { $, el, confetti } from '../util.js';
import { RULES, ruleById } from './data.js';
import { mixed, say, makeQuestion, questionCard } from './gen.js';
import { progress } from './progress.js';

const N = 10;
let questions = [];
let answers = [];
let at = 0;

function paintBest() {
    const best = progress.get().quizBest;
    $('#gq-best').textContent = best == null ? 'עוֹד לֹא נִבְחַנְתֶּם. בְּהַצְלָחָה! 🍀' : `הַשִּׂיא שֶׁלָּכֶם: ${best} מִתּוֹךְ ${N} ${best >= 9 ? '⭐⭐⭐' : best >= 7 ? '⭐⭐' : best >= 5 ? '⭐' : ''}`;
}

function start() {
    // One question on every rule, and the rest on random rules.
    const rules = RULES.map(r => r.id);
    const extra = Array.from({ length: Math.max(0, N - rules.length) }, () => rules[Math.floor(Math.random() * rules.length)]);
    questions = [...rules, ...extra].slice(0, N).sort(() => Math.random() - .5).map(r => makeQuestion([r]));
    answers = [];
    at = 0;
    $('#gq-start').hidden = true;
    $('#gq-end').hidden = true;
    $('#gq-run').hidden = false;
    $('#gq-dots').replaceChildren(...questions.map(() => el('span')));
    show();
    say('בְּהַצְלָחָה! קִרְאוּ כָּל שְׁאֵלָה בְּעִיּוּן.', 'Good luck! Read each question carefully.');
}

function show() {
    const dots = $('#gq-dots').children;
    [...dots].forEach((d, i) => d.classList.toggle('now', i === at));
    $('#gq-count').textContent = `${at + 1} / ${N}`;
    $('#gq-next').hidden = true;
    const card = questionCard(questions[at], ok => {
        answers[at] = ok;
        dots[at].classList.add(ok ? 'ok' : 'bad');
        progress.practiced(questions[at].rule, ok);
        const next = $('#gq-next');
        next.hidden = false;
        next.textContent = at === N - 1 ? 'לַתּוֹצָאוֹת · Results 🏁' : 'הַבָּא · Next ➜';
        next.focus({ preventScroll: true });
    });
    card.classList.add('enter');
    $('#gq-box').replaceChildren(card);
}

function finish() {
    const score = answers.filter(Boolean).length;
    const stars = score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0;
    const before = progress.get().quizBest;
    progress.quizDone(score);
    $('#gq-run').hidden = true;
    const end = $('#gq-end');
    end.hidden = false;

    const missed = [...new Set(questions.filter((_, i) => !answers[i]).map(q => q.rule))].map(ruleById);
    const ring = 2 * Math.PI * 52;
    end.replaceChildren(
        el('div', { class: 'gq-ring' },
            el('div', { html: `<svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="52"/><circle class="ring-fg" cx="60" cy="60" r="52" style="stroke-dasharray:${ring};stroke-dashoffset:${ring}"/></svg>` }),
            el('b', { text: `${score}/${N}` })),
        el('div', { class: 'gq-stars', 'aria-label': `${stars} stars` }, [1, 2, 3].map(i => el('span', { class: i <= stars ? 'on' : '', text: '⭐', style: { animationDelay: `${.3 + i * .25}s` } }))),
        el('h2', { dir: 'rtl', text: stars === 3 ? 'מוּשְׁלָם! אַתֶּם אַלּוּפֵי הַ־Present Simple! 🏆' : stars === 2 ? 'יָפֶה מְאוֹד! עוֹד קְצָת וְאַתֶּם שָׁם!' : stars === 1 ? 'כָּל הַכָּבוֹד עַל הַמַּאֲמָץ!' : 'בּוֹאוּ נְתַרְגֵּל עוֹד קְצָת 💪' }),
        before != null && score > before ? el('p', { class: 'gq-record', dir: 'rtl', text: '🎉 שִׂיא חָדָשׁ!' }) : '',
        missed.length ? el('div', { class: 'gq-review', dir: 'rtl' },
            el('p', { text: 'כְּדַאי לַחֲזוֹר עַל הַכְּלָלִים הָאֵלֶּה:' }),
            missed.map(r => el('button', { class: 'rule-chip', type: 'button', style: { '--c': r.color }, 'data-tip': 'Tap to read this rule again.',
                html: `<b>${r.icon} ${r.id}</b> <span>${mixed(r.short)}</span>`,
                onclick: () => document.dispatchEvent(new CustomEvent('grammar:rule', { detail: r.id })) }))) : '',
        el('div', { class: 'g-actions' },
            el('button', { class: 'btn btn-glow', type: 'button', text: '🔁 עוֹד פַּעַם · Again', onclick: start }),
            el('button', { class: 'btn btn-ghost', type: 'button', text: '✏️ לְתִרְגּוּל · Practice', onclick: () => document.querySelector('[data-tab="practice"]').click() })));
    requestAnimationFrame(() => requestAnimationFrame(() => {
        end.querySelector('.ring-fg').style.strokeDashoffset = ring * (1 - score / N);
    }));
    if (stars >= 2) confetti(innerWidth / 2, innerHeight / 3, stars === 3 ? 220 : 120);
    say(stars === 3 ? `מוּשְׁלָם! ${score} מִתּוֹךְ ${N}!` : `יֵשׁ לָכֶם ${score} מִתּוֹךְ ${N}. ${stars >= 2 ? 'יָפֶה מְאוֹד!' : 'בּוֹאוּ נְתַרְגֵּל עוֹד קְצָת.'}`,
        `You got ${score} out of ${N}. ${stars === 3 ? 'Perfect!' : stars >= 2 ? 'Very good!' : "Let's practice a bit more."}`);
    paintBest();
}

export function initQuiz() {
    paintBest();
    $('#gq-go').addEventListener('click', start);
    $('#gq-next').addEventListener('click', () => {
        if (at === N - 1) return finish();
        at += 1;
        show();
    });
}
