# qua-tang-app — Bước 1: Kết nối dữ liệu Haravan

Đây là bước đầu tiên trong [lộ trình kết nối dữ liệu thật](https://claude.ai/code/artifact/4d71fb8f-c9f5-4258-959f-ce3ad3b42bcf): xác nhận có thể đọc được dữ liệu sản phẩm từ quatangdatvang.com (Haravan) trước khi xây bất kỳ phần nào khác.

## Bước 1 — Thu hồi key cũ và tạo private app token mới

Vì có một chuỗi giống access token đã được dán vào cuộc trò chuyện trước đó, **coi như key đó đã lộ** — cần thu hồi và tạo mới trước khi dùng. Đăng nhập Haravan Admin bằng đúng **tài khoản chủ sở hữu cửa hàng** (owner) — quyền thấp hơn sẽ không thấy được mục này.

### A. Thu hồi token cũ (nếu có)

1. Ở menu bên trái của Admin, chọn **Apps**.
2. Bấm vào **Private app**.
3. Nếu thấy app/token đã tạo trước đó (dùng để lấy ra chuỗi key vừa dán vào chat) → tìm dòng token đó, bấm **nút thùng rác màu đỏ** để xoá. Token bị xoá sẽ ngừng hoạt động ngay lập tức.

### B. Tạo token mới, đúng quyền cần dùng

1. Vẫn trong màn hình **Apps → Private app**, bấm **Create new private app**.
2. Điền tên app — đặt tên dễ nhận biết, ví dụ `qua-tang-app-sync`.
3. Ở phần cấu hình quyền truy cập (permissions/scope), tìm nhóm quyền liên quan đến **Products** và tick:
   - **Read** cho **Products** (tương ứng scope `com.read_products`) — quyền này bao gồm luôn cả đọc Collections/bộ sưu tập, vì trên Haravan collection nằm chung nhóm quyền với product.
   - (Tuỳ chọn, có thể thêm sau) **Read** cho **Inventory** (`com.read_inventories`) nếu sau này cần đọc số lượng tồn kho.
   - **Không tick Write** cho bất kỳ mục nào — bước này chỉ cần đọc dữ liệu, không cần sửa/xoá gì trên cửa hàng.
4. Bấm **Save**.
5. Màn hình sẽ hiện ra **API key / access token** — bấm copy ngay. Nhiều hệ thống chỉ hiển thị đầy đủ token một lần duy nhất lúc tạo, nên copy và dán luôn vào `.env` (Bước 2 bên dưới) trước khi rời khỏi trang này, tránh phải tạo lại token khác.

Nguồn chính thức đã kiểm tra: [Get started with Haravan APIs](https://docs.haravan.com/docs/get-started/overview/) · [Private app authentication](https://docs.haravan.com/docs/tutorials/authentication/private-app/) · [Access scopes](https://docs.haravan.com/docs/omni-apis/access-scopes/)

**Lưu ý quan trọng:** token này chỉ dán vào file `.env` trên máy bạn (bước 2), **không** dán lại vào khung chat.

## Bước 2 — Điền token vào file `.env`

Trong thư mục này (`C:\Users\Admin\qua-tang-app`):

1. Sao chép file `.env.example` thành `.env`.
2. Mở `.env`, dán token vừa copy vào dòng `HARAVAN_PRIVATE_TOKEN=`.
3. File `.env` đã được khai báo trong `.gitignore` nên sẽ không bao giờ bị đưa lên git.

Cách sao chép nhanh bằng PowerShell (chạy trong thư mục `qua-tang-app`):

```powershell
Copy-Item .env.example .env
notepad .env
```

## Bước 3 — Chạy thử kết nối

```powershell
npm run test:haravan
```

Kết quả mong đợi: danh sách 5 sản phẩm đầu tiên (tên, giá, tags) lấy trực tiếp từ quatangdatvang.com.

- Nếu báo lỗi HTTP 401/403 → token sai hoặc chưa đủ quyền đọc sản phẩm — quay lại Bước 1 kiểm tra scope.
- Nếu báo lỗi khác → gửi lại nguyên văn thông báo lỗi (không phải token) để debug tiếp.

## Bước 4 — Đồng bộ toàn bộ catalogue

Sau khi `npm run test:haravan` chạy ra 5 sản phẩm mẫu, chạy tiếp:

```powershell
npm run sync:catalogue
```

Script này sẽ:
- Lấy **toàn bộ** sản phẩm (phân trang tự động, không giới hạn 5 nữa).
- Lấy toàn bộ collection ("Theo dịp", "Theo đối tượng", "Bộ sưu tập phong thuỷ"...).
- Đối chiếu từng sản phẩm thuộc collection nào.
- Ghi kết quả ra `data/collections.json` và `data/products.json` (thư mục `data/` đã nằm trong `.gitignore`, không lên git — vì đây là dữ liệu tạm để phát triển, sẽ đồng bộ định kỳ chứ không phải nguồn dữ liệu gốc).

Chạy xong, mở thử `data/collections.json` để xem tên các collection thật — đây sẽ là căn cứ cho bước tiếp theo: map collection sang occasion/relationship/style của app.

## Sau bước này

1. ✅ Kết nối Haravan API.
2. ✅ Đồng bộ toàn bộ catalogue + collection về máy.
3. ⬜ Viết bảng map collection → occasion/relationship/style (dựa trên tên collection thật lấy được ở Bước 4).
4. ⬜ Dựng API `/match` để prototype gọi vào thay vì dùng dữ liệu mẫu.
5. ⬜ Chuyển từ file JSON sang database thật (Postgres/Supabase) khi chuẩn bị lên môi trường thật.

Chưa cần làm hết — quay lại đây sau khi Bước 4 chạy thành công.
