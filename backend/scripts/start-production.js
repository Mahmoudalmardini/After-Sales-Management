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

// Parse and display DATABASE_URL info (safely)
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?|$)/);
if (urlMatch) {
  const [, user, , host, port, database] = urlMatch;
  console.log('✅ PostgreSQL DATABASE_URL detected:');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Database: ${database}`);
  console.log(`   User: ${user}`);
  console.log(`   Full URL: ${dbUrl.replace(/\/\/.*@/, '//***:***@')}`);
} else {
  console.log('✅ PostgreSQL DATABASE_URL detected:', dbUrl.replace(/\/\/.*@/, '//***:***@'));
}

/**
 * Wait for database to be ready with exponential backoff
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<void>}
 */
async function waitForDatabase(maxRetries = 10, initialDelay = 2000) {
  // Import Prisma Client after generation
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  let delay = initialDelay;
  
  // Set connection timeout to prevent hanging
  const connectionTimeout = 5000; // 5 seconds per attempt
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting to connect to database (attempt ${attempt}/${maxRetries})...`);
      
      // Use Promise.race to add timeout
      const connectPromise = prisma.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Database connection established!');
      await prisma.$disconnect().catch(() => {});
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed to connect to database after ${maxRetries} attempts`);
        console.error(`   Last error: ${error.message}`);
        await prisma.$disconnect().catch(() => {});
        throw new Error(`Database connection failed: ${error.message}`);
      }
      const waitTime = Math.min(delay, 5000); // Cap at 5 seconds
      console.log(`⏳ Database not ready yet, waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Exponential backoff with max delay of 5 seconds
      delay = Math.min(delay * 1.5, 5000);
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

    // Wait for database to be ready (reduced timeout - 2 minutes max)
    console.log('⏳ Waiting for database to be ready (max 2 minutes)...');
    let dbReady = false;
    try {
      await waitForDatabase(10, 2000); // 10 attempts * ~10s max = ~2 minutes
      dbReady = true;
    } catch (dbError) {
      console.warn('⚠️  Database not immediately available:', dbError.message);
      console.log('');
      console.log('📝 Continuing startup - app will retry database connection at runtime');
      console.log('');
      console.log('🔍 Troubleshooting steps:');
      console.log('   1. Check Railway dashboard:');
      console.log('      - Is PostgreSQL service running and healthy?');
      console.log('      - Is it linked to this service?');
      console.log('      - Check the "Variables" tab for DATABASE_URL');
      console.log('   2. Verify DATABASE_URL format:');
      console.log('      - Should be: postgresql://user:password@host:port/database');
      console.log('      - For Railway internal: host should be like "postgres.railway.internal"');
      console.log('      - Or use the public URL if available');
      console.log('   3. If database service is not linked:');
      console.log('      - Go to Railway dashboard');
      console.log('      - Click on your PostgreSQL service');
      console.log('      - Click "Connect" or "Link Service"');
      console.log('      - Ensure DATABASE_URL is set in your app service variables');
      console.log('');
      dbReady = false;
    }

    // Apply database migrations (only if database is ready)
    if (dbReady) {
      console.log('📦 Applying database migrations...');
      try {
        executeWithRetry('npx prisma migrate deploy', 3, 'Database migration');
        console.log('✅ Database migrations applied successfully');
      } catch (migrateError) {
        console.warn('⚠️  Database migration failed:', migrateError.message);
        console.log('📝 App will start anyway - migrations can be applied manually later');
        console.log('💡 To apply migrations manually, run: npx prisma migrate deploy');
        // Don't fail startup - continue anyway
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
    } else {
      console.log('⏭️  Skipping migrations and seeding (database not ready)');
      console.log('   The app will handle database connection at runtime');
    }

    // Start the application (even if database wasn't ready)
    console.log('🎯 Starting application...');
    console.log('📌 Note: If database connection fails, check:');
    console.log('   1. Railway service health and logs');
    console.log('   2. DATABASE_URL environment variable');
    console.log('   3. Service linking in Railway dashboard');
    execSync('node dist/index.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

main();
