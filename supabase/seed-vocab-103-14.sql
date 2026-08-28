-- ============================================================================
-- Vocab 103: vocab-103-14 - Social phrases  (Unit 7)
-- Words: break the ice, small talk, on the same wavelength, keep in touch, out of the blue, strike up, read between the lines, put in a good word.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('social-phrases', 'Social phrases', '社交の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('break the ice', 'break the ice', '/ˌbreɪk ðə ˈaɪs/', '/ˌbreɪk ðə ˈaɪs/', NULL, 5, FALSE, NULL),
  ('small talk', 'small talk', '/ˌsmɔːl ˈtɔːk/', '/ˌsmɔːl ˈtɔːk/', NULL, 5, FALSE, NULL),
  ('on the same wavelength', 'on the same wavelength', '/ˌɑːn ðə seɪm ˈweɪvleŋθ/', '/ˌɒn ðə seɪm ˈweɪvleŋθ/', NULL, 5, FALSE, NULL),
  ('keep in touch', 'keep in touch', '/ˌkiːp ɪn ˈtʌtʃ/', '/ˌkiːp ɪn ˈtʌtʃ/', NULL, 5, FALSE, NULL),
  ('out of the blue', 'out of the blue', '/ˌaʊt əv ðə ˈbluː/', '/ˌaʊt əv ðə ˈbluː/', NULL, 5, FALSE, NULL),
  ('strike up', 'strike up', '/ˌstraɪk ˈʌp/', '/ˌstraɪk ˈʌp/', NULL, 5, FALSE, NULL),
  ('read between the lines', 'read between the lines', '/ˌriːd bɪtwiːn ðə ˈlaɪnz/', '/ˌriːd bɪtwiːn ðə ˈlaɪnz/', NULL, 5, FALSE, NULL),
  ('put in a good word', 'put in a good word', '/ˌpʊt ɪn ə ɡʊd ˈwɜːrd/', '/ˌpʊt ɪn ə ɡʊd ˈwɜːd/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='break the ice'), 'break-the-ice.idiom.relax', 1, TRUE, 'idiom', '打ち解けるきっかけを作る', 'to make people feel relaxed when they first meet', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='small talk'), 'small-talk.idiom.chat', 1, TRUE, 'idiom', '世間話', 'polite conversation about unimportant things', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on the same wavelength'), 'same-wavelength.idiom.attuned', 1, TRUE, 'idiom', '波長が合う', 'understanding each other well and easily', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='keep in touch'), 'keep-in-touch.idiom.contact', 1, TRUE, 'idiom', '連絡を取り合う', 'to stay in contact with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='out of the blue'), 'out-of-the-blue.idiom.sudden', 1, TRUE, 'idiom', '出し抜けに', 'suddenly and unexpectedly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='strike up'), 'strike-up.phrv.begin', 1, TRUE, 'phrasal verb', '（会話を）始める', 'to start a conversation with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='read between the lines'), 'read-between-lines.idiom.infer', 1, TRUE, 'idiom', '行間を読む', 'to understand a hidden or implied meaning', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put in a good word'), 'put-in-good-word.idiom.recommend', 1, TRUE, 'idiom', '口添えする', 'to say something good about someone to help them', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('break the ice', 'small talk', 'on the same wavelength', 'keep in touch', 'out of the blue', 'strike up', 'read between the lines', 'put in a good word')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='social-phrases'
