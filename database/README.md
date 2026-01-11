# Database Schema Files

This directory contains SQL scripts for database initialization.

## Files

### `init.sql`
- **Purpose**: Manual PostgreSQL initialization script
- **Status**: ✅ **Fixed** - Circular dependency resolved
- **Usage**: 
  - Used automatically by Docker Compose
  - Or manually: `psql $DATABASE_URL -f database/init.sql`
- **Database**: PostgreSQL

### `schema.sql`
- **Purpose**: Documentation/reference file
- **Status**: Information only (doesn't create tables)
- **Content**: Instructions and references to Prisma schema

### `INIT_SCRIPT_FIX.md`
- **Purpose**: Documentation of the circular dependency fix
- **Status**: Documentation

### `SCHEMA_CREATION_LOCATIONS.md`
- **Purpose**: Complete guide to all places where tables can be created
- **Status**: Documentation

---

## Quick Reference

### Using init.sql (PostgreSQL)
```bash
psql $DATABASE_URL -f database/init.sql
```

### Using Prisma (Recommended)
```bash
cd backend
npx prisma generate
npx prisma db push
```

### Using Docker
```bash
docker-compose up postgres  # init.sql runs automatically
```

---

For more information, see `SCHEMA_CREATION_LOCATIONS.md`
