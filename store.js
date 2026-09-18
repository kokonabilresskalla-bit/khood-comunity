window.KHOOD = window.KHOOD || {};
KHOOD.KV = "https://kvs.ix.workers.dev/";
KHOOD.AUTH_KEY = "khoood-auth-v1";
KHOOD.CHAT_KEY = "khoood-mbox-local-v1";

KHOOD.authGet = function () {
  try { return JSON.parse(localStorage.getItem(KHOOD.AUTH_KEY) || "null"); } catch (e) { return null; }
};
KHOOD.authSet = function (obj) {
  localStorage.setItem(KHOOD.AUTH_KEY, JSON.stringify(obj || {}));
};
KHOOD.put = async function (key, val) {
  await fetch(KHOOD.KV + key, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(val)
  });
};
KHOOD.get = async function (key) {
  try {
    const r = await fetch(KHOOD.KV + key, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
};
KHOOD.localGet = function (key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (e) { return fallback; }
};
KHOOD.localSet = function (key, val) {
  localStorage.setItem(key, JSON.stringify(val));
};
