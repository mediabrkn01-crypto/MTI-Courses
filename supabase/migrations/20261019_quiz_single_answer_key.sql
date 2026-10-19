-- Quiz system: one private answer key, locked attempts, validated admin saves.
--
-- Audit (2026-10-19): the grader (submit-quiz) used quiz_answers, seeded once from the
-- built-in quizzes. Admin-uploaded/edited quizzes (course_config quiz_N, 16 of 20 days)
-- were never written to it, so for those days the grader held keys for DIFFERENT
-- question ids (Days 1, 2, 3, 5 -> every answer marked wrong) or no keys at all
-- (other days -> no score). Built-in Days 11/17/20 had no keys either.
--
-- After this migration quiz_answers is the single source of truth for every quiz a
-- student sees: question text, options, order and the correct option (index + text,
-- so reordering options can never move the key). It is private (RLS, no policies);
-- only the `quiz` Edge Function (service role) and the admin RPCs below use it.
-- course_config quiz_N keeps a copy WITHOUT answers for display only.
--
-- Safe to re-run. No existing student data is changed or deleted.

-- 1 -- quiz_answers becomes the full quiz store --
alter table public.quiz_answers add column if not exists source       text not null default 'builtin';
alter table public.quiz_answers add column if not exists position     int;
alter table public.quiz_answers add column if not exists prompt       text;
alter table public.quiz_answers add column if not exists options      jsonb;
alter table public.quiz_answers add column if not exists hint         text;
alter table public.quiz_answers add column if not exists correct_text text;
alter table public.quiz_answers add column if not exists updated_at   timestamptz not null default now();
alter table public.quiz_answers drop constraint if exists quiz_answers_lesson_order_question_id_key;
create unique index if not exists quiz_answers_lesson_source_qid on public.quiz_answers(lesson_order, source, question_id);

