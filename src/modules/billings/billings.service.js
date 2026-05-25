// src/modules/billings/billings.service.js
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

// ── Helpers ───────────────────────────────────────────

// Generate invoice number: INV-YYYYMMDD-XXX
const generateInvoiceNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Hitung billing hari ini
  const startOfDay = new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const endOfDay = new Date(`${today.toISOString().slice(0, 10)}T23:59:59.999Z`);

  const count = await prisma.billing.count({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `INV-${dateStr}-${sequence}`;
};

const billingSelect = {
  id: true,
  invoiceNumber: true,
  consultFee: true,
  medicineFee: true,
  totalAmount: true,
  paidAmount: true,
  paymentMethod: true,
  paymentStatus: true,
  isBpjs: true,
  bpjsNo: true,
  bpjsCoveredAmount: true,
  insuranceProvider: true,
  insuranceClaimNo: true,
  insuranceCovered: true,
  notes: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      date: true,
      complaint: true,
      patient: {
        select: {
          medicalRecordNo: true,
          user: { select: { name: true, phone: true } },
        },
      },
      doctor: {
        select: {
          specialization: true,
          consultFee: true,
          user: { select: { name: true } },
        },
      },
    },
  },
  payments: {
    where: { isVoid: false },
    select: {
      id: true,
      amount: true,
      amountPaid: true,
      change: true,
      method: true,
      referenceNo: true,
      notes: true,
      isVoid: true,
      createdAt: true,
      kasir: { select: { name: true } },
      voidRequest: {
        select: {
          id: true,
          status: true,
          reason: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
};

export class BillingsService {
  // ── Get All ───────────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { paymentStatus, dateFrom, dateTo, search } = query;

    const where = {
      ...(paymentStatus && { paymentStatus }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
        },
      }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          {
            appointment: {
              patient: {
                user: { name: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      }),
    };

    const [billings, total] = await Promise.all([
      prisma.billing.findMany({
        where,
        select: billingSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.billing.count({ where }),
    ]);

    return { billings, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get My Billings (PASIEN) ──────────────────────────
  async getMyBillings(userId, query) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw ApiError.notFound('Patient profile not found');

    const { page, limit, skip } = getPagination(query);
    const { paymentStatus } = query;

    const where = {
      ...(paymentStatus && { paymentStatus }),
      appointment: { patientId: patient.id },
    };

    const [billings, total] = await Promise.all([
      prisma.billing.findMany({
        where,
        select: billingSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.billing.count({ where }),
    ]);

    return { billings, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const billing = await prisma.billing.findUnique({
      where: { id },
      select: billingSelect,
    });

    if (!billing) throw ApiError.notFound('Billing not found');
    return billing;
  }

  // ── Create Billing ────────────────────────────────────
  async create(data) {
    const {
      appointmentId, consultFee, notes,
      isBpjs, bpjsNo, bpjsCoveredAmount,
      insuranceProvider, insuranceClaimNo, insuranceCovered,
    } = data;

    // Validasi appointment ada dan statusnya SELESAI
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });

    if (!appointment) throw ApiError.notFound('Appointment not found');
    if (appointment.status !== 'SELESAI') {
      throw ApiError.badRequest('Billing can only be created for completed appointments');
    }

    // Cek billing sudah ada untuk appointment ini
    const existing = await prisma.billing.findUnique({ where: { appointmentId } });
    if (existing) throw ApiError.conflict('Billing already exists for this appointment');

    const invoiceNumber = await generateInvoiceNumber();

    // totalAmount awal = consultFee saja, medicineFee menyusul
    const totalAmount = Number(consultFee);

    return prisma.billing.create({
      data: {
        appointmentId,
        invoiceNumber,
        consultFee,
        medicineFee: 0,
        totalAmount,
        notes,
        isBpjs: isBpjs ?? false,
        bpjsNo,
        bpjsCoveredAmount,
        insuranceProvider,
        insuranceClaimNo,
        insuranceCovered,
      },
      select: billingSelect,
    });
  }

  // ── Update Billing ────────────────────────────────────
  async update(id, data) {
    const billing = await this.getById(id);

    // Tidak bisa edit billing yang sudah LUNAS
    if (billing.paymentStatus === 'LUNAS') {
      throw ApiError.badRequest('Cannot update a fully paid billing');
    }

    const updateData = { ...data };

    // Recalculate totalAmount kalau consultFee berubah
    if (data.consultFee !== undefined) {
      updateData.totalAmount = Number(data.consultFee) + Number(billing.medicineFee);
    }

    return prisma.billing.update({
      where: { id },
      data: updateData,
      select: billingSelect,
    });
  }

  // ── Update Medicine Fee ───────────────────────────────
  async updateMedicineFee(id, medicineFee) {
    const billing = await this.getById(id);

    if (billing.paymentStatus === 'LUNAS') {
      throw ApiError.badRequest('Cannot update medicine fee on a fully paid billing');
    }

    const totalAmount = Number(billing.consultFee) + Number(medicineFee);

    return prisma.billing.update({
      where: { id },
      data: {
        medicineFee,
        totalAmount,
      },
      select: billingSelect,
    });
  }

  // ── Add Payment ───────────────────────────────────────
  async addPayment(billingId, data, kasirId) {
    const billing = await this.getById(billingId);

    if (billing.paymentStatus === 'LUNAS') {
      throw ApiError.badRequest('Billing is already fully paid');
    }

    const { amount, amountPaid, method, referenceNo, notes } = data;

    // Hitung sisa yang harus dibayar
    const remaining = Number(billing.totalAmount) - Number(billing.paidAmount);

    if (amount > remaining) {
      throw ApiError.badRequest(
        `Payment amount exceeds remaining balance. Remaining: ${remaining}`
      );
    }

    const change = method === 'TUNAI' ? Number(amountPaid) - Number(amount) : 0;

    // Hitung paidAmount baru
    const newPaidAmount = Number(billing.paidAmount) + Number(amount);
    const newPaymentStatus = newPaidAmount >= Number(billing.totalAmount)
      ? 'LUNAS'
      : 'SEBAGIAN';

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          billingId,
          amount,
          amountPaid,
          change,
          method,
          referenceNo,
          notes,
          createdBy: kasirId,
        },
        select: {
          id: true,
          amount: true,
          amountPaid: true,
          change: true,
          method: true,
          referenceNo: true,
          notes: true,
          createdAt: true,
          kasir: { select: { name: true } },
        },
      });

      // Update billing
      await tx.billing.update({
        where: { id: billingId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          paymentMethod: method,
          ...(newPaymentStatus === 'LUNAS' && { paidAt: new Date() }),
        },
      });

      return {
        payment,
        billingStatus: newPaymentStatus,
        totalAmount: billing.totalAmount,
        paidAmount: newPaidAmount,
        remainingAmount: Number(billing.totalAmount) - newPaidAmount,
      };
    });
  }

  // ── Get Payments ──────────────────────────────────────
  async getPayments(billingId) {
    await this.getById(billingId);

    return prisma.payment.findMany({
      where: { billingId },
      select: {
        id: true,
        amount: true,
        amountPaid: true,
        change: true,
        method: true,
        referenceNo: true,
        notes: true,
        isVoid: true,
        createdAt: true,
        kasir: { select: { name: true } },
        voidRequest: {
          select: {
            id: true,
            status: true,
            reason: true,
            reviewNotes: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Request Void ──────────────────────────────────────
  async requestVoid(billingId, paymentId, reason, kasirId) {
    await this.getById(billingId);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, billingId },
    });

    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.isVoid) throw ApiError.badRequest('Payment is already voided');
    if (payment.createdBy !== kasirId) {
      throw ApiError.forbidden('Only the kasir who created this payment can request void');
    }

    // Cek sudah ada void request pending
    const existingRequest = await prisma.paymentVoidRequest.findUnique({
      where: { paymentId },
    });
    if (existingRequest && existingRequest.status === 'PENDING') {
      throw ApiError.conflict('Void request already pending for this payment');
    }

    return prisma.paymentVoidRequest.create({
      data: {
        paymentId,
        reason,
        requestedBy: kasirId,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        payment: { select: { amount: true, method: true } },
      },
    });
  }

  // ── Review Void ───────────────────────────────────────
  async reviewVoid(billingId, paymentId, data, reviewerId) {
    const billing = await this.getById(billingId);

    const voidRequest = await prisma.paymentVoidRequest.findFirst({
      where: { paymentId, payment: { billingId } },
    });

    if (!voidRequest) throw ApiError.notFound('Void request not found');
    if (voidRequest.status !== 'PENDING') {
      throw ApiError.badRequest(`Void request already ${voidRequest.status}`);
    }

    const { status, reviewNotes } = data;

    return prisma.$transaction(async (tx) => {
      // Update void request
      const updated = await tx.paymentVoidRequest.update({
        where: { id: voidRequest.id },
        data: {
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          reviewNotes: true,
          reviewedAt: true,
        },
      });

      if (status === 'APPROVED') {
        // Void payment
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: { isVoid: true },
          select: { amount: true },
        });

        // Kurangi paidAmount di billing
        const newPaidAmount = Number(billing.paidAmount) - Number(payment.amount);
        const newPaymentStatus = newPaidAmount <= 0
          ? 'BELUM_BAYAR'
          : 'SEBAGIAN';

        await tx.billing.update({
          where: { id: billingId },
          data: {
            paidAmount: Math.max(0, newPaidAmount),
            paymentStatus: newPaymentStatus,
            paidAt: null,
          },
        });
      }

      return updated;
    });
  }

  // ── Daily Report ──────────────────────────────────────
  async getDailyReport(date) {
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().slice(0, 10);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const billings = await prisma.billing.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: {
        consultFee: true,
        medicineFee: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        payments: {
          where: { isVoid: false },
          select: { amount: true, method: true },
        },
      },
    });

    // Agregasi per metode pembayaran
    const byPaymentMethod = {};
    const byStatus = { BELUM_BAYAR: 0, SEBAGIAN: 0, LUNAS: 0 };
    let totalIncome = 0;
    let consultFeeTotal = 0;
    let medicineFeeTotal = 0;

    for (const billing of billings) {
      byStatus[billing.paymentStatus]++;
      totalIncome += Number(billing.paidAmount);
      consultFeeTotal += Number(billing.consultFee);
      medicineFeeTotal += Number(billing.medicineFee);

      for (const payment of billing.payments) {
        const method = payment.method;
        byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + Number(payment.amount);
      }
    }

    return {
      date: dateStr,
      totalTransactions: billings.length,
      totalIncome,
      consultFeeTotal,
      medicineFeeTotal,
      byPaymentMethod,
      byStatus,
    };
  }

  // ── Monthly Report ────────────────────────────────────
  async getMonthlyReport(month) {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);

    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const billings = await prisma.billing.findMany({
      where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      select: {
        consultFee: true,
        medicineFee: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        createdAt: true,
        payments: {
          where: { isVoid: false },
          select: { amount: true, method: true },
        },
      },
    });

    // Agregasi per hari dalam bulan
    const byDay = {};
    const byPaymentMethod = {};
    const byStatus = { BELUM_BAYAR: 0, SEBAGIAN: 0, LUNAS: 0 };
    let totalIncome = 0;
    let consultFeeTotal = 0;
    let medicineFeeTotal = 0;

    for (const billing of billings) {
      const day = billing.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + Number(billing.paidAmount);
      byStatus[billing.paymentStatus]++;
      totalIncome += Number(billing.paidAmount);
      consultFeeTotal += Number(billing.consultFee);
      medicineFeeTotal += Number(billing.medicineFee);

      for (const payment of billing.payments) {
        const method = payment.method;
        byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + Number(payment.amount);
      }
    }

    return {
      month: targetMonth,
      totalTransactions: billings.length,
      totalIncome,
      consultFeeTotal,
      medicineFeeTotal,
      byPaymentMethod,
      byStatus,
      byDay,
    };
  }
}

export const billingsService = new BillingsService();