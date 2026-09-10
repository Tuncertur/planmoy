import { ArrowLeft, Database, FileText, Globe2, Lock, Mail, RefreshCw, ShieldCheck, Timer } from "lucide-react";
import { tt } from "../lib/i18n";

// KVKK m.10 (aydınlatma yükümlülüğü), m.11 (ilgili kişi hakları) ve m.5
// (hukuki sebep) zorunlu unsurları esas alınarak hazırlanmıştır.
// Veri sorumlusu: Tuncer Turhan (şahıs, tüzel kişilik yok).
// Bu bir hukuk bürosu tarafından hazırlanmamıştır; kullanıcı hukuki
// sorumluluğu kendisi üstlenmiştir.

export function LegalScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="legal-page">
      <header>
        <a className="legal-back" onClick={onBack} style={{ cursor: "pointer" }}>
          <ArrowLeft size={14} /> {tt({ tr: "Geri", en: "Back" })}
        </a>
      </header>
      <div className="legal-wrap">
        <h1>{tt({ tr: "Gizlilik Politikası ve KVKK Aydınlatma Metni", en: "Privacy Policy" })}</h1>
        <p className="legal-updated">{tt({ tr: "Son güncelleme: 10 Eylül 2026", en: "Last updated: September 10, 2026" })}</p>

        <section className="legal-section">
          <ShieldCheck size={20} />
          <div>
            <h2>{tt({ tr: "1. Veri Sorumlusunun Kimliği", en: "1. Data Controller" })}</h2>
            <p>
              {tt({
                tr: "6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") uyarınca, Planmoy uygulaması kapsamında işlenen kişisel verileriniz bakımından veri sorumlusu:",
                en: "For the purposes of applicable data protection law, the data controller for personal data processed within the Planmoy app is:",
              })}
            </p>
            <p className="legal-contact">
              Planmoy
              <br />
              <span style={{ fontSize: 11, opacity: 0.85 }}>
                {tt({ tr: "(Tuncer Turhan tarafından işletilmektedir — şahıs, tüzel kişilik bulunmamaktadır)", en: "(operated by Tuncer Turhan — sole individual, no registered company)" })}
              </span>
              <br />
              {tt({ tr: "E-posta", en: "Email" })}: destek@planmoy.app
            </p>
          </div>
        </section>

        <section className="legal-section">
          <Database size={20} />
          <div>
            <h2>{tt({ tr: "2. İşlenen Kişisel Veri Kategorileri", en: "2. Categories of Personal Data" })}</h2>
            <p>
              {tt({
                tr: "Uygulamayı kullanırken aşağıdaki veri kategorileri işlenir:",
                en: "The following categories of data are processed while using the app:",
              })}
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#55738f", fontSize: 12, lineHeight: 1.8 }}>
              <li>{tt({ tr: "Kimlik ve iletişim verisi: e-posta adresi, (girilmişse) telefon numarası", en: "Identity & contact: email address, phone number if provided" })}</li>
              <li>{tt({ tr: "Hesap içeriği: görevler, notlar, randevular, gardırop kayıtları, ilgi alanları", en: "Account content: tasks, notes, appointments, wardrobe items, interests" })}</li>
              <li>{tt({ tr: "İşletme verisi (işletme hesabı açan kullanıcılar için): işletme adı, müşteri kayıtları, hizmetler", en: "Business data (for business accounts): business name, customer records, services" })}</li>
              <li>{tt({ tr: "Konum verisi: yalnızca Keşfet özelliğini kullanırken, açık izninle, cihazından alınan anlık konum", en: "Location data: only when using Discover, with your explicit permission, real-time device location" })}</li>
              <li>{tt({ tr: "İşlem güvenliği verisi: oturum açma zaman damgaları, IP tabanlı hız sınırlama kayıtları", en: "Security data: sign-in timestamps, IP-based rate-limit records" })}</li>
              <li>{tt({ tr: "Fotoğraflar: StyleSync'e yüklediğin gardırop fotoğrafları (isteğe bağlı)", en: "Photos: wardrobe photos you upload to StyleSync (optional)" })}</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <FileText size={20} />
          <div>
            <h2>{tt({ tr: "3. İşleme Amaçları ve Hukuki Sebep (KVKK m.5)", en: "3. Purposes & Legal Basis" })}</h2>
            <p>
              {tt({
                tr: "Verilerin, hesabını oluşturup hizmeti sağlayabilmemiz için sözleşmenin kurulması ve ifasıyla doğrudan ilgili olması nedeniyle işlenmesi esastır. Konum verisi ve gardırop fotoğrafları yalnızca açık rızanla, sen özellik kullanmayı seçtiğinde işlenir. Amaçlar: hesabını yönetmek, randevu/görev/not kayıtlarını sana özel tutmak, Keşfet'te yakın işletme önerisi sunmak, StyleSync'te kombin önerisi hazırlamak, kötüye kullanımı önlemek (hız sınırlama).",
                en: "Data is processed on the basis that it's necessary for the performance of the contract (providing the service). Location and wardrobe photos are processed only with your explicit consent, when you choose to use those features. Purposes: managing your account, keeping your appointments/tasks/notes private to you, suggesting nearby businesses in Discover, generating outfit advice in StyleSync, and preventing abuse (rate limiting).",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <Globe2 size={20} />
          <div>
            <h2>{tt({ tr: "4. Verilerin Aktarıldığı Taraflar", en: "4. Data Recipients" })}</h2>
            <p>
              {tt({
                tr: "Hizmeti sağlamak için aşağıdaki alt yüklenicilerle (veri işleyen) çalışılır; veriler yalnızca hizmetin çalışması için gerekli ölçüde bu taraflara aktarılır:",
                en: "To provide the service, we work with the following sub-processors, and data is shared with them only to the extent necessary:",
              })}
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#55738f", fontSize: 12, lineHeight: 1.8 }}>
              <li><strong>Supabase</strong> ({tt({ tr: "veritabanı ve kimlik doğrulama altyapısı, yurt dışı sunucu", en: "database & auth infrastructure, hosted abroad" })})</li>
              <li><strong>Google (Gemini API)</strong> ({tt({ tr: "yalnızca sen bir AI önerisi istediğinde, o anki metin gönderilir", en: "only when you request an AI suggestion, that text is sent" })})</li>
              <li><strong>Google Maps Places API</strong> ({tt({ tr: "yalnızca Keşfet'te konumunu paylaştığında", en: "only when you share your location in Discover" })})</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              {tt({
                tr: "Bu aktarımların bir kısmı yurt dışına yapılmaktadır. Veriler hiçbir şekilde reklam amacıyla satılmaz veya üçüncü taraf pazarlama şirketleriyle paylaşılmaz.",
                en: "Some of these transfers occur outside your country. Data is never sold for advertising purposes or shared with third-party marketing companies.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <Timer size={20} />
          <div>
            <h2>{tt({ tr: "5. Saklama Süresi", en: "5. Retention Period" })}</h2>
            <p>
              {tt({
                tr: "Verilerin, hesabın aktif olduğu sürece ve hesabını sildikten sonra makul bir teknik süre (yedeklerin temizlenmesi için en fazla 30 gün) içinde saklanması esastır. Hesap silme talebinde bulunduğunda kayıtların tamamı kalıcı olarak silinir.",
                en: "Data is retained for as long as your account is active, and for a reasonable technical period after deletion (up to 30 days, for backup cleanup). All records are permanently removed upon account deletion.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <Lock size={20} />
          <div>
            <h2>{tt({ tr: "6. Çerezler", en: "6. Cookies" })}</h2>
            <p>
              {tt({
                tr: "Web sürümü yalnızca oturumunu açık tutmak için gerekli teknik çerezleri kullanır. Pazarlama veya izleme amaçlı çerez kullanılmaz.",
                en: "The web version uses only technical cookies required to keep you signed in. No marketing or tracking cookies are used.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <ShieldCheck size={20} />
          <div>
            <h2>{tt({ tr: "7. Haklarınız (KVKK m.11)", en: "7. Your Rights" })}</h2>
            <p>
              {tt({
                tr: "KVKK'nın 11. maddesi uyarınca; kişisel verinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, KVKK'da öngörülen şartlarda silinmesini isteme, düzeltme/silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme, işlenen verinin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhine bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işleme sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme haklarına sahipsin.",
                en: "You have the right to know whether your data is processed, request information about it, learn the purpose of processing, know third parties it's shared with, request correction of inaccurate data, request deletion under applicable conditions, object to conclusions drawn solely by automated processing, and seek compensation for damages caused by unlawful processing.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <Mail size={20} />
          <div>
            <h2>{tt({ tr: "8. Başvuru Yöntemi", en: "8. How to Exercise Your Rights" })}</h2>
            <p>
              {tt({
                tr: "Yukarıdaki haklarını kullanmak için destek@planmoy.app adresine, kimliğini doğrulayacak bilgilerle birlikte yazılı olarak başvurabilirsin. Talepler en geç 30 gün içinde sonuçlandırılır. Hesap içinden doğrudan silme talebinde de bulunabilirsin (Hesap Ayarları > Hesabı Sil).",
                en: "To exercise the rights above, write to destek@planmoy.app with information to verify your identity. Requests are resolved within 30 days at the latest. You can also request deletion directly from Account Settings.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <RefreshCw size={20} />
          <div>
            <h2>{tt({ tr: "9. Değişiklikler", en: "9. Changes" })}</h2>
            <p>
              {tt({
                tr: "Bu politika, hizmetin kapsamı değiştikçe güncellenebilir. Önemli değişikliklerde uygulama içinden bilgilendirme yapılır.",
                en: "This policy may be updated as the service evolves. You'll be notified in-app of material changes.",
              })}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
