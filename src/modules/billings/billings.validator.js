// src/modules/billings/billing.validator.js
import { z } from 'zod';
import { validate } from '../auth/auth.validator.js';

const PaymentMethodEnum = z.enum([
    'TUNAI', 'BRI', 'BNI', 'BCA', 'MANDIRI', 'BSI',
    'QRIS', 'OVO', 'GOPAY', 'DANA', 'SHOPEEPAY',
    'BPJS', 'ASURANSI_SWASTA',
]);

export const createBillingSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  consultFee: z.number().min(0, 'Consult fee cannot be negative'),
  notes: z.string().optional(),
  // BPJS
  isBpjs: z.boolean().default(false),
  bpjsNo: z.string().optional(),
  bpjsCoveredAmount: z.number().min(0).optional(),
  // Asuransi swasta
  insuranceProvider: z.string().optional(),
  insuranceClaimNo: z.string().optional(),
  insuranceCovered: z.number().min(0).optional(),
}).refine(
  (data) => !data.isBpjs || (data.isBpjs && data.bpjsNo),
  { message: 'BPJS number is required when isBpjs is true' }
).refine(
  (data) => !data.insuranceProvider || (data.insuranceProvider && data.insuranceClaimNo),
  { message: 'Insurance claim number is required when insuranceProvider is set' }
);

export const updateBillingSchema = z.object({
  consultFee: z.number().min(0).optional(),
  notes: z.string().optional(),
  isBpjs: z.boolean().optional(),
  bpjsNo: z.string().optional(),
  bpjsCoveredAmount: z.number().min(0).optional(),
  insuranceProvider: z.string().optional(),
  insuranceClaimNo: z.string().optional(),
  insuranceCovered: z.number().min(0).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const updateMedicineFeeSchema = z.object({
  medicineFee: z.number().min(0, 'Medicine fee cannot be negative'),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  amountPaid: z.number().positive('Amount paid must be positive'),
  method: PaymentMethodEnum,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // Non-tunai: amountPaid harus sama dengan amount
    if (data.method !== 'TUNAI' && data.amountPaid !== data.amount) {
      return false;
    }
    return true;
  },
  { message: 'For non-cash payments, amountPaid must equal amount' }
).refine(
  (data) => {
    // Transfer/digital: referenceNo wajib
    const requiresRef = ['BRI', 'BNI', 'BCA', 'MANDIRI', 'BSI', 'QRIS', 'OVO', 'GOPAY', 'DANA', 'SHOPEEPAY'];
    if (requiresRef.includes(data.method) && !data.referenceNo) {
      return false;
    }
    return true;
  },
  { message: 'Reference number is required for transfer and digital payments' }
);

export const voidRequestSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const reviewVoidSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().min(5, 'Review notes are required'),
});

export const queryBillingSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  paymentStatus: z.enum(['BELUM_BAYAR', 'SEBAGIAN', 'LUNAS']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(), // cari by invoiceNumber atau nama pasien
});

export const queryReportSchema = z.object({
  date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM').optional(),
  year: z.string().regex(/^\d{4}$/, 'Format must be YYYY').optional(),
});

export { validate };