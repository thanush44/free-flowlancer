const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { io: ClientIO } = require('socket.io-client');
const { app, server } = require('../server');
const { db, initDatabase } = require('../db');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

describe('FreelanceFlow Phase 1 Test Suite', () => {
  let runningServer;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let createdClientAId;

  before(async () => {
    await initDatabase();
    await new Promise((resolve) => {
      runningServer = server.listen(TEST_PORT, () => {
        resolve();
      });
    });
  });

  after(async () => {
    if (runningServer) {
      await new Promise((resolve) => runningServer.close(resolve));
    }
  });

  // 1. Backend health endpoint
  it('GET /api/health should return 200 with service status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'FreelanceFlow API');
    assert.ok(data.timestamp);
  });

  // 2. Authentication Registration
  it('POST /api/auth/register should create a new user with hashed password and return JWT', async () => {
    const uniqueEmail = `user.a.${Date.now()}@persevex.io`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Developer',
        email: uniqueEmail,
        password: 'SecurePassword2026!',
        hourly_rate: 2500,
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token, 'Should return JWT token');
    assert.ok(data.user, 'Should return user object');
    assert.strictEqual(data.user.name, 'Alice Developer');
    assert.strictEqual(data.user.email, uniqueEmail);
    assert.strictEqual(data.user.hourly_rate, 2500);
    assert.strictEqual(data.user.password_hash, undefined, 'Must not expose password hash');

    userAToken = data.token;
    userAId = data.user.id;

    // Verify in database that password is cryptographically hashed (bcrypt)
    const dbUser = await db.getAsync('SELECT * FROM users WHERE id = ?', [userAId]);
    assert.ok(dbUser.password_hash.startsWith('$2'), 'Password must be hashed with bcrypt');
    assert.notStrictEqual(dbUser.password_hash, 'SecurePassword2026!');
  });

  it('POST /api/auth/register should reject duplicate email', async () => {
    const email = `duplicate.${Date.now()}@persevex.io`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'First User',
        email,
        password: 'Password123!',
      }),
    });

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email,
        password: 'Password123!',
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Email is already registered');
  });

  it('POST /api/auth/register should reject passwords shorter than 6 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass User',
        email: `shortpass.${Date.now()}@persevex.io`,
        password: '123',
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('6 characters'));
  });

  // 3. Authentication Login
  it('POST /api/auth/login should authenticate valid user credentials', async () => {
    const email = `login.test.${Date.now()}@persevex.io`;
    const password = 'CorrectPassword2026!';

    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Login Tester', email, password }),
    });

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.email, email);
  });

  it('POST /api/auth/login should return generic safe error on incorrect password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@nowhere.com',
        password: 'WrongPassword!',
      }),
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid email or password');
  });

  // 4. Unauthorized Access Rejection
  it('Private routes should reject requests with missing token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, 'Access token required');
  });

  it('Private routes should reject requests with invalid token (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: 'Bearer invalid.forged.jwt.token' },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid or expired token');
  });

  // 5. Client CRUD Operations & Validation
  it('POST /api/clients should create a client for authenticated user', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Infosys Enterprise',
        company: 'Infosys Ltd',
        email: 'procurement@infosys.com',
        phone: '+91 80 2852 0261',
        default_hourly_rate: 2750.5,
        address: 'Electronics City, Hosur Road, Bengaluru',
        notes: 'Monthly billing cycle. GST invoices required.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.client);
    assert.strictEqual(data.client.name, 'Infosys Enterprise');
    assert.strictEqual(data.client.user_id, userAId);
    assert.strictEqual(data.client.default_hourly_rate, 2750.5);
    createdClientAId = data.client.id;
  });

  it('POST /api/clients should reject negative hourly rate', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Negative Rate Client',
        default_hourly_rate: -500,
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Default hourly rate cannot be negative');
  });

  it('POST /api/clients should reject client creation without a name', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: '   ',
        company: 'Nameless Corp',
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Client name is required');
  });

  it('GET /api/clients should list clients belonging to the authenticated user', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.clients));
    const found = data.clients.find((c) => c.id === createdClientAId);
    assert.ok(found, 'Should find created client');
    assert.strictEqual(found.name, 'Infosys Enterprise');
  });

  it('GET /api/clients?search=... should support parameterized search by name, company, or email', async () => {
    // Search by name match
    const resName = await fetch(`${BASE_URL}/api/clients?search=Infosys`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataName = await resName.json();
    assert.ok(dataName.clients.some((c) => c.id === createdClientAId));

    // Search by company match
    const resCompany = await fetch(`${BASE_URL}/api/clients?search=Infosys Ltd`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataCompany = await resCompany.json();
    assert.ok(dataCompany.clients.some((c) => c.id === createdClientAId));

    // Search non-existent
    const resNone = await fetch(`${BASE_URL}/api/clients?search=NonExistentCompanyXyz`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataNone = await resNone.json();
    assert.strictEqual(dataNone.clients.length, 0);
  });

  it('GET /api/clients/:id should fetch single client by ID', async () => {
    const res = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.client.id, createdClientAId);
    assert.strictEqual(data.client.name, 'Infosys Enterprise');
  });

  it('GET /api/clients/:id should reject invalid non-numeric ID parameter', async () => {
    const res = await fetch(`${BASE_URL}/api/clients/not-a-number`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid client ID parameter');
  });

  it('PUT /api/clients/:id should update client details and updated_at timestamp', async () => {
    const res = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Infosys Enterprise - Updated',
        default_hourly_rate: 3200.75,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.client.name, 'Infosys Enterprise - Updated');
    assert.strictEqual(data.client.default_hourly_rate, 3200.75);
    assert.ok(data.client.updated_at, 'updated_at timestamp must be present');
  });

  it('PUT /api/clients/:id should reject negative default_hourly_rate', async () => {
    const res = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        default_hourly_rate: -150,
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Default hourly rate cannot be negative');
  });

  // 6. Multi-User Isolation & Security Enforcement
  it('Strict Multi-User Isolation: User B cannot access, read, update or delete User A records', async () => {
    // Register User B
    const userBEmail = `user.b.${Date.now()}@persevex.io`;
    const regB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Consultant',
        email: userBEmail,
        password: 'BobSecurePassword2026!',
      }),
    });
    const dataB = await regB.json();
    userBToken = dataB.token;
    userBId = dataB.user.id;

    // A) User B listing clients should NOT see User A's client
    const listB = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const listBData = await listB.json();
    assert.strictEqual(
      listBData.clients.some((c) => c.id === createdClientAId),
      false,
      'User B must never see User A client in directory list'
    );

    // B) User B directly requesting User A's client ID -> 404 Not Found
    const getB = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.strictEqual(getB.status, 404, 'User B must receive 404 when querying User A client');

    // C) User B attempting to update User A's client -> 404 Not Found & no modification
    const updateB = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`,
      },
      body: JSON.stringify({ name: 'Hacked by User B' }),
    });
    assert.strictEqual(updateB.status, 404, 'User B must receive 404 when attempting to edit User A client');

    // Verify User A client in SQLite was NOT modified
    const clientCheck = await db.getAsync('SELECT name FROM clients WHERE id = ?', [createdClientAId]);
    assert.strictEqual(clientCheck.name, 'Infosys Enterprise - Updated');

    // D) User B attempting to delete User A's client -> 404 Not Found & no deletion
    const deleteB = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.strictEqual(deleteB.status, 404, 'User B must receive 404 when attempting to delete User A client');

    // Verify User A client still exists
    const clientStillExists = await db.getAsync('SELECT id FROM clients WHERE id = ?', [createdClientAId]);
    assert.ok(clientStillExists, 'User A client must remain intact in SQLite database');
  });

  // 7. Client Deletion by Owner
  it('DELETE /api/clients/:id should allow owner to delete client', async () => {
    const res = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(res.status, 200);

    // Verify it is gone
    const checkRes = await fetch(`${BASE_URL}/api/clients/${createdClientAId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(checkRes.status, 404);
  });

  // 8. Database Persistence Verification
  it('Database persistence: Records written via API persist in SQLite database file', async () => {
    // Create a new client for User A
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Persistent SQLite Client',
        company: 'Persistent Systems',
        default_hourly_rate: 3500.0,
      }),
    });
    const data = await res.json();
    const newId = data.client.id;

    // Verify directly in database
    const directRow = await db.getAsync('SELECT * FROM clients WHERE id = ?', [newId]);
    assert.ok(directRow, 'Record must exist directly in SQLite database');
    assert.strictEqual(directRow.name, 'Persistent SQLite Client');
    assert.strictEqual(directRow.user_id, userAId);
  });

  // 9. Real-Time Socket.IO Synchronization & User Room Isolation
  it('Socket.IO: Authenticates and emits real-time client events only to user room', async () => {
    // Connect Socket A (User A)
    const socketA = ClientIO(BASE_URL, {
      auth: { token: userAToken },
      transports: ['websocket'],
    });

    // Connect Socket B (User B)
    const socketB = ClientIO(BASE_URL, {
      auth: { token: userBToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => socketA.on('connect', res)),
      new Promise((res) => socketB.on('connect', res)),
    ]);

    let userAReceivedCreate = false;
    let userBReceivedCreate = false;

    socketA.on('client-created', (data) => {
      if (data?.client?.name === 'Realtime Sync Test Client') {
        userAReceivedCreate = true;
      }
    });

    socketB.on('client-created', () => {
      userBReceivedCreate = true;
    });

    // Create client as User A
    const createRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Realtime Sync Test Client',
        default_hourly_rate: 2000,
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createdData = await createRes.json();
    const rtClientId = createdData.client.id;

    // Wait for WebSocket event propagation
    await new Promise((res) => setTimeout(res, 500));

    assert.strictEqual(userAReceivedCreate, true, 'User A should receive client-created real-time event');
    assert.strictEqual(userBReceivedCreate, false, 'User B must NOT receive User A real-time events (Room isolation)');

    // Test real-time update event
    let userAReceivedUpdate = false;
    socketA.on('client-updated', (data) => {
      if (data?.client?.id === rtClientId) {
        userAReceivedUpdate = true;
      }
    });

    await fetch(`${BASE_URL}/api/clients/${rtClientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ name: 'Realtime Sync Test Client - Updated' }),
    });

    await new Promise((res) => setTimeout(res, 500));
    assert.strictEqual(userAReceivedUpdate, true, 'User A should receive client-updated real-time event');

    // Test real-time delete event
    let userAReceivedDelete = false;
    socketA.on('client-deleted', (data) => {
      if (data?.id === rtClientId) {
        userAReceivedDelete = true;
      }
    });

    await fetch(`${BASE_URL}/api/clients/${rtClientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` },
    });

    await new Promise((res) => setTimeout(res, 500));
    assert.strictEqual(userAReceivedDelete, true, 'User A should receive client-deleted real-time event');

    socketA.disconnect();
    socketB.disconnect();
  });

  // 10. Indian Rupee (INR) Number Formatting Utility Verification
  it('INR Formatting: Enforces standard Indian number grouping and two decimal places', () => {
    const inrFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatted125k = inrFormatter.format(125000);
    // Standard Indian number grouping: 1,25,000.00
    assert.ok(
      formatted125k.includes('1,25,000.00'),
      `Expected standard Indian grouping (1,25,000.00), got: ${formatted125k}`
    );

    const formattedRate = inrFormatter.format(2750.5);
    assert.ok(
      formattedRate.includes('2,750.50'),
      `Expected standard Indian rate (2,750.50), got: ${formattedRate}`
    );
  });
});
