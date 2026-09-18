window.KHOOD = window.KHOOD || {};
KHOOD.GH = {
  owner: "kokonabilresskalla-bit",
  repo: "khood-comunity",
  blob: "KH1.6768705f78386161456167637432304e5a3642566d5a6f376558515361495470346b306c78376f52"
};
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
