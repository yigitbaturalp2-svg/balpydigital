# Balpy web rehberi

Balpy'nin kullanım rehberi `https://balpydigital.com/rehber/` adresindedir.
Uygulama ilk giriş davetinden, Profil → Ayarlar → Balpy rehberi satırından
ve Ai ekranlarındaki yardım düğmelerinden bu siteye yönlendirir.

Site, Balpy'yi hiç bilmeyen birine genel kullanımı öğretir; hedefe
(sınav, bölüm vb.) göre ayrı yollar sunmaz. Ana sayfa beş bölümlük kısa bir
tanıtımdır; ayrıntı rehberdedir.

## Rehberin yapısı

- `/rehber/` giriş sayfasıdır: arama, "İlk adımlar" kartı ve gruplu konu
  kartları. Arama `rehber/arama.json` dizinini ilk kullanımda yükler; konu
  başlıklarında ve ayrıntılı notların metninde arar.
- Her konu kendi sayfasındadır: `/rehber/ilk-adimlar/`, `/rehber/ai/`,
  `/rehber/kartlar/` gibi. Sayfada konum yolu, önceki/sonraki konu ve
  "Bu bölümü Ai ile öğren" düğmesi bulunur. Masaüstünde konu listesi solda
  durur; telefonda alttaki çubuktan (Konular, Ara, Başa dön) açılır.
- Uygulama `/rehber/#ai` adresine bağlanır. Giriş sayfası `#konu` biçimindeki
  eski adresleri tarayıcıda `/rehber/konu/` sayfasına yönlendirir; bu yüzden
  konu adresleri (`slug`) değiştirilmez.
- Ayrıntılı notlar açılır başlıklardır ve her birinin kendi adresi vardır
  (`/rehber/ayarlar/#bildirimler` gibi); bu adres o başlığı açar.

## İçerik güncelleme

Kaynaklar `_rehber/` klasöründedir. GitHub Pages alt çizgiyle başlayan
klasörü yayınlamaz.

- `_rehber/konular.json`: konuların sırası, grubu, başlığı, ikonu, rengi,
  kart özeti, arama anahtar kelimeleri ve bağlı not bölümü (`notes`).
- `_rehber/konular/<slug>.html`: konunun kısa anlatımı (HTML parçası).
  Başka bir konuya bağlantı `/rehber/<slug>/` biçiminde yazılır.
- `_rehber/notes.json`: 12 bölüm ve 51 ayrıntılı notun kaynak metni
  (Markdown).

Kaynakları değiştirdikten sonra:

```sh
npm install
npm run build:guide
```

Araç `rehber/index.html`, her konunun `rehber/<slug>/index.html` sayfasını,
`rehber/arama.json` dizinini ve `sitemap.xml` dosyasını üretir. Bunlar elle
değiştirilmez. Araç bilinmeyen bir konu bağlantısını, eksik ya da iki kez
bağlanmış not bölümünü hata olarak durdurur. Derlenen HTML depoda tutulur;
GitHub Pages için Node veya çalışma zamanı derlemesi gerekmez. Ana uygulamanın
`tool/dump_ai_guides.dart` aracı yalnız içerik üretim XML kılavuzlarını
üretir; web kullanım rehberi ayrıdır.

## Ai ile öğrenme

Gönderme penceresi ve `.txt` indirmesi yalnız seçilen bölümün metnini içerir.
Bütün rehberi gönderen bir seçenek yoktur. Pencerede metin önizlenir;
kullanıcı kopyalama veya dosya indirme eylemini kendisi seçer. Panoya erişim
engellendiğinde metin seçilir ve elle kopyalama yolu açıklanır.

Sohbet isteği, Balpy'nin güncel XML şemasının yerine geçmez. İçerik
hazırlatmak için kullanıcı ilgili Balpy ekranının kılavuzunu ve bağlamını
aynı sohbete ayrıca gönderir. Site kişisel kayıtları bilmez.

## Yayın notları

Uygulama Google Play'de herkese açılınca ana sayfadaki "Yakında Google Play'de"
rozetini ve alttaki çağrı metnini mağaza bağlantısıyla değiştir.

İkonlar `assets/fonts/material-symbols-rounded.woff2` dosyasından gelir; dosya
yalnız sitede kullanılan ikonları içerir. Yeni bir ikon adı eklenirse Google
Fonts'tan `icon_names=` parametresine bütün ikon adları (alfabetik) yazılarak
dosya yeniden indirilir; yoksa ikon yerine adı yazı olarak görünür.

`sitemap.xml` rehber derlemesiyle üretilir; rehber dışında yeni bir sayfa
eklenirse `tool/build-guide.mjs` içindeki sayfa listesine de eklenir.

## Yerel önizleme

```sh
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/rehber/` adresini aç. Gerçek yayın, bu deponun
GitHub Pages akışıyla yapılır. Uygulama deposuyla bu depo ayrı güncellenir.
