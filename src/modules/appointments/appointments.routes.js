// src/modules/appointments/appointments.routes.js
import { Router } from 'express';
import { appointmentsController } from './appointments.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import {
  validate,
  createAppointmentSchema,
  updateStatusSchema,
} from './appointments.validator.js';

const router = Router();

router.use(authenticate);

// @route   GET /api/appointments/my
// @access  PASIEN
router.get(
  '/my',
  authorize('PASIEN'),
  appointmentsController.getMyAppointments.bind(appointmentsController)
);

// @route   GET /api/appointments
// @access  SUPER_ADMIN, ADMIN_KLINIK, DOKTER
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER'),
  appointmentsController.getAll.bind(appointmentsController)
);

// @route   GET /api/appointments/:id
// @access  SUPER_ADMIN, ADMIN_KLINIK, DOKTER, PASIEN
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER', 'PASIEN'),
  appointmentsController.getById.bind(appointmentsController)
);

// @route   POST /api/appointments
// @access  ADMIN_KLINIK
router.post(
  '/',
  authorize('ADMIN_KLINIK', 'SUPER_ADMIN'),
  validate(createAppointmentSchema),
  appointmentsController.create.bind(appointmentsController)
);

// @route   PATCH /api/appointments/:id/status
// @access  ADMIN_KLINIK, DOKTER
router.patch(
  '/:id/status',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK', 'DOKTER'),
  validate(updateStatusSchema),
  appointmentsController.updateStatus.bind(appointmentsController)
);

// @route   DELETE /api/appointments/:id
// @access  ADMIN_KLINIK, SUPER_ADMIN
router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK'),
  appointmentsController.cancel.bind(appointmentsController)
);

export default router;