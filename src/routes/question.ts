import express from 'express';
import { authenticate } from '../controlers/auth';
import { listQuestions, createQuestion } from '../controlers/question';

const questionRouter = express.Router();

questionRouter.get('/', authenticate, listQuestions);
questionRouter.post('/', authenticate, createQuestion);

export default questionRouter;
