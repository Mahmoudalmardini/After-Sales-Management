const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function checkAndRestoreData() {
  console.log('🔍 Checking available data for restoration...\n');
  
  try {
    // Check SQLite database
    const sqliteDbPath = path.join(__dirname, 'prisma', 'dev.db');
    console.log('📁 Checking SQLite database at:', sqliteDbPath);
    
    if (fs.existsSync(sqliteDbPath)) {
      console.log('✅ SQLite database found');
      
      // Get file size
      const stats = fs.statSync(sqliteDbPath);
      console.log(`📊 Database size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Try to connect and check data
      try {
        const sqlitePrisma = new PrismaClient({
          datasources: {
            db: {
              url: 'file:./prisma/dev.db'
            }
          }
        });
        
        await sqlitePrisma.$connect();
        
        const counts = {
          users: await sqlitePrisma.user.count(),
          customers: await sqlitePrisma.customer.count(),
          requests: await sqlitePrisma.request.count(),
          products: await sqlitePrisma.product.count(),
          spareParts: await sqlitePrisma.sparePart.count(),
          departments: await sqlitePrisma.department.count()
        };
        
        console.log('\n📊 Local SQLite Data:');
        console.table(counts);
        
        await sqlitePrisma.$disconnect();
        
      } catch (dbError) {
        console.log('⚠️  Could not connect to SQLite database:', dbError.message);
      }
    } else {
      console.log('❌ SQLite database not found');
    }
    
    // Check Excel files
    console.log('\n📁 Checking Excel export files...');
    
    const excelFiles = [
      'final-export.xlsx',
      '../AI_Supporting_Codes_fixed.xlsx',
      '../Stock_Data_301_to_600.xlsx'
    ];
    
    for (const file of excelFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log(`❌ ${file} - not found`);
      }
    }
    
    // Check backup scripts
    console.log('\n📁 Checking backup/restore scripts...');
    const scriptsDir = path.join(__dirname, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir);
      const backupScripts = scripts.filter(s => s.includes('backup') || s.includes('restore'));
      console.log('✅ Available backup/restore scripts:');
      backupScripts.forEach(script => console.log(`  - ${script}`));
    }
    
    console.log('\n🎯 Data Restoration Options:');
    console.log('1. Use local SQLite database (if data is complete)');
    console.log('2. Import from Excel files');
    console.log('3. Use existing backup scripts');
    console.log('4. Manual data entry');
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  }
}

checkAndRestoreData();
