/**
 * Script to apply the spare_part_history cascade fix in production
 * This fixes the 502 error when deleting spare parts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyFix() {
  console.log('🔧 Applying spare_part_history cascade fix...');
  
  try {
    // Drop the existing foreign key constraint
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "spare_part_history" 
      DROP CONSTRAINT IF EXISTS "spare_part_history_sparePartId_fkey";
    `);
    console.log('✅ Dropped old foreign key constraint');

    // Add the foreign key constraint with ON DELETE CASCADE
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "spare_part_history" 
      ADD CONSTRAINT "spare_part_history_sparePartId_fkey" 
      FOREIGN KEY ("sparePartId") 
      REFERENCES "spare_parts"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE;
    `);
    console.log('✅ Added new foreign key constraint with CASCADE');

    console.log('🎉 Migration applied successfully!');
    console.log('✅ You can now delete spare parts without 502 errors');
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyFix()
  .catch((error) => {
    console.error('Failed to apply fix:', error);
    process.exit(1);
  });
