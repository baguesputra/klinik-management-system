// src/modules/appointments/appointments.service.js
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const appointmentSelect = {
  id: true,
  date: true,
  queueNumber: true,
  complaint: true,
  status: true,
  notes: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      medicalRecordNo: true,
      user: { select: { name: true, phone: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      specialization: true,
      user: { select: { name: true } },
    },
  },
};

// Helper — map angka hari JS ke key schedule dokter
const DAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export class AppointmentsService {
  // ── Get All ───────────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { date, status, doctorId, patientId } = query;

    const where = {
      ...(status && { status }),
      ...(doctorId && { doctorId }),
      ...(patientId && { patientId }),
      ...(date && {
        date: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
      }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        select: appointmentSelect,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { queueNumber: 'asc' }],
      }),
      prisma.appointment.count({ where }),
    ]);

    return { appointments, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get My Appointments (PASIEN) ──────────────────────
  async getMyAppointments(userId, query) {
    // Cari patient dari userId
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw ApiError.notFound('Patient profile not found');

    return this.getAll({ ...query, patientId: patient.id });
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        ...appointmentSelect,
        medicalRecord: {
          select: {
            id: true,
            diagnosis: true,
            createdAt: true,
          },
        },
        billing: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!appointment) throw ApiError.notFound('Appointment not found');
    return appointment;
  }

  // ── Create ────────────────────────────────────────────
  async create(data) {
    const { patientId, doctorId, date, complaint } = data;

    const appointmentDate = new Date(date);
    const dayKey = DAY_MAP[appointmentDate.getDay()];

    // Validasi patient ada
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw ApiError.notFound('Patient not found');

    // Validasi doctor ada
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw ApiError.notFound('Doctor not found');

    // Validasi dokter praktek di hari tersebut
    const schedule = doctor.schedule;
    if (!schedule[dayKey]) {
      throw ApiError.badRequest(
        `Doctor does not practice on ${dayKey}`
      );
    }

    // Validasi pasien tidak punya appointment aktif di hari & dokter yang sama
    const dateStart = new Date(`${date.split('T')[0]}T00:00:00.000Z`);
    const dateEnd = new Date(`${date.split('T')[0]}T23:59:59.999Z`);

    const conflict = await prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId,
        status: { in: ['MENUNGGU', 'DIPANGGIL'] },
        date: { gte: dateStart, lte: dateEnd },
      },
    });

    if (conflict) {
      throw ApiError.conflict(
        'Patient already has an active appointment with this doctor on this date'
      );
    }

    // Auto queue number — pakai transaksi untuk hindari race condition
    return prisma.$transaction(async (tx) => {
      // Lock — cari nomor antrian tertinggi hari ini untuk dokter ini
      const lastQueue = await tx.appointment.findFirst({
        where: {
          doctorId,
          date: { gte: dateStart, lte: dateEnd },
        },
        orderBy: { queueNumber: 'desc' },
        select: { queueNumber: true },
      });

      const queueNumber = (lastQueue?.queueNumber ?? 0) + 1;

      return tx.appointment.create({
        data: {
          patientId,
          doctorId,
          date: appointmentDate,
          queueNumber,
          complaint,
          status: 'MENUNGGU',
        },
        select: appointmentSelect,
      });
    });
  }

  // ── Update Status ─────────────────────────────────────
  async updateStatus(id, data, requesterId, requesterRole) {
    const appointment = await this.getById(id);

    // Appointment yang sudah SELESAI atau DIBATALKAN tidak bisa diubah lagi
    if (['SELESAI', 'DIBATALKAN'].includes(appointment.status)) {
      throw ApiError.badRequest(
        `Cannot update appointment with status ${appointment.status}`
      );
    }

    // DOKTER hanya bisa update appointment miliknya
    if (requesterRole === 'DOKTER') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: requesterId },
      });
      if (!doctor || doctor.id !== appointment.doctor.id) {
        throw ApiError.forbidden('Cannot update other doctor\'s appointment');
      }
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      select: appointmentSelect,
    });
  }

  // ── Cancel (soft delete) ──────────────────────────────
  async cancel(id, requesterId, requesterRole) {
    const appointment = await this.getById(id);

    // Hanya appointment dengan status MENUNGGU yang bisa dibatalkan
    if (appointment.status !== 'MENUNGGU') {
      throw ApiError.badRequest(
        `Cannot cancel appointment with status ${appointment.status}`
      );
    }

    // PASIEN hanya bisa batalkan miliknya sendiri
    if (requesterRole === 'PASIEN') {
      const patient = await prisma.patient.findUnique({
        where: { userId: requesterId },
      });
      if (!patient || patient.id !== appointment.patient.id) {
        throw ApiError.forbidden('Cannot cancel other patient\'s appointment');
      }
    }

    return prisma.appointment.update({
      where: { id },
      data: { status: 'DIBATALKAN' },
      select: appointmentSelect,
    });
  }
}

export const appointmentsService = new AppointmentsService();