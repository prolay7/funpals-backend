import { Router } from 'express';

import { authenticate } from '../controlers/auth';
import { addUserSkill, deleteUserSkill, getSkillsOfUser, updateUserSkill } from '../controlers/skillController';

const skillsRouter = Router();

skillsRouter.post('/add-user-skill', authenticate, addUserSkill);
skillsRouter.put('/user-skill/:skillId', authenticate, updateUserSkill);
skillsRouter.delete('/user-skill/:skillId', authenticate, deleteUserSkill);
skillsRouter.get('/user-skills', authenticate, getSkillsOfUser);

export default skillsRouter;
