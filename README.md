# 🏥 Klinik Management System

A production-grade clinic and pharmacy management REST API built with Node.js, Express, PostgreSQL, and Redis.

## Features

- **Authentication** — JWT Access/Refresh Token, Google OAuth2
- **Authorization** — Role-Based Access Control (RBAC)
- **Patient Management** — Registration, medical records, history
- **Doctor & Scheduling** — Doctor profiles, appointment queuing
- **Pharmacy** — Medicine inventory, stock tracking, prescription dispensing
- **Billing** — Invoice generation, multiple payment methods (Cash, Transfer, BPJS)
- **Rate Limiting** — Redis-backed per-route throttling
- **API Documentation** — Swagger / OpenAPI 3.0

## Roles

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full system access |
| `ADMIN_KLINIK` | Patient & appointment management |
| `DOKTER` | Medical records & prescriptions |
| `APOTEKER` | Medicine inventory & dispensing |
| `KASIR` | Billing & payment processing |
| `PASIEN` | Own records & appointment booking |

## Tech Stack

- **Runtime** — Node.js 24
- **Framework** — Express.js
- **Database** — PostgreSQL 16 + Prisma ORM
- **Cache** — Redis 7
- **Containerization** — Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop

### Installation

```bash
git clone https://github.com/yourusername/klinik-management-system.git
cd klinik-management-system
npm install
cp .env.example .env   # fill in your values
```

### Run with Docker

```bash
npm run docker:up
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### API Docs

Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Project Structure
src/
├── config/        # DB, Redis, Swagger, env validation
├── modules/       # Feature modules (auth, patients, medicines, ...)
├── middlewares/   # JWT, RBAC, rate limiter, error handler
└── utils/         # Response helpers, pagination, invoice generator

## License

MIT