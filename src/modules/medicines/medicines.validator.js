// src/modules/medicines/medicines.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const StockMutationTypeEnum = z.enum(['MASUK', 'KELUAR', 'ADJUSTMENT']);

export const createMedicineSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  genericName: z.string().optional(),
  category: z.string().min(2, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'), // tablet, kapsul, ml, dll
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(10),
  description: z.string().optional(),
  expiryDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
});

export const updateMedicineSchema = z.object({
  name: z.string().min(2).optional(),
  genericName: z.string().optional(),
  category: z.string().min(2).optional(),
  unit: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  minStock: z.number().int().min(0).optional(),
  description: z.string().optional(),
  expiryDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const stockMutationSchema = z.object({
  type: StockMutationTypeEnum,
  quantity: z.number().int().refine(
    (val) => val !== 0,
    { message: 'Quantity cannot be zero' }
  ),
  reason: z.string().min(3, 'Reason is required'),
}).refine(
  (data) => {
    // MASUK harus positif
    if (data.type === 'MASUK' && data.quantity < 0) return false;
    // KELUAR harus positif (service yang akan kurangi stok)
    if (data.type === 'KELUAR' && data.quantity < 0) return false;
    // ADJUSTMENT boleh positif atau negatif
    return true;
  },
  { message: 'MASUK and KELUAR quantity must be positive' }
);

export const queryMedicineSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isLowStock: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isExpired: z.enum(['true', 'false']).optional(),
  expiryBefore: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
});

export const queryStockMutationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: StockMutationTypeEnum.optional(),
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