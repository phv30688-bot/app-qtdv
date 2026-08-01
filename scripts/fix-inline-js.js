// "zmp sync-config" tu dong boc script JS that cua app vao trong 1 chuoi HTML roi
// chen qua "document.body.innerHTML += `<script>...</script>`". Theo dac ta DOM,
// the <script> chen qua innerHTML se KHONG BAO GIO tu chay - khien toan bo logic
// app (nut bam, goi API...) bi im lim ma khong bao loi gi. Script nay sua lai:
// bo lop boc do, cho doan code JS thuc thi truc tiep (vi ban than inline.js da
// duoc tai dung <script src="..."> nen no van chay binh thuong).
//
// Chay bang: npm run fix:inline sau moi lan "zmp sync-config".

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "public", "inline.js");
const content = fs.readFileSync(FILE, "utf8");

const marker = "document.body.innerHTML += `<script>";
const startIdx = content.indexOf(marker);

if (startIdx === -1) {
  console.log("Khong thay pattern can sua - co the sync-config da doi cach hoat dong, kiem tra lai thu cong.");
  process.exit(0);
}

const codeStart = startIdx + marker.length;
const closeMarker = "</script>`;";
const closeIdx = content.indexOf(closeMarker, codeStart);

if (closeIdx === -1) {
  throw new Error('Khong tim thay diem ket thuc "</script>`;" tuong ung.');
}

const innerCode = content.slice(codeStart, closeIdx);
const fixed = content.slice(0, startIdx) + innerCode + content.slice(closeIdx + closeMarker.length);

fs.writeFileSync(FILE, fixed, "utf8");
console.log("Da sua public/inline.js: go bo lop boc innerHTML quanh script chinh, cho no chay truc tiep.");
