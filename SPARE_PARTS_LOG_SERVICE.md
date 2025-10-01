# Spare Parts Log Service (سجل قطع الغيار)

## Overview

A new simple logging service has been created to track spare parts activities without the complexity of the previous activity system. This service logs only the essential operations:

1. **When spare parts are used in requests** 🔧
2. **When warehouse keeper updates spare part information** ✏️

## Features

### 📋 سجل Button
- Added a new "سجل" (Log) button on the Storage page
- Opens a modal showing all spare parts logs
- Clean, simple interface
- Real-time refresh capability

### 🔧 Logged Events

#### 1. Part Used in Request
**When**: A spare part is added to a service request
**Message Format**: `تم استخدام {quantity} قطعة من "{partName}" في الطلب {requestNumber}`
**Example**: تم استخدام 3 قطعة من "Motor ABC" في الطلب REQ-001

#### 2. Part Updated
**When**: Warehouse keeper updates spare part information
**Message Format**: `{userName} قام بتحديث "{partName}" - التغييرات: {changes}`
**Example**: Ahmad Ali قام بتحديث "Motor XYZ" - التغييرات: السعر, العملة

**Tracked Changes**:
- الاسم (Name)
- عدد القطع (Quantity)
- السعر (Price)
- العملة (Currency)
- الوصف (Description)
- الكمية (Stock Quantity)
- القسم (Department)

## Implementation

### Backend

#### New Service: `backend/src/services/sparePart.service.ts`

**Functions**:
```typescript
// Log when part is used in request
logPartUsedInRequest(
  sparePartId: number,
  sparePartName: string,
  quantity: number,
  requestNumber: string,
  performedBy: string
)

// Log when part is updated
logPartUpdate(
  sparePartId: number,
  sparePartName: string,
  changes: string[],
  performedBy: string
)

// Get all logs
getAllRecentLogs(limit: number = 100)

// Get logs for specific part
getSparePartLogs(sparePartId?: number, limit: number = 50)
```

#### API Endpoint

**GET** `/api/storage/logs`
- Query params: `limit` (default: 100)
- Returns: Array of log entries
- Access: Private (authenticated users)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "sparePartId": 5,
        "changeType": "USED_IN_REQUEST",
        "description": "تم استخدام 2 قطعة من...",
        "createdAt": "2025-10-01T10:30:00Z",
        "sparePart": {
          "id": 5,
          "name": "Motor ABC",
          "partNumber": "PART251001-001"
        }
      }
    ]
  }
}
```

#### Integration Points

**1. Request Parts Route** (`backend/src/routes/request-parts.routes.ts`)
- Logs when parts are added to requests (line 158-164)
- Automatically called after successful part addition

**2. Storage Route** (`backend/src/routes/storage.routes.ts`)
- Logs when spare parts are updated (line 427-429)
- Only logs if there are actual changes

### Frontend

#### New Component: `frontend/src/components/SparePartsLogModal.tsx`

**Features**:
- Modal dialog overlay
- Responsive design
- Auto-refresh on open
- Manual refresh button
- Formatted timestamps in Arabic
- Color-coded by event type
- Scrollable list

**Event Icons & Colors**:
- 🔧 Used in Request (Purple)
- ✏️ Updated (Blue)
- 📦 Quantity Changed (Yellow)

#### Storage Page Integration

**New Button**:
```tsx
<button 
  className="btn bg-indigo-600 text-white hover:bg-indigo-700" 
  onClick={() => setShowLogsModal(true)}
>
  📋 سجل
