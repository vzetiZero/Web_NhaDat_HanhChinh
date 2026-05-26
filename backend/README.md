# Chứng Từ Nhà Đất — Backend (Node.js + Express + Prisma + Supabase)

Node.js backend được migrate từ Cloudflare Workers gốc (`/src` folder).
**Stack**: Express + TypeScript + Prisma (PostgreSQL) + Supabase Storage + Argon2 + Puppeteer.

## Yêu cầu

- **Node.js 20+**
- **PostgreSQL 14+** (qua Supabase, Railway, hoặc Docker local)
- **Supabase project** với 2 bucket: `contract-files`, `contract-templates`
- Chromium dependencies cho Puppeteer (xem [puppeteer docs](https://pptr.dev/troubleshooting))

## Setup local

```bash
cd backend
npm install
cp .env.example .env
# Điền giá trị thật vào .env (xem hướng dẫn dưới)

# Tạo schema database
npx prisma migrate dev --name init

# Seed admin + template record
npm run db:seed

# Chạy dev
npm run dev
# → http://localhost:3000
```

## Hướng dẫn tạo Supabase project

1. Tạo project tại https://supabase.com/dashboard
2. **Project Settings → API** → copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **giữ bí mật**
3. **Project Settings → Database → Connection string → URI** → copy → `DATABASE_URL`
4. **Storage** → tạo 2 bucket **private**:
   - `contract-files`
   - `contract-templates`
5. Điền tất cả vào `.env`

## Cấu trúc

```
backend/
├── prisma/
│   ├── schema.prisma            # Schema (Users, Devices, Contracts, Templates, Files, Audit, Address, Agency)
│   ├── migrations/              # Auto-generated bởi `prisma migrate`
│   └── seed.ts                  # Bootstrap admin + template record
├── src/
│   ├── index.ts                 # Entry - boot server
│   ├── app.ts                   # Express app factory
│   ├── config/env.ts            # Validated env (zod)
│   ├── lib/                     # prisma, supabase, logger, http-error
│   ├── middleware/              # auth (JWT), error, validate (zod), cors
│   ├── services/                # storage (Supabase), docx, pdf (puppeteer), html
│   ├── modules/
│   │   ├── auth/                # login, register, /me + admin login
│   │   ├── users/               # /api/device + admin user management
│   │   ├── contracts/           # CRUD + generate
│   │   ├── templates/           # admin upload DOCX template
│   │   ├── files/               # signed URL + stream download
│   │   ├── address/             # provinces, wards, fuzzy search
│   │   └── admin/               # dashboard, audit logs
│   ├── utils/                   # password (argon2), crypto (AES-GCM), number-to-vn, format
│   └── data/                    # vn-wards source data
└── package.json
```

## API Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/healthz` | - | Health check |
| POST | `/api/auth/register` | - | Register + bind device |
| POST | `/api/auth/login` | - | Login + check device |
| POST | `/api/auth/logout` | User | Logout |
| GET | `/api/auth/me` | User | Current user |
| GET | `/api/device/current` | User | Device hiện gắn |
| POST | `/api/device/request-reset` | User | Yêu cầu reset (gửi admin) |
| GET | `/api/address/provinces` | - | List 63 tỉnh/thành |
| GET | `/api/address/wards?province=` | - | List xã/phường |
| GET | `/api/address/search?q=` | - | Fuzzy search xã + tỉnh |
| GET | `/api/contracts` | User | List hợp đồng của tôi |
| POST | `/api/contracts` | User | Tạo hợp đồng (draft) |
| GET | `/api/contracts/:id` | User | Detail |
| PATCH | `/api/contracts/:id` | User | Update draft |
| DELETE | `/api/contracts/:id` | User | Delete draft |
| POST | `/api/contracts/:id/generate` | User | Render DOCX + PDF → trả signed URL |
| GET | `/api/contracts/:id/files` | User | List files đã render |
| GET | `/api/templates` | User | List template available |
| GET | `/api/templates/:id` | User | Template detail |
| GET | `/api/files/:id/signed-url` | User | Lấy signed URL có TTL |
| GET | `/api/files/:id/download` | User | Stream file từ backend |
| POST | `/api/admin/auth/login` | - | Admin login |
| GET | `/api/admin/dashboard` | Admin | Stats tổng quan |
| GET | `/api/admin/audit-logs` | Admin | Audit log với filter |
| GET | `/api/admin/users` | Admin | List users |
| GET | `/api/admin/users/:id` | Admin | User detail |
| POST | `/api/admin/users/:id/reset-device` | Admin | Reset device user |
| POST | `/api/admin/users/:id/suspend` | Admin | Khóa/mở khóa |
| GET | `/api/admin/contracts` | Admin | List tất cả contracts |
| GET | `/api/admin/templates` | Admin | List templates |
| POST | `/api/admin/templates` | Admin | Upload DOCX template (multipart/form-data) |

**Response format** thống nhất:
```json
{ "success": true, "data": {} }
{ "success": false, "error": "CODE", "message": "Mô tả VN", "details": [...] }
```

## Auth

- JWT HS256 ký bằng `JWT_SECRET`
- Header: `Authorization: Bearer <token>`
- Device binding: header `X-Device-Fingerprint` (sinh bằng FingerprintJS phía frontend)
- 1 user (non-admin) gắn với 1 device duy nhất. Admin có thể reset.
- Password: Argon2id (OWASP recommended), không phải bcrypt cũ.

## Deployment

### Railway

1. New Project → Deploy from GitHub
2. Root directory: `backend`
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma migrate deploy && npm run start`
5. Add env vars (xem `.env.example`)
6. Add **PostgreSQL** plugin (hoặc dùng Supabase DATABASE_URL)
7. Public domain → copy → frontend `VITE_API_URL=https://your-domain.railway.app/api`

### Render

Tương tự Railway:
- Build: `npm install && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm run start`
- Free tier ngủ sau 15 phút inactive — cân nhắc paid hoặc Railway

### Docker

```dockerfile
# Dockerfile (chưa kèm, có thể tạo sau)
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

## Frontend integration

Frontend (Vanilla JS hiện tại trong `/src/frontend`) cần sửa:

1. Đổi base URL: gọi `${VITE_API_URL}/auth/login` thay vì `/api/auth/login` cứng
2. Endpoint `/api/contracts/:id/render` → đổi thành `/api/contracts/:id/generate`
3. Response render trả về `download.docx.url` và `download.pdf.url` (signed URL từ Supabase)
4. Xóa logic gọi `/api/setup` (giờ chạy bằng `npm run db:seed` ở backend)

## Mapping cũ → mới

| CF Workers (cũ) | Node.js (mới) |
|---|---|
| `env.DB.prepare(...)` | `prisma.contract.findMany(...)` etc |
| `env.R2.put(key, data)` | `storage.upload({ bucket, key, body, contentType })` |
| `env.R2.get(key)` | `storage.download(bucket, key)` |
| `env.BROWSER` (Browser Rendering API) | `pdfService.renderFromHtml(html)` (Puppeteer) |
| Custom JWT với Web Crypto | `jose` package |
| PBKDF2 password | `argon2` package |
| `crypto.subtle.encrypt` AES-GCM | Node `crypto.createCipheriv('aes-256-gcm')` |
| `wrangler dev` | `npm run dev` (tsx watch) |
| `wrangler deploy` | Railway / Render / Docker |
| Setup qua `/api/setup` | `npm run db:seed` |

## Troubleshooting

**Lỗi `JWT_SECRET phải >= 32 ký tự`**: sinh ngẫu nhiên bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Puppeteer fail trên Linux**: cần Chromium dependencies. Trên Railway/Docker thêm:
```
apt-get install -y chromium fonts-liberation libnss3 libatk-bridge2.0-0 libgtk-3-0
```

**Supabase upload 403**: kiểm tra dùng `service_role` key (KHÔNG phải anon key). Bucket phải tồn tại — server tự tạo nếu thiếu, nhưng nếu thất bại thì tạo thủ công trong dashboard.

**Prisma migrate fail**: kiểm tra `DATABASE_URL` đúng format `postgresql://user:pass@host:port/db`. Supabase port là 5432 (session) hoặc 6543 (transaction pooler).

## TODO

- [ ] Phase tiếp theo: Land Agency suggestion system (đã có schema, thiếu API + admin UI)
- [ ] OpenAPI/Swagger docs
- [ ] Rate limit chi tiết theo endpoint
- [ ] Email notification (forgot password, contract created)
- [ ] Test suite (vitest/jest)
- [ ] Dockerfile production-ready
