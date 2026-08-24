// Server that phuc vu API /match va trang app tinh trong public/.
// Chay bang: npm start, sau do mo http://localhost:3000 trong trinh duyet.

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const db = require("./lib/db");
const zaloOa = require("./lib/zalo-oa");

const app = express();
// Cho phep goi API tu domain khac (can thiet khi nhung vao Zalo Mini App -
// giao dien chay tren domain cua Zalo nhung van goi ve API tren Render nay).
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "products.enriched.json"), "utf8")
);

// Lead khach si duoc luu vao Postgres that (Supabase...) neu co DATABASE_URL,
// khong thi tu dong fallback ve data/leads.json (chi dung khi chay local, xem lib/db.js).
const { loadLeads, saveLead } = db;

// Gui thong bao lead moi qua Zalo OA that (neu da cau hinh du - xem lib/zalo-oa.js va README).
const notifyNewLead = zaloOa.notifyNewLead;

const TIER_ORDER = ["1-3", "3-5", "5-10", "10-20", "gt20"];

function computeScore(p, body) {
  let score = 0;
  if (p.occasions.includes(body.occasion)) score += 40;
  score += p.budgetTier === body.budgetTier ? 20 : 5;
  score += (p.buzz || 50) * 0.25;
  if (body.relationship && p.relationships.includes(body.relationship)) score += 15;
  if (body.style && p.styles.includes(body.style)) score += 10;
  return score;
}

function reasonsFor(p, body, relaxed) {
  const tags = [];
  if (!relaxed.occasion && p.occasions.includes(body.occasion)) tags.push("Phù hợp dịp bạn chọn");
  if (!relaxed.budget && p.budgetTier === body.budgetTier) tags.push("Trong ngân sách");
  if (body.style && p.styles.includes(body.style)) tags.push("Đúng phong cách");
  if (body.relationship && p.relationships.includes(body.relationship)) tags.push("Hợp người nhận");
  if (p.buzz >= 80) tags.push("Được tìm nhiều tuần này");
  if (tags.length === 0) tags.push("Gợi ý liên quan");
  return tags.slice(0, 2);
}

app.post("/match", (req, res) => {
  const body = req.body || {};
  if (!body.occasion || !body.budgetTier) {
    return res.status(400).json({ error: "Thieu occasion hoac budgetTier" });
  }

  const excluded = new Set(body.excludedIds || []);
  const pool = PRODUCTS.filter((p) => !excluded.has(p.id));
  const idx = TIER_ORDER.indexOf(body.budgetTier);
  const adjacent = [TIER_ORDER[idx - 1], TIER_ORDER[idx + 1]].filter(Boolean);

  let relaxedBudget = false;
  let relaxedOccasion = false;

  let filtered = pool.filter((p) => p.occasions.includes(body.occasion) && p.budgetTier === body.budgetTier);

  if (filtered.length < 6) {
    const withAdjacent = pool.filter(
      (p) => p.occasions.includes(body.occasion) && (p.budgetTier === body.budgetTier || adjacent.includes(p.budgetTier))
    );
    if (withAdjacent.length > filtered.length) {
      relaxedBudget = true;
      filtered = withAdjacent;
    }
  }
  if (filtered.length < 6) {
    const byBudgetOnly = pool.filter((p) => p.budgetTier === body.budgetTier || adjacent.includes(p.budgetTier));
    if (byBudgetOnly.length > filtered.length) {
      relaxedOccasion = true;
      filtered = byBudgetOnly;
    }
  }

  let exhausted = false;
  if (filtered.length === 0) {
    filtered = pool.slice();
    exhausted = pool.length < 3;
  }

  const scored = filtered
    .map((p) => ({ ...p, _score: computeScore(p, body) }))
    .sort((a, b) => b._score - a._score);

  const chosen = scored.slice(0, 6);
  exhausted = exhausted || chosen.length < 3;

  const relaxed = { budget: relaxedBudget, occasion: relaxedOccasion, exhausted };

  const items = chosen.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    price: p.price,
    image: p.image,
    category: p.category,
    tagZone: p.tagZone,
    reasons: reasonsFor(p, body, relaxed)
  }));

  res.json({ items, relaxed });
});

