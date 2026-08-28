-- ============================================================================
-- Vocab 103: vocab-103-7 - Spending & saving  (Unit 4)
-- Words: splurge, scrape by, rip off, chip in, dip into, fork out, shell out, tighten your belt.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('spending-saving-c1', 'Spending & saving', 'お金の使い方', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('splurge', 'splurge', '/splɜːrdʒ/', '/splɜːdʒ/', NULL, 5, FALSE, NULL),
  ('scrape by', 'scrape by', '/ˌskreɪp ˈbaɪ/', '/ˌskreɪp ˈbaɪ/', NULL, 5, FALSE, NULL),
  ('rip off', 'rip off', '/ˌrɪp ˈɔːf/', '/ˌrɪp ˈɒf/', NULL, 5, FALSE, NULL),
  ('chip in', 'chip in', '/ˌtʃɪp ˈɪn/', '/ˌtʃɪp ˈɪn/', NULL, 5, FALSE, NULL),
  ('dip into', 'dip into', '/ˌdɪp ˈɪntuː/', '/ˌdɪp ˈɪntuː/', NULL, 5, FALSE, NULL),
  ('fork out', 'fork out', '/ˌfɔːrk ˈaʊt/', '/ˌfɔːk ˈaʊt/', NULL, 5, FALSE, NULL),
  ('shell out', 'shell out', '/ˌʃel ˈaʊt/', '/ˌʃel ˈaʊt/', NULL, 5, FALSE, NULL),
  ('tighten your belt', 'tighten your belt', '/ˌtaɪtn jər ˈbelt/', '/ˌtaɪtn jə ˈbelt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='splurge'), 'splurge.v.spend', 1, TRUE, 'verb', '奮発する', 'to spend a lot of money on a treat', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scrape by'), 'scrape-by.phrv.survive', 1, TRUE, 'phrasal verb', '何とかやりくりする', 'to manage with barely enough money', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rip off'), 'rip-off.phrv.overcharge', 1, TRUE, 'phrasal verb', 'ぼったくる', 'to charge someone far too much money', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chip in'), 'chip-in.phrv.contribute', 1, TRUE, 'phrasal verb', 'お金を出し合う', 'to give some money as part of a group', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dip into'), 'dip-into.phrv.usesavings', 1, TRUE, 'phrasal verb', '（貯金に）手をつける', 'to use part of your savings', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fork out'), 'fork-out.phrv.pay', 1, TRUE, 'phrasal verb', '（渋々）大金を払う', 'to pay a lot of money, often unwillingly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shell out'), 'shell-out.phrv.pay2', 1, TRUE, 'phrasal verb', '大金を払う', 'to pay a large amount of money for something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tighten your belt'), 'tighten-your-belt.idiom.economize', 1, TRUE, 'idiom', '節約する', 'to spend less money because you have less', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('splurge', 'scrape by', 'rip off', 'chip in', 'dip into', 'fork out', 'shell out', 'tighten your belt')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='spending-saving-c1'
