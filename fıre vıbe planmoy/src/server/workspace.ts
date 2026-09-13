import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { requireSession } from './session'
import { appointments, businesses, calendarReminders, customers, professionals, services, tasks } from './schema'
import { findBlockedTerm } from '@/lib/content-moderation'

const businessInput = z.object({ name: z.string().trim().min(2).max(120), industry: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80) }).superRefine((value, ctx) => { for (const [field, label] of [['name', 'İşletme adı'], ['industry', 'Sektör'], ['city', 'Şehir']] as const) if (findBlockedTerm(value[field])) ctx.addIssue({ code: 'custom', path: [field], message: `${label} uygun olmayan ifadeler içeriyor.` }) })
const customerInput = z.object({ businessId: z.string().uuid(), name: z.string().trim().min(2).max(100), email: z.string().email().optional().or(z.literal('')), phone: z.string().trim().max(30).optional(), notes: z.string().trim().max(1000).optional() }).superRefine((value, ctx) => { for (const [field, label] of [['name', 'Müşteri adı'], ['notes', 'Notlar']] as const) if (value[field] && findBlockedTerm(value[field])) ctx.addIssue({ code: 'custom', path: [field], message: `${label} uygun olmayan ifadeler içeriyor.` }) })
const taskInput = z.object({ title: z.string().trim().min(2).max(200), category: z.enum(['İş görevleri', 'Ev görevleri', 'Kişisel görevler', 'Sosyal görevler', 'Sağlık görevleri', 'Yapay zeka önerileri']).default('Kişisel görevler'), period: z.enum(['today', 'week', 'month']).default('today'), priority: z.enum(['low', 'medium', 'high']).default('medium') }).superRefine((value, ctx) => { if (findBlockedTerm(value.title)) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Görev başlığında uygun olmayan ifade kullanılamaz.' }) })
const reminderInput = z.object({ title: z.string().trim().min(2).max(160), remindAt: z.string().datetime() }).superRefine((value, ctx) => { if (findBlockedTerm(value.title)) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Hatırlatıcı başlığında uygun olmayan ifade kullanılamaz.' }) })

export const getWorkspace = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const userId = context.session.user.id
  let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, userId)).limit(1)
  if (!business) {
    ;[business] = await db.insert(businesses).values({ ownerId: userId, name: `${context.session.user.name} Studio`, slug: `studio-${userId.slice(0, 8)}`, industry: 'Güzellik & wellness', city: 'İstanbul' }).returning()
  }
  if (!business) throw new Error('İşletme çalışma alanı oluşturulamadı.')
  let [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.businessId, business.id)).limit(1)
  if (!professional) { ;[professional] = await db.insert(professionals).values({ businessId: business.id, name: 'Ekibim', role: 'Uzman' }).returning({ id: professionals.id }) }
  let [service] = await db.select({ id: services.id }).from(services).where(eq(services.businessId, business.id)).limit(1)
  if (!service) { ;[service] = await db.insert(services).values({ businessId: business.id, name: 'İlk görüşme', durationMinutes: '30', price: '0' }).returning({ id: services.id }) }
  const [customerRows, taskRows, appointmentRows] = await Promise.all([
    db.select().from(customers).where(eq(customers.businessId, business.id)).orderBy(desc(customers.createdAt)).limit(50),
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.pinned), asc(tasks.completed), desc(tasks.createdAt)).limit(100),
    db.select().from(appointments).where(and(eq(appointments.businessId, business.id), eq(appointments.ownerId, userId))).orderBy(asc(appointments.startsAt)).limit(100),
  ])
  return { business, customers: customerRows, tasks: taskRows, appointments: appointmentRows }
})

export const getPersonalDashboard = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const userId = context.session.user.id
  const [taskRows, appointmentRows, reminderRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(100),
    db.select().from(appointments).where(eq(appointments.ownerId, userId)).orderBy(asc(appointments.startsAt)).limit(100),
    db.select().from(calendarReminders).where(eq(calendarReminders.userId, userId)).orderBy(asc(calendarReminders.remindAt)).limit(100),
  ])
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 1)
  return {
    tasks: taskRows,
    appointments: appointmentRows,
    reminders: reminderRows,
    todayTasks: taskRows.filter(item => !item.completed && item.period === 'today').length,
    todayAppointments: appointmentRows.filter(item => item.startsAt >= start && item.startsAt < end).length,
    upcomingAppointments: appointmentRows.filter(item => item.startsAt >= new Date()).slice(0, 6),
  }
})

export const createCustomer = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(customerInput).handler(async ({ data, context }) => {
  const [owned] = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, data.businessId), eq(businesses.ownerId, context.session.user.id))).limit(1)
  if (!owned) throw new Response('Forbidden', { status: 403 })
  const [customer] = await db.insert(customers).values({ ...data, email: data.email || null }).returning()
  return { ok: true as const, customer }
})

export const createTask = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(taskInput).handler(async ({ data, context }) => {
  const [task] = await db.insert(tasks).values({ ...data, userId: context.session.user.id }).returning()
  return { ok: true as const, task }
})

export const toggleTask = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ id: z.string().uuid(), completed: z.boolean() })).handler(async ({ data, context }) => {
  await db.update(tasks).set({ completed: data.completed }).where(and(eq(tasks.id, data.id), eq(tasks.userId, context.session.user.id)))
  return { ok: true as const }
})

export const toggleTaskPin = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ id: z.string().uuid(), pinned: z.boolean() })).handler(async ({ data, context }) => {
  await db.update(tasks).set({ pinned: data.pinned }).where(and(eq(tasks.id, data.id), eq(tasks.userId, context.session.user.id)))
  return { ok: true as const }
})

