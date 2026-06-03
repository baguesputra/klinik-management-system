# 🏥 Klinik Management System

![CI/CD](https://github.com/baguesputra/klinik-management-system/actions/workflows/ci.yml/badge.svg)
![Node.js](https://img.shields.io/badge/Node.js-24.x-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Coverage](https://img.shields.io/badge/coverage-50%25-yellow)

A production-grade clinic and pharmacy management REST API built with Node.js, Express, PostgreSQL, and Redis.

![Node.js](https://img.shields.io/badge/Node.js-24.x-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Roles & Permissions](#roles--permissions)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Development Progress](#development-progress)
- [License](#license)

---

## Overview

Klinik Management System is a RESTful API designed for small clinics and pharmacies in Indonesia. It covers the full patient journey — from registration and doctor consultation to prescription dispensing and billing — in a single integrated system.

---

## Features

- **Authentication** — JWT Access/Refresh Token, Google OAuth2, token rotation & blacklisting via Redis
- **Authorization** — Role-Based Access Control (RBAC) with 6 distinct roles
- **User Management** — Full CRUD, role assignment, account activation by Super Admin
- **Patient Management** — Registration, medical records, history *(coming soon)*
- **Doctor & Scheduling** — Doctor profiles, appointment queuing *(coming soon)*
- **Pharmacy** — Medicine inventory, stock tracking, prescription dispensing *(coming soon)*
- **Billing** — Invoice generation, multiple payment methods *(coming soon)*
- **Rate Limiting** — Redis-backed per-route throttling *(coming soon)*
- **API Documentation** — Swagger / OpenAPI 3.0 *(coming soon)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 LTS |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache / Session | Redis 7 |
| Validation | Zod |
| Authentication | JWT + Passport.js |
| OAuth2 | Google OAuth2 via Passport |
| Containerization | Docker & Docker Compose |
| Testing | Jest + Supertest *(coming soon)* |
| API Docs | Swagger / OpenAPI 3.0 *(coming soon)* |

---

## Roles & Permissions

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full system access — user management, role assignment |
| `ADMIN_KLINIK` | Patient registration, appointment management |
| `DOKTER` | View patients, input medical records, write prescriptions |
| `APOTEKER` | Medicine inventory, stock mutations, prescription dispensing |
| `KASIR` | Billing, invoice generation, payment processing |
| `PASIEN` | View own records, book appointments |

---

## Project Structure

```
klinik-management-system/
├── prisma/
│   ├── schema.prisma         # Full database schema
│   └── seed.js               # Database seeder
├── src/
│   ├── config/
│   │   ├── database.js       # Prisma client
│   │   ├── redis.js          # Redis client
│   │   ├── passport.js       # Google OAuth2 strategy
│   │   └── env.js            # Environment validation (Zod)
│   ├── modules/
│   │   ├── auth/             # Register, login, OAuth2, refresh, logout
│   │   ├── users/            # User CRUD, role management
│   │   ├── patients/         # Patient profiles & medical records
│   │   ├── doctors/          # Doctor profiles & schedules
│   │   ├── appointments/     # Queue & appointment management
│   │   ├── medicines/        # Inventory & stock tracking
│   │   ├── prescriptions/    # Prescriptions & dispensing
│   │   ├── billing/          # Invoices & payments
│   │   └── reports/          # Reporting & analytics
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT verification + blacklist check
│   │   ├── rbac.middleware.js    # Role-based access control
│   │   ├── errorHandler.js       # Global error handler
│   │   └── rateLimiter.js        # Redis rate limiting
│   └── utils/
│       ├── ApiResponse.js        # Standardized response format
│       ├── ApiError.js           # Custom error classes
│       ├── jwt.js                # Token generate & verify
│       └── pagination.js         # Pagination helpers
├── tests/                        # Jest test suites
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── server.js
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/klinik-management-system.git
cd klinik-management-system

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env
```

### Run with Docker

```bash
# Start PostgreSQL and Redis containers
npm run docker:up

# Run database migration
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run start` | Start production server |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:logs` | Stream container logs |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run test suites |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# App
NODE_ENV=development
PORT=3000
APP_NAME=Klinik Management System
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/klinik_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new account |
| POST | `/api/auth/login` | Public | Login with email & password |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Private | Logout & revoke tokens |
| GET | `/api/auth/me` | Private | Get current user profile |
| GET | `/api/auth/google` | Public | Initiate Google OAuth2 |
| GET | `/api/auth/google/callback` | Public | Google OAuth2 callback |

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | SUPER_ADMIN, ADMIN_KLINIK | List all users |
| GET | `/api/users/:id` | SUPER_ADMIN, ADMIN_KLINIK | Get user detail |
| POST | `/api/users` | SUPER_ADMIN | Create new user |
| PATCH | `/api/users/:id` | SUPER_ADMIN | Update user profile |
| PATCH | `/api/users/:id/role` | SUPER_ADMIN | Change user role |
| PATCH | `/api/users/:id/toggle-active` | SUPER_ADMIN | Activate / deactivate user |
| DELETE | `/api/users/:id` | SUPER_ADMIN | Delete user |

### Patients *(Phase 5 — coming soon)*
### Doctors & Appointments *(Phase 6 — coming soon)*
### Medicines *(Phase 7 — coming soon)*
### Prescriptions *(Phase 8 — coming soon)*
### Billing *(Phase 9 — coming soon)*

---

## Database Schema

```
users ──────────────── roles (enum)
  │
  ├── doctors ─────────────── appointments ──── patients
  │                                │
  ├── patients                     │
  │     └── medical_records ───────┘
  │               └── prescriptions ──── prescription_items ──── medicines
  │                                                                   │
  └── (all roles)                                          stock_mutations

appointments ──── billings ──── payments
```

### Seed Credentials

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | superadmin@klinik.com | SuperAdmin123 |
| ADMIN_KLINIK | admin@klinik.com | Admin1234 |
| DOKTER | dokter@klinik.com | Dokter1234 |
| APOTEKER | apoteker@klinik.com | Apoteker1234 |
| KASIR | kasir@klinik.com | Kasir1234 |
| PASIEN | pasien@klinik.com | Pasien1234 |

> ⚠️ Change all credentials before deploying to production.

---

## Development Progress

| Phase | Feature | Status |
|---|---|---|
| Phase 1 | Project setup, Docker, Prisma, env config | ✅ Done |
| Phase 2 | JWT Auth — Register, Login, Refresh, Logout | ✅ Done |
| Phase 3 | Google OAuth2 | ✅ Done |
| Phase 4 | RBAC + User Management + Seed Data | ✅ Done |
| Phase 5 | Patient Management & Medical Records | ✅ Done |
| Phase 6 | Doctor Profiles, Appointments & Queue | ⏳ Pending |
| Phase 7 | Medicine Inventory & Stock | ⏳ Pending |
| Phase 8 | Prescriptions & Dispensing | ⏳ Pending |
| Phase 9 | Billing & Invoice | ⏳ Pending |
| Phase 10 | Rate Limiting, Swagger Docs, Testing, Deploy | ⏳ Pending |

---

## License

MIT © 2025 — Built with ❤️ for local clinics in Indonesia