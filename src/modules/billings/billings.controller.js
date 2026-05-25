// src/modules/billings/billings.controller.js
import { billingsService } from './billings.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { generateInvoicePdf } from './billings.pdf.js';

export class BillingsController {
  async getAll(req, res, next) {
    try {
      const { billings, pagination } = await billingsService.getAll(req.query);
      return ApiResponse.paginated(res, billings, pagination, 'Billings retrieved');
    } catch (err) { next(err); }
  }

  async getMyBillings(req, res, next) {
    try {
      const { billings, pagination } = await billingsService.getMyBillings(
        req.user.id,
        req.query
      );
      return ApiResponse.paginated(res, billings, pagination, 'My billings retrieved');
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const billing = await billingsService.getById(req.params.id);
      return ApiResponse.success(res, billing);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const billing = await billingsService.create(req.body);
      return ApiResponse.created(res, billing, 'Billing created successfully');
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const billing = await billingsService.update(req.params.id, req.body);
      return ApiResponse.success(res, billing, 'Billing updated successfully');
    } catch (err) { next(err); }
  }

  async updateMedicineFee(req, res, next) {
    try {
      const billing = await billingsService.updateMedicineFee(
        req.params.id,
        req.body.medicineFee
      );
      return ApiResponse.success(res, billing, 'Medicine fee updated successfully');
    } catch (err) { next(err); }
  }

  async addPayment(req, res, next) {
    try {
      const result = await billingsService.addPayment(
        req.params.id,
        req.body,
        req.user.id
      );
      return ApiResponse.created(res, result, 'Payment recorded successfully');
    } catch (err) { next(err); }
  }

  async getPayments(req, res, next) {
    try {
      const payments = await billingsService.getPayments(req.params.id);
      return ApiResponse.success(res, payments, 'Payments retrieved');
    } catch (err) { next(err); }
  }

  async requestVoid(req, res, next) {
    try {
      const result = await billingsService.requestVoid(
        req.params.id,
        req.params.paymentId,
        req.body.reason,
        req.user.id
      );
      return ApiResponse.created(res, result, 'Void request submitted successfully');
    } catch (err) { next(err); }
  }

  async reviewVoid(req, res, next) {
    try {
      const result = await billingsService.reviewVoid(
        req.params.id,
        req.params.paymentId,
        req.body,
        req.user.id
      );
      return ApiResponse.success(res, result, 'Void request reviewed successfully');
    } catch (err) { next(err); }
  }

  async getDailyReport(req, res, next) {
    try {
      const report = await billingsService.getDailyReport(req.query.date);
      return ApiResponse.success(res, report, 'Daily report retrieved');
    } catch (err) { next(err); }
  }

  async getMonthlyReport(req, res, next) {
    try {
      const report = await billingsService.getMonthlyReport(req.query.month);
      return ApiResponse.success(res, report, 'Monthly report retrieved');
    } catch (err) { next(err); }
  }

  async downloadPdf(req, res, next) {
    try {
      const billing = await billingsService.getById(req.params.id);
      const pdfBuffer = await generateInvoicePdf(billing);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${billing.invoiceNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  }
}

export const billingsController = new BillingsController();