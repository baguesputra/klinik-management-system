// src/modules/doctors/doctors.routes.js
import { Router } from 'express';
import { doctorsController } from './doctors.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createDoctorSchema,
  updateDoctorSchema,
} from './doctors.validator.js';

const router = Router();

router.use(authenticate);

// @route   GET /api/doctors/me
// @access  DOKTER
router.get(
  '/me',
  authorize('DOKTER'),
  doctorsController.getMyProfile.bind(doctorsController)
);

// @route   GET /api/doctors
// @access  Semua role
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'APOTEKER', 'KASIR', 'PASIEN'),
  doctorsController.getAll.bind(doctorsController)
);

// @route   GET /api/doctors/:id
// @access  Semua role
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'APOTEKER', 'KASIR', 'PASIEN'),
  doctorsController.getById.bind(doctorsController)
);

// @route   POST /api/doctors
// @access  SUPER_ADMIN
router.post(
  '/',
  authorize('SUPER_ADMIN'),
  validate(createDoctorSchema),
  doctorsController.create.bind(doctorsController)
);

// @route   PATCH /api/doctors/:id
// @access  SUPER_ADMIN
router.patch(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(updateDoctorSchema),
  doctorsController.update.bind(doctorsController)
);

// @route   DELETE /api/doctors/:id
// @access  SUPER_ADMIN
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  doctorsController.delete.bind(doctorsController)
);

// @route   GET /api/doctors/:id/appointments
// @access  SUPER_ADMIN, ADMIN_KLINIK, DOKTER
router.get(
  '/:id/appointments',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER'),
  doctorsController.getAppointments.bind(doctorsController)
);

export default router;