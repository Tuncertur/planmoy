import { createServerFn } from '@tanstack/react-start'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { appointments, businesses, professionals, services } from './schema'

import { findBlockedTerm } from '@/lib/content-moderation'
import { enforceRateLimit, requestClientKey } from './rate-limit'

const bookingSchema = z.object({
  businessId: z.string().uuid(), professionalId: z.string().uuid(), serviceId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(100), customerEmail: z.string().email(), startsAt: z.string().datetime(),
}).superRefine((value, ctx) => {
  if (findBlockedTerm(value.customerName)) ctx.addIssue({ code: 'custom', path: ['customerName'], message: 'Ad alanında uygun olmayan ifade kullanılamaz.' })
  const start = new Date(value.startsAt)
  const latest = new Date(); latest.setDate(latest.getDate() + 180)
  if (start <= new Date()) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Geçmiş bir saat seçilemez.' })
  if (start > latest) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'En fazla 180 gün sonrasına rezervasyon yapılabilir.' })
})
const slugSchema = z.object({ slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i) })

/** Public, read-only booking configuration. It returns only publishable business data. */
export const getPublicBookingData = createServerFn({ method: 'GET' }).validator(slugSchema).handler(async ({ data }) => {
  enforceRateLimit(`booking-read:${requestClientKey()}`, 60, 60_000)
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, data.slug)).limit(1)
  if (!business) return { ok: false as const, message: 'İşletme bulunamadı.' }
  const [professional] = await db.select().from(professionals).where(eq(professionals.businessId, business.id)).limit(1)
  const businessServices = await db.select().from(services).where(eq(services.businessId, business.id))
  if (!professional || businessServices.length === 0) return { ok: false as const, message: 'Bu işletme henüz rezervasyona açık değil.' }
  return { ok: true as const, business: { id: business.id, name: business.name, industry: business.industry, city: business.city }, professional, services: businessServices }
})

/** Visitor-submission function: validates and inserts only; never returns row data. */
export const createBooking = createServerFn({ method: 'POST' }).validator(bookingSchema).handler(async ({ data }) => {
  enforceRateLimit(`booking-write:${requestClientKey()}`, 10, 60 * 60_000)
  const [business] = await db.select({ id: businesses.id, ownerId: businesses.ownerId }).from(businesses).where(eq(businesses.id, data.businessId)).limit(1)
  const [professional] = await db.select({ id: professionals.id }).from(professionals).where(and(eq(professionals.id, data.professionalId), eq(professionals.businessId, data.businessId))).limit(1)
  const [service] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, data.serviceId), eq(services.businessId, data.businessId))).limit(1)
  if (!business || !professional || !service) return { ok: false as const, message: 'Seçilen hizmet bulunamadı.' }
  const [busy] = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.professionalId, data.professionalId), eq(appointments.startsAt, new Date(data.startsAt)), ne(appointments.status, 'cancelled'))).limit(1)
  if (busy) return { ok: false as const, message: 'Bu saat artık uygun değil. Lütfen başka bir saat seçin.' }
  await db.insert(appointments).values({ businessId: data.businessId, professionalId: data.professionalId, serviceId: data.serviceId, ownerId: business.ownerId, customerName: data.customerName, customerEmail: data.customerEmail, startsAt: new Date(data.startsAt), status: 'pending' })
  return { ok: true as const }
})
