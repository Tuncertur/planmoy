-- DÜZELTME (2. QA denetimi, F-13 — düşük risk, iyileştirme):
-- "for all" politikası istemcinin kendi notifications satırlarını INSERT
-- etmesine de izin veriyordu (muhtemelen sadece sunucunun/service_role'ün
-- yazması amaçlanmıştı — bildirimler sunucu tarafında üretilen olaylardır).
-- Zararı kendi verisiyle sınırlıydı ama prensip olarak istemci sahte bir
-- bildirim başlığı üretememeli; artık istemci sadece okuyabilir ve
-- "read" alanını güncelleyebilir (bildirimi okundu işaretlemek için).

drop policy if exists "owner manages own notifications" on notifications;

drop policy if exists "owner reads own notifications" on notifications;
create policy "owner reads own notifications" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "owner marks own notifications read" on notifications;
create policy "owner marks own notifications read" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INSERT/DELETE için istemciye politika yok; sadece service_role (Edge
-- Function'lar) bildirim oluşturabilir/silebilir.
