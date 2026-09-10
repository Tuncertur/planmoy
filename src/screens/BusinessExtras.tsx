import { useState, type ReactNode } from "react";
import {
  ArrowRight, Award, BadgePercent, BarChart3, Bell, Boxes, CalendarDays,
  Check, CircleAlert, Coins, FileDown, Mail, Megaphone,
  Package, Plus, Send, ShoppingCart, SlidersHorizontal, Sparkles,
  Users, Wallet, MapPin,
} from "lucide-react";

// Bu bileşenler FireVibe'ın gerçek src/routes/business.tsx dosyasından
// (Staff, Inventory, Reports, Marketing, Settings, Loyalty, Competition,
// Performance, Supply, Pricing) BİREBİR taşınmıştır. FireVibe'da bu
// modüllerin çoğu henüz gerçek veritabanına bağlanmamış, örnek işletme
// ("Deniz Flow Studio") ile gösterim amaçlı statik veri kullanıyordu —
// burada da aynı şekilde, aynı örnek verilerle taşındı. Gerçek DB
// bağlantısı (Randevular ve Müşteriler'de olduğu gibi) ayrı bir iş.

function useToast() {
  const [notice, setNotice] = useState("");
  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }
  return { notice, notify };
}

function Toast({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <div className="business-toast" role="status">
      <Check size={15} /> {notice}
    </div>
  );
}

function PageAction({ text, label, onClick, icon = <Plus size={16} /> }: { text: string; label: string; onClick: () => void; icon?: ReactNode }) {
  return (
    <div className="business-page-actions">
      <p>{text}</p>
      <button className="business-primary" onClick={onClick}>{icon} {label}</button>
    </div>
  );
}
function PanelHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="business-panel-head">
      <div>
        <p className="eyebrow blue-label">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
