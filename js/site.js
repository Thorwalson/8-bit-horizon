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
      if (attrs[k] == null || attrs[k] === false) return;
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
    [["Projekte", "projects.html"], ["Impressum", "impressum.html"], ["Datenschutz", "datenschutz.html"], ["Team", "admin.html"]].forEach(function (l) {
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

  /* ---------- Verstecktes Modus-Menü (Burger-Icon + Passwort) ---------- */
  var dlg;
  function picker() {
    var host = document.getElementById("theme-picker"); if (!host) return;
    var btn = h("button", { class: "theme-btn", type: "button", "aria-label": "Design-Modus (geschützt)", "aria-haspopup": "dialog" }, [h("span"), h("span"), h("span")]);
    dlg = h("dialog", { class: "modal", "aria-labelledby": "modal-title" });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    btn.addEventListener("click", function () { renderModal(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); });
    host.appendChild(btn); host.appendChild(dlg);
    updatePicker();
  }

  function renderModal() {
    dlg.innerHTML = "";
    if (H8.isUnlocked()) renderThemes(); else renderLock();
  }

  function renderLock() {
    var input = h("input", { type: "password", id: "pw", autocomplete: "current-password", required: "", "aria-describedby": "pw-err" });
    var err = h("p", { class: "modal-error", id: "pw-err", role: "alert", hidden: "" });
    var form = h("form", { class: "modal-form" }, [
      h("h2", { id: "modal-title", text: "Design-Modus" }),
      h("p", { text: "Dieses Menü ist für das Team. Gib das Passwort ein, um das Seitendesign umzustellen." }),
      h("label", { for: "pw", text: "Passwort" }), input, err,
      h("div", { class: "modal-actions" }, [
        h("button", { class: "btn btn-small", type: "submit", text: "Entsperren" }),
        h("button", { class: "btn btn-small btn-ghost", type: "button", text: "Abbrechen", onclick: function () { dlg.close(); } })
      ])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;
      H8.checkPassword(input.value).then(function (ok) {
        if (ok) { H8.setUnlocked(true); renderModal(); }
        else { err.textContent = "Falsches Passwort."; err.hidden = false; input.value = ""; input.focus(); }
      }, function () {
        err.textContent = "Dein Browser blockiert die Prüfung. Sie funktioniert nur über https oder localhost."; err.hidden = false;
      });
    });
    dlg.appendChild(form);
    setTimeout(function () { input.focus(); }, 30);
  }

  function renderThemes() {
    var choice = H8.currentChoice();
    var list = h("ul", { class: "theme-list" });
    [{ id: "auto", name: "Automatisch (nach Datum)" }].concat(Object.keys(H8.THEMES).map(function (k) { return { id: k, name: H8.THEMES[k].name }; })).forEach(function (it) {
      var b = h("button", { type: "button", text: it.name, class: it.id === choice ? "is-on" : "" });
      b.addEventListener("click", function () { H8.store(it.id); H8.apply(H8.resolve(it.id)); renderThemes(); });
      list.appendChild(h("li", {}, [b]));
    });
    dlg.innerHTML = "";
    dlg.appendChild(h("h2", { id: "modal-title", text: "Design-Modus" }));
    dlg.appendChild(h("p", { text: "Die Auswahl gilt nur in diesem Browser. Besucher sehen immer das Theme passend zum Datum." }));
    dlg.appendChild(list);
    dlg.appendChild(h("div", { class: "modal-actions" }, [
      h("button", { class: "btn btn-small", type: "button", text: "Fertig", onclick: function () { dlg.close(); } }),
      h("button", { class: "btn btn-small btn-ghost", type: "button", text: "Sperren", onclick: function () { H8.setUnlocked(false); dlg.close(); } })
    ]));
  }

  function updatePicker() {
    var t = H8.THEMES[H8.current];
    var g = document.getElementById("greeting");
    if (g) { g.textContent = t.greeting || ""; g.hidden = !t.greeting; }
  }

  /* ---------- Projekte ---------- */
  var PROJECTS = (window.H8_PROJECTS || []).slice();
  var CATS = S.categories || [];
  H8.srcResolver = H8.srcResolver || function (src) { return src; };

  function safeUrl(u) { return /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "#"; }
  function statusClass(s) { return s === "Live" ? "is-live" : s === "In Arbeit" ? "is-wip" : "is-plan"; }
  function catName(id) { var c = CATS.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; }
  function fmtDate(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "." + m[2] + "." + m[1] : ""; }
  function galleryItems(p) {
    var out = [];
    (p.blocks || []).forEach(function (b) { if (b.type === "gallery") (b.items || []).forEach(function (m) { out.push(m); }); });
    return out;
  }
  function coverOf(p) {
    if (p.cover) return p.cover;
    var img = galleryItems(p).filter(function (m) { return m.type === "image" && m.src; })[0];
    return img ? img.src : null;
  }
  function lastTouched(p) {
    var d = p.created || "";
    (p.updates || []).forEach(function (u) { if (u.date > d) d = u.date; });
    return d;
  }

  function tagsFor(p) {
    var t = [h("span", { class: "tag", text: catName(p.category) })];
    if (p.subtype && p.subtype !== catName(p.category)) t.push(h("span", { class: "tag", text: p.subtype }));
    t.push(h("span", { class: "tag " + statusClass(p.status), text: p.status }));
    return t;
  }

  function card(p) {
    var art = h("div", { class: "card-art" });
    var cv = coverOf(p);
    if (cv) art.appendChild(h("img", { src: H8.srcResolver(cv), alt: "", loading: "lazy" }));
    return h("a", { class: "card px", href: "project.html?id=" + encodeURIComponent(p.id), style: "--c:" + (p.accent || "var(--accent)") }, [
      art,
      h("div", { class: "card-body" }, [
        h("div", { class: "tags" }, tagsFor(p)),
        h("h3", { text: p.title }),
        h("p", { text: p.summary })
      ])
    ]);
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

  /* Neuigkeiten: pro Kategorie das neueste Update */
  function news() {
    var host = document.getElementById("news-grid"); if (!host) return;
    CATS.forEach(function (c) {
      var items = [];
      PROJECTS.filter(function (p) { return p.category === c.id; }).forEach(function (p) {
        (p.updates || []).forEach(function (u) { items.push({ p: p, date: u.date, title: u.title, text: u.text }); });
        if (p.created) items.push({ p: p, date: p.created, title: "Neues Projekt", text: p.summary });
      });
      items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var it = items[0], node;
      if (it) {
        node = h("a", { class: "news px", href: "project.html?id=" + encodeURIComponent(it.p.id), style: "--c:" + (it.p.accent || "var(--accent)") }, [
          h("div", { class: "news-head" }, [h("span", { class: "tag", text: c.name }), h("time", { datetime: it.date, text: fmtDate(it.date) })]),
          h("h3", { text: it.p.title }),
          h("p", { class: "news-title", text: it.title }),
          it.text ? h("p", { class: "news-text", text: it.text }) : null
        ]);
      } else {
        node = h("div", { class: "news news-empty px" }, [
          h("div", { class: "news-head" }, [h("span", { class: "tag", text: c.name })]),
          h("p", { class: "news-text", text: "Hier erscheint das nächste Update, sobald es etwas Neues gibt." })
        ]);
      }
      host.appendChild(node);
    });
  }

  function projectsHome() {
    var host = document.getElementById("project-grid"); if (!host) return;
    PROJECTS.slice().sort(function (a, b) { var x = lastTouched(a), y = lastTouched(b); return x < y ? 1 : x > y ? -1 : 0; }).slice(0, 5).forEach(function (p) { host.appendChild(card(p)); });
    host.appendChild(ideaCard());
  }

  function projectsList() {
    var host = document.getElementById("all-projects"); if (!host) return;
    var filters = document.getElementById("filters");
    var active = new URLSearchParams(location.search).get("kategorie") || "all";
    if (active !== "all" && !CATS.some(function (c) { return c.id === active; })) active = "all";
    function render() {
      host.innerHTML = "";
      var list = PROJECTS.filter(function (p) { return active === "all" || p.category === active; });
      list.forEach(function (p) { host.appendChild(card(p)); });
      if (!list.length) host.appendChild(h("p", { class: "empty", text: "In dieser Kategorie gibt es noch nichts. Schau bald wieder vorbei oder sag uns auf Discord, was dir fehlt." }));
      if (active === "all" || !list.length) host.appendChild(ideaCard());
      filters.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === active)); });
    }
    [{ id: "all", name: "Alle" }].concat(CATS).forEach(function (c) {
      var n = c.id === "all" ? PROJECTS.length : PROJECTS.filter(function (p) { return p.category === c.id; }).length;
      var b = h("button", { type: "button", class: "chip", "data-id": c.id, text: c.name + " (" + n + ")" });
      b.addEventListener("click", function () { active = c.id; render(); });
      filters.appendChild(b);
    });
    render();
  }

  /* ---------- Medien: Bilder und YouTube ---------- */
  function youtubeId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  var lb, lbIndex, lbItems, lbName;
  function openLightbox(items, index, name) {
    lbItems = items; lbName = name;
    if (!lb) {
      lb = h("dialog", { class: "lightbox", "aria-label": "Galerie" });
      lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
      lb.addEventListener("close", function () { var st = lb.querySelector(".lb-stage"); if (st) st.innerHTML = ""; });
      lb.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); showMedia(lbIndex + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); showMedia(lbIndex - 1); }
      });
      document.body.appendChild(lb);
    }
    showMedia(index);
    if (lb.showModal) { if (!lb.open) lb.showModal(); } else lb.setAttribute("open", "");
  }

  function showMedia(i) {
    var n = lbItems.length; lbIndex = (i + n) % n;
    var m = lbItems[lbIndex], stage = h("div", { class: "lb-stage" });
    if (m.type === "youtube") {
      stage.className = "lb-stage lb-video";
      stage.appendChild(h("iframe", {
        src: "https://www.youtube-nocookie.com/embed/" + youtubeId(m.url) + "?rel=0&autoplay=1",
        title: m.title || "Video", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: "", referrerpolicy: "strict-origin-when-cross-origin"
      }));
    } else {
      stage.appendChild(h("img", { src: H8.srcResolver(m.src), alt: m.caption || "Screenshot von " + lbName }));
    }
    lb.innerHTML = "";
    var cap = m.caption || m.title || "";
    lb.appendChild(stage);
    lb.appendChild(h("p", { class: "lb-cap", text: cap }));
    var nav = h("div", { class: "lb-nav" }, [
      n > 1 ? h("button", { class: "btn btn-small btn-ghost", type: "button", text: "Zurück", onclick: function () { showMedia(lbIndex - 1); } }) : null,
      n > 1 ? h("span", { class: "lb-count", text: (lbIndex + 1) + " / " + n }) : null,
      n > 1 ? h("button", { class: "btn btn-small btn-ghost", type: "button", text: "Weiter", onclick: function () { showMedia(lbIndex + 1); } }) : null,
      h("button", { class: "btn btn-small", type: "button", text: "Schließen", onclick: function () { lb.close(); } })
    ]);
    lb.appendChild(nav);
  }

  /* Bausteine (Überschrift, Text, Liste, Galerie) in ein Element rendern. Wird auch von der Dashboard-Vorschau benutzt. */
  function renderBlocks(p, into) {
    var hasVideo = false;
    (p.blocks || []).forEach(function (b) {
      if (b.type === "heading") {
        if (b.text) into.appendChild(h("h2", { class: "block-h", text: b.text }));
      } else if (b.type === "text") {
        String(b.text || "").split(/\n{2,}/).forEach(function (para) {
          if (para.trim()) into.appendChild(h("p", { class: "block-p", text: para.trim() }));
        });
      } else if (b.type === "list") {
        var items = (b.items || []).filter(function (x) { return String(x).trim(); });
        if (items.length) { var ul = h("ul", { class: "checks" }); items.forEach(function (x) { ul.appendChild(h("li", { text: x })); }); into.appendChild(ul); }
      } else if (b.type === "gallery") {
        var media = (b.items || []).filter(function (m) { return m && (m.type === "image" ? m.src : youtubeId(m.url)); });
        if (!media.length) return;
        var grid = h("div", { class: "gallery" });
        media.forEach(function (m, i) {
          var isV = m.type === "youtube"; if (isV) hasVideo = true;
          var tile = h("button", { type: "button", class: "tile" + (isV ? " tile-video" : ""), "aria-label": (isV ? "Video abspielen: " : "Bild vergrößern: ") + (m.title || m.caption || p.title) });
          if (isV) {
            tile.appendChild(h("span", { class: "tile-play" }));
            tile.appendChild(h("span", { class: "tile-label", text: m.title || "Video ansehen" }));
          } else {
            tile.appendChild(h("img", { src: H8.srcResolver(m.src), alt: m.caption || "Screenshot von " + p.title, loading: "lazy" }));
            if (m.caption) tile.appendChild(h("span", { class: "tile-label", text: m.caption }));
          }
          tile.addEventListener("click", function () { openLightbox(media, i, p.title); });
          grid.appendChild(tile);
        });
        into.appendChild(grid);
      }
    });
    if (hasVideo) into.appendChild(h("p", { class: "fineprint", text: "Videos laden erst nach dem Klick von YouTube (youtube-nocookie.com)." }));
  }

  function projectDetail() {
    var host = document.getElementById("project-detail"); if (!host) return;
    var id = new URLSearchParams(location.search).get("id");
    var p = PROJECTS.filter(function (x) { return x.id === id; })[0];
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
    if (meta) tagsFor(p).forEach(function (t) { meta.appendChild(t); });

    var main = h("div", { class: "detail-main" });
    main.appendChild(h("p", { class: "lead", text: p.summary }));
    renderBlocks(p, main);

    var side = h("aside", { class: "detail-side px" });
    if (p.links && p.links.length) {
      var box = h("div", { class: "side-links" });
      p.links.forEach(function (l, i) { box.appendChild(h("a", { class: "btn" + (i ? " btn-ghost" : ""), href: safeUrl(l.url), target: "_blank", rel: "noopener", text: l.label })); });
      side.appendChild(box);
    }
    var ups = (p.updates || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    side.appendChild(h("h2", { class: "side-h", text: "Updates" }));
    if (ups.length) {
      var ol = h("ol", { class: "updates" });
      ups.slice(0, 8).forEach(function (u) {
        ol.appendChild(h("li", {}, [
          h("time", { datetime: u.date, text: fmtDate(u.date) }),
          h("strong", { text: u.title }),
          u.text ? h("span", { text: u.text }) : null
        ]));
      });
      side.appendChild(ol);
    } else {
      side.appendChild(h("p", { class: "side-empty", text: "Noch keine Updates. Hier erscheinen neue Versionen und Neuigkeiten." }));
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

  H8.h = h; H8.renderBlocks = renderBlocks; H8.youtubeId = youtubeId; H8.catName = catName; H8.fmtDate = fmtDate;
  header(); footer(); wire(); scenesInit(); picker(); news(); projectsHome(); projectsList(); projectDetail(); updatePicker();
})();
