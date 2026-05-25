// src/middlewares/rateLimiter.js
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';

// ── Helper buat limiter ───────────────────────────────
const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message,
    },
    standardHeaders: true,  // kirim X-RateLimit-* headers
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rate_limit:${options.prefix}:`,
    }),
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
  });
};

// ── Auth limiters ─────────────────────────────────────

// Login — paling ketat, rawan brute force
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  prefix: 'login',
  message: 'Too many login attempts, please try again after 15 minutes',
});

// Register — cegah spam akun
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 3,
  prefix: 'register',
  message: 'Too many registration attempts, please try again after 1 hour',
});

// Refresh token
export const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  prefix: 'refresh',
  message: 'Too many token refresh attempts, please try again after 15 minutes',
});

// ── Global limiter ────────────────────────────────────
// Semua route yang tidak punya limiter spesifik
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,
  prefix: 'global',
  message: 'Too many requests, please try again after 15 minutes',
});

// ── Sensitive route limiter ───────────────────────────
// Untuk route yang butuh extra protection
// seperti generate PDF, laporan keuangan
export const sensitiveLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 20,
  prefix: 'sensitive',
  message: 'Too many requests for this resource, please try again after 1 hour',
});