const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all projects with Client information, task counts, and Burn Rate calculations
router.get('/', async (req, res) => {
  try {
    const projects = await db.allAsync(
      `
      SELECT 
        p.*,
        c.name AS client_name,
        c.company AS client_company,
        c.default_hourly_rate AS client_hourly_rate,
        COUNT(DISTINCT t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
        COALESCE(SUM(tl.duration_minutes), 0) / 60.0 AS total_hours_logged,
        COALESCE(SUM(CASE WHEN tl.is_billed = 0 THEN tl.duration_minutes ELSE 0 END), 0) / 60.0 AS unbilled_hours
      FROM projects p
      JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
      LEFT JOIN tasks t ON t.project_id = p.id AND t.user_id = p.user_id
      LEFT JOIN time_logs tl ON tl.project_id = p.id AND tl.user_id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [req.user.id]
    );

    // Calculate dynamic burn rate and financial status
    const projectsWithBurnRate = projects.map((p) => {
      const rate = p.client_hourly_rate || 50.0;
      const spentAmount = p.total_hours_logged * rate;
      const budget = p.budget || 0;
      const burnRatePercent = budget > 0 ? Math.min(Math.round((spentAmount / budget) * 100), 999) : 0;
      const remainingBudget = budget - spentAmount;

      let burnStatus = 'normal'; // 'normal' | 'warning' | 'exceeded'
      if (budget > 0) {
        if (burnRatePercent >= 100) burnStatus = 'exceeded';
        else if (burnRatePercent >= 80) burnStatus = 'warning';
      }

      return {
        ...p,
        effective_rate: rate,
        spent_amount: parseFloat(spentAmount.toFixed(2)),
        burn_rate_percent: burnRatePercent,
        remaining_budget: parseFloat(remainingBudget.toFixed(2)),
        burn_status: burnStatus,
      };
    });

    res.json({ projects: projectsWithBurnRate });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// GET single project with full details, tasks, and recent time logs
router.get('/:id', async (req, res) => {
  try {
    const project = await db.getAsync(
      `
      SELECT 
        p.*,
        c.name AS client_name,
        c.email AS client_email,
        c.company AS client_company,
        c.default_hourly_rate AS client_hourly_rate
      FROM projects p
      JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
      WHERE p.id = ? AND p.user_id = ?
      `,
      [req.params.id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tasks = await db.allAsync(
      'SELECT * FROM tasks WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC',
      [project.id, req.user.id]
    );

    const timeLogs = await db.allAsync(
      `
      SELECT tl.*, t.title AS task_title 
      FROM time_logs tl
      LEFT JOIN tasks t ON t.id = tl.task_id
      WHERE tl.project_id = ? AND tl.user_id = ?
      ORDER BY tl.start_time DESC
      LIMIT 50
      `,
      [project.id, req.user.id]
    );

    const totalHours = timeLogs.reduce((acc, log) => acc + (log.duration_minutes / 60.0), 0);
    const spentAmount = totalHours * (project.client_hourly_rate || 50.0);
    const burnRatePercent = project.budget > 0 ? Math.round((spentAmount / project.budget) * 100) : 0;

    res.json({
      project: {
        ...project,
        total_hours_logged: parseFloat(totalHours.toFixed(2)),
        spent_amount: parseFloat(spentAmount.toFixed(2)),
        burn_rate_percent: burnRatePercent,
        remaining_budget: parseFloat((project.budget - spentAmount).toFixed(2)),
      },
      tasks,
      timeLogs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
});

// POST new project
router.post('/', async (req, res) => {
  try {
    const { client_id, name, description, status, budget, deadline } = req.body;

    if (!client_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'Client and Project name are required' });
    }

    // Verify client belongs to current user
    const client = await db.getAsync(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [client_id, req.user.id]
    );
    if (!client) {
      return res.status(400).json({ error: 'Invalid client selected' });
    }

    const result = await db.runAsync(
      `
      INSERT INTO projects (user_id, client_id, name, description, status, budget, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        client_id,
        name.trim(),
        description ? description.trim() : '',
        status || 'active',
        budget ? parseFloat(budget) : 0.0,
        deadline || null,
      ]
    );

    const newProject = await db.getAsync('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.status(201).json({ project: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const { client_id, name, description, status, budget, deadline } = req.body;

    const existing = await db.getAsync(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.runAsync(
      `
      UPDATE projects
      SET client_id = COALESCE(?, client_id),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          budget = COALESCE(?, budget),
          deadline = COALESCE(?, deadline)
      WHERE id = ? AND user_id = ?
      `,
      [client_id, name, description, status, budget, deadline, req.params.id, req.user.id]
    );

    const updated = await db.getAsync('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json({ project: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getAsync(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.runAsync('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
