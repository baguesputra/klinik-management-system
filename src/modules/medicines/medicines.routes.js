// src/modules/medicines/medicines.routes.js
import { Router } from 'express';
import { medicinesController } from './medicines.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createMedicineSchema,
  updateMedicineSchema,
  stockMutationSchema,
} from './medicines.validator.js';

const router = Router();

router.use(authenticate);

// @route   GET /api/medicines
// @access  Semua role
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'APOTEKER', 'KASIR', 'PASIEN'),
  medicinesController.getAll.bind(medicinesController)
);

// @route   GET /api/medicines/:id
// @access  Semua role
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'APOTEKER', 'KASIR', 'PASIEN'),
  medicinesController.getById.bind(medicinesController)
);

// @route   POST /api/medicines
// @access  SUPER_ADMIN, APOTEKER
router.post(
  '/',
  authorize('SUPER_ADMIN', 'APOTEKER'),
  validate(createMedicineSchema),
  medicinesController.create.bind(medicinesController)
);

// @route   PATCH /api/medicines/:id
// @access  SUPER_ADMIN, APOTEKER
router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'APOTEKER'),
  validate(updateMedicineSchema),
  medicinesController.update.bind(medicinesController)
);

// @route   DELETE /api/medicines/:id
// @access  SUPER_ADMIN only
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  medicinesController.delete.bind(medicinesController)
);

// @route   POST /api/medicines/:id/stock
// @access  APOTEKER, SUPER_ADMIN
router.post(
  '/:id/stock',
  authorize('SUPER_ADMIN', 'APOTEKER'),
  validate(stockMutationSchema),
  medicinesController.addStockMutation.bind(medicinesController)
);

// @route   GET /api/medicines/:id/stock
// @access  SUPER_ADMIN, APOTEKER
router.get(
  '/:id/stock',
  authorize('SUPER_ADMIN', 'APOTEKER'),
  medicinesController.getStockMutations.bind(medicinesController)
);

export default router;