function ModuleHeader({ icon, eyebrow, title, copy }: { icon: ReactNode; eyebrow: string; title: string; copy: string }) {
  return (
    <div className="module-header">
      <span className="module-header-icon">{icon}</span>
      <p className="eyebrow blue-label">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export function StaffPanel() {
  const { notice, notify } = useToast();
  return (
    <div className="business-content">
      <PageAction text="Çalışma saatleri, izinler ve performans" label="Personel ekle" onClick={() => notify("Personel ekleme formu örnek oturumda hazır.")} />
      <section className="business-two-column">
        <article className="business-panel data-panel">
          <PanelHead eyebrow="EKİP PLANI" title="Bugün çalışanlar" />
          {[
            ["Deniz Arslan", "Cilt uzmanı", "8 randevu", "green"],
            ["Mert Kaya", "Kuaför", "10 randevu", "blue"],
            ["Ayşe Şen", "İzinli", "Bugün izinli", "amber"],
          ].map(([name, role, count, tone]) => (
            <button type="button" className="team-row" key={name} onClick={() => notify(`${name} personel özeti açıldı.`)}>
              <span className={`team-avatar ${tone}`}>{name.split(" ").map((x) => x[0]).join("")}</span>
              <div><b>{name}</b><small>{role}</small></div>
              <span className={`team-state ${tone}`}>{count}</span>
            </button>
          ))}
        </article>
        <article className="business-panel business-insight compact-insight">
          <span className="insight-spark"><Sparkles size={17} /></span>
          <p className="eyebrow blue-label">YAPAY ZEKA PERFORMANS</p>
          <h2>Ekibin dengeli<br /><strong>çalışıyor.</strong></h2>
          <p>Ayşe Hanım'ın izinli olduğu gün için 3 randevuyu Deniz'e atamak uygun görünüyor.</p>
          <button className="insight-link" onClick={() => notify("Öneri incelenmek üzere işaretlendi.")}>Öneriyi incele <ArrowRight size={14} /></button>
        </article>
      </section>
      <Toast notice={notice} />
    </div>
  );
}

export function InventoryPanel() {
  const { notice, notify } = useToast();
  const items = [
    ["Şampuan bakım serisi", "42 / 60 adet", "70%", "green"],
    ["Keratin bakım kremi", "8 / 40 adet", "20%", "amber"],
    ["Renk koruyucu maske", "3 / 30 adet", "10%", "red"],
  ];
  return (
    <div className="business-content">
      <PageAction text="Ürün, stok seviyesi ve tedarikçi takibi" label="Ürün ekle" onClick={() => notify("Ürün ekleme formu örnek oturumda hazır.")} />
      <article className="business-panel inventory-panel">
        <PanelHead eyebrow="STOK YÖNETİMİ" title="Ürünler" action={<button className="panel-action" onClick={() => notify("Sipariş listesi açıldı.")}>Sipariş listesi <ArrowRight size={14} /></button>} />
        <div className="inventory-list">
          {items.map(([name, qty, pct, tone]) => (
            <div className="inventory-row" key={name}>
              <span className="product-icon"><Package size={16} /></span>
              <div><b>{name}</b><small>Tedarikçi: Flow Supply</small></div>
              <div className="stock-meter"><span className={tone} style={{ width: pct }} /></div>
              <strong>{qty}</strong>
              <span className={`stock-status ${tone}`}>{tone === "red" ? "Kritik" : tone === "amber" ? "Az kaldı" : "Yeterli"}</span>
            </div>
          ))}
        </div>
        <div className="inventory-alert">
          <CircleAlert size={16} />
          <span><b>Kritik stok uyarısı:</b> Renk koruyucu maske önümüzdeki hafta bitebilir.</span>
          <button onClick={() => notify("Sipariş taslağı oluşturuldu.")}>Sipariş oluştur</button>
        </div>
      </article>
      <Toast notice={notice} />
    </div>
  );
}

export function ReportsPanel() {
  const { notice, notify } = useToast();
  return (
    <div className="business-content">
      <PageAction text="Ciro, doluluk, müşteri ve hizmet performansı" label="Raporu dışa aktar" onClick={() => notify("Rapor dışa aktarma örnek oturumda hazır.")} icon={<FileDown size={16} />} />
      <section className="business-stat-grid report-stats">
        <article className="business-stat"><span className="stat-icon"><Wallet /></span><p>Aylık ciro</p><strong>₺86.400</strong><small>+15% geçen aya göre</small></article>
        <article className="business-stat"><span className="stat-icon"><CalendarDays /></span><p>Doluluk</p><strong>78%</strong><small>+8 puan</small></article>
        <article className="business-stat"><span className="stat-icon"><Users /></span><p>Yeni müşteri</p><strong>42</strong><small>+12 bu ay</small></article>
        <article className="business-stat"><span className="stat-icon"><BarChart3 /></span><p>En popüler</p><strong>Saç kesimi</strong><small>96 işlem</small></article>
      </section>
      <section className="business-two-column">
        <article className="business-panel chart-panel">
          <PanelHead eyebrow="CİRO ANALİZİ" title="Son 6 ay" />
          <div className="chart-bars">
            {[["Mar", "48%"], ["Nis", "62%"], ["May", "54%"], ["Haz", "71%"], ["Tem", "78%"], ["Ağu", "88%"]].map(([m, h]) => (
              <div key={m}><span style={{ height: h }} /><small>{m}</small></div>
            ))}
          </div>
        </article>
        <article className="business-panel business-insight compact-insight">
          <span className="insight-spark"><Sparkles size={17} /></span>
          <p className="eyebrow blue-label">YAPAY ZEKA ANALİZİ</p>
          <h2>Ciron geçen aya göre<br /><strong>%15 arttı.</strong></h2>
          <p>En güçlü büyüme saç kesimi hizmetinde. Salı günleri için doluluk kampanyası deneyebilirsin.</p>
        </article>
      </section>
      <Toast notice={notice} />
    </div>
  );
}

export function MarketingPanel() {
  const { notice, notify } = useToast();
  const templates: Record<string, string> = {
    "Hoş geldin": "Merhaba {isim}, işletmemiz ailesine hoş geldin.",
    "Hatırlatma": "Merhaba {isim}, yarınki randevun için seni bekliyoruz.",
    "Kampanya": "Bu hafta sana özel bakım fırsatımızı keşfet.",
  };
  const [template, setTemplate] = useState("Hoş geldin");
  const [message, setMessage] = useState(templates["Hoş geldin"]);
  const [channels, setChannels] = useState<string[]>(["SMS"]);
  const toggleChannel = (c: string) => setChannels((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));
  return (
    <div className="business-content">
      <PageAction text="SMS, WhatsApp ve e-posta kampanyalarını planla" label="Kampanya başlat" onClick={() => notify("Kampanya taslağı hazırlandı.")} icon={<Megaphone size={16} />} />
      <section className="marketing-grid">
        <article className="business-panel campaign-composer">
          <PanelHead eyebrow="YENİ İLETİŞİM" title="Müşterilerine ulaş" />
          <div className="template-row">
            <span>Hazır şablon</span>
            {Object.keys(templates).map((x) => (
              <button key={x} className={template === x ? "chosen" : ""} onClick={() => { setTemplate(x); setMessage(templates[x]); }}>{x}</button>
            ))}
          </div>
          <label className="business-field">
            Mesaj içeriği
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <div className="channel-row">
            <span>Kanallar</span>
            {["SMS", "WhatsApp", "E-posta"].map((c) => (
              <button key={c} className={channels.includes(c) ? "chosen" : ""} onClick={() => toggleChannel(c)}>{c}</button>
            ))}
          </div>
          <button className="business-primary wide" onClick={() => notify(channels.length ? `${channels.join(", ")} için mesaj taslağı kaydedildi.` : "En az bir kanal seçmelisin.")}>
            <Send size={16} /> Taslağı kaydet
          </button>
        </article>
        <article className="business-panel campaign-insight">
          <span className="insight-spark"><Sparkles size={17} /></span>
          <p className="eyebrow blue-label">AKILLI FIRSAT</p>
          <h2>15 müşteri<br /><strong>2 aydır gelmedi.</strong></h2>
          <p>Onlara kişisel bir bakım hatırlatması göndererek geri dönüşü artırabilirsin.</p>
          <button className="text-action" onClick={() => { setTemplate("Kampanya"); setMessage(templates["Kampanya"]); }}>Mesajı hazırla <ArrowRight size={14} /></button>
        </article>
      </section>
      <section className="business-panel campaign-status">
        <PanelHead eyebrow="GÖNDERİM DURUMU" title="Son iletişimler" />
        <div className="status-cards">
          <div><span><Mail /></span><b>Hoş geldin serisi</b><small>126 alıcı</small><em className="draft">Taslak</em></div>
          <div><span><Send /></span><b>Randevu hatırlatmaları</b><small>98 alıcı</small><em>Gönderildi</em></div>
          <div><span><Megaphone /></span><b>Yaz fırsatı</b><small>15 alıcı</small><em className="pending">Beklemede</em></div>
        </div>
      </section>
      <Toast notice={notice} />
    </div>
  );
}

export function BusinessSettingsPanel() {
  const { notice, notify } = useToast();
  const [section, setSection] = useState("Genel");
  return (
    <div className="business-content">
      <PageAction text="İşletme bilgileri, saatler, hizmetler ve ödeme" label="Değişiklikleri kaydet" onClick={() => notify(`${section} ayarları örnek oturumda kaydedildi.`)} icon={<Check size={16} />} />
      <div className="settings-tabs" role="tablist">
        {["Genel", "Hizmetler", "Saatler", "Entegrasyonlar"].map((tab) => (
          <button key={tab} className={section === tab ? "selected" : ""} onClick={() => setSection(tab)}>{tab}</button>
        ))}
      </div>
      <section className="settings-grid">
        {section === "Genel" && (
          <article className="business-panel settings-panel">
            <PanelHead eyebrow="GENEL" title="İşletme profili" />
            <p style={{ fontSize: 11, color: "#7893ad", margin: "4px 0 12px" }}>
              Bu alanları gerçek verilerle doldurmak için Lokasyon sekmesini kullan — burası genel görünüm ayarları içindir.
            </p>
          </article>
        )}
        {section === "Saatler" && (
          <article className="business-panel settings-panel">
            <PanelHead eyebrow="ÇALIŞMA SAATLERİ" title="Açık olduğun zamanlar" />
            <div className="hours-list">
              {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"].map((day) => (
                <label key={day}><input type="checkbox" defaultChecked /> <b>{day}</b><span>09:00 — 19:00</span></label>
              ))}
            </div>
          </article>
        )}
        {section === "Hizmetler" && (
          <article className="business-panel settings-panel">
            <PanelHead eyebrow="HİZMETLER VE FİYATLAR" title="Öne çıkan hizmetler" />
            <div className="service-list">
              {[["Cilt bakımı", "₺850 · 60 dk"], ["Saç kesimi", "₺600 · 45 dk"], ["İlk danışmanlık", "₺1.200 · 90 dk"]].map(([n, p]) => (
                <div key={n}><b>{n}</b><span>{p}</span></div>
              ))}
            </div>
          </article>
        )}
        {section === "Entegrasyonlar" && (
          <article className="business-panel settings-panel integration-panel">
            <PanelHead eyebrow="ENTEGRASYONLAR" title="Akışını bağla" />
            <p>Ödeme özelliği Planmoy'dan bilinçli olarak çıkarıldı. Aşağıdaki bağlantılar randevu ve iletişim akışını güçlendirir.</p>
            <div className="integration-list">
              <div><CalendarDays /><span><b>Google Calendar / Outlook</b><small>Çakışan saatleri kapatmak için takvim bağlantısı</small></span><button onClick={() => notify("Takvim OAuth bağlantısı için entegrasyon anahtarı gerekir.")}>Bağla</button></div>
              <div><Mail /><span><b>E-posta bildirimleri</b><small>Randevu onayı ve hatırlatmalar</small></span><button onClick={() => notify("Resend API anahtarı eklenince etkinleşir.")}>Bağla</button></div>
              <div><Bell /><span><b>SMS / WhatsApp</b><small>Hatırlatma ve yeniden planlama mesajları</small></span><button onClick={() => notify("Twilio veya WhatsApp Business hesabı gerekir.")}>Bağla</button></div>
            </div>
          </article>
        )}
      </section>
      <Toast notice={notice} />
    </div>
  );
}

