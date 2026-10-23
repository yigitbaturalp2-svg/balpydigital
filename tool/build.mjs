import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Site, _kaynak/ altındaki HTML parçalarından statik sayfalar olarak üretilir.
// GitHub Pages alt çizgiyle başlayan klasörü yayınlamaz; üretilen HTML ise
// derleyici olmadan açılır. Üretilen dosyalar elle değiştirilmez.
// Bağımlılık yok: Node 20+ yeterli.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, '_kaynak');
const guideDir = path.join(root, 'rehber');
const site = 'https://balpydigital.com';
const supportMail = 'balpydigital.iletisim@gmail.com';
const year = 2026;

const config = JSON.parse(await readFile(path.join(source, 'rehber.json'), 'utf8'));
const pages = config.groups.flatMap((group) => group.pages.map((page) => ({ ...page, group: group.title })));
const bySlug = new Map(pages.map((page) => [page.slug, page]));
const errors = [];

// ---------------------------------------------------------------- yardımcılar

const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', rsaquo: '›' };
const plainText = (html) => html
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<span class="path">([\s\S]*?)<\/span><\/span>/g, (match) => match.replace(/<\/span><span>/g, ' › '))
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(amp|lt|gt|quot|#39|nbsp|rsaquo);/g, (_, name) => entities[name])
  .replace(/\s+/g, ' ')
  .trim();
const turkish = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const slugify = (text) => text.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (char) => turkish[char])
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pageUrl = (page) => `/rehber/${page.slug}/`;
const tone = (page) => (page.tone ? ` tone-${page.tone}` : '');

// Simgeler 24×24 çizgi çizimlerdir; sayfaya yalnız kullanılanlar gömülür.
// Eski ikon yazı tipi yalnız belirli adları içeriyordu, yeni bir ad
// eklendiğinde ekranda adın kendisi yazıyordu.
const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4M12 17h.01"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
  note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5M8 9h8M8 13h4"/>',
  cards: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v11"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  home: '<path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  shield: '<path d="m12 3 8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 9v6l5-3z"/>',
  chart: '<path d="M3 20h18M6 16v-5M11 16V6M16 16v-8"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  android: '<path d="M4 18v-2a8 8 0 0 1 16 0v2z"/><path d="M7.5 9 6 6.5M16.5 9 18 6.5M9 14h.01M15 14h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sigma: '<path d="M17 5H7l6 7-6 7h10"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
};
const icon = (name, extra = '') => {
  if (!icons[name]) errors.push(`Bilinmeyen simge: ${name}`);
  return `<svg class="icon${extra ? ` ${extra}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
};
const sprite = (html) => {
  const used = [...new Set([...html.matchAll(/href="#i-([a-z-]+)"/g)].map((match) => match[1]))].sort();
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${used.map((name) => `<symbol id="i-${name}" viewBox="0 0 24 24">${icons[name] ?? ''}</symbol>`).join('')}</svg>`;
};

const calloutIcons = { note: 'info', tip: 'bulb', warn: 'alert', ai: 'spark', danger: 'alert' };

// Parçalardaki kısa yazımlar:
//   {{i:ad}}                 → simge
//   {{yol:Profil > Ayarlar}} → uygulamadaki ekran yolu
//   <div class="callout tip" title="İpucu"> → başlıklı not kutusu
function expand(html, where) {
  return html
    .replace(/\{\{i:([a-z-]+)\}\}/g, (_, name) => icon(name))
    .replace(/\{\{yol:([^}]+)\}\}/g, (_, value) => `<span class="path">${value.split('>').map((part) => `<span>${part.trim()}</span>`).join('')}</span>`)
    .replace(/<div class="callout( [a-z]+)?" title="([^"]+)">/g, (_, type = ' note', title) => {
      const kind = type.trim();
      if (!calloutIcons[kind]) errors.push(`${where}: bilinmeyen kutu türü ${kind}`);
      return `<div class="callout ${kind}" role="note"><p class="callout-title">${icon(calloutIcons[kind] ?? 'info')}${title}</p>`;
    })
    .replace(/\{\{[^}]*\}\}/g, (match) => { errors.push(`${where}: çözülemeyen kısa yazım ${match}`); return match; });
}

// Parçanın başındaki <!--meta {...} --> sayfa bilgisidir.
function splitMeta(text, where) {
  const match = text.match(/^\s*<!--meta\s+([\s\S]*?)-->\s*/);
  if (!match) return { meta: {}, body: text };
  try {
    return { meta: JSON.parse(match[1]), body: text.slice(match[0].length) };
  } catch (error) {
    errors.push(`${where}: meta okunamadı (${error.message})`);
    return { meta: {}, body: text.slice(match[0].length) };
  }
}

// h2/h3 başlıklarına kalıcı kimlik verir. Kimlik yazılmışsa korunur; böylece
// başlık metni değişse de dışarıdan verilen bağlantılar kırılmaz.
function addAnchors(html, where) {
  const ids = new Set();
  const headings = [];
  const out = html.replace(/<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, inner) => {
    const given = attrs.match(/\sid="([^"]+)"/);
    let id = given ? given[1] : slugify(plainText(inner)) || 'bolum';
    if (!given) for (let n = 2; ids.has(id); n += 1) id = `${slugify(plainText(inner))}-${n}`;
    if (ids.has(id)) errors.push(`${where}: aynı başlık kimliği iki kez: ${id}`);
    if (reservedIds.has(id)) errors.push(`${where}: başlık kimliği şablonla çakışıyor: ${id} (başlığa başka bir id yaz)`);
    ids.add(id);
    const text = plainText(inner);
    headings.push({ level: Number(level), id, text });
    const rest = attrs.replace(/\sid="[^"]+"/, '');
    return `<h${level} id="${id}"${rest}>${inner}<a class="anchor" href="#${id}" aria-label="“${escape(text)}” bölümüne bağlantı">#</a></h${level}>`;
  });
  return { html: out, headings, ids };
}

