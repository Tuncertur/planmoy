import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Download, FileArchive, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/export')({
  head: () => ({
    meta: [
      { title: 'Planmoy kaynak dışa aktarımı' },
      { name: 'description', content: 'Planmoy kaynak dosyalarını ZIP arşivi olarak indirin.' },
    ],
  }),
  component: ExportPage,
})

function ExportPage() {
  return (
    <main className="export-page">
      <header className="export-header">
        <Link to="/" className="export-brand" aria-label="Planmoy ana sayfa">
          plan<span>moy</span><i />
        </Link>
        <Link to="/" className="export-back"><ArrowLeft size={15} /> Ana sayfaya dön</Link>
      </header>

      <section className="export-hero">
        <div className="export-copy">
          <p className="eyebrow">Planmoy kaynak arşivi</p>
          <h1>Projenin tamamı, tek bir ZIP dosyasında.</h1>
          <p className="export-lead">
            Web uygulaması, sunucu kodu, Android ve iOS kaynakları ile proje dokümantasyonunu tek arşivde indirin.
            Arşiv doğrudan bu sayfadan hazırlanmış ve indirilmeye hazırdır.
          </p>
          <a className="export-download" href="/Planmoy-source-export.zip" download="Planmoy-source-export.zip">
            <Download size={18} /> ZIP arşivini indir
          </a>
          <p className="export-note"><ShieldCheck size={14} /> Gizli ortam dosyaları ve bağımlılık klasörleri güvenlik için dışarıda bırakıldı.</p>
        </div>
        <div className="export-art" aria-hidden="true">
          <div className="export-orbit export-orbit-one" />
          <div className="export-orbit export-orbit-two" />
          <div className="export-file"><FileArchive size={40} /><strong>.ZIP</strong><span>PLANMOY</span></div>
        </div>
      </section>

      <section className="export-details" aria-label="Arşiv içeriği">
        <div className="export-detail-card"><CheckCircle2 size={17} /><div><strong>Dahil edildi</strong><p>src, public, android, ios, migrations ve tüm proje yapılandırmaları.</p></div></div>
        <div className="export-detail-card"><CheckCircle2 size={17} /><div><strong>Kurulum için hazır</strong><p>Arşivi açtıktan sonra <code>bun install</code> ve <code>bun run build</code> ile başlayın.</p></div></div>
        <div className="export-detail-card"><ShieldCheck size={17} /><div><strong>Güvenli paylaşım</strong><p>.env, node_modules, .git ve geçici derleme dosyaları dahil edilmedi.</p></div></div>
      </section>
    </main>
  )
}