export function LoyaltyPanel() {
  const { notice, notify } = useToast();
  const [threshold, setThreshold] = useState("5");
  return (
    <div className="business-content business-new-module">
      <PageAction text="Ziyaretleri puana, puanları sadakate dönüştür" label="Kupon oluştur" onClick={() => notify(`%20 indirim kuponu oluşturuldu · ${threshold} ziyaret`)} icon={<BadgePercent size={16} />} />
      <div className="business-module-grid">
        <article className="business-panel business-feature-panel">
          <ModuleHeader icon={<Award />} eyebrow="SADAKAT PROGRAMI" title="Müşteri bağlılığını büyüt" copy="Ziyaret başına puan kazanımı, özel teklifler ve kuponları tek akışta yönet." />
          <div className="loyalty-rule">
            <label>Kupon eşiği <input value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/[^0-9]/g, ""))} /> ziyaret</label>
            <button className="business-primary" onClick={() => notify("Puan sistemi ayarları kaydedildi.")}>Kuralı kaydet</button>
          </div>
        </article>
        <article className="business-panel business-insight">
          <span className="insight-spark"><Sparkles size={17} /></span>
          <p className="eyebrow blue-label">YAPAY ZEKA SADAKAT ÖNERİSİ</p>
          <h2>En sadık 10 müşterine<br /><strong>özel bir teşekkür.</strong></h2>
          <p>Ayşe Hanım bu ayın en yüksek puanlı müşterisi. Ona kişisel bir hediye teklif edebilirsin.</p>
          <button className="insight-link" onClick={() => notify("Sadık müşteriler kampanyası taslağı açıldı.")}>Kampanya hazırla <ArrowRight size={14} /></button>
        </article>
      </div>
      <article className="business-panel loyalty-table">
        <PanelHead eyebrow="PUAN DURUMU" title="Müşteri sadakat kartları" />
        <div className="loyalty-list">
          {[["Ayşe Demir", "1.240 puan", "12 ziyaret", "Gold"], ["Can Yıldız", "680 puan", "7 ziyaret", "Silver"], ["Selin Akın", "120 puan", "2 ziyaret", "Başlangıç"]].map(([name, points, visits, level]) => (
            <div className="loyalty-row" key={name}>
              <span className="loyalty-medal"><Award size={16} /></span>
              <div><b>{name}</b><small>{visits} · son ziyaret 4 gün önce</small></div>
              <strong>{points}</strong>
              <span className="loyalty-level">{level}</span>
              <button className="row-more" onClick={() => notify(`${name} için kupon oluşturma açıldı.`)}><BadgePercent size={16} /></button>
            </div>
          ))}
        </div>
      </article>
      <Toast notice={notice} />
    </div>
  );
}

