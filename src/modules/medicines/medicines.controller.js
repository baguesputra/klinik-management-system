// src/modules/medicines/medicines.controller.js
import { medicinesService } from './medicines.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class MedicinesController {
  async getAll(req, res, next) {
    try {
      const { medicines, pagination } = await medicinesService.getAll(req.query);
      return ApiResponse.paginated(res, medicines, pagination, 'Medicines retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const medicine = await medicinesService.getById(req.params.id);
      return ApiResponse.success(res, medicine);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const medicine = await medicinesService.create(req.body);
      return ApiResponse.created(res, medicine, 'Medicine created successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const medicine = await medicinesService.update(req.params.id, req.body);
      return ApiResponse.success(res, medicine, 'Medicine updated successfully');
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await medicinesService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Medicine deactivated successfully');
    } catch (err) { next(err); }
  }

  async addStockMutation(req, res, next) {
    try {
      const result = await medicinesService.addStockMutation(req.params.id, req.body);
      return ApiResponse.created(res, result, 'Stock mutation recorded successfully');
    } catch (err) { next(err); }
  }

  async getStockMutations(req, res, next) {
    try {
      const { mutations, pagination } = await medicinesService.getStockMutations(
        req.params.id,
        req.query
      );
      return ApiResponse.paginated(res, mutations, pagination, 'Stock mutations retrieved');
    } catch (err) { next(err); }
  }
}

export const medicinesController = new MedicinesController();