// Geniş tablo telefonda sayfayı değil kendi kutusunu yatay kaydırır.
// Parçada zaten sarılmış tablo ikinci kez sarılmaz.
const wrapTables = (html) => html.replace(/(<div class="table-wrap">\s*)?<table>([\s\S]*?)<\/table>/g,
  (match, wrapped, inner) => (wrapped ? match : `<div class="table-wrap"><table>${inner}</table></div>`));

// Şablonun kendi kimlikleri; bir başlık bunlardan birini alırsa sayfa
// içi bağlantılar yanlış yere gider.
const reservedIds = new Set(['main', 'rehber-metni', 'sidebar', 'search-dialog', 'search-input', 'search-results', 'search-hint', 'ask-dialog', 'ask-title', 'ask-status']);

// ---------------------------------------------------------------- şablon

function head({ title, description, url, type = 'website', extra = '', robots = '' }) {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">${robots ? `\n  <meta name="robots" content="${robots}">` : ''}
  <link rel="canonical" href="${site}${url}">
  <meta name="theme-color" content="#090f1b" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#f5f7fb" media="(prefers-color-scheme: light)">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Balpy">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${site}${url}">
  <meta property="og:image" content="${site}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/assets/brand/favicon-32.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/assets/fonts/outfit-700.woff" as="font" type="font/woff" crossorigin>
  <script>try{var t=localStorage.getItem('balpy-tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>${extra}
  <link rel="stylesheet" href="/site.css">
  <script src="/site.js" defer></script>
</head>`;
}

const topNav = [
  { key: 'home', href: '/', label: 'Ana sayfa' },
  { key: 'hub', href: '/rehber/', label: 'Rehber' },
  { key: 'ilk-adimlar', href: '/rehber/ilk-adimlar/', label: 'İlk adımlar' },
  { key: 'ai', href: '/rehber/ai/', label: 'Ai ile çalışma' },
  { key: 'sss', href: '/rehber/sss/', label: 'Sık sorulanlar' },
];

function topbar(current, { docs }) {
  const mark = (key) => (key === current ? ' aria-current="page"' : '');
  return `  <a class="skip-link" href="#main">İçeriğe geç</a>
  <div class="backdrop" aria-hidden="true"></div>
  <header class="topbar">
    <div class="topbar-row">
      <button class="icon-button menu-button" type="button" data-nav-open aria-controls="sidebar" aria-expanded="false" aria-label="Menüyü aç">${icon('menu')}</button>
      <a class="brand" href="/" aria-label="Balpy ana sayfa"><img src="/assets/brand/balpy-mark-96.png" alt="" width="34" height="34">Balpy${docs ? '<span class="brand-tag">Rehber</span>' : ''}</a>
      <nav class="top-nav" aria-label="Ana menü">
        ${topNav.filter((item) => !(docs && item.key === 'home')).map((item) => `<a href="${item.href}"${mark(item.key)}>${item.label}</a>`).join('\n        ')}
      </nav>
      <div class="top-actions">
        <button class="search-trigger" type="button" data-search-open aria-label="Rehberde ara">${icon('search')}<span>Rehberde ara</span><kbd>/</kbd></button>
        <button class="icon-button theme-toggle" type="button" data-theme-toggle aria-label="Açık ya da koyu temaya geç">${icon('sun', 'sun')}${icon('moon', 'moon')}</button>
      </div>
    </div>
  </header>`;
}

function sidebar(currentSlug, { drawerOnly }) {
  const groups = config.groups.map((group) => `      <div class="nav-group">
        <p>${escape(group.title)}</p>
        <ul>
${group.pages.map((page) => `          <li><a class="nav-link${tone(page)}" href="${pageUrl(page)}"${page.slug === currentSlug ? ' aria-current="page"' : ''}>${icon(page.icon)}${escape(page.nav ?? page.title)}</a></li>`).join('\n')}
        </ul>
      </div>`).join('\n');
  return `    <aside class="sidebar${drawerOnly ? ' drawer-only' : ''}" id="sidebar" aria-label="Rehber konuları">
      <div class="sidebar-head"><a class="brand" href="/"><img src="/assets/brand/balpy-mark-96.png" alt="" width="34" height="34">Balpy</a><button class="icon-button" type="button" data-nav-close aria-label="Menüyü kapat">${icon('close')}</button></div>
      <div class="nav-group nav-site">
        <ul>
          <li><a class="nav-link" href="/">${icon('home')}Ana sayfa</a></li>
          <li><a class="nav-link" href="/rehber/"${currentSlug === 'hub' ? ' aria-current="page"' : ''}>${icon('compass')}Rehber girişi</a></li>
        </ul>
      </div>
${groups}
    </aside>
    <div class="scrim" data-nav-close aria-hidden="true"></div>`;
}

const footer = `  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-row">
        <a class="brand" href="/"><img src="/assets/brand/balpy-mark-96.png" alt="" width="28" height="28">Balpy</a>
        <nav class="footer-nav" aria-label="Alt menü">
          <a href="/rehber/">Rehber</a>
          <a href="/rehber/sss/">Sık sorulanlar</a>
          <a href="/gizlilik-politikasi/">Gizlilik Politikası</a>
          <a href="/hesap-silme/">Hesap ve Veri Silme</a>
          <a href="/sifre-yenile/">Şifre Yenile</a>
          <a href="mailto:${supportMail}">İletişim</a>
        </nav>
      </div>
      <p class="footer-note">© ${year} Balpy · <a class="text-link" href="mailto:${supportMail}">${supportMail}</a></p>
    </div>
  </footer>`;

const searchDialog = `  <dialog class="search-dialog" id="search-dialog" aria-label="Rehberde ara">
    <div class="search-box" role="search">
      ${icon('search')}
      <input id="search-input" type="search" placeholder="Ara: tekrar, PDF, kılavuz, bildirim…" aria-label="Aranacak kelime" aria-controls="search-results" autocomplete="off" spellcheck="false" enterkeyhint="search">
      <button class="icon-button" type="button" data-search-close aria-label="Aramayı kapat">${icon('close')}</button>
    </div>
    <div class="search-results" id="search-results" role="listbox" aria-label="Arama sonuçları"></div>
    <p class="search-hint" id="search-hint">Örnek: <b>aralıklı tekrar</b>, <b>düzeltme metni</b>, <b>pomodoro</b>, <b>transkript</b>. Türkçe karakterleri yazmasan da bulur.</p>
  </dialog>`;

const askDialog = (page) => `  <dialog class="ask-dialog" id="ask-dialog" aria-labelledby="ask-title">
    <button class="icon-button dialog-close" type="button" data-ask-close aria-label="Kapat">${icon('close')}</button>
    <h2 id="ask-title">Bu sayfayı Ai'a sor</h2>
    <p>“${escape(page.title)}” sayfasının metni kopyalanır. Sohbetine yapıştırıp sorunu yaz: “Ben YKS'ye hazırlanıyorum, bunu nasıl kullanmalıyım?” gibi.</p>
    <p>Bu metin kullanım rehberidir. Not, kart ya da soru hazırlatmak için Balpy'deki ilgili Ai ekranının kılavuzunu ayrıca gönderirsin.</p>
    <div class="ask-actions">
      <button class="button primary" type="button" data-ask-copy>${icon('copy')}Sayfayı kopyala</button>
      <div class="row">
        <a class="button ghost small" href="https://chatgpt.com/" target="_blank" rel="noopener" data-ask-open>ChatGPT</a>
        <a class="button ghost small" href="https://gemini.google.com/app" target="_blank" rel="noopener" data-ask-open>Gemini</a>
        <a class="button ghost small" href="https://claude.ai/new" target="_blank" rel="noopener" data-ask-open>Claude</a>
      </div>
    </div>
    <p class="ask-status" id="ask-status" role="status" aria-live="polite"></p>
  </dialog>`;

const toTop = `  <button class="to-top" type="button" data-to-top aria-label="Sayfanın başına dön">${icon('arrow-up')}</button>`;

function finish(html) {
  // Simge tanımları en son eklenir; hangi simgelerin kullanıldığı ancak sayfa
  // tamamlanınca bilinir.
  return html.replace(/(<body[^>]*>)/, `$1\n${sprite(html)}`);
}

// ---------------------------------------------------------------- rehber

function readingMinutes(html) {
  const words = plainText(html).split(' ').length;
  return Math.max(1, Math.round(words / 190));
}

function tocList(headings, cls) {
  const items = headings.filter((heading) => heading.level === 2);
  if (items.length < 2) return '';
  if (cls === 'inline') {
    return `<details class="toc-inline"><summary>Bu sayfada · ${items.length} bölüm${icon('chevron-down')}</summary><ol>${items.map((heading) => `<li><a href="#${heading.id}">${escape(heading.text)}</a></li>`).join('')}</ol></details>`;
  }
  return `<nav class="toc" aria-label="Bu sayfada"><p>Bu sayfada</p><ol>${items.map((heading) => `<li><a href="#${heading.id}">${escape(heading.text)}</a></li>`).join('')}</ol></nav>`;
}

function pager(index) {
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const link = (page, kind) => (page
    ? `<a class="${kind}" href="${pageUrl(page)}"><small>${kind === 'prev' ? `${icon('arrow-left')}Önceki` : `Sonraki${icon('arrow-right')}`}</small><b>${escape(page.title)}</b></a>`
    : '<span></span>');
  return `<nav class="pager" aria-label="Önceki ve sonraki sayfa">${link(prev, 'prev')}${link(next, 'next')}</nav>`;
}

function topicPage(page, index, rendered) {
  const toc = tocList(rendered.headings, 'side');
  const html = `${head({ title: `${page.title} | Balpy Rehberi`, description: page.summary, url: pageUrl(page), type: 'article' })}
<body class="docs-page">
${topbar(page.slug === 'ilk-adimlar' || page.slug === 'ai' || page.slug === 'sss' ? page.slug : 'hub', { docs: true })}
  <div class="docs${toc ? ' has-toc' : ''}">
${sidebar(page.slug, { drawerOnly: false })}
    <main class="doc" id="main" tabindex="-1">
      <nav class="crumbs" aria-label="Konum"><a href="/rehber/">Rehber</a>${icon('chevron-right')}<span>${escape(page.group)}</span></nav>
      <header class="doc-head">
        <h1>${escape(page.title)}</h1>
        <p class="doc-lead">${escape(page.summary)}</p>
        <div class="doc-tools"><span>${readingMinutes(rendered.html)} dk okuma</span><span class="sep" aria-hidden="true"></span><button class="button ghost" type="button" data-ask-open-dialog>${icon('spark')}Bu sayfayı Ai'a sor</button></div>
        ${tocList(rendered.headings, 'inline')}
      </header>
      <article class="prose" id="rehber-metni">
${rendered.html.trim()}
      </article>
      ${pager(index)}
      <p class="doc-foot">Bu sayfada eksik ya da yanlış bir şey mi gördün? <a href="mailto:${supportMail}?subject=${encodeURIComponent(`Rehber: ${page.title}`)}">Bize yaz</a>; düzeltelim.</p>
    </main>
    ${toc}
  </div>
${footer}
${toTop}
${searchDialog}
${askDialog(page)}
</body>
</html>
`;
  return finish(html);
}

function hubPage() {
  // Uygulama /rehber/#ai adresini açar; eski site de konuları #konu ile
  // bağlıyordu. Parça sunucuya gitmediği için yönlendirme tarayıcıda yapılır.
  const targets = Object.fromEntries([...pages.map((page) => [page.slug, page.slug]), ...Object.entries(config.redirects ?? {})]);
  const redirect = `
  <script>(function(){var m=${JSON.stringify(targets)},id=decodeURIComponent(location.hash.slice(1));if(Object.prototype.hasOwnProperty.call(m,id))location.replace('/rehber/'+m[id]+'/');})();</script>`;
  const groups = config.groups.map((group) => `      <section class="hub-group" aria-labelledby="grup-${slugify(group.title)}">
        <h2 id="grup-${slugify(group.title)}">${escape(group.title)}</h2>
        <p>${escape(group.description)}</p>
        <div class="link-cards">
${group.pages.map((page) => `          <a class="link-card${tone(page)}" href="${pageUrl(page)}"><span class="badge">${icon(page.icon)}</span><b>${escape(page.title)}</b><span>${escape(page.summary)}</span></a>`).join('\n')}
        </div>
      </section>`).join('\n');
  const html = `${head({
    title: 'Kullanım Rehberi | Balpy',
    description: "Balpy'nin bütün ekranları adım adım: koleksiyon, kaynak, not, kart ve soru; kendi Ai sohbetinle XML ile içerik hazırlama; aralıklı tekrar, günlük görevler, hedefler ve sayaç.",
    url: '/rehber/',
    extra: redirect,
  })}
<body class="hub-page">
${topbar('hub', { docs: true })}
  <div class="docs">
${sidebar('hub', { drawerOnly: false })}
    <main class="doc hub-body" id="main" tabindex="-1">
      <section class="hub-hero">
        <span class="eyebrow">Balpy kullanım rehberi</span>
        <h1>Balpy'yi ekran ekran öğren</h1>
        <p class="doc-lead">Her konu kendi sayfasında, telefonda rahat okunacak uzunlukta. Ne arıyorsan yaz ya da aşağıdan bir başlık seç.</p>
        <button class="hub-search" type="button" data-search-open>${icon('search')}<span>Rehberde ara: tekrar, PDF, kılavuz…</span></button>
        <a class="start-card" href="/rehber/ilk-adimlar/"><span class="badge">${icon('flag')}</span><span><b>Yeni misin? İlk adımlarla başla</b><span>Hesaptan ilk tekrara kadar ilk gününün sırası.</span></span>${icon('arrow-right')}</a>
      </section>
${groups}
    </main>
  </div>
${footer}
${toTop}
${searchDialog}
</body>
</html>
`;
  return finish(html);
}

// ---------------------------------------------------------------- tekil sayfalar

function standalonePage({ meta, body, url, current, kind }) {
  const main = kind === 'legal'
    ? `  <main id="main" class="legal" tabindex="-1">
    <div class="wrap">
      <article class="legal-card">
        <h1>${escape(meta.heading ?? meta.title)}</h1>
        ${meta.updated ? `<p class="legal-meta">${escape(meta.updated)}</p>` : ''}
        <div class="prose">
${body.trim()}
        </div>
      </article>
    </div>
  </main>`
    : `  <main id="main" tabindex="-1">
${body.trim()}
  </main>`;
  const html = `${head({ title: meta.title, description: meta.description, url, robots: meta.robots ?? '' })}
<body class="${kind}-page">
${topbar(current, { docs: false })}
  <div class="docs-drawer">
${sidebar('', { drawerOnly: true })}
  </div>
${main}
${footer}
${searchDialog}
</body>
</html>
`;
  return finish(html);
}

// ---------------------------------------------------------------- denetimler

function checkLinks(html, where, ownIds, anchorsBySlug) {
  for (const [, target] of html.matchAll(/href="([^"]+)"/g)) {
    if (target.startsWith('#')) {
      const id = target.slice(1);
      if (id && !id.startsWith('i-') && !ownIds.has(id) && !["main", "rehber-metni"].includes(id)) errors.push(`${where}: sayfa içinde olmayan bağlantı ${target}`);
      continue;
    }
    const guide = target.match(/^\/rehber\/([a-z-]+)\/(?:#([a-z0-9-]+))?$/);
    if (guide) {
      const [, slug, id] = guide;
      if (!bySlug.has(slug)) errors.push(`${where}: bilinmeyen rehber sayfası ${target}`);
      else if (id && !anchorsBySlug.get(slug)?.has(id)) errors.push(`${where}: ${slug} sayfasında olmayan bölüm #${id}`);
      continue;
    }
    if (target.startsWith('/') && !['/', '/rehber/', '/gizlilik-politikasi/', '/hesap-silme/', '/sifre-yenile/'].includes(target)
      && !/^\/(assets|site\.|favicon|og\.png|rehber\/arama\.json)/.test(target)) {
      errors.push(`${where}: tanınmayan site içi bağlantı ${target}`);
    }
  }
}

