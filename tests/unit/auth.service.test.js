// tests/unit/auth.service.test.js
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

// ── Mock dependencies ─────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redis: mockRedis,
}));

// ── Import setelah mock ───────────────────────────────
const { AuthService } = await import('../../src/modules/auth/auth.service.js');
const { ApiError } = await import('../../src/utils/ApiError.js');

const authService = new AuthService();

// ── Helpers ───────────────────────────────────────────
let mockUser;

beforeAll(async () => {
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.default.hash('TestPass123', 12);

  mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@example.com',
    password: hashedPassword,
    role: 'PASIEN',
    isActive: true,
    isVerified: true,
    avatarUrl: null,
    phone: null,
    googleId: null,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

// ── Tests ─────────────────────────────────────────────

describe('AuthService', () => {

    beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('TestPass123', 12);
    mockUser = {
      id: 'user-uuid-123',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'PASIEN',
      isActive: true,
      isVerified: true,
      avatarUrl: null,
      phone: null,
      googleId: null,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Register ────────────────────────────────────────
  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: mockUser.id,
        name: 'Test User',
        email: 'test@example.com',
        role: 'PASIEN',
        createdAt: new Date(),
      });

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).not.toHaveProperty('password');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw conflict error if email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPass123',
        })
      ).rejects.toThrow('Email already registered');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ── Login ────────────────────────────────────────────
  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await authService.login('test@example.com', 'TestPass123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).not.toHaveProperty('password');
      expect(mockRedis.setex).toHaveBeenCalledTimes(1);
    });

    it('should throw unauthorized if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('notfound@example.com', 'TestPass123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw unauthorized if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login('test@example.com', 'WrongPassword123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw forbidden if user is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login('test@example.com', 'TestPass123')
      ).rejects.toThrow('Account is deactivated');
    });

    it('should throw unauthorized if user has no password (OAuth user)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(
        authService.login('test@example.com', 'TestPass123')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  // ── Refresh Token ────────────────────────────────────
  describe('refreshToken', () => {
    it('should return new tokens with valid refresh token', async () => {
      const { generateRefreshToken } = await import('../../src/utils/jwt.js');
      const validToken = generateRefreshToken({ sub: mockUser.id, role: mockUser.role });

      mockRedis.get.mockResolvedValue(validToken);
      mockRedis.setex.mockResolvedValue('OK');
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.refreshToken(validToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.accessToken).toBe('string');// token rotation
    });

    it('should throw unauthorized if refresh token is invalid', async () => {
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw unauthorized if token not in Redis', async () => {
      const { generateRefreshToken } = await import('../../src/utils/jwt.js');
      const validToken = generateRefreshToken({ sub: mockUser.id, role: mockUser.role });

      mockRedis.get.mockResolvedValue(null); // tidak ada di Redis

      await expect(
        authService.refreshToken(validToken)
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw unauthorized if token does not match Redis', async () => {
      const { generateRefreshToken } = await import('../../src/utils/jwt.js');
      const validToken = generateRefreshToken({ sub: mockUser.id, role: mockUser.role });

      mockRedis.get.mockResolvedValue('different-token'); // token berbeda

      await expect(
        authService.refreshToken(validToken)
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw unauthorized if user is deactivated', async () => {
      const { generateRefreshToken } = await import('../../src/utils/jwt.js');
      const validToken = generateRefreshToken({ sub: mockUser.id, role: mockUser.role });

      mockRedis.get.mockResolvedValue(validToken);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.refreshToken(validToken)
      ).rejects.toThrow('User not found or deactivated');
    });
  });

  // ── Logout ───────────────────────────────────────────
  describe('logout', () => {
    it('should logout successfully and blacklist token', async () => {
      const { generateAccessToken } = await import('../../src/utils/jwt.js');
      const accessToken = generateAccessToken({
        sub: mockUser.id,
        role: mockUser.role,
      });

      mockRedis.del.mockResolvedValue(1);
      mockRedis.setex.mockResolvedValue('OK');

      await authService.logout(mockUser.id, accessToken);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `refresh_token:${mockUser.id}`
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.any(Number),
        '1'
      );
    });
  });

  // ── Get Me ───────────────────────────────────────────
  describe('getMe', () => {
    it('should return user profile successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone: null,
        role: mockUser.role,
        avatarUrl: null,
        isVerified: true,
        createdAt: new Date(),
      });

      const result = await authService.getMe(mockUser.id);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw not found if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.getMe('nonexistent-id')
      ).rejects.toThrow('User not found');
    });
  });

});