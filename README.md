# balpydigital.com

Balpy'nin tanıtım sitesi ve kullanım rehberi. GitHub Pages bu deponun `main`
dalını olduğu gibi yayınlar; sunucuda derleme yoktur.

## Adresler

Uygulama şu adreslere bağlanır; değiştirilmez:

| Adres | Kullanan |
| --- | --- |
| `/` | Ayarlar → Balpy web sitesi; Koleksiyonlar boş ekranı → Kullanımı öğren |
| `/rehber/#ai` | Ai ayarları → Web sitemizden oku (`/rehber/ai/` sayfasına yönlenir) |
| `/gizlilik-politikasi/` | Ayarlar, Play Console |
| `/hesap-silme/` | Ayarlar, Play Console |
| `/sifre-yenile/` | Supabase şifre sıfırlama yönlendirmesi |

`/rehber/#konu` biçimindeki eski adresler tarayıcıda `/rehber/konu/` sayfasına
yönlenir. Adı değişen sayfalar `_kaynak/rehber.json` içindeki `redirects`
listesinde tutulur (ör. `genel` → `hedefler`).

## Yapı

```
_kaynak/rehber.json          gruplar, sayfa sırası, başlık, özet, simge, arama sözcükleri
_kaynak/rehber/<adres>.html  rehber sayfalarının içeriği (HTML parçası)
_kaynak/sayfalar/*.html      ana sayfa, 404, gizlilik ve hesap silme
tool/build.mjs               derleme aracı (bağımlılık yok, Node 20+)
site.css, site.js            bütün sayfaların ortak stili ve davranışı
sifre-yenile/                elle yazılmış; derleme aracı dokunmaz
```

Alt çizgiyle başlayan klasörleri GitHub Pages yayınlamaz. `rehber/`,
`index.html`, `404.html`, `gizlilik-politikasi/`, `hesap-silme/` ve
`sitemap.xml` üretilir; elle değiştirilmez.

## İçerik yazmak

Parçalarda düz HTML kullanılır. Ek kısa yazımlar:

- `{{i:ad}}` simge ekler. Simgeler `tool/build.mjs` içindeki `icons`
  listesindedir; sayfaya yalnız kullanılanlar gömülür.
- `{{yol:Profil > Ayarlar > Bildirimler}}` uygulamadaki ekran yolunu gösterir.
- `<div class="callout tip" title="İpucu">…</div>` başlıklı kutu. Türler:
  `note` (varsayılan), `tip`, `warn`, `ai`, `danger`.
- `<ol class="steps">` numaralı adım kartları; `<dl class="defs">` iki sütunlu
  tablonun telefonda alt alta düşen karşılığı.

`h2` ve `h3` başlıkları kimliğini metinden alır. Dışarıdan bağlantı verilen
bir başlığa `id` yazılırsa başlık metni değişse de bağlantı kırılmaz.

Derleme; bilinmeyen sayfa ya da bölüm bağlantısını, aynı kimliği taşıyan iki
başlığı, bilinmeyen simgeyi ve çözülemeyen kısa yazımı hata olarak durdurur.

```sh
npm run build
```

## Yazım ilkeleri

- Metin uygulamanın bugünkü davranışını anlatır. Yayında olmayan özellikler
  (satranç, geliştirici seçenekleri) yazılmaz.
- Arayüz adları uygulamadaki gibi yazılır; kullanıcıya görünen metinde “AI”
  değil “Ai” kullanılır.
- Not, kart ve soru ayrımı korunur: not anlatım, kart kısa hatırlama, soru
  uygulamadır.
- Gizlilik ve hesap silme metinleri yasal metindir; uygulamadaki veri işleme
  değişmeden değiştirilmez.

## Tema

Varsayılan koyu temadır. Açık tema sistem tercihinden ya da üst çubuktaki
düğmeden gelir; seçim tarayıcıda `balpy-tema` anahtarıyla saklanır. Şifre
yenileme sayfası her zaman koyu kalır.

## Yerel önizleme

```sh
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/` adresini aç.

## Yayın notları

Uygulama Google Play'de herkese açılınca ana sayfadaki “Yakında Google Play'de”
etiketini ve SSS'deki indirme cevabını mağaza bağlantısıyla değiştir.
