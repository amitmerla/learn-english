// Built-in browser AI: feature detection, Prompt API sessions, Translator,
// Language Detector, Text Detector, speech in and out.
//
// Every call that touches a model goes through engine.start() so it shows up
// in the AI Engine Room with its steps.

import { engine } from './engine.js';
import { LANG_NAMES } from './util.js';
import { store } from './store.js';
import { withNiqqud, plainIndex } from './niqqud.js';

const LM = globalThis.LanguageModel;
const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export const SYSTEM = `You are Buddy, a friendly and patient English teacher for children in 5th and 6th grade (ages 10-12).
Use short, clear sentences and simple words. Be warm and encouraging. Use an emoji now and then.
Never use difficult grammar terms without explaining them. Keep answers short: 1-4 sentences unless asked for more.`;

const TEXT_IO = {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
};
const IMAGE_IO = {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/* ================================================================ feature registry */

export const FEATURES = [
    { id: 'prompt', icon: '🧠', name: 'Prompt API', api: 'LanguageModel · Gemini Nano', desc: 'A small AI brain that lives inside your computer. No internet needed!', flag: 'chrome://flags/#prompt-api-for-gemini-nano' },
    { id: 'vision', icon: '👁️', name: 'Image Understanding', api: 'LanguageModel · image input', desc: 'The AI brain can look at a photo and read the words in it.', flag: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input' },
    { id: 'structured', icon: '🧩', name: 'Structured Answers', api: 'responseConstraint · JSON Schema', desc: 'Makes the AI answer in a neat shape that the app can understand.' },
    { id: 'tools', icon: '🛠️', name: 'Tool Calling', api: 'LanguageModel · tools', desc: 'Buddy can press the app buttons for you: add words, translate, speak.' },
    { id: 'webmcp', icon: '🔌', name: 'WebMCP', api: 'navigator.modelContext', desc: 'Shares this page’s tools with other AI helpers in your browser.', flag: 'chrome://flags/#enable-webmcp-testing' },
    { id: 'translator', icon: '🌐', name: 'Translator', api: 'Translator', desc: 'Translates words into your language, right on your computer.', flag: 'chrome://flags/#translation-api' },
    { id: 'detector', icon: '🕵️', name: 'Language Detector', api: 'LanguageDetector', desc: 'Guesses which language you typed, so it can help you.', flag: 'chrome://flags/#language-detection-api' },
    { id: 'ocr', icon: '🔤', name: 'Text Detector', api: 'TextDetector · Shape Detection', desc: 'Finds printed words inside a photo, super fast.', flag: 'chrome://flags/#enable-experimental-web-platform-features' },
    { id: 'tts', icon: '🗣️', name: 'Speaking Voice', api: 'speechSynthesis', desc: 'Reads words out loud so you can hear how to say them.' },
    { id: 'stt', icon: '🎤', name: 'Listening Ears', api: 'SpeechRecognition', desc: 'Listens when you speak English and checks how you said it.' },
];

export const state = Object.fromEntries(FEATURES.map(f => [f.id, { status: 'checking', label: 'Checking', note: '', progress: 0 }]));
export const bus = new EventTarget();

export function setFeature(id, patch) {
    Object.assign(state[id], patch);
    bus.dispatchEvent(new CustomEvent('feature', { detail: { id } }));
}

const LABELS = { available: 'Ready', downloadable: 'Download', downloading: 'Loading', unavailable: 'Not here', checking: 'Checking', emulated: 'Ready*', active: 'Working' };
const mark = (id, status, note = '', extra = {}) => setFeature(id, { status, label: extra.label ?? LABELS[status], note, ...extra });

// Some availability() calls never settle in some builds, so every check gets a time limit.
const withTimeout = (p, ms = 4000, fallback = 'timeout') =>
    Promise.race([Promise.resolve(p), new Promise(r => setTimeout(() => r(fallback), ms))]);

async function lmAvailability(opts) {
    if (!LM) return 'unavailable';
    try { return await withTimeout(LM.availability(opts), 6000, 'unavailable'); } catch { return 'unavailable'; }
}

export async function checkAll() {
    FEATURES.filter(f => f.id !== 'webmcp').forEach(f => mark(f.id, 'checking'));

    await Promise.all([checkPrompt().then(checkTranslator), checkDetector(), checkTextDetector()]);
    warmNano();
    mark('tts', 'speechSynthesis' in globalThis ? 'available' : 'unavailable');
    mark('stt', SR ? 'available' : 'unavailable', SR ? '' : 'Try Chrome or Edge to talk with your voice.');
    // WebMCP is marked by tools.js once it registers.
    if (!navigator.modelContext) mark('webmcp', 'unavailable', 'Your browser has no navigator.modelContext yet.');
}

async function checkPrompt() {
    const [text, image] = await Promise.all([lmAvailability(TEXT_IO), lmAvailability(IMAGE_IO)]);
    mark('prompt', text, LM ? '' : 'Needs Chrome with Gemini Nano turned on.');
    mark('vision', image, LM ? '' : 'Needs the Prompt API with image input.');
    mark('structured', text === 'available' ? 'available' : text === 'unavailable' ? 'unavailable' : 'downloadable',
        text === 'available' ? '' : 'Comes with the Prompt API.', text === 'downloadable' ? { label: 'With Nano' } : {});
    refreshToolsFeature();
}

async function checkDetector() {
    if (!('LanguageDetector' in globalThis)) return mark('detector', 'unavailable', 'No LanguageDetector in this browser.');
    const a = await withTimeout(LanguageDetector.availability().catch(() => 'unavailable'));
    if (a === 'timeout') return mark('detector', 'downloadable', 'The browser did not answer yet. Try “Get it”.');
    mark('detector', a);
}

async function checkTextDetector() {
    if (!('TextDetector' in globalThis)) return mark('ocr', 'unavailable', 'No TextDetector. Tesseract or Gemini Nano will read photos instead.');
    try {
        await withTimeout(new TextDetector().detect(new ImageData(1, 1)), 4000, null);
        mark('ocr', 'available');
    } catch (e) { mark('ocr', 'unavailable', `Present but not working here (${e.name}).`); }
}

export let nativeTools = false;
export let nativeToolsConfirmed = false;
export function setNativeTools(on) { nativeTools = on; chatSession = null; refreshToolsFeature(); }
export function confirmNativeTools() { if (!nativeToolsConfirmed) { nativeToolsConfirmed = true; refreshToolsFeature(); } }

export function refreshToolsFeature() {
    const lm = state.prompt.status;
    if (lm !== 'available') {
        mark('tools', lm === 'unavailable' ? 'emulated' : 'downloadable',
            lm === 'unavailable' ? 'Without Nano, Buddy uses simple built-in rules to run the tools.' : 'Turns on when Gemini Nano is ready.',
            { label: lm === 'unavailable' ? 'Basic' : 'With Nano' });
        return;
    }
    if (nativeTools) {
        mark('tools', nativeToolsConfirmed ? 'available' : 'emulated',
            nativeToolsConfirmed ? 'Native tool calls confirmed!' : 'Native tools on. Waiting for the model to call one.',
            { label: nativeToolsConfirmed ? 'Native' : 'Trying' });
    } else {
        mark('tools', 'available', 'Runs tools with a JSON plan (structured output).', { label: 'Ready' });
    }
}

export async function checkTranslator() {
    const lang = store.lang;
    if (!('Translator' in globalThis)) {
        mark('translator', state.prompt.status === 'available' ? 'emulated' : 'unavailable',
            state.prompt.status === 'available' ? 'No Translator API. Using Gemini Nano to translate instead.' : 'No Translator API in this browser.',
            state.prompt.status === 'available' ? { label: 'Via Nano' } : {});
        return;
    }
    try {
        const a = await withTimeout(Translator.availability({ sourceLanguage: 'en', targetLanguage: lang }));
        if (a === 'timeout') return mark('translator', 'downloadable', `English → ${LANG_NAMES[lang]}. The browser did not answer yet. Try “Get it”.`);
        mark('translator', a, `English → ${LANG_NAMES[lang]}`);
        if (a === 'available') warmTranslator(lang);
        // Not downloaded yet: start it on the pupil's first tap anywhere (downloads need a tap),
        // so it is ready before they press 🌐 Translate.
        if (a === 'downloadable') addEventListener('pointerdown', () => {
            if (state.translator.status === 'downloadable' && store.lang === lang) getTranslator('en', lang).catch(() => {});
        }, { once: true, capture: true });
    } catch { mark('translator', 'unavailable', `English → ${LANG_NAMES[lang]} is not supported.`); }
}

/* ================================================================ downloads */

function monitorFor(id) {
    return m => m.addEventListener('downloadprogress', e => {
        const p = e.total ? e.loaded / e.total : e.loaded;
        setFeature(id, { status: p >= 1 ? 'available' : 'downloading', label: p >= 1 ? 'Ready' : `${Math.round(p * 100)}%`, progress: p });
    });
}

// Called from a click, because downloads need a user gesture.
export async function downloadFeature(id) {
    const run = engine.start({ title: `Download ${FEATURES.find(f => f.id === id).name}`, icon: '⬇️', engine: id });
    const s = run.step('📦', 'Asking the browser to download the model');
    try {
        mark(id, 'downloading', '', { label: '0%' });
        if (id === 'prompt' || id === 'structured' || id === 'tools') (await LM.create({ ...TEXT_IO, monitor: monitorFor('prompt') })).destroy();
        else if (id === 'vision') (await LM.create({ ...IMAGE_IO, monitor: monitorFor('vision') })).destroy();
        else if (id === 'translator') await getTranslator('en', store.lang, monitorFor('translator'));
        else if (id === 'detector') detector = await LanguageDetector.create({ monitor: monitorFor('detector') });
        s.done('done', '✅');
        run.finish(true, 'Downloaded and ready to use!');
    } catch (e) {
        s.fail(e.message);
        run.finish(false, `Could not download: ${e.message}`);
    }
    await checkAll();
}

/* ================================================================ Prompt API */

export const lmReady = () => state.prompt.status === 'available';
export const visionReady = () => state.vision.status === 'available';

let baseSession = null;
let chatSession = null;

async function getBase() {
    if (!baseSession) baseSession = await LM.create({ ...TEXT_IO, initialPrompts: [{ role: 'system', content: SYSTEM }] });
    return baseSession;
}

async function freshTaskSession() {
    const base = await getBase();
    return base.clone ? base.clone() : LM.create({ ...TEXT_IO, initialPrompts: [{ role: 'system', content: SYSTEM }] });
}

// Streams a prompt, coping with both cumulative and delta chunks.
export async function streamPrompt(session, input, opts, onText) {
    let full = '';
    const stream = session.promptStreaming(input, opts);
    for await (const chunk of stream) {
        full = full && chunk.startsWith(full) ? chunk : full + chunk;
        onText?.(full);
    }
    return full;
}

/** One-shot question for the model, fully logged in the engine room. */
export async function ask({ title, icon = '🧠', prompt, schema, onText }) {
    const run = engine.start({ title, icon, prompt, engine: 'Gemini Nano' });
    setFeature('prompt', { status: 'active', label: 'Working' });
    try {
        const s1 = run.step('🧪', 'Opening a fresh AI session');
        const session = await freshTaskSession();
        s1.done();
        const s2 = run.step('💭', schema ? 'Thinking (answer shape is fixed by a JSON schema)' : 'Thinking and writing');
        let n = 0;
        const out = await streamPrompt(session, prompt, schema ? { responseConstraint: schema } : undefined, t => {
            n += 1; run.stream(t); onText?.(t); s2.set(`${t.length} chars`);
        });
        s2.done(`${n} chunks`);
        run.setUsage(session);
        session.destroy?.();
        run.finish(true, out);
        return schema ? JSON.parse(out) : out.trim();
    } catch (e) {
        run.step('⚠️', 'Something went wrong').fail(e.message);
        run.finish(false, e.message);
        throw e;
    } finally {
        refreshPromptBadge();
    }
}

function refreshPromptBadge() {
    if (state.prompt.status === 'active') mark('prompt', 'available');
}

/** Persistent chat session (keeps conversation memory). */
export async function getChatSession(tools) {
    const quota = chatSession?.inputQuota ?? chatSession?.maxTokens;
    const used = chatSession?.inputUsage ?? chatSession?.tokensSoFar;
    if (chatSession && quota && used > quota * .85) { chatSession.destroy?.(); chatSession = null; }
    if (!chatSession) {
        const opts = { ...TEXT_IO, initialPrompts: [{ role: 'system', content: tools.system }] };
        if (nativeTools) opts.tools = tools.native;
        chatSession = await LM.create(opts);
    }
    return chatSession;
}
export function resetChatSession() { chatSession?.destroy?.(); chatSession = null; }

/** Ask the model to read words in an image. */
export async function readImageWithNano(blob, run) {
    const s = run.step('👁️', 'Gemini Nano is looking at the photo');
    setFeature('vision', { status: 'active', label: 'Looking' });
    try {
        const session = await LM.create({ ...IMAGE_IO, initialPrompts: [{ role: 'system', content: 'You read text in photos of school word lists. You are careful and honest.' }] });
        const schema = {
            type: 'object',
            properties: {
                words: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { text: { type: 'string' }, sure: { type: 'boolean' } },
                        required: ['text', 'sure'],
                    },
                },
            },
            required: ['words'],
        };
        const out = await streamPrompt(session, [{
            role: 'user',
            content: [
                { type: 'text', value: 'Read every English word you can see in this image, in order. For each word, say if you are sure you read it correctly (sure=true) or if it is blurry, cut off or hard to read (sure=false). Do not invent words that are not there. Return JSON.' },
                { type: 'image', value: blob },
            ],
        }], { responseConstraint: schema }, t => { run.stream(t); s.set(`${t.length} chars`); });
        session.destroy?.();
        s.done();
        return JSON.parse(out).words ?? [];
    } catch (e) {
        s.fail(e.message);
        throw e;
    } finally {
        if (state.vision.status === 'active') mark('vision', 'available');
    }
}

