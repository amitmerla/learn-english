// The ניקוד switch: pages whose Hebrew is written with full niqqud (on top of the full
// spelling) can show it with or without the marks. Speech always gets the pointed text.
// With the switch off, every text node is shown without the marks; the pointed text is kept to switch back.

import { store } from './store.js';

const MARKS = /[֑-ׇֽֿׁׂׅׄ]/g;
const HAS_MARKS = /[֑-ׇֽֿׁׂׅׄ]/;
const pointed = new WeakMap();
export const niqqudOn = () => store.prefs.niqqud !== false;

function paintText(node) {
    if (!pointed.has(node)) {
        if (!HAS_MARKS.test(node.data)) return;
        pointed.set(node, node.data);
    }
    const text = niqqudOn() ? pointed.get(node) : pointed.get(node).replace(MARKS, '');
    if (node.data !== text) node.data = text;
}

function paintTree(root) {
    if (root.nodeType === Node.TEXT_NODE) return paintText(root);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) paintText(walk.currentNode);
}

/** Wire the switch button; onChange runs after every switch (e.g. to re-measure tabs). */
export function initNiqqudView(button, onChange) {
    const paint = () => {
        const on = niqqudOn();
        document.body.classList.toggle('niqqud', on);
        button.setAttribute('aria-pressed', String(on));
        paintTree(document.body);
    };
    // New cards, feedback and Buddy's lines are painted as they appear.
    new MutationObserver(list => {
        for (const m of list) m.addedNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE || n.nodeType === Node.ELEMENT_NODE) paintTree(n); });
    }).observe(document.body, { childList: true, subtree: true });
    button.addEventListener('click', () => {
        store.setPref('niqqud', !niqqudOn());
        paint();
        onChange?.();
    });
    paint();
}
