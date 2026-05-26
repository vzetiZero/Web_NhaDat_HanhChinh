# Chứng Từ Nhà Đất

Web app tạo Hợp đồng tặng quyền sử dụng đất kèm tài sản gắn liền với đất.
Chạy trên **Cloudflare Workers + D1 (SQLite) + R2** với code **Vanilla JavaScript** thuần (không TypeScript, không build step).

## Tính năng

- **Auth + Device binding**: 1 tài khoản gắn với 1 thiết bị duy nhất (fingerprint qua FingerprintJS). Admin có thể reset.
- **Form đa bước**: 6 bước (thông tin chung → bên A → bên B → thửa đất → điều khoản → preview).
- **Validation**: CCCD 9/12 chữ số, SĐT VN, năm sinh, ngày tháng, dữ liệu địa chỉ hành chính 2025 (đã bỏ cấp huyện).
- **Xuất DOCX + PDF**: DOCX render bằng `docxtemplater`, PDF qua Cloudflare Browser Rendering (fallback HTML).
- **Admin panel**: dashboard, quản lý user, hợp đồng, mẫu (upload DOCX), audit log.
- **Audit log**: ghi mọi sự kiện quan trọng (login, login_blocked_device, contract_created, admin_reset_device...).

## Yêu cầu

- Node.js 18+ (cho wrangler)
- Tài khoản Cloudflare (free plan đủ cho dev; Browser Rendering cần Paid plan $5/tháng — fallback HTML nếu chưa bật).

## Cài đặt

```bash
npm install
```

## Tạo D1 database

```bash
npx wrangler d1 create chungtu-nhadat-db
# Copy database_id vào wrangler.jsonc
```

## Tạo R2 bucket

```bash
npx wrangler r2 bucket create chungtu-nhadat-files
```

## Khởi tạo schema

Cách 1 — qua wrangler:
```bash
npm run db:init           # local
npm run db:init:remote    # production
```

Cách 2 — qua endpoint (sau khi dev/deploy):
```bash
curl http://localhost:8787/api/setup
```

## Đặt secrets

```bash
npx wrangler secret put JWT_SECRET                   # random 64 ký tự
npx wrangler secret put ENCRYPTION_KEY               # 32 bytes cho AES-GCM
npx wrangler secret put TELEGRAM_BOT_TOKEN           # (tùy chọn)
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TURNSTILE_SECRET             # nếu bật Turnstile
npx wrangler secret put ADMIN_BOOTSTRAP_EMAIL        # vd: admin@yourcompany.vn
npx wrangler secret put ADMIN_BOOTSTRAP_PASSWORD     # đặt mạnh, đổi ngay sau setup
```

Hoặc tạo file `.dev.vars` cho local:
```
JWT_SECRET=dev-secret-please-change
ENCRYPTION_KEY=dev-encryption-key-32-bytes-long
ADMIN_BOOTSTRAP_EMAIL=admin@local
ADMIN_BOOTSTRAP_PASSWORD=admin@123456
```

## Chạy local

```bash
npm run dev
# Mở http://localhost:8787
# Gọi 1 lần: http://localhost:8787/api/setup
# Admin login: /admin (dùng ADMIN_BOOTSTRAP_EMAIL)
```

## Upload DOCX template

Sau khi setup xong, admin cần upload template `.docx` có placeholder. Mẫu placeholder hợp lệ:

```
HỢP ĐỒNG TẶNG QUYỀN SỬ DỤNG ĐẤT
Số: {contractNumber}

Hôm nay, ngày {ngayKy}, tại {noiKy}...

Bên A: {benA.hoTen}, năm sinh {benA.namSinh}
CCCD: {benA.cccd}, cấp ngày {benA.ngayCapCCCD} tại {benA.noiCapCCCD}
Hộ khẩu: {benA.hoKhau}

Bên B: {benB.hoTen}, năm sinh {benB.namSinh}
...

Thửa đất số {thuaDat.thuaDatSo}, tờ bản đồ {thuaDat.toBanDoSo}
Địa chỉ: {thuaDat.diaChi}
Diện tích: {thuaDat.dienTich} m²
Mục đích: {thuaDat.mucDichSuDung}
...

Giá trị: {thuaDat.giaTri} VNĐ
(Bằng chữ: {thuaDat.giaTriBangChu})

Bên chịu thuế: {dieuKhoan.benChiuThue}
```

Sau khi soạn `.docx` xong, vào `/admin` → Mẫu hợp đồng → Upload, đặt code = `HD_TANG_QSDD_V1`.

## Deploy

```bash
npm run deploy
```

## Cấu trúc folder

```
src/
├── worker.js                  # Entry point
├── config/                    # config, schema, routes
├── backend/
│   ├── router.js              # URL matching
│   ├── api/                   # Request handlers
│   ├── db/                    # D1 queries
│   ├── middleware/            # auth, admin, cors, device-check
│   └── utils/                 # JWT, validation, docx, pdf, ...
├── admin/                     # Admin SPA (vanilla JS, dark theme)
├── frontend/                  # User pages (vanilla JS, light theme)
└── data/                      # vn-wards 2025
```

## API endpoints chính

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/setup` | Init DB + bootstrap admin |
| POST | `/api/auth/register` | Đăng ký + bind device |
| POST | `/api/auth/login` | Login + check device |
| GET | `/api/auth/me` | Lấy user hiện tại |
| GET | `/api/address/provinces` | List tỉnh/thành |
| GET | `/api/address/wards?province=...` | List xã/phường |
| POST | `/api/contracts` | Tạo hợp đồng (draft hoặc final) |
| POST | `/api/contracts/:id/render` | Render DOCX + PDF |
| GET | `/api/contracts/:id/download/:format` | Tải file |
| POST | `/admin/api/auth/login` | Admin login |
| POST | `/admin/api/users/:id/reset-device` | Reset device |
| POST | `/admin/api/templates` | Upload DOCX template |

## Bảo mật

- Mật khẩu hash bằng PBKDF2-SHA256 (100k iterations) + salt riêng.
- JWT HS256, ký bằng `JWT_SECRET`.
- CCCD mã hóa AES-GCM trước khi lưu.
- Mọi sự kiện quan trọng được ghi audit log.
- HTTPS bắt buộc (mặc định trên Cloudflare).
- Tuân thủ Nghị định 13/2023 về Bảo vệ dữ liệu cá nhân.

## Roadmap

- [ ] eKYC verify CCCD với Bộ Công An (VNPT/Viettel)
- [ ] SMS OTP khi đổi mật khẩu
- [ ] Chữ ký số (digital signature)
- [ ] Thêm các mẫu hợp đồng khác (mua bán, ủy quyền)
- [ ] Đa ngôn ngữ (EN cho người nước ngoài)
