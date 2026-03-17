import express from 'express';
import { authenticate } from '../controlers/auth';
import { createGoal, deleteGoal, getGoalToday, getUserGoals, updateGoalStatus } from '../controlers/goal';

const goalRouter = express.Router();

goalRouter.get('/today', authenticate, getGoalToday);
goalRouter.post('/', authenticate, createGoal);
goalRouter.get('/user', authenticate, getUserGoals);
goalRouter.delete('/:id', authenticate, deleteGoal);
goalRouter.patch('/:id', authenticate, updateGoalStatus);

export default goalRouter;
