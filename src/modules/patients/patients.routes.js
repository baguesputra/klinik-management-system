// src/modules/patients/patients.routes.js
import { Router } from 'express';
import { patientsController } from './patients.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createPatientSchema,
  updatePatientSchema,
  createMedicalRecordSchema,
} from './patients.validator.js';

const router = Router();

// Semua route butuh login
router.use(authenticate);

// @route   GET /api/patients/me
// @access  PASIEN
router.get(
  '/me',
  authorize('PASIEN'),
  patientsController.getMyProfile.bind(patientsController)
);

// @route   GET /api/patients
// @access  SUPER_ADMIN, ADMIN_KLINIK, DOKTER
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER'),
  patientsController.getAll.bind(patientsController)
);

// @route   GET /api/patients/:id
// @access  SUPER_ADMIN, ADMIN_KLINIK, DOKTER, PASIEN (own)
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'PASIEN'),
  patientsController.getById.bind(patientsController)
);

// @route   POST /api/patients
// @access  ADMIN_KLINIK, SUPER_ADMIN
router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK'),
  validate(createPatientSchema),
  patientsController.create.bind(patientsController)
);

// @route   PATCH /api/patients/:id
// @access  ADMIN_KLINIK, SUPER_ADMIN, PASIEN (own)
router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'PASIEN'),
  validate(updatePatientSchema),
  patientsController.update.bind(patientsController)
);

// @route   GET /api/patients/:id/medical-records
// @access  DOKTER, ADMIN_KLINIK, SUPER_ADMIN, PASIEN (own)
router.get(
  '/:id/medical-records',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'PASIEN'),
  patientsController.getMedicalRecords.bind(patientsController)
);

// @route   GET /api/patients/:id/medical-records/:recordId
// @access  DOKTER, ADMIN_KLINIK, SUPER_ADMIN, PASIEN (own)
router.get(
  '/:id/medical-records/:recordId',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'PASIEN'),
  patientsController.getMedicalRecordById.bind(patientsController)
);

// @route   POST /api/patients/:id/medical-records
// @access  DOKTER only
router.post(
  '/:id/medical-records',
  authorize('DOKTER'),
  validate(createMedicalRecordSchema),
  patientsController.createMedicalRecord.bind(patientsController)
);

export default router;