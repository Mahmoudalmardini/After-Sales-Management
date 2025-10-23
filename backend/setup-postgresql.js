#!/usr/bin/env node

/**
 * PostgreSQL Setup Script
 * This script helps set up PostgreSQL for the MES program
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setupPostgreSQL() {
  console.log('🚀 Setting up PostgreSQL for MES Program...\n');

  try {
    // Check if PostgreSQL is running
    console.log('📊 Checking PostgreSQL status...');
    try {
      execSync('pg_isready', { stdio: 'pipe' });
      console.log('✅ PostgreSQL is running');
    } catch (error) {
      console.log('❌ PostgreSQL is not running. Please start PostgreSQL first.');
      console.log('   On Windows, you can start it from Services or run:');
      console.log('   net start postgresql-x64-15');
      return;
    }

    // Create database if it doesn't exist
    console.log('📁 Creating database...');
    try {
      execSync('createdb mes_program', { stdio: 'pipe' });
      console.log('✅ Database "mes_program" created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Database "mes_program" already exists');
      } else {
        console.log('❌ Error creating database:', error.message);
        return;
      }
    }

    // Create .env file for PostgreSQL
    console.log('⚙️  Creating PostgreSQL environment file...');
    const envContent = `# Database - PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/mes_program"

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="fallback-secret-key-change-this-in-production-min-32-characters"
JWT_REFRESH_SECRET="fallback-refresh-secret-key-change-this-in-production"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
`;

    fs.writeFileSync('.env.postgresql', envContent);
    console.log('✅ PostgreSQL environment file created');

    console.log('\n🎉 PostgreSQL setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy .env.postgresql to .env');
    console.log('2. Update the DATABASE_URL with your actual PostgreSQL credentials');
    console.log('3. Run: npm run migrate:postgresql');
    console.log('4. Run the migration script to transfer your data');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupPostgreSQL();
