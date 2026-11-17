// Present Simple content: the rules (Hebrew explanations with [[English]] marks),
// one recap line per rule, and the word bank the practice and quiz questions are built from.
//
// Hebrew is written for young pupils, natural and gender-neutral (plural).
// [[...]] marks English: it is shown left-to-right and spoken with the English voice.

export const INTRO = {
    id: 0, icon: '💡', color: '#22d3ee',
    title: 'מַה זֶּה [[Present Simple]]?', en: 'What is the Present Simple?',
    he: '[[Present Simple]] הוּא זְמַן הוֹוֶה פָּשׁוּט. מִשְׁתַּמְּשִׁים בּוֹ כְּשֶׁמְּדַבְּרִים עַל דְּבָרִים שֶׁקּוֹרִים תָּמִיד, כָּל יוֹם, אוֹ בְּדֶרֶךְ כְּלָל: הֶרְגֵּלִים, דְּבָרִים שֶׁאוֹהֲבִים, וְעוּבְדּוֹת שֶׁתָּמִיד נְכוֹנוֹת.',
    say: 'We use the Present Simple for things that happen every day, things we always do, and facts that are always true.',
    formula: [['every day'], ['always'], ['facts'], ['=', 'op'], ['Present Simple', 'hot']],
    examples: [
        { en: 'We go to school every day.', he: 'אֲנַחְנוּ הוֹלְכִים לְבֵית הַסֵּפֶר כָּל יוֹם.', hl: 'every day' },
        { en: 'The sun rises in the morning.', he: 'הַשֶּׁמֶשׁ זוֹרַחַת בַּבּוֹקֶר.', hl: 'rises' },
    ],
    tip: 'רֶמֶז: אִם אֶפְשָׁר לְהוֹסִיף לַמִּשְׁפָּט [[every day]], כַּנִּרְאֶה צָרִיךְ [[Present Simple]]!',
};

