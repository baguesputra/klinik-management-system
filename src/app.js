// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import passport from './config/passport.js'; 
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { env } from './config/env.js';

const app = express();

// Security & utilities
app.use(helmet());
app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize()); 

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: env.APP_NAME });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — harus paling bawah
app.use(errorHandler);

export default app;