// (e) Guided tour: spotlight + talking card. Reads each step out loud,
// highlights each word as it is spoken, and can pause or jump to any step.

import { $, el, sleep } from './util.js';
import { speakParts, parseMixed, stopSpeaking } from './ai.js';
import { homeVoiceOn } from './voice.js';

// `he` is used when the Hebrew voice is on. [[...]] marks words said in English.
const STEPS = [
    { target: null, title: 'Welcome to Word Wizard! 👋', text: "Hi! I'm Buddy the fox. I will show you around. You can pause me, go back, or tap a dot to jump to any part.",
        he: { title: 'ברוכים הבאים ל-Word Wizard! 👋', text: 'היי! אני באדי השועל. אני אראה לכם את כל החלקים בעמוד. אפשר לעצור אותי, לחזור אחורה, או ללחוץ על נקודה כדי לקפוץ לכל חלק.' } },
    { target: '#profile-chip', title: 'Your magic badge 🪄', text: 'This is you! The AI made this badge just for you. Tap it to see it big, or to make a new one.',
        he: { title: 'התג הקסום שלכם 🪄', text: 'זה אתם! הבינה המלאכותית הכינה את התג הזה במיוחד בשבילכם. לחצו עליו כדי לראות אותו בגדול, או כדי ליצור תג חדש.' } },
    { target: '#features-panel', title: 'AI Powers 🧠', text: 'These are the AI tools inside your browser. Green means ready. Blue means you can download it. Grey means your browser does not have it yet.',
        he: { title: 'כוחות הבינה המלאכותית 🧠', text: 'אלה כלי הבינה המלאכותית שנמצאים בתוך הדפדפן שלכם. ירוק אומר שהכלי מוכן. כחול אומר שאפשר להוריד אותו. אפור אומר שהדפדפן עוד לא תומך בו.' } },
    { target: '#add-form', title: 'Add your words ✏️', text: 'Type the words you need to learn here. You can add many words at once. Just put a comma between them.',
        he: { title: 'הוסיפו מילים ✏️', text: 'כאן כותבים את המילים באנגלית שצריך ללמוד. אפשר להוסיף הרבה מילים ביחד. פשוט שמים פסיק בין המילים.' } },
    { target: '#drop', title: 'Upload a photo or Word file 📷', text: 'Have a word list on paper? Take a photo and drop it here. I will read the words, show you a progress bar, and ask you about any word I cannot read. If I read a word wrong, tap it to fix it. Have your list in a Word file? Drop it here too, and choose the words to add.',
        he: { title: 'העלו תמונה או קובץ וורד 📷', text: 'יש לכם רשימת מילים על דף? צלמו אותה ושימו את התמונה כאן. אני אקרא את המילים, אראה לכם פס התקדמות, ואשאל אתכם על כל מילה שלא הצלחתי לקרוא. אם קראתי מילה לא נכון, לחצו עליה ותקנו אותה. הרשימה שלכם בקובץ וורד? אפשר לשים גם אותו כאן, ולבחור אילו מילים להוסיף.' } },
    { target: '#words-panel', title: 'Your word cards 📚', text: 'Every word gets its own card. Tap Say to hear it, Translate to see it in your language, Meaning to learn what it means, and Try it to practice saying it.',
        he: { title: 'כרטיסי המילים 📚', text: 'לכל מילה יש כרטיס משלה. לחצו על [[Say]] כדי לשמוע אותה, על [[Translate]] כדי לראות אותה בעברית, על [[Meaning]] כדי להבין מה היא אומרת, ועל [[Try it]] כדי לתרגל להגיד אותה.' } },
    { target: '#header-stats', title: 'Your progress ⭐', text: 'When you know a word, tap Got it. The word gets a gold star, and your progress circle grows.',
        he: { title: 'ההתקדמות שלכם ⭐', text: 'כשאתם יודעים מילה, לחצו על [[Got it]]. המילה מקבלת כוכב זהב, ועיגול ההתקדמות גדל.' } },
    { target: '#quiz-btn', title: 'Word Challenge 🏆', text: 'When you think you know your star words, take the quiz! First pick the right meaning, then write each word you hear. Pass both, and the word gets a trophy.',
        he: { title: 'אתגר המילים 🏆', text: 'כשאתם חושבים שאתם יודעים את מילות הכוכב, עשו את המבחן! קודם בוחרים את הפירוש הנכון, ואחר כך כותבים כל מילה שאתם שומעים. מצליחים בשניהם? המילה מקבלת גביע.' } },
    { target: '.lang-pick', title: 'Your language 🌍', text: 'Choose your home language here. All translations will use this language. If you choose Hebrew, you can also turn on the Hebrew voice.',
        he: { title: 'השפה שלכם 🌍', text: 'כאן בוחרים את שפת הבית. כל התרגומים יהיו בשפה הזאת. וכשהקול בעברית דולק, אני מדבר איתכם בעברית, ואת המילים באנגלית אני אומר באנגלית.' } },
    { target: '#chat-panel', title: 'Chat with Buddy 🦊', text: 'This is me! Ask me about your words. I can explain them, translate them, make stories, and even add or remove words for you.',
        he: { title: 'צ׳אט עם באדי 🦊', text: 'זה אני! אפשר לשאול אותי על המילים שלכם. אני יכול להסביר אותן, לתרגם אותן, להמציא סיפורים, ואפילו להוסיף או למחוק מילים בשבילכם.' } },
    { target: '#suggestions', title: 'Idea bubbles 💬', text: 'Not sure what to ask? Tap an idea bubble. Try the spelling quiz. It is fun!',
        he: { title: 'בועות רעיונות 💬', text: 'לא בטוחים מה לשאול? לחצו על בועת רעיון. נסו את מבחן האיות, זה כיף!' } },
    { target: '#chat-mic', title: 'Talk with your voice 🎤', text: 'Tap the microphone and speak in English. I will listen and answer you.',
        he: { title: 'דברו איתי בקול 🎤', text: 'לחצו על המיקרופון ודברו באנגלית. אני אקשיב לכם ואענה.' } },
    { target: '#engine-panel', title: 'AI Engine Room ⚙️', text: 'Want to see how the AI thinks? Every question shows up here, with each step, every tool it uses, and the answer.',
        he: { title: 'חדר המנועים ⚙️', text: 'רוצים לראות איך הבינה המלאכותית חושבת? כל שאלה מופיעה כאן, עם כל שלב, כל כלי שהיא משתמשת בו, והתשובה.' } },
    { target: '#tour-btn', title: "You're ready! 🚀", text: 'That is everything! You can start this tour again any time with this button. Hover over any button to see a tip. Have fun learning!',
        he: { title: 'אתם מוכנים! 🚀', text: 'זה הכול! אפשר להתחיל את הסיור שוב בכל זמן עם הכפתור הזה. עברו עם העכבר על כל כפתור כדי לראות טיפ. תהנו מהלמידה!' } },
];

