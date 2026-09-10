// server/routes/auth.js
import express from 'express';
import crypto from 'crypto';
import db, { verifyPassword } from '../db.js';

const router = express.Router();

// Simple JWT-compatible token generation without external heavy dependency
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
  })).toString('base64url');
  const secret = process.env.JWT_SECRET || 'vsarthi_secure_jwt_secret_2026';
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const secret = process.env.JWT_SECRET || 'vsarthi_secure_jwt_secret_2026';
  const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// Middleware: authenticate request
export function authMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: role '${user.role}' lacks required permissions` });
    }
    req.user = user;
    next();
  };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials. Check email and password.' });
  }

  const token = generateToken(user);

  db.logAudit({
    actorRole: user.role,
    actorId: user.id,
    action: 'USER_LOGIN',
    targetType: 'user',
    targetId: user.id,
    details: { email: user.email, ip: req.ip },
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired' });
  }
  return res.json({ user: payload });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
