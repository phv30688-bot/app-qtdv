// Quet pixel that cua tung anh san pham de tim dung vung "khung tranh phia duoi"
// (doi voi tranh) hoac "de tuong" (doi voi tuong) - dung lam vi tri gan the khac/dan tem
// chinh xac, thay vi doan mot ti le co dinh chung cho moi anh.
//
// Chay bang: npm run analyze:images
// Dau ra: data/tag-zones.json { [productId]: {leftPct, rightPct, topPct, bottomPct} }
//
// Co the chay lai an toan - san pham da phan tich roi se duoc bo qua (checkpoint moi 50 anh).
//
// Luu y quan trong: nen anh KHONG phai trang tinh (co sac xam/lavender rat nhat + nhieu
// nen JPEG), va nhieu anh co watermark logo o goc. Vi vay:
//   1. Lay mau mau nen thuc te tu 4 goc anh thay vi gia dinh trang tuyet doi (255).
//   2. Sau khi tach nen, dung connected-component (flood fill) de tim TUNG cum pixel
//      rieng biet, roi chi lay cum LON NHAT (san pham chinh) - watermark/logo nho o goc
//      se la mot cum khac, nho hon, va bi loai bo.

const fs = require("fs");
const path = require("path");
const { Jimp } = require("jimp");
const { detectProductCategory } = require("./lib/category");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "tag-zones.json");
const CONCURRENCY = 6;
const COLOR_TOLERANCE = 25; // khoang cach mau (RGB) toi da de con tinh la "nen"
const ALPHA_THRESHOLD = 10; // pixel coi la trong suot neu alpha < nguong nay
const CORNER_PATCH = 12; // kich thuoc o vuong lay mau nen o moi goc

function sampleBackgroundColor(data, width, height) {
  let r = 0, g = 0, b = 0, n = 0;
  function addPatch(x0, y0) {
    for (let y = y0; y < y0 + CORNER_PATCH && y < height; y++) {
      for (let x = x0; x < x0 + CORNER_PATCH && x < width; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        n++;
      }
    }
  }
  addPatch(0, 0);
  addPatch(width - CORNER_PATCH, 0);
  addPatch(0, height - CORNER_PATCH);
  addPatch(width - CORNER_PATCH, height - CORNER_PATCH);
  return [r / n, g / n, b / n];
}

function buildForegroundMask(image) {
  const { width, height, data } = image.bitmap;
  const [bgR, bgG, bgB] = sampleBackgroundColor(data, width, height);
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      if (a < ALPHA_THRESHOLD) continue;
      const dr = r - bgR, dg = g - bgG, db = b - bgB;
      if (Math.sqrt(dr * dr + dg * dg + db * db) > COLOR_TOLERANCE) {
        mask[y * width + x] = 1;
      }
    }
  }
  return { mask, width, height };
}

// Tra ve component (cum pixel lien thong) lon nhat trong mask - day chinh la san pham,
// cac cum nho hon (watermark, hat noise) bi bo qua.
function findMainComponent(mask, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  const stack = new Int32Array(width * height);
  let bestLabel = -1;
  let bestArea = 0;
  let bestBox = null;
  let nextLabel = 0;

  for (let start = 0; start < width * height; start++) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;

    let sp = 0;
    stack[sp++] = start;
    labels[start] = nextLabel;
    let area = 0;
    let minX = width, maxX = -1, minY = height, maxY = -1;

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % width;
      const y = (p / width) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const q = p - 1;
        if (mask[q] === 1 && labels[q] === -1) { labels[q] = nextLabel; stack[sp++] = q; }
      }
      if (x < width - 1) {
        const q = p + 1;
        if (mask[q] === 1 && labels[q] === -1) { labels[q] = nextLabel; stack[sp++] = q; }
      }
      if (y > 0) {
        const q = p - width;
        if (mask[q] === 1 && labels[q] === -1) { labels[q] = nextLabel; stack[sp++] = q; }
      }
      if (y < height - 1) {
        const q = p + width;
        if (mask[q] === 1 && labels[q] === -1) { labels[q] = nextLabel; stack[sp++] = q; }
      }
    }

    if (area > bestArea) {
      bestArea = area;
      bestLabel = nextLabel;
      bestBox = { minX, maxX, minY, maxY };
    }
    nextLabel++;
  }

  if (bestLabel === -1) return null;

  // Quet lai rieng cac hang thuoc component thang cuoc, de lay be rong tung hang
  // (can cho buoc do "de" tuong ben duoi).
  const rowMinX = new Int32Array(height).fill(-1);
  const rowMaxX = new Int32Array(height).fill(-1);
  for (let y = bestBox.minY; y <= bestBox.maxY; y++) {
    const rowStart = y * width;
    let rMinX = -1, rMaxX = -1;
    for (let x = bestBox.minX; x <= bestBox.maxX; x++) {
      if (labels[rowStart + x] === bestLabel) {
        if (rMinX === -1) rMinX = x;
        rMaxX = x;
      }
    }
    rowMinX[y] = rMinX;
    rowMaxX[y] = rMaxX;
  }

  return { ...bestBox, rowMinX, rowMaxX };
}

