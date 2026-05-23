// src/modules/medicines/medicines.service.js
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const medicineSelect = {
  id: true,
  name: true,
  genericName: true,
  category: true,
  unit: true,
  price: true,
  stock: true,
  minStock: true,
  description: true,
  expiryDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export class MedicinesService {
  // ── Get All ───────────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { search, category, isLowStock, isActive, isExpired, expiryBefore } = query;

    const now = new Date();

    const where = {
      // Default hanya tampilkan yang aktif kecuali diminta
      ...(isActive !== undefined
        ? { isActive: isActive === 'true' }
        : { isActive: true }
      ),
      ...(category && {
        category: { contains: category, mode: 'insensitive' },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { genericName: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Filter stok di bawah minStock
      ...(isLowStock === 'true' && {
        stock: { lte: prisma.medicine.fields.minStock },
      }),
      // Filter obat yang sudah kadaluarsa
      ...(isExpired === 'true' && {
        expiryDate: { lte: now },
      }),
      // Filter obat yang akan kadaluarsa sebelum tanggal tertentu
      ...(expiryBefore && {
        expiryDate: {
          lte: new Date(expiryBefore),
          gt: now, // belum expired, tapi akan expired sebelum expiryBefore
        },
      }),
    };

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        select: {
          ...medicineSelect,
          // Tambah flag isLowStock di tiap item
          _count: false,
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.medicine.count({ where }),
    ]);

    // Inject flag isLowStock ke tiap item
    const data = medicines.map((m) => ({
      ...m,
      isLowStock: m.stock <= m.minStock,
      isExpired: m.expiryDate ? m.expiryDate <= now : false,
    }));

    return { medicines: data, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      select: {
        ...medicineSelect,
        stockMutations: {
          select: {
            id: true,
            type: true,
            quantity: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!medicine) throw ApiError.notFound('Medicine not found');

    const now = new Date();
    return {
      ...medicine,
      isLowStock: medicine.stock <= medicine.minStock,
      isExpired: medicine.expiryDate ? medicine.expiryDate <= now : false,
    };
  }

  // ── Create ────────────────────────────────────────────
  async create(data) {
    const { stock, ...medicineData } = data;

    // Cek nama obat sudah ada
    const existing = await prisma.medicine.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });
    if (existing) throw ApiError.conflict('Medicine with this name already exists');

    return prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: {
          ...medicineData,
          stock: stock ?? 0,
          ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
        },
        select: medicineSelect,
      });

      // Catat stok awal sebagai mutasi MASUK jika stock > 0
      if (medicine.stock > 0) {
        await tx.stockMutation.create({
          data: {
            medicineId: medicine.id,
            type: 'MASUK',
            quantity: medicine.stock,
            reason: 'Initial stock',
          },
        });
      }

      const now = new Date();
      return {
        ...medicine,
        isLowStock: medicine.stock <= medicine.minStock,
        isExpired: medicine.expiryDate ? medicine.expiryDate <= now : false,
      };
    });
  }

  // ── Update ────────────────────────────────────────────
  async update(id, data) {
    await this.getById(id); // throws if not found

    const updateData = {
      ...data,
      ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
    };

    const medicine = await prisma.medicine.update({
      where: { id },
      data: updateData,
      select: medicineSelect,
    });

    const now = new Date();
    return {
      ...medicine,
      isLowStock: medicine.stock <= medicine.minStock,
      isExpired: medicine.expiryDate ? medicine.expiryDate <= now : false,
    };
  }

  // ── Soft Delete ───────────────────────────────────────
  async delete(id) {
    await this.getById(id); // throws if not found

    await prisma.medicine.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Stock Mutation ────────────────────────────────────
  async addStockMutation(id, data) {
    const medicine = await this.getById(id);

    if (!medicine.isActive) {
      throw ApiError.badRequest('Cannot mutate stock of inactive medicine');
    }

    const { type, quantity, reason } = data;

    // Hitung perubahan stok
    let stockDelta;
    if (type === 'MASUK') stockDelta = quantity;
    else if (type === 'KELUAR') stockDelta = -quantity;
    else stockDelta = quantity; // ADJUSTMENT — bisa positif/negatif

    // Pastikan stok tidak minus
    const newStock = medicine.stock + stockDelta;
    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock. Current stock: ${medicine.stock}, requested: ${quantity}`
      );
    }

    return prisma.$transaction(async (tx) => {
      // Update stok
      const updated = await tx.medicine.update({
        where: { id },
        data: { stock: newStock },
        select: medicineSelect,
      });

      // Catat mutasi
      const mutation = await tx.stockMutation.create({
        data: {
          medicineId: id,
          type,
          quantity, // selalu simpan nilai asli yang dikirim client
          reason,
        },
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          createdAt: true,
        },
      });

      const now = new Date();
      return {
        medicine: {
          ...updated,
          isLowStock: updated.stock <= updated.minStock,
          isExpired: updated.expiryDate ? updated.expiryDate <= now : false,
        },
        mutation,
        previousStock: medicine.stock,
        currentStock: newStock,
      };
    });
  }

  // ── Get Stock Mutations ───────────────────────────────
  async getStockMutations(id, query) {
    await this.getById(id); // throws if not found

    const { page, limit, skip } = getPagination(query);
    const { type, dateFrom, dateTo } = query;

    const where = {
      medicineId: id,
      ...(type && { type }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
        },
      }),
    };

    const [mutations, total] = await Promise.all([
      prisma.stockMutation.findMany({
        where,
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMutation.count({ where }),
    ]);

    return { mutations, pagination: buildPaginationMeta(total, page, limit) };
  }
}

export const medicinesService = new MedicinesService();