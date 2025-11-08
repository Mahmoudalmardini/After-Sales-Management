-- Quick fix: Add serialNumber column to requests table
-- Run this manually if the migration doesn't apply automatically
-- For PostgreSQL:
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;

-- For SQLite (if still using SQLite):
-- ALTER TABLE "requests" ADD COLUMN "serialNumber" TEXT;

