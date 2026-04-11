import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Reusable email layout wrapper with branded template
function emailLayout(
  content: string,
  footer: string = 'eigo.io — Online English Lessons'
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #00c2b8;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .greeting {
      font-size: 16px;
      color: #27272a;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .section {
      margin: 24px 0;
    }
    .lesson-box {
      background: #f4f4f5;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .lesson-label {
      font-size: 12px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .lesson-detail {
      font-size: 18px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 4px;
    }
    .lesson-sub {
      font-size: 14px;
      color: #52525b;
    }
    .student-info {
      background: #f4f4f5;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .student-info-row {
      font-size: 14px;
      color: #27272a;
      margin: 8px 0;
    }
    .student-info-label {
      font-size: 12px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    .button {
      display: inline-block;
      background: #00c2b8;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-weight: 600;
      font-size: 14px;
      margin: 20px 0;
      transition: background 0.2s;
    }
    .button:hover {
      background: #00a89e;
    }
    .note {
      font-size: 14px;
      color: #71717a;
      margin-top: 20px;
      line-height: 1.6;
    }
    .divider {
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 24px 0;
    }
    .footer {
      font-size: 12px;
      color: #a1a1aa;
      text-align: center;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">eigo.io</div>
      ${content}
    </div>
    <div class="footer">${footer}</div>
  </div>
</body>
</html>`
}

type ReminderEmailParams = {
  to: string
  studentName: string
  lessonDate: string      // e.g. "3月27日(金)" or "Mar 27 (Fri)"
  lessonTime: string      // e.g. "23:00"
  durationMinutes: number
  type: '30min'
  classroomUrl?: string
}

export async function sendReminderEmail({
  to,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
  type,
  classroomUrl = 'https://eigo.io/dashboard',
}: ReminderEmailParams) {
  const firstName = studentName.split(' ')[0] || studentName

  const subject = '【eigo.io】まもなくレッスンが始まります'

  const content = `
      <p class="greeting">
        ${firstName}さん、まもなくレッスンです！
      </p>

      <p class="greeting">
        レッスンが30分後に始まります。
      </p>

      <div class="lesson-box">
        <div class="lesson-label">レッスン詳細</div>
        <div class="lesson-detail">${lessonDate}</div>
        <div class="lesson-sub">${lessonTime} (${durationMinutes} minutes)</div>
        <div class="lesson-sub" style="margin-top: 8px;">Lesson with Connor</div>
      </div>

      <a href="${classroomUrl}" class="button">教室に入る</a>

      <p class="note">
        教室は開始10分前から入室できます。準備ができたら上のボタンからアクセスしてください。
      </p>
  `

  const html = emailLayout(content)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send ${type} reminder to ${to}:`, error)
    throw error
  }

  return data
}

