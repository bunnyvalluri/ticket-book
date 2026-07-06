import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as notificationCtrl from '../controllers/notification.controller.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationCtrl.getUserNotifications);
router.patch('/read-all', notificationCtrl.markAllAsRead);
router.patch('/:id/read', notificationCtrl.markAsRead);
router.delete('/clear', notificationCtrl.clearNotifications);

export default router;
