# PostgreSQL Migration Guide

## Overview
This guide helps you migrate from SQLite to PostgreSQL.

## Prerequisites
1. PostgreSQL database (Railway, local, or other hosting)
2. Database connection URL

## Migration Steps

### 1. Update Environment Variables

Create or update `backend/.env` with your PostgreSQL connection:

```env
# PostgreSQL Database URL
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# For Railway (they provide this automatically):
# DATABASE_URL will be set automatically

# JWT Secrets
JWT_SECRET="your-secret-key-min-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN="https://your-frontend-domain.com"
```

### 2. Generate and Apply Migrations

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Or for production, use:
npx prisma migrate deploy
```

### 3. Seed Initial Data (Optional)

If you have seed data:

```bash
npx prisma db seed
```

### 4. Verify Database

```bash
# Open Prisma Studio to check your database
npx prisma studio
```

## Common Issues

### Issue: "Table does not exist"
**Solution**: Run migrations:
```bash
npx prisma migrate deploy
```

### Issue: "Connection refused"
**Solution**: Check your DATABASE_URL and ensure PostgreSQL is running.

### Issue: "SparePartHistory table missing"
**Solution**: The migration will create all tables including SparePartHistory.

## Data Migration from SQLite

If you need to migrate existing data from SQLite to PostgreSQL:

1. Export data from SQLite:
```bash
# Using Prisma Studio or custom export script
```

2. Import to PostgreSQL:
```bash
# Use the exported data to seed PostgreSQL
```

## Verification Checklist

- [ ] Database connection successful
- [ ] All tables created (check with Prisma Studio)
- [ ] Admin user exists
- [ ] Can create customers
- [ ] Can create spare parts
- [ ] Spare parts history logging works
- [ ] Can assign technicians to requests
- [ ] Closed requests stay closed when reassigning technicians

## Notes

- PostgreSQL is case-sensitive for table/column names
- The schema uses snake_case for table names (e.g., `spare_parts`, `spare_part_history`)
- All history logging is now properly configured
- Mobile number validation requires +9639 format (e.g., +963912345678)
