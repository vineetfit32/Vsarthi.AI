// server/index.js
// VSarthi.AI Backend Server - AI Clinical Intake Platform
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patient.js';
import interviewRoutes from './routes/interview.js';
import documentRoutes from './routes/documents.js';
import summaryRoutes from './routes/summary.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import hisRoutes from './routes/his.js';
import chatRoutes from './routes/chat.js';
import prescriptionRoutes from './routes/prescription.js';
import db from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend to load
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    )) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit on auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request rate limit reached. Please wait a moment.' },
});

app.use(globalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      // Never log Authorization header values
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const aiConfigured = !!(process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_groq_api_key_here');
  const abdmMode = process.env.ABDM_CLIENT_ID ? 'production_gateway' : 'development_sandbox';

  res.json({
    status: 'healthy',
    platform: 'VSarthi.AI Clinical Intake Platform',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      type: 'embedded_json',
      sessionsCount: db.collection('sessions').count(),
      patientsCount: db.collection('patients').count(),
      usersCount: db.collection('users').count(),
    },
    services: {
      ai: aiConfigured ? 'configured' : 'not_configured_check_AI_API_KEY',
      abdm: abdmMode,
      ocr: aiConfigured ? 'via_ai_api' : 'not_configured',
    },
    compliance: {
      note: 'Designed with ABDM/DPDPA 2023 considerations. Not a certified compliance determination.',
      abdmMode,
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient', patientRoutes);
app.post('/api/consent', (req, res, next) => {
  req.url = '/consent';
  patientRoutes(req, res, next);
});
app.use('/api/history', interviewRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/his', hisRoutes);
app.use('/api/chat', aiLimiter, chatRoutes);
app.use('/api/prescription', aiLimiter, prescriptionRoutes);

// ─── Static Frontend (Production) ────────────────────────────────────────────
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Never expose internals to client
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      error: err.message || 'Internal server error',
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'An unexpected error occurred. Please try again.' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    const aiConfigured = !!(process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_groq_api_key_here');
    console.log(`=================================================`);
    console.log(`🚀 VSarthi.AI Clinical Intake Server running on http://localhost:${PORT}`);
    console.log(`🤖 AI Engine: ${aiConfigured ? 'Groq API Connected' : '⚠️  AI_API_KEY not configured'}`);
    console.log(`🏥 ABDM Gateway: ${process.env.ABDM_CLIENT_ID ? 'Production' : 'Development Sandbox'}`);
    console.log(`🛡️  DPDPA 2023 Considerations: Active`);
    console.log(`🔒 Security: Helmet + Rate Limiting + bcrypt`);
    console.log(`=================================================`);
  });
}

export default app;
