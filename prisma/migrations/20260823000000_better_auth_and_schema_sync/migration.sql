-- Reconciles the migration history with schema.prisma and introduces Better Auth.
--
-- The recorded history predated several schema changes that had been applied to
-- live databases out-of-band (via the old bootstrap scripts), so this migration
-- carries both that backlog and the new auth tables.

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('INTERNAL_TEAM', 'EXTERNAL_CLIENT');
-- AlterEnum
BEGIN;
CREATE TYPE "TeamRole_new" AS ENUM ('TEAM_LEAD', 'MEMBER');
ALTER TABLE "profiles" ALTER COLUMN "team_role" TYPE "TeamRole_new" USING ("team_role"::text::"TeamRole_new");
ALTER TYPE "TeamRole" RENAME TO "TeamRole_old";
ALTER TYPE "TeamRole_new" RENAME TO "TeamRole";
DROP TYPE "public"."TeamRole_old";
COMMIT;
-- DropForeignKey
ALTER TABLE "client_approvals" DROP CONSTRAINT "client_approvals_client_id_fkey";
-- DropForeignKey
ALTER TABLE "client_approvals" DROP CONSTRAINT "client_approvals_created_by_fkey";
-- DropForeignKey
ALTER TABLE "client_approvals" DROP CONSTRAINT "client_approvals_project_id_fkey";
-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "bank_upi_id" TEXT,
ADD COLUMN     "company_state_code" TEXT,
ADD COLUMN     "default_sac_code" TEXT DEFAULT '998314';
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "external_platform_url" TEXT;
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "amount_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cgst_amount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igst_amount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "place_of_supply" TEXT,
ADD COLUMN     "po_number" TEXT,
ADD COLUMN     "reverse_charge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sgst_amount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "tax_type" TEXT NOT NULL DEFAULT 'INTRA_STATE';
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "magic_link_expires" TIMESTAMP(3),
ADD COLUMN     "magic_link_token" TEXT,
ADD COLUMN     "password_hash" TEXT;
-- DropTable
DROP TABLE "client_approvals";
-- DropEnum
DROP TYPE "ClientApprovalStatus";
-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "password" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "project_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'INTERNAL_TEAM',
    "creator_id" UUID NOT NULL,
    "allowed_profile_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_sub_team_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "project_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_tickets_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "project_meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meet_link" TEXT,
    "event_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "host_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_meetings_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "client_quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "counter_budget" DECIMAL(12,2),
    "counter_message" TEXT,
    "last_counter_by" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "client_quotes_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");
-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");
-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");
-- CreateIndex
CREATE INDEX "project_notes_project_id_idx" ON "project_notes"("project_id");
-- CreateIndex
CREATE INDEX "project_tickets_project_id_idx" ON "project_tickets"("project_id");
-- CreateIndex
CREATE INDEX "project_tickets_project_id_status_idx" ON "project_tickets"("project_id", "status");
-- CreateIndex
CREATE INDEX "project_meetings_project_id_idx" ON "project_meetings"("project_id");
-- CreateIndex
CREATE INDEX "client_quotes_client_id_idx" ON "client_quotes"("client_id");
-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);
-- CreateIndex
CREATE INDEX "invoices_client_id_status_idx" ON "invoices"("client_id", "status");
-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);
-- CreateIndex
CREATE INDEX "tasks_project_id_status_idx" ON "tasks"("project_id", "status");
-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_tickets" ADD CONSTRAINT "project_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_tickets" ADD CONSTRAINT "project_tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "client_quotes" ADD CONSTRAINT "client_quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Data migration ────────────────────────────────────────────────────────
-- Better Auth authenticates against accounts.password. Carry existing bcrypt
-- hashes across so no current user is locked out; lib/auth/config.ts overrides
-- the hasher to bcrypt to keep verifying them.
INSERT INTO "accounts" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id"::text, 'credential', p."id", p."password_hash", NOW(), NOW()
FROM "profiles" p
WHERE p."password_hash" IS NOT NULL
ON CONFLICT ("provider_id", "account_id") DO NOTHING;
