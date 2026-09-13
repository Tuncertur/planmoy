import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, Hash, Lightbulb, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getFlowSuggestion } from '@/server/vibe'
import { findBlockedTerm, moderationMessage } from '@/lib/content-moderation'

export const Route = createFileRoute('/notes')({
  head: () => ({ meta: [{ title: 'Boş Alan — Planmoy' }, { name: 'description', content: 'Aklındaki her şeyi Planmoy Boş Alan’a bırak.' }] }),
  component: Notes,
})

type Tone = 'sky' | 'sun' | 'mint' | 'rose'
type Note = { id: number; title: string; body: string; tag: string; tone: Tone; date: string }
const initialNotes: Note[] = [
  { id: 1, title: 'Hafta sonu fikri', body: 'Yağmur yağarsa evde yeni tarifi dene, sonra film seç.', tag: '#fikir', tone: 'sky', date: 'Bugün' },
  { id: 2, title: 'Alışveriş', body: 'Kırmızı elbise ve rahat bir çift günlük ayakkabı.', tag: '#alışveriş', tone: 'sun', date: 'Dün' },
  { id: 3, title: 'Bir gün', body: 'İzmir’de denize yakın küçük bir atölye açmak.', tag: '#hayal', tone: 'mint', date: '12 Ağustos', },
]

