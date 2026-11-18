// Word Wizard bootstrap: wires the panels together.

import { $, toast } from './util.js';
import { store } from './store.js';
import { initTooltips } from './tooltip.js';
import { initEngine } from './engine.js';
import { initFeatures } from './features.js';
import { checkTranslator, bus, hasVoice } from './ai.js';
import { talk } from './voice.js';
import { hooks, registerWebMCP } from './tools.js';
import { initWords, showWord, celebrate } from './words.js';
import { initChat } from './chat.js';
import { initOcr } from './ocr.js';
import { initTour, startTour, tourSeen } from './tour.js';
import { initQuiz, startQuiz } from './quiz.js';
import { initTransfer } from './transfer.js';
import { initDocFile } from './docfile.js';
import { initProfile, openProfile, hasProfile } from './profile.js';

hooks.showWord = showWord;
hooks.celebrate = celebrate;
hooks.startTour = () => startTour(0);
hooks.startQuiz = () => startQuiz();

initTooltips();
initEngine();
initWords();
initOcr();
initTour();
initQuiz();
initTransfer();
initDocFile();

const lang = $('#target-lang');
lang.value = store.lang;
lang.addEventListener('change', () => {
    store.lang = lang.value;
    checkTranslator();
    toast(`Translations will now be in ${lang.selectedOptions[0].textContent.split('·')[1].trim()}`, { icon: '🌍' });
});

// Hebrew voice switch: only for Hebrew, and only when this computer has a Hebrew voice.
const voiceToggle = $('#voice-toggle');
const homeVoice = $('#home-voice');
function paintVoiceToggle() {
    voiceToggle.hidden = store.lang !== 'he';
    const ok = hasVoice('he');
    homeVoice.disabled = !ok;
    homeVoice.checked = ok && !!store.prefs.homeVoice;
    voiceToggle.classList.toggle('on', homeVoice.checked);
    voiceToggle.classList.toggle('disabled', !ok);
    voiceToggle.dataset.tip = ok
        ? 'Turn on to hear Buddy speak Hebrew. English words are still said in English, so you learn how to say them.'
        : 'This computer has no Hebrew voice. Add one in your system settings (for example “Carmit” on Mac), then reload the page.';
}
homeVoice.addEventListener('change', () => {
    store.setPref('homeVoice', homeVoice.checked);
    paintVoiceToggle();
    if (homeVoice.checked) talk('', 'מעכשיו אני מדבר איתכם בעברית. מילים באנגלית, כמו [[rainbow]], אני אגיד באנגלית.');
    else talk("OK! I'll speak English now.");
});
store.addEventListener('lang', paintVoiceToggle);
bus.addEventListener('voices', paintVoiceToggle);
paintVoiceToggle();

function offerTour() {
    if (!tourSeen()) {
        setTimeout(() => toast('New here? Let me show you around!', { icon: '🦊', ms: 9000, action: { label: 'Start tour', run: () => startTour(0) } }), 1200);
    }
}

// First visit: meet the pupil and make their badge, then offer the tour.
// Opens before the AI checks finish, so the pupil doesn't wait for them.
initProfile({ onFirstWelcome: offerTour });
if (!hasProfile()) setTimeout(openProfile, 600);

await initFeatures();
registerWebMCP();
$('#features-refresh').addEventListener('click', () => setTimeout(registerWebMCP, 300));
initChat();
if (hasProfile()) offerTour();
