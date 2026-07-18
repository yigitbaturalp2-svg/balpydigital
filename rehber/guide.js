(() => {
  const search = document.querySelector('#guide-search');
  const sections = [...document.querySelectorAll('.searchable')];
  const noResults = document.querySelector('#no-results');
  const navLinks = [...document.querySelectorAll('#guide-nav a')];
  const progress = document.querySelector('#reading-progress');

  const normalize = (value) => value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const filterSections = () => {
    const query = normalize(search?.value.trim() || '');
    let visibleCount = 0;

    sections.forEach((section) => {
      const haystack = normalize(`${section.dataset.keywords || ''} ${section.textContent}`);
      const visible = !query || haystack.includes(query);
      section.classList.toggle('search-hidden', !visible);
      if (visible) visibleCount += 1;
    });

    if (noResults) noResults.hidden = visibleCount !== 0;
  };

  search?.addEventListener('input', filterSections);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      filterSections();
      search.blur();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    const active = entries.find((entry) => entry.isIntersecting);
    if (!active) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${active.target.id}`));
  }, { rootMargin: '-18% 0px -70% 0px' });

  sections.forEach((section) => observer.observe(section));

  const updateProgress = () => {
    if (!progress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
    progress.style.width = `${percent}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();
