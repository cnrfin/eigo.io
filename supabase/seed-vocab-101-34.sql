-- ============================================================================
-- Vocab 101: Lesson 34 (A2): "Bank & post"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): account, send, form, sign, open, close, letter, stamp.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bank-post', 'Bank and post', '銀行と郵便', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('account', 'account', NULL, NULL, NULL, 2, FALSE, NULL),
  ('send', 'send', NULL, NULL, NULL, 2, FALSE, NULL),
  ('form', 'form', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sign', 'sign', NULL, NULL, NULL, 2, FALSE, NULL),
  ('open', 'open', NULL, NULL, NULL, 2, FALSE, NULL),
  ('close', 'close', NULL, NULL, NULL, 2, FALSE, NULL),
  ('letter', 'letter', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stamp', 'stamp', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='account'), 'account.n.bank', 1, TRUE, 'noun', '口座', 'an arrangement to keep money at a bank', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='send'), 'send.v.mail', 1, TRUE, 'verb', '送る', 'to make something go to a place or person', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='form'), 'form.n.doc', 1, TRUE, 'noun', '用紙', 'a printed paper with spaces to fill in', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sign'), 'sign.v.write', 1, TRUE, 'verb', '署名する', 'to write your name on something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='open'), 'open.v.start', 1, TRUE, 'verb', '開ける', 'to start or make available', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='close'), 'close.v.shut', 1, TRUE, 'verb', '閉じる', 'to shut or stop something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='letter'), 'letter.n.mail', 1, TRUE, 'noun', '手紙', 'a written message sent by post', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stamp'), 'stamp.n.mail', 1, TRUE, 'noun', '切手', 'a small paper you stick on mail to pay for it', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('account','send','form','sign','open','close','letter','stamp')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='open.v.start'), (SELECT id FROM vocab_senses WHERE slug='close.v.shut'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='close.v.shut'), (SELECT id FROM vocab_senses WHERE slug='open.v.start'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bank-post'
WHERE s.slug IN ('account.n.bank','send.v.mail','form.n.doc','sign.v.write','open.v.start','close.v.shut','letter.n.mail','stamp.n.mail')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-34', 12, 1, (SELECT id FROM vocab_categories WHERE slug='bank-post'), 'Bank & post', '銀行と郵便', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), s.id, x.ord
FROM (VALUES
  ('account.n.bank',0),('send.v.mail',1),('form.n.doc',2),('sign.v.write',3),('open.v.start',4),('close.v.shut',5),('letter.n.mail',6),('stamp.n.mail',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'travel', 0, 'Opening an account', '口座を開く', 'bank', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'conversation', 1, 'Sending a letter', '手紙を送る', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'business', 2, 'Paperwork', '書類仕事', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 0, 'npc', 'Good afternoon. How can I help?', 'こんにちは。どうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 1, 'user', 'I''d like to {open} a savings account.', '貯金口座を開きたいです。', 'open', (SELECT id FROM vocab_senses WHERE slug='open.v.start'), ARRAY['close','open','lose','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 2, 'npc', 'Sure. Please fill this {form}.', 'かしこまりました。この用紙にご記入を。', 'form', (SELECT id FROM vocab_senses WHERE slug='form.n.doc'), ARRAY['letter','list','card','form']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 3, 'user', 'Done. Where do I {sign}?', '書けました。どこにサインを？', 'sign', (SELECT id FROM vocab_senses WHERE slug='sign.v.write'), ARRAY['close','sign','send','open']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 4, 'npc', 'Here. And your {account} is ready.', 'こちらです。口座ができました。', 'account', (SELECT id FROM vocab_senses WHERE slug='account.n.bank'), ARRAY['letter','account','ticket','stamp']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 5, 'user', 'Wonderful. Thank you!', '素晴らしい。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 6, 'npc', 'My pleasure.', 'どういたしまして。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 0, 'npc', 'What are you writing?', '何を書いてるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 1, 'user', 'A hand-written {letter} to my grandma.', 'おばあちゃんへの手書きの手紙。', 'letter', (SELECT id FROM vocab_senses WHERE slug='letter.n.mail'), ARRAY['card','list','form','letter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 2, 'npc', 'How sweet. Will you {send} it today?', '素敵。今日送るの？', 'send', (SELECT id FROM vocab_senses WHERE slug='send.v.mail'), ARRAY['open','close','send','sign']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 3, 'user', 'Yes, once I buy a {stamp}.', 'うん、切手を買ったら。', 'stamp', (SELECT id FROM vocab_senses WHERE slug='stamp.n.mail'), ARRAY['stamp','coin','card','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 4, 'npc', 'The post office is about to {close}.', '郵便局、もうすぐ閉まるよ。', 'close', (SELECT id FROM vocab_senses WHERE slug='close.v.shut'), ARRAY['sign','open','close','send']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 5, 'user', 'Then I''ll hurry!', 'じゃあ急ぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 6, 'npc', 'Good luck!', '頑張って！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 0, 'npc', 'Can you handle the new client forms?', '新規顧客の書類、お願いできる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 1, 'user', 'Sure. Which {form} first?', 'うん。どの用紙から？', 'form', (SELECT id FROM vocab_senses WHERE slug='form.n.doc'), ARRAY['form','card','letter','list']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 2, 'npc', 'This one. Please {sign} at the bottom.', 'これ。下にサインして。', 'sign', (SELECT id FROM vocab_senses WHERE slug='sign.v.write'), ARRAY['open','close','send','sign']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 3, 'user', 'Done. Should I {send} it to accounting?', 'できた。経理に送る？', 'send', (SELECT id FROM vocab_senses WHERE slug='send.v.mail'), ARRAY['close','sign','send','open']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 4, 'npc', 'Yes, and note the {account} number.', 'うん、口座番号も控えて。', 'account', (SELECT id FROM vocab_senses WHERE slug='account.n.bank'), ARRAY['ticket','letter','account','stamp']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 5, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 6, 'npc', 'Thanks!', 'ありがとう！', NULL, NULL, NULL);