WHERE s.slug IN ('splurge.v.spend', 'scrape-by.phrv.survive', 'rip-off.phrv.overcharge', 'chip-in.phrv.contribute', 'dip-into.phrv.usesavings', 'fork-out.phrv.pay', 'shell-out.phrv.pay2', 'tighten-your-belt.idiom.economize')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-7', 4, 0, (SELECT id FROM vocab_categories WHERE slug='spending-saving-c1'), 'Spending & saving', 'お金を使う・貯める', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), s.id, x.ord FROM (VALUES
  ('splurge.v.spend',0),('scrape-by.phrv.survive',1),('rip-off.phrv.overcharge',2),('chip-in.phrv.contribute',3),('dip-into.phrv.usesavings',4),('fork-out.phrv.pay',5),('shell-out.phrv.pay2',6),('tighten-your-belt.idiom.economize',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'conversation', 0, 'Payday plans', '給料日の予定', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'travel', 1, 'Trip costs', '旅の出費', 'street', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'business', 2, 'Cost overruns', '予算超過', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 0, 'npc', 'Payday! Any plans?', '給料日！予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 1, 'user', 'I might {splurge} on concert tickets.', 'コンサートのチケットに奮発するかも。', 'splurge', (SELECT id FROM vocab_senses WHERE slug='splurge.v.spend'), ARRAY['splurge','scrape by','chip in','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 2, 'npc', 'Nice! Can you afford it?', 'いいね！余裕ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 3, 'user', 'Just about; I usually {scrape by} till payday.', 'ぎりぎり。いつも給料日まで何とかやりくりしてる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 4, 'npc', 'We''re planning a group gift for Ana.', 'アナへのグループプレゼントを計画中。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 5, 'user', 'Count me in; I''ll {chip in} twenty.', '入れて、20出すよ。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 6, 'npc', 'Thanks. Big month for you?', 'ありがとう。今月は出費多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 7, 'user', 'A bit; I had to {dip into} my savings for rent.', '少し。家賃で貯金に手をつけた。', 'dip into', (SELECT id FROM vocab_senses WHERE slug='dip-into.phrv.usesavings'), ARRAY['dip into','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 8, 'npc', 'Ouch. Cutting back?', '痛いね。節約する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 9, 'user', 'Yeah, time to {tighten your belt} a little.', 'うん、少し節約する時期だね。', 'tighten your belt', (SELECT id FROM vocab_senses WHERE slug='tighten-your-belt.idiom.economize'), ARRAY['tighten your belt','splurge','chip in','rip off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 10, 'npc', 'That gym you quit was pricey.', '辞めたジム、高かったよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 11, 'user', 'So expensive; it was a total {rip off}.', '高すぎ、完全にぼったくりだった。', 'rip off', (SELECT id FROM vocab_senses WHERE slug='rip-off.phrv.overcharge'), ARRAY['rip off','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 12, 'npc', 'Good you left.', '辞めて正解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 13, 'user', 'Saving now feels good.', '今は貯金が気持ちいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 14, 'npc', 'Smart, {{user_name}}.', '賢いね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 0, 'npc', 'This trip is getting expensive.', 'この旅、高くついてきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 1, 'user', 'Yeah, we had to {fork out} for the flights.', 'うん、航空券に大金を払った。', 'fork out', (SELECT id FROM vocab_senses WHERE slug='fork-out.phrv.pay'), ARRAY['fork out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 2, 'npc', 'And the hotel wasn''t cheap.', 'ホテルも安くなかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 3, 'user', 'No, we {shell out} a lot for the sea view.', 'うん、海の見える部屋に結構払った。', 'shell out', (SELECT id FROM vocab_senses WHERE slug='shell-out.phrv.pay2'), ARRAY['shell out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 4, 'npc', 'That taxi overcharged us.', 'あのタクシー、ぼられたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 5, 'user', 'Totally. He tried to {rip off} tourists.', '完全に。観光客をぼったくろうとした。', 'rip off', (SELECT id FROM vocab_senses WHERE slug='rip-off.phrv.overcharge'), ARRAY['rip off','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 6, 'npc', 'Let''s be careful now.', 'これから気をつけよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 7, 'user', 'Agreed; we can {scrape by} on street food.', '賛成、屋台で何とかやりくりできる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 8, 'npc', 'But one nice meal?', 'でも一度はいい食事を？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 9, 'user', 'Okay, let''s {splurge} once on the harbor place.', 'よし、一度は港の店で奮発しよう。', 'splurge', (SELECT id FROM vocab_senses WHERE slug='splurge.v.spend'), ARRAY['splurge','scrape by','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 10, 'npc', 'Deal. Split it?', '決まり。割り勘？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 11, 'user', 'Yes, everyone can {chip in} equally.', 'うん、みんなで均等に出し合おう。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 12, 'npc', 'Fair for all.', 'みんな公平。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 13, 'user', 'Perfect.', '完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 14, 'npc', 'Let''s enjoy it!', '楽しもう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 0, 'npc', 'The project went over budget.', 'プロジェクトが予算オーバーした。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 1, 'user', 'We had to {fork out} extra for materials.', '材料費に追加で大金を払った。', 'fork out', (SELECT id FROM vocab_senses WHERE slug='fork-out.phrv.pay'), ARRAY['fork out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 2, 'npc', 'And the software licenses?', 'ソフトのライセンスは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 3, 'user', 'We {shell out} a lot for those too.', 'あれにも結構払った。', 'shell out', (SELECT id FROM vocab_senses WHERE slug='shell-out.phrv.pay2'), ARRAY['shell out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 4, 'npc', 'Finance wants cuts.', '財務が削減を求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 5, 'user', 'Then we all {tighten your belt} next quarter.', 'なら来期はみんな節約だ。', 'tighten your belt', (SELECT id FROM vocab_senses WHERE slug='tighten-your-belt.idiom.economize'), ARRAY['tighten your belt','splurge','chip in','rip off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 6, 'npc', 'Any reserve funds?', '予備資金は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 7, 'user', 'We can {dip into} the contingency budget.', '予備予算に手をつけられる。', 'dip into', (SELECT id FROM vocab_senses WHERE slug='dip-into.phrv.usesavings'), ARRAY['dip into','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 8, 'npc', 'Barely enough, though.', 'でもぎりぎりだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 9, 'user', 'We''ll {scrape by} if we''re careful.', '慎重にやれば何とかなる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 10, 'npc', 'Could departments help?', '各部署が協力できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 11, 'user', 'Maybe each team can {chip in} a little.', '各チームが少しずつ出し合えるかも。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 12, 'npc', 'I''ll propose it.', '提案するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 13, 'user', 'Good plan.', 'いい案。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
