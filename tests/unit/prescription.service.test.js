// tests/unit/prescription.service.test.js
import { jest } from '@jest/globals';

// ── Mock dependencies ─────────────────────────────────
const mockPrisma = {
  prescription: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  prescriptionItem: {
    deleteMany: jest.fn(),
  },
  medicalRecord: {
    findUnique: jest.fn(),
  },
  doctor: {
    findUnique: jest.fn(),
  },
  medicine: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
  stockMutation: {
    create: jest.fn(),
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

const { PrescriptionsService } = await import(
  '../../src/modules/prescriptions/prescriptions.service.js'
);

const prescriptionsService = new PrescriptionsService();

// ── Mock data ─────────────────────────────────────────

const mockMedicine = {
  id: 'medicine-uuid-123',
  name: 'Paracetamol 500mg',
  unit: 'tablet',
  price: 500,
  stock: 100,
  isActive: true,
};

const mockDoctor = {
  id: 'doctor-uuid-123',
  specialization: 'Dokter Umum',
  user: { name: 'Dr. Test' },
};

const mockPatient = {
  id: 'patient-uuid-123',
  medicalRecordNo: 'RM001',
  user: { name: 'Test Patient', phone: '081234567890' },
};

const mockAppointment = {
  id: 'appointment-uuid-123',
  doctorId: mockDoctor.id,
  patientId: mockPatient.id,
  date: new Date(),
  doctor: mockDoctor,
  patient: mockPatient,
};

const mockMedicalRecord = {
  id: 'medical-record-uuid-123',
  patientId: mockPatient.id,
  appointmentId: mockAppointment.id,
  diagnosis: 'Test diagnosis',
  appointment: mockAppointment,
};

const mockPrescriptionItem = {
  id: 'prescription-item-uuid-123',
  quantity: 10,
  quantityDispensed: 0,
  dosage: '3x1 sesudah makan',
  notes: null,
  medicine: mockMedicine,
};

const mockPrescription = {
  id: 'prescription-uuid-123',
  status: 'MENUNGGU',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [mockPrescriptionItem],
  medicalRecord: {
    ...mockMedicalRecord,
    appointment: {
      ...mockAppointment,
      doctor: mockDoctor,
      patient: mockPatient,
    },
  },
};

// ── Tests ─────────────────────────────────────────────

describe('PrescriptionsService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Create ───────────────────────────────────────────
  describe('create', () => {
    it('should create prescription successfully', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockMedicalRecord);
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.prescription.findUnique.mockResolvedValue(null);
      mockPrisma.medicine.findMany.mockResolvedValue([mockMedicine]);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          prescription: {
            create: jest.fn().mockResolvedValue(mockPrescription),
          },
        });
      });

      const result = await prescriptionsService.create(
        {
          medicalRecordId: mockMedicalRecord.id,
          items: [{
            medicineId: mockMedicine.id,
            quantity: 10,
            dosage: '3x1 sesudah makan',
          }],
        },
        'doctor-user-uuid'
      );

      expect(result).toHaveProperty('status', 'MENUNGGU');
      expect(result).toHaveProperty('items');
    });

    it('should throw not found if medical record does not exist', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue(null);

      await expect(
        prescriptionsService.create(
          {
            medicalRecordId: 'nonexistent-id',
            items: [{
              medicineId: mockMedicine.id,
              quantity: 10,
              dosage: '3x1',
            }],
          },
          'doctor-user-uuid'
        )
      ).rejects.toThrow('Medical record not found');
    });

    it('should throw forbidden if doctor tries to create prescription for another doctor medical record', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockMedicalRecord);
      mockPrisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        id: 'different-doctor-id',
      });

      await expect(
        prescriptionsService.create(
          {
            medicalRecordId: mockMedicalRecord.id,
            items: [{
              medicineId: mockMedicine.id,
              quantity: 10,
              dosage: '3x1',
            }],
          },
          'different-doctor-user-id'
        )
      ).rejects.toThrow('Cannot create prescription for another doctor\'s medical record');
    });

    it('should throw conflict if prescription already exists', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockMedicalRecord);
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.prescription.findUnique.mockResolvedValue(mockPrescription);

      await expect(
        prescriptionsService.create(
          {
            medicalRecordId: mockMedicalRecord.id,
            items: [{
              medicineId: mockMedicine.id,
              quantity: 10,
              dosage: '3x1',
            }],
          },
          'doctor-user-uuid'
        )
      ).rejects.toThrow('Prescription already exists for this medical record');
    });

    it('should throw bad request if medicine is not found or inactive', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockMedicalRecord);
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.prescription.findUnique.mockResolvedValue(null);
      mockPrisma.medicine.findMany.mockResolvedValue([]); // tidak ada medicine

      await expect(
        prescriptionsService.create(
          {
            medicalRecordId: mockMedicalRecord.id,
            items: [{
              medicineId: 'nonexistent-medicine-id',
              quantity: 10,
              dosage: '3x1',
            }],
          },
          'doctor-user-uuid'
        )
      ).rejects.toThrow('One or more medicines not found or inactive');
    });
  });

  // ── Process ──────────────────────────────────────────
  describe('process', () => {
    it('should change status from MENUNGGU to DIPROSES', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      mockPrisma.prescription.update.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });

      const result = await prescriptionsService.process(mockPrescription.id);

      expect(result).toHaveProperty('status', 'DIPROSES');
      expect(mockPrisma.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'DIPROSES' },
        })
      );
    });

    it('should throw bad request if prescription is not MENUNGGU', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });

      await expect(
        prescriptionsService.process(mockPrescription.id)
      ).rejects.toThrow('Cannot process prescription with status DIPROSES');
    });
  });

  // ── Revert ───────────────────────────────────────────
  describe('revert', () => {
    it('should change status from DIPROSES back to MENUNGGU', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });
      mockPrisma.prescription.update.mockResolvedValue({
        ...mockPrescription,
        status: 'MENUNGGU',
      });

      const result = await prescriptionsService.revert(mockPrescription.id);

      expect(result).toHaveProperty('status', 'MENUNGGU');
    });

    it('should throw bad request if prescription is not DIPROSES', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(mockPrescription);

      await expect(
        prescriptionsService.revert(mockPrescription.id)
      ).rejects.toThrow('Cannot revert prescription with status MENUNGGU');
    });
  });

  // ── Dispense ─────────────────────────────────────────
  describe('dispense', () => {
    const dispensingItems = [{
      prescriptionItemId: mockPrescriptionItem.id,
      quantityDispensed: 10,
    }];

    it('should dispense successfully and set status SELESAI', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          prescriptionItem: { update: jest.fn() },
          medicine: { update: jest.fn() },
          stockMutation: { create: jest.fn() },
          prescription: {
            update: jest.fn().mockResolvedValue({
              ...mockPrescription,
              status: 'SELESAI',
            }),
          },
        });
      });

      const result = await prescriptionsService.dispense(
        mockPrescription.id,
        dispensingItems
      );

      expect(result).toHaveProperty('status', 'SELESAI');
    });

    it('should set status TIDAK_DIAMBIL if all quantityDispensed are 0', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          prescriptionItem: { update: jest.fn() },
          medicine: { update: jest.fn() },
          stockMutation: { create: jest.fn() },
          prescription: {
            update: jest.fn().mockResolvedValue({
              ...mockPrescription,
              status: 'TIDAK_DIAMBIL',
            }),
          },
        });
      });

      const result = await prescriptionsService.dispense(
        mockPrescription.id,
        [{ prescriptionItemId: mockPrescriptionItem.id, quantityDispensed: 0 }]
      );

      expect(result).toHaveProperty('status', 'TIDAK_DIAMBIL');
    });

    it('should set status DIAMBIL_SEBAGIAN if partial quantity dispensed', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
        items: [{
          ...mockPrescriptionItem,
          quantity: 10,
        }],
      });
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          prescriptionItem: { update: jest.fn() },
          medicine: { update: jest.fn() },
          stockMutation: { create: jest.fn() },
          prescription: {
            update: jest.fn().mockResolvedValue({
              ...mockPrescription,
              status: 'DIAMBIL_SEBAGIAN',
            }),
          },
        });
      });

      const result = await prescriptionsService.dispense(
        mockPrescription.id,
        [{ prescriptionItemId: mockPrescriptionItem.id, quantityDispensed: 5 }]
      );

      expect(result).toHaveProperty('status', 'DIAMBIL_SEBAGIAN');
    });

    it('should throw bad request if prescription is not DIPROSES', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(mockPrescription);

      await expect(
        prescriptionsService.dispense(mockPrescription.id, dispensingItems)
      ).rejects.toThrow('Cannot dispense prescription with status MENUNGGU');
    });

    it('should throw bad request if stock is insufficient', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
        items: [{
          ...mockPrescriptionItem,
          quantity: 10,
          medicine: { ...mockMedicine, stock: 5 }, // stok hanya 5
        }],
      });

      await expect(
        prescriptionsService.dispense(
          mockPrescription.id,
          [{ prescriptionItemId: mockPrescriptionItem.id, quantityDispensed: 10 }]
        )
      ).rejects.toThrow('Insufficient stock for some items');
    });

    it('should throw bad request if not all items are included in dispensing data', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });

      await expect(
        prescriptionsService.dispense(
          mockPrescription.id,
          [] // empty dispensing items
        )
      ).rejects.toThrow('All prescription items must be included in dispensing data');
    });
  });

  // ── Cancel ───────────────────────────────────────────
  describe('cancel', () => {
    it('should cancel prescription successfully when MENUNGGU', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          prescriptionItem: { deleteMany: jest.fn() },
          prescription: { delete: jest.fn() },
        });
      });

      await expect(
        prescriptionsService.cancel(mockPrescription.id, 'doctor-user-uuid')
      ).resolves.not.toThrow();
    });

    it('should throw bad request if prescription is not MENUNGGU', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        status: 'DIPROSES',
      });

      await expect(
        prescriptionsService.cancel(mockPrescription.id, 'doctor-user-uuid')
      ).rejects.toThrow('Cannot cancel prescription with status DIPROSES');
    });
  });

});