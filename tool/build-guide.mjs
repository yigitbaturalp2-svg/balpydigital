import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Rehber; _rehber/ altındaki kaynaklardan statik sayfalar olarak üretilir.
// GitHub Pages alt çizgiyle başlayan klasörü yayınlamaz, üretilen HTML ise
// derleyici olmadan açılır. Üretilen dosyalar elle değiştirilmez.
const { marked } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'marked');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, '_rehber');
const guideDir = path.join(root, 'rehber');
const site = 'https://balpydigital.com';

const topics = JSON.parse(await readFile(path.join(source, 'konular.json'), 'utf8'));
const notes = new Map(JSON.parse(await readFile(path.join(source, 'notes.json'), 'utf8')).map((topic) => [topic.id, topic]));
const slugs = topics.map((topic) => topic.slug);
const groups = [...new Set(topics.map((topic) => topic.group))];

const escape = (text) => text.replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const turkish = {ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u'};
const slugify = (text) => text.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (char) => turkish[char])
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const entities = {amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' '};
const plainText = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => entities[name])
  .replace(/\s+/g, ' ').trim();
const toneClass = (topic) => (topic.tone ? ` ${topic.tone}` : '');
const pageUrl = (topic) => `/rehber/${topic.slug}/`;

// Konu kaynakları ve not eşlemesi derlemeden önce denetlenir; eksik bir
// bölüm sessizce yayından düşmez.
const usedNotes = new Set();
for (const topic of topics) {
  if (!/^[a-z-]+$/.test(topic.slug)) throw new Error(`Geçersiz konu adresi: ${topic.slug}`);
  if (topic.notes) {
    if (!notes.has(topic.notes)) throw new Error(`notes.json içinde bölüm yok: ${topic.notes}`);
    if (usedNotes.has(topic.notes)) throw new Error(`Bölüm iki konuya bağlı: ${topic.notes}`);
    usedNotes.add(topic.notes);
  }
}
for (const id of notes.keys()) if (!usedNotes.has(id)) throw new Error(`Hiçbir konuya bağlanmamış not bölümü: ${id}`);

