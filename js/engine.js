// AI Engine Room: every AI request shows up here with its prompt, live steps and answer.

import { $, el, esc } from './util.js';

const log = $('#engine-log');
const now = $('#engine-now');
const active = new Set();
let count = 0;

function renderEmpty() {
    if (log.children.length) return;
    log.append(el('div', { class: 'engine-empty' },
        el('div', { text: '🛰️' }),
        el('p', { text: 'Nothing is running yet. Ask Buddy something, or tap a button on a word card, and watch the AI work here!' })));
}

function updateNow() {
    const last = [...active].at(-1);
    now.classList.toggle('busy', !!last);
    now.querySelector('span').textContent = last ? last.current || last.title : 'Idle';
}

class Run {
    constructor({ title, icon = '🧠', prompt = '', engine = '' }) {
        count += 1;
        this.title = title;
        this.t0 = performance.now();
        this.current = '';
        log.querySelector('.engine-empty')?.remove();

        this.meta = el('span', { class: 'run-meta', text: engine });
        this.steps = el('ol', { class: 'steps' });
        this.resp = el('div', { class: 'run-resp' });
        this.usage = el('div', { class: 'usage', hidden: true }, el('div'));
        const body = el('div', { class: 'run-body' });
        if (prompt) body.append(el('div', { class: 'run-label', text: 'Prompt' }), el('div', { class: 'run-prompt', text: prompt }));
        this.respLabel = el('div', { class: 'run-label', text: 'Answer', hidden: true });
        body.append(this.steps, this.respLabel, this.resp, this.usage);

        this.node = el('article', { class: 'run' },
            el('header', { class: 'run-head', onclick: () => this.node.classList.toggle('collapsed') },
                el('span', { class: 'run-state' }),
                el('span', { class: 'run-icon', text: icon }),
                el('b', { text: `#${count} · ${title}` }),
                this.meta),
            body);
        log.prepend(this.node);
        // Older finished runs fold up so the newest stays readable.
        [...log.querySelectorAll('.run.ok, .run.err')].slice(3).forEach(n => n.classList.add('collapsed'));
        while (log.children.length > 40) log.lastElementChild.remove();
        active.add(this);
        updateNow();
    }

    step(icon, html, detail = '') {
        const li = el('li', { class: 'step running' },
            el('span', { class: 'si', text: icon }),
            el('span', { class: 'st', html }),
            el('span', { class: 'sd', text: detail }));
        this.steps.append(li);
        this.current = li.querySelector('.st').textContent;
        updateNow();
        const t = performance.now();
        return {
            done: (more, doneIcon) => {
                li.classList.replace('running', 'done');
                if (doneIcon) li.querySelector('.si').textContent = doneIcon;
                li.querySelector('.sd').textContent = more ?? `${Math.round(performance.now() - t)}ms`;
            },
            fail: msg => {
                li.classList.replace('running', 'fail');
                li.querySelector('.si').textContent = '⚠️';
                li.querySelector('.sd').textContent = msg || 'failed';
            },
            set: text => { li.querySelector('.sd').textContent = text; },
        };
    }

    tool(name, args) {
        const s = this.step('🛠️', `Tool <code>${esc(name)}</code>(${esc(JSON.stringify(args ?? {}))})`);
        this.steps.lastElementChild.classList.add('tool');
        return s;
    }

    stream(text) {
        this.respLabel.hidden = false;
        this.resp.classList.add('streaming');
        this.resp.textContent = text;
        this.resp.scrollTop = this.resp.scrollHeight;
    }

    setUsage(session) {
        const used = session?.inputUsage ?? session?.tokensSoFar;
        const quota = session?.inputQuota ?? session?.maxTokens;
        if (!used || !quota) return;
        this.usage.hidden = false;
        const pct = Math.min(100, used / quota * 100);
        this.usage.firstChild.style.width = `${pct}%`;
        this.usage.title = `Memory used: ${used} of ${quota} tokens`;
        this.usage.dataset.tip = `AI memory used: ${used} of ${quota} tokens. When it is full, Buddy starts a fresh memory.`;
    }

    finish(ok = true, text) {
        if (text != null) this.stream(text);
        this.resp.classList.remove('streaming');
        this.node.classList.add(ok ? 'ok' : 'err');
        this.meta.textContent = `${this.meta.textContent ? this.meta.textContent + ' · ' : ''}${((performance.now() - this.t0) / 1000).toFixed(1)}s`;
        active.delete(this);
        updateNow();
    }
}

export const engine = {
    start: opts => new Run(opts),
    get busy() { return active.size > 0; },
};

export function initEngine() {
    renderEmpty();
    $('#engine-clear').addEventListener('click', () => {
        [...log.querySelectorAll('.run.ok, .run.err')].forEach(n => n.remove());
        renderEmpty();
    });
}
