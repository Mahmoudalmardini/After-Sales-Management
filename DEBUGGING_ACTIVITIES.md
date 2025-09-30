# Debugging Spare Parts Activities

## Quick Checks

### 1. Check Browser Console
Open the browser console (F12) and look for these messages:

**When page loads:**
```
🔄 Loading activities with filter: all
✅ Loaded activities: [number] activities
Activities data: [array of activities]
```

**If you see errors:**
```
❌ Error loading activities: [error message]
```

### 2. Check Network Tab
1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Refresh the Storage page
4. Look for request to: `/api/storage/activities/all?filter=all&limit=100`
5. Click on it to see the response

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "changeType": "CREATED",
        "description": "...",
        "sparePart": { ... },
        "changedBy": { ... }
      }
    ]
  }
}
```

### 3. Test Creating Activity

**Step-by-step test:**

1. **Go to Storage page**
2. **Click "إضافة قطعة غيار" (Add Spare Part)**
3. **Fill the form:**
   - Name: "Test Activity Part"
   - Present Pieces: 50
   - Unit Price: 100
   - Currency: SYP
4. **Click Save**
5. **Check console** for:
   ```
   ✅ Spare part history created: {id: X, ...}
   ```
6. **Look at the activity widget** - it should show:
   ```
   🆕 محمود المارديني أضاف قطعة غيار جديدة: Test Activity Part
   ```

### 4. Test Updating Activity

1. **Click "تعديل" (Edit)** on any spare part
2. **Change the name** from "moto" to "moto updated"
3. **Click Save**
4. **Check the activity widget** - should show:
   ```
   ✏️ قام بتغيير الاسم من "moto" إلى "moto updated"
   ```

## Common Issues & Solutions

### Issue 1: No Activities Show Up

**Possible Causes:**
1. Filter is set to "اليوم" (Today) but activities are from before today
2. Backend API is not returning data
3. Frontend not making the request

**Solutions:**
1. Click "الكل" (All) button to see all activities
2. Check browser console for errors
3. Check Network tab to see if request is made
4. Restart both backend and frontend servers

### Issue 2: Old Activities Don't Show

**Check:**
- Default filter is now "all" (الكل)
- If you still don't see them, check the database

**Run this in backend directory:**
```bash
cd backend
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.sparePartHistory.findMany().then(h => {console.log('Found', h.length, 'activities'); h.forEach((a,i)=>console.log(i+1, a.changeType, a.description)); p.\$disconnect();})"
```

### Issue 3: Activities Created But Widget Shows Empty

**Check:**
1. Open browser console
2. Look for: `✅ Loaded activities: 0 activities`
3. If it says 0, check the API response in Network tab
4. If API returns activities but widget shows 0, there's a frontend issue

**Force reload:**
- Press Ctrl+Shift+R (hard refresh)
- Clear browser cache
- Try incognito mode

### Issue 4: Backend Not Creating Activities

**Check backend console for:**
```
✅ Spare part history created: {...}
```

**If you don't see this:**
1. Check that you're logged in as Warehouse Keeper
2. Check backend console for errors
3. Verify database connection

**Manual test - Run in backend directory:**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'WAREHOUSE_KEEPER' } });
  const part = await prisma.sparePart.findFirst();
  
  if (!user || !part) {
    console.log('Missing user or part');
    return;
  }
  
  const activity = await prisma.sparePartHistory.create({
    data: {
      sparePartId: part.id,
      changedById: user.id,
      changeType: 'UPDATED',
      description: 'Test activity',
    }
  });
  
  console.log('Created test activity:', activity);
  await prisma.$disconnect();
}

test();
```

## Expected Behavior

### When Filter = "اليوم" (Today)
- Shows only activities from today (after midnight)
- If you made changes yesterday, they won't show
- Use "الكل" to see all

### When Filter = "هذا الأسبوع" (This Week)
- Shows activities from last 7 days
- Useful for recent activity overview

### When Filter = "الكل" (All)
- Shows up to 100 most recent activities
- Best for checking if system is working
- **This is now the DEFAULT**

## Verification Steps

### ✅ Checklist
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API call
- [ ] Backend console shows "Spare part history created"
- [ ] Activities appear in the widget
- [ ] Filter buttons work correctly
- [ ] Refresh button reloads activities

### 🔍 Debug Output to Check

**Frontend Console Should Show:**
```
🔄 Loading activities with filter: all
✅ Loaded activities: 2 activities
Activities data: (2) [{...}, {...}]
```

**Backend Console Should Show:**
```
📋 Fetching all spare parts activities, filter: all
📊 Found 2 total activities
```

## Still Not Working?

1. **Restart both servers:**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend
   cd frontend
   npm start
   ```

2. **Check database migration:**
   ```bash
   cd backend
   npx prisma migrate status
   ```

3. **Regenerate Prisma client:**
   ```bash
   cd backend
   npx prisma generate
   ```

4. **Check if SparePartHistory table exists:**
   ```bash
   cd backend
   npx prisma studio
   # Look for "SparePartHistory" model
   ```

---

## Quick Test Command

Run this in the project root to check everything:

```bash
# Check backend build
cd backend && npm run build && echo "✅ Backend builds OK" || echo "❌ Backend build failed"

# Check frontend build  
cd ../frontend && npm run build && echo "✅ Frontend builds OK" || echo "❌ Frontend build failed"

# Check database
cd ../backend && npx prisma migrate status && echo "✅ Database OK" || echo "❌ Database issues"
```
