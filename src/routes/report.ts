import express from 'express';
import { authenticate } from '../controlers/auth';
import { reportUser } from '../controlers/report';


const reportRouter = express.Router();

reportRouter.post('/report-user',authenticate,reportUser)

export default reportRouter;