(() => {
  // Arama sonuçları bir bölümü gizlemiş olsa da doğrudan bağlantı çalışır.
  const revealHash = (hash) => {
    const id = hash.startsWith('#') ? hash.slice(1) : hash;
    const section = document.getElementById(id);
    if (!section?.classList.contains('hidden-by-search')) return;
    const search = document.getElementById('guide-search');
    search.value = '';
    search.dispatchEvent(new Event('input', {bubbles: true}));
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealHash(link.hash);
  });
  window.addEventListener('hashchange', () => revealHash(window.location.hash));

  // Arama ayrıntılı bir notta eşleşirse o başlık da açılır; kullanıcı
  // eşleşen metni bulmak için bütün kapalı notları denemek zorunda kalmaz.
  const search = document.getElementById('guide-search');
  const normalize = (text) => text.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const detailStates = new Map();
  search.addEventListener('input', () => {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    document.querySelectorAll('.note-detail').forEach((detail) => {
      if (terms.length) {
        if (!detailStates.has(detail)) detailStates.set(detail, detail.open);
        detail.open = terms.every((term) => normalize(detail.textContent).includes(term));
      } else if (detailStates.has(detail)) {
        detail.open = detailStates.get(detail);
        detailStates.delete(detail);
      }
    });
  });

  const dialog = document.getElementById('ai-learning-dialog');
  const topicSelect = document.getElementById('ai-topic');
  const preview = document.getElementById('ai-preview');
  const status = document.getElementById('ai-status');
  const topics = [...document.querySelectorAll('.topic')];
  topicSelect.replaceChildren(...topics.map((topic) => new Option(topic.querySelector('h2').textContent, topic.id)));
  function sectionText(topic) {
    const content = topic.cloneNode(true);
    content.querySelectorAll('.topic-tools, button').forEach((node) => node.remove());
    content.querySelectorAll('.ms, .topic-details > p').forEach((node) => node.remove());
    content.querySelectorAll('table').forEach((table) => {
      const text = [...table.rows].map((row) => [...row.cells].map((cell) => cell.textContent.trim()).join(' | ')).join('\n');
      table.replaceWith(document.createTextNode(`\n${text}\n`));
    });
    content.querySelectorAll('p, li, h2, h3, summary, dt, dd').forEach((node) => {
      node.prepend(document.createTextNode('\n'));
      node.append(document.createTextNode('\n'));
    });
    return content.textContent.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function updatePreview() {
    const topic = document.getElementById(topicSelect.value);
    preview.value = `# BALPY KULLANIM REHBERİ — ${topic.querySelector('h2').textContent}\n\n## KULLANICININ ANLATIM İSTEĞİ\nBu bölümün kullanım bilgisini esas alarak Balpy’yi kendi hedefim için nasıl kullanabileceğimi küçük adımlarla anlat. Önce sorumu ve durumumu öğren; gerekli bilgiler eksikse en fazla üç kısa soru sor. AI ile içerik hazırlama, XML’i ilgili Balpy ekranına aktarma, önizleme, kayıt ve çalışma akışını somut ekran adlarıyla açıkla. Tek yanıtta bütün bölümü anlatma; bir kullanım adımı işle ve devam etmeye hazır olup olmadığımı sor. Aynı sohbette önceki adımları ve yanıtlarımı dikkate al.\n\n## GÖNDERİM KAPSAMI\nYalnız seçtiğim bölüm gönderilmiştir. Başka bölümlerin ayrıntılarını uydurma; gerekirse web rehberindeki bölümün tam adını belirt ve o bölümü aynı sohbete eklememi iste. Kullanım rehberi güncel XML şemasını içermez. İçerik üretmek için ilgili Balpy hazırlama ekranının kılavuzunu ve bağlamını ayrıca göndermem gerekir. XML biçimini bu metinden uydurma.\n\n## ORTAK KULLANIM BİLGİSİ\nBalpy içinde AI modeli çalışmaz. İlgili ekrandan kılavuz ve seçilen bağlam gönderilir; kullanıcı konuyu ve görevini harici sohbetinde yazar. AI’ın XML yanıtı aynı ekranda içe aktarılır, incelenir ve onaylanarak kaydedilir. AI içeriği hazırlar; kullanıcı notu okur, kart ve soruyu çalışır, sonucunu değerlendirir. Kaynak, not, kart ve soru farklı araçlardır. Görev planı yapılacak işleri, çalışma planı süre hedeflerini ve oturum sırasını düzenler.\n\n## SEÇİLEN BÖLÜM\n${sectionText(topic)}\n\nKaynak: https://balpydigital.com/rehber/#${topic.id}\n`;
    document.getElementById('ai-character-count').textContent = `${preview.value.length.toLocaleString('tr')} karakter · tek bölüm`;
    status.textContent = '';
  }
  function openLearning(id = 'ai') {
    topicSelect.value = topics.some((topic) => topic.id === id) ? id : 'ai';
    updatePreview();
    dialog.showModal();
  }
  topicSelect.addEventListener('change', updatePreview);
  document.getElementById('open-ai-learning').hidden = false;
  document.getElementById('open-ai-learning').addEventListener('click', () => openLearning());
  document.getElementById('close-ai-learning').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  topics.forEach((topic) => {
    const tools = document.createElement('div');
    tools.className = 'topic-tools';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button ghost small';
    button.textContent = 'Bu bölümü AI ile öğren';
    button.setAttribute('aria-label', `${topic.querySelector('h2').textContent} bölümünü AI ile öğren`);
    button.addEventListener('click', () => openLearning(topic.id));
    tools.append(button);
    topic.append(tools);
  });
  async function copySection() {
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = 'Seçilen bölüm kopyalandı. Sohbetine yapıştırıp sorunu yazabilirsin.';
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
    link.download = `balpy-rehber-${topicSelect.value}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status.textContent = 'Yalnız seçilen bölüm için indirme başlatıldı.';
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
