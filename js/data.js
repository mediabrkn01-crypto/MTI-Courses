/* data.js — extracted verbatim from the original single-file index.html.
   Source lines: 1026-1082, 1210-1222, 1383-1610, 4192-4206
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── 5. MODULE BANNER IMAGES ──────────────────────────────────────────────────
// Paste any image URL (from Imgur, Google Drive, Dropbox, etc.) next to the day.
// Leave as "" to show the default dark gradient placeholder.
//
// HOW TO GET A FREE IMAGE URL:
//   • Go to https://imgur.com → upload your image → right-click → Copy image address
//   • Use that URL (ending in .jpg or .png) below
//
const MODULE_IMAGES = {
   1: "",    // Day 1  — Foundational Phonetics
   2: "",    // Day 2  — ED Endings
   3: "",    // Day 3  — Pluralization
   4: "",    // Day 4  — Age Endings
   5: "",    // Day 5  — Short Vowels
   6: "",    // Day 6  — Short /ɪ/ vs Long /iː/
   7: "",    // Day 7  — Consonant Clusters
   8: "",    // Day 8  — Word Stress
   9: "",    // Day 9  — Verb vs Noun Stress
  10: "",    // Day 10 — TH Sound Mechanics
  11: "",    // Day 11 — Silent Letters
  12: "",    // Day 12 — The 3 O Sounds
  13: "",    // Day 13 — R and L Sounds
  14: "",    // Day 14 — Consonant Sounds
  15: "",    // Day 15 — British vs American
  16: "",    // Day 16 — Diphthongs
  17: "",    // Day 17 — Strong & Weak Forms
  18: "",    // Day 18 — Schwa & Connected Speech
  19: "",    // Day 19 — Sentence Rhythm
  20: "",    // Day 20 — Advanced Shadowing
  21: "",    // Day 21 — Pronunciation Fix 1
  22: "",    // Day 22 — Pronunciation Fix 2
  23: "",    // Day 23 — Pronunciation Fix 3
  24: "",    // Day 24 — Pronunciation Fix 4
  25: "",    // Day 25 — Pronunciation Fix 5
  26: "",    // Day 26 — Pronunciation Fix 6
  27: "",    // Day 27 — Pronunciation Fix 7
  28: "",    // Day 28 — Pronunciation Fix 8
  29: "",    // Day 29 — Pronunciation Fix 9
  30: "",    // Day 30 — Pronunciation Fix 10
};

// ── 6. FALLBACK BANNER GRADIENTS ─────────────────────────────────────────────
// Shown when no image URL is set above. 10 styles that cycle through 30 days.
// Change these to any CSS gradient you like.
const BANNER_GRADIENTS = [
  "linear-gradient(135deg,#0d1b2a 0%,#1b2838 100%)",
  "linear-gradient(135deg,#1a0a00 0%,#3d1200 100%)",
  "linear-gradient(135deg,#0a1628 0%,#163758 100%)",
  "linear-gradient(135deg,#12001e 0%,#2e0050 100%)",
  "linear-gradient(135deg,#001a10 0%,#004428 100%)",
  "linear-gradient(135deg,#1a0008 0%,#440018 100%)",
  "linear-gradient(135deg,#001520 0%,#003045 100%)",
  "linear-gradient(135deg,#1a1400 0%,#443600 100%)",
  "linear-gradient(135deg,#001818 0%,#003d3d 100%)",
  "linear-gradient(135deg,#180018 0%,#3d003d 100%)",
];

// ── ACHIEVEMENTS ──────────────────────────────────────────────────────────────
const BADGES = [
  {id:'b01',emoji:'🌱',name:'Day 1 Done',desc:'Completed your first class.',check:s=>s.completed>=1},
  {id:'b02',emoji:'🔥',name:'On a Roll',desc:'Completed 3 classes.',check:s=>s.completed>=3},
  {id:'b03',emoji:'⚡',name:'Challenge Accepted',desc:'Passed your first quiz.',check:s=>s.quizzes>=1},
  {id:'b04',emoji:'🎯',name:'Halfway Hero',desc:'Completed 15 classes.',check:s=>s.completed>=15},
  {id:'b05',emoji:'🧠',name:'Stress Champion',desc:'Completed 5 classes.',check:s=>s.completed>=5},
  {id:'b06',emoji:'👄',name:'Sound Master',desc:'Completed 10 classes.',check:s=>s.completed>=10},
  {id:'b07',emoji:'🌊',name:'Rhythm Rider',desc:'Completed 20 classes.',check:s=>s.completed>=20},
  {id:'b08',emoji:'🏆',name:'Pronunciation License',desc:'All 30 classes complete.',check:s=>s.completed>=30},
  {id:'b09',emoji:'📝',name:'Quiz Ace',desc:'Passed 5 quizzes.',check:s=>s.quizzes>=5},
];

// ─── QUIZ BANK ────────────────────────────────────────────────────────────────
const QUIZ_BANK={
  // ── Day 1: Foundational Phonetics ──────────────────────────────────────────
  1:[
    {id:"d1q1",prompt:"What is the core definition of a syllable?",options:["A block of letters that contains a silent consonant.","A complete unit of spoken language consisting of one vowel sound.","Any combination of three letters or more.","A word that cannot be broken down into smaller pieces."]},
    {id:"d1q2",prompt:"How many syllables are in 'communication'?",options:["4","5","6","7"]},
    {id:"d1q3",prompt:"Why is English considered 'non-phonetic'?",options:["Because it uses the Cyrillic alphabet instead of Latin.","Letters are always pronounced exactly the same way.","There is no direct relationship between spelling and sound.","It lacks any complex vowel sounds."]},
    {id:"d1q4",prompt:"How many letters vs. sounds does English have?",options:["44 letters; 26 sounds.","26 letters; 26 sounds.","26 letters; 44 sounds.","44 letters; 44 sounds."]},
    {id:"d1q5",prompt:"What does throat vibration prove about a sound?",options:["The sound is unvoiced.","The sound is voiced.","The sound is an elongated nasal sound.","The mouth is fully open."]},
    {id:"d1q6",prompt:"Which word has exactly three syllables?",options:["Communication","Beautiful","Object","Act"]},
    {id:"d1q7",prompt:"What is the purpose of the IPA (International Phonetic Alphabet)?",options:["To dictate absolute grammatical rules globally.","To provide universal, unambiguous symbols for sounds.","To replace standard English spellings in dictionaries.","To translate English words into multiple languages."]},
  ],
  // ── Day 2: ED Endings ──────────────────────────────────────────────────────
  2:[
    {id:"d5q1",prompt:"What is the key fix for MTI (Mother Tongue Influence) with the /ɪ/ sound?",options:["Dropping all final short consonants.","Using a crisp /ɪ/ sound, not the long /i:/.","Elongating the unstressed suffix.","Using rising intonation structures."]},
    {id:"d5q2",prompt:"What is the mouth position for the short /ɪ/ sound?",options:["Smile wide and pull back tongue tightly.","Relaxed, minimal jaw drop.","Drop jaw fully with rounded lips.","Rest tongue flat against lower teeth."]},
    {id:"d5q3",prompt:"Where does the primary stress fall in the word 'competition'?",options:["Initial (com-).","Secondary (pe-).","Penultimate (-ti-).","Ultimate (-on)."]},
    {id:"d5q4",prompt:"What MTI error typically occurs in the word 'ambition'?",options:["Reducing the target to a weak schwa.","Stretching /ɪ/ to the long /i:/.","Introducing an intrusive glide sound.","Dropping the nasal termination."]},
    {id:"d5q5",prompt:"Which word is the minimal pair example for the short /ɪ/ sound?",options:["Seat","Sit","Sat","Sight"]},
    {id:"d5q6",prompt:"What is the key warning when applying stress to a syllable?",options:["Accelerate the unstressed syllable structure.","Don't warp the vowel quality when stressing.","Always apply extreme throat friction.","Eliminate nasal elements entirely."]},
    {id:"d5q7",prompt:"What makes 'happy' phonetically unusual at the end?",options:["Uses a unique trilled vocalic structure.","It uses an intermediate sound between /ɪ/ and /i:/.","Features a silent terminal suffix.","Stress is placed equally on both segments."]},
  ],
  // ── Day 3: Pluralization ───────────────────────────────────────────────────
  3:[
    {id:"d3q1",prompt:"How is the plural 's' pronounced after a voiced consonant?",options:["Unvoiced /s/ friction.","Voiced /z/ vibration.","Weak transitional schwa.","Completely silent glide."]},
    {id:"d3q2",prompt:"Which word uses the unvoiced /s/ for its plural?",options:["Houses","Books","Uses","Pins"]},
    {id:"d3q3",prompt:"How is the possessive 's' in 'cat's' pronounced?",options:["Voiced /z/ vibration.","Unvoiced /s/ friction.","Syllabic /ɪz/.","Complete elision."]},
    {id:"d3q4",prompt:"What governs the pronunciation of a final 's'?",options:["The number of vowels inside the root stem.","The historical spelling of the prefix.","The preceding sound's voicing.","The sentence stress timing rules."]},
    {id:"d3q5",prompt:"How is 'uses' (plural noun) pronounced?",options:["Voiced /z/.","Unvoiced /s/.","Weak schwa extension.","Silent termination."]},
    {id:"d3q6",prompt:"How does 'close' differ as an adjective vs. a verb?",options:["Adj /s/, Verb /z/.","Adj /z/, Verb /s/.","Both are unvoiced /s/.","Both are voiced /z/."]},
    {id:"d3q7",prompt:"Which is a correctly matched voiced/unvoiced consonant pair?",options:["/p/ and /s/.","/f/ and /v/.","/t/ and /k/.","/m/ and /n/."]},
  ],
  // ── Day 4: Age Endings ────────────────────────────────────────────────────
  4:[
    {id:"d4q1",prompt:"How is the '-age' suffix pronounced in more than 90% of English words?",options:["/eɪdʒ/ (like the standalone word 'age')","/ɪdʒ/ (with a short 'i' sound)","/ɑːʒ/ (with a French 'zh' sound)","It remains completely silent"]},
    {id:"d4q2",prompt:"Under what specific condition is '-age' pronounced as /eɪdʒ/ (e.g. page, cage, rage)?",options:["When it comes immediately after a vowel sound","Only when the word originates from French","When it is part of a stressed syllable","When the word has three or more syllables"]},
    {id:"d4q3",prompt:"Why does the word 'enrage' maintain the /eɪdʒ/ pronunciation at the end?",options:["Because the stress falls on the second syllable ('-rage')","Because the stress falls on the first syllable ('en-')","Because it is a direct French loanword","Because it ends with a silent consonant"]},
    {id:"d4q4",prompt:"Which word is an unstressed '-age' exception pronounced with the short /ɪdʒ/ sound?",options:["Camouflage","Mirage","Manage","Stage"]},
    {id:"d4q5",prompt:"How is '-age' typically pronounced in French loanwords such as 'mirage' or 'collage'?",options:["/ɪdʒ/","/ɑːʒ/ (a long 'a' sound followed by a 'zh' sound)","/æɡ/","/eɪɡ/"]},
    {id:"d4q6",prompt:"What is the meaning of the French-derived word 'sillage'?",options:["The design or ability to blend into surroundings","The act of using spies to extract information","The trail of scent a perfume leaves behind in a room after a person has left","A deliberate act intended to destroy something"]},
    {id:"d4q7",prompt:"How does 'voyage' change when used in 'bon voyage' vs. standalone English?",options:["It stays exactly the same in both contexts","In English it ends with /ɪdʒ/ ('voy-ij'), but in the French expression it ends with /ʒ/ ('bon voy-ahzh')","In English it ends with /ɑːʒ/, but in the French expression it ends with /ɪdʒ/","It becomes completely silent in the expression"]},
  ],
  // ── Day 5: Short Vowels ────────────────────────────────────────────────────
  5:[
    {id:"d2q1",prompt:"What is the role of vocal cords in speech?",options:["They capture air from the lungs without vibrating.","They produce vibration; the mouth shapes it.","They determine the alphabetical spelling of a word.","They are only used during whispered speech."]},
    {id:"d2q2",prompt:"What is the difference between voiced and unvoiced sounds?",options:["Unvoiced sounds involve heavy throat friction.","Voiced sounds are strictly nasal.","Voiced sounds involve vocal cord vibration.","Unvoiced sounds can only be made with lips open."]},
    {id:"d2q3",prompt:"What category do all vowel sounds fall into?",options:["All are unvoiced.","All are voiced.","Some are voiced and some are nasal.","They do not require any vibration."]},
    {id:"d2q4",prompt:"How do you pronounce '-ed' after an unvoiced consonant?",options:["As a weak schwa sound.","As a voiced /d/ vibration.","As a sharp /t/ sound.","It remains completely silent."]},
    {id:"d2q5",prompt:"What is the rule for verbs ending in /t/ or /d/ when adding -ed?",options:["Drop the final letter entirely.","Add an 'id' (/ɪd/) syllable.","Pronounce it as a sharp /t/.","Elide the preceding vowel."]},
    {id:"d2q6",prompt:"How are adjective exceptions like 'blessed' or 'learned' pronounced?",options:["Pronounced as a single consonant cluster.","Pronounced with a full 'id' suffix as a separate syllable.","Dropping the structural ending entirely.","Converting the final sound to a nasal glide."]},
    {id:"d2q7",prompt:"How does the word 'house' differ as a noun vs. a verb in pronunciation?",options:["Noun /z/, Verb /s/.","Noun and Verb are both /s/.","Noun /s/, Verb /z/.","Noun and Verb are both /z/."]},
  ],
  // ── Day 6: Short /ɪ/ vs Long /iː/ & Word Stress ──────────────────────────
  6:[
    {id:"d6q1",prompt:"What is the main characteristic of the short /ɪ/ sound when it occurs in a stressed syllable?",options:["It should be elongated or held longer.","It increases in loudness and pitch, but remains short.","It changes into a long /iː/ sound.","It becomes completely silent."]},
    {id:"d6q2",prompt:"What does the acronym MTI stand for in language learning?",options:["Maximum Tone Intonation","Mother Tongue Interference","Multilingual Talk Interaction","Mispronounced Tongue Inflection"]},
    {id:"d6q3",prompt:"Which description accurately matches the mouth and tongue position for the short /ɪ/ sound?",options:["Smile broadly, pull the lips tight, and push the tongue forward.","Relax the mouth, drop the jaw slightly, and place the tip of the tongue against the inner side of the bottom teeth.","Open the mouth wide, round the lips into an 'O' shape, and pull the tongue all the way back.","Keep the lips tense, close the teeth completely, and flatten the tongue."]},
    {id:"d6q4",prompt:"In the word 'competition', which syllable receives the primary stress and what vowel does it contain?",options:["The first syllable ('com'), containing a long /iː/ sound.","The second syllable ('pe'), containing a short /e/ sound.","The third syllable ('ti'), containing a short /ɪ/ sound (com-pe-TI-tion).","The last syllable ('tion'), containing a schwa sound."]},
    {id:"d6q5",prompt:"Match the short /ɪ/ words with their long /iː/ minimal pair counterparts: Sit→?, Bit→?, Fit→?, Hit→?",options:["Sit-Seat, Bit-Beat, Fit-Feet, Hit-Heat","Sit-Beat, Bit-Seat, Fit-Heat, Hit-Feet","Sit-Seat, Bit-Heat, Fit-Feet, Bit-Beat","Sit-Feet, Bit-Beat, Fit-Seat, Hit-Heat"]},
    {id:"d6q6",prompt:"True or False: When stressing a syllable with a short /ɪ/ sound (like 'ambition'), you should change the vowel to a long /iː/ to make it stand out.",options:["True — you must elongate the vowel to stress it.","False — the vowel quality must remain constant even when stressed.","True — only in multi-syllable words.","False — only applies to unstressed syllables."]},
    {id:"d6q7",prompt:"Where does the final vowel sound in the word 'happy' lie?",options:["Exactly identical to the long /iː/ sound in 'feet'.","Exactly identical to the short /ɪ/ sound in 'sit'.","A unique intermediate sound falling somewhere between short /ɪ/ and long /iː/."]},
  ],
  // ── Day 7: Consonant Clusters ──────────────────────────────────────────────
  7:[
    {id:"d7q1",prompt:"What is a consonant cluster?",options:["A group of identical vowel sounds inside a word.","Consecutive consonants without an intervening vowel.","Silent segments that alter stress patterns.","Words containing only nasal sound elements."]},
    {id:"d7q2",prompt:"Which word begins with a three-consonant cluster?",options:["Problem","String","Practice","Challenge"]},
    {id:"d7q3",prompt:"What is epenthetic vowel insertion?",options:["Dropping a letter to simplify a phrase transition.","Adding an extra vowel where there should be none (e.g. 'is-tation').","Stressing the wrong internal syllable segment.","Merging matching consonants at word boundaries."]},
    {id:"d7q4",prompt:"What is the correct pronunciation sequence for 'tests'?",options:["Dropping the final sibilant sound entirely.","/t/ → /s/ → /t/ → /s/ sequence.","Replacing internal elements with a stop T.","Merging into a singular elongated sound block."]},
    {id:"d7q5",prompt:"Which word contains a four-sound consonant cluster?",options:["Contexts","Twelfths","Months","Prospects"]},
    {id:"d7q6",prompt:"What is the tip for pronouncing 'prospects' correctly?",options:["Drop the internal plosive elements completely.","Maintain a crisp sequence of all sounds.","Apply a weak schwa between consonants.","Elongate the ultimate vowel element."]},
    {id:"d7q7",prompt:"Which word has a consonant cluster at the end?",options:["Blue","Act","No","See"]},
  ],
  // ── Day 8: Word Stress ─────────────────────────────────────────────────────
  8:[
    {id:"d8q1",prompt:"What is the definition of word stress?",options:["Pronouncing every syllable at the same volume.","One syllable louder, longer, and higher in pitch than others.","A technique to speed up the delivery of words.","Reducing all unstressed syllables to silence."]},
    {id:"d8q2",prompt:"What is the typical stress pattern for two-syllable nouns?",options:["Second syllable stressed.","First syllable stressed.","Both syllables equally stressed.","Stress shifts depending on the sentence."]},
    {id:"d8q3",prompt:"Which suffix most commonly shifts stress to the syllable before it?",options:["-ness","-ful","-tion / -sion","-ly"]},
    {id:"d8q4",prompt:"Where does stress fall in words ending in '-ic' (e.g. 'academic')?",options:["Always on the first syllable.","On the syllable immediately before the '-ic' suffix.","Evenly distributed across all syllables.","On the final syllable '-ic' itself."]},
    {id:"d8q5",prompt:"What happens to vowels in unstressed syllables in English?",options:["They are always clearly and fully pronounced.","They often reduce to a schwa /ə/ sound.","They are always completely dropped.","They shift to a long vowel sound."]},
    {id:"d8q6",prompt:"What is the stress pattern for compound nouns like 'blackbird'?",options:["Equal stress on both words.","Primary stress on the second word.","Primary stress on the first word.","Stress alternates depending on context."]},
    {id:"d8q7",prompt:"Why does incorrect word stress cause more confusion than mispronounced sounds?",options:["It changes the grammatical tense of the sentence.","Listeners process rhythm and beats first; wrong stress breaks the pattern.","It eliminates all vowels from the word.","It makes words sound like a different language entirely."]},
  ],
  // ── Day 9: Verb vs Noun Syllable Stress (existing — kept as-is) ────────────
  9:[{id:"s3q1",prompt:"What general phonetic rule is shared regarding two-syllable verbs in English?",options:["Typically stressed on the first syllable.","Typically stressed on the second syllable.","Pronounced with completely silent vowels.","They do not have any syllable stress."]},{id:"s3q2",prompt:"For most two-syllable nouns and adjectives, where does syllable stress usually land?",options:["On the first syllable.","On the second syllable.","Evenly on both syllables.","It alternates depending on mood."]},{id:"s3q3",prompt:"Which word is stressed on the first syllable for both noun and verb forms?",options:["Regret","Project","Comment","Record"]},{id:"s3q4",prompt:"How does 'desert' pronunciation change from noun to verb?",options:["Noun: de-SERT, Verb: DE-Core","Noun: DE-zert, Verb: de-SERT","The noun drops the 's'.","Both are identical."]},{id:"s3q5",prompt:"What happens to the vowel in 'rebel' and 'record' when switching noun to verb?",options:["It becomes elongated.","The /ɛ/ weakens to /ɪ/ or schwa because the syllable becomes unstressed.","The first syllable becomes silent.","It changes to a nasal sound."]},{id:"s3q6",prompt:"Which word meaning 'sweet course after a meal' sounds like de-SERT?",options:["Dessert","Desert","Preference","Permit"]},{id:"s3q7",prompt:"In 'They will present the award tonight', how should 'present' be stressed?",options:["PRE-sent (noun)","pre-SENT (verb)","No stress","Both equally"]}],
  // ── Day 10: TH Sound Mechanics (existing) ──────────────────────────────────
  10:[{id:"s5q1",prompt:"What physical action makes the English 'TH' sounds correctly?",options:["Pressing tongue against soft palate.","Sticking tip of tongue between the teeth.","Curling tongue backward.","Keeping teeth tightly closed."]},{id:"s5q2",prompt:"What is the key difference between 'TH' in 'think' and 'this'?",options:["Think uses a stop; this uses continuous.","Think is unvoiced; this is voiced.","Think is British; this is American.","Think is behind teeth; this is between lips."]},{id:"s5q3",prompt:"Which grammatical categories help predict voiced/unvoiced final TH?",options:["Nouns unvoiced; verbs voiced.","Verbs unvoiced; adjectives voiced.","Nouns voiced; adjectives unvoiced.","Adjectives unvoiced; verbs voiced."]},{id:"s5q4",prompt:"What happens to the vowel in 'thank' in American English?",options:["It drops out.","It shifts toward an 'ae' sound.","It becomes long 'O'.","It becomes silent."]},{id:"s5q5",prompt:"When should 'the' be pronounced as 'thuh'?",options:["Before a vowel letter.","Before a consonant sound.","At the end of a sentence.","When adding stress."]},{id:"s5q6",prompt:"Why do we say 'thee' before 'apple' or 'orange'?",options:["Old British law.","To sound formal.","To remove an awkward linguistic jump.","They are proper nouns."]},{id:"s5q7",prompt:"When do you always use 'thee' even before a consonant?",options:["Speaking quickly.","When adding heavy stress or emphasis.","Talking to a trainer.","Never any exception."]}],
  // ── Day 11: Silent Letters (existing) ─────────────────────────────────────
  11:[{id:"s6q1",prompt:"Why does English have so many silent letters?",options:["A law made it harder for non-natives.","Pronunciation changed; spellings were frozen by printing presses.","Printers added letters to get paid more.","Silent letters only exist in American English."]},{id:"s6q2",prompt:"Which word contains a structurally silent 'W'?",options:["Window","Sword","Reward","Vow"]},{id:"s6q3",prompt:"How is 'receipt' correctly pronounced?",options:["'P' is silent.","'C' is silent, 'P' is popped.","Both 'P' and 'T' are silent.","Pronounced like 're-kept'."]},{id:"s6q4",prompt:"What rule applies to 'B' after 'M' at word end (thumb, lamb)?",options:["'B' is always pronounced.","'M' becomes silent.","'B' is almost always silent.","Combination becomes 'V'."]},{id:"s6q5",prompt:"In which word is 'D' completely silent?",options:["Decided","Wednesday","Driveway","Underneath"]},{id:"s6q6",prompt:"Which term features a structurally silent 'J'?",options:["Judge","Marijuana","Project","Rendezvous"]},{id:"s6q7",prompt:"Which consonants are virtually never silent in English?",options:["P and T","W and H","F and V","B and D"]}],
  // ── Day 12: The 3 "O" Sounds ──────────────────────────────────────────────
  12:[
    {id:"d12q1",prompt:"Which type of 'O' sound requires a distinct jaw drop where you can fit two fingers vertically between your teeth?",options:["Diphthong O","Long O","Short O","Schwa O"]},
    {id:"d12q2",prompt:"A director said 'own it' when she actually meant 'on it'. What sound should have been used for 'on it'?",options:["Diphthong O","Short O","Long O","Schwa O"]},
    {id:"d12q3",prompt:"Word pairs like 'ROT vs ROTE' and 'NOT vs NOTE' — what is the sound change from the first word to the second?",options:["Long O changing to Short O","Short O changing to Diphthong O","Diphthong O changing to Long O","Short O changing to Long O"]},
    {id:"d12q4",prompt:"Which of the following words features a Long O sound, typically found in words with an 'O + R' letter combination?",options:["Hot","Floor","Goat","Box"]},
    {id:"d12q5",prompt:"If a speaker pronounces 'Messi is the goat' as 'Messi is the god', which pronunciation error occurred?",options:["Using a Short O instead of a Diphthong O","Using a Long O instead of a Short O","Using a Diphthong O instead of a Long O","Using a Short O instead of a Long O"]},
    {id:"d12q6",prompt:"What are the starting and ending positions for the Diphthong O sound?",options:["Starting at /a/ and ending at /i/","Monophthong /ɔ/ with a steady mouth shape","Starting at /o/ and gliding into /u/","Starting at /u/ and gliding into /o/"]},
    {id:"d12q7",prompt:"Identify the option where ALL three words contain a Short O sound:",options:["Boss, Bose, Box","Hot, Not, On","Core, Bore, Door","Go, Slow, Note"]},
  ],
  // ── Day 13: Mastering the R and L Consonant Sounds ───────────────────────
  13:[
    {id:"d13q1",prompt:"Which best describes the correct tongue position for the American English R sound (/r/)?",options:["The tip of the tongue presses firmly against the back of the front teeth.","The tongue pulls back into the mouth, and the sides touch the upper back teeth without the tip touching the roof of the mouth.","The tongue rests completely flat on the bottom of the mouth.","The tip of the tongue flickers rapidly against the alveolar ridge."]},
    {id:"d13q2",prompt:"What lip shape should you form when producing the R sound?",options:["Wide and flat, like a forced smile.","Completely relaxed and hanging open.","A tight, slight circle (similar to a W sound shape) to project the sound.","A wide, vertical jaw drop."]},
    {id:"d13q3",prompt:"What is the primary physical difference between the Light L (as in 'Light') and the Dark L (as in 'Ball')?",options:["Light L uses the back of the tongue; Dark L only uses the lips.","Light L involves the tongue tip touching the alveolar ridge; Dark L relies on tension and lifting in the back of the tongue.","Light L is unvoiced; Dark L is voiced.","Light L requires a major jaw drop; Dark L requires none."]},
    {id:"d13q4",prompt:"In minimal pairs like 'LIGHT vs RIGHT', if a speaker says 'bLight' instead of 'bRight', what went wrong?",options:["They kept the tongue flat instead of raising the sides.","They dropped their jaw too much.","They mistakenly touched the tip of the tongue to the roof of the mouth instead of pulling it back.","They accidentally nasalized the vowel."]},
    {id:"d13q5",prompt:"Which of the following words features a Dark L sound?",options:["Lemon","Reply","Control","Level (the first L)"]},
    {id:"d13q6",prompt:"When R follows a vowel (as in 'Car' or 'Bird'), what must a speaker do for proper American pronunciation?",options:["Drop the R entirely and lengthen the vowel sound.","Transition smoothly from the vowel shape into the pulled-back R tongue position before the syllable ends.","Substitute a Schwa sound for the R.","Keep the tongue tip locked against the bottom teeth."]},
    {id:"d13q7",prompt:"Which option has ALL three words containing a clear initial Light L sound?",options:["Low, Long, Lip","Girl, Pearl, World","Car, Far, Star","Full, Pull, Cool"]},
  ],
  // ── Day 14: Consonant Sounds & Mechanics (existing) ───────────────────────
  14:[{id:"s1q1",prompt:"How many sounds and letters are there in English?",options:["26 sounds, 44 letters","44 sounds, 26 letters","44 sounds, 44 letters","24 sounds, 26 letters"]},{id:"s1q2",prompt:"What distinguishes voiced /b/ from unvoiced /p/?",options:["Completely different mouth position.","The /b/ is unvoiced; /p/ is voiced.","The /b/ is voiced; /p/ is unvoiced.","The /b/ cannot end a word."]},{id:"s1q3",prompt:"What is noted about /t/ and /d/ in Indian English?",options:["They are dropped at word end.","Substituted with /f/ and /v/.","A retroflex pronunciation with tongue curled back.","Pronounced as nasal sounds."]},{id:"s1q4",prompt:"Which sounds can you 'hold or retain' airflow of?",options:["/p/ and /b/","/k/ and /g/","/t/ and /d/","/f/ and /v/"]},{id:"s1q5",prompt:"Why do /m/, /n/, /ŋ/ stop working if you pinch your nose?",options:["They are aspirated.","They are nasal and need air through the nose.","They are unvoiced lip friction sounds.","They are trilled sounds."]},{id:"s1q6",prompt:"What is the difference between 'light L' and 'dark L'?",options:["Light L voiced; dark L unvoiced.","Light L before vowels; dark L pulled back at word end.","Light L native; dark L is an accent mistake.","Light L American; dark L British."]},{id:"s1q7",prompt:"What memory phrase helps with /w/ vs /v/?",options:["Bite W's, kiss V's.","Roll W's, drop V's.","Kiss W's, bite V's.","Hold W's, release V's."]}],
  // ── Day 15: British vs American (existing + new questions merged) ──────────
  15:[{id:"s7q1",prompt:"When do American speakers apply a 'Flap T' (soft D sound)?",options:["When a word starts with capital letter.","At very end of sentence.","Between two vowels or between R and a vowel.","When emphasizing in formal speech."]},{id:"s7q2",prompt:"What happens during a 'Stop T' in American English?",options:["'T' replaced by 'K'.","Mouth forms T but air is held, not released.","Speaker skips the sound.","Preceding vowel is lengthened."]},{id:"s7q3",prompt:"What happens to 'T' in identity, internet in casual American speech?",options:["Becomes 'Z'.","Gets heavily aspirated.","Goes silent after 'N'.","Word loses a syllable."]},{id:"s7q4",prompt:"What is 'Y-dropping' in American English?",options:["Dropping Y from plural nouns.","Omitting the 'yoo' /j/ glide in 'new' or 'Tuesday'.","Not pronouncing Y-starting words.","Replacing Y with F."]},{id:"s7q5",prompt:"How does 'R' differ between British and American English?",options:["British always pronounces R; American ignores it.","British R is silent unless before a vowel; American R is always pronounced.","American R only at word start.","No difference."]},{id:"s7q6",prompt:"Which pair shows American long 'I' vs British 'E'?",options:["Dance vs Dance","Hot vs Hat","Semi/Anti: British 'em-ee'/'an-tee' vs American 'sem-eye'/'an-tie'","Home vs Whom"]},{id:"s7q7",prompt:"How does 'laboratory' stress differ between dialects?",options:["British drops two syllables.","British: la-BOR-a-tory; American: LAB-ra-tory.","American adds extra O.","Identical; only tone changes."]}],
  // ── Day 16: Diphthongs ────────────────────────────────────────────────────
  16:[
    {id:"d16q1",prompt:"What is the difference between a monophthong and a diphthong?",options:["Nasal configuration vs. open oral framing.","One fixed vowel position vs. a glide between two positions.","Stressed syllable versus weak unstressed form.","Voiced element versus unvoiced burst marker."]},
    {id:"d16q2",prompt:"What does failing to transition through a diphthong cause?",options:["Rapid speech acceleration patterns.","Complete loss of sentence stress structure.","Heavy mother-tongue influence (MTI).","Automatic insertion of glottal stops."]},
    {id:"d16q3",prompt:"Which diphthong ends in the /ɪ/ sound?",options:["Go","Rain","Now","Core"]},
    {id:"d16q4",prompt:"How does 'near/here' differ between American and British English?",options:["American shifts directly to a pure schwa sound.","Both options omit rhotic influences entirely.","British uses a schwa because 'R' is silent; American uses the rhotic /r/.","British implements a hard flap T component."]},
    {id:"d16q5",prompt:"How is 'now' typically pronounced in Indian English vs. standard?",options:["Simpler /a/ sound instead of the full diphthong.","Complex dynamic glide transition tracking.","Absolute elimination of internal vowels.","Heavy elongation of nasal boundaries."]},
    {id:"d16q6",prompt:"What is the modern trend for the word 'tour'?",options:["Becoming a short monophthong sound.","Merging toward /ɔː/ so it sounds like 'tore'.","Shifting stress layout to absolute fronting.","Dropping initial consonant segments."]},
    {id:"d16q7",prompt:"Which correctly pairs the diphthongs for 'fear' vs. 'fair'?",options:["/eə/ vs. /ɪə/.","Identical in rhotic styles.","fear = /ɪə/, fair = /eə/."]},
  ],
  // ── Day 17: Strong and Weak Forms (existing) ───────────────────────────────
  17:[{id:"s2q1",prompt:"What two categories can English words be divided into for sentence rhythm?",options:["Nouns and Prepositions","Content words and Function words","British and American words","Stressed and Unstressed words"]},{id:"s2q2",prompt:"Which of these is a 'content word'?",options:["of","to","table","from"]},{id:"s2q3",prompt:"When must a function word use its strong form?",options:["At the very beginning of a sentence.","Before a proper noun.","At the very end of a sentence.","When spoken by American."]},{id:"s2q4",prompt:"Which vowel sound creates weak forms of 'to', 'at', 'for'?",options:["Long 'oo'","Short 'i'","Schwa /ə/","Long 'ay'"]},{id:"s2q5",prompt:"What is the strong-form pronunciation of 'of'?",options:["Pronounced with /v/ sound at end.","Pronounced like 'off'.","Always has silent 'o'.","Pronounced with long 'oh'."]},{id:"s2q6",prompt:"How does weak-form 'can' sound in casual speech?",options:["/kæn/","/kən/ with schwa","/kɑːnt/","/keɪn/"]},{id:"s2q7",prompt:"What happens to 'has', 'have', 'her' in their weak forms?",options:["Vowel disappears.","Trailing consonants doubled.","Initial 'H' is dropped.","Replaced with nasal sound."]}],
  // ── Day 18: Schwa & Connected Speech (existing) ────────────────────────────
  18:[{id:"s8q1",prompt:"What is the Schwa /ə/ sound?",options:["Sharp long vowel in stressed syllables.","Completely silent letter.","Relaxed neutral short vowel in unstressed syllables.","Trilled consonant at back of throat."]},{id:"s8q2",prompt:"In 'Photograph' vs 'Photography', how does the first vowel change?",options:["Stays identical.","In PHO-tograph first O is clear; in pho-TOG-raphy it weakens to schwa.","In PHO-tograph first O is schwa; in Photography it becomes 'oo'.","Stress moves to final syllable."]},{id:"s8q3",prompt:"When consonant-ending word meets vowel-starting word ('an apple'), what happens?",options:["A pause is placed between words.","Final consonant links smoothly to vowel, sounding like 'a-napple'.","Vowel at start is dropped.","Consonant is silenced."]},{id:"s8q4",prompt:"What happens when two vowels meet at a word boundary ('Go on')?",options:["A transitional glide /w/ or /j/ is inserted.","First word is dropped.","Both vowels become nasal.","A sharp glottal stop is required."]},{id:"s8q5",prompt:"Why does 'and' sound like 'n' in 'Rock and Roll'?",options:["'And' is a content word needing emphasis.","'And' is a function word weakened in connected speech.","Pronunciation mistake in American English.","'a' and 'd' cannot be together."]},{id:"s8q6",prompt:"Which syllables in 'Banana' have the schwa /ə/?",options:["Only the first","Only the middle","Both first and last","None"]},{id:"s8q7",prompt:"Why do native speakers use weak forms and linking so much?",options:["To sound formal and robotic.","To maintain natural rhythmic flow where stressed words carry the melody.","English lacks enough letters.","To confuse learners."]}],
  // ── Day 19: Sentence Rhythm & Connected Speech (existing + new) ────────────
  19:[{id:"s9q1",prompt:"What is 'Sentence Stress' in spoken English?",options:["Anxiety when reading long paragraphs.","Making every word the same length and pitch.","Giving extra volume and clarity to key words.","Shouting the final word."]},{id:"s9q2",prompt:"'I didn't steal YOUR keys' — what is implied?",options:["No keys were stolen.","The speaker stole someone else's keys.","They stole something else belonging to you.","Someone else stole your keys."]},{id:"s9q3",prompt:"What intonation is typical for Wh- questions?",options:["Rising at end.","Falling at end.","Flat monotone.","Zig-zag pitch."]},{id:"s9q4",prompt:"What pitch movement is expected at the end of a Yes/No question?",options:["Sharp drop.","Rising intonation.","Whispering last word.","No change."]},{id:"s9q5",prompt:"What are 'Thought Groups'?",options:["Silent periods for thinking.","Small phrases spoken together with a single intonation, separated by tiny pauses.","Vocabulary lists by category.","Dialects for business."]},{id:"s9q6",prompt:"What is 'catenation' in connected speech?",options:["Elision.","Assimilation.","Linking a final consonant to the next word's initial vowel.","Intrusion."]},{id:"s9q7",prompt:"In 'an apple', what happens in connected speech?",options:["Pause clearly between both components.","The /n/ moves forward and links to 'apple', sounding like 'a-napple'.","Eliminate terminal nasal tracks completely.","Introduce an explicit glottal stop buffer."]},{id:"s9q8",prompt:"What is elision in connected speech?",options:["Forcing extreme breath pressure on matching stops.","Dropping or omitting /t/ or /d/ for a smoother transition.","Adding extra vowel segments into consonant groups.","Shifting base vocal pitch to peak configurations."]},{id:"s9q9",prompt:"What creates an intrusive /w/ between words?",options:["Tongue curled backward into a retroflex posture.","Lips naturally rounded from /uː/ or /oʊ/ at the end of the previous word.","Lower teeth biting upper lip structures.","Dropping standard respiratory velocity metrics."]},{id:"s9q10",prompt:"What is a 'linking R' in British English?",options:["A silent structural marker used only for formatting.","An 'R' that is activated when the next word starts with a vowel.","Replaced entirely by an open schwa segment.","Exclusive to localized American vernaculars."]}],
  // ── Day 20: Advanced Shadowing (existing) ─────────────────────────────────
  20:[{id:"s4q1",prompt:"What psychological shift happens when you become fluent in a new language?",options:["You lose your native language ability.","Voice shifts to higher pitch.","A new language personality awakens, changing mannerisms.","Vocabulary becomes formal only."]},{id:"s4q2",prompt:"Why choose a language model of the same gender?",options:["Certain words are gender-specific.","Pitch, frequency, intonation align more easily.","Easier to find YouTube videos.","Native speakers only listen to same gender."]},{id:"s4q3",prompt:"Which is NOT a guideline for choosing a language model?",options:["Celebrity with large video presence.","Someone you admire so you don't get bored.","Native speaker with neutral accent.","Professional English teacher or professor."]},{id:"s4q4",prompt:"What is the first step of mechanical shadowing?",options:["Recording and playing back your voice.","Getting the transcript and reading it aloud first.","Memorizing the speech without text.","Setting playback speed to double."]},{id:"s4q5",prompt:"What should you focus on in the second shadowing step?",options:["Overall sentence rhythm.","Dictionary meanings.","Individual word pronunciation, syllable stress, basic sounds.","Facial expressions and gestures."]},{id:"s4q6",prompt:"What phonetic feature appears when Downey says 'about us' naturally?",options:["Flap T — 'T' between vowels sounds like soft 'D'.","Completely silent 'T'.","Heavy British glottal stop.","Retroflex T."]},{id:"s4q7",prompt:"Will you become an exact vocal copy of your language model?",options:["Yes, 100% identical after months.","No — you absorb rhythm but keep your unique vocal character.","No — native accent blocks all change.","Yes, but only with fictional characters."]}],
};
const PLACEHOLDER_QUIZ=[
  {id:"pq1",prompt:"Placeholder question 1 — replace with real content.",hint:"Hint: think back to the class recap.",options:["Option A","Option B","Option C","Option D"],answer:0},
  {id:"pq2",prompt:"Placeholder question 2 — replace with real content.",hint:"Hint: covered after the main example.",options:["Option A","Option B","Option C","Option D"],answer:1},
  {id:"pq3",prompt:"Placeholder question 3 — replace with real content.",hint:"Hint: re-watch the closing summary.",options:["Option A","Option B","Option C","Option D"],answer:2}
];

// ─── COURSE ───────────────────────────────────────────────────────────────────
const DAY_DESCRIPTIONS={
  1:"We start from zero, even with the alphabet. You'll learn which letters Indians commonly mispronounce, the two core features that make English different from Indian languages (non-phonetic + stress-timed), and your first taste of syllables using the clap technique.",
  2:"Every English word has one syllable that's louder, longer, and higher in pitch. Today you learn to identify that stressed syllable and see why getting it wrong (like \"develop\" as DE-vel-op) instantly signals MTI.",
  3:"Stress isn't random. It follows suffix rules. Today you learn how words ending in -y, -ic, -tion, and -ive shift their stress predictably, using real MTI examples from Kerala and North India.",
  4:"Image, village, and garage don't rhyme, because -age has three different pronunciations depending on the word. Today you break down the \"eij,\" \"ij,\" and French \"aazh\" patterns with a full minimal-pairs drill.",
  5:"Before tackling -ed endings, you learn the foundation: what sound actually is, and the difference between voiced and unvoiced sounds. This sets up the three -ed pronunciation rules (/t/, /d/, /ɪd/) and the 's' suffix rule.",
  6:"Tradition, competition, condition — Indian speakers often stretch the short /ɪ/ into a long \"ee\" sound. Today you fix that with mouth-position drills, minimal pairs, and penultimate stress practice.",
  7:"It's the most common vowel sound in English and lives in almost every unstressed syllable. Today you meet the schwa, the relaxed \"uh\" sound, and learn why it's key to sounding natural.",
  8:"V and W are not the same sound, though most Indian speakers merge them. Today you learn the \"bite your Vs, kiss your Ws\" mouth position rule, plus the tricky /æ/ vs /ɑː/ vowel distinction.",
  9:"Same word, two meanings, one stress shift. Project, desert, and record change meaning entirely based on which syllable you stress, noun or verb. Today you learn the rule and the exceptions.",
  10:"The hardest sound in English for non-native speakers worldwide. Today you learn the exact tongue position for both voiced and unvoiced TH, tongue twisters to lock it in, and the two pronunciations of \"the.\"",
  11:"English is full of letters you're never supposed to say. Today you go through the most common silent letters: W, P, T, B, H, D, N, S, with real words and a sentence drill to apply them naturally.",
  12:"Hot or hot, coffee or cowfee, on or own — one letter, three completely different sounds. Today you break down short O, long O, and diphthong O with mouth-position drills and tongue twisters.",
  13:"Same language, different rules. Today you compare British and American pronunciation: the four types of American T, the silent R, and vowel shifts, so you can pick one accent and stay consistent.",
  14:"The final precision pass on consonants: aspiration on T and P, the floating American R, the buzzing Z and ZH sounds, and the often-dropped Y and H.",
  15:"A focused walkthrough of four vowel sounds that trip up learners most: /e/ vs /æ/, the central /ɜː/ \"disgust\" sound, and short /ʊ/ vs long /uː/, with minimal pairs and tongue twisters for each.",
  16:"Some vowel sounds glide from one mouth position to another mid-syllable. Today you learn all 7 English diphthongs, grouped by where the glide ends, with a minimal-pairs challenge to sharpen your ear.",
  17:"English rhythm depends on shrinking unimportant words. Today you learn 11 function words (to, at, for, of, and, as, than, can, was) that switch between a strong form and a weak form depending on context.",
  18:"It's not just what you say. It's how your pitch moves. Today you learn falling intonation for statements, rising intonation for yes/no questions, and how shifting stress alone can change a sentence's entire meaning.",
  19:"Native speakers link, drop, and merge sounds between words instead of saying them one by one. Today you learn linking, elision, assimilation, and coalescence: the mechanics behind natural connected speech.",
  20:"The final mission. Today you build your own \"language model,\" a native speaker you'll shadow daily, and learn the 4-step shadowing protocol to lock in pronunciation, intonation, and natural rhythm for good.",
};
const DAY_BULLETS={
  1:["Correctly pronounce the letters of the alphabet (A, H, J, K, O, W, Z)","Understand that English is non-phonetic while Indian languages are phonetic","Learn that English is a stress-timed language","Break words into syllables using the clap technique"],
  2:["Define what a syllable is (one vowel sound per syllable)","Identify the stressed syllable in a word","Practice the Da-Da humming technique for rhythm","Apply correct stress to words like develop, hospital, computer"],
  3:["Learn the stress rule for words ending in -y (photography, economy)","Learn the stress rule for -ic endings (photographic, democratic)","Learn the stress rule for -tion endings (education, pronunciation)","Learn the stress rule for -ive endings (informative, alternative)"],
  4:["Identify when -age is pronounced \"eij\" (age, page, stage)","Identify when -age is pronounced \"ij\" (image, village, manage)","Identify when -age is pronounced \"aazh\" (mirage, montage, sabotage)","Practice minimal pairs (age/image, page/village, stage/package)"],
  5:["Understand voiced vs unvoiced sounds (b/p, d/t, z/s)","Learn when -ed is pronounced /t/ (danced, kissed, washed)","Learn when -ed is pronounced /d/ (learned, loved, lived)","Learn when -ed is pronounced /ɪd/ (wanted, needed, started)"],
  6:["Learn the correct mouth position for short /ɪ/","Practice minimal pairs (sit/seat, bit/beat, hit/heat)","Identify penultimate syllable stress in -tion words","Apply short /ɪ/ correctly in words like tradition and competition"],
  7:["Recognize the schwa sound in unstressed syllables","Learn that schwa is never stressed","Practice schwa in words like purchase, about, chocolate","Apply schwa correctly to reduce MTI by identifying it in daily words"],
  8:["Differentiate V (teeth on lip) from W (kissy lips) mouth positions","Practice minimal pairs (vine/wine, veil/whale, vest/west)","Learn the /æ/ sound in words like cat, hand, man","Learn the /ɑː/ sound in words like car, bar, arm"],
  9:["Learn that 2-syllable nouns stress the first syllable","Learn that 2-syllable verbs stress the second syllable","Practice noun-verb pairs (PROject/proJECT, REcord/reCORD)","Identify exceptions like comment and regret"],
  10:["Learn the tongue position for unvoiced TH (think, path, north)","Learn the tongue position for voiced TH (this, that, breathe)","Practice TH tongue twisters for muscle memory","Learn when to say \"thuh\" vs \"thee\" before consonants and vowels"],
  11:["Identify silent W, P, and T in words like wrong, receipt, fasten","Identify silent B and H in words like climb, honest, ghost","Identify silent D and N in words like badge, autumn, column","Apply silent letters correctly in full sentences"],
  12:["Identify short O in single-syllable words (hot, not, on)","Identify diphthong O in words (note, boat, go)","Identify long O before R (bore, door, floor)","Practice distinguishing on vs own, not vs note, cot vs coat"],
  13:["Learn the 4 American T sounds (true, flap, stop, silent)","Understand the R rule difference between British and American English","Learn key vowel shifts (path, hot, internet) between BrE and AmE","Choose one consistent accent style for your own speech"],
  14:["Learn aspiration for /t/ and /p/ at the start of stressed syllables","Master the curled, floating tongue position for American /r/","Practice the buzzing /z/ and /ʒ/ sounds (measure, decision)","Avoid dropping /j/ and /h/ sounds (tube, happy)"],
  15:["Distinguish /e/ from /æ/ (bed vs bad, men vs man)","Learn the /ɜː/ sound in bird, girl, nurse","Distinguish short /ʊ/ from long /uː/ (full vs fool, pull vs pool)","Combine all four sounds in full practice sentences"],
  16:["Learn the \"closing\" diphthongs ending in /ɪ/ (face, price, choice)","Learn the \"closing\" diphthong ending in /ʊ/ (mouth, house)","Learn the \"centering\" diphthongs ending in schwa (near, square, cure)","Practice minimal pairs (wait/white, buy/boy, fear/fair)"],
  17:["Understand the difference between content words and function words","Learn the weak forms of to, at, for, of, and, as, than, can, was","Identify when to use the strong form for emphasis","Apply weak forms in a full fluency drill sentence"],
  18:["Apply falling intonation to statements and WH-questions","Apply rising intonation to yes/no questions","Learn the \"list\" intonation pattern for multiple items","Understand contrastive stress and how it shifts meaning"],
  19:["Practice consonant-to-vowel linking","Learn intrusive sounds /j/, /w/, /r/ between vowels","Understand elision — dropped sounds in clusters (next stop → nex stop)","Practice assimilation and coalescence (want you → wanchu)"],
  20:["Choose a personal language model using the 4 selection criteria","Learn the 4-step shadowing protocol (prep, pronunciation, intonation, full shadow)","Practice shadowing a 30-second clip using the method","Complete your 20-day pronunciation transformation"],
};
// Day titles mapped to class order
const DAY_TITLES={
  1:"Foundational Phonetics",
  2:"ED Endings",
  3:"Pluralization",
  4:"Age Endings",
  5:"Short Vowels",
  6:"Short /ɪ/ vs Long /iː/ & Word Stress",
  7:"Consonant Clusters",
  8:"Word Stress",
  9:"Verb vs Noun Syllable Stress",
  10:"TH Sound Mechanics",
  11:"Silent Letters",
  12:"The 3 O Sounds",
  13:"Mastering R and L Sounds",
  14:"Consonant Sounds & Mechanics",
  15:"British vs American Accents",
  16:"Diphthongs",
  17:"Strong and Weak Forms",
  18:"Schwa & Connected Speech",
  19:"Sentence Rhythm & Intonation",
  20:"Advanced Shadowing",
};

function buildLessons(sid,sectionLabel,count,start){
  const ls=[];
  for(let i=1;i<=count;i++){
    const order=start+i-1;
    const title=DAY_TITLES[order]||sectionLabel+" "+order;
    const _imgUrl = MODULE_IMAGES[order] || null;
    ls.push({
      id:sid+"-"+i,sectionId:sid,order,
      title,
      description:DAY_DESCRIPTIONS[order]||"Placeholder description — replace with real class notes.",
      unlockDate:addDays(courseStart,order-1),dayNumber:order,
      thumbnailUrl: _imgUrl,
      gradientOverride: null
    });
  }
  return ls;
}
const SECTIONS=[
  {id:"a",title:"Accent Neutralisation",lessons:buildLessons("a","Accent Neutralisation",20,1)}
];
const ALL_LESSONS=SECTIONS.flatMap(s=>s.lessons);

// ─── QUIZZES ─────────────────────────────────────────────────────────────────
const WV_DATA=[
  {id:'f01',cat:'Common',icon:'🗣️',title:'Mispronounced Common Words',dur:'12 min',xp:80,desc:'The everyday words you\'ve been saying wrong — fixed once and for all.'},
  {id:'f02',cat:'Animals',icon:'🐾',title:'Mispronounced Animal Names',dur:'11 min',xp:80,desc:'From "jaguar" to "penguin" — animal names that trip up even confident speakers.'},
  {id:'f03',cat:'Hospital',icon:'🏥',title:'Mispronounced Hospital Words',dur:'13 min',xp:80,desc:'"Ointment", "syrup", "nausea", "ambulance" — words you use in emergencies should not come out wrong.'},
  {id:'f04',cat:'Common',icon:'🔄',title:'Mispronounced Common Words Part 2',dur:'10 min',xp:80,desc:'More high-frequency words Indians consistently mispronounce — part two of the series.'},
  {id:'f05',cat:'Media',icon:'📺',title:'Mispronounced Media-Related Words',dur:'12 min',xp:80,desc:'"controversy", "debut", "genre", "premiere" — anchor-worthy words said wrong on screen.'},
  {id:'f06',cat:'School',icon:'🏫',title:'Mispronounced School Words',dur:'13 min',xp:80,desc:'"Colonel", "Wednesday", "February" — your school textbooks taught you wrong.'},
  {id:'f07',cat:'Formal',icon:'💼',title:'Mispronounced Formal Words',dur:'14 min',xp:80,desc:'"Entrepreneur", "liaison", "entrepreneur" — boardroom and formal words that must sound right.'},
  {id:'f08',cat:'Food',icon:'🍴',title:'Mispronounced Food Words',dur:'10 min',xp:80,desc:'"Quinoa", "croissant", "bruschetta", "gyros" — food culture demands you say these right.'},
  {id:'f09',cat:'Places',icon:'🌍',title:'Mispronounced Places',dur:'11 min',xp:80,desc:'"Qatar", "Thailand", "Dubai", "Cairo" — travel without mispronouncing where you\'re going.'},
  {id:'f10',cat:'Film',icon:'🎬',title:'Mispronounced Film-Related Words',dur:'12 min',xp:80,desc:'"genre", "auteur", "cinematography" — film words that every movie lover should say right.'},
];
