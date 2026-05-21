// src/modules/auth/auth.routes.js
import { Router } from 'express';
import passport from '../../config/passport.js';
import { authController } from './auth.controller.js';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshSchema,
} from './auth.validator.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// ── Local Auth ────────────────────────────────────────
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/refresh', validate(refreshSchema), authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.getMe.bind(authController));

// ── Google OAuth2 ─────────────────────────────────────

// @route   GET /api/auth/google
// @desc    Redirect ke Google login page
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google redirect ke sini setelah login
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/google/failure',
  }),
  authController.googleCallback.bind(authController)
);

// @route   GET /api/auth/google/failure
// @access  Public
router.get('/google/failure', authController.googleCallbackFailure.bind(authController));

export default router;