// Build a Google Calendar deep link for "Add to Calendar"
export function buildGoogleCalendarLink({
  title,
  startISO,
  durationMinutes,
  description,
  location,
}: {
  title: string
  startISO: string        // ISO datetime, e.g. '2026-03-27T14:00:00+09:00'
  durationMinutes: number
  description?: string
  location?: string
}): string {
  const start = new Date(startISO)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Booking confirmation email sent to student
export async function sendBookingConfirmationEmail({
  to,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
  classroomUrl,
  lessonStartISO,
}: {
  to: string
  studentName: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  classroomUrl: string
  lessonStartISO?: string   // ISO datetime for Google Calendar link
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const subject = '【eigo.io】レッスンが予約されました / Lesson booked'

  // Build "Add to Google Calendar" link if we have the ISO time
  const gcalLink = lessonStartISO
    ? buildGoogleCalendarLink({
        title: 'eigo.io English Lesson',
        startISO: lessonStartISO,
        durationMinutes,
        description: `English lesson with Connor\n\nClassroom: ${classroomUrl}`,
        location: classroomUrl,
      })
    : null

  const gcalButton = gcalLink
    ? `<a href="${gcalLink}" class="button" style="background: #4285f4;">カレンダーに追加</a>`
    : ''

  const content = `
      <p class="greeting">
        ${firstName}さん、こんにちは！
      </p>

      <p class="greeting">
        レッスンの予約が完了しました。下の詳細をご確認ください。
      </p>

      <div class="lesson-box">
        <div class="lesson-label">レッスン詳細 / Lesson Details</div>
        <div class="lesson-detail">${lessonDate}</div>
        <div class="lesson-sub">${lessonTime} (${durationMinutes} minutes)</div>
        <div class="lesson-sub" style="margin-top: 8px;">Lesson with Connor</div>
      </div>

      <a href="${classroomUrl}" class="button">教室に入る</a>
      ${gcalButton}

      <p class="note">
        レッスンは予約時刻の10分前から開始できます。<br>
        You can enter the classroom 10 minutes before the lesson starts.
      </p>

      <hr class="divider" />

      <p class="greeting" style="font-size: 14px;">
        Hi ${firstName},
      </p>
      <p class="note" style="margin-top: 8px;">
        Your lesson booking is confirmed! Review the details above and click the button to enter the classroom when you're ready. The classroom will be available 10 minutes before your lesson starts.
      </p>
  `

  const html = emailLayout(content)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send booking confirmation to ${to}:`, error)
    throw error
  }

  return data
}

// Admin booking notification
export async function sendAdminBookingNotification({
  studentName,
  studentEmail,
  lessonDate,
  lessonTime,
  durationMinutes,
  classroomUrl,
}: {
  studentName: string
  studentEmail: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
  classroomUrl: string
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const subject = `New booking: ${studentName} - ${lessonDate} ${lessonTime}`

  const content = `
      <p class="greeting">
        New booking notification
      </p>

      <div class="student-info">
        <div class="student-info-label">Student Information / 生徒情報</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>
        <div class="student-info-label">Lesson Details / レッスン詳細</div>
        <div class="student-info-row"><strong>Date:</strong> ${lessonDate}</div>
        <div class="student-info-row"><strong>Time:</strong> ${lessonTime}</div>
        <div class="student-info-row"><strong>Duration:</strong> ${durationMinutes} minutes</div>
      </div>

      <a href="${classroomUrl}" class="button">Open Classroom</a>

      <p class="note">
        Click the button above to access the classroom for this lesson.
      </p>
  `

  const html = emailLayout(content, 'eigo.io — Online English Lessons (Admin Notification)')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send admin booking notification:`, error)
    throw error
  }

  return data
}

// Batch admin notification for multiple bookings
export async function sendAdminBatchBookingNotification({
  studentName,
  studentEmail,
  lessons,
}: {
  studentName: string
  studentEmail: string
  lessons: { lessonDate: string; lessonTime: string; durationMinutes: number }[]
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const subject = `New bookings: ${studentName} — ${lessons.length} lessons`

  const lessonRows = lessons
    .map(
      (l) => `
        <div class="student-info-row" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <strong>${l.lessonDate}</strong> at ${l.lessonTime} (${l.durationMinutes} min)
        </div>`
    )
    .join('')

  const content = `
      <p class="greeting">
        New batch booking notification
      </p>

      <div class="student-info">
        <div class="student-info-label">Student Information / 生徒情報</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>
        <div class="student-info-label">${lessons.length} Lessons Booked / ${lessons.length}件のレッスン予約</div>
        ${lessonRows}
      </div>

      <p class="note">
        All lessons above have been confirmed and added to the calendar.
      </p>
  `

  const html = emailLayout(content, 'eigo.io — Online English Lessons (Admin Notification)')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send batch admin booking notification:`, error)
    throw error
  }

  return data
}

// Cancellation email sent to student
export async function sendCancellationEmail({
  to,
  studentName,
  lessonDate,
  lessonTime,
  durationMinutes,
}: {
  to: string
  studentName: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const subject = '【eigo.io】レッスンがキャンセルされました / Lesson cancelled'

  const content = `
      <p class="greeting">
        ${firstName}さん、こんにちは。
      </p>

      <p class="greeting">
        以下のレッスンがキャンセルされました。
      </p>

      <div class="lesson-box">
        <div class="lesson-label">キャンセルされたレッスン / Cancelled Lesson</div>
        <div class="lesson-detail">${lessonDate}</div>
        <div class="lesson-sub">${lessonTime} (${durationMinutes} minutes)</div>
        <div class="lesson-sub" style="margin-top: 8px;">Lesson with Connor</div>
      </div>

      <a href="https://eigo.io/dashboard" class="button">新しいレッスンを予約</a>

      <hr class="divider" />

      <p class="greeting" style="font-size: 14px;">
        Hi ${firstName},
      </p>
      <p class="note" style="margin-top: 8px;">
        Your lesson on ${lessonDate} at ${lessonTime} has been cancelled. If you'd like to book a new lesson, click the button above.
      </p>
  `

  const html = emailLayout(content)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send cancellation email to ${to}:`, error)
    throw error
  }

  return data
}

