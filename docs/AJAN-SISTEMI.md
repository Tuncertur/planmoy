# Planmoy ajan çalışma sistemi (Claude = geliştirici, ChatGPT = bağımsız denetçi, GitHub = merkez)

| Rol | Gerçekten otomatik çalışan mekanizma | Yetki | Gereken tek seferlik kurulum |
|---|---|---|---|
| Claude (geliştirici) | `claude-gorev.yml`: Issue'ya `claude-gorev` etiketi (veya yorumda `@claude`) → Claude Code Action görevi alır, dal açar, **PR açar** | contents/PR/issues yazma; **merge, main push, deploy, migration, secret, ödeme, mağaza YOK** | GitHub'a Claude App kurulumu + secret `ANTHROPIC_API_KEY`. Yalnız depo sahibi tetikleyebilir |
| ChatGPT (denetçi) | `denetci.yml`: her PR'da OpenAI API ile fark okunur, **yalnız PR yorumu** yazılır | contents:read + yorum | secret `OPENAI_API_KEY` + variable `OPENAI_MODEL`. **ChatGPT arayüzü kendiliğinden çalışmaz** (zamanlanmış/ tetiklenen bir işi yok); otomasyon API üzerindendir ve ayrı fatura çıkarır |
| Test/güvenlik | `ci.yml` (tsc, build, 116 birim test, migration 0027–0031, geri yükleme), `guvenlik.yml` (secret deseni, yasak dosya, Planmany/Planbos karışması, `npm audit`; haftalık) | salt okuma | yok |
| Hata → Issue | `ci-hata-issue.yml`: başarısız koşuda tek Issue (başlıkla tekilleştirir, tekrar → yorum, düzelince otomatik kapanır) | issues yazma | PR birleşince etkinleşir (workflow_run varsayılan dalda çalışır) |
| Derleme kanıtı | ops `codemagic-tetikle.yml`: Codemagic'i API ile tetikler, izler; sürüm/commit/build no/çıktı md5'leri ops Issue #1 + `raporlar-site` dalına yazılır | Codemagic API token | secret `CODEMAGIC_API_TOKEN`, `CODEMAGIC_APP_ID` (ops reposunda) |
| iOS Simulator görüntüleri | Codemagic `ios-screenshots` (gerçek Simulator, `scripts/ios-ekran-goruntusu.sh`); `VITE_SHOT_MODE` yalnız bu akışta açık | yok (imzasız) | Demo (anonim) girişi için Supabase'te Anonymous sign-ins açık olmalı; **production'da geçici anonim kullanıcı oluşturur → onay kapısı** |

## Onay kapıları (otomasyon BUNLARI yapmaz)
PR merge · production migration · Edge Function deploy · secret değişikliği · canlı ödeme · TestFlight/App Store gönderimi (`ios-testflight` akışı ops tetikleyicisinde bilerek YASAK).
