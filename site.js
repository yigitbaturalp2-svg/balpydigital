(() => {
  const header = document.querySelector(".site-header");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".ms").textContent = open ? "close" : "menu";
    });
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.querySelector(".ms").textContent = "menu";
      }),
    );
  }

  // Rehber araması: başlık, metin ve anahtar kelimelerde Türkçe duyarlı arar.
  const search = document.getElementById("guide-search");
  const topics = [...document.querySelectorAll(".topic")];
  const empty = document.getElementById("search-empty");
  const normalize = (value) =>
    value.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  if (search && topics.length) {
    const index = topics.map((topic) => normalize(`${topic.dataset.keywords || ""} ${topic.textContent}`));
    search.addEventListener("input", () => {
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      let shown = 0;
      topics.forEach((topic, i) => {
        const match = terms.every((term) => index[i].includes(term));
        topic.classList.toggle("hidden-by-search", !match);
        if (match) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  }

  // İçindekiler: ekrandaki konuyu vurgular.
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((link) => [link.hash.slice(1), link]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => link.classList.remove("active"));
          byId.get(entry.target.id)?.classList.add("active");
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    topics.forEach((topic) => observer.observe(topic));
  }
})();
