window.KHOOD = window.KHOOD || {};
KHOOD.CHARS = [
  { id: "fady", name: "فادي", img: "./char-fady.png", pass: "fady123" },
  { id: "wageeh", name: "وجيه", img: "./char-wageeh.png", pass: "wageeh123" },
  { id: "koko", name: "كوكو", img: "./char-koko.png", pass: "koko123" },
  { id: "tony", name: "توني", img: "./char-tony.png", pass: "tony123" },
  { id: "sisi", name: "السيسي", img: "./sisi.png", pass: "sisi123" }
];
KHOOD.face = function (id) {
  const c = KHOOD.CHARS.find(function (x) { return x.id === id; });
  return c ? c.img : "./sisi.png";
};
KHOOD.cname = function (id) {
  const c = KHOOD.CHARS.find(function (x) { return x.id === id; });
  return c ? c.name : id;
};
KHOOD.checkPass = function (id, pass) {
  const c = KHOOD.CHARS.find(function (x) { return x.id === id; });
  return !!(c && String(pass || "") === c.pass);
};
