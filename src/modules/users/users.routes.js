// src/modules/users/users.routes.js
import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { validate, createUserSchema, updateUserSchema, changeRoleSchema } from './users.validator.js';

const router = Router();

// Semua route butuh login
router.use(authenticate);

// @route   GET /api/users
// @access  SUPER_ADMIN, ADMIN_KLINIK
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK'),
  usersController.getAll.bind(usersController)
);

// @route   GET /api/users/:id
// @access  SUPER_ADMIN, ADMIN_KLINIK
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN_KLINIK'),
  usersController.getById.bind(usersController)
);

// @route   POST /api/users
// @access  SUPER_ADMIN only
router.post(
  '/',
  authorize('SUPER_ADMIN'),
  validate(createUserSchema),
  usersController.create.bind(usersController)
);

// @route   PATCH /api/users/:id
// @access  SUPER_ADMIN only
router.patch(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(updateUserSchema),
  usersController.update.bind(usersController)
);

// @route   PATCH /api/users/:id/role
// @access  SUPER_ADMIN only
router.patch(
  '/:id/role',
  authorize('SUPER_ADMIN'),
  validate(changeRoleSchema),
  usersController.changeRole.bind(usersController)
);

// @route   PATCH /api/users/:id/toggle-active
// @access  SUPER_ADMIN only
router.patch(
  '/:id/toggle-active',
  authorize('SUPER_ADMIN'),
  usersController.toggleActive.bind(usersController)
);

// @route   DELETE /api/users/:id
// @access  SUPER_ADMIN only
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  usersController.delete.bind(usersController)
);

export default router;