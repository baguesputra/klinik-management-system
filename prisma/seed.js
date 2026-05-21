// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hashPassword = (password) => bcrypt.hash(password, 12);

async function main() {
  console.log('🌱 Seeding database...');

  // ── Bersihkan data lama ──────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.stockMutation.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // ── Users ────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@klinik.com',
        password: await hashPassword('SuperAdmin123'),
        role: 'SUPER_ADMIN',
        isActive: true,
        isVerified: true,
        phone: '08100000001',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin Klinik',
        email: 'admin@klinik.com',
        password: await hashPassword('Admin1234'),
        role: 'ADMIN_KLINIK',
        isActive: true,
        isVerified: true,
        phone: '08100000002',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Budi Santoso',
        email: 'dokter@klinik.com',
        password: await hashPassword('Dokter1234'),
        role: 'DOKTER',
        isActive: true,
        isVerified: true,
        phone: '08100000003',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Siti Apoteker',
        email: 'apoteker@klinik.com',
        password: await hashPassword('Apoteker1234'),
        role: 'APOTEKER',
        isActive: true,
        isVerified: true,
        phone: '08100000004',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Rudi Kasir',
        email: 'kasir@klinik.com',
        password: await hashPassword('Kasir1234'),
        role: 'KASIR',
        isActive: true,
        isVerified: true,
        phone: '08100000005',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Pasien Pertama',
        email: 'pasien@klinik.com',
        password: await hashPassword('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '08100000006',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ── Doctor Profile ───────────────────────────────────
  const doctorUser = users.find((u) => u.role === 'DOKTER');
  const doctor = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      specialization: 'Dokter Umum',
      licenseNumber: 'STR-001-2024',
      schedule: {
        senin: { open: '08:00', close: '12:00' },
        selasa: { open: '08:00', close: '12:00' },
        rabu: { open: '08:00', close: '12:00' },
        kamis: { open: '08:00', close: '12:00' },
        jumat: { open: '08:00', close: '11:00' },
        sabtu: { open: '08:00', close: '10:00' },
      },
    },
  });

  console.log('✅ Created doctor profile');

  // ── Patient Profile ──────────────────────────────────
  const patientUser = users.find((u) => u.role === 'PASIEN');
  await prisma.patient.create({
    data: {
      userId: patientUser.id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'LAKI_LAKI',
      address: 'Jl. Sudirman No. 1, Banjarmasin',
      bloodType: 'O',
      allergies: 'Penisilin',
      emergencyContact: '08199999999',
    },
  });

  console.log('✅ Created patient profile');

  // ── Medicines ────────────────────────────────────────
  const medicines = await prisma.medicine.createMany({
    data: [
      {
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        category: 'Analgesik',
        unit: 'Tablet',
        price: 500,
        stock: 500,
        minStock: 50,
        description: 'Obat penurun demam dan pereda nyeri',
      },
      {
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        category: 'Antibiotik',
        unit: 'Kapsul',
        price: 2500,
        stock: 200,
        minStock: 30,
        description: 'Antibiotik spektrum luas',
      },
      {
        name: 'Antasida DOEN',
        genericName: 'Aluminium Hidroksida',
        category: 'Antasida',
        unit: 'Tablet',
        price: 800,
        stock: 300,
        minStock: 40,
        description: 'Obat maag dan gangguan pencernaan',
      },
      {
        name: 'OBH Combi',
        genericName: 'Bromhexin HCl',
        category: 'Antitusif',
        unit: 'Botol',
        price: 18000,
        stock: 50,
        minStock: 10,
        description: 'Obat batuk dan flu',
      },
      {
        name: 'Vitamin C 500mg',
        genericName: 'Asam Askorbat',
        category: 'Vitamin',
        unit: 'Tablet',
        price: 1000,
        stock: 400,
        minStock: 50,
        description: 'Suplemen vitamin C',
      },
    ],
  });

  console.log(`✅ Created medicines`);

  console.log('\n🎉 Seed completed!\n');
  console.log('📋 Login credentials:');
  console.log('─────────────────────────────────────────');
  console.log('SUPER_ADMIN  → superadmin@klinik.com / SuperAdmin123');
  console.log('ADMIN_KLINIK → admin@klinik.com      / Admin1234');
  console.log('DOKTER       → dokter@klinik.com     / Dokter1234');
  console.log('APOTEKER     → apoteker@klinik.com   / Apoteker1234');
  console.log('KASIR        → kasir@klinik.com      / Kasir1234');
  console.log('PASIEN       → pasien@klinik.com     / Pasien1234');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());