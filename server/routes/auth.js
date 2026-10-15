const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { getJWTSecret, authenticateToken } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, plan, hourly_rate } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Valid full name is required' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await db.getAsync('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userPlan = plan === 'free' ? 'free' : 'pro';
    const rate = hourly_rate !== undefined && !isNaN(parseFloat(hourly_rate)) && parseFloat(hourly_rate) >= 0
      ? Math.round(parseFloat(hourly_rate) * 100) / 100
      : 50.0;

    const result = await db.runAsync(
      `INSERT INTO users (name, email, password_hash, plan, hourly_rate) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), cleanEmail, passwordHash, userPlan, rate]
    );

    const token = jwt.sign({ userId: result.lastID }, getJWTSecret(), { expiresIn: '7d' });

    const user = {
      id: result.lastID,
      name: name.trim(),
      email: cleanEmail,
      plan: userPlan,
      hourly_rate: rate,
    };

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      // Generic error prevents account enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, getJWTSecret(), { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan || 'pro',
        hourly_rate: user.hourly_rate || 50.0,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Update Profile
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const { name, hourly_rate } = req.body;
    let validatedRate = undefined;

    if (hourly_rate !== undefined) {
      const parsed = parseFloat(hourly_rate);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Hourly rate cannot be negative' });
      }
      validatedRate = Math.round(parsed * 100) / 100;
    }

    const cleanName = name !== undefined && typeof name === 'string' && name.trim() ? name.trim() : undefined;

    await db.runAsync(
      `UPDATE users SET name = COALESCE(?, name), hourly_rate = COALESCE(?, hourly_rate) WHERE id = ?`,
      [cleanName, validatedRate, req.user.id]
    );

    const updatedUser = await db.getAsync(
      'SELECT id, name, email, plan, hourly_rate FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Toggle or Set Plan (Free / Pro)
router.post('/toggle-plan', authenticateToken, async (req, res) => {
  try {
    const currentPlan = req.user.plan;
    const requestedPlan = req.body.plan;
    const newPlan = requestedPlan || (currentPlan === 'free' ? 'pro' : 'free');

    await db.runAsync('UPDATE users SET plan = ? WHERE id = ?', [newPlan, req.user.id]);
    res.json({ message: `Plan switched to ${newPlan}`, plan: newPlan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch plan' });
  }
});

module.exports = router;
