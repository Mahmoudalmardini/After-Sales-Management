# Spare Parts Logging and Request Management Update

## Date: 2025-09-30

### Changes Made:

#### 1. **Auto-Reopen Closed Requests on Technician Assignment**
- **File:** `backend/src/controllers/request.controller.ts`
- **Change:** When a technician is assigned to a closed request, the system now automatically changes the status from `CLOSED` to `NEW`
- **Details:**
  - Closed requests will reopen when a technician is assigned
  - Completed requests remain completed (no status change)
  - Activity logs now show when a closed request is reopened

#### 2. **Enhanced Spare Parts Activity Logging**
- **File:** `backend/src/routes/storage.routes.ts`
- **Changes:**
  - Added logging for currency changes
  - Added logging for department changes
  - Included currency field in spare part updates
  - Each field change is now tracked separately with old and new values
  - More detailed descriptions in Arabic for better clarity

#### 3. **Improved Spare Parts UI**
- **File:** `frontend/src/pages/storage/StoragePage.tsx`
- **UI Enhancements:**
  - Enhanced history modal with better visual design
  - Added icons for different change types (🆕 Create, ✏️ Update, 📦 Quantity Change, 🔧 Used in Request)
  - Display old and new values for updates
  - Show field names in Arabic
  - Added date/time formatting
  - Display user roles in the history
  - Show related request IDs when spare parts are used
  - Added visual indicator (yellow background) for recently updated items
  - Added "محدث" (Updated) badge for items updated within 24 hours

### How It Works:

1. **Request Reopening:**
   - When assigning a technician to a closed request, the status automatically changes to NEW
   - The activity log captures this with the message: "تم تعيين فني: [Name] (تم إعادة فتح الطلب المغلق)"

2. **Spare Parts Logging:**
   - Every change to spare parts is logged with:
     - Who made the change (user name and role)
     - What was changed (field name)
     - Old value → New value
     - Date and time of change
     - Related request ID (if applicable)

3. **UI Improvements:**
   - Click on any spare part to see details
   - Click "السجل" button to view complete history
   - Recently updated items are highlighted in yellow
   - History modal shows comprehensive change details

### Testing:
1. Assign a technician to a closed request - it should reopen
2. Update spare part details - check the history for detailed logs
3. Add spare parts to requests - verify logging shows request association
4. View spare parts table - recently updated items should be highlighted
