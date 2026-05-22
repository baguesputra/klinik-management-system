// src/modules/patients/patients.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const GenderEnum = z.enum(['LAKI_LAKI', 'PEREMPUAN']);
const BloodTypeEnum = z.enum(['A', 'B', 'AB', 'O']);

export const createPatientSchema = z.object({
  // User info
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  phone: z.string().optional(),

  // Patient info
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  gender: GenderEnum,
  address: z.string().optional(),
  bloodType: BloodTypeEnum.optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const updatePatientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bloodType: BloodTypeEnum.optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const createMedicalRecordSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  diagnosis: z.string().min(3, 'Diagnosis is required'),
  notes: z.string().optional(),
  bloodPressure: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  temperature: z.number().positive().optional(),
});

export const queryPatientSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  gender: GenderEnum.optional(),
  bloodType: BloodTypeEnum.optional(),
});

export { validate };