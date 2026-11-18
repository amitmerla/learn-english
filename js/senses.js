// Words with more than one meaning ("light" = אור or קל).
// A word keeps all its meanings in `senses`; the pupil taps the one from the lesson (`sense` = its index).
// Until then the card shows every meaning. Each meaning brings its own memory pair and example,
// so choosing one also changes those to fit.
//
// Sources: this built-in list (instant, no AI). Other words show the Translator's one meaning at once,
// and Gemini Nano then looks for more meanings in the background.

import { ask, lmReady } from './ai.js';
import { wordIn } from './pairs.js';

// [Hebrew, emoji + simple English hint, memory pair, Hebrew of the pair, example sentence]
const S = (he, hint, pair, pairHe, example) => ({ tr: { he }, hint, pair, pairTr: { he: pairHe }, example });

export const SENSES = {
    light: [S('אור', '💡 what a lamp or the sun gives', 'turn on the light', 'להדליק את האור', 'Please turn on the light.'),
        S('קל', '🪶 not heavy', 'a light bag', 'תיק קל', 'My school bag is very light.')],
    kind: [S('נחמד, טוב לב', '😊 nice to other people', 'a kind friend', 'חבר נחמד', 'My teacher is very kind.'),
        S('סוג', '🗂️ a type of something', 'what kind of', 'איזה סוג של', 'What kind of music do you like?')],
    play: [S('לשחק', '⚽ have fun with a game', 'play football', 'לשחק כדורגל', 'We play football after school.'),
        S('לנגן', '🎸 make music', 'play the guitar', 'לנגן בגיטרה', 'I play the piano.'),
        S('הצגה', '🎭 a show on a stage', 'a school play', 'הצגה של בית הספר', 'Our class has a play today.')],
    watch: [S('לצפות', '📺 look at something for a time', 'watch TV', 'לצפות בטלוויזיה', 'I watch TV in the evening.'),
        S('שעון יד', '⌚ a small clock on your hand', 'a new watch', 'שעון חדש', 'Dad has a new watch.')],
    right: [S('ימין', '👉 the side opposite left', 'turn right', 'לפנות ימינה', 'Turn right at the park.'),
        S('נכון', '✅ correct', 'the right answer', 'התשובה הנכונה', 'That is the right answer!')],
    left: [S('שמאל', '👈 the side opposite right', 'turn left', 'לפנות שמאלה', 'Turn left at the shop.'),
        S('עזב, יצא', '🚪 went away (from "leave")', 'left home', 'יצא מהבית', 'She left the room.')],
    fall: [S('ליפול', '🤕 go down to the ground', 'fall down', 'ליפול', 'Be careful, don’t fall!'),
        S('סתיו', '🍂 the season before winter', 'in the fall', 'בסתיו', 'Leaves are orange in the fall.')],
    park: [S('פארק, גן ציבורי', '🌳 a green place to play', 'play in the park', 'לשחק בפארק', 'We play in the park.'),
        S('להחנות', '🚗 stop a car and leave it', 'park the car', 'להחנות את המכונית', 'Dad parks the car near the school.')],
    ring: [S('טבעת', '💍 jewelry on your finger', 'a gold ring', 'טבעת זהב', 'Mom has a gold ring.'),
        S('לצלצל', '🔔 make a bell sound', 'the bell rings', 'הפעמון מצלצל', 'The bell rings at eight.')],
    can: [S('יכול', '💪 able to do something', 'I can swim', 'אני יכול לשחות', 'I can swim very fast.'),
        S('פחית', '🥫 a metal box for food or drinks', 'a can of soda', 'פחית שתייה', 'He drinks a can of juice.')],
    match: [S('משחק, תחרות', '🏆 a game between two teams', 'a football match', 'משחק כדורגל', 'We won the match!'),
        S('גפרור', '🔥 a small stick that makes fire', 'light a match', 'להדליק גפרור', 'Don’t play with matches.'),
        S('להתאים', '🧩 be the same or go together', 'match the pairs', 'להתאים את הזוגות', 'Match the words to the pictures.')],
    close: [S('לסגור', '🚪 shut it', 'close the door', 'לסגור את הדלת', 'Please close the window.'),
        S('קרוב', '📍 near', 'close to home', 'קרוב לבית', 'My school is close to my house.')],
    change: [S('לשנות, להחליף', '🔄 make it different', 'change clothes', 'להחליף בגדים', 'I change my clothes after school.'),
        S('עודף', '🪙 money you get back', 'keep the change', 'תשמור את העודף', 'Here is your change.')],
    miss: [S('לפספס', '🚌 not catch it in time', 'miss the bus', 'לפספס את האוטובוס', 'Hurry, or we will miss the bus!'),
        S('להתגעגע', '🥺 feel sad someone is away', 'miss you', 'מתגעגע אליך', 'I miss my grandma.')],
    fly: [S('לעוף, לטוס', '✈️ move in the air', 'fly high', 'לעוף גבוה', 'Birds fly in the sky.'),
        S('זבוב', '🪰 a small insect', 'a big fly', 'זבוב גדול', 'There is a fly on my sandwich!')],
    rest: [S('לנוח', '😴 relax and stop working', 'take a rest', 'לנוח', 'I rest after school.'),
        S('השאר', '🍰 the other part', 'the rest of the cake', 'שאר העוגה', 'Can I eat the rest of the cake?')],
    save: [S('להציל', '🦸 keep someone safe', 'save the cat', 'להציל את החתול', 'The firefighter saves the cat.'),
        S('לחסוך', '🐷 keep money for later', 'save money', 'לחסוך כסף', 'I save money for a new bike.'),
        S('לשמור (במחשב)', '💾 keep a file on the computer', 'save the file', 'לשמור את הקובץ', 'Don’t forget to save your work.')],
    spend: [S('להוציא (כסף)', '💸 use money to buy things', 'spend money', 'להוציא כסף', 'I spend my money on books.'),
        S('לבלות (זמן)', '⏰ use time doing something', 'spend time', 'לבלות זמן', 'I spend time with my family.')],
    break: [S('לשבור', '💥 make it go into pieces', 'break a glass', 'לשבור כוס', 'Don’t break the glass!'),
        S('הפסקה', '🍎 a short rest at school', 'break time', 'זמן הפסקה', 'We eat a snack at break.')],
    turn: [S('לפנות, להסתובב', '↩️ go a different way', 'turn left', 'לפנות שמאלה', 'Turn left at the corner.'),
        S('תור', '🎲 time for you to play', 'my turn', 'התור שלי', 'It’s my turn now!')],
    present: [S('מתנה', '🎁 something you give', 'a birthday present', 'מתנת יום הולדת', 'I got a present for my birthday.'),
        S('הווה, עכשיו', '🕒 now, not past or future', 'present simple', 'הווה פשוט', 'We learn the present simple.'),
        S('נוכח', '🙋 here in class', 'I am present', 'אני נוכח', 'Everyone is present today.')],
    letter: [S('מכתב', '✉️ a message on paper', 'write a letter', 'לכתוב מכתב', 'I write a letter to my friend.'),
        S('אות', '🔤 A, B, C…', 'a capital letter', 'אות גדולה', 'Names start with a capital letter.')],
    bat: [S('עטלף', '🦇 an animal that flies at night', 'a black bat', 'עטלף שחור', 'A bat sleeps in the day.'),
        S('מחבט', '🏏 you hit a ball with it', 'a baseball bat', 'מחבט בייסבול', 'He hits the ball with a bat.')],
    fair: [S('הוגן', '⚖️ the same rules for all', 'that’s not fair', 'זה לא הוגן', 'That’s not fair!'),
        S('יריד', '🎡 a fun event with games', 'a book fair', 'יריד ספרים', 'We go to the book fair.'),
        S('בהיר (שיער)', '👱 light in color', 'fair hair', 'שיער בהיר', 'She has fair hair.')],
    fine: [S('בסדר, טוב', '👍 OK, well', 'I’m fine', 'אני בסדר', 'I’m fine, thank you.'),
        S('קנס', '🧾 money you pay for breaking a rule', 'pay a fine', 'לשלם קנס', 'He has to pay a fine.')],
    glass: [S('כוס', '🥛 you drink from it', 'a glass of water', 'כוס מים', 'Can I have a glass of water?'),
        S('זכוכית', '🪟 windows are made of it', 'broken glass', 'זכוכית שבורה', 'The window is made of glass.')],
    glasses: [S('משקפיים', '👓 you wear them to see better', 'my glasses', 'המשקפיים שלי', 'I wear glasses to read.'),
        S('כוסות', '🥛 more than one cup', 'two glasses', 'שתי כוסות', 'Put the glasses on the table.')],
    mean: [S('להתכוון, פירושו', '💭 what a word or person wants to say', 'what does it mean', 'מה זה אומר', 'What does this word mean?'),
        S('מרושע, לא נחמד', '😠 not kind', 'a mean dog', 'כלב מרושע', 'Don’t be mean to your sister.')],
    cold: [S('קר', '🥶 not warm', 'cold water', 'מים קרים', 'The water is cold.'),
        S('הצטננות', '🤧 you have a runny nose', 'catch a cold', 'להצטנן', 'I have a cold today.')],
    rock: [S('סלע, אבן', '🪨 a big stone', 'a big rock', 'סלע גדול', 'We sit on a big rock.'),
        S('רוק (מוזיקה)', '🎸 loud music with guitars', 'rock music', 'מוזיקת רוק', 'My brother loves rock music.')],
    bank: [S('בנק', '🏦 a place for money', 'go to the bank', 'ללכת לבנק', 'Mom goes to the bank.'),
        S('גדה, חוף של נהר', '🏞️ the side of a river', 'the river bank', 'גדת הנהר', 'We sit on the river bank.')],
    train: [S('רכבת', '🚆 it goes on tracks', 'take the train', 'לנסוע ברכבת', 'We take the train to Haifa.'),
        S('להתאמן', '🏋️ practice a sport', 'train hard', 'להתאמן קשה', 'I train every Monday.')],
    wave: [S('גל', '🌊 water moving in the sea', 'a big wave', 'גל גדול', 'A big wave hits the beach.'),
        S('לנופף', '👋 move your hand to say hi', 'wave goodbye', 'לנופף לשלום', 'I wave to my friend.')],
    point: [S('נקודה', '🎯 a score in a game', 'win a point', 'לזכות בנקודה', 'Our team gets a point!'),
        S('להצביע', '👉 show with your finger', 'point at the map', 'להצביע על המפה', 'Point at the right picture.')],
    still: [S('עדיין', '⏳ until now', 'still here', 'עדיין כאן', 'I am still hungry.'),
        S('בשקט, בלי לזוז', '🧍 not moving', 'stand still', 'לעמוד בלי לזוז', 'Please stand still for the photo.')],
    last: [S('אחרון', '🔚 at the end', 'the last day', 'היום האחרון', 'Today is the last day of school.'),
        S('הקודם, שעבר', '📅 the one before now', 'last week', 'בשבוע שעבר', 'I saw a movie last week.')],
    cool: [S('קריר', '🌬️ a little cold', 'cool water', 'מים קרירים', 'The water is cool and nice.'),
        S('מגניב', '😎 great', 'so cool', 'ממש מגניב', 'Your new bike is so cool!')],
    pick: [S('לבחור', '👆 choose one', 'pick a card', 'לבחור קלף', 'Pick a color you like.'),
        S('לקטוף, להרים', '🌼 take it with your hand', 'pick a flower', 'לקטוף פרח', 'We pick apples from the tree.')],
    call: [S('להתקשר', '📞 talk on the phone', 'call mom', 'להתקשר לאמא', 'I call my grandma every day.'),
        S('לקרוא (בשם)', '🗣️ say a name to someone', 'call my name', 'לקרוא בשמי', 'My friends call me Dani.')],
    trip: [S('טיול', '🎒 a short journey', 'a school trip', 'טיול שנתי', 'We go on a school trip.'),
        S('למעוד', '🤸 almost fall', 'trip over', 'למעוד', 'Don’t trip over the bag!')],
    date: [S('תאריך', '📅 day, month and year', 'today’s date', 'התאריך של היום', 'Write the date at the top.'),
        S('תמר', '🌴 a sweet brown fruit', 'a sweet date', 'תמר מתוק', 'I eat a date for a snack.')],
    second: [S('שני', '2️⃣ number two in a line', 'the second day', 'היום השני', 'He is second in the race.'),
        S('שנייה', '⏱️ a very short time', 'wait a second', 'חכה שנייה', 'Wait a second, please!')],
    back: [S('גב', '🧍 the back part of your body', 'my back hurts', 'כואב לי הגב', 'My back hurts.'),
        S('בחזרה', '🔙 to where you were', 'come back', 'לחזור', 'Come back soon!')],
    fan: [S('מאוורר', '🌀 it makes wind', 'turn on the fan', 'להדליק את המאוורר', 'It’s hot. Turn on the fan!'),
        S('אוהד, מעריץ', '📣 someone who loves a team or star', 'a big fan', 'אוהד גדול', 'I am a big fan of Maccabi.')],
    tie: [S('עניבה', '👔 men wear it with a shirt', 'a red tie', 'עניבה אדומה', 'Dad wears a tie to work.'),
        S('לקשור', '🎀 make a knot', 'tie your shoes', 'לקשור את השרוכים', 'Tie your shoes!'),
        S('תיקו', '🤝 same score for both teams', 'a tie game', 'משחק תיקו', 'The game ends in a tie.')],
    spring: [S('אביב', '🌸 the season after winter', 'in spring', 'באביב', 'Flowers grow in spring.'),
        S('קפיץ', '➰ a metal spiral that jumps back', 'a metal spring', 'קפיץ מתכת', 'The toy has a spring inside.')],
    pupil: [S('תלמיד', '🧒 a child at school', 'a new pupil', 'תלמיד חדש', 'There is a new pupil in our class.'),
        S('אישון', '👁️ the black dot in your eye', 'the pupil of the eye', 'אישון העין', 'The pupil gets small in the sun.')],
    orange: [S('תפוז', '🍊 a round fruit', 'orange juice', 'מיץ תפוזים', 'I drink orange juice.'),
        S('כתום', '🟠 the color of a carrot', 'an orange shirt', 'חולצה כתומה', 'My shirt is orange.')],
    well: [S('טוב', '👍 in a good way', 'very well', 'טוב מאוד', 'She sings very well.'),
        S('באר', '🪣 a deep hole for water', 'a deep well', 'באר עמוקה', 'They get water from a well.')],
    nail: [S('ציפורן', '💅 the hard part at the end of your finger', 'cut your nails', 'לגזור ציפורניים', 'Cut your nails, please.'),
        S('מסמר', '🔨 you hit it with a hammer', 'a long nail', 'מסמר ארוך', 'Dad hits the nail with a hammer.')],
    class: [S('כיתה', '🏫 the pupils who learn together', 'my class', 'הכיתה שלי', 'My class has 30 pupils.'),
        S('שיעור', '📚 a lesson', 'English class', 'שיעור אנגלית', 'We have English class today.')],
    story: [S('סיפור', '📖 something you read or tell', 'a bedtime story', 'סיפור לפני השינה', 'Mom reads me a story.'),
        S('קומה', '🏢 a floor of a building', 'a ten-story building', 'בניין בן עשר קומות', 'We live in a ten-story building.')],
    duck: [S('ברווז', '🦆 a bird that swims', 'a yellow duck', 'ברווז צהוב', 'A duck swims in the lake.'),
        S('להתכופף', '⬇️ go down fast', 'duck down', 'להתכופף', 'Duck! The ball is coming!')],
    sink: [S('כיור', '🚰 you wash your hands in it', 'the kitchen sink', 'כיור המטבח', 'Put the plates in the sink.'),
        S('לשקוע, לטבוע', '⚓ go down under water', 'sink in the water', 'לשקוע במים', 'A stone sinks in water.')],
    key: [S('מפתח', '🔑 it opens a door', 'the door key', 'מפתח הדלת', 'I can’t find my key!'),
        S('מקש', '⌨️ a button on a keyboard', 'press a key', 'ללחוץ על מקש', 'Press any key to start.')],
    board: [S('לוח', '🧑‍🏫 the teacher writes on it', 'look at the board', 'להסתכל על הלוח', 'Look at the board, please.'),
        S('לעלות (לרכבת, למטוס)', '🛫 get on a train or plane', 'board the plane', 'לעלות למטוס', 'We board the plane at ten.')],
    leave: [S('לעזוב, לצאת', '🚪 go away', 'leave the room', 'לצאת מהחדר', 'We leave home at seven.'),
        S('להשאיר', '🎒 not take it with you', 'leave it here', 'להשאיר את זה כאן', 'Leave your bag here.')],
};

