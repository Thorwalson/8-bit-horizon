/* =========================================================
   Pixel-Szene: gezeichnet auf einem kleinen Canvas, das mit
   scharfen Pixeln hochskaliert wird. Farben, Wetter und
   Deko kommen aus dem jeweiligen Theme (themes.js).
   ========================================================= */
(function () {
  "use strict";

  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Helfer ---------- */
  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return a == null ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")" : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(rand) {
    var t = []; for (var i = 0; i < 256; i++) t.push(rand());
    return function (x) {
      var i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
      return t[i & 255] * (1 - s) + t[(i + 1) & 255] * s;
    };
  }
  function gradient(stops, t) {
    var n = stops.length - 1, p = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(p));
    return mix(stops[i], stops[i + 1], p - i);
  }

  /* ---------- Sprites ---------- */
  var BAT = [
    ["X.....X", "XXX.XXX", "XXXXXXX", ".X.X.X."],
    [".X...X.", "XXXXXXX", "XX.X.XX", "X.....X"]
  ];
  var PUMPKIN = [
    "....ggg....", "..ooooooo..", ".ooooooooo.", "ooyyoooyyoo", "ooooooooooo",
    "oyyoyyyoyyo", "ooyyyyyyyoo", ".ooooooooo.", "..ooooooo.."
  ];
  var EGG = [".aa.", "aaaa", "abba", "aaaa", ".aa."];

  function Layer(W, H) {
    this.W = W; this.H = H;
    this.img = new ImageData(W, H);
    this.d = this.img.data;
  }
  Layer.prototype.set = function (x, y, c, a) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    var i = (y * this.W + x) * 4, d = this.d;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a == null ? 255 : a;
  };
  Layer.prototype.rect = function (x, y, w, h, c) {
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c);
  };
  Layer.prototype.toCanvas = function () {
    var cv = document.createElement("canvas"); cv.width = this.W; cv.height = this.H;
    cv.getContext("2d").putImageData(this.img, 0, 0); return cv;
  };

  /* =========================================================
     Scene
     ========================================================= */
  function Scene(host, opts) {
    this.host = host;
    this.mode = (opts && opts.mode) || "hero";      // "hero" | "strip"
    this.canvas = document.createElement("canvas");
    this.canvas.className = "scene-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.theme = null; this.t = 0; this.running = false; this.visible = true;
    var self = this, timer;
    window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(function () { self.build(); }, 150); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; }).observe(host);
    }
    document.addEventListener("visibilitychange", function () { self.visible = !document.hidden; });
  }

  Scene.prototype.setTheme = function (theme) {
    this.theme = theme; this.build();
  };

  Scene.prototype.build = function () {
    if (!this.theme) return;
    var host = this.host, w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    var P = clamp(Math.round(w / 250), 3, 8);
    var W = Math.ceil(w / P), H = Math.ceil(h / P);
    this.P = P; this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.style.width = W * P + "px"; this.canvas.style.height = H * P + "px";
    this.ctx.imageSmoothingEnabled = false;
    this.buildLayers();
    this.buildDynamic();
    this.draw(0);
    if (!REDUCE) this.start();
  };

  /* ---------- Statische Ebenen ---------- */
  Scene.prototype.buildLayers = function () {
    var T = this.theme.scene, W = this.W, H = this.H, hero = this.mode === "hero";
    var y0 = Math.round(H * (hero ? 0.58 : 0.8));
    var cx = Math.round(W / 2);
    var rand = mulberry(42), noise = makeNoise(mulberry(7));
    var C = {}; Object.keys(T).forEach(function (k) { if (typeof T[k] === "string" && T[k][0] === "#") C[k] = hex(T[k]); });
    var sky = T.sky.map(hex);
    this.y0 = y0; this.cx = cx;

    var A = new Layer(W, H), B = new Layer(W, H);

    /* Himmel mit Dithering (klassische Pixel-Farbverläufe) */
    var bayer = [[0, 2], [3, 1]], N = 14;
    for (var y = 0; y < y0; y++) {
      for (var x = 0; x < W; x++) {
        var t = y / Math.max(1, y0 - 1);
        var tq = Math.floor(t * N + bayer[y & 1][x & 1] / 4) / N;
        A.set(x, y, gradient(sky, tq));
      }
    }

    /* Sonne / Mond */
    var R = Math.round((T.sunR || 0) * H);
    this.sun = null;
    if (R > 0) {
      var sx = Math.round(W * (T.sunX != null ? T.sunX : 0.5));
      var sy = T.sunY != null ? Math.round(H * T.sunY) : y0 - Math.round(R * 0.25);
      this.sun = { x: sx, y: sy, r: R };
      var halo = C.halo;
      for (y = 0; y < y0; y++) for (x = 0; x < W; x++) {
        var dx = x - sx, dy = y - sy, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) {
          var col = C.sun;
          if (T.craters) {
            var cr = [[-0.3, -0.25, 0.2], [0.28, 0.12, 0.24], [-0.05, 0.5, 0.14], [0.45, -0.4, 0.1]];
            for (var k = 0; k < cr.length; k++) {
              var ex = dx - cr[k][0] * R, ey = dy - cr[k][1] * R;
              if (Math.sqrt(ex * ex + ey * ey) < cr[k][2] * R) col = mix(C.sun, [90, 20, 10], 0.28);
            }
          }
          A.set(x, y, col);
        } else if (d < R * 3.4) {
          var g = 1 - (d - R) / (R * 2.4), q = Math.floor(g * 4) / 4;
          if (q > 0) { var cur = [A.d[(y * W + x) * 4], A.d[(y * W + x) * 4 + 1], A.d[(y * W + x) * 4 + 2]]; A.set(x, y, mix(cur, halo, q * 0.55)); }
        }
      }
    }

    /* Berge */
    var amp = y0 * (hero ? 0.66 : 0.56);
    function ridge(n) { return 1 - Math.abs(2 * n - 1); }
    function edge(x, th) { var d = Math.abs(x - cx) / (W / 2); return smooth(clamp((d - th) / (1 - th), 0, 1)); }
    function height(x, seed, th, scale) {
      var n = 0.65 * noise(x * 0.045 + seed) + 0.35 * noise(x * 0.13 + seed * 2);
      return edge(x, th) * amp * scale * (0.45 + 0.9 * ridge(n));
    }
    var farTop = [], nearTop = [];
    for (x = 0; x < W; x++) {
      farTop[x] = Math.round(y0 - height(x, 3, 0.16, 0.74));
      nearTop[x] = Math.round(y0 - height(x, 11, 0.3, 0.8));
    }

    /* Klippe rechts (trägt die Burg) */
    var cliffStart = W * 0.66, plateauY = Math.round(y0 * (hero ? 0.62 : 0.55)), cliffTop = [];
    for (x = 0; x < W; x++) {
      var ct = y0;
      if (x > cliffStart) {
        var u = (x - cliffStart) / (W - cliffStart);
        var ramp = smooth(clamp(u / 0.55, 0, 1));
        ct = Math.round(y0 - (y0 - plateauY) * ramp + (1 - ramp) * 0 - noise(x * 0.3 + 40) * 4 * (1 - ramp * 0.6));
        if (u > 0.55) ct = plateauY + Math.round(noise(x * 0.5 + 9) * 2);
      }
      cliffTop[x] = ct;
    }

    for (x = 0; x < W; x++) {
      for (y = farTop[x]; y < y0; y++) {
        var f = (y - farTop[x]) / Math.max(1, y0 - farTop[x]);
        var c = mix(C.farMtn, C.farLow, f * f);
        if (T.snowcap && y - farTop[x] < (y0 - farTop[x]) * 0.28 * (0.5 + noise(x * 0.4 + y * 0.2))) c = mix(c, C.mtnEdge, 0.9);
        B.set(x, y, c);
      }
      B.set(x, farTop[x], mix(C.farMtn, C.mtnEdge, 0.7));
    }
    for (x = 0; x < W; x++) {
      var top = nearTop[x];
      for (y = top; y < y0; y++) {
        var c2 = C.nearMtn;
        if (T.snowcap && y - top < (y0 - top) * 0.24 * (0.4 + noise(x * 0.5 + y * 0.3))) c2 = mix(c2, C.mtnEdge, 0.85);
        else if (x > 0 && nearTop[x - 1] > top && y - top < 3) c2 = mix(c2, C.mtnEdge, 0.55);
        B.set(x, y, c2);
      }
      B.set(x, top, mix(C.nearMtn, C.mtnEdge, 0.8));
    }
    for (x = 0; x < W; x++) {
      if (cliffTop[x] >= y0) continue;
      for (y = cliffTop[x]; y < y0; y++) {
        var cc = C.castle;
        if (y - cliffTop[x] < 2 || (x > 0 && cliffTop[x - 1] > cliffTop[x] && y - cliffTop[x] < 4)) cc = mix(C.castle, C.castleEdge, 0.7);
        B.set(x, y, cc);
      }
    }

    /* Burg */
    this.windows = []; this.flag = null;
    var tx = Math.round(W * 0.885), baseY = plateauY + 1;
    var cH = Math.round(hero ? H * 0.23 : plateauY * 0.95);
    var tw = Math.max(8, Math.round(cH * 0.27));
    var lit = mix(C.castle, C.castleEdge, 0.8);
    function tower(cxp, wdt, hgt) {
      var x0 = Math.round(cxp - wdt / 2), y1 = baseY - hgt;
      B.rect(x0, y1, wdt, hgt, C.castle);
      for (var i = 0; i < wdt; i += 3) B.rect(x0 + i, y1 - 2, Math.min(2, wdt - i), 2, C.castle);   // Zinnen
      B.rect(x0, y1 - 2, 1, hgt + 2, lit);                                                            // Lichtkante links
      for (i = 0; i < wdt; i += 3) B.set(x0 + i, y1 - 2, lit);
      return { x0: x0, y1: y1, w: wdt, h: hgt };
    }
    var main = tower(tx, tw, cH);
    tower(tx + tw * 0.95, Math.round(tw * 0.8), Math.round(cH * 0.55));
    tower(tx - tw * 1.35, Math.round(tw * 0.7), Math.round(cH * 0.4));
    B.rect(Math.round(tx - tw * 1.6), baseY - Math.round(cH * 0.22), Math.round(tw * 1.5), Math.round(cH * 0.22), C.castle);
    // Fenster
    var wy = main.y1 + Math.round(cH * 0.22);
    [[0.3, 0], [0.62, 0], [0.46, 0.3]].forEach(function (p, i) {
      this.windows.push({ x: main.x0 + Math.round(main.w * p[0]), y: wy + Math.round(cH * p[1]), w: 2, h: 3, ph: i * 1.7 });
    }, this);
    this.windows.push({ x: Math.round(tx + tw * 0.8), y: baseY - Math.round(cH * 0.35), w: 2, h: 2, ph: 5.1 });
    // Fahnenstange
    var px = Math.round(tx), py = main.y1 - 2 - Math.round(cH * 0.2);
    B.rect(px, py, 1, Math.round(cH * 0.2) + 1, mix(C.castle, C.castleEdge, 0.3));
    this.flag = { x: px + 1, y: py };

    /* Wasser, Land, Fluss */
    var isLand = new Uint8Array(W * H);
    this.riverC = []; this.riverW = [];
    var landC = C.land, landFar = C.landFar;
    for (y = y0; y < H; y++) {
      var dyy = y - y0;
      var c0 = cx + Math.sin(dyy * 0.075) * W * 0.045 * Math.min(1, dyy / (H * 0.25));
      var rw = W * 0.09 + dyy * 0.0019 * W;
      var sea = Math.max(0, W * 0.36 * (1 - dyy / (H * 0.09)));
      var wd = hero ? Math.max(rw, sea) : 0;
      this.riverC[y] = c0; this.riverW[y] = wd;
      for (x = 0; x < W; x++) {
        var water = hero && Math.abs(x - c0) < wd;
        if (water) {
          var uu = clamp(Math.abs(x - c0) / wd, 0, 1);
          var wc = mix(C.waterMid, C.waterEdge, Math.pow(uu, 0.75));
          if (((y >> 1) & 1) === 1) wc = mix(wc, [255, 255, 255], 0.05);
          B.set(x, y, wc);
        } else {
          isLand[y * W + x] = 1;
          B.set(x, y, mix(landFar, landC, clamp(dyy / Math.max(1, H - y0), 0, 1)));
        }
      }
    }
    // Uferlinie
    for (y = y0; y < H; y++) for (x = 1; x < W - 1; x++) {
      if (isLand[y * W + x] && (!isLand[y * W + x - 1] || !isLand[y * W + x + 1])) B.set(x, y, C.landEdge);
    }
    if (!hero) for (x = 0; x < W; x++) B.set(x, y0, C.landEdge);
    this.isLand = isLand;

    /* Bäume */
    var trees = [], count = Math.round(W * H / (hero ? 170 : 90));
    var tries = 0;
    while (trees.length < count && tries++ < count * 12) {
      var ty = Math.round(y0 + 2 + Math.pow(rand(), 1.15) * (H - y0 - 3)), tx2 = Math.floor(rand() * W);
      if (ty >= H || !isLand[ty * W + tx2]) continue;
      trees.push({ x: tx2, y: ty });
    }
    trees.sort(function (a, b) { return a.y - b.y; });
    this.lights = [];
    var tlight = C.treeLight, accents = T.treeAccents ? T.treeAccents.map(hex) : null;
    trees.forEach(function (tr) {
      var prog = (tr.y - y0) / Math.max(1, H - y0);
      var tcol = mix(C.tree, C.landFar, (1 - prog) * 0.55);
      var ht = Math.round(5 + prog * (hero ? H * 0.16 : 6) + rand() * 3);
      for (var r = 0; r < ht; r++) {
        var half = Math.round(r * 0.3 + 0.4), yy = tr.y - ht + r;
        for (var xx = -half; xx <= half; xx++) {
          var col = tcol;
          if (xx === -half && r % 4 === 1) col = tlight;
          if (accents && rand() < 0.1) col = accents[Math.floor(rand() * accents.length)];
          if (T.treeSnow && (r < 3 || (xx === half && r % 3 === 1))) col = hex(T.treeSnow);
          B.set(tr.x + xx, yy, col);
        }
        if (T.lights && r % 4 === 2 && ht > 9) {
          this.lights.push({ x: tr.x + (rand() < 0.5 ? -half : half), y: yy, k: this.lights.length });
        }
      }
      B.set(tr.x, tr.y, tcol); B.set(tr.x, tr.y + 1, tcol);
    }, this);

    this.A = A.toCanvas(); this.B = B.toCanvas();
    this.C = C; this.rand = rand;
  };

  /* ---------- Bewegte Elemente ---------- */
  Scene.prototype.buildDynamic = function () {
    var T = this.theme.scene, W = this.W, H = this.H, y0 = this.y0, hero = this.mode === "hero";
    var r = mulberry(99), self = this;

    // Sterne
    this.stars = [];
    if (T.stars) {
      var n = Math.floor(W * y0 * T.stars / 90);
      for (var i = 0; i < n; i++) {
        var sx = Math.floor(r() * W), sy = Math.floor(Math.pow(r(), 1.3) * (y0 - 2));
        if (this.sun && Math.hypot(sx - this.sun.x, sy - this.sun.y) < this.sun.r * 1.6) continue;
        this.stars.push({ x: sx, y: sy, ph: r() * 6.28, big: r() < 0.08 });
      }
    }

    // Wolken
    this.clouds = [];
    var cn = this.mode === "hero" ? (T.clouds || 0) : Math.ceil((T.clouds || 0) / 2);
    for (i = 0; i < cn; i++) {
      this.clouds.push({ x: r() * W, y: Math.round(H * 0.07 + r() * y0 * 0.5), w: Math.round(18 + r() * 26), h: 3 + Math.floor(r() * 2), v: 1.5 + r() * 3 });
    }

    // Wasserglitzern
    this.glints = [];
    if (hero) {
      var gn = Math.floor(W * (T.glintSpread >= 1 ? 0.9 : 0.55));
      for (i = 0; i < gn; i++) {
        var gy = Math.floor(y0 + 1 + Math.pow(r(), 0.9) * (H - y0 - 2));
        this.glints.push({ y: gy, dx: (r() - 0.5) * 2, ph: r() * 6.28, sp: 1.5 + r() * 2.5 });
      }
    }

    // Partikel
    this.parts = [];
    var pc = T.particles;
    if (pc) {
      var cnt = Math.round(W * H / 380 * pc.density);
      for (i = 0; i < cnt; i++) this.parts.push(this.newPart(pc, true, r));
    }

    // Fledermäuse, Nebel, Feuerwerk, Kürbisse, Eier
    this.bats = [];
    for (i = 0; i < (T.bats || 0); i++) this.bats.push({ x: r() * W, y: H * 0.1 + r() * y0 * 0.55, v: 7 + r() * 9, ph: r() * 6, wob: r() * 6 });
    this.fog = [];
    if (T.fog) for (i = 0; i < 9; i++) this.fog.push({ x: r() * W, y: y0 - 6 + Math.floor(r() * 12) + (i % 3) * 10, w: 30 + r() * 60, v: 2 + r() * 3 });
    this.fw = []; this.fwNext = 0.5;
    this.pumpkins = [];
    if (T.pumpkins && hero) {
      this.pumpkins.push({ x: Math.round(W * 0.2), y: H - 12 }, { x: Math.round(W * 0.79), y: H - 14 });
    }
    this.eggs = [];
    if (T.eggs && hero) {
      var cols = [["#ff7ab8", "#fff"], ["#7ab8ff", "#ffe066"], ["#b49cff", "#fff"], ["#ffe066", "#ff7ab8"], ["#7affc0", "#fff"]];
      var tries = 0;
      while (this.eggs.length < 12 && tries++ < 300) {
        var ex = Math.floor(r() * W), ey = Math.floor(H * 0.78 + r() * (H * 0.2));
        if (ey >= H - 11 || !this.isLand[ey * W + ex]) continue;
        this.eggs.push({ x: ex, y: ey, c: cols[this.eggs.length % cols.length] });
      }
    }
  };

  Scene.prototype.newPart = function (pc, init, r) {
    r = r || Math.random;
    var W = this.W, H = this.H, rise = pc.kind === "rise";
    var p = {
      x: r() * W, y: init ? r() * H : (rise ? H + 2 : -3),
      c: pc.colors[Math.floor(r() * pc.colors.length)], ph: r() * 6.28,
      vy: rise ? -(3 + r() * 5) : ((pc.vy || 8) * (0.6 + r() * 0.8)),
      vx: rise ? (r() - 0.5) * 3 : ((pc.vx || 0) * (0.6 + r() * 0.8)),
      sw: (pc.sway || 1) * (0.6 + r() * 0.8), big: r() < 0.3
    };
    return p;
  };

  /* ---------- Zeichnen ---------- */
  Scene.prototype.draw = function (t) {
    var ctx = this.ctx, T = this.theme.scene, W = this.W, H = this.H, C = this.C, y0 = this.y0;
    var i, p, s;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.A, 0, 0);

    // Sterne
    for (i = 0; i < this.stars.length; i++) {
      s = this.stars[i];
      var tw = Math.sin(t * 2 + s.ph);
      ctx.fillStyle = tw > 0.4 ? "#ffffff" : tw > -0.5 ? "#b8c8ff" : "#6a78b8";
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big && tw > 0) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
    }

    // Polarlicht
    if (T.aurora) {
      var ac = ["#5dffb0", "#4ad0ff", "#b08cff"];
      for (var k = 0; k < 3; k++) {
        ctx.fillStyle = ac[k];
        for (var x = 0; x < W; x++) {
          var yc = H * (0.12 + 0.05 * k) + Math.sin(x * 0.04 + t * 0.5 + k * 2) * H * 0.04;
          var hh = Math.round(H * 0.12);
          ctx.globalAlpha = 0.1; ctx.fillRect(x, Math.round(yc), 1, hh);
          ctx.globalAlpha = 0.08; ctx.fillRect(x, Math.round(yc) + 2, 1, Math.round(hh * 0.6));
          ctx.globalAlpha = 0.07; ctx.fillRect(x, Math.round(yc) + 4, 1, Math.round(hh * 0.3));
        }
      }
      ctx.globalAlpha = 1;
    }

    // Wolken
    var cl = T.cloud.map(hex);
    for (i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      var cxp = ((c.x + t * c.v) % (W + c.w * 2)) - c.w;
      ctx.globalAlpha = 0.88;
      for (var rr = 0; rr < c.h; rr++) {
        var rw = Math.max(4, Math.round(c.w * (0.5 + 0.5 * Math.sin(Math.PI * (rr + 0.7) / (c.h + 0.4)))));
        ctx.fillStyle = css(rr === 0 ? cl[0] : cl[1]);
        ctx.fillRect(Math.round(cxp + (c.w - rw) / 2), c.y + rr, rw, 1);
      }
    }
    ctx.globalAlpha = 1;

    ctx.drawImage(this.B, 0, 0);

    // Wasserglitzern
    if (this.glints.length) {
      ctx.fillStyle = T.glint;
      var spread = T.glintSpread;
      for (i = 0; i < this.glints.length; i++) {
        var g = this.glints[i];
        if (Math.sin(t * g.sp + g.ph) < 0.35) continue;
        var gw = 1 + Math.floor((g.y - y0) / (H * 0.12));
        var gx = Math.round(this.riverC[g.y] + g.dx * this.riverW[g.y] * spread - gw / 2);
        ctx.fillRect(gx, g.y, gw, 1);
      }
    }

    // Fenster, Fahne
    ctx.fillStyle = T.window;
    for (i = 0; i < this.windows.length; i++) {
      var w = this.windows[i];
      var on = T.windowFlicker ? Math.sin(t * 1.3 + w.ph * 3) > -0.5 : Math.sin(t * 0.4 + w.ph * 7) > -0.92;
      if (on) ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    if (this.flag) {
      ctx.fillStyle = T.flag;
      for (i = 0; i < 6; i++) ctx.fillRect(this.flag.x + i, this.flag.y + Math.round(Math.sin(t * 4 + i * 0.9) * 0.9), 1, 3 - (i > 3 ? 1 : 0));
    }

    // Weihnachtslichter
    if (this.lights.length) {
      var lc = ["#ff4a4a", "#ffd24a", "#5dffa0", "#4ab8ff"];
      for (i = 0; i < this.lights.length; i++) {
        var L = this.lights[i], phase = (Math.floor(t * 1.6) + L.k) % 2;
        ctx.fillStyle = lc[L.k % 4]; ctx.globalAlpha = phase ? 1 : 0.35;
        ctx.fillRect(L.x, L.y, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // Nebel
    for (i = 0; i < this.fog.length; i++) {
      var f = this.fog[i], fx = ((f.x + t * f.v) % (W + f.w)) - f.w * 0.5;
      ctx.fillStyle = "rgba(190,150,255,0.10)";
      ctx.fillRect(Math.round(fx), f.y, Math.round(f.w), 2);
      ctx.fillStyle = "rgba(190,150,255,0.06)";
      ctx.fillRect(Math.round(fx) + 3, f.y + 2, Math.round(f.w) - 6, 2);
    }

    // Kürbisse
    for (i = 0; i < this.pumpkins.length; i++) this.sprite(PUMPKIN, this.pumpkins[i].x, this.pumpkins[i].y, function (ch) {
      return ch === "o" ? "#ff7a1a" : ch === "g" ? "#2f7a2a" : (Math.sin(t * 7 + i) > 0 ? "#ffe066" : "#ffb02e");
    });

    // Ostereier
    for (i = 0; i < this.eggs.length; i++) {
      var e = this.eggs[i];
      this.sprite(EGG, e.x, e.y, function (ch) { return ch === "a" ? e.c[0] : e.c[1]; }, 2);
    }

    // Partikel
    var pc = T.particles, dt = this.dt || 0;
    if (pc) {
      for (i = 0; i < this.parts.length; i++) {
        p = this.parts[i];
        if (dt) {
          p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.4 + p.ph) * p.sw * 3) * dt;
          if (p.y > H + 3 || p.y < -4 || p.x < -4 || p.x > W + 4) {
            var np = this.newPart(pc, false); np.x = Math.random() * (W + 20) - 10; this.parts[i] = p = np;
          }
        }
        var px = Math.round(p.x), py = Math.round(p.y);
        if (pc.kind === "rise") {
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + p.ph); ctx.fillStyle = p.c; ctx.fillRect(px, py, 1, 1);
        } else if (pc.shape === "leaf") {
          ctx.globalAlpha = 1; ctx.fillStyle = p.c; ctx.fillRect(px, py, 2, 1); ctx.fillRect(px + 1, py + 1, 2, 1);
        } else if (pc.shape === "petal") {
          ctx.globalAlpha = 1; ctx.fillStyle = p.c; ctx.fillRect(px, py, 2, 1); if (p.big) ctx.fillRect(px, py + 1, 1, 1);
        } else {
          ctx.globalAlpha = 1; ctx.fillStyle = p.c; ctx.fillRect(px, py, p.big ? 2 : 1, p.big ? 2 : 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Fledermäuse
    for (i = 0; i < this.bats.length; i++) {
      var b = this.bats[i];
      if (dt) { b.x += b.v * dt; if (b.x > W + 8) { b.x = -8; b.y = H * 0.08 + Math.random() * y0 * 0.55; } }
      var by = Math.round(b.y + Math.sin(t * 2 + b.wob) * 3), bf = Math.floor(t * 6 + b.ph) % 2;
      this.sprite(BAT[bf], Math.round(b.x), by, function () { return "#0a0414"; });
    }

    // Feuerwerk
    if (T.fireworks) this.drawFireworks(t, dt);
  };

  Scene.prototype.sprite = function (rows, x, y, colorFn, k) {
    k = k || 1;
    var ctx = this.ctx;
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i]; if (ch === ".") continue;
      ctx.fillStyle = colorFn(ch); ctx.fillRect(x + i * k, y + j * k, k, k);
    }
  };

  Scene.prototype.drawFireworks = function (t, dt) {
    var ctx = this.ctx, W = this.W, H = this.H, y0 = this.y0;
    var cols = ["#ffd24a", "#ff4aa8", "#4ad0ff", "#ffffff", "#7dff7d", "#ff7a3a"];
    if (dt) {
      this.fwNext -= dt;
      if (this.fwNext <= 0) {
        this.fwNext = 0.45 + Math.random() * 0.9;
        var side = Math.random() < 0.5 ? 0.06 + Math.random() * 0.24 : 0.7 + Math.random() * 0.24;
        this.fw.push({ x: W * side, y: y0, ty: H * (0.12 + Math.random() * 0.25), c: cols[Math.floor(Math.random() * cols.length)], sparks: null, life: 0 });
      }
    }
    for (var i = this.fw.length - 1; i >= 0; i--) {
      var f = this.fw[i];
      if (!f.sparks) {
        if (dt) f.y -= 55 * dt;
        ctx.fillStyle = "#ffe9a0"; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 3);
        if (f.y <= f.ty) {
          f.sparks = []; var n = 26;
          for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2, sp = 14 + (k % 2) * 8; f.sparks.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, x: f.x, y: f.y }); }
        }
      } else {
        if (dt) f.life += dt;
        if (f.life > 1.5) { this.fw.splice(i, 1); continue; }
        ctx.fillStyle = f.c; ctx.globalAlpha = Math.max(0, 1 - f.life / 1.5);
        for (k = 0; k < f.sparks.length; k++) {
          var s = f.sparks[k];
          if (dt) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 14 * dt; s.vx *= 0.985; }
          ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  /* ---------- Schleife (12 Bilder pro Sekunde, wie ein altes Spiel) ---------- */
  Scene.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now(), acc = 0, STEP = 1000 / 12;
    function loop(now) {
      if (!self.running) return;
      requestAnimationFrame(loop);
      acc += now - last; last = now;
      if (acc < STEP) return;
      var dt = Math.min(0.12, acc / 1000); acc = 0;
      if (!self.visible) return;
      self.t += dt; self.dt = dt;
      self.draw(self.t);
    }
    requestAnimationFrame(loop);
  };

  window.H8 = window.H8 || {};
  window.H8.createScene = function (host, opts) { return new Scene(host, opts); };
})();