// Admin cancellation notification
export async function sendAdminCancellationNotification({
  studentName,
  studentEmail,
  lessonDate,
  lessonTime,
  durationMinutes,
}: {
  studentName: string
  studentEmail: string
  lessonDate: string
  lessonTime: string
  durationMinutes: number
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const subject = `Lesson cancelled: ${studentName} — ${lessonDate} ${lessonTime}`

  const content = `
      <p class="greeting">
        Lesson cancellation notice
      </p>

      <div class="student-info">
        <div class="student-info-label">Student</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>

        <div class="student-info-label" style="margin-top: 16px;">Cancelled Lesson</div>
        <div class="student-info-row"><strong>Date:</strong> ${lessonDate}</div>
        <div class="student-info-row"><strong>Time:</strong> ${lessonTime}</div>
        <div class="student-info-row"><strong>Duration:</strong> ${durationMinutes} minutes</div>
      </div>
  `

  const html = emailLayout(content, 'eigo.io — Online English Lessons (Admin Notification)')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send admin cancellation notification:`, error)
    throw error
  }

  return data
}

// Batch admin notification for multiple cancellations
export async function sendAdminBatchCancellationNotification({
  studentName,
  studentEmail,
  lessons,
}: {
  studentName: string
  studentEmail: string
  lessons: { lessonDate: string; lessonTime: string; durationMinutes: number }[]
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const subject = `Lessons cancelled: ${studentName} — ${lessons.length} lessons`

  const lessonRows = lessons
    .map(
      (l) => `
        <div class="student-info-row" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <strong>${l.lessonDate}</strong> at ${l.lessonTime} (${l.durationMinutes} min)
        </div>`
    )
    .join('')

  const content = `
      <p class="greeting">
        Batch cancellation notice
      </p>

      <div class="student-info">
        <div class="student-info-label">Student</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>

        <div class="student-info-label" style="margin-top: 16px;">${lessons.length} Lessons Cancelled / ${lessons.length}件のレッスンがキャンセルされました</div>
        ${lessonRows}
      </div>
  `

  const html = emailLayout(content, 'eigo.io — Online English Lessons (Admin Notification)')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send batch admin cancellation notification:`, error)
    throw error
  }

  return data
}

