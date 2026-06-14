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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.js';
import redoc from 'redoc-express';

const app = express();
// Trust proxy — wajib untuk Railway/Render/platform lain di balik reverse proxy
app.set('trust proxy', 1);
// Security & utilities
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://unpkg.com",
      ],
      connectSrc: [
        "'self'",
        "https://unpkg.com",
      ],
      workerSrc: [
        "'self'",
        "blob:",
      ],
    },
  },
}));
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

// Docs navigation
app.get('/docs', (req, res) => {
  res.json({
    swagger_ui: `${env.APP_URL}/api-docs`,
    redoc: `${env.APP_URL}/redoc`,
    spec_json: `${env.APP_URL}/api-docs/swagger.json`,
  });
});

// ── Static files (logo, favicon) ─────────────────────
app.use(express.static('public'));

// ── Expose swagger spec as JSON untuk ReDoc ───────────
app.get('/api-docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});


// ── Swagger UI — untuk try out ────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Klinik API — Swagger UI',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #334155; font-family: system-ui }
    .swagger-ui .btn.authorize {
      background: #334155;
      border-color: #334155;
      color: white;
    }
    .swagger-ui .btn.authorize:hover { background: #1e293b }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #334155 }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #0891b2 }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #64748b }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #475569 }
    .swagger-ui .opblock.opblock-post { border-color: #334155 }
    .swagger-ui .opblock.opblock-get { border-color: #0891b2 }
    body { background: #f8fafc }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true,
  },
}));

// ── ReDoc — untuk dokumentasi yang dibaca ────────────
app.get('/redoc', redoc({
  title: 'Klinik Management System — API Docs',
  specUrl: '/api-docs/swagger.json',
  nonce: '',
  redocOptions: {
    theme: {
      colors: {
        primary: {
          main: '#334155',
        },
        text: {
          primary: '#1e293b',
          secondary: '#64748b',
        },
        border: {
          dark: '#cbd5e1',
          light: '#f1f5f9',
        },
        responses: {
          success: {
            color: '#16a34a',
            backgroundColor: '#f0fdf4',
          },
          error: {
            color: '#dc2626',
            backgroundColor: '#fef2f2',
          },
          redirect: {
            color: '#0891b2',
            backgroundColor: '#ecfeff',
          },
          info: {
            color: '#334155',
            backgroundColor: '#f8fafc',
          },
        },
        http: {
          get: '#0891b2',
          post: '#334155',
          put: '#64748b',
          patch: '#475569',
          delete: '#94a3b8',
        },
      },
      typography: {
        fontSize: '15px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        headings: {
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: '600',
        },
        code: {
          fontSize: '13px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          backgroundColor: '#f1f5f9',
          color: '#334155',
        },
      },
      sidebar: {
        width: '280px',
        backgroundColor: '#f8fafc',
        textColor: '#334155',
      },
      rightPanel: {
        backgroundColor: '#1e293b',
        textColor: '#e2e8f0',
      },
      logo: {
        gutter: '24px',
      },
    },
    hideDownloadButton: false,
    disableSearch: false,
    expandResponses: '200,201',
    sortPropsAlphabetically: false,
    showExtensions: false,
    nativeScrollbars: false,
    pathInMiddlePanel: false,
  },
}));

// Backward compatibility redirect
app.use('/api/auth', (req, res) => res.redirect(301, `/api/v1/auth${req.path}`));
app.use('/api/users', (req, res) => res.redirect(301, `/api/v1/users${req.path}`));
app.use('/api/patients', (req, res) => res.redirect(301, `/api/v1/patients${req.path}`));
app.use('/api/doctors', (req, res) => res.redirect(301, `/api/v1/doctors${req.path}`));
app.use('/api/appointments', (req, res) => res.redirect(301, `/api/v1/appointments${req.path}`));
app.use('/api/medicines', (req, res) => res.redirect(301, `/api/v1/medicines${req.path}`));
app.use('/api/prescriptions', (req, res) => res.redirect(301, `/api/v1/prescriptions${req.path}`));
app.use('/api/billings', (req, res) => res.redirect(301, `/api/v1/billings${req.path}`));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/patients', patientsRoutes);
app.use('/api/v1/doctors', doctorsRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/medicines', medicinesRoutes);
app.use('/api/v1/prescriptions', prescriptionsRoutes);
app.use('/api/v1/billings', billingsRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — harus paling bawah
app.use(errorHandler);

export default app;