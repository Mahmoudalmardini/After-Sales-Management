# How to See Activities in نشاط قطع الغيار (Spare Parts Activity)

## Overview
The spare parts activity widget shows all operations performed on spare parts in real-time. It appears at the top of the Storage page.

## Where to Find It
1. Login as any of these roles:
   - Company Manager (مدير الشركة)
   - Deputy Manager (نائب المدير)
   - Department Manager (مدير القسم)
   - Section Supervisor (مشرف القسم)
   - Warehouse Keeper (أمين مستودع)

2. Navigate to: **Storage / المخزن** page

3. Look at the top of the page for the widget titled: **نشاط قطع الغيار**

## What You'll See

### Activity Types

The widget displays 4 types of activities with color-coded badges:

1. **🆕 إنشاء (Create)** - Green
   - When a new spare part is added
   - Example: "Warehouse Keeper أضاف قطعة غيار جديدة: Test Part"

2. **✏️ تعديل (Update)** - Blue
   - When spare part details are changed
   - Example: "قام بتغيير الاسم من 'Old Name' إلى 'New Name'"
   - Shows: name, price, currency, description, department changes

3. **📦 تغيير الكمية (Quantity Change)** - Yellow
   - When quantity is increased or decreased
   - Example: "قام بتقليل عدد القطع من 100 إلى 80 (-20)"
   - Shows the difference (+/- number)

4. **🔧 استخدام في طلب (Used in Request)** - Red
   - When spare part is added to a service request
   - Example: "قام بإضافة 5 قطعة للطلب #123"
   - Linked to the request ID

### Time Filters

Use the buttons at the top right to filter activities:

- **اليوم (Today)** - Shows only today's activities
- **هذا الأسبوع (This Week)** - Shows last 7 days
- **الكل (All)** - Shows all activities (limited to 100 most recent)

### Refresh Button
Click the circular arrow icon (🔄) to manually refresh and load new activities.

## How to Test

### Test 1: Create a Spare Part
```
1. Click "إضافة قطعة غيار" (Add Spare Part)
2. Fill in the details:
   - Name: "Test Part"
   - Present Pieces: 100
   - Unit Price: 50
   - Currency: SYP
3. Click Save
4. Look at the activity widget
5. You should see: "🆕 [Your Name] أضاف قطعة غيار جديدة: Test Part"
```

### Test 2: Update a Spare Part
```
1. Click "تعديل" (Edit) on any spare part
2. Change the name from "Test Part" to "Updated Part"
3. Change the price from 50 to 75
4. Click Save
5. Look at the activity widget
6. You should see TWO new activities:
   - "✏️ قام بتغيير الاسم من 'Test Part' إلى 'Updated Part'"
   - "✏️ قام بتغيير السعر من 50 SYP إلى 75 SYP"
```

### Test 3: Change Quantity
```
1. Click "تعديل" (Edit) on any spare part
2. Change "عدد القطع" (Present Pieces) from 100 to 80
3. Click Save
4. Look at the activity widget
5. You should see: "📦 قام بتقليل عدد القطع من 100 إلى 80 (-20)"
```

### Test 4: Use in Request
```
1. Go to any service request
2. Add a spare part to the request
3. Return to Storage page
4. Look at the activity widget
5. You should see: "🔧 قام بإضافة [quantity] قطعة للطلب #[request number]"
```

## Information Displayed

For each activity, you'll see:

1. **Type Badge**: Color-coded icon showing the operation type
2. **Field Name**: Which field was changed (if applicable)
3. **Description**: Full Arabic description of what happened
4. **Old → New Values**: Shows the change (for updates)
5. **User**: Who performed the action
6. **Role**: User's role (أمين مستودع, مدير, etc.)
7. **Spare Part**: Which part was affected
8. **Time**: How long ago (منذ X دقيقة/ساعة/يوم)
9. **Request Link**: If related to a request (مرتبط بالطلب #X)

## Troubleshooting

### No Activities Showing?

1. **Check the filter**: 
   - Click "الكل" to see all activities
   - Maybe all activities are from previous days

2. **Create a test activity**:
   - Create or update a spare part
   - It should appear immediately

3. **Check browser console**:
   - Press F12
   - Look for:
     - "🔄 Loading activities with filter: [filter]"
     - "✅ Loaded activities: [count]"
   - If you see errors, report them

4. **Refresh the page**:
   - Sometimes a page refresh helps
   - Or click the refresh button in the widget

### Activities Show But Are Old?

- Click "اليوم" to filter to today only
- Perform a new operation (create/update spare part)
- It should appear at the top

### Widget Not Visible?

- Make sure you're logged in as:
  - Warehouse Keeper, or
  - Any Manager/Supervisor role
- Navigate to "Storage" / "المخزن" page
- The widget appears at the very top

## API Details (For Developers)

The widget uses this endpoint:
```
GET /api/storage/activities/all?filter=today&limit=100
```

Parameters:
- `filter`: 'today' | 'week' | 'all'
- `limit`: Number of activities to fetch (default: 50, max recommended: 100)

Response includes:
- Activity history with user and spare part details
- Ordered by most recent first
- Server-side date filtering for performance

---
**Note**: Activities are logged automatically. You don't need to do anything special - just use the system normally and all operations will be tracked!
