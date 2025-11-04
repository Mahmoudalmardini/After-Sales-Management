#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting After-Sales Backend in Production Mode...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please ensure you have a PostgreSQL database configured.');
  process.exit(1);
}

// Check if it's a PostgreSQL URL
if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL must be a PostgreSQL connection string!');
  console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
  console.error('Expected format: postgresql://user:password@host:port/database');
  process.exit(1);
}

console.log('✅ PostgreSQL DATABASE_URL detected:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

/**
 * Wait for database to be ready with exponential backoff
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<void>}
 */
async function waitForDatabase(maxRetries = 30, initialDelay = 2000) {
  // Import Prisma Client after generation
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting to connect to database (attempt ${attempt}/${maxRetries})...`);
      await prisma.$connect();
      console.log('✅ Database connection established!');
      await prisma.$disconnect();
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed to connect to database after ${maxRetries} attempts`);
        await prisma.$disconnect().catch(() => {});
        throw new Error(`Database connection failed: ${error.message}`);
      }
      console.log(`⏳ Database not ready yet, waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff with max delay of 10 seconds
      delay = Math.min(delay * 1.5, 10000);
    }
  }
}

/**
 * Execute command with retry logic
 * @param {string} command - Command to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {string} description - Description for logging
 * @returns {Promise<void>}
 */
function executeWithRetry(command, maxRetries = 3, description = 'Command') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      execSync(command, { stdio: 'inherit' });
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ ${description} failed after ${maxRetries} attempts`);
        throw error;
      }
      console.log(`⚠️  ${description} failed (attempt ${attempt}/${maxRetries}), retrying in 2 seconds...`);
      // Wait before retry
      try {
        execSync('sleep 2', { stdio: 'ignore' });
      } catch {
        // Fallback for Windows (sleep command not available)
        const start = Date.now();
        while (Date.now() - start < 2000) {
          // Busy wait
        }
      }
    }
  }
}

async function main() {
  try {
    // Generate Prisma client first (required for all operations)
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');

    // Wait for database to be ready
    console.log('⏳ Waiting for database to be ready...');
    await waitForDatabase(30, 2000);

    // Apply database migrations (safe - only applies pending migrations, no data loss)
    console.log('📦 Applying database migrations...');
    try {
      executeWithRetry('npx prisma migrate deploy', 3, 'Database migration');
      console.log('✅ Database migrations applied successfully');
    } catch (migrateError) {
      console.error('❌ Database migration failed:', migrateError.message);
      console.log('⚠️  Migration failed. This might indicate:');
      console.log('   1. Database schema is out of sync with migrations');
      console.log('   2. There are migration conflicts');
      console.log('   3. Database connection issues');
      console.log('');
      console.log('💡 To preserve your data, please:');
      console.log('   1. Check Railway logs for detailed error messages');
      console.log('   2. Review your Prisma migrations');
      console.log('   3. Consider running migrations manually if needed');
      throw migrateError;
    }

    // Seed the database if it's empty (safe - only seeds if tables are empty)
    console.log('🌱 Attempting to seed database...');
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      console.log('✅ Database seeded successfully');
    } catch (seedErr) {
      // Seeding failure is non-critical - log but don't fail
      console.warn('⚠️  Seeding failed (this is usually OK if data already exists)');
      console.warn('   Error:', seedErr.message);
    }

    // Start the application
    console.log('🎯 Starting application...');
    execSync('node dist/index.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

main();
