import express from 'express';
import { authenticate } from '../controlers/auth';
import { getNotifications, markAllRead } from '../controlers/notification';

const notificationRouter = express.Router();

notificationRouter.get('/', authenticate, getNotifications);
notificationRouter.patch('/read-all', authenticate, markAllRead);

export default notificationRouter;
