#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Fixing Database Schema Issues...');

try {
  // 1. Remove the problematic migration lock
  console.log('🗑️  Removing migration lock file...');
  try {
    execSync('rm prisma/migrations/migration_lock.toml', { stdio: 'inherit' });
    console.log('✅ Migration lock removed');
  } catch (e) {
    console.log('⚠️  Migration lock file not found (this is OK)');
  }

  // 2. Apply schema directly to PostgreSQL
  console.log('📦 Applying schema to PostgreSQL...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Schema applied successfully');

  // 3. Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');

  // 4. Verify tables exist
  console.log('🔍 Verifying database tables...');
  const verifyScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    async function verifyTables() {
      try {
        // Check if spare_part_history table exists
        const result = await prisma.\$queryRaw\`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'spare_part_history'
        \`;
        
        if (result.length > 0) {
          console.log('✅ spare_part_history table exists');
        } else {
          console.log('❌ spare_part_history table missing');
        }
        
        // Check if spare_parts table exists
        const sparePartsResult = await prisma.\$queryRaw\`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'spare_parts'
        \`;
        
        if (sparePartsResult.length > 0) {
          console.log('✅ spare_parts table exists');
        } else {
          console.log('❌ spare_parts table missing');
        }
        
      } catch (error) {
        console.error('❌ Error verifying tables:', error.message);
      } finally {
        await prisma.\$disconnect();
      }
    }
    
    verifyTables();
  `;
  
  execSync(`node -e "${verifyScript}"`, { stdio: 'inherit' });

  console.log('🎉 Database schema fix completed successfully!');

} catch (error) {
  console.error('❌ Failed to fix database schema:', error.message);
  process.exit(1);
}
