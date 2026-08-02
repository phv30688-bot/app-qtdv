// Tu build public/inline.js truc tiep tu public/index.html, KHONG dung "zmp sync-config"
// vi cong cu do lam mat ky tu '<' '>' trong chuoi HTML nhung vao JS (da xac minh qua loi
// thuc te tren Zalo: markup hien ra dang chu tho thay vi duoc render).
//
// Chay bang: npm run build:zalo

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "public", "index.html");
const OUT = path.join(__dirname, "..", "public", "inline.js");

const html = fs.readFileSync(SRC, "utf8");

function extractBetween(str, openTagRegex, closeTag) {
  const openMatch = str.match(openTagRegex);
  if (!openMatch) throw new Error("Khong tim thay tag mo: " + openTagRegex);
  const start = openMatch.index + openMatch[0].length;
  const end = str.indexOf(closeTag, start);
  if (end === -1) throw new Error("Khong tim thay tag dong: " + closeTag);
  return str.slice(start, end);
}

const styleContent = extractBetween(html, /<style>/, "</style>");

// Co the co nhieu tag <script> (script chinh + script dang ky service worker...) -
// luon lay khoi DAI NHAT, do chinh la logic chinh cua app.
const allScriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (allScriptMatches.length === 0) throw new Error("Khong tim thay the <script> nao trong index.html");
const mainScript = allScriptMatches.reduce((longest, m) => (m[1].length > longest.length ? m[1] : longest), "");

const output =
  "document.head.innerHTML += " + JSON.stringify("<style>" + styleContent + "</style>") + ";\n\n" +
  mainScript;

fs.writeFileSync(OUT, output, "utf8");
console.log("Da tao public/inline.js truc tiep (" + output.length + " ky tu), khong qua zmp sync-config.");
