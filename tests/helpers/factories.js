// tests/helpers/factories.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/config/database.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

// ── User factories ────────────────────────────────────

export const createUser = async (overrides = {}) => {
  let password = overrides.password;
  if (password && !password.startsWith('$2')) {
    password = await bcrypt.hash(password, 12);
  } else if (!password) {
    password = await bcrypt.hash('TestPass123', 12);
  }

  const defaults = {
    name: 'Test User',
    email: `test.${Date.now()}@example.com`,
    role: 'PASIEN',
    isActive: true,
    isVerified: true,
  };

  return prisma.user.create({
    data: { ...defaults, ...overrides, password },
  });
};

export const createSuperAdmin = (overrides = {}) =>
  createUser({ role: 'SUPER_ADMIN', name: 'Super Admin', ...overrides });

export const createAdminKlinik = (overrides = {}) =>
  createUser({ role: 'ADMIN_KLINIK', name: 'Admin Klinik', ...overrides });

export const createDokter = (overrides = {}) =>
  createUser({ role: 'DOKTER', name: 'Dr. Test', ...overrides });

export const createApoteker = (overrides = {}) =>
  createUser({ role: 'APOTEKER', name: 'Apoteker Test', ...overrides });

export const createKasir = (overrides = {}) =>
  createUser({ role: 'KASIR', name: 'Kasir Test', ...overrides });

export const createPasien = (overrides = {}) =>
  createUser({ role: 'PASIEN', name: 'Pasien Test', ...overrides });

// ── Token factory ─────────────────────────────────────

export const getAuthToken = (user) => {
  return generateAccessToken({ sub: user.id, role: user.role });
};

export const getAuthHeader = (user) => ({
  Authorization: `Bearer ${getAuthToken(user)}`,
});

// ── Doctor factory ────────────────────────────────────

export const createDoctor = async (overrides = {}) => {
  // Kalau userId sudah ada di overrides, pakai langsung
  // Kalau tidak, buat user baru
  const userId = overrides.userId;
  
  if (!userId) {
    const user = await createDokter();
    overrides.userId = user.id;
  }

  const { userId: uid, ...rest } = overrides;

  return prisma.doctor.create({
    data: {
      userId: uid,
      specialization: 'Dokter Umum',
      licenseNumber: `SIP-${Date.now()}`,
      consultFee: 150000,
      schedule: {
        monday: ['08:00', '16:00'],
        tuesday: ['08:00', '16:00'],
        wednesday: ['08:00', '16:00'],
        thursday: ['08:00', '16:00'],
        friday: ['08:00', '15:00'],
        saturday: ['08:00', '12:00'],
        sunday: ['08:00', '12:00'],
      },
      ...rest,
    },
    include: { user: true },
  });
};

// ── Patient factory ───────────────────────────────────

export const createPatient = async (overrides = {}) => {
  const { userId, ...patientData } = overrides;

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await createPasien();

  return prisma.patient.create({
    data: {
      userId: user.id,
      dateOfBirth: new Date('1990-01-15'),
      gender: 'LAKI_LAKI',
      address: 'Jl. Test No. 1',
      bloodType: 'A',
      ...patientData,
    },
    include: { user: true },
  });
};

// ── Medicine factory ──────────────────────────────────

export const createMedicine = async (overrides = {}) => {
  return prisma.medicine.create({
    data: {
      name: `Medicine ${Date.now()}`,
      category: 'Analgesik',
      unit: 'tablet',
      price: 1000,
      stock: 100,
      minStock: 10,
      isActive: true,
      ...overrides,
    },
  });
};

// ── Appointment factory ───────────────────────────────

export const createAppointment = async (overrides = {}) => {
  const { patientId, doctorId, ...appointmentData } = overrides;

  // Resolve patient — cari dari DB kalau patientId ada
  let resolvedPatientId = patientId;
  if (!resolvedPatientId) {
    const newPatient = await createPatient();
    resolvedPatientId = newPatient.id;
  }

  // Resolve doctor — cari dari DB kalau doctorId ada
  let resolvedDoctorId = doctorId;
  if (!resolvedDoctorId) {
    const newDoctor = await createDoctor();
    resolvedDoctorId = newDoctor.id;
  }

  // Next monday untuk pastikan dokter praktek
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7 || 7);
  nextMonday.setHours(9, 0, 0, 0);

  return prisma.appointment.create({
    data: {
      patientId: resolvedPatientId,
      doctorId: resolvedDoctorId,
      date: nextMonday,
      queueNumber: 1,
      complaint: 'Test complaint',
      status: 'MENUNGGU',
      ...appointmentData,
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });
};

// ── Medical record factory ────────────────────────────

export const createMedicalRecord = async (overrides = {}) => {
  const appointment = overrides.appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: overrides.appointmentId },
        include: { patient: true },
      })
    : await createAppointment({ status: 'SELESAI' });

  return prisma.medicalRecord.create({
    data: {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      diagnosis: 'Test diagnosis',
      notes: 'Test notes',
      bloodPressure: '120/80',
      weight: 70,
      height: 170,
      temperature: 36.5,
      ...overrides,
    },
  });
};

// ── Prescription factory ──────────────────────────────

export const createPrescription = async (overrides = {}) => {
  const medicalRecord = overrides.medicalRecordId
    ? { id: overrides.medicalRecordId }
    : await createMedicalRecord();

  const medicine = await createMedicine();

  return prisma.prescription.create({
    data: {
      medicalRecordId: medicalRecord.id,
      status: 'MENUNGGU',
      items: {
        create: [{
          medicineId: medicine.id,
          quantity: 10,
          quantityDispensed: 0,
          dosage: '3x1 sesudah makan',
        }],
      },
      ...overrides,
    },
    include: {
      items: { include: { medicine: true } },
      medicalRecord: {
        include: {
          appointment: {
            include: {
              doctor: { include: { user: true } },
              patient: { include: { user: true } },
            },
          },
        },
      },
    },
  });
};

// ── Billing factory ───────────────────────────────────

export const createBilling = async (overrides = {}) => {
  const appointment = overrides.appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: overrides.appointmentId },
      })
    : await createAppointment({ status: 'SELESAI' });

  const invoiceNumber = `INV-TEST-${Date.now()}`;

  return prisma.billing.create({
    data: {
      appointmentId: appointment.id,
      invoiceNumber,
      consultFee: 150000,
      medicineFee: 0,
      totalAmount: 150000,
      paidAmount: 0,
      paymentStatus: 'BELUM_BAYAR',
      isBpjs: false,
      ...overrides,
    },
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      },
      payments: true,
    },
  });
};