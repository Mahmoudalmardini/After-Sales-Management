# Railway Migration Guide - Fix SparePartHistory Table

## Problem
The spare parts activity widget shows "لا توجد أنشطة مسجلة" on production because the `SparePartHistory` table doesn't exist in your PostgreSQL database on Railway.

## Solution: Run Migrations on Railway

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```
   - Select your project
   - Select the backend service

4. **Run the migration**:
   ```bash
   railway run npx prisma migrate deploy
   ```

   This will apply all pending migrations to your production database.

### Option 2: Using Railway Dashboard

1. **Go to your Railway project dashboard**
2. **Click on your backend service**
3. **Go to "Settings" tab**
4. **Scroll to "Deploy" section**
5. **Add a custom start command**:
   ```bash
   npx prisma migrate deploy && npm start
   ```
   
   This runs migrations before starting the server on every deployment.

### Option 3: Manual Migration via Railway Console

1. **Go to Railway dashboard**
2. **Click on your backend service**  
3. **Click the "..." menu (three dots)**
4. **Select "Service Terminal" or "Shell"**
5. **Run these commands**:
   ```bash
   cd /app
   npx prisma migrate deploy
   ```

### Option 4: One-Time Migration Command

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "migrate:deploy": "prisma migrate deploy",
    "start:production": "prisma migrate deploy && npm start"
  }
}
```

Then update your Railway start command to: `npm run start:production`

## Verify Migration Worked

### 1. Check Railway Logs
After running the migration, you should see:
```
The following migration(s) have been applied:

migrations/
  └─ 20250930195642_add_spare_part_history/
    └─ migration.sql

All migrations have been successfully applied.
```

### 2. Check Database
Using Railway's PostgreSQL dashboard:
1. Go to your PostgreSQL service
2. Click "Data" tab
3. Look for `spare_part_history` table
4. It should have these columns:
   - id
   - sparePartId
   - changedById
   - changeType
   - fieldChanged
   - oldValue
   - newValue
   - quantityChange
   - description
   - requestId
   - createdAt

### 3. Test the Application
1. Go to your deployed app
2. Navigate to Storage page
3. Edit a spare part
4. The activity should appear in the widget!

## Permanent Solution: Update nixpacks.toml

To ensure migrations run on every deployment, update `backend/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = [
  'npx prisma generate',
  'npm run build'
]

[start]
cmd = 'npx prisma migrate deploy && npm start'
```

This ensures:
1. Prisma client is generated
2. TypeScript is compiled
3. Migrations run before starting
4. Server starts

## Common Issues

### Issue: "Migration failed to apply"

**Cause:** Database connection issues or syntax errors

**Solution:**
1. Check DATABASE_URL environment variable
2. Verify PostgreSQL service is running
3. Check migration file syntax

### Issue: "Table already exists"

**Cause:** Migration was partially applied

**Solution:**
```bash
# Mark migration as applied without running it
railway run npx prisma migrate resolve --applied 20250930195642_add_spare_part_history
```

### Issue: "Environment variable not found: DATABASE_URL"

**Cause:** Railway environment variables not set

**Solution:**
1. Go to Railway dashboard
2. Click your backend service
3. Go to "Variables" tab
4. Ensure DATABASE_URL is set (should be automatic if you have PostgreSQL service)

## Testing Locally with PostgreSQL

To test the migration locally with PostgreSQL:

1. **Start PostgreSQL locally**:
   ```bash
   # Using Docker
   docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. **Update .env**:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/mes_test?schema=public"
   ```

3. **Run migration**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

4. **Test the app**:
   ```bash
   npm run dev
   ```

## Verification Checklist

After deployment:
- [ ] Migration logs show success
- [ ] `spare_part_history` table exists in PostgreSQL
- [ ] No errors in Railway logs
- [ ] Activity widget shows activities when you edit spare parts
- [ ] Browser console shows no errors

## Quick Command Summary

```bash
# Option 1: Railway CLI
railway run npx prisma migrate deploy

# Option 2: Update start command in Railway
# Settings > Deploy > Start Command:
npx prisma migrate deploy && npm start

# Option 3: Add to package.json and use
npm run start:production
```

---

**After running the migration, try editing a spare part on your deployed app. The activity should appear immediately!**
