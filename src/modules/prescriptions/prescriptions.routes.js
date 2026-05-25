// src/modules/prescriptions/prescriptions.routes.js
import { Router } from 'express';
import { prescriptionsController } from './prescriptions.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createPrescriptionSchema,
  updatePrescriptionSchema,
  dispenseSchema,
} from './prescriptions.validator.js';

const router = Router();

router.use(authenticate);

// @route   GET /api/prescriptions/my
// @access  PASIEN
router.get(
  '/my',
  authorize('PASIEN'),
  prescriptionsController.getMyPrescriptions.bind(prescriptionsController)
);

// @route   GET /api/prescriptions
// @access  SUPER_ADMIN, APOTEKER, DOKTER
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'APOTEKER', 'DOKTER'),
  prescriptionsController.getAll.bind(prescriptionsController)
);

// @route   GET /api/prescriptions/:id
// @access  SUPER_ADMIN, APOTEKER, DOKTER, PASIEN
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'APOTEKER', 'DOKTER', 'PASIEN'),
  prescriptionsController.getById.bind(prescriptionsController)
);

// @route   POST /api/prescriptions
// @access  DOKTER
router.post(
  '/',
  authorize('DOKTER'),
  validate(createPrescriptionSchema),
  prescriptionsController.create.bind(prescriptionsController)
);

// @route   PATCH /api/prescriptions/:id
// @access  DOKTER
router.patch(
  '/:id',
  authorize('DOKTER'),
  validate(updatePrescriptionSchema),
  prescriptionsController.update.bind(prescriptionsController)
);

// @route   PATCH /api/prescriptions/:id/process
// @access  APOTEKER
router.patch(
  '/:id/process',
  authorize('APOTEKER', 'SUPER_ADMIN'),
  prescriptionsController.process.bind(prescriptionsController)
);

// @route   PATCH /api/prescriptions/:id/revert
// @access  APOTEKER
router.patch(
  '/:id/revert',
  authorize('APOTEKER', 'SUPER_ADMIN'),
  prescriptionsController.revert.bind(prescriptionsController)
);

// @route   PATCH /api/prescriptions/:id/dispense
// @access  APOTEKER
router.patch(
  '/:id/dispense',
  authorize('APOTEKER', 'SUPER_ADMIN'),
  validate(dispenseSchema),
  prescriptionsController.dispense.bind(prescriptionsController)
);

// @route   DELETE /api/prescriptions/:id
// @access  DOKTER
router.delete(
  '/:id',
  authorize('DOKTER', 'SUPER_ADMIN'),
  prescriptionsController.cancel.bind(prescriptionsController)
);

export default router;