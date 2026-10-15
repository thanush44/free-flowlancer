require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');
const { initSocket } = require('./socket');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const timeLogRoutes = require('./routes/timelogs');
const invoiceRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const sampleDataRoutes = require('./routes/sampleData');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize authenticated Socket.IO communication
initSocket(server);

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time-logs', timeLogRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sample-data', sampleDataRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FreelanceFlow API',
    uptime: process.uptime(),
  });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('FreelanceFlow API is running. Start the Vite client dev server to view the UI.');
      }
    });
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize DB and start listening if run directly
let runningServer = null;

async function startServer(port = PORT) {
  await initDatabase();
  return new Promise((resolve) => {
    runningServer = server.listen(port, () => {
      console.log(`===============================================`);
      console.log(`🚀 FreelanceFlow Backend Server running on port ${port}`);
      console.log(`📡 API Base: http://localhost:${port}/api`);
      console.log(`🔌 Socket.IO initialized for real-time sync`);
      console.log(`===============================================`);
      resolve(runningServer);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  server,
  startServer,
};
