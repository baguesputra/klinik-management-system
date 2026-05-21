// src/modules/users/users.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const RoleEnum = z.enum([
  'SUPER_ADMIN',
  'ADMIN_KLINIK',
  'DOKTER',
  'APOTEKER',
  'KASIR',
  'PASIEN',
]);

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  phone: z.string().optional(),
  role: RoleEnum.default('PASIEN'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const changeRoleSchema = z.object({
  role: RoleEnum,
});

export const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: RoleEnum.optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export { validate };