// src/modules/doctors/doctors.controller.js
import { doctorsService } from './doctors.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class DoctorsController {
  async getAll(req, res, next) {
    try {
      const { doctors, pagination } = await doctorsService.getAll(req.query);
      return ApiResponse.paginated(res, doctors, pagination, 'Doctors retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const doctor = await doctorsService.getById(req.params.id);
      return ApiResponse.success(res, doctor);
    } catch (err) { next(err); }
  }

  async getMyProfile(req, res, next) {
    try {
      const doctor = await doctorsService.getByUserId(req.user.id);
      return ApiResponse.success(res, doctor);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const doctor = await doctorsService.create(req.body);
      return ApiResponse.created(res, doctor, 'Doctor profile created successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const doctor = await doctorsService.update(req.params.id, req.body);
      return ApiResponse.success(res, doctor, 'Doctor profile updated successfully');
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await doctorsService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Doctor profile deleted successfully');
    } catch (err) { next(err); }
  }

  async getAppointments(req, res, next) {
    try {
      const { appointments, pagination } = await doctorsService.getAppointments(
        req.params.id,
        req.query
      );
      return ApiResponse.paginated(res, appointments, pagination, 'Appointments retrieved');
    } catch (err) { next(err); }
  }
}

export const doctorsController = new DoctorsController();