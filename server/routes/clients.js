const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { emitToUser } = require('../socket');

router.use(authenticateToken);

function parsePositiveInt(val) {
  const num = parseInt(val, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

// GET all clients for current authenticated user with search support
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let whereClause = 'WHERE c.user_id = ?';
    const params = [req.user.id];

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += ' AND (c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)';
      params.push(term, term, term);
    }

    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) AS total_projects,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS active_projects,
        COALESCE(SUM(tl.duration_minutes), 0) / 60.0 AS total_hours_logged,
        COALESCE(SUM(CASE WHEN tl.is_billed = 0 THEN tl.duration_minutes ELSE 0 END), 0) / 60.0 AS unbilled_hours
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id AND p.user_id = c.user_id
      LEFT JOIN time_logs tl ON tl.project_id = p.id AND tl.user_id = c.user_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const clients = await db.allAsync(query, params);

    // Calculate unbilled revenue estimate rounded to 2 decimal places
    const clientsWithFinancials = clients.map((c) => {
      const unbilledAmount = (c.unbilled_hours || 0) * (c.default_hourly_rate || 0);
      return {
        ...c,
        default_hourly_rate: Math.round((c.default_hourly_rate || 0) * 100) / 100,
        unbilled_amount: Math.round(unbilledAmount * 100) / 100,
      };
    });

    res.json({ clients: clientsWithFinancials });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to retrieve clients' });
  }
});

// GET single client belonging to current user
router.get('/:id', async (req, res) => {
  try {
    const clientId = parsePositiveInt(req.params.id);
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID parameter' });
    }

    const client = await db.getAsync(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user.id]
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    client.default_hourly_rate = Math.round((client.default_hourly_rate || 0) * 100) / 100;

    const projects = await db.allAsync(
      'SELECT * FROM projects WHERE client_id = ? AND user_id = ? ORDER BY created_at DESC',
      [client.id, req.user.id]
    );

    res.json({ client, projects });
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ error: 'Failed to retrieve client details' });
  }
});

// POST create new client (validates non-negative rates and freemium quota)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, default_hourly_rate, address, notes } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    // Check freemium limit for free tier
    if (req.user.plan === 'free') {
      const clientCountRow = await db.getAsync(
        'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
        [req.user.id]
      );
      const currentCount = clientCountRow ? clientCountRow.count : 0;
      if (currentCount >= 2) {
        return res.status(403).json({
          error: 'Freemium Limit Reached: Free tier allows a maximum of 2 clients. Upgrade to Pro for unlimited clients!',
          limitReached: true,
          plan: 'free',
          maxClients: 2,
        });
      }
    }

    let rate = 65.0;
    if (default_hourly_rate !== undefined && default_hourly_rate !== null && default_hourly_rate !== '') {
      const parsedRate = parseFloat(default_hourly_rate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ error: 'Default hourly rate cannot be negative' });
      }
      rate = Math.round(parsedRate * 100) / 100;
    } else if (req.user.hourly_rate !== undefined) {
      rate = Math.round(req.user.hourly_rate * 100) / 100;
    }

    const cleanName = name.trim();
    const cleanEmail = email && typeof email === 'string' ? email.trim() : '';
    const cleanPhone = phone && typeof phone === 'string' ? phone.trim() : '';
    const cleanCompany = company && typeof company === 'string' ? company.trim() : '';
    const cleanAddress = address && typeof address === 'string' ? address.trim() : '';
    const cleanNotes = notes && typeof notes === 'string' ? notes.trim() : '';

    const result = await db.runAsync(
      `
      INSERT INTO clients (user_id, name, email, phone, company, default_hourly_rate, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [req.user.id, cleanName, cleanEmail, cleanPhone, cleanCompany, rate, cleanAddress, cleanNotes]
    );

    const newClient = await db.getAsync('SELECT * FROM clients WHERE id = ?', [result.lastID]);
    newClient.default_hourly_rate = Math.round((newClient.default_hourly_rate || 0) * 100) / 100;

    // Real-time broadcast strictly to authenticated user's session room
    emitToUser(req.user.id, 'client-created', { client: newClient });

    res.status(201).json({ client: newClient });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT update client
router.put('/:id', async (req, res) => {
  try {
    const clientId = parsePositiveInt(req.params.id);
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID parameter' });
    }

    const { name, email, phone, company, default_hourly_rate, address, notes } = req.body;

    const existing = await db.getAsync(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    let rate = existing.default_hourly_rate;
    if (default_hourly_rate !== undefined && default_hourly_rate !== null && default_hourly_rate !== '') {
      const parsedRate = parseFloat(default_hourly_rate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ error: 'Default hourly rate cannot be negative' });
      }
      rate = Math.round(parsedRate * 100) / 100;
    }

    const cleanName = name !== undefined && typeof name === 'string' && name.trim() ? name.trim() : existing.name;
    const cleanEmail = email !== undefined && typeof email === 'string' ? email.trim() : existing.email;
    const cleanPhone = phone !== undefined && typeof phone === 'string' ? phone.trim() : existing.phone;
    const cleanCompany = company !== undefined && typeof company === 'string' ? company.trim() : existing.company;
    const cleanAddress = address !== undefined && typeof address === 'string' ? address.trim() : existing.address;
    const cleanNotes = notes !== undefined && typeof notes === 'string' ? notes.trim() : existing.notes;

    await db.runAsync(
      `
      UPDATE clients 
      SET name = ?,
          email = ?,
          phone = ?,
          company = ?,
          default_hourly_rate = ?,
          address = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
      `,
      [cleanName, cleanEmail, cleanPhone, cleanCompany, rate, cleanAddress, cleanNotes, clientId, req.user.id]
    );

    const updated = await db.getAsync('SELECT * FROM clients WHERE id = ?', [clientId]);
    updated.default_hourly_rate = Math.round((updated.default_hourly_rate || 0) * 100) / 100;

    // Real-time broadcast strictly to authenticated user's session room
    emitToUser(req.user.id, 'client-updated', { client: updated });

    res.json({ client: updated });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    const clientId = parsePositiveInt(req.params.id);
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID parameter' });
    }

    const existing = await db.getAsync(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db.runAsync('DELETE FROM clients WHERE id = ? AND user_id = ?', [clientId, req.user.id]);

    // Real-time broadcast strictly to authenticated user's session room
    emitToUser(req.user.id, 'client-deleted', { id: clientId });

    res.json({ message: 'Client deleted successfully', id: clientId });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
