# Database Initialization Script Fix

## Issue Found

The original SQL script had a **circular dependency** that would cause it to fail:

### Problem
1. `departments` table tried to create a foreign key constraint referencing `users(id)` 
2. But `users` table didn't exist yet when `departments` was being created
3. PostgreSQL would throw error: `relation "users" does not exist`

### Solution Applied

The script has been fixed to resolve the circular dependency:

1. **Create `departments` table WITHOUT the `managerId` foreign key constraint**
2. **Create `users` table WITH the `departmentId` foreign key constraint** (this works because `departments` exists)
3. **Add the `managerId` foreign key constraint to `departments` using `ALTER TABLE`** after both tables exist

### Changes Made

**Before (WRONG - would fail):**
```sql
CREATE TABLE IF NOT EXISTS departments (
    ...
    "managerId" INTEGER,
    CONSTRAINT departments_managerId_fkey FOREIGN KEY ("managerId") REFERENCES users(id) -- ❌ users doesn't exist yet!
);
```

**After (CORRECT):**
```sql
-- Step 1: Create departments WITHOUT foreign key
CREATE TABLE IF NOT EXISTS departments (
    ...
    "managerId" INTEGER,  -- ✅ No constraint yet
    ...
);

-- Step 2: Create users table (can reference departments)
CREATE TABLE IF NOT EXISTS users (
    ...
    CONSTRAINT users_departmentId_fkey FOREIGN KEY ("departmentId") REFERENCES departments(id) -- ✅ departments exists
);

-- Step 3: Add foreign key constraint to departments
ALTER TABLE departments 
ADD CONSTRAINT departments_managerId_fkey 
FOREIGN KEY ("managerId") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE; -- ✅ Now both tables exist
```

## Testing the Script

To verify the script works correctly:

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Run the script
\i database/init.sql

# Or from command line
psql -U your_user -d your_database -f database/init.sql
```

Expected result: All tables created successfully without errors.

## Verification

After running the script, verify tables exist:

```sql
-- List all tables
\dt

-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

You should see:
- `departments.managerId` → `users.id` ✅
- `users.departmentId` → `departments.id` ✅
- All other foreign key relationships ✅

## Notes

- The `IF NOT EXISTS` clause prevents errors if tables already exist
- The `ALTER TABLE` command uses `ADD CONSTRAINT` which will fail if the constraint already exists
- If you need to re-run the script on an existing database, you may need to handle existing constraints
- For production use, consider using Prisma migrations instead: `npx prisma migrate deploy`

## Alternative: Using Prisma (Recommended)

Instead of running raw SQL, use Prisma for schema management:

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or apply migrations (production)
npx prisma migrate deploy
```

Prisma handles circular dependencies automatically.
