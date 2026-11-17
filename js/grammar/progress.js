// Present Simple progress, saved in this browser: quiz best, rules tried, practice counts.

const KEY = 'wordwizard.grammar.v1';

function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

let data = load();

function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode: keep in memory */ }
    document.dispatchEvent(new CustomEvent('grammar:progress'));
}

export const progress = {
    get: () => data,
    markRule(id) { data.rules = { ...data.rules, [id]: true }; save(); },
    quizDone(score) { if (data.quizBest == null || score > data.quizBest) data.quizBest = score; data.quizRuns = (data.quizRuns ?? 0) + 1; save(); },
    practiced(rule, ok) {
        const r = data.practice?.[rule] ?? { ok: 0, all: 0 };
        data.practice = { ...data.practice, [rule]: { ok: r.ok + (ok ? 1 : 0), all: r.all + 1 } };
        save();
    },
    set(key, value) { data[key] = value; save(); },
};
