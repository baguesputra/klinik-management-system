// src/modules/users/users.service.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  isVerified: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
};

export class UsersService {
  // ── Get All Users ─────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { search, role, isActive } = query;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: userSelect, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return { users, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        doctor: {
          select: {
            specialization: true,
            licenseNumber: true,
            schedule: true,
          },
        },
        patient: {
          select: {
            medicalRecordNo: true,
            dateOfBirth: true,
            gender: true,
            bloodType: true,
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  // ── Create User ───────────────────────────────────────
  async create(data) {
    const { name, email, password, phone, role } = data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 12);

    return prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        isVerified: true, // Admin-created users are pre-verified
      },
      select: userSelect,
    });
  }

  // ── Update User ───────────────────────────────────────
  async update(id, data) {
    await this.getById(id); // throws if not found

    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  // ── Change Role ───────────────────────────────────────
  async changeRole(id, role, requesterId) {
    if (id === requesterId) {
      throw ApiError.badRequest('Cannot change your own role');
    }

    await this.getById(id);

    return prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });
  }

  // ── Toggle Active ─────────────────────────────────────
  async toggleActive(id, requesterId) {
    if (id === requesterId) {
      throw ApiError.badRequest('Cannot deactivate your own account');
    }

    const user = await this.getById(id);

    return prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: userSelect,
    });
  }

  // ── Delete User ───────────────────────────────────────
  async delete(id, requesterId) {
    if (id === requesterId) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    await this.getById(id);
    await prisma.user.delete({ where: { id } });
  }
}

export const usersService = new UsersService();