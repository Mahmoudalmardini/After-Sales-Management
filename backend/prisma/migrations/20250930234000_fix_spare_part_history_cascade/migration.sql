-- AlterTable: Add onDelete CASCADE to spare_part_history foreign key

-- Drop the existing foreign key constraint
ALTER TABLE "spare_part_history" DROP CONSTRAINT IF EXISTS "spare_part_history_sparePartId_fkey";

-- Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE "spare_part_history" 
  ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
  FOREIGN KEY ("sparePartId") 
  REFERENCES "spare_parts"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;
