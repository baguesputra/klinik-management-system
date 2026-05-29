// docs/swagger.js
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

const loadYaml = (filePath) => {
  return yaml.load(readFileSync(resolve(__dirname, filePath), 'utf8'));
};

// ── Load components ───────────────────────────────────
const schemas = loadYaml('./components/schemas.yaml');
const responses = loadYaml('./components/responses.yaml');

// ── Load paths ────────────────────────────────────────
const authPaths = loadYaml('./paths/auth.yaml');
const usersPaths = loadYaml('./paths/users.yaml');
const patientsPaths = loadYaml('./paths/patients.yaml');
const doctorsPaths = loadYaml('./paths/doctors.yaml');
const appointmentsPaths = loadYaml('./paths/appointments.yaml');
const medicinesPaths = loadYaml('./paths/medicines.yaml');
const prescriptionsPaths = loadYaml('./paths/prescriptions.yaml');
const billingsPaths = loadYaml('./paths/billings.yaml');

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Klinik Management System',
    version: '1.0.0',
    description: `
## Klinik Management System

A production-grade REST API for clinic and pharmacy management, covering the full patient journey from registration and doctor consultation to prescription dispensing and billing.

## Authentication

All private endpoints require a Bearer token in the request header:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Obtain your token from \`POST /api/auth/login\` or \`GET /api/auth/google\`.

## Roles & Permissions

| Role | Description |
|---|---|
| \`SUPER_ADMIN\` | Full system access |
| \`ADMIN_KLINIK\` | Patient registration, appointment management |
| \`DOKTER\` | Medical records, prescriptions |
| \`APOTEKER\` | Medicine inventory, dispensing |
| \`KASIR\` | Billing and payment processing |
| \`PASIEN\` | View own records and appointments |

## Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| POST /api/auth/login | 5 requests | 15 minutes |
| POST /api/auth/register | 3 requests | 1 hour |
| POST /api/auth/refresh | 10 requests | 15 minutes |
| PDF & Reports | 20 requests | 1 hour |
| All other endpoints | 100 requests | 15 minutes |

## Response Format

All endpoints return a consistent response format:
\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
\`\`\`

Paginated responses include an additional \`pagination\` field:
\`\`\`json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
\`\`\`
    `,
    contact: {
      name: 'Klinik Management System',
      email: 'admin@klinik.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    // ── ReDoc logo ──────────────────────────────────
    'x-logo': {
      url: '/logo.svg',
      altText: 'Klinik Management System',
      href: '/api-docs/redoc',
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
    {
      name: 'Auth',
      description: 'Authentication and authorization endpoints — register, login, OAuth2, token management',
    },
    {
      name: 'Users',
      description: 'User management — CRUD, role assignment, account activation',
    },
    {
      name: 'Patients',
      description: 'Patient profiles and medical records management',
    },
    {
      name: 'Doctors',
      description: 'Doctor profiles, specializations, and schedule management',
    },
    {
      name: 'Appointments',
      description: 'Appointment booking and queue management with auto queue numbering',
    },
    {
      name: 'Medicines',
      description: 'Medicine inventory, stock mutations, and expiry tracking',
    },
    {
      name: 'Prescriptions',
      description: 'Prescription creation, processing, and dispensing workflow',
    },
    {
      name: 'Billings',
      description: 'Invoice generation, payment processing, void requests, and financial reports',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your access token obtained from the login endpoint',
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