import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, Brain, CalendarDays, Check, CircleDashed, Compass, Dumbbell, Home, Layers3, ListChecks, Search, Sparkles, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { taxonomy  } from '@/lib/taxonomy'
import type {TaxonomyGroup} from '@/lib/taxonomy';

export const Route = createFileRoute('/categories')({
  head: () => ({ meta: [{ title: 'Kategori rehberi — Planmoy' }, { name: 'description', content: 'Planmoy akışlarının kategori ve alt kategori rehberi.' }] }),
  component: Categories,
})

function Categories() {
  const names = Object.keys(taxonomy)
  const [selected, setSelected] = useState(names[0] ?? 'Zaman akışı')
  const [query, setQuery] = useState('')
  const group = (taxonomy[selected] ?? taxonomy['Zaman akışı']) as TaxonomyGroup
  const filtered = useMemo(() => group.items.filter(item => `${item.name} ${item.children.join(' ')}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [group, query])
  const total = group.items.reduce((sum, item) => sum + item.children.length, 0)

  return <div className="app-shell"><aside className="sidebar"><Link to="/" className="brand">plan<span>moy</span><i /></Link><div className="workspace"><span className="avatar-mark">D</span><div><strong>Deniz’in alanı</strong><small>kişisel plan</small></div></div><nav className="side-nav" aria-label="Ana menü"><Link to="/" className="nav-item"><Home size={21} /><span>Akışım</span></Link><Link to="/calendar" className="nav-item"><CalendarDays size={21} /><span>Zaman akışı</span></Link><span className="nav-item" aria-disabled="true"><ListChecks size={21} /><span>Yapılacaklar</span></span><span className="nav-item" aria-disabled="true"><WandSparkles size={21} /><span>StyleSync</span></span><span className="nav-item" aria-disabled="true"><Compass size={21} /><span>Keşfet</span></span><Link to="/sports" className="nav-item"><Dumbbell size={21} /><span>Spor akışı</span></Link><span className="nav-item" aria-disabled="true"><Brain size={21} /><span>Yapay zeka</span></span><Link to="/space" className="nav-item"><CircleDashed size={21} /><span>Boş Alan</span></Link><Link to="/categories" className="nav-item active"><Layers3 size={21} /><span>Kategori rehberi</span></Link></nav><div className="sidebar-bottom"><div className="fire-note"><Sparkles size={16} /><span>Akışını<br /><b>hafiflet.</b></span></div><span className="side-caption">Planmoy · 2026</span></div></aside>
    <main className="main-canvas categories-canvas"><header className="topbar"><div><p className="eyebrow">Akış kütüphanesi</p><h1>Kategori rehberi</h1></div><div className="top-actions"><span className="sync"><i /> Tüm alanlar hazır</span><div className="profile">DA</div></div></header>
      <section className="category-intro"><div><Link to="/" className="back-link"><ArrowLeft size={14} /> Akışıma dön</Link><p className="eyebrow orange">Eksiksiz sınıflandırma</p><h2>Akışını doğru<br /><em>yerden başlat.</em></h2><p className="intro">Takvimden Boş Alan’a kadar Planmoy’un tüm ana kategorilerini ve alt seçeneklerini tek yerde keşfet.</p></div><div className="category-count"><strong>{names.length}</strong><span>ana alan<br />{total} alt seçenek</span></div></section>
      <div className="category-filterbar" role="tablist" aria-label="Akış alanları"><span className="category-filter-label">Filtrele</span>{names.map(name => <button key={name} role="tab" aria-selected={selected === name} className={selected === name ? 'selected' : ''} onClick={() => { setSelected(name); setQuery('') }}>{name}<ArrowUpRight size={14} /></button>)}</div><section className="category-content"><div className="category-content-head"><div><p className="eyebrow orange">{selected}</p><h3>{group.title}</h3><p>{group.items.length} ana kategori · {total} alt seçenek</p></div><label className="search-field category-search"><Search size={16} /><span className="sr-only">Kategorilerde ara</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Bu alanda ara" /></label></div><div className="category-grid">{filtered.map((item, index) => <article className="category-card" key={item.name}><div className="category-card-top"><span>0{index + 1}</span><Check size={15} /></div><h4>{item.name}</h4>{item.children.length ? <div className="chip-list">{item.children.map(child => <span key={child}>{child}</span>)}</div> : <p className="free-tag">Etiketleri sen belirlersin.</p>}</article>)}</div>{!filtered.length && <div className="category-empty">Bu alanda “{query}” ile eşleşen kategori yok.</div>}</section>
      <footer><span className="brand small">plan<span>moy</span><i /></span><span>Hayatının akışı, tek noktada.</span><Link to="/book" className="footer-link">Randevu oluştur <ArrowUpRight size={13} /></Link></footer>
    </main></div>
}