// ---------------------------------------------------------------- derleme

for (const page of pages) {
  if (!/^[a-z-]+$/.test(page.slug)) errors.push(`Geçersiz sayfa adresi: ${page.slug}`);
  if (!page.summary || !page.icon) errors.push(`${page.slug}: özet ya da simge eksik`);
}
if (bySlug.size !== pages.length) errors.push('Aynı sayfa adresi iki kez tanımlanmış.');

const rendered = new Map();
for (const page of pages) {
  const raw = await readFile(path.join(source, 'rehber', `${page.slug}.html`), 'utf8');
  const anchored = addAnchors(wrapTables(expand(raw, page.slug)), page.slug);
  rendered.set(page.slug, anchored);
}
const anchorsBySlug = new Map([...rendered].map(([slug, value]) => [slug, value.ids]));

// Eski üretimden kalan, artık kaynağı olmayan klasörler silinir.
const redirects = config.redirects ?? {};
for (const entry of await readdir(guideDir, { withFileTypes: true })) {
  if (entry.isDirectory() && !bySlug.has(entry.name) && !(entry.name in redirects)) await rm(path.join(guideDir, entry.name), { recursive: true });
  if (entry.isFile() && !['index.html', 'arama.json'].includes(entry.name)) await rm(path.join(guideDir, entry.name));
}