export const RULES = [
    {
        id: 1, icon: '👥', color: '#34d399',
        title: '[[I, You, We, They]] + פּוֹעַל', en: 'I, you, we, they + verb',
        he: 'עִם [[I]], [[you]], [[we]] וְ־[[they]] מִשְׁתַּמְּשִׁים בַּפּוֹעַל כְּמוֹ שֶׁהוּא, בְּלִי שׁוּם תּוֹסֶפֶת.',
        say: 'With I, you, we and they, we use the verb just as it is.',
        formula: [['I / You / We / They'], ['+', 'op'], ['verb', 'hot']],
        examples: [
            { en: 'They like pizza.', he: 'הֵם אוֹהֲבִים פִּיצָה.', hl: 'like' },
            { en: 'We play in the park.', he: 'אֲנַחְנוּ מְשַׂחֲקִים בַּפַּארְק.', hl: 'play' },
        ],
        tip: 'פָּשׁוּט וְקַל: הַפּוֹעַל נִשְׁאָר בְּדִיּוּק אוֹתוֹ דָּבָר!',
        short: 'עִם [[I / you / we / they]] הַפּוֹעַל נִשְׁאָר רָגִיל.',
        check: { q: 'We ___ in the park.', hint: 'play', options: ['play', 'plays'], answer: 'play' },
    },
    {
        id: 2, icon: '⭐', color: '#facc15',
        title: '[[He, She, It]] + [[s]]', en: 'He, she, it + s',
        he: 'עִם [[he]], [[she]] וְ־[[it]] מוֹסִיפִים [[s]] בְּסוֹף הַפּוֹעַל. זֶה נָכוֹן גַּם לְשֵׁם שֶׁל יֶלֶד אוֹ יַלְדָּה, כְּמוֹ [[Dana]], וּלְחַיָּה אַחַת, כְּמוֹ [[the dog]].',
        say: 'With he, she and it, we add s to the verb. This is also true for one person, like Dana, or one animal, like the dog.',
        formula: [['He / She / It'], ['+', 'op'], ['verb + s', 'hot']],
        examples: [
            { en: 'She plays the piano.', he: 'הִיא מְנַגֶּנֶת בַּפְּסַנְתֵּר.', hl: 'plays' },
            { en: 'The dog runs fast.', he: 'הַכֶּלֶב רָץ מַהֵר.', hl: 'runs' },
        ],
        tip: 'שִׁיר קָטָן לִזְכּוֹר: [[He, she, it, add an s!]]',
        short: 'עִם [[he / she / it]] מוֹסִיפִים [[s]] לַפּוֹעַל.',
        check: { q: 'Dana ___ apples.', hint: 'like', options: ['like', 'likes', 'likees'], answer: 'likes' },
    },
    {
        id: 3, icon: '🐝', color: '#fb923c',
        title: '[[es]] אַחֲרֵי [[s, sh, ch, x, z, o]]', en: 'es after s, sh, ch, x, z, o',
        he: 'כְּשֶׁהַפּוֹעַל נִגְמָר בְּ־[[s]], [[sh]], [[ch]], [[x]], [[z]] אוֹ [[o]], מוֹסִיפִים [[es]] וְלֹא רַק [[s]].',
        say: 'When the verb ends in s, sh, ch, x, z or o, we add e s.',
        formula: [['watch · wash · fix · buzz · go'], ['→', 'op'], ['+ es', 'hot']],
        examples: [
            { en: 'He watches TV.', he: 'הוּא צוֹפֶה בַּטֶּלֶווִיזְיָה.', hl: 'watches' },
            { en: 'She goes home.', he: 'הִיא הוֹלֶכֶת הַבַּיְתָה.', hl: 'goes' },
        ],
        tip: 'נַסּוּ לְהַגִּיד [[watchs]]. קָשֶׁה, נָכוֹן? בִּגְלַל זֶה מוֹסִיפִים [[e]].',
        short: 'פּוֹעַל שֶׁנִּגְמָר בְּ־[[s, sh, ch, x, z, o]] מְקַבֵּל [[es]].',
        check: { q: 'My mom ___ the car.', hint: 'wash', options: ['washs', 'washes', 'wash'], answer: 'washes' },
    },
    {
        id: 4, icon: '🍒', color: '#f472b6',
        title: '[[y]] הוֹפֶכֶת לְ־[[ies]]', en: 'y becomes ies',
        he: 'כְּשֶׁהַפּוֹעַל נִגְמָר בְּ־[[y]], מַחְלִיפִים אוֹתָהּ בְּ־[[ies]]. אֲבָל אִם לִפְנֵי הַ־[[y]] יֵשׁ אַחַת מֵהָאוֹתִיּוֹת [[a, e, o, u]], פָּשׁוּט מוֹסִיפִים [[s]].',
        say: 'When the verb ends in y, we change the y to i e s. But if a, e, o or u comes before the y, we just add s.',
        formula: [['cry'], ['→', 'op'], ['cries', 'hot'], ['but', 'op'], ['play → plays']],
        examples: [
            { en: 'The baby cries.', he: 'הַתִּינוֹק בּוֹכֶה.', hl: 'cries' },
            { en: 'He studies English.', he: 'הוּא לוֹמֵד אַנְגְּלִית.', hl: 'studies' },
        ],
        tip: '[[fly → flies]], [[try → tries]], אֲבָל [[play → plays]].',
        short: '[[y]] בְּסוֹף הַפּוֹעַל הוֹפֶכֶת לְ־[[ies]] (אֲבָל [[play → plays]]).',
        check: { q: 'Tom ___ every evening.', hint: 'study', options: ['studys', 'studyes', 'studies'], answer: 'studies' },
    },
    {
        id: 5, icon: '🏠', color: '#a78bfa',
        title: '[[have]] הוֹפֵךְ לְ־[[has]]', en: 'have becomes has',
        he: 'הַפּוֹעַל [[have]] מְיוּחָד! עִם [[he]], [[she]] וְ־[[it]] אוֹמְרִים [[has]], וְלֹא [[haves]].',
        say: 'Have is special! With he, she and it, we say has.',
        formula: [['He / She / It'], ['+', 'op'], ['has', 'hot']],
        examples: [
            { en: 'She has a cat.', he: 'יֵשׁ לָהּ חָתוּל.', hl: 'has' },
            { en: 'They have two dogs.', he: 'יֵשׁ לָהֶם שְׁנֵי כְּלָבִים.', hl: 'have' },
        ],
        tip: '[[I have]], [[you have]], [[we have]], [[they have]]. אֲבָל [[he has]], [[she has]], [[it has]].',
        short: 'עִם [[he / she / it]] אוֹמְרִים [[has]], לֹא [[have]].',
        check: { q: 'Dan ___ a red bike.', hint: 'have', options: ['haves', 'have', 'has'], answer: 'has' },
    },
    {
        id: 6, icon: '🚫', color: '#fb7185',
        title: "שְׁלִילָה: [[don't / doesn't]]", en: "Saying no: don't, doesn't",
        he: "כְּדֵי לְהַגִּיד שֶׁמַּשֶּׁהוּ לֹא קוֹרֶה, שָׂמִים [[don't]] לִפְנֵי הַפּוֹעַל. עִם [[he]], [[she]] וְ־[[it]] שָׂמִים [[doesn't]]. אַחֲרֵי [[doesn't]] הַפּוֹעַל חוֹזֵר לִהְיוֹת רָגִיל, בְּלִי [[s]]!",
        say: "To say no, we put don't before the verb. With he, she and it we use doesn't, and then the verb has no s.",
        formula: [["I / You / We / They"], ['+', 'op'], ["don't", 'hot'], ['+', 'op'], ['verb'], ['|', 'op'], ['He / She / It'], ['+', 'op'], ["doesn't", 'hot'], ['+', 'op'], ['verb']],
        examples: [
            { en: "We don't like milk.", he: 'אֲנַחְנוּ לֹא אוֹהֲבִים חָלָב.', hl: "don't" },
            { en: "He doesn't play tennis.", he: 'הוּא לֹא מְשַׂחֵק טֶנִיס.', hl: "doesn't" },
        ],
        tip: "הַ־[[s]] קָפְצָה לְ־[[doesn't]], אָז הַפּוֹעַל כְּבָר לֹא צָרִיךְ אוֹתָהּ.",
        short: "שְׁלִילָה: [[don't]], וְעִם [[he / she / it]] [[doesn't]]. הַפּוֹעַל אַחֲרֵיהֶם בְּלִי [[s]].",
        check: { q: 'She ___ like spiders.', options: ["don't", "doesn't"], answer: "doesn't" },
    },
    {
        id: 7, icon: '❓', color: '#60a5fa',
        title: 'שְׁאֵלָה: [[Do / Does]]', en: 'Questions: Do, Does',
        he: 'כְּדֵי לִשְׁאוֹל שְׁאֵלָה, שָׂמִים [[Do]] בַּהַתְחָלָה. עִם [[he]], [[she]] וְ־[[it]] שָׂמִים [[Does]]. גַּם כָּאן הַפּוֹעַל נִשְׁאָר בְּלִי [[s]]. עוֹנִים בִּקְצָרָה: [[Yes, I do]], אוֹ [[No, she doesn\'t]].',
        say: "To ask a question, we start with Do. With he, she and it, we start with Does, and the verb has no s. Short answers: Yes, I do. No, she doesn't.",
        formula: [['Do / Does', 'hot'], ['+', 'op'], ['who?'], ['+', 'op'], ['verb'], ['?', 'op']],
        examples: [
            { en: 'Do you like cats?', he: 'אַתֶּם אוֹהֲבִים חֲתוּלִים?', hl: 'Do' },
            { en: 'Does she swim? Yes, she does.', he: 'הִיא שׂוֹחָה? כֵּן.', hl: 'Does' },
        ],
        tip: 'שְׁאֵלָה נִפְתַּחַת בְּ־[[Do]] אוֹ [[Does]], כְּמוֹ דֶּלֶת שֶׁפּוֹתַחַת אֶת הַשְּׁאֵלָה 🚪',
        short: 'שְׁאֵלָה מַתְחִילָה בְּ־[[Do]], וְעִם [[he / she / it]] בְּ־[[Does]].',
        check: { q: '___ your brother play football?', options: ['Do', 'Does'], answer: 'Does' },
    },
    {
        id: 8, icon: '⏰', color: '#2dd4bf',
        title: 'מִילּוֹת זְמַן', en: 'Time words',
        he: 'מִילּוֹת זְמַן מַרְאוֹת לָנוּ שֶׁצָּרִיךְ [[Present Simple]]: [[always]] זֶה תָּמִיד, [[usually]] זֶה בְּדֶרֶךְ כְּלָל, [[often]] זֶה הַרְבֵּה פְּעָמִים, [[sometimes]] זֶה לִפְעָמִים, וְ־[[never]] זֶה אַף פַּעַם. הֵן בָּאוֹת לִפְנֵי הַפּוֹעַל. [[every day]], כָּל יוֹם, בָּא בְּסוֹף הַמִּשְׁפָּט.',
        say: 'Time words tell us to use the Present Simple: always, usually, often, sometimes and never. They come before the verb. Every day comes at the end.',
        formula: [['always · usually · often · sometimes · never', 'hot'], ['+', 'op'], ['verb']],
        examples: [
            { en: 'He always eats breakfast.', he: 'הוּא תָּמִיד אוֹכֵל אֲרוּחַת בּוֹקֶר.', hl: 'always' },
            { en: 'We sometimes swim in the sea.', he: 'לִפְעָמִים אֲנַחְנוּ שׂוֹחִים בַּיָּם.', hl: 'sometimes' },
        ],
        tip: "[[never]] כְּבָר אוֹמֵר 'אַף פַּעַם', אָז לֹא צָרִיךְ גַּם [[don't]]!",
        short: 'מִילּוֹת זְמַן ([[always, usually, often, sometimes, never]]) בָּאוֹת לִפְנֵי הַפּוֹעַל.',
        check: { q: 'I ___ brush my teeth before bed.', hintHe: 'תָּמִיד', options: ['never', 'always', 'sometimes'], answer: 'always' },
    },
    {
        id: 9, icon: '⚠️', color: '#f59e0b',
        title: 'מִילִּים מְיוּחָדוֹת', en: 'Special words',
        // A list: the first line, then one short line for each kind of special word.
        he: [
            'יֵשׁ כַּמָּה מִילִּים שֶׁלֹּא עוֹבְדוֹת לְפִי הַכְּלָלִים:',
            '[[be]] מִשְׁתַּנֶּה לְגַמְרֵי: [[I am]], [[he is]], [[they are]]. בִּשְׁלִילָה וּבִשְׁאֵלָה לֹא צָרִיךְ [[do]]: [[She isn\'t sad.]] [[Is he happy?]]',
            'אַחֲרֵי [[can]], [[must]] וְ־[[should]] אֵין [[s]], וְהַפּוֹעַל שֶׁאַחֲרֵיהֶן נִשְׁאָר רָגִיל: [[She can swim.]]',
            '[[everyone]] וְ־[[everybody]] הֵם כְּמוֹ [[he]], אָז מוֹסִיפִים [[s]]: [[Everyone likes pizza.]]',
        ],
        say: "Some words don't follow the rules. Be changes: I am, he is, they are. With be, we don't use do: She isn't sad. Is he happy? After can, must and should there is no s: She can swim. Everyone and everybody are like he, so we add s: Everyone likes pizza.",
        formula: [['I am'], ['he / she / it is'], ['you / we / they are', 'hot'], ['|', 'op'], ['can + verb'], ['|', 'op'], ['everyone + s']],
        examples: [
            { en: 'My brother is ten years old.', he: 'אָחִי בֶּן עֶשֶׂר.', hl: 'is' },
            { en: 'She can swim.', he: 'הִיא יוֹדַעַת לִשְׂחוֹת.', hl: 'can swim' },
            { en: 'Everyone likes pizza.', he: 'כּוּלָּם אוֹהֲבִים פִּיצָה.', hl: 'likes' },
        ],
        tip: "שִׂימוּ לֵב לַהֲגִייָּה: [[says]] נִשְׁמָע 'סֶז', וְ־[[does]] נִשְׁמָע 'דַאז' 🔊",
        short: 'מִילִּים מְיוּחָדוֹת: [[am / is / are]], אַחֲרֵי [[can]] בְּלִי [[s]], וְ־[[everyone]] כְּמוֹ [[he]].',
        check: { q: 'My cat ___ very small.', hint: 'be', options: ['am', 'is', 'are'], answer: 'is' },
    },
];

