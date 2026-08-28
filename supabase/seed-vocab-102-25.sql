-- ============================================================================
-- Vocab 102: vocab-102-25 - Devices & online  (Unit 9)
-- Words: device, gadget, update, download, upload, wifi, charger, storage.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('devices-online', 'Devices & online', '機器とネット', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('device', 'device', '/dɪˈvaɪs/', '/dɪˈvaɪs/', NULL, 3, FALSE, NULL),
  ('gadget', 'gadget', '/ˈɡædʒɪt/', '/ˈɡædʒɪt/', NULL, 4, FALSE, NULL),
  ('update', 'update', '/ˈʌpdeɪt/', '/ˈʌpdeɪt/', NULL, 3, FALSE, NULL),
  ('download', 'download', '/ˈdaʊnloʊd/', '/ˈdaʊnləʊd/', NULL, 3, FALSE, NULL),
  ('upload', 'upload', '/ˈʌploʊd/', '/ˈʌpləʊd/', NULL, 3, FALSE, NULL),
  ('wifi', 'wifi', '/ˈwaɪfaɪ/', '/ˈwaɪfaɪ/', NULL, 3, FALSE, NULL),
  ('charger', 'charger', '/ˈtʃɑːrdʒər/', '/ˈtʃɑːdʒə/', NULL, 3, FALSE, NULL),
  ('storage', 'storage', '/ˈstɔːrɪdʒ/', '/ˈstɔːrɪdʒ/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='device'), 'device.n.machine', 1, TRUE, 'noun', '機器', 'a piece of electronic equipment made for a purpose', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gadget'), 'gadget.n.tool', 1, TRUE, 'noun', '小型電子機器', 'a small, clever electronic tool', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='update'), 'update.n.version', 1, TRUE, 'noun', 'アップデート', 'a newer version of software', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='download'), 'download.v.get', 1, TRUE, 'verb', 'ダウンロードする', 'to copy files from the internet to your device', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='upload'), 'upload.v.send', 1, TRUE, 'verb', 'アップロードする', 'to send files from your device to the internet', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wifi'), 'wifi.n.internet', 1, TRUE, 'noun', 'Wi-Fi', 'a wireless connection to the internet', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='charger'), 'charger.n.cable', 1, TRUE, 'noun', '充電器', 'a device used to add power to a battery', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='storage'), 'storage.n.space', 1, TRUE, 'noun', '保存容量', 'space to keep files on a device', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('device', 'gadget', 'update', 'download', 'upload', 'wifi', 'charger', 'storage')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='devices-online'
