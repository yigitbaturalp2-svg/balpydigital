# Balpy web rehberi

Balpy'nin kullanım rehberi `https://balpydigital.com/rehber/` adresindedir.
Uygulama ilk giriş davetinden, Profil → Ayarlar → Balpy rehberi satırından
ve AI ekranlarındaki yardım düğmelerinden bu siteye yönlendirir.

YKS, KPSS, üniversite, tıp ve genel öğrenme sekmeleri; çalışma alanı,
kaynak ve ihtiyaç sorularına göre başlangıç adımları ve örnek sohbet
isteği sunar. Bu yönlendirme tarayıcıda çalışır; AI servisine veya bir
veritabanına bağlanmaz. Yanıtlar saklanmaz ve kendiliğinden gönderilmez.

`rehber/index.html` kısa kullanım anlatımlarını, `rehber/notes.json`
12 bölüm ve 51 ayrıntılı notun kaynak metnini taşır. Ayrıntılı notlar
HTML'de açılır başlıklarla bulunur ve JavaScript olmadan da okunabilir.
`rehber/guide.js` başlangıç sorularını ve bölüm gönderimini,
`rehber/guide.css` rehberin görünümünü yönetir.

## İçerik güncelleme

Not kaynaklarını değiştirdikten sonra:

```sh
npm install
npm run build:guide
```

Üretilmiş `BEGIN DETAILS` / `END DETAILS` blokları elle değiştirilmez.
Derlenen HTML depoda tutulur; GitHub Pages için Node veya çalışma zamanı
derlemesi gerekmez. Ana uygulamanın `tool/dump_ai_guides.dart` aracı artık
yalnız içerik üretim XML kılavuzlarını üretir; web kullanım rehberi ayrıdır.

## AI ile öğrenme

Gönderme penceresi ve `.txt` indirmesi yalnız seçilen bölümün metnini içerir.
Bütün rehberi gönderen bir seçenek yoktur. Pencerede metin önizlenir;
kullanıcı kopyalama veya dosya indirme eylemini kendisi seçer. Panoya erişim
engellendiğinde metin seçilir ve elle kopyalama yolu açıklanır.

Sohbet isteği, Balpy'nin güncel XML şemasının yerine geçmez. İçerik
hazırlatmak için kullanıcı ilgili Balpy ekranının kılavuzunu ve bağlamını
aynı sohbete ayrıca gönderir. Site kişisel kayıtları bilmez.

## Yerel önizleme

```sh
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/rehber/` adresini aç. Gerçek yayın, bu deponun
GitHub Pages akışıyla yapılır. Uygulama deposuyla bu depo ayrı güncellenir.