export const ruleById = id => (id === 0 ? INTRO : RULES.find(r => r.id === id));

/** Quick recap: one line per rule. `answers` lists every accepted answer. */
export const RECAP = [
    { rule: 3, q: 'He ___ the dishes after dinner.', hint: 'wash', answers: ['washes'] },
    { rule: 7, q: '___ the cat like fish?', answers: ['does'] },
    { rule: 1, q: 'They ___ ice cream.', hint: 'like', answers: ['like'] },
    { rule: 5, q: 'My grandma ___ a big garden.', hint: 'have', answers: ['has'] },
    { rule: 8, q: 'Tom ___ eats fish.', hintHe: 'אַף פַּעַם', answers: ['never'] },
    { rule: 2, q: 'My sister ___ a book every night.', hint: 'read', answers: ['reads'] },
    { rule: 6, q: 'She ___ spiders.', hint: 'not like', answers: ["doesn't like", 'does not like'] },
    { rule: 4, q: 'The baby ___ at night.', hint: 'cry', answers: ['cries'] },
    { rule: 9, q: 'Everyone in my class ___ football.', hint: 'love', answers: ['loves'] },
];

/* ---------------------------------------------------------------- word bank */

// p: 1 = I / you / we / they (and plurals), 3 = he / she / it (and one person or animal).
export const SUBJECTS = [
    { t: 'I', p: 1 }, { t: 'You', p: 1 }, { t: 'We', p: 1 }, { t: 'They', p: 1 },
    { t: 'He', p: 3 }, { t: 'She', p: 3 }, { t: 'My mom', p: 3 }, { t: 'My dad', p: 3 },
    { t: 'Dana', p: 3 }, { t: 'Tom', p: 3 }, { t: 'My sister', p: 3 }, { t: 'Our teacher', p: 3 },
    { t: 'My friends', p: 1 }, { t: 'The kids', p: 1 },
    { t: 'The cat', p: 3, pet: true }, { t: 'The dog', p: 3, pet: true }, { t: 'The birds', p: 1, pet: true },
];