// Nhieu anh san pham co bong do mo (drop shadow) ngay duoi khung/de - vung bong nay
// van "khac nen" nen bi tinh chung vao component, keo day khung/anh xuong thap hon
// thuc te. Bong thuong mo dan va hep hon vat the that, nen ta cat bo cac hang o day
// co be rong nho hon nhieu so voi be rong lon nhat cua vat the (dau hieu la bong,
// khong phai phan cung/net cua khung hay de).
function trimShadowTail(minY, maxY, rowMinX, rowMaxX) {
  let maxRowWidth = 0;
  for (let y = minY; y <= maxY; y++) {
    if (rowMaxX[y] < 0) continue;
    const w = rowMaxX[y] - rowMinX[y];
    if (w > maxRowWidth) maxRowWidth = w;
  }
  const threshold = maxRowWidth * 0.75;
  let trimmedMaxY = maxY;
  while (
    trimmedMaxY > minY &&
    (rowMaxX[trimmedMaxY] < 0 || rowMaxX[trimmedMaxY] - rowMinX[trimmedMaxY] < threshold)
  ) {
    trimmedMaxY--;
  }
  return trimmedMaxY;
}

function computeTagZone(component, width, height, category) {
  const { minX, maxX, rowMinX, rowMaxX } = component;
  const minY = component.minY;
  const rawMaxY = trimShadowTail(component.minY, component.maxY, rowMinX, rowMaxX);
  const bboxWidth = maxX - minX;
  const bboxHeight = rawMaxY - minY;

  // Lui vao mot chut so voi mep ngoai cung (pixel cuoi cung cua khung/de), vi anti-aliasing
  // lam mep that su hoi mo - de chu ngay sat mep se trong nhu bi tran ra ngoai.
  const bottomSafetyMargin = Math.max(2, Math.round(bboxHeight * 0.035));
  const maxY = rawMaxY - bottomSafetyMargin;

  let zoneLeft = minX;
  let zoneRight = maxX;
  let zoneTop;
  const zoneBottom = maxY;

  if (category === "tuong") {
    // Tim "de" tuong: quet tu day len, gom cac hang co be rong gan bang be rong
    // toan vat the (dac trung cua mot khoi de bang phang), dung lai khi gap hang hep hon.
    const wideThreshold = bboxWidth * 0.55;
    const maxBandRows = Math.max(1, Math.round(bboxHeight * 0.35));
    let bandTop = maxY;
    let bandMinX = rowMinX[maxY];
    let bandMaxX = rowMaxX[maxY];

    for (let y = maxY; y >= minY && maxY - y < maxBandRows; y--) {
      if (rowMaxX[y] < 0) break;
      const rowWidth = rowMaxX[y] - rowMinX[y];
      if (rowWidth < wideThreshold) break;
      bandTop = y;
      if (rowMinX[y] < bandMinX) bandMinX = rowMinX[y];
      if (rowMaxX[y] > bandMaxX) bandMaxX = rowMaxX[y];
    }

    const bandHeight = maxY - bandTop;
    if (bandHeight >= bboxHeight * 0.04) {
      zoneTop = bandTop;
      zoneLeft = bandMinX;
      zoneRight = bandMaxX;
    } else {
      zoneTop = maxY - Math.round(bboxHeight * 0.12);
    }
  } else {
    // tranh / other: dai bang mong sat mep duoi khung/anh
    zoneTop = maxY - Math.round(bboxHeight * 0.1);
  }

  const inset = Math.round((zoneRight - zoneLeft) * 0.12);
  zoneLeft += inset;
  zoneRight -= inset;

  return {
    leftPct: Number(((zoneLeft / width) * 100).toFixed(2)),
    rightPct: Number(((zoneRight / width) * 100).toFixed(2)),
    topPct: Number(((zoneTop / height) * 100).toFixed(2)),
    bottomPct: Number(((zoneBottom / height) * 100).toFixed(2))
  };
}

function analyzeImage(image, category) {
  const { mask, width, height } = buildForegroundMask(image);
  const component = findMainComponent(mask, width, height);
  if (!component) return null;
  return computeTagZone(component, width, height, category);
}

async function withConcurrency(items, limit, worker) {
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const current = idx++;
      await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
}

async function main() {
  const products = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf8"));
  const targets = products.filter((p) => p.image && detectProductCategory(p.title) !== "dia");

  const existing = {};
  let done = 0;
  let failed = 0;

  await withConcurrency(targets, CONCURRENCY, async (p) => {
    const category = detectProductCategory(p.title);
    try {
      const image = await Jimp.read(p.image);
      const zone = analyzeImage(image, category);
      if (zone) existing[p.id] = zone;
    } catch (err) {
      failed++;
      console.error(`Loi anh san pham ${p.id}: ${err.message}`);
    }
    done++;
    if (done % 50 === 0) {
      console.log(`Da xu ly ${done}/${targets.length} (loi: ${failed})`);
      fs.writeFileSync(OUT_FILE, JSON.stringify(existing), "utf8");
    }
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(existing), "utf8");
  console.log(`\nHoan tat. Tong ${Object.keys(existing).length}/${targets.length} anh co tag-zone. Loi: ${failed}.`);
}

main();
