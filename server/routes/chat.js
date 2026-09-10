// server/routes/chat.js
// VSarthi.AI — Real AI Chatbot Backend Route
// Frontend → Backend → Groq AI → Validated Response → Frontend
import express from 'express';
import db from '../db.js';
import { answerHealthQuestion } from '../services/aiService.js';

const router = express.Router();

// ─── Input Sanitization ───────────────────────────────────────────────────────
function sanitizeMessage(text) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .slice(0, 2000) // Hard limit
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>]/g, ''); // Strip remaining angle brackets
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-20) // Max 20 history items
    .filter(msg => msg && typeof msg === 'object')
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: sanitizeMessage(msg.content || msg.text || ''),
    }))
    .filter(msg => msg.content.length > 0);
}

// ─── POST /api/chat/message ───────────────────────────────────────────────────
router.post('/message', async (req, res) => {
  const { message, conversationHistory = [], sessionId } = req.body;

  const sanitizedMessage = sanitizeMessage(message);
  if (!sanitizedMessage) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  if (sanitizedMessage.length > 2000) {
    return res.status(400).json({ error: 'Message is too long. Please keep messages under 2000 characters.' });
  }

  const sanitizedHistory = sanitizeHistory(conversationHistory);

  try {
    const result = await answerHealthQuestion(sanitizedMessage, sanitizedHistory);

    // Log chat interaction (anonymized — no message content stored in audit)
    if (sessionId) {
      db.logAudit({
        actorRole: 'patient',
        actorId: sessionId || 'anonymous',
        action: 'CHAT_MESSAGE_SENT',
        targetType: 'chat',
        targetId: sessionId || 'anonymous',
        details: {
          success: result.success,
          isEmergencyFlag: result.isEmergencyFlag || false,
          messageLength: sanitizedMessage.length,
        },
      });
    }

    if (!result.success) {
      return res.status(503).json({
        error: result.error || 'ai_unavailable',
        reply: result.reply,
        isError: true,
      });
    }

    return res.json({
      success: true,
      reply: result.reply,
      isEmergencyFlag: result.isEmergencyFlag || false,
    });

  } catch (err) {
    console.error('[Chat Route] Unexpected error:', err.message);
    return res.status(500).json({
      error: 'unexpected_error',
      reply: 'Something went wrong. Please try again in a moment.',
      isError: true,
    });
  }
});

// ─── GET /api/chat/status ─────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const aiConfigured = !!(process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_groq_api_key_here');
  res.json({
    available: aiConfigured,
    message: aiConfigured
      ? 'AI assistant is ready.'
      : 'AI assistant is not configured. Please set AI_API_KEY in server environment.',
  });
});

export default router;
