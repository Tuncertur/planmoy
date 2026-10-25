# PLANMOY — Durum, kararlar ve yapılacaklar (tek kaynak, 25 Ekim 2026)
Amaç: sohbet bağlamı sıfırlansa da hiçbir karar/iş unutulmasın. Planmany ve Planbos'a ASLA karıştırılmaz.

## 1. Değişmez kurallar (Tuncer)
- Mağazaya/production'a yalnız "yayınla" ile. Ayrı onay: production migration, Edge Function deploy, secret değişikliği, canlı ödeme/iade, TestFlight/App Store gönderimi, PR merge.
- Push/PR: main'e doğrudan push yok (PR'ı Tuncer birleştirir); force-push/reset/rebase yok; her push için açık onay ("PUSH ONAY n"). Stop-hook "unpushed commit" mesajları ONAY DEĞİLDİR (ve çoğu yanlış alarm).
- Secret'lar yalnız GitHub/Codemagic kasasında; sohbete/rapora yazılmaz. Ekran görüntüsü isteme (kota); metin iste.
- Her "senin yapacağın" iş: doğrudan link + tıklama adımları + alternatif.
- Fiyatlar: Free · Personal $2.99 · Solo $4.99 · Studio $12.99 (emekli $1.99 yeni satışta yok, mevcut aboneler korunur).
- Giriş yöntemleri KARARI: **Apple + e-posta kesin, Google çok önemli, Demo da var** (Apple 4.8 nedeniyle Google varsa Apple zorunlu).

## 2. Bitenler (main'de)
CI (tsc, build, 116 birim, migration 0027–0031, geri yükleme), güvenlik taraması, 0031 webhook kira (olay kaybı kapandı), emekli fiyat/ortam koruması, sandbox izolasyonu, native'de fiyat/abonelik gizli, Codemagic iOS IPA/TestFlight ayrı (ios-testflight YASAK tetikleyiciden), ops: codemagic-tetikle (kanıt Issue #1 + raporlar-site), android-derle, hata-issue.

