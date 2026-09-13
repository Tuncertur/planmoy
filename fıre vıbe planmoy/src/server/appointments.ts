import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { appointments, businesses, customers, professionals, services } from './schema'
import { requireSession } from './session'
import { findBlockedTerm } from '@/lib/content-moderation'

const input = z.object({ businessId: z.string().uuid(), customerId: z.string().uuid().optional(), customerName: z.string().trim().min(2).max(100), customerEmail: z.string().email(), startsAt: z.string().datetime() }).superRefine((value, ctx) => { if (findBlockedTerm(value.customerName)) ctx.addIssue({ code: 'custom', path: ['customerName'], message: 'Müşteri adında uygun olmayan ifade kullanılamaz.' }); const start = new Date(value.startsAt); const latest = new Date(); latest.setDate(latest.getDate() + 180); if (start <= new Date()) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Geçmiş bir saat seçilemez.' }); if (start > latest) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'En fazla 180 gün sonrasına randevu eklenebilir.' }) })
export const createOwnedAppointment = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(input).handler(async ({ data, context }) => {
  const [business] = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, data.businessId), eq(businesses.ownerId, context.session.user.id))).limit(1)
  if (!business) throw new Response('Forbidden', { status: 403 })
  const [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.businessId, business.id)).limit(1)
  const [service] = await db.select({ id: services.id }).from(services).where(eq(services.businessId, business.id)).limit(1)
  if (!professional || !service) throw new Error('Önce işletme hizmetlerini ayarlayın.')
  if (data.customerId) {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, data.customerId), eq(customers.businessId, business.id))).limit(1)
    if (!customer) throw new Response('Customer not found', { status: 404 })
  }
  const [appointment] = await db.insert(appointments).values({ ...data, ownerId: context.session.user.id, professionalId: professional.id, serviceId: service.id, startsAt: new Date(data.startsAt) }).returning()
  return { ok: true as const, appointment }
})