const ui = {
    root: $('#tour'), spot: $('#tour-spot'), card: $('#tour-card'), step: $('#tour-step'),
    title: $('#tour-title'), text: $('#tour-text'), dots: $('#tour-dots'),
    play: $('#tour-play'), mute: $('#tour-mute'),
};

let i = 0;
let playing = true;
let muted = false;
let token = 0;
const seen = new Set();

function wordSpans(text, parts) {
    ui.text.replaceChildren();
    const spans = [];
    const mixed = parts.length > 1;
    for (const p of parts) {
        // An English phrase stays one span, so "Try it" isn't flipped in right-to-left text.
        if (mixed && p.lang === 'en') {
            const s = el('span', { class: 'w en', dir: 'ltr', text: p.text });
            s.dataset.start = p.start;
            spans.push(s);
            ui.text.append(s);
            continue;
        }
        let pos = p.start;
        for (const piece of p.text.split(/(\s+)/)) {
            if (piece.trim()) {
                const s = el('span', { class: 'w', text: piece });
                s.dataset.start = pos;
                spans.push(s);
                ui.text.append(s);
            } else if (piece) ui.text.append(piece);
            pos += piece.length;
        }
    }
    return spans;
}

function place(target) {
    const card = ui.card;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    if (!target) {
        Object.assign(ui.spot.style, { left: `${innerWidth / 2}px`, top: `${innerHeight / 2}px`, width: '0px', height: '0px' });
        Object.assign(card.style, { left: `${(innerWidth - cw) / 2}px`, top: `${(innerHeight - ch) / 2}px` });
        return;
    }
    const r = target.getBoundingClientRect();
    const pad = 8;
    Object.assign(ui.spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });

    const gap = 24;
    const options = [
        { x: r.right + gap, y: r.top, fit: r.right + gap + cw < innerWidth },
        { x: r.left - gap - cw, y: r.top, fit: r.left - gap - cw > 0 },
        { x: r.left + r.width / 2 - cw / 2, y: r.bottom + gap, fit: r.bottom + gap + ch < innerHeight },
        { x: r.left + r.width / 2 - cw / 2, y: r.top - gap - ch, fit: r.top - gap - ch > 0 },
    ];
    const o = options.find(o => o.fit) ?? { x: (innerWidth - cw) / 2, y: innerHeight - ch - 20 };
    card.style.left = `${Math.max(16, Math.min(o.x, innerWidth - cw - 16))}px`;
    card.style.top = `${Math.max(36, Math.min(o.y, innerHeight - ch - 16))}px`;
}

