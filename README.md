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
- `scripts/` — các script đồng bộ dữ liệu từ Haravan (chỉ chạy ở máy local, không chạy trên server thật).
- `data/products.enriched.json` — dữ liệu sản phẩm đã xử lý, server dùng trực tiếp.
- `data/leads.json` — lead khách sỉ thu thập được (không đưa lên git).

## Xem danh sách lead khách sỉ

Vào `http://localhost:3000/admin/leads?key=...` (thay `...` bằng giá trị `ADMIN_KEY` trong file `.env`). Đường link này **không có bảo vệ nào khác ngoài key** — tuyệt đối không chia sẻ công khai.

Hiện tại lead mới chỉ được lưu vào `data/leads.json` và log ra console (`notifyNewLead` trong `server.js`) — chưa nối Zalo OA thật. Khi có tài khoản Zalo OA + API credentials, sửa hàm `notifyNewLead` trong `server.js` để gọi API Zalo, gửi thông báo tức thời cho sale.

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
6. Bấm **Create Web Service**. Render build xong sẽ cho một URL công khai dạng `https://qua-tang-app-xxxx.onrender.com` — đây là link bạn có thể chia sẻ cho khách dùng thử ngay.

**Lưu ý về gói miễn phí:**
- Sau 15 phút không ai truy cập, service tự "ngủ" — lượt truy cập đầu tiên sau đó sẽ chậm khoảng 30-60 giây trong khi Render khởi động lại. Các lượt sau bình thường cho đến lần "ngủ" tiếp theo.
- `data/leads.json` **không đảm bảo được giữ lại lâu dài** trên gói free — mỗi lần Render build lại (khi bạn push code mới), ổ đĩa có thể bị reset. Trước khi có Zalo OA hoặc database thật, nên kiểm tra `/admin/leads` thường xuyên, đừng chỉ tin tưởng vào file này về lâu dài.
- Muốn hết bị "ngủ" và có lưu trữ ổn định hơn, sau này nâng lên gói trả phí (~$7/tháng) hoặc chuyển `data/leads.json` sang một database thật (Postgres/Supabase) — việc này để làm sau khi đã thử nghiệm ổn.
