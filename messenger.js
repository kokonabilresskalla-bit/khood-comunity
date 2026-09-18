(function () {
  if (!window.KHOOD) {
    document.body.innerHTML = "<p style='padding:24px;color:#fff'>ارفع data.js و store.js</p>";
    return;
  }

  const GROUPS = [{ id: "#all", name: "الشلة", members: ["fady", "wageeh", "koko", "tony", "sisi"] }];
  const auth = KHOOD.authGet && KHOOD.authGet();
  let me = auth && auth.id;
  let peer = null, withId = null, hist = KHOOD.localGet(KHOOD.CHAT_KEY, {}) || {};
  if (!hist || typeof hist !== "object") hist = {};
  let media = null, call = null, incoming = null, rec = null, chunks = [];
  let muted = false, videoCall = false, faceCam = "user", remotes = {}, ringT = 0, typingT = 0;
  let presence = {}, pulling = false, seenIds = {};
  function msgKey(m) {
    return String((m && m.id) || ((m && m.u) + ":" + (m && m.at) + ":" + ((m && m.t) || (m && m.a) || (m && m.room) || "")));
  }
  Object.keys(hist).forEach(function (k) {
    const out = [], used = {};
    (hist[k] || []).forEach(function (m) {
      const id = msgKey(m);
      if (!id || used[id]) return;
      used[id] = 1;
      seenIds[id] = 1;
      out.push(m);
    });
    hist[k] = out;
  });
  try { KHOOD.localSet(KHOOD.CHAT_KEY, hist); } catch (e) {}

  function el(id) { return document.getElementById(id); }
  function err(t) { if (el("loginErr")) el("loginErr").textContent = t || ""; }
  function stat(t) { if (el("stat")) el("stat").textContent = t || ""; }
  function isGroup(id) { return !!(id && String(id).charAt(0) === "#"); }
  function membersOf(id) {
    if (!isGroup(id)) return id ? [id] : [];
    return GROUPS[0].members.filter(function (x) { return x !== me; });
  }
  function save() { try { KHOOD.localSet(KHOOD.CHAT_KEY, hist); } catch (e) {} }
  function mid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }
  function notify(title, body) {
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body || "", icon: "./icon-192.png" });
      }
    } catch (e) {}
  }
  function pathFor(id) {
    if (isGroup(id)) return KHOOD.groupPath();
    return KHOOD.threadPath(me, id);
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
  function lastSeen(id) {
    const p = presence[id];
    if (!p || !p.at) return "آخر ظهور مش معروف";
    if (Date.now() - p.at < 20000) return "متصل";
    const mins = Math.floor((Date.now() - p.at) / 60000);
    if (mins < 1) return "آخر ظهور دلوقتي";
    if (mins < 60) return "آخر ظهور من " + mins + " د";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return "آخر ظهور من " + hrs + " س";
    return "آخر ظهور " + new Date(p.at).toLocaleString();
  }
  function ticks(m) {
    if (!m || m.u !== me) return "";
    const got = Object.keys(m.got || {});
    const read = Object.keys(m.read || {});
    if (read.length) return "اتقريت ✓✓";
    if (got.length) return "اتوصلت ✓✓";
    return "اتبعتت ✓";
  }
  function people() {
    const box = el("people");
    if (!box) return;
    box.innerHTML = "";
    KHOOD.CHARS.filter(function (c) { return c.id !== me; }).forEach(function (c) {
      const on = presence[c.id] && Date.now() - (presence[c.id].at || 0) < 20000;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
      row.innerHTML = "<span class='relative'><img src='" + c.img + "' class='w-12 h-12 rounded-full object-cover'><span class='absolute bottom-0 left-0 w-3 h-3 rounded-full " + (on ? "bg-green-400" : "bg-gray-500") + "'></span></span><div><b class='block'>" + c.name + "</b><small class='text-gray-400'>" + lastSeen(c.id) + "</small></div>";
      row.onclick = function () { openThread(c.id); };
      box.appendChild(row);
    });
    const g = document.createElement("button");
    g.type = "button";
    g.className = "w-full flex items-center gap-3 p-2 rounded-xl text-right";
    g.innerHTML = "<span class='w-12 h-12 rounded-full bg-pink-800 flex items-center justify-center'>#</span><div><b class='block'>الشلة</b><small class='text-gray-400'>جروب</small></div>";
    g.onclick = function () { openThread("#all"); };
    box.appendChild(g);
  }
  function threadList() {
    const used = {};
    return (hist[withId] || []).filter(function (m) {
      const id = msgKey(m);
      if (!id || used[id]) return false;
      used[id] = 1;
      return true;
    }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  }
  function paintLog() {
    const log = el("log");
    if (!log) return;
    log.innerHTML = threadList().map(function (m) {
      const mine = m.u === me;
      const side = (mine ? "bubble-me mr-auto" : "bubble-them ml-auto") + " max-w-[80%] rounded-2xl p-2 text-sm";
      const acts = mine && !m.del ? "<div class='text-[10px] mt-1'><button type='button' data-ed='" + m.id + "'>تعديل</button> · <button type='button' data-del='" + m.id + "'>حذف</button></div>" : "";
      const mark = mine ? "<small class='block opacity-70'>" + ticks(m) + (m.edited ? " · اتعدلت" : "") + "</small>" : "";
      if (m.del) return "<div class='" + side + " opacity-60'>الرسالة اتمسحت</div>";
      if (m.k === "inv") return "<div class='" + side + "'>دعوة لعب " + m.room + " <button type='button' data-join='" + m.room + "'>انضم</button>" + mark + "</div>";
      if (m.a) return "<div class='" + side + "'><audio controls src='" + m.a + "'></audio>" + mark + acts + "</div>";
      return "<div class='" + side + "'>" + String(m.t || "").replace(/[<>]/g, "") + mark + acts + "</div>";
    }).join("");
    log.querySelectorAll("[data-join]").forEach(function (b) {
      b.onclick = function () { location.href = "./index.html?room=" + b.getAttribute("data-join"); };
    });
    log.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { changeMsg(b.getAttribute("data-del"), { del: true, t: "" }); };
    });
    log.querySelectorAll("[data-ed]").forEach(function (b) {
      b.onclick = function () {
        const id = b.getAttribute("data-ed");
        const cur = (hist[withId] || []).find(function (x) { return x.id === id; });
        const nxt = prompt("تعديل الرسالة", cur && cur.t || "");
        if (nxt == null) return;
        changeMsg(id, { t: nxt, edited: true });
      };
    });
    log.scrollTop = log.scrollHeight;
  }
  function showThread(on) {
    const side = el("sideList"), main = el("chatMain");
    if (main) { main.classList.toggle("hidden", !on); main.style.display = on ? "flex" : ""; }
    if (side && window.innerWidth < 768) side.style.display = on ? "none" : "flex";
  }
  function openThread(id) {
    withId = id;
    const group = isGroup(id);
    if (el("youFace")) el("youFace").src = group ? "./icon-192.png" : KHOOD.face(id);
    if (el("youName")) el("youName").textContent = group ? "الشلة" : KHOOD.cname(id);
    if (el("youSeen")) el("youSeen").textContent = group ? "جروب الشلة" : lastSeen(id);
    showThread(true);
    paintLog();
    pullThread(id);
  }

  function absorb(list, key) {
    if (!hist[key]) hist[key] = [];
    let n = 0;
    (list || []).forEach(function (m) {
      const id = msgKey(m);
      if (!id) return;
      const old = hist[key].find(function (x) { return msgKey(x) === id; });
      if (old) {
        if (m.del) old.del = true;
        if (m.edited && m.t) { old.t = m.t; old.edited = true; }
        old.got = Object.assign({}, old.got || {}, m.got || {});
        old.read = Object.assign({}, old.read || {}, m.read || {});
        return;
      }
      if (seenIds[id]) return;
      seenIds[id] = 1;
      hist[key].push(m);
      n += 1;
      if (m.u && m.u !== me && !m.del) notify(KHOOD.cname(m.u), m.t || "رسالة");
    });
    if (n) { save(); if (withId === key) paintLog(); }
    else save();
  }
  async function writeAll(id, msgs) {
    const p = pathFor(id);
    const file = await KHOOD.fileGet(p);
    await KHOOD.filePut(p, { msgs: msgs.slice(-200) }, file.sha);
  }
  async function changeMsg(id, patch) {
    const list = hist[withId] || [];
    const m = list.find(function (x) { return x.id === id && x.u === me; });
    if (!m) return;
    Object.keys(patch).forEach(function (k) { m[k] = patch[k]; });
    save(); paintLog();
    await writeAll(withId, list);
  }
  async function pullThread(id) {
    if (!KHOOD.ghReady()) return;
    const file = await KHOOD.fileGet(pathFor(id));
    if (file.ok && file.data && file.data.msgs) {
      absorb(file.data.msgs, id);
      let dirty = false;
      (hist[id] || []).forEach(function (m) {
        if (m.u === me) return;
        m.got = m.got || {};
        if (!m.got[me]) { m.got[me] = Date.now(); dirty = true; }
        if (withId === id) {
          m.read = m.read || {};
          if (!m.read[me]) { m.read[me] = Date.now(); dirty = true; }
        }
      });
      if (dirty) { save(); await writeAll(id, hist[id] || []); if (withId === id) paintLog(); }
    }
  }
  async function pullAll() {
    if (pulling || !me || !KHOOD.ghReady()) return;
    pulling = true;
    try {
      const ids = KHOOD.CHARS.map(function (c) { return c.id; }).filter(function (id) { return id !== me; }).concat(["#all"]);
      for (let i = 0; i < ids.length; i++) await pullThread(ids[i]);
      const pres = await KHOOD.fileGet(KHOOD.presencePath());
      if (pres.ok && pres.data) presence = pres.data;
      people();
    } catch (e) {}
    if (KHOOD.lastErr) stat(KHOOD.lastErr);
    else stat("الرسايل شغالة");
    pulling = false;
  }
  async function pushMsg(obj) {
    if (!withId) return;
    if (!KHOOD.ghReady()) { stat("التوكن أو اسم المستودع مش مضبوط في data.js"); return; }
    const p = pathFor(withId);
    const file = await KHOOD.fileGet(p);
    const msgs = ((file.data && file.data.msgs) || []).concat([obj]).slice(-200);
    const ok = await KHOOD.filePut(p, { msgs: msgs }, file.sha);
    if (!ok) stat("الرسالة اتأخرت. هتتبعت تاني");
    else stat("اتبعتت");
  }

  async function beat() {
    if (!me || !KHOOD.ghReady()) return;
    const file = await KHOOD.fileGet(KHOOD.presencePath());
    const data = file.data && typeof file.data === "object" ? file.data : {};
    data[me] = { at: Date.now(), peer: peer && peer.id || "" };
    presence = data;
    await KHOOD.filePut(KHOOD.presencePath(), data, file.sha);
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
    ringT = setTimeout(rejectCall, 30000);
  }
  async function acceptCall() {
    if (!incoming) return;
    const cl = incoming; incoming = null; hideIncoming();
    try {
      videoCall = !!(cl.metadata && cl.metadata.video);
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: videoCall ? { facingMode: "user" } : false
      });
      cl.answer(media);
      showCall(cl, cl.metadata && cl.metadata.from);
    } catch (e) { stat("اسمح بالمايك"); hang(); }
  }
  function rejectCall() { try { if (incoming) incoming.close(); } catch (e) {} incoming = null; hideIncoming(); }
  function attachRemote(s, pid) {
    const box = el("tiles"); if (!box) return;
    let v = remotes[pid];
    if (!v) {
      v = document.createElement("video");
      v.autoplay = true; v.playsInline = true;
      v.className = "w-[46vw] max-w-[280px] h-[34vh] max-h-[320px] object-cover rounded-2xl bg-black";
      box.appendChild(v); remotes[pid] = v;
    }
    v.srcObject = s; v.muted = false; v.volume = 1; try { v.play(); } catch (e) {}
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
    hideIncoming(); incoming = null;
    try { if (call && call.close) call.close(); } catch (e) {}
    try { if (media) media.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    call = null; media = null; videoCall = false;
    if (el("vidMe")) el("vidMe").srcObject = null;
    if (el("callScreen")) el("callScreen").classList.remove("on");
    if (el("tiles")) el("tiles").innerHTML = "";
    remotes = {};
  }
  async function startCall(video) {
    if (!withId || !peer || !peer.id) { stat("استنى ثانية"); return; }
    const targets = membersOf(withId);
    const live = targets.filter(function (u) { return presence[u] && presence[u].peer && Date.now() - presence[u].at < 20000; });
    if (!live.length) { stat("التاني مش فاتح المسنجر دلوقت"); return; }
    try {
      videoCall = !!video; faceCam = "user";
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video ? { facingMode: faceCam } : false
      });
      showCall({ on: function () {} }, live[0]);
      live.forEach(function (u) {
        const cl = peer.call(presence[u].peer, media, { metadata: { video: !!video, from: me } });
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
    } catch (e) {}
  }

  function goLive() {
    if (!KHOOD.ghReady()) {
      stat("عدّل data.js: owner و repo والتوكن");
      return;
    }
    stat(KHOOD.ghReady() ? "بيجهز الرسايل..." : "التوكن مش متظبط في data.js");
    pullAll();
    beat();
    if (window.Peer && !peer) {
      peer = new window.Peer();
      peer.on("open", function () { beat(); });
      peer.on("call", showIncoming);
      peer.on("error", function () {});
    }
    if (!goLive._t) {
      goLive._t = setInterval(function () { pullAll(); beat(); }, 4000);
    }
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
    const item = { id: mid(), u: me, t: text, at: Date.now(), got: {}, read: {} };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(item);
    seenIds[item.id] = 1;
    save();
    paintLog();
    pushMsg(item);
  };
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
  };
  if (el("invBtn")) el("invBtn").onclick = function () {
    if (!withId) return;
    const room = "K" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const item = { id: mid(), k: "inv", u: me, room: room, at: Date.now() };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(item);
    save(); paintLog(); pushMsg(item);
    location.href = "./index.html?room=" + room + "&host=1";
  };
  let pendingVoice = "";
  function hideVoicePrev() {
    pendingVoice = "";
    if (el("voicePrev")) el("voicePrev").classList.add("hidden");
    if (el("voiceAud")) el("voiceAud").src = "";
  }
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
        if (blob.size > 180000) { stat("الصوت طويل"); el("recBtn").textContent = "🎤"; return; }
        const url = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onload = function () { pendingVoice = reader.result; };
        reader.readAsDataURL(blob);
        if (el("voiceAud")) el("voiceAud").src = url;
        if (el("voicePrev")) el("voicePrev").classList.remove("hidden");
        el("recBtn").textContent = "🎤";
      };
      rec.start(); el("recBtn").textContent = "⏹";
    } catch (e) { stat("اسمح بالمايك"); }
  };
  if (el("voiceCancel")) el("voiceCancel").onclick = hideVoicePrev;
  if (el("voiceSend")) el("voiceSend").onclick = function () {
    if (!pendingVoice || !withId) return;
    const item = { id: mid(), u: me, a: pendingVoice, at: Date.now(), got: {}, read: {} };
    if (!hist[withId]) hist[withId] = [];
    hist[withId].push(item); seenIds[item.id] = 1; save(); paintLog();
    pushMsg(item);
    hideVoicePrev();
  };
  if (el("instBtn")) el("instBtn").onclick = function () {
    alert("من كروم: إضافة إلى الشاشة الرئيسية");
  };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {});

  paintWho();
  if (auth && auth.id) enterApp();
})();
