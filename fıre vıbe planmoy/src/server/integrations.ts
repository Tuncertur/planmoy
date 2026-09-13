import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { calendarReminders } from './schema'
import { requireSession } from './session'
import { enforceUserRateLimit } from './rate-limit'

const notificationInput = z.object({ channel: z.enum(['email', 'sms', 'whatsapp']), recipient: z.string().trim().min(3).max(320), message: z.string().trim().min(1).max(1000) }).superRefine((value, ctx) => { if (value.channel === 'email' && !z.string().email().safeParse(value.recipient).success) ctx.addIssue({ code: 'custom', path: ['recipient'], message: 'Geçerli bir e-posta adresi girin.' }); if ((value.channel === 'sms' || value.channel === 'whatsapp') && !/^\\+[1-9]\\d{7,14}$/.test(value.recipient)) ctx.addIssue({ code: 'custom', path: ['recipient'], message: 'Telefon numarası ülke koduyla +905... biçiminde olmalı.' }) })

/** Sends through workspace-provided credentials only. Scheduled delivery must call this server function from a scheduler. */
export const sendNotification = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(notificationInput).handler(async ({ data, context }) => {
  enforceUserRateLimit(context.session.user.id, 'notifications', 10, 60 * 60_000)
  if (data.channel === 'email') {
    const key = process.env['RESEND_API_KEY']
    if (!key) return { ok: false as const, message: 'E-posta için RESEND_API_KEY eklenmeli.' }
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Planmoy <onboarding@resend.dev>', to: [data.recipient], subject: 'Planmoy bildirimi', text: data.message }) })
    return { ok: response.ok, message: response.ok ? 'E-posta gönderildi.' : 'E-posta gönderilemedi.' }
  }
  if (data.channel === 'sms') {
    const sid = process.env['TWILIO_ACCOUNT_SID']; const token = process.env['TWILIO_AUTH_TOKEN']; const from = process.env['TWILIO_FROM_NUMBER']
    if (!sid || !token || !from) return { ok: false as const, message: 'SMS için Twilio anahtarları eklenmeli.' }
    const body = new URLSearchParams({ To: data.recipient, From: from, Body: data.message })
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    return { ok: response.ok, message: response.ok ? 'SMS gönderildi.' : 'SMS gönderilemedi.' }
  }
  const token = process.env['WHATSAPP_ACCESS_TOKEN']; const phoneId = process.env['WHATSAPP_PHONE_NUMBER_ID']
  if (!token || !phoneId) return { ok: false as const, message: 'WhatsApp için Meta Cloud API anahtarları eklenmeli.' }
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: data.recipient, type: 'text', text: { body: data.message } }) })
  return { ok: response.ok, message: response.ok ? 'WhatsApp mesajı gönderildi.' : 'WhatsApp mesajı gönderilemedi.' }
})

export const sendReminderNotification = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ reminderId: z.string().uuid(), channel: z.enum(['email', 'sms', 'whatsapp']), recipient: z.string().trim().min(3).max(320) })).handler(async ({ data, context }) => {
  const [reminder] = await db.select().from(calendarReminders).where(and(eq(calendarReminders.id, data.reminderId), eq(calendarReminders.userId, context.session.user.id))).limit(1)
  if (!reminder) throw new Response('Not found', { status: 404 })
  return sendNotification({ data: { channel: data.channel, recipient: data.recipient, message: `Planmoy hatırlatması: ${reminder.title} — ${new Date(reminder.remindAt).toLocaleString('tr-TR')}` } })
})
