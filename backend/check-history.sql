-- Check if we have any spare parts
SELECT COUNT(*) as total_spare_parts FROM spare_parts;

-- Check if we have any history records
SELECT COUNT(*) as total_history_records FROM spare_part_history;

-- Show sample history records with user info
SELECT 
  sph.id,
  sph.spare_part_id,
  sph.change_type,
  sph.description,
  sph.field_changed,
  sph.old_value,
  sph.new_value,
  sph.created_at,
  u.first_name,
  u.last_name,
  u.role
FROM spare_part_history sph
LEFT JOIN users u ON sph.changed_by_id = u.id
ORDER BY sph.created_at DESC
LIMIT 10;

-- If no history exists, create a test entry
-- First, get a spare part ID and user ID
SELECT 
  (SELECT id FROM spare_parts LIMIT 1) as spare_part_id,
  (SELECT id FROM users WHERE role = 'WAREHOUSE_KEEPER' LIMIT 1) as user_id;

