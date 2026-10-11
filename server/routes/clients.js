const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all clients for current authenticated user
router.get('/', async (req, res) => {
  try {
    const clients = await db.allAsync(
      `
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) AS total_projects,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS active_projects,
        COALESCE(SUM(tl.duration_minutes), 0) / 60.0 AS total_hours_logged,
        COALESCE(SUM(CASE WHEN tl.is_billed = 0 THEN tl.duration_minutes ELSE 0 END), 0) / 60.0 AS unbilled_hours
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id AND p.user_id = c.user_id
      LEFT JOIN time_logs tl ON tl.project_id = p.id AND tl.user_id = c.user_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
      `,
      [req.user.id]
    );

    // Calculate unbilled revenue estimate
    const clientsWithFinancials = clients.map((c) => ({
      ...c,
      unbilled_amount: (c.unbilled_hours || 0) * (c.default_hourly_rate || 0),
    }));

    res.json({ clients: clientsWithFinancials });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to retrieve clients' });
  }
});

// GET single client
router.get('/:id', async (req, res) => {
  try {
    const client = await db.getAsync(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const projects = await db.allAsync(
      'SELECT * FROM projects WHERE client_id = ? AND user_id = ? ORDER BY created_at DESC',
      [client.id, req.user.id]
    );

    res.json({ client, projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve client details' });
  }
});

// POST new client (Enforces Freemium 2-Client limit for Free tier!)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, default_hourly_rate, address, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    // Check freemium limit
    if (req.user.plan === 'free') {
      const clientCountRow = await db.getAsync(
        'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
        [req.user.id]
      );
      const currentCount = clientCountRow ? clientCountRow.count : 0;
      if (currentCount >= 2) {
        return res.status(403).json({
          error: 'Freemium Limit Reached: Free tier allows a maximum of 2 clients. Please upgrade to Pro for unlimited clients!',
          limitReached: true,
          plan: 'free',
          maxClients: 2,
        });
      }
    }

    const rate = default_hourly_rate !== undefined && default_hourly_rate !== '' 
      ? parseFloat(default_hourly_rate) 
      : (req.user.hourly_rate || 65.0);

    const result = await db.runAsync(
      `
      INSERT INTO clients (user_id, name, email, phone, company, default_hourly_rate, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        name.trim(),
        email ? email.trim() : '',
        phone ? phone.trim() : '',
        company ? company.trim() : '',
        rate,
        address ? address.trim() : '',
        notes ? notes.trim() : '',
      ]
    );

    const newClient = await db.getAsync('SELECT * FROM clients WHERE id = ?', [result.lastID]);
    res.status(201).json({ client: newClient });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT/PATCH update client
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, default_hourly_rate, address, notes } = req.body;

    const existing = await db.getAsync(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db.runAsync(
      `
      UPDATE clients 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          company = COALESCE(?, company),
          default_hourly_rate = COALESCE(?, default_hourly_rate),
          address = COALESCE(?, address),
          notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
      `,
      [name, email, phone, company, default_hourly_rate, address, notes, req.params.id, req.user.id]
    );

    const updated = await db.getAsync('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json({ client: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getAsync(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db.runAsync('DELETE FROM clients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
