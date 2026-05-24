// src/modules/prescriptions/prescriptions.controller.js
import { prescriptionsService } from './prescriptions.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class PrescriptionsController {
  async getAll(req, res, next) {
    try {
      const { prescriptions, pagination } = await prescriptionsService.getAll(req.query);
      return ApiResponse.paginated(res, prescriptions, pagination, 'Prescriptions retrieved');
    } catch (err) { next(err); }
  }

  async getMyPrescriptions(req, res, next) {
    try {
      const { prescriptions, pagination } = await prescriptionsService.getMyPrescriptions(
        req.user.id,
        req.query
      );
      return ApiResponse.paginated(res, prescriptions, pagination, 'My prescriptions retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const prescription = await prescriptionsService.getById(req.params.id);
      return ApiResponse.success(res, prescription);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const prescription = await prescriptionsService.create(req.body, req.user.id);
      return ApiResponse.created(res, prescription, 'Prescription created successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const prescription = await prescriptionsService.update(
        req.params.id,
        req.body,
        req.user.id
      );
      return ApiResponse.success(res, prescription, 'Prescription updated successfully');
    } catch (err) { next(err); }
  }

  async process(req, res, next) {
    try {
      const prescription = await prescriptionsService.process(req.params.id);
      return ApiResponse.success(res, prescription, 'Prescription is now being processed');
    } catch (err) { next(err); }
  }

  async revert(req, res, next) {
    try {
      const prescription = await prescriptionsService.revert(req.params.id);
      return ApiResponse.success(res, prescription, 'Prescription reverted to MENUNGGU');
    } catch (err) { next(err); }
  }

  async dispense(req, res, next) {
    try {
      const prescription = await prescriptionsService.dispense(req.params.id);
      return ApiResponse.success(res, prescription, 'Prescription dispensed successfully');
    } catch (err) { next(err); }
  }

  async cancel(req, res, next) {
    try {
      await prescriptionsService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Prescription cancelled successfully');
    } catch (err) { next(err); }
  }
}

export const prescriptionsController = new PrescriptionsController();