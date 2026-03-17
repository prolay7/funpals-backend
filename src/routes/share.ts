import express from 'express';
import { authenticate } from '../controlers/auth';
import { shareInternal, getGlobalFeed, shareGlobal, shareExternal } from '../controlers/share';

const shareRouter = express.Router();

shareRouter.post('/internal', authenticate, shareInternal);
shareRouter.get('/global', authenticate, getGlobalFeed);
shareRouter.post('/global', authenticate, shareGlobal);
shareRouter.post('/external', authenticate, shareExternal);

export default shareRouter;
