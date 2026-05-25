// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import passport from './config/passport.js'; 
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import doctorsRoutes from './modules/doctors/doctors.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import medicinesRoutes from './modules/medicines/medicines.routes.js';
import prescriptionsRoutes from './modules/prescriptions/prescriptions.routes.js';
import billingsRoutes from './modules/billings/billings.routes.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { env } from './config/env.js';

const app = express();

// Security & utilities
app.use(helmet());
app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize()); 
// Rate limiting
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: env.APP_NAME });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/billings', billingsRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — harus paling bawah
app.use(errorHandler);

export default app;