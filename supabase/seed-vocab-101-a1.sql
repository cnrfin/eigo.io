-- ============================================================================
-- Vocab 101 — A1 opening arc: Lessons 1–4 (32 words)
-- ----------------------------------------------------------------------------
--   L1 Hello & goodbye   (greetings & politeness)
--   L2 Me & you          (people & pronouns)
--   L3 My family         (family)
--   L4 Food & drink      (food — POS-mixed, showcases cloze)
--
-- Anchored to the Oxford 3000 A1/A2 slice, frequency-ordered. Every sense has a
-- JA gloss, EN definition, CEFR tag, and 3 goal-tagged, self-disambiguating
-- examples (business / travel / conversation) written in controlled A1–A2
-- vocabulary. See eigo-ios/docs/VOCAB-101.md → "Scope & sequence".
--
-- Prerequisites: run add-vocab-101.sql and add-vocab-example-goals.sql first.
-- Re-runnable: base rows use ON CONFLICT; child rows are cleared for these
-- senses before re-insert. Replaces the earlier pilot lesson (want/need/…).
-- ============================================================================

-- ── Remove the pilot test words (cascades to their senses/examples/cards) ────
DELETE FROM vocab_words WHERE normalized IN ('want','need','try','keep','enough','busy','ready','almost');

