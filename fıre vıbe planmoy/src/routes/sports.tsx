import { createFileRoute, Link } from '@tanstack/react-router'
import { Bike, ChevronRight, CircleDot, Dumbbell, ExternalLink, Globe2, Mountain, Newspaper, Pause, Play, Trophy, Waves } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/sports')({
  head: () => ({ meta: [{ title: 'Spor akışı — Planmoy' }, { name: 'description', content: 'Ülkelere göre öne çıkan spor başlıklarını ve haber akışını keşfet.' }] }),
  component: Sports,
})

type Sport = { name: string; country: string; searches: string; icon: typeof Trophy; tone: string; query: string }
const sports: Sport[] = [
  { name: 'Futbol', country: 'Türkiye', searches: 'Süper Lig · milli takım · transfer', icon: Trophy, tone: 'blue', query: 'Türkiye futbol haberleri' },
  { name: 'Basketbol', country: 'ABD', searches: 'NBA · kolej ligi · playoff', icon: CircleDot, tone: 'violet', query: 'USA basketball news' },
  { name: 'Tenis', country: 'Birleşik Krallık', searches: 'Grand Slam · Wimbledon · sıralama', icon: Dumbbell, tone: 'mint', query: 'UK tennis news Wimbledon' },
  { name: 'Formula 1', country: 'Almanya', searches: 'yarış takvimi · pilotlar · sıralama', icon: Bike, tone: 'red', query: 'Germany Formula 1 news' },
  { name: 'Bisiklet', country: 'Fransa', searches: 'Tour de France · yol bisikleti · etap', icon: Bike, tone: 'cyan', query: 'France cycling news Tour de France' },
  { name: 'Sörf', country: 'Avustralya', searches: 'dalga · şampiyona · sahil', icon: Waves, tone: 'ocean', query: 'Australia surfing news' },
  { name: 'Kayak', country: 'Japonya', searches: 'kış sporları · slalom · pist', icon: Mountain, tone: 'ice', query: 'Japan skiing news' },
]

const promos = [
  { title: 'Sporu akışına ekle', copy: 'Takvimindeki boşluklara uygun antrenman hedefleri keşfet.', icon: Dumbbell, tone: 'promo-blue' },
  { title: 'Ülkenin gündemini izle', copy: 'Arama ilgisine göre öne çıkan spor başlıklarına tek dokunuşla ulaş.', icon: Globe2, tone: 'promo-violet' },
  { title: 'Bir sonraki hedefin', copy: 'Haberden ilhama, ilhamdan randevuya: kendi ritmini kur.', icon: Trophy, tone: 'promo-cyan' },
]

function Sports() {
  const [country, setCountry] = useState('Tümü')
  const [playing, setPlaying] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const countries = ['Tümü', ...Array.from(new Set(sports.map(s => s.country)))]
  const visible = country === 'Tümü' ? sports : sports.filter(s => s.country === country)
  const currentPromo = promos[playing] ?? promos[0]!
  const PromoIcon = currentPromo.icon
  useEffect(() => { if (!isPlaying) return; const id = window.setInterval(() => setPlaying(value => (value + 1) % promos.length), 20000); return () => window.clearInterval(id) }, [isPlaying])
  return <div className="app-shell"><aside className="sidebar"><Link to="/" className="brand">plan<span>moy</span><i /></Link><div className="workspace"><span className="avatar-mark">P</span><div><strong>Planmoy</strong><small>kişisel plan</small></div></div><nav className="side-nav" aria-label="Ana menü"><Nav label="Akışım" to="/" /><Nav label="Zaman akışı" to="/calendar" /><Nav label="Yapılacaklar" to="/tasks" /><Nav label="StyleSync" to="/stylesync" /><Nav label="Keşfet" to="/discover" /><Nav label="Spor akışı" to="/sports" active /><Nav label="Hobi ve hedefler" to="/space" /><Nav label="Yapay zeka" to="/intelligence" /></nav><div className="sidebar-bottom"><div className="fire-note"><Dumbbell size={16} /><span>Ritmini<br /><b>harekete geçir.</b></span></div></div></aside><main className="main-canvas module-canvas sports-canvas"><header className="topbar"><div><p className="eyebrow">Yeni ayrı menü</p><h1>Spor akışı</h1></div><Link to="/space" className="back-link">Hedeflerime dön <ChevronRight size={14} /></Link></header><section className="sports-intro"><div><p className="eyebrow blue-label">Ülke · kategori · haber</p><h2>Spor dünyasını<br /><em>ritmine bağla.</em></h2><p>Ülkelere göre öne çıkan arama başlıklarını, branşları ve haber akışını tek bir çalışma alanında takip et.</p><div className="platform-badges"><span>Web</span><span>Android</span><span>iOS</span></div></div><div className="sports-mark"><Trophy size={40} /><span>PLAY<br />YOUR FLOW</span></div></section><section className="sports-promo" aria-label="20 saniyelik spor tanıtımları"><div className={`sports-promo-art ${currentPromo.tone}`}><div className="promo-orbit" /><PromoIcon size={40} /><span className="promo-duration">20 sn</span><button onClick={() => setIsPlaying(value => !value)} aria-label={isPlaying ? 'Tanıtımı duraklat' : 'Tanıtımı oynat'}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button></div><div className="sports-promo-copy"><p className="eyebrow blue-label">Spor akışı tanıtımı · {playing + 1}/3</p><h3>{currentPromo.title}</h3><p>{currentPromo.copy}</p><div className="promo-dots">{promos.map((promo, index) => <button key={promo.title} className={index === playing ? 'active' : ''} onClick={() => setPlaying(index)} aria-label={`${index + 1}. tanıtımı aç`} />)}</div><small>Otomatik geçiş 20 saniyede bir · ses yok · Web, Android ve iOS uyumlu</small></div></section><section className="sports-toolbar"><div><p className="eyebrow">Arama ilgisi</p><h3>Ülkeye göre branşlar</h3></div><select value={country} onChange={e => setCountry(e.target.value)} aria-label="Ülkeye göre filtrele">{countries.map(item => <option key={item}>{item}</option>)}</select></section><section className="sports-grid">{visible.map((sport, index) => { const Icon = sport.icon; return <article className={`sport-card ${sport.tone}`} key={sport.name}><div className="sport-card-top"><span className="sport-icon"><Icon size={30} /></span><span className="country-label"><Globe2 size={12} /> {sport.country}</span></div><h3>{sport.name}</h3><p>{sport.searches}</p><a href={`https://news.google.com/search?q=${encodeURIComponent(sport.query)}`} target="_blank" rel="noreferrer">Haberleri aç <ExternalLink size={14} /></a><Link to="/space" className="sport-goal">Hedefe ekle <ChevronRight size={14} /></Link></article>})}</section><section className="sports-news"><div><p className="eyebrow blue-label">Canlı haber sınırı</p><h3>Başlıkları kaynağından takip et.</h3><p>Planmoy haberleri kendi içinde uydurmaz; her kart seni Google News aramasına götürür. Sonuçlar ülkeye ve dile göre değişebilir.</p></div><Newspaper size={38} /></section><footer><span className="brand small">plan<span>moy</span><i /></span><span>Hareketin de akışın bir parçası.</span><Link to="/categories" className="footer-link">Kategori rehberi ↗</Link></footer></main></div>
}
function Nav({ label, to, active }: { label: string; to: '/' | '/calendar' | '/tasks' | '/stylesync' | '/discover' | '/sports' | '/space' | '/intelligence'; active?: boolean }) { return <Link to={to} className={`nav-item ${active ? 'active' : ''}`}><span>{label}</span></Link> }
