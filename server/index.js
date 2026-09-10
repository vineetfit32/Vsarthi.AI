// server/index.js
// VSarthi.AI Backend Server - AI Clinical Intake Platform
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patient.js';
import interviewRoutes from './routes/interview.js';
import documentRoutes from './routes/documents.js';
import summaryRoutes from './routes/summary.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import hisRoutes from './routes/his.js';
import db from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors({
  origin: '*', // Allow local frontend during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'VSarthi.AI Clinical Intake Platform',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      sessionsCount: db.collection('sessions').count(),
      patientsCount: db.collection('patients').count(),
    },
    abdmMode: process.env.ABDM_CLIENT_ID ? 'PRODUCTION_GATEWAY' : 'DEVELOPMENT_SANDBOX_MOCK',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
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

// Serve static frontend assets in production if dist/ exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start Server (only if not imported by test)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 VSarthi.AI Clinical Intake Server running on http://localhost:${PORT}`);
    console.log(`🏥 ABDM / FHIR Gateway Adapter: Ready`);
    console.log(`🛡️ DPDPA 2023 Consent & Audit Engine: Active`);
    console.log(`=================================================`);
  });
}

export default app;
