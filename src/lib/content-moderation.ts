// FireVibe'ın gerçek src/lib/content-moderation.ts dosyasından birebir
// taşınmıştır. Güvenlik tabanı — dil modeli değil, basit ama çok dilli
// bir küfür/hakaret filtresi.
const blockedTerms = [
  'amk', 'aq', 'orospu', 'orospuçocuğu', 'siktir', 'sikik', 'yarrak', 'yavşak', 'lavuk', 'piç', 'pezevenk', 'ibne', 'göt', 'bok', 'boktan', 'kahpe', 'şerefsiz', 'sürtük', 'salak', 'gerizekalı', 'mal', 'dangalak',
  'fuck', 'shit', 'bitch', 'asshole', 'motherfucker', 'cunt', 'dickhead', 'bastard', 'bullshit', 'slut', 'whore',
  'puta', 'puto', 'mierda', 'coño', 'idiota', 'caralho', 'merda', 'viado',
  'merde', 'putain', 'connard', 'salope', 'enculé', 'encule', 'stronzo', 'cazzo', 'bastardo', 'troia',
  'scheiße', 'scheisse', 'arschloch', 'fick', 'hurensohn', 'schlampe', 'klootzak',
  'блядь', 'бля', 'хуй', 'пизда', 'ебать', 'сука', 'мудак', 'blyad', 'blyat', 'khuy', 'pizda', 'yebat', 'suka', 'mudak',
  'كس', 'خرا', 'شرموط', 'قحبة', 'عاهرة', 'kess', 'khara', 'sharmout', 'kahba', 'zeb',
  'fck', 'fuk', 'fuq', 'sh1t', 'b1tch', 'btch', 'azz', 'd1ck', 'p0rn', 'porn',
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .replace(/[ı]/g, 'i')
    .replace(/[а]/g, 'a').replace(/[её]/g, 'e').replace(/[о]/g, 'o')
    .replace(/[р]/g, 'p').replace(/[с]/g, 'c').replace(/[х]/g, 'x').replace(/[у]/g, 'y').replace(/[к]/g, 'k').replace(/[в]/g, 'b').replace(/[м]/g, 'm').replace(/[н]/g, 'h').replace(/[т]/g, 't')
    .replace(/[@4]/g, 'a').replace(/[3€]/g, 'e').replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o').replace(/[5$]/g, 's')
    .replace(/[\s._,*~`'"""''":/\\|!?@#$%^&+=[\]{}()<>-]+/g, '')
    .replace(/(.)\1{2,}/gu, '$1');
}

export function findBlockedTerm(value: string) {
  const normalized = normalize(value);
  return (
    blockedTerms.find((term) => {
      const candidate = normalize(term);
      return candidate.length >= 2 && normalized.includes(candidate);
    }) ?? null
  );
}

export function validateSafeContent(value: string, label = 'İçerik') {
  const term = findBlockedTerm(value);
  if (term) throw new Error(`${label} uygun olmayan veya hakaret içeren ifadeler içeriyor. Lütfen daha saygılı bir dil kullanın.`);
  return value;
}

export const moderationMessage = 'Bu ifade gönderilemedi. Lütfen küfür, hakaret veya ahlaksız içerik kullanmadan tekrar deneyin.';
