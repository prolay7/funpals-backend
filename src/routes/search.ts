import express from 'express';
import { authenticate } from '../controlers/auth';
import {searchCategories, searchLiveMeets, searchUsers } from '../controlers/search';
import { globalSearch } from '../controlers/globalSearch';

const searchRouter = express.Router();
searchRouter.get('/global-search',authenticate,globalSearch);
searchRouter.get('/search/meetings',authenticate,searchLiveMeets);
searchRouter.get('/search/categories',authenticate,searchCategories);
searchRouter.get('/search/users',authenticate,searchUsers);

export default searchRouter;