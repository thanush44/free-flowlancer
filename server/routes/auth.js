const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, plan } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await db.getAsync('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userPlan = plan === 'free' ? 'free' : 'pro';

    const result = await db.runAsync(
      `INSERT INTO users (name, email, password_hash, plan) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, userPlan]
    );

    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '7d' });

    const user = {
      id: result.lastID,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      plan: userPlan,
      hourly_rate: 50.0,
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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        hourly_rate: user.hourly_rate,
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
    await db.runAsync(
      `UPDATE users SET name = COALESCE(?, name), hourly_rate = COALESCE(?, hourly_rate) WHERE id = ?`,
      [name, hourly_rate, req.user.id]
    );

    const updatedUser = await db.getAsync(
      'SELECT id, name, email, plan, hourly_rate FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Toggle or Set Plan (Free / Pro) for testing Phase 4 Tiered Access
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