// Reschedule confirmation email sent to student
export async function sendRescheduleEmail({
  to,
  studentName,
  oldLessonDate,
  oldLessonTime,
  newLessonDate,
  newLessonTime,
  durationMinutes,
  classroomUrl,
  newLessonStartISO,
}: {
  to: string
  studentName: string
  oldLessonDate: string
  oldLessonTime: string
  newLessonDate: string
  newLessonTime: string
  durationMinutes: number
  classroomUrl: string
  newLessonStartISO?: string
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const subject = '【eigo.io】レッスンの日時が変更されました / Lesson rescheduled'

  const gcalLink = newLessonStartISO
    ? buildGoogleCalendarLink({
        title: 'eigo.io English Lesson',
        startISO: newLessonStartISO,
        durationMinutes,
        description: `English lesson with Connor\n\nClassroom: ${classroomUrl}`,
        location: classroomUrl,
      })
    : null

  const gcalButton = gcalLink
    ? `<a href="${gcalLink}" class="button" style="background: #4285f4;">カレンダーに追加</a>`
    : ''

  const content = `
      <p class="greeting">
        ${firstName}さん、こんにちは！
      </p>

      <p class="greeting">
        レッスンの日時が変更されました。新しい日時をご確認ください。
      </p>

      <div class="lesson-box" style="opacity: 0.6;">
        <div class="lesson-label">変更前 / Previous</div>
        <div class="lesson-detail" style="text-decoration: line-through;">${oldLessonDate}</div>
        <div class="lesson-sub" style="text-decoration: line-through;">${oldLessonTime} (${durationMinutes} minutes)</div>
      </div>

      <div class="lesson-box">
        <div class="lesson-label">変更後 / New Schedule</div>
        <div class="lesson-detail">${newLessonDate}</div>
        <div class="lesson-sub">${newLessonTime} (${durationMinutes} minutes)</div>
        <div class="lesson-sub" style="margin-top: 8px;">Lesson with Connor</div>
      </div>

      <a href="${classroomUrl}" class="button">教室に入る</a>
      ${gcalButton}

      <p class="note">
        教室は開始10分前から入室できます。<br>
        The classroom opens 10 minutes before the lesson starts.
      </p>

      <hr class="divider" />

      <p class="greeting" style="font-size: 14px;">
        Hi ${firstName},
      </p>
      <p class="note" style="margin-top: 8px;">
        Your lesson has been rescheduled from ${oldLessonDate} at ${oldLessonTime} to ${newLessonDate} at ${newLessonTime}. Click the button above to access the classroom when you're ready.
      </p>
  `

  const html = emailLayout(content)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send reschedule email to ${to}:`, error)
    throw error
  }

  return data
}

// Admin reschedule notification
export async function sendAdminRescheduleNotification({
  studentName,
  studentEmail,
  oldLessonDate,
  oldLessonTime,
  newLessonDate,
  newLessonTime,
  durationMinutes,
  classroomUrl,
}: {
  studentName: string
  studentEmail: string
  oldLessonDate: string
  oldLessonTime: string
  newLessonDate: string
  newLessonTime: string
  durationMinutes: number
  classroomUrl: string
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const subject = `Lesson rescheduled: ${studentName} — ${newLessonDate} ${newLessonTime}`

  const content = `
      <p class="greeting">
        Lesson rescheduled
      </p>

      <div class="student-info">
        <div class="student-info-label">Student</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>

        <div class="student-info-label" style="margin-top: 16px;">Previous Lesson</div>
        <div class="student-info-row" style="text-decoration: line-through; opacity: 0.6;">${oldLessonDate} at ${oldLessonTime}</div>

        <div class="student-info-label" style="margin-top: 16px;">New Lesson</div>
        <div class="student-info-row"><strong>Date:</strong> ${newLessonDate}</div>
        <div class="student-info-row"><strong>Time:</strong> ${newLessonTime}</div>
        <div class="student-info-row"><strong>Duration:</strong> ${durationMinutes} minutes</div>
      </div>

      <a href="${classroomUrl}" class="button">Open Classroom</a>
  `

  const html = emailLayout(content, 'eigo.io — Online English Lessons (Admin Notification)')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send admin reschedule notification:`, error)
    throw error
  }

  return data
}

