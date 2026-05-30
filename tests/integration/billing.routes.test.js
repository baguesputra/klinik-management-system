// tests/integration/billing.routes.test.js
import request from 'supertest';
import app from '../helpers/testApp.js';
import { prisma } from '../../src/config/database.js';
import { cleanDatabase } from '../helpers/db.js';
import {
  createUser,
  createDoctor,
  createPatient,
  createAppointment,
  createBilling,
  getAuthHeader,
} from '../helpers/factories.js';

describe('Billing Routes', () => {

  let kasir, superAdmin, adminKlinik, pasien;
  let doctor, patient, appointment;

  beforeAll(async () => {
  // JANGAN manual cleanup di sini
  // setup.js sudah handle via beforeEach

  // Buat data yang dibutuhkan semua test di file ini
  kasir = await createUser({ role: 'KASIR' });
  superAdmin = await createUser({ role: 'SUPER_ADMIN' });

  const pasienUser = await createUser({
    role: 'PASIEN',
    email: 'pasien.billing@example.com',
  });
  patient = await createPatient({ userId: pasienUser.id });
  pasien = pasienUser;

  const dokterUser = await createUser({
    role: 'DOKTER',
    email: 'dokter.billing@example.com',
  });
  doctor = await createDoctor({ userId: dokterUser.id });

  appointment = await createAppointment({
    patientId: patient.id,
    doctorId: doctor.id,
    status: 'SELESAI',
  });
});

beforeEach(async () => {
  await cleanDatabase();

  // Buat data fresh
  kasir = await createUser({ role: 'KASIR' });
  superAdmin = await createUser({ role: 'SUPER_ADMIN' });

  const pasienUser = await createUser({
    role: 'PASIEN',
    email: `pasien.${Date.now()}@example.com`,
  });
  patient = await createPatient({ userId: pasienUser.id });
  pasien = pasienUser;

  const dokterUser = await createUser({
    role: 'DOKTER',
    email: `dokter.${Date.now()}@example.com`,
  });
  doctor = await createDoctor({ userId: dokterUser.id });

  appointment = await createAppointment({
    patientId: patient.id,
    doctorId: doctor.id,
    status: 'SELESAI',
  });
});

  // ── Create Billing ──────────────────────────────────
  describe('POST /api/billings', () => {
    it('should create billing successfully', async () => {
      const res = await request(app)
        .post('/api/billings')
        .set(getAuthHeader(kasir))
        .send({
          appointmentId: appointment.id,
          consultFee: 150000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('invoiceNumber');
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{8}-\d{3}$/);
      expect(res.body.data).toHaveProperty('paymentStatus', 'BELUM_BAYAR');
      expect(Number(res.body.data.consultFee)).toBe(150000);
      expect(Number(res.body.data.medicineFee)).toBe(0);
    });

    it('should return 400 if appointment is not SELESAI', async () => {
      const pendingAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'MENUNGGU',
      });

      const res = await request(app)
        .post('/api/billings')
        .set(getAuthHeader(kasir))
        .send({
          appointmentId: pendingAppointment.id,
          consultFee: 150000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('completed appointments');
    });

    it('should return 409 if billing already exists', async () => {
      // Buat appointment baru khusus test ini
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      await createBilling({ appointmentId: newAppointment.id });

      const res = await request(app)
        .post('/api/billings')
        .set(getAuthHeader(kasir))
        .send({
          appointmentId: newAppointment.id,
          consultFee: 150000,
        });

      expect(res.status).toBe(409);
    });

    it('should return 403 if accessed by PASIEN', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });

      const res = await request(app)
        .post('/api/billings')
        .set(getAuthHeader(pasien))
        .send({
          appointmentId: newAppointment.id,
          consultFee: 150000,
        });

      expect(res.status).toBe(403);
    });

    it('should create billing with BPJS', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });

      const res = await request(app)
        .post('/api/billings')
        .set(getAuthHeader(kasir))
        .send({
          appointmentId: newAppointment.id,
          consultFee: 0,
          isBpjs: true,
          bpjsNo: '0001234567890',
          bpjsCoveredAmount: 150000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('isBpjs', true);
      expect(res.body.data).toHaveProperty('bpjsNo', '0001234567890');
    });
  });

  // ── Get Billing ─────────────────────────────────────
  describe('GET /api/billings/:id', () => {
    it('should return billing detail', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({ appointmentId: newAppointment.id });

      const res = await request(app)
        .get(`/api/billings/${billing.id}`)
        .set(getAuthHeader(kasir));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('invoiceNumber');
      expect(res.body.data).toHaveProperty('appointment');
      expect(res.body.data).toHaveProperty('payments');
    });

    it('should return 404 for non-existent billing', async () => {
      const res = await request(app)
        .get('/api/billings/00000000-0000-0000-0000-000000000000')
        .set(getAuthHeader(kasir));

      expect(res.status).toBe(404);
    });
  });

  // ── Update Medicine Fee ──────────────────────────────
  describe('PATCH /api/billings/:id/medicine-fee', () => {
    it('should update medicine fee and recalculate total', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        consultFee: 150000,
        totalAmount: 150000,
      });

      const res = await request(app)
        .patch(`/api/billings/${billing.id}/medicine-fee`)
        .set(getAuthHeader(kasir))
        .send({ medicineFee: 75000 });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.medicineFee)).toBe(75000);
      expect(Number(res.body.data.totalAmount)).toBe(225000);
    });

    it('should return 400 if billing is already LUNAS', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        paymentStatus: 'LUNAS',
        paidAmount: 150000,
      });

      const res = await request(app)
        .patch(`/api/billings/${billing.id}/medicine-fee`)
        .set(getAuthHeader(kasir))
        .send({ medicineFee: 75000 });

      expect(res.status).toBe(400);
    });
  });

  // ── Add Payment ──────────────────────────────────────
  describe('POST /api/billings/:id/payments', () => {
    it('should record cash payment successfully', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        consultFee: 150000,
        totalAmount: 150000,
      });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({
          amount: 150000,
          amountPaid: 200000,
          method: 'TUNAI',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('billingStatus', 'LUNAS');
      expect(res.body.data).toHaveProperty('remainingAmount', 0);
      expect(Number(res.body.data.payment.change)).toBe(50000);
    });

    it('should record partial payment and return SEBAGIAN status', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        consultFee: 150000,
        totalAmount: 150000,
      });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({
          amount: 75000,
          amountPaid: 75000,
          method: 'TUNAI',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('billingStatus', 'SEBAGIAN');
      expect(res.body.data).toHaveProperty('remainingAmount', 75000);
    });

    it('should require referenceNo for non-cash payment', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({
          amount: 150000,
          amountPaid: 150000,
          method: 'QRIS',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if payment exceeds remaining balance', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({
          amount: 999999,
          amountPaid: 999999,
          method: 'TUNAI',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('remaining balance');
    });

    it('should return 400 if billing is already LUNAS', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
        paidAmount: 150000,
        paymentStatus: 'LUNAS',
      });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({
          amount: 50000,
          amountPaid: 50000,
          method: 'TUNAI',
        });

      expect(res.status).toBe(400);
    });
  });

  // ── Void Request ─────────────────────────────────────
  describe('POST /api/billings/:id/payments/:paymentId/void', () => {
    it('should submit void request successfully', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const paymentRes = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({ amount: 150000, amountPaid: 150000, method: 'TUNAI' });

      const paymentId = paymentRes.body.data.payment.id;

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(kasir))
        .send({ reason: 'Salah input metode pembayaran, seharusnya QRIS' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('status', 'PENDING');
    });

    it('should return 403 if not the kasir who created payment', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const paymentRes = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({ amount: 150000, amountPaid: 150000, method: 'TUNAI' });

      const paymentId = paymentRes.body.data.payment.id;
      const otherKasir = await createUser({ role: 'KASIR' });

      const res = await request(app)
        .post(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(otherKasir))
        .send({ reason: 'Coba void payment orang lain' });

      expect(res.status).toBe(403);
    });
  });

  // ── Review Void ──────────────────────────────────────
  describe('PATCH /api/billings/:id/payments/:paymentId/void', () => {
    it('should approve void request and rollback paidAmount', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const paymentRes = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({ amount: 150000, amountPaid: 150000, method: 'TUNAI' });

      const paymentId = paymentRes.body.data.payment.id;

      await request(app)
        .post(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(kasir))
        .send({ reason: 'Salah input metode pembayaran' });

      const res = await request(app)
        .patch(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(superAdmin))
        .send({ status: 'APPROVED', reviewNotes: 'Dikonfirmasi oleh admin' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('status', 'APPROVED');

      const billingRes = await request(app)
        .get(`/api/billings/${billing.id}`)
        .set(getAuthHeader(superAdmin));

      expect(Number(billingRes.body.data.paidAmount)).toBe(0);
      expect(billingRes.body.data.paymentStatus).toBe('BELUM_BAYAR');
    });

    it('should reject void request without rolling back payment', async () => {
      const newAppointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'SELESAI',
      });
      const billing = await createBilling({
        appointmentId: newAppointment.id,
        totalAmount: 150000,
      });

      const paymentRes = await request(app)
        .post(`/api/billings/${billing.id}/payments`)
        .set(getAuthHeader(kasir))
        .send({ amount: 150000, amountPaid: 150000, method: 'TUNAI' });

      const paymentId = paymentRes.body.data.payment.id;

      await request(app)
        .post(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(kasir))
        .send({ reason: 'Test rejection' });

      const res = await request(app)
        .patch(`/api/billings/${billing.id}/payments/${paymentId}/void`)
        .set(getAuthHeader(superAdmin))
        .send({ status: 'REJECTED', reviewNotes: 'Tidak valid, payment sudah benar' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('status', 'REJECTED');

      const billingRes = await request(app)
        .get(`/api/billings/${billing.id}`)
        .set(getAuthHeader(superAdmin));

      expect(Number(billingRes.body.data.paidAmount)).toBe(150000);
    });
  });

  // ── Daily Report ─────────────────────────────────────
  describe('GET /api/billings/report/daily', () => {
    it('should return daily report', async () => {
      const res = await request(app)
        .get('/api/billings/report/daily')
        .set(getAuthHeader(kasir));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalTransactions');
      expect(res.body.data).toHaveProperty('totalIncome');
      expect(res.body.data).toHaveProperty('byPaymentMethod');
      expect(res.body.data).toHaveProperty('byStatus');
    });

    it('should return 403 if accessed by PASIEN', async () => {
      const res = await request(app)
        .get('/api/billings/report/daily')
        .set(getAuthHeader(pasien));

      expect(res.status).toBe(403);
    });
  });

  // ── Monthly Report ───────────────────────────────────
  describe('GET /api/billings/report/monthly', () => {
    it('should return monthly report with byDay aggregation', async () => {
      const res = await request(app)
        .get('/api/billings/report/monthly')
        .query({ month: new Date().toISOString().slice(0, 7) })
        .set(getAuthHeader(kasir));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('month');
      expect(res.body.data).toHaveProperty('totalTransactions');
      expect(res.body.data).toHaveProperty('byDay');
      expect(res.body.data).toHaveProperty('byPaymentMethod');
    });
  });

  // ── My Billings (PASIEN) ─────────────────────────────
  describe('GET /api/billings/my', () => {
    it('should return own billings for PASIEN', async () => {
      const res = await request(app)
        .get('/api/billings/my')
        .set(getAuthHeader(pasien));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 403 if accessed by KASIR', async () => {
      const res = await request(app)
        .get('/api/billings/my')
        .set(getAuthHeader(kasir));

      expect(res.status).toBe(403);
    });
  });

});