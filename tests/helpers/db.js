// tests/helpers/db.js
import { prisma } from '../../src/config/database.js';

export const cleanDatabase = async () => {
  await prisma.paymentVoidRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.stockMutation.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
};