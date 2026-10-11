const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET tasks (optionally filtered by project_id or status)
router.get('/', async (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = `
      SELECT 
        t.*,
        p.name AS project_name,
        c.name AS client_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id AND p.user_id = t.user_id
      JOIN clients c ON c.id = p.client_id AND c.user_id = t.user_id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY CASE WHEN t.status = "completed" THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC';

    const tasks = await db.allAsync(query, params);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// POST new task
router.post('/', async (req, res) => {
  try {
    const { project_id, title, status, due_date, estimated_hours } = req.body;

    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'Project and Task title are required' });
    }

    // Verify project belongs to user
    const project = await db.getAsync(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, req.user.id]
    );
    if (!project) {
      return res.status(400).json({ error: 'Invalid project selected' });
    }

    const result = await db.runAsync(
      `
      INSERT INTO tasks (user_id, project_id, title, status, due_date, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        project_id,
        title.trim(),
        status || 'todo',
        due_date || null,
        estimated_hours ? parseFloat(estimated_hours) : 0.0,
      ]
    );

    const newTask = await db.getAsync(
      `
      SELECT t.*, p.name AS project_name 
      FROM tasks t 
      JOIN projects p ON p.id = t.project_id 
      WHERE t.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json({ task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const task = await db.getAsync(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.runAsync('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [
      status,
      req.params.id,
      req.user.id,
    ]);

    const updatedTask = await db.getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// PUT update full task
router.put('/:id', async (req, res) => {
  try {
    const { project_id, title, status, due_date, estimated_hours } = req.body;

    const task = await db.getAsync(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.runAsync(
      `
      UPDATE tasks
      SET project_id = COALESCE(?, project_id),
          title = COALESCE(?, title),
          status = COALESCE(?, status),
          due_date = COALESCE(?, due_date),
          estimated_hours = COALESCE(?, estimated_hours)
      WHERE id = ? AND user_id = ?
      `,
      [project_id, title, status, due_date, estimated_hours, req.params.id, req.user.id]
    );

    const updated = await db.getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ task: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const task = await db.getAsync(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.runAsync('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
