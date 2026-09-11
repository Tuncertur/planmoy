# Planmoy — Yapılacaklar Listesi (öncelik sırasıyla)

## Ben kendi başıma yapabileceklerim (dış hesap/anahtar gerekmiyor) — TAMAMLANDI

1. ✅ **İşletme — Lokasyon** (işletme profili: ad, sektör, şehir, adres, telefon)
2. ✅ **İşletme — Takvim** (randevu oluşturma/listeleme, gerçek DB, çakışma engeli)
3. ✅ **İşletme — CRM** (müşteri ekleme/listeleme, gerçek DB)
4. ✅ **İşletme — Öneriler** (Gemini ile işletme önerisi — anahtar eklenince
   otomatik canlanacak)
5. ✅ Animasyon bileşenleri: fire-score-band (Akışım'da), assistant-fab
   (sağ altta, tüm oturum boyunca görünür, Gemini'ye bağlı soru-cevap)

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

- ✅ TÜM kişisel modüller (Akışım, Zaman Akışı, Yapılacaklar, StyleSync,
  Keşfet, Spor Akışı, Hobi/Hedefler, Boş Alan, Yapay Zeka, Etkinlikler) ve
  TÜM işletme modülleri (13/13) FireVibe kaynağından birebir taşındı.
  Kişisel tarafta Zaman Akışı gerçek randevu verisiyle, Hobi/Hedefler
  gerçek konum+zaman+ilgi alanı öncelikli AI öneriyle, Etkinlikler gerçek
  DB + paylaşılabilir davet linkiyle çalışıyor.
- Gerçek yayın öncesi gizlilik politikasının avukat incelemesi

## Son taramada bulunan ek eksikler (tamamlanan)

- ✅ Tema değiştirici (5 tema)
- ✅ Kişisel Yapay Zeka Asistanı gerçek hâline yükseltildi (arama, moderasyon, akışa ekle)
- ✅ Spor/Hobi geçiş paneli
- ✅ Hesap Ayarları / Hesap Silme (gerçek silme akışı, Edge Function)
- ✅ Kategori Rehberi sayfası (tam taksonomi)
- ✅ Fiyatlandırma bilgisi bulundu (Free/$1.99/$4.99/$12.99, ödeme bağlı değil)
- ✅ React Router eklendi (mimari eksiklik gerçekten routing yokluğuydu)
- ✅ Etkinlik davet sayfası (kırık linki tamir etti)
- ✅ Herkese açık rezervasyon sayfası (gerçek işletme verisiyle, /book/:slug)

## Hâlâ okunmamış / kurulmamış

- [ ] Randevu detay + güvenli mesajlaşma sayfası (appointments.$id.tsx) — appointment_messages tablosu zaten şemada var, ekran kurulmadı
- [ ] Herkese açık işletme profil sayfası (businesses.$slug.tsx) — düşük öncelik, book sayfası zaten işi görüyor
- [ ] server/integrations.ts, server/workspace.ts, server/bookings.ts detayları henüz okunmadı
- [ ] Fiyatlandırma sayfası (PricingScreen) henüz koda dökülmedi, sadece bulundu
