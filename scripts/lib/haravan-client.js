const API_BASE = process.env.HARAVAN_API_BASE || "https://apis.haravan.com/com";
const TOKEN = process.env.HARAVAN_PRIVATE_TOKEN;

if (!TOKEN) {
  throw new Error("Thieu HARAVAN_PRIVATE_TOKEN trong .env");
}

async function haravanGet(apiPath, params = {}) {
  const url = new URL(API_BASE + apiPath);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Haravan API loi HTTP ${res.status} tai ${apiPath}: ${body}`);
  }

  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { haravanGet, sleep };
