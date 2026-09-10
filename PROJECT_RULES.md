# Planmoy — Geliştirme Kuralları (Planmany'den Çıkarılan Dersler)

Bu dosya, "Planmany" projesinde gerçek zaman/kota kaybettiren hatalardan
çıkarılan kuralları içerir. Bunlar **sona bırakılmaz**, ilgili faza
girildiği an uygulanır.

## Kod seviyesinde — EN BAŞTAN kurulu

- [x] **i18n:** `src/lib/i18n.ts` — `tt(dict)` fonksiyonu kuruldu.
      Hiçbir zaman `dil === 'tr' ? 'X' : 'Y'` yazılmaz. Her yeni metin
      `{ tr: '...', en: '...' }` Dict nesnesi olarak tanımlanıp `tt()`
      ile okunur. (Planmany'de bu kalıp 160 kez tekrarlanmıştı.)
- [ ] **Maliyet limiti (Faz 4, AI/harici API eklenince):** Her tarife
      için `aylık_limit × api_maliyeti_birim < aylık_abonelik_fiyatı ×
      0.5` formülüyle üst limit — özellik eklenirken aynı gün kurulur,
      sonraya bırakılmaz.
- [ ] **Deneme hakkı sıfırlama açığı (Faz 7, ödeme):** installDate gibi
      alanlar cihaza değil hesaba/sunucuya bağlı olacak; "temiz kurulum"
      ile deneme süresi sıfırlanamayacak.

## Her yeni tablo/Edge Function eklendiğinde (Faz 1'den itibaren, ortada değil sonda)

- RLS satır bazlı VE sütun bazlı kısıtlamayı ayrı ayrı kontrol et
  (RLS varsayılan sadece satır bazlıdır)
- Her Edge Function kimlik doğruluyor mu (`--no-verify-jwt` ile
  deploy edilenler kendi içinde JWT/servis anahtarı kontrolü yapmalı)
- Kullanıcı girdisi HTML'e basılırken escape ediliyor mu (XSS)
- Arama/bildirim/AI çağrısı gibi her uç noktada saatlik/aylık üst limit
  var mı

## Ödeme (Faz 7 — başlamadan ÖNCE karar verilecek, ortasında değil)

- Kullanıcı Türkiye'de, şirketsiz/şahıs — **Stripe'ı hiç denemeden**
  doğrudan **Paddle** (Merchant of Record) ile başla
- Paddle ürün/fiyat oluştururken Custom Data'ya `tier` anahtarı eklenir
  (webhook paket tespiti için)
- Ortam kontrolü HER SEFERİNDE: `vendors.paddle.com` = live,
  `sandbox-vendors.paddle.com` = sandbox
- Uygulama içi satın alma (Google/Apple) vergi mükellefiyeti
  gerektirmez (mağaza kendisi merchant of record'dur), web tarafı
  (Paddle) ayrı değerlendirilir — kesin rakamlarla ilerlerken mali
  müşavire yönlendirilecek

## Mağaza zorunlulukları (Faz 6 başında eklenir, sona bırakılmaz)

- **Satın Alımları Geri Yükle** (Restore Purchases)
- **Uygulama İçi Hesap Silme** — gerçek silme akışı, "destek ile
  iletişime geçin" yeterli değil (Supabase: `auth.admin.deleteUser()`
  cascade ile bağlı veriyi de temizler)
- Üçüncü taraf sosyal giriş (Google vb.) varsa **Sign in with Apple**
  da zorunlu

## Android/Play Console (Faz 6)

- Keystore dosyası + şifreleri (keystore password, key alias, key
  password) ilk imzalamada hemen güvenli bir yere not alınır —
  kaybedilirse "upload key reset" süreci saatler sürer
- `google-services.json` ile Firebase servis hesabı JSON'ı
  karıştırılmasın — isimlerini net belirt, içerik ilk satırını
  doğrulat
- Yeni native Capacitor eklentisi eklendiğinde: `npm install` ve
  `npx cap sync android` MUTLAKA kullanıcının kendi bilgisayarında
  çalıştırılır (AI'ın sandbox'ında değil), her zip çıkarma sonrası
  tekrarlanır
- Gradle JDK uyumsuzluğu çıkarsa Android Studio > Build Tools >
  Gradle'da JDK 21'e sabitlenir
- 30 Eylül 2026 itibarıyla Android Developer Verification zorunlu —
  Play Console > Ayarlar'dan paket adının "Kayıtlı" olduğu
  doğrulanır; yeni hesaplarda 12 test kullanıcısıyla 14 gün kesintisiz
  kapalı test şartı var, yeni AAB yüklemek bu sayacı sıfırlamaz
- Play Console'da %15 hizmet ücreti programına (ilk $1M gelire kadar)
  erken kaydolunur — ücretsiz, doğrudan gelir etkisi var

## Firebase/Google Cloud (Faz 4, push bildirim kurulurken)

- "Key creation is not allowed" hatasında İKİ ayrı politikayı kontrol
  et: `iam.managed.disableServiceAccountKeyCreation` (yeni) VE
  `iam.disableServiceAccountKeyCreation` (Legacy)
- Organization Policies URL'sindeki `project=` parametresinin GERÇEK
  proje ID'siyle (görünen isimle değil) eşleştiğini doğrula

## Windows/Supabase CLI (sırlar için)

- Çok satırlı/özel karakterli sırlar asla doğrudan
  `supabase secrets set KEY=value` ile cmd/PowerShell'e yazılmaz
- Kullanıcıya `.env` dosyası oluşturttur (Not Defteri), sonra
  `supabase secrets set --env-file secrets.env`; işlem bitince
  `del secrets.env` ile hemen sildirilir
- PowerShell script-engelleme hatasında aynı komut **cmd**'de denenir

## Çalışma şekli

- Kota/süre hassasiyeti var — gereksiz onay sorusu sorma, yapılabilecek
  şeyi doğrudan yap; sadece kullanıcının bizzat yapması gereken
  (dış platform tıklaması, kimlik doğrulama) adımları sor
- Komutlar tek satır, kopyala-yapıştıra hazır; hangi klasör/terminal
  (cmd/PowerShell) net belirtilir
- Kritik adımdan (imzalama, sır kaydetme) önce "güvenli yere not alın"
  uyarısı
- "Yayınla" denmeden hiçbir şey canlıya alınmaz

## FireVibe kaynak kodundan çıkarılan gerçek tasarım kararları

Bu proje FireVibe'daki Planmoy'un BİREBİR aynısı olarak taşınıyor —
yeniden tasarlanmıyor. Kaynak kod satır satır okunarak çıkarılan
kararlar:

- Keşfet yarıçapı: Pazartesi–Perşembe 50km, Cuma–Pazar 100km
  (FireVibe'da bu kural yazılmış ama hiç bağlanmamıştı — burada
  gerçekten uygulanıyor, bkz. supabase/functions/discover)
- Boş Alan (notlar): veritabanında (FireVibe'da localStorage'daydı,
  cihaza bağlıydı — burada hesaba bağlı)
- AI sağlayıcı: OpenAI anahtarı henüz yok — StyleSync/Yapay
  zeka/Hobi-hedef önerileri şimdilik "yapılandırılmadı" durumunda
  bekliyor, uydurma öneri üretilmiyor
- StyleSync: FireVibe'da da gardırop fotoğrafları AI'ya GÖRSEL olarak
  gönderilmiyordu — sadece isim/kategori/renk metni. Birebir taşınacak
  (metin tabanlı), gerçek görsel analiz sonradan ayrı bir karar

## Açık kalan işler (bir sonraki oturumda buradan devam)

- [ ] Auth ekranı (telefon/Google/e-posta/demo) koda eklendi, demo/e-posta
      test edilmeye çalışıldı ama "email not confirmed" hatası ile
      uğraşıldı — Supabase'de Confirm email kapatıldı, Anonymous
      Sign-Ins açıldı; SONUÇ DOĞRULANMADI, ilk iş bunu bitirmek
- [ ] Google girişi için Capacitor deep-link (App eklentisi +
      AndroidManifest intent-filter) henüz kurulmadı — buton şu an
      web akışına gidiyor, native geri dönüş çalışmaz
- [ ] Telefon/SMS girişi için Supabase'e Twilio bağlanmadı (Planmany'de
      zaten bir Twilio hesabı var, oradaki deneyim kullanılabilir)
- [ ] Faz 2 (gerçek randevu takvimi, StyleSync, Keşfet ekranları) henüz
      başlamadı — sadece Personal moddaki Yapılacaklar gerçek DB'ye
      bağlı, diğer modüller hâlâ statik kart
- [ ] iOS tarafı hiç denenmedi (Mac/cloud build servisi gerekecek)

