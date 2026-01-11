# Setup Summary - After-Sales System

## What Was Created

I've created comprehensive documentation and utility scripts for your After-Sales Service Management System:

### 1. Technical Documentation (`TECHNICAL_DOCUMENTATION.md`)
Complete technical documentation covering:
- System architecture (3-tier: Frontend → Backend → Database)
- Full technology stack details
- Database schema documentation (16 tables with relationships)
- API architecture and endpoints
- Authentication & authorization system
- Deployment architecture
- Configuration management
- Database management procedures
- Troubleshooting guide

### 2. Empty Database Script (`backend/scripts/empty-database.js`)
Script to remove ALL data from the database while preserving schema structure.

**Usage**:
```bash
cd backend
node scripts/empty-database.js
```

**⚠️ WARNING**: This will DELETE ALL DATA from all tables!

**What it does**:
- Deletes all data from all tables in the correct order (respecting foreign keys)
- Preserves database schema structure
- Useful for clearing dummy/test data
- Safe to run multiple times (only deletes data, not schema)

### 3. Linux VM Login Troubleshooting Guide (`LINUX_VM_LOGIN_TROUBLESHOOTING.md`)
Comprehensive guide to fix login internal errors on Linux VM, covering:
- 8 common causes and solutions
- Step-by-step diagnostic process
- Quick fix commands
- Recommended production setup
- Systemd and PM2 configurations

### 4. Quick Reference Guide (`QUICK_REFERENCE.md`)
Quick command reference for common tasks

---

## How to Empty Database (Remove Dummy Data)

### Option 1: Using the Empty Database Script (Recommended)

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Make sure DATABASE_URL is set**:
   ```bash
   # Check if it's set
   echo $DATABASE_URL
   
   # Or load from .env file
   export $(cat .env | xargs)
   ```

3. **Run the script**:
   ```bash
   node scripts/empty-database.js
   ```

4. **Verify database is empty**:
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   # Should return 0
   ```

5. **Optional: Create admin user only**:
   ```bash
   node scripts/setup-production-db.js
   ```

### Option 2: Manual SQL Commands

If you prefer to do it manually:

```bash
# Connect to database
psql $DATABASE_URL

# Then run these SQL commands:
TRUNCATE TABLE spare_part_requests CASCADE;
TRUNCATE TABLE technician_reports CASCADE;
TRUNCATE TABLE spare_part_history CASCADE;
TRUNCATE TABLE request_parts CASCADE;
TRUNCATE TABLE request_costs CASCADE;
TRUNCATE TABLE request_activities CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE custom_request_statuses CASCADE;
TRUNCATE TABLE requests CASCADE;
TRUNCATE TABLE spare_parts CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE departments CASCADE;
```

### Option 3: Using Prisma (Development Only)

⚠️ **Warning**: This resets the entire database schema too!

```bash
cd backend
npx prisma migrate reset --force
```

---

## Fixing Login Internal Error on Linux VM

### Quick Diagnostic Steps

1. **Check Environment Variables**:
   ```bash
   echo $DATABASE_URL
   echo $JWT_SECRET
   ```

2. **Test Database Connection**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check if Schema is Initialized**:
   ```bash
   psql $DATABASE_URL -c "\dt"
   # Should list all tables
   ```

4. **Check if Admin User Exists**:
   ```bash
   psql $DATABASE_URL -c "SELECT username, role FROM users WHERE username = 'admin';"
   ```

5. **Test Backend Health**:
   ```bash
   curl http://localhost:3001/health
   ```

6. **Check Backend Logs**:
   ```bash
   tail -f backend/logs/*.log
   # Or if using PM2
   pm2 logs after-sales-api
   ```

### Common Solutions

**Solution 1: Database Not Connected**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL format
export DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"

# Initialize schema
cd backend
npx prisma generate
npx prisma db push
```

**Solution 2: Missing Environment Variables**
```bash
# Create .env file
cd backend
cp env.production.example .env

# Edit with your values
nano .env

# Required:
# DATABASE_URL=postgresql://...
# JWT_SECRET=your-secret-key-min-32-chars
# NODE_ENV=production
# PORT=3001
# CORS_ORIGIN=http://your-vm-ip-or-domain
```

**Solution 3: Admin User Missing**
```bash
cd backend
node scripts/setup-production-db.js
```

**Solution 4: Schema Not Initialized**
```bash
cd backend
npx prisma generate
npx prisma db push
# Or for production:
npx prisma migrate deploy
```

For detailed troubleshooting, see `LINUX_VM_LOGIN_TROUBLESHOOTING.md`

---

## System Overview

### Architecture
```
Frontend (React) → Backend API (Express/Node.js) → Database (PostgreSQL)
    Port 3000/80          Port 3001                       Port 5432
```

### Technology Stack

**Backend**:
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL 15
- JWT Authentication
- bcryptjs (password hashing)

**Frontend**:
- React 18 + TypeScript
- TailwindCSS
- React Router
- React Query
- Axios

### Database Schema
- 16 main tables
- Proper foreign key relationships
- Indexes for performance
- Audit trails (activity logs)

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: COMPANY_MANAGER
- Auto-created on server startup

---

## Next Steps

1. **Review Documentation**:
   - Read `TECHNICAL_DOCUMENTATION.md` for complete system details
   - Review `LINUX_VM_LOGIN_TROUBLESHOOTING.md` for login issues
   - Use `QUICK_REFERENCE.md` for quick commands

2. **Empty Database (If Needed)**:
   ```bash
   cd backend
   node scripts/empty-database.js
   ```

3. **Fix Login Issues (If Needed)**:
   - Follow diagnostic steps above
   - Check environment variables
   - Verify database connection
   - Initialize schema if needed
   - Create admin user if missing

4. **Production Deployment**:
   - Set up environment variables
   - Build frontend and backend
   - Initialize database schema
   - Start services (PM2/systemd)
   - Configure Nginx (if needed)

---

## Support Files

All documentation files are in the project root:
- `TECHNICAL_DOCUMENTATION.md` - Complete technical documentation
- `LINUX_VM_LOGIN_TROUBLESHOOTING.md` - Login error troubleshooting
- `QUICK_REFERENCE.md` - Quick command reference
- `PRODUCTION_DEPLOYMENT.md` - Deployment guide (existing)
- `README.md` - Project overview (existing)

Utility scripts:
- `backend/scripts/empty-database.js` - Empty database script
- `backend/scripts/setup-production-db.js` - Setup admin user (existing)

---

**For detailed information, refer to the individual documentation files!**