// rest: what follows the verb. pet: what an animal can do with it (no pet list = people only).
export const VERBS = [
    { v: 'play', rest: ['football after school', 'the piano', 'games on Fridays'], pet: ['in the garden'] },
    { v: 'like', rest: ['pizza', 'ice cream', 'funny movies'], pet: ['fish'] },
    { v: 'read', rest: ['books at night', 'comics'] },
    { v: 'eat', rest: ['apples', 'breakfast at seven'], pet: ['a lot'] },
    { v: 'drink', rest: ['milk', 'orange juice'], pet: ['water'] },
    { v: 'walk', rest: ['to school', 'in the park'] },
    { v: 'ride', rest: ['a bike', 'a horse on Sundays'] },
    { v: 'swim', rest: ['in the sea', 'every summer'] },
    { v: 'live', rest: ['in Haifa', 'near the school'] },
    { v: 'sing', rest: ['in the shower', 'songs in class'], pet: ['in the morning'] },
    { v: 'watch', rest: ['TV', 'cartoons on Saturdays'] },
    { v: 'wash', rest: ['the dishes', 'the car'] },
    { v: 'catch', rest: ['the bus at eight', 'the ball'], pet: ['the ball'] },
    { v: 'fix', rest: ['bikes', 'the computer'] },
    { v: 'go', rest: ['to school', 'to bed at nine'], pet: ['outside'] },
    { v: 'do', rest: ['homework after school', 'the dishes'] },
    { v: 'teach', rest: ['English', 'math'] },
    { v: 'finish', rest: ['school at one', 'lunch fast'] },
    { v: 'cry', rest: ['at sad movies'] },
    { v: 'study', rest: ['English', 'for tests'] },
    { v: 'fly', rest: ['kites'], pet: ['high'] },
    { v: 'carry', rest: ['a big bag', 'the shopping bags'] },
    { v: 'try', rest: ['new food'] },
    { v: 'enjoy', rest: ['music', 'the beach'] },
    { v: 'stay', rest: ['at home on Saturdays'] },
    { v: 'have', rest: ['a dog', 'lunch at school'], pet: ['a ball'] },
];