// Admin support ticket notification
export async function sendAdminSupportTicketNotification({
  ticketId,
  studentName,
  studentEmail,
  category,
  subject,
  body,
  deviceInfo,
}: {
  ticketId: string
  studentName: string
  studentEmail: string
  category: string
  subject: string
  body: string
  deviceInfo?: { model?: string; os?: string; app_version?: string; device_name?: string } | null
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'cnrfin93@gmail.com'
  const emailSubject = `🎫 New support ticket: ${subject}`

  const categoryLabel: Record<string, string> = {
    bug: 'Bug Report',
    booking: 'Booking Issue',
    payment: 'Payment Issue',
    lesson: 'Lesson Issue',
    feature: 'Feature Request',
    other: 'Other',
  }

  const deviceRows = deviceInfo
    ? `
        <div class="student-info-label" style="margin-top: 16px;">Device Info</div>
        ${deviceInfo.model ? `<div class="student-info-row"><strong>Model:</strong> ${deviceInfo.model}</div>` : ''}
        ${deviceInfo.os ? `<div class="student-info-row"><strong>OS:</strong> ${deviceInfo.os}</div>` : ''}
        ${deviceInfo.app_version ? `<div class="student-info-row"><strong>App version:</strong> ${deviceInfo.app_version}</div>` : ''}
        ${deviceInfo.device_name ? `<div class="student-info-row"><strong>Device:</strong> ${deviceInfo.device_name}</div>` : ''}
      `
    : ''

  const content = `
      <p class="greeting">
        New support ticket received
      </p>

      <div class="student-info">
        <div class="student-info-label">From</div>
        <div class="student-info-row"><strong>Name:</strong> ${studentName}</div>
        <div class="student-info-row"><strong>Email:</strong> ${studentEmail}</div>

        <div class="student-info-label" style="margin-top: 16px;">Ticket Details</div>
        <div class="student-info-row"><strong>Category:</strong> ${categoryLabel[category] ?? category}</div>
        <div class="student-info-row"><strong>Subject:</strong> ${subject}</div>
        ${deviceRows}
      </div>

      <div class="lesson-box">
        <div class="lesson-label">Message</div>
        <div style="font-size: 14px; color: #27272a; line-height: 1.6; white-space: pre-wrap;">${body}</div>
      </div>

      <a href="https://eigo.io/admin" class="button">Open Admin Dashboard</a>

      <p class="note">
        Ticket ID: ${ticketId}
      </p>
  `

  const html = emailLayout(content, 'eigo.io — Support Ticket Notification')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: emailSubject,
    html,
  })

  if (error) {
    console.error(`Failed to send admin support ticket notification:`, error)
    throw error
  }

  return data
}

// Custom-branded email verification
export async function sendVerificationEmail({
  to,
  studentName,
  confirmUrl,
}: {
  to: string
  studentName: string
  confirmUrl: string
}) {
  const firstName = studentName.split(' ')[0] || studentName
  const subject = '【eigo.io】メールアドレスの確認 / Verify your email'

  const content = `
      <p class="greeting">
        ${firstName}さん、こんにちは！
      </p>

      <p class="greeting">
        メールアドレスの確認をお願いします。下のボタンをクリックして確認を完了してください。
      </p>

      <a href="${confirmUrl}" class="button">メールを確認する</a>

      <p class="note">
        このリンクは24時間有効です。もしご自分で登録されていない場合は、このメールを無視してください。<br>
        This link is valid for 24 hours. If you didn't sign up, you can safely ignore this email.
      </p>

      <hr class="divider" />

      <p class="greeting" style="font-size: 14px;">
        Hi ${firstName},
      </p>
      <p class="note" style="margin-top: 8px;">
        Please verify your email address by clicking the button above. This link is valid for 24 hours.
      </p>
  `

  const html = emailLayout(content)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'eigo.io <noreply@eigo.io>'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`Failed to send verification email to ${to}:`, error)
    throw error
  }

  return data
}
