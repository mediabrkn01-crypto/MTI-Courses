-- Quiz system: one private answer key, locked attempts, validated admin saves.
--
-- Audit (2026-10-19): the grader (submit-quiz) used quiz_answers, seeded once from the
-- built-in quizzes. Admin-uploaded/edited quizzes (course_config quiz_N, 16 of 20 days)
-- were never written to it, so for those days the grader held keys for DIFFERENT
-- question ids (Days 1, 2, 3, 5 → every answer marked wrong) or no keys at all
-- (other days → no score). Built-in Days 11/17/20 had no keys either.
--
-- After this migration quiz_answers is the single source of truth for every quiz a
-- student sees: question text, options, order and the correct option (index + text,
-- so reordering options can never move the key). It is private (RLS, no policies);
-- only the `quiz` Edge Function (service role) and the admin RPCs below use it.
-- course_config quiz_N keeps a copy WITHOUT answers for display only.
--
-- Safe to re-run. No existing student data is changed or deleted.

-- 1 ── quiz_answers becomes the full quiz store ─────────────────────────────────
alter table public.quiz_answers add column if not exists source       text not null default 'builtin';
alter table public.quiz_answers add column if not exists position     int;
alter table public.quiz_answers add column if not exists prompt       text;
alter table public.quiz_answers add column if not exists options      jsonb;
alter table public.quiz_answers add column if not exists hint         text;
alter table public.quiz_answers add column if not exists correct_text text;
alter table public.quiz_answers add column if not exists updated_at   timestamptz not null default now();
alter table public.quiz_answers drop constraint if exists quiz_answers_lesson_order_question_id_key;
create unique index if not exists quiz_answers_lesson_source_qid on public.quiz_answers(lesson_order, source, question_id);

