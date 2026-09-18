window.KHOOD = window.KHOOD || {};
KHOOD.AUTH_KEY = "khoood-auth-v1";
KHOOD.CHAT_KEY = "khoood-mbox-local-v1";

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

function b64e(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64d(s) { return decodeURIComponent(escape(atob(s))); }
KHOOD.hideTok = function (s) {
  const x = btoa(unescape(encodeURIComponent(String(s || ""))));
  return x.split("").reverse().join("").replace(/A/g, "#").replace(/Z/g, "%");
};
KHOOD.showTok = function (s) {
  try {
    const x = String(s || "").replace(/#/g, "A").replace(/%/g, "Z").split("").reverse().join("");
    return decodeURIComponent(escape(atob(x)));
  } catch (e) { return ""; }
};
function gh() {
  const d = (window.KHOOD && KHOOD.GH) || {};
  const token = d.blob ? KHOOD.showTok(d.blob) : (d.token || "");
  return { owner: d.owner || "", repo: d.repo || "", token: token };
}
KHOOD.ghReady = function () {
  const g = gh();
  if (!g.owner || !g.repo || !g.token) return false;
  if (g.repo.indexOf("/") >= 0) return false;
  if (g.token.indexOf("حط_") === 0) return false;
  return true;
};
KHOOD.ghHeaders = function () {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + gh().token,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
};
KHOOD.ghUrl = function (path) {
  const g = gh();
  return "https://api.github.com/repos/" + g.owner + "/" + g.repo + "/contents/" + path;
};
KHOOD.lastErr = "";
KHOOD.fileGet = async function (path) {
  if (!KHOOD.ghReady()) { KHOOD.lastErr = "data.js ناقص"; return { ok: false, data: null, sha: null, status: 0 }; }
  try {
    const r = await fetch(KHOOD.ghUrl(path) + "?t=" + Date.now(), { headers: KHOOD.ghHeaders(), cache: "no-store" });
    if (r.status === 404) return { ok: true, data: null, sha: null, status: 404 };
    if (!r.ok) { KHOOD.lastErr = r.status===401 ? "التوكن غلط أو ملغي" : ("GitHub "+r.status); return { ok: false, data: null, sha: null, status: r.status }; }
    const j = await r.json();
    let data = null;
    try { data = JSON.parse(b64d(String(j.content || "").replace(/\n/g, ""))); } catch (e) { data = null; }
    return { ok: true, data: data, sha: j.sha, status: 200 };
  } catch (e) { return { ok: false, data: null, sha: null, status: 0 }; }
};
KHOOD.filePut = async function (path, data, sha) {
  if (!KHOOD.ghReady()) return false;
  const body = { message: "khood " + path, content: b64e(JSON.stringify(data)) };
  if (sha) body.sha = sha;
  try {
    const r = await fetch(KHOOD.ghUrl(path), { method: "PUT", headers: KHOOD.ghHeaders(), body: JSON.stringify(body) });
    if (r.status === 409) {
      const fresh = await KHOOD.fileGet(path);
      return KHOOD.filePut(path, data, fresh.sha);
    }
    if (!r.ok) KHOOD.lastErr = r.status===401 ? "التوكن غلط أو ملغي" : ("كتابة GitHub "+r.status);
    return r.ok;
  } catch (e) { KHOOD.lastErr = "مفيش نت"; return false; }
};
KHOOD.threadPath = function (a, b) {
  const pair = [String(a), String(b)].sort().join("-");
  return "mail/t-" + pair + ".json";
};
KHOOD.groupPath = function () { return "mail/t-group.json"; };
KHOOD.presencePath = function () { return "mail/presence.json"; };
