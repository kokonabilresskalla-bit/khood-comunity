(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 820;

  const hud = document.getElementById("hud");
  const nearEl = document.getElementById("near");
  const missionHud = document.getElementById("missionHud");
  const lvlEl = document.getElementById("lvl");
  const powersEl = document.getElementById("powers");
  const coinHud = document.getElementById("coinHud");
  const scoreHud = document.getElementById("scoreHud");
  const stickWrap = document.getElementById("stickWrap");
  const base = document.getElementById("stickBase");
  const knob = document.getElementById("stickKnob");
  const pauseBtn = document.getElementById("pauseBtn");
  const mutePlay = document.getElementById("mutePlay");
  const caughtEl = document.getElementById("caught");
  const loseVid = document.getElementById("loseVid");
  const flash = document.getElementById("flash");

  const screens = {
    menu: document.getElementById("menu"),
    map: document.getElementById("map"),
    chars: document.getElementById("chars"),
    shop: document.getElementById("shop"),
    settings: document.getElementById("settings"),
    result: document.getElementById("result"),
    brief: document.getElementById("brief"),
    hunter: document.getElementById("hunter"),
    howto: document.getElementById("howto"),
    online: document.getElementById("online"),
    achs: document.getElementById("achs"),
    chat: document.getElementById("chat")
  };

  const imgSisi = new Image();
  imgSisi.src = "./sisi.png";
  const appearLong = new Audio("./appear-long.mp3");
  const appearFront = new Audio("./appear-front.mp3");
  appearLong.preload = "auto";
  appearFront.preload = "auto";
  let lastSpawnFront = false;
  const charImgs = {};
  ["fady", "wageeh", "koko", "tony"].forEach(function (id) {
    const im = new Image();
    im.src = "./char-" + id + ".png";
    charImgs[id] = im;
  });

  const KEY = "khoood-save-v3";
  const CHARS = [
    { id: "dummy", name: "هارب مقطوع من شجرة", color: "#2ecc71", price: 0, perk: "none", speed: 1, hp: 100, def: 1 },
    { id: "fady", name: "فادي", color: "#2ecc71", price: 2500, perk: "hp", speed: 1, hp: 145, def: 1 },
    { id: "wageeh", name: "وجيه", color: "#f1c40f", price: 2500, perk: "speed", speed: 1.2, hp: 100, def: 1 },
    { id: "koko", name: "كوكو", color: "#3498db", price: 2500, perk: "coins", speed: 1, hp: 100, def: 1 },
    { id: "tony", name: "توني", color: "#9b59b6", price: 2500, perk: "armor", speed: 1, hp: 110, def: 0.55 },
    { id: "sisi", name: "السيسي", color: "#223445", price: 2500, perk: "boss", speed: 1.12, hp: 130, def: 0.8 }
  ];
  const SKINS = [
    { id: "none", name: "من غير إطار", ring: null, price: 0 },
    { id: "gold", name: "إطار دهبي أوي", ring: "#ffd24a", price: 2200 },
    { id: "neon", name: "إطار لمبة أفراح", ring: "#19f0ff", price: 2400 },
    { id: "fire", name: "إطار الفرن", ring: "#ff6a1a", price: 2600 }
  ];
  const ASSISTS = [
    { id: "fesya", name: "الفسية الخارقة", desc: "تطير 6 ثواني بسرعة زيادة", price: 500 },
    { id: "batata", name: "درع البطاطا", desc: "صدمة واحدة تتاكل", price: 700 },
    { id: "shafat", name: "شفاط الفلوس", desc: "يسحب القروش 8 ثواني", price: 650 },
    { id: "nasb", name: "ماكينة النصب", desc: "القروش تتضاعف 10 ثواني", price: 900 },
    { id: "maka", name: "فرامل السيسي", desc: "تطبّل اللي وراك 7 ثواني", price: 800 },
    { id: "aseer", name: "علبة عصير مجروحة", desc: "ترجعلك 40 دم", price: 500 },
    { id: "khod", name: "خووود مسبّقة", desc: "المطارد يتلخبط ثانيتين", price: 1500 },
    { id: "slip", name: "شبشب الجري", desc: "الحيطان تضربك أهدى في المرحلة دي", price: 750 },
    { id: "luck", name: "حظ أبو كلبشتين", desc: "يرمي قروش زيادة حواليك", price: 600 },
    { id: "3aks", name: "مخ الضد", desc: "ممكن يقلب التحكم عليك. دي المساعدة يا نجم", price: 1200 },
    { id: "ghost", name: "اختفاء بالراحة", desc: "شبح 10 ثواني. مفيش حاجة تأثر فيك", price: 5000 },
    { id: "3een", name: "عين صقر أبو نضارة", desc: "يبين المطارد لو بعيد", price: 550 }
  ];
  const JOKES = {
    start: ["هو ماشي وراك بالراحة؟ لأ. استنى.", "النجوم مش هتيجي لوحدها يا نجم.", "لو اختفى من الشاشة، اعرف إنه هيطلع من حتة تانية."],
    win: ["عدّيت. خووود في اللي جاي بقى.", "فلتّ وهو لسه بيدور.", "المرحلة اتفحت. متمطّش."],
    lose: ["خـــوود.", "مسكك على آخر نفس.", "الحيطة عطّلتك وهو استغلها."],
    coins: ["الجيب اتملى قروش.", "كده تقدر تشتري حد."]
  };

  function loadSave() {
    const s = {
      coins: 0, unlocked: 0, stars: Array(50).fill(0), scores: Array(50).fill(0),
      chars: ["dummy"], skins: ["none"], char: "dummy", skin: "none", hunter: "sisi",
      bag: {}, achs: {}, music: true, sfx: true, vibe: true, best: 0, dashes: 0, catches: 0
    };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw) Object.assign(s, raw);
      if (!s.stars || s.stars.length !== 50) s.stars = Array(50).fill(0);
      if (!s.scores || s.scores.length !== 50) s.scores = Array(50).fill(0);
      if (!s.bag) s.bag = {};
      if (!s.achs) s.achs = {};
      if (!s.hunter) s.hunter = "sisi";
      if (!s.chars) s.chars = ["dummy"];
      if (s.chars.indexOf("dummy") < 0) s.chars.unshift("dummy");
      if (!s.char || s.char === "green" || s.char === "fady" && s.chars.indexOf("fady") < 0) s.char = "dummy";
      const old = Number(localStorage.getItem("escape-level") || 0);
      if (old > s.unlocked) s.unlocked = Math.min(49, old);
    } catch (e) {}
    return s;
  }
  let save = loadSave();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
  }

  const BIOMES = [
    { id: "sand", title: "الصحراء", ground: "#c9a24d", obst: "#8aa6b6", wall: "#6b4a2b", crate: "#b85c38", fx: "#ffe08a", tint: "rgba(255,200,80,.08)" },
    { id: "sea", title: "البحر", ground: "#156a86", obst: "#0e4d63", wall: "#2aa3c7", crate: "#7ad0e6", fx: "#b8f3ff", tint: "rgba(40,160,220,.16)" },
    { id: "lava", title: "الحمم", ground: "#3a1208", obst: "#6a1a0c", wall: "#c43b12", crate: "#ff6a1a", fx: "#ffb347", tint: "rgba(255,70,0,.18)" },
    { id: "ice", title: "الثلج", ground: "#cfe8f5", obst: "#8fb8d2", wall: "#e8f6ff", crate: "#9ad0ea", fx: "#ffffff", tint: "rgba(200,230,255,.16)" },
    { id: "night", title: "الليل", ground: "#14182a", obst: "#2a3358", wall: "#3d4a7a", crate: "#6d5bff", fx: "#c9b6ff", tint: "rgba(40,20,90,.22)" },
    { id: "forest", title: "الغابة", ground: "#2d5a2a", obst: "#1e3d1c", wall: "#4a7a32", crate: "#7cb342", fx: "#c6ff7a", tint: "rgba(30,90,20,.14)" },
    { id: "storm", title: "العاصفة", ground: "#3a4450", obst: "#5b6773", wall: "#8899aa", crate: "#d7e3ee", fx: "#eef6ff", tint: "rgba(80,100,120,.18)" },
    { id: "neon", title: "النيون", ground: "#120018", obst: "#2b0048", wall: "#ff2bd6", crate: "#19f0ff", fx: "#f6ff5a", tint: "rgba(255,0,180,.12)" }
  ];
  const TYPES = ["survive", "stars", "gate", "clean", "gates", "stars", "far", "survive"];
  const LEVELS = [];
  for (let i = 0; i < 50; i++) {
    const biome = BIOMES[i % BIOMES.length];
    const type = TYPES[i % TYPES.length];
    const hard = i / 49;
    let need = 1;
    if (type === "survive") need = 10 + Math.floor(i * 0.45);
    if (type === "stars") need = 4 + Math.floor(i / 8);
    if (type === "clean") need = 7 + Math.floor(i / 10);
    if (type === "gates") need = 3 + Math.floor(i / 18);
    LEVELS.push({
      name: "مستوى " + (i + 1) + " — " + biome.title,
      text: ({
        survive: "افلت " + need + " ثانية في " + biome.title + " ومتتخليش يمسكك.",
        stars: "لمّ " + need + " نجوم وأنت بتجري في " + biome.title + ".",
        gate: "الحق الباب الدهبي في " + biome.title + ".",
        clean: "افلت " + need + " ثواني من غير ما تخبط في حيط في " + biome.title + ".",
        gates: "عدّي " + need + " أبواب ورا بعض في " + biome.title + ".",
        far: "الباب بعيد أوي في " + biome.title + ". الحقّه."
      })[type],
      type: type, need: need,
      enemy: 225 + Math.floor(hard * 115),
      blink: 2.4 - hard * 1.5,
      biome: biome, n: i
    });
  }

  let actx = null;
  function beep(freq, time, type, vol) {
    if (!save.sfx || !actx) return;
    try {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.value = vol || 0.05;
      o.connect(g); g.connect(actx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + (time || 0.12));
      o.stop(actx.currentTime + (time || 0.12));
    } catch (e) {}
  }
  function unlockAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      appearLong.load(); appearFront.load(); loseVid.load();
    } catch (e) {}
  }
  document.body.addEventListener("pointerdown", unlockAudio, { once: true });

  let W = 800, H = 600, shake = 0, flashT = 0;
  let running = false, over = false, won = false, startAt = 0, hudTick = 0;
  let level = Math.min(save.unlocked, 49);
  let collected = 0, cleanTime = 0, bumps = 0, runCoins = 0, runScore = 0;
  const stars = [], gates = [], coins = [], movers = [], pops = [], puddles = [], bits = [];
  let target = null;
  let enemyWasVisible = false, appearCool = 0, offScreenTime = 0;
  const powers = { shield: 0, speed: 0, magnet: 0, double: 0, slow: 0 };
  const pickups = [];
  const player = { x: 0, y: 0, hp: 100, maxHp: 100 };
  const net = { playing: false, host: false, peer: null, conns: [], peeps: {}, myId: "", room: "", wantHunt: false, lastSend: 0, role: "run", mic: false, stream: null, calls: {}, sounds: {} };
  let invertT = 0, ghostT = 0, armorT = 0, stunT = 0, trickT = 0, fakeWin = 0, dashT = 0, dashCd = 0, combo = 0, comboT = 0, nearSaid = 0;
  const fakes = [];
  const enemy = { x: -520, y: -360 };
  const cam = { x: 0, y: 0 };
  const stick = { active: false, x: 0, y: 0 };
  const keys = { x: 0, y: 0 };
  const PLAYER_SPEED = 360, PR = 26, ER = 28, TILE = 200;

  function cur() { return LEVELS[level] || LEVELS[0]; }
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle("on", k === name); });
    const play = name === null;
    hud.classList.toggle("on", play);
    stickWrap.classList.toggle("on", play);
    pauseBtn.classList.toggle("on", play);
    mutePlay.classList.toggle("on", play);
  }
  function joke(kind) {
    const a = JOKES[kind] || JOKES.start;
    return a[Math.floor(Math.random() * a.length)];
  }

  function resize() {
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth || 360;
    H = window.innerHeight || 640;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () { setTimeout(resize, 80); });
  resize();

  function hash(ix, iy) {
    let n = ix * 374761393 + iy * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
  function tileKind(ix, iy) {
    const h = hash(ix, iy);
    if (h < 0.10) return 1;
    if (h < 0.16) return 2;
    if (h < 0.20) return 3;
    return 0;
  }
  function boxHits(x, y, rad, bx, by, bw, bh) {
    const nx = Math.max(bx, Math.min(x, bx + bw));
    const ny = Math.max(by, Math.min(y, by + bh));
    const dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy < rad * rad;
  }
  function insideObstacle(x, y, rad) {
    const x0 = Math.floor((x - rad) / TILE), y0 = Math.floor((y - rad) / TILE);
    const x1 = Math.floor((x + rad) / TILE), y1 = Math.floor((y + rad) / TILE);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const k = tileKind(ix, iy);
        const ox = ix * TILE, oy = iy * TILE;
        if (k === 1 && boxHits(x, y, rad, ox + 28, oy + 30, 70, 92)) return true;
        if (k === 2 && boxHits(x, y, rad, ox + 18, oy + 55, 124, 28)) return true;
        if (k === 3 && boxHits(x, y, rad, ox + 48, oy + 48, 44, 44)) return true;
      }
    }
    return false;
  }
  function findClear(x, y) {
    if (!insideObstacle(x, y, PR + 6)) return { x: x, y: y };
    for (let r = 40; r <= 900; r += 36) {
      for (let a = 0; a < 16; a++) {
        const nx = x + Math.cos(a * 0.3927) * r;
        const ny = y + Math.sin(a * 0.3927) * r;
        if (!insideObstacle(nx, ny, PR + 8)) return { x: nx, y: ny };
      }
    }
    return { x: x + 400, y: y + 400 };
  }

  function placeAway(minD, maxD, angle) {
    const base = (angle == null ? Math.random() * Math.PI * 2 : angle);
    for (let i = 0; i < 22; i++) {
      const a = base + (Math.random() - 0.5) * 0.8 + (i * 0.7);
      const d = minD + Math.random() * Math.max(40, maxD - minD);
      const x = player.x + Math.cos(a) * d;
      const y = player.y + Math.sin(a) * d;
      if (!insideObstacle(x, y, 18)) return { x: x, y: y, r: 16 };
    }
    return { x: player.x + minD, y: player.y, r: 16 };
  }
  function scatter(n, minD, maxD) {
    const out = [];
    const rot = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) out.push(placeAway(minD, maxD, rot + (i * Math.PI * 2) / n));
    return out;
  }
  function tooFar(p, lim) {
    return Math.hypot(p.x - player.x, p.y - player.y) > lim;
  }
  function refillAround(list, want, minD, maxD) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (tooFar(list[i], 980)) list.splice(i, 1);
    }
    while (list.length < want) list.push(placeAway(minD, maxD));
  }
  function missionText() {
    const L = cur();
    const t = ((performance.now() - startAt) / 1000);
    if (L.type === "survive") return L.name + ": " + t.toFixed(0) + "/" + L.need + "ث";
    if (L.type === "stars") return L.name + ": نجوم " + collected + "/" + L.need;
    if (L.type === "clean") return L.name + ": من غير خبطة " + cleanTime.toFixed(0) + "/" + L.need + "ث";
    if (L.type === "gates") return L.name + ": أبواب " + collected + "/" + L.need;
    return L.name + ": الحق الباب";
  }

  function setupMission() {
    collected = 0; cleanTime = 0; bumps = 0; runCoins = 0; runScore = 0;
    stars.length = 0; gates.length = 0; coins.length = 0; movers.length = 0;
    pops.length = 0; puddles.length = 0; bits.length = 0; pickups.length = 0;
    target = null;
    const L = cur();
    if (L.type === "stars") Array.prototype.push.apply(stars, scatter(Math.max(L.need, 5), 280, 820));
    if (L.type === "gate") target = placeAway(720, 1100, Math.random() * Math.PI * 2);
    if (L.type === "far") target = placeAway(1400, 1900, Math.random() * Math.PI * 2);
    if (L.type === "gates") Array.prototype.push.apply(gates, scatter(L.need, 420, 980));
    Array.prototype.push.apply(coins, scatter(8 + Math.floor(level / 5), 220, 860));
    if (level >= 10) {
      const n = 2 + Math.floor(level / 12);
      for (let i = 0; i < n; i++) {
        const p = placeAway(300, 900);
        movers.push({ x: p.x, y: p.y, ox: p.x, oy: p.y, a: Math.random() * 6, s: 40 + level, kind: L.biome.id });
      }
    }
    if (level >= 20) {
      pickups.push(Object.assign(placeAway(280, 700), { k: ["shield", "speed", "magnet", "double", "slow"][level % 5] }));
    }
    if (level >= 21) {
      for (let i = 0; i < 2 + Math.floor((level - 21) / 10); i++) {
        const p = placeAway(400, 1000);
        puddles.push({ x: p.x, y: p.y, r: 34 + (level % 10), t: Math.random() * 4 });
      }
    }
    lvlEl.textContent = String(level + 1);
    missionHud.textContent = L.text;
  }

  function setPlayUI(on) {
    hud.classList.toggle("on", on);
    stickWrap.classList.toggle("on", on);
    pauseBtn.classList.toggle("on", on);
    mutePlay.classList.toggle("on", on);
    const micPlay = document.getElementById("micPlay");
    if (micPlay) micPlay.classList.toggle("on", on && net.playing);
    const dashBtn = document.getElementById("dashBtn");
    const emoBtn = document.getElementById("emoBtn");
    if (dashBtn) dashBtn.classList.toggle("on", on);
    if (emoBtn) emoBtn.classList.toggle("on", on && net.playing);
  }
  function hideAll() { Object.keys(screens).forEach(function (k) { screens[k].classList.remove("on"); }); }

  function me() { return CHARS.find(function (c) { return c.id === save.char; }) || CHARS[0]; }
  function hunterChar() { return CHARS.find(function (c) { return c.id === save.hunter; }) || null; }
  function openBrief(n) {
    level = n;
    powers.shield = powers.speed = powers.magnet = powers.double = powers.slow = 0;
    invertT = ghostT = stunT = armorT = 0;
    const L = cur();
    document.getElementById("briefTitle").textContent = L.name;
    document.getElementById("briefText").textContent = L.text;
    const lies = [
      "المهمة مكتوبة. الباقي لأ.",
      "لو حسّيت إنك كسبت بدري، متصدقش.",
      "في قروش بتقرص. شكلها زي الفلوس بالظبط.",
      "الحيطان بتأكل دم. اللي يمسكك بيخلّصك على طول."
    ];
    document.getElementById("briefWarn").textContent = lies[n % lies.length];
    const box = document.getElementById("briefHelp");
    box.innerHTML = "";
    ASSISTS.forEach(function (a) {
      const nHave = save.bag[a.id] || 0;
      if (!nHave) return;
      const row = document.createElement("div");
      row.className = "help-item";
      row.innerHTML = "<span>" + a.name + " ×" + nHave + "</span>";
      const b = document.createElement("button");
      b.className = "btn"; b.textContent = "استخدم";
      b.onclick = function () { useAssist(a.id); openBrief(level); };
      row.appendChild(b); box.appendChild(row);
    });
    show("brief");
  }
  function useAssist(id) {
    if (!save.bag[id]) return;
    save.bag[id] -= 1; persist();
    if (id === "fesya") powers.speed = 6;
    if (id === "batata") powers.shield = 1;
    if (id === "shafat") powers.magnet = 8;
    if (id === "nasb") powers.double = 10;
    if (id === "maka") powers.slow = 7;
    if (id === "aseer") player.hp = Math.min(player.maxHp, (player.hp || 0) + 40);
    if (id === "khod") stunT = 2;
    if (id === "slip") armorT = 90;
    if (id === "luck") { for (let i = 0; i < 6; i++) coins.push(placeAway(80, 180)); }
    if (id === "3aks") invertT = 8;
    if (id === "ghost") ghostT = 10;
    if (id === "3een") powers.magnet = Math.max(powers.magnet, 0);
    beep(700, 0.12, "triangle", 0.05);
  }

  function startLevel(n) {
    unlockAudio();
    level = n;
    running = true; over = false; won = false;
    startAt = performance.now();
    const spawn = findClear(80, 80);
    player.x = spawn.x; player.y = spawn.y;
    enemy.x = player.x - 620; enemy.y = player.y - 420;
    cam.x = player.x - W / 2; cam.y = player.y - H / 2;
    stick.x = 0; stick.y = 0; stick.active = false;
    setKnob(0, 0);
    nearEl.textContent = "";
    enemyWasVisible = false; appearCool = 0; offScreenTime = 0; lastSpawnFront = false;
    const hero = me();
    player.maxHp = hero.hp; player.hp = hero.hp;
    invertT = ghostT = stunT = trickT = fakeWin = 0;
    if (armorT < 1) armorT = 0;
    fakes.length = 0;
    setupMission();
    if (level >= 3) {
      for (let i = 0; i < 2 + Math.floor(level / 12); i++) {
        const f = placeAway(200, 700); f.fake = true; fakes.push(f);
      }
    }
    hideAll(); setPlayUI(true);
    try { loseVid.pause(); loseVid.currentTime = 0; } catch (e) {}
    beep(520, 0.1, "triangle", 0.04);
  }

  function addCoins(n) {
    const hero = me();
    comboT = 1.4; combo += 1;
    let v = n * (powers.double > 0 ? 2 : 1) * (combo >= 5 ? 3 : combo >= 3 ? 2 : 1);
    if (hero.perk === "coins") v = Math.ceil(v * 1.5);
    runCoins += v; save.coins += v; persist();
    beep(880 + Math.min(400, combo * 40), 0.08, "square", 0.05);
    if (combo === 3) nearEl.textContent = "كومبو x2. الزم كده.";
    if (combo === 5) { nearEl.textContent = "كومبو أسطوري x3"; unlockAch("combo", "مكنسة القروش"); }
    if (save.coins >= 500) unlockAch("rich", "جيبة بتخر");
  }
  function unlockAch(id, name) {
    if (!save.achs) save.achs = {};
    if (save.achs[id]) return;
    save.achs[id] = name;
    persist();
    nearEl.textContent = "إنجاز: " + name;
  }
  function rankName() {
    const n = (save.stars || []).reduce(function (a, b) { return a + (b || 0); }, 0);
    if (n >= 90) return "أسطورة الهروب";
    if (n >= 60) return "فلتان محترف";
    if (n >= 30) return "بيجري وعلى الله";
    if (n >= 10) return "لسه بيتلخبط";
    return "لسه بتسخن";
  }
  function doDash() {
    if (!running || dashCd > 0 || dashT > 0) return;
    dashT = 0.22; dashCd = 1.35;
    save.dashes = (save.dashes || 0) + 1;
    if (save.dashes >= 20) unlockAch("dash", "صاحب الفسية");
    beep(420, 0.08, "triangle", 0.04);
  }

  function starsFor() {
    const L = cur();
    const t = (performance.now() - startAt) / 1000;
    let st = 1;
    if (runCoins >= 4) st = 2;
    if (bumps <= 2 && runCoins >= 6) st = 3;
    if (L.type === "survive" && t <= L.need + 1 && bumps === 0) st = 3;
    return st;
  }

  function win() {
    if (over || won) return;
    won = true; running = false; stopStick();
    const st = starsFor();
    const bonus = 15 + runCoins * 2 + st * 10;
    runScore = Math.floor(100 + runCoins * 12 + st * 40 - bumps * 5);
    if (runScore < 10) runScore = 10;
    save.coins += bonus;
    if (runScore > (save.scores[level] || 0)) save.scores[level] = runScore;
    if (st > (save.stars[level] || 0)) save.stars[level] = st;
    if (level + 1 > save.unlocked) save.unlocked = Math.min(49, level + 1);
    if (level >= 9) unlockAch("ten", "عدّيت العشرة");
    if (level >= 49) unlockAch("all", "قفلت اللعبة يا وحش");
    save.best = Math.max(save.best || 0, runScore);
    persist();
    beep(660, 0.18, "triangle", 0.06);
    document.getElementById("resTitle").textContent = "فلتّ! خووود في اللي جاي";
    document.getElementById("joke").textContent = joke("win");
    document.getElementById("resText").textContent = "نقاط: " + runScore + " | أحسن: " + save.scores[level] + " | قروش الجولة: " + runCoins + " +" + bonus;
    document.getElementById("resStars").textContent = "★".repeat(st) + "☆".repeat(3 - st);
    document.getElementById("resNext").style.display = level < 49 ? "inline-block" : "none";
    setPlayUI(false);
    show("result");
  }

  function lose(why) {
    if (over || won) return;
    if (ghostT > 0) return;
    if (why === "sisi" && powers.shield > 0) {
      powers.shield = 0; shake = 10; beep(200, 0.12, "sawtooth", 0.05); return;
    }
    over = true; running = false; stopStick();
    shake = 16;
    persist();
    if (save.vibe) { try { navigator.vibrate && navigator.vibrate([80, 40, 160]); } catch (e) {} }
    function afterVid() {
      caughtEl.style.display = "none";
      document.getElementById("resTitle").textContent = why === "hp" ? "الحيطة خلّصتك" : "خـــوود";
      document.getElementById("joke").textContent = why === "hp" ? "فلتّ من اللي وراك واتمرغت في الحيطة." : joke("lose");
      document.getElementById("resText").textContent = (why === "hp" ? "دمك خلص. " : "مسكك وقال خووود. ") + "القروش اتحسبت: " + runCoins;
      document.getElementById("resStars").textContent = "";
      document.getElementById("resNext").style.display = "none";
      setPlayUI(false);
      show("result");
    }
    if (why === "hp") { afterVid(); return; }
    caughtEl.style.display = "flex";
    try {
      loseVid.muted = !save.sfx;
      loseVid.onended = afterVid;
      loseVid.currentTime = 0;
      const p = loseVid.play();
      if (p && p.catch) p.catch(afterVid);
    } catch (e) { afterVid(); }
    setTimeout(function () {
      if (over && screens.result.classList.contains("on") === false) afterVid();
    }, 13000);
  }

  function setKnob(nx, ny) {
    knob.style.left = (45 + nx * 45) + "px";
    knob.style.top = (45 + ny * 45) + "px";
  }
  function stopStick() { stick.active = false; stick.x = 0; stick.y = 0; setKnob(0, 0); }
  function readStick(e) {
    const r = base.getBoundingClientRect();
    const t = (e.touches && e.touches[0]) || e;
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const max = r.width * 0.42;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    stick.x = dx / max; stick.y = dy / max;
    setKnob(stick.x, stick.y);
  }
  base.addEventListener("pointerdown", function (e) { e.preventDefault(); stick.active = true; readStick(e); base.setPointerCapture(e.pointerId); });
  base.addEventListener("pointermove", function (e) { if (stick.active) readStick(e); });
  base.addEventListener("pointerup", stopStick);
  base.addEventListener("pointercancel", stopStick);
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a") keys.x = -1;
    if (e.key === "ArrowRight" || e.key === "d") keys.x = 1;
    if (e.key === "ArrowUp" || e.key === "w") keys.y = -1;
    if (e.key === "ArrowDown" || e.key === "s") keys.y = 1;
    if (e.key === " " || e.key === "Shift") { e.preventDefault(); doDash(); }
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "ArrowRight" || e.key === "d") keys.x = 0;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "ArrowDown" || e.key === "s") keys.y = 0;
  });

  function update(dt) {
    const L = cur();
    let ix = stick.x + keys.x, iy = stick.y + keys.y;
    if (invertT > 0) { ix = -ix; iy = -iy; invertT -= dt; }
    if (ghostT > 0) ghostT -= dt;
    if (stunT > 0) stunT -= dt;
    if (armorT > 0) armorT -= dt;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    const hero = me();
    let sped = PLAYER_SPEED * (hero.speed || 1);
    if (powers.speed > 0) sped *= 1.35;
    if (dashT > 0) { sped *= 2.15; dashT -= dt; }
    if (dashCd > 0) dashCd -= dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    let slip = L.biome.id === "ice" ? 1.08 : 1;
    const slowed = ghostT <= 0 && insideObstacle(player.x, player.y, PR);
    if (slowed) {
      sped = 120; bumps += dt;
      const dmg = 22 * dt * (hero.def || 1) * (armorT > 0 ? 0.45 : 1);
      player.hp -= dmg;
      shake = Math.max(shake, 5);
    }
    if (L.biome.id === "sea") { player.x += Math.sin(performance.now() / 400) * 18 * dt; }
    player.x += ix * sped * slip * dt;
    player.y += iy * sped * dt;

    for (let i = puddles.length - 1; i >= 0; i--) {
      const u = puddles[i];
      u.t += dt;
      u.x += Math.sin(u.t) * 30 * dt;
      if (ghostT <= 0 && Math.hypot(player.x - u.x, player.y - u.y) < u.r + PR - 8) {
        player.x += ix * -80 * dt; player.y += iy * -80 * dt; sped = 90;
        player.hp -= 18 * dt * (hero.def || 1);
      }
    }
    for (let i = 0; i < movers.length; i++) {
      const m = movers[i];
      m.a += dt;
      if (m.kind === "forest" || m.kind === "night") { m.x = m.ox + Math.sin(m.a) * 70; m.y = m.oy + Math.cos(m.a * 0.8) * 40; }
      else if (m.kind === "lava") { m.x = m.ox + Math.sin(m.a * 1.4) * 90; }
      else { m.x = m.ox + Math.cos(m.a) * 80; m.y = m.oy + Math.sin(m.a) * 80; }
      if (ghostT <= 0 && Math.hypot(player.x - m.x, player.y - m.y) < 34) {
        sped = 100; player.x += (player.x - m.x) * dt * 2; bumps += dt;
        player.hp -= 16 * dt * (hero.def || 1);
      }
    }

    if (powers.magnet > 0) {
      for (let i = 0; i < coins.length; i++) {
        const dx = player.x - coins[i].x, dy = player.y - coins[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 220) { coins[i].x += dx / d * 220 * dt; coins[i].y += dy / d * 220 * dt; }
      }
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      if (Math.hypot(player.x - coins[i].x, player.y - coins[i].y) < 32) {
        coins.splice(i, 1); addCoins(1); runScore += 10;
        if (runCoins === 8) nearEl.textContent = joke("coins");
      }
    }
    for (let i = fakes.length - 1; i >= 0; i--) {
      if (Math.hypot(player.x - fakes[i].x, player.y - fakes[i].y) < 32) {
        fakes.splice(i, 1);
        if (ghostT <= 0) { player.hp -= 18; shake = 10; beep(140, 0.1, "sawtooth", 0.05); nearEl.textContent = "القرش ده قرصك!"; }
      }
    }
    refillAround(coins, 7, 260, 720);
    if (L.type === "stars" && collected < L.need) refillAround(stars, Math.min(5, L.need - collected + 2), 300, 780);
    if (target && tooFar(target, 1600) && (L.type === "gate")) target = placeAway(500, 900);
    if (L.type === "far" && target && tooFar(target, 2200)) target = placeAway(900, 1400);
    if (L.type === "gates") {
      for (let i = collected; i < gates.length; i++) {
        if (tooFar(gates[i], 1400)) gates[i] = placeAway(420, 860, (i * Math.PI * 2) / Math.max(1, gates.length));
      }
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      if (Math.hypot(player.x - pickups[i].x, player.y - pickups[i].y) < 30) {
        powers[pickups[i].k] = 5;
        pickups.splice(i, 1);
        flashT = 0.18; beep(740, 0.16, "triangle", 0.06);
      }
    }
    for (const k in powers) if (powers[k] > 0) powers[k] -= dt;

    const lived = (performance.now() - startAt) / 1000;
    hudTick += dt;
    if (hudTick > 0.12) {
      hudTick = 0;
      missionHud.textContent = missionText();
      coinHud.textContent = String(save.coins);
      scoreHud.textContent = String(Math.floor(runScore + lived));
      const ps = [];
      if (powers.shield > 0) ps.push("درع");
      if (powers.speed > 0) ps.push("سرعة");
      if (powers.magnet > 0) ps.push("مغناطيس");
      if (powers.double > 0) ps.push("قروش مضاعفة");
      if (powers.slow > 0) ps.push("بطء");
      if (ghostT > 0) ps.push("شبح");
      if (invertT > 0) ps.push("مخ الضد");
      powersEl.textContent = ps.join(" · ");
      const hpEl = document.getElementById("hpBar");
      if (hpEl) hpEl.style.width = Math.max(0, Math.min(100, 100 * player.hp / player.maxHp)) + "%";
    }
    if (player.hp <= 0) return lose("hp");

    trickT += dt;
    if (level >= 8 && trickT > 9) {
      trickT = 0;
      if (Math.random() < 0.45) invertT = Math.max(invertT, 2.2);
      else if (target) { const j = placeAway(200, 500); target.x = j.x; target.y = j.y; nearEl.textContent = "الباب اتحرك يا صاحبي."; }
    }
    if (level >= 18 && fakeWin <= 0 && collected === 1 && Math.random() < 0.004) {
      fakeWin = 1.1; flashT = 0.4; nearEl.textContent = "كسبت؟ لأ يا عم.";
    }
    if (fakeWin > 0) fakeWin -= dt;
    if (L.type === "survive" && lived >= L.need) return win();
    if (L.type === "clean") {
      if (!slowed) cleanTime += dt; else cleanTime = 0;
      if (cleanTime >= L.need) return win();
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      if (Math.hypot(player.x - stars[i].x, player.y - stars[i].y) < 36) { stars.splice(i, 1); collected += 1; beep(980, 0.07, "square", 0.04); }
    }
    if (L.type === "stars" && collected >= L.need) return win();
    if (target && Math.hypot(player.x - target.x, player.y - target.y) < 40) return win();
    if (L.type === "gates" && gates[collected] && Math.hypot(player.x - gates[collected].x, player.y - gates[collected].y) < 40) {
      collected += 1;
      if (collected >= L.need) return win();
    }

    if (net.playing) {
      netTick(dt);
      if (shake > 0) shake *= 0.86;
      cam.x += (player.x - W / 2 - cam.x) * Math.min(1, dt * 9);
      cam.y += (player.y - H / 2 - cam.y) * Math.min(1, dt * 9);
      return;
    }

    const ex = player.x - enemy.x, ey = player.y - enemy.y;
    const ed = Math.hypot(ex, ey) || 1;
    const hun = hunterChar();
    let esp = L.enemy * (powers.slow > 0 ? 0.55 : 1) * (hun && hun.speed ? hun.speed : 1);
    if (stunT > 0) esp *= 0.15;
    if (level >= 28 && Math.sin(performance.now() / 180) > 0.92) esp *= 1.45;
    enemy.x += (ex / ed) * esp * dt;
    enemy.y += (ey / ed) * esp * dt;

    const exs = enemy.x - cam.x, eys = enemy.y - cam.y;
    const vis = exs > -40 && eys > -40 && exs < W + 40 && eys < H + 40;
    if (vis) offScreenTime = 0;
    else {
      offScreenTime += dt;
      if (offScreenTime >= (L.blink || 2)) {
        const side = Math.floor(Math.random() * 4), m = 80;
        if (side === 0) { enemy.x = cam.x - m; enemy.y = cam.y + 50 + Math.random() * Math.max(80, H - 100); }
        else if (side === 1) { enemy.x = cam.x + W + m; enemy.y = cam.y + 50 + Math.random() * Math.max(80, H - 100); }
        else if (side === 2) { enemy.x = cam.x + 50 + Math.random() * Math.max(80, W - 100); enemy.y = cam.y - m; }
        else { enemy.x = cam.x + 50 + Math.random() * Math.max(80, W - 100); enemy.y = cam.y + H + m; }
        let front = 3;
        const mx = stick.x + keys.x, my = stick.y + keys.y;
        if (Math.abs(mx) > Math.abs(my) && Math.abs(mx) > 0.15) front = mx > 0 ? 1 : 0;
        else if (Math.abs(my) > 0.15) front = my > 0 ? 3 : 2;
        lastSpawnFront = side === front;
        offScreenTime = 0; enemyWasVisible = false;
      }
    }
    appearCool -= dt;
    if (vis && !enemyWasVisible && appearCool <= 0) {
      if (save.sfx) {
        try {
          const a = lastSpawnFront ? appearFront : appearLong;
          a.currentTime = 0; a.volume = 1; a.play();
        } catch (e) {}
      }
      appearCool = 2.8;
    }
    enemyWasVisible = vis;
    nearEl.textContent = ed < 220 ? "قرّب منك!" : (slowed ? "خابط في الحيطة" : "");
    if (ed < 90 && ed >= PR + ER - 6) {
      nearSaid += dt;
      if (nearSaid > 0.8) { nearEl.textContent = "على شعره!"; nearSaid = 0; }
    }
    if (ed < PR + ER - 6) { save.catches = (save.catches || 0) + 1; if (save.catches >= 10) unlockAch("caught", "زبون الخووود"); lose("sisi"); }
    if (shake > 0) shake *= 0.86;
    if (flashT > 0) flashT -= dt;

    const b = L.biome;
    if (Math.random() < 0.22) bits.push({ x: cam.x + Math.random() * W, y: cam.y + (b.id === "lava" ? H : -8), v: b.id === "lava" ? -90 : 60, vx: (Math.random() - 0.5) * 40, life: 1, c: b.fx });
    for (let i = bits.length - 1; i >= 0; i--) {
      bits[i].life -= dt; bits[i].y += bits[i].v * dt; bits[i].x += bits[i].vx * dt;
      if (bits[i].life <= 0) bits.splice(i, 1);
    }
    if (bits.length > 36) bits.splice(0, bits.length - 36);
    cam.x += (player.x - W / 2 - cam.x) * Math.min(1, dt * 9);
    cam.y += (player.y - H / 2 - cam.y) * Math.min(1, dt * 9);
  }

  function drawWorld() {
    const b = cur().biome;
    ctx.fillStyle = b.ground; ctx.fillRect(0, 0, W, H);
    const x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
    const x1 = Math.ceil((cam.x + W) / TILE), y1 = Math.ceil((cam.y + H) / TILE);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const k = tileKind(ix, iy); if (!k) continue;
        const ox = ix * TILE - cam.x, oy = iy * TILE - cam.y;
        ctx.fillStyle = k === 1 ? b.obst : k === 2 ? b.wall : b.crate;
        if (k === 1) ctx.fillRect(ox + 28, oy + 30, 70, 92);
        else if (k === 2) ctx.fillRect(ox + 18, oy + 55, 124, 28);
        else ctx.fillRect(ox + 48, oy + 48, 44, 44);
      }
    }
    ctx.fillStyle = b.tint; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < bits.length; i++) {
      ctx.globalAlpha = Math.max(0, bits[i].life);
      ctx.fillStyle = bits[i].c;
      ctx.fillRect(bits[i].x - cam.x, bits[i].y - cam.y, 3, 7);
    }
    ctx.globalAlpha = 1;
  }
  function mark(p, color, label, r) {
    const x = p.x - cam.x, y = p.y - cam.y;
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r || 14, 0, Math.PI * 2); ctx.fill();
    if (label) { ctx.fillStyle = "#fff"; ctx.font = "bold 12px Tahoma"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 24); }
  }
  function draw() {
    ctx.save();
    if (shake > 0.4) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawWorld();
    for (let i = 0; i < puddles.length; i++) mark(puddles[i], "rgba(255,80,20,.55)", "", puddles[i].r);
    for (let i = 0; i < movers.length; i++) mark(movers[i], "#ff4d4d", "عقبة", 16);
    for (let i = 0; i < coins.length; i++) mark(coins[i], "#ffd24a", "", 10);
    for (let i = 0; i < fakes.length; i++) mark(fakes[i], "#e67e22", "", 10);
    for (let i = 0; i < stars.length; i++) mark(stars[i], "#ffe566", "نجمة", 15);
    if (target) mark(target, "#e8c56b", "بوابة", 18);
    if (cur().type === "gates") {
      for (let i = 0; i < gates.length; i++) if (i >= collected) mark(gates[i], i === collected ? "#6ee7b7" : "#7a8b96", String(i + 1), 16);
    }
    for (let i = 0; i < pickups.length; i++) mark(pickups[i], "#9b59b6", "قوة", 15);
    const ex = enemy.x - cam.x, ey = enemy.y - cam.y;
    if (ex > -50 && ey > -50 && ex < W + 50 && ey < H + 50) {
      const hun = hunterChar();
      const him = hun && charImgs[hun.id];
      if (him && him.complete && him.naturalWidth) ctx.drawImage(him, ex - 32, ey - 36, 64, 64);
      else if (imgSisi.complete && imgSisi.naturalWidth) ctx.drawImage(imgSisi, ex - 32, ey - 36, 64, 64);
      else { ctx.fillStyle = "#223445"; ctx.beginPath(); ctx.arc(ex, ey, 28, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px Tahoma"; ctx.textAlign = "center";
      ctx.fillText(hun ? hun.name : "السيسي", ex, ey + 46);
    }
    const ch = CHARS.find(function (c) { return c.id === save.char; }) || CHARS[0];
    const sk = SKINS.find(function (s) { return s.id === save.skin; }) || SKINS[0];
    const px = player.x - cam.x, py = player.y - cam.y;
    if (ghostT > 0) { ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 34, 0, Math.PI * 2); ctx.stroke(); }
    if (powers.shield > 0) { ctx.strokeStyle = "#9ff3c0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 32, 0, Math.PI * 2); ctx.stroke(); }
    if (sk.ring) { ctx.strokeStyle = sk.ring; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px, py, 29, 0, Math.PI * 2); ctx.stroke(); }
    const cim = ch.id === "sisi" ? imgSisi : charImgs[ch.id];
    if (cim && cim.complete && cim.naturalWidth) ctx.drawImage(cim, px - 32, py - 34, 64, 64);
    else { ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px Tahoma"; ctx.textAlign = "center"; ctx.fillText(ch.name, px, py + 46);
    if (net.playing) {
      Object.keys(net.peeps).forEach(function (id) {
        if (id === net.myId) return;
        const o = net.peeps[id];
        if (!o || o.dead) return;
        const ox = o.x - cam.x, oy = o.y - cam.y;
        if (ox < -50 || oy < -50 || ox > W + 50 || oy > H + 50) return;
        if (o.role === "hunt" && imgSisi.complete && imgSisi.naturalWidth) ctx.drawImage(imgSisi, ox - 32, oy - 36, 64, 64);
        else { ctx.fillStyle = o.role === "hunt" ? "#c0392b" : "#3498db"; ctx.beginPath(); ctx.arc(ox, oy, 24, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px Tahoma"; ctx.textAlign = "center";
        ctx.fillText(o.name || id.slice(-4), ox, oy + 42);
      });
    }
    ctx.restore();
    if (flashT > 0) {
      flash.style.display = "block";
      flash.style.background = "rgba(255,255,180," + (flashT * 1.6) + ")";
    } else flash.style.display = "none";
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (running) update(dt);
    else { cam.x = player.x - W / 2; cam.y = player.y - H / 2; }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function refreshMenu() {
    document.getElementById("menuCoins").textContent = String(save.coins);
    document.getElementById("menuBest").textContent = String(save.best || 0);
    document.getElementById("menuJoke").textContent = joke("start");
    const rl = document.getElementById("rankLine");
    if (rl) rl.textContent = "الرتبة: " + rankName();
    mutePlay.textContent = save.sfx ? "الصوت شغال" : "الصوت واقف";
  }
  function refreshMap() {
    const g = document.getElementById("mapGrid");
    g.innerHTML = "";
    for (let i = 0; i < 50; i++) {
      const b = document.createElement("button");
      b.className = "lvl" + (i <= save.unlocked ? " open" : "") + (i === level ? " now" : "");
      b.innerHTML = (i + 1) + "<span class='stars'>" + "★".repeat(save.stars[i] || 0) + "</span>";
      if (i <= save.unlocked) b.onclick = function () { openBrief(i); };
      g.appendChild(b);
    }
  }
  function perkText(c) {
    if (c.perk === "hp") return "دمه تخين";
    if (c.perk === "speed") return "فيه فسية";
    if (c.perk === "coins") return "بيلم قروش أكتر";
    if (c.perk === "armor") return "الحيطة متأثرش فيه أوي";
    if (c.perk === "boss") return "بيجري أهدى على الحيطة وفيه نفس زيادة";
    return "مفيش ميزة. ده اللي بتبدأ بيه";
  }
  function refreshChars() {
    const box = document.getElementById("charList");
    box.innerHTML = "";
    CHARS.forEach(function (c) {
      const open = save.chars.indexOf(c.id) >= 0;
      const el = document.createElement("div");
      el.className = "shop-item";
      const pic = c.id === "dummy" ? "" : "<img src='./" + (c.id === "sisi" ? "sisi" : ("char-" + c.id)) + ".png' width='36' height='36' style='border-radius:50%'>";
      el.innerHTML = "<span style=\"display:flex;align-items:center;gap:8px\">" + pic + c.name + " — " + perkText(c) + "</span>";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = open ? (save.char === c.id ? "بتلعب بيه" : "العب بيه") : (c.price + " قرش");
      btn.onclick = function () {
        if (open) { save.char = c.id; persist(); refreshChars(); }
        else if (c.price > 0 && save.coins >= c.price) { save.coins -= c.price; save.chars.push(c.id); save.char = c.id; persist(); refreshChars(); refreshMenu(); }
      };
      el.appendChild(btn); box.appendChild(el);
    });
  }
  function refreshShop() {
    const box = document.getElementById("shopList");
    box.innerHTML = "";
    ASSISTS.forEach(function (a) {
      const el = document.createElement("div");
      el.className = "shop-item";
      el.innerHTML = "<span>" + a.name + "<br><small>" + a.desc + " | عندك " + (save.bag[a.id] || 0) + "</small></span>";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = a.price + " قرش";
      btn.onclick = function () {
        if (save.coins >= a.price) { save.coins -= a.price; save.bag[a.id] = (save.bag[a.id] || 0) + 1; persist(); refreshShop(); refreshMenu(); }
      };
      el.appendChild(btn); box.appendChild(el);
    });
    SKINS.forEach(function (c) {
      const open = save.skins.indexOf(c.id) >= 0;
      const el = document.createElement("div");
      el.className = "shop-item";
      el.innerHTML = "<span>" + c.name + "</span>";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = open ? (save.skin === c.id ? "لابسه" : "البسه") : (c.price + " قرش");
      btn.onclick = function () {
        if (open) { save.skin = c.id; persist(); refreshShop(); }
        else if (save.coins >= c.price) { save.coins -= c.price; save.skins.push(c.id); save.skin = c.id; persist(); refreshShop(); refreshMenu(); }
      };
      el.appendChild(btn); box.appendChild(el);
    });
  }
  function refreshSet() {
    document.getElementById("togMusic").textContent = "الأغاني: " + (save.music ? "شغالة" : "مقفولة");
    document.getElementById("togSfx").textContent = "الأصوات: " + (save.sfx ? "شغالة" : "مقفولة");
    document.getElementById("togVibe").textContent = "الفريكة: " + (save.vibe ? "شغال" : "مقفول");
  }

  document.getElementById("playBtn").onclick = function () { openBrief(Math.min(save.unlocked, 49)); };
  document.getElementById("dailyBtn").onclick = function () {
    const d = new Date();
    const seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    openBrief(seed % 50);
  };
  document.getElementById("achBtn").onclick = function () {
    const box = document.getElementById("achList");
    const names = Object.keys(save.achs || {});
    box.innerHTML = names.length ? names.map(function (k) { return "★ " + save.achs[k]; }).join("<br>") : "لسه مفيش إنجاز. انزل اجري.";
    show("achs");
  };
  document.getElementById("achBack").onclick = function () { show("menu"); };
  document.getElementById("dashBtn").onclick = function () { doDash(); };
  document.getElementById("emoBtn").onclick = function () {
    nearEl.textContent = "خـــوود";
    netSend({ t: "emo", id: net.myId, txt: "خـــوود" });
  };
  document.getElementById("mapBtn").onclick = function () { refreshMap(); show("map"); };
  document.getElementById("charBtn").onclick = function () { refreshChars(); show("chars"); };
  document.getElementById("huntBtn").onclick = function () { refreshHunt(); show("hunter"); };
  document.getElementById("briefGo").onclick = function () { startLevel(level); };
  document.getElementById("briefBack").onclick = function () { show("map"); };
  document.getElementById("huntBack").onclick = function () { show("menu"); };
  function refreshHunt() {
    const box = document.getElementById("huntList");
    box.innerHTML = "";
    function add(id, name, open) {
      const el = document.createElement("div");
      el.className = "shop-item";
      el.innerHTML = "<span>" + name + "</span>";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = !open ? "مقفول" : (save.hunter === id ? "بيطاردك" : "اختاره");
      btn.disabled = !open;
      btn.onclick = function () { if (open) { save.hunter = id; persist(); refreshHunt(); } };
      el.appendChild(btn); box.appendChild(el);
    }
    add("sisi", "السيسي — المطارد الأصلي", true);
    CHARS.forEach(function (c) {
      if (c.id === "dummy" || c.id === "sisi") return;
      add(c.id, c.name + " — " + perkText(c), save.chars.indexOf(c.id) >= 0);
    });
  }
  document.getElementById("shopBtn").onclick = function () { refreshShop(); show("shop"); };
  document.getElementById("setBtn").onclick = function () { refreshSet(); show("settings"); };
  document.getElementById("helpBtn").onclick = function () {
    document.getElementById("howtoText").innerHTML =
      "اللعبة بتخدعك. دي الخريطة:<br>"+
      "• الحيطان مش بتقتل على طول، بتأكل من دمك. لو دمك خلص تموت حتى لو اللي وراك بعيد.<br>"+
      "• اللي يمسكك بيخلّصك فوري، والفيديو بيظهر.<br>"+
      "• في قروش شكلها زي الفلوس بس بتقرص وتنقص دم.<br>"+
      "• ساعات التحكم بيتقلب. الذراع يمين تروح شمال.<br>"+
      "• الباب ممكن يمشي من مكانه وأنت رايح له.<br>"+
      "• ممكن تطلع لك رسالة إنك كسبت وهي كدب.<br>"+
      "• لو المطارد اختفى، مش هتستناه من ورا. هيطلع من أي حتة بعد ثانيتين.<br>"+
      "• لو ظهر قدامك فجأة هتسمع الصوت القصير. لو راجع من بعيد هتسمع الطويل.<br>"+
      "• الشخصيات كلها مقفولة غير الهارب العادي. السيسي كمان شخصية تشتريها.<br>"+
      "• اللي تشتريه ممكن تخليه هو اللي يطاردك، وهيستخدم ميزته وهو وراك.<br>"+
      "• المساعدات تشتريها من الدكان وتفتحها من شاشة المهمة قبل ما تبدأ.";
    show("howto");
  };
  document.getElementById("helpBack").onclick = function () { show("menu"); };
  document.getElementById("mapBack").onclick = function () { show("menu"); };
  document.getElementById("charBack").onclick = function () { show("menu"); };
  document.getElementById("shopBack").onclick = function () { show("menu"); };
  document.getElementById("setBack").onclick = function () { show("menu"); };
  pauseBtn.onclick = function () {
    running = false; stopStick(); setPlayUI(false);
    if (net.playing) { net.playing = false; show("online"); netList(); return; }
    refreshMap(); show("map");
  };
  document.getElementById("resRetry").onclick = function () { openBrief(level); };
  document.getElementById("resNext").onclick = function () { openBrief(Math.min(level + 1, 49)); };
  document.getElementById("resMap").onclick = function () { refreshMap(); show("map"); };
  document.getElementById("resMenu").onclick = function () { refreshMenu(); show("menu"); };
  document.getElementById("togMusic").onclick = function () { save.music = !save.music; persist(); refreshSet(); };
  document.getElementById("togSfx").onclick = function () { save.sfx = !save.sfx; persist(); refreshSet(); };
  document.getElementById("togVibe").onclick = function () { save.vibe = !save.vibe; persist(); refreshSet(); };
  document.getElementById("resetBtn").onclick = function () {
    if (confirm("هتمسح كل التقدم؟")) {
      localStorage.removeItem(KEY);
      save = loadSave();
      refreshMenu(); refreshSet();
    }
  };
  mutePlay.onclick = function () { save.sfx = !save.sfx; persist(); mutePlay.textContent = save.sfx ? "الصوت شغال" : "الصوت واقف"; };

  function micLabel() {
    const a = document.getElementById("micBtn");
    const b = document.getElementById("micPlay");
    const txt = net.mic ? "المايك مفتوح. اتكلم" : "المايك مقفول";
    if (a) a.textContent = txt;
    if (b) b.textContent = net.mic ? "مايك شغال" : "مايك";
  }
  function hear(id, stream) {
    if (!id || !stream) return;
    let a = net.sounds[id];
    if (!a) {
      a = new Audio();
      a.autoplay = true;
      a.playsInline = true;
      net.sounds[id] = a;
    }
    a.srcObject = stream;
    const p = a.play();
    if (p && p.catch) p.catch(function () {});
  }
  function boostCall(call) {
    try {
      const pc = call && call.peerConnection;
      if (!pc || !pc.getSenders) return;
      pc.getSenders().forEach(function (sender) {
        if (!sender.track || sender.track.kind !== "audio" || !sender.getParameters) return;
        const params = sender.getParameters();
        params.encodings = params.encodings && params.encodings.length ? params.encodings : [{}];
        params.encodings[0].maxBitrate = 192000;
        sender.setParameters(params).catch(function () {});
      });
    } catch (e) {}
  }
  function callPeer(id) {
    if (!net.peer || !net.stream || !id || id === net.myId || net.calls[id]) return;
    try {
      const call = net.peer.call(id, net.stream);
      net.calls[id] = call;
      call.on("stream", function (s) { hear(id, s); boostCall(call); });
      call.on("close", function () { delete net.calls[id]; });
      setTimeout(function () { boostCall(call); }, 400);
    } catch (e) {}
  }
  function callAll() {
    Object.keys(net.peeps).forEach(function (id) { callPeer(id); });
    if (net.host) {
      net.conns.forEach(function (c) { if (c && c.peer) callPeer(c.peer); });
    } else if (net.room) callPeer("khoood" + net.room.toLowerCase());
  }
  async function toggleMic() {
    try {
      if (!net.mic) {
        net.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16
          },
          video: false
        });
        try {
          const tr = net.stream.getAudioTracks()[0];
          if (tr && tr.applyConstraints) {
            tr.applyConstraints({ sampleRate: 48000, channelCount: 1, echoCancellation: true }).catch(function () {});
          }
        } catch (e) {}
        net.mic = true;
        if (net.peer) {
          net.peer.on("call", function (call) {
            call.answer(net.stream);
            net.calls[call.peer] = call;
            call.on("stream", function (s) { hear(call.peer, s); boostCall(call); });
            setTimeout(function () { boostCall(call); }, 400);
          });
        }
        callAll();
        netStatus("المايك اشتغل. لو محدش سامعك خلّيه يفتح مايك برضو");
      } else {
        net.mic = false;
        if (net.stream) net.stream.getTracks().forEach(function (tr) { tr.stop(); });
        net.stream = null;
        netStatus("المايك اتقفل");
      }
    } catch (e) {
      net.mic = false;
      netStatus("الموبايل مانع المايك. اسمح بالميكروفون");
    }
    micLabel();
  }
  function netStatus(s) { const el = document.getElementById("onStatus"); if (el) el.textContent = s; }
  function netList() {
    const box = document.getElementById("onList");
    if (!box) return;
    const ids = Object.keys(net.peeps);
    box.innerHTML = ids.map(function (id) {
      const p = net.peeps[id];
      return (p.name || "لاعب") + " — " + (p.role === "hunt" ? "بيطارد" : "بيجري") + (id === net.myId ? " (إنت)" : "");
    }).join("<br>");
    const start = document.getElementById("onStart");
    if (start) start.style.display = net.host && ids.length >= 2 ? "inline-block" : "none";
  }
  function netSend(obj, except) {
    const raw = JSON.stringify(obj);
    net.conns.forEach(function (c) {
      if (!c || !c.open) return;
      if (except && c.peer === except) return;
      try { c.send(raw); } catch (e) {}
    });
  }
  function netHook(c) {
    c.on("open", function () {
      if (net.host) {
        if (Object.keys(net.peeps).length >= 5) { try { c.send(JSON.stringify({ t: "full" })); c.close(); } catch (e) {} return; }
      }
    });
    c.on("data", function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      if (msg.t === "join") {
        if (!net.host) return;
        const huntTaken = Object.keys(net.peeps).some(function (id) { return net.peeps[id].role === "hunt"; });
        const role = (msg.wantHunt && !huntTaken) ? "hunt" : "run";
        net.peeps[msg.id] = { x: 80, y: 80, name: msg.name, role: role, dead: false };
        netSend({ t: "roster", peeps: net.peeps, room: net.room });
        netList();
        if (net.mic) callAll();
      } else if (msg.t === "roster") {
        net.peeps = msg.peeps || {};
        netList();
        if (net.mic) callAll();
      } else if (msg.t === "pos") {
        if (net.peeps[msg.id]) { net.peeps[msg.id].x = msg.x; net.peeps[msg.id].y = msg.y; }
        if (net.host) netSend({ t: "pos", id: msg.id, x: msg.x, y: msg.y }, c.peer);
      } else if (msg.t === "start") {
        beginOnline(msg.peeps);
      } else if (msg.t === "catch") {
        if (net.peeps[msg.id]) net.peeps[msg.id].dead = true;
        if (msg.id === net.myId) lose("sisi");
      } else if (msg.t === "emo") { nearEl.textContent = (msg.txt || "خـــوود"); beep(200, 0.12, "sawtooth", 0.04);
      } else if (msg.t === "yt") {
        playRoomMedia(msg.url, true);
        if (net.host) netSend({ t: "yt", url: msg.url }, c.peer);
      } else if (msg.t === "ytstop") {
        stopRoomMedia(true);
        if (net.host) netSend({ t: "ytstop" }, c.peer);
      } else if (msg.t === "full") netStatus("الغرفة ممتلئة");
    });
    c.on("close", function () {
      net.conns = net.conns.filter(function (x) { return x !== c; });
    });
    if (!net.host) net.conns = [c];
  }
  function netCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function netName() { return (me() && me().name) ? me().name : "هارب"; }
  function mkOnline(host, code) {
    if (!window.Peer) { netStatus("الأونلاين مش محمل. لازم نت."); return; }
    try { if (net.peer) net.peer.destroy(); } catch (e) {}
    net.host = host; net.room = (code || netCode()).toUpperCase();
    net.peeps = {}; net.conns = []; net.playing = false;
    document.getElementById("roomIn").value = net.room;
    const pid = host ? ("khoood" + net.room.toLowerCase()) : undefined;
    net.peer = new window.Peer(pid);
    net.peer.on("call", function (call) {
      if (!net.stream) return;
      call.answer(net.stream);
      net.calls[call.peer] = call;
      call.on("stream", function (s) { hear(call.peer, s); boostCall(call); });
      setTimeout(function () { boostCall(call); }, 400);
    });
    net.peer.on("open", function (id) {
      net.myId = id;
      if (host) {
        net.peeps[id] = { x: 80, y: 80, name: netName(), role: net.wantHunt ? "hunt" : "run", dead: false };
        netStatus("الغرفة " + net.room + " — ابعت الكود لصحابك");
        netList();
      } else {
        const conn = net.peer.connect("khoood" + net.room.toLowerCase(), { reliable: true });
        conn.on("open", function () {
          netHook(conn);
          conn.send(JSON.stringify({ t: "join", id: net.myId, name: netName(), wantHunt: net.wantHunt }));
          netStatus("دخلت الغرفة " + net.room);
        });
        conn.on("error", function () { netStatus("الكود غلط أو صاحب الغرفة مش فاتح"); });
      }
    });
    net.peer.on("connection", function (c) {
      if (!net.host) return;
      net.conns.push(c);
      netHook(c);
    });
    net.peer.on("error", function (err) {
      netStatus("مشكلة اتصال: جرب كود تاني");
    });
  }
  function beginOnline(peeps) {
    if (peeps) net.peeps = peeps;
    net.playing = true;
    const mep = net.peeps[net.myId];
    net.role = mep && mep.role === "hunt" ? "hunt" : "run";
    const spawn = findClear(120 + Math.random() * 200, 120 + Math.random() * 200);
    player.x = spawn.x; player.y = spawn.y;
    player.hp = 100; player.maxHp = 100;
    running = true; over = false; won = false;
    startAt = performance.now();
    hideAll(); setPlayUI(true);
    missionHud.textContent = net.role === "hunt" ? "إنت اللي بتطارد. مسكهم." : "اجر. لو مسكوك خلصت.";
    nearEl.textContent = "أونلاين — غرفة " + net.room;
  }
  function netTick(dt) {
    if (net.peeps[net.myId]) { net.peeps[net.myId].x = player.x; net.peeps[net.myId].y = player.y; }
    net.lastSend += dt;
    if (net.lastSend > 0.08) {
      net.lastSend = 0;
      netSend({ t: "pos", id: net.myId, x: player.x, y: player.y });
    }
    if (net.role === "hunt") {
      Object.keys(net.peeps).forEach(function (id) {
        if (id === net.myId) return;
        const o = net.peeps[id];
        if (!o || o.dead || o.role === "hunt") return;
        if (Math.hypot(player.x - o.x, player.y - o.y) < 50) {
          o.dead = true;
          netSend({ t: "catch", id: id });
          nearEl.textContent = "مسكت " + (o.name || "واحد");
        }
      });
    } else {
      Object.keys(net.peeps).forEach(function (id) {
        const o = net.peeps[id];
        if (!o || o.role !== "hunt") return;
        const vis = (o.x - cam.x > -40 && o.y - cam.y > -40 && o.x - cam.x < W + 40 && o.y - cam.y < H + 40);
        if (vis && Math.hypot(player.x - o.x, player.y - o.y) < 220) nearEl.textContent = "قرّب منك!";
      });
    }
  }

  let ytPlayer = null, ytAudio = null;
  window.onYouTubeIframeAPIReady = function () {};
  function ytIdFrom(url) {
    const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|v=)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : "";
  }
  function playRoomMedia(url, fromNet) {
    url = String(url || "").trim();
    if (!url) { netStatus("حط لينك الأول"); return; }
    if (!fromNet) netSend({ t: "yt", url: url });
    if (ytAudio) { try { ytAudio.pause(); } catch (e) {} ytAudio = null; }
    const id = ytIdFrom(url);
    if (id && window.YT && YT.Player) {
      try {
        function ytLow(p) {
          try { if (p.setPlaybackQuality) p.setPlaybackQuality("small"); } catch (e) {}
          try { if (p.setPlaybackQualityRange) p.setPlaybackQualityRange("tiny", "small"); } catch (e) {}
        }
        if (ytPlayer && ytPlayer.loadVideoById) {
          ytPlayer.loadVideoById({ videoId: id, suggestedQuality: "small" });
          ytLow(ytPlayer);
        } else {
          ytPlayer = new YT.Player("ytbox", {
            height: "90", width: "100%", videoId: id,
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, vq: "small" },
            events: {
              onReady: function (e) { try { e.target.playVideo(); ytLow(e.target); } catch (err) {} },
              onStateChange: function (e) { ytLow(e.target); }
            }
          });
        }
        netStatus("اليوتيوب شغّال في الغرفة");
        return;
      } catch (e) {}
    }
    if (/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(url)) {
      ytAudio = new Audio(url);
      ytAudio.play().catch(function () { netStatus("دوس شغّل تاني عشان الموبايل يسمح بالصوت"); });
      netStatus("الملف الصوتي شغّال في الغرفة");
      return;
    }
    if (!id) netStatus("حط لينك يوتيوب صح");
    else netStatus("اليوتيوب لسه بيجهز. دوس شغّل تاني");
  }
  function stopRoomMedia(fromNet) {
    if (!fromNet) netSend({ t: "ytstop" });
    try { if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo(); } catch (e) {}
    try { if (ytAudio) ytAudio.pause(); } catch (e) {}
    ytAudio = null;
    netStatus("ال صوت اتقفل");
  }
  document.getElementById("ytPlay").onclick = function () {
    playRoomMedia(document.getElementById("ytIn").value, false);
  };
  document.getElementById("ytStop").onclick = function () { stopRoomMedia(false); };

  document.getElementById("onlineBtn").onclick = function () { show("online"); netStatus("مش متصل"); };
  document.getElementById("onBack").onclick = function () { show("menu"); };
  document.getElementById("micBtn").onclick = function () { toggleMic(); };
  document.getElementById("micPlay").onclick = function () { toggleMic(); };
  document.getElementById("wantHunt").onclick = function () {
    net.wantHunt = !net.wantHunt;
    document.getElementById("wantHunt").textContent = net.wantHunt ? "هطارد" : "عايز أطارد";
  };
  document.getElementById("mkRoom").onclick = function () { mkOnline(true); };
  document.getElementById("jnRoom").onclick = function () {
    const code = (document.getElementById("roomIn").value || "").trim().toUpperCase();
    if (code.length < 3) { netStatus("اكتب كود الغرفة"); return; }
    mkOnline(false, code);
  };
  document.getElementById("onStart").onclick = function () {
    if (!net.host) return;
    const hasHunt = Object.keys(net.peeps).some(function (id) { return net.peeps[id].role === "hunt"; });
    if (!hasHunt && net.peeps[net.myId]) net.peeps[net.myId].role = "hunt";
    netSend({ t: "start", peeps: net.peeps });
    beginOnline(net.peeps);
  };

  document.addEventListener("touchmove", function (e) { if (running) e.preventDefault(); }, { passive: false });


  const CHAT_KEY = "khoood-chat-v2";
  const chat = { peer: null, conns: {}, me: "", hist: {}, friends: [], groups: [], seen: {}, with: null, media: null, calls: {} };
  function b64(bytes) {
    let s = "";
    bytes = new Uint8Array(bytes);
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(s) {
    const raw = atob(s);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function chatCryptoKey() {
    let raw = localStorage.getItem("khoood-chat-aes");
    if (!raw) {
      raw = b64(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem("khoood-chat-aes", raw);
    }
    return crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  async function encText(text) {
    const key = await chatCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(text));
    return b64(iv) + "." + b64(data);
  }
  async function decText(pack) {
    try {
      const parts = String(pack || "").split(".");
      if (parts.length < 2) return "";
      const key = await chatCryptoKey();
      const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(parts[0]) }, key, unb64(parts[1]));
      return new TextDecoder().decode(out);
    } catch (e) { return ""; }
  }
  function castList() { return CHARS.filter(function (c) { return c.id !== "dummy"; }); }
  function faceSrc(id) { return id === "sisi" ? "./sisi.png" : ("./char-" + id + ".png"); }
  function faceName(id) {
    if (id && id.charAt(0) === "#") return id;
    const c = CHARS.find(function (x) { return x.id === id; });
    return c ? c.name : id;
  }
  function uidOf(name) { return "khooodu" + String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16); }
  function paintWho() {
    const box = document.getElementById("chatWho");
    if (!box) return;
    box.innerHTML = "";
    castList().forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn ghost";
      b.style.padding = "6px";
      b.innerHTML = "<img src='" + faceSrc(c.id) + "' width='44' height='44' style='border-radius:50%;display:block;margin:auto'>" + c.name;
      if (chat.me === c.id) b.style.outline = "3px solid #e8c56b";
      b.onclick = function () {
        chat.me = c.id;
        document.getElementById("chatUser").value = c.id;
        saveChat();
        paintWho();
        goOnlineUser();
      };
      box.appendChild(b);
    });
    const sel = document.getElementById("chatAdd");
    if (sel) {
      sel.innerHTML = castList().filter(function (c) { return c.id !== chat.me; }).map(function (c) {
        return "<option value='" + c.id + "'>" + c.name + "</option>";
      }).join("");
    }
  }
  function threadKey() { return chat.with || ""; }
  async function loadChat() {
    try {
      const blob = localStorage.getItem(CHAT_KEY) || localStorage.getItem("khoood-chat-v1");
      if (!blob) return { user: localStorage.getItem("khoood-chat-user") || "", friends: [], groups: [], hist: {}, seen: {} };
      const plain = await decText(blob);
      return plain ? JSON.parse(plain) : { user: "", friends: [], groups: [], hist: {}, seen: {} };
    } catch (e) { return { user: "", friends: [], groups: [], hist: {}, seen: {} }; }
  }
  async function saveChat() {
    const data = { user: chat.me || "", friends: chat.friends || [], groups: chat.groups || [], hist: chat.hist || {}, seen: chat.seen || {} };
    localStorage.setItem(CHAT_KEY, await encText(JSON.stringify(data)));
    if (chat.me) localStorage.setItem("khoood-chat-user", chat.me);
  }
  function seenText(u) {
    const at = chat.seen[u];
    if (!at) return "آخر ظهور: مش معروف";
    const d = new Date(at);
    const mins = Math.floor((Date.now() - at) / 60000);
    if (mins < 1) return "ظاهر دلوقت";
    if (mins < 60) return "آخر ظهور من " + mins + " دقيقة";
    return "آخر ظهور " + d.toLocaleString();
  }
  function chatStat(s) { const el = document.getElementById("chatStat"); if (el) el.textContent = s; }
  function chatPaint() {
    const log = document.getElementById("chatLog");
    const key = threadKey();
    const list = chat.hist[key] || [];
    log.innerHTML = list.map(function (m) {
      if (m.k === "inv") return "<div><b>" + m.u + ":</b> دعوة لعب للغرفة " + m.room + " <button type='button' class='btn' data-join='" + m.room + "'>انضم دلوقت</button></div>";
      return "<div><img src='" + faceSrc(m.u) + "' width='22' height='22' style='border-radius:50%;vertical-align:middle;margin-left:4px'><b>" + faceName(m.u || "?") + ":</b> " + String(m.t || "").replace(/[<>]/g, "") + "</div>";
    }).join("") || "مفيش كلام لسه.";
    log.scrollTop = log.scrollHeight;
    log.querySelectorAll("[data-join]").forEach(function (b) {
      b.onclick = function () {
        const code = b.getAttribute("data-join");
        show("online");
        document.getElementById("roomIn").value = code;
        mkOnline(false, code);
      };
    });
    const who = document.getElementById("chatWith");
    const seen = document.getElementById("chatSeen");
    if (who) who.innerHTML = chat.with ? ((chat.with.charAt(0) === "#" ? "" : "<img src='"+faceSrc(chat.with)+"' width='28' height='28' style='border-radius:50%;vertical-align:middle;margin-left:6px'>") + "بتكلم: " + faceName(chat.with)) : "اختار حد من الشخصيات";
    if (seen) seen.textContent = chat.with && chat.with.charAt(0) !== "#" ? seenText(chat.with) : "";
  }
  function paintPeople() {
    const box = document.getElementById("chatPeople");
    const rows = [];
    (chat.friends || []).forEach(function (u) {
      rows.push("<div class='shop-item'><span style='display:flex;align-items:center;gap:8px'><img src='" + faceSrc(u) + "' width='36' height='36' style='border-radius:50%'>" + faceName(u) + "<br><small>" + seenText(u) + "</small></span><button type='button' class='btn' data-open='" + u + "'>افتح</button></div>");
    });
    (chat.groups || []).forEach(function (g) {
      rows.push("<div class='shop-item'><span>#" + g.name + "<br><small>" + (g.members || []).join("، ") + "</small></span><button type='button' class='btn' data-open='#" + g.name + "'>افتح</button></div>");
    });
    box.innerHTML = rows.join("") || "ضيف شخصية من اللي فوق.";
    box.querySelectorAll("[data-open]").forEach(function (b) {
      b.onclick = function () { openThread(b.getAttribute("data-open")); };
    });
  }
  function chatSendTo(name, obj) {
    const raw = JSON.stringify(obj);
    const id = uidOf(name);
    const have = chat.conns[id];
    if (have && have.open) { try { have.send(raw); return; } catch (e) {} }
    if (!chat.peer) return;
    try {
      const c = chat.peer.connect(id, { reliable: true });
      c.on("open", function () { chatHook(c, name); c.send(raw); });
      c.on("error", function () { chatStat(name + " مش ظاهر دلوقت"); });
    } catch (e) { chatStat(name + " مش ظاهر"); }
  }
  function chatHook(c, name) {
    const id = c.peer || uidOf(name);
    chat.conns[id] = c;
    c.on("data", async function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      if (msg.t === "seen") {
        chat.seen[msg.u] = msg.at || Date.now();
        await saveChat();
        paintPeople();
        if (chat.with === msg.u) chatPaint();
        return;
      }
      const from = msg.u || name || "حد";
      chat.seen[from] = Date.now();
      if (chat.friends.indexOf(from) < 0 && from !== chat.me) chat.friends.push(from);
      const key = msg.g ? ("#" + msg.g) : from;
      if (!chat.hist[key]) chat.hist[key] = [];
      if (msg.t === "inv") chat.hist[key].push({ k: "inv", u: from, room: msg.room, at: Date.now() });
      else chat.hist[key].push({ u: from, t: msg.m, at: Date.now() });
      await saveChat();
      if (!chat.with) chat.with = key;
      paintPeople();
      chatPaint();
    });
  }
  function openThread(key) {
    chat.with = key;
    if (!chat.hist[key]) chat.hist[key] = [];
    if (key.charAt(0) !== "#") chatSendTo(key, { t: "seen", u: chat.me, at: Date.now() });
    chatPaint();
  }
  function goOnlineUser() {
    if (!window.Peer) { chatStat("محتاج نت"); return; }
    chat.me = (document.getElementById("chatUser").value || localStorage.getItem("khoood-chat-user") || "").trim().replace(/[^A-Za-z0-9_\u0600-\u06FF]/g, "").slice(0, 16);
    if (!chat.me) { chatStat("اكتب يوزر"); return; }
    document.getElementById("chatUser").value = chat.me;
    saveChat();
    try { if (chat.peer) chat.peer.destroy(); } catch (e) {}
    chat.peer = new window.Peer(uidOf(chat.me));
    chat.peer.on("open", function () { chatStat("ظاهر دلوقت كـ " + faceName(chat.me)); });
    chat.peer.on("connection", function (c) { chatHook(c); chatSendToPeerSeen(c); });
    chat.peer.on("call", async function (call) {
      try {
        const v = call.metadata && call.metadata.video;
        chat.media = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!v });
        call.answer(chat.media);
        showCall(call, chat.media);
      } catch (e) { chatStat("الموبايل مانع الكاميرا/المايك"); }
    });
    chat.peer.on("error", function () { chatStat("الشخصية دي ظاهرة من جهاز تاني"); });
  }
  function chatSendToPeerSeen(c) {
    try { c.send(JSON.stringify({ t: "seen", u: chat.me, at: Date.now() })); } catch (e) {}
  }
  function showCall(call, local) {
    const box = document.getElementById("vids");
    box.style.display = "flex";
    document.getElementById("vidMe").srcObject = local;
    call.on("stream", function (s) { document.getElementById("vidYou").srcObject = s; });
  }
  async function startCall(video) {
    if (!chat.with || chat.with.charAt(0) === "#") { chatStat("افتح شات شخصي الأول"); return; }
    try {
      chat.media = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!video });
      const call = chat.peer.call(uidOf(chat.with), chat.media, { metadata: { video: !!video } });
      showCall(call, chat.media);
    } catch (e) { chatStat("اسمح بالمايك/الكاميرا"); }
  }
  async function sendChat() {
    const inp = document.getElementById("chatIn");
    const text = (inp.value || "").trim();
    if (!text || !chat.with) { chatStat("اختار حد وابعت"); return; }
    inp.value = "";
    if (!chat.hist[chat.with]) chat.hist[chat.with] = [];
    chat.hist[chat.with].push({ u: chat.me, t: text, at: Date.now() });
    await saveChat();
    chatPaint();
    const payload = { t: "c", u: chat.me, m: text };
    if (chat.with.charAt(0) === "#") {
      payload.g = chat.with.slice(1);
      const g = (chat.groups || []).find(function (x) { return x.name === payload.g; });
      (g && g.members || []).forEach(function (u) { if (u !== chat.me) chatSendTo(u, payload); });
    } else chatSendTo(chat.with, payload);
  }
  document.getElementById("chatBtn").onclick = async function () {
    const saved = await loadChat();
    chat.hist = saved.hist || saved.rooms || {};
    chat.friends = saved.friends || [];
    chat.groups = saved.groups || [];
    chat.seen = saved.seen || {};
    chat.me = saved.user || localStorage.getItem("khoood-chat-user") || "";
    document.getElementById("chatUser").value = chat.me;
    paintWho();
    paintPeople();
    chatPaint();
    show("chat");
    if (castList().some(function (c) { return c.id === chat.me; })) goOnlineUser();
  };
  document.getElementById("chatBack").onclick = function () { show("menu"); };
  document.getElementById("chatOn").onclick = function () { goOnlineUser(); };
  document.getElementById("chatAddBtn").onclick = function () {
    const u = (document.getElementById("chatAdd").value || "").trim();
    if (!u) return;
    if (chat.friends.indexOf(u) < 0) chat.friends.push(u);
    document.getElementById("chatAdd").value = "";
    saveChat();
    paintPeople();
    openThread(u);
  };
  document.getElementById("chatGrpBtn").onclick = function () {
    const name = prompt("اسم الجروب؟");
    if (!name) return;
    const members = castList().map(function (c) { return c.id; }).filter(function (id) { return id !== chat.me; });
    chat.groups.push({ name: name.replace(/\s/g, "").slice(0, 16), members: members });
    saveChat();
    paintPeople();
    openThread("#" + chat.groups[chat.groups.length - 1].name);
  };
  document.getElementById("chatSend").onclick = function () { sendChat(); };
  document.getElementById("chatIn").addEventListener("keydown", function (e) { if (e.key === "Enter") sendChat(); });
  document.getElementById("chatCall").onclick = function () { startCall(false); };
  document.getElementById("chatVid").onclick = function () { startCall(true); };
  document.getElementById("chatInvite").onclick = function () {
    if (!chat.with) { chatStat("اختار حد الأول"); return; }
    let code = net.room;
    if (!code) {
      code = netCode();
      document.getElementById("roomIn").value = code;
      mkOnline(true, code);
    }
    const payload = { t: "inv", u: chat.me, room: code };
    if (chat.with.charAt(0) === "#") {
      payload.g = chat.with.slice(1);
      const g = chat.groups.find(function (x) { return x.name === payload.g; });
      (g && g.members || []).forEach(function (u) { if (u !== chat.me) chatSendTo(u, payload); });
    } else chatSendTo(chat.with, payload);
    if (!chat.hist[chat.with]) chat.hist[chat.with] = [];
    chat.hist[chat.with].push({ k: "inv", u: chat.me, room: code, at: Date.now() });
    saveChat();
    chatPaint();
    chatStat("اتبعتت دعوة الغرفة " + code);
  };

  refreshMenu();
  show("menu");
})();
