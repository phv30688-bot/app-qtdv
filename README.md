# qua-tang-app

App tư vấn chọn quà cho khách hàng Quà Tặng Dát Vàng — dữ liệu sản phẩm đồng bộ thật từ [quatangdatvang.com](https://quatangdatvang.com) (Haravan).

## Chạy thử ở máy local

```powershell
Copy-Item .env.example .env
notepad .env    # dien HARAVAN_PRIVATE_TOKEN va ADMIN_KEY
npm install
npm run dev
```

Mở `http://localhost:3000`. `npm run dev` nạp biến môi trường từ file `.env` — chỉ dùng lệnh này khi chạy ở máy local. Khi deploy lên Render, nền tảng tự cung cấp biến môi trường, dùng `npm start` (không cần file `.env`).

## Đồng bộ lại dữ liệu sản phẩm từ Haravan

Chạy khi catalogue trên Haravan có thay đổi (thêm sản phẩm mới, đổi giá...):

```powershell
npm run sync:catalogue     # lay toan bo san pham + collection tu Haravan
npm run analyze:images     # quet anh de tim dung vi tri khac/dan tem (mat vai phut)
npm run apply:taxonomy     # gan dip/doi tuong/phong cach + gop tat ca lai
```

Kết quả cuối ghi vào `data/products.enriched.json` — đây là file server đọc lúc chạy. Sau khi chạy xong, **commit và push lại lên GitHub** để Render tự deploy bản mới (xem phần Deploy bên dưới).

## Cấu trúc thư mục

- `server.js` — API `/match` (gợi ý sản phẩm) và `/wholesale-lead` (lưu lead khách sỉ), phục vụ `public/index.html`.
- `public/index.html` — giao diện app (tĩnh, gọi API ở trên).
- `lib/db.js` — lớp lưu trữ: dùng Postgres thật nếu có `DATABASE_URL`, không thì tự fallback về file `data/leads.json`.
- `lib/zalo-oa.js` — gọi Zalo OA API thật để báo lead mới qua tin nhắn Zalo (xem mục riêng bên dưới).
- `scripts/` — các script đồng bộ dữ liệu từ Haravan (chỉ chạy ở máy local, không chạy trên server thật).
- `data/products.enriched.json` — dữ liệu sản phẩm đã xử lý, server dùng trực tiếp.
- `data/leads.json` — chỉ dùng khi **chưa** cấu hình `DATABASE_URL` (không đưa lên git).

## Xem danh sách lead khách sỉ

Vào `http://localhost:3000/admin/leads?key=...` (thay `...` bằng giá trị `ADMIN_KEY` trong file `.env`). Đường link này **không có bảo vệ nào khác ngoài key** — tuyệt đối không chia sẻ công khai. Trang này hiện rõ đang lấy dữ liệu từ Postgres hay từ file tạm, để bạn biết có cần cấu hình `DATABASE_URL` không.

## Lưu lead vào database thật (Supabase)

Gói Render free reset ổ đĩa mỗi lần build lại, nên `data/leads.json` **không đáng tin cậy lâu dài**. Cách khắc phục — dùng Postgres miễn phí của Supabase:

1. Tạo tài khoản tại [supabase.com](https://supabase.com) (đăng nhập bằng GitHub cho nhanh) → **New project** → đặt tên, chọn mật khẩu database, chọn region gần Việt Nam (Singapore).
2. Đợi project khởi tạo xong (~2 phút) → vào **Project Settings → Database → Connection string** → chọn tab **URI**, copy chuỗi dạng:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres`
   Thay `[YOUR-PASSWORD]` bằng mật khẩu bạn đặt ở bước 1.
3. Dán chuỗi đó vào biến `DATABASE_URL` — trong file `.env` khi chạy local, hoặc trong tab **Environment** của Render khi deploy thật (xem phần Deploy bên dưới).
4. Không cần tạo bảng thủ công — server tự tạo bảng `leads` và `settings` khi khởi động lần đầu nếu thấy `DATABASE_URL`.

Sau khi có `DATABASE_URL`, mọi lead mới ghi thẳng vào Postgres, không bị mất khi Render build lại nữa. Trang `/admin/leads` sẽ tự chuyển sang đọc từ Postgres.

## Nối Zalo OA thật

Hiện `lib/zalo-oa.js` đã viết sẵn toàn bộ luồng gọi API — chỉ cần bạn cung cấp credentials. Nếu **chưa cấu hình đủ**, `notifyNewLead` tự động bỏ qua và chỉ log ra console như trước, **không làm app lỗi**.

**Điều kiện bắt buộc trước khi làm theo các bước dưới:** đã có `DATABASE_URL` (token Zalo cần được lưu lại và tự làm mới, không thể lưu trong file `.env` trên Render vì không ghi lại được lúc runtime).

**Các bước:**

1. Vào [developers.zalo.me](https://developers.zalo.me) → đăng nhập bằng tài khoản Zalo đang quản lý OA của bạn → **Tạo ứng dụng mới** (chọn loại phù hợp, ví dụ "Official Account").
2. Trong trang quản lý app vừa tạo, vào mục **Liên kết OA**, chọn đúng Official Account "Quà Tặng Dát Vàng" của bạn.
3. Lấy `App ID` và `Secret Key` (mục **Cài đặt/Settings** của app) → điền vào biến `ZALO_APP_ID` và `ZALO_APP_SECRET` trên Render (tab Environment).
4. Trong cài đặt app, thêm **Redirect URL** (OAuth callback):
   `https://<domain-render-cua-ban>.onrender.com/admin/zalo-oauth/callback`
5. Redeploy service trên Render để nhận biến môi trường mới, sau đó mở trình duyệt vào:
   `https://<domain-render-cua-ban>.onrender.com/admin/zalo-oauth?key=<ADMIN_KEY>`
   Trang sẽ chuyển tới Zalo để bạn đăng nhập và cấp quyền cho app — làm **một lần duy nhất**. Sau khi xong, access token + refresh token được lưu vào Postgres và tự động làm mới mỗi khi hết hạn.
6. Lấy `user_id` Zalo của người sẽ nhận thông báo (thường là bạn hoặc sale): người đó cần **nhắn tin cho OA ít nhất 1 lần** trước (đây là yêu cầu bắt buộc của Zalo để OA được phép chủ động nhắn lại). Sau đó vào [trang quản trị OA](https://oa.zalo.me) → mục **Quản lý người quan tâm/Tin nhắn** → tìm cuộc hội thoại đó để lấy `user_id` (Zalo hiển thị trong chi tiết người dùng, hoặc lấy qua webhook nếu bạn có cấu hình).
7. Điền `user_id` đó vào biến `ZALO_NOTIFY_USER_ID` trên Render → redeploy.

Từ lúc này, mỗi lead mới từ form "Đặt số lượng lớn" sẽ tự động gửi một tin nhắn Zalo tới người trong `ZALO_NOTIFY_USER_ID`, kèm log ra console như cũ để dự phòng.

**Lưu ý:** dòng chữ ở cuối app "chưa nối Zalo OA thật" trong `public/index.html` nói về nút "Đặt qua Zalo" (mở cuộc trò chuyện Zalo cho khách) — nút đó đã trỏ tới `zalo.me/0904866869` thật rồi, câu chữ đó chỉ cần cập nhật/xoá khi bạn thấy phù hợp.

## Zalo Mini App

App này được nhúng vào Zalo Mini App bằng cách đóng gói `public/index.html` thành `public/inline.js` (chạy `npm run build:zalo` mỗi khi sửa `index.html`), cùng với `app-config.json` ở thư mục gốc — đây là 2 file mà **Zalo Mini App Studio** (extension trong VS Code) hoặc `zmp` CLI đọc để đóng gói và deploy lên hạ tầng của Zalo. Luồng này **tách biệt hoàn toàn** với việc deploy backend lên Render — Render chỉ phục vụ API (`/match`, `/wholesale-lead`) và bản PWA độc lập, còn Mini App chạy trên domain của Zalo và gọi API qua `API_BASE` trỏ thẳng về Render (đã cấu hình sẵn trong code).

Vì bước deploy/nộp duyệt Mini App bắt buộc phải đăng nhập tài khoản Zalo Developer của bạn (không thể thực hiện thay từ đây), tôi đã kiểm tra kỹ phần code có thể kiểm tra được và **không thấy lỗi** — cụ thể đã xác nhận: `npm run build:zalo` chạy sạch, `public/inline.js` sinh ra hợp lệ về cú pháp, `API_BASE` tự động trỏ đúng về Render khi chạy trên domain Zalo, và đã sửa một chỗ nhỏ (service worker không còn cố đăng ký khi chạy trong Mini App, tránh lỗi 404 vô ích trong console).

**Việc còn lại chỉ bạn làm được (cần đăng nhập Zalo):**

1. Mở project này bằng **Zalo Mini App Studio** (extension VS Code) hoặc `zmp` CLI, đăng nhập tài khoản Zalo Developer.
2. Chạy `npm run build:zalo` để chắc chắn `public/inline.js` là bản mới nhất trước khi sync/deploy.
3. Dùng chức năng **Preview/Test** của Zalo Mini App Studio để thử trực tiếp trong app Zalo trên điện thoại (quét QR).
4. Khi ưng ý, dùng chức năng **Deploy** trong Studio để đẩy bản build lên môi trường thử nghiệm/production của Zalo.
5. Nếu muốn công khai cho mọi người dùng (không chỉ tester): vào trang quản trị Mini App trên [Zalo Developers](https://developers.zalo.me), điền đầy đủ thông tin nộp duyệt — mô tả, danh mục, icon (đã có sẵn trong `public/icons/`), và **link chính sách bảo mật + điều khoản sử dụng** (bắt buộc — có thể dùng lại chính sách của quatangdatvang.com nếu đã có, hoặc cần soạn mới).

## Deploy lên Render (miễn phí)

Render sẽ tự build & chạy lại mỗi khi bạn push code mới lên GitHub.

**Chuẩn bị (làm 1 lần):**

1. Tạo tài khoản GitHub (nếu chưa có) tại github.com, tạo một repository mới (private hoặc public đều được), đặt tên ví dụ `qua-tang-app`.
2. Trong thư mục này, nối repo local với GitHub và đẩy code lên (thay `<URL-repo-cua-ban>` bằng URL repo vừa tạo):

   ```powershell
   git remote add origin <URL-repo-cua-ban>
   git branch -M main
   git push -u origin main
   ```

3. Tạo tài khoản Render tại render.com (đăng nhập bằng GitHub cho nhanh) → **New** → **Web Service** → chọn đúng repo `qua-tang-app`.
4. Điền cấu hình:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Vào tab **Environment** của service, thêm các biến:
   - `HARAVAN_PRIVATE_TOKEN` = (giá trị thật trong file `.env` của bạn)
   - `HARAVAN_API_BASE` = `https://apis.haravan.com/com`
   - `ADMIN_KEY` = (giá trị thật trong file `.env` của bạn)
   - `DATABASE_URL` = (connection string Supabase — xem mục "Lưu lead vào database thật" bên dưới; có thể thêm sau, không bắt buộc để chạy được)
   - `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_NOTIFY_USER_ID` = (xem mục "Nối Zalo OA thật" bên dưới; cũng có thể thêm sau)
6. Bấm **Create Web Service**. Render build xong sẽ cho một URL công khai dạng `https://qua-tang-app-xxxx.onrender.com` — đây là link bạn có thể chia sẻ cho khách dùng thử ngay.

**Lưu ý về gói miễn phí:**
- Sau 15 phút không ai truy cập, service tự "ngủ" — lượt truy cập đầu tiên sau đó sẽ chậm khoảng 30-60 giây trong khi Render khởi động lại. Các lượt sau bình thường cho đến lần "ngủ" tiếp theo.
- `data/leads.json` **không đảm bảo được giữ lại lâu dài** trên gói free — mỗi lần Render build lại (khi bạn push code mới), ổ đĩa có thể bị reset. Trước khi có Zalo OA hoặc database thật, nên kiểm tra `/admin/leads` thường xuyên, đừng chỉ tin tưởng vào file này về lâu dài.
- Muốn hết bị "ngủ" và có lưu trữ ổn định hơn, sau này nâng lên gói trả phí (~$7/tháng) hoặc chuyển `data/leads.json` sang một database thật (Postgres/Supabase) — việc này để làm sau khi đã thử nghiệm ổn.
