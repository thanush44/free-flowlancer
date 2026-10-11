const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all time logs (with client name, project name, task title)
router.get('/', async (req, res) => {
  try {
    const { project_id, client_id, is_billed } = req.query;
    let query = `
      SELECT 
        tl.*,
        p.name AS project_name,
        c.id AS client_id,
        c.name AS client_name,
        c.default_hourly_rate AS client_hourly_rate,
        t.title AS task_title
      FROM time_logs tl
      JOIN projects p ON p.id = tl.project_id AND p.user_id = tl.user_id
      JOIN clients c ON c.id = p.client_id AND c.user_id = tl.user_id
      LEFT JOIN tasks t ON t.id = tl.task_id AND t.user_id = tl.user_id
      WHERE tl.user_id = ?
    `;
    const params = [req.user.id];

    if (project_id) {
      query += ' AND tl.project_id = ?';
      params.push(project_id);
    }
    if (client_id) {
      query += ' AND c.id = ?';
      params.push(client_id);
    }
    if (is_billed !== undefined && is_billed !== '') {
      query += ' AND tl.is_billed = ?';
      params.push(parseInt(is_billed, 10));
    }

    query += ' ORDER BY tl.start_time DESC';

    const logs = await db.allAsync(query, params);
    
    // Add computed billable amount for each log
    const enrichedLogs = logs.map((log) => {
      const hours = (log.duration_minutes || 0) / 60.0;
      const rate = log.client_hourly_rate || 50.0;
      return {
        ...log,
        hours: parseFloat(hours.toFixed(2)),
        amount: parseFloat((hours * rate).toFixed(2)),
      };
    });

    res.json({ logs: enrichedLogs });
  } catch (error) {
    console.error('Error fetching time logs:', error);
    res.status(500).json({ error: 'Failed to retrieve time logs' });
  }
});

// POST new time log (Supports both Stopwatch Stop and Manual Entry!)
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      task_id,
      description,
      start_time,
      end_time,
      duration_minutes,
      is_manual,
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'Project is required' });
    }

    // Verify project belongs to user
    const project = await db.getAsync(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, req.user.id]
    );
    if (!project) {
      return res.status(400).json({ error: 'Invalid project selected' });
    }

    let calculatedDuration = duration_minutes;
    let finalStartTime = start_time || new Date().toISOString();
    let finalEndTime = end_time || null;

    if (!calculatedDuration && start_time && end_time) {
      const diffMs = new Date(end_time).getTime() - new Date(start_time).getTime();
      calculatedDuration = Math.max(1, Math.round(diffMs / (1000 * 60)));
    }

    if (!calculatedDuration || calculatedDuration <= 0) {
      return res.status(400).json({ error: 'Valid duration or start/end times required' });
    }

    const result = await db.runAsync(
      `
      INSERT INTO time_logs (
        user_id, project_id, task_id, description, start_time, end_time,
        duration_minutes, is_manual, is_billed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      [
        req.user.id,
        project_id,
        task_id || null,
        description ? description.trim() : '',
        finalStartTime,
        finalEndTime,
        calculatedDuration,
        is_manual ? 1 : 0,
      ]
    );

    const newLog = await db.getAsync(
      `
      SELECT 
        tl.*,
        p.name AS project_name,
        c.name AS client_name,
        c.default_hourly_rate AS client_hourly_rate,
        t.title AS task_title
      FROM time_logs tl
      JOIN projects p ON p.id = tl.project_id
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN tasks t ON t.id = tl.task_id
      WHERE tl.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json({ log: newLog });
  } catch (error) {
    console.error('Error logging time:', error);
    res.status(500).json({ error: 'Failed to create time log' });
  }
});

// DELETE time log
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getAsync(
      'SELECT id, is_billed FROM time_logs WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    if (existing.is_billed) {
      return res.status(400).json({ error: 'Cannot delete a time log that has already been billed on an invoice' });
    }

    await db.runAsync('DELETE FROM time_logs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Time log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete time log' });
  }
});

module.exports = router;
