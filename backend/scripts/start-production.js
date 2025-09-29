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

  // Check if database has any tables - if not, it's a fresh database
  console.log('🔍 Checking database state...');
  let needsInitialization = false;
  
  try {
    // Try to query a simple table count - this will fail if no tables exist
    execSync('npx prisma db execute --stdin < /dev/null', { stdio: 'pipe' });
  } catch (e) {
    needsInitialization = true;
  }

  if (needsInitialization) {
    console.log('📦 Fresh database detected, initializing schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Database schema created');
  } else {
    console.log('📦 Existing database detected, applying any pending changes...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Database migrations applied');
    } catch (migrateError) {
      console.log('⚠️  No migrations to deploy, using db push...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database schema synchronized');
    }
  }

  // Seed the database if it's empty
  console.log('🌱 Checking if seeding is needed...');
  try {
    const checkResult = execSync(`node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.count()
        .then(count => {
          console.log('Users found:', count);
          process.exit(count === 0 ? 1 : 0);
        })
        .catch(() => process.exit(1))
        .finally(() => prisma.\\$disconnect());
    "`, { stdio: 'inherit' });
  } catch (seedCheckError) {
    console.log('🌱 No users found, seeding database...');
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      console.log('✅ Database seeded successfully');
    } catch (seedErr) {
      console.warn('⚠️  Seeding failed:', seedErr.message);
    }
  }

  // Start the application
  console.log('🎯 Starting application...');
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
