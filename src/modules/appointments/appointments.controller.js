// src/modules/appointments/appointments.controller.js
import { appointmentsService } from './appointments.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class AppointmentsController {
  async getAll(req, res, next) {
    try {
      const { appointments, pagination } = await appointmentsService.getAll(req.query);
      return ApiResponse.paginated(res, appointments, pagination, 'Appointments retrieved');
    } catch (err) { next(err); }
  }

  async getMyAppointments(req, res, next) {
    try {
      const { appointments, pagination } = await appointmentsService.getMyAppointments(
        req.user.id,
        req.query
      );
      return ApiResponse.paginated(res, appointments, pagination, 'My appointments retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const appointment = await appointmentsService.getById(req.params.id);
      return ApiResponse.success(res, appointment);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const appointment = await appointmentsService.create(req.body);
      return ApiResponse.created(res, appointment, 'Appointment created successfully');
    } catch (err) { next(err); }
  }

  async updateStatus(req, res, next) {
    try {
      const appointment = await appointmentsService.updateStatus(
        req.params.id,
        req.body,
        req.user.id,
        req.user.role
      );
      return ApiResponse.success(res, appointment, 'Appointment status updated');
    } catch (err) { next(err); }
  }

  async cancel(req, res, next) {
    try {
      const appointment = await appointmentsService.cancel(
        req.params.id,
        req.user.id,
        req.user.role
      );
      return ApiResponse.success(res, appointment, 'Appointment cancelled successfully');
    } catch (err) { next(err); }
  }
}

export const appointmentsController = new AppointmentsController();