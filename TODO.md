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

## Bu turda eklenen büyük özellikler

- ✅ Ortak konum kaynağı (`useLocationSource`) — GPS çalışmayan ülkeler
  için elle adres girişi, Keşfet'e entegre edildi
- ✅ Tatil Planlama ekranı (Uçak/Otel Google linkleri + AI gezi önerisi)
- ✅ Sidebar'a 4 Google-link kısayolu: Oteller, Uçaklar, Restoranlar, Konserler
- ✅ Spor'a gerçek maç verisi (TheSportsDB, ücretsiz — ülke filtresi yok,
  bu dürüstçe arayüzde belirtiliyor)

## Not: tutarlılık için yapılacak küçük iş

- [ ] İlgi Alanlarım (SpaceScreen) hâlâ kendi ayrı konum inputunu
  kullanıyor — bir sonraki turda `useLocationSource` ile birleştirilecek
  ki elle adres her yerde aynı şekilde çalışsın

## Bu turda düzeltilenler

- ✅ Konum önceliği düzeltildi: artık ÖNCE elle girilen adrese bakılıyor,
  GPS sadece elle adres yoksa devreye giriyor (GPS'in bazı ülkelerde
  yanlış konum göstermesi sorununa karşı)
- ✅ Tatil Planlama: nereden-nereye + gidiş/dönüş tarihi + ulaşım tercihi
  (uçak/tren/otobüs/araba — araba seçilince dinlenme tesisli yol tarifi
  linki çıkıyor) + İlgi Alanlarım verisiyle kişiselleştirilmiş AI planı

## Netleştirilmesi gereken nokta

"Anket" isteğini İlgi Alanlarım (user_interests) tablosunu kişiselleştirme
sinyali olarak KULLANARAK karşıladım — ayrı, yeni bir "yapay zeka sohbet
anketi" akışı KURMADIM (zaman/kapsam nedeniyle). Tatil Planlama artık
mevcut ilgi alanlarını okuyup öneriye yansıtıyor, boşsa kullanıcıyı
İlgi Alanlarım'ı doldurmaya yönlendiriyor. Eğer gerçekten ayrı, AI'ın
soru sorduğu bir anket akışı istiyorsan (örn. "3 soru soracağım, cevapla")
bunu ayrıca kurarım — şimdilik mevcut veriyi yeniden kullanmak daha hızlı
ve tutarlıydı.

## Sidebar: Oteller/Restoranlar/Gezilecek Yerler (bu turda tamamlandı)

- ✅ 3 ayrı sidebar kategorisi eklendi (Oteller, Restoranlar, Gezilecek Yerler)
- ✅ Discover Edge Function'ı çoklu kategori destekler oldu — üçü TEK
  sorguda (adres+telefon+web sitesi dahil) geliyor, ekonomik
- ✅ Uygulama açılışında bir kez, tatil planı oluşturulunca varış
  noktasına göre tekrar yenileniyor
- ✅ Görseller dahil edilmedi (Google'ın foto API'si ayrı sorgu
  gerektiriyor, "tek sorgu" prensibiyle çelişirdi) — bilinçli karar
- ✅ Yasal sorumluluk notu her ekranın altına eklendi ("Planmoy içerik
  doğruluğundan sorumlu değildir, işletmeyi kendi kaynağından teyit et")
