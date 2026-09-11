import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Plus, ShieldAlert, Trash2, UserRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

// Kullanıcının isteğiyle eklendi: kişinin kendi seçtiği kişilere
// gönderebileceği bir tanışma/bağlantı profili. BİLİNÇLİ GÜVENLİK
// KARARI: herkese açık, aranabilir bir "yakınımdakiler" dizini DEĞİL —
// yalnızca kullanıcının paylaştığı link ile görülebilir. 18 yaş altı
// kullanılamaz (yaş kendi beyanına dayanır, Planmoy doğrulamaz).

type Profile = {
  id: string;
  share_token: string;
  nickname: string;
  age: number;
  gender: "kadin" | "erkek";
  plans: string | null;
  places: string | null;
  interests: string[];
  active: boolean;
};

export function ProfileShareScreen({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"kadin" | "erkek" | "">("");
  const [plans, setPlans] = useState("");
  const [places, setPlaces] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [safetyAck, setSafetyAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const { data } = await supabase.from("public_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      setProfile(data);
      setNickname(data.nickname);
      setAge(String(data.age));
      setGender(data.gender);
      setPlans(data.plans ?? "");
      setPlaces(data.places ?? "");
      setInterests(data.interests ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function addInterest() {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests((v) => [...v, interestInput.trim()]);
      setInterestInput("");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const ageNum = Number(age);
    if (!nickname.trim() || !gender || !ageNum) return;
    if (ageNum < 18) {
      setError(tt({ tr: "Bu özellik yalnızca 18 yaş ve üzeri için.", en: "This feature is only for ages 18 and up." }));
      return;
    }
    if (!safetyAck) {
      setError(tt({ tr: "Devam etmek için güvenlik uyarısını onaylamalısın.", en: "You must acknowledge the safety notice to continue." }));
      return;
    }
    setBusy(true);
    const payload = { user_id: userId, nickname, age: ageNum, gender, plans: plans || null, places: places || null, interests, active: true };
    const { data, error: saveError } = profile
      ? await supabase.from("public_profiles").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", profile.id).select().single()
      : await supabase.from("public_profiles").insert(payload).select().single();
    setBusy(false);
    if (saveError) {
      setError(tt({ tr: "Kaydedilemedi, tekrar dene.", en: "Couldn't save, try again." }));
      return;
    }
    setProfile(data);
  }

  async function deactivate() {
    if (!profile) return;
    await supabase.from("public_profiles").update({ active: false }).eq("id", profile.id);
    setProfile({ ...profile, active: false });
  }

  async function copyLink() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.share_token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // yoksay
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Kısa bir tanışma profili oluştur, sadece seçtiğin kişilere gönderebileceğin özel bir link al. Bu profil aranabilir/herkese açık bir liste değildir — yalnızca linki elinde olan görebilir.",
          en: "Create a short intro profile and get a private link you can send only to people you choose. This isn't a public searchable directory — only someone with the link can view it.",
        })}
      </p>

      <div className="orbit-card flex items-start gap-3 p-4">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
        <div className="text-xs leading-relaxed text-[var(--color-mist-300)]">
          <p className="font-medium text-[var(--color-mist-100)]">{tt({ tr: "Güvenlik uyarısı", en: "Safety notice" })}</p>
          <p className="mt-1">
            {tt({
              tr: "Bu özellik yalnızca 18 yaş ve üzeri içindir. Tam adresini paylaşma; ilk buluşmaları herkese açık, kalabalık bir yerde yap; nereye gittiğini güvendiğin birine söyle. Planmoy kimlik veya yaş doğrulaması yapmaz.",
              en: "This feature is for ages 18+ only. Don't share your exact address; meet for the first time in a public, busy place; tell someone you trust where you're going. Planmoy does not verify identity or age.",
            })}
          </p>
        </div>
      </div>

      {!profile || !profile.active ? (
        <form onSubmit={save} className="wardrobe-form orbit-card p-4" style={{ maxWidth: 460 }}>
          <label>
            {tt({ tr: "Takma ad (gerçek adın olmak zorunda değil)", en: "Nickname (doesn't have to be your real name)" })}
            <input required value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              {tt({ tr: "Yaş", en: "Age" })}
              <input required type="number" min={18} value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label>
              {tt({ tr: "Cinsiyet", en: "Gender" })}
              <select required value={gender} onChange={(e) => setGender(e.target.value as "kadin" | "erkek")}>
                <option value="">—</option>
                <option value="kadin">{tt({ tr: "Kadın", en: "Woman" })}</option>
                <option value="erkek">{tt({ tr: "Erkek", en: "Man" })}</option>
              </select>
            </label>
          </div>
          <label>
            {tt({ tr: "Ne yapmayı planlıyorsun?", en: "What are you planning to do?" })}
            <textarea value={plans} onChange={(e) => setPlans(e.target.value)} placeholder={tt({ tr: "Örn. hafta sonu kahve içip sohbet etmek", en: "e.g. grabbing coffee this weekend" })} />
          </label>
          <label>
            {tt({ tr: "Nerelere gideceksin?", en: "Where will you go?" })}
            <input value={places} onChange={(e) => setPlaces(e.target.value)} placeholder={tt({ tr: "Örn. Kadıköy sahili", en: "e.g. downtown cafes" })} />
          </label>
          <label>
            {tt({ tr: "İlgi alanları (elle ekle)", en: "Interests (add manually)" })}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={interestInput} onChange={(e) => setInterestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())} />
              <button type="button" onClick={addInterest} className="secondary-button" style={{ width: "auto", padding: "0 14px" }}>
                <Plus size={15} />
              </button>
            </div>
          </label>
          {interests.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {interests.map((i) => (
                <span key={i} className="orbit-card" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  {i}
                  <button type="button" onClick={() => setInterests((v) => v.filter((x) => x !== i))} aria-label={`${i} sil`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11 }}>
            <input type="checkbox" checked={safetyAck} onChange={(e) => setSafetyAck(e.target.checked)} style={{ marginTop: 2 }} />
            <span>{tt({ tr: "18 yaş ve üzerindeyim, güvenlik uyarısını okudum ve kabul ediyorum.", en: "I am 18 or older and I have read and accept the safety notice." })}</span>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" disabled={busy}>
            <UserRound size={16} /> {busy ? tt({ tr: "Kaydediliyor…", en: "Saving…" }) : tt({ tr: "Profili oluştur / güncelle", en: "Create / update profile" })}
          </button>
        </form>
      ) : (
        <div className="orbit-card p-4" style={{ maxWidth: 460 }}>
          <p className="font-medium">{profile.nickname}</p>
          <p className="text-xs text-[var(--color-mist-500)]">
            {profile.age} · {profile.gender === "kadin" ? tt({ tr: "Kadın", en: "Woman" }) : tt({ tr: "Erkek", en: "Man" })}
          </p>
          {profile.plans && <p className="mt-2 text-sm">{profile.plans}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={copyLink} className="primary-button" style={{ flex: 1 }}>
              <Copy size={15} /> {copied ? tt({ tr: "Kopyalandı!", en: "Copied!" }) : tt({ tr: "Paylaşım linkini kopyala", en: "Copy share link" })}
            </button>
            <button
              onClick={() => {
                setProfile(null);
              }}
              className="secondary-button"
            >
              {tt({ tr: "Düzenle", en: "Edit" })}
            </button>
          </div>
          <button onClick={deactivate} className="danger-button" style={{ marginTop: 8, width: "100%" }}>
            <Trash2 size={14} /> {tt({ tr: "Profili kapat", en: "Deactivate profile" })}
          </button>
        </div>
      )}

      <div className="orbit-card flex items-start gap-3 p-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-mist-500)]" />
        <p className="text-[10px] text-[var(--color-mist-500)]">
          {tt({
            tr: "Bu bir aranabilir dizin değildir — profilin yalnızca linki paylaştığın kişiler tarafından görülebilir. Linki paylaştığın kişilerden sorumlu olduğunu unutma.",
            en: "This is not a searchable directory — your profile is visible only to people you share the link with. You're responsible for who you share the link with.",
          })}
        </p>
      </div>
    </div>
  );
}
