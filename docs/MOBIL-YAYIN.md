# PLANMOY — Mobil yayın planı (22 Eki 2026) — yalnız Planmoy (com.planmoy.app)

## Mağaza ödeme kuralları (güncel özet; resmî sayfa teyidi gerekir)
- **Apple 3.1.1:** Uygulama içinde açılan dijital içerik/abonelik **Uygulama İçi Satın Alma (IAP)** ile satılır. 3.1.3(b) çok platformlu hizmet: web'de alınan aboneliğe uygulamada erişim verilebilir, ANCAK aynı ürünler uygulamada IAP olarak da sunulmalı. ABD mağazasında (30 Nis 2025 mahkeme kararı) dış satın alma bağlantısı yasak değil; ABD dışında kısıtlar sürüyor; kararlar temyizde, değişebilir. AB (1 Eki 2026) ve Japonya/Brezilya'da ek yollar var, yetkilendirme+komisyon şartlı. (Kaynak: üçüncü taraf özet — Apple'ın resmî sayfası bu oturumda açılamadı: NOT VERIFIED.)
- **Google Play:** dijital abonelik için varsayılan Play Billing; bölgesel dış ödeme/alternatif faturalama programları var (ücret biraz düşer, işlemleri 24 saat içinde bildirme ve uyum şartı). (İkincil kaynak: NOT VERIFIED.)

## Karar seçenekleri (öneri sırasıyla)
1. **1.0'ı ÜCRETSİZ, satın alma yok olarak yayınla (UYGULANDI).** Mağaza uygulamasında fiyat/yükseltme/abonelik ekranı yok; web'den alınan abonelik uygulamada hesapla tanınır **ancak** Apple 3.1.3(b) uyarınca aynı planlar IAP olarak da sunulana kadar uygulama içinde "web'den satın al" yönlendirmesi YAPILMAZ. En düşük red riski, en hızlı yayın.
2. **IAP ekle (1.1):** RevenueCat (Capacitor eklentisi) + App Store Connect/Play Console'da 3 abonelik ürünü (Personal/Solo/Studio), sunucuda RevenueCat webhook → `subscriptions` tablosu (kaynak sütunu: paddle|apple|google). Maliyet: mağaza komisyonu %15–30; fiyat farkı ya da aynı fiyat kararı gerekir. Kod ancak mağaza ürünleri + RevenueCat hesabı hazır olunca yazılır/test edilir (şimdi YAZILMADI: test edilemez).
3. **Yalnız ABD'de web bağlantısı:** storefront kontrolü + dış bağlantı. Temyiz belirsiz → önerilmez.

## Gerçek cihaz test planı (erişilebilen ortamda çalıştırılanlar işaretli)
| Alan | Test | Durum |
|---|---|---|
| Açılış/giriş | Giriş ekranı, Demo girişi, Google girişi | Tarayıcı smoke PASS (giriş ekranı, JS hatası yok); cihaz: NOT TESTED |
| Satın alma gizleme | Native'de /pricing → ana sayfa, fiyat görünmez; web'de görünür | **PASS** (Chromium, Capacitor taklidi) |
| Konum | GPS izni → Oteller/Restoranlar/Keşfet listesi + fotoğraflar | Cihaz: NOT TESTED (iOS izin metni ve Android izinleri eklendi) |
| Fotoğraf | StyleSync kamera/galeri | Cihaz: NOT TESTED (izinler eklendi) |
| Hesap | Hesap silme (Paddle aboneliği iptal edilir), çıkış | Cihaz: NOT TESTED |
| Abonelik (web) | Satın alma, düşürme, iptal | Sandbox: NOT TESTED (onay bekliyor) |
Cihaz testleri: TestFlight (iOS) + Play iç test kanalı (Android) ile kullanıcıda; ortamımda gerçek cihaz yok.
