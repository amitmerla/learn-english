// Wizard profile: the pupil's name, boy / girl, and a magic name badge.
// Gemini Nano designs the badge (picture, colors, shape, hero title, motto) as JSON,
// and the app draws it as an animated SVG. Without Nano, "magic dice" design it.

import { $, el, esc, sleep, confettiAt, toast } from './util.js';
import { store } from './store.js';
import { ask, lmReady } from './ai.js';
import { engine } from './engine.js';
import { talk } from './voice.js';

/* ---------------------------------------------------------------- badge parts */

const EMOJIS = ['🐉', '🦁', '🐯', '🦊', '🐼', '🦄', '🐬', '🦅', '🦉', '🐺', '🐙', '🦖', '🐢', '🦋', '🐝', '🐧',
    '🚀', '🛸', '🪐', '🌟', '⚡', '🔥', '🌈', '🌊', '🌙', '☀️', '🍀', '🌸', '🌵', '🍉', '🍕', '🧁',
    '🎸', '🎨', '🎮', '⚽', '🏀', '🎯', '🏆', '👑', '💎', '🔮', '🧩', '🎧', '🛹', '🏄', '🧙', '🤖', '🦸', '👾', '📚', '🗝️'];
const SPARKLES = ['✨', '⭐', '💫', '🌟', '❤️', '🎵', '💥', '🍀', '🌸', '❄️'];
const PALETTES = {
    sunset: ['#fb923c', '#f472b6', '#a78bfa'],
    ocean: ['#22d3ee', '#3b82f6', '#6366f1'],
    galaxy: ['#a78bfa', '#6366f1', '#ec4899'],
    jungle: ['#34d399', '#10b981', '#facc15'],
    candy: ['#f9a8d4', '#f472b6', '#c084fc'],
    fire: ['#facc15', '#fb923c', '#ef4444'],
    ice: ['#a5f3fc', '#22d3ee', '#818cf8'],
    gold: ['#fde68a', '#facc15', '#f59e0b'],
    aurora: ['#22d3ee', '#34d399', '#a78bfa'],
    berry: ['#f472b6', '#a855f7', '#6366f1'],
};
const SHAPES = ['circle', 'shield', 'burst', 'hexagon', 'gem'];
const THEMES = ['space', 'animals', 'sports', 'music', 'nature', 'magic', 'the ocean', 'super heroes', 'games', 'food', 'dragons', 'robots'];

// Fallback words, so badges look great without AI too.
const ADJ = {
    a: 'Amazing', b: 'Brave', c: 'Clever', d: 'Daring', e: 'Epic', f: 'Fearless', g: 'Great', h: 'Happy', i: 'Incredible',
    j: 'Jolly', k: 'Kind', l: 'Lucky', m: 'Mighty', n: 'Noble', o: 'Outstanding', p: 'Powerful', q: 'Quick', r: 'Radiant',
    s: 'Super', t: 'Terrific', u: 'Unstoppable', v: 'Vivid', w: 'Wonderful', x: 'Xtra', y: 'Young', z: 'Zippy',
};
const ADJ_ANY = ['Brave', 'Clever', 'Mighty', 'Super', 'Lucky', 'Epic', 'Shining', 'Happy'];
const NOUNS = { '🐉': 'Dragon', '🦁': 'Lion', '🐯': 'Tiger', '🦊': 'Fox', '🐼': 'Panda', '🦄': 'Unicorn', '🐬': 'Dolphin',
    '🦅': 'Eagle', '🦉': 'Owl', '🐺': 'Wolf', '🐙': 'Octopus', '🦖': 'Dino', '🐢': 'Turtle', '🦋': 'Butterfly', '🐝': 'Bee',
    '🐧': 'Penguin', '🚀': 'Rocket', '🛸': 'Explorer', '🪐': 'Space Hero', '🌟': 'Star', '⚡': 'Flash', '🔥': 'Fire Hero',
    '🌈': 'Rainbow', '🌊': 'Surfer', '🌙': 'Moon Hero', '☀️': 'Sunshine', '🍀': 'Clover', '🌸': 'Blossom', '🌵': 'Cactus',
    '🍉': 'Melon', '🍕': 'Pizza Hero', '🧁': 'Cupcake', '🎸': 'Rocker', '🎨': 'Artist', '🎮': 'Gamer', '⚽': 'Striker',
    '🏀': 'Hooper', '🎯': 'Champion', '🏆': 'Champion', '👑': 'Ruler', '💎': 'Diamond', '🔮': 'Wizard', '🧩': 'Puzzler',
    '🎧': 'DJ', '🛹': 'Skater', '🏄': 'Surfer', '🧙': 'Wizard', '🤖': 'Robot', '🦸': 'Hero', '👾': 'Gamer', '📚': 'Reader',
    '🗝️': 'Explorer' };
