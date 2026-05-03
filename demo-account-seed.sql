-- ============================================
-- DEMO ACCOUNT FOR APPLE REVIEWER
-- review@eigo.io / EigoReview2026!
-- User ID: b30e6c61-6b7b-4ba4-aa2d-e8114ab24d6b
-- ============================================

DO $$
DECLARE
  v_user_id UUID := 'b30e6c61-6b7b-4ba4-aa2d-e8114ab24d6b';
  v_booking1_id UUID;
  v_booking2_id UUID;
  v_booking3_id UUID;
  v_phrase_id UUID;
BEGIN

-- 1. Profile
INSERT INTO profiles (id, email, display_name, preferred_language, avatar_url, theme, created_at, updated_at)
VALUES (v_user_id, 'review@eigo.io', 'Apple Reviewer', 'en', NULL, 'dark', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Notification preferences
INSERT INTO notification_preferences (id, user_id, push_enabled, lesson_reminders, review_reminders, news_updates, promotional, review_reminder_time, created_at, updated_at)
VALUES (gen_random_uuid(), v_user_id, true, true, true, true, false, '09:00', NOW(), NOW())
ON CONFLICT DO NOTHING;


-- Booking 1: 2026-04-10, 45min (WITH summary)
INSERT INTO bookings (id, user_id, date, start_time, duration_minutes, status, whereby_meeting_id, transcription_id, transcript_text, cleaned_transcript, created_at, updated_at)
VALUES (gen_random_uuid(), v_user_id, '2026-04-10', '00:00:00', 45, 'confirmed', '127043621', 'c30bea4c-eda9-4c07-b77e-ba324c6a7917', '
Speaker 0: How''s it going?

Speaker 1: That''s a good ending? Good.

Speaker 0: Okay. Yeah. Doing well. Thanks. Pretty good.

Mhmm. Okay. Well, yeah, again, any news, or would you like to practice IELTS, or what would you?

Speaker 1: Yeah. I''ll I''ll drive to practice for IELTS.

Speaker 0: Oh, okay. Okay. Sure. Mhmm. Yep.

Let me get my document open here now.

Speaker 1: Sorry. I have, one question from my husband.

Speaker 0: Oh, sure. Sure.

Speaker 2: Yeah.

Speaker 1: How how that thing British in Rust football game England?

Speaker 0: Oh, yeah. England. Japan won against England. Right? Yeah.

Well well, that''s for me. Again, I''m happy Japan. But I''m happy if both teams win, so so it''s fine. But, I I guess, lots of British England fan or, of course, disappointed with the result. But but since this was just, like, a friendlies game or friendly match then, yeah, it wasn''t like World Cup or, like, an important tournament.

I I think most people, yeah. Not not happy but not angry either so just it''s, yeah, not not too bad

Speaker 1: oh, I, actually, I didn''t watch two time game. However, I watched, shot cut game video. I think, England football team has has changed. Game style to Rooney''s, ages, gymnastics. Mhmm.

Speaker 2: So,

Speaker 1: I have recently Gen z''s football game or other sports too. Mhmm. The Gen z athlete dislike conflict or race Mhmm. In the game. So Japanese football team too, they are not star player in the team.

Almost all same level and corporate game.

Speaker 0: Right. Right.

Speaker 1: Mhmm. Our our generation''s football team, almost all strong football team has a star player. For example, Neymar, me Mhmm.

Speaker 2: Or,

Speaker 1: a bit old sausage. Oh. The gum?

Speaker 0: Gerald. Steven Gerald. Oh. Yeah. Yeah.

Speaker 2: Yeah. Yeah. Yeah. Yeah. Yeah.

Yeah.

Speaker 0: Yeah. Yeah. Yeah. Yeah. Yeah.

Yeah. Yeah.

Speaker 1: Yeah. Yeah. Yeah. Yeah.

Speaker 0: Yes. No one who is very, astounding, I suppose. So

Speaker 2: Yeah. Yeah. Yeah. Yeah. Yeah.

Speaker 0: Oh, no. Astounding players. Yeah. I guess well, I think, yeah, England used to have some good players. I I guess, Harry Kane still playing for England.

I''m sure. Maybe he moved to another team, Aston Villa or some someone. Let me check. Is Harry King playing? Oh, well, yeah.

I guess he''s still playing. Or maybe he played in the match with Japan, but I I didn''t watch this. Let''s see here. But, but, yeah, I guess they''re calling England''s football team a failed experiment. Or it seems that, I guess England''s manager is trying to find or or trying to mix up the team.

So it''s kind of like experiment to see who would be well or who would play well for this team. Oh, actually, though, this is without Kane. So maybe Kane did not play at this Japan versus England match. So Kane was absent from the team, like, team list against Japan after suffering minor issue. Oh, yeah.

I guess he got an injury recently, so he couldn''t play against Japan. Okay. So maybe if Harry Kane was playing, then Mhmm. Maybe Japan could not win win against England. But

Speaker 1: So so England team play style is different. I I feel I feel different to my image England style. Right.

Speaker 0: Yeah. But I guess, yeah, without Harry Kane, England''s football team is not impressive or not special. Just I think only Harry Kane is the good player for England. Oh. Liverpool too also have similar situation.

So Liverpool''s best player is oh, what''s his name again? Actually, I forget. Mo Salah. Mo Salah is, yeah, Liverpool''s best football player. But, yeah, Mohammed Salah or Mol Salam.

Yeah. He he was Liverpool''s best football player, but he left Liverpool, maybe last week or two weeks ago. Three. So now yeah. Yeah.

Recently.

Speaker 1: Is over 30 age.

Speaker 0: Oh, wow. Yeah. 33, I guess. 33.

Speaker 1: Oh, 33?

Speaker 0: Years old. But, yeah, he was, I think, Liverpool''s best player. But

Speaker 1: Sorry. My husband always said, Arab Arab side persons,

Speaker 0: Oh, beard. Beard. Mhmm.

Speaker 1: A beard. Very muscular.

Speaker 0: Oh, oh, yeah. Yeah. I can say.

Speaker 1: Has everyone always surprised. Yeah. Yeah. We''ve watched Arab Arabian person''s beard. Mhmm.

Why they come have beard in the rug and

Speaker 0: Very thick, I guess.

Speaker 1: What''s in yeah. See.

Speaker 0: Yeah. I guess yeah. I noticed many Arabian people or Middle Eastern people. For some reason, just I guess, genetically, they can grow, a very thick beard like I suppose. Because, yeah, many white people or I guess, yeah, for Japanese people too, it''s difficult to grow this kind of beard, I think.

Oh, I never see a Japanese person with his beard actually.

Speaker 1: Mhmm. Yeah. Yeah. A private England British person too. Some of the people have very strong beards.

Speaker 0: Yeah. I guess, well, we have some of my friends also have quite a 50. Well, one sec. Sorry. One second.

There''s slight delay. Let me Turn. Yeah. Just the connection is a little delayed. Sorry.

One second. Let''s try refreshing the classroom. Okay. Mhmm. Oh.

Speaker 1: Okay. You hear me?

Speaker 0: Yeah. Yeah. Can you hear me?

Speaker 1: Oh, okay.

Speaker 0: Oh, okay. Good. Yeah. Sorry. I I can I think there''s some connection problem, but we were saying, yeah, Japanese people do not grow such a

Speaker 1: Yeah? Yeah. What yeah. Actually, my husband''s beer is very marboro?

Speaker 0: Patchy. Mhmm.

Speaker 1: Patchy. Oh, patchy. Yeah. My husband''s husband''s beer is patchy. So when he doesn''t shave his beard one week Mhmm.

It''s it''s very not good looking.

Speaker 0: Yeah. Yeah. Yeah. It''s not not attractive, I I suppose.

Speaker 1: Yeah. Yeah. Yeah.

Speaker 0: The, me me too. I I can''t grow this type of beard as well. So maybe after, like, one after one week or two week, I have to shave my beard because it''s, not patchy, but, yeah, just it doesn''t look very thick like this one. So I always, like, shave my beard after two weeks.

Speaker 1: Mhmm. He if he face, down top, maybe I can see same face. There are interesting picture in Japan, traditional, and one of the famous old picture. This picture is can,

Speaker 2: downside to

Speaker 0: I see. I see. It looks so there''s a yeah. We we have similar pictures in England too. We''ll just, like, if you turn it upside down, you can see another picture, I guess.

So

Speaker 1: Yeah. Yeah. Yeah. Mhmm. Bear to hair picture.

Mhmm.

Speaker 0: Oh, alright. I see. I see.

Speaker 1: We say it''s like Sarah''s type. We see oh, his face is if up upside down Mhmm. I can we can see same face.

Speaker 0: Right. Right. Yeah. Because his beard and her, like, same thickness or, like, almost the same. Mhmm.

Mhmm. Oh, oh, yeah. I I was thinking of Yeah.

Speaker 1: I I so sorry. I I Okay. Oh, sorry. I have a a another question for the your recent service. Oh, yeah.

Yeah. Yeah. I I can sign in this new site, and I can book yours. Mhmm. Mhmm.

However, I can choice we I could choice fifteen.

Speaker 2: Fifteen? Oh, yeah. Yeah. It''s fine.

Speaker 0: Well, I I updated your page, so it should be final. Let me see. Because I, yeah, this morning, I connect your profile with your subscription. So it should be okay. One second.

If you try now, then you should be able to book thirty minutes or forty five minutes or sixty minutes lessons. And not only

Speaker 1: book because fifteen minutes are harder.

Speaker 0: Oh, oh, yeah. This is this is your page. Right? So Oh, yeah.

Speaker 1: Oh, okay.

Speaker 0: Yeah. I I changed it to forty five because, Oh,

Speaker 1: thank you very much.

Speaker 0: Yeah. Because, before your account was not connected. You were just using, like, a free account. But I, I connected your old subscription to your new account on the new website. So, yeah, we can do, the full lesson today.

It''s Okay. But, yeah, I guess we''ll have to from now, we have to stay strict to the lesson minutes because, actually, each lesson is recorded. And, there''s also a transcript for each lesson. So, for each lesson, we should stick to the lesson time instead of going over time, too much because it might break something with my website. But, yeah, anyway, we can do the full lesson, today.

It''s no issue.

Speaker 2: Mhmm. Mhmm.

Speaker 0: Yeah. Or any other questions about the website?

Speaker 1: Oh, I''m okay. Yeah. I''m okay now.

Speaker 0: Okay. Okay. Good. Yeah. Okay.

Well, let''s see. Well, we''ll move on to, maybe some IELTS practice if there''s no other questions. So yeah, let me again open IELTS. Okay. Yeah.

So I guess like a few weeks ago or maybe last month we were doing like this, these IELTS questions. We talked about, if you''ve ever complained about something you''ve bought before. But I I guess we will continue on with these IELTS questions here. So maybe second one. Would you go back to a shop you have had a bad experience in before?

Speaker 1: Oh, we talked about this question just a few few weeks ago.

Speaker 0: Mhmm. Right. Right. So maybe we did the first one. Have you ever complained about something?

Speaker 1: Yeah. Yeah. Yeah.

Speaker 0: You have both. Right? Maybe this one down here, would you Oh. Go back to Asia. Would you go back?

You''ve had the bug experience before? Mhmm.

Speaker 1: I I don''t go too bug a shop. I have bad experience when I have bad experience. Exactly, I, I have one experience. Mhmm. I went to the supermarket near my working area.

Mhmm. One of the staff bring the cart and this cart hit me. I heard this stuff didn''t didn''t see me and said, sorry. So, I I was very surprising and, actually, I had ache.

Speaker 0: Oh. A part of Oh. So

Speaker 1: and other staff watches the situation. However, almost all staff didn''t say that didn''t apology me. So I I''m very surprised. And afterward, I called Mhmm. This supermarket Mhmm.

Mhmm. Company

Speaker 0: Yeah.

Speaker 1: For customer service. I sent this experience. After this shop owner Mhmm. Approaches me on the call on the telephone. However, it is it was but we were we addressed from other stars.

So I think this company or supermarket style don''t change their behavior.

Speaker 0: Okay. Because

Speaker 1: almost all staff didn''t approach and didn''t say me anything. So so I never go to this supermarket this experience. I''ve been more this experience.

Speaker 0: Okay. Yeah. Okay. Good. Yeah.

That let me, bring on. One, go. 122, this supermarket, after this experience. Okay. Yeah.

I''ve just been writing a transcript or not. Here. Yeah. Yeah. I I think this is fine.

I I changed some of it. I corrected some of the mistakes, though. Yeah. I guess I think I created this one. So one staff member hit me hit me with the I think you said I was

Speaker 1: Oh, hit me. Yeah.

Speaker 0: Oh, maybe, though. I was hit by a cart from but but, yeah, this this is more natural. I think one staff member hit me with the shopping cart. Yeah. This staff member didn''t see me or say sorry.

So I was very surprised. Actually, I felt oh, yeah. Maybe you said I I had ache, but maybe I felt physically hurt by this incident would be, better, I guess. After that, I called the supermarkets, maybe supermarkets customer service department. That''s actually better.

Speaker 1: Yeah. Mhmm. Customer service department.

Speaker 0: Mhmm. To talk or to complain about it. So if I caught it right, the shop''s owner apologize to you, but you weren''t satisfied with it. Right? So, yeah, I think this is fine.

I think the shop will not change their behavior because, you didn''t get an apology from the staff member who did it or the staff themselves. Okay. Yeah. Yeah. I think that''s all fine.

Okay. Yeah. Let''s, move on then to the next one. Or this one. What things do people from Japan usually complain about?

Speaker 1: Maybe Japanese people dislike b. Right? Mhmm. Mhmm. Situation.

For example, little people complain for train delay situation. Actually, I have seen the person complain station to train station stop for trains today. And, Japanese people who went to abroad. What Person said they they were surprised at the foreign train or bus almost all day time. So we dislike Mhmm.

Be rate situation. I don''t know why. However, according to my husband, my husband came from heavy snowing area. So he he said if the person is wait ten minutes, other person may be dead. Oh.

There''s snowing outside. So, it is important to go on time. Mhmm. Anything. Anytime.

Mhmm. Mhmm. Everywhere. Right.

Speaker 0: It''s so it''s important to be on time. Anytime or or or, yeah, at any place at any time.

Speaker 1: Mhmm. Yeah. And, relatively Japanese people think, always the person could always be right. This person

Speaker 0: from Oh.

Speaker 1: Other person.

Speaker 0: So

Speaker 2: So

Speaker 1: A relative Japanese people angry for always relate person or train day or bus train too. We think ropes my

Speaker 0: my my lights. I see. Oh, I guess that''s fine. Okay. Yeah.

Again, I didn''t really change too much, I think. Yeah, just for example, a lot of people complain about trains being late. I think I changed something here. Mhmm. Oh, being delayed.

Mhmm. Yeah. Maybe I also corrected this one. Japanese people who go abroad are often surprised by the lateness of public transport in those countries. Mhmm.

Yeah.

Speaker 1: Lateness.

Speaker 0: Mhmm. Lateness.

Speaker 1: What is the lateness? Lateness is the lateness.

Speaker 0: So lateness, yeah, like, the the noun of being late. So, the lateness is now. And relate is adjective. Mhmm. Mhmm.

Oh, yeah. If we add ness to the end of a adjective, it always becomes a noun. So because mhmm. Yeah. Mhmm.

Mhmm. Kindness. Kindness. Cuteness. So maybe we could watch these colors.

Redness, I suppose. The redness of the flower or the blue. So, yeah, I I guess it maybe not actual word, but I can understand easily, this meaning, I think.

Speaker 1: Oh, college name, for example, red, blue, pink, black, almost all a adjective word.

Speaker 0: Yeah. Yeah. Because I I guess we use these words to describe the color of something. So I suppose, yeah, red, blue, pink, purple, green, all adjectives in in English.

Speaker 1: Can''t I say night is dark? Correct sentence is night is darkness.

Speaker 0: Well, I guess, dark itself, we don''t consider to be a color. So, I I guess you could say, like, the the night is darkness. See, I guess it has a kind of Shakespearean feeling to it, I guess. So kind of like a

Speaker 1: The Like kind of

Speaker 0: deep meaning. Concurral,

Speaker 1: frustration. Your shot is blue, or your blue shot is blue. Mhmm.

Speaker 0: Well, I guess, in that case, this is your shirt is blue. You just use the adjective to describe the shirt. May maybe you could say, like, the blueness, of of of your shirt

Speaker 2: is maybe

Speaker 0: hello? Hello? Like, like, a not or or how how should we put it? So the blueness of your shirt is oh, like, bright or dark or dim, I guess. Because, yeah, if because we already use a noun here, so we need an adjective to describe the noun.

Well, I guess, since shirt is also a noun too, but, actually, it''s I''ve never thought about it before. But

Speaker 1: It it is it is blue jeans, blue blue

Speaker 0: BlueJeans. Yeah. We just say BlueJeans. Again, when when we add to something, it''s talking about the, I guess, level or degree of how blue something is. So Oh,

Speaker 1: no. No.

Speaker 0: No. The blueness, like, the level of how blue something is. The same with, yeah, darkness, like, the level of how dark something is or, yeah, cuteness, the level of how something cute something is.

Speaker 1: Can I say all rebel this word? Can we see the word for all level? I think darkness is very, very dark image. However, correct meaning is right target.

Speaker 0: Yeah. How how dark it is. So, for example, we have a darkness of this room is, yeah, not too dark, for example. Or it''s it''s dark, but the level of the darkness is not too dark.

Speaker 1: Oh. Mhmm. I I then we different

Speaker 0: Oh.

Speaker 1: Image. This room is not too dark. Mhmm.

Speaker 0: Oh, I guess, to rewrite the server, the level of mhmm. Oh, I guess it''s may makes it more complicated if I say, like, the level of the dock in this room is not too dark. But, it was simply

Speaker 1: brightness. Oh, sorry. It''s a witness to rate, time, level,

Speaker 0: or or

Speaker 2: Lightness? Oh, yeah. Yeah.

Speaker 0: Yeah. So, for example, what how do we use lateness in a sentence? Maybe his lateness is not acceptable. Well, in a sentence, it means, like, the the amount of time he is late is not acceptable, I guess. So, for example, maybe, like, one minute late is okay or two minutes late is okay, but maybe he''s five minutes or ten minutes late, so it''s not acceptable.

So the level of or the Mhmm. In this case, the amount of time he is late is not acceptable. Mhmm.

Speaker 1: If I if I use these words, greatness or darkness or cuteness, I need to describe this rebel in the sentence.

Speaker 2: I I I suppose,

Speaker 0: Yeah. I guess, usually, we have, like, is. So we we''re describing lateness is not acceptable. I guess, darkness of the room is the subject is and then we describe it using the be verb is here. Well, so we could also say, like, quickness quickness of

Speaker 2: of

Speaker 0: Amazon is very convenient. Or we could just shout it shorten it to the quickness. We don''t have to say of Amazon. But if we''re talking about Amazon, then we could say this sentence. The quickness is very convenient.

Speaker 1: This quickness would describe delivery''s time? Yeah.

Speaker 0: Yeah. So delivery time. Mhmm.

Speaker 1: That that means to me, I''m I have different image for this word.

Speaker 0: I I see. Just you thought it meant, like, very dark. Darkness mean very dark. I I see. But, yeah, I guess the level could be very or not very or or short or long or it''s,

Speaker 1: Oh, happiness too.

Speaker 0: Oh, which one?

Speaker 1: It''s happiness. Happiness.

Speaker 0: Happiness. Oh, yeah. Happiness. Yeah. Happiness.

Mhmm. So, yeah, happiness just describes how happy someone is or the level of happiness.

Speaker 1: I think happiness is a super happy image.

Speaker 0: Oh, right. Right. Yes. So, yeah, not, doesn''t mean very happy. It just means, the level of happy feeling, I I suppose.

So, for example, there is, not much happiness in the world nowadays. It''s a very sad sentence, I guess, but maybe true.

Speaker 1: However, if I watch this sentence, I think the person has a little happy. However, super he''s not super happy. However, real meaning is the person

Speaker 0: the person thinks life is not happy or

Speaker 1: Not almost all not happy. Mhmm. Mhmm. Oh, hey.

Speaker 0: May maybe there''s a yeah. Not much. So I guess it implies some something makes them happy, but, most things do not make them happy. 90% of things are not happy, but maybe 10% of things make them happy, maybe.

Speaker 1: Mhmm. There there are Japanese artist music title is happiness. Mhmm. So this this this music is very, happy song. So I''m happy to be super happy.

In this. Oh. Oh. Bees in Japanese band name is bees. Bees?

Yeah. Bees. And this music title is happiness.

Speaker 0: Oh, I I see. I see. Well, yeah, I guess if the song sounds very happy, then I can understand it''s a high level of happiness, not happiness. Maybe if it was called happiness, but the song is like minor key or sad sounding, then yeah. I guess it''s yeah.

Maybe titles is okay, but it describes low level of happiness if it''s a sad song. Oh, sadness too.

Speaker 1: Oh, sadness. Sadness is not big,

Speaker 2: sad situation.

Speaker 0: Yeah. Yeah. Not big not, doesn''t doesn''t mean very sad. It just means that there is a level of sadness. So it could be a little sad or very sad or depends on the situation.

Speaker 1: Is it loneliness too?

Speaker 0: Oh, yeah. Yeah. Loneliness as well. Oh, so how you spell loneliness? Oh, yeah.

So it needs an e.

Speaker 2: Oh, loneliness.

Speaker 0: But any pretty much any adjective, you can turn into a noun. So

Speaker 1: Why are there with the loneliness in

Speaker 0: Yeah. I well, I suppose yeah. If you''re I I feel like lonely is either you''re lonely or not lonely. I I guess it''s only like Yeah.

Speaker 2: Yeah. Yeah.

Speaker 0: Because you can''t be oh, oh, may maybe, yeah, some people are not lonely because they can spend a lot of time with their family. But maybe they don''t have any friends. So Mhmm. On one hand, they can feel love from their family. But they do not feel any love from any friends.

So I suppose there could be a level of loneliness in this person''s life, I guess. Yeah. I I guess maybe Japanese has something similar, though. Maybe like, like, the coldness of

Speaker 1: Oh, yeah. It''s a sweet Mhmm. Yeah. Oh. Coldness.

Hotness

Speaker 0: or warm side. Oh, is this correct, actually?

Speaker 1: The this

Speaker 0: kanji Maybe kanji is different. Right?

Speaker 1: Book, uttso. Not it is a sick?

Speaker 0: Oh, yeah. Okay. So then that case, thickness, I suppose. Yeah. Thickness.

Maybe hope. So I am with this season. Hotness? Warmness? I''m not sure what the nuance of artsy.

Maybe maybe hotness, I guess.

Speaker 1: Hotness. Hotness. Yeah. There is a need in summer is hotness. Mhmm.

Wellness.

Speaker 0: Oh, yeah. Yeah. I guess Japanese summer nowadays is Yeah. Cold usually.

Speaker 2: Oh,

Speaker 1: yeah. In the book, today, my husband asked me how weather coldness outside tonight. Yeah. Similar menu.

Speaker 0: Oh, yeah. Yeah. Mhmm. So coldness tonight is Well, yeah, we can describe it.

Speaker 1: Tonight is very, very not cold. However, not warm tonight. Oh. 55 degrees tonight.

Speaker 0: 55. Oh, Fahrenheit.

Speaker 1: 55.

Speaker 0: Degrees. Well, Celsius.

Speaker 1: Celsius. Celsius.

Speaker 0: Oh, 55. 15. 15. 15. Yeah.

55 very hot

Speaker 2: water in summer. 55. Yeah. Yeah. 55 Celsius.

Speaker 0: Okay. So the coldness tonight is lukewarm, I guess. So Luke Lukewarm.

Speaker 1: Mhmm. What is

Speaker 0: Lukewarm, not

Speaker 2: Lukewarm. Not

Speaker 0: cold, not hot, or just, like, or feels like room temperature, I guess. So

Speaker 1: Oh, room temperature. Mhmm. So oh, in Japanese, room warm, Room degrees is in, for example, high school student chemistry, textbook. Mhmm. 25 degrees Celsius, 25.

How about England England room?

Speaker 0: Oh, room temperature? Oh.

Speaker 2: Yeah. Yeah. Yeah. Yeah.

Speaker 0: Oh, well, I don''t know the textbook definition, but usually my room temperature is, oh, yeah, like, around 16 to 18 degrees, I guess. Yeah. Yeah. So a little. But, though, I I think British people are used to this temperature.

For us, it feels very, like, lukewarm or not too cold or not too too warm.

Speaker 2: So They

Speaker 0: Yeah. It''s kind of normal.

Speaker 1: British people strong for cold.

Speaker 2: Yeah. Yeah.

Speaker 0: I think especially, again, northern people or Scottish people, but Liverpool people too are very strong for cold weather, actually. London people, I''m I''m not sure. But, Yeah. I I guess, like, northern English or northern British or, like, warm blooded people, I I guess. So warm blooded, I guess, is the but I think all humans are warm blooded, but especially Northern UK, Northern British people.

Speaker 1: Do you did did you how did you feel Japanese summer?

Speaker 0: Yeah. Well, I guess, yeah, it was extremely hot or much hotter or hottest temperature I''ve ever felt in my life. But I I guess because it was vacation, I didn''t mind, this temperature. If if I lived in Japan, it would be terrible. But, because I was travelling, it felt, yeah, hot but also nice at the same time because because two weeks later, I would go back to England.

I didn''t have to spend all summer in in Japan, I guess. Mhmm. Okay. Well, yeah, like I said earlier, we have to, keep to the time schedule. So we''ll do shorter lessons from now, but we''ll do a lesson every week.

So it''ll be forty five minutes each week. Okay?

Speaker 2: Good. Okay.

Speaker 0: But I''ll see you next week. Okay.', 'Teacher: How''s it going?

Student: I''m good and you?

Teacher: Okay. Yeah, doing well, thanks. Pretty good.

Teacher: Well, yeah, again, any news, or would you like to practice IELTS, or what would you like to do?

Student: Yeah. I''d like to practice for IELTS.

Teacher: Oh, okay. Okay, sure. Let me get my document open here now.

Student: Sorry. I have one question from my husband.

Teacher: Oh, sure. Sure.

Student: How did British peolpe think about the England football game?

Teacher: Oh, yeah. England. Japan won against England, right? Yeah.

Well, that''s fine for me. Again, I''m happy Japan won. But I''m happy if both teams win, so it''s fine. But I guess lots of British England fans are, of course, disappointed with the result. But since this was just a friendly match, it wasn''t like the World Cup or an important tournament.

I think most people were not happy, but not angry either, so it''s not too bad.

Student: Oh, actually, I didn''t watch full game. However, I watched short cut game video. I think England football team has changed game style to Rooney''s age, gymnastics.

Teacher: So,

Student: I have recently Gen Z''s football game or other sports too. The Gen Z athlete dislike conflict or race in the game. So Japanese football team too, they are not star player in the team.

Almost all same level and corporate game.

Teacher: Right. Right.

Student: Our generation''s football team, almost all strong football team has a star player. For example, Neymar, me.

Teacher: Or,

Student: a bit old sausage. Oh. The gum?

Teacher: Gerrard. Steven Gerrard. Oh. Yeah. Yeah.

Student: Yeah. Yeah. Yeah. Yeah. Yeah.

Teacher: Yes. No one is very astounding, I suppose. So

Teacher: Oh, no. Astounding players. Yeah. I guess, well, I think England used to have some good players. I guess Harry Kane is still playing for England.

I''m sure. Maybe he moved to another team, Aston Villa or something. Let me check. Is Harry Kane playing? Oh, well, yeah.

I guess he''s still playing. Or maybe he played in the match with Japan, but I didn''t watch this. Let''s see here. But, yeah, I guess they''re calling England''s football team a failed experiment. Or it seems that England''s manager is trying to find or trying to mix up the team.

So it''s kind of like an experiment to see who would play well for this team. Oh, actually, though, this is without Kane. So maybe Kane did not play in this Japan versus England match. So Kane was absent from the team list against Japan after suffering a minor issue. Oh, yeah.

I guess he got an injury recently, so he couldn''t play against Japan. Okay. So maybe if Harry Kane was playing, then maybe Japan could not win against England. But

Student: So England team play style is different. I feel different to my image England style. Right.

Teacher: Yeah. But I guess, yeah, without Harry Kane, England''s football team is not impressive or not special. I think only Harry Kane is the good player for England. Oh. Liverpool too also have similar situation.

So Liverpool''s best player is, oh, what''s his name again? Actually, I forget. Mo Salah. Mo Salah is, yeah, Liverpool''s best football player. But Mohammed Salah, or Mo Salah, he was Liverpool''s best football player, but he left Liverpool maybe last week or two weeks ago. Three. So now, yeah.

Recently.

Student: Is over 30 age.

Teacher: Oh, wow. Yeah. 33, I guess. 33.

Student: Oh, 33?

Teacher: Years old. But, yeah, he was, I think, Liverpool''s best player. But

Student: Sorry. My husband always said Arab side persons,

Teacher: Oh, beard. Beard.

Student: A beard. Very muscular.

Teacher: Oh, yeah. Yeah. I can see.

Student: Has everyone always surprised. Yeah. Yeah. We''ve watched Arab person''s beard.

Why they come have beard in the rug and

Teacher: Very thick, I guess.

Student: What''s in yeah. See.

Teacher: Yeah. I guess I noticed many Arabian people or Middle Eastern people. For some reason, just I guess, genetically, they can grow a very thick beard, I suppose. Because, yeah, many white people or, I guess, yeah, for Japanese people too, it''s difficult to grow this kind of beard, I think.

Oh, I never see a Japanese person with his beard actually.

Student: Mhmm. Yeah. Yeah. A private England British person too. Some of the people have very strong beards.

Teacher: Yeah. I guess, well, we have some of my friends also have quite a thick beard. One sec. Sorry. One second.

There''s slight delay. Let me turn. Yeah. Just the connection is a little delayed. Sorry.

One second. Let''s try refreshing the classroom. Okay. Mhmm. Oh.

Student: Okay. You hear me?

Teacher: Yeah. Yeah. Can you hear me?

Student: Oh, okay.

Teacher: Oh, okay. Good. Yeah. Sorry. I think there''s some connection problem, but we were saying, yeah, Japanese people do not grow such a

Student: Yeah? Yeah. What yeah. Actually, my husband''s beard is very patchy?

Teacher: Patchy.

Student: Patchy. Oh, patchy. Yeah. My husband''s beard is patchy. So when he doesn''t shave his beard one week, it''s very not good looking.

Teacher: Yeah. Yeah. Yeah. It''s not attractive, I suppose.

Student: Yeah. Yeah. Yeah.

Teacher: Me too. I can''t grow this type of beard as well. So maybe after one week or two weeks, I have to shave my beard because it''s not patchy, but it doesn''t look very thick like this one. So I always shave my beard after two weeks.

Student: Mhmm. He if his face was upside down, maybe I can see same face. There are interesting picture in Japan, traditional, and one of the famous old picture. This picture is can,

Teacher: I see. I see. It looks so there''s a yeah. We have similar pictures in England too. If you turn it upside down, you can see another picture, I guess.

Student: Yeah. Yeah. Yeah. Mhmm. Beard to hair picture.

Teacher: Oh, alright. I see. I see.

Student: We say it''s like Sarah''s type. We see oh, his face is if upside down, I can we can see same face.

Teacher: Right. Right. Yeah. Because his beard and her, like, same thickness or almost the same.

Student: I I so sorry. I I Okay. Oh, sorry. I have another question for your recent service. Oh, yeah.

Yeah. Yeah. I can sign in this new site, and I can book yours. However, I can choose, I could choose fifteen.

Teacher: Fifteen? Oh, yeah. Yeah. It''s fine.

Teacher: Well, I updated your page, so it should be fine. Let me see. Because this morning, I connected your profile with your subscription. So it should be okay. One second.

If you try now, then you should be able to book thirty minutes or forty-five minutes or sixty minutes lessons.

Student: Book because fifteen minutes are harder.

Teacher: Oh, yeah. This is your page, right? So

Student: Oh, okay.

Teacher: Yeah. I changed it to forty-five because your account was not connected. You were just using a free account. But I connected your old subscription to your new account on the new website. So, yeah, we can do the full lesson today.

It''s okay. But, yeah, I guess from now, we have to stay strict to the lesson minutes because each lesson is recorded. And there''s also a transcript for each lesson. So for each lesson, we should stick to the lesson time instead of going over time too much because it might break something with my website. But anyway, we can do the full lesson today.

It''s no issue.

Teacher: Yeah. Or any other questions about the website?

Student: Oh, I''m okay. Yeah. I''m okay now.

Teacher: Okay. Okay. Good. Yeah. Okay.

Well, let''s see. We''ll move on to maybe some IELTS practice if there''s no other questions. So let me again open IELTS. Okay. Yeah.

So I guess a few weeks ago or maybe last month we were doing these IELTS questions. We talked about if you''ve ever complained about something you''ve bought before. But I guess we will continue on with these IELTS questions here. So maybe second one. Would you go back to a shop you have had a bad experience in before?

Student: Oh, we talked about this question just a few weeks ago.

Teacher: Right. Right. So maybe we did the first one. Have you ever complained about something?

Student: Yeah. Yeah. Yeah.

Teacher: You have both, right? Maybe this one down here, would you go back to a shop you''ve had a bad experience in before?

Student: I don''t go to bad shop. I have bad experience when I have bad experience. Exactly, I have one experience. I went to the supermarket near my working area.

One of the staff bring the cart and this cart hit me. I heard this staff didn''t see me and said sorry. So I was very surprised and, actually, I had ache.

Teacher: Oh. A part of

Student: and other staff watches the situation. However, almost all staff didn''t say that, didn''t apologize to me. So I''m very surprised. And afterward, I called this supermarket company for customer service. I sent this experience. After this shop owner approaches me on the telephone. However, it was but we were addressed from other stars.

So I think this company or supermarket staff don''t change their behavior.

Teacher: Okay. Because

Student: almost all staff didn''t approach and didn''t say me anything. So I never go to this supermarket after this experience. I''ve been more this experience.

Teacher: Okay. Yeah. Okay. Good. Yeah.

That let me bring on. One, go. 122, this supermarket, after this experience. Okay. Yeah.

I''ve just been writing a transcript or not. Here. Yeah. Yeah. I think this is fine.

I changed some of it. I corrected some of the mistakes, though. Yeah. I guess I think I created this one. So one staff member hit me with the shopping cart. Yeah. This staff member didn''t see me or say sorry.

So I was very surprised. Actually, I felt physically hurt by this incident would be better, I guess. After that, I called the supermarket''s customer service department. That''s actually better.

Student: Yeah. Customer service department.

Teacher: To talk or to complain about it. So if I caught it right, the shop''s owner apologized to you, but you weren''t satisfied with it. Right? So, yeah, I think this is fine.

I think the shop will not change their behavior because you didn''t get an apology from the staff member who did it or the staff themselves. Okay. Yeah. Yeah. I think that''s all fine.

Okay. Yeah. Let''s move on then to the next one. Or this one. What things do people from Japan usually complain about?

Student: Maybe Japanese people dislike b. Right? Situation.

For example, little people complain for train delay situation. Actually, I have seen the person complain station to train station stop for trains today. And Japanese people who went to abroad. What person said they were surprised at the foreign train or bus almost all day time. So we dislike delay situation. I don''t know why. However, according to my husband, my husband came from heavy snowing area. So he said if the person is wait ten minutes, other person may be dead.

Oh. There''s snowing outside. So it is important to go on time. Anything. Anytime.

Everywhere. Right.

Teacher: It''s so it''s important to be on time. Anytime or at any place at any time.

Student: Mhmm. Yeah. And relatively Japanese people think always the person could always be right. This person

Teacher: from Oh.

Student: Other person.

Teacher: So

Student: A relative Japanese people angry for always relate person or train day or bus train too. We think ropes my

Teacher: my lights. I see. Oh, I guess that''s fine. Okay. Yeah.

Again, I didn''t really change too much, I think. Yeah, just for example, a lot of people complain about trains being late. I think I changed something here. Being delayed.

Yeah. Maybe I also corrected this one. Japanese people who go abroad are often surprised by the lateness of public transport in those countries.

Student: Lateness.

Teacher: Lateness.

Student: What is the lateness? Lateness is the lateness.

Teacher: So lateness, yeah, like the noun of being late. So the lateness is now. And late is adjective.

Oh, yeah. If we add -ness to the end of an adjective, it always becomes a noun. So because, yeah. Kindness. Cuteness. So maybe we could watch these colors.

Redness, I suppose. The redness of the flower or the blue. So, yeah, I guess it maybe not actual word, but I can understand easily this meaning, I think.

Student: Oh, college name, for example, red, blue, pink, black, almost all adjective word.

Teacher: Yeah. Yeah. Because I guess we use these words to describe the color of something. So I suppose, yeah, red, blue, pink, purple, green, all adjectives in English.

Student: Can''t I say night is dark? Correct sentence is night is darkness.

Teacher: Well, I guess dark itself, we don''t consider to be a color. So I guess you could say, like, the night is darkness. It has a kind of Shakespearean feeling to it, I guess.

Student: The Like kind of

Teacher: deep meaning.

Student: Your shirt is blue, or your blue shirt is blue.

Teacher: Well, I guess in that case, this is your shirt is blue. You just use the adjective to describe the shirt. Maybe you could say, like, the blueness of your shirt is maybe bright or dark or dim, I guess. Because, yeah, if we already use a noun here, so we need an adjective to describe the noun.

Well, I guess, since shirt is also a noun too, but actually, I''ve never thought about it before. But

Student: It is blue jeans, blue blue

Teacher: Blue jeans. Yeah. We just say blue jeans. Again, when we add -ness to something, it''s talking about the level or degree of how blue something is. So the blueness, like, the level of how blue something is. The same with darkness, like, the level of how dark something is or, yeah, cuteness, the level of how cute something is.

Student: Can I say all rebel this word? Can we see the word for all level? I think darkness is very, very dark image. However, correct meaning is right target.

Teacher: Yeah. How dark it is. So, for example, the darkness of this room is not too dark, for example. Or it''s dark, but the level of the darkness is not too dark.

Student: Oh. Mhmm. I then we different image. This room is not too dark.

Teacher: Oh, I guess, to rewrite the server, the level of the darkness in this room is not too dark. But, it was simply

Student: brightness. Oh, sorry. It''s a witness to rate, time, level,

Teacher: or

Student: Lightness? Oh, yeah. Yeah.

Teacher: Yeah. So, for example, what how do we use lateness in a sentence? Maybe his lateness is not acceptable. Well, in a sentence, it means the amount of time he is late is not acceptable, I guess. So, for example, maybe one minute late is okay or two minutes late is okay, but maybe he''s five minutes or ten minutes late, so it''s not acceptable.

So the level or the amount of time he is late is not acceptable.

Student: If I use these words, greatness or darkness or cuteness, I need to describe this rebel in the sentence.

Teacher: I suppose, yeah, usually, we have, like, is. So we''re describing lateness is not acceptable. I guess darkness of the room is the subject is and then we describe it using the be verb is here. Well, so we could also say, like, quickness of Amazon is very convenient. Or we could just shorten it to the quickness. We don''t have to say of Amazon. But if we''re talking about Amazon, then we could say this sentence. The quickness is very convenient.

Student: This quickness would describe delivery''s time? Yeah.

Teacher: Yeah. So delivery time.

Student: That that means to me, I''m I have different image for this word.

Teacher: I see. Just you thought it meant, like, very dark. Darkness mean very dark. I see. But, yeah, I guess the level could be very or not very or short or long or it''s,

Student: Oh, happiness too.

Teacher: Oh, which one?

Student: It''s happiness. Happiness.

Teacher: Happiness. Oh, yeah. Happiness. Yeah. Happiness.

So, yeah, happiness just describes how happy someone is or the level of happiness.

Student: I think happiness is a super happy image.

Teacher: Oh, right. Right. Yes. So, yeah, it doesn''t mean very happy. It just means the level of happy feeling, I suppose.

So, for example, there is not much happiness in the world nowadays. It''s a very sad sentence, I guess, but maybe true.

Student: However, if I watch this sentence, I think the person has a little happy. However, super he''s not super happy. However, real meaning is the person

Teacher: the person thinks life is not happy or

Student: Not almost all not happy.

Teacher: Maybe. I guess it implies something makes them happy, but most things do not make them happy. 90% of things are not happy, but maybe 10% of things make them happy, maybe.

Student: Mhmm. There there are Japanese artist music title is happiness. So this music is very happy song. So I''m happy to be super happy.

In this. Oh. Oh. Bees in Japanese band name is bees. Bees?

Yeah. Bees. And this music title is happiness.

Teacher: Oh, I see. I see. Well, yeah, I guess if the song sounds very happy, then I can understand it''s a high level of happiness, not happiness. Maybe if it was called happiness, but the song is like minor key or sad sounding, then yeah. I guess it''s yeah.

Maybe titles is okay, but it describes low level of happiness if it''s a sad song. Oh, sadness too.

Student: Oh, sadness. Sadness is not big,

Teacher: sad situation.

Teacher: Yeah. Yeah. Not big doesn''t mean very sad. It just means that there is a level of sadness. So it could be a little sad or very sad or depends on the situation.

Student: Is it loneliness too?

Teacher: Oh, yeah. Yeah. Loneliness as well. Oh, so how you spell loneliness? Oh, yeah.

So it needs an e.

Teacher: But pretty much any adjective, you can turn into a noun. So

Student: Why are there with the loneliness in

Teacher: Yeah. I well, I suppose, yeah. If you''re I feel like lonely is either you''re lonely or not lonely. I guess it''s only like

Teacher: Because you can''t be oh, maybe, yeah, some people are not lonely because they can spend a lot of time with their family. But maybe they don''t have any friends.

So on one hand, they can feel love from their family. But they do not feel any love from any friends.

So I suppose there could be a level of loneliness in this person''s life, I guess. Yeah. I guess maybe Japanese has something similar, though. Maybe like the coldness of

Student: Oh, yeah. It''s a sweet. Yeah. Oh. Coldness.

Hotness

Teacher: or warm side. Oh, is this correct, actually?

Student: The this

Teacher: kanji Maybe kanji is different. Right?

Student: Book, uttso. Not it is a sick?

Teacher: Oh, yeah. Okay. So then that case, thickness, I suppose. Yeah. Thickness.

Maybe hope. So I am with this season. Hotness? Warmness? I''m not sure what the nuance of artsy.

Maybe hotness, I guess.

Student: Hotness. Hotness. Yeah. There is a need in summer is hotness.

Teacher: Wellness.

Teacher: Oh, yeah. Yeah. I guess Japanese summer nowadays is cold usually.

Student: Oh, yeah. In the book, today, my husband asked me how weather coldness outside tonight. Yeah. Similar menu.

Teacher: Oh, yeah. Yeah. So coldness tonight is

Student: Tonight is very, very not cold. However, not warm tonight. Oh. 55 degrees tonight.

Teacher: 55. Oh, Fahrenheit.

Student: 55.

Teacher: Degrees. Well, Celsius.

Student: Celsius. Celsius.

Teacher: Oh, 55. 15. 15. 15. Yeah.

Teacher: 55 very hot water in summer. 55. Yeah. Yeah. 55 Celsius.

Teacher: Okay. So the coldness tonight is lukewarm, I guess. So lukewarm.

Student: Mhmm. What is

Teacher: Lukewarm, not cold, not hot, or just feels like room temperature, I guess. So

Student: Oh, room temperature. So oh, in Japanese, room warm, room degrees is in, for example, high school student chemistry textbook. 25 degrees Celsius, 25.

How about England room?

Teacher: Oh, room temperature? Oh.

Teacher: Yeah. Yeah. Yeah.

Teacher: Oh, well, I don''t know the textbook definition, but usually my room temperature is around 16 to 18 degrees, I guess. Yeah. So a little. But I think British people are used to this temperature.

For us, it feels very lukewarm or not too cold or not too warm.

Teacher: So

Teacher: Yeah. It''s kind of normal.

Student: British people strong for cold.

Teacher: Yeah. Yeah.

Teacher: I think especially northern people or Scottish people, but Liverpool people too are very strong for cold weather, actually. London people, I''m not sure. But yeah. I guess, like, northern English or northern British or warm-blooded people, I guess. So warm-blooded, I guess, is the but I think all humans are warm-blooded, but especially northern UK, northern British people.

Student: Do you did did you how did you feel Japanese summer?

Teacher: Yeah. Well, I guess it was extremely hot or much hotter or the hottest temperature I''ve ever felt in my life. But I guess because it was vacation, I didn''t mind this temperature. If I lived in Japan, it would be terrible. But because I was travelling, it felt hot but also nice at the same time because two weeks later, I would go back to England.

I didn''t have to spend all summer in Japan, I guess. Okay. Well, yeah, like I said earlier, we have to keep to the time schedule. So we''ll do shorter lessons from now, but we''ll do a lesson every week.

So it''ll be forty-five minutes each week. Okay?

Student: Good. Okay.

Teacher: But I''ll see you next week. Okay.', NOW(), NOW())
RETURNING id INTO v_booking1_id;


-- Booking 2: 2026-04-09, 30min (WITH summary)
INSERT INTO bookings (id, user_id, date, start_time, duration_minutes, status, whereby_meeting_id, transcription_id, transcript_text, cleaned_transcript, created_at, updated_at)
VALUES (gen_random_uuid(), v_user_id, '2026-04-09', '21:30:00', 30, 'confirmed', '126844246', '02e06744-0354-4b89-aad1-0aa50df51354', '
Speaker 0: Good. And you?

Speaker 1: Pretty good. Yeah. Pretty good. Thanks. Doing well.

Any news this week?

Speaker 0: Oh, so, last time I used this new website, and so I''m surprised because this, service, also has recording. Mhmm. Mhmm. And this service has, summary.

Speaker 1: Right. Yeah.

Speaker 0: Yeah. That''s all. Great. So yeah. Yeah.

Yeah. So I was so surprised. Yeah.

Speaker 1: Oh, okay. It''s good to hear. Yeah. Yeah.

Speaker 0: It is so useful to study some lessons. So, yeah, after lessons. So yeah. Right. Right.

Thank you Yeah. For renewal.

Speaker 1: Oh, yeah. Yeah. No no problem. But, yeah, I wanted to include something, yeah, good for, like, studying after the lesson too. So

Speaker 0: Mhmm.

Speaker 1: I think, yeah, summary and corrections and phrases for each lesson, I think, yeah, it was a good move or good way to, like, give my students something to study after the lesson too.

Speaker 0: Mhmm. Yeah. Yeah.

Speaker 1: Yeah. Yeah. Or, again, just any I think I asked you last time already, but any questions about how to use the summaries or phrases or or that kind

Speaker 0: of It''s okay.

Speaker 1: It''s all fine? Okay?

Speaker 0: Yeah. Yeah.

Speaker 1: Well, again, please, after this lesson, check out, this lesson summary. So Yeah.

Speaker 0: Yeah. Yeah. Mhmm.

Speaker 1: Okay. Again, I don''t have any news this week. Or Mhmm. Other than the new website, do you have any news, or did you do anything over the past week or so?

Speaker 0: Nothing special.

Speaker 1: Mhmm. Mhmm. Well, yep. In that case, let''s, go on to today''s, topic then. Mhmm.

So today, we will look at something called skillcations.

Speaker 0: Mhmm.

Speaker 1: So skillcations, travel, learn, and grow. Well, as you can imagine, it''s just the word skill and vacation mixed together. So Mhmm. Something while traveling at the same

Speaker 0: time. Mhmm.

Speaker 1: Mhmm. K. But let''s look at the vocabulary here.

Speaker 0: Yeah. Pottery.

Speaker 1: Pottery.

Speaker 0: Pottery.

Speaker 1: Mhmm. Mhmm. So pottery yeah. Like making clay cups or clay dishes, clay balls.

Speaker 0: Ah.

Speaker 1: Again, let me find an image just to this kind of activity.

Speaker 0: So if I make this like a, like, cup, so I I would say I do pottery. Yeah.

Speaker 1: Yeah. I do pottery or I did pottery. Or I did if it''s past tense.

Speaker 0: Mhmm. Okay. Mhmm.

Speaker 1: Have you ever done pottery before?

Speaker 0: Yeah. But, only when I was tired. So I didn''t try after I''m, growing up. So but I I''m not good at, making something. So I I''m not good at making, like, origami or paper things or making, like, a piece or some create create something.

So, like, accessory or something. So

Speaker 1: Right. Right.

Speaker 0: So maybe I if I try the the portrait for now, maybe

Speaker 1: I

Speaker 0: I can''t do well.

Speaker 1: I see. I see. Yeah. Me too. I did pottery in art class in junior high school high school.

But, yeah, same. I''m not very good at, like, making physical things

Speaker 0: Mhmm. Costumes

Speaker 1: or accessories or anything. Mhmm. Mhmm. Okay. But let''s move on to the next one.

Speaker 0: Yeah.

Speaker 1: Oh, oh, sorry. Oh, I''m not showing my screen. I forgot I was not showing this image here. Next, vocabulary.

Speaker 0: Yeah. Psychologist.

Speaker 1: Mhmm. Okay. Yeah. I think we know this.

Speaker 0: Energy.

Speaker 1: So energize. Energize.

Speaker 0: Energize. Mhmm.

Speaker 1: Energize. Which means that to give something or give someone energy. Mhmm. Give energy. Yeah.

This, like, I suffix, something I usually means, like, to make something into something else or to give something. For example, oh, yeah. Like minimize.

Speaker 0: Apologize.

Speaker 1: Oh, oh, let''s see. This is the same. I I guess if we apologize, we''re giving someone an apology. So similar meaning. Yeah.

I was thinking, like, minimize. Minimize is too small, something mini or Mhmm. Maximize to make something big. That kind of

Speaker 0: Okay. Mhmm.

Speaker 1: Okay. But let''s look at the next one.

Speaker 0: Fuel? Mhmm. Mhmm.

Speaker 1: So fuel. I guess this is a verb to fuel.

Speaker 0: Ah.

Speaker 1: So to fuel, to make something stronger or, again, to also, yeah, like, to give something energy or to, or to add something to something else to make it stronger or powerful. Mhmm. Or in this case, it says her rude comments only fueled his anger or he became more angry because she gave him rude comments. Okay. Okay.

This word we''re familiar with.

Speaker 0: Confidence. Yep.

Speaker 1: Confidence. Last one.

Speaker 0: Motivation. Okay.

Speaker 1: Another easy one. Okay. Oh, yeah. Let''s, take a look at the article. Let''s read about this.

Speaker 0: K. Mhmm. Secure occasions, travel, learn, and grow. Imagine returning home from a vacation, not with a bag of

Speaker 1: Souvenues.

Speaker 0: Souvenues. Souvenues. But we with a new skill or ability, maybe you learned to surf in Hawaii, skilfer dive in Thailand, or dance ramenco in Spain. Trips like these are called skillcations. Vacations during which you can learn something new or practice and improve an exciting ability.

Speaker 1: Oh,

Speaker 0: again, eggs. Existing.

Speaker 1: Yeah. Existing ability.

Speaker 0: Existing ability. Mhmm. Like, holidays that focus on sightseeing or just relaxing at the beach. Skillcations offer people a way to feel provide productive while following a personal interest, whether you''re learning pottery in ballet Mhmm. Tofu making in Japan, or wildlife photography in Africa, Skilled cations allow you to get deeper into a local culture and can give you a lasting sense of achievement.

Speaker 1: Mhmm.

Speaker 0: It''s a travel trend that seems to be growing in popularity. One survey found that 39% of American travelers were attracted by the idea of a skilled cation. Mhmm. In some ways, a skilled cation may actually be more relaxing the than a normal vacation. When your mind is busy learning a new skill, you don''t have time to remember the stress and worries of work and your regular life.

These things might be harder to forget if you are just lying on a round chair by a pool. Mhmm. Expats also suggest that education can be good for our mental health. Learning something new is known to be good for the brain and can help keeping it in a healthy condition as we get older. Mhmm.

Skerrycations also give us a chance to be a complete beginner at something. Mental health expert Samansa

Speaker 1: this one, thrillist.

Speaker 0: Thrillist? Thrillist. That being a beginner gives us a sense of fun and play like we had when we were children, and this is good for our well-being.

Speaker 1: Mhmm.

Speaker 0: Learning something new can give Us energy too. The psychologist, Maria Besser Mhmm. Told who

Speaker 1: Forbes? Forbes?

Speaker 0: Forbes? Mhmm. What is Forbes?

Speaker 1: Forbes is, magazine, I guess, in America or American

Speaker 0: What is his name? Okay. House that learning a new skill on vacation give us a sense of progress that is energize energizing and fierce confidence and motivation long after the trip ends. Mhmm. Mhmm.

Speaker 1: Okay. Good. That''s all. Okay. Yeah.

I think I already corrected some of the pronunciation, already. Like, what was the one we had? Earlier? Well, actually, I forgot what what we but it will be in the in the it will be in the transcript after the lesson, so you can come back Oh, yeah. And remember which one it was.

Oh, okay. Any questions about this?

Speaker 0: I couldn''t understand the second paragraph from last.

Speaker 1: Oh, okay. So this one, skill cations also give us a chance to be a complete beginner or something. This one?

Speaker 0: The after sentence then, some some I

Speaker 1: I

Speaker 0: didn''t I I didn''t understand what the summons Edu said. You know what I mean?

Speaker 1: Oh, I see. So mental health expert Samantha Edu told Thrillist that being a beginner gives us a sense of fun and play like we had when we were children.

Speaker 0: So what Thrillist is

Speaker 1: maybe another magazine

Speaker 0: The name?

Speaker 1: Name or, yeah, the name of some news website or Amazon. And I guess she gave an interview to this magazine.

Speaker 0: Mhmm. And

Speaker 1: said, yeah, if you''re a beginner, then it, oh, yeah. It''s fun to learn something as a beginner because it feels like we''re children again, basically.

Speaker 0: Mhmm.

Speaker 1: Mhmm. Okay. Well, anything else?

Speaker 0: It''s okay. Maybe.

Speaker 1: It''s fine. No? Mhmm. Okay. Well, let''s discuss it too.

Any thoughts on still occasions?

Speaker 0: So so going to Malta for me, it it is like it was like skill case.

Speaker 1: Oh, so because you went there to study English.

Speaker 0: Yeah. Yeah. But, my purpose is, was, also studying English, but I had only two class. So grammar class and the conversation class. So Mhmm.

So I only stay at school in two or three hours. So so I have a I have a lot of, free time. So I went to beach, and I went to restaurant cafes and go to other countries also. Mhmm. So it''s very good studying and, like, backhands, still in backhands.

So

Speaker 1: Backhands? Backhands.

Speaker 0: Vacants. Vacants. Vacants. Vacations.

Speaker 1: Vacation. Oh, yeah. Vacation. Right. Right.

Study and do vacation at the same time. Yeah.

Speaker 0: Yeah. Mhmm.

Speaker 1: Yeah. I think it''s, I guess when I go on vacation, I don''t often do any workshop or, but the the first time I went to Japan, I went to, like, a sushi making workshop. Oh. Most of it, like, bushido workshop as well. But, actually, I''m I''m not very interested in bushido, but I wanted to do, like, I I wanted to do something, like, traditional in Japan.

So I did this as well. But, yeah, I think it makes vacations more fun to learn something, especially if it''s, like, relating to that culture,

Speaker 0: as well. Yeah.

Speaker 1: Mhmm. Okay. Or what sort of skillcation could you see yourself going on? Or is there any place you want to travel to but also learn something from that country as well?

Speaker 0: So next month, I go to Korea. So, my friends and I try to wear the traditional Korean wear wear dress.

Speaker 1: Oh, like, hanbok girls.

Speaker 0: Hamburg. Yeah. Yeah. You mean? Hamburg.

Yeah. So, and we try to go to, like, traditional western. So Mhmm. We can eat the traditional meals. So

Speaker 1: Mhmm.

Speaker 0: Mhmm. Which is like, like, used to be king kings and queen used to be eat eat, like, type of this, muse. So I''m not sure this is, skill cations, but I

Speaker 1: Oh, mhmm.

Speaker 0: I I want to know some history, to if I went if I go to the other countries. So and, also, I my bucket list is also, I want to go to China, and I try to wearing Chinese traditional dress and went to some historical place places. Mhmm.

Speaker 1: Mhmm. Yeah. Yeah. I guess, yeah, trying on, like, the different traditional clothing, would also

Speaker 0: not have

Speaker 1: location, I suppose. So if you learn how to put on this type of dress, then, yeah, I would consider that skillcation. Mhmm. Yeah. I I think, maybe just going to restaurants or learning about history is just normal travel, experience.

But but, yeah, I think some of those would count as a skillcation too. Okay. Okay. Good. Or yeah.

Or have you ever taken a class other than English when you went to Malta, when traveling? Or it could be in Japan. So not only in another country, but domestic travel. That''s all.

Speaker 0: Oh, I I''m not sure also this is clearcation, but, when I went to South South part of Malta, I tried to write, horse.

Speaker 1: Oh, yeah. Yeah. Mhmm. Horse riding.

Speaker 0: Horse riding.

Speaker 1: Mhmm. Mhmm. Oh, yeah. I I guess but you rode the horse by yourself or someone taught you how to ride the horse or the horse, I guess, automatically, walked you to some place?

Speaker 0: So not, not not ride, just horse.

Speaker 1: Host

Speaker 0: keep the, like, call.

Speaker 1: Oh, courage, maybe. Courage.

Speaker 0: Carriage. Yes. Mhmm.

Speaker 1: Mhmm. I see.

Speaker 0: Carriage. And I sit sit the front of carriage, and I hold the ropes. Mhmm.

Speaker 1: Oh, I see. I see. So, yeah, not just the normal, like, horse

Speaker 0: Normal horse riding. Yeah.

Speaker 1: You could control the horse

Speaker 0: using Yeah. Yeah. Yeah.

Speaker 1: Yeah. I would say that''s a skill in itself for

Speaker 0: I

Speaker 1: would consider that skill location too. Okay. Yeah. Yeah. So I think that''s fine.

Or moving on to the forefront. What destinations are popular for travelers with your hobbies? Your hobbies like music or vlogging or

Speaker 0: Pure.

Speaker 1: Yeah. I I don''t know if there''s any specific destinations. Again, it depends on the person or which country those people,

Speaker 0: want to

Speaker 1: go to.

Speaker 0: So for around me, my many friends really like beetles. So

Speaker 1: Oh, yeah.

Speaker 0: Yeah. Many people went to, UK. Mhmm. Mhmm. Mhmm.

Mhmm. So I''m I also want to go. Yeah.

Speaker 1: Alright. Again, like, Liverpool, Manchester, I think.

Speaker 0: Yeah. Yeah. Yeah.

Speaker 1: Good cities for people who are interested in, like, UK music, that sort

Speaker 0: of thing. Yeah. Some people, like classic music. So many people also went to Austria. Austria.

Speaker 1: Oh, yeah. Austria.

Speaker 0: Yeah. Mhmm.

Speaker 1: Because, yeah, that''s where, what''s it called, Sound of Music or some musical was, I think, in Austria maybe. But Austria, yeah, was also well known for, like, its kind of classical music or improv music too, I think. Mhmm. Mhmm. Yeah.

Well, of course, people who, like, k pop will go to South Korea, of course.

Speaker 0: So Yeah. Mhmm.

Speaker 1: Okay. Yeah. And one, do you prefer active or relaxing vacations, or has this changed over time?

Speaker 0: Oh, I prefer active vacations, Because I don''t want to waste the time. So, if, if I went if I got to a domestic travel, it, it''s okay just relaxing. So do, like, kind of activity. So but if I go to overseas, I want to go many places and do many activities. Mhmm.

Speaker 1: So Yeah.

Speaker 0: Or, like like yeah. So, like, step away. So

Speaker 1: Right. Right. Or yeah. I guess well, of course, it''s very expensive to go to other countries. So when we go to other countries, we want to make the most of our time in those places.

Right? Mhmm. Yeah. That''s okay. Good phrase.

We want to make or or I I want to make the most of my time when traveling. Yeah. I agree. Yeah. I guess recently, my most recent vacations have only really been relaxing.

I haven''t done, again, any, like, sushi making or but, yeah, I guess, I don''t know if I''ll do any more cooking classes in Japan because, the first time I went to Japan, I did the sushi making class. And then after that, I went back to England and worked at Japanese restaurant. So I think I already know how to make. But, yeah, if I ever go to, like, another country, like, not Asian country, I want to learn how to make the food of those countries too. Yeah.

Okay. I guess that''s all for questions. How much time oh, yeah. So let''s move on to these further ones too.

Speaker 0: Mhmm.

Speaker 1: What sort of locations could people take in Japan?

Speaker 0: Like, we are in kimono, visiting some temples and try to, like, pray to mhmm. Something. Mhmm.

Speaker 1: To pray to, like, Buddhist God or some God.

Speaker 0: Buddhist style. Yeah. Mhmm. Mhmm. Mhmm.

Speaker 1: Oh, yeah. Like learning about Buddhism, I suppose.

Speaker 0: Yeah.

Speaker 1: Yeah. I''m trying to think about The UK. I guess, how to serve afternoon tea is the first time. Yeah. Though I I''ve never really researched, like, skill cations in in England,

Speaker 0: but I''m

Speaker 1: sure there''s many, like, maybe, like, beer brewing is probably

Speaker 0: Ah. Like this location.

Speaker 1: Or in Japan, like, making green tea or matcha tea.

Speaker 0: Yeah. Yeah. Yeah. Yeah. Mhmm.

Speaker 1: K. Good. Or second one here. What do you make of the idea that being a beginner is good for our well-being?

Speaker 0: Idea. Mhmm.

Speaker 1: Oh, yeah. I guess, do you agree that, if you''re a beginner at something, it improves your mental health? Or

Speaker 0: so recently recently, I I often lost my confidence about speaking English, because yesterday, I, someone talked to me to how to get to the Skytree, but, I I could answer it, but I couldn''t speak faster and well. So so at that time, I really feel nervous. But, at that time, I remember, when I started to learn in English. So I maybe at that time, three four years ago, maybe I couldn''t answer for her to get actually, so, so from the start, I feel very progress to speaking English, but, at but now I lost, confidence, many times. But, compare the from the start and now Mhmm.

I my skills, also pro progress, but

Speaker 1: Yeah. Yeah. Yeah.

Speaker 0: So so I want to keep, like, motivation to study. Mhmm.

Speaker 1: Yeah. Yeah. Yeah. Absolutely. I guess, again, I I think that situation where, like, somebody suddenly asks you a question and it yeah.

Always, like, I suppose if you''re not prepared for that question, then at first, we might forget things very easily. It it''s happened to me in Japan too, many times. So when speaking Japanese, I even if it''s, like, very simple Japanese, I sometimes even figure

Speaker 0: out this way. So,

Speaker 1: but, again, these these experiences are good for, again, learning about our mistakes or realizing what we''re not confident in doing. So I think these Yes. Yeah. We shouldn''t think of them as, like, negative experiences, but, experiences to improve our skills. Right?

Speaker 0: Yeah. Yes.

Speaker 1: Yeah. Okay. I think that''s all, though, for now. So we''ll finish that. K.

Let me send you this article too.

Speaker 0: Okay. I copy that.

Speaker 1: Okay. Good. Yeah. I''ll see you next time.', 'Teacher: Good. And you?

Student: Pretty good. Yeah. Pretty good. Thanks. Doing well.

Teacher: Any news this week?

Student: Oh, so, last time I used this new website, and so I''m surprised because this service also has recording. And this service has summary.

Teacher: Right. Yeah.

Student: Yeah. That''s all. Great. So yeah. Yeah.

Yeah. So I was so surprised. Yeah.

Teacher: Oh, okay. It''s good to hear. Yeah. Yeah.

Student: It is so useful to study some lessons. So, yeah, after lessons. So yeah. Right. Right.

Thank you. Yeah. For renewal.

Teacher: Oh, yeah. Yeah. No problem. But, yeah, I wanted to include something good for, like, studying after the lesson too. So

Student: うん。

Teacher: I think summary and corrections and phrases for each lesson, I think it was a good move or good way to, like, give my students something to study after the lesson too.

Student: うん。 Yeah. Yeah.

Teacher: Yeah. Yeah. Or, again, just any I think I asked you last time already, but any questions about how to use the summaries or phrases or that kind of thing?

Student: It''s okay.

Teacher: It''s all fine? Okay?

Student: Yeah. Yeah.

Teacher: Well, again, please, after this lesson, check out this lesson summary. So

Student: Yeah. Yeah. うん。

Teacher: Okay. Again, I don''t have any news this week. Or other than the new website, do you have any news, or did you do anything over the past week or so?

Student: Nothing special.

Teacher: Well, yep. In that case, let''s go on to today''s topic then.

So today, we will look at something called skillcations.

Student: うん。

Teacher: So skillcations, travel, learn, and grow. Well, as you can imagine, it''s just the word skill and vacation mixed together. So something while traveling at the same time.

Student: うん。

Teacher: Okay. But let''s look at the vocabulary here.

Student: Pottery.

Teacher: Pottery.

Student: Pottery.

Teacher: So pottery, yeah. Like making clay cups or clay dishes, clay balls.

Student: Ah.

Teacher: Again, let me find an image just to this kind of activity.

Student: So if I make this like a cup, so I would say I do pottery. Yeah.

Teacher: Yeah. I do pottery or I did pottery. Or I did if it''s past tense.

Student: うん。 Okay. うん。

Teacher: Have you ever done pottery before?

Student: Yeah. But only when I was tired. So I didn''t try after I''m growing up. So but I''m not good at making something. So I''m not good at making, like, origami or paper things or making, like, a piece or some create something.

So, like, accessory or something. So

Teacher: Right. Right.

Student: So maybe if I try the pottery for now, maybe I can''t do well.

Teacher: I see. I see. Yeah. Me too. I did pottery in art class in junior high school, high school.

But, yeah, same. I''m not very good at making physical things

Student: うん。

Teacher: or accessories or anything.

Student: Costumes.

Teacher: Okay. But let''s move on to the next one.

Student: Yeah.

Teacher: Oh, sorry. I''m not showing my screen. I forgot I was not showing this image here. Next vocabulary.

Student: Yeah. Psychologist.

Teacher: Okay. Yeah. I think we know this.

Student: Energy.

Teacher: So energize. Energize.

Student: Energize. うん。

Teacher: Energize. Which means to give something or give someone energy. Give energy. Yeah.

This -ize suffix usually means to make something into something else or to give something. For example, oh, yeah. Like minimize.

Student: Apologize.

Teacher: Oh, let''s see. This is the same. I guess if we apologize, we''re giving someone an apology. So similar meaning. Yeah.

I was thinking, like, minimize. Minimize is too small, something mini or maximize to make something big. That kind of thing.

Student: Okay. うん。

Teacher: Okay. But let''s look at the next one.

Student: Fuel? うん。 うん。

Teacher: So fuel. I guess this is a verb, to fuel.

Student: Ah.

Teacher: So to fuel, to make something stronger or, again, to also, yeah, like, to give something energy or to add something to something else to make it stronger or powerful. Or in this case, it says her rude comments only fueled his anger, or he became more angry because she gave him rude comments. Okay. Okay.

This word we''re familiar with.

Student: Confidence. Yep.

Teacher: Confidence. Last one.

Student: Motivation. Okay.

Teacher: Another easy one. Okay. Oh, yeah. Let''s take a look at the article. Let''s read about this.

Student: K. うん。 Skillcations, travel, learn, and grow. Imagine returning home from a vacation, not with a bag of souvenirs.

Teacher: Souvenirs.

Student: Souvenirs. Souvenirs. But with a new skill or ability. Maybe you learned to surf in Hawaii, skydive in Thailand, or dance flamenco in Spain. Trips like these are called skillcations. Vacations during which you can learn something new or practice and improve an existing ability.

Teacher: Oh,

Student: again, existing.

Teacher: Yeah. Existing ability.

Student: Existing ability. うん。 Like holidays that focus on sightseeing or just relaxing at the beach. Skillcations offer people a way to feel productive while following a personal interest, whether you''re learning pottery in Bali, tofu making in Japan, or wildlife photography in Africa. Skillcations allow you to get deeper into a local culture and can give you a lasting sense of achievement.

Teacher: うん。

Student: It''s a travel trend that seems to be growing in popularity. One survey found that 39% of American travelers were attracted by the idea of a skillcation. うん。 In some ways, a skillcation may actually be more relaxing than a normal vacation. When your mind is busy learning a new skill, you don''t have time to remember the stress and worries of work and your regular life.

These things might be harder to forget if you are just lying on a round chair by a pool. うん。 Experts also suggest that education can be good for our mental health. Learning something new is known to be good for the brain and can help keep it in a healthy condition as we get older. うん。

Skillcations also give us a chance to be a complete beginner at something. Mental health expert Samantha Edut told Thrillist that being a beginner gives us a sense of fun and play like we had when we were children, and this is good for our well-being.

Teacher: うん。

Student: Learning something new can give us energy too. The psychologist Maria Besser told Forbes that learning a new skill on vacation gives us a sense of progress that is energizing and fierce confidence and motivation long after the trip ends. うん。 うん。

Teacher: Okay. Good. That''s all. Okay. Yeah.

I think I already corrected some of the pronunciation already. Like, what was the one we had earlier? Well, actually, I forgot what it was, but it will be in the transcript after the lesson, so you can come back and remember which one it was.

Oh, okay. Any questions about this?

Student: I couldn''t understand the second paragraph from last.

Teacher: Oh, okay. So this one, skillcations also give us a chance to be a complete beginner at something. This one?

Student: The after sentence then, some some I didn''t understand what the Samantha Edut said. You know what I mean?

Teacher: Oh, I see. So mental health expert Samantha Edut told Thrillist that being a beginner gives us a sense of fun and play like we had when we were children.

Student: So what Thrillist is

Teacher: Maybe another magazine name or, yeah, the name of some news website or article. And I guess she gave an interview to this magazine.

Student: うん。 And

Teacher: said, yeah, if you''re a beginner, then it, oh, yeah. It''s fun to learn something as a beginner because it feels like we''re children again, basically.

Student: うん。

Teacher: Okay. Well, anything else?

Student: It''s okay. Maybe.

Teacher: It''s fine? No?

Student: うん。 Okay.

Teacher: Well, let''s discuss it too.

Any thoughts on skillcations?

Student: So going to Malta for me, it was like skillcations.

Teacher: Oh, so because you went there to study English.

Student: Yeah. Yeah. But my purpose was also studying English, but I had only two class. So grammar class and the conversation class. So

So I only stay at school in two or three hours. So I have a lot of free time. So I went to beach, and I went to restaurant cafes and go to other countries also. So it''s very good studying and, like, backhands, still in backhands.

Teacher: Backhands? Backhands.

Student: Vacants. Vacants. Vacants. Vacations.

Teacher: Vacation. Oh, yeah. Vacation. Right. Right.

Study and do vacation at the same time. Yeah.

Student: Yeah. うん。

Teacher: Yeah. I think it''s, I guess when I go on vacation, I don''t often do any workshop or, but the first time I went to Japan, I went to, like, a sushi making workshop. Oh. Most of it, like, bushido workshop as well. But, actually, I''m not very interested in bushido, but I wanted to do, like, I wanted to do something traditional in Japan.

So I did this as well. But, yeah, I think it makes vacations more fun to learn something, especially if it''s relating to that culture as well.

Student: Yeah.

Teacher: Okay. Or what sort of skillcation could you see yourself going on? Or is there any place you want to travel to but also learn something from that country as well?

Student: So next month, I go to Korea. So my friends and I try to wear the traditional Korean dress.

Teacher: Oh, like hanbok.

Student: Hanbok. Yeah. Yeah. You mean? Hanbok.

Yeah. So, and we try to go to, like, traditional restaurant. So we can eat the traditional meals.

Teacher: うん。

Student: Which is like, used to be kings and queens used to eat, like, type of this meals. So I''m not sure this is skillcations, but I want to know some history, if I go to other countries. So and also, my bucket list is also, I want to go to China, and I try to wearing Chinese traditional dress and went to some historical places.

Teacher: うん。 Yeah. Yeah. I guess, yeah, trying on the different traditional clothing would also be a skillcation, I suppose. So if you learn how to put on this type of dress, then, yeah, I would consider that skillcation. うん。 Yeah. I think maybe just going to restaurants or learning about history is just normal travel experience.

But, yeah, I think some of those would count as a skillcation too. Okay. Okay. Good. Or yeah.

Or have you ever taken a class other than English when you went to Malta, when traveling? Or it could be in Japan. So not only in another country, but domestic travel. That''s all.

Student: Oh, I''m not sure also this is skillcation, but when I went to South part of Malta, I tried to ride horse.

Teacher: Oh, yeah. Yeah. Horse riding.

Student: Horse riding.

Teacher: うん。 うん。 Oh, yeah. I guess but you rode the horse by yourself or someone taught you how to ride the horse or the horse, I guess, automatically walked you to some place?

Student: So not, not ride, just horse.

Teacher: Horse?

Student: Keep the, like, call.

Teacher: Oh, carriage, maybe. Carriage.

Student: Carriage. Yes. うん。

Teacher: うん。 I see.

Student: Carriage. And I sit in the front of carriage, and I hold the ropes. うん。

Teacher: Oh, I see. I see. So, yeah, not just the normal, like, horse

Student: Normal horse riding. Yeah.

Teacher: You could control the horse using

Student: Yeah. Yeah. Yeah.

Teacher: Yeah. I would say that''s a skill in itself. I would consider that skillcation too. Okay. Yeah. Yeah. So I think that''s fine.

Or moving on to the forefront. What destinations are popular for travelers with your hobbies? Your hobbies like music or vlogging or

Student: Pure.

Teacher: Yeah. I don''t know if there''s any specific destinations. Again, it depends on the person or which country those people want to go to.

Student: So for around me, my many friends really like beetles. So

Teacher: Oh, yeah.

Student: Yeah. Many people went to UK.

Teacher: うん。 うん。 うん。

Student: So I''m I also want to go. Yeah.

Teacher: Alright. Again, like Liverpool, Manchester, I think.

Student: Yeah. Yeah. Yeah.

Teacher: Good cities for people who are interested in, like, UK music, that sort of thing.

Student: Yeah. Some people like classic music. So many people also went to Austria. Austria.

Teacher: Oh, yeah. Austria.

Student: Yeah. うん。

Teacher: Because, yeah, that''s where, what''s it called, Sound of Music or some musical was, I think, in Austria maybe. But Austria, yeah, was also well known for, like, its kind of classical music or improv music too, I think. うん。 うん。

Yeah. Well, of course, people who like K-pop will go to South Korea, of course.

Student: So Yeah. うん。

Teacher: Okay. Yeah. And one, do you prefer active or relaxing vacations, or has this changed over time?

Student: Oh, I prefer active vacations, because I don''t want to waste the time. So, if I went if I got to a domestic travel, it''s okay just relaxing. So do, like, kind of activity. So but if I go to overseas, I want to go many places and do many activities.

Teacher: So

Student: Or, like, like yeah. So, like, step away. So

Teacher: Right. Right. Or yeah. I guess well, of course, it''s very expensive to go to other countries. So when we go to other countries, we want to make the most of our time in those places.

Right? うん。 Yeah. That''s okay. Good phrase.

We want to make or I want to make the most of my time when traveling. Yeah. I agree. Yeah. I guess recently, my most recent vacations have only really been relaxing.

I haven''t done, again, any, like, sushi making or but, yeah, I guess, I don''t know if I''ll do any more cooking classes in Japan because the first time I went to Japan, I did the sushi making class. And then after that, I went back to England and worked at Japanese restaurant. So I think I already know how to make. But, yeah, if I ever go to, like, another country, like, not Asian country, I want to learn how to make the food of those countries too. Yeah.

Okay. I guess that''s all for questions. How much time oh, yeah. So let''s move on to these further ones too.

Student: うん。

Teacher: What sort of locations could people take in Japan?

Student: Like, we are in kimono, visiting some temples and try to, like, pray to something.

Teacher: To pray to, like, Buddhist God or some God.

Student: Buddhist style. Yeah. うん。 うん。 うん。

Teacher: Oh, yeah. Like learning about Buddhism, I suppose.

Student: Yeah.

Teacher: Yeah. I''m trying to think about the UK. I guess, how to serve afternoon tea is the first thing. Yeah. Though I I''ve never really researched, like, skillcations in England,

Student: but I''m

Teacher: sure there''s many, like, maybe, like, beer brewing is probably

Student: Ah. Like this location.

Teacher: Or in Japan, like, making green tea or matcha tea.

Student: Yeah. Yeah. Yeah. Yeah. うん。

Teacher: Okay. Good. Or second one here. What do you make of the idea that being a beginner is good for our well-being?

Student: Idea.

Teacher: Oh, yeah. I guess, do you agree that, if you''re a beginner at something, it improves your mental health? Or

Student: So recently, I often lost my confidence about speaking English, because yesterday, someone talked to me to how to get to the Skytree, but I could answer it, but I couldn''t speak faster and well. So at that time, I really feel nervous. But, at that time, I remember when I started to learn English. So maybe at that time, three or four years ago, maybe I couldn''t answer for her to get actually, so from the start, I feel very progress to speaking English, but now I lost confidence many times. But, compare the from the start and now, my skills also progress, but

Teacher: Yeah. Yeah. Yeah.

Student: So I want to keep motivation to study.

Teacher: Yeah. Yeah. Absolutely. I guess, again, I think that situation where somebody suddenly asks you a question and it yeah.

Always, like, I suppose if you''re not prepared for that question, then at first, we might forget things very easily. It''s happened to me in Japan too, many times. So when speaking Japanese, even if it''s very simple Japanese, I sometimes even figure

Student: out this way. So,

Teacher: but, again, these experiences are good for, again, learning about our mistakes or realizing what we''re not confident in doing. So I think these

Student: Yes.

Teacher: Yeah. We shouldn''t think of them as negative experiences, but experiences to improve our skills. Right?

Student: Yeah. Yes.

Teacher: Yeah. Okay. I think that''s all, though, for now. So we''ll finish that.

Okay. Let me send you this article too.

Student: Okay. I copy that.

Teacher: Okay. Good. Yeah. I''ll see you next time.', NOW(), NOW())
RETURNING id INTO v_booking2_id;


-- Booking 3: 2026-04-05, 30min (NO summary - reviewer can generate)
INSERT INTO bookings (id, user_id, date, start_time, duration_minutes, status, whereby_meeting_id, transcription_id, transcript_text, cleaned_transcript, created_at, updated_at)
VALUES (gen_random_uuid(), v_user_id, '2026-04-05', '23:00:00', 30, 'confirmed', '125952506', '661f6a6b-ad44-4d64-812d-e055948de868', '
Speaker 0: Hey. Hello.

Speaker 1: I''m sorry. I''m late.

Speaker 0: Oh, no problem. It''s fine. Okay. How are you?

Speaker 1: I''m good. Thank you.

Speaker 0: Good. Good to hear. Doing well. Thanks. I''m pretty good.

So any news this week?

Speaker 1: Today, I I worked. Mhmm. Like, even though it was Sunday.

Speaker 0: Sunday. Oh, yeah. Easter Sunday too, I guess.

Speaker 1: In Japan,

Speaker 0: it''s not national holidays.

Speaker 1: No. Nobody cares about Easter.

Speaker 0: Right. But, yeah, usually on the weekend, people have a day off. So it''s, unfortunate we had to work today.

Speaker 1: Yes. Yeah. It was so busy. Mhmm. Did you did you something?

Do did you do something on Easter?

Speaker 0: Yeah. Well, today, so far, it''s just been a normal day. I haven''t done anything special for Easter. Later, my family will exchange chocolate. So we''ll give chocolate eggs to each other.

Easter eggs. Mhmm. And I will make Easter dinner tonight

Speaker 1: as well.

Speaker 0: So, but I won''t go anywhere, or we''re not going out to restaurant or anything.

Speaker 1: Mhmm. What are you going to make Mhmm. For dinner?

Speaker 0: Yeah. So I will make, bangles and mash. Have you heard of it before? No. Oh, really?

Okay. Well, this is a British not not really eastern. It''s a kind of British food. So let me show you. Yes.

So Bangus and Mash is here. So, basically, sausage and mashed potato and green peas. Mhmm. It''s like a onion

Speaker 1: green peas. Green peas?

Speaker 0: Oh, green peas.

Speaker 1: Oh, green peas. Green peas. But it''s the sauce.

Speaker 0: Oh, so the sauce is onion gravy. Onion gravy.

Speaker 1: Gravy. So gravy sauce.

Speaker 0: Yeah. It''s difficult to find gravy sauce

Speaker 1: in Japan.

Speaker 0: Oh, well, when I went to Japan, I found gravy sauce, but I had to go to, like, international supermarket too. I think I told you before. Azabu Azabu National, I think, is the name of this supermarket. Let me find this too. Oh, yeah.

National Azabu is the name of this.

Speaker 1: I haven''t been there.

Speaker 0: But, yeah. This supermarket is very expensive actually. So but, yeah. I made, yeah, I made bangas and mash in Japan as well. But total cost for this dinner was about 7,000 yen.

Speaker 1: So Yeah.

Speaker 0: It''s used ingredients from other countries.

Speaker 1: So Expensive.

Speaker 0: But I think I bought some other things for, like, breakfast too. But but, yeah, to find, like, the sausage and the gravy sauce, it was expensive too. And maybe this shop has collaboration with Sean the sheep. Do you know? Sean the sheep?

Speaker 1: Yes. It''s a sheep. Not Sean. Yeah. So

Speaker 0: Okay. So this is not as collaboration with Sean. I I was very surprised to see

Speaker 1: to see. Come. Cute. Mhmm. I have a I had a toy over

Speaker 0: Oh, really?

Speaker 1: So Neji.

Speaker 0: Neji.

Speaker 1: Oh. What do you say?

Speaker 0: Oh, I see. Like a wind up toy, maybe.

Speaker 1: Wind up.

Speaker 0: Toy. Alright. So

Speaker 1: you wind it up.

Speaker 0: Yeah. What''s more?

Speaker 1: Start walking. Walking.

Speaker 0: Oh, I see. Or maybe something similar to this kind of thing maybe. Oh oh, sorry.

Speaker 1: I lost my card. So when my son saw this toy, he was so scared.

Speaker 0: Really scared.

Speaker 1: So

Speaker 0: Oh, how how old was he when

Speaker 1: Maybe two or three years old. Okay.

Speaker 0: Makes sense. Well, yeah. Sean is not scary. So but, maybe the eyes are very, intense eyes maybe.

Speaker 1: Yeah. Mhmm.

Speaker 0: I see. That''d be interesting. Yeah. But, thought today here, I guess we''ll exchange, again, Easter eggs. So, like, this kind of yeah.

This is very popular gift for Easter. So chocolate egg, mug cup, and snack as well.

Speaker 1: Great tea.

Speaker 0: But, yeah, in in my cupboard, I have so many of this type of Easter cup, from previous Easters. So maybe I I have four or five Easter egg marks in my, kitchen.

Speaker 1: Why rabbits? I don''t know.

Speaker 0: Yeah. Why are rabbits associated with Easter? Mhmm. Oh, I''m I''m not too sure because rabbits do not lay eggs. So I I wonder why.

I I have no idea. I haven''t researched the history of why rabbits are associated with

Speaker 1: Why rabbits?

Speaker 0: I guess maybe usually, rabbits'' children are born during spring season. So March or April. Many young rabbit babies are born during this season.

Speaker 1: Maybe that''s all. Okay.

Speaker 0: Yeah. So I guess let''s move on to today''s topic too, which is also related to chocolate. So, this of course is very famous in Japan.

Speaker 1: We love it.

Speaker 0: But this story is about, thieves who stole 410,000 Kit Kats. Mhmm. I I mean, this yeah. This situation seems to happen quite often or every year.

Speaker 1: So

Speaker 0: for thieves steal a lot of Kit Kats or some other snack, it''s

Speaker 1: kind of

Speaker 0: a strange thing to yeah. I''m not I''m not sure why. Again, maybe it''s very valuable or

Speaker 1: maybe

Speaker 0: it''s easy to steal kitten. Okay. But let''s look at some vocabulary

Speaker 1: Yeah. Range. Range. Range. So a

Speaker 0: group of many different types of things in the same category. So, yeah, we often say a a wide range. This is very common phrase, I guess. A wide range of fruits, a wide range of vegetables. Uniqlo has a wide range of clothing, I suppose, or wide range of T shirts or jeans.

Speaker 1: Mhmm. Wide range.

Speaker 0: A wide range just means many kinds of

Speaker 1: Mhmm. Okay. Next one. Escape. Escape.

Speaker 0: To get away. To escape. Mhmm.

Speaker 1: Theft.

Speaker 0: Oh, yeah. Yeah. I guess is, Yeah. Yeah. But thief is Thief?

Speaker 1: Now Yeah.

Speaker 0: Mhmm. Okay.

Speaker 1: Next Mhmm. Investigation. Mhmm. Come back.

Speaker 0: Mhmm. So I guess, for example, Sherlock Holmes does an investigation to find the crime or or yeah. Sherlock Holmes, very famous, like, British investigator or but, actually, I''ve never watched Sherlock Holmes before, so I''m not sure. Let''s see, though. In in Japanese, what do we say?

Investigation in Japanese. Okay.

Speaker 1: Okay.

Speaker 0: A little difficult, English, I guess. And next.

Speaker 1: Highlight.

Speaker 0: Mhmm. Highlight or to highlight as it were. Well, to highlight is just yet to focus on something, to pay attention to something. Okay. Last one.

Speaker 1: Cargo.

Speaker 0: Cargo. Cargo.

Speaker 1: Mhmm.

Speaker 0: So yeah. Just any item or goods which is carried by ship or plane. Mhmm. Imported goods, exported goods.

Speaker 1: Mhmm.

Speaker 0: Okay. But, again, just, this story is about thieves who stole a lot of Kit Kats from a cargo truck or from a transportation truck. So the Swiss company that owns KitKat said the truck full of KitKat bars was stolen somewhere between Italy and Tolland on March 26. Yeah. This truck was delivering Kit Kats to a number of places in Europe.

Oh, but I guess here''s why they sold it. The new Kit Kats are part of a new range inspired by formula one

Speaker 1: racing.

Speaker 0: Maybe formula one fan or Otaku store Kit Kats

Speaker 1: or maybe they

Speaker 0: want oh, I guess maybe this formula one Kit Kat is very popular so many people want to buy them. Or

Speaker 1: or I

Speaker 0: guess there''s some English here too. So to of course, Kit Kat''s slogan is have a break. Have Well,

Speaker 1: actually, in

Speaker 0: Japan, though, maybe what slogan does Kit Kat have in Japan?

Speaker 1: Same.

Speaker 0: Same? Oh, okay. Have a

Speaker 1: break. Have a Kit Kat. So

Speaker 0: Okay. Okay.

Speaker 1: But I I thought is British company because in Japan, commercial commercial TV commercial.

Speaker 0: Mhmm. Mhmm.

Speaker 1: Actress is eating Kit Kat in front of Buckingham Palace.

Speaker 0: Oh, already.

Speaker 1: Oh, so. The result. Mhmm. Result. Kit Kat is from England.

Speaker 0: Actually, I thought that too, but I I was surprised to hear it''s a Swiss company. So I I thought Nestle was also British, but and maybe yeah. Cadbury is England''s chocolate company. Cadbury.

Speaker 1: Mhmm.

Speaker 0: Mhmm. Well, yeah. The slogan is have a break, but this, article teaches the phrase make a break. So to make a break if something is to, well, to quickly escape or

Speaker 1: to run a break. So bad.

Speaker 0: If we say, like, make a break for it. Oh, yeah. This phrase means, like, yeah. Run away or or keep run away. That kind of mean.

Okay. So the reason they were stolen is because, again, maybe these formula one KitKat bars are very, valuable or expensive. So that''s why they stole them. Okay. But, yeah, any thoughts about that story, about this theft?

Speaker 1: I don''t

Speaker 0: think it''s ever happened in Japan. I don''t think it''s

Speaker 1: been a

Speaker 0: kid cat thieves.

Speaker 1: No. Every year, do does it happen every

Speaker 0: year? I remember it happened I don''t know about last year, but 2024, I think it happened in America too. So some company imported many Japanese Kit Kats from Japan. When they arrived in America, they all went missing or taken on the ship.

Speaker 1: Like matcha Kit Kat.

Speaker 0: Yeah. Matcha flavored Kit Kat or Wasabi Kit Kat.

Speaker 1: Mhmm. Like,

Speaker 0: Japanese flavor. Or have you ever tried Wasabi Kit Kats before?

Speaker 1: Not yet. Oh. Have you?

Speaker 0: Oh, yeah. I I tried them one time. Actually, yeah, it''s unexpectedly delicious. So I

Speaker 1: I I like

Speaker 0: wasabi, kick cans.

Speaker 1: Oh, really? I haven''t seen wasabi flavor.

Speaker 0: Oh. I think. Yeah. When did I actually, I think I ate them in England. Because, yeah, many years ago, I had, like, subscription box which sent many items from Japan to my house.

So one of the items in this box was a wasabi Kitka, so I could try. Maybe even in Japan, it''s a bit rare to find.

Speaker 1: Yeah. Yes. I think so.

Speaker 0: Okay. Or do you have any favorite flavor of KitKat? Cheesecake. Cheesecake? Or

Speaker 1: what? My it come back. I prefer baked baked cheesecake. Mhmm. It works like a delicious.

Speaker 0: I see. Interesting. Interesting.

Speaker 1: Yeah. Yeah. It''s interesting. Mhmm. Toaster.

Toaster.

Speaker 0: Toaster. Toaster. Maybe.

Speaker 1: Mhmm. Toast.

Speaker 0: A little toasted.

Speaker 1: Smells good.

Speaker 0: I see. Or maybe this

Speaker 1: Mhmm. Ah, yes. Yes. Yes.

Speaker 0: Yes. Mhmm.

Speaker 1: Like that.

Speaker 0: I see. Yeah. In in England, we don''t have many flavors. Only milk chocolate or dark chocolate. Sometimes we see, like, orange chocolate

Speaker 1: Kit Kat. Orange and We don''t mushy.

Speaker 0: Yeah. Yeah. Actually, orange. Maybe my second most favorite Kit Kat, I think. Well, actually, wasabi would be my favorite.

Speaker 1: And

Speaker 0: that''s my second favorite, I think. Oh, no. Yeah. Maybe we have New York cheesecake in Taco Taco. Kit Kat.

Speaker 1: Have you have you eaten this?

Speaker 0: Oh, New York cheesecake. Mhmm. Oh, yeah. I I don''t think I''ve ever seen in the supermarket. Maybe again, I think it''s quite rare to find in The UK.

So not all supermarkets sell them. Okay. Well, other than KitKat, do you have any other favorite chocolate bars or chocolates in Japan?

Speaker 1: KitKat?

Speaker 0: Yeah. Other than gift card. So

Speaker 1: other than. Chocolate. I but, I I forgot the name. I

Speaker 0: It''s a Japanese?

Speaker 1: Yeah. Maybe. I think so. Today, I bought it.

Speaker 0: Oh, I see. I forgot. If you''re if you remember later, please tell me. Okay. Yeah.

Yeah. I think Kit Kat would be my favorite. Oh, in England, we have something called, penguin penguin balls. Yeah. Oh, penguin, it''s very similar to Tim Tam.

Do you know?

Speaker 1: Oh, TimTom. I maybe I I know it. TimTom.

Speaker 0: Australian. In England, penguin balls. This this is very, like, simple chocolate ball, but it''s very delicious, actually. So this one oh, sorry. I haven''t I''m just not showing this this chocolate here.

So well, appearance just looks very simple or not delicious, but, actually, the flavor is very good. Oh, yeah. I guess it''s

Speaker 1: like that. Simple. Mhmm.

Speaker 0: Mhmm. Yeah. Like that. Or I guess yeah. The UK has so many interesting ones.

There''s, like, happy hippo, which is not really chocolate bar. It''s kind of

Speaker 1: a

Speaker 0: In the middle.

Speaker 1: This is

Speaker 0: also very good too. Well, Tunox also is a very good chocolate brand in The UK. I think this is a Scottish, company, but they make like, chocolate, chocolate tea cake.

Speaker 1: Yeah. We''re so Mhmm.

Speaker 0: These are quite good too. Okay. Then this question, do you have a major sweet tooth? Oh, major sweet tooth for, I guess, do you crave sweet things? Is it the same?

Speaker 1: Yes.

Speaker 0: I guess, do you prefer, again, chocolaty foods or fruity or creamy? What what kind of food you like?

Speaker 1: It''s difficult question.

Speaker 0: Maybe depends on your maybe.

Speaker 1: Oh, yeah. But I I like chocolate. Mhmm. Mhmm. So better perfect.

I like perfect. Chocolate to perfect. Perfect.

Speaker 0: Perfect. Yeah. Yeah. So

Speaker 1: Chocolate, cream, ice cream, sometimes bananas or something.

Speaker 0: I see. Yeah. Oh, when is white day in Japan? Or maybe already finished.

Speaker 1: March March 14.

Speaker 0: March 14. Oh, okay. Oh, I see. So, actually, it finished already, last month. But, yeah.

Did you get any chocolate on No. Oh, no. I understand.

Speaker 1: Because I I didn''t I didn''t give chocolate

Speaker 0: right. Right. You

Speaker 1: for Valentine''s Day.

Speaker 0: For Valentine''s Day to receive chocolate on like, okay. I see. K. Good. Let''s do fifth one here.

Are you a fan of Formula one, or do you have a favorite driver? I guess, very different.

Speaker 1: For me. I Yeah. I I don''t know any anybody.

Speaker 0: In your own time.

Speaker 1: I I don''t

Speaker 0: know why I performed that one. Mhmm. But also on this topic, I saw seven eleven has a very interesting sandwich recently. Have you seen this one? Crazy new viral sandwich.

Speaker 1: Oh, on it on Internet, I saw it. I didn''t want to actually, I didn''t see the sandwich, the real real.

Speaker 0: Mhmm. I see. I guess Mhmm. It''s a little strange, but,

Speaker 1: I guess,

Speaker 0: maybe kind of like a cake or not not really sandwich, but more of a sweet dessert. It reminds me of fairy bread. Have you heard of fairy bread before?

Speaker 1: No. Fairy bread. I didn''t know.

Speaker 0: Fairy bread, it''s actually like an Australian traditional traditional food. Like this. So it''s kind of plain white bread with butter and sprinkles on top. Sugary. I''m not sure what the flavor is, but maybe it''s just like a sweet, flavor, candy.

Speaker 1: Do they eat I don''t know. For breakfast or lunch or dinner?

Speaker 0: Breakfast I''ve had in Australia. This is a popular breakfast.

Speaker 1: It

Speaker 0: I think maybe American people would like this for Australia.

Speaker 1: In Japan, I we don''t we don''t eat sweet things for breakfast. So it''s not

Speaker 0: Alright.

Speaker 1: I feel it''s weird.

Speaker 0: Mhmm. Mhmm. Oh, I see. Well, did you have breakfast this morning?

Speaker 1: No. I usually don''t eat breakfast. Oh. Breakfast. Mhmm.

Only water.

Speaker 0: I actually only like to drink. Yeah. But I guess for me, yeah, I usually have something sweet in the morning or

Speaker 1: this morning.

Speaker 0: Banana and peanut butter on toast, I guess, is that.

Speaker 1: I

Speaker 0: guess it''s like a mix of sweet and salty. It''s not too sweet. But peanut butter. I guess in England, we think peanut butter is like a healthy food, but how about considered a health food or a sweet food or, what do Japanese people think about peanut butter? Is it healthy or not healthy?

Speaker 1: No. I think peanut butter is not so popular. Because in in Japan, peanut butter is not so good.

Speaker 0: Not so good.

Speaker 1: I don''t know. Peanuts but not

Speaker 0: The quality of peanut butter

Speaker 1: in Japan. Yes. Yes.

Speaker 0: Yes.

Speaker 1: Yes. The quality of peanut butter in Japan is not so good. So maybe American YouTuber said so. The real peanut butter is more delicious.

Speaker 0: Yeah. Oh, I see. I''ve never tried it in Japan. I think the same thing about sausage in Japan too. Or Bacon.

Oh, yeah. Yeah. Although I I didn''t think I''ve

Speaker 1: tried bacon.

Speaker 0: In Japan, sausage is very thin or

Speaker 1: soft, I guess. But

Speaker 0: Yes. British sausage is much more thick. It''s, my preferred type of sausage. Okay. Anyway, I think that will be all for today.

Right?

Speaker 1: Oh, okay.

Speaker 0: That''s great. I''ll see you again next time. Next week, I think we have another lesson.

Speaker 1: Yes. Next week. Okay. I''ll see you then. Thank', 'Teacher: Hey. Hello.

Student: I''m sorry I''m late.

Teacher: Oh, no problem. It''s fine. Okay, how are you?

Student: I''m good, thank you.

Teacher: Good. Good to hear. I''m doing well, thanks. I''m pretty good. So, any news this week?

Student: Today, I worked. Even though it was Sunday.

Teacher: Sunday. Oh, yeah. Easter Sunday too, I guess.

Student: In Japan, it''s not national holiday.

Teacher: No. Nobody cares about Easter.

Student: Yes. Yeah. It was so busy. Did you do something? Did you do something on Easter?

Teacher: Yeah. Well, today so far, it''s just been a normal day. I haven''t done anything special for Easter. Later, my family will exchange chocolate, so we''ll give chocolate eggs to each other. Easter eggs. And I will make Easter dinner tonight as well. So I won''t go anywhere, or we''re not going out to a restaurant or anything.

Student: What are you going to make for dinner?

Teacher: Yeah. So I will make bangers and mash. Have you heard of it before?

Student: No.

Teacher: Oh, really? Okay. Well, this is a British, not really Easter, it''s a kind of British food. So let me show you. So bangers and mash is here. So basically, sausage and mashed potato and green peas. It''s like onion gravy.

Student: Green peas?

Teacher: Oh, green peas.

Student: Oh, green peas. But it''s the sauce.

Teacher: Oh, so the sauce is onion gravy.

Student: Gravy.

Teacher: Yeah, gravy sauce. It''s difficult to find gravy sauce in Japan.

Student: In Japan.

Teacher: Oh, well, when I went to Japan, I found gravy sauce, but I had to go to an international supermarket too. I think I told you before. National Azabu, I think, is the name of this supermarket. Let me find this too. Oh, yeah. National Azabu is the name of this. This supermarket is very expensive, actually. But yeah, I made bangers and mash in Japan as well. But total cost for this dinner was about 7,000 yen.

Student: So expensive.

Teacher: It''s used ingredients from other countries. But I think I bought some other things for breakfast too. But yeah, to find the sausage and the gravy sauce, it was expensive too. And maybe this shop has a collaboration with Shaun the Sheep. Do you know Shaun the Sheep?

Student: Yes. It''s a sheep. Not Sean.

Teacher: Yeah. So, okay. So this is not a collaboration with Shaun. I was very surprised to see it.

Student: Cute. I have a toy.

Teacher: Oh, really?

Student: ねじ.

Teacher: ねじ.

Student: Oh. What do you say?

Teacher: Oh, I see. Like a wind-up toy, maybe.

Student: Wind up.

Teacher: Toy. All right. So...

Student: You wind it up.

Teacher: Yeah. What''s more?

Student: Start walking. Walking.

Teacher: Oh, I see. Or maybe something similar to this kind of thing, maybe. Oh, sorry.

Student: I lost my card. So when my son saw this toy, he was so scared.

Teacher: Really scared?

Student: So...

Teacher: Oh, how old was he when...?

Student: Maybe two or three years old.

Teacher: Okay. Makes sense. Well, yeah, Shaun is not scary. But maybe the eyes are very intense, maybe.

Student: Yeah.

Teacher: I see. That''d be interesting. Yeah. But today here, I guess we''ll exchange Easter eggs again. So like this kind of thing. This is a very popular gift for Easter. So chocolate egg, mug cup, and snack as well.

Student: Great tea.

Teacher: But yeah, in my cupboard, I have so many of this type of Easter cup from previous Easters. So maybe I have four or five Easter egg mugs in my kitchen.

Student: Why rabbits?

Teacher: Yeah. Why are rabbits associated with Easter? Oh, I''m not too sure because rabbits do not lay eggs. So I wonder why. I have no idea. I haven''t researched the history of why rabbits are associated with Easter.

Student: Why rabbits?

Teacher: I guess maybe usually rabbits'' children are born during spring season, so March or April. Many young rabbit babies are born during this season.

Student: Maybe that''s all.

Teacher: Yeah. So I guess let''s move on to today''s topic too, which is also related to chocolate. So this, of course, is very famous in Japan.

Student: We love it.

Teacher: But this story is about thieves who stole 410,000 Kit Kats. I mean, this situation seems to happen quite often, or every year. For thieves to steal a lot of Kit Kats or some other snack, it''s kind of a strange thing to... I''m not sure why. Again, maybe it''s very valuable, or it''s easy to steal Kit Kats. Okay. But let''s look at some vocabulary.

Student: Range. Range.

Teacher: A group of many different types of things in the same category. So yeah, we often say a wide range. This is a very common phrase, I guess. A wide range of fruits, a wide range of vegetables. Uniqlo has a wide range of clothing, I suppose, or a wide range of T-shirts or jeans.

Student: Wide range.

Teacher: A wide range just means many kinds of...

Student: Okay. Next one. Escape.

Teacher: To get away. To escape.

Student: Theft.

Teacher: Oh, yeah. Yeah. I guess... But thief is... Thief?

Student: Now...

Teacher: Okay.

Student: Next. Investigation.

Teacher: So I guess, for example, Sherlock Holmes does an investigation to find the crime. Sherlock Holmes is a very famous British investigator. But actually, I''ve never watched Sherlock Holmes before, so I''m not sure. Let''s see, though. In Japanese, what do we say? Investigation in Japanese. Okay.

Student: Okay.

Teacher: A little difficult, English, I guess. And next.

Student: Highlight.

Teacher: Highlight, or to highlight as it were. To highlight is just to focus on something, to pay attention to something. Okay. Last one.

Student: Cargo.

Teacher: Cargo. So yeah, just any item or goods which is carried by ship or plane. Imported goods, exported goods.

Student: Mhmm.

Teacher: Okay. But again, this story is about thieves who stole a lot of Kit Kats from a cargo truck, or from a transportation truck. So the Swiss company that owns KitKat said the truck full of KitKat bars was stolen somewhere between Italy and Poland on March 26. Yeah, this truck was delivering Kit Kats to a number of places in Europe. Oh, but I guess here''s why they stole it. The new Kit Kats are part of a new range inspired by Formula One racing.

Student: Racing.

Teacher: Maybe Formula One fan or otaku stole Kit Kats, or maybe they want... Oh, I guess maybe this Formula One Kit Kat is very popular, so many people want to buy them. Or... I guess there''s some English here too. So, of course, Kit Kat''s slogan is "Have a break. Have a Kit Kat." Well, actually, in Japan though, maybe what slogan does Kit Kat have in Japan?

Student: Same.

Teacher: Same? Oh, okay. "Have a break. Have a Kit Kat." So...

Student: But I thought it''s British company because in Japan, commercial, TV commercial, actress is eating Kit Kat in front of Buckingham Palace.

Teacher: Oh, really?

Student: So. The result.

Teacher: Result?

Student: Kit Kat is from England.

Teacher: Actually, I thought that too, but I was surprised to hear it''s a Swiss company. So I thought Nestlé was also British, but... And maybe, yeah, Cadbury is England''s chocolate company. Cadbury.

Student: Mhmm.

Teacher: Well, yeah, the slogan is "Have a break," but this article teaches the phrase "make a break." So to make a break, if something is, well, to quickly escape or...

Student: To run a break. So bad.

Teacher: If we say, like, "make a break for it," this phrase means, like, yeah, run away or keep running away. That kind of thing. Okay. So the reason they were stolen is because, again, maybe these Formula One Kit Kat bars are very valuable or expensive. So that''s why they stole them. Okay. But yeah, any thoughts about that story, about this theft?

Student: I don''t think it''s ever happened in Japan. I don''t think it''s been a Kit Kat thieves.

Teacher: No. Every year, does it happen every year? I remember it happened, I don''t know about last year, but 2024, I think it happened in America too. So some company imported many Japanese Kit Kats from Japan. When they arrived in America, they all went missing or were taken on the ship.

Student: Like matcha Kit Kat.

Teacher: Yeah. Matcha-flavored Kit Kat or wasabi Kit Kat.

Student: Like Japanese flavor.

Teacher: Or have you ever tried wasabi Kit Kats before?

Student: Not yet. Have you?

Teacher: Oh, yeah. I tried them one time. Actually, yeah, it''s unexpectedly delicious. So I like wasabi Kit Kats.

Student: Oh, really? I haven''t seen wasabi flavor.

Teacher: Oh. I think... Yeah. When did I...? Actually, I think I ate them in England. Because, yeah, many years ago, I had a subscription box which sent many items from Japan to my house. So one of the items in this box was a wasabi Kit Kat, so I could try. Maybe even in Japan, it''s a bit rare to find.

Student: Yeah. Yes. I think so.

Teacher: Okay. Or do you have any favorite flavor of Kit Kat?

Student: Cheesecake.

Teacher: Cheesecake? Or what?

Student: My... I prefer baked cheesecake. It works like a delicious.

Teacher: I see. Interesting. Interesting.

Student: Yeah. Yeah. It''s interesting.

Teacher: Toaster.

Student: Toaster.

Teacher: Maybe.

Student: Toast.

Teacher: A little toasted.

Student: Smells good.

Teacher: I see. Or maybe this...

Student: Ah, yes. Yes. Yes.

Teacher: Yes.

Student: Like that.

Teacher: I see. Yeah. In England, we don''t have many flavors. Only milk chocolate or dark chocolate. Sometimes we see, like, orange chocolate Kit Kat.

Student: Orange and... We don''t mushy.

Teacher: Yeah. Yeah. Actually, orange... Maybe my second most favorite Kit Kat, I think. Well, actually, wasabi would be my favorite. And that''s my second favorite, I think. Oh, no. Yeah. Maybe we have New York cheesecake in Tokyo. Kit Kat.

Student: Have you eaten this?

Teacher: Oh, New York cheesecake? Oh, yeah. I don''t think I''ve ever seen it in the supermarket. Maybe again, I think it''s quite rare to find in the UK. So not all supermarkets sell them. Okay. Well, other than KitKat, do you have any other favorite chocolate bars or chocolates in Japan?

Student: KitKat?

Teacher: Yeah. Other than KitKat. So...

Student: Other than... Chocolate. I... But I forgot the name. I...

Teacher: It''s Japanese?

Student: Yeah. Maybe. I think so. Today, I bought it.

Teacher: Oh, I see. I forgot. If you remember later, please tell me. Okay. Yeah. I think Kit Kat would be my favorite. Oh, in England, we have something called Penguin bars. Yeah. Oh, Penguin, it''s very similar to Tim Tam. Do you know?

Student: Oh, Tim Tam. I maybe I know it. Tim Tam.

Teacher: Australian. In England, Penguin bars. This is a very simple chocolate bar, but it''s very delicious, actually. So this one... Oh, sorry. I''m just not showing this chocolate here. So, well, appearance just looks very simple or not delicious, but actually, the flavor is very good. Oh, yeah. I guess it''s like that.

Student: Simple.

Teacher: Yeah. Like that. Or I guess, yeah, the UK has so many interesting ones. There''s, like, Happy Hippo, which is not really a chocolate bar. It''s kind of...

Student: In the middle.

Teacher: This is also very good too. Well, Tunnock''s also is a very good chocolate brand in the UK. I think this is a Scottish company, but they make, like, chocolate tea cake.

Student: Yeah. We''re so...

Teacher: These are quite good too. Okay. Then this question: do you have a major sweet tooth? A major sweet tooth, for, I guess, do you crave sweet things? Is it the same?

Student: Yes.

Teacher: I guess, do you prefer, again, chocolaty foods or fruity or creamy? What kind of food do you like?

Student: It''s difficult question.

Teacher: Maybe depends on your...

Student: Oh, yeah. But I like chocolate. So better perfect. I like perfect. Chocolate to perfect. Perfect.

Teacher: Yeah. Yeah. So...

Student: Chocolate, cream, ice cream, sometimes bananas or something.

Teacher: I see. Yeah. Oh, when is White Day in Japan? Or maybe already finished.

Student: March 14.

Teacher: March 14. Oh, okay. Oh, I see. So actually, it finished already, last month. But yeah. Did you get any chocolate on...?

Student: No.

Teacher: Oh, no. I understand.

Student: Because I didn''t give chocolate.

Teacher: Right. Right. You...

Student: For Valentine''s Day.

Teacher: For Valentine''s Day to receive chocolate on... Okay. I see. Okay. Good. Let''s do fifth one here. Are you a fan of Formula One, or do you have a favorite driver? I guess, very different.

Student: For me, I... I don''t know anybody.

Teacher: In your own time.

Student: I don''t know why I performed that one.

Teacher: But also on this topic, I saw 7-Eleven has a very interesting sandwich recently. Have you seen this one? Crazy new viral sandwich.

Student: Oh, on the internet, I saw it. I didn''t want to... Actually, I didn''t see the sandwich, the real one.

Teacher: I see. I guess it''s a little strange, but maybe kind of like a cake or not really a sandwich, but more of a sweet dessert. It reminds me of fairy bread. Have you heard of fairy bread before?

Student: No. Fairy bread. I didn''t know.

Teacher: Fairy bread, it''s actually like an Australian traditional food. Like this. So it''s kind of plain white bread with butter and sprinkles on top. Sugary. I''m not sure what the flavor is, but maybe it''s just like a sweet flavor, candy.

Student: Do they eat... I don''t know. For breakfast or lunch or dinner?

Teacher: Breakfast. I''ve had it in Australia. This is a popular breakfast.

Student: In Japan, we don''t eat sweet things for breakfast. So it''s not...

Teacher: All right.

Student: I feel it''s weird.

Teacher: Oh, I see. Well, did you have breakfast this morning?

Student: No. I usually don''t eat breakfast. Only water.

Teacher: I actually only like to drink. Yeah. But I guess for me, yeah, I usually have something sweet in the morning or this morning banana and peanut butter on toast, I guess, is that. I guess it''s like a mix of sweet and salty. It''s not too sweet. But peanut butter... I guess in England, we think peanut butter is like a healthy food, but how about considered a health food or a sweet food, or what do Japanese people think about peanut butter? Is it healthy or not healthy?

Student: No. I think peanut butter is not so popular. Because in Japan, peanut butter is not so good.

Teacher: Not so good.

Student: I don''t know. Peanuts but not...

Teacher: The quality of peanut butter in Japan?

Student: Yes. Yes.

Teacher: Yes.

Student: Yes. The quality of peanut butter in Japan is not so good. So maybe American YouTuber said so. The real peanut butter is more delicious.

Teacher: Yeah. Oh, I see. I''ve never tried it in Japan. I think the same thing about sausage in Japan too. Or bacon.

Student: Oh, yeah.

Teacher: Although I don''t think I''ve tried bacon in Japan. In Japan, sausage is very thin or soft, I guess. But...

Student: Yes.

Teacher: British sausage is much thicker. It''s my preferred type of sausage. Okay. Anyway, I think that will be all for today, right?

Student: Oh, okay.

Teacher: That''s great. I''ll see you again next time. Next week, I think we have another lesson.

Student: Yes. Next week. Okay. I''ll see you then. Thank you.', NOW(), NOW())
RETURNING id INTO v_booking3_id;


-- Summary for booking 1
INSERT INTO lesson_summaries (id, booking_id, user_id, summary_en, summary_ja, key_topics, mistake_patterns, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'The lesson focused on IELTS speaking practice, especially complaint-related questions (e.g., going back to a shop after a bad experience, and what people in Japan complain about). The student also practiced describing sports/football opinions and discussed vocabulary formation like turning adjectives into nouns with “-ness” (lateness, darkness, happiness, loneliness).', 'このレッスンではIELTSスピーキングの練習を中心に、クレームに関する質問（嫌な経験をした店にまた行くか、また日本人がよく不満に思うこと）を扱いました。さらに、スポーツ（サッカー）の話や、形容詞を「-ness」で名詞にする語（lateness, darkness, happiness, lonelinessなど）の作り方・使い方も練習しました。', '["IELTS speaking","complaints and bad experiences","sports discussion","adjective-to-noun (-ness) vocabulary"]'::jsonb, '[{"type":"word choice","correction":"I don''t go to bad shops.","explanation_en":"","explanation_ja":"“shop” はここでは一般的な意味なので複数形が自然です。日本語の「悪い店」→英語は “bad shops” のように複数にします。","example_student":"I don''t go to bad shop."},{"type":"grammar","correction":"One of the staff brought the cart, and the cart hit me.","explanation_en":"","explanation_ja":"過去の出来事なので “bring” は “brought” にします。また “One of the staff” は複数扱いなので “brought” が正しいです。さらに文は “and” で2つの出来事をつなぐと自然です。","example_student":"One of the staff bring the cart and this cart hit me."},{"type":"grammar","correction":"However, almost all the staff didn’t say anything and didn’t apologize to me.","explanation_en":"","explanation_ja":"“didn’t say that” は何を指すのかが曖昧で不自然です。ここは “say anything” や “say sorry” のように具体化すると自然になります。2つの否定は “and” でまとめるとスムーズです。","example_student":"However, almost all staff didn''t say that, didn''t apologize to me."}]'::jsonb, NOW());


-- Summary for booking 2
INSERT INTO lesson_summaries (id, booking_id, user_id, summary_en, summary_ja, key_topics, mistake_patterns, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'The lesson discussed the travel trend “skillcations” (skill + vacation), including vocabulary like pottery, energize, apologize, and fuel. The student practiced explaining their own experiences and preferences for vacations, and they also answered questions about beginner learning and mental health.', 'このレッスンでは「skillcations（スキル＋バケーション）」という旅行トレンドを扱い、pottery（陶芸）や energize（元気づける）などの語彙も確認しました。学生は自分の旅行経験や、アクティブ／リラックスの好み、さらに「初心者が良い影響を与えるのか」について説明する練習をしました。', '["skillcations","travel and learning","vocabulary practice","vacation preferences","mental health and beginners"]'::jsonb, '[{"type":"word choice","correction":"So I didn’t try after I grew up.","explanation_en":"“after I’m growing up” sounds unnatural. Use “grew up” for a past situation: “after I grew up.”","explanation_ja":"“after I’m growing up” は不自然です。“grow up” は過去の出来事なら “grew up” を使います。","example_student":"So I didn''t try after I''m growing up."},{"type":"grammar","correction":"So maybe if I try pottery now, I might not do well.","explanation_en":"“for now” doesn’t fit this context well. Also, instead of repeating “maybe,” use “might” to express possibility more naturally.","explanation_ja":"“for now” はこの文脈だと少し変です。また “maybe…maybe” が続くので、英語では “might” を使って可能性として言うと自然です。","example_student":"So maybe if I try the pottery for now, maybe I can''t do well."},{"type":"grammar","correction":"Next month, I’m going to Korea.","explanation_en":"For a future plan, “I’m going to” is more natural. “I go” sounds like present tense.","explanation_ja":"未来の予定は “be going to” が自然です。“I go” だと現在形に聞こえてしまいます。","example_student":"So next month, I go to Korea."},{"type":"grammar","correction":"Recently, I often lost confidence in speaking English. Yesterday, someone asked me how to get to the Skytree. I could answer, yet I couldn’t speak quickly or fluently.","explanation_en":"“lost my confidence about” is unnatural; use “lost confidence in.” Also, “talked to me to how…” should be “asked me how…”. Finally, restructure “could answer it, but…” to “could answer, yet…” for more natural flow.","explanation_ja":"“lost my confidence about” は不自然で、通常は “lost confidence in” を使います。“someone talked to me to how…” は “asked me how…” が正しい形です。さらに “could answer it, but…” は “could answer, yet…” のようにまとめると自然です。","example_student":"So recently, I often lost my confidence about speaking English, because yesterday, someone talked to me how to get to the Skytree, but I could answer it, but I couldn''t speak fast and well."}]'::jsonb, NOW());


-- Vocabulary phrases and cards

INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'after the lesson', 'Please check the summary after the lesson.', 'レッスンの後に', '宿題や復習のタイミングを言うときに便利。', 'Useful for talking about timing for review or homework.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'a bag of souvenirs', 'I came back with a bag of souvenirs, but I also learned a new skill.', 'お土産の袋', '“souvenirs” とセットでよく使う表現。', 'A natural collocation with “souvenirs.”', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'a complete beginner', 'Don’t worry—everyone starts as a complete beginner.', 'まったくの初心者', '初心者レベルを強調したいときに使う。', 'Emphasizes that someone has zero experience.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'give us a chance to', 'This trip gives us a chance to learn something new.', '〜する機会をくれる', 'チャンス・機会を説明するときの定番。', 'A standard structure for describing opportunities.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'feel productive', 'I like skillcations because I feel productive while traveling.', '生産的な気分になる', '旅行中でも「役に立ってる感じ」がする時に。', 'Use when you feel like you’re accomplishing something.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'make the most of my time', 'When I travel overseas, I want to make the most of my time there.', '時間を最大限に活用する', '旅行で「せっかくだから有意義に過ごしたい」を言える。', 'Means you want to use your time as efficiently as possible.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking2_id, v_user_id, 'keep motivation to study', 'Small progress helps me keep motivation to study.', '勉強するモチベーションを保つ', '継続の気持ちを表すときに便利。', 'Use when talking about maintaining study drive.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'a theft', 'The company reported a theft of thousands of items.', '盗難', '事件としての“盗むこと”を言う名詞です。', 'A noun for the act of stealing (as an incident).', 'business', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'to escape', 'The thief tried to escape before the police arrived.', '逃げる、脱出する', '危険や捕まる状況から逃れるときの動詞です。', 'A verb for getting away from danger or capture.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'a wide range of', 'Uniqlo has a wide range of clothing for different styles.', '〜の幅広い種類（例：a wide range of clothing）', 'いろいろな種類があるときに使います。', 'Use this when there are many different types of something.', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'have a sweet tooth', 'I have a sweet tooth, so I always want dessert.', '甘いものが好き（甘党）', '甘いものをよく食べたくなる人の言い方です。', 'Says you really like sweet things.', 'daily', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'to do an investigation', 'The detective did an investigation to find out what happened.', '調査する', '事件や事実を調べるときに便利です。', 'Useful for investigating a case or figuring out facts.', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'to highlight (something)', 'This article highlights how popular the new flavor is.', '〜を強調する／注目させる', '大事な点に焦点を当てるときに使います。', 'To focus attention on something important.', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking3_id, v_user_id, 'to make a break for it', 'When the alarm rang, he made a break for it.', '（急いで）逃げ出す', '“すぐ逃げる”ニュアンスの決まり文句です。', 'A set phrase meaning to quickly run away.', 'general', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'Would you go back to a shop you’ve had a bad experience in before?', 'Would you go back to a shop you’ve had a bad experience in before?', '前に嫌な経験をした店に、また行きますか？', 'IELTSの定番質問。 “a bad experience in” の形で「〜で嫌な経験」を表します。', 'A common IELTS question pattern. Use “a bad experience in” to mean “a bad experience at/in (a place).”', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'Call (someone) for customer service', 'I called the supermarket for customer service after the incident.', '（会社に）カスタマーサービスとして電話する', 'トラブル後に連絡する場面で使えます。', 'Useful when contacting a company after a problem.', 'business', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'Be disappointed with the result', 'Many fans were disappointed with the result.', '結果にがっかりする', 'スポーツの話でよく出る表現です。', 'Common in sports discussions.', 'social', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'Go back to (a place) after an experience', 'I don’t go back to that supermarket after that experience.', 'その経験の後に（その場所へ）戻らない', '“after” を使うと因果関係がはっきりします。', 'Using “after” makes the cause-and-effect clear.', 'daily', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'The lateness of public transport', 'Japanese people are often surprised by the lateness of public transport abroad.', '公共交通機関の遅れ', '“lateness” は “late” の名詞形で「遅れ（度合い）」です。', '“Lateness” is the noun form of “late,” meaning “the fact/amount of being late.”', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'The level of (something)', 'The level of the darkness in this room is not too high.', '（〜の）程度', '“level” を使うと「どれくらいか」を言いやすいです。', '“Level” helps you express “how much/how intense.”', 'academic', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


INSERT INTO vocabulary_phrases (id, booking_id, user_id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, created_at)
VALUES (gen_random_uuid(), v_booking1_id, v_user_id, 'Not too cold / not too warm', 'For us, it feels not too cold and not too warm.', '寒すぎず、暑すぎない', '温度の感覚をやわらかく表す定番表現です。', 'A natural way to describe temperature comfortably.', 'daily', NOW())
RETURNING id INTO v_phrase_id;

INSERT INTO vocabulary_cards (id, user_id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at)
VALUES (gen_random_uuid(), v_user_id, v_phrase_id, 'learning', NULL, 0, 1, 2.5, NOW(), NOW());


END $$;