app.post("/wholesale-lead", async (req, res) => {
  const body = req.body || {};
  const name = (body.name || "").trim();
  const zalo = (body.zalo || "").trim();

  if (!name || !zalo) {
    return res.status(400).json({ error: "Thieu ho ten hoac so Zalo/dien thoai" });
  }

  const lead = {
    id: Date.now(),
    receivedAt: new Date().toISOString(),
    name,
    zalo,
    occasion: (body.occasion || "").trim(),
    quantity: (body.quantity || "").trim(),
    note: (body.note || "").trim(),
    status: "new"
  };

  try {
    await saveLead(lead);
  } catch (err) {
    console.error("[wholesale-lead] Loi luu lead vao DB:", err.message);
    return res.status(500).json({ error: "Khong luu duoc lead, vui long thu lai." });
  }

  // Khong cho request cho ket qua gui Zalo - tra loi khach ngay, gui thong bao ngam.
  notifyNewLead(lead).catch((err) => console.error("[wholesale-lead] notifyNewLead loi:", err.message));

  res.status(201).json({ ok: true, id: lead.id });
});

// Xem danh sach lead da thu thap - dung ?key=... trung voi ADMIN_KEY trong .env.
// Chua co gi bao ve khac ngoai key nay, nen KHONG chia se link nay cong khai.
app.get("/admin/leads", async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).send("Chua cau hinh ADMIN_KEY trong file .env - xem README.");
  }
  if (req.query.key !== adminKey) {
    return res.status(403).send("Sai key.");
  }

  let leads;
  try {
    leads = (await loadLeads()).slice().reverse();
  } catch (err) {
    console.error("[admin/leads] Loi doc leads tu DB:", err.message);
    return res.status(500).send("Khong doc duoc danh sach lead - kiem tra DATABASE_URL.");
  }
  const rows = leads
    .map(
      (l) => `<tr>
        <td>${new Date(l.receivedAt).toLocaleString("vi-VN")}</td>
        <td>${l.name}</td>
        <td>${l.zalo}</td>
        <td>${l.occasion}</td>
        <td>${l.quantity}</td>
        <td>${l.note}</td>
      </tr>`
    )
    .join("");

  res.send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Danh sach lead khach si</title>
<style>
  body{font-family:-apple-system,Arial,sans-serif;padding:24px;background:#F8F4EA;color:#241F18;}
  table{border-collapse:collapse;width:100%;background:#fff;}
  th,td{border:1px solid #E3D9C2;padding:8px 10px;font-size:13px;text-align:left;vertical-align:top;}
  th{background:#EADCB8;}
</style></head>
<body>
  <h2>Danh sach lead khach si (${leads.length})</h2>
  <p style="font-size:12px;color:#7A6B4E;">Nguon luu tru: ${db.usingDb() ? "Postgres (DATABASE_URL)" : "File data/leads.json (chua co DATABASE_URL - se mat khi Render build lai)"}</p>
  <table>
    <tr><th>Thoi gian</th><th>Ho ten</th><th>Zalo/SDT</th><th>Dip</th><th>So luong</th><th>Ghi chu</th></tr>
    ${rows || '<tr><td colspan="6">Chua co lead nao.</td></tr>'}
  </table>
</body></html>`);
});

// ---------- Thiet lap Zalo OA (chi can lam MOT LAN, xem README muc "Noi Zalo OA that") ----------

app.get("/admin/zalo-oauth", (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.query.key !== adminKey) {
    return res.status(403).send("Sai key hoac chua cau hinh ADMIN_KEY.");
  }
  if (!zaloOa.isConfigured()) {
    return res.status(500).send("Chua cau hinh ZALO_APP_ID / ZALO_APP_SECRET tren server - xem README.");
  }
  const redirectUri = `${req.protocol}://${req.get("host")}/admin/zalo-oauth/callback`;
  const url = zaloOa.buildAuthorizeUrl(redirectUri, adminKey);
  res.redirect(url);
});

app.get("/admin/zalo-oauth/callback", async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.query.state !== adminKey) {
    return res.status(403).send("Sai state hoac chua cau hinh ADMIN_KEY.");
  }
  const { code } = req.query;
  if (!code) return res.status(400).send("Thieu code tra ve tu Zalo.");

  const redirectUri = `${req.protocol}://${req.get("host")}/admin/zalo-oauth/callback`;
  try {
    await zaloOa.exchangeCodeForToken(code, redirectUri);
    res.send(`<!doctype html><html lang="vi"><body style="font-family:sans-serif;padding:24px;">
      <h2>Da ket noi Zalo OA thanh cong!</h2>
      <p>Access token va refresh token da duoc luu vao database. Tu gio notifyNewLead se gui tin nhan that
      cho nguoi dung trong ZALO_NOTIFY_USER_ID moi khi co lead moi.</p>
      <p>Ban co the dong tab nay.</p>
      </body></html>`);
  } catch (err) {
    console.error("[zalo-oauth/callback] Loi:", err.message);
    res.status(500).send("Loi khi doi code lay token: " + err.message);
  }
});

