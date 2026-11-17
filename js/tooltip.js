// One floating tooltip for every element with a data-tip attribute.

import { $ } from './util.js';

const tip = $('#tooltip');
let timer = 0;
let current = null;

function show(target) {
    const text = target.dataset.tip;
    if (!text) return;
    current = target;
    tip.textContent = text;
    tip.classList.remove('show');

    const r = target.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const pref = target.dataset.tipPos;
    const above = pref === 'top' || (pref !== 'bottom' && r.top > t.height + 20);
    const top = above ? r.top - t.height - 12 : r.bottom + 12;
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(10, Math.min(left, innerWidth - t.width - 10));

    tip.style.top = `${Math.max(8, top)}px`;
    tip.style.left = `${left}px`;
    tip.style.setProperty('--ax', `${r.left + r.width / 2 - left}px`);
    tip.dataset.pos = above ? 'top' : 'bottom';
    requestAnimationFrame(() => tip.classList.add('show'));
}

function hide() {
    clearTimeout(timer);
    current = null;
    tip.classList.remove('show');
}

function enter(e) {
    const target = e.target.closest?.('[data-tip]');
    if (!target || target === current) return;
    // Nested tips: the innermost element wins, so the outer panel tip doesn't fight a button tip.
    clearTimeout(timer);
    timer = setTimeout(() => show(target), e.type === 'focusin' ? 0 : 280);
}

function leave(e) {
    const target = e.target.closest?.('[data-tip]');
    if (!target) return;
    if (e.relatedTarget && target.contains(e.relatedTarget)) return;
    hide();
}

export function initTooltips() {
    document.addEventListener('mouseover', enter);
    document.addEventListener('mouseout', leave);
    document.addEventListener('focusin', enter);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    addEventListener('scroll', hide, true);
}
