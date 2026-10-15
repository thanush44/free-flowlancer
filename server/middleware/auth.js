const jwt = require('jsonwebtoken');
const { db } = require('../db');

function getJWTSecret() {
  return process.env.JWT_SECRET || 'freelanceflow-super-secret-key-2026';
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJWTSecret());
    if (!decoded || !decoded.userId) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Fetch fresh user record from database
    const user = await db.getAsync(
      'SELECT id, name, email, plan, hourly_rate, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateToken,
  getJWTSecret,
  get JWT_SECRET() {
    return getJWTSecret();
  },
};
