import { tt } from "./i18n";
import { isNativeApp } from "./paddle";

/** Keşif limiti mesajı. Mağaza uygulamasında (IAP kuralları: Apple 3.1.1) satın almaya yönlendiren ifade KULLANILMAZ. */
export function capMessage(reason: "user" | "pool" | "free" | undefined): string {
  const native = isNativeApp();
  if (reason === "free") {
    return native
      ? tt({ tr: "Bu bölge için yeni arama yapılamıyor. Daha önce aranmış bölgeler yine görünür.", en: "New searches aren't available for this area. Previously searched areas still show." })
      : tt({ tr: "Canlı mekân araması ücretli planlara dahildir. Daha önce aranmış bölgeler yine görünür.", en: "Live place search is included in paid plans. Previously searched areas still show." });
  }
  if (reason === "pool") {
    return native
      ? tt({ tr: "Bu ay ücretsiz aramalar için ayrılan genel havuz doldu; ay başında yenilenir. Daha önce aranmış bölgeler yine görünür.", en: "This month's shared pool of free searches is used up; it resets at the start of the month. Previously searched areas still show." })
      : tt({ tr: "Bu ay ücretsiz aramalar için ayrılan genel havuz doldu. Ücretli planlarda canlı arama devam eder; ay başında havuz yenilenir.", en: "This month's shared pool of free searches is used up. Paid plans keep live search; the pool resets at the start of the month." });
  }
  return native
    ? tt({ tr: "Bu ayki arama hakkın doldu; ay başında yenilenir. Daha önce aranmış bölgeler yine görünür.", en: "You've used this month's search allowance; it resets at the start of the month. Previously searched areas still show." })
    : tt({ tr: "Bu ayki ücretsiz arama hakkın doldu. Planını yükselterek daha fazla yeni bölge arayabilirsin — daha önce aranmış bölgeler yine görünür.", en: "You've used this month's free search allowance. Upgrade your plan to search more new areas — previously searched areas still show." });
}
