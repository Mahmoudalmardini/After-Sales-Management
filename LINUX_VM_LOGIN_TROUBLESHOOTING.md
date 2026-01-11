# Linux VM Login Error Troubleshooting Guide

## Problem
Login returns "Internal Server Error" (500) when attempting to authenticate on a Linux VM deployment.

## Common Causes & Solutions

### 1. Database Connection Issues

**Symptoms**: 
- 500 Internal Server Error
- Logs show "Can't reach database server"
- Health check returns 503

**Solution**:

1. **Verify DATABASE_URL is set correctly**:
   ```bash
   echo $DATABASE_URL
   # Should output: postgresql://user:password@host:port/database
   ```

2. **Test database connection**:
   ```bash
   # Test connection using psql
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Or test from backend directory
   cd backend
   npx prisma db execute --stdin <<< "SELECT 1"
   ```

3. **Check PostgreSQL service status**:
   ```bash
   # Systemd service
   sudo systemctl status postgresql
   
   # Or check if PostgreSQL is running
   sudo systemctl is-active postgresql
   ```

4. **Verify PostgreSQL is listening**:
   ```bash
   # Check if PostgreSQL is listening on port 5432
   sudo netstat -tlnp | grep 5432
   # Or
   sudo ss -tlnp | grep 5432
   ```

5. **Check PostgreSQL logs**:
   ```bash
   # Location varies by distribution
   sudo tail -f /var/log/postgresql/postgresql-*.log
   # Or
   sudo journalctl -u postgresql -f
   ```

6. **Fix DATABASE_URL format**:
   ```bash
   # Correct format
   export DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
   
   # For remote databases
   export DATABASE_URL="postgresql://username:password@host:5432/database_name?sslmode=require"
   ```

### 2. Missing Environment Variables

**Symptoms**:
- JWT errors in logs
- Authentication failures
- 500 errors

**Solution**:

1. **Check all required environment variables**:
   ```bash
   # Create or edit .env file
   cd backend
   nano .env
   ```

