import express from 'express';
import { authenticate } from '../controlers/auth';
import { toggleFavoriteCaller, listFavoriteCallers, toggleFavoriteGroup, listFavoriteGroups } from '../controlers/favorite';

const favoriteRouter = express.Router();

favoriteRouter.post('/callers', authenticate, toggleFavoriteCaller);
favoriteRouter.get('/callers', authenticate, listFavoriteCallers);
favoriteRouter.post('/groups', authenticate, toggleFavoriteGroup);
favoriteRouter.get('/groups', authenticate, listFavoriteGroups);

export default favoriteRouter;