/* ================================================================ Translator */

const translators = new Map();
// A translator that did not answer in time (still downloading, or a build where it hangs):
// skip it and use Nano until it is ready, instead of waiting again on every word.
const stuck = new Set();
// Translations already made in this visit: asking twice is instant.
const done = new Map();
const TRANSLATE_MS = 6000;

async function getTranslator(from, to, monitor) {
    const key = `${from}>${to}`;
    if (!translators.has(key)) {
        translators.set(key, Translator.create({ sourceLanguage: from, targetLanguage: to, monitor: monitor ?? monitorFor('translator') })
            .then(t => { stuck.delete(key); return t; })
            .catch(e => { translators.delete(key); stuck.delete(key); throw e; }));
    }
    return translators.get(key);
}

/** Get the translator ready before the first click, so the first word is fast too. Only when it is already downloaded. */
export function warmTranslator(to = store.lang) {
    if ('Translator' in globalThis && state.translator.status === 'available') getTranslator('en', to).catch(() => {});
}

/** Get the Nano session ready in the background (no download is started). */
export function warmNano() {
    if (lmReady()) getBase().catch(() => {});
}

/** Translate one English word to the chosen language. Uses Translator, then Nano. */
export async function translate(word, to = store.lang, { quiet = false } = {}) {
    const name = LANG_NAMES[to] ?? to;
    const memo = `${to}|${word}`;
    if (done.has(memo)) return done.get(memo);
    const key = `en>${to}`;
    const skip = stuck.has(key) && lmReady();
    if ('Translator' in globalThis && !['unavailable'].includes(state.translator.status) && !skip) {
        const run = quiet ? null : engine.start({ title: `Translate “${word}” → ${name}`, icon: '🌐', prompt: word, engine: 'Translator API' });
        try {
            const s = run?.step('🌐', `Getting the English → ${name} translator`);
            let timer;
            const out = await Promise.race([
                getTranslator('en', to).then(t => { s?.done(); run?.step('🔁', 'Translating'); return t.translate(word); }),
                new Promise((_, reject) => { timer = setTimeout(() => { stuck.add(key); reject(new Error('The translator is still getting ready. Try again in a minute!')); }, TRANSLATE_MS); }),
            ]).finally(() => clearTimeout(timer));
            run?.finish(true, out);
            if (state.translator.status !== 'available') checkTranslator();
            done.set(memo, out);
            return out;
        } catch (e) {
            run?.step('⚠️', 'Translator could not do it').fail(e.message);
            run?.finish(false, e.message);
            if (!lmReady()) throw e;
        }
    }
    if (lmReady()) {
        const out = (await ask({
            title: `Translate “${word}” → ${name} (Nano)`,
            icon: '🌐',
            prompt: `Translate the English word "${word}" into ${name}. Reply with only the ${name} translation, nothing else.`,
        })).trim();
        done.set(memo, out);
        return out;
    }
    throw new Error('No translator is available in this browser.');
}

