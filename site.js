(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (error) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (error) { /* gizli sekmede saklanamaz */ } },
  };

  // ------------------------------------------------------------ tema
  // Kayıtlı seçim yoksa sistem tercihi geçerlidir; düğme yalnız tercihi
  // tersine çevirip saklar.
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");
  $$("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      store.set("balpy-tema", next);
    });
  });

  // ------------------------------------------------------------ çekmece
  const sidebar = $("#sidebar");
  const openers = $$("[data-nav-open]");
  const outside = () => $$("body > header, body > .docs > main, body > .docs > .toc, body > main, body > footer");
  let lastFocus = null;
  function setNav(open) {
    if (!sidebar) return;
    document.body.classList.toggle("nav-open", open);
    openers.forEach((button) => button.setAttribute("aria-expanded", String(open)));
    outside().forEach((element) => { element.inert = open; });
    if (open) {
      lastFocus = document.activeElement;
      (sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector("a"))?.focus({ preventScroll: true });
      sidebar.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "center" });
    } else if (lastFocus) {
      lastFocus.focus({ preventScroll: true });
      lastFocus = null;
    }
  }
  openers.forEach((button) => button.addEventListener("click", () => setNav(true)));
  $$("[data-nav-close]").forEach((element) => element.addEventListener("click", () => setNav(false)));
  sidebar?.addEventListener("click", (event) => { if (event.target.closest("a")) setNav(false); });
  const wide = window.matchMedia("(min-width: 1024px)");
  wide.addEventListener("change", () => { if (wide.matches) setNav(false); });

  // ------------------------------------------------------------ arama
  const dialog = $("#search-dialog");
  const input = $("#search-input");
  const results = $("#search-results");
  const hint = $("#search-hint");
  let index = null;
  let loading = null;
  let active = -1;

  // Türkçe harfler tek karaktere iner; konumlar korunduğu için eşleşen
  // yer özgün metinde vurgulanabilir.
  const fold = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  const normalize = (text) => {
    let out = "";
    for (const char of text) {
      const lower = char.toLocaleLowerCase("tr");
      const single = lower.length === 1 ? lower : lower[0];
      out += fold[single] || single;
    }
    return out;
  };
  const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch("/rehber/arama.json")
        .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
        .then((entries) => {
          index = entries.map((entry) => ({ ...entry, nt: normalize(entry.t), np: normalize(entry.p), nk: normalize(entry.k || ""), nx: normalize(entry.x) }));
          return index;
        })
        .catch((error) => { loading = null; throw error; });
    }
    return loading;
  }

  function score(entry, tokens) {
    let total = 0;
    for (const token of tokens) {
      const inTitle = entry.nt.indexOf(token);
      const inPage = entry.np.indexOf(token);
      const inKeys = entry.nk.indexOf(token);
      const inText = entry.nx.indexOf(token);
      if (inTitle < 0 && inPage < 0 && inKeys < 0 && inText < 0) return 0;
      if (inTitle >= 0) total += inTitle === 0 || entry.nt[inTitle - 1] === " " ? 14 : 9;
      if (inKeys >= 0) total += 6;
      if (inPage >= 0) total += 3;
      if (inText >= 0) total += 1 + Math.min(3, entry.nx.split(token).length - 1);
    }
    if (!entry.u.includes("#")) total += 2;
    return total;
  }

  function snippet(entry, tokens) {
    const text = entry.x;
    const normal = entry.nx;
    let at = -1;
    for (const token of tokens) {
      const found = normal.indexOf(token);
      if (found >= 0 && (at < 0 || found < at)) at = found;
    }
    const start = Math.max(0, at < 0 ? 0 : at - 50);
    const end = Math.min(text.length, start + 170);
    let piece = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    const normalPiece = normalize(piece);
    const marks = [];
    for (const token of tokens) {
      let from = 0;
      for (;;) {
        const found = normalPiece.indexOf(token, from);
        if (found < 0) break;
        marks.push([found, found + token.length]);
        from = found + token.length;
      }
    }
    marks.sort((a, b) => a[0] - b[0]);
    let html = "";
    let cursor = 0;
    for (const [from, to] of marks) {
      if (from < cursor) continue;
      html += escapeHtml(piece.slice(cursor, from)) + "<mark>" + escapeHtml(piece.slice(from, to)) + "</mark>";
      cursor = to;
    }
    return html + escapeHtml(piece.slice(cursor));
  }

  function render(query) {
    const tokens = normalize(query.trim()).split(/\s+/).filter((token) => token.length > 1 || /\d/.test(token));
    active = -1;
    if (!tokens.length) {
      results.innerHTML = "";
      hint.hidden = false;
      return;
    }
    const found = index
      .map((entry) => ({ entry, value: score(entry, tokens) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 14);
    hint.hidden = found.length > 0;
    if (!found.length) {
      results.innerHTML = "";
      hint.innerHTML = `“${escapeHtml(query.trim())}” için sonuç yok. Daha kısa ya da farklı bir kelime dene.`;
      return;
    }
    results.innerHTML = found.map(({ entry }, position) =>
      `<a class="result-link" role="option" id="sonuc-${position}" href="${entry.u}"><small>${escapeHtml(entry.u.includes("#") ? entry.p : entry.p + " · Sayfa")}</small><b>${escapeHtml(entry.t)}</b><span>${snippet(entry, tokens)}</span></a>`).join("");
  }

  function setActive(next) {
    const links = $$(".result-link", results);
    if (!links.length) return;
    active = (next + links.length) % links.length;
    links.forEach((link, position) => link.classList.toggle("active", position === active));
    links[active].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", links[active].id);
  }

  function openSearch(initial = "") {
    if (!dialog) return;
    setNav(false);
    if (!dialog.open) dialog.showModal();
    if (initial) input.value = initial;
    input.focus();
    input.select();
    load().then(() => render(input.value)).catch(() => {
      hint.hidden = false;
      hint.textContent = "Arama dizini yüklenemedi. Bağlantını kontrol edip yeniden dene.";
    });
  }
  function closeSearch() { if (dialog?.open) dialog.close(); }

  $$("[data-search-open]").forEach((button) => button.addEventListener("click", () => openSearch()));
  $$("[data-search-close]").forEach((button) => button.addEventListener("click", closeSearch));
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) closeSearch(); });
  results?.addEventListener("click", (event) => { if (event.target.closest("a")) closeSearch(); });
  input?.addEventListener("input", () => { if (index) render(input.value); });
  input?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(active + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(active - 1); }
    else if (event.key === "Enter") {
      const links = $$(".result-link", results);
      const target = links[active >= 0 ? active : 0];
      if (target) { event.preventDefault(); closeSearch(); location.href = target.href; }
    }
  });
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;
    if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      openSearch();
    } else if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
    }
  });
  const params = new URLSearchParams(location.search);
  if (params.get("ara")) openSearch(params.get("ara"));
  else if (location.hash === "#ara") openSearch();

  // ------------------------------------------------------------ sayfa içi dizin
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
    const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
      const current = headings.find((heading) => visible.has(heading))
        || headings.filter((heading) => heading.getBoundingClientRect().top < 120).pop();
      tocLinks.forEach((link) => link.classList.toggle("active", current && link === byId.get(current.id)));
    }, { rootMargin: "-80px 0px -60% 0px" });
    headings.forEach((heading) => observer.observe(heading));
  }
  $$(".toc-inline a").forEach((link) => link.addEventListener("click", () => link.closest("details")?.removeAttribute("open")));

  // ------------------------------------------------------------ Ai'a sor
  const ask = $("#ask-dialog");
  const status = $("#ask-status");
  function pageText() {
    const article = $("#rehber-metni");
    if (!article) return "";
    const clone = article.cloneNode(true);
    clone.querySelectorAll(".anchor, svg").forEach((element) => element.remove());
    clone.querySelectorAll(".path > span + span").forEach((element) => element.prepend(" › "));
    clone.querySelectorAll("h2, h3").forEach((element) => element.prepend(element.tagName === "H2" ? "## " : "### "));
    clone.querySelectorAll("li").forEach((element) => element.prepend("- "));
    const title = $(".doc-head h1")?.textContent.trim() || document.title;
    const lead = $(".doc-lead")?.textContent.trim() || "";
    const body = clone.innerText.replace(/\n{3,}/g, "\n\n").trim();
    return `Balpy kullanım rehberi — ${title}\n${location.origin}${location.pathname}\n\n${lead}\n\n${body}\n`;
  }
  async function copyPage() {
    const text = pageText();
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Sayfa kopyalandı. Sohbetine yapıştırıp sorunu yazabilirsin.";
      return true;
    } catch (error) {
      status.textContent = "Kopyalama engellendi. Sayfayı seçip kopyalayabilirsin.";
      return false;
    }
  }
  $$("[data-ask-open-dialog]").forEach((button) => button.addEventListener("click", () => { status.textContent = ""; ask?.showModal(); }));
  $$("[data-ask-close]").forEach((button) => button.addEventListener("click", () => ask?.close()));
  ask?.addEventListener("click", (event) => { if (event.target === ask) ask.close(); });
  $("[data-ask-copy]")?.addEventListener("click", copyPage);
  // Bağlantı yeni sekmede açılır; kopyalama aynı dokunuşla yapılır ki
  // sohbette yapıştıracak metin hazır olsun.
  $$("[data-ask-open]").forEach((link) => link.addEventListener("click", () => { copyPage(); }));

  // ------------------------------------------------------------ başa dön
  const toTop = $("[data-to-top]");
  if (toTop) {
    const update = () => toTop.classList.toggle("show", window.scrollY > 900);
    update();
    window.addEventListener("scroll", update, { passive: true });
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      $("#main")?.focus({ preventScroll: true });
    });
  }
})();
