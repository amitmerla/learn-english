// Small shared helpers: DOM, toasts, confetti, confirm dialog.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') {
            // CSS variables (--x) need setProperty; Object.assign silently ignores them.
            for (const [prop, val] of Object.entries(v)) {
                if (prop.startsWith('--')) node.style.setProperty(prop, val);
                else node.style[prop] = val;
            }
        }
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : String(c));
    return node;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Right-to-left languages, so translations render the right way round.
export const RTL = new Set(['he', 'ar', 'fa', 'ur']);

export const LANG_NAMES = {
    he: 'Hebrew', ar: 'Arabic', ru: 'Russian', es: 'Spanish', fr: 'French', de: 'German',
    pt: 'Portuguese', it: 'Italian', zh: 'Chinese', ja: 'Japanese', hi: 'Hindi', en: 'English',
};

/* ---------------------------------------------------------------- toasts */

export function toast(text, { icon = '✨', ms = 3200, action } = {}) {
    const box = $('#toasts');
    const t = el('div', { class: 'toast' }, el('span', { text: icon }), el('span', { text }));
    if (action) t.append(el('button', { class: 'btn btn-sm btn-primary', text: action.label, onclick: () => { action.run(); close(); } }));
    box.append(t);
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    setTimeout(close, ms);
    return close;
}

/* ---------------------------------------------------------------- confirm */

export function confirmBox(title, text) {
    const dlg = $('#confirm-modal');
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    return new Promise(resolve => {
        dlg.addEventListener('close', () => resolve(dlg.returnValue === 'yes'), { once: true });
        dlg.showModal();
    });
}

/* ---------------------------------------------------------------- confetti */

const canvas = $('#fx-canvas');
const ctx = canvas.getContext('2d');
let parts = [];
let raf = 0;

function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
}
addEventListener('resize', resize);
resize();

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#34d399'];

export function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 90) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const d = devicePixelRatio;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 9;
        parts.push({
            x: x * d, y: y * d,
            vx: Math.cos(a) * s * d, vy: (Math.sin(a) * s - 6) * d,
            w: (5 + Math.random() * 6) * d, h: (8 + Math.random() * 8) * d,
            r: Math.random() * 6, vr: (Math.random() - .5) * .4,
            c: COLORS[i % COLORS.length], life: 1,
            star: Math.random() < .25,
        });
    }
    if (!raf) raf = requestAnimationFrame(tick);
}

export function confettiAt(node, n) {
    const r = node.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, n);
}

function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const d = devicePixelRatio;
    parts = parts.filter(p => p.life > 0 && p.y < canvas.height + 40);
    for (const p of parts) {
        p.vy += .32 * d;
        p.vx *= .985;
        p.x += p.vx; p.y += p.vy;
        p.r += p.vr;
        p.life -= .006;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.star) {
            ctx.font = `${p.h * 1.6}px serif`;
            ctx.fillText('⭐', -p.h / 2, p.h / 2);
        } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ---------------------------------------------------------------- inline edit */

// Swap a text element for an input. Enter or blur saves, Escape cancels.
export function inlineEdit(target, value, save, onClose) {
    const input = el('input', { class: 'inline-edit', value, 'aria-label': 'Fix the word', spellcheck: 'false', autocomplete: 'off' });
    input.style.width = `${Math.max(6, value.length + 2)}ch`;
    target.hidden = true;
    target.after(input);
    input.focus();
    input.select();
    let done = false;
    const finish = ok => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        input.remove();
        target.hidden = false;
        if (ok && v && v !== value) save(v);
        onClose?.();
    };
    input.addEventListener('input', () => { input.style.width = `${Math.max(6, input.value.length + 2)}ch`; });
    input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('click', e => e.stopPropagation());
    return input;
}
