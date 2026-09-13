import { HeadContent, Link, Scripts, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Compass, Dumbbell, Home, ListChecks, Search, Sparkles, UserRound, WandSparkles, PartyPopper } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { PersonalAssistant } from '@/components/personal-assistant'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { I18nProvider, LanguageSelect, useI18n } from '@/lib/i18n'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Planmoy — Online randevu yönetimi' },
      { name: 'description', content: 'İşletmeniz için online randevu, takvim ve müşteri yönetimi.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Planmoy — Online randevu yönetimi' },
      { property: 'og:description', content: 'İşletmeniz için online randevu, takvim ve müşteri yönetimi.' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }, { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }, { rel: 'manifest', href: '/manifest.webmanifest' }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><head><HeadContent /><meta name="mobile-web-app-capable" content="yes" /><meta name="apple-mobile-web-app-capable" content="yes" /><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" /><meta name="apple-mobile-web-app-title" content="Planmoy" /><link rel="apple-touch-icon" href="/icon-192.svg" /></head><body><I18nProvider><div className="root-content">{children}<GlobalChrome /><ConditionalOverlays /><Toaster /></div></I18nProvider><script dangerouslySetInnerHTML={{ __html: `document.addEventListener('change',function(e){var t=e.target;if(t&&t.matches&&t.matches('.global-language-control select,.top-actions .language-picker select')){localStorage.setItem('planmoy-language',t.value);location.reload()}});if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}` }} /><Scripts /></body></html>
}

function ConditionalOverlays() {
  const location = useLocation()
  const isPublicSurface = ['/auth', '/legal', '/pricing', '/export'].includes(location.pathname)
  return isPublicSurface ? null : <><ThemeSwitcher /><PersonalAssistant /></>
}

function GlobalSideNav({ location }: { location: { pathname: string } }) {
  const { t } = useI18n()
  const hasOwnSidebar = ['/', '/business', '/categories', '/discover', '/intelligence', '/notes', '/personal-tools', '/space', '/sports', '/stylesync', '/tasks'].includes(location.pathname)
  if (hasOwnSidebar || location.pathname.startsWith('/businesses') || location.pathname.startsWith('/api/')) return null
  const [query, setQuery] = useState('')
  const items = [
    { to: '/', label: t('Ana akış'), icon: <Home size={18} /> },
    { to: '/calendar', label: t('Zaman akışı'), icon: <CalendarDays size={18} /> },
    { to: '/tasks', label: t('Yapılacaklar'), icon: <ListChecks size={18} /> },
    { to: '/stylesync', label: 'StyleSync', icon: <WandSparkles size={18} /> },
    { to: '/discover', label: t('Keşfet'), icon: <Compass size={18} /> },
    { to: '/events', label: t('Etkinlikler'), icon: <PartyPopper size={18} /> },
    { to: '/sports', label: t('Spor akışı'), icon: <Dumbbell size={18} /> },
    { to: '/intelligence', label: t('Yapay zeka'), icon: <Sparkles size={18} /> },
    { to: '/account', label: t('Hesap'), icon: <UserRound size={18} /> },
  ] as const
  const filteredItems = useMemo(() => items.filter(item => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [items, query])
  return <aside className="global-side-rail" aria-label="Planmoy ana menüsü"><a className="global-rail-brand" href="/">plan<span>moy</span><i /></a><div className="global-rail-context"><span>PM</span><div><strong>Planmoy</strong><small>kişisel çalışma alanı</small></div></div><label className="global-rail-search"><Search size={15} /><span className="sr-only">Menüde ara</span><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Menüde ara" placeholder="Menüde ara" /></label><nav>{filteredItems.map(item => <Link key={item.to} to={item.to} className={location.pathname === item.to ? 'active' : ''}>{item.icon}<span>{item.label}</span></Link>)}{!filteredItems.length && <p className="global-rail-empty">Sonuç yok</p>}</nav><div className="global-rail-foot"><span className="global-rail-status" /> Web · Android · iOS</div></aside>
}

function GlobalChrome() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isAuth = location.pathname === '/auth'
  const isLegal = location.pathname === '/legal'
  const isPricing = location.pathname === '/pricing'
  const isExport = location.pathname === '/export'
  const nav = (to: '/' | '/calendar' | '/discover' | '/account') => navigate({ to })
  if (isLegal || isPricing || isExport) return null
  return <>
    {!isHome && !isAuth && <button className="global-back" onClick={() => window.history.length > 1 ? window.history.back() : nav('/')} aria-label="Önceki ekrana dön"><ArrowLeft size={17} /><span>Geri</span></button>}
    {!isAuth && <GlobalSideNav location={location} />}
    {!isAuth && <div className="global-language-control"><LanguageSelect /></div>}
    {!isAuth && <nav className="mobile-bottom-nav" aria-label="Hızlı gezinme">
      <button className={isHome ? 'active' : ''} onClick={() => nav('/')}><Home size={18} /><span>Ana akış</span></button>
      <button className={location.pathname === '/calendar' ? 'active' : ''} onClick={() => nav('/calendar')}><CalendarDays size={18} /><span>Takvim</span></button>
      <button className={location.pathname === '/discover' ? 'active' : ''} onClick={() => nav('/discover')}><Compass size={18} /><span>Keşfet</span></button>
      <button className={location.pathname === '/account' ? 'active' : ''} onClick={() => nav('/account')}><UserRound size={18} /><span>Hesap</span></button>
    </nav>}
  </>
}
