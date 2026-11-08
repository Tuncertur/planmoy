import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { getActiveLang } from "../lib/i18n";

// Kullanım Şartları ve İade Politikası. Bu metinler bir hukuk bürosu tarafından hazırlanmamıştır;
// hukuki sorumluluğu hizmet sağlayıcı (Tuncer Turhan, şahıs) üstlenmiştir.
// Hukuki metinler yalnızca Türkçe ve İngilizce yayımlanır; diğer dillerde İngilizce gösterilir.
// Planların fiyatları burada YAZILMAZ (güncel fiyat web'deki fiyat sayfasındadır).
type Doc = { title: string; updated: string; sections: { h: string; p: string[] }[]; back: string; links: string };

const TERMS: Record<"tr" | "en", Doc> = {
  tr: {
    title: "Kullanım Şartları",
    updated: "Son güncelleme: 8 Kasım 2026",
    back: "Geri",
    links: "Diğer belgeler",
    sections: [
      { h: "1. Taraflar ve kapsam", p: [
        "Bu şartlar, Planmoy uygulamasını ve web sitesini (\"Hizmet\") kullanmanızı düzenler. Hizmeti Tuncer Turhan (şahıs, tüzel kişilik yoktur) sunar. İletişim: destek@planmoy.com.",
        "Hizmeti kullanarak bu şartları kabul etmiş olursunuz. Kabul etmiyorsanız Hizmeti kullanmayın.",
      ] },
      { h: "2. Hesap", p: [
        "Hesabınızın güvenliğinden siz sorumlusunuz. Verdiğiniz bilgilerin doğru olması gerekir. Hesabınızı uygulama içinden \"Hesap\" bölümünden istediğiniz zaman silebilirsiniz; silme işlemi kalıcıdır (ayrıntılar için Gizlilik Politikası'na bakın).",
      ] },
      { h: "3. Planlar ve ödemeler", p: [
        "Hizmetin ücretsiz bir planı ve ücretli planları vardır. Güncel planlar, fiyatlar ve limitler web sitesindeki fiyat sayfasında gösterilir.",
        "Ücretli planların ödemeleri web sitesi üzerinden, ödeme aracımız Paddle tarafından alınır. Paddle, satıcı kuruluş (Merchant of Record) olarak ödeme, fatura ve vergileri yönetir. Satın alırken Paddle'ın Alıcı Şartları da geçerlidir.",
        "Ücretli abonelikler, iptal edilmediği sürece her dönem sonunda otomatik yenilenir. İptal ettiğinizde sonraki dönem için ücret alınmaz; mevcut dönemin sonuna kadar planınızı kullanmaya devam edersiniz. İade koşulları için İade Politikası'na bakın.",
        "Mobil uygulamalarda ücretli plan satın alma sunulmaz; abonelik web sitesinden yönetilir.",
      ] },
      { h: "4. Yapay zeka özellikleri", p: [
        "Yapay zeka önerileri otomatik olarak üretilir ve hatalı ya da eksik olabilir. Önerilere dayanarak karar vermeden önce kontrol etmeniz gerekir. Yapay zeka hiçbir işlemi sizin onayınız olmadan yapmaz.",
        "Yapay zeka kullanımı planınıza göre aylık bir kullanım hakkıyla sınırlıdır. Kullanım hakkınız bittiğinde uygulamanın geri kalanı çalışmaya devam eder. Kötüye kullanımı önlemek için ek makul sınırlar uygulanabilir.",
      ] },
      { h: "5. Kabul edilebilir kullanım", p: [
        "Hizmeti yasalara aykırı amaçlarla, başkalarının haklarını ihlal edecek biçimde, Hizmeti aksatacak ya da güvenliğini zorlayacak şekilde (ör. yetkisiz erişim denemeleri, otomatik toplu istek, spam) kullanamazsınız.",
        "İşletme hesabı açan kullanıcılar, müşterilerinin kişisel verilerini işlerken kendi sorumluluklarındaki yasal yükümlülüklere uymalıdır.",
      ] },
      { h: "6. İçeriğiniz", p: [
        "Hizmete girdiğiniz içerik (görevler, notlar, randevular, fotoğraflar vb.) size aittir. Hizmeti sunabilmemiz için bu içeriği saklama ve işleme hakkını bize verirsiniz. Verilerin nasıl işlendiği Gizlilik Politikası'nda anlatılır.",
      ] },
      { h: "7. Hizmetin sürekliliği", p: [
        "Hizmeti özenle sunmaya çalışırız; ancak kesintisiz ve hatasız olacağını garanti etmeyiz. Hizmeti geliştirebilir, değiştirebilir veya özelliklerini sonlandırabiliriz. Ücretli planı etkileyen önemli değişikliklerde makul bir süre önceden bilgilendirmeye çalışırız.",
      ] },
      { h: "8. Sorumluluğun sınırlandırılması", p: [
        "Yasaların izin verdiği ölçüde, Hizmetin kullanımından doğan dolaylı zararlardan, veri veya kâr kaybından sorumlu değiliz. Toplam sorumluluğumuz, olayın gerçekleştiği tarihten önceki 12 ayda Hizmet için ödediğiniz tutarla sınırlıdır.",
        "Bu sınırlamalar, bulunduğunuz ülkenin emredici tüketici koruma hükümlerini ortadan kaldırmaz.",
      ] },
      { h: "9. Değişiklikler ve uygulanacak hukuk", p: [
        "Bu şartları güncelleyebiliriz. Önemli değişiklikleri uygulama içinde veya e-posta ile duyururuz. Güncellemeden sonra Hizmeti kullanmaya devam etmeniz yeni şartları kabul ettiğiniz anlamına gelir.",
        "Bu şartlara Türkiye hukuku uygulanır; yaşadığınız ülkenin vazgeçilemez tüketici hakları saklıdır.",
      ] },
      { h: "10. İletişim", p: ["Sorularınız için: destek@planmoy.com"] },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: November 8, 2026",
    back: "Back",
    links: "Other documents",
    sections: [
      { h: "1. Parties and scope", p: [
        "These terms govern your use of the Planmoy app and website (the \"Service\"). The Service is provided by Tuncer Turhan (an individual; no legal entity). Contact: destek@planmoy.com.",
        "By using the Service you agree to these terms. If you do not agree, do not use the Service.",
      ] },
      { h: "2. Your account", p: [
        "You are responsible for the security of your account and for providing accurate information. You can delete your account at any time from the \"Account\" section in the app; deletion is permanent (see the Privacy Policy for details).",
      ] },
      { h: "3. Plans and payments", p: [
        "The Service has a free plan and paid plans. Current plans, prices and limits are shown on the pricing page of the website.",
        "Payments for paid plans are taken on the website by our payment provider, Paddle. Paddle acts as the Merchant of Record and handles payment, invoicing and taxes. Paddle's Buyer Terms also apply when you purchase.",
        "Paid subscriptions renew automatically at the end of each period unless cancelled. If you cancel, you are not charged for the next period and you keep your plan until the end of the current period. See the Refund Policy for refunds.",
        "Purchasing paid plans is not offered inside the mobile apps; subscriptions are managed on the website.",
      ] },
      { h: "4. AI features", p: [
        "AI suggestions are generated automatically and may be inaccurate or incomplete. Please check them before relying on them. The AI never takes an action without your approval.",
        "AI usage is limited to a monthly allowance that depends on your plan. When your allowance is used up, the rest of the app keeps working. Additional reasonable limits may apply to prevent abuse.",
      ] },
      { h: "5. Acceptable use", p: [
        "You may not use the Service for unlawful purposes, to infringe others' rights, or in ways that disrupt it or attack its security (for example unauthorized access attempts, automated bulk requests, or spam).",
        "Users who create a business account must comply with their own legal obligations when handling their customers' personal data.",
      ] },
      { h: "6. Your content", p: [
        "Content you enter into the Service (tasks, notes, appointments, photos, etc.) belongs to you. You give us the right to store and process it so we can provide the Service. How data is processed is described in the Privacy Policy.",
      ] },
      { h: "7. Availability", p: [
        "We work to provide the Service with care, but we do not guarantee it will be uninterrupted or error-free. We may improve, change or discontinue features. For material changes affecting a paid plan we will try to give reasonable notice.",
      ] },
      { h: "8. Limitation of liability", p: [
        "To the extent permitted by law, we are not liable for indirect damages or loss of data or profit arising from use of the Service. Our total liability is limited to the amount you paid for the Service in the 12 months before the event.",
        "These limits do not remove mandatory consumer protection rights in your country of residence.",
      ] },
      { h: "9. Changes and governing law", p: [
        "We may update these terms. We will announce material changes in the app or by email. Continuing to use the Service after an update means you accept the new terms.",
        "These terms are governed by the laws of Türkiye; mandatory consumer rights in your country of residence remain unaffected.",
      ] },
      { h: "10. Contact", p: ["Questions: destek@planmoy.com"] },
    ],
  },
};

const REFUND: Record<"tr" | "en", Doc> = {
  tr: {
    title: "İade Politikası",
    updated: "Son güncelleme: 8 Kasım 2026",
    back: "Geri",
    links: "Diğer belgeler",
    sections: [
      { h: "1. Ödemeyi kim alır?", p: [
        "Planmoy ücretli planlarının ödemeleri, satıcı kuruluş (Merchant of Record) olarak hareket eden Paddle tarafından alınır. Satın alma sözleşmeniz Paddle ile yapılır ve iade talepleri Paddle'ın Alıcı Şartları ve iade süreci kapsamında işlenir.",
      ] },
      { h: "2. 14 günlük süre", p: [
        "Bir ücretli işlemin (ilk satın alma veya yenileme) tamamlanmasından itibaren 14 gün içinde iade talep edebilirsiniz. Bulunduğunuz yere göre yasal cayma hakkınız bu süreyi aşabilir ya da farklı olabilir; yasal haklarınız saklıdır.",
        "Yasal hakkınızın dışında kalan talepler Paddle tarafından olay bazında değerlendirilir; onay garanti edilmez.",
      ] },
      { h: "3. İade nasıl istenir?", p: [
        "Satın alma sırasında e-postanıza gelen Paddle makbuzundaki bağlantıdan veya https://paddle.net adresinden, işlem bilgilerinizle Paddle müşteri destek ekibine ulaşabilirsiniz. Alternatif olarak destek@planmoy.com adresine, satın alma e-postanızla birlikte yazabilirsiniz; talebinizi Paddle'a iletiriz.",
        "Onaylanan iadeler, ödeme yönteminize Paddle tarafından geri yapılır. Sürenin uzunluğu ödeme yöntemine ve bankanıza göre değişir.",
      ] },
      { h: "4. Abonelik iptali", p: [
        "Aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal, sonraki yenileme ücretini engeller; mevcut dönemin sonuna kadar planınız devam eder. İptal tek başına geçmiş dönemler için iade anlamına gelmez; iade için yukarıdaki süreyi izleyin.",
        "İade edilen bir işlemin ardından ilgili plan erişimi sona erer.",
      ] },
      { h: "5. İletişim", p: ["Sorularınız için: destek@planmoy.com"] },
    ],
  },
  en: {
    title: "Refund Policy",
    updated: "Last updated: November 8, 2026",
    back: "Back",
    links: "Other documents",
    sections: [
      { h: "1. Who takes the payment?", p: [
        "Payments for Planmoy paid plans are taken by Paddle, which acts as the Merchant of Record. Your purchase contract is with Paddle, and refund requests are handled under Paddle's Buyer Terms and refund process.",
      ] },
      { h: "2. The 14-day period", p: [
        "You may request a refund within 14 days of a paid transaction (first purchase or renewal) being completed. Depending on where you live, your statutory withdrawal right may be longer or different; your statutory rights remain unaffected.",
        "Requests outside your statutory rights are assessed by Paddle case by case; approval is not guaranteed.",
      ] },
      { h: "3. How to request a refund", p: [
        "Use the link in the Paddle receipt emailed to you at purchase, or go to https://paddle.net and contact Paddle customer support with your transaction details. Alternatively, write to destek@planmoy.com from your purchase email address and we will pass your request to Paddle.",
        "Approved refunds are returned by Paddle to your payment method. How long it takes depends on the payment method and your bank.",
      ] },
      { h: "4. Cancelling a subscription", p: [
        "You can cancel your subscription at any time. Cancelling prevents the next renewal charge and your plan continues until the end of the current period. Cancelling on its own does not refund past periods; to request a refund follow the process above.",
        "After a transaction is refunded, access to the related plan ends.",
      ] },
      { h: "5. Contact", p: ["Questions: destek@planmoy.com"] },
    ],
  },
};

function DocPage({ docs }: { docs: Record<"tr" | "en", Doc> }) {
  const d = docs[getActiveLang() === "tr" ? "tr" : "en"];
  const isTr = getActiveLang() === "tr";
  return (
    <main className="legal-page">
      <header>
        <a className="legal-back" onClick={() => window.history.back()} style={{ cursor: "pointer" }}>
          <ArrowLeft size={14} /> {d.back}
        </a>
      </header>
      <div className="legal-wrap">
        <h1>{d.title}</h1>
        <p className="legal-updated">{d.updated}</p>
        {d.sections.map((s) => (
          <section className="legal-section" key={s.h}>
            <div>
              <h2>{s.h}</h2>
              {s.p.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          </section>
        ))}
        <p className="legal-updated">
          {d.links}: <Link to="/privacy">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link> · <Link to="/terms">{isTr ? "Kullanım Şartları" : "Terms of Service"}</Link> · <Link to="/refund">{isTr ? "İade Politikası" : "Refund Policy"}</Link>
        </p>
      </div>
    </main>
  );
}

export const TermsScreen = () => <DocPage docs={TERMS} />;
export const RefundScreen = () => <DocPage docs={REFUND} />;
