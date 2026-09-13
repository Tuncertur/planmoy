import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { appointmentMessages, appointments, businesses } from './schema'
import { requireSession } from './session'
import { findBlockedTerm } from '@/lib/content-moderation'

const idInput = z.object({ id: z.string().uuid() })
const statusInput = z.object({ id: z.string().uuid(), status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']), reason: z.string().trim().max(300).optional() }).superRefine((value, ctx) => { if (value.status === 'cancelled' && !value.reason) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'İptal nedeni gerekli.' }) })
const messageInput = z.object({ appointmentId: z.string().uuid(), body: z.string().trim().min(1).max(1000) }).superRefine((value, ctx) => { if (findBlockedTerm(value.body)) ctx.addIssue({ code: 'custom', path: ['body'], message: 'Mesajda hakaret veya uygunsuz ifade kullanılamaz.' }) })

async function ownedAppointment(id: string, userId: string) {
  const [row] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.ownerId, userId))).limit(1)
  return row
}

export const getAppointmentDetail = createServerFn({ method: 'GET' }).middleware([requireSession]).validator(idInput).handler(async ({ data, context }) => {
  const appointment = await ownedAppointment(data.id, context.session.user.id)
  if (!appointment) throw new Response('Not found', { status: 404 })
  const messages = await db.select().from(appointmentMessages).where(eq(appointmentMessages.appointmentId, data.id)).orderBy(asc(appointmentMessages.createdAt))
  return { appointment, messages }
})

export const updateAppointmentStatus = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(statusInput).handler(async ({ data, context }) => {
  const appointment = await ownedAppointment(data.id, context.session.user.id)
  if (!appointment) throw new Response('Not found', { status: 404 })
  if (data.reason && findBlockedTerm(data.reason)) throw new Error('İptal nedeni uygun olmayan ifadeler içeriyor.')
  if (appointment.status === 'cancelled' && data.status !== 'cancelled') throw new Error('İptal edilmiş randevu yeniden etkinleştirilemez.')
  if (appointment.status === 'completed' && data.status !== 'completed') throw new Error('Tamamlanmış randevunun durumu geri alınamaz.')
  await db.update(appointments).set({ status: data.status, cancellationReason: data.status === 'cancelled' ? data.reason || null : null, updatedAt: new Date() }).where(and(eq(appointments.id, data.id), eq(appointments.ownerId, context.session.user.id)))
  return { ok: true as const, status: data.status }
})

export const sendAppointmentMessage = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(messageInput).handler(async ({ data, context }) => {
  const appointment = await ownedAppointment(data.appointmentId, context.session.user.id)
  if (!appointment) throw new Response('Not found', { status: 404 })
  const [message] = await db.insert(appointmentMessages).values({ appointmentId: data.appointmentId, authorId: context.session.user.id, body: data.body }).returning()
  return { ok: true as const, message }
})

export const getModerationSummary = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, context.session.user.id)).limit(1)
  return { enabled: true, note: 'Uygunsuz içerik gönderimden önce ve sunucuda engellenir.', businessId: business?.id ?? null }
})
