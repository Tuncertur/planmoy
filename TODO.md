# Planmoy — Yapılacaklar Listesi (öncelik sırasıyla)

## Ben kendi başıma yapabileceklerim (dış hesap/anahtar gerekmiyor) — ŞİMDİ YAPIYORUM

1. **İşletme — Lokasyon** (işletme profili: ad, sektör, şehir, adres, telefon)
2. **İşletme — Takvim** (randevu oluşturma/listeleme, gerçek DB)
3. **İşletme — CRM** (müşteri ekleme/listeleme, gerçek DB)
4. **İşletme — Öneriler** (Gemini ile işletme performansı önerisi — anahtar
   eklenene kadar dürüstçe "yapılandırılmadı" gösterir, ama kod hazır olur)
5. Animasyon bileşenleri: fire-score-band, assistant-fab (CSS zaten hazır,
   sadece bileşenler kuruluyor)

## Senin bir eylemini gerektirenler (ben yapamam, sırayla)

6. **GEMINI_API_KEY** — aldığında `supabase secrets set GEMINI_API_KEY=...`
   ile eklenecek, o an StyleSync + Akışım + işletme önerileri hepsi
   otomatik canlanacak
7. **GOOGLE_MAPS_API_KEY** — Keşfet'in gerçek veri göstermesi için
8. Auth'ta demo/e-posta girişinin gerçekten çalıştığını doğrulama
   (en son "email not confirmed" hatasından sonra hiç test edilmedi)
9. Google girişi için gerçek OAuth kurulumu + Capacitor deep-link
10. Telefon/SMS girişi için Twilio bağlantısı
11. iOS build'i (Mac/cloud build servisi gerekiyor)

## Beklemede / daha sonra karar verilecek

- İşletmenin kalan 9 modülü (Personel, Stok, Raporlar, Pazarlama, Ayarlar,
  Sadakat, Rekabet analizi, Performans, Tedarik, Fiyat) — öncelik
  sırasındaki 4'ü bitince sırada
- Gerçek yayın öncesi gizlilik politikasının avukat incelemesi
