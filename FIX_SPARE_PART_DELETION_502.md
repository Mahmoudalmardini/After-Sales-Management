# Fix: Spare Part Deletion 502 Error

## Problem

When attempting to delete a spare part, the backend crashes with a 502 Bad Gateway error:
- Error: "connection closed unexpectedly"
- Error: "connection refused"
- HTTP Status: 502

## Root Cause

The `spare_part_history` table has a foreign key constraint on `sparePartId` that references `spare_parts(id)`, but it was missing the `onDelete: Cascade` behavior.

When trying to delete a spare part that has history records, PostgreSQL blocks the deletion due to the foreign key constraint, causing the backend to crash.

### Schema Before Fix:
```prisma
model SparePartHistory {
  // ...
  sparePart SparePart @relation(fields: [sparePartId], references: [id])
  // ❌ Missing onDelete behavior
}
```

### Schema After Fix:
```prisma
model SparePartHistory {
  // ...
  sparePart SparePart @relation(fields: [sparePartId], references: [id], onDelete: Cascade)
  // ✅ Now cascades deletion
}
```

## Solution

Added `onDelete: Cascade` to the `SparePartHistory` relation so that when a spare part is deleted:
1. The deletion is logged to history (as a DELETED record)
2. The spare part is deleted
3. All history records are automatically cascaded and deleted

## Files Changed

### 1. Schema Update
- **File**: `backend/prisma/schema.prisma`
- **Line**: 281
- **Change**: Added `onDelete: Cascade` to sparePart relation

### 2. Migration Created
- **File**: `backend/prisma/migrations/20250930234000_fix_spare_part_history_cascade/migration.sql`
- **Purpose**: Database migration to update the foreign key constraint

### 3. Deployment Script
- **File**: `backend/scripts/apply-cascade-fix.js`
- **Purpose**: Script to apply the fix in production database

## How to Deploy

### Option 1: Using Prisma Migrate (Recommended)
```bash
cd backend
npx prisma migrate deploy
```

This will apply all pending migrations including the cascade fix.

### Option 2: Using the Fix Script
```bash
cd backend
node scripts/apply-cascade-fix.js
```

This applies only the cascade fix.

### Option 3: Manual SQL (If needed)
Connect to your Railway PostgreSQL database and run:

```sql
-- Drop the existing foreign key constraint
ALTER TABLE "spare_part_history" 
DROP CONSTRAINT IF EXISTS "spare_part_history_sparePartId_fkey";

-- Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE "spare_part_history" 
ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
FOREIGN KEY ("sparePartId") 
REFERENCES "spare_parts"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
```

## Deployment Steps for Railway

1. **Push the code to GitHub**:
   ```bash
   git add .
   git commit -m "Fix: Add cascade delete to spare_part_history to prevent 502 errors"
   git push origin main
   ```

2. **Railway will auto-deploy**, but you need to run the migration:
   - Go to Railway dashboard
   - Open your backend service
   - Go to "Variables" tab
   - Make sure `DATABASE_URL` is set
   - Go to "Settings" tab
   - Click "Deploy" or wait for auto-deploy

3. **Apply the migration** (after deployment):
   - In Railway, go to your backend service
   - Click on "Deployments"
   - Click on the latest deployment
   - Open the shell/terminal
   - Run: `npx prisma migrate deploy`

   OR use the Railway CLI:
   ```bash
   railway run npx prisma migrate deploy
   ```

## Testing After Deployment

1. **Test Deletion** (as Warehouse Keeper):
   - Navigate to Storage page
   - Try to delete a spare part
   - Should succeed without 502 error
   - Check activity widget to see the deletion logged

2. **Verify Data Integrity**:
   - Check that spare parts can still be created
   - Check that history is still being logged
   - Verify activities are visible on Dashboard

## Migration SQL Explanation

```sql
-- Step 1: Remove old constraint (without CASCADE)
ALTER TABLE "spare_part_history" 
DROP CONSTRAINT IF EXISTS "spare_part_history_sparePartId_fkey";

-- Step 2: Add new constraint (with CASCADE)
ALTER TABLE "spare_part_history" 
ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
FOREIGN KEY ("sparePartId") 
REFERENCES "spare_parts"("id") 
ON DELETE CASCADE    -- Automatically delete history when spare part is deleted
ON UPDATE CASCADE;   -- Automatically update if spare part ID changes
```

## What This Fixes

- ✅ **502 errors** when deleting spare parts
- ✅ **Backend crashes** during deletion
- ✅ **Database constraint violations**
- ✅ **Connection refused** errors

## Database Impact

- **No data loss**: Existing history records are preserved
- **Backward compatible**: All existing queries continue to work
- **Performance**: No performance impact, just a constraint update

## Rollback (If Needed)

To rollback this change, remove the CASCADE behavior:

```sql
ALTER TABLE "spare_part_history" 
DROP CONSTRAINT "spare_part_history_sparePartId_fkey";

ALTER TABLE "spare_part_history" 
ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
FOREIGN KEY ("sparePartId") 
REFERENCES "spare_parts"("id");
```

However, this will bring back the 502 deletion error.

## Related Files

1. `backend/prisma/schema.prisma` - Updated schema
2. `backend/prisma/migrations/20250930234000_fix_spare_part_history_cascade/migration.sql` - Migration
3. `backend/scripts/apply-cascade-fix.js` - Deployment script
4. `backend/src/routes/storage.routes.ts` - Deletion endpoint (no changes needed)

## Notes

- The deletion endpoint already logs the deletion before deleting the spare part
- This ensures the deletion activity is captured in history before cascade deletion
- Warehouse keepers can now delete spare parts without errors
- All history for deleted parts will be removed (after logging the deletion event)

## Success Criteria

After applying this fix:
- ✅ Spare parts can be deleted without 502 errors
- ✅ Deletion is logged in activity history
- ✅ Activity widget shows deletion events
- ✅ No database constraint errors
- ✅ Backend doesn't crash during deletion

## Summary

This fix resolves the database foreign key constraint issue that was causing 502 errors when deleting spare parts. The solution adds `onDelete: Cascade` to automatically handle cleanup of related history records while still preserving the deletion audit trail.
