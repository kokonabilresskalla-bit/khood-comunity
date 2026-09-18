window.KHOOD = window.KHOOD || {};
KHOOD.CHARS = [
  { id: "fady", name: "فادي", img: "./char-fady.png", pass: "F7#qL29vXm4P" },
  { id: "wageeh", name: "وجيه", img: "./char-wageeh.png", pass: "W3$tR81nYb6K" },
  { id: "koko", name: "كوكو", img: "./char-koko.png", pass: "K9!cB54zHs2Q" },
  { id: "tony", name: "توني", img: "./char-tony.png", pass: "T5&hJ27wEq8M" },
  { id: "sisi", name: "السيسي", img: "./sisi.png", pass: "S8@dN13pUa6Z" }
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