/** Translate any language → English (used when a kid types a word in Hebrew, etc.). */
export async function toEnglish(text, from) {
    if ('Translator' in globalThis) {
        try { return await (await getTranslator(from, 'en')).translate(text); } catch { /* try Nano */ }
    }
    if (lmReady()) return ask({ title: `What is “${text}” in English?`, icon: '🌐', prompt: `What is "${text}" in English? Reply with only the English word or words.` });
    return null;
}

/* ================================================================ Language Detector */

let detector = null;

export async function detectLanguage(text) {
    if (!('LanguageDetector' in globalThis) || state.detector.status !== 'available') return null;
    try {
        detector ??= await LanguageDetector.create();
        const [top] = await detector.detect(text);
        return top ?? null;
    } catch { return null; }
}

/* ================================================================ Speech */

const VOICE_PREFS = {
    en: [/samantha/i, /google us english/i, /aria/i, /jenny/i, /karen/i, /daniel/i, /en-US/i],
    he: [/carmit/i, /google.*(hebrew|עברית)/i, /hila/i, /asaf/i, /he-IL/i],
};
const voices = {};

function pickVoice(lang) {
    const all = speechSynthesis.getVoices();
    // Hebrew voices may report the old "iw" code.
    const list = all.filter(v => (lang === 'he' ? /^(he|iw)[-_]?/i : new RegExp(`^${lang}[-_]?`, 'i')).test(v.lang));
    for (const p of VOICE_PREFS[lang] ?? []) {
        const v = list.find(v => p.test(v.name) || p.test(v.lang));
        if (v) return v;
    }
    return list[0] ?? null;
}

