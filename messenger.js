(function () {
  const auth = KHOOD.authGet();
  let me = auth && auth.id;
  let peer = null, withId = null, hist = KHOOD.localGet(KHOOD.CHAT_KEY, {}), conns = {}, media = null, call = null, muted = false;

  function err(t) { document.getElementById("loginErr").textContent = t || ""; }
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
  }

  function paintWho() {
    const box = document.getElementById("whoGrid");
    box.innerHTML = "";
    KHOOD.CHARS.forEach(function (c) {
      const b = document.createElement("button");
      b.className = "p-1 rounded-xl border " + (me === c.id ? "border-cyan-400" : "border-transparent");
      b.innerHTML = "<img src='" + c.img + "' class='w-full aspect-square rounded-lg object-cover'><small class='text-[10px]'>" + c.name + "</small>";
      b.onclick = function () { me = c.id; paintWho(); };
      box.appendChild(b);
    });
  }

  function people() {
    const box = document.getElementById("people");
    box.innerHTML = "";
    KHOOD.CHARS.filter(function (c) { return c.id !== me; }).forEach(function (c) {
      const row = document.createElement("button");
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/30 text-right";
      row.innerHTML = "<img src='" + c.img + "' class='w-12 h-12 rounded-full object-cover'><div><b class='block'>" + c.name + "</b><small class='text-gray-400'>اضغط عشان تفتح</small></div>";
      row.onclick = function () { openThread(c.id); };
      box.appendChild(row);
    });
  }

  function paintLog() {
    const log = document.getElementById("log");
    const list = hist[withId] || [];
    log.innerHTML = list.map(function (m) {
      const mine = m.u === me;
      if (m.k === "inv") return "<div class='" + (mine ? "bubble-me" : "bubble-them") + " max-w-[80%] rounded-2xl p-2 " + (mine ? "mr-auto" : "ml-auto") + "'>دعوة لعب " + m.room + " <button data-join='" + m.room + "' class='underline'>انضم</button></div>";
      return "<div class='" + (mine ? "bubble-me" : "bubble-them") + " max-w-[80%] rounded-2xl p-2 text-sm " + (mine ? "mr-auto" : "ml-auto") + "'>" + String(m.t || "").replace(/[<>]/g, "") + "</div>";
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
    document.querySelector("main").classList.remove("hidden");
    document.querySelector("main").classList.add("flex");
    paintLog();
    ping(id);
  }

  async function boxKey(id) { return "khoood-mbox-v1-" + id; }
  async function dropMail(to, payload) {
    const key = await boxKey(to);
    const cur = (await KHOOD.get(key)) || { msgs: [] };
    cur.msgs = (cur.msgs || []).concat([{ payload: payload, at: Date.now() }]).slice(-80);
    await KHOOD.put(key, cur);
  }
  async function drain() {
    const key = await boxKey(me);
    const cur = (await KHOOD.get(key)) || { msgs: [] };
    (cur.msgs || []).forEach(function (item) {
      const msg = item.payload || item;
      if (!msg || !msg.u) return;
      const tid = msg.u;
      if (!hist[tid]) hist[tid] = [];
      const exists = hist[tid].some(function (m) { return (m.at && m.at === msg.at) || (m.t === msg.m && m.u === msg.u); });
      if (exists) return;
      hist[tid].push(msg.k === "inv" ? msg : { u: msg.u, t: msg.m, at: msg.at || Date.now() });
      notify(KHOOD.cname(tid), msg.m || "دعوة لعب");
    });
    await KHOOD.put(key, { msgs: [] });
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    if (withId) paintLog();
  }

  function sendRaw(id, obj) {
    const c = conns[id];
    if (c && c.open) { try { c.send(JSON.stringify(obj)); return true; } catch (e) {} }
    if (!peer) return false;
    try {
      const x = peer.connect((window._peers && window._peers[id]) || ("tmp"), { reliable: true });
      x.on("open", function () { conns[id] = x; x.send(JSON.stringify(obj)); });
    } catch (e) {}
    return false;
  }

  async function ping(id) {
    const pres = await KHOOD.get("khoood-user-" + id);
    if (pres && pres.peer) {
      window._peers = window._peers || {};
      window._peers[id] = pres.peer;
      document.getElementById("youSeen").textContent = Date.now() - (pres.at || 0) < 20000 ? "ظاهر دلوقت" : "آخر ظهور محفوظ";
      if (peer) {
        const c = peer.connect(pres.peer, { reliable: true });
        c.on("open", function () { conns[id] = c; hook(c, id); });
      }
    } else document.getElementById("youSeen").textContent = "مش ظاهر دلوقت. الرسالة هتوصله لما يفتح";
  }

  function hook(c, id) {
    c.on("data", function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      const from = msg.u || id;
      if (!hist[from]) hist[from] = [];
      if (msg.t === "c") { hist[from].push({ u: from, t: msg.m, at: Date.now() }); notify(KHOOD.cname(from), msg.m); }
      if (msg.t === "inv") { hist[from].push({ k: "inv", u: from, room: msg.room, at: Date.now() }); notify(KHOOD.cname(from), "دعوة لعب"); }
      KHOOD.localSet(KHOOD.CHAT_KEY, hist);
      if (withId === from) paintLog();
    });
  }

  async function goLive() {
    if (!window.Peer) { stat("محتاج نت"); return; }
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = new window.Peer();
    peer.on("open", async function (id) {
      await KHOOD.put("khoood-user-" + me, { peer: id, at: Date.now() });
      stat("ظاهر كـ " + KHOOD.cname(me));
      drain();
    });
    peer.on("connection", function (c) { hook(c); });
    peer.on("call", async function (cl) {
      media = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!(cl.metadata && cl.metadata.video) });
      cl.answer(media);
      showCall(cl);
    });
    peer.on("error", function () { stat("الاتصال وقع. دوس اللعبة وارجع"); });
    setInterval(function () {
      if (me && peer && peer.id) KHOOD.put("khoood-user-" + me, { peer: peer.id, at: Date.now() });
      drain();
    }, 8000);
  }

  function showCall(cl) {
    call = cl;
    document.getElementById("callScreen").classList.add("on");
    document.getElementById("vidMe").srcObject = media;
    cl.on("stream", function (s) { document.getElementById("vidYou").srcObject = s; });
    cl.on("close", hang);
  }
  function hang() {
    try { if (call) call.close(); } catch (e) {}
    try { if (media) media.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    document.getElementById("callScreen").classList.remove("on");
  }

  document.getElementById("loginBtn").onclick = function () {
    const pass = document.getElementById("passIn").value;
    if (!me) { err("اختار شخصية"); return; }
    if (!KHOOD.checkPass(me, pass)) { err("كلمة السر غلط"); return; }
    if (auth && auth.id && auth.id !== me) { err("الجهاز ده مقفول على " + KHOOD.cname(auth.id)); return; }
    KHOOD.authSet({ id: me, at: Date.now() });
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("meFace").src = KHOOD.face(me);
    document.getElementById("meName").textContent = KHOOD.cname(me);
    people();
    askNotify();
    goLive();
  };
  document.getElementById("outBtn").onclick = function () { location.href = "./index.html"; };
  document.getElementById("sendForm").onsubmit = async function (e) {
    e.preventDefault();
    const text = document.getElementById("msgIn").value.trim();
    if (!text || !withId) return;
    document.getElementById("msgIn").value = "";
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push({ u: me, t: text, at: Date.now() });
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    paintLog();
    const payload = { t: "c", u: me, m: text, at: Date.now() };
    sendRaw(withId, payload);
    await dropMail(withId, payload);
  };
  document.getElementById("callBtn").onclick = async function () {
    if (!withId || !peer) return;
    await ping(withId);
    media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const cl = peer.call(window._peers[withId], media, { metadata: { video: false } });
    showCall(cl);
  };
  document.getElementById("vidBtn").onclick = async function () {
    if (!withId || !peer) return;
    await ping(withId);
    media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const cl = peer.call(window._peers[withId], media, { metadata: { video: true } });
    showCall(cl);
  };
  document.getElementById("hangBtn").onclick = hang;
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

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { scope: "./" });
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  document.getElementById("instBtn").onclick = async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(ios ? "من Safari: المشاركة ثم Add to Home Screen" : "من كروم: القائمة ثم إضافة إلى الشاشة الرئيسية");
  };

  paintWho();
  if (auth && auth.id) {
    me = auth.id;
    document.getElementById("passIn").placeholder = "كلمة سر " + KHOOD.cname(me);
  }
})();