WHERE s.slug IN ('break-the-ice.idiom.relax', 'small-talk.idiom.chat', 'same-wavelength.idiom.attuned', 'keep-in-touch.idiom.contact', 'out-of-the-blue.idiom.sudden', 'strike-up.phrv.begin', 'read-between-lines.idiom.infer', 'put-in-good-word.idiom.recommend')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-14', 7, 1, (SELECT id FROM vocab_categories WHERE slug='social-phrases'), 'Social phrases', '社交の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), s.id, x.ord FROM (VALUES
  ('break-the-ice.idiom.relax',0),('small-talk.idiom.chat',1),('same-wavelength.idiom.attuned',2),('keep-in-touch.idiom.contact',3),('out-of-the-blue.idiom.sudden',4),('strike-up.phrv.begin',5),('read-between-lines.idiom.infer',6),('put-in-good-word.idiom.recommend',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'conversation', 0, 'At a party', 'パーティーで', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'travel', 1, 'Meeting travelers', '旅仲間との出会い', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'business', 2, 'Networking', '人脈づくり', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 0, 'npc', 'How was the party?', 'パーティーどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 1, 'user', 'Fun! A game helped {break the ice}.', '楽しかった！ゲームで打ち解けられた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 2, 'npc', 'Meet anyone interesting?', '面白い人に会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 3, 'user', 'After some {small talk}, I met a cool designer.', '世間話のあと、いいデザイナーに会った。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 4, 'npc', 'Did you click?', '気が合った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 5, 'user', 'Totally {on the same wavelength}; same humor.', '完全に波長が合った、笑いのツボも同じ。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 6, 'npc', 'Will you see them again?', 'また会う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 7, 'user', 'Yes, we agreed to {keep in touch}.', 'うん、連絡を取り合うことにした。', 'keep in touch', (SELECT id FROM vocab_senses WHERE slug='keep-in-touch.idiom.contact'), ARRAY['keep in touch','small talk','break the ice','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 8, 'npc', 'Any surprises?', '驚くことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 9, 'user', 'My ex showed up {out of the blue}!', '元カレが出し抜けに現れた！', 'out of the blue', (SELECT id FROM vocab_senses WHERE slug='out-of-the-blue.idiom.sudden'), ARRAY['out of the blue','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 10, 'npc', 'Awkward! Were they weird?', '気まずい！変な感じだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 11, 'user', 'A bit; I could {read between the lines} that they were nervous.', '少し、緊張してるのが行間から読み取れた。', 'read between the lines', (SELECT id FROM vocab_senses WHERE slug='read-between-lines.idiom.infer'), ARRAY['read between the lines','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 12, 'npc', 'Drama!', 'ドラマだね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 13, 'user', 'Just a little.', 'ちょっとだけね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 14, 'npc', 'Tell me everything, {{user_name}}.', '全部教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 0, 'npc', 'New hostel, new people!', '新しいホステル、新しい出会い！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 1, 'user', 'A shared dinner helped {break the ice}.', 'みんなで夕食を食べて打ち解けた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','strike up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 2, 'npc', 'Easy to chat?', '話しやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 3, 'user', 'Yeah, after {small talk} about routes.', 'うん、ルートの世間話のあとね。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 4, 'npc', 'Anyone you connected with?', '気の合った人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 5, 'user', 'One couple, totally {on the same wavelength}.', 'あるカップル、完全に波長が合った。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 6, 'npc', 'Swapping contacts?', '連絡先交換する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 7, 'user', 'Yes, we''ll {keep in touch} after the trip.', 'うん、旅のあとも連絡を取り合う。', 'keep in touch', (SELECT id FROM vocab_senses WHERE slug='keep-in-touch.idiom.contact'), ARRAY['keep in touch','small talk','break the ice','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 8, 'npc', 'Any surprises?', '驚くことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 9, 'user', 'A free tour offer came {out of the blue}.', '無料ツアーの誘いが出し抜けに来た。', 'out of the blue', (SELECT id FROM vocab_senses WHERE slug='out-of-the-blue.idiom.sudden'), ARRAY['out of the blue','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 10, 'npc', 'Nice! You''re social here.', 'いいね！ここでは社交的だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 11, 'user', 'I love how easy it is to {strike up} a chat here.', 'ここは会話を始めやすくて最高。', 'strike up', (SELECT id FROM vocab_senses WHERE slug='strike-up.phrv.begin'), ARRAY['strike up','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 12, 'npc', 'Travel brings people together.', '旅は人をつなぐね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 13, 'user', 'So true.', '本当に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 14, 'npc', 'Onward!', '次へ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 0, 'npc', 'The conference is great for contacts.', 'この会議は人脈づくりに最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 1, 'user', 'Yeah, I did {strike up} chats with three founders.', 'うん、創業者3人と会話を始めた。', 'strike up', (SELECT id FROM vocab_senses WHERE slug='strike-up.phrv.begin'), ARRAY['strike up','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 2, 'npc', 'Good networking. Easy to start?', 'いい人脈づくり。始めやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 3, 'user', 'A joke helped {break the ice} each time.', '毎回ジョークで打ち解けられた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 4, 'npc', 'Then business talk?', 'それからビジネスの話？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 5, 'user', 'After light {small talk}, yeah.', '軽い世間話のあとにね。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 6, 'npc', 'Any strong connection?', '強いつながりは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 7, 'user', 'One investor was really {on the same wavelength}.', 'ある投資家と本当に波長が合った。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 8, 'npc', 'Could you tell they were keen?', '乗り気だと分かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 9, 'user', 'I could {read between the lines}; they seemed interested.', '行間を読めた、興味ありそうだった。', 'read between the lines', (SELECT id FROM vocab_senses WHERE slug='read-between-lines.idiom.infer'), ARRAY['read between the lines','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 10, 'npc', 'Want an intro to their partner?', '相手のパートナーに紹介する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 11, 'user', 'Please, could you {put in a good word} for me?', 'ぜひ、口添えしてもらえる？', 'put in a good word', (SELECT id FROM vocab_senses WHERE slug='put-in-good-word.idiom.recommend'), ARRAY['put in a good word','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 12, 'npc', 'Consider it done.', '任せて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 13, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 14, 'npc', 'Happy to help, {{user_name}}.', '喜んで、{{user_name}}。', NULL, NULL, NULL);