// Adı değişen sayfaların eski adresi yeni sayfaya yönlenir; GitHub Pages
// sunucu tarafında yönlendirme yapmadığı için sayfa kendisi yönlendirir.
for (const [from, to] of Object.entries(redirects)) {
  if (bySlug.has(from)) errors.push(`Yönlendirme kaynağı aynı zamanda sayfa: ${from}`);
  if (!bySlug.has(to)) errors.push(`Yönlendirme hedefi yok: ${to}`);
  const target = `/rehber/${to}/`;
  await mkdir(path.join(guideDir, from), { recursive: true });
  await writeFile(path.join(guideDir, from, 'index.html'), `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Sayfa taşındı | Balpy Rehberi</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${site}${target}">
  <meta http-equiv="refresh" content="0; url=${target}">
  <script>location.replace('${target}' + location.hash);</script>
</head>
<body>
  <p>Bu sayfa taşındı: <a href="${target}">${escape(bySlug.get(to)?.title ?? to)}</a></p>
</body>
</html>
`, 'utf8');
}

const searchIndex = [];
for (const [index, page] of pages.entries()) {
  const value = rendered.get(page.slug);
  checkLinks(value.html, page.slug, value.ids, anchorsBySlug);
  await mkdir(path.join(guideDir, page.slug), { recursive: true });
  await writeFile(path.join(guideDir, page.slug, 'index.html'), topicPage(page, index, value), 'utf8');

  // Arama sonucu doğrudan ilgili bölümü açsın diye her h2 ayrı kayıttır.
  const parts = value.html.split(/(?=<h2 id=")/);
  searchIndex.push({ u: pageUrl(page), t: page.title, p: page.group, k: page.keywords ?? '', x: `${page.summary} ${plainText(parts[0])}`.slice(0, 600) });
  for (const part of parts.slice(1)) {
    const id = part.match(/^<h2 id="([^"]+)"/)[1];
    const heading = plainText(part.match(/^<h2[^>]*>([\s\S]*?)<a class="anchor"/)[1]);
    searchIndex.push({ u: `${pageUrl(page)}#${id}`, t: heading, p: page.title, k: '', x: plainText(part.replace(/^<h2[\s\S]*?<\/h2>/, '')) });
  }
}
await writeFile(path.join(guideDir, 'index.html'), hubPage(), 'utf8');
await writeFile(path.join(guideDir, 'arama.json'), `${JSON.stringify(searchIndex)}\n`, 'utf8');

const standalone = [
  { file: 'ana-sayfa.html', out: 'index.html', url: '/', current: 'home', kind: 'home' },
  { file: '404.html', out: '404.html', url: '/404.html', current: '', kind: 'notfound' },
  { file: 'gizlilik-politikasi.html', out: 'gizlilik-politikasi/index.html', url: '/gizlilik-politikasi/', current: '', kind: 'legal' },
  { file: 'hesap-silme.html', out: 'hesap-silme/index.html', url: '/hesap-silme/', current: '', kind: 'legal' },
];
for (const item of standalone) {
  const raw = await readFile(path.join(source, 'sayfalar', item.file), 'utf8');
  const { meta, body } = splitMeta(raw, item.file);
  const expanded = expand(body, item.file);
  const ids = new Set([...expanded.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  checkLinks(expanded, item.file, ids, anchorsBySlug);
  await mkdir(path.dirname(path.join(root, item.out)), { recursive: true });
  await writeFile(path.join(root, item.out), standalonePage({ meta, body: expanded, url: item.url, current: item.current, kind: item.kind }), 'utf8');
}

const sitemap = ['/', '/rehber/', ...pages.map(pageUrl), '/gizlilik-politikasi/', '/hesap-silme/'];
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((url) => `  <url><loc>${site}${url}</loc></url>`).join('\n')}
</urlset>
`, 'utf8');

if (errors.length) {
  console.error(`Derleme hataları (${errors.length}):\n- ${[...new Set(errors)].join('\n- ')}`);
  process.exit(1);
}
console.log(`${pages.length} rehber sayfası, ${searchIndex.length} arama kaydı, ${standalone.length} tekil sayfa ve site haritası üretildi.`);
