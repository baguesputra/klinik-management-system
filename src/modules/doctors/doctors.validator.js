// src/modules/doctors/doctors.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const DayEnum = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

// Format jam: "08:00" sampai "23:59"
const TimeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format, use HH:MM');

// Schedule: { monday: ["08:00", "16:00"], ... }
// Tiap hari harus punya tepat 2 elemen [jamBuka, jamTutup]
// jamBuka harus lebih awal dari jamTutup
const ScheduleSchema = z.record(DayEnum, z.tuple([TimeString, TimeString]))
  .refine(
    (schedule) => Object.values(schedule).every(([open, close]) => open < close),
    { message: 'Opening time must be earlier than closing time' }
  );

export const createDoctorSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  specialization: z.string().min(3, 'Specialization is required'),
  licenseNumber: z.string().min(3, 'License number is required'),
  schedule: ScheduleSchema,
});

export const updateDoctorSchema = z.object({
  specialization: z.string().min(3).optional(),
  licenseNumber: z.string().min(3).optional(),
  schedule: ScheduleSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const queryDoctorSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  specialization: z.string().optional(),
});

export { validate };