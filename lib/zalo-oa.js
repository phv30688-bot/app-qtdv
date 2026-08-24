// Goi Zalo OA API that de bao lead moi cho sale qua tin nhan Zalo.
//
// CAN CHUAN BI TRUOC (xem huong dan chi tiet trong README, muc "Noi Zalo OA that"):
//   1. Tao app tren developers.zalo.me, gan vao OA cua ban -> co ZALO_APP_ID + ZALO_APP_SECRET.
//   2. Set redirect_uri cua app tro ve: https://<domain-render-cua-ban>/admin/zalo-oauth/callback
//   3. Set 3 bien moi truong tren Render: ZALO_APP_ID, ZALO_APP_SECRET, ADMIN_KEY (da co san).
//   4. Vao https://<domain>/admin/zalo-oauth?key=<ADMIN_KEY> MOT LAN de dang nhap va cap quyen -
//      luc do access_token + refresh_token dau tien duoc luu vao bang settings trong DB.
//   5. Nguoi nhan thong bao (sale) phai da tung nhan tin cho OA it nhat 1 lan (yeu cau cua Zalo
//      de OA duoc phep gui tin nhan toi nguoi do) - lay user_id cua nguoi do dan vao
//      ZALO_NOTIFY_USER_ID (xem huong dan lay user_id trong README).
//
// Neu chua thiet lap du (thieu ZALO_APP_ID/SECRET, chua co token trong DB, hoac thieu
// ZALO_NOTIFY_USER_ID), ham notifyNewLead se tu dong bo qua va chi log ra console nhu truoc -
// KHONG lam sap app.

const db = require("./db");

const APP_ID = process.env.ZALO_APP_ID;
const APP_SECRET = process.env.ZALO_APP_SECRET;
const NOTIFY_USER_ID = process.env.ZALO_NOTIFY_USER_ID;

const OAUTH_BASE = "https://oauth.zaloapp.com/v4/oa";
const API_BASE = "https://openapi.zalo.me/v3.0/oa";

function isConfigured() {
  return Boolean(APP_ID && APP_SECRET);
}

function buildAuthorizeUrl(redirectUri, state) {
  const params = new URLSearchParams({
    app_id: APP_ID,
    redirect_uri: redirectUri,
    state: state || "setup"
  });
  return `${OAUTH_BASE}/permission?${params.toString()}`;
}

async function exchangeCodeForToken(code, redirectUri) {
  const body = new URLSearchParams({
    code,
    app_id: APP_ID,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });
  const res = await fetch(`${OAUTH_BASE}/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: APP_SECRET
    },
    body
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Zalo khong tra ve access_token: " + JSON.stringify(json));
  await saveTokens(json);
  return json;
}

async function refreshAccessToken() {
  const refreshToken = await db.getSetting("zalo_refresh_token");
  if (!refreshToken) throw new Error("Chua co refresh_token - can lam buoc /admin/zalo-oauth mot lan dau.");

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    app_id: APP_ID,
    grant_type: "refresh_token"
  });
  const res = await fetch(`${OAUTH_BASE}/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: APP_SECRET
    },
    body
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Zalo tu choi refresh token: " + JSON.stringify(json));
  await saveTokens(json);
  return json;
}

async function saveTokens(tokenResponse) {
  await db.setSetting("zalo_access_token", tokenResponse.access_token);
  if (tokenResponse.refresh_token) {
    await db.setSetting("zalo_refresh_token", tokenResponse.refresh_token);
  }
  // access_token cua Zalo OA thuong song ~ vai gio, refresh_token song lau hon (vai thang) -
  // luu them thoi diem lay token de biet khi nao nen chu dong refresh.
  await db.setSetting("zalo_token_fetched_at", String(Date.now()));
}

async function getValidAccessToken() {
  let token = await db.getSetting("zalo_access_token");
  const fetchedAt = Number((await db.getSetting("zalo_token_fetched_at")) || 0);
  const ageMs = Date.now() - fetchedAt;
  const ONE_HOUR = 60 * 60 * 1000;

  if (!token || ageMs > ONE_HOUR) {
    const refreshed = await refreshAccessToken();
    token = refreshed.access_token;
  }
  return token;
}

async function sendTextMessage(userId, text) {
  const accessToken = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/message/cs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: accessToken
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text }
    })
  });
  const json = await res.json();
  if (json.error && json.error !== 0) {
    throw new Error(`Zalo API loi (${json.error}): ${json.message}`);
  }
  return json;
}

async function notifyNewLead(lead) {
  const summary = `[LEAD MOI - Qua Tang Dat Vang]\nTen: ${lead.name}\nZalo/SDT: ${lead.zalo}\nDip: ${lead.occasion || "(chua chon)"}\nSo luong: ${lead.quantity || "(chua ghi)"}\nGhi chu: ${lead.note || "(khong co)"}\nXem chi tiet: /admin/leads`;

  console.log(`[LEAD MOI] ${lead.name} - ${lead.zalo} - dip: ${lead.occasion || "(chua chon)"} - SL: ${lead.quantity || "(chua ghi)"}`);

  if (!isConfigured()) {
    console.log("[zalo-oa] Chua cau hinh ZALO_APP_ID/ZALO_APP_SECRET - bo qua gui Zalo, chi log console.");
    return;
  }
  if (!NOTIFY_USER_ID) {
    console.log("[zalo-oa] Chua cau hinh ZALO_NOTIFY_USER_ID - bo qua gui Zalo, chi log console.");
    return;
  }
  if (!db.usingDb()) {
    console.log("[zalo-oa] Chua co DATABASE_URL nen khong luu duoc token Zalo lau dai - bo qua gui Zalo.");
    return;
  }

  try {
    await sendTextMessage(NOTIFY_USER_ID, summary);
    console.log("[zalo-oa] Da gui thong bao lead moi qua Zalo OA.");
  } catch (err) {
    console.error("[zalo-oa] Gui thong bao that bai:", err.message);
  }
}

module.exports = {
  isConfigured,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  notifyNewLead
};
