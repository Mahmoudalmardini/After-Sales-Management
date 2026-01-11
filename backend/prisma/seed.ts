import { PrismaClient } from '@prisma/client';
import { UserRole, RequestStatus, WarrantyStatus, ExecutionMethod } from '../src/types';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create departments
  console.log('Creating departments...');
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: 'LG Maintenance',
        description: 'TVs, refrigerators, washing machines, dishwashers, ACs, others',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Solar Energy',
        description: 'Solar panels and energy systems',
      },
    }),
    prisma.department.create({
      data: {
        name: 'TP-Link',
        description: 'Networking equipment and routers',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Epson',
        description: 'Printers and printing solutions',
      },
    }),
  ]);

  console.log(`✅ Created ${departments.length} departments`);

  // Create users with hashed passwords
  console.log('Creating users...');
  const saltRounds = 12;

  const users = await Promise.all([
    // Company Manager
    prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@company.com',
        passwordHash: await bcrypt.hash('admin123', saltRounds),
        firstName: 'Ahmed',
        lastName: 'Hassan',
        phone: '+963911234567',
        role: UserRole.COMPANY_MANAGER,
      },
    }),
    
    // Deputy Manager
    prisma.user.create({
      data: {
        username: 'deputy',
        email: 'deputy@company.com',
        passwordHash: await bcrypt.hash('deputy123', saltRounds),
        firstName: 'Fatma',
        lastName: 'Ali',
        phone: '+963911234568',
        role: UserRole.DEPUTY_MANAGER,
      },
    }),
    
    // Department Managers
    prisma.user.create({
      data: {
        username: 'lg_manager',
        email: 'lg.manager@company.com',
        passwordHash: await bcrypt.hash('manager123', saltRounds),
        firstName: 'Mohamed',
        lastName: 'Mahmoud',
        phone: '+963911234569',
        role: UserRole.DEPARTMENT_MANAGER,
        departmentId: departments[0].id, // LG Maintenance
      },
    }),
    
    prisma.user.create({
      data: {
        username: 'solar_manager',
        email: 'solar.manager@company.com',
        passwordHash: await bcrypt.hash('manager123', saltRounds),
        firstName: 'Sara',
        lastName: 'Ahmed',
        phone: '+963911234570',
        role: UserRole.DEPARTMENT_MANAGER,
        departmentId: departments[1].id, // Solar Energy
      },
    }),
    
    // Section Supervisors
    prisma.user.create({
      data: {
        username: 'lg_supervisor',
        email: 'lg.supervisor@company.com',
        passwordHash: await bcrypt.hash('supervisor123', saltRounds),
        firstName: 'Omar',
        lastName: 'Khalil',
        phone: '+963911234571',
        role: UserRole.SECTION_SUPERVISOR,
        departmentId: departments[0].id, // LG Maintenance
      },
    }),
    
    prisma.user.create({
      data: {
        username: 'tplink_supervisor',
        email: 'tplink.supervisor@company.com',
        passwordHash: await bcrypt.hash('supervisor123', saltRounds),
        firstName: 'Nour',
        lastName: 'Ibrahim',
        phone: '+963911234572',
        role: UserRole.SECTION_SUPERVISOR,
        departmentId: departments[2].id, // TP-Link
      },
    }),
    
    // Technicians
    prisma.user.create({
      data: {
        username: 'tech1',
        email: 'tech1@company.com',
        passwordHash: await bcrypt.hash('tech123', saltRounds),
        firstName: 'Youssef',
        lastName: 'Mansour',
        phone: '+963911234573',
        role: UserRole.TECHNICIAN,
        departmentId: departments[0].id, // LG Maintenance
      },
    }),
    
    prisma.user.create({
      data: {
        username: 'tech2',
        email: 'tech2@company.com',
        passwordHash: await bcrypt.hash('tech123', saltRounds),
        firstName: 'Menna',
        lastName: 'Farouk',
        phone: '+963911234574',
        role: UserRole.TECHNICIAN,
        departmentId: departments[1].id, // Solar Energy
      },
    }),
    
    prisma.user.create({
      data: {
        username: 'tech3',
        email: 'tech3@company.com',
        passwordHash: await bcrypt.hash('tech123', saltRounds),
        firstName: 'Kareem',
        lastName: 'Mostafa',
        phone: '+963911234575',
        role: UserRole.TECHNICIAN,
        departmentId: departments[2].id, // TP-Link
      },
    }),
    
    prisma.user.create({
      data: {
        username: 'tech4',
        email: 'tech4@company.com',
        passwordHash: await bcrypt.hash('tech123', saltRounds),
        firstName: 'Heba',
        lastName: 'Salah',
        phone: '+963911234576',
        role: UserRole.TECHNICIAN,
        departmentId: departments[3].id, // Epson
      },
    }),
  ]);

  // Update department managers
  await Promise.all([
    prisma.department.update({
      where: { id: departments[0].id },
      data: { managerId: users[2].id }, // LG Manager
    }),
    prisma.department.update({
      where: { id: departments[1].id },
      data: { managerId: users[3].id }, // Solar Manager
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

console.log('\nKeys: Login Credentials:');
  console.log('   Company Manager: admin / admin123');
  console.log('   Deputy Manager: deputy / deputy123');
  console.log('   LG Manager: lg_manager / manager123');
  console.log('   Solar Manager: solar_manager / manager123');
  console.log('   LG Supervisor: lg_supervisor / supervisor123');
  console.log('   TP-Link Supervisor: tplink_supervisor / supervisor123');
  console.log('   Technician 1: tech1 / tech123');
  console.log('   Technician 2: tech2 / tech123');
  console.log('   Technician 3: tech3 / tech123');
  console.log('   Technician 4: tech4 / tech123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
