// LINE Messaging API — push messages to LINE users
// Requires LINE_CHANNEL_ACCESS_TOKEN env var (long-lived token from LINE Developers console)

const LINE_API = 'https://api.line.me/v2/bot/message/push'

function getChannelToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')
  return token
}

type FlexBubble = {
  type: 'bubble'
  body: {
    type: 'box'
    layout: 'vertical'
    contents: FlexComponent[]
    [key: string]: unknown
  }
  footer?: {
    type: 'box'
    layout: 'vertical'
    contents: FlexComponent[]
    [key: string]: unknown
  }
}

type FlexComponent = {
  type: string
  [key: string]: unknown
}

// Send a push message to a LINE user
export async function sendLinePushMessage(lineUserId: string, messages: unknown[]) {
  const res = await fetch(LINE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getChannelToken()}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('LINE push message failed:', errText)
    throw new Error(`LINE push failed: ${res.status} ${errText}`)
  }

  return res.json()
}

// Helper to build a styled Flex Message for lesson notifications
function lessonFlexMessage({
  title,
  greeting,
  dateLabel,
  dateValue,
  timeValue,
  durationMinutes,
  buttonLabel,
  buttonUrl,
  note,
  oldDateValue,
  oldTimeValue,
}: {
  title: string
  greeting: string
  dateLabel: string
  dateValue: string
  timeValue: string
  durationMinutes: number
  buttonLabel: string
  buttonUrl: string
  note?: string
  oldDateValue?: string
  oldTimeValue?: string
}): FlexBubble {
  const contents: FlexComponent[] = [
    {
      type: 'text',
      text: 'eigo.io',
      weight: 'bold',
      size: 'md',
      color: '#00c2b8',
    },
    {
      type: 'text',
      text: greeting,
      size: 'sm',
      color: '#333333',
      margin: 'lg',
      wrap: true,
    },
    { type: 'separator', margin: 'lg' },
    {
      type: 'text',
      text: dateLabel,
      size: 'xs',
      color: '#999999',
      margin: 'lg',
    },
  ]

  // If rescheduled, show old date with strikethrough style
  if (oldDateValue && oldTimeValue) {
    contents.push({
      type: 'text',
      text: `❌ ${oldDateValue} ${oldTimeValue}`,
      size: 'sm',
      color: '#999999',
      margin: 'sm',
      decoration: 'line-through',
    })
    contents.push({
      type: 'text',
      text: `✅ ${dateValue} ${timeValue} (${durationMinutes}min)`,
      size: 'md',
      weight: 'bold',
      color: '#333333',
      margin: 'sm',
    })
  } else {
    contents.push({
      type: 'text',
      text: `${dateValue}`,
      size: 'md',
      weight: 'bold',
      color: '#333333',
      margin: 'sm',
    })
    contents.push({
      type: 'text',
      text: `${timeValue} (${durationMinutes}min)`,
      size: 'sm',
      color: '#555555',
      margin: 'xs',
    })
  }

  if (note) {
    contents.push({
      type: 'text',
      text: note,
      size: 'xs',
      color: '#999999',
      margin: 'lg',
      wrap: true,
    })
  }

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents,
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: buttonLabel,
            uri: buttonUrl,
          },
          style: 'primary',
          color: '#00c2b8',
          height: 'sm',
        },
      ],
      paddingAll: '12px',
    },
  }
}

// ── Notification types ──

export async function sendLineBookingNotification({
  lineUserId,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
  classroomUrl,
}: {
  lineUserId: string
  studentName: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  classroomUrl: string
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const flex = lessonFlexMessage({
    title: 'レッスン予約完了',
    greeting: `${firstName}さん、レッスンの予約が完了しました！`,
    dateLabel: 'レッスン詳細 / Lesson Details',
    dateValue: lessonDate,
    timeValue: lessonTime,
    durationMinutes,
    buttonLabel: '教室に入る',
    buttonUrl: classroomUrl,
    note: '教室は開始10分前から入室できます。',
  })

  return sendLinePushMessage(lineUserId, [
    { type: 'flex', altText: `レッスン予約: ${lessonDate} ${lessonTime}`, contents: flex },
  ])
}

export async function sendLineCancellationNotification({
  lineUserId,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
}: {
  lineUserId: string
  studentName: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const flex = lessonFlexMessage({
    title: 'レッスンキャンセル',
    greeting: `${firstName}さん、以下のレッスンがキャンセルされました。`,
    dateLabel: 'キャンセルされたレッスン',
    dateValue: lessonDate,
    timeValue: lessonTime,
    durationMinutes,
    buttonLabel: '新しいレッスンを予約',
    buttonUrl: 'https://eigo.io/dashboard',
  })

  return sendLinePushMessage(lineUserId, [
    { type: 'flex', altText: `レッスンキャンセル: ${lessonDate} ${lessonTime}`, contents: flex },
  ])
}

export async function sendLineRescheduleNotification({
  lineUserId,
  studentName,
  oldLessonDate,
  oldLessonTime,
  newLessonDate,
  newLessonTime,
  durationMinutes,
  classroomUrl,
}: {
  lineUserId: string
  studentName: string
  oldLessonDate: string
  oldLessonTime: string
  newLessonDate: string
  newLessonTime: string
  durationMinutes: number
  classroomUrl: string
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const flex = lessonFlexMessage({
    title: 'レッスン日時変更',
    greeting: `${firstName}さん、レッスンの日時が変更されました。`,
    dateLabel: '変更前 → 変更後',
    dateValue: newLessonDate,
    timeValue: newLessonTime,
    durationMinutes,
    buttonLabel: '教室に入る',
    buttonUrl: classroomUrl,
    note: '教室は開始10分前から入室できます。',
    oldDateValue: oldLessonDate,
    oldTimeValue: oldLessonTime,
  })

  return sendLinePushMessage(lineUserId, [
    { type: 'flex', altText: `レッスン日時変更: ${newLessonDate} ${newLessonTime}`, contents: flex },
  ])
}

export async function sendLineReminderNotification({
  lineUserId,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
  type,
  classroomUrl,
}: {
  lineUserId: string
  studentName: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  type: '30min'
  classroomUrl: string
}) {
  const firstName = studentName.split(' ')[0] || studentName

  const flex = lessonFlexMessage({
    title: 'まもなくレッスン開始',
    greeting: `${firstName}さん、まもなくレッスンが始まります！`,
    dateLabel: 'レッスン詳細',
    dateValue: lessonDate,
    timeValue: lessonTime,
    durationMinutes,
    buttonLabel: '教室に入る',
    buttonUrl: classroomUrl,
    note: '準備ができたら教室に入ってください。',
  })

  return sendLinePushMessage(lineUserId, [
    { type: 'flex', altText: `レッスンリマインダー: ${lessonDate} ${lessonTime}`, contents: flex },
  ])
}
