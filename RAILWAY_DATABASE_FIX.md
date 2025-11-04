# Fix Railway Database Connection Issue

## Problem
The application cannot connect to the database at `postgres.railway.internal:5432`. The error shows:
```
Can't reach database server at `postgres.railway.internal:5432`
```

## Root Cause
Railway's internal DNS (`postgres.railway.internal`) may not be working or the services aren't properly linked. This is a common Railway configuration issue.

## Solution: Fix the DATABASE_URL

### Step 1: Get the Correct DATABASE_URL from Railway

1. **Go to Railway Dashboard**: https://railway.app
2. **Click on your PostgreSQL service** (not the app service)
3. **Go to the "Variables" tab**
4. **Find the `DATABASE_URL`** - it should look like one of these:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```
   OR
   ```
   postgresql://postgres:password@postgres.railway.internal:5432/railway
   ```

### Step 2: Update DATABASE_URL in Your App Service

1. **Go back to your Railway dashboard**
2. **Click on your "After-Sales-Management" service** (the app service)
3. **Go to the "Variables" tab**
4. **Find or Add `DATABASE_URL`**
5. **Paste the DATABASE_URL from the PostgreSQL service**

**Important**: If the internal URL (`postgres.railway.internal`) doesn't work, use the **public URL** instead (the one with `containers-us-west-xxx.railway.app`).

### Step 3: Alternative - Use Public URL

If `postgres.railway.internal` doesn't work, you can also:

1. **In PostgreSQL service Variables tab**, look for:
   - `PGHOST` (e.g., `containers-us-west-xxx.railway.app`)
   - `PGPORT` (usually `5432`)
   - `PGDATABASE` (usually `railway`)
   - `PGUSER` (usually `postgres`)
   - `PGPASSWORD` (the password)

2. **Construct the DATABASE_URL manually**:
   ```
   postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE
   ```

3. **Set it in your app service Variables tab**

### Step 4: Restart the App Service

1. **Go to your app service in Railway**
2. **Click the "•••" menu** (three dots)
3. **Select "Restart"**
4. **Wait for the deployment to complete**
5. **Check the logs** - you should see:
   ```
   ✅ Database connection established!
   ```

## Verify the Fix

After updating and restarting:

1. **Check the logs** - should show successful database connection
2. **Try logging in** - should work now
3. **Check health endpoint**: `https://your-app.railway.app/health`
   - Should return: `{"status": "OK", "db": {"connected": true}}`

## If It Still Doesn't Work

### Option 1: Check Service Linking

1. Go to your app service
2. Click "Settings"
3. Look for "Service Connections" or "Linked Services"
4. Ensure PostgreSQL service is listed

### Option 2: Verify Database Service is Running

1. Go to PostgreSQL service
2. Check it's **Running** (not paused)
3. Check logs for any errors
4. Verify it shows "Healthy" status

### Option 3: Use Railway CLI

If you have Railway CLI installed:

```bash
# Link your project
railway link

# Get the database URL
railway variables get DATABASE_URL --service postgres

# Set it in your app service
railway variables set DATABASE_URL="<paste-url-here>" --service your-app-service-name
```

### Option 4: Check Railway Status

Sometimes Railway has service issues:
- Check Railway status: https://status.railway.app
- Check Railway Discord/Twitter for outages

## Common Issues

### Issue: "Connection timeout"
**Solution**: Database service might be slow to start. Wait 2-3 minutes and try again.

### Issue: "Connection refused"
**Solution**: 
- Database service might not be running - check and restart it
- Port might be wrong - ensure it's `5432`
- Hostname might be incorrect - use the public URL

### Issue: "Authentication failed"
**Solution**: 
- Password in DATABASE_URL might be wrong
- Copy the exact DATABASE_URL from PostgreSQL service variables

## After Fixing

Once the connection works:
1. ✅ Migrations will run automatically
2. ✅ Database will be seeded with admin user
3. ✅ You can log in with: `admin` / `admin123`
4. ✅ All features will work normally

## Need More Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check this repo's `RAILWAY_DATABASE_SETUP.md` for more details