function renderNotes(topic) {
  if (!topic.notes) return {html: '', entries: []};
  const ids = new Set();
  const entries = notes.get(topic.notes).notes.map((note) => {
    let id = slugify(note.title) || 'not';
    for (let n = 2; ids.has(id); n += 1) id = `${slugify(note.title)}-${n}`;
    ids.add(id);
    const text = note.text.replace(/^## /gm, '### ').replace(/^(.+?) :: (.+)$/gm, '- **$1:** $2');
    const body = marked.parse(text).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    return {id, title: note.title, body};
  });
  const html = `<div class="topic-details"><p>Ayrıntılı kullanım notları · İhtiyacın olan başlığı aç</p>\n${entries.map((entry) =>
    `<details class="note-detail" id="${entry.id}"><summary>${escape(entry.title)}</summary><div class="note-body">${entry.body}</div></details>`).join('\n')}\n</div>`;
  return {html, entries};
}

function head({title, description, url, type = 'website', extra = ''}) {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${site}${url}">
  <meta name="theme-color" content="#090f1b">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Balpy">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${site}${url}">
  <meta property="og:image" content="${site}/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/assets/brand/favicon-32.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">${extra}
  <link rel="preload" href="/assets/fonts/outfit-700.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="/assets/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/site.css">
  <link rel="stylesheet" href="/rehber/guide.css">
  <script src="/site.js" defer></script>
  <script src="/rehber/guide.js" defer></script>
</head>`;
}

function header(current) {
  const mark = (key) => (key === current ? ' aria-current="page"' : '');
  return `  <a class="skip-link" href="#main">İçeriğe geç</a>
  <div class="backdrop" aria-hidden="true"></div>

  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="/" aria-label="Balpy ana sayfa"><img src="/assets/brand/balpy-mark-96.png" alt="" width="38" height="38">Balpy</a>
      <nav class="site-nav" id="site-nav" aria-label="Ana menü">
        <a href="/">Ana sayfa</a>
        <a href="/rehber/"${mark('hub')}>Rehber</a>
        <a href="/rehber/ilk-adimlar/"${mark('ilk-adimlar')}>İlk adımlar</a>
        <a href="/rehber/sss/"${mark('sss')}>Sık sorulanlar</a>
      </nav>
      <a class="button ghost small" href="mailto:balpydigital.iletisim@gmail.com?subject=Balpy%20destek"><span class="ms">mail</span>Destek</a>
      <button class="nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Menüyü aç"><span class="ms">menu</span></button>
    </div>
  </header>`;
}

const footer = `  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-row">
        <a class="brand" href="/"><img src="/assets/brand/balpy-mark-96.png" alt="" width="30" height="30">Balpy</a>
        <nav class="footer-nav" aria-label="Alt menü">
          <a href="/rehber/">Rehber</a>
          <a href="/gizlilik-politikasi/">Gizlilik Politikası</a>
          <a href="/hesap-silme/">Hesap ve Veri Silme</a>
          <a href="/sifre-yenile/">Şifre Yenile</a>
          <a href="mailto:balpydigital.iletisim@gmail.com">İletişim</a>
        </nav>
      </div>
      <p class="footer-note">© 2026 Balpy · balpydigital.iletisim@gmail.com</p>
    </div>
  </footer>
</body>
</html>
`;

const topicCard = (topic) => `<a class="topic-card${toneClass(topic)}" href="${pageUrl(topic)}"><span class="badge"><span class="ms" aria-hidden="true">${topic.icon}</span></span><span class="topic-card-text"><b>${escape(topic.title)}</b><span>${escape(topic.summary)}</span></span><span class="ms chevron" aria-hidden="true">chevron_right</span></a>`;

function hubPage() {
  // Uygulama ve eski bağlantılar /rehber/#ai biçimini kullanır. Parça
  // sunucuya gitmediği için yönlendirme sayfa açılmadan tarayıcıda yapılır.
  const redirect = `
  <script>
    (function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (${JSON.stringify(slugs)}.indexOf(id) >= 0) location.replace('/rehber/' + id + '/');
    })();
  </script>`;
  const sections = groups.map((group, index) => `      <section class="hub-group" aria-labelledby="grup-${index + 1}">
        <h2 id="grup-${index + 1}">${escape(group)}</h2>
        <div class="topic-grid">
          ${topics.filter((topic) => topic.group === group).map(topicCard).join('\n          ')}
        </div>
      </section>`).join('\n');
  return `${head({
    title: 'Kullanım Rehberi | Balpy',
    description: "Balpy'yi ilk kez kullananlar için adım adım rehber: koleksiyon açma, kaynak ekleme, kendi yapay zekânla not, kart ve soru hazırlama, çalışma ve aralıklı tekrar.",
    url: '/rehber/',
    extra: redirect,
  })}
<body class="guide-hub">
${header('hub')}

  <main id="main">
    <section class="guide-hero hub-hero">
      <div class="wrap">
        <span class="eyebrow">Balpy kullanım rehberi</span>
        <h1>Balpy'yi adım adım öğren</h1>
        <p class="section-lead">İhtiyacın olan konuyu seç ya da ara. Her konu kendi sayfasında; uzun bir metinde kaybolmazsın.</p>
        <div class="hub-search" id="ara" role="search" hidden>
          <label class="guide-search">
            <span class="ms" aria-hidden="true">search</span>
            <input id="guide-search" type="search" placeholder="Rehberde ara: PDF, tekrar, bildirim…" aria-label="Rehberde ara" aria-controls="search-results" autocomplete="off">
          </label>
        </div>
        <a class="start-card tone-amber" href="/rehber/ilk-adimlar/"><span class="badge"><span class="ms" aria-hidden="true">flag</span></span><span class="topic-card-text"><b>Yeni misin? İlk adımlarla başla</b><span>Balpy'yi hiç bilmeyen birinin ilk günü, altı adımda.</span></span><span class="ms chevron" aria-hidden="true">arrow_forward</span></a>
      </div>
    </section>

    <div class="wrap hub-body">
      <div class="search-results" id="search-results" aria-live="polite" hidden></div>
      <div id="topic-groups">
${sections}
      </div>
    </div>
  </main>

${footer}`;
}

function tocNav(current) {
  const links = groups.map((group) => `        <p>${escape(group)}</p>\n${topics.filter((topic) => topic.group === group).map((topic) =>
    `        <a href="${pageUrl(topic)}"${topic.tone ? ` class="${topic.tone}"` : ''}${topic.slug === current.slug ? ' aria-current="page"' : ''}><span class="ms" aria-hidden="true">${topic.icon}</span>${escape(topic.title)}</a>`).join('\n')}`).join('\n');
  return `      <nav class="toc" id="guide-toc" aria-label="Rehber konuları">
        <div class="toc-head"><b>Konular</b><button class="dialog-close" id="toc-close" type="button" aria-label="Konuları kapat"><span class="ms" aria-hidden="true">close</span></button></div>
        <a href="/rehber/" class="toc-home"><span class="ms" aria-hidden="true">search</span>Rehberde ara</a>
${links}
      </nav>`;
}

function pager(index) {
  const link = (topic, kind) => (topic
    ? `<a class="pager-link ${kind}${toneClass(topic)}" href="${pageUrl(topic)}"><small>${kind === 'prev' ? '<span class="ms" aria-hidden="true">arrow_back</span>Önceki' : 'Sonraki<span class="ms" aria-hidden="true">arrow_forward</span>'}</small><b>${escape(topic.title)}</b></a>`
    : '<span></span>');
  return `<nav class="pager" aria-label="Önceki ve sonraki konu">${link(topics[index - 1], 'prev')}${link(topics[index + 1], 'next')}</nav>`;
}

const dialog = (topic) => `  <dialog class="ai-learning-dialog" id="ai-learning-dialog" aria-labelledby="ai-learning-title">
    <div class="ai-dialog-heading"><div><span class="eyebrow">Her gönderimde tek bölüm</span><h2 id="ai-learning-title">Bu bölümü Ai ile öğren</h2></div><button class="dialog-close" id="close-ai-learning" type="button" aria-label="Pencereyi kapat"><span class="ms" aria-hidden="true">close</span></button></div>
    <p>Metni sohbetine yapıştırıp hedefini ve sorunu yaz. Başka bir konu gerekirse o konunun sayfasından aynı sohbete ekleyebilirsin.</p>
    <p class="ai-topic-name">Gönderilecek bölüm: <strong>${escape(topic.title)}</strong></p>
    <label class="ai-preview-label" for="ai-preview">Gönderilecek metin <span id="ai-character-count"></span></label>
    <textarea id="ai-preview" rows="8" readonly spellcheck="false"></textarea>
    <p class="ai-preview-help">Bu metin kullanım rehberidir. İçerik hazırlatmak için güncel XML kılavuzunu ilgili Balpy ekranından ayrıca gönderirsin.</p>
    <div class="ai-dialog-actions"><button class="button primary" id="copy-ai-section" type="button"><span class="ms" aria-hidden="true">content_copy</span>Bölümü kopyala</button><button class="button ghost" id="download-ai-section" type="button"><span class="ms" aria-hidden="true">download</span>Bölümü indir</button></div>
    <div class="ai-platforms" aria-label="Kopyala ve sohbet uygulamasını aç"><button type="button" class="button ghost small" data-ai-platform="chatgpt">Kopyala ve ChatGPT'yi aç</button><button type="button" class="button ghost small" data-ai-platform="gemini">Gemini</button><button type="button" class="button ghost small" data-ai-platform="claude">Claude</button></div>
    <p class="action-status" id="ai-status" role="status" aria-live="polite"></p>
  </dialog>`;

function topicPage(topic, index, body, details) {
  return `${head({title: `${topic.title} | Balpy Rehberi`, description: topic.summary, url: pageUrl(topic), type: 'article'})}
<body class="guide-topic">
${header(topic.slug)}

  <main id="main" tabindex="-1">
    <div class="wrap guide-layout">
${tocNav(topic)}

      <div class="guide-content">
        <nav class="crumbs" aria-label="Konum"><a href="/rehber/">Rehber</a><span class="ms" aria-hidden="true">chevron_right</span><span>${escape(topic.group)}</span></nav>
        <article class="topic${toneClass(topic)}" id="${topic.slug}">
          <div class="topic-head"><span class="badge"><span class="ms" aria-hidden="true">${topic.icon}</span></span><div><small>${escape(topic.group)}</small><h1>${escape(topic.title)}</h1></div></div>
${body.trimEnd()}
${details ? `${details}\n` : ''}<div class="topic-tools" hidden><button class="button ghost small" id="open-ai-learning" type="button"><span class="ms" aria-hidden="true">bolt</span>Bu bölümü Ai ile öğren</button></div>
        </article>
        ${pager(index)}
      </div>
    </div>
  </main>

  <div class="toc-scrim" id="toc-scrim" hidden></div>
  <div class="guide-bar" id="guide-bar" hidden>
    <button type="button" id="toc-open" aria-controls="guide-toc" aria-expanded="false"><span class="ms" aria-hidden="true">format_list_bulleted</span>Konular</button>
    <a href="/rehber/#ara"><span class="ms" aria-hidden="true">search</span>Ara</a>
    <button type="button" id="to-top"><span class="ms" aria-hidden="true">arrow_upward</span>Başa dön</button>
  </div>

${dialog(topic)}

${footer}`;
}

// Eski üretimden kalan, artık kaynağı olmayan konu klasörleri silinir.
for (const entry of await readdir(guideDir, {withFileTypes: true})) {
  if (entry.isDirectory() && !slugs.includes(entry.name)) await rm(path.join(guideDir, entry.name), {recursive: true});
}

const searchIndex = {topics: [], notes: []};
for (const [index, topic] of topics.entries()) {
  const body = await readFile(path.join(source, 'konular', `${topic.slug}.html`), 'utf8');
  for (const [, target] of body.matchAll(/href="\/rehber\/([a-z-]+)\/"/g)) {
    if (!slugs.includes(target)) throw new Error(`${topic.slug} bölümünde bilinmeyen rehber bağlantısı: ${target}`);
  }
  const {html: details, entries} = renderNotes(topic);
  await mkdir(path.join(guideDir, topic.slug), {recursive: true});
  await writeFile(path.join(guideDir, topic.slug, 'index.html'), topicPage(topic, index, body, details), 'utf8');
  searchIndex.topics.push({u: pageUrl(topic), t: topic.title, g: topic.group, i: topic.icon, s: topic.summary, k: topic.keywords, x: plainText(body)});
  for (const entry of entries) searchIndex.notes.push({u: `${pageUrl(topic)}#${entry.id}`, t: entry.title, p: topic.title, x: plainText(entry.body)});
}
await writeFile(path.join(guideDir, 'index.html'), hubPage(), 'utf8');
await writeFile(path.join(guideDir, 'arama.json'), `${JSON.stringify(searchIndex)}\n`, 'utf8');

const pages = ['/', '/rehber/', ...topics.map(pageUrl), '/gizlilik-politikasi/', '/hesap-silme/'];
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${site}${page}</loc></url>`).join('\n')}
</urlset>
`, 'utf8');

console.log(`${topics.length} konu sayfası, ${searchIndex.notes.length} ayrıntılı not ve site haritası üretildi.`);
