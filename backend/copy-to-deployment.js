const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function copyToDeployment() {
  console.log('🚀 Starting Quick Database Copy to Deployment...\n');
  
  try {
    // Check local SQLite database
    const sqliteDbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ Local SQLite database not found.');
      return;
    }
    
    console.log('✅ Local SQLite database found');
    
    // Connect to local SQLite database
    const sqlitePrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./prisma/dev.db'
        }
      }
    });
    
    await sqlitePrisma.$connect();
    console.log('✅ Connected to local SQLite database');
    
    // Get all data from local database
    console.log('\n📊 Extracting data from local database...');
    
    const localData = {
      departments: await sqlitePrisma.department.findMany(),
      users: await sqlitePrisma.user.findMany(),
      customers: await sqlitePrisma.customer.findMany(),
      products: await sqlitePrisma.product.findMany(),
      spareParts: await sqlitePrisma.sparePart.findMany(),
      requests: await sqlitePrisma.request.findMany(),
      activities: await sqlitePrisma.requestActivity.findMany(),
      costs: await sqlitePrisma.requestCost.findMany(),
      requestParts: await sqlitePrisma.requestPart.findMany(),
      notifications: await sqlitePrisma.notification.findMany()
    };
    
    console.log('✅ Data extracted successfully');
    
    // Create deployment restoration script
    const deploymentScript = `
const { PrismaClient } = require('@prisma/client');

const localData = ${JSON.stringify(localData, null, 2)};

async function restoreToDeployment() {
  console.log('🚀 Restoring data to deployment database...');
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    console.log('✅ Connected to deployment database');
    
    // Restore departments first (they have no dependencies)
    console.log('📁 Restoring departments...');
    for (const dept of localData.departments) {
      await prisma.department.upsert({
        where: { id: dept.id },
        update: dept,
        create: dept
      });
    }
    console.log(\`✅ Restored \${localData.departments.length} departments\`);
    
    // Restore users
    console.log('👥 Restoring users...');
    for (const user of localData.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    console.log(\`✅ Restored \${localData.users.length} users\`);
    
    // Restore customers
    console.log('🏢 Restoring customers...');
    for (const customer of localData.customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer
      });
    }
    console.log(\`✅ Restored \${localData.customers.length} customers\`);
    
    // Restore products
    console.log('📦 Restoring products...');
    for (const product of localData.products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: product,
        create: product
      });
    }
    console.log(\`✅ Restored \${localData.products.length} products\`);
    
    // Restore spare parts
    console.log('🔧 Restoring spare parts...');
    for (const part of localData.spareParts) {
      await prisma.sparePart.upsert({
        where: { id: part.id },
        update: part,
        create: part
      });
    }
    console.log(\`✅ Restored \${localData.spareParts.length} spare parts\`);
    
    // Restore requests
    console.log('📋 Restoring requests...');
    for (const request of localData.requests) {
      await prisma.request.upsert({
        where: { id: request.id },
        update: request,
        create: request
      });
    }
    console.log(\`✅ Restored \${localData.requests.length} requests\`);
    
    // Restore activities
    console.log('📝 Restoring activities...');
    for (const activity of localData.activities) {
      await prisma.requestActivity.upsert({
        where: { id: activity.id },
        update: activity,
        create: activity
      });
    }
    console.log(\`✅ Restored \${localData.activities.length} activities\`);
    
    // Restore costs
    console.log('💰 Restoring costs...');
    for (const cost of localData.costs) {
      await prisma.requestCost.upsert({
        where: { id: cost.id },
        update: cost,
        create: cost
      });
    }
    console.log(\`✅ Restored \${localData.costs.length} costs\`);
    
    // Restore request parts
    console.log('🔩 Restoring request parts...');
    for (const part of localData.requestParts) {
      await prisma.requestPart.upsert({
        where: { id: part.id },
        update: part,
        create: part
      });
    }
    console.log(\`✅ Restored \${localData.requestParts.length} request parts\`);
    
    // Restore notifications
    console.log('🔔 Restoring notifications...');
    for (const notification of localData.notifications) {
      await prisma.notification.upsert({
        where: { id: notification.id },
        update: notification,
        create: notification
      });
    }
    console.log(\`✅ Restored \${localData.notifications.length} notifications\`);
    
    console.log('🎉 Data restoration completed successfully!');
    
    // Verify restoration
    const counts = {
      departments: await prisma.department.count(),
      users: await prisma.user.count(),
      customers: await prisma.customer.count(),
      products: await prisma.product.count(),
      spareParts: await prisma.sparePart.count(),
      requests: await prisma.request.count(),
      activities: await prisma.requestActivity.count(),
      costs: await prisma.requestCost.count(),
      requestParts: await prisma.requestPart.count(),
      notifications: await prisma.notification.count()
    };
    
    console.log('\\n📊 Final counts:');
    console.table(counts);
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreToDeployment();
`;
    
    // Save deployment script
    const deploymentScriptPath = path.join(__dirname, 'restore-to-deployment.js');
    fs.writeFileSync(deploymentScriptPath, deploymentScript);
    console.log(`✅ Deployment restoration script created: ${deploymentScriptPath}`);
    
    // Create instructions
    const instructions = `
# Quick Database Copy - Deployment Instructions

## What's Ready:
- ✅ Local data extracted (${localData.departments.length} departments, ${localData.users.length} users, ${localData.customers.length} customers, ${localData.requests.length} requests)
- ✅ Deployment restoration script created: restore-to-deployment.js

## Steps to Deploy:

### Method 1: Direct Deployment (Recommended)
1. Copy the \`restore-to-deployment.js\` file to your deployment server
2. Run: \`node restore-to-deployment.js\`
3. Verify the data is restored

### Method 2: Railway Deployment
1. Add the \`restore-to-deployment.js\` file to your repository
2. Deploy to Railway
3. Run the restoration script on Railway
4. Verify the data is restored

### Method 3: Manual Database Update
1. Access your deployment database directly
2. Use the restoration script to import data
3. Verify the data is restored

## Verification:
After restoration, check that you have:
- ${localData.departments.length} departments
- ${localData.users.length} users
- ${localData.customers.length} customers
- ${localData.requests.length} requests
- ${localData.products.length} products
- ${localData.spareParts.length} spare parts

## Next Steps:
1. Choose your deployment method
2. Run the restoration script
3. Verify data integrity
4. Test your application
`;
    
    const instructionsPath = path.join(__dirname, 'DEPLOYMENT_COPY_INSTRUCTIONS.md');
    fs.writeFileSync(instructionsPath, instructions);
    console.log(`✅ Instructions saved: ${instructionsPath}`);
    
    await sqlitePrisma.$disconnect();
    
    console.log('\n🎉 Quick Database Copy preparation completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy restore-to-deployment.js to your deployment server');
    console.log('2. Run: node restore-to-deployment.js');
    console.log('3. Verify the data is restored');
    
  } catch (error) {
    console.error('❌ Error during preparation:', error.message);
  }
}

copyToDeployment();