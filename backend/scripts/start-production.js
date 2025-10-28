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
  // Generate Prisma client first (required for all operations)
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');

  // Apply database migrations
  console.log('📦 Applying database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations applied');
  } catch (migrateError) {
    console.log('⚠️  Migration failed, trying db push...');
    try {
      // Accept potential data loss (e.g., dropping columns) intentionally in production fallback
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema synchronized');
    } catch (pushError) {
      console.error('❌ Both migration and db push failed:', pushError.message);
      throw pushError;
    }
  }

  // Seed the database if it's empty
  console.log('🌱 Attempting to seed database...');
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully');
  } catch (seedErr) {
    console.warn('⚠️  Seeding failed (this is usually OK if data already exists):', seedErr.message);
  }

  // Start the application
  console.log('🎯 Starting application...');
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
