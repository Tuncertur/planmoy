import test from "node:test";
import assert from "node:assert/strict";
import { distanceInMeters, withUserDistance } from "./geo.ts";

test("mesafe: Ürgüp–Nevşehir 12–16 km aralığında, aynı nokta 0", () => {
  const d = distanceInMeters(38.6431, 34.8289, 38.6939, 34.6857); // Ürgüp → Nevşehir
  assert.ok(d > 12_000 && d < 16_000, String(d));
  assert.equal(distanceInMeters(41, 29, 41, 29), 0);
});

test("ÖNBELLEK HATASI düzeltildi: aynı kayıt iki farklı kullanıcıya KENDİ konumundan mesafe gösterir", () => {
  const cached = [
    { id: "a", lat: 38.64, lng: 34.83, distanceMeters: 999999 /* eski: başka kullanıcının mesafesi */ },
    { id: "b", lat: 38.70, lng: 34.70, distanceMeters: 1 },
  ];
  const u1 = withUserDistance(cached, 38.6431, 34.8289); // a'ya çok yakın
  const u2 = withUserDistance(cached, 38.69, 34.69);     // b'ye çok yakın
  assert.equal(u1[0]!.id, "a"); assert.ok(u1[0]!.distanceMeters! < 1000);
  assert.equal(u2[0]!.id, "b"); assert.ok(u2[0]!.distanceMeters! < 2000);
  assert.notEqual(u1.find((p) => p.id === "b")!.distanceMeters, 1); // eski değer sızmaz
  assert.notEqual(u1.find((p) => p.id === "a")!.distanceMeters, 999999);
});

test("koordinatı olmayan eski kayıt: mesafe null (uydurma/başkasının mesafesi gösterilmez); konumsuz sorguda hepsi null", () => {
  const old = [{ id: "x", distanceMeters: 500 }, { id: "y", lat: 38.7, lng: 34.7 }];
  const r = withUserDistance(old, 38.7, 34.7);
  assert.equal(r.find((p) => p.id === "x")!.distanceMeters, null);
  assert.equal(r[0]!.id, "y"); // koordinatlı olan önce
  assert.ok(withUserDistance(old, null, null).every((p) => p.distanceMeters === null));
});
