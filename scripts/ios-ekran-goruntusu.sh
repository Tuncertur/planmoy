#!/usr/bin/env bash
# GERÇEK iOS Simulator ekran görüntüsü (macOS + Xcode gerekir; Codemagic "ios-screenshots" iş akışında çalışır).
# Chromium/web görüntüsü DEĞİLDİR. Kullanım: bash scripts/ios-ekran-goruntusu.sh <App.app yolu> <çıktı klasörü>
set -u
APP="$1"; OUT="$2"; BUNDLE="com.planmoy.app"; mkdir -p "$OUT"
INTERVAL=20; VIEWS=8
# 6.9" (1320x2868) ve 6.5" (1284x2778) cihaz adaylari; yoksa o boyut RAPORLANIR (uydurulmaz)
declare -A WANT=( ["6.9"]="iPhone 1[67] Pro Max|iPhone 1[5] Plus|iPhone 1[67] Plus" ["6.5"]="iPhone 1[1] Pro Max|iPhone XS Max|iPhone 11 Pro Max" )
for SIZE in 6.9 6.5; do
  NAME=$(xcrun simctl list devices available | sed 's/^ *//' | grep -E "^(${WANT[$SIZE]}) \(" | head -1 | sed 's/ (.*//')
  if [ -z "$NAME" ]; then echo "NOT AVAILABLE: $SIZE\" cihazi bu Xcode'da yok"; echo "yok" > "$OUT/_${SIZE}-cihaz-yok.txt"; continue; fi
  UDID=$(xcrun simctl list devices available | grep -F "$NAME (" | head -1 | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')
  echo "== $SIZE\" -> $NAME ($UDID)"
  xcrun simctl boot "$UDID" 2>/dev/null; xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
  xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 2>/dev/null
  xcrun simctl location "$UDID" set 38.6431,34.8289   # Urgup (Kapadokya) — gercek GPS yerine simule konum
  xcrun simctl install "$UDID" "$APP" || { echo "kurulum hatasi"; exit 1; }
  xcrun simctl privacy "$UDID" grant location "$BUNDLE" 2>/dev/null; xcrun simctl privacy "$UDID" grant photos "$BUNDLE" 2>/dev/null
  xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null || { echo "acilis hatasi"; exit 1; }
  sleep 15   # giris (Demo) + ilk gorunum
  for i in $(seq 1 $VIEWS); do
    xcrun simctl io "$UDID" screenshot --type=png "$OUT/ios-${SIZE}-$(printf %02d $i).png"
    sleep $INTERVAL
  done
  # kanit: gercek cihaz adi + piksel boyutu
  for f in "$OUT"/ios-${SIZE}-*.png; do echo "$(basename "$f") $(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{printf $2 "x"}')"; done > "$OUT/_${SIZE}-boyutlar.txt"
  echo "$NAME" > "$OUT/_${SIZE}-cihaz.txt"
  xcrun simctl shutdown "$UDID" 2>/dev/null
done
ls -la "$OUT"
