const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/seed', async (req, res) => {
  try {
    const userId = req.user.id;

    // Optional: Clear existing user data so we have a clean sample dataset
    await db.runAsync('DELETE FROM invoices WHERE user_id = ?', [userId]);
    await db.runAsync('DELETE FROM time_logs WHERE user_id = ?', [userId]);
    await db.runAsync('DELETE FROM tasks WHERE user_id = ?', [userId]);
    await db.runAsync('DELETE FROM projects WHERE user_id = ?', [userId]);
    await db.runAsync('DELETE FROM clients WHERE user_id = ?', [userId]);

    // Ensure user has Pro plan to experience all sample data and unlimited clients
    await db.runAsync("UPDATE users SET plan = 'pro', hourly_rate = 2500.0 WHERE id = ?", [userId]);

    // 1. Insert 4 Clients with realistic INR hourly rates
    const clientsData = [
      {
        name: 'Sarah Connor',
        email: 'sarah@skynet-solutions.io',
        phone: '+91 98765 43210',
        company: 'Cyberdyne Systems India',
        default_hourly_rate: 2500.0,
        address: '100 Silicon Way, Whitefield, Bengaluru, KA',
        notes: 'Enterprise account. Monthly invoicing cycle.',
      },
      {
        name: 'Marcus Sterling',
        email: 'm.sterling@apexcreative.co',
        phone: '+91 98234 56789',
        company: 'Apex Creative Studio',
        default_hourly_rate: 1800.0,
        address: '742 Bandra Kurla Complex, Mumbai, MH',
        notes: 'High-growth design consultancy. Fast turnaround.',
      },
      {
        name: 'Elena Rostova',
        email: 'elena@novafinance.app',
        phone: '+91 97123 45678',
        company: 'Nova FinTech India',
        default_hourly_rate: 3200.0,
        address: '25 Financial District, Gachibowli, Hyderabad, TS',
        notes: 'Fintech compliance and security heavy.',
      },
      {
        name: 'David Zhao',
        email: 'david@greenpulse.earth',
        phone: '+91 99887 76655',
        company: 'GreenPulse Climate',
        default_hourly_rate: 2000.0,
        address: '400 Eco Park, Hinjawadi, Pune, MH',
        notes: 'Sustainability dashboard and tracking metrics.',
      },
    ];

    const clientIds = [];
    for (const c of clientsData) {
      const resC = await db.runAsync(
        `INSERT INTO clients (user_id, name, email, phone, company, default_hourly_rate, address, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, c.name, c.email, c.phone, c.company, c.default_hourly_rate, c.address, c.notes]
      );
      clientIds.push(resC.lastID);
    }

    // 2. Insert 5 Projects with INR Budgets
    const today = new Date();
    const futureDate = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };
    const pastDate = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const projectsData = [
      {
        client_id: clientIds[0],
        name: 'Automated Microservices Cloud Architecture',
        description: 'Scalable backend rewrite using Express, Node.js and distributed caching.',
        status: 'active',
        budget: 180000.0,
        deadline: futureDate(14),
      },
      {
        client_id: clientIds[1],
        name: 'Next-Gen Portfolio & Design System',
        description: 'Component library with dark mode, fluid typography and Figma tokens.',
        status: 'active',
        budget: 120000.0,
        deadline: futureDate(7),
      },
      {
        client_id: clientIds[2],
        name: 'Fintech Payment Gateway & UPI Integration',
        description: 'Secure PCI-compliant payment flow, automated webhooks, and ledger reconciliation.',
        status: 'active',
        budget: 250000.0,
        deadline: futureDate(25),
      },
      {
        client_id: clientIds[3],
        name: 'Carbon Emissions Real-time Dashboard',
        description: 'Data-dense visualization dashboard for enterprise sustainability reporting.',
        status: 'active',
        budget: 150000.0,
        deadline: futureDate(10),
      },
      {
        client_id: clientIds[1],
        name: 'Brand Identity & Visual Guidelines',
        description: 'Complete visual branding sprint, vector assets, and typography licensing.',
        status: 'completed',
        budget: 85000.0,
        deadline: pastDate(20),
      },
    ];

    const projectIds = [];
    for (const p of projectsData) {
      const resP = await db.runAsync(
        `INSERT INTO projects (user_id, client_id, name, description, status, budget, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, p.client_id, p.name, p.description, p.status, p.budget, p.deadline]
      );
      projectIds.push(resP.lastID);
    }

    // 3. Insert Tasks
    const tasksData = [
      { project_id: projectIds[0], title: 'Design database entity relationships', status: 'done', due_date: pastDate(18), estimated_hours: 6 },
      { project_id: projectIds[0], title: 'Implement Redis distributed lock for transaction processing', status: 'in_progress', due_date: futureDate(4), estimated_hours: 12 },
      { project_id: projectIds[0], title: 'Load testing & latency optimization (p99 < 50ms)', status: 'todo', due_date: futureDate(12), estimated_hours: 8 },

      { project_id: projectIds[1], title: 'Setup Tailwind 4 token architecture', status: 'done', due_date: pastDate(10), estimated_hours: 5 },
      { project_id: projectIds[1], title: 'Build accessible data-table & charts components', status: 'in_progress', due_date: futureDate(3), estimated_hours: 16 },
      { project_id: projectIds[1], title: 'Lighthouse accessibility & contrast audit', status: 'todo', due_date: futureDate(6), estimated_hours: 4 },

      { project_id: projectIds[2], title: 'Stripe Elements SDK & UPI integration', status: 'done', due_date: pastDate(5), estimated_hours: 14 },
      { project_id: projectIds[2], title: 'Webhook idempotent replay protection', status: 'in_progress', due_date: futureDate(8), estimated_hours: 8 },
      { project_id: projectIds[2], title: 'Automated invoice generation trigger upon payment', status: 'todo', due_date: futureDate(20), estimated_hours: 10 },

      { project_id: projectIds[3], title: 'Recharts stacked area and bar telemetry', status: 'in_progress', due_date: futureDate(2), estimated_hours: 10 },
      { project_id: projectIds[3], title: 'Streaming real-time SSE WebSocket alerts', status: 'todo', due_date: futureDate(9), estimated_hours: 12 },
    ];

    const taskIds = [];
    for (const t of tasksData) {
      const resT = await db.runAsync(
        `INSERT INTO tasks (user_id, project_id, title, status, due_date, estimated_hours)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, t.project_id, t.title, t.status, t.due_date, t.estimated_hours]
      );
      taskIds.push(resT.lastID);
    }

    // 4. Insert Invoices with INR amounts
    const invoice1Date = pastDate(45);
    const invoice2Date = pastDate(15);
    const invoice3Date = pastDate(2);

    const inv1Items = [
      { project_name: 'Brand Identity & Visual Guidelines', description: 'Brand exploration & typography kit', hours: 15, rate: 1800.0, amount: 27000.0 },
      { project_name: 'Brand Identity & Visual Guidelines', description: 'Logo vectorization and icon exports', hours: 10, rate: 1800.0, amount: 18000.0 },
    ];
    const resInv1 = await db.runAsync(
      `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [userId, clientIds[1], 'INV-2026-001', invoice1Date, pastDate(31), 45000.0, 0, 0, 45000.0, 'Paid via IMPS / UPI on ' + pastDate(30), JSON.stringify(inv1Items)]
    );

    const inv2Items = [
      { project_name: 'Automated Microservices Cloud Architecture', description: 'Initial Docker setup and database schema migrations', hours: 22, rate: 2500.0, amount: 55000.0 },
      { project_name: 'Automated Microservices Cloud Architecture', description: 'API benchmark testing & profiling', hours: 10, rate: 2500.0, amount: 25000.0 },
    ];
    const resInv2 = await db.runAsync(
      `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [userId, clientIds[0], 'INV-2026-002', invoice2Date, pastDate(6), 80000.0, 18.0, 14400.0, 94400.0, 'Paid in full via Bank Transfer.', JSON.stringify(inv2Items)]
    );

    const inv3Items = [
      { project_name: 'Fintech Payment Gateway & UPI Integration', description: 'Stripe Elements checkout UI and webhook handling', hours: 28, rate: 3200.0, amount: 89600.0 },
    ];
    const resInv3 = await db.runAsync(
      `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [userId, clientIds[2], 'INV-2026-003', invoice3Date, futureDate(9), 89600.0, 0, 0, 89600.0, 'Pending client sign-off on staging sprint.', JSON.stringify(inv3Items)]
    );

    // 5. Insert Time Logs
    // A) Billed time logs linked to invoices above
    await db.runAsync(
      `INSERT INTO time_logs (user_id, project_id, task_id, description, start_time, duration_minutes, is_manual, is_billed, invoice_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [userId, projectIds[4], null, 'Brand exploration & typography kit', pastDate(50) + 'T09:00:00Z', 900, resInv1.lastID]
    );
    await db.runAsync(
      `INSERT INTO time_logs (user_id, project_id, task_id, description, start_time, duration_minutes, is_manual, is_billed, invoice_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [userId, projectIds[4], null, 'Logo vectorization and icon exports', pastDate(47) + 'T10:00:00Z', 600, resInv1.lastID]
    );
    await db.runAsync(
      `INSERT INTO time_logs (user_id, project_id, task_id, description, start_time, duration_minutes, is_manual, is_billed, invoice_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [userId, projectIds[0], taskIds[0], 'Initial Docker setup and database schema migrations', pastDate(25) + 'T11:00:00Z', 1320, resInv2.lastID]
    );
    await db.runAsync(
      `INSERT INTO time_logs (user_id, project_id, task_id, description, start_time, duration_minutes, is_manual, is_billed, invoice_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [userId, projectIds[2], taskIds[6], 'Stripe Elements checkout UI and webhook handling', pastDate(8) + 'T14:00:00Z', 1680, resInv3.lastID]
    );

    // B) UNBILLED time logs ready for invoicing!
    const unbilledSample = [
      { project_id: projectIds[0], task_id: taskIds[1], desc: 'Implemented JWT token verification & refresh logic', daysAgo: 3, mins: 240 },
      { project_id: projectIds[0], task_id: taskIds[1], desc: 'Role-based access control and rate limiter middleware', daysAgo: 2, mins: 180 },
      { project_id: projectIds[1], task_id: taskIds[4], desc: 'Design system Modal, Dialog and Tooltip primitives', daysAgo: 4, mins: 300 },
      { project_id: projectIds[1], task_id: taskIds[4], desc: 'Color contrast audit and WCAG AAA compliance checks', daysAgo: 1, mins: 150 },
      { project_id: projectIds[2], task_id: taskIds[7], desc: 'Currency exchange API integration with daily caching', daysAgo: 3, mins: 360 },
      { project_id: projectIds[3], task_id: taskIds[9], desc: 'Factory emissions interactive bar charts and filters', daysAgo: 1, mins: 210 },
      { project_id: projectIds[3], task_id: taskIds[10], desc: 'PDF and CSV streaming export logic', daysAgo: 0, mins: 180 },
    ];

    for (const log of unbilledSample) {
      await db.runAsync(
        `INSERT INTO time_logs (user_id, project_id, task_id, description, start_time, duration_minutes, is_manual, is_billed)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
        [userId, log.project_id, log.task_id, log.desc, pastDate(log.daysAgo) + 'T10:30:00Z', log.mins]
      );
    }

    res.json({
      message: 'Sample data loaded successfully!',
      stats: {
        clients: clientsData.length,
        projects: projectsData.length,
        tasks: tasksData.length,
        invoices: 3,
        unbilledLogs: unbilledSample.length,
      },
    });
  } catch (error) {
    console.error('Error seeding sample data:', error);
    res.status(500).json({ error: 'Failed to populate sample data' });
  }
});

module.exports = router;
