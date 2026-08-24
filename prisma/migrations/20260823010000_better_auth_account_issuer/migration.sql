-- Better Auth requires accounts.issuer and looks credentials up by
-- (issuer, accountId). The initial Better Auth migration omitted the column
-- and keyed the unique index on (provider_id, account_id), so every
-- email/password sign-in failed with "User not found".

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "issuer" TEXT;

-- Existing rows were all created by the credential backfill.
UPDATE "accounts" SET "issuer" = 'local:' || "provider_id" WHERE "issuer" IS NULL;

ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;

DROP INDEX IF EXISTS "accounts_provider_id_account_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_issuer_account_id_key" ON "accounts"("issuer", "account_id");
