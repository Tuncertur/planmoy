import { Link, useLocation } from '@tanstack/react-router'
import { Check, ChevronRight, Flame, Search, Send, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getFlowSuggestion } from '@/server/vibe'
import { findBlockedTerm, moderationMessage } from '@/lib/content-moderation'

const destinations = [
  { to: '/calendar' as const, label: 'Takvim ve alarmlar', keywords: 'takvim alarm randevu zaman' },
  { to: '/stylesync' as const, label: 'StyleSync gardırop', keywords: 'stil kıyafet gardırop hava' },
  { to: '/discover' as const, label: 'Yakınımda keşfet', keywords: 'keşfet işletme spor hobi hamam' },
  { to: '/sports' as const, label: 'Spor akışı', keywords: 'spor futbol basketbol tenis haber branş' },
  { to: '/space' as const, label: 'Hobiler ve hedefler', keywords: 'hobi spor ilgi alanı hedef' },
  { to: '/tasks' as const, label: 'Görevler', keywords: 'görev yapılacak iş' },
  { to: '/intelligence' as const, label: 'Yapay zeka', keywords: 'zeka yapay zeka öneri plan' },
  { to: '/account' as const, label: 'Hesap', keywords: 'profil güvenlik hesabım silme' },
]

export function PersonalAssistant() {
  const location = useLocation()
  const isBusiness = location.pathname.startsWith('/business') || location.pathname.startsWith('/businesses')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [accepted, setAccepted] = useState(false)
  const matches = useMemo(() => query.trim() ? destinations.filter(item => `${item.label} ${item.keywords}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))) : [], [query])
  if (isBusiness) return null
  async function ask() { if (findBlockedTerm(query)) { setSuggestion(moderationMessage); return } setLoading(true); try { const result = await getFlowSuggestion({ data: { focus: `kişisel yapay zeka; mevcut bölüm: ${location.pathname}; arama: ${query || 'genel'}` } }); setSuggestion(result.suggestion) } catch { setSuggestion('Bugünün akışında bir önemli işi seç, randevularının arasına kendin için kısa bir alan bırak.') } finally { setLoading(false) } }
  return <>
    {open && <section className="assistant-popover" role="dialog" aria-labelledby="assistant-title"><div className="assistant-popover-head"><div><span className="assistant-kicker"><Sparkles size={13} /> YAPAY ZEKA</span><h2 id="assistant-title">Bugün neye<br /><em>odaklanalım?</em></h2></div><button className="assistant-close" onClick={() => setOpen(false)} aria-label="Asistanı kapat"><X size={16} /></button></div><label className="assistant-search"><Search size={15} /><span className="sr-only">Uygulamada ara</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Takvim, stil, hobi ara…" /></label>{matches.length > 0 && <div className="assistant-results">{matches.map(item => <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>{item.label}<ChevronRight size={14} /></Link>)}</div>}<p className="assistant-copy">Takvim, görev, stil ve hedeflerini birlikte düşünerek bir sonraki adımı bulalım.</p>{suggestion ? <div className="assistant-suggestion"><Sparkles size={16} /><p>{suggestion}</p></div> : <div className="assistant-empty"><span className="assistant-envelope">✦</span><p>Henüz bugüne özel bir öneri istemedin.</p></div>}<button className="assistant-ask" onClick={ask} disabled={loading}><Send size={15} />{loading ? 'Akış okunuyor…' : suggestion ? 'Yeni öneri al' : 'Yapay zeka önerisi al'}</button><div className="assistant-links"><Link to="/tasks">Görevler <ChevronRight size={13} /></Link><Link to="/calendar">Takvim <ChevronRight size={13} /></Link><Link to="/stylesync">Stil <ChevronRight size={13} /></Link></div>{suggestion && <button className={`assistant-accept ${accepted ? 'accepted' : ''}`} onClick={() => setAccepted(value => !value)}>{accepted ? <Check size={14} /> : <Flame size={14} />}{accepted ? 'Akışa eklendi' : 'Öneriyi onayla'}</button>}</section>}
    <button className={`assistant-fab ${open ? 'is-open' : ''}`} onClick={() => setOpen(value => !value)} aria-label={open ? 'Yapay zekanı kapat' : 'Yapay zekanda ara ve öneri al'}><Flame size={21} /><span>Yapay zeka</span></button>
  </>
}
