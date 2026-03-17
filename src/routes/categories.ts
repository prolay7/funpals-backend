import express from 'express';
import { authenticate } from '../controlers/auth';
import { getChildCategories, getMeetingsByCategoryId, getOtherUsersOfCategory, getTopLevelCategories, updateLikedCategories } from '../controlers/categories';


const categoryrouter = express.Router();

categoryrouter.get('/get-top-level-categories',authenticate,getTopLevelCategories);
categoryrouter.get('/get-child-categories',authenticate,getChildCategories);
categoryrouter.post('/update-liked-categories',authenticate,updateLikedCategories);
categoryrouter.get('/get-other-usersOfcategory',authenticate,getOtherUsersOfCategory);
categoryrouter.get('/category/:id/meeting',authenticate,getMeetingsByCategoryId);

export default categoryrouter;