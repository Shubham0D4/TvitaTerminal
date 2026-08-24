-- DropIndex
DROP INDEX "client_quotes_client_id_idx";

-- DropIndex
DROP INDEX "invoices_client_id_idx";

-- DropIndex
DROP INDEX "invoices_project_id_idx";

-- DropIndex
DROP INDEX "milestones_project_id_idx";

-- DropIndex
DROP INDEX "notifications_user_id_idx";

-- DropIndex
DROP INDEX "project_meetings_project_id_idx";

-- DropIndex
DROP INDEX "project_notes_project_id_idx";

-- DropIndex
DROP INDEX "project_tickets_project_id_idx";

-- DropIndex
DROP INDEX "project_updates_project_id_idx";

-- DropIndex
DROP INDEX "projects_client_id_idx";

-- DropIndex
DROP INDEX "tasks_project_id_idx";

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "client_quotes_client_id_created_at_idx" ON "client_quotes"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "invoices_client_id_issued_date_idx" ON "invoices"("client_id", "issued_date" DESC);

-- CreateIndex
CREATE INDEX "invoices_project_id_issued_date_idx" ON "invoices"("project_id", "issued_date" DESC);

-- CreateIndex
CREATE INDEX "milestones_project_id_client_visible_sort_order_idx" ON "milestones"("project_id", "client_visible", "sort_order");

-- CreateIndex
CREATE INDEX "project_meetings_host_id_idx" ON "project_meetings"("host_id");

-- CreateIndex
CREATE INDEX "project_meetings_project_id_scheduled_at_idx" ON "project_meetings"("project_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "project_notes_creator_id_idx" ON "project_notes"("creator_id");

-- CreateIndex
CREATE INDEX "project_notes_project_id_type_created_at_idx" ON "project_notes"("project_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "project_tickets_creator_id_idx" ON "project_tickets"("creator_id");

-- CreateIndex
CREATE INDEX "project_tickets_project_id_created_at_idx" ON "project_tickets"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_updates_project_id_client_visible_created_at_idx" ON "project_updates"("project_id", "client_visible", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_client_id_updated_at_idx" ON "projects"("client_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "projects_client_id_status_idx" ON "projects"("client_id", "status");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