function paintDots() {
    [...ui.dots.children].forEach((d, n) => {
        d.classList.toggle('active', n === i);
        d.classList.toggle('seen', seen.has(n) && n !== i);
    });
}

async function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    const my = ++token;
    seen.add(i);
    stopSpeaking();
    const s = STEPS[i];
    const target = s.target ? $(s.target) : null;
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    ui.step.textContent = `${i + 1} / ${STEPS.length}`;
    const he = homeVoiceOn() && s.he;
    const { text, parts } = he ? parseMixed(s.he.text) : { text: s.text, parts: [{ text: s.text, lang: 'en', start: 0 }] };
    ui.card.dir = he ? 'rtl' : 'ltr';
    ui.title.textContent = he ? s.he.title : s.title;
    const spans = wordSpans(text, parts);
    paintDots();
    await sleep(60);
    place(target);

    if (!playing) return;
    await sleep(450);
    if (my !== token) return;

    ui.card.classList.add('talking');
    if (muted) {
        // No voice: light the words up at reading speed instead.
        for (const sp of spans) {
            if (my !== token) return;
            sp.classList.add('said');
            await sleep(230);
        }
    } else {
        let last = null;
        await speakParts(parts, {
            rate: .95,
            onBoundary: e => {
                if (my !== token || e.name !== 'word') return;
                const hit = spans.findLast(sp => +sp.dataset.start <= e.charIndex);
                if (!hit) return;
                last?.classList.replace('on', 'said');
                spans.forEach(sp => { if (+sp.dataset.start < +hit.dataset.start) sp.classList.add('said'); });
                hit.classList.add('on');
                last = hit;
            },
        });
        last?.classList.replace('on', 'said');
    }
    if (my !== token) return;
    ui.card.classList.remove('talking');
    spans.forEach(sp => sp.classList.add('said'));
    await sleep(900);
    if (my !== token || !playing) return;
    if (i < STEPS.length - 1) go(i + 1);
    else setPlaying(false);
}

function setPlaying(on) {
    playing = on;
    ui.play.textContent = on ? '⏸' : '▶';
    ui.play.setAttribute('aria-label', on ? 'Pause tour' : 'Play tour');
    if (!on) { token++; stopSpeaking(); ui.card.classList.remove('talking'); }
    else go(i);
}

export function startTour(at = 0) {
    ui.root.hidden = false;
    playing = true;
    ui.play.textContent = '⏸';
    go(at);
}

export function closeTour() {
    token++;
    stopSpeaking();
    ui.root.hidden = true;
    ui.card.classList.remove('talking');
    try { localStorage.setItem('wordwizard.toured', '1'); } catch { /* ignore */ }
}

export const tourSeen = () => { try { return !!localStorage.getItem('wordwizard.toured'); } catch { return false; } };

export function initTour() {
    STEPS.forEach((s, n) => ui.dots.append(el('button', { 'aria-label': `Go to step ${n + 1}: ${s.title}`, 'data-tip': s.title, onclick: () => go(n) })));
    $('#tour-btn').addEventListener('click', () => startTour(0));
    $('#tour-prev').addEventListener('click', () => go(i - 1));
    $('#tour-next').addEventListener('click', () => (i < STEPS.length - 1 ? go(i + 1) : closeTour()));
    ui.play.addEventListener('click', () => setPlaying(!playing));
    ui.mute.addEventListener('click', () => {
        muted = !muted;
        ui.mute.textContent = muted ? '🔇' : '🔊';
        if (playing) go(i);
    });
    $('#tour-close').addEventListener('click', closeTour);
    $('#tour-shade').addEventListener('click', closeTour);
    addEventListener('resize', () => { if (!ui.root.hidden) place(STEPS[i].target ? $(STEPS[i].target) : null); });
    addEventListener('keydown', e => {
        if (ui.root.hidden) return;
        if (e.key === 'Escape') closeTour();
        else if (e.key === 'ArrowRight') go(i + 1);
        else if (e.key === 'ArrowLeft') go(i - 1);
        else if (e.key === ' ' && !e.target.closest('input, button')) { e.preventDefault(); setPlaying(!playing); }
    });
}
