#!/usr/bin/env node

/**
 * Empty Database Script
 * 
 * This script removes ALL data from the database while preserving the schema structure.
 * Useful for clearing dummy/test data in development or staging environments.
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA from all tables!
 * ⚠️  This script should NOT be run in production without proper backups!
 * 
 * Usage:
 *   node backend/scripts/empty-database.js
 * 
 * Or with environment variable:
 *   DATABASE_URL=postgresql://... node backend/scripts/empty-database.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Tables to clear (in order to respect foreign key constraints)
// Order matters: delete child tables first, then parent tables
const tablesToClear = [
  // Child tables (dependencies first)
  'spare_part_requests',
  'technician_reports',
  'spare_part_history',
  'request_parts',
  'request_costs',
  'request_activities',
  'notifications',
  'custom_request_statuses',
  'requests',
  'spare_parts',
  'products',
  'customers',
  
  // User-related (clear department references first)
  'users',
  
  // Parent tables (last)
  'departments',
];

async function emptyDatabase() {
  console.log('🗑️  Starting database cleanup...');
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('');

  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    console.log('');

    // Disable foreign key checks temporarily (PostgreSQL doesn't support this easily)
    // So we'll delete in the correct order instead
    
    console.log('🗑️  Clearing tables (in order to respect foreign keys)...');
    
    let totalDeleted = 0;
    
    for (const table of tablesToClear) {
      try {
        // Use Prisma's raw SQL to delete all rows
        // Using TRUNCATE for better performance, but it requires CASCADE for foreign keys
        const result = await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${table}" CASCADE`
        );
        
        console.log(`   ✅ Cleared table: ${table}`);
      } catch (error) {
        // If TRUNCATE fails (e.g., due to constraints), try DELETE
        if (error.message.includes('TRUNCATE') || error.message.includes('cannot truncate')) {
          try {
            const count = await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
            console.log(`   ✅ Cleared table: ${table} (using DELETE)`);
          } catch (deleteError) {
            console.log(`   ⚠️  Could not clear table: ${table}`);
            console.log(`      Error: ${deleteError.message}`);
          }
        } else {
          console.log(`   ⚠️  Could not clear table: ${table}`);
          console.log(`      Error: ${error.message}`);
        }
      }
    }
    
    console.log('');
    console.log('✅ Database cleanup completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Tables cleared: ${tablesToClear.length}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Verify schema is intact: npx prisma db push --skip-generate');
    console.log('   2. Seed fresh data (optional): npx prisma db seed');
    console.log('   3. Create admin user: node scripts/setup-production-db.js');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error during database cleanup:');
    console.error(error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check DATABASE_URL environment variable');
    console.error('  2. Verify database connection');
    console.error('  3. Ensure you have proper permissions');
    console.error('  4. Check if database is locked or in use');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
emptyDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

