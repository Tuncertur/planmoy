import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { requireSession } from './session'
import { userInterests, userLocationPreferences, tasks, calendarReminders } from './schema'
import { createAiProvider } from './ai'
import { generateText } from 'ai'
import { findBlockedTerm } from '@/lib/content-moderation'
import { enforceUserRateLimit } from './rate-limit'

const interestInput = z.object({ name: z.string().trim().min(2).max(60), kind: z.enum(['hobi', 'spor', 'el sanatı', 'bakım', 'öğrenme']).default('hobi'), intensity: z.enum(['merak ediyorum', 'düzenli yapıyorum', 'hedefim']).default('merak ediyorum') }).superRefine((value, ctx) => { if (findBlockedTerm(value.name)) ctx.addIssue({ code: 'custom', path: ['name'], message: 'İlgi alanında uygun olmayan ifade kullanılamaz.' }) })
export const getInterestProfile = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const userId = context.session.user.id
  const [location] = await db.select().from(userLocationPreferences).where(eq(userLocationPreferences.userId, userId)).limit(1)
  const interests = await db.select().from(userInterests).where(eq(userInterests.userId, userId)).orderBy(desc(userInterests.createdAt))
  return { location: location ?? null, interests }
})
export const addInterest = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(interestInput).handler(async ({ data, context }) => {
  const [interest] = await db.insert(userInterests).values({ ...data, userId: context.session.user.id }).returning()
  return { ok: true as const, interest }
})
export const deleteInterest = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  await db.delete(userInterests).where(and(eq(userInterests.id, data.id), eq(userInterests.userId, context.session.user.id)))
  return { ok: true as const }
})
const locationInput = z.object({ label: z.string().trim().min(2).max(100), latitude: z.number().finite().optional(), longitude: z.number().finite().optional(), radiusKm: z.number().int().min(1).max(100).default(30) })
export const saveLocationPreference = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(locationInput).handler(async ({ data, context }) => {
  const userId = context.session.user.id
  const [existing] = await db.select({ id: userLocationPreferences.id }).from(userLocationPreferences).where(eq(userLocationPreferences.userId, userId)).limit(1)
  const values = { ...data, userId, latitude: data.latitude?.toString() ?? null, longitude: data.longitude?.toString() ?? null }
  const [location] = existing ? await db.update(userLocationPreferences).set(values).where(eq(userLocationPreferences.id, existing.id)).returning() : await db.insert(userLocationPreferences).values(values).returning()
  return { ok: true as const, location }
})
const recommendationInput = z.object({ location: z.string().trim().min(2).max(100), interests: z.array(z.string().trim().min(1).max(60)).max(20), timeContext: z.string().trim().min(2).max(180), radiusKm: z.number().int().min(1).max(100).default(30) }).superRefine((value, ctx) => { if (findBlockedTerm(`${value.location} ${value.timeContext} ${value.interests.join(' ')}`)) ctx.addIssue({ code: 'custom', path: ['timeContext'], message: 'Öneri alanlarında uygun olmayan ifade kullanılamaz.' }) })
export const generateLocalPlan = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(recommendationInput).handler(async ({ data, context }) => {
  const userId = context.session.user.id
  enforceUserRateLimit(userId, 'local-plan', 10, 60 * 60_000)
  const [savedLocation] = await db.select().from(userLocationPreferences).where(eq(userLocationPreferences.userId, userId)).limit(1)
  const [tasksToday, reminders] = await Promise.all([
    db.select({ title: tasks.title }).from(tasks).where(eq(tasks.userId, userId)).limit(12),
    db.select({ title: calendarReminders.title, remindAt: calendarReminders.remindAt }).from(calendarReminders).where(eq(calendarReminders.userId, userId)).limit(12),
  ])
  const result = await generateText({
    model: createAiProvider()('gpt-5.6-luna'),
    system: 'Sen Planmoy yerel yaşam asistanısın. Türkçe yaz. Öncelik sırası kesinlikle: 1 konum ve 30 km yarıçap, 2 kullanıcının zamanı/takvimi, 3 ilgi alanları. En fazla 5 kısa madde ve sonunda tek bir hafta sonu hedefi yaz. Dini, siyasi ve hukuki değerlendirme yapma; sağlık ve spor önerilerini genel tut. Gerçek işletme adı, açık adres, fiyat veya müsaitlik uydurma. Canlı işletme verisi olmadığını belirt ve ilgili arama bağlantısı öner.',
    prompt: `Konum: ${data.location} (${data.radiusKm} km). Zaman bağlamı: ${data.timeContext}. İlgi alanları: ${data.interests.join(', ') || 'henüz seçilmedi'}. Takvim görevleri: ${tasksToday.map(t => t.title).join(', ') || 'yok'}. Alarmlar: ${reminders.map(r => `${r.title} ${r.remindAt.toISOString()}`).join(', ') || 'yok'}. Kayıtlı konum: ${savedLocation?.label ?? 'yok'}. Yakındaki spor, hobi, el sanatı, masaj, güzellik ve hamam türlerinden zamanı gerçekten uygun olan fikirleri sırala.`,
  })
  return { ok: true as const, recommendation: result.text, mapsSearch: `https://www.google.com/maps/search/${encodeURIComponent(`${data.interests[0] || 'aktivite'} ${data.location}`)}` }
})