-- 2 ── built-in quizzes: keys from the original quiz bank (verified identical text) ─
insert into public.quiz_answers (lesson_order, question_id, position, prompt, options, correct_index, correct_text, source)
select v.lo, v.qid, v.pos, v.prompt, v.opts, v.ci, v.ct, 'builtin' from (values
  (1,'d1q1',0,'What is the core definition of a syllable?','["A block of letters that contains a silent consonant.","A complete unit of spoken language consisting of one vowel sound.","Any combination of three letters or more.","A word that cannot be broken down into smaller pieces."]'::jsonb,1,'A complete unit of spoken language consisting of one vowel sound.'),
  (1,'d1q2',1,'How many syllables are in ''communication''?','["4","5","6","7"]'::jsonb,1,'5'),
  (1,'d1q3',2,'Why is English considered ''non-phonetic''?','["Because it uses the Cyrillic alphabet instead of Latin.","Letters are always pronounced exactly the same way.","There is no direct relationship between spelling and sound.","It lacks any complex vowel sounds."]'::jsonb,2,'There is no direct relationship between spelling and sound.'),
  (1,'d1q4',3,'How many letters vs. sounds does English have?','["44 letters; 26 sounds.","26 letters; 26 sounds.","26 letters; 44 sounds.","44 letters; 44 sounds."]'::jsonb,2,'26 letters; 44 sounds.'),
  (1,'d1q5',4,'What does throat vibration prove about a sound?','["The sound is unvoiced.","The sound is voiced.","The sound is an elongated nasal sound.","The mouth is fully open."]'::jsonb,1,'The sound is voiced.'),
  (1,'d1q6',5,'Which word has exactly three syllables?','["Communication","Beautiful","Object","Act"]'::jsonb,1,'Beautiful'),
  (1,'d1q7',6,'What is the purpose of the IPA (International Phonetic Alphabet)?','["To dictate absolute grammatical rules globally.","To provide universal, unambiguous symbols for sounds.","To replace standard English spellings in dictionaries.","To translate English words into multiple languages."]'::jsonb,1,'To provide universal, unambiguous symbols for sounds.'),
  (2,'d5q1',0,'What is the key fix for MTI (Mother Tongue Influence) with the /ɪ/ sound?','["Dropping all final short consonants.","Using a crisp /ɪ/ sound, not the long /i:/.","Elongating the unstressed suffix.","Using rising intonation structures."]'::jsonb,1,'Using a crisp /ɪ/ sound, not the long /i:/.'),
  (2,'d5q2',1,'What is the mouth position for the short /ɪ/ sound?','["Smile wide and pull back tongue tightly.","Relaxed, minimal jaw drop.","Drop jaw fully with rounded lips.","Rest tongue flat against lower teeth."]'::jsonb,1,'Relaxed, minimal jaw drop.'),
  (2,'d5q3',2,'Where does the primary stress fall in the word ''competition''?','["Initial (com-).","Secondary (pe-).","Penultimate (-ti-).","Ultimate (-on)."]'::jsonb,2,'Penultimate (-ti-).'),
  (2,'d5q4',3,'What MTI error typically occurs in the word ''ambition''?','["Reducing the target to a weak schwa.","Stretching /ɪ/ to the long /i:/.","Introducing an intrusive glide sound.","Dropping the nasal termination."]'::jsonb,1,'Stretching /ɪ/ to the long /i:/.'),
  (2,'d5q5',4,'Which word is the minimal pair example for the short /ɪ/ sound?','["Seat","Sit","Sat","Sight"]'::jsonb,1,'Sit'),
  (2,'d5q6',5,'What is the key warning when applying stress to a syllable?','["Accelerate the unstressed syllable structure.","Don''t warp the vowel quality when stressing.","Always apply extreme throat friction.","Eliminate nasal elements entirely."]'::jsonb,1,'Don''t warp the vowel quality when stressing.'),
  (2,'d5q7',6,'What makes ''happy'' phonetically unusual at the end?','["Uses a unique trilled vocalic structure.","It uses an intermediate sound between /ɪ/ and /i:/.","Features a silent terminal suffix.","Stress is placed equally on both segments."]'::jsonb,1,'It uses an intermediate sound between /ɪ/ and /i:/.'),
  (3,'d3q1',0,'How is the plural ''s'' pronounced after a voiced consonant?','["Unvoiced /s/ friction.","Voiced /z/ vibration.","Weak transitional schwa.","Completely silent glide."]'::jsonb,1,'Voiced /z/ vibration.'),
  (3,'d3q2',1,'Which word uses the unvoiced /s/ for its plural?','["Houses","Books","Uses","Pins"]'::jsonb,1,'Books'),
  (3,'d3q3',2,'How is the possessive ''s'' in ''cat''s'' pronounced?','["Voiced /z/ vibration.","Unvoiced /s/ friction.","Syllabic /ɪz/.","Complete elision."]'::jsonb,1,'Unvoiced /s/ friction.'),
  (3,'d3q4',3,'What governs the pronunciation of a final ''s''?','["The number of vowels inside the root stem.","The historical spelling of the prefix.","The preceding sound''s voicing.","The sentence stress timing rules."]'::jsonb,2,'The preceding sound''s voicing.'),
  (3,'d3q5',4,'How is ''uses'' (plural noun) pronounced?','["Voiced /z/.","Unvoiced /s/.","Weak schwa extension.","Silent termination."]'::jsonb,0,'Voiced /z/.'),
  (3,'d3q6',5,'How does ''close'' differ as an adjective vs. a verb?','["Adj /s/, Verb /z/.","Adj /z/, Verb /s/.","Both are unvoiced /s/.","Both are voiced /z/."]'::jsonb,0,'Adj /s/, Verb /z/.'),
  (3,'d3q7',6,'Which is a correctly matched voiced/unvoiced consonant pair?','["/p/ and /s/.","/f/ and /v/.","/t/ and /k/.","/m/ and /n/."]'::jsonb,1,'/f/ and /v/.'),
  (4,'d4q1',0,'How is the ''-age'' suffix pronounced in more than 90% of English words?','["/eɪdʒ/ (like the standalone word ''age'')","/ɪdʒ/ (with a short ''i'' sound)","/ɑːʒ/ (with a French ''zh'' sound)","It remains completely silent"]'::jsonb,1,'/ɪdʒ/ (with a short ''i'' sound)'),
  (4,'d4q2',1,'Under what specific condition is ''-age'' pronounced as /eɪdʒ/ (e.g. page, cage, rage)?','["When it comes immediately after a vowel sound","Only when the word originates from French","When it is part of a stressed syllable","When the word has three or more syllables"]'::jsonb,2,'When it is part of a stressed syllable'),
  (4,'d4q3',2,'Why does the word ''enrage'' maintain the /eɪdʒ/ pronunciation at the end?','["Because the stress falls on the second syllable (''-rage'')","Because the stress falls on the first syllable (''en-'')","Because it is a direct French loanword","Because it ends with a silent consonant"]'::jsonb,0,'Because the stress falls on the second syllable (''-rage'')'),
  (4,'d4q4',3,'Which word is an unstressed ''-age'' exception pronounced with the short /ɪdʒ/ sound?','["Camouflage","Mirage","Manage","Stage"]'::jsonb,2,'Manage'),
  (4,'d4q5',4,'How is ''-age'' typically pronounced in French loanwords such as ''mirage'' or ''collage''?','["/ɪdʒ/","/ɑːʒ/ (a long ''a'' sound followed by a ''zh'' sound)","/æɡ/","/eɪɡ/"]'::jsonb,1,'/ɑːʒ/ (a long ''a'' sound followed by a ''zh'' sound)'),
  (4,'d4q6',5,'What is the meaning of the French-derived word ''sillage''?','["The design or ability to blend into surroundings","The act of using spies to extract information","The trail of scent a perfume leaves behind in a room after a person has left","A deliberate act intended to destroy something"]'::jsonb,2,'The trail of scent a perfume leaves behind in a room after a person has left'),
  (4,'d4q7',6,'How does ''voyage'' change when used in ''bon voyage'' vs. standalone English?','["It stays exactly the same in both contexts","In English it ends with /ɪdʒ/ (''voy-ij''), but in the French expression it ends with /ʒ/ (''bon voy-ahzh'')","In English it ends with /ɑːʒ/, but in the French expression it ends with /ɪdʒ/","It becomes completely silent in the expression"]'::jsonb,1,'In English it ends with /ɪdʒ/ (''voy-ij''), but in the French expression it ends with /ʒ/ (''bon voy-ahzh'')'),
  (5,'d2q1',0,'What is the role of vocal cords in speech?','["They capture air from the lungs without vibrating.","They produce vibration; the mouth shapes it.","They determine the alphabetical spelling of a word.","They are only used during whispered speech."]'::jsonb,1,'They produce vibration; the mouth shapes it.'),
  (5,'d2q2',1,'What is the difference between voiced and unvoiced sounds?','["Unvoiced sounds involve heavy throat friction.","Voiced sounds are strictly nasal.","Voiced sounds involve vocal cord vibration.","Unvoiced sounds can only be made with lips open."]'::jsonb,2,'Voiced sounds involve vocal cord vibration.'),
  (5,'d2q3',2,'What category do all vowel sounds fall into?','["All are unvoiced.","All are voiced.","Some are voiced and some are nasal.","They do not require any vibration."]'::jsonb,1,'All are voiced.'),
  (5,'d2q4',3,'How do you pronounce ''-ed'' after an unvoiced consonant?','["As a weak schwa sound.","As a voiced /d/ vibration.","As a sharp /t/ sound.","It remains completely silent."]'::jsonb,2,'As a sharp /t/ sound.'),
  (5,'d2q5',4,'What is the rule for verbs ending in /t/ or /d/ when adding -ed?','["Drop the final letter entirely.","Add an ''id'' (/ɪd/) syllable.","Pronounce it as a sharp /t/.","Elide the preceding vowel."]'::jsonb,1,'Add an ''id'' (/ɪd/) syllable.'),
  (5,'d2q6',5,'How are adjective exceptions like ''blessed'' or ''learned'' pronounced?','["Pronounced as a single consonant cluster.","Pronounced with a full ''id'' suffix as a separate syllable.","Dropping the structural ending entirely.","Converting the final sound to a nasal glide."]'::jsonb,1,'Pronounced with a full ''id'' suffix as a separate syllable.'),
  (5,'d2q7',6,'How does the word ''house'' differ as a noun vs. a verb in pronunciation?','["Noun /z/, Verb /s/.","Noun and Verb are both /s/.","Noun /s/, Verb /z/.","Noun and Verb are both /z/."]'::jsonb,2,'Noun /s/, Verb /z/.'),
  (6,'d6q1',0,'What is the main characteristic of the short /ɪ/ sound when it occurs in a stressed syllable?','["It should be elongated or held longer.","It increases in loudness and pitch, but remains short.","It changes into a long /iː/ sound.","It becomes completely silent."]'::jsonb,1,'It increases in loudness and pitch, but remains short.'),
  (6,'d6q2',1,'What does the acronym MTI stand for in language learning?','["Maximum Tone Intonation","Mother Tongue Interference","Multilingual Talk Interaction","Mispronounced Tongue Inflection"]'::jsonb,1,'Mother Tongue Interference'),
  (6,'d6q3',2,'Which description accurately matches the mouth and tongue position for the short /ɪ/ sound?','["Smile broadly, pull the lips tight, and push the tongue forward.","Relax the mouth, drop the jaw slightly, and place the tip of the tongue against the inner side of the bottom teeth.","Open the mouth wide, round the lips into an ''O'' shape, and pull the tongue all the way back.","Keep the lips tense, close the teeth completely, and flatten the tongue."]'::jsonb,1,'Relax the mouth, drop the jaw slightly, and place the tip of the tongue against the inner side of the bottom teeth.'),
  (6,'d6q4',3,'In the word ''competition'', which syllable receives the primary stress and what vowel does it contain?','["The first syllable (''com''), containing a long /iː/ sound.","The second syllable (''pe''), containing a short /e/ sound.","The third syllable (''ti''), containing a short /ɪ/ sound (com-pe-TI-tion).","The last syllable (''tion''), containing a schwa sound."]'::jsonb,2,'The third syllable (''ti''), containing a short /ɪ/ sound (com-pe-TI-tion).'),
  (6,'d6q5',4,'Match the short /ɪ/ words with their long /iː/ minimal pair counterparts: Sit→?, Bit→?, Fit→?, Hit→?','["Sit-Seat, Bit-Beat, Fit-Feet, Hit-Heat","Sit-Beat, Bit-Seat, Fit-Heat, Hit-Feet","Sit-Seat, Bit-Heat, Fit-Feet, Bit-Beat","Sit-Feet, Bit-Beat, Fit-Seat, Hit-Heat"]'::jsonb,0,'Sit-Seat, Bit-Beat, Fit-Feet, Hit-Heat'),
  (6,'d6q6',5,'True or False: When stressing a syllable with a short /ɪ/ sound (like ''ambition''), you should change the vowel to a long /iː/ to make it stand out.','["True — you must elongate the vowel to stress it.","False — the vowel quality must remain constant even when stressed.","True — only in multi-syllable words.","False — only applies to unstressed syllables."]'::jsonb,1,'False — the vowel quality must remain constant even when stressed.'),
  (6,'d6q7',6,'Where does the final vowel sound in the word ''happy'' lie?','["Exactly identical to the long /iː/ sound in ''feet''.","Exactly identical to the short /ɪ/ sound in ''sit''.","A unique intermediate sound falling somewhere between short /ɪ/ and long /iː/."]'::jsonb,2,'A unique intermediate sound falling somewhere between short /ɪ/ and long /iː/.'),
  (7,'d7q1',0,'What is a consonant cluster?','["A group of identical vowel sounds inside a word.","Consecutive consonants without an intervening vowel.","Silent segments that alter stress patterns.","Words containing only nasal sound elements."]'::jsonb,1,'Consecutive consonants without an intervening vowel.'),
  (7,'d7q2',1,'Which word begins with a three-consonant cluster?','["Problem","String","Practice","Challenge"]'::jsonb,1,'String'),
  (7,'d7q3',2,'What is epenthetic vowel insertion?','["Dropping a letter to simplify a phrase transition.","Adding an extra vowel where there should be none (e.g. ''is-tation'').","Stressing the wrong internal syllable segment.","Merging matching consonants at word boundaries."]'::jsonb,1,'Adding an extra vowel where there should be none (e.g. ''is-tation'').'),
  (7,'d7q4',3,'What is the correct pronunciation sequence for ''tests''?','["Dropping the final sibilant sound entirely.","/t/ → /s/ → /t/ → /s/ sequence.","Replacing internal elements with a stop T.","Merging into a singular elongated sound block."]'::jsonb,1,'/t/ → /s/ → /t/ → /s/ sequence.'),
  (7,'d7q5',4,'Which word contains a four-sound consonant cluster?','["Contexts","Twelfths","Months","Prospects"]'::jsonb,1,'Twelfths'),
  (7,'d7q6',5,'What is the tip for pronouncing ''prospects'' correctly?','["Drop the internal plosive elements completely.","Maintain a crisp sequence of all sounds.","Apply a weak schwa between consonants.","Elongate the ultimate vowel element."]'::jsonb,1,'Maintain a crisp sequence of all sounds.'),
  (7,'d7q7',6,'Which word has a consonant cluster at the end?','["Blue","Act","No","See"]'::jsonb,1,'Act'),
  (8,'d8q1',0,'What is the definition of word stress?','["Pronouncing every syllable at the same volume.","One syllable louder, longer, and higher in pitch than others.","A technique to speed up the delivery of words.","Reducing all unstressed syllables to silence."]'::jsonb,1,'One syllable louder, longer, and higher in pitch than others.'),
  (8,'d8q2',1,'What is the typical stress pattern for two-syllable nouns?','["Second syllable stressed.","First syllable stressed.","Both syllables equally stressed.","Stress shifts depending on the sentence."]'::jsonb,1,'First syllable stressed.'),
  (8,'d8q3',2,'Which suffix most commonly shifts stress to the syllable before it?','["-ness","-ful","-tion / -sion","-ly"]'::jsonb,0,'-ness'),
  (8,'d8q4',3,'Where does stress fall in words ending in ''-ic'' (e.g. ''academic'')?','["Always on the first syllable.","On the syllable immediately before the ''-ic'' suffix.","Evenly distributed across all syllables.","On the final syllable ''-ic'' itself."]'::jsonb,1,'On the syllable immediately before the ''-ic'' suffix.'),
  (8,'d8q5',4,'What happens to vowels in unstressed syllables in English?','["They are always clearly and fully pronounced.","They often reduce to a schwa /ə/ sound.","They are always completely dropped.","They shift to a long vowel sound."]'::jsonb,1,'They often reduce to a schwa /ə/ sound.'),
  (8,'d8q6',5,'What is the stress pattern for compound nouns like ''blackbird''?','["Equal stress on both words.","Primary stress on the second word.","Primary stress on the first word.","Stress alternates depending on context."]'::jsonb,2,'Primary stress on the first word.'),
  (8,'d8q7',6,'Why does incorrect word stress cause more confusion than mispronounced sounds?','["It changes the grammatical tense of the sentence.","Listeners process rhythm and beats first; wrong stress breaks the pattern.","It eliminates all vowels from the word.","It makes words sound like a different language entirely."]'::jsonb,1,'Listeners process rhythm and beats first; wrong stress breaks the pattern.'),
  (9,'s3q1',0,'What general phonetic rule is shared regarding two-syllable verbs in English?','["Typically stressed on the first syllable.","Typically stressed on the second syllable.","Pronounced with completely silent vowels.","They do not have any syllable stress."]'::jsonb,1,'Typically stressed on the second syllable.'),
  (9,'s3q2',1,'For most two-syllable nouns and adjectives, where does syllable stress usually land?','["On the first syllable.","On the second syllable.","Evenly on both syllables.","It alternates depending on mood."]'::jsonb,0,'On the first syllable.'),
  (9,'s3q3',2,'Which word is stressed on the first syllable for both noun and verb forms?','["Regret","Project","Comment","Record"]'::jsonb,2,'Comment'),
  (9,'s3q4',3,'How does ''desert'' pronunciation change from noun to verb?','["Noun: de-SERT, Verb: DE-Core","Noun: DE-zert, Verb: de-SERT","The noun drops the ''s''.","Both are identical."]'::jsonb,1,'Noun: DE-zert, Verb: de-SERT'),
  (9,'s3q5',4,'What happens to the vowel in ''rebel'' and ''record'' when switching noun to verb?','["It becomes elongated.","The /ɛ/ weakens to /ɪ/ or schwa because the syllable becomes unstressed.","The first syllable becomes silent.","It changes to a nasal sound."]'::jsonb,1,'The /ɛ/ weakens to /ɪ/ or schwa because the syllable becomes unstressed.'),
  (9,'s3q6',5,'Which word meaning ''sweet course after a meal'' sounds like de-SERT?','["Dessert","Desert","Preference","Permit"]'::jsonb,0,'Dessert'),
  (9,'s3q7',6,'In ''They will present the award tonight'', how should ''present'' be stressed?','["PRE-sent (noun)","pre-SENT (verb)","No stress","Both equally"]'::jsonb,1,'pre-SENT (verb)'),
  (10,'s5q1',0,'What physical action makes the English ''TH'' sounds correctly?','["Pressing tongue against soft palate.","Sticking tip of tongue between the teeth.","Curling tongue backward.","Keeping teeth tightly closed."]'::jsonb,1,'Sticking tip of tongue between the teeth.'),
  (10,'s5q2',1,'What is the key difference between ''TH'' in ''think'' and ''this''?','["Think uses a stop; this uses continuous.","Think is unvoiced; this is voiced.","Think is British; this is American.","Think is behind teeth; this is between lips."]'::jsonb,1,'Think is unvoiced; this is voiced.'),
  (10,'s5q3',2,'Which grammatical categories help predict voiced/unvoiced final TH?','["Nouns unvoiced; verbs voiced.","Verbs unvoiced; adjectives voiced.","Nouns voiced; adjectives unvoiced.","Adjectives unvoiced; verbs voiced."]'::jsonb,0,'Nouns unvoiced; verbs voiced.'),
  (10,'s5q4',3,'What happens to the vowel in ''thank'' in American English?','["It drops out.","It shifts toward an ''ae'' sound.","It becomes long ''O''.","It becomes silent."]'::jsonb,1,'It shifts toward an ''ae'' sound.'),
  (10,'s5q5',4,'When should ''the'' be pronounced as ''thuh''?','["Before a vowel letter.","Before a consonant sound.","At the end of a sentence.","When adding stress."]'::jsonb,1,'Before a consonant sound.'),
  (10,'s5q6',5,'Why do we say ''thee'' before ''apple'' or ''orange''?','["Old British law.","To sound formal.","To remove an awkward linguistic jump.","They are proper nouns."]'::jsonb,2,'To remove an awkward linguistic jump.'),
  (10,'s5q7',6,'When do you always use ''thee'' even before a consonant?','["Speaking quickly.","When adding heavy stress or emphasis.","Talking to a trainer.","Never any exception."]'::jsonb,1,'When adding heavy stress or emphasis.'),
  (11,'s6q1',0,'Why does English have so many silent letters?','["A law made it harder for non-natives.","Pronunciation changed; spellings were frozen by printing presses.","Printers added letters to get paid more.","Silent letters only exist in American English."]'::jsonb,1,'Pronunciation changed; spellings were frozen by printing presses.'),
  (11,'s6q2',1,'Which word contains a structurally silent ''W''?','["Window","Sword","Reward","Vow"]'::jsonb,1,'Sword'),
  (11,'s6q3',2,'How is ''receipt'' correctly pronounced?','["''P'' is silent.","''C'' is silent, ''P'' is popped.","Both ''P'' and ''T'' are silent.","Pronounced like ''re-kept''."]'::jsonb,0,'''P'' is silent.'),
  (11,'s6q4',3,'What rule applies to ''B'' after ''M'' at word end (thumb, lamb)?','["''B'' is always pronounced.","''M'' becomes silent.","''B'' is almost always silent.","Combination becomes ''V''."]'::jsonb,2,'''B'' is almost always silent.'),
  (11,'s6q5',4,'In which word is ''D'' completely silent?','["Decided","Wednesday","Driveway","Underneath"]'::jsonb,1,'Wednesday'),
  (11,'s6q6',5,'Which term features a structurally silent ''J''?','["Judge","Marijuana","Project","Rendezvous"]'::jsonb,1,'Marijuana'),
  (11,'s6q7',6,'Which consonants are virtually never silent in English?','["P and T","W and H","F and V","B and D"]'::jsonb,2,'F and V'),
  (12,'d12q1',0,'Which type of ''O'' sound requires a distinct jaw drop where you can fit two fingers vertically between your teeth?','["Diphthong O","Long O","Short O","Schwa O"]'::jsonb,2,'Short O'),
  (12,'d12q2',1,'A director said ''own it'' when she actually meant ''on it''. What sound should have been used for ''on it''?','["Diphthong O","Short O","Long O","Schwa O"]'::jsonb,1,'Short O'),
  (12,'d12q3',2,'Word pairs like ''ROT vs ROTE'' and ''NOT vs NOTE'' — what is the sound change from the first word to the second?','["Long O changing to Short O","Short O changing to Diphthong O","Diphthong O changing to Long O","Short O changing to Long O"]'::jsonb,1,'Short O changing to Diphthong O'),
  (12,'d12q4',3,'Which of the following words features a Long O sound, typically found in words with an ''O + R'' letter combination?','["Hot","Floor","Goat","Box"]'::jsonb,1,'Floor'),
  (12,'d12q5',4,'If a speaker pronounces ''Messi is the goat'' as ''Messi is the god'', which pronunciation error occurred?','["Using a Short O instead of a Diphthong O","Using a Long O instead of a Short O","Using a Diphthong O instead of a Long O","Using a Short O instead of a Long O"]'::jsonb,0,'Using a Short O instead of a Diphthong O'),
  (12,'d12q6',5,'What are the starting and ending positions for the Diphthong O sound?','["Starting at /a/ and ending at /i/","Monophthong /ɔ/ with a steady mouth shape","Starting at /o/ and gliding into /u/","Starting at /u/ and gliding into /o/"]'::jsonb,2,'Starting at /o/ and gliding into /u/'),
  (12,'d12q7',6,'Identify the option where ALL three words contain a Short O sound:','["Boss, Bose, Box","Hot, Not, On","Core, Bore, Door","Go, Slow, Note"]'::jsonb,1,'Hot, Not, On'),
  (13,'d13q1',0,'Which best describes the correct tongue position for the American English R sound (/r/)?','["The tip of the tongue presses firmly against the back of the front teeth.","The tongue pulls back into the mouth, and the sides touch the upper back teeth without the tip touching the roof of the mouth.","The tongue rests completely flat on the bottom of the mouth.","The tip of the tongue flickers rapidly against the alveolar ridge."]'::jsonb,1,'The tongue pulls back into the mouth, and the sides touch the upper back teeth without the tip touching the roof of the mouth.'),
  (13,'d13q2',1,'What lip shape should you form when producing the R sound?','["Wide and flat, like a forced smile.","Completely relaxed and hanging open.","A tight, slight circle (similar to a W sound shape) to project the sound.","A wide, vertical jaw drop."]'::jsonb,2,'A tight, slight circle (similar to a W sound shape) to project the sound.'),
  (13,'d13q3',2,'What is the primary physical difference between the Light L (as in ''Light'') and the Dark L (as in ''Ball'')?','["Light L uses the back of the tongue; Dark L only uses the lips.","Light L involves the tongue tip touching the alveolar ridge; Dark L relies on tension and lifting in the back of the tongue.","Light L is unvoiced; Dark L is voiced.","Light L requires a major jaw drop; Dark L requires none."]'::jsonb,1,'Light L involves the tongue tip touching the alveolar ridge; Dark L relies on tension and lifting in the back of the tongue.'),
  (13,'d13q4',3,'In minimal pairs like ''LIGHT vs RIGHT'', if a speaker says ''bLight'' instead of ''bRight'', what went wrong?','["They kept the tongue flat instead of raising the sides.","They dropped their jaw too much.","They mistakenly touched the tip of the tongue to the roof of the mouth instead of pulling it back.","They accidentally nasalized the vowel."]'::jsonb,2,'They mistakenly touched the tip of the tongue to the roof of the mouth instead of pulling it back.'),
  (13,'d13q5',4,'Which of the following words features a Dark L sound?','["Lemon","Reply","Control","Level (the first L)"]'::jsonb,2,'Control'),
  (13,'d13q6',5,'When R follows a vowel (as in ''Car'' or ''Bird''), what must a speaker do for proper American pronunciation?','["Drop the R entirely and lengthen the vowel sound.","Transition smoothly from the vowel shape into the pulled-back R tongue position before the syllable ends.","Substitute a Schwa sound for the R.","Keep the tongue tip locked against the bottom teeth."]'::jsonb,1,'Transition smoothly from the vowel shape into the pulled-back R tongue position before the syllable ends.'),
  (13,'d13q7',6,'Which option has ALL three words containing a clear initial Light L sound?','["Low, Long, Lip","Girl, Pearl, World","Car, Far, Star","Full, Pull, Cool"]'::jsonb,0,'Low, Long, Lip'),
  (14,'s1q1',0,'How many sounds and letters are there in English?','["26 sounds, 44 letters","44 sounds, 26 letters","44 sounds, 44 letters","24 sounds, 26 letters"]'::jsonb,1,'44 sounds, 26 letters'),
  (14,'s1q2',1,'What distinguishes voiced /b/ from unvoiced /p/?','["Completely different mouth position.","The /b/ is unvoiced; /p/ is voiced.","The /b/ is voiced; /p/ is unvoiced.","The /b/ cannot end a word."]'::jsonb,2,'The /b/ is voiced; /p/ is unvoiced.'),
  (14,'s1q3',2,'What is noted about /t/ and /d/ in Indian English?','["They are dropped at word end.","Substituted with /f/ and /v/.","A retroflex pronunciation with tongue curled back.","Pronounced as nasal sounds."]'::jsonb,2,'A retroflex pronunciation with tongue curled back.'),
  (14,'s1q4',3,'Which sounds can you ''hold or retain'' airflow of?','["/p/ and /b/","/k/ and /g/","/t/ and /d/","/f/ and /v/"]'::jsonb,3,'/f/ and /v/'),
  (14,'s1q5',4,'Why do /m/, /n/, /ŋ/ stop working if you pinch your nose?','["They are aspirated.","They are nasal and need air through the nose.","They are unvoiced lip friction sounds.","They are trilled sounds."]'::jsonb,1,'They are nasal and need air through the nose.'),
  (14,'s1q6',5,'What is the difference between ''light L'' and ''dark L''?','["Light L voiced; dark L unvoiced.","Light L before vowels; dark L pulled back at word end.","Light L native; dark L is an accent mistake.","Light L American; dark L British."]'::jsonb,1,'Light L before vowels; dark L pulled back at word end.'),
  (14,'s1q7',6,'What memory phrase helps with /w/ vs /v/?','["Bite W''s, kiss V''s.","Roll W''s, drop V''s.","Kiss W''s, bite V''s.","Hold W''s, release V''s."]'::jsonb,2,'Kiss W''s, bite V''s.'),
  (15,'s7q1',0,'When do American speakers apply a ''Flap T'' (soft D sound)?','["When a word starts with capital letter.","At very end of sentence.","Between two vowels or between R and a vowel.","When emphasizing in formal speech."]'::jsonb,2,'Between two vowels or between R and a vowel.'),
  (15,'s7q2',1,'What happens during a ''Stop T'' in American English?','["''T'' replaced by ''K''.","Mouth forms T but air is held, not released.","Speaker skips the sound.","Preceding vowel is lengthened."]'::jsonb,1,'Mouth forms T but air is held, not released.'),
  (15,'s7q3',2,'What happens to ''T'' in identity, internet in casual American speech?','["Becomes ''Z''.","Gets heavily aspirated.","Goes silent after ''N''.","Word loses a syllable."]'::jsonb,2,'Goes silent after ''N''.'),
  (15,'s7q4',3,'What is ''Y-dropping'' in American English?','["Dropping Y from plural nouns.","Omitting the ''yoo'' /j/ glide in ''new'' or ''Tuesday''.","Not pronouncing Y-starting words.","Replacing Y with F."]'::jsonb,1,'Omitting the ''yoo'' /j/ glide in ''new'' or ''Tuesday''.'),
  (15,'s7q5',4,'How does ''R'' differ between British and American English?','["British always pronounces R; American ignores it.","British R is silent unless before a vowel; American R is always pronounced.","American R only at word start.","No difference."]'::jsonb,1,'British R is silent unless before a vowel; American R is always pronounced.'),
  (15,'s7q6',5,'Which pair shows American long ''I'' vs British ''E''?','["Dance vs Dance","Hot vs Hat","Semi/Anti: British ''em-ee''/''an-tee'' vs American ''sem-eye''/''an-tie''","Home vs Whom"]'::jsonb,2,'Semi/Anti: British ''em-ee''/''an-tee'' vs American ''sem-eye''/''an-tie'''),
  (15,'s7q7',6,'How does ''laboratory'' stress differ between dialects?','["British drops two syllables.","British: la-BOR-a-tory; American: LAB-ra-tory.","American adds extra O.","Identical; only tone changes."]'::jsonb,1,'British: la-BOR-a-tory; American: LAB-ra-tory.'),
  (16,'d16q1',0,'What is the difference between a monophthong and a diphthong?','["Nasal configuration vs. open oral framing.","One fixed vowel position vs. a glide between two positions.","Stressed syllable versus weak unstressed form.","Voiced element versus unvoiced burst marker."]'::jsonb,1,'One fixed vowel position vs. a glide between two positions.'),
  (16,'d16q2',1,'What does failing to transition through a diphthong cause?','["Rapid speech acceleration patterns.","Complete loss of sentence stress structure.","Heavy mother-tongue influence (MTI).","Automatic insertion of glottal stops."]'::jsonb,2,'Heavy mother-tongue influence (MTI).'),
  (16,'d16q3',2,'Which diphthong ends in the /ɪ/ sound?','["Go","Rain","Now","Core"]'::jsonb,1,'Rain'),
  (16,'d16q4',3,'How does ''near/here'' differ between American and British English?','["American shifts directly to a pure schwa sound.","Both options omit rhotic influences entirely.","British uses a schwa because ''R'' is silent; American uses the rhotic /r/.","British implements a hard flap T component."]'::jsonb,2,'British uses a schwa because ''R'' is silent; American uses the rhotic /r/.'),
  (16,'d16q5',4,'How is ''now'' typically pronounced in Indian English vs. standard?','["Simpler /a/ sound instead of the full diphthong.","Complex dynamic glide transition tracking.","Absolute elimination of internal vowels.","Heavy elongation of nasal boundaries."]'::jsonb,0,'Simpler /a/ sound instead of the full diphthong.'),
  (16,'d16q6',5,'What is the modern trend for the word ''tour''?','["Becoming a short monophthong sound.","Merging toward /ɔː/ so it sounds like ''tore''.","Shifting stress layout to absolute fronting.","Dropping initial consonant segments."]'::jsonb,1,'Merging toward /ɔː/ so it sounds like ''tore''.'),
  (16,'d16q7',6,'Which correctly pairs the diphthongs for ''fear'' vs. ''fair''?','["/eə/ vs. /ɪə/.","Identical in rhotic styles.","fear = /ɪə/, fair = /eə/."]'::jsonb,2,'fear = /ɪə/, fair = /eə/.'),
  (17,'s2q1',0,'What two categories can English words be divided into for sentence rhythm?','["Nouns and Prepositions","Content words and Function words","British and American words","Stressed and Unstressed words"]'::jsonb,1,'Content words and Function words'),
  (17,'s2q2',1,'Which of these is a ''content word''?','["of","to","table","from"]'::jsonb,2,'table'),
  (17,'s2q3',2,'When must a function word use its strong form?','["At the very beginning of a sentence.","Before a proper noun.","At the very end of a sentence.","When spoken by American."]'::jsonb,2,'At the very end of a sentence.'),
  (17,'s2q4',3,'Which vowel sound creates weak forms of ''to'', ''at'', ''for''?','["Long ''oo''","Short ''i''","Schwa /ə/","Long ''ay''"]'::jsonb,2,'Schwa /ə/'),
  (17,'s2q5',4,'What is the strong-form pronunciation of ''of''?','["Pronounced with /v/ sound at end.","Pronounced like ''off''.","Always has silent ''o''.","Pronounced with long ''oh''."]'::jsonb,0,'Pronounced with /v/ sound at end.'),
  (17,'s2q6',5,'How does weak-form ''can'' sound in casual speech?','["/kæn/","/kən/ with schwa","/kɑːnt/","/keɪn/"]'::jsonb,1,'/kən/ with schwa'),
  (17,'s2q7',6,'What happens to ''has'', ''have'', ''her'' in their weak forms?','["Vowel disappears.","Trailing consonants doubled.","Initial ''H'' is dropped.","Replaced with nasal sound."]'::jsonb,2,'Initial ''H'' is dropped.'),
  (18,'s8q1',0,'What is the Schwa /ə/ sound?','["Sharp long vowel in stressed syllables.","Completely silent letter.","Relaxed neutral short vowel in unstressed syllables.","Trilled consonant at back of throat."]'::jsonb,2,'Relaxed neutral short vowel in unstressed syllables.'),
  (18,'s8q2',1,'In ''Photograph'' vs ''Photography'', how does the first vowel change?','["Stays identical.","In PHO-tograph first O is clear; in pho-TOG-raphy it weakens to schwa.","In PHO-tograph first O is schwa; in Photography it becomes ''oo''.","Stress moves to final syllable."]'::jsonb,1,'In PHO-tograph first O is clear; in pho-TOG-raphy it weakens to schwa.'),
  (18,'s8q3',2,'When consonant-ending word meets vowel-starting word (''an apple''), what happens?','["A pause is placed between words.","Final consonant links smoothly to vowel, sounding like ''a-napple''.","Vowel at start is dropped.","Consonant is silenced."]'::jsonb,1,'Final consonant links smoothly to vowel, sounding like ''a-napple''.'),
  (18,'s8q4',3,'What happens when two vowels meet at a word boundary (''Go on'')?','["A transitional glide /w/ or /j/ is inserted.","First word is dropped.","Both vowels become nasal.","A sharp glottal stop is required."]'::jsonb,0,'A transitional glide /w/ or /j/ is inserted.'),
  (18,'s8q5',4,'Why does ''and'' sound like ''n'' in ''Rock and Roll''?','["''And'' is a content word needing emphasis.","''And'' is a function word weakened in connected speech.","Pronunciation mistake in American English.","''a'' and ''d'' cannot be together."]'::jsonb,1,'''And'' is a function word weakened in connected speech.'),
  (18,'s8q6',5,'Which syllables in ''Banana'' have the schwa /ə/?','["Only the first","Only the middle","Both first and last","None"]'::jsonb,2,'Both first and last'),
  (18,'s8q7',6,'Why do native speakers use weak forms and linking so much?','["To sound formal and robotic.","To maintain natural rhythmic flow where stressed words carry the melody.","English lacks enough letters.","To confuse learners."]'::jsonb,1,'To maintain natural rhythmic flow where stressed words carry the melody.'),
  (19,'s9q1',0,'What is ''Sentence Stress'' in spoken English?','["Anxiety when reading long paragraphs.","Making every word the same length and pitch.","Giving extra volume and clarity to key words.","Shouting the final word."]'::jsonb,2,'Giving extra volume and clarity to key words.'),
  (19,'s9q2',1,'''I didn''t steal YOUR keys'' — what is implied?','["No keys were stolen.","The speaker stole someone else''s keys.","They stole something else belonging to you.","Someone else stole your keys."]'::jsonb,1,'The speaker stole someone else''s keys.'),
  (19,'s9q3',2,'What intonation is typical for Wh- questions?','["Rising at end.","Falling at end.","Flat monotone.","Zig-zag pitch."]'::jsonb,1,'Falling at end.'),
  (19,'s9q4',3,'What pitch movement is expected at the end of a Yes/No question?','["Sharp drop.","Rising intonation.","Whispering last word.","No change."]'::jsonb,1,'Rising intonation.'),
  (19,'s9q5',4,'What are ''Thought Groups''?','["Silent periods for thinking.","Small phrases spoken together with a single intonation, separated by tiny pauses.","Vocabulary lists by category.","Dialects for business."]'::jsonb,1,'Small phrases spoken together with a single intonation, separated by tiny pauses.'),
  (19,'s9q6',5,'What is ''catenation'' in connected speech?','["Elision.","Assimilation.","Linking a final consonant to the next word''s initial vowel.","Intrusion."]'::jsonb,2,'Linking a final consonant to the next word''s initial vowel.'),
  (19,'s9q7',6,'In ''an apple'', what happens in connected speech?','["Pause clearly between both components.","The /n/ moves forward and links to ''apple'', sounding like ''a-napple''.","Eliminate terminal nasal tracks completely.","Introduce an explicit glottal stop buffer."]'::jsonb,1,'The /n/ moves forward and links to ''apple'', sounding like ''a-napple''.'),
  (19,'s9q8',7,'What is elision in connected speech?','["Forcing extreme breath pressure on matching stops.","Dropping or omitting /t/ or /d/ for a smoother transition.","Adding extra vowel segments into consonant groups.","Shifting base vocal pitch to peak configurations."]'::jsonb,1,'Dropping or omitting /t/ or /d/ for a smoother transition.'),
  (19,'s9q9',8,'What creates an intrusive /w/ between words?','["Tongue curled backward into a retroflex posture.","Lips naturally rounded from /uː/ or /oʊ/ at the end of the previous word.","Lower teeth biting upper lip structures.","Dropping standard respiratory velocity metrics."]'::jsonb,1,'Lips naturally rounded from /uː/ or /oʊ/ at the end of the previous word.'),
  (19,'s9q10',9,'What is a ''linking R'' in British English?','["A silent structural marker used only for formatting.","An ''R'' that is activated when the next word starts with a vowel.","Replaced entirely by an open schwa segment.","Exclusive to localized American vernaculars."]'::jsonb,1,'An ''R'' that is activated when the next word starts with a vowel.'),
  (20,'s4q1',0,'What psychological shift happens when you become fluent in a new language?','["You lose your native language ability.","Voice shifts to higher pitch.","A new language personality awakens, changing mannerisms.","Vocabulary becomes formal only."]'::jsonb,2,'A new language personality awakens, changing mannerisms.'),
  (20,'s4q2',1,'Why choose a language model of the same gender?','["Certain words are gender-specific.","Pitch, frequency, intonation align more easily.","Easier to find YouTube videos.","Native speakers only listen to same gender."]'::jsonb,1,'Pitch, frequency, intonation align more easily.'),
  (20,'s4q3',2,'Which is NOT a guideline for choosing a language model?','["Celebrity with large video presence.","Someone you admire so you don''t get bored.","Native speaker with neutral accent.","Professional English teacher or professor."]'::jsonb,3,'Professional English teacher or professor.'),
  (20,'s4q4',3,'What is the first step of mechanical shadowing?','["Recording and playing back your voice.","Getting the transcript and reading it aloud first.","Memorizing the speech without text.","Setting playback speed to double."]'::jsonb,1,'Getting the transcript and reading it aloud first.'),
  (20,'s4q5',4,'What should you focus on in the second shadowing step?','["Overall sentence rhythm.","Dictionary meanings.","Individual word pronunciation, syllable stress, basic sounds.","Facial expressions and gestures."]'::jsonb,2,'Individual word pronunciation, syllable stress, basic sounds.'),
  (20,'s4q6',5,'What phonetic feature appears when Downey says ''about us'' naturally?','["Flap T — ''T'' between vowels sounds like soft ''D''.","Completely silent ''T''.","Heavy British glottal stop.","Retroflex T."]'::jsonb,0,'Flap T — ''T'' between vowels sounds like soft ''D''.'),
  (20,'s4q7',6,'Will you become an exact vocal copy of your language model?','["Yes, 100% identical after months.","No — you absorb rhythm but keep your unique vocal character.","No — native accent blocks all change.","Yes, but only with fictional characters."]'::jsonb,1,'No — you absorb rhythm but keep your unique vocal character.')
) as v(lo, qid, pos, prompt, opts, ci, ct)
on conflict (lesson_order, source, question_id) do update
  set position=excluded.position, prompt=excluded.prompt, options=excluded.options,
      correct_index=excluded.correct_index, correct_text=excluded.correct_text, updated_at=now();
-- Old seed rows that match no current built-in question (e.g. lesson 5 'd2q1..3') are
-- removed — they were never shown to students and would otherwise be served blank.
delete from public.quiz_answers where source = 'builtin' and prompt is null;

-- 3 ── uploaded quizzes: copy the admin's keys out of course_config ───────────────
insert into public.quiz_answers (lesson_order, question_id, position, prompt, options, hint, correct_index, correct_text, source)
select substring(c.id from 6)::int,
       coalesce(nullif(q->>'id',''), 'q'||t.ord),
       (t.ord-1)::int,
       q->>'prompt', q->'options', q->>'hint',
       (select (o.ord-1)::int from jsonb_array_elements_text(q->'options') with ordinality o(val,ord)
         where o.val = q->>'answer' limit 1),
       q->>'answer', 'uploaded'
from public.course_config c
cross join lateral jsonb_array_elements(c.data) with ordinality t(q,ord)
where c.id ~ '^quiz_[0-9]+$' and jsonb_typeof(c.data)='array' and (q ? 'answer')
on conflict (lesson_order, source, question_id) do update
  set position=excluded.position, prompt=excluded.prompt, options=excluded.options, hint=excluded.hint,
      correct_index=excluded.correct_index, correct_text=excluded.correct_text, updated_at=now();

-- Answers no longer live in the public copy.
update public.course_config c
   set data = (select jsonb_agg(q - 'answer' order by t.ord) from jsonb_array_elements(c.data) with ordinality t(q,ord))
 where c.id ~ '^quiz_[0-9]+$' and jsonb_typeof(c.data)='array'
   and exists (select 1 from jsonb_array_elements(c.data) q where q ? 'answer');

-- 4 ── attempts: each answer is checked once and locked ───────────────────────────
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  student_id    text not null,
  auth_user_id  uuid not null,
  lesson_order  int  not null,
  source        text not null,
  questions     jsonb not null,   -- exact questions served (id, prompt, options, hint)
  answer_key    jsonb not null,   -- { qid: {index, text} } snapshot used to grade this attempt
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  score         int, total int, pct int, passed boolean
);
create index if not exists quiz_attempts_open on public.quiz_attempts(auth_user_id, lesson_order) where finished_at is null;
create table if not exists public.quiz_attempt_answers (
  attempt_id     uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id    text not null,
  selected_index int,
  selected_text  text,
  is_correct     boolean not null,
  correct_index  int,
  answered_at    timestamptz not null default now(),
  primary key (attempt_id, question_id)   -- first answer wins; cannot be changed
);
alter table public.quiz_attempts        enable row level security;
alter table public.quiz_attempt_answers enable row level security;
-- No policies: only the quiz Edge Function (service role) reads or writes these.

-- 5 ── admin RPCs (validated save / load / delete) ───────────────────────────────
create or replace function public.admin_get_quiz_key(p_lesson int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare src text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorized'; end if;
  src := case when exists(select 1 from quiz_answers where lesson_order=p_lesson and source='uploaded') then 'uploaded' else 'builtin' end;
  return jsonb_build_object('source', src, 'questions', coalesce((
    select jsonb_agg(jsonb_build_object('id',question_id,'prompt',prompt,'options',options,'hint',hint,
             'answer',correct_text,'answerIndex',correct_index) order by position, question_id)
      from quiz_answers where lesson_order=p_lesson and source=src), '[]'::jsonb));
end $$;

create or replace function public.admin_save_quiz(p_lesson int, p_questions jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare q jsonb; i int := 0; ids text[] := '{}'; qid text; opts jsonb; n int; hits int; ci int; norm text[];
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorized'; end if;
  if p_lesson is null or p_lesson < 1 then raise exception 'Invalid day'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then raise exception 'Add at least one question'; end if;
  -- validate everything before writing anything
  for q in select value from jsonb_array_elements(p_questions) loop
    i := i + 1;
    qid := coalesce(nullif(trim(q->>'id'),''), 'q'||i);
    if qid = any(ids) then raise exception 'Question %: duplicate question id "%"', i, qid; end if;
    ids := ids || qid;
    if coalesce(trim(q->>'prompt'),'') = '' then raise exception 'Question %: the question text is empty', i; end if;
    opts := q->'options';
    if jsonb_typeof(opts) <> 'array' or jsonb_array_length(opts) < 2 then raise exception 'Question %: needs at least 2 options', i; end if;
    if exists(select 1 from jsonb_array_elements_text(opts) o where trim(o) = '') then raise exception 'Question %: an option is empty', i; end if;
    select array_agg(lower(regexp_replace(trim(o),'\s+',' ','g'))) into norm from jsonb_array_elements_text(opts) o;
    if (select count(distinct x) from unnest(norm) x) <> array_length(norm,1) then raise exception 'Question %: two options have the same text', i; end if;
    select count(*) into hits from jsonb_array_elements_text(opts) o where o = q->>'answer';
    if hits <> 1 then raise exception 'Question %: mark exactly one correct option', i; end if;
  end loop;
  -- write: answer key (private) + display copy without answers (public)
  delete from quiz_answers where lesson_order = p_lesson and source = 'uploaded';
  i := 0;
  for q in select value from jsonb_array_elements(p_questions) loop
    i := i + 1;
    qid := coalesce(nullif(trim(q->>'id'),''), 'q'||i);
    select (o.ord-1)::int into ci from jsonb_array_elements_text(q->'options') with ordinality o(val,ord) where o.val = q->>'answer' limit 1;
    insert into quiz_answers(lesson_order, question_id, position, prompt, options, hint, correct_index, correct_text, source)
    values (p_lesson, qid, i-1, trim(q->>'prompt'), q->'options', nullif(q->>'hint',''), ci, q->>'answer', 'uploaded');
  end loop;
  insert into course_config(id, data)
  values ('quiz_'||p_lesson, (select jsonb_agg(jsonb_build_object('id', coalesce(nullif(trim(x.v->>'id'),''),'q'||x.ord), 'prompt', trim(x.v->>'prompt'), 'options', x.v->'options')
                                     || case when coalesce(x.v->>'hint','')<>'' then jsonb_build_object('hint',x.v->>'hint') else '{}'::jsonb end order by x.ord)
                              from jsonb_array_elements(p_questions) with ordinality x(v,ord)))
  on conflict (id) do update set data = excluded.data;
  return i;
end $$;

create or replace function public.admin_delete_quiz(p_lesson int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorized'; end if;
  delete from quiz_answers where lesson_order = p_lesson and source = 'uploaded';
  delete from course_config where id = 'quiz_'||p_lesson;
end $$;

revoke all on function public.admin_get_quiz_key(int)        from public, anon;
revoke all on function public.admin_save_quiz(int, jsonb)    from public, anon;
revoke all on function public.admin_delete_quiz(int)         from public, anon;
grant execute on function public.admin_get_quiz_key(int)     to authenticated;
grant execute on function public.admin_save_quiz(int, jsonb) to authenticated;
grant execute on function public.admin_delete_quiz(int)      to authenticated;
