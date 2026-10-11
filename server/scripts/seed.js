const { db, initDatabase } = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDatabase();

  console.log('Seeding demo freelancer account...');
  const demoEmail = 'alex.freelancer@persevex.io';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('DemoPass2026!', salt);

  let user = await db.getAsync('SELECT * FROM users WHERE email = ?', [demoEmail]);
  if (!user) {
    const res = await db.runAsync(
      `INSERT INTO users (name, email, password_hash, plan, hourly_rate) VALUES (?, ?, ?, 'pro', 85.0)`,
      ['Alex Rivera (Freelancer)', demoEmail, passwordHash]
    );
    user = await db.getAsync('SELECT * FROM users WHERE id = ?', [res.lastID]);
  }

  const userId = user.id;

  // Clean existing demo data for this user
  await db.runAsync('DELETE FROM invoices WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM time_logs WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM tasks WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM projects WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM clients WHERE user_id = ?', [userId]);

  console.log('Seeding clients...');
  const clientsData = [
    {
      name: 'Sarah Connor',
      email: 'sarah@skynet-solutions.io',
      phone: '+1 (555) 349-2041',
      company: 'Cyberdyne Systems',
      default_hourly_rate: 95.0,
      address: '100 Silicon Way, Tech District, SF',
    },
    {
      name: 'Marcus Sterling',
      email: 'm.sterling@apexcreative.co',
      phone: '+1 (555) 892-1144',
      company: 'Apex Creative Studio',
      default_hourly_rate: 80.0,
      address: '742 Broadway St, New York, NY',
    },
    {
      name: 'Elena Rostova',
      email: 'elena@novafinance.app',
      phone: '+1 (555) 774-9032',
      company: 'Nova FinTech',
      default_hourly_rate: 110.0,
      address: '25 Bank Street, London / Remote',
    },
    {
      name: 'David Zhao',
      email: 'david@greenpulse.earth',
      phone: '+1 (555) 432-8871',
      company: 'GreenPulse Climate',
      default_hourly_rate: 75.0,
      address: '400 Eco Blvd, Seattle, WA',
    },
  ];

  const clientIds = [];
  for (const c of clientsData) {
    const res = await db.runAsync(
      `INSERT INTO clients (user_id, name, email, phone, company, default_hourly_rate, address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, c.name, c.email, c.phone, c.company, c.default_hourly_rate, c.address]
    );
    clientIds.push(res.lastID);
  }

  console.log('Seeding projects...');
  const projectsData = [
    { client_id: clientIds[0], name: 'Automated Microservices Cloud Architecture', budget: 6500.0, deadline: '2026-10-25' },
    { client_id: clientIds[1], name: 'Next-Gen Portfolio & Design System', budget: 4200.0, deadline: '2026-10-18' },
    { client_id: clientIds[2], name: 'Fintech Payment Gateway & Stripe Integration', budget: 8000.0, deadline: '2026-11-05' },
    { client_id: clientIds[3], name: 'Carbon Emissions Real-time Dashboard', budget: 3500.0, deadline: '2026-10-12' },
  ];

  const projectIds = [];
  for (const p of projectsData) {
    const res = await db.runAsync(
      `INSERT INTO projects (user_id, client_id, name, status, budget, deadline) VALUES (?, ?, ?, 'active', ?, ?)`,
      [userId, p.client_id, p.name, p.budget, p.deadline]
    );
    projectIds.push(res.lastID);
  }

  console.log('Seeding tasks & time logs...');
  const tasks = [
    { pId: projectIds[0], title: 'Refactor REST API endpoints & route validations', status: 'completed' },
    { pId: projectIds[0], title: 'Implement JWT authentication & RBAC middleware', status: 'in_progress' },
    { pId: projectIds[1], title: 'Audit existing color palette & spacing units', status: 'completed' },
    { pId: projectIds[1], title: 'Build accessible Modal and Popover components', status: 'in_progress' },
    { pId: projectIds[2], title: 'Stripe webhook signature validation', status: 'completed' },
    { pId: projectIds[3], title: 'Assemble Recharts heatmaps for factory emissions', status: 'in_progress' },
  ];

  for (const t of tasks) {
    await db.runAsync(
      `INSERT INTO tasks (user_id, project_id, title, status, due_date, estimated_hours) VALUES (?, ?, ?, ?, '2026-10-20', 8)`,
      [userId, t.pId, t.title, t.status]
    );
  }

  // Create Invoices
  const inv1 = await db.runAsync(
    `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
     VALUES (?, ?, 'INV-2026-001', '2026-08-15', '2026-08-29', 2400.0, 0, 0, 2400.0, 'paid', 'Paid in full', '[]')`,
    [userId, clientIds[1]]
  );

  const inv2 = await db.runAsync(
    `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
     VALUES (?, ?, 'INV-2026-002', '2026-09-10', '2026-09-24', 3800.0, 5, 190, 3990.0, 'paid', 'Paid via Wire Transfer', '[]')`,
    [userId, clientIds[0]]
  );

  const inv3 = await db.runAsync(
    `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json)
     VALUES (?, ?, 'INV-2026-003', '2026-10-01', '2026-10-15', 3300.0, 0, 0, 3300.0, 'pending', 'Awaiting client approval', '[]')`,
    [userId, clientIds[2]]
  );

  // Time logs (Billed)
  await db.runAsync(
    `INSERT INTO time_logs (user_id, project_id, description, start_time, duration_minutes, is_manual, is_billed, invoice_id)
     VALUES (?, ?, 'Microservices refactor sprint 1', '2026-09-02T10:00:00Z', 1200, 0, 1, ?)`,
    [userId, projectIds[0], inv2.lastID]
  );

  // Time logs (UNBILLED, ready to test invoice wizard)
  await db.runAsync(
    `INSERT INTO time_logs (user_id, project_id, description, start_time, duration_minutes, is_manual, is_billed)
     VALUES (?, ?, 'Design system core token definition', '2026-10-01T09:00:00Z', 240, 0, 0)`,
    [userId, projectIds[1]]
  );
  await db.runAsync(
    `INSERT INTO time_logs (user_id, project_id, description, start_time, duration_minutes, is_manual, is_billed)
     VALUES (?, ?, 'Accessible dropdown and popover primitives', '2026-10-02T11:30:00Z', 180, 0, 0)`,
    [userId, projectIds[1]]
  );
  await db.runAsync(
    `INSERT INTO time_logs (user_id, project_id, description, start_time, duration_minutes, is_manual, is_billed)
     VALUES (?, ?, 'Stripe webhook signature validation & idempotency', '2026-10-02T14:00:00Z', 300, 0, 0)`,
    [userId, projectIds[2]]
  );

  console.log('Seeding complete! User alex.freelancer@persevex.io is fully configured.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
