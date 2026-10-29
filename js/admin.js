/* =========================================================
   Team-Dashboard
   Meldet sich mit einem GitHub-Token an (GitHub prüft die Rechte),
   bearbeitet data/projects.js und lädt Bilder nach assets/uploads/.
   Veröffentlichen = ein Commit in dein Repository.
   ========================================================= */
(function () {
  "use strict";
  var S = window.SITE, H8 = window.H8, h = H8.h;
  var root = document.getElementById("admin-root");
  var CATS = S.categories || [];
  var STATUS = ["Geplant", "In Arbeit", "Live"];
  var PALETTE = ["#ff8a1f", "#ffd24a", "#5dffa0", "#3aa8ff", "#9b5cff", "#ff4a8a", "#ff8fc0", "#e6f4ff"];
  var DATA_PATH = "data/projects.js";
  var TOKEN_KEY = "h8-admin-token";

  var st = {
    token: null, user: null, owner: S.github.owner, repo: S.github.repo, branch: "main",
    data: [], orig: "[]", origText: "", sel: null, newIds: {}, pending: {}, busy: false
  };

  /* ---------- Helfer ---------- */
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function slug(s) {
    return String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "projekt";
  }
  function uniqueId(base, except) {
    var id = base, n = 2;
    while (st.data.some(function (p) { return p !== except && p.id === id; })) id = base + "-" + n++;
    return id;
  }
  function byId(id) { return st.data.filter(function (p) { return p.id === id; })[0]; }
  function cur() { return st.sel ? byId(st.sel) : null; }
  function el(tag, attrs, kids) { return h(tag, attrs, kids); }
  function field(label, input, extra) { return el("div", { class: "field" }, [el("label", { text: label }), input, extra]); }
  function textInput(value, onInput, attrs) {
    var i = el("input", Object.assign({ type: "text", class: "inp", value: value || "" }, attrs || {}));
    i.addEventListener("input", function () { onInput(i.value); markDirty(); });
    return i;
  }
  function areaInput(value, onInput, rows) {
    var t = el("textarea", { class: "inp", rows: String(rows || 4) }); t.value = value || "";
    t.addEventListener("input", function () { onInput(t.value); markDirty(); });
    return t;
  }
  function serialize() {
    return "/* Diese Datei wird vom Admin-Dashboard (admin.html) verwaltet.\n   Du kannst sie auch von Hand bearbeiten, sie muss gültiges JSON hinter \"window.H8_PROJECTS =\" bleiben. */\nwindow.H8_PROJECTS = " + JSON.stringify(st.data, null, 2) + ";\n";
  }
  function parseData(text) {
    var m = /^window\.H8_PROJECTS\s*=\s*/m.exec(text);
    if (!m) throw new Error("Die Datei " + DATA_PATH + " hat ein unbekanntes Format.");
    var rest = text.slice(m.index + m[0].length).replace(/;\s*$/, "");
    return JSON.parse(rest);
  }
  function b64FromBytes(bytes) {
    var s = "", chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(s);
  }
  function b64ToText(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function utf8ToB64(text) { return b64FromBytes(new TextEncoder().encode(text)); }

  /* ---------- GitHub-API ---------- */
  function api(method, path, body) {
    return fetch("https://api.github.com" + path, {
      method: method, cache: "no-store",
      headers: { Authorization: "Bearer " + st.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) { var err = new Error((j && j.message) || ("HTTP " + r.status)); err.status = r.status; throw err; }
        return j;
      });
    });
  }
  function repoPath() { return "/repos/" + st.owner + "/" + st.repo; }
  function niceError(e) {
    if (e.status === 401) return "Der Token ist ungültig oder abgelaufen.";
    if (e.status === 403) return "Keine Berechtigung (oder GitHub hat gerade zu viele Anfragen erhalten). Prüfe die Rechte des Tokens.";
    if (e.status === 404) return "Repository nicht gefunden oder der Token hat darauf keinen Zugriff.";
    if (e.status === 422) return "GitHub hat die Änderung abgelehnt: " + e.message;
    if (e instanceof TypeError) return "Keine Verbindung zu GitHub. Prüfe dein Internet.";
    return e.message || "Unbekannter Fehler.";
  }

  /* ---------- Anmeldung ---------- */
  function savedToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function saveToken(t, remember) {
    try { sessionStorage.setItem(TOKEN_KEY, t); if (remember) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function forgetToken() { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function renderLogin(message) {
    root.innerHTML = "";
    var tokenIn = el("input", { type: "password", id: "token", autocomplete: "off", required: "", placeholder: "github_pat_..." });
    var rem = el("input", { type: "checkbox", id: "remember" });
    var err = el("p", { class: "err", role: "alert", hidden: "" });
    if (message) { err.textContent = message; err.hidden = false; }
    var submit = el("button", { class: "btn", type: "submit", text: "Anmelden" });
    var form = el("form", { class: "panel", style: "max-width:560px" }, [
      el("h2", { text: "Anmelden" }),
      el("p", { class: "hint", text: "Das Dashboard ist für das Team. Melde dich mit einem GitHub-Zugangstoken an, der Schreibrechte auf " + st.owner + "/" + st.repo + " hat. Ohne gültigen Token kann niemand etwas speichern." }),
      field("Zugangstoken", tokenIn),
      el("label", { class: "check" }, [rem, el("span", { text: "Auf diesem Gerät merken" })]),
      submit, err,
      el("details", { class: "help" }, [
        el("summary", { text: "Wie bekomme ich einen Token?" }),
        el("ol", {}, [
          el("li", {}, ["Öffne ", el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener", text: "github.com/settings/personal-access-tokens/new" }), " (bei GitHub angemeldet)."]),
          el("li", { text: "Name zum Beispiel „8-bit Horizon Dashboard“, Ablauf nach Wunsch (z. B. 1 Jahr)." }),
          el("li", { text: "Unter „Repository access“: Only select repositories, dann " + st.repo + " wählen." }),
          el("li", { text: "Unter „Permissions“ → „Repository permissions“: Contents auf Read and write stellen." }),
          el("li", { text: "„Generate token“ klicken und den Token (beginnt mit github_pat_) hier einfügen. Er wird nur einmal angezeigt." }),
          el("li", { text: "Weitere Teammitglieder brauchen Schreibzugriff auf das Repository (Settings → Collaborators) und erstellen ihren eigenen Token." })
        ])
      ])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true; submit.disabled = true; submit.textContent = "Prüfe ...";
      connect(tokenIn.value.trim(), rem.checked).catch(function (ex) {
        err.textContent = niceError(ex); err.hidden = false;
      }).then(function () { submit.disabled = false; submit.textContent = "Anmelden"; });
    });
    root.appendChild(form);
  }

  function connect(token, remember) {
    st.token = token;
    return api("GET", "/user").then(function (u) {
      st.user = u.login;
      return api("GET", repoPath());
    }).then(function (r) {
      if (!r.permissions || !r.permissions.push) { var e = new Error("Dieser Token darf in " + st.owner + "/" + st.repo + " nichts ändern. Stelle „Contents: Read and write“ ein."); throw e; }
      st.branch = r.default_branch || "main";
      return loadData();
    }).then(function () {
      saveToken(token, remember);
      renderApp();
    }, function (e) { st.token = null; throw e; });
  }

  function loadData() {
    return api("GET", repoPath() + "/contents/" + DATA_PATH + "?ref=" + encodeURIComponent(st.branch)).then(function (f) {
      st.origText = b64ToText(f.content);
      st.data = parseData(st.origText);
    }, function (e) {
      if (e.status === 404) { st.origText = ""; st.data = []; } else throw e;
    }).then(function () {
      st.data.forEach(function (p) { p.blocks = p.blocks || []; p.links = p.links || []; p.updates = p.updates || []; });
      st.orig = JSON.stringify(st.data); st.newIds = {}; st.pending = {}; st.sel = st.data[0] ? st.data[0].id : null;
    });
  }

  /* ---------- Änderungsstand ---------- */
  function unsentFiles() { return Object.keys(st.pending).filter(function (k) { return !st.pending[k].sent; }); }
  function isDirty() { return JSON.stringify(st.data) !== st.orig || unsentFiles().length > 0; }
  var stateEl, publishBtn, discardBtn;
  function markDirty() {
    if (!stateEl) return;
    var d = isDirty();
    stateEl.textContent = d ? "Ungespeicherte Änderungen" : "Alles veröffentlicht";
    stateEl.className = "state" + (d ? " is-dirty" : "");
    publishBtn.disabled = !d || st.busy; discardBtn.disabled = !d || st.busy;
  }
  window.addEventListener("beforeunload", function (e) { if (st.token && isDirty()) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Hauptansicht ---------- */
  var sideHost, editHost, msgHost;
  function renderApp() {
    root.innerHTML = "";
    stateEl = el("span", { class: "state" });
    publishBtn = el("button", { class: "btn btn-small", type: "button", text: "Veröffentlichen", onclick: publish });
    discardBtn = el("button", { class: "btn btn-small btn-ghost", type: "button", text: "Verwerfen", onclick: function () {
      if (confirm("Alle ungespeicherten Änderungen verwerfen?")) { reloadFromRepo(); }
    } });
    var logout = el("button", { class: "btn btn-small btn-ghost", type: "button", text: "Abmelden", onclick: function () {
      if (isDirty() && !confirm("Es gibt ungespeicherte Änderungen. Trotzdem abmelden?")) return;
      forgetToken(); st.token = null; renderLogin();
    } });
    msgHost = el("div", { "aria-live": "polite" });
    root.appendChild(el("div", { class: "bar" }, [
      el("span", { class: "who", text: "Angemeldet als " + st.user + " · " + st.owner + "/" + st.repo }),
      stateEl,
      el("div", { class: "btns" }, [discardBtn, publishBtn, logout])
    ]));
    root.appendChild(msgHost);
    sideHost = el("nav", { class: "side-list", "aria-label": "Projekte" });
    editHost = el("div");
    root.appendChild(el("div", { class: "admin-layout" }, [sideHost, editHost]));
    renderSide(); renderEditor(); markDirty();
  }

  function reloadFromRepo() {
    st.busy = true; markDirty();
    return loadData().then(function () { st.busy = false; renderSide(); renderEditor(); markDirty(); flash("Neu geladen.", true); },
      function (e) { st.busy = false; markDirty(); flash(niceError(e), false); });
  }
  function flash(text, ok) {
    msgHost.innerHTML = "";
    msgHost.appendChild(el("p", { class: ok ? "ok" : "err", role: ok ? "status" : "alert", text: text, style: "margin:0 4px 20px" }));
  }

  function renderSide() {
    sideHost.innerHTML = "";
    CATS.forEach(function (c) {
      var list = el("ul", { class: "plist" });
      var items = st.data.filter(function (p) { return p.category === c.id; });
      items.forEach(function (p) {
        var b = el("button", { type: "button", "aria-current": String(p.id === st.sel) }, [
          el("span", { text: p.title || "(ohne Titel)" }),
          st.newIds[p.id] ? el("span", { class: "new", text: "NEU" }) : null
        ]);
        b.addEventListener("click", function () { st.sel = p.id; renderSide(); renderEditor(); });
        list.appendChild(el("li", {}, [b]));
      });
      if (!items.length) list.appendChild(el("li", { class: "none", text: "Noch nichts hier" }));
      sideHost.appendChild(el("h3", {}, [
        el("span", { text: c.name }),
        el("button", { class: "mini", type: "button", "aria-label": "Neues Projekt in " + c.name, text: "+ NEU", onclick: function () { addProject(c.id); } })
      ]));
      sideHost.appendChild(list);
    });
  }

  function addProject(catId) {
    var p = { id: "", title: "Neues Projekt", category: catId, subtype: "", status: "Geplant", accent: PALETTE[CATS.findIndex(function (c) { return c.id === catId; }) % PALETTE.length],
      summary: "", created: today(), blocks: [], links: [], updates: [] };
    p.id = uniqueId("neues-projekt", p);
    st.data.push(p); st.newIds[p.id] = true; st.sel = p.id;
    renderSide(); renderEditor(); markDirty();
    var t = editHost.querySelector("#f-title"); if (t) { t.focus(); t.select(); }
  }

  /* ---------- Editor ---------- */
  function renderEditor() {
    editHost.innerHTML = "";
    var p = cur();
    if (!p) {
      editHost.appendChild(el("div", { class: "panel" }, [
        el("h2", { text: "Projekt wählen" }),
        el("p", { class: "hint", text: "Wähle links ein Projekt oder lege mit „+ NEU“ in einer Kategorie ein neues an." })
      ]));
      return;
    }
    editHost.appendChild(basics(p));
    editHost.appendChild(builder(p));
    editHost.appendChild(linksPanel(p));
    editHost.appendChild(updatesPanel(p));
    editHost.appendChild(dangerPanel(p));
  }

  function basics(p) {
    var title = textInput(p.title, function (v) {
      p.title = v;
      if (st.newIds[p.id]) { var old = p.id; p.id = uniqueId(slug(v), p); delete st.newIds[old]; st.newIds[p.id] = true; st.sel = p.id; idOut.textContent = p.id; }
      var active = sideHost.querySelector('[aria-current="true"] span'); if (active) active.textContent = v || "(ohne Titel)";
    }, { id: "f-title", maxlength: "60" });
    var idOut = el("span", { class: "hint", text: p.id });
    var cat = el("select"); CATS.forEach(function (c) { cat.appendChild(el("option", { value: c.id, text: c.name })); }); cat.value = p.category;
    cat.addEventListener("change", function () { p.category = cat.value; renderSide(); markDirty(); });
    var stat = el("select"); STATUS.forEach(function (s) { stat.appendChild(el("option", { value: s, text: s })); }); stat.value = p.status;
    stat.addEventListener("change", function () { p.status = stat.value; markDirty(); });
    var sub = textInput(p.subtype, function (v) { p.subtype = v; }, { list: "subtypes", maxlength: "30", placeholder: "z. B. WoW-Addon, Minecraft-Mod, Tool" });
    var dl = el("datalist", { id: "subtypes" }); ["WoW-Addon", "Minecraft-Mod", "Spiel", "Browser-Spiel", "Tool", "Programm"].forEach(function (s) { dl.appendChild(el("option", { value: s })); });
    var sum = areaInput(p.summary, function (v) { p.summary = v; counter.textContent = v.length + " / 220"; }, 3); sum.setAttribute("maxlength", "220");
    var counter = el("div", { class: "count", text: (p.summary || "").length + " / 220" });

    var sw = el("div", { class: "swatches" });
    function paint() { sw.querySelectorAll(".swatch").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === p.accent)); }); }
    PALETTE.forEach(function (c) {
      var b = el("button", { type: "button", class: "swatch", "data-c": c, style: "background:" + c, "aria-label": "Farbe " + c });
      b.addEventListener("click", function () { p.accent = c; picker.value = c; paint(); markDirty(); });
      sw.appendChild(b);
    });
    var picker = el("input", { type: "color", "aria-label": "Eigene Farbe" }); picker.value = /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : "#ff8a1f";
    picker.addEventListener("input", function () { p.accent = picker.value; paint(); markDirty(); });
    sw.appendChild(picker); paint();

    return el("section", { class: "panel" }, [
      el("div", { class: "block-top" }, [el("h2", { text: "Grunddaten", style: "margin:0" }),
        el("button", { class: "btn btn-small btn-ghost", type: "button", text: "Vorschau", onclick: function () { preview(p); } })]),
      field("Titel", title, el("div", {}, [el("span", { class: "hint", text: "Adresse: project.html?id=" }), idOut])),
      el("div", { class: "row3" }, [field("Kategorie", cat), field("Art (optional)", sub, dl), field("Status", stat)]),
      field("Kurzbeschreibung (erscheint auf der Karte)", sum, counter),
      el("div", { class: "field" }, [el("label", { text: "Akzentfarbe" }), sw])
    ]);
  }

  /* ----- Baukasten ----- */
  var BLOCK_NAMES = { heading: "Überschrift", text: "Text", gallery: "Bilder und Videos", list: "Liste" };
  function builder(p) {
    var wrap = el("section", { class: "panel" }, [
      el("h2", { text: "Inhalt" }),
      el("p", { class: "hint", text: "Setze die Seite aus Bausteinen zusammen. Die Reihenfolge hier ist die Reihenfolge auf der Projektseite." })
    ]);
    if (!p.blocks.length) wrap.appendChild(el("p", { class: "empty-hint", text: "Noch keine Bausteine. Füge unten den ersten hinzu." }));
    p.blocks.forEach(function (b, i) { wrap.appendChild(blockEditor(p, b, i)); });
    var add = el("div", { class: "add-row" }, [el("span", { class: "lbl", text: "Baustein hinzufügen" })]);
    Object.keys(BLOCK_NAMES).forEach(function (type) {
      add.appendChild(el("button", { class: "btn btn-small btn-ghost", type: "button", text: BLOCK_NAMES[type], onclick: function () {
        var nb = type === "list" ? { type: "list", items: [] } : type === "gallery" ? { type: "gallery", items: [] } : { type: type, text: "" };
        p.blocks.push(nb); renderEditor(); markDirty();
      } }));
    });
    wrap.appendChild(add);
    return wrap;
  }

  function blockEditor(p, b, i) {
    function move(d) { var j = i + d; if (j < 0 || j >= p.blocks.length) return; var t = p.blocks[i]; p.blocks[i] = p.blocks[j]; p.blocks[j] = t; renderEditor(); markDirty(); }
    var ctl = el("div", { class: "block-ctl" }, [
      el("button", { class: "ctl", type: "button", text: "HOCH", "aria-label": "Baustein nach oben", disabled: i === 0 ? "" : null, onclick: function () { move(-1); } }),
      el("button", { class: "ctl", type: "button", text: "RUNTER", "aria-label": "Baustein nach unten", disabled: i === p.blocks.length - 1 ? "" : null, onclick: function () { move(1); } }),
      el("button", { class: "ctl", type: "button", text: "LÖSCHEN", "aria-label": "Baustein löschen", onclick: function () {
        if ((b.type === "gallery" && b.items.length) || (b.text && b.text.length > 40)) { if (!confirm("Diesen Baustein löschen?")) return; }
        if (b.type === "gallery") b.items.forEach(function (m) { dropImage(p, m); });
        p.blocks.splice(i, 1); renderEditor(); markDirty();
      } })
    ]);
    ctl.querySelectorAll("button[disabled='']").forEach(function (x) { x.disabled = true; });
    var body;
    if (b.type === "heading") body = textInput(b.text, function (v) { b.text = v; }, { maxlength: "80", "aria-label": "Überschrift" });
    else if (b.type === "text") body = el("div", {}, [areaInput(b.text, function (v) { b.text = v; }, 6), el("p", { class: "hint", text: "Eine Leerzeile beginnt einen neuen Absatz." })]);
    else if (b.type === "list") body = el("div", {}, [areaInput((b.items || []).join("\n"), function (v) { b.items = v.split("\n"); }, 5), el("p", { class: "hint", text: "Ein Punkt pro Zeile." })]);
    else body = galleryEditor(p, b);
    return el("div", { class: "block" }, [el("div", { class: "block-top" }, [el("span", { class: "lbl", text: BLOCK_NAMES[b.type] }), ctl]), body]);
  }

  function dropImage(p, m) {
    if (m.type !== "image") return;
    if (p.cover === m.src) delete p.cover;
    var pe = st.pending[m.src];
    if (pe && !pe.sent) { URL.revokeObjectURL(pe.url); delete st.pending[m.src]; }
  }

  function galleryEditor(p, b) {
    var fileIn = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: "", hidden: "" });
    var drop = el("button", { type: "button", class: "drop", text: "Bilder hierher ziehen oder tippen zum Auswählen" });
    var msg = el("p", { class: "err", role: "alert", hidden: "" });
    function handle(files) {
      msg.hidden = true;
      var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
      if (!list.length) { msg.textContent = "Das waren keine Bilder (erlaubt: PNG, JPG, WebP, GIF)."; msg.hidden = false; return; }
      list.reduce(function (chain, f) {
        return chain.then(function () { return processImage(f).then(function (path) { b.items.push({ type: "image", src: path, caption: "" }); }, function (e) { msg.textContent = f.name + ": " + e.message; msg.hidden = false; }); });
      }, Promise.resolve()).then(function () { renderEditor(); markDirty(); });
    }
    drop.addEventListener("click", function () { fileIn.click(); });
    fileIn.addEventListener("change", function () { handle(fileIn.files); fileIn.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) handle(e.dataTransfer.files); });

    var thumbs = el("div", { class: "thumbs" });
    b.items.forEach(function (m, i) {
      function move(d) { var j = i + d; if (j < 0 || j >= b.items.length) return; var t = b.items[i]; b.items[i] = b.items[j]; b.items[j] = t; renderEditor(); markDirty(); }
      var isImg = m.type === "image", img;
      if (isImg) img = el("div", { class: "thumb-img" }, [el("img", { src: H8.srcResolver(m.src), alt: "" }), p.cover === m.src ? el("span", { class: "thumb-flag", text: "TITELBILD" }) : null]);
      else img = el("div", { class: "thumb-img vid", title: m.url });
      var cap = textInput(isImg ? m.caption : m.title, function (v) { if (isImg) m.caption = v; else m.title = v; }, { placeholder: isImg ? "Bildunterschrift (optional)" : "Titel des Videos", maxlength: "80", "aria-label": "Beschriftung" });
      var ctl = el("div", { class: "thumb-ctl" }, [
        el("button", { class: "ctl", type: "button", text: "←", "aria-label": "Nach vorn", onclick: function () { move(-1); } }),
        el("button", { class: "ctl", type: "button", text: "→", "aria-label": "Nach hinten", onclick: function () { move(1); } }),
        isImg ? el("button", { class: "ctl", type: "button", text: p.cover === m.src ? "KEIN TITELBILD" : "TITELBILD", onclick: function () { if (p.cover === m.src) delete p.cover; else p.cover = m.src; renderEditor(); markDirty(); } }) : null,
        el("button", { class: "ctl", type: "button", text: "ENTFERNEN", onclick: function () { dropImage(p, m); b.items.splice(i, 1); renderEditor(); markDirty(); } })
      ]);
      thumbs.appendChild(el("div", { class: "thumb" }, [img, el("div", { class: "thumb-body" }, [cap, ctl])]));
    });

    var yt = el("input", { type: "url", class: "inp", placeholder: "YouTube-Link einfügen, z. B. https://youtu.be/...", "aria-label": "YouTube-Link" });
    var ytErr = el("p", { class: "err", role: "alert", hidden: "" });
    function addVideo() {
      var id = H8.youtubeId(yt.value);
      if (!id) { ytErr.textContent = "Das ist kein gültiger YouTube-Link."; ytErr.hidden = false; return; }
      b.items.push({ type: "youtube", url: "https://www.youtube.com/watch?v=" + id, title: "" });
      renderEditor(); markDirty();
    }
    yt.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addVideo(); } });
    return el("div", {}, [
      drop, fileIn, msg, thumbs,
      el("div", { class: "yt-row" }, [yt, el("button", { class: "btn btn-small btn-ghost", type: "button", text: "Video hinzufügen", onclick: addVideo })]), ytErr
    ]);
  }

  /* ----- Bilder verkleinern und vormerken ----- */
  function processImage(file) {
    var isGif = file.type === "image/gif";
    var base = slug(file.name.replace(/\.[^.]+$/, ""));
    var stamp = Date.now().toString(36);
    function keep(blob, ext) {
      if (blob.size > 6 * 1024 * 1024) throw new Error("Bild ist zu groß (maximal 6 MB).");
      var path = "assets/uploads/" + stamp + "-" + base + "." + ext;
      st.pending[path] = { blob: blob, url: URL.createObjectURL(blob), sent: false };
      return path;
    }
    if (isGif) return Promise.resolve().then(function () { return keep(file, "gif"); });
    return createImageBitmap(file).then(function (bmp) {
      var MAX = 1920, scale = Math.min(1, MAX / bmp.width);
      var isPng = file.type === "image/png";
      if (scale === 1 && file.size < 1.5 * 1024 * 1024) { return keep(file, file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png"); }
      var cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
      var ctx = cv.getContext("2d"); ctx.imageSmoothingQuality = "high"; ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
      var type = isPng ? "image/png" : "image/jpeg";
      return new Promise(function (res, rej) { cv.toBlob(function (bl) { bl ? res(bl) : rej(new Error("Bild konnte nicht verarbeitet werden.")); }, type, 0.88); })
        .then(function (bl) { return keep(bl, isPng ? "png" : "jpg"); });
    }, function () { throw new Error("Bild konnte nicht gelesen werden."); });
  }
  H8.srcResolver = function (src) { var pe = st.pending[src]; return pe ? pe.url : src; };

  /* ----- Links ----- */
  function linksPanel(p) {
    var wrap = el("section", { class: "panel" }, [el("h2", { text: "Links und Buttons" }), el("p", { class: "hint", text: "Erscheinen als Buttons neben dem Projekt, z. B. Download, CurseForge, GitHub." })]);
    p.links.forEach(function (l, i) {
      wrap.appendChild(el("div", { class: "link-row" }, [
        field("Beschriftung", textInput(l.label, function (v) { l.label = v; }, { maxlength: "40" })),
        field("Adresse (https://...)", textInput(l.url, function (v) { l.url = v; }, { placeholder: "https://" })),
        el("div", { class: "field" }, [el("label", { text: "Aktion" }), el("button", { class: "ctl", type: "button", text: "ENTFERNEN", onclick: function () { p.links.splice(i, 1); renderEditor(); markDirty(); } })])
      ]));
    });
    wrap.appendChild(el("button", { class: "btn btn-small btn-ghost", type: "button", text: "Link hinzufügen", onclick: function () { p.links.push({ label: "", url: "" }); renderEditor(); markDirty(); } }));
    return wrap;
  }

  /* ----- Updates ----- */
  function updatesPanel(p) {
    var wrap = el("section", { class: "panel" }, [
      el("h2", { text: "Updates" }),
      el("p", { class: "hint", text: "Das neueste Update jeder Kategorie erscheint auf der Startseite unter „Neuigkeiten“." })
    ]);
    wrap.appendChild(el("button", { class: "btn btn-small", type: "button", text: "Neues Update", onclick: function () { p.updates.unshift({ date: today(), title: "", text: "" }); renderEditor(); markDirty(); } }));
    var list = el("div", { style: "margin-top:20px" });
    p.updates.forEach(function (u, i) {
      var date = el("input", { type: "date", value: u.date || today() });
      date.addEventListener("input", function () { u.date = date.value; markDirty(); });
      list.appendChild(el("div", { class: "upd" }, [
        el("div", { class: "row2" }, [field("Datum", date), field("Titel (z. B. Version 1.2)", textInput(u.title, function (v) { u.title = v; }, { maxlength: "70" }))]),
        field("Beschreibung", areaInput(u.text, function (v) { u.text = v; }, 3)),
        el("button", { class: "ctl", type: "button", text: "UPDATE LÖSCHEN", onclick: function () { p.updates.splice(i, 1); renderEditor(); markDirty(); } })
      ]));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function dangerPanel(p) {
    return el("section", { class: "panel" }, [
      el("h2", { text: "Projekt löschen" }),
      el("p", { class: "hint", text: "Entfernt das Projekt und seine hochgeladenen Bilder beim nächsten Veröffentlichen." }),
      el("button", { class: "btn btn-small btn-danger", type: "button", text: "Projekt löschen", onclick: function () {
        if (!confirm("„" + p.title + "“ wirklich löschen?")) return;
        p.blocks.forEach(function (b) { if (b.type === "gallery") b.items.forEach(function (m) { dropImage(p, m); }); });
        st.data = st.data.filter(function (x) { return x !== p; }); delete st.newIds[p.id];
        st.sel = st.data[0] ? st.data[0].id : null; renderSide(); renderEditor(); markDirty();
      } })
    ]);
  }

  /* ----- Vorschau ----- */
  function preview(p) {
    var dlg = el("dialog", { class: "lightbox preview", "aria-label": "Vorschau" });
    var body = el("div");
    body.appendChild(el("h2", { text: p.title || "(ohne Titel)", style: "font-size:34px;margin-bottom:8px" }));
    var tags = el("div", { class: "tags preview-tags" }, [el("span", { class: "tag", text: H8.catName(p.category) }), p.subtype ? el("span", { class: "tag", text: p.subtype }) : null, el("span", { class: "tag " + (p.status === "Live" ? "is-live" : p.status === "In Arbeit" ? "is-wip" : "is-plan"), text: p.status })]);
    body.appendChild(tags);
    body.appendChild(el("p", { class: "lead", text: p.summary || "(Kurzbeschreibung fehlt)" }));
    H8.renderBlocks(p, body);
    dlg.appendChild(body);
    dlg.appendChild(el("div", { class: "lb-nav" }, [el("button", { class: "btn btn-small", type: "button", text: "Schließen", onclick: function () { dlg.close(); } })]));
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { dlg.remove(); });
    document.body.appendChild(dlg); dlg.showModal();
  }

  /* ---------- Veröffentlichen (ein Commit) ---------- */
  function referenced(data) {
    var set = {};
    data.forEach(function (p) {
      if (p.cover) set[p.cover] = 1;
      (p.blocks || []).forEach(function (b) { if (b.type === "gallery") (b.items || []).forEach(function (m) { if (m.type === "image" && m.src) set[m.src] = 1; }); });
    });
    return set;
  }
  function cleanData() {
    st.data.forEach(function (p) {
      p.blocks = (p.blocks || []).filter(function (b) {
        if (b.type === "list") { b.items = (b.items || []).map(function (x) { return String(x).trim(); }).filter(Boolean); return b.items.length; }
        if (b.type === "text" || b.type === "heading") { b.text = String(b.text || "").trim(); return b.text; }
        if (b.type === "gallery") return (b.items || []).length;
        return true;
      });
      p.links = (p.links || []).filter(function (l) { return l.label || l.url; });
      p.updates = (p.updates || []).filter(function (u) { return u.title || u.text; });
    });
  }
  function validate() {
    var problems = [];
    st.data.forEach(function (p) {
      var n = "„" + (p.title || "ohne Titel") + "“: ";
      if (!String(p.title || "").trim()) problems.push(n + "Titel fehlt.");
      if (!String(p.summary || "").trim()) problems.push(n + "Kurzbeschreibung fehlt.");
      (p.links || []).forEach(function (l) { if (l.label || l.url) { if (!l.label) problems.push(n + "Ein Link hat keine Beschriftung."); if (!/^https?:\/\//i.test(l.url || "")) problems.push(n + "Link „" + (l.label || "?") + "“ muss mit https:// beginnen."); } });
      (p.updates || []).forEach(function (u) { if ((u.title || u.text) && !String(u.title || "").trim()) problems.push(n + "Ein Update hat keinen Titel."); });
    });
    return problems;
  }

  function publish() {
    if (st.busy) return;
    cleanData(); renderEditor();
    var problems = validate();
    if (problems.length) { flash("Bitte zuerst beheben: " + problems.join(" "), false); return; }
    st.busy = true; markDirty();
    var text = serialize(), newRefd = referenced(st.data), oldRefd = referenced(safeParse(st.orig));
    var files = Object.keys(newRefd).filter(function (k) { return st.pending[k] && !st.pending[k].sent; });
    var removals = Object.keys(oldRefd).filter(function (k) { return !newRefd[k] && k.indexOf("assets/uploads/") === 0; });
    var steps = files.length + 5, done = 0;
    function prog(label) { done++; flash(label + " (" + done + "/" + steps + ")", true); }
    var baseCommit, baseTree;

    // 1) Hat jemand anders zwischenzeitlich veröffentlicht?
    api("GET", repoPath() + "/contents/" + DATA_PATH + "?ref=" + encodeURIComponent(st.branch)).then(function (f) { return b64ToText(f.content); }, function (e) { if (e.status === 404) return ""; throw e; })
      .then(function (remote) {
        if (remote !== st.origText) throw Object.assign(new Error("Seit dem Laden wurde etwas anderes veröffentlicht. Klicke auf „Verwerfen“, um den neuen Stand zu laden, und mache deine Änderung danach noch einmal."), { custom: true });
        prog("Prüfe Repository");
        return api("GET", repoPath() + "/git/ref/heads/" + encodeURIComponent(st.branch));
      }).then(function (ref) {
        baseCommit = ref.object.sha; return api("GET", repoPath() + "/git/commits/" + baseCommit);
      }).then(function (commit) {
        baseTree = commit.tree.sha;
        var entries = [];
        return files.reduce(function (chain, path) {
          return chain.then(function () {
            return st.pending[path].blob.arrayBuffer().then(function (buf) {
              return api("POST", repoPath() + "/git/blobs", { content: b64FromBytes(new Uint8Array(buf)), encoding: "base64" });
            }).then(function (bl) { entries.push({ path: path, mode: "100644", type: "blob", sha: bl.sha }); prog("Lade Bild hoch"); });
          });
        }, Promise.resolve()).then(function () {
          return api("POST", repoPath() + "/git/blobs", { content: utf8ToB64(text), encoding: "base64" });
        }).then(function (bl) {
          entries.push({ path: DATA_PATH, mode: "100644", type: "blob", sha: bl.sha });
          removals.forEach(function (p) { entries.push({ path: p, mode: "100644", type: "blob", sha: null }); });
          prog("Speichere Projektdaten");
          return api("POST", repoPath() + "/git/trees", { base_tree: baseTree, tree: entries });
        });
      }).then(function (tree) {
        prog("Erstelle Änderung");
        return api("POST", repoPath() + "/git/commits", { message: "Dashboard: Projekte aktualisiert (" + st.user + ")", tree: tree.sha, parents: [baseCommit] });
      }).then(function (commit) {
        return api("PATCH", repoPath() + "/git/refs/heads/" + encodeURIComponent(st.branch), { sha: commit.sha });
      }).then(function () {
        files.forEach(function (k) { st.pending[k].sent = true; });
        st.orig = JSON.stringify(st.data); st.origText = text; st.newIds = {};
        st.busy = false; renderSide(); markDirty();
        flash("Veröffentlicht. Die Webseite aktualisiert sich in etwa einer Minute (danach Strg+F5 drücken).", true);
      }).catch(function (e) {
        st.busy = false; markDirty();
        flash(e.custom ? e.message : "Veröffentlichen fehlgeschlagen: " + niceError(e), false);
      });
  }
  function safeParse(s) { try { return JSON.parse(s); } catch (e) { return []; } }

  /* ---------- Start ---------- */
  var t = savedToken();
  if (t) {
    root.appendChild(el("p", { class: "hint", text: "Melde an ..." }));
    connect(t, !!(function () { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } })()).catch(function (e) { forgetToken(); renderLogin(niceError(e)); });
  } else renderLogin();
})();
