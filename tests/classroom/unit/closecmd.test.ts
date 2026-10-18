import { studentClosesCourse as S, tutorClosesCourse as T, studentOpensCourse as O } from '@/lib/classroom/course-commands'
let bad = 0
const ok = (n: string, c: boolean) => { console.log((c ? 'ok   ' : 'FAIL ') + n); if (!c) bad++ }
// student, from the live test and close variants
for (const s of ['Uh, by the way Tom, could we close this course', 'Can you close the course?', 'Please close the slides.', 'Can we exit the course?', 'Let\'s just chat.', 'Can we just talk instead?', 'Switch to free talk please', 'Free talk please', 'コースを閉じてください', 'スライドを消して', 'フリートークにしたい', 'Close this lesson please'])
  ok('student closes: ' + s, S(s))
for (const s of ['I like the course', 'Can we do the course?', 'This lesson is close to what I need', 'Don\'t close the course', 'Next slide please', 'Can we stop for a second?', 'I want to finish the lesson', 'コースを続けたい', 'close'])
  ok('student does NOT close: ' + s, !S(s))
// tutor: the transcript lines joined up again, and natural confirmations
for (const s of ["Sure! I'll close the course now.", 'Done, we\'re out of the course.', "We're out of the course now.", "Okay, I've closed the course.", "Let's switch to free talk.", "Let's go back to free talk.", "Closing the course now.", "I'll stop the lesson here and we can chat."])
  ok('tutor closes: ' + s, T(s))
for (const s of ['Shall I close the course?', 'Do you want to close the course?', "Let's continue the course.", "I won't close the course yet, don't worry.", "We're close to the end of the lesson.", "Let's look at the next slide."])
  ok('tutor does NOT close: ' + s, !T(s))
ok('student closes: "Actually, let\'s do free talk"', S("Actually, let's do free talk"))
for (const s of ['Uh, I\'d love to tell you, but Tom, could we open the course again', 'Can we do the course?', 'Let\'s go back to the lesson.', 'Could you open the course?', 'Can we continue the lesson?', 'コースを開いてください', 'レッスンに戻りたい'])
  ok('student opens: ' + s, O(s))
for (const s of ['I like this course', 'What lesson is this?', 'Let\'s do a role play', 'Let\'s close the course', 'Don\'t open the course yet', 'I took a cooking course last year'])
  ok('student does NOT open: ' + s, !O(s))
console.log(bad ? bad + ' FAILED' : 'all passed')
