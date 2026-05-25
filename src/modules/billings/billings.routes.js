// src/modules/billings/billings.routes.js
import { Router } from 'express';
import { billingsController } from './billings.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createBillingSchema,
  updateBillingSchema,
  updateMedicineFeeSchema,
  createPaymentSchema,
  voidRequestSchema,
  reviewVoidSchema,
} from './billings.validator.js';

const router = Router();

router.use(authenticate);

// @route   GET /api/billings/report/daily
// @access  SUPER_ADMIN, KASIR, ADMIN_KLINIK
router.get(
  '/report/daily',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'KASIR'),
  billingsController.getDailyReport.bind(billingsController)
);

// @route   GET /api/billings/report/monthly
// @access  SUPER_ADMIN, KASIR, ADMIN_KLINIK
router.get(
  '/report/monthly',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'KASIR'),
  billingsController.getMonthlyReport.bind(billingsController)
);

// @route   GET /api/billings/my
// @access  PASIEN
router.get(
  '/my',
  authorize('PASIEN'),
  billingsController.getMyBillings.bind(billingsController)
);

// @route   GET /api/billings
// @access  SUPER_ADMIN, KASIR, ADMIN_KLINIK
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'KASIR'),
  billingsController.getAll.bind(billingsController)
);

// @route   GET /api/billings/:id
// @access  SUPER_ADMIN, KASIR, ADMIN_KLINIK, PASIEN
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'KASIR', 'PASIEN'),
  billingsController.getById.bind(billingsController)
);

// @route   GET /api/billings/:id/pdf
// @access  SUPER_ADMIN, KASIR, PASIEN
router.get(
  '/:id/pdf',
  authorize('SUPER_ADMIN', 'KASIR', 'PASIEN'),
  billingsController.downloadPdf.bind(billingsController)
);

// @route   POST /api/billings
// @access  KASIR, SUPER_ADMIN
router.post(
  '/',
  authorize('SUPER_ADMIN', 'KASIR'),
  validate(createBillingSchema),
  billingsController.create.bind(billingsController)
);

// @route   PATCH /api/billings/:id
// @access  KASIR, SUPER_ADMIN
router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'KASIR'),
  validate(updateBillingSchema),
  billingsController.update.bind(billingsController)
);

// @route   PATCH /api/billings/:id/medicine-fee
// @access  KASIR, SUPER_ADMIN
router.patch(
  '/:id/medicine-fee',
  authorize('SUPER_ADMIN', 'KASIR'),
  validate(updateMedicineFeeSchema),
  billingsController.updateMedicineFee.bind(billingsController)
);

// @route   GET /api/billings/:id/payments
// @access  SUPER_ADMIN, KASIR, ADMIN_KLINIK
router.get(
  '/:id/payments',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'KASIR'),
  billingsController.getPayments.bind(billingsController)
);

// @route   POST /api/billings/:id/payments
// @access  KASIR, SUPER_ADMIN
router.post(
  '/:id/payments',
  authorize('SUPER_ADMIN', 'KASIR'),
  validate(createPaymentSchema),
  billingsController.addPayment.bind(billingsController)
);

// @route   POST /api/billings/:id/payments/:paymentId/void
// @access  KASIR
router.post(
  '/:id/payments/:paymentId/void',
  authorize('KASIR'),
  validate(voidRequestSchema),
  billingsController.requestVoid.bind(billingsController)
);

// @route   PATCH /api/billings/:id/payments/:paymentId/void
// @access  SUPER_ADMIN, ADMIN_KLINIK
router.patch(
  '/:id/payments/:paymentId/void',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK'),
  validate(reviewVoidSchema),
  billingsController.reviewVoid.bind(billingsController)
);

export default router;