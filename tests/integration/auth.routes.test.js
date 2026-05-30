// tests/integration/auth.routes.test.js
import request from 'supertest';
import app from '../helpers/testApp.js';
import { prisma } from '../../src/config/database.js';
import { redis } from '../../src/config/redis.js';
import { cleanDatabase } from '../helpers/db.js';
import {
  createUser,
  getAuthToken,
} from '../helpers/factories.js';

describe('Auth Routes', () => {

    // Di auth.routes.test.js — tambah beforeEach
beforeEach(async () => {
    await cleanDatabase();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

  // ── Register ─────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'NewUser123',
          phone: '081234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', 'newuser@example.com');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'invalid-email',
          password: 'NewUser123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 if email already registered', async () => {
      await createUser({ email: 'existing@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'NewUser123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already registered');
    });
  });

  // ── Login ─────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login successfully and return tokens', async () => {
      await createUser({
        email: 'login@example.com',
        password: 'LoginPass123',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'LoginPass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('email', 'login@example.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 for wrong password', async () => {
      await createUser({
        email: 'login2@example.com',
        password: await import('bcryptjs').then(b =>
          b.default.hash('CorrectPass123', 12)
        ),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login2@example.com',
          password: 'WrongPass123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'SomePass123',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 for deactivated account', async () => {
      await createUser({
        email: 'inactive@example.com',
        password: await import('bcryptjs').then(b =>
          b.default.hash('InactivePass123', 12)
        ),
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'InactivePass123',
        });

      expect(res.status).toBe(403);
    });
  });

  // ── Get Me ────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const user = await createUser({ email: 'me@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', 'me@example.com');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // ── Refresh Token ─────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      // Login dulu untuk dapat refresh token
      const user = await createUser({
        email: 'refresh@example.com',
        password: 'RefreshPass123',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'RefreshPass123',
        });

      const { refreshToken } = loginRes.body.data;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  // ── Logout ────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should logout successfully and blacklist token', async () => {
      const user = await createUser({
        email: 'logout@example.com',
        password: 'LogoutPass123',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'LogoutPass123',
        });

      const { accessToken } = loginRes.body.data;

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);

      // Token harus sudah di-blacklist
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(401);
    });
  });

  // ── RBAC ─────────────────────────────────────────────
  describe('RBAC Middleware', () => {
    it('should return 403 if role is insufficient', async () => {
      const pasien = await createUser({ role: 'PASIEN' });
      const token = getAuthToken(pasien);

      // PASIEN tidak bisa akses endpoint users
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow access with correct role', async () => {
      const superAdmin = await createUser({ role: 'SUPER_ADMIN' });
      const token = getAuthToken(superAdmin);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

});