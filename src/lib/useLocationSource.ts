import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Planmoy'daki TÜM konum bazlı özelliklerin TEK kaynağı burası.
// GPS 12 saniyede yanıt vermezse zorla "error"a düşer (bazı
// tarayıcılar/gizli mod hiç geri çağırmayabiliyor). Elle adres kaydı
// ağ isteğini beklemeden hemen yerel olarak da işaretlenir.

export type LocationSource = {
  latitude: number | null;
  longitude: number | null;
  manualAddress: string;
  hasGps: boolean;
  hasManual: boolean;
  activeSource: "manual" | "gps" | "none";
  useGps: () => void;
  setManualAddress: (v: string) => void;
  saveManualAddress: () => Promise<void>;
  clearManualAddress: () => Promise<void>;
  gpsStatus: "idle" | "locating" | "error";
};

let sharedLatitude: number | null = null;
let sharedLongitude: number | null = null;
let sharedManualAddress = "";
let sharedSavedManualAddress = "";
let sharedGpsStatus: "idle" | "locating" | "error" = "idle";
let gpsAutoTried = false;
let gpsTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
let prefsLoadedForUser: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function requestGps() {
  if (gpsTimeoutHandle) clearTimeout(gpsTimeoutHandle);
  if (!navigator.geolocation) {
    sharedGpsStatus = "error";
    notify();
    return;
  }
  sharedGpsStatus = "locating";
  notify();

  gpsTimeoutHandle = setTimeout(() => {
    if (sharedGpsStatus === "locating") {
      sharedGpsStatus = "error";
      notify();
    }
  }, 12000);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (gpsTimeoutHandle) clearTimeout(gpsTimeoutHandle);
      sharedLatitude = pos.coords.latitude;
      sharedLongitude = pos.coords.longitude;
      sharedGpsStatus = "idle";
      notify();
    },
    () => {
      if (gpsTimeoutHandle) clearTimeout(gpsTimeoutHandle);
      sharedGpsStatus = "error";
      notify();
    },
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
  );
}

export function useLocationSource(userId: string): LocationSource {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (prefsLoadedForUser === userId) return;
    prefsLoadedForUser = userId;
    supabase
      .from("user_preferences")
      .select("manual_address")
      .eq("user_id", userId)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.manual_address) {
            sharedManualAddress = data.manual_address;
            sharedSavedManualAddress = data.manual_address;
            notify();
          }
        },
        () => {}
      );
  }, [userId]);

  useEffect(() => {
    if (!gpsAutoTried) {
      gpsAutoTried = true;
      requestGps();
    }
  }, []);

  async function saveManualAddress() {
    const value = sharedManualAddress;
    sharedSavedManualAddress = value;
    notify();
    try {
      await supabase.from("user_preferences").upsert({ user_id: userId, manual_address: value, updated_at: new Date().toISOString() });
    } catch {
      // Yerel durum zaten güncellendi.
    }
  }

  async function clearManualAddress() {
    sharedManualAddress = "";
    sharedSavedManualAddress = "";
    notify();
    try {
      await supabase.from("user_preferences").upsert({ user_id: userId, manual_address: "", updated_at: new Date().toISOString() });
    } catch {
      // yoksay
    }
  }

  const hasGps = sharedLatitude !== null && sharedLongitude !== null;
  const hasManual = sharedSavedManualAddress.trim().length > 0;

  return {
    latitude: sharedLatitude,
    longitude: sharedLongitude,
    manualAddress: sharedManualAddress,
    hasGps,
    hasManual,
    activeSource: hasGps ? "gps" : hasManual ? "manual" : "none",
    useGps: requestGps,
    setManualAddress: (v: string) => {
      sharedManualAddress = v;
      notify();
    },
    saveManualAddress,
    clearManualAddress,
    gpsStatus: sharedGpsStatus,
  };
}
