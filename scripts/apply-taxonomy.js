// Gan occasion/relationship/style/budget tier cho tung san pham, dua tren:
//   - data/products.json + data/collections.json (tu buoc dong bo)
//   - config/collection-map.js (bang map tay, dua tren ten collection that)
//
// Chay bang: npm run apply:taxonomy
// Dau ra: data/products.enriched.json - day la file se dung de thay the du lieu mau
// trong prototype/backend.

const fs = require("fs");
const path = require("path");
const collectionMap = require("./config/collection-map");
const productOverrides = require("./config/product-overrides");
const { detectProductCategory } = require("./lib/category");

const DATA_DIR = path.join(__dirname, "..", "data");

const BUDGET_TIERS = [
  { id: "1-3", max: 3_000_000 },
  { id: "3-5", max: 5_000_000 },
  { id: "5-10", max: 10_000_000 },
  { id: "10-20", max: 20_000_000 },
  { id: "gt20", max: Infinity }
];

function budgetTierFor(price) {
  if (typeof price !== "number" || Number.isNaN(price)) return null;
  const tier = BUDGET_TIERS.find((t) => price < t.max);
  return tier ? tier.id : "gt20";
}

function loadTagZones() {
  const file = path.join(DATA_DIR, "tag-zones.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const products = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf8"));
  const collections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "collections.json"), "utf8"));
  const tagZones = loadTagZones();

  const collectionById = new Map(collections.map((c) => [c.id, c]));

  let withOccasion = 0;
  let withRelationship = 0;
  let withStyle = 0;
  let withNone = 0;
  const unmappedCollectionHandles = new Set();

  const enriched = products.map((p) => {
    const occasions = new Set();
    const relationships = new Set();
    const styles = new Set();
    let buzzBoost = false;
    const sourceCollectionTitles = [];

    p.collectionIds.forEach((cid) => {
      const col = collectionById.get(cid);
      if (!col) return;
      sourceCollectionTitles.push(col.title);

      const rule = collectionMap[col.handle];
      if (!rule) {
        unmappedCollectionHandles.add(col.handle);
        return;
      }
      (rule.occasions || []).forEach((o) => occasions.add(o));
      (rule.relationships || []).forEach((r) => relationships.add(r));
      (rule.styles || []).forEach((s) => styles.add(s));
      if (rule.buzzBoost) buzzBoost = true;
    });

    const override = productOverrides[p.id];
    if (override) {
      (override.occasions || []).forEach((o) => occasions.add(o));
      (override.relationships || []).forEach((r) => relationships.add(r));
      (override.styles || []).forEach((s) => styles.add(s));
    }

    if (occasions.size > 0) withOccasion += 1;
    if (relationships.size > 0) withRelationship += 1;
    if (styles.size > 0) withStyle += 1;
    if (occasions.size === 0 && relationships.size === 0 && styles.size === 0) withNone += 1;

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: p.price,
      budgetTier: budgetTierFor(p.price),
      image: p.image,
      category: detectProductCategory(p.title),
      tagZone: tagZones[p.id] || null,
      occasions: [...occasions],
      relationships: [...relationships],
      styles: [...styles],
      buzz: buzzBoost ? 80 : 50,
      sourceCollectionTitles
    };
  });

  fs.writeFileSync(
    path.join(DATA_DIR, "products.enriched.json"),
    JSON.stringify(enriched, null, 2),
    "utf8"
  );

  const withTagZone = enriched.filter((p) => p.tagZone).length;

  console.log(`Tong so san pham: ${products.length}`);
  console.log(`  - Co it nhat 1 occasion : ${withOccasion}`);
  console.log(`  - Co it nhat 1 relationship : ${withRelationship}`);
  console.log(`  - Co tag-zone (vi tri khac/dan chinh xac) : ${withTagZone}`);
  console.log(`  - Co it nhat 1 style : ${withStyle}`);
  console.log(`  - Khong co tag nao (occasion/relationship/style) : ${withNone}`);
  console.log(`\nDa ghi: data/products.enriched.json`);

  if (unmappedCollectionHandles.size > 0) {
    console.log(`\nCo ${unmappedCollectionHandles.size} collection chua co trong collection-map.js`);
    console.log("(phan lon la collection mo ta LOAI san pham, khong can map - bo qua duoc):");
    [...unmappedCollectionHandles].sort().forEach((h) => console.log(`  - ${h}`));
  }
}

main();