export const TIME_WORDS = [
    { en: 'always', he: 'תָּמִיד' },
    { en: 'usually', he: 'בְּדֶרֶךְ כְּלָל' },
    { en: 'often', he: 'הַרְבֵּה פְּעָמִים' },
    { en: 'sometimes', he: 'לִפְעָמִים' },
    { en: 'never', he: 'אַף פַּעַם' },
];

/* ---------------------------------------------------------------- practice worksheet */

// The class worksheet ("Present simple.pdf"). Part 1: sort the verbs by the ending they get with he / she / it.
export const SORT_VERBS = ['do', 'fix', 'dress', 'study', 'play', 'look', 'cry', 'sing', 'fly', 'drink', 'teach', 'carry', 'buy'];

// Part 2: complete the verb. Each blank is { hint, answer, rule }.
export const SHEET = [
    { parts: ['The teacher ', ' the class every day.'], blanks: [{ hint: 'teach', answer: 'teaches', rule: 3 }] },
    { parts: ['We ', ' our teeth every morning.'], blanks: [{ hint: 'brush', answer: 'brush', rule: 1 }] },
    { parts: ['David ', ' to work every day.'], blanks: [{ hint: 'go', answer: 'goes', rule: 3 }] },
    { parts: ['The baby ', ' every time he ', ' to eat.'], blanks: [{ hint: 'cry', answer: 'cries', rule: 4 }, { hint: 'want', answer: 'wants', rule: 2 }] },
    { parts: ['Dan and Dina ', ' together every break.'], blanks: [{ hint: 'play', answer: 'play', rule: 1 }], note: '[[Dan and Dina]] הֵם שְׁנַיִים, כְּמוֹ [[they]].' },
    { parts: ['The sun ', ' every morning.'], blanks: [{ hint: 'rise', answer: 'rises', rule: 2 }] },
    { parts: ['I ', ' my horse every afternoon.'], blanks: [{ hint: 'ride', answer: 'ride', rule: 1 }] },
    { parts: ['They ', ' lunch to school every day.'], blanks: [{ hint: 'bring', answer: 'bring', rule: 1 }] },
];

