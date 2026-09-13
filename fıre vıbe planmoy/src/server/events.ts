import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { requireSession } from './session'
import { eventParticipants, events, user } from './schema'
import { findBlockedTerm } from '@/lib/content-moderation'

const eventInput = z.object({
  title: z.string().trim().min(2).max(120),
  kind: z.enum(['Manikür', 'Pedikür', 'Piknik', 'Mangal partisi', 'Düğün', 'Nişan', 'Diğer']),
  description: z.string().trim().max(600).optional(),
  location: z.string().trim().min(2).max(180),
  startsAt: z.string().datetime(),
  invitees: z.array(z.object({ name: z.string().trim().min(2).max(100), email: z.string().email() })).max(100).default([]),
}).superRefine((value, ctx) => {
  for (const [field, label] of [['title', 'Etkinlik adı'], ['location', 'Konum'], ['description', 'Açıklama']] as const) if (value[field] && findBlockedTerm(value[field])) ctx.addIssue({ code: 'custom', path: [field], message: `${label} uygun olmayan ifadeler içeriyor.` })
  if (new Date(value.startsAt) <= new Date()) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Geçmiş bir zaman seçilemez.' })
})
const tokenInput = z.object({ token: z.string().min(20).max(100) })

export const createEvent = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(eventInput).handler(async ({ data, context }) => {
  const shareToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const [event] = await db.insert(events).values({ ownerId: context.session.user.id, title: data.title, kind: data.kind, description: data.description || null, location: data.location, startsAt: new Date(data.startsAt), shareToken }).returning()
  if (!event) throw new Error('Etkinlik oluşturulamadı.')
  const ownerName = context.session.user.name || 'Organizatör'
  await db.insert(eventParticipants).values([{ eventId: event.id, userId: context.session.user.id, displayName: ownerName, email: context.session.user.email, status: 'going' }, ...data.invitees.filter(item => item.email !== context.session.user.email).map(item => ({ eventId: event.id, displayName: item.name, email: item.email, status: 'pending' }))])
  return { ok: true as const, event: { id: event.id, shareToken: event.shareToken } }
})

export const getMyEvents = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const owned = await db.select().from(events).where(eq(events.ownerId, context.session.user.id)).orderBy(asc(events.startsAt))
  if (!owned.length) return []
  const people = await db.select().from(eventParticipants).where(inArray(eventParticipants.eventId, owned.map(item => item.id))).orderBy(asc(eventParticipants.createdAt))
  return owned.map(event => ({ ...event, participants: people.filter(person => person.eventId === event.id) }))
})

/** Deliberately public share-link projection: it exposes only the event details and RSVP names. */
export const getSharedEvent = createServerFn({ method: 'GET' }).validator(tokenInput).handler(async ({ data }) => {
  const [event] = await db.select({ id: events.id, title: events.title, kind: events.kind, description: events.description, location: events.location, startsAt: events.startsAt, shareToken: events.shareToken }).from(events).where(eq(events.shareToken, data.token)).limit(1)
  if (!event) return { ok: false as const, message: 'Etkinlik bulunamadı.' }
  const participants = await db.select({ displayName: eventParticipants.displayName, status: eventParticipants.status }).from(eventParticipants).where(eq(eventParticipants.eventId, event.id)).orderBy(asc(eventParticipants.createdAt))
  return { ok: true as const, event, participants }
})

export const respondToEvent = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ token: z.string().min(20).max(100), status: z.enum(['going', 'not_going']) })).handler(async ({ data, context }) => {
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.shareToken, data.token)).limit(1)
  if (!event) return { ok: false as const, message: 'Etkinlik bulunamadı.' }
  const [existing] = await db.select({ id: eventParticipants.id }).from(eventParticipants).where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.email, context.session.user.email))).limit(1)
  if (existing) await db.update(eventParticipants).set({ userId: context.session.user.id, displayName: context.session.user.name || 'Katılımcı', status: data.status }).where(eq(eventParticipants.id, existing.id))
  else await db.insert(eventParticipants).values({ eventId: event.id, userId: context.session.user.id, email: context.session.user.email, displayName: context.session.user.name || 'Katılımcı', status: data.status })
  return { ok: true as const }
})
