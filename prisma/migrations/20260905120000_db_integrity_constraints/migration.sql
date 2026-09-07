-- Duplicate sub-team names under the same client: keep the oldest, suffix the rest.
WITH ranked_teams AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY client_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM client_sub_teams
)
UPDATE client_sub_teams t
SET name = t.name || '-' || substring(t.id::text, 1, 8)
FROM ranked_teams r
WHERE t.id = r.id AND r.rn > 1;

-- Blank emails cannot share a unique index with other blanks.
UPDATE clients SET email = NULL WHERE email IS NOT NULL AND btrim(email) = '';

-- Duplicate client emails: keep the oldest row, suffix later copies so login binding stays unique.
WITH ranked_emails AS (
  SELECT id,
         email,
         ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn
  FROM clients
  WHERE email IS NOT NULL
)
UPDATE clients c
SET email = c.email || '.dup-' || substring(c.id::text, 1, 8)
FROM ranked_emails r
WHERE c.id = r.id AND r.rn > 1;

-- Duplicate role names within a sub-team.
WITH ranked_roles AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY sub_team_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM client_sub_team_roles
)
UPDATE client_sub_team_roles t
SET name = t.name || '-' || substring(t.id::text, 1, 8)
FROM ranked_roles r
WHERE t.id = r.id AND r.rn > 1;

DROP INDEX IF EXISTS "clients_email_idx";
DROP INDEX IF EXISTS "client_sub_teams_client_id_idx";

CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

CREATE UNIQUE INDEX "client_sub_teams_client_id_name_key" ON "client_sub_teams"("client_id", "name");

DROP INDEX IF EXISTS "client_sub_team_roles_sub_team_id_idx";

CREATE UNIQUE INDEX "client_sub_team_roles_sub_team_id_name_key" ON "client_sub_team_roles"("sub_team_id", "name");
