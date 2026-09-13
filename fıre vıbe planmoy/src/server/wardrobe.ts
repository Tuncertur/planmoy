import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { requireSession } from './session'
import { files, wardrobeItems, outfitRecommendations, calendarReminders } from './schema'
import { newFileKey, presignDownload, presignUpload } from './storage'
import { createAiProvider } from './ai'
import { generateText } from 'ai'
import { findBlockedTerm } from '@/lib/content-moderation'
import { enforceUserRateLimit } from './rate-limit'

const itemInput = z.object({ name: z.string().trim().min(2).max(80), category: z.enum(['Üst giyim', 'Alt giyim', 'Dış giyim', 'Ayakkabı', 'Aksesuar']), color: z.string().trim().min(2).max(30), season: z.string().trim().min(2).max(20).default('Tümü'), imageKey: z.string().max(300).optional() }).superRefine((value, ctx) => { for (const [field, label] of [['name', 'Parça adı'], ['color', 'Renk'], ['season', 'Mevsim']] as const) if (findBlockedTerm(value[field])) ctx.addIssue({ code: 'custom', path: [field], message: `${label} uygun olmayan ifade içeriyor.` }) })
export const getWardrobe = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => {
  const rows = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, context.session.user.id)).orderBy(desc(wardrobeItems.createdAt))
  return { items: await Promise.all(rows.map(async row => ({ ...row, imageUrl: row.imageKey ? await presignDownload(row.imageKey) : null }))) }
})
export const createWardrobeUpload = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ filename: z.string().min(1).max(150), contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']), size: z.number().int().positive().max(8_000_000) })).handler(async ({ data, context }) => { const key = `${context.session.user.id}/${newFileKey(data.filename)}`; return { key, uploadUrl: await presignUpload(key) } })
export const addWardrobeItem = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(itemInput).handler(async ({ data, context }) => {
  if (data.imageKey) {
    const ownedPrefix = `${context.session.user.id}/`
    if (!data.imageKey.startsWith(ownedPrefix)) throw new Error('Bu görsel yüklemesi hesabına ait değil.')
    const [existingFile] = await db.select({ key: files.key }).from(files).where(and(eq(files.key, data.imageKey), eq(files.userId, context.session.user.id))).limit(1)
    if (!existingFile) await db.insert(files).values({ key: data.imageKey, name: data.name, contentType: 'image/jpeg', size: null, userId: context.session.user.id })
  }
  const [item] = await db.insert(wardrobeItems).values({ ...data, userId: context.session.user.id, imageKey: data.imageKey ?? null }).returning()
  return { ok: true as const, item }
})
export const deleteWardrobeItem = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => { await db.delete(wardrobeItems).where(and(eq(wardrobeItems.id, data.id), eq(wardrobeItems.userId, context.session.user.id))); return { ok: true as const } })
const outfitInput = z.object({ weather: z.string().min(2).max(80), occasion: z.string().min(2).max(80) }).superRefine((value, ctx) => { if (findBlockedTerm(`${value.weather} ${value.occasion}`)) ctx.addIssue({ code: 'custom', path: ['occasion'], message: 'Bu alanda uygun olmayan ifade kullanılamaz.' }) })
export const generateTryOnPlan = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ occasion: z.string().trim().min(2).max(80) })).handler(async ({ data, context }) => {
  enforceUserRateLimit(context.session.user.id, 'try-on-plan', 10, 60 * 60_000)
  const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, context.session.user.id)).limit(12)
  if (!items.length) throw new Error('Önce en az bir kıyafet kaydetmelisin.')
  const result = await generateText({ model: createAiProvider()('gpt-5.6-luna'), system: 'Planmoy görsel kombin asistanısın. Türkçe, en fazla 3 kısa cümle yaz. Kullanıcının yüklediği kıyafetleri bir sanal deneme panosunda birlikte değerlendirecek katman sırasını ve uyumu açıkla; yüz veya beden değiştirme iddiasında bulunma.', prompt: `Plan: ${data.occasion}. Kıyafetler: ${items.map(i => `${i.name} (${i.category}, ${i.color})`).join(', ')}` })
  return { ok: true as const, plan: result.text, itemIds: items.map(item => item.id) }
})

export const generateOutfitAdvice = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(outfitInput).handler(async ({ data, context }) => { enforceUserRateLimit(context.session.user.id, 'outfit-advice', 10, 60 * 60_000); const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, context.session.user.id)); const wardrobe = items.map(i => `${i.name} (${i.category}, ${i.color})`).join(', ') || 'Henüz kayıtlı parça yok'; const result = await generateText({ model: createAiProvider()('gpt-5.6-luna'), system: 'Planmoy stil asistanısın. Türkçe, en fazla 4 cümle. Hava ve renk uyumunu anlat; yağmurda şemsiye, karda mont, rüzgarda pardösü gibi pratik dış giyim öner. Dini, siyasi ve hukuki konularda yorum yapma; kişiye saygılı, kapsayıcı ve motive edici ol. Fotoğraf üretmediğini iddia etme.', prompt: `Hava: ${data.weather}. Durum: ${data.occasion}. Gardırop: ${wardrobe}. Uygun kombin, renk paleti ve motivasyon mesajı öner.` }); const [saved] = await db.insert(outfitRecommendations).values({ userId: context.session.user.id, weather: data.weather, occasion: data.occasion, recommendation: result.text }).returning(); return { recommendation: saved } })
const reminderInput = z.object({ title: z.string().trim().min(2).max(120), remindAt: z.string().datetime() }).superRefine((value, ctx) => { if (findBlockedTerm(value.title)) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Hatırlatma başlığında uygun olmayan ifade kullanılamaz.' }); if (new Date(value.remindAt) <= new Date()) ctx.addIssue({ code: 'custom', path: ['remindAt'], message: 'Geçmiş bir zamana alarm kurulamaz.' }) })
export const createReminder = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(reminderInput).handler(async ({ data, context }) => { const [reminder] = await db.insert(calendarReminders).values({ userId: context.session.user.id, title: data.title, remindAt: new Date(data.remindAt) }).returning(); return { ok: true as const, reminder } })
export const getReminders = createServerFn({ method: 'GET' }).middleware([requireSession]).handler(async ({ context }) => ({ reminders: await db.select().from(calendarReminders).where(eq(calendarReminders.userId, context.session.user.id)).orderBy(desc(calendarReminders.remindAt)) }))
