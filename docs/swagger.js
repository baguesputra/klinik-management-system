// docs/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load YAML helper ──────────────────────────────────
const loadYaml = (filePath) => {
  return yaml.load(readFileSync(resolve(__dirname, filePath), 'utf8'));
};

// ── Load semua components ─────────────────────────────
const schemas = loadYaml('./components/schemas.yaml');
const responses = loadYaml('./components/responses.yaml');

// ── Load semua paths ──────────────────────────────────
const authPaths = loadYaml('./paths/auth.yaml');
const usersPaths = loadYaml('./paths/users.yaml');
const patientsPaths = loadYaml('./paths/patients.yaml');
const doctorsPaths = loadYaml('./paths/doctors.yaml');
const appointmentsPaths = loadYaml('./paths/appointments.yaml');
const medicinesPaths = loadYaml('./paths/medicines.yaml');
const prescriptionsPaths = loadYaml('./paths/prescriptions.yaml');
const billingsPaths = loadYaml('./paths/billings.yaml');

// ── Swagger definition ────────────────────────────────
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Klinik Management System API',
    version: '1.0.0',
    description: `
## Klinik Management System

REST API untuk manajemen klinik dan apotek yang mencakup:
- Autentikasi JWT & Google OAuth2
- Manajemen pengguna dengan RBAC 6 role
- Pendaftaran pasien & rekam medis
- Jadwal dokter & antrian appointment
- Inventaris obat & mutasi stok
- Resep & dispensing
- Billing, pembayaran & laporan keuangan

## Autentikasi

Semua endpoint private membutuhkan Bearer token di header:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Token didapat dari endpoint \`POST /api/auth/login\` atau \`GET /api/auth/google\`.

## Rate Limiting

| Endpoint | Limit |
|---|---|
| POST /api/auth/login | 5x per 15 menit |
| POST /api/auth/register | 3x per jam |
| POST /api/auth/refresh | 10x per 15 menit |
| Semua endpoint | 100x per 15 menit |
| PDF & Laporan | 20x per jam |
    `,
    contact: {
      name: 'Klinik Management System',
      email: 'admin@klinik.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://klinik-api.railway.app',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autentikasi & otorisasi' },
    { name: 'Users', description: 'Manajemen pengguna' },
    { name: 'Patients', description: 'Manajemen pasien & rekam medis' },
    { name: 'Doctors', description: 'Profil dokter & jadwal' },
    { name: 'Appointments', description: 'Appointment & antrian' },
    { name: 'Medicines', description: 'Inventaris obat & mutasi stok' },
    { name: 'Prescriptions', description: 'Resep & dispensing' },
    { name: 'Billings', description: 'Billing, pembayaran & laporan keuangan' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan access token dari login',
      },
    },
    schemas: schemas.components.schemas,
    responses: responses.components.responses,
  },
  paths: {
    ...authPaths.paths,
    ...usersPaths.paths,
    ...patientsPaths.paths,
    ...doctorsPaths.paths,
    ...appointmentsPaths.paths,
    ...medicinesPaths.paths,
    ...prescriptionsPaths.paths,
    ...billingsPaths.paths,
  },
  security: [{ bearerAuth: [] }],
};