// Tao icon PWA (khong co logo that nen ve mot icon toi gian dung phong cach app:
// vang dong tren nen nga, hoa tiet ngoi sao/kim cuong da dung trong trang chu app).
// Chay bang: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

const IVORY = "#F8F4EA";
const BRASS = "#9C7530";
const BRASS_STRONG = "#7E5D22";

// glyph: duong dan ngoi sao 4 canh, goc toa do 0..24 (giong brandmark trong index.html)
const STAR_PATH = "M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z";

function buildSvg({ size, padding, withBorder }) {
  const inner = size - padding * 2;
  const scale = inner / 24;
  const borderRect = withBorder
    ? `<rect x="${size * 0.04}" y="${size * 0.04}" width="${size * 0.92}" height="${size * 0.92}" rx="${size * 0.22}" fill="none" stroke="${BRASS}" stroke-width="${size * 0.014}" opacity="0.55"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${IVORY}"/>
    ${borderRect}
    <g transform="translate(${padding}, ${padding}) scale(${scale})">
      <path d="${STAR_PATH}" fill="${BRASS_STRONG}" stroke="${BRASS_STRONG}" stroke-width="0.6" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

async function renderPng(svg, size, outFile) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outFile);
  console.log("Da tao", outFile);
}

async function main() {
  // Icon thuong (purpose: any) - vien mong, glyph chiem phan lon icon
  await renderPng(buildSvg({ size: 512, padding: 512 * 0.22, withBorder: true }), 512, path.join(OUT_DIR, "icon-512.png"));
  await renderPng(buildSvg({ size: 192, padding: 192 * 0.22, withBorder: true }), 192, path.join(OUT_DIR, "icon-192.png"));

  // Icon maskable (purpose: maskable) - de padding rong hon vi OS se crop tron/bo goc
  await renderPng(buildSvg({ size: 512, padding: 512 * 0.32, withBorder: false }), 512, path.join(OUT_DIR, "icon-maskable-512.png"));

  // Apple touch icon - iOS tu bo goc, khong ho tro trong suot tot nen giu nen dac
  await renderPng(buildSvg({ size: 180, padding: 180 * 0.24, withBorder: false }), 180, path.join(OUT_DIR, "apple-touch-icon.png"));

  console.log("\nHoan tat tao icon PWA.");
}

main();
