import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, BookOpen, Check, CircleDollarSign, Flame, HeartPulse, MessageCircle, Plus, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/personal-tools')({
  head: () => ({ meta: [{ title: 'Kişisel araçlar — Planmoy' }, { name: 'description', content: 'Ruh hali, bütçe, öğrenme, sosyal planlar ve Fire puanını tek akışta yönet.' }] }),
  component: PersonalTools,
})

type Mood = 'mutlu' | 'enerjik' | 'yorgun' | 'stresli' | 'üzgün' | 'heyecanlı'
const moods: { label: Mood; emoji: string; tone: string }[] = [
  { label: 'mutlu', emoji: '☀', tone: 'mood-happy' }, { label: 'enerjik', emoji: '⚡', tone: 'mood-energy' },
  { label: 'yorgun', emoji: '◌', tone: 'mood-tired' }, { label: 'stresli', emoji: '!', tone: 'mood-stress' },
  { label: 'üzgün', emoji: '↓', tone: 'mood-sad' }, { label: 'heyecanlı', emoji: '✦', tone: 'mood-excited' },
]

function PersonalTools() {
  const [mood, setMood] = useState<Mood>('enerjik')
  const [expense, setExpense] = useState('')
  const [expenses, setExpenses] = useState(3)
  const [bookProgress, setBookProgress] = useState(68)
  const [friends, setFriends] = useState(3)
  const [notice, setNotice] = useState('')
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 2400) }
  const moodData = moods.find(item => item.label === mood)
  const moodTone = moodData?.tone ?? 'mood-energy'
  function addExpense(e: React.FormEvent) { e.preventDefault(); if (!expense.trim()) return; setExpenses(value => value + 1); setExpense(''); notify('Harcama akışa eklendi.') }
  return <div className={`app-shell personal-tools-app ${moodTone}`}>
    <aside className="sidebar"><Link to="/" className="brand">plan<span>moy</span><i /></Link><div className="workspace"><span className="avatar-mark">P</span><div><strong>Planmoy</strong><small>kişisel plan</small></div></div><nav className="side-nav" aria-label="Ana menü"><Nav label="Akışım" to="/" /><Nav label="Zaman akışı" to="/calendar" /><Nav label="Yapılacaklar" to="/tasks" /><Nav label="StyleSync" to="/stylesync" /><Nav label="Keşfet" to="/discover" /><Nav label="Spor akışı" to="/sports" /><Nav label="Hobi ve hedefler" to="/space" /><Nav label="Boş Alan" to="/notes" /><Nav label="Yapay zeka" to="/intelligence" /><Nav label="Kişisel araçlar" active to="/personal-tools" /></nav><div className="sidebar-bottom"><div className="fire-note"><Sparkles size={16} /><span>Akışını<br /><b>kendine uyarla.</b></span></div><span className="side-caption">Planmoy · kişisel plan</span></div></aside>
    <main className="main-canvas module-canvas"><header className="topbar"><div><p className="eyebrow">Kişisel plan</p><h1>Ruh, bütçe ve öğrenme</h1></div><Link to="/" className="back-link">Akışıma dön <ArrowLeft size={14} /></Link></header>
      <div className="module-heading compact"><p className="eyebrow blue-label">Beş yeni akış</p><h2>Günün içini<br /><em>kendine göre ayarla.</em></h2><p>Ruh halini dinle, paranı gör, öğrenme ritmini ve sosyal planlarını tek bir sakin yüzeyde takip et.</p></div>
      <section className="mood-strip panel"><div><p className="eyebrow">Bugün nasıl hissediyorsun?</p><h2>Enerjini seç, akışın değişsin.</h2><p className="mood-help">Seçimin, bugünkü görev ve aktivite önerilerinin tonunu belirler.</p></div><div className="mood-options">{moods.map(item => <button key={item.label} className={mood === item.label ? 'selected' : ''} onClick={() => { setMood(item.label); notify(`${item.label} modu seçildi.`) }}><span>{item.emoji}</span>{item.label}</button>)}</div></section>
      <section className="tools-grid"><article className="tool-card budget-card"><div className="tool-card-head"><span className="tool-icon"><CircleDollarSign size={18} /></span><span className="tool-label">AKILLI BÜTÇE</span></div><h2>Bu ay akışını<br /><strong>görünür kıl.</strong></h2><p>Kafe ve günlük harcamalarını takip et; tasarruf hedefine yaklaş.</p><div className="budget-number"><strong>₺2.840</strong><span> / ₺5.000 aylık hedef</span></div><div className="budget-track"><span style={{ width: '57%' }} /></div><form className="tool-inline-form" onSubmit={addExpense}><label htmlFor="expense">Yeni harcama</label><div><input id="expense" value={expense} onChange={e => setExpense(e.target.value)} placeholder="Örn. Kahve · ₺120" /><button aria-label="Harcama ekle"><Plus size={16} /></button></div></form><small className="tool-footnote">{expenses} kayıt · Banka bağlantısı isteğe bağlı</small></article>
        <article className="tool-card learning-card"><div className="tool-card-head"><span className="tool-icon"><BookOpen size={18} /></span><span className="tool-label">ÖĞRENME RİTMİ</span></div><h2>Bir sayfa daha,<br /><strong>bir adım daha.</strong></h2><p>Bu haftaki okuma hedefin için bugün 20 sayfa yeterli.</p><div className="book-row"><span className="book-cover">AH</span><div><b>Atomic Habits</b><small>Bu hafta · 68 / 100 sayfa</small></div></div><div className="budget-track"><span style={{ width: `${bookProgress}%` }} /></div><button className="tool-action" onClick={() => { setBookProgress(value => Math.min(100, value + 8)); notify('Bugünkü okuma ilerlemesi güncellendi.') }}>{bookProgress >= 100 ? <><Check size={15} /> Hedef tamamlandı</> : <><Plus size={15} /> Bugünkü okumayı ekle</>}</button></article>
        <article className="tool-card social-card"><div className="tool-card-head"><span className="tool-icon"><Users size={18} /></span><span className="tool-label">SOSYAL PLAN</span></div><h2>Birlikte iyi<br /><strong>bir akşam.</strong></h2><p>Bu hafta sonu için arkadaşlarınla paylaşabileceğin iki plan var.</p><div className="friend-stack"><span>AD</span><span>MK</span><span>EA</span><b>{friends} arkadaş uygun</b></div><button className="tool-action" onClick={() => { setFriends(value => value + 1); notify('Sosyal plan daveti hazırlandı.') }}><MessageCircle size={15} /> Grup planı oluştur</button></article>
      </section>
      <section className="fire-score-band"><div className="fire-score-mark"><Flame size={24} /></div><div><p className="eyebrow">FİRE PUANI · SEVİYE 08</p><h2>450 <span>/ 600 puan</span></h2><p>Bu hafta 10 görev tamamladın. Üretken hafta rozeti için 2 adım kaldı.</p></div><div className="fire-progress"><span style={{ width: '75%' }} /></div><button className="fire-challenge" onClick={() => notify('Günlük meydan okuma açıldı.')}><Sparkles size={15} /> Günlük meydan okuma</button></section>
      <section className="tool-ai panel"><div className="tool-ai-orb"><Sparkles size={20} /></div><div><p className="eyebrow">YAPAY ZEKA · {mood.toUpperCase()}</p><h2>{mood === 'stresli' ? 'Bugün ağır işleri ertele.' : mood === 'yorgun' ? 'Kendine daha hafif bir ritim bırak.' : 'Bugün enerjini doğru yere taşı.'}</h2><p>{mood === 'stresli' ? '10 dakikalık bir nefes molası ve kısa bir yürüyüş iyi bir başlangıç olabilir.' : 'Takvimindeki boşluğu öğrenme veya sevdiğin biriyle kısa bir plan için kullanabilirsin.'}</p></div><Link to="/intelligence" className="text-action">Tüm önerileri gör <ArrowUpRight size={14} /></Link></section>
      <footer><span className="brand small">plan<span>moy</span><i /></span><span>Hayatının akışı, tek noktada.</span><Link to="/categories" className="footer-link">Kategori rehberi <ArrowUpRight size={13} /></Link></footer>{notice && <div className="personal-notice" role="status"><Check size={15} /> {notice}</div>}
    </main>
  </div>
}
function Nav({ label, to, active }: { label: string; to: '/' | '/calendar' | '/tasks' | '/space' | '/stylesync' | '/discover' | '/sports' | '/intelligence' | '/notes' | '/personal-tools'; active?: boolean }) { return <Link to={to} className={`nav-item ${active ? 'active' : ''}`}>{label}</Link> }