const MOTTOS = ['I learn a new word every day!', 'Words are my super power!', 'I never give up!', 'Every word makes me stronger!',
    'Big dreams, bright words!', 'I can do it!', 'Learning is my adventure!', 'One word at a time!'];

const pick = a => a[Math.floor(Math.random() * a.length)];
const firstLatin = name => (name.match(/[a-z]/i)?.[0] ?? '').toLowerCase();

const SCHEMA = {
    type: 'object',
    properties: {
        emoji: { type: 'string', enum: EMOJIS },
        sparkle: { type: 'string', enum: SPARKLES },
        palette: { type: 'string', enum: Object.keys(PALETTES) },
        shape: { type: 'string', enum: SHAPES },
        title: { type: 'string', maxLength: 26 },
        motto: { type: 'string', maxLength: 48 },
    },
    required: ['emoji', 'sparkle', 'palette', 'shape', 'title', 'motto'],
};

function diceBadge(name, used) {
    const fresh = EMOJIS.filter(e => !used.includes(e));
    const emoji = pick(fresh.length ? fresh : EMOJIS);
    const letter = firstLatin(name);
    return {
        emoji,
        sparkle: pick(SPARKLES),
        palette: pick(Object.keys(PALETTES)),
        shape: pick(SHAPES),
        title: `${letter && name.trim()[0].match(/[a-z]/i) ? ADJ[letter] : pick(ADJ_ANY)} ${NOUNS[emoji] ?? 'Hero'}`,
        motto: pick(MOTTOS),
    };
}

