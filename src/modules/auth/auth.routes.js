// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate, registerSchema, loginSchema, refreshSchema } from './auth.validator.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// @route   POST /api/auth/register
// @access  Public
router.post('/register', validate(registerSchema), authController.register.bind(authController));

// @route   POST /api/auth/login
// @access  Public
router.post('/login', validate(loginSchema), authController.login.bind(authController));

// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', validate(refreshSchema), authController.refresh.bind(authController));

// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, authController.logout.bind(authController));

// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;