const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Projects overview
    const projects = await db.allAsync(
      `
      SELECT 
        p.*,
        c.name AS client_name,
        c.default_hourly_rate AS client_hourly_rate,
        COALESCE(SUM(tl.duration_minutes), 0) / 60.0 AS total_hours_logged
      FROM projects p
      JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
      LEFT JOIN time_logs tl ON tl.project_id = p.id AND tl.user_id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.id
      `,
      [userId]
    );

    const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
    const completedProjectsCount = projects.filter((p) => p.status === 'completed').length;

    // Burn rate calculation for active projects
    const burnRateAlerts = [];
    const projectsWithBurn = projects.map((p) => {
      const spent = p.total_hours_logged * (p.client_hourly_rate || 50.0);
      const budget = p.budget || 0;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      if (pct >= 80 && budget > 0) {
        burnRateAlerts.push({
          id: p.id,
          name: p.name,
          client_name: p.client_name,
          percent: pct,
          spent,
          budget,
          isExceeded: pct >= 100,
        });
      }
      return {
        id: p.id,
        name: p.name,
        client_name: p.client_name,
        spent: parseFloat(spent.toFixed(2)),
        budget,
        burn_rate_percent: pct,
      };
    });

    // 2. Invoices summary & totals
    const invoices = await db.allAsync(
      `SELECT status, total_amount, issue_date FROM invoices WHERE user_id = ?`,
      [userId]
    );

    let totalRevenue = 0;
    let outstandingAmount = 0;
    let pendingInvoicesCount = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        totalRevenue += inv.total_amount;
      } else {
        outstandingAmount += inv.total_amount;
        pendingInvoicesCount += 1;
      }
    });

    // 3. Upcoming Deadlines (tasks and projects due within next 30 days)
    const upcomingTasks = await db.allAsync(
      `
      SELECT 
        t.id, t.title, t.due_date, t.status,
        p.name AS project_name,
        c.name AS client_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id AND p.user_id = t.user_id
      JOIN clients c ON c.id = p.client_id AND c.user_id = t.user_id
      WHERE t.user_id = ? 
        AND t.status != 'completed'
        AND t.due_date IS NOT NULL
      ORDER BY t.due_date ASC
      LIMIT 6
      `,
      [userId]
    );

    // 4. Monthly Revenue & Outstanding aggregation (Last 6 Months for Recharts)
    // We compute revenue and pending amounts grouped by Month (e.g. "May", "Jun", etc.)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label, revenue: 0, outstanding: 0 });
    }

    invoices.forEach((inv) => {
      if (inv.issue_date) {
        const itemKey = inv.issue_date.slice(0, 7);
        const targetMonth = months.find((m) => m.key === itemKey);
        if (targetMonth) {
          if (inv.status === 'paid') {
            targetMonth.revenue += inv.total_amount;
          } else {
            targetMonth.outstanding += inv.total_amount;
          }
        }
      }
    });

    // Round graph values
    const chartData = months.map((m) => ({
      month: m.label,
      revenue: parseFloat(m.revenue.toFixed(2)),
      outstanding: parseFloat(m.outstanding.toFixed(2)),
    }));

    // 5. Unbilled time logs value
    const unbilledRow = await db.getAsync(
      `
      SELECT 
        COALESCE(SUM(tl.duration_minutes), 0) / 60.0 AS unbilled_hours,
        COALESCE(SUM((tl.duration_minutes / 60.0) * c.default_hourly_rate), 0) AS unbilled_amount
      FROM time_logs tl
      JOIN projects p ON p.id = tl.project_id
      JOIN clients c ON c.id = p.client_id
      WHERE tl.user_id = ? AND tl.is_billed = 0
      `,
      [userId]
    );

    res.json({
      summary: {
        active_projects: activeProjectsCount,
        completed_projects: completedProjectsCount,
        pending_invoices: pendingInvoicesCount,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        outstanding_amount: parseFloat(outstandingAmount.toFixed(2)),
        unbilled_hours: parseFloat((unbilledRow.unbilled_hours || 0).toFixed(2)),
        unbilled_amount: parseFloat((unbilledRow.unbilled_amount || 0).toFixed(2)),
      },
      chart_data: chartData,
      upcoming_deadlines: upcomingTasks,
      burn_rate_alerts: burnRateAlerts,
      recent_projects: projectsWithBurn.slice(0, 5),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

module.exports = router;