/** The built-in meanings of a word (Hebrew only), or null. */
export const builtinSenses = (word, lang = 'he') => (lang === 'he' && SENSES[word]?.length > 1 ? SENSES[word] : null);

/** The translation shown for a sense, in the home language ('' when it has none). */
export const senseText = (s, lang) => s.tr?.[lang] || '';

/** All meanings in one line, for places that show a single translation (quiz, Buddy). */
export const allMeanings = (senses, lang) => senses.map(s => senseText(s, lang)).filter(Boolean).join(' / ');

/** The meaning whose translation is in `text` (e.g. the teacher's Hebrew from a Word file), or -1. */
export function matchSense(senses, text, lang) {
    const t = text.trim();
    return senses.findIndex(s => s.tr?.[lang] && s.tr[lang].split(/,\s*/).some(x => x === t || t.includes(x)));
}

/** The changes to a word when the pupil picks meaning `i`: its translation, and its own pair and example. */
export function pickPatch(w, senses, i, lang) {
    const s = senses[i];
    const patch = { senses, sense: i, tr: { ...w.tr, [lang]: senseText(s, lang) } };
    if (s.pair && s.pair !== w.pair) Object.assign(patch, { pair: s.pair, pairTr: { ...s.pairTr } });
    if (s.example && s.example !== w.example) Object.assign(patch, { example: s.example, exampleTr: {} });
    // A meaning the AI wrote earlier may be about another sense.
    if (w.sense !== i && w.meaning) patch.meaning = '';
    return patch;
}

