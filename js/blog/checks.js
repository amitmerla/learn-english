// Live checks while the pupil writes: no AI, instant, the same every time.
// Each issue is { start, end, kind, fix? }: the text range, which tip it breaks, and the fixed text.

import { VERBS } from '../grammar/data.js';
import { third } from '../grammar/gen.js';
import { PLAN } from './data.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// "may" and "march" are left out: they are also everyday words.
const MONTHS = ['january', 'february', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const NAMES = new RegExp(`\\b(${[...DAYS, ...MONTHS].join('|')})s?\\b`, 'g');
const QUESTION = /^(do|does|did|are|is|am|can|what|where|why|who|when|how|which|would|will|have|has)\b/i;
const NOT_A_NAME = new Set(['I', 'We', 'You', 'They', 'My', 'Our', 'Your', 'His', 'Her', 'Their', 'The', 'On', 'In', 'At', 'And', 'But', 'Also', 'Please', 'Every', 'After', 'Do', 'Does', 'Can', 'When', 'What', 'Where', 'Why', 'How', 'Who',
    'Then', 'Sometimes', 'Usually', 'Always', 'Often', 'Never', 'Today', 'Now', 'Yes', 'No', 'Let', 'Lets', 'If', 'So', 'Because', 'Or', 'With']);
const BASE = new Set(VERBS.map(v => v.v).concat(['want', 'love', 'need', 'make', 'cook', 'dance', 'draw', 'help', 'listen', 'look', 'run', 'speak', 'write', 'come', 'get', 'work', 'climb', 'bake', 'paint', 'skate']));
const THIRD = new Map([...BASE].map(v => [third(v), v]));
const cap = w => w[0].toUpperCase() + w.slice(1);

/** All issues in the text, in order. `names`: the pupil's own names to capitalize (e.g. from the badge). */
export function checkText(text, { names = [] } = {}) {
    const out = [];
    const add = (start, end, kind, fix) => out.push({ start, end, kind, fix });

    // A sentence starts at the beginning, after . ! ? or after a new line.
    for (const m of text.matchAll(/(^|[.!?]\s+|\n\s*)([a-z])/g)) {
        const at = m.index + m[1].length;
        add(at, at + 1, 'start', m[2].toUpperCase());
    }
    for (const m of text.matchAll(/(?<![\w'])i(?=('m|'ve|'ll|'d)?\b)(?!['-]\w{3})/g)) add(m.index, m.index + 1, 'i', 'I');
    for (const m of text.matchAll(NAMES)) add(m.index, m.index + m[0].length, 'name', cap(m[0]));
    for (const n of names) {
        if (!/^[A-Za-z][a-z]+$/.test(n)) continue;
        for (const m of text.matchAll(new RegExp(`\\b${n.toLowerCase()}\\b`, 'g'))) add(m.index, m.index + n.length, 'name', cap(n.toLowerCase()));
    }

    // Each sentence: a question ends with ?, and every sentence ends with . ! or ?
    for (const m of text.matchAll(/[^.!?\n]+[.!?]*/g)) {
        const s = m[0].trimEnd();
        if (!/[A-Za-z]{2}/.test(s)) continue;
        const end = m.index + s.length;
        const body = s.trim();
        const isLast = !text.slice(end).trim() || /^\s*\n/.test(text.slice(end));
        if (QUESTION.test(body) && body.endsWith('.')) add(end - 1, end, 'question', '?');
        // The sentence still being written (the very end of the text) gets no "missing ." yet.
        else if (!/[.!?]$/.test(body) && isLast && text.slice(end).length > 0) add(end - 1, end, 'end', `${s.at(-1)}.`);
    }

    // he / she / it + verb without s, and I / we / they + verb with s.
    for (const m of text.matchAll(/\b(he|she|it|He|She|It|my (?:mom|dad|mother|father|brother|sister|friend|cat|dog|teacher)|My (?:mom|dad|mother|father|brother|sister|friend|cat|dog|teacher)|[A-Z][a-z]+)\s+(always |usually |often |sometimes |never )?([a-z]+)\b/g)) {
        const [all, who, , verb] = m;
        if (NOT_A_NAME.has(who) || !BASE.has(verb)) continue;
        const at = m.index + all.length - verb.length;
        add(at, at + verb.length, 's', third(verb));
    }
    for (const m of text.matchAll(/\b(I|we|you|they|We|You|They)\s+(always |usually |often |sometimes |never )?([a-z]+)\b/g)) {
        const verb = m[3];
        if (!THIRD.has(verb)) continue;
        const at = m.index + m[0].length - verb.length;
        add(at, at + verb.length, 'noS', THIRD.get(verb));
    }

    // Things that should not go on the internet.
    for (const m of text.matchAll(/\+?\d[\d\s-]{6,}\d|[\w.+-]+@[\w-]+\.\w+|\b\d+\s+\w+\s+(street|st\.?|road|avenue)\b|\b(street|road)\s+\d+/gi)) add(m.index, m.index + m[0].length, 'private');
    for (const m of text.matchAll(/[֐-׿][֐-׿\s'"]*/g)) add(m.index, m.index + m[0].trimEnd().length, 'hebrew');

    // One issue per place: the first one found wins.
    out.sort((a, b) => a.start - b.start);
    return out.filter((x, i) => !out.slice(0, i).some(y => x.start < y.end && y.start < x.end));
}

/** Apply one fix to the text. */
export const applyFix = (text, issue) => text.slice(0, issue.start) + issue.fix + text.slice(issue.end);

/** Words, sentences and paragraphs, plus which of the plan's four parts are already there. */
export function stats(text) {
    const words = text.match(/[A-Za-z']+/g)?.length ?? 0;
    const sentences = text.match(/[^.!?\n]*[A-Za-z][^.!?\n]*[.!?]/g)?.length ?? 0;
    const paragraphs = text.split(/\n\s*\n|\n/).filter(p => /[A-Za-z]{2}/.test(p)).length;
    const parts = Object.fromEntries(PLAN.map(p => [p.id, p.words.test(text)]));
    return { words, sentences, paragraphs, parts };
}
