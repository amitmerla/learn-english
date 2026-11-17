// The app's tools. One definition is shared by three callers:
//   1. Buddy's agent loop (Prompt API, structured JSON plan),
//   2. Prompt API native tool calling (LanguageModel.create({ tools })),
//   3. WebMCP (navigator.modelContext), so other AI agents in the browser can use the page.

import { store } from './store.js';
import { engine } from './engine.js';
import { setFeature, translate, speak, confirmNativeTools } from './ai.js';

// UI actions the tools need; app.js fills these in.
export const hooks = {
    showWord: () => {},
    startTour: () => {},
    startQuiz: () => {},
    celebrate: () => {},
};

const str = { type: 'string' };

export const TOOLS = [
    {
        name: 'add_words',
        description: 'Add one or more English words to the child’s word list.',
        inputSchema: { type: 'object', properties: { words: { type: 'array', items: str, description: 'English words to add' } }, required: ['words'] },
        async run({ words = [] }) {
            const r = store.add(words, 'buddy');
            if (r.added.length) hooks.showWord(r.added[0]);
            return { added: r.added, already_on_list: r.dupes, not_valid: r.bad };
        },
    },
    {
        name: 'remove_word',
        description: 'Remove a word from the child’s word list.',
        inputSchema: { type: 'object', properties: { word: str }, required: ['word'] },
        async run({ word }) {
            return { removed: store.remove(word), word };
        },
    },
    {
        name: 'list_words',
        description: 'Get all words on the list, with which ones are already learned.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
            return { words: store.words.map(w => ({ word: w.text, learned: w.learned })) };
        },
    },
    {
        name: 'translate_word',
        description: 'Translate an English word into the child’s home language and show it on the word card.',
        inputSchema: { type: 'object', properties: { word: str }, required: ['word'] },
        async run({ word }) {
            const t = await translate(word, store.lang, { quiet: true });
            if (store.has(word)) store.update(word, { tr: { ...store.find(word).tr, [store.lang]: t } });
            return { word, translation: t, language: store.lang };
        },
    },
    {
        name: 'speak',
        description: 'Say a word or short sentence out loud so the child can hear how to say it.',
        inputSchema: { type: 'object', properties: { text: str }, required: ['text'] },
        async run({ text }) {
            speak(text, { rate: .85 });
            return { spoken: text };
        },
    },
    {
        name: 'mark_learned',
        description: 'Mark a word as learned (gives it a gold star).',
        inputSchema: { type: 'object', properties: { word: str }, required: ['word'] },
        async run({ word }) {
            const w = store.update(word, { learned: true });
            if (w) hooks.celebrate(word);
            return { ok: !!w, word };
        },
    },
    {
        name: 'show_word',
        description: 'Scroll to a word card and make it flash so the child can find it.',
        inputSchema: { type: 'object', properties: { word: str }, required: ['word'] },
        async run({ word }) {
            hooks.showWord(word);
            return { shown: store.has(word), word };
        },
    },
    {
        name: 'start_quiz',
        description: 'Start the Word Challenge quiz (meaning + spelling + sentences) on the starred words.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
            setTimeout(() => hooks.startQuiz(), 600);
            return { started: true };
        },
    },
    {
        name: 'start_tour',
        description: 'Start the guided tour of the page.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
            setTimeout(() => hooks.startTour(), 600);
            return { started: true };
        },
    },
];

export const TOOL_NAMES = TOOLS.map(t => t.name);
const byName = Object.fromEntries(TOOLS.map(t => [t.name, t]));

/** Run a tool by name, logging it on the given engine run (or a new one). */
export async function callTool(name, args = {}, run, via = 'Buddy') {
    const tool = byName[name];
    const own = !run;
    run ??= engine.start({ title: `${via} called ${name}`, icon: '🔌', prompt: JSON.stringify(args), engine: via });
    const s = run.tool(name, args);
    try {
        if (!tool) throw new Error(`Unknown tool ${name}`);
        const result = await tool.run(args ?? {});
        s.done(JSON.stringify(result).slice(0, 60), '✅');
        if (own) run.finish(true, JSON.stringify(result, null, 1));
        return result;
    } catch (e) {
        s.fail(e.message);
        if (own) run.finish(false, e.message);
        return { error: e.message };
    }
}

/* ------------------------------------------------------- Prompt API native tools */

let nativeRun = null;
export const setNativeRun = run => { nativeRun = run; };

export const NATIVE_TOOLS = TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    async execute(args) {
        confirmNativeTools();
        const result = await callTool(t.name, args, nativeRun, 'Gemini Nano');
        return JSON.stringify(result);
    },
}));

/* ------------------------------------------------------- JSON-plan agent schema */

export const PLAN_SCHEMA = {
    type: 'object',
    properties: {
        tool: { type: 'string', enum: [...TOOL_NAMES, 'none'] },
        args: {
            type: 'object',
            properties: { word: str, words: { type: 'array', items: str }, text: str },
        },
        reply: { type: 'string' },
    },
    required: ['tool', 'args', 'reply'],
};

export function toolCatalog() {
    return TOOLS.map(t => {
        const props = Object.keys(t.inputSchema.properties);
        return `- ${t.name}(${props.join(', ')}): ${t.description}`;
    }).join('\n');
}

/* ------------------------------------------------------- WebMCP */

export function registerWebMCP() {
    const mc = navigator.modelContext;
    if (!mc) return false;

    const defs = TOOLS.map(t => ({
        name: `wordwizard_${t.name}`,
        description: `[Word Wizard] ${t.description}`,
        inputSchema: t.inputSchema,
        annotations: { readOnlyHint: ['list_words', 'show_word'].includes(t.name) },
        async execute(args) {
            setFeature('webmcp', { status: 'active', label: 'Called!' });
            const result = await callTool(t.name, args, null, 'WebMCP agent');
            setTimeout(() => setFeature('webmcp', { status: 'available', label: 'Shared' }), 1500);
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
    }));

    try {
        if (typeof mc.provideContext === 'function') mc.provideContext({ tools: defs });
        else if (typeof mc.registerTool === 'function') defs.forEach(d => mc.registerTool(d));
        else throw new Error('navigator.modelContext has no provideContext or registerTool');
        setFeature('webmcp', { status: 'available', label: 'Shared', note: `${defs.length} tools shared with browser AI agents.` });
        return true;
    } catch (e) {
        setFeature('webmcp', { status: 'unavailable', label: 'Error', note: e.message });
        return false;
    }
}