function loadVoices() {
    voices.en = pickVoice('en');
    voices.he = pickVoice('he');
    bus.dispatchEvent(new CustomEvent('voices'));
}
if ('speechSynthesis' in globalThis) {
    loadVoices();
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export const hasVoice = lang => !!voices[lang];

// Bumped whenever new speech interrupts old speech, so a running sequence knows to stop.
let speechToken = 0;

function utter(text, { lang = 'en', rate = .95, pitch = 1.05, onBoundary } = {}) {
    // Hebrew is spoken with niqqud on words a voice might misread; word highlighting still uses the plain text.
    const spoken = lang === 'he' ? withNiqqud(text) : text;
    return new Promise(resolve => {
        const u = new SpeechSynthesisUtterance(spoken);
        u.lang = lang === 'he' ? 'he-IL' : 'en-US';
        if (voices[lang]) u.voice = voices[lang];
        u.rate = rate;
        u.pitch = pitch;
        if (onBoundary) u.onboundary = spoken === text ? onBoundary : e => onBoundary({ name: e.name, charIndex: plainIndex(spoken, e.charIndex) });
        u.onend = u.onerror = () => resolve();
        speechSynthesis.speak(u);
    });
}

/** Speak English text. */
export function speak(text, { rate = .95, pitch = 1.05, onBoundary, onEnd, interrupt = true } = {}) {
    return speakParts([{ text, lang: 'en', start: 0 }], { rate, pitch, onBoundary, onEnd, interrupt });
}

/**
 * Speak a list of parts, each in its own language: [{ text, lang: 'en'|'he', start }].
 * onBoundary gets charIndex relative to the whole text (part.start + index in part).
 */
export async function speakParts(parts, { rate = .95, pitch = 1.05, onBoundary, onEnd, interrupt = true } = {}) {
    if (!('speechSynthesis' in globalThis)) { onEnd?.(); return; }
    if (interrupt) { speechSynthesis.cancel(); speechToken += 1; }
    const my = speechToken;
    setFeature('tts', { status: 'active', label: 'Speaking' });
    try {
        for (const p of parts) {
            if (my !== speechToken) break;
            if (!p.text.trim()) continue;
            await utter(p.text, {
                lang: p.lang,
                // Hebrew sentences at the normal pace; English words a touch slower so they stand out.
                rate: p.lang === 'en' && parts.length > 1 ? rate * .9 : rate,
                pitch,
                onBoundary: onBoundary && (e => onBoundary({ name: e.name, charIndex: (p.start ?? 0) + e.charIndex })),
            });
        }
    } finally {
        if (my === speechToken && state.tts.status === 'active') mark('tts', 'available');
        onEnd?.();
    }
}

/**
 * Turn "שלום [[apple]] עולם" into parts. [[...]] marks English; the rest is in `lang`.
 * Returns { text (markers removed), parts }.
 */
export function parseMixed(str, lang = 'he') {
    const parts = [];
    let text = '';
    str.split(/\[\[(.+?)\]\]/).forEach((chunk, i) => {
        if (!chunk) return;
        parts.push({ text: chunk, lang: i % 2 ? 'en' : lang, start: text.length });
        text += chunk;
    });
    return { text, parts };
}

export const stopSpeaking = () => { speechToken += 1; globalThis.speechSynthesis?.cancel(); };

/** Listen once. Resolves with { text, alternatives } or null. */
export function listen({ onInterim } = {}) {
    if (!SR) return { promise: Promise.resolve(null), stop() {} };
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 4;
    let final = null;
    setFeature('stt', { status: 'active', label: 'Listening' });
    const promise = new Promise(resolve => {
        rec.onresult = e => {
            const r = e.results[e.results.length - 1];
            if (r.isFinal) final = { text: r[0].transcript.trim(), alternatives: [...r].map(a => a.transcript.trim().toLowerCase()) };
            else onInterim?.(r[0].transcript);
        };
        rec.onerror = () => {};
        rec.onend = () => { mark('stt', 'available'); resolve(final); };
    });
    rec.start();
    return { promise, stop: () => rec.stop() };
}
