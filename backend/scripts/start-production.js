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

  // Seed database if empty (best-effort)
  try {
    console.log('🌱 Checking if seeding is needed...');
    // Use a small Node snippet to check if any users exist; if none, run seed
    execSync("node -e \"(async()=>{const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();const c=await p.user.count();console.log('Users count:',c);await p.$disconnect();if(c===0){process.exit(2)}else{process.exit(0)}})().catch(()=>process.exit(0))\"", { stdio: 'inherit' });
  } catch (checkErr) {
    console.log('No users found, running seed...');
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      console.log('✅ Database seeded');
    } catch (seedErr) {
      console.warn('⚠️  Seeding failed or skipped:', seedErr?.message || seedErr);
    }
  }

  // Start the application
  console.log('🎯 Starting application...');
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
