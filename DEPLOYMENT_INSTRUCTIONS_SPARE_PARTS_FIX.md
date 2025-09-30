# Deployment Instructions - Spare Parts Activity & Deletion Fix

## Issues Fixed

### 1. ✅ Spare Parts Deletion 502 Error
**Problem**: Backend crashes with 502 error when deleting spare parts
**Cause**: Missing `onDelete: Cascade` on foreign key constraint
**Fix**: Added cascade delete to `spare_part_history` table

### 2. ✅ Activity Widget Visibility
**Problem**: Admin and supervisors couldn't see spare parts activities on dashboard
**Fix**: Added `SparePartsActivity` component to Dashboard page

## Quick Deployment Steps

### Step 1: Push Changes to GitHub
```bash
git add .
git commit -m "Fix: Spare parts deletion 502 error and add activity widget to dashboard"
git push origin main
```

### Step 2: Wait for Railway Auto-Deploy
Railway will automatically detect the changes and start deploying.

### Step 3: Apply Database Migration
After Railway finishes deploying, you MUST apply the migration:

#### Option A: Using Railway CLI (Easiest)
```bash
railway login
railway link
railway run npx prisma migrate deploy
```

#### Option B: Using Railway Dashboard
1. Go to Railway dashboard → Your project → Backend service
2. Click on "Deployments" → Latest deployment
3. Click "View Logs" or open shell
4. Run: `npx prisma migrate deploy`

#### Option C: Using the Fix Script
In Railway shell:
```bash
node scripts/apply-cascade-fix.js
```

## Detailed Migration Commands

If you prefer to run SQL directly in Railway PostgreSQL:

1. Go to Railway → Your PostgreSQL database
2. Click "Data" tab
3. Click "Query" 
4. Run this SQL:

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

## Verification Steps

After deployment and migration:

### 1. Test Spare Parts Deletion
- Log in as Warehouse Keeper
- Go to Storage page (المخزن)
- Try to delete a spare part that is NOT used in requests
- ✅ Should succeed without 502 error
- ✅ Should see deletion activity in نشاط قطع الغيار

### 2. Test Activity Widget on Dashboard
- Log in as Admin
- Check Dashboard - should see "نشاط قطع الغيار" widget
- Log in as Supervisor  
- Check Dashboard - should see "نشاط قطع الغيار" widget
- Log in as Warehouse Keeper
- Check Dashboard - should see "نشاط قطع الغيار" widget

### 3. Test Activity Filters
- Click "اليوم" (Today) - should show today's activities
- Click "هذا الأسبوع" (This Week) - should show this week's activities
- Click "الكل" (All) - should show all activities
- Click refresh icon - should reload activities

## Files Changed

### Backend Changes
1. ✅ `backend/prisma/schema.prisma` - Added `onDelete: Cascade`
2. ✅ `backend/prisma/migrations/20250930234000_fix_spare_part_history_cascade/migration.sql` - Migration file
3. ✅ `backend/scripts/apply-cascade-fix.js` - Deployment script
4. ✅ `backend/dist/` - Rebuilt JavaScript files

### Frontend Changes
1. ✅ `frontend/src/pages/Dashboard.tsx` - Added SparePartsActivity component
2. ✅ `frontend/build/` - Rebuilt production files
3. ✅ `backend/dist/public/` - Updated frontend files

## What Each File Does

### Migration File
**Location**: `backend/prisma/migrations/20250930234000_fix_spare_part_history_cascade/migration.sql`
- Drops old foreign key constraint
- Adds new constraint with CASCADE behavior
- Allows spare parts to be deleted even with history records

### Fix Script
**Location**: `backend/scripts/apply-cascade-fix.js`
- Programmatic way to apply the migration
- Can be run directly in production
- Includes error handling and logging

### Dashboard Update
**Location**: `frontend/src/pages/Dashboard.tsx`
- Imports SparePartsActivity component
- Displays activity widget for authorized users
- Shows after stats grid, before recent requests

## Expected Behavior After Fix

### Deletion Flow
1. Warehouse Keeper clicks delete on a spare part
2. System checks if part is used in requests
3. If used → Shows error "Cannot delete spare part that is used in requests"
4. If not used:
   - Logs deletion to history (DELETED record)
   - Deletes the spare part
   - CASCADE deletes all history records
   - Sends notifications to managers
   - Returns success message

### Activity Display
- **Dashboard** (Admin, Supervisor, Warehouse Keeper):
  - Shows نشاط قطع الغيار widget
  - Displays latest 100 activities
  - Filter by: Today, This Week, All
  - Auto-refreshes on filter change

- **Storage Page** (Warehouse Keeper):
  - Shows نشاط قطع الغيار widget
  - Same functionality as dashboard

## Rollback Plan

If something goes wrong, you can rollback:

### 1. Rollback Code (GitHub)
```bash
git revert HEAD
git push origin main
```

### 2. Rollback Database (Remove CASCADE)
```sql
ALTER TABLE "spare_part_history" 
DROP CONSTRAINT "spare_part_history_sparePartId_fkey";

ALTER TABLE "spare_part_history" 
ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
FOREIGN KEY ("sparePartId") 
REFERENCES "spare_parts"("id");
```

⚠️ **Warning**: Rollback will bring back the 502 deletion error!

## Troubleshooting

### Issue: Migration fails with "constraint already exists"
**Solution**: The migration is idempotent, it uses `IF EXISTS`. Just run it again.

### Issue: Still getting 502 on deletion
**Check**:
1. Did you apply the migration?
2. Check Railway logs for actual error
3. Verify foreign key constraint exists with CASCADE

**Verify constraint**:
```sql
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'spare_part_history'
  AND tc.constraint_type = 'FOREIGN KEY';
```

Should show `delete_rule = 'CASCADE'`

### Issue: Activity widget not showing on dashboard
**Check**:
1. Did frontend rebuild complete?
2. Is frontend build copied to `backend/dist/public`?
3. Clear browser cache (Ctrl+Shift+R)

### Issue: Permission denied errors
**Solution**: The activity widget checks user roles. Ensure user has one of:
- COMPANY_MANAGER
- DEPUTY_MANAGER
- DEPARTMENT_MANAGER
- SECTION_SUPERVISOR
- WAREHOUSE_KEEPER

## Success Criteria

All checks must pass:
- ✅ Can delete spare parts without 502 errors
- ✅ Deletion creates a DELETED activity record
- ✅ Activity widget visible on Dashboard for admins/supervisors
- ✅ Activity widget visible on Storage page for warehouse keeper
- ✅ Filters work (Today, Week, All)
- ✅ Refresh button works
- ✅ No console errors in browser
- ✅ No errors in Railway logs

## Summary

This deployment fixes two critical issues:
1. **Database constraint issue** causing 502 errors on deletion
2. **Missing activity widget** on dashboard for admins and supervisors

The fix is backward compatible and requires only a database migration to be applied after code deployment.

## Need Help?

If you encounter any issues during deployment:
1. Check Railway deployment logs
2. Check Railway PostgreSQL logs  
3. Check browser console (F12)
4. Verify migration was applied successfully
5. Test with different user roles

## Post-Deployment Monitoring

After deployment, monitor:
- Spare parts deletion success rate
- Activity widget load times
- Database query performance
- No 502 errors in logs