-- ── Themes ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('greetings', 'Greetings & politeness', 'あいさつ',       'theme'),
  ('people',    'People',                 '人',             'theme'),
  ('family',    'Family',                 '家族',           'theme'),
  ('food',      'Food & drink',           '食べ物と飲み物', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  -- L1
  ('hello',   'hello',   '/həˈloʊ/',   '/həˈləʊ/',   200, 1, FALSE, NULL),
  ('goodbye', 'goodbye', '/ˌɡʊdˈbaɪ/', '/ˌɡʊdˈbaɪ/', 900, 1, FALSE, NULL),
  ('yes',     'yes',     '/jɛs/',      '/jɛs/',       90, 1, FALSE, NULL),
  ('no',      'no',      '/noʊ/',      '/nəʊ/',       70, 1, FALSE, NULL),
  ('please',  'please',  '/pliːz/',    '/pliːz/',    260, 1, FALSE, NULL),
  ('thanks',  'thanks',  '/θæŋks/',    '/θæŋks/',    400, 1, TRUE,  'カタカナの「サンクス」。英語では気軽なお礼。ていねいには thank you。'),
  ('sorry',   'sorry',   '/ˈsɑːri/',   '/ˈsɒri/',    350, 1, FALSE, NULL),
  ('name',    'name',    '/neɪm/',     '/neɪm/',     150, 1, FALSE, NULL),
  -- L2
  ('I',       'i',       '/aɪ/',       '/aɪ/',        10, 1, FALSE, NULL),
  ('you',     'you',     '/juː/',      '/juː/',       15, 1, FALSE, NULL),
  ('he',      'he',      '/hiː/',      '/hiː/',       25, 1, FALSE, NULL),
  ('she',     'she',     '/ʃiː/',      '/ʃiː/',       40, 1, FALSE, NULL),
  ('we',      'we',      '/wiː/',      '/wiː/',       35, 1, FALSE, NULL),
  ('they',    'they',    '/ðeɪ/',      '/ðeɪ/',       30, 1, FALSE, NULL),
  ('friend',  'friend',  '/frɛnd/',    '/frɛnd/',    220, 1, FALSE, 'フレンド。英語の friend は「1人の友達」。複数は friends。'),
  ('people',  'people',  '/ˈpiːpəl/',  '/ˈpiːpəl/',   80, 1, FALSE, NULL),
  -- L3
  ('family',  'family',  '/ˈfæməli/',  '/ˈfæməli/',  180, 1, FALSE, NULL),
  ('mother',  'mother',  '/ˈmʌðər/',   '/ˈmʌðə/',    240, 1, FALSE, NULL),
  ('father',  'father',  '/ˈfɑːðər/',  '/ˈfɑːðə/',   250, 1, FALSE, NULL),
  ('sister',  'sister',  '/ˈsɪstər/',  '/ˈsɪstə/',   360, 1, FALSE, NULL),
  ('brother', 'brother', '/ˈbrʌðər/',  '/ˈbrʌðə/',   370, 1, FALSE, NULL),
  ('parent',  'parent',  '/ˈpɛərənt/', '/ˈpeərənt/', 300, 1, FALSE, NULL),
  ('child',   'child',   '/tʃaɪld/',   '/tʃaɪld/',   130, 1, FALSE, NULL),
  ('baby',    'baby',    '/ˈbeɪbi/',   '/ˈbeɪbi/',   330, 1, TRUE,  'カタカナの「ベビー」。英語は baby /ˈbeɪbi/。'),
  -- L4
  ('food',    'food',    '/fuːd/',     '/fuːd/',     170, 1, FALSE, NULL),
  ('water',   'water',   '/ˈwɔːtər/',  '/ˈwɔːtə/',   160, 1, FALSE, 'ウォーター。英語は /ˈwɔːtər/。'),
  ('eat',     'eat',     '/iːt/',      '/iːt/',      230, 1, FALSE, NULL),
  ('drink',   'drink',   '/drɪŋk/',    '/drɪŋk/',    320, 1, FALSE, 'ドリンク。動詞は「飲む」、名詞は「飲み物」。'),
  ('bread',   'bread',   '/brɛd/',     '/brɛd/',     420, 1, TRUE,  '英語では bread。「パン」はポルトガル語由来で通じない。'),
  ('hungry',  'hungry',  '/ˈhʌŋɡri/',  '/ˈhʌŋɡri/',  450, 1, FALSE, NULL),
  ('cook',    'cook',    '/kʊk/',      '/kʊk/',      380, 1, FALSE, NULL),
  ('delicious','delicious','/dɪˈlɪʃəs/','/dɪˈlɪʃəs/', 700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses (one primary sense each) ─────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  -- L1
  ((SELECT id FROM vocab_words WHERE normalized='hello'),   'hello.excl.greeting',  1, TRUE, 'exclamation', 'こんにちは',       'a word you say when you meet someone or answer the phone', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='goodbye'), 'goodbye.excl.parting', 1, TRUE, 'exclamation', 'さようなら',             'a word you say when you leave someone',                    'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='yes'),     'yes.excl.affirm',      1, TRUE, 'exclamation', 'はい',                   'you use it to agree or say something is true',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='no'),      'no.excl.refuse',       1, TRUE, 'exclamation', 'いいえ',                 'you use it to disagree or refuse',                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='please'),  'please.adv.polite',    1, TRUE, 'adverb',      'お願いします',   'a polite word used when you ask for something',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='thanks'),  'thanks.excl.thank',    1, TRUE, 'exclamation', 'ありがとう',             'a friendly way to thank someone',                          'A1', 'ていねいには thank you。'),
  ((SELECT id FROM vocab_words WHERE normalized='sorry'),   'sorry.excl.apolog',    1, TRUE, 'exclamation', 'ごめんなさい','a word you say when you apologize',                        'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='name'),    'name.n.identity',      1, TRUE, 'noun',        '名前',                   'the word that people call you by',                         'A1', NULL),
  -- L2
  ((SELECT id FROM vocab_words WHERE normalized='i'),       'i.pron.self',          1, TRUE, 'pronoun',     '私（自分）',             'the word you use when you talk about yourself',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='you'),     'you.pron.listener',    1, TRUE, 'pronoun',     'あなた',                 'the person or people you are talking to',                  'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='he'),      'he.pron.male',         1, TRUE, 'pronoun',     '彼（その男性）',         'a word for one man or boy',                                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='she'),     'she.pron.female',      1, TRUE, 'pronoun',     '彼女（その女性）',       'a word for one woman or girl',                             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='we'),      'we.pron.group',        1, TRUE, 'pronoun',     '私たち',                 'you and I, or me and my group',                            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='they'),    'they.pron.others',     1, TRUE, 'pronoun',     '彼ら',           'more than one other person or thing',                      'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='friend'),  'friend.n.person',      1, TRUE, 'noun',        '友達',                   'a person you like and know well',                          'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='people'),  'people.n.persons',     1, TRUE, 'noun',        '人々',                   'more than one person',                                     'A1', NULL),
  -- L3
  ((SELECT id FROM vocab_words WHERE normalized='family'),  'family.n.group',       1, TRUE, 'noun',        '家族',                   'the group of people you are related to',                   'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mother'),  'mother.n.parent',      1, TRUE, 'noun',        '母',                     'your female parent',                                       'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='father'),  'father.n.parent',      1, TRUE, 'noun',        '父',                     'your male parent',                                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sister'),  'sister.n.sibling',     1, TRUE, 'noun',        '姉',                 'a girl or woman with the same parents as you',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='brother'), 'brother.n.sibling',    1, TRUE, 'noun',        '兄',                 'a boy or man with the same parents as you',                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='parent'),  'parent.n.parent',      1, TRUE, 'noun',        '親',                     'a mother or a father',                                     'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='child'),   'child.n.young',        1, TRUE, 'noun',        '子供',                   'a young person, or someone''s son or daughter',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='baby'),    'baby.n.infant',        1, TRUE, 'noun',        '赤ちゃん',               'a very young child',                                       'A1', NULL),
  -- L4
  ((SELECT id FROM vocab_words WHERE normalized='food'),    'food.n.edible',        1, TRUE, 'noun',        '食べ物',                 'things that people eat',                                    'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='water'),   'water.n.liquid',       1, TRUE, 'noun',        '水',                     'the clear liquid that we drink',                           'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='eat'),     'eat.v.consume',        1, TRUE, 'verb',        '食べる',                 'to put food in your mouth and swallow it',                 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drink'),   'drink.v.consume',      1, TRUE, 'verb',        '飲む',                   'to take liquid into your mouth and swallow it',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bread'),   'bread.n.food',         1, TRUE, 'noun',        'パン',                   'a common food made by baking flour and water',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hungry'),  'hungry.adj.wanting',   1, TRUE, 'adjective',   'お腹がすいた',           'wanting to eat',                                           'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cook'),    'cook.v.prepare',       1, TRUE, 'verb',        '料理する',               'to make food ready by heating it',                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='delicious'),'delicious.adj.tasty', 1, TRUE, 'adjective',   'おいしい',               'tasting very good',                                        'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent re-seed) ──────────────────
