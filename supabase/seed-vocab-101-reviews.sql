-- ============================================================================
-- Vocab 101 — unit REVIEW capstones (standalone; touches only -review lessons).
-- Safe to run on top of an edited DB: does not modify any base lesson's scenes.
-- Idempotent. Items = each unit's full A1+A2 word set; scene blanks a subset.
-- ============================================================================

-- ═══ Unit 1 review: A welcome day ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u1-review', 1, 90, (SELECT id FROM vocab_categories WHERE slug='greetings'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), s.id, x.ord FROM (VALUES
  ('hello.excl.greeting',0),('goodbye.excl.parting',1),('yes.excl.affirm',2),('no.excl.refuse',3),('please.adv.polite',4),('thanks.excl.thank',5),('sorry.excl.apolog',6),('name.n.identity',7),('meet.v.encounter',8),('live.v.reside',9),('work.v.job',10),('student.n.learner',11),('teacher.n.educator',12),('friend.n.person',13),('city.n.place',14),('nice.adj.pleasant',15),('tall.adj.height',16),('short.adj.height',17),('kind.adj.nice',18),('funny.adj.humor',19),('quiet.adj.calm',20),('hair.n.head',21),('friendly.adj.warm',22),('young.adj.age',23),('usually.adv.freq',24),('always.adv.freq',25),('sometimes.adv.freq',26),('never.adv.freq',27),('often.adv.freq',28),('weekend.n.time',29),('morning.n.time',30),('evening.n.time',31)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), 'conversation', 0, 'A welcome day', '歓迎の一日', 'classroom', 'classmate');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 0, 'npc', 'Hello! Welcome. Are you new here?', 'こんにちは！ようこそ。新しい方？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 1, 'user', 'Yes, hi! It''s nice to finally {meet} you in person.', 'はい、こんにちは！やっとお会いできて嬉しいです。', 'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['meet','pay','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 2, 'npc', 'You too! What''s your {name}?', 'こちらこそ！お名前は？', 'name', (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['name','age','city','work']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 3, 'user', 'I''m {{user_name}}. I''m a new {student} here.', '{{user_name}}です。ここの新しい生徒です。', 'student', (SELECT id FROM vocab_senses WHERE slug='student.n.learner'), ARRAY['student','teacher','doctor','driver']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 4, 'npc', 'Great! I''m the {teacher}; I teach this class.', 'いいね！私が先生で、このクラスを教えてます。', 'teacher', (SELECT id FROM vocab_senses WHERE slug='teacher.n.educator'), ARRAY['teacher','student','waiter','nurse']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 5, 'user', 'Nice. Where do you {live}?', 'いいですね。どこに住んでますか？', 'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['live','eat','go','read']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 6, 'npc', 'In this {city}, near the big park.', 'この街の、大きな公園の近く。', 'city', (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['city','room','shop','bus']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 7, 'user', 'Everyone seems so {friendly} and welcoming.', 'みんなフレンドリーで温かいですね。', 'friendly', (SELECT id FROM vocab_senses WHERE slug='friendly.adj.warm'), ARRAY['friendly','quiet','angry','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 8, 'npc', 'They are! That guy Sam is really {tall}; he plays basketball.', 'そうだよ！あのサム、すごく背が高くてバスケをするんだ。', 'tall', (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), ARRAY['tall','short','kind','young']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 9, 'user', 'I''ll say hi. Do you all meet up on the {weekend}?', '挨拶するね。みんな週末に集まるの？', 'weekend', (SELECT id FROM vocab_senses WHERE slug='weekend.n.time'), ARRAY['weekend','morning','evening','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 10, 'npc', 'Always, every Saturday! See you then.', '毎週土曜、いつもね！じゃあまた。', NULL, NULL, NULL);


-- ═══ Unit 2 review: Catching up ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u2-review', 2, 90, (SELECT id FROM vocab_categories WHERE slug='feelings'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review'), s.id, x.ord FROM (VALUES
  ('happy.adj.glad',0),('sad.adj.unhappy',1),('tired.adj.sleepy',2),('angry.adj.mad',3),('worried.adj.anxious',4),('excited.adj.eager',5),('bored.adj.dull',6),('scared.adj.afraid',7),('know.v.aware',8),('remember.v.recall',9),('forget.v.lose',10),('together.adv.joint',11),('argue.v.fight',12),('laugh.v.joy',13),('cry.v.tears',14),('trust.v.faith',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review'), 'conversation', 0, 'Catching up', '久しぶりに話す', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 0, 'npc', 'Hey! You look happy; you''re smiling.', 'やあ！嬉しそう、笑ってるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 1, 'user', 'I am! But last week I was so {sad}, I cried a lot.', 'うん！でも先週はすごく悲しくて、たくさん泣いた。', 'sad', (SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'), ARRAY['sad','happy','excited','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 2, 'npc', 'Oh no. Were you {worried} about something?', 'あらら。何か心配してたの？', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['worried','excited','bored','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 3, 'user', 'Yeah, and really {tired} from no sleep.', 'うん、それに寝不足でくたくただった。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['tired','excited','angry','glad']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 4, 'npc', 'Do you {remember} our trip last year? That cheered you up.', '去年の旅行覚えてる？あれで元気出たよね。', 'remember', (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), ARRAY['remember','forget','argue','trust']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 5, 'user', 'Of course! We couldn''t stop {laugh}ing.', 'もちろん！笑いが止まらなかった。', 'laugh', (SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), ARRAY['laugh','cry','argue','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 6, 'npc', 'Best friends. I''m glad we do things {together}.', '親友だね。一緒にいられて嬉しい。', 'together', (SELECT id FROM vocab_senses WHERE slug='together.adv.joint'), ARRAY['together','alone','apart','away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 7, 'user', 'Me too. I {know} I can always trust you.', '私も。いつも信頼できるって分かってる。', 'know', (SELECT id FROM vocab_senses WHERE slug='know.v.aware'), ARRAY['know','forget','meet','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u2-review') AND goal='conversation'), 8, 'npc', 'Always.', 'いつでもね。', NULL, NULL, NULL);


-- ═══ Unit 3 review: A friend visits ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u3-review', 3, 90, (SELECT id FROM vocab_categories WHERE slug='home'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), s.id, x.ord FROM (VALUES
  ('house.n.building',0),('room.n.space',1),('kitchen.n.cook',2),('bathroom.n.wash',3),('bed.n.sleep',4),('garden.n.yard',5),('door.n.entry',6),('window.n.glass',7),('where.adv.place',8),('turn.v.direction',9),('straight.adv.direct',10),('near.adj.close',11),('station.n.transit',12),('street.n.road',13),('left.adv.direction',14),('right.adv.direction',15),('bank.n.money',16),('park.n.green',17),('library.n.books',18),('market.n.stalls',19),('corner.n.turn',20),('museum.n.art',21),('shop.n.store',22),('bridge.n.cross',23),('bus.n.vehicle',24),('train.n.rail',25),('ticket.n.pass',26),('stop.n.place',27),('catch.v.board',28),('ride.n.trip',29),('platform.n.rail',30),('seat.n.place',31)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), 'conversation', 0, 'A friend visits', '友達が訪ねてくる', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 0, 'npc', 'Hi! I''m at the {station}. How do I get to yours?', 'やあ！駅にいるよ。家までどう行く？', 'station', (SELECT id FROM vocab_senses WHERE slug='station.n.transit'), ARRAY['station','kitchen','garden','window']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 1, 'user', 'Take the {bus}, number 5, from right there.', 'そこから5番のバスに乗って。', 'bus', (SELECT id FROM vocab_senses WHERE slug='bus.n.vehicle'), ARRAY['bus','train','seat','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 2, 'npc', 'Got it. Do I need a {ticket} for it?', '了解。切符は要る？', 'ticket', (SELECT id FROM vocab_senses WHERE slug='ticket.n.pass'), ARRAY['ticket','seat','map','key']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 3, 'user', 'Yes. Get off, then go {straight} down the road.', 'うん。降りたら道をまっすぐ。', 'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['straight','left','right','back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 4, 'npc', 'Straight, okay. And then?', 'まっすぐね。それから？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 5, 'user', '{Turn} left at the corner, near the park.', '公園の近くの角を左に曲がって。', 'Turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['Turn','Stop','Wait','Look']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 6, 'npc', 'I see your {street}. Which one is your place?', '通りが見えた。どれが家？', 'street', (SELECT id FROM vocab_senses WHERE slug='street.n.road'), ARRAY['street','room','door','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 7, 'user', 'The white {house} with the red door.', '赤いドアの白い家。', 'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['house','room','kitchen','station']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 8, 'npc', 'Found it! Is this bright room the {kitchen}?', '着いた！この明るい部屋が台所？', 'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['kitchen','garden','station','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 9, 'user', 'Yes. There''s a small {garden} out back too.', 'うん。裏に小さな庭もあるよ。', 'garden', (SELECT id FROM vocab_senses WHERE slug='garden.n.yard'), ARRAY['garden','room','door','window']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 10, 'npc', 'What a lovely place!', '素敵なお家！', NULL, NULL, NULL);


-- ═══ Unit 4 review: Planning a day off ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u4-review', 4, 90, (SELECT id FROM vocab_categories WHERE slug='routine'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), s.id, x.ord FROM (VALUES
  ('wake.v.rise',0),('sleep.v.rest',1),('start.v.begin',2),('finish.v.end',3),('early.adv.time',4),('late.adv.time',5),('shower.v.wash',6),('when.adv.time',7),('time.n.clock',8),('free.adj.available',9),('busy.adj.occupied',10),('plan.v.arrange',11),('tomorrow.adv.nextday',12),('tonight.adv.evening',13),('clean.v.tidy',14),('wash.v.clean',15),('tidy.v.order',16),('mess.n.disorder',17),('dishes.n.plates',18),('laundry.n.wash',19),('trash.n.waste',20),('sweep.v.broom',21)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), 'conversation', 0, 'Planning a day off', '休みの計画', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 0, 'npc', 'Are you {free}, with no plans, this weekend?', '今週末、予定なく空いてる？', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['free','busy','early','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 1, 'user', 'Not Saturday, I''m {busy}. How about Sunday?', '土曜は忙しい。日曜はどう？', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['busy','free','tidy','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 2, 'npc', 'Sunday works. {When} in the day is good?', '日曜いいね。一日のいつがいい？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['When','What','Where','Who']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 3, 'user', 'What {time}, like ten o''clock?', '何時？10時とか？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['time','plan','day','room']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 4, 'npc', 'I {wake} up late on weekends, around nine.', '週末は9時ごろ遅く起きるんだ。', 'wake', (SELECT id FROM vocab_senses WHERE slug='wake.v.rise'), ARRAY['wake','sleep','start','finish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 5, 'user', 'Same. In the morning I {clean} the house first.', '同じ。朝はまず家を掃除する。', 'clean', (SELECT id FROM vocab_senses WHERE slug='clean.v.tidy'), ARRAY['clean','mess','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 6, 'npc', 'Ha, chores! I do the {dishes} first thing.', 'はは、家事！私はまず食器を洗う。', 'dishes', (SELECT id FROM vocab_senses WHERE slug='dishes.n.plates'), ARRAY['dishes','trash','floor','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 7, 'user', 'Then let''s meet after. What time will you {finish}?', 'じゃあ後で会おう。何時に終わる？', 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','start','wake','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 8, 'npc', 'By noon. Let''s confirm {tomorrow}.', '昼までに。明日、確認しよう。', 'tomorrow', (SELECT id FROM vocab_senses WHERE slug='tomorrow.adv.nextday'), ARRAY['tomorrow','tonight','today','when']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 9, 'user', 'Perfect!', '完璧！', NULL, NULL, NULL);


-- ═══ Unit 5 review: Cooking together ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u5-review', 5, 90, (SELECT id FROM vocab_categories WHERE slug='food'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review'), s.id, x.ord FROM (VALUES
  ('food.n.edible',0),('water.n.liquid',1),('eat.v.consume',2),('drink.v.consume',3),('bread.n.food',4),('hungry.adj.wanting',5),('cook.v.prepare',6),('delicious.adj.tasty',7),('fresh.adj.new',8),('bottle.n.container',9),('box.n.container',10),('heavy.adj.weight',11),('light.adj.weight',12),('fruit.n.food',13),('vegetable.n.food',14),('list.n.items',15),('cut.v.knife',16),('add.v.put',17),('mix.v.stir',18),('taste.v.try',19),('boil.v.heat',20),('fry.v.pan',21),('recipe.n.food',22),('plate.n.dish',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review'), 'conversation', 0, 'Cooking together', '一緒に料理', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 0, 'npc', 'I''m so {hungry}; I haven''t eaten all day. Let''s cook!', 'お腹ぺこぺこ、一日中食べてない。作ろう！', 'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','thirsty','tired','bored']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 1, 'user', 'The vegetables look {fresh}, picked today.', '野菜が新鮮そう、今日採れたやつ。', 'fresh', (SELECT id FROM vocab_senses WHERE slug='fresh.adj.new'), ARRAY['fresh','heavy','old','cheap']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 2, 'npc', 'Great. Should I {cut} the onions into small pieces?', 'いいね。玉ねぎを小さく切ろうか？', 'cut', (SELECT id FROM vocab_senses WHERE slug='cut.v.knife'), ARRAY['cut','mix','boil','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 3, 'user', 'Yes. I''ll {boil} the pasta in this hot water.', 'うん。パスタをこの熱湯で茹でるね。', 'boil', (SELECT id FROM vocab_senses WHERE slug='boil.v.heat'), ARRAY['boil','cut','mix','fry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 4, 'npc', 'Do we add the {vegetable}s now?', '野菜は今入れる？', 'vegetable', (SELECT id FROM vocab_senses WHERE slug='vegetable.n.food'), ARRAY['vegetable','fruit','bottle','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 5, 'user', 'Yes, then {mix} everything together well.', 'うん、それから全部よく混ぜて。', 'mix', (SELECT id FROM vocab_senses WHERE slug='mix.v.stir'), ARRAY['mix','cut','boil','fry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 6, 'npc', 'Smells amazing. Can I {taste} it? Enough salt?', 'いい匂い。味見していい？塩は足りてる？', 'taste', (SELECT id FROM vocab_senses WHERE slug='taste.v.try'), ARRAY['taste','cut','mix','add']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 7, 'user', 'Sure. For dessert, some sweet {fruit}?', 'どうぞ。デザートに甘い果物は？', 'fruit', (SELECT id FROM vocab_senses WHERE slug='fruit.n.food'), ARRAY['fruit','bread','water','rice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 8, 'npc', 'Perfect. Mmm, this is {delicious}, the best I''ve had!', '完璧。んー、最高においしい！', 'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['delicious','awful','plain','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u5-review') AND goal='conversation'), 9, 'user', 'We make a good team!', 'いいチームだね！', NULL, NULL, NULL);


-- ═══ Unit 6 review: Buying an outfit ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u6-review', 6, 90, (SELECT id FROM vocab_categories WHERE slug='shopping'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review'), s.id, x.ord FROM (VALUES
  ('want.v.desire',0),('buy.v.purchase',1),('money.n.currency',2),('big.adj.size',3),('small.adj.size',4),('color.n.hue',5),('cheap.adj.price',6),('size.n.measure',7),('wear.v.clothes',8),('jacket.n.clothes',9),('shoes.n.clothes',10),('tight.adj.fit',11),('loose.adj.fit',12),('shirt.n.clothes',13),('hat.n.clothes',14),('fit.v.size',15),('pay.v.money',16),('cost.v.price',17),('change.n.money',18),('card.n.pay',19),('cash.n.money',20),('receipt.n.proof',21),('price.n.cost',22),('expensive.adj.price',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review'), 'conversation', 0, 'Buying an outfit', '服を買う', 'shop', 'clerk');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 0, 'npc', 'Hello! Can I help you find something?', 'こんにちは！何かお探しですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 1, 'user', 'Yes, I {want} a new jacket.', 'はい、新しいジャケットが欲しくて。', 'want', (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), ARRAY['want','sell','lose','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 2, 'npc', 'Sure. What {size} - small, medium, or large?', 'かしこまりました。サイズは？S、M、L？', 'size', (SELECT id FROM vocab_senses WHERE slug='size.n.measure'), ARRAY['size','color','price','shape']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 3, 'user', 'Medium. Do you have another {color}, maybe blue?', 'M。別の色、例えば青はある？', 'color', (SELECT id FROM vocab_senses WHERE slug='color.n.hue'), ARRAY['color','size','price','brand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 4, 'npc', 'Here you go. How does it {fit}?', 'どうぞ。サイズは合う？', 'fit', (SELECT id FROM vocab_senses WHERE slug='fit.v.size'), ARRAY['fit','wear','cut','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 5, 'user', 'A bit {tight}; I can barely move my arms.', '少しきつくて、腕がほとんど動かせない。', 'tight', (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), ARRAY['tight','loose','big','heavy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 6, 'npc', 'Try a large. This one''s {cheap} too, it''s on sale.', 'Lを試して。これはセールで安いよ。', 'cheap', (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), ARRAY['cheap','new','warm','soft']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 7, 'user', 'Nice, the other jacket was too {expensive}.', 'いいね、もう一方は高すぎた。', 'expensive', (SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), ARRAY['expensive','cheap','free','light']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 8, 'npc', 'Will you {pay} by card or cash?', 'カードと現金、どちらで払う？', 'pay', (SELECT id FROM vocab_senses WHERE slug='pay.v.money'), ARRAY['pay','cost','change','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u6-review') AND goal='conversation'), 9, 'user', 'By {card}, please.', 'カードでお願いします。', 'card', (SELECT id FROM vocab_senses WHERE slug='card.n.pay'), ARRAY['card','cash','receipt','ticket']);


-- ═══ Unit 7 review: First week at work ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u7-review', 7, 90, (SELECT id FROM vocab_categories WHERE slug='school'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review'), s.id, x.ord FROM (VALUES
  ('study.v.learn',0),('class.n.lesson',1),('book.n.reading',2),('test.n.exam',3),('easy.adj.simple',4),('hard.adj.difficult',5),('question.n.query',6),('answer.n.reply',7),('meeting.n.work',8),('email.n.msg',9),('boss.n.work',10),('project.n.work',11),('deadline.n.time',12),('report.n.doc',13),('desk.n.furniture',14),('colleague.n.work',15),('call.v.phone',16),('text.v.msg',17),('app.n.tech',18),('screen.n.tech',19),('click.v.tap',20),('online.adv.net',21),('password.n.tech',22),('message.n.msg',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review'), 'conversation', 0, 'First week at work', '仕事の初週', 'office', 'colleague');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 0, 'npc', 'How''s the new job going?', '新しい仕事どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 1, 'user', 'Good! But I {study} the manual every night.', 'いいよ！でも毎晩マニュアルを勉強してる。', 'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['study','sleep','cook','play']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 2, 'npc', 'Ha. Is there a {test} at the end of training?', 'はは。研修の最後にテストある？', 'test', (SELECT id FROM vocab_senses WHERE slug='test.n.exam'), ARRAY['test','class','call','trip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 3, 'user', 'Yes. And my first {meeting} is tomorrow.', 'うん。それに初めての会議が明日。', 'meeting', (SELECT id FROM vocab_senses WHERE slug='meeting.n.work'), ARRAY['meeting','email','desk','report']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 4, 'npc', 'Did your {boss} give you a project already?', 'もう上司からプロジェクトもらった？', 'boss', (SELECT id FROM vocab_senses WHERE slug='boss.n.work'), ARRAY['boss','friend','guest','teacher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 5, 'user', 'Yes, with a tight {deadline} on Friday.', 'うん、金曜の厳しい締め切り付きで。', 'deadline', (SELECT id FROM vocab_senses WHERE slug='deadline.n.time'), ARRAY['deadline','meeting','desk','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 6, 'npc', 'Send me the details by {email}.', '詳細をメールで送って。', 'email', (SELECT id FROM vocab_senses WHERE slug='email.n.msg'), ARRAY['email','report','card','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 7, 'user', 'Sure. Or I can {call} you now.', 'うん。それか今電話してもいい。', 'call', (SELECT id FROM vocab_senses WHERE slug='call.v.phone'), ARRAY['call','click','cook','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 8, 'npc', 'A quick {message} is fine, thanks.', '短いメッセージで大丈夫、ありがとう。', 'message', (SELECT id FROM vocab_senses WHERE slug='message.n.msg'), ARRAY['message','email','app','call']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u7-review') AND goal='conversation'), 9, 'user', 'Okay, I''m {online} until six anyway.', '了解、どうせ6時までオンラインだから。', 'online', (SELECT id FROM vocab_senses WHERE slug='online.adv.net'), ARRAY['online','offline','inside','outside']);


-- ═══ Unit 8 review: Weekend fun ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u8-review', 8, 90, (SELECT id FROM vocab_categories WHERE slug='hobbies'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review'), s.id, x.ord FROM (VALUES
  ('like.v.enjoy',0),('love.v.adore',1),('play.v.games',2),('music.n.sound',3),('sport.n.game',4),('read.v.text',5),('watch.v.look',6),('favorite.adj.best',7),('film.n.movie',8),('party.n.event',9),('dance.v.move',10),('fun.n.enjoy',11),('concert.n.music',12),('invite.v.ask',13),('join.v.take',14),('enjoy.v.like',15),('run.v.move',16),('swim.v.water',17),('team.n.group',18),('win.v.beat',19),('lose.v.fail',20),('ball.n.object',21),('gym.n.place',22),('practice.v.train',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review'), 'conversation', 0, 'Weekend fun', '週末の楽しみ', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 0, 'npc', 'What do you like to do for fun?', '趣味は何？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 1, 'user', 'I {play} the guitar and listen to music.', 'ギターを弾いて音楽を聴く。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','watch','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 2, 'npc', 'Nice! What''s your {favorite} band, the one you love most?', 'いいね！一番好きなバンドは？', 'favorite', (SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), ARRAY['favorite','worst','second','only']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 3, 'user', 'Hard to choose! Want to see a {film} at the cinema Friday?', '選べない！金曜に映画館で映画見ない？', 'film', (SELECT id FROM vocab_senses WHERE slug='film.n.movie'), ARRAY['film','party','concert','book']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 4, 'npc', 'Sure! There''s also a birthday {party} on Saturday.', 'いいね！土曜に誕生日パーティーもあるよ。', 'party', (SELECT id FROM vocab_senses WHERE slug='party.n.event'), ARRAY['party','film','concert','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 5, 'user', 'Oh, can you {invite} me?', 'え、私も誘ってくれる？', 'invite', (SELECT id FROM vocab_senses WHERE slug='invite.v.ask'), ARRAY['invite','join','leave','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 6, 'npc', 'Of course! We can {dance} to the music there too.', 'もちろん！そこで音楽に合わせて踊れるよ。', 'dance', (SELECT id FROM vocab_senses WHERE slug='dance.v.move'), ARRAY['dance','sleep','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 7, 'user', 'Fun! On Sunday my football {team} has a game.', '楽しい！日曜はサッカーチームの試合。', 'team', (SELECT id FROM vocab_senses WHERE slug='team.n.group'), ARRAY['team','ball','gym','group']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 8, 'npc', 'Do you think you''ll {win} the match?', '試合、勝てそう？', 'win', (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), ARRAY['win','lose','run','swim']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u8-review') AND goal='conversation'), 9, 'user', 'I hope so!', 'そうだといいな！', NULL, NULL, NULL);


-- ═══ Unit 9 review: Arriving on holiday ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u9-review', 9, 90, (SELECT id FROM vocab_categories WHERE slug='hotel'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review'), s.id, x.ord FROM (VALUES
  ('key.n.lock',0),('night.n.time',1),('stay.v.remain',2),('bag.n.luggage',3),('floor.n.level',4),('guest.n.visitor',5),('breakfast.n.meal',6),('reception.n.desk',7),('flight.n.plane',8),('gate.n.airport',9),('passport.n.doc',10),('board.v.geton',11),('wait.v.stay',12),('suitcase.n.bag',13),('delay.n.late',14),('arrive.v.reach',15),('visit.v.go',16),('map.n.guide',17),('photo.n.pic',18),('tour.n.trip',19),('famous.adj.known',20),('view.n.scene',21),('souvenir.n.gift',22),('castle.n.building',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review'), 'conversation', 0, 'Arriving on holiday', '旅行の到着', 'hotel', 'receptionist');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 0, 'npc', 'Welcome! May I see your {passport}?', 'ようこそ！パスポートを拝見できますか？', 'passport', (SELECT id FROM vocab_senses WHERE slug='passport.n.doc'), ARRAY['passport','ticket','card','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 1, 'user', 'Here you go. My {flight} landed early.', 'どうぞ。フライトは早く着きました。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['flight','gate','train','bus']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 2, 'npc', 'Perfect. Are you our only {guest} tonight?', 'かしこまりました。今夜のお客様はお一人ですか？', 'guest', (SELECT id FROM vocab_senses WHERE slug='guest.n.visitor'), ARRAY['guest','friend','worker','driver']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 3, 'user', 'I think so. I''ll {stay} two nights.', 'たぶん。2泊します。', 'stay', (SELECT id FROM vocab_senses WHERE slug='stay.v.remain'), ARRAY['stay','leave','move','call']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 4, 'npc', 'Here''s your room {key}. Enjoy!', 'お部屋の鍵です。ごゆっくり！', 'key', (SELECT id FROM vocab_senses WHERE slug='key.n.lock'), ARRAY['key','bag','map','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 5, 'user', 'Thanks! I''d love a {tour} of the old town.', 'ありがとう！旧市街のツアーをしたいです。', 'tour', (SELECT id FROM vocab_senses WHERE slug='tour.n.trip'), ARRAY['tour','map','view','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 6, 'npc', 'The castle is very {famous}; everyone knows it.', 'お城はとても有名で、誰もが知ってます。', 'famous', (SELECT id FROM vocab_senses WHERE slug='famous.adj.known'), ARRAY['famous','quiet','cheap','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 7, 'user', 'Wow, what a {view} from up there!', 'わあ、あそこからの景色最高！', 'view', (SELECT id FROM vocab_senses WHERE slug='view.n.scene'), ARRAY['view','map','photo','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 8, 'npc', 'Best in the city. What time will you {arrive} for it?', '街で一番です。何時に到着されますか？', 'arrive', (SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), ARRAY['arrive','leave','wait','board']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u9-review') AND goal='conversation'), 9, 'user', 'By nine tomorrow.', '明日9時までに。', NULL, NULL, NULL);


-- ═══ Unit 10 review: At the clinic ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u10-review', 10, 90, (SELECT id FROM vocab_categories WHERE slug='health'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review'), s.id, x.ord FROM (VALUES
  ('sick.adj.ill',0),('hurt.v.pain',1),('doctor.n.medic',2),('rest.v.relax',3),('better.adj.improved',4),('help.v.assist',5),('medicine.n.drug',6),('fever.n.high',7),('pain.n.hurt',8),('feel.v.sense',9),('cough.v.throat',10),('worse.adj.bad',11),('nurse.n.medic',12),('appointment.n.time',13),('temperature.n.heat',14),('checkup.n.exam',15),('head.n.body',16),('stomach.n.body',17),('back.n.body',18),('throat.n.body',19),('sore.adj.hurt',20),('arm.n.body',21),('leg.n.body',22),('hand.n.body',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review'), 'conversation', 0, 'At the clinic', 'クリニックで', 'clinic', 'nurse');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 0, 'npc', 'You don''t look well. What''s wrong?', '具合悪そうですね。どうしました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 1, 'user', 'I {feel} awful; I think I''m getting sick.', '気分が最悪で、風邪をひきそう。', 'feel', (SELECT id FROM vocab_senses WHERE slug='feel.v.sense'), ARRAY['feel','cook','clean','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 2, 'npc', 'Where does it {hurt}?', 'どこが痛みますか？', 'hurt', (SELECT id FROM vocab_senses WHERE slug='hurt.v.pain'), ARRAY['hurt','help','rest','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 3, 'user', 'My {head} is pounding.', '頭がずきずきします。', 'head', (SELECT id FROM vocab_senses WHERE slug='head.n.body'), ARRAY['head','hand','leg','arm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 4, 'npc', 'Is your {throat} dry too?', 'のども乾いてますか？', 'throat', (SELECT id FROM vocab_senses WHERE slug='throat.n.body'), ARRAY['throat','stomach','back','leg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 5, 'user', 'Yes, and I have a {fever}; I feel very hot.', 'はい、それに熱があって、すごく熱いです。', 'fever', (SELECT id FROM vocab_senses WHERE slug='fever.n.high'), ARRAY['fever','cold','key','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 6, 'npc', 'You should see a {doctor}.', '医者に診てもらった方がいいです。', 'doctor', (SELECT id FROM vocab_senses WHERE slug='doctor.n.medic'), ARRAY['doctor','teacher','driver','guest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 7, 'user', 'Will they give me {medicine}?', '薬をもらえますか？', 'medicine', (SELECT id FROM vocab_senses WHERE slug='medicine.n.drug'), ARRAY['medicine','water','coffee','bread']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 8, 'npc', 'Probably. For now, {rest} and drink water.', 'たぶん。今は休んで水分を。', 'rest', (SELECT id FROM vocab_senses WHERE slug='rest.v.relax'), ARRAY['rest','run','work','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u10-review') AND goal='conversation'), 9, 'user', 'Thank you.', 'ありがとうございます。', NULL, NULL, NULL);


-- ═══ Unit 11 review: Weather and seasons ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u11-review', 11, 90, (SELECT id FROM vocab_categories WHERE slug='weather'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review'), s.id, x.ord FROM (VALUES
  ('hot.adj.temp',0),('cold.adj.chilly',1),('rain.n.drops',2),('sunny.adj.bright',3),('warm.adj.mild',4),('outside.adv.out',5),('wind.n.air',6),('umbrella.n.rain',7),('summer.n.season',8),('winter.n.season',9),('spring.n.season',10),('autumn.n.season',11),('snow.n.weather',12),('cloudy.adj.sky',13),('coat.n.clothes',14),('season.n.time',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review'), 'conversation', 0, 'Weather and seasons', '天気と季節', 'park', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 0, 'npc', 'Lovely day - so {sunny}, not a cloud!', 'いい天気だね、よく晴れて雲一つない！', 'sunny', (SELECT id FROM vocab_senses WHERE slug='sunny.adj.bright'), ARRAY['sunny','rainy','windy','cloudy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 1, 'user', 'Yes, but a little {hot}; I''m sweating.', 'うん、でもちょっと暑くて汗ばむ。', 'hot', (SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'), ARRAY['hot','cold','late','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 2, 'npc', 'Better than yesterday; it was freezing {cold}.', '昨日よりいい。凍えるほど寒かった。', 'cold', (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), ARRAY['cold','hot','easy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 3, 'user', 'Will there be {rain} tomorrow?', '明日は雨が降るかな？', 'rain', (SELECT id FROM vocab_senses WHERE slug='rain.n.drops'), ARRAY['rain','snow','wind','sun']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 4, 'npc', 'Maybe. Take an {umbrella} to stay dry.', 'かもね。濡れないよう傘を持って。', 'umbrella', (SELECT id FROM vocab_senses WHERE slug='umbrella.n.rain'), ARRAY['umbrella','coat','bag','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 5, 'user', 'What''s your favorite {season}?', '好きな季節は？', 'season', (SELECT id FROM vocab_senses WHERE slug='season.n.time'), ARRAY['season','weather','month','day']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 6, 'npc', '{Winter}, when it snows.', '冬、雪が降るころ。', 'Winter', (SELECT id FROM vocab_senses WHERE slug='winter.n.season'), ARRAY['Winter','Summer','Spring','Autumn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 7, 'user', 'I love {snow} too; it''s so pretty.', '私も雪が好き、すごくきれい。', 'snow', (SELECT id FROM vocab_senses WHERE slug='snow.n.weather'), ARRAY['snow','rain','wind','sun']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u11-review') AND goal='conversation'), 8, 'npc', 'Bring a warm coat, though!', 'でも暖かいコートをね！', NULL, NULL, NULL);


-- ═══ Unit 12 review: A problem at the bank ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u12-review', 12, 90, (SELECT id FROM vocab_categories WHERE slug='bank-post'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review'), s.id, x.ord FROM (VALUES
  ('account.n.bank',0),('send.v.mail',1),('form.n.doc',2),('sign.v.write',3),('open.v.start',4),('close.v.shut',5),('letter.n.mail',6),('stamp.n.mail',7),('broken.adj.damaged',8),('wrong.adj.incorrect',9),('fix.v.repair',10),('return.v.giveback',11),('problem.n.issue',12),('complain.v.protest',13),('refund.n.money',14),('replace.v.swap',15),('police.n.safety',16),('lost.adj.astray',17),('hospital.n.medic',18),('careful.adj.cautious',19),('accident.n.event',20),('fire.n.flame',21),('ambulance.n.medic',22),('danger.n.risk',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review'), 'conversation', 0, 'A problem at the bank', '銀行でのトラブル', 'bank', 'clerk');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 0, 'npc', 'Good morning. How can I help?', 'おはようございます。どうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 1, 'user', 'I''d like to open a savings {account}.', '貯金口座を開きたいです。', 'account', (SELECT id FROM vocab_senses WHERE slug='account.n.bank'), ARRAY['account','letter','stamp','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 2, 'npc', 'Sure. Please fill in this {form}.', 'かしこまりました。この用紙にご記入を。', 'form', (SELECT id FROM vocab_senses WHERE slug='form.n.doc'), ARRAY['form','letter','card','list']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 3, 'user', 'Done. Where do I {sign}?', '書けました。どこにサインを？', 'sign', (SELECT id FROM vocab_senses WHERE slug='sign.v.write'), ARRAY['sign','send','open','close']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 4, 'npc', 'Here. Oh, is your card {broken}? It won''t scan.', 'こちら。あれ、カード壊れてます？読み取れない。', 'broken', (SELECT id FROM vocab_senses WHERE slug='broken.adj.damaged'), ARRAY['broken','fresh','cheap','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 5, 'user', 'Yes, the chip is {wrong} somehow.', 'はい、チップがどこかおかしくて。', 'wrong', (SELECT id FROM vocab_senses WHERE slug='wrong.adj.incorrect'), ARRAY['wrong','right','easy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 6, 'npc', 'We can {fix} it or replace it.', '修理か交換ができます。', 'fix', (SELECT id FROM vocab_senses WHERE slug='fix.v.repair'), ARRAY['fix','break','lose','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 7, 'user', 'Also, I lost my wallet. Is that a big {problem}?', 'あと財布をなくしました。大きな問題ですか？', 'problem', (SELECT id FROM vocab_senses WHERE slug='problem.n.issue'), ARRAY['problem','answer','plan','view']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 8, 'npc', 'Please be {careful}. You should call the police.', 'お気をつけて。警察に電話した方がいいです。', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['careful','busy','late','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u12-review') AND goal='conversation'), 9, 'user', 'I will, thank you.', 'そうします、ありがとう。', NULL, NULL, NULL);


-- ═══ Unit 13 review: Planning a trip abroad ═══
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-u13-review', 13, 90, (SELECT id FROM vocab_categories WHERE slug='comparing'), 'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review'), s.id, x.ord FROM (VALUES
  ('strong.adj.power',0),('weak.adj.power',1),('useful.adj.help',2),('same.adj.identical',3),('different.adj.unlike',4),('important.adj.key',5),('real.adj.genuine',6),('true.adj.correct',7),('tree.n.plant',8),('sea.n.water',9),('mountain.n.land',10),('dog.n.animal',11),('cat.n.animal',12),('bird.n.animal',13),('river.n.water',14),('flower.n.plant',15),('country.n.nation',16),('language.n.speech',17),('speak.v.talk',18),('world.n.earth',19),('travel.v.journey',20),('foreign.adj.abroad',21),('culture.n.society',22),('capital.n.city',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review'), 'conversation', 0, 'Planning a trip abroad', '海外旅行の計画', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 0, 'npc', 'Where do you want to {travel} next?', '次はどこへ旅行したい？', 'travel', (SELECT id FROM vocab_senses WHERE slug='travel.v.journey'), ARRAY['travel','cook','clean','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 1, 'user', 'A {country} in Europe, maybe Italy.', 'ヨーロッパの国、イタリアとか。', 'country', (SELECT id FROM vocab_senses WHERE slug='country.n.nation'), ARRAY['country','city','world','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 2, 'npc', 'Nice. Do you {speak} the language?', 'いいね。その言語は話せる？', 'speak', (SELECT id FROM vocab_senses WHERE slug='speak.v.talk'), ARRAY['speak','cook','drive','swim']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 3, 'user', 'A little. Each {language} is so interesting.', '少し。それぞれの言語がすごく面白い。', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['language','music','culture','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 4, 'npc', 'Their food is quite {different} from ours.', '食べ物も私たちのとかなり違うよ。', 'different', (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), ARRAY['different','same','quiet','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 5, 'user', 'I want to climb a {mountain} there.', 'そこで山に登りたい。', 'mountain', (SELECT id FROM vocab_senses WHERE slug='mountain.n.land'), ARRAY['mountain','river','tree','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 6, 'npc', 'And swim in the {sea}, in the salt water!', 'それに海で、塩水で泳ぐ！', 'sea', (SELECT id FROM vocab_senses WHERE slug='sea.n.water'), ARRAY['sea','river','park','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 7, 'user', 'I need a {strong}, tough backpack.', '丈夫で頑丈なリュックが要る。', 'strong', (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), ARRAY['strong','weak','tall','short']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u13-review') AND goal='conversation'), 8, 'npc', 'Good planning is {important} for a big trip.', '大きな旅行にはしっかりした計画が大事。', 'important', (SELECT id FROM vocab_senses WHERE slug='important.adj.key'), ARRAY['important','useless','quiet','cheap']);

