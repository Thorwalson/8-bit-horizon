/* =========================================================
   8-bit Horizon – zentrale Inhalte
   Hier pflegst du alles, was auf der Seite erscheint.
   Neue Projekte: einfach einen Block in "projects" kopieren.
   ========================================================= */
window.SITE = {
  name: "8-bit Horizon",
  tagline: "Addons und Games von zwei Entwicklern, gebaut zusammen mit der Community.",

  discord: "https://discord.gg/2z7APn3wnQ",

  // Passwort für das versteckte Modus-Menü (als Hash, nicht im Klartext).
  // Aktuelles Passwort: horizon  <- bitte ändern!
  // Neues Passwort: passwort.html im Browser öffnen, Passwort eingeben,
  // die erzeugte Zeile hier an Stelle dieser Zeile einfügen.
  themePasswordHash: "21814002a45929db5d29971d078b6e3d1e634461b19afdb621fecb4291d8ff6e",

  // Weitere Plattformen: URL eintragen, dann erscheint der Link automatisch.
  // Leer lassen = bleibt unsichtbar.
  socials: [
    { name: "GitHub",    url: "" },
    { name: "YouTube",   url: "" },
    { name: "Twitch",    url: "" },
    { name: "TikTok",    url: "" },
    { name: "Instagram", url: "" },
    { name: "X",         url: "" }
  ],

  // Kategorien der Projekte (Reihenfolge = Reihenfolge auf der Seite)
  categories: [
    { id: "addons", name: "Addons und Mods" },
    { id: "games",  name: "Spiele" },
    { id: "tools",  name: "Programme und Tools" }
  ],

  // Hierhin veröffentlicht das Admin-Dashboard (admin.html).
  github: { owner: "Thorwalson", repo: "8-bit-horizon" }

  // Die Projekte selbst stehen in data/projects.js und werden über admin.html bearbeitet.
};
