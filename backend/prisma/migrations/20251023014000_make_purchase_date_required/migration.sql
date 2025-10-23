-- Make purchaseDate required in requests table
-- This migration will fail if there are existing requests with NULL purchaseDate values
-- You may need to update existing records first

ALTER TABLE requests ALTER COLUMN purchase_date SET NOT NULL;
