// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

const app = express();

// Security & utilities
app.use(helmet());
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME });
});

// Routes — akan ditambahkan per phase
// app.use('/api/auth', authRoutes);

export default app;