# Planmoy abonelik birim ekonomisi — stres testi + kanal gerçekçi senaryo. Tüm girdiler görünür, hesap tekrarlanabilir.
# Çalıştırma: python3 scripts/maliyet-modeli.py   (hata varsa çıkış kodu 1: referans tablo doğrulanır)
# KULLANICI STRES VARSAYIMLARI (apple %30, sabit $0.98/abonelik, %2 transfer) GERÇEK GİDER OLARAK DOĞRULANMADI; app-store kanalında çifte sayım şüphesi var.
import json
PLANS = {"Personal": (2.99, 200), "Solo": (4.99, 500), "Studio": (12.99, 1000)}
EXTRA = {"Personal": 0.15, "Solo": 0.40, "Studio": 1.50}   # ek API+değişken altyapı başlangıç bütçesi / kişi / ay (kullanıcı önerisi, DOĞRULANMAMIŞ)
VAT = 0.22
def stress(price, q, store, ai_unit, extra, util=1.0, n=100, fixed=0.98, wire=0.02):
    gross = price*n; net = gross/(1+VAT); vat = gross-net
    comm = store*net; fx = fixed*n; tr = wire*gross
    ai = q*util*ai_unit*n; ex = extra*n
    rem = net-comm-fx-tr-ai-ex
    return dict(gross=gross, vat=vat, net=net, comm=comm, fixed=fx, transfer=tr, ai=ai, extra=ex, rem=rem, rem_per_sub=rem/n)
def ref(): # referans tablo: ek bütçe 0
    out={}
    for p,(pr,q) in PLANS.items(): out[p]=stress(pr,q,0.30,0.0012,0)
    return out
if __name__=="__main__":
    print("== REFERANS TABLO (kullanıcı varsayımı: Apple %30, $0.98, %2, KDV %22 dahil, AI $0.0012, ek bütçe 0) ==")
    for p,v in ref().items(): print(p, {k:round(x,2) for k,x in v.items()})
    print("\n== STRES (ek bütçe dahil) — 100 abone, kalan $; AI birim maliyeti ve kullanım oranı değişken ==")
    for ai_name, ai_unit in [("Flash-Lite 3.1 ($0.000825)",0.000825),("varsayım $0.0012",0.0012),("3.8 Flash bugün ($0.00225)",0.00225),("3.8 Flash 2027 ($0.0045)",0.0045)]:
        for store_name, store in [("Apple %30",0.30),("Apple/Google %15",0.15)]:
            row=[]
            for p,(pr,q) in PLANS.items():
                for util in (1.0,0.5):
                    r=stress(pr,q,store,ai_unit,EXTRA[p],util); row.append(f"{p[:4]} u{int(util*100)}: {r['rem']:7.2f}")
            print(f"{ai_name:30} {store_name:16}", " | ".join(row))
    # Paddle web (MoR): ücret %5+$0.50/işlem; vergiyi Paddle toplar/öder. Kullanıcının $0.98+%2 kesintisi BURADA UYGULANMAZ (çifte sayım şüphesi) — ayrı gösterilir.
    print("\n== PADDLE WEB (MoR) — tüketici fiyatı vergi DAHİL varsayımı (en kötü) / vergi HARİÇ ==")
    for incl in (True, False):
        for p,(pr,q) in PLANS.items():
            for ai_unit in (0.0012,0.0045):
                gross=pr*100; base = gross/(1+VAT) if incl else gross
                fee=0.05*gross+0.50*100
                ai=q*ai_unit*100; ex=EXTRA[p]*100
                rem=base-fee-ai-ex
                print(f"vergi {'dahil' if incl else 'hariç'} {p:9} AI {ai_unit:.4f}: kalan ${rem:8.2f}  (aboneliğe ${rem/100:5.2f})")
    # Free: $0
    # Başa baş AI sorgu sayısı (Apple %30, stres): kalan=0 olduğu sorgu/ay/abone
    print("\n== BAŞA BAŞ: ek bütçe dahil, kalan=0 olan aylık sorgu sayısı / abone (Apple %30 stres | Apple %15 stres | Paddle vergi-dahil) ==")
    for p,(pr,q) in PLANS.items():
        for ai_unit in (0.0012,0.0045):
            res=[]
            for kind in ("A30","A15","PD"):
                if kind=="PD": avail=pr/(1+VAT)-(0.05*pr+0.50)-EXTRA[p]
                else:
                    s=0.30 if kind=="A30" else 0.15; avail=(pr/(1+VAT))*(1-s)-0.98-0.02*pr-EXTRA[p]
                res.append(avail/ai_unit)
            print(f"{p:9} AI {ai_unit:.4f}: " + " | ".join(f"{x:8.0f}" for x in res) + f"   (hak: {q})")

    # ---- Dolar tavanı DOLU kullanılırsa (en kötü API harcaması) — tavan kullanıcı başına zarar sınırıdır ----
    CAP = {"Personal": 0.39, "Solo": 1.00, "Studio": 2.70}
    print("\n== TAVAN-DOLU en kötü durum: abone başına kalan $ (ek bütçe zaten tavanın içinde; ek bütçe ayrıca düşülmez) ==")
    for p,(pr,q) in PLANS.items():
        net=pr/(1+VAT)
        a30=net*0.70-0.98-0.02*pr-CAP[p]; a15=net*0.85-0.98-0.02*pr-CAP[p]; pd=net-(0.05*pr+0.50)-CAP[p]
        print(f"{p:9} tavan ${CAP[p]:.2f}: Apple%30 {a30:6.3f} | Apple/Google%15 {a15:6.3f} | Paddle(vergi dahil) {pd:6.3f}")
    # ---- Yük senaryoları: aylık EN KÖTÜ API harcaması (hepsi tavanı doldurur) ----
    MIX = {"Personal": 0.70, "Solo": 0.25, "Studio": 0.05}
    per_user = sum(MIX[p]*CAP[p] for p in MIX)
    print(f"\n== YÜK: ücretli abone sayısına göre en kötü aylık API harcaması (karışım %70/%25/%5; ortalama tavan ${per_user:.3f}) ==")
    for n in (100, 1000, 10000):
        print(f"{n:6} ücretli abone: en kötü API ${n*per_user:9.2f}/ay;  proje tavanı $150 bu yükün {150/(n*per_user)*100:5.1f}%'i")
    # ---- Kendi doğrulama: referans tablo (kullanıcının verdiği değerler) ----
    exp={"Personal":(53.92,73.52,5.98,24,43.57),"Solo":(89.98,122.70,9.98,60,118.34),"Studio":(234.25,319.43,25.98,120,501.34)}
    bad=0
    for p,e in exp.items():
        r=ref()[p]; got=(r["vat"],r["comm"],r["transfer"],r["ai"],r["rem"])
        for g,x in zip(got,e):
            if abs(g-x)>0.02: bad+=1; print("REFERANS UYUŞMUYOR",p,g,x)
    print("\nreferans tablo doğrulaması:", "TAMAM" if not bad else f"{bad} fark")
    raise SystemExit(1 if bad else 0)
