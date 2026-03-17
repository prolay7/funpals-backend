import express from 'express';
import { authenticate } from '../controlers/auth';
import { listPosts, createPost } from '../controlers/post';

const postRouter = express.Router();

postRouter.get('/', authenticate, listPosts);
postRouter.post('/', authenticate, createPost);

export default postRouter;