export function CompetitionPanel() {
  const { notice, notify } = useToast();
  return (
    <div className="business-content business-new-module">
      <PageAction text="Çevrendeki işletmelerin fiyat ve hizmetlerini karşılaştır" label="Analizi yenile" onClick={() => notify("Piyasa analizi güncellendi.")} icon={<SlidersHorizontal size={16} />} />
      <div className="business-module-grid">
        <article className="business-panel competition-map">
          <ModuleHeader icon={<MapPin />} eyebrow="PİYASA GÖRÜNÜMÜ" title="Yakındaki rekabet" copy="Bölgendeki benzer işletmeleri ve konumlarını incele." />
          <div className="map-frame business-map">
            <iframe title="Rakip işletme haritası" src="https://www.google.com/maps?output=embed" loading="lazy" style={{ width: "100%", height: 240, border: 0, borderRadius: 12 }} />
          </div>
        </article>
        <article className="business-panel price-compare">
          <PanelHead eyebrow="FİYAT KARŞILAŞTIRMA" title="Hizmet bazında görünüm" />
          <div className="compare-list">
            {[["Saç kesimi", "₺300", "₺350", "Rekabetçi"], ["Cilt bakımı", "₺850", "₺800", "Gözden geçir"], ["İlk danışmanlık", "₺1.200", "₺1.350", "Avantajlı"]].map(([name, mine, market, verdict]) => (
              <div className="compare-row" key={name}>
                <b>{name}</b>
                <span>Senin fiyatın <strong>{mine}</strong></span>
                <span>Piyasa ort. <strong>{market}</strong></span>
                <em className={verdict === "Gözden geçir" ? "warn" : ""}>{verdict}</em>
              </div>
            ))}
          </div>
          <div className="ai-inline"><Sparkles size={15} /><span>Yapay zeka: Müşteri ilgisini öne çıkaran bir kampanya rekabet avantajını güçlendirebilir.</span></div>
        </article>
      </div>
      <Toast notice={notice} />
    </div>
  );
}

