# Warehouse Keeper Change Tracking with Detailed History

## Overview
This document describes the enhanced change tracking system for spare parts managed by Warehouse Keepers. The system now requires change reasons and provides detailed before/after value tracking for all modifications.

## Features Implemented

### 1. Mandatory Change Reason for Updates
When a Warehouse Keeper edits a spare part, they must now provide a reason for the change. This ensures accountability and helps administrators understand why modifications were made.

**Frontend Changes:**
- Added a required `changeReason` textarea field to the edit form
- The field appears only when editing (not when creating new items)
- Provides helpful placeholder text with examples in Arabic
- Visual indicator that the reason will be saved in the change log

**Backend Changes:**
- Added validation to require `changeReason` for all updates
- Returns error if change reason is empty or missing

### 2. Detailed Before/After Value Tracking

The system now tracks detailed before and after values for every changed field:

**Tracked Fields:**
- Name (الاسم)
- Present Pieces (عدد القطع)
- Unit Price (السعر)
- Currency (العملة)
- Description (الوصف)
- Quantity (الكمية)
- Department (القسم)

**Implementation:**
- Each field change creates a separate history entry with:
  - Field name (both English and Arabic)
  - Old value
  - New value
  - Change reason
  - User who made the change
- A summary entry is also created with all changes combined

### 3. Enhanced History Display

**Individual Part History Modal:**
- Shows detailed before/after values in a side-by-side comparison
- Red background for old values, green background for new values
- Displays change reason prominently in the description
- Shows user name and role for each change
- Includes timestamp with date and time

**Global Spare Parts Log (سجل):**
- Enhanced SparePartsLogModal with detailed change information
- Shows before/after values in expandable sections
- Color-coded change types (Created, Updated, Quantity Changed, Used in Request)
- Displays user information and timestamps
- Shows quantity changes with +/- indicators

### 4. Real-time Notifications with Details

**For Administrators:**
- Notifications now include the list of changed fields
- Change reason is included in the notification message
- Socket.IO emits detailed change information for real-time updates

**Notification Format:**
```
[Spare Part Name] - التغييرات: [List of changed fields] - السبب: [Change Reason]
```

## API Changes

### Updated Endpoints

#### PUT /api/storage/:id
**Request Body (new field):**
```typescript
{
  name: string;
  partNumber: string;
  unitPrice: number;
  quantity: number;
  presentPieces: number;
  currency: string;
  description?: string;
  departmentId?: number;
  changeReason: string; // NEW - Required for updates
}
```

**Response:**
- Same as before, but now creates detailed history entries

#### GET /api/storage/logs
**Response includes:**
```typescript
{
  success: true,
  data: {
    logs: [
      {
        id: number;
        sparePartId: number;
        changeType: string;
        description: string;
        fieldChanged?: string;
        oldValue?: string;
        newValue?: string;
        quantityChange?: number;
        createdAt: string;
        sparePart: {
          id: number;
          name: string;
          partNumber: string;
        };
        changedBy: {
          id: number;
          firstName: string;
          lastName: string;
        };
      }
    ]
  }
}
```

#### GET /api/storage/:id/history
**Response includes:**
- Same structure as above, but filtered to specific spare part
- Includes role information for changedBy user

## Database Schema

The existing `SparePartHistory` table already had the necessary fields:
- `fieldChanged` - Name of the changed field
- `oldValue` - Previous value (stored as string)
- `newValue` - New value (stored as string)
- `description` - Description including change reason
- `changedById` - User who made the change

No migration needed - the schema was already prepared for this feature.

## User Experience Flow

### Warehouse Keeper Workflow:
1. Click "تعديل" (Edit) button on a spare part
2. Modify desired fields in the form
3. **NEW:** Fill in the "سبب التعديل" (Change Reason) field
4. Submit the form
5. Changes are logged with detailed before/after values

### Administrator Workflow:
1. Receives real-time notification about the change
2. Notification shows which fields were changed and why
3. Can view detailed history:
   - Click "السجل" (Log) button on any spare part
   - See all changes with before/after values
   - See change reasons for each modification
4. Can also view global log via "سجل قطع الغيار" button

## Benefits

1. **Accountability**: Every change requires a reason, creating clear audit trails
2. **Transparency**: Administrators can see exactly what changed and why
3. **Compliance**: Detailed logs help with inventory audits and compliance
4. **Debugging**: Easier to track down when and why inventory discrepancies occurred
5. **Training**: New warehouse keepers can learn from change history patterns

## Example Change Log Entry

```
محمد أحمد قام بتحديث السعر - السبب: تحديث السعر بسبب تغير سعر الموّرد

التغيير التفصيلي:
القيمة السابقة: 50000 SYP
القيمة الجديدة: 55000 SYP

بواسطة: محمد أحمد (أمين مستودع)
التاريخ: 1 أكتوبر، 2025، 3:45 م
```

## Implementation Files

### Frontend:
- `frontend/src/pages/storage/StoragePage.tsx`
  - Added changeReason state
  - Added change reason textarea to edit form
  - Enhanced history display with before/after comparison

- `frontend/src/components/SparePartsLogModal.tsx`
  - Enhanced to show detailed change information
  - Added before/after value display
  - Added user information display

### Backend:
- `backend/src/routes/storage.routes.ts`
  - Added changeReason parameter handling
  - Enhanced change tracking with detailed field comparisons
  - Creates multiple history entries per update

- `backend/src/services/sparePart.service.ts`
  - Updated logPartUpdate to accept changeReason and detailedChanges
  - Enhanced real-time notifications with detailed information
  - Updated getSparePartLogs to include changedBy information

## Testing Checklist

- [x] Warehouse Keeper can edit spare parts
- [x] Change reason field is required when editing
- [x] Form validation prevents empty change reasons
- [x] Detailed history entries are created for each field change
- [x] Before/after values are correctly stored
- [x] Individual part history shows detailed changes
- [x] Global log shows detailed changes
- [x] Administrators receive notifications with change details
- [x] User information is displayed in logs
- [x] Real-time updates work correctly

## Future Enhancements

Potential improvements for future versions:
1. Add filtering by change type in history view
2. Export change logs to Excel/PDF for auditing
3. Add change approval workflow for sensitive fields (e.g., price changes above a threshold)
4. Add bulk edit with change reasons
5. Implement change rollback functionality
6. Add search/filter in change logs by user, date range, or change reason

## Notes

- Change reasons are stored in Arabic to match the system language
- All timestamps use the Arabic-Syrian locale for consistency
- The system maintains backward compatibility with existing history entries
- Empty or null old values are displayed as "غير محدد" (Not specified)

