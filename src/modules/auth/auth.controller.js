// src/modules/auth/auth.controller.js
import { authService } from './auth.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      return ApiResponse.created(res, user, 'Registration successful');
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      return ApiResponse.success(res, tokens, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];
      await authService.logout(req.user.id, accessToken);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      return ApiResponse.success(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();