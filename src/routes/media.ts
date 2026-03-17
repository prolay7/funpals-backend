import express from 'express';
import { addMedia, getMediaOnCategory } from '../controlers/media';
import { authenticate } from '../controlers/auth';


const mediaRouter = express.Router();

mediaRouter.post('/', addMedia);
mediaRouter.get('/category/:categoryId', authenticate, getMediaOnCategory);

export default mediaRouter;