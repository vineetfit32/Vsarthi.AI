// server/routes/auth.js
// VSarthi.AI Authentication Routes — Real JWT + bcrypt
import express from 'express';
import crypto from 'crypto';
import db, { verifyPassword, hashPassword } from '../db.js';

const router = express.Router();

// ─── JWT Token Generation ─────────────────────────────────────────────────────
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
  })).toString('base64url');
  const secret = process.env.JWT_SECRET || 'vsarthi_dev_jwt_secret_change_in_production';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const secret = process.env.JWT_SECRET || 'vsarthi_dev_jwt_secret_change_in_production';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
export function authMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    req.user = user;
    next();
  };
}

// ─── Input Validation Helpers ────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('one number');
  return errors;
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const user = db.collection('users').findOne({ email: email.toLowerCase().trim() });

  // Use constant-time comparison to prevent timing attacks
  if (!user) {
    // Still verify a dummy hash to prevent timing attacks revealing user existence
    verifyPassword(password, '$2a$12$invalidhashfortimingattackprevention');
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
  }

  // If password was stored as legacy SHA-256, re-hash it with bcrypt on successful login
  if (user.passwordHash && user.passwordHash.length === 64 && /^[a-f0-9]+$/.test(user.passwordHash)) {
    const newHash = hashPassword(password);
    db.collection('users').update(user.id, { passwordHash: newHash });
  }

  const token = generateToken(user);

  db.logAudit({
    actorRole: user.role,
    actorId: user.id,
    action: 'USER_LOGIN',
    targetType: 'user',
    targetId: user.id,
    details: { email: user.email, ipHash: crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 8) },
  });

  return res.json({
    success: true,
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

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, phone, password, confirmPassword, role = 'patient', termsAccepted } = req.body;

  // Validation
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  if (!email || !validateEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!phone || !validatePhone(phone)) {
    errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else {
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      errors.password = `Password must contain ${pwErrors.join(', ')}.`;
    }
  }

  if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!termsAccepted) {
    errors.terms = 'You must accept the terms and privacy policy to register.';
  }

  const allowedRoles = ['doctor', 'nurse', 'admin', 'patient'];
  if (!allowedRoles.includes(role)) {
    errors.role = 'Invalid role selected.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }

  // Check for existing account
  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.collection('users').findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({
      error: 'An account with this email address already exists.',
      fields: { email: 'Email is already registered.' },
    });
  }

  // Check phone uniqueness
  const phoneExists = db.collection('users').findOne({ phone: phone.trim() });
  if (phoneExists) {
    return res.status(409).json({
      error: 'An account with this phone number already exists.',
      fields: { phone: 'Phone number is already registered.' },
    });
  }

  const passwordHash = hashPassword(password);

  const newUser = db.collection('users').insert({
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    role,
    department: role === 'doctor' ? 'General Medicine' : role === 'nurse' ? 'OPD' : 'Administration',
    phone: phone.trim(),
    isActive: true,
    termsAcceptedAt: new Date().toISOString(),
  });

  db.logAudit({
    actorRole: 'system',
    actorId: 'registration',
    action: 'USER_REGISTERED',
    targetType: 'user',
    targetId: newUser.id,
    details: { email: normalizedEmail, role },
  });

  const token = generateToken(newUser);

  return res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      department: newUser.department,
    },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Verify user still exists and is active
  const user = db.collection('users').findById(payload.sub);
  if (!user || user.isActive === false) {
    return res.status(401).json({ error: 'Account not found or deactivated.' });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Always return the same response regardless of whether email exists
  // This prevents user enumeration attacks
  return res.json({
    success: true,
    message: 'If an account with this email exists, you will receive password reset instructions. Please contact your hospital administrator for assistance.',
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // JWT is stateless; client clears token
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
