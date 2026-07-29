// Server that phuc vu API /match va trang app tinh trong public/.
// Chay bang: npm start, sau do mo http://localhost:3000 trong trinh duyet.

const path = require("path");
const fs = require("fs");
const express = require("express");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "products.enriched.json"), "utf8")
);

const LEADS_FILE = path.join(__dirname, "data", "leads.json");

function loadLeads() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
}

function saveLeads(leads) {
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

// TODO (Zalo OA): khi co Zalo Official Account API credentials, goi API gui tin nhan
// cho nhan vien sale ngay tai day. Hien tai chi log ra console de biet co lead moi.
function notifyNewLead(lead) {
  console.log(`[LEAD MOI] ${lead.name} - ${lead.zalo} - dip: ${lead.occasion || "(chua chon)"} - SL: ${lead.quantity || "(chua ghi)"}`);
}

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

app.post("/wholesale-lead", (req, res) => {
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

  const leads = loadLeads();
  leads.push(lead);
  saveLeads(leads);
  notifyNewLead(lead);

  res.status(201).json({ ok: true, id: lead.id });
});

// Xem danh sach lead da thu thap - dung ?key=... trung voi ADMIN_KEY trong .env.
// Chua co gi bao ve khac ngoai key nay, nen KHONG chia se link nay cong khai.
app.get("/admin/leads", (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).send("Chua cau hinh ADMIN_KEY trong file .env - xem README.");
  }
  if (req.query.key !== adminKey) {
    return res.status(403).send("Sai key.");
  }

  const leads = loadLeads().slice().reverse();
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
  <table>
    <tr><th>Thoi gian</th><th>Ho ten</th><th>Zalo/SDT</th><th>Dip</th><th>So luong</th><th>Ghi chu</th></tr>
    ${rows || '<tr><td colspan="6">Chua co lead nao.</td></tr>'}
  </table>
</body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
});
