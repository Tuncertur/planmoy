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

## Paddle (sandbox varsayımı)
- Price ID'ler alındı (Personal/Solo/Studio); Supabase secret'ları girildi: PADDLE_ENVIRONMENT=sandbox, PADDLE_PRICE_PERSONAL/SOLO/STUDIO.
- EKSİK: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET.
- DİKKAT: codemagic.yaml iOS build'ine live client token + production yazıyor; sandbox testiyle uyuşmaz (mobil aşamada ayrılacak).

## Engeller
1. Paddle API key + webhook secret (kullanıcı).
2. planmoy-ops özel deposu + SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, BACKUP_PASSWORD (kullanıcı).
3. K1 mobil ödeme kararı, F-07 onayı (kullanıcı).
4. Push / migration / deploy için ayrı açık onay (kullanıcı).

Sürüm: 2026-10-13 v1