function Notes() {
  // Keep the first render identical on the server and browser; local device data hydrates after mount.
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [query, setQuery] = useState('')
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('planmoy-notes') ?? '') as Note[]
      if (Array.isArray(stored)) setNotes(stored)
    } catch { /* use the starter notes when storage is empty or malformed */ }
    setOffline(!navigator.onLine)
  }, [])
  useEffect(() => { window.localStorage.setItem('planmoy-notes', JSON.stringify(notes)) }, [notes])
  useEffect(() => { const on = () => setOffline(false); const off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])
  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('#fikir')
  const [tone, setTone] = useState<Tone>('sky')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const filtered = useMemo(() => notes.filter(note => `${note.title} ${note.body} ${note.tag}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [notes, query])
  function addNote(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return
    if (findBlockedTerm(`${title} ${body} ${tag}`)) { setAnalysis(moderationMessage); return }
    setNotes(current => [{ id: Date.now(), title: title.trim(), body: body.trim(), tag: tag.trim() || '#not', tone, date: 'Az önce' }, ...current])
    setTitle(''); setBody(''); setTag('#fikir'); setComposerOpen(false); setAnalysis('')
  }
  async function analyze() {
    if (!notes.length) return
    setAnalyzing(true)
    try { setAnalysis((await getFlowSuggestion({ data: { focus: `not defteri: ${notes.slice(0, 3).map(n => `${n.title} ${n.body}`).join(' | ')}` } })).suggestion) }
    catch { setAnalysis('Notlarını küçük bir sonraki adıma dönüştürmek için ilgili bölümlere göz atabilirsin.') }
    finally { setAnalyzing(false) }
  }
  return <div className="app-shell notes-app">
    <aside className="sidebar"><Link to="/" className="brand">plan<span>moy</span><i /></Link><div className="workspace"><span className="avatar-mark">P</span><div><strong>Planmoy</strong><small>kişisel plan</small></div></div><nav className="side-nav" aria-label="Ana menü"><Nav label="Akışım" to="/" /><Nav label="Zaman akışı" to="/calendar" /><Nav label="Yapılacaklar" to="/tasks" /><Nav label="StyleSync" to="/stylesync" /><Nav label="Keşfet" to="/discover" /><Nav label="Spor akışı" to="/sports" /><Nav label="Hobi ve hedefler" to="/space" /><Nav label="Boş Alan" to="/notes" active /><Nav label="Yapay zeka" to="/intelligence" /></nav><div className="sidebar-bottom"><div className="fire-note"><Sparkles size={16} /><span>Akışını<br /><b>hafiflet.</b></span></div><span className="side-caption">Planmoy · kişisel plan</span></div></aside>
    <main className="main-canvas module-canvas"><header className="topbar"><div><p className="eyebrow">Kişisel alan</p><h1>Boş Alan</h1></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={16} /> Not yaz</button></header>
      <div className="notes-intro"><div><Link to="/" className="back-link"><ArrowLeft size={14} /> Akışıma dön</Link><p className="eyebrow blue-label">Not defteri · sınırsız alan</p><h2>Aklına geleni<br /><em>buraya bırak.</em></h2><p>Fikir, anı, alışveriş listesi veya yarım kalmış bir hayal. Düzenlemek zorunda değilsin.</p></div><div className="notes-mark"><Lightbulb size={26} /><span>WRITE<br />FREELY</span></div></div>
      {analysis && <div className="ai-result"><Sparkles size={18} /><div><p className="eyebrow">Yapay zeka · notlarından</p><strong>{analysis}</strong></div><button aria-label="Analizi kapat" onClick={() => setAnalysis('')}><X size={16} /></button></div>}
      <div className="notes-toolbar"><label className="search-field"><Search size={15} /><span className="sr-only">Notlarda ara</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Notlarda ara" /></label><button className="analyze-button" onClick={analyze} disabled={analyzing}><Sparkles size={15} /> {analyzing ? 'Notlar okunuyor…' : 'Notlarımı anlamlandır'}</button></div>
      <section className="notes-grid">{filtered.map(note => <article className={`note-card ${note.tone}`} key={note.id}><div className="note-card-top"><span className="note-date">{note.date}</span><button aria-label={`${note.title} notunu sil`} onClick={() => setNotes(current => current.filter(item => item.id !== note.id))}><Trash2 size={15} /></button></div><h3>{note.title}</h3><p>{note.body}</p><span className="note-tag"><Hash size={12} /> {note.tag.replace('#', '')}</span></article>)}{!filtered.length && <div className="empty-space"><div className="empty-mark"><Lightbulb size={20} /></div><h3>Bu aramada not yok.</h3><p>Başka bir kelime dene veya yeni bir notla boş alanı doldur.</p><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={15} /> Not yaz</button></div>}</section>
      <div className="notes-honest"><span>{offline ? 'Çevrimdışısın · notlar bu cihazda saklanıyor.' : 'Notlar bu cihazda saklanır ve bağlantı olmadan da kullanılabilir.'}</span><Link to="/intelligence">Yapay zekanı aç <ArrowUpRight size={13} /></Link></div>
      <footer><span className="brand small">plan<span>moy</span><i /></span><span>Düşüncelerin için biraz alan.</span><Link to="/categories" className="footer-link">Kategori rehberi <ArrowUpRight size={13} /></Link></footer>
    </main>
    {composerOpen && <div className="note-overlay" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title"><form className="note-composer" onSubmit={addNote}><div className="composer-head"><div><p className="eyebrow blue-label">Boş Alan</p><h2 id="note-dialog-title">Yeni not</h2></div><button type="button" onClick={() => setComposerOpen(false)} aria-label="Pencereyi kapat"><X size={18} /></button></div><label>Başlık<input value={title} onChange={e => setTitle(e.target.value)} autoFocus required placeholder="Notuna bir isim ver" /></label><label>Notun<textarea value={body} onChange={e => setBody(e.target.value)} required placeholder="Aklından geçenleri yaz…" /></label><div className="composer-row"><label>Etiket<input value={tag} onChange={e => setTag(e.target.value)} /></label><div><span className="field-label">Renk</span><div className="tone-picker">{(['sky','sun','mint','rose'] as Tone[]).map(item => <button type="button" key={item} aria-label={`${item} rengi`} className={`tone-dot ${item} ${tone === item ? 'selected' : ''}`} onClick={() => setTone(item)} />)}</div></div></div><button className="primary-button composer-submit"><Plus size={16} /> Notu kaydet</button><p className="composer-note">Notunu daha sonra Boş Alan’dan bulabilirsin.</p></form></div>}
  </div>
}
function Nav({ label, to, active }: { label: string; to: '/' | '/calendar' | '/tasks' | '/space' | '/stylesync' | '/discover' | '/sports' | '/intelligence' | '/notes'; active?: boolean }) { return <Link to={to} className={`nav-item ${active ? 'active' : ''}`}>{label}</Link> }
