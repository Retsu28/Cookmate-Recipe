const { Server } = require('socket.io');
const { verifyAuthToken } = require('../middleware/requireAuth');

let io = null;

function userRoom(userId) {
  return `user:${Number(userId)}`;
}

function extractToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function attachPlannerSocketServer(server, { corsOrigins = [] } = {}) {
  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        const err = new Error('Missing auth token.');
        err.data = { code: 'missing_auth_token' };
        return next(err);
      }

      const payload = verifyAuthToken(token);
      socket.data.userId = Number(payload.sub);
      socket.data.userRole = payload.role === 'admin' ? 'admin' : 'user';
      return next();
    } catch {
      const err = new Error('Invalid or expired token.');
      err.data = { code: 'invalid_auth_token' };
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) {
      socket.join(userRoom(socket.data.userId));
    }

    socket.emit('planner:connected', {
      server_now: new Date().toISOString(),
    });
  });

  return io;
}

function emitToUser(userId, eventName, payload) {
  if (!io || !userId) return false;
  io.to(userRoom(userId)).emit(eventName, payload);
  return true;
}

function emitPlannerPlansChanged(userId, payload = {}) {
  return emitToUser(userId, 'planner:plans_changed', {
    server_now: new Date().toISOString(),
    ...payload,
  });
}

function emitPlannerReminderDue(userId, payload = {}) {
  return emitToUser(userId, 'planner:reminder_due', {
    server_now: new Date().toISOString(),
    ...payload,
  });
}

module.exports = {
  attachPlannerSocketServer,
  emitPlannerPlansChanged,
  emitPlannerReminderDue,
};
