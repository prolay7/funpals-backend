import express from 'express';
import { authenticate } from '../controlers/auth';
import { listActivities, getRandomActivity, getActivityById, joinActivity } from '../controlers/activity';

const activityRouter = express.Router();

activityRouter.get('/', authenticate, listActivities);
activityRouter.get('/random', authenticate, getRandomActivity);
activityRouter.get('/:id', authenticate, getActivityById);
activityRouter.post('/:id/join', authenticate, joinActivity);

export default activityRouter;
