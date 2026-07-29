// Buoc kiem tra ket noi toi Haravan API truoc khi xay dung phan dong bo du lieu day du.
// Chay bang: npm run test:haravan

const token = process.env.HARAVAN_PRIVATE_TOKEN;
const apiBase = process.env.HARAVAN_API_BASE || "https://apis.haravan.com/com";

if (!token) {
  console.error("Thieu HARAVAN_PRIVATE_TOKEN trong file .env.");
  console.error("Xem huong dan tao token trong README.md, phan Buoc 1.");
  process.exit(1);
}

async function main() {
  const url = `${apiBase}/products.json?limit=5`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Ket noi that bai: HTTP ${res.status}`);
    console.error(body);
    console.error("Kiem tra lai: token con hieu luc khong, scope co bao gom doc san pham khong.");
    process.exit(1);
  }

  const data = await res.json();
  const products = data.products || [];

  console.log(`Ket noi thanh cong toi Haravan API.`);
  console.log(`Lay thu duoc ${products.length} san pham dau tien:\n`);

  products.forEach((p) => {
    const price = p.variants && p.variants[0] ? p.variants[0].price : "N/A";
    console.log(`- ${p.title}`);
    console.log(`    gia: ${price}  |  tags: ${p.tags || "(khong co)"}`);
  });

  if (products.length === 0) {
    console.log("Ket noi duoc nhung khong co san pham nao tra ve - kiem tra lai scope cua token.");
  }
}

main().catch((err) => {
  console.error("Loi khong xac dinh khi goi API:", err.message);
  process.exit(1);
});