2. **Required variables**:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database?schema=public
   JWT_SECRET=your-secret-key-min-32-characters-long
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=http://your-vm-ip-or-domain
   ```

3. **Generate secure JWT_SECRET**:
   ```bash
   # Generate random secret (32+ characters)
   openssl rand -base64 32
   
   # Add to .env file
   JWT_SECRET=<generated-secret>
   ```

4. **Load environment variables**:
   ```bash
   # If using .env file
   export $(cat backend/.env | xargs)
   
   # Or source it before starting
   source backend/.env
   ```

### 3. Database Schema Not Initialized

**Symptoms**:
- Tables don't exist
- Prisma errors about missing tables
- Migration errors

**Solution**:

1. **Initialize database schema**:
   ```bash
   cd backend
   
   # Generate Prisma Client
   npx prisma generate
   
   # Push schema to database (development/staging)
   npx prisma db push
   
   # OR apply migrations (production)
   npx prisma migrate deploy
   ```

2. **Verify tables exist**:
   ```bash
   psql $DATABASE_URL -c "\dt"
   # Should list all tables
   ```

3. **Check if admin user exists**:
   ```bash
   psql $DATABASE_URL -c "SELECT username, email, role FROM users WHERE username = 'admin';"
   ```

### 4. Admin User Not Created

**Symptoms**:
- Login fails with "Invalid credentials"
- No admin user in database

**Solution**:

1. **Automatic creation** (on server startup):
   - The server automatically creates admin user if it doesn't exist
   - Check server logs for "Admin user created successfully"

2. **Manual creation**:
   ```bash
   cd backend
   node scripts/setup-production-db.js
   ```

3. **Verify admin user**:
   ```bash
   psql $DATABASE_URL -c "SELECT id, username, email, role, \"isActive\" FROM users;"
   ```

4. **Default credentials**:
   - Username: `admin`
   - Password: `admin123`
   - **⚠️ Change password after first login!**

### 5. CORS Configuration Issues

**Symptoms**:
- Frontend can't connect to backend
- CORS errors in browser console
- Network errors

**Solution**:

1. **Set CORS_ORIGIN correctly**:
   ```env
   # In backend/.env
   CORS_ORIGIN=http://your-vm-ip:3000
   # Or if using domain
   CORS_ORIGIN=https://your-domain.com
   ```

2. **For multiple origins**, update `backend/src/index.ts`:
   ```typescript
   const corsWhitelist = [
     config.corsOrigin,
     'http://your-vm-ip:3000',
     'https://your-domain.com',
   ].filter(Boolean);
   ```

3. **Restart backend after changes**:
   ```bash
   # If using PM2
   pm2 restart after-sales-api
   
   # If using systemd
   sudo systemctl restart your-service-name
   ```

### 6. Application Not Running or Crashed

**Symptoms**:
- Connection refused errors
- 502/503 errors
- No response from API

**Solution**:

1. **Check if backend is running**:
   ```bash
   # Using PM2
   pm2 list
   pm2 logs after-sales-api
   
   # Using systemd
   sudo systemctl status your-service-name
   sudo journalctl -u your-service-name -f
   
   # Using process list
   ps aux | grep node
   ```

2. **Check backend logs**:
   ```bash
   # Application logs
   tail -f backend/logs/*.log
   
   # Or if using PM2
   pm2 logs after-sales-api --lines 100
   ```

3. **Test health endpoint**:
   ```bash
   curl http://localhost:3001/health
   # Should return JSON with status
   ```

4. **Restart application**:
   ```bash
   # PM2
   pm2 restart after-sales-api
   
   # Systemd
   sudo systemctl restart your-service-name
   
   # Manual
   cd backend
   npm start
   ```

### 7. Port Conflicts or Firewall Issues

**Symptoms**:
- Can't connect to backend
- Connection timeout
- Port already in use

**Solution**:

1. **Check if port is in use**:
   ```bash
   sudo netstat -tlnp | grep 3001
   # Or
   sudo ss -tlnp | grep 3001
   ```

2. **Check firewall rules**:
   ```bash
   # UFW (Ubuntu)
   sudo ufw status
   sudo ufw allow 3001/tcp
   sudo ufw allow 5432/tcp
   
   # Firewalld (CentOS/RHEL)
   sudo firewall-cmd --list-all
   sudo firewall-cmd --add-port=3001/tcp --permanent
   sudo firewall-cmd --reload
   ```

3. **Test local connection**:
   ```bash
   curl http://localhost:3001/health
   ```

4. **Test remote connection** (from another machine):
   ```bash
   curl http://your-vm-ip:3001/health
   ```

### 8. Permission Issues

**Symptoms**:
- Permission denied errors
- Can't write to directories
- Database connection denied

**Solution**:

1. **Check file permissions**:
   ```bash
   # Ensure user has access to backend directory
   ls -la backend/
   ```

2. **Check database permissions**:
   ```bash
   # Verify database user has proper permissions
   psql $DATABASE_URL -c "SELECT current_user, current_database();"
   ```

3. **Fix uploads/logs directories**:
   ```bash
   mkdir -p backend/uploads backend/logs
   chmod 755 backend/uploads backend/logs
   ```

## Step-by-Step Diagnostic Process

### Step 1: Check Environment Setup
```bash
cd backend

# Check Node.js version
node --version  # Should be 18+

# Check if .env exists
ls -la .env

# Check environment variables
cat .env | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV"
```

### Step 2: Test Database Connection
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Check if tables exist
psql $DATABASE_URL -c "\dt"

# Check if admin user exists
psql $DATABASE_URL -c "SELECT username, role FROM users WHERE username = 'admin';"
```

### Step 3: Test Backend Startup
```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Test database connection through Prisma
npx prisma db execute --stdin <<< "SELECT 1"

# Start backend in foreground to see errors
npm start
```

### Step 4: Check Application Logs
```bash
# View logs
tail -f backend/logs/*.log

# Or if using PM2
pm2 logs after-sales-api --lines 50

# Or systemd
sudo journalctl -u your-service-name -n 50 -f
```

### Step 5: Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Test login endpoint (should return error without credentials, not 500)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -v
```

## Quick Fix Script

Create a diagnostic script to check common issues:

```bash
#!/bin/bash
# save as: backend/scripts/diagnose-login-issue.sh

echo "=== After-Sales System Diagnostic ==="
echo ""

echo "1. Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
else
  echo "✅ DATABASE_URL is set"
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET not set"
else
  echo "✅ JWT_SECRET is set"
fi

echo ""
echo "2. Testing database connection..."
if psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
fi

echo ""
echo "3. Checking if tables exist..."
TABLE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
if [ "$TABLE_COUNT" -gt "0" ]; then
  echo "✅ Tables exist ($TABLE_COUNT tables)"
else
  echo "❌ No tables found"
fi

echo ""
echo "4. Checking if admin user exists..."
ADMIN_EXISTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null)
if [ "$ADMIN_EXISTS" -eq "1" ]; then
  echo "✅ Admin user exists"
else
  echo "❌ Admin user not found"
fi

echo ""
echo "5. Checking if backend is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Backend is running"
else
  echo "❌ Backend is not responding"
fi

echo ""
echo "=== Diagnostic Complete ==="
```

Run it:
```bash
chmod +x backend/scripts/diagnose-login-issue.sh
cd backend
source .env  # Load environment variables
../backend/scripts/diagnose-login-issue.sh
```

## Recommended Production Setup

1. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start backend/dist/index.js --name after-sales-api
   pm2 save
   pm2 startup  # Enable startup on boot
   ```

2. **Use systemd service** (alternative):
   ```ini
   # /etc/systemd/system/after-sales-api.service
   [Unit]
   Description=After-Sales API Service
   After=network.target postgresql.service
   
   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/After_Saels_System/backend
   Environment="NODE_ENV=production"
   EnvironmentFile=/path/to/After_Saels_System/backend/.env
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

3. **Use Nginx as reverse proxy**:
   ```nginx
   # /etc/nginx/sites-available/after-sales
   server {
       listen 80;
       server_name your-domain.com;
       
       # Frontend
       location / {
           root /path/to/After_Saels_System/frontend/build;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Still Having Issues?

If none of the above solutions work:

1. **Check full error logs**:
   ```bash
   # Enable debug logging
   export LOG_LEVEL=debug
   # Restart application
   ```

2. **Test with minimal configuration**:
   ```bash
   # Start with minimal env vars
   DATABASE_URL=... JWT_SECRET=... node backend/dist/index.js
   ```

3. **Verify database user permissions**:
   ```sql
   -- Connect as superuser
   GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
   ```

4. **Check system resources**:
   ```bash
   # Check memory
   free -h
   
   # Check disk space
   df -h
   
   # Check CPU
   top
   ```

---

**Remember**: Always backup your database before making changes in production!

