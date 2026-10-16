#!/usr/bin/env bash
# Tüm *.test.sh dosyalarını çalıştırır. Çıkış kodu != 0 ise en az bir test kaldı.
cd "$(dirname "$0")" || exit 2
RC=0
for t in *.test.sh; do echo "##### $t"; bash "$t" || RC=1; done
exit $RC
