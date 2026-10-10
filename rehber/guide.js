(() => {
  const normalize = (text) => text.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rehber ana sayfası: arama konu kartlarını ve ayrıntılı notları birlikte tarar.
  const search = document.getElementById('guide-search');
  if (search) {
    const results = document.getElementById('search-results');
    const groups = document.getElementById('topic-groups');
    const start = document.querySelector('.start-card');
    document.getElementById('ara').hidden = false;
    // Dizin ilk aramada yüklenir; yüklenemezse kartlardaki başlık ve özetle aranır.
    const cards = [...document.querySelectorAll('#topic-groups .topic-card')].map((card) => ({
      u: card.getAttribute('href'), t: card.querySelector('b').textContent, s: card.querySelector('.topic-card-text > span').textContent,
      i: card.querySelector('.badge .ms').textContent, g: card.closest('.hub-group').querySelector('h2').textContent, k: '', x: '',
    }));
    let index = null;
    let loading = null;
    const load = () => {
      loading ??= fetch('/rehber/arama.json').then((response) => (response.ok ? response.json() : null)).catch(() => null).then((data) => {
        index = data && {
          topics: data.topics.map((topic) => ({...topic, n: normalize(`${topic.t} ${topic.s} ${topic.k} ${topic.x}`)})),
          notes: data.notes.map((note) => ({...note, n: normalize(`${note.t} ${note.x}`)})),
        };
      });
      return loading;
    };
    const snippet = (text, terms) => {
      const plain = normalize(text);
      const found = terms.map((term) => plain.indexOf(term)).filter((position) => position >= 0);
      const at = found.length ? Math.max(0, Math.min(...found) - 50) : 0;
      return `${at > 0 ? '…' : ''}${text.slice(at, at + 150).trim()}${at + 150 < text.length ? '…' : ''}`;
    };
    const item = (href, icon, title, detail) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = href;
      if (icon) {
        const badge = document.createElement('span');
        badge.className = 'ms';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = icon;
        link.append(badge);
      }
      const text = document.createElement('span');
      const strong = document.createElement('b');
      strong.textContent = title;
      const small = document.createElement('span');
      small.textContent = detail;
      text.append(strong, small);
      link.append(text);
      li.append(link);
      return li;
    };
    const section = (title, items) => {
      const heading = document.createElement('h2');
      heading.textContent = title;
      const list = document.createElement('ul');
      list.className = 'result-list';
      list.append(...items);
      return [heading, list];
    };
    const render = () => {
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      results.hidden = terms.length === 0;
      groups.hidden = terms.length > 0;
      start.hidden = terms.length > 0;
      if (!terms.length) { results.replaceChildren(); return; }
      const matches = (entry) => terms.every((term) => (entry.n ?? normalize(`${entry.t} ${entry.s} ${entry.g}`)).includes(term));
      const topics = (index?.topics ?? cards).filter(matches);
      const notes = (index?.notes ?? []).filter(matches).slice(0, 12);
      const nodes = [];
      if (topics.length) nodes.push(...section('Konular', topics.map((topic) => item(topic.u, topic.i, topic.t, topic.s))));
      if (notes.length) nodes.push(...section('Ayrıntılı notlarda', notes.map((note) => item(note.u, '', note.t, `${note.p} · ${snippet(note.x, terms)}`))));
      if (!nodes.length) {
        const empty = document.createElement('p');
        empty.className = 'search-empty';
        empty.append('Aramana uyan bir konu yok. Başka bir kelime dene ya da ');
        const mail = document.createElement('a');
        mail.className = 'text-link';
        mail.href = 'mailto:balpydigital.iletisim@gmail.com';
        mail.textContent = 'bize yaz';
        empty.append(mail, '.');
        nodes.push(empty);
      }
      results.replaceChildren(...nodes);
    };
    search.addEventListener('focus', load, {once: true});
    search.addEventListener('input', () => { render(); load().then(render); });
    if (window.location.hash === '#ara') search.focus();
    window.addEventListener('hashchange', () => { if (window.location.hash === '#ara') search.focus(); });
  }

  const topic = document.querySelector('article.topic');
  if (!topic) return;

  // Aramadan gelen not bağlantısı ilgili kapalı başlığı açar.
  const openHash = () => {
    const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
    if (target?.matches('details.note-detail')) {
      target.open = true;
      target.scrollIntoView({block: 'start'});
    }
  };
  openHash();
  window.addEventListener('hashchange', openHash);

  // Telefonda konu listesi alttan açılan bir panel olur; alt çubuk her yerden ulaşılır.
  const bar = document.getElementById('guide-bar');
  const toc = document.getElementById('guide-toc');
  const scrim = document.getElementById('toc-scrim');
  const tocOpen = document.getElementById('toc-open');
  bar.hidden = false;
  document.body.classList.add('has-guide-bar');
  const setToc = (open) => {
    toc.classList.toggle('open', open);
    scrim.hidden = !open;
    tocOpen.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('toc-locked', open);
    if (open) {
      showCurrent();
      (toc.querySelector('[aria-current="page"]') ?? toc.querySelector('a')).focus({preventScroll: true});
    }
    else if (toc.contains(document.activeElement)) tocOpen.focus();
  };
  tocOpen.addEventListener('click', () => setToc(!toc.classList.contains('open')));
  document.getElementById('toc-close').addEventListener('click', () => setToc(false));
  scrim.addEventListener('click', () => setToc(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && toc.classList.contains('open')) setToc(false); });
  window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => { if (event.matches) setToc(false); });
  // Uzun listede açık konu görünür kalır; sayfanın kendisi kaydırılmaz.
  const showCurrent = () => {
    const current = toc.querySelector('[aria-current="page"]');
    if (current) toc.scrollTop = current.offsetTop - toc.clientHeight / 2;
  };
  showCurrent();
  document.getElementById('to-top').addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: reducedMotion() ? 'auto' : 'smooth'});
    document.getElementById('main').focus({preventScroll: true});
  });

  // Ai ile öğrenme: yalnız bu sayfadaki bölümün metni gönderilir.
  const dialog = document.getElementById('ai-learning-dialog');
  const preview = document.getElementById('ai-preview');
  const status = document.getElementById('ai-status');
  const title = topic.querySelector('h1').textContent;
  function sectionText() {
    const content = topic.cloneNode(true);
    content.querySelectorAll('.topic-tools, button, .topic-head').forEach((node) => node.remove());
    content.querySelectorAll('.ms, .topic-details > p').forEach((node) => node.remove());
    content.querySelectorAll('table').forEach((table) => {
      const text = [...table.rows].map((row) => [...row.cells].map((cell) => cell.textContent.trim()).join(' | ')).join('\n');
      table.replaceWith(document.createTextNode(`\n${text}\n`));
    });
    content.querySelectorAll('p, li, h2, h3, summary, dt, dd').forEach((node) => {
      node.prepend(document.createTextNode('\n'));
      node.append(document.createTextNode('\n'));
    });
    return `${title}\n\n${content.textContent.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}`;
  }
  function updatePreview() {
    preview.value = `# BALPY KULLANIM REHBERİ — ${title}\n\n## KULLANICININ ANLATIM İSTEĞİ\nBu bölümün kullanım bilgisini esas alarak Balpy’yi kendi hedefim için nasıl kullanabileceğimi küçük adımlarla anlat. Önce sorumu ve durumumu öğren; gerekli bilgiler eksikse en fazla üç kısa soru sor. Ai ile içerik hazırlama, XML’i ilgili Balpy ekranına aktarma, önizleme, kayıt ve çalışma akışını somut ekran adlarıyla açıkla. Tek yanıtta bütün bölümü anlatma; bir kullanım adımı işle ve devam etmeye hazır olup olmadığımı sor. Aynı sohbette önceki adımları ve yanıtlarımı dikkate al.\n\n## GÖNDERİM KAPSAMI\nYalnız seçtiğim bölüm gönderilmiştir. Başka bölümlerin ayrıntılarını uydurma; gerekirse web rehberindeki bölümün tam adını belirt ve o bölümü aynı sohbete eklememi iste. Kullanım rehberi güncel XML şemasını içermez. İçerik üretmek için ilgili Balpy hazırlama ekranının kılavuzunu ve bağlamını ayrıca göndermem gerekir. XML biçimini bu metinden uydurma.\n\n## ORTAK KULLANIM BİLGİSİ\nBalpy içinde Ai modeli çalışmaz. İlgili ekrandan kılavuz ve seçilen bağlam gönderilir; kullanıcı konuyu ve görevini harici sohbetinde yazar. Ai’ın XML yanıtı aynı ekranda içe aktarılır, incelenir ve onaylanarak kaydedilir. Ai içeriği hazırlar; kullanıcı notu okur, kart ve soruyu çalışır, sonucunu değerlendirir. Kaynak, not, kart ve soru farklı araçlardır. Görev planı yapılacak işleri, çalışma planı süre hedeflerini ve oturum sırasını düzenler.\n\n## SEÇİLEN BÖLÜM\n${sectionText()}\n\nKaynak: https://balpydigital.com/rehber/${topic.id}/\n`;
    document.getElementById('ai-character-count').textContent = `${preview.value.length.toLocaleString('tr')} karakter · tek bölüm`;
    status.textContent = '';
  }
  topic.querySelector('.topic-tools').hidden = false;
  document.getElementById('open-ai-learning').addEventListener('click', () => { updatePreview(); dialog.showModal(); });
  document.getElementById('close-ai-learning').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  async function copySection() {
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = 'Bölüm kopyalandı. Sohbetine yapıştırıp sorunu yazabilirsin.';
      return true;
    } catch {
      preview.focus();
      preview.select();
      status.textContent = 'Tarayıcı panoya erişemedi. Seçili bölüm metnini elle kopyalayabilirsin.';
      return false;
    }
  }
  document.getElementById('copy-ai-section').addEventListener('click', copySection);
  document.getElementById('download-ai-section').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([preview.value], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `balpy-rehber-${topic.id}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status.textContent = 'Yalnız bu bölüm için indirme başlatıldı.';
  });
  const platforms = {chatgpt: 'https://chatgpt.com/', gemini: 'https://gemini.google.com/', claude: 'https://claude.ai/'};
  document.querySelectorAll('[data-ai-platform]').forEach((button) => button.addEventListener('click', async () => {
    // Sekme kullanıcı dokunduğunda açılır; pano izni beklenirken bu hak kaybolmaz.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    const copied = await copySection();
    if (!copied) { tab?.close(); return; }
    if (tab) {
      tab.location.href = platforms[button.dataset.aiPlatform];
      status.textContent = 'Bölüm kopyalandı. Açılan sohbetine yapıştır; orada sorunu yaz.';
    } else {
      status.textContent = 'Bölüm kopyalandı. Tarayıcı yeni sekmeyi engelledi; sohbet uygulamanı açıp yapıştırabilirsin.';
    }
  }));
})();
