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
  // Always ensure database schema is up to date using db push (force schema sync)
  console.log('📦 Synchronizing database schema...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  console.log('✅ Database schema synchronized');

  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');

  // Always seed the database (it will skip if data exists)
  console.log('🌱 Seeding database...');
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully');
  } catch (seedErr) {
    console.log('⚠️  Seeding completed with warnings or data already exists');
  }

  // Start the application
  console.log('🎯 Starting application...');
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