DELETE FROM vocab_examples WHERE sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));
DELETE FROM vocab_collocations WHERE sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));

-- ── Examples (3 per sense, goal-tagged, self-disambiguating) ────────────────
INSERT INTO vocab_examples (sense_id, text_en, text_ja, cloze_answer, disambiguated, order_index, goal) VALUES
  -- hello
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'I say hello to my team when I get to the office.', '出社したらチームにあいさつする。',        'hello', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'Say hello to the driver when you get on the bus.', 'バスに乗ったら運転手にあいさつしてね。',  'hello', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'She said hello and gave me a big smile.',          '彼女はあいさつして、にっこり笑った。',    'hello', TRUE, 2, 'conversation'),
  -- goodbye
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'We said goodbye to the client after the meeting.', '会議のあと、クライアントに別れを告げた。','goodbye', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'It is hard to say goodbye at the airport.',        '空港でお別れを言うのはつらい。',          'goodbye', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'He waved goodbye from the train window.',          '彼は電車の窓から手を振って別れを告げた。','goodbye', TRUE, 2, 'conversation'),
  -- yes
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'I said yes to the new project.',                        '新しいプロジェクトを引き受けた。',        'yes', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'When they asked if we wanted a tour, we said yes.',     'ツアーはどうかと聞かれて、はいと答えた。','yes', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'She asked if I was hungry and I said yes.',             'お腹すいてる？と聞かれてはいと答えた。',  'yes', TRUE, 2, 'conversation'),
  -- no
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'The manager said no to the extra budget.',               '部長は追加予算にノーと言った。',          'no', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'I asked for a window seat, but they said no.',           '窓側の席を頼んだが、だめだと言われた。',  'no', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'He said no to dessert because he was full.',             'お腹いっぱいで、彼はデザートを断った。',  'no', TRUE, 2, 'conversation'),
  -- please
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Please send me the file before five.',                '5時までにファイルを送ってください。',      'please', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Two tickets to the city, please.',                    '街まで切符を2枚お願いします。',            'please', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Please help me carry these bags.',                    'この荷物を運ぶのを手伝ってください。',    'please', TRUE, 2, 'conversation'),
  -- thanks
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks for finishing the report so fast.',            'レポートを早く仕上げてくれてありがとう。','thanks', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks, that is very kind of you.',                   'ありがとう、ご親切に。',                  'thanks', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks for the coffee this morning.',                 '今朝はコーヒーをありがとう。',            'thanks', TRUE, 2, 'conversation'),
  -- sorry
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, I am a little late for the meeting.',           'すみません、会議に少し遅れます。',        'sorry', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, is this the way to the station?',               'すみません、駅はこちらの方向ですか。',    'sorry', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, I did not hear what you said.',                 'ごめん、今言ったこと聞こえなかった。',    'sorry', TRUE, 2, 'conversation'),
  -- name
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'Could you tell me your name for the booking?',          '予約のためお名前を教えていただけますか。','name', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'Please write your name on the hotel form.',             'ホテルの用紙にお名前をご記入ください。',  'name', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'I forgot his name, but he seems nice.',                 '彼の名前は忘れたけど、いい人そう。',      'name', TRUE, 2, 'conversation'),
  -- I
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I will send the email after lunch.',                        '昼食のあとメールを送ります。',            'I', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I would like a room for two nights.',                       '2泊で部屋をお願いしたいです。',            'I', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I really like this song.',                                  'この曲、本当に好き。',                    'I', TRUE, 2, 'conversation'),
  -- you
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'Can you check these numbers for me?',                  'この数字を確認してもらえますか。',        'you', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'You need to show your ticket here.',                   'ここで切符を見せる必要があります。',      'you', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'Do you want to go for a walk?',                        '散歩に行かない？',                        'you', TRUE, 2, 'conversation'),
  -- he
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He works in the sales team.',                              '彼は営業チームで働いている。',            'He', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He asked the driver for directions.',                      '彼は運転手に道をたずねた。',              'He', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He is my brother''s best friend.',                         '彼は兄の親友だ。',                        'He', TRUE, 2, 'conversation'),
  -- she
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She leads the design team.',                            '彼女はデザインチームを率いている。',      'She', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She booked the hotel for us.',                          '彼女が私たちのホテルを予約した。',        'She', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She always makes me laugh.',                            '彼女はいつも私を笑わせてくれる。',        'She', TRUE, 2, 'conversation'),
  -- we
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We finished the project on time.',                        '私たちは期限どおりにプロジェクトを終えた。','We', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We are staying near the station.',                        '私たちは駅の近くに泊まっています。',      'We', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We watched a movie last night.',                          '昨夜、私たちは映画を見た。',              'We', TRUE, 2, 'conversation'),
  -- they
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They sent the contract this morning.',                 '彼らは今朝、契約書を送ってきた。',        'They', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They live in a small town by the sea.',                '彼らは海辺の小さな町に住んでいる。',      'They', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They have two children.',                              '彼らには子供が2人いる。',                'They', TRUE, 2, 'conversation'),
  -- friend
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'A friend from work helped me with the report.',         '職場の友達がレポートを手伝ってくれた。',  'friend', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'I am meeting a friend in Osaka.',                       '大阪で友達に会う予定だ。',                'friend', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'My best friend lives next door.',                       '親友は隣に住んでいる。',                  'friend', TRUE, 2, 'conversation'),
  -- people
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'A lot of people came to the meeting.',                 '大勢の人が会議に来た。',                  'people', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'The city is full of friendly people.',                 'その街は親切な人であふれている。',        'people', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'Many people like this restaurant.',                    '多くの人がこのレストランを好んでいる。',  'people', TRUE, 2, 'conversation'),
  -- family
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'I cannot work this weekend; it is family time.',         '今週末は働けない、家族の時間だ。',        'family', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'We are traveling with our whole family.',                '家族みんなで旅行している。',              'family', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'My family lives in the countryside.',                    '私の家族は田舎に住んでいる。',            'family', TRUE, 2, 'conversation'),
  -- mother
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'My mother runs a small shop.',                          '母は小さな店を営んでいる。',              'mother', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'I bought a gift for my mother.',                        '母におみやげを買った。',                  'mother', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'My mother makes great soup.',                           '母はスープを作るのが上手だ。',            'mother', TRUE, 2, 'conversation'),
  -- father
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'His father started the company.',                       '彼の父が会社を始めた。',                  'father', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'My father loves to travel by train.',                   '父は電車で旅するのが好きだ。',            'father', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'My father reads the news every morning.',               '父は毎朝ニュースを読む。',                'father', TRUE, 2, 'conversation'),
  -- sister
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My sister works at the same office.',                  '姉は同じ会社で働いている。',              'sister', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My sister met us at the airport.',                     '妹が空港まで迎えに来てくれた。',          'sister', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My little sister is very funny.',                      '妹はとても面白い。',                      'sister', TRUE, 2, 'conversation'),
  -- brother
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My brother and I run the business together.',         '兄と私で一緒に事業をしている。',          'brother', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My brother is coming with us to Kyoto.',              '弟も一緒に京都へ行く。',                  'brother', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My older brother teaches music.',                     '兄は音楽を教えている。',                  'brother', TRUE, 2, 'conversation'),
  -- parent
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'Every parent on the team gets flexible hours.',         'チームの親には柔軟な勤務時間がある。',    'parent', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'A parent must stay with young children on the tour.',   'ツアーでは親が小さい子と一緒にいる必要がある。','parent', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'Being a parent is hard but happy work.',                '親であることは大変だけど幸せなことだ。',  'parent', TRUE, 2, 'conversation'),
  -- child
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'The office has a room for staff with a child.',           '会社には子供のいる社員のための部屋がある。','child', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'A child under six travels free on this train.',           '6歳未満の子供はこの電車は無料だ。',      'child', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'Their child just started school.',                        '彼らの子供は学校に通い始めたばかりだ。',  'child', TRUE, 2, 'conversation'),
  -- baby
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'She is back from work after having a baby.',              '彼女は赤ちゃんを産んで仕事に戻った。',    'baby', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'We booked a quiet room because of the baby.',             '赤ちゃんがいるので静かな部屋を予約した。','baby', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'The baby sleeps all morning.',                            '赤ちゃんは午前中ずっと寝ている。',        'baby', TRUE, 2, 'conversation'),
  -- food
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'The company gives us free food at lunch.',                '会社は昼食に無料の食べ物を出してくれる。','food', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'The street food here is amazing.',                        'ここの屋台の食べ物は最高だ。',            'food', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'There is a lot of food in the fridge.',                   '冷蔵庫に食べ物がたくさんある。',          'food', TRUE, 2, 'conversation'),
  -- water
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'Please bring some water to the meeting room.',           '会議室に水を持ってきてください。',        'water', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'You can buy water at the station.',                      '駅で水を買えます。',                      'water', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'Can I have a glass of water?',                           'お水を一杯もらえますか。',                'water', TRUE, 2, 'conversation'),
  -- eat
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'We often eat lunch at our desks.',                        '私たちはよく自席で昼食を食べる。',        'eat', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'Let us eat something before the flight.',                 '飛行機の前に何か食べよう。',              'eat', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'I usually eat breakfast at seven.',                       '私はたいてい7時に朝食を食べる。',        'eat', TRUE, 2, 'conversation'),
  -- drink
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'I drink coffee during long meetings.',                  '長い会議の間はコーヒーを飲む。',          'drink', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'Do not drink the tap water on the trip.',               '旅行中は水道水を飲まないで。',            'drink', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'I drink tea every night.',                              '私は毎晩お茶を飲む。',                    'drink', TRUE, 2, 'conversation'),
  -- bread
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'There is bread and coffee in the break room.',            '休憩室にパンとコーヒーがある。',          'bread', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'We bought fresh bread near the hotel.',                    'ホテルの近くで焼きたてのパンを買った。',  'bread', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'I had bread and eggs for breakfast.',                      '朝食にパンと卵を食べた。',                'bread', TRUE, 2, 'conversation'),
  -- hungry
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'I skipped lunch, so I am really hungry now.',        '昼食を抜いたので、今とてもお腹がすいた。','hungry', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'We were hungry after the long walk.',                '長い散歩のあと、お腹がすいた。',          'hungry', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'I am hungry, so let us order something.',             'お腹がすいたから、何か注文しよう。',      'hungry', TRUE, 2, 'conversation'),
  -- cook
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'I do not have time to cook during the week.',            '平日は料理する時間がない。',              'cook', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'The hotel lets you cook in the room.',                   'そのホテルは部屋で料理させてくれる。',    'cook', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'I like to cook dinner for my friends.',                  '友達に夕食を作るのが好きだ。',            'cook', TRUE, 2, 'conversation'),
  -- delicious
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'The food at the work party was delicious.',         '会社のパーティーの料理はおいしかった。',  'delicious', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'We found a delicious little noodle shop.',           'おいしい小さな麺屋を見つけた。',          'delicious', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'This cake is really delicious.',                     'このケーキは本当においしい。',            'delicious', TRUE, 2, 'conversation');

