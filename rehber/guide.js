(() => {
    const search = document.querySelector('#guide-search');
    const sections = [...document.querySelectorAll('.searchable')];
    const noResults = document.querySelector('#no-results');
    const navLinks = [...document.querySelectorAll('#guide-nav a')];

    const normalize = (value) => value
        .toLocaleLowerCase('tr-TR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    search?.addEventListener('input', () => {
        const query = normalize(search.value.trim());
        let visibleCount = 0;
        sections.forEach((section) => {
            const haystack = normalize(`${section.dataset.keywords || ''} ${section.textContent}`);
            const visible = !query || haystack.includes(query);
            section.classList.toggle('search-hidden', !visible);
            if (visible) visibleCount += 1;
        });
        if (noResults) noResults.hidden = visibleCount !== 0;
    });

    const observer = new IntersectionObserver((entries) => {
        const active = entries.find((entry) => entry.isIntersecting);
        if (!active) return;
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.hash === `#${active.target.id}`);
        });
    }, { rootMargin: '-20% 0px -68% 0px' });

    sections.forEach((section) => observer.observe(section));
})();
