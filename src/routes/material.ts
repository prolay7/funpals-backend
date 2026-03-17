import express from 'express';
import { authenticate } from '../controlers/auth';
import { listMaterials, getRandomMaterial } from '../controlers/material';

const materialRouter = express.Router();

materialRouter.get('/', authenticate, listMaterials);
materialRouter.get('/random', authenticate, getRandomMaterial);

export default materialRouter;
