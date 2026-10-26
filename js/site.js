/* =========================================================
   Seitenlogik: Navigation, Footer, Szenen, Theme-Wahl,
   Projektlisten. Neue Unterseite? Nur HTML anlegen, die
   Navigation unten ergänzen, fertig.
   ========================================================= */
(function () {
  "use strict";
  var S = window.SITE, H8 = window.H8;

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  /* ---------- Navigation (hier neue Seiten eintragen) ---------- */
  var NAV = [
    { label: "Start", href: "index.html", page: "home" },
    { label: "Projekte", href: "projects.html", page: "projects" },
    { label: "Community", href: "index.html#community", page: "" }
  ];

  function header() {
    var host = document.getElementById("site-header"); if (!host) return;
    var page = document.body.getAttribute("data-page");
    var nav = h("nav", { id: "nav", class: "nav", "aria-label": "Hauptmenü" });
    NAV.forEach(function (n) {
      var a = h("a", { href: n.href, text: n.label });
      if (n.page && (n.page === page || (n.page === "projects" && page === "project"))) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
    nav.appendChild(h("a", { class: "btn btn-small", href: S.discord, target: "_blank", rel: "noopener", text: "Discord" }));
    var toggle = h("button", { class: "nav-toggle", "aria-expanded": "false", "aria-controls": "nav", "aria-label": "Menü öffnen" },
      [h("span"), h("span"), h("span")]);
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      document.body.classList.toggle("nav-open", !open);
    });
    var brand = h("a", { class: "brand", href: "index.html" }, [
      h("img", { src: "assets/img/logo-256.png", alt: "", width: "44", height: "44" }),
      h("span", { text: S.name })
    ]);
    host.className = "site-header";
    host.appendChild(brand); host.appendChild(toggle); host.appendChild(nav);
    window.addEventListener("scroll", function () { host.classList.toggle("is-solid", window.scrollY > 40); }, { passive: true });
    host.classList.toggle("is-solid", window.scrollY > 40);
  }

  function footer() {
    var host = document.getElementById("site-footer"); if (!host) return;
    host.className = "site-footer";
    var socials = (S.socials || []).filter(function (s) { return s.url; });
    var links = h("ul", { class: "footer-links" });
    [["Projekte", "projects.html"], ["Impressum", "impressum.html"], ["Datenschutz", "datenschutz.html"]].forEach(function (l) {
      links.appendChild(h("li", {}, [h("a", { href: l[1], text: l[0] })]));
    });
    links.appendChild(h("li", {}, [h("a", { href: S.discord, target: "_blank", rel: "noopener", text: "Discord" })]));
    socials.forEach(function (s) { links.appendChild(h("li", {}, [h("a", { href: s.url, target: "_blank", rel: "noopener", text: s.name })])); });
    host.appendChild(h("div", { class: "container footer-inner" }, [
      h("div", { class: "footer-brand" }, [
        h("img", { src: "assets/img/logo-256.png", alt: "8-bit Horizon Game Studio", width: "96", height: "96" }),
        h("p", { text: "© " + new Date().getFullYear() + " " + S.name })
      ]),
      links
    ]));
  }

  /* ---------- Szenen ---------- */
  var scenes = [];
  function scenesInit() {
    document.querySelectorAll("[data-scene]").forEach(function (host) {
      var sc = H8.createScene(host, { mode: host.getAttribute("data-scene") });
      scenes.push(sc);
      sc.setTheme(H8.THEMES[H8.current]);
    });
    window.addEventListener("h8theme", function (e) { scenes.forEach(function (s) { s.setTheme(e.detail.theme); }); updatePicker(); });
  }

  /* ---------- Theme-Wahl (nur auf der Startseite) ---------- */
  var pickerBtn, pickerList;
  function picker() {
    var host = document.getElementById("theme-picker"); if (!host) return;
    pickerBtn = h("button", { class: "theme-btn", "aria-haspopup": "true", "aria-expanded": "false" });
    pickerList = h("ul", { class: "theme-list", hidden: "" });
    var items = [{ id: "auto", name: "Automatisch (nach Datum)" }].concat(Object.keys(H8.THEMES).map(function (k) { return { id: k, name: H8.THEMES[k].name }; }));
    items.forEach(function (it) {
      var b = h("button", { type: "button", "data-id": it.id, text: it.name });
      b.addEventListener("click", function () { H8.store(it.id); H8.apply(H8.resolve(it.id)); close(); });
      pickerList.appendChild(h("li", {}, [b]));
    });
    function close() { pickerList.hidden = true; pickerBtn.setAttribute("aria-expanded", "false"); }
    pickerBtn.addEventListener("click", function () {
      var open = !pickerList.hidden; pickerList.hidden = open; pickerBtn.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener("click", function (e) { if (!host.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    host.appendChild(pickerBtn); host.appendChild(pickerList);
    updatePicker();
  }
  function updatePicker() {
    if (!pickerBtn) return;
    var id = H8.current, t = H8.THEMES[id], choice = H8.currentChoice();
    pickerBtn.textContent = "Modus: " + t.name + (choice === "auto" ? "" : " *");
    pickerList.querySelectorAll("button").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-id") === choice); });
    var g = document.getElementById("greeting");
    if (g) { g.textContent = t.greeting || ""; g.hidden = !t.greeting; }
  }

  /* ---------- Projekte ---------- */
  function statusClass(s) { return s === "Live" ? "is-live" : s === "In Arbeit" ? "is-wip" : "is-plan"; }

  function card(p) {
    var art = h("div", { class: "card-art" });
    if (p.screenshots && p.screenshots[0]) art.appendChild(h("img", { src: p.screenshots[0], alt: "" }));
    var a = h("a", { class: "card px", href: "project.html?id=" + encodeURIComponent(p.id), style: "--c:" + (p.accent || "var(--accent)") }, [
      art,
      h("div", { class: "card-body" }, [
        h("div", { class: "tags" }, [h("span", { class: "tag", text: p.type }), h("span", { class: "tag " + statusClass(p.status), text: p.status })]),
        h("h3", { text: p.title }),
        h("p", { text: p.summary })
      ])
    ]);
    return a;
  }

  function ideaCard() {
    return h("a", { class: "card card-idea px", href: S.discord, target: "_blank", rel: "noopener" }, [
      h("div", { class: "card-body" }, [
        h("h3", { text: "Du hast eine Idee?" }),
        h("p", { text: "Welches Addon oder Spiel fehlt dir? Erzähl es uns auf Discord, wir lesen alles." }),
        h("span", { class: "btn btn-small btn-ghost", text: "Zum Discord" })
      ])
    ]);
  }

  function projectsHome() {
    var host = document.getElementById("project-grid"); if (!host) return;
    S.projects.forEach(function (p) { host.appendChild(card(p)); });
    host.appendChild(ideaCard());
  }

  function projectsList() {
    var host = document.getElementById("all-projects"); if (!host) return;
    var filters = document.getElementById("filters");
    var types = []; S.projects.forEach(function (p) { if (types.indexOf(p.type) < 0) types.push(p.type); });
    var active = "Alle";
    function render() {
      host.innerHTML = "";
      S.projects.filter(function (p) { return active === "Alle" || p.type === active; }).forEach(function (p) { host.appendChild(card(p)); });
      if (active === "Alle") host.appendChild(ideaCard());
      filters.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === active)); });
    }
    ["Alle"].concat(types).forEach(function (t) {
      var b = h("button", { type: "button", class: "chip", text: t });
      b.addEventListener("click", function () { active = t; render(); });
      filters.appendChild(b);
    });
    render();
  }

  function projectDetail() {
    var host = document.getElementById("project-detail"); if (!host) return;
    var id = new URLSearchParams(location.search).get("id");
    var p = S.projects.filter(function (x) { return x.id === id; })[0];
    var title = document.getElementById("project-title");
    if (!p) {
      if (title) title.textContent = "Projekt nicht gefunden";
      host.appendChild(h("p", { text: "Dieses Projekt gibt es nicht (mehr). Alle aktuellen Projekte findest du auf der Übersicht." }));
      host.appendChild(h("a", { class: "btn", href: "projects.html", text: "Zu den Projekten" }));
      return;
    }
    document.title = p.title + " | " + S.name;
    document.documentElement.style.setProperty("--accent", p.accent || "var(--accent)");
    if (title) title.textContent = p.title;
    var meta = document.getElementById("project-meta");
    if (meta) { meta.appendChild(h("span", { class: "tag", text: p.type })); meta.appendChild(h("span", { class: "tag " + statusClass(p.status), text: p.status })); }

    var main = h("div", { class: "detail-main" });
    main.appendChild(h("p", { class: "lead", text: p.summary }));
    (p.description || []).forEach(function (t) { main.appendChild(h("p", { text: t })); });
    if (p.screenshots && p.screenshots.length) {
      var shots = h("div", { class: "shots" });
      p.screenshots.forEach(function (s) { shots.appendChild(h("img", { src: s, alt: "Screenshot von " + p.title, loading: "lazy" })); });
      main.appendChild(shots);
    }
    var side = h("aside", { class: "detail-side px" });
    if (p.features && p.features.length) {
      side.appendChild(h("h2", { text: "Das kann es" }));
      var ul = h("ul", { class: "checks" }); p.features.forEach(function (f) { ul.appendChild(h("li", { text: f })); }); side.appendChild(ul);
    }
    if (p.links && p.links.length) {
      var box = h("div", { class: "side-links" });
      p.links.forEach(function (l, i) { box.appendChild(h("a", { class: "btn" + (i ? " btn-ghost" : ""), href: l.url, target: "_blank", rel: "noopener", text: l.label })); });
      side.appendChild(box);
    }
    host.appendChild(main); host.appendChild(side);
  }

  /* ---------- Discord-Links und Socials im Inhalt ---------- */
  function wire() {
    document.querySelectorAll("[data-discord]").forEach(function (a) { a.href = S.discord; });
    var so = document.getElementById("socials");
    if (so) {
      var list = (S.socials || []).filter(function (s) { return s.url; });
      if (!list.length) { so.hidden = true; }
      list.forEach(function (s) { so.appendChild(h("a", { class: "btn btn-ghost btn-small", href: s.url, target: "_blank", rel: "noopener", text: s.name })); });
    }
    var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
  }

  header(); footer(); wire(); scenesInit(); picker(); projectsHome(); projectsList(); projectDetail(); updatePicker();
})();
