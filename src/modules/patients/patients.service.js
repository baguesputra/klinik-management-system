// src/modules/patients/patients.service.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const patientSelect = {
  id: true,
  medicalRecordNo: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  bloodType: true,
  allergies: true,
  emergencyContact: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  },
};

export class PatientsService {
  // ── Get All Patients ──────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { search, gender, bloodType } = query;

    const where = {
      ...(gender && { gender }),
      ...(bloodType && { bloodType }),
      ...(search && {
        OR: [
          { medicalRecordNo: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search } } },
        ],
      }),
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        select: patientSelect,
        skip,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        ...patientSelect,
        appointments: {
          select: {
            id: true,
            date: true,
            queueNumber: true,
            status: true,
            complaint: true,
            doctor: {
              select: {
                specialization: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });

    if (!patient) throw ApiError.notFound('Patient not found');
    return patient;
  }

  // ── Get By User ID ────────────────────────────────────
  async getByUserId(userId) {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: patientSelect,
    });

    if (!patient) throw ApiError.notFound('Patient profile not found');
    return patient;
  }

  // ── Create Patient ────────────────────────────────────
  async create(data) {
    const {
      name, email, phone,
      dateOfBirth, gender, address,
      bloodType, allergies, emergencyContact,
    } = data;

    // Cek email sudah terdaftar
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('Email already registered');

    // Generate password default kalau tidak diisi
    const rawPassword = data.password || `Pasien${Math.random().toString(36).slice(-6).toUpperCase()}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // Buat user + patient sekaligus dalam satu transaksi
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'PASIEN',
          isVerified: true,
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          address,
          bloodType,
          allergies,
          emergencyContact,
        },
        select: patientSelect,
      });

      return { patient, rawPassword };
    });

    return result;
  }

  // ── Update Patient ────────────────────────────────────
  async update(id, data, requesterId, requesterRole) {
    const patient = await this.getById(id);

    // Pasien hanya bisa update profil sendiri
    if (requesterRole === 'PASIEN' && patient.user.id !== requesterId) {
      throw ApiError.forbidden('Cannot update other patient profile');
    }

    const { name, phone, address, bloodType, allergies, emergencyContact } = data;

    return prisma.$transaction(async (tx) => {
      if (name || phone) {
        await tx.user.update({
          where: { id: patient.user.id },
          data: { ...(name && { name }), ...(phone && { phone }) },
        });
      }

      return tx.patient.update({
        where: { id },
        data: {
          ...(address !== undefined && { address }),
          ...(bloodType && { bloodType }),
          ...(allergies !== undefined && { allergies }),
          ...(emergencyContact !== undefined && { emergencyContact }),
        },
        select: patientSelect,
      });
    });
  }

  // ── Get Medical Records ───────────────────────────────
  async getMedicalRecords(patientId, requesterId, requesterRole) {
    const patient = await this.getById(patientId);

    // Pasien hanya bisa lihat rekam medis sendiri
    if (requesterRole === 'PASIEN' && patient.user.id !== requesterId) {
      throw ApiError.forbidden('Access denied');
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      select: {
        id: true,
        diagnosis: true,
        notes: true,
        bloodPressure: true,
        weight: true,
        height: true,
        temperature: true,
        createdAt: true,
        appointment: {
          select: {
            date: true,
            complaint: true,
            doctor: {
              select: {
                specialization: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        prescription: {
          select: {
            id: true,
            status: true,
            items: {
              select: {
                quantity: true,
                dosage: true,
                medicine: { select: { name: true, unit: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records;
  }

  // ── Create Medical Record ─────────────────────────────
  async createMedicalRecord(patientId, data) {
    // Validasi patient ada
    await this.getById(patientId);

    // Validasi appointment milik pasien ini
    const appointment = await prisma.appointment.findFirst({
      where: { id: data.appointmentId, patientId },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found for this patient');
    }

    // Cek rekam medis untuk appointment ini belum ada
    const existing = await prisma.medicalRecord.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (existing) {
      throw ApiError.conflict('Medical record for this appointment already exists');
    }

    // Update status appointment jadi SELESAI
    await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: { status: 'SELESAI' },
    });

    return prisma.medicalRecord.create({
      data: {
        patientId,
        appointmentId: data.appointmentId,
        diagnosis: data.diagnosis,
        notes: data.notes,
        bloodPressure: data.bloodPressure,
        weight: data.weight,
        height: data.height,
        temperature: data.temperature,
      },
      select: {
        id: true,
        diagnosis: true,
        notes: true,
        bloodPressure: true,
        weight: true,
        height: true,
        temperature: true,
        createdAt: true,
        appointment: {
          select: {
            date: true,
            complaint: true,
          },
        },
      },
    });
  }

  // ── Get Medical Record By ID ──────────────────────────
  async getMedicalRecordById(patientId, recordId, requesterId, requesterRole) {
    const patient = await this.getById(patientId);

    if (requesterRole === 'PASIEN' && patient.user.id !== requesterId) {
      throw ApiError.forbidden('Access denied');
    }

    const record = await prisma.medicalRecord.findFirst({
      where: { id: recordId, patientId },
      select: {
        id: true,
        diagnosis: true,
        notes: true,
        bloodPressure: true,
        weight: true,
        height: true,
        temperature: true,
        createdAt: true,
        appointment: {
          select: {
            date: true,
            complaint: true,
            doctor: {
              select: {
                specialization: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        prescription: {
          select: {
            id: true,
            status: true,
            notes: true,
            items: {
              select: {
                quantity: true,
                dosage: true,
                notes: true,
                medicine: {
                  select: { name: true, genericName: true, unit: true },
                },
              },
            },
          },
        },
      },
    });

    if (!record) throw ApiError.notFound('Medical record not found');
    return record;
  }
}

export const patientsService = new PatientsService();