-- Migration to change partNumber from String to Int
-- This migration converts existing partNumber values to integers

-- First, add a new temporary column
ALTER TABLE spare_parts ADD COLUMN partNumber_temp INTEGER;

-- Update the temporary column with converted values
-- For existing string part numbers, we'll try to extract numeric values
-- If no numeric value exists, we'll default to 0
UPDATE spare_parts 
SET partNumber_temp = CASE 
    WHEN partNumber ~ '^[0-9]+$' THEN CAST(partNumber AS INTEGER)
    ELSE 0
END;

-- Drop the old column
ALTER TABLE spare_parts DROP COLUMN partNumber;

-- Rename the temporary column
ALTER TABLE spare_parts RENAME COLUMN partNumber_temp TO partNumber;

-- Set NOT NULL constraint and default value
ALTER TABLE spare_parts ALTER COLUMN partNumber SET NOT NULL;
ALTER TABLE spare_parts ALTER COLUMN partNumber SET DEFAULT 0;
