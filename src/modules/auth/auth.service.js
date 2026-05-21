// src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';

const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const BLACKLIST_PREFIX = 'blacklist:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class AuthService {
  // ── Register ──────────────────────────────────────────
  async register(data) {
    const { name, email, password, phone } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  // ── Login ─────────────────────────────────────────────
  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Simpan refresh token di Redis
    await redis.setex(
      `${REFRESH_TOKEN_PREFIX}${user.id}`,
      REFRESH_TOKEN_TTL,
      refreshToken
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  // ── Refresh Token ─────────────────────────────────────
  async refreshToken(token) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Cek token di Redis — harus cocok
    const storedToken = await redis.get(`${REFRESH_TOKEN_PREFIX}${payload.sub}`);
    if (!storedToken || storedToken !== token) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    // Token rotation — generate keduanya yang baru
    const newPayload = { sub: user.id, role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await redis.setex(
      `${REFRESH_TOKEN_PREFIX}${user.id}`,
      REFRESH_TOKEN_TTL,
      newRefreshToken
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── Logout ────────────────────────────────────────────
  async logout(userId, accessToken) {
    // Hapus refresh token dari Redis
    await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}`);

    // Blacklist access token sampai expired
    const decoded = verifyAccessToken(accessToken);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setex(`${BLACKLIST_PREFIX}${accessToken}`, ttl, '1');
    }
  }

  // ── Get Me ────────────────────────────────────────────
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

async handleOAuthLogin(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

    // Simpan refresh token di Redis
    await redis.setex(
        `${REFRESH_TOKEN_PREFIX}${user.id}`,
        REFRESH_TOKEN_TTL,
        refreshToken
    );

    return { accessToken, refreshToken };
    }
}

export const authService = new AuthService();