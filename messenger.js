(function () {
  if (!window.KHOOD) {
    document.body.innerHTML = "<p style='padding:24px;color:#fff'>ارفع data.js و store.js مع المسنجر.</p>";
    return;
  }

  const ICE = {
    debug: 0,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    }
  };
  const GROUPS = [{ id: "#all", name: "الشلة", members: ["fady", "wageeh", "koko", "tony", "sisi"] }];
  const auth = KHOOD.authGet && KHOOD.authGet();
  let me = auth && auth.id;
  let peer = null, withId = null;
  let hist = KHOOD.localGet(KHOOD.CHAT_KEY, {}) || {};
  if (!hist || typeof hist !== "object") hist = {};
  let conns = {}, media = null, call = null, incoming = null;
  let rec = null, chunks = [], typingT = 0, muted = false, videoCall = false, faceCam = "user";
  let remotes = {}, ringT = 0, outbox = [];

  function uid(id) { return "khoodc" + String(id || "").replace(/[^a-z0-9]/g, ""); }
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
  function save() { try { KHOOD.localSet(KHOOD.CHAT_KEY, hist); } catch (e) {} }
  function notify(title, body) {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "notify", title: title, body: body || "" });
      } else if (window.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body || "", icon: "./icon-192.png" });
      }
    } catch (e) {}
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
      const on = !!(conns[c.id] && conns[c.id].open);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
      row.innerHTML = "<span class='relative'><img src='" + c.img + "' class='w-12 h-12 rounded-full object-cover'><span class='absolute bottom-0 left-0 w-3 h-3 rounded-full " + (on ? "bg-green-400" : "bg-gray-500") + "'></span></span><div><b class='block'>" + c.name + "</b><small class='text-gray-400'>" + (on ? "متصل" : "اضغط عشان تفتح") + "</small></div>";
      row.onclick = function () { openThread(c.id); };
      box.appendChild(row);
    });
    GROUPS.forEach(function (g) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
      row.innerHTML = "<span class='w-12 h-12 rounded-full bg-pink-800 flex items-center justify-center'>#</span><div><b class='block'>" + g.name + "</b><small class='text-gray-400'>جروب</small></div>";
      row.onclick = function () { openThread(g.id); };
      box.appendChild(row);
    });
  }
  function ticks(m) { return m && m.u === me ? (m.seen ? " ✓✓" : " ✓") : ""; }
  function threadList() {
    let list = (hist[withId] || []).slice();
    if (isGroup(withId)) {
      membersOf(withId).concat([me]).forEach(function (u) { list = list.concat(hist[u] || []); });
      const seen = {};
      list = list.filter(function (m) {
        const k = String(m.u || "") + ":" + String(m.at || m.t || "");
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
      if (m.a) return "<div class='" + side + "'><audio controls src='" + m.a + "'></audio></div>";
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
    if (el("youSeen")) el("youSeen").textContent = group ? "جروب الشلة" : ((conns[id] && conns[id].open) ? "متصل" : "بيحاول يتصل");
    showThread(true);
    paintLog();
    membersOf(id).forEach(function (u) { link(u); sendRaw(u, { t: "read", u: me }); });
  }

  function hook(c, id) {
    if (!c) return;
    if (id) conns[id] = c;
    c.on("data", function (raw) {
      let msg = raw;
      try { if (typeof raw === "string") msg = JSON.parse(raw); } catch (e) { return; }
      const from = msg.u || id;
      if (msg.t === "typing") {
        if (el("youType")) el("youType").textContent = "جاري الكتابة...";
        clearTimeout(typingT);
        typingT = setTimeout(function () { if (el("youType")) el("youType").textContent = ""; }, 1200);
        return;
      }
      if (msg.t === "read") {
        Object.keys(hist).forEach(function (k) {
          (hist[k] || []).forEach(function (m) { if (m.u === me) m.seen = true; });
        });
        save();
        paintLog();
        return;
      }
      if (!hist[from]) hist[from] = [];
      if (msg.t === "c") { hist[from].push({ u: from, t: msg.m, at: Date.now() }); notify(KHOOD.cname(from), msg.m); }
      if (msg.t === "inv") { hist[from].push({ k: "inv", u: from, room: msg.room, at: Date.now() }); notify(KHOOD.cname(from), "دعوة لعب"); }
      if (msg.t === "voice") { hist[from].push({ u: from, a: msg.a, at: Date.now() }); notify(KHOOD.cname(from), "رسالة صوتية"); }
      save();
      if (withId === from || isGroup(withId)) paintLog();
      people();
    });
    c.on("close", function () { if (id && conns[id] === c) delete conns[id]; people(); });
  }
  function link(id) {
    if (!peer || !id || isGroup(id) || id === me) return;
    if (conns[id] && conns[id].open) return;
    try {
      const c = peer.connect(uid(id), { reliable: true });
      c.on("open", function () { hook(c, id); flush(); people(); if (withId === id && el("youSeen")) el("youSeen").textContent = "متصل"; });
    } catch (e) {}
  }
  function sendRaw(id, obj) {
    if (!id || isGroup(id)) return false;
    const raw = JSON.stringify(obj);
    if (conns[id] && conns[id].open) {
      try { conns[id].send(raw); return true; } catch (e) {}
    }
    outbox.push({ id: id, raw: raw, at: Date.now() });
    link(id);
    return false;
  }
  function flush() {
    outbox = outbox.filter(function (item) {
      if (conns[item.id] && conns[item.id].open) {
        try { conns[item.id].send(item.raw); return false; } catch (e) { return true; }
      }
      if (Date.now() - item.at > 120000) return false;
      link(item.id);
      return true;
    });
  }
  function fanout(obj) {
    membersOf(withId).forEach(function (u) {
      sendRaw(u, obj);
      if (obj.t !== "voice" && KHOOD.mailPush) KHOOD.mailPush(u, obj);
    });
  }
  async function pullInbox() {
    if (!me || !KHOOD.mailPull) return;
    try {
      const items = await KHOOD.mailPull(me);
      (items || []).forEach(function (item) {
        const msg = item.payload || item;
        if (!msg || !msg.u) return;
        const from = msg.u;
        if (!hist[from]) hist[from] = [];
        const exists = hist[from].some(function (m) { return m.at && msg.at && m.at === msg.at; });
        if (exists) return;
        if (msg.t === "c") hist[from].push({ u: from, t: msg.m, at: msg.at || Date.now() });
        else if (msg.t === "inv") hist[from].push({ k: "inv", u: from, room: msg.room, at: msg.at || Date.now() });
        else return;
        notify(KHOOD.cname(from), msg.m || "رسالة");
      });
      if (items && items.length) { save(); paintLog(); people(); }
    } catch (e) {}
  }

  function hideIncoming() {
    clearTimeout(ringT);
    const box = el("inCall");
    if (box) { box.classList.add("hidden"); box.style.display = "none"; }
  }
  function showIncoming(cl) {
    incoming = cl;
    const from = (cl.metadata && cl.metadata.from) || "حد";
    if (el("inFace")) el("inFace").src = KHOOD.face(from);
    if (el("inName")) el("inName").textContent = "مكالمة من " + KHOOD.cname(from);
    const box = el("inCall");
    if (box) { box.classList.remove("hidden"); box.style.display = "flex"; }
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
    if (el("voicePad")) el("voicePad").style.display = (s.getVideoTracks && s.getVideoTracks().length) ? "none" : "flex";
    if (el("callStat")) el("callStat").textContent = "متصل";
  }
  function showCall(cl, who) {
    call = cl;
    el("callScreen").classList.add("on");
    if (el("voiceFace")) el("voiceFace").src = KHOOD.face(who || withId);
    if (el("voiceWho")) el("voiceWho").textContent = KHOOD.cname(who || withId || "مكالمة");
    if (el("voicePad")) el("voicePad").style.display = videoCall ? "none" : "flex";
    if (el("vidMe") && media) { el("vidMe").srcObject = media; try { el("vidMe").play(); } catch (e) {} }
    if (el("callStat")) el("callStat").textContent = "جاري الاتصال...";
    if (cl && cl.on) {
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
  }
  async function startCall(video) {
    if (!withId || !peer) { stat("استنى ثانية يتوصل"); return; }
    const targets = membersOf(withId);
    targets.forEach(link);
    if (!targets.length) return;
    try {
      videoCall = !!video;
      faceCam = "user";
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video ? { facingMode: faceCam, width: { ideal: 720 }, height: { ideal: 720 } } : false
      });
      showCall({ on: function () {} }, targets[0]);
      targets.forEach(function (u) {
        const cl = peer.call(uid(u), media, { metadata: { video: !!video, from: me } });
        cl.on("stream", function (s) { attachRemote(s, cl.peer || u); });
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
    } catch (e) { if (el("callStat")) el("callStat").textContent = "الكاميرا التانية مش متاحة"; }
  }

  function goLive() {
    if (!window.Peer) { stat("محتاج نت"); return; }
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = new window.Peer(uid(me), ICE);
    peer.on("open", function () {
      stat("متصل كـ " + KHOOD.cname(me));
      KHOOD.CHARS.forEach(function (c) { if (c.id !== me) link(c.id); });
      people();
    });
    peer.on("connection", function (c) {
      const from = KHOOD.CHARS.find(function (x) { return uid(x.id) === c.peer; });
      hook(c, from ? from.id : c.peer);
      people();
    });
    peer.on("call", showIncoming);
    peer.on("error", function (e) {
      const msg = String(e && e.type || e || "");
      if (msg === "unavailable-id") stat("الشخصية دي مفتوحة على جهاز تاني");
      else { stat("هحاول أوصل تاني"); setTimeout(goLive, 2500); }
    });
    pullInbox();
    setInterval(function () {
      flush();
      pullInbox();
      if (peer && peer.open) KHOOD.CHARS.forEach(function (c) { if (c.id !== me) link(c.id); });
    }, 4000);
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
    save();
    paintLog();
    fanout({ t: "c", u: me, m: text, at: Date.now() });
  };
  if (el("msgIn")) el("msgIn").addEventListener("input", function () {
    membersOf(withId).forEach(function (u) { sendRaw(u, { t: "typing", u: me }); });
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
  if (el("invBtn")) el("invBtn").onclick = function () {
    if (!withId) return;
    const room = "K" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const payload = { t: "inv", u: me, room: room, k: "inv", at: Date.now() };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(payload);
    save();
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
      rec.ondataavailable = function (ev) { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = function () {
          if (!hist[withId]) hist[withId] = [];
          hist[withId].push({ u: me, a: reader.result, at: Date.now() });
          save();
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
