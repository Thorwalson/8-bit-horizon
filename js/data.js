/* =========================================================
   8-bit Horizon – zentrale Inhalte
   Hier pflegst du alles, was auf der Seite erscheint.
   Neue Projekte: einfach einen Block in "projects" kopieren.
   ========================================================= */
window.SITE = {
  name: "8-bit Horizon",
  tagline: "Addons und Games von zwei Entwicklern, gebaut zusammen mit der Community.",

  discord: "https://discord.gg/2z7APn3wnQ",

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

  // Typen erscheinen automatisch als Filter auf der Projekte-Seite.
  // status: "Live" | "In Arbeit" | "Geplant"
  projects: [
    {
      id: "wow-addon",                       // wird in der URL benutzt: project.html?id=wow-addon
      title: "WoW-Addon",                    // TODO: Name deines Addons eintragen
      type: "WoW-Addon",
      status: "In Arbeit",
      accent: "#ff8a1f",
      summary: "Ein Addon für World of Warcraft, entwickelt von uns und mit Feedback aus der Community weitergebaut.",
      description: [
        "TODO: Hier steht die ausführliche Beschreibung deines Addons: Was macht es, für wen ist es gedacht, was macht es besonders?",
        "Jede Zeile in dieser Liste wird ein eigener Absatz."
      ],
      features: [
        "TODO: Erste Funktion",
        "TODO: Zweite Funktion",
        "TODO: Dritte Funktion"
      ],
      links: [
        // { label: "CurseForge", url: "https://..." },
        // { label: "GitHub",     url: "https://..." },
        { label: "Support im Discord", url: "https://discord.gg/2z7APn3wnQ" }
      ],
      screenshots: []                        // z. B. ["assets/img/wow-addon-1.png"]
    },
    {
      id: "naechstes-spiel",
      title: "Nächstes Spiel",
      type: "Game",
      status: "Geplant",
      accent: "#3aa8ff",
      summary: "Ein neues Spielprojekt ist in Planung. Auf Discord kannst du schon jetzt mitreden.",
      description: [
        "TODO: Sobald das Projekt konkret wird, kommen hier Idee, Genre und Stand der Entwicklung hin."
      ],
      features: [],
      links: [
        { label: "Ideen auf Discord teilen", url: "https://discord.gg/2z7APn3wnQ" }
      ],
      screenshots: []
    }
  ]
};
