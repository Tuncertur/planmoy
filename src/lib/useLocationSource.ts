import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Planmoy'daki TÜM konum bazlı özelliklerin (Keşfet, İlgi Alanlarım,
// Tatil Planlama) baktığı TEK yer burası. GPS bazı ülkelerde çalışmadığı
// için (kullanıcının belirttiği sorun) önce GPS denenir, yoksa elle
// girilmiş adrese düşülür — o da yoksa özellik "konum gerekli" der.

export type LocationSource = {
  latitude: number | null;
  longitude: number | null;
  manualAddress: string;
  hasGps: boolean;
  useGps: () => void;
  setManualAddress: (v: string) => void;
  saveManualAddress: () => Promise<void>;
  gpsStatus: "idle" | "locating" | "error";
};

export function useLocationSource(userId: string): LocationSource {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [manualAddress, setManualAddressState] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "error">("idle");

  useEffect(() => {
    supabase
      .from("user_preferences")
      .select("manual_address")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.manual_address) setManualAddressState(data.manual_address);
      });
  }, [userId]);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsStatus("idle");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  }

  async function saveManualAddress() {
    await supabase.from("user_preferences").upsert({ user_id: userId, manual_address: manualAddress, updated_at: new Date().toISOString() });
  }

  return {
    latitude,
    longitude,
    manualAddress,
    hasGps: latitude !== null && longitude !== null,
    useGps,
    setManualAddress: setManualAddressState,
    saveManualAddress,
    gpsStatus,
  };
}
