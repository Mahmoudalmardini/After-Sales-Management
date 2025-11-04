# Railway Database Connection Setup Guide

## Problem
The application cannot connect to the PostgreSQL database at `postgres.railway.internal:5432`, causing deployment failures and 502 errors.

## Solution Steps

### 1. Verify PostgreSQL Service is Running

1. Go to your Railway dashboard: https://railway.app
2. Check your project - you should see two services:
   - **Postgres** (database service)
   - **After-Sales-Management** (your app service)
3. Ensure the **Postgres** service is:
   - ✅ Running (not paused)
   - ✅ Healthy (green status)
   - ✅ Has recent logs without errors

### 2. Link Services in Railway

**Option A: Using Railway Dashboard (Recommended)**

1. In Railway dashboard, click on your **After-Sales-Management** service
2. Go to the **Variables** tab
3. Look for `DATABASE_URL` - it should be automatically set if services are linked
4. If `DATABASE_URL` is missing or incorrect:
   - Click on your **Postgres** service
   - Go to the **Variables** tab
   - Copy the `DATABASE_URL` value (it should look like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`)
   - Go back to your **After-Sales-Management** service
   - Go to **Variables** tab
   - Add or update `DATABASE_URL` with the value from Postgres service

**Option B: Using Railway CLI**

```bash
railway link
railway variables set DATABASE_URL=$(railway variables get DATABASE_URL --service postgres)
```

### 3. Verify DATABASE_URL Format

The `DATABASE_URL` should be in one of these formats:

**For Railway Internal Network (preferred):**
```
postgresql://postgres:password@postgres.railway.internal:5432/railway
```

**For Railway Public URL (if internal doesn't work):**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

**Important Notes:**
- The hostname `postgres.railway.internal` only works if services are **linked**
- If internal DNS doesn't work, use the public URL from the Postgres service
- Make sure the port is `5432`
- The database name is usually `railway` by default

### 4. Check Service Linking

Railway automatically links services in the same project, but you can verify:

1. Go to your **After-Sales-Management** service
2. Click on **Settings**
3. Look for **Service Connections** or **Linked Services**
4. Ensure **Postgres** is listed as a connected service

### 5. Restart Services

After updating `DATABASE_URL`:

1. Go to your **After-Sales-Management** service
2. Click the **•••** menu (three dots)
3. Select **Restart**
4. Monitor the logs to see if the connection succeeds

### 6. Verify Connection

Once the app starts, check the logs for:
- ✅ `Database connection established!`
- ✅ `Database migrations applied successfully`

If you see:
- ❌ `Can't reach database server at postgres.railway.internal:5432`
- ❌ `Connection refused`

Then the services might not be properly linked or the DATABASE_URL is incorrect.

## Troubleshooting

### Issue: "Can't reach database server"

**Possible causes:**
1. Services not linked in Railway
2. DATABASE_URL points to wrong hostname
3. Database service is paused or not running
4. Network connectivity issues

**Solutions:**
1. Ensure Postgres service is running
2. Use the public URL instead of internal DNS
3. Manually copy DATABASE_URL from Postgres service variables
4. Restart both services

### Issue: "502 Bad Gateway"

**Cause:** Application failed to start (often due to database connection)

**Solution:**
1. Check application logs for errors
2. Verify DATABASE_URL is set correctly
3. Ensure database service is running
4. The updated startup script will now allow the app to start even if DB isn't ready

### Issue: "Connection timeout"

**Cause:** Database service is slow to start or not ready

**Solution:**
1. Wait 1-2 minutes for database service to fully start
2. Check Postgres service logs for errors
3. Restart the Postgres service if needed

## Manual DATABASE_URL Setup

If automatic linking doesn't work:

1. **Get database credentials from Postgres service:**
   - Go to Postgres service in Railway
   - Variables tab shows:
     - `PGHOST` (e.g., `containers-us-west-xxx.railway.app`)
     - `PGPORT` (usually `5432`)
     - `PGDATABASE` (usually `railway`)
     - `PGUSER` (usually `postgres`)
     - `PGPASSWORD` (the password)

2. **Construct DATABASE_URL:**
   ```
   postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE
   ```

3. **Set in app service:**
   - Go to After-Sales-Management service
   - Variables tab
   - Add or update `DATABASE_URL`
   - Paste the constructed URL

## Testing Connection

You can test the database connection manually:

```bash
# In Railway CLI or service shell
psql $DATABASE_URL -c "SELECT version();"
```

Or use the application's health endpoint:
```
GET https://your-app.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "db": { "connected": true }
}
```

## Next Steps

After fixing the database connection:

1. ✅ App should start successfully
2. ✅ Migrations will run automatically
3. ✅ Database will be seeded with admin user
4. ✅ Application will be fully functional

If you continue to have issues, check:
- Railway service logs for detailed error messages
- Railway status page for service outages
- Railway documentation: https://docs.railway.app

