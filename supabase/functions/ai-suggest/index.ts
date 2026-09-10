// Planmoy — Genel amaçlı AI öneri fonksiyonu (Google Gemini)
//
// Kullanıcı OpenAI değil Gemini istedi (tek yerden ödeme). Bu fonksiyon
// StyleSync, Yapay Zeka (Akışım) ve işletme önerileri gibi birden fazla
// yerde aynı şekilde çağrılabilir — her çağıran kendi system/prompt
// metnini gönderir.
//
// GEMINI_API_KEY yoksa "missing-key" döner — FireVibe'daki gibi uydurma
// öneri üretilmez, dürüst boş durum gösterilir.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "missing-key", suggestion: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { system, prompt } = await req.json();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system ?? "" }] },
        contents: [{ role: "user", parts: [{ text: prompt ?? "" }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, reason: "provider-error", suggestion: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await response.json();
  const text: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  return new Response(JSON.stringify({ ok: true, suggestion: text ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
