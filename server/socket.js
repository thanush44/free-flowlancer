const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function getJwtSecret() {
  return process.env.JWT_SECRET || 'freelanceflow-super-secret-key-2026';
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow local dev origins and requests with no origin
        const allowedOrigins = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          process.env.CLIENT_ORIGIN,
        ].filter(Boolean);

        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // Authenticate socket connection via JWT token
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, getJwtSecret());
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid payload'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
    console.log(`[Socket] Authenticated user ${socket.userId} joined room ${userRoom}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${socket.userId} disconnected`);
    });
  });

  return io;
}

/**
 * Emit an event strictly to the authenticated user's private room.
 * Keeps user data isolated across WebSocket sessions.
 */
function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, payload);
  }
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  emitToUser,
  getIO,
};
