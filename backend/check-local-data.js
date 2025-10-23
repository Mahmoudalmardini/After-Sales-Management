const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function checkLocalData() {
  console.log('🔍 Checking local data availability...\n');
  
  try {
    // Check if SQLite database exists
    const sqliteDbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ SQLite database not found at:', sqliteDbPath);
      return;
    }
    
    console.log('✅ SQLite database found:', sqliteDbPath);
    
    // Try to connect with SQLite configuration
    const sqlitePrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./prisma/dev.db'
        }
      }
    });
    
    await sqlitePrisma.$connect();
    console.log('✅ Connected to SQLite database');
    
    // Check data counts
    const counts = {
      users: await sqlitePrisma.user.count(),
      customers: await sqlitePrisma.customer.count(),
      requests: await sqlitePrisma.request.count(),
      products: await sqlitePrisma.product.count(),
      spareParts: await sqlitePrisma.sparePart.count(),
      departments: await sqlitePrisma.department.count(),
      activities: await sqlitePrisma.requestActivity.count(),
      costs: await sqlitePrisma.requestCost.count(),
      requestParts: await sqlitePrisma.requestPart.count(),
      notifications: await sqlitePrisma.notification.count()
    };
    
    console.log('\n📊 Local Data Counts:');
    console.table(counts);
    
    // Show sample data
    if (counts.users > 0) {
      const users = await sqlitePrisma.user.findMany({ take: 5 });
      console.log('\n👥 Sample Users:');
      users.forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
      });
    }
    
    if (counts.requests > 0) {
      const requests = await sqlitePrisma.request.findMany({ take: 5 });
      console.log('\n📋 Sample Requests:');
      requests.forEach(request => {
        console.log(`  - ${request.requestNumber} - ${request.status} - ${request.issueDescription}`);
      });
    }
    
    await sqlitePrisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error checking local data:', error.message);
  }
}

checkLocalData();
