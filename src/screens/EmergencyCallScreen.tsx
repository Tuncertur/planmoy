import { useEffect, useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

type Contact = { id: string; label: string; phone: string };

export function EmergencyCallScreen({ userId }: { userId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");

  async function load() {
    const { data } = await supabase.from("emergency_contacts").select("id, label, phone").eq("user_id", userId).order("created_at");
    setContacts(data ?? []);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !phone.trim()) return;
    await supabase.from("emergency_contacts").insert({ user_id: userId, label: label.trim(), phone: phone.trim() });
    setLabel("");
    setPhone("");
    load();
  }

  async function removeContact(id: string) {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({ tr: "Acil bir durumda tek dokunuşla ara. 112, Türkiye'nin genel acil çağrı hattıdır.", en: "Call with one tap in an emergency." })}
      </p>

      <a href="tel:112" className="orbit-card p-4" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", border: "2px solid #e5484d" }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, background: "#e5484d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Phone size={22} />
        </span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16, color: "#c92a2a" }}>112</p>
          <p style={{ fontSize: 12, color: "var(--color-mist-500)" }}>{tt({ tr: "Genel Acil Çağrı Merkezi", en: "General Emergency Line" })}</p>
        </div>
      </a>

      {contacts.map((c) => (
        <a key={c.id} href={`tel:${c.phone}`} className="orbit-card p-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, background: "#5eead4", color: "#0f3d38", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Phone size={18} />
            </span>
            <div>
              <p style={{ fontWeight: 700 }}>{c.label}</p>
              <p style={{ fontSize: 12, color: "var(--color-mist-500)" }}>{c.phone}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              removeContact(c.id);
            }}
            className="danger-button"
            style={{ padding: "6px 10px" }}
          >
            <Trash2 size={13} />
          </button>
        </a>
      ))}

      <form onSubmit={addContact} className="stacked-form orbit-card p-4" style={{ maxWidth: 420 }}>
        <label>
          {tt({ tr: "Kişi (örn. Annem, Doktorum)", en: "Contact" })}
          <input required value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Telefon numarası", en: "Phone number" })}
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5xx xxx xx xx" />
        </label>
        <button className="primary-button">
          <Plus size={15} /> {tt({ tr: "Kısayol ekle", en: "Add shortcut" })}
        </button>
      </form>
    </div>
  );
}
