// "My Blog" content: the model blog from the class book, the writing tips, and the plan
// (four paragraphs, each with ideas and sentence starters).
//
// Hebrew is written with full niqqud on top of the full spelling, like the Present Simple page,
// so the ניקוד switch can show it with or without the marks. [[...]] marks English.

// The model from the book (Workbook, Writing, page 32).
export const MODEL = {
    name: 'Ali',
    paragraphs: [
        "My name is Ali. I live in Jaffa. I'm 11 years old and my birthday is August 5th. I go to Green Park School.",
        'I have two brothers. I also have a cat. His name is Felix.',
        'I am busy in the afternoons. I go to a cooking class on Mondays. I have guitar lessons on Thursdays. I also swim three times a week. We have competitions once a month.',
        "I'm looking for new friends! Do you want to be my friend? Please tell me about yourself.",
    ],
};

// Tips: the book's tip first, then extra ones.
export const TIPS = [
    {
        icon: '🔠', from: 'book', title: 'אוֹתִיּוֹת גְּדוֹלוֹת', en: 'Capital letters',
        he: 'בְּאַנְגְּלִית מִשְׁתַּמְּשִׁים בְּאוֹתִיּוֹת גְּדוֹלוֹת: בִּתְחִילַּת כָּל מִשְׁפָּט, לַמִּילָּה [[I]], וְלִשְׁמוֹת שֶׁל אֲנָשִׁים, מְקוֹמוֹת, יְמֵי הַשָּׁבוּעַ וְחוֹדָשִׁים.',
        ex: 'My name is Ali. I live in Jaffa. I swim on Mondays in August.',
    },
    {
        icon: '⏺️', title: 'נְקוּדָה וְסִימַן שְׁאֵלָה', en: 'Full stop and question mark',
        he: 'כָּל מִשְׁפָּט נִגְמָר בִּנְקוּדָה [[.]], וּשְׁאֵלָה נִגְמֶרֶת בְּסִימַן שְׁאֵלָה [[?]].',
        ex: 'I have a cat. Do you have a pet?',
    },
    {
        icon: '🧱', title: 'אַרְבַּע פִּסְקָאוֹת', en: 'Four paragraphs',
        he: 'כְּמוֹ בַּבְּלוֹג שֶׁל [[Ali]]: פִּסְקָה עַל עַצְמְכֶם, פִּסְקָה עַל הַמִּשְׁפָּחָה, פִּסְקָה עַל מָה שֶׁאַתֶּם עוֹשִׂים אַחֲרֵי הַצָּהֳרַיִים, וּפִסְקָה שֶׁל סִיּוּם.',
        ex: '1. Me  2. My family  3. My afternoons  4. Goodbye',
    },
    {
        icon: '⏰', title: '[[Present Simple]]', en: 'Present Simple',
        he: 'כּוֹתְבִים עַל דְּבָרִים שֶׁקּוֹרִים תָּמִיד, אָז מִשְׁתַּמְּשִׁים בְּ־[[Present Simple]]. אַל תִּשְׁכְּחוּ: [[he / she / it]] + [[s]].',
        ex: 'My brother plays football. I play the guitar.',
        link: { href: 'grammar.html', text: '📘 Present Simple' },
    },
    {
        icon: '🗓️', title: 'כַּמָּה פְּעָמִים?', en: 'How often?',
        he: 'סַפְּרוּ מָתַי וְכַמָּה פְּעָמִים: [[on Mondays]], [[every day]], [[three times a week]], [[once a month]].',
        ex: 'I swim three times a week.',
    },
    {
        icon: '🔗', title: 'מִילּוֹת קִישּׁוּר', en: 'Joining words',
        he: 'חַבְּרוּ מִשְׁפָּטִים עִם [[and]], [[also]], [[but]] וְ־[[because]].',
        ex: 'I have a cat and I also have a dog.',
    },
    {
        icon: '🛡️', title: 'שׁוֹמְרִים עַל פְּרָטִיּוּת', en: 'Stay safe online',
        he: 'בָּאִינְטֶרְנֶט לֹא כּוֹתְבִים כְּתוֹבֶת, מִסְפַּר טֶלֶפוֹן אוֹ שֵׁם מִשְׁפָּחָה. מַסְפִּיק לִכְתּוֹב אֶת הָעִיר.',
        ex: 'I live in Haifa.',
    },
    {
        icon: '💬', title: 'סַיְּימוּ בִּשְׁאֵלָה', en: 'End with a question',
        he: 'שַׁאֲלוּ אֶת הַקּוֹרְאִים שְׁאֵלָה, כְּמוֹ [[Ali]]: [[Do you want to be my friend?]]',
        ex: 'What do you like to do after school?',
    },
];

