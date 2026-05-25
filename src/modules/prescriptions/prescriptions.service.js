// src/modules/prescriptions/prescriptions.service.js
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const prescriptionSelect = {
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  medicalRecord: {
    select: {
      id: true,
      diagnosis: true,
      createdAt: true,
      appointment: {
        select: {
          date: true,
          patient: {
            select: {
              medicalRecordNo: true,
              user: { select: { name: true, phone: true } },
            },
          },
          doctor: {
            select: {
              specialization: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  items: {
    select: {
      id: true,
      quantity: true,
      dosage: true,
      notes: true,
      medicine: {
        select: {
          id: true,
          name: true,
          genericName: true,
          unit: true,
          price: true,
          stock: true,
        },
      },
    },
  },
};

export class PrescriptionsService {
  // ── Get All ───────────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);
    const { status, dateFrom, dateTo } = query;

    const where = {
      ...(status && { status }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
        },
      }),
    };

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        select: prescriptionSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ]);

    return { prescriptions, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get My Prescriptions (PASIEN) ─────────────────────
  async getMyPrescriptions(userId, query) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw ApiError.notFound('Patient profile not found');

    const { page, limit, skip } = getPagination(query);
    const { status } = query;

    const where = {
      ...(status && { status }),
      medicalRecord: {
        appointment: { patientId: patient.id },
      },
    };

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        select: prescriptionSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ]);

    return { prescriptions, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ── Get By ID ─────────────────────────────────────────
  async getById(id) {
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: prescriptionSelect,
    });

    if (!prescription) throw ApiError.notFound('Prescription not found');
    return prescription;
  }

  // ── Create ────────────────────────────────────────────
  async create(data, requesterId) {
    const { medicalRecordId, notes, items } = data;

    // Validasi medical record ada
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { id: medicalRecordId },
      include: {
        appointment: {
          include: {
            doctor: true,
          },
        },
      },
    });

    if (!medicalRecord) throw ApiError.notFound('Medical record not found');

    // Validasi dokter hanya bisa buat resep dari medical record miliknya
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterId },
    });

    if (!doctor || doctor.id !== medicalRecord.appointment.doctorId) {
      throw ApiError.forbidden('Cannot create prescription for another doctor\'s medical record');
    }

    // Cek prescription sudah ada untuk medical record ini
    const existing = await prisma.prescription.findUnique({
      where: { medicalRecordId },
    });
    if (existing) throw ApiError.conflict('Prescription already exists for this medical record');

    // Validasi semua medicineId valid dan aktif
    const medicineIds = items.map((i) => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, isActive: true },
      select: { id: true, name: true },
    });

    if (medicines.length !== medicineIds.length) {
      throw ApiError.badRequest('One or more medicines not found or inactive');
    }

    return prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          medicalRecordId,
          notes,
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              dosage: item.dosage,
              notes: item.notes,
            })),
          },
        },
        select: prescriptionSelect,
      });

      return prescription;
    });
  }

  // ── Update Items (MENUNGGU saja) ──────────────────────
  async update(id, data, requesterId) {
    const prescription = await this.getById(id);

    if (prescription.status !== 'MENUNGGU') {
      throw ApiError.badRequest(
        `Cannot update prescription with status ${prescription.status}`
      );
    }

    // Validasi dokter hanya bisa update resep dari medical record miliknya
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterId },
    });

    const doctorName = prescription.medicalRecord.appointment.doctor.user.name;
    if (!doctor || prescription.medicalRecord.appointment.doctor.user.name !== doctorName) {
      throw ApiError.forbidden('Cannot update another doctor\'s prescription');
    }

    // Validasi semua medicineId valid dan aktif
    if (data.items) {
      const medicineIds = data.items.map((i) => i.medicineId);
      const medicines = await prisma.medicine.findMany({
        where: { id: { in: medicineIds }, isActive: true },
      });

      if (medicines.length !== medicineIds.length) {
        throw ApiError.badRequest('One or more medicines not found or inactive');
      }
    }

    return prisma.$transaction(async (tx) => {
      // Hapus semua items lama lalu replace dengan yang baru
      await tx.prescriptionItem.deleteMany({
        where: { prescriptionId: id },
      });

      return tx.prescription.update({
        where: { id },
        data: {
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.items && {
            items: {
              create: data.items.map((item) => ({
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosage: item.dosage,
                notes: item.notes,
              })),
            },
          }),
        },
        select: prescriptionSelect,
      });
    });
  }

  // ── Process (MENUNGGU → DIPROSES) ─────────────────────
  async process(id) {
    const prescription = await this.getById(id);

    if (prescription.status !== 'MENUNGGU') {
      throw ApiError.badRequest(
        `Cannot process prescription with status ${prescription.status}`
      );
    }

    return prisma.prescription.update({
      where: { id },
      data: { status: 'DIPROSES' },
      select: prescriptionSelect,
    });
  }

  // ── Revert (DIPROSES → MENUNGGU) ──────────────────────
  async revert(id) {
    const prescription = await this.getById(id);

    if (prescription.status !== 'DIPROSES') {
      throw ApiError.badRequest(
        `Cannot revert prescription with status ${prescription.status}`
      );
    }

    return prisma.prescription.update({
      where: { id },
      data: { status: 'MENUNGGU' },
      select: prescriptionSelect,
    });
  }

  // ── Dispense (DIPROSES → SELESAI) ─────────────────────
  // ── Dispense (DIPROSES → SELESAI/DIAMBIL_SEBAGIAN/TIDAK_DIAMBIL) ──
