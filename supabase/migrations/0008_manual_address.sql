-- GPS bazı ülkelerde güvenilir çalışmıyor — bu yüzden Planmoy'daki TÜM
-- konum bazlı özellikler (Keşfet, İlgi Alanlarım, Tatil Planlama) önce
-- GPS'i dener, yoksa/başarısız olursa buradaki elle girilmiş adrese döner.

alter table user_preferences add column if not exists manual_address text;
