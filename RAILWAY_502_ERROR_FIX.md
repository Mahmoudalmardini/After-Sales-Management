# 🚨 Railway 502 Error Fix Guide

## 🔍 Problem Analysis

You're getting **502 Bad Gateway** errors, which means:
- ✅ Frontend is working (loading CSS/JS files)
- ❌ Backend server is not responding
- ❌ API calls are failing with 502 status

## 🚨 Immediate Actions

### 1. Check Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Find your project
3. Check if backend service is **RUNNING** (green status)
4. If it's **STOPPED** or **CRASHED** (red status), that's the problem!

### 2. Check Railway Logs
1. Click on your backend service
2. Go to **Logs** tab
3. Look for error messages
4. Common issues:
   - Database connection errors
   - Migration failures
   - Port binding issues
   - Memory crashes

## 🔧 Common 502 Causes & Fixes

### Cause 1: Backend Service Crashed
**Symptoms**: Service shows "STOPPED" or "CRASHED"
**Fix**: 
```bash
# Redeploy the backend
git commit --allow-empty -m "Force redeploy backend"
git push
```

### Cause 2: Database Migration Failed
**Symptoms**: Logs show migration errors
**Fix**:
```bash
# Check migration status
railway run npx prisma migrate status

# Apply migrations manually
railway run npx prisma migrate deploy

# Reset database if needed (⚠️ DESTRUCTIVE)
railway run npx prisma migrate reset --force
```

### Cause 3: Port Binding Issues
**Symptoms**: "EADDRINUSE" or port errors
**Fix**: Check your `railway.json` configuration:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Cause 4: Environment Variables Missing
**Symptoms**: Database connection errors
**Fix**: Check Railway environment variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

## 🚀 Quick Fix Steps

### Step 1: Force Redeploy
```bash
git add .
git commit -m "Fix 502 errors - force redeploy"
git push
```

### Step 2: Check Service Status
1. Wait 2-3 minutes for deployment
2. Check Railway dashboard
3. Verify backend service is **RUNNING**

### Step 3: Test API Endpoints
```bash
# Test if backend is responding
curl https://your-backend-url.railway.app/api/health

# Or check in browser:
https://your-backend-url.railway.app/api/storage
```

### Step 4: Check Logs
If still getting 502:
1. Go to Railway → Backend Service → Logs
2. Look for error messages
3. Common errors:
   ```
   Error: connect ECONNREFUSED (Database)
   Error: Cannot find module (Missing dependencies)
   Error: EADDRINUSE (Port conflict)
   ```

## 🔍 Debugging Commands

### Check Railway Service Status
```bash
railway status
```

### View Recent Logs
```bash
railway logs --tail
```

### Connect to Railway Database
```bash
railway connect postgres
```

### Run Migrations
```bash
railway run npx prisma migrate deploy
```

### Check Environment Variables
```bash
railway variables
```

## 📋 Troubleshooting Checklist

- [ ] Backend service is RUNNING (green) in Railway dashboard
- [ ] No error messages in Railway logs
- [ ] Database connection is working
- [ ] All environment variables are set
- [ ] Migrations have been applied successfully
- [ ] Port 3000 is not conflicting
- [ ] Memory usage is not exceeded
- [ ] Build completed successfully

## 🎯 Expected Results After Fix

Once the 502 errors are resolved:
- ✅ API calls return 200 status codes
- ✅ Spare parts deletion works
- ✅ Activities widget loads data
- ✅ No more "Application failed to respond" errors

## 🆘 If Still Having Issues

1. **Check Railway Status Page**: https://status.railway.app/
2. **Contact Railway Support**: Through their dashboard
3. **Try Different Region**: Sometimes specific regions have issues
4. **Scale Up**: Increase memory/CPU if hitting limits

## 🔄 Alternative: Manual Restart

If automatic fixes don't work:
1. Go to Railway dashboard
2. Find backend service
3. Click "Restart" button
4. Wait for service to come back online

---

**Note**: 502 errors are server-side issues, not code issues. Your fixes for deletion logging and activities are correct - they just can't work until the backend is responding properly.
