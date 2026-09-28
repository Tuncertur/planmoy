// Planmoy — Şehir rehberi (ÜCRETSİZ içerik).
//
// Bu veri uygulamanın kendi içeriğidir: Google/Places API'ye hiç gitmez, maliyeti sıfırdır,
// ağ olmadan da açılır. Bilinen simge yapılar için kısa, zamansız açıklamalar içerir;
// çalışma saati, fiyat, bilet bilgisi bilerek YOK (bunlar sık değişir) — kullanıcı
// "Haritada aç" bağlantısıyla güncel bilgiye bakar.
//
// Yeni şehir eklemek: CITIES dizisine bir kayıt eklemek yeterli.
import type { Dict } from "./i18n";

export type PlaceKind = "history" | "museum" | "nature" | "view" | "district" | "tour";
export const KIND_LABEL: Record<PlaceKind, Dict> = {
  history: { tr: "Tarihî yer", en: "Historic site" },
  museum: { tr: "Müze / saray", en: "Museum / palace" },
  nature: { tr: "Doğa", en: "Nature" },
  view: { tr: "Manzara", en: "Viewpoint" },
  district: { tr: "Semt / çarşı", en: "District / market" },
  tour: { tr: "Tur / deneyim", en: "Tour / experience" },
};

export type GuidePlace = { name: Dict; query: string; kind: PlaceKind; desc: Dict };
export type GuideCity = {
  id: string;
  name: Dict;
  country: Dict;
  lat: number;
  lng: number;
  /** Eşleştirme için normalize (küçük harf, aksansız) TEK kelimelik takma adlar */
  aliases: string[];
  /** Google Maps aramasında şehri belirtmek için (İngilizce) */
  mapsName: string;
  places: GuidePlace[];
};

type Row = [nameTr: string, nameEn: string, kind: PlaceKind, descTr: string, descEn: string];
const mk = (rows: Row[]): GuidePlace[] =>
  rows.map(([tr, en, kind, dtr, den]) => ({ name: { tr, en }, query: en, kind, desc: { tr: dtr, en: den } }));

