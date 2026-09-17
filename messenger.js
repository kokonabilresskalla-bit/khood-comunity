(function () {
  const ICE = { config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } };
  const auth = KHOOD.authGet();
  let me = auth && auth.id;
  if (auth && auth.id) { const lm=document.getElementById("loginModal"); if (lm) lm.style.display="none"; }
  let peer = null, withId = null, hist = KHOOD.localGet(KHOOD.CHAT_KEY, {}), conns = {}, media = null, call = null, muted = false;
  let incoming = null, rec = null, chunks = [], typingT = 0, presence = {};

  function err(t) { const el = document.getElementById("loginErr"); if (el) el.textContent = t || ""; }
  function stat(t) { document.getElementById("stat").textContent = t; }
  function notify(title, body) {
    const text = body || "";
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "notify", title: title, body: text, tag: "khoood-" + Date.now() });
    } else if (window.Notification && Notification.permission === "granted") {
      try { new Notification(title, { body: text, icon: "./icon-192.png" }); } catch (e) {}
    }
  }
  async function askNotify() {
    if (!window.Notification) return;
    try { await Notification.requestPermission(); } catch (e) {}
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      try { if (reg.periodicSync) await reg.periodicSync.register("khood-mail", { minInterval: 15 * 60 * 1000 }); } catch (e) {}
      navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type: "watch", key: "khoood-mbox-v1-" + me });
    }
  }
  function onlineOf(id) {
    const p = presence[id];
    return !!(p && Date.now() - (p.at || 0) < 25000);
  }
  function seenText(id) {
    const p = presence[id];
    if (!p) return "آخر ظهور: مش معروف";
    if (Date.now() - (p.at || 0) < 25000) return "متصل";
    const mins = Math.floor((Date.now() - p.at) / 60000);
    if (mins < 60) return "آخر ظهور من " + mins + " د";
    return "آخر ظهور " + new Date(p.at).toLocaleString();
  }

  function paintWho() {
    const box = document.getElementById("whoGrid");
    if (!box) return;
    box.innerHTML = "";
    KHOOD.CHARS.forEach(function (c) {
      const b = document.createElement("button");
      b.className = "p-1 rounded-xl border " + (me === c.id ? "border-cyan-400" : "border-transparent");
      b.innerHTML = "<img src='" + c.img + "' class='w-full aspect-square rounded-lg object-cover'><small class='text-[10px]'>" + c.name + "</small>";
      b.onclick = function () { if (auth && auth.id) return; me = c.id; paintWho(); };
      box.appendChild(b);
    });
  }
  function people() {
    const box = document.getElementById("people");
    box.innerHTML = "";
    KHOOD.CHARS.filter(function (c) { return c.id !== me; }).forEach(function (c) {
      const on = onlineOf(c.id);
      const row = document.createElement("button");
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/30 text-right";
      row.innerHTML = "<span class='relative'><img src='" + c.img + "' class='w-12 h-12 rounded-full object-cover'><span class='absolute bottom-0 left-0 w-3 h-3 rounded-full " + (on ? "bg-green-400" : "bg-gray-500") + "'></span></span><div><b class='block'>" + c.name + "</b><small class='text-gray-400'>" + seenText(c.id) + "</small></div>";
      row.onclick = function () { openThread(c.id); };
      box.appendChild(row);
    });
  }
  function ticks(m) {
    if (m.u !== me) return "";
    return m.seen ? " ✓✓" : " ✓";
  }
  function paintLog() {
    const log = document.getElementById("log");
    const list = hist[withId] || [];
    log.innerHTML = list.map(function (m) {
      const mine = m.u === me;
      const side = (mine ? "bubble-me mr-auto" : "bubble-them ml-auto") + " max-w-[80%] rounded-2xl p-2 text-sm";
      if (m.k === "inv") return "<div class='" + side + "'>دعوة لعب " + m.room + " <button data-join='" + m.room + "' class='underline'>انضم</button></div>";
      if (m.a) return "<div class='" + side + "'><audio controls src='" + m.a + "'></audio><small>" + ticks(m) + "</small></div>";
      return "<div class='" + side + "'>" + String(m.t || "").replace(/[<>]/g, "") + "<small class='block opacity-70'>" + ticks(m) + "</small></div>";
    }).join("");
    log.querySelectorAll("[data-join]").forEach(function (b) {
      b.onclick = function () { location.href = "./index.html?room=" + b.getAttribute("data-join"); };
    });
    log.scrollTop = log.scrollHeight;
  }
  function openThread(id) {
    withId = id;
    document.getElementById("youFace").src = KHOOD.face(id);
    document.getElementById("youName").textContent = KHOOD.cname(id);
    document.getElementById("youSeen").textContent = seenText(id);
    document.querySelector("main").classList.remove("hidden");
    document.querySelector("main").classList.add("flex");
    paintLog();
    ping(id);
    sendRaw(id, { t: "read", u: me, at: Date.now() });
  }

  async function boxKey(id) { return "khoood-mbox-v1-" + id; }
  async function dropMail(to, payload) {
    const key = await boxKey(to);
    const cur = (await KHOOD.get(key)) || { msgs: [] };
    cur.msgs = (cur.msgs || []).concat([{ payload: payload, at: Date.now() }]).slice(-80);
    await KHOOD.put(key, cur);
  }
  async function drain() {
    if (!me) return;
    const cur = (await KHOOD.get(await boxKey(me))) || { msgs: [] };
    let n = 0;
    (cur.msgs || []).forEach(function (item) {
      const msg = item.payload || item;
      if (!msg || !msg.u) return;
      const tid = msg.u;
      if (!hist[tid]) hist[tid] = [];
      const exists = hist[tid].some(function (m) { return (m.at && m.at === msg.at) || (m.t && m.t === msg.m && m.u === msg.u); });
      if (exists) return;
      if (msg.t === "c") hist[tid].push({ u: msg.u, t: msg.m, at: msg.at || Date.now() });
      else if (msg.t === "inv") hist[tid].push({ k: "inv", u: msg.u, room: msg.room, at: msg.at || Date.now() });
      else if (msg.a || msg.t === "voice") hist[tid].push({ u: msg.u, a: msg.a, at: msg.at || Date.now() });
      else return;
      n += 1;
      notify(KHOOD.cname(tid), msg.m || (msg.a ? "رسالة صوتية" : "رسالة جديدة"));
    });
    if ((cur.msgs || []).length) await KHOOD.put(await boxKey(me), { msgs: [] });
    if (n) { KHOOD.localSet(KHOOD.CHAT_KEY, hist); people(); if (withId) paintLog(); }
  }

  function sendRaw(id, obj) {
    const c = conns[id];
    if (c && c.open) { try { c.send(JSON.stringify(obj)); return true; } catch (e) {} }
    if (!peer) return false;
    const dest = window._peers && window._peers[id];
    if (!dest) return false;
    try {
      const x = peer.connect(dest, { reliable: true });
      x.on("open", function () { conns[id] = x; hook(x, id); x.send(JSON.stringify(obj)); });
    } catch (e) {}
    return false;
  }

  async function ping(id) {
    const pres = await KHOOD.get("khoood-user-" + id);
    if (pres) presence[id] = pres;
    if (pres && pres.peer) {
      window._peers = window._peers || {};
      window._peers[id] = pres.peer;
      if (withId === id) document.getElementById("youSeen").textContent = seenText(id);
      if (peer && (!conns[id] || !conns[id].open)) {
        const c = peer.connect(pres.peer, { reliable: true });
        c.on("open", function () { conns[id] = c; hook(c, id); });
      }
    } else if (withId === id) document.getElementById("youSeen").textContent = seenText(id);
    people();
  }

  function hook(c, id) {
    c.on("data", function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      const from = msg.u || id;
      if (msg.t === "typing") {
        if (withId === from) {
          document.getElementById("youType").textContent = "جاري الكتابة...";
          clearTimeout(typingT);
          typingT = setTimeout(function () { document.getElementById("youType").textContent = ""; }, 1500);
        }
        return;
      }
      if (msg.t === "read") {
        (hist[from] || []).forEach(function (m) { if (m.u === me) m.seen = true; });
        KHOOD.localSet(KHOOD.CHAT_KEY, hist);
        if (withId === from) paintLog();
        return;
      }
      if (!hist[from]) hist[from] = [];
      if (msg.t === "c") { hist[from].push({ u: from, t: msg.m, at: Date.now() }); notify(KHOOD.cname(from), msg.m); }
      if (msg.t === "inv") { hist[from].push({ k: "inv", u: from, room: msg.room, at: Date.now() }); notify(KHOOD.cname(from), "دعوة لعب"); }
      if (msg.t === "voice") { hist[from].push({ u: from, a: msg.a, at: Date.now() }); notify(KHOOD.cname(from), "رسالة صوتية"); }
      KHOOD.localSet(KHOOD.CHAT_KEY, hist);
      if (withId === from) {
        paintLog();
        sendRaw(from, { t: "read", u: me, at: Date.now() });
      }
    });
  }

  function showIncoming(cl) {
    incoming = cl;
    const from = (cl.metadata && cl.metadata.from) || "حد";
    document.getElementById("inFace").src = KHOOD.face(from);
    document.getElementById("inName").textContent = "مكالمة من " + KHOOD.cname(from);
    const box = document.getElementById("inCall");
    box.classList.remove("hidden");
    box.classList.add("flex");
    notify("مكالمة", KHOOD.cname(from));
  }
  function hideIncoming() {
    const box = document.getElementById("inCall");
    box.classList.add("hidden");
    box.classList.remove("flex");
  }
  async function acceptCall() {
    if (!incoming) return;
    try {
      const v = incoming.metadata && incoming.metadata.video;
      media = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!v });
      incoming.answer(media);
      showCall(incoming);
    } catch (e) { stat("اسمح بالمايك/الكاميرا"); }
    hideIncoming();
    incoming = null;
  }
  function rejectCall() {
    try { if (incoming) incoming.close(); } catch (e) {}
    incoming = null;
    hideIncoming();
  }
  function showCall(cl) {
    call = cl;
    document.getElementById("callScreen").classList.add("on");
    document.getElementById("vidMe").srcObject = media;
    cl.on("stream", function (s) { document.getElementById("vidYou").srcObject = s; });
    cl.on("close", hang);
    cl.on("error", hang);
  }
  function hang() {
    try { if (call) call.close(); } catch (e) {}
    try { if (media) media.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    call = null; media = null; muted = false;
    document.getElementById("vidMe").srcObject = null;
    document.getElementById("vidYou").srcObject = null;
    document.getElementById("callScreen").classList.remove("on");
  }

  async function goLive() {
    if (!window.Peer) { stat("محتاج نت"); return; }
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = new window.Peer(undefined, ICE);
    peer.on("open", async function (id) {
      await KHOOD.put("khoood-user-" + me, { peer: id, at: Date.now() });
      stat("متصل كـ " + KHOOD.cname(me));
      drain();
    });
    peer.on("connection", function (c) { hook(c); });
    peer.on("call", function (cl) { showIncoming(cl); });
    peer.on("error", function () { stat("الاتصال وقع. هحاول تاني"); setTimeout(goLive, 2500); });
    setInterval(function () {
      if (me && peer && peer.id) KHOOD.put("khoood-user-" + me, { peer: peer.id, at: Date.now() });
      drain();
      KHOOD.CHARS.forEach(function (c) { if (c.id !== me) ping(c.id); });
    }, 8000);
  }

  function enterApp() {
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("meFace").src = KHOOD.face(me);
    document.getElementById("meName").textContent = KHOOD.cname(me);
    people();
    askNotify();
    goLive();
  }

  document.getElementById("loginBtn").onclick = function () {
    const pass = document.getElementById("passIn").value;
    if (!me) { err("اختار شخصية"); return; }
    if (auth && auth.id && auth.id !== me) { err("الجهاز مقفول على " + KHOOD.cname(auth.id)); return; }
    if (!KHOOD.checkPass(me, pass)) { err("كلمة السر غلط"); return; }
    KHOOD.authSet({ id: me, at: Date.now() });
    enterApp();
  };
  document.getElementById("outBtn").onclick = function () { location.href = "./index.html"; };
  document.getElementById("sendForm").onsubmit = async function (e) {
    e.preventDefault();
    const text = document.getElementById("msgIn").value.trim();
    if (!text || !withId) return;
    document.getElementById("msgIn").value = "";
    if (!hist[withId]) hist[withId] = [];
    const item = { u: me, t: text, at: Date.now() };
    hist[withId].push(item);
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    paintLog();
    const payload = { t: "c", u: me, m: text, at: item.at };
    sendRaw(withId, payload);
    await dropMail(withId, payload);
  };
  document.getElementById("msgIn").addEventListener("input", function () {
    if (withId) sendRaw(withId, { t: "typing", u: me });
  });
  document.getElementById("callBtn").onclick = async function () {
    if (!withId || !peer) return;
    await ping(withId);
    if (!window._peers[withId]) { stat("مش متصل دلوقت"); return; }
    media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const cl = peer.call(window._peers[withId], media, { metadata: { video: false, from: me } });
    showCall(cl);
  };
  document.getElementById("vidBtn").onclick = async function () {
    if (!withId || !peer) return;
    await ping(withId);
    if (!window._peers[withId]) { stat("مش متصل دلوقت"); return; }
    media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const cl = peer.call(window._peers[withId], media, { metadata: { video: true, from: me } });
    showCall(cl);
  };
  document.getElementById("hangBtn").onclick = hang;
  document.getElementById("accBtn").onclick = acceptCall;
  document.getElementById("rejBtn").onclick = rejectCall;
  document.getElementById("muteBtn").onclick = function () {
    muted = !muted;
    if (media) media.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
  };
  document.getElementById("invBtn").onclick = async function () {
    if (!withId) return;
    const room = "K" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const payload = { t: "inv", u: me, room: room, k: "inv", at: Date.now() };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(payload);
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    paintLog();
    sendRaw(withId, payload);
    await dropMail(withId, payload);
    location.href = "./index.html?room=" + room + "&host=1";
  };
  document.getElementById("recBtn").onclick = async function () {
    if (!withId) return;
    if (rec && rec.state === "recording") {
      rec.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (blob.size > 220000) { stat("الصوت طويل. قصّره"); return; }
      const reader = new FileReader();
      reader.onload = async function () {
        const a = reader.result;
        if (!hist[withId]) hist[withId] = [];
        hist[withId].push({ u: me, a: a, at: Date.now() });
        KHOOD.localSet(KHOOD.CHAT_KEY, hist);
        paintLog();
        const payload = { t: "voice", u: me, a: a, at: Date.now() };
        sendRaw(withId, payload);
        try { await dropMail(withId, payload); } catch (e) {}
      };
      reader.readAsDataURL(blob);
      document.getElementById("recBtn").textContent = "🎤";
    };
    rec.start();
    document.getElementById("recBtn").textContent = "⏹";
  };

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { scope: "./" });
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });
  document.getElementById("instBtn").onclick = async function () {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; return; }
    alert(/iphone|ipad|ipod/i.test(navigator.userAgent) ? "من Safari: المشاركة ثم Add to Home Screen" : "من كروم: القائمة ثم إضافة إلى الشاشة الرئيسية");
  };

  paintWho();
  if (auth && auth.id) {
    me = auth.id;
    enterApp();
  }
})();