// The four paragraphs. `words` light up the paragraph tracker while the pupil writes.
export const PLAN = [
    {
        id: 'me', icon: '🙋', title: 'מִי אֲנִי', en: 'About me', color: '#22d3ee',
        ask: ['What is your name?', 'Where do you live?', 'How old are you?', 'When is your birthday?', 'What school do you go to?'],
        starters: ['My name is ', 'I live in ', "I'm  years old.", 'My birthday is ', 'I go to '],
        words: /\b(name is|live in|years old|birthday|school)\b/i,
    },
    {
        id: 'family', icon: '👨‍👩‍👧', title: 'הַמִּשְׁפָּחָה שֶׁלִּי', en: 'My family', color: '#f472b6',
        ask: ['Do you have brothers or sisters?', 'Do you have a pet?', 'What is its name?'],
        starters: ['I have ', 'I also have a ', 'His name is ', 'Her name is ', 'My mom likes '],
        words: /\b(brothers?|sisters?|mom|dad|mother|father|family|cat|dog|pet|fish|bird|rabbit)\b/i,
    },
    {
        id: 'free', icon: '⚽', title: 'אַחֲרֵי בֵּית הַסֵּפֶר', en: 'After school', color: '#facc15',
        ask: ['What do you do in the afternoons?', 'What do you do on Mondays?', 'How often?', 'What is your favorite hobby?'],
        starters: ['I am busy in the afternoons. ', 'On Mondays I ', ' three times a week.', 'My favorite hobby is ', 'I like to '],
        words: /\b(afternoons?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|hobby|class|lessons?|times a week|every day|once a)\b/i,
    },
    {
        id: 'bye', icon: '💬', title: 'סִיּוּם', en: 'Goodbye', color: '#34d399',
        ask: ['What do you want from your readers?', 'What question can you ask them?'],
        starters: ["I'm looking for new friends! ", 'Do you like ', 'Please tell me about yourself.', 'Write to me soon!'],
        words: /\?|\b(friends?|tell me|write to me|bye)\b/i,
    },
];

// Short Hebrew messages for the live checks.
export const CHECK_HE = {
    start: 'מִשְׁפָּט מַתְחִיל בְּאוֹת גְּדוֹלָה.',
    i: 'הַמִּילָּה [[I]] תָּמִיד בְּאוֹת גְּדוֹלָה.',
    name: 'יָמִים, חוֹדָשִׁים וּשְׁמוֹת מַתְחִילִים בְּאוֹת גְּדוֹלָה.',
    end: 'בְּסוֹף מִשְׁפָּט שָׂמִים נְקוּדָה.',
    question: 'שְׁאֵלָה נִגְמֶרֶת בְּסִימַן שְׁאֵלָה [[?]].',
    s: 'עִם [[he / she / it]] מוֹסִיפִים [[s]] לַפּוֹעַל.',
    noS: 'עִם [[I / you / we / they]] הַפּוֹעַל בְּלִי [[s]].',
    private: 'זֶה פְּרָט אִישִׁי. בָּאִינְטֶרְנֶט לֹא כּוֹתְבִים אוֹתוֹ.',
    hebrew: 'כּוֹתְבִים בְּאַנְגְּלִית. לֹא יוֹדְעִים אֵיךְ אוֹמְרִים? שַׁאֲלוּ אֶת בָּאדִי.',
};
