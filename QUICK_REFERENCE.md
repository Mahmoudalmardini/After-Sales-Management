# Quick Reference Guide - After-Sales System

## Quick Commands

### Database Management

#### Empty Database (Remove All Data)
```bash
cd backend
node scripts/empty-database.js
```
⚠️ **Warning**: This deletes ALL data but keeps schema structure!

#### Seed Database (Add Dummy Data)
```bash
cd backend
npx prisma db seed
```

#### Setup Fresh Database
```bash
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database
npx prisma db push

# 3. Seed with dummy data (optional)
npx prisma db seed

# 4. Or create only admin user
node scripts/setup-production-db.js
```

#### Reset Database (Development Only)
```bash
cd backend
npx prisma migrate reset --force
```

### Login Troubleshooting (Linux VM)

#### Quick Diagnostic
```bash
# 1. Check environment variables
echo $DATABASE_URL
echo $JWT_SECRET

# 2. Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check if admin user exists
psql $DATABASE_URL -c "SELECT username FROM users WHERE username = 'admin';"

# 4. Test backend health
curl http://localhost:3001/health

# 5. Check backend logs
tail -f backend/logs/*.log
```

#### Common Fixes

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

**2. Schema Not Initialized**
```bash
cd backend
npx prisma generate
npx prisma db push
```

**3. Admin User Missing**
```bash
cd backend
node scripts/setup-production-db.js
```

**4. Environment Variables Not Set**
```bash
# Create .env file
cd backend
cp env.production.example .env

# Edit with your values
nano .env

# Required variables:
# DATABASE_URL=postgresql://...
# JWT_SECRET=your-secret-key
# NODE_ENV=production
# PORT=3001
# CORS_ORIGIN=http://your-domain
```

### Deployment

#### Production Deployment (Linux VM)
```bash
# 1. Build backend
cd backend
npm install
npm run build

# 2. Build frontend
cd ../frontend
npm install
npm run build

# 3. Copy frontend to backend
cp -r build/* ../backend/dist/public/

# 4. Setup database
cd ../backend
npx prisma generate
npx prisma migrate deploy

# 5. Start with PM2
pm2 start dist/index.js --name after-sales-api
pm2 save
```

#### Using Docker
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: COMPANY_MANAGER

⚠️ **Change password after first login!**

### Environment Variables Reference

#### Required
```env
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
JWT_SECRET=your-secret-key-min-32-characters
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://your-domain
```

#### Optional
```env
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
SLA_UNDER_WARRANTY=168
SLA_OUT_OF_WARRANTY=240
```

### Useful URLs

- **Frontend**: http://localhost:3000 (dev) or http://your-domain (prod)
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health
- **Login Endpoint**: POST http://localhost:3001/api/auth/login

### File Locations

- **Schema**: `backend/prisma/schema.prisma`
- **Seed Data**: `backend/prisma/seed.ts`
- **Config**: `backend/src/config/config.ts`
- **Logs**: `backend/logs/`
- **Uploads**: `backend/uploads/`

### Documentation Files

- **Technical Documentation**: `TECHNICAL_DOCUMENTATION.md`
- **Login Troubleshooting**: `LINUX_VM_LOGIN_TROUBLESHOOTING.md`
- **Production Deployment**: `PRODUCTION_DEPLOYMENT.md`

---

For detailed information, see the full documentation files!

