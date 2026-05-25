// src/modules/billings/billings.pdf.js
import PDFDocument from 'pdfkit';

export const generateInvoicePdf = (billing) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const {
      invoiceNumber, consultFee, medicineFee,
      totalAmount, paidAmount, paymentStatus,
      isBpjs, bpjsNo, bpjsCoveredAmount,
      insuranceProvider, insuranceClaimNo, insuranceCovered,
      createdAt, appointment, payments,
    } = billing;

    const patient = appointment.patient;
    const doctor = appointment.doctor;

    // ── Header ────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').text('KLINIK MANAGEMENT SYSTEM', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Jl. Kesehatan No. 1, Indonesia', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Invoice Info ──────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    const infoLeft = 50;
    const infoRight = 300;

    doc.fontSize(10).font('Helvetica-Bold').text('No. Invoice:', infoLeft, doc.y, { continued: false });
    doc.font('Helvetica').text(invoiceNumber, infoRight, doc.y - doc.currentLineHeight());

    doc.font('Helvetica-Bold').text('Tanggal:', infoLeft);
    doc.font('Helvetica').text(
      new Date(createdAt).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
      infoRight, doc.y - doc.currentLineHeight()
    );

    doc.font('Helvetica-Bold').text('Status:', infoLeft);
    doc.font('Helvetica').text(paymentStatus, infoRight, doc.y - doc.currentLineHeight());

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Patient & Doctor Info ─────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Data Pasien');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nama         : ${patient.user.name}`);
    doc.text(`No. RM       : ${patient.medicalRecordNo}`);
    doc.text(`No. Telp     : ${patient.user.phone ?? '-'}`);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('Data Dokter');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nama         : Dr. ${doctor.user.name}`);
    doc.text(`Spesialisasi : ${doctor.specialization}`);
    doc.text(`Tgl Kunjungan: ${new Date(appointment.date).toLocaleDateString('id-ID')}`);

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Rincian Biaya ─────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Rincian Biaya');
    doc.moveDown(0.3);

    const col1 = 50;
    const col2 = 400;
    const col3 = 545;

    // Header tabel
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Keterangan', col1, doc.y);
    doc.text('Jumlah', col2, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Baris biaya
    doc.font('Helvetica');
    const formatRupiah = (val) =>
      `Rp ${Number(val).toLocaleString('id-ID')}`;

    doc.text('Biaya Konsultasi', col1, doc.y);
    doc.text(formatRupiah(consultFee), col2, doc.y - doc.currentLineHeight(), {
      width: 145, align: 'right',
    });
    doc.moveDown(0.3);

    doc.text('Biaya Obat', col1, doc.y);
    doc.text(formatRupiah(medicineFee), col2, doc.y - doc.currentLineHeight(), {
      width: 145, align: 'right',
    });
    doc.moveDown(0.3);

    // BPJS / Asuransi
    if (isBpjs && bpjsCoveredAmount) {
      doc.text(`Ditanggung BPJS (${bpjsNo})`, col1, doc.y);
      doc.text(`- ${formatRupiah(bpjsCoveredAmount)}`, col2, doc.y - doc.currentLineHeight(), {
        width: 145, align: 'right',
      });
      doc.moveDown(0.3);
    }

    if (insuranceProvider && insuranceCovered) {
      doc.text(`Ditanggung ${insuranceProvider} (${insuranceClaimNo})`, col1, doc.y);
      doc.text(`- ${formatRupiah(insuranceCovered)}`, col2, doc.y - doc.currentLineHeight(), {
        width: 145, align: 'right',
      });
      doc.moveDown(0.3);
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Total
    doc.font('Helvetica-Bold');
    doc.text('Total', col1, doc.y);
    doc.text(formatRupiah(totalAmount), col2, doc.y - doc.currentLineHeight(), {
      width: 145, align: 'right',
    });
    doc.moveDown(0.3);

    doc.text('Sudah Dibayar', col1, doc.y);
    doc.text(formatRupiah(paidAmount), col2, doc.y - doc.currentLineHeight(), {
      width: 145, align: 'right',
    });
    doc.moveDown(0.3);

    const remaining = Number(totalAmount) - Number(paidAmount);
    doc.text('Sisa Tagihan', col1, doc.y);
    doc.text(formatRupiah(remaining), col2, doc.y - doc.currentLineHeight(), {
      width: 145, align: 'right',
    });
    doc.moveDown(0.5);

    // ── Riwayat Pembayaran ────────────────────────────
    if (payments && payments.length > 0) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('Riwayat Pembayaran');
      doc.moveDown(0.3);

      for (const payment of payments) {
        doc.fontSize(10).font('Helvetica');
        doc.text(
          `${new Date(payment.createdAt).toLocaleDateString('id-ID')} — ${payment.method} — ${formatRupiah(payment.amount)}${payment.referenceNo ? ` — Ref: ${payment.referenceNo}` : ''}`,
          col1
        );
      }
      doc.moveDown(0.5);
    }

    // ── Footer ────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text(
      'Dokumen ini dicetak secara otomatis oleh sistem. Simpan sebagai bukti pembayaran.',
      { align: 'center' }
    );

    doc.end();
  });
};