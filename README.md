# 🏥 Klinik Management System

![CI/CD](https://github.com/baguesputra/klinik-management-system/actions/workflows/ci.yml/badge.svg)
![Node.js](https://img.shields.io/badge/Node.js-24.x-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Coverage](https://img.shields.io/badge/coverage-50%25-yellow)

REST API untuk sistem manajemen klinik berbasis Node.js dengan fitur lengkap mulai dari manajemen pasien, dokter, antrian, resep, hingga billing dengan dukungan BPJS dan asuransi swasta.

**🌐 Live Demo:** https://klinik-management-system-production.up.railway.app

**📖 API Docs:** https://klinik-management-system-production.up.railway.app/api-docs

**📚 ReDoc:** https://klinik-management-system-production.up.railway.app/redoc

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache / Session | Redis 7 |
| Auth | JWT + Google OAuth2 |
| API Docs | Swagger UI + ReDoc |
| Testing | Jest |
| CI/CD | GitHub Actions |
| Deploy | Railway |

---

## Features

### Core Modules
- **Auth** — JWT access/refresh token, Google OAuth2, token blacklisting via Redis
- **RBAC** — 6 roles: Super Admin, Admin Klinik, Dokter, Apoteker, Kasir, Pasien
- **Pasien** — CRUD pasien, rekam medis, nomor rekam medis otomatis
- **Dokter** — profil dokter, jadwal praktik per hari, tarif konsultasi
- **Appointment** — booking antrian, nomor antrian otomatis, status state machine
- **Inventori Obat** — CRUD obat, tracking stok, mutasi stok (masuk/keluar/adjustment), notifikasi stok rendah, tracking expired
- **Resep** — siklus hidup resep lengkap, dispensing sebagian, state machine status
- **Billing** — invoice otomatis, dua tahap (konsultasi + obat), dukungan BPJS, asuransi swasta, multi metode pembayaran, void approval workflow

### Technical Features
- Rate limiting per endpoint berbasis Redis
- Dual API documentation (Swagger UI + ReDoc)
- PDF invoice generation via pdfkit
- Audit log untuk semua operasi kritikal
- Soft delete untuk appointment dan obat
- Database transaction untuk operasi kritikal
- CI/CD pipeline dengan GitHub Actions

---

## Roles & Permissions

| Role | Akses |
|---|---|
| `SUPER_ADMIN` | Full akses semua fitur |
| `ADMIN_KLINIK` | Manajemen user, laporan |
| `DOKTER` | Appointment, rekam medis, resep |
| `APOTEKER` | Inventori obat, dispensing resep |
| `KASIR` | Billing, pembayaran |
| `PASIEN` | Booking appointment, lihat billing sendiri |

---

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback
```

### Users
```
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Patients
```
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PATCH  /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/:id/medical-records
POST   /api/patients/:id/medical-records
```

### Doctors
```
GET    /api/doctors
POST   /api/doctors
GET    /api/doctors/:id
PATCH  /api/doctors/:id
DELETE /api/doctors/:id
```

### Appointments
```
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/:id
PATCH  /api/appointments/:id/status
DELETE /api/appointments/:id
```

### Medicines
```
GET    /api/medicines
POST   /api/medicines
GET    /api/medicines/:id
PATCH  /api/medicines/:id
DELETE /api/medicines/:id
POST   /api/medicines/:id/mutations
GET    /api/medicines/:id/mutations
```

### Prescriptions
```
GET    /api/prescriptions
POST   /api/prescriptions
GET    /api/prescriptions/:id
PATCH  /api/prescriptions/:id
PATCH  /api/prescriptions/:id/status
POST   /api/prescriptions/:id/dispense
```

### Billings
```
GET    /api/billings
POST   /api/billings
GET    /api/billings/:id
PATCH  /api/billings/:id/medicine-fee
POST   /api/billings/:id/payments
POST   /api/billings/:id/payments/:paymentId/void
PATCH  /api/billings/:id/payments/:paymentId/void
GET    /api/billings/:id/invoice
GET    /api/billings/report/daily
GET    /api/billings/report/monthly
GET    /api/billings/my
```

---

## Payment Methods

| Kategori | Metode |
|---|---|
| Tunai | TUNAI |
| Transfer Bank | BRI, BNI, BCA, MANDIRI, BSI |
| E-Wallet | QRIS, OVO, GOPAY, DANA, SHOPEEPAY |
| Asuransi | BPJS, ASURANSI_SWASTA |

---

## Project Structure

```
klinik-management-system/
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── env.js
│   │   └── passport.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── rbac.middleware.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── patients/
│   │   ├── doctors/
│   │   ├── appointments/
│   │   ├── medicines/
│   │   ├── prescriptions/
│   │   └── billings/
│   └── utils/
│       ├── ApiError.js
│       ├── ApiResponse.js
│       ├── jwt.js
│       └── pagination.js
├── docs/
│   ├── swagger.js
│   ├── components/
│   └── paths/
├── tests/
│   ├── helpers/
│   ├── unit/
│   └── integration/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── .github/
│   └── workflows/
│       └── ci.yml
├── Dockerfile
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

### Local Development

**1. Clone repository**
```bash
git clone https://github.com/baguesputra/klinik-management-system.git
cd klinik-management-system
```

**2. Install dependencies**
```bash
npm install
```

**3. Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=3000
APP_NAME=Klinik Management System
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/klinik_db

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_ACCESS_SECRET=your_access_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**4. Setup database**
```bash
npx prisma migrate deploy
npx prisma db seed
```

**5. Jalankan server**
```bash
npm run dev
```

Server berjalan di `http://localhost:3000`

### Docker

```bash
docker-compose up -d
```

---

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests dengan coverage
npm run test:coverage
```

### Test Credentials (setelah seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@klinik.com | SuperAdmin123 |
| Dokter | dr.budi@klinik.com | Dokter1234 |
| Apoteker | apoteker@klinik.com | Apoteker1234 |
| Kasir | kasir@klinik.com | Kasir1234 |
| Pasien | andi.wijaya@gmail.com | Pasien1234 |

---

## CI/CD Pipeline

```
Push ke main/develop
        ↓
GitHub Actions — Run Tests
  • Setup PostgreSQL 16 + Redis 7
  • npm ci
  • prisma migrate deploy
  • Jest tests + coverage
        ↓ (main only, tests pass)
Railway — Auto Deploy
  • Build Docker image
  • prisma migrate deploy
  • Start server
```

---

## Architecture Decisions

**Layered Architecture** — setiap modul menggunakan pola `routes → validator → controller → service` untuk separation of concerns yang jelas.

**Two-stage billing** — billing dibuat saat appointment selesai dengan tarif konsultasi, kemudian diupdate dengan biaya obat setelah dispensing resep. Ini mencerminkan alur kerja klinik yang sesungguhnya.

**Prescription state machine** — resep melewati status `MENUNGGU → DIPROSES → SELESAI/DIAMBIL_SEBAGIAN/TIDAK_DIAMBIL` dengan validasi transisi yang ketat, mencegah operasi yang tidak valid.

**Void approval workflow** — pembatalan pembayaran memerlukan persetujuan admin/super admin untuk menjaga integritas keuangan.

**Redis untuk rate limiting** — menggunakan Redis sebagai store untuk rate limiting memungkinkan konsistensi di multiple instance (production-ready untuk horizontal scaling).

---

## License

MIT