export function PerformancePanel() {
  const { notice, notify } = useToast();
  const rows: [string, string, string, string][] = [
    ["Ali Demir", "Kuaför", "30 randevu", "92%"],
    ["Ayşe Şen", "Cilt uzmanı", "24 randevu", "78%"],
    ["Mert Kaya", "Danışman", "18 randevu", "86%"],
  ];
  return (
    <div className="business-content business-new-module">
      <PageAction text="Randevu, memnuniyet ve satış performansını izle" label="Ayın çalışanını seç" onClick={() => notify("Ali Bey ayın çalışanı olarak işaretlendi.")} icon={<Award size={16} />} />
      <section className="business-panel performance-panel">
        <PanelHead eyebrow="EKİP PERFORMANSI" title="Bu ayın görünümü" />
        <div className="performance-list">
          {rows.map(([name, role, count, pct], i) => (
            <div className="performance-row" key={name}>
              <span className={`team-avatar ${i === 0 ? "green" : ""}`}>{name.split(" ").map((x) => x[0]).join("")}</span>
              <div><b>{name}</b><small>{role} · {count}</small></div>
              <div className="performance-meter"><span style={{ width: pct }} /></div>
              <strong>{pct}</strong>
              <button className="business-secondary" onClick={() => notify(`${name} için bonus değerlendirmesi açıldı.`)}>Bonus belirle</button>
            </div>
          ))}
        </div>
      </section>
      <div className="business-ai-strip"><Sparkles size={18} /><span><b>Yapay zeka performans koçu:</b> Ali Bey'in 30 randevusu ve yüksek memnuniyet skoru bonus için güçlü bir aday.</span></div>
      <Toast notice={notice} />
    </div>
  );
}