-- 2 -- built-in quizzes: keys from the original quiz bank (verified identical text) --
insert into public.quiz_answers (lesson_order, question_id, position, prompt, options, correct_index, correct_text, source)
select (r->>'lo')::int, r->>'qid', (r->>'pos')::int, r->>'prompt', r->'opts', (r->>'ci')::int, r->>'ct', 'builtin'
from jsonb_array_elements($seed$[
  {"lo":1,"qid":"d1q1","pos":0,"prompt":"What is the core definition of a syllable?","opts":["A block of letters that contains a silent consonant.","A complete unit of spoken language consisting of one vowel sound.","Any combination of three letters or more.","A word that cannot be broken down into smaller pieces."],"ci":1,"ct":"A complete unit of spoken language consisting of one vowel sound."},
  {"lo":1,"qid":"d1q2","pos":1,"prompt":"How many syllables are in 'communication'?","opts":["4","5","6","7"],"ci":1,"ct":"5"},
  {"lo":1,"qid":"d1q3","pos":2,"prompt":"Why is English considered 'non-phonetic'?","opts":["Because it uses the Cyrillic alphabet instead of Latin.","Letters are always pronounced exactly the same way.","There is no direct relationship between spelling and sound.","It lacks any complex vowel sounds."],"ci":2,"ct":"There is no direct relationship between spelling and sound."},
  {"lo":1,"qid":"d1q4","pos":3,"prompt":"How many letters vs. sounds does English have?","opts":["44 letters; 26 sounds.","26 letters; 26 sounds.","26 letters; 44 sounds.","44 letters; 44 sounds."],"ci":2,"ct":"26 letters; 44 sounds."},
  {"lo":1,"qid":"d1q5","pos":4,"prompt":"What does throat vibration prove about a sound?","opts":["The sound is unvoiced.","The sound is voiced.","The sound is an elongated nasal sound.","The mouth is fully open."],"ci":1,"ct":"The sound is voiced."},
  {"lo":1,"qid":"d1q6","pos":5,"prompt":"Which word has exactly three syllables?","opts":["Communication","Beautiful","Object","Act"],"ci":1,"ct":"Beautiful"},
  {"lo":1,"qid":"d1q7","pos":6,"prompt":"What is the purpose of the IPA (International Phonetic Alphabet)?","opts":["To dictate absolute grammatical rules globally.","To provide universal, unambiguous symbols for sounds.","To replace standard English spellings in dictionaries.","To translate English words into multiple languages."],"ci":1,"ct":"To provide universal, unambiguous symbols for sounds."},
  {"lo":2,"qid":"d5q1","pos":0,"prompt":"What is the key fix for MTI (Mother Tongue Influence) with the /\u026a/ sound?","opts":["Dropping all final short consonants.","Using a crisp /\u026a/ sound, not the long /i:/.","Elongating the unstressed suffix.","Using rising intonation structures."],"ci":1,"ct":"Using a crisp /\u026a/ sound, not the long /i:/."},
  {"lo":2,"qid":"d5q2","pos":1,"prompt":"What is the mouth position for the short /\u026a/ sound?","opts":["Smile wide and pull back tongue tightly.","Relaxed, minimal jaw drop.","Drop jaw fully with rounded lips.","Rest tongue flat against lower teeth."],"ci":1,"ct":"Relaxed, minimal jaw drop."},
  {"lo":2,"qid":"d5q3","pos":2,"prompt":"Where does the primary stress fall in the word 'competition'?","opts":["Initial (com-).","Secondary (pe-).","Penultimate (-ti-).","Ultimate (-on)."],"ci":2,"ct":"Penultimate (-ti-)."},
  {"lo":2,"qid":"d5q4","pos":3,"prompt":"What MTI error typically occurs in the word 'ambition'?","opts":["Reducing the target to a weak schwa.","Stretching /\u026a/ to the long /i:/.","Introducing an intrusive glide sound.","Dropping the nasal termination."],"ci":1,"ct":"Stretching /\u026a/ to the long /i:/."},
  {"lo":2,"qid":"d5q5","pos":4,"prompt":"Which word is the minimal pair example for the short /\u026a/ sound?","opts":["Seat","Sit","Sat","Sight"],"ci":1,"ct":"Sit"},
  {"lo":2,"qid":"d5q6","pos":5,"prompt":"What is the key warning when applying stress to a syllable?","opts":["Accelerate the unstressed syllable structure.","Don't warp the vowel quality when stressing.","Always apply extreme throat friction.","Eliminate nasal elements entirely."],"ci":1,"ct":"Don't warp the vowel quality when stressing."},
  {"lo":2,"qid":"d5q7","pos":6,"prompt":"What makes 'happy' phonetically unusual at the end?","opts":["Uses a unique trilled vocalic structure.","It uses an intermediate sound between /\u026a/ and /i:/.","Features a silent terminal suffix.","Stress is placed equally on both segments."],"ci":1,"ct":"It uses an intermediate sound between /\u026a/ and /i:/."},
  {"lo":3,"qid":"d3q1","pos":0,"prompt":"How is the plural 's' pronounced after a voiced consonant?","opts":["Unvoiced /s/ friction.","Voiced /z/ vibration.","Weak transitional schwa.","Completely silent glide."],"ci":1,"ct":"Voiced /z/ vibration."},
  {"lo":3,"qid":"d3q2","pos":1,"prompt":"Which word uses the unvoiced /s/ for its plural?","opts":["Houses","Books","Uses","Pins"],"ci":1,"ct":"Books"},
  {"lo":3,"qid":"d3q3","pos":2,"prompt":"How is the possessive 's' in 'cat's' pronounced?","opts":["Voiced /z/ vibration.","Unvoiced /s/ friction.","Syllabic /\u026az/.","Complete elision."],"ci":1,"ct":"Unvoiced /s/ friction."},
  {"lo":3,"qid":"d3q4","pos":3,"prompt":"What governs the pronunciation of a final 's'?","opts":["The number of vowels inside the root stem.","The historical spelling of the prefix.","The preceding sound's voicing.","The sentence stress timing rules."],"ci":2,"ct":"The preceding sound's voicing."},
  {"lo":3,"qid":"d3q5","pos":4,"prompt":"How is 'uses' (plural noun) pronounced?","opts":["Voiced /z/.","Unvoiced /s/.","Weak schwa extension.","Silent termination."],"ci":0,"ct":"Voiced /z/."},
  {"lo":3,"qid":"d3q6","pos":5,"prompt":"How does 'close' differ as an adjective vs. a verb?","opts":["Adj /s/, Verb /z/.","Adj /z/, Verb /s/.","Both are unvoiced /s/.","Both are voiced /z/."],"ci":0,"ct":"Adj /s/, Verb /z/."},
  {"lo":3,"qid":"d3q7","pos":6,"prompt":"Which is a correctly matched voiced/unvoiced consonant pair?","opts":["/p/ and /s/.","/f/ and /v/.","/t/ and /k/.","/m/ and /n/."],"ci":1,"ct":"/f/ and /v/."},
  {"lo":4,"qid":"d4q1","pos":0,"prompt":"How is the '-age' suffix pronounced in more than 90% of English words?","opts":["/e\u026ad\u0292/ (like the standalone word 'age')","/\u026ad\u0292/ (with a short 'i' sound)","/\u0251\u02d0\u0292/ (with a French 'zh' sound)","It remains completely silent"],"ci":1,"ct":"/\u026ad\u0292/ (with a short 'i' sound)"},
  {"lo":4,"qid":"d4q2","pos":1,"prompt":"Under what specific condition is '-age' pronounced as /e\u026ad\u0292/ (e.g. page, cage, rage)?","opts":["When it comes immediately after a vowel sound","Only when the word originates from French","When it is part of a stressed syllable","When the word has three or more syllables"],"ci":2,"ct":"When it is part of a stressed syllable"},
  {"lo":4,"qid":"d4q3","pos":2,"prompt":"Why does the word 'enrage' maintain the /e\u026ad\u0292/ pronunciation at the end?","opts":["Because the stress falls on the second syllable ('-rage')","Because the stress falls on the first syllable ('en-')","Because it is a direct French loanword","Because it ends with a silent consonant"],"ci":0,"ct":"Because the stress falls on the second syllable ('-rage')"},
  {"lo":4,"qid":"d4q4","pos":3,"prompt":"Which word is an unstressed '-age' exception pronounced with the short /\u026ad\u0292/ sound?","opts":["Camouflage","Mirage","Manage","Stage"],"ci":2,"ct":"Manage"},
  {"lo":4,"qid":"d4q5","pos":4,"prompt":"How is '-age' typically pronounced in French loanwords such as 'mirage' or 'collage'?","opts":["/\u026ad\u0292/","/\u0251\u02d0\u0292/ (a long 'a' sound followed by a 'zh' sound)","/\u00e6\u0261/","/e\u026a\u0261/"],"ci":1,"ct":"/\u0251\u02d0\u0292/ (a long 'a' sound followed by a 'zh' sound)"},
  {"lo":4,"qid":"d4q6","pos":5,"prompt":"What is the meaning of the French-derived word 'sillage'?","opts":["The design or ability to blend into surroundings","The act of using spies to extract information","The trail of scent a perfume leaves behind in a room after a person has left","A deliberate act intended to destroy something"],"ci":2,"ct":"The trail of scent a perfume leaves behind in a room after a person has left"},
  {"lo":4,"qid":"d4q7","pos":6,"prompt":"How does 'voyage' change when used in 'bon voyage' vs. standalone English?","opts":["It stays exactly the same in both contexts","In English it ends with /\u026ad\u0292/ ('voy-ij'), but in the French expression it ends with /\u0292/ ('bon voy-ahzh')","In English it ends with /\u0251\u02d0\u0292/, but in the French expression it ends with /\u026ad\u0292/","It becomes completely silent in the expression"],"ci":1,"ct":"In English it ends with /\u026ad\u0292/ ('voy-ij'), but in the French expression it ends with /\u0292/ ('bon voy-ahzh')"},
  {"lo":5,"qid":"d2q1","pos":0,"prompt":"What is the role of vocal cords in speech?","opts":["They capture air from the lungs without vibrating.","They produce vibration; the mouth shapes it.","They determine the alphabetical spelling of a word.","They are only used during whispered speech."],"ci":1,"ct":"They produce vibration; the mouth shapes it."},
  {"lo":5,"qid":"d2q2","pos":1,"prompt":"What is the difference between voiced and unvoiced sounds?","opts":["Unvoiced sounds involve heavy throat friction.","Voiced sounds are strictly nasal.","Voiced sounds involve vocal cord vibration.","Unvoiced sounds can only be made with lips open."],"ci":2,"ct":"Voiced sounds involve vocal cord vibration."},
  {"lo":5,"qid":"d2q3","pos":2,"prompt":"What category do all vowel sounds fall into?","opts":["All are unvoiced.","All are voiced.","Some are voiced and some are nasal.","They do not require any vibration."],"ci":1,"ct":"All are voiced."},
  {"lo":5,"qid":"d2q4","pos":3,"prompt":"How do you pronounce '-ed' after an unvoiced consonant?","opts":["As a weak schwa sound.","As a voiced /d/ vibration.","As a sharp /t/ sound.","It remains completely silent."],"ci":2,"ct":"As a sharp /t/ sound."},
  {"lo":5,"qid":"d2q5","pos":4,"prompt":"What is the rule for verbs ending in /t/ or /d/ when adding -ed?","opts":["Drop the final letter entirely.","Add an 'id' (/\u026ad/) syllable.","Pronounce it as a sharp /t/.","Elide the preceding vowel."],"ci":1,"ct":"Add an 'id' (/\u026ad/) syllable."},
  {"lo":5,"qid":"d2q6","pos":5,"prompt":"How are adjective exceptions like 'blessed' or 'learned' pronounced?","opts":["Pronounced as a single consonant cluster.","Pronounced with a full 'id' suffix as a separate syllable.","Dropping the structural ending entirely.","Converting the final sound to a nasal glide."],"ci":1,"ct":"Pronounced with a full 'id' suffix as a separate syllable."},
  {"lo":5,"qid":"d2q7","pos":6,"prompt":"How does the word 'house' differ as a noun vs. a verb in pronunciation?","opts":["Noun /z/, Verb /s/.","Noun and Verb are both /s/.","Noun /s/, Verb /z/.","Noun and Verb are both /z/."],"ci":2,"ct":"Noun /s/, Verb /z/."},
  {"lo":6,"qid":"d6q1","pos":0,"prompt":"What is the main characteristic of the short /\u026a/ sound when it occurs in a stressed syllable?","opts":["It should be elongated or held longer.","It increases in loudness and pitch, but remains short.","It changes into a long /i\u02d0/ sound.","It becomes completely silent."],"ci":1,"ct":"It increases in loudness and pitch, but remains short."},
  {"lo":6,"qid":"d6q2","pos":1,"prompt":"What does the acronym MTI stand for in language learning?","opts":["Maximum Tone Intonation","Mother Tongue Interference","Multilingual Talk Interaction","Mispronounced Tongue Inflection"],"ci":1,"ct":"Mother Tongue Interference"},
  {"lo":6,"qid":"d6q3","pos":2,"prompt":"Which description accurately matches the mouth and tongue position for the short /\u026a/ sound?","opts":["Smile broadly, pull the lips tight, and push the tongue forward.","Relax the mouth, drop the jaw slightly, and place the tip of the tongue against the inner side of the bottom teeth.","Open the mouth wide, round the lips into an 'O' shape, and pull the tongue all the way back.","Keep the lips tense, close the teeth completely, and flatten the tongue."],"ci":1,"ct":"Relax the mouth, drop the jaw slightly, and place the tip of the tongue against the inner side of the bottom teeth."},
  {"lo":6,"qid":"d6q4","pos":3,"prompt":"In the word 'competition', which syllable receives the primary stress and what vowel does it contain?","opts":["The first syllable ('com'), containing a long /i\u02d0/ sound.","The second syllable ('pe'), containing a short /e/ sound.","The third syllable ('ti'), containing a short /\u026a/ sound (com-pe-TI-tion).","The last syllable ('tion'), containing a schwa sound."],"ci":2,"ct":"The third syllable ('ti'), containing a short /\u026a/ sound (com-pe-TI-tion)."},
  {"lo":6,"qid":"d6q5","pos":4,"prompt":"Match the short /\u026a/ words with their long /i\u02d0/ minimal pair counterparts: Sit\u2192?, Bit\u2192?, Fit\u2192?, Hit\u2192?","opts":["Sit-Seat, Bit-Beat, Fit-Feet, Hit-Heat","Sit-Beat, Bit-Seat, Fit-Heat, Hit-Feet","Sit-Seat, Bit-Heat, Fit-Feet, Bit-Beat","Sit-Feet, Bit-Beat, Fit-Seat, Hit-Heat"],"ci":0,"ct":"Sit-Seat, Bit-Beat, Fit-Feet, Hit-Heat"},
  {"lo":6,"qid":"d6q6","pos":5,"prompt":"True or False: When stressing a syllable with a short /\u026a/ sound (like 'ambition'), you should change the vowel to a long /i\u02d0/ to make it stand out.","opts":["True \u2014 you must elongate the vowel to stress it.","False \u2014 the vowel quality must remain constant even when stressed.","True \u2014 only in multi-syllable words.","False \u2014 only applies to unstressed syllables."],"ci":1,"ct":"False \u2014 the vowel quality must remain constant even when stressed."},
  {"lo":6,"qid":"d6q7","pos":6,"prompt":"Where does the final vowel sound in the word 'happy' lie?","opts":["Exactly identical to the long /i\u02d0/ sound in 'feet'.","Exactly identical to the short /\u026a/ sound in 'sit'.","A unique intermediate sound falling somewhere between short /\u026a/ and long /i\u02d0/."],"ci":2,"ct":"A unique intermediate sound falling somewhere between short /\u026a/ and long /i\u02d0/."},
  {"lo":7,"qid":"d7q1","pos":0,"prompt":"What is a consonant cluster?","opts":["A group of identical vowel sounds inside a word.","Consecutive consonants without an intervening vowel.","Silent segments that alter stress patterns.","Words containing only nasal sound elements."],"ci":1,"ct":"Consecutive consonants without an intervening vowel."},
  {"lo":7,"qid":"d7q2","pos":1,"prompt":"Which word begins with a three-consonant cluster?","opts":["Problem","String","Practice","Challenge"],"ci":1,"ct":"String"},
  {"lo":7,"qid":"d7q3","pos":2,"prompt":"What is epenthetic vowel insertion?","opts":["Dropping a letter to simplify a phrase transition.","Adding an extra vowel where there should be none (e.g. 'is-tation').","Stressing the wrong internal syllable segment.","Merging matching consonants at word boundaries."],"ci":1,"ct":"Adding an extra vowel where there should be none (e.g. 'is-tation')."},
  {"lo":7,"qid":"d7q4","pos":3,"prompt":"What is the correct pronunciation sequence for 'tests'?","opts":["Dropping the final sibilant sound entirely.","/t/ \u2192 /s/ \u2192 /t/ \u2192 /s/ sequence.","Replacing internal elements with a stop T.","Merging into a singular elongated sound block."],"ci":1,"ct":"/t/ \u2192 /s/ \u2192 /t/ \u2192 /s/ sequence."},
  {"lo":7,"qid":"d7q5","pos":4,"prompt":"Which word contains a four-sound consonant cluster?","opts":["Contexts","Twelfths","Months","Prospects"],"ci":1,"ct":"Twelfths"},
  {"lo":7,"qid":"d7q6","pos":5,"prompt":"What is the tip for pronouncing 'prospects' correctly?","opts":["Drop the internal plosive elements completely.","Maintain a crisp sequence of all sounds.","Apply a weak schwa between consonants.","Elongate the ultimate vowel element."],"ci":1,"ct":"Maintain a crisp sequence of all sounds."},
  {"lo":7,"qid":"d7q7","pos":6,"prompt":"Which word has a consonant cluster at the end?","opts":["Blue","Act","No","See"],"ci":1,"ct":"Act"},
  {"lo":8,"qid":"d8q1","pos":0,"prompt":"What is the definition of word stress?","opts":["Pronouncing every syllable at the same volume.","One syllable louder, longer, and higher in pitch than others.","A technique to speed up the delivery of words.","Reducing all unstressed syllables to silence."],"ci":1,"ct":"One syllable louder, longer, and higher in pitch than others."},
  {"lo":8,"qid":"d8q2","pos":1,"prompt":"What is the typical stress pattern for two-syllable nouns?","opts":["Second syllable stressed.","First syllable stressed.","Both syllables equally stressed.","Stress shifts depending on the sentence."],"ci":1,"ct":"First syllable stressed."},
  {"lo":8,"qid":"d8q3","pos":2,"prompt":"Which suffix most commonly shifts stress to the syllable before it?","opts":["-ness","-ful","-tion / -sion","-ly"],"ci":0,"ct":"-ness"},
  {"lo":8,"qid":"d8q4","pos":3,"prompt":"Where does stress fall in words ending in '-ic' (e.g. 'academic')?","opts":["Always on the first syllable.","On the syllable immediately before the '-ic' suffix.","Evenly distributed across all syllables.","On the final syllable '-ic' itself."],"ci":1,"ct":"On the syllable immediately before the '-ic' suffix."},
  {"lo":8,"qid":"d8q5","pos":4,"prompt":"What happens to vowels in unstressed syllables in English?","opts":["They are always clearly and fully pronounced.","They often reduce to a schwa /\u0259/ sound.","They are always completely dropped.","They shift to a long vowel sound."],"ci":1,"ct":"They often reduce to a schwa /\u0259/ sound."},
  {"lo":8,"qid":"d8q6","pos":5,"prompt":"What is the stress pattern for compound nouns like 'blackbird'?","opts":["Equal stress on both words.","Primary stress on the second word.","Primary stress on the first word.","Stress alternates depending on context."],"ci":2,"ct":"Primary stress on the first word."},
  {"lo":8,"qid":"d8q7","pos":6,"prompt":"Why does incorrect word stress cause more confusion than mispronounced sounds?","opts":["It changes the grammatical tense of the sentence.","Listeners process rhythm and beats first; wrong stress breaks the pattern.","It eliminates all vowels from the word.","It makes words sound like a different language entirely."],"ci":1,"ct":"Listeners process rhythm and beats first; wrong stress breaks the pattern."},
  {"lo":9,"qid":"s3q1","pos":0,"prompt":"What general phonetic rule is shared regarding two-syllable verbs in English?","opts":["Typically stressed on the first syllable.","Typically stressed on the second syllable.","Pronounced with completely silent vowels.","They do not have any syllable stress."],"ci":1,"ct":"Typically stressed on the second syllable."},
  {"lo":9,"qid":"s3q2","pos":1,"prompt":"For most two-syllable nouns and adjectives, where does syllable stress usually land?","opts":["On the first syllable.","On the second syllable.","Evenly on both syllables.","It alternates depending on mood."],"ci":0,"ct":"On the first syllable."},
  {"lo":9,"qid":"s3q3","pos":2,"prompt":"Which word is stressed on the first syllable for both noun and verb forms?","opts":["Regret","Project","Comment","Record"],"ci":2,"ct":"Comment"},
  {"lo":9,"qid":"s3q4","pos":3,"prompt":"How does 'desert' pronunciation change from noun to verb?","opts":["Noun: de-SERT, Verb: DE-Core","Noun: DE-zert, Verb: de-SERT","The noun drops the 's'.","Both are identical."],"ci":1,"ct":"Noun: DE-zert, Verb: de-SERT"},
  {"lo":9,"qid":"s3q5","pos":4,"prompt":"What happens to the vowel in 'rebel' and 'record' when switching noun to verb?","opts":["It becomes elongated.","The /\u025b/ weakens to /\u026a/ or schwa because the syllable becomes unstressed.","The first syllable becomes silent.","It changes to a nasal sound."],"ci":1,"ct":"The /\u025b/ weakens to /\u026a/ or schwa because the syllable becomes unstressed."},
  {"lo":9,"qid":"s3q6","pos":5,"prompt":"Which word meaning 'sweet course after a meal' sounds like de-SERT?","opts":["Dessert","Desert","Preference","Permit"],"ci":0,"ct":"Dessert"},
  {"lo":9,"qid":"s3q7","pos":6,"prompt":"In 'They will present the award tonight', how should 'present' be stressed?","opts":["PRE-sent (noun)","pre-SENT (verb)","No stress","Both equally"],"ci":1,"ct":"pre-SENT (verb)"},
  {"lo":10,"qid":"s5q1","pos":0,"prompt":"What physical action makes the English 'TH' sounds correctly?","opts":["Pressing tongue against soft palate.","Sticking tip of tongue between the teeth.","Curling tongue backward.","Keeping teeth tightly closed."],"ci":1,"ct":"Sticking tip of tongue between the teeth."},
  {"lo":10,"qid":"s5q2","pos":1,"prompt":"What is the key difference between 'TH' in 'think' and 'this'?","opts":["Think uses a stop; this uses continuous.","Think is unvoiced; this is voiced.","Think is British; this is American.","Think is behind teeth; this is between lips."],"ci":1,"ct":"Think is unvoiced; this is voiced."},
  {"lo":10,"qid":"s5q3","pos":2,"prompt":"Which grammatical categories help predict voiced/unvoiced final TH?","opts":["Nouns unvoiced; verbs voiced.","Verbs unvoiced; adjectives voiced.","Nouns voiced; adjectives unvoiced.","Adjectives unvoiced; verbs voiced."],"ci":0,"ct":"Nouns unvoiced; verbs voiced."},
  {"lo":10,"qid":"s5q4","pos":3,"prompt":"What happens to the vowel in 'thank' in American English?","opts":["It drops out.","It shifts toward an 'ae' sound.","It becomes long 'O'.","It becomes silent."],"ci":1,"ct":"It shifts toward an 'ae' sound."},
  {"lo":10,"qid":"s5q5","pos":4,"prompt":"When should 'the' be pronounced as 'thuh'?","opts":["Before a vowel letter.","Before a consonant sound.","At the end of a sentence.","When adding stress."],"ci":1,"ct":"Before a consonant sound."},
  {"lo":10,"qid":"s5q6","pos":5,"prompt":"Why do we say 'thee' before 'apple' or 'orange'?","opts":["Old British law.","To sound formal.","To remove an awkward linguistic jump.","They are proper nouns."],"ci":2,"ct":"To remove an awkward linguistic jump."},
  {"lo":10,"qid":"s5q7","pos":6,"prompt":"When do you always use 'thee' even before a consonant?","opts":["Speaking quickly.","When adding heavy stress or emphasis.","Talking to a trainer.","Never any exception."],"ci":1,"ct":"When adding heavy stress or emphasis."},
  {"lo":11,"qid":"s6q1","pos":0,"prompt":"Why does English have so many silent letters?","opts":["A law made it harder for non-natives.","Pronunciation changed; spellings were frozen by printing presses.","Printers added letters to get paid more.","Silent letters only exist in American English."],"ci":1,"ct":"Pronunciation changed; spellings were frozen by printing presses."},
  {"lo":11,"qid":"s6q2","pos":1,"prompt":"Which word contains a structurally silent 'W'?","opts":["Window","Sword","Reward","Vow"],"ci":1,"ct":"Sword"},
  {"lo":11,"qid":"s6q3","pos":2,"prompt":"How is 'receipt' correctly pronounced?","opts":["'P' is silent.","'C' is silent, 'P' is popped.","Both 'P' and 'T' are silent.","Pronounced like 're-kept'."],"ci":0,"ct":"'P' is silent."},
  {"lo":11,"qid":"s6q4","pos":3,"prompt":"What rule applies to 'B' after 'M' at word end (thumb, lamb)?","opts":["'B' is always pronounced.","'M' becomes silent.","'B' is almost always silent.","Combination becomes 'V'."],"ci":2,"ct":"'B' is almost always silent."},
  {"lo":11,"qid":"s6q5","pos":4,"prompt":"In which word is 'D' completely silent?","opts":["Decided","Wednesday","Driveway","Underneath"],"ci":1,"ct":"Wednesday"},
  {"lo":11,"qid":"s6q6","pos":5,"prompt":"Which term features a structurally silent 'J'?","opts":["Judge","Marijuana","Project","Rendezvous"],"ci":1,"ct":"Marijuana"},
  {"lo":11,"qid":"s6q7","pos":6,"prompt":"Which consonants are virtually never silent in English?","opts":["P and T","W and H","F and V","B and D"],"ci":2,"ct":"F and V"},
  {"lo":12,"qid":"d12q1","pos":0,"prompt":"Which type of 'O' sound requires a distinct jaw drop where you can fit two fingers vertically between your teeth?","opts":["Diphthong O","Long O","Short O","Schwa O"],"ci":2,"ct":"Short O"},
  {"lo":12,"qid":"d12q2","pos":1,"prompt":"A director said 'own it' when she actually meant 'on it'. What sound should have been used for 'on it'?","opts":["Diphthong O","Short O","Long O","Schwa O"],"ci":1,"ct":"Short O"},
  {"lo":12,"qid":"d12q3","pos":2,"prompt":"Word pairs like 'ROT vs ROTE' and 'NOT vs NOTE' \u2014 what is the sound change from the first word to the second?","opts":["Long O changing to Short O","Short O changing to Diphthong O","Diphthong O changing to Long O","Short O changing to Long O"],"ci":1,"ct":"Short O changing to Diphthong O"},
  {"lo":12,"qid":"d12q4","pos":3,"prompt":"Which of the following words features a Long O sound, typically found in words with an 'O + R' letter combination?","opts":["Hot","Floor","Goat","Box"],"ci":1,"ct":"Floor"},
  {"lo":12,"qid":"d12q5","pos":4,"prompt":"If a speaker pronounces 'Messi is the goat' as 'Messi is the god', which pronunciation error occurred?","opts":["Using a Short O instead of a Diphthong O","Using a Long O instead of a Short O","Using a Diphthong O instead of a Long O","Using a Short O instead of a Long O"],"ci":0,"ct":"Using a Short O instead of a Diphthong O"},
  {"lo":12,"qid":"d12q6","pos":5,"prompt":"What are the starting and ending positions for the Diphthong O sound?","opts":["Starting at /a/ and ending at /i/","Monophthong /\u0254/ with a steady mouth shape","Starting at /o/ and gliding into /u/","Starting at /u/ and gliding into /o/"],"ci":2,"ct":"Starting at /o/ and gliding into /u/"},
  {"lo":12,"qid":"d12q7","pos":6,"prompt":"Identify the option where ALL three words contain a Short O sound:","opts":["Boss, Bose, Box","Hot, Not, On","Core, Bore, Door","Go, Slow, Note"],"ci":1,"ct":"Hot, Not, On"},
  {"lo":13,"qid":"d13q1","pos":0,"prompt":"Which best describes the correct tongue position for the American English R sound (/r/)?","opts":["The tip of the tongue presses firmly against the back of the front teeth.","The tongue pulls back into the mouth, and the sides touch the upper back teeth without the tip touching the roof of the mouth.","The tongue rests completely flat on the bottom of the mouth.","The tip of the tongue flickers rapidly against the alveolar ridge."],"ci":1,"ct":"The tongue pulls back into the mouth, and the sides touch the upper back teeth without the tip touching the roof of the mouth."},
  {"lo":13,"qid":"d13q2","pos":1,"prompt":"What lip shape should you form when producing the R sound?","opts":["Wide and flat, like a forced smile.","Completely relaxed and hanging open.","A tight, slight circle (similar to a W sound shape) to project the sound.","A wide, vertical jaw drop."],"ci":2,"ct":"A tight, slight circle (similar to a W sound shape) to project the sound."},
  {"lo":13,"qid":"d13q3","pos":2,"prompt":"What is the primary physical difference between the Light L (as in 'Light') and the Dark L (as in 'Ball')?","opts":["Light L uses the back of the tongue; Dark L only uses the lips.","Light L involves the tongue tip touching the alveolar ridge; Dark L relies on tension and lifting in the back of the tongue.","Light L is unvoiced; Dark L is voiced.","Light L requires a major jaw drop; Dark L requires none."],"ci":1,"ct":"Light L involves the tongue tip touching the alveolar ridge; Dark L relies on tension and lifting in the back of the tongue."},
  {"lo":13,"qid":"d13q4","pos":3,"prompt":"In minimal pairs like 'LIGHT vs RIGHT', if a speaker says 'bLight' instead of 'bRight', what went wrong?","opts":["They kept the tongue flat instead of raising the sides.","They dropped their jaw too much.","They mistakenly touched the tip of the tongue to the roof of the mouth instead of pulling it back.","They accidentally nasalized the vowel."],"ci":2,"ct":"They mistakenly touched the tip of the tongue to the roof of the mouth instead of pulling it back."},
  {"lo":13,"qid":"d13q5","pos":4,"prompt":"Which of the following words features a Dark L sound?","opts":["Lemon","Reply","Control","Level (the first L)"],"ci":2,"ct":"Control"},
  {"lo":13,"qid":"d13q6","pos":5,"prompt":"When R follows a vowel (as in 'Car' or 'Bird'), what must a speaker do for proper American pronunciation?","opts":["Drop the R entirely and lengthen the vowel sound.","Transition smoothly from the vowel shape into the pulled-back R tongue position before the syllable ends.","Substitute a Schwa sound for the R.","Keep the tongue tip locked against the bottom teeth."],"ci":1,"ct":"Transition smoothly from the vowel shape into the pulled-back R tongue position before the syllable ends."},
  {"lo":13,"qid":"d13q7","pos":6,"prompt":"Which option has ALL three words containing a clear initial Light L sound?","opts":["Low, Long, Lip","Girl, Pearl, World","Car, Far, Star","Full, Pull, Cool"],"ci":0,"ct":"Low, Long, Lip"},
  {"lo":14,"qid":"s1q1","pos":0,"prompt":"How many sounds and letters are there in English?","opts":["26 sounds, 44 letters","44 sounds, 26 letters","44 sounds, 44 letters","24 sounds, 26 letters"],"ci":1,"ct":"44 sounds, 26 letters"},
  {"lo":14,"qid":"s1q2","pos":1,"prompt":"What distinguishes voiced /b/ from unvoiced /p/?","opts":["Completely different mouth position.","The /b/ is unvoiced; /p/ is voiced.","The /b/ is voiced; /p/ is unvoiced.","The /b/ cannot end a word."],"ci":2,"ct":"The /b/ is voiced; /p/ is unvoiced."},
  {"lo":14,"qid":"s1q3","pos":2,"prompt":"What is noted about /t/ and /d/ in Indian English?","opts":["They are dropped at word end.","Substituted with /f/ and /v/.","A retroflex pronunciation with tongue curled back.","Pronounced as nasal sounds."],"ci":2,"ct":"A retroflex pronunciation with tongue curled back."},
  {"lo":14,"qid":"s1q4","pos":3,"prompt":"Which sounds can you 'hold or retain' airflow of?","opts":["/p/ and /b/","/k/ and /g/","/t/ and /d/","/f/ and /v/"],"ci":3,"ct":"/f/ and /v/"},
  {"lo":14,"qid":"s1q5","pos":4,"prompt":"Why do /m/, /n/, /\u014b/ stop working if you pinch your nose?","opts":["They are aspirated.","They are nasal and need air through the nose.","They are unvoiced lip friction sounds.","They are trilled sounds."],"ci":1,"ct":"They are nasal and need air through the nose."},
  {"lo":14,"qid":"s1q6","pos":5,"prompt":"What is the difference between 'light L' and 'dark L'?","opts":["Light L voiced; dark L unvoiced.","Light L before vowels; dark L pulled back at word end.","Light L native; dark L is an accent mistake.","Light L American; dark L British."],"ci":1,"ct":"Light L before vowels; dark L pulled back at word end."},
  {"lo":14,"qid":"s1q7","pos":6,"prompt":"What memory phrase helps with /w/ vs /v/?","opts":["Bite W's, kiss V's.","Roll W's, drop V's.","Kiss W's, bite V's.","Hold W's, release V's."],"ci":2,"ct":"Kiss W's, bite V's."},
  {"lo":15,"qid":"s7q1","pos":0,"prompt":"When do American speakers apply a 'Flap T' (soft D sound)?","opts":["When a word starts with capital letter.","At very end of sentence.","Between two vowels or between R and a vowel.","When emphasizing in formal speech."],"ci":2,"ct":"Between two vowels or between R and a vowel."},
  {"lo":15,"qid":"s7q2","pos":1,"prompt":"What happens during a 'Stop T' in American English?","opts":["'T' replaced by 'K'.","Mouth forms T but air is held, not released.","Speaker skips the sound.","Preceding vowel is lengthened."],"ci":1,"ct":"Mouth forms T but air is held, not released."},
  {"lo":15,"qid":"s7q3","pos":2,"prompt":"What happens to 'T' in identity, internet in casual American speech?","opts":["Becomes 'Z'.","Gets heavily aspirated.","Goes silent after 'N'.","Word loses a syllable."],"ci":2,"ct":"Goes silent after 'N'."},
  {"lo":15,"qid":"s7q4","pos":3,"prompt":"What is 'Y-dropping' in American English?","opts":["Dropping Y from plural nouns.","Omitting the 'yoo' /j/ glide in 'new' or 'Tuesday'.","Not pronouncing Y-starting words.","Replacing Y with F."],"ci":1,"ct":"Omitting the 'yoo' /j/ glide in 'new' or 'Tuesday'."},
  {"lo":15,"qid":"s7q5","pos":4,"prompt":"How does 'R' differ between British and American English?","opts":["British always pronounces R; American ignores it.","British R is silent unless before a vowel; American R is always pronounced.","American R only at word start.","No difference."],"ci":1,"ct":"British R is silent unless before a vowel; American R is always pronounced."},
  {"lo":15,"qid":"s7q6","pos":5,"prompt":"Which pair shows American long 'I' vs British 'E'?","opts":["Dance vs Dance","Hot vs Hat","Semi/Anti: British 'em-ee'/'an-tee' vs American 'sem-eye'/'an-tie'","Home vs Whom"],"ci":2,"ct":"Semi/Anti: British 'em-ee'/'an-tee' vs American 'sem-eye'/'an-tie'"},
  {"lo":15,"qid":"s7q7","pos":6,"prompt":"How does 'laboratory' stress differ between dialects?","opts":["British drops two syllables.","British: la-BOR-a-tory; American: LAB-ra-tory.","American adds extra O.","Identical; only tone changes."],"ci":1,"ct":"British: la-BOR-a-tory; American: LAB-ra-tory."},
  {"lo":16,"qid":"d16q1","pos":0,"prompt":"What is the difference between a monophthong and a diphthong?","opts":["Nasal configuration vs. open oral framing.","One fixed vowel position vs. a glide between two positions.","Stressed syllable versus weak unstressed form.","Voiced element versus unvoiced burst marker."],"ci":1,"ct":"One fixed vowel position vs. a glide between two positions."},
  {"lo":16,"qid":"d16q2","pos":1,"prompt":"What does failing to transition through a diphthong cause?","opts":["Rapid speech acceleration patterns.","Complete loss of sentence stress structure.","Heavy mother-tongue influence (MTI).","Automatic insertion of glottal stops."],"ci":2,"ct":"Heavy mother-tongue influence (MTI)."},
  {"lo":16,"qid":"d16q3","pos":2,"prompt":"Which diphthong ends in the /\u026a/ sound?","opts":["Go","Rain","Now","Core"],"ci":1,"ct":"Rain"},
  {"lo":16,"qid":"d16q4","pos":3,"prompt":"How does 'near/here' differ between American and British English?","opts":["American shifts directly to a pure schwa sound.","Both options omit rhotic influences entirely.","British uses a schwa because 'R' is silent; American uses the rhotic /r/.","British implements a hard flap T component."],"ci":2,"ct":"British uses a schwa because 'R' is silent; American uses the rhotic /r/."},
  {"lo":16,"qid":"d16q5","pos":4,"prompt":"How is 'now' typically pronounced in Indian English vs. standard?","opts":["Simpler /a/ sound instead of the full diphthong.","Complex dynamic glide transition tracking.","Absolute elimination of internal vowels.","Heavy elongation of nasal boundaries."],"ci":0,"ct":"Simpler /a/ sound instead of the full diphthong."},
  {"lo":16,"qid":"d16q6","pos":5,"prompt":"What is the modern trend for the word 'tour'?","opts":["Becoming a short monophthong sound.","Merging toward /\u0254\u02d0/ so it sounds like 'tore'.","Shifting stress layout to absolute fronting.","Dropping initial consonant segments."],"ci":1,"ct":"Merging toward /\u0254\u02d0/ so it sounds like 'tore'."},
  {"lo":16,"qid":"d16q7","pos":6,"prompt":"Which correctly pairs the diphthongs for 'fear' vs. 'fair'?","opts":["/e\u0259/ vs. /\u026a\u0259/.","Identical in rhotic styles.","fear = /\u026a\u0259/, fair = /e\u0259/."],"ci":2,"ct":"fear = /\u026a\u0259/, fair = /e\u0259/."},
  {"lo":17,"qid":"s2q1","pos":0,"prompt":"What two categories can English words be divided into for sentence rhythm?","opts":["Nouns and Prepositions","Content words and Function words","British and American words","Stressed and Unstressed words"],"ci":1,"ct":"Content words and Function words"},
  {"lo":17,"qid":"s2q2","pos":1,"prompt":"Which of these is a 'content word'?","opts":["of","to","table","from"],"ci":2,"ct":"table"},
  {"lo":17,"qid":"s2q3","pos":2,"prompt":"When must a function word use its strong form?","opts":["At the very beginning of a sentence.","Before a proper noun.","At the very end of a sentence.","When spoken by American."],"ci":2,"ct":"At the very end of a sentence."},
  {"lo":17,"qid":"s2q4","pos":3,"prompt":"Which vowel sound creates weak forms of 'to', 'at', 'for'?","opts":["Long 'oo'","Short 'i'","Schwa /\u0259/","Long 'ay'"],"ci":2,"ct":"Schwa /\u0259/"},
  {"lo":17,"qid":"s2q5","pos":4,"prompt":"What is the strong-form pronunciation of 'of'?","opts":["Pronounced with /v/ sound at end.","Pronounced like 'off'.","Always has silent 'o'.","Pronounced with long 'oh'."],"ci":0,"ct":"Pronounced with /v/ sound at end."},
  {"lo":17,"qid":"s2q6","pos":5,"prompt":"How does weak-form 'can' sound in casual speech?","opts":["/k\u00e6n/","/k\u0259n/ with schwa","/k\u0251\u02d0nt/","/ke\u026an/"],"ci":1,"ct":"/k\u0259n/ with schwa"},
  {"lo":17,"qid":"s2q7","pos":6,"prompt":"What happens to 'has', 'have', 'her' in their weak forms?","opts":["Vowel disappears.","Trailing consonants doubled.","Initial 'H' is dropped.","Replaced with nasal sound."],"ci":2,"ct":"Initial 'H' is dropped."},
  {"lo":18,"qid":"s8q1","pos":0,"prompt":"What is the Schwa /\u0259/ sound?","opts":["Sharp long vowel in stressed syllables.","Completely silent letter.","Relaxed neutral short vowel in unstressed syllables.","Trilled consonant at back of throat."],"ci":2,"ct":"Relaxed neutral short vowel in unstressed syllables."},
  {"lo":18,"qid":"s8q2","pos":1,"prompt":"In 'Photograph' vs 'Photography', how does the first vowel change?","opts":["Stays identical.","In PHO-tograph first O is clear; in pho-TOG-raphy it weakens to schwa.","In PHO-tograph first O is schwa; in Photography it becomes 'oo'.","Stress moves to final syllable."],"ci":1,"ct":"In PHO-tograph first O is clear; in pho-TOG-raphy it weakens to schwa."},
  {"lo":18,"qid":"s8q3","pos":2,"prompt":"When consonant-ending word meets vowel-starting word ('an apple'), what happens?","opts":["A pause is placed between words.","Final consonant links smoothly to vowel, sounding like 'a-napple'.","Vowel at start is dropped.","Consonant is silenced."],"ci":1,"ct":"Final consonant links smoothly to vowel, sounding like 'a-napple'."},
  {"lo":18,"qid":"s8q4","pos":3,"prompt":"What happens when two vowels meet at a word boundary ('Go on')?","opts":["A transitional glide /w/ or /j/ is inserted.","First word is dropped.","Both vowels become nasal.","A sharp glottal stop is required."],"ci":0,"ct":"A transitional glide /w/ or /j/ is inserted."},
  {"lo":18,"qid":"s8q5","pos":4,"prompt":"Why does 'and' sound like 'n' in 'Rock and Roll'?","opts":["'And' is a content word needing emphasis.","'And' is a function word weakened in connected speech.","Pronunciation mistake in American English.","'a' and 'd' cannot be together."],"ci":1,"ct":"'And' is a function word weakened in connected speech."},
  {"lo":18,"qid":"s8q6","pos":5,"prompt":"Which syllables in 'Banana' have the schwa /\u0259/?","opts":["Only the first","Only the middle","Both first and last","None"],"ci":2,"ct":"Both first and last"},
  {"lo":18,"qid":"s8q7","pos":6,"prompt":"Why do native speakers use weak forms and linking so much?","opts":["To sound formal and robotic.","To maintain natural rhythmic flow where stressed words carry the melody.","English lacks enough letters.","To confuse learners."],"ci":1,"ct":"To maintain natural rhythmic flow where stressed words carry the melody."},
  {"lo":19,"qid":"s9q1","pos":0,"prompt":"What is 'Sentence Stress' in spoken English?","opts":["Anxiety when reading long paragraphs.","Making every word the same length and pitch.","Giving extra volume and clarity to key words.","Shouting the final word."],"ci":2,"ct":"Giving extra volume and clarity to key words."},
  {"lo":19,"qid":"s9q2","pos":1,"prompt":"'I didn't steal YOUR keys' \u2014 what is implied?","opts":["No keys were stolen.","The speaker stole someone else's keys.","They stole something else belonging to you.","Someone else stole your keys."],"ci":1,"ct":"The speaker stole someone else's keys."},
  {"lo":19,"qid":"s9q3","pos":2,"prompt":"What intonation is typical for Wh- questions?","opts":["Rising at end.","Falling at end.","Flat monotone.","Zig-zag pitch."],"ci":1,"ct":"Falling at end."},
  {"lo":19,"qid":"s9q4","pos":3,"prompt":"What pitch movement is expected at the end of a Yes/No question?","opts":["Sharp drop.","Rising intonation.","Whispering last word.","No change."],"ci":1,"ct":"Rising intonation."},
  {"lo":19,"qid":"s9q5","pos":4,"prompt":"What are 'Thought Groups'?","opts":["Silent periods for thinking.","Small phrases spoken together with a single intonation, separated by tiny pauses.","Vocabulary lists by category.","Dialects for business."],"ci":1,"ct":"Small phrases spoken together with a single intonation, separated by tiny pauses."},
  {"lo":19,"qid":"s9q6","pos":5,"prompt":"What is 'catenation' in connected speech?","opts":["Elision.","Assimilation.","Linking a final consonant to the next word's initial vowel.","Intrusion."],"ci":2,"ct":"Linking a final consonant to the next word's initial vowel."},
  {"lo":19,"qid":"s9q7","pos":6,"prompt":"In 'an apple', what happens in connected speech?","opts":["Pause clearly between both components.","The /n/ moves forward and links to 'apple', sounding like 'a-napple'.","Eliminate terminal nasal tracks completely.","Introduce an explicit glottal stop buffer."],"ci":1,"ct":"The /n/ moves forward and links to 'apple', sounding like 'a-napple'."},
  {"lo":19,"qid":"s9q8","pos":7,"prompt":"What is elision in connected speech?","opts":["Forcing extreme breath pressure on matching stops.","Dropping or omitting /t/ or /d/ for a smoother transition.","Adding extra vowel segments into consonant groups.","Shifting base vocal pitch to peak configurations."],"ci":1,"ct":"Dropping or omitting /t/ or /d/ for a smoother transition."},
  {"lo":19,"qid":"s9q9","pos":8,"prompt":"What creates an intrusive /w/ between words?","opts":["Tongue curled backward into a retroflex posture.","Lips naturally rounded from /u\u02d0/ or /o\u028a/ at the end of the previous word.","Lower teeth biting upper lip structures.","Dropping standard respiratory velocity metrics."],"ci":1,"ct":"Lips naturally rounded from /u\u02d0/ or /o\u028a/ at the end of the previous word."},
  {"lo":19,"qid":"s9q10","pos":9,"prompt":"What is a 'linking R' in British English?","opts":["A silent structural marker used only for formatting.","An 'R' that is activated when the next word starts with a vowel.","Replaced entirely by an open schwa segment.","Exclusive to localized American vernaculars."],"ci":1,"ct":"An 'R' that is activated when the next word starts with a vowel."},
  {"lo":20,"qid":"s4q1","pos":0,"prompt":"What psychological shift happens when you become fluent in a new language?","opts":["You lose your native language ability.","Voice shifts to higher pitch.","A new language personality awakens, changing mannerisms.","Vocabulary becomes formal only."],"ci":2,"ct":"A new language personality awakens, changing mannerisms."},
  {"lo":20,"qid":"s4q2","pos":1,"prompt":"Why choose a language model of the same gender?","opts":["Certain words are gender-specific.","Pitch, frequency, intonation align more easily.","Easier to find YouTube videos.","Native speakers only listen to same gender."],"ci":1,"ct":"Pitch, frequency, intonation align more easily."},
  {"lo":20,"qid":"s4q3","pos":2,"prompt":"Which is NOT a guideline for choosing a language model?","opts":["Celebrity with large video presence.","Someone you admire so you don't get bored.","Native speaker with neutral accent.","Professional English teacher or professor."],"ci":3,"ct":"Professional English teacher or professor."},
  {"lo":20,"qid":"s4q4","pos":3,"prompt":"What is the first step of mechanical shadowing?","opts":["Recording and playing back your voice.","Getting the transcript and reading it aloud first.","Memorizing the speech without text.","Setting playback speed to double."],"ci":1,"ct":"Getting the transcript and reading it aloud first."},
  {"lo":20,"qid":"s4q5","pos":4,"prompt":"What should you focus on in the second shadowing step?","opts":["Overall sentence rhythm.","Dictionary meanings.","Individual word pronunciation, syllable stress, basic sounds.","Facial expressions and gestures."],"ci":2,"ct":"Individual word pronunciation, syllable stress, basic sounds."},
  {"lo":20,"qid":"s4q6","pos":5,"prompt":"What phonetic feature appears when Downey says 'about us' naturally?","opts":["Flap T \u2014 'T' between vowels sounds like soft 'D'.","Completely silent 'T'.","Heavy British glottal stop.","Retroflex T."],"ci":0,"ct":"Flap T \u2014 'T' between vowels sounds like soft 'D'."},
  {"lo":20,"qid":"s4q7","pos":6,"prompt":"Will you become an exact vocal copy of your language model?","opts":["Yes, 100% identical after months.","No \u2014 you absorb rhythm but keep your unique vocal character.","No \u2014 native accent blocks all change.","Yes, but only with fictional characters."],"ci":1,"ct":"No \u2014 you absorb rhythm but keep your unique vocal character."}
]$seed$::jsonb) as r
on conflict (lesson_order, source, question_id) do update
  set position=excluded.position, prompt=excluded.prompt, options=excluded.options,
      correct_index=excluded.correct_index, correct_text=excluded.correct_text, updated_at=now();
-- Old seed rows that match no current built-in question (e.g. lesson 5 'd2q1..3') are
-- removed - they were never shown to students and would otherwise be served blank.
delete from public.quiz_answers where source = 'builtin' and prompt is null;

-- 3 -- uploaded quizzes: copy the admin's keys out of course_config --
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

-- 4 -- attempts: each answer is checked once and locked --
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

-- 5 -- admin RPCs (validated save / load / delete) --
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