// The model is asked for the right shape, but double-check every field anyway.
function clean(spec, fallback) {
    const ok = (v, list) => list.includes(v) ? v : null;
    const short = (v, n) => typeof v === 'string' && v.trim() && v.length <= n ? v.trim().replace(/^["']|["']$/g, '') : null;
    return {
        emoji: ok(spec?.emoji, EMOJIS) ?? fallback.emoji,
        sparkle: ok(spec?.sparkle, SPARKLES) ?? fallback.sparkle,
        palette: ok(spec?.palette, Object.keys(PALETTES)) ?? fallback.palette,
        shape: ok(spec?.shape, SHAPES) ?? fallback.shape,
        title: short(spec?.title, 26) ?? fallback.title,
        motto: short(spec?.motto, 48) ?? fallback.motto,
    };
}

async function designBadge(name, gender, used) {
    const dice = diceBadge(name, used);
    if (lmReady()) {
        const theme = pick(THEMES);
        try {
            const spec = await ask({
                title: `Magic badge for ${name}`,
                icon: '🎨',
                schema: SCHEMA,
                prompt: `Design a magic name badge for a ${gender} in 5th grade. The name is "${name}".
Pick "emoji" (the main picture), "sparkle" (a small extra emoji), "palette" (colors) and "shape".
"title": a cool 2 or 3 word hero title in easy English, without the name.${firstLatin(name) && /^[a-z]/i.test(name) ? ` The first word starts with the letter "${name[0].toUpperCase()}", like "Brave Dragon" for Ben.` : ''}
"motto": one short, happy sentence in easy English (at most 7 words).
Today's idea: ${theme}. Make it fun and surprising.${used.length ? ` Do not use these pictures again: ${used.join(' ')}.` : ''}`,
            });
            return { ...clean(spec, dice), by: 'nano' };
        } catch { /* the dice take over */ }
    }
    const run = engine.start({ title: `Magic badge for ${name}`, icon: '🎲', engine: 'Magic dice (no AI)' });
    run.step('🧠', 'Gemini Nano is not ready, so the magic dice design the badge').done('');
    const s = run.step('🎲', 'Rolling for a picture, colors, shape and a hero title');
    await sleep(300);
    s.done();
    run.finish(true, JSON.stringify(dice, null, 1));
    return { ...dice, by: 'dice' };
}

/* ---------------------------------------------------------------- drawing */

let uid = 0;

function poly(n, r1, r2 = r1, rot = -Math.PI / 2) {
    const pts = [];
    const steps = r2 === r1 ? n : n * 2;
    for (let i = 0; i < steps; i++) {
        const r = i % 2 && r2 !== r1 ? r2 : r1;
        const a = rot + i * Math.PI * 2 / steps;
        pts.push(`${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`);
    }
    return pts.join(' ');
}

function shapeTag(shape, scale = 1) {
    const t = scale === 1 ? '' : ` transform="translate(100 100) scale(${scale}) translate(-100 -100)"`;
    switch (shape) {
        case 'shield': return `<path${t} d="M100 24 L162 46 V98 C162 140 134 164 100 178 C66 164 38 140 38 98 V46 Z"/>`;
        case 'burst': return `<polygon${t} points="${poly(12, 76, 64)}"/>`;
        case 'hexagon': return `<polygon${t} points="${poly(6, 74, 74, 0)}"/>`;
        case 'gem': return `<polygon${t} points="100,22 166,72 140,170 60,170 34,72"/>`;
        default: return `<circle${t} cx="100" cy="100" r="72"/>`;
    }
}

/** The badge's three colors, for things drawn around it (like the school ribbon). */
export const badgeColors = b => PALETTES[b.palette] ?? PALETTES.galaxy;

/** Animated SVG badge. `small` drops the moving extras for tiny sizes. */
export function badgeSVG(b, name = '', { small = false } = {}) {
    const id = `bdg${++uid}`;
    const [c1, c2, c3] = PALETTES[b.palette] ?? PALETTES.galaxy;
    const initial = esc((name.trim()[0] ?? '').toUpperCase());
    const rays = Array.from({ length: 12 }, (_, i) =>
        `<polygon points="100,100 ${poly(1, 100, 100, (i * 30 - 4) * Math.PI / 180)} ${poly(1, 100, 100, (i * 30 + 4) * Math.PI / 180)}"/>`).join('');
    const orbit = small ? '' : [0, 120, 240].map(a =>
        `<text x="${100 + Math.cos(a * Math.PI / 180) * 88}" y="${100 + Math.sin(a * Math.PI / 180) * 88}" font-size="16" text-anchor="middle" dominant-baseline="central">${b.sparkle}</text>`).join('');
    return `<svg class="badge-svg" viewBox="-10 -10 220 220" role="img" aria-label="${esc(b.title)} badge">
<defs>
 <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
 <radialGradient id="${id}h"><stop offset="0" stop-color="${c2}" stop-opacity=".9"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>
 <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <radialGradient id="${id}r" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="100"><stop offset=".5" stop-color="${c1}" stop-opacity=".55"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient>
 <clipPath id="${id}c">${shapeTag(b.shape)}</clipPath>
</defs>
<circle cx="100" cy="100" r="104" fill="url(#${id}h)" class="badge-halo"/>
${small ? '' : `<g class="badge-rays" fill="url(#${id}r)">${rays}</g>
<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="2 9" stroke-linecap="round" class="badge-ring"/>`}
<g fill="url(#${id}g)" stroke="#fff" stroke-opacity=".75" stroke-width="4">${shapeTag(b.shape)}</g>
<g fill="#0b0e22" fill-opacity=".22" stroke="#fff" stroke-opacity=".25" stroke-width="1.5">${shapeTag(b.shape, .8)}</g>
<g clip-path="url(#${id}c)"><rect class="badge-shine" x="-60" y="-20" width="50" height="240" fill="url(#${id}s)" transform="rotate(20 100 100)"/></g>
<text class="badge-emoji" x="100" y="104" font-size="${small ? 84 : 74}" text-anchor="middle" dominant-baseline="central">${b.emoji}</text>
${small ? '' : `<g class="badge-orbit">${orbit}</g>`}
${initial ? `<g class="badge-initial"><circle cx="156" cy="154" r="${small ? 26 : 21}" fill="#0b0e22" stroke="url(#${id}g)" stroke-width="4"/>
<text x="156" y="156" font-size="${small ? 30 : 24}" font-weight="700" font-family="Fredoka, sans-serif" fill="#fff" text-anchor="middle" dominant-baseline="central">${initial}</text></g>` : ''}
</svg>`;
}

/* ---------------------------------------------------------------- UI */

const ui = {};
let draft = null;      // { name, gender, school, city, classroom, history: [badge], at }
let busy = false;

const profile = () => store.prefs.profile ?? null;
const heName = name => /[a-z]/i.test(name) ? `[[${name}]]` : name;
const cleanName = raw => raw.replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trimStart().slice(0, 20);
// School, city and class are written in Hebrew: Hebrew letters, digits and a little punctuation.
const cleanHebrew = raw => raw.replace(/[^\u0590-\u05FF0-9 '"׳״().-]/g, '').replace(/\s+/g, ' ').trimStart();
const WHERE = ['school', 'city', 'classroom'];
const isComplete = p => !!p && WHERE.every(k => p[k]);

function paintChip() {
    const p = profile();
    ui.chip.classList.toggle('is-empty', !p);
    if (!p) {
        ui.chipBadge.innerHTML = '<span class="pc-wand">🪄</span>';
        ui.chipName.textContent = 'Who are you?';
        ui.chipTitle.textContent = 'Make your magic badge';
        ui.chip.dataset.tip = 'Tell me your name, and the AI will make you your own magic badge!';
        ui.chipWhere.hidden = true;
        ui.chipTitle.hidden = false;
        return;
    }
    ui.chipBadge.innerHTML = badgeSVG(p.badge, p.name, { small: true });
    ui.chipName.replaceChildren(el('span', { class: 'pc-hi', text: 'Hi, ' }), p.name, el('span', { class: 'pc-hi', text: '!' }));
    if (p.classroom) ui.chipName.append(el('span', { class: 'pc-class', dir: 'rtl', text: p.classroom }));
    ui.chipTitle.textContent = p.badge.title;
    // School and city sit under the name; the hero title moves to the tooltip.
    ui.chipSchool.textContent = p.school ?? '';
    ui.chipCity.textContent = p.city ?? '';
    ui.chipWhere.hidden = !p.school && !p.city;
    ui.chipTitle.hidden = !ui.chipWhere.hidden;
    const where = [p.school, p.classroom, p.city].filter(Boolean).join(' · ');
    ui.chip.dataset.tip = `This is your magic badge, ${p.name}: ${p.badge.title}!${where ? ` ${where}.` : ''} Tap it to see it big, or to make a new one.`;
}

function paintLetters() {
    const name = ui.name.value.trim();
    const spans = ui.letters.children;
    // Only new letters pop in, so typing feels alive without the whole word jumping.
    const chars = [...name];
    while (spans.length > chars.length) spans[spans.length - 1].remove();
    chars.forEach((c, i) => {
        if (spans[i]?.textContent === c) return;
        const s = el('span', { text: c === ' ' ? ' ' : c, style: { animationDelay: `${Math.min(i, 3) * 20}ms` } });
        if (spans[i]) spans[i].replaceWith(s); else ui.letters.append(s);
    });
    ui.letters.classList.toggle('is-empty', !chars.length);
    paintGo();
}

function paintGo() {
    ui.go.disabled = !ui.name.value.trim() || !ui.form.querySelector('input[name="gender"]:checked');
}

function paintWhere() {
    let ok = true;
    for (const k of WHERE) {
        const filled = !!ui[k].value.trim();
        ui[k].closest('.pm-field').classList.toggle('filled', filled);
        ok &&= filled;
    }
    ui.forge.disabled = !ok;
}

// A gentle nudge when English letters are typed into a Hebrew field.
let hintTimer = 0;
function hebrewHint(field) {
    ui.hint.hidden = false;
    ui.hint.classList.remove('shake');
    void ui.hint.offsetWidth;
    ui.hint.classList.add('shake');
    field.closest('.pm-field').classList.add('oops');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
        ui.hint.hidden = true;
        field.closest('.pm-field').classList.remove('oops');
    }, 3500);
}

function showStep(step) {
    ui.modal.dataset.step = step;
    ui.who.hidden = step !== 'who';
    ui.where.hidden = step !== 'where';
    ui.badgeStep.hidden = step !== 'badge';
    if (step === 'where') {
        ui.whereName.textContent = draft.name;
        paintWhere();
        setTimeout(() => (WHERE.map(k => ui[k]).find(i => !i.value.trim()) ?? ui.school).focus(), 300);
    }
}

function paintRibbon(b) {
    const [c1, c2, c3] = badgeColors(b);
    ui.ribbon.style.setProperty('--r1', c1);
    ui.ribbon.style.setProperty('--r2', c2);
    ui.ribbon.style.setProperty('--r3', c3);
    ui.rSchool.textContent = draft.school;
    ui.rClass.textContent = draft.classroom;
    ui.rCity.textContent = draft.city;
    ui.ribbon.hidden = !draft.school && !draft.classroom;
    ui.rCityRow.hidden = !draft.city;
}

export function openProfile() {
    const p = profile();
    draft = {
        name: p?.name ?? '', gender: p?.gender ?? '',
        school: p?.school ?? '', city: p?.city ?? '', classroom: p?.classroom ?? '',
        history: p ? [p.badge] : [], at: p ? 0 : -1,
    };
    ui.name.value = draft.name;
    for (const k of WHERE) ui[k].value = draft[k];
    ui.form.querySelectorAll('input[name="gender"]').forEach(r => { r.checked = r.value === draft.gender; });
    ui.letters.replaceChildren();
    paintLetters();
    if (p && !isComplete(p)) {
        // Badges made before school, city and class were asked for.
        showStep('where');
    } else if (p) {
        showStep('badge');
        showBadge(p.badge, { reveal: false });
        ui.ask.textContent = `This is your badge, ${p.name}!`;
    } else {
        showStep('who');
    }
    ui.modal.showModal();
    if (!p) setTimeout(() => ui.name.focus(), 350);
}

function paintHistory() {
    ui.history.replaceChildren(...draft.history.map((b, i) => el('button', {
        class: `ph-item${i === draft.at ? ' on' : ''}`,
        'aria-label': `Badge ${i + 1}: ${b.title}`,
        'data-tip': `Go back to this badge: ${b.title}`,
        html: badgeSVG(b, draft.name, { small: true }),
        onclick: () => { draft.at = i; showBadge(b, { reveal: true, quiet: true }); },
    })));
    ui.history.hidden = draft.history.length < 2;
}

function showBadge(b, { reveal = true } = {}) {
    ui.stage.classList.remove('forging');
    ui.stageBadge.innerHTML = badgeSVG(b, draft.name);
    paintRibbon(b);
    ui.stageBadge.classList.remove('reveal');
    if (reveal) { void ui.stageBadge.offsetWidth; ui.stageBadge.classList.add('reveal'); }
    ui.bTitle.textContent = b.title;
    ui.bName.textContent = draft.name;
    ui.bMotto.textContent = `“${b.motto}”`;
    ui.bBy.textContent = b.by === 'dice' ? '🎲 Made by the magic dice' : '🧠 Designed by Gemini Nano';
    ui.yes.disabled = ui.again.disabled = false;
    paintHistory();
}

async function forge() {
    if (busy) return;
    busy = true;
    showStep('badge');
    ui.stage.classList.add('forging');
    ui.stageBadge.classList.remove('reveal');
    ui.yes.disabled = ui.again.disabled = true;
    ui.ask.textContent = 'Mixing your magic…';
    ui.bTitle.textContent = '';
    ui.bMotto.textContent = '';
    ui.bBy.textContent = '';
    ui.bName.textContent = draft.name;
    ui.ribbon.hidden = true;
    ui.rCityRow.hidden = true;

    // Slot-machine pictures while the AI thinks.
    let n = 0;
    const spin = setInterval(() => {
        ui.stageBadge.innerHTML = `<div class="forge-slot">${EMOJIS[(n++ * 7) % EMOJIS.length]}</div>`;
    }, 110);
    const msgs = ['Mixing your magic…', 'Choosing your colors…', 'Finding your hero name…', 'Adding sparkles…'];
    let m = 0;
    const talkLoop = setInterval(() => { ui.ask.textContent = msgs[++m % msgs.length]; }, 900);

    try {
        const [badge] = await Promise.all([
            designBadge(draft.name, draft.gender, draft.history.map(b => b.emoji)),
            sleep(1800),
        ]);
        clearInterval(spin);
        clearInterval(talkLoop);
        draft.history.push(badge);
        draft.at = draft.history.length - 1;
        showBadge(badge);
        ui.ask.textContent = `Do you like it, ${draft.name}?`;
        confettiAt(ui.stageBadge, 70);
        talk(`Ta-da! ${draft.name}, you are the ${badge.title}! Do you like it?`,
            `טה-דה! ${heName(draft.name)}, זה התג הקסום שלך: [[${badge.title}]]! אהבת?`);
    } finally {
        clearInterval(spin);
        clearInterval(talkLoop);
        busy = false;
    }
}

function accept() {
    const badge = draft.history[draft.at];
    if (!badge) return;
    const isNew = !isComplete(profile());
    store.setPref('profile', {
        name: draft.name, gender: draft.gender,
        school: draft.school, city: draft.city, classroom: draft.classroom,
        badge, savedAt: new Date().toISOString(),
    });
    confettiAt(ui.stageBadge, 140);
    ui.modal.classList.add('closing');
    setTimeout(() => {
        ui.modal.close();
        ui.modal.classList.remove('closing');
        paintChip();
        ui.chip.classList.remove('arrive');
        void ui.chip.offsetWidth;
        ui.chip.classList.add('arrive');
        confettiAt(ui.chipBadge, 60);
    }, 450);
    const welcome = draft.gender === 'girl' ? 'ברוכה הבאה' : 'ברוך הבא';
    const lets = draft.gender === 'girl' ? 'בואי' : 'בוא';
    talk(`Welcome, ${badge.title} ${draft.name}! Let's learn some words!`, `${welcome}, ${heName(draft.name)}! ${lets} נלמד מילים באנגלית!`);
    if (isNew) onWelcome?.();
}

let onWelcome = null;

export function initProfile({ onFirstWelcome } = {}) {
    onWelcome = onFirstWelcome;
    Object.assign(ui, {
        chip: $('#profile-chip'), chipBadge: $('#pc-badge'), chipName: $('#pc-name'), chipTitle: $('#pc-title'),
        chipWhere: $('#pc-where'), chipSchool: $('#pc-school'), chipCity: $('#pc-city'),
        modal: $('#profile-modal'), form: $('#profile-who'), who: $('#profile-who'), where: $('#profile-where'), badgeStep: $('#profile-badge'),
        whereName: $('#where-name'), school: $('#profile-school'), city: $('#profile-city'), classroom: $('#profile-class'),
        hint: $('#where-hint'), forge: $('#profile-forge'), back: $('#where-back'),
        ribbon: $('#badge-ribbon'), rSchool: $('#ribbon-school'), rClass: $('#ribbon-class'), rCity: $('#badge-city'), rCityRow: $('#badge-city-row'),
        name: $('#profile-name'), letters: $('#profile-letters'), go: $('#profile-go'),
        stage: $('#badge-stage'), stageBadge: $('#badge-big'), ask: $('#badge-ask'),
        bName: $('#badge-name'), bTitle: $('#badge-title'), bMotto: $('#badge-motto'), bBy: $('#badge-by'),
        yes: $('#badge-yes'), again: $('#badge-again'), edit: $('#badge-edit'), history: $('#badge-history'),
    });

    ui.chip.addEventListener('click', openProfile);
    ui.name.addEventListener('input', () => {
        const v = cleanName(ui.name.value);
        if (v !== ui.name.value) ui.name.value = v;
        paintLetters();
    });
    ui.name.addEventListener('keydown', e => { if (e.key === 'Enter' && !ui.go.disabled) { e.preventDefault(); ui.go.click(); } });
    ui.form.querySelectorAll('input[name="gender"]').forEach(r => r.addEventListener('change', () => {
        paintGo();
        r.closest('.gender-card').classList.remove('picked');
        void r.offsetWidth;
        r.closest('.gender-card').classList.add('picked');
        talk(r.value === 'boy' ? 'A boy wizard!' : 'A girl wizard!', r.value === 'boy' ? '[[A boy wizard!]] קוסם!' : '[[A girl wizard!]] קוסמת!');
    }));
    ui.go.addEventListener('click', () => {
        const name = ui.name.value.trim();
        const gender = ui.form.querySelector('input[name="gender"]:checked')?.value;
        if (!name || !gender) return;
        // A new name or gender starts a fresh set of badges.
        if (name !== draft.name || gender !== draft.gender) { draft.history = []; draft.at = -1; }
        draft.name = name;
        draft.gender = gender;
        showStep('where');
        talk(`Nice to meet you, ${name}! Where do you learn?`, `נעים מאוד, ${heName(name)}! איפה ${gender === 'girl' ? 'את לומדת' : 'אתה לומד'}?`);
    });
    for (const k of WHERE) {
        ui[k].addEventListener('input', () => {
            const v = cleanHebrew(ui[k].value);
            if (/[a-z]/i.test(ui[k].value)) hebrewHint(ui[k]);
            if (v !== ui[k].value) ui[k].value = v;
            paintWhere();
        });
        ui[k].addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const next = WHERE.map(n => ui[n]).find(i => !i.value.trim());
            if (next) next.focus(); else ui.forge.click();
        });
    }
    ui.back.addEventListener('click', () => { showStep('who'); ui.name.focus(); });
    ui.forge.addEventListener('click', () => {
        for (const k of WHERE) draft[k] = ui[k].value.trim();
        if (!WHERE.every(k => draft[k])) return;
        // Same pupil, new school details: keep the badge they already have.
        if (draft.history[draft.at]) { showStep('badge'); showBadge(draft.history[draft.at]); ui.ask.textContent = `Do you like it, ${draft.name}?`; }
        else forge();
    });
    ui.yes.addEventListener('click', accept);
    ui.again.addEventListener('click', () => {
        talk("No problem! Let me make a new one.", 'אין בעיה! אני מכין תג חדש.');
        forge();
    });
    ui.edit.addEventListener('click', () => { if (!busy) { showStep('who'); ui.name.focus(); } });
    ui.modal.addEventListener('close', () => { if (!profile()) toast('You can make your magic badge any time. Tap “Who are you?” at the top.', { icon: '🪄', ms: 5000 }); });

    paintChip();
}

export const hasProfile = () => isComplete(profile());
