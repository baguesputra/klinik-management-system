// src/modules/doctors/doctors.service.js
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const doctorSelect = {
  id: true,
  specialization: true,
  licenseNumber: true,
  schedule: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
    },
  },
};

export class DoctorsService {
  // ── Get All ───────────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { search, specialization } = query;

    const where = {
      ...(specialization && {
        specialization: { contains: specialization, mode: 'insensitive' },
      }),
      ...(search && {
        OR: [
          { specialization: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { licenseNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        select: doctorSelect,
        skip,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.doctor.count({ where }),
    ]);

    return { doctors, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: {
        ...doctorSelect,
        appointments: {
          where: {
            status: { in: ['MENUNGGU', 'DIPANGGIL'] },
          },
          select: {
            id: true,
            date: true,
            queueNumber: true,
            status: true,
            complaint: true,
            patient: {
              select: {
                id: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: [{ date: 'asc' }, { queueNumber: 'asc' }],
          take: 10,
        },
      },
    });

    if (!doctor) throw ApiError.notFound('Doctor not found');
    return doctor;
  }

  // ── Get By User ID ────────────────────────────────────
  async getByUserId(userId) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: doctorSelect,
    });

    if (!doctor) throw ApiError.notFound('Doctor profile not found');
    return doctor;
  }

  // ── Create ────────────────────────────────────────────
  async create(data) {
    const { userId, specialization, licenseNumber, schedule } = data;

    // Pastikan user ada
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    // Pastikan belum punya profil dokter
    const existing = await prisma.doctor.findUnique({ where: { userId } });
    if (existing) throw ApiError.conflict('Doctor profile already exists for this user');

    // Cek licenseNumber unik
    const licenseExists = await prisma.doctor.findUnique({ where: { licenseNumber } });
    if (licenseExists) throw ApiError.conflict('License number already registered');

    // Buat profil dokter + ubah role user jadi DOKTER dalam satu transaksi
    return prisma.$transaction(async (tx) => {
      // Update role user ke DOKTER kalau belum
      if (user.role !== 'DOKTER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'DOKTER' },
        });
      }

      return tx.doctor.create({
        data: { userId, specialization, licenseNumber, schedule },
        select: doctorSelect,
      });
    });
  }

  // ── Update ────────────────────────────────────────────
  async update(id, data) {
    await this.getById(id); // throws if not found

    // Cek licenseNumber tidak bentrok dengan dokter lain
    if (data.licenseNumber) {
      const licenseExists = await prisma.doctor.findFirst({
        where: { licenseNumber: data.licenseNumber, NOT: { id } },
      });
      if (licenseExists) throw ApiError.conflict('License number already registered');
    }

    return prisma.doctor.update({
      where: { id },
      data,
      select: doctorSelect,
    });
  }

  // ── Delete ────────────────────────────────────────────
  async delete(id) {
    const doctor = await this.getById(id);

    // Cek apakah ada appointment aktif
    const activeAppointments = await prisma.appointment.count({
      where: {
        doctorId: id,
        status: { in: ['MENUNGGU', 'DIPANGGIL'] },
      },
    });

    if (activeAppointments > 0) {
      throw ApiError.badRequest(
        `Cannot delete doctor with ${activeAppointments} active appointment(s)`
      );
    }

    // Hapus profil dokter saja, user tetap ada
    await prisma.doctor.delete({ where: { id } });

    // Kembalikan role user ke ADMIN_KLINIK atau biarkan SUPER_ADMIN yang atur manual
    // Kita kembalikan ke default agar tidak menggantung
    await prisma.user.update({
      where: { id: doctor.user.id },
      data: { role: 'PASIEN' },
    });
  }

  // ── Get Appointments ──────────────────────────────────
  async getAppointments(doctorId, query) {
    await this.getById(doctorId); // throws if not found

    const { page, limit, skip } = getPagination(query);
    const { date, status } = query;

    const where = {
      doctorId,
      ...(status && { status }),
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
        select: {
          id: true,
          date: true,
          queueNumber: true,
          status: true,
          complaint: true,
          patient: {
            select: {
              id: true,
              medicalRecordNo: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { queueNumber: 'asc' }],
      }),
      prisma.appointment.count({ where }),
    ]);

    return { appointments, pagination: buildPaginationMeta(total, page, limit) };
  }
}

export const doctorsService = new DoctorsService();