// ---------- Webhook Zalo Mini App: su kien "user rut lai su dong y va xoa du lieu" ----------
// Xem tai lieu: https://docs.zaloplatforms.com/docs/MA/openApis/open/webhook/eventRevokeAndRemoveUserData
// Zalo goi POST toi day khi mot nguoi dung rut lai su dong y su dung Mini App / yeu cau xoa du lieu.
// API Key lay tu trang "Quan ly Zalo App" > chon Mini App > muc Open APIs (KHONG phai App Secret
// dung cho dang nhap OAuth) - dat vao bien moi truong ZALO_WEBHOOK_API_KEY tren Render.

function verifyZaloWebhookSignature(body, signatureHeader) {
  const apiKey = process.env.ZALO_WEBHOOK_API_KEY;
  if (!apiKey || !signatureHeader) return false;

  // Theo huong dan cua Zalo: lay tat ca field trong body, sap theo thu tu alphabet
  // cua ten field, noi gia tri lai voi nhau (khong dau phan cach), roi sha256(content + apiKey).
  const keys = Object.keys(body).sort();
  let content = "";
  for (const k of keys) {
    let value = body[k];
    if (typeof value === "object" && value !== null) value = JSON.stringify(value);
    content += value;
  }
  const expected = crypto.createHash("sha256").update(content + apiKey).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
  } catch (err) {
    return false; // do dai khac nhau (vd header khong phai hex hop le) -> coi nhu khong khop
  }
}

app.post("/zalo-webhook", (req, res) => {
  const body = req.body || {};
  const signature = req.get("x-zevent-signature");

  if (!verifyZaloWebhookSignature(body, signature)) {
    console.warn("[zalo-webhook] Chu ky khong hop le hoac thieu ZALO_WEBHOOK_API_KEY, tu choi request.");
    return res.status(401).json({ error: "invalid signature" });
  }

  console.log("[zalo-webhook] Nhan su kien tu Zalo:", body);

  if (body.event === "user.revoke.consent") {
    // App nay khong luu du lieu ca nhan gan voi Zalo userId (form "dat so luong lon" chi luu
    // ten/so Zalo khach tu go, khong lien ket voi userId cua Zalo Mini App) - nen khong co
    // du lieu can xoa tuong ung. Ghi log lai (o tren) de doi chieu thu cong neu can thiet.
  }

  // Phan hoi 200 de Zalo xac nhan da nhan duoc su kien thanh cong.
  res.status(200).json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
  if (db.usingDb()) {
    db.initDb().catch((err) => console.error("[db] Loi khoi tao bang:", err.message));
  } else {
    console.log("[db] Chua co DATABASE_URL - dang dung file data/leads.json (khong ben vung tren Render free).");
  }
});