async dispense(id, dispensingItems) {
  const prescription = await this.getById(id);

  if (prescription.status !== 'DIPROSES') {
    throw ApiError.badRequest(
      `Cannot dispense prescription with status ${prescription.status}`
    );
  }

  const doctorName = prescription.medicalRecord.appointment.doctor.user.name;
  const medicalRecordNo = prescription.medicalRecord.appointment.patient.medicalRecordNo;
  const prescriptionDate = new Date(prescription.createdAt).toLocaleDateString('id-ID');

  // Validasi dispensingItems — harus ada untuk setiap item di prescription
  const prescriptionItemIds = prescription.items.map((i) => i.id);
  const dispensingItemIds = dispensingItems.map((i) => i.prescriptionItemId);

  const missingItems = prescriptionItemIds.filter(
    (id) => !dispensingItemIds.includes(id)
  );
  if (missingItems.length > 0) {
    throw ApiError.badRequest(
      'All prescription items must be included in dispensing data'
    );
  }

  // Map dispensingItems untuk akses cepat
  const dispensingMap = Object.fromEntries(
    dispensingItems.map((i) => [i.prescriptionItemId, i.quantityDispensed])
  );

  // Cek stok untuk item yang diambil
  const insufficientItems = prescription.items
    .filter((item) => {
      const qtyDispensed = dispensingMap[item.id] ?? 0;
      return qtyDispensed > 0 && item.medicine.stock < qtyDispensed;
    })
    .map((item) => ({
      medicine: item.medicine.name,
      requested: dispensingMap[item.id],
      available: item.medicine.stock,
    }));

  if (insufficientItems.length > 0) {
    throw ApiError.badRequest('Insufficient stock for some items', insufficientItems);
  }

  // Tentukan status berdasarkan quantityDispensed
  const totalRequested = prescription.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalDispensed = prescription.items.reduce(
    (sum, i) => sum + (dispensingMap[i.id] ?? 0), 0
  );

  let newStatus;
  if (totalDispensed === 0) {
    newStatus = 'TIDAK_DIAMBIL';
  } else if (totalDispensed < totalRequested) {
    newStatus = 'DIAMBIL_SEBAGIAN';
  } else {
    newStatus = 'SELESAI';
  }

  return prisma.$transaction(async (tx) => {
    for (const item of prescription.items) {
      const qtyDispensed = dispensingMap[item.id] ?? 0;

      // Update quantityDispensed di PrescriptionItem
      await tx.prescriptionItem.update({
        where: { id: item.id },
        data: { quantityDispensed: qtyDispensed },
      });

      // Kurangi stok hanya untuk yang diambil
      if (qtyDispensed > 0) {
        await tx.medicine.update({
          where: { id: item.medicine.id },
          data: { stock: { decrement: qtyDispensed } },
        });

        await tx.stockMutation.create({
          data: {
            medicineId: item.medicine.id,
            type: 'KELUAR',
            quantity: qtyDispensed,
            reason: `Dispensing resep #${id} — Dr. ${doctorName} — RM: ${medicalRecordNo} — ${prescriptionDate}`,
          },
        });
      }
    }

    return tx.prescription.update({
      where: { id },
      data: { status: newStatus },
      select: prescriptionSelect,
    });
  });
}

  // ── Cancel (MENUNGGU → hapus) ─────────────────────────
  async cancel(id, requesterId) {
    const prescription = await this.getById(id);

    if (prescription.status !== 'MENUNGGU') {
      throw ApiError.badRequest(
        `Cannot cancel prescription with status ${prescription.status}`
      );
    }

    // Validasi dokter hanya bisa cancel resep miliknya
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterId },
    });

    const appointmentDoctorId = prescription.medicalRecord.appointment.doctor;
    if (!doctor || prescription.medicalRecord.appointment.doctor.user.name !==
      prescription.medicalRecord.appointment.doctor.user.name) {
      throw ApiError.forbidden('Cannot cancel another doctor\'s prescription');
    }

    // Hapus items dulu karena ada relasi foreign key
    return prisma.$transaction(async (tx) => {
      await tx.prescriptionItem.deleteMany({
        where: { prescriptionId: id },
      });

      await tx.prescription.delete({ where: { id } });
    });
  }
}

export const prescriptionsService = new PrescriptionsService();