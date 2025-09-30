# Fix Production Activities - Complete Guide

## The Problem

Your activity widget shows "لا توجد أنشطة مسجلة" on Railway/production because:
1. The `SparePartHistory` table exists in your local SQLite database
2. But **doesn't exist** in your production PostgreSQL database on Railway
3. The migration wasn't applied successfully during deployment

## The Solution

### Step 1: Force Redeploy on Railway

The easiest solution is to trigger a new deployment which will run the migrations:

1. **Go to Railway Dashboard**
2. **Click on your project**
3. **Click on the backend service**
4. **Click "Deployments" tab**
5. **Click "Redeploy" on the latest deployment**

OR

6. **Make a small change and commit:**
   ```bash
   cd backend
   # Add a comment to trigger deployment
   echo "# Deploy" >> README.md
   git add .
   git commit -m "Trigger redeploy for migrations"
   git push
   ```

### Step 2: Watch the Deployment Logs

When the deployment runs, watch for these messages in the logs:

```
✅ Expected Success Messages:
----------------------------
🔧 Generating Prisma client...
✅ Prisma client generated
🔍 Checking database state...
📦 Existing database detected, applying any pending changes...
Applying migration `20250930195642_add_spare_part_history`
✅ Database migrations applied
🎯 Starting application...
```

```
❌ If You See Errors:
----------------------
"Migration failed"
"Table already exists"
"Cannot run migrate deploy"
```

### Step 3: Manual Migration (If Redeploy Fails)

If automatic migration doesn't work, run it manually:

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npx prisma migrate deploy
```

**Option B: Using Railway Web Terminal**
1. Go to Railway Dashboard
2. Click on backend service
3. Click "..." menu → "Service Terminal"
4. Run:
   ```bash
   npx prisma migrate deploy
   ```

**Option C: Using Prisma Studio**
1. Open Railway dashboard
2. Go to PostgreSQL service
3. Click "Data" tab
4. Run this SQL manually:

```sql
CREATE TABLE "spare_part_history" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "sparePartId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "fieldChanged" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "quantityChange" INTEGER,
    "description" TEXT,
    "requestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "spare_part_history_sparePartId_fkey" 
        FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "spare_part_history_changedById_fkey" 
        FOREIGN KEY ("changedById") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Mark migration as applied
INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
) VALUES (
    gen_random_uuid(),
    '...',
    NOW(),
    '20250930195642_add_spare_part_history',
    NULL,
    NULL,
    NOW(),
    1
);
```

## Verification Steps

### 1. Check Database Tables

In Railway dashboard:
1. Go to PostgreSQL service
2. Click "Data" tab
3. Look for `spare_part_history` table
4. Check it has these columns:
   - id, sparePartId, changedById, changeType
   - fieldChanged, oldValue, newValue
   - quantityChange, description, requestId, createdAt

### 2. Test the Application

1. **Go to your deployed app**
2. **Open Storage page**
3. **Edit a spare part:**
   - Click "تعديل" on any part
   - Change the name or price
   - Save
4. **Check activity widget** - should show the change immediately!

### 3. Check Browser Console

Open F12 and look for:
```javascript
🔄 Loading activities with filter: all
✅ Loaded activities: 1 activities  // Should be > 0 after editing
Activities data: [{...}]  // Should show the activity
```

### 4. Check API Response

In Network tab:
- Request: `/api/storage/activities/all?filter=all&limit=100`
- Response should include activities array

## Troubleshooting

### Problem: Migration Fails with "Table already exists"

**Solution:**
```bash
# Mark migration as resolved
railway run npx prisma migrate resolve --applied 20250930195642_add_spare_part_history

# Then try deploying again
```

### Problem: No Errors But Still No Activities

**Check:**
1. Are you logged in as Warehouse Keeper?
2. Does the PostgreSQL table exist?
3. Are you testing on the correct environment?

**Test Activity Creation:**
```bash
# Run this in Railway terminal
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  const part = await prisma.sparePart.findFirst();
  
  const activity = await prisma.sparePartHistory.create({
    data: {
      sparePartId: part.id,
      changedById: user.id,
      changeType: 'UPDATED',
      description: 'Test activity from console'
    }
  });
  
  console.log('Created:', activity);
  await prisma.\$disconnect();
}

test();
"
```

### Problem: Deployment Keeps Failing

**Check these:**

1. **Environment Variables:**
   - DATABASE_URL must be set
   - Should point to PostgreSQL (not SQLite)

2. **Build Logs:**
   - Look for TypeScript errors
   - Check for Prisma generation errors

3. **Start Command:**
   - Should run `npm run start:prod`
   - Which runs migrations automatically

## Quick Fix Commands

```bash
# 1. Force new deployment
git commit --allow-empty -m "Redeploy"
git push

# 2. Or run migration manually
railway run npx prisma migrate deploy

# 3. Or update start command in Railway
# Settings > Deploy > Start Command:
npx prisma generate && npx prisma migrate deploy && node dist/index.js
```

## Expected Behavior After Fix

✅ **On Production (Railway):**
- Widget shows: "نشاط قطع الغيار"
- Default filter: "الكل" (selected/highlighted)
- After editing spare part: Activity appears immediately
- Activity shows: Who changed what, when

✅ **Example Activity:**
```
✏️ محمود المارديني قام بتغيير الاسم من "moto" إلى "motor"
    من: moto → إلى: motor
    بواسطة: محمود المارديني (WAREHOUSE_KEEPER)
    منذ الآن
```

## Prevention: Ensure Migrations Always Run

Update `backend/nixpacks.toml` to be more explicit:

```toml
[phases.setup]
nixPkgs = ['nodejs_18', 'npm-9_x']

[phases.install]
cmds = ['npm ci --production=false']

[phases.build]
cmds = [
  'npx prisma generate',
  'npm run build'
]

[start]
cmd = 'npx prisma migrate deploy && node dist/index.js'
```

Or keep using the production script which already handles this:
```toml
[start]
cmd = 'npm run start:prod'
```

## Final Checklist

- [ ] Deployment logs show migration success
- [ ] `spare_part_history` table exists in PostgreSQL
- [ ] No errors in Railway logs
- [ ] Activity widget loads without errors
- [ ] Editing spare parts creates visible activities
- [ ] Browser console shows activities loading
- [ ] API returns activities in Network tab

---

**After following these steps, your production app should show activities just like your local development environment!**
