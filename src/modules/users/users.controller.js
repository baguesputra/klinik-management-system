// src/modules/users/users.controller.js
import { usersService } from './users.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class UsersController {
  async getAll(req, res, next) {
    try {
      const { users, pagination } = await usersService.getAll(req.query);
      return ApiResponse.paginated(res, users, pagination, 'Users retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const user = await usersService.getById(req.params.id);
      return ApiResponse.success(res, user);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const user = await usersService.create(req.body);
      return ApiResponse.created(res, user, 'User created successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const user = await usersService.update(req.params.id, req.body);
      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (err) { next(err); }
  }

  async changeRole(req, res, next) {
    try {
      const user = await usersService.changeRole(
        req.params.id,
        req.body.role,
        req.user.id
      );
      return ApiResponse.success(res, user, 'Role updated successfully');
    } catch (err) { next(err); }
  }

  async toggleActive(req, res, next) {
    try {
      const user = await usersService.toggleActive(req.params.id, req.user.id);
      const message = user.isActive ? 'User activated' : 'User deactivated';
      return ApiResponse.success(res, user, message);
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await usersService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'User deleted successfully');
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();