-- ── Collocations (attested; shown on the word card) ─────────────────────────
INSERT INTO vocab_collocations (sense_id, pattern, example, collocate, colloc_type) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'yes, please',     'yes, please',       'yes',   'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'),   'first name',      'first name',        'first', 'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'),   'your name',       'What is your name?','your',  'det+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'so sorry',        'I am so sorry',     'so',    'adv+adj'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),   'a good friend',   'a good friend',     'good',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),   'best friend',     'my best friend',    'best',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'),  'a lot of people', 'a lot of people',   'lot',   'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'),    'a big family',    'a big family',      'big',   'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'),     'a young child',   'a young child',     'young', 'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'),     'have a baby',     'have a baby',       'have',  'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'),     'fast food',       'fast food',         'fast',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'),     'healthy food',    'healthy food',      'healthy','adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'),    'a glass of water','a glass of water',  'glass', 'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'),     'eat out',         'eat out',           'out',   'verb+adv'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'),     'eat breakfast',   'eat breakfast',     'breakfast','verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'),   'drink water',     'drink water',       'water', 'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'),      'a loaf of bread', 'a loaf of bread',   'loaf',  'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'),    'cook dinner',     'cook dinner',       'dinner','verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),'very hungry',     'very hungry',       'very',  'adv+adj'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'),'really delicious','really delicious', 'really','adv+adj');

