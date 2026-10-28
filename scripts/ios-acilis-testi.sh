#!/usr/bin/env bash
# GERÇEK iOS Simulator soğuk başlangıç testi (macOS + Xcode gerekir; Codemagic "ios-acilis-testi" iş akışı).
# Gerçek iPhone/TestFlight kanıtı DEĞİLDİR. Kullanım: bash scripts/ios-acilis-testi.sh <App.app yolu> <çıktı klasörü>
# Başarı: uygulama iki ayrı soğuk başlangıçta da 25 sn sonra hâlâ çalışıyor + yeni çökme raporu yok. Giriş ekranı görüntüsü kanıt olarak kaydedilir.
set -u
APP="$1"; OUT="$2"; BUNDLE="com.planmoy.app"; mkdir -p "$OUT"; FAIL=0
LINE=$(xcrun simctl list devices available | sed 's/^ *//' | grep -E "^iPhone [0-9]+ Pro \(" | tail -1)
[ -n "$LINE" ] || LINE=$(xcrun simctl list devices available | sed 's/^ *//' | grep -E "^iPhone" | tail -1)
NAME=$(echo "$LINE" | sed 's/ (.*//'); UDID=$(echo "$LINE" | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')
echo "cihaz: $NAME ($UDID)" | tee "$OUT/cihaz.txt"; xcrun simctl list runtimes | grep -i ios | tee -a "$OUT/cihaz.txt"
xcrun simctl boot "$UDID" 2>/dev/null; xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
xcrun simctl install "$UDID" "$APP" || { echo "KURULUM HATASI"; exit 1; }
CRASHDIR="$HOME/Library/Logs/DiagnosticReports"; ls "$CRASHDIR" 2>/dev/null | sort > "$OUT/_once.txt"
for RUN in 1 2; do
  echo "== soguk baslangic $RUN =="; xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null; sleep 2
  START=$(date '+%Y-%m-%d %H:%M:%S')
  OUTL=$(xcrun simctl launch "$UDID" "$BUNDLE" 2>&1); echo "$OUTL" | tee -a "$OUT/baslat.txt"
  PID=$(echo "$OUTL" | grep -oE '[0-9]+$' | tail -1)
  sleep 25
  if [ -n "$PID" ] && ps -p "$PID" >/dev/null 2>&1; then echo "RUN $RUN: PASS (surec $PID 25 sn sonra hala calisiyor)" | tee -a "$OUT/sonuc.txt"
  else echo "RUN $RUN: FAIL (surec yok/oldu)" | tee -a "$OUT/sonuc.txt"; FAIL=1; fi
  xcrun simctl io "$UDID" screenshot --type=png "$OUT/acilis-$RUN.png"
  xcrun simctl spawn "$UDID" log show --start "$START" --style compact --predicate 'process == "App"' 2>/dev/null | tail -300 > "$OUT/log-$RUN.txt"
done
ls "$CRASHDIR" 2>/dev/null | sort > "$OUT/_sonra.txt"
NEW=$(comm -13 "$OUT/_once.txt" "$OUT/_sonra.txt" | grep -iE "^App[-_ ]|Planmoy" || true)
if [ -n "$NEW" ]; then echo "YENI COKME RAPORU: $NEW" | tee -a "$OUT/sonuc.txt"; FAIL=1
  for f in $NEW; do head -60 "$CRASHDIR/$f" > "$OUT/cokme-$f.txt"; done
else echo "yeni cokme raporu yok" | tee -a "$OUT/sonuc.txt"; fi
xcrun simctl shutdown "$UDID" 2>/dev/null
cat "$OUT/sonuc.txt"; exit $FAIL
