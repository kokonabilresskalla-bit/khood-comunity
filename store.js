window.KHOOD = window.KHOOD || {};
KHOOD.AUTH_KEY = "khoood-auth-v1";
KHOOD.CHAT_KEY = "khoood-mbox-local-v1";
KHOOD.GH_KEY = "khoood-gh-v1";

KHOOD.authGet = function () {
  try { return JSON.parse(localStorage.getItem(KHOOD.AUTH_KEY) || "null"); } catch (e) { return null; }
};
KHOOD.authSet = function (obj) {
  try { localStorage.setItem(KHOOD.AUTH_KEY, JSON.stringify(obj || {})); } catch (e) {}
};
KHOOD.localGet = function (key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (e) { return fallback; }
};
KHOOD.localSet = function (key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
};
KHOOD.ghGet = function () {
  const saved = KHOOD.localGet(KHOOD.GH_KEY, {}) || {};
  const def = (window.KHOOD && KHOOD.GH) || {};
  return {
    owner: saved.owner || def.owner || "",
    repo: saved.repo || def.repo || "",
    token: saved.token || def.token || ""
  };
};
KHOOD.ghSet = function (obj) { KHOOD.localSet(KHOOD.GH_KEY, obj || {}); };

function b64e(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64d(s) { return decodeURIComponent(escape(atob(s))); }

KHOOD.mailFile = function (id) { return "mail/" + String(id || "x").replace(/[^a-z0-9]/g, "") + ".json"; };
KHOOD.ghReady = function () {
  const g = KHOOD.ghGet();
  return !!(g.owner && g.repo && g.token);
};
KHOOD.ghHeaders = function () {
  const g = KHOOD.ghGet();
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + g.token,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
};
KHOOD.ghUrl = function (path) {
  const g = KHOOD.ghGet();
  return "https://api.github.com/repos/" + g.owner + "/" + g.repo + "/contents/" + path;
};
KHOOD.mailRead = async function (id) {
  if (!KHOOD.ghReady()) return { msgs: [], sha: null };
  try {
    const r = await fetch(KHOOD.ghUrl(KHOOD.mailFile(id)), { headers: KHOOD.ghHeaders(), cache: "no-store" });
    if (!r.ok) return { msgs: [], sha: null };
    const j = await r.json();
    const data = JSON.parse(b64d(String(j.content || "").replace(/\n/g, "")) || "{\"msgs\":[]}");
    return { msgs: data.msgs || [], sha: j.sha };
  } catch (e) { return { msgs: [], sha: null }; }
};
KHOOD.mailWrite = async function (id, msgs, sha) {
  if (!KHOOD.ghReady()) return false;
  const body = {
    message: "mail " + id,
    content: b64e(JSON.stringify({ msgs: (msgs || []).slice(-80) }))
  };
  if (sha) body.sha = sha;
  try {
    const r = await fetch(KHOOD.ghUrl(KHOOD.mailFile(id)), {
      method: "PUT",
      headers: KHOOD.ghHeaders(),
      body: JSON.stringify(body)
    });
    return r.ok;
  } catch (e) { return false; }
};
KHOOD.mailPush = async function (to, payload) {
  const box = await KHOOD.mailRead(to);
  box.msgs.push({ payload: payload, at: Date.now() });
  return KHOOD.mailWrite(to, box.msgs, box.sha);
};
KHOOD.mailPull = async function (id) {
  const box = await KHOOD.mailRead(id);
  if (!box.msgs.length) return [];
  await KHOOD.mailWrite(id, [], box.sha);
  return box.msgs;
};
