// Dong bo toan bo san pham + collection tu Haravan ve 2 file JSON trong thu muc data/.
// Chay bang: npm run sync:catalogue
//
// Day la buoc 2 trong lo trinh: sau khi co du lieu that, buoc tiep theo se la
// map collection ("Theo dip", "Theo doi tuong"...) sang occasion/relationship/style cua app.

const fs = require("fs");
const path = require("path");
const { haravanGet, sleep } = require("./lib/haravan-client");
const { fixMojibake } = require("./lib/text");

const DATA_DIR = path.join(__dirname, "..", "data");
const PAGE_LIMIT = 50; // gia tri mac dinh Haravan ho tro theo tai lieu chinh thuc
const MAX_PAGES = 200; // gioi han an toan, tranh vong lap vo han neu API tra ve bat thuong

async function fetchAllPages(apiPath, resourceKey, extraParams = {}) {
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const data = await haravanGet(apiPath, { ...extraParams, page, limit: PAGE_LIMIT });
    const items = data[resourceKey] || [];
    if (items.length === 0) break;

    results.push(...items);
    console.log(`  trang ${page}: +${items.length} (tong ${results.length})`);

    if (items.length < PAGE_LIMIT) break;
    page += 1;
    await sleep(300);
  }

  return results;
}

async function fetchCollectionProductIds(collectionId) {
  const items = await fetchAllPages("/products.json", "products", {
    collection_id: collectionId,
    fields: "id"
  });
  return items.map((p) => p.id);
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log("Dang lay danh sach san pham...");
  const products = await fetchAllPages("/products.json", "products");
  console.log(`-> Tong cong ${products.length} san pham.\n`);

  console.log("Dang lay danh sach custom collections...");
  const customCollections = await fetchAllPages("/custom_collections.json", "custom_collections");
  console.log(`-> ${customCollections.length} custom collections.\n`);

  console.log("Dang lay danh sach smart collections...");
  const smartCollections = await fetchAllPages("/smart_collections.json", "smart_collections");
  console.log(`-> ${smartCollections.length} smart collections.\n`);

  const collections = [
    ...customCollections.map((c) => ({ id: c.id, title: fixMojibake(c.title), handle: c.handle, type: "custom" })),
    ...smartCollections.map((c) => ({ id: c.id, title: fixMojibake(c.title), handle: c.handle, type: "smart" }))
  ];

  console.log(`Dang doi chieu san pham thuoc tung collection (${collections.length} collections)...`);
  const productCollectionIds = new Map();

  for (const col of collections) {
    const ids = await fetchCollectionProductIds(col.id);
    ids.forEach((pid) => {
      if (!productCollectionIds.has(pid)) productCollectionIds.set(pid, []);
      productCollectionIds.get(pid).push(col.id);
    });
    console.log(`  - "${col.title}" (${col.type}): ${ids.length} san pham`);
    await sleep(200);
  }

  const enrichedProducts = products.map((p) => ({
    id: p.id,
    title: fixMojibake(p.title),
    handle: p.handle,
    productType: fixMojibake(p.product_type),
    tags: fixMojibake(p.tags),
    price: p.variants && p.variants[0] ? p.variants[0].price : null,
    image: p.images && p.images[0] ? p.images[0].src : null,
    collectionIds: productCollectionIds.get(p.id) || []
  }));

  fs.writeFileSync(path.join(DATA_DIR, "collections.json"), JSON.stringify(collections, null, 2), "utf8");
  fs.writeFileSync(path.join(DATA_DIR, "products.json"), JSON.stringify(enrichedProducts, null, 2), "utf8");

  console.log("\nHoan tat. Da ghi:");
  console.log("  data/collections.json");
  console.log("  data/products.json");
  console.log("\nBuoc tiep theo: mo data/collections.json de xem ten cac collection thuc te,");
  console.log("dung de xac dinh cach map sang occasion/relationship/style cua app.");
}

main().catch((err) => {
  console.error("Loi khi dong bo:", err.message);
  process.exit(1);
});
