import express from 'express';
import { authenticate } from '../controlers/auth';
import { getNearByUsers, getSuggestions, updateUserLocation } from '../controlers/location';

const locationRouter = express.Router();

locationRouter.get('/suggestions',authenticate, getSuggestions);
locationRouter.patch('/update', authenticate, updateUserLocation);
locationRouter.get('/nearby', authenticate, getNearByUsers);

export default locationRouter; 