</button>
```

**Location**: Next to "Add Spare Part" button

#### API Integration

**New API Method** (`frontend/src/services/api.ts`):
```typescript
storageAPI.getSparePartLogs(limit?: number)
```

## Database

### Uses Existing Table
The service reuses the existing `spare_part_history` table with CASCADE constraint already in place.

**Columns Used**:
- `id` - Primary key
- `sparePartId` - Foreign key to spare_parts
- `changedById` - Set to 0 for system logs
- `changeType` - Event type (USED_IN_REQUEST, UPDATED, etc.)
- `description` - Arabic message
- `fieldChanged` - Optional field name
- `quantityChange` - Optional quantity delta
- `createdAt` - Timestamp

## User Interface

### Log Modal

**Header**:
- 📋 Icon and "سجل قطع الغيار" title
- Refresh button
- Close button

**Content**:
- Scrollable list of logs
- Each log shows:
  - Event icon
  - Description in Arabic
  - Part name and number
  - Formatted timestamp

**Footer**:
- Total logs count
- Close button

**Empty State**:
- Friendly message
- Guidance text

### Example Log Entries

```
🔧 تم استخدام 5 قطعة من "Bearing XYZ" في الطلب REQ-123
    Bearing XYZ • PART251001-015
    منذ ٣ دقائق

✏️ Sara Hassan قام بتحديث "Filter ABC" - التغييرات: السعر, الكمية
    Filter ABC • PART251001-008
    منذ ١٥ دقيقة
```

## Benefits

### ✅ Simpler Than Before
- No complex activity widget
- No auto-refresh complexity
- No cascade issues
- Just simple logging

### ✅ Focused Functionality
- Only logs what's needed
- Clear, readable messages
- Easy to understand

### ✅ No Breaking Changes
- Uses existing database table
- Doesn't interfere with notifications
- Can coexist with other features

### ✅ Better UX
- On-demand viewing (سجل button)
- Not cluttering the main page
- Fast and responsive

## Usage

### As Warehouse Keeper

1. **View Logs**:
   - Go to Storage page (المخزن)
   - Click "سجل" button
   - See all recent logs
   - Click refresh to reload
   - Click close to dismiss

2. **Update Part**:
   - Edit a spare part
   - Change any field
   - Save
   - Log automatically created
   - View in سجل

### As Technician

1. **Use Part in Request**:
   - Open a service request
   - Add spare part
   - Specify quantity
   - Log automatically created
   - Warehouse can see in سجل

## Files Modified

### Backend
1. ✅ `backend/src/services/sparePart.service.ts` - New service
2. ✅ `backend/src/routes/storage.routes.ts` - Added logging & endpoint
3. ✅ `backend/src/routes/request-parts.routes.ts` - Added logging

### Frontend
1. ✅ `frontend/src/components/SparePartsLogModal.tsx` - New component
2. ✅ `frontend/src/pages/storage/StoragePage.tsx` - Added button & modal
3. ✅ `frontend/src/services/api.ts` - Added API method

### Build
- ✅ Backend compiled
- ✅ Frontend built (+855 B bundle size)
- ✅ Ready for deployment

## Testing Checklist

### Backend
- [ ] GET /api/storage/logs returns logs
- [ ] Logs created when part used in request
- [ ] Logs created when part updated
- [ ] No errors in server logs

### Frontend
- [ ] سجل button visible on Storage page
- [ ] Click سجل opens modal
- [ ] Modal shows logs correctly
- [ ] Refresh button works
- [ ] Close button works
- [ ] Arabic formatting correct

### Integration
- [ ] Use part in request → log appears
- [ ] Update part → log appears
- [ ] Logs show correct information
- [ ] Timestamps in Arabic
- [ ] Icons display correctly

## Deployment

Ready to deploy:

```bash
git add .
git commit -m "Add spare parts log service (سجل قطع الغيار)"
git push origin main
```

Railway will auto-deploy. No database migration needed (reusing existing table).

## Comparison with Previous System

### Old Activity Widget ❌
- Complex auto-refresh logic
- Showed on every page
- Database constraint issues
- Performance concerns
- Too much clutter

### New Log Service ✅
- Simple on-demand viewing
- Clean سجل button
- No constraint issues
- Faster and lighter
- Better user experience

## Summary

The new spare parts log service provides a simple, focused way to track:
- 🔧 When parts are used in requests
- ✏️ When warehouse keeper makes updates

It's accessible via a "سجل" button that opens a clean modal interface. The implementation is lightweight, reliable, and doesn't interfere with existing functionality.

**Status**: ✅ Ready to deploy
**Bundle Impact**: +855 B (minimal)
**Database**: Uses existing table
**Breaking Changes**: None
