// src/modules/appointments/appointments.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const AppointmentStatusEnum = z.enum([
  'MENUNGGU',
  'DIPANGGIL',
  'SELESAI',
  'DIBATALKAN',
]);

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d > new Date();
  }, { message: 'Date must be a valid future date' }),
  complaint: z.string().min(3, 'Complaint is required').max(500),
});

export const updateStatusSchema = z.object({
  status: AppointmentStatusEnum.refine(
    (val) => val !== 'MENUNGGU',
    { message: 'Cannot set status back to MENUNGGU' }
  ),
  notes: z.string().max(500).optional(),
});

export const queryAppointmentSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  date: z.string().optional(),
  status: AppointmentStatusEnum.optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export { validate };