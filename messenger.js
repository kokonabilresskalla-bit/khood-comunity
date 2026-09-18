(function () {
  if (!window.KHOOD) {
    document.body.innerHTML = "<p style='padding:20px;color:#fff;font-family:sans-serif'>الملفات ناقصة. ارفع data.js و store.js مع المسنجر.</p>";
    return;
  }

  const ICE = { config: { iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ] } };
  const GROUPS = [{ id: "#all", name: "الشلة", members: ["fady", "wageeh", "koko", "tony", "sisi"] }];
  const auth = KHOOD.authGet && KHOOD.authGet();
  let me = auth && auth.id;
  let peer = null, withId = null, hist = KHOOD.localGet(KHOOD.CHAT_KEY, {}) || {};
  if (!hist || typeof hist !== "object") hist = {};
  let conns = {}, media = null, call = null, muted = false;
  let incoming = null, rec = null, chunks = [], typingT = 0, presence = {}, faceCam = "user", remotes = {};
  window._peers = window._peers || {};

  function el(id) { return document.getElementById(id); }
  function err(t) { if (el("loginErr")) el("loginErr").textContent = t || ""; }
  function stat(t) { if (el("stat")) el("stat").textContent = t || ""; }
  function isGroup(id) { return !!(id && String(id).charAt(0) === "#"); }
  function membersOf(id) {
    if (!isGroup(id)) return id ? [id] : [];
    const g = GROUPS.find(function (x) { return x.id === id; });
    return ((g && g.members) || []).filter(function (x) { return x !== me; });
  }
  function groupName(id) {
    const g = GROUPS.find(function (x) { return x.id === id; });
    return g ? g.name : id;
  }
  function notify(title, body) {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "notify", title: title, body: body || "", tag: "khood" });
      } else if (window.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body || "", icon: "./icon-192.png" });
      }
    } catch (e) {}
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
    if (mins < 60) return "آخر ظهور من " + Math.max(1, mins) + " د";
    return "آخر ظهور " + new Date(p.at).toLocaleString();
  }

  function paintWho() {
    const box = el("whoGrid");
    if (!box) return;
    box.innerHTML = "";
    KHOOD.CHARS.forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "p-1 rounded-xl border " + (me === c.id ? "border-cyan-400" : "border-transparent");
      b.innerHTML = "<img src='" + c.img + "' class='w-full aspect-square rounded-lg object-cover'><small class='text-[10px]'>" + c.name + "</small>";
      b.onclick = function () { if (auth && auth.id) return; me = c.id; paintWho(); };
      box.appendChild(b);
    });
  }
  function people() {
    const box = el("people");
    if (!box) return;
    box.innerHTML = "";
    KHOOD.CHARS.filter(function (c) { return c.id !== me; }).forEach(function (c) {
      const on = onlineOf(c.id);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
      row.innerHTML = "<span class='relative'><img src='" + c.img + "' class='w-12 h-12 rounded-full object-cover'><span class='absolute bottom-0 left-0 w-3 h-3 rounded-full " + (on ? "bg-green-400" : "bg-gray-500") + "'></span></span><div><b class='block'>" + c.name + "</b><small class='text-gray-400'>" + seenText(c.id) + "</small></div>";
      row.onclick = function () { openThread(c.id); };
      box.appendChild(row);
    });
    GROUPS.forEach(function (g) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
      row.innerHTML = "<span class='w-12 h-12 rounded-full bg-pink-800 flex items-center justify-center'>#</span><div><b class='block'>" + g.name + "</b><small class='text-gray-400'>جروب " + g.members.length + "</small></div>";
      row.onclick = function () { openThread(g.id); };
      box.appendChild(row);
    });
  }
  function ticks(m) {
    if (!m || m.u !== me) return "";
    return m.seen ? " ✓✓" : " ✓";
  }
  function threadList() {
    let list = (hist[withId] || []).slice();
    if (isGroup(withId)) {
      membersOf(withId).concat([me]).forEach(function (u) { list = list.concat(hist[u] || []); });
      const seen = {};
      list = list.filter(function (m) {
        const k = String(m.u || "") + ":" + String(m.at || m.t || m.a || "");
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    }
    return list;
  }
  function paintLog() {
    const log = el("log");
    if (!log) return;
    log.innerHTML = threadList().map(function (m) {
      const mine = m.u === me;
      const side = (mine ? "bubble-me mr-auto" : "bubble-them ml-auto") + " max-w-[80%] rounded-2xl p-2 text-sm";
      if (m.k === "inv") return "<div class='" + side + "'>دعوة لعب " + m.room + " <button type='button' data-join='" + m.room + "'>انضم</button></div>";
      if (m.a) return "<div class='" + side + "'><audio controls src='" + m.a + "'></audio><small>" + ticks(m) + "</small></div>";
      return "<div class='" + side + "'>" + String(m.t || "").replace(/[<>]/g, "") + "<small class='block opacity-70'>" + ticks(m) + "</small></div>";
    }).join("");
    log.querySelectorAll("[data-join]").forEach(function (b) {
      b.onclick = function () { location.href = "./index.html?room=" + b.getAttribute("data-join"); };
    });
    log.scrollTop = log.scrollHeight;
  }
  function showThread(on) {
    const side = el("sideList");
    const main = el("chatMain");
    if (main) {
      main.classList.toggle("hidden", !on);
      main.style.display = on ? "flex" : "";
    }
    if (side && window.innerWidth < 768) side.style.display = on ? "none" : "flex";
  }
  function openThread(id) {
    withId = id;
    const group = isGroup(id);
    if (el("youFace")) el("youFace").src = group ? "./icon-192.png" : KHOOD.face(id);
    if (el("youName")) el("youName").textContent = group ? groupName(id) : KHOOD.cname(id);
    if (el("youSeen")) el("youSeen").textContent = group ? (membersOf(id).length + " أعضاء") : seenText(id);
    showThread(true);
    paintLog();
    membersOf(id).forEach(function (u) {
      ping(u);
      sendRaw(u, { t: "read", u: me, at: Date.now() });
    });
  }

  async function boxKey(id) { return "khoood-mbox-v1-" + id; }
  async function dropMail(to, payload) {
    try {
      const key = await boxKey(to);
      const cur = (await KHOOD.get(key)) || { msgs: [] };
      cur.msgs = (cur.msgs || []).concat([{ payload: payload, at: Date.now() }]).slice(-50);
      await KHOOD.put(key, cur);
    } catch (e) {}
  }
  async function drain() {
    if (!me) return;
    try {
      const cur = (await KHOOD.get(await boxKey(me))) || { msgs: [] };
      let n = 0;
      (cur.msgs || []).forEach(function (item) {
        const msg = item.payload || item;
        if (!msg || !msg.u) return;
        const tid = msg.u;
        if (!hist[tid]) hist[tid] = [];
        const exists = hist[tid].some(function (m) { return m.at && msg.at && m.at === msg.at; });
        if (exists) return;
        if (msg.t === "c") hist[tid].push({ u: msg.u, t: msg.m, at: msg.at || Date.now() });
        else if (msg.t === "inv") hist[tid].push({ k: "inv", u: msg.u, room: msg.room, at: msg.at || Date.now() });
        else if (msg.t === "voice" || msg.a) hist[tid].push({ u: msg.u, a: msg.a, at: msg.at || Date.now() });
        else return;
        n += 1;
        notify(KHOOD.cname(tid), msg.m || "رسالة جديدة");
      });
      if ((cur.msgs || []).length) await KHOOD.put(await boxKey(me), { msgs: [] });
      if (n) { KHOOD.localSet(KHOOD.CHAT_KEY, hist); if (withId) paintLog(); people(); }
    } catch (e) {}
  }

  function sendRaw(id, obj) {
    if (!id || isGroup(id)) return;
    const raw = JSON.stringify(obj);
    const have = conns[id];
    if (have && have.open) { try { have.send(raw); return true; } catch (e) {} }
    const pid = window._peers[id];
    if (!peer || !pid) return false;
    try {
      const c = peer.connect(pid, { reliable: true });
      c.on("open", function () { conns[id] = c; hook(c, id); try { c.send(raw); } catch (e) {} });
    } catch (e) {}
    return false;
  }
  function fanout(obj) {
    membersOf(withId).forEach(function (u) {
      sendRaw(u, obj);
      dropMail(u, obj);
    });
  }
  async function ping(id) {
    if (!id || isGroup(id)) return;
    try {
      const pres = await KHOOD.get("khoood-user-" + id);
      if (pres && pres.peer) {
        window._peers[id] = pres.peer;
        presence[id] = pres;
        if (withId === id && el("youSeen")) el("youSeen").textContent = seenText(id);
        if (peer && (!conns[id] || !conns[id].open)) {
          const c = peer.connect(pres.peer, { reliable: true });
          c.on("open", function () { conns[id] = c; hook(c, id); });
        }
      }
    } catch (e) {}
  }
  function hook(c, id) {
    c.on("data", function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      const from = msg.u || id;
      if (msg.t === "typing") {
        if (withId === from || isGroup(withId)) {
          if (el("youType")) el("youType").textContent = "جاري الكتابة...";
          clearTimeout(typingT);
          typingT = setTimeout(function () { if (el("youType")) el("youType").textContent = ""; }, 1500);
        }
        return;
      }
      if (msg.t === "read") {
        (hist[from] || []).forEach(function (m) { if (m.u === me) m.seen = true; });
        KHOOD.localSet(KHOOD.CHAT_KEY, hist);
        if (withId) paintLog();
        return;
      }
      if (msg.t === "ring") { notify("مكالمة", KHOOD.cname(from)); return; }
      if (!hist[from]) hist[from] = [];
      if (msg.t === "c") { hist[from].push({ u: from, t: msg.m, at: Date.now() }); notify(KHOOD.cname(from), msg.m); }
      if (msg.t === "inv") { hist[from].push({ k: "inv", u: from, room: msg.room, at: Date.now() }); notify(KHOOD.cname(from), "دعوة لعب"); }
      if (msg.t === "voice") { hist[from].push({ u: from, a: msg.a, at: Date.now() }); notify(KHOOD.cname(from), "رسالة صوتية"); }
      KHOOD.localSet(KHOOD.CHAT_KEY, hist);
      if (withId === from || isGroup(withId)) paintLog();
    });
  }

  let ringT = 0, videoCall = false;
  function callStat(t) { if (el("callStat")) el("callStat").textContent = t || ""; }
  function hideIncoming() {
    clearTimeout(ringT);
    const box = el("inCall");
    if (!box) return;
    box.classList.add("hidden");
    box.style.display = "none";
  }
  function showIncoming(cl) {
    incoming = cl;
    const from = (cl.metadata && cl.metadata.from) || "حد";
    if (el("inFace")) el("inFace").src = KHOOD.face(from);
    if (el("inName")) el("inName").textContent = "مكالمة من " + KHOOD.cname(from);
    const box = el("inCall");
    box.classList.remove("hidden");
    box.style.display = "flex";
    notify("مكالمة", KHOOD.cname(from));
    clearTimeout(ringT);
    ringT = setTimeout(rejectCall, 30000);
  }
  async function acceptCall() {
    if (!incoming) return;
    const cl = incoming;
    incoming = null;
    hideIncoming();
    try {
      videoCall = !!(cl.metadata && cl.metadata.video);
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: videoCall ? { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } } : false
      });
      cl.answer(media);
      showCall(cl, cl.metadata && cl.metadata.from);
    } catch (e) { stat("اسمح بالمايك/الكاميرا"); hang(); }
  }
  function rejectCall() {
    try { if (incoming) incoming.close(); } catch (e) {}
    incoming = null;
    hideIncoming();
  }
  function attachRemote(s, pid) {
    const box = el("tiles");
    if (!box) return;
    let v = remotes[pid];
    if (!v) {
      v = document.createElement("video");
      v.autoplay = true;
      v.playsInline = true;
      v.className = "w-[46vw] max-w-[280px] h-[34vh] max-h-[320px] object-cover rounded-2xl bg-black";
      box.appendChild(v);
      remotes[pid] = v;
    }
    v.srcObject = s;
    v.muted = false;
    v.volume = 1;
    try { v.play(); } catch (e) {}
    const hasVid = s.getVideoTracks && s.getVideoTracks().length;
    if (el("voicePad")) el("voicePad").style.display = hasVid ? "none" : "flex";
    callStat("متصل");
  }
  function showCall(cl, who) {
    call = cl;
    el("callScreen").classList.add("on");
    if (el("voiceFace")) el("voiceFace").src = KHOOD.face(who || withId);
    if (el("voiceWho")) el("voiceWho").textContent = KHOOD.cname(who || withId || "مكالمة");
    if (el("voicePad")) el("voicePad").style.display = videoCall ? "none" : "flex";
    if (el("vidMe")) { el("vidMe").srcObject = media; try { el("vidMe").play(); } catch (e) {} }
    callStat("جاري الاتصال...");
    if (cl && typeof cl.on === "function") {
      cl.on("stream", function (s) { attachRemote(s, cl.peer || "p"); });
      cl.on("close", hang);
    }
  }
  function hang() {
    hideIncoming();
    incoming = null;
    try { if (call && call.close) call.close(); } catch (e) {}
    try { if (media) media.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    call = null; media = null; muted = false; videoCall = false;
    if (el("vidMe")) el("vidMe").srcObject = null;
    if (el("callScreen")) el("callScreen").classList.remove("on");
    if (el("tiles")) el("tiles").innerHTML = "";
    remotes = {};
    callStat("");
  }
  async function startCall(video) {
    if (!withId || !peer) { stat("استنى الاتصال"); return; }
    const targets = membersOf(withId);
    for (let i = 0; i < targets.length; i++) await ping(targets[i]);
    const live = targets.filter(function (u) { return window._peers[u]; });
    if (!live.length) { stat("مفيش حد ظاهر"); return; }
    try {
      videoCall = !!video;
      faceCam = "user";
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video ? { facingMode: faceCam, width: { ideal: 720 }, height: { ideal: 720 } } : false
      });
      showCall({ on: function () {} }, live[0]);
      live.forEach(function (u) {
        const cl = peer.call(window._peers[u], media, { metadata: { video: !!video, from: me } });
        cl.on("stream", function (s) { attachRemote(s, cl.peer || u); });
        sendRaw(u, { t: "ring", u: me, video: !!video });
      });
    } catch (e) { stat("اسمح بالمايك/الكاميرا"); }
  }
  async function flipCam() {
    if (!media || !videoCall) return;
    faceCam = faceCam === "user" ? "environment" : "user";
    try {
      const nxt = await navigator.mediaDevices.getUserMedia({ video: { facingMode: faceCam } });
      const track = nxt.getVideoTracks()[0];
      media.getVideoTracks().forEach(function (t) { media.removeTrack(t); t.stop(); });
      media.addTrack(track);
      if (el("vidMe")) el("vidMe").srcObject = media;
    } catch (e) { callStat("الكاميرا التانية مش متاحة"); }
  }

  async function goLive() {
    if (!window.Peer) { stat("محتاج نت"); return; }
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = new window.Peer(undefined, ICE);
    peer.on("open", async function (id) {
      try { await KHOOD.put("khoood-user-" + me, { peer: id, at: Date.now() }); } catch (e) {}
      stat("متصل كـ " + KHOOD.cname(me));
      drain();
    });
    peer.on("connection", function (c) { hook(c); });
    peer.on("call", function (cl) { showIncoming(cl); });
    peer.on("error", function () { stat("هحاول أوصل تاني"); setTimeout(goLive, 3000); });
    setInterval(function () {
      if (me && peer && peer.id) KHOOD.put("khoood-user-" + me, { peer: peer.id, at: Date.now() });
      drain();
      KHOOD.CHARS.forEach(function (c) { if (c.id !== me) ping(c.id); });
      people();
    }, 8000);
  }
  function enterApp() {
    if (el("loginModal")) el("loginModal").style.display = "none";
    if (el("meFace")) el("meFace").src = KHOOD.face(me);
    if (el("meName")) el("meName").textContent = KHOOD.cname(me);
    people();
    try { Notification.requestPermission(); } catch (e) {}
    goLive();
  }

  if (el("loginBtn")) el("loginBtn").onclick = function () {
    const pass = el("passIn") ? el("passIn").value : "";
    if (!me) { err("اختار شخصية"); return; }
    if (auth && auth.id && auth.id !== me) { err("الجهاز مقفول على " + KHOOD.cname(auth.id)); return; }
    if (!KHOOD.checkPass(me, pass)) { err("كلمة السر غلط"); return; }
    KHOOD.authSet({ id: me, at: Date.now() });
    enterApp();
  };
  if (el("outBtn")) el("outBtn").onclick = function () { location.href = "./index.html"; };
  if (el("threadBack")) el("threadBack").onclick = function () { showThread(false); };
  if (el("sendForm")) el("sendForm").onsubmit = function (e) {
    e.preventDefault();
    const text = (el("msgIn") && el("msgIn").value || "").trim();
    if (!text || !withId) return;
    el("msgIn").value = "";
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push({ u: me, t: text, at: Date.now() });
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    paintLog();
    fanout({ t: "c", u: me, m: text, at: Date.now() });
  };
  if (el("msgIn")) el("msgIn").addEventListener("input", function () {
    if (withId) membersOf(withId).forEach(function (u) { sendRaw(u, { t: "typing", u: me }); });
  });
  if (el("callBtn")) el("callBtn").onclick = function () { startCall(false); };
  if (el("vidBtn")) el("vidBtn").onclick = function () { startCall(true); };
  if (el("hangBtn")) el("hangBtn").onclick = hang;
  if (el("accBtn")) el("accBtn").onclick = acceptCall;
  if (el("rejBtn")) el("rejBtn").onclick = rejectCall;
  if (el("camBtn")) el("camBtn").onclick = flipCam;
  if (el("grpBtn")) el("grpBtn").onclick = function () { openThread("#all"); };
  if (el("muteBtn")) el("muteBtn").onclick = function () {
    muted = !muted;
    if (media) media.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    el("muteBtn").textContent = muted ? "افتح" : "كتم";
  };
  if (el("spkBtn")) el("spkBtn").onclick = function () {
    Object.keys(remotes).forEach(function (k) { remotes[k].muted = !remotes[k].muted; });
  };
  if (el("invBtn")) el("invBtn").onclick = function () {
    if (!withId) return;
    const room = "K" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const payload = { t: "inv", u: me, room: room, k: "inv", at: Date.now() };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(payload);
    KHOOD.localSet(KHOOD.CHAT_KEY, hist);
    paintLog();
    fanout(payload);
    location.href = "./index.html?room=" + room + "&host=1";
  };
  if (el("recBtn")) el("recBtn").onclick = async function () {
    if (!withId) return;
    if (rec && rec.state === "recording") { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = function () {
          if (!hist[withId]) hist[withId] = [];
          hist[withId].push({ u: me, a: reader.result, at: Date.now() });
          KHOOD.localSet(KHOOD.CHAT_KEY, hist);
          paintLog();
          fanout({ t: "voice", u: me, a: reader.result, at: Date.now() });
        };
        reader.readAsDataURL(blob);
        el("recBtn").textContent = "🎤";
      };
      rec.start();
      el("recBtn").textContent = "⏹";
    } catch (e) { stat("اسمح بالمايك"); }
  };
  if (el("instBtn")) el("instBtn").onclick = function () {
    alert("من كروم: القائمة ثم إضافة إلى الشاشة الرئيسية");
  };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {});

  paintWho();
  if (auth && auth.id) enterApp();
})();