-- ── Relations (typed; in-corpus antonyms use to_sense_id) ───────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), NULL, 'antonym', '会うとき hello、別れるとき goodbye。'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'),(SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), NULL, 'antonym', '同上。'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'),     (SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'),       NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'),      (SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'),      NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'),   NULL, 'thank you',  'near_synonym', 'ていねいな言い方。'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'),   NULL, 'excuse me',  'near_synonym', '声をかけるときは excuse me も使う。'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),     NULL, 'buddy',      'near_synonym', 'くだけた言い方。'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),     NULL, 'enemy',      'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'),     NULL, 'mom',        'near_synonym', 'くだけた言い方は mom。'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'),     NULL, 'dad',        'near_synonym', 'くだけた言い方は dad。'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'),       NULL, 'kid',        'near_synonym', 'くだけた言い方は kid。'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'),       NULL, 'infant',     'near_synonym', 'かたい言い方は infant。'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),  NULL, 'full',       'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),  NULL, 'thirsty',    'confusable', 'hungry=お腹がすいた、thirsty=のどがかわいた。'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), NULL, 'tasty',      'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'),      NULL, 'prepare',    'near_synonym', NULL);

-- ── Category membership (each lesson's senses → its theme) ───────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='greetings'
WHERE s.slug IN ('hello.excl.greeting','goodbye.excl.parting','yes.excl.affirm','no.excl.refuse','please.adv.polite','thanks.excl.thank','sorry.excl.apolog','name.n.identity')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='people'
WHERE s.slug IN ('i.pron.self','you.pron.listener','he.pron.male','she.pron.female','we.pron.group','they.pron.others','friend.n.person','people.n.persons')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='family'
WHERE s.slug IN ('family.n.group','mother.n.parent','father.n.parent','sister.n.sibling','brother.n.sibling','parent.n.parent','child.n.young','baby.n.infant')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='food'
WHERE s.slug IN ('food.n.edible','water.n.liquid','eat.v.consume','drink.v.consume','bread.n.food','hungry.adj.wanting','cook.v.prepare','delicious.adj.tasty')
ON CONFLICT DO NOTHING;

-- ── Lessons (upsert so the old pilot title/order is overwritten) ────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-1', 1, 1, (SELECT id FROM vocab_categories WHERE slug='greetings'), 'Hello & goodbye', 'あいさつ',           TRUE, TRUE),
  ('vocab-101-2', 1, 2, (SELECT id FROM vocab_categories WHERE slug='people'),    'Me & you',        'わたしとあなた',     TRUE, TRUE),
  ('vocab-101-3', 1, 3, (SELECT id FROM vocab_categories WHERE slug='family'),    'My family',       'わたしの家族',       TRUE, TRUE),
  ('vocab-101-4', 1, 4, (SELECT id FROM vocab_categories WHERE slug='food'),      'Food & drink',    '食べ物と飲み物',     TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index = EXCLUDED.level_index, order_index = EXCLUDED.order_index,
  theme_id = EXCLUDED.theme_id, title_en = EXCLUDED.title_en, title_ja = EXCLUDED.title_ja,
  published = EXCLUDED.published, free = EXCLUDED.free;

-- ── Lesson items (clear old, then set order) ────────────────────────────────
DELETE FROM vocab_lesson_items WHERE lesson_id IN (SELECT id FROM vocab_lessons WHERE slug IN ('vocab-101-1','vocab-101-2','vocab-101-3','vocab-101-4'));

INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug=x.lesson), s.id, x.ord
FROM (VALUES
  ('vocab-101-1','hello.excl.greeting',0),('vocab-101-1','goodbye.excl.parting',1),('vocab-101-1','yes.excl.affirm',2),('vocab-101-1','no.excl.refuse',3),
  ('vocab-101-1','please.adv.polite',4),('vocab-101-1','thanks.excl.thank',5),('vocab-101-1','sorry.excl.apolog',6),('vocab-101-1','name.n.identity',7),
  ('vocab-101-2','i.pron.self',0),('vocab-101-2','you.pron.listener',1),('vocab-101-2','he.pron.male',2),('vocab-101-2','she.pron.female',3),
  ('vocab-101-2','we.pron.group',4),('vocab-101-2','they.pron.others',5),('vocab-101-2','friend.n.person',6),('vocab-101-2','people.n.persons',7),
  ('vocab-101-3','family.n.group',0),('vocab-101-3','mother.n.parent',1),('vocab-101-3','father.n.parent',2),('vocab-101-3','sister.n.sibling',3),
  ('vocab-101-3','brother.n.sibling',4),('vocab-101-3','parent.n.parent',5),('vocab-101-3','child.n.young',6),('vocab-101-3','baby.n.infant',7),
  ('vocab-101-4','food.n.edible',0),('vocab-101-4','water.n.liquid',1),('vocab-101-4','eat.v.consume',2),('vocab-101-4','drink.v.consume',3),
  ('vocab-101-4','bread.n.food',4),('vocab-101-4','hungry.adj.wanting',5),('vocab-101-4','cook.v.prepare',6),('vocab-101-4','delicious.adj.tasty',7)
) AS x(lesson, slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;