/** Ask Gemini Nano for the word's different meanings: just the translation and a short hint each, so it is quick. Null when it can't. */
export async function nanoSenses(word, lang, name) {
    if (!lmReady()) return null;
    try {
        const r = await ask({
            title: `The meanings of “${word}”`, icon: '🔀', lean: true,
            prompt: `"${word}": its common meanings that need different ${name} words (1-3). Each: ${name} translation, and a hint (emoji + max 5 easy English words).`,
            schema: {
                type: 'object',
                properties: {
                    meanings: {
                        type: 'array', minItems: 1, maxItems: 3,
                        items: { type: 'object', properties: { translation: { type: 'string' }, hint: { type: 'string' } }, required: ['translation', 'hint'] },
                    },
                },
                required: ['meanings'],
            },
        });
        // Two meanings with the same translation are really one.
        const seen = new Set();
        const out = r.meanings.map(m => ({ tr: { [lang]: m.translation.trim() }, hint: m.hint.trim() }))
            .filter(s => s.tr[lang] && !seen.has(s.tr[lang]) && seen.add(s.tr[lang])).slice(0, 3);
        return out.length ? out : null;
    } catch { return null; }
}

/** A memory pair and an example for one meaning, asked only when the pupil picks it. Null when it can't. */
export async function nanoPairFor(word, sense) {
    if (!lmReady()) return null;
    try {
        const r = await ask({
            title: `A pair and example for “${word}”`, icon: '🔗', lean: true,
            prompt: `"${word}" meaning ${sense.hint}. Give an easy 2-3 word phrase and a short sentence (max 8 words) with it, for a 10-year-old.`,
            schema: { type: 'object', properties: { pair: { type: 'string' }, example: { type: 'string' } }, required: ['pair', 'example'] },
        });
        const has = t => wordIn(word).test(t);
        const pair = r.pair.trim().replace(/[.”"]$/, '');
        return {
            ...(has(pair) && pair.split(/\s+/).length <= 4 ? { pair, pairTr: {} } : {}),
            ...(has(r.example) ? { example: r.example.trim() } : {}),
        };
    } catch { return null; }
}