export const CITIES: GuideCity[] = [
  {
    id: "istanbul", name: { tr: "İstanbul", en: "Istanbul" }, country: { tr: "Türkiye", en: "Türkiye" },
    lat: 41.0082, lng: 28.9784, aliases: ["istanbul"], mapsName: "Istanbul",
    places: mk([
      ["Ayasofya", "Hagia Sophia", "history", "Bizans döneminden kalma, devasa kubbesiyle ünlü tarihî yapı.", "Byzantine-era landmark famed for its vast dome."],
      ["Topkapı Sarayı", "Topkapi Palace", "museum", "Osmanlı padişahlarının yüzyıllarca yönetim merkezi olan saray müzesi.", "Museum palace that was the seat of the Ottoman sultans for centuries."],
      ["Sultanahmet Camii (Mavi Cami)", "Blue Mosque (Sultanahmet)", "history", "İç mekânındaki mavi çinilerle tanınan, altı minareli cami.", "Mosque known for its blue interior tiles and six minarets."],
      ["Yerebatan Sarnıcı", "Basilica Cistern", "history", "Sultanahmet'in altındaki Bizans dönemi yeraltı su deposu.", "Byzantine-era underground water reservoir beneath Sultanahmet."],
      ["Kapalıçarşı", "Grand Bazaar", "district", "Yüzyıllık geçmişi olan, çok sayıda dükkânlı büyük kapalı çarşı.", "A centuries-old covered market with a great many shops."],
      ["Galata Kulesi", "Galata Tower", "view", "Boğaz'ı ve tarihî yarımadayı yüksekten gösteren ortaçağ kulesi.", "Medieval tower with views over the Bosphorus and the old city."],
      ["Boğaz Turu", "Bosphorus Cruise", "tour", "Avrupa ve Asya yakasını denizden görmeni sağlayan tekne gezisi.", "A boat trip that shows the European and Asian shores from the water."],
      ["Dolmabahçe Sarayı", "Dolmabahce Palace", "museum", "Boğaz kıyısında, 19. yüzyılda yapılmış görkemli saray.", "A grand 19th-century palace on the Bosphorus shore."],
      ["Süleymaniye Camii", "Suleymaniye Mosque", "history", "Mimar Sinan'ın eseri, şehrin en büyük camilerinden biri.", "A work of the architect Sinan and one of the city's largest mosques."],
      ["Kadıköy ve Moda", "Kadikoy and Moda", "district", "Asya yakasında çarşısı, kafeleri ve sahil yürüyüşüyle canlı semt.", "A lively Asian-side district with its market, cafés and seaside walk."],
    ]),
  },
  {
    id: "ankara", name: { tr: "Ankara", en: "Ankara" }, country: { tr: "Türkiye", en: "Türkiye" },
    lat: 39.9334, lng: 32.8597, aliases: ["ankara"], mapsName: "Ankara",
    places: mk([
      ["Anıtkabir", "Anitkabir", "history", "Atatürk'ün anıt mezarı ve müzesi.", "The mausoleum and museum of Atatürk."],
      ["Ankara Kalesi ve Hisarparkı", "Ankara Castle", "history", "Dar sokakları ve eski evleriyle şehrin tarihî kale mahallesi.", "The historic castle quarter with narrow lanes and old houses."],
      ["Anadolu Medeniyetleri Müzesi", "Museum of Anatolian Civilizations", "museum", "Anadolu'nun Hitit ve daha eski dönemlerinden eserler sergileyen müze.", "Museum of artifacts from Anatolia's Hittite and earlier periods."],
      ["Rahmi M. Koç Müzesi", "Rahmi M. Koc Museum", "museum", "Sanayi, ulaşım ve bilim tarihini anlatan müze.", "A museum of industrial, transport and science history."],
      ["Kuğulu Park", "Kugulu Park", "nature", "Şehir içinde göletiyle bilinen dinlenme parkı.", "A city park known for its pond and calm atmosphere."],
      ["Atakule", "Atakule", "view", "Şehri yukarıdan gösteren kule ve çevresindeki alışveriş alanı.", "A tower with city views and a shopping area around it."],
      ["Gençlik Parkı", "Genclik Park", "nature", "Göl ve yürüyüş yolları olan büyük kent parkı.", "A large city park with a lake and walking paths."],
      ["Hamamönü", "Hamamonu", "district", "Restore edilmiş eski evlerinde kafe ve dükkânların olduğu sokaklar.", "Streets of restored old houses with cafés and shops."],
      ["Augustus Tapınağı", "Temple of Augustus and Rome", "history", "Ulus'ta bulunan Roma dönemi tapınak kalıntısı.", "Roman-era temple remains in Ulus."],
      ["Hacı Bayram-ı Veli Camii", "Haci Bayram Mosque", "history", "Ulus'ta, tapınağın hemen yanındaki tarihî cami.", "A historic mosque in Ulus, right beside the temple."],
    ]),
  },
  {
    id: "izmir", name: { tr: "İzmir", en: "Izmir" }, country: { tr: "Türkiye", en: "Türkiye" },
    lat: 38.4237, lng: 27.1428, aliases: ["izmir"], mapsName: "Izmir",
    places: mk([
      ["Saat Kulesi (Konak)", "Clock Tower (Konak)", "history", "Konak Meydanı'nda şehrin simgesi olan tarihî saat kulesi.", "The historic clock tower on Konak Square, a symbol of the city."],
      ["Kemeraltı Çarşısı", "Kemeralti Bazaar", "district", "Dar sokaklı, tarihî ve canlı çarşı.", "A lively historic bazaar of narrow lanes."],
      ["Kordon", "Kordon Promenade", "view", "Deniz kıyısında yürüyüş ve oturma alanı.", "A seaside promenade for walking and sitting by the water."],
      ["Tarihî Asansör", "Historic Elevator (Karataş)", "view", "Karataş'ta şehri ve körfezi yukarıdan gösteren tarihî asansör.", "A historic elevator in Karataş with views over the city and gulf."],
      ["Efes Antik Kenti", "Ephesus", "history", "Selçuk'ta bulunan, sütunlu caddeleri ve tiyatrosuyla ünlü antik kent.", "An ancient city in Selçuk known for its colonnaded streets and theatre."],
      ["Şirince", "Sirince Village", "district", "Efes yakınında taş evleri ve bağlarıyla tanınan köy.", "A village near Ephesus known for its stone houses and vineyards."],
      ["Alaçatı", "Alacati", "district", "Taş evli sokakları ve rüzgâr sörfüyle ünlü Çeşme yarımadası kasabası.", "A town on the Çeşme peninsula known for stone-house streets and windsurfing."],
      ["Agora Açık Hava Müzesi", "Agora Open Air Museum", "history", "Antik Smyrna'nın Roma dönemi agora kalıntıları.", "Roman-era agora remains of ancient Smyrna."],
      ["Kadifekale", "Kadifekale", "view", "Şehre yukarıdan bakan tarihî kale.", "A historic hilltop fortress overlooking the city."],
      ["İzmir Arkeoloji Müzesi", "Izmir Archaeological Museum", "museum", "Bölgenin antik kentlerinden eserler sergileyen müze.", "Museum of finds from the region's ancient cities."],
    ]),
  },
  {
    id: "antalya", name: { tr: "Antalya", en: "Antalya" }, country: { tr: "Türkiye", en: "Türkiye" },
    lat: 36.8969, lng: 30.7133, aliases: ["antalya"], mapsName: "Antalya",
    places: mk([
      ["Kaleiçi", "Kaleici Old Town", "district", "Eski evleri ve dar sokaklarıyla tarihî şehir merkezi.", "The historic old town of old houses and narrow lanes."],
      ["Hadrian Kapısı (Üçkapılar)", "Hadrian's Gate", "history", "Roma İmparatoru Hadrianus onuruna yapılan anıtsal kapı.", "A monumental gate built in honour of the Roman emperor Hadrian."],
      ["Yivli Minare", "Yivli Minaret", "history", "Kaleiçi'nin simgesi olan Selçuklu dönemi minare.", "A Seljuk-era minaret, symbol of Kaleiçi."],
      ["Kaleiçi Yat Limanı", "Kaleici Marina", "view", "Eski limanda manzara ve tekne turları.", "The old harbour with sea views and boat trips."],
      ["Antalya Müzesi", "Antalya Museum", "museum", "Perge ve çevre antik kentlerinden eserler sergileyen müze.", "Museum of finds from Perge and other ancient cities nearby."],
      ["Konyaaltı Plajı", "Konyaalti Beach", "nature", "Dağ manzaralı uzun çakıl plaj.", "A long pebble beach with mountain views."],
      ["Düden Şelalesi", "Duden Waterfalls", "nature", "Şehir içinde ve denize dökülen şelaleler.", "Waterfalls within the city, one of which drops into the sea."],
      ["Perge Antik Kenti", "Perge", "history", "Antalya'nın doğusunda, sütunlu caddesi ve stadyumuyla antik kent.", "East of Antalya, an ancient city with a colonnaded street and stadium."],
      ["Aspendos", "Aspendos", "history", "Antalya'nın doğusunda, çok iyi korunmuş Roma tiyatrosuyla ünlü antik kent.", "East of Antalya, an ancient city famous for its well-preserved Roman theatre."],
      ["Termessos", "Termessos", "nature", "Kuzeybatıda dağ yamacına kurulu antik kent, doğa yürüyüşü için uygun.", "An ancient city on a mountainside to the north-west, good for a nature walk."],
    ]),
  },
  {
    id: "kapadokya", name: { tr: "Kapadokya", en: "Cappadocia" }, country: { tr: "Türkiye", en: "Türkiye" },
    lat: 38.6431, lng: 34.8287, aliases: ["kapadokya", "cappadocia", "nevsehir", "goreme", "urgup", "uchisar", "avanos"], mapsName: "Cappadocia",
    places: mk([
      ["Göreme Açık Hava Müzesi", "Goreme Open Air Museum", "museum", "Kayaya oyulmuş kiliseler ve fresklerin bulunduğu manastır kompleksi.", "A monastic complex of rock-cut churches and frescoes."],
      ["Balon Turu", "Hot Air Balloon Ride", "tour", "Gün doğumunda peri bacaları üzerinde uçuş (hava koşullarına bağlı).", "A sunrise flight over the fairy chimneys (weather permitting)."],
      ["Uçhisar Kalesi", "Uchisar Castle", "view", "Bölgenin en yüksek noktalarından biri, geniş manzara sunar.", "One of the region's highest points, with wide views."],
      ["Derinkuyu Yeraltı Şehri", "Derinkuyu Underground City", "history", "Kat kat aşağı inen antik yeraltı yerleşimi.", "An ancient multi-level underground settlement."],
      ["Kaymaklı Yeraltı Şehri", "Kaymakli Underground City", "history", "Dar geçitleri ve odalarıyla bir başka yeraltı şehri.", "Another underground city of narrow passages and chambers."],
      ["Paşabağları (Keşişler Vadisi)", "Pasabag (Monks Valley)", "nature", "Başlıklı, mantar biçimli peri bacalarıyla ünlü vadi.", "A valley known for its mushroom-shaped fairy chimneys."],
      ["Zelve Açık Hava Müzesi", "Zelve Open Air Museum", "museum", "Terk edilmiş kaya yerleşimi ve vadileri.", "An abandoned rock settlement and its valleys."],
      ["Güvercinlik Vadisi", "Pigeon Valley", "nature", "Göreme ile Uçhisar arasında yürüyüş yolu.", "A walking route between Göreme and Uçhisar."],
      ["Ürgüp", "Urgup", "district", "Taş konakları ve şarap evleriyle bilinen kasaba.", "A town known for stone mansions and wine houses."],
      ["Avanos", "Avanos", "district", "Kızılırmak kıyısında çömlekçilikle tanınan kasaba.", "A town on the Kızılırmak river known for pottery."],
    ]),
  },
  {
    id: "paris", name: { tr: "Paris", en: "Paris" }, country: { tr: "Fransa", en: "France" },
    lat: 48.8566, lng: 2.3522, aliases: ["paris"], mapsName: "Paris",
    places: mk([
      ["Eyfel Kulesi", "Eiffel Tower", "view", "Şehrin simgesi, Paris'i yukarıdan gösteren demir kule.", "The city's icon, an iron tower with views over Paris."],
      ["Louvre Müzesi", "Louvre Museum", "museum", "Dünyanın en büyük sanat müzelerinden biri.", "One of the world's largest art museums."],
      ["Notre-Dame Katedrali", "Notre-Dame Cathedral", "history", "Sena Nehri kıyısındaki Gotik katedral.", "The Gothic cathedral on the banks of the Seine."],
      ["Sacré-Cœur ve Montmartre", "Sacre-Coeur and Montmartre", "district", "Tepedeki beyaz bazilika ve sanatçı sokaklarıyla bilinen semt.", "A hilltop white basilica and an artists' neighbourhood."],
      ["Arc de Triomphe (Zafer Takı)", "Arc de Triomphe", "history", "Champs-Élysées'nin ucundaki anıtsal takı.", "The monumental arch at the end of the Champs-Élysées."],
      ["Musée d'Orsay", "Musee d'Orsay", "museum", "Eski bir tren garında, izlenimci resim koleksiyonuyla ünlü müze.", "A museum in a former railway station, famed for Impressionist art."],
      ["Sainte-Chapelle", "Sainte-Chapelle", "history", "Renkli vitray pencereleriyle tanınan Gotik şapel.", "A Gothic chapel known for its stained-glass windows."],
      ["Versailles Sarayı", "Palace of Versailles", "museum", "Paris'in dışında, görkemli bahçeleriyle kraliyet sarayı.", "A royal palace outside Paris with grand gardens."],
      ["Luxembourg Bahçesi", "Luxembourg Gardens", "nature", "Şehir içinde yürüyüş ve dinlenme için klasik bahçe.", "A classic city garden for strolling and resting."],
      ["Sena Nehri Gezisi", "Seine River Cruise", "tour", "Nehirden şehrin simge yapılarını gösteren tekne turu.", "A boat trip showing the city's landmarks from the river."],
    ]),
  },
  {
    id: "roma", name: { tr: "Roma", en: "Rome" }, country: { tr: "İtalya", en: "Italy" },
    lat: 41.9028, lng: 12.4964, aliases: ["roma", "rome"], mapsName: "Rome",
    places: mk([
      ["Kolezyum", "Colosseum", "history", "Antik Roma'nın dev amfitiyatrosu.", "The vast amphitheatre of ancient Rome."],
      ["Roma Forumu", "Roman Forum", "history", "Antik Roma'nın kamusal yaşam merkezinin kalıntıları.", "Ruins of the centre of public life in ancient Rome."],
      ["Pantheon", "Pantheon", "history", "Delikli kubbesiyle ünlü, iyi korunmuş antik tapınak.", "A well-preserved ancient temple famous for its domed oculus."],
      ["Trevi Çeşmesi", "Trevi Fountain", "view", "Barok tarzda, şehrin en ünlü çeşmesi.", "The city's most famous fountain, in Baroque style."],
      ["Vatikan Müzeleri ve Sistina Şapeli", "Vatican Museums and Sistine Chapel", "museum", "Devasa sanat koleksiyonu ve Michelangelo'nun tavan freskleri.", "A vast art collection and Michelangelo's ceiling frescoes."],
      ["Aziz Petrus Bazilikası", "St. Peter's Basilica", "history", "Vatikan'da, dünyanın en büyük kiliselerinden biri.", "In the Vatican, one of the world's largest churches."],
      ["İspanyol Merdivenleri", "Spanish Steps", "view", "Şehrin buluşma noktalarından, geniş taş merdiven.", "A wide stone staircase and a popular meeting spot."],
      ["Piazza Navona", "Piazza Navona", "district", "Çeşmeleri ve kafeleriyle canlı barok meydan.", "A lively Baroque square with fountains and cafés."],
      ["Villa Borghese", "Villa Borghese", "nature", "Şehir içinde geniş park ve müze alanı.", "A large park and museum grounds within the city."],
      ["Trastevere", "Trastevere", "district", "Dar sokakları ve restoranlarıyla bilinen tarihî semt.", "A historic neighbourhood known for narrow lanes and restaurants."],
    ]),
  },
  {
    id: "londra", name: { tr: "Londra", en: "London" }, country: { tr: "Birleşik Krallık", en: "United Kingdom" },
    lat: 51.5074, lng: -0.1278, aliases: ["londra", "london"], mapsName: "London",
    places: mk([
      ["Big Ben ve Parlamento", "Big Ben and Houses of Parliament", "history", "Thames kıyısında şehrin en tanınan simgelerinden biri.", "One of the city's best-known icons on the Thames."],
      ["Tower of London", "Tower of London", "history", "Thames kıyısında, uzun geçmişi olan kale.", "A fortress with a long history on the Thames."],
      ["Tower Bridge", "Tower Bridge", "view", "Thames üzerindeki ikonik açılır köprü.", "The iconic bascule bridge over the Thames."],
      ["British Museum", "British Museum", "museum", "Dünya tarihinden geniş bir koleksiyona sahip müze.", "A museum with a vast collection from world history."],
      ["Buckingham Sarayı", "Buckingham Palace", "history", "İngiliz kraliyet ailesinin Londra'daki resmî konutu.", "The London residence of the British royal family."],
      ["Westminster Abbey", "Westminster Abbey", "history", "Taç giyme törenlerinin yapıldığı Gotik kilise.", "A Gothic church where coronations take place."],
      ["London Eye", "London Eye", "view", "Thames kıyısında Londra'yı yukarıdan gösteren dönme dolap.", "A giant observation wheel on the Thames."],
      ["National Gallery", "National Gallery", "museum", "Trafalgar Meydanı'nda geniş bir resim koleksiyonu.", "A large painting collection on Trafalgar Square."],
      ["Hyde Park", "Hyde Park", "nature", "Şehrin merkezinde geniş, yürüyüşe uygun park.", "A large park in the middle of the city, good for walks."],
      ["Camden Market", "Camden Market", "district", "Yemek tezgâhları ve dükkânlarıyla canlı pazar.", "A busy market of food stalls and shops."],
    ]),
  },
  {
    id: "barselona", name: { tr: "Barselona", en: "Barcelona" }, country: { tr: "İspanya", en: "Spain" },
    lat: 41.3874, lng: 2.1686, aliases: ["barselona", "barcelona"], mapsName: "Barcelona",
    places: mk([
      ["Sagrada Família", "Sagrada Familia", "history", "Gaudí'nin uzun yıllardır yapımı süren ünlü bazilikası.", "Gaudí's famous basilica, long under construction."],
      ["Park Güell", "Park Guell", "nature", "Gaudí'nin renkli mozaikli tepe parkı.", "Gaudí's hilltop park with colourful mosaics."],
      ["Casa Batlló", "Casa Batllo", "history", "Gaudí'nin tasarladığı, dalgalı cepheli bina.", "A Gaudí-designed building with a rippling façade."],
      ["Casa Milà (La Pedrera)", "Casa Mila (La Pedrera)", "history", "Gaudí'nin taş gibi görünen dalgalı yapısı.", "Gaudí's wavy, stone-like building."],
      ["La Rambla", "La Rambla", "district", "Şehir merkezinde uzun yaya bulvarı.", "A long pedestrian boulevard in the city centre."],
      ["Gotik Mahalle (Barri Gòtic)", "Gothic Quarter (Barri Gotic)", "district", "Ortaçağ sokakları ve meydanlarıyla eski şehir.", "The old town of medieval streets and squares."],
      ["La Boqueria Pazarı", "La Boqueria Market", "district", "Yiyecek tezgâhlarıyla dolu ünlü kapalı pazar.", "A famous covered market full of food stalls."],
      ["Barceloneta Plajı", "Barceloneta Beach", "nature", "Şehir merkezine yakın kumsal.", "A beach close to the city centre."],
      ["Montjuïc", "Montjuic", "view", "Şehri ve limanı yukarıdan gösteren tepe.", "A hill with views over the city and the port."],
      ["Picasso Müzesi", "Picasso Museum", "museum", "Picasso'nun erken dönem eserlerine odaklanan müze.", "A museum focused on Picasso's early works."],
    ]),
  },
  {
    id: "amsterdam", name: { tr: "Amsterdam", en: "Amsterdam" }, country: { tr: "Hollanda", en: "Netherlands" },
    lat: 52.3676, lng: 4.9041, aliases: ["amsterdam"], mapsName: "Amsterdam",
    places: mk([
      ["Rijksmuseum", "Rijksmuseum", "museum", "Hollanda sanat ve tarihinin ulusal müzesi.", "The national museum of Dutch art and history."],
      ["Van Gogh Müzesi", "Van Gogh Museum", "museum", "Van Gogh'un dünyadaki en geniş eser koleksiyonlarından birine sahip müze.", "A museum with one of the largest collections of Van Gogh's work."],
      ["Anne Frank Evi", "Anne Frank House", "history", "İkinci Dünya Savaşı sırasında Anne Frank ailesinin saklandığı ev müzesi.", "The house museum where Anne Frank's family hid during the Second World War."],
      ["Vondelpark", "Vondelpark", "nature", "Şehir merkezine yakın, yürüyüş ve bisiklet için geniş park.", "A large park near the centre for walking and cycling."],
      ["Kanal Turu", "Canal Cruise", "tour", "Kanallardan şehrin tarihî evlerini gösteren tekne turu.", "A boat trip showing the city's historic houses from the canals."],
      ["Dam Meydanı", "Dam Square", "district", "Şehrin tarihî merkez meydanı.", "The historic central square of the city."],
      ["Jordaan", "Jordaan", "district", "Dar kanalları, küçük dükkânları ve kafeleriyle şirin semt.", "A charming district of narrow canals, small shops and cafés."],
      ["Albert Cuyp Pazarı", "Albert Cuyp Market", "district", "Yiyecek ve çeşitli ürün tezgâhlarıyla bilinen açık hava pazarı.", "An open-air market known for food and general stalls."],
      ["Bloemenmarkt (Çiçek Pazarı)", "Bloemenmarkt (Flower Market)", "district", "Kanal üzerinde yüzen çiçek ve lale pazarı.", "A floating flower and tulip market on the canal."],
      ["Begijnhof", "Begijnhof", "history", "Şehrin ortasında sakin, tarihî bir avlu.", "A quiet historic courtyard in the middle of the city."],
    ]),
  },
];

/** Türkçe/aksanlı metni küçük harfli, aksansız kelimelere böler (eşleştirme için). */
function tokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "Kadıköy, İstanbul, Türkiye" gibi bir adres metninden rehberdeki şehri bulur. */
export function findCityByText(text: string): GuideCity | null {
  const t = new Set(tokens(text));
  return CITIES.find((c) => c.aliases.some((a) => t.has(a))) ?? null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** GPS koordinatına en yakın rehber şehri döndürür (maxKm içindeyse). */
export function nearestCity(lat: number, lng: number, maxKm = 60): GuideCity | null {
  let best: GuideCity | null = null;
  let bestKm = Infinity;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

/** Google Haritalar arama bağlantısı — resmî URL şeması, API çağrısı DEĞİL (ücretsiz). */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
