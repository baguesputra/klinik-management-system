// src/modules/prescriptions/prescriptions.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const PrescriptionItemSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  dosage: z.string().min(3, 'Dosage is required'), // "3x1 sesudah makan"
  notes: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().uuid('Invalid medical record ID'),
  notes: z.string().optional(),
  items: z.array(PrescriptionItemSchema)
    .min(1, 'At least one medicine is required'),
});

export const updatePrescriptionSchema = z.object({
  notes: z.string().optional(),
  items: z.array(PrescriptionItemSchema)
    .min(1, 'At least one medicine is required'),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const dispenseSchema = z.object({
  items: z.array(z.object({
    prescriptionItemId: z.string().uuid('Invalid prescription item ID'),
    quantityDispensed: z.number().int().min(0, 'Quantity cannot be negative'),
  })).min(1, 'Dispensing items are required'),
});

export const queryPrescriptionSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['MENUNGGU', 'DIPROSES', 'SELESAI']).optional(),
  dateFrom: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
  dateTo: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
});

export { validate };