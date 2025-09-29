#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

try {
  // Run Prisma migrations, with fallback to db push if no migrations are present
  try {
    console.log('📦 Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations completed');
  } catch (migrateError) {
    console.warn('⚠️  migrate deploy failed or no migrations found, attempting prisma db push...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ prisma db push completed');
  }

  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');

  // Start the application
  console.log('🎯 Starting application...');
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
