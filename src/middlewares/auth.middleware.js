// src/middlewares/auth.middleware.js
import { verifyAccessToken } from '../utils/jwt.js';
import { redis } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Cek blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw ApiError.unauthorized('Token has been revoked');
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(err);
  }
};