export function SupplyPanel() {
  const { notice, notify } = useToast();
  const [automatic, setAutomatic] = useState(true);
  return (
    <div className="business-content business-new-module">
      <PageAction text="Tedarikçileri, kritik stokları ve siparişleri tek yerde yönet" label="Sipariş oluştur" onClick={() => notify("Sipariş taslağı oluşturuldu.")} icon={<ShoppingCart size={16} />} />
      <div className="business-module-grid">
        <article className="business-panel supply-panel">
          <ModuleHeader icon={<Boxes />} eyebrow="TEDARİK ZİNCİRİ" title="Otomatik sipariş kontrolü" copy="Kritik seviyeye düşen ürünler için sipariş taslağı hazırlansın." />
          <div className="switch-line">
            <div><b>Otomatik siparişi aç</b><small>Şampuan stoğu 5 adede düştüğünde</small></div>
            <button className={`fake-switch ${automatic ? "on" : ""}`} onClick={() => setAutomatic(!automatic)} aria-pressed={automatic}><span /></button>
          </div>
          <div className="supply-alert">
            <CircleAlert size={16} />
            <span><b>Şampuan bakım serisi</b><small>5 adet kaldı · minimum seviye 10</small></span>
            <button onClick={() => notify("Tedarikçi A için sipariş onay bekliyor.")}>Onayla</button>
          </div>
        </article>
        <article className="business-panel supplier-panel">
          <PanelHead eyebrow="TEDARİKÇİLER" title="Güvenilir iş ortakları" />
          <div className="supplier-list">
            {[["Tedarikçi A", "₺ · 2 gün teslimat", "Önerilen"], ["Flow Supply", "₺₺ · 4 gün teslimat", "Aktif"], ["Studio Market", "₺₺ · 3 gün teslimat", "Alternatif"]].map(([name, detail, tag]) => (
              <div key={name}><span className="supplier-mark"><ShoppingCart size={14} /></span><div><b>{name}</b><small>{detail}</small></div><em>{tag}</em></div>
            ))}
          </div>
        </article>
      </div>
      <Toast notice={notice} />
    </div>
  );
}

export function PricingPanel() {
  const { notice, notify } = useToast();
  return (
    <div className="business-content business-new-module">
      <PageAction text="Maliyet, satış fiyatı ve kârlılığı birlikte optimize et" label="Önerileri uygula" onClick={() => notify("Saç kesimi fiyat önerisi incelenmek üzere kaydedildi.")} icon={<Coins size={16} />} />
      <section className="business-panel pricing-panel">
        <PanelHead eyebrow="FİYAT OPTİMİZASYONU" title="Hizmet bazlı kar marjı" />
        <div className="margin-list">
          {[["Saç kesimi", "₺150", "₺300", "%50", "₺320 öneri"], ["Cilt bakımı", "₺310", "₺850", "%64", "Sağlıklı"], ["İlk danışmanlık", "₺480", "₺1.200", "%60", "Sağlıklı"]].map(([name, cost, price, pct, verdict]) => (
            <div className="margin-row" key={name}>
              <div><b>{name}</b><small>Maliyet {cost} · Satış {price}</small></div>
              <div className="margin-meter"><span style={{ width: pct }} /></div>
              <strong>{pct}</strong>
              <em>{verdict}</em>
              <button className="business-secondary" onClick={() => notify(`${name} fiyatı ${verdict} olarak güncellenecek.`)}>Güncelle</button>
            </div>
          ))}
        </div>
        <div className="pricing-callout">
          <Coins size={18} />
          <span><b>Yapay zeka önerisi:</b> Saç kesimi piyasa ortalamasının altında. ₺320, müşteri değerini korurken marjı iyileştirebilir.</span>
          <button className="business-primary" onClick={() => notify("₺320 fiyat önerisi taslağa uygulandı.")}>Fiyatı uygula</button>
        </div>
      </section>
      <Toast notice={notice} />
    </div>
  );
}
