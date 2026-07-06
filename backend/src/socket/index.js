import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

let io;

let activeConnections = 0;
const activeUsers = new Map(); // userId -> Set of socketIds

const broadcastActiveUsers = () => {
  if (!io) return;
  const count = activeUsers.size;
  const totalSockets = activeConnections;
  io.to('admin:dashboard').emit('admin:active_users', {
    activeUsersCount: count,
    totalConnections: totalSockets,
  });
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, firstName: true, role: true },
        });
        if (user) socket.user = user;
      }
      next();
    } catch {
      next(); // Allow unauthenticated connections for viewing
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.id || 'anonymous'})`);

    activeConnections++;
    if (socket.user) {
      if (!activeUsers.has(socket.user.id)) {
        activeUsers.set(socket.user.id, new Set());
      }
      activeUsers.get(socket.user.id).add(socket.id);
    }
    broadcastActiveUsers();

    // Join user room for personal notifications
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join admin dashboard room
    socket.on('admin:join', () => {
      if (socket.user?.role === 'ADMIN' || socket.user?.role === 'SUPER_ADMIN') {
        socket.join('admin:dashboard');
        logger.info(`Admin socket joined dashboard room: ${socket.id}`);
        // Send initial counts
        socket.emit('admin:active_users', {
          activeUsersCount: activeUsers.size,
          totalConnections: activeConnections,
        });
      }
    });

    socket.on('admin:leave', () => {
      socket.leave('admin:dashboard');
      logger.info(`Admin socket left dashboard room: ${socket.id}`);
    });

    // Join show room for real-time seat updates
    socket.on('show:join', (showId) => {
      socket.join(`show:${showId}`);
      logger.debug(`Socket ${socket.id} joined show room: ${showId}`);
    });

    socket.on('show:leave', (showId) => {
      socket.leave(`show:${showId}`);
    });

    // Seat selection (optimistic lock via socket)
    socket.on('seat:select', async ({ seatId, showId }) => {
      if (!socket.user) {
        return socket.emit('error', { message: 'Authentication required' });
      }

      try {
        // Check if already locked by another user
        const existingLock = await prisma.seatLock.findUnique({
          where: { showId_seatId: { showId, seatId } },
        });

        if (existingLock && !existingLock.isReleased && existingLock.expiresAt > new Date()) {
          if (existingLock.userId !== socket.user.id) {
            return socket.emit('seat:lock_failed', { seatId, reason: 'Seat already selected' });
          }
        }

        // Check if booked
        const booked = await prisma.bookingSeat.findFirst({
          where: {
            seatId,
            booking: { showId, status: { in: ['CONFIRMED', 'PENDING'] } },
          },
        });

        if (booked) {
          return socket.emit('seat:lock_failed', { seatId, reason: 'Seat already booked' });
        }

        // Upsert lock
        await prisma.seatLock.upsert({
          where: { showId_seatId: { showId, seatId } },
          create: {
            showId,
            seatId,
            userId: socket.user.id,
            sessionId: socket.id,
            expiresAt: new Date(Date.now() + config.seatLockTimeout),
          },
          update: {
            userId: socket.user.id,
            sessionId: socket.id,
            expiresAt: new Date(Date.now() + config.seatLockTimeout),
            isReleased: false,
          },
        });

        // Notify all in room
        io.to(`show:${showId}`).emit('seat:locked', {
          seatId,
          showId,
          userId: socket.user.id,
          expiresAt: new Date(Date.now() + config.seatLockTimeout),
        });

        socket.emit('seat:lock_success', { seatId });
      } catch (error) {
        logger.error('Seat select error:', error);
        socket.emit('error', { message: 'Failed to lock seat' });
      }
    });

    // Seat deselection
    socket.on('seat:deselect', async ({ seatId, showId }) => {
      if (!socket.user) return;

      try {
        await prisma.seatLock.updateMany({
          where: { showId, seatId, userId: socket.user.id },
          data: { isReleased: true },
        });

        io.to(`show:${showId}`).emit('seat:released', { seatId, showId });
      } catch (error) {
        logger.error('Seat deselect error:', error);
      }
    });

    // Handle disconnect — release all locks
    socket.on('disconnect', async () => {
      activeConnections--;
      if (socket.user) {
        const userSockets = activeUsers.get(socket.user.id);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            activeUsers.delete(socket.user.id);
          }
        }
      }
      broadcastActiveUsers();

      if (socket.user) {
        try {
          const locks = await prisma.seatLock.findMany({
            where: { sessionId: socket.id, isReleased: false },
          });

          if (locks.length) {
            await prisma.seatLock.updateMany({
              where: { sessionId: socket.id },
              data: { isReleased: true },
            });

            locks.forEach(({ seatId, showId }) => {
              io.to(`show:${showId}`).emit('seat:released', { seatId, showId });
            });
          }
        } catch (error) {
          logger.error('Disconnect cleanup error:', error);
        }
      }

      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Clean up expired locks every 5 minutes
  setInterval(async () => {
    try {
      const expired = await prisma.seatLock.findMany({
        where: { isReleased: false, expiresAt: { lt: new Date() } },
      });

      if (expired.length) {
        await prisma.seatLock.updateMany({
          where: { isReleased: false, expiresAt: { lt: new Date() } },
          data: { isReleased: true },
        });

        expired.forEach(({ seatId, showId }) => {
          io.to(`show:${showId}`).emit('seat:released', { seatId, showId, reason: 'timeout' });
        });

        logger.info(`Released ${expired.length} expired seat locks`);
      }
    } catch (error) {
      logger.error('Lock cleanup error:', error);
    }
  }, 5 * 60 * 1000);

  logger.info('Socket.io initialized');
  return io;
};

export const getIO = () => io;
