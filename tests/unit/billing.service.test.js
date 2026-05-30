// tests/unit/billing.service.test.js
import { jest } from '@jest/globals';

// ── Mock dependencies ─────────────────────────────────
const mockPrisma = {
  billing: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  paymentVoidRequest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  appointment: {
    findUnique: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

const { BillingsService } = await import('../../src/modules/billings/billings.service.js');

const billingsService = new BillingsService();

// ── Mock data ─────────────────────────────────────────

const mockDoctor = {
  id: 'doctor-uuid-123',
  specialization: 'Dokter Umum',
  consultFee: 150000,
  user: { name: 'Dr. Test' },
};

const mockPatient = {
  id: 'patient-uuid-123',
  medicalRecordNo: 'RM001',
  user: { name: 'Test Patient', phone: '081234567890' },
};

const mockAppointment = {
  id: 'appointment-uuid-123',
  status: 'SELESAI',
  date: new Date(),
  complaint: 'Test complaint',
  doctor: mockDoctor,
  patient: mockPatient,
};

const mockBilling = {
  id: 'billing-uuid-123',
  invoiceNumber: 'INV-20250610-001',
  consultFee: 150000,
  medicineFee: 0,
  totalAmount: 150000,
  paidAmount: 0,
  paymentStatus: 'BELUM_BAYAR',
  paymentMethod: null,
  isBpjs: false,
  bpjsNo: null,
  bpjsCoveredAmount: null,
  insuranceProvider: null,
  insuranceClaimNo: null,
  insuranceCovered: null,
  notes: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  appointment: mockAppointment,
  payments: [],
};

const mockKasirId = 'kasir-uuid-123';

const mockPayment = {
  id: 'payment-uuid-123',
  billingId: mockBilling.id,
  amount: 150000,
  amountPaid: 150000,
  change: 0,
  method: 'TUNAI',
  referenceNo: null,
  notes: null,
  isVoid: false,
  createdBy: mockKasirId,
  createdAt: new Date(),
  kasir: { name: 'Kasir Test' },
};

// ── Tests ─────────────────────────────────────────────

describe('BillingsService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Create Billing ───────────────────────────────────
  describe('create', () => {
    it('should create billing successfully', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.billing.findUnique.mockResolvedValue(null);
      mockPrisma.billing.count.mockResolvedValue(0);
      mockPrisma.billing.create.mockResolvedValue(mockBilling);

      const result = await billingsService.create({
        appointmentId: mockAppointment.id,
        consultFee: 150000,
      });

      expect(result).toHaveProperty('invoiceNumber');
      expect(result).toHaveProperty('paymentStatus', 'BELUM_BAYAR');
      expect(mockPrisma.billing.create).toHaveBeenCalledTimes(1);
    });

    it('should throw bad request if appointment is not SELESAI', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        status: 'MENUNGGU',
      });

      await expect(
        billingsService.create({
          appointmentId: mockAppointment.id,
          consultFee: 150000,
        })
      ).rejects.toThrow('Billing can only be created for completed appointments');
    });

    it('should throw not found if appointment does not exist', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        billingsService.create({
          appointmentId: 'nonexistent-id',
          consultFee: 150000,
        })
      ).rejects.toThrow('Appointment not found');
    });

    it('should throw conflict if billing already exists', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);

      await expect(
        billingsService.create({
          appointmentId: mockAppointment.id,
          consultFee: 150000,
        })
      ).rejects.toThrow('Billing already exists for this appointment');
    });

    it('should generate correct invoice number format', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.billing.findUnique.mockResolvedValue(null);
      mockPrisma.billing.count.mockResolvedValue(2); // sudah ada 2 billing hari ini
      mockPrisma.billing.create.mockResolvedValue({
        ...mockBilling,
        invoiceNumber: 'INV-20250610-003',
      });

      const result = await billingsService.create({
        appointmentId: mockAppointment.id,
        consultFee: 150000,
      });

      // Format INV-YYYYMMDD-XXX
      expect(result.invoiceNumber).toMatch(/^INV-\d{8}-\d{3}$/);
    });
  });

  // ── Update Medicine Fee ──────────────────────────────
  describe('updateMedicineFee', () => {
    it('should update medicine fee and recalculate total', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.billing.update.mockResolvedValue({
        ...mockBilling,
        medicineFee: 75000,
        totalAmount: 225000,
      });

      const result = await billingsService.updateMedicineFee(
        mockBilling.id,
        75000
      );

      expect(result).toHaveProperty('medicineFee', 75000);
      expect(result).toHaveProperty('totalAmount', 225000);
      expect(mockPrisma.billing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            medicineFee: 75000,
            totalAmount: 225000,
          }),
        })
      );
    });

    it('should throw bad request if billing is already LUNAS', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue({
        ...mockBilling,
        paymentStatus: 'LUNAS',
      });

      await expect(
        billingsService.updateMedicineFee(mockBilling.id, 75000)
      ).rejects.toThrow('Cannot update medicine fee on a fully paid billing');
    });
  });

  // ── Add Payment ──────────────────────────────────────
  describe('addPayment', () => {
    it('should add cash payment and calculate change correctly', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          payment: { create: jest.fn().mockResolvedValue(mockPayment) },
          billing: {
            update: jest.fn().mockResolvedValue({
              ...mockBilling,
              paidAmount: 150000,
              paymentStatus: 'LUNAS',
            }),
          },
        });
      });

      const result = await billingsService.addPayment(
        mockBilling.id,
        {
          amount: 150000,
          amountPaid: 200000,
          method: 'TUNAI',
        },
        mockKasirId
      );

      expect(result).toHaveProperty('billingStatus', 'LUNAS');
      expect(result).toHaveProperty('remainingAmount', 0);
    });

    it('should return SEBAGIAN status for partial payment', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          payment: {
            create: jest.fn().mockResolvedValue({
              ...mockPayment,
              amount: 75000,
            }),
          },
          billing: {
            update: jest.fn().mockResolvedValue({
              ...mockBilling,
              paidAmount: 75000,
              paymentStatus: 'SEBAGIAN',
            }),
          },
        });
      });

      const result = await billingsService.addPayment(
        mockBilling.id,
        {
          amount: 75000,
          amountPaid: 75000,
          method: 'TUNAI',
        },
        mockKasirId
      );

      expect(result).toHaveProperty('billingStatus', 'SEBAGIAN');
      expect(result).toHaveProperty('remainingAmount', 75000);
    });

    it('should throw bad request if billing is already LUNAS', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue({
        ...mockBilling,
        paymentStatus: 'LUNAS',
        paidAmount: 150000,
      });

      await expect(
        billingsService.addPayment(
          mockBilling.id,
          { amount: 50000, amountPaid: 50000, method: 'TUNAI' },
          mockKasirId
        )
      ).rejects.toThrow('Billing is already fully paid');
    });

    it('should throw bad request if payment amount exceeds remaining balance', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);

      await expect(
        billingsService.addPayment(
          mockBilling.id,
          { amount: 999999, amountPaid: 999999, method: 'TUNAI' },
          mockKasirId
        )
      ).rejects.toThrow('Payment amount exceeds remaining balance');
    });
  });

  // ── Request Void ─────────────────────────────────────
  describe('requestVoid', () => {
    it('should create void request successfully', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrisma.paymentVoidRequest.findUnique.mockResolvedValue(null);
      mockPrisma.paymentVoidRequest.create.mockResolvedValue({
        id: 'void-request-uuid',
        reason: 'Salah input metode pembayaran',
        status: 'PENDING',
        createdAt: new Date(),
        payment: { amount: 150000, method: 'TUNAI' },
      });

      const result = await billingsService.requestVoid(
        mockBilling.id,
        mockPayment.id,
        'Salah input metode pembayaran',
        mockKasirId
      );

      expect(result).toHaveProperty('status', 'PENDING');
      expect(mockPrisma.paymentVoidRequest.create).toHaveBeenCalledTimes(1);
    });

    it('should throw forbidden if not the kasir who created the payment', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

      await expect(
        billingsService.requestVoid(
          mockBilling.id,
          mockPayment.id,
          'Test reason',
          'different-kasir-id'
        )
      ).rejects.toThrow('Only the kasir who created this payment can request void');
    });

    it('should throw bad request if payment is already voided', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        isVoid: true,
      });

      await expect(
        billingsService.requestVoid(
          mockBilling.id,
          mockPayment.id,
          'Test reason',
          mockKasirId
        )
      ).rejects.toThrow('Payment is already voided');
    });

    it('should throw conflict if void request already pending', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(mockBilling);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrisma.paymentVoidRequest.findUnique.mockResolvedValue({
        id: 'existing-void-request',
        status: 'PENDING',
      });

      await expect(
        billingsService.requestVoid(
          mockBilling.id,
          mockPayment.id,
          'Test reason',
          mockKasirId
        )
      ).rejects.toThrow('Void request already pending for this payment');
    });
  });

  // ── Review Void ──────────────────────────────────────
  describe('reviewVoid', () => {
    const mockVoidRequest = {
      id: 'void-request-uuid',
      paymentId: mockPayment.id,
      status: 'PENDING',
      reason: 'Salah input',
    };

    it('should approve void request and rollback paidAmount', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue({
        ...mockBilling,
        paidAmount: 150000,
        paymentStatus: 'LUNAS',
        payments: [mockPayment],
      });
      mockPrisma.paymentVoidRequest.findFirst.mockResolvedValue(mockVoidRequest);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          paymentVoidRequest: {
            update: jest.fn().mockResolvedValue({
              ...mockVoidRequest,
              status: 'APPROVED',
              reviewNotes: 'Dikonfirmasi',
            }),
          },
          payment: {
            update: jest.fn().mockResolvedValue({
              ...mockPayment,
              isVoid: true,
              amount: 150000,
            }),
          },
          billing: {
            update: jest.fn().mockResolvedValue({
              ...mockBilling,
              paidAmount: 0,
              paymentStatus: 'BELUM_BAYAR',
            }),
          },
        });
      });

      const result = await billingsService.reviewVoid(
        mockBilling.id,
        mockPayment.id,
        { status: 'APPROVED', reviewNotes: 'Dikonfirmasi' },
        'admin-uuid'
      );

      expect(result).toHaveProperty('status', 'APPROVED');
    });

    it('should reject void request without rolling back payment', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue({
        ...mockBilling,
        payments: [mockPayment],
      });
      mockPrisma.paymentVoidRequest.findFirst.mockResolvedValue(mockVoidRequest);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          paymentVoidRequest: {
            update: jest.fn().mockResolvedValue({
              ...mockVoidRequest,
              status: 'REJECTED',
              reviewNotes: 'Tidak valid',
            }),
          },
          payment: { update: jest.fn() },
          billing: { update: jest.fn() },
        });
      });

      const result = await billingsService.reviewVoid(
        mockBilling.id,
        mockPayment.id,
        { status: 'REJECTED', reviewNotes: 'Tidak valid' },
        'admin-uuid'
      );

      expect(result).toHaveProperty('status', 'REJECTED');
    });

    it('should throw bad request if void request already reviewed', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue({
        ...mockBilling,
        payments: [mockPayment],
      });
      mockPrisma.paymentVoidRequest.findFirst.mockResolvedValue({
        ...mockVoidRequest,
        status: 'APPROVED',
      });

      await expect(
        billingsService.reviewVoid(
          mockBilling.id,
          mockPayment.id,
          { status: 'APPROVED', reviewNotes: 'Test' },
          'admin-uuid'
        )
      ).rejects.toThrow('Void request already APPROVED');
    });
  });

  // ── Daily Report ─────────────────────────────────────
  describe('getDailyReport', () => {
    it('should return correct daily report aggregation', async () => {
      mockPrisma.billing.findMany.mockResolvedValue([
        {
          consultFee: 150000,
          medicineFee: 75000,
          totalAmount: 225000,
          paidAmount: 225000,
          paymentStatus: 'LUNAS',
          payments: [
            { amount: 225000, method: 'TUNAI' },
          ],
        },
        {
          consultFee: 300000,
          medicineFee: 50000,
          totalAmount: 350000,
          paidAmount: 300000,
          paymentStatus: 'SEBAGIAN',
          payments: [
            { amount: 300000, method: 'QRIS' },
          ],
        },
      ]);

      const result = await billingsService.getDailyReport('2025-06-10');

      expect(result).toHaveProperty('totalTransactions', 2);
      expect(result).toHaveProperty('totalIncome', 525000);
      expect(result).toHaveProperty('consultFeeTotal', 450000);
      expect(result).toHaveProperty('medicineFeeTotal', 125000);
      expect(result.byPaymentMethod).toHaveProperty('TUNAI', 225000);
      expect(result.byPaymentMethod).toHaveProperty('QRIS', 300000);
      expect(result.byStatus).toHaveProperty('LUNAS', 1);
      expect(result.byStatus).toHaveProperty('SEBAGIAN', 1);
      expect(result.byStatus).toHaveProperty('BELUM_BAYAR', 0);
    });

    it('should return empty report for date with no billings', async () => {
      mockPrisma.billing.findMany.mockResolvedValue([]);

      const result = await billingsService.getDailyReport('2025-01-01');

      expect(result).toHaveProperty('totalTransactions', 0);
      expect(result).toHaveProperty('totalIncome', 0);
      expect(result.byPaymentMethod).toEqual({});
    });
  });
});