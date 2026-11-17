// Home-language voice: when the pupil picks Hebrew and turns the Hebrew voice on,
// Buddy talks in Hebrew, and only the English words are said in English.

import { store } from './store.js';
import { speak, speakParts, parseMixed, hasVoice, translate } from './ai.js';
import { sleep } from './util.js';

export const homeVoiceOn = () => !!store.prefs.homeVoice && store.lang === 'he' && hasVoice('he');

/**
 * Say a fixed phrase. `he` may mark English words with [[...]], e.g. "[[apple]]. יופי!".
 */
export function talk(en, he, opts) {
    if (homeVoiceOn() && he) return speakParts(parseMixed(he).parts, opts);
    return speak(en.replace(/\*\*/g, ''), opts);
}

const reEscape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const timeout = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]);

/**
 * Say dynamic English text (Buddy's answers, AI feedback). With the Hebrew voice on,
 * the sentence is translated piece by piece, while **bold** words and `keep` words stay English.
 */
export async function talkDynamic(text, { keep = [], ...opts } = {}) {
    if (!homeVoiceOn()) return speak(text.replace(/\*\*/g, ''), opts);

    const words = [...new Set(keep.filter(Boolean))].map(reEscape);
    const re = new RegExp(`\\*\\*(.+?)\\*\\*${words.length ? `|\\b(${words.join('|')})\\b` : ''}`, 'gi');
    const chunks = [];
    let last = 0;
    for (const m of text.matchAll(re)) {
        if (m.index > last) chunks.push({ text: text.slice(last, m.index), lang: 'he' });
        chunks.push({ text: m[1] ?? m[2], lang: 'en' });
        last = m.index + m[0].length;
    }
    if (last < text.length) chunks.push({ text: text.slice(last), lang: 'he' });

    try {
        const parts = [];
        for (const c of chunks) {
            if (c.lang === 'en') { parts.push(c); continue; }
            // Only translate pieces that contain letters (skip emoji and punctuation).
            if (!/\p{L}/u.test(c.text)) continue;
            parts.push({ text: await timeout(translate(c.text.trim(), 'he', { quiet: true }), 7000), lang: 'he' });
        }
        return speakParts(parts, opts);
    } catch {
        // No translator here: say it in English rather than say nothing.
        return speak(text.replace(/\*\*/g, ''), opts);
    }
}
