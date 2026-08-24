-- Better Auth generates its own primary keys (nanoid-style, e.g.
-- "6vD9vjxQihKMLzn6ofatLIfFkRTZsgty"), which are not valid UUIDs. The initial
-- Better Auth migration typed these columns as UUID, so session creation failed
-- with: invalid input syntax for type uuid.
--
-- user_id stays UUID — it references profiles.id, which is genuinely a UUID.

ALTER TABLE "sessions"      ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "accounts"      ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "verifications" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
