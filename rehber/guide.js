(() => {
  const form = document.getElementById('path-form');
  if (!form) return;

  const tracks = {
    yks: {
      title: 'YKS', placeholder: 'Örn. TYT Matematik · Problemler', example: 'Problemler',
      description: 'TYT ve AYT konularını ders koleksiyonlarında düzenle; zorlandığın konu için AI ile not, kart veya soru hazırlat.',
      stages: ['TYT', 'AYT · Sayısal', 'AYT · Eşit ağırlık', 'AYT · Sözel', 'YDT'],
      examples: {'TYT': 'TYT Matematik · Problemler', 'AYT · Sayısal': 'AYT Matematik · Fonksiyonlar', 'AYT · Eşit ağırlık': 'AYT Edebiyat · Roman', 'AYT · Sözel': 'AYT Tarih · Osmanlı kültür ve medeniyeti', 'YDT': 'İngilizce okuduğunu anlama'},
      approach: 'Her ders için bir koleksiyonla başla. Tek bir konuyu anlamak, hatırlamak ve uygulamak için uygun içeriği hazırlat; günlük tekrarları Ana Sayfa’dan takip et.',
    },
    kpss: {
      title: 'KPSS', placeholder: 'Örn. Tarih · Osmanlı kültür ve medeniyeti', example: 'Osmanlı kültür ve medeniyeti',
      description: 'Bilgi yoğun konuları hatırlama kartlarıyla, uygulama gerektiren konuları çözümlü sorularla çalış. Hangi ders ve ihtiyaçla başladığını seç.',
      stages: ['Genel kültür', 'Genel yetenek', 'Alan dersleri', 'Karma tekrar'],
      examples: {'Genel kültür': 'Tarih · Osmanlı kültür ve medeniyeti', 'Genel yetenek': 'Matematik · Problemler', 'Alan dersleri': 'İktisat · Arz ve talep', 'Karma tekrar': 'Tarih · Karıştırdığım kavramlar'},
      approach: 'Dersleri koleksiyonlara, konuları bölümlere ayır. Birbiriyle karıştırdığın bilgileri karşılaştırma kartlarıyla, uygulamayı ders sorularıyla çalışabilirsin.',
    },
    universite: {
      title: 'Üniversite', placeholder: 'Örn. İktisat · Arz ve talep', example: 'Arz ve talep',
      description: 'Ders slaytlarını, kitap bölümlerini ve kendi notlarını bir araya getir. Konuyu anlamak veya vize ve final için uygulama yapmakla başlayabilirsin.',
      stages: ['Ders takibi', 'Vize / final', 'Uygulama / problem', 'Mesleki dersler'],
      examples: {'Ders takibi': 'İktisat · Arz ve talep', 'Vize / final': 'İstatistik · Olasılık', 'Uygulama / problem': 'Matematik · Doğrusal denklemler', 'Mesleki dersler': 'Proje yönetiminin temel kavramları'},
      approach: 'Her ders veya modül için bir koleksiyon aç. Ders materyalinden açıklayıcı not, temel kavram kartları ve uygulama soruları hazırlatarak ilerle.',
    },
    tip: {
      title: 'Tıp', placeholder: 'Örn. Anatomi · Üst ekstremite', example: 'Üst ekstremite anatomisi',
      description: 'Ders kitabındaki kavram, mekanizma ve ilişkileri birlikte çalış. Terimi hatırlamak için kart, süreci anlamak için not, uygulamak için ders sorusu kullan.',
      stages: ['Temel bilimler', 'Klinik dersler', 'Komite / ders sınavı', 'Genel tekrar'],
      examples: {'Temel bilimler': 'Anatomi · Üst ekstremite', 'Klinik dersler': 'Kardiyoloji dersindeki temel kavramlar', 'Komite / ders sınavı': 'Fizyoloji · Mekanizmaların ilişkisi', 'Genel tekrar': 'Anatomide karıştırdığım terimler'},
      approach: 'Ders veya komiteyi bir koleksiyonda düzenle. Kaynağına dayalı kavram ve mekanizma notlarından kart ve ders sorusu hazırlat; bilgileri ders kaynaklarınla kontrol et.',
    },
    genel: {
      title: 'Genel öğrenme', placeholder: 'Örn. İngilizce · Günlük ifadeler', example: 'Günlük İngilizce ifadeler',
      description: 'Okul dersi, yabancı dil, kitap veya mesleki bir konu: ne öğrenmek istediğini seç, kendi materyalin ve ihtiyacınla başla.',
      stages: ['Okul dersleri', 'Yabancı dil', 'Kitap / kişisel öğrenme', 'Mesleki gelişim'],
      examples: {'Okul dersleri': 'Matematik · Denklemler', 'Yabancı dil': 'İngilizce · Günlük ifadeler', 'Kitap / kişisel öğrenme': 'Okuduğum kitabın ilk bölümü', 'Mesleki gelişim': 'Proje yönetiminin temel kavramları'},
      approach: 'Bir ders, kitap veya öğrenme hedefi için koleksiyon aç. Önce tek bir konuyu çalış; aynı anlatımdan ihtiyacına göre kart veya soru hazırlat.',
    },
  };
  const needs = {
    understand: {title: 'Konuyu anlamak için notla başla', kind: 'not', section: 'notlar', path: 'Notlar sekmesi → + → Ai ile Not hazırla', request: 'Düzeyime uygun, kavramları birbirine bağlayan ve örneklerle açıklayan bir not hazırla.'},
    remember: {title: 'Hatırlama kartlarıyla başla', kind: 'kart', section: 'kartlar', path: 'Kartlar sekmesi → + → Ai ile kart hazırla', request: 'Temel bilgileri cevaba bakmadan hatırlamamı sağlayacak kartlar hazırla. Karıştırılabilecek kavramları da karşılaştır.'},
    practice: {title: 'Çözümlü ders sorularıyla başla', kind: 'soru', section: 'sorular', path: 'Sorular sekmesi → + → Ai ile hazırla', request: 'Konuyu uygulayabildiğimi sınayan ders soruları, ipuçları ve açıklamalı çözümler hazırla.'},
    plan: {title: 'Yapılacak işleri planla', kind: 'günlük görev planı', section: 'planlama', path: 'Ana Sayfa → Görevler → Ai ile hazırla', request: 'Bu konu için okuma, hatırlama ve uygulama içeren bir günlük görev planı hazırla. Süreye göre planlamak için ayırabildiğim zamanı benden öğren.'},
  };
  const materials = {
    pdf: {title: 'PDF, kitap veya ders slaytı', instruction: 'PDF’yi Kaynaklar’a ekle veya ilgili sayfaları fotoğrafla. AI ekranında yalnız çalışacağın sayfaları bağlama ekle.', request: 'Gönderdiğim ders materyalinin ilgili bölümüne dayan.'},
    video: {title: 'Video veya ders kaydı', instruction: 'Video kaynağını ekle. Transkript varsa kontrol edip ilgili kısmını AI paketine ekle; video bağlantısı tek başına konuşma metnini taşımaz.', request: 'Paylaştığım transkriptteki ilgili bölüme dayan.'},
    notes: {title: 'Kendi notlarım', instruction: 'Notların Balpy’deyse ilgili AI ekranında mevcut not bağlamını seç. Dışarıdaysa yalnız ilgili kısmını kendi sohbetine ekle.', request: 'Paylaştığım notların ilgili kısmına dayan.'},
    none: {title: 'Henüz bir kaynağım yok', instruction: 'Önce konu kapsamını belirle. Kaynak ekle → Ai ile kaynak bul üzerinden uygun kaynak bağlantıları isteyebilir veya konunu doğrudan anlatabilirsin.', request: 'Henüz ders materyali paylaşmadım. Kaynağım varmış gibi davranma; konu kapsamı eksikse önce bana sor.'},
  };
  const tabs = [...document.querySelectorAll('[data-track]')];
  const stage = document.getElementById('path-stage');
  const material = document.getElementById('path-material');
  const need = document.getElementById('path-need');
  const subject = document.getElementById('path-subject');
  const result = document.getElementById('path-result');
  let selectedTrack = 'yks';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (element) => element.scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start'});

  function chooseTrack(id) {
    if (!Object.hasOwn(tracks, id)) return;
    selectedTrack = id;
    tabs.forEach((tab) => {
      const selected = tab.dataset.track === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.getElementById('guide-path-panel').setAttribute('aria-labelledby', `track-${id}`);
    document.getElementById('track-description').textContent = tracks[id].description;
    subject.placeholder = tracks[id].placeholder;
    subject.value = '';
    material.value = '';
    need.value = '';
    stage.replaceChildren(new Option('Bir alan seç', ''), ...tracks[id].stages.map((label) => new Option(label, label)));
    stage.options[0].disabled = true;
    stage.value = '';
    result.hidden = true;
    document.getElementById('task-status').textContent = '';
    const url = new URL(window.location.href);
    url.searchParams.set('amac', id);
    history.replaceState(null, '', url);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseTrack(tab.dataset.track));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      chooseTrack(tabs[next].dataset.track);
      tabs[next].focus();
    });
  });
  const requestedTrack = new URL(window.location.href).searchParams.get('amac');
  chooseTrack(Object.hasOwn(tracks, requestedTrack) ? requestedTrack : 'yks');
  stage.addEventListener('change', () => {
    subject.placeholder = `Örn. ${tracks[selectedTrack].examples[stage.value] || tracks[selectedTrack].example}`;
  });
  form.hidden = false;

  // Sonuç, kullanıcının verdiği bilgilere göre değişir; bir AI yanıtı gibi sunulmaz.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const track = tracks[selectedTrack];
    const goal = needs[need.value];
    const source = materials[material.value];
    const topic = subject.value.trim() || track.examples[stage.value] || track.example;
    document.getElementById('result-kicker').textContent = `${track.title} · ${stage.value}`;
    document.getElementById('result-heading').textContent = goal.title;
    document.getElementById('result-description').textContent = `${track.approach} ${subject.value.trim() ? `Bu yolun konusu: ${topic}.` : `Aşağıdaki istek örneğinde “${topic}” kullanıldı; bunu kendi konunla değiştirebilirsin.`}`;
    let prepare = `${goal.path}. Kayıt yerini ve gönderilecek bağlamı kontrol et. “Kopyala ve aç” ile kılavuzu kendi sohbet uygulamana gönder.`;
    if (material.value === 'notes' && need.value !== 'plan') {
      prepare = need.value === 'understand'
        ? 'Balpy’deki notu aç → AI → Notu düzenle. Not grubunu birlikte geliştirmek için grubun menüsünde “Ai ile düzenle”yi kullan. İlgili kılavuzu ve not bağlamını sohbetine gönder.'
        : `Balpy’deki notu aç → AI → ${need.value === 'remember' ? 'Kart hazırla' : 'Soru hazırla'}. İlgili kılavuzu ve not bağlamını sohbetine gönder; kayıt yerini kontrol et.`;
    }
    const steps = [
      ['Çalışma alanını ve bağlamı hazırla', `Bir koleksiyonun yoksa Koleksiyonlar → + → Ai ile hazırla ile dersine uygun yapıyı hazırlat. Bir koleksiyonun varsa ilgili konuya gir. ${source.instruction}`],
      [`AI ile ${goal.kind} hazırlat`, `${prepare} Ardından aşağıdaki istek örneğini kendi konuna göre düzenleyerek yaz.`],
      ['XML’i içe aktar ve kaydet', 'AI’ın yanıtını kopyala, kılavuzu aldığın aynı Balpy ekranına dön ve “İçe aktar”a bas. Taslakları incele, uygun bulduğunu onaylayıp kaydet. Hatalı yanıtta düzeltme metnini aynı sohbete gönder.'],
      ['Hazırladığın içerikle çalış', need.value === 'understand' ? 'Notu okuyup örnekleri incele. Hatırlamak veya uygulamak istediğin noktalar için notun AI menüsünden ayrıca kart ya da soru hazırlat.' : need.value === 'remember' ? 'Cevabı görmeden kartı yanıtla; sonra çevirip “Hatırladım” veya “Hatırlamadım” seç. Sonraki günlerde Ana Sayfa’daki günlük tekrarlarla devam et.' : need.value === 'practice' ? 'Önce soruyu kendin çöz; takılırsan ipucunu ve sonra çözümü aç. “Bildim” veya “Bilemedim” ile çalışma sonucunu değerlendir; zamanı gelince tekrar et.' : 'Görevleri bitirdikçe işaretle. Süre hedefi ve mola düzeni için Çalışma planı’nı, gerçek çalışma süreni kaydetmek için Sayaç’ı kullan.'],
    ];
    const list = document.getElementById('result-steps');
    list.replaceChildren(...steps.map(([title, body]) => {
      const item = document.createElement('li');
      const content = document.createElement('div');
      const heading = document.createElement('b');
      const description = document.createElement('span');
      heading.textContent = title;
      description.textContent = body;
      content.append(heading, description);
      item.append(content);
      return item;
    }));
    const request = material.value === 'notes' && need.value === 'understand'
      ? 'Paylaştığım notu düzeyime uygun, kavramları birbirine bağlayan açıklamalar ve örneklerle geliştir.'
      : goal.request;
    document.getElementById('result-task').textContent = `${track.title} için ${stage.value.toLocaleLowerCase('tr')} alanında çalışıyorum. Konum: ${topic}. ${source.request} ${request} Gönderdiğim güncel Balpy kılavuzunun biçimine uygun çıktı ver; başka bir ekranın XML biçimini kullanma. ${selectedTrack === 'tip' ? 'Amacım ders öğrenmek; kavram ve mekanizmaları ders kaynağımla uyumlu ele al.' : ''}`.trim();
    const links = document.getElementById('recommended-topics');
    const caption = document.createElement('span');
    caption.textContent = 'İlgili bölümler:';
    links.replaceChildren(caption, ...[...new Set(['ai', 'koleksiyon', goal.section, ...(material.value !== 'none' ? ['kaynaklar'] : []), ...(need.value === 'plan' ? ['sayac'] : ['tekrar'])])].map((id) => {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = document.querySelector(`#${id} h2`).textContent;
      return link;
    }));
    result.hidden = false;
    document.getElementById('task-status').textContent = '';
    document.getElementById('result-heading').focus({preventScroll: true});
    scrollTo(result);
  });
  form.addEventListener('input', () => { result.hidden = true; });
  document.getElementById('change-answers').addEventListener('click', () => {
    result.hidden = true;
    stage.focus({preventScroll: true});
    scrollTo(document.getElementById('sana-gore'));
  });
  document.getElementById('copy-task').addEventListener('click', async () => {
    const status = document.getElementById('task-status');
    try {
      await navigator.clipboard.writeText(document.getElementById('result-task').textContent);
      status.textContent = 'İstek kopyalandı. Önce Balpy kılavuzunu, ardından bu isteği sohbetine yapıştır.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('result-task'));
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Tarayıcı panoya erişemedi. Seçili isteği elle kopyalayabilirsin.';
    }
  });

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
