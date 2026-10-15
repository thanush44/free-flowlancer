const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure dedicated data directory exists
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Persistent database in server/data/freelanceflow.db
const dbPath = path.join(dataDir, 'freelanceflow.db');
const legacyDbPath = path.resolve(__dirname, 'freelanceflow.db');

// Safe migration: preserve legacy database records if present and target doesn't exist
if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  try {
    fs.copyFileSync(legacyDbPath, dbPath);
    console.log(`[DB Migration] Safely copied legacy database records to ${dbPath}`);
  } catch (copyErr) {
    console.error('[DB Migration] Warning copying legacy database:', copyErr.message);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Promisified helpers for clean async/await
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Safe column addition helper for incremental migrations
async function ensureColumnExists(tableName, columnName, columnDefinition) {
  try {
    const tableInfo = await db.allAsync(`PRAGMA table_info(${tableName});`);
    const exists = tableInfo.some((col) => col.name === columnName);
    if (!exists) {
      await db.runAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
      console.log(`[DB Migration] Added column ${columnName} to ${tableName}`);
    }
  } catch (err) {
    console.warn(`[DB Migration] Note on column ${columnName} in ${tableName}:`, err.message);
  }
}

// Initialize schema, foreign keys, incremental migrations, and indexes
async function initDatabase() {
  // Enforce foreign key constraints
  await db.runAsync('PRAGMA foreign_keys = ON;');

  // Users table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'pro',
      hourly_rate REAL DEFAULT 50.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clients table (relational: user -> clients)
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      default_hourly_rate REAL DEFAULT 65.0,
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Incremental migrations in case table existed from previous version
  await ensureColumnExists('clients', 'updated_at', 'DATETIME');
  await ensureColumnExists('clients', 'notes', 'TEXT');
  await ensureColumnExists('clients', 'address', 'TEXT');
  await ensureColumnExists('clients', 'default_hourly_rate', 'REAL DEFAULT 65.0');
  await ensureColumnExists('users', 'hourly_rate', 'REAL DEFAULT 50.0');
  await ensureColumnExists('users', 'plan', "TEXT DEFAULT 'pro'");

  // Projects table (relational: client -> projects)
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      budget REAL DEFAULT 0.0,
      deadline DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tasks table (relational: project -> tasks)
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'todo',
      due_date DATE,
      estimated_hours REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Time Logs table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration_minutes REAL NOT NULL,
      is_manual INTEGER DEFAULT 0,
      is_billed INTEGER DEFAULT 0,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Invoices table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      subtotal REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      items_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Relational and search indexes
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_projects_user_client ON projects(user_id, client_id);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks(user_id, project_id);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_timelogs_user_project ON time_logs(user_id, project_id);');
  await db.runAsync('CREATE INDEX IF NOT EXISTS idx_invoices_user_client ON invoices(user_id, client_id);');

  console.log('Database tables, migrations, and indexes verified and ready.');
}

// Close database connection cleanly (useful for tests and shutdowns)
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  db,
  dbPath,
  initDatabase,
  closeDatabase,
  ensureColumnExists,
};