/* ---------------------------------------------------------------- Verb To Be worksheet */

// The class worksheet "Verb To Be.pdf", kept as written. Hebrew is pointed on top of the full spelling.
export const BE_SHEET = [
    {
        id: 'fill', kind: 'choose', options: ['am', 'is', 'are'], rule: 9,
        title: 'הַשְׁלִימוּ [[am / is / are]] בַּמָּקוֹם הַמַּתְאִים:',
        lines: [
            ['The cat ', ' in the box.', 'is'],
            ['Dalia ', ' my sister.', 'is'],
            ['Me and you ', ' friends.', 'are'],
            ['I ', ' very tired.', 'am'],
            ['Lital ', ' beautiful.', 'is'],
            ['Tomer and hila ', ' brother and sister.', 'are'],
            ['My grandmother ', ' 90 years old.', 'is'],
            ['The flowers ', ' red, blue, and purple.', 'are'],
            ['Dan and I ', ' in school right now.', 'are'],
            ['I ', ' not at home.', 'am'],
        ],
    },
    {
        id: 'neg', kind: 'rewrite', rule: 9,
        title: 'צוּרַת הַשְּׁלִילָה – [[negative]] – כִּתְבוּ אֶת הַמִּשְׁפָּטִים בְּצוּרַת הַשְּׁלִילָה:',
        help: "תִּזְכּוֹרֶת: [[am not / isn't / aren't]]. אֶפְשָׁר לִכְתּוֹב גַּם [[is not]] וְ־[[are not]].",
        lines: [
            ['My mother is a teacher.', "My mother isn't a teacher."],
            ['I am at the supermarket.', 'I am not at the supermarket.'],
            ['Elinor is an excellent student.', "Elinor isn't an excellent student."],
            ['The kitchen is clean.', "The kitchen isn't clean."],
            ['Ben and Dan are very hungry.', "Ben and Dan aren't very hungry."],
            ['America is a big country.', "America isn't a big country."],
        ],
    },
    {
        id: 'ask', kind: 'choose', options: ['Am', 'Is', 'Are'], rule: 9,
        title: 'צוּרַת הַשְּׁאֵלָה – [[question]] – הַשְׁלִימוּ [[am / is / are]] בַּמָּקוֹם הַמַּתְאִים.',
        lines: [
            ['', ' you a student?', 'Are'],
            ['', ' she at home?', 'Is'],
            ['', ' I late?', 'Am'],
            ['', ' Bill and Bob friends?', 'Are'],
            ['', ' the rabbit beautiful?', 'Is'],
        ],
    },
    {
        id: 'wh', kind: 'choose', options: ['What', 'Where', 'Why', 'Who', 'When'],
        title: 'שְׁאֵלוֹת [[WH]] – הַשְׁלִימוּ אֶת מִילַּת הַשְּׁאֵלָה הַמַּתְאִימָה.',
        // What each question word means, shown when a pupil needs help.
        meanings: { What: 'מַה', Where: 'אֵיפֹה', Why: 'לָמָּה', Who: 'מִי', When: 'מָתַי' },
        lines: [
            ['', ' is your name? My name is Tom.', 'What'],
            ['', " is your bag? It's on the desk.", 'Where'],
            ['', " are you happy today? Because it's my birthday.", 'Why'],
        ],
    },
];
