// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────

const hash = (password) => bcrypt.hash(password, 12);

const randomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

const formatDate = (date) => date.toISOString().slice(0, 10);

// Generate invoice number
const generateInvoiceNumber = (date, index) => {
  const dateStr = formatDate(date).replace(/-/g, '');
  return `INV-${dateStr}-${String(index).padStart(3, '0')}`;
};

// ── Main Seed ─────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...');

  // ── 1. Hapus semua data lama ──────────────────────────
  console.log('🗑️  Cleaning database...');

  await prisma.paymentVoidRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.stockMutation.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned');

  // ── 2. Buat System Users (1 per role) ────────────────
  console.log('👥 Creating system users...');

  const systemUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@klinik.com',
        password: await hash('SuperAdmin123'),
        role: 'SUPER_ADMIN',
        isActive: true,
        isVerified: true,
        phone: '081234567890',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin Klinik',
        email: 'admin@klinik.com',
        password: await hash('Admin1234'),
        role: 'ADMIN_KLINIK',
        isActive: true,
        isVerified: true,
        phone: '081234567891',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Budi Santoso',
        email: 'dokter@klinik.com',
        password: await hash('Dokter1234'),
        role: 'DOKTER',
        isActive: true,
        isVerified: true,
        phone: '081234567892',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Siti Rahayu',
        email: 'apoteker@klinik.com',
        password: await hash('Apoteker1234'),
        role: 'APOTEKER',
        isActive: true,
        isVerified: true,
        phone: '081234567893',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dewi Kusuma',
        email: 'kasir@klinik.com',
        password: await hash('Kasir1234'),
        role: 'KASIR',
        isActive: true,
        isVerified: true,
        phone: '081234567894',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Andi Wijaya',
        email: 'pasien@klinik.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081234567895',
      },
    }),
  ]);

  const [superAdmin, adminKlinik, dokterUser, apotekerUser, kasirUser, pasienUser] = systemUsers;
  console.log('✅ System users created');

  // ── 3. Buat Doctor Users ──────────────────────────────
  console.log('👨‍⚕️  Creating doctors...');

  const doctorUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'dr. Budi Santoso',
        email: 'dr.budi@klinik.com',
        password: await hash('Dokter1234'),
        role: 'DOKTER',
        isActive: true,
        isVerified: true,
        phone: '081298765401',
      },
    }),
    prisma.user.create({
      data: {
        name: 'dr. Anita Permata',
        email: 'dr.anita@klinik.com',
        password: await hash('Dokter1234'),
        role: 'DOKTER',
        isActive: true,
        isVerified: true,
        phone: '081298765402',
      },
    }),
    prisma.user.create({
      data: {
        name: 'dr. Hendra Gunawan',
        email: 'dr.hendra@klinik.com',
        password: await hash('Dokter1234'),
        role: 'DOKTER',
        isActive: true,
        isVerified: true,
        phone: '081298765403',
      },
    }),
  ]);

  const doctors = await Promise.all([
    prisma.doctor.create({
      data: {
        userId: doctorUsers[0].id,
        specialization: 'Dokter Umum',
        licenseNumber: 'SIP-DU-001-2024',
        consultFee: 150000,
        schedule: {
          monday: ['08:00', '16:00'],
          tuesday: ['08:00', '16:00'],
          wednesday: ['08:00', '16:00'],
          thursday: ['08:00', '16:00'],
          friday: ['08:00', '15:00'],
          saturday: ['08:00', '12:00'],
        },
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[1].id,
        specialization: 'Dokter Spesialis Anak',
        licenseNumber: 'SIP-SA-002-2024',
        consultFee: 250000,
        schedule: {
          monday: ['09:00', '15:00'],
          tuesday: ['09:00', '15:00'],
          thursday: ['09:00', '15:00'],
          friday: ['09:00', '14:00'],
        },
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[2].id,
        specialization: 'Dokter Spesialis Penyakit Dalam',
        licenseNumber: 'SIP-PD-003-2024',
        consultFee: 300000,
        schedule: {
          tuesday: ['10:00', '16:00'],
          wednesday: ['10:00', '16:00'],
          thursday: ['10:00', '16:00'],
          saturday: ['09:00', '13:00'],
        },
      },
    }),
  ]);

  console.log('✅ Doctors created');

  // ── 4. Buat Patient Users ─────────────────────────────
  console.log('🏥 Creating patients...');

  const patientUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Andi Wijaya',
        email: 'andi.wijaya@gmail.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081311111111',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sari Indah',
        email: 'sari.indah@gmail.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081322222222',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Rudi Hartono',
        email: 'rudi.hartono@gmail.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081333333333',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Maya Putri',
        email: 'maya.putri@gmail.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081344444444',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Bambang Sutrisno',
        email: 'bambang.sutrisno@gmail.com',
        password: await hash('Pasien1234'),
        role: 'PASIEN',
        isActive: true,
        isVerified: true,
        phone: '081355555555',
      },
    }),
  ]);

  const patients = await Promise.all(
    patientUsers.map((user, index) =>
      prisma.patient.create({
        data: {
          userId: user.id,
          dateOfBirth: new Date(
            1980 + index * 5,
            index * 2,
            index + 1
          ),
          gender: index % 2 === 0 ? 'LAKI_LAKI' : 'PEREMPUAN',
          address: `Jl. Dummy No. ${index + 1}, Banjarmasin, Kalimantan Selatan`,
          bloodType: ['A', 'B', 'AB', 'O'][index % 4],
          allergies: index === 0 ? 'Penisilin' : index === 2 ? 'Aspirin' : null,
          emergencyContact: `0812000000${index + 1}`,
        },
      })
    )
  );

  console.log('✅ Patients created');

  // ── 5. Buat Medicines ─────────────────────────────────
  console.log('💊 Creating medicines...');

  const medicinesData = [
    {
      name: 'Paracetamol 500mg',
      genericName: 'Paracetamol',
      category: 'Analgesik',
      unit: 'tablet',
      price: 500,
      stock: 500,
      minStock: 50,
      expiryDate: new Date('2027-06-30'),
      description: 'Obat penurun demam dan pereda nyeri',
    },
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      category: 'Analgesik',
      unit: 'tablet',
      price: 1500,
      stock: 200,
      minStock: 30,
      expiryDate: new Date('2027-03-31'),
      description: 'Obat antiinflamasi non-steroid',
    },
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      category: 'Antibiotik',
      unit: 'kapsul',
      price: 3000,
      stock: 300,
      minStock: 50,
      expiryDate: new Date('2026-12-31'),
      description: 'Antibiotik spektrum luas',
    },
    {
      name: 'Ciprofloxacin 500mg',
      genericName: 'Ciprofloxacin',
      category: 'Antibiotik',
      unit: 'tablet',
      price: 5000,
      stock: 150,
      minStock: 25,
      expiryDate: new Date('2026-09-30'),
      description: 'Antibiotik golongan fluorokuinolon',
    },
    {
      name: 'Antasida Doen',
      genericName: 'Aluminium Hidroksida + Magnesium Hidroksida',
      category: 'Antasida',
      unit: 'tablet',
      price: 1000,
      stock: 400,
      minStock: 50,
      expiryDate: new Date('2027-01-31'),
      description: 'Obat maag dan gangguan lambung',
    },
    {
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      category: 'Antasida',
      unit: 'kapsul',
      price: 4000,
      stock: 15,
      minStock: 20,
      expiryDate: new Date('2026-08-31'),
      description: 'Penghambat pompa proton untuk tukak lambung',
    },
    {
      name: 'Vitamin C 500mg',
      genericName: 'Asam Askorbat',
      category: 'Vitamin',
      unit: 'tablet',
      price: 1000,
      stock: 600,
      minStock: 100,
      expiryDate: new Date('2027-12-31'),
      description: 'Suplemen vitamin C untuk daya tahan tubuh',
    },
    {
      name: 'Vitamin B Complex',
      genericName: 'Vitamin B1 + B6 + B12',
      category: 'Vitamin',
      unit: 'tablet',
      price: 2000,
      stock: 8,
      minStock: 50,
      expiryDate: new Date('2025-03-31'),
      description: 'Suplemen vitamin B kompleks',
    },
    {
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine HCl',
      category: 'Antihistamin',
      unit: 'tablet',
      price: 2500,
      stock: 200,
      minStock: 30,
      expiryDate: new Date('2026-11-30'),
      description: 'Obat alergi generasi kedua',
    },
    {
      name: 'Loratadine 10mg',
      genericName: 'Loratadine',
      category: 'Antihistamin',
      unit: 'tablet',
      price: 3000,
      stock: 180,
      minStock: 30,
      expiryDate: new Date('2026-10-31'),
      description: 'Antihistamin non-sedatif untuk alergi',
    },
  ];

  const medicines = await Promise.all(
    medicinesData.map((med) =>
      prisma.medicine.create({
        data: med,
      })
    )
  );

  // Catat stok awal sebagai mutasi MASUK
  await Promise.all(
    medicines.map((med) =>
      prisma.stockMutation.create({
        data: {
          medicineId: med.id,
          type: 'MASUK',
          quantity: med.stock,
          reason: 'Initial stock — seed data',
        },
      })
    )
  );

  console.log('✅ Medicines created');

  // ── 6. Buat Appointments + Medical Records + Prescriptions + Billings ──
  console.log('📅 Creating appointments, medical records, prescriptions, billings...');

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  // Data skenario — kombinasi berbagai status
  const scenarios = [
    // ── Bulan lalu — semua LUNAS ──────────────────────
    {
      patientIdx: 0,
      doctorIdx: 0,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 10, 9, 0),
      complaint: 'Demam tinggi sejak 3 hari, batuk dan pilek',
      diagnosis: 'Infeksi Saluran Pernapasan Atas (ISPA)',
      vitals: { bloodPressure: '120/80', weight: 70, height: 170, temperature: 38.5 },
      prescriptionItems: [
        { medicineIdx: 0, quantity: 15, quantityDispensed: 15, dosage: '3x1 sesudah makan' },
        { medicineIdx: 2, quantity: 21, quantityDispensed: 21, dosage: '3x1 sesudah makan' },
        { medicineIdx: 6, quantity: 10, quantityDispensed: 10, dosage: '1x1 pagi' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'TUNAI',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    {
      patientIdx: 1,
      doctorIdx: 1,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 12, 10, 0),
      complaint: 'Anak rewel, demam, tidak mau makan',
      diagnosis: 'Faringitis Akut',
      vitals: { bloodPressure: null, weight: 20, height: 110, temperature: 38.8 },
      prescriptionItems: [
        { medicineIdx: 0, quantity: 15, quantityDispensed: 15, dosage: '3x1/2 tablet sesudah makan' },
        { medicineIdx: 8, quantity: 10, quantityDispensed: 10, dosage: '1x1 malam' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'BPJS',
      paymentStatus: 'LUNAS',
      isBpjs: true,
      bpjsNo: '0001234567890',
      bpjsCoveredAmount: 250000,
    },
    {
      patientIdx: 2,
      doctorIdx: 2,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 15, 11, 0),
      complaint: 'Nyeri ulu hati, mual muntah sejak seminggu',
      diagnosis: 'Gastritis Akut',
      vitals: { bloodPressure: '130/85', weight: 75, height: 168, temperature: 36.8 },
      prescriptionItems: [
        { medicineIdx: 4, quantity: 30, quantityDispensed: 30, dosage: '3x1 sebelum makan' },
        { medicineIdx: 5, quantity: 14, quantityDispensed: 14, dosage: '1x1 malam sebelum tidur' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'QRIS',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    {
      patientIdx: 3,
      doctorIdx: 0,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 5, 9, 30),
      complaint: 'Gatal-gatal dan bersin-bersin, mata merah',
      diagnosis: 'Rinitis Alergi',
      vitals: { bloodPressure: '115/75', weight: 55, height: 160, temperature: 36.5 },
      prescriptionItems: [
        { medicineIdx: 9, quantity: 14, quantityDispensed: 14, dosage: '1x1 malam' },
        { medicineIdx: 6, quantity: 30, quantityDispensed: 30, dosage: '1x1 pagi' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'BRI',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    {
      patientIdx: 4,
      doctorIdx: 1,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 8, 10, 0),
      complaint: 'Batuk berdahak sudah 2 minggu',
      diagnosis: 'Bronkitis Akut',
      vitals: { bloodPressure: '125/82', weight: 80, height: 172, temperature: 37.2 },
      prescriptionItems: [
        { medicineIdx: 2, quantity: 21, quantityDispensed: 10, dosage: '3x1 sesudah makan' },
        { medicineIdx: 0, quantity: 15, quantityDispensed: 15, dosage: '3x1 sesudah makan' },
      ],
      prescriptionStatus: 'DIAMBIL_SEBAGIAN',
      paymentMethod: 'TUNAI',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    {
      patientIdx: 0,
      doctorIdx: 2,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20, 11, 0),
      complaint: 'Nyeri sendi lutut kanan, sulit berjalan',
      diagnosis: 'Osteoarthritis Genu Dextra',
      vitals: { bloodPressure: '140/90', weight: 78, height: 165, temperature: 36.7 },
      prescriptionItems: [
        { medicineIdx: 1, quantity: 30, quantityDispensed: 30, dosage: '2x1 sesudah makan' },
        { medicineIdx: 7, quantity: 30, quantityDispensed: 0, dosage: '1x1 pagi' },
      ],
      prescriptionStatus: 'TIDAK_DIAMBIL',
      paymentMethod: 'MANDIRI',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    // ── Bulan ini — berbagai status ───────────────────
    {
      patientIdx: 1,
      doctorIdx: 0,
      date: new Date(now.getFullYear(), now.getMonth(), 3, 9, 0),
      complaint: 'Sakit kepala dan pusing berputar',
      diagnosis: 'Vertigo Perifer',
      vitals: { bloodPressure: '118/76', weight: 58, height: 162, temperature: 36.6 },
      prescriptionItems: [
        { medicineIdx: 0, quantity: 10, quantityDispensed: 10, dosage: '2x1 sesudah makan' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'GOPAY',
      paymentStatus: 'LUNAS',
      isBpjs: false,
    },
    {
      patientIdx: 2,
      doctorIdx: 1,
      date: new Date(now.getFullYear(), now.getMonth(), 7, 10, 30),
      complaint: 'Ruam kulit dan gatal di lengan',
      diagnosis: 'Dermatitis Kontak Alergi',
      vitals: { bloodPressure: '122/80', weight: 72, height: 169, temperature: 36.9 },
      prescriptionItems: [
        { medicineIdx: 8, quantity: 14, quantityDispensed: 14, dosage: '1x1 malam' },
        { medicineIdx: 6, quantity: 20, quantityDispensed: 20, dosage: '1x1 pagi' },
      ],
      prescriptionStatus: 'SELESAI',
      paymentMethod: 'DANA',
      paymentStatus: 'SEBAGIAN',
      isBpjs: false,
    },
    // ── Appointment aktif — belum selesai ────────────
    {
      patientIdx: 3,
      doctorIdx: 0,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0),
      complaint: 'Kontrol tekanan darah rutin',
      appointmentStatus: 'MENUNGGU',
      skipMedicalRecord: true,
    },
    {
      patientIdx: 4,
      doctorIdx: 2,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0),
      complaint: 'Kontrol gula darah',
      appointmentStatus: 'MENUNGGU',
      skipMedicalRecord: true,
    },
  ];

  let invoiceCounter = {};

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const patient = patients[scenario.patientIdx];
    const doctor = doctors[scenario.doctorIdx];
    const appointmentDate = scenario.date;

    // Generate queue number untuk hari dan dokter yang sama
    const dateKey = formatDate(appointmentDate);
    const doctorKey = `${doctor.id}-${dateKey}`;
    if (!invoiceCounter[doctorKey]) invoiceCounter[doctorKey] = 0;
    invoiceCounter[doctorKey]++;
    const queueNumber = invoiceCounter[doctorKey];

    // Appointment
    const appointmentStatus = scenario.skipMedicalRecord
      ? (scenario.appointmentStatus ?? 'MENUNGGU')
      : 'SELESAI';

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: appointmentDate,
        queueNumber,
        complaint: scenario.complaint,
        status: appointmentStatus,
      },
    });

    if (scenario.skipMedicalRecord) continue;

    // Medical Record
    const medicalRecord = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        appointmentId: appointment.id,
        diagnosis: scenario.diagnosis,
        bloodPressure: scenario.vitals.bloodPressure,
        weight: scenario.vitals.weight,
        height: scenario.vitals.height,
        temperature: scenario.vitals.temperature,
      },
    });

    // Prescription + Items
    const prescription = await prisma.prescription.create({
      data: {
        medicalRecordId: medicalRecord.id,
        status: scenario.prescriptionStatus,
        items: {
          create: scenario.prescriptionItems.map((item) => ({
            medicineId: medicines[item.medicineIdx].id,
            quantity: item.quantity,
            quantityDispensed: item.quantityDispensed,
            dosage: item.dosage,
          })),
        },
      },
    });

    // Stock mutations untuk item yang diambil
    for (const item of scenario.prescriptionItems) {
      if (item.quantityDispensed > 0) {
        await prisma.medicine.update({
          where: { id: medicines[item.medicineIdx].id },
          data: { stock: { decrement: item.quantityDispensed } },
        });

        await prisma.stockMutation.create({
          data: {
            medicineId: medicines[item.medicineIdx].id,
            type: 'KELUAR',
            quantity: item.quantityDispensed,
            reason: `Dispensing resep #${prescription.id} — Dr. ${doctor.user?.name ?? 'Dokter'} — RM: ${patient.medicalRecordNo} — ${formatDate(appointmentDate)}`,
          },
        });
      }
    }

    // Hitung medicine fee dari quantityDispensed × price
    const medicineFee = scenario.prescriptionItems.reduce((sum, item) => {
      return sum + item.quantityDispensed * Number(medicines[item.medicineIdx].price);
    }, 0);

    const consultFee = Number(doctor.consultFee);
    const bpjsCovered = scenario.bpjsCoveredAmount ?? 0;
    const totalAmount = consultFee + medicineFee - bpjsCovered;

    // Invoice number
    const invoiceDateKey = formatDate(appointmentDate);
    if (!invoiceCounter[invoiceDateKey]) invoiceCounter[invoiceDateKey] = 0;
    invoiceCounter[invoiceDateKey]++;
    const invoiceNumber = generateInvoiceNumber(appointmentDate, invoiceCounter[invoiceDateKey]);

    // Billing
    const billing = await prisma.billing.create({
      data: {
        appointmentId: appointment.id,
        invoiceNumber,
        consultFee,
        medicineFee,
        totalAmount,
        paidAmount: scenario.paymentStatus === 'LUNAS'
          ? totalAmount
          : scenario.paymentStatus === 'SEBAGIAN'
            ? consultFee // bayar konsul dulu
            : 0,
        paymentMethod: scenario.paymentMethod,
        paymentStatus: scenario.paymentStatus,
        paidAt: scenario.paymentStatus === 'LUNAS' ? appointmentDate : null,
        isBpjs: scenario.isBpjs ?? false,
        bpjsNo: scenario.bpjsNo ?? null,
        bpjsCoveredAmount: scenario.bpjsCoveredAmount ?? null,
      },
    });

    // Payment records untuk yang sudah bayar
    if (scenario.paymentStatus === 'LUNAS') {
      await prisma.payment.create({
        data: {
          billingId: billing.id,
          amount: totalAmount,
          amountPaid: scenario.paymentMethod === 'TUNAI'
            ? Math.ceil(totalAmount / 10000) * 10000
            : totalAmount,
          change: scenario.paymentMethod === 'TUNAI'
            ? Math.ceil(totalAmount / 10000) * 10000 - totalAmount
            : 0,
          method: scenario.paymentMethod,
          referenceNo: ['BRI', 'BNI', 'BCA', 'MANDIRI', 'BSI', 'QRIS', 'OVO', 'GOPAY', 'DANA', 'SHOPEEPAY']
            .includes(scenario.paymentMethod)
            ? `REF${Date.now()}${i}`
            : null,
          createdBy: kasirUser.id,
        },
      });
    } else if (scenario.paymentStatus === 'SEBAGIAN') {
      await prisma.payment.create({
        data: {
          billingId: billing.id,
          amount: consultFee,
          amountPaid: consultFee,
          change: 0,
          method: 'TUNAI',
          createdBy: kasirUser.id,
        },
      });
    }
  }

  console.log('✅ Appointments, medical records, prescriptions, billings created');

  // ── 7. Tampilkan summary ──────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Seed Credentials:');
  console.log('─────────────────────────────────────────');
  console.log('Role          | Email                        | Password');
  console.log('─────────────────────────────────────────');
  console.log('SUPER_ADMIN   | superadmin@klinik.com        | SuperAdmin123');
  console.log('ADMIN_KLINIK  | admin@klinik.com             | Admin1234');
  console.log('DOKTER        | dr.budi@klinik.com           | Dokter1234');
  console.log('DOKTER        | dr.anita@klinik.com          | Dokter1234');
  console.log('DOKTER        | dr.hendra@klinik.com         | Dokter1234');
  console.log('APOTEKER      | apoteker@klinik.com          | Apoteker1234');
  console.log('KASIR         | kasir@klinik.com             | Kasir1234');
  console.log('PASIEN        | andi.wijaya@gmail.com        | Pasien1234');
  console.log('PASIEN        | sari.indah@gmail.com         | Pasien1234');
  console.log('PASIEN        | rudi.hartono@gmail.com       | Pasien1234');
  console.log('PASIEN        | maya.putri@gmail.com         | Pasien1234');
  console.log('PASIEN        | bambang.sutrisno@gmail.com   | Pasien1234');
  console.log('─────────────────────────────────────────');
  console.log('\n📊 Data Summary:');
  console.log('  👨‍⚕️  Doctors     : 3');
  console.log('  🏥 Patients    : 5');
  console.log('  💊 Medicines   : 10 (2 low stock, 1 expired)');
  console.log('  📅 Appointments: 10 (8 selesai, 2 mendatang)');
  console.log('  📋 Prescriptions: 8 (berbagai status)');
  console.log('  🧾 Billings    : 8 (berbagai status pembayaran)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });