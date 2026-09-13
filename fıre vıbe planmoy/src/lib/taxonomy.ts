export type TaxonomyGroup = {
  title: string
  items: { name: string; children: string[] }[]
}

export const taxonomy: Record<string, TaxonomyGroup> = {
  'Zaman akışı': {
    title: 'Takvim kategorileri',
    items: [
      { name: 'İş randevuları', children: ['Toplantı', 'Müşteri görüşmesi', 'Sunum', 'Satış', 'Proje teslimi'] },
      { name: 'Kişisel randevular', children: ['Aile yemeği', 'Arkadaş buluşması', 'Alışveriş', 'Özel gün'] },
      { name: 'Sağlık randevuları', children: ['Doktor kontrolü', 'Dişçi', 'Terapi', 'Masaj', 'Spor seansı'] },
      { name: 'Sosyal randevular', children: ['Parti', 'Konser', 'Sergi', 'Tiyatro', 'Festival'] },
      { name: 'Kuaför randevuları', children: ['Saç kesimi', 'Saç boyama', 'Bakım', 'Sakal tıraşı', 'Makyaj'] },
      { name: 'Seyahat randevuları', children: ['Uçak', 'Otel', 'Araç kiralama', 'Tur rezervasyonu'] },
    ],
  },
  Yapılacaklar: {
    title: 'Görev kategorileri',
    items: [
      { name: 'İş görevleri', children: ['Proje teslimi', 'E-posta', 'Rapor hazırlama', 'Sunum', 'Toplantı notları'] },
      { name: 'Ev görevleri', children: ['Temizlik', 'Alışveriş', 'Fatura ödeme', 'Tamirat', 'Bahçe işleri'] },
      { name: 'Kişisel görevler', children: ['Spor', 'Kitap okuma', 'Meditasyon', 'Yeni hobi', 'Günlük tutma'] },
      { name: 'Sosyal görevler', children: ['Arkadaşları ara', 'Plan yap', 'Davetiye gönder', 'Hediye al'] },
      { name: 'Sağlık görevleri', children: ['İlaç iç', 'Doktor kontrolü', 'Diyet takibi', 'Su içmeyi unutma'] },
      { name: 'Yapay zeka önerileri', children: ['Otomatik hatırlatıcılar', 'Akıllı önceliklendirme'] },
    ],
  },
  StyleSync: {
    title: 'Stil kategorileri',
    items: [
      { name: 'Kıyafet türleri', children: ['Üst giyim (tişört, gömlek, kazak)', 'Alt giyim (pantolon, etek, şort)', 'Elbiseler', 'Dış giyim (ceket, mont, hırka)', 'Ayakkabı', 'Aksesuar'] },
      { name: 'Renk kategorileri', children: ['Siyah', 'Beyaz', 'Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Pastel', 'Neon', 'Toprak tonları'] },
      { name: 'Stil kategorileri', children: ['Günlük', 'Sportif', 'Şık', 'Resmi', 'Bohem', 'Klasik', 'Avangart', 'Sokak modası'] },
      { name: 'Mevsimlik', children: ['Yaz kombinleri', 'Kış kombinleri', 'İlkbahar kombinleri', 'Sonbahar kombinleri'] },
      { name: 'Kuaför stilleri', children: ['Kısa saç (pixie, bob)', 'Uzun saç (dalgalı, düz)', 'Sakal stilleri (sakalsız, kısa sakal, uzun sakal)'] },
      { name: 'Özel gün', children: ['Düğün', 'Davet', 'İş görüşmesi', 'Sevgili buluşması'] },
      { name: 'Yapay zeka önerileri', children: ['Bu elbiseyle şu çantayı dene', 'Bu renk tenine çok yakışır'] },
    ],
  },
  Keşfet: {
    title: 'Keşfet kategorileri',
    items: [
      { name: 'Yeme & içme', children: ['Restoran', 'Kafe', 'Bar', 'Fast food', 'Kahve dükkanı', 'Pastane', 'Çay bahçesi'] },
      { name: 'Bakım & wellness', children: ['Manikür', 'Pedikür', 'Masaj', 'Sauna', 'Havuz', 'Hamam', 'Saç kesimi', 'Stilist', 'Berber', 'Kuaför'] },
      { name: 'Gezilecek yerler', children: ['Müzeler', 'Tarihi yerler', 'Parklar', 'Seyir noktaları', 'Turistik yerler'] },
      { name: 'Mutfak tipleri', children: ['Türk mutfağı', 'İtalyan mutfağı', 'Asya mutfağı', 'Fast food', 'Vegan/vejetaryen', 'Deniz ürünleri', 'Dünya mutfağı'] },
      { name: 'Etkinlikler', children: ['Konser', 'Festival', 'Tiyatro', 'Sergi', 'Spor müsabakası', 'Atölye', 'Film gösterimi'] },
      { name: 'Mekan tipleri', children: ['Açık hava', 'Kapalı', 'Lüks', 'Uygun fiyatlı', 'Aile mekanı', 'Arkadaş mekanı', 'Romantik mekan'] },
      { name: 'Konum', children: ['Sahil', 'Şehir merkezi', 'Doğa (orman, dağ)', 'Tarihi yerler', 'Gece hayatı', 'Sanat bölgesi'] },
      { name: 'Özel fırsatlar', children: ['İndirimler', 'Happy hour', 'Erken rezervasyon', 'Grup indirimi', 'Özel menü'] },
      { name: 'Hava durumu', children: ['Güneşli', 'Yağmurlu', 'Karlı', 'Rüzgarlı', 'Sıcak', 'Soğuk'] },
    ],
  },
  'Yapay zeka': {
    title: 'Yapay zeka asistan kategorileri',
    items: [
      { name: 'Zaman önerileri', children: ['Boş zaman değerlendirme', 'Randevu önerileri', 'Hatırlatıcılar', 'Takvim optimizasyonu'] },
      { name: 'Stil önerileri', children: ['Kombin önerileri', 'Kuaför stili', 'Mevsimsel stil', 'Renk uyumu'] },
      { name: 'Sosyal öneriler', children: ['Arkadaş buluşmaları', 'Etkinlik önerileri', 'Gezi planları', 'Grup etkinlikleri'] },
      { name: 'Hedef önerileri', children: ['Haftalık hedef', 'Aylık hedef', 'Alışkanlık takibi', 'Motivasyon mesajları'] },
      { name: 'Karma öneriler', children: ['Randevu + kombin', 'Görev + mekan', 'Takvim + stil'] },
      { name: 'Sürpriz öneriler', children: ['Bugün farklı bir şey yap', 'Kendini ödüllendir'] },
    ],
  },
  'Boş Alan': {
    title: 'Kullanıcı etiketleri',
    items: [
      { name: '#fikir', children: [] }, { name: '#alışveriş', children: [] }, { name: '#hayal', children: [] },
      { name: '#proje', children: [] }, { name: '#tarif', children: [] }, { name: '#anı', children: [] },
      { name: '#okuma', children: [] }, { name: '#seyahat', children: [] }, { name: '#spor', children: [] }, { name: '#müzik', children: [] },
    ],
  },
  'Ruh hali & enerji': {
    title: 'Günlük enerji takibi',
    items: [{ name: 'Ruh hali', children: ['Mutlu', 'Enerjik', 'Yorgun', 'Stresli', 'Üzgün', 'Heyecanlı'] }, { name: 'Öneri türleri', children: ['Hafif görevler', 'Nefes molası', 'Yürüyüş', 'Sosyal aktivite'] }, { name: 'Rapor aralığı', children: ['Günlük', 'Haftalık', 'Aylık'] }],
  },
  'Akıllı bütçe': {
    title: 'Gelir, gider ve hedefler',
    items: [{ name: 'Harcama kategorileri', children: ['Kafe', 'Faturalar', 'Ulaşım', 'Alışveriş', 'Sağlık'] }, { name: 'Bütçe hedefleri', children: ['Aylık limit', 'Tasarruf hedefi', 'Fatura hatırlatıcı'] }, { name: 'Bağlantılar', children: ['Banka entegrasyonu (isteğe bağlı)'] }],
  },
  'Öğrenme & kitap': {
    title: 'Okuma ve gelişim akışları',
    items: [{ name: 'Okuma', children: ['Kitap listesi', 'Sayfa hedefi', 'Okuma notları'] }, { name: 'Öğrenme', children: ['Kurslar', 'Podcast', 'Kişisel gelişim'] }],
  },
  'Sosyal plan': {
    title: 'Arkadaşlarla ortak akış',
    items: [{ name: 'Planlar', children: ['Grup buluşması', 'Ortak takvim', 'Etkinlik daveti'] }, { name: 'İletişim', children: ['Arkadaş listesi', 'Bugün boş olanlar', 'Doğum günü hatırlatıcıları'] }, { name: 'Entegrasyonlar', children: ['WhatsApp (isteğe bağlı)', 'Telegram (isteğe bağlı)'] }],
  },
  'Fire puanı': {
    title: 'Motivasyon ve oyunlaştırma',
    items: [{ name: 'İlerleme', children: ['Fire puanı', 'Seviyeler', 'Rozet vitrini'] }, { name: 'Meydan okumalar', children: ['Günlük meydan okuma', 'Haftalık seri', 'Ödüller'] }],
  },
}
