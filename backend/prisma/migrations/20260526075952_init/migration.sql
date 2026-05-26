-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'rendered', 'signed', 'archived');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('contract_docx', 'contract_pdf', 'contract_html', 'template', 'user_upload', 'other');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('land_registration_office', 'land_registration_branch', 'department_of_agriculture_environment', 'district_people_committee', 'province_people_committee', 'notary_office', 'tax_department', 'other');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('admin_verified', 'seed_data', 'user_confirmed', 'system_suggested');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('seed', 'import', 'user_input', 'admin_input');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('active', 'old_name', 'merged', 'archived');

-- CreateEnum
CREATE TYPE "AliasStatus" AS ENUM ('pending_review', 'user_confirmed', 'admin_verified', 'rejected');

-- CreateEnum
CREATE TYPE "SuggestionAdminStatus" AS ENUM ('pending', 'approved', 'rejected', 'merged');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_salt" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "cccd_encrypted" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "bound_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reset_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "admin_id" INTEGER,
    "event" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storage_bucket" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "field_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "contract_number" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "template_id" INTEGER NOT NULL,
    "form_data" JSONB NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "docx_file_id" INTEGER,
    "pdf_file_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_files" (
    "id" SERIAL NOT NULL,
    "kind" "FileKind" NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_by_id" INTEGER,
    "contract_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_current" TEXT NOT NULL,
    "name_old" TEXT,
    "status" TEXT NOT NULL DEFAULT 'current',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts_old" (
    "id" SERIAL NOT NULL,
    "province_id" INTEGER NOT NULL,
    "name_old" TEXT NOT NULL,
    "name_normalized" TEXT,
    "status" TEXT NOT NULL DEFAULT 'merged',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_old_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communes" (
    "id" SERIAL NOT NULL,
    "province_id" INTEGER NOT NULL,
    "district_old_id" INTEGER,
    "name_current" TEXT,
    "name_old" TEXT,
    "name_normalized" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_agencies" (
    "id" SERIAL NOT NULL,
    "official_name" TEXT NOT NULL,
    "name_normalized" TEXT,
    "short_name" TEXT,
    "province_id" INTEGER,
    "district_old_id" INTEGER,
    "agency_type" "AgencyType" NOT NULL,
    "parent_agency" TEXT,
    "status" "AgencyStatus" NOT NULL DEFAULT 'active',
    "trust_level" "TrustLevel" NOT NULL DEFAULT 'seed_data',
    "source_type" "SourceType" NOT NULL DEFAULT 'seed',
    "source_note" TEXT,
    "confirm_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_aliases" (
    "id" SERIAL NOT NULL,
    "agency_id" INTEGER NOT NULL,
    "alias_text" TEXT NOT NULL,
    "alias_normalized" TEXT,
    "source_type" "SourceType" NOT NULL DEFAULT 'user_input',
    "confirmed_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "status" "AliasStatus" NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agency_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agency_id" INTEGER NOT NULL,
    "province_id" INTEGER,
    "district_old_id" INTEGER,
    "raw_input" TEXT,
    "normalized_input" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_agency_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agency_suggestions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "raw_input" TEXT NOT NULL,
    "normalized_input" TEXT,
    "province_id" INTEGER,
    "district_old_id" INTEGER,
    "suggested_agency_id" INTEGER,
    "user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "admin_status" "SuggestionAdminStatus" NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "user_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_agency_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_admin_idx" ON "users"("is_admin");

-- CreateIndex
CREATE UNIQUE INDEX "devices_user_id_key" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "devices_fingerprint_idx" ON "devices"("fingerprint");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_idx" ON "audit_logs"("event");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_code_key" ON "contract_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_user_id_idx" ON "contracts"("user_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_created_at_idx" ON "contracts"("created_at");

-- CreateIndex
CREATE INDEX "generated_files_contract_id_idx" ON "generated_files"("contract_id");

-- CreateIndex
CREATE INDEX "generated_files_kind_idx" ON "generated_files"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE INDEX "provinces_name_current_idx" ON "provinces"("name_current");

-- CreateIndex
CREATE INDEX "districts_old_province_id_name_old_idx" ON "districts_old"("province_id", "name_old");

-- CreateIndex
CREATE INDEX "districts_old_name_normalized_idx" ON "districts_old"("name_normalized");

-- CreateIndex
CREATE INDEX "communes_province_id_idx" ON "communes"("province_id");

-- CreateIndex
CREATE INDEX "communes_name_normalized_idx" ON "communes"("name_normalized");

-- CreateIndex
CREATE INDEX "land_agencies_province_id_district_old_id_idx" ON "land_agencies"("province_id", "district_old_id");

-- CreateIndex
CREATE INDEX "land_agencies_name_normalized_idx" ON "land_agencies"("name_normalized");

-- CreateIndex
CREATE INDEX "land_agencies_agency_type_idx" ON "land_agencies"("agency_type");

-- CreateIndex
CREATE INDEX "land_agencies_status_trust_level_idx" ON "land_agencies"("status", "trust_level");

-- CreateIndex
CREATE INDEX "agency_aliases_alias_normalized_idx" ON "agency_aliases"("alias_normalized");

-- CreateIndex
CREATE INDEX "agency_aliases_status_idx" ON "agency_aliases"("status");

-- CreateIndex
CREATE INDEX "user_agency_history_user_id_idx" ON "user_agency_history"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_agency_history_user_id_agency_id_key" ON "user_agency_history"("user_id", "agency_id");

-- CreateIndex
CREATE INDEX "user_agency_suggestions_admin_status_idx" ON "user_agency_suggestions"("admin_status");

-- CreateIndex
CREATE INDEX "user_agency_suggestions_normalized_input_idx" ON "user_agency_suggestions"("normalized_input");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_docx_file_id_fkey" FOREIGN KEY ("docx_file_id") REFERENCES "generated_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "generated_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts_old" ADD CONSTRAINT "districts_old_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communes" ADD CONSTRAINT "communes_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communes" ADD CONSTRAINT "communes_district_old_id_fkey" FOREIGN KEY ("district_old_id") REFERENCES "districts_old"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_agencies" ADD CONSTRAINT "land_agencies_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_agencies" ADD CONSTRAINT "land_agencies_district_old_id_fkey" FOREIGN KEY ("district_old_id") REFERENCES "districts_old"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_aliases" ADD CONSTRAINT "agency_aliases_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "land_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_history" ADD CONSTRAINT "user_agency_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_history" ADD CONSTRAINT "user_agency_history_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "land_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_history" ADD CONSTRAINT "user_agency_history_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_history" ADD CONSTRAINT "user_agency_history_district_old_id_fkey" FOREIGN KEY ("district_old_id") REFERENCES "districts_old"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_suggestions" ADD CONSTRAINT "user_agency_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_suggestions" ADD CONSTRAINT "user_agency_suggestions_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_suggestions" ADD CONSTRAINT "user_agency_suggestions_district_old_id_fkey" FOREIGN KEY ("district_old_id") REFERENCES "districts_old"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agency_suggestions" ADD CONSTRAINT "user_agency_suggestions_suggested_agency_id_fkey" FOREIGN KEY ("suggested_agency_id") REFERENCES "land_agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
