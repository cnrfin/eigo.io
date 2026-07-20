/* Shared student-review data + avatar colouring. Single source for the
   testimonials shown in the landing bento and the reviews carousel. */

export type Review = { name: string; text: string; image?: string }

/* Google-style avatar colours, hashed by name for a stable colour per person. */
export const AVATAR_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853',
  '#FF6D01', '#46BDC6', '#7B61FF', '#E91E63',
]

export function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* Profile photos live in /public/students. Reviews without a photo fall back
   to a colour-hashed initial avatar. */
const IMG = '/students/'

export const REVIEWS: Review[] = [
  { name: 'Toshi', text: 'He is a very kind teacher. He patiently listens to students even if their English is not good. He is also very knowledgeable about grammar. Above all, he is a very nice person. I recommend him.' },
  { name: 'KAORI', text: 'とても優しい。私の拙い英語も理解しようとしてくれる。' },
  { name: 'Ayumi', text: 'He is a very good teacher for me. He is patient, gentle and kind. And his English is so clear that I can understand what he says. 初心者の私にも聞き取りやすいようにはっきりゆっくり話してくれます。' },
  { name: 'Mami', text: 'I think he is the best teacher, especially for Japanese students and beginners, because he is kind and speaks very clear English.' },
  { name: 'Emi', text: 'Connor is an awesome tutor and a nice guy. I always enjoy talking to him. 英会話初心者が外国人から感じがちな威圧感もなく、最高に優しい先生です。', image: IMG + '63544f01d7135d2e16f45a4b_5efabc1cffe6c0e6a9c7f66es200.jpg' },
  { name: 'Yuto', text: 'He is patient, friendly. You can improve English skills through conversation with him :)' },
  { name: 'MIKI', text: 'いつも拙い英語を解釈してくれて有り難いです。日本語に理解のある先生なので初心者の方も安心して受講できます★' },
  { name: 'Takuya', text: 'He is very friendly. He speaks very politely. He is a very good teacher for beginners. Thank you for every lesson.' },
  { name: 'Namiko', text: "He's so sincere and very kind. I usually get so nervous in the lesson, but he makes me relaxed. He sounds posh and classy." },
  { name: 'Noriko', text: 'Very nice teacher! He is easy to talk to. I enjoyed his lesson. Thank you.' },
  { name: 'Aki', text: 'Connor先生は日本語を理解していらっしゃるので発音の指導の時に日本語の似ている音を例に挙げて説明してくれます。優しい雰囲気の方なのでネイティブの先生と話すことに慣れていない方にもおすすめします。' },
  { name: 'Tatsuo', text: 'Connor is very friendly and listens to me carefully. He can make me relaxed while talking. I greatly appreciate him.', image: IMG + '63544ee505de39ce521138f3_5dea4d52dcfd0a10d9a316e7s200.jpg' },
  { name: 'Ruiko', text: 'とても気さくで話しやすいですし、説明もわかりやすく大変親切かつ熱心な先生だと思います。間違っても優しく指導してくれます。', image: IMG + '63544ea70af27dde58caebbe_606b05572a3b4da978ecb64fs200.jpg' },
  { name: 'Maho O', text: 'He is a very good teacher to me. He is very kind and patient. I love English after his lesson.', image: IMG + '63584b5cd10a685212b50780_5f732758bfd6aaf421d0e7fes200.jpg' },
  { name: 'Ayaka', text: "He is really nice teacher!! If I don't understand a word, he explains it to me in an easy-to-understand way." },
  { name: 'Yuji S', text: 'Super-clear pronunciation, attention to detail and very kind personality :)' },
  { name: 'Takako', text: 'Connor先生は、忍耐強く話を聞いてくれます。そして、間違ったセンテンスは正しく言い直してくれるので、後で動画で復習ができます。初心者にはおすすめです。' },
  { name: 'Sara', text: 'とても優しく丁寧に教えていただけます！' },
  { name: 'Teruko', text: 'A teacher who teaches beginners very carefully. It will teach you various ways of expressing English. I highly recommend this teacher.', image: IMG + '63544eb2738f5f2f3a5edf06_602c3320f6fcca7e56849c87s200.jpg' },
  // Added from the Webflow student-review export.
  { name: 'Akane', text: '気さくで初心者に優しい。日本語ができるから、日本人はリラックスして英語のコミュニケーションができます。よい先生です。', image: IMG + '63544ebb6e708a36185aa8ef_5fce3e1954e6fb370756b989s200.jpg' },
  { name: 'Coco', text: "The lesson content is flexible according to the student's level. Even if I make the same mistake, he always teaches me kindly and politely. Connor is the best teacher I have ever had.", image: IMG + '635445fbdb028e41398739b0_IMG_0785.jpg' },
  { name: 'Take', text: "He's always patient and understands what I'm trying to say.", image: IMG + '63544ed4c396ae10b440c98f_60213623922291b12190f892s200.jpg' },
  { name: 'Taeko', text: "Connor always gives effective lessons and picks topics that I'm interested in." },
  { name: 'Takaki', text: '受講者のレベルに合わせ臨機応変に対応してくれて、さらに温かみのある先生です。コナー先生とのレッスンは今後も受けたいと思わせてくれます。' },
  { name: 'Yukiko', text: 'Connor先生は日本語が話せても英語で話してくれるので、こちらは訳がわからなくてもれっきとした生の英会話の勉強になり、咄嗟に外国人に話しかけられた時には役に立ちそうな気がします。' },
]

/* Fisher-Yates pick of n distinct reviews. */
export function pickRandomReviews(n: number): Review[] {
  const a = [...REVIEWS]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}
