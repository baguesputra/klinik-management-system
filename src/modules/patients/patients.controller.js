// src/modules/patients/patients.controller.js
import { patientsService } from './patients.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class PatientsController {
  async getAll(req, res, next) {
    try {
      const { patients, pagination } = await patientsService.getAll(req.query);
      return ApiResponse.paginated(res, patients, pagination, 'Patients retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const patient = await patientsService.getById(req.params.id);
      return ApiResponse.success(res, patient);
    } catch (err) { next(err); }
  }

  async getMyProfile(req, res, next) {
    try {
      const patient = await patientsService.getByUserId(req.user.id);
      return ApiResponse.success(res, patient);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { patient, rawPassword } = await patientsService.create(req.body);
      return ApiResponse.created(res, {
        ...patient,
        // Kirim password sementara — hanya ditampilkan sekali
        temporaryPassword: rawPassword,
      }, 'Patient registered successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const patient = await patientsService.update(
        req.params.id,
        req.body,
        req.user.id,
        req.user.role
      );
      return ApiResponse.success(res, patient, 'Patient updated successfully');
    } catch (err) { next(err); }
  }

  async getMedicalRecords(req, res, next) {
    try {
      const records = await patientsService.getMedicalRecords(
        req.params.id,
        req.user.id,
        req.user.role
      );
      return ApiResponse.success(res, records, 'Medical records retrieved');
    } catch (err) { next(err); }
  }

  async getMedicalRecordById(req, res, next) {
    try {
      const record = await patientsService.getMedicalRecordById(
        req.params.id,
        req.params.recordId,
        req.user.id,
        req.user.role
      );
      return ApiResponse.success(res, record);
    } catch (err) { next(err); }
  }

  async createMedicalRecord(req, res, next) {
    try {
      const record = await patientsService.createMedicalRecord(
        req.params.id,
        req.body
      );
      return ApiResponse.created(res, record, 'Medical record created successfully');
    } catch (err) { next(err); }
  }
}

export const patientsController = new PatientsController();