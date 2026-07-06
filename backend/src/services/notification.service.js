import prisma from '../config/database.js';
import { getIO } from '../socket/index.js';
import logger from '../config/logger.js';

export const createNotification = async ({ userId, type, title, message, data }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
      },
    });

    // Send real-time socket notification if IO is initialized
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
      logger.info(`Notification sent to user:${userId} via socket: ${title}`);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create or send notification:', error);
    throw error;
  }
};
