import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

type Notification = { id: string; title: string; created_at: string; read: boolean };

export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("id, title, created_at, read")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(
        ({ data }) => setItems(data ?? []),
        () => {}
      );
  }, [userId]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="location-badge-trigger"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, position: "relative" }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: "#e5484d" }} />
        )}
      </button>
      {open && (
        <div className="theme-menu" style={{ position: "absolute", top: 44, right: 0, minWidth: 260, zIndex: 100 }}>
          <div className="theme-menu-head">
            <b>{tt({ tr: "Bildirimler", en: "Notifications" })}</b>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {items.length === 0 ? (
              <p style={{ padding: 14, fontSize: 12, color: "var(--color-mist-500)" }}>
                {tt({ tr: "Henüz bildirim yok.", en: "No notifications yet." })}
              </p>
            ) : (
              items.map((n) => (
                <div key={n.id} style={{ padding: "10px 14px", borderBottom: "1px solid #eee", fontSize: 12, fontWeight: n.read ? 500 : 800 }}>
                  {n.title}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