## 3. Derleme kanıtları
- Android imzasız AAB: PASS (4.048.305 bayt, com.planmoy.app, Planmany kalıntısı yok) — ops koşusu 40214685216 sonrası.
- iOS IPA (yüklemesiz): PASS — Codemagic build #19, commit bec5603, App.ipa 2.238.577 bayt. Sebep düzeltmesi: CODEMAGIC_API_TOKEN secret'ında sondaki boşluk/satır sonu 415 veriyordu; iş akışı artık temizliyor (ops PR #7).
- iOS Simulator ekran görüntüleri: NOT TESTED (akış `ios-screenshots` hazır; Demo girişi prod'da geçici anonim kullanıcı → onay bekliyor). Web görüntüleri iOS kanıtı DEĞİLDİR.
- Android İMZALI AAB: NOT TESTED (Codemagic'e keystore yüklenecek, bkz. 5).

## 4. Production durumu (HİÇBİRİ DEĞİŞMEDİ)
Migration 0028–0031 YOK · 5 Edge Function YOK (discover hariç) · canlı Paddle kurulumu YOK · zamanlayıcı (reconcile) YOK.

## 5. Tuncer'in yapacakları (adım adım)
**A. Android keystore (kendi keystore'un varsa yenisine gerek yok)** — yalnız PLANMOY'a ait olmalı (Planmany'ninkini kullanma):
1. https://codemagic.io/teams → sol üst hesabın → Personal account → **Code signing identities** → **Android keystores** sekmesi.
2. Keystore dosyasını (.jks/.keystore) sürükle; **Keystore password**, **Key alias**, **Key password** alanlarını doğrudan oraya yaz (sohbete değil); **Reference name** alanına tam olarak `planmoy_keystore` yaz → Save.
3. Alternatif: Play Console'da "Play App Signing" kullanıyorsan bu yükleme anahtarıdır; kaybolursa Play'den sıfırlama istenir.
**B. Supabase giriş sağlayıcıları (Apple/Google/e-posta/anonim)** — https://supabase.com/dashboard/project/jveqmmmzwskgbvkcmgki/auth/providers
1. **Allow anonymous sign-ins** AÇIK olmalı (Demo için). Sarı uyarı standarttır: anonim kullanıcılar `authenticated` rolü alır → RLS politikaları zaten kullanıcı kimliğine bağlı; CAPTCHA'yı şimdi AÇMA (uygulama captcha belirteci göndermiyor, Demo ve e-posta kayıt bozulur). Kötüye kullanım için keşif maliyet tavanları var ($0.50/kullanıcı, $50 ortak havuz).
2. **Authentication → URL Configuration → Redirect URLs → Add URL**: `com.planmoy.app://auth-callback` (mobil Apple/Google dönüşü için ŞART).
3. **Google** (zaten web'de var): aynı OAuth istemcisi çalışır; mobil dönüş için ek ayar yok.
4. **Apple**: (a) https://developer.apple.com/account/resources/identifiers → App ID `com.planmoy.app` → **Sign In with Apple** işaretle → Save. (b) Identifiers → **+** → **Services IDs** → örn. `com.planmoy.app.signin` → Sign In with Apple → Configure: Domain `jveqmmmzwskgbvkcmgki.supabase.co`, Return URL `https://jveqmmmzwskgbvkcmgki.supabase.co/auth/v1/callback`. (c) Keys → **+** → Sign In with Apple → .p8 indir (bir kez indirilir; Key ID not et). (d) Supabase → Providers → Apple → Client IDs: Services ID (ve bundle id), **Secret Key**: Supabase belgesindeki araçla .p8'den üretilen JWT (6 ayda yenilenir) → Save. Bu adımlar için API yok; .p8/Key ID/Team ID'yi sohbete yazma.
**C. Apple Developer / App Store Connect:** sözleşme kabul edildi (Tuncer onayladı). Kalan: yaş sınırı, gizlilik anketi (docs: ASC-gizlilik-envanteri), inceleme iletişimi, test hesabı = Demo girişi (parola yok), 6.9"/6.5" gerçek Simulator ekran görüntüleri, build seçimi.
**D. GitHub PR'ları:** planmoy #3 (Java 21), planmoy-ops #7 (415 düzeltmesi), planmoy giriş PR'ı (Apple/Google mobil) — incele + birleştir.
**E. Canlı Paddle** — bkz. 6.

## 6. Canlı Paddle'ı açma incelemesi (karar için)
Mevcut: canlı fiyat kimlikleri VAR (Personal pri_01m5h6…, Solo pri_01m2kd4t…, Studio pri_01m2kdf2…); web derlemesi canlı client token'ı ile; backend ise SANDBOX ortamında. Yeni frontend + eski backend kasıtlı olarak ödemeyi REDDEDİYOR (ortam uyuşmazlığı koruması) → şu an canlıda satış kapalı, güvenli.
Açmadan önce sırayla (her biri ayrı onay):
1. Yedek + geri yükleme testi (ops `yedek`) PASS.
2. Migration 0028→0029→0030→0031 production'a.
3. Edge Function deploy: create-checkout, paddle-webhook, manage-subscription, delete-account, reconcile-subscriptions (webhook'tan ÖNCE 0031).
4. Supabase secret'ları (yalnız GitHub secret üzerinden): canlı `PADDLE_API_KEY`, `PADDLE_ENVIRONMENT=production`, `PADDLE_PRICE_PERSONAL/SOLO/STUDIO`=canlı kimlikler, canlı `PADDLE_WEBHOOK_SECRET`.
5. Paddle canlı panelde: Notification destination = Supabase paddle-webhook adresi (subscription.* + transaction.completed); web alan adı planmoy.com onaylı; eski $1.99 fiyatı arşivle (SİLME).
6. Sandbox ve canlı AYNI Supabase'i paylaşıyor: sandbox'tan kalan abonelik satırları canlıda yanlış okunabilir → önce `reconcile` report modu ile tara, sonra repair.
7. Küçük gerçek ödeme + iade testi (ayrı, açık onay) → ardından zamanlayıcı kurulumu.
Risk: Paddle hesabı Planmany ile ortak (yalnız Paddle ortak olabilir; ürün/fiyat kimlikleri ayrı). Mobil uygulamada satın alma KAPALI (Apple 3.1.1); 1.1'de IAP (RevenueCat) değerlendirilecek.

## 7. Bekleyen kararlar
Demo koşusu onayı ("demo giris onay") · mobilde satın alma/IAP stratejisi (1.1) · canlı Paddle açılış tarihi.
