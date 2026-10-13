# PLANMOY — ROADMAP-STATUS

Güncel yerel commit: ca3b42f (+ bu dosya). Hiçbir şey GitHub'a push edilmedi, canlı Supabase'e migration uygulanmadı, canlı Paddle değişmedi.

## Yayın kontrol listesi (0/9 doğrulandı)
| # | Kriter | Durum |
|---|---|---|
| 1 | Web'de gerçek sandbox ödemesi | NOT TESTED (Paddle API key + webhook secret bekleniyor) |
| 2 | Abonelik↔kullanıcı eşleşmesi güvenli | Yerel PASS (kod+tip); sandbox NOT TESTED |
| 3 | AI maliyet/kota | Yerel PASS (F-02, F-05 eşzamanlılık testi); canlı NOT TESTED |
| 4 | Gerçek Supabase'te rezervasyon | NOT TESTED |
| 5 | Şifre sıfırlama e-postası | NOT TESTED |
| 6 | Eski mobil sürümler için geçiş | Plan var (0025 en son); NOT TESTED |
| 7 | Android/iOS ödeme kuralları | KARAR BEKLİYOR (K1); kodda mobil IAP yok |
| 8 | Prod yedek + rollback | Workflow hazır, NOT TESTED |
| 9 | Release build + cihaz testleri | NOT TESTED |

## Paddle (UYUMSUZLUK: secret'larda ortam=sandbox ama fiyatlar live; sandbox fiyatları oluşturulunca düzeltilecek)
- Price ID'ler alındı (Personal/Solo/Studio); Supabase secret'ları girildi: PADDLE_ENVIRONMENT=sandbox, PADDLE_PRICE_PERSONAL/SOLO/STUDIO.
- EKSİK: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET.
- DİKKAT: codemagic.yaml iOS build'ine live client token + production yazıyor; sandbox testiyle uyuşmaz (mobil aşamada ayrılacak).

## Paddle Price ID kaydı (gizli değil; HANGİ ORTAM = DOĞRULANACAK)
- Personal: pri_01m2kcv8rgk9zrzxcn9011tt3r
- Solo: pri_01m2kd4t5r8p85prrsgydfrhyy
- Studio: pri_01m2kdf2a0wq5hm0y3wmk1qb9x
- DOĞRULANDI (kullanıcı, 13 Eki): Planmoy Personal/Solo/Studio ürünleri LIVE panelde (vendors.paddle.com) var; ID eşleşmesi henüz tek tek teyit edilmedi. Sandbox'ta karşılığı yok. Supabase'e PADDLE_ENVIRONMENT=sandbox yazıldı; ortam eşleşmezse düzeltilecek. Bu ID'ler SİLİNMEZ (live'a geçişte kullanılabilir).

## FİYAT KARARI (13 Eki): Personal 1.99 -> 2.99 USD/ay (Solo 4.99, Studio 12.99 aynı)
- [x] Kod: src/screens/PricingScreen.tsx "$2.99" (yerel commit, push yok)
- [ ] Paddle SANDBOX: Personal fiyatı 2.99 olarak oluşturulacak (kullanıcı)
- [ ] Paddle LIVE (canlıya geçerken): yeni 2.99 fiyatı aç, eski 1.99 fiyatını ARŞİVLE (silme), yeni pri_ ID'yi PADDLE_PRICE_PERSONAL'a yaz (kullanıcı + Claude)
- [ ] Apple/Google abonelik ürünleri fiyat 2.99'a göre açılacak (ID'ler silinmez/yeniden kullanılamaz; önce fiyat kesin)
- [ ] Web sitesi / mağaza metinleri / ekran görüntülerinde 1.99 geçen yer var mı kontrol et
- NOT: yukarıdaki live Personal ID (pri_01m2kcv8…) 1.99'dur; 2.99 için KULLANILMAYACAK.

## Engeller
1. Paddle API key + webhook secret (kullanıcı).
2. planmoy-ops özel deposu + SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, BACKUP_PASSWORD (kullanıcı).
3. K1 mobil ödeme kararı, F-07 onayı (kullanıcı).
4. Push / migration / deploy için ayrı açık onay (kullanıcı).

Sürüm: 2026-10-13 v1
