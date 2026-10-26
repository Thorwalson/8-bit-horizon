/* =========================================================
   Themes: Jahreszeiten und Events
   - detectTheme() wählt anhand des Datums automatisch
   - ?theme=halloween in der URL erzwingt ein Theme (zum Testen)
   Neues Event? Theme-Block kopieren und in pickByDate() eintragen.
   ========================================================= */
(function () {
  "use strict";

  var THEMES = {
    sunset: {
      name: "Sonnenuntergang", greeting: "",
      css: { bg: "#0a0c1f", panel: "#12162e", ink: "#f2f6ff", muted: "#a3aed6", accent: "#ff8a1f", accent2: "#3aa8ff", line: "#26305e" },
      scene: {
        sky: ["#4a0a12", "#b81c0e", "#ff5a0a", "#ff9a1a", "#ffd24a", "#fff0a0"],
        sun: "#fff3b0", halo: "#ffb02e", sunR: 0.095,
        farMtn: "#2b57b0", farLow: "#7a6aa0", nearMtn: "#0d2a6e", mtnEdge: "#4fb3ff",
        land: "#050f20", landFar: "#0b2250", landEdge: "#1c5fc0",
        tree: "#041322", treeLight: "#12418a",
        waterMid: "#ffb02e", waterEdge: "#1b5fc4", glint: "#fff3b0", glintSpread: 0.32,
        castle: "#081230", castleEdge: "#3aa8ff", window: "#ffd24a", flag: "#3aa8ff",
        cloud: ["#ff9a4a", "#b8300e"], clouds: 5,
        particles: { kind: "rise", colors: ["#ffd24a", "#ff8a1f", "#ffffff"], density: 0.9 }
      }
    },

    spring: {
      name: "Frühling", greeting: "",
      css: { bg: "#0b1424", panel: "#122038", ink: "#f4f8ff", muted: "#a9b9d8", accent: "#ff8fc0", accent2: "#8fe08f", line: "#2a4268" },
      scene: {
        sky: ["#5c7cff", "#8fa4ff", "#c9b4ff", "#ffbfdc", "#ffdcb4", "#fff2c8"],
        sun: "#fffbe0", halo: "#ffd9e8", sunR: 0.085,
        farMtn: "#6f8fe0", farLow: "#c9c4f0", nearMtn: "#3d62b8", mtnEdge: "#c8e0ff",
        land: "#0e4a2c", landFar: "#2f8a52", landEdge: "#8fe08f",
        tree: "#0a3a22", treeLight: "#4fbf6a",
        waterMid: "#ffcfe2", waterEdge: "#58b4f0", glint: "#ffffff", glintSpread: 0.3,
        castle: "#3a4a86", castleEdge: "#c8e0ff", window: "#fff2a0", flag: "#ff8fc0",
        cloud: ["#ffffff", "#d9c8f5"], clouds: 6,
        particles: { kind: "fall", colors: ["#ffb3d1", "#ff8fc0", "#ffffff", "#ffd1e6"], density: 0.55, vy: 7, vx: -5, sway: 1.8, shape: "petal" }
      }
    },

    autumn: {
      name: "Herbst", greeting: "",
      css: { bg: "#150a10", panel: "#231019", ink: "#fff4ea", muted: "#d3b2a2", accent: "#ff7a1a", accent2: "#ffc14a", line: "#52263a" },
      scene: {
        sky: ["#220a1c", "#6a1824", "#c2401a", "#f07a1c", "#ffb840", "#ffe08a"],
        sun: "#ffd98a", halo: "#ff9a3a", sunR: 0.1,
        farMtn: "#7a3a52", farLow: "#c8683a", nearMtn: "#3a1a34", mtnEdge: "#ff9a3a",
        land: "#1a0b0a", landFar: "#3a1a22", landEdge: "#ff9a3a",
        tree: "#2a1006", treeLight: "#8a3a10", treeAccents: ["#ff7a1a", "#d93a1a", "#ffc14a"],
        waterMid: "#ffa23a", waterEdge: "#5a2a68", glint: "#ffe08a", glintSpread: 0.3,
        castle: "#1c0a1a", castleEdge: "#ff9a3a", window: "#ffd24a", flag: "#ff7a1a",
        cloud: ["#ffb070", "#8a2a22"], clouds: 6,
        particles: { kind: "fall", colors: ["#ff7a1a", "#d93a1a", "#ffc14a", "#b8501a"], density: 0.5, vy: 9, vx: -7, sway: 2.6, shape: "leaf" }
      }
    },

    winter: {
      name: "Winter", greeting: "",
      css: { bg: "#08122a", panel: "#0f1d42", ink: "#f2f8ff", muted: "#a4b8e0", accent: "#7fd4ff", accent2: "#ffffff", line: "#2a4584" },
      scene: {
        sky: ["#0a1230", "#16286a", "#2f4f9a", "#6f94d8", "#b4d2f2", "#e6f4ff"],
        sun: "#ffffff", halo: "#cfe8ff", sunR: 0.075,
        farMtn: "#5f84c8", farLow: "#b4cce8", nearMtn: "#1e3a7a", mtnEdge: "#e6f4ff", snowcap: true,
        land: "#0a1c36", landFar: "#2a4a80", landEdge: "#e6f4ff",
        tree: "#072033", treeLight: "#1e5a7a", treeSnow: "#e6f4ff",
        waterMid: "#d6f0ff", waterEdge: "#5f9ee0", glint: "#ffffff", glintSpread: 1,
        castle: "#14264e", castleEdge: "#e6f4ff", window: "#ffd98a", flag: "#7fd4ff",
        cloud: ["#cfe0f8", "#7a96c8"], clouds: 4, stars: 0.3, aurora: true,
        particles: { kind: "fall", colors: ["#ffffff", "#dff0ff"], density: 1.1, vy: 10, vx: -2, sway: 1.5, shape: "flake" }
      }
    },

    halloween: {
      name: "Halloween", greeting: "Frohes Gruseln!",
      css: { bg: "#0d0614", panel: "#1a0c26", ink: "#fff1e6", muted: "#c3a8d6", accent: "#ff7a1a", accent2: "#9b5cff", line: "#47246c" },
      scene: {
        sky: ["#0a0218", "#2a0a46", "#5a1468", "#a02a5a", "#e0501a", "#ff9a1a"],
        sun: "#ffb347", halo: "#ff7a1a", sunR: 0.17, craters: true,
        farMtn: "#3a1a66", farLow: "#8a2a5a", nearMtn: "#140726", mtnEdge: "#8a4ae0",
        land: "#06020c", landFar: "#14082a", landEdge: "#6a3ab8",
        tree: "#05020a", treeLight: "#3a1a66",
        waterMid: "#ff8a2a", waterEdge: "#2a1050", glint: "#ffd08a", glintSpread: 0.3,
        castle: "#0a0414", castleEdge: "#8a4ae0", window: "#7dff5a", windowFlicker: true, flag: "#ff7a1a",
        cloud: ["#6a2a7a", "#2a0e3e"], clouds: 5, stars: 0.35,
        fog: true, bats: 6, pumpkins: true,
        particles: { kind: "rise", colors: ["#ff9a1a", "#ffd24a"], density: 0.35 }
      }
    },

    christmas: {
      name: "Weihnachten", greeting: "Frohe Weihnachten!",
      css: { bg: "#07130f", panel: "#0d2018", ink: "#fff6ee", muted: "#a9cdb8", accent: "#ff4a4a", accent2: "#ffd24a", line: "#245a40" },
      scene: {
        sky: ["#04081c", "#0a1a4a", "#133070", "#2a5a9a", "#6a9ad0", "#c8dcf2"],
        sun: "#fff6d6", halo: "#d6e8ff", sunR: 0.06, sunX: 0.32, sunY: 0.26,
        farMtn: "#3a64a8", farLow: "#8aaed8", nearMtn: "#12305e", mtnEdge: "#f2f8ff", snowcap: true,
        land: "#04170f", landFar: "#12406a", landEdge: "#f2f8ff",
        tree: "#05261a", treeLight: "#1a6a42", treeSnow: "#f2f8ff", lights: true,
        waterMid: "#bcd8f2", waterEdge: "#3a6ab8", glint: "#ffffff", glintSpread: 1,
        castle: "#0e2048", castleEdge: "#f2f8ff", window: "#ffd24a", flag: "#ff4a4a",
        cloud: ["#9ab4dc", "#4a6498"], clouds: 3, stars: 0.6,
        particles: { kind: "fall", colors: ["#ffffff", "#e6f2ff"], density: 1.3, vy: 11, vx: -3, sway: 1.4, shape: "flake" }
      }
    },

    newyear: {
      name: "Silvester", greeting: "Guten Rutsch!",
      css: { bg: "#060616", panel: "#0e0e2a", ink: "#f6f4ff", muted: "#aaa8d6", accent: "#ffd24a", accent2: "#ff4aa8", line: "#34346e" },
      scene: {
        sky: ["#02020a", "#0a0630", "#1e0a5a", "#4a1280", "#8a1a8a", "#d4306a"],
        sun: "#ffe08a", halo: "#ff4aa8", sunR: 0.0,
        farMtn: "#1e1a5a", farLow: "#5a1a6a", nearMtn: "#0a0a2a", mtnEdge: "#6a5ae0",
        land: "#03030e", landFar: "#0e0e34", landEdge: "#4a4ac0",
        tree: "#030310", treeLight: "#24246a",
        waterMid: "#d4306a", waterEdge: "#14144a", glint: "#ffd24a", glintSpread: 1,
        castle: "#06061c", castleEdge: "#6a5ae0", window: "#ffd24a", flag: "#ffd24a",
        cloud: ["#4a1a7a", "#1a0a3a"], clouds: 2, stars: 0.9, fireworks: true,
        particles: { kind: "rise", colors: ["#ffd24a", "#ff4aa8", "#4ad0ff"], density: 0.3 }
      }
    },

    easter: {
      name: "Ostern", greeting: "Frohe Ostern!",
      css: { bg: "#111a2c", panel: "#18263c", ink: "#fffaf0", muted: "#b4c4de", accent: "#ffd95a", accent2: "#b49cff", line: "#34507e" },
      scene: {
        sky: ["#6ec0ff", "#9ad4ff", "#c8e4ff", "#ffd6f0", "#fff0b4", "#fffbd8"],
        sun: "#fffbe6", halo: "#fff0b4", sunR: 0.085,
        farMtn: "#8fb0f0", farLow: "#d4dcf8", nearMtn: "#5a82d0", mtnEdge: "#e6f0ff",
        land: "#2f9a4a", landFar: "#78d080", landEdge: "#b4f09a",
        tree: "#1f7a3a", treeLight: "#6ad07a",
        waterMid: "#e6f4ff", waterEdge: "#58b4f0", glint: "#ffffff", glintSpread: 0.35,
        castle: "#5a6ab8", castleEdge: "#e6f0ff", window: "#fff2a0", flag: "#ff9fd0",
        cloud: ["#ffffff", "#cfdcf5"], clouds: 6, eggs: true,
        particles: { kind: "fall", colors: ["#ffffff", "#ffd95a", "#ff9fd0", "#b49cff"], density: 0.25, vy: 5, vx: -3, sway: 2.2, shape: "petal" }
      }
    }
  };

  /* ---------- Datumslogik ---------- */
  // Ostersonntag (anonymer gregorianischer Algorithmus)
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  function pickByDate(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var md = m * 100 + day;                       // z. B. 1026 = 26. Oktober
    var DAY = 86400000;

    if (md >= 1228 || md <= 103) return "newyear";       // 28.12. – 3.1.
    if (md >= 1201) return "christmas";                   // 1.12. – 27.12.
    if (md >= 1015 && md <= 1101) return "halloween";    // 15.10. – 1.11.

    var easter = easterSunday(y).getTime();
    var diff = Math.round((new Date(y, m - 1, day).getTime() - easter) / DAY);
    if (diff >= -14 && diff <= 1) return "easter";        // 2 Wochen vor bis Ostermontag

    if (md >= 301 && md <= 531) return "spring";
    if (md >= 601 && md <= 831) return "sunset";
    if (md >= 901 && md <= 1130) return "autumn";
    return "winter";                                      // 4.1. – 28.2.
  }

  var KEY = "h8-theme";
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { if (v === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) {} }

  function currentChoice() {
    var q = new URLSearchParams(location.search).get("theme");
    if (q && THEMES[q]) return q;
    var s = stored();
    if (s && THEMES[s]) return s;
    return "auto";
  }

  function resolve(choice) { return choice === "auto" ? pickByDate(new Date()) : choice; }

  function apply(id) {
    var t = THEMES[id] || THEMES.sunset, r = document.documentElement;
    if (window.H8) window.H8.current = id;
    r.setAttribute("data-theme", id);
    Object.keys(t.css).forEach(function (k) { r.style.setProperty("--" + k, t.css[k]); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.css.bg);
    window.dispatchEvent(new CustomEvent("h8theme", { detail: { id: id, theme: t } }));
  }

  window.H8 = {
    THEMES: THEMES, pickByDate: pickByDate, resolve: resolve, apply: apply,
    currentChoice: currentChoice, store: store
  };

  apply(resolve(currentChoice()));
})();
