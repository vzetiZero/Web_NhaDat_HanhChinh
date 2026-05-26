# Migration Notes — CF Workers → Node.js

Tài liệu chi tiết những gì đã đổi và cần làm tiếp.

## Đã hoàn thành

### Code mới (backend/)
- ✅ 30+ file TS với cấu trúc module rõ ràng
- ✅ Prisma schema PostgreSQL (12 model: User, Device, Contract, ContractTemplate, GeneratedFile, AuditLog, Setting + 5 model chuẩn bị cho Agency)
- ✅ Express app với helmet/cors/compression/rate-limit/morgan
- ✅ Zod validation cho mọi input
- ✅ HttpError class + centralized error handler
- ✅ JWT auth (jose) + Argon2id password hashing
- ✅ Storage service wrapping Supabase Storage (upload/download/signed-url/delete)
- ✅ DOCX render với docxtemplater
- ✅ PDF render với Puppeteer (singleton browser)
- ✅ HTML render cho cả 4 văn bản (Hợp đồng + Tờ khai TNCN + LPTB + Đơn đăng ký)
- ✅ Address API với fuzzy search (port từ CF code)
- ✅ Auth flow đầy đủ: register, login (với device binding), admin login, /me, logout
- ✅ Contracts: CRUD + generate (DOCX + PDF + HTML fallback) + signed download URL
- ✅ Files: signed URL + stream download với permission check
- ✅ Templates: admin upload DOCX (multer memory storage, limit 10MB)
- ✅ Admin: dashboard stats (7 ngày), audit log với filter, users management, reset device, suspend
- ✅ Seed script (admin bootstrap + template placeholder record)
- ✅ Bucket auto-create lúc boot (idempotent)

### Code cũ (giữ lại)
- `src/worker.js`, `src/backend/`, `src/frontend/`, `src/admin/`, `wrangler.jsonc` — **không đổi**
- Có thể chạy song song để so sánh hành vi

## Cần làm tiếp

### 1. Frontend integration
Frontend hiện tại (`src/frontend/`) gọi API kiểu Cloudflare route. Cần update:

```js
// src/frontend/components/layout.js
const API_BASE = window.__API_BASE__ || '/api'; // → thay bằng import.meta.env.VITE_API_URL nếu Vite

window.api = async function(path, opts = {}) {
  // ...
  const res = await fetch(API_BASE + path, ...);
}
```

Hoặc tách hẳn frontend ra `/frontend` folder dùng Vite + React (đề xuất giai đoạn 2).

### 2. Endpoint name changes

| Frontend cũ gọi | Endpoint backend mới |
|---|---|
| `POST /api/contracts/:id/render` | `POST /api/contracts/:id/generate` |
| `GET /api/contracts/:id/download/docx` | `GET /api/files/:fileId/download` (lấy fileId từ response generate) |
| `GET /api/contracts/:id/download/pdf` | `GET /api/files/:fileId/download` |
| `GET /api/setup` | Không còn. Dùng `npm run db:seed`. |
| `POST /admin/api/templates` | `POST /api/admin/templates` |

### 3. Land Agency suggestion system (Phase 2)

Schema đã có sẵn (Province, DistrictOld, Commune, LandAgency, AgencyAlias, UserAgencyHistory, UserAgencySuggestion). Cần build:

- `src/modules/agencies/`
  - `agencies.service.ts`: 
    - `suggest({ province, district_old, keyword })` — fuzzy search với scoring (xem design doc bên dưới)
    - `confirm(userId, agencyId, rawInput, ...)` — lưu user history
    - `suggestNew(userId, rawInput, ...)` — lưu user_agency_suggestions chờ admin
  - `agencies.routes.ts`:
    - `GET /api/agencies/suggest`
    - `POST /api/agencies/confirm`
    - `POST /api/agencies/suggest-new`
    - `GET /api/admin/agencies/pending` (admin review)
    - `POST /api/admin/agencies/:id/approve|reject|merge`
- Seed data ban đầu: `prisma/seed-agencies.ts` với ~63 tỉnh × 5-10 cơ quan = ~500 records
- Dictionary viết tắt (VPĐKĐĐ, CN, H, TP, ...) — file static

**Scoring** (port từ design doc):
- +50 trùng tỉnh, +30 trùng huyện cũ, +20 trùng xã
- +40 fuzzy match tên cơ quan
- +30 admin_verified, +20 user dùng trước, +10 nhiều user xác nhận
- -30 chưa xác minh

### 4. Backend tests

Chưa có test suite. Đề xuất:
- `vitest` cho unit tests (services, utils)
- `supertest` + Prisma transaction rollback cho integration tests
- Test priority: auth, contracts.render, agencies.suggest

### 5. Production hardening

- [ ] Sentry integration cho error tracking
- [ ] Structured JSON logs (pino) thay morgan + console
- [ ] Health check với DB ping (`SELECT 1`)
- [ ] Graceful shutdown đã có, nhưng cần test với load
- [ ] Dockerfile + docker-compose cho dev với Postgres local
- [ ] CI/CD: GitHub Actions chạy tsc, prisma generate, lint
- [ ] Rate limit chi tiết hơn (login chậm hơn, contract generate chậm hơn vì heavy)

### 6. Cleanup CF Workers code

Sau khi frontend đã trỏ về Node backend và test ok:
- Xóa `wrangler.jsonc`, `src/worker.js`
- Move `src/frontend/` → `frontend/` (top-level)
- Move `src/admin/` → `frontend/admin/`
- Hoặc giữ lại trong `workers-legacy/` để reference 6 tháng đầu

## Quick verify

```bash
cd backend
npm install
cp .env.example .env
# Điền DATABASE_URL, SUPABASE_*, JWT_SECRET, ENCRYPTION_KEY
npx prisma migrate dev --name init
npm run db:seed
npm run dev

# Test health
curl http://localhost:3000/healthz

# Test admin login
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"ChangeMe@123"}'

# Trả về { success: true, token: "...", user: { id, email, is_admin: true } }

# Test provinces
curl http://localhost:3000/api/address/provinces | head -c 300
```

## Files Changed Summary

**Tạo mới** (backend/):
- `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `README.md`, `MIGRATION_NOTES.md`
- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/index.ts`, `src/app.ts`
- `src/config/env.ts`
- `src/lib/{prisma,supabase,logger,http-error}.ts`
- `src/middleware/{auth,error,validate}.ts`
- `src/services/{storage,docx,pdf,html}.service.ts`
- `src/utils/{password,crypto,number-to-vietnamese,format}.ts`
- `src/modules/auth/{auth.schemas,auth.service,auth.routes}.ts`
- `src/modules/users/{users.service,users.routes}.ts`
- `src/modules/contracts/{contracts.schemas,contracts.service,contracts.routes}.ts`
- `src/modules/templates/{templates.service,templates.routes}.ts`
- `src/modules/files/{files.service,files.routes}.ts`
- `src/modules/address/address.routes.ts`
- `src/modules/admin/admin.routes.ts`
- `src/data/vn-wards.ts`, `src/data/vn-wards-source.ts` (copy)

**Không đổi**:
- Toàn bộ `src/` (Cloudflare Workers code) — giữ để reference

**Sẽ xóa sau khi verify**:
- `src/worker.js`, `wrangler.jsonc`, `src/backend/`, `src/admin/` (chỉ giữ frontend nếu tách)
