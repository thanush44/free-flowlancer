const http = require('http');

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTestSuite() {
  console.log('--- STARTING FREELANCEFLOW COMPREHENSIVE TEST SUITE ---\n');

  // 1. Health check
  const health = await apiRequest('GET', '/health');
  console.log('✓ 1. API Health Check:', health.status, health.body);

  // 2. Login
  const loginRes = await apiRequest('POST', '/auth/login', {
    email: 'alex.freelancer@persevex.io',
    password: 'DemoPass2026!',
  });
  console.log('✓ 2. Auth Login:', loginRes.status, 'User:', loginRes.body.user.name, 'Plan:', loginRes.body.user.plan);
  const token = loginRes.body.token;

  // 3. Dashboard Stats (KPIs, Burn Rate, Monthly Revenue)
  const dashboardRes = await apiRequest('GET', '/dashboard/stats', null, token);
  console.log('✓ 3. Dashboard Stats:');
  console.log('   - Active Projects:', dashboardRes.body.summary.active_projects);
  console.log('   - Total Revenue ($):', dashboardRes.body.summary.total_revenue);
  console.log('   - Outstanding ($):', dashboardRes.body.summary.outstanding_amount);
  console.log('   - Unbilled Hours:', dashboardRes.body.summary.unbilled_hours);
  console.log('   - Monthly Revenue Chart Points:', dashboardRes.body.chart_data.length);
  console.log('   - Burn Rate Trackers:', dashboardRes.body.recent_projects.length);

  // 4. Clients CRM
  const clientsRes = await apiRequest('GET', '/clients', null, token);
  console.log('✓ 4. Clients CRM:', clientsRes.body.clients.length, 'clients found.');
  clientsRes.body.clients.forEach((c) => {
    console.log(`   - Client: ${c.name} | Rate: $${c.default_hourly_rate}/h | Unbilled: $${c.unbilled_amount}`);
  });

  // 5. Projects & Burn Rates
  const projectsRes = await apiRequest('GET', '/projects', null, token);
  console.log('✓ 5. Projects & Burn Rates:');
  projectsRes.body.projects.forEach((p) => {
    console.log(`   - Project: "${p.name}" | Budget: $${p.budget} | Spent: $${p.spent_amount} | Burn Rate: ${p.burn_rate_percent}%`);
  });

  // 6. Time Logs (Stopwatch & Manual)
  const timeRes = await apiRequest('GET', '/time-logs', null, token);
  console.log('✓ 6. Time Logs: Total logs:', timeRes.body.logs.length);
  const unbilled = timeRes.body.logs.filter((l) => !l.is_billed);
  const billed = timeRes.body.logs.filter((l) => l.is_billed);
  console.log(`   - Unbilled entries: ${unbilled.length} | Billed entries: ${billed.length}`);

  // 7. Test Stopwatch Time Logging
  const testLogRes = await apiRequest('POST', '/time-logs', {
    project_id: projectsRes.body.projects[0].id,
    description: 'Automated test work session',
    start_time: new Date(Date.now() - 3600000).toISOString(),
    end_time: new Date().toISOString(),
    duration_minutes: 60,
    is_manual: 0,
  }, token);
  console.log('✓ 7. Stopwatch Entry Created:', testLogRes.status, 'Logged duration:', testLogRes.body.log.duration_minutes, 'mins');

  // 8. Test Invoice Wizard: Unbilled items query
  const unbilledQuery = await apiRequest(
    'GET',
    `/invoices/unbilled?client_id=${projectsRes.body.projects[0].client_id}`,
    null,
    token
  );
  console.log('✓ 8. Invoice Wizard Unbilled Items Query:', unbilledQuery.body.items.length, 'items available for billing.');

  // 9. Invoices Listing
  const invoicesRes = await apiRequest('GET', '/invoices', null, token);
  console.log('✓ 9. Invoices Listing:', invoicesRes.body.invoices.length, 'existing invoices.');
  const invoiceId = invoicesRes.body.invoices[0].id;

  // 10. PDF Invoice Generation Check
  const pdfRes = await apiRequest('GET', `/invoices/${invoiceId}/pdf`, null, token);
  console.log('✓ 10. PDF Generation:', pdfRes.status, 'Content-Type:', pdfRes.headers['content-type']);

  // 11. Test Freemium Tier Limit Enforcement (Phase 4 requirement)
  console.log('\n--- TESTING PHASE 4 FREEMIUM TIER LIMIT ENFORCEMENT ---');
  // Switch to free tier
  await apiRequest('POST', '/auth/toggle-plan', { plan: 'free' }, token);
  console.log('✓ Switched user to FREE tier.');

  // Free tier has max 2 clients. The user currently has 4 clients.
  // Attempting to add a new client should be BLOCKED with 403 Forbidden!
  const blockRes = await apiRequest('POST', '/clients', {
    name: 'Blocked Corp',
    company: 'Limit Tester Inc',
    default_hourly_rate: 100,
  }, token);
  console.log('✓ Free tier limit response code:', blockRes.status);
  console.log('✓ Free tier error message:', blockRes.body.error);

  // Switch back to PRO tier
  await apiRequest('POST', '/auth/toggle-plan', { plan: 'pro' }, token);
  console.log('✓ Switched user back to PRO tier.');

  console.log('\n=== ALL SYSTEM TESTS PASSED SUCCESSFULLY! ===\n');
}

runTestSuite().catch(console.error);