WHERE s.slug IN ('device.n.machine', 'gadget.n.tool', 'update.n.version', 'download.v.get', 'upload.v.send', 'wifi.n.internet', 'charger.n.cable', 'storage.n.space')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-25', 9, 0, (SELECT id FROM vocab_categories WHERE slug='devices-online'), 'Devices & online', '機器とインターネット', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), s.id, x.ord FROM (VALUES
  ('device.n.machine',0),('gadget.n.tool',1),('update.n.version',2),('download.v.get',3),('upload.v.send',4),('wifi.n.internet',5),('charger.n.cable',6),('storage.n.space',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'conversation', 0, 'A new phone', '新しいスマホ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'travel', 1, 'Staying connected abroad', '海外でつながる', 'hostel', 'worker'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'business', 2, 'IT setup', 'ITの初期設定', 'office', 'IT staff');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 0, 'npc', 'Is that a new phone?', 'それ新しいスマホ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 1, 'user', 'Yeah, my old {device} finally died.', 'うん、前の端末がついに壊れた。', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','gadget','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 2, 'npc', 'Nice upgrade. Lots of features?', 'いい買い替え。機能は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 3, 'user', 'It''s a clever little {gadget}, does everything.', '賢い小型機器で、何でもできる。', 'gadget', (SELECT id FROM vocab_senses WHERE slug='gadget.n.tool'), ARRAY['gadget','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 4, 'npc', 'Enough space for photos?', '写真の容量は足りる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 5, 'user', 'Tons of {storage}, way more than before.', '保存容量がたっぷりで、前よりずっと多い。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 6, 'npc', 'Battery good?', 'バッテリーはいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 7, 'user', 'Great, and it came with a fast {charger}.', 'いいよ、急速充電器も付いてた。', 'charger', (SELECT id FROM vocab_senses WHERE slug='charger.n.cable'), ARRAY['charger','wifi','storage','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 8, 'npc', 'Did you connect it to the internet?', 'ネットにつないだ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 9, 'user', 'Yes, the {wifi} set up automatically.', 'うん、Wi-Fiが自動でつながった。', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 10, 'npc', 'Software all current?', 'ソフトは最新？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 11, 'user', 'I installed the latest {update} last night.', '昨夜、最新のアップデートを入れた。', 'update', (SELECT id FROM vocab_senses WHERE slug='update.n.version'), ARRAY['update','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 12, 'npc', 'You''re all set!', '準備万端だね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 13, 'user', 'Loving it so far.', '今のところ気に入ってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 14, 'npc', 'Show me later, {{user_name}}.', 'あとで見せて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 0, 'npc', 'Need the wifi password?', 'Wi-Fiのパスワード要る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 1, 'user', 'Yes please, is the {wifi} fast here?', 'はい、ここのWi-Fiは速い？', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 2, 'npc', 'Fast enough for video.', '動画には十分速いよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 3, 'user', 'Great, I want to {download} some maps offline.', 'いいね、オフライン用に地図をダウンロードしたい。', 'download', (SELECT id FROM vocab_senses WHERE slug='download.v.get'), ARRAY['download','upload','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 4, 'npc', 'Good idea for hiking.', 'ハイキングにいいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 5, 'user', 'And {upload} my photos to the cloud.', 'それと写真をクラウドにアップロードする。', 'upload', (SELECT id FROM vocab_senses WHERE slug='upload.v.send'), ARRAY['upload','download','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 6, 'npc', 'The cloud saves space.', 'クラウドは容量の節約になるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 7, 'user', 'True, my phone {storage} is almost full.', '確かに、スマホの容量がもう一杯。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 8, 'npc', 'Do you have a charger?', '充電器は持ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 9, 'user', 'I forgot my {charger}! Can I buy one?', '充電器を忘れた！どこかで買える？', 'charger', (SELECT id FROM vocab_senses WHERE slug='charger.n.cable'), ARRAY['charger','wifi','storage','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 10, 'npc', 'The shop next door sells them.', '隣の店で売ってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 11, 'user', 'Perfect. This {device} dies so fast.', '助かる。この端末、電池の減りが速くて。', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','wifi','storage','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 12, 'npc', 'Batteries, right?', 'バッテリーね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 13, 'user', 'Always the battery.', 'いつもバッテリー。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 0, 'npc', 'Let''s get your work laptop ready.', '仕事用ノートPCを準備しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 1, 'user', 'Thanks. Is this {device} already registered?', 'ありがとう。この端末はもう登録済み？', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','gadget','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 2, 'npc', 'Yes. First, run the software.', 'うん。まずソフトを起動して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 3, 'user', 'Should I install the security {update} now?', 'セキュリティのアップデートを今入れる？', 'update', (SELECT id FROM vocab_senses WHERE slug='update.n.version'), ARRAY['update','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 4, 'npc', 'Please do. Then the apps.', 'お願い。次にアプリを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 5, 'user', 'I''ll {download} the team tools.', 'チームのツールをダウンロードするよ。', 'download', (SELECT id FROM vocab_senses WHERE slug='download.v.get'), ARRAY['download','upload','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 6, 'npc', 'Save files to the server, not local.', 'ファイルはローカルじゃなくサーバーに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 7, 'user', 'Got it, I''ll {upload} everything to the shared drive.', '了解、全部共有ドライブにアップロードする。', 'upload', (SELECT id FROM vocab_senses WHERE slug='upload.v.send'), ARRAY['upload','download','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 8, 'npc', 'That keeps your disk free.', 'ディスクが空くね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 9, 'user', 'Good, local {storage} fills up fast.', 'うん、ローカル容量はすぐ一杯になる。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 10, 'npc', 'Connect to the office network too.', '社内ネットワークにもつないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 11, 'user', 'Done, I''m on the company {wifi}.', '完了、会社のWi-Fiにつながった。', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 12, 'npc', 'You''re ready to go.', 'これで準備完了。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 13, 'user', 'Thanks for the help.', '手伝ってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);
