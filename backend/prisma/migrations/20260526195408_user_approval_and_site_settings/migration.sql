-- Migration: user approval workflow + site settings + admin notifications
-- 1. Đổi UserStatus enum: active/suspended/deleted → pending/approved/rejected/blocked
--    Map dữ liệu cũ: active→approved, suspended→blocked, deleted→blocked

-- 1.1. Tạo enum mới với tên tạm
CREATE TYPE "UserStatus_new" AS ENUM ('pending', 'approved', 'rejected', 'blocked');

-- 1.2. Tháo default cũ
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;

-- 1.3. Chuyển kiểu cột + map dữ liệu
ALTER TABLE "users"
  ALTER COLUMN "status" TYPE "UserStatus_new"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'approved'::"UserStatus_new"
      WHEN 'suspended' THEN 'blocked'::"UserStatus_new"
      WHEN 'deleted' THEN 'blocked'::"UserStatus_new"
      ELSE 'pending'::"UserStatus_new"
    END
  );

-- 1.4. Swap tên enum
DROP TYPE "UserStatus";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";

-- 1.5. Đặt default mới
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'pending';

-- 2. Thêm cột mới cho User
ALTER TABLE "users"
  ADD COLUMN "register_note" TEXT,
  ADD COLUMN "reject_reason" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "approved_by_id" INTEGER;

ALTER TABLE "users"
  ADD CONSTRAINT "users_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_status_idx" ON "users"("status");

-- 3. SiteSettings (singleton)
CREATE TABLE "site_settings" (
  "id" SERIAL PRIMARY KEY,
  "site_name" TEXT NOT NULL DEFAULT 'Chứng Từ Nhà Đất',
  "site_logo_url" TEXT,
  "favicon_url" TEXT,
  "admin_phone" TEXT,
  "admin_zalo_url" TEXT,
  "admin_facebook_url" TEXT,
  "admin_telegram_url" TEXT,
  "admin_email" TEXT,
  "support_notice_title" TEXT,
  "support_notice_content" TEXT,
  "pending_user_message" TEXT,
  "rejected_user_message" TEXT,
  "modal_enabled" BOOLEAN NOT NULL DEFAULT false,
  "modal_title" TEXT,
  "modal_content" TEXT,
  "modal_button_text" TEXT,
  "modal_button_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- 4. AdminNotification
CREATE TYPE "AdminNotificationType" AS ENUM ('user_registered', 'agency_suggested', 'contract_created', 'other');

CREATE TABLE "admin_notifications" (
  "id" SERIAL PRIMARY KEY,
  "type" "AdminNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "target_user_id" INTEGER,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "admin_notifications_is_read_created_at_idx" ON "admin_notifications"("is_read", "created_at");
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");

-- 5. Seed default site settings row (id=1)
INSERT INTO "site_settings" ("site_name", "pending_user_message", "rejected_user_message", "updated_at")
VALUES (
  'Chứng Từ Nhà Đất',
  'Tài khoản của bạn đã được tạo và đang chờ quản trị viên duyệt. Vui lòng liên hệ admin để được hỗ trợ.',
  'Tài khoản của bạn chưa được phê duyệt. Vui lòng liên hệ admin để biết thêm chi tiết.',
  CURRENT_TIMESTAMP
);
