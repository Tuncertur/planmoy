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
| 8 | Prod yedek + rollback | Yedek + geri yükleme testi PASS (14 Eki 2026, planmoy-ops run 38574123391: 29 public tablo + auth.users 69/identities 2 sayıları eşit; şifreli artifact 30 gün). Rollback prosedürü hazır, NOT TESTED |
| 9 | Release build + cihaz testleri | NOT TESTED |

## Paddle (UYUMSUZLUK: secret'larda ortam=sandbox ama fiyatlar live; sandbox fiyatları oluşturulunca düzeltilecek)
- Price ID'ler alındı (Personal/Solo/Studio); Supabase secret'ları girildi: PADDLE_ENVIRONMENT=sandbox, PADDLE_PRICE_PERSONAL/SOLO/STUDIO.
- EKSİK: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET. Sandbox hesabı açıldı, 3 sandbox fiyatı oluşturuldu (aşağıda).
- DİKKAT: codemagic.yaml iOS build'ine live client token + production yazıyor; sandbox testiyle uyuşmaz (mobil aşamada ayrılacak).

## Paddle Price ID kaydı (gizli değil; HANGİ ORTAM = DOĞRULANACAK)
- Personal: pri_01m2kcv8rgk9zrzxcn9011tt3r
- Solo: pri_01m2kd4t5r8p85prrsgydfrhyy
- Studio: pri_01m2kdf2a0wq5hm0y3wmk1qb9x
- DOĞRULANDI (kullanıcı, 13 Eki): Planmoy Personal/Solo/Studio ürünleri LIVE panelde (vendors.paddle.com) var; ID eşleşmesi henüz tek tek teyit edilmedi. Sandbox'ta karşılığı yok. Supabase'e PADDLE_ENVIRONMENT=sandbox yazıldı; ortam eşleşmezse düzeltilecek. Bu ID'ler SİLİNMEZ (live'a geçişte kullanılabilir).

## Paddle SANDBOX Price ID'leri (13 Eki, kullanıcı oluşturdu; gizli değil)
- Personal 2.99: pri_01m4trrma3ysk7fnq3zys6jx8g
- Solo 4.99: pri_01m4trxnpmm3fpb8nczg96nc2b
- Studio 12.99: pri_01m4tsst3cjd8vnstn3qe4jprm
- Supabase PADDLE_PRICE_* bu sandbox ID'leriyle güncellenecek (komut kullanıcıya verildi; uygulandı mı = teyit bekliyor).
- Live ID'ler (yukarıda) canlıya geçişte kullanılır; Personal live ID 1.99'dur, 2.99 için yeni live fiyat açılacak.

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

## Canlı durum (14 Eki 2026, salt okuma raporu)
- Supabase Planmoy: PostgreSQL 17.6. Proje free planda duraklamıştı (kullanıcı uyandırdı); canlıya çıkışta Pro önerilir (kullanıcı kararı).
- schema_migrations BOŞ: migration'lar CLI ile uygulanmamış; 0023 tablosu (processed_webhook_events) canlıda YOK => 0021-0026 uygulanmamış sayılır.
- Edge Functions canlıda: discover, ai-suggest, sports-fixtures, check-artist-concerts, delete-account, get-shared-event, get-shared-profile, paddle-webhook (v11, 19 Eyl), places-autocomplete. EKSİK: create-checkout, get-public-booking-info.
- Gerçek veri var: ai_usage_log 536, place_photos_cache 257, user_preferences 11, subscriptions 1, auth.users 69.
- Paddle sandbox: 5 secret yazıldı (webhook secret 14 Eki); sandbox uçtan uca test NOT TESTED (deploy onayı bekliyor).

Sürüm: 2026-10-14 v2

## PADDLE LIVE FİYATLAR (22 Eki 2026, kullanıcı doğruladı; fiyat kimlikleri gizli değildir)
- Personal $2.99/ay: pri_01m5h6xrat23s761n7kaenf5m6
- Solo $4.99/ay: pri_01m2kd4t5r8p85prrsgydfrhyy
- Studio $12.99/ay: pri_01m2kdf2a0wq5hm0y3wmk1qb9x
- EMEKLİ (satışa kapalı, ARŞİVLENECEK, silinmeyecek): Personal $1.99 pri_01m2kcv8rgk9zrzxcn9011tt3r. Kod bu kimliği yeni satın almada kullanmaz; bu fiyattaki mevcut aboneler Personal olarak tanınır, değiştirilmez.
- Canlıya geçişte Supabase secret'ları (ONAYLI, tek seferde): PADDLE_ENVIRONMENT=production, PADDLE_PRICE_PERSONAL/SOLO/STUDIO=yukarıdaki üçü, PADDLE_API_KEY (canlı), PADDLE_WEBHOOK_SECRET (canlı hedef). Sandbox için ayrı proje/izin listesi kararı açık.
- İstemci: web yayını canlı client token (live_) ile; ortam token önekinden türetilir, sunucu ortamı ile uyuşmazsa checkout AÇILMAZ.
- Mağaza uygulamalarında (iOS/Android) satın alma akışı kapalı (Apple IAP / Play Billing kararı çözülene kadar).
