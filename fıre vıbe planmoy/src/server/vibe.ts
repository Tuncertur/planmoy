import { createServerFn } from '@tanstack/react-start'
import { generateText } from 'ai'
import { z } from 'zod'
import { createAiProvider } from './ai'
import { requireSession } from './session'
import { enforceUserRateLimit } from './rate-limit'

const contextSchema = z.object({
  focus: z.string().trim().min(1).max(80),
})

export const getDynamicIconSet = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ surface: z.string().trim().min(1).max(60) })).handler(async ({ data, context }) => {
  enforceUserRateLimit(context.session.user.id, 'dynamic-icons', 20, 60_000)
  const gateway = createAiProvider()
  const result = await generateText({ model: gateway('gpt-5.6-luna'), system: 'Return ONLY a comma-separated list of exactly three names from this list: calendar, heart, sparkles, users, compass, list, wand, clock, target, note.', prompt: `Choose three varied UI icon names for a ${data.surface} screen. Make the selection feel fresh.` })
  const allowed = new Set(['calendar','heart','sparkles','users','compass','list','wand','clock','target','note'])
  const icons = result.text.toLowerCase().split(',').map(x => x.trim()).filter(x => allowed.has(x)).slice(0, 3)
  return { icons: icons.length === 3 ? icons : ['calendar', 'sparkles', 'users'] }
})

export const getFlowSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireSession])
  .validator(contextSchema)
  .handler(async ({ data, context }) => {
    enforceUserRateLimit(context.session.user.id, 'flow-suggestion', 20, 60_000)
    const gateway = createAiProvider()
    const isBusiness = data.focus.includes('işletme') || data.focus.includes('business')
    const system = isBusiness
      ? 'Sen Planmoy Business icin kisa, sakin ve pratik isletme onerileri veren bir asistansin. Turkce yaz. En fazla iki cumle kullan. Randevu, ekip, CRM, stok, rapor ve pazarlama akislarini veri yoksa varsayim gibi sunmadan degerlendir.'
      : 'Sen Planmoy Personal icin kisa, sakin ve pratik oneriler veren bir asistansin. Turkce yaz. En fazla iki cumle kullan. Personel, stok, CRM, toplu pazarlama ve isletme ayarlari gibi Business ozelliklerini Personal kullaniciya onerme. Zaman yonetimi, stil, sosyal kesif, hobi-hedef ve karma oneriler arasindan uygun olani sec; onerini kullanicinin verdigi baglama dayandir ve veri yoksa bunu varsayim gibi sunma.'
    const prompt = isBusiness
      ? `Isletme odagi: ${data.focus}. Randevu, ekip kapasitesi, musteri ve operasyon arasinda tek bir uygulanabilir oneriyi yaz.`
      : `Kullanicinin bugunku odagi: ${data.focus}. Takvim, gorevler, stil, kesif, notlar ve hedefler arasinda bag kurarak tek bir uygulanabilir oneriyi yaz. Onerinin hangi bolume ait oldugunu metinde kisa ve dogal bicimde belirt.`
    const result = await generateText({ model: gateway('gpt-5.6-luna'), system, prompt })
    return { ok: true as const, suggestion: result.text }
  })
