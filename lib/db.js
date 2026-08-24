// Lop luu tru dung chung: neu co DATABASE_URL (Postgres - vd Supabase) thi dung DB that,
// khong thi tu dong fallback ve file JSON trong data/ (de van chay duoc o may local khong co DB).
//
// Dung cho 2 viec:
//   - leads: danh sach lead khach si thu thap tu form
//   - settings: luu access_token/refresh_token cua Zalo OA (khong dung .env vi token
//     can duoc CAP NHAT lai sau moi lan refresh, ma .env tren Render khong ghi lai duoc luc runtime)

const fs = require("fs");
const path = require("path");

const LEADS_FILE = path.join(__dirname, "..", "data", "leads.json");
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
let ready = null;

function usingDb() {
  return Boolean(DATABASE_URL);
}

function getPool() {
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: DATABASE_URL,
      // Supabase (va da so Postgres hosted) yeu cau SSL nhung dung cert tu ky rieng -
      // tat verify de ket noi duoc, van ma hoa duong truyen binh thuong.
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDb() {
  if (!usingDb()) return;
  if (ready) return ready;
  ready = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id BIGINT PRIMARY KEY,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        name TEXT NOT NULL,
        zalo TEXT NOT NULL,
        occasion TEXT,
        quantity TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'new'
      );
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log("[db] Da ket noi Postgres va dam bao bang leads/settings ton tai.");
  })();
  return ready;
}

// ---------- Leads ----------

function loadLeadsFromFile() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
}

function saveLeadsToFile(leads) {
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

async function loadLeads() {
  if (!usingDb()) return loadLeadsFromFile();
  await initDb();
  const { rows } = await getPool().query(
    `SELECT id, received_at AS "receivedAt", name, zalo, occasion, quantity, note, status
     FROM leads ORDER BY received_at ASC`
  );
  return rows.map((r) => ({ ...r, receivedAt: r.receivedAt.toISOString() }));
}

async function saveLead(lead) {
  if (!usingDb()) {
    const leads = loadLeadsFromFile();
    leads.push(lead);
    saveLeadsToFile(leads);
    return;
  }
  await initDb();
  await getPool().query(
    `INSERT INTO leads (id, received_at, name, zalo, occasion, quantity, note, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [lead.id, lead.receivedAt, lead.name, lead.zalo, lead.occasion, lead.quantity, lead.note, lead.status]
  );
}

// ---------- Settings (dung de luu Zalo OA access/refresh token) ----------

async function getSetting(key) {
  if (!usingDb()) return null; // khong co DB thi khong luu duoc token lau dai
  await initDb();
  const { rows } = await getPool().query(`SELECT value FROM settings WHERE key = $1`, [key]);
  return rows.length ? rows[0].value : null;
}

async function setSetting(key, value) {
  if (!usingDb()) return;
  await initDb();
  await getPool().query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

module.exports = { usingDb, initDb, loadLeads, saveLead, getSetting, setSetting };
