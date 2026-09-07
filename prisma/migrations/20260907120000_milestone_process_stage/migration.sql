-- CreateEnum
CREATE TYPE "ProcessStage" AS ENUM ('DISCOVERY', 'DESIGN', 'QUOTE', 'BACKEND', 'LAUNCH');

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN "stage" "ProcessStage" NOT NULL DEFAULT 'DISCOVERY';

-- Backfill from existing names that matched the five process stages
UPDATE "milestones"
SET "stage" = 'DISCOVERY'
WHERE lower(name) LIKE '%discover%' OR lower(name) LIKE '%research%' OR lower(name) LIKE '%kickoff%' OR lower(name) LIKE '%requirement%';

UPDATE "milestones"
SET "stage" = 'DESIGN'
WHERE lower(name) LIKE '%design%' OR lower(name) LIKE '%wireframe%' OR lower(name) LIKE '%mockup%' OR lower(name) LIKE '%prototype%' OR lower(name) LIKE '%ux%';

UPDATE "milestones"
SET "stage" = 'QUOTE'
WHERE lower(name) LIKE '%quote%' OR lower(name) LIKE '%planning%' OR lower(name) LIKE '%plan%' OR lower(name) LIKE '%estimat%';

UPDATE "milestones"
SET "stage" = 'BACKEND'
WHERE lower(name) LIKE '%backend%' OR lower(name) LIKE '%craft%' OR lower(name) LIKE '%develop%' OR lower(name) LIKE '%api%' OR lower(name) LIKE '%architect%';

UPDATE "milestones"
SET "stage" = 'LAUNCH'
WHERE lower(name) LIKE '%test%' OR lower(name) LIKE '%launch%' OR lower(name) LIKE '%uat%' OR lower(name) LIKE '%beta%' OR lower(name) LIKE '%release%';

-- CreateIndex
CREATE INDEX "milestones_project_id_stage_sort_order_idx" ON "milestones"("project_id", "stage", "sort_order");
